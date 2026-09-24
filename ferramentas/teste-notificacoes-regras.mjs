// Confere o núcleo das notificações sem rede nenhuma: a criptografia contra o vetor
// oficial da RFC 8291, a ida e volta com chaves novas, a assinatura VAPID, a lista de
// serviços permitidos, as regras de horário e limite, e o tom das mensagens.
// Uso: node ferramentas/teste-notificacoes-regras.mjs
import { createECDH, createHmac, createDecipheriv, createPublicKey, verify, randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const N = await import(pathToFileURL(join(AQUI, 'notificacoes.mjs')).href);

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

console.log('\n  Notificações: criptografia, regras e mensagens\n');

// ---------- RFC 8291, apêndice A ----------
const V = {
  texto: 'When I grow up, I want to be a watermelon',
  asPrivada: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublica: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  uaPrivada: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  sal: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  corpo: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};
const doVetor = N.criptografar(V.texto, V.uaPublica, V.auth, { sal: V.sal, privadaServidor: V.asPrivada });
ok(doVetor.toString('base64url') === V.corpo, 'a criptografia bate byte a byte com o vetor da RFC 8291');

// ---------- ida e volta, do jeito que o celular decifra ----------
const hmac = (k, d) => createHmac('sha256', k).update(d).digest();
function decifrar(corpo, ua, auth) {
  const sal = corpo.subarray(0, 16);
  const tamanhoId = corpo[20];
  const doServidor = corpo.subarray(21, 21 + tamanhoId);
  const cifrado = corpo.subarray(21 + tamanhoId);
  const prkChave = hmac(auth, ua.computeSecret(doServidor));
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), doServidor]);
  const prk = hmac(sal, hmac(prkChave, Buffer.concat([info, Buffer.from([1])])));
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const d = createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(cifrado.subarray(-16));
  const claro = Buffer.concat([d.update(cifrado.subarray(0, -16)), d.final()]);
  let fim = claro.length - 1;
  while (fim >= 0 && claro[fim] === 0) fim--;
  return claro.subarray(0, fim).toString('utf8');
}
const uaVetor = createECDH('prime256v1');
uaVetor.setPrivateKey(Buffer.from(V.uaPrivada, 'base64url'));
ok(decifrar(Buffer.from(V.corpo, 'base64url'), uaVetor, Buffer.from(V.auth, 'base64url')) === V.texto,
  'o decifrador do teste abre o vetor da RFC');

const ua = createECDH('prime256v1');
ua.generateKeys();
const auth = randomBytes(16);
const mensagem = JSON.stringify({ titulo: 'Oi 👋 ação', corpo: 'ç ã é' });
const corpo = N.criptografar(mensagem, ua.getPublicKey().toString('base64url'), auth.toString('base64url'));
ok(decifrar(corpo, ua, auth) === mensagem, 'com chaves novas, o celular decifra exatamente o que saiu (acentos e emoji)');
const outraVez = N.criptografar(mensagem, ua.getPublicKey().toString('base64url'), auth.toString('base64url'));
ok(!corpo.equals(outraVez), 'duas mensagens iguais saem com bytes diferentes (sal e chave novos a cada envio)');

// ---------- VAPID ----------
const chaves = N.gerarChaves();
const cabecalho = N.autorizacaoVapid('https://fcm.googleapis.com/fcm/send/abc', chaves, 'https://ccc.off-sec.net', Date.parse('2026-09-15T12:00:00Z'));
const [, token, k] = cabecalho.match(/^vapid t=([^,]+), k=(.+)$/) || [];
const [c64, p64, a64] = (token || '').split('.');
const claims = JSON.parse(Buffer.from(p64 || '', 'base64url').toString() || '{}');
ok(k === chaves.publica && claims.aud === 'https://fcm.googleapis.com' && claims.sub === 'https://ccc.off-sec.net',
  'o VAPID leva a chave pública, o serviço de destino e o contato do app');
ok(claims.exp - Date.parse('2026-09-15T12:00:00Z') / 1000 <= 24 * 3600, 'o VAPID vence em menos de 24 horas, como a RFC pede');
const pub = Buffer.from(chaves.publica, 'base64url');
const chavePublica = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url') }, format: 'jwk' });
ok(verify('sha256', Buffer.from(c64 + '.' + p64), { key: chavePublica, dsaEncoding: 'ieee-p1363' }, Buffer.from(a64, 'base64url')),
  'a assinatura VAPID confere com a chave pública');

