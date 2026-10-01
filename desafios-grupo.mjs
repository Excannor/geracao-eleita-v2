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
