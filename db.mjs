// Banco: o SQLite que já vem no Node (node:sqlite), num arquivo só, dados/caminho.db.
//
// Os módulos (Contas, Novidades, Notificacoes) continuam trabalhando com o mesmo objeto
// em memória de antes; o que muda é onde ele mora. A cada salvar(), cada tabela é
// comparada com a última foto gravada e só as linhas que mudaram vão para o disco, tudo
// numa transação: ou entra a mudança inteira, ou nada.
//
// Modo WAL: testado no container, na pasta dados/ montada do Windows, com duas conexões
// gravando alternadas (1.000 linhas, integridade ok, cerca de 5 ms por transação). O modo
// clássico (DELETE) também ficou íntegro, mas seis vezes mais lento.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, rmSync, renameSync, readFileSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';

// O node:sqlite ainda avisa que é experimental a cada subida. O aviso não diz nada a quem
// usa o app e polui o log: só ele é calado, os outros avisos continuam saindo.
const { DatabaseSync } = (() => {
  const original = process.emitWarning;
  process.emitWarning = function (aviso, ...resto) {
    const texto = typeof aviso === 'string' ? aviso : (aviso && aviso.message) || '';
    if (/SQLite/i.test(texto)) return undefined;
    return original.call(process, aviso, ...resto);
  };
  try {
    return createRequire(import.meta.url)('node:sqlite');
  } finally {
    process.emitWarning = original;
  }
})();

// ---------------------------------------------------------------- esquema
// Cada item é uma versão. Nunca editar uma versão que já foi para o ar: acrescentar outra.
const ESQUEMA = [
  // v1: espelho do que vivia nos arquivos JSON
  `
  CREATE TABLE contas (
    usuario TEXT PRIMARY KEY,
    nome TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    nascimento TEXT NOT NULL DEFAULT '',
    fuso TEXT NOT NULL DEFAULT '',
    sal TEXT NOT NULL,
    senha TEXT NOT NULL,
    criada_em TEXT NOT NULL DEFAULT '',
    selo_convite TEXT NOT NULL DEFAULT '',
    extra TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX contas_email ON contas (email);
  CREATE TABLE amizades (
    a TEXT NOT NULL, b TEXT NOT NULL, estado TEXT NOT NULL, pediu TEXT NOT NULL, em TEXT, aceita_em TEXT,
    PRIMARY KEY (a, b)
  );
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
  `,
  // v2: quem aceitou o convite de quem (a Trilha do Semeador sai daqui)
  `
  CREATE TABLE convites_aceites (
    convite TEXT NOT NULL, de TEXT NOT NULL, para TEXT NOT NULL, em TEXT NOT NULL,
    conta_nova INTEGER NOT NULL DEFAULT 0, ativado_em TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (de, para)
  );
  CREATE INDEX convites_aceites_de ON convites_aceites (de);
  `,
  // v3: propósitos em dupla e em grupo, com tipo
  `
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
  `,
  // v4: os dias em que um grupo bateu a meta, anotados quando o dia fecha
  `
  CREATE TABLE proposito_dias (
    proposito TEXT NOT NULL, data TEXT NOT NULL,
    PRIMARY KEY (proposito, data)
  );
  `,
];

function migrarEsquema(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_versao (versao INTEGER NOT NULL)');
  const linha = db.prepare('SELECT versao FROM schema_versao').get();
  let versao = linha ? Number(linha.versao) : 0;
  if (!linha) db.prepare('INSERT INTO schema_versao (versao) VALUES (0)').run();
  while (versao < ESQUEMA.length) {
    transacao(db, () => {
      db.exec(ESQUEMA[versao]);
      db.prepare('UPDATE schema_versao SET versao = ?').run(versao + 1);
    });
    versao++;
  }
}

export const versaoDoEsquema = () => ESQUEMA.length;

// ---------------------------------------------------------------- abrir
// Uma conexão por arquivo no processo inteiro: os módulos e o servidor dividem a mesma.
const abertos = new Map();

