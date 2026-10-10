// A estrada da trilha chega ao troféu e só um balão fica aberto por vez, medido no DOM.
//
// 1. Troféu: em toda unidade aberta, o último ponto da estrada (o fim do traço do SVG) fica a
//    6px ou menos do centro do troféu. Antes uma regra de Configurações (".linha-marco") pegava
//    a linha do troféu e o jogava para a esquerda, e a estrada acabava no meio da tela, solta.
//    Roda com o dia de hoje no meio, no fim e fora de uma unidade, com unidades de 28, 30 e 31
//    dias, só a unidade de hoje aberta e todas abertas, a 360 e 390, claro e escuro.
// 2. Balões: com o balão de um nó aberto (dia lido, dia de hoje, dia adiante, baú fechado) não
//    há outro balão visível (o cartão de hoje, o "Abrir" do baú ou outro balão); o balão não
//    cobre o nó tocado nem sai da tela; fechado, o cartão de hoje volta.
// 3. A trilha não se mexe: o balão flutua por cima dela. Abrir e fechar (dia lido, de hoje,
//    adiante, baú) não muda o offsetTop de nenhuma linha nem o desenho da estrada (o d do
//    path), nem no meio da animação de saída. O balão de outro dia não cobre o cartão de hoje
//    e fica entre a faixa da unidade grudada no alto e a barra de abas. Antes (f90d675) a linha
//    do nó aberto ganhava a altura do balão de margem: a trilha esticava e a estrada ficava
//    44px fora dos nós enquanto o balão saía.
// 4. Centros: o centro desenhado de cada nó (inclusive o de hoje, maior) fica a 2px ou menos
//    do ponto da estrada que é dele, em toda unidade aberta.
// 5. Ritmo: o passo vertical entre centros de nós seguidos (dias e baús) é o mesmo em toda a
//    trilha (diferença ≤ 1px, o de hoje inclusive: o cartão ao lado e a bolinha maior não ocupam
//    fluxo), o passo até o troféu é sempre o mesmo, a curva não tem cotovelo nem reta longa
//    (deslocamento lateral entre nós seguidos ≤ 60px e mudança dele ≤ 54px; a senoide pura dá
//    49 e 42) e o cartão de hoje não encosta em nenhum outro nó, rótulo ou balão.
// 6. Toque: com toque emulado, o nó tocado não encolhe nem muda de lugar (nem pressionado,
//    nem com o balão aberto), não há destaque de toque e, cabendo, a tela não rola.
//
// Uso: CHROME=<chrome> node ferramentas/teste-trilha-estrada.mjs   (PORTA=<n> troca a porta)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { portaLivre, fecharArvore } from './navegador.mjs';

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const PORTA = Number(process.env.PORTA) || 8724;
const PORTA_NAV = await portaLivre();
const pasta = mkdtempSync(join(tmpdir(), 'cc-estrada-'));
const servidor = spawn(process.execPath, [join(import.meta.dirname, '..', 'servidor.mjs'), String(PORTA)],
  { env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json'), CAMINHO_ABERTO: '1' }, stdio: 'ignore' });
const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 60; i++) { try { await fetch(base); break; } catch { await dormir(200); } }
const perfil = mkdtempSync(join(tmpdir(), 'cc-estrada-nav-'));
const nav = spawn(process.env.CHROME || 'chromium', ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
let f = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FALHA') + '  ' + m); if (!c) f++; };
const sair = (codigo) => {
  try { fecharArvore(nav, perfil); } catch { /* ok */ }
  try { servidor.kill(); } catch { /* ok */ }
  try { rmSync(pasta, { recursive: true, force: true }); rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
  process.exit(codigo);
};
let ws;
for (let i = 0; i < 80 && !ws; i++) {
  try {
    const l = await (await fetch('http://127.0.0.1:' + PORTA_NAV + '/json/list')).json();
    const p = l.find((x) => x.type === 'page');
    if (p) ws = new WebSocket(p.webSocketDebuggerUrl);
  } catch { /* subindo */ }
  if (!ws) await dormir(250);
}
if (!ws) { console.log('  FALHA  o Chrome não subiu'); sair(1); }
let seq = 0;
const pend = new Map();
const erros = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.text);
});
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await cmd('Runtime.enable');
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar')}catch(e){}" });

