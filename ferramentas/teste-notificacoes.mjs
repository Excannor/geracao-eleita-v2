// Confere as notificações de ponta a ponta, com um serviço de push falso em 127.0.0.1:
// o servidor inscreve o aparelho, criptografa, assina e manda; o teste decifra do jeito
// que o celular decifraria. Cobre o toque sem flood, os tetos, as preferências, a rodada
// dos lembretes num horário escolhido, o aparelho que sumiu e a conta apagada.
// Uso: node ferramentas/teste-notificacoes.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createECDH, createHmac, createDecipheriv, randomBytes } from 'node:crypto';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8213;
const PORTA_PUSH = PORTA + 1;
const PASTA = join(tmpdir(), 'cc-notificacoes');
const FUSO = 'America/Sao_Paulo';
const { TEXTOS } = await import(pathToFileURL(join(AQUI, 'notificacoes.mjs')).href);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// "Hoje" em São Paulo, e um relógio fixo ao meio-dia desse dia: os avisos sociais
// respeitam o silêncio da noite, e o teste não pode depender da hora em que roda.
const hojeSP = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const emSP = (hora) => new Date(hojeSP + 'T' + hora + ':00-03:00').toISOString();

// ---------- serviço de push falso ----------
const recebidos = [];
const push = createServer((req, res) => {
  const partes = [];
  req.on('data', (p) => partes.push(p));
  req.on('end', () => {
    recebidos.push({ caminho: req.url, cabecalhos: req.headers, corpo: Buffer.concat(partes) });
    res.writeHead(req.url.startsWith('/sumiu') ? 410 : 201).end();
  });
});
await new Promise((r) => push.listen(PORTA_PUSH, '127.0.0.1', r));

