// Confere que o aplicativo funciona sem rede nenhuma, como acontece no celular
// longe do Wi-Fi de casa: abre uma vez com o servidor no ar, corta a rede, recarrega
// e usa o aplicativo até o fim de uma leitura.
// Uso: node ferramentas/teste-offline.mjs [endereço]
//      sem endereço, sobe um servidor local; com endereço, testa o que já está no ar.
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8189;
const ESTADO = join(tmpdir(), 'cc-offline.json');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

if (existsSync(ESTADO)) rmSync(ESTADO);
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: ESTADO, CAMINHO_ABERTO: '1' }, stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-off-'));
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

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Log.enable');
await cmd('Network.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

console.log('\n  Funciona fora da rede?\n');

// ---------- 1. primeira visita, com o servidor no ar ----------
const base = process.argv[2] || ('http://127.0.0.1:' + PORTA + '/');
await cmd('Page.navigate', { url: base });
await dormir(2500);
ok(await av('!!document.querySelector(".no")'), 'abre normalmente com a rede');

// o service worker precisa terminar de guardar tudo antes de cortar a rede
const guardou = await av(`(async () => {
  const reg = await navigator.serviceWorker.ready;
  for (let i = 0; i < 40; i++) {
    const nomes = await caches.keys();
    if (nomes.length) {
      const c = await caches.open(nomes[0]);
      const itens = await c.keys();
      if (itens.length >= 3) return itens.length;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return 0;
})()`);
ok(guardou >= 3, 'o service worker guardou o aplicativo em cache (' + guardou + ' arquivos)');

// marca uma leitura enquanto ainda há rede
await av('CC.marcarLido(1, true)');
await dormir(900);

// ---------- 2. corta a rede ----------
await cmd('Network.emulateNetworkConditions', {
  offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
});
servidor.kill();
await dormir(600);
ok(!(await av('navigator.onLine')), 'o aparelho está sem rede');

// ---------- 3. recarrega sem rede ----------
evs.length = 0;
await cmd('Page.reload', { ignoreCache: false });
await dormir(3000);

ok(await av('!!document.querySelector(".no")'), 'a trilha abre sem rede');
ok(await av('document.querySelectorAll(".faixa-unidade").length === 12'), 'as 12 unidades vieram do cache');
ok(await av('CC.leu(1) === true'), 'o progresso de antes continua lá');
ok(await av('!CC.servidorVivo()'), 'o aplicativo entendeu que está sem servidor');

// ---------- 4. usa o aplicativo até o fim de um dia ----------
await av('location.hash = "#/"');
await dormir(500);
await av('(document.querySelector(".no.atual").click(), document.querySelector(".pop-no [data-comecar]").click())');
await dormir(700);
ok(await av('!!document.querySelector(".licao")'), 'a lição do dia abre sem rede');
await av('document.querySelectorAll("[data-trilha]").forEach((b) => b.click())');
await dormir(400);
ok(await av('CC.ler("lidos", []).length >= 2'), 'marcar a leitura funciona sem rede');

await av('document.querySelector("[data-concluir]").click()');
await dormir(500);
ok(await av('!!document.querySelector(".festa .retorno-lido")'), 'a reflexão abre logo depois da leitura, sem rede');
ok(await av('!document.querySelector("[data-seguir]")'), 'sem telas de festa no caminho, sem rede');

// escrever e guardar
await av('document.querySelector("[data-escrever]").click()');
await dormir(500);
await av('(() => { const t = document.querySelector("textarea"); t.value = "escrito sem rede";'
  + ' t.dispatchEvent(new Event("input", { bubbles: true })); })()');
await dormir(400);
ok(await av('JSON.stringify(CC.estado().oia).includes("escrito sem rede")'),
  'o que se escreve sem rede fica guardado');

// as outras telas
for (const [nome, hash, marca] of [['praticar', '#/praticar', '.cartao-pratica'],
  ['explorar', '#/explorar', '.bloco-secao'], ['perfil', '#/perfil', '.estante'],
  ['uma nota', '#/nota/' + encodeURIComponent('11 - Pessoas/Davi'), '.nota-corpo']]) {
  await av('location.hash = ' + JSON.stringify(hash));
  await dormir(600);
  ok(await av('!!document.querySelector("' + marca + '")'), nome + ' abre sem rede');
}

// o quiz inteiro
await av('location.hash = "#/praticar"');
await dormir(600);
await av('document.querySelector(".cartao-pratica").click()');
await dormir(600);
ok(await av('document.querySelectorAll(".opcao").length === 4'), 'o quiz monta as perguntas sem rede');

// ---------- 5. o progresso sobrevive a fechar e abrir ----------
await cmd('Page.reload', { ignoreCache: false });
await dormir(2500);
ok(await av('JSON.stringify(CC.estado().oia).includes("escrito sem rede")'),
  'o texto continua lá depois de fechar e abrir sem rede');

const erros = evs
  .filter((e) => e.method === 'Runtime.exceptionThrown')
  .map((e) => e.params.exceptionDetails?.exception?.description || 'exceção');
ok(erros.length === 0, 'nenhuma exceção de JavaScript sem rede'
  + (erros[0] ? ': ' + erros[0].slice(0, 90) : ''));

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  funciona inteiro fora da rede\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
