// Confere o alicerce do banco (db.mjs), sem servidor: esquema com versão, gravação só do
// que mudou, transação que desfaz tudo quando algo falha, backup do dia e a pessoa que
// apaga a conta saindo também dos backups.
// Uso: node ferramentas/teste-db.mjs
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const B = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pasta = mkdtempSync(join(tmpdir(), 'cc-db-'));
console.log('\n  Banco: alicerce\n');

try {
  const arquivo = B.arquivoDoBanco(pasta);
  const db = B.abrirBanco(arquivo);
  ok(existsSync(arquivo), 'o banco nasce em dados/caminho.db');
  ok(B.abrirBanco(arquivo) === db, 'o processo inteiro divide a mesma conexão');
  ok(db.prepare('PRAGMA journal_mode').get().journal_mode === 'wal', 'o banco roda em modo WAL');
  ok(Number(db.prepare('SELECT versao FROM schema_versao').get().versao) === B.versaoDoEsquema(), 'o esquema fica na versão atual');
  const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name);
  ok(['contas', 'amizades', 'toques', 'novidades_eventos', 'push_inscricoes', 'estados', 'metadados'].every((t) => tabelas.includes(t)),
    'as tabelas do esquema v1 existem');

  // ---------- só grava o que mudou ----------
  const linhas = [
    { usuario: 'ana', nome: 'Ana', email: 'ana@x.com', nascimento: '2000-01-01', fuso: 'America/Sao_Paulo', sal: 's', senha: 'h', criada_em: '2026-01-01', selo_convite: 'x', extra: '{}' },
    { usuario: 'bia', nome: 'Bia', email: '', nascimento: '', fuso: 'America/Sao_Paulo', sal: 's', senha: 'h', criada_em: '2026-01-01', selo_convite: 'y', extra: '{}' },
  ];
  B.lerTabela(db, 'contas', ['usuario']);
  ok(B.sincronizar(db, [{ tabela: 'contas', chaves: ['usuario'], linhas }]) === 2, 'na primeira gravação, as duas linhas entram');
  ok(B.sincronizar(db, [{ tabela: 'contas', chaves: ['usuario'], linhas }]) === 0, 'gravar de novo sem mudança não escreve nada');
  linhas[1] = { ...linhas[1], nome: 'Beatriz' };
  ok(B.sincronizar(db, [{ tabela: 'contas', chaves: ['usuario'], linhas }]) === 1, 'mudar uma conta escreve só aquela linha');
  ok(db.prepare("SELECT nome FROM contas WHERE usuario = 'bia'").get().nome === 'Beatriz', 'e a mudança está no banco');
  ok(B.sincronizar(db, [{ tabela: 'contas', chaves: ['usuario'], linhas: [linhas[0]] }]) === 1
    && !db.prepare("SELECT 1 FROM contas WHERE usuario = 'bia'").get(), 'tirar uma linha da memória apaga do banco');

  const relida = B.lerTabela(db, 'contas', ['usuario']);
  ok(relida.length === 1 && B.sincronizar(db, [{ tabela: 'contas', chaves: ['usuario'], linhas: relida }]) === 0,
    'o que se lê do banco compara igual ao que se grava: carregar e salvar sem mudança não escreve');

  // ---------- transação ----------
  let caiu = false;
  try {
    B.sincronizar(db, [
      { tabela: 'amizades', chaves: ['a', 'b'], linhas: [{ a: 'ana', b: 'bia', estado: 'ativa', pediu: 'ana', em: '2026-01-02', aceita_em: '2026-01-02' }] },
      { tabela: 'toques', chaves: ['de', 'para'], linhas: [{ de: 'ana', para: 'bia', dia: null }] },
    ]);
  } catch { caiu = true; }
  ok(caiu && !db.prepare('SELECT 1 FROM amizades').get(), 'se uma parte falha, nada da gravação entra (a amizade não ficou pela metade)');
  ok(B.sincronizar(db, [{ tabela: 'amizades', chaves: ['a', 'b'], linhas: [{ a: 'ana', b: 'bia', estado: 'ativa', pediu: 'ana', em: '2026-01-02', aceita_em: '2026-01-02' }] }]) === 1,
    'depois da falha, a foto continua certa e a gravação seguinte entra');

  // ---------- progresso e metadados ----------
  B.gravarEstadoNoBanco(db, 'ana', { lidos: [1, 2], oia: { 1: { oracao: 'só minha' } } });
  ok(JSON.stringify(B.lerEstadoDoBanco(db, 'ana').lidos) === '[1,2]' && B.lerEstadoDoBanco(db, 'ninguem') === null, 'o progresso de cada um é lido e gravado');
  B.gravarMeta(db, 'teste', 42);
  ok(B.lerMeta(db, 'teste') === '42', 'metadados guardam marcas como "já importado"');

  // ---------- backups ----------
  const pastaBackup = join(pasta, 'backup');
  ok(!!B.backupDoDia(db, pastaBackup, '2026-09-15') && B.backupDoDia(db, pastaBackup, '2026-09-15') === null, 'um backup por dia, sem repetir');
  for (let d = 1; d <= 16; d++) B.backupDoDia(db, pastaBackup, '2026-08-' + String(d).padStart(2, '0'));
  const guardados = readdirSync(pastaBackup).filter((f) => f.endsWith('.db')).sort();
  ok(guardados.length === 14 && guardados.includes('caminho-2026-09-15.db') && !guardados.includes('caminho-2026-08-01.db'), 'ficam os 14 backups mais novos');
  const copia = new B.DatabaseSync(join(pastaBackup, 'caminho-2026-09-15.db'));
  ok(copia.prepare("SELECT usuario FROM contas").all().length === 1 && copia.prepare("SELECT 1 FROM estados WHERE usuario = 'ana'").get(), 'o backup abre sozinho e tem os dados');
  copia.close();

  // ---------- apagar a pessoa dos backups ----------
  B.sincronizar(db, [{ tabela: 'novidades_eventos', chaves: ['id'], linhas: [
    { id: 'e1', autor: 'ana', tipo: 'ofensiva', dados: '{}', chave: 'k1', em: 1 },
    { id: 'e2', autor: 'carla', tipo: 'novoProposito', dados: '{"com":"ana"}', chave: 'k2', em: 2 },
    { id: 'e3', autor: 'carla', tipo: 'ofensiva', dados: '{}', chave: 'k3', em: 3 },
  ] }]);
  B.fazerBackup(db, join(pastaBackup, 'caminho-teste-extra.db'));
  const limpos = B.apagarPessoaDosBackups(pastaBackup, 'ana');
  let sobrou = 0;
  let outrosFicaram = true;
  for (const f of readdirSync(pastaBackup).filter((n) => n.endsWith('.db'))) {
    const c = new B.DatabaseSync(join(pastaBackup, f));
    sobrou += c.prepare("SELECT count(*) n FROM contas WHERE usuario = 'ana'").get().n
      + c.prepare("SELECT count(*) n FROM estados WHERE usuario = 'ana'").get().n
      + c.prepare("SELECT count(*) n FROM amizades WHERE a = 'ana' OR b = 'ana'").get().n
      + c.prepare("SELECT count(*) n FROM novidades_eventos WHERE autor = 'ana' OR json_extract(dados, '$.com') = 'ana'").get().n;
    if (f === 'caminho-teste-extra.db' && !c.prepare("SELECT 1 FROM novidades_eventos WHERE id = 'e3'").get()) outrosFicaram = false;
    c.close();
  }
  ok(limpos === 15 && sobrou === 0, 'apagar a conta tira a pessoa de todos os ' + limpos + ' backups (conta, progresso, amizades, novidades)');
  ok(outrosFicaram, 'o que é só de outra pessoa continua nos backups');

  B.fecharBanco(arquivo);
} catch (e) {
  ok(false, 'o teste quebrou: ' + e.stack);
} finally {
  try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o alicerce do banco está certo\n');
process.exit(falhas ? 1 : 0);
