// Confere o "Onde estamos na história" de cada dia do plano (conteudo/primeiros-dias.json):
// os cinco campos de cada dia (título, subtítulo, contexto, "procure" e o gancho de amanhã),
// as citações contra a NBV, as referências, a voz (o mesmo filtro dos mapas) e os guias de
// leitura. O que dá para barrar por regra reprova; o resto vai para "conferir", uma linha por
// achado, para alguém olhar com a leitura do dia aberta.
// Uso: node ferramentas/checar-contexto.mjs [unidade]   (sem unidade: o plano inteiro)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vozDoTexto } from './checar-mapa.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const C = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'conteudo.json'), 'utf8'));
const P = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'primeiros-dias.json'), 'utf8'));
const nbv = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'nbv.json'), 'utf8')).livros;

const CAMPOS = ['titulo', 'sub', 'contexto', 'procure', 'amanha'];
// Tamanho de cada campo em caracteres: o cartão é lido no celular antes do texto bíblico, e o
// maior contexto da Unidade 1 tem uns 560. Passou disso, sobra palavra.
const TETO = { titulo: 60, sub: 130, contexto: 600, procure: 260, amanha: 260 };

const normalizar = (t) => String(t).normalize('NFC').toLowerCase()
  .replace(/[“”"'‘’«».,;:!?()[\]…—–-]/g, ' ').replace(/\s+/g, ' ').trim();
const leituraDe = (n) => {
  const d = C.plano[n - 1];
  return d ? normalizar(d.trechos.map((t) => (nbv[t.livro] || []).slice(t.de - 1, t.ate).map((c) => c.join(' ')).join(' ')).join(' ')) : '';
};
const leituraCrua = (n) => {
  const d = C.plano[n - 1];
  return d ? d.trechos.map((t) => (nbv[t.livro] || []).slice(t.de - 1, t.ate).map((c) => c.join(' ')).join(' ')).join(' ') : '';
};

// "Êxodo 22.21", "Êxodo 12.26-27", "Mateus 18.22", "(v. 17)". A referência com livro tem de
// estar dentro da leitura do dia (ou do dia seguinte, no gancho de amanhã).
const LIVROS = Object.keys(nbv).sort((a, b) => b.length - a.length);
const REF = new RegExp('(' + LIVROS.join('|') + ') (\\d+)\\.(\\d+)(?:-(\\d+))?((?:,? (?:e )?\\d+\\.\\d+)*)', 'gu');
function refsForaDaLeitura(texto, n) {
  const d = C.plano[n - 1];
  const fora = [];
  for (const m of String(texto).matchAll(REF)) {
    const [, livro, cap, v1, v2, resto] = m;
    const pares = [[Number(cap), Number(v1)], ...(v2 ? [[Number(cap), Number(v2)]] : []),
      ...[...String(resto || '').matchAll(/(\d+)\.(\d+)/g)].map((x) => [Number(x[1]), Number(x[2])])];
    for (const [c, v] of pares) {
      const dentro = d && d.trechos.some((t) => t.livro === livro && c >= t.de && c <= t.ate);
      const existe = (nbv[livro] || [])[c - 1] && (nbv[livro][c - 1].length >= v);
      if (!existe) fora.push(livro + ' ' + c + '.' + v + ' não existe');
      else if (!dentro) fora.push(livro + ' ' + c + '.' + v + ' fora da leitura do dia ' + n);
    }
  }
  return fora;
}

// Número e nome próprio que a leitura não tem: não reprova (a autoria pela tradição, "Moisés"
// num dia de Levítico, é fato das fichas), mas vai para "conferir".
const NUMERO = /(?<!\p{L})(\d+|três|quatro|cinco|seis|sete|oito|nove|dez|doze|catorze|quinze|vinte|trinta|quarenta|cinquenta|cem|mil)(?!\p{L})/gu;
const MINUSCULAS = new Set();
for (const caps of Object.values(nbv)) for (const cap of caps) for (const v of cap) for (const p of String(v).match(/\p{Ll}[\p{L}]*/gu) || []) MINUSCULAS.add(p);
const LIVRES = new Set(['Deus', 'Senhor', 'Jesus', 'Cristo', 'Pai', 'Filho', 'Espírito', 'Santo', 'Bíblia', 'Escrituras',
  'Reino', 'Lei', 'Antigo', 'Novo', 'Testamento', 'Unidade', 'Paulo', 'Salmo', 'Israel', 'Egito', 'Enquanto', 'Hoje', 'Amanhã',
  ...LIVROS.flatMap((l) => l.split(' ')).filter((p) => /^\p{Lu}/u.test(p))]);

const LIVRO_NOME = new RegExp('(?<!\\p{L})(' + LIVROS.join('|') + ')(?!\\p{L})', 'gu');
const ANTES_DE_REF = new RegExp('(capítulos?|versículos?|Salmos?|Unidade|dia|\\d| a| e|Livro) $', 'u');

const so = process.argv[2] ? Number(process.argv[2]) : 0;
const unidades = C.unidades.filter((u) => !so || u.numero === so);
let falhas = 0;
const conferir = [];
const falhar = (onde, msg) => { console.log('  FALHA  ' + onde + ': ' + msg); falhas++; };

console.log('\n  Onde estamos na história' + (so ? ' · unidade ' + so : '') + '\n');
for (const u of unidades) {
  let com = 0;
  for (let n = u.de; n <= u.ate; n++) {
    const d = P.dias[String(n)];
    if (!d) continue;
    com++;
    const onde = 'dia ' + n;
    for (const k of CAMPOS) {
      const t = d[k];
      if (n === C.plano.length && k === 'amanha') continue;  // o último dia não tem amanhã
      if (!t || !String(t).trim()) { falhar(onde, 'falta ' + k); continue; }
      if (String(t).length > TETO[k]) falhar(onde, k + ' com ' + String(t).length + ' caracteres (teto ' + TETO[k] + ')');
      if (/[—–]/.test(t)) falhar(onde, k + ' com travessão');
      if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)) falhar(onde, k + ' com emoji');
      if (/\bjornada\b|\bmergulh(ar|e)\b|\bdesvend(ar|a)\b/i.test(t)) falhar(onde, k + ' com tique de texto de IA');
      for (const v of vozDoTexto(t)) falhar(onde, k + ': ' + v);
      const alvo = k === 'amanha' ? n + 1 : n;
      const L = leituraDe(alvo);
      for (const m of String(t).matchAll(/“([^”]+)”/g)) if (!L.includes(normalizar(m[1]))) falhar(onde, k + ': citação fora da NBV do dia ' + alvo + ': ' + m[1]);
      for (const f of refsForaDaLeitura(t, alvo)) falhar(onde, k + ': ' + f);
      const crua = leituraCrua(alvo);
      const semAspas = String(t).replace(/“[^”]*”/g, '');
      const semLivros = semAspas.replace(LIVRO_NOME, 'Livro');
      // Número por extenso, ou algarismo seguido de coisa contada ("175 anos", "setenta pessoas").
      // Capítulo, versículo e minutos não entram: são a referência e a régua do app.
      for (const m of semLivros.matchAll(NUMERO)) {
        const depois = semLivros.slice(m.index + m[0].length, m.index + m[0].length + 12);
        if (/^\d+$/.test(m[1]) && !/^ (?!minutos?\b|a\b|e\b|ao\b|até\b)\p{L}/u.test(depois)) continue;
        if (/^\d+$/.test(m[1]) && ANTES_DE_REF.test(semLivros.slice(Math.max(0, m.index - 40), m.index))) continue;
        if (!new RegExp('(?<!\\p{L})' + m[1] + '(?!\\p{L})', 'iu').test(crua)) conferir.push(onde + ' ' + k + ': número "' + m[1] + depois.split(/[ ,.]/).slice(0, 2).join(' ') + '"');
      }
      for (const m of semAspas.matchAll(/(?<!\p{L})\p{Lu}[\p{L}]+/gu)) {
        const w = m[0];
        if (LIVRES.has(w)) continue;
        const antes = semAspas.slice(0, m.index).trimEnd();
        if ((!antes || /[.!?:]$/.test(antes)) && MINUSCULAS.has(w.toLowerCase())) continue;
        if (!new RegExp('(?<!\\p{L})' + w + '(?!\\p{L})', 'u').test(crua)) conferir.push(onde + ' ' + k + ': nome "' + w + '" não está na leitura');
      }
    }
    if (d.procure && !/^\p{Ll}/u.test(d.procure)) falhar(onde, 'o "procure" continua a frase "Enquanto lê, procure:" e começa com minúscula');
  }
  console.log('  Unidade ' + u.numero + ' (dias ' + u.de + ' a ' + u.ate + '): ' + com + ' de ' + (u.ate - u.de + 1) + ' dias com contexto');
}

