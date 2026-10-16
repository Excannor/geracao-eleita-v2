/* Modelos de story das frases que vieram com arte (2026-10-09). O dono mandou artes de
   referência (a chama de "Não me envergonho do Evangelho", a lâmpada de "Luz do mundo", o globo
   com ovelhas de "Ninguém fica para trás", o oleiro, o cartaz de procurado, a bandeira de
   "Jesus é suficiente", o livro de Tiago 1.22 e a porta de Apocalipse 3.20); aqui cada uma é
   redesenhada em canvas, sem imagem embutida (o index.html tem teto de 1 MB): desenhos em
   caminhos e traços, e a textura de impressão gasta é ruído com semente fixa (a mesma frase
   sai sempre igual). As de terceiros (procurado, a foto da bandeira) viraram ilustração
   própria, só com a ideia. Duas o dono preferiu só tipográficas (envergonho, oleiro). As
   feitas depois "no padrão da landing" ficaram repetidas e foram revistas (o último bloco do
   arquivo): cada uma com fundo, composição, letra e fechamento próprios, usando as fotos da
   landing e do dono.
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

  // ---------- (j) Sou quem Deus diz que eu sou: o texto em arcos sobre uma digital ----------
  // As linhas do texto correm sobre arcos, e atrás delas fica uma impressão digital de verdade
  // (quem a pessoa é); embaixo, o carimbo do app: "Somos Geração Eleita" (1 Pedro 2.9-10).
  //
  // A digital (o dono achou que as linhas antigas pareciam ondas no celular): as cristas são
  // as curvas de nível de uma fase, desenhada pixel a pixel. A fase é a distância a um núcleo
  // numa elipse em pé (as cristas são ovais, mais altas que largas), com uma volta de espiral
  // no núcleo, entortada por ruído suave (nada de círculo perfeito). Cada ponto de minúcia
  // soma uma volta de ângulo à fase: ali uma crista se divide em duas ou termina, como nas
  // digitais. A espessura varia com outro ruído, e falhas pequenas cortam algumas cristas.
  // Cinza claro e fraco sobre o preto, para o texto continuar na frente.
  function ruidoSuave(semente) {
    const r = sorteio(semente);
    const N = 64;
    const t = Array.from({ length: N * N }, () => r() * 2 - 1);
    const v = (i, j) => t[((j % N) + N) % N * N + ((i % N) + N) % N];
    const s = (x) => x * x * (3 - 2 * x);
    return (x, y) => {
      const i = Math.floor(x);
      const j = Math.floor(y);
      const fx = s(x - i);
      const fy = s(y - j);
      const a = v(i, j) + (v(i + 1, j) - v(i, j)) * fx;
      const b = v(i, j + 1) + (v(i + 1, j + 1) - v(i, j + 1)) * fx;
      return a + (b - a) * fy;
    };
  }
  function digital(ctx, { cx, cy, rx, ry, de, ate, passo = 19, alfa = 0.17, semente = 29 }) {
    const x0 = Math.max(0, Math.floor(cx - rx - 20));
    const x1 = Math.min(L, Math.ceil(cx + rx + 20));
    const y0 = Math.max(0, Math.floor(Math.max(de, cy - ry - 20)));
    const y1 = Math.min(A, Math.ceil(Math.min(ate, cy + ry + 20)));
    const w = x1 - x0;
    const h = y1 - y0;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const k = c.getContext('2d');
    const img = k.createImageData(w, h);
    const d = img.data;
    const n1 = ruidoSuave(semente);
    const n2 = ruidoSuave(semente + 1);
    const n3 = ruidoSuave(semente + 2);
    const n4 = ruidoSuave(semente + 3);
    const n5 = ruidoSuave(semente + 4);
    const n6 = ruidoSuave(semente + 5);
    // as minúcias: num anel entre o núcleo e a borda, metade para cada lado
    const r = sorteio(semente + 7);
    const minucias = [];
    for (let i = 0; minucias.length < 14 && i < 400; i++) {
      const a = r() * Math.PI * 2;
      const q = 0.25 + r() * 0.62;
      const p = [cx + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q, minucias.length % 2 ? 1 : -1];
      // longe umas das outras: duas juntas viram um vinco, não uma bifurcação
      if (minucias.every(([x, y]) => Math.hypot(x - p[0], y - p[1]) > 190)) minucias.push(p);
    }
    const volta = 1 / (Math.PI * 2);
    // o núcleo um pouco acima do meio da oval, como nas digitais
    const nx = cx + 10;
    const ny = cy - ry * 0.12;
    for (let py = 0; py < h; py++) {
      const y = y0 + py;
      // o alto e o pé somem em rampa (o alto encosta nos dias; o pé, no carimbo)
      const borda = Math.min(1, (y - de) / 110, (ate - y) / 110);
      if (borda <= 0) continue;
      for (let px = 0; px < w; px++) {
        const x = x0 + px;
        // o contorno da digital: a oval, com a borda um pouco irregular
        const ex = (x - cx) / rx;
        const ey = (y - cy) / ry;
        const e = Math.sqrt(ex * ex + ey * ey) + n6(x / 140, y / 140) * 0.05;
        const dentro = Math.min(1, (1 - e) / 0.1);
        if (dentro <= 0) continue;
        const wx = x - nx + n1(x / 230, y / 230) * 26;
        const wy = y - ny + n2(x / 230, y / 230) * 26;
        let f = Math.sqrt(wx * wx + (wy / 1.32) * (wy / 1.32)) / passo + Math.atan2(wy, wx) * volta + n3(x / 320, y / 320) * 0.9;
        for (const [mx, my, sinal] of minucias) f += sinal * Math.atan2(y - my, x - mx) * volta;
        const v = Math.cos(f * Math.PI * 2);
        // espessura irregular: o limiar sobe e desce devagar
        const limiar = 0.05 + n4(x / 95, y / 95) * 0.42;
        let a = Math.min(1, Math.max(0, (v - limiar) / 0.3));
        // falhas: trechos curtos em que a crista some (poros e cortes)
        const falha = n5(x / 16, y / 16);
        if (falha > 0.72) a *= Math.max(0, 1 - (falha - 0.72) / 0.08);
        if (!a) continue;
        const i = (py * w + px) * 4;
        d[i] = 235; d[i + 1] = 232; d[i + 2] = 225;
        d[i + 3] = Math.round(255 * alfa * a * dentro * borda);
      }
    }
    k.putImageData(img, 0, 0);
    ctx.drawImage(c, x0, y0);
  }
  function arteQuemDeusDiz(ctx) {
    const claro = '#ebe8e1';
    const cx = L / 2;
    const cy = 1720;
    // a digital atrás do texto: centrada na frase, passando das pontas das linhas
    digital(ctx, { cx, cy: 900, rx: 500, ry: 660, de: 470, ate: 1500 });
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

  // ---------- (t) Inundados pelo amor de Deus: a água subindo dentro do AMOR ----------
  // Ezequiel 47.1-9: o rio que sai do templo e vai enchendo, primeiro até o tornozelo,
  // depois até o joelho, a cintura, e por fim dá para nadar. Cada letra de AMOR é um desses
  // passos: a água (azul-esverdeado) sobe de letra em letra, com a onda na linha d'água, e a
  // parte de cima continua creme. Sem citar o texto.
  const AGUA = { funda: '#3f8f86', clara: '#7cc8bb' };
  function arteInundados(ctx) {
    const branco = '#f4f1ea';
    const oswald = (t) => '700 ' + t + 'px Oswald, sans-serif';
    S.escrever(ctx, 'INUNDADOS PELO', L / 2, 660, oswald(58), branco, { espaco: 58 * 0.14 });
    ctx.font = oswald(100);
    const palavra = 'AMOR';
    const tam = 100 * 940 / ctx.measureText(palavra).width;
    const base = 700 + tam * 0.86;
    // a palavra numa camada: o creme, e a água pintada só por cima das letras
    const { c, ctx: k } = camada();
    k.font = oswald(tam);
    const larg = k.measureText(palavra).width;
    const alto = k.measureText(palavra).actualBoundingBoxAscent;
    S.escrever(k, palavra, L / 2, base, oswald(tam), branco);
    // as divisas entre as letras: no meio do vão entre uma e a outra
    const x0 = L / 2 - larg / 2;
    const fim = [];
    for (let i = 1; i <= palavra.length; i++) fim.push(x0 + k.measureText(palavra.slice(0, i)).width);
    const divisa = [x0 - 20, ...fim.slice(0, -1), x0 + larg + 20];
    // tornozelo, joelho, cintura e nado: a fração da altura da letra coberta de água
    const niveis = [0.2, 0.4, 0.6, 0.82];
    const onda = (x, i) => Math.sin(x / tam * 9.5 + i * 1.7) * tam * 0.022 + Math.sin(x / tam * 23 + i) * tam * 0.008;
    k.globalCompositeOperation = 'source-atop';
    palavra.split('').forEach((_, i) => {
      const nivel = base - alto * niveis[i];
      const a = divisa[i];
      const b = divisa[i + 1];
      const corpo = new Path2D();
      corpo.moveTo(a, base + 40);
      for (let x = a; x <= b; x += 4) corpo.lineTo(x, nivel + onda(x, i));
      corpo.lineTo(b, base + 40);
      corpo.closePath();
      const g = k.createLinearGradient(0, nivel, 0, base);
      g.addColorStop(0, AGUA.clara);
      g.addColorStop(1, AGUA.funda);
      k.fillStyle = g;
      k.fill(corpo);
      // a crista: uma linha mais clara na linha d'água e outra, fina, logo abaixo
      k.strokeStyle = '#c9ece4';
      k.lineWidth = tam * 0.014;
      k.lineCap = 'round';
      for (const [dy, alfa, fator] of [[0, 1, 1], [tam * 0.07, 0.4, 0.6]]) {
        k.globalAlpha = alfa;
        k.lineWidth = tam * 0.014 * fator;
        k.beginPath();
        for (let x = a; x <= b; x += 4) k[x === a ? 'moveTo' : 'lineTo'](x, nivel + dy + onda(x + tam * 0.3, i));
        k.stroke();
      }
      k.globalAlpha = 1;
    });
    ctx.drawImage(c, 0, 0);
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

  // ---------- as cores e peças da landing (entrar.html) ----------
  // A paleta, o Oswald, o preto com grão, o título com sombra e a coroa à mão da landing, que
  // as artes do fim do arquivo usam. As fotos (story-foto-<nome>) vêm com as artes; sem elas,
  // o modelo sai só com a tipografia, que se lê sozinha.
  const LP = { preto: '#0d0e0c', faixa: '#171815', creme: '#f2efdc', texto: '#c9cabd', fraco: '#a3a69a',
    salvia: '#c8da8c', salviaEscura: '#9fb266', amarelo: '#ffc44d', tinta: '#12130f' };
  const oswaldLP = (t, peso = 700) => peso + ' ' + t + 'px Oswald, "Arial Narrow", sans-serif';
  // O tamanho em que a linha ocupa a largura dada (no máximo tamMax).
  function tamanhoPara(ctx, texto, largura, tamMax, peso = 700) {
    ctx.font = oswaldLP(100, peso);
    return Math.min(tamMax, 100 * largura / ctx.measureText(texto).width);
  }
  // O fundo da landing: o preto com duas luzes acinzentadas bem fracas.
  function fundoLanding(ctx) {
    ctx.fillStyle = LP.preto;
    ctx.fillRect(0, 0, L, A);
    for (const [x, y, rx, ry, a] of [[L * 0.85, 300, 620, 520, 0.07], [L * 0.1, 1100, 560, 640, 0.05]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, 'rgba(200,204,190,' + a + ')');
      g.addColorStop(1, 'rgba(200,204,190,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    }
  }
  // Uma linha do título: Oswald 700 maiúscula, com a sombra escura da landing por baixo
  // (text-shadow 0 2px 18px). Devolve a largura.
  function tituloLanding(ctx, texto, x, y, tam, cor, { alinhar = 'center', peso = 700, espaco = 0 } = {}) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = tam * 0.12;
    ctx.shadowOffsetY = 4;
    S.escrever(ctx, texto, x, y, oswaldLP(tam, peso), cor, { alinhar, espaco });
    ctx.restore();
    ctx.font = oswaldLP(tam, peso);
    return ctx.measureText(texto).width + espaco * Math.max(0, texto.length - 1);
  }
  // A coroa à mão da landing (.lp-coroa: o zigue-zague com a base), com o meio da base em
  // (x, y), largura w e o giro dela.
  function coroaLanding(ctx, x, y, w, giro, cor = LP.salvia) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    ctx.scale(w / 120, w / 120);
    ctx.translate(-60, -74);
    ctx.strokeStyle = cor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 7;
    ctx.stroke(new Path2D('M10 74 6 22l26 26L58 6l22 40 30-22-6 50z'));
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 3;
    ctx.stroke(new Path2D('M12 70c30-4 60-5 92-1M17 60l-4-30M101 61l4-30'));
    ctx.restore();
  }

  // ---------- o traço à mão; Jesus para as nações no padrão dos posts da marca ----------
  // O traço à mão: os pontos ligados por curvas, cada um mexido um pouco pelo sorteio, em
  // duas passadas (a grossa e uma fina e mais fraca, um pouco ao lado), como a coroa da
  // landing. fechar: liga o último ao primeiro.
  function tracoAMao(ctx, pts, { r, tremor = 3, largura = 7, cor = LP.salvia, fechar = false, segunda = true }) {
    const passada = (dx, dy, lw, alfa) => {
      const q = pts.map(([x, y]) => [x + dx + (r() - 0.5) * tremor, y + dy + (r() - 0.5) * tremor]);
      if (fechar) q.push(q[0], q[1]);
      ctx.save();
      ctx.globalAlpha = alfa;
      ctx.strokeStyle = cor;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(q[0][0], q[0][1]);
      for (let i = 1; i < q.length - 1; i++) {
        ctx.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2);
      }
      if (!fechar) ctx.lineTo(q[q.length - 1][0], q[q.length - 1][1]);
      ctx.stroke();
      ctx.restore();
    };
    passada(0, 0, largura, 1);
    if (segunda) passada(largura * 0.45, largura * 0.35, largura * 0.4, 0.5);
  }
  // Os pontos de uma elipse (de a até b, em radianos), com a borda um pouco irregular.
  function pontosElipse(cx, cy, rx, ry, { de = 0, ate = Math.PI * 2, n = 36, r, mexe = 0 } = {}) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = de + (ate - de) * i / n;
      const k = 1 + (r ? (r() - 0.5) * mexe : 0);
      pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
    }
    return pts;
  }

  // (z0) Jesus para as nações: no padrão dos posts da marca Geração Eleita (o dono pediu
  // "mais a cara dele"), com a foto do dono (as mãos dos jovens sobre a bandeira) de fundo
  // do story inteiro: em P&B, escurecida, com vinheta e grão. Ela é pequena (486 px) e borra
  // ampliada; o desfoque leve, de propósito, com o grão por cima, faz dela um fundo e deixa
  // a frase na frente. Por cima: os pedaços de papel rasgado nos cantos com a borda branca,
  // as pinceladas sálvia e branca, a frase em Permanent Marker preto com cada linha numa tira
  // de papel sálvia colada, desencontradas, a cruz e a coroa brancas à mão e o risco de pincel
  // branco embaixo. Sem referência: nenhum versículo diz isso com estas palavras na NBV.
  // A foto de fundo de toda a área do meio, do topo ao pé, atrás dos papéis dos cantos:
  // na largura do story (2,4 vezes), com a bandeira na metade de cima, logo abaixo dos dias;
  // como a foto ampliada não chega ao pé, o pé dela continua espelhado e mais borrado (some
  // sob o escuro, atrás das tiras e da marca). Depois, o escuro por cima, mais forte no pé,
  // e a vinheta.
  function fotoDeFundo(ctx, img) {
    const w = L + 90;
    const h = w * img.height / img.width;
    const x = (L - w) / 2;
    const y = -20;
    const borra = (w / img.width * 1.1).toFixed(1);
    ctx.fillStyle = '#0e0e0d';
    ctx.fillRect(0, 0, L, A);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = 'grayscale(1) contrast(1.08) blur(' + borra + 'px)';
    ctx.drawImage(img, x, y, w, h);
    ctx.filter = 'grayscale(1) contrast(1.08) blur(' + (borra * 3).toFixed(1) + 'px)';
    ctx.translate(0, 2 * (y + h));
    ctx.scale(1, -1);
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    ctx.fillStyle = 'rgba(8,8,7,.5)';
    ctx.fillRect(0, 0, L, A);
    const pe = ctx.createLinearGradient(0, h - 260, 0, A);
    pe.addColorStop(0, 'rgba(8,8,7,0)');
    pe.addColorStop(1, 'rgba(8,8,7,.6)');
    ctx.fillStyle = pe;
    ctx.fillRect(0, h - 260, L, A);
    const g = ctx.createRadialGradient(L / 2, A * 0.42, A * 0.24, L / 2, A * 0.46, A * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.7)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
  }
  // Um polígono de borda rasgada: os pontos de cada lado (de canto a canto) mexidos para
  // fora e para dentro, numa onda larga e irregular (a soma de três senos de fase sorteada)
  // com a fibra miúda por cima. lados: [[de, ate, tremor]]; devolve o Path2D.
  function bordaRasgada(lados, r, passo = 14) {
    const p = new Path2D();
    let primeiro = true;
    for (const [de, ate, tremor] of lados) {
      const comp = Math.hypot(ate[0] - de[0], ate[1] - de[1]);
      const n = Math.max(1, Math.ceil(comp / passo));
      const nx = -(ate[1] - de[1]) / comp;
      const ny = (ate[0] - de[0]) / comp;
      const fase = [r(), r(), r()].map((v) => v * Math.PI * 2);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const s = comp * t / 100;
        const onda = Math.sin(s * 0.9 + fase[0]) * 0.5 + Math.sin(s * 2.3 + fase[1]) * 0.3 + Math.sin(s * 5.1 + fase[2]) * 0.2;
        const j = i ? tremor * (onda * 0.42 + (r() - 0.5) * 0.14) : 0;
        const x = de[0] + (ate[0] - de[0]) * t + nx * j;
        const y = de[1] + (ate[1] - de[1]) * t + ny * j;
        if (primeiro) { p.moveTo(x, y); primeiro = false; } else p.lineTo(x, y);
      }
    }
    p.closePath();
    return p;
  }
  // Os pedaços de papel cinza rasgado dos cantos: a fibra branca aparece na borda rasgada
  // (o papel branco por baixo, com outro rasgo), e o cinza tem vincos claros e escuros.
  function papelDoCanto(ctx, de, ate, fecho, r) {
    const lados = (tremor, desloca) => {
      const l = [[[de[0] + desloca[0], de[1] + desloca[1]], [ate[0] + desloca[0], ate[1] + desloca[1]], tremor]];
      let ant = [ate[0] + desloca[0], ate[1] + desloca[1]];
      for (const q of fecho) { l.push([ant, q, 0]); ant = q; }
      l.push([ant, [de[0] + desloca[0], de[1] + desloca[1]], 0]);
      return l;
    };
    const nx = -(ate[1] - de[1]);
    const ny = ate[0] - de[0];
    const n = Math.hypot(nx, ny);
    const fora = [nx / n * 12, ny / n * 12];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#e9e8e1';
    ctx.fill(bordaRasgada(lados(44, fora), r, 4));
    ctx.restore();
    const cinza = bordaRasgada(lados(22, [0, 0]), r, 12);
    ctx.fillStyle = '#353533';
    ctx.fill(cinza);
    ctx.save();
    ctx.clip(cinza);
    ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      ctx.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.3)';
      ctx.lineWidth = 1 + r() * 1.5;
      ctx.beginPath();
      let x = Math.min(de[0], ate[0]) + r() * Math.abs(ate[0] - de[0] || L);
      let y = Math.min(de[1], ate[1]) + r() * Math.abs(ate[1] - de[1] || A);
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 150; y += (r() - 0.5) * 150; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }
  // A pincelada seca: muitos fios de tinta encavalados, os da beira mais curtos, e depois
  // as falhas (riscos finos tirados da tinta), como o pincel quase sem tinta dos posts.
  // (x, y) é o meio da pincelada, w o comprimento, h a grossura.
  function pincelSeco(ctx, x, y, w, h, ang, cor, r, fios = 18) {
    const { c, ctx: k } = camada();
    k.translate(x, y);
    k.rotate(ang);
    k.strokeStyle = cor;
    k.lineCap = 'round';
    const n = fios * 2;
    for (let i = 0; i < n; i++) {
      const fy = -h / 2 + h * (i + r()) / n;
      const borda = Math.abs(fy) / (h / 2);
      const x0 = -w / 2 + r() * w * (0.02 + borda * borda * 0.35);
      const x1 = w / 2 - r() * w * (0.02 + borda * borda * 0.4);
      k.globalAlpha = 0.7 + r() * 0.3;
      k.lineWidth = h / n * (1.6 + r() * 1.4);
      k.beginPath();
      k.moveTo(x0, fy);
      k.quadraticCurveTo((x0 + x1) / 2, fy + (r() - 0.5) * h * 0.12, x1, fy + (r() - 0.5) * h * 0.18);
      k.stroke();
    }
    k.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < fios; i++) {
      const fy = -h / 2 + r() * h;
      const x0 = -w / 2 + r() * w * 0.7;
      k.globalAlpha = 0.5 + r() * 0.5;
      k.lineWidth = 0.8 + r() * 1.6;
      k.beginPath();
      k.moveTo(x0, fy);
      k.lineTo(x0 + w * (0.1 + r() * 0.4), fy + (r() - 0.5) * 3);
      k.stroke();
    }
    ctx.drawImage(c, 0, 0);
  }
  // Uma linha da frase na tira de papel sálvia colada: a borda de cima e de baixo um pouco
  // irregular, as pontas rasgadas, a sombra curta de papel colado, manchas e vincos fracos no
  // papel, e a letra de pincel preta (Permanent Marker, engrossada como no carimbo do app).
  // (x, y) é o canto de cima à esquerda; devolve a largura da tira.
  function tiraSalvia(ctx, texto, x, y, tam, giro, r, { papel = LP.salvia, tinta = LP.tinta, fonte = '600 ' + tam + 'px "Permanent Marker", cursive', borda = 'rgba(240,248,215,.55)' } = {}) {
    ctx.font = fonte;
    const wt = ctx.measureText(texto).width;
    const w = wt + tam * 0.9;
    const h = tam * 1.3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    const p = bordaRasgada([[[0, 0], [w, 0], 4], [[w, 0], [w, h], 12], [[w, h], [0, h], 4], [[0, h], [0, 0], 12]], r, 12);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = papel;
    ctx.fill(p);
    ctx.restore();
    ctx.save();
    ctx.clip(p);
    for (let i = 0; i < 10; i++) {
      const mx = r() * w;
      const my = r() * h;
      const raio = 30 + r() * 90;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, raio);
      const escuro = r() < 0.6;
      g.addColorStop(0, escuro ? 'rgba(70,90,30,.12)' : 'rgba(255,255,240,.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(mx - raio, my - raio, raio * 2, raio * 2);
    }
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = r() < 0.5 ? 'rgba(60,75,25,.18)' : 'rgba(255,255,245,.3)';
      ctx.beginPath();
      const vx = r() * w;
      ctx.moveTo(vx, 0);
      ctx.lineTo(vx + (r() - 0.5) * 120, h);
      ctx.stroke();
    }
    ctx.restore();
    // a borda do papel: uma linha clara fina, de papel cortado
    ctx.strokeStyle = borda;
    ctx.lineWidth = 2;
    ctx.stroke(p);
    S.escrever(ctx, texto, tam * 0.45, h * 0.5 + tam * 0.36, fonte, tinta, { alinhar: 'left', espaco: tam * 0.02 });
    ctx.restore();
    return w;
  }
  // A cruz e a coroa brancas, à mão, como os rabiscos dos posts.
  function cruzBranca(ctx, x, y, s, r) {
    tracoAMao(ctx, [[x + s * 0.02, y - s * 0.55], [x, y], [x - s * 0.03, y + s * 0.62]], { r, largura: s * 0.11, cor: LP.creme, segunda: false });
    tracoAMao(ctx, [[x - s * 0.34, y - s * 0.22], [x, y - s * 0.24], [x + s * 0.36, y - s * 0.27]], { r, largura: s * 0.11, cor: LP.creme, segunda: false });
  }
  function coroaBranca(ctx, x, y, w, giro, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    const k = w / 120;
    const pt = (a, b) => [a * k, b * k];
    // as três pontas, com a do meio mais alta, e a base em dois riscos
    const traco = { r, largura: 7 * k, cor: LP.creme, segunda: false, tremor: 2.5 };
    tracoAMao(ctx, [pt(10, 84), pt(2, 26)], traco);
    tracoAMao(ctx, [pt(2, 26), pt(34, 58)], traco);
    tracoAMao(ctx, [pt(34, 58), pt(60, 4)], traco);
    tracoAMao(ctx, [pt(60, 4), pt(86, 56)], traco);
    tracoAMao(ctx, [pt(86, 56), pt(118, 22)], traco);
    tracoAMao(ctx, [pt(118, 22), pt(108, 84)], traco);
    tracoAMao(ctx, [pt(4, 98), pt(60, 94), pt(116, 97)], { ...traco, largura: 6 * k });
    tracoAMao(ctx, [pt(12, 112), pt(62, 109), pt(108, 111)], { ...traco, largura: 5 * k });
    ctx.restore();
  }
  function arteNacoes(ctx, fotos) {
    const r = sorteio(2819);
    if (fotos.nacoes) fotoDeFundo(ctx, fotos.nacoes);
    else { ctx.fillStyle = '#0e0e0d'; ctx.fillRect(0, 0, L, A); }
    // os papéis rasgados por cima, nos cantos, como moldura; depois a frase e os rabiscos
    papelDoCanto(ctx, [790, 0], [1080, 430], [[1080, 0]], r);
    papelDoCanto(ctx, [270, 1920], [0, 1430], [[0, 1920]], r);
    pincelSeco(ctx, 1040, 960, 330, 64, -1.2, LP.salvia, r, 20);
    pincelSeco(ctx, 1000, 1290, 230, 40, -0.4, LP.creme, r, 14);
    cruzBranca(ctx, 150, 1000, 130, r);
    const tam = 124;
    const y1 = 1110;
    const w1 = tiraSalvia(ctx, 'JESUS PARA', 84, y1, tam, -0.025, r);
    const w2 = tiraSalvia(ctx, 'AS NAÇÕES', 150, y1 + tam * 1.3 - 6, tam, 0.015, r);
    pincelSeco(ctx, 106 + Math.max(w1, w2) / 2, y1 + tam * 2.6 + 44, Math.max(w1, w2) * 0.86, 34, -0.015, LP.creme, r, 14);
    coroaBranca(ctx, 905, 1410, 140, 0.14, r);
  }

  // ---------- a ofensiva no topo, a arte no meio, a marca no pé ----------
  // A ofensiva continua em destaque em todo modelo: a chama do app e o número de dias no
  // alto, como no story de sempre. A arte vem abaixo, na faixa do meio (Z0 a Z1); a que foi
  // desenhada mais alta encolhe por igual para caber, centrada na faixa. O pé é só a marca.
  const Z0 = 560;
  const Z1 = 1480; // 75px de respiro até a marca, igual em todos
  // A chama e os dias no alto. Por padrão centrados e grandes; um modelo pode encostar na
  // margem (tema.alinhar: 'esquerda' ou 'direita') e diminuir (tema.escala), para a ofensiva
  // aparecer sem virar o assunto da arte.
  function cabecalho(ctx, dias, tema) {
    const k = tema.escala || 1;
    const hc = 132 * k;
    const base = 296 + hc;
    const tam = 150 * k;
    ctx.font = S.Mn(800, tam);
    const wn = ctx.measureText(String(dias)).width;
    const wc = hc * 0.7;
    const vao = 22 * k;
    const margem = 90;
    const x0 = tema.alinhar === 'esquerda' ? margem : tema.alinhar === 'direita' ? L - margem - (wc + vao + wn) : L / 2 - (wc + vao + wn) / 2;
    if (tema.brilho && dias) {
      const g = ctx.createRadialGradient(x0 + wc / 2, base - hc * 0.45, 0, x0 + wc / 2, base - hc * 0.45, hc * 1.3);
      g.addColorStop(0, 'rgba(255,122,82,.30)');
      g.addColorStop(1, 'rgba(255,122,82,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0 - hc, base - hc * 2, hc * 3, hc * 3);
    }
    S.chama(ctx, x0 + wc / 2, base, hc, !dias, tema.apagada);
    S.escrever(ctx, String(dias), x0 + wc + vao, base - 4 * k, S.Mn(800, tam), dias ? tema.numero : tema.apagada, { alinhar: 'left', espaco: -6 * k });
    const rotulo = dias === 1 ? 'dia de ofensiva' : 'dias de ofensiva';
    const yr = base + 62 * k;
    const fr = S.Mn(700, 44 * k);
    if (tema.alinhar === 'esquerda') S.escrever(ctx, rotulo, x0, yr, fr, tema.rotulo, { alinhar: 'left' });
    else if (tema.alinhar === 'direita') S.escrever(ctx, rotulo, L - margem, yr, fr, tema.rotulo, { alinhar: 'right' });
    else S.escrever(ctx, rotulo, L / 2, yr, fr, tema.rotulo);
  }
  const ESCURO = { numero: '#ff9a7a', rotulo: '#eef0ea', apagada: '#a4a99d', marca: '#f4f1ea', marcaFraca: '#a9a49a', brilho: true };
  // os do padrão da landing: o número em amarelo, o resto em creme
  const TEMA_LP = { ...ESCURO, numero: LP.amarelo, rotulo: LP.creme, marca: LP.creme, marcaFraca: LP.fraco };
  const CLARO = { numero: '#d2401c', rotulo: '#1d1b19', apagada: '#8a8f84', marca: '#161514', marcaFraca: '#6d5446' };
  // os revistos (o bloco do fim do arquivo): o papel claro, o amarelo cheio e a sálvia cheia
  const TEMA_PAPEL = { ...CLARO, numero: '#b8341a', marcaFraca: '#5c5a52' };
  const TEMA_AMARELO = { numero: '#151512', rotulo: '#151512', apagada: '#6b5a2c', marca: '#151512', marcaFraca: '#4a3d1a' };
  const TEMA_SALVIA = { numero: '#151512', rotulo: '#151512', apagada: '#5d6b3c', marca: '#151512', marcaFraca: '#3d4526' };
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
    avivados: { fundo: [LP.amarelo], fotos: ['culto'], tema: TEMA_AMARELO, desenhar: arteAvivados, grao: [14, 1126] },
    naotemas: { fundo: ['#ebe7dc'], fotos: ['cruz'], tema: TEMA_PAPEL, desenhar: arteNaoTemas, grao: [12, 4110] },
    rei: { fundo: [LP.salvia], fotos: ['abertura'], tema: TEMA_SALVIA, desenhar: arteRei, grao: [14, 777] },
    nacoes: { fundo: [LP.preto], fotos: ['nacoes'], tema: TEMA_LP, desenhar: arteNacoes, grao: [26, 2819] },
    relogio: { fundo: ['#0f110e'], tema: { ...TEMA_LP, brilho: false }, desenhar: arteRelogio, grao: [18, 1617] },
    toco: { fundo: ['#f0e9d8'], tema: TEMA_PAPEL, desenhar: arteToco, grao: [18, 1479] },
    porta: { fundo: ['#ebe0cb', { x: L / 2, y: 1100, r: 1000, cor: 'rgba(255,248,230,.5)' }], caixa: [600, 1640], tema: CLARO, desenhar: artePorta, grao: [16, 320] },
    // quarta leva (o bloco perto do fim do arquivo; as revistas no último bloco)
    influenciam: { fundo: [LP.preto], fotos: ['influenciam'], tema: { ...TEMA_LP, brilho: false }, desenhar: arteInfluenciam, grao: [18, 5131] },
    diferenca: { fundo: ['#efece3'], tema: TEMA_PAPEL, desenhar: arteDiferenca, grao: [12, 1308] },
    vivoporele: { fundo: [LP.preto], tema: { ...TEMA_LP, marca: '#151512', marcaFraca: '#4a3d1a', brilho: false }, desenhar: arteVivoPorEle, grao: [18, 2203] },
    jesusvive: { fundo: [LP.preto], tema: TEMA_LP, desenhar: arteJesusVive, grao: [18, 3111] },
    testemunho: { fundo: ['#0d0f0c'], tema: { ...TEMA_LP, brilho: false }, desenhar: arteTestemunho, grao: [18, 4747] },
    virgula: { fundo: ['#efe9d9', { x: L * 0.3, y: 700, r: 1100, cor: 'rgba(255,253,245,.55)' }], desenhar: arteVirgula, grao: [14, 1712],
      tema: { ...CLARO, numero: LP.tinta, rotulo: LP.tinta, apagada: '#8a877c', marca: LP.tinta, marcaFraca: '#57554c', escala: 0.72 } },
    semente: { fundo: [LP.salvia, { x: L * 0.7, y: 500, r: 1000, cor: 'rgba(240,248,215,.35)' }], desenhar: arteSemente, grao: [16, 1606],
      tema: { ...CLARO, numero: LP.tinta, rotulo: LP.tinta, apagada: '#6b7550', marca: LP.tinta, marcaFraca: '#3d4625', escala: 0.8 } },
    caminho: { fundo: [LP.preto], tema: { ...TEMA_LP, escala: 0.75, marcaX: 90 }, desenhar: arteCaminho, grao: [18, 1414] },
    brasas: { fundo: ['#0b0b0a'], tema: { ...TEMA_LP, escala: 0.75, marcaX: 84 }, desenhar: arteBrasas, grao: [20, 1990] },
    // sexta leva (rodada 13): a pista, o fundo do mar, a bússola e a limalha
    chegada: { fundo: [LP.salvia], tema: { ...TEMA_SALVIA, escala: 0.78, marcaX: 380 }, desenhar: arteChegada, grao: [14, 1300] },
    ancora: { fundo: ['#0f1916'], tema: { ...TEMA_LP, escala: 0.8 }, desenhar: arteAncora, grao: [16, 1310] },
    bussola: { fundo: [LP.amarelo], tema: { ...TEMA_AMARELO, escala: 0.8 }, desenhar: arteBussola, grao: [12, 1320] },
    ima: { fundo: ['#ecebe4'], tema: { ...TEMA_PAPEL, escala: 0.8, marcaX: 90 }, desenhar: arteIma, grao: [12, 1330] },
    // sétima leva (rodada 14): as ondas na água, o envelope aéreo, a grade quebrada e a rasura
    ondas: { fundo: [LP.salvia], tema: { ...TEMA_SALVIA, escala: 0.8 }, desenhar: arteConhecer, grao: [14, 1400] },
    envelope: { fundo: ['#f1ece0'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: artePregarao, grao: [12, 1410] },
    molde: { fundo: [LP.amarelo], tema: { ...TEMA_AMARELO, escala: 0.8 }, desenhar: arteInconformada, grao: [12, 1420] },
    rasura: { fundo: [LP.preto], tema: { ...TEMA_LP, escala: 0.8, marcaX: 86 }, desenhar: arteTudo, grao: [18, 1430] },
    // oitava leva (rodada 15): a aura, o caderno pontilhado, o gráfico e a alvorada sobre o mar
    aura: { fundo: [LP.preto], tema: { ...TEMA_LP, escala: 0.8 }, desenhar: arteNele, grao: [24, 1500] },
    rotina: { fundo: ['#f2eee3'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: arteRotina, grao: [12, 1510] },
    grafico: { fundo: [LP.amarelo], tema: { ...TEMA_AMARELO, escala: 0.8 }, desenhar: arteFracasso, grao: [12, 1520] },
    alvorada: { fundo: ['#080a09'], tema: { ...TEMA_LP, brilho: false, escala: 0.8 }, desenhar: arteVenha, grao: [18, 1530] },
    // nona leva (rodada 16): os jornais espalhados, o celular tocando na mesa, o aviãozinho e a
    // sombra, a porta acesa, o círculo de Jesus salva, a lâmpada saleiro, a estampa do
    // controle, o DEUS impresso, a etiqueta e o adesivo do cubo
    noticia: { fundo: ['#d6d3cb'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: arteNoticia, grao: [12, 1600] },
    chamada: { fundo: ['#0e0f0e'], tema: { ...TEMA_LP, brilho: false, escala: 0.8 }, desenhar: arteChamada, grao: [16, 1615] },
    planos: { fundo: ['#d6dbd1'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: artePlanos, grao: [12, 1610] },
    casa: { fundo: ['#0a0c0a'], tema: { ...TEMA_LP, brilho: false, escala: 0.8, marca: LP.tinta, marcaFraca: '#4a3d1a' }, desenhar: arteCasa, grao: [16, 1620] },
    salva: { fundo: [LP.amarelo], tema: { ...TEMA_AMARELO, escala: 0.8 }, desenhar: arteSalva, grao: [12, 1625] },
    salluz: { fundo: ['#f2ead7'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: arteSalLuz, grao: [12, 1640] },
    controle: { fundo: ['#3a3c39'], tema: { ...TEMA_LP, brilho: false, escala: 0.8 }, desenhar: arteControle, grao: [14, 1630] },
    plano: { fundo: ['#e8e3d9'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: artePlano, grao: [12, 1650] },
    meu: { fundo: ['#c4d589'], tema: { ...TEMA_SALVIA, escala: 0.8 }, desenhar: arteMeu, grao: [12, 1645] },
    cubo: { fundo: [LP.amarelo], tema: { ...TEMA_AMARELO, escala: 0.8 }, desenhar: arteCubo, grao: [12, 1655] },
    // décima leva (rodada 17): Jesus de costas com a capa vermelha, as letras ondulando de
    // João 14.6, o coração anatômico gravado nas chamas de tatuagem, a graça repetida com a
    // coroa, o IM levado embora, os olhos de fogo, o selo em relevo do reino e o altar de pedra
    // com o fogo vivo
    heroi: { fundo: ['#eeebe3'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: arteHeroi, grao: [12, 1700] },
    vida: { fundo: ['#efe8d6'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: arteVida, grao: [12, 1710] },
    queimar: { fundo: ['#ece3cf'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: arteQueimar, grao: [12, 1720] },
    graca: { fundo: ['#111310'], tema: { ...TEMA_LP, brilho: false, escala: 0.8 }, desenhar: arteGraca, grao: [16, 1730] },
    impossivel: { fundo: ['#e9dcc4'], fotos: ['impossivel'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: arteImpossivel, grao: [12, 1740] },
    olhos: { fundo: ['#0b0b0a'], tema: { ...TEMA_LP, brilho: false, escala: 0.8 }, desenhar: arteOlhos, grao: [18, 1750] },
    reino: { fundo: [LP.salvia], tema: { ...TEMA_SALVIA, escala: 0.8 }, desenhar: arteReino, grao: [12, 1760] },
    altar: { fundo: ['#10110f'], tema: { ...TEMA_LP, brilho: false, escala: 0.8 }, desenhar: arteAltar, grao: [16, 1770] },
    // décima primeira leva (rodada 18): de dentro da água, a frase afundando
    raso: { fundo: ['#1b6c86'], tema: { ...TEMA_SALVIA, escala: 0.8, marca: LP.creme, marcaFraca: LP.fraco, marcaX: 90 }, desenhar: arteRaso, grao: [14, 1800] },
    acesa: { fundo: ['#dcdcda'], tema: { ...TEMA_PAPEL, numero: '#151514', escala: 0.62 }, desenhar: arteAcesa, grao: [10, 1820] },
    ore: { fundo: ['#dedcd7'], tema: { ...TEMA_PAPEL, numero: '#151514', escala: 0.8 }, desenhar: arteOre, grao: [10, 1830] },
    fe: { fundo: ['#efe8d6'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: arteFe, grao: [12, 1810] },
    ctrl: { fundo: ['#e9e9e6'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: arteCtrl, grao: [10, 1850] },
    liberdade: { fundo: ['#d3d5a2'], tema: { ...TEMA_SALVIA, escala: 0.8 }, desenhar: arteLiberdade, grao: [12, 1860] },
    mana: { fundo: ['#1b1b1b'], tema: { ...TEMA_LP, brilho: false, escala: 0.8 }, desenhar: arteMana, grao: [14, 1870] },
    offline: { fundo: ['#f0f0ef'], tema: { ...TEMA_PAPEL, escala: 0.8 }, desenhar: arteOffline, grao: [10, 1880] },
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
  // foto: a foto é o fundo inteiro (comFoto); fotos: as que o desenho usa no meio da arte
  const fotosDe = (nome) => (MODELOS[nome] ? [MODELOS[nome].foto].concat(MODELOS[nome].fotos || []).filter(Boolean) : []);
  const prepararArte = (nome) => Promise.all(fotosDe(nome).map(carregarFoto)).then((l) => l.every(Boolean));
  const fotoPronta = (chave) => !(window.STORY_FOTOS || {})[chave] || !!fotos[chave];
  const arteCompleta = (nome) => fotosDe(nome).every(fotoPronta);
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
      m.desenhar(ctx, fotos);
      ctx.restore();
      cabecalho(ctx, dias, m.tema);
      grao(ctx, m.grao[0], m.grao[1]);
      S.marca(ctx, PE, { cor: m.tema.marca, corFraca: m.tema.marcaFraca, x: m.tema.marcaX });
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

  // ---------- quarta leva (2026-10-11) ----------
  // Jesus vive (os recortes de revista) e as peças dele. As funções moram aqui, num bloco só
  // delas (as declarações sobem, então a lista de modelos lá em cima já as conhece).

  // Jesus vive: letras de recorte de revista, cada uma num papel de cor e letra diferentes,
  // tortas e coladas com sombra, em tons quentes e sálvia sobre o preto com grão; entre as
  // duas palavras, a Bíblia aberta à mão em sálvia (no lugar da foto da referência, que é de
  // terceiros). Sem referência.
  const PAPEIS = [
    { papel: LP.amarelo, tinta: LP.tinta },
    { papel: '#f2efdc', tinta: '#7a2e22' },
    { papel: '#c8553d', tinta: '#f6ead2' },
    { papel: LP.salvia, tinta: LP.tinta },
    { papel: '#e8a25a', tinta: '#2a1a10' },
    { papel: '#5a2a24', tinta: '#ffd58a' },
    { papel: '#d9c3a0', tinta: '#3b2a1c' },
    { papel: '#9fb266', tinta: '#f7f2df' },
    { papel: '#efe2c4', tinta: '#c8553d' },
  ];
  const LETRAS_RECORTE = [
    (t) => '700 ' + t + 'px Oswald, "Arial Narrow", sans-serif',
    (t) => '600 ' + t + 'px Literata, Georgia, serif',
    (t) => '400 ' + t + 'px "Permanent Marker", cursive',
    (t) => '800 ' + t + 'px Manrope, sans-serif',
    (t) => 'italic 600 ' + t + 'px Literata, Georgia, serif',
    (t) => '500 ' + t + 'px Oswald, "Arial Narrow", sans-serif',
  ];
  // Uma letra recortada: o papel (um quadrilátero meio torto, às vezes com um lado picotado)
  // centrado em (x, y), girado, com a sombra de papel colado, e a letra por cima.
  function recorte(ctx, letra, x, y, { alt, papel, tinta, fonte, giro, r, largura = 1, minuscula = false }) {
    const txt = minuscula ? letra.toLowerCase() : letra;
    const tam = alt * (minuscula ? 0.95 : 0.8);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    ctx.font = fonte(tam);
    ctx.textAlign = 'center';
    const m = ctx.measureText(txt);
    const w = Math.max(alt * 0.62, m.width + alt * 0.26) * largura;
    const h = alt;
    const j = () => (r() - 0.5) * alt * 0.07;
    const cantos = [[-w / 2 + j(), -h / 2 + j()], [w / 2 + j(), -h / 2 + j()], [w / 2 + j(), h / 2 + j()], [-w / 2 + j(), h / 2 + j()]];
    const p = new Path2D();
    p.moveTo(cantos[0][0], cantos[0][1]);
    const picotado = Math.floor(r() * 6); // 0 a 3: esse lado sai picotado; 4 e 5: nenhum
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = cantos[i];
      const [bx, by] = cantos[(i + 1) % 4];
      if (i === picotado) {
        const n = 9;
        for (let k = 1; k < n; k++) {
          const t = k / n;
          const dente = (k % 2 ? 1 : -1) * alt * 0.025;
          const nx = -(by - ay) / Math.hypot(bx - ax, by - ay);
          const ny = (bx - ax) / Math.hypot(bx - ax, by - ay);
          p.lineTo(ax + (bx - ax) * t + nx * dente, ay + (by - ay) * t + ny * dente);
        }
      }
      p.lineTo(bx, by);
    }
    p.closePath();
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = alt * 0.1;
    ctx.shadowOffsetX = alt * 0.025;
    ctx.shadowOffsetY = alt * 0.05;
    ctx.fillStyle = papel;
    ctx.fill(p);
    ctx.shadowColor = 'rgba(0,0,0,0)';
    // um pouco de textura de papel: uma faixa mais clara de um lado
    ctx.save();
    ctx.clip(p);
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, 'rgba(255,255,255,.14)');
    g.addColorStop(0.6, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,.12)');
    ctx.fillStyle = g;
    ctx.fillRect(-w, -h, w * 2, h * 2);
    ctx.restore();
    // a letra, centrada pela altura das maiúsculas
    const asc = m.actualBoundingBoxAscent || tam * 0.7;
    const desc = m.actualBoundingBoxDescent || 0;
    ctx.fillStyle = tinta;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(txt, (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2, (asc - desc) / 2);
    ctx.restore();
    return w;
  }
  // Uma palavra de recortes, centrada em cx: cada letra com o seu papel (índice em PAPEIS),
  // a sua letra (índice em LETRAS_RECORTE) e, às vezes, minúscula; o tamanho, o giro e a
  // altura variam pelo sorteio. Encolhe por igual se passar da largura.
  function palavraRecortada(ctx, letras, cx, cy, alt, { r, larguraMax }) {
    const planos = letras.map(([l, papel, fonte, minuscula]) => ({ l, ...PAPEIS[papel], fonte: LETRAS_RECORTE[fonte], minuscula: !!minuscula,
      giro: (r() - 0.5) * 0.36, dy: (r() - 0.5) * alt * 0.22, a: alt * (0.86 + r() * 0.28) }));
    ctx.save();
    const larg = planos.map((p) => {
      ctx.font = p.fonte(p.a * (p.minuscula ? 0.95 : 0.8));
      return Math.max(p.a * 0.62, ctx.measureText(p.minuscula ? p.l.toLowerCase() : p.l).width + p.a * 0.26);
    });
    ctx.restore();
    const vao = alt * 0.02;
    let total = larg.reduce((s2, w) => s2 + w, 0) + vao * (larg.length - 1);
    const k = Math.min(1, larguraMax / total);
    total *= k;
    let x = cx - total / 2;
    planos.forEach((p, i) => {
      const w = larg[i] * k;
      recorte(ctx, p.l, x + w / 2, cy + p.dy * k, { alt: p.a * k, papel: p.papel, tinta: p.tinta, fonte: p.fonte, giro: p.giro, r, minuscula: p.minuscula });
      x += w + vao * k;
    });
  }
  // A Bíblia aberta à mão: as duas páginas curvas saindo da lombada, a espessura das folhas
  // embaixo, as linhas do texto em duas colunas e a fita marcadora caindo do meio.
  function bibliaAberta(ctx, cx, cy, w, r) {
    const h = w * 0.52;
    const topo = cy - h / 2;
    const pe = cy + h / 2;
    const meia = w / 2;
    for (const lado of [-1, 1]) {
      const X = (t) => cx + lado * meia * t;
      // a página: a borda de cima sobe da lombada e se arredonda no canto, desce e volta
      // embaixo, afundando de novo na lombada
      tracoAMao(ctx, [[cx, topo + 34], [X(0.2), topo + 6], [X(0.55), topo - 6], [X(0.9), topo + 2], [X(1.0), topo + 22],
        [X(1.01), cy], [X(0.99), pe - 22], [X(0.9), pe - 8], [X(0.55), pe - 18], [X(0.2), pe - 6], [cx, pe + 18]], { r, largura: 6, tremor: 4 });
      // a espessura das folhas, por baixo
      for (let k = 1; k <= 2; k++) {
        tracoAMao(ctx, [[X(0.99) + lado * k * 2, pe - 18 + k * 9], [X(0.9), pe - 4 + k * 10], [X(0.55), pe - 14 + k * 10], [X(0.2), pe - 2 + k * 9], [cx, pe + 18 + k * 7]],
          { r, largura: 3, tremor: 3, segunda: false, cor: 'rgba(200,218,140,' + (0.7 - k * 0.18) + ')' });
      }
      // as linhas do texto: duas colunas por página, seguindo a curva do papel
      const curva = (x) => {
        const t = Math.min(1, Math.abs(x - cx) / meia);
        return t < 0.3 ? 9 * (1 - t / 0.3) : -Math.sin(Math.PI * (t - 0.3) / 0.7) * 5;
      };
      for (let c = 0; c < 2; c++) {
        const x0 = X(0.14 + c * 0.42);
        const x1 = X(0.48 + c * 0.42);
        for (let i = 0; i < 6; i++) {
          const yy = topo + 52 + i * (h - 110) / 5;
          const curto = i === 5 || (i === 2 && c === 1) || (i === 3 && c === 0 && lado > 0) ? 0.5 : 1;
          const xb = x0 + (x1 - x0) * curto;
          tracoAMao(ctx, [[x0, yy + curva(x0)], [(x0 + xb) / 2, yy + curva((x0 + xb) / 2)], [xb, yy + curva(xb)]],
            { r, largura: 2.5, tremor: 2, segunda: false, cor: 'rgba(200,218,140,.5)' });
        }
      }
    }
    // a lombada
    tracoAMao(ctx, [[cx, topo + 34], [cx + 1, cy], [cx, pe + 18]], { r, largura: 4, segunda: false });
    // a fita marcadora, saindo da lombada embaixo, curta, com o corte em V
    const fx = cx + 10;
    const fp = pe + 20;
    tracoAMao(ctx, [[fx, fp - 4], [fx + 6, fp + 28], [fx + 4, fp + 58]], { r, largura: 4, tremor: 1.5, segunda: false });
    tracoAMao(ctx, [[fx + 20, fp - 2], [fx + 25, fp + 30], [fx + 25, fp + 62]], { r, largura: 4, tremor: 1.5, segunda: false });
    tracoAMao(ctx, [[fx + 4, fp + 58], [fx + 15, fp + 48], [fx + 25, fp + 62]], { r, largura: 4, tremor: 1.5, segunda: false });
  }
  function arteJesusVive(ctx) {
    fundoLanding(ctx);
    const r = sorteio(3111);
    const cx = L / 2;
    // [letra, papel, fonte, minúscula]
    palavraRecortada(ctx, [['J', 0, 0], ['E', 5, 4, true], ['S', 3, 1], ['U', 1, 3], ['S', 4, 2]], cx, 712, 180, { r, larguraMax: 860 });
    bibliaAberta(ctx, cx, 992, 460, r);
    palavraRecortada(ctx, [['V', 2, 1], ['I', 6, 0], ['V', 7, 2], ['E', 0, 4]], cx, 1310, 210, { r, larguraMax: 780 });
    return 1460;
  }

  // ---------- revisão das artes no padrão da landing (2026-10-11) ----------
  // O dono achou repetidas as artes feitas "no padrão da landing": todas no quase preto, com
  // o Oswald creme centrado, a última linha em amarelo com o risco de marcador e o desenho no
  // meio. Cada uma ganhou um fundo, uma composição, uma letra e um fechamento próprios
  // (.claude/skills/artes-story): o pôster amarelo (avivados), o papel impresso com a fita
  // sálvia (naotemas), a sálvia cheia com a letra vazada (rei), o texto dentro do relógio com o
  // brilho na meia-noite (relogio), o toco em tinta no papel com a nota à mão (toco), a foto cheia com o
  // texto à direita (influenciam), o cartão de respostas (diferenca), o corte preto e amarelo
  // (vivoporele) e o céu do amanhecer com a fita creme (testemunho). A ideia, as fotos do dono
  // e o texto de cada frase continuam os mesmos.
  const TINTA = '#151512';
  // O tamanho em que o texto ocupa a largura (no máximo max), com o espaço entre letras em
  // fração do tamanho; devolve o tamanho.
  function caber(ctx, texto, fonte, largura, max, espaco = 0) {
    ctx.font = fonte(100);
    const w100 = ctx.measureText(texto).width;
    return Math.min(max, largura / (w100 / 100 + espaco * Math.max(0, texto.length - 1)));
  }
  function larguraDe(ctx, texto, fonte, espaco = 0) {
    ctx.font = fonte;
    return ctx.measureText(texto).width + espaco * Math.max(0, texto.length - 1);
  }
  // Papel claro: a cor lisa com manchas fracas e fibras curtas (o grão vem depois, na arte toda).
  function fundoPapel(ctx, cor, semente) {
    const r = sorteio(semente);
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, L, A);
    for (let i = 0; i < 26; i++) {
      const x = r() * L;
      const y = r() * A;
      const rr = 80 + r() * 260;
      const a = 0.02 + r() * 0.035;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, r() < 0.55 ? 'rgba(120,105,80,' + a.toFixed(3) + ')' : 'rgba(255,255,255,' + (a * 2).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      ctx.strokeStyle = 'rgba(60,50,35,' + (0.04 + r() * 0.07).toFixed(3) + ')';
      ctx.lineWidth = 0.6 + r() * 0.8;
      const x = r() * L;
      const y = r() * A;
      const a = r() * Math.PI;
      const c = 6 + r() * 18;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * c * 0.5 + r() * 4, y + Math.sin(a) * c * 0.5 + r() * 4, x + Math.cos(a) * c, y + Math.sin(a) * c);
      ctx.stroke();
    }
  }
  // A foto numa camada, com filtro; apaga: { cima: [de, ate], baixo, esq, dir }, cada uma
  // uma rampa de 0 a 1 na borda (como as máscaras da landing).
  function camadaFoto(img, x, y, w, filtro, apaga = {}, depois) {
    const h = w * img.height / img.width;
    const { c, ctx: k } = camada();
    k.imageSmoothingEnabled = true;
    k.imageSmoothingQuality = 'high';
    k.filter = filtro;
    k.drawImage(img, x, y, w, h);
    k.filter = 'none';
    if (depois) depois(k);
    k.globalCompositeOperation = 'destination-in';
    for (const [lado, [de, ate]] of Object.entries(apaga)) {
      const vert = lado === 'cima' || lado === 'baixo';
      const g = vert ? k.createLinearGradient(0, de, 0, ate) : k.createLinearGradient(de, 0, ate, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      k.fillStyle = g;
      k.fillRect(0, 0, L, A);
    }
    k.globalCompositeOperation = 'source-over';
    return { c, k, h };
  }
  // A letra vazada: só o contorno.
  function vazado(ctx, texto, x, y, fonte, cor, largura, { alinhar = 'left', espaco = 0 } = {}) {
    ctx.save();
    ctx.font = fonte;
    ctx.textAlign = alinhar;
    ctx.textBaseline = 'alphabetic';
    try { ctx.letterSpacing = espaco + 'px'; } catch (e) { /* sem letterSpacing */ }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cor;
    ctx.lineWidth = largura;
    ctx.strokeText(texto, x, y);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* idem */ }
    ctx.restore();
  }
  // O círculo à mão: uma volta e um pouco mais, que não fecha no mesmo lugar (como caneta).
  function lacoAMao(ctx, cx, cy, rx, ry, r, { cor = TINTA, largura = 7, giro = -0.1, inicio = -2.2 } = {}) {
    const pts = [];
    const n = 44;
    for (let i = 0; i <= n; i++) {
      const t = inicio + (Math.PI * 2 + 0.55) * i / n;
      const k = 1.06 - 0.12 * i / n + (r() - 0.5) * 0.02;
      const x = Math.cos(t) * rx * k;
      const y = Math.sin(t) * ry * k;
      pts.push([cx + x * Math.cos(giro) - y * Math.sin(giro), cy + x * Math.sin(giro) + y * Math.cos(giro)]);
    }
    tracoAMao(ctx, pts, { r, largura, tremor: 2, cor, segunda: false });
  }
  // A fita de papel: retângulo girado com as pontas rasgadas e uma sombra curta.
  function fitaRasgada(ctx, x, y, w, h, ang, cor, r, { sombra = 'rgba(0,0,0,.22)' } = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const p = bordaRasgada([[[-w / 2, -h / 2], [w / 2, -h / 2], 3], [[w / 2, -h / 2], [w / 2, h / 2], 26],
      [[w / 2, h / 2], [-w / 2, h / 2], 3], [[-w / 2, h / 2], [-w / 2, -h / 2], 26]], r, 6);
    ctx.shadowColor = sombra;
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = cor;
    ctx.fill(p);
    ctx.restore();
  }

  // (w) Avivados até que Ele venha: o pôster de uma cor só. O amarelo cheio é a luz do palco;
  // a foto do culto entra em P&B multiplicada sobre ele (o claro some no amarelo, o escuro
  // vira tinta), com as mãos levantadas subindo do pé. No alto, à esquerda, AVIVADOS enorme
  // em tinta e "até que Ele venha" à mão. Fechamento: a inversão (tudo em tinta no amarelo).
  function arteAvivados(ctx, fotos) {
    const r = sorteio(1126);
    ctx.fillStyle = LP.amarelo;
    ctx.fillRect(0, 0, L, A);
    const img = fotos.culto;
    if (img) {
      const w = 1320;
      const y = 820;
      const { c } = camadaFoto(img, (L - w) / 2 + 40, y, w, 'grayscale(1) contrast(1.5) brightness(1.12)',
        { cima: [y + 20, y + 230], baixo: [1560, 1420] });
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(c, 0, 0);
      ctx.restore();
    }
    const x = 70;
    const f1 = (t) => oswaldLP(t);
    referencia(ctx, '1 Coríntios 11.26', x, 572, 28, TINTA, 'left');
    const t1 = caber(ctx, 'AVIVADOS', f1, L - 2 * x, 300, 0.005);
    const y1 = 600 + t1 * 0.86;
    S.escrever(ctx, 'AVIVADOS', x - 6, y1, f1(t1), TINTA, { alinhar: 'left', espaco: t1 * 0.005 });
    ctx.save();
    ctx.translate(x + 4, y1 + 112);
    ctx.rotate(-0.04);
    ctx.fillStyle = TINTA;
    aMao(ctx, 'até que Ele venha', 0, 0, 92, r);
    ctx.restore();
  }

  // (x) Não temas, eu sou teu Deus: papel claro de jornal com a foto da cruz impressa nele
  // (multiplicada, com o sol amarelo da landing), sangrando nas laterais e rasgada embaixo;
  // no papel, NÃO TEMAS em Literata grande e preta, e "eu sou teu Deus" numa fita sálvia.
  function arteNaoTemas(ctx, fotos) {
    const r = sorteio(4110);
    fundoPapel(ctx, '#ebe7dc', 4110);
    const cx = L / 2;
    const img = fotos.cruz;
    let pe = 560;
    if (img) {
      const w = 1640;
      const x = -90;
      const y = 540;
      const h = w * img.height / img.width;
      pe = y + h - 80;
      const { c, k } = camadaFoto(img, x, y, w, 'contrast(1.12) brightness(1.04)');
      // a borda da impressão: rasgada embaixo, quase reta em cima
      k.globalCompositeOperation = 'destination-in';
      k.fill(bordaRasgada([[[-40, y + 4], [L + 40, y], 6], [[L + 40, y], [L + 40, pe], 0], [[L + 40, pe], [-40, pe + 10], 34], [[-40, pe + 10], [-40, y + 4], 0]], r, 8));
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(c, 0, 0);
      ctx.restore();
    }
    const y0 = pe + 64;
    referencia(ctx, 'Isaías 41.10', cx, y0, 28, '#4b4a44');
    const f1 = (t) => Lit(600, t);
    const t1 = caber(ctx, 'NÃO TEMAS', f1, 900, 190);
    const y1 = y0 + 26 + t1 * 0.76;
    S.escrever(ctx, 'NÃO TEMAS', cx, y1, f1(t1), TINTA);
    const f2 = (t) => 'italic 600 ' + t + 'px Literata, Georgia, serif';
    const t2 = 68;
    const w2 = larguraDe(ctx, 'eu sou teu Deus', f2(t2));
    const y2 = y1 + 100;
    fitaRasgada(ctx, cx, y2 - t2 * 0.32, w2 + 90, t2 * 1.45, -0.025, LP.salvia, r);
    ctx.save();
    ctx.translate(cx, y2);
    ctx.rotate(-0.025);
    S.escrever(ctx, 'eu sou teu Deus', 0, 0, f2(t2), TINTA);
    ctx.restore();
  }
  const Lit = S.Lit;

  // (y) Jesus is my King: a sálvia cheia, como um cartaz de uma cor. O rapaz de costas da
  // landing entra em estêncil (só o quase preto vira tinta) à direita, apagando para dentro
  // (a coroa fica longe dele, no J); JESUS gigante em tinta na largura, coroado pela coroa à
  // mão, "is my" à mão e KING vazado, com a sombra em sálvia escura. Fechamento: a letra vazada. O texto fica em inglês.
  function arteRei(ctx, fotos) {
    const r = sorteio(777);
    ctx.fillStyle = LP.salvia;
    ctx.fillRect(0, 0, L, A);
    const img = fotos.abertura;
    if (img) {
      const fx = 600;
      const fw = 560;
      const fy = 610;
      // em estêncil: só o quase preto (o rapaz, o muro) vira tinta; o céu e as luzes somem
      const { c } = camadaFoto(img, fx, fy, fw, 'grayscale(1)',
        { esq: [fx + 80, fx + 300], cima: [fy + 40, fy + 200], baixo: [1530, 1380] }, (k) => {
          let dados;
          try { dados = k.getImageData(0, 0, L, A); } catch (e) { return; }
          const d = dados.data;
          for (let i = 0; i < d.length; i += 4) {
            const u = Math.min(1, Math.max(0, (d[i] - 16) / 18));
            d[i] = d[i + 1] = d[i + 2] = 255 * u * u * (3 - 2 * u);
          }
          k.putImageData(dados, 0, 0);
        });
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.85;
      ctx.drawImage(c, 0, 0);
      ctx.restore();
    }
    // a frase gigante na largura, à esquerda; o rapaz à direita, longe da coroa
    const x = 64;
    const f = (t) => oswaldLP(t);
    const t1 = caber(ctx, 'JESUS', f, 930, 330);
    const y1 = 640 + t1 * 0.86;
    S.escrever(ctx, 'JESUS', x - 4, y1, f(t1), TINTA, { alinhar: 'left' });
    coroaLanding(ctx, x + 70, y1 - t1 * 0.86 - 8, 150, -0.2, TINTA);
    ctx.save();
    ctx.translate(x + 10, y1 + 120);
    ctx.rotate(-0.05);
    ctx.fillStyle = TINTA;
    aMao(ctx, 'is my', 0, 0, 104, r);
    ctx.restore();
    const t3 = caber(ctx, 'KING.', f, 760, 340);
    const y3 = y1 + 150 + t3 * 0.86;
    vazado(ctx, 'KING.', x + 12, y3 + 12, f(t3), LP.salviaEscura, 8, { alinhar: 'left' });
    vazado(ctx, 'KING.', x, y3, f(t3), TINTA, 8, { alinhar: 'left' });
  }

  // (z1) Prepara-te, Ele vem (1 Tessalonicenses 4.16-17): o relógio antigo à mão ocupa a arte,
  // inteiro, com os ponteiros a três minutos da meia-noite; a frase mora dentro do mostrador,
  // na metade de baixo, e a única luz é o brilho amarelo no XII. Fechamento: o brilho.
  // O relógio: centro (ox, oy), raio R; sem: os algarismos que não entram.
  function relogioAMao(ctx, ox, oy, R, r, { sem = [], cor = LP.salvia, fraca = (a) => 'rgba(200,218,140,' + a + ')', destaque } = {}) {
    tracoAMao(ctx, pontosElipse(ox, oy, R, R, { r, n: 72, mexe: 0.004 }), { r, largura: 8, fechar: true, cor });
    tracoAMao(ctx, pontosElipse(ox, oy, R - 40, R - 40, { r, n: 68, mexe: 0.005 }), { r, largura: 4, fechar: true, segunda: false, cor });
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2 - Math.PI / 2;
      const hora = i % 5 === 0;
      const de = R - (hora ? 38 : 26);
      const ate = R - 10;
      tracoAMao(ctx, [[ox + Math.cos(a) * de, oy + Math.sin(a) * de], [ox + Math.cos(a) * ate, oy + Math.sin(a) * ate]],
        { r, tremor: 1.5, largura: hora ? 5 : 2.5, segunda: false, cor: i === 0 && destaque ? destaque : (hora ? cor : fraca(0.7)) });
    }
    const romanos = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    romanos.forEach((n, i) => {
      if (sem.includes(n)) return;
      const a = i / 12 * Math.PI * 2 - Math.PI / 2;
      const rr = R - 92;
      S.escrever(ctx, n, ox + Math.cos(a) * rr, oy + Math.sin(a) * rr + 18, '600 48px Literata, Georgia, serif', i === 0 && destaque ? destaque : cor, { espaco: -2 });
    });
    tracoAMao(ctx, pontosElipse(ox, oy, 46, 46, { r, n: 20, mexe: 0.05 }), { r, largura: 3, fechar: true, segunda: false, cor: fraca(0.55) });
    const ponteiro = (ang, comp, largura, ponta) => {
      const a = ang - Math.PI / 2;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      tracoAMao(ctx, [[ox - ux * 40, oy - uy * 40], [ox + ux * comp * 0.5, oy + uy * comp * 0.5], [ox + ux * comp, oy + uy * comp]], { r, tremor: 1.5, largura, cor });
      const px = ox + ux * comp;
      const py = oy + uy * comp;
      const nx = -uy;
      const ny = ux;
      tracoAMao(ctx, [[px - ux * ponta, py - uy * ponta], [px + nx * ponta * 0.45, py + ny * ponta * 0.45], [px + ux * ponta * 0.9, py + uy * ponta * 0.9],
        [px - nx * ponta * 0.45, py - ny * ponta * 0.45]], { r, tremor: 1, largura: largura * 0.7, fechar: true, segunda: false, cor });
    };
    ponteiro((57 / 60) * Math.PI * 2, R - 70, 6, 30);
    ponteiro(((11 + 57 / 60) / 12) * Math.PI * 2, R - 150, 9, 34);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(ox, oy, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  function arteRelogio(ctx) {
    const r = sorteio(1617);
    const ox = L / 2;
    const oy = 1000;
    const R = 462;
    ctx.fillStyle = '#0f110e';
    ctx.fillRect(0, 0, L, A);
    // o brilho da meia-noite: em volta do XII, amarelo, apagando devagar
    const gy = oy - R + 92;
    const g = ctx.createRadialGradient(ox, gy, 0, ox, gy, 420);
    g.addColorStop(0, 'rgba(255,196,77,.6)');
    g.addColorStop(0.3, 'rgba(255,196,77,.2)');
    g.addColorStop(1, 'rgba(255,196,77,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy - 420, L, 840);
    relogioAMao(ctx, ox, oy, R, r, { sem: ['V', 'VI', 'VII'], destaque: LP.amarelo });
    // a frase dentro do mostrador, na metade de baixo
    referencia(ctx, '1 Tessalonicenses 4.16-17', ox, oy + 112, 24, LP.salvia);
    ctx.save();
    ctx.fillStyle = LP.creme;
    aMao(ctx, 'Prepara-te,', ox, oy + 196, 66, r, { alinhar: 'center' });
    ctx.restore();
    const f = (t) => oswaldLP(t);
    const t = caber(ctx, 'ELE VEM.', f, 470, 150, 0.02);
    tituloLanding(ctx, 'ELE VEM.', ox, oy + 210 + t * 0.86, t, LP.creme, { espaco: t * 0.02 });
  }

  // (z2) Há esperança para a árvore (Jó 14.7-9): papel claro, a frase alinhada à esquerda no
  // alto, em Literata (Há esperança na largura toda, o meio em itálico) e o toco enorme à mão
  // em tinta, sangrando pelas laterais, com o broto de folhas amarelas, a única coisa viva e
  // quente. Fechamento: "ainda se renovará." escrito à mão, como uma nota no livro.
  function tocoAMao(ctx, cx, r, { cor, fraca, folhaCor, nervura, contorno }) {
    const topo = 870;
    const rx = 196;
    const ry = 50;
    const pe = 1060;
    tracoAMao(ctx, [[cx - 900, pe + 8], [cx - 420, pe + 4], [cx - 200, pe + 2], [cx, pe + 6], [cx + 200, pe + 3], [cx + 420, pe + 6], [cx + 900, pe + 10]], { r, largura: 4, segunda: false, cor: fraca(0.45) });
    for (const dx of [-560, -470, -330, 300, 420, 540]) {
      tracoAMao(ctx, [[cx + dx, pe + 6], [cx + dx + 6, pe - 22]], { r, largura: 3, tremor: 1, segunda: false, cor: fraca(0.5) });
      tracoAMao(ctx, [[cx + dx + 12, pe + 6], [cx + dx + 22, pe - 14]], { r, largura: 3, tremor: 1, segunda: false, cor: fraca(0.4) });
    }
    tracoAMao(ctx, [[cx - rx, topo + 2], [cx - rx - 4, topo + 80], [cx - rx - 2, topo + 140], [cx - rx - 26, pe - 20], [cx - rx - 90, pe + 4], [cx - rx - 200, pe + 8]], { r, cor });
    tracoAMao(ctx, [[cx + rx, topo + 2], [cx + rx + 3, topo + 80], [cx + rx + 6, topo + 140], [cx + rx + 30, pe - 22], [cx + rx + 96, pe + 4], [cx + rx + 220, pe + 9]], { r, cor });
    tracoAMao(ctx, [[cx - 96, pe - 56], [cx - 104, pe - 20], [cx - 150, pe + 4]], { r, largura: 6, cor });
    tracoAMao(ctx, [[cx + 70, pe - 50], [cx + 82, pe - 16], [cx + 132, pe + 5]], { r, largura: 6, cor });
    for (const [dx, de, ate] of [[-150, 40, 150], [-96, 70, 176], [-40, 54, 160], [20, 76, 182], [80, 50, 150], [138, 66, 170], [-176, 120, 170], [168, 110, 166]]) {
      const x = cx + dx;
      const curva = ry * Math.sqrt(Math.max(0, 1 - (dx / rx) ** 2));
      tracoAMao(ctx, [[x, topo + curva + de * 0.3], [x + 4, topo + curva + (de + ate) / 2 * 0.6], [x - 2, topo + curva + ate * 0.9]], { r, largura: 3.5, segunda: false, cor: fraca(0.6) });
    }
    tracoAMao(ctx, pontosElipse(cx, topo, rx, ry, { r, n: 44, mexe: 0.025 }), { r, largura: 8, fechar: true, cor });
    tracoAMao(ctx, pontosElipse(cx, topo + 2, rx - 18, ry - 6, { r, n: 40, mexe: 0.03 }), { r, largura: 3, fechar: true, segunda: false, cor: fraca(0.8) });
    const mx = cx - 22;
    const my = topo + 4;
    for (let i = 1; i <= 6; i++) {
      const k = i / 7;
      tracoAMao(ctx, pontosElipse(mx + (cx - mx) * k, my + (topo - my) * k, (rx - 26) * k, (ry - 10) * k, { r, n: 30, mexe: 0.07 }),
        { r, largura: i % 2 ? 3 : 2.2, fechar: true, segunda: false, cor: fraca(0.85 - i * 0.05) });
    }
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.ellipse(mx, my, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    tracoAMao(ctx, [[mx + 4, my], [mx + 60, my - 10], [mx + 120, my - 20], [mx + 170, my - 32]], { r, largura: 2.5, segunda: false, cor: fraca(0.75) });
    const bx = cx + 92;
    const by = topo - ry * 0.86;
    tracoAMao(ctx, [[bx, by + 4], [bx + 6, by - 50], [bx - 6, by - 110], [bx + 10, by - 170], [bx + 24, by - 214]], { r, largura: 9, segunda: false, cor: folhaCor });
    const folha = (x, y, comp, larg, ang) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const p = new Path2D();
      p.moveTo(0, 0);
      p.bezierCurveTo(comp * 0.3, -larg, comp * 0.75, -larg * 0.9, comp, 0);
      p.bezierCurveTo(comp * 0.7, larg * 0.75, comp * 0.3, larg * 0.8, 0, 0);
      ctx.fillStyle = folhaCor;
      ctx.fill(p);
      if (contorno) {
        ctx.strokeStyle = contorno;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.stroke(p);
      }
      ctx.strokeStyle = nervura;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(comp * 0.08, 0);
      ctx.quadraticCurveTo(comp * 0.5, -larg * 0.12, comp * 0.86, 0);
      ctx.stroke();
      ctx.restore();
    };
    folha(bx - 2, by - 108, 110, 34, -2.6);
    folha(bx + 2, by - 86, 92, 28, -0.42);
    folha(bx + 22, by - 210, 96, 30, -1.05);
    folha(bx + 20, by - 206, 76, 24, -2.3);
  }
  function arteToco(ctx) {
    const r = sorteio(1479);
    const cx = L / 2;
    fundoPapel(ctx, '#f0e9d8', 1479);
    // o toco grande, à direita do meio, com o chão em y 1530 saindo pelas laterais
    const k = 1.2;
    ctx.save();
    ctx.translate(cx + 130, 1530);
    ctx.scale(k, k);
    ctx.translate(-cx, -1066);
    tocoAMao(ctx, cx, r, { cor: TINTA, fraca: (a) => 'rgba(21,21,18,' + a + ')', folhaCor: LP.amarelo, nervura: 'rgba(21,21,18,.75)', contorno: TINTA });
    ctx.restore();
    // a frase no alto, à esquerda: Literata, e o fim escrito à mão
    const x = 66;
    referencia(ctx, 'Jó 14.7-9', x, 566, 26, '#55524a', 'left');
    const f = (t) => Lit(600, t);
    const t1 = caber(ctx, 'Há esperança', f, L - 2 * x, 170);
    let y = 588 + t1 * 0.74;
    S.escrever(ctx, 'Há esperança', x - 4, y, f(t1), TINTA, { alinhar: 'left' });
    const fi = (t) => 'italic 500 ' + t + 'px Literata, Georgia, serif';
    y += 72;
    S.escrever(ctx, 'para a árvore que,', x, y, fi(52), TINTA, { alinhar: 'left' });
    y += 64;
    S.escrever(ctx, 'se for cortada,', x, y, fi(52), TINTA, { alinhar: 'left' });
    y += 100;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.035);
    ctx.fillStyle = TINTA;
    aMao(ctx, 'ainda se renovará.', 0, 0, 76, r);
    ctx.restore();
  }

  // Jovens que influenciam a sua geração (Mateus 5.13-15): a foto do dono (a multidão vista de
  // cima com o facho de luz caindo numa pessoa) cobre o story inteiro; o facho e quem ele toca
  // ganham o amarelo, a única cor. A frase vai no escuro do pé, alinhada à direita, como uma
  // legenda grande, com INFLUENCIAM no maior tamanho. Sem ênfase além do facho.
  function facho(k, c, { de, para, base = 150 }) {
    let dados;
    try { dados = k.getImageData(0, 0, L, A); } catch (e) { return; }
    const d = dados.data;
    const ax = c.x + c.w * de[0];
    const ay = c.y + c.h * de[1];
    const vx = c.x + c.w * para[0] - ax;
    const vy = c.y + c.h * para[1] - ay;
    const comp = Math.hypot(vx, vy);
    for (let yy = 0; yy < A; yy++) {
      for (let xx = 0; xx < L; xx++) {
        const t = ((xx - ax) * vx + (yy - ay) * vy) / (comp * comp);
        if (t < -0.15) continue;
        const dist = Math.abs((xx - ax) * vy - (yy - ay) * vx) / comp;
        const largura = base + Math.max(0, t) * 60 * c.w / 1240;
        const lado = Math.max(0, 1 - dist / largura);
        if (!lado) continue;
        const borda = t < 0 ? 1 + t / 0.15 : 1;
        const perto = borda * lado * lado * (3 - 2 * lado);
        const i = (yy * L + xx) * 4;
        const l = (d[i] + d[i + 1] + d[i + 2]) / 765;
        const u = Math.min(1, Math.max(0, (l - 0.28) / 0.45));
        const q = u * u * (3 - 2 * u) * perto;
        if (!q) continue;
        const v = Math.min(1, l * 1.25);
        d[i] += (255 * v - d[i]) * q;
        d[i + 1] += (206 * v - d[i + 1]) * q;
        d[i + 2] += (104 * v - d[i + 2]) * q;
      }
    }
    k.putImageData(dados, 0, 0);
  }
  function arteInfluenciam(ctx, fotos) {
    ctx.fillStyle = LP.preto;
    ctx.fillRect(0, 0, L, A);
    const img = fotos.influenciam;
    if (img) {
      const w = 1560;
      const h = w * img.height / img.width;
      const x = 470 - w * 0.47;
      const y = 820 - h * 0.58;
      const { c, k } = camadaFoto(img, x, y, w, 'grayscale(1) contrast(1.1)');
      facho(k, { x, y, w, h }, { de: [0.47, 0.56], para: [1.02, 0.1], base: 190 });
      ctx.drawImage(c, 0, 0);
      const px = x + w * 0.47;
      const py = y + h * 0.58;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const halo = ctx.createRadialGradient(px, py - 40, 0, px, py - 40, 300);
      halo.addColorStop(0, 'rgba(255,196,77,.24)');
      halo.addColorStop(1, 'rgba(255,196,77,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(px - 300, py - 340, 600, 600);
      ctx.restore();
    }
    // o escuro no alto (a chama e os dias) e no pé (a frase e a marca)
    const cima = ctx.createLinearGradient(0, 200, 0, 640);
    cima.addColorStop(0, 'rgba(13,14,12,.86)');
    cima.addColorStop(1, 'rgba(13,14,12,0)');
    ctx.fillStyle = cima;
    ctx.fillRect(0, 0, L, 640);
    const baixo = ctx.createLinearGradient(0, 1000, 0, 1330);
    baixo.addColorStop(0, 'rgba(13,14,12,0)');
    baixo.addColorStop(1, 'rgba(13,14,12,.9)');
    ctx.fillStyle = baixo;
    ctx.fillRect(0, 1000, L, A - 1000);
    const xd = L - 64;
    const f = (t) => oswaldLP(t);
    referencia(ctx, 'Mateus 5.13-15', xd, 1150, 28, LP.salvia, 'right');
    tituloLanding(ctx, 'JOVENS QUE', xd, 1240, 78, LP.creme, { alinhar: 'right', peso: 500, espaco: 3 });
    const t2 = caber(ctx, 'INFLUENCIAM', f, 952, 200);
    const y2 = 1252 + t2 * 0.86;
    tituloLanding(ctx, 'INFLUENCIAM', xd + 4, y2, t2, LP.creme, { alinhar: 'right' });
    tituloLanding(ctx, 'A SUA GERAÇÃO.', xd, y2 + 84, 78, LP.creme, { alinhar: 'right', peso: 500, espaco: 3 });
  }

  // Marcados pela diferença: o cartão de respostas. O papel claro coberto de bolinhas
  // impressas, todas iguais (as questões numeradas, de A a E), sangrando pelas bordas; uma só
  // foi pintada, em amarelo, e circulada à caneta. A frase escrita à mão, em tinta, no alto
  // do cartão. Fechamento: o círculo à mão. Sem referência.
  function arteDiferenca(ctx) {
    const r = sorteio(1308);
    const cx = L / 2;
    fundoPapel(ctx, '#efece3', 1308);
    // a régua e o cabeçalho impresso do cartão
    const tinta = 'rgba(31,34,27,';
    const y0 = 968;
    ctx.fillStyle = tinta + '.75)';
    ctx.fillRect(0, y0 - 52, L, 3);
    S.escrever(ctx, 'FOLHA DE RESPOSTAS', L - 70, y0 - 70, S.Mn(800, 22), tinta + '.7)', { alinhar: 'right', espaco: 5 });
    // as bolinhas: três colunas de questões, cinco letras cada, cortadas pelas duas bordas
    const raio = 24;
    const passoX = 64;
    const passoY = 74;
    let marcada = null;
    for (let col = 0; col < 3; col++) {
      const xq = -190 + col * 480;
      for (let q = 0; q < 7; q++) {
        const y = y0 + 22 + q * passoY;
        const num = String(col * 7 + q + 1).padStart(2, '0');
        S.escrever(ctx, num, xq + 36, y + 9, S.Mn(800, 24), tinta + '.75)', { alinhar: 'right' });
        for (let op = 0; op < 5; op++) {
          const x = xq + 86 + op * passoX;
          ctx.strokeStyle = tinta + '.6)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, raio, 0, Math.PI * 2);
          ctx.stroke();
          S.escrever(ctx, 'ABCDE'[op], x, y + 8, S.Mn(700, 22), tinta + '.55)');
          if (col === 1 && q === 3 && op === 2) marcada = [x, y];
        }
      }
    }
    if (marcada) {
      // a bolinha pintada: amarela cheia, passando um pouco da borda, com o contorno em tinta
      const [mx, my] = marcada;
      ctx.fillStyle = LP.amarelo;
      ctx.beginPath();
      ctx.ellipse(mx + 3, my + 2, raio + 12, raio + 9, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(mx, my, raio, 0, Math.PI * 2);
      ctx.stroke();
      lacoAMao(ctx, mx, my, 74, 64, r, { cor: TINTA, largura: 7 });
    }
    // a frase à mão no alto do cartão
    ctx.save();
    ctx.fillStyle = TINTA;
    const f = (t) => '400 ' + t + 'px "Permanent Marker", cursive';
    const t1 = caber(ctx, 'MARCADOS PELA', f, 860, 104);
    aMao(ctx, 'MARCADOS PELA', cx, 580 + t1 * 0.8, t1, r, { alinhar: 'center' });
    const t2 = caber(ctx, 'DIFERENÇA.', f, 900, 150);
    aMao(ctx, 'DIFERENÇA.', cx, 600 + t1 * 0.9 + t2 * 0.86, t2, r, { alinhar: 'center' });
    ctx.restore();
  }

  // Jesus morreu por mim, agora eu vivo por Ele: o story partido ao meio. Em cima, no preto,
  // JESUS MORREU POR MIM, em Literata creme; o amarelo rasgado sobe de baixo, com a cruz à mão
  // em tinta na emenda, e AGORA EU VIVO POR ELE. vem em tinta sobre ele. Fechamento: a
  // inversão (a segunda metade inteira em tinta no amarelo). Sem referência.
  const literataLP = (t) => '600 ' + t + 'px Literata, Georgia, serif';
  function arteVivoPorEle(ctx) {
    const r = sorteio(2203);
    const cx = L / 2;
    const larg = 880;
    ctx.fillStyle = LP.preto;
    ctx.fillRect(0, 0, L, A);
    const linha = (texto, y, max, cor, espaco) => {
      ctx.font = literataLP(100);
      const t = Math.min(max, 100 * (larg - espaco * (texto.length - 1)) / ctx.measureText(texto).width);
      S.escrever(ctx, texto, cx + espaco / 2, y, literataLP(t), cor, { espaco });
      return t;
    };
    let y = 560;
    for (const [texto, max, espaco] of [['JESUS', 150, 10], ['MORREU', 136, 6], ['POR MIM,', 100, 4]]) {
      y += max * 0.74;
      y += linha(texto, y, max, LP.creme, espaco) * 0.16;
    }
    // o amarelo rasgado, da emenda até o pé
    const emenda = y + 92;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = -6;
    ctx.fillStyle = LP.amarelo;
    ctx.fill(bordaRasgada([[[-20, emenda + 10], [L + 20, emenda - 6], 30], [[L + 20, emenda - 6], [L + 20, A + 20], 0], [[L + 20, A + 20], [-20, A + 20], 0], [[-20, A + 20], [-20, emenda + 10], 0]], r, 8));
    ctx.restore();
    // a cruz à mão sobre a emenda: creme no preto, tinta no amarelo (o mesmo traço, cortado)
    for (const [cor, acima] of [[LP.creme, true], [TINTA, false]]) {
      const rc = sorteio(2204);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, acima ? 0 : emenda + 2, L, acima ? emenda + 2 : A);
      ctx.clip();
      tracoAMao(ctx, [[cx + 1, emenda - 56], [cx, emenda], [cx - 1, emenda + 80]], { r: rc, largura: 10, tremor: 1.5, cor, segunda: false });
      tracoAMao(ctx, [[cx - 38, emenda - 18], [cx + 39, emenda - 20]], { r: rc, largura: 10, tremor: 1.5, cor, segunda: false });
      ctx.restore();
    }
    y = emenda + 90;
    for (const [texto, max, espaco] of [['AGORA EU', 100, 4], ['VIVO', 190, 14], ['POR ELE.', 136, 6]]) {
      y += max * 0.74;
      y += linha(texto, y, max, TINTA, espaco) * 0.16;
    }
    return y;
  }

  // Quem não desiste tem testemunho pra contar: o céu do amanhecer. O escuro de cima clareia
  // até a linha do horizonte, onde o sol amarelo nasce atrás do banco vazio (o lugar de quem
  // esperou, em silhueta: figura humana não entra). A frase à mão em creme no escuro do alto,
  // e PRA CONTAR. em tinta numa fita de papel creme. Fechamento: a fita. Sem referência.
  function bancoSilhueta(ctx, cx, chao, w, cor) {
    const alt = w * 0.4;
    const assento = chao - alt * 0.45;
    ctx.fillStyle = cor;
    const tabua = (x0, y0, x1, y1) => ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // as pernas abertas, o assento, os pés do encosto, as tábuas e os braços
    for (const [px, abre] of [[cx - w * 0.42, -1], [cx + w * 0.42, 1]]) {
      ctx.beginPath();
      ctx.moveTo(px - w * 0.022, assento);
      ctx.lineTo(px + w * 0.022, assento);
      ctx.lineTo(px + w * 0.022 + abre * 10, chao);
      ctx.lineTo(px - w * 0.022 + abre * 10, chao);
      ctx.fill();
      tabua(px - w * 0.018, chao - alt, px + w * 0.018, assento);
      // o braço: sobe do assento e se curva para fora
      ctx.beginPath();
      ctx.moveTo(px - abre * w * 0.02, assento);
      ctx.quadraticCurveTo(px + abre * w * 0.05, assento - alt * 0.3, px + abre * w * 0.07, assento - alt * 0.26);
      ctx.lineTo(px + abre * w * 0.07, assento - alt * 0.2);
      ctx.quadraticCurveTo(px + abre * w * 0.03, assento - alt * 0.2, px + abre * w * 0.03, assento);
      ctx.fill();
    }
    tabua(cx - w / 2, assento - w * 0.025, cx + w / 2, assento + w * 0.03);
    for (const [y, e] of [[chao - alt, 0.04], [chao - alt * 0.84, 0.036], [chao - alt * 0.7, 0.032]]) tabua(cx - w * 0.46, y, cx + w * 0.46, y + w * e);
  }
  function arteTestemunho(ctx) {
    const r = sorteio(4747);
    const cx = L / 2;
    const yh = 1400;
    const ceu = ctx.createLinearGradient(0, 0, 0, yh);
    ceu.addColorStop(0, '#0d0f0c');
    ceu.addColorStop(0.55, '#151913');
    ceu.addColorStop(0.78, '#4a5540');
    ceu.addColorStop(0.92, '#b9c39d');
    ceu.addColorStop(1, '#f1ecca');
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, L, yh);
    // o sol nascendo, cheio, com o brilho
    const sx = cx + 270;
    const g = ctx.createRadialGradient(sx, yh, 60, sx, yh, 560);
    g.addColorStop(0, 'rgba(255,196,77,.85)');
    g.addColorStop(0.3, 'rgba(255,196,77,.3)');
    g.addColorStop(1, 'rgba(255,196,77,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, yh - 520, L, 520);
    ctx.fillStyle = LP.amarelo;
    ctx.beginPath();
    ctx.arc(sx, yh, 110, Math.PI, 0);
    ctx.fill();
    // o chão escuro
    const chao = '#12140f';
    ctx.fillStyle = chao;
    ctx.fill(bordaRasgada([[[-20, yh + 2], [L + 20, yh], 8], [[L + 20, yh], [L + 20, A], 0], [[L + 20, A], [-20, A], 0], [[-20, A], [-20, yh + 2], 0]], r, 10));
    bancoSilhueta(ctx, cx - 110, yh + 14, 500, chao);
    // a frase à mão no alto
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = LP.creme;
    const f = (t) => '400 ' + t + 'px "Permanent Marker", cursive';
    let y = 560;
    for (const [texto, max] of [['QUEM NÃO', 130], ['DESISTE TEM', 130], ['TESTEMUNHO', 150]]) {
      const t = caber(ctx, texto, f, 900, max);
      y += t * 0.92;
      aMao(ctx, texto, cx, y, t, r, { alinhar: 'center' });
    }
    ctx.restore();
    const t4 = 96;
    const w4 = larguraDe(ctx, 'PRA CONTAR.', f(t4));
    const y4 = y + 140;
    fitaRasgada(ctx, cx, y4 - t4 * 0.34, w4 + 100, t4 * 1.4, 0.03, '#f2efdc', r, { sombra: 'rgba(0,0,0,.45)' });
    ctx.save();
    ctx.translate(cx, y4);
    ctx.rotate(0.03);
    ctx.fillStyle = TINTA;
    aMao(ctx, 'PRA CONTAR.', 0, 0, t4, r, { alinhar: 'center' });
    ctx.restore();
  }

  // ---------- quinta leva (2026-10-11) ----------
  // As quatro desta leva fogem da cara das outras (o dono achou todas com o mesmo rosto):
  // cada uma tem fundo, composição, tipografia e fecho próprios, e nenhuma fecha com a
  // palavra amarela sublinhada. A chama e a marca continuam, menores ou na margem.
  // Onde o mundo vê um fim, Deus escreve um novo começo cheio de esperança: cartaz
  // tipográfico em papel claro, tinta quase preta, tudo encostado à esquerda e separado por
  // fios. O FIM enorme, apagado pela borracha, e o ponto final dele, de pincel em mostarda,
  // ganhou a cauda e virou vírgula: a frase continua. NOVO COMEÇO enche a largura e CHEIO DE
  // ESPERANÇA. sai invertido, em papel sobre uma tarja de tinta. Sem referência.
  // A vírgula de pincel: o ponto (um borrão redondo de tinta) e a cauda que sai dele e desce
  // afinando, feita de fios (os da beira acabam antes, como o pincel que seca), com as falhas
  // tiradas da tinta. (x, y) é o meio do ponto; R, o raio.
  function virgulaPincel(ctx, x, y, R, cor, r) {
    const { c, ctx: k } = camada();
    k.fillStyle = cor;
    k.strokeStyle = cor;
    k.lineCap = 'round';
    // o ponto: a borda um pouco irregular
    k.beginPath();
    const n = 72;
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2;
      const rr = R * (1 + Math.sin(a * 3 + 1.3) * 0.035 + Math.sin(a * 7 + 0.4) * 0.012);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i) k.lineTo(px, py); else k.moveTo(px, py);
    }
    k.fill();
    // a cauda: sai da metade de baixo do ponto, desce em curva para a esquerda e afina
    const p0 = [x + R * 0.18, y + R * 0.2];
    const p1 = [x + R * 1.15, y + R * 1.1];
    const p2 = [x + R * 0.55, y + R * 2.5];
    const p3 = [x - R * 0.85, y + R * 3.35];
    const em = (t) => {
      const u = 1 - t;
      return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
    };
    const largura = (t) => R * 1.55 * Math.pow(1 - t, 0.85) + R * 0.04;
    const fios = 56;
    for (let f = 0; f < fios; f++) {
      const o = (f + 0.5) / fios - 0.5; // -0.5 a 0.5
      const fim = 1 - Math.abs(o) * 0.35 - r() * 0.08;
      k.globalAlpha = 0.85 + r() * 0.15;
      k.lineWidth = R * (0.06 + r() * 0.04);
      k.beginPath();
      for (let i = 0; i <= 40; i++) {
        const t = fim * i / 40;
        const [px, py] = em(t);
        const [qx, qy] = em(Math.min(1, t + 0.01));
        const dx = qx - px;
        const dy = qy - py;
        const d = Math.hypot(dx, dy) || 1;
        const nx = -dy / d;
        const ny = dx / d;
        const w = largura(t) * o;
        if (i) k.lineTo(px + nx * w, py + ny * w); else k.moveTo(px + nx * w, py + ny * w);
      }
      k.stroke();
    }
    // as falhas: riscos finos tirados da tinta, mais na cauda, e uns furinhos no ponto
    k.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 9; i++) {
      const t0 = 0.45 + r() * 0.45;
      const o = (r() - 0.5) * 0.7;
      k.globalAlpha = 0.4 + r() * 0.5;
      k.lineWidth = 0.8 + r() * 1.4;
      k.beginPath();
      for (let j = 0; j <= 8; j++) {
        const t = Math.min(1, t0 + j * 0.02);
        const [px, py] = em(t);
        const [qx, qy] = em(Math.min(1, t + 0.01));
        const d = Math.hypot(qx - px, qy - py) || 1;
        const w = largura(t) * o;
        const X = px - (qy - py) / d * w;
        const Y = py + (qx - px) / d * w;
        if (j) k.lineTo(X, Y); else k.moveTo(X, Y);
      }
      k.stroke();
    }
    gastar(c, { x: x - R, y: y - R, w: R * 2.4, h: R * 4.4 }, { pontos: 34, manchas: 0, riscos: 0, semente: 1713, forca: 0.5 });
    ctx.drawImage(c, 0, 0);
  }
  // O FIM quase apagado: a palavra em creme numa camada, a borracha passando por cima em
  // riscos largos e ralos, a tinta gasta, e a camada fraca sobre o preto. Devolve a largura.
  function fimApagado(ctx, texto, cx, y, tam, r, { cor = LP.creme, alfa = 0.26 } = {}) {
    const { c, ctx: k } = camada();
    k.font = oswaldLP(tam, 700);
    k.textAlign = 'center';
    k.textBaseline = 'alphabetic';
    k.fillStyle = cor;
    k.fillText(texto, cx, y);
    const w = k.measureText(texto).width;
    k.globalCompositeOperation = 'destination-out';
    k.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      const yy = y - tam * 0.75 + r() * tam * 0.8;
      const x0 = cx - w / 2 - 20 + r() * w * 0.5;
      const comp = w * (0.3 + r() * 0.6);
      k.globalAlpha = 0.18 + r() * 0.35;
      k.lineWidth = 10 + r() * 34;
      k.beginPath();
      k.moveTo(x0, yy);
      k.quadraticCurveTo(x0 + comp / 2, yy + (r() - 0.5) * 30, x0 + comp, yy + (r() - 0.5) * 40);
      k.stroke();
    }
    gastar(c, { x: cx - w / 2, y: y - tam, w, h: tam }, { pontos: 900, manchas: 30, riscos: 120, semente: 1717, forca: 1 });
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
    return w;
  }
  // Uma linha de Oswald maiúscula sem sombra, encostada à esquerda em x; devolve a largura.
  function linhaSeca(ctx, texto, x, y, tam, cor, { peso = 700, espaco = 0, alinhar = 'left' } = {}) {
    S.escrever(ctx, texto, x, y, oswaldLP(tam, peso), cor, { alinhar, espaco });
    ctx.font = oswaldLP(tam, peso);
    return ctx.measureText(texto).width + espaco * Math.max(0, texto.length - 1);
  }
  // Um fio fino à mão, de x0 a x1 na altura y, na cor dada.
  function fio(ctx, x0, x1, y, cor, r, largura = 3) {
    tracoAMao(ctx, [[x0, y], [(x0 + x1) / 2, y + (r() - 0.5) * 3], [x1, y]], { r, largura, tremor: 1.2, segunda: false, cor });
  }
  const PAPEL = '#efe9d9';
  const MOSTARDA = '#c98d0f'; // o amarelo da marca, escurecido para se ver sobre o papel claro
  function arteVirgula(ctx) {
    const r = sorteio(1712);
    const x = 90;
    const d = L - 90;
    const tinta = LP.tinta;
    // um cartaz tipográfico no papel claro: tudo encostado à esquerda, separado por fios
    linhaSeca(ctx, 'ONDE O MUNDO VÊ UM', x, 640, 66, tinta, { peso: 600, espaco: 5 });
    fio(ctx, x, d, 676, tinta, r);
    // o FIM, enorme e apagado pela borracha; o ponto dele virou a vírgula mostarda, o herói
    const tam = 400;
    ctx.font = oswaldLP(tam, 700);
    const wFim = ctx.measureText('FIM').width;
    const base = 700 + tam * 0.86;
    fimApagado(ctx, 'FIM', x - 8 + wFim / 2, base, tam, r, { cor: tinta, alfa: 0.55 });
    const R = 88;
    virgulaPincel(ctx, x + wFim + 24 + R, base - R * 1.25, R, MOSTARDA, r);
    fio(ctx, x, x + wFim + 10, base + 52, tinta, r, 2);
    // o resto da frase: o meio pequeno, NOVO COMEÇO enorme e o fecho invertido, o papel
    // claro em letras sobre uma tarja de tinta
    const y1 = base + 150;
    linhaSeca(ctx, 'DEUS ESCREVE UM', x, y1, 62, tinta, { peso: 600, espaco: 5 });
    const tNovo = tamanhoPara(ctx, 'NOVO COMEÇO', d - x, 220);
    const y2 = y1 + 26 + tNovo * 0.82;
    linhaSeca(ctx, 'NOVO COMEÇO', x - 4, y2, tNovo, tinta);
    const tFim = 74;
    ctx.font = oswaldLP(tFim, 700);
    const wFecho = ctx.measureText('CHEIO DE ESPERANÇA.').width + 6 * 18;
    const y3 = y2 + 40;
    const p = bordaRasgada([[[x, y3], [x + wFecho + 56, y3], 3], [[x + wFecho + 56, y3], [x + wFecho + 56, y3 + 108], 6], [[x + wFecho + 56, y3 + 108], [x, y3 + 108], 3], [[x, y3 + 108], [x, y3], 2]], r, 10);
    ctx.fillStyle = tinta;
    ctx.fill(p);
    linhaSeca(ctx, 'CHEIO DE ESPERANÇA.', x + 28, y3 + 82, tFim, PAPEL, { espaco: 6 });
    return y3 + 108;
  }

  // A sua oração de hoje está construindo o milagre de amanhã. Continue firme: o fundo todo
  // em sálvia, como papel. Em cima, a frase em bloco: Oswald em tinta, ESTÁ CONSTRUINDO em
  // Permanent Marker numa tira de papel creme rasgada e O MILAGRE DE AMANHÃ. em creme numa
  // tira de papel preto, coladas com fita. Embaixo, o corte da terra em tinta: a semente
  // aberta soltando as raízes e o broto que acaba de furar a superfície (o que ainda não se
  // vê já está crescendo), com "continue firme" escrito à mão ao lado. Sem referência.
  // Uma folha cheia em sálvia com a nervura escura, saindo de (x, y) no ângulo dado.
  // Os desenhos da semente são em tinta escura sobre o papel sálvia.
  const TINTA_SEMENTE = LP.tinta;
  const tracoTinta = (ctx, pts, op) => tracoAMao(ctx, pts, { cor: TINTA_SEMENTE, ...op });
  function folhaCheia(ctx, x, y, comp, larg, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const p = new Path2D();
    p.moveTo(0, 0);
    p.bezierCurveTo(comp * 0.3, -larg, comp * 0.75, -larg * 0.9, comp, 0);
    p.bezierCurveTo(comp * 0.7, larg * 0.75, comp * 0.3, larg * 0.8, 0, 0);
    ctx.fillStyle = TINTA_SEMENTE;
    ctx.fill(p);
    ctx.strokeStyle = 'rgba(200,218,140,.7)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(comp * 0.08, 0);
    ctx.quadraticCurveTo(comp * 0.5, -larg * 0.12, comp * 0.86, 0);
    ctx.stroke();
    ctx.restore();
  }
  // O corte da terra: a superfície à mão com o vão por onde o broto sai, os torrões e as
  // pedrinhas, as camadas onduladas e o pontilhado da terra, apagando para os lados e para
  // baixo. (cx, ys) é onde o broto fura a superfície; fundo, até onde vai o corte.
  function corteDeTerra(ctx, cx, ys, fundo, r) {
    const { c, ctx: k } = camada();
    // o pontilhado e os riscos curtos da terra, mais densos para baixo
    for (let i = 0; i < 900; i++) {
      const x = 40 + r() * (L - 80);
      const y = ys + 18 + Math.pow(r(), 0.8) * (fundo - ys);
      const prof = (y - ys) / (fundo - ys);
      k.globalAlpha = 0.12 + r() * 0.2 + prof * 0.08;
      k.fillStyle = TINTA_SEMENTE;
      if (r() < 0.7) {
        k.beginPath();
        k.arc(x, y, 1.2 + r() * 2.2, 0, Math.PI * 2);
        k.fill();
      } else {
        k.strokeStyle = TINTA_SEMENTE;
        k.lineWidth = 2;
        k.lineCap = 'round';
        const a = (r() - 0.5) * 0.8;
        k.beginPath();
        k.moveTo(x, y);
        k.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
        k.stroke();
      }
    }
    k.globalAlpha = 1;
    // as camadas: duas linhas onduladas fracas
    for (const [dy, a] of [[150, 0.28], [300, 0.2]]) {
      const pts = [];
      for (let x = 30; x <= L - 30; x += 70) pts.push([x, ys + dy + Math.sin(x / 130 + dy) * 12]);
      tracoTinta(k, pts, { r, largura: 3, tremor: 4, segunda: false, cor: 'rgba(18,19,15,' + a + ')' });
    }
    // as pedrinhas, em contorno
    for (const [px, py, rx, ry] of [[200, 110, 26, 16], [860, 90, 20, 13], [300, 360, 34, 20], [790, 280, 30, 18], [120, 230, 16, 11], [960, 380, 22, 14], [560, 420, 18, 11]]) {
      k.fillStyle = LP.salvia;
      k.beginPath();
      k.ellipse(px, ys + py, rx, ry, 0, 0, Math.PI * 2);
      k.fill();
      tracoTinta(k, pontosElipse(px, ys + py, rx, ry, { r, n: 12, mexe: 0.18 }), { r, largura: 3, tremor: 1.5, fechar: true, segunda: false, cor: 'rgba(18,19,15,.55)' });
    }
    // apaga para os lados e para baixo
    k.globalCompositeOperation = 'destination-in';
    const gv = k.createLinearGradient(0, fundo - 150, 0, fundo);
    gv.addColorStop(0, 'rgba(0,0,0,1)');
    gv.addColorStop(1, 'rgba(0,0,0,0)');
    k.fillStyle = gv;
    k.fillRect(0, 0, L, A);
    for (const [de, ate] of [[0, 220], [L, L - 220]]) {
      const gh = k.createLinearGradient(de, 0, ate, 0);
      gh.addColorStop(0, 'rgba(0,0,0,0)');
      gh.addColorStop(1, 'rgba(0,0,0,1)');
      k.fillStyle = gh;
      k.fillRect(0, 0, L, A);
    }
    ctx.drawImage(c, 0, 0);
    // a superfície: dois riscos, com o vão do broto, e os torrões levantados ao lado dele
    const lado = (x0, x1) => {
      const pts = [];
      const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 60));
      for (let i = 0; i <= n; i++) pts.push([x0 + (x1 - x0) * i / n, ys + (r() - 0.5) * 6]);
      return pts;
    };
    const fraco = (pts) => tracoTinta(ctx, pts, { r, largura: 6, tremor: 2.5 });
    fraco(lado(cx - 30, 150));
    fraco(lado(cx + 30, L - 150));
    for (const [de, ate, a] of [[60, 150, 0.4], [L - 150, L - 60, 0.4]]) {
      tracoTinta(ctx, lado(de, ate), { r, largura: 5, tremor: 2, segunda: false, cor: 'rgba(18,19,15,' + a + ')' });
    }
    // os torrões: dois montinhos de terra levantados pelo broto
    tracoTinta(ctx, [[cx - 30, ys + 1], [cx - 26, ys - 12], [cx - 16, ys - 14], [cx - 10, ys - 4]], { r, largura: 4, tremor: 1.5, segunda: false });
    tracoTinta(ctx, [[cx + 30, ys + 1], [cx + 26, ys - 10], [cx + 15, ys - 12], [cx + 10, ys - 3]], { r, largura: 4, tremor: 1.5, segunda: false });
    // tufos de capim na superfície, longe do broto
    for (const tx of [210, 330, 760, 880]) {
      for (const d of [-8, 0, 9]) {
        tracoTinta(ctx, [[tx + d, ys - 1], [tx + d * 1.8, ys - 16 - r() * 10]], { r, largura: 3, tremor: 1, segunda: false, cor: 'rgba(18,19,15,.6)' });
      }
    }
  }
  // A semente aberta: a casca em amêndoa, deitada, com a fenda por onde saem o broto (em
  // cima) e a raiz (embaixo); as raízes descem afinando e se dividem.
  function sementeComRaiz(ctx, x, y, r) {
    // as raízes: a principal desce em curva, as laterais saem dela; cada uma afina em trechos
    const raiz = (pts, larg) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const w = larg * (1 - i / (pts.length - 1)) + 1.4;
        tracoTinta(ctx, [pts[i], [(pts[i][0] + pts[i + 1][0]) / 2 + (r() - 0.5) * 4, (pts[i][1] + pts[i + 1][1]) / 2], pts[i + 1]], { r, largura: w, tremor: 1.2, segunda: false });
      }
    };
    raiz([[x + 4, y + 30], [x + 10, y + 70], [x - 4, y + 112], [x + 6, y + 156], [x - 2, y + 196]], 6);
    raiz([[x + 9, y + 62], [x + 40, y + 88], [x + 56, y + 126], [x + 80, y + 146]], 3.5);
    raiz([[x - 2, y + 104], [x - 38, y + 124], [x - 52, y + 160]], 3);
    raiz([[x + 4, y + 148], [x + 30, y + 170], [x + 36, y + 194]], 2.4);
    raiz([[x + 2, y + 40], [x - 30, y + 58], [x - 56, y + 64]], 2.6);
    // a casca: um feijão deitado, com a covinha em cima (de onde sai o broto), pintado de preto
    // por dentro para tapar a terra
    const rx = 62;
    const ry = 31;
    const casca = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30 * Math.PI * 2;
      let py = Math.sin(t) * ry;
      if (py < 0) py += ry * 0.22 * Math.exp(-(Math.cos(t) ** 2) / 0.12);
      casca.push([x + Math.cos(t) * rx * (1 + (r() - 0.5) * 0.03), y + py]);
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.12);
    ctx.translate(-x, -y);
    ctx.fillStyle = LP.salvia;
    ctx.beginPath();
    casca.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.fill();
    tracoTinta(ctx, casca, { r, largura: 6, tremor: 2, fechar: true });
    // as linhas da casca, acompanhando a barriga do feijão, e a fenda aberta na covinha
    tracoTinta(ctx, [[x - rx * 0.72, y + ry * 0.05], [x - rx * 0.2, y + ry * 0.32], [x + rx * 0.35, y + ry * 0.28], [x + rx * 0.74, y - ry * 0.02]],
      { r, largura: 2.5, tremor: 1, segunda: false, cor: 'rgba(18,19,15,.45)' });
    tracoTinta(ctx, [[x - 4, y - ry * 0.7], [x - 6, y - ry * 0.25]], { r, largura: 3, tremor: 1, segunda: false, cor: 'rgba(18,19,15,.8)' });
    ctx.restore();
  }
  // Um pedaço de fita adesiva fosca, clara, colado em (x, y) no ângulo dado.
  function fitaClara(ctx, x, y, w, h, ang, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const p = bordaRasgada([[[-w / 2, -h / 2], [w / 2, -h / 2], 1], [[w / 2, -h / 2], [w / 2, h / 2], 5], [[w / 2, h / 2], [-w / 2, h / 2], 1], [[-w / 2, h / 2], [-w / 2, -h / 2], 5]], r, 6);
    ctx.fillStyle = 'rgba(250,250,238,.5)';
    ctx.fill(p);
    ctx.restore();
  }
  function arteSemente(ctx) {
    const r = sorteio(1606);
    const x = 90;
    // em cima, a frase em bloco: Oswald em tinta, o meio em Permanent Marker numa tira de
    // papel creme e o fecho em creme numa tira de papel preto, as duas rasgadas e coladas
    const t1 = tamanhoPara(ctx, 'A SUA ORAÇÃO DE HOJE', L - 2 * x, 110);
    linhaSeca(ctx, 'A SUA ORAÇÃO DE HOJE', x - 2, 560 + t1 * 0.82, t1, LP.tinta);
    const y2 = 560 + t1 * 0.82 + 34;
    const w2 = tiraSalvia(ctx, 'ESTÁ CONSTRUINDO', x + 4, y2, 70, -0.035, r, { papel: LP.creme, borda: 'rgba(255,255,250,.7)' });
    fitaClara(ctx, x + 18, y2 + 8, 90, 34, -0.7, r);
    const tF = tamanhoPara(ctx, 'O MILAGRE DE AMANHÃ.', L - 2 * x - 80, 120);
    const y3 = y2 + 70 * 1.3 + 30;
    const w3 = tiraSalvia(ctx, 'O MILAGRE DE AMANHÃ.', x - 10, y3, tF, 0.018, r,
      { papel: LP.tinta, tinta: LP.creme, fonte: oswaldLP(tF, 700), borda: 'rgba(0,0,0,.4)' });
    fitaClara(ctx, x - 10 + w3 - 6, y3 + 14, 100, 36, 0.6, r);
    fitaClara(ctx, x + w2 - 10, y2 + 70 * 1.3 - 4, 84, 32, 0.5, r);
    // embaixo, o corte da terra em tinta: a semente aberta, as raízes e o broto que acaba de
    // furar a superfície, com "continue firme" escrito à mão e a seta apontando para ele
    const ys = y3 + tF * 1.3 + 200; // a superfície
    const bx = L / 2 + 200;
    const sx = bx - 44;
    const sy = ys + 110; // a semente
    corteDeTerra(ctx, bx, ys, 1500, r);
    // o broto, a semente e as raízes, maiores que o corte (o assunto é ele)
    const k = 1.35;
    ctx.save();
    ctx.translate(bx, ys);
    ctx.scale(k, k);
    ctx.translate(-bx, -ys);
    const haste = [[sx - 4, sy - 20], [sx - 6, sy - 56], [sx + 26, sy - 86], [bx - 4, ys + 12], [bx, ys + 2], [bx + 2, ys - 40], [bx - 2, ys - 66]];
    tracoTinta(ctx, haste, { r, largura: 6, tremor: 1.6, segunda: false });
    folhaCheia(ctx, bx - 2, ys - 64, 74, 26, -2.55);
    folhaCheia(ctx, bx, ys - 66, 70, 24, -0.55);
    sementeComRaiz(ctx, sx, sy, r);
    ctx.restore();
    // "continue firme" à mão, ao lado das folhas
    S.escrever(ctx, 'CONTINUE FIRME', x, ys - 104, '600 56px "Permanent Marker", cursive', LP.tinta, { alinhar: 'left' });
    return ys + 400;
  }

  // O propósito de Deus para a sua vida é maior do que qualquer obstáculo no seu caminho:
  // cartaz de paisagem que sangra a tela. A frase grande à esquerda, ocupando o céu (O
  // PROPÓSITO / DE DEUS enormes, o meio menor, NO SEU CAMINHO. em sálvia), a chama à direita.
  // Embaixo, as camadas de morros à mão em sálvia com um vale atrás da meta, o clarão amarelo
  // fraco subindo do horizonte, e o caminho com textura entrando pela borda de baixo: no
  // meio dele, a rocha partida em duas, as metades afastadas e as lascas no chão, e o caminho
  // passa pela quebra até a bandeirinha amarela (a única cor quente). Sem referência.
  // A bandeirinha da meta: o mastro e o pano ondulado, em amarelo, com o pé em (x, y).
  function bandeirinha(ctx, x, y, alt, r) {
    const cor = LP.amarelo;
    ctx.save();
    const g = ctx.createRadialGradient(x, y - alt * 0.6, 0, x, y - alt * 0.6, alt * 1.8);
    g.addColorStop(0, 'rgba(255,196,77,.16)');
    g.addColorStop(1, 'rgba(255,196,77,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - alt * 2, y - alt * 2.4, alt * 4, alt * 3.6);
    ctx.restore();
    tracoAMao(ctx, [[x, y], [x + 1, y - alt * 0.5], [x, y - alt]], { r, largura: 4.5, tremor: 1, segunda: false, cor });
    const p = new Path2D();
    const w = alt * 0.62;
    const h = alt * 0.36;
    p.moveTo(x + 2, y - alt);
    p.bezierCurveTo(x + w * 0.35, y - alt - h * 0.18, x + w * 0.6, y - alt + h * 0.16, x + w, y - alt + h * 0.02);
    p.lineTo(x + w * 0.86, y - alt + h * 0.52);
    p.lineTo(x + w, y - alt + h);
    p.bezierCurveTo(x + w * 0.6, y - alt + h * 1.1, x + w * 0.35, y - alt + h * 0.8, x + 2, y - alt + h * 0.92);
    p.closePath();
    ctx.fillStyle = cor;
    ctx.fill(p);
    // o chão da meta: um risquinho amarelo
    tracoAMao(ctx, [[x - alt * 0.3, y + 2], [x + alt * 0.35, y + 1]], { r, largura: 3, tremor: 1, segunda: false, cor });
  }
  // Uma metade da rocha partida: o contorno arredondado por fora e a face da quebra, em
  // dentes, virada para o caminho (lado: -1 é a metade da esquerda). (xq, yg) é o pé da
  // quebra no chão; w e h, o tamanho da metade.
  function metadeDaRocha(ctx, xq, yg, w, h, lado, r) {
    const P = (u, v) => [xq + lado * u * w, yg - v * h];
    // por fora: do pé da quebra, pelo chão, sobe pelas costas arredondadas até o topo
    // (as quinas ligadas por trechos retos, para o traço quebrar como pedra, não como pão)
    const quinas = [[0, 0], [0.6, 0], [0.97, 0], [1, -0.14], [0.93, -0.34], [0.97, -0.5], [0.84, -0.7], [0.64, -0.85], [0.44, -0.97], [0.22, -1], [0.1, -0.95]]
      .map(([u, v]) => P(u + (r() - 0.5) * 0.03, -v + (r() - 0.5) * 0.03));
    const fora = [quinas[0]];
    for (let i = 1; i < quinas.length; i++) {
      const [ax, ay] = quinas[i - 1];
      const [bx, by] = quinas[i];
      for (const t of [0.15, 0.85, 1]) fora.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
    // a sombra deitada no chão, para trás e para fora (a luz vem da meta)
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath();
    ctx.ellipse(xq + lado * w * 0.55, yg + 4, w * 0.75, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // a face da quebra: desce do topo em dentes até o pé, inclinada para fora em cima
    const quebra = [];
    for (let i = 0; i <= 13; i++) {
      const t = i / 13;
      const dente = (i % 2 ? 1 : -1) * (0.02 + r() * 0.05) * (i && i < 13 ? 1 : 0);
      quebra.push(P(0.1 * (1 - t) + dente - 0.03 * t, 0.95 * (1 - t) + (r() - 0.5) * 0.03));
    }
    const pts = fora.concat(quebra);
    ctx.fillStyle = '#121310';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    // a hachura de sombra nas costas e a face da quebra mais clara (a luz da meta bate nela)
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 26; i++) {
      const u = 0.45 + r() * 0.6;
      const [x0, y0] = P(u, r() * 0.9);
      tracoAMao(ctx, [[x0, y0], [x0 + lado * 26, y0 + 30]], { r, largura: 2.2, tremor: 1, segunda: false, cor: 'rgba(200,218,140,.28)' });
    }
    const [qx, qy] = P(0.1, 0.5);
    const g = ctx.createRadialGradient(qx, qy, 0, qx, qy, w * 0.5);
    g.addColorStop(0, 'rgba(200,218,140,.16)');
    g.addColorStop(1, 'rgba(200,218,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(qx - w, qy - h, w * 2, h * 2);
    for (let i = 1; i < 6; i++) {
      const a = P(0.1 + (r() - 0.5) * 0.06, 0.96 * i / 6);
      const b = P(0.26 + r() * 0.12, 0.96 * i / 6 + (r() - 0.5) * 0.08);
      tracoAMao(ctx, [a, b], { r, largura: 2.5, tremor: 1, segunda: false, cor: 'rgba(200,218,140,.45)' });
    }
    ctx.restore();
    // as arestas por cima e o contorno
    tracoAMao(ctx, [P(0.3, 1), P(0.4, 0.62), P(0.7, 0.5), P(0.9, 0.62)], { r, largura: 3.5, tremor: 1.5, segunda: false, cor: 'rgba(200,218,140,.55)' });
    tracoAMao(ctx, [P(0.4, 0.62), P(0.46, 0.2)], { r, largura: 3, tremor: 1.5, segunda: false, cor: 'rgba(200,218,140,.4)' });
    tracoAMao(ctx, fora, { r, largura: 8, tremor: 2.5 });
    // a face da quebra em linha quebrada de verdade (sem alisar), mais clara
    ctx.save();
    ctx.strokeStyle = 'rgba(225,236,190,.95)';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'round';
    ctx.beginPath();
    quebra.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
    ctx.restore();
  }
  // As camadas de morros no horizonte, do fundo para a frente: cada uma tapa a de trás (o
  // miolo escuro), tem a crista à mão em sálvia e abre um vale atrás da meta.
  function morros(ctx, H, xh, r) {
    for (const [alto, alfa, tom, f] of [[230, 0.22, '#121410', 0.006], [160, 0.36, '#10120e', 0.009], [92, 0.55, '#0e0f0c', 0.013]]) {
      const pts = [];
      const fase = r() * 10;
      for (let x = -40; x <= L + 40; x += 30) {
        const vale = 1 - 0.92 * Math.exp(-(((x - xh) / 200) ** 2));
        const rampa = 0.35 + 0.65 * Math.min(1, x / L + 0.2);
        const y = H - alto * vale * rampa * (0.55 + 0.22 * Math.sin(x * f + fase) + 0.14 * Math.sin(x * f * 2.3 + fase * 2) + 0.09 * Math.sin(x * f * 5.1 + fase * 3)) + (r() - 0.5) * 5;
        pts.push([x, y]);
      }
      ctx.fillStyle = tom;
      ctx.beginPath();
      ctx.moveTo(-40, H + 2);
      pts.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(L + 40, H + 2);
      ctx.closePath();
      ctx.fill();
      // a hachura deitada dentro do morro, rala
      ctx.save();
      ctx.clip();
      for (let y = H - alto; y < H; y += 14) {
        tracoAMao(ctx, [[-20, y], [L / 2, y + (r() - 0.5) * 4], [L + 20, y]], { r, largura: 1.2, tremor: 1, segunda: false, cor: 'rgba(200,218,140,' + (alfa * 0.22).toFixed(3) + ')' });
      }
      ctx.restore();
      tracoAMao(ctx, pts, { r, largura: 3 + alfa * 3, tremor: 1.5, segunda: false, cor: 'rgba(200,218,140,' + alfa + ')' });
    }
  }
  function arteCaminho(ctx) {
    const r = sorteio(1414);
    const x = 90;
    const H = 1170; // o horizonte
    const B = 2300; // o pé do caminho, abaixo do quadro
    const xh = 780; // a meta, no horizonte
    // a frase grande, à esquerda, ocupando o céu
    const linhas = [
      { t: 'O PROPÓSITO', larg: 860, max: 190, cor: LP.creme, vao: 0 },
      { t: 'DE DEUS', larg: 860, max: 190, cor: LP.creme, vao: 18, igual: 0 },
      { t: 'PARA A SUA VIDA É MAIOR DO QUE', larg: 860, max: 60, cor: LP.texto, peso: 500, espaco: 2, vao: 34 },
      { t: 'QUALQUER OBSTÁCULO', larg: 900, max: 140, cor: LP.creme, vao: 30 },
      { t: 'NO SEU CAMINHO.', larg: 900, max: 140, cor: LP.salvia, vao: 18, igual: 3 },
    ];
    for (const l of linhas) l.tam = tamanhoPara(ctx, l.t, l.larg, l.max, l.peso || 700);
    for (const l of linhas) if (l.igual !== undefined) l.tam = Math.min(l.tam, linhas[l.igual].tam);
    // o céu: o clarão amarelo fraco atrás da meta, subindo do horizonte, e os riscos deitados
    const g = ctx.createRadialGradient(xh, H, 0, xh, H, 820);
    g.addColorStop(0, 'rgba(255,196,77,.30)');
    g.addColorStop(0.25, 'rgba(255,196,77,.10)');
    g.addColorStop(0.6, 'rgba(200,218,140,.04)');
    g.addColorStop(1, 'rgba(200,218,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, H + 10);
    for (let i = 0; i < 9; i++) {
      const y = H - 260 + i * 26;
      const x0 = xh - 420 + r() * 120;
      tracoAMao(ctx, [[x0, y], [xh + (r() - 0.5) * 60, y + (r() - 0.5) * 3], [xh + 440 - r() * 120, y]], { r, largura: 1.6, tremor: 1, segunda: false, cor: 'rgba(255,214,130,' + (0.05 + i * 0.012).toFixed(3) + ')' });
    }
    morros(ctx, H, xh, r);
    // o chão: o campo em sulcos e tufos
    const yDe = (s) => H + (B - H) * Math.pow(1 - s, 1.6);
    const pDe = (s) => (yDe(s) - H) / (B - H);
    for (let i = 1; i < 34; i++) {
      const s = i / 34;
      const y = yDe(s);
      if (y > A + 10) continue;
      const p = pDe(s);
      const pts = [];
      for (let xx = -20; xx <= L + 20; xx += 90) pts.push([xx, y + Math.sin(xx / 140 + i) * 6 * p]);
      tracoAMao(ctx, pts, { r, largura: 1 + 2.5 * p, tremor: 1 + p, segunda: false, cor: 'rgba(200,218,140,' + (0.07 + 0.16 * p).toFixed(2) + ')' });
    }
    // o caminho: largo no pé, num S suave até a meta, pintado um pouco mais claro que o campo
    const meia = 600;
    const meio = (s) => xh + (L / 2 - 40 + 300 * Math.sin(s * 4.6 + 0.2) * (1 - s * 0.6) - xh) * pDe(s);
    const borda = (lado) => {
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const s = i / 60 * 0.995;
        pts.push([meio(s) + lado * meia * pDe(s), yDe(s)]);
      }
      return pts;
    };
    const esq = borda(-1);
    const dir = borda(1);
    const chao = new Path2D();
    esq.forEach(([px, py], i) => (i ? chao.lineTo(px, py) : chao.moveTo(px, py)));
    for (let i = dir.length - 1; i >= 0; i--) chao.lineTo(dir[i][0], dir[i][1]);
    chao.closePath();
    ctx.save();
    const gc = ctx.createLinearGradient(0, H, 0, A);
    gc.addColorStop(0, 'rgba(255,214,130,.16)');
    gc.addColorStop(0.3, 'rgba(200,218,140,.07)');
    gc.addColorStop(1, 'rgba(200,218,140,.05)');
    ctx.fillStyle = '#0d0e0c';
    ctx.fill(chao);
    ctx.fillStyle = gc;
    ctx.fill(chao);
    ctx.clip(chao);
    // a textura do caminho: riscos de través, que se juntam para trás, e o cascalho
    for (let i = 0; i < 70; i++) {
      const s = Math.pow(i / 70, 0.9) * 0.97;
      const p = pDe(s);
      const y = yDe(s) + (r() - 0.5) * 8 * p;
      const xm = meio(s) + (r() - 0.5) * meia * p * 1.4;
      const comp = (30 + r() * 80) * p;
      tracoAMao(ctx, [[xm - comp, y], [xm + comp, y + (r() - 0.5) * 4 * p]], { r, largura: 1 + 2.5 * p, tremor: 1, segunda: false, cor: 'rgba(200,218,140,' + (0.12 + 0.2 * p).toFixed(2) + ')' });
    }
    for (let i = 0; i < 260; i++) {
      const s = Math.pow(r(), 1.2) * 0.95;
      const p = pDe(s);
      ctx.fillStyle = 'rgba(200,218,140,' + (0.15 + r() * 0.3).toFixed(2) + ')';
      ctx.beginPath();
      ctx.ellipse(meio(s) + (r() - 0.5) * 2 * meia * p, yDe(s), 1.2 + p * 5 * r(), 0.8 + p * 2.6 * r(), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // as marcas de roda: duas linhas que acompanham o caminho
    for (const k of [-0.42, 0.42]) {
      const pts = [];
      for (let i = 0; i <= 30; i++) {
        const s = i / 30 * 0.97;
        pts.push([meio(s) + k * meia * pDe(s), yDe(s)]);
      }
      tracoAMao(ctx, pts, { r, largura: 3, tremor: 1.5, segunda: false, cor: 'rgba(200,218,140,.22)' });
    }
    ctx.restore();
    // as beiradas, grossas na frente e finas no fundo
    for (const pts of [esq, dir]) {
      for (let i = 0; i < pts.length - 1; i += 6) {
        const t = i / pts.length;
        tracoAMao(ctx, pts.slice(i, i + 7), { r, largura: 10 - t * 8, tremor: 1.6 - t, segunda: t < 0.5, cor: 'rgba(200,218,140,' + Math.min(1, 1.15 - t * 0.5).toFixed(2) + ')' });
      }
    }
    // os tufos do campo, fora do caminho
    for (let i = 0; i < 120; i++) {
      const s = Math.pow(r(), 0.9) * 0.92;
      const p = pDe(s);
      const xx = r() * L;
      if (Math.abs(xx - meio(s)) < meia * p + 40 * p) continue;
      const y = yDe(s);
      for (const d of [-1, 0, 1]) {
        tracoAMao(ctx, [[xx + d * 10 * p, y], [xx + d * 18 * p, y - (18 + 12 * r()) * (0.4 + p)]], { r, largura: 1 + 2.2 * p, tremor: 1, segunda: false, cor: 'rgba(200,218,140,' + (0.25 + 0.35 * p).toFixed(2) + ')' });
      }
    }
    // a rocha partida no meio do caminho: as duas metades afastadas e o caminho passando
    // pela quebra; lascas no chão
    const sb = 0.55;
    const pb = pDe(sb);
    const yb = yDe(sb);
    const xm = meio(sb);
    const vao = meia * pb * 0.62;
    metadeDaRocha(ctx, xm - vao, yb, 780 * pb, 900 * pb, -1, r);
    metadeDaRocha(ctx, xm + vao, yb + 6, 720 * pb, 800 * pb, 1, r);
    for (const [dx, dy, w] of [[-0.3, 26, 22], [0.12, 46, 16], [0.36, 18, 26], [-0.05, 70, 12], [0.55, 60, 18]]) {
      const lx = xm + dx * vao * 2;
      const ly = yb + dy;
      const pts = [[lx - w, ly], [lx - w * 0.5, ly - w * 0.75], [lx + w * 0.3, ly - w * 0.85], [lx + w, ly - w * 0.2], [lx + w * 0.7, ly + w * 0.15]];
      ctx.fillStyle = '#1a1c17';
      ctx.strokeStyle = 'rgba(200,218,140,.75)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    bandeirinha(ctx, xh, H + 2, 70, r);
    // a frase por cima de tudo, com a sombra escura para ler sobre o clarão e os morros
    let y = 520;
    for (const l of linhas) {
      y += l.vao + l.tam * 0.8;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.75)';
      ctx.shadowBlur = 24;
      linhaSeca(ctx, l.t, x - 4, y, l.tam, l.cor, { peso: l.peso || 700, espaco: l.espaco || 0 });
      ctx.restore();
    }
    // a marca fica sobre o campo: um escuro suave atrás dela
    const gm = ctx.createRadialGradient(250, PE, 0, 250, PE, 300);
    gm.addColorStop(0, 'rgba(13,14,12,.9)');
    gm.addColorStop(1, 'rgba(13,14,12,0)');
    ctx.save();
    ctx.translate(0, PE);
    ctx.scale(1, 0.5);
    ctx.translate(0, -PE);
    ctx.fillStyle = gm;
    ctx.fillRect(0, PE - 300, 600, 600);
    ctx.restore();
    return A;
  }

  // Somos remanescentes: editorial e bruto. A palavra enorme, à esquerda, em três linhas que
  // enchem a largura (SOMOS / REMANES- / CENTES.), feita de carvão que esfria: a cinza clara
  // por cima, manchada, a beira queimada e as rachaduras escuras, e só umas poucas
  // rachaduras ainda acesas por dentro, mais na última linha. O ponto final é a brasa que
  // não apaga, o ponto mais claro da arte. Embaixo, o chão de cinza e carvão já apagado.
  // Nada de chama: o pouco que restou e continua aceso. A chama e a marca vão na margem
  // esquerda. Sem referência.
  // Uma brasa: um carvão de borda irregular centrado em (x, y), largura w; apagada, em cinza
  // com a beira de cima mais clara e as rachaduras escuras; acesa, o miolo amarelo, a borda
  // laranja e as rachaduras brilhando.
  function brasa(ctx, x, y, w, r, acesa) {
    const n = 9 + Math.floor(r() * 4);
    const h = w * (0.48 + r() * 0.16);
    const giro = (r() - 0.5) * 0.5;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i + r() * 0.5) / n * Math.PI * 2;
      const k = 0.74 + r() * 0.32;
      const px = Math.cos(a) * w / 2 * k;
      const py = Math.sin(a) * h / 2 * k;
      pts.push([x + px * Math.cos(giro) - py * Math.sin(giro), y + px * Math.sin(giro) + py * Math.cos(giro)]);
    }
    const forma = new Path2D();
    pts.forEach(([px, py], i) => (i ? forma.lineTo(px, py) : forma.moveTo(px, py)));
    forma.closePath();
    ctx.save();
    // a sombra embaixo, que assenta a brasa no chão
    ctx.save();
    ctx.translate(0, h * 0.2);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fill(forma);
    ctx.restore();
    if (acesa) {
      const g = ctx.createRadialGradient(x, y - h * 0.12, 0, x, y, w * 0.6);
      g.addColorStop(0, '#ffd772');
      g.addColorStop(0.5, '#f6a24f');
      g.addColorStop(1, '#c9663b');
      ctx.fillStyle = g;
    } else {
      const t = Math.round(26 + r() * 20);
      const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
      g.addColorStop(0, 'rgb(' + (t + 22) + ',' + (t + 23) + ',' + (t + 20) + ')');
      g.addColorStop(0.45, 'rgb(' + t + ',' + (t + 1) + ',' + (t - 2) + ')');
      g.addColorStop(1, 'rgb(' + (t - 14) + ',' + (t - 13) + ',' + (t - 15) + ')');
      ctx.fillStyle = g;
    }
    ctx.fill(forma);
    ctx.clip(forma);
    if (acesa) {
      // a crosta de cinza por cima: a luz aparece nas frestas entre as placas
      for (let i = 0; i < 4; i++) {
        const px = x + (r() - 0.5) * w * 0.8;
        const py = y + (r() - 0.35) * h * 0.7;
        ctx.fillStyle = 'rgba(64,60,56,' + (0.6 + r() * 0.3).toFixed(2) + ')';
        ctx.beginPath();
        const m = 6;
        for (let j = 0; j < m; j++) {
          const a = j / m * Math.PI * 2;
          const rr = w * (0.1 + r() * 0.1);
          const X = px + Math.cos(a) * rr;
          const Y = py + Math.sin(a) * rr * 0.6;
          if (j) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // a cinza clara salpicada e as rachaduras escuras
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(170,172,162,' + (0.1 + r() * 0.16).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(x + (r() - 0.5) * w * 0.7, y - r() * h * 0.35, Math.max(0.8, w * 0.03), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(14,14,12,.6)';
      ctx.lineWidth = Math.max(1, w * 0.03);
      ctx.lineCap = 'round';
      const ax = x + (r() - 0.5) * w * 0.5;
      const ay = y + (r() - 0.5) * h * 0.4;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + (r() - 0.5) * w * 0.4, ay + (r() - 0.5) * h * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
  // O brilho baixo de uma brasa acesa, no chão em volta dela (antes das brasas, por baixo).
  function brilhoDeBrasa(ctx, x, y, w) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.55);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 2.6);
    g.addColorStop(0, 'rgba(255,170,80,.42)');
    g.addColorStop(0.4, 'rgba(240,140,70,.14)');
    g.addColorStop(1, 'rgba(240,140,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-w * 2.6, -w * 2.6, w * 5.2, w * 5.2);
    ctx.restore();
  }
  // O campo de brasas entre y0 (o fundo) e y1 (a frente), numa camada que apaga para cima e
  // para os lados: as apagadas em cinza e, no meio, as acesas com o brilho baixo.
  function campoDeBrasas(ctx, y0, y1, r, acesas, n) {
    const yDe = (d) => y0 + (y1 - y0) * d;
    const tamDe = (d) => 12 + Math.pow(d, 1.4) * 70;
    const brasas = [];
    for (let i = 0; i < n; i++) {
      const d = Math.pow(r(), 0.85);
      brasas.push({ x: -20 + r() * (L + 40), d, w: tamDe(d) * (0.7 + r() * 0.6), acesa: false });
    }
    for (const [u, d] of acesas) brasas.push({ x: 120 + u * (L - 240), d, w: tamDe(d) * 1.2, acesa: true });
    brasas.sort((a, b) => a.d - b.d);
    const { c, ctx: k } = camada();
    for (let i = 0; i < 900; i++) {
      const d = Math.pow(r(), 0.8);
      k.fillStyle = 'rgba(160,162,152,' + (0.08 + r() * 0.18).toFixed(2) + ')';
      k.beginPath();
      k.arc(r() * L, yDe(d) + (r() - 0.5) * 20, 0.8 + d * 1.6 * r(), 0, Math.PI * 2);
      k.fill();
    }
    for (const b of brasas) if (b.acesa) brilhoDeBrasa(k, b.x, yDe(b.d), b.w);
    for (const b of brasas) if (!b.acesa) brasa(k, b.x + (r() - 0.5) * 6, yDe(b.d) + (r() - 0.5) * (4 + b.d * 18), b.w, r, false);
    for (const b of brasas) if (b.acesa) brasa(k, b.x, yDe(b.d), b.w, r, true);
    for (const b of brasas) {
      if (!b.acesa) continue;
      for (const dx of [-0.42, 0.1, 0.5]) {
        const d = Math.min(1, b.d + 0.035);
        brasa(k, b.x + dx * b.w + (r() - 0.5) * 8, yDe(d) + tamDe(d) * 0.12, tamDe(d) * (0.7 + r() * 0.35), r, false);
      }
    }
    k.globalCompositeOperation = 'lighter';
    for (const b of brasas) if (b.acesa) brilhoDeBrasa(k, b.x, yDe(b.d), b.w * 0.9);
    k.globalCompositeOperation = 'destination-in';
    const gv = k.createLinearGradient(0, y0 - 20, 0, y0 + 110);
    gv.addColorStop(0, 'rgba(0,0,0,0)');
    gv.addColorStop(1, 'rgba(0,0,0,1)');
    k.fillStyle = gv;
    k.fillRect(0, 0, L, A);
    const gb = k.createLinearGradient(0, y1 - 40, 0, y1 + 30);
    gb.addColorStop(0, 'rgba(0,0,0,1)');
    gb.addColorStop(1, 'rgba(0,0,0,0)');
    k.fillStyle = gb;
    k.fillRect(0, 0, L, A);
    ctx.drawImage(c, 0, 0);
  }
  // Uma rachadura: um traço quebrado que anda a partir de (x, y), muda de rumo aos poucos e
  // às vezes solta um galho. Devolve a lista de trechos [[x, y], ...].
  function rachadura(x, y, ang, passos, r, galhos = 1) {
    const trechos = [];
    const pts = [[x, y]];
    for (let i = 0; i < passos; i++) {
      ang += (r() - 0.5) * 1.1;
      const d = 12 + r() * 20;
      x += Math.cos(ang) * d;
      y += Math.sin(ang) * d;
      pts.push([x, y]);
      if (galhos > 0 && i > 1 && r() < 0.18) trechos.push(...rachadura(x, y, ang + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.6), 2 + Math.floor(r() * 4), r, galhos - 1));
    }
    trechos.unshift(pts);
    return trechos;
  }
  // A palavra como carvão que esfria: as letras em cinza de cinza (a cinza clara por cima do
  // carvão), manchadas, com a beira queimada e rachaduras escuras; só algumas rachaduras
  // ainda brilham por dentro, em amarelo. linhas: [{ t, x, y, tam }]; acesas: quantas
  // rachaduras continuam acesas em cada linha.
  function palavraDeCarvao(ctx, linhas, r) {
    const { c, ctx: k } = camada();
    for (const l of linhas) S.escrever(k, l.t, l.x, l.y, oswaldLP(l.tam, 700), '#c9c5b8', { alinhar: 'left' });
    k.globalCompositeOperation = 'source-atop';
    // as manchas da cinza: mais escuras e mais claras, largas e suaves
    for (const l of linhas) {
      ctx.font = oswaldLP(l.tam, 700);
      const w = ctx.measureText(l.t).width;
      for (let i = 0; i < 26; i++) {
        const mx = l.x + r() * w;
        const my = l.y - r() * l.tam * 0.8;
        const raio = l.tam * (0.15 + r() * 0.4);
        const g = k.createRadialGradient(mx, my, 0, mx, my, raio);
        const escuro = r() < 0.55;
        g.addColorStop(0, escuro ? 'rgba(70,66,60,.30)' : 'rgba(236,232,220,.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        k.fillStyle = g;
        k.fillRect(mx - raio, my - raio, raio * 2, raio * 2);
      }
      // o pó: pontinhos escuros e claros
      for (let i = 0; i < 1600; i++) {
        k.fillStyle = r() < 0.6 ? 'rgba(40,38,34,' + (0.2 + r() * 0.4).toFixed(2) + ')' : 'rgba(245,242,232,' + (0.2 + r() * 0.4).toFixed(2) + ')';
        k.fillRect(l.x + r() * w, l.y - r() * l.tam * 0.82, 1 + r() * 2, 1 + r() * 2);
      }
    }
    // a beira queimada: o contorno da letra escurecido por dentro
    for (const l of linhas) {
      k.font = oswaldLP(l.tam, 700);
      k.textAlign = 'left';
      k.textBaseline = 'alphabetic';
      k.lineJoin = 'round';
      k.save();
      k.filter = 'blur(' + Math.round(l.tam * 0.03) + 'px)';
      k.strokeStyle = 'rgba(30,28,25,.7)';
      k.lineWidth = l.tam * 0.07;
      k.strokeText(l.t, l.x, l.y);
      k.restore();
    }
    // as rachaduras: as escuras em todas as linhas; as acesas, poucas
    const acesas = [];
    k.lineCap = 'round';
    k.lineJoin = 'round';
    for (const l of linhas) {
      ctx.font = oswaldLP(l.tam, 700);
      const w = ctx.measureText(l.t).width;
      const n = Math.round(w / 70);
      const passo = Math.max(1, Math.floor(n / (l.acesas || 1)));
      let nAcesas = 0;
      for (let i = 0; i < n; i++) {
        const x0 = l.x + (i + r()) * w / n;
        const y0 = l.y - l.tam * (0.15 + r() * 0.55);
        const tr = rachadura(x0, y0, r() * Math.PI * 2, 3 + Math.floor(r() * 5), r);
        const acesa = !!l.acesas && i % passo === passo >> 1 && nAcesas < l.acesas;
        if (acesa) nAcesas++;
        for (const pts of tr) {
          if (acesa) { acesas.push({ l, pts }); continue; }
          k.strokeStyle = 'rgba(22,20,18,' + (0.55 + r() * 0.35).toFixed(2) + ')';
          k.lineWidth = 2 + r() * 3.5;
          k.beginPath();
          pts.forEach(([px, py], j) => (j ? k.lineTo(px, py) : k.moveTo(px, py)));
          k.stroke();
        }
      }
    }
    // as acesas: o calor espalhado em volta, o risco laranja-amarelo e o miolo claro
    for (const { pts } of acesas) {
      const [mx, my] = pts[Math.floor(pts.length / 2)];
      const g = k.createRadialGradient(mx, my, 0, mx, my, 90);
      g.addColorStop(0, 'rgba(255,170,60,.35)');
      g.addColorStop(1, 'rgba(255,170,60,0)');
      k.fillStyle = g;
      k.fillRect(mx - 90, my - 90, 180, 180);
    }
    for (const [cor, lw, sombra] of [['rgba(110,40,12,.9)', 11, 0], ['#f6a24f', 6, 22], ['#ffd772', 2.6, 8]]) {
      k.save();
      k.strokeStyle = cor;
      k.lineWidth = lw;
      k.shadowColor = 'rgba(255,170,60,.9)';
      k.shadowBlur = sombra;
      for (const { pts } of acesas) {
        k.beginPath();
        pts.forEach(([px, py], j) => (j ? k.lineTo(px, py) : k.moveTo(px, py)));
        k.stroke();
      }
      k.restore();
    }
    ctx.drawImage(c, 0, 0);
  }
  function arteBrasas(ctx) {
    const r = sorteio(1990);
    const x = 84;
    const larg = L - 2 * x;
    // a palavra enorme, à esquerda, quebrada em três linhas que enchem a largura
    const alt = (t) => { ctx.font = oswaldLP(t, 700); return ctx.measureText('H').actualBoundingBoxAscent; };
    const t1 = tamanhoPara(ctx, 'SOMOS', larg, 300);
    const b1 = 560 + alt(t1);
    const t2 = tamanhoPara(ctx, 'REMANES-', larg, 400);
    const b2 = b1 + 44 + alt(t2);
    const t3 = tamanhoPara(ctx, 'CENTES.', larg, 400);
    const b3 = b2 + 44 + alt(t3);
    // o chão de cinza e carvão embaixo, quase apagado: o que restou
    campoDeBrasas(ctx, b3 + 30, 1500, r, [], 420);
    // a palavra de carvão: as rachaduras ainda acesas vão crescendo até a última linha
    palavraDeCarvao(ctx, [
      { t: 'SOMOS', x: x - 6, y: b1, tam: t1, acesas: 2 },
      { t: 'REMANES-', x: x - 6, y: b2, tam: t2, acesas: 3 },
      { t: 'CENTES.', x: x - 6, y: b3, tam: t3, acesas: 4 },
    ], r);
    // o ponto final é a brasa que não apaga: o mais claro da arte, com o brilho em volta
    ctx.font = oswaldLP(t3, 700);
    const xp = x - 6 + ctx.measureText('CENTES').width;
    const wp = ctx.measureText('.').width;
    const cxp = xp + wp / 2;
    const cyp = b3 - wp * 0.32;
    const g = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, wp * 2.6);
    g.addColorStop(0, 'rgba(255,196,77,.55)');
    g.addColorStop(0.35, 'rgba(255,160,60,.18)');
    g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cxp - wp * 3, cyp - wp * 3, wp * 6, wp * 6);
    ctx.save();
    ctx.shadowColor = 'rgba(255,190,80,.95)';
    ctx.shadowBlur = 40;
    const gp = ctx.createRadialGradient(cxp, cyp - wp * 0.1, 0, cxp, cyp, wp * 0.7);
    gp.addColorStop(0, '#fff1b8');
    gp.addColorStop(0.5, '#ffd772');
    gp.addColorStop(1, '#f6a24f');
    S.escrever(ctx, '.', xp, b3, oswaldLP(t3, 700), gp, { alinhar: 'left' });
    ctx.restore();
    return 1500;
  }

  // ---------- sexta leva (rodada 13) ----------
  // Quatro frases da ofensiva que ainda não tinham arte, cada uma num fundo diferente (sálvia,
  // o fundo do mar, o amarelo e o papel), com composição, letra e fecho próprios. Nenhuma fecha
  // com a palavra amarela sublinhada; nada de figura humana, prédio, coroa ou foto.

  // Perseverando até o fim: a pista de atletismo vista de cima, em sálvia, as raias de cima a
  // baixo. PERSEVERANDO, gigante e de pé, corre dentro da primeira raia, de baixo para cima,
  // e chega na faixa quadriculada da chegada; ATÉ O FIM está pintado no chão logo antes dela,
  // e os números das raias e a largada escalonada ficam embaixo. Fechamento: a chegada
  // quadriculada (a ofensiva é a corrida). Sem referência.
  const RAIA = { x0: 46, w: 247 }; // a primeira raia; as outras seguem com a mesma largura
  function pistaDeCima(ctx, r) {
    ctx.fillStyle = LP.salvia;
    ctx.fillRect(0, 0, L, A);
    // a borracha da pista: pintinhas claras e escuras bem miúdas, e manchas de uso
    for (let i = 0; i < 26; i++) {
      const x = r() * L;
      const y = r() * A;
      const rr = 120 + r() * 320;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, r() < 0.5 ? 'rgba(90,110,40,.08)' : 'rgba(250,255,230,.12)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = r() < 0.55 ? 'rgba(70,88,30,.16)' : 'rgba(255,255,240,.2)';
      ctx.fillRect(r() * L, r() * A, 1.5 + r() * 2, 1.5 + r() * 2);
    }
    // as linhas das raias, em tinta branca de pista, um pouco gastas
    const { c, ctx: k } = camada();
    k.fillStyle = '#fbfaf0';
    for (let i = 0; i <= 4; i++) {
      const x = RAIA.x0 + i * RAIA.w;
      k.fillRect(x - 6, 0, 12, A);
    }
    gastar(c, { x: 0, y: 0, w: L, h: A }, { pontos: 2200, manchas: 40, riscos: 160, semente: 1301, forca: 0.8 });
    // a tinta das linhas some atrás da marca (no pé, à direita), para ela se ler limpa
    k.globalCompositeOperation = 'destination-out';
    const gm = k.createRadialGradient(560, PE, 0, 560, PE, 260);
    gm.addColorStop(0, 'rgba(0,0,0,1)');
    gm.addColorStop(0.7, 'rgba(0,0,0,1)');
    gm.addColorStop(1, 'rgba(0,0,0,0)');
    k.save();
    k.translate(560, PE);
    k.scale(1, 0.42);
    k.translate(-560, -PE);
    k.fillStyle = gm;
    k.fillRect(260, PE - 300, 600, 600);
    k.restore();
    k.globalCompositeOperation = 'source-over';
    ctx.drawImage(c, 0, 0);
  }
  // A faixa quadriculada da chegada, de lado a lado, em (y) com a altura h.
  function chegadaQuadriculada(ctx, y, h, r) {
    const { c, ctx: k } = camada();
    const lado = h / 2;
    for (let col = 0; col * lado < L; col++) {
      for (let lin = 0; lin < 2; lin++) {
        k.fillStyle = (col + lin) % 2 ? '#fbfaf0' : LP.tinta;
        k.fillRect(col * lado, y + lin * lado, lado + 0.5, lado + 0.5);
      }
    }
    gastar(c, { x: 0, y, w: L, h }, { pontos: 900, manchas: 14, riscos: 70, semente: 1302, forca: 0.7 });
    ctx.drawImage(c, 0, 0);
  }
  // Tinta de chão pintada (o texto da pista), gasta pelo uso.
  function tintaDeChao(ctx, desenho, caixa, semente) {
    const { c, ctx: k } = camada();
    desenho(k);
    gastar(c, caixa, { pontos: 900, manchas: 0, riscos: 50, semente, forca: 0.6 });
    ctx.drawImage(c, 0, 0);
  }
  function arteChegada(ctx) {
    const r = sorteio(1300);
    pistaDeCima(ctx, r);
    const yLinha = 560; // a chegada
    chegadaQuadriculada(ctx, yLinha, 64, r);
    // PERSEVERANDO, de pé na primeira raia: lido de baixo para cima, até a chegada
    const xRaia = RAIA.x0 + RAIA.w / 2;
    const comp = 1640 - (yLinha + 64 + 28);
    const tam = Math.min(caber(ctx, 'PERSEVERANDO', (t) => oswaldLP(t, 700), comp, 400), 300);
    ctx.font = oswaldLP(tam, 700);
    const m = ctx.measureText('PERSEVERANDO');
    const cap = m.actualBoundingBoxAscent;
    tintaDeChao(ctx, (k) => {
      k.save();
      k.translate(xRaia + cap / 2, yLinha + 64 + 28 + m.width);
      k.rotate(-Math.PI / 2);
      k.font = oswaldLP(tam, 700);
      k.fillStyle = LP.tinta;
      k.textAlign = 'left';
      k.textBaseline = 'alphabetic';
      k.fillText('PERSEVERANDO', 0, 0);
      k.restore();
    }, { x: RAIA.x0, y: yLinha, w: RAIA.w, h: A - yLinha }, 1303);
    // ATÉ O FIM no chão das outras três raias, logo antes da chegada
    const x2 = RAIA.x0 + RAIA.w + 34;
    const larg2 = L - x2 - 40;
    const t2 = caber(ctx, 'ATÉ O FIM', (t) => oswaldLP(t, 700), larg2, 260);
    ctx.font = oswaldLP(t2, 700);
    const a2 = ctx.measureText('ATÉ O FIM').actualBoundingBoxAscent;
    const y2 = yLinha + 64 + 40 + a2;
    tintaDeChao(ctx, (k) => {
      k.font = oswaldLP(t2, 700);
      k.fillStyle = LP.tinta;
      k.textAlign = 'left';
      k.textBaseline = 'alphabetic';
      k.fillText('ATÉ O FIM', x2, y2);
    }, { x: x2, y: y2 - a2, w: larg2, h: a2 + 20 }, 1304);
    // a largada escalonada e os números das raias, em branco de pista, embaixo
    tintaDeChao(ctx, (k) => {
      k.fillStyle = '#fbfaf0';
      k.textAlign = 'center';
      k.textBaseline = 'alphabetic';
      for (let i = 1; i < 4; i++) {
        const x = RAIA.x0 + i * RAIA.w;
        const y = 1320 - i * 70;
        k.fillRect(x + 6, y, RAIA.w - 12, 12);
        k.font = oswaldLP(150, 700);
        k.fillText(String(i + 1), x + RAIA.w / 2, y + 190);
      }
    }, { x: RAIA.x0 + RAIA.w, y: 1000, w: L, h: 500 }, 1305);
  }

  // Firmes no propósito, constantes na oração e inabaláveis na fé: o fundo do mar, verde
  // quase preto, com a luz da superfície entrando em fachos fracos. A âncora, à mão em sálvia
  // e cheia, assentada no fundo de areia à direita, com o cabo subindo reto para a superfície;
  // a frase à esquerda em três degraus, cada palavra forte em pincel creme (FIRMES,
  // CONSTANTES, INABALÁVEIS) e o resto pequeno em Oswald sálvia. Fechamento: a inversão, NA FÉ
  // em tinta num bloco amarelo, a única cor quente. Sem referência.
  function fundoDoMar(ctx, r) {
    const g = ctx.createLinearGradient(0, 0, 0, A);
    g.addColorStop(0, '#1a2a25');
    g.addColorStop(0.45, '#0f1916');
    g.addColorStop(1, '#070a09');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
    // os fachos de luz da superfície, inclinados, bem fracos
    for (let i = 0; i < 6; i++) {
      const x = 120 + i * 190 + r() * 60;
      const w = 50 + r() * 110;
      const gr = ctx.createLinearGradient(0, 0, 0, 1500);
      gr.addColorStop(0, 'rgba(200,218,140,' + (0.05 + r() * 0.05).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(200,218,140,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w, 0);
      ctx.lineTo(x + w + 260, 1500);
      ctx.lineTo(x + 180, 1500);
      ctx.closePath();
      ctx.fill();
    }
    // partículas em suspensão
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = 'rgba(220,232,190,' + (0.05 + r() * 0.16).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(r() * L, r() * A, 0.8 + r() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // A âncora: o anel, a haste, o cepo atravessado e os dois braços em arco com as unhas,
  // cheia em sálvia com a borda à mão. (x, y) é o meio do anel; h, a altura toda; giro, a
  // inclinação. Devolve o ponto de cima do anel, onde o cabo amarra.
  function ancoraCheia(ctx, x, y, h, giro, r) {
    const k = h / 1000;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    ctx.scale(k, k);
    // cada peça num caminho próprio (cheias uma a uma: peças sobrepostas em sentidos opostos
    // não abrem buraco)
    const anel = new Path2D();
    anel.arc(0, 0, 70, 0, Math.PI * 2);
    anel.moveTo(42, 0);
    anel.arc(0, 0, 42, 0, Math.PI * 2, true);
    const pecas = [];
    const peca = (f) => { const q = new Path2D(); f(q); pecas.push(q); };
    // a haste e o cepo atravessado no alto, com as pontas redondas
    peca((q) => q.rect(-26, 60, 52, 860));
    peca((q) => q.rect(-250, 150, 500, 50));
    peca((q) => q.arc(-262, 175, 35, 0, Math.PI * 2));
    peca((q) => q.arc(262, 175, 35, 0, Math.PI * 2));
    // os braços: um arco grosso que sai do pé da haste
    peca((q) => {
      q.moveTo(-380, 640);
      q.quadraticCurveTo(-340, 960, 0, 1000);
      q.quadraticCurveTo(340, 960, 380, 640);
      q.lineTo(330, 660);
      q.quadraticCurveTo(300, 900, 0, 920);
      q.quadraticCurveTo(-300, 900, -330, 660);
      q.closePath();
    });
    // as unhas, em ponta de seta, na ponta de cada braço
    peca((q) => { q.moveTo(-400, 540); q.lineTo(-460, 730); q.lineTo(-300, 700); q.closePath(); });
    peca((q) => { q.moveTo(400, 540); q.lineTo(460, 730); q.lineTo(300, 700); q.closePath(); });
    const { c, ctx: q } = camada();
    q.setTransform(ctx.getTransform());
    // a borda: o contorno grosso em verde escuro por baixo de todas e o cheio por cima (só
    // sobra a borda de fora, sem as costuras das peças)
    q.strokeStyle = '#26352c';
    q.lineJoin = 'round';
    q.lineWidth = 16;
    q.stroke(anel);
    for (const pc of pecas) q.stroke(pc);
    q.fillStyle = LP.salvia;
    q.fill(anel, 'evenodd');
    for (const pc of pecas) q.fill(pc);
    q.setTransform(1, 0, 0, 1, 0, 0);
    gastar(c, { x: x - h * 0.5, y: y - 80, w: h, h: h * 1.1 }, { pontos: 1400, manchas: 26, riscos: 90, semente: 1311, forca: 0.8 });
    ctx.restore();
    ctx.drawImage(c, 0, 0);
    return [x + Math.sin(giro) * 70 * k, y - Math.cos(giro) * 70 * k];
  }
  // O cabo: duas pernas torcidas, de (x0, y0) até (x1, y1).
  function caboTorcido(ctx, x0, y0, x1, y1, r) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
    for (const fase of [0, Math.PI]) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = x0 + (x1 - x0) * t + Math.sin(t * n / 3.2 + fase) * 6;
        const y = y0 + (y1 - y0) * t;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = fase ? 'rgba(200,190,160,.85)' : 'rgba(242,239,220,.95)';
      ctx.lineWidth = 7;
      ctx.stroke();
    }
  }
  function arteAncora(ctx) {
    const r = sorteio(1310);
    fundoDoMar(ctx, r);
    // o fundo de areia, uma faixa ondulada embaixo com o pontilhado
    const yAreia = 1500;
    ctx.fillStyle = '#1c2420';
    ctx.beginPath();
    ctx.moveTo(0, yAreia + 40);
    for (let x = 0; x <= L; x += 40) ctx.lineTo(x, yAreia + Math.sin(x / 170) * 16 + (x > 600 ? -20 : 0));
    ctx.lineTo(L, A);
    ctx.lineTo(0, A);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = 'rgba(200,218,140,' + (0.08 + r() * 0.18).toFixed(3) + ')';
      ctx.fillRect(r() * L, yAreia + 20 + r() * (A - yAreia), 2, 2);
    }
    // a âncora, à direita, com a unha enterrada na areia, e o cabo subindo reto
    const ax = 790;
    const ay = 800;
    const h = 720;
    const topo = ancoraCheia(ctx, ax, ay, h, 0.09, r);
    caboTorcido(ctx, topo[0], topo[1] + 6, topo[0] - 28, -10, r);
    // a areia por cima da ponta enterrada
    ctx.fillStyle = '#1c2420';
    ctx.beginPath();
    ctx.ellipse(ax + 60, yAreia + 30, 240, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // a frase em três degraus, à esquerda
    const x = 80;
    const pm = (t) => '400 ' + t + 'px "Permanent Marker", cursive';
    const os = (t) => oswaldLP(t, 500);
    const larg = 620;
    const tGrande = Math.min(caber(ctx, 'INABALÁVEIS', pm, larg, 140), 140);
    let y = 600;
    const degrau = (forte, fraco, recuo) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.55)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = LP.creme;
      y += tGrande * 0.92;
      aMao(ctx, forte, x + recuo, y, tGrande, r);
      ctx.restore();
      if (fraco) {
        y += 70;
        S.escrever(ctx, fraco, x + recuo + 6, y, os(52), LP.salvia, { alinhar: 'left', espaco: 3 });
      }
      y += 40;
    };
    degrau('FIRMES', 'NO PROPÓSITO,', 0);
    degrau('CONSTANTES', 'NA ORAÇÃO E', 0);
    degrau('INABALÁVEIS', '', 0);
    // NA FÉ: tinta num bloco amarelo, como uma etiqueta presa no cabo
    const tF = 92;
    ctx.font = oswaldLP(tF, 700);
    const wF = ctx.measureText('NA FÉ').width + 6 * 4;
    const yF = y + 16;
    ctx.save();
    ctx.translate(x + 4, yF);
    ctx.rotate(-0.02);
    const p = bordaRasgada([[[0, 0], [wF + 60, 0], 3], [[wF + 60, 0], [wF + 60, tF * 1.2], 5], [[wF + 60, tF * 1.2], [0, tF * 1.2], 3], [[0, tF * 1.2], [0, 0], 5]], r, 10);
    ctx.fillStyle = LP.amarelo;
    ctx.fill(p);
    S.escrever(ctx, 'NA FÉ', 30, tF * 1.2 * 0.5 + tF * 0.38, oswaldLP(tF, 700), LP.tinta, { alinhar: 'left', espaco: 6 });
    ctx.restore();
  }

  // Direcionados à santidade (2 Timóteo 2.22): o amarelo cheio como o latão de uma bússola.
  // DIRECIONADOS em Literata no alto e, embaixo, o mostrador gravado em tinta: os anéis, os
  // traços dos graus, a rosa dos ventos apagada e, no lugar do norte, uma cruz pequena; À
  // SANTIDADE corre pela borda de cima do mostrador, e a agulha aponta para ela, com dois
  // rastros fracos de quando ainda balançava. Fechamento: a própria agulha, sem ênfase na
  // letra. A referência vai gravada na parte de baixo do mostrador.
  function letrasNoArco(ctx, texto, cx, cy, raio, meio, fonte, cor, { espaco = 0, embaixo = false } = {}) {
    ctx.save();
    ctx.font = fonte;
    ctx.fillStyle = cor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const larg = [...texto].map((l) => ctx.measureText(l).width + espaco);
    const total = larg.reduce((a, b) => a + b, 0) - espaco;
    let a = meio + (embaixo ? 1 : -1) * total / 2 / raio;
    [...texto].forEach((l, i) => {
      const da = (larg[i] / 2) / raio * (embaixo ? -1 : 1);
      a += da;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * raio, cy + Math.sin(a) * raio);
      ctx.rotate(a + (embaixo ? -Math.PI / 2 : Math.PI / 2));
      ctx.fillText(l, 0, 0);
      ctx.restore();
      a += da;
    });
    ctx.restore();
  }
  function agulhaDaBussola(ctx, cx, cy, comp, giro, alfa) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(giro);
    ctx.globalAlpha = alfa;
    const lw = comp * 0.11;
    // a metade do norte, cheia; a do sul, só o contorno
    ctx.fillStyle = LP.tinta;
    ctx.beginPath();
    ctx.moveTo(0, -comp);
    ctx.lineTo(lw, 0);
    ctx.lineTo(-lw, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = LP.tinta;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lw, 0);
    ctx.lineTo(0, comp * 0.8);
    ctx.lineTo(-lw, 0);
    ctx.stroke();
    ctx.restore();
  }
  function arteBussola(ctx) {
    const r = sorteio(1320);
    ctx.fillStyle = LP.amarelo;
    ctx.fillRect(0, 0, L, A);
    const brilho = ctx.createRadialGradient(L * 0.35, 900, 0, L * 0.35, 900, 1100);
    brilho.addColorStop(0, 'rgba(255,236,170,.45)');
    brilho.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(0, 0, L, A);
    const tinta = LP.tinta;
    // DIRECIONADOS no alto
    const lit = (t) => Lit(600, t);
    const t1 = caber(ctx, 'DIRECIONADOS', lit, 920, 140, 0.02);
    S.escrever(ctx, 'DIRECIONADOS', L / 2, 640, lit(t1), tinta, { espaco: t1 * 0.02 });
    // o mostrador
    const cx = L / 2;
    const cy = 1150;
    const R = 350;
    const { c, ctx: k } = camada();
    k.strokeStyle = tinta;
    k.lineWidth = 6;
    k.beginPath(); k.arc(cx, cy, R, 0, Math.PI * 2); k.stroke();
    k.lineWidth = 2.5;
    k.beginPath(); k.arc(cx, cy, R - 16, 0, Math.PI * 2); k.stroke();
    k.beginPath(); k.arc(cx, cy, R - 74, 0, Math.PI * 2); k.stroke();
    // os traços dos graus: de 2 em 2, maiores de 10 em 10
    for (let g = 0; g < 360; g += 2) {
      const a = g * Math.PI / 180 - Math.PI / 2;
      const ext = R - 16;
      const comp = g % 30 === 0 ? 40 : g % 10 === 0 ? 28 : 14;
      k.lineWidth = g % 10 === 0 ? 3 : 1.6;
      k.beginPath();
      k.moveTo(cx + Math.cos(a) * ext, cy + Math.sin(a) * ext);
      k.lineTo(cx + Math.cos(a) * (ext - comp), cy + Math.sin(a) * (ext - comp));
      k.stroke();
    }
    // a rosa dos ventos, só o contorno e apagada
    k.globalAlpha = 0.35;
    k.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2;
      const comp = i % 2 ? R * 0.42 : R * 0.7;
      const lado = R * 0.09;
      k.beginPath();
      k.moveTo(cx + Math.cos(a) * comp, cy + Math.sin(a) * comp);
      k.lineTo(cx + Math.cos(a + Math.PI / 2) * lado, cy + Math.sin(a + Math.PI / 2) * lado);
      k.lineTo(cx + Math.cos(a - Math.PI / 2) * lado, cy + Math.sin(a - Math.PI / 2) * lado);
      k.closePath();
      k.stroke();
    }
    k.globalAlpha = 1;
    // os pontos cardeais: L, S e O em Oswald; no norte, uma cruz pequena
    for (const [letra, a] of [['L', 0], ['O', Math.PI]]) {
      S.escrever(k, letra, cx + Math.cos(a) * (R - 104), cy + Math.sin(a) * (R - 104) + 16, oswaldLP(44, 700), tinta);
    }
    k.fillStyle = tinta;
    const yc = cy - (R - 112);
    k.fillRect(cx - 4, yc - 28, 8, 56);
    k.fillRect(cx - 18, yc - 14, 36, 8);
    gastar(c, { x: cx - R - 20, y: cy - R - 20, w: 2 * R + 40, h: 2 * R + 40 }, { pontos: 700, manchas: 10, riscos: 40, semente: 1321, forca: 0.6 });
    ctx.drawImage(c, 0, 0);
    // À SANTIDADE pela borda de cima, por fora; a referência gravada embaixo, por dentro
    letrasNoArco(ctx, 'À SANTIDADE', cx, cy, R + 34, -Math.PI / 2, Lit(600, 86), tinta, { espaco: 6 });
    letrasNoArco(ctx, '2 TIMÓTEO 2.22', cx, cy, R - 118, Math.PI / 2, oswaldLP(34, 700), tinta, { espaco: 6, embaixo: true });
    // os rastros da agulha balançando, e a agulha parada no norte
    agulhaDaBussola(ctx, cx, cy, R * 0.58, -0.32, 0.1);
    agulhaDaBussola(ctx, cx, cy, R * 0.58, 0.16, 0.18);
    agulhaDaBussola(ctx, cx, cy, R * 0.58, 0, 1);
    ctx.fillStyle = LP.amarelo;
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = tinta;
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  // Atraídos pela Sua presença: limalha de ferro no papel claro, como na aula de física. Os
  // fiapos de ferro cobrem o story inteiro, soltos e claros nas bordas, enfileirados e mais
  // escuros perto do meio, e todos apontam para a frase, que fica no centro de um vazio com
  // uma luz amarela bem fraca: a presença não aparece, só o que ela atrai. A letra em Manrope
  // extra-negrito, sem ênfase: o desenho inteiro é a ênfase. Sem referência.
  function limalha(ctx, cx, cy, rx, ry, r) {
    const { c, ctx: k } = camada();
    k.lineCap = 'round';
    // a distância "elíptica" ao meio: 1 na borda do vazio
    const dist = (x, y) => Math.hypot((x - cx) / rx, (y - cy) / ry);
    const fiapo = (x, y, comp, alfa) => {
      // aponta para o meio, com um leve redemoinho
      const a = Math.atan2(cy - y, cx - x) + 0.22;
      k.strokeStyle = 'rgba(28,29,26,' + alfa.toFixed(3) + ')';
      k.lineWidth = 1.6 + r() * 1.6;
      k.beginPath();
      k.moveTo(x - Math.cos(a) * comp / 2, y - Math.sin(a) * comp / 2);
      k.lineTo(x + Math.cos(a) * comp / 2, y + Math.sin(a) * comp / 2);
      k.stroke();
    };
    // as fileiras: linhas de campo que espiralam para o vazio, com os fiapos enfileirados
    for (let i = 0; i < 150; i++) {
      let a = i / 150 * Math.PI * 2 + r() * 0.03;
      let d = 1.04 + r() * 0.06;
      while (d < 4.2) {
        const x = cx + Math.cos(a) * rx * d;
        const y = cy + Math.sin(a) * ry * d;
        const perto = Math.max(0, 1 - (d - 1) / 3);
        if (r() < 0.55 + perto * 0.4) fiapo(x + (r() - 0.5) * 6, y + (r() - 0.5) * 6, 8 + perto * 22 + r() * 8, 0.12 + perto * 0.7);
        d += 0.025 + (d - 1) * 0.03 + r() * 0.03;
        a -= 0.012; // o redemoinho
      }
    }
    // os soltos, espalhados pelo papel todo
    for (let i = 0; i < 2600; i++) {
      const x = r() * L;
      const y = r() * A;
      const d = dist(x, y);
      if (d < 1.05) continue;
      const perto = Math.max(0, 1 - (d - 1) / 3.5);
      fiapo(x, y, 6 + perto * 14 + r() * 6, 0.1 + perto * 0.4);
    }
    // a limalha some atrás da chama, dos dias e da marca, para eles se lerem limpos
    k.globalCompositeOperation = 'destination-out';
    for (const [x, y, w, h] of [[230, 375, 300, 150], [250, PE, 300, 110]]) {
      k.save();
      k.translate(x, y);
      k.scale(1, h / w);
      const g = k.createRadialGradient(0, 0, 0, 0, 0, w);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.65, 'rgba(0,0,0,.95)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      k.fillStyle = g;
      k.fillRect(-w, -w, 2 * w, 2 * w);
      k.restore();
    }
    ctx.drawImage(c, 0, 0);
  }
  function arteIma(ctx) {
    const r = sorteio(1330);
    fundoPapel(ctx, '#ecebe4', 1330);
    const cx = L / 2;
    const cy = 1040;
    // a luz no meio, quase nada de amarelo
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 520);
    g.addColorStop(0, 'rgba(255,196,77,.58)');
    g.addColorStop(0.5, 'rgba(255,196,77,.2)');
    g.addColorStop(1, 'rgba(255,196,77,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
    limalha(ctx, cx, cy, 470, 190, r);
    // a frase no meio do vazio
    const mn = (t) => S.Mn(800, t);
    const t2 = caber(ctx, 'SUA PRESENÇA', mn, 860, 130, -0.02);
    S.escrever(ctx, 'ATRAÍDOS PELA', cx, cy - t2 * 0.55, S.Mn(700, 50), LP.tinta, { espaco: 12 });
    S.escrever(ctx, 'SUA PRESENÇA', cx, cy + t2 * 0.62, mn(t2), LP.tinta, { espaco: -t2 * 0.02 });
  }

  // ---------- sétima leva (rodada 14) ----------
  // Quatro frases da ofensiva que ainda não tinham arte, cada uma num fundo (a sálvia, o papel
  // de envelope, o amarelo e o preto), com composição, letra e fecho próprios. Nenhuma fecha
  // com a palavra amarela sublinhada; nada de figura humana, prédio, coroa ou foto.

  // Conhecer a Deus e fazê-Lo conhecido: a gota que cai na água e as ondas que saem dela. A
  // superfície em sálvia vista de lado (os anéis achatados), a gota amarela caindo no meio e
  // os anéis abrindo, fortes perto do ponto e cada vez mais largos e fracos, até sair pelas
  // bordas: receber e passar adiante. CONHECER A DEUS em Literata no alto, a gota, e embaixo
  // E FAZÊ-LO pequeno e CONHECIDO na largura toda. Fechamento: o eco, dois contornos de
  // CONHECIDO abrindo como os anéis. Sem referência.
  function ondasNaAgua(ctx, cx, cy, achata, r) {
    const { c, ctx: k } = camada();
    k.lineCap = 'round';
    k.lineJoin = 'round';
    let rx = 40;
    let n = 0;
    while (rx < 1500) {
      const t = Math.min(1, (rx - 40) / 1000);
      const alfa = 0.88 * (1 - t) ** 1.3 + 0.16;
      const lw = 8 * (1 - t) + 2.2;
      const f1 = r() * 6.3;
      const f2 = r() * 6.3;
      const anel = (dy, cor, largura) => {
        k.strokeStyle = cor;
        k.lineWidth = largura;
        k.beginPath();
        for (let i = 0; i <= 200; i++) {
          const a = i / 200 * Math.PI * 2;
          const rr = 1 + Math.sin(a * 5 + f1) * 0.01 + Math.sin(a * 11 + f2) * 0.006;
          const x = cx + Math.cos(a) * rx * rr;
          const y = cy + dy + Math.sin(a) * rx * achata * rr;
          if (i) k.lineTo(x, y); else k.moveTo(x, y);
        }
        k.stroke();
      };
      // a crista clara um pouco acima, o vale escuro embaixo (a luz vem de cima)
      anel(-lw * 1.3, 'rgba(250,253,235,' + (alfa * 0.75).toFixed(3) + ')', lw * 0.8);
      anel(0, 'rgba(30,38,18,' + alfa.toFixed(3) + ')', lw);
      n++;
      rx += 30 + n * 11;
    }
    // os anéis somem atrás da marca, para ela se ler limpa
    k.globalCompositeOperation = 'destination-out';
    k.save();
    k.translate(L / 2, PE);
    k.scale(1, 0.4);
    const g = k.createRadialGradient(0, 0, 0, 0, 0, 300);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.6, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    k.fillStyle = g;
    k.fillRect(-300, -300, 600, 600);
    k.restore();
    ctx.drawImage(c, 0, 0);
  }
  // A gota: a lágrima de ponta para cima, amarela com o contorno em tinta e o brilho claro.
  function gotaAmarela(ctx, x, y, h) {
    const w = h * 0.62;
    const p = new Path2D();
    p.moveTo(x, y - h / 2);
    p.bezierCurveTo(x + w * 0.2, y - h * 0.2, x + w / 2, y + h * 0.02, x + w / 2, y + h * 0.18);
    p.arc(x, y + h * 0.18, w / 2, 0, Math.PI, false);
    p.bezierCurveTo(x - w / 2, y + h * 0.02, x - w * 0.2, y - h * 0.2, x, y - h / 2);
    ctx.save();
    ctx.fillStyle = LP.amarelo;
    ctx.fill(p);
    ctx.strokeStyle = LP.tinta;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.stroke(p);
    ctx.strokeStyle = 'rgba(255,250,225,.9)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y + h * 0.18, w * 0.3, Math.PI * 0.95, Math.PI * 1.35);
    ctx.stroke();
    ctx.restore();
  }
  function arteConhecer(ctx) {
    const r = sorteio(1400);
    ctx.fillStyle = LP.salvia;
    ctx.fillRect(0, 0, L, A);
    const luz = ctx.createRadialGradient(L / 2, 1000, 0, L / 2, 1000, 900);
    luz.addColorStop(0, 'rgba(244,250,220,.45)');
    luz.addColorStop(1, 'rgba(244,250,220,0)');
    ctx.fillStyle = luz;
    ctx.fillRect(0, 0, L, A);
    const tinta = LP.tinta;
    const cx = L / 2;
    const cy = 1010;
    ondasNaAgua(ctx, cx, cy, 0.3, r);
    // o respingo no meio: a coroinha de água e a gota caindo
    ctx.fillStyle = LP.amarelo;
    ctx.strokeStyle = tinta;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    gotaAmarela(ctx, cx, cy - 170, 120);
    // CONHECER A DEUS no alto
    const lit = (t) => Lit(600, t);
    const t1 = caber(ctx, 'CONHECER A DEUS', lit, 920, 104, 0.01);
    S.escrever(ctx, 'CONHECER A DEUS', cx, 680, lit(t1), tinta, { espaco: t1 * 0.01 });
    // E FAZÊ-LO e CONHECIDO embaixo, com o eco
    S.escrever(ctx, 'E FAZÊ-LO', cx, 1318, oswaldLP(54, 500), tinta, { espaco: 16 });
    const os = (t) => oswaldLP(t, 700);
    const t3 = caber(ctx, 'CONHECIDO', os, 900, 220, 0.02);
    const y3 = 1500;
    ctx.font = os(t3);
    S.escrever(ctx, 'CONHECIDO', cx, y3, os(t3), tinta, { espaco: t3 * 0.02 });
  }

  // Como pregarão, se não forem enviados? (Romanos 10.15): o story é um envelope de correio
  // aéreo. O papel claro com a borda listrada de sálvia e tinta, o selo no canto (os montes,
  // o caminho que sobe e o sol, por "como são belos os pés dos que anunciam boas novas", e o
  // valor 10.15), o carimbo redondo do correio com a referência e as ondas de cancelamento, e
  // a pergunta escrita à mão no lugar do endereço. Fechamento: ENVIADOS? batido com carimbo
  // de borracha, torto e falhado.
  function bordaAerea(ctx, larg) {
    ctx.save();
    const p = new Path2D();
    p.rect(0, 0, L, A);
    p.rect(larg, larg, L - 2 * larg, A - 2 * larg);
    ctx.clip(p, 'evenodd');
    const faixa = 46;
    const vao = 26;
    let i = 0;
    for (let s = -A; s < L + A; s += faixa + vao) {
      ctx.fillStyle = i++ % 2 ? LP.tinta : LP.salviaEscura;
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(s + faixa, 0);
      ctx.lineTo(s + faixa - A * 0.7, A);
      ctx.lineTo(s - A * 0.7, A);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  function seloPostal(ctx, x, y, w, h, giro, r) {
    const { c, ctx: k } = camada();
    k.translate(x, y);
    k.rotate(giro);
    // o papel do selo com o picote (meias-luas tiradas da borda)
    k.fillStyle = '#fbf9f1';
    k.fillRect(-w / 2, -h / 2, w, h);
    k.globalCompositeOperation = 'destination-out';
    const furo = 9;
    const passo = 26;
    for (let px = -w / 2; px <= w / 2 + 1; px += passo) {
      k.beginPath(); k.arc(px, -h / 2, furo, 0, Math.PI * 2); k.fill();
      k.beginPath(); k.arc(px, h / 2, furo, 0, Math.PI * 2); k.fill();
    }
    for (let py = -h / 2; py <= h / 2 + 1; py += passo) {
      k.beginPath(); k.arc(-w / 2, py, furo, 0, Math.PI * 2); k.fill();
      k.beginPath(); k.arc(w / 2, py, furo, 0, Math.PI * 2); k.fill();
    }
    k.globalCompositeOperation = 'source-over';
    // a gravura: sálvia, o sol, os montes e o caminho pontilhado que sobe
    const m = 22;
    const ix = -w / 2 + m;
    const iy = -h / 2 + m;
    const iw = w - 2 * m;
    const ih = h - 2 * m;
    k.save();
    k.beginPath();
    k.rect(ix, iy, iw, ih);
    k.clip();
    k.fillStyle = LP.salvia;
    k.fillRect(ix, iy, iw, ih);
    k.fillStyle = LP.amarelo;
    k.beginPath(); k.arc(ix + iw * 0.7, iy + ih * 0.42, iw * 0.15, 0, Math.PI * 2); k.fill();
    k.strokeStyle = LP.tinta;
    k.lineWidth = 3;
    k.stroke();
    const monte = (pts, cor) => {
      k.beginPath();
      k.moveTo(ix, iy + ih);
      for (const [a, b] of pts) k.lineTo(ix + iw * a, iy + ih * b);
      k.lineTo(ix + iw, iy + ih);
      k.closePath();
      k.fillStyle = cor;
      k.fill();
      k.lineWidth = 3.5;
      k.lineJoin = 'round';
      k.stroke();
    };
    monte([[0, 0.66], [0.3, 0.4], [0.5, 0.58], [0.78, 0.5], [1, 0.62]], LP.salviaEscura);
    monte([[0, 0.86], [0.42, 0.66], [0.62, 0.78], [1, 0.72]], '#7f9150');
    // o caminho, do pé ao alto do monte
    k.setLineDash([2, 12]);
    k.lineCap = 'round';
    k.lineWidth = 6;
    k.strokeStyle = '#fbf9f1';
    k.beginPath();
    k.moveTo(ix + iw * 0.18, iy + ih);
    k.bezierCurveTo(ix + iw * 0.5, iy + ih * 0.9, ix + iw * 0.1, iy + ih * 0.7, ix + iw * 0.3, iy + ih * 0.44);
    k.stroke();
    k.setLineDash([]);
    k.restore();
    k.strokeStyle = LP.tinta;
    k.lineWidth = 3;
    k.strokeRect(ix, iy, iw, ih);
    // o valor
    S.escrever(k, '10.15', ix + 12, iy + 58, oswaldLP(52, 700), LP.tinta, { alinhar: 'left' });
    k.setTransform(1, 0, 0, 1, 0, 0);
    gastar(c, { x: x - w, y: y - h, w: 2 * w, h: 2 * h }, { pontos: 400, manchas: 6, riscos: 20, semente: 1411, forca: 0.5 });
    ctx.save();
    ctx.shadowColor = 'rgba(40,35,20,.28)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }
  // O carimbo redondo do correio: dois anéis, a referência pela borda, a cruz no meio e as
  // ondas de cancelamento saindo para a esquerda. Em tinta falhada, por cima do selo.
  function carimboPostal(ctx, cx, cy, R, ondasAte, r) {
    const { c, ctx: k } = camada();
    const cor = 'rgba(18,19,15,.82)';
    k.strokeStyle = cor;
    k.lineWidth = 5;
    k.beginPath(); k.arc(cx, cy, R, 0, Math.PI * 2); k.stroke();
    k.lineWidth = 3;
    k.beginPath(); k.arc(cx, cy, R * 0.6, 0, Math.PI * 2); k.stroke();
    letrasNoArco(k, 'ROMANOS', cx, cy, R * 0.8 - 2, -Math.PI / 2, oswaldLP(30, 700), cor, { espaco: 5 });
    letrasNoArco(k, '10.15', cx, cy, R * 0.8 + 10, Math.PI / 2, oswaldLP(30, 700), cor, { espaco: 6, embaixo: true });
    k.fillStyle = cor;
    k.fillRect(cx - 4, cy - 26, 8, 52);
    k.fillRect(cx - 17, cy - 12, 34, 8);
    // as ondas
    k.lineWidth = 5;
    k.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const y = cy - R * 0.62 + i * R * 0.31;
      k.beginPath();
      for (let x = cx - R - 14; x >= ondasAte; x -= 6) {
        const yy = y + Math.sin((x - cx) / 22) * 10;
        if (x > cx - R - 14 - 1) k.moveTo(x, yy); else k.lineTo(x, yy);
      }
      k.stroke();
    }
    gastar(c, { x: ondasAte - 10, y: cy - R - 10, w: cx + R - ondasAte + 20, h: 2 * R + 20 }, { pontos: 1400, manchas: 24, riscos: 60, semente: 1412, forca: 0.9 });
    ctx.drawImage(c, 0, 0);
  }
  // O carimbo de borracha: a palavra em Oswald dentro de dois quadros, torta, com a tinta
  // falhando (mais nas bordas, como a borracha que não assentou por igual).
  function carimboDeBorracha(ctx, texto, cx, cy, tam, giro, cor, r) {
    const { c, ctx: k } = camada();
    k.translate(cx, cy);
    k.rotate(giro);
    k.font = oswaldLP(tam, 700);
    try { k.letterSpacing = tam * 0.04 + 'px'; } catch (e) { /* sem letterSpacing */ }
    const w = k.measureText(texto).width;
    const cap = k.measureText(texto).actualBoundingBoxAscent;
    const pad = tam * 0.22;
    const bw = w + pad * 2;
    const bh = cap + pad * 2;
    k.strokeStyle = cor;
    k.lineWidth = 12;
    k.strokeRect(-bw / 2, -bh / 2, bw, bh);
    k.lineWidth = 4;
    k.strokeRect(-bw / 2 + 20, -bh / 2 + 20, bw - 40, bh - 40);
    k.fillStyle = cor;
    k.textAlign = 'center';
    k.textBaseline = 'alphabetic';
    k.fillText(texto, tam * 0.02, cap / 2);
    try { k.letterSpacing = '0px'; } catch (e) { /* idem */ }
    k.setTransform(1, 0, 0, 1, 0, 0);
    const caixa = { x: cx - bw / 2 - 30, y: cy - bh / 2 - 60, w: bw + 60, h: bh + 120 };
    gastar(c, caixa, { pontos: 2600, manchas: 40, riscos: 140, semente: 1413, forca: 0.95 });
    // a borracha que não assentou: a ponta direita mais fraca
    k.globalCompositeOperation = 'destination-out';
    const g = k.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
    g.addColorStop(0, 'rgba(0,0,0,.05)');
    g.addColorStop(0.7, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.28)');
    k.fillStyle = g;
    k.fillRect(caixa.x, caixa.y, caixa.w, caixa.h);
    ctx.drawImage(c, 0, 0);
  }
  function artePregarao(ctx) {
    const r = sorteio(1410);
    fundoPapel(ctx, '#f1ece0', 1410);
    bordaAerea(ctx, 34);
    // o selo e o carimbo no canto de cima
    seloPostal(ctx, 870, 440, 210, 250, 0.05, r);
    carimboPostal(ctx, 700, 590, 96, 430, r);
    // a pergunta à mão, no lugar do endereço, com as linhas do endereço
    const x = 112;
    const tam = 112;
    const linhas = ['Como pregarão', 'se não forem'];
    ctx.font = '400 ' + tam + 'px "Permanent Marker", cursive';
    const tamOk = Math.min(tam, 840 / ctx.measureText('Como pregarão').width * tam);
    let y = 930;
    for (const linha of linhas) {
      ctx.fillStyle = LP.tinta;
      aMao(ctx, linha, x, y, tamOk, r);
      tracoAMao(ctx, [[x - 10, y + 30], [L / 2, y + 32], [L - 110, y + 29]], { r, largura: 2.5, tremor: 1, segunda: false, cor: 'rgba(18,19,15,.32)' });
      y += tamOk * 1.42;
    }
    carimboDeBorracha(ctx, 'ENVIADOS?', L / 2 + 10, 1330, 150, -0.08, '#3d4a20', r);
  }

  // Geração inconformada: a forma que não segura. O amarelo cheio com a grade de tinta, os
  // quadros todos iguais, de borda a borda; GERAÇÃO em Oswald, uma letra em cada quadro,
  // certinha. INCONFORMADA vem à mão e enorme, cada letra maior e mais torta que a anterior,
  // e onde ela passa a grade arrebenta: as linhas somem em volta de cada letra e um quadro
  // solto cai torto. Fechamento: a grade quebrada. Sem referência.
  const QUADRO = 120;
  function gradeDoMolde(ctx, buracos, r) {
    const { c, ctx: k } = camada();
    k.strokeStyle = LP.tinta;
    k.lineWidth = 3;
    for (let x = 0; x <= L; x += QUADRO) { k.beginPath(); k.moveTo(x, 0); k.lineTo(x, A); k.stroke(); }
    for (let y = 0; y <= A; y += QUADRO) { k.beginPath(); k.moveTo(0, y); k.lineTo(L, y); k.stroke(); }
    k.globalCompositeOperation = 'destination-out';
    // a grade some atrás da chama, dos dias e da marca
    for (const [x, y, w, h] of [[L - 300, 390, 360, 170], [L / 2, PE, 340, 110]]) {
      k.save();
      k.translate(x, y);
      k.scale(1, h / w);
      const g = k.createRadialGradient(0, 0, 0, 0, 0, w);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.6, 'rgba(0,0,0,.92)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      k.fillStyle = g;
      k.fillRect(-w, -w, 2 * w, 2 * w);
      k.restore();
    }
    // e arrebenta onde as letras passaram
    k.fillStyle = '#000';
    for (const b of buracos) k.fill(b);
    k.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.62;
    ctx.drawImage(c, 0, 0);
    ctx.globalAlpha = 1;
  }
  function arteInconformada(ctx) {
    const r = sorteio(1420);
    ctx.fillStyle = LP.amarelo;
    ctx.fillRect(0, 0, L, A);
    const tinta = LP.tinta;
    const pm = (t) => '400 ' + t + 'px "Permanent Marker", cursive';
    // as letras de INCONFORMADA: cada uma maior e mais torta que a anterior
    const letras = [];
    const linha = (texto, y, largura, cresce0, cresce1, i0) => {
      const base = caber(ctx, texto, pm, largura, 400);
      const n = texto.length;
      const tams = [...texto].map((_, i) => base * (cresce0 + (cresce1 - cresce0) * i / (n - 1)));
      const largs = [...texto].map((l, i) => { ctx.font = pm(tams[i]); return ctx.measureText(l).width * 0.94; });
      const total = largs.reduce((a, b) => a + b, 0);
      let x = L / 2 - total / 2;
      [...texto].forEach((l, i) => {
        const solto = (i0 + i) / 11;
        letras.push({ l, x: x + largs[i] / 2, y: y + (r() - 0.5) * 50 * solto, tam: tams[i], giro: (i % 2 ? -1 : 1) * (0.03 + solto * 0.2) * (0.75 + r() * 0.25) });
        x += largs[i];
      });
    };
    linha('INCON', 1040, 660, 0.8, 1.12, 0);
    linha('FORMADA', 1340, 930, 0.85, 1.3, 5);
    // os buracos na grade: a caixa de cada letra, girada, com folga e a borda irregular
    const buracos = letras.map((t) => {
      ctx.font = pm(t.tam);
      const m = ctx.measureText(t.l);
      const w = m.width * 0.5 + 18;
      const cima = m.actualBoundingBoxAscent + 16;
      const baixo = m.actualBoundingBoxDescent + 16;
      const p = new Path2D();
      const pts = [[-w, -cima], [w, -cima], [w, baixo], [-w, baixo]].map(([a, b]) => [a + (r() - 0.5) * 18, b + (r() - 0.5) * 18]);
      pts.forEach(([a, b], i) => {
        const px = t.x + a * Math.cos(t.giro) - b * Math.sin(t.giro);
        const py = t.y + a * Math.sin(t.giro) + b * Math.cos(t.giro);
        if (i) p.lineTo(px, py); else p.moveTo(px, py);
      });
      p.closePath();
      return p;
    });
    gradeDoMolde(ctx, buracos, r);
    // o quadro que saiu da grade e caiu torto, no canto de baixo
    ctx.save();
    ctx.translate(905, 1488);
    ctx.rotate(0.38);
    ctx.strokeStyle = 'rgba(18,19,15,.62)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-QUADRO / 2, -QUADRO / 2, QUADRO, QUADRO);
    ctx.restore();
    // GERAÇÃO certinha, uma letra por quadro (colunas 1 a 7, a fileira de 600 a 720)
    const yF = 600;
    ctx.font = oswaldLP(88, 700);
    [...'GERAÇÃO'].forEach((l, i) => {
      ctx.font = oswaldLP(88, 700);
      const m = ctx.measureText('G');
      S.escrever(ctx, l, QUADRO * (i + 1) + QUADRO / 2, yF + QUADRO / 2 + m.actualBoundingBoxAscent / 2, oswaldLP(88, 700), tinta);
    });
    // INCONFORMADA à mão, por cima
    for (const t of letras) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.giro);
      S.escrever(ctx, t.l, 0, 0, pm(t.tam), tinta);
      ctx.restore();
    }
  }

  // É tudo sobre Ele: a correção à mão. No preto da landing, É TUDO / SOBRE / MIM em Oswald
  // creme enorme, encostado à esquerda; o MIM, apagado, é riscado com força em sálvia e, ao
  // lado, ELE vem escrito à mão em amarelo, a única cor quente, como quem corrige o
  // texto. A frase que fica é É TUDO SOBRE ELE. Fechamento: a rasura.
  function rasura(ctx, x0, y0, x1, y1, r) {
    const pts = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([x0 + (x1 - x0) * t + (r() - 0.5) * 20, (i % 2 ? y1 : y0) + (r() - 0.5) * 24]);
    }
    tracoAMao(ctx, pts, { r, largura: 22, tremor: 6, cor: LP.salvia, segunda: true });
    tracoAMao(ctx, [[x0 - 20, (y0 + y1) / 2 + 10], [(x0 + x1) / 2, (y0 + y1) / 2 - 14], [x1 + 24, (y0 + y1) / 2 + 4]], { r, largura: 26, tremor: 6, cor: LP.salvia, segunda: false });
  }
  function arteTudo(ctx) {
    const r = sorteio(1430);
    fundoLanding(ctx);
    const x = 86;
    const os = (t) => oswaldLP(t, 700);
    const pm = (t) => '400 ' + t + 'px "Permanent Marker", cursive';
    // MIM riscado e ELE ao lado têm de caber na mesma linha
    const wLinha3 = (larguraDe(ctx, 'MIM', os(100)) + 0.95 * larguraDe(ctx, 'ELE', pm(100))) / 100;
    const tam = Math.min(caber(ctx, 'É TUDO', os, 900, 330), caber(ctx, 'SOBRE', os, 900, 330), (L - x - 70 - 40) / wLinha3);
    ctx.font = os(tam);
    const cap = ctx.measureText('É TUDO').actualBoundingBoxAscent;
    const capS = ctx.measureText('SOBRE').actualBoundingBoxAscent;
    const vao = tam * 0.1;
    const y1 = (Z0 + Z1) / 2 - (cap + 2 * (vao + capS)) / 2 + cap;
    const y2 = y1 + vao + capS;
    const y3 = y2 + vao + capS;
    S.escrever(ctx, 'É TUDO', x, y1, os(tam), LP.creme, { alinhar: 'left' });
    S.escrever(ctx, 'SOBRE', x, y2, os(tam), LP.creme, { alinhar: 'left' });
    // o MIM apagado e riscado
    const wM = larguraDe(ctx, 'MIM', os(tam));
    ctx.save();
    ctx.globalAlpha = 0.5;
    S.escrever(ctx, 'MIM', x, y3, os(tam), LP.creme, { alinhar: 'left' });
    ctx.restore();
    rasura(ctx, x - 6, y3 - capS * 0.9, x + wM + 6, y3 - capS * 0.1, r);
    // ELE à mão, ao lado, um pouco acima, e a setinha de inserção embaixo
    const tE = tam * 0.95;
    ctx.fillStyle = LP.amarelo;
    const xE = x + wM + 50;
    const yE = y3 - capS * 0.12;
    ctx.save();
    ctx.translate(xE, yE);
    ctx.rotate(-0.07);
    aMao(ctx, 'ELE', 0, 0, tE, r);
    ctx.restore();
  }

  // ---------- oitava leva (rodada 15) ----------
  // As últimas quatro frases da ofensiva sem arte, cada uma num fundo (o preto com a aura, o
  // papel pontilhado, o amarelo e o céu da alvorada sobre o mar), com composição, letra e fecho
  // próprios. Nenhuma fecha com a palavra amarela sublinhada; nada de figura humana, prédio,
  // coroa ou foto, e nenhuma palavra que não esteja na frase.

  // Nele vivemos, nos movemos e existimos (Atos 17.28): a frase inteira mergulhada numa aura
  // só, a luz grande e macia de sálvia e amarelo que ocupa o story e envolve tudo, no preto da
  // landing.
  // NELE em Manrope extra-negrito enorme, o resto em Manrope, tudo centrado e em tinta.
  // Fechamento: nenhuma ênfase na letra; a aura que não deixa nada de fora é o fecho.
  function fundoAura(ctx) {
    ctx.fillStyle = LP.preto;
    ctx.fillRect(0, 0, L, A);
    const mancha = (x, y, rx, ry, rgb, a, borda) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
      g.addColorStop(borda, 'rgba(' + rgb + ',' + (a * 0.9).toFixed(3) + ')');
      g.addColorStop(0.88, 'rgba(' + rgb + ',' + (a * 0.3).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    };
    mancha(540, 1000, 800, 640, '200,218,140', 1, 0.62);
    mancha(310, 1250, 400, 340, '172,196,110', 0.6, 0.4);
    mancha(720, 840, 470, 420, '255,196,77', 0.85, 0.4);
    mancha(500, 1080, 420, 380, '246,244,222', 0.6, 0.3);
  }
  function arteNele(ctx) {
    fundoAura(ctx);
    const tinta = LP.tinta;
    const mn = (peso) => (t) => peso + ' ' + t + 'px Manrope, sans-serif';
    const tN = caber(ctx, 'Nele', mn(800), 640, 330);
    const tR = Math.min(caber(ctx, 'nos movemos', mn(600), 700, 104), caber(ctx, 'e existimos', mn(600), 700, 104));
    const yN = 960;
    S.escrever(ctx, 'Nele', L / 2, yN, mn(800)(tN), tinta, { espaco: -tN * 0.04 });
    const linhas = ['vivemos,', 'nos movemos', 'e existimos'];
    linhas.forEach((l, i) => S.escrever(ctx, l, L / 2, yN + 150 + i * tR * 1.18, mn(600)(tR), tinta));
    referencia(ctx, 'Atos 17.28', L / 2, yN + 150 + 2 * tR * 1.18 + 96, 34, 'rgba(18,19,15,.78)');
  }

  // Se alguém quiser vir após mim... (Lucas 9.23): a página de um caderno pontilhado, como o
  // planner de quem anota a rotina. O começo vem como título, em Literata itálica; os três
  // pedidos viram a lista do dia, cada um com o quadradinho marcado por uma cruzinha à mão
  // (não um visto), e "tome diariamente a sua cruz" ganha a fileira de sete quadrinhos da
  // semana, todos com a cruz: é todo dia. "e siga-me" sai à mão, maior, com a seta que segue
  // para fora da página. Fechamento: a seta à mão.
  // O quadradinho à mão: quatro riscos retos, cada canto passando um pouco do outro.
  function caixinhaAMao(ctx, x, y, lado, r, largura = 5) {
    const j = () => (r() - 0.5) * lado * 0.06;
    const c = [[x + j(), y + j()], [x + lado + j(), y + j()], [x + lado + j(), y + lado + j()], [x + j(), y + lado + j()]];
    ctx.save();
    ctx.strokeStyle = 'rgba(18,19,15,.7)';
    ctx.lineWidth = largura;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = c[i];
      const [bx, by] = c[(i + 1) % 4];
      const sx = (bx - ax) * 0.05;
      const sy = (by - ay) * 0.05;
      ctx.beginPath();
      ctx.moveTo(ax - sx * (i === 0 ? 0.4 : 0), ay - sy * (i === 0 ? 0.4 : 0));
      ctx.lineTo(bx + sx, by + sy);
      ctx.stroke();
    }
    ctx.restore();
  }
  function cruzinhaAMao(ctx, cx, cy, h, r, largura) {
    tracoAMao(ctx, [[cx + h * 0.06, cy - h * 0.5], [cx - h * 0.05, cy + h * 0.5]], { r, largura, tremor: h * 0.04, cor: LP.tinta, segunda: false });
    tracoAMao(ctx, [[cx - h * 0.32, cy - h * 0.2], [cx + h * 0.33, cy - h * 0.23]], { r, largura, tremor: h * 0.04, cor: LP.tinta, segunda: false });
  }
  function setaAMao(ctx, x0, y0, x1, y1, r, largura) {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * -10]);
    }
    tracoAMao(ctx, pts, { r, largura, tremor: 3, cor: LP.tinta, segunda: false });
    const a = Math.atan2(y1 - pts[7][1], x1 - pts[7][0]);
    const p = 34;
    tracoAMao(ctx, [[x1 - Math.cos(a - 0.5) * p, y1 - Math.sin(a - 0.5) * p], [x1, y1], [x1 - Math.cos(a + 0.5) * p, y1 - Math.sin(a + 0.5) * p]], { r, largura, tremor: 2, cor: LP.tinta, segunda: false });
  }
  function arteRotina(ctx) {
    const r = sorteio(1510);
    fundoPapel(ctx, '#f2eee3', 1510);
    // o pontilhado do caderno
    ctx.fillStyle = 'rgba(18,19,15,.2)';
    for (let y = 40; y < A; y += 56) for (let x = 36; x < L; x += 56) {
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    const tinta = LP.tinta;
    const x0 = 104;
    const lit = (t) => 'italic 500 ' + t + 'px Literata, Georgia, serif';
    const mn = (t) => '800 ' + t + 'px Manrope, sans-serif';
    referencia(ctx, 'Lucas 9.23', x0, 596, 32, '#5c5a52', 'left');
    const tT = Math.min(caber(ctx, 'Se alguém quiser', lit, 860, 92), caber(ctx, 'vir após mim,', lit, 860, 92));
    S.escrever(ctx, 'Se alguém quiser', x0, 700, lit(tT), tinta, { alinhar: 'left' });
    S.escrever(ctx, 'vir após mim,', x0, 700 + tT * 1.15, lit(tT), tinta, { alinhar: 'left' });
    // a lista do dia
    const xt = x0 + 104;
    const tI = Math.min(...['negue a si mesmo,', 'tome diariamente', 'a sua cruz'].map((l) => caber(ctx, l, mn, L - xt - 70, 82)));
    const capI = tI * 0.72;
    const lado = 62;
    const item = (y) => {
      const topo = y - capI / 2 - lado / 2;
      caixinhaAMao(ctx, x0, topo, lado, r, 3.5);
      cruzinhaAMao(ctx, x0 + lado / 2, topo + lado / 2 + 2, lado * 0.74, r, 7.5);
    };
    let y = 960;
    item(y);
    S.escrever(ctx, 'negue a si mesmo,', xt, y, mn(tI), tinta, { alinhar: 'left' });
    y += 156;
    item(y);
    S.escrever(ctx, 'tome diariamente', xt, y, mn(tI), tinta, { alinhar: 'left' });
    S.escrever(ctx, 'a sua cruz', xt, y + tI * 1.12, mn(tI), tinta, { alinhar: 'left' });
    // os sete dias da semana, todos com a cruz
    const q = 52;
    const vao = (L - xt - 80 - 7 * q) / 6;
    const yq = y + tI * 1.12 + 58;
    for (let i = 0; i < 7; i++) {
      const xq = xt + i * (q + vao);
      caixinhaAMao(ctx, xq, yq, q, r, 2.8);
      cruzinhaAMao(ctx, xq + q / 2, yq + q / 2 + 2, q * 0.74, r, 5.5);
    }
    // e siga-me: à mão, maior, com a seta para fora da página
    const yS = yq + q + 170;
    const tS = 132;
    ctx.fillStyle = tinta;
    aMao(ctx, 'e siga-me', x0 - 4, yS, tS, r);
    ctx.font = '400 ' + tS + 'px "Permanent Marker", cursive';
    const wS = ctx.measureText('e siga-me').width;
    setaAMao(ctx, x0 + wS + 34, yS - tS * 0.34, L - 34, yS - tS * 0.42, r, 7);
  }

  // O maior fracasso é ter sucesso em coisas que nos afastam de Deus: o gráfico de "sucesso"
  // à mão no amarelo cheio. A linha sai de junto de uma cruz pequena, no canto de baixo, e
  // sobe em degraus até a ponta da seta, no alto à direita: quanto mais sobe, mais longe da
  // cruz. EM COISAS QUE / NOS AFASTAM corre em cima da linha, inclinado com ela, e DE DEUS
  // fica lá embaixo, ao lado da cruz que ficou para trás. O MAIOR pequeno e FRACASSO gigante
  // no alto. Tudo em Oswald e tinta. Fechamento: a cruz deixada no começo do gráfico.
  function arteFracasso(ctx) {
    const r = sorteio(1520);
    ctx.fillStyle = LP.amarelo;
    ctx.fillRect(0, 0, L, A);
    const tinta = LP.tinta;
    const os = (peso) => (t) => oswaldLP(t, peso);
    const x0 = 92;
    S.escrever(ctx, 'O MAIOR', x0, 640, os(600)(74), tinta, { alinhar: 'left', espaco: 10 });
    const tF = caber(ctx, 'FRACASSO', os(700), L - 2 * x0, 300);
    ctx.font = os(700)(tF);
    const capF = ctx.measureText('FRACASSO').actualBoundingBoxAscent;
    const yF = 640 + 26 + capF;
    S.escrever(ctx, 'FRACASSO', x0 - 4, yF, os(700)(tF), tinta, { alinhar: 'left' });
    S.escrever(ctx, 'É TER SUCESSO', x0, yF + 104, os(600)(74), tinta, { alinhar: 'left', espaco: 10 });
    // os eixos à mão
    const ox = 120;
    const oy = 1500;
    tracoAMao(ctx, [[ox, 1060], [ox - 2, 1280], [ox, oy]], { r, largura: 5, tremor: 2, cor: tinta, segunda: false });
    tracoAMao(ctx, [[ox, oy], [560, oy + 2], [L - 70, oy - 1]], { r, largura: 5, tremor: 2, cor: tinta, segunda: false });
    for (let i = 1; i <= 4; i++) {
      const yy = oy - i * 100;
      tracoAMao(ctx, [[ox - 14, yy], [ox + 14, yy]], { r, largura: 4, tremor: 1, cor: tinta, segunda: false });
    }
    // a cruz pequena, no começo, e a linha que sobe para longe dela
    const cx = 196;
    const cy = 1440;
    cruzinhaAMao(ctx, cx, cy, 92, r, 9);
    const pts = [[240, 1440], [318, 1404], [384, 1418], [470, 1336], [540, 1350], [632, 1250], [700, 1266], [800, 1150], [868, 1166], [985, 1035]];
    const linha = pts.map(([x, y]) => [x, y]);
    ctx.save();
    ctx.strokeStyle = tinta;
    ctx.lineWidth = 11;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    linha.forEach(([x, y], i) => (i ? ctx.lineTo(x + (r() - 0.5) * 3, y + (r() - 0.5) * 3) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
    const [ax, ay] = pts[pts.length - 1];
    const ang = Math.atan2(ay - pts[pts.length - 2][1], ax - pts[pts.length - 2][0]);
    const ponta = 46;
    ctx.save();
    ctx.fillStyle = tinta;
    ctx.beginPath();
    ctx.moveTo(ax + Math.cos(ang) * ponta * 0.6, ay + Math.sin(ang) * ponta * 0.6);
    ctx.lineTo(ax + Math.cos(ang + 2.5) * ponta, ay + Math.sin(ang + 2.5) * ponta);
    ctx.lineTo(ax + Math.cos(ang - 2.5) * ponta, ay + Math.sin(ang - 2.5) * ponta);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // o texto em cima da linha, inclinado com ela
    const inc = Math.atan2(pts[pts.length - 1][1] - pts[0][1], pts[pts.length - 1][0] - pts[0][0]);
    const tL = 64;
    ctx.save();
    ctx.translate(560, 1210);
    ctx.rotate(inc);
    S.escrever(ctx, 'EM COISAS QUE', -10, -tL * 1.2, os(600)(tL), tinta, { espaco: 4 });
    S.escrever(ctx, 'NOS AFASTAM', -10, 0, os(600)(tL), tinta, { espaco: 4 });
    ctx.restore();
    // de Deus, embaixo, ao lado da cruz que ficou para trás
    S.escrever(ctx, 'DE DEUS', cx + 70, oy - 22, os(700)(46), tinta, { alinhar: 'left', espaco: 6 });
  }

  // Até que Ele venha: a alvorada sobre o mar, antes do sol. O céu vem do quase preto, no alto,
  // até a faixa clara no horizonte, e uma estrela só, a estrela da manhã, brilha logo acima
  // dela; no mar escuro, o caminho de luz que a estrela faz na água vem na direção de quem vê.
  // até que em Literata itálica creme no céu escuro, e ELE VENHA em Oswald enorme, em tinta,
  // de pé no horizonte, contra a faixa clara. Diferente do
  // relógio (Prepara-te, Ele vem) e do cartaz amarelo de Avivados: nenhum ponteiro, nenhuma
  // foto, só a espera e a luz que vem. Fechamento: a estrela.
  const HORIZONTE = 1250;
  function ceuDaAlvorada(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, HORIZONTE);
    g.addColorStop(0, '#080a09');
    g.addColorStop(0.42, '#0d1210');
    g.addColorStop(0.66, '#26302a');
    g.addColorStop(0.76, '#5e6b52');
    g.addColorStop(0.83, '#c3cd9f');
    g.addColorStop(1, '#f5f2dc');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, HORIZONTE);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, L, HORIZONTE);
    ctx.clip();
    ctx.translate(L / 2, HORIZONTE);
    ctx.scale(1, 0.42);
    const q = ctx.createRadialGradient(0, 0, 0, 0, 0, 760);
    q.addColorStop(0, 'rgba(255,214,130,.55)');
    q.addColorStop(0.5, 'rgba(255,214,130,.16)');
    q.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = q;
    ctx.fillRect(-760, -760, 1520, 1520);
    ctx.restore();
    // o mar
    const m = ctx.createLinearGradient(0, HORIZONTE, 0, A);
    m.addColorStop(0, '#2a312b');
    m.addColorStop(0.08, '#121714');
    m.addColorStop(1, '#070908');
    ctx.fillStyle = m;
    ctx.fillRect(0, HORIZONTE, L, A - HORIZONTE);
  }
  function brilhoNoMar(ctx, r) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 900; i++) {
      const t = Math.pow(r(), 1.25);
      const y = HORIZONTE + 8 + t * (A - HORIZONTE);
      const meia = 26 + t * 300;
      const desvio = (r() + r() + r() - 1.5) / 1.5;
      const x = L / 2 + desvio * meia;
      const perto = 1 - Math.abs(desvio);
      const fade = y < 1400 ? 1 : Math.max(0, 1 - (y - 1400) / 130);
      const a = (0.2 + perto * 0.6) * (1 - t * 0.55) * fade * (0.5 + r() * 0.5);
      if (a < 0.03) continue;
      const w = 6 + r() * (14 + t * 40);
      ctx.strokeStyle = 'rgba(250,240,205,' + a.toFixed(3) + ')';
      ctx.lineWidth = 1.5 + t * 2.4;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
      ctx.stroke();
    }
    // a linha do horizonte, fina e clara
    ctx.fillStyle = 'rgba(250,245,222,.9)';
    ctx.fillRect(0, HORIZONTE - 1, L, 2.5);
    ctx.restore();
  }
  function estrelaDaManha(ctx, x, y, h) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, h * 0.9);
    g.addColorStop(0, 'rgba(255,240,200,.55)');
    g.addColorStop(0.3, 'rgba(255,230,170,.16)');
    g.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - h, y - h, 2 * h, 2 * h);
    // os raios: finos e afinando, o de cima e o de baixo mais longos
    const raio = (ang, comp, base) => {
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * comp, y + Math.sin(ang) * comp);
      ctx.lineTo(x + Math.cos(ang + Math.PI / 2) * base, y + Math.sin(ang + Math.PI / 2) * base);
      ctx.lineTo(x + Math.cos(ang + Math.PI) * comp, y + Math.sin(ang + Math.PI) * comp);
      ctx.lineTo(x + Math.cos(ang - Math.PI / 2) * base, y + Math.sin(ang - Math.PI / 2) * base);
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = '#fff6da';
    raio(Math.PI / 2, h * 0.5, h * 0.035);
    raio(0, h * 0.4, h * 0.035);
    ctx.globalAlpha = 0.55;
    raio(Math.PI / 4, h * 0.13, h * 0.02);
    raio(-Math.PI / 4, h * 0.13, h * 0.02);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, h * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function arteVenha(ctx) {
    const r = sorteio(1530);
    ceuDaAlvorada(ctx);
    brilhoNoMar(ctx, r);
    const os = (t) => oswaldLP(t, 700);
    const tV = caber(ctx, 'ELE VENHA', os, L - 130, 320);
    ctx.font = os(tV);
    // ELE VENHA de pé no horizonte, em tinta contra a faixa clara
    S.escrever(ctx, 'ELE VENHA', L / 2, HORIZONTE - 4, os(tV), LP.tinta, { espaco: 2 });
    const capV = ctx.measureText('ELE VENHA').actualBoundingBoxAscent;
    // a estrela da manhã e o até que no céu escuro, acima
    estrelaDaManha(ctx, L / 2, HORIZONTE - capV - 200, 300);
    S.escrever(ctx, 'Até que', L / 2, HORIZONTE - capV - 400, 'italic 500 104px Literata, Georgia, serif', LP.creme);
  }

  // ---------- nona leva (rodada 16): dez frases novas do dono (2026-10-11) ----------
  // Cada uma num fundo, composição, letra e fecho diferentes das vizinhas e das 49 de antes.
  // As referências que o dono mandou são de terceiros: daqui só saiu a ideia, redesenhada.
  // O dono recusou a primeira versão (com cara de ícone chapado) e pediu o nível do avião:
  // luz, sombra, profundidade, textura de impressão e poucos elementos, bem desenhados.
  // O retângulo de cantos redondos como caminho (sem depender do roundRect do navegador).
  function retRedondo(ctx, x, y, w, h, raio) {
    const q = Math.min(raio, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + q, y);
    ctx.arcTo(x + w, y, x + w, y + h, q);
    ctx.arcTo(x + w, y + h, x, y + h, q);
    ctx.arcTo(x, y + h, x, y, q);
    ctx.arcTo(x, y, x + w, y, q);
    ctx.closePath();
  }
  // Retícula de impressão: pontos numa grade a 45°, do tamanho que a função pede (0 a 1)
  // em cada lugar. Desenha onde o contexto já estiver recortado.
  function reticula(ctx, x0, y0, x1, y1, passo, densidade, cor) {
    ctx.save();
    ctx.fillStyle = cor;
    const c = Math.SQRT1_2;
    const diag = Math.hypot(x1 - x0, y1 - y0);
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    for (let u = -diag / 2; u <= diag / 2; u += passo) {
      for (let v = -diag / 2; v <= diag / 2; v += passo) {
        const x = mx + (u - v) * c;
        const y = my + (u + v) * c;
        if (x < x0 - passo || x > x1 + passo || y < y0 - passo || y > y1 + passo) continue;
        const d = densidade(x, y);
        if (d <= 0.02) continue;
        ctx.beginPath();
        ctx.arc(x, y, passo * 0.56 * Math.sqrt(Math.min(1, d)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  // Manchas suaves (luz ou sombra) espalhadas: dão volume a um fundo liso.
  function manchas(ctx, r, n, { x0 = 0, y0 = 0, x1 = L, y1 = A, rMin = 80, rMax = 360, claro = '255,255,255', escuro = '0,0,0', aClaro = 0.05, aEscuro = 0.05 } = {}) {
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0);
      const y = y0 + r() * (y1 - y0);
      const rr = rMin + r() * (rMax - rMin);
      const ehClaro = r() < 0.5;
      const a = (ehClaro ? aClaro : aEscuro) * (0.4 + r() * 0.6);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, 'rgba(' + (ehClaro ? claro : escuro) + ',' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + (ehClaro ? claro : escuro) + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  }

  // O Evangelho não é segredo para ser guardado, é notícia para ser espalhada: vários
  // exemplares do jornal espalhados no chão de concreto, à luz do dia, com a sombra macia
  // de cada folha. O de cima é a primeira página da frase: o começo em Literata itálica
  // (a linha fina), É NOTÍCIA de manchete em Oswald e "para ser espalhada." embaixo, com a
  // foto em retícula de uma luz que se abre e as colunas de texto em cinza (nenhuma palavra).
  // Os outros, por baixo, saem do quadro para todos os lados. Fechamento: os jornais
  // espalhados. (Antes era a caixa de jornal amarela, que ficou com cara de ícone.)
  function concreto(ctx, semente) {
    const r = sorteio(semente);
    const g = ctx.createLinearGradient(0, 0, L * 0.6, A);
    g.addColorStop(0, '#dcd9d1');
    g.addColorStop(1, '#c6c2b8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 60, { aClaro: 0.10, aEscuro: 0.07, claro: '250,248,240', escuro: '70,66,58' });
    for (let i = 0; i < 14000; i++) {
      const escuro = r() < 0.7;
      ctx.fillStyle = escuro ? 'rgba(60,56,48,' + (0.06 + r() * 0.2).toFixed(3) + ')' : 'rgba(255,255,250,' + (0.2 + r() * 0.3).toFixed(3) + ')';
      const s = 0.6 + r() * r() * 2.6;
      ctx.fillRect(r() * L, r() * A, s, s);
    }
  }
  // Uma folha de jornal com o meio em (0, 0) já girado; desenho(ctx, w, h) faz o conteúdo.
  function folhaDeJornal(ctx, w, h, r, desenho) {
    ctx.save();
    ctx.shadowColor = 'rgba(45,40,30,.34)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#efece3';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.clip();
    desenho(ctx, w, h);
    // o papel não fica plano: a dobra do meio, a luz de um lado e a sombra do outro
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, 'rgba(255,255,255,.10)');
    g.addColorStop(0.47, 'rgba(0,0,0,.02)');
    g.addColorStop(0.5, 'rgba(0,0,0,.10)');
    g.addColorStop(0.53, 'rgba(255,255,255,.12)');
    g.addColorStop(1, 'rgba(0,0,0,.07)');
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    const v = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    v.addColorStop(0, 'rgba(0,0,0,.05)');
    v.addColorStop(0.2, 'rgba(0,0,0,0)');
    v.addColorStop(0.85, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.08)');
    ctx.fillStyle = v;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    // fibras do papel-jornal
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = 'rgba(80,70,55,' + (0.04 + r() * 0.06).toFixed(3) + ')';
      ctx.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 1 + r() * 3, 1);
    }
    ctx.restore();
  }
  // As linhas de texto de uma coluna, em cinza (o texto miúdo do jornal, de longe).
  function colunaDeTexto(ctx, x, y, w, ate, r, entre = 15) {
    ctx.fillStyle = 'rgba(18,19,15,.32)';
    let n = 0;
    for (let yy = y; yy < ate; yy += entre) {
      const fim = (++n % 9 === 0) ? w * (0.3 + r() * 0.4) : w;
      ctx.fillRect(x, yy, fim, 5.5);
    }
  }
  function jornalGenerico(r) {
    return (ctx, w, h) => {
      const m = 34;
      ctx.fillStyle = 'rgba(18,19,15,.7)';
      ctx.fillRect(-w / 2 + m, -h / 2 + m, w - 2 * m, 5);
      ctx.fillRect(-w / 2 + m, -h / 2 + m + 11, w - 2 * m, 2);
      // a manchete: duas linhas de letras grandes vistas de longe, em cinza
      const yM = -h / 2 + m + 40;
      for (let lin = 0; lin < 2; lin++) {
        let x = -w / 2 + m;
        const fimLinha = lin ? w * 0.1 : w / 2 - m;
        while (x < fimLinha - 30) {
          const lw = 14 + r() * 26;
          ctx.fillStyle = 'rgba(18,19,15,.5)';
          ctx.fillRect(x, yM + lin * 40 + (r() < 0.3 ? -6 : 0), Math.min(lw, fimLinha - x), r() < 0.3 ? 32 : 26);
          x += lw + (r() < 0.25 ? 16 : 4);
        }
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w / 2 + m, yM + 76, w * 0.5, h * 0.3);
      ctx.clip();
      reticula(ctx, -w / 2 + m, yM + 76, -w / 2 + m + w * 0.5, yM + 76 + h * 0.3, 9, (px, py) => 0.2 + 0.45 * Math.sin(px * 0.01 + py * 0.013) ** 2, 'rgba(18,19,15,.45)');
      ctx.restore();
      const cw = (w - 2 * m - 40) / 3;
      colunaDeTexto(ctx, -w / 2 + m + w * 0.5 + 20, yM + 76, w - 2 * m - w * 0.5 - 20, yM + 76 + h * 0.3, r);
      for (let i = 0; i < 3; i++) colunaDeTexto(ctx, -w / 2 + m + i * (cw + 20), yM + 100 + h * 0.3, cw, h / 2 - m, r);
    };
  }
  function arteNoticia(ctx) {
    const r = sorteio(1600);
    concreto(ctx, 1600);
    const tinta = LP.tinta;
    // os de baixo, saindo do quadro
    for (const [x, y, giro] of [[60, 760, -0.42], [1010, 700, 0.36], [40, 1520, 0.3], [1060, 1560, -0.24]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(giro);
      folhaDeJornal(ctx, 640, 880, r, jornalGenerico(r));
      ctx.restore();
    }
    // o de cima: a primeira página da frase
    ctx.save();
    ctx.translate(540, 1030);
    ctx.rotate(-0.035);
    folhaDeJornal(ctx, 720, 960, r, (k, w, h) => {
      const m = 44;
      const x0 = -w / 2 + m;
      const larg = w - 2 * m;
      let y = -h / 2 + m;
      k.fillStyle = tinta;
      k.fillRect(x0, y, larg, 7);
      k.fillRect(x0, y + 13, larg, 2);
      y += 72;
      const lit = (t) => 'italic 500 ' + t + 'px Literata, Georgia, serif';
      const tD = Math.min(caber(k, 'O Evangelho não é segredo', lit, larg, 54), caber(k, 'para ser guardado,', lit, larg, 54));
      S.escrever(k, 'O Evangelho não é segredo', x0, y, lit(tD), tinta, { alinhar: 'left' });
      S.escrever(k, 'para ser guardado,', x0, y + tD * 1.2, lit(tD), tinta, { alinhar: 'left' });
      y += tD * 1.2 + 30;
      k.fillRect(x0, y, larg, 2);
      const os = (t) => oswaldLP(t, 700);
      const tN = caber(k, 'É NOTÍCIA', os, larg, 260);
      k.font = os(tN);
      const capN = k.measureText('É NOTÍCIA').actualBoundingBoxAscent;
      y += 22 + capN;
      S.escrever(k, 'É NOTÍCIA', x0 - 4, y, os(tN), tinta, { alinhar: 'left' });
      y += 70;
      const tE = caber(k, 'para ser espalhada.', (t) => '600 ' + t + 'px Literata, Georgia, serif', larg, 66);
      S.escrever(k, 'para ser espalhada.', x0, y, '600 ' + tE + 'px Literata, Georgia, serif', tinta, { alinhar: 'left' });
      y += 34;
      k.fillRect(x0, y, larg, 2);
      y += 26;
      // a foto em retícula: a luz que se abre do meio, e as colunas ao lado
      const fw = larg * 0.56;
      const fh = h / 2 - m - y;
      const fx = x0;
      k.save();
      k.beginPath();
      k.rect(fx, y, fw, fh);
      k.clip();
      const cxF = fx + fw * 0.5;
      const cyF = y + fh * 0.62;
      // a foto: um amanhecer, o céu escuro em cima, a luz rompendo no horizonte e os raios,
      // impressa em duas cores (a luz no amarelo, por baixo da retícula preta)
      const sol = k.createRadialGradient(cxF, cyF, 0, cxF, cyF, fw * 0.75);
      sol.addColorStop(0, '#ffe7a6');
      sol.addColorStop(0.35, LP.amarelo);
      sol.addColorStop(1, '#f0b84a');
      k.fillStyle = sol;
      k.fillRect(fx, y, fw, fh);
      reticula(k, fx, y, fx + fw, y + fh, 7, (px, py) => {
        const dx = px - cxF;
        const dy = py - cyF;
        const d = Math.hypot(dx, dy * 1.4) / fw;
        const ang = Math.atan2(dy, dx);
        const raios = Math.max(0, Math.cos(ang * 11)) ** 3 * Math.exp(-d * 1.6) * (dy < 0 ? 1 : 0);
        const luz = Math.exp(-d * 4.2) + raios * 0.7;
        const chao = py > cyF ? 0.55 + (py - cyF) / fh * 0.8 : 0;
        return Math.min(1, Math.max(chao, 0.95 - luz * 1.25));
      }, 'rgba(18,19,15,.85)');
      k.restore();
      colunaDeTexto(k, fx + fw + 22, y + 4, larg - fw - 22, h / 2 - m, r, 16);
    });
    ctx.restore();
  }
  // Meus planos. Os planos de Deus.: o aviãozinho de papel, pequeno, no céu nublado, faz no
  // chão... no céu, a sombra de um avião enorme. Meus planos à mão, ao lado do aviãozinho;
  // Os planos de Deus em Literata, junto da sombra. Fechamento: a sombra.
  function nuvens(ctx, r) {
    for (let i = 0; i < 70; i++) {
      const x = r() * L;
      const y = r() * A;
      const rx = 120 + r() * 320;
      const ry = rx * (0.35 + r() * 0.25);
      const claro = r() < 0.6;
      const a = claro ? 0.12 + r() * 0.2 : 0.05 + r() * 0.08;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      const cor = claro ? '252,252,246' : '120,130,122';
      g.addColorStop(0, 'rgba(' + cor + ',' + a.toFixed(3) + ')');
      g.addColorStop(0.6, 'rgba(' + cor + ',' + (a * 0.6).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + cor + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    }
  }
  // A planta de um avião de linha vista de baixo, com o nariz para +x e o meio em (0, 0):
  // o corpo, as asas enflechadas com os motores e o leme de profundidade.
  function silhuetaDeAviao(ctx, comp) {
    const k = comp / 1000;
    ctx.save();
    ctx.scale(k, k);
    ctx.beginPath();
    // o corpo
    ctx.moveTo(500, 0);
    ctx.bezierCurveTo(500, -40, 450, -56, 390, -56);
    ctx.lineTo(-380, -50);
    ctx.bezierCurveTo(-440, -44, -480, -20, -500, 0);
    ctx.bezierCurveTo(-480, 20, -440, 44, -380, 50);
    ctx.lineTo(390, 56);
    ctx.bezierCurveTo(450, 56, 500, 40, 500, 0);
    ctx.closePath();
    ctx.fill();
    for (const lado of [-1, 1]) {
      // a asa
      ctx.beginPath();
      ctx.moveTo(150, lado * 40);
      ctx.lineTo(-150, lado * 520);
      ctx.lineTo(-225, lado * 520);
      ctx.lineTo(-110, lado * 40);
      ctx.closePath();
      ctx.fill();
      // os motores, à frente da asa
      for (const [mx, my] of [[90, 190], [-10, 360]]) {
        ctx.beginPath();
        ctx.ellipse(mx, lado * my, 82, 30, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // o leme de profundidade
      ctx.beginPath();
      ctx.moveTo(-345, lado * 40);
      ctx.lineTo(-470, lado * 210);
      ctx.lineTo(-515, lado * 210);
      ctx.lineTo(-455, lado * 30);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  function aviaoDePapel(ctx, x, y, comp, giro, r) {
    const k = comp / 200;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    ctx.scale(k, k);
    ctx.lineJoin = 'round';
    // a asa de cima (clara), a de baixo (na sombra) e a quilha
    const cima = new Path2D('M100 0 L-100 -62 L-70 0 Z');
    const baixo = new Path2D('M100 0 L-70 0 L-96 46 Z');
    const quilha = new Path2D('M100 0 L-70 0 L-82 16 Z');
    ctx.fillStyle = LP.amarelo;
    ctx.fill(cima);
    ctx.fillStyle = '#d9a034';
    ctx.fill(baixo);
    ctx.fillStyle = '#b57f1c';
    ctx.fill(quilha);
    ctx.strokeStyle = LP.tinta;
    ctx.lineWidth = 3.2 / k;
    for (const p of [cima, baixo, quilha]) ctx.stroke(p);
    ctx.restore();
    // o risco do vento atrás dele
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push([x - Math.cos(giro) * comp * (0.75 + t * 1.4) + Math.sin(t * 6) * 6, y - Math.sin(giro) * comp * (0.75 + t * 1.4) + Math.cos(t * 5) * 8]);
    }
    tracoAMao(ctx, pts, { r, largura: 3, tremor: 1.5, cor: 'rgba(18,19,15,.35)', segunda: false });
  }
  function artePlanos(ctx) {
    const r = sorteio(1610);
    const g = ctx.createLinearGradient(0, 0, L * 0.3, A);
    g.addColorStop(0, '#c3ccc3');
    g.addColorStop(0.5, '#d6dbd1');
    g.addColorStop(1, '#e7e8de');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
    nuvens(ctx, r);
    // a sombra do avião grande, na mesma direção do aviãozinho, borrada como sombra de verdade
    const giro = -0.62;
    const { c, ctx: k } = camada();
    k.filter = 'blur(7px)';
    k.translate(600, 1180);
    k.rotate(giro);
    k.fillStyle = '#1c231e';
    silhuetaDeAviao(k, 1180);
    k.setTransform(1, 0, 0, 1, 0, 0);
    k.filter = 'none';
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
    nuvens(ctx, sorteio(1611));
    // o aviãozinho, pequeno, no alto à esquerda
    aviaoDePapel(ctx, 300, 690, 150, giro, r);
    const tinta = LP.tinta;
    ctx.fillStyle = tinta;
    aMao(ctx, '— Meus planos.', 420, 640, 62, r);
    // junto da sombra, embaixo da asa
    S.escrever(ctx, '— Os planos', L - 80, 1420, '600 84px Literata, Georgia, serif', tinta, { alinhar: 'right' });
    S.escrever(ctx, 'de Deus.', L - 80, 1520, '600 84px Literata, Georgia, serif', tinta, { alinhar: 'right' });
  }
  // Jesus está chamando você: o celular deitado na mesa escura, tocando. A tela acesa é a
  // única luz: ela clareia a mesa em volta, e o aparelho vibra (o rastro fraco dos lados).
  // Na tela, Jesus grande e "está chamando você", e os dois botões: recusar em cinza e
  // aceitar em sálvia. Recusar e aceitar são palavras fora da frase (parte da tela),
  // avisadas ao dono. Fechamento: a luz da tela na mesa.
  function fone(ctx, cx, cy, s, giro, cor) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(giro);
    ctx.fillStyle = cor;
    // o fone de gancho deitado: as duas conchas e o cabo curvo entre elas
    ctx.beginPath();
    ctx.moveTo(-s * 0.62, -s * 0.06);
    ctx.bezierCurveTo(-s * 0.62, -s * 0.5, s * 0.62, -s * 0.5, s * 0.62, -s * 0.06);
    ctx.lineTo(s * 0.62, s * 0.08);
    ctx.bezierCurveTo(s * 0.62, s * 0.2, s * 0.56, s * 0.24, s * 0.46, s * 0.24);
    ctx.lineTo(s * 0.3, s * 0.24);
    ctx.bezierCurveTo(s * 0.22, s * 0.24, s * 0.18, s * 0.18, s * 0.2, s * 0.1);
    ctx.lineTo(s * 0.22, -s * 0.02);
    ctx.bezierCurveTo(s * 0.08, -s * 0.08, -s * 0.08, -s * 0.08, -s * 0.22, -s * 0.02);
    ctx.lineTo(-s * 0.2, s * 0.1);
    ctx.bezierCurveTo(-s * 0.18, s * 0.18, -s * 0.22, s * 0.24, -s * 0.3, s * 0.24);
    ctx.lineTo(-s * 0.46, s * 0.24);
    ctx.bezierCurveTo(-s * 0.56, s * 0.24, -s * 0.62, s * 0.2, -s * 0.62, s * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function arteChamada(ctx) {
    const r = sorteio(1615);
    // a mesa: grafite fosco com veio fino
    ctx.fillStyle = '#0e0f0e';
    ctx.fillRect(0, 0, L, A);
    ctx.lineCap = 'round';
    for (let i = 0; i < 1600; i++) {
      const y = r() * A;
      const x = r() * L;
      ctx.strokeStyle = 'rgba(' + (r() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (0.015 + r() * 0.03).toFixed(3) + ')';
      ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 60 + r() * 220, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
    const cx = 548;
    const cy = 1020;
    const w = 470;
    const h = 930;
    const giro = -0.08;
    // a luz da tela na mesa: larga e macia, mais forte junto do aparelho
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(giro);
    for (const [rx, ry, a] of [[820, 980, 0.16], [500, 700, 0.20], [340, 600, 0.16]]) {
      ctx.save();
      ctx.scale(rx / ry, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
      g.addColorStop(0, 'rgba(214,226,170,' + a + ')');
      g.addColorStop(1, 'rgba(214,226,170,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
      ctx.restore();
    }
    // a vibração: o contorno repetido, bem fraco, dos dois lados
    for (const d of [-16, 16, -30, 30]) {
      ctx.strokeStyle = 'rgba(220,230,190,' + (Math.abs(d) < 20 ? 0.10 : 0.05) + ')';
      ctx.lineWidth = 3;
      retRedondo(ctx, -w / 2 + d, -h / 2, w, h, 72);
      ctx.stroke();
    }
    // o aparelho: a sombra, o corpo e o brilho da borda
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.8)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetX = 14;
    ctx.shadowOffsetY = 26;
    retRedondo(ctx, -w / 2, -h / 2, w, h, 72);
    ctx.fillStyle = '#1b1c1b';
    ctx.fill();
    ctx.restore();
    const borda = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    borda.addColorStop(0, 'rgba(255,255,255,.42)');
    borda.addColorStop(0.35, 'rgba(255,255,255,.06)');
    borda.addColorStop(0.7, 'rgba(255,255,255,.03)');
    borda.addColorStop(1, 'rgba(255,255,255,.22)');
    ctx.strokeStyle = borda;
    ctx.lineWidth = 3;
    retRedondo(ctx, -w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, 71);
    ctx.stroke();
    ctx.fillStyle = '#2a2b29';
    ctx.fillRect(w / 2 - 1, -h / 2 + 200, 5, 110);
    ctx.fillRect(-w / 2 - 4, -h / 2 + 170, 5, 60);
    ctx.fillRect(-w / 2 - 4, -h / 2 + 250, 5, 90);
    // a tela
    const m = 14;
    retRedondo(ctx, -w / 2 + m, -h / 2 + m, w - 2 * m, h - 2 * m, 60);
    ctx.save();
    ctx.clip();
    const fundoTela = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    fundoTela.addColorStop(0, '#26301f');
    fundoTela.addColorStop(0.45, '#151a13');
    fundoTela.addColorStop(1, '#0b0d0a');
    ctx.fillStyle = fundoTela;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    // o papel de parede desfocado: duas luzes, sálvia e amarela
    for (const [x, y, rr, cor, a] of [[-90, -330, 300, '200,218,140', 0.45], [130, -250, 240, '255,196,77', 0.22], [0, 260, 360, '200,218,140', 0.10]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, 'rgba(' + cor + ',' + a + ')');
      g.addColorStop(1, 'rgba(' + cor + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    // a ilha da câmera
    ctx.fillStyle = '#050505';
    retRedondo(ctx, -64, -h / 2 + 32, 128, 38, 19);
    ctx.fill();
    // quem chama
    S.escrever(ctx, 'Jesus', 0, -186, '500 128px Manrope, sans-serif', LP.creme, { espaco: -3 });
    S.escrever(ctx, 'está chamando você', 0, -120, '500 38px Manrope, sans-serif', '#d5d8c8');
    // os botões
    const by = 300;
    const xb = 118;
    ctx.fillStyle = 'rgba(70,74,66,.85)';
    ctx.beginPath();
    ctx.arc(-xb, by, 56, 0, Math.PI * 2);
    ctx.fill();
    fone(ctx, -xb, by + 6, 62, 0, LP.creme);
    for (const [rr, a] of [[96, 0.10], [80, 0.2]]) {
      ctx.strokeStyle = 'rgba(200,218,140,' + a + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(xb, by, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = LP.salvia;
    ctx.beginPath();
    ctx.arc(xb, by, 56, 0, Math.PI * 2);
    ctx.fill();
    fone(ctx, xb + 3, by + 3, 62, Math.PI * 1.75, LP.tinta);
    S.escrever(ctx, 'recusar', -xb, by + 104, '500 26px Manrope, sans-serif', '#c9cabd');
    S.escrever(ctx, 'aceitar', xb, by + 104, '500 26px Manrope, sans-serif', '#c9cabd');
    ctx.fillStyle = 'rgba(242,239,220,.7)';
    retRedondo(ctx, -70, h / 2 - 34, 140, 8, 4);
    ctx.fill();
    // o reflexo do vidro, uma faixa larga e muito fraca
    const refl = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    refl.addColorStop(0, 'rgba(255,255,255,0)');
    refl.addColorStop(0.32, 'rgba(255,255,255,0)');
    refl.addColorStop(0.36, 'rgba(255,255,255,.06)');
    refl.addColorStop(0.5, 'rgba(255,255,255,.02)');
    refl.addColorStop(0.52, 'rgba(255,255,255,0)');
    ctx.fillStyle = refl;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.restore();
  }
  // Não importa o que você fez, apenas volte para casa! O Pai te espera de braços abertos:
  // a noite, e lá na frente uma porta aberta com a luz acesa. Só a luz: o retângulo claro no
  // escuro e o facho que ela deita no chão, vindo até quem vê, com a poeira brilhando. Em
  // cima, "Não importa o que você fez," pequeno em Manrope espaçada e "Apenas volte para
  // casa!" grande em Literata, creme; dentro da luz, à mão, "O Pai te espera de braços
  // abertos", como bilhete. Diferente da porta entreaberta (porta: o desenho da porta no
  // papel claro): aqui a casa não aparece, só a luz que ela deixou acesa. Sem carimbo nem
  // palavra fora da frase (o cartaz da primeira versão ficou carregado). Fechamento: a luz.
  function arteCasa(ctx) {
    const r = sorteio(1620);
    const ceu = ctx.createLinearGradient(0, 0, 0, A);
    ceu.addColorStop(0, '#080a09');
    ceu.addColorStop(0.55, '#0c0e0c');
    ceu.addColorStop(1, '#121410');
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, L, A);
    // o texto de cima
    const tinta = LP.tinta;
    S.escrever(ctx, 'NÃO IMPORTA O QUE VOCÊ FEZ,', L / 2, 580, '600 34px Manrope, sans-serif', LP.texto, { espaco: 7 });
    const lit = (t) => '600 ' + t + 'px Literata, Georgia, serif';
    const tG = Math.min(caber(ctx, 'Apenas volte', lit, 900, 140), caber(ctx, 'para casa!', lit, 900, 140));
    S.escrever(ctx, 'Apenas volte', L / 2, 580 + 40 + tG * 0.86, lit(tG), LP.creme, { espaco: -1 });
    S.escrever(ctx, 'para casa!', L / 2, 580 + 40 + tG * 0.86 + tG * 1.1, lit(tG), LP.creme, { espaco: -1 });
    // a porta, lá na frente
    const dw = 128;
    const dTopo = 580 + 40 + tG * 2.1 + 80;
    const dh = 236;
    const dBase = dTopo + dh;
    const dx = L / 2;
    // o facho no chão: do pé da porta até a borda de baixo, abrindo
    const facho = camada();
    const k = facho.ctx;
    k.filter = 'blur(5px)';
    const g = k.createLinearGradient(0, dBase, 0, A);
    g.addColorStop(0, 'rgba(255,222,140,.97)');
    g.addColorStop(0.45, 'rgba(255,204,100,.78)');
    g.addColorStop(1, 'rgba(255,196,77,.5)');
    k.fillStyle = g;
    k.beginPath();
    k.moveTo(dx - dw / 2, dBase);
    k.lineTo(dx + dw / 2, dBase);
    k.lineTo(dx + dw / 2 + 760, A + 40);
    k.lineTo(dx - dw / 2 - 760, A + 40);
    k.closePath();
    k.fill();
    k.filter = 'none';
    // as tábuas do chão, só onde a luz bate
    k.globalCompositeOperation = 'source-atop';
    k.strokeStyle = 'rgba(90,60,10,.20)';
    k.lineWidth = 3;
    for (let i = -8; i <= 8; i++) {
      k.beginPath();
      k.moveTo(dx + i * dw / 16, dBase);
      k.lineTo(dx + i * 120, A + 40);
      k.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const t = (i + 1) / 10;
      const y = dBase + Math.pow(t, 1.8) * (A - dBase);
      k.strokeStyle = 'rgba(90,60,10,.10)';
      k.lineWidth = 2;
      k.beginPath();
      k.moveTo(0, y);
      k.lineTo(L, y);
      k.stroke();
    }
    // as bordas do facho somem para os lados
    k.globalCompositeOperation = 'destination-in';
    const lados = k.createLinearGradient(0, 0, L, 0);
    lados.addColorStop(0, 'rgba(0,0,0,.2)');
    lados.addColorStop(0.3, 'rgba(0,0,0,1)');
    lados.addColorStop(0.7, 'rgba(0,0,0,1)');
    lados.addColorStop(1, 'rgba(0,0,0,.2)');
    k.fillStyle = lados;
    k.fillRect(0, 0, L, A);
    ctx.drawImage(facho.c, 0, 0);
    // o brilho em volta da porta
    const halo = ctx.createRadialGradient(dx, dTopo + dh * 0.6, 0, dx, dTopo + dh * 0.6, 520);
    halo.addColorStop(0, 'rgba(255,214,130,.38)');
    halo.addColorStop(0.3, 'rgba(255,200,100,.12)');
    halo.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, dTopo - 520, L, 1100);
    // a porta: a luz de dentro, mais clara no meio, e a folha aberta, escura, de lado
    const gp = ctx.createLinearGradient(dx - dw / 2, 0, dx + dw / 2, 0);
    gp.addColorStop(0, '#ffe4a3');
    gp.addColorStop(0.5, '#fff7e0');
    gp.addColorStop(1, '#ffd98a');
    ctx.fillStyle = gp;
    ctx.fillRect(dx - dw / 2, dTopo, dw, dh);
    ctx.fillStyle = 'rgba(40,30,10,.55)';
    ctx.beginPath();
    ctx.moveTo(dx - dw / 2, dTopo);
    ctx.lineTo(dx - dw / 2 + 26, dTopo + 10);
    ctx.lineTo(dx - dw / 2 + 26, dBase - 8);
    ctx.lineTo(dx - dw / 2, dBase);
    ctx.closePath();
    ctx.fill();
    // a poeira na luz
    for (let i = 0; i < 240; i++) {
      const t = r();
      const y = dBase - 60 + t * 700;
      const meia = dw / 2 + t * 420;
      const x = dx + (r() - 0.5) * 2 * meia * 0.8;
      const a = (1 - t) * (0.25 + r() * 0.5);
      ctx.fillStyle = 'rgba(255,248,225,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + r() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // o bilhete à mão, dentro da luz
    ctx.fillStyle = tinta;
    aMao(ctx, 'O Pai te espera', L / 2, dBase + 150, 50, r, { alinhar: 'center' });
    aMao(ctx, 'de braços abertos', L / 2, dBase + 218, 50, r, { alinhar: 'center' });
  }
  // fonte: a letra (Manrope engordada, ou outra); pesos: a altura de cada linha, em proporção;
  // larguras: a fração da largura que cada linha ocupa (a mais curta não espreme nas bordas).
  function letrasNoCirculo(palavras, R, cor, { fonte: letra = '800 200px Manrope, sans-serif', pesos, larguras } = {}) {
    const Q = 1400;
    const fonte = document.createElement('canvas');
    fonte.width = Q;
    fonte.height = Q;
    const k = fonte.getContext('2d');
    k.fillStyle = '#000';
    k.strokeStyle = '#000';
    k.lineJoin = 'round';
    const vao = Q * 0.035;
    const ps = pesos || palavras.map(() => 1);
    const somaPesos = ps.reduce((a, b) => a + b, 0);
    const alturas = ps.map((x) => (Q - vao * (palavras.length - 1)) * x / somaPesos);
    palavras.forEach((p, i) => {
      const altura = alturas[i];
      const topo = alturas.slice(0, i).reduce((a, b) => a + b, 0) + i * vao;
      k.save();
      k.font = letra;
      k.textAlign = 'left';
      k.textBaseline = 'alphabetic';
      const m = k.measureText(p);
      const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      const gordo = 16;
      const fr = larguras ? larguras[i] : 1;
      k.translate(Q * (1 - fr) / 2, topo);
      k.scale((Q * fr - gordo * 3) / w, (altura - gordo * 3) / h);
      k.translate(m.actualBoundingBoxLeft + gordo * 1.5 * w / (Q * fr), m.actualBoundingBoxAscent + gordo * 1.5 * h / altura);
      k.fillText(p, 0, 0);
      k.lineWidth = gordo;
      k.strokeText(p, 0, 0);
      k.restore();
    });
    const src = k.getImageData(0, 0, Q, Q).data;
    const D = Math.ceil(R * 2);
    const sai = document.createElement('canvas');
    sai.width = D;
    sai.height = D;
    const ks = sai.getContext('2d');
    const img = ks.createImageData(D, D);
    const o = img.data;
    const cr = parseInt(cor.slice(1, 3), 16);
    const cg = parseInt(cor.slice(3, 5), 16);
    const cb = parseInt(cor.slice(5, 7), 16);
    const s2 = Math.SQRT2;
    const alfa = (x, y) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      if (xi < 0 || yi < 0 || xi >= Q - 1 || yi >= Q - 1) return 0;
      const fx = x - xi;
      const fy = y - yi;
      const i = (yi * Q + xi) * 4 + 3;
      return (src[i] * (1 - fx) + src[i + 4] * fx) * (1 - fy) + (src[i + Q * 4] * (1 - fx) + src[i + Q * 4 + 4] * fx) * fy;
    };
    for (let py = 0; py < D; py++) {
      for (let px = 0; px < D; px++) {
        const u = (px + 0.5 - R) / R;
        const v = (py + 0.5 - R) / R;
        const d2 = u * u + v * v;
        if (d2 >= 1) continue;
        const a2 = 2 + u * u - v * v;
        const b2 = 2 - u * u + v * v;
        const x = 0.5 * Math.sqrt(Math.max(0, a2 + 2 * s2 * u)) - 0.5 * Math.sqrt(Math.max(0, a2 - 2 * s2 * u));
        const y = 0.5 * Math.sqrt(Math.max(0, b2 + 2 * s2 * v)) - 0.5 * Math.sqrt(Math.max(0, b2 - 2 * s2 * v));
        let a = alfa((x + 1) / 2 * (Q - 1), (y + 1) / 2 * (Q - 1));
        const borda = (1 - Math.sqrt(d2)) * R;
        if (borda < 1) a *= borda;
        if (a <= 0) continue;
        const j = (py * D + px) * 4;
        o[j] = cr;
        o[j + 1] = cg;
        o[j + 2] = cb;
        o[j + 3] = a;
      }
    }
    ks.putImageData(img, 0, 0);
    return sai;
  }
  // Jesus salva: as duas palavras incham até encher um círculo, como as letras redondas dos
  // adesivos dos anos 70, impressas em tinta no papel amarelo grosso (a tinta assentada, com
  // a marca leve da prensa), e as ondas finas em volta, cada vez mais largas e mais fracas,
  // como o som que se espalha. As letras são Manrope engordada, esticada num quadrado e
  // levada para o círculo ponto a ponto (o mapa elíptico do quadrado no disco). Diferente
  // dos recortes de revista de Jesus vive. Fechamento: as ondas.
  function arteSalva(tela) {
    let ctx = tela;
    const r = sorteio(1625);
    const g = ctx.createLinearGradient(0, 0, L, A);
    g.addColorStop(0, '#ffcf63');
    g.addColorStop(0.55, LP.amarelo);
    g.addColorStop(1, '#f2b23a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 40, { aClaro: 0.10, aEscuro: 0.05, claro: '255,244,214', escuro: '150,90,0' });
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = 'rgba(120,70,0,' + (0.04 + r() * 0.06).toFixed(3) + ')';
      ctx.fillRect(r() * L, r() * A, 1 + r() * 4, 1);
    }
    const cx = L / 2;
    const cy = 1030;
    const R = 372;
    // as ondas: anéis à mão, tremendo, cada vez mais abertos e mais fracos (numa camada que
    // some antes da chama e da marca)
    const aneis = camada();
    ctx = aneis.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 9; i++) {
      const raio = R + 36 + i * (28 + i * 3);
      const amp = 3 + i * 2.2;
      const ondas = 9 + (i % 3);
      const fase = r() * Math.PI * 2;
      ctx.strokeStyle = 'rgba(18,19,15,' + Math.max(0.06, 0.78 - i * 0.07).toFixed(3) + ')';
      ctx.lineWidth = Math.max(1.6, 5 - i * 0.32);
      ctx.beginPath();
      for (let j = 0; j <= 240; j++) {
        const t = j / 240 * Math.PI * 2;
        const rr = raio + Math.sin(t * ondas + fase) * amp + Math.sin(t * 3 + fase * 2) * amp * 0.5;
        const x = cx + Math.cos(t) * rr;
        const y = cy + Math.sin(t) * rr;
        if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'destination-in';
    const mascara = ctx.createLinearGradient(0, 470, 0, 1560);
    mascara.addColorStop(0, 'rgba(0,0,0,0)');
    mascara.addColorStop(0.1, 'rgba(0,0,0,1)');
    mascara.addColorStop(0.88, 'rgba(0,0,0,1)');
    mascara.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mascara;
    ctx.fillRect(0, 0, L, A);
    ctx = tela;
    ctx.drawImage(aneis.c, 0, 0);
    // as letras: a marca da prensa (luz embaixo, sombra em cima) e a tinta gasta
    const letras = letrasNoCirculo(['JESUS', 'SALVA'], R, LP.tinta);
    const { c, ctx: k } = camada();
    k.drawImage(letras, cx - R, cy - R);
    gastar(c, { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R }, { pontos: 2000, manchas: 0, riscos: 0, semente: 1625, forca: 0.3 });
    ctx.save();
    ctx.shadowColor = 'rgba(255,240,200,.55)';
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 2;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }
  function corpoDoControle() {
    const p = new Path2D();
    const metade = [[0, -135], [120, -140, 230, -165, 330, -150], [420, -138, 462, -60, 472, 40], [486, 170, 472, 312, 402, 336],
      [342, 356, 300, 322, 270, 262], [240, 202, 210, 150, 150, 150], [80, 150, 40, 156, 0, 156]];
    p.moveTo(metade[0][0], metade[0][1]);
    for (let i = 1; i < metade.length; i++) p.bezierCurveTo(...metade[i]);
    // a metade esquerda, espelhada, de volta ao começo
    for (let i = metade.length - 1; i >= 1; i--) {
      const [a, b, c, d] = metade[i];
      const ant = metade[i - 1];
      const ex = ant.length === 2 ? ant[0] : ant[4];
      const ey = ant.length === 2 ? ant[1] : ant[5];
      p.bezierCurveTo(-c, d, -a, b, -ex, ey);
    }
    p.closePath();
    return p;
  }
  // Jesus está no controle: a estampa de camiseta. O tecido grafite mesclado (o dono pediu
  // cinza, menos sálvia e amarelo) com a trama e as dobras, e por cima a estampa em
  // serigrafia: o controle com traço de pincel creme (mais grosso no lado da sombra), o
  // amarelo fora de registro, a sombra em retícula vazada (o pano aparece nos pontos),
  // a cruz direcional, quatro botões só de bolinha, os analógicos e a luz do jogador 1. A
  // tinta é gasta, rachada de lavar, e as dobras do pano passam por cima de tudo. JESUS em
  // cima, "está no" à mão e CONTROLE embaixo. Fechamento: o próprio controle.
  function arteControle(ctx) {
    const r = sorteio(1630);
    // a tinta clara da estampa e o "furo": onde a tinta não vai, aparece o pano
    const tinta = '#eee8d3';
    const furo = '#363835';
    // a camiseta grafite mesclada: o cinza com as fibras claras e escuras
    ctx.fillStyle = '#3a3c39';
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 40, { aClaro: 0.05, aEscuro: 0.08, claro: '220,222,215', escuro: '0,0,0' });
    ctx.lineCap = 'round';
    for (let i = 0; i < 26000; i++) {
      const claro = r() < 0.5;
      ctx.strokeStyle = claro ? 'rgba(210,212,205,' + (0.05 + r() * 0.1).toFixed(3) + ')' : 'rgba(10,10,10,' + (0.08 + r() * 0.14).toFixed(3) + ')';
      ctx.lineWidth = 0.8 + r() * 1.2;
      const x = r() * L;
      const y = r() * A;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 3, y + 3 + r() * 6);
      ctx.stroke();
    }
    // a estampa numa camada (para gastar a tinta sem gastar o pano)
    const { c, ctx: k } = camada();
    const cx = L / 2;
    const cy = 985;
    const esc = 0.8;
    k.save();
    k.translate(cx, cy);
    k.rotate(-0.05);
    k.scale(esc, esc);
    const corpo = corpoDoControle();
    // o amarelo, deslocado do preto como serigrafia que mexeu
    k.save();
    k.translate(9, 7);
    for (const lado of [-1, 1]) {
      k.fillStyle = '#eab544';
      retRedondo(k, lado * 250 - 85, -196, 170, 66, 26);
      k.fill();
    }
    k.fillStyle = LP.amarelo;
    k.fill(corpo);
    k.restore();
    // a sombra em retícula, dentro do corpo, mais cheia embaixo e à direita
    k.save();
    k.clip(corpo);
    reticula(k, -520, -220, 520, 380, 13, (x, y) => Math.max(0, (y + 40) / 380 + (x - 100) / 1400) * 0.95, furo);
    k.restore();
    // o traço de pincel: fino no lado da luz, grosso no lado da sombra
    k.strokeStyle = tinta;
    k.lineJoin = 'round';
    k.lineCap = 'round';
    for (const lado of [-1, 1]) {
      k.lineWidth = 7;
      retRedondo(k, lado * 250 - 85, -196, 170, 66, 26);
      k.stroke();
    }
    k.lineWidth = 7;
    k.stroke(corpo);
    k.save();
    k.beginPath();
    k.rect(-600, 40, 1200, 500);
    k.clip();
    k.lineWidth = 17;
    k.stroke(corpo);
    k.restore();
    // a cruz direcional
    k.fillStyle = furo;
    k.save();
    k.translate(-268, -14);
    retRedondo(k, -76, -26, 152, 52, 10);
    k.fill();
    retRedondo(k, -26, -76, 52, 152, 10);
    k.fill();
    k.restore();
    // os botões: anéis de tinta com o miolo creme, um pouco fora do lugar
    [[268, -82], [336, -14], [268, 54], [200, -14]].forEach(([x, y], i) => {
      k.fillStyle = i % 2 ? LP.creme : '#fffaf0';
      k.beginPath();
      k.arc(x + 6, y + 5, 30, 0, Math.PI * 2);
      k.fill();
      k.strokeStyle = furo;
      k.lineWidth = 7;
      k.beginPath();
      k.arc(x, y, 31, 0, Math.PI * 2);
      k.stroke();
    });
    // os analógicos
    for (const lado of [-1, 1]) {
      const x = lado * 124;
      const y = 92;
      k.fillStyle = furo;
      k.beginPath();
      k.arc(x, y, 64, 0, Math.PI * 2);
      k.fill();
      k.strokeStyle = LP.amarelo;
      k.lineWidth = 6;
      k.beginPath();
      k.arc(x + 4, y + 3, 40, Math.PI * 1.05, Math.PI * 1.55);
      k.stroke();
    }
    for (const lado of [-1, 1]) {
      k.fillStyle = furo;
      retRedondo(k, lado * 70 - 28, -64, 56, 18, 9);
      k.fill();
    }
    for (let i = 0; i < 4; i++) {
      k.fillStyle = i === 0 ? tinta : furo;
      k.beginPath();
      k.arc(-42 + i * 28, -8, 8, 0, Math.PI * 2);
      k.fill();
    }
    // o brilho da tinta clara no alto
    k.strokeStyle = '#fffaf0';
    k.lineWidth = 10;
    k.beginPath();
    k.moveTo(-390, -88);
    k.quadraticCurveTo(-330, -130, -220, -136);
    k.stroke();
    k.restore();
    // a frase, na mesma tinta
    const mn = (t) => '800 ' + t + 'px Manrope, sans-serif';
    const tJ = caber(k, 'JESUS', mn, 700, 250, -0.02);
    S.escrever(k, 'JESUS', L / 2, 740, mn(tJ), tinta, { espaco: -tJ * 0.02 });
    k.fillStyle = LP.amarelo;
    aMao(k, 'está no', L / 2, 1316, 74, r, { alinhar: 'center' });
    const tC = caber(k, 'CONTROLE', mn, 840, 210, -0.02);
    S.escrever(k, 'CONTROLE', L / 2, 1340 + tC * 0.74, mn(tC), tinta, { espaco: -tC * 0.02 });
    // a tinta rachada de lavar
    gastar(c, { x: 60, y: 520, w: L - 120, h: 1020 }, { pontos: 11000, manchas: 40, riscos: 260, semente: 1631, forca: 0.7 });
    ctx.drawImage(c, 0, 0);
    // a trama do pano, por cima de tudo
    for (let y = 0; y < A; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,.06)';
      ctx.fillRect(0, y, L, 1.5);
    }
    for (let x = 0; x < L; x += 4) {
      ctx.fillStyle = 'rgba(255,255,255,.025)';
      ctx.fillRect(x, 0, 1.5, A);
    }
    // as dobras: faixas largas de luz e de sombra, macias
    const dobra = camada();
    const d = dobra.ctx;
    d.filter = 'blur(38px)';
    d.lineCap = 'round';
    for (const [x0, y0, x1, y1, w, cor] of [
      [-100, 380, 1180, 760, 90, 'rgba(230,232,225,.13)'], [-100, 470, 1180, 860, 70, 'rgba(0,0,0,.30)'],
      [-80, 1580, 1160, 1180, 110, 'rgba(230,232,225,.11)'], [-80, 1690, 1160, 1290, 80, 'rgba(0,0,0,.28)'],
      [760, -40, 1180, 620, 60, 'rgba(0,0,0,.22)']]) {
      d.strokeStyle = cor;
      d.lineWidth = w;
      d.beginPath();
      d.moveTo(x0, y0);
      d.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 80, x1, y1);
      d.stroke();
    }
    d.filter = 'none';
    ctx.drawImage(dobra.c, 0, 0);
  }
  function vidroDaLampada(r0) {
    const p = new Path2D();
    const a1 = Math.PI * 0.80;
    const a2 = Math.PI * 0.20;
    const gx = r0 * 0.44;
    const gy = r0 * 1.32;
    p.moveTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
    p.arc(0, 0, r0, a1, a2, false);
    p.bezierCurveTo(r0 * 0.66, r0 * 0.98, gx, r0 * 1.06, gx, gy);
    p.lineTo(-gx, gy);
    p.bezierCurveTo(-gx, r0 * 1.06, -r0 * 0.66, r0 * 0.98, Math.cos(a1) * r0, Math.sin(a1) * r0);
    p.closePath();
    return p;
  }
  // Sal e luz do mundo: a lâmpada que é saleiro, deitada de lado no gesto de quem salga, no
  // papel creme, como na arte que o dono mandou. A frase é o próprio desenho do vidro: SAL,
  // E LUZ DO e MUNDO em Oswald, inchando com a curva do vidro até encher a bola (o mesmo mapa
  // do quadrado no círculo de Jesus salva), e não um rótulo colado por cima. O vidro tem a luz
  // acesa no miolo, a sombra da curva por cima das letras e os reflexos; a rosca virou a tampa
  // de metal furada, e o sal cai dela em leque e depois reto, grão por grão. Diferente de Luz
  // do mundo (a lâmpada em traço laranja no marrom): o fundo claro, a letra que é o vidro e o
  // sal. Lema com a referência (Mateus 5.13-14 fala do sal da terra e da luz do mundo).
  // Fechamento: o sal caindo.
  function arteSalLuz(ctx) {
    const r = sorteio(1640);
    fundoPapel(ctx, '#f2ead7', 1640);
    const cx = 470;
    const cy = 880;
    const r0 = 280;
    const giro = -0.78;
    // a luz da lâmpada no papel
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 720);
    halo.addColorStop(0, 'rgba(255,200,90,.42)');
    halo.addColorStop(0.45, 'rgba(255,200,90,.14)');
    halo.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, L, A);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(giro);
    const vidro = vidroDaLampada(r0);
    // o vidro aceso, com a sombra macia no papel
    const gv = ctx.createRadialGradient(-r0 * 0.18, -r0 * 0.22, 0, 0, r0 * 0.15, r0 * 1.45);
    gv.addColorStop(0, '#fff7df');
    gv.addColorStop(0.4, '#ffdc84');
    gv.addColorStop(0.8, '#ffc44d');
    gv.addColorStop(1, '#eca337');
    ctx.save();
    ctx.shadowColor = 'rgba(110,80,20,.28)';
    ctx.shadowBlur = 46;
    ctx.shadowOffsetX = 26;
    ctx.shadowOffsetY = 34;
    ctx.fillStyle = gv;
    ctx.fill(vidro);
    ctx.restore();
    // a frase, inchada até encher a bola do vidro
    const R = r0 * 0.83;
    const letras = letrasNoCirculo(['SAL', 'E LUZ DO', 'MUNDO'], R, LP.tinta, { fonte: '700 200px Oswald, sans-serif', pesos: [1.1, 0.62, 1.05], larguras: [1, 0.86, 1] });
    ctx.save();
    ctx.clip(vidro);
    // as letras ficam de pé (só levemente tortas), mesmo com a lâmpada deitada
    ctx.save();
    ctx.rotate(-giro - 0.1);
    ctx.translate(-r0 * 0.04, -r0 * 0.04);
    const pincel = camada();
    pincel.ctx.drawImage(letras, L / 2 - R, A / 2 - R);
    gastar(pincel.c, { x: L / 2 - R, y: A / 2 - R, w: 2 * R, h: 2 * R }, { pontos: 1400, manchas: 0, riscos: 0, semente: 1641, forca: 0.35 });
    ctx.drawImage(pincel.c, -L / 2, -A / 2);
    ctx.restore();
    // a curva do vidro por cima das letras: a borda mais funda e o miolo aceso
    const curva = ctx.createRadialGradient(-r0 * 0.15, -r0 * 0.2, r0 * 0.3, 0, 0, r0 * 1.15);
    curva.addColorStop(0, 'rgba(255,250,230,.18)');
    curva.addColorStop(0.6, 'rgba(255,250,230,0)');
    curva.addColorStop(1, 'rgba(170,100,10,.35)');
    ctx.fillStyle = curva;
    ctx.fillRect(-r0 * 1.5, -r0 * 1.5, r0 * 3, r0 * 3.2);
    // os reflexos da janela no vidro, por cima de tudo
    ctx.filter = 'blur(5px)';
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(0, 0, r0 * 0.84, Math.PI * 1.12, Math.PI * 1.36);
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(0, 0, r0 * 0.84, Math.PI * 1.43, Math.PI * 1.5);
    ctx.stroke();
    ctx.filter = 'none';
    ctx.restore();
    // o contorno à mão, de pincel: cheio e uma segunda passada fina
    ctx.lineJoin = 'round';
    ctx.strokeStyle = LP.tinta;
    ctx.lineWidth = 7;
    ctx.stroke(vidro);
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2.5;
    ctx.translate(4, 3);
    ctx.stroke(vidro);
    ctx.restore();
    // a tampa de metal do saleiro, no lugar da rosca
    const gy = r0 * 1.32;
    const tw = r0 * 0.5;
    const th = r0 * 0.5;
    const metal = ctx.createLinearGradient(-tw, 0, tw, 0);
    metal.addColorStop(0, '#5b5f58');
    metal.addColorStop(0.2, '#9fa39a');
    metal.addColorStop(0.36, '#f2f3ec');
    metal.addColorStop(0.5, '#c2c5bc');
    metal.addColorStop(0.78, '#7b7f76');
    metal.addColorStop(1, '#4a4d47');
    ctx.fillStyle = metal;
    retRedondo(ctx, -tw, gy - 6, tw * 2, th, 12);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.stroke();
    for (let i = 1; i < 4; i++) {
      const y = gy - 6 + i * th / 4;
      ctx.strokeStyle = 'rgba(18,19,15,.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-tw + 3, y);
      ctx.quadraticCurveTo(0, y + 10, tw - 3, y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-tw + 3, y + 3);
      ctx.quadraticCurveTo(0, y + 13, tw - 3, y + 3);
      ctx.stroke();
    }
    const fy = gy - 6 + th;
    const fundoTampa = ctx.createLinearGradient(-tw, 0, tw, 0);
    fundoTampa.addColorStop(0, '#6a6e66');
    fundoTampa.addColorStop(0.4, '#d6d9d0');
    fundoTampa.addColorStop(1, '#575a54');
    ctx.fillStyle = fundoTampa;
    ctx.beginPath();
    ctx.ellipse(0, fy, tw, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = LP.tinta;
    ctx.lineWidth = 4;
    ctx.stroke();
    for (const [hx, hy] of [[-60, -6], [-20, -10], [20, -10], [60, -6], [-40, 8], [0, 6], [40, 8], [-80, 2], [80, 2]]) {
      ctx.fillStyle = '#121310';
      ctx.beginPath();
      ctx.ellipse(hx, fy + hy, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const saida = [-Math.sin(giro) * (fy + 14), Math.cos(giro) * (fy + 14)];
    const dir = [-Math.sin(giro), Math.cos(giro)];
    ctx.restore();
    // o sal: sai da tampa em leque, na direção dela, e cai reto, abrindo e sumindo
    const sx = cx + saida[0];
    const sy = cy + saida[1];
    for (let i = 0; i < 1300; i++) {
      const t = Math.pow(r(), 1.1);
      const lado = (r() + r() + r() - 1.5) / 1.5;
      const x = sx + dir[0] * 90 * Math.sqrt(t) + lado * (14 + t * 150);
      const y = sy + dir[1] * 40 * Math.sqrt(t) + t * (1520 - sy) + lado * 12;
      if (y > 1530) continue;
      const a = (1 - t * 0.55) * (0.5 + r() * 0.5);
      const s = 2 + r() * 4.6 * (1 - t * 0.3);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * Math.PI);
      ctx.fillStyle = 'rgba(70,68,60,' + (a * 0.85).toFixed(3) + ')';
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.fillStyle = 'rgba(255,255,250,' + (a * 0.9).toFixed(3) + ')';
      ctx.fillRect(-s / 2, -s / 2, s * 0.55, s * 0.55);
      ctx.restore();
    }
    referencia(ctx, 'Mateus 5.13-14', 90, 1490, 30, '#5c5a52', 'left');
  }
  // Que haja Deus em tudo o que for meu: o papel de cartão sálvia, quase vazio, com uma
  // etiqueta de papel creme amarrada no barbante que desce do alto, a sombra da etiqueta e
  // do barbante no papel, e na etiqueta só uma cruz carimbada. A frase pequena, em Oswald
  // condensada, no alto à esquerda: a etiqueta diz de quem é. Fechamento: a etiqueta.
  function barbante(ctx, pts, r, cor = '#e7dcc0') {
    // a linha torcida: o traço claro e os gomos escuros em diagonal por cima
    const caminho = new Path2D();
    caminho.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) caminho.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    caminho.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cor;
    ctx.lineWidth = 6;
    ctx.stroke(caminho);
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = 'rgba(120,100,60,.55)';
    ctx.lineWidth = 6;
    ctx.stroke(caminho);
    ctx.setLineDash([]);
    ctx.restore();
    return caminho;
  }
  function arteMeu(ctx) {
    const r = sorteio(1645);
    // o cartão sálvia com fibras e a luz da janela no alto à direita
    ctx.fillStyle = '#c4d589';
    ctx.fillRect(0, 0, L, A);
    const luz = ctx.createRadialGradient(L * 0.85, 260, 0, L * 0.85, 260, 1500);
    luz.addColorStop(0, 'rgba(245,252,220,.38)');
    luz.addColorStop(1, 'rgba(245,252,220,0)');
    ctx.fillStyle = luz;
    ctx.fillRect(0, 0, L, A);
    const canto = ctx.createLinearGradient(0, A, L * 0.4, A * 0.6);
    canto.addColorStop(0, 'rgba(60,72,25,.18)');
    canto.addColorStop(1, 'rgba(60,72,25,0)');
    ctx.fillStyle = canto;
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 30, { aClaro: 0.07, aEscuro: 0.04, claro: '250,255,235', escuro: '60,72,25' });
    for (let i = 0; i < 700; i++) {
      ctx.strokeStyle = 'rgba(60,72,25,' + (0.05 + r() * 0.08).toFixed(3) + ')';
      ctx.lineWidth = 0.7 + r() * 0.8;
      const x = r() * L;
      const y = r() * A;
      const a = r() * Math.PI;
      const c = 5 + r() * 16;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * c * 0.5 + r() * 3, y + Math.sin(a) * c * 0.5 + r() * 3, x + Math.cos(a) * c, y + Math.sin(a) * c);
      ctx.stroke();
    }
    // a frase, pequena, no alto à esquerda
    const tinta = LP.tinta;
    ['QUE HAJA DEUS', 'EM TUDO O QUE', 'FOR MEU.'].forEach((l, i) => S.escrever(ctx, l, 104, 640 + i * 62, oswaldLP(52, 600), tinta, { alinhar: 'left', espaco: 5 }));
    // a etiqueta: girada, com o furo reforçado no alto
    const tx = 676;
    const ty = 1150;
    const tg = 0.2;
    const tw = 270;
    const th = 470;
    const local = (x, y) => [tx + x * Math.cos(tg) - y * Math.sin(tg), ty + x * Math.sin(tg) + y * Math.cos(tg)];
    const furo = local(0, -th / 2 + 52);
    // o barbante desce do alto, faz a laçada no furo e sobra uma ponta
    const fioPts = [[1000, -20], [930, 340], [840, 640], furo];
    const pontaPts = [furo, [furo[0] - 46, furo[1] - 34], [furo[0] - 104, furo[1] - 50], [furo[0] - 156, furo[1] - 22]];
    // as sombras no papel, macias e deslocadas para baixo e à esquerda
    ctx.save();
    ctx.filter = 'blur(9px)';
    ctx.translate(-16, 26);
    ctx.strokeStyle = 'rgba(40,50,15,.35)';
    ctx.lineWidth = 6;
    for (const pts of [fioPts, pontaPts]) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    ctx.restore();
    const forma = new Path2D();
    forma.moveTo(-tw / 2 + 60, -th / 2);
    forma.lineTo(tw / 2 - 60, -th / 2);
    forma.lineTo(tw / 2, -th / 2 + 70);
    forma.lineTo(tw / 2, th / 2);
    forma.lineTo(-tw / 2, th / 2);
    forma.lineTo(-tw / 2, -th / 2 + 70);
    forma.closePath();
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(tg);
    ctx.save();
    ctx.shadowColor = 'rgba(40,50,15,.42)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = -14;
    ctx.shadowOffsetY = 24;
    ctx.fillStyle = '#f3eedb';
    ctx.fill(forma);
    ctx.restore();
    ctx.save();
    ctx.clip(forma);
    // o papel da etiqueta: uma dobrinha de luz e as fibras
    const gt = ctx.createLinearGradient(-tw / 2, 0, tw / 2, 0);
    gt.addColorStop(0, 'rgba(0,0,0,.06)');
    gt.addColorStop(0.6, 'rgba(255,255,255,.08)');
    gt.addColorStop(1, 'rgba(0,0,0,.08)');
    ctx.fillStyle = gt;
    ctx.fillRect(-tw / 2, -th / 2, tw, th);
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = 'rgba(120,100,60,' + (0.05 + r() * 0.08).toFixed(3) + ')';
      ctx.fillRect(-tw / 2 + r() * tw, -th / 2 + r() * th, 1 + r() * 4, 1);
    }
    ctx.restore();
    // o reforço do furo
    ctx.fillStyle = '#e2d39d';
    ctx.beginPath();
    ctx.arc(0, -th / 2 + 52, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c4d589';
    ctx.beginPath();
    ctx.arc(0, -th / 2 + 52, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,60,20,.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // a cruz carimbada, com a tinta falhando
    const carimbo = camada();
    const k = carimbo.ctx;
    k.translate(tx, ty);
    k.rotate(tg + 0.03);
    k.fillStyle = tinta;
    k.fillRect(-11, -40, 22, 200);
    k.fillRect(-62, 12, 124, 22);
    k.setTransform(1, 0, 0, 1, 0, 0);
    gastar(carimbo.c, { x: tx - 150, y: ty - 100, w: 300, h: 330 }, { pontos: 700, manchas: 8, riscos: 0, semente: 1646, forca: 0.7 });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.drawImage(carimbo.c, 0, 0);
    ctx.restore();
    // o barbante por cima de tudo
    barbante(ctx, fioPts, r);
    barbante(ctx, pontaPts, r);
  }
  // Deus tem um plano para você: DEUS gigante, deitado de lado, ocupando a altura do story,
  // impresso em tipografia no papel de algodão: a tinta grafite assentada no papel, que
  // afunda um pouco (a luz rasante mostra a borda), com o grão da tinta. "tem um plano para
  // você." pequeno, escondido na barriga do D. Quem passa vê a palavra; quem para acha o
  // resto. Fechamento: nenhum, só o texto escondido.
  function artePlano(ctx) {
    const r = sorteio(1650);
    fundoPapel(ctx, '#e8e3d9', 1650);
    // a luz rasante da janela, da esquerda
    const raso = ctx.createLinearGradient(0, 0, L, A * 0.3);
    raso.addColorStop(0, 'rgba(255,253,245,.35)');
    raso.addColorStop(0.6, 'rgba(255,253,245,0)');
    raso.addColorStop(1, 'rgba(60,50,35,.10)');
    ctx.fillStyle = raso;
    ctx.fillRect(0, 0, L, A);
    const mn = (t) => '800 ' + t + 'px Manrope, sans-serif';
    ctx.font = mn(100);
    const m = ctx.measureText('DEUS');
    const w100 = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    const h100 = m.actualBoundingBoxAscent;
    const y0 = 556;
    const y1 = 1500;
    const largura = 720;
    const sx = (y1 - y0) / w100;
    const sy = largura / h100;
    const palavra = (k, cor) => {
      k.save();
      k.translate(L / 2 + largura / 2, y0);
      k.rotate(Math.PI / 2);
      k.scale(sx, sy);
      k.fillStyle = cor;
      k.textAlign = 'left';
      k.textBaseline = 'alphabetic';
      k.fillText('DEUS', m.actualBoundingBoxLeft, h100);
      k.restore();
    };
    // a impressão: a borda clara embaixo (o papel que subiu) e a sombra em cima
    const { c, ctx: k } = camada();
    k.font = mn(100);
    palavra(k, '#34352f');
    gastar(c, { x: 150, y: 520, w: 780, h: 1020 }, { pontos: 5000, manchas: 0, riscos: 0, semente: 1651, forca: 0.2 });
    // a tinta mais carregada nas bordas (o que a prensa faz)
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,250,.75)';
    ctx.shadowOffsetX = -3;
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur = 3;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.shadowColor = 'rgba(40,35,25,.35)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = -2;
    ctx.shadowBlur = 4;
    ctx.globalAlpha = 0.25;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
    // as linhas de construção do desenho das letras, finas, como quem planejou cada uma:
    // a base e o alto das letras, os limites de cada letra e os círculos das curvas
    ctx.save();
    ctx.strokeStyle = 'rgba(52,53,47,.26)';
    ctx.lineWidth = 1.6;
    const xBase = L / 2 + largura / 2;
    const xAlto = L / 2 - largura / 2;
    for (const x of [xBase, xAlto]) {
      ctx.beginPath();
      ctx.moveTo(x, 500);
      ctx.lineTo(x, 1556);
      ctx.stroke();
    }
    ctx.font = mn(100);
    const limites = ['', 'D', 'DE', 'DEU', 'DEUS'].map((t) => y0 + (t ? ctx.measureText(t).width : 0) * sx);
    for (const y of limites) {
      ctx.beginPath();
      ctx.moveTo(110, y);
      ctx.lineTo(L - 110, y);
      ctx.stroke();
    }
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.ellipse(L / 2, limites[1] - (limites[1] - limites[0]) * 0.5, largura * 0.5, (limites[1] - limites[0]) * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(L / 2, (limites[3] + limites[4]) / 2, largura * 0.5, (limites[4] - limites[3]) * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // as marcas de medida no pé, como num projeto
    for (const y of limites) {
      ctx.beginPath();
      ctx.moveTo(L - 140, y - 10);
      ctx.lineTo(L - 120, y + 10);
      ctx.stroke();
    }
    ctx.restore();
    // a barriga do D: o meio da primeira letra
    ctx.font = mn(100);
    const mD = ctx.measureText('D');
    const wD = (mD.actualBoundingBoxLeft + mD.actualBoundingBoxRight) * sx;
    const yD = y0 + wD * 0.47 + 12;
    S.escrever(ctx, 'tem um plano para você.', L / 2 - 4, yD, '700 33px Manrope, sans-serif', LP.tinta);
    void r;
  }
  // Peça a Deus. Confie em Deus. Agradeça a Deus.: o adesivo de vinil de um cubo em
  // perspectiva isométrica, colado na capa amarela de um caderno, com a borda de corte creme,
  // a espessura e a sombra do adesivo, o brilho do vinil e uma ponta descolando. Uma frase
  // em cada face, em Oswald creme, deitada na face dela; as faces com a luz de cima.
  // Fechamento: a ponta que descola.
  function arteCubo(ctx) {
    const r = sorteio(1655);
    // a capa do caderno: amarelo com textura de cartão e a luz vindo de cima
    const g = ctx.createLinearGradient(0, 0, 0, A);
    g.addColorStop(0, '#ffcd5c');
    g.addColorStop(1, '#efad35');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 40, { aClaro: 0.09, aEscuro: 0.05, claro: '255,245,215', escuro: '140,80,0' });
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = r() < 0.6 ? 'rgba(130,80,0,' + (0.05 + r() * 0.1).toFixed(3) + ')' : 'rgba(255,248,225,' + (0.12 + r() * 0.2).toFixed(3) + ')';
      ctx.fillRect(r() * L, r() * A, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    const a = 380;
    const c = Math.cos(Math.PI / 6);
    const s = 0.5;
    const soma = (...v) => v.reduce((t, x) => [t[0] + x[0], t[1] + x[1]], [0, 0]);
    const P0 = [0, 0];
    const Lv = [-c * a, -s * a];
    const Rv = [c * a, -s * a];
    const D = [0, a];
    // o contorno do adesivo: o hexágono com a margem de corte e os cantos redondos
    const hexa = [soma(Lv, Rv), soma(Rv), soma(Rv, D), soma(D), soma(Lv, D), soma(Lv)];
    const margem = 46;
    const contorno = [];
    hexa.forEach(([x, y]) => {
      const n = Math.hypot(x, y);
      contorno.push([x + x / n * margem * 1.12, y + y / n * margem * 1.12]);
    });
    const raio = 40;
    const forma = new Path2D();
    contorno.forEach((p, i) => {
      const ant = contorno[(i + 5) % 6];
      const prox = contorno[(i + 1) % 6];
      const de = [p[0] + (ant[0] - p[0]) * raio / Math.hypot(ant[0] - p[0], ant[1] - p[1]), p[1] + (ant[1] - p[1]) * raio / Math.hypot(ant[0] - p[0], ant[1] - p[1])];
      const ate = [p[0] + (prox[0] - p[0]) * raio / Math.hypot(prox[0] - p[0], prox[1] - p[1]), p[1] + (prox[1] - p[1]) * raio / Math.hypot(prox[0] - p[0], prox[1] - p[1])];
      if (i) forma.lineTo(de[0], de[1]); else forma.moveTo(de[0], de[1]);
      forma.quadraticCurveTo(p[0], p[1], ate[0], ate[1]);
    });
    forma.closePath();
    // a ponta que descola: o canto de baixo à direita (o vértice 2 do contorno)
    const C = contorno[2];
    const A1 = [C[0] + (contorno[1][0] - C[0]) * 0.17, C[1] + (contorno[1][1] - C[1]) * 0.17];
    const B1 = [C[0] + (contorno[3][0] - C[0]) * 0.17, C[1] + (contorno[3][1] - C[1]) * 0.17];
    // o canto refletido na linha da dobra (A1-B1): o verso do adesivo virado
    const ux = B1[0] - A1[0];
    const uy = B1[1] - A1[1];
    const un = Math.hypot(ux, uy);
    const tx = ux / un;
    const ty = uy / un;
    const vx = C[0] - A1[0];
    const vy = C[1] - A1[1];
    const proj = vx * tx + vy * ty;
    const Cr = [A1[0] + 2 * proj * tx - vx, A1[1] + 2 * proj * ty - vy];
    const semCanto = new Path2D();
    semCanto.rect(-2000, -2000, 4000, 4000);
    semCanto.moveTo(A1[0], A1[1]);
    semCanto.lineTo(C[0] + (C[0] - A1[0]) * 0.2 + (C[0] - B1[0]) * 0.2, C[1] + (C[1] - A1[1]) * 0.2 + (C[1] - B1[1]) * 0.2);
    semCanto.lineTo(B1[0], B1[1]);
    semCanto.closePath();
    ctx.save();
    ctx.translate(L / 2, 1030);
    ctx.rotate(-0.1);
    ctx.save();
    ctx.clip(semCanto, 'evenodd');
    // a sombra e a espessura do adesivo
    ctx.save();
    ctx.shadowColor = 'rgba(110,60,0,.45)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#d9d2bc';
    ctx.fill(forma);
    ctx.restore();
    ctx.save();
    ctx.translate(0, -3);
    ctx.fillStyle = '#fbf8ec';
    ctx.fill(forma);
    // as faces: [origem, eixo x, eixo y, cor de cima, cor de baixo, linhas]
    const faces = [
      [Lv, [c, s], [0, 1], '#1a1b17', '#0d0e0b', ['PEÇA A', 'DEUS']],
      [Lv, [c, -s], [c, s], '#34352f', '#24251f', ['CONFIE', 'EM DEUS']],
      [P0, [c, -s], [0, 1], '#26271f', '#15160f', ['AGRADEÇA', 'A DEUS']],
    ];
    const vao = 6;
    for (const [o, ex, ey, c1, c2, linhas] of faces) {
      ctx.save();
      ctx.transform(ex[0], ex[1], ey[0], ey[1], o[0], o[1]);
      const gf = ctx.createLinearGradient(0, 0, a * 0.3, a);
      gf.addColorStop(0, c1);
      gf.addColorStop(1, c2);
      ctx.fillStyle = gf;
      retRedondo(ctx, vao, vao, a - 2 * vao, a - 2 * vao, 26);
      ctx.fill();
      const largura = a * 0.8;
      const tams = linhas.map((l) => caber(ctx, l, (t) => oswaldLP(t, 700), largura, 400));
      const caps = tams.map((t) => { ctx.font = oswaldLP(t, 700); return ctx.measureText('H').actualBoundingBoxAscent; });
      const entre = a * 0.06;
      const total = caps.reduce((x, y) => x + y, 0) + entre * (linhas.length - 1);
      const k = Math.min(1, (a * 0.78) / total);
      ctx.translate(a / 2, a / 2 - total * k / 2);
      ctx.scale(1, k);
      let y = 0;
      linhas.forEach((l, i) => {
        y += caps[i];
        S.escrever(ctx, l, 0, y, oswaldLP(tams[i], 700), '#f6f2e2');
        y += entre;
      });
      ctx.restore();
    }
    // o brilho do vinil: uma faixa larga e fraca na diagonal
    ctx.save();
    ctx.clip(forma);
    const brilho = ctx.createLinearGradient(-500, -500, 500, 500);
    brilho.addColorStop(0, 'rgba(255,255,255,0)');
    brilho.addColorStop(0.36, 'rgba(255,255,255,0)');
    brilho.addColorStop(0.42, 'rgba(255,255,255,.16)');
    brilho.addColorStop(0.5, 'rgba(255,255,255,.04)');
    brilho.addColorStop(0.56, 'rgba(255,255,255,0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(-600, -600, 1200, 1200);
    ctx.restore();
    ctx.restore();
    ctx.restore();
    // a ponta virada: o verso do adesivo, com a sombra que ela faz por baixo
    ctx.save();
    ctx.shadowColor = 'rgba(110,60,0,.4)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = -4;
    ctx.shadowOffsetY = 10;
    const verso = ctx.createLinearGradient(A1[0], A1[1], Cr[0], Cr[1]);
    verso.addColorStop(0, '#d7d1c0');
    verso.addColorStop(0.5, '#f4f1e7');
    verso.addColorStop(1, '#e6e1d2');
    ctx.fillStyle = verso;
    ctx.beginPath();
    ctx.moveTo(A1[0], A1[1] - 3);
    ctx.quadraticCurveTo((A1[0] + B1[0]) / 2 + (Cr[0] - C[0]) * 0.1, (A1[1] + B1[1]) / 2 - 3, B1[0], B1[1] - 3);
    ctx.lineTo(Cr[0], Cr[1] - 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // ---------- décima leva (rodada 17): oito frases novas do dono (2026-10-11) ----------
  // RODADA17
  // Jesus, meu super-herói: como a referência do dono, Jesus de costas, em pé, com a capa
  // vermelha comprida até o chão, no papel claro, sobre uma pincelada de tinta escura que faz
  // o chão. Por cima da capa só a nuca, o cabelo comprido e os ombros; nada de rosto. A capa
  // é pintada pixel a pixel: as pregas que nascem abaixo das omoplatas e abrem até a barra, a
  // luz da esquerda, os ombros arredondados, a barra ondulando no chão e o rastro do pincel.
  // JESUS enorme em Oswald pesada e gasta, MEU SUPER-HERÓI embaixo em caixa alta pequena e
  // espaçada. A figura humana (de costas) e o vermelho da capa são exceções pedidas pelo dono
  // só nesta arte. Fechamento: a capa no chão de tinta.
  // Mistura duas cores [r, g, b] (t de 0 a 1).
  function misturaCor(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  // A cor de um degradê de várias paradas [[t, [r, g, b]], ...] no ponto t.
  function corNaRampa(rampa, t) {
    if (t <= rampa[0][0]) return rampa[0][1];
    for (let i = 1; i < rampa.length; i++) {
      if (t <= rampa[i][0]) return misturaCor(rampa[i - 1][1], rampa[i][1], (t - rampa[i - 1][0]) / (rampa[i][0] - rampa[i - 1][0]));
    }
    return rampa[rampa.length - 1][1];
  }
  const suave01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // A pincelada de tinta do chão: muitas cerdas de um pincel seco, mais grossa no meio, que
  // falham e se abrem nas pontas, e os respingos.
  function pinceladaDeChao(ctx, x0, x1, y, grossura, r, cor) {
    ctx.save();
    ctx.strokeStyle = cor;
    ctx.fillStyle = cor;
    ctx.lineCap = 'round';
    const comp = x1 - x0;
    for (let i = 0; i < 150; i++) {
      const v = (r() - 0.5) * 2;
      // cada cerda começa e acaba num ponto um pouco diferente; as de fora são mais curtas
      const fora = Math.abs(v);
      const a = x0 + comp * (0.02 + r() * 0.1 + fora * 0.12);
      const b = x1 - comp * (0.02 + r() * 0.12 + fora * 0.14);
      const yy = y + v * grossura * 0.5;
      const w = 1.4 + r() * 3.6;
      ctx.globalAlpha = 0.55 + r() * 0.45;
      ctx.lineWidth = w;
      // a cerda falha: pedaços com buracos, mais buracos perto das pontas
      let x = a;
      while (x < b) {
        const t = (x - x0) / comp;
        const perto = Math.min(t, 1 - t);
        const pedaco = 20 + r() * 120 * Math.min(1, perto * 5);
        const xe = Math.min(b, x + pedaco);
        const curva = Math.sin(t * Math.PI) * -grossura * 0.12;
        ctx.beginPath();
        ctx.moveTo(x, yy + curva + (r() - 0.5) * 1.2);
        ctx.lineTo(xe, yy + Math.sin(((xe - x0) / comp) * Math.PI) * -grossura * 0.12 + (r() - 0.5) * 1.2);
        ctx.stroke();
        x = xe + (r() < 0.6 - perto ? 3 + r() * 16 : 0.5);
      }
    }
    // o corpo da tinta, mais cheio no meio
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, y - grossura * 0.06, comp * 0.34, grossura * 0.32, 0, 0, Math.PI * 2);
    ctx.filter = 'blur(2px)';
    ctx.fill();
    ctx.filter = 'none';
    // respingos
    for (let i = 0; i < 46; i++) {
      const lado = r() < 0.5 ? x0 : x1;
      const x = lado + (r() - 0.5) * comp * 0.3;
      const yy = y + (r() - 0.5) * grossura * 2.6;
      ctx.globalAlpha = 0.6 + r() * 0.4;
      ctx.beginPath();
      ctx.arc(x, yy, 0.8 + r() * r() * 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // A capa: cada pixel com a cor da prega em que cai. pescoco é a altura do colarinho, chao a
  // da barra. O perfil (meia largura por altura) desce em rampa suave do pescoço até o ombro,
  // arredonda no deltoide e cai quase reto, abrindo no fim, onde arrasta no chão.
  function capaVermelha(cx, pescoco, chao, semente) {
    const r = sorteio(semente);
    const { c, ctx: k } = camada();
    const perfil = curvaSuave([[24, 0], [44, 8], [70, 20], [92, 32], [106, 46], [113, 64], [115, 84], [117, 110]], false, 16).pts;
    const ombro = pescoco + 84;
    const meia = (y) => {
      const dy = y - pescoco;
      if (dy < 0) return 0;
      if (dy <= 110) {
        for (let i = 1; i < perfil.length; i++) {
          if (perfil[i][1] >= dy) {
            const a = perfil[i - 1];
            const b = perfil[i];
            return a[0] + (b[0] - a[0]) * (dy - a[1]) / Math.max(0.001, b[1] - a[1]);
          }
        }
      }
      const s = (dy - 110) / (chao - pescoco - 110);
      return 117 + s * 38 + 50 * Math.pow(Math.max(0, (s - 0.68) / 0.32), 2);
    };
    const x0 = Math.floor(cx - 240);
    const x1 = Math.ceil(cx + 240);
    const y0 = Math.floor(pescoco - 2);
    const y1 = Math.ceil(chao + 24);
    const W = x1 - x0;
    const H = y1 - y0;
    const img = k.createImageData(W, H);
    const d = img.data;
    const rampa = [[0, [38, 5, 7]], [0.2, [86, 11, 13]], [0.42, [142, 20, 21]], [0.62, [186, 34, 29]], [0.8, [214, 60, 46]], [1, [242, 126, 98]]];
    const f = Array.from({ length: 6 }, () => r() * Math.PI * 2);
    for (let py = 0; py < H; py++) {
      const y = y0 + py;
      const m = meia(y);
      if (m <= 0) continue;
      const s = Math.max(0, (y - ombro) / (chao - ombro));
      // as pregas nascem embaixo das omoplatas e ficam mais fundas até a barra
      const fundo = suave01(ombro + 30, ombro + 300, y);
      const alto = 1 - suave01(pescoco, ombro + 160, y);
      for (let px = 0; px < W; px++) {
        const x = x0 + px;
        const u = (x - cx) / m;
        if (Math.abs(u) > 1.02) continue;
        const t = (u + 1) / 2;
        const fi = t * Math.PI * 2 * (2.6 + 2.4 * s) + Math.sin(s * 2.6 + f[0]) * 0.8 + Math.sin(t * 4.3 + f[1]) * 1.2 + Math.sin(t * 9.1 + f[2]) * 0.35;
        const cfi = Math.cos(fi);
        // a crista mais estreita que o vale (o pano dobra e a luz pega a quina)
        const dobra = cfi > 0 ? Math.pow(cfi, 1.6) : -Math.pow(-cfi, 0.6);
        const barra = chao + 8 * cfi * fundo + 3 * Math.sin(t * 17 + f[3]);
        if (y > barra + 1) continue;
        const a = Math.min(1, (1.02 - Math.abs(u)) * m * 0.5) * Math.min(1, (barra + 1 - y) * 0.8);
        if (a <= 0) continue;
        let luz = 0.58;
        luz += (0.3 * dobra + 0.05 * Math.sin(fi * 2 + 1)) * (0.12 + 0.88 * fundo);
        // as beiradas viram para longe e a luz vem da esquerda
        luz -= 0.44 * Math.pow(Math.abs(u), 2.6);
        luz -= 0.13 * u;
        // em cima a capa veste as costas: o volume dos ombros e das omoplatas, com o brilho
        // no alto do ombro esquerdo e a sombra no vão do meio, sumindo suave para baixo
        const omo = Math.exp(-Math.pow((Math.abs(u) - 0.55) / 0.3, 2));
        luz += alto * (0.14 * omo * (u < 0 ? 1.2 : 0.6) - 0.08 * Math.exp(-Math.pow(u / 0.12, 2)));
        const topoOmbro = Math.exp(-Math.pow((y - pescoco - 36) / 30, 2));
        luz += 0.14 * topoOmbro * (u < 0 ? 1 : 0.35);
        // mais escuro embaixo e na volta da barra no chão
        luz -= 0.12 * s;
        if (barra - y < 10) luz -= 0.22 * (1 - (barra - y) / 10);
        // o rastro do pincel: estrias que correm com a prega e o grão
        luz += 0.03 * Math.sin(x * 0.9 + Math.sin(y * 0.02 + t * 6) * 4) * Math.sin(x * 0.23 + y * 0.003) + (r() - 0.5) * 0.04;
        const cor = corNaRampa(rampa, Math.max(0, Math.min(1, luz)));
        const j = (py * W + px) * 4;
        d[j] = cor[0];
        d[j + 1] = cor[1];
        d[j + 2] = cor[2];
        d[j + 3] = a * 255;
      }
    }
    k.putImageData(img, x0, y0);
    return { c, meia, ombro };
  }
  // A cabeça de costas: o crânio redondo e o cabelo comprido, escuro, que acompanha a curva
  // da cabeça, afina na nuca e cai em mechas até os ombros, com o brilho em cima à esquerda.
  function cabeloDeCostas(ctx, cx, topo, base, r) {
    const h = base - topo;
    const p = curvaSuave([
      [cx + 2, topo], [cx + 25, topo + h * 0.06], [cx + 38, topo + h * 0.25], [cx + 38, topo + h * 0.45], [cx + 32, topo + h * 0.62],
      [cx + 31, topo + h * 0.78], [cx + 37, base - 12], [cx + 42, base], [cx + 33, base - 2], [cx + 25, base + 4], [cx + 15, base - 1],
      [cx + 5, base + 5], [cx - 6, base], [cx - 16, base + 4], [cx - 25, base - 1], [cx - 33, base + 2], [cx - 34, base - 12],
      [cx - 29, topo + h * 0.78], [cx - 30, topo + h * 0.62], [cx - 36, topo + h * 0.45], [cx - 36, topo + h * 0.25], [cx - 23, topo + h * 0.06],
    ]);
    // a sombra do cabelo na capa
    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.globalAlpha = 0.45;
    ctx.translate(6, 8);
    ctx.fillStyle = '#1a0606';
    ctx.fill(p.p);
    ctx.restore();
    ctx.save();
    const g = ctx.createLinearGradient(cx - 40, topo, cx + 40, base);
    g.addColorStop(0, '#4a3324');
    g.addColorStop(0.5, '#2a1c13');
    g.addColorStop(1, '#140d09');
    ctx.fillStyle = g;
    ctx.fill(p.p);
    ctx.clip(p.p);
    // o brilho do alto da cabeça
    const b = ctx.createRadialGradient(cx - 14, topo + h * 0.26, 2, cx - 14, topo + h * 0.26, 36);
    b.addColorStop(0, 'rgba(160,120,86,.55)');
    b.addColorStop(1, 'rgba(160,120,86,0)');
    ctx.fillStyle = b;
    ctx.fillRect(cx - 60, topo - 10, 120, 90);
    // as mechas: saem do redemoinho no alto, contornam o crânio e descem; umas mais claras
    // (pegando a luz da esquerda), outras escuras nos vãos entre elas
    ctx.lineCap = 'round';
    const crx = cx + 4;
    const cry = topo + h * 0.2;
    // as de cima: do redemoinho até a beira do alto da cabeça, curtas, girando
    for (let i = 0; i < 90; i++) {
      const ang = -Math.PI * (0.08 + 0.84 * r());
      const R = 34 + r() * 6;
      const xe = cx + Math.cos(ang) * R * 1.05;
      const ye = topo + h * 0.3 + Math.sin(ang) * h * 0.34;
      const claro = r() < 0.5 && Math.cos(ang) < 0.3;
      ctx.strokeStyle = claro ? 'rgba(170,128,92,' + (0.2 + r() * 0.3).toFixed(2) + ')' : 'rgba(6,3,2,' + (0.2 + r() * 0.3).toFixed(2) + ')';
      ctx.lineWidth = 0.6 + r() * 1.2;
      ctx.beginPath();
      ctx.moveTo(crx + (r() - 0.5) * 3, cry + (r() - 0.5) * 3);
      ctx.quadraticCurveTo(crx + Math.cos(ang + 0.6) * R * 0.6, cry + Math.sin(ang + 0.6) * R * 0.5, xe, ye);
      ctx.stroke();
    }
    // as de baixo: do redemoinho, contornando o crânio, até as pontas nos ombros
    for (let i = 0; i < 230; i++) {
      const v = (r() - 0.5) * 2;
      const lado = Math.sign(v) || 1;
      const xb = cx + v * 36 + Math.sin(i) * 3;
      const yb = base + (r() - 0.3) * 8;
      const xs = cx + v * 40;
      const ys = topo + h * (0.36 + 0.16 * (1 - Math.abs(v)));
      const claro = r() < 0.4 && v < 0.5;
      ctx.strokeStyle = claro ? 'rgba(156,116,82,' + (0.18 + r() * 0.3).toFixed(2) + ')' : 'rgba(6,3,2,' + (0.22 + r() * 0.35).toFixed(2) + ')';
      ctx.lineWidth = 0.6 + r() * 1.4;
      ctx.beginPath();
      ctx.moveTo(crx + v * 3, cry + 2);
      ctx.quadraticCurveTo(cx + v * 34 + lado * 4, cry + h * 0.02, xs, ys);
      ctx.bezierCurveTo(xs - lado * 6, ys + h * 0.16, xb - lado * 6 + (r() - 0.5) * 6, yb - h * 0.2, xb, yb);
      ctx.stroke();
    }
    // a sombra da nuca, embaixo do crânio, entre as mechas
    const nuca = ctx.createLinearGradient(0, topo + h * 0.55, 0, base);
    nuca.addColorStop(0, 'rgba(0,0,0,0)');
    nuca.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = nuca;
    ctx.fillRect(cx - 50, topo + h * 0.5, 100, h * 0.6);
    ctx.restore();
  }
  function arteHeroi(ctx) {
    const r = sorteio(1700);
    fundoPapel(ctx, '#eeebe3', 1700);
    manchas(ctx, r, 16, { aClaro: 0.10, aEscuro: 0.025, claro: '255,254,248', escuro: '120,110,90' });
    const cx = L / 2;
    const chao = 1112;
    const pescoco = 626;
    // o chão de tinta, por baixo de tudo
    pinceladaDeChao(ctx, cx - 290, cx + 300, chao + 6, 50, r, '#1c1a17');
    // a sombra macia da capa no chão
    ctx.save();
    ctx.filter = 'blur(10px)';
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath();
    ctx.ellipse(cx + 18, chao + 4, 200, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const capa = capaVermelha(cx, pescoco, chao, 1701);
    ctx.drawImage(capa.c, 0, 0);
    // o colarinho: a gola em pé, uma faixa mais escura com o brilho na beira de cima
    ctx.save();
    const gola = new Path2D();
    gola.moveTo(cx - 34, pescoco + 8);
    gola.bezierCurveTo(cx - 26, pescoco - 8, cx + 26, pescoco - 8, cx + 34, pescoco + 8);
    gola.bezierCurveTo(cx + 26, pescoco + 18, cx - 26, pescoco + 18, cx - 34, pescoco + 8);
    const gg = ctx.createLinearGradient(cx - 40, 0, cx + 40, 0);
    gg.addColorStop(0, '#b0281f');
    gg.addColorStop(1, '#5e0d0e');
    ctx.fillStyle = gg;
    ctx.fill(gola);
    ctx.restore();
    cabeloDeCostas(ctx, cx, pescoco - 88, pescoco + 34, sorteio(1702));
    // a frase: JESUS enorme, gasto, e MEU SUPER-HERÓI embaixo
    const tinta = '#1c1a17';
    const os = (t) => oswaldLP(t, 700);
    const esp = 0.04;
    const tJ = caber(ctx, 'JESUS', os, 600, 300, esp);
    ctx.font = os(tJ);
    const capJ = ctx.measureText('J').actualBoundingBoxAscent;
    const yJ = chao + 80 + capJ;
    const { c, ctx: k } = camada();
    S.escrever(k, 'JESUS', cx + tJ * esp / 2, yJ, os(tJ), tinta, { espaco: tJ * esp });
    const wJ = larguraDe(ctx, 'JESUS', os(tJ), tJ * esp);
    gastar(c, { x: cx - wJ / 2, y: yJ - capJ, w: wJ, h: capJ }, { pontos: 1500, manchas: 14, riscos: 30, semente: 1703, forca: 0.75 });
    ctx.drawImage(c, 0, 0);
    const sub = 'MEU SUPER-HERÓI';
    const tS = caber(ctx, sub, (t) => oswaldLP(t, 600), wJ, 60, 0.14);
    S.escrever(ctx, sub, cx + tS * 0.07, yJ + 30 + tS * 0.8, oswaldLP(tS, 600), tinta, { espaco: tS * 0.14 });
  }
  // As linhas empilhadas, cada uma esticada na largura do bloco, numa máscara W x H; depois
  // cada pixel de saída busca o ponto da máscara que o mapa manda (o texto ondula e incha).
  // mapa(X, Y) recebe X de -1 a 1 e Y de 0 a 1 e devolve [X, Y] na máscara. A cor é a do
  // pincel; devolve a camada W x H.
  function textoOndulado(linhas, pesos, W, H, mapa, cor, { fonte = (t) => oswaldLP(t, 700), gordo = 10, vao = 0.03, margem = 0 } = {}) {
    const M = document.createElement('canvas');
    M.width = W;
    M.height = H;
    const k = M.getContext('2d');
    k.fillStyle = '#000';
    k.strokeStyle = '#000';
    k.lineJoin = 'round';
    const soma = pesos.reduce((a, b) => a + b, 0);
    const Wi = W - margem * 2;
    const Hi = H - margem * 2;
    const livre = Hi * (1 - vao * (linhas.length - 1));
    let topo = margem;
    linhas.forEach((l, i) => {
      const alt = livre * pesos[i] / soma;
      k.save();
      k.font = fonte(200);
      k.textBaseline = 'alphabetic';
      const m = k.measureText(l);
      const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      k.translate(margem + gordo, topo + gordo);
      k.scale((Wi - gordo * 2) / w, (alt - gordo * 2) / h);
      k.fillText(l, m.actualBoundingBoxLeft, m.actualBoundingBoxAscent);
      k.lineWidth = gordo * 2 * w / Wi;
      k.strokeText(l, m.actualBoundingBoxLeft, m.actualBoundingBoxAscent);
      k.restore();
      topo += alt + Hi * vao;
    });
    const src = k.getImageData(0, 0, W, H).data;
    const sai = document.createElement('canvas');
    sai.width = W;
    sai.height = H;
    const ks = sai.getContext('2d');
    const img = ks.createImageData(W, H);
    const o = img.data;
    const cr = parseInt(cor.slice(1, 3), 16);
    const cg = parseInt(cor.slice(3, 5), 16);
    const cb = parseInt(cor.slice(5, 7), 16);
    const alfa = (x, y) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      if (xi < 0 || yi < 0 || xi >= W - 1 || yi >= H - 1) return 0;
      const fx = x - xi;
      const fy = y - yi;
      const i = (yi * W + xi) * 4 + 3;
      return (src[i] * (1 - fx) + src[i + 4] * fx) * (1 - fy) + (src[i + W * 4] * (1 - fx) + src[i + W * 4 + 4] * fx) * fy;
    };
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const [X, Y] = mapa((px + 0.5) / W * 2 - 1, (py + 0.5) / H);
        const a = alfa((X + 1) / 2 * W, Y * H);
        if (a <= 0) continue;
        const j = (py * W + px) * 4;
        o[j] = cr;
        o[j + 1] = cg;
        o[j + 2] = cb;
        o[j + 3] = a;
      }
    }
    ks.putImageData(img, 0, 0);
    return sai;
  }
  // Jesus, caminho, verdade e vida: como o cartaz que o dono mandou, as quatro palavras
  // empilhadas em letra psicodélica dos anos 70, que ondula e incha como vista através da
  // água quente, com a sombra deslocada por baixo. Aqui em tinta no papel creme, com a
  // sombra amarela (a da referência é azul e laranja). JESUS, menor no alto. Lema com a
  // referência (João 14.6: "Eu sou o Caminho, a Verdade e a Vida"). Fechamento: a sombra.
  function arteVida(ctx) {
    fundoPapel(ctx, '#efe8d6', 1710);
    const W = 980;
    const H = 1000;
    const x0 = (L - W) / 2 - 10;
    const y0 = 500;
    const mapa = (X, Y) => {
      // a largura de cada faixa incha e encolhe, o bloco serpenteia e as linhas de base ondulam
      const incha = 1 + 0.13 * Math.sin(2 * Math.PI * (Y * 1.35) + 0.4);
      const anda = 0.07 * Math.sin(2 * Math.PI * (Y * 1.1) + 1.9);
      const xs = X / incha - anda;
      const ys = Y + 0.03 * Math.sin(Math.PI * (X * 1.6) + Y * 6) + 0.012 * Math.sin(X * 9 + Y * 4);
      return [xs, ys];
    };
    const linhas = ['JESUS,', 'CAMINHO,', 'VERDADE', 'E VIDA'];
    const pesos = [0.62, 1.12, 1.12, 1];
    const letra = textoOndulado(linhas, pesos, W, H, mapa, LP.tinta, { gordo: 9, margem: 92 });
    const sombra = textoOndulado(linhas, pesos, W, H, mapa, '#eea62a', { gordo: 9, margem: 92 });
    // a tinta assentada no papel, com falhas leves
    const juntas = camada();
    juntas.ctx.drawImage(sombra, x0 + 16, y0 + 14);
    juntas.ctx.drawImage(letra, x0, y0);
    gastar(juntas.c, { x: x0, y: y0, w: W + 20, h: H + 20 }, { pontos: 2600, manchas: 6, riscos: 0, semente: 1711, forca: 0.3 });
    ctx.drawImage(juntas.c, 0, 0);
    referencia(ctx, 'João 14.6', L / 2, 1530, 30, '#5c5a52');
  }
  // ---------- gravura: o traço que engrossa na sombra ----------
  // Uma linha de buril: os pontos ligados em pedaços curtos, cada pedaço da largura que
  // largura(x, y, t) manda (abaixo de 0,3 some). Como a gravura dos livros antigos de
  // anatomia: o tom vem só da espessura e do cruzamento das linhas.
  function linhaDeBuril(ctx, pts, largura, cor) {
    ctx.save();
    ctx.strokeStyle = cor;
    ctx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const w = largura((x0 + x1) / 2, (y0 + y1) / 2, i / (pts.length - 1));
      if (w < 0.3) continue;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Os pontos de uma cúbica (n pedaços).
  function pontosCubica(p0, p1, p2, p3, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = (1 - t) ** 3;
      const b = 3 * (1 - t) ** 2 * t;
      const c = 3 * (1 - t) * t * t;
      const d = t ** 3;
      pts.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
    }
    return pts;
  }
  // Uma curva suave (Catmull-Rom) passando pelos pontos: devolve o Path2D e os pontos densos.
  // fechada: volta ao primeiro ponto. Um ponto com terceiro valor 1 é quina (a curva não
  // arredonda ali).
  function curvaSuave(pontos, fechada = true, n = 12) {
    const N = pontos.length;
    const pega = (i) => (fechada ? pontos[(i + N) % N] : pontos[Math.max(0, Math.min(N - 1, i))]);
    const p = new Path2D();
    const pts = [[pontos[0][0], pontos[0][1]]];
    p.moveTo(pontos[0][0], pontos[0][1]);
    const fim = fechada ? N : N - 1;
    for (let i = 0; i < fim; i++) {
      const a = pega(i);
      const b = pega(i + 1);
      const antes = a[2] ? a : pega(i - 1);
      const depois = b[2] ? b : pega(i + 2);
      const c1 = [a[0] + (b[0] - antes[0]) / 6, a[1] + (b[1] - antes[1]) / 6];
      const c2 = [b[0] - (depois[0] - a[0]) / 6, b[1] - (depois[1] - a[1]) / 6];
      p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], b[0], b[1]);
      pontosCubica(a, c1, c2, b, n).slice(1).forEach((q) => pts.push(q));
    }
    if (fechada) p.closePath();
    return { p, pts };
  }
  // A luz da gravura: do alto, à esquerda e de frente.
  const LUZ_G = (() => { const v = [-0.5, -0.62, 0.6]; const m = Math.hypot(...v); return v.map((x) => x / m); })();
  // O relevo de uma forma: a máscara borrada em meia resolução, no sistema local do desenho.
  // Devolve v(x, y) de 0 (fora) a 1 (dentro, longe da beira).
  function relevoDe(desenhar, borra, { x0 = -440, y0 = -640, w = 900, h = 1040 } = {}) {
    const esc = 0.5;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * esc);
    c.height = Math.ceil(h * esc);
    const k = c.getContext('2d');
    k.filter = 'blur(' + (borra * esc).toFixed(1) + 'px)';
    k.setTransform(esc, 0, 0, esc, -x0 * esc, -y0 * esc);
    k.fillStyle = '#000';
    k.strokeStyle = '#000';
    desenhar(k);
    const W = c.width;
    const H = c.height;
    const d = k.getImageData(0, 0, W, H).data;
    return (x, y) => {
      const fx = (x - x0) * esc;
      const fy = (y - y0) * esc;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      if (ix < 0 || iy < 0 || ix >= W - 1 || iy >= H - 1) return 0;
      const tx = fx - ix;
      const ty = fy - iy;
      const j = (iy * W + ix) * 4 + 3;
      const a = d[j];
      const b = d[j + 4];
      const cc = d[j + W * 4];
      const dd = d[j + W * 4 + 4];
      return ((a * (1 - tx) + b * tx) * (1 - ty) + (cc * (1 - tx) + dd * tx) * ty) / 255;
    };
  }
  // O tom (0 claro, 1 escuro) de uma forma estufada como almofada: a normal sai da inclinação
  // de duas máscaras borradas (uma fina para a beira virar, uma larga para o volume), e a
  // sombra projetada soma por cima.
  function tomDeRelevo(fina, larga, { kf = 26, kl = 90, sombra = null, forcaSombra = 0.55, base = 0 } = {}) {
    const e = 3;
    return (x, y) => {
      const gx = (fina(x + e, y) - fina(x - e, y)) / (2 * e) * kf + (larga(x + e, y) - larga(x - e, y)) / (2 * e) * kl;
      const gy = (fina(x, y + e) - fina(x, y - e)) / (2 * e) * kf + (larga(x, y + e) - larga(x, y - e)) / (2 * e) * kl;
      const m = Math.hypot(gx, gy, 1);
      const dif = Math.max(0, (-gx * LUZ_G[0] - gy * LUZ_G[1] + LUZ_G[2]) / m);
      let t = 1 - dif * 1.12 + base;
      if (sombra) t += sombra(x, y) * forcaSombra;
      return Math.max(0, Math.min(1, t));
    };
  }
  // As linhas de um elipsoide visto de leve de cima (inclina), girado no plano (giro): os
  // paralelos ('lat') ou os meridianos ('lon'), espaçados por igual na projeção. Só a parte
  // da frente.
  function linhasDeElipsoide({ cx, cy, a, b, c = a, giro = 0, inclina = 0.35, passo = 7, familia = 'lat', n = 110 }) {
    const linhas = [];
    const cg = Math.cos(giro);
    const sg = Math.sin(giro);
    const ci = Math.cos(inclina);
    const si = Math.sin(inclina);
    const proj = (phi, lam) => {
      const X = a * Math.cos(phi) * Math.sin(lam);
      const Y = b * Math.sin(phi);
      const Z = c * Math.cos(phi) * Math.cos(lam);
      const Y2 = Y * ci - Z * si;
      const Z2 = Y * si + Z * ci;
      return [cx + X * cg - Y2 * sg, cy + X * sg + Y2 * cg, Z2];
    };
    const N = familia === 'lat' ? Math.ceil(2 * b / passo) : Math.ceil(2 * a / passo);
    for (let i = 1; i < N; i++) {
      const s = Math.asin(-1 + 2 * i / N);
      let atual = [];
      for (let j = 0; j <= n; j++) {
        const u = -Math.PI / 2 + Math.PI * j / n;
        const [x, y, z] = familia === 'lat' ? proj(s, u * 1.9) : proj(u, s);
        if (z > 0) atual.push([x, y]);
        else if (atual.length) { if (atual.length > 1) linhas.push(atual); atual = []; }
      }
      if (atual.length > 1) linhas.push(atual);
    }
    return linhas;
  }
  // O contorno de traço vivo: mais fino do lado da luz, mais grosso do lado da sombra.
  function contornoVivo(ctx, pts, cor, { fino = 1.3, grosso = 4.2, fechado = true } = {}) {
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    const sinal = area > 0 ? 1 : -1;
    const lx = LUZ_G[0];
    const ly = LUZ_G[1];
    const ml = Math.hypot(lx, ly);
    const seg = fechado ? pts.concat([pts[0]]) : pts;
    ctx.save();
    ctx.strokeStyle = cor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < seg.length; i++) {
      const [x0, y0] = seg[i - 1];
      const [x1, y1] = seg[i];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const m = Math.hypot(dx, dy) || 1;
      // a normal para fora (o sentido depende da volta do contorno)
      const nx = (dy / m) * sinal;
      const ny = (-dx / m) * sinal;
      const sombra = 0.5 - 0.5 * (nx * lx + ny * ly) / ml;
      ctx.lineWidth = fino + (grosso - fino) * Math.pow(sombra, 1.4);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Uma região do coração em gravura: o papel, as famílias de linhas (cada uma com a sua
  // régua de largura pelo tom), recortadas na forma, e o contorno vivo.
  function regiaoGravada(ctx, forma, tom, familias, { tinta, papel, contorno = true, fino, grosso }) {
    ctx.fillStyle = papel;
    ctx.fill(forma.p);
    ctx.save();
    ctx.clip(forma.p);
    for (const f of familias) {
      const larg = f.largura;
      for (const l of linhasDeElipsoide(f)) linhaDeBuril(ctx, l, (x, y) => larg(tom(x, y), x, y), tinta);
    }
    ctx.restore();
    if (contorno) contornoVivo(ctx, forma.pts, tinta, { fino, grosso });
  }
  // As réguas: quanto de linha cada tom pede. A primeira família cobre do meio-tom para cima;
  // a segunda cruza só na sombra; a terceira só no escuro fundo.
  const reguaPrimeira = (t) => (t < 0.06 ? 0 : Math.min(3.4, 0.42 + Math.max(0, (t - 0.12) * 4.4)));
  const reguaSegunda = (t) => Math.max(0, (t - 0.52) * 5.2);
  const reguaTerceira = (t) => Math.max(0, (t - 0.74) * 6);
  // Um tubo (vaso) em gravura pelo eixo dado em pontos (curva suave), com o raio indo de r0 a
  // r1: o papel, os anéis de corte que contornam o cilindro (a linha engrossa na sombra), as
  // linhas ao comprido cruzando só no escuro, o contorno vivo e a boca cortada no fim, com a
  // parede e o fundo escuro. curva: quanto o anel se curva (a vista um pouco de cima).
  function tuboDe(eixo, r0, r1) {
    const meio = curvaSuave(eixo, false, 14).pts;
    const comp = [0];
    for (let i = 1; i < meio.length; i++) comp.push(comp[i - 1] + Math.hypot(meio[i][0] - meio[i - 1][0], meio[i][1] - meio[i - 1][1]));
    const total = comp[comp.length - 1];
    const tang = meio.map((p, i) => {
      const a = meio[Math.max(0, i - 1)];
      const b = meio[Math.min(meio.length - 1, i + 1)];
      const m = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(b[0] - a[0]) / m, (b[1] - a[1]) / m];
    });
    const raio = (i) => r0 + (r1 - r0) * comp[i] / total;
    const borda = (o) => meio.map((p, i) => [p[0] - tang[i][1] * o * raio(i), p[1] + tang[i][0] * o * raio(i)]);
    const esq = borda(-1);
    const dir = borda(1);
    const p = new Path2D();
    p.moveTo(esq[0][0], esq[0][1]);
    esq.forEach((q) => p.lineTo(q[0], q[1]));
    for (let i = dir.length - 1; i >= 0; i--) p.lineTo(dir[i][0], dir[i][1]);
    p.closePath();
    return { meio, comp, total, tang, raio, esq, dir, p };
  }
  function tuboGravado(ctx, eixo, r0, r1, { tinta, papel, passo = 6.6, boca = true, curva = -0.32, sombra = null }) {
    const t = tuboDe(eixo, r0, r1);
    const { meio, comp, total, tang, raio } = t;
    ctx.fillStyle = papel;
    ctx.fill(t.p);
    // o tom num ponto do cilindro: o desvio o (de -1 a 1) diz a normal
    const tomCil = (i, o, x, y) => {
      const nx = -tang[i][1] * o;
      const ny = tang[i][0] * o;
      const nz = Math.sqrt(Math.max(0, 1 - o * o));
      const dif = Math.max(0, nx * LUZ_G[0] + ny * LUZ_G[1] + nz * LUZ_G[2]);
      let tt = 1 - dif * 1.1;
      if (sombra) tt += sombra(x, y) * 0.5;
      return Math.max(0, Math.min(1, tt));
    };
    const fimAneis = boca ? total - raio(meio.length - 1) * 0.5 : total;
    ctx.save();
    ctx.clip(t.p);
    let i = 0;
    for (let s = passo * 0.5; s < fimAneis; s += passo) {
      while (i < comp.length - 2 && comp[i + 1] < s) i++;
      const c = meio[i];
      const R = raio(i);
      const T = tang[i];
      const pts = [];
      const os = [];
      for (let j = 0; j <= 26; j++) {
        const o = -1 + 2 * j / 26;
        const curvo = curva * R * Math.sqrt(1 - o * o);
        pts.push([c[0] - T[1] * o * R + T[0] * curvo, c[1] + T[0] * o * R + T[1] * curvo]);
        os.push(o);
      }
      const ii = i;
      linhaDeBuril(ctx, pts, (x, y, u) => Math.min(3, Math.max(0, (tomCil(ii, -1 + 2 * u, x, y) - 0.3) * 4.4)), tinta);
    }
    // ao comprido, cruzando na sombra
    for (let o = -0.93; o <= 0.93; o += 0.124) {
      const pts = meio.map((q, k) => [q[0] - tang[k][1] * o * raio(k), q[1] + tang[k][0] * o * raio(k)]);
      linhaDeBuril(ctx, pts, (x, y, u) => {
        const k = Math.min(meio.length - 1, Math.round(u * (meio.length - 1)));
        if (boca && comp[k] > fimAneis) return 0;
        const tt = tomCil(k, o, x, y);
        return tt < 0.14 ? 0 : 0.4 + Math.max(0, (tt - 0.5) * 3.6);
      }, tinta);
    }
    ctx.restore();
    // as duas beiras, a do lado da sombra mais grossa
    for (const [lado, o] of [[t.esq, -1], [t.dir, 1]]) {
      linhaDeBuril(ctx, lado, (x, y, u) => {
        const k = Math.min(meio.length - 1, Math.round(u * (meio.length - 1)));
        const nx = -tang[k][1] * o;
        const ny = tang[k][0] * o;
        const sb = 0.5 - 0.5 * (nx * LUZ_G[0] + ny * LUZ_G[1]) / Math.hypot(LUZ_G[0], LUZ_G[1]);
        return 1.3 + 3 * Math.pow(sb, 1.3);
      }, tinta);
    }
    if (boca) {
      const k = meio.length - 1;
      const f = meio[k];
      const T = tang[k];
      const R = raio(k);
      ctx.save();
      ctx.translate(f[0], f[1]);
      ctx.rotate(Math.atan2(T[1], T[0]) + Math.PI / 2);
      // a borda cortada: o anel da parede em papel e o fundo escuro
      ctx.fillStyle = papel;
      ctx.beginPath();
      ctx.ellipse(0, 0, R, R * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tinta;
      ctx.beginPath();
      ctx.ellipse(R * 0.04, R * 0.03, R * 0.76, R * 0.27, 0, 0, Math.PI * 2);
      ctx.fill();
      // a parede de dentro, do lado de lá, pega um pouco de luz
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = papel;
      ctx.lineCap = 'round';
      for (let j = 0; j < 4; j++) {
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(R * 0.04, R * 0.03 + 3 + j * 3.2, R * 0.74, R * 0.25, 0, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = tinta;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, R, R * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return t;
  }
  // Um vaso da superfície (coronária): fino e tortuoso, com a sombra que ele faz no músculo,
  // a beira em tinta, o miolo claro e o fio de sombra do lado de baixo.
  function vasoDaSuperficie(ctx, pontos, w, { tinta, papel }) {
    const { pts } = curvaSuave(pontos, false, 10);
    const larg = (u) => w * (1 - 0.55 * u);
    ctx.save();
    ctx.globalAlpha = 0.5;
    linhaDeBuril(ctx, pts.map(([x, y]) => [x + 2.6, y + 3.4]), (x, y, u) => larg(u) + 2.4, tinta);
    ctx.globalAlpha = 1;
    linhaDeBuril(ctx, pts, (x, y, u) => larg(u) + 3.2, tinta);
    linhaDeBuril(ctx, pts, (x, y, u) => larg(u), papel);
    // o fio de sombra dentro do vaso, do lado oposto à luz
    const desl = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const m = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      let nx = -(b[1] - a[1]) / m;
      let ny = (b[0] - a[0]) / m;
      if (nx * LUZ_G[0] + ny * LUZ_G[1] > 0) { nx = -nx; ny = -ny; }
      const s = larg(i / (pts.length - 1)) * 0.28;
      return [p[0] + nx * s, p[1] + ny * s];
    });
    linhaDeBuril(ctx, desl, (x, y, u) => larg(u) * 0.3, tinta);
    ctx.restore();
  }
  // A anatomia do coração, vista de frente, no sistema local (o meio dos ventrículos em 0, 0,
  // a ponta embaixo e um pouco à direita de quem olha): o átrio direito à esquerda com a
  // aurícula dobrando por cima, os ventrículos (o direito na frente, o esquerdo na faixa da
  // direita até a ponta, separados pelo sulco), a aurícula esquerda espiando à direita, a veia
  // cava superior subindo à esquerda, a aorta saindo do meio e fazendo o arco com os três
  // ramos, o tronco pulmonar na frente dela, subindo para a direita e se abrindo, e as veias
  // pulmonares atrás, à direita.
  let anatomiaPronta = null;
  function anatomia() {
    if (anatomiaPronta) return anatomiaPronta;
    const atrio = curvaSuave([[-100, -186], [-170, -196], [-226, -164], [-262, -96], [-274, -10], [-262, 76], [-226, 140], [-176, 176], [-120, 168], [-96, 60], [-96, -100]]);
    const ventriculos = curvaSuave([[-158, -112], [-122, -150], [-70, -172], [-6, -180], [62, -172], [124, -150], [182, -116], [224, -56], [244, 26], [236, 116], [202, 196], [148, 258], [100, 300], [68, 322, 1], [36, 314], [-26, 286], [-104, 232], [-168, 170], [-202, 96], [-204, 12], [-188, -58]]);
    const sulco = [[-2, -176], [16, -90], [34, 10], [50, 110], [64, 200], [72, 270], [74, 312]];
    const sulcoPts = curvaSuave(sulco, false, 10).pts;
    const ladoDoSulco = (dir) => {
      const p = new Path2D();
      p.moveTo(sulcoPts[0][0], -400);
      sulcoPts.forEach((q) => p.lineTo(q[0], q[1]));
      p.lineTo(sulcoPts[sulcoPts.length - 1][0], 420);
      p.lineTo(dir * 420, 420);
      p.lineTo(dir * 420, -400);
      p.closePath();
      return p;
    };
    const auriculaE = curvaSuave([[92, -150], [104, -196], [146, -222], [196, -214], [232, -184], [238, -146], [222, -128], [206, -138], [190, -122], [170, -132], [150, -114], [126, -124], [104, -112]]);
    const auriculaD = curvaSuave([[-196, -168], [-178, -214], [-132, -238], [-80, -232], [-40, -212], [-24, -186], [-38, -170], [-56, -180], [-70, -162], [-90, -172], [-108, -152], [-128, -164], [-150, -146], [-172, -158]]);
    anatomiaPronta = {
      atrio, ventriculos, sulco, sulcoPts, auriculaE, auriculaD,
      ladoD: ladoDoSulco(-1), ladoE: ladoDoSulco(1),
      cava: [[-172, -150], [-176, -300], [-170, -452]],
      aorta: [[-36, -170], [-44, -280], [-26, -372], [28, -428], [106, -436], [168, -400], [196, -330], [202, -236]],
      ramos: [
        { eixo: [[-12, -400], [-26, -480], [-52, -560]], r: [24, 21] },
        { eixo: [[48, -420], [52, -500], [58, -572]], r: [17, 15] },
        { eixo: [[104, -418], [118, -490], [140, -556]], r: [19, 17] },
      ],
      pulmonar: [[-62, -150], [-62, -236], [-24, -302], [44, -328], [90, -326]],
      pulmonarE: [[70, -328], [140, -330], [208, -308], [262, -280]],
      veias: [{ eixo: [[180, -206], [230, -214], [286, -222]], r: 19 }, { eixo: [[196, -168], [246, -168], [298, -160]], r: 18 }],
      coronarias: [
        { pts: sulco.map(([x, y], i) => [x + Math.sin(i * 1.7) * 3, y]), w: 8 },
        { pts: [[22, -60], [64, -36], [104, 6], [140, 64], [162, 128]], w: 6 },
        { pts: [[40, 70], [86, 110], [118, 162], [134, 220]], w: 5 },
        { pts: [[128, -134], [182, -96], [214, -34], [228, 40]], w: 6 },
        { pts: [[14, -120], [-30, -96], [-70, -50], [-96, 6]], w: 4.5 },
        { pts: [[30, 20], [-14, 46], [-44, 96], [-58, 150]], w: 4 },
        { pts: [[-126, -152], [-164, -92], [-190, -10], [-196, 70], [-178, 150]], w: 7 },
        { pts: [[-190, 40], [-150, 92], [-100, 150], [-40, 214]], w: 5 },
      ],
    };
    return anatomiaPronta;
  }
  // O coração anatômico em gravura no lugar (cx, cy), girado e na escala. Cada parte tem o
  // próprio volume (as máscaras borradas dão a normal), as linhas que contornam a forma
  // (paralelos de elipsoide) e engrossam na sombra, o cruzado só no escuro, as sombras que
  // os vasos e as aurículas jogam no músculo e o contorno vivo. ordem: 'tudo'.
  function coracaoGravado(ctx, cx, cy, esc, giro, { tinta, papel, passo = 6.4 }) {
    const an = anatomia();
    const P = (p, kk) => kk.fill(p);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(giro);
    ctx.scale(esc, esc);
    const op = { tinta, papel };
    // as sombras projetadas: o que fica na frente, deslocado para baixo e à direita
    const tuboPulm = tuboDe(an.pulmonar, 52, 46);
    const tuboAorta = tuboDe(an.aorta, 50, 46);
    const tuboCava = tuboDe(an.cava, 40, 38);
    const sombraCorpo = relevoDe((k) => {
      k.translate(16, 20);
      k.fill(tuboPulm.p);
      k.fill(an.auriculaD.p);
      k.fill(an.auriculaE.p);
      k.lineCap = 'round';
      for (const v of an.coronarias) {
        k.lineWidth = v.w + 4;
        k.beginPath();
        curvaSuave(v.pts, false, 8).pts.forEach((q, i) => (i ? k.lineTo(q[0], q[1]) : k.moveTo(q[0], q[1])));
        k.stroke();
      }
      // o sulco: um vale estreito ao longo da linha
      k.translate(-16, -20);
      k.lineWidth = 16;
      k.beginPath();
      an.sulcoPts.forEach((q, i) => (i ? k.lineTo(q[0], q[1]) : k.moveTo(q[0], q[1])));
      k.stroke();
    }, 12);
    const sombraVasos = relevoDe((k) => {
      k.translate(14, 18);
      k.fill(tuboPulm.p);
      k.fill(tuboDe(an.pulmonarE, 36, 32).p);
    }, 14);
    const sombraCava = relevoDe((k) => { k.translate(14, 18); k.fill(tuboAorta.p); }, 14);
    // 1. atrás: as veias pulmonares, a veia cava e os ramos do arco
    for (const v of an.veias) tuboGravado(ctx, v.eixo, v.r, v.r - 1, { ...op, passo: passo * 0.9 });
    tuboGravado(ctx, an.cava, 40, 38, { ...op, passo, sombra: sombraCava });
    for (const rm of an.ramos) tuboGravado(ctx, rm.eixo, rm.r[0], rm.r[1], { ...op, passo: passo * 0.9 });
    // 2. a aorta com o arco
    tuboGravado(ctx, an.aorta, 50, 46, { ...op, passo, boca: false, sombra: sombraVasos });
    // 3. o átrio direito
    const atrioTom = tomDeRelevo(relevoDe((k) => P(an.atrio.p, k), 18), relevoDe((k) => P(an.atrio.p, k), 70), { sombra: sombraCorpo });
    regiaoGravada(ctx, an.atrio, atrioTom, [
      { cx: -190, cy: -10, a: 110, b: 200, giro: 0.2, inclina: 0.3, passo, largura: reguaPrimeira },
      { cx: -190, cy: -10, a: 110, b: 200, giro: 0.2, inclina: 0.3, passo: passo * 1.1, familia: 'lon', largura: reguaSegunda },
    ], { ...op });
    // 4. os ventrículos: o direito e o esquerdo, cada um com o seu volume, separados no sulco
    const maskV = (lado) => (k) => { k.save(); k.clip(lado); k.fill(an.ventriculos.p); k.restore(); };
    const largaV = relevoDe((k) => P(an.ventriculos.p, k), 120);
    const tomD = tomDeRelevo(relevoDe(maskV(an.ladoD), 22), largaV, { kf: 22, kl: 140, sombra: sombraCorpo });
    const tomE = tomDeRelevo(relevoDe(maskV(an.ladoE), 22), largaV, { kf: 22, kl: 140, sombra: sombraCorpo, base: 0.06 });
    ctx.fillStyle = papel;
    ctx.fill(an.ventriculos.p);
    for (const [lado, tom, el] of [[an.ladoD, tomD, { cx: -40, cy: 40, a: 210, b: 300, giro: -0.22 }], [an.ladoE, tomE, { cx: 140, cy: 50, a: 120, b: 290, giro: -0.3 }]]) {
      ctx.save();
      ctx.clip(an.ventriculos.p);
      ctx.clip(lado);
      for (const f of [{ ...el, inclina: 0.42, passo, largura: reguaPrimeira }, { ...el, inclina: 0.42, passo: passo * 1.15, familia: 'lon', largura: reguaSegunda }, { ...el, giro: el.giro + 0.85, inclina: 0.2, passo: passo * 1.2, largura: reguaTerceira }]) {
        for (const l of linhasDeElipsoide(f)) linhaDeBuril(ctx, l, (x, y) => f.largura(tom(x, y)), tinta);
      }
      ctx.restore();
    }
    // os pontinhos da passagem entre a luz e a sombra (o pontilhado dos gravadores)
    ctx.save();
    ctx.clip(an.ventriculos.p);
    ctx.fillStyle = tinta;
    const rr = sorteio(4242);
    for (let i = 0; i < 2600; i++) {
      const x = -220 + rr() * 470;
      const y = -180 + rr() * 500;
      const t = (x < 50 ? tomD : tomE)(x, y);
      if (t < 0.22 || t > 0.5 || rr() > 0.6) continue;
      ctx.beginPath();
      ctx.arc(x, y, 0.7 + (t - 0.22) * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // as coronárias e as veias da superfície
    for (const v of an.coronarias) vasoDaSuperficie(ctx, v.pts, v.w, op);
    contornoVivo(ctx, an.ventriculos.pts, tinta, { fino: 1.6, grosso: 5.2 });
    // 5. as aurículas, por cima
    for (const au of [an.auriculaE, an.auriculaD]) {
      const tom = tomDeRelevo(relevoDe((k) => P(au.p, k), 10), relevoDe((k) => P(au.p, k), 34), { kf: 18, kl: 40, sombra: au === an.auriculaE ? sombraVasos : null });
      const b = au === an.auriculaE ? { cx: 166, cy: -170, a: 80, b: 60, giro: 0.3 } : { cx: -110, cy: -190, a: 100, b: 56, giro: -0.15 };
      regiaoGravada(ctx, au, tom, [{ ...b, inclina: 0.5, passo: passo * 0.9, familia: 'lon', largura: reguaPrimeira }, { ...b, inclina: 0.5, passo: passo, largura: reguaSegunda }], { ...op, fino: 1.2, grosso: 3.6 });
    }
    // 6. o tronco pulmonar na frente, com o ramo esquerdo que passa embaixo do arco
    tuboGravado(ctx, an.pulmonarE, 36, 32, { ...op, passo: passo * 0.9 });
    tuboGravado(ctx, an.pulmonar, 52, 46, { ...op, passo, boca: false });
    ctx.restore();
  }
  // Uma língua de fogo no estilo de flash de tatuagem: sobe da base (bx, by) até a altura
  // alt, inclinada por lean (fração da altura que anda para o lado), fazendo o S (amp, fase)
  // que no fim vira o gancho da ponta. A largura incha logo acima da base e afina até a ponta,
  // com a beira levemente ondulada. Devolve o Path2D e linha(o, t0, t1), os traços de dentro
  // (o de 0 a 1 na largura).
  function linguaFlash(base, alt, larg, { lean = 0, amp = 0.1, fase = 0, onda = 0.08 } = {}) {
    const [bx, by] = base;
    const meio = (t) => [bx + lean * alt * t * t * 0.9 + lean * alt * t * 0.1 + amp * alt * (Math.sin(Math.PI * 1.5 * t + fase) - Math.sin(fase)) * Math.pow(t, 0.8), by - alt * t];
    const perfil = (t) => larg * 0.5 * Math.pow(1 - t, 0.95) * (0.7 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.8))) * (1 + onda * Math.sin(t * 15 + fase * 2));
    const n = 60;
    const esq = [];
    const dir2 = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = meio(Math.max(0, t - 0.01));
      const b = meio(Math.min(1, t + 0.01));
      const m = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / m;
      const ny = (b[0] - a[0]) / m;
      const c = meio(t);
      const w = perfil(t);
      esq.push([c[0] - nx * w, c[1] - ny * w]);
      dir2.push([c[0] + nx * w, c[1] + ny * w]);
    }
    const p = new Path2D();
    p.moveTo(esq[0][0], esq[0][1] + larg * 0.4);
    for (let i = 0; i < esq.length - 1; i++) p.quadraticCurveTo(esq[i][0], esq[i][1], (esq[i][0] + esq[i + 1][0]) / 2, (esq[i][1] + esq[i + 1][1]) / 2);
    p.lineTo(esq[n][0], esq[n][1]);
    for (let i = n - 1; i > 0; i--) p.quadraticCurveTo(dir2[i][0], dir2[i][1], (dir2[i][0] + dir2[i - 1][0]) / 2, (dir2[i][1] + dir2[i - 1][1]) / 2);
    p.lineTo(dir2[0][0], dir2[0][1] + larg * 0.4);
    p.closePath();
    const linha = (o, t0, t1) => {
      const pts = [];
      for (let i = 0; i <= 30; i++) {
        const t = t0 + (t1 - t0) * i / 30;
        const k = Math.round(t * n);
        const e = esq[k];
        const d = dir2[k];
        pts.push([e[0] + (d[0] - e[0]) * o, e[1] + (d[1] - e[1]) * o]);
      }
      return pts;
    };
    return { p, linha };
  }
  // Uma camada de chamas: todas as línguas fundidas numa forma só, com o contorno de tinta
  // só por fora (o traço largo por baixo e o preenchimento por cima), e por dentro os traços
  // finos que sobem de cada língua, afinando na ponta.
  function camadaDeChamas(ctx, linguas, { tinta, cor, contorno = 7, tracos = 0, corTraco = null }) {
    const { c, ctx: k } = camada();
    k.lineJoin = 'round';
    k.strokeStyle = tinta;
    k.lineWidth = contorno * 2;
    for (const l of linguas) k.stroke(l.p);
    k.fillStyle = cor;
    for (const l of linguas) k.fill(l.p);
    // os traços de dentro
    for (const l of linguas) {
      for (let j = 0; j < tracos; j++) {
        const o = tracos === 1 ? 0.5 : 0.3 + 0.4 * j / (tracos - 1);
        linhaDeBuril(k, l.linha(o, 0.15 + j * 0.08, 0.78 - j * 0.1), (x, y, t) => 2.6 * Math.sin(Math.PI * t), corTraco || tinta);
      }
    }
    ctx.drawImage(c, 0, 0);
  }
  // Uma silhueta de fogo: da base (largura meia), subindo em S até cada ponta e descendo em
  // gancho até o vale seguinte. pontas: [x, altura, para onde dobra]; tudo encolhido por k
  // em volta do ponto (0, cy0), para as camadas de dentro.
  function silhuetaDeChama(cx, yb, pontas, vales, meia, k = 1, cy0 = 160, dy = 0) {
    const q = (x, h) => [x * k, cy0 + (h - cy0) * k];
    const pts = [[...q(-meia * 0.45, -12), 0], [...q(-meia * 0.85, 18), 0], [...q(-meia, 60), 0]];
    pontas.forEach(([x, h, d], j) => {
      const tip = q(x, h);
      const ant = pts[pts.length - 1];
      const L1 = Math.hypot(tip[0] - ant[0], tip[1] - ant[1]);
      if (j === 0) {
        // a beira de fora da primeira língua: uma curva só, cheia, para fora e para baixo
        pts.push([ant[0] + (tip[0] - ant[0]) * 0.5 + d * L1 * 0.14, ant[1] + (tip[1] - ant[1]) * 0.5 - L1 * 0.1]);
      } else {
        pts.push([ant[0] + (tip[0] - ant[0]) * 0.33 - d * L1 * 0.15, ant[1] + (tip[1] - ant[1]) * 0.33]);
        pts.push([ant[0] + (tip[0] - ant[0]) * 0.74 + d * L1 * 0.08, ant[1] + (tip[1] - ant[1]) * 0.74]);
      }
      pts.push([tip[0], tip[1], 1]);
      if (j === pontas.length - 1) {
        const fim = q(meia, 60);
        const L3 = Math.hypot(tip[0] - fim[0], tip[1] - fim[1]);
        pts.push([tip[0] + (fim[0] - tip[0]) * 0.5 + d * L3 * 0.14, tip[1] + (fim[1] - tip[1]) * 0.5 - L3 * 0.1]);
      }
      if (j < pontas.length - 1) {
        const prox = pontas[j + 1];
        const vale = q(x + (prox[0] - x) * (Math.abs(x) < Math.abs(prox[0]) ? 0.3 : 0.7), vales[j]);
        const L2 = Math.hypot(tip[0] - vale[0], tip[1] - vale[1]);
        pts.push([tip[0] + (vale[0] - tip[0]) * 0.28 + d * L2 * 0.16, tip[1] + (vale[1] - tip[1]) * 0.28]);
        pts.push([tip[0] + (vale[0] - tip[0]) * 0.68 + d * L2 * 0.06, tip[1] + (vale[1] - tip[1]) * 0.68]);
        pts.push([vale[0], vale[1], 1]);
      }
    });
    pts.push([...q(meia, 60), 0], [...q(meia * 0.85, 18), 0], [...q(meia * 0.45, -12), 0], [...q(0, -22), 0]);
    return curvaSuave(pts.map(([x, h, qq]) => [cx + x, yb + dy - h, qq]), true, 14);
  }
  // Deixa queimar: como flash de tatuagem em gravura, o coração anatômico em tinta no papel
  // creme, inteiro em linhas que contornam o volume, e atrás e em volta dele as chamas
  // subindo em línguas de contorno grosso: as de fora amarelas, as de dentro mais claras, com
  // os traços finos por dentro. "deixa queimar" à mão embaixo. Diferente das brasas (carvão no
  // escuro) e do coração disposto (as brasas embaixo do texto). Fechamento: as chamas.
  function arteQueimar(ctx) {
    const r = sorteio(1720);
    fundoPapel(ctx, '#ece3cf', 1720);
    const tinta = '#1d1912';
    const papel = '#f1e9d6';
    const cx = L / 2;
    const cy = 1010;
    // o calor atrás de tudo: uma luz amarela fraca no papel
    const calor = ctx.createRadialGradient(cx, 880, 0, cx, 880, 600);
    calor.addColorStop(0, 'rgba(255,196,77,.26)');
    calor.addColorStop(1, 'rgba(255,196,77,0)');
    ctx.fillStyle = calor;
    ctx.fillRect(0, 0, L, A);
    // as chamas: como um flash de tatuagem, uma silhueta só de fogo atrás do coração, com as
    // línguas em S terminando em ponta (a beira desenhada à mão, sem nada de grama), dentro
    // dela a camada mais clara e o miolo quase branco, cada uma com o contorno de tinta, e os
    // traços finos que sobem por dentro das línguas
    const yb = 1270;
    const chamaFlash = (...args) => silhuetaDeChama(cx, yb, ...args);
    // [x da ponta, altura, para onde a língua dobra (-1 esquerda, 1 direita)]
    const pontas = [[-366, 470, -1], [-284, 630, -1], [-150, 730, -1], [14, 780, 1], [160, 700, 1], [284, 620, 1], [368, 480, 1]];
    const vales = [330, 450, 520, 530, 460, 340];
    const fora = chamaFlash(pontas, vales, 120);
    const meio = chamaFlash(pontas.slice(1, 6), vales.slice(1, 5), 100, 0.74, 200, 0);
    const miolo = chamaFlash(pontas.slice(2, 5), vales.slice(2, 4), 80, 0.48, 240, 0);
    camadaDeChamas(ctx, [{ p: fora.p }], { tinta, cor: '#eea52a', contorno: 4.6 });
    // os traços de dentro, da base de cada língua para a ponta, só na faixa de fora
    ctx.save();
    ctx.clip(fora.p);
    for (const [x, h, d] of pontas) {
      for (const o of [-1, 1]) {
        const p0 = [cx + x * 0.5 + o * 24, yb - h * 0.4];
        const p3 = [cx + x * 0.95 + o * 8 + d * 10, yb - h * 0.88];
        const p1 = [p0[0] - d * 40, p0[1] - h * 0.2];
        const p2 = [p3[0] - d * 20, p3[1] + h * 0.14];
        linhaDeBuril(ctx, pontosCubica(p0, p1, p2, p3, 30), (xx, yy, t) => 2.4 * Math.sin(Math.PI * t), tinta);
      }
    }
    ctx.restore();
    camadaDeChamas(ctx, [{ p: meio.p }], { tinta, cor: '#ffd36a', contorno: 2.6 });
    camadaDeChamas(ctx, [{ p: miolo.p }], { tinta, cor: '#fff3cf', contorno: 2 });
    coracaoGravado(ctx, cx + 4, cy, 0.72, -0.16, { tinta, papel });
    // as da frente: um fogo baixo que lambe a ponta do coração
    const pontasF = [[-170, 150, -1], [-80, 240, -1], [26, 280, 1], [120, 220, 1], [196, 130, 1]];
    const valesF = [100, 150, 160, 100];
    const frenteF = chamaFlash(pontasF, valesF, 170, 1, 0, 30);
    const frenteM = chamaFlash(pontasF.slice(1, 4), valesF.slice(1, 3), 100, 0.64, 20, 30);
    camadaDeChamas(ctx, [{ p: frenteF.p }], { tinta, cor: '#eea52a', contorno: 4 });
    for (const [x, h, d] of pontasF) linhaDeBuril(ctx, pontosCubica([cx + x * 0.4, yb + 30 - h * 0.3], [cx + x * 0.5 - d * 20, yb + 30 - h * 0.5], [cx + x * 0.85 - d * 10, yb + 30 - h * 0.7], [cx + x * 0.95 + d * 6, yb + 30 - h * 0.86], 24), (xx, yy, t) => 2.2 * Math.sin(Math.PI * t), tinta);
    camadaDeChamas(ctx, [{ p: frenteM.p }], { tinta, cor: '#ffd36a', contorno: 2.4 });
    // as fagulhas: gotinhas de contorno subindo
    for (let i = 0; i < 16; i++) {
      const x = cx + (r() - 0.5) * 760;
      const y = 520 + r() * 300;
      if (Math.abs(x - cx) < 230) continue;
      const s = 5 + r() * 7;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((r() - 0.5) * 0.6);
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.6);
      ctx.quadraticCurveTo(s, 0, 0, s * 0.8);
      ctx.quadraticCurveTo(-s, 0, 0, -s * 1.6);
      ctx.fillStyle = '#ffd76e';
      ctx.fill();
      ctx.strokeStyle = tinta;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = tinta;
    aMao(ctx, 'deixa', cx, 1420, 76, r, { alinhar: 'center' });
    aMao(ctx, 'queimar', cx, 1500, 76, r, { alinhar: 'center' });
  }
  // A coroa de espinhos em volta de (cx, cy): três ramos grossos que se torcem uns nos outros
  // numa elipse inclinada (a volta de trás passa atrás do coração, a da frente na frente).
  // Cada pedaço de ramo é um cilindro com a beira em tinta, o tom que muda conforme o ramo
  // rola na torção (mais escuro por baixo e atrás), o brilho fino em cima, os nós; os pedaços
  // saem em ordem de profundidade, e os espinhos, compridos e curvos, saem para todo lado em
  // dois tons. metade: 'tras' ou 'frente'.
  function coroaDeEspinhos(ctx, cx, cy, rx, ry, giro, metade, { tinta, claro, escuro, semente, grossura = 12 }) {
    const r = sorteio(semente);
    const cg = Math.cos(giro);
    const sg = Math.sin(giro);
    const cClaro = claro.match(/\w\w/g).map((h) => parseInt(h, 16));
    const cEscuro = escuro.match(/\w\w/g).map((h) => parseInt(h, 16));
    const cor = (t) => { const c = misturaCor(cEscuro, cClaro, Math.max(0, Math.min(1, t))); return 'rgb(' + c.map(Math.round).join(',') + ')'; };
    const nRamos = 3;
    // a volta: t de 0 a 2π; sin(t) > 0 é a frente
    const ponto = (t, ramo) => {
      const torce = t * 4.5 + ramo * Math.PI * 2 / nRamos;
      const off = grossura * 0.75;
      const ox = Math.cos(t) * (rx + Math.cos(torce) * off);
      const oy = Math.sin(t) * (ry + Math.cos(torce) * off * 0.35) - Math.sin(torce) * off;
      return [cx + ox * cg - oy * sg, cy + ox * sg + oy * cg, Math.sin(t) * 10 + Math.cos(torce), torce];
    };
    const quer = (t) => (metade === 'frente' ? Math.sin(t) > 0 : Math.sin(t) <= 0);
    const pedacos = [];
    const n = 260;
    for (let ramo = 0; ramo < nRamos; ramo++) {
      for (let i = 0; i < n; i++) {
        const t0 = (i / n) * Math.PI * 2;
        const t1 = ((i + 1.15) / n) * Math.PI * 2;
        const tm = (t0 + t1) / 2;
        if (!quer(tm)) continue;
        const a = ponto(t0, ramo);
        const b = ponto(t1, ramo);
        pedacos.push({ a, b, z: (a[2] + b[2]) / 2, tm, ramo });
      }
    }
    pedacos.sort((p, q) => p.z - q.z);
    ctx.save();
    ctx.lineCap = 'butt';
    const atras = metade === 'tras' ? 0.4 : 0;
    for (const { a, b, tm } of pedacos) {
      const w = grossura * (0.92 + 0.08 * Math.sin(tm));
      // o ramo rola: em cima pega luz, embaixo fica no escuro
      const rola = 0.5 + 0.5 * Math.cos(a[3]);
      const luz = (0.5 + 0.5 * rola) * (1 - atras);
      ctx.strokeStyle = tinta;
      ctx.lineWidth = w + 5;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.strokeStyle = cor(luz * 0.8);
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.strokeStyle = cor(Math.min(1, luz + 0.3));
      ctx.lineWidth = w * 0.3;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1] - w * 0.2);
      ctx.lineTo(b[0], b[1] - w * 0.2);
      ctx.stroke();
      ctx.strokeStyle = tinta;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = w * 0.18;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1] + w * 0.3);
      ctx.lineTo(b[0], b[1] + w * 0.3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // os espinhos: compridos, curvos, a base no ramo, com o fio de sombra de um lado
    ctx.lineCap = 'round';
    for (let ramo = 0; ramo < nRamos; ramo++) {
      for (let i = 0; i < 16; i++) {
        const t = (i + r() * 0.9) / 16 * Math.PI * 2;
        if (!quer(t)) continue;
        const p = ponto(t, ramo);
        const fora = Math.atan2(p[1] - cy, p[0] - cx);
        const ang = fora + (r() - 0.5) * 2.4 + (r() < 0.25 ? Math.PI : 0);
        const comp = grossura * (1.8 + r() * 1.5);
        const curvo = (r() - 0.5) * 0.7;
        const ponta = [p[0] + Math.cos(ang) * comp, p[1] + Math.sin(ang) * comp];
        const lado = [-Math.sin(ang) * grossura * 0.36, Math.cos(ang) * grossura * 0.36];
        const ctl = [p[0] + Math.cos(ang + curvo) * comp * 0.55, p[1] + Math.sin(ang + curvo) * comp * 0.55];
        ctx.lineJoin = 'round';
        ctx.fillStyle = cor(0.92 - atras);
        ctx.strokeStyle = tinta;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(p[0] + lado[0], p[1] + lado[1]);
        ctx.quadraticCurveTo(ctl[0] + lado[0] * 0.3, ctl[1] + lado[1] * 0.3, ponta[0], ponta[1]);
        ctx.quadraticCurveTo(ctl[0] - lado[0] * 0.3, ctl[1] - lado[1] * 0.3, p[0] - lado[0], p[1] - lado[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p[0] - lado[0] * 0.4, p[1] - lado[1] * 0.4);
        ctx.quadraticCurveTo(ctl[0] - lado[0] * 0.2, ctl[1] - lado[1] * 0.2, ponta[0], ponta[1]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // Foi Tua graça que me salvou: GRAÇA repetida quatro vezes em serifa grande sálvia no
  // escuro, uma embaixo da outra, e no meio delas, por cima, o coração anatômico em gravura
  // clara, mais deitado e menor que o de Deixa queimar, com a coroa de espinhos apertada em
  // volta (a volta de trás atrás do coração, a da frente na frente). "Foi Tua" em cima e "que
  // me salvou" embaixo, em Literata itálica. Lema com a referência (Efésios 2.8: "é pela graça
  // que vocês são salvos"). A repetição de GRAÇA é a da referência. Fechamento: o coração.
  function arteGraca(ctx) {
    const r = sorteio(1730);
    ctx.fillStyle = '#111310';
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 30, { aClaro: 0.035, aEscuro: 0.08, claro: '200,218,140', escuro: '0,0,0' });
    const lit = (t) => '600 ' + t + 'px Literata, Georgia, serif';
    let tG = caber(ctx, 'GRAÇA', lit, 900, 330, 0.01);
    ctx.font = lit(tG);
    tG *= Math.min(1, 146 / ctx.measureText('G').actualBoundingBoxAscent);
    ctx.font = lit(tG);
    const capG = ctx.measureText('G').actualBoundingBoxAscent;
    const passo = capG * 1.13;
    const yPrimeira = 690 + capG;
    const { c, ctx: k } = camada();
    for (let i = 0; i < 4; i++) {
      const y = yPrimeira + i * passo;
      k.save();
      k.font = lit(tG);
      k.textAlign = 'center';
      k.textBaseline = 'alphabetic';
      try { k.letterSpacing = tG * 0.01 + 'px'; } catch (e) { /* sem letterSpacing */ }
      k.fillStyle = LP.salvia;
      k.strokeStyle = LP.salvia;
      k.lineJoin = 'round';
      k.lineWidth = tG * 0.035;
      k.fillText('GRAÇA', L / 2, y);
      k.strokeText('GRAÇA', L / 2, y);
      k.restore();
    }
    gastar(c, { x: 60, y: 640, w: L - 120, h: 760 }, { pontos: 3500, manchas: 10, riscos: 0, semente: 1731, forca: 0.35 });
    ctx.drawImage(c, 0, 0);
    S.escrever(ctx, 'Foi Tua', L / 2, 648, 'italic 500 66px Literata, Georgia, serif', LP.creme);
    // o coração no meio das quatro, com a coroa
    const hx = L / 2 + 6;
    const hy = yPrimeira + passo * 1.5 - capG * 0.5 + 40;
    const tinta = '#151512';
    const claro = '#efe9d8';
    // a sombra do coração nas letras
    ctx.save();
    ctx.filter = 'blur(20px)';
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.beginPath();
    ctx.ellipse(hx + 20, hy + 24, 200, 260, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const coroa = { tinta, claro: 'e4dcc4', escuro: '3a3a30', semente: 1732, grossura: 15 };
    const giro = 0.34;
    const esc = 0.52;
    // a coroa aperta o coração no meio, de leve inclinada com ele
    const kx = hx + 6;
    const ky = hy + 10;
    coroaDeEspinhos(ctx, kx, ky, 172, 56, giro * 0.7, 'tras', coroa);
    coracaoGravado(ctx, hx, hy, esc, giro, { tinta, papel: claro, passo: 7 });
    // a volta da frente numa camada, para a sombra dela cair no coração (só dentro dele)
    const frente = camada();
    coroaDeEspinhos(frente.ctx, kx, ky, 172, 56, giro * 0.7, 'frente', coroa);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(giro);
    ctx.scale(esc, esc);
    const an = anatomia();
    const silhueta = new Path2D();
    silhueta.addPath(an.ventriculos.p);
    silhueta.addPath(an.atrio.p);
    ctx.clip(silhueta);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'blur(7px) brightness(0)';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(frente.c, 8, 14);
    ctx.restore();
    ctx.drawImage(frente.c, 0, 0);
    const yFim = yPrimeira + passo * 3 + 98;
    S.escrever(ctx, 'que me salvou', L / 2, yFim, 'italic 500 66px Literata, Georgia, serif', LP.creme);
    referencia(ctx, 'Efésios 2.8', L / 2, yFim + 58, 28, LP.salvia);
  }
  // Uma aguada de aquarela: o caminho pintado numa camada com a cor rala, a beirada mais
  // escura (onde o pigmento se junta ao secar) e a borda macia; o papel aparece nos furos.
  function aguada(ctx, caminho, cor, { alfa = 0.6, beira = 0.5, macio = 1.4, semente = 1, furos = 120, transformar, variar } = {}) {
    const { c, ctx: k } = camada();
    if (transformar) transformar(k);
    k.filter = 'blur(' + macio + 'px)';
    k.globalAlpha = alfa;
    k.fillStyle = cor;
    k.fill(caminho);
    k.globalAlpha = alfa * beira;
    k.strokeStyle = cor;
    k.lineWidth = 3;
    k.lineJoin = 'round';
    k.stroke(caminho);
    k.filter = 'none';
    // o pigmento que não assenta por igual: mais ralo no meio, mais denso numa ponta
    if (variar) {
      k.globalCompositeOperation = 'source-atop';
      const g = k.createLinearGradient(variar[0], variar[1], variar[2], variar[3]);
      g.addColorStop(0, 'rgba(255,255,250,.28)');
      g.addColorStop(1, 'rgba(0,0,0,.10)');
      k.globalAlpha = 1;
      k.fillStyle = g;
      k.fill(caminho);
      k.globalCompositeOperation = 'source-over';
    }
    k.setTransform(1, 0, 0, 1, 0, 0);
    // a granulação do pigmento: furinhos claros
    const r = sorteio(semente);
    k.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < furos; i++) {
      k.globalAlpha = 0.15 + r() * 0.3;
      k.beginPath();
      k.arc(r() * L, r() * A, 0.8 + r() * 2.4, 0, Math.PI * 2);
      k.fill();
    }
    k.globalCompositeOperation = 'source-over';
    ctx.drawImage(c, 0, 0);
  }
  // A figura pequena de Jesus, de costas, andando, em aquarela de poucas cores: a túnica
  // numa aguada cinza quente, o manto num cinza mais fundo cruzando as costas, o cabelo
  // comprido escuro e o braço erguido segurando a carga no ombro. Sem rosto e sem contorno:
  // só manchas de tinta com a beirada mais escura, como as figuras pequenas das aquarelas.
  // Os pés em (x, y); h é a altura. carga() desenha o que ele leva, atrás do braço.
  function figuraEmAquarela(ctx, x, y, h, carga, semente) {
    const s = h / 300;
    const T = (k) => { k.translate(x, y); k.scale(s, s); k.transform(1, 0, -0.07, 1, 0, 0); };
    const P = (d) => new Path2D(d);
    const pinta = (d, cor, alfa, macio, n, beira = 0.7, variar) => aguada(ctx, P(d), cor, { alfa, macio, beira, transformar: T, semente: semente + n, variar });
    // a sombra no chão
    pinta('M-70 -2 C-40 -12 60 -12 90 -2 C60 8 -40 8 -70 -2 Z', '#8f8a7c', 0.3, 7, 1);
    // os pés: um no chão, o outro saindo (só o calcanhar e a sola)
    pinta('M-26 -4 C-26 -12 -12 -14 -6 -10 L-6 -2 Z M10 -14 C12 -22 26 -22 28 -14 L26 -8 C20 -10 14 -10 10 -10 Z', '#4f493f', 0.8, 0.8, 2);
    // a túnica, de costas, abrindo para a barra, com o passo marcando um lado
    const tunica = 'M-9 -250 C-20 -246 -32 -240 -36 -226 C-40 -180 -46 -104 -52 -12 C-30 -4 20 -2 48 -12 C44 -100 42 -176 38 -226 C34 -240 22 -246 9 -250 C4 -252 -4 -252 -9 -250 Z';
    pinta(tunica, '#cfc6b1', 0.95, 0.6, 3, 1.5, [-30, -200, 40, -60]);
    pinta('M18 -236 C30 -200 34 -120 38 -14 L48 -12 C44 -100 42 -176 38 -226 C34 -238 26 -244 18 -236 Z', '#978d78', 0.55, 2.2, 15);
    // as dobras: a perna que avança, o meio das costas e a sombra da barra
    pinta('M-14 -130 C-16 -90 -20 -50 -26 -8 L-16 -6 C-12 -50 -12 -90 -14 -130 Z', '#8f8878', 0.5, 1.6, 4, 1.2);
    pinta('M8 -150 C12 -100 18 -50 26 -10 L34 -10 C26 -52 18 -100 8 -150 Z', '#8f8878', 0.45, 1.6, 5, 1.2);
    pinta('M-50 -12 C-30 -4 20 -2 48 -12 L46 -22 C20 -12 -30 -14 -48 -22 Z', '#8a8373', 0.45, 2.5, 6);
    // o manto: desce do ombro direito, cruza as costas até o quadril esquerdo e cai
    const manto = 'M12 -250 C30 -244 40 -230 42 -200 C44 -150 46 -100 48 -60 C38 -56 30 -58 26 -64 C24 -86 22 -104 20 -122 C2 -116 -20 -122 -36 -138 C-24 -170 -10 -222 12 -250 Z';
    pinta(manto, '#a59a82', 0.78, 0.6, 7, 1.6, [30, -240, -30, -100]);
    pinta('M-34 -140 C-16 -126 4 -122 20 -126 L20 -118 C2 -112 -20 -118 -38 -134 Z', '#6b6150', 0.45, 1.5, 8);
    pinta('M34 -200 C38 -150 42 -110 46 -64 L48 -60 C46 -100 44 -150 40 -200 Z', '#6b6150', 0.4, 1.5, 9);
    pinta('M2 -220 C-6 -190 -14 -160 -22 -136 L-16 -134 C-8 -160 0 -190 6 -218 Z', '#7c725f', 0.35, 1.5, 16);
    // a carga no ombro, atrás do braço e da cabeça
    if (carga) carga();
    // o braço direito erguido, a manga larga caindo, a mão na carga
    pinta('M24 -236 C36 -240 44 -252 46 -268 C48 -276 40 -280 36 -274 C34 -262 28 -254 18 -248 Z', '#aea791', 0.95, 1.2, 10, 0.8);
    pinta('M42 -270 C42 -280 50 -286 56 -280 C58 -274 52 -268 46 -268 Z', '#b3a48c', 0.9, 1, 11);
    // a cabeça de costas: só o cabelo, comprido, caindo entre os ombros
    pinta('M-13 -268 C-14 -284 -6 -292 1 -292 C10 -292 15 -284 14 -268 C14 -256 12 -242 8 -232 C3 -229 -4 -229 -8 -232 C-12 -242 -13 -256 -13 -268 Z', '#463f35', 0.9, 1.1, 12, 0.8, [-10, -290, 10, -230]);
  }
  // Deus do impossível: a arte é do próprio dono (a estampa da camiseta dele, que ele fez e
  // liberou): Jesus de costas, de túnica branca e manto vermelho, com a coroa em traço acima da
  // cabeça, andando nas pedras e levando na mão o IM que se esfarela; embaixo, POSSÍVEL gasto.
  // A foto (story-foto-impossivel) é a estampa recortada do tecido, com fundo transparente,
  // grande no meio do papel bege quente, perto da cor da camiseta. "Deus do" em Literata
  // itálica no vão à esquerda, acima do IM, para ler "Deus do IMPOSSÍVEL", e Lucas 1.37 limpo
  // embaixo (a linha da referência da estampa, ilegível, ficou fora do recorte). O vermelho do
  // manto e a figura são exceções do dono. Sem a foto, sai a ilustração de antes.
  function arteImpossivel(ctx, fotos) {
    const img = fotos && fotos.impossivel;
    if (!img) { arteImpossivelDesenho(ctx); return; }
    const r = sorteio(1740);
    fundoPapel(ctx, '#e9dcc4', 1740);
    manchas(ctx, r, 16, { aClaro: 0.08, aEscuro: 0.035, claro: '255,250,238', escuro: '120,98,66' });
    const tinta = '#25221c';
    // entre os dias (até ~465) e a marca (de ~1550): a estampa até ~1435 e a referência embaixo
    const w = 790;
    const h = w * img.height / img.width;
    const x = (L - w) / 2;
    const y = 486;
    ctx.drawImage(img, x, y, w, h);
    // a medida da estampa (920 de largura no arquivo): o IM começa a ~17% da largura e a ~43%
    // da altura; o vão acima dele, à esquerda do braço, recebe o "Deus do"
    S.escrever(ctx, 'Deus do', x + w * 0.27, y + h * 0.385, 'italic 600 72px Literata, Georgia, serif', tinta, { alinhar: 'right' });
    // Lucas 1.37 embaixo de POSSÍVEL (o meio da palavra fica a ~58% da largura), entre fios
    const cx = x + w * 0.575;
    const yr = y + h + 44;
    referencia(ctx, 'Lucas 1.37', cx, yr, 30, '#4b463c');
    ctx.font = '700 30px Oswald, sans-serif';
    const wr = ctx.measureText('LUCAS 1.37').width + 30 * 0.16 * 9;
    ctx.fillStyle = 'rgba(75,70,60,.75)';
    ctx.fillRect(cx - wr / 2 - 26 - 90, yr - 12, 90, 2);
    ctx.fillRect(cx + wr / 2 + 26, yr - 12, 90, 2);
  }
  // A ilustração de antes, para quando a foto da estampa não chega: IMPOSSÍVEL escrito no
  // papel claro e o IM tirado da palavra, levado no ombro por uma figura pequena de Jesus em
  // aquarela, andando para fora: sem o IM, fica POSSÍVEL. "Deus do" em Literata itálica, a
  // referência à mão. Fechamento: o IM indo embora (e a marca fraca de onde ele estava).
  function arteImpossivelDesenho(ctx) {
    const r = sorteio(1740);
    fundoPapel(ctx, '#efeae0', 1740);
    manchas(ctx, r, 18, { aClaro: 0.10, aEscuro: 0.03, claro: '255,253,245', escuro: '120,105,80' });
    const tinta = '#2d2a22';
    const fonte = (t) => '500 ' + t + 'px Literata, Georgia, serif';
    const esp = 0.06;
    const tP = caber(ctx, 'IMPOSSÍVEL', fonte, 940, 220, esp);
    const base = 1170;
    const wTudo = larguraDe(ctx, 'IMPOSSÍVEL', fonte(tP), tP * esp);
    const wIM = larguraDe(ctx, 'IM', fonte(tP), tP * esp) + tP * esp;
    const x0 = (L - wTudo) / 2;
    S.escrever(ctx, 'Deus do', x0 + wTudo - 6, base - tP * 0.98, 'italic 500 84px Literata, Georgia, serif', tinta, { alinhar: 'right' });
    // a marca fraca de onde o IM estava
    ctx.save();
    ctx.globalAlpha = 0.07;
    S.escrever(ctx, 'IM', x0, base, fonte(tP), tinta, { alinhar: 'left', espaco: tP * esp });
    ctx.restore();
    // POSSÍVEL, em tinta, com a tinta falhando de leve
    const { c, ctx: k } = camada();
    S.escrever(k, 'POSSÍVEL', x0 + wIM, base, fonte(tP), tinta, { alinhar: 'left', espaco: tP * esp });
    gastar(c, { x: 0, y: base - tP, w: L, h: tP * 1.2 }, { pontos: 900, manchas: 0, riscos: 0, semente: 1741, forca: 0.3 });
    ctx.drawImage(c, 0, 0);
    // a figura anda na linha de base da palavra, saindo pela esquerda com o IM no ombro
    const fx = 160;
    const fy = base + 2;
    const h = 290;
    figuraEmAquarela(ctx, fx, fy, h, () => {
      ctx.save();
      ctx.translate(fx + h * 0.03, fy - h * 0.80);
      ctx.rotate(-0.26);
      ctx.shadowColor = 'rgba(60,50,30,.22)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 8;
      S.escrever(ctx, 'IM', 0, 0, fonte(tP * 0.86), tinta, { alinhar: 'left', espaco: tP * esp });
      ctx.restore();
    }, 1742);
    ctx.fillStyle = '#5c5a52';
    aMao(ctx, 'Lucas 1.37', x0 + wTudo - 4, base + 96, 46, r, { alinhar: 'right' });
  }
  // Um ponto de fogo: o miolo branco, quase uma chama de vela pequena (a gota de luz), o
  // halo amarelo que vaza em volta e o risco de brilho na horizontal, tudo somando luz.
  function pontoDeFogo(ctx, x, y, R) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 2.4);
    halo.addColorStop(0, 'rgba(255,196,77,.55)');
    halo.addColorStop(0.35, 'rgba(255,170,50,.22)');
    halo.addColorStop(1, 'rgba(255,150,40,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - R * 2.4, y - R * 2.4, R * 4.8, R * 4.8);
    // o risco de brilho
    const risco = ctx.createLinearGradient(x - R * 2.6, 0, x + R * 2.6, 0);
    risco.addColorStop(0, 'rgba(255,220,150,0)');
    risco.addColorStop(0.5, 'rgba(255,236,190,.55)');
    risco.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = risco;
    ctx.fillRect(x - R * 2.6, y - 2.5, R * 5.2, 5);
    // a gota de luz: a chama pequena, de ponta para cima, com o miolo branco
    ctx.filter = 'blur(' + (R * 0.08).toFixed(1) + 'px)';
    const gota = new Path2D();
    gota.moveTo(x, y - R * 0.95);
    gota.bezierCurveTo(x + R * 0.18, y - R * 0.5, x + R * 0.42, y - R * 0.05, x + R * 0.36, y + R * 0.28);
    gota.bezierCurveTo(x + R * 0.3, y + R * 0.55, x - R * 0.3, y + R * 0.55, x - R * 0.36, y + R * 0.28);
    gota.bezierCurveTo(x - R * 0.42, y - R * 0.05, x - R * 0.18, y - R * 0.5, x, y - R * 0.95);
    const g = ctx.createRadialGradient(x, y + R * 0.15, 0, x, y, R * 0.8);
    g.addColorStop(0, 'rgba(255,255,245,1)');
    g.addColorStop(0.45, 'rgba(255,226,150,.95)');
    g.addColorStop(1, 'rgba(255,170,40,.4)');
    ctx.fillStyle = g;
    ctx.fill(gota);
    ctx.filter = 'none';
    ctx.restore();
  }
  // Fogo em teus olhos fez eu me apaixonar: no preto, FOGO enorme e OLHOS enorme em Oswald
  // creme, e dentro dos dois O de OLHOS um ponto de luz que queima, com o halo vazando na
  // letra e o calor fraco no escuro. "EM TEUS" numa etiqueta creme entre as duas, e embaixo o
  // fecho em Literata itálica: "fez eu me" pequeno e "apaixonar." maior. Sem referência nem
  // citação (o dono pediu a frase assim). Nada de olho desenhado. Fechamento: os dois pontos
  // de fogo.
  function arteOlhos(ctx) {
    const r = sorteio(1750);
    ctx.fillStyle = '#0b0b0a';
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 24, { aClaro: 0.03, aEscuro: 0.06, claro: '230,225,210', escuro: '0,0,0' });
    const os = (t) => oswaldLP(t, 700);
    const x0 = 84;
    const larg = L - 2 * x0;
    let tF = caber(ctx, 'FOGO', os, larg, 460, -0.01);
    ctx.font = os(tF);
    tF *= Math.min(1, 272 / ctx.measureText('F').actualBoundingBoxAscent);
    ctx.font = os(tF);
    const capF = ctx.measureText('F').actualBoundingBoxAscent;
    const yF = 560 + capF;
    S.escrever(ctx, 'FOGO', x0 - 6, yF, os(tF), LP.creme, { alinhar: 'left', espaco: -tF * 0.01 });
    // OLHOS, com o mesmo corpo
    let tO = caber(ctx, 'OLHOS', os, larg, 460, -0.01);
    ctx.font = os(tO);
    tO *= Math.min(1, 240 / ctx.measureText('O').actualBoundingBoxAscent);
    ctx.font = os(tO);
    const capO = ctx.measureText('O').actualBoundingBoxAscent;
    const yO = yF + 104 + capO;
    // o calor dos olhos no escuro em volta da palavra
    const quente = ctx.createRadialGradient(L / 2, yO - capO / 2, 0, L / 2, yO - capO / 2, 620);
    quente.addColorStop(0, 'rgba(255,170,50,.13)');
    quente.addColorStop(1, 'rgba(255,170,50,0)');
    ctx.fillStyle = quente;
    ctx.fillRect(0, 0, L, A);
    S.escrever(ctx, 'OLHOS', x0 - 6, yO, os(tO), LP.creme, { alinhar: 'left', espaco: -tO * 0.01 });
    // a etiqueta EM SEUS, torta, entre as duas palavras, à direita
    ctx.save();
    ctx.translate(L - x0 - 150, yF + 56);
    ctx.rotate(-0.06);
    ctx.fillStyle = LP.creme;
    ctx.fillRect(-150, -42, 300, 84);
    S.escrever(ctx, 'EM TEUS', 0, 24, os(66), '#0b0b0a', { espaco: 3 });
    ctx.restore();
    // os olhos: o meio de cada O de OLHOS
    ctx.font = os(tO);
    const esp = -tO * 0.01;
    const meioDe = (antes, letra) => x0 - 6 + ctx.measureText(antes).width + esp * antes.length + ctx.measureText(letra).width / 2;
    const wO = ctx.measureText('O').width;
    for (const antes of ['', 'OLH']) pontoDeFogo(ctx, meioDe(antes, 'O'), yO - capO / 2, wO * 0.24);
    // o fecho: "fez eu me" pequeno e "apaixonar." maior, em itálica, alinhados à esquerda
    const ita = (t) => 'italic 400 ' + t + 'px Literata, Georgia, serif';
    S.escrever(ctx, 'fez eu me', x0 + 4, yO + 100, ita(60), '#d9d5c4', { alinhar: 'left' });
    const tA = caber(ctx, 'apaixonar.', ita, larg * 0.82, 130);
    const quente2 = ctx.createRadialGradient(x0 + 300, yO + 200, 0, x0 + 300, yO + 200, 420);
    quente2.addColorStop(0, 'rgba(255,170,50,.07)');
    quente2.addColorStop(1, 'rgba(255,170,50,0)');
    ctx.fillStyle = quente2;
    ctx.fillRect(0, 0, L, A);
    S.escrever(ctx, 'apaixonar.', x0 - 2, yO + 100 + tA * 0.95, ita(tA), LP.creme, { alinhar: 'left' });
  }
  // Um texto que dá a volta inteira no círculo, começando no alto e indo no sentido do
  // relógio, com o espaço entre as letras ajustado para fechar a volta.
  function anelDeTexto(ctx, texto, cx, cy, raio, fonte, cor) {
    ctx.save();
    ctx.font = fonte;
    ctx.fillStyle = cor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const letras = [...texto];
    const larg = letras.map((l) => ctx.measureText(l).width);
    const soma = larg.reduce((a, b) => a + b, 0);
    const extra = (Math.PI * 2 * raio - soma) / letras.length;
    let a = -Math.PI / 2;
    letras.forEach((l, i) => {
      const passo = (larg[i] + extra) / raio;
      const meio = a + passo / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(meio) * raio, cy + Math.sin(meio) * raio);
      ctx.rotate(meio + Math.PI / 2);
      ctx.fillText(l, 0, 0);
      ctx.restore();
      a += passo;
    });
    ctx.restore();
  }
  // O relevo seco: o desenho (na camada m, em qualquer cor) vira papel levantado, com a luz
  // de cima à esquerda (a beirada clara) e a sombra de baixo à direita. fundo: rebaixado
  // (o contrário, como um carimbo prensado).
  function relevoSeco(ctx, m, cor, { altura = 3, fundo = false, sombra = 'rgba(40,52,18,.55)', luz = 'rgba(250,255,232,.85)' } = {}) {
    const d = fundo ? -1 : 1;
    const pinta = (dx, dy, c, borra) => {
      const { c: t, ctx: k } = camada();
      k.filter = 'blur(' + borra + 'px)';
      k.drawImage(m, dx, dy);
      k.filter = 'none';
      k.globalCompositeOperation = 'source-in';
      k.fillStyle = c;
      k.fillRect(0, 0, L, A);
      ctx.drawImage(t, 0, 0);
    };
    pinta(altura * d, altura * d, sombra, altura * 0.9);
    pinta(-altura * 0.8 * d, -altura * 0.8 * d, luz, altura * 0.6);
    pinta(0, 0, cor, 0.6);
  }
  // Venha o seu reino.: o selo em relevo seco no cartão sálvia grosso, como o selo de um
  // documento: o disco levantado, a volta de contas, o anel com a continuação do versículo
  // (Mateus 6.10, NBV: "Que a sua vontade seja feita aqui na terra, como é feita no céu.")
  // entre pontos, e no meio VENHA O / SEU REINO. em Literata, prensado e com tinta. Tudo no
  // mesmo papel: só a luz rasante mostra o desenho. Diferente do círculo de Jesus salva (a
  // letra inchada em tinta no amarelo). Fechamento: as contas e os pontos do anel.
  function arteReino(ctx) {
    const r = sorteio(1760);
    const papel = '#c6d68a';
    ctx.fillStyle = papel;
    ctx.fillRect(0, 0, L, A);
    const luzJanela = ctx.createLinearGradient(0, 0, L, A);
    luzJanela.addColorStop(0, 'rgba(250,255,230,.30)');
    luzJanela.addColorStop(0.6, 'rgba(250,255,230,0)');
    luzJanela.addColorStop(1, 'rgba(50,62,20,.20)');
    ctx.fillStyle = luzJanela;
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 30, { aClaro: 0.06, aEscuro: 0.04, claro: '250,255,235', escuro: '60,72,25' });
    for (let i = 0; i < 900; i++) {
      ctx.strokeStyle = r() < 0.6 ? 'rgba(60,72,25,' + (0.05 + r() * 0.08).toFixed(3) + ')' : 'rgba(250,255,235,' + (0.1 + r() * 0.15).toFixed(3) + ')';
      ctx.lineWidth = 0.7 + r() * 0.8;
      const x = r() * L;
      const y = r() * A;
      const a = r() * Math.PI;
      const c = 5 + r() * 16;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * c * 0.5 + r() * 3, y + Math.sin(a) * c * 0.5 + r() * 3, x + Math.cos(a) * c, y + Math.sin(a) * c);
      ctx.stroke();
    }
    const cx = L / 2;
    const cy = 1020;
    const R = 400;
    // 1) o disco inteiro, levantado de leve, com a borda em ondas miúdas (a prensa)
    const disco = camada();
    disco.ctx.fillStyle = '#000';
    disco.ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const t = i / 240 * Math.PI * 2;
      const rr = R + Math.cos(t * 60) * 5;
      const x = cx + Math.cos(t) * rr;
      const y = cy + Math.sin(t) * rr;
      if (i) disco.ctx.lineTo(x, y); else disco.ctx.moveTo(x, y);
    }
    disco.ctx.closePath();
    disco.ctx.fill();
    relevoSeco(ctx, disco.c, '#cad991', { altura: 6 });
    // 2) os filetes, as contas e o anel de texto, mais altos
    const anel = camada();
    const k = anel.ctx;
    k.strokeStyle = '#000';
    k.fillStyle = '#000';
    for (const [rr, w] of [[R - 26, 5], [R - 112, 3], [R - 124, 7]]) {
      k.lineWidth = w;
      k.beginPath();
      k.arc(cx, cy, rr, 0, Math.PI * 2);
      k.stroke();
    }
    for (let i = 0; i < 96; i++) {
      const t = i / 96 * Math.PI * 2;
      k.beginPath();
      k.arc(cx + Math.cos(t) * (R - 44), cy + Math.sin(t) * (R - 44), 4.2, 0, Math.PI * 2);
      k.fill();
    }
    anelDeTexto(k, 'QUE A SUA VONTADE SEJA FEITA AQUI NA TERRA, COMO É FEITA NO CÉU.  •  MATEUS 6.10  •  ', cx, cy, R - 96, '500 30px Oswald, sans-serif', '#000');
    relevoSeco(ctx, anel.c, '#d0de98', { altura: 3 });
    // 3) o meio prensado (rebaixado) e com tinta: VENHA O / SEU REINO.
    const meio = camada();
    const lit = (t) => '600 ' + t + 'px Literata, Georgia, serif';
    const tV = caber(meio.ctx, 'SEU REINO.', lit, R * 1.25, 110, 0.02);
    S.escrever(meio.ctx, 'VENHA O', cx, cy - 14, lit(tV), '#000', { espaco: tV * 0.04 });
    S.escrever(meio.ctx, 'SEU REINO.', cx, cy + tV * 0.98, lit(tV), '#000', { espaco: tV * 0.02 });
    // os ramos de pontos acima e abaixo do texto
    for (const [y, n] of [[cy - tV * 1.25, 5], [cy + tV * 1.48, 5]]) {
      for (let i = 0; i < n; i++) {
        meio.ctx.beginPath();
        meio.ctx.arc(cx + (i - (n - 1) / 2) * 26, y, i === (n - 1) / 2 ? 6 : 3.5, 0, Math.PI * 2);
        meio.ctx.fill();
      }
    }
    relevoSeco(ctx, meio.c, '#25301a', { altura: 2.2, fundo: true, sombra: 'rgba(30,40,12,.6)', luz: 'rgba(245,252,225,.9)' });
  }
  // Ruído de valor suave (com semente): a textura das pedras. Devolve n(x, y) de 0 a 1, com
  // várias oitavas somadas.
  function ruidoSuave(semente) {
    const r = sorteio(semente);
    const T = 256;
    const tab = Array.from({ length: T * T }, () => r());
    const v = (x, y) => {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = x - ix;
      const fy = y - iy;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const g = (a, b) => tab[((b & (T - 1)) * T) + (a & (T - 1))];
      const a0 = g(ix, iy) + (g(ix + 1, iy) - g(ix, iy)) * sx;
      const a1 = g(ix, iy + 1) + (g(ix + 1, iy + 1) - g(ix, iy + 1)) * sx;
      return a0 + (a1 - a0) * sy;
    };
    return (x, y) => (v(x / 38, y / 38) * 0.5 + v(x / 13, y / 13) * 0.3 + v(x / 4, y / 4) * 0.2);
  }
  // Uma pedra lavrada à mão: o polígono com as quinas lascadas e as beiras irregulares.
  function contornoDePedra(x0, y0, x1, y1, r, lasca = 5) {
    const pts = [];
    const m = () => (r() - 0.5) * lasca;
    const lado = (ax, ay, bx, by, n) => {
      for (let i = 0; i < n; i++) {
        const t = i / n;
        pts.push([ax + (bx - ax) * t + m(), ay + (by - ay) * t + m()]);
      }
    };
    const c = 6 + r() * 6;
    lado(x0 + c, y0, x1 - c, y0, 3);
    lado(x1 - c, y0, x1, y0 + c, 1);
    lado(x1, y0 + c, x1, y1 - c, 2);
    lado(x1, y1 - c, x1 - c, y1, 1);
    lado(x1 - c, y1, x0 + c, y1, 3);
    lado(x0 + c, y1, x0, y1 - c, 1);
    lado(x0, y1 - c, x0, y0 + c, 2);
    lado(x0, y0 + c, x0 + c, y0, 1);
    return curvaSuave(pts, true, 6);
  }
  // O altar de pedras lavradas, visto de três quartos e de leve de cima: a frente em fiadas
  // de blocos desencontrados, o lado direito recuando na sombra, o tampo de laje e os quatro
  // chifres nos cantos. A luz é a do fogo em cima: amarela no tampo e nas quinas de cima de
  // cada pedra, sumindo para baixo; o rejunte fica escuro entre as pedras. A textura vem de
  // um ruído suave multiplicado na pedra, com as lascas e as rachaduras finas.
  function altarDePedra(ctx, x0, x1, yT, yB, fundoX, fundoY, fogo, semente) {
    const r = sorteio(semente);
    const ruido = ruidoSuave(semente + 1);
    const { c, ctx: k } = camada();
    // a luz do fogo num ponto (0 a 1)
    const luz = (x, y) => Math.max(0.06, Math.min(1, 1.22 - Math.hypot((x - fogo[0]) * 0.75, (y - fogo[1]) * 1.25) / 330));
    const corDaPedra = (l, face) => {
      const base = misturaCor([30, 27, 23], [150, 136, 112], Math.pow(l, 1.3) * face);
      return misturaCor(base, [255, 196, 77], 0.18 * Math.pow(l, 2) * face);
    };
    const rgb = (cc) => 'rgb(' + cc.map(Math.round).join(',') + ')';
    // as faces, escuras (o rejunte aparece entre as pedras)
    const frente = new Path2D();
    frente.rect(x0, yT, x1 - x0, yB - yT);
    const lado = new Path2D();
    lado.moveTo(x1, yT);
    lado.lineTo(x1 + fundoX, yT - fundoY);
    lado.lineTo(x1 + fundoX, yB - fundoY);
    lado.lineTo(x1, yB);
    lado.closePath();
    const tampo = new Path2D();
    tampo.moveTo(x0, yT);
    tampo.lineTo(x0 + fundoX, yT - fundoY);
    tampo.lineTo(x1 + fundoX, yT - fundoY);
    tampo.lineTo(x1, yT);
    tampo.closePath();
    k.fillStyle = '#0d0c0a';
    k.fill(frente);
    k.fill(lado);
    k.fillStyle = '#1a1713';
    k.fill(tampo);
    const pedras = [];
    // a frente: fiadas de alturas diferentes, os blocos desencontrados
    const fiadas = [0, 0.3, 0.55, 0.8, 1].map((t) => yT + 26 + (yB - yT - 26) * t);
    for (let f = 0; f < fiadas.length - 1; f++) {
      let x = x0 - (f % 2 ? 50 + r() * 30 : r() * 20);
      while (x < x1) {
        const w = 70 + r() * 110;
        const a = Math.max(x0, x);
        const b = Math.min(x1, x + w);
        // cada pedra com a sua altura e o seu tom: lavradas à mão, nenhuma igual
        const sobe = (r() - 0.5) * 12;
        const desce = (r() - 0.5) * 10;
        if (b - a > 26) pedras.push({ p: contornoDePedra(a + 3, fiadas[f] + 4 + sobe, b - 3, fiadas[f + 1] - 4 + desce, r, 11), face: 0.8 + r() * 0.3, x: (a + b) / 2, y: fiadas[f] + 8, tom: r() });
        x += w;
      }
    }
    // a fiada de cima da frente: a borda grossa do tampo, uma pedra só, comprida
    pedras.push({ p: contornoDePedra(x0 - 6, yT - 4, x1 + 4, yT + 26, r, 3), face: 1.05, x: (x0 + x1) / 2, y: yT });
    // o lado: as mesmas fiadas, encolhidas na perspectiva
    for (let f = 0; f < fiadas.length - 1; f++) {
      const ya = fiadas[f];
      const yb2 = fiadas[f + 1];
      const p = new Path2D();
      const j = () => (r() - 0.5) * 4;
      const xm = x1 + fundoX * (0.35 + r() * 0.3);
      for (const [xa, xb] of [[x1 + 3, xm - 2], [xm + 2, x1 + fundoX - 3]]) {
        const da = (xa - x1) / fundoX * fundoY;
        const db = (xb - x1) / fundoX * fundoY;
        const q = curvaSuave([[xa + j(), ya - da + 4 + j()], [xb + j(), ya - db + 4 + j()], [xb + j(), yb2 - db - 4 + j()], [xa + j(), yb2 - da - 4 + j()]], true, 6);
        p.addPath(q.p);
      }
      pedras.push({ p: { p }, face: 0.45, x: x1 + fundoX / 2, y: ya });
    }
    // o tampo: a laje vista de cima, a parte mais clara (o fogo bate de cheio)
    pedras.push({ p: { p: tampo }, face: 1.25, x: (x0 + x1) / 2 + fundoX / 2, y: yT - fundoY / 2, tampo: true });
    // os chifres: de pedra, saindo dos quatro cantos, curvos para fora e para cima
    const chifre = (x, y, h, lado2) => {
      const p = curvaSuave([[x - 26, y + 6], [x - 24, y - h * 0.4], [x - 12 + lado2 * 6, y - h * 0.85], [x + lado2 * 10, y - h, 1], [x + 14 + lado2 * 4, y - h * 0.7], [x + 26, y - h * 0.3], [x + 26, y + 6]]);
      return p;
    };
    const chifres = [
      { p: chifre(x0 + fundoX + 24, yT - fundoY + 4, 58, -1), face: 0.8, x: x0 + fundoX + 24, y: yT - fundoY - 30 },
      { p: chifre(x1 + fundoX - 20, yT - fundoY + 4, 58, 1), face: 0.62, x: x1 + fundoX - 20, y: yT - fundoY - 30 },
    ];
    const chifresFrente = [
      { p: chifre(x0 + 26, yT + 8, 92, -1), face: 1, x: x0 + 26, y: yT - 40 },
      { p: chifre(x1 - 22, yT + 8, 92, 1), face: 0.85, x: x1 - 22, y: yT - 40 },
    ];
    const pintar = (lista) => {
      for (const pd of lista) {
        const l = luz(pd.x, pd.y);
        const g = k.createLinearGradient(0, pd.y - 30, 0, pd.y + 70);
        const tom = pd.tom === undefined ? 0.5 : pd.tom;
        const c0 = misturaCor(corDaPedra(Math.min(1, l * 1.15), pd.face), [96, 92, 84], 0.12 * tom);
        const c1 = misturaCor(corDaPedra(l * 0.42, pd.face), [20, 18, 16], 0.2);
        g.addColorStop(0, rgb(c0));
        g.addColorStop(1, rgb(c1));
        k.fillStyle = g;
        k.fill(pd.p.p);
        // as quinas: a de cima pega a luz do fogo, a de baixo fica na sombra
        k.save();
        k.clip(pd.p.p);
        k.filter = 'blur(1.6px)';
        k.lineWidth = 6;
        k.strokeStyle = 'rgba(255,214,140,' + (0.5 * l * pd.face).toFixed(3) + ')';
        k.translate(0, 3);
        k.stroke(pd.p.p);
        k.translate(0, -7);
        k.strokeStyle = 'rgba(0,0,0,.55)';
        k.lineWidth = 7;
        k.stroke(pd.p.p);
        k.restore();
      }
    };
    pintar(chifres);
    pintar(pedras);
    // a textura: o ruído multiplicado em toda a pedra, as lascas claras e as rachaduras
    const bx0 = Math.floor(x0 - 40);
    const by0 = Math.floor(yT - fundoY - 100);
    const bw = Math.ceil(x1 + fundoX + 40 - bx0);
    const bh = Math.ceil(yB + 10 - by0);
    const img = k.getImageData(bx0, by0, bw, bh);
    const d = img.data;
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const i = (y * bw + x) * 4;
        if (d[i + 3] === 0) continue;
        const n = ruido(x + bx0, y + by0);
        const f = 0.4 + 1.1 * n + (r() - 0.5) * 0.2;
        d[i] = Math.min(255, d[i] * f);
        d[i + 1] = Math.min(255, d[i + 1] * f);
        d[i + 2] = Math.min(255, d[i + 2] * f);
      }
    }
    k.putImageData(img, bx0, by0);
    pintar(chifresFrente);
    // as rachaduras e as marcas do cinzel
    k.save();
    k.lineCap = 'round';
    for (const pd of pedras.concat(chifresFrente)) {
      if (pd.tampo) continue;
      k.save();
      k.clip(pd.p.p);
      for (let i = 0; i < 3; i++) {
        let x = pd.x + (r() - 0.5) * 80;
        let y = pd.y + 6 + r() * 40;
        k.strokeStyle = 'rgba(0,0,0,' + (0.3 + r() * 0.3).toFixed(2) + ')';
        k.lineWidth = 0.8 + r() * 1.2;
        k.beginPath();
        k.moveTo(x, y);
        for (let s = 0; s < 5; s++) {
          x += (r() - 0.5) * 18;
          y += 3 + r() * 7;
          k.lineTo(x, y);
        }
        k.stroke();
      }
      // as marcas do cinzel: riscos curtos inclinados, claros onde a luz bate
      const l = luz(pd.x, pd.y);
      for (let i = 0; i < 14; i++) {
        const x = pd.x + (r() - 0.5) * 120;
        const y = pd.y + r() * 56;
        k.strokeStyle = r() < 0.5 ? 'rgba(255,226,170,' + (0.12 * l).toFixed(3) + ')' : 'rgba(0,0,0,.18)';
        k.lineWidth = 1.2;
        k.beginPath();
        k.moveTo(x, y);
        k.lineTo(x + 5, y - 7);
        k.stroke();
      }
      k.restore();
    }
    k.restore();
    // a sombra do altar no chão
    ctx.save();
    ctx.filter = 'blur(16px)';
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.beginPath();
    ctx.ellipse((x0 + x1 + fundoX) / 2 + 30, yB + 6, (x1 - x0) * 0.7, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(c, 0, 0);
    // a luz quente do fogo somada na pedra, forte no tampo e nas fiadas de cima
    const quente = camada();
    const gq = quente.ctx.createRadialGradient(fogo[0], fogo[1], 0, fogo[0], fogo[1], 330);
    gq.addColorStop(0, 'rgba(255,190,70,.55)');
    gq.addColorStop(0.5, 'rgba(255,170,50,.18)');
    gq.addColorStop(1, 'rgba(255,170,50,0)');
    quente.ctx.fillStyle = gq;
    quente.ctx.fillRect(0, 0, L, A);
    quente.ctx.globalCompositeOperation = 'destination-in';
    quente.ctx.drawImage(c, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    ctx.drawImage(quente.c, 0, 0);
    ctx.restore();
  }
  // O fogo vivo do altar: a luz que se espalha no escuro, a cama de brasas e lenha no tampo e
  // as chamas em camadas que somam luz (da de fora, âmbar e rala, até o miolo quase branco),
  // cada camada com línguas em S e as linhas finas de gravura que sobem por dentro delas.
  function fogoDoAltar(ctx, cx, yb, r) {
    // o brilho grande
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [raio, a] of [[600, 0.13], [320, 0.14], [160, 0.12]]) {
      const g = ctx.createRadialGradient(cx, yb - 110, 0, cx, yb - 110, raio);
      g.addColorStop(0, 'rgba(255,190,70,' + a + ')');
      g.addColorStop(1, 'rgba(255,170,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, L, A);
    }
    ctx.restore();
    // as camadas de fogo: cada uma com as suas línguas (nenhuma é cópia encolhida da outra),
    // da de fora, âmbar e mais macia, até o miolo quase branco
    const camadas = [
      { pontas: [[-150, 200, -1], [-112, 296, -1], [-52, 400, -1], [10, 446, 1], [70, 360, 1], [118, 280, 1], [150, 196, 1]], vales: [150, 220, 290, 280, 220, 160], meia: 136, cor: ['rgba(214,130,24,.1)', 'rgba(232,150,32,.92)', 'rgba(246,176,56,1)'], linhas: 'rgba(110,56,6,.5)', borra: 2.2, brilho: 34 },
      { pontas: [[-118, 210, -1], [-70, 318, -1], [-14, 372, 1], [44, 330, 1], [104, 230, 1]], vales: [150, 230, 250, 190], meia: 108, cor: ['rgba(246,176,56,.2)', 'rgba(255,196,77,.96)', 'rgba(255,214,120,1)'], linhas: 'rgba(190,110,20,.45)', borra: 1.6, brilho: 20 },
      { pontas: [[-80, 160, -1], [-30, 250, -1], [26, 270, 1], [76, 170, 1]], vales: [120, 180, 140], meia: 80, cor: ['rgba(255,220,130,.3)', 'rgba(255,234,172,1)', 'rgba(255,246,214,1)'], linhas: 'rgba(236,166,60,.45)', borra: 1.2, brilho: 12 },
      { pontas: [[-26, 90, -1], [8, 124, 1], [34, 80, 1]], vales: [70, 64], meia: 44, cor: ['rgba(255,250,232,.4)', 'rgba(255,252,240,.95)', 'rgba(255,255,250,1)'], linhas: null, borra: 3, brilho: 10 },
    ];
    for (const cm of camadas) {
      const forma = silhuetaDeChama(cx, yb, cm.pontas, cm.vales, cm.meia, 1, 30, 0);
      const alto = Math.max(...cm.pontas.map((p) => p[1]));
      const { c, ctx: k } = camada();
      const g = k.createLinearGradient(0, yb - alto - 20, 0, yb);
      g.addColorStop(0, cm.cor[0]);
      g.addColorStop(0.45, cm.cor[1]);
      g.addColorStop(1, cm.cor[2]);
      k.filter = 'blur(' + cm.borra + 'px)';
      k.fillStyle = g;
      k.fill(forma.p);
      k.filter = 'none';
      // as linhas de gravura: sobem de baixo, abrem em leque e seguem as línguas
      if (cm.linhas) {
        k.save();
        k.clip(forma.p);
        k.globalCompositeOperation = 'source-atop';
        const n = cm.pontas.length * 5;
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n;
          const ponta = cm.pontas[Math.min(cm.pontas.length - 1, Math.floor(u * cm.pontas.length))];
          const x0 = cx + (u - 0.5) * cm.meia * 1.5;
          const pts = pontosCubica([x0, yb + 10], [x0 + (u - 0.5) * 30, yb - ponta[1] * 0.3], [cx + ponta[0] * 0.92 - ponta[2] * 16, yb - ponta[1] * 0.62], [cx + ponta[0] + ponta[2] * 4, yb - ponta[1] * 0.93], 40);
          linhaDeBuril(k, pts, (x, y, t) => 1.6 * Math.sin(Math.PI * Math.min(1, t * 1.1)), cm.linhas);
        }
        k.restore();
      }
      ctx.save();
      ctx.shadowColor = 'rgba(255,180,60,.55)';
      ctx.shadowBlur = cm.brilho;
      ctx.drawImage(c, 0, 0);
      ctx.restore();
    }
    // as línguas soltas, que se desprendem do alto
    for (const [x, y, h, w] of [[-74, 410, 54, 20], [66, 390, 46, 17]]) {
      const p = new Path2D();
      p.moveTo(cx + x, yb - y + h);
      p.quadraticCurveTo(cx + x - w, yb - y + h * 0.5, cx + x + w * 0.2, yb - y);
      p.quadraticCurveTo(cx + x + w * 0.7, yb - y + h * 0.55, cx + x, yb - y + h);
      ctx.save();
      ctx.filter = 'blur(1.4px)';
      ctx.shadowColor = 'rgba(255,180,60,.6)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(246,176,56,.85)';
      ctx.fill(p);
      ctx.restore();
    }
    // as fagulhas subindo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < 30; i++) {
      const x = cx + (r() - 0.5) * 420;
      const y = yb - 300 - r() * 90;
      const a = 0.35 + r() * 0.6;
      ctx.strokeStyle = 'rgba(255,206,110,' + a.toFixed(2) + ')';
      ctx.lineWidth = 1.5 + r() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 10, y - 6 - r() * 12);
      ctx.stroke();
    }
    ctx.restore();
  }
  // A lenha e as brasas no tampo: toras escuras cruzadas, com a beira acesa e as rachaduras
  // de brasa, embaixo das chamas.
  function lenhaEmBrasa(ctx, cx, y, r) {
    const toras = [[-170, 6, 170, -1, 15], [-10, 12, 170, 1, 17], [-90, -8, 150, 0.4, 13]];
    for (const [dx, dy, comp, inc, raio] of toras) {
      ctx.save();
      ctx.translate(cx + dx, y + dy);
      ctx.rotate(inc * 0.12);
      const g = ctx.createLinearGradient(0, -raio, 0, raio);
      g.addColorStop(0, '#6a4a1e');
      g.addColorStop(0.35, '#2a1e12');
      g.addColorStop(1, '#0c0907');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(0, -raio, comp, raio * 2, raio);
      ctx.fill();
      // as rachaduras de brasa
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,170,50,.8)';
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const x = 10 + r() * (comp - 20);
        ctx.lineWidth = 1 + r();
        ctx.beginPath();
        ctx.moveTo(x, -raio * 0.8);
        ctx.quadraticCurveTo(x + 6, -raio * 0.4, x + 2, -raio * 0.1);
        ctx.stroke();
      }
      // a beira de cima acesa
      ctx.strokeStyle = 'rgba(255,190,70,.6)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(raio * 0.6, -raio + 1.5);
      ctx.lineTo(comp - raio * 0.6, -raio + 1.5);
      ctx.stroke();
      ctx.restore();
    }
  }
  // O fogo do altar deverá ser mantido continuamente aceso; não deve ser apagado.
  // (Levítico 6.13, NBV, o versículo inteiro): no escuro, um altar antigo de pedras lavradas
  // à mão, com os quatro chifres, a textura da pedra e a luz amarela do fogo batendo nas quinas
  // de cima, e sobre ele o fogo vivo, em camadas de línguas que somam luz, com as linhas de
  // gravura por dentro e a lenha em brasa embaixo. A frase em hierarquia: O fogo do altar /
  // deverá ser mantido em Literata itálica, CONTINUAMENTE ACESO; grande em Oswald amarela,
  // e não deve ser apagado. pequena embaixo. Diferente do coração em gravura de Deixa queimar
  // (tinta no papel) e dos pontos de luz de Fogo em teus olhos. Fechamento: a chama.
  function arteAltar(ctx) {
    const r = sorteio(1770);
    ctx.fillStyle = '#0e0d0b';
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 26, { aClaro: 0.02, aEscuro: 0.06, claro: '230,225,210', escuro: '0,0,0' });
    const cx = L / 2;
    const yT = 920;
    const x0 = 300;
    const x1 = 730;
    const fundoX = 64;
    const fundoY = 44;
    // o chão de terra onde o altar está, pegando um resto da luz
    const chao = ctx.createRadialGradient(cx + 20, 1150, 0, cx + 20, 1150, 520);
    chao.addColorStop(0, 'rgba(120,96,60,.22)');
    chao.addColorStop(1, 'rgba(120,96,60,0)');
    ctx.fillStyle = chao;
    ctx.fillRect(0, 980, L, 400);
    const yFogo = yT - fundoY / 2 + 4;
    altarDePedra(ctx, x0, x1, yT, 1146, fundoX, fundoY, [cx + 30, yFogo - 40], 1771);
    lenhaEmBrasa(ctx, cx + 20, yFogo - 6, r);
    fogoDoAltar(ctx, cx + 30, yFogo + 8, r);
    // a frase em hierarquia
    const ita = (t) => 'italic 400 ' + t + 'px Literata, Georgia, serif';
    const os = (t) => oswaldLP(t, 700);
    let y = 1238;
    S.escrever(ctx, 'O fogo do altar', cx, y, ita(54), LP.creme);
    y += 62;
    S.escrever(ctx, 'deverá ser mantido', cx, y, ita(54), LP.creme);
    const tC = caber(ctx, 'CONTINUAMENTE ACESO;', os, 800, 120, 0.03);
    ctx.font = os(tC);
    const capC = ctx.measureText('C').actualBoundingBoxAscent;
    y += 28 + capC;
    S.escrever(ctx, 'CONTINUAMENTE ACESO;', cx + tC * 0.015, y, os(tC), LP.amarelo, { espaco: tC * 0.03 });
    y += 64;
    S.escrever(ctx, 'não deve ser apagado.', cx, y, ita(46), '#c9c6b8');
    referencia(ctx, 'Levítico 6.13', cx, y + 52, 24, '#8f9084');
  }
  // ---------- décima primeira leva (rodada 18) ----------
  // O raso já não nos satisfaz (lema com Ezequiel 47.3-5: a água nos tornozelos, nos joelhos,
  // na cintura e, por fim, um rio que só se atravessa a nado). Vista de dentro da água: a
  // superfície em cima, clara e ondulada, com a rede de luz que a onda faz, os fachos de sol
  // descendo e sumindo no fundo verde-escuro, partículas em suspensão e bolhas subindo. A frase
  // afunda e engorda com a profundidade: "O raso" pequeno, em Literata itálica escura, no claro
  // de cima; JÁ NÃO NOS em Oswald média no meio; SATISFAZ enorme no escuro. Na direita, a régua
  // de profundidade com as quatro marcas do versículo; a última, A NADO, em amarelo, na altura
  // do SATISFAZ. Fundo novo na coleção (a água azul, a pedido do dono, em degradê do claro ao escuro), texto alinhado à
  // esquerda e sem palavra sublinhada. Fechamento: a marca amarela da régua.
  function superficieDaAgua(ctx, y0, y1, r) {
    // a rede de luz (cáusticas) feita pixel a pixel numa tela pequena e esticada
    const w = 270;
    const h = Math.round((y1 - y0) / 4);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const k = c.getContext('2d');
    const img = k.createImageData(w, h);
    const ondas = [];
    for (let i = 0; i < 5; i++) ondas.push([r() * Math.PI * 2, 0.1 + r() * 0.07, r() * Math.PI * 2]);
    for (let y = 0; y < h; y++) {
      // perto da linha d'água, as ondas se achatam (a superfície vista em ângulo)
      const fy = 1 + (1 - y / h) * 1.8;
      for (let x = 0; x < w; x++) {
        let s = 0;
        for (const [ang, f, fase] of ondas) s += Math.sin((x * Math.cos(ang) + y * fy * Math.sin(ang)) * f + fase);
        const v = Math.pow(Math.max(0, 1 - Math.abs(s) * 0.42), 4);
        const i = (y * w + x) * 4;
        img.data[i] = 236;
        img.data[i + 1] = 252;
        img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(255 * Math.min(1, v * 1.1) * (1 - y / h) ** 1.7);
      }
    }
    k.putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.filter = 'blur(1.2px)';
    ctx.drawImage(c, 0, y0, L, y1 - y0);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(c, 0, y0, L, y1 - y0);
    ctx.restore();
  }
  function fachosDeSol(ctx, r) {
    const c = S.tela();
    const k = c.getContext('2d');
    k.globalCompositeOperation = 'lighter';
    const fachos = [[150, 60, -0.06, 0.55], [330, 110, 0.04, 0.8], [470, 50, 0.1, 0.5], [600, 140, 0.16, 0.9], [790, 70, 0.24, 0.55], [930, 100, 0.3, 0.45]];
    for (const [x, larg, inc, forca] of fachos) {
      const comp = 1050 + r() * 350;
      const abre = larg * 2.4;
      const xf = x + inc * comp;
      const g = k.createLinearGradient(0, 0, 0, comp);
      g.addColorStop(0, 'rgba(214,250,255,' + (0.6 * forca).toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(150,226,240,' + (0.26 * forca).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(110,200,225,0)');
      k.fillStyle = g;
      k.beginPath();
      k.moveTo(x - larg / 2, 0);
      k.lineTo(x + larg / 2, 0);
      k.lineTo(xf + abre / 2, comp);
      k.lineTo(xf - abre / 2, comp);
      k.closePath();
      k.fill();
    }
    ctx.save();
    ctx.filter = 'blur(16px)';
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }
  function bolhas(ctx, r, x, y0, y1, n) {
    ctx.save();
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const y = y1 - t * (y1 - y0) - r() * 30;
      const bx = x + Math.sin(t * 9 + r()) * 18 + (r() - 0.5) * 16;
      const raio = 3 + (1 - t) * 6 + r() * 5;
      const a = 0.25 + (1 - t) * 0.35;
      ctx.strokeStyle = 'rgba(214,244,250,' + a.toFixed(2) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(bx, y, raio, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(245,253,255,' + (a + 0.2).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(bx - raio * 0.35, y - raio * 0.35, Math.max(1, raio * 0.25), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function reguaDeFundo(ctx, x, y0, y1, marcas) {
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(242,239,220,.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
    for (let y = y0, i = 0; y <= y1 + 0.5; y += 20, i++) {
      ctx.lineWidth = i % 5 ? 2 : 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - (i % 5 ? 12 : 24), y);
      ctx.stroke();
    }
    ctx.restore();
    for (const { y, texto, cor, forte } of marcas) {
      ctx.save();
      ctx.strokeStyle = cor;
      ctx.lineWidth = forte ? 8 : 4;
      ctx.beginPath();
      ctx.moveTo(x + (forte ? 4 : 2), y);
      ctx.lineTo(x - (forte ? 64 : 40), y);
      ctx.stroke();
      ctx.restore();
      S.escrever(ctx, texto, x - (forte ? 76 : 52), y + 8, oswaldLP(forte ? 26 : 22, forte ? 700 : 500), cor, { alinhar: 'right', espaco: forte ? 4 : 3 });
    }
  }
  function arteRaso(ctx) {
    const r = sorteio(1800);
    // a água (azul, a pedido do dono): água-marinha na superfície, azul-petróleo no meio e
    // quase preta no fundo
    const g = ctx.createLinearGradient(0, 0, 0, A);
    g.addColorStop(0, '#dcf6f4');
    g.addColorStop(0.14, '#9fdde0');
    g.addColorStop(0.3, '#5cb7c6');
    g.addColorStop(0.46, '#1b6c86');
    g.addColorStop(0.64, '#0b3550');
    g.addColorStop(1, '#040d18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 22, { y0: 400, aClaro: 0.035, aEscuro: 0.08, claro: '170,230,240', escuro: '0,12,24' });
    fachosDeSol(ctx, r);
    superficieDaAgua(ctx, 0, 520, r);
    // partículas em suspensão, mais visíveis onde a luz ainda chega
    for (let i = 0; i < 520; i++) {
      const y = 200 + r() * 1500;
      const a = (0.08 + r() * 0.3) * Math.max(0.25, 1 - Math.abs(y - 900) / 1100);
      ctx.fillStyle = 'rgba(214,244,250,' + a.toFixed(3) + ')';
      const s = 1 + r() * r() * 3;
      ctx.beginPath();
      ctx.arc(r() * L, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
    bolhas(ctx, r, 740, 720, 1060, 14);
    bolhas(ctx, r, 560, 1390, 1500, 5);
    const x = 90;
    // a frase afundando
    S.escrever(ctx, 'O raso', x, 688, 'italic 400 76px Literata, Georgia, serif', LP.tinta, { alinhar: 'left' });
    const tN = 112;
    S.escrever(ctx, 'JÁ NÃO NOS', x - 4, 1004, oswaldLP(tN, 600), LP.creme, { alinhar: 'left', espaco: 4 });
    const tS = caber(ctx, 'SATISFAZ', (t) => oswaldLP(t, 700), 790, 260, 0.01);
    ctx.save();
    ctx.shadowColor = 'rgba(120,210,235,.28)';
    ctx.shadowBlur = 40;
    S.escrever(ctx, 'SATISFAZ', x - 8, 1300, oswaldLP(tS, 700), LP.creme, { alinhar: 'left', espaco: tS * 0.01 });
    ctx.restore();
    referencia(ctx, 'Ezequiel 47.3-5', x, 1370, 26, '#8fd9e4', 'left');
    reguaDeFundo(ctx, 1000, 580, 1420, [
      { y: 660, texto: 'TORNOZELOS', cor: 'rgba(18,19,15,.8)' },
      { y: 860, texto: 'JOELHOS', cor: 'rgba(242,239,220,.8)' },
      { y: 1080, texto: 'CINTURA', cor: 'rgba(242,239,220,.8)' },
      { y: 1340, texto: 'A NADO', cor: LP.amarelo, forte: true },
    ]);
  }
  S.prepararArte = prepararArte;
  S.fundoCartaz = fundoCartaz;
  S.rodapeCartaz = rodapeCartaz;
  // Mantenha sua chama acesa (lema com Mateus 25.4). O dono pediu igual à referência que mandou
  // (2026-10-15): no cinza-claro, uma chama grande de papel vermelho recortado à mão, com as
  // línguas desencontradas, a beira serrilhada da tesoura e os rasgos claros por dentro; dentro
  // dela, MANTENHA SUA pequeno e CHAMA / ACESA enorme, em letra preta condensada feita à mão; na
  // base, as toras pretas de xilogravura com os veios e os anéis brancos. O vermelho é a exceção
  // pedida pelo dono para esta arte. Tudo redesenhado em canvas.
  // As medidas estão no espaço de 672 x 975 da referência, levado ao story por uma escala.
  const VERMELHO_PAPEL = '#e11d25';
  const CINZA_PAREDE = '#dcdcda';
  // Um contorno de curvas (cada uma [x0,y0, c1x,c1y, c2x,c2y, x1,y1]) amostrado em pontos, com a
  // beira tremida de papel cortado à tesoura.
  function recorteDePapel(ctx, curvas, r, tremor = 1.6) {
    ctx.beginPath();
    curvas.forEach((c, i) => {
      for (let k = 0; k <= 18; k++) {
        const t = k / 18;
        const u = 1 - t;
        const x = u * u * u * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6];
        const y = u * u * u * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t * t * t * c[7];
        const j = k === 0 || k === 18 ? 0 : tremor;
        const px = x + (r() - 0.5) * j * 2;
        const py = y + (r() - 0.5) * j * 2;
        if (i === 0 && k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    });
    ctx.closePath();
  }
  // Uma linha de letras condensadas "à mão": Oswald estreitada, cada letra com uma inclinação,
  // uma altura e um respiro um pouco diferentes.
  function letreiroAMao(ctx, texto, cx, base, alturaCap, largura, r, cor) {
    ctx.save();
    const tam = 100;
    ctx.font = '600 ' + tam + 'px Oswald, "Arial Narrow", sans-serif';
    const cap = ctx.measureText('H').actualBoundingBoxAscent;
    const sy = alturaCap / cap;
    const letras = [...texto];
    const larg = letras.map((l) => (l === ' ' ? tam * 0.22 : ctx.measureText(l).width));
    const vao = tam * 0.04;
    const total = larg.reduce((a, b) => a + b, 0) + vao * (letras.length - 1);
    const sx = largura / total;
    let x = cx - largura / 2;
    ctx.fillStyle = cor;
    ctx.strokeStyle = cor;
    ctx.lineJoin = 'miter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    letras.forEach((l, i) => {
      const w = larg[i] * sx;
      if (l !== ' ') {
        ctx.save();
        ctx.translate(x + w / 2, base + (r() - 0.5) * alturaCap * 0.03);
        ctx.rotate((r() - 0.5) * 0.05);
        ctx.scale(sx * (0.96 + r() * 0.08), sy * (0.97 + r() * 0.06));
        ctx.fillText(l, 0, 0);
        ctx.lineWidth = 2.2 / sx;
        ctx.strokeText(l, 0, 0);
        ctx.restore();
      }
      x += w + vao * sx;
    });
    ctx.restore();
  }
  // Uma tora de xilogravura: o corpo preto do topo de trás até a ponta da frente, os veios
  // brancos ao comprido e a ponta cortada com os anéis em espiral.
  function toraXilo(ctx, fx, fy, bx, by, rx, ry, r) {
    const ang = Math.atan2(by - fy, bx - fx);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const rb = 0.8;
    ctx.save();
    ctx.fillStyle = '#121212';
    ctx.beginPath();
    ctx.moveTo(fx + nx * rx, fy + ny * ry);
    ctx.lineTo(bx + nx * rx * rb, by + ny * ry * rb);
    ctx.lineTo(bx - nx * rx * rb, by - ny * ry * rb);
    ctx.lineTo(fx - nx * rx, fy - ny * ry);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bx, by, rx * rb, ry * rb, 0, 0, Math.PI * 2);
    ctx.fill();
    // os veios ao comprido, brancos e falhados
    ctx.strokeStyle = CINZA_PAREDE;
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const o = -0.8 + (i / 6) * 1.6;
      ctx.lineWidth = 1.2 + r() * 1.6;
      const t0 = 0.15 + r() * 0.25;
      const t1 = 0.7 + r() * 0.28;
      const x0 = fx + (bx - fx) * t0 + nx * rx * o * 0.9;
      const y0 = fy + (by - fy) * t0 + ny * ry * o * 0.9;
      const x1 = fx + (bx - fx) * t1 + nx * rx * o * 0.85;
      const y1 = fy + (by - fy) * t1 + ny * ry * o * 0.85;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2 + (r() - 0.5) * 6, (y0 + y1) / 2 + (r() - 0.5) * 6, x1, y1);
      ctx.stroke();
    }
    // a ponta cortada: preta, com a casca e os anéis brancos
    ctx.fillStyle = '#121212';
    ctx.beginPath();
    ctx.ellipse(fx, fy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CINZA_PAREDE;
    for (let k = 1; k <= 4; k++) {
      const f = k / 5;
      ctx.lineWidth = 1.6 + r();
      ctx.beginPath();
      ctx.ellipse(fx + (r() - 0.5) * 2, fy + (r() - 0.5) * 2, rx * f, ry * f, 0, r() * 1.5, Math.PI * 2 - r() * 0.8);
      ctx.stroke();
    }
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(fx, fy, rx - 3, ry - 3, 0, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();
  }
  function arteAcesa(ctx) {
    const r = sorteio(1820);
    ctx.fillStyle = CINZA_PAREDE;
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 26, { aClaro: 0.08, aEscuro: 0.03, claro: '255,255,255', escuro: '90,90,85' });
    const k = 1.35;
    ctx.save();
    ctx.translate(540 - 340 * k, 289);
    ctx.scale(k, k);
    // a chama de papel: a língua grande do meio, a da esquerda e a da direita, e o bojo embaixo
    const chama = [
      [176, 806, 120, 790, 66, 740, 50, 650],
      [50, 650, 40, 590, 52, 540, 44, 470],
      [44, 470, 70, 500, 86, 520, 100, 500],
      [100, 500, 110, 420, 160, 330, 212, 246],
      [212, 246, 222, 290, 230, 320, 244, 336],
      [244, 336, 240, 280, 226, 190, 248, 96],
      [248, 96, 300, 140, 350, 190, 372, 250],
      [372, 250, 392, 290, 404, 300, 424, 320],
      [424, 320, 456, 300, 494, 286, 522, 262],
      [522, 262, 528, 340, 566, 420, 604, 470],
      [604, 470, 646, 560, 640, 680, 596, 744],
      [596, 744, 560, 790, 520, 806, 470, 808],
      [470, 808, 380, 812, 260, 812, 176, 806],
    ];
    ctx.fillStyle = VERMELHO_PAPEL;
    recorteDePapel(ctx, chama, r);
    ctx.fill();
    // a lasquinha solta acima da língua da direita e a da esquerda
    for (const c of [[[318, 130, 340, 150, 352, 176, 350, 206], [350, 206, 336, 186, 322, 166, 318, 130]],
      [[518, 222, 528, 236, 534, 252, 530, 270], [530, 270, 522, 256, 516, 240, 518, 222]]]) {
      recorteDePapel(ctx, c, r, 0.8);
      ctx.fill();
    }
    // os rasgos claros por dentro, perto das beiras
    ctx.fillStyle = CINZA_PAREDE;
    for (const c of [
      [[120, 300, 150, 300, 180, 280, 196, 268], [196, 268, 170, 300, 140, 330, 108, 352], [108, 352, 112, 330, 116, 314, 120, 300]],
      [[60, 560, 74, 580, 84, 610, 88, 650], [88, 650, 76, 630, 64, 600, 60, 560]],
      [[64, 690, 80, 700, 96, 720, 104, 744], [104, 744, 88, 730, 74, 712, 64, 690]],
      [[560, 430, 584, 470, 596, 510, 596, 552], [596, 552, 582, 520, 568, 480, 560, 430]],
      [[330, 200, 350, 220, 364, 246, 366, 270], [366, 270, 350, 250, 336, 228, 330, 200]],
      [[600, 600, 612, 620, 616, 650, 610, 680], [610, 680, 604, 650, 600, 630, 600, 600]],
    ]) {
      recorteDePapel(ctx, c, r, 0.7);
      ctx.fill();
    }
    // a frase em letra preta condensada feita à mão
    // (numa camada própria, gasta como tinta de carimbo)
    const preto = '#141414';
    const { c: cl, ctx: kl } = camada();
    kl.setTransform(ctx.getTransform());
    letreiroAMao(kl, 'MANTENHA SUA', 346, 400, 44, 316, r, preto);
    letreiroAMao(kl, 'CHAMA', 344, 572, 150, 318, r, preto);
    letreiroAMao(kl, 'ACESA', 344, 748, 150, 316, r, preto);
    kl.setTransform(1, 0, 0, 1, 0, 0);
    gastar(cl, { x: 300, y: 740, w: 520, h: 600 }, { pontos: 500, manchas: 0, riscos: 30, semente: 1821, forca: 0.7 });
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(cl, 0, 0);
    ctx.restore();
    // as brasas vermelhas soltas na base
    ctx.strokeStyle = VERMELHO_PAPEL;
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    for (const [x0, y0, x1, y1] of [[150, 820, 186, 812], [158, 846, 196, 846], [496, 812, 530, 820], [494, 842, 534, 846]]) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    // as toras: as duas de fora primeiro, a do meio por cima
    toraXilo(ctx, 238, 866, 304, 790, 40, 32, r);
    toraXilo(ctx, 446, 864, 384, 790, 40, 32, r);
    toraXilo(ctx, 342, 878, 344, 786, 44, 34, r);
    ctx.restore();
  }
  // O mundo vende uma liberdade que aprisiona (sem referência). Como a referência do dono: o
  // fundo verde-oliva claro, a frase em letra de marcador preta (Permanent Marker), VENDE
  // circulado à mão e LIBERDADE sublinhado, os dois em vermelho de caneta. No alto, no lugar das
  // grades da referência (pedido do dono), o que o mundo vende, a lápis, como produtos numa
  // prateleira: a garrafa de cerveja com a etiqueta de preço, a taça de vinho, o celular cheio de
  // notificações, o cartão de crédito, as cápsulas e o cigarro com a fumaça. Tudo à mão em
  // canvas: cada traço repassado duas ou três vezes, tremido, com a hachura de lápis no lado da
  // sombra. O vermelho é o da referência, só nesta arte.
  const TINTA_LB = '#161613';
  const VERMELHO_LB = '#e0402e';
  // Uma linha em letra de marcador, letra por letra (como aMao); devolve onde cada palavra
  // começa e termina, para o círculo e o sublinhado.
  function linhaMarcador(ctx, texto, cx, y, tam, r, aperto = 1, alto = 1) {
    ctx.font = '400 ' + tam + 'px "Permanent Marker", cursive';
    const letras = [...texto];
    const larg = letras.map((l) => ctx.measureText(l).width * aperto);
    const total = larg.reduce((a, b) => a + b, 0);
    let px = cx - total / 2;
    const palavras = {};
    let atual = null;
    letras.forEach((l, i) => {
      if (l === ' ') atual = null;
      else {
        if (!atual) { atual = { de: px, ate: px }; palavras[texto.slice(i).split(' ')[0]] = atual; }
        atual.ate = px + larg[i];
      }
      ctx.save();
      ctx.translate(px + larg[i] / 2, y + (r() - 0.5) * tam * 0.06);
      ctx.rotate((r() - 0.5) * 0.1);
      ctx.scale(aperto, alto);
      ctx.fillStyle = TINTA_LB;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillText(l, -larg[i] / aperto / 2, 0);
      ctx.restore();
      px += larg[i];
    });
    return { total, palavras };
  }
  // ---------- a vitrine do mundo, a lápis ----------
  // Uma forma a lápis: o papel por dentro (cobre o que está atrás), a hachura do lado da sombra
  // (lado: 1 à direita, -1 à esquerda, 0 sem) e o contorno repassado duas ou três vezes, tremido.
  function formaLapis(ctx, pts, r, { lado = 1, fechar = true, papel = true, largura = 2.4, vezes = 3, densa = 0.75 } = {}) {
    const caminho = new Path2D();
    pts.forEach(([x, y], i) => (i ? caminho.lineTo(x, y) : caminho.moveTo(x, y)));
    if (fechar) caminho.closePath();
    if (fechar && papel) {
      ctx.fillStyle = '#d3d5a2';
      ctx.fill(caminho);
    }
    if (fechar && lado) {
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const y0 = Math.min(...ys);
      const y1 = Math.max(...ys);
      ctx.save();
      ctx.clip(caminho);
      ctx.strokeStyle = TINTA_LB;
      ctx.lineWidth = 1.3;
      for (let k = x0 - (y1 - y0); k < x1 + 10; k += 5 + r() * 1.5) {
        const meio = k + (y1 - y0) / 2;
        const u = (meio - x0) / Math.max(1, x1 - x0);
        const forca = lado > 0 ? (u - 0.45) / 0.55 : (0.55 - u) / 0.55;
        if (forca <= 0) continue;
        ctx.globalAlpha = Math.min(1, forca) * densa;
        ctx.beginPath();
        ctx.moveTo(k, y1 + 2);
        ctx.lineTo(k + (y1 - y0) + 4, y0 - 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = TINTA_LB;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let v = 0; v < vezes; v++) {
      ctx.lineWidth = largura * (0.7 + r() * 0.6);
      ctx.globalAlpha = 0.55 + r() * 0.4;
      ctx.beginPath();
      const lista = fechar ? pts.concat([pts[0]]) : pts;
      lista.forEach(([x, y], i) => {
        const jx = x + (r() - 0.5) * 2.2;
        const jy = y + (r() - 0.5) * 2.2;
        i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy);
      });
      ctx.stroke();
    }
    ctx.restore();
  }
  const elipsePts = (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 32) =>
    Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  // retângulo de cantos redondos, girado em volta do centro
  function caixaPts(cx, cy, w, h, raio, giro = 0) {
    const pts = [];
    const cantos = [[w / 2 - raio, -h / 2 + raio, -Math.PI / 2], [w / 2 - raio, h / 2 - raio, 0], [-w / 2 + raio, h / 2 - raio, Math.PI / 2], [-w / 2 + raio, -h / 2 + raio, Math.PI]];
    for (const [x, y, a] of cantos) for (let i = 0; i <= 6; i++) {
      const t = a + (Math.PI / 2) * i / 6;
      pts.push([x + Math.cos(t) * raio, y + Math.sin(t) * raio]);
    }
    const c = Math.cos(giro);
    const s = Math.sin(giro);
    return pts.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
  }
  // O que o mundo vende, como produtos na prateleira: a garrafa de cerveja com a etiqueta de
  // preço pendurada no gargalo, a taça de vinho, o celular cheio de notificações, o cartão de
  // crédito, as cápsulas e o cigarro com a fumaça. No espaço de 780 x 368 (o centro em x 0, a
  // prateleira em y 350).
  function vitrineLapis(ctx, r) {
    // a prateleira e a sombra dela
    formaLapis(ctx, [[-395, 350], [395, 350], [395, 362], [-395, 362]], r, { lado: 0 });
    // o cartão de crédito, encostado atrás das cápsulas
    const cartao = caixaPts(165, 286, 170, 108, 12, -0.12);
    formaLapis(ctx, cartao, r, { lado: 1, densa: 0.45 });
    formaLapis(ctx, caixaPts(118, 268, 34, 26, 5, -0.12), r, { lado: 0, vezes: 2, largura: 2 });
    for (const [x0, x1, y] of [[100, 230, 312], [100, 190, 328]]) {
      const c = Math.cos(-0.12);
      const s = Math.sin(-0.12);
      const p = (x, yy) => [165 + (x - 165) * c - (yy - 286) * s, 286 + (x - 165) * s + (yy - 286) * c];
      formaLapis(ctx, [p(x0, y), p(x1, y)], r, { fechar: false, vezes: 2, largura: 2 });
    }
    // a garrafa de cerveja
    const garrafa = [[-330, 350], [-334, 196], [-326, 168], [-306, 146], [-298, 120], [-298, 62], [-302, 56], [-302, 46],
      [-258, 46], [-258, 56], [-262, 62], [-262, 120], [-254, 146], [-234, 168], [-226, 196], [-230, 350]];
    formaLapis(ctx, garrafa, r, { lado: 1 });
    formaLapis(ctx, caixaPts(-280, 262, 96, 66, 4), r, { lado: 0, vezes: 2, largura: 2 });
    ctx.save();
    ctx.font = '400 30px "Permanent Marker", cursive';
    ctx.fillStyle = TINTA_LB;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.85;
    ctx.fillText('BEER', -280, 274);
    ctx.restore();
    // a taça de vinho: o bojo, o vinho no fundo dele, a haste e o pé
    formaLapis(ctx, elipsePts(-165, 150, 46, 84, 0, Math.PI, 22), r, { lado: 0 });
    formaLapis(ctx, elipsePts(-165, 150, 42, 80, 0.5, Math.PI - 0.5, 16), r, { lado: 1, densa: 0.95, vezes: 2, largura: 1.8 });
    formaLapis(ctx, [[-169, 232], [-170, 336], [-160, 336], [-161, 232]], r, { lado: 1 });
    formaLapis(ctx, elipsePts(-165, 340, 46, 10), r, { lado: 1 });
    // o celular de pé, com as notificações e o número no canto
    formaLapis(ctx, caixaPts(-20, 228, 128, 244, 18), r, { lado: 1, densa: 0.4 });
    formaLapis(ctx, caixaPts(-20, 232, 108, 204, 6), r, { lado: 0, vezes: 2, largura: 2 });
    for (const y of [166, 214, 262]) {
      formaLapis(ctx, caixaPts(-20, y, 92, 38, 8), r, { lado: 0, vezes: 2, largura: 2 });
      formaLapis(ctx, elipsePts(-52, y, 9, 9, 0, Math.PI * 2, 14), r, { lado: 0, vezes: 1, largura: 2 });
      formaLapis(ctx, [[-36, y - 6], [14, y - 6]], r, { fechar: false, vezes: 1, largura: 2.4 });
      formaLapis(ctx, [[-36, y + 6], [0, y + 6]], r, { fechar: false, vezes: 1, largura: 2 });
    }
    ctx.fillStyle = TINTA_LB;
    ctx.beginPath();
    ctx.arc(40, 108, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '400 26px "Permanent Marker", cursive';
    ctx.fillStyle = '#d3d5a2';
    ctx.textAlign = 'center';
    ctx.fillText('9+', 40, 118);
    // as cápsulas na frente, metade escura
    for (const [x, y, g] of [[84, 336, 0.25], [142, 340, -0.1], [200, 334, 0.4]]) {
      const cap = caixaPts(x, y, 58, 24, 12, g);
      formaLapis(ctx, cap, r, { lado: 0 });
      const c = Math.cos(g);
      const s = Math.sin(g);
      const meia = caixaPts(x + 14.5 * c, y + 14.5 * s, 29, 24, 11, g);
      ctx.save();
      ctx.fillStyle = TINTA_LB;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      meia.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.fill();
      ctx.restore();
    }
    // o cigarro deitado na ponta da prateleira, com a brasa e a fumaça subindo
    const cigarro = caixaPts(326, 338, 120, 20, 4, -0.06);
    formaLapis(ctx, cigarro, r, { lado: 0 });
    formaLapis(ctx, caixaPts(286, 340, 40, 20, 4, -0.06), r, { lado: -1, densa: 1 });
    ctx.save();
    ctx.fillStyle = TINTA_LB;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(384, 334, 4, 9, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const fumaca = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      fumaca.push([388 - t * 20 + Math.sin(t * 8) * 14 * t, 324 - t * 130]);
    }
    formaLapis(ctx, fumaca, r, { fechar: false, vezes: 2, largura: 2 });
    // a etiqueta de preço pendurada no gargalo, com o barbante
    formaLapis(ctx, [[-290, 100], [-310, 116], [-326, 138], [-336, 158]], r, { fechar: false, vezes: 2, largura: 1.8 });
    formaLapis(ctx, caixaPts(-346, 208, 74, 104, 9, 0.16), r, { lado: 1, densa: 0.35 });
    formaLapis(ctx, elipsePts(-338, 166, 6, 6, 0, Math.PI * 2, 12), r, { lado: 0, vezes: 2, largura: 1.8 });
    ctx.save();
    ctx.translate(-347, 214);
    ctx.rotate(0.16);
    ctx.font = '400 30px "Permanent Marker", cursive';
    ctx.fillStyle = TINTA_LB;
    ctx.textAlign = 'center';
    ctx.fillText('R$', 0, -6);
    ctx.font = '400 26px "Permanent Marker", cursive';
    ctx.fillText('0,99', 0, 28);
    ctx.restore();
  }

  function arteLiberdade(ctx) {
    const r = sorteio(1860);
    ctx.fillStyle = '#d3d5a2';
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 24, { aClaro: 0.06, aEscuro: 0.04, claro: '250,250,225', escuro: '110,110,60' });
    // a frase em letra de marcador, grande e de margem a margem (a Permanent Marker um pouco
    // apertada na largura e esticada na altura, como o marcador estreito da referência), em três
    // linhas de largura parecida
    const linhas = ['O MUNDO VENDE', 'UMA LIBERDADE', 'QUE APRISIONA.'];
    const aperto = 0.8;
    const alto = 1.26;
    ctx.font = '400 100px "Permanent Marker", cursive';
    const largMax = Math.max(...linhas.map((l) => [...l].reduce((s, c) => s + ctx.measureText(c).width, 0) * aperto));
    const tam = 100 * 960 / largMax;
    ctx.font = '400 ' + tam + 'px "Permanent Marker", cursive';
    const cap = ctx.measureText('M').actualBoundingBoxAscent * alto;
    const passo = cap * 1.3;
    const altoTexto = cap + passo * 2;
    // a pilha toda entre os dias (y 500) e a marca (y 1490): as grades em cima, a frase embaixo
    const topo = 505;
    const fim = 1478;
    const vaoMeio = 92;
    const altoGrade = fim - topo - altoTexto - vaoMeio;
    // a vitrine do mundo a lápis, no tamanho de sempre (368 de alto), ampliada para o espaço
    // que sobra entre os dias e a frase
    const s = Math.min(altoGrade / 368, 1000 / 800);
    ctx.save();
    ctx.translate(L / 2, topo + (altoGrade - 368 * s) / 2);
    ctx.scale(s, s);
    vitrineLapis(ctx, r);
    ctx.restore();
    const y1 = fim - altoTexto + cap;
    const l1 = linhaMarcador(ctx, linhas[0], L / 2, y1, tam, r, aperto, alto);
    const l2 = linhaMarcador(ctx, linhas[1], L / 2, y1 + passo, tam, r, aperto, alto);
    linhaMarcador(ctx, linhas[2], L / 2, y1 + passo * 2, tam, r, aperto, alto);
    // o círculo à mão em VENDE: duas voltas grossas que não fecham iguais, a caneta passando
    const v = l1.palavras.VENDE;
    const ccx = (v.de + v.ate) / 2 + 4;
    const ccy = y1 - cap * 0.5;
    const crx = (v.ate - v.de) / 2 + 14;
    const cry = cap * 0.7;
    ctx.save();
    ctx.strokeStyle = VERMELHO_LB;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let volta = 0; volta < 2; volta++) {
      ctx.lineWidth = 11 - volta * 3;
      ctx.beginPath();
      const a0 = -2.3 + volta * 0.3;
      const fimA = a0 + Math.PI * 2 + 0.5 - volta * 0.3;
      for (let a = a0; a <= fimA; a += 0.04) {
        const k = 1 + volta * 0.045 + 0.025 * Math.sin(a * 3 + volta);
        const x = ccx + Math.cos(a) * crx * k;
        const y = ccy + Math.sin(a) * cry * k - (a - a0) * 2.2;
        a === a0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // o sublinhado em LIBERDADE: um risco de caneta grosso, um pouco subindo
    const lb = l2.palavras.LIBERDADE;
    const yS = y1 + passo + cap * 0.14;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(lb.de - 4, yS + 6);
    ctx.bezierCurveTo(lb.de + (lb.ate - lb.de) * 0.3, yS - 2, lb.de + (lb.ate - lb.de) * 0.7, yS + 4, lb.ate + 10, yS - 4);
    ctx.stroke();
    ctx.restore();
  }

  // O maná pode até cair do céu, mas você ainda precisa sair da tenda para buscá-lo (lema, sem
  // referência). Como a referência do dono: a foto em preto e branco granulada, com a faixa de
  // luz atravessando na diagonal entre o escuro, e a frase em grotesca branca pesada (Manrope
  // 800), alinhada à esquerda, entrelinha apertada, enchendo a largura. A foto é feita aqui: as
  // manchas de luz desfocadas e o grão grosso de filme pixel a pixel. Por dentro da faixa de luz
  // cai o maná, flocos brancos miúdos, alguns fora de foco: o gancho, sem disputar com a frase.
  // A faixa nunca passa de um cinza médio atrás do texto (contraste AA do branco grande).
  function fotoGranulada(ctx, r) {
    // o escuro da foto e a faixa de luz na diagonal, do alto à direita para baixo à esquerda
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(0, 0, L, A);
    const luz = S.tela();
    const k = luz.getContext('2d');
    k.save();
    k.translate(L / 2, A / 2);
    k.rotate(-0.62);
    const faixa = k.createLinearGradient(0, -520, 0, 520);
    faixa.addColorStop(0, 'rgba(140,140,140,0)');
    faixa.addColorStop(0.25, 'rgba(140,140,140,.9)');
    faixa.addColorStop(0.45, 'rgba(150,150,150,1)');
    faixa.addColorStop(0.58, 'rgba(70,70,70,.6)');
    faixa.addColorStop(0.66, 'rgba(10,10,10,.9)');
    faixa.addColorStop(1, 'rgba(10,10,10,.95)');
    k.fillStyle = faixa;
    k.fillRect(-1400, -520, 2800, 1600);
    // um vinco mais claro e um mais escuro dentro da faixa, como dobra de tecido na foto
    k.fillStyle = 'rgba(150,150,150,.35)';
    k.fillRect(-1400, -120, 2800, 60);
    k.fillStyle = 'rgba(20,20,20,.4)';
    k.fillRect(-1400, 210, 2800, 90);
    k.restore();
    for (let i = 0; i < 30; i++) {
      const x = r() * L;
      const y = r() * A;
      const rr = 60 + r() * 220;
      const g = k.createRadialGradient(x, y, 0, x, y, rr);
      const claro = r() < 0.5;
      g.addColorStop(0, claro ? 'rgba(150,150,150,.18)' : 'rgba(0,0,0,.3)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      k.fillStyle = g;
      k.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    ctx.save();
    ctx.filter = 'blur(40px)';
    ctx.drawImage(luz, 0, 0);
    ctx.restore();
    // o grão grosso de filme: ruído em meia resolução, esticado e somado à luz
    const esc = 2;
    const w = L / esc;
    const h = A / esc;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const kc = c.getContext('2d');
    const img = kc.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.round(128 + (r() + r() + r() - 1.5) * 120);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    kc.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.42;
    ctx.drawImage(c, 0, 0, L, A);
    ctx.restore();
  }
  function arteMana(ctx) {
    const r = sorteio(1870);
    fotoGranulada(ctx, r);
    // a frase em grotesca branca pesada, alinhada à esquerda, enchendo a largura
    const linhas = ['O maná pode', 'até cair do céu,', 'mas você ainda', 'precisa sair da', 'tenda para', 'buscá-lo.'];
    const fonte = (t) => S.Mn(800, t);
    const espaco = (t) => -t * 0.045;
    const larguraDe = (txt, t) => {
      ctx.font = fonte(t);
      return ctx.measureText(txt).width + espaco(t) * (txt.length - 1);
    };
    const maior = Math.max(...linhas.map((l) => larguraDe(l, 100)));
    const tam = Math.min(150, 100 * 950 / maior);
    const passo = tam * 1.02;
    const altoBloco = passo * (linhas.length - 1) + tam * 0.74;
    const y0 = 540 + (940 - altoBloco) / 2 + tam * 0.74;
    // onde o maná não cai: os dias no alto, a marca no pé e cada linha da frase, com folga
    const livre = [[300, 260, 780, 480], [340, 1520, 760, 1640]];
    linhas.forEach((l, i) => {
      const yb = y0 + i * passo;
      livre.push([40, yb - tam * 0.86, 66 + larguraDe(l, tam) + 26, yb + tam * 0.3]);
    });
    // o maná caindo na faixa de luz: flocos brancos, os de perto maiores e fora de foco
    const flocos = S.tela();
    const kf = flocos.getContext('2d');
    for (let i = 0; i < 220; i++) {
      // ao longo da faixa (a diagonal) com um desvio para os lados
      const t = r();
      const d = (r() - 0.5) * 520;
      const x = L * (1.05 - t * 1.1) + d * 0.58;
      const y = A * (t * 0.95) + d * 0.81;
      const s = 2 + r() * r() * 9;
      if (livre.some(([a, b, c, d]) => x > a - s && x < c + s && y > b - s && y < d + s)) continue;
      kf.fillStyle = 'rgba(245,245,240,' + (0.35 + r() * 0.5).toFixed(2) + ')';
      kf.beginPath();
      kf.ellipse(x, y, s, s * (0.7 + r() * 0.3), r() * 3, 0, Math.PI * 2);
      kf.fill();
    }
    ctx.save();
    ctx.filter = 'blur(1.5px)';
    ctx.drawImage(flocos, 0, 0);
    ctx.restore();
    // uma sombra leve por trás das letras, para o branco nunca afundar na luz
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 24;
    linhas.forEach((l, i) => S.escrever(ctx, l, 66, y0 + i * passo, fonte(tam), '#f6f6f2', { alinhar: 'left', espaco: espaco(tam) }));
    ctx.restore();
  }

  // Permaneça offline para o pecado (sem referência). Como a referência do dono (o joguinho do
  // navegador sem internet): fundo cinza bem claro, a cena em pixel art de uma cor só, cinza
  // quase preto, sobre a linha do chão pontilhada, e a frase em letra condensada no mesmo cinza.
  // A cena é a mesma da arte do desafio "Sem internet" (09c-desafios.js), de que o dono gostou:
  // a ovelhinha entre os dois cactos e o sinal de internet cortado. As grades de pixels são
  // copiadas de lá (este arquivo é carregado à parte) e ampliadas em blocos inteiros, nítidos.
  const PIXELS_OFF = {
    cacto: '...##|..####|..####|#.####|#.####.#|#.####.#|#.####.#|######.#|..######|..####|..####|..####|..####',
    cactinho: '..##|.####|.####|#####|#.##|..##|..##',
    ovelha: '.....##..##..##|...##..##..##..##|..#..............#|.#................#|.#................#|#..................#|#..................#'
      + '|.#.................#|.#................#|..#..............#|...##..##..##..##|....##........##|....##........##|....##........##|....##........##',
    cabeca: '##|.###|.#######|..###.###|..#######|...######|....#####|.....###',
    wifi: '...#######|.##.......##|#...#####...#|..##.....##|....#####|.....#.#|......#',
    xis: '#...#|.#.#|..#|.#.#|#...#',
  };
  const CENA_OFF = [['cacto', 6, 8], ['ovelha', 24, 6], ['cabeca', 40, 6], ['cactinho', 62, 14], ['wifi', 52, 1], ['xis', 62, 6]];
  function arteOffline(ctx) {
    const r = sorteio(1880);
    const tinta = '#2b2b2b';
    ctx.fillStyle = '#f0f0ef';
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 14, { aClaro: 0.05, aEscuro: 0.025, claro: '255,255,255', escuro: '120,120,120' });
    const f = (t) => oswaldLP(t, 600);
    // PERMANEÇA OFFLINE em cima, a cena no meio sobre o chão, PARA O PECADO embaixo
    const tam = 106;
    const passo = 132;
    S.escrever(ctx, 'PERMANEÇA', L / 2, 616, f(tam), tinta, { espaco: 3 });
    S.escrever(ctx, 'OFFLINE', L / 2, 616 + passo, f(tam), tinta, { espaco: 3 });
    // a cena do desafio, pixel a pixel (72 x 25, o chão na linha 21), em blocos inteiros
    const p = 14;
    const x0 = Math.round(L / 2 - 72 * p / 2);
    const chao = 1180;
    const y0 = chao - 21 * p;
    ctx.fillStyle = tinta;
    const pixel = (x, y, w = 1) => ctx.fillRect(x0 + x * p, y0 + y * p, w * p, p);
    for (const [nome, cx, cy] of CENA_OFF) {
      PIXELS_OFF[nome].split('|').forEach((linha, y) => {
        linha.replace(/#+/g, (run, x) => { pixel(cx + x, cy + y, run.length); return run; });
      });
    }
    // o chão e as pedrinhas pontilhadas embaixo dele
    pixel(0, 21, 72);
    for (let x = 1; x < 72; x += 7) pixel(x, 23);
    for (let x = 4; x < 72; x += 11) pixel(x, 24);
    S.escrever(ctx, 'PARA O', L / 2, 1366, f(tam), tinta, { espaco: 3 });
    S.escrever(ctx, 'PECADO', L / 2, 1366 + passo - 12, f(tam), tinta, { espaco: 3 });
  }

  // Ore. (sem referência). O dono pediu igual à referência (a bandeira preta pendurada na
  // parede clara): a bandeira de cetim preto presa nos dois cantos de cima, com ORE. em branco
  // grosso, as dobras que descem em leque do canto direito, a barriga entre os pregos, o brilho
  // do tecido e a sombra macia na parede cinza-clara. Desenhada em duas etapas: a bandeira lisa
  // numa camada (o pano e as letras), levada para o story em colunas que acompanham a curva do
  // pano, e por cima o mapa de luz das dobras (feito pixel a pixel numa tela pequena), que
  // clareia o preto e escurece o branco como num tecido de verdade.
  function arteOre(ctx) {
    const r = sorteio(1830);
    // a parede: cinza-claro com luz vinda do alto
    const parede = ctx.createLinearGradient(0, 0, 0, A);
    parede.addColorStop(0, '#e6e4df');
    parede.addColorStop(1, '#d3d0ca');
    ctx.fillStyle = parede;
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 30, { aClaro: 0.08, aEscuro: 0.03, claro: '255,255,255', escuro: '90,85,75' });
    const W = 960;
    const H = 640;
    const x0 = (L - W) / 2;
    const y0 = 720;
    // a bandeira lisa
    const pano = document.createElement('canvas');
    pano.width = W;
    pano.height = H;
    const p = pano.getContext('2d');
    p.fillStyle = '#141414';
    p.fillRect(0, 0, W, H);
    p.font = '800 300px Manrope, sans-serif';
    p.textAlign = 'center';
    p.textBaseline = 'alphabetic';
    const m = p.measureText('ORE.');
    const t = 300 * Math.min(1, (W * 0.8) / m.width);
    p.font = '800 ' + t + 'px Manrope, sans-serif';
    try { p.letterSpacing = (-t * 0.02) + 'px'; } catch (e) { /* idem */ }
    const cap = p.measureText('O').actualBoundingBoxAscent;
    p.fillStyle = '#f1f1ef';
    p.fillText('ORE.', W / 2 + t * 0.01, H / 2 + cap / 2 + 6);
    // o mapa de luz das dobras: leques que saem do canto de cima à direita e a barriga de cima
    const k = 4;
    const w = W / k;
    const h = H / k;
    const luz = document.createElement('canvas');
    luz.width = w;
    luz.height = h;
    const lk = luz.getContext('2d');
    const img = lk.createImageData(w, h);
    const dobras = [];
    for (let i = 0; i < 11; i++) dobras.push({ ang: Math.PI * (0.6 + i * 0.034 + r() * 0.015), larg: 0.02 + r() * 0.035, forca: 0.55 + r() * 0.7, alcance: 0.8 + r() * 1.1 });
    const valor = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const v = y / h;
        // a distância à reta de cada dobra, que nasce no canto (1, 0)
        const dx = (u - 0.98) * 1.5;
        const dy = v;
        const dist = Math.hypot(dx, dy);
        let s = 0;
        for (const d of dobras) {
          const nx = Math.cos(d.ang);
          const ny = Math.sin(d.ang);
          const ao = dx * nx + dy * ny; // ao longo
          if (ao < 0) continue;
          const atr = dx * -ny + dy * nx; // atravessado
          const larg = d.larg * (0.6 + ao * 1.6);
          const some = Math.exp(-ao / d.alcance);
          // a crista clara e o vale escuro logo ao lado
          s += d.forca * some * (Math.exp(-(((atr - larg * 0.6) / larg) ** 2)) - 0.8 * Math.exp(-(((atr + larg * 0.9) / larg) ** 2)));
        }
        // a barriga entre os pregos, perto da beira de cima
        const barriga = Math.exp(-v / 0.12) * (0.35 * Math.sin(u * Math.PI * 3.2 + 0.6) + 0.15);
        // um brilho largo de cetim no meio e a queda de luz para baixo
        const largo = 0.18 * Math.exp(-((((u - 0.55) - (v - 0.45) * 0.7) / 0.18) ** 2)) - v * 0.12;
        valor[y * w + x] = s + barriga + largo + (dist < 0.08 ? 0.2 : 0);
      }
    }
    for (let i = 0; i < w * h; i++) {
      const s = valor[i];
      img.data[i * 4] = s > 0 ? 255 : 0;
      img.data[i * 4 + 1] = s > 0 ? 255 : 0;
      img.data[i * 4 + 2] = s > 0 ? 255 : 0;
      img.data[i * 4 + 3] = Math.round(255 * Math.min(0.75, Math.abs(s) * (s > 0 ? 0.42 : 0.6)));
    }
    lk.putImageData(img, 0, 0);
    p.save();
    p.globalCompositeOperation = 'source-atop';
    p.filter = 'blur(10px)';
    p.drawImage(luz, 0, 0, W, H);
    p.restore();
    // no branco das letras, os vales das dobras aparecem mais (o preto já esconde a sombra)
    const vale = lk.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      vale.data[i * 4 + 3] = valor[i] < 0 ? Math.round(255 * Math.min(0.6, -valor[i] * 0.9)) : Math.round(255 * Math.max(0, 0.12 - valor[i] * 0.1));
    }
    lk.putImageData(vale, 0, 0);
    p.save();
    p.globalCompositeOperation = 'source-atop';
    p.filter = 'blur(9px)';
    p.drawImage(luz, 0, 0, W, H);
    p.restore();
    // a curva do pano: as colunas descem na barriga entre os pregos e a beira de baixo ondula
    const curva = (u) => 16 * Math.sin(Math.PI * u) + 6 * Math.sin(u * Math.PI * 3 + 0.5);
    // a sombra na parede, deslocada para baixo e macia
    ctx.save();
    ctx.filter = 'blur(26px)';
    ctx.fillStyle = 'rgba(40,36,30,.32)';
    ctx.beginPath();
    ctx.moveTo(x0 + 14, y0 + 30);
    for (let u = 0; u <= 1.001; u += 0.05) ctx.lineTo(x0 + 14 + u * W, y0 + 30 + curva(u));
    for (let u = 1; u >= -0.001; u -= 0.05) ctx.lineTo(x0 + 14 + u * W, y0 + H + 36 + curva(u) * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const faixa = 2;
    for (let x = 0; x < W; x += faixa) {
      const u = x / W;
      ctx.drawImage(pano, x, 0, faixa, H, x0 + x, y0 + curva(u), faixa + 0.6, H - curva(u) * 0.35);
    }
    // os ilhoses de metal na beira esquerda e os pregos nos cantos de cima
    for (const [x, y] of [[x0 + 14, y0 + 18], [x0 + 14, y0 + H - 22]]) {
      ctx.strokeStyle = 'rgba(200,200,196,.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const [x, y] of [[x0 + 8, y0 + 4], [x0 + W - 8, y0 + 4]]) {
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.arc(x + 3, y + 4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9a9893';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Caminhamos por fé, e não pelo que vemos (lema com 2 Coríntios 5.7, na forma popular: não é
  // citação literal, então não segue a letra da NBV). Impressão retrô no papel creme: FÉ enorme em tinta gasta e, por cima da
  // metade de baixo das letras, um banco de neblina (nuvens macias com a borda em retícula
  // sálvia) que esconde o chão; da beira do papel sobem pegadas, uma depois da outra, e entram
  // na neblina: o passo continua onde a vista não chega. Papel claro, texto centralizado em
  // tamanho extremo, sem palavra sublinhada; "e não pelo que vemos." em Literata itálica
  // embaixo, depois da neblina. Fechamento: as pegadas sumindo na neblina.
  function pegada(ctx, x, y, s, giro, esquerda, cor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    ctx.scale(esquerda ? -s : s, s);
    ctx.fillStyle = cor;
    // a sola: o calcanhar, o arco estreito e a planta larga
    ctx.beginPath();
    ctx.moveTo(0, 46);
    ctx.bezierCurveTo(-15, 46, -17, 30, -14, 16);
    ctx.bezierCurveTo(-11, 4, -9, -6, -15, -18);
    ctx.bezierCurveTo(-21, -32, -14, -46, 2, -46);
    ctx.bezierCurveTo(18, -46, 22, -32, 18, -16);
    ctx.bezierCurveTo(14, -2, 8, 6, 10, 18);
    ctx.bezierCurveTo(13, 32, 14, 46, 0, 46);
    ctx.fill();
    // os dedos
    for (const [dx, dy, rr] of [[-11, -58, 7.5], [1, -62, 6], [10, -59, 5], [17, -53, 4.4], [22, -45, 3.8]]) {
      ctx.beginPath();
      ctx.ellipse(dx, dy, rr * 0.85, rr, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // A neblina: uma faixa feita pixel a pixel numa tela pequena (o perfil liso no meio e as
  // beiras desfiadas pelo ruído), que deixa ver um resto do que está atrás; nas beiras, a
  // retícula sálvia da impressão.
  function neblina(ctx, y0, y1, r) {
    const esc = 4;
    const w = L / esc;
    const h = Math.round((y1 - y0) / esc);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const k = c.getContext('2d');
    const img = k.createImageData(w, h);
    const ondas = [];
    for (let i = 0; i < 6; i++) ondas.push([0.02 + r() * 0.05, 0.05 + r() * 0.08, r() * 6.3, r() * 6.3]);
    const alfa = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let n = 0;
        for (const [fx, fy, a, b] of ondas) n += Math.sin(x * fx + a + Math.sin(y * fy + b) * 1.6) * Math.cos(y * fy * 0.7 + b);
        n /= ondas.length;
        const t = y / (h - 1) + n * 0.35;
        const perfil = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t))));
        const v = Math.min(0.86, Math.pow(perfil, 0.8) * (0.8 + n * 0.9));
        alfa[y * w + x] = v;
        const i = (y * w + x) * 4;
        img.data[i] = 240;
        img.data[i + 1] = 234;
        img.data[i + 2] = 217;
        img.data[i + 3] = Math.round(255 * Math.max(0, v));
      }
    }
    k.putImageData(img, 0, 0);
    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.drawImage(c, 0, y0, L, y1 - y0);
    ctx.restore();
    // os fiapos que passam por cima: elipses compridas e macias, mais densas no meio da faixa
    const f = S.tela();
    const kf = f.getContext('2d');
    for (let i = 0; i < 46; i++) {
      const t = 0.08 + r() * 0.8;
      const y = y0 + t * (y1 - y0);
      const x = r() * L;
      const rx = 110 + r() * 260;
      const ry = 10 + r() * 30;
      kf.save();
      kf.translate(x, y);
      kf.scale(1, ry / rx);
      const g = kf.createRadialGradient(0, 0, 0, 0, 0, rx);
      const a = (0.25 + r() * 0.45) * Math.sin(Math.PI * t);
      g.addColorStop(0, 'rgba(246,242,230,' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(246,242,230,0)');
      kf.fillStyle = g;
      kf.fillRect(-rx, -rx, rx * 2, rx * 2);
      kf.restore();
    }
    ctx.save();
    ctx.filter = 'blur(5px)';
    ctx.drawImage(f, 0, 0);
    ctx.restore();
    // a retícula nas beiras: pontos que crescem onde a neblina está pela metade
    const passo = 12;
    ctx.save();
    ctx.fillStyle = 'rgba(128,150,76,.34)';
    for (let y = y0 + passo / 2, lin = 0; y < y1; y += passo, lin++) {
      for (let x = (lin % 2) * passo / 2; x < L; x += passo) {
        const a = alfa[Math.min(h - 1, Math.floor((y - y0) / esc)) * w + Math.min(w - 1, Math.floor(x / esc))];
        const borda = Math.max(0, 1 - Math.abs(a - 0.3) / 0.16) * (1 - (y - y0) / (y1 - y0));
        if (borda <= 0.08) continue;
        ctx.beginPath();
        ctx.arc(x, y, passo * 0.34 * Math.sqrt(borda), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  function arteFe(ctx) {
    const r = sorteio(1810);
    fundoPapel(ctx, '#efe8d6', 1811);
    const cx = L / 2;
    S.escrever(ctx, 'CAMINHAMOS POR', cx + 7, 616, oswaldLP(52, 600), LP.tinta, { espaco: 14 });
    // FÉ em tinta gasta: o tamanho em que o É (com o acento) mede 570px de altura
    const { c, ctx: k } = camada();
    k.font = oswaldLP(100, 700);
    const alto100 = k.measureText('É').actualBoundingBoxAscent;
    const tF = 100 * 570 / alto100;
    k.font = oswaldLP(tF, 700);
    const capF = k.measureText('F').actualBoundingBoxAscent;
    const base = 670 + 570;
    S.escrever(k, 'FÉ', cx, base, oswaldLP(tF, 700), LP.tinta, { espaco: tF * 0.02 });
    const wF = k.measureText('FÉ').width;
    gastar(c, { x: cx - wF / 2, y: base - 600, w: wF, h: 620 }, { pontos: 700, manchas: 8, riscos: 40, semente: 1812, forca: 0.55 });
    ctx.drawImage(c, 0, 0);
    // as pegadas sobem da beira e entram na neblina, encolhendo com a distância
    const passos = [[cx + 30, 1370, 0.74], [cx - 26, 1310, 0.67], [cx + 22, 1258, 0.6], [cx - 18, 1214, 0.54], [cx + 14, 1176, 0.49], [cx - 11, 1144, 0.44], [cx + 8, 1116, 0.39]];
    passos.forEach(([x, y, s], i) => pegada(ctx, x, y, s, (i % 2 ? 0.08 : -0.08), i % 2 === 1, 'rgba(18,19,15,' + (0.86 - i * 0.04).toFixed(2) + ')'));
    neblina(ctx, base - capF * 0.62, base + 110, r);
    // o fim do lema, depois da neblina
    S.escrever(ctx, 'e não pelo que vemos.', cx, 1468, 'italic 400 50px Literata, Georgia, serif', LP.tinta);
    referencia(ctx, '2 Coríntios 5.7', cx, 1522, 22, '#5c5a52');
  }
  // God is always in Ctrl (sem referência; em inglês, como a referência que o dono mandou).
  // O papel cinza-claro, GOD enorme em Oswald preta esticada de pé, IS ALWAYS na mesma largura,
  // IN pequeno à esquerda e, no lugar de "control", a tecla Ctrl de verdade em verde-limão: a base
  // com os quatro chanfros (o de cima claro, o de baixo escuro), o tampo côncavo com a luz no
  // meio, a etiqueta Ctrl no canto e a sombra macia no papel. Desenhada em canvas. Diferente de
  // controle (o controle de videogame estampado na camiseta).
  const LIMAO = { tampo: '#c4dc3c', luz: '#d6ea5e', claro: '#d0e44e', medio: '#adc42a', escuro: '#8ea21c', fundo: '#7c8f17' };
  function teclaCtrl(ctx, x, y, s) {
    const raio = s * 0.09;
    // a sombra no papel, para baixo e para a direita
    ctx.save();
    ctx.filter = 'blur(' + Math.round(s * 0.06) + 'px)';
    ctx.fillStyle = 'rgba(40,44,20,.38)';
    ctx.beginPath();
    ctx.roundRect(x + s * 0.04, y + s * 0.08, s, s, raio);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.filter = 'blur(' + Math.round(s * 0.015) + 'px)';
    ctx.fillStyle = 'rgba(30,34,14,.35)';
    ctx.beginPath();
    ctx.roundRect(x + s * 0.01, y + s * 0.03, s, s, raio);
    ctx.fill();
    ctx.restore();
    // a base, com os quatro chanfros entre ela e o tampo
    const fora = [x, y, x + s, y + s];
    const ti = [x + s * 0.1, y + s * 0.05, x + s * 0.9, y + s * 0.8];
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, s, s, raio);
    ctx.clip();
    ctx.fillStyle = LIMAO.medio;
    ctx.fillRect(x, y, s, s);
    const face = (pts, cor) => {
      ctx.fillStyle = cor;
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      ctx.fill();
    };
    face([[fora[0], fora[1]], [fora[2], fora[1]], [ti[2], ti[1]], [ti[0], ti[1]]], LIMAO.luz);
    face([[fora[0], fora[1]], [ti[0], ti[1]], [ti[0], ti[3]], [fora[0], fora[3]]], LIMAO.claro);
    face([[fora[2], fora[1]], [fora[2], fora[3]], [ti[2], ti[3]], [ti[2], ti[1]]], LIMAO.medio);
    face([[fora[0], fora[3]], [ti[0], ti[3]], [ti[2], ti[3]], [fora[2], fora[3]]], LIMAO.escuro);
    // o pé da base, mais escuro, onde ela encosta no papel
    const pe = ctx.createLinearGradient(0, y + s * 0.9, 0, y + s);
    pe.addColorStop(0, 'rgba(124,143,23,0)');
    pe.addColorStop(1, 'rgba(100,116,16,.75)');
    ctx.fillStyle = pe;
    ctx.fillRect(x, y + s * 0.9, s, s * 0.1);
    ctx.restore();
    // o tampo côncavo: a luz no meio e a beira um pouco mais escura
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(ti[0], ti[1], ti[2] - ti[0], ti[3] - ti[1], raio * 0.8);
    const tampo = ctx.createRadialGradient(x + s * 0.48, y + s * 0.36, s * 0.05, x + s * 0.5, y + s * 0.42, s * 0.5);
    tampo.addColorStop(0, '#cfe64c');
    tampo.addColorStop(0.7, LIMAO.tampo);
    tampo.addColorStop(1, '#b6ce30');
    ctx.fillStyle = tampo;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,230,.35)';
    ctx.lineWidth = s * 0.006;
    ctx.stroke();
    ctx.restore();
    // a etiqueta
    S.escrever(ctx, 'Ctrl', ti[0] + s * 0.08, ti[1] + s * 0.16, '600 ' + Math.round(s * 0.11) + 'px Manrope, sans-serif', '#262a12', { alinhar: 'left' });
  }
  function arteCtrl(ctx) {
    const r = sorteio(1850);
    const tinta = '#141413';
    // o papel cinza-claro, com a luz no meio
    ctx.fillStyle = '#e9e9e6';
    ctx.fillRect(0, 0, L, A);
    const luz = ctx.createRadialGradient(L / 2, 900, 100, L / 2, 900, 1200);
    luz.addColorStop(0, 'rgba(255,255,255,.5)');
    luz.addColorStop(1, 'rgba(150,150,140,.18)');
    ctx.fillStyle = luz;
    ctx.fillRect(0, 0, L, A);
    manchas(ctx, r, 18, { aClaro: 0.05, aEscuro: 0.025, claro: '255,255,255', escuro: '90,90,80' });
    // as linhas, condensadas na altura (a letra esticada de pé, como a referência); o bloco
    // encolhe por igual para caber entre os dias (y 540) e a marca (y 1480, com a sombra)
    const estica = 1.22;
    const f = (t) => oswaldLP(t, 700);
    const medir = (larg) => {
      const linha = (txt) => {
        ctx.font = f(100);
        const t = 100 * larg / ctx.measureText(txt).width;
        ctx.font = f(t);
        return { t, cap: ctx.measureText(txt).actualBoundingBoxAscent * estica };
      };
      const l1 = linha('GOD');
      const l2 = linha('IS ALWAYS');
      ctx.font = f(l2.t);
      const capNo = ctx.measureText('IN').actualBoundingBoxAscent * estica;
      const vao = larg * 0.036;
      const tecla = larg * 0.4;
      return { l1, l2, capNo, vao, tecla, alto: l1.cap + vao + l2.cap + vao + tecla };
    };
    let larg = 820;
    let b = medir(larg);
    if (b.alto > 900) { larg *= 900 / b.alto; b = medir(larg); }
    const { l1, l2, capNo, vao, tecla } = b;
    const x0 = (L - larg) / 2;
    const topo = 540 + (900 - b.alto) / 2;
    const escrever = (txt, t, y) => {
      ctx.save();
      ctx.translate(x0, y);
      ctx.scale(1, estica);
      ctx.font = f(t);
      ctx.fillStyle = tinta;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(txt, 0, 0);
      ctx.restore();
    };
    const b1 = topo + l1.cap;
    escrever('GOD', l1.t, b1);
    const b2 = b1 + vao + l2.cap;
    escrever('IS ALWAYS', l2.t, b2);
    const b3 = b2 + vao + capNo;
    escrever('IN', l2.t, b3);
    ctx.font = f(l2.t);
    const wNo = ctx.measureText('IN').width;
    // a tecla no lugar de "controle": o topo na altura do NO, logo depois dele
    teclaCtrl(ctx, x0 + wNo + larg * 0.02, b3 - capNo - larg * 0.01, tecla);
  }
  S.prepararVersiculo = () => carregarFoto('montanhas');
  S.versiculoCompleto = () => fotoPronta('montanhas');
  S.arteCompleta = arteCompleta;
  S.texturas = { sorteio, grao, gastar };
})(window.CC);
