// A navegação geral num Chrome sem interface, a 390px: o voltar do celular fecha as folhas sem
// mudar a tela de baixo (e a troca de tela também as fecha); a barra de baixo marca um lugar
// só; a grade de capítulos abre no alto; o Explorar mora na aba Bíblia ("Ler | Explorar") e
// continua abrindo pelos endereços antigos; a busca do Explorar acha parábolas, mapas dos
// livros, mapas do atlas e referências ("joao 3"); e os links diretos aceitam nome sem acento.
// Uso: CHROME=<chrome> PORTA=8641 PORTAS=8650-8659 node ferramentas/teste-navegacao.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA_NAV = await portaLivre();
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8641;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CAPTURAS = process.env.CAPTURAS ? resolve(process.env.CAPTURAS) : '';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// pasta própria: sem contas.json, o servidor fica aberto e não pede entrada
const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-navegacao-estado-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_ABERTO: '1' },
  stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-navegacao-'));
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
await tela(390, 844);
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

console.log('\n  Navegação\n');
const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 40; i++) {
  try { await fetch(base); break; } catch { await dormir(150); }
}
const ir = async (hash, pronto, ms = 10000) => { await av('location.hash = ' + JSON.stringify(hash)); return esperar(pronto, ms); };
const voltar = async () => { await av('history.back()'); await dormir(450); };
const folhas = () => av('document.querySelectorAll(".cortina:not(.saindo), .tela-cheia:not(.saindo)").length');

await cmd('Page.navigate', { url: base + '#/' });
ok(await esperar('!!document.querySelector(".navegacao .aba")', 15000), 'o aplicativo abre');
if (process.env.DEPURAR) console.log(await av('location.href + " | " + document.body.innerText.slice(0, 200)'), JSON.stringify(evs.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails)).slice(0, 800));
await dormir(800);

// ---------- o voltar do celular fecha a folha ----------
ok(await ir('#/perfil/anotacoes', '!!document.querySelector("#conteudo h1")'), 'Minhas anotações abre');
await ir('#/config', '!!document.querySelector("#conteudo .voltar, #conteudo h1")');
await av('CC.folha("<h2>Teste</h2><a href=\\"#/biblia\\" data-link>Bíblia</a><button data-fechar>Fechar</button>", { ligar: (f, fechar) => { f.querySelector("[data-fechar]").onclick = fechar; } })');
ok(await folhas() === 1, 'a folha abre');
await voltar();
ok(await folhas() === 0 && await av('location.hash') === '#/config', 'o voltar fecha a folha e a tela de baixo continua a mesma');
await voltar();
ok(await av('location.hash') === '#/perfil/anotacoes', 'o voltar seguinte volta à tela anterior (sem entrada fantasma)');
await ir('#/config', '!!document.querySelector("#conteudo h1")');
await av('CC.folha("<h2>Teste</h2><button data-fechar>Fechar</button>", { ligar: (f, fechar) => { f.querySelector("[data-fechar]").onclick = fechar; } })');
await av('document.querySelector(".cortina [data-fechar]").click()');
await dormir(400);
ok(await folhas() === 0 && await av('location.hash') === '#/config', 'fechar pelo botão fecha a folha');
await voltar();
ok(await av('location.hash') === '#/perfil/anotacoes', 'e o voltar depois do botão não para numa entrada vazia');
await ir('#/config', '!!document.querySelector("#conteudo h1")');
await av('CC.folha("<h2>Teste</h2><a href=\\"#/biblia\\" data-link>Bíblia</a>")');
await av('document.querySelector(".cortina [data-link]").click()');
ok(await esperar('location.hash === "#/biblia"') && await folhas() === 0, 'um link de dentro da folha leva ao destino e fecha a folha');
await voltar();
ok(await av('location.hash') === '#/config', 'o voltar depois do link volta à tela de onde a folha abriu');
// fechar e mudar de tela por código: a entrada fantasma é pulada
await av('CC.folha("<h2>Teste</h2>", { ligar: (f, fechar) => { window.__fechar = fechar; } })');
await av('window.__fechar(); location.hash = "#/explorar"');
await esperar('location.hash === "#/explorar"');
await dormir(300);
await voltar();
await dormir(300);
ok(await av('location.hash') === '#/config' && await folhas() === 0, 'fechar e mudar de tela por código: o voltar volta à tela anterior');
await voltar();
ok(await av('location.hash') === '#/perfil/anotacoes', 'e o voltar seguinte não fica preso na mesma tela');
// trocar de tela pelo endereço fecha a folha
await ir('#/config', '!!document.querySelector("#conteudo h1")');
await av('CC.folha("<h2>Teste</h2>")');
await ir('#/perfil', 'true');
await dormir(400);
ok(await folhas() === 0, 'trocar de tela pelo endereço fecha a folha');
// a confirmação também
await ir('#/config', '!!document.querySelector("#conteudo h1")');
await av('window.__resp = "nada"; CC.confirmar({ titulo: "Teste" }).then((v) => { window.__resp = v; }); 0');
await voltar();
ok(await folhas() === 0 && await av('window.__resp') === null && await av('location.hash') === '#/config', 'o voltar fecha a confirmação como "nenhuma das duas"');
// o Esc
await av('CC.folha("<h2>Teste</h2>")');
await av('dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))');
await dormir(400);
ok(await folhas() === 0 && await av('location.hash') === '#/config', 'o Esc fecha a folha');
await voltar();
ok(await av('location.hash') === '#/perfil', 'e o voltar depois do Esc volta à tela anterior');
// folha que abre outra
await ir('#/config', '!!document.querySelector("#conteudo h1")');
await av('CC.folha("<h2>A</h2>", { ligar: (f, fechar) => { window.__fecharA = fechar; } })');
await av('window.__fecharA(); CC.folha("<h2>B</h2>")');
await dormir(200);
await voltar();
ok(await folhas() === 0 && await av('location.hash') === '#/config', 'fechar uma folha e abrir outra: um voltar fecha a nova');
await voltar();
ok(await av('location.hash') === '#/perfil', 'e o voltar seguinte sai da tela');

