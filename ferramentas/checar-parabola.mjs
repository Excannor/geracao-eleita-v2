// Confere uma parábola (conteudo/parabolas/<slug>.json) antes de ela ir ao ar:
//   1. os campos do formato (titulo, ref, grupo, linha, desenho, desenhoLista, secoes com blocos,
//      dizendo, duas perguntas, parecidas) e o índice (conteudo/parabolas/indice.json);
//   2. toda referência ("Lc 14.15-24") no formato dos mapas e existindo na NBV;
//   3. toda fala e toda citação entre aspas batendo, palavra por palavra, com a NBV da referência
//      do bloco (e sempre dentro das referências da própria parábola);
//   4. a voz do app (a lista VOZ e as PROIBIDAS de checar-mapa.mjs, fora das citações) e nenhuma
//      palavra com hífen fora de citação;
//   5. os desenhos citados existindo em conteudo/mapas/desenhos, no traço do tema (.k .h .p .s .e).
// O build roda o mesmo checador nas publicadas e para se alguma tiver erro; o teste.mjs roda em todas.
// Uso: node ferramentas/checar-parabola.mjs <slug|--todas>
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerRef, textoDaRef, VOZ, PROIBIDAS, TEXTO_DO_DONO } from './checar-mapa.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = join(AQUI, 'conteudo', 'parabolas');
const DESENHOS = join(AQUI, 'conteudo', 'mapas', 'desenhos');
export const GRUPOS_PARABOLA = ['mateus', 'marcos', 'lucas', 'at'];
// Os ícones que a tela sabe desenhar no rótulo de cada seção (src/sob-demanda/parabola-tela.js).
export const ICONES_SECAO = ['alfinete', 'pao', 'pessoas', 'estrada', 'moeda', 'broto'];
export const LINHA_MAX = 60;

