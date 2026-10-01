// Semeia, por cima de semear.mjs, o que as telas da inteligência precisam para aparecer cheias
// nas capturas: mais gente na Célula Esperança (com chama acesa, apagada e uma ofensiva longa
// perdida), duas células a mais para o ranking, marcos de Minha caminhada, check-ins e quatro
// semanas de encontros registrados. Não toca em nada fora do servidor de teste.
//
// Em duas etapas, porque o servidor recusa pela API leitura com mais de 7 dias de atraso e só
// relê as tabelas da célula na subida:
//   1. com o servidor de pé:     BASE=http://localhost:8350/ SAIDA=<pasta dos cookies> node design/ferramentas/semear-inteligencia.mjs api
//   2. com o servidor PARADO:    SAIDA=<pasta> DADOS=<pasta de dados do servidor> node design/ferramentas/semear-inteligencia.mjs banco
//   e depois suba o servidor de novo (com CAMINHO_ADMIN=marcos para o painel da igreja).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ETAPA = process.argv[2] || 'api';
const B = (process.env.BASE || 'http://localhost:8350/').replace(/\/?$/, '/');
const SAIDA = process.env.SAIDA || '.';
const hojeIso = () => new Date().toISOString().slice(0, 10); // as contas semeadas ficam em UTC
const HOJE = process.env.HOJE || hojeIso();
const somar = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dias = (desde, n) => Array.from({ length: n }, (_, i) => somar(desde, i));
const ANOTACOES = join(SAIDA, 'inteligencia.json');

// ---------- quem entra ----------
// [conta, nome, célula, visitante, caminho]
const NOVAS = [
  ['bia', 'Bia', 'esperanca'], ['caio', 'Caio', 'esperanca'], ['dora', 'Dora', 'esperanca'], ['eva', 'Eva', 'esperanca'],
  ['joao', 'João', 'esperanca', false, 'conhecer'], ['lucas', 'Lucas', 'esperanca', true],
  ['noemi', 'Noemi', 'vida'], ['pedro', 'Pedro', 'vida'], ['tiago', 'Tiago', 'vida'],
  ['sara', 'Sara', 'nova'], ['miriam', 'Miriam', 'nova'],
];
// O progresso de cada um: as datas em que leu (direto no banco, etapa 2).
const LEITURAS = {
  marcos: dias(somar(HOJE, -40), 41), // 41 dias seguidos até hoje
  ana: dias(somar(HOJE, -41), 42),
  davi: dias(somar(HOJE, -39), 40),
  rute: dias(somar(HOJE, -29), 29), // até ontem
  bia: dias(somar(HOJE, -43), 40), // 40 dias e parou há 4: a ofensiva perdida
  caio: dias(somar(HOJE, -11), 12),
  dora: dias(somar(HOJE, -20), 12), // parou há 9 dias
  eva: dias(somar(HOJE, -14), 10).concat([somar(HOJE, -3), somar(HOJE, -1)]),
  joao: [HOJE],
  lucas: [somar(HOJE, -1), HOJE],
  noemi: dias(somar(HOJE, -8), 9),
  pedro: dias(somar(HOJE, -30), 25), // parou há 6 dias
  tiago: [somar(HOJE, -1), HOJE],
  sara: dias(somar(HOJE, -5), 6),
  miriam: [],
  lia: [somar(HOJE, -2), somar(HOJE, -1), HOJE],
};
// Marcos de Minha caminhada (etapa 1, pela API).
const MARCOS = {
  ana: { decisao: somar(HOJE, -10) },
  bia: { decisao: '2020-03-15', batismo: '2021-06-20' },
  caio: { decisao: somar(HOJE, -20) },
  eva: { decisao: '2018-09-02', batismo: '2019-04-14' },
  marcos: { decisao: '2015-05-10', batismo: '2016-03-06' },
  rute: { decisao: '2019-08-18', batismo: '2020-01-26', discipula: somar(HOJE, -3) },
  noemi: { batismo: somar(HOJE, -2) },
  tiago: { decisao: somar(HOJE, -1) },
  davi: { decisao: somar(HOJE, -15) },
};
// Check-ins de hoje (etapa 1): corpo, mente, espírito de 1 a 3.
const CHECKINS = { marcos: [3, 2, 3], ana: [2, 1, 2], bia: [1, 1, 2], caio: [3, 3, 3], dora: [2, 1, 1], eva: [2, 2, 3], davi: [3, 2, 2], rute: [2, 1, 3], noemi: [3, 3, 2] };

