// Inteligência: as métricas de quem lidera. Dois perfis, duas perguntas:
//   o líder de célula quer saber quem precisa de ajuda e como vai a saúde do pequeno grupo
//   (visão tática, cuidado pastoral: só a própria célula, com os nomes onde isso ajuda a agir,
//   nunca o que alguém escreveu nem o check-in de uma pessoa);
//   o administrador quer saber se a estratégia de Atos 2 está funcionando na igreja inteira
//   (visão estratégica: a igreja de longe, e qualquer célula de perto, como o líder dela vê).
// Decisão do dono, em docs/inteligencia.md §5 e em src/privacidade.html.
// Aqui moram as regras puras, que os testes exercitam sem servidor, e as consultas à cópia
// achatada das datas de leitura (leitura_dias, esquema v14). Quem junta os dados e serve é
// servidor.mjs; a modelagem e as decisões de privacidade estão em docs/inteligencia.md.
import { datasFeitas, somaDias } from './contas.mjs';
import { quemPrecisaDeAtencao, LIMITE_ATENCAO } from './propositos.mjs';
import { MINIMO_PARA_MOSTRAR } from './painel.mjs';
import { transacao, lerEstadoDoBanco, lerMeta, gravarMeta } from './db.mjs';

const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;
const diasEntre = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
const pct = (parte, todo) => (todo ? Math.round((parte / todo) * 100) : null);

// =========================================================================
// O líder de célula
// =========================================================================

// ---------- o termômetro: a chama da célula ----------
// A chama de uma pessoa está acesa quando a ofensiva dela hoje é maior que zero: leu hoje, ou
// leu ontem e a sequência segue de pé (inclusive por um escudo). É a mesma conta que a pessoa
// vê no Início (CC.simularOfensiva, em src/app/02-estado.js), e não uma regra nova.
export const chamaAcesa = (simulacao) => !!simulacao && Number(simulacao.atual) > 0;

// acesos: uma entrada (true/false) por membro de verdade da célula (ativo e não visitante).
export function termometro(acesos) {
  const total = (acesos || []).length;
  const n = (acesos || []).filter(Boolean).length;
  return { acesos: n, total, pct: pct(n, total) };
}

// ---------- a frequência das últimas 4 semanas ----------
export const ENCONTROS_NA_FREQUENCIA = 4;
export const JANELA_FREQUENCIA = 28; // a mesma janela de frequenciaMediaPorCelula (painel da igreja)
// Os encontros registrados nas últimas 4 semanas até a referência (data > referência-28), do mais
// antigo para o mais novo, no máximo 4. Um encontro de meses atrás não entra: a tela diz "últimas
// 4 semanas" e a tendência não pode comparar com junho. A semana marcada como "não houve
// encontro" entra como tal (pessoas: null), nunca como zero: ninguém faltou a um encontro que não
// houve. A tendência compara os dois últimos encontros de verdade.
export function frequencia(encontros, referencia, quantos = ENCONTROS_NA_FREQUENCIA) {
  const desde = referencia ? somaDias(referencia, -JANELA_FREQUENCIA) : '';
  const lista = (encontros || [])
    .filter((e) => e && DATA_VALIDA.test(String(e.data || '')) && (!referencia || (e.data <= referencia && e.data > desde)))
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
    .slice(-quantos)
    .map((e) => ({
      data: e.data,
      semEncontro: !!e.semEncontro,
      pessoas: e.semEncontro ? null : (Array.isArray(e.presentes) ? e.presentes.length : Number(e.presentes) || 0) + (Number(e.visitantes) || 0),
    }));
  const reais = lista.filter((e) => !e.semEncontro);
  const ultimo = reais[reais.length - 1] || null;
  const anterior = reais[reais.length - 2] || null;
  const diferenca = ultimo && anterior ? ultimo.pessoas - anterior.pessoas : null;
  return {
    encontros: lista,
    diferenca,
    tendencia: diferenca === null ? null : diferenca > 0 ? 'subindo' : diferenca < 0 ? 'caindo' : 'estavel',
  };
}

