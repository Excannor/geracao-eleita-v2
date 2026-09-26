// Confere a multiplicação de célula (Atos 2.47; 2 Timóteo 2.2): só o líder inicia, precisa de
// um auxiliar ativo, o auxiliar escolhido lidera a célula nova, quem foi escolhido sai da mãe
// e entra na filha na mesma data, os limites continuam valendo, os avisos nunca vão para o
// Feed e a leitura pessoal (estado.json) não muda com a mudança de célula.
// Uso: node ferramentas/teste-multiplicar.mjs
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8231;
const PASTA = join(tmpdir(), 'cc-multiplicar');
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
  const r = await pedir('/api/criar-conta', { usuario, senha: 'senha123', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true, ...extra });
  return { u: usuario, cookie: biscoito(r), corpo: await dados(r), status: r.status };
};
const celulaAcao = async (corpo, cookie) => { const r = await pedir('/api/celula', corpo, cookie); return { status: r.status, corpo: await dados(r) }; };
const propositos = async (cookie) => (await dados(await pedir('/api/propositos', null, cookie))).propositos || [];
const proposito = async (cookie, id) => (await propositos(cookie)).find((p) => p.id === id);
const feed = async (cookie) => dados(await pedir('/api/novidades', null, cookie));

const entrarPeloToken = async (idCelula, cookie, extra = {}) => {
  const { link } = await dados(await pedir('/api/celula', { acao: 'link', id: idCelula }, cookie));
  return link;
};
const entrar = async (token, cookie, extra = {}) => pedir('/api/celula', { acao: 'entrar', token, ...extra }, cookie);

