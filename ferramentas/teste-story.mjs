// Os modelos de story das frases com arte própria (01e-story-artes.js), no app de verdade num
// Chrome sem interface: para cada frase com arte, a folha da ofensiva abre com ela, o
// Compartilhar manda um PNG de 1080x1920 desenhado (não vazio), com a chama e a contagem no
// topo, e diferente do modelo de sempre; uma frase sem arte continua no modelo de sempre.
// As imagens e a folha da ofensiva com cada frase nova (390x844, claro e escuro) vão para
// SAIDA=<pasta> (ou uma pasta temporária), para revisar.
// Uso: CHROME=<chrome> [PORTAS=8821-8829] [SAIDA=<pasta>] node ferramentas/teste-story.mjs
// (rode node build.mjs antes: o servidor entrega o dist/)
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA_NAV = await portaLivre();
const PORTA = await portaLivre();
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SAIDA = process.env.SAIDA || mkdtempSync(join(tmpdir(), 'cc-story-'));
mkdirSync(SAIDA, { recursive: true });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-story-estado-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_ABERTO: '1' },
  stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-story-nav-'));
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
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
});
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const esperar = async (expr, ms = 8000) => {
  for (let t = 0; t < ms; t += 150) {
    if (await av(expr)) return true;
    await dormir(150);
  }
  return false;
};
// Um texto grande (a imagem em base64, de alguns MB) volta em pedaços: numa resposta só, o
// canal com o navegador trava.
async function textoGrande(expr) {
  const n = await av('(async () => { window.__grande = await (' + expr + '); return window.__grande.length; })()');
  let s = '';
  for (let i = 0; i < n; i += 1e6) s += await av('window.__grande.slice(' + i + ',' + (i + 1e6) + ')');
  return s;
}

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });
const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 40; i++) {
  try { await fetch(base); break; } catch { await dormir(150); }
}

// A imagem que o app mandou para a folha de compartilhar do sistema (simulada): tamanho,
// tipo, e se tem desenho de verdade (cores variadas, não um fundo liso), mais a cor do
// canto (o fundo do modelo) e a do topo, onde fica a chama.
const SIMULAR = `window.__simular = () => {
  window.__compartilhado = null;
  navigator.canShare = (d) => !!d && Array.isArray(d.files) && d.files.every((f) => f instanceof File);
  navigator.share = async (d) => { window.__compartilhado = d; };
  return true;
};
window.__medir = async (arquivo) => {
  const img = await createImageBitmap(arquivo);
  const c = document.createElement('canvas');
  c.width = 108; c.height = 192;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, 108, 192);
  const d = x.getImageData(0, 0, 108, 192).data;
  const cores = new Set();
  let soma = 0, soma2 = 0;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    soma += l; soma2 += l * l;
    cores.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
  }
  const n = d.length / 4;
  const px = (X, Y) => { const p = x.getImageData(X, Y, 1, 1).data; return [p[0], p[1], p[2]]; };
  // a chama no topo: algum pixel alaranjado entre y 30 e 45 (de 192), no meio
  let chama = false;
  const topo = x.getImageData(30, 30, 48, 15).data;
  for (let i = 0; i < topo.length; i += 4) if (topo[i] > 190 && topo[i + 1] < 150 && topo[i + 2] < 90) chama = true;
  return { w: img.width, h: img.height, tipo: arquivo.type, nome: arquivo.name, cores: cores.size,
    desvio: Math.sqrt(soma2 / n - (soma / n) ** 2), canto: px(2, 2), chama };
};`;

