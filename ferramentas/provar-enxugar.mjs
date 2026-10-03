// Prova que o JS enxugado pelo build (sem comentários, recuo e linhas em branco) é o mesmo
// programa do fonte: monta a árvore sintática de cada módulo de src/app e do trecho dele no
// dist/index.html e compara as duas, fora as posições. Rode depois de `node build.mjs` sempre
// que mexer no enxugarJs do build ou num módulo com texto entre crases de várias linhas.
// Precisa do acorn, que o projeto não traz (o build roda sem dependência nenhuma):
//   npm i --no-save acorn && node ferramentas/provar-enxugar.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let parse;
try { ({ parse } = await import('acorn')); } catch {
  console.error('falta o acorn: npm i --no-save acorn');
  process.exit(2);
}
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(AQUI, 'dist', 'index.html'), 'utf8');
const js = (html.match(/window\.iniciarApp = function \(\) \{\n([\s\S]*)\n\};\n\(function \(\) \{/) || [])[1];
if (!js) { console.error('não achei o app no dist/index.html: rode node build.mjs'); process.exit(2); }
const partes = js.split(/^\/\* (\S+\.js) \*\/\n/m);
// sem posições; o desenho embutido no lugar da marca '@@DESENHO:<id>@@' vira o mesmo texto
const arvore = (codigo) => JSON.stringify(parse(codigo, { ecmaVersion: 'latest' }),
  (k, v) => (k === 'start' || k === 'end' ? undefined : v));
let diferentes = 0;
for (let i = 1; i < partes.length; i += 2) {
  const nome = partes[i];
  const fonte = readFileSync(join(AQUI, 'src', 'app', nome), 'utf8').replace(/'@@DESENHO:[a-z0-9-]+@@'/g, '"D"');
  const enxuto = partes[i + 1].replace(/"<svg[\s\S]*?<\/svg>"/g, '"D"');
  if (arvore(fonte) !== arvore(enxuto)) { diferentes++; console.log('  DIFERE  ' + nome); }
}
const total = (partes.length - 1) / 2;
console.log(diferentes ? '\n  ' + diferentes + ' de ' + total + ' módulos mudaram de sentido\n' : '\n  os ' + total + ' módulos enxugados são o mesmo programa do fonte\n');
process.exit(diferentes ? 1 : 0);
