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
      criadaEm: c.criadaEm || datas[0] || hoje,
      datas,
      diasLidos: (e.lidos || []).length,
      passos: (e.licoes || []).length,
      escreveu: Object.keys(e.oia || {}).length > 0,
      ultima: datas.at(-1) || '',
      conhecidos: Object.keys(e.conhecidos || {}).length,
      conversou: !!c.conversouEm,
    };
  });
  const desde = (dias) => somaDias(hoje, -dias);
  const ativosEm = (dias) => pessoas.filter((p) => p.ultima && p.ultima > desde(dias)).length;

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

  return {
    hoje,
    contas: {
      total: contas.length,
      novas7: pessoas.filter((p) => p.criadaEm > desde(7)).length,
      novas30: pessoas.filter((p) => p.criadaEm > desde(30)).length,
    },
    ativos: { hoje: pessoas.filter((p) => p.ultima === hoje).length, dias7: ativosEm(7), dias30: ativosEm(30) },
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
  };
}