export function abrirBanco(arquivo) {
  const caminho = resolve(arquivo);
  if (abertos.has(caminho)) return abertos.get(caminho);
  mkdirSync(dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;');
  migrarEsquema(db);
  abertos.set(caminho, db);
  return db;
}

export function fecharBanco(arquivo) {
  const caminho = resolve(arquivo);
  const db = abertos.get(caminho);
  if (db) { db.close(); abertos.delete(caminho); }
}

// O banco mora ao lado de onde moravam os JSON (a pasta de CAMINHO_ESTADO).
export const arquivoDoBanco = (pasta) => join(pasta, 'caminho.db');

// ---------------------------------------------------------------- transação
const profundidade = new WeakMap();

export function transacao(db, fazer) {
  const nivel = profundidade.get(db) || 0;
  if (nivel > 0) return fazer();
  profundidade.set(db, 1);
  db.exec('BEGIN IMMEDIATE');
  try {
    const resultado = fazer();
    db.exec('COMMIT');
    return resultado;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch { /* a transação já tinha caído */ }
    throw e;
  } finally {
    profundidade.set(db, 0);
  }
}

// ---------------------------------------------------------------- sincronizar tabelas
// Guarda, por banco e tabela, a última foto gravada (chave da linha -> linha em texto).
const fotos = new WeakMap();
const fotoDe = (db, tabela) => {
  if (!fotos.has(db)) fotos.set(db, new Map());
  const mapa = fotos.get(db);
  if (!mapa.has(tabela)) mapa.set(tabela, new Map());
  return mapa.get(tabela);
};

// Texto estável de uma linha: colunas em ordem alfabética e undefined como null, para a
// linha lida do banco e a montada em memória compararem igual quando não mudaram.
const texto = (linha) => JSON.stringify(Object.keys(linha).sort().map((k) => [k, linha[k] === undefined ? null : linha[k]]));
const chaveDe = (linha, chaves) => JSON.stringify(chaves.map((k) => linha[k]));

const nomeSeguro = (n) => { if (!/^[a-z_][a-z0-9_]*$/.test(n)) throw new Error('nome de tabela ou coluna inválido: ' + n); return n; };

// Lê a tabela inteira e deixa a foto pronta: a primeira gravação depois de carregar só
// escreve o que de fato mudou.
export function lerTabela(db, tabela, chaves, ordem = '') {
  const sql = 'SELECT * FROM ' + nomeSeguro(tabela) + (ordem ? ' ORDER BY ' + ordem.split(',').map((c) => nomeSeguro(c.trim())).join(', ') : '');
  const linhas = db.prepare(sql).all().map((l) => ({ ...l }));
  const foto = new Map();
  for (const l of linhas) foto.set(chaveDe(l, chaves), texto(l));
  fotoDe(db, tabela).clear();
  for (const [k, v] of foto) fotoDe(db, tabela).set(k, v);
  return linhas;
}

// Grava várias tabelas de uma vez: [{ tabela, chaves, linhas }]. Devolve quantas linhas
// foram escritas ou apagadas. A foto só é atualizada depois do COMMIT.
export function sincronizar(db, grupos) {
  const novasFotos = [];
  let mudancas = 0;
  transacao(db, () => {
    for (const { tabela, chaves, linhas } of grupos) {
      nomeSeguro(tabela);
      const antes = fotoDe(db, tabela);
      const depois = new Map();
      for (const linha of linhas) {
        const chave = chaveDe(linha, chaves);
        const t = texto(linha);
        depois.set(chave, t);
        if (antes.get(chave) === t) continue;
        const colunas = Object.keys(linha).map(nomeSeguro);
        db.prepare('INSERT OR REPLACE INTO ' + tabela + ' (' + colunas.join(', ') + ') VALUES ('
          + colunas.map(() => '?').join(', ') + ')').run(...colunas.map((c) => (linha[c] === undefined ? null : linha[c])));
        mudancas++;
      }
      for (const [chave] of antes) {
        if (depois.has(chave)) continue;
        const valores = JSON.parse(chave);
        db.prepare('DELETE FROM ' + tabela + ' WHERE ' + chaves.map((c) => nomeSeguro(c) + ' = ?').join(' AND ')).run(...valores);
        mudancas++;
      }
      novasFotos.push([tabela, depois]);
    }
  });
  for (const [tabela, depois] of novasFotos) {
    const foto = fotoDe(db, tabela);
    foto.clear();
    for (const [k, v] of depois) foto.set(k, v);
  }
  return mudancas;
}

// ---------------------------------------------------------------- metadados
export function lerMeta(db, chave) {
  const l = db.prepare('SELECT valor FROM metadados WHERE chave = ?').get(chave);
  return l ? l.valor : null;
}
export function gravarMeta(db, chave, valor) {
  db.prepare('INSERT OR REPLACE INTO metadados (chave, valor) VALUES (?, ?)').run(chave, String(valor));
}

// ---------------------------------------------------------------- progresso
export function lerEstadoDoBanco(db, usuario) {
  const l = db.prepare('SELECT dados FROM estados WHERE usuario = ?').get(usuario);
  return l ? JSON.parse(l.dados) : null;
}
export function gravarEstadoNoBanco(db, usuario, dados) {
  db.prepare('INSERT OR REPLACE INTO estados (usuario, dados, atualizado_em) VALUES (?, ?, ?)')
    .run(usuario, JSON.stringify(dados), new Date().toISOString());
}

// ---------------------------------------------------------------- apagar uma pessoa
// Tudo o que é da pessoa, em qualquer tabela. Denúncias contra ou de alguém ficam para o
// dono do servidor, como antes. Serve para limpar os backups quando a conta é apagada.
export function apagarPessoaDoBanco(db, usuario) {
  // Cada tabela só é limpa se existir: um backup antigo pode ter um esquema anterior, sem as
  // tabelas que vieram depois.
  const existe = (tabela) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tabela);
  const u = usuario;
  const passos = [
    ['contas', 'DELETE FROM contas WHERE usuario = ?', [u]],
    ['amizades', 'DELETE FROM amizades WHERE a = ? OR b = ?', [u, u]],
    ['bloqueios', 'DELETE FROM bloqueios WHERE quem = ? OR alvo = ?', [u, u]],
    ['silenciados', 'DELETE FROM silenciados WHERE quem = ? OR alvo = ?', [u, u]],
    ['toques', 'DELETE FROM toques WHERE de = ? OR para = ?', [u, u]],
    ['convites_aceites', 'DELETE FROM convites_aceites WHERE de = ? OR para = ?', [u, u]],
    ['proposito_membros', 'DELETE FROM proposito_membros WHERE usuario = ?', [u]],
    ['novidades_reacoes', "DELETE FROM novidades_reacoes WHERE usuario = ? OR evento IN (SELECT id FROM novidades_eventos WHERE autor = ? OR json_extract(dados, '$.com') = ? OR EXISTS (SELECT 1 FROM json_each(dados, '$.membros') WHERE value = ?))", [u, u, u, u]],
    ['novidades_eventos', "DELETE FROM novidades_eventos WHERE autor = ? OR json_extract(dados, '$.com') = ? OR EXISTS (SELECT 1 FROM json_each(dados, '$.membros') WHERE value = ?)", [u, u, u]],
    ['novidades_pessoas', 'DELETE FROM novidades_pessoas WHERE usuario = ?', [u]],
    ['push_inscricoes', 'DELETE FROM push_inscricoes WHERE usuario = ?', [u]],
    ['push_preferencias', 'DELETE FROM push_preferencias WHERE usuario = ?', [u]],
    ['push_historico', 'DELETE FROM push_historico WHERE usuario = ?', [u]],
    ['estados', 'DELETE FROM estados WHERE usuario = ?', [u]],
  ];
  transacao(db, () => {
    for (const [tabela, sql, params] of passos) if (existe(tabela)) db.prepare(sql).run(...params);
  });
}

