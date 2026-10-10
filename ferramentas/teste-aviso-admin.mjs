// Confere o aviso pontual do administrador (Painel > Enviar aviso), de ponta a ponta, com o
// serviço de push falso em 127.0.0.1 do teste-notificacoes.mjs e o relógio fixo do servidor
// (CAMINHO_PUSH_TESTE + CAMINHO_RELOGIO):
//   - quem não é administrador recebe 403 ao enviar e ao abrir a tela;
//   - num Chrome sem interface (CHROME), o administrador abre a tela, escolhe uma foto grande,
//     que o navegador reduz (até 1024 px, JPEG, abaixo de 250 KB, sem EXIF), e manda só para
//     ele: o item aparece no sino com a foto, e o push leva image e url;
//   - a foto é servida sem sessão, com cache longo, abaixo do limite; id que não existe dá 404;
//   - o servidor recusa o que não é imagem, a foto grande demais e o destino fora da lista;
//   - "Todos" chega a todos os inscritos; quem está no silêncio da noite (outro fuso) fica com
//     o push pendente até a primeira rodada de lembretes depois das 7h; quem desligou todos os
//     avisos fica só com o sino; o segundo aviso para todos no dia pede confirmar de novo.
// Sem CHROME, a parte do navegador é pulada e a foto do teste é um JPEG mínimo feito aqui.
// Com CAPTURAS=<pasta>, salva a tela do envio com a prévia e o sino com o aviso, em claro e escuro.
// Uso: node ferramentas/teste-aviso-admin.mjs     (PORTA=8721 por padrão; o push falso usa PORTA+1)
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { rmSync, mkdirSync, mkdtempSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createECDH, createHmac, createDecipheriv, randomBytes } from 'node:crypto';
import { portaLivre, fecharArvore } from './navegador.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8721;
const PORTA_PUSH = PORTA + 1;
const PASTA = mkdtempSync(join(tmpdir(), 'cc-aviso-admin-'));
const FUSO = 'America/Sao_Paulo';
const CHROME = process.env.CHROME || '';
const CAPTURAS = process.env.CAPTURAS || '';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// Meio-dia em São Paulo: Tóquio está à meia-noite (silêncio), São Paulo não.
const hojeSP = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const emSP = (hora, dia = hojeSP) => new Date(dia + 'T' + hora + ':00-03:00').toISOString();

// ---------- serviço de push falso ----------
// atrasoPush: quanto o serviço falso demora para responder a um aviso do administrador (o
// teste do push lento); os lembretes da rodada respondem na hora.
const recebidos = [];
let atrasoPush = 0;
const push = createServer((req, res) => {
  const partes = [];
  req.on('data', (p) => partes.push(p));
  req.on('end', () => {
    recebidos.push({ caminho: req.url, corpo: Buffer.concat(partes) });
    let ehAviso = false;
    try { const ap = Object.values(cel).find((x) => x.caminho === req.url); ehAviso = !!ap && /^aviso:/.test(decifrar(Buffer.concat(partes), ap).tag || ''); } catch { /* outro */ }
    setTimeout(() => { try { res.writeHead(201).end(); } catch { /* o servidor caiu */ } }, ehAviso ? atrasoPush : 0);
  });
});
await new Promise((r) => push.listen(PORTA_PUSH, '127.0.0.1', r));

// Sobe o servidor (e sobe de novo, no teste do reinício, com a mesma pasta de dados).
const base = 'http://127.0.0.1:' + PORTA;
let servidor = null;
let relogio = emSP('12:00');
async function subir() {
  servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
    env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_PUSH_TESTE: '1', CAMINHO_RELOGIO: relogio, CAMINHO_ABERTO: '', CAMINHO_ADMIN: 'chefe' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }
}
async function derrubar() {
  const saiu = new Promise((r) => servidor.once('exit', r));
  servidor.kill();
  await saiu;
}
await subir();
// Dias a partir de hoje em São Paulo: AAAA-MM-DD e dd/mm/aaaa.
const diaMais = (n) => new Date(Date.parse(hojeSP + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const br = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
let nav = null;
let perfil = '';
const encerrar = () => {
  try { servidor.kill(); } catch { /* já saiu */ }
  push.close();
  if (nav) fecharArvore(nav, perfil);
};
process.on('exit', encerrar);

const pedir = (rota, corpo, cookie) => fetch(base + rota, {
  method: corpo ? 'POST' : 'GET',
  headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const pedirJson = async (...a) => { const r = await pedir(...a); return { status: r.status, ...(await r.json().catch(() => ({}))) }; };
async function criar(usuario, nome, fuso = FUSO) {
  const r = await pedir('/api/criar-conta', { usuario, senha: 'senha-boa-1', nome, email: usuario + '@teste.com', nascimento: '2000-01-01', fuso, consentimento: true });
  return (r.headers.get('set-cookie') || '').split(';')[0];
}

function aparelho(nome) {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  return {
    ecdh, auth, caminho: '/' + nome,
    inscricao: { endpoint: 'http://127.0.0.1:' + PORTA_PUSH + '/' + nome, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } },
  };
}
const hmac = (k, d) => createHmac('sha256', k).update(d).digest();
function decifrar(corpo, ap) {
  const sal = corpo.subarray(0, 16);
  const n = corpo[20];
  const doServidor = corpo.subarray(21, 21 + n);
  const cifrado = corpo.subarray(21 + n);
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), ap.ecdh.getPublicKey(), doServidor]);
  const prk = hmac(sal, hmac(hmac(ap.auth, ap.ecdh.computeSecret(doServidor)), Buffer.concat([info, Buffer.from([1])])));
  const d = createDecipheriv('aes-128-gcm', hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16),
    hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12));
  d.setAuthTag(cifrado.subarray(-16));
  const claro = Buffer.concat([d.update(cifrado.subarray(0, -16)), d.final()]);
  return JSON.parse(claro.subarray(0, claro.lastIndexOf(2)).toString('utf8'));
}
const doAparelho = (ap) => recebidos.filter((r) => r.caminho === ap.caminho).map((r) => decifrar(r.corpo, ap));
const avisosDe = (ap) => doAparelho(ap).filter((m) => /^aviso:/.test(m.tag || ''));
const esperarAvisos = async (ap, quantos, ms = 3000) => {
  for (let t = 0; t < ms; t += 100) { if (avisosDe(ap).length >= quantos) break; await dormir(100); }
  return avisosDe(ap);
};

