// Varre larguras de tela e telas do aplicativo procurando o que quebra: página que
// rola para o lado, elemento que passa da borda, texto cortado, alvo de toque pequeno
// e conteúdo escondido atrás da barra de navegação.
// Uso: node ferramentas/responsivo.mjs [--fotos]
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOTOS = process.argv.includes('--fotos');
const PORTA = 8133;
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou respondia no lugar.
const DEPURACAO = await portaLivre();
const ESTADO = join(tmpdir(), 'cc-responsivo.json');
const SAIDA = join(AQUI, 'capturas', 'responsivo');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Aparelhos reais, do menor que ainda se usa ao desktop largo.
const TELAS = [
  [320, 568, 'iPhone SE antigo'],
  [360, 740, 'Android comum'],
  [375, 667, 'iPhone 8'],
  [390, 844, 'iPhone 14'],
  [414, 896, 'iPhone Plus'],
  [430, 932, 'iPhone Pro Max'],
  [600, 960, 'tablet pequeno'],
  [768, 1024, 'iPad retrato'],
  [860, 700, 'limite do trilho lateral'],
  [1024, 768, 'iPad paisagem'],
  [1280, 900, 'notebook'],
  [740, 360, 'celular deitado'],
];

const ROTAS = [
  ['trilha', '#/'],
  ['passos', '#/passos'],
  ['praticar', '#/praticar'],
  ['explorar', '#/explorar'],
  ['perfil', '#/perfil'],
  ['config', '#/config'],
  ['amigos', '#/amigos'],
  ['secao', '#/secao/' + encodeURIComponent('11 - Pessoas')],
  ['nota', '#/nota/' + encodeURIComponent('11 - Pessoas/Davi')],
  ['busca', '#/busca/' + encodeURIComponent('aliança')],
];

if (existsSync(ESTADO)) rmSync(ESTADO);
if (FOTOS) mkdirSync(SAIDA, { recursive: true });

