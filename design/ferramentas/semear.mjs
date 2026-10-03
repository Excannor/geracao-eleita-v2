// Semeia um servidor de teste VAZIO com contas e dados, para as telas do redesenho
// aparecerem cheias nas capturas. Não toca em nada fora do servidor que recebe os pedidos.
// Uso: BASE=http://localhost:8095/ SAIDA=<pasta para os cookies> node design/ferramentas/semear.mjs
//
// Contas (senha "senha123" em todas):
//   marcos  dia 42, amigos, célula (líder), discipulado (conduz o davi), propósito com a ana
//           -> barra cheia (Trilha · Juntos · Célula | Bíblia | Discipulado · Mais); admin do
//              painel se o servidor subir com CAMINHO_ADMIN=marcos
//   ana     dia 43, membro da célula do marcos -> barra com Célula
//   davi    dia 41, discípulo do marcos -> barra com Discipulado
//   rute    dia 31, só amiga -> barra padrão (Trilha · Desafios | Bíblia | Juntos · Mais)
//   lia     caminho Conhecer Jesus (dia 3), amiga do marcos
// Cada cookie sai em <SAIDA>/cookie-<conta>.txt, no formato "cc_sessao=...".
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const B = (process.env.BASE || 'http://localhost:8095/').replace(/\/?$/, '/');
const SAIDA = process.env.SAIDA || '.';
mkdirSync(SAIDA, { recursive: true });

const hojeIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const HOJE = process.env.HOJE || hojeIso();
const somar = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const cookies = {};
async function api(quem, rota, corpo, metodo) {
  const r = await fetch(B + rota, {
    method: metodo || (corpo ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', origin: B.replace(/\/$/, ''), cookie: cookies[quem] || '' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  // O servidor manda dois cookies (cc_sessao e a marca cc_logado=1): fica só o crachá com valor.
  const sessao = r.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => /^cc_sessao=./.test(c));
  if (sessao) cookies[quem] = sessao;
  const texto = await r.text();
  let dado = {};
  try { dado = JSON.parse(texto); } catch { /* texto */ }
  if (!r.ok) console.log('  aviso', quem, rota, r.status, texto.slice(0, 120));
  return dado;
}

// Progresso: `lidos` dias lidos em sequência terminando ontem (ou hoje), com registro e baús.
function estado(dono, lidos, { hojeLido = false, apelido = '' } = {}) {
  const lista = Array.from({ length: lidos }, (_, i) => i + 1);
  const marcadoEm = {};
  lista.forEach((n, i) => { marcadoEm[n] = somar(HOJE, -(lidos - i) + (hojeLido ? 1 : 0)); });
  const oia = {
    [lidos]: { o: 'Jesus toca o leproso antes de curar.', i: 'Ele não tem medo de se contaminar.', a: 'Chegar perto de quem está sozinho.', oracao: '' },
    12: { o: 'Deus chama Abrão para sair.', i: '', a: '', oracao: 'Senhor, que eu confie como Abrão.' },
  };
  const bausAbertos = {};
  for (const n of [7, 14, 21, 28, 35]) if (n <= lidos) bausAbertos['dia:' + n] = { em: marcadoEm[n] };
  return {
    dono, atualizadoEm: Date.now(), dia: lidos + 1, lidos: lista, licoes: [], oia, anotacoes: {}, marcadoEm, licoesEm: {},
    pratica: {}, foto: '', apelido, zeradoEm: 0, xpLegado: null, conquistasGanhas: {}, maiorProposito: 0, diario: {},
    bausAbertos, quadros: {}, notasVistas: [], acertosTotal: 0, missoesTotal: 0, semanasJuntos: {}, oradoEm: {},
  };
}

const pessoas = [
  ['marcos', 'Marcos', {}], ['ana', 'Ana', {}], ['davi', 'Davi', {}], ['rute', 'Rute', {}],
  ['lia', 'Lia', { caminho: 'conhecer' }],
];
for (const [u, nome, extra] of pessoas) {
  await api(u, 'api/criar-conta', {
    nome, nascimento: '2004-05-10', email: u + '@exemplo.com', usuario: u, senha: 'senha123', fuso: 'UTC',
    consentimento: true, ...extra,
  });
  if (!cookies[u]) await api(u, 'api/entrar', { usuario: u, senha: 'senha123' });
  console.log('conta', u, cookies[u] ? 'ok' : 'SEM COOKIE');
}

for (const u of ['ana', 'davi', 'rute', 'lia']) {
  await api('marcos', 'api/amizade', { acao: 'pedir', usuario: u });
  await api(u, 'api/amizade', { acao: 'aceitar', usuario: 'marcos' });
}
await api('ana', 'api/amizade', { acao: 'pedir', usuario: 'rute' });
await api('rute', 'api/amizade', { acao: 'aceitar', usuario: 'ana' });

const progresso = {
  marcos: estado('marcos', 41, { apelido: 'Marcos' }),
  ana: estado('ana', 42, { hojeLido: true }),
  davi: estado('davi', 40, { hojeLido: true }),
  rute: estado('rute', 30),
};
for (const [u, e] of Object.entries(progresso)) await api(u, 'api/estado', e, 'PUT');

// Feed
for (const u of ['ana', 'davi', 'marcos']) await api(u, 'api/novidades/preferencia', { ligado: true });
await api('ana', 'api/novidades', { tipo: 'versiculo', dados: { ref: '1 Pedro 2.9' } });
await api('davi', 'api/novidades', { tipo: 'ofensiva', dados: { dias: 40 } });
await api('marcos', 'api/novidades', { tipo: 'versiculo', dados: { ref: 'João 3.16' } });

// Propósito em dupla (marcos convida a ana)
const p = await api('marcos', 'api/propositos', { acao: 'criar', tipo: 'plano', titulo: 'Bíblia em um ano', com: ['ana'] });
if (p.proposito) await api('ana', 'api/propositos', { acao: 'aceitar', id: p.proposito.id });

// Célula do marcos, com a ana entrando pelo link
const c = await api('marcos', 'api/celula', { acao: 'criar', titulo: 'Célula Esperança' });
if (c.proposito) {
  const id = c.proposito.id;
  const l = await api('marcos', 'api/celula', { acao: 'link', id });
  const token = l.link ? new URL(l.link).searchParams.get('celula') : '';
  if (token) await api('ana', 'api/celula', { acao: 'entrar', token });
  await api('marcos', 'api/celula', { acao: 'encontro', id, dia: 3 });
  await api('marcos', 'api/celula', { acao: 'recado', id, texto: 'Quinta às 20h na casa da Ana. Tragam a Bíblia!' });
}

// Discipulado: marcos conduz o davi
const d = await api('marcos', 'api/discipulado', { acao: 'convidar', usuario: 'davi', papel: 'discipulador' });
if (d.id) await api('davi', 'api/discipulado', { acao: 'aceitar', id: d.id, mostrar: true });

for (const [u] of pessoas) if (cookies[u]) writeFileSync(join(SAIDA, 'cookie-' + u + '.txt'), cookies[u]);
console.log('pronto: cookies em', SAIDA);