// A distância do fim da estrada ao centro do troféu, em cada unidade aberta.
const MEDIR_TROFEUS = `(() => [...document.querySelectorAll('.nos')].map((nos) => {
  const p = nos.querySelector('.estrada .faixa-estrada'); const t = nos.querySelector('.no-marco');
  if (!p || !t) return { u: t ? t.dataset.marco : '?', dist: 1e9 };
  const n = p.getAttribute('d').match(/-?[\\d.]+/g).map(Number);
  const r = nos.getBoundingClientRect(); const tr = t.getBoundingClientRect();
  const dist = Math.hypot(n[n.length - 2] - (tr.left + tr.width / 2 - r.left), n[n.length - 1] - (tr.top + tr.height / 2 - r.top));
  return { u: t.dataset.marco, dist: Math.round(dist) };
}))()`;
// Balões e cartão de hoje visíveis (sem display:none nem visibility:hidden no caminho).
const VISIVEIS = `[...document.querySelectorAll('.pop-no:not(.saindo), .cartao-no-hoje, .balao')].filter((e) => {
  const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
  for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden') return false; }
  return true; }).map((e) => e.className.split(' ')[0])`;

// O que não pode mudar com o balão: o topo de cada linha da trilha e o traço da estrada.
const RETRATO = `[...document.querySelectorAll('.trilha .nos')].map((nos) => [...nos.querySelectorAll(':scope > .no-linha')].map((l) => l.offsetTop).join(',')
  + '|' + [...nos.querySelectorAll('.estrada path')].map((p) => p.getAttribute('d')).join('|')).join('#')`;
// Nós cujo centro na tela está a mais de 2px do ponto da estrada que é dele.
const FORA_DO_CENTRO = `[...document.querySelectorAll('.trilha .nos')].flatMap((nos) => {
  const p = nos.querySelector('.estrada .faixa-estrada'); if (!p) return ['sem estrada'];
  const n = p.getAttribute('d').match(/-?[\\d.]+/g).map(Number);
  const pts = [[n[0], n[1]]]; for (let i = 2; i < n.length; i += 6) pts.push([n[i + 4], n[i + 5]]);
  const r = nos.getBoundingClientRect();
  return [...nos.querySelectorAll('.no, .no-bau, .no-marco')].map((el, i) => {
    const b = el.getBoundingClientRect(); const pt = pts[i] || [1e9, 1e9];
    const dist = Math.hypot(b.left + b.width / 2 - r.left - pt[0], b.top + b.height / 2 - r.top - pt[1]);
    return dist > 2 ? (el.dataset.dia ? 'dia ' + el.dataset.dia : el.dataset.bau ? 'baú ' + el.dataset.bau : 'troféu') + (el.classList.contains('atual') ? ' (hoje)' : '') + ' a ' + Math.round(dist) + 'px' : '';
  }).filter(Boolean);
})`;
// Onde o balão aberto está: se cobre o nó tocado ou o cartão de hoje (quando o nó é outro) e se
// fica inteiro entre a faixa da unidade grudada no alto e a barra de abas.
const GEOMETRIA = (sel) => `(() => { const pop = document.querySelector('.pop-no:not(.saindo)'); if (!pop) return null;
  const p = pop.getBoundingClientRect(); const no = document.querySelector('${sel}'); const n = no.getBoundingClientRect();
  const cruza = (a, b) => !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right);
  const cartao = document.querySelector('.cartao-no-hoje'); const linha = no.closest('.no-linha');
  const faixa = no.closest('.nos').previousElementSibling; const f = faixa.getBoundingClientRect();
  const nav = document.getElementById('navegacao').getBoundingClientRect();
  return { cobre: cruza(p, n), cobreHoje: !!cartao && !linha.contains(cartao) && cruza(p, cartao.getBoundingClientRect()),
    dentro: p.left >= 0 && p.right <= innerWidth && p.top >= Math.max(0, f.bottom) - 1 && p.bottom <= Math.min(innerHeight, nav.top) + 1 }; })()`;

