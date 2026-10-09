// Parábolas da Bíblia num Chrome sem interface: o cartão do Explorar (também para quem está
// conhecendo Jesus) leva à lista; a lista mostra as publicadas, com os filtros só dos grupos que
// têm parábola; a parábola abre com título, desenho, falas, "O que Jesus está dizendo" e "Pra
// pensar"; "Ler … na Bíblia" abre o leitor no trecho e marca a parábola como lida, e rolar até o
// fim também; a nota escrita fica ligada à parábola; nada estoura a 390 e a 360; os dois temas
// desenham; e a lista e a parábola abertas continuam abrindo sem rede.
// Com CAPTURAS=<pasta>, guarda as telas a 390px, claro e escuro (cartão, lista, cada parábola).
// Uso: CHROME=<chrome> PORTA=8601 PORTAS=8610-8619 node ferramentas/teste-parabolas.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA_NAV = await portaLivre();
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8601;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CAPTURAS = process.env.CAPTURAS ? resolve(process.env.CAPTURAS) : '';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// pasta própria: sem contas.json, o servidor fica aberto e não pede entrada
const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-parabolas-estado-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_ABERTO: '1' },
  stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-parabolas-'));
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
// a tela inteira, da folha do alto ao fim, numa imagem só
async function capturar(nome) {
  if (!CAPTURAS) return;
  await tirarAviso();
  await av('document.fonts.ready.then(() => true)');
  await dormir(400);
  const { cssContentSize } = await cmd('Page.getLayoutMetrics');
  const altura = Math.min(Math.ceil(cssContentSize.height), 12000);
  await tela(390, altura);
  await dormir(400);
  const r = await cmd('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 390, height: altura, scale: 1 }, captureBeyondViewport: true });
  writeFileSync(join(CAPTURAS, nome + '.png'), Buffer.from(r.data, 'base64'));
  await tela(390, 844);
  await dormir(200);
}

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Network.enable');
await tela(390, 844);
// sem a abertura, sem o convite de notificações e sem o tutorial de instalar por cima da tela
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

console.log('\n  Parábolas da Bíblia\n');
const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 40; i++) {
  try { await fetch(base); break; } catch { await dormir(150); }
}

// ---------- o servidor ----------
const html = await (await fetch(base)).text();
const i0 = html.indexOf('window.PARABOLAS=');
const P = i0 > -1 ? JSON.parse(html.slice(i0 + 17, html.indexOf(';window.MAPAS=', i0))) : { itens: [], grupos: [] };
const indice = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'parabolas', 'indice.json'), 'utf8'));
ok(P.itens.length === indice.publicadas.length && P.itens.length >= 1, 'o aplicativo conhece as ' + P.itens.length + ' parábolas publicadas');
const banquete = P.itens.find((p) => p.slug === 'grande-banquete');
ok(!!banquete && banquete.titulo === 'O grande banquete' && banquete.ref === 'Lc 14.15-24', 'o Grande Banquete está publicado (Lc 14.15-24)');
const rArq = await fetch(base + banquete.arquivo, { headers: { 'accept-encoding': 'gzip' } });
ok(rArq.ok && (rArq.headers.get('content-type') || '').includes('json') && rArq.headers.get('content-encoding') === 'gzip'
  && (rArq.headers.get('cache-control') || '').includes('immutable'), 'o arquivo da parábola é JSON comprimido, com cache longo');
const fonte = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'parabolas', 'grande-banquete.json'), 'utf8'));

// ---------- o cartão no Explorar ----------
await cmd('Page.navigate', { url: base + '#/explorar' });
ok(await esperar('!!document.querySelector(".cartao-parabolas")', 12000), 'o Explorar mostra o cartão das parábolas');
await tirarAviso();
ok(await av('document.querySelector(".cartao-mapas").nextElementSibling === document.querySelector(".cartao-parabolas")'), 'o cartão vem logo abaixo de "Mapas dos livros"');
ok(await texto('.parabolas-titulo') === 'Parábolas da Bíblia' && await texto('.parabolas-dica') === 'Histórias que Jesus contava',
  'o cartão diz "Parábolas da Bíblia" e "Histórias que Jesus contava"');
ok(await av('/Permanent Marker/.test(getComputedStyle(document.querySelector(".parabolas-titulo")).fontFamily) && !!document.querySelector(".cartao-parabolas .desenho svg path")'),
  'o título vem no pincel, com o desenho da mesa posta');
