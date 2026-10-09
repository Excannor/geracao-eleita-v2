// Gera as imagens de story fora do app, com as fontes e as peças de verdade
// (src/fontes.css, src/app/01c-arte.js e 01d-story.js), para olhar e comparar composições.
// Uso: CHROME=<chrome> node design/compartilhar/gerar.mjs <pasta-de-saida> <conjunto>
//   conjuntos: artes (os modelos das frases com arte própria), rodada4 (os da terceira leva), modelos (MODELOS=nome,nome: modelos pelo nome), variantes (as três de cada, lado a lado), final (a escolhida nos casos de
//   teste: frase mais curta e mais longa, 1, 16, 100 e 365 dias, versículos curto, médio e
//   longo). Cada caso sai em PNG 1080x1920; as folhas de comparação saem reduzidas.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { portaLivre, fecharArvore } from '../../ferramentas/navegador.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const [saidaArg, conjunto = 'variantes'] = process.argv.slice(2);
if (!saidaArg) { console.log('Uso: CHROME=<chrome> node design/compartilhar/gerar.mjs <saida> [artes|rodada4|modelos|versiculo2|versiculo|variantes|final]'); process.exit(2); }
const saida = resolve(saidaArg);
mkdirSync(saida, { recursive: true });
const CHROME = process.env.CHROME || 'chromium';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const ler = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');
const simbolo = /const CAMINHO_SIMBOLO = '([^']+)'/.exec(ler('src/app/01-nucleo.js'))[1];
const biblia = JSON.parse(ler('conteudo/biblias/nbv.json')).livros;
const trecho = (l, c, de, ate) => biblia[l][c - 1].slice(de - 1, ate).join(' ');
const VERSOS = {
  curto: { ref: 'João 11.35', texto: trecho('João', 11, 35, 35) },
  medio: { ref: 'João 3.16', texto: trecho('João', 3, 16, 16) },
  longo: { ref: '1 Coríntios 13.4-7', texto: trecho('1 Coríntios', 13, 4, 7) },
  dez: { ref: 'Salmos 119.1-10', texto: trecho('Salmos', 119, 1, 10) },
};

const html = `<!doctype html><meta charset="utf-8"><style>${ler('src/fontes.css')}</style><body>
<script>window.CC = {};</script>
<script>CC.CAMINHO_SIMBOLO = ${JSON.stringify(simbolo)};</script>
<script>${ler('src/app/01c-arte.js')}</script>
<script>${ler('src/app/01d-story.js')}</script>
<script>window.STORY_FOTOS = ${JSON.stringify(Object.fromEntries((existsSync(join(RAIZ, 'src', 'story-fotos')) ? readdirSync(join(RAIZ, 'src', 'story-fotos')) : []).filter((f) => f.endsWith('.webp')).map((f) => [f.replace(/\.webp$/, ''), 'file://' + join(RAIZ, 'src', 'story-fotos', f)])))};</script>
<script>${ler('src/app/01e-story-artes.js')}</script>
<script>${ler('design/compartilhar/variantes.js')}</script>
<script>
const porTamanho = CC.FRASES_OFENSIVA.filter((f) => !f.arte).sort((a, b) => a.linhas.join(' ').length - b.linhas.join(' ').length);
const FRASES = { curta: porTamanho[0], longa: porTamanho[porTamanho.length - 1],
  atos: CC.FRASES_OFENSIVA.find((f) => f.ref === 'Atos 17.28'), lucas: CC.FRASES_OFENSIVA.find((f) => f.ref === 'Lucas 9.23') };
for (const f of CC.FRASES_OFENSIVA) if (f.arte) FRASES[f.arte] = f;
window.gerar = async (fn, dados) => {
  await CC.story.prepararFontes();
  const d = Object.assign({}, dados);
  if (typeof d.frase === 'string') d.frase = FRASES[d.frase];
  const arte = d.frase && CC.story.arteDesejada && CC.story.arteDesejada(d.frase);
  if (arte && CC.story.prepararArte) await CC.story.prepararArte(arte);
  if (fn.startsWith('arte:') && CC.story.prepararArte) await CC.story.prepararArte(fn.slice(5));
  if (fn === 'versiculo' && CC.story.prepararVersiculo) await CC.story.prepararVersiculo();
  const tela = CC.story.tela();
  // 'arte:<nome>': um modelo de story pelo nome (para comparar variantes de um modelo)
  const modelo = fn.startsWith('arte:') && CC.story.artes && CC.story.artes[fn.slice(5)];
  const desenhar = modelo || (window.VARIANTES && VARIANTES[fn]) || (CC.story.desenhar && ((ctx, x) => CC.story.desenhar(ctx, fn, x)));
  desenhar(tela.getContext('2d'), d);
  const u = tela.toDataURL('image/png');
  (window.__imgs = window.__imgs || {})[window.__nome] = u;
  return u;
};
window.folha = async (urls, escala) => {
  const imgs = await Promise.all(urls.map((u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; })));
  const w = 1080 * escala, h = 1920 * escala, vao = 24;
  const c = document.createElement('canvas');
  c.width = imgs.length * w + (imgs.length + 1) * vao; c.height = h + 2 * vao;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a8a8a'; ctx.fillRect(0, 0, c.width, c.height);
  imgs.forEach((im, i) => {
    const x = vao + i * (w + vao);
    ctx.drawImage(im, x, vao, w, h);
    // as faixas de 250px que o Instagram cobre, marcadas em vermelho fino
    ctx.strokeStyle = 'rgba(220,0,0,.55)'; ctx.lineWidth = 2;
    ctx.strokeRect(x, vao + 250 * escala, w, h - 500 * escala);
  });
  return c.toDataURL('image/png');
};
</script>`;

