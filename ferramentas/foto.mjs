// Captura uma tela do app já rodando no Docker (porta 8080 por padrão).
// Uso: node ferramentas/foto.mjs <largura> <altura> <arquivo.png> [hash] [urlBase]
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [, , wArg, hArg, saida, hash = '#/', base = 'http://localhost:8080/', rolar = '0', tema = ''] = process.argv;
const W = Number(wArg) || 390;
const H = Number(hArg) || 844;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const perfil = mkdtempSync(join(tmpdir(), 'foto-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil,
  '--window-size=' + W + ',' + H, 'about:blank'], { stdio: 'ignore' });

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
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true })).result?.value;

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W < 800 ? 2 : 1, mobile: W < 800 });
await cmd('Page.navigate', { url: base.replace(/#.*$/, '') + hash });
await dormir(2000);
if (tema) await av('CC.guardarTema(' + (tema === 'escuro') + ');CC.pintarTopo()');
if (Number(rolar)) { await av('scrollTo(0,' + Number(rolar) + ')'); await dormir(700); }
await dormir(400);
const foto = await cmd('Page.captureScreenshot', { format: 'png' });
writeFileSync(saida, Buffer.from(foto.data, 'base64'));
console.log(saida,'| hash:',JSON.stringify(await av('location.hash')),'| href:',await av('location.href'),'|',await av("document.getElementById('conteudo').innerHTML.slice(0,40)"));

try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(0);
