// Mapas bíblicos (o atlas, #/atlas) num Chrome sem interface: o cartão do Explorar leva à lista;
// a lista mostra os mapas publicados (com o desenho do próprio mapa) e o "Mais mapas em breve";
// o mapa abre com o relevo, o caminho que se desenha (parado com menos movimento), as paradas de
// ida e volta com as referências de Atos, o zoom (botões, toque duplo) e a ligação lista ↔ mapa;
// as referências e "Ler a passagem" abrem o leitor, e o voltar volta; o Explorar continua aceso
// na barra; nada estoura a 390 e a 360; os dois temas desenham; e tudo abre sem rede depois da
// primeira vez (service worker).
// Com CAPTURAS=<pasta>, guarda as telas a 390px, claro e escuro.
// Uso: CHROME=<chrome> PORTA=9985 PORTAS=9986-9999 node ferramentas/teste-atlas.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA_NAV = await portaLivre();
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 9985;
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

console.log('\n  Mapas bíblicos\n');
const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 40; i++) {
  try { await fetch(base); break; } catch { await dormir(150); }
}
// a tela do tamanho da janela, rolada até um elemento
async function foto(nome, sel, bloco = 'start') {
  if (!CAPTURAS) return;
  await tirarAviso();
  await av('document.fonts.ready.then(() => true)');
  // a folha do topo fica presa no alto: o que rola para o começo da tela desce o tamanho dela
  if (sel) await av('(() => { const e = document.querySelector(' + JSON.stringify(sel) + '); if (e) { e.scrollIntoView({ block: "' + bloco + '" }); if ("' + bloco + '" === "start") scrollBy(0, -110); } })()');
  else await av('scrollTo(0, 0)');
  await dormir(1200);
  const r = await cmd('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(CAPTURAS, nome + '.png'), Buffer.from(r.data, 'base64'));
}
const abaAcesa = () => av('(document.querySelector("nav [aria-current=\\"page\\"], .barra-abas [aria-current=\\"page\\"]") || {}).textContent || ""');

// ---------- o servidor ----------
const html = await (await fetch(base)).text();
const i0 = html.indexOf('window.ATLAS=');
const A = i0 > -1 ? JSON.parse(html.slice(i0 + 13, html.indexOf(';window.', i0))) : { itens: [], grupos: [] };
const indice = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'atlas', 'indice.json'), 'utf8'));
ok(A.itens.length === indice.publicados.length && A.itens.length >= 1, 'o aplicativo conhece os ' + A.itens.length + ' mapas publicados');
const p1 = A.itens.find((m) => m.slug === 'paulo-1');
ok(!!p1 && p1.titulo === 'Primeira viagem missionária' && p1.grupo === 'paulo', 'a primeira viagem de Paulo está publicada');
const rArq = await fetch(base + p1.arquivo, { headers: { 'accept-encoding': 'gzip' } });
ok(rArq.ok && (rArq.headers.get('content-type') || '').includes('json') && rArq.headers.get('content-encoding') === 'gzip'
  && (rArq.headers.get('cache-control') || '').includes('immutable'), 'o arquivo do mapa é JSON comprimido, com cache longo');
const rImg = await fetch(base + p1.imagem);
ok(rImg.ok && (rImg.headers.get('content-type') || '') === 'image/webp' && (await rImg.arrayBuffer()).byteLength > 20000, 'o relevo sai como WebP');
const fonte = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'atlas', 'paulo-1.json'), 'utf8'));

