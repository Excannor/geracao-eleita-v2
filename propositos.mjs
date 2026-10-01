// Propósitos: o compromisso de ler, ou orar, junto. Aqui moram só as regras puras, que os
// testes exercitam sem servidor; quem guarda é contas.mjs e quem serve é servidor.mjs.
//
// Três tipos:
//   plano   a lição do plano do dia. Conta dias seguidos, e o escudo congela a contagem.
//   livro   ler um livro ou um testamento. O plano passa por ele só em alguns dias (o Novo
//           Testamento fica de fora em 105 deles), então a contagem é de dias lidos juntos,
//           acumulada: um dia sem trecho do alvo não pode quebrar nada.
//   oracao  o "Orei" da reflexão. Conta dias seguidos. Só a data sai da conta, nunca o texto.
//
// Dupla: o dia conta quando os dois fizeram. Grupo (3 a 5 pessoas): meta coletiva do dia. A
// meta é o número de membros; cada um soma até 2 pontos (1 pelo que o propósito pede e 1
// extra por ter praticado ou aberto uma nota de estudo), e quem fez mais cobre quem faltou.

export const TIPOS = { plano: 'Plano de leitura', livro: 'Um livro ou testamento', oracao: 'Oração' };
export const LIMITE_GRUPO = 5;
// A célula da igreja é maior que o grupo de amigos: entra pelo link, até 20 pessoas.
export const LIMITE_CELULA = 20;
export const limiteDo = (p) => (p && p.celula ? LIMITE_CELULA : LIMITE_GRUPO);

export const NOVO_TESTAMENTO = [
  'Mateus', 'Marcos', 'Lucas', 'João', 'Atos', 'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios',
  'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom',
  'Hebreus', 'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João', '3 João', 'Judas', 'Apocalipse',
];