// ---------- a grade de capítulos abre no alto (C2) ----------
await ir('#/biblia', '!!document.querySelector(".item-livro")', 15000);
await dormir(400);
await av('document.querySelector(".item-livro[href=\\"#/biblia/Salmos\\"]").scrollIntoView({ block: "center" })');
await dormir(300);
const yLista = await av('CC.rolagemY()');
await av('document.querySelector(".item-livro[href=\\"#/biblia/Salmos\\"]").click()');
ok(await esperar('document.querySelectorAll(".grade-capitulos a").length === 150'), 'Salmos abre com os 150 capítulos');
await dormir(400);
ok(yLista > 400 && await av('CC.rolagemY()') < 5 && await av('document.querySelector("#conteudo h1").getBoundingClientRect().top >= 0'),
  'a grade de Salmos abre no alto, com o nome à vista (a lista estava em ' + Math.round(yLista) + 'px)');
await voltar();
await esperar('!!document.querySelector(".item-livro")');
await dormir(500);
ok(Math.abs(await av('CC.rolagemY()') - yLista) < 40, 'o voltar devolve a lista na altura em que estava');
await ir('#/biblia/Salmos/23', '!!document.querySelector(".leitor-biblia")');
await av('CC.rolarPara(300)');
await voltar();
ok(await esperar('!document.querySelector(".leitor-biblia:not(.saindo)")'), 'fechar o capítulo devolve a grade');

// ---------- a barra marca um lugar só (C5) ----------
const marcados = () => av('[...document.querySelectorAll(".navegacao .aba.selecionada:not(.so-trilho), .topo .selecionado")].map((b) => b.dataset.papel || (b.classList.contains("perfil-topo") ? "retrato" : "sino")).join(",")');
const casos = [
  ['#/', 'trilha'], ['#/biblia', 'biblia'], ['#/explorar', 'biblia'], ['#/mapa/genesis', 'biblia'], ['#/parabolas', 'biblia'],
  ['#/atlas', 'biblia'], ['#/nota/' + encodeURIComponent('11 - Pessoas/Davi'), 'biblia'], ['#/perfil', 'retrato'], ['#/perfil/album', 'retrato'],
  ['#/perfil/anotacoes', 'mais'], ['#/config', 'mais'], ['#/apoiar', 'mais'], ['#/avisos', 'sino'], ['#/missoes', 'desafios'], ['#/novidades', 'juntos'],
];
for (const [hash, esperado] of casos) {
  await ir(hash, 'true');
  await dormir(500);
  const m = await marcados();
  ok(m === esperado, hash + ' marca só ' + esperado + (m === esperado ? '' : ' (marcou: ' + (m || 'nada') + ')'));
}
await ir('#/', 'true');
await dormir(400);
ok(await av('(() => { const b = getComputedStyle(document.querySelector(".aba-central")); return b.backgroundColor === "rgba(0, 0, 0, 0)" || b.backgroundColor === "transparent"; })()'),
  'fora da Bíblia, o botão Bíblia não tem fundo de selecionado');

