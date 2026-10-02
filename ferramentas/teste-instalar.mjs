// Confere o tutorial de instalar no celular: aparece depois de criar a conta pelo
// formulário de verdade, mostra os passos, dá para pular, não volta sozinho, e fica no Perfil.
// Confere também os ícones da tela de início e, num Chrome por caso, cada lugar de onde a
// pessoa pode estar instalando (02/10, "instalar não funciona no Android"): com a janela do
// navegador (evento sintético: o botão chama prompt()), sem ela no Chrome do Android (passo
// manual), dentro do WhatsApp/Instagram/WebView ("Abra no Chrome" com intent://), Samsung
// Internet, Firefox, iPhone, computador e já instalado. Nenhum botão pode ficar mudo.
// Uso: CHROME=<chrome> node ferramentas/teste-instalar.mjs   (PORTA=<n> para fixar a porta)
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { abrir } = await import(pathToFileURL(join(AQUI, 'design', 'ferramentas', 'analise', 'cdp.mjs')).href);
// Porta livre a cada rodada: com a 8207 fixa, duas baterias ao mesmo tempo falavam com o mesmo servidor.
const PORTA = Number(process.env.PORTA) || await portaLivre();
const PASTA = mkdtempSync(join(tmpdir(), 'cc-instalar-'));
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_ABERTO: '' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

console.log('\n  Instalar no celular\n');

// ---------- ícones, sem sessão ----------
const favicon = await fetch(base + '/favicon.ico');
ok(favicon.status === 200 && (favicon.headers.get('content-type') || '').startsWith('image/png'),
  '/favicon.ico é uma imagem, e não a tela de entrada');
const apple = await fetch(base + '/apple-touch-icon.png');
ok(apple.status === 200 && (apple.headers.get('content-type') || '').startsWith('image/png'),
  'o ícone do iPhone sai sem precisar entrar');
const manifesto = await (await fetch(base + '/manifest.webmanifest')).json();
ok(manifesto.icons.some((i) => i.purpose === 'maskable') && manifesto.icons.every((i) => /\?v=\w+$/.test(i.src)),
  'o manifesto traz o ícone recortável do Android, com versão no endereço');
// O que o Chrome do Android exige para oferecer instalar, e que tem de sair sem sessão (o
// manifesto e os ícones são buscados sem cookie, e o servidor do WebAPK nem tem cookie).
ok(manifesto.name && manifesto.short_name && manifesto.start_url && manifesto.scope && manifesto.display === 'standalone',
  'o manifesto tem nome, nome curto, início, escopo e tela cheia');
for (const tamanho of ['192x192', '512x512']) {
  const icone = manifesto.icons.find((i) => i.sizes === tamanho && i.purpose === 'any');
  const r = icone ? await fetch(new URL(icone.src, base + '/manifest.webmanifest')) : null;
  const corpo = r && r.ok ? Buffer.from(await r.arrayBuffer()) : Buffer.alloc(0);
  ok(r && r.ok && (r.headers.get('content-type') || '') === 'image/png' && corpo.length > 24
    && corpo.readUInt32BE(16) + 'x' + corpo.readUInt32BE(20) === tamanho,
  'o ícone ' + tamanho + ' sai sem sessão, como PNG, e tem mesmo ' + tamanho);
}
ok((manifesto.related_applications || []).some((a) => a.platform === 'webapp'),
  'o manifesto aponta para ele mesmo em related_applications (o tutorial sabe se já está instalado)');
const portal = await (await fetch(base + '/')).text();
ok(/rel="apple-touch-icon" href="apple-touch-icon\.png\?v=\w+"/.test(portal) && portal.includes('rel="manifest"'),
  'a tela de entrada declara o ícone da tela de início');

// ---------- navegador ----------
const perfil = mkdtempSync(join(tmpdir(), 'cc-in-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil, '--window-size=390,900', 'about:blank'], { stdio: 'ignore' });
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
// esperar = false para o que só resolve com um toque da pessoa
const av = async (e, esperar = true) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: esperar })).result?.value;
const esperarAte = async (expr, ms = 8000) => {
  for (let t = 0; t < ms; t += 200) { if (await av(expr)) return true; await dormir(200); }
  return false;
};

await cmd('Runtime.enable');
await cmd('Emulation.setUserAgentOverride', {
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
});
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true });
await cmd('Page.navigate', { url: base + '/' });
await dormir(1500);

