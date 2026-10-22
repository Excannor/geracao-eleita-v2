// O catálogo das cartas do baú (conteudo/cartas/indice.json, docs/cartas.md seção 1): a conferência
// da forma, que o build e o teste.mjs fazem, e o esqueleto do sorteio, que vai no index.html.
// O catálogo inteiro (títulos, "Você sabia?", links) vai só na peça sob demanda "album".
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// As raridades são da cópia recebida, não da carta (docs/cartas.md, seção 4): toda carta dos álbuns
// do sorteio existe em Linho, Bronze, Prata, Ouro e Glória. Só os conjuntos especiais
// (especial: true, fora do sorteio e das proteções) têm raridade fixa por carta: Semeadores (as 5
// cartas por amigos que vieram pelo convite, nos limiares abaixo) e Boas-vindas (a carta de quem
// chegou por um convite).
export const RARIDADES = ['linho', 'bronze', 'prata', 'ouro', 'gloria'];
export const LIMIARES_SEMEADORES = [1, 5, 15, 40, 100];
const LETRA = { linho: 'l', bronze: 'b', prata: 'p', ouro: 'o', gloria: 'g' };
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export function lerCatalogo(raiz) {
  return JSON.parse(readFileSync(join(raiz, 'conteudo', 'cartas', 'indice.json'), 'utf8'));
}

// Devolve a lista de problemas (vazia quando está tudo certo). Com a raiz do app, confere também
// que a referência existe na NBV e que o link leva a um mapa, atlas ou parábola publicados.
export function validarCatalogo(cat, raiz) {
  const erros = [];
  const albuns = (cat && cat.albuns) || [];
  const cartas = (cat && cat.cartas) || [];
  // O catálogo cresce: qualquer número de álbuns de 13, cada um com a data de lançamento, na
  // ordem em que são lançados (é a ordem do álbum atual no sorteio), e a carta de capa.
  const sorteados = albuns.filter((a) => !a.especial);
  if (sorteados.length < 4) erros.push('pelo menos os 4 álbuns de lançamento (' + sorteados.length + ')');
  const especial = (id) => !!(albuns.find((a) => a.id === id) || {}).especial;
  const idsAlbum = new Set();
  for (const a of albuns) {
    if (!/^[a-z0-9-]{2,30}$/.test(a.id || '') || idsAlbum.has(a.id)) erros.push('álbum com id inválido ou repetido: ' + a.id);
    idsAlbum.add(a.id);
    if (!String(a.nome || '').trim()) erros.push(a.id + ': sem nome');
  }
  sorteados.forEach((a, i) => {
    if (!DATA.test(a.lancadoEm || '') || Number.isNaN(Date.parse(a.lancadoEm))) erros.push(a.id + ': lancadoEm inválido (' + a.lancadoEm + ')');
    else if (i && a.lancadoEm < sorteados[i - 1].lancadoEm) erros.push(a.id + ': lançado antes de ' + sorteados[i - 1].id + ', mas vem depois no catálogo');
    if (!cartas.some((c) => c.id === a.capa && c.album === a.id)) erros.push(a.id + ': capa ' + a.capa + ' não é carta do álbum');
  });
  const ids = new Set();
  for (const c of cartas) {
    if (!/^[a-z0-9-]{2,40}$/.test(c.id || '')) erros.push('id inválido: ' + c.id);
    if (ids.has(c.id)) erros.push('id repetido: ' + c.id);
    ids.add(c.id);
    if (!albuns.some((a) => a.id === c.album)) erros.push(c.id + ': álbum desconhecido ' + c.album);
    if (especial(c.album) ? !RARIDADES.includes(c.raridade) : c.raridade !== undefined) erros.push(c.id + ': a raridade só é fixa nos conjuntos especiais (' + c.raridade + ')');
    for (const campo of ['titulo', 'referencia', 'voceSabia']) if (!String(c[campo] || '').trim()) erros.push(c.id + ': sem ' + campo);
    if (!/^(.+?) (\d{1,3})\.(\d{1,3})(?:-(\d{1,3}))?$/.test(c.referencia || '')) erros.push(c.id + ': referência ilegível ' + c.referencia);
    if (/[\u2013\u2014]/.test(c.titulo + c.voceSabia)) erros.push(c.id + ': travessão no texto');
  }
  for (const a of albuns) {
    const doAlbum = cartas.filter((c) => c.album === a.id);
    const n = a.especial ? doAlbum.length : 13;
    if (!a.especial && doAlbum.length !== 13) erros.push(a.id + ': 13 cartas (' + doAlbum.length + ')');
    const numeros = doAlbum.map((c) => c.numero).sort((x, y) => x - y).join();
    if (!doAlbum.length || numeros !== Array.from({ length: n }, (_, i) => i + 1).join()) erros.push(a.id + ': números de 1 a ' + n + ' (' + numeros + ')');
  }
  const semeadores = cartas.filter((c) => c.album === 'semeadores').sort((x, y) => x.numero - y.numero);
  if (semeadores.map((c) => c.amigos).join() !== LIMIARES_SEMEADORES.join()) erros.push('semeadores: limiares ' + LIMIARES_SEMEADORES.join(', ') + ' (' + semeadores.map((c) => c.amigos).join(', ') + ')');
  if (!cartas.some((c) => c.album === 'boas-vindas' && c.raridade === 'linho')) erros.push('boas-vindas: falta a carta Linho');
  if (raiz) {
    const nbv = JSON.parse(readFileSync(join(raiz, 'conteudo', 'biblias', 'nbv.json'), 'utf8'));
    const atlas = JSON.parse(readFileSync(join(raiz, 'conteudo', 'atlas', 'indice.json'), 'utf8'));
    for (const c of cartas) {
      const m = /^(.+?) (\d{1,3})\.(\d{1,3})(?:-(\d{1,3}))?$/.exec(c.referencia || '');
      const cap = m && (nbv.livros[m[1]] || [])[Number(m[2]) - 1];
      const de = m && Number(m[3]);
      const ate = m && Number(m[4] || m[3]);
      if (!cap || !(ate >= de) || ate - de > 9 || !cap.slice(de - 1, ate).every(Boolean) || cap.length < ate) erros.push(c.id + ': ' + c.referencia + ' não existe na NBV');
      if (!c.link) continue;
      const [, tipo, alvo] = /^#\/(mapa|atlas|parabola)\/([a-z0-9-]+)$/.exec(c.link) || [];
      const ok = tipo === 'mapa' ? existsSync(join(raiz, 'conteudo', 'mapas', alvo + '.json'))
        : tipo === 'parabola' ? existsSync(join(raiz, 'conteudo', 'parabolas', alvo + '.json'))
          : tipo === 'atlas' ? (atlas.publicados || []).includes(alvo) : false;
      if (!ok) erros.push(c.id + ': link sem destino ' + c.link);
    }
  }
  return erros;
}

// O esqueleto do sorteio, no index.html: [{ id, nome, lancadoEm, capa, c: "id id ..." }] na ordem
// do álbum; os especiais, com especial: 1 e a raridade fixa de cada carta ("id:l").
export function esqueletoDoCatalogo(cat) {
  return cat.albuns.map((a) => {
    const ids = cat.cartas.filter((c) => c.album === a.id).sort((x, y) => x.numero - y.numero);
    return a.especial
      ? { id: a.id, nome: a.nome, especial: 1, c: ids.map((c) => c.id + ':' + LETRA[c.raridade]).join(' ') }
      : { id: a.id, nome: a.nome, lancadoEm: a.lancadoEm, capa: a.capa, c: ids.map((c) => c.id).join(' ') };
  });
}