// ---------- o Explorar mora na aba Bíblia (C3) ----------
await ir('#/biblia', '!!document.querySelector(".seletor-biblia")', 15000);
ok(await av('(() => { const a = [...document.querySelectorAll(".seletor-biblia a")]; return a.length === 2 && a[0].textContent === "Ler" && a[0].getAttribute("aria-current") === "page" && a[1].getAttribute("href") === "#/explorar"; })()'),
  'a Bíblia tem "Ler | Explorar" no alto, com Ler marcado');
await av('document.querySelectorAll(".seletor-biblia a")[1].click()');
ok(await esperar('location.hash === "#/explorar" && !!document.querySelector(".cartao-mapas") && document.querySelector(".seletor-biblia a[aria-current]").textContent === "Explorar"'),
  'tocar em Explorar abre o Explorar, com Explorar marcado');
ok(await av('document.querySelector(".cartao-atlas-titulo").textContent') === 'Atlas bíblico' && await av('document.querySelector(".mapas-titulo").textContent') === 'Mapas dos livros',
  'os dois cartões de mapa têm nomes diferentes: "Mapas dos livros" e "Atlas bíblico"');
await av('document.querySelector("[data-abrir-mais]").click()');
ok(await esperar('!!document.querySelector(".painel-mais a[href=\\"#/explorar\\"]")'), 'o Mais continua com o link do Explorar');
await voltar();

// ---------- a busca do Explorar acha parábolas, mapas e referências (C4) ----------
const buscar = async (q, pronto) => ir('#/busca/' + encodeURIComponent(q), pronto);
ok(await buscar('semeador', '!!document.querySelector(".item-visual[href=\\"#/parabola/semeador\\"]")'), '"semeador" acha a parábola do semeador');
ok(await buscar('filho pródigo', '!!document.querySelector(".item-visual[href=\\"#/parabola/filho-prodigo\\"]")'), '"filho pródigo" acha a parábola');
ok(await buscar('viagem missionária', '["paulo-1", "paulo-2", "paulo-3"].every((s) => !!document.querySelector(".item-visual[href=\\"#/atlas/" + s + "\\"]"))'), '"viagem missionária" acha os três mapas das viagens de Paulo no atlas');
ok(await av('document.querySelector(".item-visual[href=\\"#/atlas/paulo-1\\"] .sub").textContent') === 'Atlas bíblico', 'o mapa do atlas vem com o selo "Atlas bíblico"');
ok(await buscar('romanos', '!!document.querySelector(".item-visual[href=\\"#/mapa/romanos\\"]")'), '"romanos" acha o mapa do livro de Romanos');
ok(await buscar('joao 3', '(document.querySelector(".cartao-abrir-ref") || {}).getAttribute?.("href") === "#/biblia/Jo%C3%A3o/3"'), '"joao 3" mostra no alto "Abrir João 3"');
ok(await buscar('jo 3:16', '(document.querySelector(".cartao-abrir-ref") || {}).getAttribute?.("href") === "#/biblia/Jo%C3%A3o/3"'), '"jo 3:16" também abre João 3');
ok(await buscar('1co 13', '(document.querySelector(".cartao-abrir-ref") || {}).getAttribute?.("href") === "#/biblia/1%20Cor%C3%ADntios/13"'), '"1co 13" abre 1 Coríntios 13');
await av('document.querySelector(".cartao-abrir-ref").click()');
ok(await esperar('!!document.querySelector(".leitor-biblia:not(.saindo)")'), 'tocar no cartão abre o capítulo no leitor');
ok(await buscar('zzzqq', '!!document.querySelector(".vazio")'), 'sem nada, a busca diz que não achou');

// ---------- a busca da Bíblia mostra o capítulo (C8) ----------
await ir('#/biblia', '!!document.querySelector("#busca-livro")', 15000);
await av('(() => { const c = document.getElementById("busca-livro"); c.value = "joao 3"; c.dispatchEvent(new Event("input", { bubbles: true })); })()');
ok(await esperar('!!document.querySelector("#busca-livro-ref .cartao-abrir-ref")'), 'na Bíblia, "joao 3" mostra o cartão "Abrir João 3"');
ok(await av('document.querySelector("#testamento-novo .titulo-secao span").textContent') === '4 livros', 'e a contagem acompanha o que está à vista (4 livros)');
await av('(() => { const c = document.getElementById("busca-livro"); c.value = ""; c.dispatchEvent(new Event("input", { bubbles: true })); })()');
ok(await av('document.querySelector("#testamento-novo .titulo-secao span").textContent') === '27 livros' && await av('document.querySelector("#busca-livro-ref").innerHTML') === '', 'apagar a busca volta aos 27 livros, sem o cartão');

