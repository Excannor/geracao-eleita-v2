// Simula o sorteio das cartas (src/sob-demanda/cartas-regras.js, a regra de verdade, num contexto
// isolado) para muitas contas e ritmos de leitura, e mede o que docs/cartas.md promete: quantas de
// cada raridade por ano, a distância entre Ouros, o tempo para completar os álbuns e as repetidas.
// O teste.mjs roda uma versão menor e confere as metas. Uso:
//   node ferramentas/simular-cartas.mjs [contas] [albuns]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import { lerCatalogo, esqueletoDoCatalogo, todasLancadas } from './cartas-catalogo.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');

// A regra num contexto próprio, com um esqueleto à escolha (para simular catálogos maiores).
export function carregarRegras(indice) {
  const ctx = createContext({ window: { CC: {}, CARTAS_INDICE: indice }, Math, Map, Set, String, Number, JSON, Object, Array, Date, document: { querySelector: () => null } });
  runInContext('window.CC = window.CC || {};', ctx);
  runInContext(readFileSync(join(AQUI, 'src', 'sob-demanda', 'cartas-regras.js'), 'utf8'), ctx);
  return ctx.window.CC.cartasRegras;
}

// O esqueleto do catálogo com n álbuns de sorteio: os de lançamento, mais cópias com ids novos.
// lancadas: 'todas' (o catálogo inteiro desenhado, o plano de longo prazo) ou 'hoje' (só as que
// já têm desenho).
export function indiceCom(albuns, lancadas = 'todas') {
  const esq = esqueletoDoCatalogo(lerCatalogo(AQUI));
  const base = lancadas === 'todas' ? todasLancadas(esq) : esq;
  const sorteio = base.filter((a) => !a.especial);
  const extra = [];
  for (let i = sorteio.length; i < albuns; i++) {
    const modelo = sorteio[i % sorteio.length];
    extra.push({ ...modelo, id: modelo.id + '-' + i, c: modelo.c.split(' ').map((id) => id + '-' + i).join(' '), capa: modelo.capa + '-' + i });
  }
  return sorteio.slice(0, albuns).concat(extra, base.filter((a) => a.especial));
}

