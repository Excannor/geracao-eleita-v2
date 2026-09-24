// O caminho de volta: regenera os arquivos JSON da época antes do banco, a partir do banco.
// Trabalha sobre uma cópia (VACUUM INTO) e nunca mexe no banco nem na pasta de origem.
//
// Uso: node ferramentas/exportar-sqlite-para-json.mjs <pasta-dos-dados> <pasta-de-saída>
// Depois, para voltar a uma versão sem banco: pare o servidor, ponha os JSON da saída na
// pasta dados/ e suba a imagem antiga.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const importar = (f) => import(pathToFileURL(join(AQUI, f)).href);
const { abrirBanco, arquivoDoBanco, copiarBanco, fecharBanco } = await importar('db.mjs');
const { Contas } = await importar('contas.mjs');
const { Novidades } = await importar('novidades.mjs');
const { Notificacoes } = await importar('notificacoes.mjs');

const [origem, saida] = process.argv.slice(2).map((p) => p && resolve(p));
if (!origem || !saida) {
  console.log('uso: node ferramentas/exportar-sqlite-para-json.mjs <pasta-dos-dados> <pasta-de-saída>');
  process.exit(2);
}
if (!existsSync(arquivoDoBanco(origem))) {
  console.log('não achei ' + arquivoDoBanco(origem));
  process.exit(1);
}
if (resolve(origem) === resolve(saida)) {
  console.log('a saída precisa ser outra pasta: a exportação nunca escreve na pasta dos dados');
  process.exit(1);
}

// Uma cópia consistente do banco, numa pasta temporária sem nenhum JSON: os módulos leem
// dela como se fosse a de verdade, e nada é importado nem movido na origem.
const temporaria = mkdtempSync(join(tmpdir(), 'cc-exportar-'));
const bancoOrigem = abrirBanco(arquivoDoBanco(origem));
copiarBanco(bancoOrigem, arquivoDoBanco(temporaria));
fecharBanco(arquivoDoBanco(origem));

try {
  mkdirSync(saida, { recursive: true });
  const contas = await new Contas(join(temporaria, 'contas.json')).carregar();
  const novidades = await new Novidades(join(temporaria, 'novidades.json')).carregar();
  const notificacoes = await new Notificacoes(join(temporaria, 'notificacoes.json')).carregar();
  writeFileSync(join(saida, 'contas.json'), JSON.stringify(contas.dados, null, 2), 'utf8');
  writeFileSync(join(saida, 'novidades.json'), JSON.stringify(novidades.dados), 'utf8');
  writeFileSync(join(saida, 'notificacoes.json'), JSON.stringify(notificacoes.dados, null, 2), 'utf8');

  const db = abrirBanco(arquivoDoBanco(temporaria));
  const estados = db.prepare('SELECT usuario, dados FROM estados').all();
  for (const { usuario, dados } of estados) {
    const nome = usuario === 'caminho' ? 'estado.json' : 'estado-' + usuario + '.json';
    writeFileSync(join(saida, nome), JSON.stringify(JSON.parse(dados), null, 2), 'utf8');
  }
  fecharBanco(arquivoDoBanco(temporaria));

  console.log('exportado para ' + saida + ': ' + Object.keys(contas.dados.contas).length + ' contas, '
    + estados.length + ' progressos, ' + novidades.dados.eventos.length + ' novidades');
  console.log('arquivos: ' + readdirSync(saida).filter((n) => n.endsWith('.json')).length);
} finally {
  try { rmSync(temporaria, { recursive: true, force: true }); } catch { /* ok */ }
}
