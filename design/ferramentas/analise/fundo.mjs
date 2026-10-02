// Frente "caixas", a barra: rola cada rota até o fim, em 360 e 390 de largura, e mede o que
// ficou debaixo da barra de abas (o pior elemento, com quantos px entram sob a barra) e o
// tamanho de cada aba (alvo de toque: 44px ou mais). Uma linha JSON por rota e largura.
//
// Uso (servidor de pé e semeado):
//   CHROME=<chrome> BASE=http://localhost:8680/ COOKIE="$(cat <pasta>/cookie-marcos.txt)" \
//     node design/ferramentas/analise/fundo.mjs '#/' '#/passos' '#/missoes' '#/novidades' '#/perfil'
// Sem COOKIE roda sem conta (só faz sentido com CAMINHO_ABERTO=1 no servidor).
//   pior: { d: px debaixo da barra, el, t: começo do texto } ou null quando nada entra sob a barra
//   abas: largura x altura de cada .navegacao .aba (0x0 = escondida)
import { abrir, dormir } from './cdp.mjs';

const BASE = (process.env.BASE || 'http://localhost:8680/').replace(/\/?$/, '/');
const rotas = process.argv.slice(2);
if (!rotas.length) { console.log("diga as rotas: node design/ferramentas/analise/fundo.mjs '#/' '#/perfil' ..."); process.exit(1); }
const { cmd, av, fechar } = await abrir({ cookie: process.env.COOKIE || '', base: BASE });
const MEDIR = `(() => {
  const H = innerHeight; const barra = document.querySelector('.navegacao'); if (!barra) return { semBarra: true };
  const b = barra.getBoundingClientRect(); const se = document.scrollingElement;
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; for (let p = el; p; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || c.opacity === '0') return false; } return true; };
  const SVG = ['svg','path','circle','line','rect','g','polyline','polygon','ellipse','defs','use','i'];
  let pior = null;
  for (const el of document.querySelectorAll('.conteudo *, main *')) {
    if (SVG.includes(el.tagName.toLowerCase()) || !vis(el) || el.closest('.navegacao, .folha, .cortina, .tela-cheia, [style*="position: fixed"]')) continue;
    if (getComputedStyle(el).position === 'fixed') continue;
    if (el.children.length && ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom > b.top + 2 && r.top < b.top) { const d = Math.round(r.bottom - b.top); if (!pior || d > pior.d) pior = { d, el: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0], t: (el.innerText || '').trim().slice(0, 30) }; }
  }
  const abas = [...document.querySelectorAll('.navegacao .aba')].map((a) => { const r = a.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
  return { fim: se.scrollTop + H >= se.scrollHeight - 2, sh: se.scrollHeight, barraTop: Math.round(b.top), pior, abas };
})()`;
let problemas = 0;
for (const W of [360, 390]) {
  const Hh = W === 360 ? 740 : 844;
  await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: Hh, deviceScaleFactor: 2, mobile: true });
  for (const rota of rotas) {
    await cmd('Page.navigate', { url: BASE + '?r=' + Math.random() + rota });
    await dormir(2300);
    await av("document.scrollingElement.scrollTop = 1e6; 'ok'");
    await dormir(600);
    const m = await av(MEDIR);
    if (m && (m.pior || (m.abas || []).some((a) => { const [w, h] = a.split('x').map(Number); return (w && w < 44) || (h && h < 44); }))) problemas++;
    console.log(W, rota, JSON.stringify(m));
  }
}
await fechar();
console.log(problemas ? '\n' + problemas + ' medida(s) com conteúdo sob a barra ou aba menor que 44px' : '\nnada sob a barra; abas com 44px ou mais');
process.exit(problemas ? 1 : 0);
