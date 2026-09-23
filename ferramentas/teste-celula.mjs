// Confere o link da célula: o líder cria o grupo sozinho, manda o link, e quem abre entra
// direto (conta nova ou já existente), vira amigo de quem mandou, e a célula para em 20.
// Uso: node ferramentas/teste-celula.mjs
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8209;
const PASTA = join(tmpdir(), 'cc-celula');
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
  headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const dados = async (r) => r.json().catch(() => ({}));
const biscoito = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const criar = async (usuario, extra = {}) => {
  const r = await pedir('/api/criar-conta', { usuario, senha: 'senha123', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', ...extra });
  return { cookie: biscoito(r), corpo: await dados(r), status: r.status };
};
const propositos = async (cookie) => (await dados(await pedir('/api/propositos', null, cookie))).propositos || [];
const amigos = async (cookie) => ((await dados(await pedir('/api/amigos', null, cookie))).amigos || []).map((a) => a.usuario);

try {
  console.log('\n  Link da célula\n');
  const lider = await criar('lider');
  const criada = await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Célula de quinta' }, lider.cookie));
  const id = criada.proposito && criada.proposito.id;
  ok(id && criada.proposito.grupo === true && criada.proposito.membros.length === 1, 'o líder cria a célula sozinho, já como grupo');
  ok(criada.proposito.titulo === 'Célula de quinta', 'a célula leva o nome escolhido');

  const { link } = await dados(await pedir('/api/celula', { acao: 'link', id }, lider.cookie));
  ok(/\/\?celula=/.test(link || ''), 'o link aponta para o app com ?celula=');
  const token = new URL(link).searchParams.get('celula');

  const info = await dados(await pedir('/api/celula/' + encodeURIComponent(token)));
  ok(info.titulo === 'Célula de quinta' && info.pessoas === 1 && info.limite === 20 && info.vagas === 19 && info.usuario === 'lider', 'sem conta, o link mostra nome, quem chamou e vagas');
  ok(!('membros' in info), 'sem conta, o link não mostra quem está dentro');
  ok((await pedir('/api/celula/' + encodeURIComponent(token + 'x'))).status === 410, 'link adulterado não vale');

  // conta nova pelo link
  const ana = await criar('ana', { celula: token });
  ok(ana.status === 200 && ana.corpo.celula === 'Célula de quinta', 'conta nova pelo link já entra na célula');
  ok((await amigos(ana.cookie)).includes('lider'), 'quem entrou vira amigo de quem mandou o link');
  const daAna = (await propositos(ana.cookie)).find((p) => p.id === id);
  ok(daAna && daAna.membros.some((m) => m.usuario === 'ana' && m.estado === 'ativo'), 'a célula aparece para quem entrou, já como membro ativo');

  // conta que já existia
  const bia = await criar('bia');
  const entrou = await dados(await pedir('/api/celula', { acao: 'entrar', token }, bia.cookie));
  ok(entrou.ok && !entrou.ja && entrou.id === id, 'quem já tinha conta entra pelo link');
  const denovo = await dados(await pedir('/api/celula', { acao: 'entrar', token }, bia.cookie));
  ok(denovo.ja === true, 'entrar de novo não duplica');

  // membro que não criou também manda o link
  const { link: linkDaAna } = await dados(await pedir('/api/celula', { acao: 'link', id }, ana.cookie));
  const tokenAna = new URL(linkDaAna).searchParams.get('celula');
  const caio = await criar('caio', { celula: tokenAna });
  ok(caio.corpo.celula === 'Célula de quinta', 'o link de outro membro também põe a pessoa na célula');
  ok((await amigos(caio.cookie)).includes('ana'), 'e a amizade nasce com quem mandou esse link');

  const duda = await criar('duda', { celula: token });
  ok(duda.corpo.celula === 'Célula de quinta', 'a quinta pessoa entra (célula passa do limite de 5 do grupo de amigos)');
  for (let i = 6; i <= 20; i++) await criar('membro' + i, { celula: token });
  ok((await dados(await pedir('/api/celula/' + encodeURIComponent(token)))).pessoas === 20, 'a célula chega a 20 pessoas');
  const eva = await criar('eva');
  const cheia = await pedir('/api/celula', { acao: 'entrar', token }, eva.cookie);
  ok(cheia.status === 409, 'a 21ª pessoa não entra: célula cheia');
  ok((await dados(await pedir('/api/celula/' + encodeURIComponent(token)))).vagas === 0, 'o link mostra que não há vagas');
  const semVaga = await criar('fabi', { celula: token });
  ok(semVaga.status === 200 && semVaga.corpo.celula === '', 'célula cheia não impede criar a conta');

  // cancelar convites derruba o link
  await pedir('/api/convites/cancelar', {}, lider.cookie);
  ok((await pedir('/api/celula/' + encodeURIComponent(token))).status === 410, 'cancelar os convites cancela também o link da célula');

  // quem não é da célula não gera link dela
  ok((await pedir('/api/celula', { acao: 'link', id }, eva.cookie)).status === 404, 'quem não é da célula não gera o link');
  ok((await pedir('/api/celula', { acao: 'link', id })).status === 401, 'sem entrar, ninguém gera link');

  const retrato = (await propositos(lider.cookie)).find((p) => p.id === id);
  ok(retrato && retrato.membros.filter((m) => m.estado === 'ativo').length === 20 && retrato.hoje && retrato.hoje.meta === 20
    && retrato.celula === true && retrato.limite === 20, 'o líder vê a célula com 20 pessoas e meta do dia 20');

  ok(!(await propositos(lider.cookie)).some((p) => !p.grupo), 'entrar pela célula não empilha uma dupla por membro na tela do líder');

  // ---------- o líder ----------
  console.log('\n  O líder da célula\n');
  const celula = (corpo, cookie) => pedir('/api/celula', { id, ...corpo }, cookie);
  ok((await celula({ acao: 'encontro', dia: 4 }, lider.cookie)).status === 200, 'o líder marca o encontro (quinta)');
  ok((await celula({ acao: 'encontro', dia: 9 }, lider.cookie)).status === 400, 'dia fora da semana é recusado');
  ok((await celula({ acao: 'encontro', dia: 2 }, ana.cookie)).status === 403, 'quem não é líder não muda o encontro');
  ok((await celula({ acao: 'recado', texto: 'Quinta às 20h na casa da Ana. Tragam a Bíblia!' }, lider.cookie)).status === 200, 'o líder publica um recado');
  ok((await celula({ acao: 'recado', texto: 'x'.repeat(281) }, lider.cookie)).status === 400, 'recado com mais de 280 caracteres é recusado');
  ok((await celula({ acao: 'recado', texto: 'oi' }, ana.cookie)).status === 403, 'quem não é líder não escreve recado');

  // o estudo é escolha do líder, nunca imposto
  let daBia = (await propositos(bia.cookie)).find((p) => p.id === id);
  ok(daBia.estudo === null, 'sem o líder escolher, não há estudo nenhum');
  ok((await celula({ acao: 'estudo', estudo: 'trecho', ref: 'Romanos 8.28-30', texto: 'Tudo coopera para o bem.' }, lider.cookie)).status === 200, 'o líder escolhe um trecho');
  daBia = (await propositos(bia.cookie)).find((p) => p.id === id);
  ok(daBia.estudo && daBia.estudo.tipo === 'trecho' && daBia.estudo.ref === 'Romanos 8.28-30' && daBia.estudo.texto === 'Tudo coopera para o bem.', 'os membros veem o trecho e a palavra do líder');
  ok(daBia.encontro === 4 && /Tragam a Bíblia/.test(daBia.recado), 'os membros veem o dia do encontro e o recado');
  ok((await celula({ acao: 'estudo', estudo: 'trecho', ref: 'Livro Nenhum 3' }, lider.cookie)).status === 400, 'livro que não existe é recusado');
  ok((await celula({ acao: 'estudo', estudo: 'trecho', ref: 'João 3.18-16' }, lider.cookie)).status === 400, 'versículos de trás para frente são recusados');
  ok((await celula({ acao: 'estudo', estudo: 'livre', texto: '' }, lider.cookie)).status === 400, 'estudo escrito vazio é recusado');
  ok((await celula({ acao: 'estudo', estudo: 'livre', texto: 'Hoje vamos falar de perdão.\nLeiam Mateus 18.21-22.' }, lider.cookie)).status === 200, 'o líder escreve o próprio estudo');
  ok((await celula({ acao: 'estudo', estudo: 'semana' }, lider.cookie)).status === 200, 'o líder escolhe a leitura da semana');
  ok((await celula({ acao: 'estudo', estudo: 'semana' }, ana.cookie)).status === 403, 'quem não é líder não escolhe o estudo');
  const doLider = (await propositos(lider.cookie)).find((p) => p.id === id);
  ok(doLider.semanaAte >= 7 && doLider.estudo.tipo === 'semana', 'a leitura da semana cobre 7 dias do plano');
  ok(doLider.semanaLider && doLider.semanaLider.pessoas === 20 && doLider.semanaLider.possiveis === 140, 'o líder vê só o número da semana do grupo');
  ok(!('semanaLider' in daBia), 'os membros não veem o número da semana');
  ok((await celula({ acao: 'estudo', estudo: '' }, lider.cookie)).status === 200
    && (await propositos(bia.cookie)).find((p) => p.id === id).estudo === null, 'o líder tira o estudo');

  // tirar alguém
  ok((await celula({ acao: 'remover', usuario: 'duda' }, ana.cookie)).status === 403, 'quem não é líder não tira ninguém');
  ok((await celula({ acao: 'remover', usuario: 'lider' }, lider.cookie)).status === 400, 'o líder não tira a si mesmo');
  ok((await celula({ acao: 'remover', usuario: 'duda' }, lider.cookie)).status === 200, 'o líder tira alguém da célula');
  ok(!(await propositos(duda.cookie)).some((p) => p.id === id), 'quem saiu não vê mais a célula');
  ok((await amigos(duda.cookie)).includes('lider'), 'a amizade com o líder continua');

  // o grupo de amigos continua com 5
  const g = await dados(await pedir('/api/propositos', { acao: 'criar', tipo: 'plano', com: ['ana', 'membro6', 'membro7', 'membro8', 'membro9'] }, lider.cookie));
  ok(g.erro && /5/.test(g.erro), 'o grupo de amigos continua com no máximo 5 pessoas');
} finally {
  servidor.kill();
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
