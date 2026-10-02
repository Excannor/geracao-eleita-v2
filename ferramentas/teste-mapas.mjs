// Mapa do livro num Chrome sem interface: abre o Explorar, a grade dos 66 e o mapa de Isaías
// e confere que as setas e os desenhos estão no lugar, que a curva de cada conexão não cruza o
// texto, que nada estoura a largura a 390 e a 360, que os dois temas desenham, que o progresso
// do plano marca a estrutura, que a Bíblia do app segue igual e que o mapa abre sem rede.
// Uso: CHROME=<chrome> node ferramentas/teste-mapas.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA_NAV = await portaLivre();
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8373;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// pasta própria: sem contas.json, o servidor fica aberto e não pede entrada
const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-mapas-estado-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_ABERTO: '1' },
  stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-mapas-'));
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
// O texto na tela leva espaço inseparável e juntor de palavras ("Isaías 1", "6.1-4"): compara sem eles.
const texto = (sel) => av('(document.querySelector(' + JSON.stringify(sel) + ') || { textContent: "" }).textContent.replace(/\\u00a0/g, " ").replace(/\\u2060/g, "")');
const esperar = async (expr, ms = 8000) => {
  for (let t = 0; t < ms; t += 150) {
    if (await av(expr)) return true;
    await dormir(150);
  }
  return false;
};
const tela = (w, h) => cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Network.enable');
await tela(390, 844);
// sem a abertura, sem o convite de notificações e sem o tutorial de instalar por cima da tela
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });

console.log('\n  Mapa do livro\n');
const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 40; i++) {
  try { await fetch(base); break; } catch { await dormir(150); }
}

// ---------- o servidor ----------
const html = await (await fetch(base)).text();
const i0 = html.indexOf('window.MAPAS=');
const mapas = i0 > -1 ? JSON.parse(html.slice(i0 + 13, html.indexOf(';window.BIBLIAS=', i0))) : [];
const isaias = mapas.find((m) => m.slug === 'isaias');
ok(!!isaias && isaias.nome === 'Isaías' && isaias.numero === 23 && isaias.capitulos === 66, 'o aplicativo conhece o mapa de Isaías (livro 23, 66 capítulos)');
const rMapa = await fetch(base + isaias.arquivo, { headers: { 'accept-encoding': 'gzip' } });
ok(rMapa.ok && (rMapa.headers.get('content-type') || '').includes('json') && rMapa.headers.get('content-encoding') === 'gzip',
  'o arquivo do mapa é servido como JSON comprimido');
ok((rMapa.headers.get('cache-control') || '').includes('immutable'), 'o mapa tem o resumo no nome e cache longo (' + rMapa.headers.get('cache-control') + ')');
const indice = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'mapas', 'indice.json'), 'utf8'));
ok(mapas.length === indice.publicados.length, 'só os mapas publicados no índice vão ao ar (' + mapas.length + ')');

// ---------- o Explorar e a grade dos 66 ----------
await cmd('Page.navigate', { url: base + '#/explorar' });
ok(await esperar('!!document.querySelector("#mapas-dos-livros")'), 'o Explorar mostra a seção "Mapas dos livros"');
ok(await av('document.querySelectorAll(".celula-mapa").length === 66'), 'a grade tem os 66 livros');
ok(await av('document.querySelectorAll(".grupo-mapas").length === 9 && document.querySelector(".grupo-mapas").textContent === "Lei"'), 'os 66 vêm em nove grupos, da Lei ao Apocalipse');
ok(await av('document.querySelectorAll("a.celula-mapa.pronto").length === ' + mapas.length + ' && !!document.querySelector(\'a.celula-mapa[href="#/mapa/isaias"]\')'),
  'só os livros com mapa viram link; Isaías leva a #/mapa/isaias');
