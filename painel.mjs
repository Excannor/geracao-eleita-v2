// Painel do dono do app: números agregados, sem nome de ninguém. Serve para saber se o
// app funciona (quem volta, onde as pessoas param), não para vigiar uma pessoa.
// Função pura: recebe as contas, os estados e os propósitos e devolve só contagens.
import { datasFeitas, somaDias } from './contas.mjs';

// Faixas de quantos dias do plano a pessoa já leu: mostram onde o plano perde gente.
export const FAIXAS_DE_DIAS = [
  ['nenhum dia', 0, 0], ['1 a 3', 1, 3], ['4 a 7', 4, 7], ['8 a 14', 8, 14],
  ['15 a 30', 15, 30], ['31 a 90', 31, 90], ['91 a 180', 91, 180], ['181 a 365', 181, 365],
];
export const MARCOS_DE_RETORNO = [1, 7, 30];
export const PRIMEIROS_PASSOS = 12;

const faixaDe = (n) => (FAIXAS_DE_DIAS.find(([, de, ate]) => n >= de && n <= ate) || FAIXAS_DE_DIAS.at(-1))[0];
const pct = (parte, todo) => (todo ? Math.round((parte / todo) * 100) : null);

export function montarPainel({ contas, estados, propositos = [], comPush = [], hoje }) {
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
  };
}
