// Confere a passagem de sessão para o Chrome: quem criou a conta no navegador de dentro do
// WhatsApp (link de convite) e é mandado ao Chrome chega lá já com a sessão, uma vez só.
// Uso: node ferramentas/teste-passagem.mjs   (PORTA=<n> troca a porta)
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8216;
const PASTA = join(tmpdir(), 'cc-passagem-' + PORTA);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_TESTE: '1' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const pedir = (rota, corpo, cookie) => fetch(base + rota, {
  method: corpo ? 'POST' : 'GET',
  redirect: 'manual',
  headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const dados = async (r) => r.json().catch(() => ({}));
const cookies = (r) => (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || ''])
  .map((l) => l.split(';')[0]).filter((l) => l.split('=')[1]).join('; ');

try {
  // O dono do convite e o link dele.
  const dono = await pedir('/api/criar-conta', { usuario: 'dono', senha: 'senha123', nome: 'Dono', email: 'dono@teste.com', nascimento: '2000-01-01', consentimento: true });
  const cDono = cookies(dono);
  const conv = await dados(await pedir('/api/convites', {}, cDono));
  const token = (conv.link || '').split('convite=')[1] || '';
  ok(!!token, 'o dono tem um link de convite');

  // No navegador do WhatsApp: a conta nasce pelo convite.
  const nova = await pedir('/api/criar-conta', { usuario: 'convidada', senha: 'senha123', nome: 'Convidada', email: 'c@teste.com', nascimento: '2000-01-01', consentimento: true, convite: token });
  const cWhats = cookies(nova);
  ok(nova.status === 200 && !!cWhats, 'a conta nasce pelo convite, com sessão no navegador do WhatsApp');

  // Sem passagem, o Chrome (sem cookie) recebe a entrada: era o "volta para a tela inicial".
  const semNada = await pedir('/');
  ok(/form-cadastro|botao-comecar/.test(await semNada.text()), 'sem passagem, o Chrome cai na entrada (o defeito de antes)');

  // Com passagem: o app pede, o Chrome abre com ela e ganha o crachá.
  const sem = await pedir('/api/passagem', {});
  ok(sem.status === 401, 'sem sessão, não há passagem');
  const { passagem } = await dados(await pedir('/api/passagem', {}, cWhats));
  ok(typeof passagem === 'string' && passagem.length >= 24, 'com sessão, o app recebe uma passagem');
  const chrome = await pedir('/?passagem=' + encodeURIComponent(passagem) + '&outro=1');
  const cChrome = cookies(chrome);
  ok(chrome.status === 302, 'o endereço com a passagem redireciona');
  ok(chrome.headers.get('location') === './?outro=1', 'a passagem some do endereço e o resto fica (' + chrome.headers.get('location') + ')');
  ok(/cc_sessao=/.test(cChrome), 'o Chrome recebe o crachá');
  const quem = await dados(await pedir('/api/quem', null, cChrome));
  ok(quem.usuario === 'convidada', 'no Chrome, o app abre já como a pessoa (' + quem.usuario + ')');
  const app = await pedir('/', null, cChrome);
  ok(!/form-cadastro/.test(await app.text()), 'no Chrome, o endereço do app entrega o app, não a entrada');

  // Uso único e prazo.
  const deNovo = await pedir('/?passagem=' + encodeURIComponent(passagem));
  ok(deNovo.status === 302 && !/cc_sessao=/.test(cookies(deNovo)), 'a mesma passagem não vale duas vezes');
  const inventada = await pedir('/?passagem=inventada123456789012345678901234');
  ok(inventada.status === 302 && !/cc_sessao=/.test(cookies(inventada)), 'passagem inventada não dá sessão');
} finally {
  servidor.kill();
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log(falhas ? '\n  ' + falhas + ' falha(s)' : '\n  a sessão passa para o Chrome, uma vez só');
process.exit(falhas ? 1 : 0);
