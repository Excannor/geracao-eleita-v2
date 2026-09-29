// Confere o discipulado 1 a 1 (Mateus 28.19-20; 2 Timóteo 2.2): convite só entre amigos, os
// dois papéis, os limites (1 discipulador, 12 discípulos), "mostrar" controlando exatamente o
// que o discipulador vê, nenhum texto do discípulo aparecendo, encontro só com a data, encerrar,
// o marco "discipula" automático, a cadeia (só o número) e a limpeza ao apagar a conta.
// Uso: node ferramentas/teste-discipulado.mjs
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8210;
const PASTA = join(tmpdir(), 'cc-discipulado');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// ---------- regras puras (discipulado.mjs), sem servidor ----------
console.log('\n  Discipulado: regras puras\n');
{
  const D = await import(pathToFileURL(join(AQUI, 'discipulado.mjs')).href);
  ok(D.papelValido('discipulador') && D.papelValido('discipulo') && !D.papelValido('outro'), 'só os dois papéis são válidos');
  ok(JSON.stringify(D.mostrarValido({ passos: 1, marcos: 'sim' })) === JSON.stringify({ passos: true, semana: false, marcos: true }),
    '"mostrar" vira sempre três booleanos, nunca outra chave');

  const datas = (...d) => new Set(d);
  ok(D.diasLidosNaSemana(datas('2026-03-20', '2026-03-19', '2026-03-13'), '2026-03-20') === 2,
    'conta só os dias dos últimos 7 (13 de março, o 8º dia atrás, fica fora)');
  ok(D.diasLidosNaSemana(datas('2026-03-14'), '2026-03-20') === 1, 'o 7º dia atrás (14 de março) ainda entra');
  ok(D.diasLidosNaSemana(datas(), '2026-03-20') === 0, 'sem nenhuma leitura, a semana é zero');

  ok(D.dataEncontroValida('2026-03-20', '2026-03-20'), 'hoje vale para o encontro');
  ok(D.dataEncontroValida('2026-03-13', '2026-03-20'), 'exatamente 7 dias atrás vale');
  ok(!D.dataEncontroValida('2026-03-12', '2026-03-20'), 'mais de 7 dias atrás não vale');
  ok(!D.dataEncontroValida('2026-03-21', '2026-03-20'), 'data no futuro não vale');
  ok(!D.dataEncontroValida('não é data', '2026-03-20'), 'texto que não é data não vale');

  ok(JSON.stringify(D.marcosComData({ decisao: '2026-01-01', batismo: '', celula: undefined })) === JSON.stringify({ decisao: '2026-01-01' }),
    'só entram os marcos que têm data');

  const semNada = D.resumoParaDiscipulador({ mostrar: { passos: false, semana: false, marcos: false }, passos: 5, semana: 4, marcos: { decisao: '2026-01-01' }, acompanha: 2 });
  ok(Object.keys(semNada).length === 0, 'com tudo desligado, o resumo não leva nenhuma chave');
  const soPassos = D.resumoParaDiscipulador({ mostrar: { passos: true, semana: false, marcos: false }, passos: 5, semana: 4 });
  ok(JSON.stringify(soPassos) === JSON.stringify({ passos: 5 }), 'só "passos" ligado leva só os passos');
  const comMarcosSemCadeia = D.resumoParaDiscipulador({ mostrar: { passos: false, semana: false, marcos: true }, marcos: { decisao: '2026-01-01' }, acompanha: 0 });
  ok('marcos' in comMarcosSemCadeia && !('acompanha' in comMarcosSemCadeia), 'sem discípulos próprios, a cadeia não aparece mesmo com "marcos" ligado');
  const comCadeia = D.resumoParaDiscipulador({ mostrar: { passos: false, semana: false, marcos: true }, marcos: {}, acompanha: 3 });
  ok(comCadeia.acompanha === 3, 'com "marcos" ligado e discípulos próprios, a cadeia mostra só o número');
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
  return { cookie: biscoito(r), corpo: await dados(r), status: r.status };
};
const amizade = (acao, usuario, cookie) => pedir('/api/amizade', { acao, usuario }, cookie);
const serAmigos = async (a, b) => {
  await amizade('pedir', b.u, a.cookie);
  await amizade('aceitar', a.u, b.cookie);
};
// Sempre lê o corpo, mesmo quando só o status importa: uma resposta não consumida pode
// prender a conexão do fetch e derrubar o pedido seguinte na mesma porta.
const disc = async (corpo, cookie) => {
  const r = await pedir('/api/discipulado', corpo, cookie);
  return { status: r.status, corpo: await dados(r) };
};
const ver = async (cookie) => (await disc(null, cookie)).corpo;

