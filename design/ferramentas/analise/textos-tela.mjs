// Frente "texto", parte 2: junta os textos que o verificador viu em todas as telas
// (SAIDA/rel/*relatorio.json, campo "textos", gravado por rev.mjs) e imprime os que NÃO são
// literais do código, isto é, os compostos em tempo de execução (plural, nomes, números,
// datas): é neles que a concordância costuma falhar. Ordem alfabética em português, com a
// tela onde apareceu entre colchetes.
//
// Uso:  node design/ferramentas/analise/textos-tela.mjs <strings.txt> <pasta rel/>
//       TUDO=1 imprime todos os textos vistos, literais inclusive
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [, , arqStrings, pastaRel] = process.argv;
if (!arqStrings || !pastaRel) { console.log('uso: node design/ferramentas/analise/textos-tela.mjs <strings.txt> <pasta rel/>'); process.exit(1); }
const literais = readFileSync(arqStrings, 'utf8').split('\n').map((l) => l.split('\t')[1] || '').filter(Boolean);
const todos = new Map();
for (const f of readdirSync(pastaRel).filter((f) => f.endsWith('relatorio.json'))) {
  const rel = JSON.parse(readFileSync(join(pastaRel, f), 'utf8'));
  for (const [id, r] of Object.entries(rel)) for (const t of r.textos || []) if (!todos.has(t)) todos.set(t, id);
}
const ehLiteral = (t) => literais.some((l) => l === t || (l.length > 12 && t.includes(l)));
const saida = [];
for (const [t, id] of todos) { if (t.length < 3) continue; if (process.env.TUDO || !ehLiteral(t)) saida.push(t + '\t[' + id + ']'); }
saida.sort((a, b) => a.localeCompare(b, 'pt'));
console.log(saida.join('\n'));