ok(await av('document.querySelector(".cartao-parabolas").getBoundingClientRect().height >= 44 && document.querySelector(".cartao-parabolas").getAttribute("href") === "#/parabolas"'), 'o cartão é um link de bom tamanho para a lista');
ok(await semEstouro(), 'nada estoura a largura do Explorar');
await av('document.querySelector(".cartao-parabolas").scrollIntoView({ block: "center" })');
if (CAPTURAS) {
  await tela(390, 844);
  await av('document.querySelector(".cartao-parabolas").scrollIntoView({ block: "center" })');
  await dormir(300);
  const r = await cmd('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(CAPTURAS, 'explorar-390-claro.png'), Buffer.from(r.data, 'base64'));
}
// quem está conhecendo Jesus também vê o cartão
await av('CC.quem = { ...(CC.quem || {}), caminho: "conhecer" }; CC.redesenhar()');
ok(await esperar('!!document.querySelector(".cartao-parabolas") && !!document.querySelector(".cartao-historia[href=\\"#/perguntas\\"]")'), 'quem está conhecendo Jesus também vê o cartão');
await av('CC.quem = { ...(CC.quem || {}), caminho: "plano" }; CC.redesenhar()');
await esperar('!!document.querySelector(".cartao-parabolas")');

// ---------- a lista ----------
await av('document.querySelector(".cartao-parabolas").click()');
ok(await esperar('location.hash === "#/parabolas" && document.querySelectorAll(".item-parabola").length === ' + P.itens.length, 10000), 'o cartão leva à lista, com as publicadas');
ok(await texto('.parabolas-nome') === 'Parábolas da Bíblia' && await av('/Permanent Marker/.test(getComputedStyle(document.querySelector(".parabolas-nome")).fontFamily)'), 'a lista se chama "Parábolas da Bíblia", no pincel');
const chips = await av('JSON.stringify([...document.querySelectorAll(".chip-parabola")].map((c) => c.textContent))');
ok(chips === JSON.stringify(['Todas'].concat(P.grupos.map((g) => g.curto))), 'os filtros são "Todas" e só os grupos com parábola publicada (' + chips + ')');
ok(await av('JSON.stringify([...document.querySelectorAll(".grupo-parabolas h2")].map((h) => h.firstChild.textContent))') === JSON.stringify(P.grupos.map((g) => g.nome)), 'a lista agrupa por onde a parábola está');
ok(await esperar('[...document.querySelectorAll(".item-parabola .desenho")].every((d) => d.querySelector("svg path"))'), 'os desenhos da lista chegam do arquivo próprio');
ok(await av('!document.querySelector(".parabola-lida")'), 'nenhuma parábola marcada como lida no começo');
const ultimoGrupo = P.grupos[P.grupos.length - 1];
await av('document.querySelector(\'[data-filtro="' + ultimoGrupo.id + '"]\').click()');
ok(await esperar('document.querySelector(\'[data-filtro="' + ultimoGrupo.id + '"]\').getAttribute("aria-pressed") === "true" && document.querySelectorAll(".grupo-parabolas").length === 1'), 'o filtro mostra só o grupo escolhido');
await av('document.querySelector(\'[data-filtro="todas"]\').click()');
ok(await av('[...document.querySelectorAll(".item-parabola, .chip-parabola, .mapa-barra .botao-redondo")].every((c) => c.getBoundingClientRect().height >= 40)'), 'itens, filtros e voltar com alvo de toque');
ok(await semEstouro(), 'nada estoura a largura da lista a 390px');
await capturar('lista-390-claro');

// ---------- a parábola ----------
await av('document.querySelector(\'.item-parabola[href="#/parabola/grande-banquete"]\').click()');
ok(await esperar('location.hash === "#/parabola/grande-banquete" && !!document.querySelector(".parabola .dizendo-parabola")', 10000), 'tocar na parábola abre a página dela');
ok(await texto('.parabola-nome') === 'O grande banquete' && await av('document.querySelector(".parabola-nome").getClientRects().length === 1 && document.querySelector(".parabola-nome").scrollWidth <= document.querySelector(".parabola-nome").clientWidth + 1'),
  'o título sai numa linha só, no pincel');
ok(await texto('.folha-parabola .mapa-grupo') === 'Evangelho de Lucas' && /^Lc 14\.15-24 · \d+ min de leitura$/.test(await texto('.parabola-sub')), 'o alto diz o evangelho, a referência e os minutos de leitura');
ok(await av('!!document.querySelector(".parabola-heroi svg path") && document.querySelector(".parabola-heroi").getBoundingClientRect().width >= 200'), 'o desenho grande do banquete está no alto');
const falas = JSON.parse(await av('JSON.stringify([...document.querySelectorAll(".fala-parabola")].map((f) => f.firstChild.textContent))'));
const falasFonte = fonte.secoes.flatMap((s) => s.blocos.filter((b) => b.fala).map((b) => '“' + b.fala + '”'));
ok(falas.length >= 3 && JSON.stringify(falas.map((f) => f.replace(/\u00a0/g, ' ').trim())) === JSON.stringify(falasFonte), 'as falas aparecem destacadas, com as aspas (' + falas.length + ')');
ok(await av('document.querySelectorAll(".itens-parabola .item-cena").length === 3 && [...document.querySelectorAll(".item-cena")].every((c) => c.querySelector(".desenho svg path"))'), 'as três desculpas, cada uma com o seu desenho');
ok(await av('[...document.querySelectorAll(".item-cena b, .item-cena span")].every((el) => el.scrollWidth <= el.clientWidth + 1) && [...document.querySelectorAll(".item-cena .sem-quebra")].every((el) => el.getClientRects().length === 1 && el.getBoundingClientRect().right <= el.closest(".item-cena").getBoundingClientRect().right)'), 'nenhuma palavra das desculpas sai da caixa nem quebra no hífen');
ok(await av('(() => { const p = document.querySelector(".parecida-parabola"); const d = p.querySelector(".desenho"); return d.getBoundingClientRect().width <= 48; })()'), 'o desenho da parecida fica pequeno, ao lado do texto');
ok(await av('document.querySelectorAll(".perguntas-parabola li").length === 2 && !!document.querySelector(".parecida-parabola")'), 'Pra pensar com duas perguntas e a parecida em Mateus');
ok(await texto('.parabola-ler') === 'Ler Lucas 14 na Bíblia', 'o botão diz "Ler Lucas 14 na Bíblia"');
ok(await av('!!document.querySelector(\'[data-notas-contexto="parabola:grande-banquete"] [data-escrever-contexto]\')'), 'a parábola tem "Escrever nota", com as notas dela');
ok(await semEstouro(), 'nada estoura a largura da parábola a 390px');
ok(await av('[...document.querySelectorAll(".desenho .k")].slice(0, 3).every((k) => getComputedStyle(k).stroke !== "none")'), 'os traços dos desenhos seguem as fichas do tema');
await capturar('grande-banquete-390-claro');
await tela(360, 780);
await dormir(300);
ok(await semEstouro() && await av('document.querySelector(".parabola-nome").scrollWidth <= document.querySelector(".parabola-nome").clientWidth + 1'), 'nada estoura a 360px, e o título ainda cabe');
await tela(390, 844);

// rolar até o fim marca como lida (as capturas, com a tela do tamanho da página, já a viram inteira)
await av('CC.gravar("parabolasLidas", {}); CC.redesenhar()');
await esperar('!!document.querySelector("[data-fim-parabola]")');
await av('CC.rolarPara(0)');
await dormir(300);
ok(await av('!(CC.estado().parabolasLidas || {})["grande-banquete"]'), 'abrir não marca como lida');
await av('document.querySelector("[data-fim-parabola]").scrollIntoView({ block: "end" })');
ok(await esperar('!!(CC.estado().parabolasLidas || {})["grande-banquete"]'), 'rolar até o fim marca a parábola como lida');

// a nota fica ligada à parábola
await av('document.querySelector("[data-escrever-contexto]").click()');
ok(await esperar('!!document.querySelector(".folha-editor #campo-nota") && /grande banquete/.test(document.querySelector(".folha-editor").innerText)'), 'o editor de notas abre ligado à parábola');
await av('(() => { const c = document.querySelector("#campo-nota"); c.value = "Quem eu chamo pra minha mesa"; c.dispatchEvent(new Event("input", { bubbles: true })); })()');
await av('document.querySelector(".folha-editor [data-guardar]").click()');
ok(await esperar('/Quem eu chamo/.test(document.querySelector("[data-notas-contexto]").innerText) && CC.notas().some((n) => n.contexto === "parabola:grande-banquete")'), 'a nota aparece na parábola e fica ligada a ela');
await esperar('!document.querySelector(".folha-editor")');

// na lista, a marca de lida
await av('location.hash = "#/parabolas"');
ok(await esperar('/lida/.test((document.querySelector(\'.item-parabola[href="#/parabola/grande-banquete"] .parabola-lida\') || {}).textContent || "")'), 'na lista, a parábola aparece com "✓ lida"');
await capturar('lista-lida-390-claro');

// "Ler na Bíblia" abre o leitor no trecho e também marca como lida
await av('CC.gravar("parabolasLidas", {}); location.hash = "#/parabola/grande-banquete"');
await esperar('!!document.querySelector(".parabola-ler")');
await av('document.querySelector(".parabola-ler").click()');
ok(await esperar('location.hash === "#/biblia/Lucas/14" && !!document.querySelector(\'.leitor-verso.escolhido[data-v="14:15"]\')', 12000), '"Ler na Bíblia" abre Lucas 14 com o começo da parábola escolhido');
ok(await av('!!(CC.estado().parabolasLidas || {})["grande-banquete"]'), 'e marca a parábola como lida');
await av('history.back()');
await esperar('location.hash === "#/parabola/grande-banquete"');

// ---------- tema escuro ----------
await av('localStorage.setItem("cc.tema", "true"); location.hash = "#/explorar"; location.reload()');
ok(await esperar('document.documentElement.dataset.tema === "escuro" && !!document.querySelector(".cartao-parabolas")', 12000), 'o cartão aparece no tema escuro');
if (CAPTURAS) {
  await tirarAviso();
  await av('document.querySelector(".cartao-parabolas").scrollIntoView({ block: "center" })');
  await dormir(300);
  const r = await cmd('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(CAPTURAS, 'explorar-390-escuro.png'), Buffer.from(r.data, 'base64'));
}
await av('location.hash = "#/parabolas"');
ok(await esperar('document.querySelectorAll(".item-parabola .desenho svg").length === ' + P.itens.length, 10000), 'a lista abre no tema escuro');
await capturar('lista-390-escuro');
await av('location.hash = "#/parabola/grande-banquete"');
ok(await esperar('!!document.querySelector(".parabola .dizendo-parabola")', 10000), 'a parábola abre no tema escuro');
ok(await av('(() => { const k = document.querySelector(".parabola .item-cena .k"); const fundo = getComputedStyle(document.body).backgroundColor; return getComputedStyle(k).stroke !== "rgb(21, 22, 21)" && fundo !== "rgb(244, 245, 240)"; })()'), 'no escuro, o traço dos desenhos fica claro');
await capturar('grande-banquete-390-escuro');
await av('localStorage.setItem("cc.tema", "false")');

// ---------- sem rede ----------
const guardou = await esperar('caches.open("caminho-parabolas").then((c) => c.keys()).then((k) => ["parabola-tela.", "parabolas-desenhos.", "parabola-grande-banquete."].every((n) => k.some((p) => p.url.includes(n))))', 10000);
ok(guardou, 'a tela, os desenhos da lista e a parábola aberta ficaram no cache das parábolas');
await cmd('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
servidor.kill();
await dormir(500);
const excecoes = (lista) => lista.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.exception?.description || 'exceção');
const errosComRede = excecoes(evs);
evs.length = 0;
await av('location.hash = "#/"');
await cmd('Page.reload', {});
ok(await esperar('!!document.querySelector(".no")', 12000), 'o aplicativo abre sem rede');
await av('location.hash = "#/parabolas"');
ok(await esperar('document.querySelectorAll(".item-parabola .desenho svg").length === ' + P.itens.length, 10000), 'sem rede, a lista abre com os desenhos');
await av('location.hash = "#/parabola/grande-banquete"');
ok(await esperar('document.querySelectorAll(".fala-parabola").length >= 3 && !!document.querySelector(".parabola-heroi svg")', 10000), 'sem rede, a parábola guardada abre inteira');

const erros = errosComRede.concat(excecoes(evs));
ok(erros.length === 0, 'nenhuma exceção de JavaScript' + (erros[0] ? ': ' + erros[0].slice(0, 90) : ''));

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  as parábolas funcionam inteiras\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
try { rmSync(pastaEstado, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