// Largura e altura de um JPEG (o primeiro SOF), e se há bloco EXIF (APP1 "Exif").
function medirJpeg(b) {
  let i = 2;
  let exif = false;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const marca = b[i + 1];
    const tam = b.readUInt16BE(i + 2);
    if (marca === 0xe1 && b.toString('latin1', i + 4, i + 8) === 'Exif') exif = true;
    if (marca >= 0xc0 && marca <= 0xc3) return { altura: b.readUInt16BE(i + 5), largura: b.readUInt16BE(i + 7), exif };
    i += 2 + tam;
  }
  return { altura: 0, largura: 0, exif };
}

console.log('\n  Aviso pontual do administrador\n');

const chefe = await criar('chefe', 'Chefe');
const ana = await criar('ana', 'Ana');
const bento = await criar('bento', 'Bento');
const kenji = await criar('kenji', 'Kenji', 'Asia/Tokyo');
await criar('duda', 'Duda');
const cel = { chefe: aparelho('chefe'), ana: aparelho('ana'), bento: aparelho('bento'), kenji: aparelho('kenji') };
for (const [u, ck] of [['chefe', chefe], ['ana', ana], ['bento', bento], ['kenji', kenji]]) {
  await pedirJson('/api/notificacoes/inscrever', { inscricao: cel[u].inscricao }, ck);
}
// Bento desligou todos os avisos: no Todos, só o sino.
await pedirJson('/api/notificacoes/preferencias', { lembrete: false, ofensiva: false, amigos: false }, bento);

// ---------- só o administrador ----------
ok((await pedir('/api/painel/aviso', null, ana)).status === 403, 'quem não é administrador recebe 403 ao abrir a tela (GET)');
ok((await pedir('/api/painel/aviso', { titulo: 'Oi', publico: 'mim' }, ana)).status === 403, 'quem não é administrador recebe 403 ao enviar');
ok((await pedir('/api/painel/aviso', { titulo: 'Oi', publico: 'mim' })).status === 401, 'sem entrar, 401');
const resumo = await pedirJson('/api/painel/aviso', null, chefe);
ok(resumo.status === 200 && resumo.pessoas === 5 && resumo.comPush === 3 && resumo.eu.push === true && resumo.paraTodosHoje === 0,
  'o administrador vê quantas pessoas recebem: 5 no sino, 3 no celular (' + resumo.pessoas + ', ' + resumo.comPush + ')');

