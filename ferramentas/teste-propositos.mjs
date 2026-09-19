// Confere a Fase 2 pela API: amizades antigas viram propósito de leitura em dupla sem perder
// dias, várias duplas com a mesma pessoa, os três tipos, o grupo de até 5 com a meta coletiva,
// sair, encerrar, desfazer amizade, bloquear, apagar a conta, e que nada escrito sai da conta.
// Uso: node ferramentas/teste-propositos.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { Contas } = await import(pathToFileURL(join(AQUI, 'contas.mjs')).href);
const { arquivoDoBanco, fecharBanco } = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);
const PORTA = 8224;
const PASTA = mkdtempSync(join(tmpdir(), 'cc-propositos-'));
const RASCUNHO = mkdtempSync(join(tmpdir(), 'cc-propositos-migra-'));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const SEGREDO = 'SEGREDO-DA-ORACAO-9f3';

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

console.log('\n  Propósitos em dupla e em grupo\n');

// ---------- migração: amizade antiga vira dupla de leitura, com o mesmo começo ----------
try {
  const arquivo = join(RASCUNHO, 'contas.json');
  let contas = await new Contas(arquivo).carregar();
  for (const u of ['velha', 'amiga']) await contas.criar({ usuario: u, senha: '123456', nome: u, email: u + '@x.com', nascimento: '2000-01-01' });
  await contas.pedir('velha', 'amiga', '2026-01-10');
  await contas.aceitar('amiga', 'velha', '2026-01-10');
  // Volta o banco ao jeito de antes: amizade sem propósito e sem a marca da migração.
  const meta = contas.db.prepare('PRAGMA table_info(metadados)').all()[0].name;
  contas.db.exec('DELETE FROM proposito_membros; DELETE FROM propositos;');
  contas.db.prepare('DELETE FROM metadados WHERE ' + meta + ' = ?').run('propositos_migrados');
  fecharBanco(arquivoDoBanco(RASCUNHO));
  contas = await new Contas(arquivo).carregar();
  const dupla = contas.duplaPlano('velha', 'amiga');
  ok(!!dupla && dupla.criadoEm === '2026-01-10' && dupla.tipo === 'plano' && !dupla.grupo,
    'amizade que já existia vira propósito de leitura em dupla, contando desde o aceite');
  await contas.carregar();
  ok(contas.propositosAtivos().length === 1, 'abrir de novo não cria outra dupla');
  fecharBanco(arquivoDoBanco(RASCUNHO));
} catch (e) {
  ok(false, 'a migração quebrou: ' + e.stack);
}

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
  const texto = await r.text();
  let json = {};
  try { json = JSON.parse(texto); } catch { /* sem corpo */ }
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0], corpo: json, texto };
};
const criar = (usuario, convite) => pedir('/api/criar-conta', {
  usuario, senha: 'senha-boa-1', nome: usuario[0].toUpperCase() + usuario.slice(1), email: usuario + '@teste.com', nascimento: '2000-01-01', ...(convite ? { convite } : {}),
});
const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const respostas = [];
const lista = async (cookie) => { const r = await pedir('/api/propositos', null, cookie); respostas.push(r.texto); return r.corpo.propositos || []; };
const acao = (cookie, corpo) => pedir('/api/propositos', corpo, cookie);
let carimbo = Date.now();
const gravar = (cookie, estado) => pedir('/api/estado', { atualizadoEm: ++carimbo, ...estado }, cookie, 'PUT');
const leu = { lidos: [1], marcadoEm: { 1: hoje } };