// Guias de leitura: capítulo, versículos e salto que existem; voz; citação no próprio capítulo.
{
  for (const [chave, g] of Object.entries(P.guias)) {
    const m = /^(.+) (\d+)$/.exec(chave);
    const cap = m && (nbv[m[1]] || [])[Number(m[2]) - 1];
    if (!cap) { falhar('guia ' + chave, 'capítulo não existe'); continue; }
    if (!(g.de >= 1 && g.ate >= g.de && g.ate <= cap.length && g.texto)) falhar('guia ' + chave, 'versículos fora do capítulo');
    if (g.salto) {
      const s = /^(\d+):(\d+)$/.exec(String(g.salto));
      const cs = s && (nbv[m[1]] || [])[Number(s[1]) - 1];
      if (!(cs && Number(s[2]) >= 1 && Number(s[2]) <= cs.length)) falhar('guia ' + chave, 'salto ' + g.salto + ' não existe');
    }
    for (const v of vozDoTexto(g.texto)) falhar('guia ' + chave, v);
    const L = normalizar(cap.join(' ') + ' ' + ((nbv[m[1]] || [])[Number(m[2])] || []).join(' '));
    for (const q of String(g.texto).matchAll(/“([^”]+)”/g)) if (!L.includes(normalizar(q[1]))) falhar('guia ' + chave, 'citação fora da NBV: ' + q[1]);
    if (!C.plano.some((d) => d.trechos.some((t) => t.livro === m[1] && Number(m[2]) >= t.de && Number(m[2]) <= t.ate))) falhar('guia ' + chave, 'capítulo fora do plano');
  }
  console.log('  Guias de leitura: ' + Object.keys(P.guias).length);
}

if (conferir.length) {
  console.log('\n  Conferir com a leitura aberta (' + conferir.length + '):');
  for (const c of conferir) console.log('    ' + c);
}
console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'ok') + '\n');
process.exit(falhas ? 1 : 0);
