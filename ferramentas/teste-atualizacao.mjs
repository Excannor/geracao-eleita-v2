// Confere que o app recebe atualização mesmo abrindo do cache: publica uma "versão nova"
// no dist com o app aberto e verifica que ele troca de versão sozinho, sem recarregar no
// meio de uma janela aberta, e recarrega assim que ela fecha.
// Mexe no dist/ durante o teste e devolve tudo no fim, mesmo se falhar.
// Uso: node ferramentas/teste-atualizacao.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8215;
const PASTA = join(tmpdir(), 'cc-atualizacao');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const DIST_INDEX = join(AQUI, 'dist', 'index.html');
const DIST_SW = join(AQUI, 'dist', 'sw.js');

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const indexOriginal = readFileSync(DIST_INDEX, 'utf8');
const swOriginal = readFileSync(DIST_SW, 'utf8');
const restaurar = () => { writeFileSync(DIST_INDEX, indexOriginal, 'utf8'); writeFileSync(DIST_SW, swOriginal, 'utf8'); };

let servidor;
let nav;
let perfil;
try {
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
  servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
    env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json') }, stdio: 'ignore',
  });
  const base = 'http://127.0.0.1:' + PORTA;
  for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }
  await fetch(base + '/api/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: 'ana', senha: 'senha-boa-1', nome: 'Ana', email: 'ana@teste.com', nascimento: '2000-01-01' }) });

  perfil = mkdtempSync(join(tmpdir(), 'cc-at-'));
  nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + PORTA_NAV,
    '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try { wsUrl = ((await (await fetch('http://127.0.0.1:' + PORTA_NAV + '/json/list')).json()).find((x) => x.type === 'page') || {}).webSocketDebuggerUrl; } catch { /* subindo */ }
    if (!wsUrl) await dormir(250);
  }
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pend = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); } });
  await new Promise((r) => ws.addEventListener('open', r));
  const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
  const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  const esperarAte = async (expr, ms) => { for (let t = 0; t < ms; t += 250) { if (await av(expr)) return true; await dormir(250); } return false; };

  await cmd('Runtime.enable');
  await cmd('Page.navigate', { url: base + '/' });
  await dormir(1500);
  await av('(async () => { await fetch("api/entrar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ usuario: "ana", senha: "senha-boa-1" }) }); })()');
  await cmd('Page.navigate', { url: base + '/#/' });
  await cmd('Page.reload');

  console.log('\n  Atualização com o app em cache\n');

  const versaoAntiga = (indexOriginal.match(/<meta name="versao-app" content="([0-9a-f]{12})">/) || [])[1];
  ok(!!versaoAntiga, 'a página publicada traz a própria versão');
  ok(await esperarAte('!!(window.CC && navigator.serviceWorker.controller)', 20000), 'o app abre e fica sob o service worker (em cache)');
  ok((await (await fetch(base + '/api/versao')).json()).versao === versaoAntiga, 'o servidor responde a versão publicada');

  // ---------- publica uma versão nova com o app aberto ----------
  const nova = 'abcdef012345';
  writeFileSync(DIST_INDEX, indexOriginal.split(versaoAntiga).join(nova)
    .replace('<title>', '<meta name="teste-versao-nova" content="1">\n<title>'), 'utf8');
  writeFileSync(DIST_SW, swOriginal.split(versaoAntiga).join(nova), 'utf8');
  ok((await (await fetch(base + '/api/versao')).json()).versao === nova, 'publicada a versão nova, o servidor passa a responder ela');

  await av('window.__mesmaPagina = true; CC.folha("<p>janela aberta</p>", {}); true');
  await av('CC.conferirVersao()');
  const assumiu = await esperarAte('!!(navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL.includes("' + nova + '"))', 20000);
  ok(assumiu, 'o app percebe a versão nova e o service worker novo assume');
  await dormir(1200);
  ok(await av('window.__mesmaPagina === true && !!document.querySelector(".cortina")'), 'com uma janela aberta, ele não recarrega na cara da pessoa');

  await av('document.querySelectorAll(".cortina").forEach((c) => c.remove()); location.hash = "#/perfil"; true');
  const recarregou = await esperarAte('!window.__mesmaPagina && !!document.querySelector(\'meta[name="teste-versao-nova"]\')', 20000);
  ok(recarregou, 'fechada a janela, recarrega sozinho já na versão nova');
  // A etiqueta da versão chega no <head> antes de o script de 4 MB terminar de rodar: espera o app iniciar.
  ok(await esperarAte('!!(window.CC && CC.versaoApp && CC.versaoApp() === "' + nova + '")', 20000), 'depois de recarregar, o app roda a versão nova');

  // ---------- sem rede, segue com o que tem ----------
  await cmd('Network.enable');
  await cmd('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cmd('Page.reload');
  ok(await esperarAte('!!(window.CC && document.querySelector(".aba"))', 20000), 'sem internet, o app abre do cache na versão nova');
  await cmd('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
} catch (e) {
  ok(false, 'o teste quebrou: ' + e.message);
} finally {
  restaurar();
  console.log('  (dist/ devolvido como estava)');
  try { nav && fecharArvore(nav, perfil); } catch { /* ok */ }
  try { servidor && servidor.kill(); } catch { /* ok */ }
  try { perfil && rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o app se atualiza mesmo abrindo do cache\n');
process.exit(falhas ? 1 : 0);