ok(await av('[...document.querySelectorAll(".celula-mapa.breve")].every((c) => c.textContent.includes("em breve") && c.tagName !== "A") && document.querySelectorAll(".celula-mapa.breve").length === 66 - ' + mapas.length),
  'os livros sem mapa aparecem como "em breve", sem link');
ok(await av('/Permanent Marker/.test(getComputedStyle(document.querySelector(".nome-mapa")).fontFamily)'), 'os nomes da grade estão no pincel (Permanent Marker)');
const tamanhos = await av('JSON.stringify([...new Set([...document.querySelectorAll(".nome-mapa")].map((n) => n.style.fontSize))].sort())');
ok(tamanhos === '["15px","17px","20px"]', 'o tamanho do nome vem do comprimento: 20, 17 ou 15px (' + tamanhos + ')');
const estouro = (largura) => av('JSON.stringify([...document.querySelectorAll(".nome-mapa")].filter((n) => n.scrollWidth > n.clientWidth + 1 || n.getClientRects().length > 1).map((n) => n.textContent))');
ok(await estouro() === '[]', 'nenhum nome quebra no meio nem sai da célula a 390px');
ok(await av('[...document.querySelectorAll("a.celula-mapa")].every((c) => c.getBoundingClientRect().height >= 44)'), 'as células com mapa têm alvo de toque de 44px');
ok(await av('document.documentElement.scrollWidth - innerWidth') <= 0, 'nada estoura a largura do Explorar');
// No dia 1 o plano lê Gênesis, que tem mapa: o cartão do alto leva direto a ele.
ok(await av('(() => { const c = document.querySelector(".cartao-mapas"); return !!c && c.getAttribute("href") === "#/mapa/genesis" && c.textContent.includes("Mapa de Gênesis"); })()'),
  'no dia 1 do plano (Gênesis), o cartão do alto leva ao mapa de Gênesis');
// Num dia cujo livro ainda não tem mapa, o cartão vira "Mapas dos livros" e desce até a grade.
const diaSemMapa = await av('(() => { const n = CC.D.plano.findIndex((d) => !(d.livros || []).some((l) => CC.mapaDoLivro(l))) + 1; CC.diaAtual = () => n; return n; })()');
await av('location.hash = "#/"');
await dormir(300);
await av('location.hash = "#/explorar"');
await esperar('!!document.querySelector(".cartao-mapas")');
ok(await av('!!document.querySelector(".cartao-mapas") && document.querySelector(".cartao-mapas").textContent.includes("Mapas dos livros")'), 'num dia sem mapa (dia ' + diaSemMapa + '), o cartão "Mapas dos livros" aparece no alto do Explorar');
const antesDoAtalho = await av('CC.rolagemY()');
await av('document.querySelector("[data-ir-mapas]").click()');
await dormir(400);
ok(await av('CC.rolagemY()') > antesDoAtalho + 300, 'o cartão desce até a grade');

// ---------- o mapa de Isaías ----------
await av('document.querySelector(\'a.celula-mapa[href="#/mapa/isaias"]\').click()');
ok(await esperar('location.hash === "#/mapa/isaias" && document.querySelectorAll(".mapa .mapa-ramo").length === 5'), 'o mapa de Isaías abre com os cinco ramos');
await dormir(600);
ok(await av('document.querySelector(".mapa-nome").textContent === "Isaías" && /Permanent Marker/.test(getComputedStyle(document.querySelector(".mapa-nome")).fontFamily)'), 'o nome do livro vem no pincel, no alto');
const topoDoMapa = await texto('.folha-mapa');
ok(topoDoMapa.includes('Profetas maiores') && topoDoMapa.includes('Livro 23 de 66') && await texto('.mapa-capitulos b') === '66',
  'o topo diz o grupo, "Livro 23 de 66" e os 66 capítulos');
