// Um conjunto de dados inventado, no formato dos arquivos JSON da época anterior ao banco
// (o mesmo que ferramentas/exportar-sqlite-para-json.mjs devolve): contas.json com
// amizades, propósitos, células, discipulados e pedidos; novidades.json; notificacoes.json;
// e um estado-<usuario>.json por pessoa. Serve ao teste-banco quando não há uma cópia dos
// dados reais à mão, e a qualquer ensaio que precise de uma pasta de dados de ontem.
//
// Nada aqui é de ninguém: nomes bíblicos, e-mails em exemplo.com e textos inventados. Os
// resumos de senha são aleatórios (ninguém entra com eles), menos os das contas em SENHAS,
// gravados pelo mesmo scrypt do app para o teste poder entrar com elas.
//
// Uso: const { arquivos, contas } = await gerarJsonLegado(pasta)
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { Contas, hojeNoFuso, somaDias, FUSO_PADRAO } = await import(pathToFileURL(join(AQUI, 'contas.mjs')).href);
const { fecharBanco, arquivoDoBanco } = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);

// Contas com senha de verdade: a de quem vai embora no meio do ensaio (é membro de célula,
// discípulo, amiga de várias e autora de novidades e pedidos, para a saída dela ter o que limpar).
export const SENHAS = { despedida: 'senha-da-despedida' };

