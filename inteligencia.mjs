// Inteligência: as métricas de quem lidera. Dois perfis, duas perguntas:
//   o líder de célula quer saber quem precisa de ajuda e como vai a saúde do pequeno grupo
//   (visão tática, cuidado pastoral: só a própria célula, nunca o que alguém escreveu);
//   o administrador quer saber se a estratégia de Atos 2 está funcionando na igreja inteira
//   (visão estratégica: só agregados, nunca pessoa por pessoa).
// Aqui moram as regras puras, que os testes exercitam sem servidor, e as consultas à cópia
// achatada das datas de leitura (leitura_dias, esquema v14). Quem junta os dados e serve é
// servidor.mjs; a modelagem e as decisões de privacidade estão em docs/inteligencia.md.
import { datasFeitas, somaDias } from './contas.mjs';
import { quemPrecisaDeAtencao, LIMITE_ATENCAO } from './propositos.mjs';
import { mascarar, MINIMO_PARA_MOSTRAR } from './painel.mjs';
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

// ---------- a frequência dos últimos encontros ----------
export const ENCONTROS_NA_FREQUENCIA = 4;
// Os últimos encontros registrados até a referência, do mais antigo para o mais novo. A semana
// marcada como "não houve encontro" entra como tal (pessoas: null), nunca como zero: ninguém
// faltou a um encontro que não houve. A tendência compara os dois últimos encontros de verdade.
export function frequencia(encontros, referencia, quantos = ENCONTROS_NA_FREQUENCIA) {
  const lista = (encontros || [])
    .filter((e) => e && DATA_VALIDA.test(String(e.data || '')) && (!referencia || e.data <= referencia))
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
// "Minha caminhada" (os marcos) e por quem ela acompanha no discipulado. Só contagens.
export const ETAPAS_FUNIL = [
  ['comecando', 'Dando os primeiros passos'],
  ['decidiu', 'Decidiram seguir Jesus'],
  ['batizado', 'Já se batizaram'],
  ['acompanha', 'Acompanham alguém na fé'],
];
export const PRIMEIROS_PASSOS_TOTAL = 12;
// pessoas: [{ marcos: { decisao, batismo, discipula }, acompanha (discípulos ativos), caminho, passos }]
export function funil(pessoas) {
  const etapaDe = (p) => {
    const m = (p && p.marcos) || {};
    if (m.discipula || (p && Number(p.acompanha) > 0)) return 'acompanha';
    if (m.batismo) return 'batizado';
    if (m.decisao) return 'decidiu';
    return 'comecando';
  };
  const contagem = Object.fromEntries(ETAPAS_FUNIL.map(([k]) => [k, 0]));
  let conhecendo = 0;
  let passosConcluidos = 0;
  for (const p of pessoas || []) {
    const etapa = etapaDe(p);
    contagem[etapa]++;
    if (etapa !== 'comecando') continue;
    if (p && p.caminho === 'conhecer') conhecendo++;
    else if (p && Number(p.passos) >= PRIMEIROS_PASSOS_TOTAL) passosConcluidos++;
  }
  return ETAPAS_FUNIL.map(([etapa, rotulo]) => ({
    etapa, rotulo, pessoas: contagem[etapa],
    // no começo da caminhada, quem ainda está conhecendo Jesus e quem já fechou os 12 passos
    ...(etapa === 'comecando' ? { conhecendo, passosConcluidos } : {}),
  }));
}

// ---------- a ofensiva perdida: o gatilho do cuidado ----------
export const JANELA_OFENSIVA_PERDIDA = 14; // a perda só é recente dentro destes dias
export const OFENSIVA_MINIMA_ALERTA = 7; // perder menos que uma semana não é gatilho
// A última ofensiva que a pessoa perdeu: a sequência que vinha até o dia anterior à quebra
// (zerouEm, da simulação de src/app/02-estado.js), com os dias cobertos por escudo servindo
// de ponte. Só vira gatilho quando a quebra é recente, a sequência valia a pena e a pessoa
// ainda não recomeçou (3 dias seguidos de novo): é a hora de alguém chegar perto.
export function ofensivaPerdida({ datas, hoje, simulacao, janela = JANELA_OFENSIVA_PERDIDA, minimo = OFENSIVA_MINIMA_ALERTA }) {
  if (!simulacao || !simulacao.zerouEm || simulacao.recomeco) return null;
  const quebra = simulacao.zerouEm;
  const haDias = diasEntre(quebra, hoje);
  if (haDias < 0 || haDias > janela) return null;
  const feitas = datas instanceof Set ? datas : new Set(datas || []);
  const protegidos = new Set(simulacao.protegidos || []);
  let dias = 0;
  for (let d = somaDias(quebra, -1); feitas.has(d) || protegidos.has(d); d = somaDias(d, -1)) if (feitas.has(d)) dias++;
  if (dias < minimo) return null;
  return { dias, em: quebra, haDias, voltou: Number(simulacao.atual) > 0 };
}

// ---------- "Precisam de atenção" com gatilhos ----------
// A lista de propositos.mjs (faltou ao encontro, dias sem ler) ganha quem perdeu uma ofensiva
// longa há pouco. Cada pessoa aparece uma vez, com todos os seus gatilhos, em ordem de
// urgência: quem faltou, quem perdeu a ofensiva, quem só está sem ler. O teto de
// LIMITE_ATENCAO continua valendo para quem não faltou. candidatos: os de quemPrecisaDeAtencao,
// cada um podendo trazer "perda" (o resultado de ofensivaPerdida).
export function atencaoComGatilhos({ candidatos, encontros, referencia, criadoEm = '' }) {
  const base = quemPrecisaDeAtencao({ candidatos, encontros, referencia, criadoEm });
  const textoDaPerda = (perda) => 'perdeu uma ofensiva de ' + perda.dias + ' dias'
    + (perda.haDias === 0 ? ' hoje' : perda.haDias === 1 ? ' ontem' : ' há ' + perda.haDias + ' dias')
    + (perda.voltou ? ', mas já voltou a ler' : '');
  const porUsuario = new Map(base.map((x) => [x.usuario, {
    usuario: x.usuario, nome: x.nome, motivo: x.motivo, faltou: !!x.faltou,
    gatilhos: [{ tipo: x.faltou ? 'faltou' : 'semLer', texto: x.motivo }],
  }]));
  const soPelaPerda = [];
  for (const c of candidatos) {
    if (!c.perda) continue;
    const texto = textoDaPerda(c.perda);
    const item = porUsuario.get(c.usuario);
    if (item) {
      item.gatilhos.push({ tipo: 'ofensiva', texto });
      item.motivo += ' · ' + texto;
      continue;
    }
    soPelaPerda.push({ usuario: c.usuario, nome: c.nome, motivo: texto, faltou: false, gatilhos: [{ tipo: 'ofensiva', texto }], dias: c.perda.dias });
  }
  soPelaPerda.sort((a, b) => (b.dias - a.dias) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const faltaram = [...porUsuario.values()].filter((x) => x.faltou);
  const semLer = [...porUsuario.values()].filter((x) => !x.faltou);
  const resto = soPelaPerda.map(({ dias, ...x }) => x).concat(semLer).slice(0, Math.max(0, LIMITE_ATENCAO - faltaram.length));
  return faltaram.concat(resto);
}

// =========================================================================
// O administrador: a igreja inteira, sem ninguém pelo nome
// =========================================================================

// ---------- o ranking das células pela chama coletiva ----------
// celulas: [{ id, titulo, acesos: [true/false por membro de verdade], frequencia }]. Com menos
// de MINIMO_PARA_MOSTRAR membros a porcentagem sairia como "1 de 2": a célula aparece, mas sem
// número, para ninguém ser identificado numa célula pequena. O tom é de animar os líderes, não
// de placar: por isso sai a porcentagem, e não um lugar no pódio.
export function rankingDaChama(celulas) {
  return (celulas || []).map((c) => {
    const t = termometro(c.acesos);
    const poucos = t.total < MINIMO_PARA_MOSTRAR;
    return {
      id: c.id, titulo: c.titulo, poucos,
      membros: mascarar(t.total), acesos: poucos ? null : t.acesos, pct: poucos ? null : t.pct,
      frequencia: c.frequencia === undefined || c.frequencia === null ? null : Math.round(Number(c.frequencia) * 10) / 10,
      total: t.total,
    };
  }).sort((a, b) => ((b.pct ?? -1) - (a.pct ?? -1)) || (b.total - a.total) || String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'))
    .map(({ total, ...c }) => c);
}

// ---------- evangelismo: os frutos do mês ----------
// Os marcos de "Minha caminhada" (contas.mjs, campo marcos) com data neste mês e no anterior.
// Cada número conta pessoas, então passa pelo "menos de 5" do painel.
export const MARCOS_EVANGELISMO = ['decisao', 'batismo', 'celula', 'discipula'];
export function evangelismoDoMes(contas, hoje) {
  const mes = String(hoje).slice(0, 7);
  const anterior = somaDias(mes + '-01', -1).slice(0, 7);
  const contar = (m) => Object.fromEntries(MARCOS_EVANGELISMO.map((k) => [k,
    mascarar((contas || []).filter((c) => String(((c && c.marcos) || {})[k] || '').slice(0, 7) === m).length)]));
  return { mes, anterior, deste: contar(mes), doAnterior: contar(anterior) };
}

// ---------- saúde: o check-in holístico da igreja ----------
export const JANELA_CHECKIN = 7;
export const ESFERAS = ['corpo', 'mente', 'espirito'];
// linhas: os check-ins da janela (usuario, data, corpo, mente, espirito de 1 a 3); vale o último
// de cada pessoa. Com menos de MINIMO_PARA_MOSTRAR pessoas, nada sai além de "menos de 5":
// uma porcentagem sobre 3 pessoas aponta para alguém.
export function saudeDosCheckins(linhas, { minimo = MINIMO_PARA_MOSTRAR } = {}) {
  const ultimo = new Map();
  for (const l of linhas || []) {
    const atual = ultimo.get(l.usuario);
    if (!atual || atual.data < l.data) ultimo.set(l.usuario, l);
  }
  const base = ultimo.size;
  if (base < minimo) return { base: mascarar(base), suficiente: false, esferas: null };
  const esferas = {};
  for (const k of ESFERAS) {
    const valores = [...ultimo.values()].map((l) => Number(l[k]));
    esferas[k] = {
      baixa: pct(valores.filter((v) => v === 1).length, base),
      media: pct(valores.filter((v) => v === 2).length, base),
      alta: pct(valores.filter((v) => v === 3).length, base),
    };
  }
  return { base, suficiente: true, esferas };
}

// ---------- adoção e retenção ----------
export const DIAS_SERIE_ADOCAO = 14;
export const IDADE_PARA_RETENCAO = 30;
// contas: [{ usuario, criadaEm, acessos }] (acessos: os dias em que a conta abriu o app, já
// anotados em contas.mjs); leramPorDia: Map dia -> pessoas (a view leituras_por_dia);
// leramNaSemana: Set de quem leu nos últimos 7 dias. Quem abriu e quem leu são contas de
// uso, não de fé: saem sem máscara, como no painel de hoje.
export function adocao({ contas, leramPorDia, leramNaSemana, hoje }) {
  const lista = contas || [];
  const abriramEm = (dia) => lista.filter((c) => (c.acessos || []).includes(dia)).length;
  const serie = Array.from({ length: DIAS_SERIE_ADOCAO }, (_, i) => {
    const dia = somaDias(hoje, -(DIAS_SERIE_ADOCAO - 1 - i));
    return { dia, abriram: abriramEm(dia), leram: Number((leramPorDia && leramPorDia.get(dia)) || 0) };
  });
  const ultimos7 = serie.slice(-7);
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
export const JANELA_CHAMA = 120;
export function datasDesde(db, desde) {
  const mapa = new Map();
  for (const l of db.prepare('SELECT usuario, data FROM leitura_dias WHERE data >= ?').all(desde)) {
    if (!mapa.has(l.usuario)) mapa.set(l.usuario, new Set());
    mapa.get(l.usuario).add(l.data);
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

// Os check-ins da janela (de, ate], para saudeDosCheckins. Só os níveis, nunca quem.
export const checkinsEntre = (db, de, ate) => db.prepare('SELECT usuario, data, corpo, mente, espirito FROM checkins WHERE data > ? AND data <= ?').all(de, ate);
