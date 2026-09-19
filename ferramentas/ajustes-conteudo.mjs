// Ajustes do material para o público do aplicativo: trechos escritos para um adulto
// casado e já batizado viram exemplos que servem a qualquer jovem.
//
// O importador do vault aplica estes ajustes toda vez, para que uma nova importação não
// traga os textos antigos de volta. Rodado sozinho, aplica direto em conteudo.json.
// Uso: node ferramentas/ajustes-conteudo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aplicarPrimeirosPassos } from './primeiros-passos.mjs';
import { aplicarPessoas } from './reescrita-pessoas.mjs';
import { aplicarExplorar } from './reescrita-explorar.mjs';
import { aplicarReflexoes } from './reflexoes.mjs';

export const AJUSTES = [
  [
    '05 - Hermenêutica/Da interpretação à aplicação',
    '&quot;Não interromper minha esposa quando ela contar como foi o dia&quot; é aplicação.',
    '&quot;Não interromper minha mãe quando ela contar como foi o dia&quot; é aplicação.',
  ],
  [
    '05 - Hermenêutica/Método Indutivo (OIA)',
    'esta semana, orar antes de checar o saldo, não depois',
    'esta semana, orar antes de abrir as redes, não depois',
  ],
];

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const plano = (s) => s.replace(/&quot;/g, '"');
// Comparação frouxa: sem marcação e com espaço solto. É só para saber se uma reescrita de
// várias linhas já foi aplicada; a quebra de linha e as tags em volta mudam e não importam.
const frouxo = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- o material fala com quem usa o app, não com quem montou o arquivo ----------
// Trechos que citavam o arquivo de notas, modelos e pastas viram frases para o leitor.
export const REESCRITAS = [
  ['05 - Hermenêutica/Como ler profecia',
    'Este vault registra que a divergência existe e não toma partido nela — o que é comum',
    'Aqui a divergência aparece sem tomar partido. O que é comum'],
  ['05 - Hermenêutica/Ferramentas de estudo', 'Registre no vault o que mudou.', 'Anote o que mudou.'],
  ['05 - Hermenêutica/Método Indutivo (OIA)',
    /<p>O template <a[^>]*>Leitura Diária \(OIA\)<\/a> já traz esse roteiro pronto\.<\/p>/,
    '<p>No app, a tela Escrever sobre hoje traz esse roteiro pronto na opção OIA completo.</p>'],
  ['05 - Hermenêutica/Os quatro contextos',
    /nas fichas de <a[^>]*>03 - Livros da Bíblia<\/a> deste vault\./,
    'nas fichas da seção Livros, aqui no Explorar.'],
  ['06 - Estudos Temáticos/Descanso e sábado', 'texto que o vault não suaviza, mas que mostra', 'texto duro que não deve ser suavizado, mas que mostra'],
  ['06 - Estudos Temáticos/Dinheiro e posses', 'texto difícil que o vault não suaviza;', 'texto difícil que não deve ser suavizado;'],
  ['12 - Eventos/Destruição do templo em 70 d.C.', 'Este vault registra a divergência sem tomar partido nela.', 'Aqui a divergência aparece sem tomar partido.'],
  ['12 - Eventos/Pragas do Egito', 'Este vault registra as duas propostas sem tomar partido entre elas.', 'As duas propostas aparecem aqui sem tomar partido entre elas.'],
  ['12 - Eventos/Queda de Jericó', 'e este vault não toma partido nessa discussão técnica.', 'e aqui não se toma partido nessa discussão técnica.'],
  ['12 - Eventos/Travessia do mar Vermelho', 'e que este vault não resolve.', 'e que não precisa ser resolvida aqui.'],
  ['15 - Fios Bíblicos/Promessa e cumprimento',
    /<h2>Como registrar no vault<\/h2>\s*<p>Nas notas de versículo, use estes rótulos de forma consistente, porque é o que faz o grafo do Obsidian ficar legível:<\/p>/,
    '<h2>Como perceber essas ligações</h2>\n<p>Quando dois textos se ligam, vale perceber que tipo de ligação é:</p>'],
];