// ---------- o navegador: a tela, a foto reduzida e o envio "só para mim" ----------
let idFoto = '';
if (CHROME && existsSync(CHROME)) {
  const DEPURACAO = await portaLivre();
  perfil = mkdtempSync(join(tmpdir(), 'cc-aviso-nav-'));
  nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + DEPURACAO,
    '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
  let wsUrl = '';
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try { wsUrl = ((await (await fetch('http://127.0.0.1:' + DEPURACAO + '/json/list')).json()).find((x) => x.type === 'page') || {}).webSocketDebuggerUrl || ''; } catch { /* subindo */ }
    if (!wsUrl) await dormir(250);
  }
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pend = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); } });
  await new Promise((r) => ws.addEventListener('open', r));
  const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
  const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  const esperar = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 150) { if (await av(expr)) return true; await dormir(150); } return false; };
  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  // o app grava o fuso do aparelho na conta: o do administrador fica o de São Paulo
  await cmd('Emulation.setTimezoneOverride', { timezoneId: FUSO });
  const [nome, valor] = chefe.split('=');
  await cmd('Network.setCookie', { name: nome, value: valor, url: base + '/' });
  await cmd('Page.navigate', { url: base + '/#/config/painel/aviso' });
  await esperar('!!window.CC && !!document.querySelector("[data-enviar]")', 12000);
  await av('document.querySelectorAll(".cortina").forEach((c) => c.remove())');
  ok(await esperar('!!CC.telaAviso && !!document.querySelector("[data-titulo]") && /Todos \\(5\\)/.test(document.body.innerText)'),
    'a tela "Enviar aviso" abre (carregada sob demanda) com o público e a contagem');
  // Uma foto grande (3000 × 2000) entra pelo campo de arquivo: uma das fotos da página de
  // boas-vindas, ampliada, com um grão por cima para não comprimir fácil demais.
  const fotoLanding = readdirSync(join(AQUI, 'dist')).find((f) => /^landing-culto\.[0-9a-f]{10}\.(webp|jpg)$/.test(f)) || '';
  await av(`(async () => {
    const c = document.createElement('canvas'); c.width = 3000; c.height = 2000;
    const g = c.getContext('2d');
    try {
      const img = new Image(); img.src = './${fotoLanding}'; await img.decode();
      const e = Math.max(3000 / img.naturalWidth, 2000 / img.naturalHeight);
      g.drawImage(img, (3000 - img.naturalWidth * e) / 2, (2000 - img.naturalHeight * e) / 2, img.naturalWidth * e, img.naturalHeight * e);
    } catch (e) { g.fillStyle = '#7a8a50'; g.fillRect(0, 0, 3000, 2000); }
    const d = g.getImageData(0, 0, 3000, 2000);
    for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * 24; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
    g.putImageData(d, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'grande.png', { type: 'image/png' }));
    const i = document.querySelector('[data-foto]'); i.files = dt.files; i.dispatchEvent(new Event('change'));
    return blob.size;
  })()`);
  ok(await esperar('!!document.querySelector(".aviso-foto img") && !!document.querySelector(".aviso-notif-foto img")', 15000),
    'a foto escolhida aparece na miniatura e na prévia da notificação');
  const preencher = (sel, v) => av('(() => { const el = document.querySelector(' + JSON.stringify(sel) + '); el.value = ' + JSON.stringify(v) + '; el.dispatchEvent(new Event("input", { bubbles: true })); })()');
  await preencher('[data-titulo]', 'Culto especial no domingo');
  await preencher('[data-texto]', 'Às 19h, com louvor e a Santa Ceia. Traga alguém!');
  await av('(() => { const i = document.querySelector("input[name=destino][value=parabolas]"); i.click(); })()');
  ok(await av('document.querySelector(".aviso-notif b").textContent === "Culto especial no domingo" && /Parábolas/.test(document.querySelector(".aviso-previa-destino").textContent)'),
    'a prévia acompanha o título e o destino escolhido');
  if (CAPTURAS) {
    mkdirSync(CAPTURAS, { recursive: true });
    // a abertura fica um instante por cima do app
    await esperar('!document.getElementById("abertura")', 5000);
    for (const tema of ['claro', 'escuro']) {
      await av('CC.aplicarTema(' + (tema === 'escuro') + ')');
      await dormir(300);
      // a página inteira: a janela cresce até a altura do conteúdo, e volta depois
      const altura = await av('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
      await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: altura, deviceScaleFactor: 2, mobile: true });
      await dormir(400);
      const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
      await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      writeFileSync(join(CAPTURAS, 'envio-' + tema + '.png'), Buffer.from(data, 'base64'));
    }
    await av('CC.aplicarTema(false)');
  }
  await av('document.querySelector("[data-enviar]").click()');
  await esperar('!document.querySelector(".aviso-foto img")', 8000);
  const caixa = await pedirJson('/api/avisos', null, chefe);
  const item = (caixa.avisos || []).find((a) => a.tipo === 'aviso');
  ok(item && item.titulo === 'Culto especial no domingo' && item.foto && /#\/parabolas$/.test(item.url),
    'o aviso "só para mim" aparece no sino do administrador, com a foto e o destino');
  idFoto = (item && item.foto) || '';
  const [noCel] = await esperarAvisos(cel.chefe, 1);
  ok(noCel && noCel.titulo === 'Culto especial no domingo' && /\/api\/avisos\/foto\/[\w-]{22}$/.test(noCel.image || '') && /#\/parabolas$/.test(noCel.url || ''),
    'o push leva image (' + (noCel && noCel.image) + ') e url (' + (noCel && noCel.url) + ')');
  ok(avisosDe(cel.ana).length === 0, '"só para mim" não chega a mais ninguém');
  if (CAPTURAS) {
    await av('location.hash = "#/avisos"');
    await esperar('!!document.querySelector(".item-aviso .foto-aviso") && document.querySelector(".item-aviso .foto-aviso").complete', 8000);
    await dormir(600);
    await av('document.getElementById("aviso-flutuante")?.remove()');
    for (const tema of ['claro', 'escuro']) {
      await av('CC.aplicarTema(' + (tema === 'escuro') + ')');
      await dormir(300);
      const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(CAPTURAS, 'sino-' + tema + '.png'), Buffer.from(data, 'base64'));
    }
  }
  if (CAPTURAS) {
    // a entrada no Painel do administrador
    await av('CC.aplicarTema(false); location.hash = "#/config/painel"');
    await esperar('!!document.querySelector("a[href=\'#/config/painel/aviso\']")', 8000);
    await dormir(500);
    await av('document.querySelector("a[href=\'#/config/painel/aviso\']").scrollIntoView({ block: "center" })');
    await dormir(300);
    const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(CAPTURAS, 'painel-entrada-claro.png'), Buffer.from(data, 'base64'));
  }
  // ---------- agendar pela tela ----------
  // Só para mim, daqui a 3 dias às 10h; o teste de cancelar (abaixo) o tira da fila.
  await av('CC.aplicarTema(false); location.hash = "#/config/painel/aviso"');
  await esperar('!!document.querySelector("[data-titulo]") && !!document.querySelector("input[name=modo]")', 8000);
  await dormir(400);
  await preencher('[data-titulo]', 'Ensaio do louvor');
  await av('document.querySelector("input[name=modo][value=agendar]").click()');
  ok(await esperar('!!document.querySelector("[data-dia]") && document.querySelector("[data-dia]").value === ' + JSON.stringify(br(hojeSP))),
    '"Agendar" mostra dia (já com hoje) e hora');
  await preencher('[data-dia]', diaMais(3).slice(8, 10) + diaMais(3).slice(5, 7) + diaMais(3).slice(0, 4));
  await preencher('[data-hora]', '1000');
  ok(await av('document.querySelector("[data-dia]").value === ' + JSON.stringify(br(diaMais(3))) + ' && document.querySelector("[data-hora]").value === "10:00"'),
    'a máscara põe as barras e os dois pontos sozinha');
  ok(await av('/Agendar só para mim/.test(document.querySelector("[data-enviar]").textContent)'), 'o botão vira "Agendar só para mim"');
  await av('document.querySelector("[data-enviar]").click()');
  ok(await esperar('!!document.querySelector("[data-cancelar]") && /Ensaio do louvor/.test(document.querySelector(".aviso-agendado").textContent)', 8000),
    'o aviso agendado aparece na lista "Agendados", com o botão Cancelar');
  if (CAPTURAS) {
    // um segundo rascunho, já em "Agendar", para a captura mostrar o formulário e a lista
    await preencher('[data-titulo]', 'Vigília de sexta');
    await preencher('[data-texto]', 'Das 22h à meia-noite, no templo. Venha orar com a gente.');
    await av('document.querySelector("input[name=publico][value=todos]").click()');
    await av('document.querySelector("input[name=modo][value=agendar]").click()');
    await esperar('!!document.querySelector("[data-hora]")', 4000);
    await preencher('[data-dia]', diaMais(1).slice(8, 10) + diaMais(1).slice(5, 7) + diaMais(1).slice(0, 4));
    await preencher('[data-hora]', '1800');
    await av('document.getElementById("aviso-flutuante")?.remove(); document.activeElement && document.activeElement.blur()');
    for (const tema of ['claro', 'escuro']) {
      await av('CC.aplicarTema(' + (tema === 'escuro') + ')');
      await dormir(300);
      const altura = await av('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
      await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: altura, deviceScaleFactor: 2, mobile: true });
      await dormir(400);
      const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
      await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      writeFileSync(join(CAPTURAS, 'agendar-' + tema + '.png'), Buffer.from(data, 'base64'));
    }
    await av('CC.aplicarTema(false)');
  }
  ws.close();
} else {
  console.log('  (sem CHROME: a parte do navegador fica de fora)');
}

