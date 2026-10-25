// Os próximos estudos da célula (docs/a-mesa-fila.md), num servidor próprio, com contas criadas pela
// API e, nas partes B a D, num Chrome sem interface.
//   A. a API: a matriz de permissões (líder, auxiliar, membro, visitante e o líder de outra célula),
//      a fila no retrato só de quem conduz, a leitura de um estudo da fila, reordenar, mudar a data,
//      "Usar agora" pedindo confirmação, o registro do encontro promovendo o próximo e as partes que
//      o celular guardava;
//   B. o líder no navegador: agenda 2 estudos, troca a ordem pelas setas, muda uma data, registra o
//      encontro e vê o próximo na aba e o de antes em Estudos anteriores;
//   C. o membro: a aba sem a fila;
//   D. a migração: o celular que ainda guarda a parte 2 de um estudo dividido mostra o cartão, e
//      "Pôr nos próximos estudos" a leva para a fila do servidor.
// O dia do encontro de cada célula é o dia da semana de hoje: o primeiro da fila é sempre de daqui a
// 7 dias, e o encontro registrado hoje o promove, em qualquer dia em que o teste rodar.
// Uso: CHROME=<chrome> node ferramentas/teste-estudo-fila.mjs
//   PORTA=<porta do servidor> (8396), PORTAS=<faixa> para o Chrome, FOTOS=<pasta> guarda as capturas,
//   RAPIDO=1 pula as medidas nos quatro tamanhos e temas, SO_API=1 roda só a parte A.
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8396;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FOTOS = process.env.FOTOS || '';
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const hojeEm = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const HOJE = hojeEm();
const somaDias = (texto, n) => { const d = new Date(texto + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const SEMANA = new Date(HOJE + 'T12:00:00Z').getUTCDay();
const D7 = somaDias(HOJE, 7);
const D14 = somaDias(HOJE, 14);
const D21 = somaDias(HOJE, 21);
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const ddmm = (d) => d.slice(8, 10) + '/' + d.slice(5, 7);
const curta = (d) => DIAS[new Date(d + 'T12:00:00Z').getUTCDay()].slice(0, 3) + ' ' + ddmm(d);
const longa = (d) => DIAS[new Date(d + 'T12:00:00Z').getUTCDay()] + ', ' + ddmm(d);
const texto = (titulo, ref = 'João 3.16') => titulo + '\nUm parágrafo para conversar sobre o texto.\n' + ref;

// ---------- o servidor ----------
const pasta = mkdtempSync(join(tmpdir(), 'cc-estudo-fila-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json'), CAMINHO_TESTE: '1' },
  stdio: 'ignore',
});
let nav = null;
let perfil = '';
let encerrado = false;
async function encerrar() {
  if (encerrado) return;
  encerrado = true;
  try { if (nav) fecharArvore(nav, perfil); } catch { /* ok */ }
  try { servidor.kill(); } catch { /* ok */ }
  await dormir(400);
  try { if (perfil) rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
  try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
}
process.on('uncaughtException', async (e) => { console.log('  FALHA ' + (e && e.stack || e)); await encerrar(); process.exit(1); });
process.on('unhandledRejection', async (e) => { console.log('  FALHA ' + (e && e.stack || e)); await encerrar(); process.exit(1); });
const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 80; i++) { try { await fetch(base + 'api/existe-conta'); break; } catch { await dormir(150); } }

// ---------- a API ----------
const pedir = async (rota, corpo, cookie) => {
  const r = await fetch(base + rota, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, cookie: (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || '']).map((c) => c.split(';')[0]).find((c) => c.startsWith('cc_sessao=') && c.length > 10) || '', dado: await r.json().catch(() => ({})) };
};
const criar = async (usuario, nome, extra = {}) => (await pedir('api/criar-conta', {
  usuario, senha: 'senha123', nome, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true, ...extra,
})).cookie;
const celulaDe = async (cookie, id) => ((await pedir('api/propositos', null, cookie)).dado.propositos || []).find((p) => p.id === id);
const estudo = (id, titulo, extra = {}) => ({ acao: 'estudo', id, estudo: 'blocos', fonte: texto(titulo), traducao: 'nbv', ...extra });
const titulos = (fila) => (fila || []).map((x) => x.titulo + '@' + x.data).join(' ');