try {
  console.log('\n  Preparar a célula mãe: líder, auxiliar e mais gente\n');
  const lider = await criar('lider5');
  const idMae = (await celulaAcao({ acao: 'criar', titulo: 'Célula mãe' }, lider.cookie)).corpo.proposito.id;
  const linkMae = await entrarPeloToken(idMae, lider.cookie);
  const tokenMae = new URL(linkMae).searchParams.get('celula');

  const bruno = await criar('bruno5'); await entrar(tokenMae, bruno.cookie);
  const carla = await criar('carla5'); await entrar(tokenMae, carla.cookie);
  const davi = await criar('davi5'); await entrar(tokenMae, davi.cookie);
  const eli = await criar('eli5'); await entrar(tokenMae, eli.cookie);
  const visita = await criar('visita5'); await entrar(tokenMae, visita.cookie, { visitante: true });

  console.log('\n  Sem auxiliar, não multiplica\n');
  const semAuxiliar = await celulaAcao({ acao: 'multiplicar', id: idMae, auxiliar: 'bruno5', titulo: 'Célula filha', pessoas: [] }, lider.cookie);
  ok(semAuxiliar.status === 400, 'sem nenhum auxiliar ativo, a multiplicação é recusada');

  await celulaAcao({ acao: 'auxiliar', id: idMae, usuario: 'bruno5', sim: true }, lider.cookie);

  console.log('\n  Só o líder inicia\n');
  const naoLider = await celulaAcao({ acao: 'multiplicar', id: idMae, auxiliar: 'bruno5', titulo: 'Célula filha', pessoas: [] }, bruno.cookie);
  ok(naoLider.status === 403, 'quem não é líder não pode multiplicar a célula');

  console.log('\n  Precisa escolher um auxiliar ativo\n');
  const semEscolher = await celulaAcao({ acao: 'multiplicar', id: idMae, titulo: 'Célula filha', pessoas: [] }, lider.cookie);
  ok(semEscolher.status === 400, 'sem escolher o auxiliar, a multiplicação é recusada');
  const naoAuxiliar = await celulaAcao({ acao: 'multiplicar', id: idMae, auxiliar: 'carla5', titulo: 'Célula filha', pessoas: [] }, lider.cookie);
  ok(naoAuxiliar.status === 400, 'quem não é auxiliar não pode virar líder da nova célula');

  console.log('\n  Ler o estado de carla antes de multiplicar (para conferir depois que não mudou)\n');
  const estadoCarlaAntes = await dados(await pedir('/api/estado', null, carla.cookie));

  console.log('\n  Multiplicar de verdade: bruno lidera a filha, leva carla, davi e a visitante\n');
  const multiplicar = await celulaAcao({
    acao: 'multiplicar', id: idMae, auxiliar: 'bruno5', titulo: 'Célula filha', pessoas: ['carla5', 'davi5', 'visita5'],
  }, lider.cookie);
  ok(multiplicar.status === 200 && multiplicar.corpo.id, 'o líder multiplica a célula com sucesso');
  const idFilha = multiplicar.corpo.id;
  ok(multiplicar.corpo.titulo === 'Célula filha', 'a célula nova leva o nome escolhido');

  console.log('\n  Resultado na célula mãe\n');
  // A lista de membros do retrato só traz quem não saiu: quem foi para a filha simplesmente
  // não aparece mais aqui (não vira uma linha "saiu" visível para todo mundo).
  const maeDepois = await proposito(lider.cookie, idMae);
  ok(!maeDepois.membros.some((m) => m.usuario === 'bruno5'), 'bruno saiu da célula mãe');
  ok(!maeDepois.membros.some((m) => m.usuario === 'carla5'), 'carla saiu da célula mãe');
  ok(!maeDepois.membros.some((m) => m.usuario === 'davi5'), 'davi saiu da célula mãe');
  ok(!maeDepois.membros.some((m) => m.usuario === 'visita5'), 'a visitante escolhida também saiu da célula mãe');
  ok(maeDepois.membros.find((m) => m.usuario === 'eli5').estado === 'ativo', 'eli, que não foi escolhida, continua na célula mãe');
  ok(maeDepois.membros.find((m) => m.usuario === 'lider5').estado === 'ativo' && maeDepois.criadoPor === 'lider5', 'o líder continua liderando a célula mãe');

  console.log('\n  Resultado na célula filha\n');
  const filhaDepois = await proposito(bruno.cookie, idFilha);
  ok(filhaDepois && filhaDepois.criadoPor === 'bruno5', 'bruno é o líder (criador) da célula filha');
  const naFilha = (u) => filhaDepois.membros.find((m) => m.usuario === u);
  ok(naFilha('bruno5').estado === 'ativo' && naFilha('carla5').estado === 'ativo' && naFilha('davi5').estado === 'ativo', 'bruno, carla e davi estão ativos na filha');
  ok(naFilha('visita5').estado === 'ativo' && naFilha('visita5').papel === 'visitante', 'a visitante continua visitante na célula nova');
  ok(!naFilha('eli5'), 'quem não foi escolhida não aparece na célula filha');
  ok(!filhaDepois.membros.some((m) => m.papel === 'auxiliar'), 'bruno deixou de ser auxiliar (agora é líder da filha, não auxiliar de ninguém)');

  console.log('\n  As duas mostram a linha de origem, por até 30 dias\n');
  ok(filhaDepois.nasceuDe && filhaDepois.nasceuDe.titulo === 'Célula mãe', 'a filha sabe de qual célula nasceu');
  ok(!filhaDepois.multiplicouPara, 'a filha (que ainda não multiplicou) não tem "multiplicou para"');
  const maeComBanner = await proposito(lider.cookie, idMae);
  ok(maeComBanner.multiplicouPara && maeComBanner.multiplicouPara.titulo === 'Célula filha', 'a mãe sabe para qual célula multiplicou');
  ok(!maeComBanner.nasceuDe, 'a mãe (que não nasceu de ninguém) não tem "nasceu de"');

  console.log('\n  Limite de 20 continua valendo na célula nova\n');
  const idMae2 = (await celulaAcao({ acao: 'criar', titulo: 'Outra mãe' }, lider.cookie)).corpo.proposito.id;
  const linkMae2 = await entrarPeloToken(idMae2, lider.cookie);
  const tokenMae2 = new URL(linkMae2).searchParams.get('celula');
  const gente = [];
  for (let i = 1; i <= 21; i++) {
    const p = await criar('gente' + i + '5');
    await entrar(tokenMae2, p.cookie);
    gente.push(p);
  }
  await celulaAcao({ acao: 'auxiliar', id: idMae2, usuario: 'gente15', sim: true }, lider.cookie);
  const demais = gente.slice(1).map((p) => p.u); // 20 pessoas, mais o auxiliar dá 21
  const estourou = await celulaAcao({ acao: 'multiplicar', id: idMae2, auxiliar: 'gente15', titulo: 'Célula estourada', pessoas: demais }, lider.cookie);
  ok(estourou.status === 400, 'a célula nova não pode nascer com mais de 20 pessoas');

  console.log('\n  Avisos nunca no Feed\n');
  const feedBruno = await feed(bruno.cookie);
  const feedCarla = await feed(carla.cookie);
  const semMultiplicar = (f) => !JSON.stringify(f).includes('multiplic') && !JSON.stringify(f).includes('Célula filha');
  ok(semMultiplicar(feedBruno) && semMultiplicar(feedCarla), 'a multiplicação não aparece no mural de ninguém');

  console.log('\n  A leitura pessoal (ofensiva) não muda com a mudança de célula\n');
  const estadoCarlaDepois = await dados(await pedir('/api/estado', null, carla.cookie));
  ok(JSON.stringify(estadoCarlaAntes) === JSON.stringify(estadoCarlaDepois), 'o estado de leitura de carla é exatamente o mesmo antes e depois de mudar de célula');
} finally {
  servidor.kill();
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