const normalizar = (s) => ' ' + String(s).normalize('NFC').toLowerCase()
  .replace(/[“”"'‘’«».,;:!?()[\]…—–-]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
// Os pedaços (três palavras ou mais) de uma citação que não estão na NBV das referências.
function foraDaNbv(citacao, refs) {
  const base = normalizar(refs.map((r) => textoDaRef(r) || '').join(' '));
  return String(citacao).split(/\.\.\.|…/).map(normalizar).filter((p) => p.trim().split(' ').length >= 3 && !base.includes(p));
}

export function checarParabola(slug, p) {
  const erros = [];
  const avisos = [];
  const erro = (m) => erros.push(m);
  const aviso = (m) => avisos.push(m);
  const texto = (v) => typeof v === 'string' && v.trim().length > 0;
  if (!p || typeof p !== 'object') return { erros: ['o arquivo não é um objeto JSON'], avisos };
  if (!/^[a-z0-9-]+$/.test(slug)) erro('o nome do arquivo só pode ter letras minúsculas sem acento, números e hífen');

  for (const c of ['titulo', 'ref', 'grupo', 'linha', 'desenho', 'desenhoLista']) if (!texto(p[c])) erro('falta ' + c);
  if (p.grupo && !GRUPOS_PARABOLA.includes(p.grupo)) erro('grupo deveria ser um de: ' + GRUPOS_PARABOLA.join(', '));
  if (texto(p.linha) && p.linha.length > LINHA_MAX) erro('a linha da lista tem ' + p.linha.length + ' caracteres (até ' + LINHA_MAX + ')');
  if (texto(p.linha) && /[.!?]$/.test(p.linha.trim())) aviso('a linha da lista não precisa de ponto no fim');

  const campos = []; // [onde, texto, refs para as citações]
  const falas = []; // [onde, fala, ref]
  const todasAsRefs = [];
  const ref = (onde, r) => {
    if (!texto(r)) { erro(onde + ': sem referência'); return []; }
    if (lerRef(r) === null || !/\./.test(r)) { erro(onde + ': referência fora do formato ("Lc 14.15-24"): ' + r); return []; }
    if (textoDaRef(r) === null) { erro(onde + ': referência não existe na NBV: ' + r); return []; }
    todasAsRefs.push(r);
    return [r];
  };
  const principal = ref('ref', p.ref);
  if (principal.length && p.grupo && p.grupo !== 'at') {
    const livro = lerRef(p.ref)[0].livro;
    const esperado = { mateus: 'Mateus', marcos: 'Marcos', lucas: 'Lucas' }[p.grupo];
    if (livro !== esperado) erro('a ref principal (' + p.ref + ') não é de ' + esperado + ', o grupo da parábola');
  }
  campos.push(['titulo', p.titulo, []], ['linha', p.linha, []]);

  const desenhos = [['desenho', p.desenho, true], ['desenhoLista', p.desenhoLista, false]];
  const secoes = Array.isArray(p.secoes) ? p.secoes : [];
  if (secoes.length < 2) erro('precisa de ao menos 2 seções ("Onde Jesus está" e "A história")');
  let blocosDeItens = 0;
  secoes.forEach((s, i) => {
    const onde = 'seção ' + (i + 1);
    if (!texto(s.titulo)) erro(onde + ': precisa de titulo');
    if (s.icone && !ICONES_SECAO.includes(s.icone)) erro(onde + ': ícone "' + s.icone + '" não existe (' + ICONES_SECAO.join(', ') + ')');
    campos.push([onde + ' título', s.titulo, []]);
    const blocos = Array.isArray(s.blocos) ? s.blocos : [];
    if (!blocos.length) erro(onde + ': sem blocos');
    blocos.forEach((b, j) => {
      const ob = onde + ' bloco ' + (j + 1);
      const tipos = ['texto', 'fala', 'itens'].filter((k) => b[k] !== undefined);
      if (tipos.length !== 1) { erro(ob + ': cada bloco é um texto, uma fala ou itens (tem ' + (tipos.join(', ') || 'nada') + ')'); return; }
      if (b.texto !== undefined) {
        if (!texto(b.texto)) erro(ob + ': texto vazio');
        const refs = b.ref ? ref(ob, b.ref) : [];
        campos.push([ob, b.texto, refs]);
      } else if (b.fala !== undefined) {
        if (!texto(b.fala)) erro(ob + ': fala vazia');
        if (/[“”"]/.test(b.fala)) erro(ob + ': a fala vai sem aspas (a tela põe)');
        const refs = ref(ob, b.ref);
        if (refs.length) falas.push([ob, b.fala, refs[0]]);
      } else {
        blocosDeItens++;
        const itens = Array.isArray(b.itens) ? b.itens : [];
        if (itens.length < 2 || itens.length > 4) erro(ob + ': de 2 a 4 itens (tem ' + itens.length + ')');
        itens.forEach((it, k) => {
          const oi = ob + ' item ' + (k + 1);
          if (!texto(it.titulo)) erro(oi + ': precisa de titulo');
          if (!texto(it.desenho)) erro(oi + ': precisa de desenho'); else desenhos.push([oi, it.desenho, false]);
          campos.push([oi + ' título', it.titulo, []]);
          if (it.fala !== undefined) {
            const refs = ref(oi, it.ref);
            if (!texto(it.fala)) erro(oi + ': fala vazia');
            else if (refs.length) falas.push([oi, it.fala, refs[0]]);
          }
        });
      }
    });
  });
  if (blocosDeItens > 1) erro('no máximo um bloco de itens por parábola');
  if (!falas.length) erro('a história precisa de ao menos uma fala destacada');

  const d = p.dizendo || {};
  if (!texto(d.texto)) erro('falta dizendo.texto ("O que Jesus está dizendo")');
  const refsDizendo = ref('dizendo', d.ref);
  campos.push(['dizendo', d.texto, refsDizendo]);
  if (d.apoio !== undefined) campos.push(['dizendo.apoio', d.apoio, refsDizendo]);

  const perguntas = Array.isArray(p.perguntas) ? p.perguntas : [];
  if (perguntas.length !== 2) erro('"Pra pensar" tem 2 perguntas (tem ' + perguntas.length + ')');
  perguntas.forEach((q, i) => {
    if (!texto(q) || !/\?$/.test(q.trim())) erro('pergunta ' + (i + 1) + ': precisa terminar em "?"');
    campos.push(['pergunta ' + (i + 1), q, []]);
  });

  const parecidas = p.parecidas === undefined ? [] : p.parecidas;
  if (!Array.isArray(parecidas)) erro('parecidas é uma lista');
  else parecidas.forEach((x, i) => {
    const onde = 'parecida ' + (i + 1);
    ref(onde, x.ref);
    if (!texto(x.titulo)) erro(onde + ': precisa de titulo');
    if (x.slug !== undefined && !/^[a-z0-9-]+$/.test(String(x.slug))) erro(onde + ': slug inválido');
    campos.push([onde + ' título', x.titulo, []]);
    // a linha sai como está, depois da referência ("Mt 22.1-14 · um rei faz a festa do filho"):
    // começa minúscula, a não ser nome próprio
    if (x.linha !== undefined) campos.push([onde + ' linha', x.linha, []]);
  });

  // Toda referência de bloco cai no mesmo livro da ref principal (a parábola e a cena em volta).
  const livroPrincipal = principal.length ? lerRef(p.ref)[0].livro : null;

  // ---------- falas ----------
  for (const [onde, fala, r] of falas) {
    for (const q of foraDaNbv(fala, [r])) erro(onde + ': a fala não bate com a NBV de ' + r + ': "' + q.trim() + '"');
    if (normalizar(fala).trim().split(' ').length < 3) aviso(onde + ': fala com menos de três palavras não é conferida');
    if (livroPrincipal && lerRef(r)[0].livro !== livroPrincipal) erro(onde + ': a fala é de outro livro (' + r + ')');
    if (/^[a-záéíóúâêôãõç]/.test(fala)) {
      // começa minúscula: tem de ser meio de frase na NBV (a letra como está no texto)
      const base = ' ' + String(textoDaRef(r) || '').normalize('NFC') + ' ';
      if (!base.includes(fala.normalize('NFC').split(/\.\.\.|…/)[0].replace(/[!?.,]+$/, '').slice(0, 24))) erro(onde + ': a fala começa minúscula, mas não está assim na NBV de ' + r);
    }
  }

  // ---------- textos ----------
  for (const [onde, t, refs] of campos) {
    if (!texto(t)) continue;
    for (const [re, nome] of PROIBIDAS) if (re.test(t)) erro(onde + ': ' + nome + ' em "' + t.slice(0, 70) + '"');
    const semAspas = t.replace(/“[^”]*”/g, '“”');
    if (!TEXTO_DO_DONO.includes(t.trim())) {
      for (const [re, nome] of VOZ) { const m = semAspas.match(re); if (m) erro(onde + ': ' + nome + ' em "' + semAspas.slice(Math.max(0, m.index - 20), m.index + 50).trim() + '"'); }
      if ((semAspas.match(/:/g) || []).length > 1) erro(onde + ': dois dois-pontos no mesmo campo (3.1)');
    }
    if (/–/.test(semAspas)) erro(onde + ': travessão (–) no texto');
    // o título é o nome da parábola ("O amigo à meia-noite") e pode levar hífen
    const hifen = onde === 'titulo' ? null : semAspas.match(/\p{L}+-\p{L}+/u);
    if (hifen) erro(onde + ': palavra com hífen fora de citação ("' + hifen[0] + '")');
    for (const m of String(t).matchAll(/“([^”]{8,300})”/g)) {
      const contra = refs.length ? refs : todasAsRefs;
      const ruins = foraDaNbv(m[1], contra);
      if (ruins.length) erro(onde + ': citação não bate com a NBV de ' + contra.join(', ') + ': "' + m[1] + '"');
    }
  }
  // as citações e falas não saem da parábola: cada ref de bloco é do livro da ref principal
  for (const r of todasAsRefs) {
    if (parecidas.some((x) => x.ref === r)) continue;
    if (livroPrincipal && lerRef(r)[0].livro !== livroPrincipal) erro('a referência ' + r + ' não é de ' + livroPrincipal + ', o livro da parábola');
  }

  // ---------- desenhos ----------
  for (const [onde, id, largo] of desenhos) {
    if (!texto(id)) continue;
    const arquivo = join(DESENHOS, String(id) + '.svg');
    if (!/^[a-z0-9-]+$/.test(String(id)) || !existsSync(arquivo)) { erro(onde + ': desenho "' + id + '" não existe em conteudo/mapas/desenhos'); continue; }
    const svg = readFileSync(arquivo, 'utf8');
    if (!/<!--[\s\S]+?-->/.test(svg)) erro(onde + ': o desenho ' + id + ' precisa do comentário que diz o que ele mostra');
    if (largo ? !/viewBox="0 0 \d+ \d+"/.test(svg) : !/viewBox="0 0 120 120"/.test(svg)) erro(onde + ': o desenho ' + id + (largo ? ' precisa de viewBox="0 0 L A"' : ' precisa de viewBox="0 0 120 120"'));
    const corpo = svg.replace(/<style>[\s\S]*?<\/style>/, '');
    const classes = [...corpo.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    const estranhas = classes.filter((k) => !['k', 'h', 'p', 's', 'e'].includes(k));
    if (estranhas.length) erro(onde + ': o desenho ' + id + ' usa classes fora do traço (.k .h .p .s .e): ' + [...new Set(estranhas)].join(', '));
    if (/(fill|stroke)="#|style="/.test(corpo)) erro(onde + ': o desenho ' + id + ' tem cor literal fora das classes de traço (não segue o tema escuro)');
    if (/<text|<image/.test(svg)) erro(onde + ': o desenho ' + id + ' tem texto ou imagem embutida');
  }
  return { erros, avisos };
}

export function listarParabolas() {
  return existsSync(PASTA) ? readdirSync(PASTA).filter((f) => f.endsWith('.json') && f !== 'indice.json').map((f) => f.slice(0, -5)).sort() : [];
}
export function lerIndiceParabolas() {
  return JSON.parse(readFileSync(join(PASTA, 'indice.json'), 'utf8'));
}
export const lerParabola = (slug) => JSON.parse(readFileSync(join(PASTA, slug + '.json'), 'utf8'));

// O índice: os quatro grupos, na ordem; cada slug num grupo só, com o arquivo existindo e o
// grupo do arquivo batendo; as publicadas são parábolas listadas.
export function checarIndice(indice) {
  const erros = [];
  const slugs = new Set(listarParabolas());
  const grupos = Array.isArray(indice && indice.grupos) ? indice.grupos : [];
  if (JSON.stringify(grupos.map((g) => g.id)) !== JSON.stringify(GRUPOS_PARABOLA)) erros.push('os grupos do índice são ' + GRUPOS_PARABOLA.join(', ') + ', nessa ordem');
  const vistos = new Set();
  for (const g of grupos) {
    if (!g.nome || !g.curto) erros.push('o grupo ' + g.id + ' precisa de nome e curto');
    for (const s of g.parabolas || []) {
      if (vistos.has(s)) erros.push(s + ' aparece em mais de um lugar do índice');
      vistos.add(s);
      if (!slugs.has(s)) { erros.push('o índice lista ' + s + ', mas falta conteudo/parabolas/' + s + '.json'); continue; }
      const grupo = lerParabola(s).grupo;
      if (grupo !== g.id) erros.push(s + ' está no grupo ' + g.id + ' do índice, mas o arquivo diz ' + grupo);
    }
  }
  for (const s of (indice && indice.publicadas) || []) if (!vistos.has(s)) erros.push('publicada ' + s + ' não está em nenhum grupo do índice');
  return erros;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pedido = process.argv[2];
  if (!pedido) { console.log('Uso: node ferramentas/checar-parabola.mjs <slug|--todas>'); process.exit(2); }
  const slugs = pedido === '--todas' ? listarParabolas() : [pedido];
  let falhas = 0;
  const doIndice = checarIndice(lerIndiceParabolas());
  for (const m of doIndice) console.log('    FALHA  índice: ' + m);
  falhas += doIndice.length;
  for (const slug of slugs) {
    const arquivo = join(PASTA, slug + '.json');
    console.log('\n  ' + slug);
    if (!existsSync(arquivo)) { console.log('    FALHA  não existe ' + arquivo); falhas++; continue; }
    let p;
    try { p = JSON.parse(readFileSync(arquivo, 'utf8')); } catch (e) { console.log('    FALHA  JSON inválido: ' + e.message); falhas++; continue; }
    const { erros, avisos } = checarParabola(slug, p);
    for (const m of erros) console.log('    FALHA  ' + m);
    for (const m of avisos) console.log('    aviso  ' + m);
    if (!erros.length) console.log('    ok     ' + (p.secoes || []).length + ' seções' + (avisos.length ? ' · ' + avisos.length + ' aviso(s)' : ''));
    falhas += erros.length;
  }
  console.log('');
  process.exit(falhas ? 1 : 0);
}
