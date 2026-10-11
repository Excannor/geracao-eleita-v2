/* As cartas colecionáveis do baú (amostra para o dono aprovar o estilo, 2026-10-11). Cada
   baú da Trilha revela uma carta ilustrada: a moldura com o álbum e o número, a ilustração,
   o título, um "Você sabia?" de uma linha e a referência. Os desenhos são em canvas, no
   padrão das artes de story (01e-story-artes.js): luz, sombra, grão e textura de gravura,
   sem figura humana, com o amarelo como única cor quente e a sálvia de apoio. Uma carta
   "especial" ganha a moldura dourada com brilho de metal.
   Pedida só quando a tela do baú abre: o build a publica como cartas.<resumo>.js, com o
   estilo (cartas.css: a carta que vira) no lugar da marca abaixo, e o service worker a
   guarda no cache "caminho-telas". Aqui também moram o papel de parede do versículo da
   semana (1080x2340) e a imagem de story da carta (1080x1920).
   Tudo desenhado com semente fixa: a mesma carta sai sempre igual. */
(function (CC) {
  'use strict';

  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-cartas]')) {
    const s = document.createElement('style');
    s.dataset.cartas = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  // ---------- as cartas (amostra: uma por álbum) ----------
  // Os textos seguem o catálogo de voz; o "Você sabia?" é fato que se confere na referência.
  const CARTAS = [
    { id: 'davi-funda', album: 'Heróis da fé', numero: 4, total: 13, titulo: 'Davi e a funda',
      sabia: 'Davi apanhou cinco pedras lisas num riacho e usou só uma.', ref: '1 Samuel 17.40-50', desenho: 'davi' },
    { id: 'poco-jaco', album: 'Lugares', numero: 3, total: 13, titulo: 'O poço de Jacó',
      sabia: 'Jesus chegou cansado a este poço por volta do meio-dia e pediu água.', ref: 'João 4.6-7', desenho: 'poco' },
    { id: 'azeite-viuva', album: 'Objetos', numero: 7, total: 13, titulo: 'O azeite da viúva',
      sabia: 'O azeite só parou de correr quando não sobrou nenhuma vasilha vazia.', ref: '2 Reis 4.1-7', desenho: 'azeite' },
    { id: 'mar-vermelho', album: 'Milagres', numero: 1, total: 13, titulo: 'O mar aberto',
      sabia: 'Um vento forte soprou a noite inteira e deixou o fundo do mar seco.', ref: 'Êxodo 14.21-22', desenho: 'mar', especial: true },
  ];

  // ---------- peças de desenho ----------
  const CW = 1000;
  const CH = 1400;
  const COR = { preto: '#121310', creme: '#f2ecd8', papel: '#ece5cf', tinta: '#23241e', salvia: '#c8da8c',
    salviaEscura: '#56663a', amarelo: '#ffc44d', ouro: '#d9a23a' };

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
  // Uma linha ondulada suave (soma de senos com fases sorteadas), para morros, bordas e ondas.
  function onda(r, n = 4, base = 1) {
    const fs = Array.from({ length: n }, (_, i) => ({ f: base * (i + 1) * (0.7 + r() * 0.6), p: r() * 6.283, a: 1 / (i + 1) }));
    return (x) => fs.reduce((s, o) => s + Math.sin(x * o.f + o.p) * o.a, 0);
  }
  function tela(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  function retRedondo(k, x, y, w, h, raio) {
    k.beginPath();
    k.moveTo(x + raio, y);
    k.arcTo(x + w, y, x + w, y + h, raio);
    k.arcTo(x + w, y + h, x, y + h, raio);
    k.arcTo(x, y + h, x, y, raio);
    k.arcTo(x, y, x + w, y, raio);
    k.closePath();
  }
  // Grão de impressão: um pixel em cada seis clareia ou escurece um pouco (ralo, para o PNG
  // não pesar), como nas artes.
  function grao(k, w, h, forca, semente) {
    let img;
    try { img = k.getImageData(0, 0, w, h); } catch (e) { return; }
    const d = img.data;
    let x = semente >>> 0 || 1;
    for (let i = 0; i < d.length; i += 4) {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      const u = (x >>> 0) / 4294967296;
      if (u > 0.16) continue;
      const n = (u < 0.08 ? -1 : 1) * forca;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    k.putImageData(img, 0, 0);
  }
  function brilho(k, x, y, raio, cor, modo) {
    const g = k.createRadialGradient(x, y, 0, x, y, raio);
    g.addColorStop(0, cor);
    g.addColorStop(1, cor.replace(/[\d.]+\)$/, '0)'));
    k.save();
    if (modo) k.globalCompositeOperation = modo;
    k.fillStyle = g;
    k.fillRect(x - raio, y - raio, raio * 2, raio * 2);
    k.restore();
  }
  function vinheta(k, w, h, forca) {
    const g = k.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + forca + ')');
    k.fillStyle = g;
    k.fillRect(0, 0, w, h);
  }
  // Um contorno irregular em volta de (x, y), liso (curvas pelos pontos médios).
  function seixo(r, x, y, rx, ry, giro, aspereza = 0.05) {
    const n = 16;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const f = 1 + (r() - 0.5) * 2 * aspereza;
      const px = Math.cos(a) * rx * f;
      const py = Math.sin(a) * ry * f;
      pts.push([x + px * Math.cos(giro) - py * Math.sin(giro), y + px * Math.sin(giro) + py * Math.cos(giro)]);
    }
    const p = new Path2D();
    const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m = meio(pts[n - 1], pts[0]);
    p.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) {
      const b = pts[(i + 1) % n];
      m = meio(pts[i], b);
      p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
    }
    p.closePath();
    return p;
  }
  // Cordão trançado ao longo de um caminho (lista de pontos): o contorno escuro, o fio claro,
  // os riscos da trança e a luz de um lado.
  function cordao(k, pts, larg, { cor = '#d6ccad', escuro = '#2a281e', luz = 'rgba(255,214,130,.75)' } = {}) {
    const linha = () => { k.beginPath(); k.moveTo(pts[0][0], pts[0][1]); for (const p of pts) k.lineTo(p[0], p[1]); };
    k.save();
    k.lineCap = 'round';
    k.lineJoin = 'round';
    // sombra no chão
    k.save();
    k.filter = 'blur(6px)';
    k.translate(larg * 1.3, larg * 1.6);
    k.strokeStyle = 'rgba(0,0,0,.6)';
    k.lineWidth = larg * 1.3;
    linha();
    k.stroke();
    k.restore();
    k.strokeStyle = escuro;
    k.lineWidth = larg + 4;
    linha();
    k.stroke();
    k.strokeStyle = cor;
    k.lineWidth = larg;
    linha();
    k.stroke();
    // a trança: riscos inclinados a cada passo
    let acum = 0;
    k.lineWidth = Math.max(1.4, larg * 0.22);
    k.strokeStyle = 'rgba(40,36,24,.55)';
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const d = Math.hypot(x1 - x0, y1 - y0);
      acum += d;
      while (acum > larg * 0.9) {
        acum -= larg * 0.9;
        const t = 1 - acum / d;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        const ang = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2 + 0.75;
        k.beginPath();
        k.moveTo(x - Math.cos(ang) * larg * 0.55, y - Math.sin(ang) * larg * 0.55);
        k.lineTo(x + Math.cos(ang) * larg * 0.55, y + Math.sin(ang) * larg * 0.55);
        k.stroke();
      }
    }
    // a luz de cima à esquerda
    k.globalCompositeOperation = 'screen';
    k.strokeStyle = luz;
    k.lineWidth = Math.max(1.5, larg * 0.28);
    k.translate(-larg * 0.22, -larg * 0.26);
    linha();
    k.stroke();
    k.restore();
  }
  function bezier(p0, p1, p2, p3, n = 60) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return pts;
  }
  // Perfil de um vaso de barro (raio em cada altura, de 0 = boca a 1 = pé).
  function vaso(k, cx, base, alt, larg, perfil) {
    const n = 40;
    const p = new Path2D();
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([perfil(t) * larg / 2, base - alt + t * alt]);
    }
    p.moveTo(cx - pts[0][0], pts[0][1]);
    for (const [rx, y] of pts) p.lineTo(cx - rx, y);
    p.quadraticCurveTo(cx, base + larg * 0.05, cx + pts[n][0], pts[n][1]);
    for (let i = n; i >= 0; i--) p.lineTo(cx + pts[i][0], pts[i][1]);
    p.closePath();
    return p;
  }

  // ---------- (1) Heróis da fé: a funda de Davi e as cinco pedras ----------
  // Uma prancha de gravura, como as dos livros antigos de história natural: no papel sálvia,
  // a funda estendida, de couro e cordão trançado, e embaixo a fileira das cinco pedras lisas
  // do riacho, numeradas. Falta uma na fileira (só o contorno pontilhado): é a que está na
  // bolsa da funda, a única que Davi usou, e a única que leva o amarelo.
  const TINTA = '#1d2216';
  // Gravura: linhas paralelas dentro de uma forma, com a grossura vinda da sombra (0 = luz).
  // As linhas curvam um pouco (abaulado), para a forma parecer redonda.
  function gravar(k, forma, cx, cy, raio, ang, passo, maxL, sombra, cor = TINTA, abaulado = 0.18) {
    k.save();
    k.clip(forma);
    k.strokeStyle = cor;
    k.lineCap = 'round';
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    for (let d = -raio; d <= raio; d += passo) {
      let ant = null;
      for (let s = -raio; s <= raio; s += 3) {
        const curva = abaulado * raio * (1 - (s / raio) ** 2) * (d / raio);
        const x = cx + s * dx - (d + curva) * dy;
        const y = cy + s * dy + (d + curva) * dx;
        const w = maxL * Math.pow(Math.max(0, Math.min(1, sombra(x, y))), 1.1);
        if (ant && w > 0.15) {
          k.lineWidth = w;
          k.beginPath();
          k.moveTo(ant[0], ant[1]);
          k.lineTo(x, y);
          k.stroke();
        }
        ant = [x, y];
      }
    }
    k.restore();
  }
  // A sombra de um volume oval com luz de cima à esquerda.
  const sombraOval = (cx, cy, rx, ry, giro) => (x, y) => {
    const c = Math.cos(-giro);
    const s = Math.sin(-giro);
    const u = ((x - cx) * c - (y - cy) * s) / rx;
    const v = ((x - cx) * s + (y - cy) * c) / ry;
    const zz = 1 - u * u - v * v;
    const nz = Math.sqrt(Math.max(0, zz));
    const luz = Math.max(0, -0.55 * u - 0.6 * v + 0.58 * nz);
    return 1 - luz * 1.15 + (zz < 0.12 ? 0.25 : 0);
  };
  function pedraGravada(k, r, x, y, rx, ry, giro, { quente = false } = {}) {
    const p = seixo(r, x, y, rx, ry, giro, 0.06);
    // a sombra no papel, para baixo e à direita, em hachura
    const ps = seixo(r, x + rx * 0.32, y + ry * 0.42, rx * 1.02, ry * 0.9, giro, 0.04);
    k.save();
    k.filter = 'blur(6px)';
    k.fillStyle = 'rgba(29,34,22,.22)';
    k.fill(ps);
    k.restore();
    gravar(k, ps, x + rx * 0.3, y + ry * 0.4, rx * 1.3, -0.8, 5, 1.4, (px, py) => 0.7 - Math.hypot((px - x - rx * 0.32) / rx, (py - y - ry * 0.42) / ry) * 0.4);
    k.fillStyle = quente ? '#f3d27e' : '#dfe4c6';
    k.fill(p);
    if (quente) brilho(k, x - rx * 0.2, y - ry * 0.3, rx * 1.1, 'rgba(255,240,190,.7)');
    const so = sombraOval(x, y, rx, ry, giro);
    gravar(k, p, x, y, Math.max(rx, ry) * 1.1, giro + 0.5, 4.2, 3.6, so, quente ? '#3a2c0a' : TINTA);
    gravar(k, p, x, y, Math.max(rx, ry) * 1.1, giro - 0.75, 5.4, 2.2, (px, py) => (so(px, py) - 0.55) * 1.8, quente ? '#3a2c0a' : TINTA);
    k.save();
    k.clip(p);
    for (let i = 0; i < rx * ry * 0.02; i++) {
      const a = r() * 6.283;
      const dd = Math.sqrt(r());
      k.fillStyle = 'rgba(29,34,22,.5)';
      k.beginPath();
      k.arc(x + Math.cos(a) * rx * dd, y + Math.sin(a) * ry * dd, 0.6 + r() * 1.1, 0, 6.283);
      k.fill();
    }
    k.restore();
    k.strokeStyle = quente ? '#3a2c0a' : TINTA;
    k.lineWidth = 2.2;
    k.stroke(p);
  }
  function desenhoDavi(k, W, H) {
    const r = sorteio(4101);
    // o papel sálvia, com fibra, manchas do tempo e a borda escurecida
    const g = k.createRadialGradient(W * 0.45, H * 0.4, 80, W / 2, H / 2, W * 0.8);
    g.addColorStop(0, '#dde3bc');
    g.addColorStop(0.6, '#c7d09d');
    g.addColorStop(1, '#a9b47c');
    k.fillStyle = g;
    k.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) {
      k.fillStyle = r() < 0.6 ? 'rgba(60,70,30,' + (0.03 + r() * 0.07).toFixed(3) + ')' : 'rgba(255,255,240,.22)';
      k.fillRect(r() * W, r() * H, 1 + r() * 4, 1);
    }
    for (let i = 0; i < 28; i++) {
      const rr = 4 + r() * 26;
      brilho(k, r() * W, r() * H, rr, 'rgba(120,110,50,' + (0.05 + r() * 0.08).toFixed(3) + ')');
    }
    // o filete da prancha
    k.strokeStyle = 'rgba(29,34,22,.55)';
    k.lineWidth = 1.5;
    k.strokeRect(26, 26, W - 52, H - 52);
    k.lineWidth = 3;
    k.strokeRect(34, 34, W - 68, H - 68);
    // a funda estendida: os cordões em curva larga, com a bolsa no meio
    const bx = W * 0.5;
    const by = H * 0.31;
    const cordaoGravado = (pts, larg) => {
      const linha = () => { k.beginPath(); k.moveTo(pts[0][0], pts[0][1]); for (const p of pts) k.lineTo(p[0], p[1]); };
      k.save();
      k.lineCap = 'round';
      k.lineJoin = 'round';
      k.save();
      k.translate(5, 7);
      k.filter = 'blur(3px)';
      k.strokeStyle = 'rgba(29,34,22,.3)';
      k.lineWidth = larg + 2;
      linha();
      k.stroke();
      k.restore();
      k.strokeStyle = TINTA;
      k.lineWidth = larg + 3.5;
      linha();
      k.stroke();
      k.strokeStyle = '#e9ebd2';
      k.lineWidth = larg;
      linha();
      k.stroke();
      let acum = 0;
      k.strokeStyle = TINTA;
      k.lineWidth = 1.6;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        const d = Math.hypot(x1 - x0, y1 - y0);
        acum += d;
        while (acum > larg * 0.8) {
          acum -= larg * 0.8;
          const t = 1 - acum / d;
          const x = x0 + (x1 - x0) * t;
          const y = y0 + (y1 - y0) * t;
          const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2 + 0.7;
          k.beginPath();
          k.moveTo(x - Math.cos(a) * larg * 0.5, y - Math.sin(a) * larg * 0.5);
          k.lineTo(x + Math.cos(a) * larg * 0.5, y + Math.sin(a) * larg * 0.5);
          k.stroke();
        }
      }
      k.restore();
    };
    // à esquerda, o cordão termina na alça do dedo; à direita, no nó que se solta
    const E = 1.22;
    const esq = bezier([bx - 150 * E, by + 6], [bx - 330, by - 40], [70, by - 60], [92, by + 120], 60)
      .concat(bezier([92, by + 120], [104, by + 210], [196, by + 196], [170, by + 140], 26))
      .concat(bezier([170, by + 140], [150, by + 100], [100, by + 130], [120, by + 176], 18));
    const dir = bezier([bx + 150 * E, by + 6], [bx + 330, by - 30], [W - 60, by + 10], [W - 110, by + 130], 60)
      .concat(bezier([W - 110, by + 130], [W - 140, by + 196], [W - 220, by + 200], [W - 250, by + 170], 26));
    cordaoGravado(esq, 10);
    cordaoGravado(dir, 10);
    k.fillStyle = TINTA;
    k.beginPath();
    k.arc(W - 252, by + 168, 10, 0, 6.283);
    k.fill();
    k.fillStyle = '#e9ebd2';
    k.beginPath();
    k.arc(W - 254, by + 166, 4.5, 0, 6.283);
    k.fill();
    k.save();
    k.translate(bx, by);
    k.scale(E, E);
    k.translate(-bx, -by);
    // a bolsa de couro
    const bolsa = new Path2D();
    bolsa.moveTo(bx - 164, by + 4);
    bolsa.bezierCurveTo(bx - 100, by - 84, bx + 100, by - 84, bx + 164, by + 4);
    bolsa.bezierCurveTo(bx + 100, by + 86, bx - 100, by + 86, bx - 164, by + 4);
    k.save();
    k.translate(8, 10);
    k.filter = 'blur(5px)';
    k.fillStyle = 'rgba(29,34,22,.32)';
    k.fill(bolsa);
    k.restore();
    k.fillStyle = '#b3bd86';
    k.fill(bolsa);
    const sb = sombraOval(bx, by + 2, 160, 70, 0);
    gravar(k, bolsa, bx, by, 180, 1.35, 5, 3.4, (x, y) => sb(x, y) * 0.9 + 0.1, TINTA, -0.25);
    // as rugas do couro
    k.save();
    k.clip(bolsa);
    k.strokeStyle = 'rgba(29,34,22,.55)';
    k.lineWidth = 1.6;
    for (let i = 0; i < 7; i++) {
      const x = bx - 120 + i * 40 + (r() - 0.5) * 10;
      k.beginPath();
      k.moveTo(x, by - 70);
      k.bezierCurveTo(x + 14, by - 20, x - 12, by + 20, x + 4, by + 74);
      k.stroke();
    }
    k.restore();
    k.setLineDash([8, 7]);
    k.strokeStyle = 'rgba(29,34,22,.85)';
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(bx - 142, by + 4);
    k.bezierCurveTo(bx - 88, by - 66, bx + 88, by - 66, bx + 142, by + 4);
    k.bezierCurveTo(bx + 88, by + 68, bx - 88, by + 68, bx - 142, by + 4);
    k.stroke();
    k.setLineDash([]);
    k.strokeStyle = TINTA;
    k.lineWidth = 3;
    k.stroke(bolsa);
    // os furos onde o cordão prende
    for (const lado of [-1, 1]) {
      k.fillStyle = TINTA;
      k.beginPath();
      k.arc(bx + lado * 150, by + 5, 6, 0, 6.283);
      k.fill();
    }
    // a pedra que está na bolsa
    brilho(k, bx, by - 2, 150, 'rgba(255,196,77,.35)');
    pedraGravada(k, r, bx + 4, by - 2, 62, 46, -0.12, { quente: true });
    k.restore();
    // a fileira das cinco: quatro pedras e o lugar vazio da quinta
    const fila = H * 0.72;
    const medidas = [[66, 48, 0.3], [58, 44, -0.4], [64, 47, 0.1], [70, 50, -0.15], [56, 43, 0.5]];
    const vazia = 2;
    const romanos = ['I', 'II', 'III', 'IV', 'V'];
    medidas.forEach(([rx, ry, giro], i) => {
      const x = W * 0.5 + (i - 2) * 162;
      if (i === vazia) {
        k.setLineDash([3, 7]);
        k.lineCap = 'round';
        k.strokeStyle = 'rgba(29,34,22,.75)';
        k.lineWidth = 2.4;
        k.stroke(seixo(sorteio(77), x, fila, 62 * E, 46 * E, -0.12, 0.06));
        k.setLineDash([]);
      } else {
        pedraGravada(k, r, x, fila, rx, ry, giro);
      }
      escrever(k, romanos[i], x, fila + 96, 'italic 500 26px Literata, Georgia, serif', 'rgba(29,34,22,.8)', { alinhar: 'center' });
    });
    vinheta(k, W, H, 0.22);
  }

  // ---------- (2) Lugares: o poço de Jacó ao meio-dia ----------
  // Visto de cima, da borda: a terra seca e as lajes da boca no sol a pino, as fiadas de pedra
  // descendo no escuro (o poço é "muito fundo", Jo 4.11), o musgo nas pedras úmidas e, lá
  // embaixo, a água com o céu redondo e o sol refletidos: só ao meio-dia o sol chega ao fundo.
  // A corda desce pela parede.
  function desenhoPoco(k, W, H) {
    const r = sorteio(4201);
    const cx = W * 0.5;
    const cy = H * 0.5;
    // a terra batida, clara de sol, com rachaduras e pedrinhas
    const gt = k.createRadialGradient(cx, cy, 200, cx, cy, W * 0.8);
    gt.addColorStop(0, '#e9dfc2');
    gt.addColorStop(1, '#c9bb94');
    k.fillStyle = gt;
    k.fillRect(0, 0, W, H);
    for (let i = 0; i < 14000; i++) {
      k.fillStyle = r() < 0.6 ? 'rgba(90,76,40,' + (0.05 + r() * 0.12).toFixed(3) + ')' : 'rgba(255,252,236,.3)';
      k.fillRect(r() * W, r() * H, 1.4 + r() * 1.6, 1.4);
    }
    k.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      let x = r() * W;
      let y = r() * H;
      let a = r() * 6.28;
      k.strokeStyle = 'rgba(80,66,36,' + (0.18 + r() * 0.2).toFixed(3) + ')';
      k.lineWidth = 1 + r() * 1.4;
      k.beginPath();
      k.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        a += (r() - 0.5) * 1.4;
        x += Math.cos(a) * (10 + r() * 22);
        y += Math.sin(a) * (10 + r() * 22);
        k.lineTo(x, y);
      }
      k.stroke();
    }
    for (let i = 0; i < 160; i++) {
      const x = r() * W;
      const y = r() * H;
      const rr = 2 + r() * r() * 9;
      k.fillStyle = 'rgba(70,58,30,.35)';
      k.beginPath();
      k.ellipse(x + rr * 0.35, y + rr * 0.45, rr, rr * 0.8, 0, 0, Math.PI * 2);
      k.fill();
      k.fillStyle = r() < 0.5 ? '#ddd3b6' : '#c7bc9c';
      k.beginPath();
      k.ellipse(x, y, rr, rr * 0.8, r() * 3, 0, Math.PI * 2);
      k.fill();
    }
    // tufos de capim seco
    for (let i = 0; i < 22; i++) {
      const x = r() * W;
      const y = r() * H;
      if (Math.hypot(x - cx, y - cy) < 360) continue;
      for (let f = 0; f < 9; f++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
        const c = 10 + r() * 22;
        k.strokeStyle = r() < 0.5 ? 'rgba(150,140,90,.7)' : 'rgba(110,120,70,.6)';
        k.lineWidth = 1.5;
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x + Math.cos(a) * c * 0.5 + 4, y + Math.sin(a) * c * 0.5, x + Math.cos(a) * c, y + Math.sin(a) * c);
        k.stroke();
      }
    }
    // o poço: a boca (raio R1) e o anel de lajes até R0; o fundo do poço desce para cima e à
    // esquerda, como quem olha de lado, um pouco fora do eixo
    const R0 = 338;
    const R1 = 238;
    const fundo = 30;
    const passoP = (d) => 1 / (1 + d * 0.12);
    const centro = (d) => [cx - (1 - passoP(d)) * 96, cy - (1 - passoP(d)) * 74];
    // a sombra do anel no chão
    k.save();
    k.filter = 'blur(14px)';
    k.fillStyle = 'rgba(60,48,20,.45)';
    k.beginPath();
    k.arc(cx + 14, cy + 18, R0 + 10, 0, Math.PI * 2);
    k.fill();
    k.restore();
    // as lajes da borda
    const nL = 13;
    for (let i = 0; i < nL; i++) {
      const a0 = (i / nL) * Math.PI * 2 + (r() - 0.5) * 0.05;
      const a1 = ((i + 1) / nL) * Math.PI * 2 + (r() - 0.5) * 0.05;
      const ro = R0 + (r() - 0.5) * 18;
      const p = new Path2D();
      const vao = 0.012;
      const n = 10;
      for (let s = 0; s <= n; s++) {
        const a = a0 + vao + (a1 - a0 - vao * 2) * (s / n);
        const rr = ro + Math.sin(s / n * Math.PI) * 6 + (r() - 0.5) * 4;
        if (s === 0) p.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else p.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      for (let s = n; s >= 0; s--) {
        const a = a0 + vao + (a1 - a0 - vao * 2) * (s / n);
        p.lineTo(cx + Math.cos(a) * (R1 - 2), cy + Math.sin(a) * (R1 - 2));
      }
      p.closePath();
      const tom = 196 + Math.round((r() - 0.5) * 34);
      const g = k.createRadialGradient(cx - 120, cy - 140, 60, cx, cy, R0 + 40);
      g.addColorStop(0, 'rgb(' + (tom + 46) + ',' + (tom + 34) + ',' + (tom + 2) + ')');
      g.addColorStop(1, 'rgb(' + (tom - 20) + ',' + (tom - 32) + ',' + (tom - 66) + ')');
      k.fillStyle = g;
      k.fill(p);
      k.save();
      k.clip(p);
      for (let q = 0; q < 380; q++) {
        const a = a0 + (a1 - a0) * r();
        const rr = R1 + (ro - R1) * r();
        k.fillStyle = r() < 0.55 ? 'rgba(70,60,34,' + (0.1 + r() * 0.2).toFixed(3) + ')' : 'rgba(255,253,240,.4)';
        k.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.6 + r() * 2, 1.6);
      }
      // a beirada de dentro, gasta e mais escura, onde a pedra desce para o poço
      const gi = k.createRadialGradient(cx, cy, R1, cx, cy, R1 + 46);
      gi.addColorStop(0, 'rgba(60,50,26,.55)');
      gi.addColorStop(1, 'rgba(60,50,26,0)');
      k.fillStyle = gi;
      k.fillRect(cx - R0 - 20, cy - R0 - 20, R0 * 2 + 40, R0 * 2 + 40);
      // os sulcos que a corda cavou na pedra, de tanto puxar água
      for (let q = 0; q < 1; q++) {
        if (r() < 0.6) continue;
        const a = a0 + (a1 - a0) * (0.2 + r() * 0.6);
        k.strokeStyle = 'rgba(50,42,20,.55)';
        k.lineWidth = 3;
        k.beginPath();
        k.moveTo(cx + Math.cos(a) * (R1 - 2), cy + Math.sin(a) * (R1 - 2));
        k.lineTo(cx + Math.cos(a + 0.01) * (R1 + 22 + r() * 16), cy + Math.sin(a + 0.01) * (R1 + 22 + r() * 16));
        k.stroke();
        k.strokeStyle = 'rgba(255,250,232,.5)';
        k.lineWidth = 1.2;
        k.beginPath();
        k.moveTo(cx + Math.cos(a + 0.012) * R1, cy + Math.sin(a + 0.012) * R1);
        k.lineTo(cx + Math.cos(a + 0.02) * (R1 + 20), cy + Math.sin(a + 0.02) * (R1 + 20));
        k.stroke();
      }
      // líquen sálvia e as lascas
      for (let q = 0; q < 3; q++) {
        const a = a0 + (a1 - a0) * r();
        const rr = R1 + 20 + (ro - R1 - 30) * r();
        const t = 3 + r() * 8;
        k.fillStyle = 'rgba(140,160,96,' + (0.12 + r() * 0.16).toFixed(3) + ')';
        k.beginPath();
        k.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, t, t * 0.7, r() * 3, 0, Math.PI * 2);
        k.fill();
      }
      k.strokeStyle = 'rgba(60,50,26,.4)';
      k.lineWidth = 1.2;
      for (let q = 0; q < 2; q++) {
        let a = a0 + (a1 - a0) * r();
        let rr = R1 + 10 + r() * 30;
        k.beginPath();
        k.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        for (let s = 0; s < 4; s++) { a += (r() - 0.5) * 0.06; rr += 10 + r() * 14; k.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        k.stroke();
      }
      // o lado de fora da laje, mais escuro (a espessura)
      k.strokeStyle = 'rgba(70,58,30,.45)';
      k.lineWidth = 8;
      k.stroke(p);
      k.restore();
      k.strokeStyle = 'rgba(60,50,26,.7)';
      k.lineWidth = 2;
      k.stroke(p);
    }
    // o poço por dentro: das fiadas mais fundas às de cima
    const boca = new Path2D();
    boca.arc(cx, cy, R1, 0, Math.PI * 2);
    k.save();
    k.clip(boca);
    k.fillStyle = '#050605';
    k.fillRect(0, 0, W, H);
    for (let d = fundo; d >= 0; d--) {
      const [ox, oy] = centro(d);
      const [ox2, oy2] = centro(d + 1);
      const ra = R1 * passoP(d);
      const rb = R1 * passoP(d + 1);
      const luz = Math.pow(0.9, d);
      const nb = 20;
      const desloc = (d % 2) * 0.5 + r() * 0.3;
      const cortes = [0];
      for (let b = 1; b < nb; b++) cortes.push((b + (r() - 0.5) * 0.7) / nb);
      cortes.push(1);
      for (let b = 0; b < nb; b++) {
        const a0 = (cortes[b] + desloc / nb) * Math.PI * 2;
        const a1 = (cortes[b + 1] + desloc / nb) * Math.PI * 2;
        const vao = 0.004;
        const p = new Path2D();
        const n = 6;
        for (let s = 0; s <= n; s++) {
          const a = a0 + vao + (a1 - a0 - vao * 2) * (s / n);
          const x = ox + Math.cos(a) * (ra - 1.5);
          const y = oy + Math.sin(a) * (ra - 1.5);
          if (s === 0) p.moveTo(x, y); else p.lineTo(x, y);
        }
        for (let s = n; s >= 0; s--) {
          const a = a0 + vao + (a1 - a0 - vao * 2) * (s / n);
          p.lineTo(ox2 + Math.cos(a) * (rb + 1.5), oy2 + Math.sin(a) * (rb + 1.5));
        }
        p.closePath();
        // o sol a pino bate mais no lado de baixo e à direita da parede (o lado que se vê de frente)
        const am = (a0 + a1) / 2;
        const face = 0.55 + 0.45 * Math.cos(am - Math.PI * 0.3);
        const v = luz * face * (0.8 + r() * 0.4);
        const tom = Math.round(20 + v * 170);
        // musgo sálvia nas pedras do meio para baixo
        const musgo = d > 3 && r() < 0.5 ? Math.min(1, (d - 3) / 5) : 0;
        const cR = Math.round(tom * (1.04 - musgo * 0.25));
        const cG = Math.round(tom * (0.95 + musgo * 0.08));
        const cB = Math.round(tom * (0.76 - musgo * 0.2));
        k.fillStyle = 'rgb(' + cR + ',' + cG + ',' + cB + ')';
        k.fill(p);
        k.save();
        k.clip(p);
        for (let q = 0; q < 26; q++) {
          const a = a0 + (a1 - a0) * r();
          const rr = rb + (ra - rb) * r();
          k.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.3)' : 'rgba(255,250,230,' + (0.15 * luz).toFixed(3) + ')';
          k.fillRect(ox + Math.cos(a) * rr, oy + Math.sin(a) * rr, 2, 2);
        }
        k.restore();
        k.strokeStyle = 'rgba(10,10,6,.6)';
        k.lineWidth = Math.max(0.8, 2 * passoP(d));
        k.stroke(p);
        if (luz > 0.2) {
          k.strokeStyle = 'rgba(255,248,225,' + (0.35 * luz * face).toFixed(3) + ')';
          k.lineWidth = Math.max(1, 2 * passoP(d));
          k.beginPath();
          k.arc(ox, oy, ra - 3, a0 + vao, a1 - vao);
          k.stroke();
        }
      }
    }
    // a água no fundo, com o céu redondo e o sol refletidos
    const [wx, wy] = centro(fundo + 1);
    const rw = R1 * passoP(fundo + 1);
    k.fillStyle = '#0a0d0b';
    k.beginPath();
    k.arc(wx, wy, rw, 0, Math.PI * 2);
    k.fill();
    const gc = k.createRadialGradient(wx + 4, wy + 3, 0, wx + 4, wy + 3, rw * 0.78);
    gc.addColorStop(0, 'rgba(232,236,214,.9)');
    gc.addColorStop(0.7, 'rgba(200,218,160,.55)');
    gc.addColorStop(1, 'rgba(200,218,160,0)');
    k.fillStyle = gc;
    k.beginPath();
    k.arc(wx + 4, wy + 3, rw * 0.78, 0, Math.PI * 2);
    k.fill();
    brilho(k, wx + 2, wy + 1, rw * 1.8, 'rgba(255,196,77,.55)', 'screen');
    brilho(k, wx + 2, wy + 1, rw * 0.38, 'rgba(255,255,245,1)');
    k.strokeStyle = 'rgba(255,246,214,.5)';
    k.lineWidth = 1.2;
    for (let i = 1; i <= 3; i++) {
      k.beginPath();
      k.arc(wx + 2, wy + 1, rw * (0.3 + i * 0.2), 0, Math.PI * 2);
      k.stroke();
    }
    // a escuridão que sobe do fundo, e o sol entrando pela boca
    const gs = k.createRadialGradient(wx, wy, rw * 1.5, cx, cy, R1);
    gs.addColorStop(0, 'rgba(0,0,0,0)');
    gs.addColorStop(0.35, 'rgba(0,0,0,.35)');
    gs.addColorStop(1, 'rgba(0,0,0,0)');
    k.fillStyle = gs;
    k.fillRect(0, 0, W, H);
    k.restore();
    // a sombra da beirada sobre as primeiras fiadas
    k.save();
    k.clip(boca);
    k.strokeStyle = 'rgba(0,0,0,.45)';
    k.lineWidth = 26;
    k.filter = 'blur(10px)';
    k.beginPath();
    k.arc(cx - 6, cy - 6, R1 + 6, Math.PI * 0.9, Math.PI * 1.9);
    k.stroke();
    k.restore();
    // a corda: o rolo no chão, passa pela borda e desce reto até sumir no escuro
    const ac = -0.62;
    const pBorda = [cx + Math.cos(ac) * (R1 + 4), cy + Math.sin(ac) * (R1 + 4)];
    const rolo = [cx + Math.cos(ac) * (R0 + 92), cy + Math.sin(ac) * (R0 + 92)];
    const corR = { cor: '#ddd3b2', escuro: '#4e4630', luz: 'rgba(255,252,236,.7)' };
    for (let i = 0; i < 5; i++) {
      const pts = [];
      for (let s = 0; s <= 48; s++) {
        const a = (s / 48) * Math.PI * 2 + i;
        const rr = 58 - i * 9;
        pts.push([rolo[0] + Math.cos(a) * rr + i * 3, rolo[1] + Math.sin(a) * rr * 0.92 - i * 2]);
      }
      cordao(k, pts, 8, corR);
    }
    cordao(k, bezier([rolo[0] - 52, rolo[1] + 10], [rolo[0] - 120, rolo[1] + 30], [pBorda[0] + 60, pBorda[1] - 20], pBorda, 30), 8, corR);
    k.save();
    k.clip(boca);
    const profundo = 22;
    let ant = null;
    for (let i = 0; i <= 60; i++) {
      const d = (i / 60) * profundo;
      const [ox, oy] = centro(d);
      const rr = (R1 - 6) * passoP(d);
      const p = [ox + Math.cos(ac) * rr, oy + Math.sin(ac) * rr];
      if (ant) {
        const luz = Math.pow(0.9, d);
        const lw = 8 * passoP(d);
        k.lineCap = 'round';
        k.strokeStyle = 'rgba(0,0,0,.5)';
        k.lineWidth = lw + 3;
        k.beginPath(); k.moveTo(ant[0], ant[1]); k.lineTo(p[0], p[1]); k.stroke();
        const tom = Math.round(40 + 180 * luz);
        k.strokeStyle = 'rgb(' + tom + ',' + Math.round(tom * 0.95) + ',' + Math.round(tom * 0.8) + ')';
        k.lineWidth = lw;
        k.beginPath(); k.moveTo(ant[0], ant[1]); k.lineTo(p[0], p[1]); k.stroke();
        if (i % 2 === 0) {
          k.strokeStyle = 'rgba(30,26,14,' + (0.5 * luz).toFixed(3) + ')';
          k.lineWidth = 1.2;
          const a = Math.atan2(p[1] - ant[1], p[0] - ant[0]) + Math.PI / 2 + 0.7;
          k.beginPath(); k.moveTo(p[0] - Math.cos(a) * lw / 2, p[1] - Math.sin(a) * lw / 2); k.lineTo(p[0] + Math.cos(a) * lw / 2, p[1] + Math.sin(a) * lw / 2); k.stroke();
        }
      }
      ant = p;
    }
    k.restore();
    // o calor do meio-dia por cima de tudo
    brilho(k, cx - 120, cy - 160, W * 0.75, 'rgba(255,226,160,.22)', 'screen');
    vinheta(k, W, H, 0.3);
  }

  // ---------- (3) Objetos: o azeite da viúva ----------
  // Uma casa fechada, quase no escuro, cheia de vasilhas emprestadas. A vasilha da viúva,
  // inclinada no alto, derrama um fio de azeite que acende tudo em volta; as bocas das
  // vasilhas cheias brilham no fundo. Só a luz da fresta e a do azeite.
  function desenhoAzeite(k, W, H) {
    const r = sorteio(4301);
    k.fillStyle = '#0c0d0a';
    k.fillRect(0, 0, W, H);
    // a parede de reboco
    for (let i = 0; i < 90; i++) {
      k.fillStyle = 'rgba(200,204,180,' + (0.01 + r() * 0.025).toFixed(3) + ')';
      k.beginPath();
      k.ellipse(r() * W, r() * H * 0.7, 30 + r() * 120, 12 + r() * 50, r() * 3, 0, Math.PI * 2);
      k.fill();
    }
    // a fresta no alto e o facho de luz fria
    const fx = 120;
    k.save();
    k.filter = 'blur(16px)';
    const gf = k.createLinearGradient(fx, 0, fx + 280, H);
    gf.addColorStop(0, 'rgba(226,232,206,.26)');
    gf.addColorStop(1, 'rgba(226,232,206,.02)');
    k.fillStyle = gf;
    k.beginPath();
    k.moveTo(fx - 30, -20);
    k.lineTo(fx + 30, -20);
    k.lineTo(fx + 360, H);
    k.lineTo(fx + 120, H);
    k.closePath();
    k.fill();
    k.restore();
    brilho(k, fx, -10, 140, 'rgba(232,236,216,.3)', 'screen');
    // o chão
    const chao = H * 0.64;
    const gc = k.createLinearGradient(0, chao, 0, H);
    gc.addColorStop(0, '#15160f');
    gc.addColorStop(1, '#0b0c09');
    k.fillStyle = gc;
    k.fillRect(0, chao, W, H - chao);
    // onde o fio cai
    const alvo = { x: W * 0.47, y: H * 0.72 };
    brilho(k, alvo.x, alvo.y, 520, 'rgba(255,190,70,.20)', 'screen');
    // perfis de vasilha
    const PERFIS = [
      (t) => (t < 0.08 ? 0.42 : t < 0.18 ? 0.36 : 0.4 + Math.sin(((t - 0.18) / 0.82) * Math.PI) ** 0.8 * 0.6 - Math.max(0, t - 0.85) * 1.8),
      (t) => (t < 0.06 ? 0.62 : 0.58 + Math.sin(Math.min(1, t / 0.95) * Math.PI * 0.9) * 0.42 - Math.max(0, t - 0.8) * 1.6),
      (t) => (t < 0.1 ? 0.3 : t < 0.25 ? 0.24 : 0.3 + Math.sin(((t - 0.25) / 0.75) * Math.PI) ** 0.6 * 0.7 - Math.max(0, t - 0.9) * 2.4),
    ];
    const vasilha = (x, base, alt, larg, tipo, { luz = 0.5, cheia = true, quente = 0.5 } = {}) => {
      const pf = PERFIS[tipo];
      const p = vaso(k, x, base, alt, larg, pf);
      k.save();
      k.filter = 'blur(6px)';
      k.fillStyle = 'rgba(0,0,0,.6)';
      k.beginPath();
      k.ellipse(x + larg * 0.1, base + 2, larg * 0.55, larg * 0.08, 0, 0, Math.PI * 2);
      k.fill();
      k.restore();
      // a luz do azeite vem do lado do alvo
      const lado = Math.sign(alvo.x - x) || 1;
      const g = k.createLinearGradient(x - lado * larg / 2, 0, x + lado * larg / 2, 0);
      const tom = (v) => Math.round(v);
      g.addColorStop(0, 'rgb(' + tom(16 + luz * 10) + ',' + tom(17 + luz * 10) + ',' + tom(13 + luz * 8) + ')');
      g.addColorStop(0.62, 'rgb(' + tom(40 + luz * 50) + ',' + tom(42 + luz * 50) + ',' + tom(30 + luz * 34) + ')');
      g.addColorStop(1, 'rgb(' + tom(60 + luz * 110) + ',' + tom(56 + luz * 90) + ',' + tom(34 + luz * 40) + ')');
      k.fillStyle = g;
      k.fill(p);
      // a gravura no lado da sombra
      const meiaL = larg / 2;
      gravar(k, p, x, base - alt / 2, Math.max(alt, larg) * 0.75, Math.PI / 2, Math.max(3, larg * 0.028), Math.max(0.8, larg * 0.016),
        (px) => 0.15 + (-(px - x) * lado / meiaL) * 0.75 + (1 - luz) * 0.3, 'rgba(0,0,0,.55)', 0.25);
      k.save();
      k.clip(p);
      for (let i = 0; i < alt * larg * 0.012; i++) {
        k.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.3)' : 'rgba(240,236,210,' + (0.04 + luz * 0.08).toFixed(3) + ')';
        k.fillRect(x - larg / 2 + r() * larg, base - alt + r() * alt, 1.6, 1.6);
      }
      // as faixas riscadas no barro
      k.strokeStyle = 'rgba(230,226,196,' + (0.06 + luz * 0.12).toFixed(3) + ')';
      k.lineWidth = Math.max(1, larg * 0.012);
      for (const y of [0.34, 0.38, 0.42]) {
        k.beginPath();
        k.ellipse(x, base - alt + alt * y, larg * 0.6, larg * 0.05, 0, 0.1, Math.PI - 0.1);
        k.stroke();
      }
      // a borda acesa pelo azeite
      k.globalCompositeOperation = 'screen';
      k.filter = 'blur(' + Math.max(2, Math.round(larg * 0.03)) + 'px)';
      k.strokeStyle = 'rgba(255,196,77,' + (quente * 0.9).toFixed(3) + ')';
      k.lineWidth = larg * 0.08;
      k.translate(-lado * larg * 0.04, 0);
      k.stroke(p);
      k.restore();
      // a boca
      const rb = pf(0) * larg / 2;
      const yb = base - alt;
      k.fillStyle = '#050504';
      k.beginPath();
      k.ellipse(x, yb, rb, rb * 0.24, 0, 0, Math.PI * 2);
      k.fill();
      if (cheia) {
        const go = k.createRadialGradient(x - rb * 0.2, yb - rb * 0.05, 0, x, yb, rb);
        go.addColorStop(0, '#fff2bf');
        go.addColorStop(0.45, '#ffc44d');
        go.addColorStop(1, '#a8741c');
        k.fillStyle = go;
        k.beginPath();
        k.ellipse(x, yb + rb * 0.04, rb * 0.86, rb * 0.19, 0, 0, Math.PI * 2);
        k.fill();
        brilho(k, x, yb, rb * 2.4, 'rgba(255,196,77,' + (0.22 + quente * 0.25).toFixed(3) + ')', 'screen');
      }
      k.strokeStyle = 'rgba(200,190,150,' + (0.2 + luz * 0.4).toFixed(3) + ')';
      k.lineWidth = Math.max(1.5, larg * 0.02);
      k.beginPath();
      k.ellipse(x, yb, rb, rb * 0.24, 0, 0, Math.PI * 2);
      k.stroke();
    };
    // fileira do fundo (pequenas, todas cheias)
    const fundo = [];
    for (let i = 0; i < 9; i++) fundo.push([40 + i * 102 + (r() - 0.5) * 20, chao + 8 + r() * 6, 92 + r() * 30, 56 + r() * 16, i % 3]);
    fundo.forEach(([x, b, a, l, t]) => vasilha(x, b, a, l, t, { luz: 0.18 + (1 - Math.abs(x - alvo.x) / W) * 0.3, quente: 0.25 }));
    // o banco de pedra encostado na parede, onde a vasilha da viúva está deitada
    const jx = W * 0.71;
    const jy = H * 0.29;
    const bTopo = jy + 76;
    const bx0 = jx - 40;
    k.save();
    k.filter = 'blur(10px)';
    k.fillStyle = 'rgba(0,0,0,.6)';
    k.fillRect(bx0 + 10, chao - 6, W - bx0, 24);
    k.restore();
    const gbf = k.createLinearGradient(bx0, 0, W, 0);
    gbf.addColorStop(0, '#2f3226');
    gbf.addColorStop(0.3, '#1b1d15');
    gbf.addColorStop(1, '#0f100c');
    k.fillStyle = gbf;
    k.fillRect(bx0, bTopo + 16, W - bx0 + 10, chao + 4 - bTopo - 16);
    const gbt = k.createLinearGradient(0, bTopo, 0, bTopo + 16);
    gbt.addColorStop(0, '#6b6a52');
    gbt.addColorStop(1, '#3a3b2d');
    k.fillStyle = gbt;
    k.beginPath();
    k.moveTo(bx0 + 10, bTopo);
    k.lineTo(W + 10, bTopo);
    k.lineTo(W + 10, bTopo + 16);
    k.lineTo(bx0, bTopo + 16);
    k.closePath();
    k.fill();
    k.save();
    k.beginPath();
    k.rect(bx0, bTopo, W - bx0 + 10, chao - bTopo);
    k.clip();
    for (let i = 0; i < 1400; i++) {
      k.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.35)' : 'rgba(230,226,200,.06)';
      k.fillRect(bx0 + r() * (W - bx0), bTopo + r() * (chao - bTopo), 2, 2);
    }
    k.strokeStyle = 'rgba(0,0,0,.5)';
    k.lineWidth = 2;
    for (const y of [bTopo + 90, bTopo + 170]) {
      k.beginPath();
      k.moveTo(bx0, y);
      k.lineTo(W, y + 3);
      k.stroke();
    }
    for (const [x, y0, y1] of [[bx0 + 120, bTopo + 16, bTopo + 90], [bx0 + 60, bTopo + 90, bTopo + 170], [bx0 + 190, bTopo + 90, bTopo + 170], [bx0 + 140, bTopo + 170, chao]]) {
      k.beginPath();
      k.moveTo(x, y0);
      k.lineTo(x + 2, y1);
      k.stroke();
    }
    k.restore();
    k.save();
    k.globalCompositeOperation = 'screen';
    k.strokeStyle = 'rgba(255,196,77,.55)';
    k.lineWidth = 4;
    k.filter = 'blur(2px)';
    k.beginPath();
    k.moveTo(bx0 + 10, bTopo + 1);
    k.lineTo(W, bTopo + 1);
    k.moveTo(bx0 + 1, bTopo + 16);
    k.lineTo(bx0 + 1, chao);
    k.stroke();
    k.restore();
    // fileira do meio
    const meio = [[110, 0.82, 170, 104, 0], [290, 0.83, 150, 120, 1], [660, 0.82, 176, 100, 2], [820, 0.84, 150, 112, 0]];
    meio.forEach(([x, b, a, l, t]) => vasilha(x, H * b, a, l, t, { luz: 0.35 + (1 - Math.abs(x - alvo.x) / W) * 0.45, quente: 0.45 }));
    // a da frente, que recebe o fio, e duas de lado
    vasilha(W * 0.13, H * 1.04, 300, 190, 2, { luz: 0.45, quente: 0.4, cheia: true });
    vasilha(W * 0.86, H * 1.05, 270, 210, 0, { luz: 0.6, quente: 0.55, cheia: false });
    const ab = 250;
    const al = 230;
    vasilha(alvo.x, alvo.y + ab, ab, al, 1, { luz: 0.9, quente: 0.95, cheia: true });
    // as ondinhas do azeite caindo na boca
    k.save();
    k.globalCompositeOperation = 'screen';
    for (let i = 1; i <= 3; i++) {
      k.strokeStyle = 'rgba(255,240,190,' + (0.6 / i).toFixed(3) + ')';
      k.lineWidth = 2;
      k.beginPath();
      k.ellipse(alvo.x + 6, alvo.y + 6, 16 * i, 3.6 * i, 0, 0, Math.PI * 2);
      k.stroke();
    }
    k.restore();
    // a vasilha da viúva, inclinada no alto, e o fio de azeite
    const bico = [jx - 88, jy + 30];
    const fio = new Path2D();
    fio.moveTo(bico[0], bico[1]);
    fio.bezierCurveTo(bico[0] - 40, bico[1] + 14, alvo.x + 8, alvo.y - 200, alvo.x + 6, alvo.y + 4);
    k.save();
    k.lineCap = 'round';
    k.globalCompositeOperation = 'screen';
    k.filter = 'blur(14px)';
    k.strokeStyle = 'rgba(255,190,60,.8)';
    k.lineWidth = 26;
    k.stroke(fio);
    k.filter = 'blur(3px)';
    k.strokeStyle = 'rgba(255,205,90,1)';
    k.lineWidth = 9;
    k.stroke(fio);
    k.filter = 'none';
    k.strokeStyle = '#ffd56a';
    k.lineWidth = 5;
    k.stroke(fio);
    k.strokeStyle = '#fff8dc';
    k.lineWidth = 1.6;
    k.stroke(fio);
    k.restore();
    k.save();
    k.translate(jx, jy);
    k.rotate(-1.9);
    const jarro = vaso(k, 0, 120, 210, 170, (t) => (t < 0.06 ? 0.4 : t < 0.2 ? 0.32 : 0.36 + Math.sin(((t - 0.2) / 0.8) * Math.PI) ** 0.7 * 0.64 - Math.max(0, t - 0.88) * 2));
    k.strokeStyle = '#3d4130';
    k.lineWidth = 16;
    k.lineCap = 'round';
    k.beginPath();
    k.moveTo(24, -62);
    k.bezierCurveTo(100, -92, 116, -20, 72, -2);
    k.stroke();
    const gjr = k.createLinearGradient(-85, 0, 85, 0);
    gjr.addColorStop(0, '#6c7254');
    gjr.addColorStop(0.4, '#3a3f2c');
    gjr.addColorStop(1, '#14160f');
    k.fillStyle = gjr;
    k.fill(jarro);
    k.save();
    k.clip(jarro);
    k.globalCompositeOperation = 'screen';
    k.filter = 'blur(6px)';
    k.strokeStyle = 'rgba(255,196,77,.7)';
    k.lineWidth = 16;
    k.translate(-6, 0);
    k.stroke(jarro);
    k.restore();
    k.fillStyle = '#060605';
    k.beginPath();
    k.ellipse(0, -90, 34, 8, 0, 0, Math.PI * 2);
    k.fill();
    k.strokeStyle = 'rgba(220,210,170,.6)';
    k.lineWidth = 3;
    k.stroke();
    k.restore();
    // a poeira na luz
    for (let i = 0; i < 160; i++) {
      const t = r();
      const x = fx + t * 260 + (r() - 0.5) * (60 + t * 160);
      const y = 40 + t * (H - 60);
      k.fillStyle = 'rgba(240,240,220,' + ((1 - t) * (0.2 + r() * 0.5)).toFixed(3) + ')';
      k.beginPath();
      k.arc(x, y, 0.7 + r() * 1.8, 0, Math.PI * 2);
      k.fill();
    }
    vinheta(k, W, H, 0.6);
  }

  // ---------- (4) Milagres: o mar aberto (especial) ----------
  // Do alto, como gravura de mapa antigo: o mar escuro dos dois lados, de ondas riscadas, e o
  // caminho de areia seca cortando até a outra margem, onde amanhece. As paredes de água
  // aparecem pela face e pela espuma da crista; na areia, as marcas de onda e as pegadas de
  // muita gente que já passou (ninguém desenhado). O vento risca tudo na mesma direção.
  function desenhoMar(k, W, H) {
    const r = sorteio(4401);
    const hz = H * 0.17;
    // o céu do amanhecer e a outra margem
    const ceu = k.createLinearGradient(0, 0, 0, hz);
    ceu.addColorStop(0, '#11140f');
    ceu.addColorStop(0.65, '#5a5232');
    ceu.addColorStop(1, '#e8c46e');
    k.fillStyle = ceu;
    k.fillRect(0, 0, W, hz + 2);
    brilho(k, W * 0.5, hz, 420, 'rgba(255,214,120,.55)', 'screen');
    for (let i = 0; i < 60; i++) {
      const y = r() * hz * 0.5;
      k.fillStyle = 'rgba(242,236,216,' + (0.2 + r() * 0.5).toFixed(3) + ')';
      k.fillRect(r() * W, y, 1.6, 1.6);
    }
    const fm = onda(sorteio(4402), 4, 0.012);
    k.fillStyle = '#1d1c14';
    k.beginPath();
    k.moveTo(0, hz + 4);
    for (let x = 0; x <= W; x += 6) k.lineTo(x, hz - 6 - Math.max(0, fm(x)) * 7 - (Math.abs(x - W / 2) < 60 ? 0 : 3));
    k.lineTo(W, hz + 4);
    k.fill();
    // a perspectiva: t = 0 na borda de baixo, t = 1 no horizonte
    const yDe = (t) => hz + (H * 1.14 - hz) * Math.pow(1 - t, 1.6);
    const esc = (t) => Math.pow(1 - t, 1.6) * 0.97 + 0.03;
    const borda = onda(sorteio(4404), 5, 14);
    const meio = (t) => W * 0.5 + Math.sin(t * Math.PI * 1.3 + 0.2) * 110 * esc(t) - 30 * (1 - t);
    const meia = (t) => (6 + W * 0.17 * esc(t)) * (1 + borda(t) * 0.035);
    const face = (t) => W * 0.13 * esc(t);
    // o mar inteiro, depois o caminho por cima
    const gm = k.createLinearGradient(0, hz, 0, H);
    gm.addColorStop(0, '#3c4a35');
    gm.addColorStop(0.25, '#1a241c');
    gm.addColorStop(1, '#070b09');
    k.fillStyle = gm;
    k.fillRect(0, hz, W, H - hz);
    brilho(k, W * 0.5, hz, 520, 'rgba(255,200,100,.25)', 'screen');
    // as ondas em gravura: fileiras de cristas curvas, menores e mais juntas no fundo
    k.lineCap = 'round';
    for (let i = 0; i < 140; i++) {
      const t = 1 - Math.pow(i / 140, 0.85);
      const y = yDe(t);
      const s = esc(t);
      const passo = 20 + 60 * s;
      let x = -r() * passo;
      while (x < W + passo) {
        const w = passo * (0.6 + r() * 0.5);
        const h = 3 + 10 * s;
        const perto = Math.abs(x - W * 0.5) / (W * 0.5);
        const ondulado = 0.5 + 0.25 * (Math.sin(x * 0.011 + y * 0.03) + Math.sin(x * 0.006 - y * 0.017 + 2));
        const luz = ((1 - t) * 0.1 + t * 0.35 * (1 - perto * 0.6)) * (0.4 + ondulado * 1.2);
        k.strokeStyle = 'rgba(214,230,190,' + (0.06 + luz + r() * 0.1 * ondulado).toFixed(3) + ')';
        k.lineWidth = 0.7 + 2 * s;
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x + w * 0.5, y - h, x + w, y);
        k.stroke();
        k.strokeStyle = 'rgba(0,0,0,' + (0.25 + r() * 0.2).toFixed(3) + ')';
        k.lineWidth = 0.8 + 2.4 * s;
        k.beginPath();
        k.moveTo(x + w * 0.1, y + h * 0.5);
        k.quadraticCurveTo(x + w * 0.55, y - h * 0.3, x + w * 0.95, y + h * 0.5);
        k.stroke();
        x += w * (0.9 + r() * 0.3);
      }
    }
    // o reflexo da luz no mar, uma trilha de brilhos que vem do horizonte
    k.save();
    k.globalCompositeOperation = 'screen';
    for (let i = 0; i < 260; i++) {
      const t = Math.pow(r(), 0.5);
      const y = yDe(t);
      const lado = r() < 0.5 ? -1 : 1;
      const x = meio(t) + lado * (meia(t) + face(t) + r() * (60 + 260 * esc(t)));
      k.strokeStyle = 'rgba(255,214,120,' + (t * 0.5 * r()).toFixed(3) + ')';
      k.lineWidth = 1 + esc(t) * 2;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + 6 + esc(t) * 24, y);
      k.stroke();
    }
    k.restore();
    // as faces das paredes: a água em pé, que sobe da areia até o nível do mar; a crista
    // ondula e espuma, a água escorre pela face, mais clara no alto, onde a luz atravessa
    const n = 90;
    const ondaC = onda(sorteio(4403), 5, 30);
    const crista = (t, lado) => {
      const s = esc(t);
      const f = face(t);
      return [meio(t) + lado * (meia(t) + f * 0.42 + ondaC(t + lado) * 3 * s), yDe(t) - f * 1.05 + ondaC(t * 1.7 + lado * 2) * 5 * s];
    };
    for (const lado of [-1, 1]) {
      const p = new Path2D();
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = meio(t) + lado * meia(t);
        if (i === 0) p.moveTo(x, yDe(t) + 2); else p.lineTo(x, yDe(t));
      }
      for (let i = n; i >= 0; i--) p.lineTo(...crista(i / n, lado));
      p.closePath();
      k.fillStyle = '#0d1611';
      k.fill(p);
      k.save();
      k.clip(p);
      // a luz atravessando a água fina perto da crista
      const linhaC = () => { k.beginPath(); for (let i = 0; i <= n; i++) { const [x, y] = crista(i / n, lado); if (i === 0) k.moveTo(x, y); else k.lineTo(x, y); } };
      for (const [lw, cor, b] of [[90, 'rgba(70,92,66,.9)', 30], [36, 'rgba(120,146,104,.75)', 14], [10, 'rgba(190,212,160,.6)', 5]]) {
        k.filter = 'blur(' + b + 'px)';
        k.strokeStyle = cor;
        k.lineWidth = lw;
        linhaC();
        k.stroke();
      }
      k.filter = 'none';
      // perto do horizonte a face pega o dourado
      brilho(k, W * 0.5, hz, 300, 'rgba(255,200,100,.45)', 'screen');
      // a água escorrendo: riscos da crista para baixo
      for (let i = 0; i < 1400; i++) {
        const t = Math.pow(r(), 0.9);
        const s = esc(t);
        const [cx2, cy2] = crista(t, lado);
        const bx = meio(t) + lado * meia(t);
        const by = yDe(t);
        const s0 = r() * 0.9;
        const s1 = Math.min(1, s0 + 0.08 + r() * 0.35);
        const claro = r() < 0.5;
        k.strokeStyle = claro ? 'rgba(206,226,190,' + (0.04 + (1 - s0) * 0.14 * r()).toFixed(3) + ')' : 'rgba(0,0,0,' + (0.1 + r() * 0.18).toFixed(3) + ')';
        k.lineWidth = 0.5 + s * 1.8 * r();
        k.beginPath();
        k.moveTo(cx2 + (bx - cx2) * s0, cy2 + (by - cy2) * s0);
        k.lineTo(cx2 + (bx - cx2) * s1, cy2 + (by - cy2) * s1);
        k.stroke();
      }
      // o pé da parede, escuro e molhado
      k.filter = 'blur(6px)';
      k.strokeStyle = 'rgba(0,0,0,.6)';
      k.lineWidth = 18;
      k.beginPath();
      for (let i = 0; i <= n; i++) { const t = i / n; const x = meio(t) + lado * meia(t); if (i === 0) k.moveTo(x, yDe(t)); else k.lineTo(x, yDe(t)); }
      k.stroke();
      k.restore();
      // a espuma da crista e o borrifo levado pelo vento
      k.save();
      k.lineCap = 'round';
      k.lineJoin = 'round';
      k.filter = 'blur(5px)';
      k.strokeStyle = 'rgba(232,240,226,.4)';
      k.lineWidth = 14;
      linhaC();
      k.stroke();
      k.filter = 'none';
      k.strokeStyle = 'rgba(244,247,236,.7)';
      k.lineWidth = 1.5;
      linhaC();
      k.stroke();
      for (let i = 0; i < 160; i++) {
        const t = Math.pow(r(), 0.9) * 0.97;
        const s = esc(t);
        const [x, y] = crista(t, lado);
        const tam = 2 + 9 * s * r();
        const gb = k.createRadialGradient(x, y, 0, x, y, tam);
        gb.addColorStop(0, 'rgba(250,252,244,.85)');
        gb.addColorStop(1, 'rgba(250,252,244,0)');
        k.fillStyle = gb;
        k.beginPath();
        k.arc(x + (r() - 0.5) * tam, y + (r() - 0.5) * tam * 0.6, tam, 0, Math.PI * 2);
        k.fill();
      }
      for (let i = 0; i < 700; i++) {
        const t = Math.pow(r(), 0.8);
        const s = esc(t);
        const [x0, y0] = crista(t, lado);
        const x = x0 + (r() - 0.5) * 16 * s + lado * r() * 30 * s;
        const y = y0 - r() * 22 * s;
        k.fillStyle = 'rgba(242,246,234,' + (0.12 + r() * 0.55).toFixed(3) + ')';
        k.beginPath();
        k.arc(x, y, 0.4 + r() * 1.8 * s + 0.3, 0, Math.PI * 2);
        k.fill();
      }
      k.restore();
    }
    // o caminho de areia seca
    const cam = new Path2D();
    for (let i = 0; i <= n; i++) { const t = i / n; if (i === 0) cam.moveTo(meio(t) - meia(t), yDe(t)); else cam.lineTo(meio(t) - meia(t), yDe(t)); }
    for (let i = n; i >= 0; i--) { const t = i / n; cam.lineTo(meio(t) + meia(t), yDe(t)); }
    cam.closePath();
    const ga = k.createLinearGradient(0, hz, 0, H);
    ga.addColorStop(0, '#ffe2a0');
    ga.addColorStop(0.12, '#e6cd8f');
    ga.addColorStop(0.4, '#a99a6c');
    ga.addColorStop(1, '#4c4836');
    k.fillStyle = ga;
    k.fill(cam);
    k.save();
    k.clip(cam);
    for (let i = 0; i < 9000; i++) {
      const t = Math.pow(r(), 0.8);
      k.fillStyle = r() < 0.55 ? 'rgba(40,36,20,' + (0.06 + r() * 0.14).toFixed(3) + ')' : 'rgba(255,248,220,.25)';
      k.fillRect(meio(t) + (r() - 0.5) * 2 * meia(t), yDe(t), 1.4, 1.4);
    }
    // as marcas de onda na areia, atravessadas
    for (let i = 0; i < 70; i++) {
      const t = 1 - Math.pow(i / 70, 0.8);
      const y = yDe(t);
      const s = esc(t);
      const m = meia(t);
      const fase = r() * 6;
      for (const [cor, dy, lw] of [['rgba(60,52,30,' + (0.25 + s * 0.15).toFixed(3) + ')', 1.2 + 2 * s, 0.6 + 1.8 * s], ['rgba(255,246,214,' + (0.15 + t * 0.3).toFixed(3) + ')', 0, 0.5 + 1.2 * s]]) {
        k.strokeStyle = cor;
        k.lineWidth = lw;
        k.beginPath();
        for (let x = meio(t) - m - 4; x <= meio(t) + m + 4; x += 5) {
          const yy = y + dy + Math.sin((x - meio(t)) * (0.05 / s) * 0.4 + fase) * 3 * s;
          if (x === meio(t) - m - 4) k.moveTo(x, yy); else k.lineTo(x, yy);
        }
        k.stroke();
      }
    }
    // as pegadas: muita gente passou por aqui
    for (let i = 0; i < 420; i++) {
      const t = Math.pow(r(), 1.15) * 0.92;
      const s = esc(t);
      const x = meio(t) + (r() - 0.5) * 1.7 * meia(t) * Math.min(1, 0.6 + r());
      const y = yDe(t);
      const tam = 7 * s + 0.6;
      const ang = Math.sin(t * Math.PI * 1.2) * -0.3 * s;
      for (const [dx, dy] of [[-tam * 0.55, 0], [tam * 0.55, -tam * 1.5]]) {
        k.save();
        k.translate(x + dx, y + dy * 0.45);
        k.rotate(ang);
        k.fillStyle = 'rgba(40,34,18,' + (0.3 + s * 0.25).toFixed(3) + ')';
        k.beginPath();
        k.ellipse(0, 0, tam * 0.36, tam * 0.85 * 0.45, 0, 0, Math.PI * 2);
        k.fill();
        k.fillStyle = 'rgba(255,248,220,' + (0.18 + s * 0.12).toFixed(3) + ')';
        k.beginPath();
        k.ellipse(tam * 0.08, tam * 0.1, tam * 0.28, tam * 0.08, 0, 0, Math.PI);
        k.fill();
        k.restore();
      }
    }
    // a sombra das paredes sobre a areia, e as poças com a luz
    for (const lado of [-1, 1]) {
      const gs = k.createLinearGradient(W / 2 + lado * 40, 0, W / 2 + lado * W * 0.2, 0);
      gs.addColorStop(0, 'rgba(0,0,0,0)');
      gs.addColorStop(1, 'rgba(10,14,10,.45)');
      k.fillStyle = gs;
      k.fillRect(0, hz, W, H);
    }
    k.globalCompositeOperation = 'screen';
    for (let i = 0; i < 14; i++) {
      const t = 0.15 + r() * 0.8;
      const s = esc(t);
      const x = meio(t) + (r() - 0.5) * 1.4 * meia(t);
      const y = yDe(t);
      const w = 4 + 40 * s * (0.5 + r());
      const go = k.createRadialGradient(x, y, 0, x, y, w);
      go.addColorStop(0, 'rgba(255,220,140,' + (0.25 + t * 0.4).toFixed(3) + ')');
      go.addColorStop(1, 'rgba(255,220,140,0)');
      k.fillStyle = go;
      k.save();
      k.translate(x, y);
      k.scale(1, 0.3);
      k.translate(-x, -y);
      k.beginPath();
      k.arc(x, y, w, 0, Math.PI * 2);
      k.fill();
      k.restore();
    }
    k.restore();
    // a linha molhada no pé de cada parede
    k.strokeStyle = 'rgba(230,240,226,.5)';
    for (const lado of [-1, 1]) {
      k.beginPath();
      for (let i = 0; i <= n; i++) { const t = i / n; k.lineWidth = 2; const x = meio(t) + lado * meia(t); if (i === 0) k.moveTo(x, yDe(t)); else k.lineTo(x, yDe(t)); }
      k.stroke();
    }
    // o vento do oriente: riscos longos e finos atravessando tudo
    k.save();
    k.globalCompositeOperation = 'screen';
    for (let i = 0; i < 40; i++) {
      const y = hz + r() * (H - hz);
      const x = r() * W - 200;
      const w = 160 + r() * 380;
      k.strokeStyle = 'rgba(232,238,220,' + (0.05 + r() * 0.08).toFixed(3) + ')';
      k.lineWidth = 0.8 + r() * 1.4;
      k.beginPath();
      k.moveTo(x, y);
      k.bezierCurveTo(x + w * 0.3, y - 14, x + w * 0.7, y - 30, x + w, y - 50);
      k.stroke();
    }
    k.restore();
    vinheta(k, W, H, 0.5);
  }

  const DESENHOS = { davi: desenhoDavi, poco: desenhoPoco, azeite: desenhoAzeite, mar: desenhoMar };

  // ---------- a carta ----------
  const oswald = (t, peso = 600) => peso + ' ' + t + 'px Oswald, "Arial Narrow", sans-serif';
  const literata = (t, peso = 600) => peso + ' ' + t + 'px Literata, Georgia, serif';
  const manrope = (t, peso = 600) => peso + ' ' + t + 'px Manrope, sans-serif';
  function escrever(k, txt, x, y, fonte, cor, { alinhar = 'left', espaco = 0 } = {}) {
    k.font = fonte;
    k.fillStyle = cor;
    k.textAlign = alinhar;
    k.textBaseline = 'alphabetic';
    try { k.letterSpacing = espaco + 'px'; } catch (e) { /* navegador sem letterSpacing */ }
    k.fillText(txt, x, y);
    try { k.letterSpacing = '0px'; } catch (e) { /* idem */ }
  }
  // Quebra em linhas equilibradas (sem palavra sozinha na última).
  function quebrar(k, texto, fonte, largura) {
    k.font = fonte;
    const palavras = String(texto).split(/\s+/);
    const cheias = (w) => {
      const linhas = [];
      let atual = '';
      for (const p of palavras) {
        const t = atual ? atual + ' ' + p : p;
        if (atual && k.measureText(t).width > w) { linhas.push(atual); atual = p; } else atual = t;
      }
      if (atual) linhas.push(atual);
      return linhas;
    };
    const base = cheias(largura);
    let melhor = base;
    for (let w = largura; w > largura * 0.5; w -= 8) {
      const t = cheias(w);
      if (t.length !== base.length) break;
      melhor = t;
    }
    return melhor;
  }
  function estrelinha(k, x, y, raio, cor) {
    k.fillStyle = cor;
    k.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const d = i % 2 ? raio * 0.22 : raio;
      k.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    k.closePath();
    k.fill();
  }
  // A folha dourada da carta especial: o metal com as faixas de luz, o escovado e o relevo.
  function folhaDourada(k, w, h, r) {
    const g = k.createLinearGradient(0, 0, w, h);
    [[0, '#7a5714'], [0.14, '#d9a23a'], [0.27, '#fff0b8'], [0.36, '#e3ae45'], [0.52, '#8c6519'], [0.66, '#e8b84e'],
      [0.78, '#fff4c8'], [0.88, '#c99430'], [1, '#6e4f12']].forEach(([p, c]) => g.addColorStop(p, c));
    k.fillStyle = g;
    k.fillRect(0, 0, w, h);
    // o escovado do metal
    for (let i = 0; i < 1800; i++) {
      const y = r() * h;
      k.strokeStyle = r() < 0.5 ? 'rgba(255,250,220,' + (0.04 + r() * 0.08).toFixed(3) + ')' : 'rgba(80,50,0,' + (0.04 + r() * 0.08).toFixed(3) + ')';
      k.lineWidth = 0.8 + r();
      const x = r() * w;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + 60 + r() * 200, y + (r() - 0.5) * 4);
      k.stroke();
    }
    // a faixa de brilho na diagonal
    k.save();
    k.globalCompositeOperation = 'screen';
    k.filter = 'blur(30px)';
    k.fillStyle = 'rgba(255,252,235,.55)';
    k.beginPath();
    k.moveTo(w * 0.55, -50);
    k.lineTo(w * 0.72, -50);
    k.lineTo(w * 0.2, h + 50);
    k.lineTo(w * 0.03, h + 50);
    k.fill();
    k.restore();
  }
  function desenharCarta(c, carta) {
    const k = c.getContext('2d');
    const s = c.width / CW;
    k.save();
    k.setTransform(s, 0, 0, s, 0, 0);
    const r = sorteio(9000 + carta.id.length * 97 + carta.numero);
    const esp = !!carta.especial;
    // o formato da carta
    retRedondo(k, 0, 0, CW, CH, 46);
    k.save();
    k.clip();
    if (esp) {
      folhaDourada(k, CW, CH, r);
    } else {
      k.fillStyle = COR.preto;
      k.fillRect(0, 0, CW, CH);
      brilho(k, CW * 0.3, 0, 900, 'rgba(200,218,140,.08)');
      for (let i = 0; i < 1200; i++) {
        k.fillStyle = r() < 0.5 ? 'rgba(255,255,240,.035)' : 'rgba(0,0,0,.2)';
        k.fillRect(r() * CW, r() * CH, 2, 2);
      }
    }
    // o filete por dentro da borda
    k.lineWidth = 2;
    k.strokeStyle = esp ? 'rgba(70,46,6,.55)' : 'rgba(242,236,216,.22)';
    retRedondo(k, 20, 20, CW - 40, CH - 40, 30);
    k.stroke();
    if (esp) {
      k.strokeStyle = 'rgba(255,248,214,.5)';
      retRedondo(k, 23, 23, CW - 46, CH - 46, 28);
      k.stroke();
    }
    // o álbum e o número, no alto
    const corTopo = esp ? '#2a1d04' : COR.creme;
    const rotulo = carta.album.toUpperCase() + '  ·  ' + carta.numero + '/' + carta.total;
    escrever(k, rotulo, CW / 2, 86, oswald(32, 600), corTopo, { alinhar: 'center', espaco: 4.5 });
    k.font = oswald(32, 600);
    try { k.letterSpacing = '4.5px'; } catch (e) { /* idem */ }
    const wr = k.measureText(rotulo).width;
    try { k.letterSpacing = '0px'; } catch (e) { /* idem */ }
    if (esp) {
      estrelinha(k, CW / 2 - wr / 2 - 30, 74, 12, '#2a1d04');
      estrelinha(k, CW / 2 + wr / 2 + 30, 74, 12, '#2a1d04');
    } else {
      k.fillStyle = 'rgba(200,218,140,.7)';
      for (const lado of [-1, 1]) k.fillRect(CW / 2 + lado * (wr / 2 + 26) - (lado < 0 ? 40 : 0), 73, 40, 2);
    }
    // a janela da ilustração
    const jx = 56;
    const jy = 118;
    const jw = CW - 112;
    const jh = 846;
    const ilu = tela(jw, jh);
    const ki = ilu.getContext('2d');
    (DESENHOS[carta.desenho] || desenhoDavi)(ki, jw, jh);
    grao(ki, jw, jh, 16, 5000 + carta.numero);
    k.save();
    retRedondo(k, jx, jy, jw, jh, 22);
    k.clip();
    k.imageSmoothingQuality = 'high';
    k.drawImage(ilu, jx, jy);
    k.restore();
    k.lineWidth = 3;
    k.strokeStyle = esp ? 'rgba(60,40,4,.75)' : 'rgba(0,0,0,.8)';
    retRedondo(k, jx, jy, jw, jh, 22);
    k.stroke();
    k.lineWidth = 1.5;
    k.strokeStyle = esp ? 'rgba(255,246,210,.6)' : 'rgba(242,236,216,.16)';
    retRedondo(k, jx - 4, jy - 4, jw + 8, jh + 8, 25);
    k.stroke();
    // o papel do texto
    const py = jy + jh + 16;
    const ph = CH - 56 - py;
    k.save();
    retRedondo(k, jx, py, jw, ph, 22);
    k.clip();
    k.fillStyle = COR.papel;
    k.fillRect(jx, py, jw, ph);
    brilho(k, CW / 2, py + ph * 0.4, 520, 'rgba(255,252,240,.5)');
    for (let i = 0; i < 2400; i++) {
      k.fillStyle = r() < 0.6 ? 'rgba(90,80,50,' + (0.03 + r() * 0.06).toFixed(3) + ')' : 'rgba(255,255,250,.3)';
      const x = jx + r() * jw;
      const y = py + r() * ph;
      k.fillRect(x, y, 1 + r() * 3, 1);
    }
    const gb = k.createLinearGradient(0, py, 0, py + ph);
    gb.addColorStop(0, 'rgba(60,50,20,.10)');
    gb.addColorStop(0.15, 'rgba(60,50,20,0)');
    gb.addColorStop(0.85, 'rgba(60,50,20,0)');
    gb.addColorStop(1, 'rgba(60,50,20,.12)');
    k.fillStyle = gb;
    k.fillRect(jx, py, jw, ph);
    k.restore();
    // o texto
    const x0 = jx + 44;
    const larg = jw - 88;
    let tT = 64;
    k.font = literata(tT);
    while (k.measureText(carta.titulo).width > larg && tT > 44) { tT -= 2; k.font = literata(tT); }
    escrever(k, carta.titulo, x0, py + 74, literata(tT), COR.tinta, { espaco: -0.5 });
    escrever(k, 'VOCÊ SABIA?', x0, py + 124, oswald(24, 600), COR.salviaEscura, { espaco: 4 });
    const linhas = quebrar(k, carta.sabia, manrope(38, 600), larg);
    linhas.slice(0, 3).forEach((l, i) => escrever(k, l, x0, py + 174 + i * 48, manrope(38, 600), '#2b2c25'));
    // o pé: a referência e a marca
    const yPe = py + ph - 38;
    k.fillStyle = 'rgba(35,36,30,.18)';
    k.fillRect(x0, yPe - 50, larg, 2);
    escrever(k, carta.ref.toUpperCase(), x0, yPe, oswald(28, 600), '#45463c', { espaco: 3 });
    if (CC.story && CC.CAMINHO_SIMBOLO) {
      k.font = manrope(22, 800);
      const wn = k.measureText('Geração Eleita').width;
      const hl = 34;
      CC.story.logo(k, x0 + larg - wn - 12 - hl * 0.7, yPe - hl + 6, hl, '#45463c');
      escrever(k, 'Geração Eleita', x0 + larg, yPe - 2, manrope(22, 800), '#45463c', { alinhar: 'right' });
    }
    if (esp) {
      // um brilho de folha também no papel: o filete dourado em volta
      k.lineWidth = 3;
      const gf = k.createLinearGradient(jx, py, jx + jw, py + ph);
      gf.addColorStop(0, '#b8862a');
      gf.addColorStop(0.5, '#ffe7a0');
      gf.addColorStop(1, '#a87a22');
      k.strokeStyle = gf;
      retRedondo(k, jx + 10, py + 10, jw - 20, ph - 20, 14);
      k.stroke();
      estrelinha(k, jx + jw - 40, py + 52, 14, '#c99430');
    }
    k.restore();
    // o relevo da borda de fora
    k.lineWidth = 3;
    k.strokeStyle = esp ? 'rgba(90,60,10,.6)' : 'rgba(0,0,0,.6)';
    retRedondo(k, 1.5, 1.5, CW - 3, CH - 3, 45);
    k.stroke();
    k.restore();
    return c;
  }
  // O verso: o mesmo para todas, para a surpresa ficar na virada.
  function desenharVerso(c) {
    const k = c.getContext('2d');
    const s = c.width / CW;
    k.save();
    k.setTransform(s, 0, 0, s, 0, 0);
    const r = sorteio(777);
    retRedondo(k, 0, 0, CW, CH, 46);
    k.clip();
    k.fillStyle = '#151612';
    k.fillRect(0, 0, CW, CH);
    brilho(k, CW / 2, CH / 2, 760, 'rgba(200,218,140,.12)');
    // a guilhoché: anéis finos ondulados em volta do centro
    k.lineWidth = 1.4;
    for (let i = 0; i < 46; i++) {
      const raio = 70 + i * 13;
      k.strokeStyle = 'rgba(200,218,140,' + (0.05 + (i % 4 === 0 ? 0.08 : 0.03)).toFixed(3) + ')';
      k.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.02) {
        const d = raio + Math.sin(a * 18 + i * 0.4) * 5;
        const x = CW / 2 + Math.cos(a) * d * 0.92;
        const y = CH / 2 + Math.sin(a) * d * 1.12;
        if (a === 0) k.moveTo(x, y); else k.lineTo(x, y);
      }
      k.stroke();
    }
    for (let i = 0; i < 1500; i++) {
      k.fillStyle = r() < 0.5 ? 'rgba(255,255,240,.04)' : 'rgba(0,0,0,.25)';
      k.fillRect(r() * CW, r() * CH, 2, 2);
    }
    // o medalhão com o símbolo
    k.fillStyle = '#151612';
    k.beginPath();
    k.arc(CW / 2, CH / 2, 150, 0, Math.PI * 2);
    k.fill();
    k.strokeStyle = 'rgba(255,196,77,.85)';
    k.lineWidth = 4;
    k.stroke();
    k.strokeStyle = 'rgba(242,236,216,.3)';
    k.lineWidth = 1.5;
    k.beginPath();
    k.arc(CW / 2, CH / 2, 164, 0, Math.PI * 2);
    k.stroke();
    if (CC.story && CC.CAMINHO_SIMBOLO) {
      const h = 160;
      CC.story.logo(k, CW / 2 - h * 1357 / 1936 / 2, CH / 2 - h / 2, h, COR.creme);
    }
    escrever(k, 'GERAÇÃO ELEITA', CW / 2, CH - 110, oswald(28, 600), 'rgba(242,236,216,.7)', { alinhar: 'center', espaco: 8 });
    k.lineWidth = 2;
    k.strokeStyle = 'rgba(242,236,216,.22)';
    retRedondo(k, 20, 20, CW - 40, CH - 40, 30);
    k.stroke();
    k.restore();
    return c;
  }

  // ---------- a carta em story (1080x1920), para compartilhar ----------
  function storyDaCarta(carta) {
    const L = 1080;
    const A = 1920;
    const c = tela(L, A);
    const k = c.getContext('2d');
    k.fillStyle = '#0e0f0c';
    k.fillRect(0, 0, L, A);
    brilho(k, L / 2, 960, 900, carta.especial ? 'rgba(255,196,77,.16)' : 'rgba(200,218,140,.10)');
    escrever(k, 'TIREI ESTA CARTA NO BAÚ DA SEMANA', L / 2, 330, oswald(34, 600), COR.creme, { alinhar: 'center', espaco: 6 });
    const cw = 800;
    const ch = cw * 1.4;
    const carta2 = desenharCarta(tela(cw, ch), carta);
    k.save();
    k.filter = 'blur(40px)';
    k.fillStyle = 'rgba(0,0,0,.7)';
    k.fillRect(L / 2 - cw / 2 + 20, 420 + 40, cw - 40, ch - 20);
    k.restore();
    k.drawImage(carta2, L / 2 - cw / 2, 400);
    grao(k, L, A, 12, 4242);
    if (CC.story && CC.story.marca) CC.story.marca(k, A - 250 - 80, { cor: '#f4f1ea', corFraca: '#a9a49a' });
    return c;
  }

  // ---------- o papel de parede do versículo da semana (1080x2340) ----------
  // O alto fica livre para o relógio da tela de bloqueio; o versículo mora no meio de baixo,
  // em Literata creme, com a referência em amarelo; embaixo, os morros em gravura e a faixa
  // de luz da manhã. A marca bem pequena, no pé.
  function papelDeParede({ ref, texto }) {
    const L = 1080;
    const A = 2340;
    const c = tela(L, A);
    const k = c.getContext('2d');
    const r = sorteio(2340);
    const g = k.createLinearGradient(0, 0, 0, A);
    g.addColorStop(0, '#07080a');
    g.addColorStop(0.55, '#0f120e');
    g.addColorStop(0.8, '#1c2117');
    g.addColorStop(1, '#0b0c0a');
    k.fillStyle = g;
    k.fillRect(0, 0, L, A);
    for (let i = 0; i < 260; i++) {
      const y = r() * A * 0.55;
      k.fillStyle = 'rgba(242,236,216,' + (0.1 + r() * 0.5 * (1 - y / (A * 0.55))).toFixed(3) + ')';
      k.beginPath();
      k.arc(r() * L, y, 0.6 + r() * r() * 2.2, 0, Math.PI * 2);
      k.fill();
    }
    // a luz da manhã atrás dos morros
    const hz = A * 0.83;
    brilho(k, L * 0.62, hz, 900, 'rgba(255,196,77,.30)', 'screen');
    const gh = k.createLinearGradient(0, hz - 40, 0, hz + 30);
    gh.addColorStop(0, 'rgba(255,214,120,0)');
    gh.addColorStop(0.7, 'rgba(255,214,120,.5)');
    gh.addColorStop(1, 'rgba(255,214,120,0)');
    k.fillStyle = gh;
    k.fillRect(0, hz - 40, L, 70);
    // as serras, da mais longe (clara, na névoa da manhã) à mais perto (quase preta)
    const serras = [[hz - 10, 26, [92, 96, 66], 61, 0.004], [hz + 50, 40, [58, 66, 44], 62, 0.0035], [hz + 120, 56, [36, 43, 30], 63, 0.003],
      [hz + 200, 70, [22, 27, 19], 64, 0.0026], [hz + 300, 80, [12, 14, 10], 65, 0.0022]];
    serras.forEach(([y0, amp, cor, sem, fr], i) => {
      const f = onda(sorteio(sem), 5, fr);
      const p = new Path2D();
      p.moveTo(-10, A);
      for (let x = -10; x <= L + 10; x += 5) p.lineTo(x, y0 + f(x) * amp + Math.abs(f(x * 3.1)) * amp * 0.12);
      p.lineTo(L + 10, A);
      p.closePath();
      const gs = k.createLinearGradient(0, y0 - amp, 0, y0 + 260);
      gs.addColorStop(0, 'rgb(' + cor.join(',') + ')');
      gs.addColorStop(1, 'rgb(' + cor.map((v) => Math.round(v * 0.55)).join(',') + ')');
      k.fillStyle = gs;
      k.fill(p);
      k.save();
      k.clip(p);
      k.strokeStyle = 'rgba(200,218,140,' + (0.05 + i * 0.012).toFixed(3) + ')';
      k.lineWidth = 1.6;
      for (let j = -80; j < 140; j++) {
        k.beginPath();
        k.moveTo(j * 12, y0 - 120);
        k.lineTo(j * 12 + 340, A);
        k.stroke();
      }
      if (i < 2) {
        k.strokeStyle = 'rgba(255,214,120,' + (0.55 - i * 0.25) + ')';
        k.lineWidth = 2.5;
        k.filter = 'blur(1px)';
        k.beginPath();
        for (let x = -10; x <= L + 10; x += 5) { const y = y0 + f(x) * amp + Math.abs(f(x * 3.1)) * amp * 0.12 + 1.5; if (x === -10) k.moveTo(x, y); else k.lineTo(x, y); }
        k.stroke();
      }
      k.restore();
      // a névoa no pé de cada serra
      const gn = k.createLinearGradient(0, y0 + 10, 0, y0 + 90);
      gn.addColorStop(0, 'rgba(200,210,170,0)');
      gn.addColorStop(0.6, 'rgba(200,210,170,' + (0.1 - i * 0.015).toFixed(3) + ')');
      gn.addColorStop(1, 'rgba(200,210,170,0)');
      k.fillStyle = gn;
      k.fillRect(0, y0 + 10, L, 80);
    });
    // o versículo
    const larg = 860;
    const cabe = (t) => quebrar(k, texto, literata(t, 500), larg);
    let t = 66;
    let linhas = cabe(t);
    while ((linhas.length * t * 1.38 > 680 || linhas.some((l) => { k.font = literata(t, 500); return k.measureText(l).width > larg; })) && t > 38) { t -= 2; linhas = cabe(t); }
    const alto = linhas.length * t * 1.38;
    const y0 = 1390 - alto / 2;
    linhas.forEach((l, i) => escrever(k, l, L / 2, y0 + t + i * t * 1.38, literata(t, 500), COR.creme, { alinhar: 'center' }));
    escrever(k, ref.toUpperCase(), L / 2, y0 + alto + 96, oswald(36, 600), COR.amarelo, { alinhar: 'center', espaco: 7 });
    grao(k, L, A, 12, 2341);
    if (CC.story && CC.CAMINHO_SIMBOLO) {
      const h = 40;
      CC.story.logo(k, L / 2 - h * 1357 / 1936 / 2, A - 150, h, 'rgba(242,236,216,.5)');
    }
    return c;
  }

  // ---------- a revelação no baú ----------
  // A carta entra de costas e vira (CSS 3D, cartas.css). Com menos movimento, aparece sem
  // girar. O canvas da frente é desenhado antes de entrar na tela.
  function revelar(alvo, carta) {
    // o canvas no tamanho real da tela (CSS x densidade): reduzido pelo navegador, o texto
    // pequeno da carta borrava
    const largura = Math.round(Math.min(CW, Math.max(420, Math.min(window.innerWidth * 0.8, 340) * (window.devicePixelRatio || 1))));
    const frente = desenharCarta(tela(largura, Math.round(largura * 1.4)), carta);
    const verso = desenharVerso(tela(largura, Math.round(largura * 1.4)));
    frente.setAttribute('aria-hidden', 'true');
    verso.setAttribute('aria-hidden', 'true');
    alvo.innerHTML = '<div class="revelar-carta' + (carta.especial ? ' especial' : '') + '" role="img" aria-label="'
      + CC.esc('Carta ' + carta.album + ', ' + carta.numero + ' de ' + carta.total + (carta.especial ? ', especial' : '') + ': ' + carta.titulo + '. Você sabia? ' + carta.sabia + ' ' + carta.ref)
      + '"><div class="carta-giro"><div class="carta-face carta-verso"></div><div class="carta-face carta-frente"></div></div></div>';
    alvo.querySelector('.carta-verso').appendChild(verso);
    alvo.querySelector('.carta-frente').appendChild(frente);
    if (carta.especial) alvo.querySelector('.carta-frente').insertAdjacentHTML('beforeend', '<i class="carta-brilho"></i>');
  }

  // A carta de cada baú (amostra): fixa pelo número do dia, enquanto o sorteio por pessoa não vem.
  const cartaDoBau = (numero) => CARTAS[Math.floor(numero / 7) % CARTAS.length];

  CC.cartas = { lista: CARTAS, cartaDoBau, desenharCarta, desenharVerso, revelar, storyDaCarta, papelDeParede,
    tela: () => tela(CW, CH), CW, CH };
})(window.CC);
