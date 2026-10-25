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

// ---------- o navegador ----------
console.log('\n  B. O líder no navegador\n');
const marcos = await criar('marcos', 'Marcos');
const { id: JD, token: tokJ } = await novaCelula(marcos, 'Célula Jardim');
const bia = await criar('bia', 'Bia', { celula: tokJ });
const TA = 'Batalha espiritual e a armadura de Deus';
const TB = 'O fruto do Espírito no dia a dia';
const TC = 'Perdão que recomeça';
const EA = (await pedir('api/celula', estudo(JD, TA), marcos)).dado.estudo.id;

perfil = mkdtempSync(join(tmpdir(), 'cc-estudo-fila-nav-'));
const PORTA_NAV = await portaLivre();
nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil, '--window-size=390,844', '--lang=pt-BR', 'about:blank'], { stdio: 'ignore' });
async function alvo() {
  for (let i = 0; i < 60; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:' + PORTA_NAV + '/json/list')).json();
      const p = l.find((x) => x.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch { /* subindo */ }
    await dormir(250);
  }
  throw new Error('sem navegador');
}
const ws = new WebSocket(await alvo());
let seq = 0;
const pend = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
});
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => {
  const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) console.log('  (erro na expressão: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text || '').slice(0, 200) + ')');
  return r.result?.value;
};
const na = (f, ...args) => av('(' + f.toString() + ')(' + args.map((a) => JSON.stringify(a)).join(',') + ')');
const esperar = async (expr, ms = 10000) => {
  for (let t = 0; t < ms; t += 150) {
    if (await av(expr)) return true;
    await dormir(150);
  }
  return false;
};
const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
const existe = (sel) => '!!' + q(sel);
const clicar = (sel) => av('(() => { const el = ' + q(sel) + '; if (!el) return false; el.click(); return true; })()');
const comum = (t) => String(t == null ? '' : t).replace(/ /g, ' ').replace(/⁠/g, '');
const textoDe = async (sel) => comum(await av('(' + q(sel) + ' || {}).textContent || ""'));
const larguras = { 390: 844, 360: 740 };
let largura = 390;
const tamanho = async (w, h) => { largura = w; await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h || larguras[w] || 844, deviceScaleFactor: 2, mobile: true }); };

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Network.enable');
await tamanho(390);
await cmd('Emulation.setTimezoneOverride', { timezoneId: 'America/Sao_Paulo' });
await cmd('Emulation.setFocusEmulationEnabled', { enabled: true });
await cmd('Page.bringToFront');
await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });

