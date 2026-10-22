// Simula o sorteio das cartas (src/sob-demanda/cartas-regras.js, a regra de verdade, num contexto
// isolado) para muitas contas e ritmos de leitura, e mede o que docs/cartas.md promete: quantas de
// cada raridade por ano, a distância entre Ouros, o tempo para completar os álbuns e as repetidas.
// O teste.mjs roda uma versão menor e confere as metas. Uso:
//   node ferramentas/simular-cartas.mjs [contas] [albuns]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import { lerCatalogo, esqueletoDoCatalogo } from './cartas-catalogo.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');

// A regra num contexto próprio, com um esqueleto à escolha (para simular catálogos maiores).
export function carregarRegras(indice) {
  const ctx = createContext({ window: { CC: {}, CARTAS_INDICE: indice }, Math, Map, Set, String, Number, JSON, Object, Array, Date, document: { querySelector: () => null } });
  runInContext('window.CC = window.CC || {};', ctx);
  runInContext(readFileSync(join(AQUI, 'src', 'sob-demanda', 'cartas-regras.js'), 'utf8'), ctx);
  return ctx.window.CC.cartasRegras;
}

// O esqueleto do catálogo com n álbuns de sorteio: os de lançamento, mais cópias com ids novos.
export function indiceCom(albuns) {
  const base = esqueletoDoCatalogo(lerCatalogo(AQUI));
  const sorteio = base.filter((a) => !a.especial);
  const extra = [];
  for (let i = sorteio.length; i < albuns; i++) {
    const modelo = sorteio[i % sorteio.length];
    extra.push({ ...modelo, id: modelo.id + '-' + i, c: modelo.c.split(' ').map((id) => id + '-' + i).join(' '), capa: modelo.capa + '-' + i });
  }
  return sorteio.slice(0, albuns).concat(extra, base.filter((a) => a.especial));
}

// porAno: sorteios por ano (baús e as outras fontes). anos: quanto simular.
export function simular({ contas = 300, porAno = 75, anos = 3, albuns = 4, vies = null } = {}) {
  const R = carregarRegras(indiceCom(albuns));
  if (vies) [R.PESO_NOVA_ATUAL, R.PESO_NOVA_OUTRO] = vies;
  const total = R.albuns().reduce((s, a) => s + a.cartas.length, 0);
  const porRaridade = { linho: 0, bronze: 0, prata: 0, ouro: 0 };
  const meses = [];
  let repetidaAno1 = 0;
  let versaoRepetidaAno1 = 0;
  let ano1 = 0;
  let entreOuros = [];
  let piorSemAlta = 0;
  let primeiraPrata = true;
  let estaveis = true;
  for (let p = 0; p < contas; p++) {
    const dono = 'simulada' + p;
    let c = R.vazio();
    let completou = null;
    let desdeOuro = 0;
    let semAlta = 0;
    const tem = new Set();
    for (let d = 0; d < porAno * anos; d++) {
      const chave = 'bau:dia:' + (d + 1);
      const r = R.receber(c, 'bau', chave, { dono, em: d + 1 });
      // o mesmo evento, sorteado de novo do mesmo estado, dá o mesmo resultado
      if (p < 5 && d < 40) estaveis &&= JSON.stringify(R.receber(c, 'bau', chave, { dono, em: d + 1 }).resultado) === JSON.stringify(r.resultado);
      c = r.cartas;
      const x = r.resultado;
      if (d === 0) primeiraPrata &&= x.raridade === 'prata';
      if (d < porAno) {
        ano1++;
        if (!x.nova) repetidaAno1++;
        if (!x.versaoNova) versaoRepetidaAno1++;
        porRaridade[x.raridade]++;
      }
      desdeOuro++;
      if (x.raridade === 'ouro') { entreOuros.push(desdeOuro); desdeOuro = 0; }
      semAlta = x.raridade === 'prata' || x.raridade === 'ouro' ? 0 : semAlta + 1;
      piorSemAlta = Math.max(piorSemAlta, semAlta);
      tem.add(x.carta);
      if (completou === null && tem.size === total) completou = d + 1;
    }
    meses.push(completou === null ? Infinity : (completou / porAno) * 12);
  }
  meses.sort((a, b) => a - b);
  entreOuros.sort((a, b) => a - b);
  const quantil = (v, q) => v[Math.min(v.length - 1, Math.floor(v.length * q))];
  return {
    contas, porAno, albuns, cartas: total, vies: [R.PESO_NOVA_ATUAL, R.PESO_NOVA_OUTRO, R.PESO_TEM],
    porAnoRaridade: Object.fromEntries(Object.entries(porRaridade).map(([k, v]) => [k, +(v / contas).toFixed(1)])),
    entreOuros: { media: +(entreOuros.reduce((a, b) => a + b, 0) / entreOuros.length).toFixed(1), pior: entreOuros[entreOuros.length - 1] },
    piorSemAlta,
    mesesParaCompletar: { p10: +quantil(meses, 0.1).toFixed(1), mediana: +quantil(meses, 0.5).toFixed(1), p90: +quantil(meses, 0.9).toFixed(1) },
    repetidasAno1: +((repetidaAno1 / ano1) * 100).toFixed(1),
    versaoRepetidaAno1: +((versaoRepetidaAno1 / ano1) * 100).toFixed(1),
    primeiraPrata, estaveis,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const contas = Number(process.argv[2]) || 300;
  for (const albuns of [Number(process.argv[3]) || 4].concat(process.argv[3] ? [] : [8])) {
    for (const [nome, porAno] of [['leve', 30], ['regular', 75], ['intenso', 120]]) {
      console.log(nome + ' · ' + albuns + ' álbuns · ' + JSON.stringify(simular({ contas, porAno, albuns, anos: albuns === 4 ? 4 : 8 })));
    }
  }
}