try {
  ok((await pedir('/api/propositos')).status === 401, 'sem entrar, nada de propósitos');

  const ana = await criar('ana');
  const token = new URL((await pedir('/api/convites', {}, ana.cookie)).corpo.link).searchParams.get('convite');
  const gente = {};
  for (const u of ['bia', 'caio', 'duda', 'edu', 'fabi', 'gabi']) gente[u] = (await criar(u, token)).cookie;
  const { bia, caio, duda, edu, fabi, gabi } = gente;

  // ---------- duplas ----------
  const daAna = await lista(ana.cookie);
  ok(daAna.length === 6 && daAna.every((p) => p.tipo === 'plano' && !p.grupo && p.membros.length === 2),
    'cada amizade nova já nasce com a sua dupla de leitura (' + daAna.length + ')');
  ok((await acao(ana.cookie, { acao: 'criar', tipo: 'plano', com: ['bia'] })).status === 400, 'a mesma dupla de leitura não se repete');

  const oracao = await acao(ana.cookie, { acao: 'criar', tipo: 'oracao', com: ['bia'] });
  const nt = await acao(ana.cookie, { acao: 'criar', tipo: 'livro', alvo: 'nt', com: ['bia'] });
  const rute = await acao(ana.cookie, { acao: 'criar', tipo: 'livro', alvo: 'Rute', com: ['bia'] });
  ok(oracao.status === 200 && nt.status === 200 && rute.status === 200, 'com a Bia dá para ter oração, Novo Testamento e Rute, além da leitura');
  ok((await acao(ana.cookie, { acao: 'criar', tipo: 'livro', alvo: 'Livro Inventado', com: ['bia'] })).status === 400, 'livro que não existe no plano é recusado');
  ok((await acao(ana.cookie, { acao: 'criar', tipo: 'oracao', com: ['ninguem'] })).status === 403, 'só dá para chamar amigos');
  ok((await pedir('/api/amigos', null, bia)).corpo.convitesProposito === 3, 'a Bia vê que tem 3 convites de propósito');

  const idOracao = oracao.corpo.proposito.id;
  ok((await acao(bia, { acao: 'aceitar', id: idOracao })).status === 200, 'a Bia aceita a oração');
  await acao(bia, { acao: 'aceitar', id: rute.corpo.proposito.id });
  ok((await acao(bia, { acao: 'recusar', id: nt.corpo.proposito.id })).status === 200, 'e recusa o Novo Testamento');
  ok(!(await lista(ana.cookie)).some((p) => p.id === nt.corpo.proposito.id), 'o recusado sai da lista dos dois');
  ok((await acao(bia, { acao: 'aceitar', id: nt.corpo.proposito.id })).status === 404, 'e não dá mais para aceitar');

  // ---------- oração: só a data ----------
  await gravar(ana.cookie, { oradoEm: { [hoje]: 1 }, oia: { 1: { oracao: SEGREDO } }, anotacoes: { x: SEGREDO } });
  let p = (await lista(bia)).find((x) => x.id === idOracao);
  ok(p && p.dias === 0 && p.membros.find((m) => m.usuario === 'ana').fezHoje, 'a Ana orou: a Bia vê que ela orou, e a contagem espera a Bia');
  await gravar(bia, { oradoEm: { [hoje]: 1 } });
  p = (await lista(bia)).find((x) => x.id === idOracao);
  ok(p && p.dias === 1, 'as duas oraram hoje: 1 dia de oração juntas');
  ok((await lista(bia)).find((x) => x.tipo === 'plano' && x.membros.some((m) => m.usuario === 'ana')).dias === 0, 'orar não conta como leitura');

  // ---------- grupo ----------
  ok((await acao(ana.cookie, { acao: 'criar', tipo: 'plano', com: ['bia', 'caio', 'duda', 'edu', 'fabi'] })).status === 400, 'grupo de 6 é recusado');
  const g = await acao(ana.cookie, { acao: 'criar', tipo: 'plano', titulo: 'Célula de quinta', com: ['bia', 'caio', 'duda'] });
  const idGrupo = g.corpo.proposito && g.corpo.proposito.id;
  ok(g.status === 200 && g.corpo.proposito.grupo && g.corpo.proposito.titulo === 'Célula de quinta', 'a Ana cria um grupo de leitura com 4 pessoas');
  for (const c of [bia, caio, duda]) await acao(c, { acao: 'aceitar', id: idGrupo });
  ok((await acao(ana.cookie, { acao: 'convidar', id: idGrupo, usuario: 'edu' })).status === 200, 'chama o Edu: 5 com ele');
  ok((await acao(ana.cookie, { acao: 'convidar', id: idGrupo, usuario: 'fabi' })).status === 400, 'a Fabi seria a 6ª: recusado');
  await acao(edu, { acao: 'recusar', id: idGrupo });
  ok((await acao(ana.cookie, { acao: 'convidar', id: idGrupo, usuario: 'fabi' })).status === 200, 'o Edu recusa, e a vaga fica para a Fabi');
  await acao(fabi, { acao: 'aceitar', id: idGrupo });
  ok((await acao(ana.cookie, { acao: 'convidar', id: idGrupo, usuario: 'fabi' })).status === 400, 'quem já está no grupo não é chamado de novo');

  const grupo = async (c) => (await lista(c)).find((x) => x.id === idGrupo);
  let gr = await grupo(ana.cookie);
  ok(gr && gr.hoje && gr.hoje.meta === 5 && gr.hoje.pontos === 0 && gr.dias === 0, 'grupo de 5: meta de hoje é 5, ninguém fez nada');

  // Ana lê e pratica (2), Bia e Caio leem (1 cada): 4 de 5.
  await gravar(ana.cookie, { ...leu, diario: { [hoje]: { praticas: 2 } } });
  await gravar(bia, leu);
  await gravar(caio, leu);
  gr = await grupo(duda);
  ok(gr.hoje.pontos === 4 && !gr.hoje.batida && gr.hoje.faltam === 1, '3 leem e a Ana pratica: 4 de 5, falta 1');
  ok(gr.membros.find((m) => m.usuario === 'ana').extraHoje && !gr.membros.find((m) => m.usuario === 'duda').fezHoje, 'o grupo vê quem fez o extra e quem ainda não leu');

  // Duda não lê, mas abre uma nota de estudo: o ponto extra cobre.
  await gravar(duda, { diario: { [hoje]: { notas: 1 } } });
  gr = await grupo(fabi);
  ok(gr.hoje.pontos === 5 && gr.hoje.batida && gr.dias === 1, 'a Duda abre uma nota de estudo e o grupo bate a meta: 1 dia');

  // ---------- sair e encerrar ----------
  ok((await acao(caio, { acao: 'sair', id: idGrupo })).status === 200 && !(await grupo(caio)), 'o Caio sai e o grupo some da lista dele');
  gr = await grupo(ana.cookie);
  ok(gr && gr.membros.length === 4 && gr.hoje.meta === 4, 'o grupo continua com 4, e a meta de hoje passa a ser 4');
  ok((await acao(bia, { acao: 'encerrar', id: idGrupo })).status === 403, 'só quem criou encerra o grupo');
  ok((await acao(ana.cookie, { acao: 'encerrar', id: idGrupo })).status === 200 && !(await grupo(bia)), 'a Ana encerra e o grupo some para todos');

  // ---------- desfazer amizade e bloquear ----------
  await pedir('/api/amizade', { acao: 'desfazer', usuario: 'bia' }, ana.cookie);
  ok(!(await lista(ana.cookie)).some((x) => x.membros.some((m) => m.usuario === 'bia')), 'desfazer a amizade encerra todas as duplas com a Bia');

  const g2 = await acao(ana.cookie, { acao: 'criar', tipo: 'oracao', com: ['caio', 'duda'] });
  for (const c of [caio, duda]) await acao(c, { acao: 'aceitar', id: g2.corpo.proposito.id });
  await pedir('/api/amizade', { acao: 'bloquear', usuario: 'duda' }, caio);
  const g2Ana = (await lista(ana.cookie)).find((x) => x.id === g2.corpo.proposito.id);
  ok(g2Ana && !g2Ana.membros.some((m) => m.usuario === 'caio') && g2Ana.membros.some((m) => m.usuario === 'duda'),
    'o Caio bloqueia a Duda e sai do grupo em que os dois estavam');

  // ---------- apagar a conta ----------
  await pedir('/api/apagar-conta', { senha: 'senha-boa-1' }, gabi);
  ok(!(await lista(ana.cookie)).some((x) => x.membros.some((m) => m.usuario === 'gabi')), 'a Gabi apaga a conta e some dos propósitos');

  // ---------- privacidade ----------
  ok(respostas.length > 10 && !respostas.some((t) => t.includes(SEGREDO)), 'nenhuma resposta de propósitos leva texto escrito ou oração (' + respostas.length + ' respostas)');
} catch (e) {
  ok(false, 'o teste quebrou: ' + e.stack);
} finally {
  servidor.kill();
  await dormir(500);
  for (const pasta of [PASTA, RASCUNHO]) { try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ } }
}

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  os propósitos da Fase 2 funcionam\n');
process.exit(falhas ? 1 : 0);