// ---------- o cartão no Explorar ----------
await cmd('Page.navigate', { url: base + '#/explorar' });
ok(await esperar('!!document.querySelector(".cartao-atlas")', 12000), 'o Explorar mostra o cartão dos mapas bíblicos');
await tirarAviso();
ok(await av('document.querySelector(".cartao-parabolas").nextElementSibling === document.querySelector(".cartao-atlas")'), 'o cartão vem logo abaixo das parábolas');
ok(await texto('.cartao-atlas-titulo') === 'Mapas bíblicos' && await texto('.cartao-atlas-dica') === 'Onde a história aconteceu', 'o cartão diz "Mapas bíblicos" e "Onde a história aconteceu"');
ok(await av('document.querySelector(".cartao-atlas").getBoundingClientRect().height >= 44 && document.querySelector(".cartao-atlas").getAttribute("href") === "#/atlas"'), 'o cartão é um link de bom tamanho para a lista');
const abaExplorar = await abaAcesa();
ok(await semEstouro(), 'nada estoura a largura do Explorar');
await foto('explorar-390-claro', '.cartao-atlas', 'center');

// ---------- a lista ----------
await av('document.querySelector(".cartao-atlas").click()');
ok(await esperar('location.hash === "#/atlas" && document.querySelectorAll(".item-atlas").length === ' + A.itens.length, 10000), 'o cartão leva à lista dos mapas');
ok(await texto('.atlas-nome') === 'Mapas bíblicos' && await av('/Permanent Marker/.test(getComputedStyle(document.querySelector(".atlas-nome")).fontFamily)'), 'a lista se chama "Mapas bíblicos", no pincel');
ok(await av('JSON.stringify([...document.querySelectorAll(".grupo-atlas h2")].map((h) => h.textContent))') === JSON.stringify(A.grupos.map((g) => g.nome)), 'a lista agrupa os mapas (' + A.grupos.map((g) => g.nome).join(', ') + ')');
ok(await esperar('[...document.querySelectorAll(".item-atlas-mapa")].every((d) => d.querySelector("svg image"))'), 'cada mapa da lista mostra o próprio desenho');
ok(await av('[...document.querySelectorAll(".item-atlas-mapa")].every((d) => Math.abs(d.querySelector("svg").getBoundingClientRect().height - d.getBoundingClientRect().height) < 2)'), 'cada miniatura cabe inteira na caixa, sem corte e sem sobra');
ok(await texto('.atlas-em-breve') === 'Mais mapas em breve.', 'avisa, sem cartão falso, que há mais mapas a caminho');
ok(await abaAcesa() === abaExplorar && !!abaExplorar, 'na lista, a barra continua acesa onde fica o Explorar (' + abaExplorar.trim() + ')');
ok(await av('document.querySelector(".folha-atlas [data-voltar]").dataset.rotuloVoltar === "Explorar"'), 'o voltar da lista leva ao Explorar');
ok(await semEstouro(), 'nada estoura a largura da lista a 390px');
await foto('lista-390-claro');

// ---------- o mapa ----------
await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await av('document.querySelector(\'.item-atlas[href="#/atlas/paulo-1"]\').click()');
ok(await esperar('location.hash === "#/atlas/paulo-1" && !!document.querySelector(".atlas-quadro .atlas-svg")', 10000), 'tocar no mapa abre a tela dele');
ok(await texto('.atlas-nome') === 'Primeira viagem missionária' && /^Paulo e Barnabé · At 13\.1–14\.28$/.test(await texto('.atlas-sub')), 'o alto diz o nome, quem viajou e a referência');
ok(await av('document.querySelector(".atlas-quadro .atlas-svg").classList.contains("animar") && getComputedStyle(document.querySelector(".at-revela")).animationName === "at-desenha"'), 'o caminho se desenha quando a tela abre');
ok(await av('document.querySelector(".atlas-quadro image").getAttribute("href") === ' + JSON.stringify(p1.imagem)), 'o relevo do mapa é o arquivo publicado');
ok(await av('document.querySelectorAll(".at-perna.ida").length === ' + fonte.caminho.filter((c) => c.tipo === 'ida').length + ' && document.querySelectorAll(".at-perna.volta").length === ' + fonte.caminho.filter((c) => c.tipo === 'volta').length), 'o caminho tem as pernas de ida e de volta');
ok(await av('getComputedStyle(document.querySelector(".at-perna.volta .at-rota")).strokeDasharray !== "none" && getComputedStyle(document.querySelector(".at-perna.ida .at-rota")).strokeDasharray === "none"'), 'a ida é cheia e a volta tracejada');
const ida = fonte.paradas.filter((p) => p.tipo !== 'volta'), volta = fonte.paradas.filter((p) => p.tipo === 'volta');
ok(await av('JSON.stringify([...document.querySelectorAll(".atlas-trecho")].map((h) => h.textContent))') === '["Ida","Volta"]', 'as paradas vêm separadas em Ida e Volta');
const paradas = JSON.parse(await av('JSON.stringify([...document.querySelectorAll(".atlas-parada")].map((li) => [li.querySelector(".atlas-parada-n").textContent, li.querySelector("b").textContent, li.querySelector(".atlas-parada-ref mark").textContent.replace(/\\u00a0/g, " ").replace(/\\u2060/g, ""), li.querySelector(".atlas-parada-ref").getAttribute("href")]))'));
ok(paradas.length === ida.length + volta.length && paradas.every((p, i) => p[0] === String(fonte.paradas[i].n) && p[1] === fonte.paradas[i].nome && p[2] === fonte.paradas[i].ref),
  'as ' + paradas.length + ' paradas aparecem na ordem, com o nome e a referência');
