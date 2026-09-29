// Aparelho de casa, duas pessoas: o progresso de quem sai não pode grudar em quem
// entra depois, nem no navegador nem no servidor.
// Uso: node ferramentas/teste-troca-pessoa.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8204;
const PASTA = join(tmpdir(), 'cc-troca');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'),
    CAMINHO_USUARIOS: '', CAMINHO_SENHA: '' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const criar = async (usuario, senha, nome) => {
  const r = await fetch(base + '/api/criar-conta', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario, senha, nome, email: usuario + '@teste.com', nascimento: '2000-01-01' }),
  });
  return (r.headers.get('set-cookie') || '').split(';')[0];
};
await criar('ana', 'senha-da-ana', 'Ana');
await criar('bento', 'senha-do-bento', 'Bento');

const perfil = mkdtempSync(join(tmpdir(), 'cc-tr-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil,
  '--window-size=390,900', 'about:blank'], { stdio: 'ignore' });

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
const cmd = (m, p = {}) => new Promise((res) => {
  const id = ++seq; pend.set(id, res);
  ws.send(JSON.stringify({ id, method: m, params: p }));
});
const av = async (e) => (await cmd('Runtime.evaluate',
  { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await cmd('Runtime.enable');

// Entrar pela API dentro da página e recarregar de verdade: só trocar o "#" não
// recarrega o documento, e o servidor continuaria entregando o portal.
const entrarComo = async (usuario, senha) => {
  await av('(async () => { await fetch("api/entrar", { method: "POST",'
    + ' headers: { "content-type": "application/json" },'
    + ' body: JSON.stringify({ usuario: ' + JSON.stringify(usuario)
    + ', senha: ' + JSON.stringify(senha) + ' }) }); })()');
  await cmd('Page.navigate', { url: base + '/#/' });
  await cmd('Page.reload');
  await dormir(3000);
};

console.log('\n  Duas pessoas, um aparelho\n');

await cmd('Page.navigate', { url: base + '/' });
await dormir(1500);

// ---------- a Ana usa o aplicativo ----------
await entrarComo('ana', 'senha-da-ana');
ok(await av('typeof CC === "object"'), 'a Ana entra e o aplicativo abre');
await av('CC.marcarLido(1, true); CC.marcarLido(2, true); CC.marcarLido(3, true);'
  + ' CC.guardarApelido("Ana"); CC.gravarRegistro(2, { o: "ISTO-E-DA-ANA", i: "", a: "", oracao: "" });');
await dormir(1200);
ok((await av('CC.ler("lidos", []).length')) === 3, 'a Ana marca três dias');
ok((await av('CC.estado().dono')) === 'ana', 'o progresso guardado neste navegador fica com o nome dela');

// ---------- ela sai ----------
await av('(async () => { await fetch("api/sair", { method: "POST" }); CC.zerarLocal(); })()');
await dormir(600);
ok((await av('CC.ler("lidos", []).length')) === 0, 'ao sair, o que era dela some deste navegador');

// ---------- o Bento entra no mesmo navegador ----------
await entrarComo('bento', 'senha-do-bento');
const doBento = await av('({ lidos: CC.ler("lidos", []).length, apelido: CC.apelido(),'
  + ' dono: CC.estado().dono, registro: JSON.stringify(CC.estado().oia || {}) })');
ok(doBento.lidos === 0, 'o Bento começa do zero, e não com os dias da Ana');
ok(doBento.apelido !== 'Ana', 'nem com o nome dela');
ok(!doBento.registro.includes('ISTO-E-DA-ANA'), 'nem com o que ela escreveu');
ok(doBento.dono === 'bento', 'o progresso deste navegador agora é dele');

await av('CC.marcarLido(1, true);');
await dormir(1200);

// ---------- e no servidor, cada um com o seu ----------
const noServidor = await av('(async () => {'
  + ' const meu = await (await fetch("api/estado", { cache: "no-store" })).json();'
  + ' return { lidos: (meu.lidos || []).length, cru: JSON.stringify(meu) }; })()');
ok(noServidor.lidos === 1, 'o arquivo do Bento no servidor tem só o dia dele');
ok(!noServidor.cru.includes('ISTO-E-DA-ANA'), 'e nada do que a Ana escreveu foi parar nele');

const daAna = await (await fetch(base + '/api/entrar', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ usuario: 'ana', senha: 'senha-da-ana' }),
})).headers.get('set-cookie').split(';')[0];
const estadoDaAna = await (await fetch(base + '/api/estado', { headers: { cookie: daAna } })).json();
ok((estadoDaAna.lidos || []).length === 3, 'o progresso da Ana continua inteiro no servidor');
ok(JSON.stringify(estadoDaAna).includes('ISTO-E-DA-ANA'), 'com o que ela escreveu');

// ---------- esquecer de sair também não mistura ----------
// O caso do aparelho emprestado: a pessoa fecha o aplicativo sem sair, a sessão cai
// sozinha, e outra entra. O estado que ficou no navegador ainda é do primeiro.
await av('(async () => { await fetch("api/sair", { method: "POST" }); })()');
await entrarComo('ana', 'senha-da-ana');
const voltou = await av('({ lidos: CC.ler("lidos", []).length, dono: CC.estado().dono })');
ok(voltou.dono === 'ana' && voltou.lidos === 3,
  'quem entra sem o outro ter saído recebe o próprio progresso, não o que ficou na tela');

const erros = evs.filter((e) => e.method === 'Runtime.exceptionThrown').length;
ok(erros === 0, 'nenhuma exceção no caminho');

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o aparelho compartilhado não mistura ninguém\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
