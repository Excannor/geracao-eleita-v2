// Mapas bíblicos (o atlas, #/atlas): monta o desenho de cada mapa a partir dos dados.
// Entra: conteudo/atlas/geo.json (a costa, os lagos e os rios do Natural Earth, domínio
// público, gerados por ferramentas/atlas-geo.mjs) e conteudo/atlas/<slug>.json (os lugares em
// longitude e latitude, as regiões, o relevo, o caminho e as paradas com as referências).
// Sai: o mapa já projetado, com os caminhos SVG prontos em unidades da tela (a largura do mapa
// tem 400 unidades, perto dos px de um celular), para a peça src/sob-demanda/atlas.js só pintar.
// Projeção: equirretangular com a escala do paralelo do meio (cos φ0), que nas latitudes do
// Mediterrâneo deforma pouco num recorte regional; para o mundo antigo inteiro também serve.
// Uma planta de cidade (Jerusalém) usa o mesmo caminho: lon/lat de cada muro e vale, sem mar.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = join(RAIZ, 'conteudo', 'atlas');
const LARGURA = 400;
let geoCache = null;
const geo = () => (geoCache ||= JSON.parse(readFileSync(join(PASTA, 'geo.json'), 'utf8')));

export function projecao(vista, largura = LARGURA) {
  const k = Math.cos(((vista.sul + vista.norte) / 2) * Math.PI / 180);
  const esc = largura / ((vista.leste - vista.oeste) * k);
  const altura = Math.round((vista.norte - vista.sul) * esc * 10) / 10;
  const p = ([lon, lat]) => [(lon - vista.oeste) * k * esc, (vista.norte - lat) * esc];
  // km por unidade: 1 grau de latitude tem ~111,2 km
  return { p, largura, altura, kmPorUnidade: 111.2 / esc };
}

const n1 = (v) => Math.round(v * 10) / 10;
const fmt = (pts) => pts.map(([x, y]) => n1(x) + ' ' + n1(y));
const dAberto = (pts) => (pts.length ? 'M' + fmt(pts).join('L') : '');
const dFechado = (pts) => (pts.length > 2 ? 'M' + fmt(pts).join('L') + 'Z' : '');

function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const manter = new Uint8Array(pts.length);
  manter[0] = manter[pts.length - 1] = 1;
  const pilha = [[0, pts.length - 1]];
  while (pilha.length) {
    const [a, b] = pilha.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-12;
    let maior = 0, qual = -1;
    for (let i = a + 1; i < b; i++) {
      const t = Math.max(0, Math.min(1, ((pts[i][0] - ax) * dx + (pts[i][1] - ay) * dy) / l2));
      const d = Math.hypot(pts[i][0] - ax - t * dx, pts[i][1] - ay - t * dy);
      if (d > maior) { maior = d; qual = i; }
    }
    if (maior > tol) { manter[qual] = 1; pilha.push([a, qual], [qual, b]); }
  }
  return pts.filter((_, i) => manter[i]);
}

// recorte do polígono num retângulo (Sutherland-Hodgman); a margem deixa a borda do recorte
// fora da área visível, então o contorno da terra pode ser o próprio polígono
function recortar(anel, x0, y0, x1, y1) {
  const lados = [
    [(q) => q[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]],
    [(q) => q[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [(q) => q[1] >= y0, (a, b) => [a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0]],
    [(q) => q[1] <= y1, (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]],
  ];
  let pts = anel;
  for (const [dentro, corte] of lados) {
    const novo = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (dentro(a)) { novo.push(a); if (!dentro(b)) novo.push(corte(a, b)); } else if (dentro(b)) novo.push(corte(a, b));
    }
    pts = novo;
    if (!pts.length) break;
  }
  return pts;
}
// linha: só os trechos que passam pelo retângulo (com um ponto de folga de cada lado)
function trechosDentro(pts, x0, y0, x1, y1) {
  const dentro = (q) => q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1;
  const saida = [];
  let atual = [];
  pts.forEach((q, i) => {
    if (dentro(q) || (pts[i + 1] && dentro(pts[i + 1])) || (pts[i - 1] && dentro(pts[i - 1]))) atual.push(q);
    else if (atual.length) { saida.push(atual); atual = []; }
  });
  if (atual.length > 1) saida.push(atual);
  return saida.filter((t) => t.length > 1);
}

// curva suave por pontos (Catmull-Rom centrípeta simplificada em Bézier cúbica)
function curva(pts, tensao = 0.5) {
  if (pts.length < 3) return dAberto(pts);
  let d = 'M' + n1(pts[0][0]) + ' ' + n1(pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) * tensao / 3, p1[1] + (p2[1] - p0[1]) * tensao / 3];
    const c2 = [p2[0] - (p3[0] - p1[0]) * tensao / 3, p2[1] - (p3[1] - p1[1]) * tensao / 3];
    d += 'C' + [c1, c2, p2].map(([x, y]) => n1(x) + ' ' + n1(y)).join(' ');
  }
  return d;
}
// desloca uma linha para o lado (a volta corre ao lado da ida, sem cobri-la)
function deslocar(pts, d) {
  if (!d) return pts;
  return pts.map((q, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [q[0] - (dy / l) * d, q[1] + (dx / l) * d];
  });
}

