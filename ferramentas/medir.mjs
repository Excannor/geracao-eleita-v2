// Diagnóstico rápido: abre uma rota e imprime as medidas que importam.
// Uso: node ferramentas/medir.mjs [largura] [rota]
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const LARGURA = Number(process.argv[2]) || 390;
const ROTA = process.argv[3] || '#/';
const PORTA = 8137;
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou respondia no lugar.
const DEPURACAO = await portaLivre();
const ESTADO = join(tmpdir(), 'cc-app-medir.json');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

if (existsSync(ESTADO)) rmSync(ESTADO);
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: ESTADO, CAMINHO_ABERTO: '1' }, stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-medir-'));
const navegador = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + DEPURACAO, '--user-data-dir=' + perfil,
  '--window-size=' + LARGURA + ',844', 'about:blank'], { stdio: 'ignore' });

async function alvo() {
  for (let i = 0; i < 60; i++) {
    try {
      const lista = await (await fetch('http://127.0.0.1:' + DEPURACAO + '/json/list')).json();
      const p = lista.find((x) => x.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch { /* subindo */ }
    await dormir(250);
  }
  throw new Error('o navegador não respondeu');
}

const ws = new WebSocket(await alvo());
let seq = 0;
const pend = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
});
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (metodo, params = {}) => new Promise((res) => {
  const id = ++seq; pend.set(id, res);
  ws.send(JSON.stringify({ id, method: metodo, params }));
});
const avaliar = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true })).result?.value;

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', {
  width: LARGURA, height: 844, deviceScaleFactor: 1, mobile: false,
});
await cmd('Page.navigate', { url: 'http://127.0.0.1:' + PORTA + '/' + ROTA });
await dormir(1600);

console.log(JSON.stringify(await avaliar(`(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right), Math.round(b.width)]; };
  return {
    innerWidth, clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScroll: document.body.scrollWidth,
    conteudo: r('.conteudo'), painel: r('.painel-hoje'), faixa: r('.faixa-unidade'),
    hash: location.hash,
    nos: document.querySelectorAll('.no').length,
    faixas: document.querySelectorAll('.faixa-unidade').length,
    no: r('.no.atual'), rotulo: r('.rotulo-no'),
    piores: [...document.querySelectorAll('body *')]
      .map((e) => [e, e.getBoundingClientRect()])
      .filter(([, b]) => b.width > 0)
      .sort((a, b) => b[1].right - a[1].right)
      .slice(0, 14)
      .map(([e, b]) => e.tagName + '.' + (typeof e.className === 'string' ? e.className : '?')
        + ' ' + Math.round(b.left) + '→' + Math.round(b.right)),
  };
})()`), null, 1));

const foto = await cmd('Page.captureScreenshot', { format: 'png' });
writeFileSync(join(AQUI, 'capturas', 'medida.png'), Buffer.from(foto.data, 'base64'));

try { fecharArvore(navegador, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(0);