// Entra como uma conta e abre a rota. limpar: armazenamento limpo; antes: o que pôr no
// localStorage antes de abrir (a parte que a versão anterior guardava no celular).
async function como(cookie, rota, { limpar = true, antes = null } = {}) {
  await cmd('Page.navigate', { url: base + 'privacidade.html' });
  await esperar('document.readyState === "complete"');
  if (limpar) await av('localStorage.clear(); sessionStorage.clear(); true');
  if (antes) await na((x) => { for (const [k, v] of Object.entries(x)) localStorage.setItem(k, JSON.stringify(v)); return true; }, antes);
  await cmd('Network.clearBrowserCookies');
  const [nome, ...resto] = cookie.split('=');
  await cmd('Network.setCookie', { name: nome, value: resto.join('='), url: base });
  await cmd('Page.navigate', { url: base + rota });
  await esperar('!!window.CC && !!document.querySelector("#conteudo") && !!document.querySelector(".folha-juntos, .painel-celula")', 15000);
}
const rota = (aba) => '#/novidades/celula/' + JD + (aba ? '/' + aba : '');
const tema = (escuro) => av('CC.guardarTema(' + (escuro ? 'true' : 'false') + '); true');
// A carta nova do baú pode abrir por cima da tela depois do registro do encontro (a revelação, em
// tela cheia): sai antes das medidas e das capturas, como o "Pular" faria.
const semCarta = () => na(() => { let n = 0; document.querySelectorAll('.tela-cheia').forEach((t) => { if (t.querySelector('.rv')) { t.remove(); n++; } }); return n; });
async function foto(nome, inteira) {
  if (!FOTOS) return;
  await dormir(400);
  await semCarta();
  await av('document.getElementById("aviso-flutuante")?.remove(); true');
  if (inteira) {
    const h = await na(() => {
      const folha = document.querySelector('.cortina .folha');
      if (folha) { folha.style.maxHeight = 'none'; folha.style.overflow = 'visible'; return Math.ceil(folha.scrollHeight + 96); }
      return Math.ceil(document.documentElement.scrollHeight);
    });
    await tamanho(largura, Math.max(h, larguras[largura]));
    await dormir(400);
  }
  const r = await cmd('Page.captureScreenshot', { format: 'png', fromSurface: true });
  if (r.data) writeFileSync(join(FOTOS, nome + '.png'), Buffer.from(r.data, 'base64'));
  if (inteira) { await tamanho(largura); await dormir(200); }
}
async function fotoClaroEscuro(nome, inteira, rolar) {
  for (const escuro of [false, true]) {
    await tema(escuro);
    if (rolar) await av(rolar);
    await foto(nome + '-390-' + (escuro ? 'escuro' : 'claro'), inteira);
  }
  await tema(false);
}
// Sem rolagem lateral, todo botão com 44 px na menor medida e nenhuma letra abaixo de 12 px.
async function medidas(rotulo) {
  const m = await na(() => {
    const raizes = [...document.querySelectorAll('.cortina .folha')];
    if (!raizes.length) raizes.push(document.querySelector('#conteudo'));
    const visivel = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const pequenos = [];
    const letras = [];
    for (const raiz of raizes) {
      for (const el of raiz.querySelectorAll('button, a[href], select, textarea, input:not([type="checkbox"]), [role="radio"]')) {
        if (!visivel(el) || el.closest('.acoes-verso')) continue;
        const r = el.getBoundingClientRect();
        if (Math.min(r.width, r.height) < 43.5) pequenos.push((el.textContent.trim() || el.getAttribute('aria-label') || el.className).slice(0, 40) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
      const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
      for (let n = andar.nextNode(); n; n = andar.nextNode()) {
        if (!n.nodeValue.trim() || !n.parentElement || !visivel(n.parentElement)) continue;
        const f = parseFloat(getComputedStyle(n.parentElement).fontSize);
        // (o nome escrito no voltar redondo tem letra 0 de propósito: só o leitor de tela o lê)
        if (f > 0 && f < 11.95) letras.push(n.nodeValue.trim().slice(0, 30) + ' ' + f);
      }
    }
    return { lateral: document.documentElement.scrollWidth - innerWidth, pequenos: [...new Set(pequenos)], letras: [...new Set(letras)] };
  });
  const tudoCerto = m.lateral <= 0 && !m.pequenos.length && !m.letras.length;
  ok(tudoCerto, rotulo + ': sem rolagem lateral, toque de 44 px e letra de 12 px'
    + (tudoCerto ? '' : ' (lateral ' + m.lateral + ', pequenos: ' + m.pequenos.slice(0, 4).join(' | ') + ', letras: ' + m.letras.slice(0, 4).join(' | ') + ')'));
}
async function emTodosOsTamanhos(rotulo) {
  if (process.env.RAPIDO) return;
  await semCarta();
  for (const w of [390, 360]) {
    for (const escuro of [false, true]) {
      await tamanho(w);
      await tema(escuro);
      await dormir(250);
      await medidas(rotulo + ' a ' + w + ' px, ' + (escuro ? 'escuro' : 'claro'));
    }
  }
  await tamanho(390);
  await tema(false);
}
const filaDoServidor = async () => titulos((await celulaDe(marcos, JD)).fila);
const rolarAte = (sel) => '(() => { const el = document.querySelector(' + JSON.stringify(sel) + '); if (el) el.scrollIntoView({ block: "start" }); scrollBy(0, -110); return true; })()';

// Agenda um estudo pelo caminho da tela: "Agendar um estudo", o texto, as partes, o passo 3.
async function agendarPelaTela(titulo, data, rotuloFoto) {
  ok(await esperar(existe('[data-agendar]'), 15000), 'B. a seção tem "Agendar um estudo"');
  await clicar('[data-agendar]');
  ok(await esperar(existe('[data-fonte]') + ' && /\\/preparar\\/novo$/.test(location.hash)', 15000), 'B. "Agendar um estudo" abre o preparo de um estudo novo (…/preparar/novo)');
  await na((t) => { const c = document.querySelector('[data-fonte]'); c.value = t; c.dispatchEvent(new Event('input', { bubbles: true })); return true; }, texto(titulo));
  await clicar('[data-ver]');
  ok(await esperar(existe('[data-continuar]') + ' && !' + q('[data-continuar]') + '.disabled', 15000), 'B. as partes conferidas');
  await clicar('[data-continuar]');
  ok(await esperar(existe('[data-salvar]') + ' && ' + existe('.mesa-quando'), 15000), 'B. o passo 3 tem "Quando usar"');
  const quando = await na(() => ({
    marcado: (document.querySelector('[data-quando][aria-checked="true"]') || {}).dataset?.quando,
    data: (document.querySelector('[data-data-fila]') || {}).value || '',
    botao: document.querySelector('[data-salvar]').textContent.trim(),
    ws: !!document.querySelector('.mesa-ws'),
  }));
  ok(quando.marcado === 'agendar' && quando.botao === 'Agendar o estudo' && !quando.ws, 'B. vem marcado "Agendar", o botão diz "Agendar o estudo", e sem o cartão dos 4 Ws (' + JSON.stringify(quando) + ')');
  if (data) {
    await na((d) => { const c = document.querySelector('[data-data-fila]'); c.value = d; c.dispatchEvent(new Event('change', { bubbles: true })); return true; }, data);
  }
  if (rotuloFoto) {
    await emTodosOsTamanhos('B. o passo 3 com a data');
    await fotoClaroEscuro(rotuloFoto, false, rolarAte('.mesa-quando'));
  }
  await clicar('[data-salvar]');
  ok(await esperar('/\\/estudo$/.test(location.hash) && !!document.querySelector("[data-lista-proximos]")', 20000), 'B. agendado, volta para a aba com a fila');
  return quando;
}

await como(marcos, rota('estudo'));
ok(await esperar(existe('.mesa-secao-anteriores .titulo-secao') + ' && /Próximos estudos/.test(document.querySelector(".mesa-secao-anteriores").textContent)', 20000)
  && (await textoDe('.mesa-secao-anteriores')).includes('Deixe prontos os estudos dos próximos encontros.'), 'B. a fila vazia: a seção com a dica e "Agendar um estudo"');
await emTodosOsTamanhos('B. a aba com a fila vazia');
const q1 = await agendarPelaTela(TB, '', '02-agendar-com-data');
ok(q1.data === D7, 'B. a data já vem com o encontro seguinte (' + q1.data + ')');
ok(await filaDoServidor() === TB + '@' + D7, 'B. o servidor guardou o estudo na fila');
await agendarPelaTela(TC, D21);
ok(await filaDoServidor() === TB + '@' + D7 + ' ' + TC + '@' + D21, 'B. o segundo, com a data escolhida (' + D21 + ')');
ok(await esperar(existe('.mesa-lider .mesa-fila'), 10000) && (await textoDe('.mesa-lider .mesa-fila')) === 'Próximo: ' + TB + ' · ' + curta(D7), 'B. o cartão do líder diz o que vem: "Próximo: ' + TB + ' · ' + curta(D7) + '"');
const linhas = await na(() => [...document.querySelectorAll('.mesa-proximo')].map((l) => l.textContent.replace(/ /g, ' ')));
ok(linhas.length === 2 && linhas[0].includes('Para ' + longa(D7)) && linhas[0].includes(TB) && linhas[1].includes('Para ' + longa(D21)) && linhas[1].includes(TC), 'B. a lista em ordem, com a data de cada um');
ok(await av(q('[data-subir="0"]') + '.disabled && !' + q('[data-descer="0"]') + '.disabled && ' + q('[data-descer="1"]') + '.disabled'), 'B. as setas das pontas ficam desligadas');
await emTodosOsTamanhos('B. a aba com a fila');
await fotoClaroEscuro('01-aba-com-a-fila', false, rolarAte('.mesa-lider'));
await fotoClaroEscuro('01b-secao-proximos', false, rolarAte('[data-lista-proximos]'));

// trocar a ordem: as datas ficam
await clicar('[data-descer="0"]');
ok(await esperar('document.querySelector(".mesa-proximo .mesa-proximo-ler b")?.textContent === ' + JSON.stringify(TC), 15000), 'B. "Passar para depois" troca a ordem na tela');
ok(await filaDoServidor() === TC + '@' + D7 + ' ' + TB + '@' + D21, 'B. as datas ficaram nos lugares: ' + TC + ' agora é de ' + D7);
await fotoClaroEscuro('03-depois-de-reordenar', false, rolarAte('[data-lista-proximos]'));

// mudar a data de um, pela leitura dele
await clicar('.mesa-proximo:last-child .mesa-proximo-ler');
ok(await esperar(existe('[data-mudar-data]'), 15000) && (await textoDe('.mesa-cabeca-anterior')).includes('Próximo estudo') && (await textoDe('.mesa-cabeca-anterior')).includes('Para o encontro de ' + longa(D21)),
  'B. a leitura de um estudo da fila: "Próximo estudo", para quando, e os botões do líder');
await emTodosOsTamanhos('B. a leitura de um estudo da fila');
await fotoClaroEscuro('04-ler-um-da-fila', true);
await clicar('[data-mudar-data]');
ok(await esperar(existe('.cortina [data-nova-data]')), 'B. "Mudar a data" abre a folha');
await na((d) => { const c = document.querySelector('[data-nova-data]'); c.value = d; return true; }, D14);
await clicar('.cortina [data-salvar-data]');
ok(await esperar('!document.querySelector(".cortina [data-nova-data]")', 10000) && await esperar('/Para o encontro de ' + longa(D14).replace('/', '\\/') + '/.test(document.querySelector(".mesa-cabeca-anterior")?.textContent || "")', 15000),
  'B. a data nova aparece na leitura');
ok(await filaDoServidor() === TC + '@' + D7 + ' ' + TB + '@' + D14, 'B. e no servidor');

// mudar o texto de um estudo da fila: o preparo dele, com a data, sem "Quando usar"
await clicar('[data-mudar-agendado]');
ok(await esperar(existe('[data-fonte]') + ' && ' + existe('.mesa-da-fila'), 15000) && (await textoDe('.mesa-da-fila')) === 'Agendado para ' + longa(D14) + '. Ele entra na aba Estudo depois do encontro anterior.'
  && await av(q('[data-fonte]') + '.value') === texto(TB), 'B. "Mudar o estudo" abre o preparo do estudo da fila, com o texto salvo e para quando ele está agendado');
ok(await av(existe('[data-tirar-da-fila]') + ' && !' + existe('[data-tirar]')), 'B. no lugar de "Tirar o estudo", "Tirar dos próximos"');
await na((t) => { const c = document.querySelector('[data-fonte]'); c.value = t; c.dispatchEvent(new Event('input', { bubbles: true })); return true; }, texto(TB) + '\nMais uma frase para a conversa.');
await clicar('[data-ver]');
await esperar(existe('[data-continuar]') + ' && !' + q('[data-continuar]') + '.disabled', 15000);
await clicar('[data-continuar]');
ok(await esperar(existe('[data-salvar]'), 15000), 'B. o passo 3 do estudo da fila');
const p3 = await na(() => ({ data: (document.querySelector('[data-data-fila]') || {}).value || '', opcoes: document.querySelectorAll('[data-quando]').length,
  botao: document.querySelector('[data-salvar]').textContent.trim(), ws: !!document.querySelector('.mesa-ws') }));
ok(p3.data === D14 && p3.opcoes === 0 && p3.botao === 'Salvar o estudo' && !p3.ws, 'B. com o dia dele, sem "Usar agora", e sem o cartão dos 4 Ws (' + JSON.stringify(p3) + ')');
await clicar('[data-salvar]');
ok(await esperar('/\\/estudo$/.test(location.hash) && !!document.querySelector("[data-lista-proximos]")', 20000), 'B. salvo, volta para a aba');
const idTB = (await celulaDe(marcos, JD)).fila.find((x) => x.titulo === TB).id;
const lidoTB = await pedir('api/estudos?estudo=' + idTB + '&celula=' + JD, null, marcos);
ok(lidoTB.dado.fila === true && lidoTB.dado.estudo.fonte.includes('Mais uma frase para a conversa.') && await filaDoServidor() === TC + '@' + D7 + ' ' + TB + '@' + D14,
  'B. o servidor guardou o texto novo, e o estudo continua na fila, no mesmo dia');

// o encontro de hoje, registrado pela folha
await como(marcos, rota(''), { limpar: false });
ok(await esperar(existe('[data-registrar-encontro]'), 15000), 'B. a aba Hoje tem "Registrar o encontro"');
await clicar('[data-registrar-encontro]');
ok(await esperar(existe('.cortina [data-salvar]')), 'B. a folha "Quem foi ao encontro?" abre');
ok((await textoDe('.cortina [data-estudo-escolhido]')) === TA, 'B. com o estudo atual escolhido, e nada da fila na folha');
ok(!(await textoDe('.cortina .folha')).includes(TC), 'B. a folha não oferece um estudo da fila');
await clicar('.cortina [data-salvar]');
ok(await esperar('/O próximo estudo já está na aba Estudo/.test(document.getElementById("aviso-flutuante")?.textContent || "")', 15000), 'B. o aviso: "Encontro registrado. O próximo estudo já está na aba Estudo."');
await como(marcos, rota('estudo'), { limpar: false });
ok(await esperar('/' + TC + '/.test(document.querySelector(".mesa-estudo .mesa-t1")?.textContent || "")', 20000), 'B. ' + TC + ' é o estudo da aba');
ok(await esperar(existe('.mesa-anterior'), 15000) && (await textoDe('.mesa-anteriores')).includes(TA), 'B. ' + TA + ' está em Estudos anteriores');
ok((await textoDe('.mesa-lider .mesa-fila')) === 'Próximo: ' + TB + ' · ' + curta(D14) && (await na(() => document.querySelectorAll('.mesa-proximo').length)) === 1, 'B. a fila fica com ' + TB);
await emTodosOsTamanhos('B. a aba depois do encontro');
await fotoClaroEscuro('05-promovido-depois-do-encontro', false, rolarAte('.mesa-lider'));
await fotoClaroEscuro('05b-anteriores-depois-do-encontro', false, rolarAte('[data-lista-proximos]'));

console.log('\n  C. O membro\n');
const filaJ = (await celulaDe(marcos, JD)).fila;
await como(bia, rota('estudo'));
ok(await esperar('/' + TC + '/.test(document.querySelector(".mesa-estudo .mesa-t1")?.textContent || "")', 20000), 'C. a Bia vê ' + TC + ' na aba');
await esperar(existe('.mesa-secao-anteriores .titulo-secao'), 10000);
const daBia = await textoDe('#conteudo');
ok(!daBia.includes('Próximos estudos') && !daBia.includes('Próximo:') && !daBia.includes(TB) && !(await av(existe('.mesa-proximos'))), 'C. sem a seção "Próximos estudos", sem a linha "Próximo" e sem o título do estudo da fila');
ok(!('fila' in (await celulaDe(bia, JD))), 'C. o retrato dela não traz a fila');
await emTodosOsTamanhos('C. a aba do membro');
await fotoClaroEscuro('06-membro-sem-a-fila', false, rolarAte('.mesa-secao-anteriores'));
await como(bia, rota('estudo') + '/' + encodeURIComponent(filaJ[0].id), { limpar: false });
ok(await esperar('/não está aberto para você/.test(document.querySelector("#conteudo")?.textContent || "")', 15000), 'C. o endereço de um estudo da fila mostra "não está aberto para você"');

console.log('\n  D. A parte guardada no celular\n');
const guardada = { ['cc.estudo.proximos.' + JD]: { v: 1, titulo: 'Longo', total: 2, traducao: 'nbv', partes: [{ origem: 'd1', k: 2, total: 2, titulo: 'Longo', traducao: 'nbv', fonte: texto('Longo (parte 2)') }] } };
await como(marcos, rota('estudo'), { antes: guardada });
ok(await esperar(existe('[data-migrar]'), 20000) && (await textoDe('[data-migrar] p')) === 'A parte 2 de “Longo” está guardada só neste celular.', 'D. o cartão diz o que o celular guarda');
await emTodosOsTamanhos('D. o cartão da parte guardada');
await fotoClaroEscuro('07-parte-guardada-no-celular', false, rolarAte('.mesa-lider'));
await clicar('[data-migrar-por]');
ok(await esperar('!document.querySelector("[data-migrar]") && !!document.querySelector("[data-lista-proximos]")', 15000), 'D. "Pôr nos próximos estudos": o cartão some');
ok(await av('localStorage.getItem("cc.estudo.proximos.' + JD + '") === null'), 'D. e o celular não guarda mais a parte');
ok(await filaDoServidor() === 'Longo (parte 2)@' + D14 + ' ' + TB + '@' + D21, 'D. a parte 2 está na fila do servidor, logo depois do encontro do atual (' + D7 + '), e ' + TB + ' passa para o seguinte');

await encerrar();
console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'tudo certo') + '\n');
process.exit(falhas ? 1 : 0);
