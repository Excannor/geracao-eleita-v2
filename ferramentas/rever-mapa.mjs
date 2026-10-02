// Folha de releitura de um mapa do livro: cada item (raiz, autoria, galhos, destaques, conexões,
// "[Livro] e Cristo", pares, curiosidades e "procure") ao lado do texto da NBV das referências
// dele. O checar-mapa só confere as aspas; sujeito, verbo, número, lugar e "ordem ou fato" se
// conferem lendo esta folha, item por item (skill mapa-do-livro, seção 1).
// Uso: node ferramentas/rever-mapa.mjs <slug> > /tmp/rever.txt
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { textoDaRef } from './checar-mapa.mjs';

const slug = process.argv[2];
if (!slug) { console.log('Uso: node ferramentas/rever-mapa.mjs <slug>'); process.exit(2); }
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const m = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'mapas', slug + '.json'), 'utf8'));
const linhas = [];
const dentro = (t) => [...String(t).matchAll(/\(([^()]*\d[^()]*)\)/g)].map((x) => x[1]).filter((r) => textoDaRef(r));
const item = (nome, texto, refs) => {
  linhas.push('### ' + nome, '> ' + texto);
  for (const r of refs) linhas.push('   [' + r + '] ' + (textoDaRef(r) ?? '(referência fora da NBV)'));
  linhas.push('');
};
item('raiz', m.raiz.texto + (m.raiz.apoio ? ' || ' + m.raiz.apoio : ''), m.raiz.refs);
item('autoria', m.autoria.texto + (m.autoria.apoio ? ' || ' + m.autoria.apoio : ''), m.autoria.refs);
m.ramos.forEach((r, i) => {
  item(`ramo ${i + 1} (título e sub)`, r.titulo + ' · ' + r.sub, []);
  r.galhos.forEach((g, j) => item(`ramo ${i + 1} galho ${j + 1}`, g.texto, [g.ref]));
  if (r.jesus) item(`ramo ${i + 1} jesus`, r.jesus.texto, r.jesus.refs);
  if (r.conexao) item(`ramo ${i + 1} conexão (${r.conexao.length} car.)`, r.conexao, dentro(r.conexao));
});
item('cristo', m.cristo.texto, [m.cristo.ref, ...dentro(m.cristo.texto)]);
m.cristo.pares.forEach((p, i) => item('par ' + (i + 1), p.texto + (p.nota ? ' || ' + p.nota : ''), [p.at, p.nt]));
m.curiosidades.forEach((c, i) => item('curiosidade ' + (i + 1), c.texto, [c.ref]));
item('procure', m.procure.texto, m.procure.ref ? [m.procure.ref] : []);
console.log(linhas.join('\n'));
