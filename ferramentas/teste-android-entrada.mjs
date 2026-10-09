// Criar a conta (ou entrar) num Android e FICAR no app. O dono, 08/10: "criei a conta e ele
// fica voltando pra tela inicial quando autenticado". A causa: sem sessão, o servidor entrega
// a página de entrada no próprio endereço do app; aberta por um link com âncora (/#/, o
// /#/mapa/genesis do "Compartilhar mapa", o lembrete com #/...), o location.replace('./#/...')
// do fim do cadastro era o mesmo endereço e só rolava até a âncora: conta criada, cookie
// gravado, e a pessoa parada na entrada. Aqui, num Chrome sem interface com cara de Android
// (userAgent, toque, 390x844), cada caminho de chegada cria a conta (ou entra) e o app tem de
// abrir e ficar 10 s sem voltar à entrada, depois de recarregar e depois de fechar e abrir o
// navegador de novo (o mesmo perfil, com service worker, como o celular). Também roda em modo
// app instalado (display-mode: standalone) e atrás de um proxy que imita o túnel (o navegador
// fala http, o servidor recebe X-Forwarded-Proto: https e grava os cookies com Secure).
// Uso: CHROME=<chrome> node ferramentas/teste-android-entrada.mjs   (PORTAS=8731-8739 para fixar a faixa)
import { spawn } from 'node:child_process';
import { createServer, request } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { portaLivre } from './navegador.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { abrir, dormir, esperar } = await import(pathToFileURL(join(AQUI, 'design', 'ferramentas', 'analise', 'cdp.mjs')).href);
const UA = 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const SENHA = 'senha-do-teste-1';

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok    ' : '  FALHA ') + msg); if (!cond) falhas++; };

const PORTA = await portaLivre();
const BASE_DIRETO = 'http://127.0.0.1:' + PORTA + '/';
const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-android-estado-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json') }, stdio: 'ignore',
});
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE_DIRETO + 'api/versao')).ok) break; } catch { /* subindo */ }
  await dormir(200);
}

// O túnel: o navegador fala http com o proxy, o proxy repassa ao servidor dizendo que o pedido
// chegou por https (como o cloudflared faz).
const PORTA_TUNEL = await portaLivre();
const tunel = createServer((req, res) => {
  const ida = request({ host: '127.0.0.1', port: PORTA, path: req.url, method: req.method,
    headers: { ...req.headers, 'x-forwarded-proto': 'https' } }, (volta) => { res.writeHead(volta.statusCode, volta.headers); volta.pipe(res); });
  ida.on('error', () => { res.writeHead(502).end(); });
  req.pipe(ida);
}).listen(PORTA_TUNEL, '127.0.0.1');
const BASE_TUNEL = 'http://127.0.0.1:' + PORTA_TUNEL + '/';

// Uma conta que já existe, para o caminho "Já tenho conta".
await fetch(BASE_DIRETO + 'api/criar-conta', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ nome: 'Rute', nascimento: '2000-05-10', email: 'rute@exemplo.com', usuario: 'rute', senha: SENHA, consentimento: true, caminho: 'plano' }),
});

async function abrirAndroid(perfil, { app = false } = {}) {
  const s = await abrir({ base: BASE_DIRETO, largura: 390, altura: 844, perfil, escala: 3 });
  await s.cmd('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Linux armv8l',
    userAgentMetadata: { mobile: true, platform: 'Android', platformVersion: '14', architecture: '', model: 'SM-A546E',
      brands: [{ brand: 'Chromium', version: '129' }, { brand: 'Google Chrome', version: '129' }] } });
  await s.cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  if (app) await s.cmd('Emulation.setEmulatedMedia', { features: [{ name: 'display-mode', value: 'standalone' }] });
  // Toda troca de documento da aba, para provar que ninguém voltou à entrada às escondidas.
  s.idas = [];
  s.ouvir('Page.frameNavigated', (p) => { if (!p.frame.parentId) s.idas.push(p.frame.url); });
  return s;
}

const noApp = 'location.pathname.endsWith("/") && !!document.querySelector("#conteudo > *") && !document.getElementById("tela-boas") && getComputedStyle(document.documentElement).visibility !== "hidden"';

// Fica no app por 10 s: a cada meio segundo o app está na tela e nenhuma página nova chegou.
async function ficaNoApp(s, rotulo) {
  const chegou = await esperar(s.av, noApp, 12000);
  const idasAntes = s.idas.length;
  let fora = 0;
  for (let t = 0; t < 20; t++) {
    await dormir(500);
    if (!(await s.av(noApp))) fora++;
  }
  const novas = s.idas.slice(idasAntes);
  ok(chegou && fora === 0 && !novas.some((u) => /entrar\.html/.test(u)),
    rotulo + ': no app e lá ficou 10 s (fora=' + fora + ', páginas novas=' + JSON.stringify(novas) + ', em ' + (await s.av('location.pathname + location.hash')) + ')');
  return chegou && fora === 0;
}

const preencher = (s, id, v) => s.av('(() => { const e = document.getElementById(' + JSON.stringify(id) + '); e.value = ' + JSON.stringify(v) + '; e.dispatchEvent(new Event("input", { bubbles: true })); })()');
const tocar = (s, id) => s.av('document.getElementById(' + JSON.stringify(id) + ').click()');
const naEntrada = (s) => esperar(s.av, '!!document.getElementById("tela-boas") && document.readyState === "complete"', 10000);

