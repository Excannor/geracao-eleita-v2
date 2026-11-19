// O filtro dos textos que a célula lê (docs/r4-celula.md, seção 5): o pedido de oração ou de
// ajuda e as atualizações dele. Muitos membros têm de 12 a 17 anos, e o texto vai para a célula
// inteira: telefone, e-mail, link, @ de rede social e endereço não passam, nem palavra da lista de
// bloqueio. O texto é recusado com uma frase que diz o que tirar; nada é mascarado em silêncio.
//
// É simples de propósito e erra dos dois lados (deixa passar um número escrito por extenso,
// recusa uma frase com oito números seguidos). Não substitui quem conduz nem a denúncia.
// Regras puras, sem servidor: testadas em teste.mjs.

// O motivo da recusa → a mensagem (minúscula e sem ponto, como as outras do servidor; a tela põe
// a maiúscula e o ponto com CC.frase).
export const MENSAGEM_DO_FILTRO = {
  telefone: 'tire o número de telefone antes de enviar',
  email: 'tire o e-mail antes de enviar',
  link: 'tire o link antes de enviar',
  arroba: 'tire o @ antes de enviar',
  endereco: 'tire o endereço antes de enviar',
  palavra: 'troque essa palavra antes de enviar',
};

// A lista de bloqueio: palavrões, ofensas e termos sexuais comuns, sem acento e em minúsculas.
// Comparada por palavra inteira, depois de normalizar (semAcento, trocar números e símbolos por
// letras). Revista pelo dono; nunca aparece na tela. Fora dela, de propósito, palavras que também
// têm sentido comum ("veado", "pinto", "rola", "gostoso", "piranha", "sexo").
const BLOQUEADAS = [
  'porra', 'caralho', 'krl', 'crl', 'merda', 'bosta', 'puta', 'puto', 'putaria', 'putinha', 'pqp',
  'foda', 'fodase', 'foder', 'fodido', 'fodida', 'fdp', 'vsf', 'vtnc', 'tnc', 'cu', 'cuzao', 'cuzinho',
  'arrombado', 'arrombada', 'buceta', 'boceta', 'xoxota', 'piroca', 'punheta', 'siririca', 'nudes',
  'viado', 'viadinho', 'sapatao', 'retardado', 'retardada', 'imbecil', 'babaca', 'otario', 'otaria',
  'vagabundo', 'vagabunda', 'desgracado', 'desgracada', 'corno', 'escroto', 'escrota',
];

const semAcento = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '');
// as trocas mais comuns de letra por número ou símbolo
const TROCAS = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };
// "poooorra" vira "pora"; a lista é comparada do mesmo jeito
const juntarRepetidas = (p) => p.replace(/(.)\1+/g, '$1');
const BLOQUEADAS_JUNTAS = new Set(BLOQUEADAS.map(juntarRepetidas));

function palavras(texto) {
  const limpo = semAcento(texto).toLowerCase().replace(/[013457@$]/g, (c) => TROCAS[c]);
  return limpo.split(/[^a-z]+/).filter(Boolean);
}

// Telefone: 8 dígitos ou mais num trecho só de dígitos, espaço, ponto, hífen, parênteses e "+".
// A barra separa ("20/11/2026" passa). Referências bíblicas ("Salmos 119.105") têm menos de 8.
function temTelefone(texto) {
  for (const trecho of String(texto).match(/[\d+(][\d\s.\-()+]*\d/g) || []) {
    if ((trecho.match(/\d/g) || []).length >= 8) return true;
  }
  return false;
}
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const LINK = /(https?:\/\/|www\.|\bwa\.me\b|\bt\.me\b|\b[a-z0-9-]+\.(com|br|net|org|me|io|app|ly|gg|tv|link)\b)/i;
const ARROBA = /(^|[^\w])@[a-z0-9_]/i;
// "Rua das Flores, 120", "av. Brasil 45", "apto 302", "nº 15"
const ENDERECO = [
  /\b(rua|avenida|travessa|alameda|pra[cç]a)\s+[^\d\n]{2,40}?\d{1,5}\b/i,
  /(^|[\s,(])(r|av|tv)\.\s*[^\d\n]{2,40}?\d{1,5}\b/i,
  /(\bn[º°o]\.?|\bapto\.?|\bapartamento|\bbloco)\s*\d{1,5}\b/i,
];

// '' quando o texto passa; senão o motivo ('telefone', 'email', 'link', 'arroba', 'endereco',
// 'palavra'). O e-mail vem antes do link e do @, que ele também teria.
export function conferirTexto(texto) {
  const t = String(texto || '');
  if (EMAIL.test(t)) return 'email';
  if (LINK.test(t)) return 'link';
  if (ARROBA.test(t)) return 'arroba';
  // o CEP com hífen é endereço, antes de cair nos 8 dígitos do telefone
  if (/\b\d{5}-\d{3}\b/.test(t)) return 'endereco';
  if (temTelefone(t)) return 'telefone';
  if (ENDERECO.some((r) => r.test(t))) return 'endereco';
  if (palavras(t).some((p) => BLOQUEADAS_JUNTAS.has(juntarRepetidas(p)))) return 'palavra';
  return '';
}
