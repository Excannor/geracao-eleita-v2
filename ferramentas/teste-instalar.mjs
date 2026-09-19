// Confere o tutorial de instalar no celular: aparece depois de criar a conta pelo
// formulário de verdade, pergunta o celular, mostra os passos, dá para pular, não volta
// sozinho, e fica no Perfil. Confere também os ícones da tela de início.
// Uso: node ferramentas/teste-instalar.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8207;
const PASTA = join(tmpdir(), 'cc-instalar');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_ABERTO: '' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

console.log('\n  Instalar no celular\n');

// ---------- ícones, sem sessão ----------
const favicon = await fetch(base + '/favicon.ico');
ok(favicon.status === 200 && (favicon.headers.get('content-type') || '').startsWith('image/png'),
  '/favicon.ico é uma imagem, e não a tela de entrada');
const apple = await fetch(base + '/apple-touch-icon.png');
ok(apple.status === 200 && (apple.headers.get('content-type') || '').startsWith('image/png'),
  'o ícone do iPhone sai sem precisar entrar');
const manifesto = await (await fetch(base + '/manifest.webmanifest')).json();
ok(manifesto.icons.some((i) => i.purpose === 'maskable') && manifesto.icons.every((i) => /\?v=\w+$/.test(i.src)),
  'o manifesto traz o ícone recortável do Android, com versão no endereço');
const portal = await (await fetch(base + '/')).text();
ok(/rel="apple-touch-icon" href="apple-touch-icon\.png\?v=\w+"/.test(portal) && portal.includes('rel="manifest"'),
  'a tela de entrada declara o ícone da tela de início');

// ---------- navegador ----------
const perfil = mkdtempSync(join(tmpdir(), 'cc-in-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil, '--window-size=390,900', 'about:blank'], { stdio: 'ignore' });
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
const evs = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
  else if (m.method) evs.push(m);
});
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
// esperar = false para o que só resolve com um toque da pessoa
const av = async (e, esperar = true) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: esperar })).result?.value;
const esperarAte = async (expr, ms = 8000) => {
  for (let t = 0; t < ms; t += 200) { if (await av(expr)) return true; await dormir(200); }
  return false;
};

await cmd('Runtime.enable');
await cmd('Emulation.setUserAgentOverride', {
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
});
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true });
await cmd('Page.navigate', { url: base + '/' });
await dormir(1500);

// ---------- criar a conta pelo formulário de verdade ----------
const preencheu = await av(`(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('form-cadastro')) return false;
  ['boas', 'entrar', 'cadastro'].forEach((n) => { const t = $('tela-' + n); if (t) t.hidden = n !== 'cadastro'; });
  $('nome').value = 'Ana';
  $('nascimento').value = '2000-01-01';
  $('email').value = 'ana@teste.com';
  $('usuario').value = 'ana';
  $('senha-nova').value = 'senha-boa-1';
  return true;
})()`);
ok(preencheu, 'o formulário de cadastro está na tela de entrada');
for (let i = 0; i < 3; i++) {
  await av('document.getElementById("form-cadastro").requestSubmit(); 1', false);
  await dormir(500);
}
// A conta nova vai primeiro para a leitura: o tutorial espera a primeira leitura concluída.
await esperarAte('!!(window.CC && document.querySelector(".aba"))', 12000);
await dormir(2500);
ok(await av('!document.querySelector(".folha-instalar") && localStorage.getItem("cc.instalar") === "1"'),
  'depois de criar a conta, o app abre na leitura, sem tutorial por cima');
await av('CC.marcarLido(1, true); 1');
await dormir(600);
await cmd('Page.reload');
const abriu = await esperarAte('!!(window.CC && document.querySelector(".folha-instalar"))', 12000);
ok(abriu, 'com a primeira leitura feita, o app abre com o tutorial');
ok(await av('localStorage.getItem("cc.instalar") === null'), 'a marca de conta nova sai quando o tutorial aparece: não volta a cada abertura');
ok(await av('!!document.querySelector(".folha-instalar [data-pular]")'), 'o tutorial tem como pular');
ok(await av('document.querySelectorAll(".opcao-sistema").length === 2'), 'pergunta se é iPhone ou Android');
ok(await av('(document.querySelector(\'[data-sistema="android"] .sugerido\') || {}).textContent === "o seu"'),
  'sugere o sistema do próprio celular');

// ---------- iPhone ----------
await av('document.querySelector(\'[data-sistema="ios"]\').click()');
await dormir(300);
const passosIos = await av('[...document.querySelectorAll(".passos-instalar li b")].map((b) => b.textContent)');
ok(Array.isArray(passosIos) && passosIos.length === 4 && passosIos.some((t) => /Compartilhar/.test(t))
  && passosIos.some((t) => /Tela de Início/.test(t)), 'no iPhone, os passos passam por Compartilhar e Tela de Início');

// ---------- troca para Android ----------
await av('document.querySelector(\'[data-trocar="android"]\').click()');
await dormir(300);
const passosAndroid = await av('[...document.querySelectorAll(".passos-instalar li b")].map((b) => b.textContent)');
ok(Array.isArray(passosAndroid) && passosAndroid.some((t) => /três pontinhos/.test(t)) && passosAndroid.some((t) => /Instalar/.test(t)),
  'dá para trocar para Android sem voltar ao começo');

// ---------- pular ----------
await av('document.querySelector(".folha-instalar [data-pular]").click()');
await dormir(400);
ok(await av('!document.querySelector(".folha-instalar")'), 'pular fecha o tutorial');

await cmd('Page.reload');
await esperarAte('!!(window.CC && document.querySelector(".aba"))', 12000);
await dormir(1500);
ok(await av('!document.querySelector(".folha-instalar")'), 'abrir o app de novo não repete o tutorial');

// ---------- no Perfil ----------
await av('location.hash = "#/perfil"');
await dormir(800);
ok(await av('!!document.querySelector("[data-instalar]")'), 'o Perfil tem o botão Instalar no celular');
await av('document.querySelector("[data-instalar]").click(); 1', false);
await dormir(400);
// Quando o navegador avisa que sabe instalar, a folha abre no botão de um toque: perguntar
// qual é o celular é pergunta que ele já respondeu. O passo a passo fica a um clique.
ok(await av('!!document.querySelector(".folha-instalar [data-instalar-ja]")'),
  'com o navegador oferecendo instalação, a folha abre no botão de um toque');
ok(await av('!!document.querySelector(".folha-instalar [data-passo-a-passo]")'),
  'e ainda dá para pedir o passo a passo');
await av('document.querySelector(".folha-instalar [data-passo-a-passo]").click(); 1', false);
await dormir(400);
ok(await av('!!document.querySelector(".folha-instalar .passos-instalar")'),
  'o passo a passo abre nos passos do celular');
ok(await av('!!document.querySelector(\'.folha-instalar [data-trocar="android"][aria-pressed="true"]\')'),
  'e o celular reconhecido é Android');
await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await dormir(300);
ok(await av('!document.querySelector(".folha-instalar")'), 'Esc também fecha');

const erros = evs.filter((e) => e.method === 'Runtime.exceptionThrown');
ok(erros.length === 0, 'nenhuma exceção no caminho'
  + (erros[0] ? ': ' + (erros[0].params.exceptionDetails.exception?.description || erros[0].params.exceptionDetails.text) : ''));

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o tutorial de instalar funciona\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
