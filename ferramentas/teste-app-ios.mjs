// Confere o contorno do bug do iOS 26 (a barra de abas descolando da borda no app instalado):
// com html.app-ios a página não rola, a .aplicativo rola, e a barra fica colada no fim da
// tela em qualquer posição de rolagem. Fora dele, a barra continua "fixed" como sempre.
// O Chrome não tem o bug; o teste simula o app instalado com ?app-ios.
// Uso: node ferramentas/teste-app-ios.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { portaLivre, fecharArvore } from './navegador.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA = await portaLivre();
const DEPURACAO = await portaLivre();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok    ' : '  FALHA ') + msg); if (!cond) falhas++; };

const pasta = mkdtempSync(join(tmpdir(), 'cc-app-ios-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json') }, stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }
const r = await fetch(base + '/api/criar-conta', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ usuario: 'iphone', nome: 'Iphone', senha: 'senha-iphone', email: 'iphone@t.com', nascimento: '2001-01-01' }),
});
const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
const lidos = Array.from({ length: 20 }, (_, i) => i + 1);
await fetch(base + '/api/estado', { method: 'PUT', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ lidos, marcadoEm: {}, licoes: [], dia: 21 }) });

const perfil = mkdtempSync(join(tmpdir(), 'cc-app-ios-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + DEPURACAO, '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });
let wsu;
for (let i = 0; i < 60 && !wsu; i++) {
  try { wsu = (await (await fetch('http://127.0.0.1:' + DEPURACAO + '/json/list')).json()).find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch { /* subindo */ }
  if (!wsu) await dormir(250);
}
const ws = new WebSocket(wsu);
let seq = 0;
const pend = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); } });
await new Promise((res) => ws.addEventListener('open', res));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const esperar = async (expr, ms = 10000) => { for (let t = 0; t < ms; t += 150) { if (await av(expr)) return true; await dormir(150); } return false; };
await cmd('Page.enable');
await cmd('Network.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
const [nome, valor] = cookie.split('=');
await cmd('Network.setCookie', { name: nome, value: valor, url: base });

const barraNoFim = 'Math.abs(document.getElementById("navegacao").getBoundingClientRect().bottom - innerHeight) < 1.5';

try {
  console.log('\n  App instalado no iPhone (contorno do bug do iOS 26)\n');
  await cmd('Page.navigate', { url: base + '/?app-ios#/' });
  ok(await esperar('!!document.querySelector(".no")'), 'o app abre em modo de app instalado');
  ok(await av('document.documentElement.classList.contains("app-ios")'), 'a marca app-ios é posta antes do app desenhar');
  ok(await av('getComputedStyle(document.getElementById("navegacao")).position !== "fixed"'), 'a barra de abas não é "fixed"');
  ok(await av('document.documentElement.scrollHeight <= innerHeight + 1'), 'a página em si não rola');
  ok(await av('(() => { const a = document.querySelector(".aplicativo"); return a.scrollHeight > a.clientHeight + 200; })()'), 'quem rola é a área do app');
  ok(await av(barraNoFim), 'a barra está colada no fim da tela no topo da Trilha');
  for (const y of [800, 2500, 99999]) {
    await av('document.querySelector(".aplicativo").scrollTop = ' + y);
    await dormir(200);
    ok(await av(barraNoFim), 'e continua colada com a Trilha rolada até ' + (y === 99999 ? 'o fim' : y + ' px'));
  }
  ok(await av('(() => { const t = document.getElementById("topo").getBoundingClientRect(); return Math.abs(t.top) < 1.5; })()'), 'o topo (ofensiva e retrato) fica preso em cima enquanto rola');
  await av('location.hash = "#/missoes"');
  await dormir(900);
  ok(await av('document.querySelector(".aplicativo").scrollTop === 0'), 'trocar de aba volta ao topo, na área que rola');
  await av('location.hash = "#/"');
  await dormir(1200);
  await av('document.querySelector(".aplicativo").scrollTop = 300; CC.redesenhar(); 1');
  await dormir(300);
  ok(await av('Math.abs(document.querySelector(".aplicativo").scrollTop - 300) < 2'), 'redesenhar a tela guarda a posição da rolagem');
  ok(await av('(() => { const c = document.querySelector(".conteudo"); const b = document.getElementById("navegacao").getBoundingClientRect(); const a = document.querySelector(".aplicativo"); a.scrollTop = 99999; return c.getBoundingClientRect().bottom <= b.top + 1; })()'),
    'o fim do conteúdo não fica escondido atrás da barra');

  // fora do app instalado, nada muda
  await cmd('Page.navigate', { url: base + '/?navegador#/' });
  ok(await esperar('!!document.querySelector(".no")'), 'no navegador comum o app abre');
  ok(await av('!document.documentElement.classList.contains("app-ios") && getComputedStyle(document.getElementById("navegacao")).position === "fixed"'),
    'e a barra continua "fixed", como sempre');
  await av('scrollTo(0, 1200)');
  await dormir(200);
  ok(await av('scrollY > 1000 && ' + barraNoFim), 'a página rola e a barra fica no fim');
} finally {
  ws.close();
  fecharArvore(nav, perfil);
  servidor.kill();
}
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  a barra de abas fica no lugar no app instalado\n');
process.exit(falhas ? 1 : 0);