// ---------- o funil: onde cada um está na caminhada ----------
// Cada pessoa entra numa etapa só, a mais adiante que alcançou, pelo que ela mesma marcou em
// "Minha caminhada" (os marcos) e por quem ela acompanha no discipulado. Quem conduz a célula
// (e o admin) vê também quem está em cada etapa: as pessoas que trazem "nome" saem em "nomes".
export const ETAPAS_FUNIL = [
  ['comecando', 'Dando os primeiros passos'],
  ['decidiu', 'Decidiram seguir Jesus'],
  ['batizado', 'Já se batizaram'],
  ['acompanha', 'Acompanham alguém na fé'],
];
export const PRIMEIROS_PASSOS_TOTAL = 12;
// pessoas: [{ marcos: { decisao, batismo, discipula }, acompanha (discípulos ativos), caminho, passos, usuario?, nome? }]
export function funil(pessoas) {
  const etapaDe = (p) => {
    const m = (p && p.marcos) || {};
    if (m.discipula || (p && Number(p.acompanha) > 0)) return 'acompanha';
    if (m.batismo) return 'batizado';
    if (m.decisao) return 'decidiu';
    return 'comecando';
  };
  const contagem = Object.fromEntries(ETAPAS_FUNIL.map(([k]) => [k, 0]));
  const nomes = Object.fromEntries(ETAPAS_FUNIL.map(([k]) => [k, []]));
  let conhecendo = 0;
  let passosConcluidos = 0;
  for (const p of pessoas || []) {
    const etapa = etapaDe(p);
    contagem[etapa]++;
    if (p && p.nome) nomes[etapa].push({ usuario: p.usuario, nome: p.nome });
    if (etapa !== 'comecando') continue;
    if (p && p.caminho === 'conhecer') conhecendo++;
    else if (p && Number(p.passos) >= PRIMEIROS_PASSOS_TOTAL) passosConcluidos++;
  }
  for (const k of Object.keys(nomes)) nomes[k].sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  return ETAPAS_FUNIL.map(([etapa, rotulo]) => ({
    etapa, rotulo, pessoas: contagem[etapa], nomes: nomes[etapa],
    // no começo da caminhada, quem ainda está conhecendo Jesus e quem já fechou os 12 passos
    ...(etapa === 'comecando' ? { conhecendo, passosConcluidos } : {}),
  }));
}

// ---------- a ofensiva perdida: o gatilho do cuidado ----------
export const JANELA_OFENSIVA_PERDIDA = 14; // a perda só é recente dentro destes dias
export const OFENSIVA_MINIMA_ALERTA = 7; // perder menos que uma semana não é gatilho
export const DIAS_PARA_RECOMECAR = 3; // 3 dias seguidos de novo: a pessoa recomeçou sozinha
// A última ofensiva que a pessoa perdeu, varrendo os dias da janela de trás para a frente: a
// quebra é o primeiro dia em branco (sem leitura e sem escudo) depois de um dia coberto, e a
// sequência perdida são os dias lidos antes dela, com os dias cobertos por escudo servindo de
// ponte. Só vira gatilho quando a quebra é recente, a sequência valia a pena e a pessoa ainda não
// recomeçou (3 dias seguidos depois da quebra): é a hora de alguém chegar perto.
// Não usa o zerouEm nem o recomeco da simulação (src/app/02-estado.js): o recomeco é global e
// nunca volta a falso, então quem já quebrou e recomeçou uma vez na vida sumiria do alerta; e o
// zerouEm move para a quebra mais nova, então ler 1 ou 2 dias depois da perda apagaria a perda.
// Leva também semLerHa: os dias desde a última leitura (a mesma conta de "sem ler há N dias"),
// que é o número que o líder lê, sem ambiguidade com o dia em que a chama apagou.
export function ofensivaPerdida({ datas, hoje, simulacao, janela = JANELA_OFENSIVA_PERDIDA, minimo = OFENSIVA_MINIMA_ALERTA }) {
  // Depois da última quebra a corrida nunca zera: "recomeçou depois da última quebra" é atual >= 3.
  if (!simulacao || Number(simulacao.atual) >= DIAS_PARA_RECOMECAR) return null;
  const feitas = datas instanceof Set ? datas : new Set(datas || []);
  const protegidos = new Set(simulacao.protegidos || []);
  const coberto = (d) => feitas.has(d) || protegidos.has(d);
  let corridaDepois = 0; // a maior corrida de leitura (com escudos de ponte) depois da quebra examinada
  let corrida = 0;
  for (let q = somaDias(hoje, -1), n = 1; n <= janela; q = somaDias(q, -1), n++) {
    if (coberto(q)) { if (feitas.has(q)) corrida++; corridaDepois = Math.max(corridaDepois, corrida); continue; } // escudo é ponte, não zera
    corrida = 0;
    if (!coberto(somaDias(q, -1))) continue; // q não é o 1º dia do buraco que quebrou a sequência
    if (corridaDepois >= DIAS_PARA_RECOMECAR) return null; // recomeçou depois desta quebra
    let dias = 0;
    for (let d = somaDias(q, -1); coberto(d); d = somaDias(d, -1)) if (feitas.has(d)) dias++;
    // Sequência curta antes desta quebra: segue varrendo, porque uma perda longa pode estar logo
    // atrás (quem leu 1 ou 2 dias depois de perder 40 e parou de novo).
    if (dias < minimo) continue;
    const ultimaLeitura = [...feitas].filter((d) => d < hoje).sort().pop() || somaDias(q, -1);
    return { dias, em: q, haDias: diasEntre(q, hoje), semLerHa: diasEntre(ultimaLeitura, hoje), voltou: Number(simulacao.atual) > 0 };
  }
  return null;
}

