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
const recebidos = [];
const push = createServer((req, res) => {
  const partes = [];
  req.on('data', (p) => partes.push(p));
  req.on('end', () => { recebidos.push({ caminho: req.url, corpo: Buffer.concat(partes) }); res.writeHead(201).end(); });
});
await new Promise((r) => push.listen(PORTA_PUSH, '127.0.0.1', r));

const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_PUSH_TESTE: '1', CAMINHO_RELOGIO: emSP('12:00'), CAMINHO_ABERTO: '', CAMINHO_ADMIN: 'chefe' },
  stdio: ['ignore', 'ignore', 'inherit'],
});
const base = 'http://127.0.0.1:' + PORTA;
let nav = null;
let perfil = '';
const encerrar = () => {
  try { servidor.kill(); } catch { /* já saiu */ }
  push.close();
  if (nav) fecharArvore(nav, perfil);
};
process.on('exit', encerrar);
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

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

encerrar();
try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'tudo certo') + '\n');
process.exit(falhas ? 1 : 0);