// Sorteio com semente: duas rodadas geram o mesmo conjunto, e uma falha se repete à vontade.
function sorteador(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [usuario, nome, fuso, e-mail e nascimento completos?]
const PESSOAS = [
  ['ana.beatriz', 'Ana Beatriz', 'America/Sao_Paulo', true],
  ['ze.antonio', 'Zé Antônio', 'America/Manaus', true],
  ['conceicao', 'Conceição', 'America/Bahia', true],
  ['joao-pedro', 'João Pedro', 'America/Rio_Branco', true],
  ['maria_jose', 'Maria José', 'America/Belem', true],
  ['lucas', 'Lucas', 'America/Sao_Paulo', false],
  ['estevao', 'Estêvão', 'Europe/Lisbon', true],
  ['rute', 'Rute', 'America/Noronha', true],
  ['tiago.s', 'Tiago Souza', 'America/Cuiaba', true],
  ['debora', 'Débora', 'America/Fortaleza', true],
  ['andre77', 'André', 'America/Recife', true],
  ['fatima', 'Fátima', 'Asia/Tokyo', true],
  ['sebastiao', 'Sebastião', 'America/Sao_Paulo', true],
  ['ines', 'Inês', 'America/Sao_Paulo', true],
  ['noemi', 'Noemi', 'America/Campo_Grande', true],
  ['benjamim', 'Benjamim', 'America/Sao_Paulo', false],
  ['raquel.m', 'Raquel M.', 'America/Sao_Paulo', true],
  ['josue', 'Josué', 'America/Boa_Vista', true],
  ['miria', 'Miriã', 'America/Sao_Paulo', true],
  ['calebe', 'Calebe', 'America/Porto_Velho', true],
  ['abigail', 'Abigail', 'America/Maceio', true],
  ['natanael', 'Natanael', 'America/Sao_Paulo', true],
  ['priscila', 'Priscila', 'America/Araguaina', true],
  ['aquila', 'Áquila', 'America/Sao_Paulo', true],
  ['filemom', 'Filemom', 'America/New_York', true],
  ['lidia', 'Lídia', 'Europe/London', true],
  ['onesimo', 'Onésimo', 'America/Sao_Paulo', false],
  ['febe', 'Febe', 'America/Sao_Paulo', true],
  ['timoteo', 'Timóteo', 'America/Sao_Paulo', true],
  ['silas', 'Silas', 'America/Santarem', true],
  ['visitante.1', 'Quem só veio ver', 'America/Sao_Paulo', true],
  ['visitante.2', 'Visitante Dois', 'America/Sao_Paulo', false],
  // casos de borda: quem nunca abriu o app (sem progresso), quem leu um ano inteiro (progresso
  // grande), uma conta da versão 1 (sem fuso nem selo de convite) e quem vai apagar a conta
  ['sem.progresso', 'Quem nunca abriu', 'America/Sao_Paulo', true],
  ['maratona', 'Leitora de um ano', 'America/Sao_Paulo', true],
  ['antiga.v1', 'Conta de antes', '', false],
  ['despedida', 'Quem vai embora', 'America/Sao_Paulo', true],
];

const ORACOES = ['Senhor, obrigado por este dia.', 'Pai, cuida da minha família: não sei o que fazer.', 'Que eu tenha coração manso.', 'Pelos que estão doentes na célula.'];
const NOTAS = ['O trecho fala de perdão; preciso perdoar o João.', 'Não entendi o versículo 12, perguntar na célula.', 'Promessa: "não temas". Guardar.', 'Dia difícil, mas li assim mesmo.'];
const VERSICULOS = ['Jo 3.16', 'Sl 23.1', 'Fp 4.13', 'Rm 8.28', 'Is 41.10', 'Pv 3.5', 'Mt 11.28'];

export async function gerarJsonLegado(pasta, { agora = Date.now(), semente = 2026 } = {}) {
  const rng = sorteador(semente);
  const inteiro = (n) => Math.floor(rng() * n);
  const hex = (bytes) => Array.from({ length: bytes * 2 }, () => '0123456789abcdef'[inteiro(16)]).join('');
  const escolher = (lista) => lista[inteiro(lista.length)];
  const hoje = hojeNoFuso(FUSO_PADRAO, new Date(agora));
  const diasAtras = (n) => somaDias(hoje, -n);
  const idProposito = () => 'p' + hex(6);
  const idNovidade = () => Buffer.from(hex(9), 'hex').toString('base64url');
  const arquivos = [];
  const gravar = (nome, dados) => { writeFileSync(join(pasta, nome), JSON.stringify(dados)); arquivos.push(nome); };

  // ---------- contas ----------
  const contas = {};
  for (const [usuario, nome, fuso, completo] of PESSOAS) {
    const c = {
      usuario, nome,
      email: completo ? usuario.replace(/[^a-z0-9]/g, '.') + '@exemplo.com' : '',
      nascimento: completo ? (1960 + inteiro(50)) + '-' + String(1 + inteiro(12)).padStart(2, '0') + '-' + String(1 + inteiro(28)).padStart(2, '0') : '',
      fuso, sal: hex(16), senha: hex(64),
      criadaEm: diasAtras(30 + inteiro(400)), seloConvite: hex(6),
    };
    // a conta da versão 1 não tinha fuso nem selo: a migração completa os dois na subida
    if (usuario === 'antiga.v1') { delete c.fuso; delete c.seloConvite; }
    // campos soltos que o app guarda na própria conta
    if (completo && rng() < 0.7) c.consentimento = { versao: 1, em: new Date(agora - inteiro(200) * 864e5).toISOString() };
    if (rng() < 0.25) c.marcos = { decisao: diasAtras(500 + inteiro(3000)), batismo: rng() < 0.5 ? diasAtras(100 + inteiro(2000)) : '' };
    contas[usuario] = c;
  }
  contas.lucas.convidadoPor = 'ana.beatriz';
  contas.febe.convidadoPor = 'sebastiao';
  // a conta com senha conhecida, com o scrypt do app
  const rascunho = mkdtempSync(join(tmpdir(), 'cc-legado-sintetico-'));
  try {
    const guarda = await new Contas(join(rascunho, 'contas.json')).carregar();
    for (const [usuario, senha] of Object.entries(SENHAS)) {
      const base = contas[usuario];
      const criada = await guarda.criar({ usuario, senha, nome: base.nome, email: base.email, nascimento: base.nascimento, fuso: base.fuso, consentimento: true });
      contas[usuario] = { ...base, sal: criada.sal, senha: criada.senha };
    }
    fecharBanco(arquivoDoBanco(rascunho));
  } finally {
    try { rmSync(rascunho, { recursive: true, force: true }); } catch { /* ok */ }
  }

  // ---------- amizades, bloqueios, toques, denúncias, convites ----------
  const nomes = PESSOAS.map((p) => p[0]);
  const par = (a, b) => [a, b].sort().join('|');
  const amizades = {};
  const amigos = (a, b, ha = 10 + inteiro(300)) => {
    const em = diasAtras(ha);
    amizades[par(a, b)] = { estado: 'ativa', pediu: rng() < 0.5 ? a : b, em, aceitaEm: somaDias(em, inteiro(3)) };
  };
  amigos('ana.beatriz', 'ze.antonio'); amigos('ana.beatriz', 'lucas'); amigos('ana.beatriz', 'despedida');
  amigos('conceicao', 'joao-pedro'); amigos('maria_jose', 'rute'); amigos('estevao', 'tiago.s');
  amigos('debora', 'andre77'); amigos('fatima', 'sebastiao'); amigos('ines', 'noemi'); amigos('benjamim', 'raquel.m');
  amigos('josue', 'miria'); amigos('calebe', 'abigail'); amigos('natanael', 'priscila'); amigos('aquila', 'filemom');
  amigos('lidia', 'onesimo'); amigos('febe', 'timoteo'); amigos('silas', 'sebastiao'); amigos('sebastiao', 'despedida');
  amigos('maratona', 'ana.beatriz'); amigos('maratona', 'rute'); amigos('antiga.v1', 'lucas'); amigos('despedida', 'timoteo');
  for (const [a, b] of [['silas', 'lucas'], ['debora', 'despedida'], ['sem.progresso', 'ines'], ['visitante.1', 'sebastiao']]) {
    amizades[par(a, b)] = { estado: 'pendente', pediu: a, em: diasAtras(inteiro(10)) };
  }
  const bloqueios = { 'ze.antonio': ['visitante.2'] };
  const silenciados = { 'ana.beatriz': ['andre77'], despedida: ['lucas'] };
  const convitesUsados = {};
  for (let i = 0; i < 3; i++) convitesUsados[hex(12)] = agora + (1 + inteiro(29)) * 864e5;
  const toques = { 'ana.beatriz>ze.antonio': hoje, 'sebastiao>despedida': hoje, 'rute>maria_jose': diasAtras(1), 'ines>noemi': diasAtras(2), 'despedida>timoteo': hoje };
  const denuncias = [
    { de: 'ze.antonio', contra: 'visitante.2', motivo: 'Parece uma conta falsa', em: diasAtras(40) },
    { de: 'lidia', contra: 'onesimo', motivo: 'Insiste ou incomoda', em: diasAtras(3) },
  ];
  const convitesAceites = [
    { convite: hex(8), de: 'ana.beatriz', para: 'lucas', em: diasAtras(120), contaNova: true, ativadoEm: diasAtras(119) },
    { convite: hex(8), de: 'sebastiao', para: 'febe', em: diasAtras(60), contaNova: true, ativadoEm: diasAtras(58) },
    { convite: hex(8), de: 'sebastiao', para: 'despedida', em: diasAtras(90), contaNova: false, ativadoEm: '' },
    { convite: hex(8), de: 'rute', para: 'maratona', em: diasAtras(300), contaNova: true, ativadoEm: diasAtras(300) },
  ];

  // ---------- propósitos: duplas, grupo e células ----------
  const propositos = {};
  const membro = (usuario, extra = {}) => ({ usuario, estado: 'ativo', entrouEm: diasAtras(60), saiuEm: '', convidadoPor: '', ...extra });
  const dupla = (a, b, tipo = 'plano', alvo = '', ha = 50) => {
    const id = idProposito();
    const desde = diasAtras(ha);
    const dias = [];
    for (let d = 0; d < ha; d++) if (rng() < 0.6) dias.push(somaDias(desde, d));
    propositos[id] = {
      id, tipo, alvo, titulo: '', criadoPor: a, criadoEm: desde, encerradoEm: '', grupo: false, celula: false,
      membros: [membro(a, { entrouEm: desde }), membro(b, { entrouEm: desde })], diasBatidos: dias, encontros: [],
    };
    return propositos[id];
  };
  dupla('ana.beatriz', 'ze.antonio');
  dupla('maria_jose', 'rute', 'livro', 'nt', 120);
  dupla('ines', 'noemi', 'oracao', '', 30);
  dupla('ana.beatriz', 'despedida', 'plano', '', 20);
  Object.assign(dupla('debora', 'andre77', 'plano', '', 200), { encerradoEm: diasAtras(100) });
  {
    const id = idProposito();
    propositos[id] = {
      id, tipo: 'plano', alvo: '', titulo: 'Jovens da quarta', criadoPor: 'josue', criadoEm: diasAtras(45), encerradoEm: '', grupo: true, celula: false,
      membros: [membro('josue', { entrouEm: diasAtras(45) }), membro('miria'), membro('calebe'),
        { usuario: 'abigail', estado: 'convidado', entrouEm: '', saiuEm: '', convidadoPor: 'josue' },
        { usuario: 'natanael', estado: 'saiu', entrouEm: diasAtras(40), saiuEm: diasAtras(10), convidadoPor: 'josue' }],
      diasBatidos: [diasAtras(3), diasAtras(2), diasAtras(1)], encontros: [],
    };
  }
  // a célula mãe: líder, auxiliar, membros, dois visitantes (um já virou membro) e os encontros
  const celulaMae = idProposito();
  {
    const nascida = diasAtras(180);
    const membros = [
      membro('sebastiao', { entrouEm: nascida }),
      membro('fatima', { entrouEm: nascida, convidadoPor: 'sebastiao', papel: 'auxiliar' }),
      ...['silas', 'febe', 'timoteo', 'despedida', 'lidia', 'onesimo', 'aquila', 'filemom', 'priscila', 'maratona'].map((u) => membro(u, { entrouEm: diasAtras(30 + inteiro(140)), convidadoPor: 'sebastiao' })),
      membro('visitante.1', { entrouEm: diasAtras(12), convidadoPor: 'fatima', papel: 'visitante' }),
      membro('visitante.2', { entrouEm: diasAtras(5), convidadoPor: 'sebastiao', papel: 'visitante' }),
      membro('benjamim', { entrouEm: diasAtras(50), convidadoPor: 'sebastiao', tornouMembroEm: diasAtras(20) }),
      { usuario: 'sem.progresso', estado: 'saiu', entrouEm: diasAtras(100), saiuEm: diasAtras(70), convidadoPor: 'sebastiao' },
    ];
    const encontros = [];
    for (let s = 8; s >= 1; s--) {
      const data = diasAtras(7 * s - 1);
      if (s === 4) { encontros.push({ data, visitantes: 0, registradoPor: 'sebastiao', em: data + 'T22:10:00.000Z', presentes: [], semEncontro: true }); continue; }
      const presentes = membros.filter((m) => m.estado === 'ativo' && m.entrouEm <= data && rng() < 0.75).map((m) => m.usuario);
      encontros.push({ data, visitantes: inteiro(3), registradoPor: s % 2 ? 'sebastiao' : 'fatima', em: data + 'T22:0' + inteiro(10) + ':00.000Z', presentes, semEncontro: false });
    }
    const dias = [];
    for (let d = 0; d < 180; d++) if (rng() < 0.3) dias.push(somaDias(nascida, d));
    propositos[celulaMae] = {
      id: celulaMae, tipo: 'plano', alvo: '', titulo: 'Célula Videira', criadoPor: 'sebastiao', criadoEm: nascida, encerradoEm: '', grupo: true, celula: true,
      encontro: 3, recado: 'Quarta às 20h na casa da Fátima. Tragam a Bíblia e um pão para repartir!', recadoEm: diasAtras(2) + 'T13:00:00.000Z',
      estudo: { tipo: 'livre', ref: '', texto: 'Atos 2.42-47: o que significa perseverar na comunhão? Três perguntas para a roda…', em: diasAtras(2) + 'T13:05:00.000Z' },
      estudoAcolhida: 'Cada um conta uma alegria da semana.', estudoAdoracao: 'Dois cânticos à escolha de quem chegou primeiro.', estudoTestemunho: 'Quem viu Deus agir esta semana?',
      mae: '', multiplicadaEm: '', membros, diasBatidos: dias, encontros,
    };
  }
  {
    const filha = idProposito();
    const nascida = diasAtras(20);
    propositos[filha] = {
      id: filha, tipo: 'plano', alvo: '', titulo: 'Célula Videira II', criadoPor: 'timoteo', criadoEm: nascida, encerradoEm: '', grupo: true, celula: true,
      encontro: 5, recado: '', recadoEm: '', estudo: { tipo: 'semana', ref: '', texto: '', em: nascida + 'T12:00:00.000Z' },
      estudoAcolhida: '', estudoAdoracao: '', estudoTestemunho: '', mae: celulaMae, multiplicadaEm: nascida,
      membros: [membro('timoteo', { entrouEm: nascida }), membro('febe', { entrouEm: nascida, convidadoPor: 'timoteo' }), membro('estevao', { entrouEm: diasAtras(10), convidadoPor: 'timoteo' })],
      diasBatidos: [], encontros: [{ data: diasAtras(6), visitantes: 1, registradoPor: 'timoteo', em: diasAtras(6) + 'T23:00:00.000Z', presentes: ['timoteo', 'febe'], semEncontro: false }],
    };
  }

  // ---------- discipulados ----------
  const discipulados = {};
  const discipulado = (discipulador, discipulo, estado, ha, encontros = []) => {
    const id = 'd' + hex(6);
    const criadoEm = diasAtras(ha);
    discipulados[id] = {
      id, discipulador, discipulo, estado, pediu: discipulador, criadoEm,
      aceitoEm: estado === 'convidado' ? '' : somaDias(criadoEm, 1), encerradoEm: estado === 'encerrado' ? diasAtras(5) : '',
      mostrar: { passos: true, semana: true, marcos: estado === 'ativo', checkin: true }, encontros,
    };
  };
  discipulado('sebastiao', 'despedida', 'ativo', 70, [diasAtras(22), diasAtras(15), diasAtras(8), diasAtras(1)]);
  discipulado('sebastiao', 'silas', 'ativo', 40, [diasAtras(14), diasAtras(7)]);
  discipulado('fatima', 'febe', 'convidado', 2);
  discipulado('ana.beatriz', 'lucas', 'encerrado', 150, [diasAtras(140), diasAtras(133)]);

  // ---------- cuidado mútuo ----------
  const pedidos = {};
  const pedido = (autor, tipo, destino, texto, ha, extra = {}) => {
    const id = 'r' + hex(6);
    const criadoEm = diasAtras(ha);
    pedidos[id] = { id, celula: celulaMae, autor, tipo, destino, texto, criadoEm, venceEm: somaDias(criadoEm, 7), estado: 'ativo', removidoPor: '', gestos: [], denuncias: [], ...extra };
    return pedidos[id];
  };
  pedido('despedida', 'oracao', 'celula', 'Orem pela minha mãe, que faz exame na sexta.', 2, {
    gestos: [{ usuario: 'sebastiao', gesto: 'orei', data: diasAtras(1) }, { usuario: 'fatima', gesto: 'orei', data: hoje }],
  });
  pedido('silas', 'necessidade', 'celula', 'Preciso de carona para o encontro de quarta.', 3, {
    gestos: [{ usuario: 'timoteo', gesto: 'ajudo', data: diasAtras(2) }, { usuario: 'despedida', gesto: 'orei', data: diasAtras(2) }],
  });
  pedido('onesimo', 'oracao', 'conduz', 'Estou pensando em desistir de tudo.', 1, {
    denuncias: [{ usuario: 'despedida', motivo: 'Alguém pode estar em perigo', em: diasAtras(1) + 'T09:00:00.000Z' }],
  });
  pedido('aquila', 'oracao', 'celula', 'Pedido que não era pedido', 6, { estado: 'removido', removidoPor: 'fatima' });

  gravar('contas.json', {
    versao: 2, contas, amizades, bloqueios, silenciados, convitesUsados, toques, denuncias, convitesAceites, propositos, discipulados, pedidos,
  });

  // ---------- progresso: um estado-<usuario>.json por pessoa (menos quem nunca abriu) ----------
  const estadoDe = (usuario, dias) => {
    const e = {
      atualizadoEm: agora - inteiro(3) * 864e5, dia: dias + 1, lidos: [], licoes: [], oia: {}, anotacoes: {}, marcadoEm: {}, licoesEm: {}, conhecidos: {},
      pratica: {}, foto: '', apelido: contas[usuario].nome.split(' ')[0], zeradoEm: 0, xpLegado: null, conquistasGanhas: {}, maiorProposito: 0,
      diario: {}, bausAbertos: {}, notasVistas: [], acertosTotal: 0, missoesTotal: 0, semanasJuntos: {}, oradoEm: {},
    };
    let licao = 1;
    for (let d = dias; d >= 1; d--) {
      if (rng() < 0.2) continue; // dia sem leitura
      const data = diasAtras(d);
      e.lidos.push(licao);
      e.marcadoEm[licao] = data;
      if (rng() < 0.5) { e.licoes.push(licao); e.licoesEm[licao] = data; }
      if (rng() < 0.3) e.oia[licao] = { oracao: escolher(ORACOES) };
      if (rng() < 0.2) e.anotacoes[licao] = escolher(NOTAS);
      if (rng() < 0.4) e.pratica[licao] = { acertos: inteiro(4), total: 3 };
      e.diario[data] = { leituras: 1, licoes: e.licoesEm[licao] ? 1 : 0, missoes: inteiro(3) };
      if (rng() < 0.3) e.oradoEm[data] = true;
      licao++;
    }
    for (let k = 1; k <= Math.min(14, Math.floor(dias / 20)); k++) e.conhecidos[k] = diasAtras(dias - k);
    e.acertosTotal = Object.values(e.pratica).reduce((s, p) => s + p.acertos, 0);
    if (e.lidos.length >= 7) e.conquistasGanhas.semana = diasAtras(dias - 7);
    if (e.lidos.length >= 30) e.conquistasGanhas.mes = diasAtras(dias - 30);
    e.maiorProposito = Math.min(e.lidos.length, 7 + inteiro(40));
    return e;
  };
  for (const [usuario] of PESSOAS) {
    if (usuario === 'sem.progresso') continue;
    const dias = usuario === 'maratona' ? 365 : usuario.startsWith('visitante') ? 3 : 5 + inteiro(120);
    gravar('estado-' + usuario + '.json', estadoDe(usuario, dias));
  }
  // o estado.json sem sufixo (a época em que o app era de uma pessoa só) e as cópias de
  // segurança .bak.json que o servidor antigo deixava ao lado
  gravar('estado.json', { atualizadoEm: agora - 400 * 864e5, dia: 2, lidos: [1], marcadoEm: { 1: diasAtras(400) }, apelido: 'Sem conta' });
  gravar('estado-lucas.' + diasAtras(90) + '.bak.json', { atualizadoEm: agora - 90 * 864e5, lidos: [1, 2], marcadoEm: {} });
  gravar('estado-despedida.' + diasAtras(30) + '.bak.json', { atualizadoEm: agora - 30 * 864e5, lidos: [1], marcadoEm: {}, oia: { 1: { oracao: 'só minha' } } });

  // ---------- novidades ----------
  const ligados = nomes.filter((u) => !['sem.progresso', 'visitante.2', 'antiga.v1'].includes(u) && rng() < 0.8);
  const perguntados = [...new Set([...ligados, 'antiga.v1', 'lucas'])];
  const eventos = [];
  const evento = (autor, tipo, dados, chave, haDias, reacoes = []) => {
    eventos.push({ id: idNovidade(), autor, tipo, dados, chave, em: agora - haDias * 864e5 - inteiro(12) * 36e5, reacoes });
  };
  for (const autor of ligados) {
    const n = 1 + inteiro(4);
    for (let i = 0; i < n; i++) {
      const tipo = escolher(['ofensiva', 'livro', 'unidade', 'conquista', 'versiculo']);
      const dados = tipo === 'ofensiva' ? { dias: escolher([7, 14, 30]) } : tipo === 'livro' ? { livro: escolher(['jo', 'mc', 'sl', 'rm']) }
        : tipo === 'unidade' ? { unidade: 1 + inteiro(12) } : tipo === 'conquista' ? { conquista: escolher(['semana', 'mes', 'cem']) } : { ref: escolher(VERSICULOS) };
      const reacoes = ligados.filter((u) => u !== autor && rng() < 0.15);
      evento(autor, tipo, dados, tipo + ':' + i + ':' + (tipo === 'versiculo' ? dados.ref : JSON.stringify(dados)), inteiro(28), reacoes);
    }
  }
  // de dupla (só os dois veem), de grupo (só quem está nele), e as velhas demais para ficar
  evento('ana.beatriz', 'novoProposito', { com: 'despedida' }, 'novoProposito:despedida', 19);
  evento('despedida', 'proposito', { com: 'ana.beatriz', dias: 7 }, 'proposito:ana.beatriz:7', 12);
  evento('ines', 'proposito', { com: 'noemi', dias: 7 }, 'proposito:noemi:7', 20, ['noemi']);
  evento('sebastiao', 'propositoGrupo', { membros: ['sebastiao', 'fatima', 'silas', 'despedida', 'febe'], dias: 30, titulo: 'Célula Videira' }, 'propositoGrupo:' + celulaMae + ':30', 9, ['silas']);
  evento('josue', 'propositoGrupo', { membros: ['josue', 'miria', 'calebe'], dias: 7, titulo: 'Jovens da quarta' }, 'propositoGrupo:jovens:7', 4);
  for (let i = 0; i < 12; i++) evento(escolher(ligados), 'ofensiva', { dias: 7 }, 'velha:' + i, 31 + inteiro(300));
  gravar('novidades.json', { versao: 1, eventos, ligados, perguntados });

  // ---------- notificações ----------
  const inscricoes = {};
  for (const u of ['ana.beatriz', 'ze.antonio', 'sebastiao', 'fatima', 'despedida', 'maratona', 'rute', 'timoteo']) {
    inscricoes[u] = Array.from({ length: u === 'sebastiao' ? 2 : 1 }, () => ({
      endpoint: 'https://push.exemplo.com/envio/' + hex(24), p256dh: Buffer.from(hex(65), 'hex').toString('base64url'), auth: Buffer.from(hex(16), 'hex').toString('base64url'),
      criadaEm: new Date(agora - inteiro(100) * 864e5).toISOString(),
    }));
  }
  const preferencias = {};
  for (const u of [...Object.keys(inscricoes), 'lucas', 'ines', 'noemi', 'silas']) {
    preferencias[u] = { lembrete: rng() < 0.8, hora: escolher(['06:30', '07:00', '12:00', '19:00', '21:15']), ofensiva: rng() < 0.7, amigos: rng() < 0.6 };
  }
  const historico = {};
  for (const u of Object.keys(inscricoes)) {
    historico[u] = { data: hoje, automaticas: 1 + inteiro(2), toques: inteiro(2), lembrete: hoje, lembreteMinutos: 19 * 60 };
    if (u === 'sebastiao') historico[u]['grupo:' + celulaMae] = hoje;
  }
  const caixa = {};
  for (const u of Object.keys(inscricoes)) {
    caixa[u] = Array.from({ length: 2 + inteiro(5) }, (_, i) => ({
      id: 'n' + hex(6), em: agora - (i + 1) * 36e5 * (1 + inteiro(20)), tipo: escolher(['lembrete', 'toque', 'pedido', 'convite', 'ofensiva']),
      titulo: 'Alguém lembrou de você', corpo: contas[u].nome + ', ' + escolher(['hoje é dia de leitura', 'o Sebastião orou pelo seu pedido', 'a célula tem recado novo']), url: '#/', lido: rng() < 0.5,
    })).sort((a, b) => a.em - b.em);
  }
  gravar('notificacoes.json', { versao: 1, inscricoes, preferencias, historico, caixa });

  return { arquivos, contas: Object.keys(contas), celula: celulaMae };
}
