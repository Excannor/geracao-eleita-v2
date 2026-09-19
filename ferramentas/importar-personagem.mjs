// Prepara uma imagem de personagem para entrar no aplicativo: recorta o fundo,
// reduz ao tamanho que a trilha usa e grava um PNG enxuto em arte/personagens/.
// O aplicativo é um arquivo só, então cada quilobyte aqui vai parar no HTML final.
//
// Uso: node ferramentas/importar-personagem.mjs <arquivo> <Nome do personagem>
// Ex.:  node ferramentas/importar-personagem.mjs ~/Downloads/noe.png Noé
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const entrada = process.argv[2];
const nome = process.argv[3];
if (!entrada || !nome) {
  console.error('uso: node ferramentas/importar-personagem.mjs <arquivo> <Nome>');
  process.exit(1);
}
const origem = resolve(entrada);
if (!existsSync(origem)) {
  console.error('não achei o arquivo: ' + origem);
  process.exit(1);
}

// A trilha mostra a figura em 78px de largura, e a tela pode ter 3x de densidade.
const LARGURA = 240;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const perfil = mkdtempSync(join(tmpdir(), 'cc-pers-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--allow-file-access-from-files', '--remote-debugging-port=' + PORTA_NAV,
  '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });

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
const av = async (e) => {
  const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'erro');
  return r.result?.value;
};

await cmd('Runtime.enable');
await cmd('Page.navigate', { url: 'about:blank' });
await dormir(400);

const base64 = readFileSync(origem).toString('base64');
const tipo = origem.toLowerCase().endsWith('.jpg') || origem.toLowerCase().endsWith('.jpeg')
  ? 'image/jpeg' : 'image/png';

// O recorte e a redução acontecem num canvas: nada de dependência externa.
const pronto = await av(`(async () => {
  const img = new Image();
  img.src = 'data:${tipo};base64,${base64}';
  await img.decode();

  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  const p = d.data;

  // Fundo branco (ou quase) vira transparente, varrendo de fora para dentro para
  // não furar o branco que faz parte do desenho, como a pomba ou uma túnica clara.
  const claro = (i) => p[i] > 234 && p[i + 1] > 234 && p[i + 2] > 234;
  const fila = [];
  const visto = new Uint8Array(c.width * c.height);
  const pos = (px, py) => py * c.width + px;
  for (let px = 0; px < c.width; px++) { fila.push([px, 0]); fila.push([px, c.height - 1]); }
  for (let py = 0; py < c.height; py++) { fila.push([0, py]); fila.push([c.width - 1, py]); }
  while (fila.length) {
    const [px, py] = fila.pop();
    if (px < 0 || py < 0 || px >= c.width || py >= c.height) continue;
    const k = pos(px, py);
    if (visto[k]) continue;
    const i = k * 4;
    if (!claro(i)) continue;
    visto[k] = 1;
    p[i + 3] = 0;
    fila.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
  }
  x.putImageData(d, 0, 0);

  // Corta a sobra transparente em volta
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let py = 0; py < c.height; py++) {
    for (let px = 0; px < c.width; px++) {
      if (p[(py * c.width + px) * 4 + 3] > 8) {
        if (px < x0) x0 = px; if (px > x1) x1 = px;
        if (py < y0) y0 = py; if (py > y1) y1 = py;
      }
    }
  }
  const larg = x1 - x0 + 1, alt = y1 - y0 + 1;
  if (larg < 8 || alt < 8) throw new Error('imagem vazia depois do recorte');

  const fim = document.createElement('canvas');
  fim.width = ${LARGURA};
  fim.height = Math.round(${LARGURA} * alt / larg);
  const f = fim.getContext('2d');
  f.imageSmoothingQuality = 'high';
  f.drawImage(c, x0, y0, larg, alt, 0, 0, fim.width, fim.height);
  return { dados: fim.toDataURL('image/png'), largura: fim.width, altura: fim.height,
           cortou: [larg, alt] };
})()`);

const destino = join(AQUI, 'arte', 'personagens');
mkdirSync(destino, { recursive: true });
const arquivo = join(destino, nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Za-z0-9]/g, '') + '.png');
writeFileSync(arquivo, Buffer.from(pronto.dados.split(',')[1], 'base64'));

const antes = statSync(origem).size;
const depois = statSync(arquivo).size;
console.log('\n  ' + nome);
console.log('  recorte:  ' + pronto.cortou[0] + 'x' + pronto.cortou[1]
  + ' → ' + pronto.largura + 'x' + pronto.altura);
console.log('  peso:     ' + (antes / 1024).toFixed(0) + ' KB → '
  + (depois / 1024).toFixed(1) + ' KB');
console.log('  gravado:  ' + arquivo + '\n');

try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(0);
