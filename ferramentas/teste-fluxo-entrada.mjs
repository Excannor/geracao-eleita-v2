// O fluxo de entrada e saída num Chrome sem interface, como um celular só (o mesmo perfil do
// começo ao fim, com service worker e localStorage): página de entrada → privacidade/termos →
// voltar, criar conta, sair, sessão vencida, link direto sem sessão, recarregar e sem rede.
// Em cada passo um espião conta, quadro a quadro (requestAnimationFrame), se algum pedaço do
// app foi pintado para quem não está logado: o dono viu a trilha piscar ao voltar da
// privacidade (02/10), e quem não tem sessão nunca pode ver nada do app.
// No fim, a barra do alto da página de entrada rolando aos poucos, com toque, a 390x844 e
// 360x800 (densidade 3): ela tem de ficar parada ao pixel, mesmo quando a barra de endereço some.
// Uso: CHROME=<chrome> node ferramentas/teste-fluxo-entrada.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { portaLivre } from './navegador.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { abrir, dormir } = await import(pathToFileURL(join(AQUI, 'design', 'ferramentas', 'analise', 'cdp.mjs')).href);
const PORTA = await portaLivre();
const BASE = 'http://127.0.0.1:' + PORTA + '/';

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-fluxo-estado-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json') }, stdio: 'ignore',
});
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE + 'api/versao')).ok) break; } catch { /* subindo */ }
  await dormir(200);
}

// Uma conta já existente (para "Já tenho conta"), criada pela API como qualquer cadastro.
const SENHA = 'senha-do-teste-1';
await fetch(BASE + 'api/criar-conta', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ nome: 'Rute', nascimento: '2000-05-10', email: 'rute@exemplo.com', usuario: 'rute', senha: SENHA, fuso: 'America/Sao_Paulo', consentimento: true, caminho: 'plano' }),
});

// O espião: em cada documento, a cada quadro, o que está na tela. Cada documento tem um número
// próprio, para separar os quadros da página de antes dos da página que veio depois.
const ESPIAO = `(() => {
  const doc = Math.random().toString(36).slice(2, 8);
  let n = 0;
  const olhar = () => {
    const raiz = document.documentElement;
    const vis = raiz ? getComputedStyle(raiz).visibility : 'hidden';
    const capa = document.querySelector('#abertura:not(.saindo)') && !raiz.classList.contains('sem-abertura');
    try { window.relatar(JSON.stringify({ doc, url: location.pathname + location.hash,
      app: !!document.querySelector('#conteudo > *') && vis !== 'hidden' && !capa,
      entrada: !!document.querySelector('#tela-boas:not([hidden]), #tela-entrar:not([hidden]), #tela-cadastro:not([hidden])') && vis !== 'hidden' })); } catch (e) {}
    if (++n < 400) requestAnimationFrame(olhar);
  };
  requestAnimationFrame(olhar);
})();`;

const perfil = mkdtempSync(join(tmpdir(), 'cc-fluxo-perfil-'));
const s = await abrir({ base: BASE, largura: 390, altura: 844, perfil, pre: "try{sessionStorage.setItem('cc.abertura','1')}catch(e){}" });
const { cmd, av } = s;
const quadros = [];
await cmd('Runtime.addBinding', { name: 'relatar' });
s.ouvir('Runtime.bindingCalled', (p) => { if (p.name === 'relatar') quadros.push(JSON.parse(p.payload)); });
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: ESPIAO });

const esperar = async (expr, ms = 8000) => {
  for (let t = 0; t < ms; t += 120) {
    const v = await av(expr);
    if (v && !v.erro) return true;
    await dormir(120);
  }
  return false;
};
const naEntrada = () => esperar('!!document.querySelector("#tela-boas, #tela-entrar") && document.readyState === "complete"');
const noApp = () => esperar('!!document.querySelector("#conteudo > *") && getComputedStyle(document.documentElement).visibility !== "hidden"');
const docAtual = async () => { await dormir(60); return quadros.length ? quadros[quadros.length - 1].doc : ''; };
// Faz a ação e devolve os quadros dos documentos que vieram depois dela (e do mesmo, se ficar).
async function passo(acao, { esperaMs = 1800, mesmoDoc = false } = {}) {
  const antes = await docAtual();
  const inicio = quadros.length;
  await acao();
  await dormir(esperaMs);
  return quadros.slice(inicio).filter((q) => mesmoDoc || q.doc !== antes);
}
const ir = (url) => cmd('Page.navigate', { url });
const clicarLink = (re) => av('(() => { const a = [...document.querySelectorAll("a")].find((x) => ' + re + '.test(x.getAttribute("href") || "") && !x.target); if (!a) return false; a.click(); return true; })()');
const cookies = async () => ((await cmd('Network.getCookies', { urls: [BASE] })).cookies || []).map((c) => c.name);
const casos = [];
const caso = (nome, esperado, obtido, passou) => { casos.push({ nome, esperado, obtido, passou }); ok(passou, nome + ': ' + obtido); };

