// O estudo da célula guarda (À Mesa, Fase 2, docs/a-mesa-fase2.md, seção 9.5), num servidor
// próprio, com contas criadas pela API: o combinado, o estudo ligado a cada encontro (inclusive o
// registro de dias atrás e o do app antigo, sem o campo), quem não veio, a lista e a leitura dos
// estudos anteriores com a permissão de cada papel (líder, auxiliar, membro, visitante, quem
// entrou depois, quem saiu, de fora, o administrador) e a célula filha de uma multiplicação, que
// lê os estudos da mãe até o dia em que nasceu.
//
// Parte A (a API e as permissões) e a parte C pela API (a multiplicação): bloco SERVIDOR. As
// partes B e C no navegador (as telas, a impressão, a anotação) entram no bloco CLIENTE, no lugar
// marcado mais abaixo, com o Chrome subindo como em teste-estudo-celula.mjs.
//
// As datas no passado: os encontros entram sempre pela API (moram na memória do servidor); o dia
// em que cada um entrou na célula e o nascimento das contas voltam 10 dias direto no banco, com o
// servidor parado e religado (a chave da sessão fica na pasta, e os cookies continuam valendo); o
// nascimento de um estudo volta direto em celula_estudos, que o servidor lê do banco a cada vez.
//
// Uso: node ferramentas/teste-estudo-historico.mjs   (PORTA=<porta> para trocar a 8394)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from '../db.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8394;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// ---------- as datas, no fuso padrão do servidor (as contas não mudam o fuso) ----------
const hojeEm = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const HOJE = hojeEm();
const somaDias = (texto, n) => { const d = new Date(texto + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const DIA_7 = somaDias(HOJE, -7);
const DIA_3 = somaDias(HOJE, -3);
// meio-dia de Brasília de um dia, como instante
const meioDia = (data) => new Date(data + 'T15:00:00.000Z').toISOString();

// ---------- o servidor ----------
const pasta = mkdtempSync(join(tmpdir(), 'cc-estudo-historico-'));
const arquivoDb = join(pasta, 'caminho.db');
let servidor = null;
async function subir() {
  servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
    env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_ADMIN: 'admin' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) { try { await fetch('http://127.0.0.1:' + PORTA + '/api/existe-conta'); return; } catch { await dormir(150); } }
  throw new Error('o servidor não subiu na porta ' + PORTA);
}
async function parar() {
  if (!servidor) return;
  const s = servidor;
  servidor = null;
  if (s.exitCode !== null) return;
  await new Promise((r) => { s.once('exit', r); s.kill(); });
}
let encerrado = false;
async function encerrar() {
  if (encerrado) return;
  encerrado = true;
  await parar().catch(() => {});
  try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
}
process.on('uncaughtException', async (e) => { console.log('  FALHA ' + (e && e.stack || e)); await encerrar(); process.exit(1); });
process.on('unhandledRejection', async (e) => { console.log('  FALHA ' + (e && e.stack || e)); await encerrar(); process.exit(1); });
// mexer no banco com o servidor parado (proposito_membros e contas moram na memória dele)
const noBanco = (fazer) => { const db = new DatabaseSync(arquivoDb); try { return fazer(db); } finally { db.close(); } };
const lerBanco = (sql, ...x) => { const db = new DatabaseSync(arquivoDb, { readOnly: true }); try { return db.prepare(sql).all(...x); } finally { db.close(); } };

// ---------- a API ----------
const base = 'http://127.0.0.1:' + PORTA + '/';
const pedir = async (rota, corpo, cookie) => {
  const r = await fetch(base + rota, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, cookie: (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || '']).map((c) => c.split(';')[0]).find((c) => c.startsWith('cc_sessao=') && c.length > 10) || '', dado: await r.json().catch(() => ({})) };
};
const criar = async (usuario, nome, extra = {}) => (await pedir('api/criar-conta', {
  usuario, senha: 'senha123', nome, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true, ...extra,
})).cookie;
const celulaDe = async (cookie, id) => ((await pedir('api/propositos', null, cookie)).dado.propositos || []).find((p) => p.id === id);
const estudos = (q, cookie) => pedir('api/estudos?' + q, null, cookie);

