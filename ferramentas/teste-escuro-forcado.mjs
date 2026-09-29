// O Android com "modo escuro para sites" escurece a página por cima do tema claro e inverte
// as cores escuras dos desenhos: a pupila do Bento ficava clara e ele parecia cego. Aqui o
// escurecimento forçado do Chrome é ligado e a cor dos pixels é medida na captura de tela,
// porque o efeito é só de pintura: o CSS calculado não muda.
// Uso: node ferramentas/teste-escuro-forcado.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { portaLivre, fecharArvore } from './navegador.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok    ' : '  FALHA ') + msg); if (!cond) falhas++; };

// O fundo do tema escuro, num lugar só: o app (estilo.css) e o portal (entrar.html) usam
// o mesmo tom, e quando a paleta muda é aqui que se atualiza, não em quatro comparações
// espalhadas pelo arquivo.
const ESCURO = { r: 0x0d, g: 0x0d, b: 0x0d, hex: '#0d0d0d' };
// E o claro. Aqui não dá para exigir "quase branco": o fundo do app é um cinza (#ececec,
// luz 236), e o cartão é que é branco. O que este teste procura é o navegador escurecendo
// a página por cima — e isso derruba a luz muito abaixo disso, não em três pontos.
const CLARO = { luz: 230, hex: '#e6e6e6' };
const claroIntacto = (luz) => luz >= CLARO.luz - 10;

const PORTA = await portaLivre();
const DEP = await portaLivre();
const pasta = join(tmpdir(), 'cc-escuro-forcado');
try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json'), CAMINHO_ABERTO: '1' }, stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/'); break; } catch { await dormir(150); } }

const perfil = mkdtempSync(join(tmpdir(), 'cc-ef-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + DEP, '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });
const encerrar = (codigo) => { fecharArvore(nav, perfil); try { servidor.kill(); } catch { /* ok */ } process.exit(codigo); };

let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) {
  try { wsUrl = ((await (await fetch('http://127.0.0.1:' + DEP + '/json/list')).json()).find((x) => x.type === 'page') || {}).webSocketDebuggerUrl; } catch { /* subindo */ }
  if (!wsUrl) await dormir(200);
}
const ws = new WebSocket(wsUrl);
let seq = 0;
const pend = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); } });
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 360, height: 780, deviceScaleFactor: 1, mobile: true });