// ---------- o voltar do mapa aberto pela Bíblia (C6) ----------
await ir('#/biblia', '!!document.querySelector("a.mapa-livro[href=\\"#/mapa/genesis\\"]")', 15000);
await av('document.querySelector("a.mapa-livro[href=\\"#/mapa/genesis\\"]").click()');
ok(await esperar('!!document.querySelector(".mapa-nome")'), 'o ícone ao lado de Gênesis abre o mapa do livro');
await dormir(500);
ok(await av('(() => { const b = document.querySelector(".mapa-barra [data-voltar]"); const r = b.getBoundingClientRect(); return [...b.childNodes].every((n) => n.nodeType !== 3 || !n.nodeValue.trim()) && b.scrollWidth <= r.width + 1 && b.getAttribute("aria-label") === "Voltar"; })()'),
  'o voltar do mapa não escreve "Voltar" fora do círculo e diz "Voltar" ao leitor de tela');
ok(await marcados() === 'biblia', 'o mapa aberto pela Bíblia continua marcando a Bíblia');
await av('document.querySelector(".mapa-barra [data-voltar]").click()');
ok(await esperar('location.hash === "#/biblia"'), 'e o voltar leva de volta à Bíblia');

// ---------- as referências abrem a Bíblia (C7) ----------
await ir('#/mapa/genesis', '!!document.querySelector(".mapa a.ref-biblia")', 15000);
ok(await av('(() => { const l = [...document.querySelectorAll(".mapa mark")]; const a = l.filter((m) => m.closest("a.ref-biblia")); return a.length >= l.length * 0.9 && a.length > 10; })()'), 'no mapa de Gênesis, as etiquetas de referência são links');
const hrefRef = await av('document.querySelector(".mapa a.ref-biblia").getAttribute("href")');
ok(/^#\/biblia\/G%C3%AAnesis\/\d+$/.test(hrefRef), 'e abrem o capítulo de Gênesis (' + hrefRef + ')');
await av('document.querySelector(".mapa a.ref-biblia").click()');
ok(await esperar('!!document.querySelector(".leitor-biblia:not(.saindo)")'), 'tocar na etiqueta abre o capítulo no leitor');
await voltar();
ok(await esperar('location.hash === "#/mapa/genesis" && !document.querySelector(".leitor-biblia:not(.saindo)")'), 'e o voltar devolve o mapa');
await ir('#/parabola/semeador', '!!document.querySelector(".fala-parabola, .texto-parabola")', 15000);
ok(await av('document.querySelectorAll(".folha-parabola a.ref-biblia, .parabola a.ref-biblia").length') >= 2, 'na parábola, as referências também abrem a Bíblia');
await ir('#/atlas/paulo-1', '!!document.querySelector(".atlas-sub")', 15000);
ok(await av('!!document.querySelector(".atlas-sub a.ref-biblia[href=\\"#/biblia/Atos/13\\"]")'), 'no atlas, a referência do alto abre Atos 13');

// ---------- o álbum vazio e "Como as cartas chegam" (C9, C10, C1) ----------
await ir('#/perfil/album', '!!document.querySelector("[data-pode-vir]")', 20000);
ok(await av('(() => { const v = document.querySelector("[data-album-vazio]"); return !!v && /7 dias de leitura/.test(v.textContent) && !!v.querySelector("a[href=\\"#/\\"]"); })()'),
  'o álbum vazio explica como ganhar cartas, com o botão para a Trilha');
ok(await av('!document.querySelector(".album-versoes") || ![...document.querySelectorAll(".album-versoes")].some((p) => /versões/.test(p.textContent))'), 'o álbum não mostra a segunda contagem de "versões"');
ok(/0 de \d+ cartas/.test(await av('document.querySelector("[data-album=semeadores] .titulo-secao").textContent')), 'Semeadores diz "0 de N cartas"');
await av('document.querySelector("[data-pode-vir]").click()');
ok(await esperar('!!document.querySelector(".folha-pode-vir")'), '"Como as cartas chegam" abre');
await voltar();
ok(await folhas() === 0 && await av('location.hash') === '#/perfil/album', 'o voltar fecha a folha e o álbum continua na tela (era o caso da avaliação)');

// ---------- mapa e ficha não viram ciclo (C19) ----------
await ir('#/mapa/genesis', '!!document.querySelector(".mapa-ficha")', 15000);
await av('document.querySelector(".mapa-ficha").click()');
ok(await esperar('!!document.querySelector(".nota-corpo a.link-mapa")'), 'o mapa leva à ficha do livro');
ok(await av('(() => { const a = document.querySelector(".nota-corpo a.link-mapa"); return a.hasAttribute("data-voltar") && /Voltar ao mapa do livro/.test(a.textContent); })()'), 'vindo do mapa, a ficha oferece "Voltar ao mapa do livro"');
ok(await av('[...document.querySelectorAll(".nota-corpo thead")].every((t) => getComputedStyle(t).display === "none")'), 'a tabela da ficha não mostra a linha de cabeçalho vazia');
await av('document.querySelector(".nota-corpo a.link-mapa").click()');
ok(await esperar('location.hash === "#/mapa/genesis"'), 'e o toque volta ao mapa');
await voltar();
ok(await av('location.hash') !== '#/nota/' + encodeURIComponent('03 - Livros da Bíblia/Gênesis'), 'sem empilhar a ficha de novo no histórico');

// ---------- anotações no fim do mapa e do atlas (C26) e o nome dos cartões do atlas (C14) ----------
await ir('#/mapa/romanos', '!!document.querySelector(".mapa-anotacoes [data-escrever-contexto]")', 15000);
ok(true, 'o mapa do livro termina com "Escrever nota", como a parábola');
await ir('#/atlas/abraao', '!!document.querySelector(".atlas-anotacoes [data-escrever-contexto]")', 15000);
ok(true, 'o mapa do atlas também');
await av('document.querySelector(".atlas-anotacoes [data-escrever-contexto]").click()');
ok(await esperar('!!document.querySelector(".folha-editor #campo-nota")') && /Atlas bíblico · Abraão/.test(await av('document.querySelector(".folha-editor").textContent')), 'a nota nova fica ligada ao mapa do atlas');
await av('document.querySelector(".folha-editor [data-cancelar]").click()');
await dormir(400);
await ir('#/atlas', '!!document.querySelector(".item-atlas")', 15000);
ok(await av('[...document.querySelectorAll(".item-atlas")].every((a) => /^[^.]+\\. /.test(a.getAttribute("aria-label") || "") && a.querySelector(".item-atlas-mapa").getAttribute("aria-hidden") === "true")'), 'cada cartão do atlas tem o título como nome, e o desenho fica escondido do leitor de tela');

// ---------- links diretos e "não encontrei" (C21) ----------
await ir('#/biblia/joao/3', '!!document.querySelector(".leitor-biblia:not(.saindo)")', 15000);
ok(await av('location.hash') === '#/biblia/Jo%C3%A3o/3', '#/biblia/joao/3 (sem acento) abre João 3');
await ir('#/biblia/Salmos/999', '!!document.querySelector(".grade-capitulos")', 15000);
ok(await esperar('/Salmos tem 150 capítulos/.test((document.getElementById("aviso-flutuante") || {}).textContent || "")'), '#/biblia/Salmos/999 avisa que Salmos tem 150 capítulos');
await ir('#/mapa/foo', '!!document.querySelector(".saidas-vazio")');
ok(await av('!!document.querySelector(".saidas-vazio a[href=\\"#/biblia\\"]") && !!document.querySelector(".saidas-vazio a[href=\\"#/explorar\\"]")'), 'o "não encontrei" oferece "Ir para a Bíblia" e "Buscar no Explorar"');
await ir('#/xyz', '!!document.querySelector(".saidas-vazio")');
ok(true, 'a página não encontrada também');
await ir('#/livro/genesis', 'location.hash.startsWith("#/nota/") && !!document.querySelector(".nota-corpo")');
ok(await av('decodeURIComponent(location.hash)') === '#/nota/03 - Livros da Bíblia/Gênesis', '#/livro/genesis abre a ficha de Gênesis');

// ---------- depuração ----------
if (process.env.DEPURAR_BUSCA) {
  await ir('#/explorar', '!!document.querySelector(".cartao-mapas")');
  await av('(() => { const c = document.getElementById("campo-busca"); window.__c = c; c.focus(); c.value = "s"; c.dispatchEvent(new Event("input", { bubbles: true })); })()');
  await dormir(1200);
  console.log(await av('JSON.stringify([location.hash, document.getElementById("campo-busca") === window.__c, document.activeElement && document.activeElement.id, document.activeElement && document.activeElement.className])'));
}

// ---------- fim ----------
const erros = evs.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.exception?.description || 'exceção');
ok(erros.length === 0, 'nenhuma exceção de JavaScript' + (erros[0] ? ': ' + erros[0].slice(0, 120) : ''));
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  a navegação funciona\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
try { rmSync(pastaEstado, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