// O estudo do dono como o líder salva no navegador (teste-estudo-celula.mjs): a sugestão de cartão
// de Lucas 11.24-26, aceita na prévia, vira a linha da referência logo depois do parágrafo. São os
// 6 cartões que a lista resume em "Ef 6, Lc 11, 1Pe 5".
const LINHAS_DONO = readFileSync(join(AQUI, 'ferramentas', 'estudo-exemplo.txt'), 'utf8').replace(/\s+$/, '').split('\n');
LINHAS_DONO.splice(LINHAS_DONO.findIndex((l) => l.startsWith('Em Lucas 11:24')) + 1, 0, 'Lucas 11.24-26');
const DONO = { acao: 'estudo', estudo: 'blocos', fonte: LINHAS_DONO.join('\n'), traducao: 'nbv', perguntas: ['O que mais marcou você?', 'O que muda na sua semana?'] };
const CARTOES = ['Efésios 6.12', 'Lucas 11.24-26', '1 Pedro 5.8', 'Efésios 6.13-17', 'Efésios 6.18', 'Efésios 6.10'];
const PEDIDO = 'Peço oração pela cirurgia da minha avó na sexta';
const TESTEMUNHO = 'Orem pelo Jonas, que está doente.';
const COMBINADO_1 = 'Ligar para alguém que faltou.';
const COMBINADO_2 = 'Orar todo dia por alguém que ainda não conhece Jesus.';