console.log('\n  Fluxo de entrada e saída\n');

// ---------- 1. sem conta nenhuma neste aparelho ----------
let q = await passo(() => ir(BASE));
await naEntrada();
caso('abrir sem conta', 'página de entrada, nada do app', 'entrada=' + q.some((x) => x.entrada) + ', quadros do app=' + q.filter((x) => x.app).length,
  q.some((x) => x.entrada) && !q.some((x) => x.app));

for (const [pagina, re] of [['privacidade', '/privacidade/'], ['termos', '/termos/']]) {
  await passo(() => clicarLink(re));
  ok(await esperar('location.pathname.endsWith("' + pagina + '.html")'), 'a entrada abre ' + pagina);
  const texto = await av('(document.querySelector("a.voltar") || {}).textContent');
  ok(texto === 'Voltar ao início', pagina + ' sem sessão não promete o aplicativo ("' + texto + '")');
  q = await passo(() => av('history.back()'));
  await naEntrada();
  caso(pagina + ' → voltar do navegador (sem conta)', 'página de entrada, nada do app', 'url=' + (await av('location.pathname')) + ', quadros do app=' + q.filter((x) => x.app).length,
    !q.some((x) => x.app) && !!(await av('!!document.getElementById("tela-boas")')));
  await passo(() => clicarLink(re));
  await esperar('location.pathname.endsWith("' + pagina + '.html")');
  q = await passo(() => av('document.querySelector("a.voltar").click()'));
  await naEntrada();
  caso(pagina + ' → "Voltar ao início" (sem conta)', 'página de entrada, nada do app', 'url=' + (await av('location.pathname')) + ', quadros do app=' + q.filter((x) => x.app).length,
    !q.some((x) => x.app) && !!(await av('!!document.getElementById("tela-boas")')));
}
q = await passo(() => cmd('Page.reload'));
await naEntrada();
caso('recarregar a entrada (sem conta)', 'página de entrada', 'quadros do app=' + q.filter((x) => x.app).length, !q.some((x) => x.app) && q.some((x) => x.entrada));
q = await passo(() => ir(BASE + '#/biblia'));
await naEntrada();
caso('link direto #/biblia sem sessão (sem cache)', 'página de entrada, o hash fica', 'hash=' + (await av('location.hash')) + ', quadros do app=' + q.filter((x) => x.app).length,
  !q.some((x) => x.app) && (await av('location.hash')) === '#/biblia');

// ---------- 2. criar conta pelo formulário ----------
await ir(BASE);
await naEntrada();
await av('document.getElementById("botao-comecar").click()');
await esperar('!document.getElementById("tela-cadastro").hidden');
const preencher = (id, v) => av('(() => { const e = document.getElementById(' + JSON.stringify(id) + '); e.value = ' + JSON.stringify(v) + '; e.dispatchEvent(new Event("input", { bubbles: true })); })()');
await preencher('nome', 'Sheyla');
await preencher('nascimento', '04032001');
await av('document.getElementById("botao-cadastro").click()');
await preencher('email', 'sheyla@exemplo.com');
await av('document.getElementById("botao-cadastro").click()');
await preencher('usuario', 'sheyla');
await preencher('senha-nova', SENHA);
await av('document.getElementById("consentimento-cadastro").checked = true');
q = await passo(() => av('document.getElementById("botao-cadastro").click()'), { esperaMs: 3000 });
await noApp();
caso('criar conta → app', 'app com a trilha, marca de sessão no aparelho', 'app=' + (await av('!!document.querySelector(".no")')) + ', cookies=' + (await cookies()).join(','),
  !!(await av('!!document.querySelector(".no")')) && (await cookies()).includes('cc_logado'));