// ---------- quem pode ser endpoint ----------
const chavesUa = { p256dh: ua.getPublicKey().toString('base64url'), auth: auth.toString('base64url') };
ok(!!N.inscricaoValida({ endpoint: 'https://fcm.googleapis.com/fcm/send/x', keys: chavesUa }), 'aceita o push do Chrome/Android');
ok(!!N.inscricaoValida({ endpoint: 'https://web.push.apple.com/abc', keys: chavesUa }), 'aceita o push do iPhone');
ok(!N.inscricaoValida({ endpoint: 'https://192.168.1.1/admin', keys: chavesUa }), 'recusa endereço da rede de casa (ninguém usa o servidor para bater lá dentro)');
ok(!N.inscricaoValida({ endpoint: 'http://fcm.googleapis.com/x', keys: chavesUa }), 'recusa push sem https');
ok(!N.inscricaoValida({ endpoint: 'https://evil.com.fcm.googleapis.com.evil.com/x', keys: chavesUa }), 'recusa domínio que só imita o do Google');
ok(!N.inscricaoValida({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'abc', auth: 'x' } }), 'recusa chaves de tamanho errado');
ok(!N.inscricaoValida({ endpoint: 'http://127.0.0.1:9/x', keys: chavesUa }) && !!N.inscricaoValida({ endpoint: 'http://127.0.0.1:9/x', keys: chavesUa }, { permitirLocal: true }),
  'endereço local só no modo de teste');

// ---------- regras ----------
const base = (m, extra = {}) => ({
  agora: { data: '2026-09-15', minutos: m },
  pref: { ...N.PREFERENCIAS_PADRAO },
  historico: {},
  leitura: { leuHoje: false, ofensiva: 5, ultimaLeitura: '2026-09-14', escudoOntem: false, criadaEm: '2026-08-01' },
  ...extra,
});
const hm = (h, m = 0) => h * 60 + m;
const tipo = (x) => (N.decidir(x) || {}).tipo || null;

ok(tipo(base(hm(8, 59))) === null, 'antes do primeiro horário (9h), nada');
ok(tipo(base(hm(9))) === 'lembrete', 'às 9h sai o lembrete da manhã');
ok(tipo(base(hm(12))) === 'lembrete', 'ao meio-dia sai o segundo');
ok(tipo(base(hm(12), { historico: { data: '2026-09-15', automaticas: 1, lembrete: '2026-09-15', lembreteMinutos: hm(12) } })) === null,
  'o mesmo horário não sai duas vezes');
ok(tipo(base(hm(19))) === 'lembrete', 'no horário escolhido, o lembrete');
ok(tipo(base(hm(19), { leitura: { ...base(0).leitura, leuHoje: true } })) === null, 'quem já leu hoje não recebe nada');
ok(tipo(base(hm(19, 30), { historico: { data: '2026-09-15', automaticas: 1, lembrete: '2026-09-15', lembreteMinutos: hm(19) } })) === null,
  'o lembrete sai uma vez por dia');
ok(tipo(base(hm(21), { historico: { data: '2026-09-15', automaticas: 1, lembrete: '2026-09-15', lembreteMinutos: hm(19) } })) === 'ofensiva',
  'às 21h, com ofensiva viva e sem leitura, o aviso de ofensiva em risco');
ok(tipo(base(hm(21), { pref: { ...N.PREFERENCIAS_PADRAO, hora: '20:30' }, historico: { data: '2026-09-15', automaticas: 1, lembrete: '2026-09-15', lembreteMinutos: hm(20, 30) } })) === null,
  'o aviso de ofensiva nunca sai colado no lembrete (espera 1h30)');
ok(tipo(base(hm(21), { leitura: { ...base(0).leitura, ofensiva: 1 }, historico: { data: '2026-09-15', automaticas: 1, lembrete: '2026-09-15', lembreteMinutos: hm(19) } })) === null,
  'com 1 dia só, não tem "ofensiva em risco"');
ok(tipo(base(hm(22, 15), { historico: { data: '2026-09-15', automaticas: 2, lembrete: '2026-09-15', ofensiva: '2026-09-15', lembreteMinutos: hm(19) } })) === null,
  'no máximo 2 automáticas por dia');
// Servidor desligado (falta de energia) no horário: quando volta, sai um aviso só, o do período.
const slot = (x) => ((N.decidir(x) || {}).dados || {}).slot;
ok(slot(base(hm(10, 15))) === hm(9), 'voltou às 10h15 sem ter mandado nada: sai o da manhã, atrasado');
ok(slot(base(hm(14))) === hm(12), 'voltou às 14h: sai só o do meio-dia, não o da manhã junto');
ok(slot(base(hm(20))) === hm(19), 'voltou às 20h: sai só o da noite');
const atrasadoManha = { historico: { data: '2026-09-15', automaticas: 1, lembrete: '2026-09-15', lembreteMinutos: hm(11, 50) } };
ok(tipo(base(hm(12), atrasadoManha)) === null && tipo(base(hm(13), atrasadoManha)) === null,
  'o da manhã que saiu às 11h50 cobre o do meio-dia: nada de dois avisos colados');