// ---------- criar a conta pelo formulário de verdade ----------
const preencheu = await av(`(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('form-cadastro')) return false;
  ['boas', 'entrar', 'cadastro'].forEach((n) => { const t = $('tela-' + n); if (t) t.hidden = n !== 'cadastro'; });
  $('nome').value = 'Ana';
  $('nascimento').value = '2000-01-01';
  $('email').value = 'ana@teste.com';
  $('usuario').value = 'ana';
  $('senha-nova').value = 'senha-boa-1';
  // o consentimento sobre o dado de fé (LGPD art. 11) é obrigatório desde o cadastro em passos
  if ($('consentimento-cadastro')) $('consentimento-cadastro').checked = true;
  return true;
})()`);
ok(preencheu, 'o formulário de cadastro está na tela de entrada');
for (let i = 0; i < 3; i++) {
  await av('document.getElementById("form-cadastro").requestSubmit(); 1', false);
  await dormir(500);
}
// Conta nova: nada entre a conta criada e o texto bíblico. O tutorial (e o convite de
// notificações) só vem depois do primeiro dia feito, no "Até amanhã" da lição (02/10/2026:
// antes, as duas folhas vinham logo na primeira abertura e custavam 2 dos 9 toques até a Bíblia).
await esperarAte('!!(window.CC && document.querySelector(".aba"))', 12000);
await esperarAte('!document.getElementById("abertura")', 12000);
await dormir(1500);
ok(await av('!document.querySelector(".cortina")'), 'depois de criar a conta, o app abre sem folha nenhuma na frente da trilha');
ok(await av('localStorage.getItem("cc.instalar") === "1"'), 'a marca de conta nova fica guardada até o primeiro dia feito');
// o primeiro dia: marca as duas passagens, conclui, pula a reflexão e volta à trilha
await av('document.querySelector(".cartao-salvia[data-abrir-dia]").click(); 1', false);
ok(await esperarAte('!!document.querySelector(".licao [data-trilha]")'), 'o cartão de hoje abre a lição do dia 1');
await av('document.querySelectorAll(".licao [data-trilha]").forEach((b) => b.click()); 1', false);
await esperarAte('!document.querySelector(".licao [data-concluir]").disabled');
await av('document.querySelector(".licao [data-concluir]").click(); 1', false);
ok(await esperarAte('!!document.querySelector(".licao.tela-festa [data-pular]")'), '"Concluir o dia" leva à reflexão, sem folha no meio');
await av('document.querySelector(".licao.tela-festa [data-pular]").click(); 1', false);
ok(await esperarAte('!!document.querySelector(".licao.tela-resumo [data-voltar-trilha]")'), '"Pular por hoje" leva ao resumo do dia');
await av('document.querySelector(".licao.tela-resumo [data-voltar-trilha]").click(); 1', false);
const abriu = await esperarAte('!!document.querySelector(".folha-instalar")', 12000);
ok(abriu, 'depois do primeiro "Até amanhã", a conta nova vê o tutorial de instalar');
ok(await av('localStorage.getItem("cc.instalar") === null'), 'a marca de conta nova sai quando o tutorial aparece: não volta a cada abertura');
ok(await av('!!document.querySelector(".folha-instalar [data-pular]")'), 'o tutorial tem como pular');
// O navegador de teste (Chrome, Android) oferece instalar: a conta nova abre no botão de um
// toque, e o passo a passo pelo menu fica a um clique, já nos passos do celular reconhecido.
ok(await av('!!document.querySelector(".folha-instalar [data-instalar-ja]")'), 'com o navegador oferecendo, a conta nova abre no botão de um toque');
await av('document.querySelector(".folha-instalar [data-passo-a-passo]").click(); 1', false);
await dormir(300);
ok(await av('!!document.querySelector(\'.folha-instalar [data-trocar="android"][aria-pressed="true"]\')'), 'o passo a passo reconhece o celular (Android)');

// ---------- iPhone ----------
await av('document.querySelector(\'[data-trocar="ios"]\').click()');
await dormir(300);
const passosIos = await av('[...document.querySelectorAll(".passos-instalar li b")].map((b) => b.textContent)');
ok(Array.isArray(passosIos) && passosIos.length === 4 && passosIos.some((t) => /Compartilhar/.test(t))
  && passosIos.some((t) => /Tela de Início/.test(t)), 'no iPhone, os passos passam por Compartilhar e Tela de Início');

// ---------- troca para Android ----------
await av('document.querySelector(\'[data-trocar="android"]\').click()');
await dormir(300);
const passosAndroid = await av('[...document.querySelectorAll(".passos-instalar li b")].map((b) => b.textContent)');
ok(Array.isArray(passosAndroid) && passosAndroid.some((t) => /três pontinhos/.test(t)) && passosAndroid.some((t) => /Instalar/.test(t)),
  'dá para trocar para Android sem voltar ao começo');

