// Confere as notas visíveis do Explorar contra as Bíblias do app:
//   1. toda referência escrita ("João 3.16", "Salmo 23.1-4") existe na Bíblia;
//   2. toda citação entre aspas com cara de texto bíblico existe, palavra por palavra, na
//      NBV ou na Bíblia Livre. O material de origem citava a NVI e a Almeida de memória; o
//      leitor abre a NBV ou a Bíblia Livre e não acha a frase.
// Citação que não bate não é erro certo: pode ser fala de alguém, termo ou frase do autor.
// Por isso a lista sai para revisão, com o trecho, e não derruba nada.
// Uso: node ferramentas/teste-explorar.mjs [pasta]   (ex.: "01 - Trilha")
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { notaOculta } from './ajustes-conteudo.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'conteudo.json'), 'utf8'));
const B = ['nbv', 'blivre'].map((s) => JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', s + '.json'), 'utf8')));
const filtro = process.argv[2] || '';

const normalizar = (s) => String(s).normalize('NFC').toLowerCase()
  .replace(/&quot;/g, ' ').replace(/[“”"'‘’«».,;:!?()[\]…—–-]/g, ' ').replace(/\s+/g, ' ').trim();
const textoDe = (html) => String(html).replace(/<blockquote data-verso="[^"]*">[\s\S]*?<\/blockquote>/, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// Cada Bíblia vira um texto corrido normalizado, para achar a citação em qualquer lugar.
const corrido = B.map((b) => ' ' + Object.values(b.livros).flat().map(normalizar).join(' ') + ' ');
const LIVROS = Object.keys(B[0].livros);
// "Salmo 23" também é como se escreve o livro dos Salmos
const NOME_LIVRO = new Map(LIVROS.map((l) => [l, l]).concat([['Salmo', 'Salmos']]));
const REF = new RegExp('(?<!\\p{L})(' + [...NOME_LIVRO.keys()].sort((a, b) => b.length - a.length)
  .map((l) => l.replace(/ /g, '\\s')).join('|') + ')\\s(\\d+)(?:[.:](\\d+)(?:\\s?[-–]\\s?(\\d+)(?:[.:](\\d+))?)?)?', 'gu');

const refsRuins = [];
const citacoes = [];
let notas = 0;
for (const [id, n] of Object.entries(D.notas)) {
  if (notaOculta(D, id) || (filtro && !id.startsWith(filtro))) continue;
  notas++;
  const texto = textoDe(n.html);
  for (const m of texto.matchAll(REF)) {
    const livro = NOME_LIVRO.get(m[1].replace(/\s/g, ' '));
    const caps = B[0].livros[livro];
    // Livro de um capítulo só ("Judas 24", "2 João 6"): o número é o versículo.
    const umCapitulo = caps && caps.length === 1 && !m[3];
    const cap = umCapitulo ? 1 : Number(m[2]);
    if (!caps || !caps[cap - 1]) { refsRuins.push([id, m[0], 'capítulo não existe']); continue; }
    if (umCapitulo) {
      if (!caps[0][Number(m[2]) - 1]) refsRuins.push([id, m[0], 'versículo não existe']);
      continue;
    }
    if (!m[3]) continue;
    const de = Number(m[3]);
    if (m[5]) {
      // faixa que atravessa capítulo: "Gênesis 29.31-30.24"
      const capFim = caps[Number(m[4]) - 1];
      if (!caps[cap - 1][de - 1] || !capFim || !capFim[Number(m[5]) - 1] || Number(m[4]) < cap) refsRuins.push([id, m[0], 'faixa não existe']);
      continue;
    }
    const ate = Number(m[4] || m[3]);
    if (ate < de) { refsRuins.push([id, m[0], 'faixa invertida']); continue; }
    for (let v = de; v <= ate; v++) {
      if (!caps[cap - 1][v - 1]) { refsRuins.push([id, m[0], 'versículo ' + v + ' não existe']); break; }
    }
  }
  // Citações: entre aspas curvas ou retas, com ao menos quatro palavras.
  // Aspas retas mal pareadas pegam pedaços de texto corrido: só entra o que começa com
  // letra e não tem parêntese nem dois-pontos no meio.
  for (const m of texto.matchAll(/[“"]([^“”"]{12,250})[”"]/g)) {
    if (!/^\p{L}/u.test(m[1].trim()) || /[():]/.test(m[1])) continue;
    const alvo = normalizar(m[1]);
    if (alvo.split(' ').length < 4) continue;
    if (corrido.some((c) => c.includes(' ' + alvo + ' '))) continue;
    citacoes.push([id, m[1].trim()]);
  }
}

console.log('\n  Explorar contra as Bíblias do app' + (filtro ? ' · ' + filtro : '') + ' · ' + notas + ' notas visíveis\n');
console.log('  referências que não existem (' + refsRuins.length + ')');
for (const [id, ref, porque] of refsRuins) console.log('    ' + id + ' · ' + ref + ' · ' + porque);
console.log('\n  citações que não estão na NBV nem na Bíblia Livre (' + citacoes.length + '): conferir uma a uma');
for (const [id, c] of citacoes) console.log('    ' + id + ' · "' + c + '"');
console.log('');
process.exit(refsRuins.length ? 1 : 0);