const casos = [];
const folhas = [];
if (conjunto === 'versiculo2') {
  // o versículo sobre o fundo de cartaz da marca (o do app)
  const exodo = { ref: 'Êxodo 31.3', texto: trecho('Êxodo', 31, 3, 3) };
  const casosV = { curto: VERSOS.curto, exodo, medio: VERSOS.medio, longo: VERSOS.longo, dez: VERSOS.dez };
  for (const [k, v] of Object.entries(casosV)) casos.push({ nome: 'versiculo-' + k, fn: 'versiculo', dados: { ...v, traducao: 'Nova Bíblia Viva' } });
  folhas.push({ nome: 'folha-versiculo', casos: Object.keys(casosV).map((k) => 'versiculo-' + k) });
} else if (conjunto === 'versiculo') {
  // o redesenho do versículo: A (escura, a do app), B (a mesma, clara) e C (cartaz), com o
  // curto, o que começa no meio da frase (Êxodo 31.3), o longo e o de dez versículos
  const exodo = { ref: 'Êxodo 31.3', texto: trecho('Êxodo', 31, 3, 3) };
  const casosV = { curto: VERSOS.curto, exodo, medio: VERSOS.medio, longo: VERSOS.longo, dez: VERSOS.dez };
  for (const [k, v] of Object.entries(casosV)) {
    casos.push({ nome: 'A-' + k, fn: 'versiculo', dados: { ...v, traducao: 'Nova Bíblia Viva' } });
    casos.push({ nome: 'B-' + k, fn: 'versiculo', dados: { ...v, traducao: 'Nova Bíblia Viva', paleta: 'clara' } });
    casos.push({ nome: 'C-' + k, fn: 'versiculoNovoC', dados: { ...v, traducao: 'Nova Bíblia Viva' } });
  }
  for (const p of ['A', 'B', 'C']) folhas.push({ nome: 'folha-' + p, casos: Object.keys(casosV).map((k) => p + '-' + k) });
} else if (conjunto === 'artes') {
  // os modelos das frases com arte própria (01e-story-artes.js), com 1 e 16 dias
  for (const arte of ['chama', 'luz', 'ninguem', 'oleiro', 'procurado', 'suficiente', 'praticantes', 'porta', 'mesa', 'quemdeusdiz', 'comprado', 'momento', 'tenda', 'diferente', 'custatudo', 'coracao', 'naovivo', 'desistir', 'confie', 'inundados', 'grandeobra', 'vigiem', 'avivados', 'naotemas', 'rei']) for (const dias of [16, 1]) casos.push({ nome: 'arte-' + arte + '-' + dias, fn: 'ofensiva', dados: { dias, frase: arte } });
  folhas.push({ nome: 'folha-artes', casos: ['arte-chama-16', 'arte-luz-16', 'arte-ninguem-16', 'arte-oleiro-16', 'arte-procurado-16', 'arte-suficiente-16', 'arte-praticantes-16', 'arte-porta-16', 'arte-mesa-16', 'arte-quemdeusdiz-16', 'arte-comprado-16', 'arte-momento-16', 'arte-tenda-16', 'arte-diferente-16', 'arte-custatudo-16', 'arte-coracao-16', 'arte-naovivo-16', 'arte-desistir-16', 'arte-confie-16', 'arte-inundados-16', 'arte-grandeobra-16', 'arte-vigiem-16', 'arte-avivados-16', 'arte-naotemas-16', 'arte-rei-16'] });
} else if (conjunto === 'rodada4') {
  // os modelos da terceira leva (avivados, naotemas, rei), com 7 e 120 dias, e a folha lado a lado
  const novos = (process.env.ARTES || 'avivados,naotemas,rei').split(',');
  for (const arte of novos) for (const dias of [7, 120]) casos.push({ nome: 'story-' + arte + '-' + dias, fn: 'ofensiva', dados: { dias, frase: arte } });
  folhas.push({ nome: 'resumo', casos: novos.map((a) => 'story-' + a + '-7') });
} else if (conjunto === 'modelos') {
  // modelos pelo nome (MODELOS=a,b,c), com 7 e 120 dias, e a folha lado a lado com os de 7
  const nomes = (process.env.MODELOS || '').split(',').filter(Boolean);
  for (const m of nomes) for (const dias of [7, 120]) casos.push({ nome: 'story-' + m + '-' + dias, fn: 'arte:' + m, dados: { dias } });
  folhas.push({ nome: process.env.FOLHA || 'resumo', casos: nomes.map((m) => 'story-' + m + '-7') });
} else if (conjunto === 'variantes') {
  const of = { dias: 16, frase: 'atos' };
  for (const v of ['A', 'B', 'C']) casos.push({ nome: 'ofensiva-' + v, fn: 'ofensiva' + v, dados: of });
  for (const v of ['A', 'B', 'C']) casos.push({ nome: 'versiculo-' + v, fn: 'versiculo' + v, dados: { ...VERSOS.medio, traducao: 'Nova Bíblia Viva' } });
  folhas.push({ nome: 'folha-ofensiva', casos: ['ofensiva-A', 'ofensiva-B', 'ofensiva-C'] });
  folhas.push({ nome: 'folha-versiculo', casos: ['versiculo-A', 'versiculo-B', 'versiculo-C'] });
} else {
  const fn = process.env.FN_OFENSIVA || 'ofensiva';
  const fv = process.env.FN_VERSICULO || 'versiculo';
  for (const dias of [1, 16, 100, 365]) for (const frase of ['curta', 'longa']) {
    casos.push({ nome: 'ofensiva-' + dias + '-' + frase, fn, dados: { dias, frase } });
  }
  casos.push({ nome: 'ofensiva-16-atos', fn, dados: { dias: 16, frase: 'atos' } });
  casos.push({ nome: 'ofensiva-7-lucas', fn, dados: { dias: 7, frase: 'lucas' } });
  // sem carimbo à vista (fim da lição antigo): a frase do estágio, quebrada como o carimbo
  casos.push({ nome: 'ofensiva-7-estagio', fn, dados: { dias: 7 } });
  for (const k of Object.keys(VERSOS)) casos.push({ nome: 'versiculo-' + k, fn: fv, dados: { ...VERSOS[k], traducao: 'Nova Bíblia Viva' } });
  folhas.push({ nome: 'folha-ofensiva-dias', casos: ['ofensiva-1-curta', 'ofensiva-16-longa', 'ofensiva-100-curta', 'ofensiva-365-longa'] });
  folhas.push({ nome: 'folha-ofensiva-frases', casos: ['ofensiva-16-atos', 'ofensiva-7-lucas', 'ofensiva-7-estagio', 'ofensiva-1-longa'] });
  folhas.push({ nome: 'folha-versiculo', casos: Object.keys(VERSOS).map((k) => 'versiculo-' + k) });
}

