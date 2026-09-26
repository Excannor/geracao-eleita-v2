// Confere o alicerce do banco (db.mjs), sem servidor: esquema com versão, gravação só do
// que mudou, transação que desfaz tudo quando algo falha, backup do dia e a pessoa que
// apaga a conta saindo também dos backups.
// Uso: node ferramentas/teste-db.mjs
import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync } from 'node:fs';
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
const pastaV6 = mkdtempSync(join(tmpdir(), 'cc-db-v6-'));
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
  const guardados = readdirSync(pastaBackup).filter((f) => f.endsWith('.db.cifrado')).sort();
  ok(guardados.length === 14 && guardados.includes('caminho-2026-09-15.db.cifrado') && !guardados.includes('caminho-2026-08-01.db.cifrado'), 'ficam os 14 backups mais novos');
  const bruto = readFileSync(join(pastaBackup, 'caminho-2026-09-15.db.cifrado'));
  ok(!bruto.includes('SQLite format') && !bruto.includes('só minha') && !readdirSync(pastaBackup).some((f) => f.endsWith('.db') || f.endsWith('.tmp')),
    'o backup fica cifrado: nem o SQLite nem o texto de ninguém aparecem no arquivo, e não sobra cópia aberta');
  const aberto = (f) => B.abrirBackup(join(pastaBackup, f), join(pasta, 'aberto-' + f + '.db'));
  const copia = new B.DatabaseSync(aberto('caminho-2026-09-15.db.cifrado'));
  ok(copia.prepare("SELECT usuario FROM contas").all().length === 1 && copia.prepare("SELECT 1 FROM estados WHERE usuario = 'ana'").get(), 'o backup abre sozinho e tem os dados');
  copia.close();

  // ---------- apagar a pessoa dos backups ----------
  B.sincronizar(db, [{ tabela: 'novidades_eventos', chaves: ['id'], linhas: [
    { id: 'e1', autor: 'ana', tipo: 'ofensiva', dados: '{}', chave: 'k1', em: 1 },
    { id: 'e2', autor: 'carla', tipo: 'novoProposito', dados: '{"com":"ana"}', chave: 'k2', em: 2 },
    { id: 'e3', autor: 'carla', tipo: 'ofensiva', dados: '{}', chave: 'k3', em: 3 },
  ] }]);
  B.fazerBackup(db, join(pastaBackup, 'caminho-teste-extra.db.cifrado'));
  const limpos = B.apagarPessoaDosBackups(pastaBackup, 'ana');
  let sobrou = 0;
  let outrosFicaram = true;
  for (const f of readdirSync(pastaBackup).filter((n) => n.endsWith('.db.cifrado'))) {
    const c = new B.DatabaseSync(aberto(f));
    sobrou += c.prepare("SELECT count(*) n FROM contas WHERE usuario = 'ana'").get().n
      + c.prepare("SELECT count(*) n FROM estados WHERE usuario = 'ana'").get().n
      + c.prepare("SELECT count(*) n FROM amizades WHERE a = 'ana' OR b = 'ana'").get().n
      + c.prepare("SELECT count(*) n FROM novidades_eventos WHERE autor = 'ana' OR json_extract(dados, '$.com') = 'ana'").get().n;
    if (f === 'caminho-teste-extra.db.cifrado' && !c.prepare("SELECT 1 FROM novidades_eventos WHERE id = 'e3'").get()) outrosFicaram = false;
    c.close();
  }
  ok(limpos === 15 && sobrou === 0, 'apagar a conta tira a pessoa de todos os ' + limpos + ' backups (conta, progresso, amizades, novidades)');
  ok(outrosFicaram, 'o que é só de outra pessoa continua nos backups');
  const outraChave = Buffer.alloc(32, 7);
  let recusou = false;
  try { B.abrirBackup(join(pastaBackup, 'caminho-2026-09-15.db.cifrado'), join(pasta, 'x.db'), outraChave); } catch { recusou = true; }
  ok(recusou, 'com outra chave o backup não abre');
  B.fazerBackup(db, join(pastaBackup, 'caminho-2026-07-01.db.cifrado'));
  B.abrirBackup(join(pastaBackup, 'caminho-2026-07-01.db.cifrado'), join(pastaBackup, 'caminho-2026-07-01.db'));
  ok(B.cifrarBackupsAbertos(pastaBackup) >= 1 && !readdirSync(pastaBackup).some((f) => f.endsWith('.db')),
    'backup antigo guardado aberto vira cifrado, e o aberto some');

  B.fecharBanco(arquivo);

  // ---------- migração v7 num banco v6 existente ----------
  // Monta à mão um banco no esquema v6 (o texto exato das versões 1 a 6 de ESQUEMA em
  // db.mjs), com uma célula de verdade dentro, e confere que reabrir com o código atual
  // migra até v7 sem perder nada do que já existia.
  console.log('\n  Banco: migração v6 -> v7\n');
  const arquivoV6 = B.arquivoDoBanco(pastaV6);
  const brutoV6 = new B.DatabaseSync(arquivoV6);
  brutoV6.exec(`
    CREATE TABLE contas (
      usuario TEXT PRIMARY KEY, nome TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
      nascimento TEXT NOT NULL DEFAULT '', fuso TEXT NOT NULL DEFAULT '', sal TEXT NOT NULL, senha TEXT NOT NULL,
      criada_em TEXT NOT NULL DEFAULT '', selo_convite TEXT NOT NULL DEFAULT '', extra TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX contas_email ON contas (email);
    CREATE TABLE amizades (a TEXT NOT NULL, b TEXT NOT NULL, estado TEXT NOT NULL, pediu TEXT NOT NULL, em TEXT, aceita_em TEXT, PRIMARY KEY (a, b));
    CREATE TABLE bloqueios (quem TEXT NOT NULL, alvo TEXT NOT NULL, ordem INTEGER NOT NULL, PRIMARY KEY (quem, alvo));
    CREATE TABLE silenciados (quem TEXT NOT NULL, alvo TEXT NOT NULL, ordem INTEGER NOT NULL, PRIMARY KEY (quem, alvo));
    CREATE TABLE convites_usados (nonce TEXT PRIMARY KEY, vence INTEGER NOT NULL);
    CREATE TABLE toques (de TEXT NOT NULL, para TEXT NOT NULL, dia TEXT NOT NULL, PRIMARY KEY (de, para));
    CREATE TABLE denuncias (ordem INTEGER PRIMARY KEY, de TEXT NOT NULL, contra TEXT NOT NULL, motivo TEXT NOT NULL, em TEXT NOT NULL);
    CREATE TABLE novidades_eventos (id TEXT PRIMARY KEY, autor TEXT NOT NULL, tipo TEXT NOT NULL, dados TEXT NOT NULL, chave TEXT, em INTEGER NOT NULL);
    CREATE INDEX novidades_eventos_autor ON novidades_eventos (autor);
    CREATE TABLE novidades_reacoes (evento TEXT NOT NULL, usuario TEXT NOT NULL, ordem INTEGER NOT NULL, PRIMARY KEY (evento, usuario));
    CREATE TABLE novidades_pessoas (usuario TEXT PRIMARY KEY, ligado INTEGER NOT NULL, perguntado INTEGER NOT NULL);
    CREATE TABLE push_inscricoes (endpoint TEXT PRIMARY KEY, usuario TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, criada_em TEXT NOT NULL, ordem INTEGER NOT NULL);
    CREATE INDEX push_inscricoes_usuario ON push_inscricoes (usuario);
    CREATE TABLE push_preferencias (usuario TEXT PRIMARY KEY, dados TEXT NOT NULL);
    CREATE TABLE push_historico (usuario TEXT PRIMARY KEY, dados TEXT NOT NULL);
    CREATE TABLE estados (usuario TEXT PRIMARY KEY, dados TEXT NOT NULL, atualizado_em TEXT NOT NULL);
    CREATE TABLE metadados (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);

    CREATE TABLE convites_aceites (
      convite TEXT NOT NULL, de TEXT NOT NULL, para TEXT NOT NULL, em TEXT NOT NULL,
      conta_nova INTEGER NOT NULL DEFAULT 0, ativado_em TEXT NOT NULL DEFAULT '', PRIMARY KEY (de, para)
    );
    CREATE INDEX convites_aceites_de ON convites_aceites (de);

    CREATE TABLE propositos (
      id TEXT PRIMARY KEY, tipo TEXT NOT NULL, alvo TEXT NOT NULL DEFAULT '', titulo TEXT NOT NULL DEFAULT '',
      criado_por TEXT NOT NULL, criado_em TEXT NOT NULL, encerrado_em TEXT NOT NULL DEFAULT '', grupo INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE proposito_membros (
      proposito TEXT NOT NULL, usuario TEXT NOT NULL, estado TEXT NOT NULL,
      entrou_em TEXT NOT NULL DEFAULT '', saiu_em TEXT NOT NULL DEFAULT '', convidado_por TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (proposito, usuario)
    );
    CREATE INDEX proposito_membros_usuario ON proposito_membros (usuario);

    CREATE TABLE proposito_dias (proposito TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (proposito, data));

    ALTER TABLE propositos ADD COLUMN celula INTEGER NOT NULL DEFAULT 0;

    ALTER TABLE propositos ADD COLUMN encontro INTEGER NOT NULL DEFAULT -1;
    ALTER TABLE propositos ADD COLUMN recado TEXT NOT NULL DEFAULT '';
    ALTER TABLE propositos ADD COLUMN recado_em TEXT NOT NULL DEFAULT '';
    ALTER TABLE propositos ADD COLUMN estudo_tipo TEXT NOT NULL DEFAULT '';
    ALTER TABLE propositos ADD COLUMN estudo_ref TEXT NOT NULL DEFAULT '';
    ALTER TABLE propositos ADD COLUMN estudo_texto TEXT NOT NULL DEFAULT '';
    ALTER TABLE propositos ADD COLUMN estudo_em TEXT NOT NULL DEFAULT '';

    CREATE TABLE schema_versao (versao INTEGER NOT NULL);
    INSERT INTO schema_versao (versao) VALUES (6);

    INSERT INTO propositos (id, tipo, alvo, titulo, criado_por, criado_em, encerrado_em, grupo, celula, encontro, recado, recado_em, estudo_tipo, estudo_ref, estudo_texto, estudo_em)
      VALUES ('p1', 'plano', '', 'Célula de quinta', 'lider', '2026-01-01', '', 1, 1, 4, 'Tragam a Bíblia', '2026-01-01T00:00:00Z', '', '', '', '');
    INSERT INTO proposito_membros (proposito, usuario, estado, entrou_em, saiu_em, convidado_por)
      VALUES ('p1', 'lider', 'ativo', '2026-01-01', '', '');
  `);
  ok(Number(brutoV6.prepare('SELECT versao FROM schema_versao').get().versao) === 6, 'o banco de ensaio nasce na versão 6, como um HML de antes da Fase 2');
  brutoV6.close();

  const dbV7 = B.abrirBanco(arquivoV6);
  ok(Number(dbV7.prepare('SELECT versao FROM schema_versao').get().versao) === B.versaoDoEsquema(), 'reabrir um banco v6 migra sozinho até a versão atual');
  ok(dbV7.prepare("SELECT papel FROM proposito_membros WHERE proposito = 'p1' AND usuario = 'lider'").get().papel === '',
    'proposito_membros ganha a coluna papel, vazia para quem já estava lá');
  const p1 = dbV7.prepare("SELECT * FROM propositos WHERE id = 'p1'").get();
  ok(p1.titulo === 'Célula de quinta' && p1.encontro === 4 && p1.recado === 'Tragam a Bíblia'
    && p1.estudo_acolhida === '' && p1.estudo_adoracao === '' && p1.estudo_testemunho === '',
    'os propósitos existentes ganham os três campos do roteiro 4 Ws vazios, sem perder o que já tinham');
  const tabelasV7 = dbV7.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name);
  ok(tabelasV7.includes('celula_encontros') && tabelasV7.includes('celula_presencas'), 'as tabelas de encontro e presença nascem na migração');
  dbV7.prepare("INSERT INTO celula_encontros (proposito, data, visitantes, registrado_por, em) VALUES ('p1', '2026-01-08', 2, 'lider', '2026-01-08T20:00:00Z')").run();
  dbV7.prepare("INSERT INTO celula_presencas (proposito, data, usuario) VALUES ('p1', '2026-01-08', 'lider')").run();
  ok(dbV7.prepare("SELECT count(*) n FROM celula_presencas WHERE proposito = 'p1'").get().n === 1, 'as tabelas novas aceitam linhas de verdade');
  B.fecharBanco(arquivoV6);
} catch (e) {
  ok(false, 'o teste quebrou: ' + e.stack);
} finally {
  try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
  try { rmSync(pastaV6, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o alicerce do banco está certo\n');
process.exit(falhas ? 1 : 0);