// Abre o balão do nó, confere que a trilha não se mexeu (aberto, no meio da saída e fechado)
// e devolve a geometria do balão aberto.
async function balaoSemMexer(sel, rotulo) {
  await av(`(() => { document.querySelector('${sel}').scrollIntoView({ block: 'center' }); return 1; })()`);
  await dormir(150);
  const antes = await av(RETRATO);
  await av(`document.querySelector('${sel}').click(); 1`);
  await dormir(700);
  const aberto = await av(RETRATO);
  const g = await av(GEOMETRIA(sel));
  ok(!!g && aberto === antes, rotulo + ': abrir o balão não muda a posição de nenhum nó nem a estrada');
  ok(g && !g.cobre && !g.cobreHoje && g.dentro, rotulo + ': o balão não cobre o nó tocado nem o cartão de hoje e cabe entre a faixa e a barra (' + JSON.stringify(g) + ')');
  return { antes, g };
}
async function fecharSemMexer(antes, rotulo) {
  await av('document.body.click(); 1');
  await dormir(60);
  const saindo = await av(RETRATO);
  await dormir(400);
  const fechado = await av(RETRATO);
  ok(saindo === antes && fechado === antes, rotulo + ': fechar o balão não muda a posição de nenhum nó nem a estrada');
}

// O passo vertical e a curva de cada unidade aberta (ver 5 no alto).
const RITMO = `[...document.querySelectorAll('.trilha .nos')].map((nos) => {
  const els = [...nos.querySelectorAll('.no, .no-bau, .no-marco')];
  const c = els.map((el) => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, m: !!el.dataset.marco }; });
  const passos = [], dxs = [];
  for (let i = 1; i < c.length; i++) if (!c[i].m) { passos.push(c[i].y - c[i - 1].y); dxs.push(c[i].x - c[i - 1].x); }
  let quina = 0; for (let i = 1; i < dxs.length; i++) quina = Math.max(quina, Math.abs(dxs[i] - dxs[i - 1]));
  const cartao = nos.querySelector('.cartao-no-hoje');
  const cruza = (a, b) => !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right);
  const encosta = cartao ? [...nos.querySelectorAll('.no, .no-bau, .no-marco, .rotulo-dia, .balao, .rotulo-no')]
    .filter((e) => !e.closest('.no-linha.hoje') && cruza(e.getBoundingClientRect(), cartao.getBoundingClientRect())).map((e) => e.className.split(' ')[0]) : [];
  const vaza = !!cartao && [...cartao.children].some((f) => f.scrollWidth > f.clientWidth + 1 || f.getBoundingClientRect().right > innerWidth || f.getBoundingClientRect().left < 0);
  return { u: els[els.length - 1].dataset.marco, desvio: Math.round(Math.max(...passos) - Math.min(...passos)), passo: Math.round(passos[0]),
    trofeu: Math.round(c[c.length - 1].y - c[c.length - 2].y), dx: Math.round(Math.max(...dxs.map(Math.abs))), quina: Math.round(quina), encosta, vaza };
})`;
const passosDoTrofeu = new Set();
const passosDaTrilha = new Set();

// Põe a conta com os dias 1..lidos feitos e o dia seguinte como o de hoje.
async function preparar(lidos, todas) {
  await av(`(() => { const E = CC.estado(); E.lidos.splice(0, E.lidos.length, ...Array.from({ length: ${lidos} }, (_, i) => i + 1));
    E.dia = ${Math.min(lidos + 1, 365)}; CC.redesenhar(); return 1; })()`);
  await dormir(250);
  if (todas) {
    for (let i = 0; i < 14; i++) {
      const fechou = await av("(() => { const b = document.querySelector('.corpo-faixa[aria-expanded=\"false\"]'); if (!b) return 0; b.click(); return 1; })()");
      if (!fechou) break;
      await dormir(60);
    }
  }
  await dormir(500);
}

// Unidades: 1 (1-31, 31 dias), 2 (32-59, 28 dias), 4 (91-120, 30 dias).
const CASOS = [
  { lidos: 0, nome: 'dia 1 (início da unidade de 31 dias)' },
  { lidos: 4, nome: 'dia 5 (hoje no meio da curva)' },
  { lidos: 5, nome: 'dia 6 (o cenário do print do dono)' },
  { lidos: 7, nome: 'dia 8 (hoje logo depois de um baú)' },
  { lidos: 15, nome: 'dia 16 (meio da unidade 1)' },
  { lidos: 30, nome: 'dia 31 (último dia da unidade 1, hoje logo acima do troféu)' },
  { lidos: 31, nome: 'dia 32 (unidade 1 concluída, hoje na unidade 2)' },
  { lidos: 58, nome: 'dia 59 (último dia da unidade de 28 dias)' },
  { lidos: 119, nome: 'dia 120 (último dia da unidade de 30 dias)' },
];

