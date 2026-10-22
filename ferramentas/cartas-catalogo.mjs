// O catálogo das cartas do baú (conteudo/cartas/indice.json, docs/cartas.md seção 1): a conferência
// da forma, que o build e o teste.mjs fazem, e o esqueleto do sorteio, que vai no index.html.
// O catálogo inteiro (títulos, "Você sabia?", links) vai só na peça sob demanda "album".
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const RARIDADES = ['linho', 'bronze', 'prata', 'ouro'];
// Os conjuntos especiais (especial: true) ficam fora do sorteio e das garantias: Semeadores (as 5
// cartas por amigos que vieram pelo convite, nos limiares abaixo) e Boas-vindas (a carta de quem
// chegou por um convite). Neles a Glória pode ser a raridade de base.
export const LIMIARES_SEMEADORES = [1, 5, 15, 40, 100];
// Por álbum de 13: 5 Linho, 4 Bronze, 3 Prata e 1 Ouro (cartas-raridade.md).
export const POR_ALBUM = { linho: 5, bronze: 4, prata: 3, ouro: 1 };
const LETRA = { linho: 'l', bronze: 'b', prata: 'p', ouro: 'o', gloria: 'g' };

export function lerCatalogo(raiz) {
  return JSON.parse(readFileSync(join(raiz, 'conteudo', 'cartas', 'indice.json'), 'utf8'));
}

// Devolve a lista de problemas (vazia quando está tudo certo). Com a raiz do app, confere também
// que a referência existe na NBV e que o link leva a um mapa, atlas ou parábola publicados.
export function validarCatalogo(cat, raiz) {
  const erros = [];
  const albuns = (cat && cat.albuns) || [];
  const cartas = (cat && cat.cartas) || [];
  const sorteados = albuns.filter((a) => !a.especial);
  if (sorteados.length !== 4) erros.push('são 4 álbuns no sorteio (' + sorteados.length + ')');
  const especial = (id) => !!(albuns.find((a) => a.id === id) || {}).especial;
  const ids = new Set();
  for (const c of cartas) {
    if (!/^[a-z0-9-]{2,40}$/.test(c.id || '')) erros.push('id inválido: ' + c.id);
    if (ids.has(c.id)) erros.push('id repetido: ' + c.id);
    ids.add(c.id);
    if (!albuns.some((a) => a.id === c.album)) erros.push(c.id + ': álbum desconhecido ' + c.album);
    if (!RARIDADES.includes(c.raridade) && !(especial(c.album) && c.raridade === 'gloria')) erros.push(c.id + ': raridade ' + c.raridade);
    for (const campo of ['titulo', 'referencia', 'voceSabia']) if (!String(c[campo] || '').trim()) erros.push(c.id + ': sem ' + campo);
    if (!/^(.+?) (\d{1,3})\.(\d{1,3})(?:-(\d{1,3}))?$/.test(c.referencia || '')) erros.push(c.id + ': referência ilegível ' + c.referencia);
    if (/[–—]/.test(c.titulo + c.voceSabia)) erros.push(c.id + ': travessão no texto');
  }
  for (const a of albuns.filter((x) => x.especial)) {
    const doAlbum = cartas.filter((c) => c.album === a.id);
    const numeros = doAlbum.map((c) => c.numero).sort((x, y) => x - y).join();
    if (!doAlbum.length || numeros !== Array.from({ length: doAlbum.length }, (_, i) => i + 1).join()) erros.push(a.id + ': números de 1 a ' + doAlbum.length + ' (' + numeros + ')');
  }
  const semeadores = cartas.filter((c) => c.album === 'semeadores').sort((x, y) => x.numero - y.numero);
  if (semeadores.map((c) => c.amigos).join() !== LIMIARES_SEMEADORES.join()) erros.push('semeadores: limiares ' + LIMIARES_SEMEADORES.join(', ') + ' (' + semeadores.map((c) => c.amigos).join(', ') + ')');
  if (!cartas.some((c) => c.album === 'boas-vindas' && c.raridade === 'linho')) erros.push('boas-vindas: falta a carta Linho');
  for (const a of sorteados) {
    const doAlbum = cartas.filter((c) => c.album === a.id);
    if (doAlbum.length !== 13) erros.push(a.id + ': 13 cartas (' + doAlbum.length + ')');
    for (const [r, n] of Object.entries(POR_ALBUM)) {
      const tem = doAlbum.filter((c) => c.raridade === r).length;
      if (tem !== n) erros.push(a.id + ': ' + n + ' ' + r + ' (' + tem + ')');
    }
    const numeros = doAlbum.map((c) => c.numero).sort((x, y) => x - y).join();
    if (numeros !== Array.from({ length: 13 }, (_, i) => i + 1).join()) erros.push(a.id + ': números de 1 a 13 (' + numeros + ')');
  }
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

// O esqueleto do sorteio, no index.html: [{ id, nome, c: "id:l id:b ..." }] na ordem do álbum
// (os especiais com especial: 1).
// É tudo o que a regra (02c-cartas.js) precisa para sortear sem a peça: álbum, id e raridade.
export function esqueletoDoCatalogo(cat) {
  return cat.albuns.map((a) => ({
    id: a.id,
    nome: a.nome,
    ...(a.especial ? { especial: 1 } : {}),
    c: cat.cartas.filter((c) => c.album === a.id).sort((x, y) => x.numero - y.numero).map((c) => c.id + ':' + LETRA[c.raridade]).join(' '),
  }));
}
