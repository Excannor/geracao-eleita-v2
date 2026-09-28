// Painel do dono do app: números agregados, sem nome de ninguém. Serve para saber se o
// app funciona (quem volta, onde as pessoas param), não para vigiar uma pessoa.
// Função pura: recebe as contas, os estados e os propósitos e devolve só contagens.
import { datasFeitas, somaDias } from './contas.mjs';
import { escondidoPorDenuncia } from './cuidado.mjs';

// Com menos de 5 pessoas numa conta, o número exato pode identificar alguém numa igreja
// pequena (Fase 5, seção 2): todo número que conta pessoas (nunca célula ou evento) passa
// por aqui antes de sair do painel.
const MINIMO_PARA_MOSTRAR = 5;
const mascarar = (n) => (n < MINIMO_PARA_MOSTRAR ? 'menos de 5' : n);
const JANELA_ENCONTROS_PAINEL = 28; // 4 semanas
const JANELA_MULTIPLICACOES = 365; // 12 meses
const JANELA_DIAS_NA_PALAVRA = 30;
const POWER_OF_4 = 4;

// Faixas de quantos dias do plano a pessoa já leu: mostram onde o plano perde gente.
export const FAIXAS_DE_DIAS = [
  ['nenhum dia', 0, 0], ['1 a 3', 1, 3], ['4 a 7', 4, 7], ['8 a 14', 8, 14],
  ['15 a 30', 15, 30], ['31 a 90', 31, 90], ['91 a 180', 91, 180], ['181 a 365', 181, 365],
];
export const MARCOS_DE_RETORNO = [1, 7, 30];
export const PRIMEIROS_PASSOS = 12;

const faixaDe = (n) => (FAIXAS_DE_DIAS.find(([, de, ate]) => n >= de && n <= ate) || FAIXAS_DE_DIAS.at(-1))[0];
const pct = (parte, todo) => (todo ? Math.round((parte / todo) * 100) : null);

