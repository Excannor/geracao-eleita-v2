// Compartilhar em imagem de story (01d-story.js) num Chrome sem interface: a folha da ofensiva
// gera a imagem com a MESMA frase do carimbo que está na tela, o arquivo vai para a folha de
// compartilhar do sistema (navigator.share com files, simulado aqui), sem ela a imagem é
// baixada com aviso, e o "toque de novo" do Safari funciona. As imagens que saem (e a folha nos
// dois temas) vão para uma pasta temporária, ou para SAIDA=<pasta>, para revisar com calma; as
// de referência estão em design/compartilhar/app/.
// Uso: CHROME=<chrome> [SAIDA=<pasta>] node ferramentas/teste-compartilhar.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA_NAV = await portaLivre();
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8391;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SAIDA = process.env.SAIDA || mkdtempSync(join(tmpdir(), 'cc-compartilhar-imagens-'));
mkdirSync(SAIDA, { recursive: true });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-compartilhar-estado-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_ABERTO: '1' },
  stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-compartilhar-'));
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

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });
const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 40; i++) {
  try { await fetch(base); break; } catch { await dormir(150); }
}

// A folha de compartilhar do sistema, simulada: guarda o que o app mandou. modo: 'aceita'
// (Android/iPhone), 'nega' (o Safari recusando por falta de toque recente), 'sem' (sem Web
// Share com arquivo: o app baixa a imagem).
const SIMULAR = `window.__simular = (modo) => {
  window.__compartilhado = null;
  window.__baixado = null;
  if (modo === 'sem') { navigator.canShare = undefined; navigator.share = undefined; }
  else {
    navigator.canShare = (d) => !!d && Array.isArray(d.files) && d.files.every((f) => f instanceof File);
    navigator.share = async (d) => {
      if (window.__negar) { window.__negar = false; throw new DOMException('sem toque', 'NotAllowedError'); }
      window.__compartilhado = d;
    };
    window.__negar = modo === 'nega';
  }
  if (!window.__clique) {
    window.__clique = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) window.__baixado = { nome: this.download, href: this.href }; else window.__clique.call(this); };
  }
  return true;
};
window.__png = async (arquivo) => {
  const b = await new Promise((r) => { const l = new FileReader(); l.onload = () => r(l.result); l.readAsDataURL(arquivo); });
  const img = await createImageBitmap(arquivo);
  return { url: b, w: img.width, h: img.height, nome: arquivo.name, tipo: arquivo.type };
};`;
const guardarPng = (nome, url) => writeFileSync(join(SAIDA, nome), Buffer.from(url.split(',')[1], 'base64'));

