// Regras de idade no servidor, de ponta a ponta pela API: a data de nascimento não muda depois
// do cadastro (nem com senha), trocar o e-mail pede a senha atual, e quem tem menos de 18 anos
// só lidera ou auxilia uma célula depois que a liderança (o administrador) aprova.
// Uso: node ferramentas/teste-idade.mjs   (PORTA=<porta> para trocar a 8791)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8791;
const PASTA = mkdtempSync(join(tmpdir(), 'cc-idade-'));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_ADMIN: 'dono', CAMINHO_SMTP_HOST: '' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const pedir = (rota, corpo, cookie) => fetch(base + rota, {
  method: corpo ? 'POST' : 'GET',
  headers: Object.assign({ 'content-type': 'application/json', origin: base }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const dados = async (r) => r.json().catch(() => ({}));
const biscoito = (r) => (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || ''])
  .map((l) => l.split(';')[0]).find((l) => l.startsWith('cc_sessao=')) || '';
const iso = (d) => d.toISOString().slice(0, 10);
const anosAtras = (n) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - n); d.setUTCDate(d.getUTCDate() - 3); return iso(d); };
const criar = async (usuario, nascimento) => {
  const r = await pedir('/api/criar-conta', { usuario, senha: 'senha-' + usuario, nome: usuario, email: usuario + '@teste.com', nascimento, consentimento: true });
  return biscoito(r);
};

try {
  console.log('\n  Data de nascimento e e-mail\n');
  const ana = await criar('ana', '2000-01-01');
  let r = await pedir('/api/perfil', { nascimento: '1990-05-05' }, ana);
  let d = await dados(r);
  ok(r.status === 403 && /fale com o suporte/.test(d.erro || ''), 'trocar a data de nascimento pela API é recusado (403, "fale com o suporte")');
  r = await pedir('/api/perfil', { nascimento: anosAtras(13), senhaAtual: 'senha-ana' }, ana);
  ok(r.status === 403, 'nem com a senha a data muda');
  ok((await dados(await pedir('/api/quem', null, ana))).nascimento === '2000-01-01', 'a data continua a do cadastro');
  r = await pedir('/api/perfil', { email: 'nova@teste.com' }, ana);
  ok(r.status === 403 && /senha atual/.test((await dados(r)).erro || ''), 'trocar o e-mail sem a senha é recusado');
  r = await pedir('/api/perfil', { email: 'nova@teste.com', senhaAtual: 'errada-123' }, ana);
  ok(r.status === 401, 'com a senha errada, também');
  ok((await dados(await pedir('/api/quem', null, ana))).email === 'ana@teste.com', 'o e-mail continua o antigo');
  r = await pedir('/api/perfil', { email: 'nova@teste.com', senhaAtual: 'senha-ana' }, ana);
  ok(r.status === 200 && (await dados(await pedir('/api/quem', null, ana))).email === 'nova@teste.com', 'com a senha certa, o e-mail troca');
  r = await pedir('/api/perfil', { email: 'nova@teste.com', nascimento: '2000-01-01' }, ana);
  ok(r.status === 200, 'reenviar o mesmo e-mail e a mesma data é aceito sem senha');
} catch (e) {
  ok(false, 'o teste quebrou: ' + (e && e.stack || e));
} finally {
  servidor.kill();
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'tudo certo') + '\n');
process.exit(falhas ? 1 : 0);