export function montarPainel({
  contas, estados, propositos = [], comPush = [], hoje, pedidos = [], discipulados = [],
}) {
  const pessoas = contas.map((c) => {
    const e = estados[c.usuario] || {};
    const datas = [...datasFeitas(e)].sort();
    return {
      usuario: c.usuario,
      registrosDesafio: e.desafios || {},
      criadaEm: c.criadaEm || datas[0] || hoje,
      acessos: new Set(c.acessos || []),
      // Contas antigas não têm origem gravada: deduz pelo que ficou anotado no convite.
      origem: c.origem || (c.acompanhadoPor ? 'conhecer' : c.convidadoPor ? 'convite' : 'direto'),
      datas,
      diasLidos: (e.lidos || []).length,
      passos: (e.licoes || []).length,
      escreveu: Object.keys(e.oia || {}).length > 0,
      ultima: datas.at(-1) || '',
      conhecidos: Object.keys(e.conhecidos || {}).length,
      conversou: !!c.conversouEm,
      marcou: Object.values(e.marcas || {}).some((m) => m && m.cor),
      praticou: Object.keys(e.pratica || {}).length > 0,
      desafio: Object.values(e.desafios || {}).some((d) => d && (d.ativo || d.concluidoEm)),
      historia: !!(e.historia && (e.historia.antes || e.historia.encontro || e.historia.hoje)),
    };
  });
  const desde = (dias) => somaDias(hoje, -dias);
  const ativosEm = (dias) => pessoas.filter((p) => p.ultima && p.ultima > desde(dias)).length;
  const abriramEm = (dias) => pessoas.filter((p) => [...p.acessos].some((d) => (dias ? d > desde(dias) : d === hoje))).length;

  // Retorno: das contas com idade para isso, quantas leram de novo N dias depois de criadas
  // ou mais tarde. É a pergunta "o hábito pegou?", não "leu naquele dia exato".
  const retorno = MARCOS_DE_RETORNO.map((n) => {
    const elegiveis = pessoas.filter((p) => p.criadaEm <= desde(n));
    const voltaram = elegiveis.filter((p) => p.datas.some((d) => d >= somaDias(p.criadaEm, n))).length;
    return { dias: n, elegiveis: elegiveis.length, voltaram, pct: pct(voltaram, elegiveis.length) };
  });

  // Onde param: quem não lê há 7 dias ou mais, pelo quanto chegou a ler.
  const parados = pessoas.filter((p) => !p.ultima || p.ultima <= desde(7));
  const contarFaixas = (lista) => FAIXAS_DE_DIAS.map(([nome]) => ({ faixa: nome, contas: lista.filter((p) => faixaDe(p.diasLidos) === nome).length }));

  const ativosProp = propositos.filter((p) => !p.encerradoEm);
  const emProposito = new Set(ativosProp.flatMap((p) => p.membros.filter((m) => m.estado === 'ativo').map((m) => m.usuario)));

  // ---------- "Células e cuidado" (Fase 5, seção 2): só números, nunca nome nem texto ----------
  const celulas = ativosProp.filter((p) => p.celula);
  const celulasAtivas = celulas.filter((p) => p.membros.some((m) => m.estado === 'ativo'));
  const desde4Semanas = desde(JANELA_ENCONTROS_PAINEL);
  const encontrosRecentes = celulasAtivas.flatMap((p) => (p.encontros || []).filter((e) => e.data > desde4Semanas && e.data <= hoje));
  const celulasComEncontro = new Set(celulasAtivas.filter((p) => (p.encontros || []).some((e) => e.data > desde4Semanas && e.data <= hoje)).map((p) => p.id));
  const frequenciaMedia = encontrosRecentes.length
    ? Math.round((encontrosRecentes.reduce((soma, e) => soma + (e.presentes || []).length + (Number(e.visitantes) || 0), 0) / encontrosRecentes.length) * 10) / 10
    : null;
  const visitantesViraramMembros = celulasAtivas.reduce((soma, p) => soma
    + p.membros.filter((m) => m.papel !== 'visitante' && m.tornouMembroEm && m.tornouMembroEm > desde4Semanas && m.tornouMembroEm <= hoje).length, 0);
  const desde12Meses = desde(JANELA_MULTIPLICACOES);
  const multiplicacoes = propositos.filter((p) => p.celula && p.multiplicadaEm && p.multiplicadaEm > desde12Meses && p.multiplicadaEm <= hoje).length;

  // "Dias na Palavra" (Power of 4): das contas ativas nos últimos 30 dias, quantas leram em
  // 4 ou mais dos últimos 7 dias. Só existe aqui; a pessoa nunca vê esse número.
  const desdePower4 = Array.from({ length: 7 }, (_, i) => somaDias(hoje, -i));
  const ativas30 = pessoas.filter((p) => p.ultima && p.ultima > desde(JANELA_DIAS_NA_PALAVRA));
  const comPower4 = ativas30.filter((p) => {
    const s = new Set(p.datas);
    return desdePower4.filter((d) => s.has(d)).length >= POWER_OF_4;
  }).length;

  // 2ª geração (2 Tm 2.2): entre as relações ativas, quantas têm um discipulador que também
  // é discípulo de outra relação ativa. Só o número, nunca quem é.
  const discipuladosAtivos = discipulados.filter((x) => x.estado === 'ativo');
  const idsDiscipuladores = new Set(discipuladosAtivos.map((x) => x.discipulador));
  const segundaGeracao = discipuladosAtivos.filter((x) => idsDiscipuladores.has(x.discipulo)).length;

  const pedidosOracaoAtivos = pedidos.filter((r) => r.tipo === 'oracao' && r.estado === 'ativo' && r.venceEm >= hoje).length;
  const denunciasAbertas = pedidos.filter((r) => r.estado !== 'removido' && escondidoPorDenuncia(r)).length;

  const celulasECuidado = {
    celulasAtivas: celulasAtivas.length,
    celulasComEncontro: celulasComEncontro.size,
    frequenciaMedia,
    visitantesViraramMembros: mascarar(visitantesViraramMembros),
    multiplicacoes,
    diasNaPalavra: { pct: pct(comPower4, ativas30.length), base: mascarar(ativas30.length) },
    conhecer: {
      comecaram: mascarar(pessoas.filter((p) => p.conhecidos > 0).length),
      terminaram: mascarar(pessoas.filter((p) => p.conhecidos >= 14).length),
      quiseramConversar: mascarar(pessoas.filter((p) => p.conversou).length),
    },
    discipulado: {
      ativos: mascarar(discipuladosAtivos.length),
      segundaGeracao: mascarar(segundaGeracao),
    },
    cuidado: {
      pedidosAtivos: mascarar(pedidosOracaoAtivos),
      denunciasAbertas: mascarar(denunciasAbertas),
    },
  };

  // ---------- relatório de uso detalhado (só números) ----------
  const conjuntos = pessoas.map((p) => new Set(p.datas));
  // Quantas pessoas leram em cada um dos últimos 30 dias (do mais antigo para hoje).
  const porDia = Array.from({ length: 30 }, (_, i) => {
    const dia = desde(29 - i);
    return { dia, contas: conjuntos.filter((c) => c.has(dia)).length, abriram: pessoas.filter((p) => p.acessos.has(dia)).length };
  });
  // Contas novas por semana, nas últimas 8 semanas (a última é a atual).
  const novasPorSemana = Array.from({ length: 8 }, (_, i) => {
    const ate = desde(7 * (7 - i));
    const de = somaDias(ate, -6);
    return { de, ate, contas: pessoas.filter((p) => p.criadaEm >= de && p.criadaEm <= ate).length };
  });
  // Ofensiva atual de cada um: dias seguidos até hoje (ou até ontem, se hoje ainda não leu).
  const ofensiva = conjuntos.map((c) => {
    let n = 0; let d = c.has(hoje) ? hoje : desde(1);
    while (c.has(d)) { n++; d = somaDias(d, -1); }
    return n;
  });
  const FAIXAS_OFENSIVA = [['sem ofensiva', 0, 0], ['1 a 6 dias', 1, 6], ['7 a 13', 7, 13], ['14 a 29', 14, 29], ['30 a 99', 30, 99], ['100 ou mais', 100, Infinity]];
  const ofensivas = FAIXAS_OFENSIVA.map(([faixa, de, ate]) => ({ faixa, contas: ofensiva.filter((n) => n >= de && n <= ate).length }));
  // Em que dia da semana mais se lê (últimos 30 dias).
  const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const diasDaSemana = SEMANA.map((faixa) => ({ faixa, contas: 0 }));
  for (const { dia, contas: n } of porDia) diasDaSemana[new Date(dia + 'T12:00:00Z').getUTCDay()].contas += n;
  const funil = [
    { faixa: 'Criaram a conta', contas: pessoas.length },
    { faixa: 'Leram 1 dia', contas: pessoas.filter((p) => p.diasLidos >= 1).length },
    { faixa: 'Leram 7 dias', contas: pessoas.filter((p) => p.diasLidos >= 7).length },
    { faixa: 'Leram 30 dias', contas: pessoas.filter((p) => p.diasLidos >= 30).length },
    { faixa: 'Leram 90 dias', contas: pessoas.filter((p) => p.diasLidos >= 90).length },
  ];
  const ativos30 = pessoas.filter((p) => p.ultima && p.ultima > desde(30));

  // Resumo do topo: esta semana (últimos 7 dias) contra a anterior (8 a 14 dias atrás).
  const naJanela = (datas, de, ate) => [...datas].some((d) => d > desde(de) && d <= desde(ate));
  const semana = (conta) => ({ agora: conta(7, 0), antes: conta(14, 7) });
  const resumo = {
    abriram: semana((de, ate) => pessoas.filter((p) => naJanela(p.acessos, de, ate)).length),
    leram: semana((de, ate) => pessoas.filter((p) => naJanela(p.datas, de, ate)).length),
    novas: semana((de, ate) => pessoas.filter((p) => p.criadaEm > desde(de) && p.criadaEm <= desde(ate)).length),
  };

  // Retenção por turma: contas agrupadas pela semana em que foram criadas; em cada turma,
  // quantas leram na 1ª, 2ª e 4ª semana depois do cadastro (só quando a semana já passou).
  const turmas = Array.from({ length: 6 }, (_, i) => {
    const ate = desde(7 * (5 - i));
    const de = somaDias(ate, -6);
    const turma = pessoas.filter((p) => p.criadaEm >= de && p.criadaEm <= ate);
    const semanaN = (n) => {
      if (somaDias(ate, 7 * n) > hoje) return null;
      const leram = turma.filter((p) => p.datas.some((d) => d > somaDias(p.criadaEm, 7 * (n - 1)) && d <= somaDias(p.criadaEm, 7 * n))).length;
      return pct(leram, turma.length);
    };
    return { de, ate, contas: turma.length, s1: semanaN(1), s2: semanaN(2), s4: semanaN(4) };
  });

  // Desafios de vários dias, um por um: quantos começaram, venceram, seguem, estão parados
  // (ativos sem vencer nenhum dia na última semana) ou pausaram; e em que dia param.
  const DESAFIOS = { 'sem-redes-21': ['21 dias sem redes sociais', 21], 'celular-cama-7': ['7 dias sem celular na cama', 7] };
  const desafios = Object.entries(DESAFIOS).map(([id, [titulo, total]]) => {
    const regs = pessoas.map((p) => p.registrosDesafio[id]).filter(Boolean);
    const vencidos = (r) => new Set(r.dias || []).size;
    const venceu = (r) => !!r.concluidoEm || vencidos(r) >= total;
    const parado = (r) => r.ativo && !venceu(r) && !(r.dias || []).some((d) => d > desde(7));
    const pararam = regs.filter((r) => !venceu(r) && (!r.ativo || parado(r))).map(vencidos).sort((a, b) => a - b);
    return {
      titulo, total,
      comecaram: regs.length,
      venceram: regs.filter(venceu).length,
      seguem: regs.filter((r) => r.ativo && !venceu(r) && !parado(r)).length,
      pararam: pararam.length,
      paramNoDia: pararam.length ? pararam[Math.floor(pararam.length / 2)] + 1 : null,
    };
  });

  // Notificação e leitura: dias lidos nos últimos 30 dias, em média, de quem tem e de quem não
  // tem notificação ligada. É correlação: quem já lê mais tende a ligar os avisos.
  const comAviso = new Set(comPush);
  const lidos30 = (p) => p.datas.filter((d) => d > desde(30)).length;
  const media = (lista) => (lista.length ? Math.round((lista.reduce((s2, p) => s2 + lidos30(p), 0) / lista.length) * 10) / 10 : null);
  const notificacao = {
    com: { contas: pessoas.filter((p) => comAviso.has(p.usuario)).length, media: media(pessoas.filter((p) => comAviso.has(p.usuario))) },
    sem: { contas: pessoas.filter((p) => !comAviso.has(p.usuario)).length, media: media(pessoas.filter((p) => !comAviso.has(p.usuario))) },
  };

  // De onde vêm e quanto ficam: por origem, quantas contas e quantas leram nos últimos 30 dias.
  const NOMES_ORIGEM = { convite: 'Convite de amigo', celula: 'Link de célula', conhecer: 'Conhecendo Jesus', direto: 'Cadastro direto' };
  const origens = Object.entries(NOMES_ORIGEM).map(([chave, faixa]) => {
    const grupo = pessoas.filter((p) => p.origem === chave);
    const ficaram = grupo.filter((p) => p.ultima && p.ultima > desde(30)).length;
    return { faixa, contas: grupo.length, ficaram, pct: pct(ficaram, grupo.length) };
  });
  const detalhe = {
    porDia, novasPorSemana, ofensivas, diasDaSemana, funil, resumo, origens, turmas, desafios, notificacao,
    mediaDiasLidos: ativos30.length ? Math.round(ativos30.reduce((s2, p) => s2 + p.diasLidos, 0) / ativos30.length) : 0,
    maiorOfensiva: ofensiva.length ? Math.max(...ofensiva) : 0,
    funcoes: [
      { faixa: 'Marcaram versículos', contas: pessoas.filter((p) => p.marcou).length },
      { faixa: 'Praticaram versículos', contas: pessoas.filter((p) => p.praticou).length },
      { faixa: 'Entraram num desafio', contas: pessoas.filter((p) => p.desafio).length },
      { faixa: 'Escreveram a Minha história', contas: pessoas.filter((p) => p.historia).length },
      { faixa: 'Escreveram sobre algum dia', contas: pessoas.filter((p) => p.escreveu).length },
      { faixa: 'Com notificação ligada', contas: new Set(comPush).size },
    ],
  };

  return {
    hoje,
    contas: {
      total: contas.length,
      novas7: pessoas.filter((p) => p.criadaEm > desde(7)).length,
      novas30: pessoas.filter((p) => p.criadaEm > desde(30)).length,
    },
    ativos: { hoje: pessoas.filter((p) => p.ultima === hoje).length, dias7: ativosEm(7), dias30: ativosEm(30) },
    // Quem abriu o app, leia ou não (o registro de acesso começou em 28/09/2026).
    abriram: { hoje: abriramEm(0), dias7: abriramEm(7), dias30: abriramEm(30) },
    retorno,
    progresso: contarFaixas(pessoas),
    ondeParam: { total: parados.length, faixas: contarFaixas(parados) },
    primeirosPassos: {
      concluiram: pessoas.filter((p) => p.passos >= PRIMEIROS_PASSOS).length,
      comecaram: pessoas.filter((p) => p.passos > 0).length,
    },
    escreveram: pessoas.filter((p) => p.escreveu).length,
    propositos: {
      ativos: ativosProp.length,
      grupos: ativosProp.filter((p) => p.grupo).length,
      contasEmAlgum: emProposito.size,
    },
    comNotificacao: new Set(comPush).size,
    celulasECuidado,
    detalhe,
  };
}
