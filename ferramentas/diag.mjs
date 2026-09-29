import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8080/#/';
const perfil = mkdtempSync(join(tmpdir(), 'diag-'));
const nav = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + PORTA_NAV,
    '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });
async function alvo() {
  for (let i = 0; i < 60; i++) {
    try { const l = await (await fetch('http://127.0.0.1:' + PORTA_NAV + '/json/list')).json(); const p = l.find((x) => x.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch { /**/ }
    await dormir(250);
  }
  throw new Error('sem navegador');
}
const ws = new WebSocket(await alvo());
let seq = 0; const pend = new Map(); const evs = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); } else if (m.method) evs.push(m); });
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true })).result?.value;
await cmd('Runtime.enable'); await cmd('Log.enable');
await cmd('Page.navigate', { url });
await dormir(2200);
console.log('url pedida:', url);
console.log('location.href:', await av('location.href'));
console.log('location.hash:', JSON.stringify(await av('location.hash')));
console.log('rota calculada:', JSON.stringify(await av("(location.hash||'#/').slice(2).split('?')[0].split('/').filter(Boolean)")));
console.log('conteudo:', (await av("document.getElementById('conteudo').innerHTML.slice(0,70)")));
const erros = evs.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'));
console.log('erros:', JSON.stringify(erros.map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text)));
try { fecharArvore(nav, perfil); } catch { /**/ }
try { rmSync(perfil, { recursive: true, force: true }); } catch { /**/ }
process.exit(0);