// ---------- pular ----------
await av('document.querySelector(".folha-instalar [data-pular]").click()');
await dormir(400);
ok(await av('!document.querySelector(".folha-instalar")'), 'pular fecha o tutorial');

await cmd('Page.reload');
await esperarAte('!!(window.CC && document.querySelector(".aba"))', 12000);
await dormir(1500);
ok(await av('!document.querySelector(".folha-instalar")'), 'abrir o app de novo não repete o tutorial');

// ---------- no Perfil ----------
await av('location.hash = "#/perfil"');
await dormir(800);
ok(await av('!!document.querySelector("[data-instalar]")'), 'o Perfil tem o botão Instalar no celular');
await av('document.querySelector("[data-instalar]").click(); 1', false);
await dormir(400);
// Quando o navegador avisa que sabe instalar, a folha abre no botão de um toque: perguntar
// qual é o celular é pergunta que ele já respondeu. O passo a passo fica a um clique.
ok(await av('!!document.querySelector(".folha-instalar [data-instalar-ja]")'),
  'com o navegador oferecendo instalação, a folha abre no botão de um toque');
ok(await av('!!document.querySelector(".folha-instalar [data-passo-a-passo]")'),
  'e ainda dá para pedir o passo a passo');
await av('document.querySelector(".folha-instalar [data-passo-a-passo]").click(); 1', false);
await dormir(400);
ok(await av('!!document.querySelector(".folha-instalar .passos-instalar")'),
  'o passo a passo abre nos passos do celular');
ok(await av('!!document.querySelector(\'.folha-instalar [data-trocar="android"][aria-pressed="true"]\')'),
  'e o celular reconhecido é Android');
await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await dormir(300);
ok(await av('!document.querySelector(".folha-instalar")'), 'Esc também fecha');

const erros = evs.filter((e) => e.method === 'Runtime.exceptionThrown');
ok(erros.length === 0, 'nenhuma exceção no caminho'
  + (erros[0] ? ': ' + (erros[0].params.exceptionDetails.exception?.description || erros[0].params.exceptionDetails.text) : ''));

try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }

// ---------- cada lugar de onde se instala, um Chrome limpo por caso ----------
// A conta "ana" já existe; o crachá vem de um login pela API, como o navegador faria.
console.log('\n  Onde a pessoa está\n');
const entrada = await fetch(base + '/api/entrar', { method: 'POST', headers: { 'content-type': 'application/json', origin: base },
  body: JSON.stringify({ login: 'ana', senha: 'senha-boa-1' }) });
const cracha = (entrada.headers.getSetCookie ? entrada.headers.getSetCookie() : [entrada.headers.get('set-cookie')])
  .map((l) => String(l).split(';')[0]).find((l) => l.startsWith('cc_sessao='));