const cookies = {};
for (const [u] of [['marcos'], ['ana'], ['davi'], ['rute'], ['lia']]) {
  const arquivo = join(SAIDA, 'cookie-' + u + '.txt');
  if (existsSync(arquivo)) cookies[u] = readFileSync(arquivo, 'utf8').trim();
}
async function api(quem, rota, corpo, metodo) {
  const r = await fetch(B + rota, {
    method: metodo || (corpo ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', origin: B.replace(/\/$/, ''), cookie: cookies[quem] || '' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const sc = r.headers.get('set-cookie');
  if (sc) cookies[quem] = sc.split(';')[0];
  const texto = await r.text();
  let dado = {};
  try { dado = JSON.parse(texto); } catch { /* texto */ }
  if (!r.ok) console.log('  aviso', quem, rota, r.status, texto.slice(0, 120));
  return dado;
}

if (ETAPA === 'api') {
  const propositos = (await api('marcos', 'api/propositos')).propositos || [];
  const esperanca = propositos.find((p) => p.celula && p.criadoPor === 'marcos');
  if (!esperanca) { console.log('rode design/ferramentas/semear.mjs antes: a Célula Esperança não existe'); process.exit(1); }
  const vida = (await api('rute', 'api/celula', { acao: 'criar', titulo: 'Célula Vida' })).proposito;
  const nova = (await api('davi', 'api/celula', { acao: 'criar', titulo: 'Célula Nova' })).proposito;
  await api('rute', 'api/celula', { acao: 'encontro', id: vida.id, dia: 2 });
  const ids = { esperanca: esperanca.id, vida: vida.id, nova: nova.id };
  const lider = { esperanca: 'marcos', vida: 'rute', nova: 'davi' };
  const tokens = {};
  for (const [chave, id] of Object.entries(ids)) {
    const l = await api(lider[chave], 'api/celula', { acao: 'link', id });
    tokens[chave] = l.link ? new URL(l.link).searchParams.get('celula') : '';
  }
  for (const [u, nome, celula, visitante, caminho] of NOVAS) {
    await api(u, 'api/criar-conta', { nome, nascimento: '2003-02-11', email: u + '@exemplo.com', usuario: u, senha: 'senha123', fuso: 'UTC', consentimento: true, ...(caminho ? { caminho } : {}) });
    if (!cookies[u]) await api(u, 'api/entrar', { usuario: u, senha: 'senha123' });
    await api(u, 'api/celula', { acao: 'entrar', token: tokens[celula], visitante: !!visitante });
    console.log('conta', u, cookies[u] ? 'ok' : 'SEM COOKIE', '->', celula, visitante ? '(visitante)' : '');
  }
  // davi e lia na Célula Vida também (davi segue na própria, a Nova)
  for (const u of ['davi', 'lia']) await api(u, 'api/celula', { acao: 'entrar', token: tokens.vida });
  for (const [u, marcos] of Object.entries(MARCOS)) {
    for (const [chave, data] of Object.entries(marcos)) await api(u, 'api/discipulado', { acao: 'marco', chave, data });
  }
  for (const [u, [corpo, mente, espirito]] of Object.entries(CHECKINS)) await api(u, 'api/discipulado', { acao: 'checkin', corpo, mente, espirito });
  // o encontro desta semana da Esperança, registrado pela API (os anteriores vão direto no banco)
  const membros = {
    esperanca: ['marcos', 'ana', 'bia', 'caio', 'dora', 'eva', 'joao', 'lucas'],
    vida: ['rute', 'davi', 'lia', 'noemi', 'pedro', 'tiago'],
    nova: ['davi', 'sara', 'miriam'],
  };
  for (const [u] of NOVAS) writeFileSync(join(SAIDA, 'cookie-' + u + '.txt'), cookies[u] || '');
  writeFileSync(ANOTACOES, JSON.stringify({ ids, membros }, null, 2));
  console.log('etapa 1 pronta: anotações em', ANOTACOES, '· agora PARE o servidor e rode a etapa "banco"');
} else {
  const DADOS = process.env.DADOS;
  if (!DADOS) { console.log('diga a pasta de dados do servidor em DADOS=...'); process.exit(1); }
  const { ids, membros } = JSON.parse(readFileSync(ANOTACOES, 'utf8'));
  const Bd = await import(pathToFileURL(join(RAIZ, 'db.mjs')).href);
  const I = await import(pathToFileURL(join(RAIZ, 'inteligencia.mjs')).href);
  const db = Bd.abrirBanco(Bd.arquivoDoBanco(DADOS));
  // o progresso: as datas de leitura de cada um, por cima do que semear.mjs deixou
  for (const [u, datas] of Object.entries(LEITURAS)) {
    const atual = Bd.lerEstadoDoBanco(db, u) || {};
    const marcadoEm = Object.fromEntries(datas.map((d, i) => [String(i + 1), d]));
    Bd.gravarEstadoNoBanco(db, u, { ...atual, lidos: datas.map((_, i) => i + 1), marcadoEm, dia: datas.length + 1, atualizadoEm: Date.now() });
    I.sincronizarLeituraDias(db, u, datas);
  }
  // as contas: idade e os dias em que abriram o app (para a adoção e a retenção)
  const todos = db.prepare('SELECT usuario, extra FROM contas').all();
  todos.forEach((c, i) => {
    const extra = JSON.parse(c.extra || '{}');
    const abre = Array.from({ length: 14 }, (_, k) => somar(HOJE, -(13 - k))).filter((d, k) => d === HOJE || (i + k) % 3 !== 0 || k % 5 === 0);
    extra.acessos = abre;
    db.prepare('UPDATE contas SET criada_em = ?, extra = ? WHERE usuario = ?').run(['miriam', 'tiago', 'joao'].includes(c.usuario) ? somar(HOJE, -3) : somar(HOJE, -60 - i), JSON.stringify(extra), c.usuario);
  });
  // as células: nasceram há semanas, e quem está nelas entrou antes dos encontros registrados
  for (const [chave, id] of Object.entries(ids)) {
    db.prepare('UPDATE propositos SET criado_em = ? WHERE id = ?').run(somar(HOJE, chave === 'nova' ? -12 : -90), id);
    db.prepare("UPDATE proposito_membros SET entrou_em = ? WHERE proposito = ? AND estado = 'ativo'").run(somar(HOJE, chave === 'nova' ? -12 : -60), id);
  }
  // quatro semanas de encontros da Esperança (um deles sem encontro) e três da Vida
  const encontro = (id, data, presentes, visitantes, sem = false) => {
    db.prepare('INSERT OR REPLACE INTO celula_encontros (proposito, data, visitantes, registrado_por, em, sem_encontro) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, data, visitantes, 'marcos', new Date().toISOString(), sem ? 1 : 0);
    db.prepare('DELETE FROM celula_presencas WHERE proposito = ? AND data = ?').run(id, data);
    for (const u of presentes) db.prepare('INSERT OR REPLACE INTO celula_presencas (proposito, data, usuario) VALUES (?, ?, ?)').run(id, data, u);
  };
  encontro(ids.esperanca, somar(HOJE, -22), ['marcos', 'ana', 'bia', 'caio', 'dora', 'eva'], 2);
  encontro(ids.esperanca, somar(HOJE, -15), [], 0, true);
  encontro(ids.esperanca, somar(HOJE, -8), ['marcos', 'ana', 'bia', 'caio', 'eva', 'joao'], 1);
  encontro(ids.esperanca, somar(HOJE, -1), ['marcos', 'ana', 'caio', 'eva', 'joao', 'lucas'], 3);
  encontro(ids.vida, somar(HOJE, -16), ['rute', 'davi', 'noemi', 'pedro'], 1);
  encontro(ids.vida, somar(HOJE, -9), ['rute', 'davi', 'lia', 'noemi', 'pedro', 'tiago'], 0);
  encontro(ids.vida, somar(HOJE, -2), ['rute', 'lia', 'noemi', 'tiago'], 2);
  Bd.fecharBanco(Bd.arquivoDoBanco(DADOS));
  console.log('etapa 2 pronta (' + Object.keys(membros).length + ' células): suba o servidor de novo com CAMINHO_ADMIN=marcos');
}
