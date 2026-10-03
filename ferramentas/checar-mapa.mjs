// Confere um mapa do livro (conteudo/mapas/<slug>.json) antes de ele ir ao ar:
//   1. os campos do formato (nome, grupo, número, capítulos, significado, autoria, raiz, ramos
//      com galhos, cristo com pares, estrutura, curiosidades, procure) e os desenhos que ele cita;
//   2. toda referência ("Is 6.1-4", "Is 13–23", "Is 65.17, 25", "At 8.32-35") no formato certo e
//      existindo na NBV, a tradução padrão do app: livro, capítulo e versículo dentro do tamanho real;
//   3. toda citação entre aspas batendo, palavra por palavra, com a NBV da referência do item;
//   4. as palavras proibidas da skill (vícios de IA) e o travessão;
//   5. itens consecutivos de uma lista começando com a mesma palavra (só aviso);
//   6. a conexão entre dois ramos com até 150 caracteres.
// O mesmo módulo roda dentro do teste.mjs para todos os mapas da pasta.
// Uso: node ferramentas/checar-mapa.mjs <slug|--todos>
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = join(AQUI, 'conteudo', 'mapas');

// Os 66, na ordem do cânon, com o grupo da grade e a sigla das referências: a mesma tabela de
// src/app/06b-mapas.js (o teste.mjs confere que as duas batem).
export const GRUPOS = ['Lei', 'Históricos', 'Poéticos', 'Profetas maiores', 'Profetas menores',
  'Evangelhos e Atos', 'Cartas de Paulo', 'Outras cartas', 'Apocalipse'];
export const LIVROS = [
  ['Gênesis', 0, 'Gn'], ['Êxodo', 0, 'Êx'], ['Levítico', 0, 'Lv'], ['Números', 0, 'Nm'], ['Deuteronômio', 0, 'Dt'],
  ['Josué', 1, 'Js'], ['Juízes', 1, 'Jz'], ['Rute', 1, 'Rt'], ['1 Samuel', 1, '1Sm'], ['2 Samuel', 1, '2Sm'],
  ['1 Reis', 1, '1Rs'], ['2 Reis', 1, '2Rs'], ['1 Crônicas', 1, '1Cr'], ['2 Crônicas', 1, '2Cr'], ['Esdras', 1, 'Ed'],
  ['Neemias', 1, 'Ne'], ['Ester', 1, 'Et'],
  ['Jó', 2, 'Jó'], ['Salmos', 2, 'Sl'], ['Provérbios', 2, 'Pv'], ['Eclesiastes', 2, 'Ec'], ['Cânticos', 2, 'Ct'],
  ['Isaías', 3, 'Is'], ['Jeremias', 3, 'Jr'], ['Lamentações', 3, 'Lm'], ['Ezequiel', 3, 'Ez'], ['Daniel', 3, 'Dn'],
  ['Oseias', 4, 'Os'], ['Joel', 4, 'Jl'], ['Amós', 4, 'Am'], ['Obadias', 4, 'Ob'], ['Jonas', 4, 'Jn'], ['Miqueias', 4, 'Mq'],
  ['Naum', 4, 'Na'], ['Habacuque', 4, 'Hc'], ['Sofonias', 4, 'Sf'], ['Ageu', 4, 'Ag'], ['Zacarias', 4, 'Zc'], ['Malaquias', 4, 'Ml'],
  ['Mateus', 5, 'Mt'], ['Marcos', 5, 'Mc'], ['Lucas', 5, 'Lc'], ['João', 5, 'Jo'], ['Atos', 5, 'At'],
  ['Romanos', 6, 'Rm'], ['1 Coríntios', 6, '1Co'], ['2 Coríntios', 6, '2Co'], ['Gálatas', 6, 'Gl'], ['Efésios', 6, 'Ef'],
  ['Filipenses', 6, 'Fp'], ['Colossenses', 6, 'Cl'], ['1 Tessalonicenses', 6, '1Ts'], ['2 Tessalonicenses', 6, '2Ts'],
  ['1 Timóteo', 6, '1Tm'], ['2 Timóteo', 6, '2Tm'], ['Tito', 6, 'Tt'], ['Filemom', 6, 'Fm'],
  ['Hebreus', 7, 'Hb'], ['Tiago', 7, 'Tg'], ['1 Pedro', 7, '1Pe'], ['2 Pedro', 7, '2Pe'], ['1 João', 7, '1Jo'],
  ['2 João', 7, '2Jo'], ['3 João', 7, '3Jo'], ['Judas', 7, 'Jd'],
  ['Apocalipse', 8, 'Ap'],
];
const NOME_DA_SIGLA = new Map(LIVROS.map(([nome, , sigla]) => [sigla, nome]));
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const slugDoLivro = (nome) => semAcento(nome).replace(/\s+/g, '-');