// porAno: sorteios comuns por ano (baús e as outras fontes); marcos: sorteios de marco por ano além
// dos álbuns completos (unidades e dias de leitura); anos: quanto simular.
export function simular({ contas = 300, porAno = 75, marcos = 14, anos = 3, albuns = 4, vies = null } = {}) {
  const R = carregarRegras(indiceCom(albuns));
  if (vies) [R.PESO_NOVA_ATUAL, R.PESO_NOVA_OUTRO] = vies;
  const total = R.albuns().reduce((s, a) => s + a.cartas.length, 0);
  const porRaridade = { linho: 0, bronze: 0, prata: 0, ouro: 0, gloria: 0 };
  const gloriasNoAno = [];
  const meses = [];
  let repetidaAno1 = 0;
  let versaoRepetidaAno1 = 0;
  let ano1 = 0;
  let marcosAno1 = 0;
  let gloriaComum = 0;
  let comuns = 0;
  const entreOuros = [];
  let piorSemAlta = 0;
  let marcoBaixo = false;
  let primeiraPrata = true;
  let estaveis = true;
  for (let p = 0; p < contas; p++) {
    const dono = 'simulada' + p;
    let c = R.vazio();
    let completou = null;
    let desdeOuro = 0;
    let semAlta = 0;
    let em = 1;
    let k = 0;
    let feitos = 0;
    const tem = new Set();
    const anotar = (x, d, marco) => {
      const ano = Math.floor(d / porAno);
      gloriasNoAno[ano] = (gloriasNoAno[ano] || 0) + (x.raridade === 'gloria' ? 1 : 0);
      if (marco && ['linho', 'bronze'].includes(x.raridade)) marcoBaixo = true;
      if (!marco) { comuns++; if (x.raridade === 'gloria') gloriaComum++; }
      if (d < porAno) {
        ano1++;
        if (marco) marcosAno1++;
        if (!x.nova) repetidaAno1++;
        if (!x.versaoNova) versaoRepetidaAno1++;
        porRaridade[x.raridade]++;
      }
      desdeOuro++;
      if (x.raridade === 'ouro') { entreOuros.push(desdeOuro); desdeOuro = 0; }
      semAlta = ['prata', 'ouro', 'gloria'].includes(x.raridade) ? 0 : semAlta + 1;
      piorSemAlta = Math.max(piorSemAlta, semAlta);
      tem.add(x.carta);
      feitos++;
      if (completou === null && tem.size === total) completou = d + 1;
    };
    for (let d = 0; d < porAno * anos; d++) {
      const chave = 'bau:dia:' + (d + 1);
      const r = R.receber(c, 'bau', chave, { dono, em: em++ });
      // o mesmo evento, sorteado de novo do mesmo estado, dá o mesmo resultado
      if (p < 5 && d < 40) estaveis &&= JSON.stringify(R.receber(c, 'bau', chave, { dono, em: em - 1 }).resultado) === JSON.stringify(r.resultado);
      c = r.cartas;
      if (d === 0) primeiraPrata &&= r.resultado.raridade === 'prata';
      anotar(r.resultado, d, false);
      for (const x of r.extra || []) { anotar(x, d, true); em++; }
      if (Math.floor(((d + 1) * marcos) / porAno) > Math.floor((d * marcos) / porAno)) {
        const m = R.receber(c, 'unidade', 'unidade:' + ++k, { dono, em: em++ });
        c = m.cartas;
        anotar(m.resultado, d, true);
        for (const x of m.extra || []) { anotar(x, d, true); em++; }
      }
    }
    meses.push(completou === null ? Infinity : (completou / porAno) * 12);
  }
  meses.sort((a, b) => a - b);
  entreOuros.sort((a, b) => a - b);
  const quantil = (v, q) => v[Math.min(v.length - 1, Math.floor(v.length * q))];
  return {
    contas, porAno, marcos, albuns, cartas: total, vies: [R.PESO_NOVA_ATUAL, R.PESO_NOVA_OUTRO, R.PESO_TEM, R.PESO_VERSAO_NOVA],
    cartasNoAno1: +(ano1 / contas).toFixed(1), marcosNoAno1: +(marcosAno1 / contas).toFixed(1),
    porAnoRaridade: Object.fromEntries(Object.entries(porRaridade).map(([k, v]) => [k, +(v / contas).toFixed(1)])),
    gloriasPorAno: gloriasNoAno.slice(0, Math.floor(anos)).map((g) => +(g / contas).toFixed(2)),
    gloriaNoComum: +((gloriaComum / Math.max(1, comuns)) * 100).toFixed(2),
    entreOuros: { media: +(entreOuros.reduce((a, b) => a + b, 0) / entreOuros.length).toFixed(1), pior: entreOuros[entreOuros.length - 1] },
    piorSemAlta, marcoBaixo,
    mesesParaCompletar: { p10: +quantil(meses, 0.1).toFixed(1), mediana: +quantil(meses, 0.5).toFixed(1), p90: +quantil(meses, 0.9).toFixed(1) },
    repetidasAno1: +((repetidaAno1 / ano1) * 100).toFixed(1),
    versaoRepetidaAno1: +((versaoRepetidaAno1 / ano1) * 100).toFixed(1),
    primeiraPrata, estaveis,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const contas = Number(process.argv[2]) || 300;
  for (const albuns of [Number(process.argv[3]) || 4].concat(process.argv[3] ? [] : [8])) {
    for (const [nome, porAno, marcos] of [['leve', 30, 6], ['regular', 75, 14], ['intenso', 120, 14]]) {
      console.log(nome + ' · ' + albuns + ' álbuns · ' + JSON.stringify(simular({ contas, porAno, marcos, albuns, anos: albuns === 4 ? 3 : 5 })));
    }
  }
}
