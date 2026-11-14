// A barra de abas do celular (revisão de UX, B9): sempre cinco botões com o nome à vista, sem
// corte a 390, 360 e 320px, no claro e no escuro, e na mesma ordem para todo mundo:
//   Trilha · [Célula | Discipulado | Desafios] | Bíblia | Juntos · Mais
// Quatro pessoas de verdade (sem nada, só célula, só discipulado, os dois); quem tem os dois
// acha o Discipulado no Mais, e o Mais é o único aceso nessa tela. No trilho lateral (>= 860px)
// o Discipulado continua item próprio, aceso sozinho.
// Uso: CHROME=<chrome> node ferramentas/teste-barra-abas.mjs   (PORTA=<n> troca a porta)
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || await portaLivre();
const DEPURACAO = await portaLivre();
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pasta = mkdtempSync(join(tmpdir(), 'cc-barra-abas-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json'), CAMINHO_TESTE: '1' }, stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const api = async (rota, corpo, cookie) => {
  const r = await fetch(base + rota, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0], dado: await r.json().catch(() => ({})) };
};
const criar = (usuario, extra = {}) => api('/api/criar-conta', {
  usuario, senha: 'senha123', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true, ...extra,
});
const serAmigos = async (a, ua, b, ub) => {
  await api('/api/amizade', { acao: 'pedir', usuario: ub }, a.cookie);
  await api('/api/amizade', { acao: 'aceitar', usuario: ua }, b.cookie);
};
const discipular = async (guia, uGuia, disc, uDisc) => {
  const c = await api('/api/discipulado', { acao: 'convidar', usuario: uDisc, papel: 'discipulador' }, guia.cookie);
  return api('/api/discipulado', { acao: 'aceitar', id: c.dado.id, mostrar: {} }, disc.cookie);
};

// Marcos conduz a célula e acompanha o Davi; a Lia entra na célula; o Davi só tem o
// discipulado; a Vera não tem nem um nem outro.
const marcos = await criar('marcos');
const id = (await api('/api/celula', { acao: 'criar', titulo: 'Célula de quinta' }, marcos.cookie)).dado.proposito.id;
const token = new URL((await api('/api/celula', { acao: 'link', id }, marcos.cookie)).dado.link).searchParams.get('celula');
const lia = await criar('lia', { celula: token });
const davi = await criar('davi');
await serAmigos(marcos, 'marcos', davi, 'davi');
ok((await discipular(marcos, 'marcos', davi, 'davi')).status === 200, 'o Marcos passa a acompanhar o Davi');
const vera = await criar('vera');

const perfil = mkdtempSync(join(tmpdir(), 'cc-barra-abas-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + DEPURACAO, '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
async function alvo() {
  for (let i = 0; i < 60; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:' + DEPURACAO + '/json/list')).json();
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
const eventos = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
  else if (m.method) eventos.push(m);
});
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const i = ++seq; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const esperar = async (expr, ms = 10000) => {
  for (let t = 0; t < ms; t += 150) { if (await av(expr)) return true; await dormir(150); }
  return false;
};
const tela = (w) => cmd('Emulation.setDeviceMetricsOverride', { width: w, height: 760, deviceScaleFactor: 2, mobile: w < 860 });
const tema = (t) => cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: t === 'claro' ? 'light' : 'dark' }] });

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Network.enable');
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });

async function entrarComo(conta, hash = '#/') {
  await cmd('Network.clearBrowserCookies');
  const [nome, valor] = conta.cookie.split('=');
  await cmd('Network.setCookie', { name: nome, value: valor, url: base });
  await cmd('Network.setCookie', { name: 'cc_logado', value: '1', url: base });
  // a página em branco antes: só trocar o # não recarrega o app, e a conta nova não entraria
  await cmd('Page.navigate', { url: 'about:blank' });
  await dormir(200);
  await cmd('Page.navigate', { url: base + '/' + hash });
  await esperar('!!document.querySelector(".navegacao .aba") && !!(CC.quem && CC.quem.usuario)', 15000);
  // a célula e o discipulado chegam do servidor depois da primeira pintura
  await esperar('!!document.querySelector(".navegacao .aba[data-papel=\\"celula\\"]:not(.so-trilho), .navegacao .aba[data-papel=\\"discipulado\\"]:not(.so-trilho)")', 4000);
  await av('document.fonts.ready.then(() => 1)');
  await dormir(500);
}