console.log('\n  Compartilhar em imagem de story\n');
try {

// ---------- a folha da ofensiva ----------
await cmd('Page.navigate', { url: base + '#/' });
await esperar('!!(window.CC && CC.folhaOfensiva && document.querySelector(".folha-topo, .trilha"))', 15000);
// o app ainda pode trocar de tela logo depois de abrir (e fechar uma folha aberta cedo demais)
await dormir(2000);
await av(SIMULAR);
// 16 dias seguidos até hoje
await av('(() => { const E = CC.estado(); E.marcadoEm = {}; for (let i = 0; i < 16; i++) E.marcadoEm["t" + i] = CC.somaDias(CC.hojeIso(), -i); return CC.sequencia().atual; })()');
ok(await av('CC.sequencia().atual') === 16, 'a conta de teste está com 16 dias de ofensiva');
await av('__simular("aceita")');
await av('CC.folhaOfensiva()');
ok(await esperar('!!document.querySelector(".folha-ofensiva [data-compartilhar-ofensiva]")'), 'a folha da ofensiva tem o botão Compartilhar');
const botao = await av('(() => { const b = document.querySelector("[data-compartilhar-ofensiva]"); const r = b.getBoundingClientRect(); return { texto: b.textContent.trim(), h: r.height, w: r.width }; })()');
ok(botao.texto === 'Compartilhar' && botao.h >= 44, 'o botão se chama Compartilhar e tem 44px ou mais de altura (' + botao.h + ')');
// a frase que está na tela, lida do carimbo
const lema = await av('(() => ({ linhas: [...document.querySelectorAll(".folha-ofensiva .selo-linha")].map((l) => l.textContent), ref: (document.querySelector(".folha-ofensiva .selo-ref") || { textContent: "" }).textContent }))()');
await dormir(900);
await av('document.querySelector("[data-compartilhar-ofensiva]").click()');
ok(await esperar('!!window.__compartilhado'), 'tocar em Compartilhar abre a folha de compartilhar do sistema');
const doc = await av('(async () => { const d = window.__compartilhado; const p = await __png(d.files[0]); return { ...p, texto: d.text, n: d.files.length, url2: d.url || "" }; })()');
ok(doc.n === 1 && doc.tipo === 'image/png' && doc.w === 1080 && doc.h === 1920, 'vai um arquivo PNG de 1080x1920 (' + doc.w + 'x' + doc.h + ')');
ok(doc.nome === 'geracao-eleita-ofensiva-16-dias.png', 'o arquivo se chama geracao-eleita-ofensiva-16-dias.png (' + doc.nome + ')');
ok(/16 dias/.test(doc.texto) && /geracaoeleita\.app/.test(doc.texto), 'o texto com o endereço do app vai junto (' + doc.texto + ')');
// a imagem leva exatamente a frase do carimbo: o mesmo pedido, montado com a frase lida da
// tela, dá o mesmo arquivo (a imagem é guardada pelo pedido)
ok(await av('CC.story.preparar({ tipo: "ofensiva", dias: 16, frase: ' + JSON.stringify(lema) + ' }).then((f) => f === window.__compartilhado.files[0])'),
  'a imagem leva a mesma frase do carimbo da tela (' + lema.linhas.join(' / ') + ')');
guardarPng('ofensiva-16-folha.png', doc.url);
// abrir de novo sorteia outra frase, e a imagem acompanha
await av('document.querySelectorAll(".folha, .veu").forEach((e) => e.remove())');
await av('__simular("aceita"); CC.folhaOfensiva()');
await esperar('!!document.querySelector("[data-compartilhar-ofensiva]")');
const lema2 = await av('(() => ({ linhas: [...document.querySelectorAll(".folha-ofensiva .selo-linha")].map((l) => l.textContent), ref: (document.querySelector(".folha-ofensiva .selo-ref") || { textContent: "" }).textContent }))()');
await av('document.querySelector("[data-compartilhar-ofensiva]").click()');
await esperar('!!window.__compartilhado');
ok(lema2.linhas.join(' ') !== lema.linhas.join(' ')
  && await av('CC.story.preparar({ tipo: "ofensiva", dias: 16, frase: ' + JSON.stringify(lema2) + ' }).then((f) => f === window.__compartilhado.files[0])'),
'abrindo de novo, a frase nova do carimbo é a que vai na imagem');

// o Safari recusa quando passou tempo demais desde o toque: o app avisa e o segundo toque vai
await av('__simular("nega")');
await av('document.querySelector("[data-compartilhar-ofensiva]").click()');
ok(await esperar('/Toque de novo/.test((document.getElementById("aviso-flutuante") || {}).textContent || "")'), 'se o navegador recusa, o aviso pede um toque de novo');
await av('document.querySelector("[data-compartilhar-ofensiva]").click()');
ok(await esperar('!!window.__compartilhado'), 'o segundo toque abre o compartilhamento com a imagem já pronta');

// sem Web Share com arquivo: baixa a imagem e diz como postar
await av('__simular("sem")');
await av('document.querySelector("[data-compartilhar-ofensiva]").click()');
ok(await esperar('!!window.__baixado'), 'sem compartilhamento de arquivo, a imagem é baixada');
ok(await av('window.__baixado && window.__baixado.nome === "geracao-eleita-ofensiva-16-dias.png"'), 'o arquivo baixado tem o mesmo nome');
ok(await esperar('/Instagram/.test((document.getElementById("aviso-flutuante") || {}).textContent || "") && /WhatsApp/.test(document.getElementById("aviso-flutuante").textContent)'),
  'o aviso diz como postar no Instagram e no WhatsApp');
await av('document.querySelectorAll(".folha, .veu").forEach((e) => e.remove())');

// a folha com o botão, nos dois temas (rolada até o fim, onde ficam os botões)
for (const tema of ['claro', 'escuro']) {
  await av('CC.guardarTema(' + (tema === 'escuro') + '); __simular("aceita"); (() => { const E = CC.estado(); for (let i = 0; i < 16; i++) E.marcadoEm["t" + i] = CC.somaDias(CC.hojeIso(), -i); })(); CC.folhaOfensiva()');
  await esperar('!!document.querySelector("[data-compartilhar-ofensiva]")');
  await dormir(700);
  await av('(() => { const b = document.querySelector("[data-compartilhar-ofensiva]"); b.scrollIntoView({ block: "end" }); const f = b.closest(".folha"); if (f) f.scrollTop = f.scrollHeight; return true; })()');
  await av('(() => { const a = document.getElementById("aviso-flutuante"); if (a) a.remove(); return true; })()');
  await dormir(300);
  const foto = await cmd('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SAIDA, 'folha-ofensiva-' + tema + '.png'), Buffer.from(foto.data, 'base64'));
  ok(await av('(() => { const b = document.querySelector("[data-compartilhar-ofensiva]").getBoundingClientRect(); const v = document.querySelector("[data-ver-amigos]").getBoundingClientRect(); return b.right <= innerWidth && v.right <= innerWidth && (b.bottom <= v.top + 1 || b.right <= v.left + 1); })()'),
    'no tema ' + tema + ', Compartilhar e Ver amigos cabem lado a lado ou um embaixo do outro, sem se cobrir');
  await av('document.querySelectorAll(".folha, .veu").forEach((e) => e.remove())');
}
await av('CC.guardarTema(false)');

// sem ofensiva, sem botão (não há o que mostrar)
await av('(() => { CC.estado().marcadoEm = {}; return true; })()');
await av('CC.folhaOfensiva()');
await esperar('!!document.querySelector(".folha-ofensiva")');
ok(await av('!document.querySelector("[data-compartilhar-ofensiva]")'), 'com 0 dias a folha não oferece Compartilhar');
await av('document.querySelectorAll(".folha, .veu").forEach((e) => e.remove())');

// as imagens de referência, para a revisão a olho: 1, 100 e 365 dias com a frase mais curta e
// a mais longa da lista, e a frase do estágio (sem carimbo à vista)
const casos = await av(`(async () => {
  const por = [...CC.FRASES_OFENSIVA].sort((a, b) => a.linhas.join(" ").length - b.linhas.join(" ").length);
  const curta = por[0], longa = por[por.length - 1];
  const saida = {};
  for (const [nome, p] of [["ofensiva-1-curta", { dias: 1, frase: curta }], ["ofensiva-100-longa", { dias: 100, frase: longa }],
    ["ofensiva-365-curta", { dias: 365, frase: curta }], ["ofensiva-7-estagio", { dias: 7 }]]) {
    const f = await CC.story.preparar({ tipo: "ofensiva", ...p });
    saida[nome] = (await __png(f)).url;
  }
  return saida;
})()`);
for (const [nome, url] of Object.entries(casos || {})) guardarPng(nome + '.png', url);
ok(Object.keys(casos || {}).length === 4, 'as imagens de 1, 7, 100 e 365 dias saem (' + SAIDA + ')');

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
