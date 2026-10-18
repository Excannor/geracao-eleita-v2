// Confere o link da célula: o líder cria o grupo sozinho, manda o link, e quem abre entra
// direto (conta nova ou já existente), vira amigo de quem mandou, e a célula para em 20.
// Uso: node ferramentas/teste-celula.mjs   (PORTA=<porta> para trocar a 8209)
import { spawn } from 'node:child_process';
import { rmSync, readFileSync } from 'node:fs';
import { DatabaseSync } from '../db.mjs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8209;
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
  const r = await pedir('/api/criar-conta', { usuario, senha: 'senha123', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true, ...extra });
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

  // ---------- data de "hoje" no fuso padrão, igual ao que o servidor usa ----------
  const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const somaDiasTeste = (texto, n) => { const d = new Date(texto + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const HOJE = hoje();

  // ---------- auxiliar, visitante e o roteiro do encontro ----------
  console.log('\n  Auxiliar e o roteiro do encontro\n');
  const lider2 = await criar('lider2', { nascimento: '2004-04-05' });
  const criada2 = await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Célula 2' }, lider2.cookie));
  const id2 = criada2.proposito.id;
  ok(criada2.proposito.euConduzo === true, 'o líder já conduz a própria célula');
  ok(criada2.proposito.estudoAcolhida === '' && criada2.proposito.estudoAdoracao === '' && criada2.proposito.estudoTestemunho === '',
    'sem nada escolhido, o roteiro 4 Ws nasce vazio');
  const { link: link2 } = await dados(await pedir('/api/celula', { acao: 'link', id: id2 }, lider2.cookie));
  const token2 = new URL(link2).searchParams.get('celula');
  const celula2 = (corpo, cookie) => pedir('/api/celula', { id: id2, ...corpo }, cookie);

  const mA = await criar('membroa2', { nascimento: '2004-04-05', celula: token2 });
  const mB = await criar('membrob2', { nascimento: '2004-04-05', celula: token2 });
  const mC = await criar('membroc2', { nascimento: '2004-04-05', celula: token2 });

  ok((await celula2({ acao: 'auxiliar', usuario: 'membroa2', sim: true }, mA.cookie)).status === 403, 'quem não é líder não marca auxiliar');
  ok((await celula2({ acao: 'auxiliar', usuario: 'lider2', sim: true }, lider2.cookie)).status === 400, 'o líder não marca a si mesmo como auxiliar');
  ok((await celula2({ acao: 'auxiliar', usuario: 'fantasma', sim: true }, lider2.cookie)).status === 404, 'não dá para marcar quem não está na célula');
  ok((await celula2({ acao: 'auxiliar', usuario: 'membroa2', sim: true }, lider2.cookie)).status === 200, 'o líder marca a membroa2 como auxiliar');
  ok((await celula2({ acao: 'recado', texto: 'Encontro hoje às 20h' }, mA.cookie)).status === 200, 'o auxiliar já conduz: publica um recado');
  ok((await celula2({ acao: 'remover', usuario: 'membrob2' }, mA.cookie)).status === 403, 'mas o auxiliar não tira ninguém da célula');
  ok((await celula2({ acao: 'auxiliar', usuario: 'membrob2', sim: true }, lider2.cookie)).status === 200, 'um segundo auxiliar');
  ok((await celula2({ acao: 'auxiliar', usuario: 'membroc2', sim: true }, lider2.cookie)).status === 400, 'o terceiro auxiliar é recusado: o limite é 2');
  ok((await celula2({ acao: 'auxiliar', usuario: 'membroa2', sim: false }, lider2.cookie)).status === 200, 'o líder tira a membroa2 de auxiliar');
  ok((await celula2({ acao: 'recado', texto: 'de novo' }, mA.cookie)).status === 403, 'sem o papel, ela deixa de conduzir');

  // roteiro 4 Ws: os campos são gravados e devolvidos para todo mundo, mesmo sem a Palavra escolhida
  ok((await celula2({ acao: 'estudo', acolhida: 'x'.repeat(301) }, lider2.cookie)).status === 400, 'acolhida com mais de 300 caracteres é recusada');
  ok((await celula2({ acao: 'estudo', acolhida: 'Qual foi a melhor parte da sua semana?', adoracao: 'Uma música de louvor', testemunho: 'Convidar o vizinho' }, lider2.cookie)).status === 200,
    'o líder prepara o roteiro (acolhida, adoração e testemunho), sem mexer na Palavra');
  const roteiroLider = (await propositos(lider2.cookie)).find((p) => p.id === id2);
  const roteiroMembro = (await propositos(mC.cookie)).find((p) => p.id === id2);
  ok(roteiroLider.estudo === null, 'a Palavra continua vazia: o roteiro não a substitui');
  for (const r of [roteiroLider, roteiroMembro]) {
    ok(r.estudoAcolhida === 'Qual foi a melhor parte da sua semana?' && r.estudoAdoracao === 'Uma música de louvor' && r.estudoTestemunho === 'Convidar o vizinho',
      'o roteiro chega igual para quem conduz e para quem é membro comum');
  }

  // ---------- visitante ----------
  console.log('\n  Visitante\n');
  // completa a célula 2 até os 20 membros (já tem lider2, membroa2, membrob2, membroc2)
  for (let i = 4; i <= 19; i++) await criar('cheia2n' + i, { nascimento: '2004-04-05', celula: token2 });
  ok((await dados(await pedir('/api/celula/' + encodeURIComponent(token2)))).pessoas === 20, 'a célula 2 chega aos 20 membros');
  const semVaga2 = await criar('semvaga2', { nascimento: '2004-04-05' });
  ok((await pedir('/api/celula', { acao: 'entrar', token: token2 }, semVaga2.cookie)).status === 409, 'sem vaga de membro, ninguém mais entra como membro');

  const visitantes2 = [];
  for (let i = 1; i <= 10; i++) {
    const v = await criar('visita2n' + i, { nascimento: '2004-04-05' });
    const entrou = await dados(await pedir('/api/celula', { acao: 'entrar', token: token2, visitante: true }, v.cookie));
    if (i === 1) ok(entrou.ok && entrou.papel === 'visitante', 'mesmo com a célula cheia de membros, quem só quer conhecer entra como visitante');
    visitantes2.push(v);
  }
  ok((await dados(await pedir('/api/celula/' + encodeURIComponent(token2)))).pessoas === 20, 'os visitantes não contam nas vagas de membro');
  const retratoComVisitante = (await propositos(lider2.cookie)).find((p) => p.id === id2);
  ok(retratoComVisitante.hoje.meta === 20, 'os visitantes ficam fora da meta do dia (não somam ao total de 30)');
  ok(retratoComVisitante.membros.find((m) => m.usuario === 'visita2n1').papel === 'visitante', 'quem conduz vê o papel de visitante de cada um');
  const visita11 = await criar('visita2n11', { nascimento: '2004-04-05' });
  ok((await pedir('/api/celula', { acao: 'entrar', token: token2, visitante: true }, visita11.cookie)).status === 409,
    'o 11º visitante não entra: o teto de visitantes é próprio e menor (10)');

  ok((await pedir('/api/celula', { acao: 'tornarMembro', id: id2 }, visitantes2[0].cookie)).status === 409,
    'virar membro respeita o limite de 20: a célula ainda está cheia de membros');
  ok((await celula2({ acao: 'remover', usuario: 'cheia2n19' }, lider2.cookie)).status === 200, 'o líder tira alguém para abrir uma vaga de membro');
  ok((await pedir('/api/celula', { acao: 'tornarMembro', id: id2 }, visitantes2[0].cookie)).status === 200, 'agora o primeiro visitante vira membro de verdade');
  ok((await propositos(visitantes2[0].cookie)).find((p) => p.id === id2).membros.find((m) => m.usuario === 'visita2n1').papel === '',
    'sem o papel de visitante, ela passa a contar como qualquer membro');

  // conta nova pelo link, já como visitante ("Só quero conhecer")
  const visitaConta = await pedir('/api/criar-conta', {
    usuario: 'visitaconta', senha: 'senha123', nome: 'Visita', email: 'visitaconta@teste.com',
    nascimento: '2004-04-05', consentimento: true, celula: token2, celulaVisitante: true,
  });
  const visitaContaCookie = biscoito(visitaConta);
  ok((await propositos(visitaContaCookie)).find((p) => p.id === id2).membros.find((m) => m.usuario === 'visitaconta').papel === 'visitante',
    'conta nova pelo link, marcando "só quero conhecer", já entra como visitante');

  // ---------- registro do encontro ----------
  console.log('\n  Registro do encontro\n');
  ok((await celula2({ acao: 'registrarEncontro', data: HOJE, presentes: ['membroa2'], visitantes: 1 }, mA.cookie)).status === 403, 'quem não conduz não registra o encontro');
  ok((await celula2({ acao: 'registrarEncontro', data: somaDiasTeste(HOJE, 1), presentes: [], visitantes: 0 }, lider2.cookie)).status === 400, 'data no futuro é recusada');
  ok((await celula2({ acao: 'registrarEncontro', data: somaDiasTeste(HOJE, -8), presentes: [], visitantes: 0 }, lider2.cookie)).status === 400, 'mais de 7 dias atrás é recusado');
  ok((await celula2({ acao: 'registrarEncontro', data: HOJE, presentes: [], visitantes: -1 }, lider2.cookie)).status === 400, 'número negativo de visitantes sem conta é recusado');
  ok((await celula2({ acao: 'registrarEncontro', data: HOJE, presentes: [], visitantes: 40 }, lider2.cookie)).status === 400, 'mais de 30 visitantes sem conta é recusado');
  ok((await celula2({ acao: 'registrarEncontro', data: HOJE, presentes: ['membroa2', 'fantasma'], visitantes: 2 }, lider2.cookie)).status === 200,
    'o líder registra o encontro de hoje (@ que não existe é ignorado)');

  const doMembroC = (await propositos(mC.cookie)).find((p) => p.id === id2);
  ok(!('ultimoEncontro' in doMembroC) && !('encontrosRegistrados' in doMembroC) && !('atencao' in doMembroC) && !('semanaLider' in doMembroC),
    'membro comum não recebe presença, contagem de encontros, semana do grupo nem atenção de ninguém');
  let doLider2 = (await propositos(lider2.cookie)).find((p) => p.id === id2);
  ok(doLider2.ultimoEncontro.data === HOJE && doLider2.ultimoEncontro.presentes === 1 && doLider2.ultimoEncontro.visitantes === 2,
    'quem conduz vê a data, quantos vieram e quantas pessoas sem conta');
  ok(doLider2.encontrosRegistrados === 1, 'e quantos encontros foram registrados nos últimos 60 dias');

  ok((await celula2({ acao: 'registrarEncontro', data: HOJE, presentes: ['membroa2', 'membrob2', 'membroc2'], visitantes: 0 }, mB.cookie)).status === 200,
    'o auxiliar também registra, e regrava por cima do mesmo dia');
  doLider2 = (await propositos(lider2.cookie)).find((p) => p.id === id2);
  ok(doLider2.ultimoEncontro.presentes === 3 && doLider2.ultimoEncontro.visitantes === 0 && doLider2.encontrosRegistrados === 1,
    'regravar no mesmo dia troca o registro, sem virar um segundo encontro');

  // ---------- o estudo da célula (À Mesa, docs/a-mesa-fase1.md, 6.4) ----------
  console.log('\n  O estudo da célula: só o líder prepara\n');
  const linhasDono = readFileSync(join(AQUI, 'ferramentas', 'estudo-exemplo.txt'), 'utf8').replace(/\s+$/, '').split('\n');
  linhasDono[linhasDono.length - 1] = 'Para guardar: ' + linhasDono[linhasDono.length - 1];
  const doDono = { acao: 'estudo', estudo: 'blocos', fonte: linhasDono.join('\n'), traducao: 'nbv', perguntas: ['O que mais marcou você?', 'O que muda na sua semana?'], base: '' };
  const retrato2 = async (cookie) => (await propositos(cookie)).find((p) => p.id === id2);
  ok((await retrato2(lider2.cookie)).euPreparoEstudo === true && (await retrato2(mB.cookie)).euPreparoEstudo === false && (await retrato2(mB.cookie)).euConduzo === true,
    'euPreparoEstudo vale só para o líder: o auxiliar conduz, mas não prepara');
  for (const [quem, cookie] of [['o auxiliar', mB.cookie], ['um membro', mC.cookie], ['a visitante', visitaContaCookie], ['a Ana, de outra célula', ana.cookie]]) {
    const r = await celula2(doDono, cookie);
    ok(r.status === 403 && (await dados(r)).erro === 'só o líder da célula prepara o estudo', quem + ' não prepara o estudo: 403, "só o líder da célula prepara o estudo"');
  }
  ok((await celula2({ acao: 'estudo', acolhida: 'Oi' }, mB.cookie)).status === 403, 'o auxiliar também não grava acolhida, adoração e testemunho');
  ok((await celula2({ acao: 'recado', texto: 'Encontro às 20h' }, mB.cookie)).status === 200, 'e continua com o recado (o registro do encontro já foi conferido acima)');

  const salvo = await dados(await celula2(doDono, lider2.cookie));
  const cartoes = (e) => (e && e.blocos ? e.blocos.filter((b) => b.t === 'versiculo').map((b) => b.ref) : []);
  ok(salvo.ok && salvo.estudo && salvo.estudo.tipo === 'blocos' && salvo.estudo.titulo === 'Batalha espiritual, vigilância e Armadura de Deus'
    && JSON.stringify(cartoes(salvo.estudo)) === JSON.stringify(['Efésios 6.12', '1 Pedro 5.8', 'Efésios 6.13-17', 'Efésios 6.18', 'Efésios 6.10']),
  'o líder salva o estudo do dono e recebe de volta o estudo com os 5 cartões');
  ok(salvo.estudo.fonte && !/A nossa luta|Orem no Espírito|Fortaleça-se/.test(salvo.estudo.fonte) && salvo.estudo.criadoPor === 'lider2' && salvo.estudo.criadoPorNome === 'lider2',
    'a fonte que volta ao líder já vem sem as citações da NVI, com o @ de quem preparou');
  const doMembroE = (await retrato2(mC.cookie)).estudo;
  ok(doMembroE && doMembroE.id === salvo.estudo.id && doMembroE.blocos.length === 32 && !('fonte' in doMembroE) && !('texto' in doMembroE)
    && JSON.stringify(doMembroE.perguntas) === JSON.stringify(doDono.perguntas) && doMembroE.traducao === 'nbv', 'o membro recebe as partes e as perguntas, mas não a fonte');
  ok(!/A nossa luta|Orem no Espírito/.test(JSON.stringify(doMembroE)), 'no que o membro recebe não há texto bíblico de outra tradução');
  ok(!('fonte' in (await retrato2(mB.cookie)).estudo), 'o auxiliar também não recebe a fonte: ele vê o estudo como membro');
  const doVisitante = (await retrato2(visitaContaCookie)).estudo;
  ok(doVisitante && doVisitante.id === salvo.estudo.id && doVisitante.blocos.length === 32, 'a visitante também vê o estudo');
  const doLiderE = (await retrato2(lider2.cookie)).estudo;
  ok(doLiderE.fonte === salvo.estudo.fonte && doLiderE.criadoPorNome === 'lider2', 'o líder recebe a fonte, para "Mudar o estudo"');

  const recusa = async (corpo) => { const r = await celula2({ acao: 'estudo', ...corpo }, lider2.cookie); return r.status + ' ' + (await dados(r)).erro; };
  ok(await recusa({ estudo: 'blocos', fonte: 'x'.repeat(10001) }) === '400 o estudo tem no máximo 10.000 caracteres', 'texto puro de 10.001 caracteres: 400');
  ok(await recusa({ ...doDono, perguntas: ['1', '2', '3', '4', '5', '6', '7'] }) === '400 escolha até 6 perguntas', '7 perguntas: 400');
  ok(await recusa({ ...doDono, traducao: 'nvi' }) === '400 escolha a NBV ou a Bíblia Livre', 'a tradução "nvi": 400');
  ok(await recusa({ estudo: 'blocos', fonte: '1. Um tópico logo de cara\nTexto' }) === '400 escreva o título na primeira linha, com até 120 caracteres', 'o estudo sem título: 400');
  ok((await retrato2(mC.cookie)).estudo.id === salvo.estudo.id, 'as recusas não mexeram no estudo');

  // só os 4 Ws: o estudo fica
  ok((await celula2({ acao: 'estudo', acolhida: 'O que fez você rir nos últimos dias?' }, lider2.cookie)).status === 200
    && (await retrato2(mC.cookie)).estudo.id === salvo.estudo.id && (await retrato2(mC.cookie)).estudoAcolhida === 'O que fez você rir nos últimos dias?',
  'gravar só a acolhida não tira o estudo');
  // mudar o mesmo estudo e depois um estudo novo: o anterior fica na tabela
  const mudado = await dados(await celula2({ ...doDono, traducao: 'blivre', base: salvo.estudo.id }, lider2.cookie));
  ok(mudado.estudo.id === salvo.estudo.id && mudado.estudo.traducao === 'blivre' && mudado.estudo.editadoEm, '"Mudar o estudo" com a base atual atualiza o mesmo estudo');
  const segundo = await dados(await celula2({ acao: 'estudo', estudo: 'trecho', ref: 'Rm 8:28–30', fonte: 'Tudo coopera para o bem.' }, lider2.cookie));
  ok(segundo.estudo && segundo.estudo.id !== salvo.estudo.id && segundo.estudo.ref === 'Romanos 8.28-30' && (await retrato2(mC.cookie)).estudo.texto === 'Tudo coopera para o bem.',
    'um estudo novo passa a ser o atual');
  {
    const db = new DatabaseSync(join(PASTA, 'caminho.db'), { readOnly: true });
    try {
      const linhas = db.prepare('SELECT id, criado_por, atual_ate FROM celula_estudos WHERE proposito = ? ORDER BY criado_em').all(id2);
      ok(linhas.length === 2 && linhas[0].id === salvo.estudo.id && linhas[0].atual_ate !== '' && linhas[1].atual_ate === '' && linhas.every((l) => l.criado_por === 'lider2'),
        'o segundo estudo deixa duas linhas na tabela: o anterior fica, marcado como não atual');
      ok(db.prepare('SELECT estudo_id FROM propositos WHERE id = ?').get(id2).estudo_id === segundo.estudo.id, 'a célula aponta para o estudo atual');
    } finally { db.close(); }
  }
  ok((await celula2({ acao: 'estudo', estudo: '' }, lider2.cookie)).status === 200 && (await retrato2(mC.cookie)).estudo === null, 'o líder tira o estudo');
  {
    const db = new DatabaseSync(join(PASTA, 'caminho.db'), { readOnly: true });
    try { ok(db.prepare('SELECT count(*) n FROM celula_estudos WHERE proposito = ?').get(id2).n === 2, 'tirar o estudo deixa as linhas no banco'); } finally { db.close(); }
  }

  // quem preparou apaga a conta: o estudo fica na célula, com o @
  const liderE = await criar('lidere', { nascimento: '2004-04-05' });
  const idE = (await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Estudo fica' }, liderE.cookie))).proposito.id;
  const tokenE = new URL((await dados(await pedir('/api/celula', { acao: 'link', id: idE }, liderE.cookie))).link).searchParams.get('celula');
  const mE1 = await criar('membroe1', { nascimento: '2004-04-05', celula: tokenE });
  await criar('membroe2', { nascimento: '2004-04-05', celula: tokenE });
  ok((await pedir('/api/celula', { ...doDono, id: idE }, liderE.cookie)).status === 200, 'outro líder salva um estudo');
  ok((await pedir('/api/apagar-conta', { senha: 'senha123' }, liderE.cookie)).status === 200, 'e apaga a própria conta');
  const ficou = (await propositos(mE1.cookie)).find((p) => p.id === idE);
  ok(ficou && ficou.estudo && ficou.estudo.criadoPor === 'lidere' && ficou.estudo.criadoPorNome === '@lidere' && ficou.estudo.blocos.length === 32,
    'o estudo continua na célula, com o @ de quem preparou');
  {
    // o @ de quem apagou a conta fica guardado: outra pessoa não vira a líder nem a autora dos estudos
    const intruso = await criar('lidere', { nascimento: '2004-04-05' });
    ok(intruso.status === 400 && intruso.corpo.erro === 'esse @ já existe', 'uma conta nova não pega o @ de quem apagou a conta e deixou a célula e o estudo');
    ok((await propositos(mE1.cookie)).find((p) => p.id === idE).estudo.criadoPorNome === '@lidere', '"preparado por" continua com o @');
  }
  {
    // o líder que saiu da célula não prepara mais o estudo dela
    const liderS = await criar('liders', { nascimento: '2004-04-05' });
    const idS = (await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Quem saiu' }, liderS.cookie))).proposito.id;
    const tokenS = new URL((await dados(await pedir('/api/celula', { acao: 'link', id: idS }, liderS.cookie))).link).searchParams.get('celula');
    const mS1 = await criar('membros1', { nascimento: '2004-04-05', celula: tokenS });
    await criar('membros2', { nascimento: '2004-04-05', celula: tokenS });
    ok((await pedir('/api/propositos', { acao: 'sair', id: idS }, liderS.cookie)).status === 200, 'o líder sai da própria célula');
    const r = await pedir('/api/celula', { ...doDono, id: idS }, liderS.cookie);
    ok(r.status === 403 && (await propositos(mS1.cookie)).find((p) => p.id === idS).estudo === null, 'e não grava mais o estudo dela: 403');
    ok((await pedir('/api/celula', { acao: 'recado', id: idS, texto: 'Oi' }, liderS.cookie)).status === 403 && (await pedir('/api/celula', { acao: 'remover', id: idS, usuario: 'membros2' }, liderS.cookie)).status === 403,
      'nem escreve o recado ou tira alguém: quem saiu não lidera');

    // quem só foi convidado (e não aceitou) não recebe o estudo
    const amiga = await criar('amigas', { nascimento: '2004-04-05' });
    await pedir('/api/amizade', { acao: 'pedir', usuario: 'amigas' }, mS1.cookie);
    await pedir('/api/amizade', { acao: 'aceitar', usuario: 'membros1' }, amiga.cookie);
    const liderS2 = await criar('liders2', { nascimento: '2004-04-05' });
    const idS2 = (await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Convite' }, liderS2.cookie))).proposito.id;
    const tokenS2 = new URL((await dados(await pedir('/api/celula', { acao: 'link', id: idS2 }, liderS2.cookie))).link).searchParams.get('celula');
    await pedir('/api/celula', { acao: 'entrar', token: tokenS2 }, mS1.cookie);
    ok((await pedir('/api/celula', { ...doDono, id: idS2 }, liderS2.cookie)).status === 200, 'o líder de outra célula salva o estudo');
    ok((await pedir('/api/propositos', { acao: 'convidar', id: idS2, usuario: 'amigas' }, mS1.cookie)).status === 200, 'um membro convida uma amiga para essa célula');
    const daAmiga = (await propositos(amiga.cookie)).find((p) => p.id === idS2);
    ok(daAmiga && daAmiga.euConvidado === true && daAmiga.estudo === null && daAmiga.estudoAcolhida === '', 'antes de aceitar, a convidada não recebe o estudo');
    ok((await propositos(mS1.cookie)).find((p) => p.id === idS2).estudo.blocos.length === 32, 'quem é da célula continua recebendo');

    // o estudo usado num encontro: "Mudar" vira preparar o próximo, e o usado fica
    const deS2 = async (cookie) => (await propositos(cookie)).find((p) => p.id === idS2).estudo;
    const antes = await deS2(liderS2.cookie);
    ok(antes.usado === false, 'antes do encontro, o estudo ainda não foi usado');
    ok((await pedir('/api/celula', { acao: 'registrarEncontro', id: idS2, data: HOJE, presentes: ['membros1'], visitantes: 0 }, liderS2.cookie)).status === 200, 'o líder registra o encontro');
    ok((await deS2(liderS2.cookie)).usado === true && !('usado' in (await deS2(mS1.cookie))), 'depois dele, o líder vê o estudo como usado (só ele recebe isso)');
    const proximo = await dados(await pedir('/api/celula', { ...doDono, id: idS2, base: antes.id, fonte: doDono.fonte.replace(/^Estudo: .*/, 'O próximo estudo') }, liderS2.cookie));
    ok(proximo.estudo && proximo.estudo.id !== antes.id && proximo.estudo.titulo === 'O próximo estudo' && proximo.estudo.usado === false, 'salvar com a base do estudo usado cria o estudo novo');
    {
      const db = new DatabaseSync(join(PASTA, 'caminho.db'), { readOnly: true });
      try {
        const velho = db.prepare('SELECT titulo, atual_ate FROM celula_estudos WHERE id = ?').get(antes.id);
        ok(velho && velho.titulo === 'Batalha espiritual, vigilância e Armadura de Deus' && velho.atual_ate !== '', 'e o estudo usado fica na tabela, inteiro, para o histórico');
      } finally { db.close(); }
    }
    // gravar o estudo tem limite por minuto
    const status = [];
    for (let i = 0; i < 21; i++) status.push((await pedir('/api/celula', { acao: 'estudo', id: idS2, estudo: 'semana' }, liderS2.cookie)).status);
    ok(status.filter((x) => x === 429).length >= 1 && status.slice(0, 10).every((x) => x === 200), 'gravar o estudo mais de 20 vezes num minuto: 429');
  }

  // ---------- Fase 2: o combinado, o estudo do encontro e os estudos anteriores ----------
  // docs/a-mesa-fase2.md, seções 3.2 a 3.6 e 9.4
  console.log('\n  O estudo da célula: guardar (Fase 2)\n');
  {
    const liderF = await criar('liderf', { nascimento: '2004-04-05' });
    const idF = (await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Guardar' }, liderF.cookie))).proposito.id;
    const tokenF = new URL((await dados(await pedir('/api/celula', { acao: 'link', id: idF }, liderF.cookie))).link).searchParams.get('celula');
    const anaF = await criar('anaf', { nascimento: '2004-04-05', celula: tokenF });
    const veraF = await criar('veraf', { nascimento: '2004-04-05' });
    await pedir('/api/celula', { acao: 'entrar', token: tokenF, visitante: true }, veraF.cookie);
    const celulaF = (corpo, cookie) => pedir('/api/celula', { id: idF, ...corpo }, cookie);
    const retratoF = async (cookie) => (await propositos(cookie)).find((p) => p.id === idF);
    const estudos = (q, cookie) => pedir('/api/estudos?' + q, null, cookie);

    const comb201 = await celulaF({ ...doDono, combinado: 'x'.repeat(201) }, liderF.cookie);
    ok(comb201.status === 400 && (await dados(comb201)).erro === 'o combinado tem no máximo 200 caracteres', 'o combinado de 201 caracteres: 400');
    const s1 = (await dados(await celulaF({ ...doDono, combinado: 'Ligar para alguém que faltou.', testemunho: 'Orem pelo Jonas, que está doente.' }, liderF.cookie))).estudo;
    ok(s1 && s1.combinado === 'Ligar para alguém que faltou.' && (await retratoF(anaF.cookie)).estudo.combinado === 'Ligar para alguém que faltou.', 'o líder salva o estudo com o combinado, e a célula vê');

    // o registro sem o campo "estudo" (o app antigo): o servidor liga o estudo atual
    const caixa = () => {
      const db = new DatabaseSync(join(PASTA, 'caminho.db'), { readOnly: true });
      try { return db.prepare("SELECT count(*) n FROM push_caixa WHERE usuario IN ('anaf', 'veraf')").get().n; } finally { db.close(); }
    };
    const antesDaCaixa = caixa();
    const reg = await dados(await celulaF({ acao: 'registrarEncontro', data: HOJE, presentes: ['liderf'], visitantes: 1 }, liderF.cookie));
    ok(reg.ok && reg.encontro && reg.encontro.data === HOJE && reg.encontro.estudo === s1.id && reg.estudo && reg.estudo.id === s1.id
      && reg.estudo.titulo === 'Batalha espiritual, vigilância e Armadura de Deus' && JSON.stringify(reg.estudo.refs) === JSON.stringify(cartoes(s1)), 'sem o campo, o encontro fica ligado ao estudo atual, e a resposta diz qual');
    // a Ana entrou hoje: quem entrou no próprio dia do encontro não faltou, a mesma regra de
    // "Precisam de atenção" (quem não veio, com uma pessoa de verdade, está no teste.mjs e no
    // teste-estudo-historico, onde as entradas são de dias antes)
    ok(Array.isArray(reg.faltaram) && reg.faltaram.length === 0, 'a resposta traz quem não veio: ninguém, porque a Ana entrou hoje e a visitante não é cobrada');
    await dormir(300);
    ok(caixa() === antesDaCaixa, 'nada chega ao sino de quem faltou: o app não avisa ninguém sozinho');
    const outraCelula = await celulaF({ acao: 'registrarEncontro', data: HOJE, presentes: [], visitantes: 0, estudo: salvo.estudo.id }, liderF.cookie);
    ok(outraCelula.status === 400 && (await dados(outraCelula)).erro === 'escolha um estudo desta célula preparado até o dia do encontro', 'com o estudo de outra célula: 400');
    ok((await celulaF({ acao: 'registrarEncontro', data: HOJE, presentes: [], visitantes: 0, estudo: s1.id }, anaF.cookie)).status === 403, 'membro não registra nem troca o estudo do registro: 403');
    const fora = await dados(await celulaF({ acao: 'registrarEncontro', data: HOJE, presentes: ['liderf', 'anaf'], visitantes: 1, estudo: '-' }, liderF.cookie));
    ok(fora.encontro.estudo === '-' && fora.estudo === null && fora.faltaram.length === 0, 'regravar com "outro estudo, fora do app" troca a ligação; com todos presentes, ninguém faltou');
    const doLiderF = await retratoF(liderF.cookie);
    ok(doLiderF.registro && doLiderF.registro.dias.length === 8 && doLiderF.registro.dias[0].estudo === '-' && doLiderF.registro.dias[0].padrao === s1.id
      && doLiderF.registro.estudos.length === 1 && doLiderF.registro.estudos[0].id === s1.id && doLiderF.ultimoEncontro.estudo === null,
    'quem conduz recebe a folha de registro: os 8 dias, com o estudo de cada um, e os estudos para escolher');
    ok(!('registro' in (await retratoF(anaF.cookie))) && !('registro' in (await retratoF(veraF.cookie))), 'membro e visitante não recebem a folha de registro');
    await celulaF({ acao: 'registrarEncontro', data: HOJE, presentes: ['liderf'], visitantes: 1, estudo: s1.id }, liderF.cookie);
    ok((await retratoF(liderF.cookie)).ultimoEncontro.estudo.id === s1.id, 'o último encontro leva o estudo, para a mensagem de quem faltou');

    // o próximo estudo: linha nova, os 4 Ws vazios, e o combinado de antes na acolhida
    const s2 = (await dados(await celulaF({ acao: 'estudo', estudo: 'trecho', ref: 'Romanos 8.28-30', base: s1.id, combinado: 'Orar todo dia por alguém que ainda não conhece Jesus.' }, liderF.cookie))).estudo;
    ok(s2 && s2.id !== s1.id, 'com o estudo usado, salvar cria o próximo');
    const daAnaF = await retratoF(anaF.cookie);
    const daVeraF = await retratoF(veraF.cookie);
    ok(daAnaF.estudoTestemunho === '' && daAnaF.estudoAcolhida === '' && !JSON.stringify(daVeraF).includes('Orem pelo Jonas'), 'o estudo novo zera os 4 Ws: o testemunho com nomes não passa para a semana seguinte');
    for (const [quem, r] of [['a Ana', daAnaF], ['a visitante', daVeraF]]) {
      ok(JSON.stringify(r.combinadoAnterior) === JSON.stringify({ texto: 'Ligar para alguém que faltou.', data: HOJE, estudo: s1.id }), quem + ' recebe "na semana passada combinamos" com o combinado de antes');
    }
    ok(daAnaF.temAnteriores === true && daVeraF.temAnteriores === false && daAnaF.daMae === null && daVeraF.daMae === null, 'só quem faz parte da célula fica sabendo que há estudos anteriores');

    // GET /api/estudos: a lista e a leitura
    const listaAna = await estudos('celula=' + idF, anaF.cookie);
    const corpoLista = await dados(listaAna);
    ok(listaAna.status === 200 && corpoLista.estudos.length === 1 && corpoLista.estudos[0].id === s1.id && corpoLista.estudos[0].dataDe === 'encontro' && corpoLista.estudos[0].data === HOJE
      && corpoLista.estudos[0].criadoPorNome === 'liderf' && corpoLista.mais === false && corpoLista.celula.titulo === 'Guardar', 'a Ana lê a lista de estudos anteriores');
    ok(!('blocos' in corpoLista.estudos[0]) && !('fonte' in corpoLista.estudos[0]) && !('combinado' in corpoLista.estudos[0]) && !/pessoas|encontros/.test(JSON.stringify(corpoLista)),
      'a lista não leva o estudo inteiro, nem o combinado, nem a presença');
    const listaVera = await estudos('celula=' + idF, veraF.cookie);
    ok(listaVera.status === 403 && (await dados(listaVera)).erro === 'quem está conhecendo a célula vê só o estudo atual', 'a visitante recebe 403 na lista');
    ok((await estudos('celula=' + idF, ana.cookie)).status === 404 && (await estudos('celula=' + idF)).status === 401 && (await estudos('celula=nenhuma', anaF.cookie)).status === 404,
      'de fora da célula, 404; sem entrar, 401');
    ok((await estudos('celula=' + idF + '&de=mae', anaF.cookie)).status === 404 && (await estudos('celula=' + idF + 'x'.repeat(60), anaF.cookie)).status === 404,
      'a lista da célula de origem, numa célula sem mãe, e um id de célula comprido demais: 404');
    ok((await pedir('/api/estudos?celula=' + idF, {}, anaF.cookie)).status === 405, 'a rota só lê: POST dá 405');

    const lerS1 = async (cookie, extra = '') => { const r = await estudos('estudo=' + s1.id + extra, cookie); return { status: r.status, corpo: await dados(r) }; };
    const doLiderS1 = await lerS1(liderF.cookie);
    ok(doLiderS1.status === 200 && doLiderS1.corpo.celula === idF && doLiderS1.corpo.atual === false && doLiderS1.corpo.usarComoBase === true && doLiderS1.corpo.estudo.fonte
      && !/A nossa luta|Fortaleça-se/.test(doLiderS1.corpo.estudo.fonte) && doLiderS1.corpo.estudo.combinado === 'Ligar para alguém que faltou.'
      && JSON.stringify(doLiderS1.corpo.encontros) === JSON.stringify([{ data: HOJE, pessoas: 2 }]),
    'o líder abre o anterior com "Usar como base" e a fonte limpa, e vê quantas pessoas vieram');
    const daAnaS1 = await lerS1(anaF.cookie, '&celula=' + idF);
    ok(daAnaS1.status === 200 && daAnaS1.corpo.usarComoBase === false && !('fonte' in daAnaS1.corpo.estudo) && daAnaS1.corpo.encontros.length === 0 && daAnaS1.corpo.estudo.blocos.length === 32,
      'a Ana lê o anterior, sem a fonte e sem a presença');
    ok(![doLiderS1, daAnaS1].some((r) => /Orem pelo Jonas|estudoAcolhida|estudoTestemunho/.test(JSON.stringify(r.corpo))), 'nenhuma leitura leva acolhida, adoração ou testemunho');
    ok((await lerS1(veraF.cookie)).status === 403 && (await lerS1(ana.cookie)).status === 404 && (await estudos('estudo=enada', anaF.cookie)).status === 404,
      'a visitante recebe 403 no anterior; de fora, ou um estudo que não existe, 404');
    const atualDaVera = await dados(await estudos('estudo=' + s2.id, veraF.cookie));
    ok(atualDaVera.atual === true && atualDaVera.estudo.id === s2.id && atualDaVera.estudo.combinado === 'Orar todo dia por alguém que ainda não conhece Jesus.', 'a visitante lê o estudo atual pela rota também');
  }

  // ---------- quem precisa de atenção ----------
  console.log('\n  Quem precisa de atenção\n');

  // faltou aos 2 últimos encontros (e quem conduz nunca aparece na lista)
  const liderA = await criar('lideratt', { nascimento: '2004-04-05' });
  const criadaA = await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Atenção' }, liderA.cookie));
  const idA = criadaA.proposito.id;
  const { link: linkA } = await dados(await pedir('/api/celula', { acao: 'link', id: idA }, liderA.cookie));
  const tokenA = new URL(linkA).searchParams.get('celula');
  const celulaA = (corpo, cookie) => pedir('/api/celula', { id: idA, ...corpo }, cookie);
  await criar('presenteatt', { nascimento: '2004-04-05', celula: tokenA });
  await criar('sumidoatt', { nascimento: '2004-04-05', celula: tokenA });
  await celulaA({ acao: 'auxiliar', usuario: 'presenteatt', sim: true }, liderA.cookie);
  await celulaA({ acao: 'registrarEncontro', data: HOJE, presentes: ['presenteatt'], visitantes: 0 }, liderA.cookie);
  await celulaA({ acao: 'registrarEncontro', data: somaDiasTeste(HOJE, -7), presentes: ['presenteatt'], visitantes: 0 }, liderA.cookie);
  const retratoA = (await propositos(liderA.cookie)).find((p) => p.id === idA);
  // Quem entrou hoje não "faltou" ao encontro de 7 dias atrás: só contam encontros depois da entrada.
  // O caso de quem faltou de verdade está em teste-propositos-regras.mjs (quemPrecisaDeAtencao).
  ok(Array.isArray(retratoA.atencao) && !retratoA.atencao.some((x) => x.usuario === 'sumidoatt'),
    'quem entrou depois dos encontros não aparece como quem faltou');
  ok(!retratoA.atencao.some((x) => x.usuario === 'presenteatt'), 'quem esteve num dos dois últimos não aparece');
  ok(!retratoA.atencao.some((x) => x.usuario === 'lideratt' || x.usuario === 'presenteatt'), 'quem conduz (líder e auxiliar) nunca aparece na própria lista');

  // sem ler há 5 dias ou mais (sem nenhum encontro registrado, só a leitura conta)
  const liderB = await criar('liderdias', { nascimento: '2004-04-05' });
  const criadaB = await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Sem ler' }, liderB.cookie));
  const idB = criadaB.proposito.id;
  const { link: linkB } = await dados(await pedir('/api/celula', { acao: 'link', id: idB }, liderB.cookie));
  const tokenB = new URL(linkB).searchParams.get('celula');
  await criar('recemchegada', { nascimento: '2004-04-05', celula: tokenB });
  const semLer = await criar('semlerdias', { nascimento: '2004-04-05', celula: tokenB });
  await pedir('/api/estado', { atualizadoEm: Date.now(), lidos: [1], marcadoEm: { 1: somaDiasTeste(HOJE, -6) } }, semLer.cookie);
  const retratoB = (await propositos(liderB.cookie)).find((p) => p.id === idB);
  ok(!retratoB.atencao.some((x) => x.usuario === 'recemchegada'), 'quem acabou de entrar e nunca leu ainda não aparece: a conta começa na entrada, não do zero');
  ok(retratoB.atencao.some((x) => x.usuario === 'semlerdias' && x.motivo === 'sem ler há 6 dias'), 'quem não lê há 5 dias ou mais aparece com o motivo certo');

  // no máximo 5 pessoas na lista, mesmo com mais gente sumida
  const liderC = await criar('lidermax', { nascimento: '2004-04-05' });
  const criadaC = await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Máximo' }, liderC.cookie));
  const idC = criadaC.proposito.id;
  const { link: linkC } = await dados(await pedir('/api/celula', { acao: 'link', id: idC }, liderC.cookie));
  const tokenC = new URL(linkC).searchParams.get('celula');
  for (let i = 1; i <= 7; i++) {
    const m = await criar('summax' + i, { nascimento: '2004-04-05', celula: tokenC });
    await pedir('/api/estado', { atualizadoEm: Date.now(), lidos: [1], marcadoEm: { 1: somaDiasTeste(HOJE, -6) } }, m.cookie);
  }
  const retratoC = (await propositos(liderC.cookie)).find((p) => p.id === idC);
  ok(retratoC.atencao.length === 5, 'a lista de atenção nunca passa de 5 pessoas, mesmo com mais gente sumida');
} finally {
  servidor.kill();
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
