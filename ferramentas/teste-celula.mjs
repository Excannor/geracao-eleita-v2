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