ok(!(await av('document.cookie.includes("cc_sessao")')), 'o crachá continua fora do alcance do JavaScript (HttpOnly)');
// o service worker guarda o app: daqui em diante "/" vem do cache, como no celular
ok(await esperar('navigator.serviceWorker && navigator.serviceWorker.controller && caches.keys().then((n) => n.some((x) => /^caminho-[0-9a-f]/.test(x)))', 15000), 'o service worker assumiu e guardou o app');
await dormir(800);
q = await passo(() => cmd('Page.reload'));
await noApp();
caso('recarregar o app (logado)', 'app, nada da entrada', 'quadros da entrada=' + q.filter((x) => x.entrada).length, !q.some((x) => x.entrada) && q.some((x) => x.app));

// ---------- 3. logado: privacidade pelo Juntos e voltar ----------
await av('location.hash = "#/novidades"');
await esperar('!!document.querySelector(".rodape-privacidade a[href=\\"privacidade.html\\"]")');
await passo(() => av('document.querySelector(".rodape-privacidade a[href=\\"privacidade.html\\"]").click()'));
await esperar('location.pathname.endsWith("privacidade.html")');
ok((await av('document.querySelector("a.voltar").textContent')) === 'Voltar ao aplicativo', 'logado, a privacidade oferece voltar ao aplicativo');
q = await passo(() => av('history.back()'));
await noApp();
caso('logado → privacidade → voltar', 'app no Juntos, nada da entrada', 'hash=' + (await av('location.hash')) + ', quadros da entrada=' + q.filter((x) => x.entrada).length,
  !q.some((x) => x.entrada) && (await av('location.hash')) === '#/novidades');
await passo(() => av('document.querySelector(".rodape-privacidade a[href=\\"privacidade.html\\"]").click()'));
await esperar('location.pathname.endsWith("privacidade.html")');
q = await passo(() => av('document.querySelector("a.voltar").click()'));
await noApp();
caso('logado → privacidade → "Voltar ao aplicativo"', 'app, nada da entrada', 'hash=' + (await av('location.hash')) + ', quadros da entrada=' + q.filter((x) => x.entrada).length,
  !q.some((x) => x.entrada) && q.some((x) => x.app));

// ---------- 4. sair ----------
await av('location.hash = "#/config"');
await esperar('!!document.querySelector("[data-sair]")');
await av('document.querySelector("[data-sair]").click()');
await esperar('!!document.querySelector(".cortina [data-sim]")');
q = await passo(() => av('document.querySelector(".cortina [data-sim]").click()'), { esperaMs: 2500 });
await naEntrada();
caso('sair da conta', 'página de entrada, nada do app depois de sair', 'url=' + (await av('location.pathname')) + ', quadros do app=' + q.filter((x) => x.app).length + ', cookies=' + (await cookies()).join(','),
  !q.some((x) => x.app) && !(await cookies()).includes('cc_logado'));
ok(!(await av('localStorage.getItem("cc.app.estado")')), 'o progresso de quem saiu não fica no aparelho');
q = await passo(() => av('history.back()'), { esperaMs: 2200 });
caso('sair → voltar do navegador', 'não reabre o app de quem saiu', 'url=' + (await av('location.pathname + location.hash')) + ', quadros do app=' + q.filter((x) => x.app).length,
  !q.some((x) => x.app));
await ir(BASE);
await naEntrada();
for (const [pagina, re] of [['privacidade', '/privacidade/'], ['termos', '/termos/']]) {
  await passo(() => clicarLink(re));
  await esperar('location.pathname.endsWith("' + pagina + '.html")');
  q = await passo(() => av('document.querySelector("a.voltar").click()'));
  await naEntrada();
  caso(pagina + ' → voltar, com o app em cache e sem sessão', 'página de entrada, nada do app', 'quadros do app=' + q.filter((x) => x.app).length, !q.some((x) => x.app));
}
q = await passo(() => ir(BASE + 'privacidade.html'));
await esperar('location.pathname.endsWith("privacidade.html")');
q = await passo(() => ir(BASE));
await naEntrada();
caso('abrir "/" sem sessão, com o app em cache', 'página de entrada, nada do app', 'url=' + (await av('location.pathname')) + ', quadros do app=' + q.filter((x) => x.app).length, !q.some((x) => x.app));

// ---------- 5. link direto sem sessão, e entrar ----------
q = await passo(() => ir(BASE + '#/mapa/genesis'));
await naEntrada();
caso('link direto #/mapa/genesis sem sessão (app em cache)', 'página de entrada, nada do app', 'url=' + (await av('location.pathname + location.hash')) + ', quadros do app=' + q.filter((x) => x.app).length,
  !q.some((x) => x.app));
