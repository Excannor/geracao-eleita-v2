// Os modelos de story das frases com arte própria (01e-story-artes.js), no app de verdade num
// Chrome sem interface: para cada frase com arte, a folha da ofensiva abre com ela, o
// Compartilhar manda um PNG de 1080x1920 desenhado (não vazio), com a chama e a contagem no
// topo, e diferente do modelo de sempre; uma frase sem arte continua no modelo de sempre.
// Os desenhos vêm de um arquivo à parte (story-artes.<resumo>.js), pedido só na hora: o teste
// confere que ele não vem com o app, que sem ele o story sai no modelo de sempre e que, de
// volta, ele carrega uma vez só.
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
// Rede que não responde, simulada na página (o service worker busca os arquivos por conta
// própria, então não dá para segurar o pedido no navegador): o script das artes ou a imagem
// das montanhas são pedidos e nunca chegam, nem com erro.
const SEGURAR = `window.__segurar = (alvo) => {
  if (alvo === 'artes') {
    const original = document.head.appendChild;
    document.head.appendChild = function (n) { return n && n.tagName === 'SCRIPT' && /story-artes/.test(n.src) ? n : original.call(this, n); };
    return () => { document.head.appendChild = original; };
  }
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', { configurable: true, get() { return d.get.call(this); },
    set(v) { if (!/montanhas/.test(v)) d.set.call(this, v); } });
  return () => Object.defineProperty(HTMLImageElement.prototype, 'src', d);
};`;
async function semResposta(alvo, expr) {
  await av(SEGURAR + ' window.__soltar = __segurar(' + JSON.stringify(alvo) + '); true');
  try { return await av(expr); } finally { await av('window.__soltar(); true'); }
}
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
  ok(Array.isArray(artes) && artes.length === 30, 'há 30 frases com arte própria (' + (artes || []).map((f) => f.arte).join(', ') + ')');
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
  // Os desenhos das artes vêm num arquivo à parte, só quando um story desses é gerado.
  ok(await av('!CC.story.artes && !document.querySelector("script[src*=story-artes]") && /^story-artes\\.[0-9a-f]{10}\\.js$/.test(window.STORY_ARTES)'),
    'ao abrir o app, os desenhos das artes não vêm junto (só o nome do arquivo: ' + await av('window.STORY_ARTES') + ')');
  const sw = await av('fetch("./sw.js").then((r) => r.text()).then((t) => t.includes(window.STORY_ARTES) && /caminho-story/.test(t))');
  ok(sw, 'o service worker conhece o arquivo das artes e o guarda no cache próprio');
  const tipo = await av('fetch("./" + window.STORY_ARTES).then((r) => r.ok ? r.headers.get("content-type") : "erro " + r.status)');
  ok(/javascript/.test(tipo || ''), 'o servidor entrega o arquivo das artes como script (' + tipo + ')');
  // rede que não responde: o arquivo das artes nunca chega, e o story não pode ficar preso
  const lento = await semResposta('artes', '(async () => { const t0 = performance.now();'
    + ' const f = await CC.story.preparar({ tipo: "ofensiva", dias: 16, frase: ' + JSON.stringify({ linhas: artes[1].linhas, ref: artes[1].ref || '' }) + ' });'
    + ' const m = await __medir(f); return { ms: performance.now() - t0, m }; })()');
  ok(!!lento && lento.ms < 9000 && lento.m.w === 1080 && Math.abs(lento.m.canto[0] - 0x1b) < 6,
    'com a rede parada no arquivo das artes, o story sai no modelo de sempre em ' + (lento && Math.round(lento.ms)) + ' ms (limite de 6 s)');
  // o mesmo para o versículo: sai na página lisa
  const lentoV = await semResposta('artes', '(async () => { const t0 = performance.now();'
    + ' const f = await CC.story.preparar({ tipo: "versiculo", ref: "João 11.35", texto: "Jesus chorou.", traducao: "Nova Bíblia Viva" });'
    + ' const m = await __medir(f); return { ms: performance.now() - t0, m, artes: !!CC.story.artes }; })()');
  ok(!!lentoV && lentoV.ms < 9000 && lentoV.m.w === 1080 && !lentoV.artes, 'o versículo também não fica preso: sai em ' + (lentoV && Math.round(lentoV.ms)) + ' ms, na página lisa');
  // o pedido segurado desiste sozinho (o mesmo limite) antes do próximo teste
  await dormir(6500);
  // sem o arquivo (sem rede na primeira vez): o story sai no modelo de sempre, sem erro
  await av('window.__artesReal = window.STORY_ARTES; window.STORY_ARTES = "story-artes.0000000000.js"; true');
  const semArquivo = await abrirECompartilhar(artes[0]);
  ok(!!semArquivo && semArquivo.w === 1080 && semArquivo.h === 1920 && Math.abs(semArquivo.canto[0] - 0x1b) < 6 && Math.abs(semArquivo.canto[2] - 0x1a) < 6,
    'sem o arquivo das artes, o story sai no modelo de sempre (canto ' + (semArquivo && semArquivo.canto.join(',')) + ')');
  ok(await av('!CC.story.artes'), 'e os desenhos continuam sem carregar');
  await av('window.STORY_ARTES = window.__artesReal; true');
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
  ok(await av('!!CC.story.artes && document.querySelectorAll("script[src*=story-artes]").length === 1'), 'com o arquivo de volta, os desenhos carregam uma vez só, na hora de gerar');
  // a foto do "Jesus é suficiente" (story-foto-suficiente.<resumo>.webp): vem com as artes,
  // só na hora; sem ela, o modelo sai com a ilustração, e o próximo toque tenta de novo
  const suf = artes.find((f) => f.arte === 'suficiente');
  const fotoReal = await av('(window.STORY_FOTOS || {}).suficiente || ""');
  ok(/^story-foto-suficiente\.[0-9a-f]{10}\.webp$/.test(fotoReal), 'o nome da foto vem no arquivo das artes, não no index.html (' + fotoReal + ')');
  ok(await av('fetch("./sw.js").then((r) => r.text()).then((t) => t.includes(' + JSON.stringify(fotoReal) + '))'), 'o service worker guarda a foto no cache das artes');
  ok(await av('fetch("./index.html").then((r) => r.text()).then((t) => !t.includes("story-foto-"))'), 'o index.html não menciona a foto');
  const comFoto = await av('!!performance.getEntriesByType("resource").find((e) => e.name.includes(' + JSON.stringify(fotoReal) + ')) && CC.story.arteCompleta("suficiente")');
  ok(comFoto, 'o story "Jesus é suficiente" baixou a foto e saiu com ela');
  // os do padrão da landing usam as fotos dela no meio da arte (story-foto-culto, -cruz, -abertura)
  const landing = ['avivados', 'naotemas', 'rei'];
  ok(await av('Promise.all(' + JSON.stringify(landing) + '.map((n) => CC.story.prepararArte(n))).then((l) => l.every(Boolean) && '
    + JSON.stringify(landing) + '.every((n) => CC.story.arteCompleta(n)) && ["culto", "cruz", "abertura"].every((f) => /^story-foto-' + '[a-z]+\\.[0-9a-f]{10}\\.webp$/.test((window.STORY_FOTOS || {})[f] || "")))'),
    'Avivados, Não temas e Jesus is my King baixam as fotos da landing (culto, cruz, abertura)');
  const mFoto = await abrirECompartilhar(suf);
  await av('location.reload(); true');
  await dormir(500);
  await esperar('!!(window.CC && CC.folhaOfensiva && CC.story && document.querySelector(".folha-topo, .trilha"))', 15000);
  await dormir(1500);
  await av(SIMULAR);
  await av('(() => { const E = CC.estado(); E.marcadoEm = {}; for (let i = 0; i < 16; i++) E.marcadoEm["t" + i] = CC.somaDias(CC.hojeIso(), -i); return true; })()');
  // a foto falha: as artes carregam e, antes de desenhar, o nome da foto é trocado por um que não existe
  await av('CC.story.carregarArtes().then(() => { window.STORY_FOTOS.suficiente = "story-foto-suficiente.0000000000.webp"; return true; })');
  const mSem = await abrirECompartilhar(suf);
  ok(!!mSem && mSem.w === 1080 && mSem.h === 1920 && mSem.chama && !(await av('CC.story.arteCompleta("suficiente")')),
    'sem a foto, "Jesus é suficiente" sai com a ilustração, sem erro');
  ok(!!mFoto && !!mSem && Math.abs(mFoto.desvio - mSem.desvio) > 1, 'a versão com foto não é a ilustração (desvio ' + (mFoto && mFoto.desvio.toFixed(1)) + ' contra ' + (mSem && mSem.desvio.toFixed(1)) + ')');
  await av('window.STORY_FOTOS.suficiente = ' + JSON.stringify(fotoReal) + '; true');
  const mDeNovo = await abrirECompartilhar(suf);
  ok(!!mDeNovo && await av('CC.story.arteCompleta("suficiente")') && Math.abs(mDeNovo.desvio - mFoto.desvio) < 0.5, 'com a foto de volta, o toque seguinte já sai com a foto');
  ok(fundos.size >= 5, 'os modelos têm fundos diferentes entre si (' + fundos.size + ' fundos)');
  // frase sem arte: o modelo de sempre (o grafite #1b1c1a)
  const comum = await abrirECompartilhar({ linhas: ['Geração', 'inconformada'] });
  ok(!!comum && comum.w === 1080 && Math.abs(comum.canto[0] - 0x1b) < 6 && Math.abs(comum.canto[2] - 0x1a) < 6,
    'frase sem arte continua no modelo de sempre (canto ' + (comum && comum.canto.join(',')) + ')');

  // as montanhas do versículo não chegam (rede parada): sai o fundo de cartaz sem elas, a tempo
  const semMontanha = await semResposta('montanhas', '(async () => { const t0 = performance.now();'
    + ' const f = await CC.story.preparar({ tipo: "versiculo", ref: "Salmos 119.1-10", texto: "Felizes são aqueles que andam por caminhos retos.", traducao: "Nova Bíblia Viva" });'
    + ' const m = await __medir(f); return { ms: performance.now() - t0, m, completo: CC.story.versiculoCompleto() }; })()');
  await dormir(6500);
  ok(!!semMontanha && semMontanha.ms < 9000 && semMontanha.m.w === 1080 && !semMontanha.completo,
    'sem as montanhas, o versículo sai em ' + (semMontanha && Math.round(semMontanha.ms)) + ' ms, no cartaz sem elas');
  // o story de versículo (redesenho): página escura, 1080x1920, com desenho; o trecho que
  // começa no meio da frase (Êxodo 31.3, minúscula) também sai
  const verso = await av('CC.story.preparar({ tipo: "versiculo", ref: "Êxodo 31.3", texto: "e o enchi do Espírito de Deus. Dei a ele habilidade, inteligência e conhecimento artístico", traducao: "Nova Bíblia Viva" }).then(__medir)');
  ok(!!verso && verso.w === 1080 && verso.h === 1920 && verso.desvio > 12 && verso.canto.every((v) => v < 30),
    'o story de versículo sai em 1080x1920, na página escura (canto ' + (verso && verso.canto.join(',')) + ')');
  ok(await av('!!CC.story.fundoCartaz && CC.story.versiculoCompleto() && /^story-foto-montanhas\\.[0-9a-f]{10}\\.webp$/.test((window.STORY_FOTOS || {}).montanhas || "")'),
    'o versículo sai no fundo de cartaz, com as montanhas (arquivo à parte, vindo com as artes)');
  const urlV = await textoGrande('CC.story.preparar({ tipo: "versiculo", ref: "Êxodo 31.3", texto: "e o enchi do Espírito de Deus. Dei a ele habilidade, inteligência e conhecimento artístico", traducao: "Nova Bíblia Viva" }).then((f) => new Promise((r) => { const l = new FileReader(); l.onload = () => r(l.result); l.readAsDataURL(f); }))');
  writeFileSync(join(SAIDA, 'story-versiculo-exodo-31-3.png'), Buffer.from(urlV.split(',')[1], 'base64'));

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
