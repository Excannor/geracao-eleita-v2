// Confere a Fase 1 pela API: amigos sem limite, o link de convite que vale para muitas
// pessoas por 30 dias, a conta criada pelo link já nascendo amiga e anotada como trazida por
// quem convidou, a ativação na primeira lição, o teto por hora, o cancelamento e o que
// acontece quando alguém apaga a conta.
// Uso: node ferramentas/teste-convites.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { DatabaseSync } = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);
const PORTA = 8223;
const PASTA = mkdtempSync(join(tmpdir(), 'cc-convites-'));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_TESTE: '1' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const pedir = async (rota, corpo, cookie, metodo) => {
  const r = await fetch(base + rota, {
    method: metodo || (corpo ? 'POST' : 'GET'),
    headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0], corpo: await r.json().catch(() => ({})) };
};
const criar = (usuario, convite) => pedir('/api/criar-conta', {
  usuario, senha: 'senha-boa-1', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', ...(convite ? { convite } : {}),
});
const banco = (sql, ...p) => { const b = new DatabaseSync(join(PASTA, 'caminho.db')); try { return b.prepare(sql).all(...p); } finally { b.close(); } };
const amigosDe = async (cookie) => (await pedir('/api/amigos', null, cookie)).corpo;
const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

console.log('\n  Convites e amigos sem limite\n');

try {
  const ana = await criar('ana');
  ok(ana.status === 200 && !ana.corpo.convidadoPor, 'a Ana cria a conta sem convite');
  const link = (await pedir('/api/convites', {}, ana.cookie)).corpo.link;
  const token = new URL(link).searchParams.get('convite');
  ok((await pedir('/api/convites/' + token)).corpo.usuario === 'ana', 'o link mostra quem convidou');

  // ---------- conta criada pelo link ----------
  const bia = await criar('bia', token);
  ok(bia.status === 200 && bia.corpo.convidadoPor === 'ana', 'a Bia cria a conta pelo link e o servidor diz quem a convidou');
  const amigosBia = await amigosDe(bia.cookie);
  ok(amigosBia.amigos.some((a) => a.usuario === 'ana'), 'a Bia já nasce amiga da Ana');
  ok(!('limite' in amigosBia), 'a lista de amigos não fala mais em limite');

  const carla = await criar('carla', token);
  ok(carla.corpo.convidadoPor === 'ana' && (await pedir('/api/convites/' + token)).status === 200, 'o mesmo link serve para a Carla, e continua valendo');

  const dora = await criar('dora');
  const aceite = await pedir('/api/convites/aceitar', { token }, dora.cookie);
  ok(aceite.status === 200 && (await amigosDe(dora.cookie)).amigos.some((a) => a.usuario === 'ana'), 'a Dora, que já tinha conta, aceita o convite pelo app');

  const edu = await criar('edu', token.slice(0, -4) + 'abcd');
  ok(edu.status === 200 && !edu.corpo.convidadoPor && !(await amigosDe(edu.cookie)).amigos.length, 'convite adulterado não impede a conta, só não cria amizade');

  ok((await pedir('/api/convites/aceitar', { token }, ana.cookie)).status === 400, 'ninguém aceita o próprio convite');

  const fabio = await criar('fabio');
  await pedir('/api/amizade', { acao: 'bloquear', usuario: 'fabio' }, ana.cookie);
  ok((await pedir('/api/convites/aceitar', { token }, fabio.cookie)).status === 410, 'quem a Ana bloqueou não entra pelo link dela');

  // ---------- anotado no banco ----------
  const linha = (u) => banco('SELECT * FROM convites_aceites WHERE de = ? AND para = ?', 'ana', u)[0];
  ok(linha('bia') && linha('bia').conta_nova === 1 && linha('carla').conta_nova === 1, 'Bia e Carla ficam anotadas como contas novas trazidas pela Ana');
  ok(linha('dora') && linha('dora').conta_nova === 0, 'a Dora fica anotada, mas como quem já tinha conta');
  ok(!linha('edu') && !linha('fabio'), 'o convite adulterado e o bloqueado não deixam anotação');
  ok(JSON.parse(banco("SELECT extra FROM contas WHERE usuario = 'bia'")[0].extra).convidadoPor === 'ana', 'a conta da Bia guarda quem a convidou');

  // ---------- ativação na primeira lição ----------
  const semLicao = { atualizadoEm: Date.now(), lidos: [], marcadoEm: {} };
  const comLicao = { atualizadoEm: Date.now() + 1, lidos: [1], marcadoEm: { 1: hoje } };
  await pedir('/api/estado', semLicao, carla.cookie, 'PUT');
  ok(linha('carla').ativado_em === '', 'abrir o app sem fazer lição não ativa a Carla');
  await pedir('/api/estado', comLicao, bia.cookie, 'PUT');
  ok(!!linha('bia').ativado_em, 'a primeira lição da Bia a ativa para a Trilha do Semeador da Ana');
  await pedir('/api/estado', comLicao, dora.cookie, 'PUT');
  ok(linha('dora').ativado_em === '', 'a lição da Dora não ativa nada: ela já tinha conta');
  const semeados = () => banco("SELECT count(*) n FROM convites_aceites WHERE de = 'ana' AND conta_nova = 1 AND ativado_em <> ''")[0].n;
  ok(semeados() === 1, 'a Ana tem 1 pessoa trazida e ativa');

  // ---------- sem limite, com teto por hora ----------
  let ligados = 0;
  for (let i = 1; i <= 27; i++) {
    const r = await criar('g' + i, token);
    if (r.corpo.convidadoPor === 'ana') ligados++;
  }
  const amigosAna = (await amigosDe(ana.cookie)).amigos.length;
  ok(ligados === 27 && amigosAna === 30, 'a Ana passa de 5 amigos sem limite nenhum (' + amigosAna + ')');
  const g28 = await criar('g28', token);
  ok(g28.status === 200 && !g28.corpo.convidadoPor, 'no 31º aceite da mesma hora, a conta nasce, mas o link para de valer por um tempo');
  const hugo = await criar('hugo');
  ok((await pedir('/api/convites/aceitar', { token }, hugo.cookie)).status === 429, 'quem já tinha conta recebe "tente mais tarde"');

  // ---------- cancelar ----------
  await pedir('/api/convites/cancelar', {}, ana.cookie);
  ok((await pedir('/api/convites/' + token)).status === 410, 'cancelar os convites derruba o link antigo');
  ok((await amigosDe(ana.cookie)).amigos.length === 30, 'mas quem já entrou continua amigo');
  const novoLink = (await pedir('/api/convites', {}, ana.cookie)).corpo.link;
  ok(!!novoLink && novoLink !== link, 'e dá para gerar um link novo');

  // ---------- apagar a conta ----------
  await pedir('/api/apagar-conta', { senha: 'senha-boa-1' }, bia.cookie);
  ok(!linha('bia') && semeados() === 0, 'a Bia apaga a conta e deixa de contar para a Ana');
} catch (e) {
  ok(false, 'o teste quebrou: ' + e.stack);
} finally {
  servidor.kill();
  await dormir(500);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  os convites da Fase 1 funcionam\n');
process.exit(falhas ? 1 : 0);