// a terra e o resto da base, recortados e simplificados para uma vista
function base(vista, prj, tol) {
  const m = 12;
  const [x0, y0, x1, y1] = [-m, -m, prj.largura + m, prj.altura + m];
  const terra = [];
  for (const anel of geo().terra) {
    const r = recortar(dp(anel.map(prj.p), tol), x0, y0, x1, y1);
    if (r.length > 2) terra.push(dFechado(r));
  }
  const lagos = geo().lagos.map((a) => recortar(dp(a.map(prj.p), tol), x0, y0, x1, y1)).filter((r) => r.length > 2).map(dFechado);
  const rios = geo().rios.flatMap((l) => trechosDentro(dp(l.map(prj.p), tol), x0, y0, x1, y1)).map(dAberto);
  return { terra: terra.join(''), lagos: lagos.join(''), rios };
}

// a barra de escala: o maior número redondo de km que cabe em ~90 unidades
function escala(prj) {
  const km = [10, 20, 25, 50, 100, 200, 250, 500, 1000].reverse().find((v) => v / prj.kmPorUnidade <= 96) || 10;
  return { km, comprimento: n1(km / prj.kmPorUnidade) };
}

export function montarMapa(slug) {
  const m = JSON.parse(readFileSync(join(PASTA, slug + '.json'), 'utf8'));
  const prj = projecao(m.vista);
  const P = (ll) => prj.p(ll);
  const lugar = (id) => {
    const l = m.lugares[id];
    if (!l) throw new Error('atlas ' + slug + ': lugar desconhecido ' + id);
    return P([l.lon, l.lat]);
  };
  const ponto = (x) => (typeof x === 'string' ? lugar(x) : P(x));
  const saida = {
    slug, titulo: m.titulo, tituloMapa: m.tituloMapa || '', linha: m.linha || '', grupo: m.grupo, sub: m.sub, ref: m.ref, quando: m.quando || '', texto: m.texto || '',
    tipo: m.tipo || 'regiao', largura: prj.largura, altura: prj.altura, escala: escala(prj),
    legenda: m.legenda || [], leitura: m.leitura || [], notas: m.notas || [], ...(m.trechos ? { trechos: m.trechos } : {}), ...(m.legendaLado ? { legendaLado: m.legendaLado } : {}),
  };
  if (saida.tipo === 'regiao') {
    Object.assign(saida, base(m.vista, prj, 0.3));
    // a grade de graus inteiros (só no mar), com o número na borda
    const passo = m.vista.leste - m.vista.oeste > 14 ? 5 : 1;
    saida.grade = {
      lon: [], lat: [],
    };
    for (let g = Math.ceil(m.vista.oeste / passo) * passo; g <= m.vista.leste; g += passo) saida.grade.lon.push({ g, x: n1(P([g, m.vista.norte])[0]) });
    for (let g = Math.ceil(m.vista.sul / passo) * passo; g <= m.vista.norte; g += passo) saida.grade.lat.push({ g, y: n1(P([m.vista.oeste, g])[1]) });
  } else saida.terra = '';
  saida.riosExtras = (m.rios || []).map((r) => ({ d: curva(r.linha.map(P), 0.6), nome: r.nome || '' }));
  saida.relevo = (m.relevo || []).map((r) => ({ d: curva(r.linha.map(P), 0.7), l: n1(r.largura / prj.kmPorUnidade) }));
  // planta: muros, vales, construções e áreas em lon/lat
  saida.formas = (m.formas || []).map((f) => ({
    classe: f.classe, nome: f.nome || '',
    d: f.fechada ? dFechado(f.linha.map(P)) : (f.suave ? curva(f.linha.map(P), 0.6) : dAberto(f.linha.map(P))),
  }));
  const rot = (r) => {
    const [x, y] = P([r.lon, r.lat]);
    return { nome: r.nome, x: n1(x), y: n1(y), ...(r.giro ? { giro: r.giro } : {}), ...(r.linhas ? { linhas: r.linhas } : {}), ...(r.rio ? { rio: true } : {}) };
  };
  saida.regioes = (m.regioes || []).map(rot);
  saida.aguas = (m.aguas || []).map(rot);
  saida.serras = (m.serras || []).map(rot);
  // números das paradas em cada lugar (o primeiro número vai no mapa; a lista diz o resto)
  const numeros = {};
  // só a primeira cidade de uma parada leva o número (Samotrácia e Neápolis são uma parada só)
  for (const p of m.paradas || []) (numeros[[].concat(p.lugar)[0]] ||= []).push({ n: p.n, tipo: p.tipo || 'ida' });
  saida.lugares = Object.entries(m.lugares).map(([id, l]) => {
    const [x, y] = P([l.lon, l.lat]);
    const ns = numeros[id] || [];
    return {
      id, nome: l.nome, x: n1(x), y: n1(y), lado: l.lado || 'l', ...(l.dx ? { dx: l.dx } : {}), ...(l.dy ? { dy: l.dy } : {}),
      ...(ns.length ? { n: ns[0].n, tipoN: ns[0].tipo } : {}), ...(l.marca ? { marca: l.marca } : {}), ...(l.contexto ? { contexto: true } : {}), ...(l.oculto ? { oculto: true } : {}), ...(l.linhas ? { linhas: l.linhas } : {}),
    };
  });
  saida.pernas = (m.caminho || []).map((c) => ({
    tipo: c.tipo || 'ida', mar: !!c.mar,
    d: curva(deslocar(c.pontos.map(ponto), c.desvio || 0), c.tensao ?? 0.5),
    ...(c.chega ? { chega: c.chega } : {}),
  }));
  saida.paradas = (m.paradas || []).map((p) => ({ n: p.n, nome: p.nome, texto: p.texto, ref: p.ref, tipo: p.tipo || 'ida', lugar: [].concat(p.lugar)[0], lugares: [].concat(p.lugar) }));
  return saida;
}