ok(await av('document.querySelectorAll(".mapa .desenho svg").length === 7'), 'os sete desenhos estão na tela (autoria, cinco ramos e Cristo)');
ok(await av('document.querySelectorAll(".mapa svg.seta").length === 12 && [...document.querySelectorAll(".mapa svg.seta")].every((s) => s.querySelector(".pontos") && s.querySelector(".ponta"))'),
  'doze setas pontilhadas ligam os blocos, cada uma com a ponta');
ok(await av('[...document.querySelectorAll(".mapa-ramo-nome")].every((n) => /Permanent Marker/.test(getComputedStyle(n).fontFamily))'), 'os nomes dos ramos estão no pincel');
ok(await av('document.querySelectorAll(".mapa mark").length >= 30') && await texto('.mapa-galhos mark') === 'Is 6.1-4', 'as referências vêm em marca-texto no fim de cada item');
ok(await av('document.querySelector(".mapa-jesus") && document.querySelector(".mapa-jesus").textContent.startsWith("Esse Servo é Jesus")'), 'o ramo do Servo termina no destaque "Esse Servo é Jesus"');
ok(await av('!!document.querySelector(".mapa-original[lang=he]") && document.querySelector(".mapa-significado").textContent.includes("o Senhor salva")'), 'o significado traz o nome em hebraico e a tradução');
ok(await av('document.querySelectorAll(".mapa-conexao .mapa-ligacao").length === 4 && document.querySelectorAll(".mapa-estrutura li").length === 7 && document.querySelectorAll(".mapa-curiosidades li").length === 4'),
  'quatro conexões entre os ramos, sete partes na estrutura e quatro curiosidades');
// A curva de cada conexão não passa por cima do texto: nenhum ponto da linha pontilhada cai no
// retângulo do parágrafo (com 4px de folga).
const cruzamentos = () => av(`JSON.stringify([...document.querySelectorAll(".mapa-conexao")].map((el) => {
  const p = el.querySelector(".mapa-ligacao"); const linha = el.querySelector(".pontos"); const s = el.querySelector(".seta").getBoundingClientRect();
  if (!p) return 0; const r = p.getBoundingClientRect(); let dentro = 0;
  for (let d = 0, L = linha.getTotalLength(); d <= L; d += 2) { const pt = linha.getPointAtLength(d); const x = s.left + pt.x; const y = s.top + pt.y;
    if (x > r.left - 4 && x < r.right + 4 && y > r.top - 4 && y < r.bottom + 4) dentro++; }
  return dentro; }))`);
ok(await cruzamentos() === '[0,0,0,0]', 'nenhuma curva pontilhada cruza o texto da conexão (' + await cruzamentos() + ')');
ok(await av('[...document.querySelectorAll(".mapa-conexao")].every((el) => { const p = el.querySelector(".mapa-ligacao"); return !p || p.getBoundingClientRect().bottom < el.getBoundingClientRect().bottom - 30; })'),
  'a área de cada conexão cresce com o texto, e a ponta fica abaixo dele');
ok(await av('document.documentElement.scrollWidth - innerWidth') <= 0, 'nada estoura a largura do mapa a 390px');
ok(await av('[...document.querySelectorAll("[data-voltar], [data-compartilhar-mapa], .mapa-ler")].every((b) => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })'),
  'voltar, compartilhar e o botão de ler têm 44px de toque');
ok(await av('document.querySelector(".mapa-ler").getAttribute("href") === "#/biblia/Isa%C3%ADas/1"') && await texto('.mapa-ler') === 'Ler Isaías 1',
  'sem leitura ainda, o botão do fim leva a Isaías 1 na Bíblia');
ok(await av('!document.querySelector(".mapa-estrutura li.aqui") && !document.querySelector(".mapa-estrutura li.lida")'), 'sem leitura, a estrutura é só a lista');

