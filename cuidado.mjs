// Cuidado mútuo (Atos 2.42, "perseveravam... nas orações"; 2.44-45, "repartiam com os que
// tinham necessidade"). O pedido é só do autor: os outros nunca respondem em texto, só com um
// gesto ("Orei por você" ou "Posso ajudar"). Nada disto vai para o Feed, e nada vale XP.
//
// Aqui moram só as regras puras, testadas sem servidor; quem guarda é contas.mjs e quem serve
// é servidor.mjs.

export const TIPOS = ['oracao', 'necessidade'];
export const tipoValido = (t) => TIPOS.includes(String(t || ''));

export const DESTINOS = ['celula', 'conduz'];
// Necessidade é sempre para a célula inteira (é ajuda prática, quanto mais gente souber,
// melhor); só a oração pode ser reservada para quem conduz.
export function destinoValido(tipo, destino) {
  if (!tipoValido(tipo)) return false;
  if (tipo === 'necessidade') return destino === 'celula';
  return DESTINOS.includes(String(destino || ''));
}

export const DIAS_VALIDOS = [7, 30];
export const diasValido = (dias) => DIAS_VALIDOS.includes(Number(dias));

// Oração cabe mais texto (é um desabafo); necessidade é objetiva (o que falta, para combinar
// fora do app).
export const TEXTO_MAX = { oracao: 280, necessidade: 200 };
export const limparTexto = (texto) => String(texto || '').replace(/\s+/g, ' ').trim();
export function textoValido(tipo, texto) {
  const t = limparTexto(texto);
  if (!t) return false;
  const max = TEXTO_MAX[tipo] || TEXTO_MAX.oracao;
  return t.length <= max;
}

// No máximo 3 pedidos ativos por pessoa em cada célula: pedir oração não pode virar um mural.
export const LIMITE_ATIVOS_POR_CELULA = 3;

export const MOTIVOS_DENUNCIA_PEDIDO = ['É ofensivo', 'Não é um pedido', 'Alguém pode estar em perigo'];
export const motivoDenunciaValido = (m) => MOTIVOS_DENUNCIA_PEDIDO.includes(String(m || ''));
// O motivo que, sozinho, já avisa quem conduz na hora e mostra a caixa de ajuda a quem denunciou.
export const MOTIVO_PERIGO = 'Alguém pode estar em perigo';

// Com 2 denúncias (de qualquer motivo, somadas) o pedido some da lista de todo mundo, menos
// do autor e de quem conduz, até uma decisão.
export const LIMITE_DENUNCIAS_ESCONDE = 2;

// 30 dias depois de vencido, o pedido é apagado do banco de vez, com gestos e denúncias.
export const DIAS_ATE_APAGAR = 30;

const somaDias = (texto, n) => {
  const d = new Date(String(texto) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + Number(n));
  return d.toISOString().slice(0, 10);
};

// A data em que um pedido novo vence: "hoje" mais 7 ou 30 dias.
export const venceEmDe = (hoje, dias) => somaDias(hoje, dias);

// Quem pode criar, ver e reagir: membro ativo da célula que não está só conhecendo (visitante).
export const membroDeVerdade = (m) => !!m && m.estado === 'ativo' && m.papel !== 'visitante';

// Se um pedido está escondido por denúncia (2 ou mais), à espera de quem conduz decidir.
export const escondidoPorDenuncia = (pedido) => (pedido.denuncias || []).length >= LIMITE_DENUNCIAS_ESCONDE;

// A regra central de visibilidade: o que cada pessoa pode ver de um pedido, dado se ela
// conduz a célula e a data de hoje. Pura: recebe só o pedido e o contexto já resolvidos.
//   usuario: quem está olhando · hoje: a data dele · conduz: se ele conduz a célula
export function pedidoVisivelPara(pedido, { usuario, hoje, conduz }) {
  if (!pedido || pedido.estado === 'removido') return false;
  // vencido: some para todo mundo, mesmo para o autor (ele já viu "vence em" na tela).
  if (String(hoje) > String(pedido.venceEm)) return false;
  const souAutor = pedido.autor === usuario;
  // "Deus respondeu": some da lista dos outros, fica só na do autor (o venceEm já foi
  // encurtado para 7 dias à frente por quem marcou).
  if (pedido.estado === 'respondido' && !souAutor) return false;
  // Só para quem conduz: autor, líder e auxiliares.
  if (pedido.destino === 'conduz' && !souAutor && !conduz) return false;
  if (escondidoPorDenuncia(pedido) && !souAutor && !conduz) return false;
  return true;
}

// Se já orou hoje, ou se já usou o "posso ajudar" (uma vez só) por esta pessoa.
export const jaOrouHoje = (pedido, usuario, hoje) => (pedido.gestos || [])
  .some((g) => g.usuario === usuario && g.gesto === 'orei' && g.data === hoje);
export const jaAjudou = (pedido, usuario) => (pedido.gestos || [])
  .some((g) => g.usuario === usuario && g.gesto === 'ajudo');

// O que o autor vê de quem reagiu: um gesto por pessoa, a data mais recente (para "orei",
// que pode repetir dia após dia).
export function gestosParaAutor(pedido) {
  const ultimos = new Map();
  for (const g of pedido.gestos || []) {
    const chave = g.usuario + '|' + g.gesto;
    const atual = ultimos.get(chave);
    if (!atual || atual.data < g.data) ultimos.set(chave, g);
  }
  return [...ultimos.values()];
}

// Se um pedido já pode ser apagado do banco de vez: 30 dias depois do próprio vencimento
// (a data guardada, mesmo que "Deus respondeu" a tenha encurtado).
export const vencidoParaApagar = (pedido, hoje, dias = DIAS_ATE_APAGAR) => String(hoje) > somaDias(pedido.venceEm, dias);