ok(slot(base(hm(19), atrasadoManha)) === hm(19), 'e o da noite sai normal');
const sumidoAs = (m) => base(m, { leitura: { ...base(0).leitura, ofensiva: 0, ultimaLeitura: '2026-09-10' } });
ok(tipo(sumidoAs(hm(21, 40))) === 'volta', 'quem sumiu: servidor voltou depois do horário, o aviso do dia sai atrasado');
ok(tipo(base(hm(22, 30))) === null && tipo(base(hm(23, 59))) === null && tipo(base(hm(6, 59))) === null,
  'silêncio das 22h30 às 7h, mesmo sem nada ter saído');
ok(tipo(base(hm(19), { pref: { ...N.PREFERENCIAS_PADRAO, lembrete: false, ofensiva: false } })) === null, 'desligado nas configurações, não sai');
ok(tipo(base(hm(9, 30), { leitura: { ...base(0).leitura, escudoOntem: true } })) === 'escudo', 'de manhã, avisa que o escudo cobriu ontem');
ok(tipo(base(hm(9, 30), { leitura: { ...base(0).leitura, escudoOntem: true }, historico: { data: '2026-09-15', automaticas: 1, escudo: '2026-09-15' } })) === null,
  'o recado do escudo sai uma vez');
ok(tipo(base(hm(13), { leitura: { ...base(0).leitura, escudoOntem: true } })) !== 'escudo', 'depois do meio-dia o escudo não é mais novidade');

const sumido = (dias, m = hm(19)) => base(m, { leitura: { ...base(0).leitura, ofensiva: 0, ultimaLeitura: ['2026-09-12', '2026-09-08', '2026-09-01'][[3, 7, 14].indexOf(dias)] || '2026-09-10' } });
ok(tipo(sumido(3)) === 'volta' && tipo(sumido(7)) === 'volta' && tipo(sumido(14)) === 'volta', 'quem sumiu recebe recado no 3º, 7º e 14º dia');
const sumidoHa = (dias, historico = {}, m = hm(19)) => base(m, { historico, leitura: { ...base(0).leitura, ofensiva: 0, ultimaLeitura: new Date(Date.parse('2026-09-15T12:00:00Z') - dias * 864e5).toISOString().slice(0, 10) } });
const sai = (dias, historico) => tipo(sumidoHa(dias, historico)) === 'volta';
ok([3, 4, 5, 6, 7].every((d) => sai(d)), 'na primeira semana sem ler, um aviso por dia');
ok(sai(9) && sai(11) && sai(14) && !sai(10, { volta: '2026-09-14' }) && !sai(12, { volta: '2026-09-14' }), 'da 2ª semana, dia sim, dia não');
ok(sai(21) && sai(30) && !sai(25) && !sai(28), 'depois, semanal (21º e 30º dia)');
ok(sai(45) && sai(60) && sai(90) && !sai(50) && sai(120) && sai(150) && !sai(100), 'e cada vez mais espaçado: 15 em 15 dias até 90, depois todo mês');
const texto = (dias) => N.montarMensagem('volta', { dias }, { usuario: 'x', data: '2026-09-15', nome: 'Ana' });
ok(N.TEXTOS.voltaSaudade.some(([t]) => t === texto(45).titulo || t.replace('{nome}', 'Ana') === texto(45).titulo), 'quem sumiu há muito tempo recebe o "sentimos sua falta"');
ok(N.TEXTOS.voltaValor.some(([t]) => t === texto(9).titulo), 'no 9º dia, o convite de que não precisa correr atrás do atraso');
ok(sai(8) && N.decidir(sumidoHa(8)).dados.dias === 7 && !sai(8, { volta: '2026-09-14' }), 'servidor fora no dia marcado: sai no dia seguinte, uma vez');
ok(!sai(47), 'atraso de mais de um dia espera o próximo da lista');
ok(tipo(sumido(5, hm(12))) === null, 'quem sumiu recebe um só por dia, no horário escolhido, não os três');
ok(tipo(base(hm(19), { historico: { data: '2026-09-15', automaticas: 1, volta: '2026-09-15' }, leitura: { ...base(0).leitura, ofensiva: 0, ultimaLeitura: '2026-09-10' } })) === null,
  'e não repete no mesmo dia');
