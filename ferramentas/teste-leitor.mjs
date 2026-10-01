// Usa o leitor de verdade num Chrome sem interface: abre o texto do dia, troca a
// tradução e a letra, marca a leitura pelo próprio leitor e confere que o texto
// continua abrindo sem rede. Salva capturas em capturas/.
// Uso: node ferramentas/teste-leitor.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8192;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// pasta própria: sem contas.json, o servidor fica aberto e não pede entrada
const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-leitor-estado-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_ABERTO: '1' },
  stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-leitor-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil,
  '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });

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
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const esperar = async (expr, ms = 6000) => {
  for (let t = 0; t < ms; t += 150) {
    if (await av(expr)) return true;
    await dormir(150);
  }
  return false;
};

mkdirSync(join(AQUI, 'capturas'), { recursive: true });
const foto = async (nome) => {
  // a abertura fica até 1,6 s por cima do app: a captura espera ela sair
  await esperar('!document.getElementById("abertura")', 4000);
  const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
  if (data) writeFileSync(join(AQUI, 'capturas', nome), Buffer.from(data, 'base64'));
};

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Network.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

console.log('\n  Leitor do texto bíblico\n');
const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 40; i++) {
  try { await fetch(base); break; } catch { await dormir(150); }
}

// ---------- o servidor ----------
const biblias = await (async () => {
  const html = await (await fetch(base)).text();
  const i = html.indexOf('window.BIBLIAS=');
  return JSON.parse(html.slice(i + 15, html.indexOf(';</script>', i)));
})();
ok(biblias.length === 2, 'o aplicativo conhece duas traduções');
const r = await fetch(base + biblias[0].arquivo, { headers: { 'accept-encoding': 'gzip' } });
ok(r.ok && (r.headers.get('content-type') || '').includes('json'), 'o arquivo da tradução é servido como JSON');
const bruto = await fetch(base + biblias[0].arquivo, { headers: { 'accept-encoding': 'identity' } });
ok(r.headers.get('content-encoding') === 'gzip'
  && Number(r.headers.get('content-length')) < Number(bruto.headers.get('content-length')),
  'quem aceita gzip recebe o texto comprimido ('
  + r.headers.get('content-length') + ' em vez de ' + bruto.headers.get('content-length') + ' bytes)');

// ---------- primeira abertura ----------
await cmd('Page.navigate', { url: base });
ok(await esperar('!!document.querySelector(".no")'), 'o aplicativo abre');
// o service worker precisa estar no comando para guardar o texto
await av('navigator.serviceWorker.ready.then(() => true)');
await cmd('Page.reload', {});
await esperar('!!document.querySelector(".no") && !!navigator.serviceWorker.controller');

await av('location.hash = "#/dia/1"');
ok(await esperar('!!document.querySelector("[data-ler]")'), 'a lição mostra o botão de ler o texto');
ok(await av('!/NVI/.test(document.querySelector(".licao").textContent)'), 'a lição não fala mais em NVI');
await foto('leitor-1-licao.png');

await av('document.querySelector(\'[data-ler="antigo"]\').click()');
ok(await esperar('document.querySelectorAll(".leitor .leitor-capitulo").length === 3'),
  'o leitor abre Gênesis 1 a 3, três capítulos');
ok(await av('document.querySelector(".leitor .leitor-verso").textContent.includes("No princípio")'),
  'o primeiro versículo é Gênesis 1.1');
ok(await av('document.querySelector(".leitor-credito").textContent.includes("Biblica")'),
  'o crédito da Nova Bíblia Viva aparece no fim do texto');
ok(await av('CC.traducao().sigla === "nbv"'), 'a Nova Bíblia Viva vem escolhida de início');
await foto('leitor-2-nbv.png');

// ---------- tradução e letra, pela folha Aa ----------
await av('document.querySelector("[data-aa]").click()');
await esperar('!!document.querySelector(\'.cortina [data-traducao="blivre"]\')');
await av('document.querySelector(\'.cortina [data-letra="maior"]\').click()');
ok(await av('document.querySelector(".leitor").classList.contains("letra-maior")'), 'a folha Aa aumenta a letra');
await av('document.querySelector(\'.cortina [data-traducao="blivre"]\').click()');
ok(await esperar('(document.querySelector(".leitor .leitor-verso") || {}).textContent?.includes("criou Deus")'),
  'trocar para a Bíblia Livre troca o texto');
ok(await av('localStorage.getItem("cc.traducao") === "blivre"'), 'a escolha fica guardada no aparelho');
const larguraSobra = await av('document.documentElement.scrollWidth - innerWidth');
ok(larguraSobra <= 0, 'nada estoura a largura da tela no leitor (' + larguraSobra + ')');
await foto('leitor-3-blivre-maior.png');

// ---------- marcar pelo leitor ----------
await av('document.querySelector("[data-terminei]").click()');
ok(await esperar('document.querySelector(".leitor h2")?.textContent === "Mateus 1"'),
  'terminar o Antigo Testamento leva direto a Mateus 1');
ok(await av('document.querySelectorAll(".licao .passagem.feita").length === 1'),
  'a lição por baixo já mostra a primeira passagem marcada');
await av('document.querySelector("[data-terminei]").click()');
ok(await esperar('!document.querySelector(".leitor")'), 'terminar a última trilha fecha o leitor');
ok(await av('CC.leu(1)'), 'o dia 1 conta como lido');

// Esc fecha o texto e deixa a lição aberta
await av('document.querySelector(\'[data-ler="novo"]\').click()');
await esperar('!!document.querySelector(".leitor")');
await av('dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))');
await dormir(300);
ok(await av('!document.querySelector(".leitor") && !!document.querySelector(".licao")'),
  'Esc fecha o texto e volta à lição');

// ---------- perfil ----------
await av('location.hash = "#/config/textos"');
ok(await esperar('document.querySelectorAll(".credito-biblia").length === 2'),
  'os créditos das duas traduções estão em Textos bíblicos');

// ---------- sem rede ----------
const guardou = await esperar(`caches.open("caminho-biblias").then((c) => c.keys()).then((k) => k.length >= 1)`, 10000);
ok(guardou, 'o texto aberto ficou guardado no cache das bíblias');
await cmd('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
servidor.kill();
await dormir(500);
evs.length = 0;
await av('location.hash = "#/"');
await cmd('Page.reload', {});
ok(await esperar('!!document.querySelector(".no")'), 'o aplicativo abre sem rede');
await av('location.hash = "#/dia/2"');
await esperar('!!document.querySelector("[data-ler]")');
await av('document.querySelector(\'[data-ler="antigo"]\').click()');
ok(await esperar('document.querySelectorAll(".leitor .leitor-verso").length > 10'),
  'sem rede, o texto da tradução guardada continua abrindo');
await foto('leitor-4-sem-rede.png');

const erros = evs
  .filter((e) => e.method === 'Runtime.exceptionThrown')
  .map((e) => e.params.exceptionDetails?.exception?.description || 'exceção');
ok(erros.length === 0, 'nenhuma exceção de JavaScript' + (erros[0] ? ': ' + erros[0].slice(0, 90) : ''));

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o leitor funciona inteiro\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
try { rmSync(pastaEstado, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