async function criarConta(s, usuario) {
  await tocar(s, 'botao-comecar');
  await esperar(s.av, '!document.getElementById("tela-cadastro").hidden');
  await preencher(s, 'nome', 'Pessoa ' + usuario);
  await preencher(s, 'nascimento', '04032001');
  await tocar(s, 'botao-cadastro');
  await preencher(s, 'email', usuario + '@exemplo.com');
  await tocar(s, 'botao-cadastro');
  await preencher(s, 'usuario', usuario);
  await preencher(s, 'senha-nova', SENHA);
  await s.av('document.getElementById("consentimento-cadastro").checked = true');
  await tocar(s, 'botao-cadastro');
}
async function entrar(s, usuario) {
  await s.av('document.querySelector("[data-ir=entrar]").click()');
  await esperar(s.av, '!document.getElementById("tela-entrar").hidden');
  await preencher(s, 'login', usuario);
  await preencher(s, 'senha-entrar', SENHA);
  await tocar(s, 'botao-entrar');
}

// Cada caso: de onde a pessoa chega, como entra, e onde o app tem de abrir.
const CASOS = [
  { nome: 'endereço do app, criar conta', base: BASE_DIRETO, caminho: '', acao: 'criar', hash: '#/' },
  { nome: 'link compartilhado #/mapa/genesis, criar conta', base: BASE_DIRETO, caminho: '#/mapa/genesis', acao: 'criar', hash: '#/mapa/genesis' },
  { nome: 'endereço com #/, já tenho conta', base: BASE_DIRETO, caminho: '#/', acao: 'entrar', hash: '#/' },
  { nome: 'app instalado (standalone), #/, criar conta', base: BASE_DIRETO, caminho: '#/', acao: 'criar', hash: '#/', app: true },
  { nome: 'atrás do túnel (https → http), #/, criar conta', base: BASE_TUNEL, caminho: '#/', acao: 'criar', hash: '#/' },
];

console.log('\n  Android: criar a conta e ficar no app\n');
let n = 0;
for (const caso of CASOS) {
  console.log('  — ' + caso.nome);
  const perfil = mkdtempSync(join(tmpdir(), 'cc-android-perfil-'));
  const usuario = 'android' + (++n);
  let s = await abrirAndroid(perfil, caso);
  try {
    await s.cmd('Page.navigate', { url: caso.base + caso.caminho });
    ok(await naEntrada(s), caso.nome + ': sem sessão, a entrada aparece');
    if (caso.acao === 'criar') await criarConta(s, usuario); else await entrar(s, 'rute');
    if (!(await ficaNoApp(s, caso.nome))) continue;
    ok((await s.av('location.hash')) === caso.hash, caso.nome + ': o app abre em ' + caso.hash + ' (' + (await s.av('location.hash')) + ')');
    if (caso.base === BASE_TUNEL) {
      const marca = ((await s.cmd('Network.getCookies', { urls: [BASE_TUNEL] })).cookies || []).find((c) => c.name === 'cc_logado');
      ok(!!marca && marca.secure, 'atrás do túnel o cookie vem com Secure e o navegador o guarda');
    }
    // O service worker assume e guarda o app: daqui em diante "/" vem do cache, como no celular.
    ok(await esperar(s.av, 'navigator.serviceWorker && navigator.serviceWorker.controller && caches.keys().then((k) => k.some((x) => /^caminho-[0-9a-f]/.test(x)))', 20000),
      caso.nome + ': o service worker assumiu');
    await s.cmd('Page.reload');
    await ficaNoApp(s, caso.nome + ' → recarregar');
    // Fechar o navegador e abrir de novo, pelo endereço do ícone (start_url "./").
    await s.fechar();
    s = await abrirAndroid(perfil, caso);
    await s.cmd('Page.navigate', { url: caso.base });
    await ficaNoApp(s, caso.nome + ' → fechar e abrir de novo');
  } finally {
    await s.fechar();
    rmSync(perfil, { recursive: true, force: true });
  }
}

// Saiu e criou outra conta no mesmo aparelho, com o app já guardado pelo service worker e o
// endereço ainda em #/: a ida é pela entrada guardada, e a volta tem de abrir o app.
{
  console.log('  — sair e criar outra conta no mesmo aparelho (com service worker)');
  const perfil = mkdtempSync(join(tmpdir(), 'cc-android-perfil-'));
  const s = await abrirAndroid(perfil);
  try {
    await s.cmd('Page.navigate', { url: BASE_DIRETO });
    await naEntrada(s);
    await criarConta(s, 'android-um');
    await esperar(s.av, noApp, 12000);
    await esperar(s.av, 'navigator.serviceWorker && !!navigator.serviceWorker.controller', 20000);
    // Sair e recarregar a aba em /#/ (location.replace("./#/") daqui seria só a âncora).
    ok((await s.av('fetch("api/sair", { method: "POST" }).then((r) => r.status)')) === 200, 'saiu da primeira conta');
    await s.cmd('Page.reload');
    ok(await naEntrada(s), 'depois de sair, a entrada aparece (' + (await s.av('location.pathname + location.hash')) + ')');
    await criarConta(s, 'android-dois');
    await ficaNoApp(s, 'a segunda conta');
    ok((await s.av('fetch("api/quem").then((r) => r.json()).then((q) => q.usuario)')) === 'android-dois', 'a sessão é da conta nova');
  } finally {
    await s.fechar();
    rmSync(perfil, { recursive: true, force: true });
  }
}

tunel.close();
servidor.kill();
rmSync(pastaEstado, { recursive: true, force: true });
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  tudo certo\n');
process.exit(falhas ? 1 : 0);
