// Gera conteudo/atlas/geo.json, a geografia de base dos Mapas bíblicos (o atlas), a partir do
// Natural Earth (domínio público, naturalearthdata.com), a costa em 1:10 milhões e os lagos e rios em 1:50 milhões.
// Os dados não ficam no repositório: baixe os pacotes do registro do npm numa pasta fora dele
// (o GitHub e as CDNs recusam pelo proxy, o npm não):
//   cd <pasta> && npm pack world-atlas@2.0.2 sane-topojson@4.0.0 topojson-client@3.1.0
//   tar xzf world-atlas-2.0.2.tgz && mv package wa
//   tar xzf sane-topojson-4.0.0.tgz && mv package st
//   tar xzf topojson-client-3.1.0.tgz && mv package tc
//   node ferramentas/atlas-geo.mjs <pasta>
// Sai só o que o atlas usa: a terra, os lagos e os rios entre a Espanha e a Pérsia, recortados
// na caixa abaixo e simplificados (Douglas-Peucker, ~0,4 km na costa e ~1 km nos rios), em [lon, lat] com 3 casas.
// O build (ferramentas/atlas.mjs) projeta e recorta de novo para cada mapa.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const pasta = process.argv[2] && resolve(process.argv[2]);
if (!pasta) { console.error('uso: node ferramentas/atlas-geo.mjs <pasta com wa/, st/ e tc/>'); process.exit(1); }
const tc = createRequire(import.meta.url)(join(pasta, 'tc', 'dist', 'topojson-client.js'));
const ler = (f) => JSON.parse(readFileSync(join(pasta, f), 'utf8'));

const CAIXA = { oeste: -7, leste: 64, sul: 20, norte: 48 };
const TOL = 0.01;
const TOL_TERRA = 0.004;

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
      const [px, py] = pts[i];
      let t = ((px - ax) * dx + (py - ay) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(px - ax - t * dx, py - ay - t * dy);
      if (d > maior) { maior = d; qual = i; }
    }
    if (maior > tol) { manter[qual] = 1; pilha.push([a, qual], [qual, b]); }
  }
  return pts.filter((_, i) => manter[i]);
}

// recorte de polígono na caixa (Sutherland-Hodgman, um lado por vez)
function recortarAnel(anel) {
  const lados = [
    [(p) => p[0] >= CAIXA.oeste, (a, b) => [CAIXA.oeste, a[1] + (b[1] - a[1]) * (CAIXA.oeste - a[0]) / (b[0] - a[0])]],
    [(p) => p[0] <= CAIXA.leste, (a, b) => [CAIXA.leste, a[1] + (b[1] - a[1]) * (CAIXA.leste - a[0]) / (b[0] - a[0])]],
    [(p) => p[1] >= CAIXA.sul, (a, b) => [a[0] + (b[0] - a[0]) * (CAIXA.sul - a[1]) / (b[1] - a[1]), CAIXA.sul]],
    [(p) => p[1] <= CAIXA.norte, (a, b) => [a[0] + (b[0] - a[0]) * (CAIXA.norte - a[1]) / (b[1] - a[1]), CAIXA.norte]],
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
// linhas (rios): ficam os trechos com algum ponto dentro da caixa
const dentroCaixa = (p) => p[0] >= CAIXA.oeste && p[0] <= CAIXA.leste && p[1] >= CAIXA.sul && p[1] <= CAIXA.norte;
const arred = (pts) => pts.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
const area = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

function aneis(geo) {
  const polis = geo.type === 'Polygon' ? [geo.coordinates] : geo.type === 'MultiPolygon' ? geo.coordinates : [];
  return polis.flatMap((p) => p);
}
function linhas(geo) {
  return geo.type === 'LineString' ? [geo.coordinates] : geo.type === 'MultiLineString' ? geo.coordinates : [];
}

const terra = [];
const wa = ler('wa/land-10m.json');
for (const f of tc.feature(wa, wa.objects.land).features) {
  for (const anel of aneis(f.geometry)) {
    const r = recortarAnel(dp(anel.slice(0, -1), TOL_TERRA));
    if (r.length >= 3 && Math.abs(area(r)) > 0.0004) terra.push(arred(r));
  }
}

const lagos = [], rios = [];
const vistos = new Set();
for (const c of ['europe_50m', 'asia_50m', 'africa_50m']) {
  const t = ler('st/dist/' + c + '.json');
  for (const f of tc.feature(t, t.objects.lakes).features) {
    for (const anel of aneis(f.geometry)) {
      if (!anel.some(dentroCaixa)) continue;
      const r = arred(recortarAnel(dp(anel.slice(0, -1), TOL / 2)));
      const k = JSON.stringify(r.slice(0, 3));
      if (r.length >= 3 && !vistos.has(k)) { vistos.add(k); lagos.push(r); }
    }
  }
  for (const f of tc.feature(t, t.objects.rivers).features) {
    for (const l of linhas(f.geometry)) {
      if (!l.some(dentroCaixa)) continue;
      const r = arred(dp(l, TOL));
      const k = JSON.stringify(r.slice(0, 3));
      if (r.length >= 2 && !vistos.has(k)) { vistos.add(k); rios.push(r); }
    }
  }
}

const geo = {
  fonte: 'Natural Earth (domínio público): costa 1:10m via world-atlas 2.0.2 e sane-topojson 4.0.0 (lagos e rios 1:50m); recortado e simplificado por ferramentas/atlas-geo.mjs',
  caixa: CAIXA,
  terra, lagos, rios,
};
const saida = join(RAIZ, 'conteudo', 'atlas', 'geo.json');
// uma linha por anel: o diff fica legível e o arquivo, pequeno
const texto = '{\n"fonte": ' + JSON.stringify(geo.fonte) + ',\n"caixa": ' + JSON.stringify(CAIXA)
  + ',\n"terra": [\n' + terra.map((a) => JSON.stringify(a)).join(',\n')
  + '\n],\n"lagos": [\n' + lagos.map((a) => JSON.stringify(a)).join(',\n')
  + '\n],\n"rios": [\n' + rios.map((a) => JSON.stringify(a)).join(',\n') + '\n]\n}\n';
writeFileSync(saida, texto, 'utf8');
console.log('geo.json:', terra.length, 'anéis de terra,', lagos.length, 'lagos,', rios.length, 'rios,', (texto.length / 1024).toFixed(1), 'KB');
