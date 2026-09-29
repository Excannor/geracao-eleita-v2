// Percorre as telas do aplicativo e imprime o texto que a pessoa realmente lê.
// Serve para revisar a escrita sem caçar string por string no código.
// Uso: node ferramentas/textos.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8181;
const ESTADO = join(tmpdir(), 'cc-textos.json');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

if (existsSync(ESTADO)) rmSync(ESTADO);
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: ESTADO, CAMINHO_ABERTO: '1' }, stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-txt-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });

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
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
});
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
await cmd('Page.navigate', { url: 'http://127.0.0.1:' + PORTA + '/#/' });
await dormir(2200);

const mostrar = (titulo, texto) => {
  console.log('\n' + '='.repeat(60) + '\n  ' + titulo + '\n' + '='.repeat(60));
  console.log(String(texto || '').trim());
};

mostrar('TRILHA (sem progresso)', await av('document.getElementById("conteudo").innerText'));
mostrar('BARRA DO TOPO', await av('document.getElementById("topo").innerText'));
mostrar('NAVEGAÇÃO', await av('document.getElementById("navegacao").innerText'));

for (const [nome, hash] of [['PRIMEIROS PASSOS', '#/passos'], ['PRATICAR', '#/praticar'],
  ['AMIGOS', '#/amigos'], ['EXPLORAR', '#/explorar'], ['PERFIL', '#/perfil'],
  ['CONFIGURAÇÕES', '#/config'], ['TEXTOS BÍBLICOS', '#/config/textos'], ['MEUS ESCRITOS', '#/perfil/escritos'],
  ['SEÇÃO', '#/secao/' + encodeURIComponent('11 - Pessoas')],
  ['BUSCA VAZIA', '#/busca/zzz']]) {
  await av('location.hash = ' + JSON.stringify(hash));
  await dormir(700);
  mostrar(nome, await av('document.getElementById("conteudo").innerText'));
}

// a lição, passo a passo
await av('location.hash = "#/"');
await dormir(600);
await av('(document.querySelector(".no.atual").click(), document.querySelector(".pop-no [data-comecar]").click())');
await dormir(700);
mostrar('LIÇÃO 1 · leitura', await av('document.querySelector(".licao").innerText'));
await av('document.querySelectorAll("[data-trilha]").forEach((b) => b.click())');
await dormir(400);
await av('document.querySelector("[data-concluir]").click()');
await dormir(900);
mostrar('LIÇÃO 2 · celebração', await av('document.querySelector(".licao").innerText'));
await av('(async () => { for (let i = 0; i < 14 && !document.querySelector("[data-voltar-trilha]"); i++) { const b = document.querySelector("[data-seguir]"); if (b) b.click(); await new Promise((r) => setTimeout(r, 350)); } return !!document.querySelector(".festa"); })()');
mostrar('LIÇÃO 2b · versículo', await av('document.querySelector(".licao").innerText'));
await av('document.querySelector("[data-escrever]").click()');
await dormir(500);
mostrar('LIÇÃO 3 · escrever (oração)', await av('document.querySelector(".licao").innerText'));
await av('document.querySelector("[data-modo=\\"oia\\"]").click()');
await dormir(400);
mostrar('LIÇÃO 4 · escrever (OIA)', await av('document.querySelector(".licao").innerText'));
await av('document.querySelector("[data-pronto]").click()');
await dormir(400);
await av('(document.querySelector("[data-fundo]") || { click() {} }).click()');
await dormir(500);
mostrar('LIÇÃO 5 · ir mais fundo', await av('document.querySelector(".licao").innerText'));
await av('location.hash = "#/"');
await dormir(500);
await av('CC.folhaOfensiva()');
await dormir(400);
mostrar('FOLHA · ofensiva', await av('(document.querySelector(".folha") || {}).innerText'));
await av('document.querySelector(".cortina").remove()');

// o quiz
await av('location.hash = "#/praticar"');
await dormir(700);
await av('document.querySelector(".cartao-pratica").click()');
await dormir(700);
mostrar('QUIZ · pergunta', await av('document.querySelector(".quiz").innerText'));
await av('document.querySelector(".opcao").click()');
await dormir(200);
await av('document.querySelector("[data-conferir]").click()');
await dormir(500);
mostrar('QUIZ · resposta', await av('document.querySelector(".quiz").innerText'));

// diálogo de apagar tudo
await av('CC.fecharPratica()');
await av('location.hash = "#/config"');
await dormir(700);
await av('document.querySelector("[data-zerar]").click()');
await dormir(500);
mostrar('DIÁLOGO · zerar', await av('(document.querySelector(".folha") || {}).innerText'));

try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(0);