ok(tipo(base(hm(19), { leitura: { ...base(0).leitura, ofensiva: 0, ultimaLeitura: '2026-08-01' } })) === 'volta', 'no 45º dia ainda sai um aviso (nunca para de vez)');
ok(tipo(base(hm(19), { leitura: { ...base(0).leitura, ofensiva: 0, ultimaLeitura: null, criadaEm: '2026-09-14' } })) === 'lembrete',
  'conta nova que ainda não leu recebe o lembrete nos primeiros dias');

ok(N.horaValida('19:00') && N.horaValida('07:30') && !N.horaValida('23:00') && !N.horaValida('06:00') && !N.horaValida('19:10') && !N.horaValida('x'),
  'o horário do lembrete fica entre 7h e 22h, de meia em meia hora');

// ---------- mensagens ----------
const todas = Object.values(N.TEXTOS).flat(2);
ok(todas.every((s) => !/[—–]/.test(s)), 'nenhuma mensagem usa travessão');
ok(!todas.some((s) => /falhou|decepcion|vergonha|culpa|deveria|obrigação|esqueceu/i.test(s)), 'nenhuma mensagem cobra, culpa ou diz que a pessoa falhou');
const exemplos = [];
for (const [t, d] of [['lembrete', { ofensiva: 12 }], ['lembrete', { ofensiva: 6 }], ['lembrete', { ofensiva: 0 }], ['ofensiva', { ofensiva: 9 }],
  ['escudo', { ofensiva: 4 }], ['volta', { dias: 7 }], ['toque', { amigo: 'Ana' }], ['toque', { amigo: 'Ana', outros: 2 }],
  ['pedido', { amigo: 'Bento', amigoUsuario: 'bento' }], ['aceito', { amigo: 'Bento', amigoUsuario: 'bento' }], ['teste', {}],
  ['propositoConvite', { amigo: 'Maximiliano', titulo: 'Novo Testamento com a família', id: 'p1' }],
  ['metaDoGrupo', { faltam: 2, titulo: 'Grupo de quinta da célula', id: 'p2' }]]) {
  for (const data of ['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16']) {
    exemplos.push({ t, d, m: N.montarMensagem(t, d, { usuario: 'marcos', data, nome: 'Marcos Estevão' }) });
  }
}
ok(exemplos.every(({ m }) => m.titulo && m.corpo && !/\{|\}/.test(m.titulo + m.corpo)), 'toda mensagem sai preenchida, sem {marcador} sobrando');
ok(exemplos.every(({ m }) => m.titulo.length <= 50 && m.corpo.length <= 110), 'títulos até 50 e corpos até 110 caracteres: cabem na tela bloqueada');
ok(exemplos.some(({ t, d, m }) => t === 'lembrete' && d.ofensiva === 6 && /7/.test(m.titulo + m.corpo)), 'a um dia de um marco, o lembrete fala do marco');
ok(exemplos.filter(({ t }) => t === 'toque').every(({ m }) => m.tag === 'toque'), 'toques usam a mesma tag: se substituem no celular em vez de empilhar');
ok(new Set(exemplos.filter(({ t, d }) => t === 'lembrete' && d.ofensiva === 12).map(({ m }) => m.titulo)).size >= 2, 'o lembrete varia de um dia para o outro');
ok(exemplos.some(({ m }) => m.titulo.includes('Marcos')) && !exemplos.some(({ m }) => m.titulo.includes('Estevão')), 'usa só o primeiro nome');

// ---------- avisos de grupo: uma vez por dia ----------
// A comemoração "o grupo bateu a meta" não era anotada no histórico e saía de novo a cada
// rodada de lembretes (uma por minuto, em 23/09/2026). As duas marcas de grupo têm de ficar.
{
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const pasta = mkdtempSync(join(tmpdir(), 'cc-notif-'));
  const notif = await new N.Notificacoes(join(pasta, 'notificacoes.json')).carregar();
  await notif.anotar('ana', 'grupoBatida:p1', '2026-09-23', 1163);
  await notif.anotar('ana', 'grupo:p2', '2026-09-23', 1163);
  const h = notif.historico('ana');
  ok(h['grupoBatida:p1'] === '2026-09-23', 'a comemoração do grupo fica anotada no dia (não repete a cada minuto)');
  ok(h['grupo:p2'] === '2026-09-23', 'o recado de meta do grupo continua anotado');
  try { (await import(pathToFileURL(join(AQUI, 'db.mjs')).href)).fecharBanco(join(pasta, 'caminho.db')); } catch { /* ok */ }
  try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log('\n  exemplos:');
for (const { t, m } of exemplos.filter((_, i) => i % 4 === 2)) console.log('    [' + t + '] ' + m.titulo + '  |  ' + m.corpo);

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o núcleo das notificações está certo\n');
process.exit(falhas ? 1 : 0);
