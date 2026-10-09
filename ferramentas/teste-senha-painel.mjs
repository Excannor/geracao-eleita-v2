// Confere a senha esquecida e o painel do dono: o pedido não entrega quem tem conta, o link
// de senha nova vale uma vez só e derruba as sessões antigas, e o painel só abre para o dono
// e só mostra contagens.
// Uso: node ferramentas/teste-senha-painel.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { montarPainel } = await import(pathToFileURL(join(AQUI, 'painel.mjs')).href);
const { montarMensagem, configDoEmail } = await import(pathToFileURL(join(AQUI, 'email.mjs')).href);
const PORTA = Number(process.env.PORTA) || 8207;
const PASTA = join(tmpdir(), 'cc-senha-painel');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// ---------- regras puras ----------
console.log('\n  Painel: só contagens\n');
const hoje = '2026-09-23';
const p = montarPainel({
  hoje,
  contas: [
    { usuario: 'a', criadaEm: '2026-08-01' },
    { usuario: 'b', criadaEm: '2026-09-01' },
    { usuario: 'c', criadaEm: '2026-09-22' },
  ],
  estados: {
    a: { lidos: [1, 2, 3, 4, 5], licoes: Array(12).fill(0), marcadoEm: { 1: '2026-08-01', 2: '2026-08-02', 3: '2026-09-23' }, oia: { 1: {} } },
    b: { lidos: [1], marcadoEm: { 1: '2026-09-01' } },
  },
  propositos: [{ grupo: true, membros: [{ usuario: 'a', estado: 'ativo' }, { usuario: 'b', estado: 'ativo' }, { usuario: 'c', estado: 'saiu' }] }],
  comPush: ['a', 'a'],
});
ok(p.contas.total === 3 && p.contas.novas7 === 1 && p.contas.novas30 === 2, 'conta total e contas novas');
ok(p.ativos.hoje === 1 && p.ativos.dias7 === 1 && p.ativos.dias30 === 2, 'conta quem leu hoje, na semana e no mês');
const d1 = p.retorno.find((r) => r.dias === 1);
ok(d1.elegiveis === 3 && d1.voltaram === 1 && d1.pct === 33, 'retorno do dia seguinte: 1 de 3 contas com idade (a de ontem já conta)');
ok(p.retorno.find((r) => r.dias === 30).elegiveis === 1, 'retorno de 30 dias só conta contas com 30 dias');
ok(p.ondeParam.total === 2, 'quem não lê há 7 dias entra em "onde param"');
ok(p.primeirosPassos.concluiram === 1 && p.escreveram === 1, 'primeiros passos e escrita');
ok(p.propositos.ativos === 1 && p.propositos.grupos === 1 && p.propositos.contasEmAlgum === 2, 'propósitos contam só membros ativos');
ok(p.comNotificacao === 1, 'notificação conta pessoas, não aparelhos');
ok(!/"a"|"b"|"c"/.test(JSON.stringify(p)), 'o painel não carrega nenhum @');

console.log('\n  E-mail\n');
ok(configDoEmail({}) === null, 'sem CAMINHO_SMTP_HOST o e-mail fica desligado');
const msg = montarMensagem({ de: 'Geração Eleita <x@y.com>', para: 'z@y.com', assunto: 'Sua nova senha', texto: 'Olá' });
ok(/^From: =\?UTF-8\?B\?/m.test(msg) && /Content-Transfer-Encoding: base64/.test(msg), 'remetente com acento vai codificado e o corpo em base64');

