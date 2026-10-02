// Abre o aplicativo num Chrome sem interface, percorre as telas, mede o que escapa
// da tela e salva capturas. É o que pega o que a leitura do código não pega.
// Uso: node ferramentas/inspecionar.mjs [largura]
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const LARGURA = Number(process.argv[2]) || 390;
const ALTURA = 844;
const PORTA = 8131;
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou respondia no lugar.
const DEPURACAO = await portaLivre();
// Pasta própria a cada rodada: com o banco, os dados moram ao lado do estado, e apagar só o
// JSON deixava a leitura da rodada anterior no banco.
const ESTADO = join(tmpdir(), 'cc-app-inspecao', 'estado.json');
const SAIDA = join(AQUI, 'capturas');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const checar = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

rmSync(dirname(ESTADO), { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });

const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: ESTADO, CAMINHO_ABERTO: '1' }, stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-app-'));
const navegador = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + DEPURACAO, '--user-data-dir=' + perfil,
  '--window-size=' + LARGURA + ',' + ALTURA, 'about:blank'], { stdio: 'ignore' });

function encerrar(codigo) {
  try { fecharArvore(navegador, perfil); } catch { /* já morreu */ }
  try { servidor.kill(); } catch { /* já morreu */ }
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* segue */ }
  process.exit(codigo);
}

async function alvo() {
  for (let i = 0; i < 60; i++) {
    try {
      const lista = await (await fetch('http://127.0.0.1:' + DEPURACAO + '/json/list')).json();
      const p = lista.find((x) => x.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch { /* subindo */ }
    await dormir(250);
  }
  throw new Error('o navegador não respondeu');
}

const ws = new WebSocket(await alvo());
let seq = 0;
const pendentes = new Map();
const eventos = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m.result || {}); pendentes.delete(m.id); }
  else if (m.method) eventos.push(m);
});
await new Promise((r) => ws.addEventListener('open', r));

const cmd = (metodo, params = {}) => new Promise((res) => {
  const id = ++seq;
  pendentes.set(id, res);
  ws.send(JSON.stringify({ id, method: metodo, params }));
});