ok(!!cracha, 'a conta do teste entra pela API');
const UA = {
  chrome: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  webview: 'Mozilla/5.0 (Linux; Android 14; SM-A546E; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36',
  instagram: 'Mozilla/5.0 (Linux; Android 14; SM-A546E; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0 Android',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  firefox: 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneInsta: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0',
  computador: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
};
// Sem o aviso de verdade: um ouvinte de captura registrado antes de tudo engole o evento que o
// Chrome sem interface dispara, e o app fica como no celular em que o Chrome não ofereceu.
const SEM_AVISO = "addEventListener('beforeinstallprompt', (e) => { if (!e.__sintetico) e.stopImmediatePropagation(); }, true);";
// O aviso sintético: prompt() e userChoice falsos, e um contador de chamadas em window.__prompts.
const avisoSintetico = (desfecho) => `(() => {
  const e = new Event('beforeinstallprompt', { cancelable: true });
  e.__sintetico = true;
  window.__prompts = 0;
  e.prompt = () => { window.__prompts++; return ${desfecho === 'falha' ? "Promise.reject(new DOMException('não deixou', 'NotAllowedError'))" : 'Promise.resolve()'}; };
  e.userChoice = Promise.resolve({ outcome: '${desfecho === 'aceito' ? 'accepted' : 'dismissed'}', platform: 'web' });
  window.dispatchEvent(e);
  return true;
})()`;
async function caso(nome, { ua, pre = '', antes = '', sintetico = '' }, conferir) {
  const c = await abrir({ cookie: cracha, base: base + '/', largura: 390, altura: 844, pre: SEM_AVISO + pre });
  const excecoes = [];
  c.ouvir('Runtime.exceptionThrown', (p) => excecoes.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
  try {
    await c.cmd('Emulation.setUserAgentOverride', { userAgent: ua });
    await c.cmd('Network.setCookie', { name: 'cc_logado', value: '1', url: base + '/' });
    await c.cmd('Page.navigate', { url: base + '/#/perfil' });
    const pronto = async (expr, ms = 15000) => { for (let t = 0; t < ms; t += 200) { const v = await c.av(expr); if (v && !v.erro) return true; await dormir(200); } return false; };
    await pronto('!!(window.CC && document.querySelector("[data-instalar]")) && !document.querySelector("#abertura:not(.saindo)")');
    await dormir(600);
    await c.av('document.querySelectorAll(".cortina").forEach((x) => x.remove()); 1');
    if (antes) await c.av(antes);
    if (sintetico) await c.av(avisoSintetico(sintetico));
    await c.av('document.querySelector("[data-instalar]").click(); 1');
    await pronto('!!document.querySelector(".folha-instalar h2")', 5000);
    await dormir(300);
    const texto = await c.av('document.querySelector(".folha-instalar") ? document.querySelector(".folha-instalar").innerText : ""');
    await conferir({ ...c, texto: String(texto || ''), pronto }, nome);
  } finally {
    ok(excecoes.length === 0, nome + ': nenhuma exceção' + (excecoes[0] ? ': ' + excecoes[0] : ''));
    await c.fechar();
  }
}

await caso('Chrome no Android, com a janela do navegador (aceita)', { ua: UA.chrome, sintetico: 'aceito' }, async ({ av, texto, pronto }, nome) => {
  ok(await av('!!document.querySelector(".folha-instalar [data-instalar-ja]")'), nome + ': abre no botão de um toque');
  await av('document.querySelector(".folha-instalar [data-instalar-ja]").click(); 1');
  await pronto('!document.querySelector(".folha-instalar")', 3000);
  ok(await av('window.__prompts') === 1, nome + ': o botão chama prompt() da janela do navegador');
  ok(await av('!document.querySelector(".folha-instalar")'), nome + ': aceito, a folha fecha');
  ok(await av('localStorage.getItem("cc.instalado") !== null'), nome + ': fica anotado que instalou');
});
await caso('Chrome no Android, janela recusada', { ua: UA.chrome, sintetico: 'recusado' }, async ({ av, pronto }, nome) => {
  await av('document.querySelector(".folha-instalar [data-instalar-ja]").click(); 1');
  await pronto('!!document.querySelector(".folha-instalar .passos-instalar")', 3000);
  ok(await av('window.__prompts') === 1, nome + ': prompt() foi chamado');
  ok(await av('!!document.querySelector(".folha-instalar .passos-instalar") && /mudar de ideia/.test(document.querySelector(".folha-instalar").innerText)'),
    nome + ': recusada, mostra os passos pelo menu');
});
await caso('Chrome no Android, a janela não abre (prompt falha)', { ua: UA.chrome, sintetico: 'falha' }, async ({ av, pronto }, nome) => {
  await av('document.querySelector(".folha-instalar [data-instalar-ja]").click(); 1');
  await pronto('!!document.querySelector(".folha-instalar .passos-instalar")', 3000);
  const t = await av('document.querySelector(".folha-instalar").innerText');
  ok(/não abriu/.test(t) && /três pontinhos/.test(t) && /Instalar app/.test(t), nome + ': o botão não fica mudo: diz que não abriu e mostra o menu ⋮ > Instalar app');
  ok(await av('!document.querySelector(".folha-instalar [data-instalar-ja]")'), nome + ': e não oferece de novo um botão que já não funciona');
});
await caso('Chrome no Android, sem a janela do navegador', { ua: UA.chrome }, async ({ av, texto }, nome) => {
  ok(!(await av('!!document.querySelector(".folha-instalar [data-instalar-ja]")')), nome + ': nenhum botão de instalar sem o aviso do navegador');
  ok(/três pontinhos/.test(texto) && /Instalar app/.test(texto) && /Adicionar à tela inicial/.test(texto) && /Abrir no Chrome/.test(texto),
    nome + ': passo manual ⋮ > Instalar app (ou Adicionar à tela inicial), e o que fazer se o menu só tiver "Abrir no Chrome"');
  ok(await av('document.querySelectorAll(".folha-instalar .passos-instalar li .marca-passo svg").length') >= 3, nome + ': cada passo tem desenho');
  ok(!/Qual celular/.test(texto), nome + ': não pergunta o celular que o navegador já disse');
  await av('document.querySelector(".folha-instalar [data-nao-funcionou]").click(); 1');
  const ajuda = await av('document.querySelector(".ajuda-instalar-corpo:not([hidden])") ? document.querySelector(".ajuda-instalar-corpo").innerText : ""');
  ok(/Abrir app/.test(ajuda) && /janela de instalar: não veio/.test(ajuda) && /service worker: ativo/.test(ajuda),
    nome + ': "Não funcionou?" explica o "Abrir app" e mostra o diagnóstico (janela não veio, service worker ativo)');
});
await caso('Aba aberta pelo WhatsApp (Chrome com referrer android-app)', { ua: UA.chrome, pre: "try{sessionStorage.setItem('cc.origemApp','android-app://com.whatsapp/')}catch(e){}" }, async ({ av, texto }, nome) => {
  ok(/Abra no Chrome/.test(texto) && /WhatsApp/.test(texto), nome + ': pede para abrir no Chrome e diz que veio pelo WhatsApp');
  const href = await av('(document.querySelector(".folha-instalar [data-abrir-chrome]") || {}).href || ""');
  ok(/^intent:\/\/127\.0\.0\.1:\d+\/#Intent;scheme=http;package=com\.android\.chrome;S\.browser_fallback_url=[^;]+;end$/.test(href), nome + ': botão Abrir no Chrome com intent:// (' + href.slice(0, 60) + '...)');
  ok(await av('!!document.querySelector(".folha-instalar [data-copiar-link]")'), nome + ': e Copiar o link como alternativa');
});
await caso('Navegador de dentro de um app (WebView "; wv)")', { ua: UA.webview }, async ({ av, texto }, nome) => {
  ok(/Abra no Chrome/.test(texto) && await av('!!document.querySelector(".folha-instalar [data-abrir-chrome]")'), nome + ': "Abra no Chrome" com o botão que abre o Chrome');
  ok(!(await av('!!document.querySelector(".folha-instalar [data-instalar-ja]")')), nome + ': sem botão de instalar ali dentro');
});
await caso('Instagram no Android', { ua: UA.instagram }, async ({ texto }, nome) => {
  ok(/Abra no Chrome/.test(texto) && /Instagram/.test(texto), nome + ': "Abra no Chrome", dizendo que é o Instagram');
});
await caso('Samsung Internet', { ua: UA.samsung }, async ({ texto }, nome) => {
  ok(/Samsung Internet/.test(texto) && /três tracinhos/.test(texto) && /Adicionar página a/.test(texto), nome + ': os passos do menu dele (≡ > Adicionar página a > Tela inicial)');
});
await caso('Firefox no Android', { ua: UA.firefox }, async ({ texto }, nome) => {
  ok(/Firefox/.test(texto) && /Instalar/.test(texto), nome + ': os passos do Firefox');
});
await caso('iPhone (Safari)', { ua: UA.iphone }, async ({ texto }, nome) => {
  ok(/Compartilhar/.test(texto) && /Tela de Início/.test(texto), nome + ': Compartilhar > Adicionar à Tela de Início');
});
await caso('Instagram no iPhone', { ua: UA.iphoneInsta }, async ({ av, texto }, nome) => {
  ok(/Abra no Safari/.test(texto) && !(await av('!!document.querySelector("[data-abrir-chrome]")')), nome + ': "Abra no Safari", sem o link do Chrome');
});
await caso('Computador', { ua: UA.computador }, async ({ av, texto }, nome) => {
  ok(/Qual celular/.test(texto), nome + ': pergunta qual celular');
  await av('document.querySelector(\'[data-sistema="android"]\').click(); 1');
  ok(/três pontinhos/.test(await av('document.querySelector(".folha-instalar").innerText')), nome + ': escolhido Android, os passos do Chrome');
});
await caso('Computador com a janela do navegador, pelo menu', { ua: UA.computador, sintetico: 'recusado' }, async ({ av }, nome) => {
  await av('document.querySelector(".folha-instalar [data-passo-a-passo]").click(); 1');
  await dormir(300);
  ok(await av('!!document.querySelector(".folha-instalar .passos-instalar")'), nome + ': "pelo menu" abre os passos (antes, um computador sem sistema reconhecido quebrava aqui)');
});
await caso('Já instalado no Android', { ua: UA.chrome, pre: 'Object.defineProperty(navigator, "getInstalledRelatedApps", { value: () => Promise.resolve([{ platform: "webapp" }]) });' }, async ({ av, texto }, nome) => {
  ok(/já está instalado/.test(texto) && !(await av('!!document.querySelector(".folha-instalar [data-instalar-ja]")')), nome + ': diz que já está instalado e não oferece instalar');
});

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o tutorial de instalar funciona\n');
try { servidor.kill(); } catch { /* ok */ }
try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