// ---------- o progresso do plano na estrutura ----------
await av('for (let d = 267; d <= 275; d++) CC.marcarLido(d, true); CC.redesenhar()');
await dormir(400);
ok(await av('document.querySelectorAll(".mapa-estrutura li.lida").length >= 1 && document.querySelectorAll(".mapa-estrutura li.aqui").length === 1 && document.querySelector(".mapa-aqui").textContent === "você está aqui"'),
  'com dias de Isaías lidos no plano, as partes feitas ganham o visto e a atual o "você está aqui"');
ok(/^Continuar em Isaías \d+$/.test(await texto('.mapa-ler')), 'o botão do fim passa a continuar de onde o plano parou (' + await texto('.mapa-ler') + ')');
await av('for (let d = 267; d <= 275; d++) CC.marcarLido(d, false)');

// ---------- voltar ----------
await av('document.querySelector(".folha-mapa [data-voltar]").click()');
ok(await esperar('location.hash === "#/explorar" && !!document.querySelector("#mapas-dos-livros")'), 'o voltar do mapa leva ao Explorar');
await dormir(500);
ok(await av('Math.abs(document.querySelector("#mapas-dos-livros").getBoundingClientRect().top) < 140'), 'o Explorar reabre na grade dos mapas, não no alto');

// ---------- todos os mapas publicados ----------
// Cada mapa do índice abre inteiro: um ramo por item do JSON, um desenho por ramo mais Cristo
// (e a autoria, quando tem), as setas entre os blocos (oito fixas mais uma entre cada par de
// ramos), nenhuma curva por cima do texto das conexões e nada estourando a largura, a 390 e a 360.
for (const slug of indice.publicados) {
  const m = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'mapas', slug + '.json'), 'utf8'));
  const n = m.ramos.length;
  const desenhos = n + 1 + (m.autoria && m.autoria.desenho ? 1 : 0);
  for (const [w, h] of [[390, 844], [360, 740]]) {
    await tela(w, h);
    await av('location.hash = "#/explorar"');
    await dormir(300);
    await av('location.hash = "#/mapa/' + slug + '"');
    const abriu = await esperar('document.querySelectorAll(".mapa .mapa-ramo").length === ' + n + ' && document.querySelector(".mapa-nome").textContent === ' + JSON.stringify(m.nome));
    await dormir(700);
    const desenhosNaTela = await av('[...document.querySelectorAll(".mapa .desenho svg")].filter((s) => s.querySelector("path, circle, ellipse")).length');
    const setas = await av('document.querySelectorAll(".mapa svg.seta").length');
    const cruz = await cruzamentos();
    const largura = await av('document.documentElement.scrollWidth - innerWidth');
    ok(abriu && desenhosNaTela === desenhos && setas === n - 1 + 8 && cruz === JSON.stringify(Array(n - 1).fill(0)) && largura <= 0,
      m.nome + ' a ' + w + 'px: ' + n + ' ramos, ' + desenhosNaTela + '/' + desenhos + ' desenhos, ' + setas + ' setas, curvas fora do texto (' + cruz + '), largura ok');
  }
}

// ---------- 360px ----------
await tela(360, 740);
await av('location.hash = "#/mapa/isaias"');
await esperar('document.querySelectorAll(".mapa .mapa-ramo").length === 5');
await dormir(600);
ok(await av('document.documentElement.scrollWidth - innerWidth') <= 0, 'nada estoura a largura do mapa a 360px');
ok(await cruzamentos() === '[0,0,0,0]', 'a 360px as curvas continuam fora do texto das conexões');
ok(await av('document.querySelector(".mapa-ramo-cabeca .desenho").getBoundingClientRect().width === 112'), 'os desenhos dos ramos ficam com 112px a 360px');
await av('location.hash = "#/explorar"');
await esperar('!!document.querySelector("#mapas-dos-livros")');
ok(await estouro() === '[]', 'nenhum nome quebra no meio nem sai da célula a 360px');
ok(await av('document.documentElement.scrollWidth - innerWidth') <= 0, 'nada estoura a largura do Explorar a 360px');
await tela(390, 844);