// a miniatura da lista: um quadrado de 120 unidades com a terra e o caminho, sem nomes
export function montarMiniatura(m) {
  const vista = m.miniatura || m.vista;
  const k = Math.cos(((vista.sul + vista.norte) / 2) * Math.PI / 180);
  const w = (vista.leste - vista.oeste) * k, h = vista.norte - vista.sul;
  // quadrado: o lado maior manda, o menor ganha margem igual dos dois lados
  const lado = Math.max(w, h);
  const quadrada = {
    oeste: vista.oeste - (lado - w) / 2 / k, leste: vista.leste + (lado - w) / 2 / k,
    sul: vista.sul - (lado - h) / 2, norte: vista.norte + (lado - h) / 2,
  };
  const prj = projecao(quadrada, 120);
  const out = { tipo: m.tipo || 'regiao' };
  if (out.tipo === 'regiao') {
    const b = base(quadrada, prj, 0.6);
    out.terra = b.terra;
    out.lagos = b.lagos;
  }
  const P = (ll) => prj.p(ll);
  const ponto = (x) => (typeof x === 'string' ? P([m.lugares[x].lon, m.lugares[x].lat]) : P(x));
  out.formas = (m.formas || []).filter((f) => /muro|templo|vale/.test(f.classe)).map((f) => ({ classe: f.classe, d: f.fechada ? dFechado(f.linha.map(P)) : (f.suave ? curva(f.linha.map(P), 0.6) : dAberto(f.linha.map(P))) }));
  out.pernas = (m.caminho || []).map((c) => ({ tipo: c.tipo || 'ida', d: curva(c.pontos.map(ponto), c.tensao ?? 0.5) }));
  out.pontos = [...new Set((m.paradas || []).flatMap((p) => [].concat(p.lugar)))].filter((id) => m.lugares[id]).map((id) => P([m.lugares[id].lon, m.lugares[id].lat]).map(n1));
  return out;
}