const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const somaDiasTeste = (texto, n) => { const d = new Date(texto + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const HOJE = hoje();

try {
  console.log('\n  Convite: só entre amigos, e nos dois papéis\n');
  const ana = { u: 'ana', ...(await criar('ana')) };
  const bia = { u: 'bia', ...(await criar('bia')) };
  const semAmigo = await disc({ acao: 'convidar', usuario: 'bia', papel: 'discipulador' }, ana.cookie);
  ok(semAmigo.status === 403, 'sem ser amigo, o convite é recusado');

  await serAmigos(ana, bia);
  ok((await disc({ acao: 'convidar', usuario: 'fantasma', papel: 'discipulador' }, ana.cookie)).status === 404, '@ que não existe é recusado');
  ok((await disc({ acao: 'convidar', usuario: 'bia', papel: 'outro' }, ana.cookie)).status === 400, 'papel inválido é recusado');

  // Ana convida Bia dizendo "quero te acompanhar" (Ana será a discipuladora)
  const convite1 = (await disc({ acao: 'convidar', usuario: 'bia', papel: 'discipulador' }, ana.cookie)).corpo;
  ok(convite1.ok && convite1.id, 'Ana convida Bia para acompanhar (papel: discipulador)');
  const pedidosBia = (await ver(bia.cookie)).pedidos;
  ok(pedidosBia.length === 1 && pedidosBia[0].de.usuario === 'ana' && pedidosBia[0].papel === 'discipulador', 'Bia vê o pedido, com o papel que Ana escolheu para si');
  ok((await ver(ana.cookie)).pedidos.length === 0, 'quem convidou não vê o próprio convite como pedido recebido');

  const denovo = await disc({ acao: 'convidar', usuario: 'bia', papel: 'discipulo' }, ana.cookie);
  ok(denovo.status === 400, 'não dá para convidar de novo enquanto o primeiro convite espera');

  ok((await disc({ acao: 'aceitar', id: convite1.id, mostrar: { passos: true, semana: true, marcos: false } }, ana.cookie)).status === 404,
    'quem convidou não pode aceitar o próprio convite');
  const aceite1 = await disc({ acao: 'aceitar', id: convite1.id, mostrar: { passos: true, semana: true, marcos: false } }, bia.cookie);
  ok(aceite1.status === 200, 'Bia aceita, escolhendo o que mostra');

  const deAna = await ver(ana.cookie);
  ok(deAna.meusDiscipulos.length === 1 && deAna.meusDiscipulos[0].usuario === 'bia', 'Ana passa a ver a Bia como discípula');
  ok(deAna.meusDiscipulos[0].id === convite1.id, 'a tela do guia já vem com o id da relação, sem precisar guardar o da resposta do convite');
  const deBia = await ver(bia.cookie);
  ok(deBia.meuDiscipulador && deBia.meuDiscipulador.usuario === 'ana', 'Bia vê a Ana como quem a acompanha');
  ok(deBia.meuDiscipulador.id === convite1.id, 'a tela do discípulo também vem com o id, para poder mostrar, marcar encontro e encerrar');
  ok(deBia.meuDiscipulador.mostrar.passos === true && deBia.meuDiscipulador.mostrar.marcos === false, 'Bia vê de volta o que ela mesma escolheu mostrar');

  // ---------- o outro papel do convite ----------
  console.log('\n  O outro papel: "quero que você me acompanhe"\n');
  const caio = { u: 'caio', ...(await criar('caio')) };
  const duda = { u: 'duda', ...(await criar('duda')) };
  await serAmigos(caio, duda);
  // Caio pede para Duda acompanhá-lo: Caio escolhe o papel "discipulo" para si mesmo
  const convite2 = (await disc({ acao: 'convidar', usuario: 'duda', papel: 'discipulo' }, caio.cookie)).corpo;
  const pedidosDuda = (await ver(duda.cookie)).pedidos;
  ok(pedidosDuda[0].papel === 'discipulo', 'Duda vê que quem convidou (Caio) quer ser o discípulo');
  await disc({ acao: 'aceitar', id: convite2.id, mostrar: {} }, duda.cookie);
  const deDuda = await ver(duda.cookie);
  ok(deDuda.meusDiscipulos.some((x) => x.usuario === 'caio'), 'Duda passa a acompanhar o Caio');
  ok((await ver(caio.cookie)).meuDiscipulador.usuario === 'duda', 'Caio vê a Duda como quem o acompanha');

  console.log('\n  Recusar\n');
  const eva = { u: 'eva', ...(await criar('eva')) };
  await serAmigos(ana, eva);
  const conviteR = (await disc({ acao: 'convidar', usuario: 'eva', papel: 'discipulador' }, ana.cookie)).corpo;
  ok((await disc({ acao: 'recusar', id: conviteR.id }, ana.cookie)).status === 200, 'quem convidou não pode recusar o próprio convite (não faz nada)');
  ok((await ver(eva.cookie)).pedidos.length === 1, 'e o pedido continua esperando a Eva');
  ok((await disc({ acao: 'recusar', id: conviteR.id }, eva.cookie)).status === 200, 'Eva recusa');
  ok((await ver(eva.cookie)).pedidos.length === 0, 'o pedido recusado some');
  ok((await ver(ana.cookie)).meusDiscipulos.every((x) => x.usuario !== 'eva'), 'e não vira discipulado nenhum');
  // depois de recusado, pode convidar de novo
  ok((await disc({ acao: 'convidar', usuario: 'eva', papel: 'discipulador' }, ana.cookie)).status === 200, 'depois de recusado, dá para convidar de novo');

  // ---------- limite: 1 discipulador por pessoa ----------
  console.log('\n  Limite: 1 discipulador por pessoa\n');
  const fabi = { u: 'fabi', ...(await criar('fabi')) };
  await serAmigos(fabi, bia); // bia já tem discipulador (ana)
  const tentaFabi = await disc({ acao: 'convidar', usuario: 'bia', papel: 'discipulador' }, fabi.cookie);
  ok(tentaFabi.status === 409 && /já tem alguém acompanhando/.test(tentaFabi.corpo.erro || ''), 'quem já tem discipulador não pode ser convidado de novo como discípulo');

  // ---------- limite: 12 discípulos por discipulador ----------
  console.log('\n  Limite: 12 discípulos por discipulador\n');
  const lider = { u: 'liderd', ...(await criar('liderd')) };
  for (let i = 1; i <= 12; i++) {
    const d = { u: 'disc' + i, ...(await criar('disc' + i)) };
    await serAmigos(lider, d);
    const conv = (await disc({ acao: 'convidar', usuario: d.u, papel: 'discipulador' }, lider.cookie)).corpo;
    ok((await disc({ acao: 'aceitar', id: conv.id, mostrar: {} }, d.cookie)).status === 200, 'discípulo ' + i + ' entra');
  }
  const treze = { u: 'disc13', ...(await criar('disc13')) };
  await serAmigos(lider, treze);
  const tentaTreze = await disc({ acao: 'convidar', usuario: 'disc13', papel: 'discipulador' }, lider.cookie);
  ok(tentaTreze.status === 409 && /12 pessoas/.test(tentaTreze.corpo.erro || ''), 'o 13º discípulo é recusado: o limite é 12');
  ok((await ver(lider.cookie)).meusDiscipulos.length === 12, 'o líder acompanha exatamente 12 pessoas');

  // ---------- "mostrar" controla exatamente o que o discipulador vê ----------
  console.log('\n  "Mostrar" controla o que o discipulador vê\n');
  const guia = { u: 'guia', ...(await criar('guia')) };
  const joao = { u: 'joao', ...(await criar('joao')) };
  await serAmigos(guia, joao);
  const convM = (await disc({ acao: 'convidar', usuario: 'joao', papel: 'discipulador' }, guia.cookie)).corpo;
  await disc({ acao: 'aceitar', id: convM.id, mostrar: { passos: false, semana: false, marcos: false } }, joao.cookie);
  const idRelacao = convM.id;
  // Joao lê e faz primeiros passos, mas não mostra nada
  await pedir('/api/estado', { atualizadoEm: Date.now(), lidos: [1], marcadoEm: { 1: HOJE }, licoes: ['passo1'], licoesEm: { passo1: HOJE } }, joao.cookie);
  let joaoParaGuia = (await ver(guia.cookie)).meusDiscipulos.find((x) => x.usuario === 'joao');
  ok(!('passos' in joaoParaGuia) && !('semana' in joaoParaGuia) && !('marcos' in joaoParaGuia) && !('acompanha' in joaoParaGuia),
    'com tudo desligado, o discipulador não vê passos, semana, marcos nem cadeia');

  await disc({ acao: 'mostrar', id: idRelacao, mostrar: { passos: true, semana: false, marcos: false } }, joao.cookie);
  joaoParaGuia = (await ver(guia.cookie)).meusDiscipulos.find((x) => x.usuario === 'joao');
  ok(joaoParaGuia.passos === 1 && !('semana' in joaoParaGuia) && !('marcos' in joaoParaGuia), 'ligando só "passos", o guia vê só os passos (1 de 12)');

  await disc({ acao: 'mostrar', id: idRelacao, mostrar: { passos: false, semana: true, marcos: false } }, joao.cookie);
  joaoParaGuia = (await ver(guia.cookie)).meusDiscipulos.find((x) => x.usuario === 'joao');
  ok(!('passos' in joaoParaGuia) && joaoParaGuia.semana === 1 && !('marcos' in joaoParaGuia), 'ligando só "semana", o guia vê só quantos dias leu (1 dos últimos 7)');

  await disc({ acao: 'marco', chave: 'decisao', data: somaDiasTeste(HOJE, -30) }, joao.cookie);
  await disc({ acao: 'mostrar', id: idRelacao, mostrar: { passos: false, semana: false, marcos: true } }, joao.cookie);
  joaoParaGuia = (await ver(guia.cookie)).meusDiscipulos.find((x) => x.usuario === 'joao');
  ok(!('passos' in joaoParaGuia) && !('semana' in joaoParaGuia) && joaoParaGuia.marcos.decisao === somaDiasTeste(HOJE, -30),
    'ligando só "marcos", o guia vê os marcos com data');

  console.log('\n  Nenhum texto do discípulo aparece na resposta\n');
  await pedir('/api/estado', {
    atualizadoEm: Date.now(), lidos: [1], marcadoEm: { 1: HOJE },
    oia: { 1: { oracao: 'um segredo só meu', anotacao: 'ninguém pode ler isto' } },
    anotacoes: { 'nota:x': 'reflexão bem íntima' },
  }, joao.cookie);
  const bruto = JSON.stringify(await ver(guia.cookie));
  ok(!/segredo|íntima|ninguém pode ler/.test(bruto), 'texto escrito pelo discípulo nunca aparece na resposta do discipulador');

  // ---------- cadeia de 2 Tm 2.2 ----------
  console.log('\n  Cadeia de 2 Timóteo 2.2 (só o número)\n');
  const neto = { u: 'neto', ...(await criar('neto')) };
  await serAmigos(joao, neto);
  const convNeto = (await disc({ acao: 'convidar', usuario: 'neto', papel: 'discipulador' }, joao.cookie)).corpo;
  await disc({ acao: 'aceitar', id: convNeto.id, mostrar: {} }, neto.cookie);
  joaoParaGuia = (await ver(guia.cookie)).meusDiscipulos.find((x) => x.usuario === 'joao');
  ok(joaoParaGuia.marcos && joaoParaGuia.acompanha === 1, 'com "marcos" ligado, o guia vê "acompanha 1", só o número');
  ok(!JSON.stringify(joaoParaGuia).includes('neto'), 'o nome de quem João acompanha nunca aparece para o guia');
  await disc({ acao: 'mostrar', id: idRelacao, mostrar: { passos: false, semana: false, marcos: false } }, joao.cookie);
  joaoParaGuia = (await ver(guia.cookie)).meusDiscipulos.find((x) => x.usuario === 'joao');
  ok(!('acompanha' in joaoParaGuia), 'sem "marcos" ligado, a cadeia também não aparece');

  // ---------- encontro ----------
  console.log('\n  Encontro: só a data\n');
  await disc({ acao: 'mostrar', id: idRelacao, mostrar: { passos: false, semana: false, marcos: false } }, joao.cookie);
  ok((await disc({ acao: 'encontro', id: idRelacao, data: somaDiasTeste(HOJE, 1) }, guia.cookie)).status === 400, 'data no futuro é recusada');
  ok((await disc({ acao: 'encontro', id: idRelacao, data: somaDiasTeste(HOJE, -8) }, guia.cookie)).status === 400, 'mais de 7 dias atrás é recusado');
  ok((await disc({ acao: 'encontro', id: idRelacao, data: somaDiasTeste(HOJE, -3) }, guia.cookie)).status === 200, 'o guia marca "nos encontramos" há 3 dias');
  ok((await ver(joao.cookie)).meuDiscipulador.ultimoEncontro === somaDiasTeste(HOJE, -3), 'o discípulo também vê a data do encontro');
  ok((await disc({ acao: 'encontro', id: idRelacao, data: HOJE }, joao.cookie)).status === 200, 'o discípulo também pode marcar o encontro');
  ok((await ver(guia.cookie)).meusDiscipulos.find((x) => x.usuario === 'joao').ultimoEncontro === HOJE, 'e o guia vê a data mais recente');

  // ---------- encerrar ----------
  console.log('\n  Encerrar\n');
  ok((await disc({ acao: 'encerrar', id: idRelacao }, joao.cookie)).status === 200, 'o discípulo encerra o discipulado');
  ok(!(await ver(guia.cookie)).meusDiscipulos.some((x) => x.usuario === 'joao'), 'some da tela do guia');
  ok(!(await ver(joao.cookie)).meuDiscipulador, 'e da tela do discípulo');
  ok((await disc({ acao: 'convidar', usuario: 'joao', papel: 'discipulador' }, guia.cookie)).status === 200, 'depois de encerrado, dá para convidar de novo');

  // ---------- marco "discipula" automático ----------
  console.log('\n  Marco "discipula" automático\n');
  const mentor = { u: 'mentor', ...(await criar('mentor')) };
  const pupilo = { u: 'pupilo', ...(await criar('pupilo')) };
  await serAmigos(mentor, pupilo);
  ok((await ver(mentor.cookie)).marcos.discipula === undefined, 'antes do primeiro discípulo, o marco não existe');
  const convMentor = (await disc({ acao: 'convidar', usuario: 'pupilo', papel: 'discipulador' }, mentor.cookie)).corpo;
  await disc({ acao: 'aceitar', id: convMentor.id, mostrar: {} }, pupilo.cookie);
  const marcosMentor = (await ver(mentor.cookie)).marcos;
  ok(marcosMentor.discipula === HOJE, 'ganhar o primeiro discípulo ativo preenche o marco "discipula" sozinho');
  ok((await disc({ acao: 'marco', chave: 'discipula', data: '' }, mentor.cookie)).status === 200, 'a pessoa pode apagar o marco');
  ok((await ver(mentor.cookie)).marcos.discipula === undefined, 'e ele fica apagado');

  // ---------- marcos: "Minha caminhada" ----------
  console.log('\n  Minha caminhada\n');
  ok((await disc({ acao: 'marco', chave: 'inventado', data: HOJE }, pupilo.cookie)).status === 400, 'marco desconhecido é recusado');
  ok((await disc({ acao: 'marco', chave: 'batismo', data: 'não-é-data' }, pupilo.cookie)).status === 400, 'data mal formada é recusada');
  ok((await disc({ acao: 'marco', chave: 'batismo', data: HOJE }, pupilo.cookie)).status === 200, 'a pessoa marca o próprio batismo');
  ok((await ver(pupilo.cookie)).marcos.batismo === HOJE, 'e ele aparece na própria caminhada');

  // ---------- apagar conta limpa os dois lados ----------
  console.log('\n  Apagar a conta limpa o discipulado dos dois lados\n');
  await pedir('/api/apagar-conta', { senha: 'senha123' }, pupilo.cookie);
  ok(!(await ver(mentor.cookie)).meusDiscipulos.some((x) => x.usuario === 'pupilo'), 'apagar a conta do discípulo tira ele da lista do mentor');
  await pedir('/api/apagar-conta', { senha: 'senha123' }, lider.cookie);
  const checador = await criar('checador');
  const disc1depois = await disc(null, checador.cookie);
  ok(disc1depois.status === 200, 'o servidor segue de pé depois de apagar quem tinha vários discípulos');

  // ---------- avisos nunca no Feed ----------
  console.log('\n  Avisos nunca no Feed\n');
  const g1 = { u: 'g1', ...(await criar('g1')) };
  const g2 = { u: 'g2', ...(await criar('g2')) };
  await serAmigos(g1, g2);
  const convFeed = (await disc({ acao: 'convidar', usuario: 'g2', papel: 'discipulador' }, g1.cookie)).corpo;
  await disc({ acao: 'aceitar', id: convFeed.id, mostrar: {} }, g2.cookie);
  const feedG2 = await dados(await pedir('/api/novidades', null, g2.cookie));
  const feedG1 = await dados(await pedir('/api/novidades', null, g1.cookie));
  const semDiscipulado = (feed) => !JSON.stringify(feed).includes('discipulad');
  ok(semDiscipulado(feedG1) && semDiscipulado(feedG2), 'convite e aceite de discipulado não aparecem no mural de ninguém');
} finally {
  servidor.kill();
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
