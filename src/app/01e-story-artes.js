/* Modelos de story das frases que vieram com arte (2026-10-09). O dono mandou artes de
   referência (a chama de "Não me envergonho do Evangelho", a lâmpada de "Luz do mundo", o globo
   com ovelhas de "Ninguém fica para trás", o oleiro, o cartaz de procurado, a bandeira de
   "Jesus é suficiente", o livro de Tiago 1.22 e a porta de Apocalipse 3.20); aqui cada uma é
   redesenhada em canvas, sem imagem embutida (o index.html tem teto de 1 MB): desenhos em
   caminhos e traços, e a textura de impressão gasta é ruído com semente fixa (a mesma frase
   sai sempre igual). As de terceiros (procurado, a foto da bandeira) viraram ilustração
   própria, só com a ideia. Duas o dono preferiu só tipográficas (envergonho, oleiro).
   Quando a frase sorteada é uma destas, 01d-story.js desenha com o modelo dela
   (CC.story.artes[arte]); as outras continuam no modelo de sempre.
   Em todos: a chama e a contagem de dias no topo (a ofensiva continua em destaque), a arte no
   meio e só a marca no pé, logo acima da faixa de baixo que o Instagram cobre. */
(function (CC) {
  'use strict';

  const S = CC.story;
  const { L, A, SEGURA } = S;
  const PE = A - SEGURA - 80;

  // ---------- textura ----------
  // Sorteio com semente (mulberry32): a textura é sempre a mesma para o mesmo modelo.
  function sorteio(semente) {
    let a = semente >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Grão de papel/impressão na imagem toda: um pixel em cada seis clareia ou escurece um
  // pouco. Ralo de propósito: ruído em todo pixel não comprime, e o PNG passava de 4 MB.
  function grao(ctx, forca, semente) {
    let img;
    try { img = ctx.getImageData(0, 0, L, A); } catch (e) { return; }
    const d = img.data;
    let x = semente >>> 0 || 1;
    for (let i = 0; i < d.length; i += 4) {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      const u = (x >>> 0) / 4294967296;
      if (u > 0.16) continue;
      const n = (u < 0.08 ? -1 : 1) * forca;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }
  // Tinta gasta: furinhos, manchas ralas e riscos tirados de uma camada (destination-out),
  // como a impressão de camiseta das referências.
  function gastar(c, caixa, { pontos, manchas, riscos, semente, forca = 1 }) {
    const ctx = c.getContext('2d');
    const r = sorteio(semente);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < pontos; i++) {
      ctx.globalAlpha = (0.35 + r() * 0.65) * forca;
      ctx.beginPath();
      ctx.arc(caixa.x + r() * caixa.w, caixa.y + r() * caixa.h, 0.6 + r() * r() * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < manchas; i++) {
      ctx.globalAlpha = (0.06 + r() * 0.16) * forca;
      ctx.beginPath();
      ctx.ellipse(caixa.x + r() * caixa.w, caixa.y + r() * caixa.h, 20 + r() * 90, 8 + r() * 40, r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < riscos; i++) {
      ctx.globalAlpha = (0.3 + r() * 0.5) * forca;
      ctx.lineWidth = 0.8 + r() * 1.8;
      const x = caixa.x + r() * caixa.w;
      const y = caixa.y + r() * caixa.h;
      const ang = -0.5 + r() * 1;
      const comp = 14 + r() * 60;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * comp, y + Math.sin(ang) * comp);
      ctx.stroke();
    }
    ctx.restore();
  }
  function camada() {
    const c = S.tela();
    return { c, ctx: c.getContext('2d') };
  }
  function fundo(ctx, cor, brilho) {
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, L, A);
    if (brilho) {
      const g = ctx.createRadialGradient(brilho.x, brilho.y, 0, brilho.x, brilho.y, brilho.r);
      g.addColorStop(0, brilho.cor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, L, A);
    }
  }
  // Uma referência em Oswald espaçada (como a .selo-ref do app).
  function referencia(ctx, ref, x, y, tam, cor, alinhar = 'center') {
    S.escrever(ctx, ref.toUpperCase(), x, y, '700 ' + tam + 'px Oswald, sans-serif', cor, { alinhar, espaco: tam * 0.16 });
  }

  // ---------- (a) Não me envergonho do Evangelho: só tipografia ----------
  // Uma linha em letras grossas que incham no meio (a barriga das letras da arte): cada letra
  // é desenhada sozinha, esticada na vertical pelo cosseno da distância ao centro da linha.
  function linhaInchada(ctx, texto, cx, meio, largura, altura, inchaco) {
    const tam = 100;
    ctx.font = '800 ' + tam + 'px Manrope, sans-serif';
    const aperto = -tam * 0.03;
    const larg = [...texto].map((l) => ctx.measureText(l).width);
    const total = larg.reduce((a, b) => a + b, 0) + aperto * (larg.length - 1);
    const m = ctx.measureText('H');
    const cap = m.actualBoundingBoxAscent || tam * 0.72;
    const sx = largura / total;
    const sy = altura / cap;
    let x = cx - largura / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    [...texto].forEach((l, i) => {
      const w = larg[i] * sx;
      const centro = x + w / 2;
      const d = (centro - cx) / (largura / 2);
      const k = 1 + inchaco * Math.cos(d * Math.PI / 2) - inchaco * 0.35;
      ctx.save();
      ctx.translate(centro, meio);
      ctx.scale(sx, sy * k);
      ctx.fillText(l, 0, cap / 2);
      // engrossa a letra (a da arte é bem cheia), com os cantos arredondados
      ctx.lineJoin = 'round';
      ctx.lineWidth = 7;
      ctx.strokeText(l, 0, cap / 2);
      ctx.restore();
      x += w + aperto * sx;
    });
  }
  function arteChama(ctx) {
    const { c, ctx: k } = camada();
    k.fillStyle = '#f4f1ea';
    k.strokeStyle = '#f4f1ea';
    // [texto, largura, altura das maiúsculas, quanto incha no meio]
    const linhas = [
      ['NÃO', 400, 170, 0.14],
      ['ME', 240, 104, 0.1],
      ['ENVERGONHO', 900, 140, 0.3],
      ['DO', 170, 80, 0.08],
      ['EVANGELHO', 830, 140, 0.3],
    ];
    const vao = 30;
    let y = 690;
    for (const [t, w, h, inc] of linhas) {
      linhaInchada(k, t, L / 2, y + h / 2, w, h, inc);
      y += h + vao;
    }
    gastar(c, { x: 60, y: 600, w: L - 120, h: 920 }, { pontos: 9000, manchas: 0, riscos: 90, semente: 16 });
    ctx.drawImage(c, 0, 0);
    referencia(ctx, 'Romanos 1.16', L / 2, 600, 34, 'rgba(244,241,234,.78)');
  }

  // ---------- (b) Luz do mundo: a lâmpada em traço laranja sobre marrom ----------
  // Em volta do centro do vidro (cx, cy) de raio r: o bulbo, o gargalo e a rosca.
  function caminhoLampada(cx, cy, r) {
    const p = new Path2D();
    const a1 = Math.PI * 0.80;
    const a2 = Math.PI * 0.20;
    const gx = r * 0.4; // meia largura do gargalo
    const gy = cy + r * 1.38;
    p.moveTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    p.arc(cx, cy, r, a1, a2, false);
    p.bezierCurveTo(cx + r * 0.62, cy + r * 0.95, cx + gx, cy + r * 1.05, cx + gx, gy);
    p.lineTo(cx - gx, gy);
    p.bezierCurveTo(cx - gx, cy + r * 1.05, cx - r * 0.62, cy + r * 0.95, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    // a rosca: quatro voltas e o bico
    for (let i = 0; i < 4; i++) {
      const y = gy + 18 + i * r * 0.15;
      const w = gx * (1.02 - i * 0.05);
      p.moveTo(cx - w, y);
      p.bezierCurveTo(cx - w * 0.4, y + 14, cx + w * 0.4, y + 14, cx + w, y);
    }
    const yb = gy + 18 + 3 * r * 0.15;
    p.moveTo(cx - gx * 0.84, yb + 6);
    p.bezierCurveTo(cx - gx * 0.6, yb + r * 0.2, cx + gx * 0.6, yb + r * 0.2, cx + gx * 0.84, yb + 6);
    p.moveTo(cx - gx * 0.3, yb + r * 0.17);
    p.quadraticCurveTo(cx, yb + r * 0.3, cx + gx * 0.3, yb + r * 0.17);
    // o filamento: duas hastes e a mola entre elas
    const hy = cy + r * 0.12;
    p.moveTo(cx - gx * 0.55, gy);
    p.lineTo(cx - r * 0.26, hy);
    p.moveTo(cx + gx * 0.55, gy);
    p.lineTo(cx + r * 0.26, hy);
    p.moveTo(cx - r * 0.26, hy);
    const voltas = 6;
    for (let i = 0; i < voltas; i++) {
      const xa = cx - r * 0.26 + (i + 0.5) * (r * 0.52 / voltas);
      const xb = cx - r * 0.26 + (i + 1) * (r * 0.52 / voltas);
      p.quadraticCurveTo(xa, hy - r * 0.2, xb, hy);
    }
    // o reflexo no vidro
    p.moveTo(cx - r * 0.66, cy - r * 0.18);
    p.arc(cx, cy, r * 0.7, Math.PI * 1.06, Math.PI * 1.32, false);
    return p;
  }
  // Uma palavra à mão: Permanent Marker com cada letra um pouco torta e fora da linha.
  function aMao(ctx, texto, x, y, tam, r, { alinhar = 'left', espaco = 0 } = {}) {
    ctx.font = '400 ' + tam + 'px "Permanent Marker", cursive';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const larg = [...texto].map((l) => ctx.measureText(l).width + espaco);
    const total = larg.reduce((a, b) => a + b, 0) - espaco;
    let px = alinhar === 'center' ? x - total / 2 : (alinhar === 'right' ? x - total : x);
    [...texto].forEach((l, i) => {
      ctx.save();
      ctx.translate(px + larg[i] / 2, y + (r() - 0.5) * tam * 0.07);
      ctx.rotate((r() - 0.5) * 0.12);
      ctx.fillText(l, -larg[i] / 2 + espaco / 2, 0);
      ctx.restore();
      px += larg[i];
    });
    return total;
  }
  function arteLuz(ctx) {
    const cx = L / 2 + 30;
    const cy = 620;
    const r = 240;
    const { c, ctx: k } = camada();
    const lampada = caminhoLampada(cx, cy, r);
    const g = k.createLinearGradient(0, cy - r, 0, cy + r * 2);
    g.addColorStop(0, '#e9542f');
    g.addColorStop(0.55, '#f08a35');
    g.addColorStop(1, '#f6b347');
    k.strokeStyle = g;
    k.lineCap = 'round';
    k.lineJoin = 'round';
    k.lineWidth = 9;
    k.stroke(lampada);
    // o segundo traço, deslocado e fino: o desenho à mão passa duas vezes
    k.save();
    k.translate(4, -3);
    k.lineWidth = 3;
    k.globalAlpha = 0.75;
    k.stroke(lampada);
    k.restore();
    gastar(c, { x: cx - r - 20, y: cy - r - 20, w: 2 * r + 40, h: r * 2.9 }, { pontos: 2500, manchas: 0, riscos: 40, semente: 51 });
    ctx.drawImage(c, 0, 0);

    const { c: ct, ctx: t } = camada();
    t.fillStyle = '#f2e3cb';
    const rnd = sorteio(514);
    aMao(t, 'LUZ', cx - r * 0.28, cy + r * 0.42, 190, rnd, { alinhar: 'right', espaco: -6 });
    aMao(t, 'DO', cx + r * 0.8, cy + r * 1.08, 130, rnd, { espaco: -2 });
    aMao(t, 'MUNDO', L / 2, cy + r * 2.95, 250, rnd, { alinhar: 'center', espaco: -8 });
    gastar(ct, { x: 60, y: cy - 60, w: L - 120, h: r * 3.3 }, { pontos: 6000, manchas: 0, riscos: 80, semente: 5 });
    ctx.drawImage(ct, 0, 0);
    referencia(ctx, 'Mateus 5.14', L / 2, cy + r * 3.35, 36, 'rgba(242,227,203,.72)');
  }

  // ---------- (c) Ninguém fica para trás: o globo com as ovelhas ----------
  // Contornos bem simplificados dos continentes do lado de cá do globo, em unidades do raio.
  const TERRAS = [
    [-0.8, -0.62, -0.62, -0.72, -0.4, -0.78, -0.2, -0.8, -0.06, -0.72, 0, -0.6, -0.1, -0.52, -0.02, -0.44, -0.14, -0.36,
      -0.24, -0.3, -0.27, -0.18, -0.36, -0.13, -0.3, -0.02, -0.4, -0.07, -0.5, -0.04, -0.52, 0.05, -0.43, 0.12, -0.34, 0.17,
      -0.44, 0.1, -0.58, -0.08, -0.68, -0.27, -0.76, -0.4, -0.88, -0.47],
    [-0.34, 0.19, -0.2, 0.16, -0.04, 0.24, 0.07, 0.32, 0.03, 0.44, -0.08, 0.56, -0.15, 0.7, -0.23, 0.85, -0.29, 0.8, -0.26, 0.62,
      -0.32, 0.46, -0.4, 0.33, -0.38, 0.23],
    [0.4, -0.18, 0.57, -0.22, 0.7, -0.12, 0.8, 0, 0.75, 0.16, 0.7, 0.36, 0.6, 0.52, 0.54, 0.44, 0.5, 0.24, 0.42, 0.1, 0.34, 0.02, 0.34, -0.1],
    [0.4, -0.3, 0.5, -0.42, 0.66, -0.5, 0.8, -0.44, 0.72, -0.35, 0.56, -0.3],
    [0.04, -0.88, 0.22, -0.9, 0.25, -0.8, 0.12, -0.7, 0.03, -0.78],
  ];
  function terra(ctx, pts, cx, cy, r) {
    const P = [];
    for (let i = 0; i < pts.length; i += 2) P.push([cx + pts[i] * r, cy + pts[i + 1] * r]);
    ctx.beginPath();
    const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = meio(P[P.length - 1], P[0]);
    ctx.moveTo(m0[0], m0[1]);
    P.forEach((p, i) => { const m = meio(p, P[(i + 1) % P.length]); ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]); });
    ctx.closePath();
    ctx.stroke();
  }
  function globo(ctx, cx, cy, r) {
    ctx.save();
    ctx.strokeStyle = '#2b2825';
    ctx.lineWidth = 2;
    // paralelos, com o globo um pouco inclinado
    const incl = 0.2;
    for (const lat of [-60, -40, -20, 0, 20, 40, 60]) {
      const a = lat * Math.PI / 180;
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * Math.sin(a) * Math.cos(incl), r * Math.cos(a), r * Math.cos(a) * Math.sin(incl), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // meridianos
    for (const lon of [15, 35, 55, 75]) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * Math.sin(lon * Math.PI / 180), r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#3a3531';
    ctx.lineJoin = 'round';
    for (const t of TERRAS) terra(ctx, t, cx, cy, r);
    ctx.restore();
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1d1b19';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // Uma ovelha em traço: corpo de lã em ondas, cabeça, orelha, olho e pernas. (x, y) é o
  // chão debaixo do meio do corpo; s, a escala; lado = 1 olha para a direita; tinta, a cor do traço.
  function ovelha(ctx, x, y, s, lado, papel, tinta = '#1d1b19') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * lado, s);
    ctx.lineWidth = 3.2 / s;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = tinta;
    // pernas
    for (const px of [-62, -38, 34, 56]) {
      ctx.beginPath();
      ctx.moveTo(px, -70);
      ctx.lineTo(px + (px < 0 ? -2 : 2), -4);
      ctx.lineWidth = 9;
      ctx.strokeStyle = tinta;
      ctx.stroke();
    }
    // corpo de lã: uma elipse contornada de ondinhas
    const lx = 0;
    const ly = -118;
    const rx = 108;
    const ry = 62;
    const n = 18;
    const corpo = new Path2D();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = lx + Math.cos(a) * rx;
      const py = ly + Math.sin(a) * ry;
      if (i === 0) corpo.moveTo(px, py);
      else {
        const am = ((i - 0.5) / n) * Math.PI * 2;
        corpo.quadraticCurveTo(lx + Math.cos(am) * rx * 1.16, ly + Math.sin(am) * ry * 1.24, px, py);
      }
    }
    corpo.closePath();
    ctx.fillStyle = papel;
    ctx.fill(corpo);
    ctx.lineWidth = 4;
    ctx.stroke(corpo);
    // cachinhos na lã
    ctx.lineWidth = 2.2;
    for (const [ax, ay] of [[-50, -136], [-10, -146], [30, -128], [-28, -104], [12, -96], [52, -110], [-66, -112]]) {
      ctx.beginPath();
      ctx.arc(ax, ay, 9, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();
    }
    // cabeça
    ctx.save();
    ctx.translate(112, -150);
    ctx.rotate(0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, 44, 28, 0, 0, Math.PI * 2);
    ctx.fillStyle = papel;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
    // orelha
    ctx.beginPath();
    ctx.ellipse(-30, -26, 22, 9, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // olho e focinho
    ctx.fillStyle = tinta;
    ctx.beginPath();
    ctx.arc(4, -6, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(36, 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // topete de lã sobre a cabeça
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(86, -176, 12, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fillStyle = papel;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  function capim(ctx, x0, x1, y, r) {
    ctx.save();
    ctx.strokeStyle = '#1d1b19';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (let x = x0; x < x1; x += 7 + r() * 9) {
      const h = 12 + r() * 22;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 8, y - h * 0.6, x + (r() - 0.5) * 14, y - h);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x0 - 10, y);
    ctx.lineTo(x1 + 10, y);
    ctx.stroke();
    ctx.restore();
  }
  // Texto em volta de um círculo (as anotações à mão em volta do globo), letra por letra.
  function emArco(ctx, texto, cx, cy, raio, inicio, fonte, cor, sentido = -1) {
    ctx.save();
    ctx.font = fonte;
    ctx.fillStyle = cor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    let a = inicio;
    for (const l of texto) {
      const w = ctx.measureText(l).width;
      a += sentido * (w / 2) / raio;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * raio, cy + Math.sin(a) * raio);
      ctx.rotate(a + (sentido < 0 ? -Math.PI / 2 : Math.PI / 2));
      ctx.fillText(l, 0, 0);
      ctx.restore();
      a += sentido * (w / 2) / raio;
    }
    ctx.restore();
  }
  // Texto com um contorno da cor do papel por baixo, para ler por cima das linhas do globo.
  function comHalo(ctx, txt, x, y, fonte, cor, papel, alinhar = 'left') {
    ctx.save();
    ctx.font = fonte;
    ctx.textAlign = alinhar;
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = papel;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = cor;
    ctx.fillText(txt, x, y);
    ctx.restore();
  }
  function arteNinguem(ctx) {
    const papel = '#ece7de';
    const marrom = '#8a6452';
    const preto = '#141312';
    const cx = L / 2 + 10;
    const cy = 960;
    const r = 380;
    globo(ctx, cx, cy, r);
    // as ovelhas no meio do globo, em pé num tufo de capim
    const rnd = sorteio(99);
    const chao = cy + 70;
    ovelha(ctx, cx + 10, chao, 1, 1, papel);
    ovelha(ctx, cx - 160, chao + 6, 0.6, 1, papel);
    ovelha(ctx, cx + 168, chao + 4, 0.64, 1, papel);
    capim(ctx, cx - 240, cx + 270, chao + 4, rnd);
    // "Ninguém": a palavra grande, inclinada, com o rabisco embaixo; o tamanho é o que cabe
    const fN = (t) => '600 ' + t + 'px Literata, Georgia, serif';
    ctx.font = fN(100);
    const tamN = Math.min(220, 100 * 780 / ctx.measureText('Ninguém').width);
    const bN = 470;
    ctx.save();
    ctx.translate(150, bN);
    ctx.rotate(-0.07);
    ctx.transform(1, 0, -0.3, 1, 0, 0);
    ctx.font = fN(tamN);
    ctx.fillStyle = preto;
    ctx.textAlign = 'left';
    ctx.fillText('Ninguém', 0, 0);
    ctx.lineWidth = tamN * 0.022;
    ctx.strokeStyle = preto;
    ctx.strokeText('Ninguém', 0, 0);
    const w = ctx.measureText('Ninguém').width;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-20, 46);
    ctx.bezierCurveTo(w * 0.35, 20, w * 0.75, 44, w + 30, -6);
    ctx.stroke();
    ctx.restore();
    // ecos pequenos, à mão, em marrom
    const mao = (t) => '400 ' + t + 'px "Permanent Marker", cursive';
    ctx.save();
    ctx.translate(660, bN - tamN * 0.86);
    ctx.rotate(-0.07);
    S.escrever(ctx, 'ninguém', 0, 0, mao(32), marrom);
    ctx.restore();
    ctx.save();
    ctx.translate(250, bN + 104);
    ctx.rotate(-0.07);
    S.escrever(ctx, 'ninguém', 0, 0, mao(32), marrom);
    ctx.restore();
    // "Deus não quer que ninguém se perca", por cima do globo
    ctx.save();
    ctx.translate(cx + 120, cy - 215);
    ctx.rotate(-0.13);
    comHalo(ctx, 'Deus não quer que', 0, 0, mao(44), marrom, papel, 'center');
    comHalo(ctx, 'ninguém se perca!', 10, 54, mao(44), marrom, papel, 'center');
    ctx.restore();
    // "Deixou as 99 por 1!" descendo pela esquerda do globo
    emArco(ctx, 'Deixou as 99 por 1!', cx, cy, r + 50, Math.PI * 1.16, mao(44), marrom, -1);
    // "fica para TRÁS" embaixo, com a referência em cima de TRÁS
    const base = 1478;
    const dir = L - 96;
    ctx.save();
    ctx.translate(dir, base);
    ctx.scale(0.86, 1);
    ctx.font = '600 270px Literata, Georgia, serif';
    ctx.textAlign = 'right';
    ctx.lineJoin = 'round';
    // um halo de papel por baixo, e o TRÁS engrossado com o próprio contorno
    ctx.lineWidth = 34;
    ctx.strokeStyle = papel;
    ctx.strokeText('TRÁS', 0, 0);
    ctx.fillStyle = preto;
    ctx.lineWidth = 14;
    ctx.strokeStyle = preto;
    ctx.strokeText('TRÁS', 0, 0);
    ctx.fillText('TRÁS', 0, 0);
    const wTras = ctx.measureText('TRÁS').width * 0.86 + 8;
    ctx.restore();
    const xTras = dir - wTras;
    const fP = '600 88px Literata, Georgia, serif';
    comHalo(ctx, 'fica', xTras - 20, base - 92, fP, preto, papel, 'right');
    comHalo(ctx, 'para', xTras - 20, base - 4, fP, preto, papel, 'right');
    comHalo(ctx, 'Mateus 18.11-14', xTras + 10, base - 300, '500 40px Literata, Georgia, serif', preto, papel);
  }

  // ---------- (d) Eu ainda estou nas mãos do Oleiro: só tipografia ----------
  // Letras à mão grandes em creme sobre o preto, o "OLEIRO" em laranja de barro.
  function arteOleiro(ctx) {
    const creme = '#efe4cf';
    const barro = '#e0743a';
    const { c, ctx: t } = camada();
    const rnd = sorteio(186);
    const fonte = (x) => '400 ' + x + 'px "Permanent Marker", cursive';
    const cabe = (texto, largura, max) => { t.font = fonte(100); return Math.min(max, 100 * largura / t.measureText(texto).width); };
    S.escrever(t, 'EU AINDA ESTOU', L / 2, 700, '800 50px Manrope, sans-serif', creme, { espaco: 50 * 0.14 });
    const t1 = cabe('NAS MÃOS', 900, 250);
    t.fillStyle = creme;
    aMao(t, 'NAS MÃOS', L / 2, 700 + 40 + t1 * 0.9, t1, rnd, { alinhar: 'center', espaco: -2 });
    const t2 = cabe('DO OLEIRO', 940, 250);
    const y2 = 700 + 40 + t1 * 0.9 + t2 * 1.08;
    t.font = fonte(t2);
    const wDo = t.measureText('DO ').width;
    const wTudo = t.measureText('DO OLEIRO').width;
    const x0 = L / 2 - wTudo / 2;
    aMao(t, 'DO', x0, y2, t2, rnd);
    t.fillStyle = barro;
    aMao(t, 'OLEIRO', x0 + wDo, y2, t2, rnd);
    // um traço de barro sob o OLEIRO, como uma volta do torno
    t.strokeStyle = barro;
    t.lineCap = 'round';
    t.lineWidth = 10;
    t.beginPath();
    t.moveTo(x0 + wDo, y2 + 40);
    t.bezierCurveTo(x0 + wDo + (wTudo - wDo) * 0.3, y2 + 62, x0 + wTudo * 0.85, y2 + 30, x0 + wTudo + 10, y2 + 46);
    t.stroke();
    gastar(c, { x: 60, y: 640, w: L - 120, h: y2 - 560 }, { pontos: 7000, manchas: 0, riscos: 80, semente: 18 });
    ctx.drawImage(c, 0, 0);
    referencia(ctx, 'Jeremias 18.6', L / 2, y2 + 150, 34, 'rgba(224,116,58,.9)');
  }

  // ---------- (e) Deus vai atrás de cada um: o cartaz de procurado ----------
  // Ilustração própria (só a ideia veio de uma arte): o cartaz com a ovelha 100, a perdida da
  // parábola, de frente, segurando a placa, num quadro de hachuras.
  function laCacheada(cx, cy, rx, ry, n, amp) {
    const p = new Path2D();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      if (i === 0) p.moveTo(x, y);
      else {
        const am = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2;
        p.quadraticCurveTo(cx + Math.cos(am) * rx * amp, cy + Math.sin(am) * ry * amp, x, y);
      }
    }
    p.closePath();
    return p;
  }
  function arteProcurado(ctx) {
    const papel = '#efe7d8';
    const tinta = '#171512';
    // PROCURADO, em letra de cartaz, gasta
    const { c, ctx: k } = camada();
    k.save();
    k.translate(L / 2, 470);
    k.scale(0.78, 1);
    S.escrever(k, 'PROCURADO', 0, 0, '700 230px Oswald, sans-serif', tinta, { espaco: 4 });
    k.restore();
    gastar(c, { x: 60, y: 260, w: L - 120, h: 240 }, { pontos: 3500, manchas: 0, riscos: 50, semente: 100 });
    ctx.drawImage(c, 0, 0);
    // o quadro com hachuras
    const qx = 130;
    const qy = 520;
    const qw = L - 260;
    const qh = 700;
    ctx.save();
    ctx.beginPath();
    ctx.rect(qx, qy, qw, qh);
    ctx.clip();
    ctx.strokeStyle = 'rgba(23,21,18,.55)';
    ctx.lineWidth = 2;
    for (let x = qx - qh; x < qx + qw; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, qy + qh);
      ctx.lineTo(x + qh * 0.75, qy);
      ctx.stroke();
    }
    // as marcas de altura da foto de ficha, do lado direito
    ctx.strokeStyle = tinta;
    ctx.lineWidth = 3;
    for (let y = qy + 70; y < qy + qh; y += 70) {
      ctx.beginPath();
      ctx.moveTo(qx + qw - 50, y);
      ctx.lineTo(qx + qw, y);
      ctx.stroke();
    }
    // a ovelha: corpo de lã embaixo, cabeça de lã, rosto comprido, orelhas
    const ox = L / 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = tinta;
    const corpo = laCacheada(ox, qy + qh + 60, 300, 330, 22, 1.08);
    ctx.fillStyle = papel;
    ctx.fill(corpo);
    ctx.lineWidth = 5;
    ctx.stroke(corpo);
    const cabeca = laCacheada(ox, qy + 250, 170, 150, 16, 1.12);
    // orelhas, de lado
    for (const l of [-1, 1]) {
      ctx.save();
      ctx.translate(ox + l * 175, qy + 300);
      ctx.rotate(l * 0.25);
      ctx.beginPath();
      ctx.ellipse(0, 0, 70, 26, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#e4d8c3';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(l * 10, 2, 40, 10, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.lineWidth = 5;
    ctx.fillStyle = papel;
    ctx.fill(cabeca);
    ctx.stroke(cabeca);
    // o rosto
    const rosto = new Path2D();
    rosto.moveTo(ox - 86, qy + 250);
    rosto.bezierCurveTo(ox - 90, qy + 360, ox - 64, qy + 450, ox, qy + 455);
    rosto.bezierCurveTo(ox + 64, qy + 450, ox + 90, qy + 360, ox + 86, qy + 250);
    rosto.bezierCurveTo(ox + 70, qy + 215, ox - 70, qy + 215, ox - 86, qy + 250);
    ctx.fillStyle = '#f6f0e4';
    ctx.fill(rosto);
    ctx.stroke(rosto);
    // olhos arregalados (perdida e achada), focinho e boca
    for (const l of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(ox + l * 40, qy + 300, 21, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ox + l * 38, qy + 303, 8, 0, Math.PI * 2);
      ctx.fillStyle = tinta;
      ctx.fill();
    }
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ox - 16, qy + 398);
    ctx.quadraticCurveTo(ox, qy + 410, ox + 16, qy + 398);
    ctx.moveTo(ox, qy + 406);
    ctx.lineTo(ox, qy + 420);
    ctx.moveTo(ox - 18, qy + 430);
    ctx.quadraticCurveTo(ox, qy + 440, ox + 18, qy + 430);
    ctx.stroke();
    // a placa com o 100, segura pelas patas
    const pw = 400;
    const ph = 170;
    const px = ox - pw / 2;
    const py = qy + 490;
    ctx.fillStyle = tinta;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 10); else ctx.rect(px, py, pw, ph);
    ctx.fill();
    ctx.save();
    ctx.translate(ox, py + ph - 26);
    ctx.scale(0.9, 1);
    S.escrever(ctx, '100', 0, 0, '700 150px Oswald, sans-serif', papel, { espaco: 6 });
    ctx.restore();
    for (const l of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(ox + l * (pw / 2 + 6), py + ph * 0.55, 34, 44, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f6f0e4';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox + l * (pw / 2 - 20), py + ph * 0.55);
      ctx.lineTo(ox + l * (pw / 2 + 30), py + ph * 0.55);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 10;
    ctx.strokeStyle = tinta;
    ctx.strokeRect(qx, qy, qw, qh);
    // a frase e a recompensa
    referencia(ctx, 'Lucas 15.4-7', L / 2, 1300, 34, '#7a5a46');
  }

  // ---------- (f) Jesus é suficiente: a bandeira erguida sobre a multidão ----------
  // Versão ilustrada a partir da ideia de uma foto (a foto não entra): a bandeira preta
  // tremulando com o texto em pincel, quem a segura em silhueta e as mãos levantadas embaixo.
  function maoLevantada(ctx, x, y, s, ang, cor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(s, s);
    ctx.fillStyle = cor;
    const caps = (cx, cy, w, h, a) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-w / 2, -h, w, h, w / 2); else ctx.rect(-w / 2, -h, w, h);
      ctx.fill();
      ctx.restore();
    };
    caps(0, 330, 50, 340, 0); // o antebraço
    ctx.beginPath();
    ctx.ellipse(0, -40, 36, 46, 0, 0, Math.PI * 2);
    ctx.fill(); // a palma
    [[-24, -0.34, 78], [-9, -0.11, 94], [7, 0.1, 90], [22, 0.32, 74]].forEach(([dx, a, h]) => caps(dx, -66, 17, h, a));
    caps(-30, -26, 18, 62, -1.05); // o polegar
    ctx.restore();
  }
  // Uma fileira da multidão: cabeças, ombros e algumas mãos para o alto.
  function fileira(ctx, y, s, cor, n, r) {
    ctx.fillStyle = cor;
    for (let i = 0; i < n; i++) {
      const x = (i + 0.25 + r() * 0.5) * (L / n);
      const yy = y + (r() - 0.5) * 30 * s;
      if (r() < 0.6) {
        const lado = r() < 0.5 ? -1 : 1;
        maoLevantada(ctx, x + lado * 52 * s, yy + 30 * s, s * 0.85, lado * (0.08 + r() * 0.22), cor);
      }
      ctx.beginPath();
      ctx.arc(x, yy, 38 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, yy + 110 * s, 82 * s, 70 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(0, y + 110 * s, L, A);
  }
  function arteSuficiente(ctx) {
    const branco = '#f4f1ea';
    // o feixe de luz de cima e a névoa do palco
    ctx.save();
    const feixe = ctx.createLinearGradient(980, 200, 420, 1500);
    feixe.addColorStop(0, 'rgba(220,226,236,.16)');
    feixe.addColorStop(1, 'rgba(220,226,236,0)');
    ctx.fillStyle = feixe;
    ctx.beginPath();
    ctx.moveTo(820, 0);
    ctx.lineTo(1080, 0);
    ctx.lineTo(1080, 420);
    ctx.lineTo(420, 1600);
    ctx.lineTo(200, 1600);
    ctx.closePath();
    ctx.fill();
    const nevoa = ctx.createRadialGradient(560, 1260, 0, 560, 1260, 600);
    nevoa.addColorStop(0, 'rgba(120,128,140,.45)');
    nevoa.addColorStop(1, 'rgba(120,128,140,0)');
    ctx.fillStyle = nevoa;
    ctx.fillRect(0, 600, L, 1320);
    ctx.restore();
    // o mastro, inclinado, das mãos de quem segura até o alto
    const xMastro = (y) => 170 + (y - 560) * 0.16;
    const mastro = (de, ate) => {
      ctx.save();
      ctx.strokeStyle = '#2e3035';
      ctx.lineCap = 'round';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(xMastro(de), de);
      ctx.lineTo(xMastro(ate), ate);
      ctx.stroke();
      ctx.restore();
    };
    mastro(548, 1700);
    // a bandeira: a beira esquerda presa ao mastro, o pano ondulando para a direita
    const topo = 570;
    const alto = 450;
    const direita = 1010;
    const onda = (t) => 34 * Math.sin(t * Math.PI * 2.3 - 0.4) * t;
    const ponto = (t, v) => {
      const y0 = topo + v * alto;
      const xl = xMastro(y0) + 8;
      return [xl + t * (direita - xl), y0 + 24 * t + onda(t) - 12 * t * v];
    };
    const pano = new Path2D();
    const N = 40;
    for (let i = 0; i <= N; i++) { const [x, y] = ponto(i / N, 0); if (i) pano.lineTo(x, y); else pano.moveTo(x, y); }
    for (let i = 0; i <= N; i++) { const [x, y] = ponto(1, i / N); pano.lineTo(x + Math.sin(i / N * Math.PI * 2) * 6, y); }
    for (let i = N; i >= 0; i--) { const [x, y] = ponto(i / N, 1); pano.lineTo(x, y); }
    pano.closePath();
    ctx.fillStyle = '#111214';
    ctx.fill(pano);
    // as dobras: faixas de luz e sombra que acompanham a onda
    ctx.save();
    ctx.clip(pano);
    const dobras = ctx.createLinearGradient(180, 0, direita, 0);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const k = Math.cos(t * Math.PI * 2.3 - 0.4);
      dobras.addColorStop(t, k > 0 ? 'rgba(255,255,255,' + (0.08 * k * t).toFixed(3) + ')' : 'rgba(0,0,0,' + (-0.35 * k * t).toFixed(3) + ')');
    }
    ctx.fillStyle = dobras;
    ctx.fillRect(0, 0, L, A);
    ctx.restore();
    // o texto em pincel, cada letra acompanhando a onda do pano
    const { c, ctx: k } = camada();
    k.fillStyle = branco;
    const rnd = sorteio(2);
    const linhaNoPano = (texto, v, tam) => {
      k.font = '400 ' + tam + 'px "Permanent Marker", cursive';
      const larg = [...texto].map((l) => k.measureText(l).width);
      const total = larg.reduce((a, b) => a + b, 0);
      const [xa] = ponto(0, v);
      let x = xa + (direita - xa) / 2 + 6 - total / 2;
      [...texto].forEach((l, i) => {
        const cxL = x + larg[i] / 2;
        const t = (cxL - xa) / (direita - xa);
        const [, y] = ponto(t, v);
        k.save();
        k.translate(cxL, y + tam * 0.36);
        k.rotate(Math.atan2(onda(t + 0.01) - onda(t), 0.01 * (direita - xa)) * 0.8 + (rnd() - 0.5) * 0.08);
        k.textAlign = 'center';
        k.fillText(l, 0, 0);
        k.restore();
        x += larg[i];
      });
    };
    linhaNoPano('JESUS', 0.2, 136);
    linhaNoPano('É', 0.49, 96);
    linhaNoPano('SUFICIENTE', 0.77, 106);
    gastar(c, { x: 160, y: 560, w: 900, h: 500 }, { pontos: 4500, manchas: 0, riscos: 60, semente: 7 });
    ctx.drawImage(c, 0, 0);
    // a multidão de trás, na névoa
    const r = sorteio(77);
    fileira(ctx, 1330, 0.62, '#272a30', 12, r);
    // quem segura: silhueta contra a névoa, os dois braços no mastro
    const sombra = '#060607';
    ctx.fillStyle = sombra;
    ctx.strokeStyle = sombra;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.save();
    ctx.translate(-110, 0);
    ctx.beginPath();
    ctx.arc(540, 1176, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(514, 1220);
    ctx.lineTo(566, 1220);
    ctx.lineTo(572, 1252);
    ctx.bezierCurveTo(640, 1262, 676, 1290, 684, 1350);
    ctx.lineTo(694, 1800);
    ctx.lineTo(392, 1800);
    ctx.lineTo(400, 1350);
    ctx.bezierCurveTo(410, 1290, 446, 1262, 508, 1252);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // os braços: ombro, cotovelo e a mão fechada no mastro
    ctx.lineWidth = 38;
    ctx.beginPath();
    ctx.moveTo(340, 1290);
    ctx.lineTo(300, 1180);
    ctx.lineTo(xMastro(1100) + 4, 1100);
    ctx.moveTo(530, 1300);
    ctx.lineTo(440, 1390);
    ctx.lineTo(xMastro(1370) + 4, 1370);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(xMastro(1100) + 2, 1100, 24, 0, Math.PI * 2);
    ctx.arc(xMastro(1370) + 2, 1370, 24, 0, Math.PI * 2);
    ctx.fill();
    // a multidão da frente
    fileira(ctx, 1440, 0.8, '#16171b', 9, r);
    fileira(ctx, 1560, 1, '#08090a', 7, r);
  }

  // ---------- (g) Coloquem em prática a palavra: o livro aberto sobre a sálvia ----------
  // O texto é um trecho seguido de Tiago 1.22 na NBV, palavra por palavra.
  function ondulado(ctx, texto, cx, base, largura, amp, cor) {
    const tam = 100;
    ctx.font = '800 ' + tam + 'px Manrope, sans-serif';
    const esp = tam * 0.02;
    const larg = [...texto].map((l) => ctx.measureText(l).width + esp);
    const total = larg.reduce((a, b) => a + b, 0) - esp;
    const s = largura / total;
    let x = cx - largura / 2;
    ctx.fillStyle = cor;
    ctx.strokeStyle = cor;
    ctx.lineJoin = 'round';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    [...texto].forEach((l, i) => {
      const w = larg[i] * s;
      const fase = i * 0.9;
      ctx.save();
      ctx.translate(x + w / 2, base + Math.sin(fase) * amp);
      ctx.rotate(Math.cos(fase) * 0.06);
      ctx.scale(s, s * 1.12);
      ctx.lineWidth = 7;
      ctx.strokeText(l, 0, 0);
      ctx.fillText(l, 0, 0);
      ctx.restore();
      x += w;
    });
  }
  function livroAberto(ctx, cx, cy, w, cor) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.06);
    ctx.strokeStyle = cor;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    const m = w / 2;
    for (const l of [-1, 1]) {
      // a capa por baixo e a página por cima
      ctx.beginPath();
      ctx.moveTo(0, 120);
      ctx.bezierCurveTo(l * m * 0.3, 92, l * m * 0.7, 98, l * (m + 16), 112);
      ctx.lineTo(l * (m + 16), -88);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -100);
      ctx.bezierCurveTo(l * m * 0.3, -132, l * m * 0.7, -126, l * m, -110);
      ctx.lineTo(l * m, 96);
      ctx.bezierCurveTo(l * m * 0.7, 82, l * m * 0.3, 78, 0, 108);
      ctx.stroke();
      // as linhas do texto
      ctx.lineWidth = 3.5;
      for (let i = 0; i < 6; i++) {
        const y = -70 + i * 28;
        const x0 = l * m * 0.14;
        const x1 = l * m * (i === 5 ? 0.55 : 0.84);
        ctx.beginPath();
        ctx.moveTo(x0, y + (i === 0 ? 0 : 0));
        ctx.quadraticCurveTo((x0 + x1) / 2, y - 8, x1, y - 2);
        ctx.stroke();
      }
      ctx.lineWidth = 6;
    }
    ctx.beginPath();
    ctx.moveTo(0, -100);
    ctx.lineTo(0, 120);
    ctx.stroke();
    // a fita marcadora
    ctx.beginPath();
    ctx.moveTo(20, 104);
    ctx.lineTo(30, 190);
    ctx.lineTo(44, 172);
    ctx.lineTo(58, 186);
    ctx.lineTo(50, 100);
    ctx.stroke();
    ctx.restore();
  }
  function artePraticantes(ctx) {
    const creme = '#efe7cf';
    const { c, ctx: k } = camada();
    S.escrever(k, 'COLOQUEM EM', L / 2, 410, '800 46px Manrope, sans-serif', creme, { espaco: 46 * 0.2 });
    ondulado(k, 'PRÁTICA', L / 2, 626, 860, 12, creme);
    S.escrever(k, 'A PALAVRA,', L / 2, 714, '800 46px Manrope, sans-serif', creme, { espaco: 46 * 0.2 });
    livroAberto(k, L / 2 - 30, 905, 460, creme);
    k.save();
    k.translate(912, 905);
    k.rotate(-Math.PI / 2);
    referencia(k, 'Tiago 1.22', 0, 0, 34, creme);
    k.restore();
    S.escrever(k, 'E NÃO SEJAM APENAS', L / 2, 1196, '800 54px Manrope, sans-serif', creme, { espaco: 54 * 0.12 });
    ondulado(k, 'OUVINTES.', L / 2, 1400, 900, 12, creme);
    gastar(c, { x: 60, y: 260, w: L - 120, h: 1200 }, { pontos: 6000, manchas: 0, riscos: 80, semente: 122 });
    ctx.drawImage(c, 0, 0);
  }

  // ---------- (h) Eis que estou à porta e bato: a porta entreaberta com luz ----------
  // Arte própria: uma porta de tábuas em traço, entreaberta, a luz quente saindo pela fresta
  // e se espalhando no chão; as batidas em arquinhos ao lado. O trecho do versículo embaixo
  // é Apocalipse 3.20 na NBV, palavra por palavra.
  function artePorta(ctx) {
    const tinta = '#2b2118';
    const serif = (peso, t) => peso + ' ' + t + 'px Literata, Georgia, serif';
    // o título
    const { c, ctx: t } = camada();
    S.escrever(t, 'Eis que estou', L / 2, 690, serif(500, 66), tinta);
    t.font = serif(600, 100);
    const tam = Math.min(140, 100 * 880 / t.measureText('À PORTA E BATO').width);
    t.save();
    t.font = serif(600, tam);
    t.textAlign = 'center';
    t.lineJoin = 'round';
    t.lineWidth = tam * 0.05;
    t.strokeStyle = tinta;
    t.fillStyle = tinta;
    t.strokeText('À PORTA E BATO', L / 2, 690 + tam * 1.05);
    t.fillText('À PORTA E BATO', L / 2, 690 + tam * 1.05);
    t.restore();
    gastar(t.canvas, { x: 80, y: 600, w: L - 160, h: tam * 1.4 + 100 }, { pontos: 2600, manchas: 0, riscos: 40, semente: 320 });
    ctx.drawImage(c, 0, 0);
    // a porta: batente com arco, a folha entreaberta e a fresta de luz
    const px = L / 2 - 170;
    const py = 900;
    const pw = 340;
    const ph = 400;
    const chao = py + ph;
    // a luz que sai pela fresta e se abre no chão
    ctx.save();
    const luz = ctx.createLinearGradient(px + pw, chao, px + pw + 260, chao + 120);
    luz.addColorStop(0, 'rgba(246,179,71,.75)');
    luz.addColorStop(1, 'rgba(246,179,71,0)');
    ctx.fillStyle = luz;
    ctx.beginPath();
    ctx.moveTo(px + pw - 40, chao);
    ctx.lineTo(px + pw, chao);
    ctx.lineTo(px + pw + 300, chao + 110);
    ctx.lineTo(px + pw - 10, chao + 120);
    ctx.closePath();
    ctx.fill();
    const brilho = ctx.createRadialGradient(px + pw - 20, py + ph * 0.55, 0, px + pw - 20, py + ph * 0.55, 260);
    brilho.addColorStop(0, 'rgba(246,179,71,.45)');
    brilho.addColorStop(1, 'rgba(246,179,71,0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(px - 100, py - 120, pw + 400, ph + 200);
    ctx.restore();
    const arco = new Path2D();
    arco.moveTo(px, chao);
    arco.lineTo(px, py + pw / 2);
    arco.arc(px + pw / 2, py + pw / 2, pw / 2, Math.PI, 0);
    arco.lineTo(px + pw, chao);
    // a fresta: o vão aceso do lado da maçaneta
    ctx.save();
    ctx.clip(arco);
    ctx.fillStyle = '#f6c060';
    ctx.fillRect(px + pw - 44, py, 44, ph);
    // a folha da porta, um pouco virada para dentro
    const folha = new Path2D();
    folha.moveTo(px, chao);
    folha.lineTo(px, py);
    folha.lineTo(px + pw - 40, py);
    folha.lineTo(px + pw - 40, chao);
    folha.closePath();
    ctx.fillStyle = '#d9c7a6';
    ctx.fill(folha);
    ctx.strokeStyle = tinta;
    ctx.lineWidth = 3;
    for (let x = px + 50; x < px + pw - 40; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x, chao);
      ctx.stroke();
    }
    // os veios da madeira
    const r = sorteio(320);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 26; i++) {
      const x = px + 8 + r() * (pw - 56);
      const y = py + 40 + r() * (ph - 80);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 4, y + 20, x, y + 34 + r() * 30);
      ctx.stroke();
    }
    ctx.lineWidth = 5;
    ctx.stroke(folha);
    ctx.restore();
    // travessas, dobradiças e a maçaneta
    ctx.strokeStyle = tinta;
    ctx.fillStyle = tinta;
    ctx.lineWidth = 5;
    for (const y of [py + 110, chao - 90]) {
      ctx.beginPath();
      ctx.moveTo(px + 4, y);
      ctx.lineTo(px + pw - 44, y);
      ctx.stroke();
      ctx.fillRect(px - 8, y - 12, 40, 24);
    }
    ctx.beginPath();
    ctx.arc(px + pw - 70, py + ph * 0.56, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.stroke(arco);
    // o batente e a soleira
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(px - 40, chao + 8);
    ctx.lineTo(px + pw + 40, chao + 8);
    ctx.stroke();
    // as batidas: arquinhos ao lado da porta
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const [k, y] of [[1, py + 150], [0.75, py + 210]]) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(px - 30, y, (24 + i * 22) * k, Math.PI * 0.82, Math.PI * 1.18);
        ctx.stroke();
      }
    }
    // o trecho do versículo e a referência
    const trecho = 'Se alguém ouvir a minha voz e abrir a porta, eu entrarei e farei companhia a ele, e ele a mim.';
    const tx = S.textoEquilibrado(ctx, trecho, { fonte: (x) => serif(500, x), larguraMax: 820, alturaMax: 150, fonteMax: 40, fonteMin: 30, entreLinhas: 1.32 });
    let y = chao + 90;
    for (const l of tx.linhas) { y += tx.tamanho * 1.32; S.escrever(ctx, l, L / 2, y, serif(500, tx.tamanho), tinta); }
    y += 62;
    ctx.font = '700 32px Oswald, sans-serif';
    const wRef = ctx.measureText('APOCALIPSE 3.20').width + 32 * 0.16 * 14 + 48;
    ctx.lineWidth = 3;
    ctx.strokeStyle = tinta;
    ctx.strokeRect(L / 2 - wRef / 2, y - 44, wRef, 62);
    referencia(ctx, 'Apocalipse 3.20', L / 2, y, 32, tinta);
  }

  // ---------- (i) Até que a mesa esteja cheia: 99 não é 100 ----------
  // A ovelha em traço verde na frente de um 99 vazado: falta uma para a conta fechar.
  function arteMesa(ctx) {
    const verde = '#8fd14f';
    const creme = '#f1eee6';
    const oswald = (t) => '700 ' + t + 'px Oswald, sans-serif';
    S.escrever(ctx, 'ATÉ QUE A MESA', L / 2, 650, oswald(76), creme, { espaco: 76 * 0.08 });
    ctx.font = oswald(96);
    const wEst = ctx.measureText('ESTEJA ').width;
    const wTudo = ctx.measureText('ESTEJA CHEIA').width;
    S.escrever(ctx, 'ESTEJA', L / 2 - wTudo / 2, 760, oswald(96), creme, { alinhar: 'left' });
    S.escrever(ctx, 'CHEIA', L / 2 - wTudo / 2 + wEst, 760, oswald(96), verde, { alinhar: 'left' });
    // o 99 grande, só o contorno
    ctx.save();
    ctx.font = '800 470px Manrope, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(241,238,230,.85)';
    ctx.strokeText('99', L / 2, 1180);
    ctx.restore();
    // a ovelha na frente, em traço verde
    ovelha(ctx, L / 2 - 10, 1250, 1.45, 1, '#0e0f0d', verde);
    capim(ctx, L / 2 - 250, L / 2 + 250, 1254, sorteio(100));
    ctx.font = oswald(130);
    const wNao = ctx.measureText('NÃO É ').width;
    const wLinha = ctx.measureText('NÃO É 100').width;
    S.escrever(ctx, 'NÃO É', L / 2 - wLinha / 2, 1420, oswald(130), creme, { alinhar: 'left' });
    S.escrever(ctx, '100', L / 2 - wLinha / 2 + wNao, 1420, oswald(130), verde, { alinhar: 'left' });
    referencia(ctx, 'Lucas 15.4-7', L / 2, 1490, 30, 'rgba(241,238,230,.7)');
  }

  // ---------- (j) Sou quem Deus diz que eu sou: o texto em arcos de digital ----------
  // As linhas do texto correm sobre arcos, como as cristas de uma impressão digital (quem
  // a pessoa é); embaixo, o carimbo do app: "Somos Geração Eleita" (1 Pedro 2.9-10).
  function arteQuemDeusDiz(ctx) {
    const claro = '#ebe8e1';
    const cx = L / 2;
    const cy = 1720;
    // as cristas da digital, atrás do texto
    const r = sorteio(29);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 560, L, 680);
    ctx.clip();
    ctx.lineCap = 'round';
    for (let raio = 560; raio < 1260; raio += 22) {
      ctx.strokeStyle = 'rgba(235,232,225,' + (0.07 + r() * 0.07).toFixed(3) + ')';
      ctx.lineWidth = 2.5 + r() * 2;
      let a = -Math.PI / 2 - 0.62 + r() * 0.1;
      while (a < -Math.PI / 2 + 0.62) {
        const comp = 0.08 + r() * 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, raio, a, Math.min(a + comp, -Math.PI / 2 + 0.62));
        ctx.stroke();
        a += comp + 0.015 + r() * 0.03;
      }
    }
    ctx.restore();
    // o texto, linha a linha, sobre arcos cada vez menores
    const linhas = [
      ['EU NÃO SOU O QUE', 1080, 84],
      ['DIZEM SOBRE MIM,', 960, 84],
      ['SOU QUEM DEUS', 840, 96],
      ['DIZ QUE EU SOU.', 720, 84],
    ];
    const oswald = (t) => '700 ' + t + 'px Oswald, sans-serif';
    for (const [texto, raio, tam] of linhas) {
      ctx.font = oswald(tam);
      ctx.save();
      try { ctx.letterSpacing = (tam * 0.04) + 'px'; } catch (e) { /* idem */ }
      const larg = ctx.measureText(texto).width;
      ctx.restore();
      // halo escuro por baixo, para as cristas não atravessarem as letras
      for (const [cor, borda] of [['#141414', true], [claro, false]]) {
        ctx.save();
        ctx.font = oswald(tam);
        let a = -Math.PI / 2 - (larg / raio) / 2;
        const deus = texto.indexOf('DEUS');
        [...texto].forEach((l, i) => {
          const w = ctx.measureText(l).width + tam * 0.04;
          a += (w / 2) / raio;
          ctx.save();
          ctx.translate(cx + Math.cos(a) * raio, cy + Math.sin(a) * raio);
          ctx.rotate(a + Math.PI / 2);
          ctx.textAlign = 'center';
          if (borda) { ctx.lineWidth = 14; ctx.lineJoin = 'round'; ctx.strokeStyle = cor; ctx.strokeText(l, 0, 0); } else {
            // DEUS em branco puro; o resto um pouco mais apagado
            ctx.fillStyle = deus >= 0 && i >= deus && i < deus + 4 ? '#ffffff' : '#c9c5bc';
            ctx.fillText(l, 0, 0);
          }
          ctx.restore();
          a += (w / 2) / raio;
        });
        ctx.restore();
      }
    }
    // o carimbo do app e a referência
    const sl = ['Somos', 'Geração Eleita'];
    const tam = S.tamanhoDoCarimbo(ctx, sl, 720, 170, 56);
    S.carimbo(ctx, sl, L / 2, 1215, tam, { chapa: '#eef0ea', letra: '#141414' });
    referencia(ctx, '1 Pedro 2.9-10', L / 2, 1486, 30, 'rgba(235,232,225,.72)');
  }

  // ---------- (k) Quem já foi comprado não se vende: o código de barras com as cruzes ----------
  // As três barras mais altas do código terminam em cruz (o Calvário); o código é o preço
  // pago. Embaixo, o começo de 1 Coríntios 6.20 na NBV, palavra por palavra.
  function arteComprado(ctx) {
    const tinta = '#141414';
    const r = sorteio(620);
    const x0 = 230;
    const x1 = 850;
    const topo = 760;
    const pe = 960;
    ctx.fillStyle = tinta;
    const altas = new Map([[0.62, 150], [0.72, 210], [0.82, 150]]);
    for (let x = x0; x < x1;) {
      const w = [4, 6, 9, 14][Math.floor(r() * 4)];
      const t = (x - x0) / (x1 - x0);
      let alta = 0;
      for (const [k, h] of altas) if (Math.abs(t - k) < 0.012) alta = h;
      if (alta) {
        // a barra que sobe e vira cruz
        const xc = x0 + [...altas.keys()].find((k) => Math.abs(t - k) < 0.012) * (x1 - x0);
        ctx.fillRect(xc - 6, topo - alta, 12, pe - topo + alta);
        ctx.fillRect(xc - 32, topo - alta + 38, 64, 12);
        x = xc + 14;
        continue;
      }
      ctx.fillRect(x, topo, w, pe - topo);
      x += w + [4, 6, 9][Math.floor(r() * 3)];
    }
    S.escrever(ctx, '1 CORÍNTIOS 6.20', L / 2, pe + 52, '600 34px Manrope, sans-serif', tinta, { espaco: 34 * 0.5 });
    const mn = (t) => S.Mn(800, t);
    S.escrever(ctx, 'Quem já foi', L / 2, 1150, mn(92), tinta, { espaco: -2 });
    ctx.font = mn(100);
    const tamC = Math.min(210, 100 * 880 / ctx.measureText('comprado').width);
    S.escrever(ctx, 'comprado', L / 2, 1150 + tamC * 0.9, mn(tamC), tinta, { espaco: -4 });
    S.escrever(ctx, 'não se vende.', L / 2, 1150 + tamC * 0.9 + 110, mn(92), tinta, { espaco: -2 });
    S.escrever(ctx, 'Porque Deus comprou vocês por preço elevado.', L / 2, 1150 + tamC * 0.9 + 190, '500 36px Literata, Georgia, serif', '#55524c');
  }

  // ---------- (l) Jesus não nos chamou para um momento: a poltrona vazia ----------
  // O título em letra condensada vermelha, a poltrona vazia num morro escuro e a resposta em
  // etiquetas pretas: "mas para uma vida inteira Nele".
  function arteMomento(ctx) {
    const vermelho = '#c3301c';
    const escuro = '#2a2521';
    const oswald = (t) => '700 ' + t + 'px Oswald, sans-serif';
    let y = 590;
    for (const linha of ['JESUS NÃO NOS', 'CHAMOU PARA', 'UM MOMENTO']) {
      ctx.font = oswald(100);
      const tam = Math.min(190, 100 * 880 / ctx.measureText(linha).width);
      y += tam * 0.86;
      S.escrever(ctx, linha, L / 2, y, oswald(tam), vermelho);
      y += 14;
    }
    // o morro e a poltrona vazia, com a mesinha ao lado
    const chao = y + 290;
    ctx.fillStyle = escuro;
    ctx.beginPath();
    ctx.moveTo(60, chao + 60);
    ctx.bezierCurveTo(260, chao - 10, 820, chao - 10, 1020, chao + 60);
    ctx.lineTo(1020, chao + 76);
    ctx.lineTo(60, chao + 76);
    ctx.closePath();
    ctx.fill();
    const px = L / 2 - 60;
    const pb = chao + 4;
    ctx.save();
    ctx.translate(px, pb);
    ctx.scale(0.82, 0.82);
    ctx.translate(-px, -pb);
    const caixa = (x, yy, w, h, raio) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, yy, w, h, raio); else ctx.rect(x, yy, w, h); ctx.fill(); };
    caixa(px - 105, pb - 300, 210, 190, 46); // encosto
    caixa(px - 130, pb - 140, 260, 64, 18); // assento
    caixa(px - 168, pb - 196, 58, 140, 26); // braços
    caixa(px + 110, pb - 196, 58, 140, 26);
    caixa(px - 150, pb - 84, 300, 30, 10); // base
    caixa(px - 140, pb - 60, 16, 60, 6); // pés
    caixa(px + 124, pb - 60, 16, 60, 6);
    const mx = px + 280;
    caixa(mx - 62, pb - 140, 124, 16, 6); // a mesinha
    caixa(mx - 7, pb - 130, 14, 130, 4);
    caixa(mx - 40, pb - 10, 80, 12, 6);
    caixa(mx - 20, pb - 186, 40, 46, 8); // um copo em cima
    ctx.restore();
    // as etiquetas pretas, levemente tortas
    let ye = chao + 140;
    [['mas para', -0.02], ['uma vida', 0.015], ['inteira Nele', -0.012]].forEach(([t, ang]) => {
      ctx.font = S.Mn(800, 56);
      const w = ctx.measureText(t).width + 56;
      ctx.save();
      ctx.translate(L / 2, ye);
      ctx.rotate(ang);
      ctx.fillStyle = '#141210';
      ctx.fillRect(-w / 2, -50, w, 72);
      S.escrever(ctx, t, 0, 4, S.Mn(800, 56), '#f5efe3');
      ctx.restore();
      ye += 84;
    });
  }

  // ---------- (m) É você que me encontra: a tenda do encontro ----------
  // A tenda em traço de gravura, com a coluna de nuvem subindo dela (Êxodo 33.9), e o fim de
  // Êxodo 33.11 na NBV, palavra por palavra.
  function arteTenda(ctx) {
    const tinta = '#3a291b';
    const fundoCor = '#d9cba9';
    const serif = (peso, t) => peso + ' ' + t + 'px Literata, Georgia, serif';
    // o título em itálico (a Literata do app, inclinada)
    for (const [t, y] of [['É você que', 720], ['me encontra', 860]]) {
      ctx.save();
      ctx.translate(L / 2 + 20, y);
      ctx.transform(1, 0, -0.22, 1, 0, 0);
      S.escrever(ctx, t, 0, 0, serif(600, 128), tinta);
      ctx.restore();
    }
    referencia(ctx, 'Êxodo 33.7-11', L / 2, 930, 30, tinta);
    const cx = L / 2;
    const chao = 1400;
    const topo = chao - 230;
    ctx.strokeStyle = tinta;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // a coluna de nuvem, atrás da tenda: bolotas subindo do meio da cumeeira
    const r = sorteio(33);
    const bolota = (x, y, raio) => {
      ctx.beginPath();
      ctx.arc(x, y, raio, 0, Math.PI * 2);
      ctx.fillStyle = fundoCor;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    const nx = cx + 70;
    for (const [dx, dy, raio] of [[-56, 1010, 46], [56, 1016, 46], [0, 996, 52]]) bolota(nx + dx, dy, raio);
    for (let y = 1046; y < topo + 30; y += 34) {
      const k = 1 - (y - 1046) / 600;
      bolota(nx - 44 * k + (r() - 0.5) * 12, y, 36 * k + 6);
      bolota(nx + 44 * k + (r() - 0.5) * 12, y + 12, 36 * k + 6);
      bolota(nx + (r() - 0.5) * 10, y + 6, 40 * k + 6);
    }
    // a tenda vista de quina: a empena da frente com a porta e o telhado de lado, em gravura
    const P = [cx - 90, topo];
    const Q = [cx + 230, topo + 34];
    const A0 = [cx - 270, chao];
    const B = [cx + 90, chao];
    const C = [cx + 350, chao - 14];
    const lado = new Path2D();
    lado.moveTo(P[0], P[1]); lado.lineTo(Q[0], Q[1]); lado.lineTo(C[0], C[1]); lado.lineTo(B[0], B[1]); lado.closePath();
    const frente = new Path2D();
    frente.moveTo(A0[0], A0[1]); frente.lineTo(P[0], P[1]); frente.lineTo(B[0], B[1]); frente.closePath();
    ctx.fillStyle = fundoCor;
    ctx.fill(lado);
    ctx.fill(frente);
    ctx.save();
    ctx.clip(lado);
    ctx.lineWidth = 2;
    for (let t = -0.2; t < 1.2; t += 0.035) {
      ctx.beginPath();
      ctx.moveTo(P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t);
      ctx.lineTo(B[0] + (C[0] - B[0]) * t, B[1] + (C[1] - B[1]) * t);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.stroke(lado);
    ctx.stroke(frente);
    // a porta: o vão escuro e as abas abertas
    const pm = (A0[0] + B[0]) / 2;
    ctx.fillStyle = tinta;
    ctx.beginPath();
    ctx.moveTo(pm - 70, chao);
    ctx.lineTo(pm - 8, topo + 90);
    ctx.lineTo(pm + 8, topo + 90);
    ctx.lineTo(pm + 70, chao);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 3;
    for (const l of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(pm + l * 8, topo + 90);
      ctx.quadraticCurveTo(pm + l * 80, topo + 170, pm + l * 120, chao);
      ctx.stroke();
    }
    // as varas, as cordas e o chão
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(P[0], P[1]); ctx.lineTo(P[0], P[1] - 28);
    ctx.moveTo(Q[0], Q[1]); ctx.lineTo(Q[0], Q[1] - 28);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(P[0], P[1] - 20); ctx.lineTo(cx - 380, chao);
    ctx.moveTo(Q[0], Q[1] - 20); ctx.lineTo(cx + 420, chao);
    ctx.moveTo(cx - 420, chao); ctx.lineTo(cx + 440, chao);
    ctx.stroke();
    // o fim de Êxodo 33.11 (NBV)
    const trecho = 'O Senhor falava com Moisés face a face, como quem fala com um amigo.';
    const tx = S.textoEquilibrado(ctx, trecho, { fonte: (x) => serif(500, x), larguraMax: 800, alturaMax: 110, fonteMax: 38, fonteMin: 30, entreLinhas: 1.3 });
    let y = chao + 30;
    for (const l of tx.linhas) { y += tx.tamanho * 1.3; S.escrever(ctx, l, cx, y, serif(500, tx.tamanho), tinta); }
  }

  // ---------- (n) Seu chamado é ser diferente: a ovelha branca no meio das escuras ----------
  // Ovelha de frente, simplificada: cabeça de lã, rosto, orelhas e olhos.
  function ovelhaDeFrente(ctx, x, y, s, { la, rosto, traco, olho, orelha }) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = traco;
    ctx.lineWidth = 4;
    const corpo = laCacheada(0, 230, 190, 170, 18, 1.08);
    ctx.fillStyle = la;
    ctx.fill(corpo);
    if (traco !== la) ctx.stroke(corpo);
    for (const l of [-1, 1]) {
      ctx.save();
      ctx.translate(l * 108, -10);
      ctx.rotate(l * 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, 52, 20, 0, 0, Math.PI * 2);
      ctx.fillStyle = orelha;
      ctx.fill();
      if (traco !== la) ctx.stroke();
      ctx.restore();
    }
    const cabeca = laCacheada(0, -40, 110, 92, 14, 1.12);
    ctx.fillStyle = la;
    ctx.fill(cabeca);
    if (traco !== la) ctx.stroke(cabeca);
    const r = new Path2D();
    r.moveTo(-58, -30);
    r.bezierCurveTo(-62, 50, -40, 116, 0, 120);
    r.bezierCurveTo(40, 116, 62, 50, 58, -30);
    r.bezierCurveTo(46, -54, -46, -54, -58, -30);
    ctx.fillStyle = rosto;
    ctx.fill(r);
    if (traco !== la) ctx.stroke(r);
    ctx.fillStyle = olho;
    for (const l of [-1, 1]) { ctx.beginPath(); ctx.arc(l * 28, 6, 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath();
    ctx.moveTo(-12, 86); ctx.quadraticCurveTo(0, 96, 12, 86);
    ctx.strokeStyle = olho;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }
  function arteDiferente(ctx) {
    const escura = { la: '#2b2926', rosto: '#1b1a18', traco: '#2b2926', olho: '#55514b', orelha: '#22201e' };
    const r = sorteio(12);
    const fila = (y, s, n, deslocar) => {
      for (let i = 0; i < n; i++) ovelhaDeFrente(ctx, (i + 0.5 + deslocar) * (L / n) + (r() - 0.5) * 30, y + (r() - 0.5) * 20, s, escura);
    };
    fila(660, 0.62, 6, 0);
    fila(800, 0.8, 5, 0.1);
    ovelhaDeFrente(ctx, L / 2, 880, 1.25, { la: '#f2eee5', rosto: '#f7f3ec', traco: '#cfc8bb', olho: '#1b1a18', orelha: '#e8b9ad' });
    // as escuras da frente, nas pontas, um pouco cortadas pela borda
    ovelhaDeFrente(ctx, 90, 1000, 0.95, escura);
    ovelhaDeFrente(ctx, L - 90, 1010, 0.95, escura);
    // um degradê escuro embaixo, para o texto assentar
    const g = ctx.createLinearGradient(0, 1080, 0, 1260);
    g.addColorStop(0, 'rgba(18,17,16,0)');
    g.addColorStop(1, 'rgba(18,17,16,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 1080, L, 420);
    const oswald = (t) => '700 ' + t + 'px Oswald, sans-serif';
    const laranja = '#f2552c';
    for (const [a, b, y] of [['SEU ', 'CHAMADO É', 1340], ['SER ', 'DIFERENTE.', 1470]]) {
      ctx.font = oswald(130);
      const wa = ctx.measureText(a).width;
      const w = ctx.measureText(a + b).width;
      const x = L / 2 - w / 2;
      S.escrever(ctx, a, x, y, oswald(130), '#f4f1ea', { alinhar: 'left' });
      S.escrever(ctx, b, x + wa, y, oswald(130), laranja, { alinhar: 'left' });
    }
  }

  // ---------- (o) O chamado não é caro. Ele custa tudo: quem anda sozinho ----------
  // Vista de cima, chão cinza granulado: uma pessoa andando sozinha, nítida, com a sombra
  // longa, e outras passando borradas em volta. O borrão é a sombra do canvas (shadowBlur,
  // que todo navegador tem), desenhada com a forma fora da tela.
  function pessoa(x, y, h) {
    const p = new Path2D();
    p.arc(x, y - h * 0.9, h * 0.07, 0, Math.PI * 2);
    p.moveTo(x - h * 0.11, y - h * 0.78);
    p.quadraticCurveTo(x, y - h * 0.86, x + h * 0.11, y - h * 0.78);
    p.lineTo(x + h * 0.1, y - h * 0.36);
    p.lineTo(x + h * 0.06, y);
    p.lineTo(x + h * 0.012, y);
    p.lineTo(x, y - h * 0.3);
    p.lineTo(x - h * 0.012, y);
    p.lineTo(x - h * 0.06, y);
    p.lineTo(x - h * 0.1, y - h * 0.36);
    p.closePath();
    return p;
  }
  function borrado(ctx, forma, cor, raio) {
    ctx.save();
    ctx.shadowColor = cor;
    ctx.shadowBlur = raio;
    // o deslocamento da sombra não passa pela escala do desenho; a forma, sim
    const esc = ctx.getTransform ? ctx.getTransform().a : 1;
    ctx.shadowOffsetX = 4000;
    ctx.translate(-4000 / esc, 0);
    ctx.fillStyle = '#000';
    ctx.fill(forma);
    ctx.restore();
  }
  function arteCustaTudo(ctx) {
    // os que passam, borrados (e um pouco esticados, como em movimento)
    for (const [x, y, h, raio, a] of [[240, 860, 420, 22, 0.95], [970, 720, 330, 26, 0.8], [330, 1330, 380, 34, 0.75], [880, 1400, 360, 40, 0.7]]) {
      borrado(ctx, pessoa(x, y, h), 'rgba(8,8,8,' + a + ')', raio);
      ctx.save();
      ctx.translate(0, -h * 0.12);
      borrado(ctx, pessoa(x, y, h), 'rgba(8,8,8,' + (a * 0.4) + ')', raio * 1.4);
      ctx.restore();
    }
    // a sombra longa e quem anda sozinho, nítido
    const x = 560;
    const y = 1000;
    const h = 300;
    const sombra = new Path2D();
    sombra.ellipse(x + h * 0.62, y - 6, h * 0.62, h * 0.07, -0.04, 0, Math.PI * 2);
    borrado(ctx, sombra, 'rgba(0,0,0,.55)', 10);
    ctx.fillStyle = '#0b0b0b';
    ctx.fill(pessoa(x, y, h));
    // o texto: branco condensado, e o TUDO à mão em laranja, circulado
    const branco = '#f1eee6';
    const laranja = '#f0441e';
    const linhas = ['O CHAMADO NÃO É', 'CARO. ELE CUSTA'];
    ctx.font = S.Mn(800, 100);
    const tam = Math.min(130, 100 * 900 / (0.84 * Math.max(...linhas.map((l) => ctx.measureText(l).width))));
    linhas.forEach((l, i) => {
      ctx.save();
      ctx.translate(L / 2, 1300 + i * tam * 1.02);
      ctx.scale(0.84, 1);
      S.escrever(ctx, l, 0, 0, S.Mn(800, tam), branco, { espaco: -tam * 0.03 });
      ctx.restore();
    });
    const yTudo = 1300 + tam * 1.02 + 150;
    ctx.fillStyle = laranja;
    aMao(ctx, 'TUDO', L / 2, yTudo, 104, sorteio(14), { alinhar: 'center', espaco: 6 });
    ctx.strokeStyle = laranja;
    ctx.lineCap = 'round';
    for (const [d, w] of [[0, 6], [5, 3]]) {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.ellipse(L / 2 + d, yTudo - 36 + d, 210, 72, -0.06, Math.PI * 0.12, Math.PI * 2.05);
      ctx.stroke();
    }
  }

  // ---------- (p) Um coração disposto não cumpre chamado se a boca não fala: as brasas ----------
  // O texto branco condensado, a condição à mão em laranja e, embaixo, o fogo do app (a
  // mesma chama da ofensiva, em vários tamanhos) com brilho e fagulhas subindo.
  function arteCoracao(ctx) {
    const branco = '#f3f0ea';
    const laranja = '#f2662a';
    const linhas = ['UM CORAÇÃO', 'DISPOSTO NÃO', 'CUMPRE CHAMADO'];
    ctx.font = S.Mn(800, 100);
    const tam = Math.min(150, 100 * 920 / (0.84 * Math.max(...linhas.map((l) => ctx.measureText(l).width))));
    linhas.forEach((l, i) => {
      ctx.save();
      ctx.translate(L / 2, 700 + i * tam * 1.0);
      ctx.scale(0.84, 1);
      S.escrever(ctx, l, 0, 0, S.Mn(800, tam), branco, { espaco: -tam * 0.03 });
      ctx.restore();
    });
    const yMao = 700 + 2 * tam + 140;
    ctx.fillStyle = laranja;
    const w = aMao(ctx, 'SE A BOCA NÃO FALA', L / 2, yMao, 66, sorteio(15), { alinhar: 'center', espaco: 2 });
    ctx.strokeStyle = laranja;
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(L / 2 - w / 2 - 10, yMao + 26);
    ctx.quadraticCurveTo(L / 2, yMao + 14, L / 2 + w / 2 + 16, yMao + 22);
    ctx.stroke();
    // o fogo: brilho, as chamas e as fagulhas
    const base = 1500;
    const brilho = ctx.createRadialGradient(L / 2, base, 0, L / 2, base, 620);
    brilho.addColorStop(0, 'rgba(242,102,42,.55)');
    brilho.addColorStop(0.5, 'rgba(242,102,42,.18)');
    brilho.addColorStop(1, 'rgba(242,102,42,0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(-200, base - 700, L + 400, 2000);
    const r = sorteio(1502);
    for (let i = 0; i < 11; i++) {
      const x = 60 + i * 96 + (r() - 0.5) * 40;
      const meio = 1 - Math.abs(x - L / 2) / (L / 2);
      ctx.save();
      ctx.globalAlpha = 0.75 + r() * 0.25;
      S.chama(ctx, x, base + 30, 120 + meio * 170 + r() * 60, false);
      ctx.restore();
    }
    // o pé do fogo some no escuro, como brasa
    const pe = ctx.createLinearGradient(0, base - 70, 0, base + 40);
    pe.addColorStop(0, 'rgba(19,17,16,0)');
    pe.addColorStop(1, 'rgba(19,17,16,1)');
    ctx.fillStyle = pe;
    ctx.fillRect(-200, base - 70, L + 400, 2000);
    ctx.save();
    ctx.shadowColor = 'rgba(255,140,40,.9)';
    ctx.shadowBlur = 10;
    for (let i = 0; i < 70; i++) {
      const y = base - 40 - Math.pow(r(), 1.6) * 420;
      ctx.fillStyle = r() < 0.5 ? '#ffb347' : '#ff7a2e';
      ctx.globalAlpha = 0.5 + r() * 0.5;
      ctx.beginPath();
      ctx.arc(80 + r() * (L - 160), y, 1.5 + r() * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- (q) Não vivo mais eu: só tipografia em pincel ----------
  // A redação da NBV em Gálatas 2.20 é outra ("eu próprio não vivo mais"): aqui é o lema,
  // com a referência.
  function arteNaoVivo(ctx) {
    const branco = '#f4f1ea';
    const { c, ctx: k } = camada();
    k.fillStyle = branco;
    const r = sorteio(220);
    const fonte = (t) => '400 ' + t + 'px "Permanent Marker", cursive';
    let y = 600;
    for (const [linha, max] of [['NÃO', 260], ['VIVO', 260], ['MAIS EU', 230]]) {
      k.font = fonte(100);
      const tam = Math.min(max, 100 * 820 / k.measureText(linha).width);
      y += tam * 0.98;
      aMao(k, linha, L / 2, y, tam, r, { alinhar: 'center', espaco: -4 });
    }
    gastar(c, { x: 60, y: 560, w: L - 120, h: y - 480 }, { pontos: 7000, manchas: 0, riscos: 80, semente: 220 });
    ctx.drawImage(c, 0, 0);
    S.escrever(ctx, 'MAS CRISTO VIVE EM MIM', L / 2, y + 120, S.Mn(800, 50), branco, { espaco: 50 * 0.12 });
    referencia(ctx, 'Gálatas 2.20', L / 2, y + 196, 32, 'rgba(244,241,234,.66)');
  }

  // ---------- (r) Quando penso em desistir: o texto formando uma cruz ----------
  function arteDesistir(ctx) {
    const branco = '#f4f1ea';
    const oswald = (t) => '700 ' + t + 'px Oswald, sans-serif';
    const coluna = [['QUANDO', 44], ['PENSO', 44], ['EM', 104], ['DESISTIR', 0], ['LEMBRO', 44], ['QUE', 104],
      ['VO', 136], ['CÊ', 136], ['INSISTIU', 44], ['EM', 104], ['MIM', 104]];
    let y = 600;
    for (const [palavra, t] of coluna) {
      let tam = t;
      if (!tam) { ctx.font = oswald(100); tam = 100 * 940 / ctx.measureText(palavra).width; }
      // letra com acento em cima pede mais espaço acima
      y += tam * (/[ÂÊÔÃÕÁÉÍÓÚ]/.test(palavra) ? 1.08 : 0.86);
      S.escrever(ctx, palavra, L / 2, y, oswald(tam), branco, { espaco: t && t < 60 ? t * 0.1 : 0 });
      y += tam * 0.12;
    }
  }

  // ---------- (s) Confie no plano de Deus: o texto ondulando como bandeira ----------
  // O texto é escrito numa camada e copiado em fatias verticais estreitas, cada uma subida ou
  // descida por uma onda e um pouco esticada, como pano ao vento em perspectiva.
  function arteConfie(ctx) {
    const { c, ctx: t } = camada();
    const linhas = ['CONFIE NO', 'PLANO DE DEUS.'];
    t.font = S.Mn(800, 100);
    const tam = 100 * 900 / Math.max(...linhas.map((l) => t.measureText(l).width));
    linhas.forEach((l, i) => S.escrever(t, l, L / 2, 900 + i * tam * 1.02, S.Mn(800, tam), '#f6f3ec', { espaco: -tam * 0.02 }));
    const topo = 900 - tam;
    const alto = tam * 2.3;
    const passo = 3;
    for (let x = 60; x < L - 60; x += passo) {
      const k = (x - 60) / (L - 120);
      const dy = Math.sin(k * Math.PI * 2.2 + 0.6) * 46 - k * 40;
      const esc = 1 + Math.cos(k * Math.PI * 2.2 + 0.6) * 0.09 + (1 - k) * 0.12;
      ctx.drawImage(c, x, topo, passo, alto, x, topo + dy - alto * (esc - 1) / 2, passo + 0.6, alto * esc);
    }
  }

  // ---------- (t) Inundados pelo amor de Deus: a pessoa ajoelhada dentro do AMOR ----------
  // Ezequiel 47.1-9: o rio que sai do templo e enche tudo de vida. Sem citar o texto.
  function arteInundados(ctx) {
    const branco = '#f4f1ea';
    const oswald = (t) => '700 ' + t + 'px Oswald, sans-serif';
    S.escrever(ctx, 'INUNDADOS PELO', L / 2, 660, oswald(58), branco, { espaco: 58 * 0.14 });
    ctx.font = oswald(100);
    const tam = 100 * 940 / ctx.measureText('AMOR').width;
    const base = 700 + tam * 0.86;
    S.escrever(ctx, 'AMOR', L / 2, base, oswald(tam), branco);
    // a pessoa ajoelhada, de perfil, vazada na palavra (a cor do fundo por cima)
    const u = tam * 0.9 / 100;
    ctx.save();
    ctx.translate(L / 2 + 60, base);
    ctx.scale(u, u);
    const p = new Path2D('M-20 -24C-26 -46 -14 -64 2 -66C8 -68 12 -64 14 -60L21 -52L23 -40L13 -38L11 -30'
      + 'C15 -22 23 -16 23 -8C23 -2 19 0 13 0L-31 0C-35 -2 -33 -8 -27 -10C-23 -14 -21 -18 -20 -24Z');
    p.arc(11, -73, 9, 0, Math.PI * 2);
    // contorno claro: fora das letras a pessoa continua visível, dentro delas é um vazado
    ctx.strokeStyle = branco;
    ctx.lineWidth = 10 / u;
    ctx.lineJoin = 'round';
    ctx.stroke(p);
    ctx.fillStyle = '#0d0d0c';
    ctx.fill(p);
    ctx.restore();
    S.escrever(ctx, 'DE DEUS', L / 2, base + 110, oswald(70), branco, { espaco: 70 * 0.14 });
    referencia(ctx, 'Ezequiel 47.1-9', L / 2, base + 190, 32, 'rgba(244,241,234,.66)');
  }

  // ---------- (u) Estou em uma grande obra: letra grossa à esquerda ----------
  // A NBV diz outra coisa em Neemias 6.3 ("Estou fazendo um trabalho muito importante!"):
  // aqui é o lema, com a referência.
  function arteGrandeObra(ctx) {
    const branco = '#f4f1ea';
    const linhas = ['ESTOU EM', 'UMA GRANDE', 'OBRA E NÃO', 'POSSO', 'PARAR.'];
    ctx.font = S.Mn(800, 100);
    const tam = 100 * 920 / Math.max(...linhas.map((l) => ctx.measureText(l).width));
    let y = 600;
    for (const l of linhas) {
      y += tam * 1.02;
      S.escrever(ctx, l, 80, y, S.Mn(800, tam), branco, { alinhar: 'left', espaco: -tam * 0.03 });
    }
    referencia(ctx, 'Neemias 6.3', 84, y + 90, 32, 'rgba(244,241,234,.66)', 'left');
  }

  // ---------- (v) Mateus 24.42: a citação em serifa clássica ----------
  // O texto é o da NBV, palavra por palavra.
  function arteVigiem(ctx) {
    const branco = '#f4f1ea';
    const serif = (t) => '500 ' + t + 'px Literata, Georgia, serif';
    const texto = '“Portanto, estejam vigiando, porque vocês não sabem em que dia o seu Senhor virá.”';
    const tx = S.textoEquilibrado(ctx, texto, { fonte: serif, larguraMax: 860, alturaMax: 620, fonteMax: 84, fonteMin: 44, entreLinhas: 1.3 });
    const altura = tx.linhas.length * tx.tamanho * 1.3;
    let y = 1020 - altura / 2;
    ctx.fillStyle = branco;
    ctx.fillRect(L / 2 - 40, y - 70, 80, 3);
    for (const l of tx.linhas) { y += tx.tamanho * 1.3; S.escrever(ctx, l, L / 2, y - tx.tamanho * 0.3, serif(tx.tamanho), branco); }
    ctx.fillRect(L / 2 - 40, y + 40, 80, 3);
    referencia(ctx, 'Mateus 24.42', L / 2, y + 120, 34, 'rgba(244,241,234,.72)');
  }

  // ---------- a ofensiva no topo, a arte no meio, a marca no pé ----------
  // A ofensiva continua em destaque em todo modelo: a chama do app e o número de dias no
  // alto, como no story de sempre. A arte vem abaixo, na faixa do meio (Z0 a Z1); a que foi
  // desenhada mais alta encolhe por igual para caber, centrada na faixa. O pé é só a marca.
  const Z0 = 560;
  const Z1 = 1480; // 75px de respiro até a marca, igual em todos
  function cabecalho(ctx, dias, tema) {
    const hc = 132;
    const base = 296 + hc;
    const tam = 150;
    ctx.font = S.Mn(800, tam);
    const wn = ctx.measureText(String(dias)).width;
    const wc = hc * 0.7;
    const vao = 22;
    const x0 = L / 2 - (wc + vao + wn) / 2;
    if (tema.brilho && dias) {
      const g = ctx.createRadialGradient(x0 + wc / 2, base - hc * 0.45, 0, x0 + wc / 2, base - hc * 0.45, hc * 1.3);
      g.addColorStop(0, 'rgba(255,122,82,.30)');
      g.addColorStop(1, 'rgba(255,122,82,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0 - hc, base - hc * 2, hc * 3, hc * 3);
    }
    S.chama(ctx, x0 + wc / 2, base, hc, !dias, tema.apagada);
    S.escrever(ctx, String(dias), x0 + wc + vao, base - 4, S.Mn(800, tam), dias ? tema.numero : tema.apagada, { alinhar: 'left', espaco: -6 });
    S.escrever(ctx, dias === 1 ? 'dia de ofensiva' : 'dias de ofensiva', L / 2, base + 62, S.Mn(700, 44), tema.rotulo);
  }
  const ESCURO = { numero: '#ff9a7a', rotulo: '#eef0ea', apagada: '#a4a99d', marca: '#f4f1ea', marcaFraca: '#a9a49a', brilho: true };
  const CLARO = { numero: '#d2401c', rotulo: '#1d1b19', apagada: '#8a8f84', marca: '#161514', marcaFraca: '#6d5446' };
  const MODELOS = {
    chama: { fundo: ['#121110', { x: L / 2, y: 1000, r: 900, cor: 'rgba(70,60,50,.35)' }], tema: ESCURO, desenhar: arteChama, grao: [26, 116], caixa: [560, 1450] },
    luz: { fundo: ['#4a2f1e', { x: L / 2 + 30, y: 900, r: 760, cor: 'rgba(214,120,48,.20)' }], caixa: [360, 1440],
      tema: { ...ESCURO, numero: '#f6b347', rotulo: '#f2e3cb', marca: '#f2e3cb', marcaFraca: '#c49a74' }, desenhar: arteLuz, grao: [22, 514] },
    ninguem: { fundo: ['#ece7de', { x: L / 2, y: 900, r: 1100, cor: 'rgba(255,255,255,.45)' }], caixa: [270, 1480], tema: CLARO, desenhar: arteNinguem, grao: [16, 1811] },
    oleiro: { fundo: ['#0f0e0d', { x: L / 2, y: 1000, r: 800, cor: 'rgba(224,112,48,.12)' }], caixa: [600, 1230],
      tema: { ...ESCURO, numero: '#e0743a', rotulo: '#efe4cf', marca: '#efe4cf', marcaFraca: '#a69c8c' }, desenhar: arteOleiro, grao: [22, 186] },
    procurado: { fundo: ['#efe7d8', { x: L / 2, y: 900, r: 1100, cor: 'rgba(255,255,255,.4)' }], caixa: [290, 1320], tema: CLARO, desenhar: arteProcurado, grao: [16, 157] },
    suficiente: { fundo: ['#0b0c0e'], foto: 'suficiente', tema: { ...ESCURO, rotulo: '#f4f1ea', marcaFraca: '#9aa0a8' }, desenhar: arteSuficiente, grao: [18, 22] },
    praticantes: { fundo: ['#46502f', { x: L / 2, y: 900, r: 1000, cor: 'rgba(150,165,100,.22)' }], caixa: [350, 1420],
      tema: { ...ESCURO, numero: '#ffb08a', rotulo: '#efe7cf', marca: '#efe7cf', marcaFraca: '#c2c7a4', brilho: false }, desenhar: artePraticantes, grao: [18, 122] },
    mesa: { fundo: ['#0e0f0d', { x: L / 2, y: 1050, r: 700, cor: 'rgba(143,209,79,.10)' }], caixa: [590, 1500],
      tema: { ...ESCURO, numero: '#8fd14f', rotulo: '#f1eee6', marca: '#f1eee6', marcaFraca: '#9aa392' }, desenhar: arteMesa, grao: [20, 99] },
    quemdeusdiz: { fundo: ['#141414', { x: L / 2, y: 900, r: 900, cor: 'rgba(255,255,255,.06)' }], caixa: [560, 1495],
      tema: { ...ESCURO, rotulo: '#ebe8e1', marca: '#ebe8e1', marcaFraca: '#9a978f' }, desenhar: arteQuemDeusDiz, grao: [18, 29] },
    comprado: { fundo: ['#f7f6f2'], caixa: [580, 1530], tema: { ...CLARO, rotulo: '#141414', marca: '#141414', marcaFraca: '#6b6863' }, desenhar: arteComprado, grao: [10, 620] },
    momento: { fundo: ['#efe6d6', { x: L / 2, y: 900, r: 1000, cor: 'rgba(255,255,255,.4)' }], caixa: [590, 1640], tema: CLARO, desenhar: arteMomento, grao: [14, 7] },
    tenda: { fundo: ['#d9cba9', { x: L / 2, y: 1000, r: 1000, cor: 'rgba(255,250,235,.35)' }], caixa: [600, 1520], tema: CLARO, desenhar: arteTenda, grao: [14, 3311] },
    diferente: { fundo: ['#121110', { x: L / 2, y: 820, r: 700, cor: 'rgba(255,255,255,.07)' }], caixa: [560, 1490],
      tema: { ...ESCURO, numero: '#f2552c' }, desenhar: arteDiferente, grao: [18, 1212] },
    custatudo: { fundo: ['#2b2b2a', { x: L / 2, y: 820, r: 900, cor: 'rgba(120,120,116,.35)' }], caixa: [560, 1560],
      tema: { ...ESCURO, numero: '#f0441e', rotulo: '#f1eee6', marca: '#f1eee6', marcaFraca: '#a3a29d' }, desenhar: arteCustaTudo, grao: [30, 13] },
    coracao: { fundo: ['#131110'], caixa: [580, 1540], tema: ESCURO, desenhar: arteCoracao, grao: [20, 15] },
    naovivo: { fundo: ['#0f0e0d', { x: L / 2, y: 1000, r: 800, cor: 'rgba(255,255,255,.05)' }], caixa: [560, 1510], tema: ESCURO, desenhar: arteNaoVivo, grao: [22, 220] },
    desistir: { fundo: ['#0d0d0c'], caixa: [560, 1790], tema: ESCURO, desenhar: arteDesistir, grao: [18, 18] },
    confie: { fundo: ['#0d0d0c', { x: L / 2, y: 1000, r: 800, cor: 'rgba(255,255,255,.05)' }], caixa: [700, 1300], tema: ESCURO, desenhar: arteConfie, grao: [18, 19] },
    inundados: { fundo: ['#0d0d0c'], caixa: [600, 1460], tema: ESCURO, desenhar: arteInundados, grao: [18, 20] },
    grandeobra: { fundo: ['#0d0d0c'], caixa: [580, 1540], tema: ESCURO, desenhar: arteGrandeObra, grao: [18, 63] },
    vigiem: { fundo: ['#0d0d0c'], caixa: [600, 1440], tema: ESCURO, desenhar: arteVigiem, grao: [16, 2442] },
    porta: { fundo: ['#ebe0cb', { x: L / 2, y: 1100, r: 1000, cor: 'rgba(255,248,230,.5)' }], caixa: [600, 1640], tema: CLARO, desenhar: artePorta, grao: [16, 320] },
  };
  // Fotos de fundo (window.STORY_FOTOS, posto pelo build no começo deste arquivo): pedidas
  // antes de desenhar (prepararArte). Sem a foto, o modelo sai com a ilustração.
  const fotos = {};
  function carregarFoto(chave) {
    const arquivo = chave && (window.STORY_FOTOS || {})[chave];
    if (!arquivo || fotos[chave]) return Promise.resolve(true);
    return new Promise((resolver) => {
      const img = new Image();
      const espera = setTimeout(() => resolver(false), 6000);
      img.onload = () => { clearTimeout(espera); fotos[chave] = img; resolver(true); };
      img.onerror = () => { clearTimeout(espera); resolver(false); };
      img.src = /^(https?|file|data|blob):/.test(arquivo) ? arquivo : './' + arquivo;
    });
  }
  const prepararArte = (nome) => carregarFoto(MODELOS[nome] && MODELOS[nome].foto);
  const fotoPronta = (chave) => !(window.STORY_FOTOS || {})[chave] || !!fotos[chave];
  const arteCompleta = (nome) => !(MODELOS[nome] && MODELOS[nome].foto) || fotoPronta(MODELOS[nome].foto);
  // A foto é o fundo inteiro: só um degradê escuro em cima e embaixo, para a chama, os dias e
  // a marca se lerem sobre o céu e a cidade; a frase já está na foto.
  function comFoto(ctx, img, dias, m) {
    ctx.drawImage(img, 0, 0, L, A);
    const cima = ctx.createLinearGradient(0, 0, 0, 720);
    cima.addColorStop(0, 'rgba(0,0,0,.72)');
    cima.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cima;
    ctx.fillRect(0, 0, L, 720);
    const baixo = ctx.createLinearGradient(0, A - 560, 0, A);
    baixo.addColorStop(0, 'rgba(0,0,0,0)');
    baixo.addColorStop(1, 'rgba(0,0,0,.8)');
    ctx.fillStyle = baixo;
    ctx.fillRect(0, A - 560, L, 560);
    cabecalho(ctx, dias, m.tema);
    grao(ctx, 14, 941);
    S.marca(ctx, PE, { cor: m.tema.marca, corFraca: m.tema.marcaFraca });
  }
  function montar(m) {
    return (ctx, { dias }) => {
      if (m.foto && fotos[m.foto]) { comFoto(ctx, fotos[m.foto], dias, m); return; }
      fundo(ctx, m.fundo[0], m.fundo[1]);
      ctx.save();
      if (m.caixa) {
        const [y0, y1] = m.caixa;
        const k = Math.min(1, (Z1 - Z0) / (y1 - y0));
        ctx.translate(L / 2, (Z0 + Z1) / 2);
        ctx.scale(k, k);
        ctx.translate(-L / 2, -(y0 + y1) / 2);
      }
      m.desenhar(ctx);
      ctx.restore();
      cabecalho(ctx, dias, m.tema);
      grao(ctx, m.grao[0], m.grao[1]);
      S.marca(ctx, PE, { cor: m.tema.marca, corFraca: m.tema.marcaFraca });
    };
  }
  S.artes = {};
  for (const nome of Object.keys(MODELOS)) S.artes[nome] = montar(MODELOS[nome]);
  // ---------- o fundo de cartaz do story de versículo ----------
  // O fundo da arte da marca (2026-10-09): preto texturizado, papel cinza rasgado no canto,
  // fitas translúcidas, pinceladas sálvia nas bordas, a logo no alto e as montanhas em P&B no
  // pé (story-foto-montanhas, tirada da própria arte). As decorações ficam nas margens e no
  // pé: o versículo (01d-story.js) é desenhado por cima, no meio, sem nada atrás.
  function papelRasgado(ctx, de, ate, fecho, r) {
    const p = new Path2D();
    p.moveTo(de[0], de[1]);
    const passos = Math.ceil(Math.hypot(ate[0] - de[0], ate[1] - de[1]) / 16);
    const nx = -(ate[1] - de[1]);
    const ny = ate[0] - de[0];
    const n = Math.hypot(nx, ny);
    for (let i = 1; i < passos; i++) {
      const t = i / passos;
      const j = (r() - 0.5) * 22;
      p.lineTo(de[0] + (ate[0] - de[0]) * t + nx / n * j, de[1] + (ate[1] - de[1]) * t + ny / n * j);
    }
    p.lineTo(ate[0], ate[1]);
    const borda = new Path2D(p);
    for (const [x, y] of fecho) p.lineTo(x, y);
    p.closePath();
    ctx.fillStyle = '#3b3b39';
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.25)';
      ctx.beginPath();
      let x = r() * L;
      let y = r() * A;
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 160; y += (r() - 0.5) * 160; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(235,235,228,.45)';
    ctx.lineWidth = 3;
    ctx.stroke(borda);
  }
  function fita(ctx, x, y, w, h, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(232,232,225,.14)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  function pinceladaSalvia(ctx, x, y, w, h, ang, alfa) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = alfa;
    S.pincelada(ctx, -w / 2, -h / 2, w, h, false, '#9fb266');
    ctx.restore();
  }
  function fundoCartaz(ctx) {
    const r = sorteio(2131);
    ctx.fillStyle = '#0e0e0d';
    ctx.fillRect(0, 0, L, A);
    const luz = ctx.createRadialGradient(L / 2, 900, 0, L / 2, 900, 1000);
    luz.addColorStop(0, 'rgba(255,255,255,.05)');
    luz.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = luz;
    ctx.fillRect(0, 0, L, A);
    // poeira clara
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.04 + r() * 0.18).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(r() * L, r() * A, 0.5 + r() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    papelRasgado(ctx, [660, 0], [1080, 330], [[1080, 0]], r);
    papelRasgado(ctx, [0, 1380], [300, 1920], [[0, 1920]], r);
    // fitas e pinceladas só nas margens de cima e no pé, longe do texto
    fita(ctx, 990, 300, 260, 70, 0.7);
    fita(ctx, 1010, 1690, 230, 66, -0.5);
    pinceladaSalvia(ctx, 880, 430, 280, 40, -0.32, 0.85);
    pinceladaSalvia(ctx, 150, 1650, 260, 38, -0.22, 0.75);
    // as montanhas no pé (o céu preto da foto some no preto do fundo)
    const m = fotos.montanhas;
    if (m) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighten';
      ctx.drawImage(m, 0, A - 273, L, 273);
      ctx.restore();
    }
    // a logo no alto, à esquerda
    const w = S.logo(ctx, 96, 262, 78, '#f2efdc');
    S.escrever(ctx, 'Geração Eleita', 96 + w + 20, 262 + 54, S.Mn(800, 46), '#f2efdc', { alinhar: 'left' });
  }
  // O pé do cartaz: o convite em carimbo sálvia, o endereço, a cruz e a coroa à mão, o grão.
  function rodapeCartaz(ctx) {
    const branco = '#f2efdc';
    const convite = ['Leia a Bíblia comigo'];
    const tc = S.tamanhoDoCarimbo(ctx, convite, 640, 90, 46);
    const mc = S.carimbo(ctx, convite, L / 2, 1446, tc, { chapa: '#c8da8c', letra: '#12130f' });
    S.escrever(ctx, S.ENDERECO, L / 2, 1590, S.Mn(700, 34), branco, { espaco: 1 });
    const meio = mc.largura / 2;
    ctx.save();
    ctx.strokeStyle = branco;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 9;
    // a cruz, à esquerda do convite
    const cx = L / 2 - meio - 70;
    ctx.beginPath();
    ctx.moveTo(cx + 2, 1418); ctx.lineTo(cx - 2, 1522);
    ctx.moveTo(cx - 32, 1452); ctx.lineTo(cx + 34, 1448);
    ctx.stroke();
    // a coroa, à direita
    const kx = L / 2 + meio + 30;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(kx, 1500); ctx.lineTo(kx - 4, 1438); ctx.lineTo(kx + 26, 1474); ctx.lineTo(kx + 46, 1426);
    ctx.lineTo(kx + 66, 1472); ctx.lineTo(kx + 96, 1436); ctx.lineTo(kx + 92, 1500); ctx.closePath();
    ctx.moveTo(kx - 4, 1520); ctx.lineTo(kx + 98, 1518);
    ctx.stroke();
    ctx.restore();
    grao(ctx, 20, 2131);
  }

  S.prepararArte = prepararArte;
  S.fundoCartaz = fundoCartaz;
  S.rodapeCartaz = rodapeCartaz;
  S.prepararVersiculo = () => carregarFoto('montanhas');
  S.versiculoCompleto = () => fotoPronta('montanhas');
  S.arteCompleta = arteCompleta;
  S.texturas = { sorteio, grao, gastar };
})(window.CC);
