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
  // Decisão do dono (12/10): o mapa segue a convenção dos atlas bíblicos impressos (a referência
  // são as fotos do apêndice da Bíblia dele): relevo em cores hipsométricas com o mar azul em
  // faixas, nomes escuros, o caminho em vermelho escuro (ida cheia, volta tracejada), a faixa
  // preta com o título no alto e uma legenda simples. O relevo é uma imagem pronta
  // (conteudo/atlas/relevo/<slug>.webp, de ferramentas/atlas-relevo.py); por cima, em SVG, a
  // costa, os rios, os nomes, o caminho, os números, a legenda, a escala e o norte. O desenho
  // é o mesmo nos dois temas (no escuro ele fica num cartão escuro); só a tela em volta muda.
  // Cada perna do caminho tem uma máscara que se desenha na abertura (o tracejado da volta não
  // anima; quem anima é a máscara), e cada número aparece quando a linha chega nele.
  const DUR = 0.55; // segundos por perna
  const FAIXA = 24; // a faixa preta do título, em unidades do mapa
  const ROTULO = { n: [0, -9, 'middle'], s: [0, 15, 'middle'], l: [7, 3.5, 'start'], o: [-7, 3.5, 'end'], ne: [6, -6, 'start'], no: [-6, -6, 'end'], se: [6, 11, 'start'], so: [-6, 11, 'end'] };

  function texto(x, y, linhas, classe, ancora, extra) {
    const ls = [].concat(linhas);
    return '<text class="' + classe + '" x="' + n(x) + '" y="' + n(y - (ls.length - 1) * 5) + '" text-anchor="' + (ancora || 'middle') + '"' + (extra || '') + '>'
      + ls.map((l, i) => '<tspan x="' + n(x) + '"' + (i ? ' dy="1.12em"' : '') + '>' + esc(l) + '</tspan>').join('') + '</text>';
  }
  const giro = (r) => (r.giro ? ' transform="rotate(' + r.giro + ' ' + r.x + ' ' + r.y + ')"' : '');

  function svg(m, op = {}) {
    const id = 'at-' + m.slug;
    const W = m.largura, H = m.altura;
    const comFaixa = op.faixa !== false;
    const topo = comFaixa ? FAIXA : 0;
    const partes = [];
    partes.push('<defs>' + m.pernas.map((p, i) => '<mask id="' + id + '-m' + i + '" maskUnits="userSpaceOnUse" x="-10" y="-10" width="' + (W + 20) + '" height="' + (H + 20) + '">'
      + '<path class="at-revela" d="' + p.d + '" pathLength="1" style="--i:' + i + '"/></mask>').join('') + '</defs>');
    partes.push('<g transform="translate(0 ' + topo + ')">');
    partes.push('<rect class="at-fundo" width="' + W + '" height="' + H + '"/>');
    if (m.imagem) partes.push('<image href="' + esc(m.imagem) + '" width="' + W + '" height="' + H + '" preserveAspectRatio="none"/>');
    if (m.terra) {
      partes.push('<g class="at-rios">' + m.rios.map((d) => '<path d="' + d + '"/>').join('') + m.riosExtras.map((r) => '<path d="' + r.d + '"/>').join('') + '</g>');
      if (m.lagos) partes.push('<path class="at-lago" d="' + m.lagos + '"/>');
      partes.push('<path class="at-costa" d="' + m.terra + '"/>');
    }
    partes.push('<g class="at-regioes">' + m.regioes.map((r) => texto(r.x, r.y, r.linhas || r.nome, 'at-regiao', 'middle', giro(r))).join('') + '</g>');
    partes.push('<g class="at-serras">' + (m.serras || []).map((r) => texto(r.x, r.y, r.linhas || r.nome, 'at-serra', 'middle', giro(r))).join('') + '</g>');
    partes.push('<g class="at-aguas">' + m.aguas.map((r) => texto(r.x, r.y, r.linhas || r.nome, 'at-agua' + (r.rio ? ' rio' : ''), 'middle', giro(r))).join('') + '</g>');
    // o caminho: um halo claro por baixo, para a linha ler sobre o marrom e o azul
    partes.push('<g class="at-caminho">' + m.pernas.map((p, i) => '<g mask="url(#' + id + '-m' + i + ')" class="at-perna ' + p.tipo + '">'
      + '<path class="at-rota-halo" d="' + p.d + '"/><path class="at-rota" d="' + p.d + '"/></g>').join('') + '</g>');
    // as cidades: ponto preto de anel branco e o nome; o número da parada vai pequeno ao lado
    const tempo = {};
    m.pernas.forEach((p, i) => { if (p.chega && tempo[p.chega] === undefined) tempo[p.chega] = i + 1; });
    partes.push('<g class="at-lugares">' + m.lugares.map((l) => {
      const [dx, dy, ancora] = ROTULO[l.lado] || ROTULO.l;
      return '<g class="at-lugar' + (l.contexto ? ' contexto' : '') + '" data-lugar="' + esc(l.id) + '">'
        + '<circle class="at-ponto" cx="' + l.x + '" cy="' + l.y + '" r="' + (l.contexto ? 2 : 2.4) + '"/>'
        + texto(l.x + dx + (l.dx || 0), l.y + dy + (l.dy || 0), l.linhas || l.nome, 'at-nome', ancora) + '</g>';
    }).join('') + '</g>');
    partes.push('<g class="at-numeros">' + m.lugares.filter((l) => l.n).map((l) => {
      const [mx, my] = l.marca || [-7, -7];
      return '<g class="at-numero ' + l.tipoN + '" data-parada="' + l.n + '" style="--t:' + (tempo[l.id] || 0) + '" transform="translate(' + n(l.x + mx) + ' ' + n(l.y + my) + ')">'
        + '<g class="at-numero-escala"><circle r="5.4"/><text y="2.3" text-anchor="middle">' + l.n + '</text></g></g>';
    }).join('') + '</g>');
    // legenda (ida e volta), escala e norte, num quadro claro no canto de baixo
    const e = m.escala;
    const leg = m.legenda.length ? m.legenda : [{ tipo: 'ida', nome: 'Ida' }, { tipo: 'volta', nome: 'Volta' }];
    const lw = Math.max(76, e.comprimento + 40);
    const lh = 14 + leg.length * 11 + 16;
    partes.push('<g class="at-legenda" transform="translate(8 ' + n(H - lh - 8) + ')"><rect width="' + n(lw) + '" height="' + lh + '" rx="3"/>'
      + leg.map((l, i) => '<g transform="translate(8 ' + (11 + i * 11) + ')"><path class="at-rota-halo ' + l.tipo + '" d="M0 0h20"/><path class="at-rota ' + l.tipo + '" d="M0 0h20"/>'
        + '<text x="26" y="3">' + esc(l.nome) + '</text></g>').join('')
      + '<g transform="translate(8 ' + (lh - 9) + ')"><path class="at-escala-fundo" d="M0 0h' + e.comprimento + '"/><path class="at-escala-meio" d="M0 0h' + n(e.comprimento / 2) + '"/>'
      + '<text x="' + n(e.comprimento + 4) + '" y="2.6">' + e.km + ' km</text></g></g>');
    partes.push('<g class="at-norte" transform="translate(' + n(W - 15) + ' 17)"><circle r="9"/><path class="at-norte-seta" d="M0 -6.5L3 3L0 1.2L-3 3Z"/><text y="-11.5" text-anchor="middle">N</text></g>');
    partes.push('</g>');
    if (comFaixa) {
      partes.push('<rect class="at-faixa" width="' + W + '" height="' + FAIXA + '"/>'
        + '<text class="at-titulo" x="10" y="' + (FAIXA / 2 + 3.6) + '">' + esc((m.tituloMapa || m.titulo).toUpperCase()) + '</text>');
    }
    return '<svg class="atlas-svg' + (op.animar ? ' animar' : '') + '" viewBox="0 0 ' + W + ' ' + n(H + topo) + '" role="img" aria-label="' + esc('Mapa: ' + m.titulo) + '" style="--pernas:' + m.pernas.length + ';--dur:' + DUR + 's">' + partes.join('') + '</svg>';
  }

  CC.atlas = Object.assign(CC.atlas || {}, { svg });
})(window.CC);