// As palavras que a skill proíbe (vícios de IA) e o travessão.
export const PROIBIDAS = [
  [/—/, 'travessão'], [/mergulh/i, '"mergulhar"'], [/crucial/i, '"crucial"'], [/fundamental/i, '"fundamental"'],
  [/\bdança\b/i, '"dança"'], [/em resumo/i, '"em resumo"'], [/vale ressaltar/i, '"vale ressaltar"'], [/\bteia\b/i, '"teia"'],
  [/jornada/i, '"jornada"'], [/multifacet/i, '"multifacetado"'], [/vamos explorar/i, '"vamos explorar"'],
  [/é importante notar/i, '"é importante notar"'], [/no fim das contas/i, '"no fim das contas"'],
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'emoji'],
];

// O tamanho máximo da conexão entre dois ramos, em caracteres.
export const CONEXAO_MAX = 150;

let nbvCache = null;
const nbv = () => (nbvCache ||= JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'nbv.json'), 'utf8')).livros);

// "Is 6.1-4" → [{ livro, cap, de, ate }]; "Is 13–23" → capítulos de 13 a 23; "Is 65.17, 25" → dois trechos.
// Devolve null quando o formato não é um dos aceitos.
export function lerRef(ref) {
  const m = /^(\S+) (\d+)(?:[–-](\d+))?$/.exec(ref);
  if (m && !ref.includes('.')) {
    const livro = NOME_DA_SIGLA.get(m[1]);
    return livro ? [{ livro, cap: Number(m[2]), capAte: Number(m[3] || m[2]) }] : null;
  }
  const v = /^(\S+) (\d+)\.(\d+(?:-\d+)?(?:, ?\d+(?:-\d+)?)*)$/.exec(ref);
  if (!v) return null;
  const livro = NOME_DA_SIGLA.get(v[1]);
  if (!livro) return null;
  return v[3].split(/, ?/).map((parte) => {
    const [de, ate] = parte.split('-').map(Number);
    return { livro, cap: Number(v[2]), de, ate: ate || de };
  });
}

// O texto da NBV coberto por uma referência (para conferir as citações), ou null se ela não existe.
export function textoDaRef(ref) {
  const trechos = lerRef(ref);
  if (!trechos) return null;
  const B = nbv();
  const partes = [];
  for (const t of trechos) {
    const caps = B[t.livro];
    if (!caps) return null;
    if (t.capAte !== undefined) {
      if (t.capAte < t.cap || !caps[t.cap - 1] || !caps[t.capAte - 1]) return null;
      for (let c = t.cap; c <= t.capAte; c++) partes.push(caps[c - 1].join(' '));
      continue;
    }
    const cap = caps[t.cap - 1];
    if (!cap || t.ate < t.de || !cap[t.de - 1] || !cap[t.ate - 1]) return null;
    partes.push(cap.slice(t.de - 1, t.ate).join(' '));
  }
  return partes.join(' ');
}