// ---------- "Precisam de atenção" com gatilhos ----------
// A lista de propositos.mjs (faltou ao encontro, dias sem ler) ganha quem perdeu uma ofensiva
// longa há pouco. Cada pessoa aparece uma vez, com todos os seus gatilhos, em ordem de
// urgência: quem faltou, quem perdeu a ofensiva (a mais longa primeiro), quem só está sem ler.
// Os gatilhos se juntam ANTES de ordenar e cortar: quem perdeu a ofensiva e também está sem ler
// fica entre os da ofensiva, com os dois textos, e o teto de LIMITE_ATENCAO (para quem não
// faltou) só vale no fim. candidatos: os de quemPrecisaDeAtencao, cada um podendo trazer "perda"
// (o resultado de ofensivaPerdida).
export function atencaoComGatilhos({ candidatos, encontros, referencia, criadoEm = '' }) {
  const base = quemPrecisaDeAtencao({ candidatos, encontros, referencia, criadoEm, limite: Infinity });
  // O texto conta os dias desde a última leitura (o mesmo número de "sem ler há N dias"), nunca
  // desde o dia em que a chama apagou; quando a pessoa já aparece por "sem ler", não repete.
  const textoDaPerda = (perda, jaDizSemLer) => 'perdeu uma ofensiva de ' + perda.dias + ' dias'
    + (perda.voltou ? ', mas já voltou a ler' : jaDizSemLer || perda.semLerHa === undefined ? '' : ' e não lê há ' + perda.semLerHa + ' dias');
  const perdaDe = new Map(candidatos.filter((c) => c.perda).map((c) => [c.usuario, c.perda]));
  const itens = base.map((x) => ({
    usuario: x.usuario, nome: x.nome, motivo: x.motivo, faltou: !!x.faltou,
    gatilhos: [{ tipo: x.faltou ? 'faltou' : 'semLer', texto: x.motivo }],
  }));
  const naLista = new Set(itens.map((x) => x.usuario));
  for (const c of candidatos) if (c.perda && !naLista.has(c.usuario)) itens.push({ usuario: c.usuario, nome: c.nome, motivo: '', faltou: false, gatilhos: [] });
  for (const item of itens) {
    const perda = perdaDe.get(item.usuario);
    if (!perda) continue;
    const texto = textoDaPerda(perda, item.gatilhos.some((g) => g.tipo === 'semLer'));
    item.gatilhos.push({ tipo: 'ofensiva', texto });
    item.motivo = item.motivo ? item.motivo + ' · ' + texto : texto;
  }
  const faltaram = itens.filter((x) => x.faltou);
  const diasDaPerda = (x) => (perdaDe.get(x.usuario) || { dias: -1 }).dias; // sem perda: depois de qualquer perda
  const resto = itens.filter((x) => !x.faltou)
    .sort((a, b) => (diasDaPerda(b) - diasDaPerda(a)) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
    .slice(0, Math.max(0, LIMITE_ATENCAO - faltaram.length));
  return faltaram.concat(resto);
}

// =========================================================================
// O administrador: a igreja inteira, sem ninguém pelo nome
// =========================================================================

// ---------- o ranking das células pela chama coletiva ----------
// celulas: [{ id, titulo, lider, acesos: [true/false por membro de verdade], frequencia }]. Cada
// célula sai com os números exatos, inclusive a pequena: o admin pode abrir qualquer célula com
// o mesmo detalhe que o líder dela vê (decisão do dono), então mascarar aqui não protegeria nada.
// O tom é de animar os líderes, não de placar: por isso sai a porcentagem, e não um lugar no pódio.
export function rankingDaChama(celulas) {
  return (celulas || []).map((c) => {
    const t = termometro(c.acesos);
    return {
      id: c.id, titulo: c.titulo, lider: c.lider || '',
      membros: t.total, acesos: t.acesos, pct: t.pct,
      frequencia: c.frequencia === undefined || c.frequencia === null ? null : Math.round(Number(c.frequencia) * 10) / 10,
    };
  }).sort((a, b) => ((b.pct ?? -1) - (a.pct ?? -1)) || (b.membros - a.membros) || String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'));
}

// ---------- evangelismo: os frutos do mês ----------
// Os marcos de "Minha caminhada" (contas.mjs, campo marcos) com data neste mês e no anterior,
// com a contagem exata (decisão do dono): são frutos da igreja inteira, sem o nome de ninguém.
export const MARCOS_EVANGELISMO = ['decisao', 'batismo', 'celula', 'discipula'];
export function evangelismoDoMes(contas, hoje) {
  const mes = String(hoje).slice(0, 7);
  const anterior = somaDias(mes + '-01', -1).slice(0, 7);
  const contar = (m) => Object.fromEntries(MARCOS_EVANGELISMO.map((k) => [k,
    (contas || []).filter((c) => String(((c && c.marcos) || {})[k] || '').slice(0, 7) === m).length]));
  return { mes, anterior, deste: contar(mes), doAnterior: contar(anterior) };
}

// ---------- saúde: o check-in holístico, somado ----------
export const JANELA_CHECKIN = 7;
export const ESFERAS = ['corpo', 'mente', 'espirito'];
// O check-in de uma pessoa é dado de saúde: ele nunca sai por pessoa para a célula nem para a
// igreja (só o discipulador vê o do discípulo, como já era). Aqui ele sai somado: na igreja,
// a partir de MINIMO_PARA_MOSTRAR pessoas; na célula, a partir de MINIMO_CHECKIN_CELULA (numa
// célula de 6, esperar 5 check-ins deixaria o bloco sempre vazio; abaixo de 3, "1 de 2 com a
// mente em baixa" seria quase um nome).
export const MINIMO_CHECKIN_CELULA = 3;
// linhas: os check-ins da janela (usuario, data, corpo, mente, espirito de 1 a 3); vale o último
// de cada pessoa. Por esfera saem a porcentagem (pct) e a contagem (n) de cada faixa.
export function saudeDosCheckins(linhas, { minimo = MINIMO_PARA_MOSTRAR } = {}) {
  const ultimo = new Map();
  for (const l of linhas || []) {
    const atual = ultimo.get(l.usuario);
    if (!atual || atual.data < l.data) ultimo.set(l.usuario, l);
  }
  const base = ultimo.size;
  if (base < minimo) return { base, minimo, suficiente: false, esferas: null };
  const esferas = {};
  for (const k of ESFERAS) {
    const valores = [...ultimo.values()].map((l) => Number(l[k]));
    const faixa = (v) => { const n = valores.filter((x) => x === v).length; return { n, pct: pct(n, base) }; };
    const b = faixa(1); const m = faixa(2); const a = faixa(3);
    esferas[k] = { baixa: b.pct, media: m.pct, alta: a.pct, n: { baixa: b.n, media: m.n, alta: a.n } };
  }
  return { base, minimo, suficiente: true, esferas };
}

// ---------- adoção e retenção ----------
export const DIAS_SERIE_ADOCAO = 14;
export const IDADE_PARA_RETENCAO = 30;
// contas: [{ usuario, criadaEm, acessos }] (acessos: os dias em que a conta abriu o app, já
// anotados em contas.mjs); leramPorDia: Map dia -> pessoas (a view leituras_por_dia);
// leramNaSemana: Set de quem leu nos últimos 7 dias. Quem abriu e quem leu são contas de
// uso, não de fé: saem sem máscara, como no painel de hoje. media7 é a média dos 7 dias fechados
// antes de hoje (DIAS_SERIE_ADOCAO cobre os 8 dias necessários).
export function adocao({ contas, leramPorDia, leramNaSemana, hoje }) {
  const lista = contas || [];
  const abriramEm = (dia) => lista.filter((c) => (c.acessos || []).includes(dia)).length;
  const serie = Array.from({ length: DIAS_SERIE_ADOCAO }, (_, i) => {
    const dia = somaDias(hoje, -(DIAS_SERIE_ADOCAO - 1 - i));
    return { dia, abriram: abriramEm(dia), leram: Number((leramPorDia && leramPorDia.get(dia)) || 0) };
  });
  const ultimos7 = serie.slice(-8, -1); // os 7 dias fechados: hoje ainda está em andamento e puxaria a média para baixo
  const media = (campo) => Math.round((ultimos7.reduce((s, x) => s + x[campo], 0) / ultimos7.length) * 10) / 10;
  const deHoje = serie[serie.length - 1];
  // Retenção simples: das contas com 30 dias ou mais, quantas leram nos últimos 7 dias.
  const maduras = lista.filter((c) => c.criadaEm && c.criadaEm <= somaDias(hoje, -IDADE_PARA_RETENCAO));
  const ativas = maduras.filter((c) => leramNaSemana && leramNaSemana.has(c.usuario)).length;
  return {
    contas: lista.length,
    hoje: { abriram: deHoje.abriram, leram: deHoje.leram, pctAbriram: pct(deHoje.abriram, lista.length) },
    media7: { abriram: media('abriram'), leram: media('leram') },
    serie,
    retencao: { base: maduras.length, ativas, pct: pct(ativas, maduras.length) },
  };
}

// =========================================================================
// A cópia achatada das datas de leitura (leitura_dias) e as consultas
// =========================================================================

// Regrava as datas de uma pessoa: entra o que faltava, sai o que ela não tem mais (zerou o
// progresso). Uma consulta pela chave primária e só as linhas que mudaram, numa transação.
export function sincronizarLeituraDias(db, usuario, datas) {
  const novas = new Set([...(datas instanceof Set ? datas : datas || [])].filter((d) => DATA_VALIDA.test(String(d))));
  const antigas = new Set(db.prepare('SELECT data FROM leitura_dias WHERE usuario = ?').all(usuario).map((l) => l.data));
  const entram = [...novas].filter((d) => !antigas.has(d));
  const saem = [...antigas].filter((d) => !novas.has(d));
  if (!entram.length && !saem.length) return 0;
  transacao(db, () => {
    const inserir = db.prepare('INSERT OR IGNORE INTO leitura_dias (usuario, data) VALUES (?, ?)');
    for (const d of entram) inserir.run(usuario, d);
    const apagar = db.prepare('DELETE FROM leitura_dias WHERE usuario = ? AND data = ?');
    for (const d of saem) apagar.run(usuario, d);
  });
  return entram.length + saem.length;
}

// Uma vez só, na primeira subida com o esquema v14: as datas de quem já tinha progresso entram
// na tabela. Daí em diante cada sincronização do progresso mantém a cópia em dia.
export function preencherLeituraDias(db) {
  if (lerMeta(db, 'leitura_dias_preenchida') !== null) return 0;
  const usuarios = db.prepare('SELECT usuario FROM estados').all().map((l) => l.usuario);
  let linhas = 0;
  transacao(db, () => {
    for (const u of usuarios) {
      let estado = null;
      try { estado = lerEstadoDoBanco(db, u); } catch { estado = null; }
      linhas += sincronizarLeituraDias(db, u, datasFeitas(estado));
    }
    gravarMeta(db, 'leitura_dias_preenchida', new Date().toISOString());
  });
  return linhas;
}

export const apagarLeituraDias = (db, usuario) => db.prepare('DELETE FROM leitura_dias WHERE usuario = ?').run(usuario);

// Quantas pessoas leram em cada dia da janela (de, ate]: a view leituras_por_dia.
export function leiturasPorDia(db, de, ate) {
  const mapa = new Map();
  for (const l of db.prepare('SELECT data, pessoas FROM leituras_por_dia WHERE data > ? AND data <= ?').all(de, ate)) mapa.set(l.data, Number(l.pessoas));
  return mapa;
}

// Quem leu ao menos um dia na janela (de, ate].
export function quemLeuEntre(db, de, ate) {
  return new Set(db.prepare('SELECT DISTINCT usuario FROM leitura_dias WHERE data > ? AND data <= ?').all(de, ate).map((l) => l.usuario));
}

// As datas de cada pessoa desde "desde" (inclusive), para simular a chama de todo mundo numa
// consulta só: usuario -> Set de datas. A janela limita as linhas (uns 120 dias bastam para a
// ofensiva de hoje; o que vem antes só mudaria um escudo guardado).
// Uma linha por pessoa (group_concat), não uma por data: com 2.000 contas e um ano de leitura são
// 200 mil linhas na janela, e devolver cada uma como objeto JS custava uns 600 ms com o servidor
// parado para todo mundo; agrupado no SQLite, pela chave primária (usuario, data), cai para uns
// 70 ms. Datas ISO não têm vírgula, e a ordem não importa (simularOfensiva reordena).
export const JANELA_CHAMA = 120;
export function datasDesde(db, desde) {
  const mapa = new Map();
  for (const l of db.prepare('SELECT usuario, group_concat(data) AS datas FROM leitura_dias WHERE data >= ? GROUP BY usuario').all(desde)) {
    mapa.set(l.usuario, new Set(String(l.datas || '').split(',').filter(Boolean)));
  }
  return mapa;
}

// A média de pessoas por encontro de cada célula na janela (de, ate], pela view celula_frequencia
// (semana "sem encontro" fora): proposito -> média.
export function frequenciaMediaPorCelula(db, de, ate) {
  const mapa = new Map();
  for (const l of db.prepare('SELECT proposito, AVG(presentes + visitantes) AS media FROM celula_frequencia WHERE sem_encontro = 0 AND data > ? AND data <= ? GROUP BY proposito').all(de, ate)) {
    mapa.set(l.proposito, Number(l.media));
  }
  return mapa;
}

// Os check-ins da janela (de, ate], para saudeDosCheckins. O usuario só serve para valer o último
// de cada pessoa: nunca sai do servidor.
export const checkinsEntre = (db, de, ate) => db.prepare('SELECT usuario, data, corpo, mente, espirito FROM checkins WHERE data > ? AND data <= ?').all(de, ate);
// Os check-ins de algumas pessoas (os membros de uma célula) na janela (de, ate].
export function checkinsDe(db, usuarios, de, ate) {
  const lista = [...new Set(usuarios || [])];
  if (!lista.length) return [];
  return db.prepare('SELECT usuario, data, corpo, mente, espirito FROM checkins WHERE data > ? AND data <= ? AND usuario IN (' + lista.map(() => '?').join(',') + ')').all(de, ate, ...lista);
}
