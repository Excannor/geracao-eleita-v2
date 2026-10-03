// Captura uma tela do app entrando com uma conta (cookie), como ferramentas/foto.mjs, mas
// aceitando tema, JS antes de carregar (PRE), JS depois de carregar (ACAO) e página inteira.
// Uso:
//   CHROME=<chrome> BASE=http://localhost:8095/ COOKIE="$(cat <pasta>/cookie-marcos.txt)" \
//     node design/ferramentas/foto-conta.mjs <largura> <altura> <saida.png> '<#/rota>' [rolar] [claro|escuro]
// Variáveis opcionais: PRE (JS antes do app), ACAO (JS depois de abrir; pode devolver texto),
// ESPERA (ms até a captura, padrão 2600), CHEIA=1 (a página inteira, não só a janela), ESCALA.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { portaLivre, fecharArvore } = await import(pathToFileURL(join(RAIZ, 'ferramentas', 'navegador.mjs')).href);

const [, , wArg, hArg, saida, hash = '#/', rolar = '0', tema = ''] = process.argv;
const W = Number(wArg) || 390;
const H = Number(hArg) || 844;
const CHROME = process.env.CHROME || 'chromium';
// ESCALA: densidade da captura (padrão 2 no celular). Página inteira com mais de uns 10.000px de
// altura trava o Chrome sem cabeça a 2x (a imagem passa de 20.000px); use ESCALA=1.5 ou 1.
const ESCALA = Number(process.env.ESCALA) || (W < 800 ? 2 : 1);
const BASE = (process.env.BASE || 'http://localhost:8095/').replace(/\/?$/, '/');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const PORTA_NAV = await portaLivre();
const perfil = mkdtempSync(join(tmpdir(), 'foto-conta-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil, '--window-size=' + W + ',' + H, 'about:blank'], { stdio: 'ignore' });
// Qualquer erro daqui em diante (pasta de saída que não existe, navegador que não responde)
// fecha o Chrome antes de sair: sem isso ele ficava vivo, um por captura do lote.
const encerrar = (erro) => {
  console.error(erro && erro.stack ? erro.stack : erro);
  try { fecharArvore(nav, perfil); } catch { /* ok */ }
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
  process.exit(1);
};
process.on('uncaughtException', encerrar);
process.on('unhandledRejection', encerrar);
async function alvo() {
  for (let i = 0; i < 80; i++) {
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
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || m.error || {}); pend.delete(m.id); } });
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => {
  const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  return r.exceptionDetails ? 'ERRO ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description) : r.result?.value;
};
await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: ESCALA, mobile: W < 800 });
// Sem o convite de notificações e sem o tutorial de instalar por cima da tela.
let pre = "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar')}catch(e){};"
  // sem abertura, como quem recarrega dentro da mesma sessão (ABERTURA=1 mostra a inteira)
  + (process.env.ABERTURA ? '' : "try{sessionStorage.setItem('cc.abertura','1')}catch(e){};")
  + (process.env.PRE || '');
if (tema) pre = "try{localStorage.setItem('cc.tema'," + JSON.stringify(JSON.stringify(tema === 'escuro')) + ')}catch(e){};' + pre;
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: pre });
if (process.env.COOKIE) {
  const [nome, ...resto] = process.env.COOKIE.trim().split('=');
  await cmd('Network.enable');
  await cmd('Network.setCookie', { name: nome, value: resto.join('='), url: BASE });
}
await cmd('Page.navigate', { url: BASE + (hash.startsWith('#') || hash.endsWith('.html') ? hash : '#' + hash) });
await dormir(Number(process.env.ESPERA || 2600));
if (process.env.ACAO) { console.log('acao:', await av(process.env.ACAO)); await dormir(Number(process.env.ESPERA_ACAO || 1200)); }
if (Number(rolar)) { await av('(document.documentElement.classList.contains("app-ios") ? document.querySelector(".aplicativo") : window).scrollTo(0,' + Number(rolar) + ')'); await dormir(700); }
if (process.env.CHEIA) {
  const alt = await av('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
  // A página inteira para em 12.000px (mais que isso trava o Chrome sem cabeça). Página mais alta
  // sai cortada sem erro nenhum: avisa e diz como pegar o resto (o mapa de Marcos a 360px passou).
  if (alt > 12000) console.warn('AVISO: a página tem ' + alt + 'px e a captura para em 12000px; capture o resto sem CHEIA, com rolar=' + (alt - H));
  await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: Math.min(alt, 12000), deviceScaleFactor: ESCALA, mobile: W < 800 });
  await dormir(600);
}
await dormir(300);
const foto = await cmd('Page.captureScreenshot', { format: 'png' });
writeFileSync(saida, Buffer.from(foto.data, 'base64'));
console.log(saida, '|', await av('location.hash'));
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(0);