// As abas visíveis do celular, na ordem da tela, e se o nome cabe inteiro e legível.
const barra = () => av(`JSON.stringify([...document.querySelectorAll('.navegacao .aba:not(.so-trilho)')]
  .filter((b) => b.getBoundingClientRect().width > 0)
  .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
  .map((b) => {
    const r = b.querySelector('.rotulo-aba');
    const cs = getComputedStyle(r);
    const caixa = r.getBoundingClientRect();
    const botao = b.getBoundingClientRect();
    return {
      papel: b.dataset.papel,
      texto: r.textContent,
      visivel: cs.position !== 'absolute' && cs.visibility !== 'hidden' && caixa.width > 1 && caixa.height > 1,
      inteiro: r.scrollWidth <= r.clientWidth + 0.5 && caixa.left >= botao.left - 0.5 && caixa.right <= botao.right + 0.5 && caixa.right <= innerWidth,
      fonte: parseFloat(cs.fontSize),
      direita: caixa.right,
    };
  }))`).then(JSON.parse);
const ORDEM = ['trilha', 'celula', 'discipulado', 'desafios', 'biblia', 'juntos', 'mais'];

console.log('\n  A barra de abas do celular\n');
const pessoas = [
  ['Vera (sem célula nem discipulado)', vera, 'desafios'],
  ['Lia (só célula)', lia, 'celula'],
  ['Davi (só discipulado)', davi, 'discipulado'],
  ['Marcos (célula e discipulado)', marcos, 'celula'],
];
for (const [quem, conta, segunda] of pessoas) {
  await tema('escuro');
  await tela(390);
  await entrarComo(conta);
  const abas = await barra();
  const papeis = abas.map((a) => a.papel);
  ok(papeis.join(',') === ['trilha', segunda, 'biblia', 'juntos', 'mais'].join(','), quem + ': cinco abas, Trilha · ' + segunda + ' | Bíblia | Juntos · Mais (' + papeis.join(', ') + ')');
  const indices = papeis.map((p) => ORDEM.indexOf(p));
  ok(indices.every((n, i) => n >= 0 && (i === 0 || n > indices[i - 1])), quem + ': a ordem segue a mesma régua de todo mundo');
  for (const t of ['claro', 'escuro']) {
    await tema(t);
    for (const w of [390, 360, 320]) {
      await tela(w);
      await dormir(250);
      const a = await barra();
      const ruins = a.filter((x) => !x.visivel || !x.inteiro || x.fonte < 11).map((x) => x.papel + ' ' + x.fonte + 'px');
      ok(a.length === 5 && !ruins.length, quem + ', ' + t + ', ' + w + 'px: os cinco nomes à vista, inteiros, com 11px ou mais' + (ruins.length ? ' (' + ruins.join(', ') + ')' : ''));
    }
  }
}

// ---------- quem tem célula e discipulado acha o Discipulado no Mais ----------
await tema('claro');
await tela(360);
await entrarComo(marcos);
await av('document.querySelector(".navegacao [data-abrir-mais]").click()');
ok(await esperar('!!document.querySelector(".painel-mais a[href=\\"#/discipulado\\"]")'), 'Marcos: o Mais tem o Discipulado');
ok(await av('document.querySelector(".painel-mais a").getAttribute("href")') === '#/discipulado', 'e ele vem primeiro no Mais');
await av('document.querySelector(".painel-mais a[href=\\"#/discipulado\\"]").click()');
ok(await esperar('location.hash === "#/discipulado" && !document.querySelector(".painel-mais:not(.saindo)")'), 'tocar nele abre o Discipulado e fecha o Mais');
await dormir(400);
const acesas = () => av('[...document.querySelectorAll(".navegacao .aba.selecionada:not(.so-trilho)")].map((b) => b.dataset.papel).join(",")');
ok(await acesas() === 'mais', 'no Discipulado, só o Mais fica aceso na barra (' + await acesas() + ')');
await entrarComo(davi, '#/discipulado');
ok(await acesas() === 'discipulado', 'para o Davi, que só tem discipulado, a aba Discipulado é que acende');
await av('document.querySelector(".navegacao [data-abrir-mais]").click()');
await esperar('!!document.querySelector(".painel-mais")');
ok(await av('!document.querySelector(".painel-mais a[href=\\"#/discipulado\\"]")'), 'e o Mais dele não repete o Discipulado');

// ---------- o trilho lateral continua com a lista inteira ----------
await tela(1100);
await entrarComo(marcos, '#/discipulado');
const trilho = await av('[...document.querySelectorAll(".navegacao .aba")].filter((b) => b.offsetParent && !b.classList.contains("extra-trilho")).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).map((b) => b.dataset.papel + (b.classList.contains("selecionada") ? "*" : "")).join(",")');
ok(trilho === 'trilha,desafios,celula,discipulado*,biblia,juntos,explorar', 'no trilho lateral: Trilha, Desafios, Célula, Discipulado (aceso), Bíblia, Juntos, Explorar (' + trilho + ')');

const erros = eventos.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.exception?.description || 'exceção');
ok(erros.length === 0, 'nenhuma exceção de JavaScript' + (erros[0] ? ': ' + erros[0].slice(0, 120) : ''));
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  a barra de abas está certa\n');
try { ws.close(); } catch { /* ok */ }
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