// ---------------------------------------------------------------- backups
// Uma cópia por dia, feita pelo próprio SQLite (VACUUM INTO): consistente mesmo com o
// servidor gravando. Ficam as 14 mais novas.
const PADRAO_BACKUP = /^caminho-\d{4}-\d{2}-\d{2}\.db$/;

export function backupDoDia(db, pasta, dia, manter = 14) {
  const destino = join(pasta, 'caminho-' + dia + '.db');
  if (existsSync(destino)) return null;
  fazerBackup(db, destino);
  const antigos = readdirSync(pasta).filter((f) => PADRAO_BACKUP.test(f)).sort();
  for (const f of antigos.slice(0, Math.max(0, antigos.length - manter))) rmSync(join(pasta, f), { force: true });
  return destino;
}

export function fazerBackup(db, destino) {
  mkdirSync(dirname(destino), { recursive: true });
  db.exec("VACUUM INTO '" + String(destino).replace(/'/g, "''") + "'");
  return destino;
}

// Quem apaga a conta leva junto as cópias: a pessoa sai de cada backup guardado.
export function apagarPessoaDosBackups(pasta, usuario) {
  if (!existsSync(pasta)) return 0;
  let limpos = 0;
  for (const f of readdirSync(pasta).filter((n) => n.endsWith('.db'))) {
    const copia = new DatabaseSync(join(pasta, f));
    try {
      apagarPessoaDoBanco(copia, usuario);
      copia.exec('VACUUM');
      limpos++;
    } finally {
      copia.close();
    }
  }
  return limpos;
}

// ---------------------------------------------------------------- legado em JSON
// Cada módulo, ao abrir, pergunta se o banco já recebeu o seu arquivo antigo. Se não, lê o
// JSON uma vez; o módulo grava no banco e só então chama concluirImportacao, que marca e
// guarda o arquivo em json-legado-AAAA-MM-DD/. Se a gravação falhar, nada é marcado nem
// movido, e a próxima subida tenta de novo. JSON ilegível para tudo, como antes: seguir
// com a lista vazia apagaria as contas de todo mundo.
export function abrirModulo(arquivoJson, nome) {
  const db = abrirBanco(arquivoDoBanco(dirname(arquivoJson)));
  if (lerMeta(db, 'importado:' + nome) !== null) return { db, legado: null, bruto: null };
  if (!existsSync(arquivoJson)) {
    gravarMeta(db, 'importado:' + nome, 'nada');
    return { db, legado: null, bruto: null };
  }
  const bruto = readFileSync(arquivoJson, 'utf8');
  return { db, legado: JSON.parse(bruto), bruto };
}

export function concluirImportacao(db, nome, arquivoJson) {
  gravarMeta(db, 'importado:' + nome, new Date().toISOString());
  guardarLegado(arquivoJson);
}

export function guardarLegado(arquivo) {
  if (!existsSync(arquivo)) return null;
  const pasta = join(dirname(arquivo), 'json-legado-' + new Date().toISOString().slice(0, 10));
  mkdirSync(pasta, { recursive: true });
  let destino = join(pasta, basename(arquivo));
  for (let i = 2; existsSync(destino); i++) destino = join(pasta, basename(arquivo).replace(/\.json$/, '') + '-' + i + '.json');
  renameSync(arquivo, destino);
  return destino;
}

export { DatabaseSync };