ok(paradas.every((p) => /^#\/biblia\/Atos\/1[34]$/.test(p[3])), 'cada referência leva ao leitor em Atos 13 ou 14');
ok(await av('document.querySelectorAll(".atlas-quadro [data-parada]").length') >= 9, 'os números das paradas estão no mapa');
ok(await av('[...document.querySelectorAll(".atlas-parada-botao, .atlas-parada-ref, .atlas-botao:not([hidden]), .folha-atlas [data-voltar], .atlas-ler")].every((c) => c.getBoundingClientRect().height >= 44)'), 'paradas, referências, zoom, voltar e "Ler a passagem" com alvo de 44px');
ok(await abaAcesa() === abaExplorar, 'no mapa, a barra continua acesa onde fica o Explorar');
ok(await av('document.querySelector(".atlas-ler").getAttribute("href") === "#/biblia/Atos/13" && /Ler a passagem/.test(document.querySelector(".atlas-ler").textContent)'), '"Ler a passagem" abre Atos 13');
ok(await semEstouro(), 'nada estoura a largura do mapa a 390px');
await dormir(9000); // o caminho termina de se desenhar
await foto('mapa-390-claro');
await foto('paradas-390-claro', '.atlas-rotulo');
await foto('volta-390-claro', '#atlas-parada-9');

// zoom: os botões, o toque duplo e o inteiro
const escala = () => av('(() => { const t = document.querySelector(".atlas-zoom").style.transform; const m = /scale\\(([\\d.]+)\\)/.exec(t); return m ? Number(m[1]) : 1; })()');
await av('scrollTo(0, 0)');
await av('document.querySelector(\'[data-zoom="mais"]\').click()');
ok(Math.abs(await escala() - 1.6) < .01 && await av('!document.querySelector(\'[data-zoom="inteiro"]\').hidden && document.querySelector(".atlas-palco").classList.contains("ampliado")'), 'o "+" aproxima e aparece o "ver inteiro"');
await av('document.querySelector(\'[data-zoom="inteiro"]\').click()');
ok(await escala() === 1 && await av('document.querySelector(\'[data-zoom="menos"]\').disabled'), 'o "ver inteiro" volta ao mapa todo');
await av(`(() => { const p = document.querySelector(".atlas-palco"); const r = p.getBoundingClientRect();
  const ev = (t) => p.dispatchEvent(new PointerEvent(t, { pointerId: 7, bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: "touch" }));
  ev("pointerdown"); ev("pointerup"); ev("pointerdown"); ev("pointerup"); })()`);
ok(Math.abs(await escala() - 2.4) < .01, 'o toque duplo aproxima');
// da lista para o mapa
await av('document.querySelector(\'[data-ir-parada="8"]\').click()');
ok(await esperar('document.querySelector("#atlas-parada-8").classList.contains("ativa") && !!document.querySelector(".at-pulsos .at-pulso")'), 'tocar numa parada a acende e pulsa a cidade no mapa');
ok(await escala() >= 2.2, 'e o mapa aproxima nela');
// do mapa para a lista
await av('document.querySelector(\'.atlas-quadro [data-parada="4"]\').dispatchEvent(new MouseEvent("click", { bubbles: true }))');
ok(await esperar('document.querySelector("#atlas-parada-4").classList.contains("ativa")'), 'tocar num número do mapa acende a parada na lista');

// a referência abre o leitor, e o voltar volta ao mapa
await av('document.querySelector("#atlas-parada-6 .atlas-parada-ref").click()');
ok(await esperar('location.hash === "#/biblia/Atos/13" && !!document.querySelector(".leitor-verso")', 12000), 'a referência abre o leitor em Atos 13');
await av('history.back()');
ok(await esperar('location.hash === "#/atlas/paulo-1" && !!document.querySelector(".atlas-quadro .atlas-svg")', 10000), 'voltar do leitor devolve o mapa');
await av('document.querySelector(".folha-atlas [data-voltar]").click()');
ok(await esperar('location.hash === "#/atlas" && !!document.querySelector(".item-atlas")', 10000), 'o voltar do mapa volta à lista');
await av('document.querySelector(".folha-atlas [data-voltar]").click()');
ok(await esperar('location.hash === "#/explorar" && !!document.querySelector(".cartao-atlas")', 10000), 'o voltar da lista volta ao Explorar');

// com menos movimento, o caminho já aparece pronto
await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await av('location.hash = "#/atlas/paulo-1"');
await esperar('!!document.querySelector(".atlas-quadro .atlas-svg")', 10000);
ok(await av('getComputedStyle(document.querySelector(".at-revela")).animationName === "none" && getComputedStyle(document.querySelector(".at-revela")).strokeDashoffset === "0px"'), 'com menos movimento, o caminho aparece pronto, sem animação');
await cmd('Emulation.setEmulatedMedia', { features: [] });
await tela(360, 780);
await dormir(300);
ok(await semEstouro(), 'nada estoura a 360px');
await tela(390, 844);

// ---------- cada um dos outros mapas publicados abre inteiro ----------
await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
for (const outro of A.itens.filter((m) => m.slug !== 'paulo-1')) {
  const f = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'atlas', outro.slug + '.json'), 'utf8'));
  await av('location.hash = "#/atlas/' + outro.slug + '"');
  ok(await esperar('!!document.querySelector(\'.atlas-quadro[data-atlas-mapa="' + outro.slug + '"] .atlas-svg image\') && document.querySelectorAll(".atlas-parada").length === ' + f.paradas.length, 10000)
    && await texto('.atlas-nome') === outro.titulo, outro.titulo + ' abre com o relevo e as ' + f.paradas.length + ' paradas');
  const ps = JSON.parse(await av('JSON.stringify([...document.querySelectorAll(".atlas-parada")].map((li) => [li.querySelector("b").textContent, li.querySelector(".atlas-parada-ref mark").textContent.replace(/\\u00a0/g, " ").replace(/\\u2060/g, ""), li.querySelector(".atlas-parada-ref").getAttribute("href")]))'));
  ok(ps.every((x, i) => x[0] === f.paradas[i].nome && x[1] === f.paradas[i].ref && /^#\/biblia\/[^/]+\/\d+$/.test(x[2])), outro.titulo + ': nomes e referências na ordem, cada uma com o link do leitor');
  ok(await av('document.querySelectorAll(".at-perna").length') === f.caminho.length && await av('document.querySelectorAll(".atlas-quadro [data-parada]").length') >= Math.min(9, new Set(f.paradas.map((x) => [].concat(x.lugar)[0])).size - 1),
    outro.titulo + ': o caminho inteiro e os números no mapa');
  const ler = f.leitura[0];
  ok(await av('document.querySelector(".atlas-ler").getAttribute("href")') === '#/biblia/' + encodeURIComponent(ler.livro) + '/' + ler.cap, outro.titulo + ': "Ler a passagem" abre ' + ler.livro + ' ' + ler.cap);
  ok(await semEstouro(), outro.titulo + ': nada estoura a 390px');
  await foto('mapa-' + outro.slug + '-390-claro');
  await foto('paradas-' + outro.slug + '-390-claro', '.atlas-rotulo');
}
await cmd('Emulation.setEmulatedMedia', { features: [] });

// ---------- tema escuro ----------
await av('localStorage.setItem("cc.tema", "true"); location.hash = "#/explorar"; location.reload()');
ok(await esperar('document.documentElement.dataset.tema === "escuro" && !!document.querySelector(".cartao-atlas")', 12000), 'o cartão aparece no tema escuro');
await foto('explorar-390-escuro', '.cartao-atlas', 'center');
await av('location.hash = "#/atlas"');
ok(await esperar('!!document.querySelector(".item-atlas-mapa svg image")', 10000), 'a lista abre no tema escuro');
await foto('lista-390-escuro');
await av('location.hash = "#/atlas/paulo-1"');
ok(await esperar('!!document.querySelector(".atlas-quadro .atlas-svg")', 10000), 'o mapa abre no tema escuro');
ok(await av('getComputedStyle(document.querySelector(".atlas-quadro")).backgroundColor !== "rgb(255, 255, 255)"'), 'no escuro, o cartão do mapa fica escuro');
await dormir(9000);
await foto('mapa-390-escuro');
await foto('paradas-390-escuro', '.atlas-rotulo');
await foto('volta-390-escuro', '#atlas-parada-9');
await av('localStorage.setItem("cc.tema", "false")');

// ---------- sem rede ----------
const guardou = await esperar('Promise.all([caches.open("caminho-atlas").then((c) => c.keys()), caches.open("caminho-telas").then((c) => c.keys())]).then(([a, t]) => ' + JSON.stringify([p1.arquivo, p1.imagem]) + '.every((n) => a.some((p) => p.url.endsWith(n))) && t.some((p) => /\\/atlas\\.[0-9a-f]{10}\\.js$/.test(p.url)))', 10000);
ok(guardou, 'o mapa, o relevo e a tela ficaram guardados pelo service worker');
await cmd('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
servidor.kill();
await dormir(500);
const excecoes = (lista) => lista.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.exception?.description || 'exceção');
const errosComRede = excecoes(evs);
evs.length = 0;
await av('location.hash = "#/"');
await cmd('Page.reload', {});
ok(await esperar('!!document.querySelector(".no")', 12000), 'o aplicativo abre sem rede');
await av('location.hash = "#/atlas"');
ok(await esperar('!!document.querySelector(".item-atlas-mapa svg image")', 10000), 'sem rede, a lista abre com o mapa');
await av('location.hash = "#/atlas/paulo-1"');
ok(await esperar('!!document.querySelector(".atlas-quadro .atlas-svg") && document.querySelectorAll(".atlas-parada").length === ' + fonte.paradas.length, 10000), 'sem rede, o mapa guardado abre inteiro');
ok(await av('fetch(' + JSON.stringify('./' + p1.imagem) + ').then((r) => r.ok)'), 'sem rede, o relevo vem do cache');

const erros = errosComRede.concat(excecoes(evs));
ok(erros.length === 0, 'nenhuma exceção de JavaScript' + (erros[0] ? ': ' + erros[0].slice(0, 90) : ''));

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  os mapas bíblicos funcionam inteiros\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
try { rmSync(pastaEstado, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