// Uma célula com o dia de encontro de hoje: o líder, e quem mais entrar pelo link.
async function novaCelula(lider, titulo) {
  const id = (await pedir('api/celula', { acao: 'criar', titulo }, lider)).dado.proposito.id;
  const token = new URL((await pedir('api/celula', { acao: 'link', id }, lider)).dado.link).searchParams.get('celula');
  await pedir('api/celula', { acao: 'encontro', id, dia: SEMANA }, lider);
  return { id, token };
}

console.log('\n  A. Os próximos estudos pela API\n');
const lider = await criar('lider', 'Marcos');
const { id: ID, token } = await novaCelula(lider, 'Célula Esperança');
const aux = await criar('aux', 'Paulo', { celula: token });
const ana = await criar('ana', 'Ana', { celula: token });
const vera = await criar('vera', 'Vera');
await pedir('api/celula', { acao: 'entrar', token, visitante: true }, vera);
const otto = await criar('otto', 'Otto');
await novaCelula(otto, 'Outra');
ok((await pedir('api/celula', { acao: 'auxiliar', id: ID, usuario: 'aux', sim: true }, lider)).status === 200, 'A. o Paulo é auxiliar da célula');

const A = (await pedir('api/celula', estudo(ID, 'Estudo A'), lider)).dado.estudo.id;
const rB = await pedir('api/celula', estudo(ID, 'Estudo B', { agendar: true }), lider);
const B = rB.dado.estudo && rB.dado.estudo.id;
ok(rB.status === 200 && rB.dado.agendado && rB.dado.agendado.data === D7 && titulos(rB.dado.fila) === 'Estudo B@' + D7 && rB.dado.promovido === null,
  'A. agendar: o estudo vai para o encontro depois do de hoje (' + D7 + '), e a resposta traz a fila');
ok((await celulaDe(lider, ID)).estudo.id === A, 'A. o estudo atual continua o mesmo');
for (const [nome, c] of [['auxiliar', aux], ['membro', ana], ['visitante', vera], ['líder de outra célula', otto]]) {
  const r = await pedir('api/celula', estudo(ID, 'Do ' + nome, { agendar: true }), c);
  const ordem = await pedir('api/celula', { acao: 'filaOrdem', id: ID, ordem: [B] }, c);
  const tirar = await pedir('api/celula', { acao: 'filaTirar', id: ID, estudo: B }, c);
  const usar = await pedir('api/celula', { acao: 'filaUsar', id: ID, estudo: B, confirmar: true }, c);
  const data = await pedir('api/celula', { acao: 'filaData', id: ID, estudo: B, data: D14 }, c);
  const partes = await pedir('api/celula', { acao: 'filaPartes', id: ID, partes: [{ fonte: texto('X') }] }, c);
  ok([r, ordem, tirar, usar, data, partes].every((x) => x.status === 403), 'A. o ' + nome + ' recebe 403 em agendar, reordenar, tirar, usar agora, mudar a data e pôr partes ('
    + [r, ordem, tirar, usar, data, partes].map((x) => x.status).join(' ') + ')');
}
const doLider = await celulaDe(lider, ID);
const doAux = await celulaDe(aux, ID);
const daAna = await celulaDe(ana, ID);
const daVera = await celulaDe(vera, ID);
ok(titulos(doLider.fila) === 'Estudo B@' + D7 && doLider.filaProxima === D14 && doLider.filaPrimeira === D7 && doLider.fila[0].criadoPorNome === 'Marcos' && !('fonte' in doLider.fila[0]),
  'A. o retrato do líder traz a fila (sem a fonte), a próxima data e a primeira livre');
ok(titulos(doAux.fila) === 'Estudo B@' + D7, 'A. o auxiliar também recebe a fila');
ok(!('fila' in daAna) && !('filaProxima' in daAna) && !('fila' in daVera) && !JSON.stringify(daAna).includes('Estudo B') && !JSON.stringify(daVera).includes('Estudo B'),
  'A. o membro e a visitante não recebem nada da fila');