try {
  await subir();
  // ---------- a célula: Marcos (líder), Paulo (auxiliar), Ana e Bia (membros), Vera (visitante) ----------
  const lider = await criar('lider', 'Marcos');
  const ID = (await pedir('api/celula', { acao: 'criar', titulo: 'Célula Esperança' }, lider)).dado.proposito.id;
  const token = new URL((await pedir('api/celula', { acao: 'link', id: ID }, lider)).dado.link).searchParams.get('celula');
  const aux = await criar('aux', 'Paulo', { celula: token });
  const ana = await criar('ana', 'Ana', { celula: token });
  const bia = await criar('bia', 'Bia', { celula: token });
  const vera = await criar('vera', 'Vera');
  await pedir('api/celula', { acao: 'entrar', token, visitante: true }, vera);
  const outro = await criar('outro', 'Otto');
  const OUTRA = (await pedir('api/celula', { acao: 'criar', titulo: 'Outra' }, outro)).dado.proposito.id;
  const admin = await criar('admin', 'Admin');
  ok((await pedir('api/celula', { acao: 'auxiliar', id: ID, usuario: 'aux', sim: true }, lider)).status === 200, 'o Paulo é auxiliar da célula');
  // o dia do encontro é o de hoje: "o encontro desta semana" da folha é hoje, em qualquer dia em que o teste rodar
  await pedir('api/celula', { acao: 'encontro', id: ID, dia: new Date(HOJE + 'T12:00:00Z').getUTCDay() }, lider);
  ok((await pedir('api/cuidado', { acao: 'criar', celula: ID, tipo: 'oracao', destino: 'celula', texto: PEDIDO, dias: 7 }, ana)).status === 200, 'a Ana deixou um pedido de oração na célula');

  // todos estão na célula (e têm conta) desde 10 dias atrás
  await parar();
  const DIA_10 = somaDias(HOJE, -10);
  noBanco((db) => {
    db.prepare('UPDATE proposito_membros SET entrou_em = ? WHERE proposito = ?').run(DIA_10, ID);
    db.prepare('UPDATE propositos SET criado_em = ? WHERE id = ?').run(DIA_10, ID);
    db.prepare('UPDATE contas SET criada_em = ?').run(DIA_10);
  });
  await subir();
  ok((await celulaDe(ana, ID)).membros.length === 5, 'o servidor religado continua com a sessão de cada um e a célula inteira');

  console.log('\n  Parte A: a API e as permissões\n');
  // 1. S1, com o combinado e um testemunho com nome; nasceu 8 dias atrás
  const s1 = (await pedir('api/celula', { ...DONO, id: ID, combinado: COMBINADO_1, testemunho: TESTEMUNHO }, lider)).dado.estudo;
  ok(s1 && s1.combinado === COMBINADO_1 && JSON.stringify(s1.refs) === JSON.stringify(CARTOES), 'S1: o líder salva o estudo do dono com o combinado');
  const S1 = s1.id;
  noBanco((db) => db.prepare('UPDATE celula_estudos SET criado_em = ? WHERE id = ?').run(meioDia(somaDias(HOJE, -8)), S1));
  // o sino de todos da célula, contado antes e depois de cada registro
  const caixa = () => lerBanco("SELECT count(*) n FROM push_caixa WHERE usuario IN ('lider', 'aux', 'ana', 'bia', 'vera', 'caio')")[0].n;
  let caixaAntes = caixa();

  // 2. o encontro de 7 dias atrás, registrado pelo Paulo sem o campo "estudo" (o app antigo)
  const reg7 = await pedir('api/celula', { acao: 'registrarEncontro', id: ID, data: DIA_7, presentes: ['aux', 'ana', 'vera'], visitantes: 2 }, aux);
  ok(reg7.status === 200 && reg7.dado.encontro.estudo === S1 && reg7.dado.estudo.id === S1, 'o registro de 7 dias atrás, sem o campo, fica ligado a S1 (o estudo que valia naquele dia)');
  ok(JSON.stringify(reg7.dado.faltaram) === JSON.stringify([{ usuario: 'bia', nome: 'Bia' }, { usuario: 'lider', nome: 'Marcos' }]),
    'quem não veio: a Bia e o Marcos, em ordem de nome, sem a Vera (visitante) e sem o Paulo (que registrou)');
  await dormir(300);
  ok(caixa() === caixaAntes, 'o registro não põe nada no sino de ninguém (nem de quem faltou)');

  // 3. S2, o próximo, com outro combinado e sem os 4 Ws
  const s2 = (await pedir('api/celula', { acao: 'estudo', id: ID, estudo: 'trecho', ref: 'Romanos 8.28-30', fonte: 'Tudo coopera para o bem.', base: S1, combinado: COMBINADO_2 }, lider)).dado.estudo;
  const S2 = s2 && s2.id;
  ok(S2 && S2 !== S1 && lerBanco('SELECT atual_ate FROM celula_estudos WHERE id = ?', S1)[0].atual_ate !== '', 'S2 nasce numa linha nova, e S1 ganha atual_ate');
  ok((await celulaDe(ana, ID)).estudoTestemunho === '' && !JSON.stringify(await celulaDe(vera, ID)).includes('Orem pelo Jonas'),
    'o testemunho de S1, com o nome, não passou para S2');

  // 4. a lista
  for (const [quem, cookie] of [['o líder', lider], ['o Paulo', aux], ['a Ana', ana]]) {
    const r = await estudos('celula=' + ID, cookie);
    ok(r.status === 200 && r.dado.estudos.length === 1 && r.dado.estudos[0].id === S1 && r.dado.estudos[0].dataDe === 'encontro' && r.dado.estudos[0].data === DIA_7
      && r.dado.estudos[0].criadoPorNome === 'Marcos', quem + ' recebe S1 na lista, com a data do encontro e o nome de quem preparou');
  }
  ok((await estudos('celula=' + ID, vera)).status === 403, 'a Vera (visitante) recebe 403 na lista');
  ok((await estudos('celula=' + ID, outro)).status === 404 && (await estudos('celula=' + ID, admin)).status === 404, 'o líder de outra célula e o administrador recebem 404');

  // 5. um estudo
  const ler = async (cookie, id = S1, extra = '') => estudos('estudo=' + id + extra, cookie);
  const doPaulo = await ler(aux);
  ok(doPaulo.status === 200 && JSON.stringify(doPaulo.dado.encontros) === JSON.stringify([{ data: DIA_7, pessoas: 5 }]) && doPaulo.dado.usarComoBase === false,
    'o Paulo (auxiliar) vê que vieram 5 pessoas, e não tem "Usar como base"');
  const doLider = await ler(lider);
  ok(doLider.dado.usarComoBase === true && doLider.dado.estudo.fonte && !doLider.dado.estudo.fonte.includes('A nossa luta'), 'o líder tem "Usar como base" e a fonte limpa, sem o texto da NVI');
  const daAna = await ler(ana);
  ok(daAna.dado.encontros.length === 0 && !('fonte' in daAna.dado.estudo)
    && JSON.stringify(daAna.dado.estudo.blocos.filter((b) => b.t === 'versiculo').map((b) => b.ref)) === JSON.stringify(CARTOES), 'a Ana lê S1, com os 6 cartões, sem a presença e sem a fonte');
  ok(![doPaulo, doLider, daAna].some((r) => /Orem pelo Jonas|estudoAcolhida|estudoTestemunho|cirurgia/.test(JSON.stringify(r.dado))), 'nenhuma leitura leva o testemunho, a acolhida ou um pedido de oração');
  ok((await ler(vera)).status === 403 && (await ler(outro)).status === 404 && (await ler(admin)).status === 404, 'a Vera recebe 403 em S1; de fora e o administrador, 404');

  // 6. quem entrou depois
  const caio = await criar('caio', 'Caio', { celula: token });
  ok((await estudos('celula=' + ID, caio)).dado.estudos.length === 1 && (await ler(caio)).status === 200, 'o Caio entra depois de S2 e lê S1');

  // 7. o combinado de antes, para todos (a visitante inclusive)
  for (const [quem, cookie] of [['a Ana', ana], ['a Vera', vera], ['o líder', lider]]) {
    const c = await celulaDe(cookie, ID);
    ok(JSON.stringify(c.combinadoAnterior) === JSON.stringify({ texto: COMBINADO_1, data: DIA_7, estudo: S1 }), quem + ' recebe "Na semana passada combinamos", com a data de 7 dias atrás');
  }
  ok((await celulaDe(ana, ID)).temAnteriores === true && (await celulaDe(vera, ID)).temAnteriores === false, 'só quem faz parte da célula fica sabendo que há anteriores');

  // 8. o encontro de 3 dias atrás, registrado pelo líder sem o campo
  caixaAntes = caixa();
  const reg3 = await pedir('api/celula', { acao: 'registrarEncontro', id: ID, data: DIA_3, presentes: ['lider', 'ana'], visitantes: 0 }, lider);
  ok(reg3.dado.encontro.estudo === S1, 'o registro de 3 dias atrás, sem o campo, também fica ligado a S1');
  ok(JSON.stringify(reg3.dado.faltaram.map((x) => x.usuario)) === '["bia","aux"]' && !reg3.dado.faltaram.some((x) => x.usuario === 'caio'),
    'quem não veio não traz o Caio, que entrou depois daquela data');
  ok((await celulaDe(lider, ID)).estudo.usado === false, 'S2 continua sem uso: o líder ainda vê "Mudar o estudo"');
  ok(JSON.stringify((await ler(aux)).dado.encontros) === JSON.stringify([{ data: DIA_3, pessoas: 2 }, { data: DIA_7, pessoas: 5 }])
    && (await estudos('celula=' + ID, ana)).dado.estudos[0].data === DIA_3, 'a leitura de S1 pelo Paulo passa a ter os dois encontros, e a lista mostra a data de 3 dias atrás');
  const folha = (await celulaDe(aux, ID)).registro;
  ok(folha && folha.dias.find((d) => d.data === DIA_3).estudo === S1 && folha.dias.find((d) => d.data === HOJE).padrao === S2 && folha.estudos.map((e) => e.id).join() === [S2, S1].join(),
    'a folha de registro do Paulo traz o estudo de cada dia e os dois estudos para escolher');
  await dormir(300);
  ok(caixa() === caixaAntes, 'nem o segundo registro: nada chegou ao sino de quem faltou');

  // 9. quem sai
  ok((await pedir('api/propositos', { acao: 'sair', id: ID }, bia)).status === 200 && (await ler(bia)).status === 404 && (await estudos('celula=' + ID, bia)).status === 404,
    'a Bia sai da célula e recebe 404 em S1 e na lista');

  // ---------- partes B e C no navegador (bloco CLIENTE, C6) ----------
  // As telas entram aqui, antes da multiplicação: o passo 3 com o combinado, a aba da Ana com a
  // acolhida lembrada, a lista e a leitura dos anteriores, a anotação, "Usar como base", o modo
  // encontro, o registro com "Trocar" e "Quem não veio", a visitante, quem saiu e a impressão.

  console.log('\n  Parte C: a multiplicação, pela API\n');
  const mult = await pedir('api/celula', { acao: 'multiplicar', id: ID, auxiliar: 'aux', titulo: 'Célula Nova', pessoas: ['ana'] }, lider);
  const FILHA = mult.dado.id;
  ok(mult.status === 200 && FILHA, 'o líder multiplica a célula, com o Paulo liderando a nova e a Ana indo junto');
  // S3: o que a mãe prepara depois do corte (amanhã) não é da história das duas
  noBanco((db) => db.prepare("INSERT INTO celula_estudos (id, proposito, tipo, titulo, ref, refs, fonte, criado_por, criado_em) VALUES ('e3depois', ?, 'trecho', 'João 3.16', 'João 3.16', '[\"João 3.16\"]', '', 'lider', ?)")
    .run(ID, meioDia(somaDias(HOJE, 1))));
  const filhaDaAna = await celulaDe(ana, FILHA);
  ok(JSON.stringify(filhaDaAna.daMae) === JSON.stringify({ titulo: 'Célula Esperança', ate: HOJE }) && filhaDaAna.temAnteriores === false, 'a Ana, na filha, recebe daMae, com o dia da multiplicação');
  const daMae = await estudos('celula=' + FILHA + '&de=mae', ana);
  ok(daMae.status === 200 && daMae.dado.estudos.map((e) => e.id).join() === [S2, S1].join() && daMae.dado.celula.titulo === 'Célula Esperança',
    'com de=mae, a Ana recebe S2 e S1, sem S3');
  ok((await ler(ana)).dado.celula === FILHA && (await ler(ana)).dado.daMae.titulo === 'Célula Esperança', 'a Ana pede S1 sem a célula e recebe a leitura pela filha');
  ok((await ler(ana, S1, '&celula=' + ID)).status === 404 && (await ler(ana, 'e3depois')).status === 404, 'pela mãe, de onde saiu, 404; e S3, 404');
  const doNovoLider = await ler(aux, S1, '&celula=' + FILHA);
  ok(doNovoLider.status === 200 && doNovoLider.dado.usarComoBase === false && doNovoLider.dado.encontros.length === 0 && !('fonte' in doNovoLider.dado.estudo),
    'o Paulo, líder da filha, abre S1 sem "Usar como base", sem a presença e sem a fonte');
  ok((await pedir('api/celula', { acao: 'registrarEncontro', id: FILHA, data: HOJE, presentes: ['aux'], visitantes: 0, estudo: S1 }, aux)).status === 400,
    'o registro da filha não aceita um estudo da mãe');
  // (as telas da filha, partes C no navegador: bloco CLIENTE)
} finally {
  await encerrar();
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