try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_PUSH_TESTE: '1', CAMINHO_RELOGIO: emSP('12:00'), CAMINHO_ABERTO: '' },
  stdio: ['ignore', 'ignore', 'inherit'],
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const pedir = (rota, corpo, cookie, metodo) => fetch(base + rota, {
  method: metodo || (corpo ? 'POST' : 'GET'),
  headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const pedirJson = async (...a) => { const r = await pedir(...a); return { status: r.status, ...(await r.json().catch(() => ({}))) }; };

async function criar(usuario, nome) {
  const r = await pedir('/api/criar-conta', { usuario, senha: 'senha-boa-1', nome, email: usuario + '@teste.com', nascimento: '2000-01-01', fuso: FUSO, consentimento: true });
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const ler = (cookie) => pedir('/api/estado', { atualizadoEm: Date.now(), lidos: [1], marcadoEm: { 1: hojeSP }, licoes: [], anotacoes: {}, oia: {} }, cookie, 'PUT');

// Um "celular": par de chaves e segredo próprios, e o endereço no serviço falso.
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
const esperarPush = async (ap, quantos, ms = 3000) => {
  for (let t = 0; t < ms; t += 100) { if (doAparelho(ap).length >= quantos) break; await dormir(100); }
  return doAparelho(ap);
};

console.log('\n  Notificações de ponta a ponta\n');

const ana = await criar('ana', 'Ana Clara');
const bento = await criar('bento', 'Bento');
const celAna = aparelho('ana');
const celBento = aparelho('bento');

// ---------- inscrever ----------
const antes = await pedirJson('/api/notificacoes', null, bento);
ok(antes.status === 200 && Buffer.from(antes.chave || '', 'base64url').length === 65, 'o servidor entrega a chave pública do push');
ok(antes.preferencias && antes.preferencias.lembrete === true && antes.preferencias.hora === '19:00' && antes.aparelhos.length === 0,
  'começa com lembrete às 19h e nenhum aparelho');
ok((await pedir('/api/notificacoes')).status === 401, 'sem entrar, nada de notificações');
ok((await pedirJson('/api/notificacoes/inscrever', { inscricao: { ...celBento.inscricao, endpoint: 'https://192.168.1.1/x' } }, bento)).status === 400,
  'recusa inscrição que aponta para a rede de casa');
ok((await pedirJson('/api/notificacoes/inscrever', { inscricao: celBento.inscricao }, bento)).status === 200, 'o celular do Bento se inscreve');
await pedirJson('/api/notificacoes/inscrever', { inscricao: celAna.inscricao }, ana);
ok((await pedirJson('/api/notificacoes', null, bento)).aparelhos.includes(celBento.inscricao.endpoint), 'o servidor lembra do aparelho');

// ---------- teste ----------
ok((await pedirJson('/api/notificacoes/testar', {}, bento)).enviados === 1, 'mandar uma de teste chega a 1 aparelho');
const [teste] = await esperarPush(celBento, 1);
const cab = (recebidos.find((r) => r.caminho === '/bento') || {}).cabecalhos || {};
ok(cab['content-encoding'] === 'aes128gcm' && /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/.test(cab.authorization || '') && Number(cab.ttl) > 0,
  'o push sai criptografado (aes128gcm), assinado (VAPID) e com validade');
ok(teste && TEXTOS.teste.some(([t]) => t === teste.titulo) && teste.url, 'o celular decifra a notificação de teste: "' + (teste && teste.titulo) + '"');

// ---------- amizade: convite aceito ----------
const convite = await pedirJson('/api/convites', {}, ana);
await pedirJson('/api/convites/aceitar', { token: new URL(convite.link).searchParams.get('convite') }, bento);
const daAna = await esperarPush(celAna, 1);
ok(daAna.some((m) => /Bento/.test(m.titulo + m.corpo) && TEXTOS.aceito.some(([t]) => t.replace('{amigo}', 'Bento') === m.titulo) && /amigos/.test(m.url)), 'quem convidou é avisado quando o convite é aceito');

// ---------- Notificar: um por amigo por dia ----------
await ler(ana);
await dormir(200);
const antesDoToque = doAparelho(celBento).length;
const toque = await pedirJson('/api/toques', { para: 'bento' }, ana);
ok(toque.resultado === 'enviado', 'a Ana leu e notifica o Bento, que ainda não leu');
const aposToque = await esperarPush(celBento, antesDoToque + 1);
const msgToque = aposToque[aposToque.length - 1];
ok(msgToque && /Ana/.test(msgToque.titulo + msgToque.corpo) && !/Clara/.test(msgToque.titulo + msgToque.corpo) && msgToque.tag === 'toque', 'o Bento recebe o toque com o primeiro nome da Ana');
// Decisão do dono (01/10): todo toque vira notificação no celular de quem recebe. O segundo
// toque do mesmo amigo no dia não conta de novo (resultado "ja"), mas chega no celular.
const denovo = await pedirJson('/api/toques', { para: 'bento' }, ana);
const aposDenovo = await esperarPush(celBento, antesDoToque + 2);
ok(denovo.resultado === 'ja' && aposDenovo.length === antesDoToque + 2,
  'notificar de novo no mesmo dia não conta outro toque, mas chega no celular');

// ---------- teto de quem recebe e preferências ----------
const outros = [];
for (const [u, nome] of [['carla', 'Carla'], ['davi', 'Davi'], ['eva', 'Eva'], ['fabio', 'Fábio']]) {
  const c = await criar(u, nome);
  const cv = await pedirJson('/api/convites', {}, c);
  await pedirJson('/api/convites/aceitar', { token: new URL(cv.link).searchParams.get('convite') }, bento);
  await ler(c);
  outros.push(c);
}
await dormir(300);
let n = doAparelho(celBento).length;
await pedirJson('/api/toques', { para: 'bento' }, outros[0]);
const segundo = await esperarPush(celBento, n + 1);
ok(segundo.length === n + 1 && /Carla e mais \d/.test(segundo[segundo.length - 1].titulo + segundo[segundo.length - 1].corpo), 'o toque seguinte do dia vem agrupado: "Carla e mais N"');

await pedirJson('/api/notificacoes/preferencias', { amigos: false }, bento);
n = doAparelho(celBento).length;
ok((await pedirJson('/api/toques', { para: 'bento' }, outros[1])).resultado === 'enviado', 'o Davi consegue notificar pelo app');
const comAmigosDesligado = await esperarPush(celBento, n + 1);
ok(comAmigosDesligado.length === n + 1, 'com "Amigos" desligado, o toque ainda vira notificação (todo toque chega)');

await pedirJson('/api/notificacoes/preferencias', { amigos: true }, bento);
await pedirJson('/api/toques', { para: 'bento' }, outros[2]);
const terceiro = await esperarPush(celBento, n + 1);
ok(terceiro.length === n + 1, 'religado, o toque volta a chegar');
n = doAparelho(celBento).length;
await pedirJson('/api/toques', { para: 'bento' }, outros[3]);
const semTeto = await esperarPush(celBento, n + 1);
ok(semTeto.length === n + 1, 'toque não tem teto diário para quem recebe');

// ---------- preferências ----------
const pref = await pedirJson('/api/notificacoes/preferencias', { hora: '20:30', ofensiva: false, lembrete: 'sim', invasao: true }, bento);
ok(pref.preferencias && pref.preferencias.hora === '20:30' && pref.preferencias.ofensiva === false && pref.preferencias.lembrete === true && !('invasao' in pref.preferencias),
  'as preferências só aceitam o que existe, com o tipo certo');
ok((await pedirJson('/api/notificacoes/preferencias', { hora: '03:00' }, bento)).preferencias.hora === '20:30', 'horário de madrugada é recusado');

// ---------- rodada dos lembretes ----------
const rodada = async (hora) => (await pedirJson('/api/notificacoes/rodada', { agora: emSP(hora) })).saiu || [];
// Às 8h nenhum dos três horários (9h, 12h e o escolhido) chegou ainda.
ok((await rodada('08:00')).length === 0, 'antes das 9h, nenhum lembrete');
// Às 9h sai o da manhã; o horário escolhido (20h30) continua valendo para o da noite.
ok((await rodada('09:00')).some((s) => s.usuario === 'bento' && s.tipo === 'lembrete'), 'às 9h sai o lembrete da manhã');
n = doAparelho(celBento).length;
const as2030 = await rodada('20:30');
ok(as2030.some((s) => s.usuario === 'bento' && s.tipo === 'lembrete'), 'às 20h30 sai o lembrete do Bento');
ok(!as2030.some((s) => s.usuario === 'ana'), 'a Ana, que já leu, não recebe lembrete');
const lembrete = await esperarPush(celBento, n + 1);
ok(lembrete.length === n + 1 && lembrete[lembrete.length - 1].tag === 'lembrete', 'o lembrete chega ao celular do Bento: "' + ((lembrete[lembrete.length - 1] || {}).titulo || '') + '"');
ok((await rodada('20:45')).length === 0, 'a rodada seguinte não repete o lembrete');
ok((await rodada('23:00')).length === 0, 'às 23h, silêncio');

// ---------- aparelho que sumiu ----------
const velho = aparelho('sumiu');
await pedirJson('/api/notificacoes/inscrever', { inscricao: velho.inscricao }, bento);
await pedirJson('/api/notificacoes/testar', {}, bento);
await dormir(500);
const depois = await pedirJson('/api/notificacoes', null, bento);
ok(!depois.aparelhos.includes(velho.inscricao.endpoint) && depois.aparelhos.includes(celBento.inscricao.endpoint),
  'o aparelho que o serviço diz não existir mais (410) sai da lista; os outros ficam');

// ---------- cancelar e apagar conta ----------
await pedirJson('/api/notificacoes/cancelar', { endpoint: celAna.inscricao.endpoint }, ana);
ok((await pedirJson('/api/notificacoes', null, ana)).aparelhos.length === 0, 'desativar tira o aparelho da lista');
await pedirJson('/api/notificacoes/inscrever', { inscricao: aparelho('carla').inscricao }, outros[0]);
await pedirJson('/api/apagar-conta', { senha: 'senha-boa-1' }, outros[0]);
const { DatabaseSync } = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);
const bancoPush = new DatabaseSync(join(PASTA, 'caminho.db'));
const guardado = JSON.stringify(['push_inscricoes', 'push_preferencias', 'push_historico'].map((t) => bancoPush.prepare('SELECT * FROM ' + t).all()));
bancoPush.close();
ok(!guardado.includes('"carla"') && !guardado.includes('/carla'), 'apagar a conta leva junto os aparelhos e as preferências');
ok(readFileSync(join(PASTA, 'push.chave'), 'utf8').includes('"privada"'), 'a chave do push fica em dados/, fora da imagem');

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  as notificações funcionam de ponta a ponta\n');
try { servidor.kill(); } catch { /* ok */ }
push.close();
process.exit(falhas ? 1 : 0);