// Pastas que o app não mostra: modelos, plano em texto, diário, reflexões, oração e igreja.
export const PASTAS_OCULTAS = ['98 - Templates', '02 - Plano de Leitura', '04 - Diário de Leitura', '07 - Reflexões', '09 - Oração', '10 - Igreja'];
export const notaOculta = (dados, id) => {
  const n = dados.notas[id];
  if (!n) return true;
  if (PASTAS_OCULTAS.includes(n.pasta) || /\/00 - Índice/.test(id) || dados.secoes.some((s) => s.indice === id)) return true;
  return n.pasta === '00 - Início' && id !== '00 - Início/A história bíblica em uma página';
};

// Linhas de rodapé que só serviam para navegar no arquivo, e links para páginas ocultas.
// Os links para páginas ocultas são marcados primeiro com dois caracteres de uso privado
// (\uE000 e \uE001), que não existem no material, para as regras seguintes saberem o que é
// link removido e o que é texto.
function limparLinks(dados, html) {
  let h = html.replace(/<br>\s*(Templates|Pastas|Índice):[\s\S]*?(?=<br>|<\/p>)/g, '');
  h = h.replace(/<a class="link-nota"[^>]*data-nota="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (tudo, id, texto) => (
    notaOculta(dados, id) ? '\uE000' + texto.replace(/^\d+\s*-\s*/, '') + '\uE001' : tudo));
  // um "Prática:" que só tinha modelos some inteiro
  h = h.replace(/(<br>)?\s*Prática:\s*(\uE000[^\uE001]*\uE001(\s*·\s*)?)+(?=<br>|<\/p>)/g, '');
  // numa lista de ligações, o modelo sai junto com o separador
  h = h.replace(/\uE000[^\uE001]*\uE001\s*·\s*/g, '').replace(/\s*·\s*\uE000[^\uE001]*\uE001/g, '');
  // dentro de uma frase, o nome fica como texto simples
  h = h.replace(/\uE000([^\uE001]*)\uE001/g, '$1');
  return h.replace(/<p>\s*(<br>\s*)*<\/p>/g, '');
}

// Sem travessão: a pausa vira vírgula, a explicação depois de um rótulo vira dois-pontos e
// o intervalo entre números ou livros vira hífen ou "a".
export function semTravessao(texto, emHtml) {
  const trocarTexto = (t, logoAposTag) => {
    let s = t;
    s = s.replace(/(\d)\s*–\s*(\d)/g, '$1-$2');
    s = s.replace(/([A-Za-zÀ-ÿ0-9])–([A-Za-zÀ-ÿ0-9])/g, '$1 a $2');
    s = s.replace(/\s[—–]\s([^—–.;:!?]{1,180}?)\s[—–]\s/g, ', $1, ');
    if (logoAposTag) s = s.replace(/^\s*[—–]\s*/, ': ');
    s = s.replace(/\s*[—–]\s*/g, ', ');
    return s.replace(/,\s*,/g, ',').replace(/,\s*\./g, '.').replace(/:\s*,/g, ':');
  };
  if (!emHtml) return trocarTexto(String(texto || ''), false);
  return String(texto || '').split(/(<[^>]+>)/).map((parte, i, partes) => {
    if (parte.startsWith('<')) return parte;
    const anterior = partes[i - 1] || '';
    return trocarTexto(parte, /^<\/(strong|b|em)>$/.test(anterior));
  }).join('');
}

export function limparMaterial(dados) {
  let reescritas = 0;
  const faltando = [];
  for (const [id, de, para] of REESCRITAS) {
    const n = dados.notas[id];
    if (!n) { faltando.push(id); continue; }
    const antes = n.html;
    n.html = typeof de === 'string' ? n.html.split(de).join(para) : n.html.replace(de, para);
    if (n.html !== antes) reescritas++;
    // Espaços comparados de forma solta: com reescrita de várias linhas, a quebra de linha
    // diferente fazia a nota já reescrita aparecer como faltando em toda rodada.
    // Resolvido também quando a reescrita do Explorar passou por cima e já tirou a menção de
    // bastidor por conta própria: o que esta lista quer é que a nota não fale do arquivo de
    // notas, não que esta frase exata esteja lá.
    else if (!frouxo(n.html).includes(frouxo(para).slice(0, 40))
      && /\bvault\b|obsidian|\btemplates?\b|frontmatter/i.test(n.html)) faltando.push(id);
  }
  for (const [id, n] of Object.entries(dados.notas)) {
    if (notaOculta(dados, id)) continue;
    n.html = semTravessao(limparLinks(dados, n.html), true);
    for (const campo of ['nome', 'sub', 'resumo', 'destaque']) if (n[campo]) n[campo] = semTravessao(n[campo], false);
    if (Array.isArray(n.chips)) n.chips = n.chips.map((c) => (Array.isArray(c) ? c.map((x) => semTravessao(x, false)) : semTravessao(c, false)));
    if (n.t) n.t = n.t.replace(/[—–]/g, ' ');
  }
  for (const u of dados.unidades || []) {
    u.titulo = semTravessao(u.titulo, false);
    if (u.antigo) u.antigo = semTravessao(u.antigo, false);
    if (u.novo) u.novo = semTravessao(u.novo, false);
  }
  for (const s of dados.secoes || []) s.descricao = semTravessao(s.descricao, false);
  return { reescritas, faltando };
}

