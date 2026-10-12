// Os nomes de cada mapa bíblico, medidos num Chrome sem interface: nenhum nome, número de parada,
// legenda ou norte sai pela borda do mapa, e nenhum encosta em outro (letra por letra, para pegar
// os nomes girados). O ponto da própria cidade junto do nome dela não conta.
// Com FOTOS=<pasta>, guarda cada mapa grande (SO=slug,slug para só alguns).
// Uso: CHROME=<chrome> PORTA=9984 node ferramentas/teste-atlas-rotulos.mjs
// Uso: CHROME=<chrome> PORTA=9985 PORTAS=9986-9999 node ferramentas/teste-atlas.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA_NAV = await portaLivre();
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 9984;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CAPTURAS = process.env.CAPTURAS ? resolve(process.env.CAPTURAS) : '';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// pasta própria: sem contas.json, o servidor fica aberto e não pede entrada
const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-atlas-estado-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_ABERTO: '1' },
  stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-atlas-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
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
// O texto na tela leva espaço inseparável e juntor de palavras: compara sem eles.
const texto = (sel) => av('(document.querySelector(' + JSON.stringify(sel) + ') || { textContent: "" }).textContent.replace(/\\u00a0/g, " ").replace(/\\u2060/g, "").replace(/\\s+/g, " ").trim()');
const esperar = async (expr, ms = 8000) => {
  for (let t = 0; t < ms; t += 150) {
    if (await av(expr)) return true;
    await dormir(150);
  }
  return false;
};
const tela = (w, h) => cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
const semEstouro = () => av('document.documentElement.scrollWidth - innerWidth <= 0 && [...document.querySelectorAll(".conteudo *")].every((el) => el.getBoundingClientRect().right <= innerWidth + 0.5 || el.closest(".seta, svg"))');
const tirarAviso = () => av('(() => { const a = document.getElementById("aviso-flutuante"); if (a) a.remove(); })()');
await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Network.enable');
await tela(390, 844);
// sem a abertura, sem o convite de notificações e sem o tutorial de instalar por cima da tela
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