const somaDias = (texto, n) => {
  const d = new Date(texto + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function livrosDoAlvo(alvo, todosLivros) {
  if (alvo === 'nt') return new Set(NOVO_TESTAMENTO);
  if (alvo === 'at') return new Set(todosLivros.filter((l) => !NOVO_TESTAMENTO.includes(l)));
  return new Set(todosLivros.includes(alvo) ? [alvo] : []);
}

export function alvoValido(tipo, alvo, todosLivros) {
  if (!Object.prototype.hasOwnProperty.call(TIPOS, tipo)) return false;
  if (tipo === 'livro') return alvo === 'nt' || alvo === 'at' || todosLivros.includes(alvo);
  return !alvo;
}

export function rotuloDoProposito(tipo, alvo) {
  if (tipo === 'plano') return 'Plano de leitura';
  if (tipo === 'oracao') return 'Oração';
  if (alvo === 'nt') return 'Novo Testamento';
  if (alvo === 'at') return 'Antigo Testamento';
  return String(alvo || 'Leitura');
}

// As datas em que a pessoa fez o que o propósito pede.
export function datasDoTipo(tipo, alvo, estado, plano) {
  const e = estado || {};
  if (tipo === 'oracao') {
    return new Set(Object.entries(e.oradoEm || {}).filter(([, v]) => v).map(([data]) => data));
  }
  if (tipo === 'livro') {
    const todos = [...new Set(plano.flatMap((d) => d.livros))];
    const alvoSet = livrosDoAlvo(alvo, todos);
    const s = new Set();
    for (const [n, data] of Object.entries(e.marcadoEm || {})) {
      const dia = plano[Number(n) - 1];
      if (data && dia && dia.livros.some((l) => alvoSet.has(l))) s.add(data);
    }
    return s;
  }
  const s = new Set();
  for (const d of Object.values(e.marcadoEm || {})) if (d) s.add(d);
  for (const d of Object.values(e.licoesEm || {})) if (d) s.add(d);
  return s;
}

// O ponto extra do dia no grupo: praticou ou abriu uma nota de estudo.
export function extraNoDia(estado, data) {
  const d = ((estado && estado.diario) || {})[data] || {};
  return (d.praticas || 0) > 0 || (d.notas || 0) > 0 ? 1 : 0;
}

// Dias juntos numa dupla. Plano e oração: dias seguidos terminando hoje (ou ontem, se hoje
// ainda falta alguém). Livro: todos os dias em que os dois leram o alvo, desde o começo.
export function diasJuntos({ tipo, datasA, datasB, protegidosA = new Set(), protegidosB = new Set(), desde, hoje }) {
  if (!desde) return 0;
  if (tipo === 'livro') {
    let n = 0;
    for (const d of datasA) if (d >= desde && d <= hoje && datasB.has(d)) n++;
    return n;
  }
  const usaEscudo = tipo === 'plano';
  const coberto = (datas, protegidos, d) => datas.has(d) || (usaEscudo && protegidos.has(d));
  let cursor = datasA.has(hoje) && datasB.has(hoje) ? hoje : somaDias(hoje, -1);
  let dias = 0;
  while (cursor >= desde && coberto(datasA, protegidosA, cursor) && coberto(datasB, protegidosB, cursor)) {
    if (datasA.has(cursor) && datasB.has(cursor)) dias++;
    cursor = somaDias(cursor, -1);
  }
  return dias;
}

// Os pontos de um dia do grupo. membros: [{ feito, extra }] de quem era membro naquele dia.
export function pontosDoDia(membros) {
  const meta = membros.length;
  const pontos = membros.reduce((s, m) => s + Math.min(2, (m.feito ? 1 : 0) + (m.extra ? 1 : 0)), 0);
  return { pontos, meta, batida: meta > 0 && pontos >= meta, faltam: Math.max(0, meta - pontos) };
}

// A sequência do grupo: dias batidos seguidos (plano e oração) ou acumulados (livro).
export function sequenciaDoGrupo({ tipo, batidaEm, desde, hoje }) {
  if (!desde) return 0;
  if (tipo === 'livro') {
    let n = 0;
    for (let d = desde; d <= hoje; d = somaDias(d, 1)) if (batidaEm(d)) n++;
    return n;
  }
  let cursor = batidaEm(hoje) ? hoje : somaDias(hoje, -1);
  let n = 0;
  while (cursor >= desde && batidaEm(cursor)) { n++; cursor = somaDias(cursor, -1); }
  return n;
}

// ---------- célula: quem precisa de atenção ----------
// Só quem conduz a célula vê esta lista, para procurar a pessoa, e nunca como placar.
// candidatos: [{ usuario, nome, entrouEm, datas: Set de datas em que leu }], já sem quem conduz
// e sem visitantes. encontros: [{ data, presentes: [usuarios] }].
export const LIMITE_ATENCAO = 5;
export const DIAS_SEM_LER_ATENCAO = 5;
const diasEntre = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
export function quemPrecisaDeAtencao({ candidatos, encontros, referencia, criadoEm = '', limite = LIMITE_ATENCAO }) {
  // Os dois encontros mais recentes até a data de referência. Quem não foi marcado como
  // presente no último encontro (frequência do líder) entra na lista: é a pessoa a procurar
  // nesta semana. Quem faltou não tem teto; quem só está sem ler completa até o limite (LIMITE_ATENCAO;
  // inteligencia.mjs pede sem teto para juntar os gatilhos antes de cortar).
  // Semana marcada como "não houve encontro" não entra: ninguém faltou a um encontro que não houve.
  const doisUltimos = (encontros || []).filter((e) => !e.semEncontro && (!referencia || e.data <= referencia))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)).slice(0, 2);
  const faltaram = [];
  const semLerLista = [];
  for (const m of candidatos.slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))) {
    // Só contam encontros depois do dia em que a pessoa entrou: quem chegou depois (ou no
    // próprio dia) não "faltou".
    const entrou = m.entrouEm || '';
    const faltou = (e) => e.data > entrou && !e.presentes.includes(m.usuario);
    if (doisUltimos.length && faltou(doisUltimos[0])) {
      const aos2 = doisUltimos.length >= 2 && faltou(doisUltimos[1]);
      faltaram.push({ usuario: m.usuario, nome: m.nome, motivo: aos2 ? 'faltou aos 2 últimos encontros' : 'faltou ao último encontro', faltou: true });
      continue;
    }
    const feitas = [...(m.datas || [])].filter((d) => d <= referencia).sort();
    const desde = feitas[feitas.length - 1] || entrou || criadoEm;
    const semLer = desde ? diasEntre(desde, referencia) : 0;
    if (semLer >= DIAS_SEM_LER_ATENCAO) semLerLista.push({ usuario: m.usuario, nome: m.nome, motivo: 'sem ler há ' + semLer + ' dias' });
  }
  return faltaram.concat(semLerLista.slice(0, Math.max(0, limite - faltaram.length)));
}