export function aplicarAjustes(dados) {
  const pendentes = [];
  let aplicados = 0;
  for (const [id, de, para] of AJUSTES) {
    const nota = dados.notas[id];
    if (!nota) { pendentes.push(id); continue; }
    // "de" pode ser texto ou expressão regular: com regular, includes() devolvia sempre falso
    // e o ajuste passava batido sem ninguém notar.
    const achou = de instanceof RegExp ? de.test(nota.html) : nota.html.includes(de);
    if (achou) {
      nota.html = de instanceof RegExp ? nota.html.replace(de, para) : nota.html.split(de).join(para);
      if (typeof de === 'string') {
        if (nota.resumo) nota.resumo = nota.resumo.split(plano(de)).join(plano(para));
        if (nota.t) nota.t = nota.t.split(semAcento(plano(de))).join(semAcento(plano(para)));
      }
      aplicados++;
      // Só é pendência quando o texto antigo continua lá e a troca não pegou. Se ele sumiu,
      // o ajuste está feito: ou por esta lista numa rodada anterior, ou pela reescrita do
      // Explorar, que passa por cima da nota inteira com outras palavras. Quem cobra a
      // substância (nenhum exemplo escrito para adulto casado) é o teste.mjs.
      // A comparação frouxa existe porque um ajuste de várias linhas muda de quebra de linha.
    } else if (nota.html.includes(typeof de === 'string' ? de : ' ')
      && !frouxo(nota.html).includes(frouxo(para))) {
      pendentes.push(id);
    }
  }
  const passos = aplicarPrimeirosPassos(dados);
  // A reescrita de Pessoas para jovens existia, mas não era aplicada: o app seguia com o texto
  // acadêmico do vault. Entra aqui, antes da limpeza, como os Primeiros passos.
  const pessoas = aplicarPessoas(dados);
  const limpeza = limparMaterial(dados);
  // O resto do Explorar reescrito: vem depois da limpeza, porque foi escrito sobre o texto já limpo.
  const explorar = aplicarExplorar(dados);
  // As reflexões do dia: escritas sobre a passagem, no lugar das perguntas por gênero.
  const reflexoes = aplicarReflexoes(dados);
  return { aplicados, pendentes: pendentes.concat(passos.faltando, pessoas.faltando, limpeza.faltando, explorar.faltando), reescritas: limpeza.reescritas, licoes: passos.trocadas, pessoas: pessoas.trocadas, pessoasSemReescrita: pessoas.semReescrita, explorar: explorar.trocadas, explorarDesatualizadas: explorar.desatualizadas, reflexoes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arquivo = join(dirname(fileURLToPath(import.meta.url)), '..', 'conteudo', 'conteudo.json');
  const dados = JSON.parse(readFileSync(arquivo, 'utf8'));
  const { aplicados, pendentes, pessoas, pessoasSemReescrita, explorar, explorarDesatualizadas, reflexoes } = aplicarAjustes(dados);
  console.log('pessoas reescritas:', pessoas, pessoasSemReescrita.length ? '· sem reescrita: ' + pessoasSemReescrita.join(', ') : '');
  console.log('explorar reescrito:', explorar, explorarDesatualizadas.length ? '· desatualizadas (reescrever de novo): ' + explorarDesatualizadas.join(', ') : '');
  console.log('reflexões do dia:', reflexoes.dias + ' de ' + dados.plano.length + ' dias · ' + reflexoes.total + ' escritas',
    reflexoes.problemas.length ? '· problemas: ' + reflexoes.problemas.join(', ') : '');
  writeFileSync(arquivo, JSON.stringify(dados), 'utf8');
  console.log('ajustes aplicados:', aplicados, pendentes.length ? '· não encontrados: ' + pendentes.join(', ') : '');
}
