// Confere o cuidado mútuo (Atos 2.42, 2.44-45): visitante não vê nem pede; pedido só para
// quem conduz fica invisível para membro comum; limite de 3 pedidos ativos; "orei" uma vez por
// dia; o autor vê os gestos e os outros não; "posso ajudar" uma vez só; "Deus respondeu" e
// apagar; denúncia anônima para o autor; 2 denúncias escondem; só quem conduz decide; avisos
// nunca no Feed; sair da célula e apagar a conta limpam os pedidos; limpeza de vencidos.
// Uso: node ferramentas/teste-cuidado.mjs
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8226;
const PASTA = join(tmpdir(), 'cc-cuidado');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// ---------- regras puras (cuidado.mjs), sem servidor ----------
console.log('\n  Cuidado mútuo: regras puras\n');
{
  const C = await import(pathToFileURL(join(AQUI, 'cuidado.mjs')).href);
  ok(C.tipoValido('oracao') && C.tipoValido('necessidade') && !C.tipoValido('outro'), 'só os dois tipos são válidos');
  ok(C.destinoValido('oracao', 'celula') && C.destinoValido('oracao', 'conduz') && !C.destinoValido('oracao', 'outro'),
    'oração pode ser para a célula ou só para quem conduz');
  ok(C.destinoValido('necessidade', 'celula') && !C.destinoValido('necessidade', 'conduz'),
    'necessidade é sempre para a célula inteira, nunca só para quem conduz');
  ok(C.diasValido(7) && C.diasValido(30) && !C.diasValido(10), 'só 7 ou 30 dias são válidos');
  ok(C.textoValido('oracao', 'x'.repeat(280)) && !C.textoValido('oracao', 'x'.repeat(281)), 'oração cabe até 280 caracteres');
  ok(C.textoValido('necessidade', 'x'.repeat(200)) && !C.textoValido('necessidade', 'x'.repeat(201)), 'necessidade cabe até 200 caracteres');
  ok(!C.textoValido('oracao', '   '), 'texto só de espaço não vale');

  const p = (extra) => ({ autor: 'ana', destino: 'celula', estado: 'ativo', venceEm: '2026-03-20', denuncias: [], gestos: [], ...extra });
  ok(C.pedidoVisivelPara(p(), { usuario: 'bia', hoje: '2026-03-10', conduz: false }), 'destino celula: qualquer membro ativo vê');
  ok(!C.pedidoVisivelPara(p({ destino: 'conduz' }), { usuario: 'bia', hoje: '2026-03-10', conduz: false }),
    'destino conduz: membro comum não vê');
  ok(C.pedidoVisivelPara(p({ destino: 'conduz' }), { usuario: 'lider', hoje: '2026-03-10', conduz: true }), 'destino conduz: quem conduz vê');
  ok(C.pedidoVisivelPara(p({ destino: 'conduz' }), { usuario: 'ana', hoje: '2026-03-10', conduz: false }), 'destino conduz: o autor sempre vê o próprio pedido');
  ok(!C.pedidoVisivelPara(p(), { usuario: 'bia', hoje: '2026-03-21', conduz: false }), 'depois do vencimento, o pedido some para todo mundo');
  ok(!C.pedidoVisivelPara(p({ estado: 'respondido' }), { usuario: 'bia', hoje: '2026-03-10', conduz: false }), 'respondido some da lista dos outros');
  ok(C.pedidoVisivelPara(p({ estado: 'respondido' }), { usuario: 'ana', hoje: '2026-03-10', conduz: false }), 'respondido continua na lista do autor');
  ok(!C.pedidoVisivelPara(p({ estado: 'removido' }), { usuario: 'ana', hoje: '2026-03-10', conduz: false }), 'removido some até para o autor');
  const escondido = p({ denuncias: [{ usuario: 'x', motivo: 'a' }, { usuario: 'y', motivo: 'b' }] });
  ok(!C.pedidoVisivelPara(escondido, { usuario: 'bia', hoje: '2026-03-10', conduz: false }), 'com 2 denúncias, membro comum não vê mais');
  ok(C.pedidoVisivelPara(escondido, { usuario: 'ana', hoje: '2026-03-10', conduz: false }), 'com 2 denúncias, o autor continua vendo');
  ok(C.pedidoVisivelPara(escondido, { usuario: 'lider', hoje: '2026-03-10', conduz: true }), 'com 2 denúncias, quem conduz continua vendo');

  ok(C.venceEmDe('2026-03-01', 7) === '2026-03-08' && C.venceEmDe('2026-03-01', 30) === '2026-03-31', 'o vencimento soma os dias certos');
  ok(C.vencidoParaApagar({ venceEm: '2026-01-01' }, '2026-02-01'), '31 dias depois do vencimento já pode ser apagado');
  ok(!C.vencidoParaApagar({ venceEm: '2026-01-01' }, '2026-01-31'), 'exatamente 30 dias depois do vencimento ainda não pode');
  ok(!C.vencidoParaApagar({ venceEm: '2026-01-01' }, '2026-01-30'), '29 dias depois ainda não pode');

  const gestos = [
    { usuario: 'bia', gesto: 'orei', data: '2026-03-01' },
    { usuario: 'bia', gesto: 'orei', data: '2026-03-03' },
    { usuario: 'caio', gesto: 'ajudo', data: '2026-03-02' },
  ];
  const resumo = C.gestosParaAutor({ gestos });
  const deBia = resumo.find((g) => g.usuario === 'bia');
  ok(deBia && deBia.data === '2026-03-03', 'gestosParaAutor mostra a data mais recente de cada pessoa');
  ok(C.jaOrouHoje({ gestos }, 'bia', '2026-03-03') && !C.jaOrouHoje({ gestos }, 'bia', '2026-03-04'), 'jaOrouHoje olha só a data pedida');
  ok(C.jaAjudou({ gestos }, 'caio') && !C.jaAjudou({ gestos }, 'bia'), 'jaAjudou olha o gesto "ajudo"');
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
  return { u: usuario, cookie: biscoito(r), corpo: await dados(r), status: r.status };
};
// Sempre lê o corpo: uma resposta não consumida pode prender a conexão e derrubar o pedido seguinte.
const cuidado = async (corpo, cookie) => { const r = await pedir('/api/cuidado', corpo, cookie); return { status: r.status, corpo: await dados(r) }; };
const ver = async (celula, cookie) => (await dados(await pedir('/api/cuidado?celula=' + celula, null, cookie)));
const celulaAcao = (corpo, cookie) => pedir('/api/celula', corpo, cookie);

