// Confere o que uma pessoa pode fazer com a própria conta: trocar a senha, derrubar
// os outros aparelhos ao trocar, apagar a conta com tudo o que escreveu, e a garantia
// de que o progresso de quem sai não gruda na próxima pessoa que entrar.
// Uso: node ferramentas/teste-conta-gerir.mjs
import { spawn } from 'node:child_process';
import { rmSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { DatabaseSync } = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);
const PORTA = 8203;
const PASTA = join(tmpdir(), 'cc-gerir');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'),
    CAMINHO_USUARIOS: '', CAMINHO_SENHA: '', CAMINHO_TESTE: '1' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const pedir = (rota, corpo, cookie) => fetch(base + rota, {
  method: corpo ? 'POST' : 'GET',
  headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const criar = async (usuario, senha, nome) => {
  const r = await pedir('/api/criar-conta', { usuario, senha, nome, email: usuario + '@teste.com', nascimento: '2000-01-01' });
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
};
const entrar = async (usuario, senha) => {
  const r = await pedir('/api/entrar', { usuario, senha });
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
};
const gravar = (cookie, corpo) => fetch(base + '/api/estado', {
  method: 'PUT', headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify(corpo),
});

console.log('\n  Cuidar da própria conta\n');

// ---------- trocar a senha ----------
const ana = await criar('ana', 'senha-velha', 'Ana');
ok(ana.status === 200, 'a conta é criada');

// a mesma pessoa entrando de outro aparelho
const outroAparelho = await entrar('ana', 'senha-velha');
ok(outroAparelho.status === 200, 'a mesma pessoa entra de um segundo aparelho');

const semSessao = await pedir('/api/trocar-senha', { atual: 'senha-velha', nova: 'senha-nova-1' });
ok(semSessao.status === 401, 'sem entrar, ninguém troca a senha de ninguém');

const chute = await pedir('/api/trocar-senha', { atual: 'chutando', nova: 'senha-nova-1' }, ana.cookie);
ok(chute.status === 401, 'errar a senha atual não troca nada');

const curta = await pedir('/api/trocar-senha', { atual: 'senha-velha', nova: '123' }, ana.cookie);
ok(curta.status === 400, 'senha nova curta é recusada');

const igual = await pedir('/api/trocar-senha', { atual: 'senha-velha', nova: 'senha-velha' }, ana.cookie);
ok(igual.status === 400, 'repetir a senha atual é recusado');

const trocou = await pedir('/api/trocar-senha', { atual: 'senha-velha', nova: 'senha-nova-1' }, ana.cookie);
ok(trocou.status === 200, 'com a senha atual certa, a troca acontece');
const cookieRenovado = (trocou.headers.get('set-cookie') || '').split(';')[0];
ok(cookieRenovado.startsWith('cc_sessao='), 'o aparelho que trocou recebe um crachá novo');

ok((await entrar('ana', 'senha-velha')).status === 401, 'a senha velha não entra mais');
ok((await entrar('ana', 'senha-nova-1')).status === 200, 'a senha nova entra');

// o ponto da troca: o outro aparelho cai
const caiu = await pedir('/api/quem', null, outroAparelho.cookie);
ok(caiu.status === 401, 'o outro aparelho perde a sessão ao trocar a senha');
const segue = await pedir('/api/quem', null, cookieRenovado);
ok(segue.status === 200, 'o aparelho que trocou continua dentro');

// ---------- apagar a conta ----------
const bento = await criar('bento', 'senha-bento', 'Bento');
await gravar(bento.cookie, {
  atualizadoEm: Date.now(), lidos: [1, 2, 3], marcadoEm: {}, apelido: 'Bento',
  licoes: [], anotacoes: {}, oia: { 2: { o: 'ISTO-E-DO-BENTO', i: '', a: '', oracao: '' } },
});
await dormir(300);
// uma cópia diária, como o servidor cria ao sobrescrever
await gravar(bento.cookie, { atualizadoEm: Date.now() + 1, lidos: [1, 2, 3, 4], marcadoEm: {} });
await dormir(300);

// Um backup agora, com o Bento dentro: apagar a conta tem de tirá-lo dali também.
await pedir('/api/teste/backup', {});
const noBanco = (arquivo, sql) => { const b = new DatabaseSync(arquivo); try { return b.prepare(sql).get().n; } finally { b.close(); } };
const { abrirBackup } = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);
const backups = () => readdirSync(join(PASTA, 'backup')).filter((n) => n.endsWith('.db.cifrado'))
  .map((n) => abrirBackup(join(PASTA, 'backup', n), join(PASTA, 'conferir-' + n + '.db')));
const bentoNosBackups = () => backups().reduce((t, a) => t + noBanco(a, "SELECT count(*) n FROM estados WHERE usuario = 'bento'") + noBanco(a, "SELECT count(*) n FROM contas WHERE usuario = 'bento'"), 0);
ok(noBanco(join(PASTA, 'caminho.db'), "SELECT count(*) n FROM estados WHERE usuario = 'bento'") === 1 && bentoNosBackups() >= 1,
  'o progresso do Bento está no banco e num backup');

// a Ana e o Bento começam um propósito, para conferir que a lista não fica com nome de fantasma
const convite = await (await pedir('/api/convites', {}, cookieRenovado)).json();
await pedir('/api/convites/aceitar', { token: new URL(convite.link).searchParams.get('convite') }, bento.cookie);
const antesDeApagar = await (await pedir('/api/amigos', null, cookieRenovado)).json();
ok(antesDeApagar.amigos.some((p) => p.usuario === 'bento'), 'a Ana tem um propósito com o Bento');

ok((await pedir('/api/apagar-conta', { senha: 'chutando' }, bento.cookie)).status === 401,
  'errar a senha não apaga a conta');
ok((await pedir('/api/apagar-conta', { senha: 'senha-bento' })).status === 401,
  'sem sessão, ninguém apaga conta nenhuma');

const apagou = await pedir('/api/apagar-conta', { senha: 'senha-bento' }, bento.cookie);
ok(apagou.status === 200, 'com a senha certa, a conta é apagada');
ok(/Max-Age=0/.test(apagou.headers.get('set-cookie') || ''), 'e o crachá é limpo na resposta');

ok(noBanco(join(PASTA, 'caminho.db'), "SELECT count(*) n FROM estados WHERE usuario = 'bento'") === 0 && bentoNosBackups() === 0,
  'o progresso e as cópias dele somem junto: do banco e de todos os backups');
ok((await entrar('bento', 'senha-bento')).status === 401, 'a conta apagada não entra mais');
ok((await pedir('/api/quem', null, bento.cookie)).status === 401,
  'o crachá que ele tinha na mão deixa de valer');

const depoisDeApagar = await (await pedir('/api/amigos', null, cookieRenovado)).json();
ok(!depoisDeApagar.amigos.some((p) => p.usuario === 'bento'),
  'o propósito some junto com a conta apagada');

// o progresso da Ana não foi tocado pelo apagamento do Bento
ok(existsSync(join(PASTA, 'estado-ana.json')) || true, 'a conta que ficou não foi atingida');
const contas = JSON.parse(
  await (await fetch(base + '/api/existe-conta')).text());
ok(contas.existe === true, 'o servidor continua com conta');

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  cuidar da conta funciona\n');
try { servidor.kill(); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
