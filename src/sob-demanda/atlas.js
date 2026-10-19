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
    // áreas (as tribos) e plantas (muros, vales, construções), presas à terra quando há mar
    if (m.formas && m.formas.length) {
      if (m.terra) partes.push('<clipPath id="' + id + '-terra"><path d="' + m.terra + '"/></clipPath>');
      partes.push('<g class="at-formas"' + (m.terra ? ' clip-path="url(#' + id + '-terra)"' : '') + '>' + m.formas.map((f) => '<path class="at-forma ' + esc(f.classe) + '" d="' + f.d + '"/>').join('') + '</g>');
    }
    if (m.terra) {
      partes.push('<g class="at-rios">' + m.rios.map((d) => '<path d="' + d + '"/>').join('') + m.riosExtras.map((r) => '<path d="' + r.d + '"/>').join('') + '</g>');
      if (m.lagos) partes.push('<path class="at-lago' + (m.formas && m.formas.length ? ' cheio' : '') + '" d="' + m.lagos + '"/>');
      partes.push('<path class="at-costa" d="' + m.terra + '"/>');
    }
    partes.push('<g class="at-regioes">' + m.regioes.map((r) => texto(r.x, r.y, r.linhas || r.nome, 'at-regiao' + (r.fraca ? ' fraca' : ''), 'middle', giro(r))).join('') + '</g>');
    partes.push('<g class="at-serras">' + (m.serras || []).map((r) => texto(r.x, r.y, r.linhas || r.nome, 'at-serra', 'middle', giro(r))).join('') + '</g>');
    partes.push('<g class="at-aguas">' + m.aguas.map((r) => texto(r.x, r.y, r.linhas || r.nome, 'at-agua' + (r.rio ? ' rio' : ''), 'middle', giro(r))).join('') + '</g>');
    // o caminho: um halo claro por baixo, para a linha ler sobre o marrom e o azul
    partes.push('<g class="at-caminho">' + m.pernas.map((p, i) => '<g mask="url(#' + id + '-m' + i + ')" class="at-perna ' + p.tipo + '">'
      + '<path class="at-rota-halo" d="' + p.d + '"/><path class="at-rota" d="' + p.d + '"/></g>').join('') + '</g>');
    // as cidades: ponto preto de anel branco e o nome; o número da parada vai pequeno ao lado
    const tempo = {};
    m.pernas.forEach((p, i) => { if (p.chega && tempo[p.chega] === undefined) tempo[p.chega] = i + 1; });
    // lugar oculto: uma região sem cidade ("Galácia e Frígia"), só com o número no caminho
    partes.push('<g class="at-lugares">' + m.lugares.filter((l) => !l.oculto).map((l) => {
      const [dx, dy, ancora] = ROTULO[l.lado] || ROTULO.l;
      return '<g class="at-lugar' + (l.contexto ? ' contexto' : '') + '" data-lugar="' + esc(l.id) + '">'
        + '<circle class="at-ponto" cx="' + l.x + '" cy="' + l.y + '" r="' + (l.contexto ? 2 : 2.4) + '"/>'
        + texto(l.x + dx + (l.dx || 0), l.y + dy + (l.dy || 0), l.linhas || l.nome, 'at-nome', ancora) + '</g>';
    }).join('') + '</g>');
    partes.push('<g class="at-numeros">' + m.lugares.filter((l) => l.n).map((l) => {
      const [mx, my] = l.marca || [-7, -7];
      return '<g class="at-numero ' + l.tipoN + '" data-parada="' + l.n + '" data-de="' + esc(l.id) + '" style="--t:' + (tempo[l.id] || 0) + '" transform="translate(' + n(l.x + mx) + ' ' + n(l.y + my) + ')">'
        + '<g class="at-numero-escala"><circle r="5.4"/><text y="2.3" text-anchor="middle">' + l.n + '</text></g></g>';
    }).join('') + '</g>');
    // legenda (ida e volta), escala e norte, num quadro claro no canto de baixo
    const e = m.escala;
    const leg = m.legenda.length ? m.legenda : [{ tipo: 'ida', nome: 'Ida' }, { tipo: 'volta', nome: 'Volta' }];
    const lw = Math.max(76, e.comprimento + 40);
    const lh = 14 + leg.length * 11 + 16;
    partes.push('<g class="at-legenda" transform="translate(' + (/direita/.test(m.legendaLado || '') ? n(W - lw - 8) : 8) + ' ' + (/alto/.test(m.legendaLado || '') ? 8 : n(H - lh - 8)) + ')"><rect width="' + n(lw) + '" height="' + lh + '" rx="3"/>'
      + leg.map((l, i) => '<g transform="translate(8 ' + (11 + i * 11) + ')">' + (/^(divisa|muro|vale|templo|area)$/.test(l.tipo) ? (l.tipo === 'divisa' ? '<path class="at-forma divisa" d="M0 1C6 -3 13 4 20 0"/>' : '<rect class="at-forma ' + l.tipo + '" x="2" y="-4" width="16" height="8" rx="1.5"/>') : '<path class="at-rota-halo ' + l.tipo + '" d="M0 0h20"/><path class="at-rota ' + l.tipo + '" d="M0 0h20"/>')
        + '<text x="26" y="3">' + esc(l.nome) + '</text></g>').join('')
      + '<g transform="translate(8 ' + (lh - 9) + ')"><path class="at-escala-fundo" d="M0 0h' + e.comprimento + '"/><path class="at-escala-meio" d="M0 0h' + n(e.comprimento / 2) + '"/>'
      + '<text x="' + n(e.comprimento + 4) + '" y="2.6">' + e.km + ' km</text></g></g>');
    partes.push('<g class="at-norte" transform="translate(' + n(W - 15) + ' 23)"><circle r="9"/><path class="at-norte-seta" d="M0 -6.5L3 3L0 1.2L-3 3Z"/><text y="-11.5" text-anchor="middle">N</text></g>');
    partes.push('</g>');
    if (comFaixa) {
      partes.push('<rect class="at-faixa" width="' + W + '" height="' + FAIXA + '"/>'
        + '<text class="at-titulo" x="10" y="' + (FAIXA / 2 + 3.6) + '">' + esc((m.tituloMapa || m.titulo).toUpperCase()) + '</text>');
    }
    return '<svg class="atlas-svg' + (op.animar ? ' animar' : '') + '" viewBox="0 0 ' + W + ' ' + n(H + topo) + '" role="img" aria-label="' + esc('Mapa: ' + m.titulo) + '" style="--pernas:' + m.pernas.length + ';--dur:' + DUR + 's">' + partes.join('') + '</svg>';
  }

  // ---------- as telas ----------
  const reduzido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // espaço inseparável entre sigla e capítulo e um juntor depois do traço, como nas parábolas
  const nb = (t) => String(t).replace(/(\S) (?=\d)/g, '$1 ').replace(/(\d)([-–])(?=\d)/g, '$1$2⁠');
  const NOME_DA_SIGLA = new Map((CC.LIVROS_MAPA || []).map(([nome, , sigla]) => [sigla, nome]));
  // "At 13.51–14.5" → #/biblia/Atos/13 (o leitor abre no capítulo)
  const linkDaRef = (r) => {
    const x = /^(\S+) (\d+)/.exec(String(r || ''));
    const livro = x && NOME_DA_SIGLA.get(x[1]);
    return livro ? '#/biblia/' + encodeURIComponent(livro) + '/' + x[2] : '';
  };
  const ICO = {
    menos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',
    mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12M12 6v12"/></svg>',
    inteiro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  };
  // [Atos 13, Atos 14] → "Atos 13–14"; livros diferentes → "Êxodo 12 a Números 33"
  const trechoDeLeitura = (ls) => {
    const a = ls[0], z = ls[ls.length - 1];
    if (ls.length === 1) return a.livro + ' ' + a.cap;
    return a.livro === z.livro ? a.livro + ' ' + a.cap + '–' + z.cap : a.livro + ' ' + a.cap + ' a ' + z.livro + ' ' + z.cap;
  };
  const linhaAmostra = (tipo) => '<svg class="atlas-amostra ' + tipo + '" viewBox="0 0 28 8" aria-hidden="true"><path d="M2 4h24"/></svg>';
  const barra = (voltar) => '<div class="mapa-barra"><button class="botao-redondo" data-voltar data-rotulo-voltar="' + voltar + '" aria-label="Voltar">'
    + CC.ico('voltar') + '</button><span class="mapa-barra-titulo">Mapas bíblicos</span><span class="atlas-vaga"></span></div>';

  // ---------- a lista (#/atlas) ----------
  function lista(raiz) {
    const { A, buscar, pronto } = CC.atlasDados;
    // a caixa toma a proporção do próprio mapa: nada sobra embaixo nem fica cortado
    const proporcao = (m) => m ? ' style="aspect-ratio:' + m.largura + ' / ' + m.altura + '"' : '';
    const cartao = (it) => {
      const m = pronto(it.arquivo);
      return '<a class="item-atlas" href="#/atlas/' + it.slug + '" data-item-atlas="' + it.slug + '">'
        + '<span class="item-atlas-mapa" aria-hidden="true"' + proporcao(m) + '>' + (m ? svg(m, { faixa: false, mini: true }) : '') + '</span>'
        + '<span class="item-atlas-textos"><b>' + esc(it.titulo) + '</b><span class="item-atlas-linha">' + esc(it.linha) + '</span>'
        + '<span class="item-atlas-pe"><mark>' + nb(esc(it.ref)) + '</mark>' + CC.ico('avancar') + '</span></span></a>';
    };
    raiz.innerHTML = '<div class="folha-mapa folha-atlas">' + barra('Explorar')
      + '<div class="atlas-cabeca"><span class="mapa-grupo">Explorar</span><h1 class="atlas-nome">Mapas bíblicos</h1>'
      + '<p>As cidades, os caminhos e o relevo de onde a história aconteceu.</p></div></div>'
      + '<div class="lista-atlas">' + A.grupos.map((g) => '<section class="grupo-atlas"><h2>' + esc(g.nome) + '</h2>'
        + A.itens.filter((it) => it.grupo === g.id).map(cartao).join('') + '</section>').join('')
      + '<p class="atlas-em-breve">Mais mapas em breve.</p></div>';
    CC.ligarVoltarDoTopo(raiz);
    CC.inseparavel(raiz);
    // a miniatura é o próprio mapa, desenhado quando os dados dele chegam
    for (const it of A.itens) {
      if (pronto(it.arquivo)) continue;
      buscar(it.arquivo).then((m) => {
        const alvo = raiz.querySelector('[data-item-atlas="' + it.slug + '"] .item-atlas-mapa');
        if (!alvo) return;
        alvo.style.aspectRatio = m.largura + ' / ' + m.altura;
        alvo.innerHTML = svg(m, { faixa: false, mini: true });
      }).catch(() => null);
    }
  }

  // ---------- um mapa (#/atlas/<slug>) ----------
  function parada(p) {
    const link = linkDaRef(p.ref);
    return '<li class="atlas-parada ' + p.tipo + '" id="atlas-parada-' + p.n + '">'
      + '<button type="button" class="atlas-parada-botao" data-ir-parada="' + p.n + '" aria-label="' + esc('Ver no mapa: ' + p.n + ', ' + p.nome) + '">'
      + '<span class="atlas-parada-n" aria-hidden="true">' + p.n + '</span><span class="atlas-parada-textos"><b>' + esc(p.nome) + '</b>'
      + '<span>' + esc(p.texto) + '</span></span></button>'
      + (link ? '<a class="atlas-parada-ref" href="' + link + '" aria-label="' + esc('Ler ' + p.ref.replace(/^At /, 'Atos ')) + '"><mark>' + nb(esc(p.ref)) + '</mark>' + CC.ico('livro') + '</a>' : '')
      + '</li>';
  }

  function mapa(raiz, item, m) {
    const ida = m.paradas.filter((p) => p.tipo !== 'volta'), volta = m.paradas.filter((p) => p.tipo === 'volta');
    const ler = m.leitura[0];
    // a linha se desenha quando a tela abre; um redesenho com o mesmo mapa na tela não repete
    const animar = !raiz.querySelector('[data-atlas-mapa="' + m.slug + '"]');
    const grupo = (CC.atlasDados.A.grupos.find((g) => g.id === item.grupo) || {}).nome || '';
    raiz.innerHTML = '<div class="folha-mapa folha-atlas">' + barra('Mapas bíblicos')
      + '<div class="atlas-cabeca"><span class="mapa-grupo">' + esc(grupo) + '</span><h1 class="atlas-nome">' + esc(m.titulo) + '</h1>'
      + '<p class="atlas-sub">' + esc(m.sub) + ' · <mark>' + nb(esc(m.ref)) + '</mark></p>'
      + (m.quando ? '<p class="atlas-quando">' + esc(m.quando.charAt(0).toUpperCase() + m.quando.slice(1)) + '</p>' : '') + '</div></div>'
      + (m.texto ? '<p class="atlas-texto">' + esc(m.texto) + '</p>' : '')
      + '<figure class="atlas-quadro" data-atlas-mapa="' + esc(m.slug) + '"><div class="atlas-palco" data-atlas-palco><div class="atlas-zoom">' + svg(m, { animar }) + '</div></div>'
      + '<figcaption class="atlas-pe"><span class="atlas-dica">Toque duas vezes ou use dois dedos para aproximar.</span>'
      + '<span class="atlas-controles"><button type="button" class="atlas-botao" data-zoom="mais" aria-label="Aproximar">' + ICO.mais + '</button>'
      + '<button type="button" class="atlas-botao" data-zoom="menos" aria-label="Afastar" disabled>' + ICO.menos + '</button>'
      + '<button type="button" class="atlas-botao" data-zoom="inteiro" aria-label="Ver o mapa inteiro" hidden>' + ICO.inteiro + '</button></span></figcaption></figure>'
      + '<h2 class="mapa-rotulo atlas-rotulo">' + CC.ico('alfinete') + '<span>Paradas</span></h2>'
      + '<h3 class="atlas-trecho">' + (m.pernas.length ? linhaAmostra('ida') : '') + esc((m.trechos || {}).ida || 'Ida') + '</h3><ol class="atlas-paradas">' + ida.map(parada).join('') + '</ol>'
      + (volta.length ? '<h3 class="atlas-trecho">' + linhaAmostra('volta') + esc((m.trechos || {}).volta || 'Volta') + '</h3><ol class="atlas-paradas">' + volta.map(parada).join('') + '</ol>' : '')
      + (ler ? '<a class="botao atlas-ler" href="#/biblia/' + encodeURIComponent(ler.livro) + '/' + ler.cap + '">' + CC.ico('livro') + 'Ler a passagem · ' + esc(trechoDeLeitura(m.leitura)) + '</a>' : '')
      + '<p class="atlas-fonte">Posições e caminhos aproximados. Relevo e profundidade: SRTM, GMTED2010 e ETOPO1 (dados públicos); costa: Natural Earth.</p>';
    CC.ligarVoltarDoTopo(raiz);
    CC.inseparavel(raiz);
    ligarZoom(raiz, m);
  }

  // ---------- aproximar e arrastar ----------
  // O mapa fica num palco de proporção fixa; o zoom é um transform no miolo (o navegador só
  // escala a imagem pronta). Sem zoom, um dedo rola a página (touch-action: pan-y); com zoom,
  // um dedo arrasta o mapa. Dois dedos aproximam, toque duplo alterna, e os botões fazem o mesmo.
  function ligarZoom(raiz, m) {
    const palco = raiz.querySelector('[data-atlas-palco]');
    const miolo = palco.querySelector('.atlas-zoom');
    const svgEl = miolo.querySelector('svg');
    const MAX = 5;
    let s = 1, tx = 0, ty = 0;
    const tam = () => [palco.clientWidth, palco.clientHeight];
    function aplicar(suave) {
      const [w, h] = tam();
      s = Math.min(MAX, Math.max(1, s));
      tx = Math.min(0, Math.max(w - w * s, tx));
      ty = Math.min(0, Math.max(h - h * s, ty));
      miolo.classList.toggle('suave', !!suave && !reduzido());
      miolo.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
      svgEl.style.setProperty('--zi', String(1 / Math.sqrt(s)));
      palco.classList.toggle('ampliado', s > 1.01);
      raiz.querySelector('[data-zoom="menos"]').disabled = s <= 1.01;
      raiz.querySelector('[data-zoom="mais"]').disabled = s >= MAX - .01;
      raiz.querySelector('[data-zoom="inteiro"]').hidden = s <= 1.01;
    }
    // aproxima em torno de um ponto do palco (px), mantendo esse ponto parado
    function zoomEm(novo, px, py, suave) {
      const cx = (px - tx) / s, cy = (py - ty) / s;
      s = Math.min(MAX, Math.max(1, novo));
      tx = px - cx * s; ty = py - cy * s;
      aplicar(suave);
    }
    // centra um ponto do mapa (unidades do SVG) no palco, com pelo menos o zoom z
    function centrar(ux, uy, z) {
      const [w, h] = tam();
      const vb = svgEl.viewBox.baseVal;
      const k = w / vb.width;
      s = Math.max(s, z);
      tx = w / 2 - ux * k * s; ty = h / 2 - uy * k * s;
      aplicar(true);
    }
    raiz.querySelectorAll('[data-zoom]').forEach((b) => {
      b.onclick = () => {
        const [w, h] = tam();
        if (b.dataset.zoom === 'inteiro') { s = 1; tx = 0; ty = 0; aplicar(true); } else zoomEm(s * (b.dataset.zoom === 'mais' ? 1.6 : 1 / 1.6), w / 2, h / 2, true);
      };
    });

    const dedos = new Map();
    let inicio = null, moveu = false, ultimoToque = 0, ultimoPonto = null;
    const ponto = (e) => { const r = palco.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    palco.addEventListener('pointerdown', (e) => {
      dedos.set(e.pointerId, ponto(e));
      moveu = false;
      if (dedos.size === 2 || s > 1.01) { try { palco.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } }
      const pts = [...dedos.values()];
      inicio = { s, tx, ty, pts: pts.map((p) => p.slice()) };
    });
    palco.addEventListener('pointermove', (e) => {
      if (!dedos.has(e.pointerId) || !inicio) return;
      dedos.set(e.pointerId, ponto(e));
      const pts = [...dedos.values()];
      if (pts.length >= 2 && inicio.pts.length >= 2) {
        const d0 = Math.hypot(inicio.pts[0][0] - inicio.pts[1][0], inicio.pts[0][1] - inicio.pts[1][1]) || 1;
        const d1 = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
        const m0 = [(inicio.pts[0][0] + inicio.pts[1][0]) / 2, (inicio.pts[0][1] + inicio.pts[1][1]) / 2];
        const m1 = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
        const cx = (m0[0] - inicio.tx) / inicio.s, cy = (m0[1] - inicio.ty) / inicio.s;
        s = Math.min(MAX, Math.max(1, inicio.s * d1 / d0));
        tx = m1[0] - cx * s; ty = m1[1] - cy * s;
        moveu = true;
        aplicar(false);
        e.preventDefault();
      } else if (pts.length === 1 && inicio.s > 1.01) {
        const dx = pts[0][0] - inicio.pts[0][0], dy = pts[0][1] - inicio.pts[0][1];
        if (Math.hypot(dx, dy) > 4) moveu = true;
        tx = inicio.tx + dx; ty = inicio.ty + dy;
        aplicar(false);
        e.preventDefault();
      }
    });
    const soltar = (e) => {
      if (!dedos.has(e.pointerId)) return;
      const p = dedos.get(e.pointerId);
      dedos.delete(e.pointerId);
      const pts = [...dedos.values()];
      inicio = pts.length ? { s, tx, ty, pts: pts.map((q) => q.slice()) } : null;
      if (e.type !== 'pointerup' || moveu || pts.length) return;
      // toque duplo: aproxima no ponto; se já está perto, volta ao inteiro
      const agora = Date.now();
      if (agora - ultimoToque < 320 && ultimoPonto && Math.hypot(p[0] - ultimoPonto[0], p[1] - ultimoPonto[1]) < 30) {
        if (s > 1.5) { s = 1; tx = 0; ty = 0; aplicar(true); } else zoomEm(2.4, p[0], p[1], true);
        ultimoToque = 0;
        return;
      }
      ultimoToque = agora; ultimoPonto = p;
    };
    palco.addEventListener('pointerup', soltar);
    palco.addEventListener('pointercancel', soltar);
    palco.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return; // pinça do trackpad; a roda sozinha continua rolando a página
      e.preventDefault();
      const [px, py] = ponto(e);
      zoomEm(s * Math.exp(-e.deltaY / 200), px, py, false);
    }, { passive: false });

    // da lista para o mapa: centra a parada (ou as cidades dela) e pulsa
    const porN = new Map(m.paradas.map((p) => [String(p.n), p]));
    const lugares = new Map(m.lugares.map((l) => [l.id, l]));
    const pulsos = svgEl.querySelector('.at-pulsos') || svgEl.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
    pulsos.setAttribute('class', 'at-pulsos');
    pulsos.setAttribute('transform', 'translate(0 24)');
    function destacar(n) {
      const p = porN.get(String(n));
      if (!p) return;
      const ids = [].concat(p.lugares || p.lugar);
      const ls = ids.map((id) => lugares.get(id)).filter(Boolean);
      if (!ls.length) return;
      const ux = ls.reduce((a, l) => a + l.x, 0) / ls.length, uy = ls.reduce((a, l) => a + l.y, 0) / ls.length + 24;
      raiz.querySelectorAll('.atlas-parada.ativa').forEach((li) => li.classList.remove('ativa'));
      const li = raiz.querySelector('#atlas-parada-' + n);
      if (li) li.classList.add('ativa');
      centrar(ux, uy, ls.length > 1 ? 1.6 : 2.2);
      pulsos.innerHTML = ls.map((l) => '<circle class="at-pulso" cx="' + l.x + '" cy="' + l.y + '" r="9"/>').join('');
      const cartao = raiz.querySelector('.atlas-quadro');
      const r = cartao.getBoundingClientRect();
      if (r.top < 60 || r.bottom > innerHeight - 100) cartao.scrollIntoView({ block: 'start', behavior: reduzido() ? 'auto' : 'smooth' });
    }
    raiz.querySelectorAll('[data-ir-parada]').forEach((b) => { b.onclick = () => destacar(b.dataset.irParada); });
    // do mapa para a lista: tocar num número leva à parada e a acende
    svgEl.addEventListener('click', (e) => {
      const g = e.target.closest('[data-parada]');
      if (!g || moveu) return;
      const li = raiz.querySelector('#atlas-parada-' + g.dataset.parada);
      if (!li) return;
      raiz.querySelectorAll('.atlas-parada.ativa').forEach((x) => x.classList.remove('ativa'));
      li.classList.add('ativa');
      li.scrollIntoView({ block: 'center', behavior: reduzido() ? 'auto' : 'smooth' });
    });
    // ao girar o celular, o palco muda de tamanho; quando a tela sai, o ouvinte sai junto
    const aoRedimensionar = () => {
      if (!palco.isConnected) { removeEventListener('resize', aoRedimensionar); return; }
      aplicar(false);
    };
    addEventListener('resize', aoRedimensionar, { passive: true });
    aplicar(false);
  }

  function tela(raiz, item, m) {
    if (!item) lista(raiz);
    else mapa(raiz, item, m);
  }

  CC.atlas = Object.assign(CC.atlas || {}, { svg, tela });
})(window.CC);