console.log('\n  Modelos de story das frases com arte\n');
try {
  await cmd('Page.navigate', { url: base + '#/' });
  await esperar('!!(window.CC && CC.folhaOfensiva && CC.story && CC.story.artes && document.querySelector(".folha-topo, .trilha"))', 15000);
  await dormir(2000);
  await av(SIMULAR);
  await av('(() => { const E = CC.estado(); E.marcadoEm = {}; for (let i = 0; i < 16; i++) E.marcadoEm["t" + i] = CC.somaDias(CC.hojeIso(), -i); return true; })()');
  ok(await av('CC.sequencia().atual') === 16, 'a conta de teste está com 16 dias de ofensiva');
  const artes = await av('CC.FRASES_OFENSIVA.filter((f) => f.arte).map((f) => ({ ...f }))');
  ok(Array.isArray(artes) && artes.length === 8, 'há 8 frases com arte própria (' + (artes || []).map((f) => f.arte).join(', ') + ')');
  const fundos = new Set();
  // abre a folha com esta frase (o sorteio é trocado só aqui) e toca em Compartilhar
  const abrirECompartilhar = async (frase) => {
    await av('document.querySelectorAll(".folha, .veu").forEach((e) => e.remove()); true');
    await av('(() => { const f = ' + JSON.stringify(frase) + '; window.__sorteio = window.__sorteio || CC.fraseDaOfensiva;'
      + ' CC.fraseDaOfensiva = () => CC.FRASES_OFENSIVA.find((x) => x.linhas.join(" ") === f.linhas.join(" ") && (x.ref || "") === (f.ref || "")); __simular(); CC.folhaOfensiva(); return true; })()');
    await esperar('!!document.querySelector("[data-compartilhar-ofensiva]")');
    await dormir(600);
    await av('document.querySelector("[data-compartilhar-ofensiva]").click()');
    await esperar('!!window.__compartilhado', 10000);
    return av('(async () => window.__compartilhado ? __medir(window.__compartilhado.files[0]) : null)()');
  };
  for (const f of artes) {
    const m = await abrirECompartilhar(f);
    ok(!!m && m.tipo === 'image/png' && m.w === 1080 && m.h === 1920, f.arte + ': vai um PNG de 1080x1920' + (m ? ' (' + m.w + 'x' + m.h + ')' : ' (nada foi compartilhado)'));
    ok(!!m && m.cores > 40 && m.desvio > 12, f.arte + ': a imagem tem desenho, não é um fundo liso (' + (m && m.cores) + ' cores, desvio ' + (m && m.desvio.toFixed(1)) + ')');
    ok(!!m && m.chama, f.arte + ': a chama da ofensiva está no topo');
    ok(!!m && m.nome === 'geracao-eleita-ofensiva-16-dias.png', f.arte + ': o arquivo se chama geracao-eleita-ofensiva-16-dias.png');
    if (m) fundos.add(m.canto.map((v) => v >> 3).join(','));
    const url = await textoGrande('new Promise((r) => { const l = new FileReader(); l.onload = () => r(l.result); l.readAsDataURL(window.__compartilhado.files[0]); })');
    writeFileSync(join(SAIDA, 'story-' + f.arte + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    // na folha, a frase com arte aparece no carimbo; a que é só arte, só com a referência
    const tela = await av('(() => ({ linhas: [...document.querySelectorAll(".folha-ofensiva .selo-linha")].map((l) => l.textContent), ref: (document.querySelector(".folha-ofensiva .selo-ref") || { textContent: "" }).textContent }))()');
    ok(tela.linhas.join(' ') === f.linhas.join(' ') && tela.ref === (f.ref || ''), f.arte + ': a folha mostra ' + (f.linhas.length ? 'a frase' : 'só a referência') + ' (' + (tela.linhas.join(' / ') || tela.ref) + ')');
  }
  ok(fundos.size >= 5, 'os modelos têm fundos diferentes entre si (' + fundos.size + ' fundos)');
  // frase sem arte: o modelo de sempre (o grafite #1b1c1a)
  const comum = await abrirECompartilhar({ linhas: ['Geração', 'inconformada'] });
  ok(!!comum && comum.w === 1080 && Math.abs(comum.canto[0] - 0x1b) < 6 && Math.abs(comum.canto[2] - 0x1a) < 6,
    'frase sem arte continua no modelo de sempre (canto ' + (comum && comum.canto.join(',')) + ')');

  // a folha da ofensiva com cada frase nova, nos dois temas
  const novas = await av('CC.FRASES_OFENSIVA.slice(18).map((f) => ({ ...f }))');
  for (const tema of ['claro', 'escuro']) {
    await av('CC.guardarTema(' + (tema === 'escuro') + '); true');
    for (const [i, f] of novas.entries()) {
      await av('document.querySelectorAll(".folha, .veu").forEach((e) => e.remove()); true');
      await av('(() => { const f = ' + JSON.stringify(f) + '; CC.fraseDaOfensiva = () => CC.FRASES_OFENSIVA.find((x) => x.linhas.join(" ") === f.linhas.join(" ") && (x.ref || "") === (f.ref || "")); CC.folhaOfensiva(); return true; })()');
      await esperar('!!document.querySelector(".folha-ofensiva")');
      await dormir(700);
      const cabe = await av('(() => [...document.querySelectorAll(".folha-ofensiva .selo-linha")].every((l) => l.scrollWidth <= l.clientWidth + 1 && l.getBoundingClientRect().right <= innerWidth))()');
      ok(cabe, tema + ': o carimbo de "' + (f.linhas.join(' ') || f.ref) + '" cabe na folha');
      const foto = await cmd('Page.captureScreenshot', { format: 'png' });
      const nome = (f.arte || f.linhas.join('-')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
      writeFileSync(join(SAIDA, 'folha-' + String(i + 1).padStart(2, '0') + '-' + nome + '-' + tema + '.png'), Buffer.from(foto.data, 'base64'));
    }
  }
  await av('CC.guardarTema(false); if (window.__sorteio) CC.fraseDaOfensiva = window.__sorteio; true');
  console.log('\n  imagens em ' + SAIDA);
} catch (e) {
  falhas++;
  console.log('  FALHA o teste parou: ' + (e && e.message));
} finally {
  console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  tudo certo\n');
  ws.close();
  fecharArvore(nav, perfil);
  try { servidor.kill(); } catch { /* já saiu */ }
}
await dormir(400);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* o Chrome ainda soltando a pasta */ }
try { rmSync(pastaEstado, { recursive: true, force: true }); } catch { /* idem */ }
process.exit(falhas ? 1 : 0);