ok(!((await pedir('api/propositos', null, otto)).dado.propositos || []).some((p) => p.id === ID), 'A. o líder de outra célula nem vê a célula');
const lerB = (c) => pedir('api/estudos?estudo=' + encodeURIComponent(B) + '&celula=' + encodeURIComponent(ID), null, c);
const lB = await lerB(lider);
const aB = await lerB(aux);
ok(lB.status === 200 && lB.dado.fila === true && lB.dado.agendado.data === D7 && lB.dado.estudo.fonte === texto('Estudo B'), 'A. o líder abre o estudo da fila, com a fonte (para "Mudar o estudo")');
ok(aB.status === 200 && aB.dado.fila === true && !('fonte' in aB.dado.estudo) && aB.dado.estudo.blocos.length > 0, 'A. o auxiliar abre o estudo da fila para ler, sem a fonte');
ok((await lerB(ana)).status === 404 && (await lerB(vera)).status === 404 && (await lerB(otto)).status === 404
  && (await pedir('api/estudos?estudo=' + encodeURIComponent(B), null, ana)).status === 404, 'A. o membro, a visitante e quem é de fora recebem 404 (nunca 403)');
ok(!JSON.stringify((await pedir('api/estudos?celula=' + encodeURIComponent(ID), null, lider)).dado).includes(B), 'A. a fila não entra na lista de Estudos anteriores');

const rC = await pedir('api/celula', estudo(ID, 'Estudo C', { agendar: true, data: D21 }), lider);
const C = rC.dado.estudo.id;
ok(titulos(rC.dado.fila) === 'Estudo B@' + D7 + ' Estudo C@' + D21, 'A. agendar com a data escolhida');
const ordem = await pedir('api/celula', { acao: 'filaOrdem', id: ID, ordem: [C, B] }, lider);
ok(ordem.status === 200 && titulos(ordem.dado.fila) === 'Estudo C@' + D7 + ' Estudo B@' + D21, 'A. reordenar: os estudos trocam e as datas ficam');
ok((await pedir('api/celula', { acao: 'filaOrdem', id: ID, ordem: [B] }, lider)).status === 409, 'A. reordenar com a fila velha dá 409');
const data = await pedir('api/celula', { acao: 'filaData', id: ID, estudo: B, data: D7 }, lider);
ok(data.status === 200 && titulos(data.dado.fila) === 'Estudo B@' + D7 + ' Estudo C@' + D14, 'A. mudar a data para a de outro estudo empurra esse para o encontro seguinte');
ok((await pedir('api/celula', { acao: 'filaData', id: ID, estudo: B, data: somaDias(HOJE, -1) }, lider)).status === 400, 'A. data que já passou: 400');
const semConfirmar = await pedir('api/celula', { acao: 'filaUsar', id: ID, estudo: C }, lider);
ok(semConfirmar.status === 409 && semConfirmar.dado.precisaConfirmar === true && (await celulaDe(lider, ID)).estudo.id === A, 'A. "Usar agora" por cima do atual sem uso pede confirmação (409), e nada muda');

const reg = await pedir('api/celula', { acao: 'registrarEncontro', id: ID, data: HOJE, presentes: ['lider', 'ana'], visitantes: 0, estudo: A }, lider);
ok(reg.status === 200 && reg.dado.promovido && reg.dado.promovido.id === B, 'A. registrado o encontro com o atual, a resposta diz que B entrou na célula');
const depois = await celulaDe(ana, ID);
ok(depois.estudo.id === B && depois.estudo.titulo === 'Estudo B', 'A. a Ana já vê B como o estudo da célula');
ok((await pedir('api/estudos?celula=' + encodeURIComponent(ID), null, ana)).dado.estudos.map((x) => x.id).join() === A, 'A. e A em Estudos anteriores');
ok(titulos((await celulaDe(lider, ID)).fila) === 'Estudo C@' + D14, 'A. a fila do líder fica com C');
const partes = await pedir('api/celula', { acao: 'filaPartes', id: ID, partes: [{ fonte: texto('Do celular (parte 2)'), traducao: 'nbv' }] }, lider);
ok(partes.status === 200 && titulos(partes.dado.fila) === 'Do celular (parte 2)@' + D14 + ' Estudo C@' + D21, 'A. as partes do celular entram logo depois do encontro do atual (B, de ' + D7 + '), e a fila empurra o resto');
const tirar = await pedir('api/celula', { acao: 'filaTirar', id: ID, estudo: C }, lider);
ok(tirar.status === 200 && titulos(tirar.dado.fila) === 'Do celular (parte 2)@' + D14 && (await lerB(lider)).dado.atual === true, 'A. tirar da fila; e B, que já entrou, abre como o atual');

if (process.env.SO_API) {
  await encerrar();
  console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'tudo certo') + '\n');
  process.exit(falhas ? 1 : 0);
}

// PARTE_B

await encerrar();
console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'tudo certo') + '\n');
process.exit(falhas ? 1 : 0);