// ---------- tema escuro ----------
await av('localStorage.setItem("cc.tema", "true"); location.hash = "#/mapa/isaias"; location.reload()');
ok(await esperar('document.documentElement.dataset.tema === "escuro" && document.querySelectorAll(".mapa .mapa-ramo").length === 5'), 'o mapa abre no tema escuro');
await dormir(400);
ok(await av('getComputedStyle(document.querySelector(".seta .pontos")).stroke === "rgb(238, 240, 234)"'), 'no escuro as setas ficam claras');
ok(await av('getComputedStyle(document.querySelector(".mapa-ramo-cabeca .desenho .k")).stroke === "rgb(238, 240, 234)" && getComputedStyle(document.querySelector(".mapa-ramo-cabeca .desenho .p")).fill === "rgb(37, 39, 36)"'),
  'no escuro o desenho vira traço claro sobre papel grafite');
ok(await av('getComputedStyle(document.querySelector(".mapa-cristo")).backgroundColor === "rgb(37, 39, 36)" && getComputedStyle(document.querySelector(".mapa-jesus")).backgroundColor === "rgb(37, 39, 36)"'),
  'no escuro o cartão de Cristo e o destaque "é Jesus" viram cartão grafite com borda sálvia');
await av('localStorage.setItem("cc.tema", "false")');

// ---------- a Bíblia do app segue igual ----------
await av('location.hash = "#/biblia"');
ok(await esperar('document.querySelectorAll(".grade-livros .item-livro").length === 66'), 'a Bíblia lista os 66 livros como antes');
ok(await av('!document.querySelector(\'#conteudo [href^="#/mapa"]\') && !document.querySelector("#conteudo .mapa, #conteudo .celula-mapa, #conteudo .cartao-mapas") && !document.querySelector("#conteudo").textContent.includes("Mapa do livro")'),
  'a Bíblia não ganhou botão, cartão nem link de mapa');
await av('location.hash = "#/biblia/Isa%C3%ADas/1"');
ok(await esperar('document.querySelectorAll(".leitor-verso, .verso").length > 5 || document.querySelector("#conteudo").textContent.includes("Uzias")'), 'Isaías 1 abre na Bíblia pelo endereço que o mapa usa');
ok(await av('!document.querySelector("#conteudo").textContent.includes("Mapa do livro")'), 'o capítulo da Bíblia não menciona o mapa');

// ---------- sem rede ----------
await av('location.hash = "#/"');
await av('navigator.serviceWorker.ready.then(() => true)');
await cmd('Page.reload', {});
await esperar('!!document.querySelector(".no") && !!navigator.serviceWorker.controller');
await av('location.hash = "#/mapa/isaias"');
await esperar('document.querySelectorAll(".mapa .mapa-ramo").length === 5');
const guardou = await esperar('caches.open("caminho-mapas").then((c) => c.keys()).then((k) => k.length >= 1)', 10000);
ok(guardou, 'o mapa aberto ficou guardado no cache dos mapas');
await cmd('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
servidor.kill();
await dormir(500);
evs.length = 0;
await av('location.hash = "#/"');
await cmd('Page.reload', {});
ok(await esperar('!!document.querySelector(".no")'), 'o aplicativo abre sem rede');
await av('location.hash = "#/mapa/isaias"');
ok(await esperar('document.querySelectorAll(".mapa .mapa-ramo").length === 5 && document.querySelectorAll(".mapa .desenho svg").length === 7'), 'sem rede, o mapa guardado continua abrindo inteiro');

const erros = evs
  .filter((e) => e.method === 'Runtime.exceptionThrown')
  .map((e) => e.params.exceptionDetails?.exception?.description || 'exceção');
ok(erros.length === 0, 'nenhuma exceção de JavaScript' + (erros[0] ? ': ' + erros[0].slice(0, 90) : ''));

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o mapa do livro funciona inteiro\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
try { rmSync(pastaEstado, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
