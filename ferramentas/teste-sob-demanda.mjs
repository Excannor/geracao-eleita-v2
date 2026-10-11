// As peças sob demanda (src/sob-demanda/, pedidas por CC.pedirPeca) num Chrome sem interface,
// com contas criadas pela API num servidor próprio:
//   - o gerador de QR: o Pix e o convite desenham o código depois que o gerador chega; sem rede
//     na primeira vez, o lugar do código diz "Sem conexão. Tente de novo." e o botão tenta de
//     novo; depois de uma vez, o código sai sem rede;
//   - a tela do mapa: a barra e o nome aparecem na hora; sem rede na primeira vez, o recado
//     com o "Tentar de novo"; com rede, o mapa inteiro; depois, sem rede, também;
//   - o painel do administrador: o título e o esqueleto na hora; sem rede na primeira vez, o
//     recado com o "Tentar de novo"; com rede, os números e o "Enviar aviso" (outra peça);
//   - nenhuma peça vem junto com a abertura do app: cada uma é pedida só quando a tela abre.
// Uso: CHROME=<chrome> node ferramentas/teste-sob-demanda.mjs   (PORTA=<porta> para trocar a 8378)
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA_NAV = await portaLivre();
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8378;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-sob-demanda-'));
// Sem rede de verdade: a emulação do Chrome vale para a página, mas não para o service worker,
// que buscaria a peça mesmo assim. Por isso a "falta de rede" aqui é o servidor desligado (e
// ligado de novo com o mesmo estado), além da emulação, que faz navigator.onLine dizer false.
let servidor = null;
const base = 'http://127.0.0.1:' + PORTA + '/';
async function ligarServidor() {
  servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
    env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_ADMIN: 'chefe' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) { try { await fetch(base + 'api/existe-conta'); return; } catch { await dormir(150); } }
}
async function desligarServidor() {
  const fim = new Promise((r) => servidor.once('exit', r));
  servidor.kill();
  await fim;
}
await ligarServidor();
const perfil = mkdtempSync(join(tmpdir(), 'cc-sob-demanda-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil,
  '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });


// ---------- a API ----------
const pedir = async (rota, corpo, cookie) => {
  const r = await fetch(base + rota, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0], dado: await r.json().catch(() => ({})) };
};
const criar = async (usuario) => (await pedir('api/criar-conta', {
  usuario, senha: 'senha123', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true,
})).cookie;
const chefe = await criar('chefe');

// ---------- o navegador ----------
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
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); } else if (m.method) evs.push(m);
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
const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
const clicar = (sel) => av('(() => { const el = ' + q(sel) + '; if (!el) return false; el.click(); return true; })()');
const semRede = async (sim) => {
  await cmd('Network.emulateNetworkConditions', { offline: sim, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  if (sim) await desligarServidor(); else await ligarServidor();
};
// os arquivos de peça que a página já pediu (pelo <script> que CC.pedirPeca põe no <head>)
const pedidas = () => av('[...document.querySelectorAll("head script[src]")].map((s) => s.getAttribute("src").replace("./", "").split(".")[0])');
const fecharFolha = () => av('document.querySelectorAll(".cortina").forEach((c) => c.remove()); true');

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Network.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });

console.log('\n  Peças sob demanda\n');

// Entra como o administrador e espera o service worker assumir a página (é ele que guarda as
// peças para abrir sem rede).
await cmd('Page.navigate', { url: base + 'privacidade.html' });
await esperar('document.readyState === "complete"');
const [nomeCookie, ...resto] = chefe.split('=');
await cmd('Network.setCookie', { name: nomeCookie, value: resto.join('='), url: base });
await cmd('Page.navigate', { url: base + '#/explorar' });
ok(await esperar('!!window.CC && !!document.querySelector(".cartao-mapas")', 15000), 'o app abre no Explorar');
await esperar('navigator.serviceWorker && navigator.serviceWorker.ready.then(() => true)', 10000);
await cmd('Page.reload');
ok(await esperar('!!navigator.serviceWorker.controller && !!document.querySelector(".cartao-mapas")', 15000), 'o service worker assume a página');
const iniciais = await pedidas();
ok(Array.isArray(iniciais) && !iniciais.some((n) => ['qrcode', 'mapa-tela', 'painel-tela'].includes(n)), 'abrir o app não pede nenhuma peça (' + (iniciais || []).join(', ') + ')');
ok(await av('typeof window.qrcode === "undefined" && typeof window.QR_GERADOR === "string" && /^qrcode\\.[0-9a-f]{10}\\.js$/.test(window.QR_GERADOR)'), 'o gerador de QR não vem no index.html, só o nome do arquivo');