// Lê a cor de um ponto da captura: a imagem vai para um canvas dentro da própria página.
async function corNaTela(x, y) {
  const shot = await cmd('Page.captureScreenshot', { format: 'png' });
  return av(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${shot.data}'; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const [r, gg, b] = g.getImageData(${Math.round(x)}, ${Math.round(y)}, 1, 1).data;
    return { r, g: gg, b, luz: Math.round(0.2126 * r + 0.7152 * gg + 0.0722 * b) };
  })()`);
}

// Abre o app com um tema escolhido (ou nenhum), põe o Bento de olhos abertos numa área limpa
// e mede o fundo e a pupila.
async function medirApp(tema, colorSchemeNaMao) {
  await cmd('Page.navigate', { url: base + '/#/' });
  await dormir(600);
  await av(tema === null ? 'localStorage.removeItem("cc.tema")' : 'localStorage.setItem("cc.tema", ' + JSON.stringify(JSON.stringify(tema)) + ')');
  await cmd('Page.reload');
  await dormir(2600);
  const pos = await av(`(() => {
    document.querySelectorAll('.cortina, #abertura').forEach(c => c.remove());
    if (${JSON.stringify(colorSchemeNaMao || '')}) document.documentElement.style.setProperty('color-scheme', ${JSON.stringify(colorSchemeNaMao || '')});
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:var(--fundo)';
    d.innerHTML = '<div style="width:200px">' + CC.mascoteSvg('parado') + '</div>';
    document.body.appendChild(d);
    // O Bento é uma imagem, então a pupila não dá para procurar no documento: ela sai da
    // geometria do desenho. No viewBox 220x250, a pupila esquerda está em (84, 89).
    // A imagem pinta depois de decodificar, e medir antes disso lia o fundo.
    const img = d.querySelector('.mascote-svg');
    const quadro = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return img.decode().catch(() => {}).then(quadro).then(quadro).then(() => {
      const c = img.getBoundingClientRect();
      return { px: c.x + c.width * (84 / 220), py: c.y + c.height * (89 / 250) };
    });
  })()`);
  await dormir(500);
  return { fundo: await corNaTela(20, 20), pupila: await corNaTela(pos.px, pos.py) };
}

async function medirPortal(tema) {
  await cmd('Page.navigate', { url: base + '/entrar.html' });
  await dormir(500);
  await av(tema === null ? 'localStorage.removeItem("cc.tema")' : 'localStorage.setItem("cc.tema", ' + JSON.stringify(JSON.stringify(tema)) + ')');
  await cmd('Page.reload');
  await dormir(1500);
  return corNaTela(8, 8);
}

const sistema = (escuro) => cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: escuro ? 'dark' : 'light' }] });

console.log('\n  Escurecimento forçado do navegador\n');

// Sem o escurecimento forçado, as referências de cada tema.
await cmd('Emulation.setAutoDarkModeOverride', { enabled: false });
await sistema(false);
const claroNormal = await medirApp(false);
ok(claroIntacto(claroNormal.fundo.luz) && claroNormal.pupila.luz < 70, 'referência: tema claro com fundo claro e pupila escura');

// O caso relatado: tema claro escolhido no app, celular escurecendo sites. No Android o Chrome
// só escurece sites com o sistema (ou o navegador) no escuro, e nesse estado a página recebe
// "prefere escuro"; por isso o sistema claro não entra aqui.
await cmd('Emulation.setAutoDarkModeOverride', { enabled: true });
await sistema(true);
// Prova de que o teste enxerga o defeito: com a declaração antiga ("light" sem "only") o
// navegador tem de voltar a escurecer. ANTIGA=1 roda só essa conferência.
const antiga = process.env.ANTIGA === '1';
const m = await medirApp(false, antiga ? 'light' : '');
ok(claroIntacto(m.fundo.luz), 'tema claro escolhido: o navegador não escurece o fundo, luz ' + m.fundo.luz);
ok(m.pupila.luz < 70, 'tema claro escolhido: a pupila do Bento continua escura, luz ' + m.pupila.luz);
if (antiga) encerrar(falhas ? 1 : 0);

// Sem escolha no app e sistema escuro: vale o tema escuro do próprio app, não o do navegador.
await sistema(true);
const segueSistema = await medirApp(null);
ok(Math.abs(segueSistema.fundo.r - ESCURO.r) < 8 && Math.abs(segueSistema.fundo.g - ESCURO.g) < 8 && Math.abs(segueSistema.fundo.b - ESCURO.b) < 8,
  'sem escolha e sistema escuro: aparece o escuro do app (' + ESCURO.hex + '), cor lida ' + JSON.stringify(segueSistema.fundo));
ok(segueSistema.pupila.luz < 70, 'no escuro do app a pupila continua escura, luz ' + segueSistema.pupila.luz);

const escuroEscolhido = await medirApp(true);
ok(Math.abs(escuroEscolhido.fundo.r - ESCURO.r) < 8 && escuroEscolhido.fundo.luz < 40, 'tema escuro escolhido: o escuro do app, sem mistura');
// Faltava medir o Bento neste caso: é o de quem usa o app no escuro, com o celular
// escurecendo sites por cima. Se o navegador inverter o desenho, a pupila clareia.
ok(escuroEscolhido.pupila.luz < 70, 'tema escuro escolhido: a pupila do Bento continua escura, luz ' + escuroEscolhido.pupila.luz);

// O portal de entrada.
ok(claroIntacto((await medirPortal(false)).luz), 'portal com tema claro escolhido: o navegador não escurece');
await sistema(true);
const portalSistema = await medirPortal(null);
ok(Math.abs(portalSistema.r - ESCURO.r) < 8 && portalSistema.luz < 40, 'portal sem escolha e sistema escuro: o escuro do próprio portal');

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o navegador não escurece mais o app por cima\n');
encerrar(falhas ? 1 : 0);