const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: ESTADO, CAMINHO_ABERTO: '1' }, stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-resp-'));
const navegador = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + DEPURACAO, '--user-data-dir=' + perfil, 'about:blank'],
{ stdio: 'ignore' });

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
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m.result || {}); pendentes.delete(m.id); }
});
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (metodo, params = {}) => new Promise((res) => {
  const id = ++seq;
  pendentes.set(id, res);
  ws.send(JSON.stringify({ id, method: metodo, params }));
});
const avaliar = async (e) =>
  (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

await cmd('Page.enable');
await cmd('Runtime.enable');

// A medição roda dentro da página: é lá que os retângulos existem.
const MEDIDA = `(() => {
  const raiz = document.documentElement;
  const larg = raiz.clientWidth;
  const nome = (el) => (el.id ? '#' + el.id : '') + '.' +
    (typeof el.className === 'string' ? el.className.split(' ').filter(Boolean).join('.') : el.tagName);

  const visivel = (el) => {
    const e = getComputedStyle(el);
    return e.display !== 'none' && e.visibility !== 'hidden' && Number(e.opacity) > 0.05;
  };

  const alem = [];
  const cortado = [];
  const pequeno = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visivel(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > larg + 1 || r.left < -1) alem.push(nome(el) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']');
    // texto cortado na horizontal: só conta quando ninguém pediu rolagem nem reticências
    const e = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth + 1 && e.overflowX === 'visible' && e.textOverflow !== 'ellipsis'
        && el.children.length === 0 && el.textContent.trim()) {
      cortado.push(nome(el) + ' ' + el.scrollWidth + '>' + el.clientWidth);
    }
    if ((el.tagName === 'BUTTON' || (el.tagName === 'A' && e.display !== 'inline'))
        && (r.height < 40 || r.width < 40)) {
      pequeno.push(nome(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
  }

  // Conteúdo escondido atrás da barra de navegação de baixo
  const barra = document.querySelector('.navegacao');
  const b = barra ? barra.getBoundingClientRect() : null;
  const embaixo = [];
  if (b && b.top > 0 && b.left < 2) {
    const ultimo = document.querySelector('.conteudo').lastElementChild;
    if (ultimo) {
      const r = ultimo.getBoundingClientRect();
      const fim = r.bottom + scrollY;
      const alturaTotal = raiz.scrollHeight;
      if (alturaTotal - fim < 8) embaixo.push('fim do conteúdo a ' + Math.round(alturaTotal - fim) + 'px da borda');
    }
  }

  return {
    larg,
    rolaLado: raiz.scrollWidth > larg + 1,
    alem: alem.slice(0, 5),
    cortado: cortado.slice(0, 5),
    pequeno: [...new Set(pequeno)].slice(0, 5),
    embaixo,
  };
})()`;

let problemas = 0;
const relatar = (tela, rota, m) => {
  const erros = [];
  if (m.rolaLado) erros.push('ROLA PARA O LADO (' + m.alem.join(', ') + ')');
  else if (m.alem.length) erros.push('passa da borda: ' + m.alem.join(', '));
  if (m.cortado.length) erros.push('texto cortado: ' + m.cortado.join(', '));
  if (m.pequeno.length) erros.push('alvo pequeno: ' + m.pequeno.join(', '));
  if (m.embaixo.length) erros.push(m.embaixo.join(', '));
  if (!erros.length) return false;
  console.log('    ' + rota.padEnd(9) + erros.join('\n               '));
  problemas += erros.length;
  return true;
};

const base = 'http://127.0.0.1:' + PORTA + '/';
await cmd('Page.navigate', { url: base });
await dormir(1800);

console.log('\n  Responsividade: ' + TELAS.length + ' telas x ' + (ROTAS.length + 1) + ' rotas\n');

for (const [largura, altura, apelido] of TELAS) {
  await cmd('Emulation.setDeviceMetricsOverride', {
    width: largura, height: altura, deviceScaleFactor: 1, mobile: largura < 860,
  });
  console.log('  ' + (largura + 'x' + altura).padEnd(10) + apelido);
  let limpo = true;

  for (const [nome, rota] of ROTAS) {
    await avaliar('location.hash = ' + JSON.stringify(rota));
    await dormir(320);
    await avaliar('scrollTo(0, 0)');
    if (relatar(apelido, nome, await avaliar(MEDIDA))) limpo = false;
    if (FOTOS) {
      const foto = await cmd('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(SAIDA, largura + '-' + nome + '.png'), Buffer.from(foto.data, 'base64'));
    }
  }

  // A lição em tela cheia é a tela mais apertada: tem topo, palco rolante e rodapé fixo.
  await avaliar('location.hash = "#/"');
  await dormir(300);
  await avaliar('(document.querySelector(".no.atual").click(), document.querySelector(".pop-no [data-comecar]").click())');
  await dormir(450);
  const licao = await avaliar(MEDIDA);
  if (relatar(apelido, 'licao', licao)) limpo = false;
  const coube = await avaliar(`(() => {
    const l = document.querySelector('.licao');
    if (!l) return 'a lição não abriu';
    const pe = l.querySelector('.licao-pe');
    const palco = l.querySelector('.licao-palco');
    const r = pe.getBoundingClientRect();
    if (r.bottom > innerHeight + 1) return 'o rodapé da lição fica fora da tela';
    if (palco.getBoundingClientRect().height < 60) return 'o palco da lição ficou sem altura';
    return null;
  })()`);
  if (coube) { console.log('    licao    ' + coube); problemas++; limpo = false; }
  if (FOTOS) {
    const foto = await cmd('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(SAIDA, largura + '-licao.png'), Buffer.from(foto.data, 'base64'));
  }
  await avaliar('location.hash = "#/"');
  await dormir(250);

  if (limpo) console.log('    tudo certo');
}

console.log(problemas ? '\n  ' + problemas + ' problema(s)\n' : '\n  nenhuma tela quebrou\n');
encerrar(problemas ? 1 : 0);