// ---------- o gerador de QR ----------
// Primeira vez sem rede: o lugar do código vira o recado com o "Tentar de novo".
await av('location.hash = "#/apoiar"');
ok(await esperar('!!' + q('[data-qr-pix]')), 'a tela de apoiar abre');
await semRede(true);
await clicar('[data-qr-pix]');
ok(await esperar('!!' + q('.folha .qr-convite.falhou'), 6000), 'sem rede na primeira vez, o QR do Pix não some em silêncio');
ok(await av(q('.folha .qr-erro') + '?.textContent === "Sem conexão. Tente de novo." && !!' + q('.folha [data-qr-tentar]')), 'o recado diz "Sem conexão. Tente de novo." e tem o botão');
await semRede(false);
await clicar('.folha [data-qr-tentar]');
ok(await esperar('!!' + q('.folha .qr-convite svg') + ' && !' + q('.folha .qr-convite.carregando'), 8000), 'com rede, "Tentar de novo" desenha o código');
ok(await av('(() => { const s = ' + q('.folha .qr-convite svg') + '; const r = s.getBoundingClientRect(); return r.width > 100 && Math.abs(r.width - r.height) < 2 && s.querySelectorAll("rect, path").length > 0; })()'), 'o código é um quadrado desenhado');
await fecharFolha();

// O convite: o código chega já na folha (o gerador já está na página).
ok(await av('(() => { document.body.insertAdjacentHTML("beforeend", "<div id=qr-teste>" + CC.qrDoLink("http://exemplo/?convite=abc") + "</div>"); return true; })()')
  && await esperar('!!document.querySelector("#qr-teste .qr-convite[data-qr-feito] svg") && !!document.querySelector("#qr-teste .qr-legenda")'), 'o QR do convite desenha com a legenda');
await av('document.getElementById("qr-teste").remove()');

// ---------- a tela do mapa ----------
// A casca (a barra, a cabeça com o nome) aparece na hora; o desenho do mapa vem da peça.
await semRede(true);
await av('location.hash = "#/mapa/isaias"');
ok(await esperar('!!' + q('.folha-mapa .mapa-nome') + ' && ' + q('.folha-mapa .mapa-nome') + '.textContent === "Isaías"', 4000), 'o mapa abre na hora com a barra e o nome do livro');
ok(await esperar('!!' + q('.estado.erro [data-acao-estado]'), 8000), 'sem rede na primeira vez, o mapa não fica carregando para sempre');
ok(await av(q('.estado.erro b') + '?.textContent === "Sem conexão. Tente de novo."'), 'o recado diz "Sem conexão. Tente de novo."');
await semRede(false);
await clicar('[data-acao-estado]');
ok(await esperar('document.querySelectorAll(".mapa .mapa-ramo").length >= 3 && !!' + q('.mapa .mapa-conexao .seta'), 10000), 'com rede, "Tentar de novo" desenha o mapa inteiro');
ok(await av('!!document.querySelector("style[data-mapa-tela]") && getComputedStyle(' + q('.mapa-raiz') + ').borderTopStyle === "dashed"'), 'o estilo da tela do mapa chega junto com ela');
ok((await pedidas()).includes('mapa-tela'), 'a tela do mapa foi pedida só agora');
await av('location.hash = "#/explorar"');
ok(await esperar('!!' + q('.cartao-mapas .mapas-titulo') + ' && getComputedStyle(' + q('.cartao-mapas') + ').borderTopLeftRadius !== "0px"'), 'o cartão dos mapas segue no Explorar, com o estilo dele');