const avaliar = async (expressao) => {
  const r = await cmd('Runtime.evaluate', {
    expression: expressao, returnByValue: true, awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'erro na página');
  return r.result?.value;
};

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Log.enable');
await cmd('Emulation.setDeviceMetricsOverride', {
  width: LARGURA, height: ALTURA, deviceScaleFactor: 2, mobile: true,
});

const base = 'http://127.0.0.1:' + PORTA + '/';
await cmd('Page.navigate', { url: base });
await dormir(1800);

// O toque de vibração (CC.vibrar) pede um toque de verdade na tela antes de funcionar, e
// aqui os cliques vêm de .click() por script, não do dedo, então o Chrome bloqueia e avisa,
// sem ser erro nenhum do aplicativo. No celular, o primeiro toque de verdade já libera.
const AVISO_VIBRAR_SEM_TOQUE = /Blocked call to navigator\.vibrate because user hasn't tapped/;
const erros = () => eventos
  .filter((e) => e.method === 'Runtime.exceptionThrown'
    || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'))
  .map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text)
  .filter((texto) => !AVISO_VIBRAR_SEM_TOQUE.test(texto || ''));

console.log('\n  Caminho com Cristo, inspeção a ' + LARGURA + 'px\n');

checar(erros().length === 0, 'nenhum erro de JavaScript ao carregar' + (erros()[0] ? ': ' + erros()[0] : ''));
checar(await avaliar('!!document.querySelector(".no")'), 'a trilha desenhou os nós dos dias');
checar(await avaliar('document.querySelectorAll(".faixa-unidade").length === 12'), 'as 12 unidades aparecem');
checar(await avaliar('!!document.querySelector(".no.atual")'), 'o dia atual está destacado');
checar(await avaliar('!!document.querySelector(".balao")'), 'o balão de "começar" aparece');

const medir = () => avaliar(`(() => {
  const corpo = document.documentElement;
  const escapa = [...document.querySelectorAll('body *')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > document.documentElement.clientWidth + 1 || r.left < -1);
    })
    .slice(0, 6)
    .map((el) => el.className + ' (' + Math.round(el.getBoundingClientRect().right) + 'px)');
  const pequenos = [...document.querySelectorAll('button, a')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.height < 32 || r.width < 32);
    })
    .slice(0, 6)
    .map((el) => (el.className || el.tagName) + ' ' + Math.round(el.getBoundingClientRect().width)
      + 'x' + Math.round(el.getBoundingClientRect().height));
  return { rolagem: corpo.scrollWidth > corpo.clientWidth + 1, escapa, pequenos, altura: corpo.scrollHeight };
})()`);

const capturar = async (nome) => {
  const r = await cmd('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SAIDA, nome + '.png'), Buffer.from(r.data, 'base64'));
};

const telas = [
  ['trilha', '#/'],
  ['passos', '#/passos'],
  ['praticar', '#/praticar'],
  ['amigos', '#/amigos'],
  ['explorar', '#/explorar'],
  ['perfil', '#/perfil'],
  ['config', '#/config'],
  ['nota', '#/nota/' + encodeURIComponent('11 - Pessoas/Davi')],
];

for (const [nome, rota] of telas) {
  await avaliar('location.hash = ' + JSON.stringify(rota));
  await dormir(700);
  const m = await medir();
  checar(!m.rolagem, nome + ': não rola para o lado');
  if (m.escapa.length) console.log('        escapa: ' + m.escapa.join(', '));
  if (m.pequenos.length) console.log('        alvos pequenos: ' + m.pequenos.join(', '));
  await capturar(nome);
}

// ---------- a lição do dia, passo a passo ----------
await avaliar('location.hash = "#/"');
await dormir(500);
await avaliar('(document.querySelector(".no.atual").click(), document.querySelector(".pop-no [data-comecar]").click())');
await dormir(600);
checar(await avaliar('!!document.querySelector(".licao")'), 'a lição abre em tela cheia');
checar(await avaliar('document.querySelectorAll(".passagem").length >= 1'), 'as passagens do dia aparecem');
await capturar('licao-1-leitura');

const n = await avaliar('document.querySelectorAll("[data-trilha]").length');
for (let i = 0; i < n; i++) {
  await avaliar('document.querySelectorAll("[data-trilha]")[' + i + '].click()');
  await dormir(220);
}
checar(await avaliar('document.querySelectorAll(".passagem.feita").length >= 1'), 'passagem marcada como lida');
checar(await avaliar('!document.querySelector("[data-concluir]").disabled'), 'o botão "Concluir o dia" destrava');
await capturar('licao-2-marcada');

await avaliar('document.querySelector("[data-concluir]").click()');
await dormir(900);
checar(await avaliar('!!document.querySelector(".festa .retorno-lido")'), 'a reflexão vem logo depois da leitura, com o dia já contado');
await capturar('licao-3a-reflexao');
checar(await avaliar('!document.querySelector("[data-seguir]")'), 'sem telas de festa entre a leitura e a Palavra');
checar(await avaliar('CC.xpTotal() === 10'), 'a leitura vale 10 XP');
await capturar('licao-3-conclusao');

// o botão Escrever mora no cartão do versículo, que carrega à parte
await avaliar('(async () => { for (let i = 0; i < 40 && !document.querySelector("[data-escrever]"); i++) await new Promise((r) => setTimeout(r, 150)); document.querySelector("[data-escrever]").click(); })()');
await dormir(400);
await avaliar('document.querySelector(\'[data-modo="oia"]\').click()');
await dormir(400);
checar(await avaliar('document.querySelectorAll("textarea").length === 4 && !!document.querySelector("label[for=campo-o]")'),
  'o OIA completo mostra os quatro campos com rótulo');
await avaliar('(() => { const t = document.querySelector("textarea"); t.value = "teste de observacao";'
  + ' t.dispatchEvent(new Event("input", { bubbles: true })); })()');
await dormir(300);
checar(await avaliar('CC.xpTotal() === 10'), 'escrever não muda o XP');
await capturar('licao-4-escrever');
await avaliar('document.querySelector("[data-pronto]").click()');
await dormir(500);
await capturar('licao-5-festa');

await avaliar('(async () => { for (let i = 0; i < 3 && !document.querySelector("[data-voltar-trilha]"); i++) { document.querySelector("[data-avancar]").click(); await new Promise((r) => setTimeout(r, 400)); } })()');
checar(await avaliar('!!document.querySelector(".resumo-dia")'), 'depois de orar vem uma tela só de resumo');
await capturar('licao-6-resumo');
await avaliar('document.querySelector("[data-voltar-trilha]").click()');
await dormir(700);
checar(await avaliar('!document.querySelector(".licao")'), 'a lição fecha ao voltar');
checar(await avaliar('document.querySelectorAll(".no .rotulo-no, .no").length > 0'), 'a trilha volta');

const estadoServidor = await avaliar('fetch("api/estado").then((r) => r.json())');
checar(estadoServidor && estadoServidor.lidos && estadoServidor.lidos.length === 1,
  'o servidor recebeu a leitura marcada');
checar(!!(estadoServidor && estadoServidor.oia && Object.values(estadoServidor.oia)[0]?.o),
  'o servidor recebeu o texto escrito');

await avaliar('location.hash = "#/perfil"');
await dormir(600);
checar(await avaliar('/dias? de ofensiva/i.test(document.body.innerText)'), 'o perfil mostra a ofensiva');
await capturar('perfil-com-progresso');

// ---------- tema claro e tela larga ----------
await avaliar('location.hash = "#/"');
await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await avaliar('CC.guardarTema(false)');
await dormir(500);
await capturar('trilha-clara');
await avaliar('location.hash = "#/perfil"');
await dormir(500);
await capturar('perfil-claro');

await cmd('Emulation.setDeviceMetricsOverride', {
  width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
});
await avaliar('location.hash = "#/"');
await dormir(700);
const largo = await medir();
checar(!largo.rolagem, 'tela larga: não rola para o lado');
await capturar('trilha-larga');
checar(await avaliar('getComputedStyle(document.querySelector(".navegacao")).flexDirection === "column"'),
  'em tela larga a barra vira trilho lateral');
checar(await avaliar('!document.querySelector(".coluna-lado")'), 'a coluna de resumo repetida não existe mais');

checar(erros().length === 0, 'nenhum erro de JavaScript em todo o percurso'
  + (erros()[0] ? ': ' + erros()[0] : ''));

console.log('\n  capturas em ' + SAIDA);
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  tudo certo\n');
encerrar(falhas ? 1 : 0);
