// Confere a foto de perfil: entra pelo seletor de arquivo, sai reduzida, aparece
// na aba, sobrevive ao recarregar e chega ao outro aparelho pela sincronização.
// Uso: node ferramentas/teste-foto.mjs
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
const PORTA = 8195;
const ESTADO = join(tmpdir(), 'cc-foto', 'estado.json');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

try { rmSync(join(tmpdir(), 'cc-foto'), { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: ESTADO, CAMINHO_ABERTO: '1' },
  stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-ft-'));
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
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

await cmd('Runtime.enable');
await cmd('Log.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true });
await cmd('Page.navigate', { url: 'http://127.0.0.1:' + PORTA + '/#/perfil' });
await dormir(2600);

console.log('\n  Foto de perfil\n');

ok(await av('!!document.querySelector(".cartao-pessoa")'), 'o cartão de quem é você aparece');
ok(await av('!!document.querySelector(".sem-foto")'), 'sem foto, mostra o lugar dela');

// uma imagem grande e retangular, para ver o corte e a redução funcionando
const pronta = await av(`(async () => {
  const c = document.createElement('canvas');
  c.width = 1400; c.height = 900;
  const x = c.getContext('2d');
  x.fillStyle = '#2f6180'; x.fillRect(0, 0, 1400, 900);
  x.fillStyle = '#efc64c'; x.beginPath(); x.arc(700, 450, 300, 0, 7); x.fill();
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const arquivo = new File([blob], 'retrato.png', { type: 'image/png' });
  const dados = await CC.prepararFoto(arquivo);
  return { dados, entrou: blob.size };
})()`);

ok(typeof pronta.dados === 'string' && pronta.dados.startsWith('data:image/jpeg'),
  'a imagem vira JPEG depois de preparada');
const pesoKb = Math.round((pronta.dados.length * 3 / 4) / 1024);
ok(pesoKb < 60, 'a foto fica leve: ' + Math.round(pronta.entrou / 1024) + ' KB → ' + pesoKb + ' KB');

const lado = await av(`(async () => {
  const img = new Image();
  img.src = ${JSON.stringify(pronta.dados)};
  await img.decode();
  return [img.width, img.height];
})()`);
ok(lado[0] === 256 && lado[1] === 256, 'a foto sai quadrada em 256 (veio ' + lado.join('x') + ')');

// recusa o que não é imagem
const recusou = await av(`(async () => {
  try {
    await CC.prepararFoto(new File(['nada'], 'a.txt', { type: 'text/plain' }));
    return false;
  } catch (e) { return true; }
})()`);
ok(recusou, 'arquivo que não é imagem é recusado');

// guarda e desenha
await av('CC.guardarFoto(' + JSON.stringify(pronta.dados) + '); CC.redesenhar();');
await dormir(700);
ok(await av('!!document.querySelector(".cartao-pessoa img")'), 'a foto aparece no cartão');
ok(await av('!!document.querySelector("img.retrato-topo")'), 'a foto aparece no retrato do topo (o atalho do perfil)');

// o nome
await av('CC.guardarApelido("Marcos"); CC.redesenhar();');
await dormir(500);
ok(await av('document.getElementById("apelido").value === "Marcos"'), 'o nome fica guardado');

// sobrevive ao recarregar
await cmd('Page.reload');
await dormir(2600);
ok(await av('CC.foto().startsWith("data:image/jpeg")'), 'a foto continua depois de recarregar');
ok(await av('CC.apelido() === "Marcos"'), 'o nome continua depois de recarregar');

// chega ao servidor, que é como o outro aparelho recebe
await dormir(900);
const noServidor = await av('fetch("api/estado", {cache:"no-store"}).then(r => r.json())');
ok(noServidor && typeof noServidor.foto === 'string' && noServidor.foto.length > 100,
  'a foto chega ao servidor, para valer nos seus outros aparelhos');
ok(noServidor && noServidor.apelido === 'Marcos', 'o nome também sobe');

// sincronização leve: depois que o servidor tem a foto, as marcações seguintes vão sem ela
await av(`(() => {
  window.__envios = [];
  const original = window.fetch;
  window.fetch = (u, o) => {
    if (String(u).includes('api/estado') && o && o.method === 'PUT') window.__envios.push({ tamanho: o.body.length, foto: o.body.includes('data:image') });
    return original(u, o);
  };
  return true;
})()`);
await av('CC.gravar("acertosTotal", (CC.ler("acertosTotal", 0) || 0) + 1); 1');
await dormir(1200);
const envios = await av('window.__envios');
ok(envios.length >= 1 && envios.every((x) => !x.foto),
  'com a foto já no servidor, a marcação seguinte vai sem ela (' + (envios[0] ? Math.round(envios[0].tamanho / 1024 * 10) / 10 + ' KB' : 'nada saiu') + ')');
const aindaNoServidor = await av('fetch("api/estado", {cache:"no-store"}).then(r => r.json()).then(d => d.foto && d.foto.length > 100)');
ok(aindaNoServidor, 'e o servidor continua com a foto');

// a fusão entre aparelhos não apaga a foto de quem já tinha
const fundido = await av(`(() => {
  const comFoto = { atualizadoEm: 10, foto: 'data:image/jpeg;base64,AAA', apelido: 'Marcos',
                    lidos: [1], licoes: [], oia: {}, anotacoes: {}, marcadoEm: {} };
  const semFoto = { atualizadoEm: 20, foto: '', apelido: '',
                    lidos: [2], licoes: [], oia: {}, anotacoes: {}, marcadoEm: {} };
  const r = CC.fundir(comFoto, semFoto);
  return { foto: r.foto, apelido: r.apelido, lidos: r.lidos.length };
})()`);
ok(fundido.foto === 'data:image/jpeg;base64,AAA' && fundido.apelido === 'Marcos',
  'o aparelho sem foto não apaga a foto do outro');

// remover
await av('CC.guardarFoto(""); CC.redesenhar();');
await dormir(600);
ok(await av('!!document.querySelector(".sem-foto")'), 'dá para remover a foto');

const erros = evs.filter((e) => e.method === 'Runtime.exceptionThrown').length;
ok(erros === 0, 'nenhuma exceção no caminho');

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  a foto de perfil funciona\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