// ---------- o painel do administrador ----------
// O item do Mais vem no index (só para o administrador); o painel em si, da peça.
ok(!!(await av('CC.quem && CC.quem.admin')), 'a conta de teste é a do administrador');
await semRede(true);
await av('location.hash = "#/config/painel"');
// (sem servidor, o erro chega quase junto: vale o esqueleto ou o recado, com o título em cima)
ok(await esperar(q('.folha-perfil h1') + '?.textContent === "Painel do administrador" && !!(' + q('.esqueleto') + ' || ' + q('.estado.erro') + ')', 4000), 'o painel abre na hora com o título');
ok(await esperar('!!' + q('.estado.erro [data-acao-estado]'), 8000), 'sem rede na primeira vez, o painel não fica carregando para sempre');
ok(await av(q('.estado.erro b') + '?.textContent === "Sem conexão. Tente de novo."'), 'o recado diz "Sem conexão. Tente de novo."');
await semRede(false);
await clicar('[data-acao-estado]');
ok(await esperar('!!' + q('.painel-resumo .painel-cartao') + ' && !!' + q('a.painel-ir[href="#/config/painel/aviso"]'), 10000), 'com rede, "Tentar de novo" abre o painel com os números');
ok((await pedidas()).includes('painel-tela'), 'o painel foi pedido só agora');
// a tela do aviso (outra peça, aviso-tela) continua abrindo a partir do painel
await clicar('a.painel-ir[href="#/config/painel/aviso"]');
ok(await esperar('!!' + q('.aviso-tela') + ' && !!document.querySelector("style[data-aviso-tela]")', 10000), 'Enviar aviso abre a partir do painel, com o estilo dele');
await av('location.hash = "#/config/painel"');
ok(await esperar('!!' + q('.painel-resumo .painel-cartao'), 8000), 'voltar ao painel desenha de novo, sem pedir a peça outra vez');
// o Mais mostra o item do painel ao administrador, e ele leva ao painel
await av('location.hash = "#/explorar"');
await esperar('!!' + q('.cartao-mapas'));
await clicar('[data-abrir-mais]');
ok(await esperar('!!' + q('.painel-mais a[href="#/config/painel"]')), 'o Mais mostra "Painel do administrador" ao administrador');
await clicar('.painel-mais a[href="#/config/painel"]');
ok(await esperar('location.hash === "#/config/painel" && !!' + q('.painel-resumo .painel-cartao'), 8000), 'o item do Mais abre o painel');

// Depois de uma vez, tudo sai sem rede, mesmo com a página recarregada.
await semRede(true);
await cmd('Page.reload');
ok(await esperar('!!window.CC && !!document.querySelector("#conteudo")', 15000), 'sem rede, o app abre');
await av('location.hash = "#/apoiar"');
await esperar('!!' + q('[data-qr-pix]'));
await clicar('[data-qr-pix]');
ok(await esperar('!!' + q('.folha .qr-convite svg'), 8000), 'sem rede, o QR do Pix sai do gerador guardado');
await fecharFolha();
await av('location.hash = "#/mapa/isaias"');
ok(await esperar('document.querySelectorAll(".mapa .mapa-ramo").length >= 3', 10000), 'sem rede, o mapa já aberto uma vez sai da tela guardada');
await av('location.hash = "#/config/painel"');
ok(await esperar('!!' + q('.estado.erro') + ' && ' + q('.folha-perfil h1') + '?.textContent === "Painel do administrador"', 10000)
  && await av('!document.querySelector(".estado.erro b") || document.querySelector(".estado.erro b").textContent === "Não deu para carregar o painel"'),
'sem rede, o painel guardado abre e diz que não deu para buscar os números (como antes)');
await semRede(false);

const erros = evs.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.exception?.description || 'exceção');
ok(erros.length === 0, 'nenhuma exceção de JavaScript' + (erros[0] ? ': ' + erros[0].slice(0, 160) : ''));

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  as peças chegam quando a tela abre e continuam sem rede\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { if (servidor) servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
try { rmSync(pastaEstado, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
