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
import { existsSync, mkdirSync, readdirSync, rmSync, renameSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
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
  // v5: a célula é um grupo que cresce por link e aceita mais gente que o grupo de amigos
  `
  ALTER TABLE propositos ADD COLUMN celula INTEGER NOT NULL DEFAULT 0;
  `,
  // v6: a célula ganha o dia do encontro (0 domingo a 6 sábado, -1 sem dia), o recado do líder
  // e o estudo do encontro que o líder escolhe: a leitura da semana, um trecho ou um texto dele
  `
  ALTER TABLE propositos ADD COLUMN encontro INTEGER NOT NULL DEFAULT -1;
  ALTER TABLE propositos ADD COLUMN recado TEXT NOT NULL DEFAULT '';
  ALTER TABLE propositos ADD COLUMN recado_em TEXT NOT NULL DEFAULT '';
  ALTER TABLE propositos ADD COLUMN estudo_tipo TEXT NOT NULL DEFAULT '';
  ALTER TABLE propositos ADD COLUMN estudo_ref TEXT NOT NULL DEFAULT '';
  ALTER TABLE propositos ADD COLUMN estudo_texto TEXT NOT NULL DEFAULT '';
  ALTER TABLE propositos ADD COLUMN estudo_em TEXT NOT NULL DEFAULT '';
  `,
  // v7: papéis dentro da célula (auxiliar conduz junto, visitante só está conhecendo), o
  // roteiro 4 Ws (acolhida, adoração e testemunho, além da Palavra que já existia) e o
  // registro de quem foi a cada encontro
  `
  ALTER TABLE proposito_membros ADD COLUMN papel TEXT NOT NULL DEFAULT '';
  ALTER TABLE propositos ADD COLUMN estudo_acolhida TEXT NOT NULL DEFAULT '';
  ALTER TABLE propositos ADD COLUMN estudo_adoracao TEXT NOT NULL DEFAULT '';
  ALTER TABLE propositos ADD COLUMN estudo_testemunho TEXT NOT NULL DEFAULT '';
  CREATE TABLE celula_encontros (proposito TEXT NOT NULL, data TEXT NOT NULL, visitantes INTEGER NOT NULL DEFAULT 0,
    registrado_por TEXT NOT NULL, em TEXT NOT NULL, PRIMARY KEY (proposito, data));
  CREATE TABLE celula_presencas (proposito TEXT NOT NULL, data TEXT NOT NULL, usuario TEXT NOT NULL,
    PRIMARY KEY (proposito, data, usuario));
  `,
  // v8: discipulado 1 a 1 (Mateus 28.19-20; 2 Timóteo 2.2). Quem acompanha, quem é acompanhado,
  // o que o discípulo decide mostrar e os encontros semanais dos dois. Os marcos pessoais
  // ("Minha caminhada") não ganham tabela: moram no extra da conta, como qualquer campo solto.
  `
  CREATE TABLE discipulados (
    id TEXT PRIMARY KEY, discipulador TEXT NOT NULL, discipulo TEXT NOT NULL,
    estado TEXT NOT NULL,
    pediu TEXT NOT NULL,
    criado_em TEXT NOT NULL, aceito_em TEXT NOT NULL DEFAULT '', encerrado_em TEXT NOT NULL DEFAULT '',
    mostrar TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX discipulados_discipulador ON discipulados (discipulador);
  CREATE INDEX discipulados_discipulo ON discipulados (discipulo);
  CREATE TABLE discipulado_encontros (discipulado TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (discipulado, data));
  `,
  // v9: cuidado mútuo (Atos 2.42; 2.44-45). O pedido é só do autor, sem chat: os outros
  // respondem com um gesto sem texto ("orei" ou "ajudo"). Denúncia é anônima para o autor;
  // as regras (limites, quem vê, o que esconde) moram em cuidado.mjs.
  `
  CREATE TABLE pedidos (
    id TEXT PRIMARY KEY, celula TEXT NOT NULL, autor TEXT NOT NULL,
    tipo TEXT NOT NULL,                 -- 'oracao' | 'necessidade'
    destino TEXT NOT NULL,              -- 'celula' | 'conduz' (líder e auxiliar); necessidade é sempre 'celula'
    texto TEXT NOT NULL,                -- até 280 caracteres (oração) ou 200 (necessidade)
    criado_em TEXT NOT NULL, vence_em TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ativo', -- 'ativo' | 'respondido' | 'removido'
    removido_por TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX pedidos_celula ON pedidos (celula);
  CREATE TABLE pedido_gestos (pedido TEXT NOT NULL, usuario TEXT NOT NULL, gesto TEXT NOT NULL, data TEXT NOT NULL,
    PRIMARY KEY (pedido, usuario, gesto, data));
  CREATE TABLE pedido_denuncias (pedido TEXT NOT NULL, usuario TEXT NOT NULL, motivo TEXT NOT NULL, em TEXT NOT NULL,
    PRIMARY KEY (pedido, usuario));
  `,
  // v10: multiplicação de célula (Atos 2.47; 2 Timóteo 2.2). A célula filha guarda de onde
  // veio ("mae", o id da célula de origem) e quando nasceu; a célula mãe não ganha coluna
  // nova, porque quem é mãe de quem se descobre olhando as filhas. E o painel pastoral
  // (Fase 5, seção 2) precisa saber quando um visitante virou membro, para contar "quantos
  // visitantes com conta passaram a membro" nas últimas 4 semanas.
  `
  ALTER TABLE propositos ADD COLUMN mae TEXT NOT NULL DEFAULT '';
  ALTER TABLE propositos ADD COLUMN multiplicada_em TEXT NOT NULL DEFAULT '';
  ALTER TABLE proposito_membros ADD COLUMN tornou_membro_em TEXT NOT NULL DEFAULT '';
  `,
  // v11: a caixa de avisos (o sino do Início). Cada notificação que o app manda (lembrete,
  // toque, pedido, convite...) fica guardada para a pessoa ver depois, mesmo sem aparelho
  // inscrito ou com o aviso social desligado. Só as mais recentes de cada um (ver
  // notificacoes.mjs, CAIXA_MAX).
  `
  CREATE TABLE push_caixa (id TEXT PRIMARY KEY, usuario TEXT NOT NULL, em INTEGER NOT NULL, tipo TEXT NOT NULL,
    titulo TEXT NOT NULL, corpo TEXT NOT NULL, url TEXT NOT NULL, lido INTEGER NOT NULL DEFAULT 0);
  CREATE INDEX push_caixa_usuario ON push_caixa (usuario, em);
  `,
  // v12: a semana sem encontro (feriado, imprevisto): o líder registra que não houve
  // encontro e ninguém conta como falta. E o check-in do discípulo (Corpo, Mente, Espírito,
  // de 1 a 3), um por pessoa por dia, guardado por 180 dias para o histórico; o discipulador
  // vê só o último.
  `
  ALTER TABLE celula_encontros ADD COLUMN sem_encontro INTEGER NOT NULL DEFAULT 0;
  CREATE TABLE checkins (usuario TEXT NOT NULL, data TEXT NOT NULL, corpo INTEGER NOT NULL, mente INTEGER NOT NULL,
    espirito INTEGER NOT NULL, em TEXT NOT NULL, PRIMARY KEY (usuario, data));
  `,
  // v13: desafio de consagração em grupo (desafios-grupo.mjs). "grupo" é o id da célula ou da
  // relação de discipulado; no máximo um desafio aberto por grupo. O progresso de cada um não
  // fica aqui: sai dos dias que a pessoa marca no próprio desafio.
  `
  CREATE TABLE desafios_grupo (id TEXT PRIMARY KEY, tipo TEXT NOT NULL, grupo TEXT NOT NULL, desafio TEXT NOT NULL,
    inicio TEXT NOT NULL, criado_por TEXT NOT NULL, em TEXT NOT NULL, encerrado_em TEXT NOT NULL DEFAULT '');
  CREATE INDEX desafios_grupo_grupo ON desafios_grupo (tipo, grupo);
  `,
  // v14: inteligência (métricas do líder de célula e do administrador; ver docs/inteligencia.md).
  // O progresso de cada pessoa é um JSON na tabela estados, e as datas em que ela leu ficam
  // dentro dele: contar "quem leu hoje" ou a chama de uma célula inteira exigiria abrir o JSON
  // de todo mundo a cada pedido. leitura_dias é a cópia achatada só dessas datas (uma linha por
  // pessoa e dia feito: lição do plano, Primeiro passo ou dia do Conhecer Jesus), regravada para
  // a pessoa a cada sincronização do progresso dela. Nenhum texto, nenhuma nota: só a data.
  // Os índices por data servem às janelas de tempo (últimos 14, 30 dias) das consultas do
  // painel; as views são as consultas prontas que o servidor usa (o equivalente das views do
  // Postgres, se um dia o banco mudar). WITHOUT ROWID: a chave primária (usuario, data) é a
  // própria árvore da tabela, sem a tabela de rowid nem o autoindex por trás (eram três árvores
  // para guardar só datas, uns 42 MB em 600 mil linhas; com duas, uns 26 MB), e o índice por data
  // leva a chave junto, então as consultas por janela de tempo não precisam voltar à tabela.
  `
  CREATE TABLE leitura_dias (usuario TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (usuario, data)) WITHOUT ROWID;
  CREATE INDEX leitura_dias_data ON leitura_dias (data);
  CREATE INDEX checkins_data ON checkins (data);
  CREATE VIEW leituras_por_dia AS
    SELECT data, COUNT(*) AS pessoas FROM leitura_dias GROUP BY data;
  CREATE VIEW celula_frequencia AS
    SELECT e.proposito, e.data, e.sem_encontro, e.visitantes,
      (SELECT COUNT(*) FROM celula_presencas p WHERE p.proposito = e.proposito AND p.data = e.data) AS presentes
    FROM celula_encontros e;
  `,
  // v15: o recado da célula pode levar o dia e a hora do encontro ("2026-10-08T20:00", hora
  // local, sem fuso): é o que deixa o membro pôr o encontro na agenda do celular.
  `
  ALTER TABLE propositos ADD COLUMN recado_quando TEXT NOT NULL DEFAULT '';
  `,
  // v16: quem tem menos de 18 anos só lidera ou auxilia uma célula depois que a liderança (o
  // administrador) aprova. Uma linha por pessoa, célula e papel ('lider' ou 'auxiliar'): o
  // pedido, o estado ('pendente', 'aprovada', 'recusada') e quem decidiu, e quando.
  `
  CREATE TABLE liderancas (proposito TEXT NOT NULL, usuario TEXT NOT NULL, papel TEXT NOT NULL, estado TEXT NOT NULL,
    pedido_em TEXT NOT NULL, decidido_por TEXT NOT NULL DEFAULT '', decidido_em TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (proposito, usuario, papel));
  CREATE INDEX liderancas_estado ON liderancas (estado);
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
    // a dupla (grupo = 0) é relação de duas pontas só: sai inteira, com os dias batidos; o grupo
    // e a célula ficam, só a pessoa sai deles (a mesma regra de Contas.apagar)
    ['proposito_dias', 'DELETE FROM proposito_dias WHERE proposito IN (SELECT p.id FROM propositos p JOIN proposito_membros m ON m.proposito = p.id WHERE p.grupo = 0 AND m.usuario = ?)', [u]],
    ['propositos', 'DELETE FROM propositos WHERE grupo = 0 AND id IN (SELECT proposito FROM proposito_membros WHERE usuario = ?)', [u]],
    ['proposito_membros', 'DELETE FROM proposito_membros WHERE usuario = ?', [u]],
    // o pedido de aprovação para liderar (v16) é da pessoa; quem decidiu fica no dela
    ['liderancas', 'DELETE FROM liderancas WHERE usuario = ?', [u]],
    // o histórico do encontro fica (quem registrou, quantas pessoas), só a presença da pessoa some
    ['celula_presencas', 'DELETE FROM celula_presencas WHERE usuario = ?', [u]],
    // discipulado dos dois lados, e os encontros dele, saem inteiros: não é um grupo que
    // sobrevive sem a pessoa, é uma relação de duas pontas só
    ['discipulado_encontros', "DELETE FROM discipulado_encontros WHERE discipulado IN (SELECT id FROM discipulados WHERE discipulador = ? OR discipulo = ?)", [u, u]],
    ['discipulados', 'DELETE FROM discipulados WHERE discipulador = ? OR discipulo = ?', [u, u]],
    // cuidado mútuo: os pedidos da pessoa somem inteiros; o gesto ou a denúncia que ela deixou
    // no pedido de outra pessoa também some, mas o pedido em si continua de pé
    ['pedido_gestos', "DELETE FROM pedido_gestos WHERE usuario = ? OR pedido IN (SELECT id FROM pedidos WHERE autor = ?)", [u, u]],
    ['pedido_denuncias', "DELETE FROM pedido_denuncias WHERE usuario = ? OR pedido IN (SELECT id FROM pedidos WHERE autor = ?)", [u, u]],
    ['pedidos', 'DELETE FROM pedidos WHERE autor = ?', [u]],
    ['novidades_reacoes', "DELETE FROM novidades_reacoes WHERE usuario = ? OR evento IN (SELECT id FROM novidades_eventos WHERE autor = ? OR json_extract(dados, '$.com') = ? OR EXISTS (SELECT 1 FROM json_each(dados, '$.membros') WHERE value = ?))", [u, u, u, u]],
    ['novidades_eventos', "DELETE FROM novidades_eventos WHERE autor = ? OR json_extract(dados, '$.com') = ? OR EXISTS (SELECT 1 FROM json_each(dados, '$.membros') WHERE value = ?)", [u, u, u]],
    ['novidades_pessoas', 'DELETE FROM novidades_pessoas WHERE usuario = ?', [u]],
    ['push_inscricoes', 'DELETE FROM push_inscricoes WHERE usuario = ?', [u]],
    ['push_preferencias', 'DELETE FROM push_preferencias WHERE usuario = ?', [u]],
    ['push_historico', 'DELETE FROM push_historico WHERE usuario = ?', [u]],
    // a caixa do sino (v11) e o desafio de grupo que a pessoa abriu (v13) são dela, como no
    // apagar da conta ao vivo (Contas.apagar e Notificacoes.apagarDe)
    ['push_caixa', 'DELETE FROM push_caixa WHERE usuario = ?', [u]],
    ['desafios_grupo', 'DELETE FROM desafios_grupo WHERE criado_por = ?', [u]],
    ['estados', 'DELETE FROM estados WHERE usuario = ?', [u]],
    // o check-in diário e a cópia achatada das datas de leitura (v14) são só da pessoa
    ['checkins', 'DELETE FROM checkins WHERE usuario = ?', [u]],
    ['leitura_dias', 'DELETE FROM leitura_dias WHERE usuario = ?', [u]],
  ];
  transacao(db, () => {
    for (const [tabela, sql, params] of passos) if (existe(tabela)) db.prepare(sql).run(...params);
  });
}

// ---------------------------------------------------------------- backups
// Uma cópia por dia, feita pelo próprio SQLite (VACUUM INTO): consistente mesmo com o
// servidor gravando. Ficam as 14 mais novas.
//
// A cópia é guardada cifrada (AES-256-GCM, arquivo .db.cifrado): quem levar a pasta de
// backups não lê e-mail, data de nascimento nem progresso de ninguém sem a chave. A chave vem
// de CAMINHO_BACKUP_CHAVE (64 caracteres hexadecimais, no .env, fora da pasta de dados); sem
// ela, de dados/backup.chave, criada na primeira vez. Para abrir um backup:
//   node ferramentas/backup.mjs abrir dados/backup/caminho-AAAA-MM-DD.db.cifrado saida.db
const PADRAO_BACKUP = /^caminho-\d{4}-\d{2}-\d{2}\.db\.cifrado$/;
const PADRAO_BACKUP_ABERTO = /^caminho-.+\.db$/;
const CABECA_CIFRADO = Buffer.from('GEBACKUP1');

export function chaveDeBackup(pastaDados) {
  const doAmbiente = String(process.env.CAMINHO_BACKUP_CHAVE || '').trim();
  if (/^[0-9a-f]{64}$/i.test(doAmbiente)) return Buffer.from(doAmbiente, 'hex');
  const arquivo = join(pastaDados, 'backup.chave');
  if (existsSync(arquivo)) return Buffer.from(readFileSync(arquivo, 'utf8').trim(), 'hex');
  const nova = randomBytes(32);
  mkdirSync(pastaDados, { recursive: true });
  writeFileSync(arquivo, nova.toString('hex'), { mode: 0o600 });
  return nova;
}
const chavePadrao = (pastaBackup) => chaveDeBackup(dirname(resolve(pastaBackup)));

export function cifrar(conteudo, chave) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chave, iv);
  const corpo = Buffer.concat([c.update(conteudo), c.final()]);
  return Buffer.concat([CABECA_CIFRADO, iv, c.getAuthTag(), corpo]);
}

export function decifrar(conteudo, chave) {
  if (!conteudo.subarray(0, CABECA_CIFRADO.length).equals(CABECA_CIFRADO)) throw new Error('não é um backup cifrado');
  const ini = CABECA_CIFRADO.length;
  const d = createDecipheriv('aes-256-gcm', chave, conteudo.subarray(ini, ini + 12));
  d.setAuthTag(conteudo.subarray(ini + 12, ini + 28));
  return Buffer.concat([d.update(conteudo.subarray(ini + 28)), d.final()]);
}

// Abre um backup cifrado num arquivo comum (para restaurar ou conferir).
export function abrirBackup(arquivo, destino, chave = chavePadrao(dirname(arquivo))) {
  writeFileSync(destino, decifrar(readFileSync(arquivo), chave));
  return destino;
}

const temporario = (perto) => perto + '.' + randomBytes(4).toString('hex') + '.tmp';
function cifrarArquivo(aberto, destino, chave) {
  writeFileSync(destino + '.novo', cifrar(readFileSync(aberto), chave));
  renameSync(destino + '.novo', destino);
}

// Backups da época em que eram guardados abertos viram cifrados, e o aberto some.
export function cifrarBackupsAbertos(pasta, chave = chavePadrao(pasta)) {
  if (!existsSync(pasta)) return 0;
  let n = 0;
  for (const f of readdirSync(pasta).filter((x) => PADRAO_BACKUP_ABERTO.test(x))) {
    cifrarArquivo(join(pasta, f), join(pasta, f + '.cifrado'), chave);
    rmSync(join(pasta, f), { force: true });
    n++;
  }
  return n;
}

export function backupDoDia(db, pasta, dia, manter = 14, chave = chavePadrao(pasta)) {
  const destino = join(pasta, 'caminho-' + dia + '.db.cifrado');
  if (existsSync(destino)) return null;
  fazerBackup(db, destino, chave);
  const antigos = readdirSync(pasta).filter((f) => PADRAO_BACKUP.test(f)).sort();
  for (const f of antigos.slice(0, Math.max(0, antigos.length - manter))) rmSync(join(pasta, f), { force: true });
  return destino;
}

// Cópia aberta e consistente do banco, para as ferramentas (exportar para JSON).
export function copiarBanco(db, destino) {
  mkdirSync(dirname(destino), { recursive: true });
  db.exec("VACUUM INTO '" + String(destino).replace(/'/g, "''") + "'");
  return destino;
}

// A cópia aberta só existe por um instante, ao lado do destino, e some mesmo se der erro.
export function fazerBackup(db, destino, chave = chavePadrao(dirname(destino))) {
  mkdirSync(dirname(destino), { recursive: true });
  const aberto = temporario(destino);
  try {
    copiarBanco(db, aberto);
    cifrarArquivo(aberto, destino, chave);
  } finally {
    rmSync(aberto, { force: true });
  }
  return destino;
}

// Quem apaga a conta leva junto as cópias: a pessoa sai de cada backup guardado.
// Cifrado: abre num temporário, tira a pessoa e cifra de novo por cima.
export function apagarPessoaDosBackups(pasta, usuario, chave = chavePadrao(pasta)) {
  if (!existsSync(pasta)) return 0;
  let limpos = 0;
  const limpar = (arquivo) => {
    const copia = new DatabaseSync(arquivo);
    try {
      apagarPessoaDoBanco(copia, usuario);
      copia.exec('VACUUM');
    } finally {
      copia.close();
    }
  };
  for (const f of readdirSync(pasta)) {
    const arquivo = join(pasta, f);
    if (f.endsWith('.db')) { limpar(arquivo); limpos++; continue; }
    if (!f.endsWith('.db.cifrado')) continue;
    const aberto = temporario(arquivo);
    try {
      abrirBackup(arquivo, aberto, chave);
      limpar(aberto);
      cifrarArquivo(aberto, arquivo, chave);
      limpos++;
    } finally {
      rmSync(aberto, { force: true });
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