// ---------- pelo servidor ----------
try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_TESTE: '1',
    CAMINHO_ADMIN: 'dono', CAMINHO_SMTP_HOST: '', CAMINHO_ENDERECO: 'https://exemplo.test' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const pedir = (rota, corpo, cookie) => fetch(base + rota, {
  method: corpo ? 'POST' : 'GET',
  headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const biscoito = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const criar = async (usuario) => biscoito(await pedir('/api/criar-conta',
  { usuario, senha: 'senha-velha', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true }));

try {
  console.log('\n  Senha esquecida\n');
  const dono = await criar('dono');
  const ana = await criar('ana');
  const r1 = await pedir('/api/esqueci-senha', { login: 'ana@teste.com' });
  const r2 = await pedir('/api/esqueci-senha', { login: 'ninguem@teste.com' });
  ok(r1.status === 200 && r2.status === 200, 'pedido responde igual para conta que existe e que não existe');
  ok(JSON.stringify(await r1.json()) === JSON.stringify(await r2.json()), 'o corpo da resposta também é igual');

  ok((await pedir('/api/painel', null, ana)).status === 403, 'quem não é dono não abre o painel');
  ok((await pedir('/api/painel/link', { usuario: 'ana' }, ana)).status === 403, 'quem não é dono não gera link');
  ok((await (await pedir('/api/quem', null, dono)).json()).admin === true, 'o dono aparece como admin');
  ok((await (await pedir('/api/quem', null, ana)).json()).admin === false, 'os outros não');

  const painel = await (await pedir('/api/painel', null, dono)).json();
  ok(painel.contas && painel.contas.total === 2, 'o painel abre para o dono com as contagens');
  ok(painel.pedidosDeSenha.length === 1 && painel.pedidosDeSenha[0].usuario === 'ana', 'o pedido de ana aparece para o dono (e o e-mail sem conta, não)');
  ok(painel.emailLigado === false, 'o painel avisa que o e-mail está desligado');

  const { link } = await (await pedir('/api/painel/link', { usuario: 'ana' }, dono)).json();
  ok(link.startsWith('https://exemplo.test/entrar.html?redefinir='), 'o link aponta para a tela de entrar do endereço público');
  const token = new URL(link).searchParams.get('redefinir');
  ok((await (await pedir('/api/painel', null, dono)).json()).pedidosDeSenha.length === 0, 'gerado o link, o pedido sai da lista');

  ok((await pedir('/api/redefinir-senha', { token: token + 'x', senha: 'senha-nova' })).status === 410, 'link adulterado não vale');
  ok((await pedir('/api/redefinir-senha', { token, senha: '123' })).status === 400, 'senha curta é recusada');
  const troca = await pedir('/api/redefinir-senha', { token, senha: 'senha-nova' });
  ok(troca.status === 200 && biscoito(troca).startsWith('cc_sessao='), 'o link troca a senha e já entra');
  ok((await pedir('/api/redefinir-senha', { token, senha: 'outra-senha' })).status === 410, 'o mesmo link não vale duas vezes');
  ok((await pedir('/api/quem', null, ana)).status === 401, 'a sessão antiga cai com a senha nova');
  ok((await pedir('/api/entrar', { usuario: 'ana', senha: 'senha-nova' })).status === 200, 'a senha nova entra');
  ok((await pedir('/api/entrar', { usuario: 'ana', senha: 'senha-velha' })).status === 401, 'a senha velha não entra mais');
} finally {
  servidor.kill();
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

// ---------- e-mail ligado, mas que não sai ----------
// Aconteceu na produção: o domínio ainda não estava verificado no serviço de envio e o pedido
// sumia. Um "servidor de e-mail" que derruba toda conexão faz o envio falhar na hora.
const derruba = createServer((s) => s.destroy());
await new Promise((r) => derruba.listen(0, '127.0.0.1', r));
const PASTA2 = PASTA + '-email';
try { rmSync(PASTA2, { recursive: true, force: true }); } catch { /* ok */ }
const servidor2 = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA + 1)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA2, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_ADMIN: 'dono',
    CAMINHO_SMTP_HOST: '127.0.0.1', CAMINHO_SMTP_PORTA: String(derruba.address().port),
    CAMINHO_SMTP_USUARIO: 'x', CAMINHO_SMTP_SENHA: 'y', CAMINHO_ENDERECO: 'https://exemplo.test' },
  stdio: 'ignore',
});
const base2 = 'http://127.0.0.1:' + (PORTA + 1);
for (let i = 0; i < 80; i++) { try { await fetch(base2 + '/api/existe-conta'); break; } catch { await dormir(150); } }
const pedir2 = (rota, corpo, cookie) => fetch(base2 + rota, {
  method: corpo ? 'POST' : 'GET',
  headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const criar2 = async (usuario) => biscoito(await pedir2('/api/criar-conta',
  { usuario, senha: 'senha-velha', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true }));

try {
  console.log('\n  E-mail que não sai\n');
  const dono = await criar2('dono');
  await criar2('bia');
  const r = await (await pedir2('/api/esqueci-senha', { login: 'bia' })).json();
  ok(r.porEmail === true, 'com o e-mail ligado, a tela diz que o link vai por e-mail');
  let lista = [];
  for (let i = 0; i < 30 && !lista.length; i++) {
    await dormir(150);
    lista = (await (await pedir2('/api/painel', null, dono)).json()).pedidosDeSenha || [];
  }
  ok(lista.length === 1 && lista[0].usuario === 'bia', 'o envio falhou e o pedido caiu no painel do dono');
} finally {
  servidor2.kill();
  derruba.close();
  await dormir(300);
  try { rmSync(PASTA2, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