// ---------- a foto servida ----------
// Sem navegador, a foto do teste é um JPEG mínimo; com ele, a que o navegador reduziu.
const jpegMinimo = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=', 'base64');
if (!idFoto) {
  const r = await pedirJson('/api/painel/aviso', { titulo: 'Teste', publico: 'mim', foto: jpegMinimo.toString('base64') }, chefe);
  idFoto = r.foto || '';
}
const servida = await fetch(base + '/api/avisos/foto/' + idFoto);
const bytes = Buffer.from(await servida.arrayBuffer());
const medida = medirJpeg(bytes);
ok(servida.status === 200 && servida.headers.get('content-type') === 'image/jpeg', 'a foto é servida sem sessão (o Android a busca sem cookie), como JPEG');
ok(/max-age=31536000/.test(servida.headers.get('cache-control') || '') && /immutable/.test(servida.headers.get('cache-control') || ''), 'com cache longo');
ok(bytes.length > 0 && bytes.length < 250 * 1024, 'a foto pesa abaixo de 250 KB (' + (bytes.length / 1024).toFixed(1) + ' KB)');
if (CHROME && existsSync(CHROME)) {
  ok(Math.max(medida.largura, medida.altura) === 1024 || (Math.max(medida.largura, medida.altura) < 1024 && bytes.length > 200 * 1024),
    'o navegador reduziu a foto de 3000 × 2000 para ' + medida.largura + ' × ' + medida.altura);
}
ok(!medida.exif, 'a foto servida não tem EXIF');
ok((await fetch(base + '/api/avisos/foto/' + 'x'.repeat(22))).status === 404, 'id que não existe: 404');
ok((await fetch(base + '/api/avisos/foto/..%2F..%2Fcaminho.db')).status === 404, 'endereço torto: 404');