await av('document.querySelector("[data-ir=entrar]").click()');
await preencher('login', 'rute');
await preencher('senha-entrar', SENHA);
q = await passo(() => av('document.getElementById("botao-entrar").click()'), { esperaMs: 3000 });
await noApp();
caso('entrar depois do link direto', 'app no mapa de Gênesis', 'hash=' + (await av('location.hash')), (await av('location.hash')) === '#/mapa/genesis');

// ---------- 6. sem rede ----------
await ir(BASE + '#/');
await noApp();
await cmd('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
q = await passo(() => cmd('Page.reload'), { esperaMs: 2500 });
await noApp();
caso('sem rede, logado', 'o app abre do cache', 'trilha=' + (await av('!!document.querySelector(".no")')), !!(await av('!!document.querySelector(".no")')));
await cmd('Network.deleteCookies', { name: 'cc_sessao', url: BASE });
await cmd('Network.deleteCookies', { name: 'cc_logado', url: BASE });
q = await passo(() => ir(BASE), { esperaMs: 2500 });
await naEntrada();
caso('sem rede e sem sessão', 'a página de entrada abre do cache, nada do app', 'entrada=' + (await av('!!document.getElementById("tela-boas")')) + ', quadros do app=' + q.filter((x) => x.app).length,
  !!(await av('!!document.getElementById("tela-boas")')) && !q.some((x) => x.app));
await cmd('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

// ---------- 7. sessão que vence ou cai ----------
// entra de novo (a pessoa da conta "rute") e a sessão vence: os dois cookies somem juntos
const entrar = async () => {
  await ir(BASE);
  await naEntrada();
  await av('document.querySelector("[data-ir=entrar]").click()');
  await preencher('login', 'rute');
  await preencher('senha-entrar', SENHA);
  await av('document.getElementById("botao-entrar").click()');
  await noApp();
  await dormir(800);
};
await entrar();
ok(!!(await av('localStorage.getItem("cc.app.estado")')), 'logado, o progresso fica guardado no aparelho');
await cmd('Network.deleteCookies', { name: 'cc_sessao', url: BASE });
await cmd('Network.deleteCookies', { name: 'cc_logado', url: BASE });
// (recarregar: ir para o mesmo endereço mudando só o hash não abre a página de novo)
q = await passo(() => cmd('Page.reload'));
await naEntrada();
caso('sessão vencida, abrir o app', 'página de entrada, a trilha guardada não aparece', 'quadros do app=' + q.filter((x) => x.app).length, !q.some((x) => x.app));
await passo(() => clicarLink('/privacidade/'));
await esperar('location.pathname.endsWith("privacidade.html")');
q = await passo(() => av('document.querySelector("a.voltar").click()'));
await naEntrada();
caso('sessão vencida → privacidade → voltar (o caso do dono)', 'página de entrada, sem piscar a trilha', 'quadros do app=' + q.filter((x) => x.app).length, !q.some((x) => x.app));
// crachá que o servidor não aceita mais (senha trocada, "sair dos outros aparelhos"): o app
// abre do cache com a marca ainda lá, o /api/quem diz 401 e o servidor limpa os dois cookies
await entrar();
await cmd('Network.setCookie', { name: 'cc_sessao', value: 'rute.1.assinatura-velha', url: BASE, httpOnly: true });
q = await passo(() => cmd('Page.reload'), { esperaMs: 3000 });
await naEntrada();
caso('crachá derrubado no servidor', 'termina na entrada e a marca é limpa', 'url=' + (await av('location.pathname')) + ', cookies=' + (await cookies()).join(',') + ', quadros do app até o 401=' + q.filter((x) => x.app).length,
  !(await cookies()).includes('cc_logado') && !!(await av('!!document.getElementById("tela-boas")')));
q = await passo(() => ir(BASE + '#/explorar'));
await naEntrada();
caso('crachá derrubado, abrir de novo', 'página de entrada, nada do app', 'quadros do app=' + q.filter((x) => x.app).length, !q.some((x) => x.app));

// ---------- 8. marca perdida com sessão válida (quem entrou antes da marca existir) ----------
await entrar();
await av('location.hash = "#/explorar"');
await dormir(400);
await cmd('Network.deleteCookies', { name: 'cc_logado', url: BASE });
await passo(() => cmd('Page.reload'), { esperaMs: 2500 });
await noApp();
caso('sessão válida sem a marca', 'volta ao app (a entrada põe a marca e devolve)', 'hash=' + (await av('location.hash')) + ', cookies=' + (await cookies()).join(','),
  (await cookies()).includes('cc_logado') && (await av('location.hash')) === '#/explorar');
// No Android/PWA, o navegador pode restaurar entrar.html como a última URL depois do cadastro.
// Com sessão válida, essa URL precisa voltar ao app em vez de reapresentar o login.
await passo(() => ir(BASE + 'entrar.html'), { esperaMs: 1500 });
await noApp();
caso('Android restaura entrar.html com sessão válida', 'o app abre, sem reapresentar o login',
  'url=' + (await av('location.pathname')) + ', app=' + (await av('!!document.querySelector("#conteudo > *")')),
  (await av('location.pathname')) === '/' && !!(await av('document.querySelector("#conteudo > *")')));
await s.fechar();

// ---------- 9. a barra do alto da entrada, rolando no celular ----------
for (const [larg, alt] of [[390, 844], [360, 800]]) {
  const t = await abrir({ base: BASE, largura: larg, altura: alt, escala: 3 });
  await t.cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await t.cmd('Page.navigate', { url: BASE });
  await dormir(2200);
  const largura = await t.av('[document.documentElement.scrollWidth, document.documentElement.clientWidth]');
  ok(largura[0] === largura[1], larg + 'px: a página não é mais larga que a tela (' + largura.join(' x ') + ')');
  await t.av(`window.__q = []; window.__ls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ls += e.value; }).observe({ type: 'layout-shift' });
    (function f() { const r = document.querySelector('.lp-topo').getBoundingClientRect(); window.__q.push([scrollY, r.top, r.height, r.left]); if (window.__q.length < 3000) requestAnimationFrame(f); })();`);
  const toque = (type, x, y) => t.cmd('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const recortes = [];
  for (let i = 0; i < 20; i++) {
    await toque('touchStart', larg / 2, alt * 0.7);
    for (let k = 1; k <= 8; k++) { await toque('touchMove', larg / 2 + (k % 2 ? 1.5 : -1.5), alt * 0.7 - k * 12); await dormir(16); }
    await toque('touchEnd');
    // a barra de endereço some no meio da rolagem: a janela cresce 56px
    if (i === 7) await t.cmd('Emulation.setDeviceMetricsOverride', { width: larg, height: alt + 56, deviceScaleFactor: 3, mobile: true });
    await dormir(40);
    recortes.push((await t.cmd('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: larg, height: 72, scale: 1 } })).data);
  }
  const medidas = await t.av('window.__q');
  const rolou = Math.max(...medidas.map((m) => m[0]));
  ok(rolou > 1200, larg + 'px: rolou a página aos poucos (até ' + Math.round(rolou) + 'px)');
  ok(medidas.every((m) => m[1] === 0 && m[2] === medidas[0][2] && m[3] === medidas[0][3]), larg + 'px: a barra fica em 0, com a mesma altura e a mesma margem, em todos os ' + medidas.length + ' quadros');
  ok(recortes.every((r) => r === recortes[0]), larg + 'px: o recorte da barra é igual ao pixel em todos os ' + recortes.length + ' passos');
  ok((await t.av('window.__ls')) === 0, larg + 'px: nenhum deslocamento de layout durante a rolagem');
  await toque('touchStart', larg * 0.8, alt * 0.5);
  for (let k = 1; k <= 8; k++) { await toque('touchMove', larg * 0.8 - k * 15, alt * 0.5 - 2); await dormir(16); }
  await toque('touchEnd');
  await dormir(300);
  ok((await t.av('scrollX + visualViewport.offsetLeft')) === 0, larg + 'px: arrastar de lado não move a página');
  await t.fechar();
}

console.log('\n  Casos (esperado → obtido)\n');
for (const c of casos) console.log('  ' + (c.passou ? 'ok   ' : 'FALHA') + ' ' + c.nome + ' | ' + c.esperado + ' | ' + c.obtido);
// No Windows, kill() apenas solicita o encerramento. Esperar o processo realmente sair evita
// um falso erro EPERM ao remover o banco temporário que o servidor ainda mantinha aberto.
await new Promise((resolve) => {
  if (servidor.exitCode !== null) return resolve();
  const limite = setTimeout(resolve, 2000);
  servidor.once('exit', () => { clearTimeout(limite); resolve(); });
  servidor.kill();
});
rmSync(pastaEstado, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  tudo certo\n');
process.exit(falhas ? 1 : 0);