const normalizar = (s) => ' ' + String(s).normalize('NFC').toLowerCase()
  .replace(/[“”"'‘’«».,;:!?()[\]…—–-]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
// Cada citação entre aspas (quatro palavras ou mais) tem de estar, na mesma ordem, na NBV das
// referências do item. Reticências separam pedaços que podem vir de versículos diferentes.
function citacoesForaDaNbv(texto, refs) {
  const base = normalizar(refs.map((r) => textoDaRef(r) || '').join(' '));
  const ruins = [];
  for (const m of String(texto).matchAll(/[“"]([^“”"]{8,300})[”"]/g)) {
    const pedacos = m[1].split(/\.\.\.|…/).map(normalizar).filter((p) => p.trim().split(' ').length >= 3);
    if (!pedacos.length) continue;
    if (!pedacos.every((p) => base.includes(p))) ruins.push(m[1]);
  }
  return ruins;
}
// Referências escritas dentro do texto, entre parênteses: "(Is 6.13)".
const refsNoTexto = (texto) => [...String(texto).matchAll(/\(([^()]*?\d[^()]*)\)/g)].map((m) => m[1]).filter((r) => lerRef(r) !== null || /^[A-ZÊ1-3]/.test(r));

export function checarMapa(slug, mapa) {
  const erros = [];
  const avisos = [];
  const erro = (m) => erros.push(m);
  const aviso = (m) => avisos.push(m);
  const texto = (v) => typeof v === 'string' && v.trim().length > 0;
  const B = nbv();

  if (!mapa || typeof mapa !== 'object') return { erros: ['o arquivo não é um objeto JSON'], avisos };
  const livro = LIVROS.find(([nome]) => nome === mapa.nome);
  if (!livro) erro('nome "' + mapa.nome + '" não é um dos 66 livros (como a NBV escreve)');
  else {
    if (slugDoLivro(mapa.nome) !== slug) erro('o arquivo deveria se chamar ' + slugDoLivro(mapa.nome) + '.json');
    if (mapa.grupo !== GRUPOS[livro[1]]) erro('grupo deveria ser "' + GRUPOS[livro[1]] + '"');
    if (mapa.numero !== LIVROS.indexOf(livro) + 1) erro('numero deveria ser ' + (LIVROS.indexOf(livro) + 1));
    if (mapa.capitulos !== (B[mapa.nome] || []).length) erro('capitulos deveria ser ' + (B[mapa.nome] || []).length + ' (a NBV)');
  }

  // ---------- textos: proibidas, referências e citações ----------
  const campos = [];
  const campo = (onde, t, refs) => { if (texto(t)) campos.push([onde, t, refs || []]); };
  const ref = (onde, r) => {
    if (!texto(r)) { erro(onde + ': sem referência'); return []; }
    if (lerRef(r) === null) { erro(onde + ': referência fora do formato ("Is 6.1-4", "Is 13–23", "Is 65.17, 25"): ' + r); return []; }
    if (textoDaRef(r) === null) { erro(onde + ': referência não existe na NBV: ' + r); return []; }
    return [r];
  };
  const refsDe = (onde, lista) => (Array.isArray(lista) && lista.length ? lista.flatMap((r) => ref(onde, r)) : (erro(onde + ': precisa de refs'), []));

  const s = mapa.significado || {};
  if (!texto(s.traducao) || !texto(s.texto)) erro('significado precisa de traducao e texto');
  campo('significado', s.texto);
  // O nome original sai na fonte de src/fontes-originais (hebraico, grego e grego estendido):
  // letra fora desses blocos cairia na letra do sistema.
  if (s.original) {
    const fora = [...s.original].filter((c) => !/[\u0590-\u05FF\uFB1D-\uFB4F\u0370-\u03FF\u1F00-\u1FFF]/.test(c));
    if (fora.length) erro('significado.original tem letra que a fonte do original não cobre: ' + fora.join(' '));
    if (!['hebraico', 'grego', 'aramaico'].includes(s.lingua || 'hebraico')) erro('significado.lingua deve ser hebraico, grego ou aramaico');
  }
  const a = mapa.autoria || {};
  if (!texto(a.texto)) erro('autoria precisa de texto');
  const refsAutoria = refsDe('autoria', a.refs);
  campo('autoria', a.texto, refsAutoria); campo('autoria.apoio', a.apoio, refsAutoria);
  const r = mapa.raiz || {};
  if (!texto(r.texto)) erro('raiz precisa de texto');
  const refsRaiz = refsDe('raiz', r.refs);
  campo('raiz', r.texto, refsRaiz); campo('raiz.apoio', r.apoio, refsRaiz);

  const ramos = Array.isArray(mapa.ramos) ? mapa.ramos : [];
  if (ramos.length < 4 || ramos.length > 6) erro('o mapa precisa de 4 a 6 ramos (tem ' + ramos.length + ')');
  const desenhos = [];
  ramos.forEach((ramo, i) => {
    const onde = 'ramo ' + (i + 1);
    if (!texto(ramo.titulo) || !texto(ramo.sub)) erro(onde + ': precisa de titulo e sub');
    if (!texto(ramo.desenho)) erro(onde + ': precisa de desenho'); else desenhos.push([onde, ramo.desenho]);
    const galhos = Array.isArray(ramo.galhos) ? ramo.galhos : [];
    if (galhos.length < 3 || galhos.length > 6) erro(onde + ': precisa de 3 a 6 galhos (tem ' + galhos.length + ')');
    galhos.forEach((g, j) => campo(onde + ' galho ' + (j + 1), g.texto, ref(onde + ' galho ' + (j + 1), g.ref)));
    if (!galhos.every((g) => texto(g.texto))) erro(onde + ': todo galho precisa de texto');
    if (ramo.jesus) {
      if (!texto(ramo.jesus.texto) || !/jesus/i.test(ramo.jesus.texto)) erro(onde + ': o destaque "jesus" precisa dizer Jesus com todas as letras');
      const refsJesus = refsDe(onde + ' jesus', ramo.jesus.refs);
      if (refsJesus.some((x) => (lerRef(x) || [{}])[0].livro && LIVROS.findIndex(([n]) => n === lerRef(x)[0].livro) < 39)) erro(onde + ': a ligação com Jesus se prova com o Novo Testamento');
      campo(onde + ' jesus', ramo.jesus.texto, refsJesus);
    }
    if (i < ramos.length - 1 && !texto(ramo.conexao)) aviso(onde + ': sem conexão com o ramo seguinte');
    if (texto(ramo.conexao)) {
      // Até 150 caracteres (3 a 4 linhas a 390px): conexão mais longa empurra a curva para baixo,
      // a área cresce e o mapa fica comprido (regra do dono, 02/10).
      if (ramo.conexao.length > CONEXAO_MAX) erro(onde + ': a conexão tem ' + ramo.conexao.length + ' caracteres (até ' + CONEXAO_MAX + ')');
      const dentro = refsNoTexto(ramo.conexao);
      const refsConexao = dentro.flatMap((x) => ref(onde + ' conexão', x));
      if (/[“"]/.test(ramo.conexao) && !refsConexao.length) aviso(onde + ': a conexão cita entre aspas sem referência entre parênteses');
      campo(onde + ' conexão', ramo.conexao, refsConexao);
    }
    // itens consecutivos começando igual
    galhos.forEach((g, j) => {
      if (!j) return;
      const p1 = semAcento((galhos[j - 1].texto || '').split(/\s+/)[0]).replace(/\W/g, '');
      const p2 = semAcento((g.texto || '').split(/\s+/)[0]).replace(/\W/g, '');
      if (p1 && p1 === p2) aviso(onde + ': os galhos ' + j + ' e ' + (j + 1) + ' começam com "' + g.texto.split(/\s+/)[0] + '"');
    });
  });
  if (ramos.length && !ramos.some((x) => x.jesus) && !ramos.some((x) => /jesus/i.test(x.sub || ''))) aviso('nenhum ramo liga a passagem a Jesus');

  const c = mapa.cristo || {};
  if (!texto(c.texto)) erro('cristo precisa de texto');
  if (!texto(c.desenho)) erro('cristo precisa de desenho'); else desenhos.push(['cristo', c.desenho]);
  campo('cristo', c.texto, ref('cristo', c.ref));
  const pares = Array.isArray(c.pares) ? c.pares : [];
  if (!pares.length) erro('cristo precisa de pares (AT → NT)');
  pares.forEach((p, i) => {
    const onde = 'cristo par ' + (i + 1);
    const refsAt = ref(onde + ' at', p.at);
    const refsNt = ref(onde + ' nt', p.nt);
    if (refsNt.length && LIVROS.findIndex(([n]) => n === lerRef(p.nt)[0].livro) < 39) erro(onde + ': nt tem de ser do Novo Testamento');
    if (!texto(p.texto)) erro(onde + ': precisa de texto');
    else if (refsAt.length) {
      const ruins = citacoesForaDaNbv('“' + p.texto + '”', refsAt);
      if (ruins.length) erro(onde + ': o texto não bate com a NBV de ' + p.at + ': "' + p.texto + '"');
    }
    campo(onde + ' nota', p.nota);
  });
  if (a.desenho) desenhos.push(['autoria', a.desenho]);

  const partes = Array.isArray(mapa.estrutura) ? mapa.estrutura : [];
  if (partes.length < 2) erro('estrutura precisa de ao menos 2 partes');
  partes.forEach((p, i) => {
    if (!texto(p.titulo)) erro('estrutura ' + (i + 1) + ': precisa de titulo');
    if (!Number.isInteger(p.de) || !Number.isInteger(p.ate) || p.de > p.ate) erro('estrutura ' + (i + 1) + ': de/ate inválidos');
    if (i === 0 && p.de !== 1) erro('a estrutura começa no capítulo 1');
    if (i && partes[i - 1].ate + 1 !== p.de) erro('estrutura ' + (i + 1) + ': começa em ' + p.de + ', mas a anterior termina em ' + partes[i - 1].ate);
    if (i === partes.length - 1 && p.ate !== mapa.capitulos) erro('a estrutura termina no capítulo ' + p.ate + ', e o livro tem ' + mapa.capitulos);
    campo('estrutura ' + (i + 1), p.titulo);
  });

  const curiosidades = Array.isArray(mapa.curiosidades) ? mapa.curiosidades : [];
  if (!curiosidades.length) erro('curiosidades precisa de ao menos 1 item');
  curiosidades.forEach((x, i) => {
    if (!texto(x.texto)) erro('curiosidade ' + (i + 1) + ': precisa de texto');
    campo('curiosidade ' + (i + 1), x.texto, ref('curiosidade ' + (i + 1), x.ref));
    if (i) {
      const p1 = semAcento((curiosidades[i - 1].texto || '').split(/\s+/)[0]); const p2 = semAcento((x.texto || '').split(/\s+/)[0]);
      if (p1 && p1 === p2) aviso('curiosidades ' + i + ' e ' + (i + 1) + ' começam com "' + x.texto.split(/\s+/)[0] + '"');
    }
  });
  const pr = mapa.procure || {};
  if (!texto(pr.texto)) erro('procure precisa de texto');
  campo('procure', pr.texto, pr.ref ? ref('procure', pr.ref) : []);
  if (texto(pr.texto) && /[“"]/.test(pr.texto) && !pr.ref) aviso('procure cita entre aspas sem ref');
  for (let i = 1; i < ramos.length; i++) {
    const p1 = semAcento((ramos[i - 1].titulo || '').split(/\s+/)[0]); const p2 = semAcento((ramos[i].titulo || '').split(/\s+/)[0]);
    if (p1 && p1 === p2) aviso('os ramos ' + i + ' e ' + (i + 1) + ' começam com "' + ramos[i].titulo.split(/\s+/)[0] + '"');
  }

  for (const [onde, t, refs] of campos) {
    for (const [re, nome] of PROIBIDAS) if (re.test(t)) erro(onde + ': ' + nome + ' em "' + t.slice(0, 70) + '"');
    // o traço "–" só em intervalo de capítulos dentro de uma referência, nunca no texto corrido
    if (/–/.test(t.replace(/\(([^()]*)\)/g, ''))) erro(onde + ': travessão (–) no texto');
    if (onde === 'significado') continue;
    for (const q of citacoesForaDaNbv(t, refs)) {
      if (!refs.length) aviso(onde + ': citação sem referência para conferir: "' + q + '"');
      else erro(onde + ': citação não bate com a NBV de ' + refs.join(', ') + ': "' + q + '"');
    }
  }

  // ---------- desenhos ----------
  for (const [onde, id] of desenhos) {
    const arquivo = join(PASTA, 'desenhos', String(id) + '.svg');
    if (!/^[a-z0-9-]+$/.test(String(id)) || !existsSync(arquivo)) { erro(onde + ': desenho "' + id + '" não existe em conteudo/mapas/desenhos'); continue; }
    const svg = readFileSync(arquivo, 'utf8');
    if (!/viewBox="0 0 120 120"/.test(svg)) erro(onde + ': o desenho ' + id + ' precisa de viewBox="0 0 120 120"');
    const classes = [...svg.replace(/<style>[\s\S]*?<\/style>/, '').matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    const estranhas = classes.filter((k) => !['k', 'h', 'p', 's', 'e'].includes(k));
    if (estranhas.length) erro(onde + ': o desenho ' + id + ' usa classes fora do traço (.k .h .p .s .e): ' + [...new Set(estranhas)].join(', '));
    if (/(fill|stroke)="#|style="/.test(svg.replace(/<style>[\s\S]*?<\/style>/, ''))) erro(onde + ': o desenho ' + id + ' tem cor literal fora das classes de traço (não segue o tema escuro)');
    if (/<text|<image/.test(svg)) erro(onde + ': o desenho ' + id + ' tem texto ou imagem embutida');
  }
  return { erros, avisos };
}

export function listarMapas() {
  return readdirSync(PASTA).filter((f) => f.endsWith('.json') && f !== 'indice.json').map((f) => f.slice(0, -5)).sort();
}
export function lerIndice() {
  return JSON.parse(readFileSync(join(PASTA, 'indice.json'), 'utf8'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pedido = process.argv[2];
  if (!pedido) { console.log('Uso: node ferramentas/checar-mapa.mjs <slug|--todos>'); process.exit(2); }
  const slugs = pedido === '--todos' ? listarMapas() : [pedido];
  let falhas = 0;
  for (const slug of slugs) {
    const arquivo = join(PASTA, slug + '.json');
    console.log('\n  ' + slug);
    if (!existsSync(arquivo)) { console.log('    FALHA  não existe ' + arquivo); falhas++; continue; }
    let mapa;
    try { mapa = JSON.parse(readFileSync(arquivo, 'utf8')); } catch (e) { console.log('    FALHA  JSON inválido: ' + e.message); falhas++; continue; }
    const { erros, avisos } = checarMapa(slug, mapa);
    for (const m of erros) console.log('    FALHA  ' + m);
    for (const m of avisos) console.log('    aviso  ' + m);
    if (!erros.length) console.log('    ok     ' + (mapa.ramos || []).length + ' ramos · ' + (mapa.ramos || []).reduce((n, r) => n + (r.galhos || []).length, 0) + ' galhos · ' + (mapa.curiosidades || []).length + ' curiosidades' + (avisos.length ? ' · ' + avisos.length + ' aviso(s)' : ''));
    falhas += erros.length;
  }
  console.log('');
  process.exit(falhas ? 1 : 0);
}