for (const [W, H] of [[360, 740], [390, 844]]) {
  for (const tema of ['claro', 'escuro']) {
    await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
    await av("try{localStorage.setItem('cc.tema'," + JSON.stringify(JSON.stringify(tema === 'escuro')) + ')}catch(e){}; 1');
    await cmd('Page.navigate', { url: base + '?r=' + Math.random() + '#/' });
    // espera a trilha aparecer (até 15 s): numa máquina lenta a abertura passa de 2 s
    for (let i = 0; i < 75 && !(await av("!!document.querySelector('.trilha .nos')")); i++) await dormir(200);
    await dormir(400);
    ok(await av("!!document.querySelector('.trilha .nos')"), W + ' ' + tema + ': a trilha abre');
    for (const caso of CASOS) {
      for (const todas of [false, true]) {
        await preparar(caso.lidos, todas);
        const m = await av(MEDIR_TROFEUS);
        const pior = (m || []).reduce((a, b) => (b.dist > a.dist ? b : a), { dist: -1 });
        ok(m && m.length >= (todas ? 12 : 1) && pior.dist <= 6,
          W + ' ' + tema + ', ' + caso.nome + (todas ? ', todas abertas' : '') + ': a estrada chega ao troféu ('
          + (m ? m.length : 0) + ' unidades, maior distância ' + pior.dist + 'px' + (pior.dist > 6 ? ' na unidade ' + pior.u : '') + ')');
        const fora = await av(FORA_DO_CENTRO);
        ok(Array.isArray(fora) && fora.length === 0 && await av("!!document.querySelector('.trilha .no.atual')") === true,
          W + ' ' + tema + ', ' + caso.nome + (todas ? ', todas abertas' : '') + ': cada nó, o de hoje inclusive, centrado na estrada' + (fora && fora.length ? ' (' + fora.slice(0, 4).join('; ') + ')' : ''));
        const ritmo = await av(RITMO);
        const ruins = (ritmo || []).filter((r) => r.desvio > 1 || r.dx > 60 || r.quina > 54 || r.encosta.length || r.vaza);
        (ritmo || []).forEach((r) => { passosDoTrofeu.add(r.trofeu); passosDaTrilha.add(r.passo); });
        ok(ritmo && ritmo.length && ruins.length === 0, W + ' ' + tema + ', ' + caso.nome + (todas ? ', todas abertas' : '')
          + ': passo vertical igual, curva sem cotovelo e cartão de hoje sem encostar em nada'
          + (ruins.length ? ' (' + JSON.stringify(ruins.slice(0, 2)) + ')' : ' (maior desvio ' + Math.max(...ritmo.map((r) => r.desvio)) + 'px, maior deslocamento ' + Math.max(...ritmo.map((r) => r.dx)) + 'px)'));
      }
    }

    ok(passosDaTrilha.size === 1 && passosDoTrofeu.size === 1, W + ' ' + tema + ': o mesmo passo em todas as unidades e casos ('
      + [...passosDaTrilha].join('/') + 'px entre nós, ' + [...passosDoTrofeu].join('/') + 'px até o troféu)');
    passosDaTrilha.clear(); passosDoTrofeu.clear();

    // Toque emulado (ver 6 no alto): hoje no dia 6, como no print do dono.
    await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await preparar(5, false);
    for (const [sel, nome] of [['[data-dia="3"]', 'dia lido'], ['[data-dia="6"]', 'dia de hoje'], ['[data-dia="14"]', 'dia adiante'], ['[data-bau="7"]', 'baú fechado']]) {
      await av(`(() => { const b = document.querySelector('${sel}'); scrollTo(0, 0); scrollTo(0, b.getBoundingClientRect().top + scrollY - innerHeight * .35); return 1; })()`);
      await dormir(300);
      const caixa = `(() => { const b = document.querySelector('${sel}').getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10).join(',') + '@' + scrollY; })()`;
      const antes = await av(caixa);
      const [x, y] = antes.split('@')[0].split(',').map(Number);
      const retrato = await av(RETRATO);
      await cmd('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x + 20, y: y + 20 }] });
      await dormir(60);
      const apertado = await av(caixa);
      const realce = await av(`getComputedStyle(document.querySelector('${sel}')).webkitTapHighlightColor`);
      await cmd('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await dormir(600);
      const aberto = await av(caixa);
      ok(!!(await av("!!document.querySelector('.pop-no:not(.saindo)')")) && apertado === antes && aberto === antes && await av(RETRATO) === retrato && /rgba\(0, 0, 0, 0\)|transparent/.test(realce),
        W + ' ' + tema + ', toque no ' + nome + ': o nó não encolhe nem sai do lugar, sem realce de toque, a tela não rola (' + [antes, apertado, aberto, realce].join(' | ') + ')');
      await av('document.body.click(); 1');
      await dormir(450);
    }
    await cmd('Emulation.setTouchEmulationEnabled', { enabled: false });

    // Balões: hoje no dia 31 (unidade 1), com o baú do dia 28 pronto ("Abrir" à vista).
    await preparar(30, false);
    const antes = await av(VISIVEIS);
    ok(antes.includes('cartao-no-hoje') && antes.includes('balao'), W + ' ' + tema + ': sem balão aberto, o cartão de hoje e o "Abrir" do baú aparecem (' + antes.join(', ') + ')');
    const alvos = [
      ['[data-dia="30"]', 'dia lido'],
      ['[data-dia="31"]', 'dia de hoje'],
      ['[data-dia="5"]', 'dia lido longe de hoje'],
    ];
    for (const [sel, nome] of alvos) {
      const { antes: retrato } = await balaoSemMexer(sel, W + ' ' + tema + ', balão do ' + nome);
      const vis = await av(VISIVEIS);
      ok(vis.length === 1 && vis[0] === 'pop-no', W + ' ' + tema + ', balão do ' + nome + ': só ele visível (' + vis.join(', ') + ')');
      await fecharSemMexer(retrato, W + ' ' + tema + ', balão do ' + nome);
      const depois = await av(VISIVEIS);
      ok(depois.includes('cartao-no-hoje') && !depois.includes('pop-no'), W + ' ' + tema + ', balão do ' + nome + ' fechado: o cartão de hoje volta (' + depois.join(', ') + ')');
    }
    // dia adiante e baú fechado: hoje no dia 3, o dia 10 e o baú do dia 14 ainda vêm; o dia 2
    // (lido, logo acima do cartão de hoje) e o 4 (logo abaixo), colados ao cartão
    await preparar(2, false);
    for (const [sel, nome] of [['[data-dia="10"]', 'dia adiante'], ['[data-bau="14"]', 'baú fechado'], ['[data-dia="2"]', 'dia lido colado ao de hoje'], ['[data-dia="4"]', 'dia seguinte ao de hoje']]) {
      const { antes: retrato } = await balaoSemMexer(sel, W + ' ' + tema + ', balão do ' + nome);
      const vis = await av(VISIVEIS);
      ok(vis.length === 1 && vis[0] === 'pop-no', W + ' ' + tema + ', balão do ' + nome + ': só ele visível (' + vis.join(', ') + ')');
      await fecharSemMexer(retrato, W + ' ' + tema + ', balão do ' + nome);
    }
    // outra unidade: hoje no dia 45 (unidade 2), com todas abertas; dias lidos, hoje e adiante
    await preparar(44, true);
    for (const [sel, nome] of [['[data-dia="44"]', 'dia lido (unidade 2)'], ['[data-dia="45"]', 'dia de hoje (unidade 2)'], ['[data-dia="50"]', 'dia adiante (unidade 2)'], ['[data-dia="100"]', 'dia adiante (unidade 4)']]) {
      const { antes: retrato } = await balaoSemMexer(sel, W + ' ' + tema + ', balão do ' + nome);
      await fecharSemMexer(retrato, W + ' ' + tema + ', balão do ' + nome);
    }
  }
}
ok(erros.length === 0, 'nenhum erro no console' + (erros[0] ? ': ' + erros[0] : ''));
console.log(f ? '\n  ' + f + ' falha(s)' : '\n  tudo certo');
sair(f ? 1 : 0);