// ---------- o servidor confere o que a tela limita ----------
ok((await pedirJson('/api/painel/aviso', { titulo: 'Oi', publico: 'mim', foto: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64') }, chefe)).status === 400,
  'recusa o que não é JPEG nem WebP (um SVG)');
ok((await pedirJson('/api/painel/aviso', { titulo: 'Oi', publico: 'mim', foto: Buffer.concat([jpegMinimo, Buffer.alloc(320 * 1024)]).toString('base64') }, chefe)).status === 413,
  'recusa foto acima de 300 KB');
ok((await pedirJson('/api/painel/aviso', { titulo: 'Oi', publico: 'mim', destino: 'https://golpe.example' }, chefe)).status === 400, 'recusa destino fora da lista');
// Quem chama a API direto pode mandar a foto como saiu da câmera: o servidor tira o EXIF
// (com o GPS) e o XMP antes de guardar, e recusa a foto que não consegue ler.
{
  const seg = (marca, dados) => { const c = Buffer.alloc(4); c[0] = 0xff; c[1] = marca; c.writeUInt16BE(dados.length + 2, 2); return Buffer.concat([c, dados]); };
  // TIFF com IFD0 apontando para o IFD do GPS (latitude S)
  const tiff = Buffer.from('4d4d002a00000008' + '0001' + '882500040000000100000020' + '00000000' + '000000000000' + '0001' + '000100020000000253000000' + '00000000', 'hex');
  const exif = seg(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]));
  const xmp = seg(0xe1, Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>GPSLatitude 23,33S</x:xmpmeta>', 'latin1'));
  const comExif = Buffer.concat([jpegMinimo.subarray(0, 20), exif, xmp, jpegMinimo.subarray(20)]);
  ok(medirJpeg(comExif).exif, '(a foto do teste tem EXIF com GPS)');
  const r = await pedirJson('/api/painel/aviso', { titulo: 'Foto com EXIF', publico: 'mim', foto: comExif.toString('base64') }, chefe);
  const guardada = Buffer.from(await (await fetch(base + '/api/avisos/foto/' + r.foto)).arrayBuffer());
  ok(r.status === 200 && guardada.length && !medirJpeg(guardada).exif && !guardada.includes('xmpmeta') && !guardada.includes(tiff),
    'JPEG com EXIF e GPS: a foto guardada sai sem EXIF, sem GPS e sem XMP');
  ok(guardada.equals(jpegMinimo), 'e o resto da foto fica igual, byte a byte');
  // WebP com VP8X, EXIF e XMP
  const chunk = (nome, d) => { const c = Buffer.alloc(8); c.write(nome, 0, 'latin1'); c.writeUInt32LE(d.length, 4); return Buffer.concat([c, d, d.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
  const vp8l = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64').subarray(12);
  const vp8x = Buffer.from('0c000000000000', 'hex'); // marcas EXIF (0x08) e XMP (0x04); 1 × 1
  const corpoWebp = Buffer.concat([chunk('VP8X', Buffer.concat([vp8x.subarray(0, 4), Buffer.alloc(6)])), vp8l, chunk('EXIF', tiff), chunk('XMP ', Buffer.from('<x:xmpmeta/>'))]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), corpoWebp]);
  webp.writeUInt32LE(webp.length - 8, 4);
  const rw = await pedirJson('/api/painel/aviso', { titulo: 'WebP com EXIF', publico: 'mim', foto: webp.toString('base64') }, chefe);
  const gw = Buffer.from(await (await fetch(base + '/api/avisos/foto/' + rw.foto)).arrayBuffer());
  ok(rw.status === 200 && !gw.includes('EXIF') && !gw.includes('XMP ') && !gw.includes(tiff) && gw.readUInt32LE(4) === gw.length - 8 && (gw[20] & 0x0c) === 0,
    'WebP com EXIF: a foto guardada sai sem os chunks EXIF e XMP, com o tamanho do RIFF e as marcas do VP8X certos');
  const quebrado = Buffer.concat([jpegMinimo.subarray(0, 20), Buffer.from([0xff, 0xe1, 0xff, 0xff, 1, 2, 3])]);
  ok((await pedirJson('/api/painel/aviso', { titulo: 'Quebrada', publico: 'mim', foto: quebrado.toString('base64') }, chefe)).status === 400,
    'a foto que não dá para ler com segurança (segmento maior que o arquivo) é recusada');
}
ok((await pedirJson('/api/painel/aviso', { titulo: 'x'.repeat(51), publico: 'mim' }, chefe)).status === 400, 'recusa título com mais de 50 caracteres');
ok((await pedirJson('/api/painel/aviso', { titulo: '', publico: 'mim' }, chefe)).status === 400, 'recusa aviso sem título');

// ---------- Todos, com o silêncio da noite ----------
const fotoTodos = CHROME && existsSync(CHROME) ? bytes : jpegMinimo;
const todos = await pedirJson('/api/painel/aviso', { titulo: 'Retiro de jovens', texto: 'Inscrições abertas até sexta.', destino: 'celula', publico: 'todos', foto: fotoTodos.toString('base64') }, chefe);
ok(todos.status === 200 && todos.pessoas === 5 && todos.push === 2 && todos.adiados === 1,
  '"Todos": 5 no sino, 2 no celular agora e 1 adiado pelo silêncio (' + [todos.pessoas, todos.push, todos.adiados].join(', ') + ')');
const [paraAna] = await esperarAvisos(cel.ana, 1);
const doChefe = await esperarAvisos(cel.chefe, CHROME && existsSync(CHROME) ? 2 : 2);
ok(paraAna && paraAna.titulo === 'Retiro de jovens' && /#\/celula$/.test(paraAna.url) && /\/api\/avisos\/foto\//.test(paraAna.image || ''),
  'a Ana (inscrita, de dia) recebe o push com image e url');
ok(doChefe.some((m) => m.titulo === 'Retiro de jovens'), 'o administrador, que também é uma das contas, recebe');
await dormir(300);
ok(avisosDe(cel.bento).length === 0, 'o Bento, que desligou todos os avisos, não recebe push');
ok(avisosDe(cel.kenji).length === 0, 'o Kenji (meia-noite em Tóquio) ainda não recebe push');
const noSino = async (ck) => ((await pedirJson('/api/avisos', null, ck)).avisos || []).find((a) => a.titulo === 'Retiro de jovens');
ok((await noSino(bento)) && (await noSino(kenji)) && (await noSino(ana)), 'mas todos têm o aviso no sino na hora, com a foto');
// 05h em Tóquio (17h em SP): ainda silêncio. 07h05 em Tóquio (19h05 em SP): sai.
await pedirJson('/api/notificacoes/rodada', { agora: emSP('17:00') });
await dormir(300);
ok(avisosDe(cel.kenji).length === 0, 'a rodada das 5h de Tóquio ainda segura o push');
await pedirJson('/api/notificacoes/rodada', { agora: emSP('19:05') });
const [paraKenji] = await esperarAvisos(cel.kenji, 1);
ok(paraKenji && paraKenji.titulo === 'Retiro de jovens' && paraKenji.image && /#\/celula$/.test(paraKenji.url),
  'a primeira rodada depois das 7h em Tóquio entrega o push pendente, com image e url');
await pedirJson('/api/notificacoes/rodada', { agora: emSP('19:10') });
await dormir(300);
ok(avisosDe(cel.kenji).length === 1, 'e não repete na rodada seguinte');
ok(avisosDe(cel.bento).length === 0, 'o Bento continua sem push');

// ---------- um aviso para todos por dia ----------
const segundo = await pedirJson('/api/painel/aviso', { titulo: 'Mais um', publico: 'todos' }, chefe);
ok(segundo.status === 409 && segundo.precisaConfirmar === true, 'o segundo aviso para todos no dia pede confirmar de novo (409)');
const confirmado = await pedirJson('/api/painel/aviso', { titulo: 'Mais um', publico: 'todos', denovo: true }, chefe);
ok(confirmado.status === 200 && confirmado.pessoas === 5, 'confirmado de novo, ele sai');
const soParaMim = await pedirJson('/api/painel/aviso', { titulo: 'Teste livre', publico: 'mim' }, chefe);
ok(soParaMim.status === 200, '"Só para mim" continua livre');
ok((await pedirJson('/api/painel/aviso', null, chefe)).paraTodosHoje === 2, 'a tela mostra que já saíram 2 para todos hoje');

// ---------- agendar ----------
console.log('\n  Aviso agendado\n');
const agendar = (corpo, ck = chefe) => pedirJson('/api/painel/aviso', { publico: 'mim', ...corpo }, ck);
const agendadosDe = async () => (await pedirJson('/api/painel/aviso', null, chefe));
const pushDoChefe = (titulo) => avisosDe(cel.chefe).filter((m) => m.titulo === titulo);
// sem navegador, o "Ensaio do louvor" nasce aqui
if (!(await agendadosDe()).agendados.some((a) => a.titulo === 'Ensaio do louvor')) await agendar({ titulo: 'Ensaio do louvor', quando: diaMais(3) + 'T10:00' });

ok((await agendar({ titulo: 'Oi', quando: diaMais(1) + 'T10:00' }, ana)).status === 403, 'quem não é administrador recebe 403 ao agendar');
ok((await pedirJson('/api/painel/aviso/cancelar', { id: 'x' }, ana)).status === 403, 'e ao cancelar');
ok((await agendar({ titulo: 'Atrasado', quando: hojeSP + 'T11:00' })).status === 400, 'data no passado (11h, com o relógio ao meio-dia) é recusada');
ok((await agendar({ titulo: 'Longe', quando: diaMais(31) + 'T10:00' })).status === 400, 'mais de 30 dias à frente é recusado');
ok((await agendar({ titulo: 'Torto', quando: '2026-02-31T10:00' })).status === 400, 'dia que não existe é recusado');
// O Date.UTC aceitava o excesso em silêncio ("dia 32" virava o dia 1 do mês seguinte, "34h"
// virava 10h do dia seguinte) e o teto do dia era conferido no dia errado.
{
  const [ano, mes] = hojeSP.split('-').map(Number);
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const diaDemais = await agendar({ titulo: 'Torto', quando: hojeSP.slice(0, 8) + String(ultimo + 1) + 'T10:00' });
  ok(diaDemais.status === 400 && /não existe/.test(diaDemais.erro || ''), 'dia além do último do mês é recusado com o motivo (' + diaDemais.status + ', ' + diaDemais.erro + ')');
  const horaDemais = await agendar({ titulo: 'Torto', quando: diaMais(1) + 'T34:00' });
  ok(horaDemais.status === 400 && /hora/.test(horaDemais.erro || ''), 'hora 34 é recusada (' + horaDemais.status + ', ' + horaDemais.erro + ')');
  const minutoDemais = await agendar({ titulo: 'Torto', quando: diaMais(1) + 'T10:75' });
  ok(minutoDemais.status === 400 && /minutos/.test(minutoDemais.erro || ''), 'minuto 75 é recusado (' + minutoDemais.status + ')');
  const mesDemais = await agendar({ titulo: 'Torto', quando: ano + '-13-01T10:00' });
  ok(mesDemais.status === 400 && /mês/.test(mesDemais.erro || ''), 'mês 13 é recusado (' + mesDemais.status + ')');
}

const fotoA = (CHROME && existsSync(CHROME) ? bytes : jpegMinimo).toString('base64');
const a = await agendar({ titulo: 'Aviso das 15h', texto: 'Agendado.', destino: 'biblia', quando: hojeSP + 'T15:00', foto: fotoA });
ok(a.status === 200 && a.agendado && a.agendado.quando === hojeSP + 'T15:00' && a.foto, 'agendar "só para mim" para hoje às 15h, com foto');
ok((await fetch(base + '/api/avisos/foto/' + a.foto)).status === 200, 'a foto do agendado já fica guardada');
const lista = await agendadosDe();
ok(lista.agendados.some((x) => x.titulo === 'Aviso das 15h' && x.quando === hojeSP + 'T15:00' && x.publico === 'mim' && x.foto),
  'a lista "Agendados" mostra título, para quem e a hora');
ok(!(await pedirJson('/api/avisos', null, chefe)).avisos.some((x) => x.titulo === 'Aviso das 15h'), 'antes da hora, nada no sino');
await pedirJson('/api/notificacoes/rodada', { agora: emSP('14:59') });
await dormir(300);
ok(pushDoChefe('Aviso das 15h').length === 0, 'a rodada das 14h59 não manda');
await pedirJson('/api/notificacoes/rodada', { agora: emSP('15:00') });
for (let t = 0; t < 3000 && !pushDoChefe('Aviso das 15h').length; t += 100) await dormir(100);
const [m15] = pushDoChefe('Aviso das 15h');
ok(m15 && /#\/biblia$/.test(m15.url) && /\/api\/avisos\/foto\//.test(m15.image || ''), 'a rodada das 15h manda, com image e url');
ok((await pedirJson('/api/avisos', null, chefe)).avisos.some((x) => x.titulo === 'Aviso das 15h' && x.foto === a.foto), 'e o item entra no sino, com a foto');
await pedirJson('/api/notificacoes/rodada', { agora: emSP('15:01') });
await pedirJson('/api/notificacoes/rodada', { agora: emSP('15:30') });
await dormir(300);
ok(pushDoChefe('Aviso das 15h').length === 1 && (await pedirJson('/api/avisos', null, chefe)).avisos.filter((x) => x.titulo === 'Aviso das 15h').length === 1,
  'as rodadas seguintes não repetem');
const depois15 = await agendadosDe();
ok(!depois15.agendados.some((x) => x.titulo === 'Aviso das 15h') && depois15.agendadosAntes.some((x) => x.titulo === 'Aviso das 15h' && x.estado === 'enviado'),
  'sai da fila e aparece como enviado');

// Para todos amanhã às 10h30 (22h30 em Tóquio: silêncio para o Kenji); um segundo no mesmo dia pede confirmar de novo.
const D1 = diaMais(1);
const D2 = diaMais(2);
const b = await agendar({ titulo: 'Bom dia, igreja', destino: 'inicio', publico: 'todos', quando: D1 + 'T10:30', foto: fotoA });
ok(b.status === 200, 'agendar para todos amanhã às 10h30');
const c1 = await agendar({ titulo: 'Segundo do dia', publico: 'todos', quando: D1 + 'T10:35' });
ok(c1.status === 409 && c1.precisaConfirmar, 'um segundo para todos no mesmo dia pede confirmar de novo (409)');
ok((await agendar({ titulo: 'Segundo do dia', publico: 'todos', quando: D1 + 'T10:35', denovo: true })).status === 200, 'confirmado, ele entra na fila');
ok((await agendar({ titulo: 'Perdido', quando: D2 + 'T01:00' })).status === 200, 'agendar um para depois de amanhã à 1h');

// ---------- reinício ----------
await derrubar();
await subir();
const aposReinicio = await agendadosDe();
ok(['Bom dia, igreja', 'Segundo do dia', 'Perdido', 'Ensaio do louvor'].every((t) => aposReinicio.agendados.some((x) => x.titulo === t)),
  'depois de reiniciar o servidor, os agendados continuam na fila');

// ---------- cancelar ----------
const ensaio = aposReinicio.agendados.find((x) => x.titulo === 'Ensaio do louvor');
ok((await pedirJson('/api/painel/aviso/cancelar', { id: ensaio.id }, chefe)).status === 200, 'cancelar um agendado');
ok((await pedirJson('/api/painel/aviso/cancelar', { id: ensaio.id }, chefe)).status === 404, 'cancelar de novo: 404, já não está na fila');
const aposCancelar = await agendadosDe();
ok(!aposCancelar.agendados.some((x) => x.id === ensaio.id) && aposCancelar.agendadosAntes.some((x) => x.id === ensaio.id && x.estado === 'cancelado'),
  'ele sai da fila e aparece como cancelado');
const emDia = (dia, hora) => new Date(dia + 'T' + hora + ':00-03:00').toISOString();
const rodada = (dia, hora) => pedirJson('/api/notificacoes/rodada', { agora: emDia(dia, hora) });
const esperarTitulo = async (ap, titulo, n = 1) => {
  for (let t = 0; t < 3000 && avisosDe(ap).filter((m) => m.titulo === titulo).length < n; t += 100) await dormir(100);
  return avisosDe(ap).filter((m) => m.titulo === titulo);
};

// ---------- amanhã: a hora dos agendados para todos ----------
await rodada(D1, '10:29');
await dormir(300);
ok((await esperarTitulo(cel.ana, 'Bom dia, igreja', 1)).length === 0, 'amanhã às 10h29, o "para todos" ainda não saiu');
await rodada(D1, '10:30');
const [bomAna] = await esperarTitulo(cel.ana, 'Bom dia, igreja');
ok(bomAna && /\/api\/avisos\/foto\//.test(bomAna.image || '') && /#\/$/.test(bomAna.url), 'às 10h30 chega aos inscritos (Ana), com image e url');
ok((await esperarTitulo(cel.chefe, 'Bom dia, igreja')).length === 1, 'e ao administrador');
await dormir(300);
ok((await esperarTitulo(cel.kenji, 'Bom dia, igreja', 1)).length === 0, 'Kenji (22h30 em Tóquio, silêncio) fica com o push pendente');
ok(avisosDe(cel.bento).every((m) => m.titulo !== 'Bom dia, igreja'), 'Bento (tudo desligado) não recebe push');
const sinoTem = async (ck, titulo) => ((await pedirJson('/api/avisos', null, ck)).avisos || []).some((x) => x.titulo === titulo && x.foto);
ok((await sinoTem(bento, 'Bom dia, igreja')) && (await sinoTem(kenji, 'Bom dia, igreja')), 'mas todos têm o item no sino, com a foto');
await rodada(D1, '10:35');
ok((await esperarTitulo(cel.ana, 'Segundo do dia')).length === 1, 'o segundo do dia, confirmado de novo, sai às 10h35');
await rodada(D1, '19:05');
ok((await esperarTitulo(cel.kenji, 'Bom dia, igreja')).length === 1, 'às 7h05 em Tóquio o Kenji recebe o push pendente');
await rodada(D1, '19:10');
await dormir(300);
ok(avisosDe(cel.kenji).filter((m) => m.titulo === 'Bom dia, igreja').length === 1 && avisosDe(cel.ana).filter((m) => m.titulo === 'Bom dia, igreja').length === 1,
  'ninguém recebe duas vezes');

// ---------- servidor fora por mais de 12h ----------
await rodada(D2, '14:00');
await dormir(300);
ok(pushDoChefe('Perdido').length === 0, 'servidor de volta 13h depois da hora: o agendado não sai');
ok((await agendadosDe()).agendadosAntes.some((x) => x.titulo === 'Perdido' && x.estado === 'perdido'), 'e aparece como "perdido" na lista');

// ---------- o cancelado ----------
await rodada(diaMais(3), '10:00');
await dormir(300);
ok(pushDoChefe('Ensaio do louvor').length === 0, 'o cancelado não sai na hora dele');

// ---------- o teto de um aviso para todos por dia, sem furos ----------
console.log('\n  Um aviso para todos por dia\n');
const D5 = diaMais(5);
const D6 = diaMais(6);
const D7 = diaMais(7);
const D8 = diaMais(8);
const estadoDe = async (titulo) => ((await agendadosDe()).agendadosAntes.find((x) => x.titulo === titulo) || {}).estado;
relogio = emDia(D5, '09:00');
await derrubar();
await subir();
// Dois "Todos" ao mesmo tempo num dia sem nenhum: só um passa sem confirmar.
const juntos = await Promise.all(['Junto 1', 'Junto 2'].map((titulo) => pedirJson('/api/painel/aviso', { titulo, publico: 'todos' }, chefe)));
ok(juntos.filter((r) => r.status === 200).length === 1 && juntos.filter((r) => r.status === 409).length === 1,
  'dois envios para todos ao mesmo tempo: um sai, o outro pede confirmar (' + juntos.map((r) => r.status).join(', ') + ')');

// B agendado para as 18h; depois A para as 10h do mesmo dia, com o 409 confirmado: os dois saem.
ok((await agendar({ titulo: 'B das 18h', publico: 'todos', quando: D6 + 'T18:00' })).status === 200, 'B, para todos, agendado para as 18h');
const aSemConfirmar = await agendar({ titulo: 'A das 10h', publico: 'todos', quando: D6 + 'T10:00' });
ok(aSemConfirmar.status === 409, 'A, para as 10h do mesmo dia, pede confirmar');
ok((await agendar({ titulo: 'A das 10h', publico: 'todos', quando: D6 + 'T10:00', denovo: true })).status === 200, 'A confirmado');
await rodada(D6, '10:00');
ok((await esperarTitulo(cel.ana, 'A das 10h')).length === 1, 'A sai às 10h');
await rodada(D6, '18:00');
ok((await esperarTitulo(cel.ana, 'B das 18h')).length === 1, 'e B também sai às 18h (o teto não é refeito contra o que o administrador confirmou)');
for (let t = 0; t < 3000 && (await estadoDe('B das 18h')) !== 'enviado'; t += 100) await dormir(100);
ok((await estadoDe('B das 18h')) === 'enviado', 'B aparece como enviado');

// "Enviar agora" num dia que já tem um agendado para todos: pede confirmar; confirmado, os dois saem.
relogio = emDia(D7, '09:00');
await derrubar();
await subir();
ok((await agendar({ titulo: 'Agendado do dia', publico: 'todos', quando: D7 + 'T18:00' })).status === 200, 'um para todos agendado para hoje às 18h');
const agoraSemConfirmar = await pedirJson('/api/painel/aviso', { titulo: 'Agora do dia', publico: 'todos' }, chefe);
ok(agoraSemConfirmar.status === 409 && agoraSemConfirmar.precisaConfirmar && /agendado hoje/.test(agoraSemConfirmar.erro || ''),
  '"enviar agora" para todos conta o agendado de hoje e pede confirmar (' + agoraSemConfirmar.status + ', ' + agoraSemConfirmar.erro + ')');
ok((await pedirJson('/api/painel/aviso', { titulo: 'Agora do dia', publico: 'todos', denovo: true }, chefe)).status === 200, 'confirmado, sai agora');
await rodada(D7, '18:00');
ok((await esperarTitulo(cel.ana, 'Agendado do dia')).length === 1, 'e o agendado também sai na hora dele');

// ---------- o agendado para todos não segura a rodada ----------
console.log('\n  Agendado com o push lento\n');
ok((await agendar({ titulo: 'Lento', publico: 'todos', quando: D8 + 'T10:00' })).status === 200, 'um para todos amanhã às 10h');
// uma rodada antes, para o push pendente do Kenji (silêncio da noite) sair e não entrar na conta
await rodada(D8, '09:59');
await dormir(300);
atrasoPush = 1500;
const antes = Date.now();
await rodada(D8, '10:00');
const levou = Date.now() - antes;
ok(levou < 1000, 'com o serviço de push levando 1,5 s por aparelho, a rodada volta sem esperar o envio (' + levou + ' ms)');
ok((await estadoDe('Lento')) === 'enviando', 'enquanto o push sai, ele fica "enviando"');
ok((await esperarTitulo(cel.ana, 'Lento')).length === 1, 'o push chega');
for (let t = 0; t < 6000 && (await estadoDe('Lento')) !== 'enviado'; t += 100) await dormir(100);
ok((await estadoDe('Lento')) === 'enviado', 'e, no fim, vira "enviado"');
// O servidor cai no meio do envio: na volta, "interrompido" (não "enviado", não sai de novo).
ok((await agendar({ titulo: 'Caiu no meio', publico: 'todos', quando: D8 + 'T11:00', denovo: true })).status === 200, 'outro para as 11h (confirmado)');
atrasoPush = 8000;
await rodada(D8, '11:00');
await dormir(300);
await derrubar();
atrasoPush = 0;
await subir();
ok((await estadoDe('Caiu no meio')) === 'interrompido', 'o servidor caiu durante o push: na volta, ele aparece como interrompido (' + (await estadoDe('Caiu no meio')) + ')');

encerrar();
try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'tudo certo') + '\n');
process.exit(falhas ? 1 : 0);
