// Desafios de consagração em grupo: a célula (quem conduz começa) ou a dupla do discipulado
// (qualquer um dos dois começa) entram juntas num dos desafios de vários dias da aba Desafios.
// Cada um continua marcando o próprio dia no app, no mesmo registro do desafio pessoal
// (estado.desafios[id].dias); o servidor só lê esses dias a partir do começo do grupo e mostra
// a todos quem venceu hoje e quem escapou. Nunca o que alguém escreveu: só datas.
// Regras puras, sem banco: o servidor e os testes usam as mesmas.

// Os mesmos desafios de src/app/09c-desafios.js (o id, o título e a duração precisam bater).
export const DESAFIOS_GRUPO = {
  'sem-redes-21': { titulo: '21 dias sem redes sociais', dias: 21 },
  'celular-cama-7': { titulo: '7 dias sem celular na cama', dias: 7 },
  'gratidao-14': { titulo: '14 dias de gratidão', dias: 14 },
  'sem-reclamar-30': { titulo: '30 dias sem reclamar', dias: 30 },
};
export const TIPOS_GRUPO = ['celula', 'discipulado'];
// Depois do último dia, o resultado ainda fica à vista por uns dias antes de sair da tela.
export const DIAS_DEPOIS_DO_FIM = 3;

const somaDias = (texto, n) => {
  const d = new Date(texto + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dataValida = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

export const fimDoDesafio = (inicio, desafio) => somaDias(inicio, (DESAFIOS_GRUPO[desafio] || { dias: 1 }).dias - 1);
// Ainda aparece para o grupo: não foi encerrado e não passou da folga depois do fim.
export const desafioVisivel = (g, hoje) => !!g && !g.encerradoEm && hoje <= somaDias(fimDoDesafio(g.inicio, g.desafio), DIAS_DEPOIS_DO_FIM);

// O progresso de uma pessoa no desafio do grupo, a partir do registro dela
// ({ inicio, dias: [datas], ativo, concluidoEm }) e do dia de hoje no fuso dela.
//   entrou     ativou o desafio ou já venceu algum dia desde o começo do grupo
//   vencidos   dias vencidos entre o começo do grupo e hoje (no máximo a duração)
//   escapados  dias que passaram sem vencer, contados do primeiro dia dela no grupo até ontem
//   escapou    não venceu ontem (e já tinha começado antes de ontem)
export function progressoNoGrupo({ desafio, inicio, hoje, registro }) {
  const d = DESAFIOS_GRUPO[desafio];
  if (!d || !dataValida(inicio) || !dataValida(hoje)) return null;
  const fim = fimDoDesafio(inicio, desafio);
  const ate = hoje < fim ? hoje : fim;
  const r = registro && typeof registro === 'object' ? registro : null;
  const dias = [...new Set((r && Array.isArray(r.dias) ? r.dias : []).filter((x) => dataValida(x) && x >= inicio && x <= ate))].sort();
  const vencidos = Math.min(dias.length, d.dias);
  const entrou = !!(r && (r.ativo || dias.length));
  const venceuHoje = hoje <= fim && dias.includes(hoje);
  const ontem = somaDias(hoje, -1);
  // O primeiro dia dela no grupo: o primeiro vencido ou, se ainda não venceu nenhum, o dia em
  // que o registro começou (quem entrou hoje ainda não escapou de nada).
  const primeiro = dias[0] || (r && dataValida(r.inicio) && r.inicio > inicio ? r.inicio : inicio);
  let escapados = 0;
  if (entrou) {
    const ultimoQueConta = ontem < fim ? ontem : fim;
    for (let x = primeiro; x <= ultimoQueConta; x = somaDias(x, 1)) if (!dias.includes(x)) escapados++;
  }
  const escapou = entrou && ontem >= primeiro && ontem <= fim && !dias.includes(ontem);
  return { entrou, vencidos, venceuHoje, escapou, escapados, concluido: vencidos >= d.dias };
}

// O dia do desafio em que o grupo está (1 no primeiro dia), limitado à duração.
export function diaDoGrupo(inicio, desafio, hoje) {
  const d = DESAFIOS_GRUPO[desafio];
  if (!d || !dataValida(inicio) || !dataValida(hoje)) return 0;
  const n = Math.round((Date.parse(hoje + 'T12:00:00Z') - Date.parse(inicio + 'T12:00:00Z')) / 86400000) + 1;
  return Math.max(0, Math.min(d.dias, n));
}

// ---------- R3.3: o calendário sazonal da célula (docs/fases/r3-temporadas.md) ----------
// Cinco momentos do ano: janeiro, fevereiro, Semana Santa, setembro e novembro. Nenhum cria uma
// leitura nova nem uma sequência nova: cada um conta, dentro das datas, os dias do PRÓPRIO plano que
// cada pessoa leu (estado.marcadoEm, a data em que cada dia do plano foi marcado, no fuso dela), e a
// célula tem uma meta só, numa barra só. Sai para a célula só o número somado: nunca quem leu.
//   soma        cada pessoa conta até porPessoa dias lidos na janela; a meta é porPessoa x pessoas
//   dias        um dia da janela conta quando metade da célula (ou mais) leu um dia do plano nele
//   temporadas  conta quem fechou uma temporada dentro da janela; a meta é metade da célula
export const MOMENTOS = [
  { id: 'janeiro', titulo: 'Comece o ano', tipo: 'soma', porPessoa: 10, selo: 'Pegada',
    texto: 'De 1 a 31 de janeiro, cada um lê o próprio plano. A meta da célula é de 10 dias lidos por pessoa.' },
  { id: 'fevereiro', titulo: '21 dias', tipo: 'dias', meta: 21, selo: 'Três elos',
    texto: 'Em fevereiro, um dia conta para a célula quando metade dela lê o plano nesse dia. A meta é de 21 dias.' },
  { id: 'semana-santa', titulo: 'Semana Santa', tipo: 'dias', meta: 8, selo: 'Ramo de palmeira',
    texto: 'Do Domingo de Ramos à Páscoa, um dia conta quando metade da célula lê o plano nesse dia. A meta são os 8 dias.' },
  { id: 'setembro', titulo: 'Mês da Bíblia', tipo: 'temporadas', selo: 'Bíblia aberta',
    texto: 'Em setembro, a meta é que metade da célula termine pelo menos uma temporada do plano.' },
  { id: 'novembro', titulo: '30 dias', tipo: 'soma', porPessoa: 30, selo: 'Folha de calendário',
    texto: 'Em novembro, cada um lê o próprio plano. A meta da célula é de 30 dias lidos por pessoa.' },
];
// Depois do fim, o resultado fica à vista por alguns dias; antes do começo, o momento aparece uma
// semana antes, só com o convite.
export const DIAS_DEPOIS_DO_MOMENTO = 5;
export const DIAS_ANTES_DO_MOMENTO = 7;

// A Páscoa (domingo) de um ano, pelo cálculo gregoriano (Meeus/Jones/Butcher).
export function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return ano + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
}
const ultimoDiaDoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
export function janelaDoMomento(id, ano) {
  const dois = (n) => String(n).padStart(2, '0');
  if (id === 'janeiro') return { inicio: ano + '-01-01', fim: ano + '-01-31' };
  if (id === 'fevereiro') return { inicio: ano + '-02-01', fim: ano + '-02-' + dois(ultimoDiaDoMes(ano, 2)) };
  if (id === 'semana-santa') { const p = pascoa(ano); return { inicio: somaDias(p, -7), fim: p }; }
  if (id === 'setembro') return { inicio: ano + '-09-01', fim: ano + '-09-30' };
  if (id === 'novembro') return { inicio: ano + '-11-01', fim: ano + '-11-30' };
  return null;
}

// O momento que a célula vê hoje: o que está correndo; senão o que terminou há poucos dias; senão o
// que começa em até uma semana. null fora disso.
export function momentoDe(hoje) {
  if (!dataValida(hoje)) return null;
  const ano = Number(hoje.slice(0, 4));
  const janelas = [ano - 1, ano, ano + 1].flatMap((a) => MOMENTOS.map((m) => ({ m, ...janelaDoMomento(m.id, a) })));
  return janelas.find((j) => j.inicio <= hoje && hoje <= j.fim)
    || janelas.find((j) => hoje > j.fim && hoje <= somaDias(j.fim, DIAS_DEPOIS_DO_MOMENTO))
    || janelas.find((j) => hoje < j.inicio && somaDias(hoje, DIAS_ANTES_DO_MOMENTO) >= j.inicio)
    || null;
}

// As datas em que a pessoa leu algum dia do plano, e quantos dias do plano em cada data.
function leiturasPorData(estado, totalDias) {
  const mapa = new Map();
  const lidos = new Set(((estado && estado.lidos) || []).map(Number));
  for (const [k, d] of Object.entries((estado && estado.marcadoEm) || {})) {
    const n = Number(k);
    if (!Number.isInteger(n) || n < 1 || n > totalDias || !dataValida(d) || !lidos.has(n)) continue;
    mapa.set(d, (mapa.get(d) || 0) + 1);
  }
  return mapa;
}
// Fechou uma temporada dentro da janela: todos os dias dela lidos, e o último deles marcado na janela.
function fechouTemporadaNa(estado, temporadas, inicio, fim) {
  const lidos = new Set(((estado && estado.lidos) || []).map(Number));
  const marcado = (estado && estado.marcadoEm) || {};
  return (temporadas || []).some((t) => {
    let ultima = '';
    for (let n = t.de; n <= t.ate; n++) {
      if (!lidos.has(n) || !dataValida(marcado[n])) return false;
      if (marcado[n] > ultima) ultima = marcado[n];
    }
    return ultima >= inicio && ultima <= fim;
  });
}

// O momento da célula hoje, só com números somados. estados: o estado de cada membro que conta (os
// ativos, sem visitante). temporadas: conteudo.temporadas. totalDias: o tamanho do plano.
export function momentoDaCelula({ hoje, estados, temporadas, totalDias = 365 }) {
  const j = momentoDe(hoje);
  if (!j) return null;
  const { m, inicio, fim } = j;
  const pessoas = (estados || []).length;
  const fase = hoje < inicio ? 'antes' : hoje > fim ? 'depois' : 'durante';
  const ate = hoje < fim ? hoje : fim;
  let total = 0;
  let meta = 0;
  if (fase !== 'antes' && pessoas) {
    if (m.tipo === 'soma') {
      meta = m.porPessoa * pessoas;
      for (const e of estados) {
        let n = 0;
        for (const [d, q] of leiturasPorData(e, totalDias)) if (d >= inicio && d <= ate) n += q;
        total += Math.min(n, m.porPessoa);
      }
    } else if (m.tipo === 'dias') {
      meta = m.meta;
      const porPessoa = estados.map((e) => leiturasPorData(e, totalDias));
      for (let d = inicio; d <= ate; d = somaDias(d, 1)) {
        const leram = porPessoa.filter((mapa) => mapa.has(d)).length;
        if (leram * 2 >= pessoas) total++;
      }
      total = Math.min(total, meta);
    } else if (m.tipo === 'temporadas') {
      meta = Math.ceil(pessoas / 2);
      total = Math.min(meta, estados.filter((e) => fechouTemporadaNa(e, temporadas, inicio, ate)).length);
    }
  } else if (m.tipo === 'soma') meta = m.porPessoa * pessoas;
  else if (m.tipo === 'dias') meta = m.meta;
  else meta = Math.ceil(pessoas / 2);
  const diasDaJanela = Math.round((Date.parse(fim + 'T12:00:00Z') - Date.parse(inicio + 'T12:00:00Z')) / 86400000) + 1;
  const diaDaJanela = fase === 'durante' ? Math.round((Date.parse(hoje + 'T12:00:00Z') - Date.parse(inicio + 'T12:00:00Z')) / 86400000) + 1 : 0;
  return { id: m.id, titulo: m.titulo, tipo: m.tipo, texto: m.texto, selo: m.selo, inicio, fim, fase, diaDaJanela, diasDaJanela,
    pessoas, total, meta, chegou: meta > 0 && total >= meta };
}

// ---------- R3.4: a retrospectiva de dezembro (o ano da célula) ----------
// A época: de 1º de dezembro a 7 de janeiro. Devolve o ano que a retrospectiva mostra (em janeiro,
// o ano que acabou), ou 0 fora da época. O app tem a mesma regra (src/sob-demanda/retrospectiva.js).
export const RETROSPECTIVA_ATE_JANEIRO = 7;
export function anoDaRetrospectiva(hoje) {
  if (!dataValida(hoje)) return 0;
  const ano = Number(hoje.slice(0, 4));
  if (hoje.slice(5, 7) === '12') return ano;
  if (hoje.slice(5, 7) === '01' && Number(hoje.slice(8, 10)) <= RETROSPECTIVA_ATE_JANEIRO) return ano - 1;
  return 0;
}
// Abaixo disso, os números somados quase dizem quanto cada um leu: a célula vê só o aviso.
export const PESSOAS_MINIMAS_RETROSPECTIVA = 3;

// O ano da célula, só com números somados (nunca de uma pessoa). estados: os membros que contam
// (ativos, sem visitante), como estão hoje. plano: conteudo.plano (para os capítulos de cada dia).
// encontros: as datas dos encontros registrados. ate: o último dia que conta (hoje, em dezembro).
export function anoDaCelula({ ano, ate, estados, plano, temporadas, encontros = [] }) {
  const pessoas = (estados || []).length;
  if (!ano) return null;
  if (pessoas < PESSOAS_MINIMAS_RETROSPECTIVA) return { ano, pessoas, poucos: true };
  const doAno = (d) => dataValida(d) && d.slice(0, 4) === String(ano) && (!ate || d <= ate);
  const capitulosDoDia = (n) => ((plano[n - 1] || {}).trechos || []).reduce((s, t) => s + (t.ate - t.de + 1), 0);
  let diasLidos = 0;
  let capitulos = 0;
  let temporadasFechadas = 0;
  for (const e of estados) {
    const lidos = new Set(((e && e.lidos) || []).map(Number));
    const marcado = (e && e.marcadoEm) || {};
    for (const n of lidos) if (n >= 1 && n <= plano.length && doAno(marcado[n])) { diasLidos++; capitulos += capitulosDoDia(n); }
    for (const t of temporadas || []) {
      let ultima = '';
      let fechada = true;
      for (let n = t.de; n <= t.ate && fechada; n++) {
        if (!lidos.has(n) || !dataValida(marcado[n])) fechada = false;
        else if (marcado[n] > ultima) ultima = marcado[n];
      }
      if (fechada && doAno(ultima)) temporadasFechadas++;
    }
  }
  // os momentos do calendário em que a célula bateu a meta neste ano
  let metas = 0;
  let momentos = 0;
  for (const m of MOMENTOS) {
    const j = janelaDoMomento(m.id, ano);
    if (ate && j.inicio > ate) continue;
    momentos++;
    const r = momentoDaCelula({ hoje: ate && ate < j.fim ? ate : j.fim, estados, temporadas, totalDias: plano.length });
    if (r && r.id === m.id && r.chegou) metas++;
  }
  const encontrosNoAno = new Set((encontros || []).filter(doAno)).size;
  return { ano, pessoas, diasLidos, capitulos, temporadas: temporadasFechadas, encontros: encontrosNoAno, metas, momentos };
}