const pasta = mkdtempSync(join(tmpdir(), 'story-'));
writeFileSync(join(pasta, 'p.html'), html);
const porta = await portaLivre();
// --allow-file-access-from-files: as fotos dos modelos vêm do disco e não podem sujar o canvas
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', '--remote-debugging-port=' + porta,
  '--user-data-dir=' + join(pasta, 'perfil'), 'about:blank'], { stdio: 'ignore' });
let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) {
  try { wsUrl = (await (await fetch('http://127.0.0.1:' + porta + '/json/list')).json()).find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch { /* subindo */ }
  if (!wsUrl) await dormir(250);
}
const ws = new WebSocket(wsUrl);
let seq = 0;
const pend = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (method, params = {}) => new Promise((r) => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const av = async (expr) => {
  const m = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (m.result?.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 600));
  return m.result?.result?.value;
};
await cmd('Page.enable');
await cmd('Page.navigate', { url: 'file://' + join(pasta, 'p.html') });
await dormir(1200);
const urls = {};
try {
  for (const c of casos) {
    const t0 = Date.now();
    // a imagem volta em pedaços de 1 MB: uma resposta de vários MB (as artes com grão) trava o canal
    await av('window.__nome = ' + JSON.stringify(c.nome));
    const tam = await av('gerar(' + JSON.stringify(c.fn) + ',' + JSON.stringify(c.dados) + ').then((u) => (window.__u = u).length)');
    let u = '';
    for (let i = 0; i < tam; i += 1e6) u += await av('window.__u.slice(' + i + ',' + (i + 1e6) + ')');
    urls[c.nome] = u;
    writeFileSync(join(saida, c.nome + '.png'), Buffer.from(urls[c.nome].split(',')[1], 'base64'));
    console.log(c.nome + '.png', (Date.now() - t0) + 'ms');
  }
  for (const f of folhas) {
    const nomes = JSON.stringify(f.casos);
    const tamF = await av('folha(' + nomes + '.map((n) => window.__imgs[n]), ' + (f.casos.length > 3 ? 0.36 : 0.45) + ').then((u) => (window.__u = u).length)');
    let u = '';
    for (let i = 0; i < tamF; i += 1e6) u += await av('window.__u.slice(' + i + ',' + (i + 1e6) + ')');
    writeFileSync(join(saida, f.nome + '.png'), Buffer.from(u.split(',')[1], 'base64'));
    console.log(f.nome + '.png');
  }
} finally {
  ws.close();
  fecharArvore(nav, join(pasta, 'perfil'));
  await dormir(500);
  try { rmSync(pasta, { recursive: true, force: true }); } catch { /* o Chrome ainda soltando a pasta */ }
}
process.exit(0);
