// O texto das notas de versículo do Explorar vem das Bíblias do app, não do material de
// origem. O material citava a NVI 2023, que não tem licença para o aplicativo e não é a
// tradução que o leitor escolheu. Cada nota passa a levar o texto de todas as traduções do
// app ("versos", por sigla); o blockquote e o campo "texto" ficam com a primeira (a NBV),
// e o app troca pela tradução escolhida na hora de mostrar (CC.textoDaNota).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, semAcento, textoPlano } from './texto-app.mjs';

const PASTA_BIBLIAS = join(dirname(fileURLToPath(import.meta.url)), '..', 'conteudo', 'biblias');
const ORDEM = ['nbv', 'blivre'];
export const PASTA_VERSICULOS = '08 - Versículos';
export const PASTA_LIVROS = '03 - Livros da Bíblia';
export const REF = /^(.+?) (\d+)\.(\d+)(?:-(\d+))?$/;

let cache = null;
function biblias() {
  if (cache) return cache;
  cache = (existsSync(PASTA_BIBLIAS) ? readdirSync(PASTA_BIBLIAS) : [])
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(PASTA_BIBLIAS, f), 'utf8')))
    .sort((a, b) => ORDEM.indexOf(a.sigla) - ORDEM.indexOf(b.sigla));
  return cache;
}

// Mesmo recorte do CC.textoDoVersiculo, sem o limite de três versículos: a nota mostra a
// passagem inteira que dá nome a ela. O cabeçalho acróstico da Bíblia Livre ("[Nun] :") sai.
export function textoDaReferencia(biblia, ref) {
  const m = REF.exec(String(ref || ''));
  if (!m) return '';
  const cap = ((biblia.livros[m[1]] || [])[Number(m[2]) - 1]) || [];
  const de = Number(m[3]);
  const ate = Number(m[4] || m[3]);
  const versos = cap.slice(de - 1, ate);
  if (versos.length !== ate - de + 1 || versos.some((v) => !v)) return '';
  return versos.map((v) => String(v).replace(/^\[[^\]]*\]\s*:?\s*/, '').trim()).join(' ');
}

// Tira o texto do primeiro blockquote, para comparar duas versões de uma nota sem que a
// troca de tradução conte como diferença.
export const semCitacao = (html) => String(html).replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/, '<blockquote></blockquote>');

// "(2 Coríntios 12:9)", "(Ageu 1:7-8)", "(Judas 24)": a referência que fecha o versículo-chave
// das notas de livro, escrita com dois-pontos. Livro de um capítulo só vem sem capítulo.
function refDoVersiculoChave(biblia, citacao) {
  // "12:9" no material de origem; "12.9" depois de aplicado uma vez (a <cite> que fica)
  const m = /\(([^()]+?) (\d+)(?:[:.](\d+)(?:-(\d+))?)?\)\s*$/.exec(citacao.replace(/<[^>]+>/g, ''));
  if (!m || !biblia.livros[m[1]]) return '';
  if (!m[3]) return biblia.livros[m[1]].length === 1 ? m[1] + ' 1.' + m[2] : '';
  return m[1] + ' ' + m[2] + '.' + m[3] + (m[4] ? '-' + m[4] : '');
}

export function aplicarTextoDosVersiculos(dados) {
  const lista = biblias();
  let trocadas = 0;
  const semTexto = [];
  if (!lista.length) return { trocadas, semTexto };
  // O versículo-chave das notas de livro também vinha da NVI.
  for (const [id, n] of Object.entries(dados.notas)) {
    if (n.pasta !== PASTA_LIVROS) continue;
    const m = /(<h2>Versículo-chave<\/h2>\s*)<blockquote[^>]*>([\s\S]*?)<\/blockquote>/.exec(n.html);
    if (!m) continue;
    const citacao = m[2].includes('<cite>') ? '(' + m[2].split('<cite>')[1].replace(/<\/cite>/, '') + ')' : m[2];
    const ref = refDoVersiculoChave(lista[0], citacao);
    const versos = {};
    for (const b of lista) {
      const t = ref && textoDaReferencia(b, ref);
      if (t) versos[b.sigla] = t;
    }
    const principal = versos[lista[0].sigla];
    if (!principal) { semTexto.push(id); continue; }
    const visivel = ref.replace(/ 1\.(\d+)$/, (s, v) => (lista[0].livros[ref.split(' 1.')[0]].length === 1 ? ' ' + v : s));
    n.versos = versos;
    n.html = n.html.replace(m[0], m[1] + '<blockquote data-verso="' + esc(ref) + '">' + esc(principal)
      + '<cite>' + esc(visivel) + '</cite></blockquote>');
    n.t = semAcento(n.nome + ' ' + textoPlano(n.html));
    trocadas++;
  }
  for (const [id, n] of Object.entries(dados.notas)) {
    if (n.pasta !== PASTA_VERSICULOS || !REF.test(n.nome)) continue;
    const versos = {};
    for (const b of lista) {
      const t = textoDaReferencia(b, n.nome);
      if (t) versos[b.sigla] = t;
    }
    const principal = versos[lista[0].sigla];
    if (!principal) { semTexto.push(id); continue; }
    n.versos = versos;
    n.texto = principal;
    n.html = n.html.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/,
      '<blockquote data-verso="' + esc(n.nome) + '">' + esc(principal) + '</blockquote>');
    n.t = semAcento(n.nome + ' ' + textoPlano(n.html));
    trocadas++;
  }
  return { trocadas, semTexto };
}