const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const HOJE = hoje();

try {
  console.log('\n  Criar célula e pedidos\n');
  const lider = await criar('lider9');
  const idCelula = (await dados(await celulaAcao({ acao: 'criar', titulo: 'Célula 9' }, lider.cookie))).proposito.id;
  const { link } = await dados(await celulaAcao({ acao: 'link', id: idCelula }, lider.cookie));
  const token = new URL(link).searchParams.get('celula');
  const entrar = (cookie, extra = {}) => pedir('/api/celula', { acao: 'entrar', token, ...extra }, cookie);

  const ana = await criar('ana9');
  await entrar(ana.cookie);
  const bia = await criar('bia9');
  await entrar(bia.cookie);
  const visita = await criar('visita9');
  await entrar(visita.cookie, { visitante: true });

  console.log('\n  Visitante não vê nem cria\n');
  ok((await ver(idCelula, visita.cookie)).erro !== undefined || (await pedir('/api/cuidado?celula=' + idCelula, null, visita.cookie)).status === 403,
    'visitante não vê a lista de pedidos da célula');
  const tentaVisita = await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'peço oração', dias: 7 }, visita.cookie);
  ok(tentaVisita.status === 403, 'visitante não cria pedido');

  console.log('\n  Criar pedido de oração\n');
  const criado = await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'Peço oração pela minha família', dias: 7 }, ana.cookie);
  ok(criado.status === 200 && criado.corpo.id, 'ana cria um pedido de oração para a célula');
  const idPedido = criado.corpo.id;
  const listaBia = (await ver(idCelula, bia.cookie)).pedidos;
  ok(listaBia.some((p) => p.id === idPedido && p.autor.usuario === 'ana9' && p.meu === false), 'bia vê o pedido de ana na célula');
  ok(!('gestos' in listaBia.find((p) => p.id === idPedido)), 'quem não é o autor não recebe a lista de gestos');

  ok((await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: '', dias: 7 }, ana.cookie)).status === 400, 'texto vazio é recusado');
  ok((await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'x'.repeat(281), dias: 7 }, ana.cookie)).status === 400, 'oração com mais de 280 caracteres é recusada');
  ok((await cuidado({ acao: 'criar', celula: idCelula, tipo: 'necessidade', destino: 'conduz', texto: 'preciso de ajuda', dias: 7 }, ana.cookie)).status === 400,
    'necessidade não pode ser só para quem conduz');
  ok((await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'oi', dias: 15 }, ana.cookie)).status === 400, 'só 7 ou 30 dias são aceitos');

  console.log('\n  Destino "só quem conduz" é invisível para membro comum\n');
  const soConduz = await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'conduz', texto: 'algo mais reservado', dias: 7 }, ana.cookie);
  ok(soConduz.status === 200, 'ana pede uma oração só para quem conduz');
  ok(!(await ver(idCelula, bia.cookie)).pedidos.some((p) => p.id === soConduz.corpo.id), 'bia (membro comum) não vê esse pedido');
  ok((await ver(idCelula, lider.cookie)).pedidos.some((p) => p.id === soConduz.corpo.id), 'o líder vê esse pedido');
  ok((await ver(idCelula, ana.cookie)).pedidos.some((p) => p.id === soConduz.corpo.id), 'a própria ana continua vendo o que pediu');

  console.log('\n  Limite de 3 pedidos ativos\n');
  const terceiro = await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'terceiro pedido', dias: 7 }, ana.cookie);
  const quarto = await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'quarto pedido', dias: 7 }, ana.cookie);
  ok(quarto.status === 409, 'o quarto pedido ativo de ana na mesma célula é recusado');
  // Libera a vaga de volta para os testes seguintes (que também criam pedidos para ana).
  await cuidado({ acao: 'apagar', id: terceiro.corpo.id }, ana.cookie);

  console.log('\n  "Orei por você": uma vez por dia\n');
  ok((await cuidado({ acao: 'orei', id: idPedido }, ana.cookie)).status === 400, 'ana não pode orar pelo próprio pedido');
  const primeiraOracao = await cuidado({ acao: 'orei', id: idPedido }, bia.cookie);
  ok(primeiraOracao.status === 200, 'bia ora pelo pedido de ana');
  await cuidado({ acao: 'orei', id: idPedido }, bia.cookie);
  const paraAna = (await ver(idCelula, ana.cookie)).pedidos.find((p) => p.id === idPedido);
  ok(paraAna.gestos.filter((g) => g.usuario === 'bia9' && g.gesto === 'orei').length === 1, 'orar de novo no mesmo dia não duplica o gesto');
  ok(paraAna.gestos.find((g) => g.usuario === 'bia9').data === HOJE, 'ana vê a data em que bia orou');
  const paraBia = (await ver(idCelula, bia.cookie)).pedidos.find((p) => p.id === idPedido);
  ok(paraBia.oreiHoje === true, 'bia vê que já orou hoje por esse pedido');
  ok(!('gestos' in paraBia), 'bia (que não é a autora) não recebe a lista de quem mais orou');

  console.log('\n  "Posso ajudar": só em necessidade, uma vez\n');
  const necessidade = await cuidado({ acao: 'criar', celula: idCelula, tipo: 'necessidade', destino: 'celula', texto: 'preciso de uma cesta básica', dias: 30 }, ana.cookie);
  const idNecessidade = necessidade.corpo.id;
  ok((await cuidado({ acao: 'ajudo', id: idPedido }, bia.cookie)).status === 400, '"posso ajudar" não vale em pedido de oração');
  ok((await cuidado({ acao: 'ajudo', id: idNecessidade }, ana.cookie)).status === 400, 'ana não pode ajudar no próprio pedido');
  ok((await cuidado({ acao: 'ajudo', id: idNecessidade }, bia.cookie)).status === 200, 'bia se oferece para ajudar');
  await cuidado({ acao: 'ajudo', id: idNecessidade }, bia.cookie);
  const necessidadeParaAna = (await ver(idCelula, ana.cookie)).pedidos.find((p) => p.id === idNecessidade);
  ok(necessidadeParaAna.gestos.filter((g) => g.gesto === 'ajudo').length === 1, '"posso ajudar" não duplica, mesmo chamado de novo');
  ok(necessidadeParaAna.gestos.some((g) => g.usuario === 'bia9'), 'ana vê o nome de quem pode ajudar');
  ok((await ver(idCelula, bia.cookie)).pedidos.find((p) => p.id === idNecessidade).ajudei === true, 'bia vê que já se ofereceu');

  console.log('\n  "Deus respondeu" e apagar\n');
  const outroPedido = (await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'mais um pedido', dias: 7 }, bia.cookie)).corpo.id;
  ok((await cuidado({ acao: 'respondido', id: outroPedido }, ana.cookie)).status === 404, 'só o autor marca "Deus respondeu"');
  ok((await cuidado({ acao: 'respondido', id: outroPedido }, bia.cookie)).status === 200, 'bia marca "Deus respondeu" no próprio pedido');
  ok(!(await ver(idCelula, ana.cookie)).pedidos.some((p) => p.id === outroPedido), 'some da lista de quem não é o autor');
  ok((await ver(idCelula, bia.cookie)).pedidos.some((p) => p.id === outroPedido), 'continua na lista da própria bia');
  ok((await cuidado({ acao: 'apagar', id: idNecessidade }, ana.cookie)).status === 200, 'ana apaga o próprio pedido');
  ok(!(await ver(idCelula, ana.cookie)).pedidos.some((p) => p.id === idNecessidade), 'o pedido apagado some de vez');
  ok((await cuidado({ acao: 'apagar', id: idPedido }, bia.cookie)).status === 404, 'só o autor apaga o próprio pedido');

  console.log('\n  Denúncia anônima, e 2 denúncias escondem\n');
  const caio = await criar('caio9');
  await entrar(caio.cookie);
  const denunciavel = (await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'um pedido qualquer', dias: 7 }, ana.cookie)).corpo.id;
  ok((await cuidado({ acao: 'denunciar', id: denunciavel, motivo: 'motivo qualquer' }, bia.cookie)).status === 400, 'motivo fora da lista fixa é recusado');
  ok((await cuidado({ acao: 'denunciar', id: denunciavel, motivo: 'Não é um pedido' }, ana.cookie)).status === 400, 'ana não denuncia o próprio pedido');
  ok((await cuidado({ acao: 'denunciar', id: denunciavel, motivo: 'Não é um pedido' }, bia.cookie)).status === 200, 'bia denuncia');
  ok((await ver(idCelula, caio.cookie)).pedidos.some((p) => p.id === denunciavel), 'com 1 denúncia, o pedido ainda aparece para os outros');
  const antesDeCaio = JSON.stringify(await ver(idCelula, ana.cookie));
  ok(!antesDeCaio.includes('bia9') || antesDeCaio.includes('"autor":{"usuario":"ana9"'), 'a resposta para o autor não expõe quem denunciou');
  await cuidado({ acao: 'denunciar', id: denunciavel, motivo: 'É ofensivo' }, caio.cookie);
  ok(!(await ver(idCelula, caio.cookie)).pedidos.some((p) => p.id === denunciavel), 'com 2 denúncias, o pedido some para quem não é autor nem conduz');
  ok((await ver(idCelula, ana.cookie)).pedidos.some((p) => p.id === denunciavel), 'o autor continua vendo o próprio pedido escondido');
  const revisao = await ver(idCelula, lider.cookie);
  ok(revisao.pedidos.some((p) => p.id === denunciavel), 'quem conduz continua vendo o pedido escondido');
  const denunciaNaLista = (revisao.denuncias || []).find((d) => d.pedido === denunciavel);
  ok(denunciaNaLista && denunciaNaLista.total === 2 && denunciaNaLista.motivos.length === 2, 'quem conduz vê a denúncia com o total e os motivos, sem saber quem denunciou');

  console.log('\n  Decidir: só quem conduz\n');
  ok((await cuidado({ acao: 'decidir', id: denunciavel, manter: true }, bia.cookie)).status === 403, 'quem não conduz não decide');
  ok((await cuidado({ acao: 'decidir', id: denunciavel, manter: true }, lider.cookie)).status === 200, 'o líder decide manter');
  ok((await ver(idCelula, caio.cookie)).pedidos.some((p) => p.id === denunciavel), 'depois de "manter", o pedido volta a aparecer para todos');
  ok(!((await ver(idCelula, lider.cookie)).denuncias || []).some((d) => d.pedido === denunciavel), 'e some da lista de revisão');

  // Libera uma vaga de ana (ela está no limite de 3 ativos) para o próximo pedido do teste.
  await cuidado({ acao: 'apagar', id: soConduz.corpo.id }, ana.cookie);
  const paraTirar = (await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'outro pedido qualquer', dias: 7 }, ana.cookie)).corpo.id;
  await cuidado({ acao: 'denunciar', id: paraTirar, motivo: 'É ofensivo' }, bia.cookie);
  await cuidado({ acao: 'denunciar', id: paraTirar, motivo: 'É ofensivo' }, caio.cookie);
  ok((await cuidado({ acao: 'decidir', id: paraTirar, manter: false }, lider.cookie)).status === 200, 'o líder decide tirar');
  ok(!(await ver(idCelula, ana.cookie)).pedidos.some((p) => p.id === paraTirar), 'depois de "tirar", some até para o autor');

  console.log('\n  Avisos nunca no Feed\n');
  const feedAna = await dados(await pedir('/api/novidades', null, ana.cookie));
  const feedBia = await dados(await pedir('/api/novidades', null, bia.cookie));
  const semCuidado = (feed) => !JSON.stringify(feed).includes('pedido') && !JSON.stringify(feed).includes('cuidado');
  ok(semCuidado(feedAna) && semCuidado(feedBia), 'nenhum pedido, gesto ou denúncia aparece no mural');

  console.log('\n  Sair da célula limpa os pedidos da pessoa\n');
  const parte = await criar('parte9');
  await entrar(parte.cookie);
  const pedidoDeParte = (await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'peço oração antes de sair', dias: 30 }, parte.cookie)).corpo.id;
  ok((await ver(idCelula, lider.cookie)).pedidos.some((p) => p.id === pedidoDeParte), 'o pedido de quem vai sair está na célula');
  await pedir('/api/propositos', { acao: 'sair', id: idCelula }, parte.cookie);
  ok(!(await ver(idCelula, lider.cookie)).pedidos.some((p) => p.id === pedidoDeParte), 'depois de sair da célula, o pedido dela some');

  const tirado = await criar('tirado9');
  await entrar(tirado.cookie);
  const pedidoDeTirado = (await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'peço oração antes de ser tirado', dias: 30 }, tirado.cookie)).corpo.id;
  await celulaAcao({ acao: 'remover', id: idCelula, usuario: 'tirado9' }, lider.cookie);
  ok(!(await ver(idCelula, lider.cookie)).pedidos.some((p) => p.id === pedidoDeTirado), 'ser tirado da célula também limpa o pedido');

  console.log('\n  Apagar a conta limpa os pedidos e os gestos deixados em outros\n');
  const daniel = await criar('daniel9');
  await entrar(daniel.cookie);
  const pedidoDoDaniel = (await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'peço oração', dias: 30 }, daniel.cookie)).corpo.id;
  const pedidoQueDanielOrou = (await cuidado({ acao: 'criar', celula: idCelula, tipo: 'oracao', destino: 'celula', texto: 'outro pedido para orarem', dias: 30 }, ana.cookie)).corpo.id;
  await cuidado({ acao: 'orei', id: pedidoQueDanielOrou }, daniel.cookie);
  await pedir('/api/apagar-conta', { senha: 'senha123' }, daniel.cookie);
  ok(!(await ver(idCelula, lider.cookie)).pedidos.some((p) => p.id === pedidoDoDaniel), 'apagar a conta remove o pedido que a pessoa tinha feito');
  const semDaniel = JSON.stringify(await ver(idCelula, ana.cookie));
  ok(!semDaniel.includes('daniel9'), 'e some o gesto que ela deixou no pedido de outra pessoa');

} finally {
  servidor.kill();
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

// ---------- limpeza dos vencidos há mais de 30 dias (direto em contas.mjs, sem servidor) ----------
// Precisa controlar "hoje" à vontade, coisa que o servidor de verdade não deixa fazer por HTTP.
console.log('\n  Limpeza dos vencidos há mais de 30 dias\n');
{
  const { Contas } = await import(pathToFileURL(join(AQUI, 'contas.mjs')).href);
  const { fecharBanco, arquivoDoBanco } = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);
  const pastaLimpeza = join(tmpdir(), 'cc-cuidado-limpeza');
  try { rmSync(pastaLimpeza, { recursive: true, force: true }); } catch { /* ok */ }
  try {
    const arquivo = join(pastaLimpeza, 'estado.json');
    const C = new Contas(arquivo);
    await C.carregar();
    await C.criar({ usuario: 'lideral', senha: 'senha123', nome: 'Lideral', email: 'lideral@teste.com', nascimento: '2000-01-01', consentimento: true });
    const celula = await C.criarCelula('lideral', { titulo: 'Célula limpeza' }, '2026-01-01');
    const velho = await C.criarPedido('lideral', { celula: celula.id, tipo: 'oracao', destino: 'celula', texto: 'pedido velho', dias: 7 }, '2026-01-01');
    const recente = await C.criarPedido('lideral', { celula: celula.id, tipo: 'oracao', destino: 'celula', texto: 'pedido recente', dias: 7 }, '2026-03-01');
    ok(velho.venceEm === '2026-01-08', 'o pedido velho vence em 2026-01-08 (uma semana depois de criado)');

    const antesDoPrazo = await C.limparPedidosVencidos('2026-02-07');
    ok(antesDoPrazo === false, 'exatamente 30 dias depois do vencimento (ainda não passou) não apaga nada');
    ok(C.pedido(velho.id) && C.pedido(recente.id), 'os dois pedidos continuam de pé');

    const depoisDoPrazo = await C.limparPedidosVencidos('2026-02-08');
    ok(depoisDoPrazo === true, '31 dias depois do vencimento, a limpeza encontra algo para apagar');
    ok(!C.pedido(velho.id), 'o pedido vencido há mais de 30 dias é apagado do banco');
    ok(C.pedido(recente.id), 'o pedido que ainda não venceu continua de pé');

    // "Deus respondeu" encurta o vencimento: a limpeza segue a data nova, não a original.
    const paraResponder = await C.criarPedido('lideral', { celula: celula.id, tipo: 'oracao', destino: 'celula', texto: 'outro pedido', dias: 30 }, '2026-01-01');
    await C.marcarRespondido('lideral', paraResponder.id, '2026-01-10');
    ok(C.pedido(paraResponder.id).venceEm === '2026-01-17', 'marcar "Deus respondeu" encurta o vencimento para 7 dias à frente');
    await C.limparPedidosVencidos('2026-02-16');
    ok(C.pedido(paraResponder.id), 'exatamente 30 dias depois do vencimento encurtado (2026-01-17), ainda não apaga');
    await C.limparPedidosVencidos('2026-02-17');
    ok(!C.pedido(paraResponder.id), 'a limpeza usa o vencimento encurtado por "Deus respondeu" (2026-01-17), não o original (2026-01-31)');
  } finally {
    try { fecharBanco(arquivoDoBanco(pastaLimpeza)); } catch { /* ok */ }
    try { rmSync(pastaLimpeza, { recursive: true, force: true }); } catch { /* ok */ }
  }
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
