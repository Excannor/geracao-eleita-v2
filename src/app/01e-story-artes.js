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
    caminho: { fundo: [LP.preto], tema: { ...TEMA_LP, alinhar: 'direita', escala: 0.75, marcaX: 90 }, desenhar: arteCaminho, grao: [18, 1414] },
    brasas: { fundo: ['#0b0b0a'], tema: { ...TEMA_LP, alinhar: 'esquerda', escala: 0.75, marcaX: 84 }, desenhar: arteBrasas, grao: [20, 1990] },
    // sexta leva (rodada 13): a pista, o fundo do mar, a bússola e a limalha
    chegada: { fundo: [LP.salvia], tema: { ...TEMA_SALVIA, alinhar: 'direita', escala: 0.78, marcaX: 380 }, desenhar: arteChegada, grao: [14, 1300] },
    ancora: { fundo: ['#0f1916'], tema: { ...TEMA_LP, escala: 0.8 }, desenhar: arteAncora, grao: [16, 1310] },
    bussola: { fundo: [LP.amarelo], tema: { ...TEMA_AMARELO, escala: 0.8 }, desenhar: arteBussola, grao: [12, 1320] },
    ima: { fundo: ['#ecebe4'], tema: { ...TEMA_PAPEL, alinhar: 'esquerda', escala: 0.8, marcaX: 90 }, desenhar: arteIma, grao: [12, 1330] },
    // sétima leva (rodada 14): as ondas na água, o envelope aéreo, a grade quebrada e a rasura
    ondas: { fundo: [LP.salvia], tema: { ...TEMA_SALVIA, escala: 0.8 }, desenhar: arteConhecer, grao: [14, 1400] },
    envelope: { fundo: ['#f1ece0'], tema: { ...TEMA_PAPEL, alinhar: 'esquerda', escala: 0.8 }, desenhar: artePregarao, grao: [12, 1410] },
    molde: { fundo: [LP.amarelo], tema: { ...TEMA_AMARELO, alinhar: 'direita', escala: 0.8 }, desenhar: arteInconformada, grao: [12, 1420] },
    rasura: { fundo: [LP.preto], tema: { ...TEMA_LP, alinhar: 'esquerda', escala: 0.8, marcaX: 86 }, desenhar: arteTudo, grao: [18, 1430] },
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

  // É tudo sobre Ele: no preto da landing, É TUDO / SOBRE em Oswald creme enorme, encostado
  // à esquerda, e ELE escrito à mão em amarelo, a única cor quente, maior que o resto: a
  // frase termina nEle. Sem outra palavra (o dono tirou o MIM riscado). Fechamento: o ELE à mão.
  function arteTudo(ctx) {
    const r = sorteio(1430);
    fundoLanding(ctx);
    const x = 86;
    const os = (t) => oswaldLP(t, 700);
    const tam = Math.min(caber(ctx, 'É TUDO', os, 900, 330), caber(ctx, 'SOBRE', os, 900, 330));
    ctx.font = os(tam);
    const cap = ctx.measureText('É TUDO').actualBoundingBoxAscent;
    const capS = ctx.measureText('SOBRE').actualBoundingBoxAscent;
    const vao = tam * 0.1;
    const tE = tam * 1.25;
    const capE = capS * 1.25;
    const y1 = (Z0 + Z1) / 2 - (cap + vao + capS + vao * 1.6 + capE) / 2 + cap;
    const y2 = y1 + vao + capS;
    const y3 = y2 + vao * 1.6 + capE;
    S.escrever(ctx, 'É TUDO', x, y1, os(tam), LP.creme, { alinhar: 'left' });
    S.escrever(ctx, 'SOBRE', x, y2, os(tam), LP.creme, { alinhar: 'left' });
    ctx.fillStyle = LP.amarelo;
    ctx.save();
    ctx.translate(x + 4, y3);
    ctx.rotate(-0.05);
    aMao(ctx, 'ELE', 0, 0, tE, r);
    ctx.restore();
  }

  S.prepararArte = prepararArte;
  S.fundoCartaz = fundoCartaz;
  S.rodapeCartaz = rodapeCartaz;
  S.prepararVersiculo = () => carregarFoto('montanhas');
  S.versiculoCompleto = () => fotoPronta('montanhas');
  S.arteCompleta = arteCompleta;
  S.texturas = { sorteio, grao, gastar };
})(window.CC);
