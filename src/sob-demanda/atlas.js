/* Mapas bíblicos (o atlas): a lista #/atlas e cada mapa #/atlas/<slug>, pedidos só na primeira
   vez que a pessoa entra (CC.pedirPeca, como mapa-tela e parabola-tela). O build publica este
   arquivo como atlas.<resumo>.js, com o estilo (atlas.css) no lugar da marca abaixo. A casca (o
   cartão do Explorar, o carregamento e o erro) mora em src/app/06d-atlas.js, no index.html.
   O desenho chega pronto do build (ferramentas/atlas.mjs): a costa do Natural Earth (domínio
   público) e os caminhos já projetados em unidades da tela; aqui só se pinta, com as fichas do
   tema (atlas.css), para o mesmo mapa servir no claro e no escuro. */
(function (CC) {
  'use strict';

  const ESTILO = '/*ESTILO_PECA*/';
  if (typeof document !== 'undefined' && !document.querySelector('style[data-atlas-tela]')) {
    const s = document.createElement('style');
    s.dataset.atlasTela = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }
  const esc = CC.esc;
  const n = (v) => Math.round(v * 10) / 10;

  // ---------- o desenho do mapa ----------
  // Ordem das camadas: mar e grade, a faixa da costa, a terra, o relevo (sombra borrada só dentro
  // da terra), lagos e rios, o contorno, os nomes de região e de mar, o caminho (borda escura e
  // traço sálvia; a volta tracejada), as cidades, os números das paradas, a escala e o norte.
  // Cada perna do caminho tem uma máscara que se desenha na abertura (o tracejado da volta não
  // anima; quem anima é a máscara), e cada número aparece quando a linha chega nele.
  const DUR = 0.55; // segundos por perna
  const ROTULO = { n: [0, -13, 'middle'], s: [0, 21, 'middle'], l: [12, 4, 'start'], o: [-12, 4, 'end'], ne: [9, -9, 'start'], no: [-9, -9, 'end'], se: [9, 16, 'start'], so: [-9, 16, 'end'] };

  function texto(x, y, linhas, classe, ancora, extra) {
    const ls = [].concat(linhas);
    return '<text class="' + classe + '" x="' + n(x) + '" y="' + n(y - (ls.length - 1) * 6) + '" text-anchor="' + (ancora || 'middle') + '"' + (extra || '') + '>'
      + ls.map((l, i) => '<tspan x="' + n(x) + '"' + (i ? ' dy="1.1em"' : '') + '>' + esc(l) + '</tspan>').join('') + '</text>';
  }

  function svg(m, op = {}) {
    const id = 'at-' + m.slug;
    const W = m.largura, H = m.altura;
    const partes = [];
    partes.push('<defs><clipPath id="' + id + '-terra"><path d="' + m.terra + '" clip-rule="evenodd"/></clipPath>'
      + '<filter id="' + id + '-borrao" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="' + n(W / 70) + '"/></filter>'
      + m.pernas.map((p, i) => '<mask id="' + id + '-m' + i + '" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '">'
        + '<path class="at-revela" d="' + p.d + '" pathLength="1" style="--i:' + i + '"/></mask>').join('')
      + '</defs>');
    partes.push('<rect class="at-mar" width="' + W + '" height="' + H + '"/>');
    if (m.grade) {
      partes.push('<g class="at-grade">' + m.grade.lon.map((g) => '<path d="M' + g.x + ' 0V' + H + '"/>').join('')
        + m.grade.lat.map((g) => '<path d="M0 ' + g.y + 'H' + W + '"/>').join('') + '</g>');
    }
    if (m.terra) {
      partes.push('<path class="at-praia" d="' + m.terra + '"/>');
      partes.push('<path class="at-terra" d="' + m.terra + '" fill-rule="evenodd"/>');
      // relevo: a mesma serra duas vezes, luz a noroeste e sombra a sudeste, borradas
      const serras = m.relevo.map((r) => '<path d="' + r.d + '" stroke-width="' + r.l + '"/>').join('');
      partes.push('<g clip-path="url(#' + id + '-terra)"><g class="at-relevo" filter="url(#' + id + '-borrao)">'
        + '<g class="at-luz" transform="translate(-2.2 -2.2)">' + serras + '</g><g class="at-sombra" transform="translate(1.8 1.8)">' + serras + '</g></g></g>');
      if (m.lagos) partes.push('<path class="at-lago" d="' + m.lagos + '"/>');
      partes.push('<g class="at-rios">' + m.rios.map((d) => '<path d="' + d + '"/>').join('') + m.riosExtras.map((r) => '<path d="' + r.d + '"/>').join('') + '</g>');
      partes.push('<path class="at-costa" d="' + m.terra + '"/>');
    }
    if (m.grade) {
      // os graus na borda de cima e da esquerda, pequenos, fora do caminho
      partes.push('<g class="at-graus">' + m.grade.lon.filter((g) => g.x > 14 && g.x < W - 14).map((g) => '<text x="' + g.x + '" y="9" text-anchor="middle">' + g.g + '°L</text>').join('')
        + m.grade.lat.filter((g) => g.y > 18 && g.y < H - 10).map((g) => '<text x="3" y="' + n(g.y - 2.5) + '">' + g.g + '°N</text>').join('') + '</g>');
    }
    partes.push('<g class="at-regioes">' + m.regioes.map((r) => texto(r.x, r.y, r.linhas || r.nome, 'at-regiao', 'middle', r.giro ? ' transform="rotate(' + r.giro + ' ' + r.x + ' ' + r.y + ')"' : '')).join('') + '</g>');
    partes.push('<g class="at-serras">' + (m.serras || []).map((r) => texto(r.x, r.y, r.linhas || r.nome, 'at-serra', 'middle', r.giro ? ' transform="rotate(' + r.giro + ' ' + r.x + ' ' + r.y + ')"' : '')).join('') + '</g>');
    partes.push('<g class="at-aguas">' + m.aguas.map((r) => texto(r.x, r.y, r.linhas || r.nome, 'at-agua' + (r.rio ? ' rio' : ''), 'middle', r.giro ? ' transform="rotate(' + r.giro + ' ' + r.x + ' ' + r.y + ')"' : '')).join('') + '</g>');
    // o caminho
    partes.push('<g class="at-caminho">' + m.pernas.map((p, i) => '<g mask="url(#' + id + '-m' + i + ')" class="at-perna ' + p.tipo + '">'
      + '<path class="at-rota-borda" d="' + p.d + '"/><path class="at-rota" d="' + p.d + '"/></g>').join('') + '</g>');
    // as cidades: ponto e nome; quem tem parada leva o número no lugar do ponto
    const tempo = {};
    m.pernas.forEach((p, i) => { if (p.chega && tempo[p.chega] === undefined) tempo[p.chega] = i + 1; });
    // o número fica no lugar do ponto; quando duas cidades estão perto demais (Perge e Atália,
    // Antioquia e Selêucia), o número sai para o lado (marca) com um fio até o ponto
    const pos = (l) => (l.n && l.marca ? [l.x + l.marca[0], l.y + l.marca[1]] : [l.x, l.y]);
    partes.push('<g class="at-lugares">' + m.lugares.map((l) => {
      const [dx, dy, ancora] = ROTULO[l.lado] || ROTULO.l;
      const [bx, by] = pos(l);
      const folga = l.n ? 3 : 0;
      const tx = bx + dx + (l.dx || 0) + Math.sign(dx) * folga, ty = by + dy + (l.dy || 0) + (l.lado === 'n' ? -folga : l.lado === 's' ? folga : 0);
      return '<g class="at-lugar' + (l.contexto ? ' contexto' : '') + '" data-lugar="' + esc(l.id) + '">'
        + (l.n && !l.marca ? '' : '<circle class="at-ponto' + (l.n ? ' pequeno' : '') + '" cx="' + l.x + '" cy="' + l.y + '" r="' + (l.n ? 2 : 2.6) + '"/>')
        + (l.n && l.marca ? '<path class="at-fio" d="M' + l.x + ' ' + l.y + 'L' + n(bx) + ' ' + n(by) + '"/>' : '')
        + texto(tx, ty, l.linhas || l.nome, 'at-nome', ancora) + '</g>';
    }).join('') + '</g>');
    partes.push('<g class="at-numeros">' + m.lugares.filter((l) => l.n).map((l) => '<g class="at-numero ' + l.tipoN + '" data-parada="' + l.n + '" style="--t:' + (tempo[l.id] || 0) + '" transform="translate(' + pos(l).map(n).join(' ') + ')">'
      + '<g class="at-numero-escala"><circle r="8.6"/><text y="3.4" text-anchor="middle">' + l.n + '</text></g></g>').join('') + '</g>');
    // escala e norte
    const e = m.escala;
    partes.push('<g class="at-escala" transform="translate(12 ' + n(H - 14) + ')"><path class="at-escala-fundo" d="M0 0h' + e.comprimento + '"/>'
      + '<path class="at-escala-meio" d="M0 0h' + n(e.comprimento / 2) + '"/><path class="at-escala-ponta" d="M0 -3v6M' + e.comprimento + ' -3v6M' + n(e.comprimento / 2) + ' -2v4"/>'
      + '<text x="' + n(e.comprimento + 5) + '" y="3.4">' + e.km + ' km</text></g>');
    partes.push('<g class="at-norte" transform="translate(' + n(W - 18) + ' 26)"><circle r="11"/><path class="at-norte-seta" d="M0 -8L3.6 3.5L0 1.4L-3.6 3.5Z"/><text y="-14" text-anchor="middle">N</text></g>');
    return '<svg class="atlas-svg' + (op.animar ? ' animar' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc('Mapa: ' + m.titulo) + '" style="--pernas:' + m.pernas.length + ';--dur:' + DUR + 's">' + partes.join('') + '</svg>';
  }

  CC.atlas = Object.assign(CC.atlas || {}, { svg });
})(window.CC);
