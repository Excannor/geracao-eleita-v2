// Confere o desafio de consagração em grupo (desafios-grupo.mjs): as contas de quem venceu e
// quem escapou, só a partir do começo do grupo; na célula só quem conduz começa e encerra; na
// dupla do discipulado qualquer um dos dois; um desafio aberto por grupo; quem não é do grupo
// não vê nem mexe; o convite chega na caixa do sino; e o progresso sai dos dias que cada um
// marca no próprio desafio (estado.desafios), nunca de outra coisa.
// Uso: node ferramentas/teste-desafios-grupo.mjs
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8212;
const PASTA = join(tmpdir(), 'cc-desafios-grupo');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};
const somaDias = (texto, n) => { const d = new Date(texto + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ---------- regras puras ----------
console.log('\n  Desafio em grupo: regras puras\n');
{
  const G = await import(pathToFileURL(join(AQUI, 'desafios-grupo.mjs')).href);
  const inicio = '2026-03-10';
  const p = (hoje, registro) => G.progressoNoGrupo({ desafio: 'celular-cama-7', inicio, hoje, registro });

  ok(G.fimDoDesafio(inicio, 'celular-cama-7') === '2026-03-16', 'o desafio de 7 dias termina no 7º dia, contando o primeiro');
  ok(G.diaDoGrupo(inicio, 'celular-cama-7', '2026-03-10') === 1 && G.diaDoGrupo(inicio, 'celular-cama-7', '2026-03-30') === 7, 'o dia do grupo começa em 1 e para na duração');
  ok(p('2026-03-12', null).entrou === false && p('2026-03-12', null).escapados === 0, 'quem não entrou não conta escapada');
  ok(p('2026-03-12', { ativo: true, dias: [], inicio: '2026-03-12' }).escapou === false, 'quem entrou hoje ainda não escapou de nada');

  const antigos = p('2026-03-12', { ativo: false, dias: ['2026-03-01', '2026-03-02', '2026-03-11'] });
  ok(antigos.vencidos === 1 && antigos.entrou, 'dias vencidos antes do começo do grupo não contam');

  const firme = p('2026-03-12', { ativo: true, dias: ['2026-03-10', '2026-03-11', '2026-03-12'] });
  ok(firme.venceuHoje && !firme.escapou && firme.escapados === 0 && firme.vencidos === 3, 'quem venceu todos os dias está em dia');

  const escapou = p('2026-03-13', { ativo: true, dias: ['2026-03-10', '2026-03-11'] });
  ok(escapou.escapou && escapou.escapados === 1 && !escapou.venceuHoje, 'não venceu ontem: escapou um dia (hoje ainda pode marcar)');

  const buraco = p('2026-03-15', { ativo: true, dias: ['2026-03-10', '2026-03-14', '2026-03-15'] });
  ok(!buraco.escapou && buraco.escapados === 3, 'escapadas no meio contam, mesmo em dia agora');

  const fim = p('2026-03-18', { ativo: false, concluidoEm: '2026-03-16', dias: ['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14', '2026-03-15', '2026-03-16', '2026-03-17'] });
  ok(fim.concluido && fim.vencidos === 7 && !fim.venceuHoje && fim.escapados === 0, 'depois do fim: concluiu, e dia depois do fim não conta');

  ok(G.desafioVisivel({ inicio, desafio: 'celular-cama-7', encerradoEm: '' }, '2026-03-19'), 'o resultado fica à vista até 3 dias depois do fim');
  ok(!G.desafioVisivel({ inicio, desafio: 'celular-cama-7', encerradoEm: '' }, '2026-03-20'), 'e depois sai da tela');
  ok(!G.desafioVisivel({ inicio, desafio: 'celular-cama-7', encerradoEm: '2026-03-12' }, '2026-03-12'), 'encerrado sai na hora');
  ok(G.progressoNoGrupo({ desafio: 'nao-existe', inicio, hoje: inicio, registro: null }) === null, 'desafio desconhecido não tem progresso');
}

try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_TESTE: '1' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const pedir = (rota, corpo, cookie) => fetch(base + rota, {
  method: corpo ? 'POST' : 'GET',
  headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const dados = async (r) => r.json().catch(() => ({}));
const biscoito = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const criar = async (usuario, extra = {}) => {
  const r = await pedir('/api/criar-conta', { usuario, senha: 'senha123', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true, ...extra });
  return { u: usuario, cookie: biscoito(r), corpo: await dados(r) };
};
const dg = async (corpo, cookie) => { const r = await pedir('/api/desafios-grupo', corpo, cookie); return { status: r.status, corpo: await dados(r) }; };
const grupos = async (cookie) => (await dg(null, cookie)).corpo.grupos || [];
const HOJE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

try {
  console.log('\n  Célula: quem conduz começa, todos veem\n');
  const lider = await criar('lider');
  const criada = await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Célula de quinta' }, lider.cookie));
  const id = criada.proposito.id;
  const { link } = await dados(await pedir('/api/celula', { acao: 'link', id }, lider.cookie));
  const token = new URL(link).searchParams.get('celula');
  const ana = await criar('ana', { celula: token });
  const bia = await criar('bia', { celula: token });
  const fora = await criar('fora');

  const daAna = (await grupos(ana.cookie)).find((g) => g.grupo === id);
  ok(daAna && daAna.tipo === 'celula' && daAna.podeIniciar === false && daAna.desafio === null && daAna.pessoas === 3, 'membro vê a célula, sem desafio e sem poder começar');
  ok((await dg({ acao: 'iniciar', tipo: 'celula', grupo: id, desafio: 'celular-cama-7' }, ana.cookie)).status === 403, 'membro comum não começa o desafio da célula');
  ok((await dg({ acao: 'iniciar', tipo: 'celula', grupo: id, desafio: 'celular-cama-7' }, fora.cookie)).status === 404, 'quem não é da célula não começa');
  ok((await dg({ acao: 'iniciar', tipo: 'celula', grupo: id, desafio: 'inventado' }, lider.cookie)).status === 400, 'desafio inventado é recusado');
  const comecou = await dg({ acao: 'iniciar', tipo: 'celula', grupo: id, desafio: 'celular-cama-7' }, lider.cookie);
  ok(comecou.status === 200 && comecou.corpo.id, 'quem conduz começa o desafio da célula');
  ok((await dg({ acao: 'iniciar', tipo: 'celula', grupo: id, desafio: 'gratidao-14' }, lider.cookie)).status === 409, 'um desafio aberto por vez no grupo');
  ok(!(await grupos(fora.cookie)).some((g) => g.grupo === id), 'quem não é da célula não vê o desafio');

  await dormir(300);
  const caixaAna = await dados(await pedir('/api/avisos', null, ana.cookie));
  ok((caixaAna.avisos || []).some((a) => a.tipo === 'desafioGrupo' && /7 dias sem celular na cama/.test(a.corpo) && /célula de quinta/i.test(a.titulo)), 'o convite chega na caixa do sino de quem é da célula');

  // Ana entra e vence hoje; Bia tinha dias antigos, de antes do grupo, que não contam
  await pedir('/api/estado', { atualizadoEm: Date.now(), desafios: { 'celular-cama-7': { inicio: HOJE, dias: [HOJE], ativo: true, concluidoEm: '', em: Date.now() } } }, ana.cookie);
  await pedir('/api/estado', { atualizadoEm: Date.now(), desafios: { 'celular-cama-7': { inicio: somaDias(HOJE, -20), dias: [somaDias(HOJE, -20), somaDias(HOJE, -19)], ativo: false, concluidoEm: '', em: Date.now() } } }, bia.cookie);
  const visto = (await grupos(lider.cookie)).find((g) => g.grupo === id).desafio;
  const m = Object.fromEntries(visto.membros.map((x) => [x.usuario, x]));
  ok(visto.titulo === '7 dias sem celular na cama' && visto.dia === 1 && visto.dias === 7, 'o desafio aparece com título, duração e o dia do grupo');
  ok(m.ana.entrou && m.ana.venceuHoje && m.ana.vencidos === 1, 'Ana entrou e venceu hoje');
  ok(!m.bia.entrou && m.bia.vencidos === 0, 'os dias antigos da Bia não contam para o grupo');
  ok(!m.lider.entrou, 'quem começou também precisa entrar para contar');
  ok(visto.membros[0].usuario === 'ana', 'quem entrou aparece primeiro');
  ok(visto.membros.every((x) => !('dias' in x) && !('desafios' in x)), 'o servidor não manda os dias de ninguém, só as contas');
  ok(visto.podeEncerrar === true && (await grupos(ana.cookie)).find((g) => g.grupo === id).desafio.podeEncerrar === false, 'só quem conduz pode encerrar');

  ok((await dg({ acao: 'encerrar', tipo: 'celula', grupo: id, id: visto.id }, ana.cookie)).status === 403, 'membro comum não encerra');
  ok((await dg({ acao: 'encerrar', tipo: 'celula', grupo: id, id: visto.id }, lider.cookie)).status === 200, 'quem conduz encerra');
  ok((await grupos(ana.cookie)).find((g) => g.grupo === id).desafio === null, 'encerrado, sai da tela de todos');
  ok((await dg({ acao: 'iniciar', tipo: 'celula', grupo: id, desafio: 'gratidao-14' }, lider.cookie)).status === 200, 'depois de encerrar, dá para começar outro');

  console.log('\n  Discipulado: qualquer um dos dois começa\n');
  const davi = await criar('davi');
  await pedir('/api/amizade', { acao: 'pedir', usuario: 'davi' }, lider.cookie);
  await pedir('/api/amizade', { acao: 'aceitar', usuario: 'lider' }, davi.cookie);
  const convite = await dados(await pedir('/api/discipulado', { acao: 'convidar', usuario: 'davi', papel: 'discipulador' }, lider.cookie));
  await pedir('/api/discipulado', { acao: 'aceitar', id: convite.id, mostrar: {} }, davi.cookie);
  const dupla = (await grupos(davi.cookie)).find((g) => g.tipo === 'discipulado');
  ok(dupla && dupla.podeIniciar && dupla.nome === 'Você e lider' && dupla.pessoas === 2, 'o discípulo vê a dupla e pode começar');
  ok((await dg({ acao: 'iniciar', tipo: 'discipulado', grupo: dupla.grupo, desafio: 'sem-redes-21' }, davi.cookie)).status === 200, 'o discípulo começa o desafio da dupla');
  const doLider = (await grupos(lider.cookie)).find((g) => g.tipo === 'discipulado');
  ok(doLider.desafio && doLider.desafio.desafio === 'sem-redes-21' && doLider.desafio.membros.length === 2, 'o discipulador vê o mesmo desafio, com os dois');
  ok((await dg({ acao: 'iniciar', tipo: 'discipulado', grupo: dupla.grupo, desafio: 'sem-redes-21' }, fora.cookie)).status === 404, 'quem não é da dupla não mexe');
} finally {
  servidor.kill();
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
