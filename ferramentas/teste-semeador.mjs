// Confere a Fase 3, a Trilha do Semeador: os cinco níveis, quem conta (conta nova pelo link
// que concluiu a primeira lição) e quem não conta (sem lição, conta que já existia, conta
// apagada), que o progresso gravado pelo aparelho não mexe no número, e o marco no mural.
// Uso: node ferramentas/teste-semeador.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { NIVEIS_SEMEADOR, trilhaDoSemeador } = await import(pathToFileURL(join(AQUI, 'semeador.mjs')).href);
const { portaLivre } = await import(pathToFileURL(join(AQUI, 'ferramentas', 'navegador.mjs')).href);
const PORTA = await portaLivre();
const PASTA = mkdtempSync(join(tmpdir(), 'cc-semeador-'));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

console.log('\n  Trilha do Semeador\n');

// ---------- regras ----------
ok(NIVEIS_SEMEADOR.map((n) => n.meta).join() === '1,5,10,25,50', 'as metas são 1, 5, 10, 25 e 50 pessoas');
ok(NIVEIS_SEMEADOR.map((n) => n.nome).join('|') === 'Semente Lançada|Pequeno Rebanho|Pescador de Homens|Multiplicador|Igreja Viva', 'os nomes são os da especificação');
const tabela = [[0, 0, 1], [1, 1, 5], [4, 1, 5], [5, 2, 10], [9, 2, 10], [10, 3, 25], [24, 3, 25], [25, 4, 50], [49, 4, 50], [50, 5, null], [300, 5, null]];
ok(tabela.every(([n, nivel, meta]) => { const t = trilhaDoSemeador(n); return t.nivel === nivel && (t.proximo ? t.proximo.meta : null) === meta; }),
  'o nível e a próxima meta certos de 0 a 300 pessoas');
ok(trilhaDoSemeador(7).proximo.faltam === 3 && trilhaDoSemeador(-2).pessoas === 0 && trilhaDoSemeador('abc').nivel === 0, 'quanto falta, e número estranho vira zero');

// ---------- pela API ----------
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
const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
let carimbo = Date.now();
const licao = (cookie) => pedir('/api/estado', { atualizadoEm: ++carimbo, lidos: [1], marcadoEm: { 1: hoje } }, cookie, 'PUT');
const semeador = async (cookie) => (await pedir('/api/quem', null, cookie)).corpo.semeador || {};

try {
  const ana = await criar('ana');
  await pedir('/api/novidades/preferencia', { ligado: true }, ana.cookie);
  const token = new URL((await pedir('/api/convites', {}, ana.cookie)).corpo.link).searchParams.get('convite');
  let s = await semeador(ana.cookie);
  ok(s.pessoas === 0 && s.nivel === 0 && s.proximo && s.proximo.meta === 1 && Array.isArray(s.niveis) && s.niveis.length === 5,
    'a Ana começa sem ninguém, com a primeira meta e os cinco níveis para mostrar');

  const b1 = await criar('b1', token);
  ok((await semeador(ana.cookie)).pessoas === 0, 'a conta nova pelo link ainda não conta antes da primeira lição');
  await licao(b1.cookie);
  s = await semeador(ana.cookie);
  ok(s.pessoas === 1 && s.nivel === 1 && s.nome === 'Semente Lançada', 'feita a lição, Semente Lançada');

  const dora = await criar('dora');
  await pedir('/api/convites/aceitar', { token }, dora.cookie);
  await licao(dora.cookie);
  ok((await semeador(ana.cookie)).pessoas === 1, 'a Dora já tinha conta: vira amiga, mas não conta');

  const semLicao = await criar('sem-licao', token);
  await pedir('/api/estado', { atualizadoEm: ++carimbo, lidos: [] }, semLicao.cookie, 'PUT');
  ok((await semeador(ana.cookie)).pessoas === 1, 'quem só abriu o app, sem lição, não conta');

  const novos = [];
  for (let i = 2; i <= 5; i++) { const c = await criar('b' + i, token); novos.push(c); await licao(c.cookie); }
  s = await semeador(ana.cookie);
  ok(s.pessoas === 5 && s.nivel === 2 && s.nome === 'Pequeno Rebanho' && s.proximo.faltam === 5, '5 pessoas: Pequeno Rebanho, faltam 5 para o próximo');
  for (let i = 6; i <= 10; i++) { const c = await criar('b' + i, token); await licao(c.cookie); }
  s = await semeador(ana.cookie);
  ok(s.pessoas === 10 && s.nivel === 3 && s.nome === 'Pescador de Homens', '10 pessoas: Pescador de Homens');

  await licao(b1.cookie);
  ok((await semeador(ana.cookie)).pessoas === 10, 'a mesma pessoa fazendo mais lições não conta de novo');

  await pedir('/api/estado', { atualizadoEm: ++carimbo, semeador: { pessoas: 50, nivel: 5 }, convitesAceites: [{ de: 'ana' }] }, ana.cookie, 'PUT');
  ok((await semeador(ana.cookie)).pessoas === 10, 'gravar progresso com um número inventado não muda nada');

  await pedir('/api/apagar-conta', { senha: 'senha-boa-1' }, novos[0].cookie);
  s = await semeador(ana.cookie);
  ok(s.pessoas === 9 && s.nivel === 2, 'uma pessoa apaga a conta: 9, volta a Pequeno Rebanho');

  const b1Quem = await semeador(b1.cookie);
  ok(b1Quem.pessoas === 0, 'quem foi trazido tem a sua própria trilha, zerada');

  const mural = (await pedir('/api/novidades', null, ana.cookie)).corpo.eventos || [];
  const niveisNoMural = mural.filter((e) => e.tipo === 'semeador').map((e) => e.dados.nivel).sort();
  ok(niveisNoMural.join() === '1,2,3', 'cada nível novo vira um marco no mural, uma vez só (' + niveisNoMural.join() + ')');
  const muralB1 = (await pedir('/api/novidades', null, b1.cookie)).corpo.eventos || [];
  ok(muralB1.some((e) => e.tipo === 'semeador'), 'e os amigos da Ana veem o marco');
} catch (e) {
  ok(false, 'o teste quebrou: ' + e.stack);
} finally {
  servidor.kill();
  await dormir(500);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  a Trilha do Semeador funciona\n');
process.exit(falhas ? 1 : 0);