console.log('\n  Nomes dos mapas bíblicos\n');
const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 40; i++) { try { await fetch(base); break; } catch { await dormir(150); } }
const html = await (await fetch(base)).text();
const i0 = html.indexOf('window.ATLAS=');
const A = JSON.parse(html.slice(i0 + 13, html.indexOf(';window.', i0)));
// mede no svg grande (largura 1200) para enxergar sobreposições pequenas
await tela(1100, 3000); await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
const MEDIR = `(() => {
  const svg = document.querySelector('.atlas-quadro .atlas-svg'); const s = svg.getBoundingClientRect();
  const k = s.width / svg.viewBox.baseVal.width;
  const caixa = (el) => { const r = el.getBoundingClientRect(); return { x0: (r.left - s.left) / k, y0: (r.top - s.top) / k, x1: (r.right - s.left) / k, y1: (r.bottom - s.top) / k }; };
  const quad = (el, x, y, w, h) => { const M = el.getScreenCTM(); const P = (px, py) => { const q = new DOMPoint(px, py).matrixTransform(M); return [(q.x - s.left) / k, (q.y - s.top) / k]; };
    const pts = [P(x, y), P(x + w, y), P(x, y + h), P(x + w, y + h)]; return { x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])) }; };
  const letras = (t) => { const cs = []; t.querySelectorAll('tspan').length ? t.querySelectorAll('tspan').forEach((sp) => { for (let i = 0; i < sp.getNumberOfChars(); i++) { const e = sp.getExtentOfChar(i); if (e.width) cs.push(quad(sp, e.x, e.y, e.width, e.height)); } }) : (() => { for (let i = 0; i < t.getNumberOfChars(); i++) { const e = t.getExtentOfChar(i); if (e.width) cs.push(quad(t, e.x, e.y, e.width, e.height)); } })(); return cs; };
  const itens = [];
  const nomeDe = (el) => (el.textContent || '').trim().replace(/\\s+/g, ' ');
  document.querySelectorAll('.at-lugares text').forEach((t) => itens.push({ tipo: 'cidade', nome: nomeDe(t), b: caixa(t), cs: letras(t) }));
  document.querySelectorAll('.at-regioes text').forEach((t) => itens.push({ tipo: t.classList.contains('fraca') || t.closest('.fraca') ? 'regiao-fraca' : 'regiao', nome: nomeDe(t), b: caixa(t), cs: letras(t) }));
  document.querySelectorAll('.at-aguas text, .at-serras text').forEach((t) => itens.push({ tipo: 'agua', nome: nomeDe(t), b: caixa(t), cs: letras(t) }));
  document.querySelectorAll('.at-numero circle').forEach((c) => { const g = c.closest('.at-numero'); const pr = g.dataset.de; itens.push({ tipo: 'numero', nome: '#' + g.dataset.parada, dono: pr, b: caixa(c) }); });
  document.querySelectorAll('.at-ponto').forEach((c) => itens.push({ tipo: 'ponto', nome: '·' + c.closest('.at-lugar').dataset.lugar, b: caixa(c) }));
  itens.push({ tipo: 'legenda', nome: 'LEGENDA', b: caixa(document.querySelector('.at-legenda rect')) });
  itens.push({ tipo: 'norte', nome: 'NORTE', b: caixa(document.querySelector('.at-norte')) });
  const fx = document.querySelector('.at-faixa'); const topo = fx ? fx.getBBox().height : 0;
  return { W: svg.viewBox.baseVal.width, H: svg.viewBox.baseVal.height, topo, itens };
})()`;
for (const it of A.itens) {
  await cmd('Page.navigate', { url: base + '#/atlas/' + it.slug });
  await esperar('!!document.querySelector(".atlas-quadro .atlas-svg image")', 15000);
  await av('document.fonts.ready.then(() => true)'); await dormir(600);
  const r = await av(MEDIR);
  const L = [];
  for (const i of r.itens) {
    if (i.tipo === 'ponto') continue;
    const b = i.b;
    const cs = i.cs || [b];
    if (cs.some((b) => b.x0 < 1 || b.x1 > r.W - 1 || b.y0 < r.topo + 1 || b.y1 > r.H - 1)) L.push('CORTE  ' + i.tipo + ' "' + i.nome + '"');
  }
  const cruza = (a, b, f = 1) => a.x0 < b.x1 - f && b.x0 < a.x1 - f && a.y0 < b.y1 - f && b.y0 < a.y1 - f;
  for (let a = 0; a < r.itens.length; a++) for (let b = a + 1; b < r.itens.length; b++) {
    const p = r.itens[a], q = r.itens[b];
    if (p.tipo === 'ponto' && q.tipo === 'ponto') continue;
    if ((p.tipo === 'regiao-fraca' || q.tipo === 'regiao-fraca') && (p.tipo === 'ponto' || q.tipo === 'ponto')) continue;
    // o ponto da própria cidade junto do nome dela não conta
    if ((p.tipo === 'ponto' || q.tipo === 'ponto')) { const pt = p.tipo === 'ponto' ? p : q, o = pt === p ? q : p; if (o.tipo === 'numero' && o.dono === pt.nome.slice(1)) continue; if (o.tipo === 'numero' || o.tipo === 'cidade') { if (!cruza(pt.b, o.b, 0.3)) continue; } else continue; }
    if (cruza(p.b, q.b) && (p.cs || [p.b]).some((x) => (q.cs || [q.b]).some((y) => cruza(x, y)))) L.push('ENCOSTA ' + p.tipo + ' "' + p.nome + '"  ×  ' + q.tipo + ' "' + q.nome + '"');
  }
  if (process.env.FOTOS && (!process.env.SO || process.env.SO.split(',').includes(it.slug))) {
    const c = await av('(() => { const e = document.querySelector(".atlas-quadro .atlas-svg"); scrollTo(0,0); const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height, scale: 1.6 }; })()');
    await dormir(300);
    const f = await cmd('Page.captureScreenshot', { format: 'png', clip: c, captureBeyondViewport: true });
    writeFileSync(process.env.FOTOS + '/' + it.slug + '.png', Buffer.from(f.data, 'base64'));
  }
  ok(L.length === 0, it.slug + ': nada cortado nem encostado' + (L.length ? ' (' + L.length + ')' : ''));
  L.forEach((x) => console.log('          ' + x));
}
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  os nomes cabem nos mapas\n');
ws.close();
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
try { rmSync(pastaEstado, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
