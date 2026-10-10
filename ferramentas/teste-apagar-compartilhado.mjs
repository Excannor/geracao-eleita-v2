// Apagar do Juntos o versículo que a própria pessoa compartilhou, num Chrome sem interface:
// só o cartão do versículo dela tem "Apagar" (o do amigo e os marcos não), a confirmação
// explica que os amigos deixam de ver, "Cancelar" não muda nada e "Apagar" tira o cartão da
// tela e do mural do amigo, sem mexer na nota do versículo.
// Uso: CHROME=... node ferramentas/teste-apagar-compartilhado.mjs
//      FOTOS=pasta guarda as capturas (cartão e confirmação, claro e escuro).
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || await portaLivre();
const DEPURACAO = await portaLivre();
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FOTOS = process.env.FOTOS || '';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pasta = mkdtempSync(join(tmpdir(), 'cc-apagar-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json') }, stdio: ['ignore', 'ignore', 'pipe'],
});
let erroServidor = '';
servidor.stderr.on('data', (d) => { erroServidor += d; });
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const api = async (rota, corpo, cookie) => {
  const r = await fetch(base + rota, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0], dado: await r.json().catch(() => ({})) };
};
const criarConta = (usuario, nome) => api('/api/criar-conta', {
  usuario, nome, senha: 'senha-' + usuario, email: usuario + '@teste.com', nascimento: '2003-04-05', consentimento: true,
});

const perfil = mkdtempSync(join(tmpdir(), 'cc-apagar-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
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

try {
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
    for (let t = 0; t < ms; t += 150) { if (await av(expr)) return true; await dormir(150); }
    return false;
  };
  const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
  const existe = (sel) => '!!' + q(sel);
  const clicar = (sel) => av('(() => { const el = ' + q(sel) + '; if (el) el.click(); return !!el; })()');
  const tema = (valor) => cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: valor }] });
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (nome) => {
    if (!FOTOS) return;
    await esperar('!document.getElementById("abertura")', 4000);
    await dormir(500);
    const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
    if (data) writeFileSync(join(FOTOS, nome + '.png'), Buffer.from(data, 'base64'));
  };

  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Network.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await tema('light');

  console.log('\n  Apagar o versículo compartilhado no Juntos\n');

  // Ana e Bruno amigos, os dois mostrando os marcos; cada um compartilha um versículo.
  const ana = await criarConta('ana.apaga', 'Ana');
  const bruno = await criarConta('bruno.apaga', 'Bruno');
  await api('/api/amizade', { acao: 'pedir', usuario: 'ana.apaga' }, bruno.cookie);
  ok((await api('/api/amizade', { acao: 'aceitar', usuario: 'bruno.apaga' }, ana.cookie)).status === 200, 'Ana e Bruno são amigos');
  for (const c of [ana, bruno]) await api('/api/novidades/preferencia', { ligado: true }, c.cookie);
  await api('/api/novidades', { tipo: 'versiculo', dados: { ref: 'João 3.16' } }, bruno.cookie);
  ok((await api('/api/novidades', { tipo: 'versiculo', dados: { ref: 'Salmos 23.1' } }, ana.cookie)).dado.publicado, 'a Ana compartilha Salmos 23.1');
  const doBruno = async () => ((await api('/api/novidades', null, bruno.cookie)).dado.eventos || []);
  const versoAna = (await doBruno()).find((e) => e.tipo === 'versiculo' && e.autor.usuario === 'ana.apaga');
  ok(!!versoAna, 'o Bruno vê o versículo da Ana');

  // A Ana entra no navegador com o crachá da conta.
  const [nome, valor] = ana.cookie.split('=');
  await cmd('Network.setCookie', { name: nome, value: valor, url: base + '/' });
  await cmd('Page.navigate', { url: base + '/#/novidades' });
  ok(await esperar('document.querySelectorAll(".item-mural").length >= 3', 15000), 'o Feed da Ana mostra o mural');

  const seletor = '[data-apagar-novidade="' + versoAna.id + '"]';
  ok(await av('document.querySelectorAll("[data-apagar-novidade]").length === 1 && ' + existe(seletor)),
    'só o versículo da própria Ana tem "Apagar" (o do Bruno e o convite aceito não)');
  ok(await av('(() => { const r = ' + q(seletor) + '.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })()'),
    'o botão Apagar tem alvo de pelo menos 44px');
  ok(await av(q(seletor) + '.getAttribute("aria-label") === "Apagar este versículo do Juntos"'), 'o botão tem nome acessível');

  // Capturas: o cartão e a confirmação, claro e escuro.
  for (const t of ['light', 'dark']) {
    await tema(t);
    await av(q(seletor) + '.closest(".item-mural").scrollIntoView({ block: "center" }), true');
    await foto('cartao-' + (t === 'light' ? 'claro' : 'escuro'));
    await clicar(seletor);
    ok(await esperar(existe('.cortina [data-sim]')), 'tocar em Apagar abre a confirmação (' + t + ')');
    if (t === 'light') {
      ok(await av('/Apagar este versículo do Juntos\\?/.test(' + q('.cortina') + '.innerText) && /Seus amigos deixam de ver/.test(' + q('.cortina') + '.innerText)'),
        'a confirmação diz que os amigos deixam de ver');
    }
    await foto('confirmar-' + (t === 'light' ? 'claro' : 'escuro'));
    await clicar('.cortina [data-nao]');
    await esperar('!' + existe('.cortina'));
  }
  ok((await doBruno()).some((e) => e.id === versoAna.id) && await av(existe(seletor)), 'Cancelar não apaga nada');

  await clicar(seletor);
  await esperar(existe('.cortina [data-sim]'));
  await clicar('.cortina [data-sim]');
  ok(await esperar('!' + existe(seletor) + ' && !/Salmos 23\\.1/.test(' + q('.mural') + '.innerText)'), 'confirmar tira o cartão do Feed da Ana');
  ok(!(await doBruno()).some((e) => e.id === versoAna.id), 'e o versículo some do Feed do Bruno');
  ok(await av('/João 3\\.16/.test(' + q('.mural') + '.innerText)'), 'o versículo do Bruno continua no Feed da Ana');
  await cmd('Page.reload');
  ok(await esperar('document.querySelectorAll(".item-mural").length >= 2', 15000) && !(await av('/Salmos 23\\.1/.test(' + q('.mural') + '.innerText)')),
    'depois de recarregar, o versículo apagado não volta');
} catch (e) {
  falhas++;
  console.log('  FALHA ' + e.message);
} finally {
  try { fecharArvore(nav, perfil); } catch { /* ok */ }
  servidor.kill();
  await dormir(300);
  rmSync(pasta, { recursive: true, force: true });
  rmSync(perfil, { recursive: true, force: true });
}
if (erroServidor.trim()) console.log(erroServidor);
console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'tudo certo') + '\n');
process.exit(falhas ? 1 : 0);
