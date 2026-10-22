/* As cartas colecionáveis do baú (amostra para o dono aprovar: o estilo em 2026-10-11, as
   raridades em 2026-10-22). Cada baú da Trilha revela uma carta ilustrada: a moldura com o
   álbum e o número, a ilustração, o título, um "Você sabia?" de uma linha, a referência e a
   raridade. Os desenhos são em canvas, no padrão das artes de story (01e-story-artes.js): luz,
   sombra, grão e textura de gravura, sem figura humana, com o amarelo como única cor quente e
   a sálvia de apoio. A raridade (linho, bronze, prata, ouro, glória) é o material da moldura e
   do verso; o brilho que muda com o ângulo é do cartas.css, por cima do canvas (cartaViva).
   Pedida só quando a tela do baú abre: o build a publica como cartas.<resumo>.js, com o
   estilo (cartas.css) no lugar da marca abaixo, e o service worker a guarda no cache
   "caminho-telas". Aqui também moram o papel de parede do versículo da semana (1080x2340), a
   imagem de story da carta (1080x1920) e a revelação do baú (revelacao), que a amostra
   design/cartas/amostra.html usa.
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
  // A raridade é o acabamento da carta (linho, bronze, prata, ouro, glória), não a importância
  // do que ela mostra.
  const CARTAS = [
    { id: 'davi-funda', album: 'Heróis da fé', numero: 4, total: 13, titulo: 'Davi e a funda',
      sabia: 'Davi apanhou cinco pedras lisas num riacho e usou só uma.', ref: '1 Samuel 17.40-50', desenho: 'davi', raridade: 'linho' },
    { id: 'poco-jaco', album: 'Lugares', numero: 3, total: 13, titulo: 'O poço de Jacó',
      sabia: 'Jesus chegou cansado a este poço por volta do meio-dia e pediu água.', ref: 'João 4.6-7', desenho: 'poco', raridade: 'bronze' },
    { id: 'azeite-viuva', album: 'Objetos', numero: 7, total: 13, titulo: 'O azeite da viúva',
      sabia: 'O azeite só parou de correr quando não sobrou nenhuma vasilha vazia.', ref: '2 Reis 4.1-7', desenho: 'azeite', raridade: 'prata' },
    { id: 'arca-alianca', album: 'Objetos', numero: 1, total: 13, titulo: 'A Arca da Aliança',
      sabia: 'Era de madeira de acácia, coberta de ouro puro por dentro e por fora.', ref: 'Êxodo 25.10-22', desenho: 'arca', raridade: 'ouro' },
    { id: 'tumulo-vazio', album: 'Milagres', numero: 13, total: 13, titulo: 'O túmulo vazio',
      sabia: 'As faixas de linho ficaram ali, e o pano da cabeça, enrolado à parte.', ref: 'João 20.1-8', desenho: 'tumulo', raridade: 'gloria' },
    { id: 'mar-vermelho', album: 'Milagres', numero: 1, total: 13, titulo: 'O mar aberto',
      sabia: 'Um vento forte soprou a noite inteira e deixou o fundo do mar seco.', ref: 'Êxodo 14.21-22', desenho: 'mar', raridade: 'bronze' },
  ];

  // ---------- as raridades: os materiais do tabernáculo (Êx 25.3-4) ----------
  // Cada uma tem nome, ícone e cor: a raridade nunca é dita só pela cor. "tinta" é a cor do
  // nome no papel da carta (contraste AA sobre o creme); "luz" é a cor da luz do baú.
  const RARIDADES = {
    linho: { nome: 'Linho', icone: 'linho', cor: '#E8DCC4', cor2: '#BFAE8E', tinta: '#5f5136', luz: '#f4ead2', ordem: 0,
      brilho: 'Fosco. Inclina pouco, com um reflexo branco leve.' },
    bronze: { nome: 'Bronze', icone: 'bacia', cor: '#B07A45', cor2: '#8C5A2B', tinta: '#6e3d14', luz: '#e0a466', ordem: 1,
      brilho: 'Metal batido na moldura, que acende com o ângulo.' },
    prata: { nome: 'Prata', icone: 'trombeta', cor: '#C9CED6', cor2: '#8E96A3', tinta: '#454e5c', luz: '#dfe6f2', ordem: 2,
      brilho: 'Holográfico frio (prata, azul, lilás) só na moldura.' },
    ouro: { nome: 'Ouro', icone: 'candelabro', cor: '#D4A62A', cor2: '#A87B12', tinta: '#6f4f08', luz: '#ffc44d', ordem: 3,
      brilho: 'Holográfico dourado na ilustração, com purpurina.' },
    gloria: { nome: 'Glória', icone: 'nuvem', cor: '#FFF4D6', cor2: '#E9D9A6', tinta: '#5e4a14', luz: '#fff4d6', ordem: 4,
      brilho: 'Prismático na carta toda e um halo de luz em volta.' },
  };
  const raridadeDe = (carta) => (RARIDADES[carta.raridade] ? carta.raridade : carta.especial ? 'ouro' : 'linho');

  // Os ícones das raridades, em SVG de 24 x 24 (traço de 1,6, pontas redondas): "s" é traço,
  // "f" é cheio, "sf" é os dois. Os mesmos caminhos servem ao HTML (iconeSvg) e ao canvas
  // (iconeCanvas), para o ícone da carta e o da tela serem o mesmo desenho.
  const bola = (x, y, rx, ry = rx) => 'M' + (x - rx) + ' ' + y + 'a' + rx + ' ' + ry + ' 0 1 0 ' + 2 * rx + ' 0a' + rx + ' ' + ry + ' 0 1 0 ' + -2 * rx + ' 0z';
  const ICONES = {
    // um ramo de linho: a haste, duas folhas estreitas e três cápsulas de semente
    linho: { partes: [
      ['s', 'M12 22.6C12.3 18.2 11.6 13.4 12 8'],
      ['s', 'M12 14.2C10.7 12.2 8.9 10.9 7 9.4'],
      ['s', 'M12.1 12C13.5 10.2 15.3 9 17.2 7.6'],
      ['sf', 'M12 19.6C9.9 19.1 8.4 17.8 7.7 16C9.8 16.3 11.3 17.6 12 19.6z'],
      ['sf', 'M12.1 17.2C14.2 16.8 15.7 15.6 16.5 13.8C14.4 14.1 12.9 15.3 12.1 17.2z'],
      ['sf', bola(6.3, 7.6, 1.9, 2.1)], ['sf', bola(17.8, 5.9, 1.9, 2.1)], ['sf', bola(12, 5.4, 2, 2.2)],
      ['s', 'M6.3 5.5V4.2M17.8 3.8V2.5M12 3.2V1.8'],
    ] },
    // a bacia de bronze do pátio (Êx 30.18): a borda, a água, a bacia e o pé
    bacia: { partes: [
      ['s', bola(12, 8.6, 9, 2.1)],
      ['s', 'M3.1 9C3.7 13.7 7.4 16.2 12 16.2s8.3-2.5 8.9-7.2'],
      ['s', 'M7.4 8.8c1.5.6 3 .6 4.5 0s3-.6 4.6 0'],
      ['s', 'M6.2 11.8c1 1.5 2.4 2.3 4 2.6'],
      ['s', 'M10.5 16.2v2.4M13.5 16.2v2.4'],
      ['sf', 'M6.8 21.8h10.4c-.6-2-2.7-3.1-5.2-3.1s-4.6 1.1-5.2 3.1z'],
    ] },
    // a trombeta de prata batida (Nm 10.2), deitada na diagonal
    trombeta: { giro: -36, partes: [
      ['s', 'M3.4 12H14.6'],
      ['s', 'M1.4 10.2v3.6M1.4 12h2'],
      ['s', 'M6.8 10.7v2.6M10.6 10.7v2.6'],
      ['sf', 'M14.4 11c2.6-.2 4.8-1.7 6.8-4.6v11.2c-2-2.9-4.2-4.4-6.8-4.6z'],
      ['s', bola(21.2, 12, 1.1, 5.6)],
    ] },
    // o candelabro de sete braços (Êx 25.31-37), com as chamas acesas
    candelabro: { partes: [
      ['s', 'M12 5V19.6'],
      ['s', 'M9.2 5v2.8a2.8 2.8 0 0 0 5.6 0V5'],
      ['s', 'M6.6 5v2.8a5.4 5.4 0 0 0 10.8 0V5'],
      ['s', 'M4 5v2.8a8 8 0 0 0 16 0V5'],
      ['s', [4, 6.6, 9.2, 12, 14.8, 17.4, 20].map((x) => 'M' + (x - 1.1) + ' 4.9h2.2').join('')],
      ['f', [4, 6.6, 9.2, 12, 14.8, 17.4, 20].map((x) => 'M' + x + ' .9c.7.9 1.05 1.55 1.05 2.05a1.05 1.05 0 0 1-2.1 0c0-.5.35-1.15 1.05-2.05z').join('')],
      ['sf', 'M12 19.4l-3.8 2.6h7.6z'],
    ] },
    // a nuvem da glória, com a luz por trás
    nuvem: { partes: [
      ['s', 'M12 1.4v2.8M4.9 4.3l1.9 1.9M19.1 4.3l-1.9 1.9M1.4 11h2.6M22.6 11H20'],
      ['sf', 'M6.6 20h10.8a3.7 3.7 0 0 0 .4-7.4 5.5 5.5 0 0 0-10.6-1.3A4.4 4.4 0 0 0 6.6 20z'],
    ] },
  };
  function iconeSvg(id, classe) {
    const ic = ICONES[RARIDADES[id] ? RARIDADES[id].icone : id];
    const corpo = ic.partes.map(([t, d]) => '<path d="' + d + '"' + (t === 's' ? ' fill="none"' : t === 'f' ? ' stroke="none"' : ' fill="currentColor" fill-opacity=".28"') + '/>').join('');
    return '<svg class="' + (classe || 'icone-raridade') + '" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + (ic.giro ? '<g transform="rotate(' + ic.giro + ' 12 12)">' + corpo + '</g>' : corpo) + '</svg>';
  }
  function iconeCanvas(k, id, x, y, tam, cor, { traco = 1.6, cheio = 0.28 } = {}) {
    const ic = ICONES[RARIDADES[id] ? RARIDADES[id].icone : id];
    k.save();
    k.translate(x, y);
    k.scale(tam / 24, tam / 24);
    if (ic.giro) { k.translate(12, 12); k.rotate((ic.giro * Math.PI) / 180); k.translate(-12, -12); }
    k.strokeStyle = cor;
    k.fillStyle = cor;
    k.lineWidth = traco;
    k.lineCap = 'round';
    k.lineJoin = 'round';
    for (const [t, d] of ic.partes) {
      const p = new Path2D(d);
      if (t === 'f') k.fill(p);
      if (t === 'sf') { k.globalAlpha = cheio; k.fill(p); k.globalAlpha = 1; }
      if (t !== 'f') k.stroke(p);
    }
    k.restore();
  }

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

  // ---------- (4) Milagres: o mar aberto ----------
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

  // ---------- (5) Objetos: a Arca da Aliança (ouro, a carta-tema do álbum) ----------
  // De frente, no escuro do Lugar Santíssimo, como prancha gravada: a cortina em pregas atrás,
  // a arca de ouro com a moldura em volta (Êx 25.11), as argolas e a vara da frente, e sobre a
  // tampa as asas dos dois querubins subindo uma para a outra até quase se tocarem (Êx 25.20),
  // sem corpo nem rosto desenhado. No meio delas, a luz (Êx 25.22): acende a borda de dentro
  // das penas, o alto da arca e o pó no ar. O ouro é desenhado como gravura: linhas finas
  // que engrossam na sombra.
  const OURO_TONS = [[0, [38, 26, 6]], [0.25, [110, 78, 18]], [0.5, [201, 148, 48]], [0.75, [246, 214, 130]], [1, [255, 246, 214]]];
  function tomDeOuro(v, a = 1) {
    const t = Math.max(0, Math.min(1, v));
    let i = 0;
    while (i < OURO_TONS.length - 2 && t > OURO_TONS[i + 1][0]) i++;
    const [p0, c0] = OURO_TONS[i];
    const [p1, c1] = OURO_TONS[i + 1];
    const u = (t - p0) / (p1 - p0);
    return 'rgba(' + c0.map((c, j) => Math.round(c + (c1[j] - c) * u)).join(',') + ',' + a + ')';
  }
  const TINTA_OURO = '#2a1c05';
  // Uma pena: a lâmina com a ponta redonda, a gravura das barbas em diagonal, a haste e, às
  // vezes, uma fenda entre as barbas.
  function pena(k, r, B, D, comp, larg, luz) {
    const N = [-D[1], D[0]];
    const P = (a, b) => [B[0] + D[0] * a + N[0] * b, B[1] + D[1] * a + N[1] * b];
    const p = new Path2D();
    p.moveTo(...P(0, larg * 0.22));
    p.quadraticCurveTo(...P(comp * 0.32, larg * 0.6), ...P(comp * 0.84, larg * 0.44));
    p.quadraticCurveTo(...P(comp * 1.04, larg * 0.32), ...P(comp * 1.03, 0));
    p.quadraticCurveTo(...P(comp * 1.02, -larg * 0.34), ...P(comp * 0.84, -larg * 0.46));
    p.quadraticCurveTo(...P(comp * 0.32, -larg * 0.6), ...P(0, -larg * 0.22));
    p.closePath();
    const g = k.createLinearGradient(...P(0, 0), ...P(comp, 0));
    g.addColorStop(0, tomDeOuro(luz * 0.55 + 0.08));
    g.addColorStop(0.6, tomDeOuro(luz * 0.8 + 0.12));
    g.addColorStop(1, tomDeOuro(luz * 0.7 + 0.1));
    k.fillStyle = g;
    k.fill(p);
    // as barbas: um lado da haste mais escuro que o outro
    const ang = Math.atan2(D[1], D[0]);
    const meio = P(comp * 0.5, 0);
    gravar(k, p, meio[0], meio[1], comp * 0.62, ang + 0.62, 3.4, 1.7, (x, y) => {
      const lado = (x - B[0]) * N[0] + (y - B[1]) * N[1];
      return 0.2 + (1 - luz) * 0.75 + (lado < 0 ? 0.28 : -0.05);
    }, TINTA_OURO, 0.05);
    k.save();
    k.lineCap = 'round';
    k.strokeStyle = 'rgba(42,28,5,.85)';
    k.lineWidth = 2.2;
    k.beginPath();
    k.moveTo(...P(comp * 0.02, 0));
    k.quadraticCurveTo(...P(comp * 0.5, larg * 0.05), ...P(comp * 0.9, 0));
    k.stroke();
    k.strokeStyle = tomDeOuro(Math.min(1, luz + 0.35), 0.8);
    k.lineWidth = 1.1;
    k.beginPath();
    k.moveTo(...P(comp * 0.04, larg * 0.07));
    k.quadraticCurveTo(...P(comp * 0.5, larg * 0.12), ...P(comp * 0.86, larg * 0.06));
    k.stroke();
    if (r() < 0.45) {
      // a fenda
      const u = 0.45 + r() * 0.35;
      const lado = r() < 0.5 ? 1 : -1;
      k.strokeStyle = 'rgba(42,28,5,.8)';
      k.lineWidth = 1.6;
      k.beginPath();
      k.moveTo(...P(comp * u + larg * 0.25, lado * larg * 0.46));
      k.lineTo(...P(comp * u, lado * larg * 0.08));
      k.stroke();
    }
    k.strokeStyle = 'rgba(42,28,5,.9)';
    k.lineWidth = 1.5;
    k.stroke(p);
    k.restore();
  }
  // Uma asa erguida: o braço (o bordo, do ombro ao pulso), as penas secundárias ao longo
  // dele, caindo para dentro, as primárias em leque a partir do pulso, que fazem a ponta,
  // e as coberturas por cima das raízes. "ponta" é para onde a asa aponta.
  function asa(k, r, ombro, c1, c2, pulso, ponta, alvo, luzEm, { escurecer = 0, escala = 1 } = {}) {
    const n = 200;
    const pts = bezier(ombro, c1, c2, pulso, n);
    const em = (t) => pts[Math.round(Math.max(0, Math.min(1, t)) * n)];
    const tang = (t) => {
      const a = em(t - 0.01);
      const b = em(t + 0.01);
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
    };
    const dentro = (t) => {
      const T = tang(t);
      const B = em(t);
      let N = [-T[1], T[0]];
      if ((alvo[0] - B[0]) * N[0] + (alvo[1] - B[1]) * N[1] < 0) N = [-N[0], -N[1]];
      return N;
    };
    const girar = (T, N, phi) => [T[0] * Math.cos(phi) + N[0] * Math.sin(phi), T[1] * Math.cos(phi) + N[1] * Math.sin(phi)];
    const desenhar = (B, D, L, larg) => pena(k, r, B, D, L * escala, larg * escala, luzEm([B[0] + D[0] * L * 0.6, B[1] + D[1] * L * 0.6]) * (1 - escurecer));
    // as primárias: em leque a partir do pulso, da que segue a asa (a mais longa) à que cai
    const dirPonta = Math.atan2(ponta[1] - pulso[1], ponta[0] - pulso[0]);
    const Tp = tang(1);
    const Np = dentro(1);
    const dirSec = Math.atan2(...girar(Tp, Np, 1.25).reverse());
    let dd = dirSec - dirPonta;
    while (dd > Math.PI) dd -= Math.PI * 2;
    while (dd < -Math.PI) dd += Math.PI * 2;
    const prim = 9;
    for (let i = prim - 1; i >= 0; i--) {
      const u = i / (prim - 1);
      const ang = dirPonta + dd * u * 0.92 + (r() - 0.5) * 0.04;
      const base = em(1 - u * 0.16);
      const N = dentro(1 - u * 0.16);
      const B = [base[0] + N[0] * 10, base[1] + N[1] * 10];
      desenhar(B, [Math.cos(ang), Math.sin(ang)], Math.hypot(ponta[0] - pulso[0], ponta[1] - pulso[1]) * (1 - u * 0.42) * (0.96 + r() * 0.06), 36 - u * 4);
    }
    // as secundárias, do pulso ao ombro (as do ombro ficam por cima)
    const sec = 13;
    for (let i = 0; i < sec; i++) {
      const t = 0.84 - (0.8 * i) / (sec - 1);
      const base = em(t);
      const N = dentro(t);
      const B = [base[0] + N[0] * 12, base[1] + N[1] * 12];
      const phi = 1.25 + (0.84 - t) * 0.5 + (r() - 0.5) * 0.05;
      desenhar(B, girar(tang(t), N, phi), 150 - (0.84 - t) * 50, 38);
    }
    // o braço por baixo das coberturas, para não ficar vão entre elas
    k.save();
    k.lineCap = 'round';
    k.lineJoin = 'round';
    k.beginPath();
    k.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) k.lineTo(p[0], p[1]);
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 30 * escala;
    k.stroke();
    k.strokeStyle = tomDeOuro(0.45 * (1 - escurecer) + 0.06);
    k.lineWidth = 26 * escala;
    k.stroke();
    k.restore();
    // as coberturas grandes e as pequenas; as menores fazem o bordo, deitadas ao longo do braço
    for (let i = 0; i < 18; i++) {
      const t = 1 - i / 17;
      const base = em(t);
      const N = dentro(t);
      desenhar([base[0] + N[0] * 8, base[1] + N[1] * 8], girar(tang(t), N, 1.05 + (1 - t) * 0.45), 76, 30);
    }
    for (let i = 0; i < 24; i++) {
      const t = 1 - i / 23;
      const base = em(t);
      const N = dentro(t);
      desenhar([base[0] + N[0] * 2, base[1] + N[1] * 2], girar(tang(t), N, 0.8 + (1 - t) * 0.4), 46, 26);
    }
    for (let i = 0; i < 34; i++) {
      const t = 1 - i / 33;
      const base = em(t);
      const N = dentro(t);
      desenhar([base[0] - N[0] * 9, base[1] - N[1] * 9], girar(tang(t), N, 0.42), 30, 21);
    }
  }
  function desenhoArca(k, W, H) {
    const r = sorteio(4501);
    const cx = W / 2;
    const fonte = [cx, 372];
    const luzEm = ([x, y]) => Math.max(0, Math.min(1, 0.12 + 0.95 * Math.exp(-(((x - fonte[0]) / 300) ** 2 + ((y - fonte[1]) / 330) ** 2))));
    k.fillStyle = '#0a0a07';
    k.fillRect(0, 0, W, H);
    // a cortina: as pregas em gravura de linha clara, mais grossa onde a luz bate
    const chao = 742;
    const prega = onda(sorteio(4502), 5, 0.02);
    for (let x = 0; x < W; x += 2) {
      const f = 0.5 + 0.5 * Math.sin(x * 0.055 + prega(x) * 1.6);
      const l = luzEm([x, 330]);
      k.fillStyle = 'rgb(' + Math.round(12 + f * 26 * l + l * 16) + ',' + Math.round(12 + f * 22 * l + l * 13) + ',' + Math.round(8 + f * 12 * l + l * 6) + ')';
      k.fillRect(x, 0, 2, chao);
    }
    k.save();
    k.lineCap = 'round';
    for (let x = 3; x < W; x += 6) {
      const f = 0.5 + 0.5 * Math.sin(x * 0.055 + prega(x) * 1.6);
      for (let y = 0; y < chao; y += 6) {
        const l = luzEm([x, y]);
        const w = (f * 0.9 + 0.1) * l * 2.2;
        if (w < 0.25) continue;
        k.strokeStyle = 'rgba(232,200,130,' + (0.18 + l * 0.3).toFixed(3) + ')';
        k.lineWidth = w;
        k.beginPath();
        k.moveTo(x + Math.sin(y * 0.01) * 1.5, y);
        k.lineTo(x + Math.sin((y + 6) * 0.01) * 1.5, y + 6);
        k.stroke();
      }
    }
    k.restore();
    // a barra da cortina, bordada, e o chão de pedra
    const gch = k.createLinearGradient(0, chao, 0, H);
    gch.addColorStop(0, '#1b1810');
    gch.addColorStop(1, '#0a0a07');
    k.fillStyle = gch;
    k.fillRect(0, chao, W, H - chao);
    // as juntas das lajes, quase apagadas
    k.strokeStyle = 'rgba(232,200,130,.07)';
    k.lineWidth = 1.5;
    for (const y of [chao + 26, chao + 70]) {
      k.beginPath();
      k.moveTo(0, y);
      k.lineTo(W, y);
      k.stroke();
    }
    // o reflexo do ouro no chão
    brilho(k, cx, chao + 40, 360, 'rgba(255,196,77,.16)', 'screen');
    // a luz atrás, entre as asas
    brilho(k, fonte[0], fonte[1], 420, 'rgba(255,206,110,.18)', 'screen');
    // as asas de trás (a segunda asa de cada querubim), mais escuras
    const alvo = [cx, 470];
    for (const lado of [-1, 1]) {
      const x = (v) => cx + lado * v;
      asa(k, r, [x(206), 436], [x(330), 330], [x(310), 190], [x(214), 132], [x(52), 120], alvo, luzEm, { escurecer: 0.45, escala: 0.95 });
    }
    // a arca
    const bx0 = cx - 252;
    const bx1 = cx + 252;
    const bt = 474;
    const bb = 700;
    // a sombra no chão
    k.save();
    k.filter = 'blur(14px)';
    k.fillStyle = 'rgba(0,0,0,.75)';
    k.beginPath();
    k.ellipse(cx, chao + 4, 330, 22, 0, 0, Math.PI * 2);
    k.fill();
    k.restore();
    // os pés
    for (const px of [bx0 + 10, bx1 - 52]) {
      const pe = new Path2D();
      pe.rect(px, bb - 4, 42, chao - bb + 2);
      const gp = k.createLinearGradient(px, 0, px + 42, 0);
      gp.addColorStop(0, tomDeOuro(0.45));
      gp.addColorStop(0.4, tomDeOuro(0.7));
      gp.addColorStop(1, tomDeOuro(0.22));
      k.fillStyle = gp;
      k.fill(pe);
      gravar(k, pe, px + 21, (bb + chao) / 2, 40, Math.PI / 2, 3.6, 1.6, (xx) => 0.35 + (xx - px) / 42 * 0.6, TINTA_OURO, 0);
      k.strokeStyle = TINTA_OURO;
      k.lineWidth = 1.6;
      k.stroke(pe);
    }
    // a frente da caixa
    const frente = new Path2D();
    frente.rect(bx0, bt, bx1 - bx0, bb - bt);
    const gf = k.createLinearGradient(0, bt, 0, bb);
    gf.addColorStop(0, tomDeOuro(0.74));
    gf.addColorStop(0.3, tomDeOuro(0.56));
    gf.addColorStop(1, tomDeOuro(0.2));
    k.fillStyle = gf;
    k.fill(frente);
    const sombraCaixa = (x, y) => 1.1 - luzEm([x, y - 60]) * 0.95 + ((y - bt) / (bb - bt)) * 0.45 + (Math.abs(x - cx) / 252) ** 2 * 0.3;
    gravar(k, frente, cx, (bt + bb) / 2, 300, 0, 4, 2.6, sombraCaixa, TINTA_OURO, 0);
    // as quinas: a da esquerda pega a luz, a da direita fica na sombra
    for (const [qx, claro] of [[bx0, true], [bx1 - 24, false]]) {
      const q = new Path2D();
      q.rect(qx, bt, 24, bb - bt);
      const gq = k.createLinearGradient(qx, 0, qx + 24, 0);
      gq.addColorStop(0, tomDeOuro(claro ? 0.8 : 0.3, 0.9));
      gq.addColorStop(1, tomDeOuro(claro ? 0.45 : 0.12, 0.9));
      k.fillStyle = gq;
      k.fill(q);
      gravar(k, q, qx + 12, (bt + bb) / 2, 130, Math.PI / 2, 3.6, 1.8, (xx) => (claro ? 0.3 : 0.7) + (xx - qx) / 24 * 0.4, TINTA_OURO, 0);
      k.strokeStyle = TINTA_OURO;
      k.lineWidth = 1.6;
      k.stroke(q);
    }
    // o painel de dentro, rebaixado, e os rosetões dos cantos
    const ix0 = bx0 + 46;
    const ix1 = bx1 - 46;
    const iy0 = bt + 34;
    const iy1 = bb - 32;
    // o painel rebaixado: a sombra no alto de dentro e a luz no pé
    k.fillStyle = 'rgba(40,24,0,.16)';
    k.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
    const gpi = k.createLinearGradient(0, iy0, 0, iy0 + 16);
    gpi.addColorStop(0, 'rgba(30,18,0,.55)');
    gpi.addColorStop(1, 'rgba(30,18,0,0)');
    k.fillStyle = gpi;
    k.fillRect(ix0, iy0, ix1 - ix0, 16);
    k.lineWidth = 2.4;
    k.strokeStyle = TINTA_OURO;
    k.strokeRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
    k.strokeStyle = tomDeOuro(0.95, 0.85);
    k.lineWidth = 1.5;
    k.strokeRect(ix0 + 3, iy0 + 3, ix1 - ix0 - 6, iy1 - iy0 - 6);
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 1.2;
    k.strokeRect(ix0 + 10, iy0 + 10, ix1 - ix0 - 20, iy1 - iy0 - 20);
    // a gravura do painel: um ramo de amendoeira de cada lado, em linha (como no candelabro, Êx 25.33)
    const ramo = (x0, y0, dir) => {
      k.save();
      k.lineCap = 'round';
      const haste = () => { k.beginPath(); k.moveTo(x0, y0); k.bezierCurveTo(x0 + dir * 60, y0 - 30, x0 + dir * 120, y0 + 26, x0 + dir * 170, y0 - 6); };
      k.strokeStyle = 'rgba(42,28,5,.85)';
      k.lineWidth = 4;
      haste();
      k.stroke();
      k.strokeStyle = tomDeOuro(0.85);
      k.lineWidth = 1.6;
      haste();
      k.stroke();
      k.strokeStyle = 'rgba(42,28,5,.85)';
      k.lineWidth = 1.4;
      for (let i = 1; i <= 6; i++) {
        const t = i / 7;
        const px = x0 + dir * 170 * t;
        const py = y0 + Math.sin(t * Math.PI * 1.6) * -10;
        const up = i % 2 ? -1 : 1;
        const fol = new Path2D();
        fol.moveTo(px, py);
        fol.quadraticCurveTo(px + dir * 14, py + up * 18, px + dir * 6, py + up * 36);
        fol.quadraticCurveTo(px - dir * 9, py + up * 16, px, py);
        const gfo = k.createLinearGradient(px, py, px + dir * 6, py + up * 36);
        gfo.addColorStop(0, tomDeOuro(0.9));
        gfo.addColorStop(1, tomDeOuro(0.45));
        k.fillStyle = gfo;
        k.fill(fol);
        k.stroke(fol);
        k.beginPath();
        k.moveTo(px, py);
        k.quadraticCurveTo(px + dir * 3, py + up * 16, px + dir * 5, py + up * 32);
        k.stroke();
      }
      k.restore();
    };
    ramo(cx - 18, (iy0 + iy1) / 2 + 4, -1);
    ramo(cx + 18, (iy0 + iy1) / 2 + 4, 1);
    // a flor no meio
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const fl = new Path2D();
      fl.ellipse(cx + Math.cos(a) * 9, (iy0 + iy1) / 2 + 4 + Math.sin(a) * 9, 8, 4.5, a, 0, Math.PI * 2);
      k.fillStyle = tomDeOuro(0.92);
      k.fill(fl);
      k.strokeStyle = TINTA_OURO;
      k.lineWidth = 1.2;
      k.stroke(fl);
    }
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 2.4;
    k.stroke(frente);
    // a moldura de ouro em volta (Êx 25.11): a faixa saliente, com as contas
    const mt = bt - 26;
    const moldura = new Path2D();
    moldura.rect(bx0 - 14, mt, bx1 - bx0 + 28, 26);
    const gm = k.createLinearGradient(0, mt, 0, bt);
    gm.addColorStop(0, tomDeOuro(1));
    gm.addColorStop(0.45, tomDeOuro(0.78));
    gm.addColorStop(1, tomDeOuro(0.32));
    k.fillStyle = gm;
    k.fill(moldura);
    for (let x = bx0 - 4; x <= bx1 + 4; x += 15) {
      k.fillStyle = TINTA_OURO;
      k.beginPath();
      k.arc(x + 1, mt + 15, 5.2, 0, Math.PI * 2);
      k.fill();
      k.fillStyle = tomDeOuro(0.5 + luzEm([x, mt]) * 0.5);
      k.beginPath();
      k.arc(x, mt + 13.6, 4.6, 0, Math.PI * 2);
      k.fill();
      k.fillStyle = 'rgba(255,250,230,.85)';
      k.beginPath();
      k.arc(x - 1.4, mt + 12, 1.5, 0, Math.PI * 2);
      k.fill();
    }
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 2;
    k.stroke(moldura);
    // a tampa, por cima, com a borda acesa
    const tt = mt - 22;
    const tampa = new Path2D();
    tampa.rect(bx0 - 6, tt, bx1 - bx0 + 12, 22);
    const gt = k.createLinearGradient(0, tt, 0, mt);
    gt.addColorStop(0, tomDeOuro(1));
    gt.addColorStop(1, tomDeOuro(0.45));
    k.fillStyle = gt;
    k.fill(tampa);
    gravar(k, tampa, cx, tt + 11, 270, 0, 3.6, 1.4, (x, y) => 0.95 - luzEm([x, y]) * 0.9 + (y - tt) / 22 * 0.4, TINTA_OURO, 0);
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 2;
    k.stroke(tampa);
    k.save();
    k.globalCompositeOperation = 'screen';
    k.filter = 'blur(2px)';
    k.strokeStyle = 'rgba(255,240,190,.9)';
    k.lineWidth = 3;
    k.beginPath();
    k.moveTo(bx0 - 4, tt + 1);
    k.lineTo(bx1 + 4, tt + 1);
    k.stroke();
    k.restore();
    // as asas da frente
    for (const lado of [-1, 1]) {
      const x = (v) => cx + lado * v;
      asa(k, r, [x(236), tt + 2], [x(356), 330], [x(330), 214], [x(222), 172], [x(20), 168], alvo, luzEm);
    }
    // as argolas e a vara da frente
    const vy = 712;
    const vara = new Path2D();
    vara.rect(30, vy - 14, W - 60, 28);
    k.save();
    k.filter = 'blur(6px)';
    k.fillStyle = 'rgba(0,0,0,.6)';
    k.fillRect(20, vy + 6, W - 40, 14);
    k.restore();
    const gv = k.createLinearGradient(0, vy - 14, 0, vy + 14);
    gv.addColorStop(0, tomDeOuro(0.95));
    gv.addColorStop(0.35, tomDeOuro(0.72));
    gv.addColorStop(1, tomDeOuro(0.2));
    k.fillStyle = gv;
    k.fill(vara);
    gravar(k, vara, cx, vy, W / 2, 0, 3.4, 1.8, (x, y) => (y - vy + 14) / 28 * 1.15 - luzEm([x, y - 200]) * 0.45 + (Math.abs(x - cx) / (W / 2)) ** 2 * 0.3, TINTA_OURO, 0);
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 1.8;
    k.stroke(vara);
    for (const ex of [30, W - 30]) {
      k.fillStyle = tomDeOuro(0.55);
      k.beginPath();
      k.ellipse(ex, vy, 7, 14, 0, 0, Math.PI * 2);
      k.fill();
      k.stroke();
    }
    for (const ax of [bx0 + 31, bx1 - 31]) {
      k.lineWidth = 9;
      k.strokeStyle = TINTA_OURO;
      k.beginPath();
      k.ellipse(ax, vy, 11, 28, 0, 0, Math.PI * 2);
      k.stroke();
      k.lineWidth = 6;
      k.strokeStyle = tomDeOuro(0.8);
      k.beginPath();
      k.ellipse(ax, vy, 11, 28, 0, -Math.PI * 0.9, Math.PI * 0.9);
      k.stroke();
      k.lineWidth = 1.6;
      k.strokeStyle = 'rgba(255,246,214,.8)';
      k.beginPath();
      k.ellipse(ax - 2, vy - 2, 9, 25, 0, Math.PI * 1.1, Math.PI * 1.6);
      k.stroke();
    }
    // a luz no meio das asas, sobre a tampa, e o pó no ar
    brilho(k, cx, tt - 70, 230, 'rgba(255,214,130,.55)', 'screen');
    brilho(k, cx, tt - 60, 90, 'rgba(255,246,214,.85)', 'screen');
    brilho(k, cx, tt - 4, 240, 'rgba(255,226,150,.22)', 'screen');
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 330;
      const x = cx + Math.cos(a) * d * 0.9;
      const y = tt - 80 + Math.sin(a) * d * 0.8;
      const l = luzEm([x, y]);
      k.fillStyle = 'rgba(255,240,200,' + (l * (0.25 + r() * 0.6)).toFixed(3) + ')';
      k.beginPath();
      k.arc(x, y, 0.6 + r() * 1.6, 0, Math.PI * 2);
      k.fill();
    }
    vinheta(k, W, H, 0.55);
  }

  // ---------- (6) Milagres: o túmulo vazio (glória) ----------
  // De dentro do túmulo, no escuro, olhando para a porta baixa: lá fora amanhece (Mt 28.1),
  // e a grande pedra redonda está rolada para o lado (Jo 20.1), contra a luz. A luz entra,
  // acende a rocha lavrada e cai sobre o banco de pedra à direita, onde o lençol de linho
  // ficou estendido e vazio, com as faixas soltas por cima e, à parte, o pano da cabeça
  // enrolado (Jo 20.5-7). Ninguém desenhado. A rocha é gravura de linha clara sobre o
  // escuro, as linhas correndo para a porta, como a profundidade da câmara.
  function desenhoTumulo(k, W, H) {
    const r = sorteio(4601);
    const porta = { x0: 214, x1: 404, y0: 300, y1: 560 };
    const pc = [(porta.x0 + porta.x1) / 2, (porta.y0 + porta.y1) / 2 + 30];
    const luzEm = (x, y) => Math.max(0, Math.min(1, Math.exp(-Math.hypot((x - pc[0]) * 0.9, (y - pc[1]) * 1.1) / 300)));
    k.fillStyle = '#0d0c09';
    k.fillRect(0, 0, W, H);
    brilho(k, pc[0], pc[1], 560, 'rgba(120,104,70,.55)', 'screen');
    // a rocha: linhas claras que correm para a porta (a profundidade da câmara), retas e
    // quebradas em lascas, mais grossas onde a luz chega. Perto da porta é a parede do
    // fundo, lavrada em golpes curtos.
    const contornoF = onda(sorteio(4608), 5, 0.04);
    const fundoR = (x, y) => Math.max(Math.abs(x - pc[0]) / (175 + contornoF(y) * 22), Math.abs(y - pc[1] + 20) / (205 + contornoF(x + 50) * 22)) ** 1 + 0 * (Math.hypot(x - pc[0], y - pc[1]) / 1000);
    k.save();
    k.lineCap = 'round';
    for (let i = 0; i < 380; i++) {
      const a = (i / 380) * Math.PI * 2 + (r() - 0.5) * 0.01;
      const dx = Math.cos(a) * 1.05;
      const dy = Math.sin(a) * 0.95;
      let d = 60;
      while (fundoR(pc[0] + dx * d, pc[1] + dy * d) < 1) d += 4;
      d += r() * 14;
      const forca = 0.6 + r() * 0.6;
      while (d < 1100) {
        const seg = 14 + r() * 70;
        const x0 = pc[0] + dx * d;
        const y0 = pc[1] + dy * d;
        const x1 = pc[0] + dx * (d + seg);
        const y1 = pc[1] + dy * (d + seg);
        if (x0 < -20 || x0 > W + 20 || y0 < -20 || y0 > H + 20) break;
        const l = luzEm((x0 + x1) / 2, (y0 + y1) / 2);
        const w = l * 2.4 * forca * (0.6 + r() * 0.5);
        if (w > 0.2) {
          k.strokeStyle = 'rgba(236,214,160,' + (0.2 + l * 0.5).toFixed(3) + ')';
          k.lineWidth = w;
          k.beginPath();
          k.moveTo(x0, y0);
          k.lineTo(x1, y1);
          k.stroke();
        }
        d += seg + 3 + r() * 10;
      }
    }
    // a parede do fundo em volta da porta: golpes curtos, deitados
    for (let i = 0; i < 520; i++) {
      const x = pc[0] + (r() - 0.5) * 400;
      const y = pc[1] - 20 + (r() - 0.5) * 460;
      const fr = fundoR(x, y);
      if (fr > 1.05 || r() < fr * fr * 0.6) continue;
      const l = luzEm(x, y);
      const a = (r() - 0.5) * 0.5 + (r() < 0.3 ? 0.9 : 0);
      const c = 6 + r() * 16;
      k.strokeStyle = 'rgba(236,214,160,' + (0.1 + l * 0.32).toFixed(3) + ')';
      k.lineWidth = 0.5 + l * 1.2;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + Math.cos(a) * c, y + Math.sin(a) * c);
      k.stroke();
    }
    k.restore();
    // as faces da rocha: manchas de sombra que quebram o leque
    for (let i = 0; i < 60; i++) {
      const x = r() * W;
      const y = r() * H;
      if (Math.hypot(x - pc[0], y - pc[1]) < 150) continue;
      k.save();
      k.globalAlpha = 0.3 + r() * 0.35;
      k.fillStyle = '#0d0c09';
      k.filter = 'blur(' + Math.round(6 + r() * 10) + 'px)';
      k.fill(seixo(r, x, y, 30 + r() * 70, 14 + r() * 30, Math.atan2(y - pc[1], x - pc[0]) + Math.PI / 2, 0.3));
      k.restore();
    }
    // as marcas do cinzel na rocha: golpes curtos, mais visíveis perto da luz
    for (let i = 0; i < 900; i++) {
      const x = r() * W;
      const y = r() * H;
      const l = luzEm(x, y);
      if (l < 0.15) continue;
      k.strokeStyle = 'rgba(10,9,6,' + (0.3 + r() * 0.3).toFixed(3) + ')';
      k.lineWidth = 1.2 + r() * 1.4;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + 6 + r() * 6, y + 3 + r() * 4);
      k.stroke();
    }
    // a porta e o que se vê por ela: o céu da manhã, o jardim e a pedra contra a luz
    const bordaP = onda(sorteio(4603), 6, 0.05);
    const vao = new Path2D();
    const pts = [];
    for (let t = 0; t <= 1; t += 0.02) pts.push([porta.x0 + bordaP(t * 40) * 3, porta.y1 - (porta.y1 - porta.y0) * t]);
    for (let t = 0; t <= 1; t += 0.02) pts.push([porta.x0 + (porta.x1 - porta.x0) * t, porta.y0 + bordaP(t * 30 + 9) * 3 + Math.sin(t * Math.PI) * -10]);
    for (let t = 0; t <= 1; t += 0.02) pts.push([porta.x1 + bordaP(t * 40 + 20) * 3, porta.y0 + (porta.y1 - porta.y0) * t]);
    pts.forEach((p, i) => (i ? vao.lineTo(...p) : vao.moveTo(...p)));
    vao.closePath();
    k.save();
    k.clip(vao);
    const ceu = k.createLinearGradient(0, porta.y0, 0, porta.y1);
    ceu.addColorStop(0, '#c4c9a2');
    ceu.addColorStop(0.5, '#f7dc96');
    ceu.addColorStop(0.68, '#fff6d6');
    ceu.addColorStop(1, '#fff2c8');
    k.fillStyle = ceu;
    k.fillRect(porta.x0 - 10, porta.y0 - 20, porta.x1 - porta.x0 + 20, porta.y1 - porta.y0 + 30);
    brilho(k, 268, 478, 120, 'rgba(255,255,240,.95)', 'screen');
    // os morros e o jardim, em névoa
    const fm = onda(sorteio(4604), 3, 0.05);
    k.fillStyle = '#c9c49c';
    k.beginPath();
    k.moveTo(porta.x0 - 10, porta.y1);
    for (let x = porta.x0 - 10; x <= porta.x1 + 10; x += 4) k.lineTo(x, 488 + fm(x) * 5);
    k.lineTo(porta.x1 + 10, porta.y1);
    k.fill();
    k.fillStyle = '#8e8f68';
    k.beginPath();
    k.moveTo(porta.x0 - 10, porta.y1);
    for (let x = porta.x0 - 10; x <= porta.x1 + 10; x += 4) k.lineTo(x, 512 + fm(x * 2 + 5) * 4);
    k.lineTo(porta.x1 + 10, porta.y1);
    k.fill();
    // capim na beira, contra a luz
    k.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = porta.x0 + r() * (porta.x1 - porta.x0 - 60);
      const c = 10 + r() * 26;
      const a = -Math.PI / 2 + (r() - 0.5) * 1.1;
      k.strokeStyle = 'rgba(70,72,48,.85)';
      k.lineWidth = 1.6;
      k.beginPath();
      k.moveTo(x, porta.y1 - 4);
      k.quadraticCurveTo(x + Math.cos(a) * c * 0.5 + 3, porta.y1 - 4 + Math.sin(a) * c * 0.5, x + Math.cos(a) * c, porta.y1 - 4 + Math.sin(a) * c);
      k.stroke();
    }
    // a pedra rolada, contra a luz: a face escura e a borda acesa
    const sx = 452;
    const sy = 462;
    const sR = 118;
    k.save();
    k.filter = 'blur(10px)';
    k.fillStyle = 'rgba(40,36,24,.5)';
    k.beginPath();
    k.ellipse(sx - 10, porta.y1 - 6, sR * 0.9, 14, 0, 0, Math.PI * 2);
    k.fill();
    k.restore();
    const pedra = new Path2D();
    pedra.arc(sx, sy, sR, 0, Math.PI * 2);
    const gp = k.createRadialGradient(sx + 30, sy + 20, 10, sx, sy, sR);
    gp.addColorStop(0, '#4d4734');
    gp.addColorStop(1, '#2b281d');
    k.fillStyle = gp;
    k.fill(pedra);
    k.save();
    k.clip(pedra);
    for (let i = 0; i < 1400; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * sR;
      k.fillStyle = r() < 0.5 ? 'rgba(10,9,6,.4)' : 'rgba(236,214,160,.12)';
      k.fillRect(sx + Math.cos(a) * d, sy + Math.sin(a) * d, 1.5 + r() * 2, 1.3);
    }
    k.restore();
    gravar(k, pedra, sx, sy, sR, -0.7, 4, 1.3, (x, y) => 0.15 + Math.max(0, 1 - Math.hypot(x - sx + sR, y - sy) / sR) * 0.7, 'rgba(236,214,160,.5)', 0.15);
    k.strokeStyle = 'rgba(255,240,200,.9)';
    k.lineWidth = 3;
    k.beginPath();
    k.arc(sx, sy, sR - 1.5, Math.PI * 0.62, Math.PI * 1.45);
    k.stroke();
    k.strokeStyle = 'rgba(20,18,12,.5)';
    k.lineWidth = 1.2;
    k.beginPath();
    k.arc(sx + 4, sy + 2, sR * 0.55, 0, Math.PI * 2);
    k.stroke();
    // a névoa da luz na porta
    k.save();
    k.globalCompositeOperation = 'screen';
    const gn = k.createLinearGradient(0, porta.y1 - 90, 0, porta.y1);
    gn.addColorStop(0, 'rgba(255,240,200,0)');
    gn.addColorStop(1, 'rgba(255,240,200,.45)');
    k.fillStyle = gn;
    k.fillRect(porta.x0 - 10, porta.y1 - 90, porta.x1 - porta.x0 + 20, 100);
    k.restore();
    k.restore();
    // a espessura da parede da porta: as bordas acesas
    k.save();
    k.strokeStyle = 'rgba(255,236,190,.9)';
    k.lineWidth = 2.4;
    k.filter = 'blur(1px)';
    k.stroke(vao);
    k.restore();
    k.strokeStyle = 'rgba(8,7,5,.9)';
    k.lineWidth = 6;
    k.save();
    k.translate(-5, 4);
    k.stroke(vao);
    k.restore();
    // o chão: a luz da porta deitada no chão, vindo até nós
    k.save();
    k.globalCompositeOperation = 'screen';
    k.filter = 'blur(22px)';
    const gch = k.createLinearGradient(0, porta.y1, 0, H);
    gch.addColorStop(0, 'rgba(255,226,160,.6)');
    gch.addColorStop(1, 'rgba(255,226,160,.05)');
    k.fillStyle = gch;
    k.beginPath();
    k.moveTo(porta.x0 + 10, porta.y1);
    k.lineTo(porta.x1 - 10, porta.y1);
    k.lineTo(porta.x1 + 140, H + 20);
    k.lineTo(porta.x0 - 170, H + 20);
    k.closePath();
    k.fill();
    k.restore();
    // a soleira
    k.fillStyle = '#2a271c';
    k.beginPath();
    k.moveTo(porta.x0 - 20, porta.y1 + 2);
    k.lineTo(porta.x1 + 18, porta.y1 + 2);
    k.lineTo(porta.x1 + 40, porta.y1 + 26);
    k.lineTo(porta.x0 - 46, porta.y1 + 26);
    k.closePath();
    k.fill();
    k.strokeStyle = 'rgba(255,236,190,.55)';
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(porta.x0 - 20, porta.y1 + 3);
    k.lineTo(porta.x1 + 18, porta.y1 + 3);
    k.stroke();
    // o banco de pedra à direita, em perspectiva (a face de cima é um plano: u na largura,
    // v na profundidade, do fundo para nós)
    const A = [470, 560];
    const B = [618, 548];
    const C = [1010, 900];
    const D = [600, 930];
    const prof = (v) => (1 / (4 - 3 * v) - 0.25) / 0.75;
    const P = (u, v) => {
      const s = prof(v);
      const e = [A[0] + (D[0] - A[0]) * s, A[1] + (D[1] - A[1]) * s];
      const d = [B[0] + (C[0] - B[0]) * s, B[1] + (C[1] - B[1]) * s];
      return [e[0] + (d[0] - e[0]) * u, e[1] + (d[1] - e[1]) * u];
    };
    const altura = (v) => 26 + prof(v) * 190;
    // a face da frente do banco (de lado para nós), na sombra
    const frente = new Path2D();
    for (let i = 0; i <= 40; i++) { const p = P(0, i / 40); if (i) frente.lineTo(...p); else frente.moveTo(...p); }
    for (let i = 40; i >= 0; i--) { const p = P(0, i / 40); frente.lineTo(p[0], p[1] + altura(i / 40)); }
    frente.closePath();
    k.fillStyle = '#171510';
    k.fill(frente);
    k.save();
    k.clip(frente);
    k.lineCap = 'round';
    for (let i = 0; i <= 60; i++) {
      const v = i / 60;
      const p = P(0, v);
      const l = luzEm(p[0], p[1]) * 0.8;
      if (r() < 0.35) continue;
      k.strokeStyle = 'rgba(236,214,160,' + (0.08 + l * 0.25).toFixed(3) + ')';
      k.lineWidth = 0.6 + l * 1.2;
      k.beginPath();
      k.moveTo(p[0], p[1] + 6 + r() * 20);
      k.lineTo(p[0] + 2, p[1] + altura(v) * (0.5 + r() * 0.5));
      k.stroke();
    }
    k.restore();
    // a face de cima do banco
    const topo = new Path2D();
    topo.moveTo(...P(0, 0));
    topo.lineTo(...P(1, 0));
    for (let i = 0; i <= 40; i++) topo.lineTo(...P(1, i / 40));
    for (let i = 40; i >= 0; i--) topo.lineTo(...P(0, i / 40));
    topo.closePath();
    k.fillStyle = '#3d382a';
    k.fill(topo);
    k.save();
    k.clip(topo);
    k.lineCap = 'round';
    for (let j = 0; j <= 50; j++) {
      const u = j / 50;
      let ant = null;
      for (let i = 0; i <= 60; i++) {
        const v = i / 60;
        const p = P(u, v);
        const l = luzEm(p[0], p[1]);
        if (ant) {
          k.strokeStyle = 'rgba(236,214,160,' + (0.2 + l * 0.5).toFixed(3) + ')';
          k.lineWidth = 0.4 + l * 2.2 * (0.6 + 0.4 * Math.sin(u * 40 + v * 7));
          k.beginPath();
          k.moveTo(...ant);
          k.lineTo(...p);
          k.stroke();
        }
        ant = p;
      }
    }
    k.restore();
    k.strokeStyle = 'rgba(255,236,190,.7)';
    k.lineWidth = 2;
    k.beginPath();
    for (let i = 0; i <= 40; i++) { const p = P(0, i / 40); if (i) k.lineTo(...p); else k.moveTo(...p); }
    k.stroke();
    // as faixas de linho estendidas no banco, lado a lado, frouxas: murcharam onde estava o
    // corpo. Gravura no comprimento de cada faixa; a luz da porta acende as cristas.
    const luzPano = (p) => 0.35 + 0.65 * Math.min(1, luzEm(p[0], p[1]) * 1.9);
    const dobra = onda(sorteio(4605), 5, 9);
    // [u no fundo, u perto, largura, v do começo, v do fim, onde torce]
    const faixas = [[0.13, 0.1, 0.13, 0.2, 1.02, 0.7], [0.3, 0.24, 0.12, 0.22, 1.02, -1], [0.62, 0.36, 0.1, 0.32, 1.02, 0.55],
      [0.44, 0.5, 0.12, 0.2, 1.02, 0.35], [0.66, 0.68, 0.11, 0.24, 0.98, -1], [0.84, 0.82, 0.09, 0.3, 0.92, 0.8]];
    faixas.forEach(([ua, ub, larg, va, vb, torce], n) => {
      const meiaL = (t) => larg / 2 * (torce < 0 ? 1 : 0.22 + 0.78 * Math.min(1, Math.abs(t - torce) / 0.07));
      const centro = (t) => ua + (ub - ua) * t + Math.sin(t * 5 + n * 2) * 0.012 + dobra(t * 0.7 + n) * 0.008;
      const borda = (lado, t) => P(centro(t) + lado * meiaL(t), va + (vb - va) * t);
      const f = new Path2D();
      for (let i = 0; i <= 60; i++) { const p = borda(-1, i / 60); if (i) f.lineTo(...p); else f.moveTo(...p); }
      for (let i = 60; i >= 0; i--) f.lineTo(...borda(1, i / 60));
      f.closePath();
      k.save();
      k.filter = 'blur(3px)';
      k.translate(-4, 3);
      k.fillStyle = 'rgba(10,8,4,.55)';
      k.fill(f);
      k.restore();
      const meio = borda(0, 0.3);
      k.fillStyle = 'rgb(' + [238, 228, 200].map((c) => Math.round(c * (0.6 + luzPano(meio) * 0.4))).join(',') + ')';
      k.fill(f);
      k.save();
      k.clip(f);
      k.lineCap = 'round';
      const fios = 12;
      for (let j = 1; j < fios; j++) {
        const w = j / fios * 2 - 1;
        let ant = null;
        for (let i = 0; i <= 60; i++) {
          const t = i / 60;
          const p = P(centro(t) + w * meiaL(t), va + (vb - va) * t);
          const torcido = torce < 0 ? 0 : Math.max(0, 1 - Math.abs(t - torce) / 0.08);
          const sombra = (1 - luzPano(p)) * 0.9 + 0.12 + torcido * 0.6 + (w > 0.5 ? 0.15 : 0);
          if (ant) {
            k.strokeStyle = 'rgba(48,42,28,.75)';
            k.lineWidth = Math.max(0.15, sombra * 1.3 * (0.5 + prof(va + (vb - va) * t) * 0.7));
            k.beginPath();
            k.moveTo(...ant);
            k.lineTo(...p);
            k.stroke();
          }
          ant = p;
        }
      }
      k.restore();
      k.strokeStyle = 'rgba(26,22,14,.85)';
      k.lineWidth = 1.2;
      k.stroke(f);
      // a beira do lado da porta, acesa
      k.save();
      k.globalCompositeOperation = 'screen';
      k.strokeStyle = 'rgba(255,240,200,.55)';
      k.lineWidth = 1.4;
      k.beginPath();
      for (let i = 0; i <= 60; i++) { const p = borda(-1, i / 60); if (i) k.lineTo(p[0] + 1.5, p[1]); else k.moveTo(p[0] + 1.5, p[1]); }
      k.stroke();
      k.restore();
    });
    // a ponta da faixa da beira, caída pela frente do banco
    const caida = new Path2D();
    const ca = P(0.04, 0.62);
    const cb = P(0.04, 0.78);
    caida.moveTo(...ca);
    caida.lineTo(...cb);
    caida.quadraticCurveTo(cb[0] - 6, cb[1] + 70, cb[0] - 2, cb[1] + 120);
    caida.lineTo(cb[0] - 30, cb[1] + 104);
    caida.quadraticCurveTo(ca[0] - 8, ca[1] + 60, ca[0], ca[1]);
    caida.closePath();
    k.fillStyle = '#a89c7c';
    k.fill(caida);
    gravar(k, caida, cb[0] - 14, cb[1] + 40, 110, Math.PI / 2 + 0.15, 3, 1.3, (x) => 0.35 + (cb[0] - x) / 40 * 0.5, 'rgba(36,30,18,.9)', 0.2);
    k.strokeStyle = 'rgba(26,22,14,.85)';
    k.lineWidth = 1.3;
    k.stroke(caida);
    // o pano da cabeça, enrolado, posto de lado no fundo do banco, na luz
    const rc = P(0.5, 0.08);
    k.save();
    k.translate(rc[0], rc[1]);
    k.rotate(-0.08);
    k.scale(1.3, 1.3);
    k.save();
    k.filter = 'blur(4px)';
    k.fillStyle = 'rgba(10,8,4,.6)';
    k.beginPath();
    k.ellipse(6, 12, 40, 8, 0, 0, Math.PI * 2);
    k.fill();
    k.restore();
    const rolo = new Path2D();
    rolo.moveTo(-36, -12);
    rolo.lineTo(32, -12);
    rolo.quadraticCurveTo(38, 0, 32, 12);
    rolo.lineTo(-36, 12);
    rolo.quadraticCurveTo(-42, 0, -36, -12);
    const gr = k.createLinearGradient(0, -12, 0, 12);
    gr.addColorStop(0, '#fff8e4');
    gr.addColorStop(0.5, '#e9dcb8');
    gr.addColorStop(1, '#8c8164');
    k.fillStyle = gr;
    k.fill(rolo);
    k.strokeStyle = 'rgba(52,46,30,.8)';
    k.lineWidth = 1;
    for (let x = -30; x < 30; x += 9) {
      k.beginPath();
      k.moveTo(x, -12);
      k.quadraticCurveTo(x + 5, 0, x, 12);
      k.stroke();
    }
    k.lineWidth = 1.3;
    k.stroke(rolo);
    k.beginPath();
    k.ellipse(32, 0, 5, 11.5, 0, -Math.PI / 2, Math.PI / 2);
    k.stroke();
    k.beginPath();
    k.ellipse(31, 0, 2.5, 5.5, 0, -Math.PI / 2, Math.PI / 2);
    k.stroke();
    k.restore();
    // os raios que entram, e o pó no ar
    k.save();
    k.globalCompositeOperation = 'screen';
    k.filter = 'blur(14px)';
    for (const [ang, larg, a] of [[0.35, 50, 0.16], [0.75, 70, 0.14], [1.15, 44, 0.12], [1.9, 60, 0.1], [2.4, 40, 0.08]]) {
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const g = k.createLinearGradient(pc[0], pc[1], pc[0] + dx * 700, pc[1] + dy * 700);
      g.addColorStop(0, 'rgba(255,236,190,' + a * 2 + ')');
      g.addColorStop(1, 'rgba(255,236,190,0)');
      k.fillStyle = g;
      k.beginPath();
      k.moveTo(pc[0] - dy * 20, pc[1] + dx * 20);
      k.lineTo(pc[0] + dx * 800 - dy * larg * 3, pc[1] + dy * 800 + dx * larg * 3);
      k.lineTo(pc[0] + dx * 800 + dy * larg * 3, pc[1] + dy * 800 - dx * larg * 3);
      k.lineTo(pc[0] + dy * 20, pc[1] - dx * 20);
      k.closePath();
      k.fill();
    }
    k.restore();
    for (let i = 0; i < 220; i++) {
      const x = r() * W;
      const y = r() * H;
      const l = luzEm(x, y);
      k.fillStyle = 'rgba(255,244,214,' + (l * (0.3 + r() * 0.6)).toFixed(3) + ')';
      k.beginPath();
      k.arc(x, y, 0.6 + r() * 1.5, 0, Math.PI * 2);
      k.fill();
    }
    vinheta(k, W, H, 0.55);
  }
  const DESENHOS = { davi: desenhoDavi, poco: desenhoPoco, azeite: desenhoAzeite, mar: desenhoMar, arca: desenhoArca, tumulo: desenhoTumulo };

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
  // ---------- os materiais da moldura ----------
  // O metal: as faixas de luz na diagonal, o escovado e a faixa larga de brilho. Serve ao
  // bronze (batido, com as marcas do martelo), à prata (com a guilhoché gravada, onde o
  // holográfico frio corre) e ao ouro (a folha dourada das primeiras amostras).
  const METAIS = {
    bronze: [[0, '#4e2f12'], [0.13, '#a86f3b'], [0.26, '#efc394'], [0.35, '#b57a43'], [0.5, '#62391a'], [0.64, '#b9824b'], [0.77, '#f2cfa2'], [0.88, '#93602e'], [1, '#432810']],
    prata: [[0, '#5d6470'], [0.14, '#b9bfc9'], [0.27, '#f7f9fc'], [0.37, '#b3bac5'], [0.52, '#6f7784'], [0.66, '#cfd4dc'], [0.78, '#ffffff'], [0.88, '#9ea6b3'], [1, '#535a66']],
    ouro: [[0, '#7a5714'], [0.14, '#d9a23a'], [0.27, '#fff0b8'], [0.36, '#e3ae45'], [0.52, '#8c6519'], [0.66, '#e8b84e'], [0.78, '#fff4c8'], [0.88, '#c99430'], [1, '#6e4f12']],
  };
  function folhaDeMetal(k, w, h, r, tons, { escuro = '80,50,0', claro = '255,250,220', batido = false, guilloche = false } = {}) {
    const g = k.createLinearGradient(0, 0, w, h);
    tons.forEach(([p, c]) => g.addColorStop(p, c));
    k.fillStyle = g;
    k.fillRect(0, 0, w, h);
    if (batido) {
      // as marcas do martelo: covinhas com a luz em cima à esquerda e a sombra embaixo
      for (let i = 0; i < 1100; i++) {
        const x = r() * w;
        const y = r() * h;
        const rr = 7 + r() * 13;
        brilho(k, x - rr * 0.3, y - rr * 0.3, rr, 'rgba(' + claro + ',' + (0.08 + r() * 0.1).toFixed(3) + ')');
        brilho(k, x + rr * 0.35, y + rr * 0.35, rr * 0.9, 'rgba(' + escuro + ',' + (0.08 + r() * 0.1).toFixed(3) + ')');
      }
    }
    // o escovado
    for (let i = 0; i < 1800; i++) {
      const y = r() * h;
      k.strokeStyle = r() < 0.5 ? 'rgba(' + claro + ',' + (0.04 + r() * 0.08).toFixed(3) + ')' : 'rgba(' + escuro + ',' + (0.04 + r() * 0.08).toFixed(3) + ')';
      k.lineWidth = 0.8 + r();
      const x = r() * w;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + 60 + r() * 200, y + (r() - 0.5) * 4);
      k.stroke();
    }
    if (guilloche) {
      // a guilhoché: ondas finas em leque a partir dos quatro cantos, como em cédula
      k.lineWidth = 1.1;
      for (const [ox, oy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
        for (let i = 0; i < 60; i++) {
          const raio = 40 + i * 9;
          k.strokeStyle = i % 5 === 0 ? 'rgba(' + escuro + ',.16)' : 'rgba(' + escuro + ',.08)';
          k.beginPath();
          for (let a = 0; a <= Math.PI * 2; a += 0.012) {
            const d = raio + Math.sin(a * 22 + i * 0.5) * 4;
            const x = ox + Math.cos(a) * d;
            const y = oy + Math.sin(a) * d;
            if (a === 0) k.moveTo(x, y); else k.lineTo(x, y);
          }
          k.stroke();
        }
      }
    }
    // a faixa de brilho na diagonal
    k.save();
    k.globalCompositeOperation = 'screen';
    k.filter = 'blur(30px)';
    k.fillStyle = 'rgba(' + claro + ',.5)';
    k.beginPath();
    k.moveTo(w * 0.55, -50);
    k.lineTo(w * 0.72, -50);
    k.lineTo(w * 0.2, h + 50);
    k.lineTo(w * 0.03, h + 50);
    k.fill();
    k.restore();
  }
  // O linho: o tecido cru, com a trama, os fios grossos (o "nó" do linho) e a borda mais escura.
  function tecidoDeLinho(k, w, h, r) {
    const g = k.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#e9ddc5');
    g.addColorStop(0.55, '#d8c9aa');
    g.addColorStop(1, '#c2b08e');
    k.fillStyle = g;
    k.fillRect(0, 0, w, h);
    const passo = 4.4;
    k.lineCap = 'butt';
    for (let y = 0; y < h; y += passo) {
      k.strokeStyle = 'rgba(105,86,52,' + (0.07 + r() * 0.09).toFixed(3) + ')';
      k.lineWidth = 1.1 + r() * 0.9;
      k.beginPath();
      k.moveTo(0, y + (r() - 0.5));
      k.lineTo(w, y + (r() - 0.5) * 2);
      k.stroke();
    }
    for (let x = 0; x < w; x += passo) {
      k.strokeStyle = r() < 0.5 ? 'rgba(255,250,236,' + (0.1 + r() * 0.14).toFixed(3) + ')' : 'rgba(105,86,52,' + (0.04 + r() * 0.06).toFixed(3) + ')';
      k.lineWidth = 1 + r() * 0.9;
      k.beginPath();
      k.moveTo(x + (r() - 0.5), 0);
      k.lineTo(x + (r() - 0.5) * 2, h);
      k.stroke();
    }
    // os nós: trechos de fio mais grosso, nos dois sentidos
    for (let i = 0; i < 420; i++) {
      const hor = r() < 0.6;
      const x = r() * w;
      const y = Math.round(r() * h / passo) * passo;
      const c = 20 + r() * 70;
      k.strokeStyle = r() < 0.5 ? 'rgba(96,78,46,' + (0.12 + r() * 0.14).toFixed(3) + ')' : 'rgba(255,248,230,' + (0.18 + r() * 0.2).toFixed(3) + ')';
      k.lineWidth = 2 + r() * 1.6;
      k.lineCap = 'round';
      k.beginPath();
      if (hor) { k.moveTo(x, y); k.lineTo(x + c, y + (r() - 0.5) * 1.5); } else { k.moveTo(y % w, x % h); k.lineTo(y % w + (r() - 0.5) * 1.5, x % h + c); }
      k.stroke();
    }
    vinheta(k, w, h, 0.28);
  }
  // A glória: o branco perolado com a aurora (sálvia, céu e ouro claros, borrados) e os raios
  // gravados que saem de trás da ilustração.
  function perolaDaGloria(k, w, h, r) {
    const cx = w / 2;
    const cy = h * 0.36;
    const g = k.createRadialGradient(cx, cy, 40, cx, cy, Math.hypot(w, h) * 0.62);
    g.addColorStop(0, '#fffdf5');
    g.addColorStop(0.45, '#fff3d4');
    g.addColorStop(0.8, '#f0deaa');
    g.addColorStop(1, '#ddc584');
    k.fillStyle = g;
    k.fillRect(0, 0, w, h);
    k.save();
    k.filter = 'blur(70px)';
    for (const [x, y, rx, ry, cor] of [[0.08, 0.82, 0.42, 0.3, 'rgba(196,220,150,.55)'], [0.95, 0.62, 0.36, 0.34, 'rgba(176,206,232,.5)'],
      [0.5, 0.02, 0.5, 0.16, 'rgba(255,214,120,.55)'], [0.92, 0.08, 0.26, 0.2, 'rgba(214,200,240,.4)'], [0.05, 0.3, 0.2, 0.26, 'rgba(255,226,160,.45)']]) {
      k.fillStyle = cor;
      k.beginPath();
      k.ellipse(x * w, y * h, rx * w, ry * h, 0, 0, Math.PI * 2);
      k.fill();
    }
    k.restore();
    // os raios
    k.lineCap = 'round';
    for (let i = 0; i < 240; i++) {
      const a = (i / 240) * Math.PI * 2;
      const longo = i % 2 === 0;
      const r0 = 300 + r() * 30;
      const r1 = longo ? 1200 : 560 + r() * 160;
      k.strokeStyle = 'rgba(168,124,30,' + (longo ? 0.2 : 0.12).toFixed(3) + ')';
      k.lineWidth = longo ? 1.8 : 1.2;
      k.beginPath();
      k.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      k.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      k.stroke();
    }
    // o pó de ouro
    for (let i = 0; i < 900; i++) {
      k.fillStyle = r() < 0.6 ? 'rgba(190,146,40,' + (0.2 + r() * 0.4).toFixed(3) + ')' : 'rgba(255,255,255,.8)';
      k.beginPath();
      k.arc(r() * w, r() * h, 0.6 + r() * 1.3, 0, Math.PI * 2);
      k.fill();
    }
  }
  // O que muda em cada material: o fundo, a cor das letras e dos filetes da moldura.
  const MOLDURAS = {
    linho: { pintar: tecidoDeLinho, letra: '#3b3120', filete: 'rgba(59,49,32,.4)', luz: 'rgba(255,250,236,.55)', janela: 'rgba(43,34,18,.85)', enfeite: 'traco' },
    bronze: { pintar: (k, w, h, r) => folhaDeMetal(k, w, h, r, METAIS.bronze, { escuro: '50,24,4', claro: '255,232,200', batido: true }),
      letra: '#2a1405', filete: 'rgba(50,24,4,.55)', luz: 'rgba(255,232,200,.5)', janela: 'rgba(42,20,4,.8)', enfeite: 'traco' },
    prata: { pintar: (k, w, h, r) => folhaDeMetal(k, w, h, r, METAIS.prata, { escuro: '30,36,48', claro: '255,255,255', guilloche: true }),
      letra: '#1d222b', filete: 'rgba(30,36,48,.5)', luz: 'rgba(255,255,255,.65)', janela: 'rgba(24,28,36,.8)', enfeite: 'traco' },
    ouro: { pintar: (k, w, h, r) => folhaDeMetal(k, w, h, r, METAIS.ouro), letra: '#2a1d04', filete: 'rgba(70,46,6,.55)', luz: 'rgba(255,248,214,.5)',
      janela: 'rgba(60,40,4,.75)', enfeite: 'estrela', papel: '#b8862a' },
    gloria: { pintar: perolaDaGloria, letra: '#3d300c', filete: 'rgba(120,90,20,.45)', luz: 'rgba(255,255,255,.8)', janela: 'rgba(110,82,20,.7)',
      enfeite: 'estrela', papel: '#c9a548' },
  };
  // As medidas da carta (em 1000 x 1400): a janela da ilustração e o papel do texto. O CSS do
  // brilho (cartas.css) usa as mesmas, em porcentagem, para deixar o texto sempre fora dele.
  const JX = 56;
  const JY = 118;
  const JW = CW - 112;
  const JH = 846;
  const PY = JY + JH + 16;
  const PH = 350;
  function desenharCarta(c, carta) {
    const k = c.getContext('2d');
    const s = c.width / CW;
    k.save();
    k.setTransform(s, 0, 0, s, 0, 0);
    const r = sorteio(9000 + carta.id.length * 97 + carta.numero);
    const rar = raridadeDe(carta);
    const R = RARIDADES[rar];
    const M = MOLDURAS[rar];
    // o formato da carta e o material da moldura
    retRedondo(k, 0, 0, CW, CH, 46);
    k.save();
    k.clip();
    M.pintar(k, CW, CH, r);
    // o filete por dentro da borda (o claro logo abaixo do escuro dá o relevo)
    k.lineWidth = 2;
    k.strokeStyle = M.filete;
    retRedondo(k, 20, 20, CW - 40, CH - 40, 30);
    k.stroke();
    k.strokeStyle = M.luz;
    retRedondo(k, 23, 23, CW - 46, CH - 46, 28);
    k.stroke();
    // o álbum e o número, no alto
    const rotulo = carta.album.toUpperCase() + '  ·  ' + carta.numero + '/' + carta.total;
    escrever(k, rotulo, CW / 2, 86, oswald(32, 600), M.letra, { alinhar: 'center', espaco: 4.5 });
    k.font = oswald(32, 600);
    try { k.letterSpacing = '4.5px'; } catch (e) { /* idem */ }
    const wr = k.measureText(rotulo).width;
    try { k.letterSpacing = '0px'; } catch (e) { /* idem */ }
    if (M.enfeite === 'estrela') {
      estrelinha(k, CW / 2 - wr / 2 - 30, 74, 12, M.letra);
      estrelinha(k, CW / 2 + wr / 2 + 30, 74, 12, M.letra);
    } else {
      k.fillStyle = M.filete;
      for (const lado of [-1, 1]) k.fillRect(CW / 2 + lado * (wr / 2 + 26) - (lado < 0 ? 40 : 0), 73, 40, 2);
    }
    // a janela da ilustração
    const ilu = tela(JW, JH);
    const ki = ilu.getContext('2d');
    (DESENHOS[carta.desenho] || desenhoDavi)(ki, JW, JH);
    grao(ki, JW, JH, 16, 5000 + carta.numero);
    // a sombra da janela, como se a ilustração estivesse rebaixada na moldura
    k.save();
    k.filter = 'blur(8px)';
    k.fillStyle = 'rgba(0,0,0,.35)';
    retRedondo(k, JX + 2, JY + 6, JW, JH, 22);
    k.fill();
    k.restore();
    k.save();
    retRedondo(k, JX, JY, JW, JH, 22);
    k.clip();
    k.imageSmoothingQuality = 'high';
    k.drawImage(ilu, JX, JY);
    k.restore();
    k.lineWidth = 3;
    k.strokeStyle = M.janela;
    retRedondo(k, JX, JY, JW, JH, 22);
    k.stroke();
    k.lineWidth = 1.5;
    k.strokeStyle = M.luz;
    retRedondo(k, JX - 4, JY - 4, JW + 8, JH + 8, 25);
    k.stroke();
    // o papel do texto
    k.save();
    k.filter = 'blur(6px)';
    k.fillStyle = 'rgba(0,0,0,.25)';
    retRedondo(k, JX + 2, PY + 5, JW, PH, 22);
    k.fill();
    k.restore();
    k.save();
    retRedondo(k, JX, PY, JW, PH, 22);
    k.clip();
    k.fillStyle = COR.papel;
    k.fillRect(JX, PY, JW, PH);
    brilho(k, CW / 2, PY + PH * 0.4, 520, 'rgba(255,252,240,.5)');
    for (let i = 0; i < 2400; i++) {
      k.fillStyle = r() < 0.6 ? 'rgba(90,80,50,' + (0.03 + r() * 0.06).toFixed(3) + ')' : 'rgba(255,255,250,.3)';
      k.fillRect(JX + r() * JW, PY + r() * PH, 1 + r() * 3, 1);
    }
    const gb = k.createLinearGradient(0, PY, 0, PY + PH);
    gb.addColorStop(0, 'rgba(60,50,20,.10)');
    gb.addColorStop(0.15, 'rgba(60,50,20,0)');
    gb.addColorStop(0.85, 'rgba(60,50,20,0)');
    gb.addColorStop(1, 'rgba(60,50,20,.12)');
    k.fillStyle = gb;
    k.fillRect(JX, PY, JW, PH);
    k.restore();
    k.lineWidth = 2;
    k.strokeStyle = M.janela;
    retRedondo(k, JX, PY, JW, PH, 22);
    k.stroke();
    if (M.papel) {
      // o ouro e a glória levam o filete de folha também no papel
      k.lineWidth = 3;
      const gf = k.createLinearGradient(JX, PY, JX + JW, PY + PH);
      gf.addColorStop(0, M.papel);
      gf.addColorStop(0.5, '#ffe7a0');
      gf.addColorStop(1, M.papel);
      k.strokeStyle = gf;
      retRedondo(k, JX + 10, PY + 10, JW - 20, PH - 20, 14);
      k.stroke();
    }
    // o texto
    const x0 = JX + 44;
    const larg = JW - 88;
    let tT = 64;
    k.font = literata(tT);
    while (k.measureText(carta.titulo).width > larg && tT > 44) { tT -= 2; k.font = literata(tT); }
    escrever(k, carta.titulo, x0, PY + 74, literata(tT), COR.tinta, { espaco: -0.5 });
    escrever(k, 'VOCÊ SABIA?', x0, PY + 124, oswald(24, 600), COR.salviaEscura, { espaco: 4 });
    const linhas = quebrar(k, carta.sabia, manrope(38, 600), larg);
    linhas.slice(0, 2).forEach((l, i) => escrever(k, l, x0, PY + 174 + i * 48, manrope(38, 600), '#2b2c25'));
    // o pé: a referência e a raridade (ícone e nome, nunca só a cor)
    const yPe = PY + PH - 34;
    k.fillStyle = 'rgba(35,36,30,.18)';
    k.fillRect(x0, yPe - 48, larg, 2);
    escrever(k, carta.ref.toUpperCase(), x0, yPe, oswald(28, 600), '#45463c', { espaco: 3 });
    k.font = oswald(28, 600);
    try { k.letterSpacing = '3.5px'; } catch (e) { /* idem */ }
    const wn = k.measureText(R.nome.toUpperCase()).width;
    try { k.letterSpacing = '0px'; } catch (e) { /* idem */ }
    escrever(k, R.nome.toUpperCase(), x0 + larg, yPe, oswald(28, 600), R.tinta, { alinhar: 'right', espaco: 3.5 });
    iconeCanvas(k, rar, x0 + larg - wn - 46, yPe - 32, 38, R.tinta, { traco: 1.7, cheio: 0.25 });
    k.restore();
    // a marca, na faixa de baixo da moldura
    if (CC.story && CC.CAMINHO_SIMBOLO) {
      k.font = oswald(22, 600);
      try { k.letterSpacing = '6px'; } catch (e) { /* idem */ }
      const wm = k.measureText('GERAÇÃO ELEITA').width;
      try { k.letterSpacing = '0px'; } catch (e) { /* idem */ }
      const hl = 28;
      const wl = hl * 1357 / 1936;
      const xm = CW / 2 - (wl + 12 + wm) / 2;
      const ym = PY + PH + (CH - PY - PH) / 2;
      CC.story.logo(k, xm, ym - hl / 2 - 2, hl, M.letra);
      escrever(k, 'GERAÇÃO ELEITA', xm + wl + 12, ym + 8, oswald(22, 600), M.letra, { espaco: 6 });
    }
    // o relevo da borda de fora
    k.lineWidth = 3;
    k.strokeStyle = 'rgba(0,0,0,.45)';
    retRedondo(k, 1.5, 1.5, CW - 3, CH - 3, 45);
    k.stroke();
    k.restore();
    return c;
  }
  // O verso: o mesmo desenho para todas as cartas de uma raridade (a surpresa fica na
  // virada), no material da raridade: a moldura, o campo com a guilhoché e os ícones da
  // raridade em trama bem leve, e o medalhão com o símbolo do Geração Eleita em relevo.
  const VERSOS = {
    linho: { campo: '#26231a', traco: '232,220,196', anel: ['#bfae8e', '#f1e6cc', '#8f7f60'] },
    bronze: { campo: '#1e140b', traco: '224,164,102', anel: ['#8c5a2b', '#f2cfa2', '#5a3818'] },
    prata: { campo: '#171b22', traco: '201,214,236', anel: ['#8e96a3', '#ffffff', '#5d6470'] },
    ouro: { campo: '#18120a', traco: '255,204,110', anel: ['#a87b12', '#fff0b8', '#6e4f12'] },
    gloria: { campo: '#fbf4e0', traco: '176,136,40', anel: ['#c9a548', '#fffbea', '#a07c24'], claro: true },
  };
  function desenharVerso(c, raridade = 'linho') {
    const rar = RARIDADES[raridade] ? raridade : 'linho';
    const M = MOLDURAS[rar];
    const V = VERSOS[rar];
    const k = c.getContext('2d');
    const s = c.width / CW;
    k.save();
    k.setTransform(s, 0, 0, s, 0, 0);
    const r = sorteio(777 + RARIDADES[rar].ordem);
    retRedondo(k, 0, 0, CW, CH, 46);
    k.clip();
    M.pintar(k, CW, CH, r);
    k.lineWidth = 2;
    k.strokeStyle = M.filete;
    retRedondo(k, 20, 20, CW - 40, CH - 40, 30);
    k.stroke();
    k.strokeStyle = M.luz;
    retRedondo(k, 23, 23, CW - 46, CH - 46, 28);
    k.stroke();
    // o campo
    const fx = 56;
    const fy = 56;
    const fw = CW - 112;
    const fh = CH - 112;
    k.save();
    k.filter = 'blur(8px)';
    k.fillStyle = 'rgba(0,0,0,.35)';
    retRedondo(k, fx + 2, fy + 6, fw, fh, 26);
    k.fill();
    k.restore();
    k.save();
    retRedondo(k, fx, fy, fw, fh, 26);
    k.clip();
    k.fillStyle = V.campo;
    k.fillRect(fx, fy, fw, fh);
    brilho(k, CW / 2, CH / 2, 640, 'rgba(' + V.traco + ',' + (V.claro ? 0.0 : 0.14) + ')');
    if (V.claro) {
      const gc = k.createRadialGradient(CW / 2, CH / 2, 60, CW / 2, CH / 2, 760);
      gc.addColorStop(0, '#fffdf4');
      gc.addColorStop(1, '#efdfb4');
      k.fillStyle = gc;
      k.fillRect(fx, fy, fw, fh);
    }
    // a trama dos ícones da raridade, bem leve
    for (let y = fy - 40, linha = 0; y < fy + fh + 40; y += 92, linha++) {
      for (let x = fx - 40 + (linha % 2) * 56; x < fx + fw + 40; x += 112) {
        iconeCanvas(k, rar, x, y, 40, 'rgba(' + V.traco + ',' + (V.claro ? 0.12 : 0.07) + ')', { traco: 1.4, cheio: 0 });
      }
    }
    // a guilhoché: anéis finos ondulados em volta do centro
    k.lineWidth = 1.4;
    for (let i = 0; i < 46; i++) {
      const raio = 200 + i * 11;
      k.strokeStyle = 'rgba(' + V.traco + ',' + ((V.claro ? 0.1 : 0.05) + (i % 4 === 0 ? 0.08 : 0.02)).toFixed(3) + ')';
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
      k.fillStyle = r() < 0.5 ? 'rgba(255,255,240,.04)' : 'rgba(0,0,0,' + (V.claro ? 0.05 : 0.25) + ')';
      k.fillRect(fx + r() * fw, fy + r() * fh, 2, 2);
    }
    k.restore();
    k.lineWidth = 3;
    k.strokeStyle = M.janela;
    retRedondo(k, fx, fy, fw, fh, 26);
    k.stroke();
    // o medalhão: o anel de metal da raridade, o fundo e o símbolo em relevo
    const cx = CW / 2;
    const cy = CH / 2 - 20;
    const R = 176;
    const ga = k.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    ga.addColorStop(0, V.anel[1]);
    ga.addColorStop(0.45, V.anel[0]);
    ga.addColorStop(0.7, V.anel[1]);
    ga.addColorStop(1, V.anel[2]);
    k.save();
    k.filter = 'blur(10px)';
    k.fillStyle = 'rgba(0,0,0,.45)';
    k.beginPath();
    k.arc(cx + 4, cy + 10, R + 6, 0, Math.PI * 2);
    k.fill();
    k.restore();
    k.fillStyle = ga;
    k.beginPath();
    k.arc(cx, cy, R, 0, Math.PI * 2);
    k.fill();
    k.fillStyle = V.campo;
    k.beginPath();
    k.arc(cx, cy, R - 18, 0, Math.PI * 2);
    k.fill();
    if (V.claro) {
      const gm = k.createRadialGradient(cx - 40, cy - 50, 10, cx, cy, R);
      gm.addColorStop(0, '#fffef8');
      gm.addColorStop(1, '#f1e2b8');
      k.fillStyle = gm;
      k.fill();
    }
    brilho(k, cx - 30, cy - 40, R, 'rgba(' + V.traco + ',' + (V.claro ? 0.0 : 0.16) + ')');
    k.strokeStyle = 'rgba(0,0,0,.45)';
    k.lineWidth = 2;
    k.beginPath();
    k.arc(cx, cy, R - 18, 0, Math.PI * 2);
    k.stroke();
    k.strokeStyle = ga;
    k.lineWidth = 2;
    k.beginPath();
    k.arc(cx, cy, R - 30, 0, Math.PI * 2);
    k.stroke();
    if (CC.story && CC.CAMINHO_SIMBOLO) {
      const h = 196;
      const w = h * 1357 / 1936;
      const lx = cx - w / 2;
      const ly = cy - h / 2 + 4;
      // o relevo: a sombra embaixo à direita, a luz em cima à esquerda, o metal por cima
      CC.story.logo(k, lx + 3, ly + 4, h, V.claro ? 'rgba(120,90,20,.45)' : 'rgba(0,0,0,.7)');
      CC.story.logo(k, lx - 2, ly - 2, h, V.claro ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.28)');
      const gl = k.createLinearGradient(lx, ly, lx + w, ly + h);
      gl.addColorStop(0, V.anel[1]);
      gl.addColorStop(0.55, V.claro ? V.anel[0] : V.anel[1]);
      gl.addColorStop(1, V.anel[0]);
      CC.story.logo(k, lx, ly, h, gl);
    }
    escrever(k, 'GERAÇÃO ELEITA', CW / 2, cy + R + 96, oswald(30, 600), 'rgba(' + V.traco + ',' + (V.claro ? 0.95 : 0.85) + ')', { alinhar: 'center', espaco: 9 });
    k.lineWidth = 3;
    k.strokeStyle = 'rgba(0,0,0,.45)';
    retRedondo(k, 1.5, 1.5, CW - 3, CH - 3, 45);
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
    brilho(k, L / 2, 960, 900, RARIDADES[raridadeDe(carta)].ordem >= 3 ? 'rgba(255,196,77,.16)' : 'rgba(200,218,140,.10)');
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

  // ---------- a carta viva: inclina com o dedo, brilha e vira ----------
  // Camadas (cartas.css): .carta-viva (perspectiva) > .cv-giro (inclinação e giro em 3D) >
  // as duas faces; em cada face, o canvas e, por cima, o brilho da raridade (.cv-holo,
  // .cv-metal, .cv-purpurina) e o reflexo (.cv-reflexo). O ponteiro vira variáveis CSS
  // (--rx, --ry, --mx, --my, --bx, --by, --o), com mola, num requestAnimationFrame. O
  // brilho fica fora do texto por clip-path (as medidas de JX/JY/PY acima, em %).
  // Toque: vira para o verso e volta. Arraste na horizontal: gira livre e, ao soltar, assenta
  // no lado mais perto. Com menos movimento: não inclina, o brilho fica parado e virar é troca.
  const ARTE_CLARA = new Set(['davi', 'poco']);
  const INCLINACAO = { linho: 7, bronze: 10, prata: 12, ouro: 14, gloria: 14 };
  const menosMovimento = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    || document.documentElement.classList.contains('menos-movimento');
  // A purpurina: pontos e estrelinhas de quatro pontas, desenhados uma vez; o CSS mostra só os
  // que estão perto da luz (máscara no ponteiro). Na glória, também a névoa colorida do cosmos.
  function purpurina(w, h, rar, semente) {
    const c = tela(w, h);
    const k = c.getContext('2d');
    const r = sorteio(semente);
    const cores = rar === 'gloria' ? ['#ffffff', '#ffe9a8', '#bff3ff', '#e8c8ff', '#c8ffd8', '#ffd0e0'] : ['#ffffff', '#fff3c4', '#ffd27a', '#ffe9a8'];
    if (rar === 'gloria') {
      k.save();
      k.filter = 'blur(' + Math.round(w * 0.06) + 'px)';
      for (let i = 0; i < 14; i++) {
        k.fillStyle = ['rgba(255,214,120,.35)', 'rgba(150,220,255,.3)', 'rgba(210,170,255,.3)', 'rgba(170,240,190,.28)'][i % 4];
        k.beginPath();
        k.ellipse(r() * w, r() * h, w * (0.1 + r() * 0.2), h * (0.05 + r() * 0.12), r() * 3, 0, Math.PI * 2);
        k.fill();
      }
      k.restore();
    }
    const n = Math.round((w * h) / (rar === 'gloria' ? 900 : 700));
    for (let i = 0; i < n; i++) {
      const x = r() * w;
      const y = r() * h;
      const cor = cores[Math.floor(r() * cores.length)];
      k.fillStyle = cor;
      k.globalAlpha = 0.5 + r() * 0.5;
      if (r() < 0.12) {
        const t = (1.5 + r() * 3.5) * (w / 400);
        k.beginPath();
        k.moveTo(x, y - t * 2);
        k.quadraticCurveTo(x, y, x + t * 2, y);
        k.quadraticCurveTo(x, y, x, y + t * 2);
        k.quadraticCurveTo(x, y, x - t * 2, y);
        k.quadraticCurveTo(x, y, x, y - t * 2);
        k.fill();
      } else {
        k.beginPath();
        k.arc(x, y, (0.4 + r() * 0.9) * (w / 400), 0, Math.PI * 2);
        k.fill();
      }
    }
    k.globalAlpha = 1;
    return c;
  }
  const CAMADAS = '<i class="cv-holo"></i><i class="cv-metal"></i><i class="cv-purpurina"></i><i class="cv-reflexo"></i>';
  function cartaViva(carta, { largura = 300, verso = false, interativa = true } = {}) {
    const rar = raridadeDe(carta);
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const px = Math.round(Math.min(CW, Math.max(320, largura * dpr)));
    const ph = Math.round(px * 1.4);
    const frente = desenharCarta(tela(px, ph), carta);
    const atras = desenharVerso(tela(px, ph), rar);
    frente.setAttribute('aria-hidden', 'true');
    atras.setAttribute('aria-hidden', 'true');
    const el = document.createElement('div');
    el.className = 'carta-viva';
    el.dataset.raridade = rar;
    // arte clara (papel, terra ao sol): o holo da arte troca o color-dodge, que estoura o claro
    if (ARTE_CLARA.has(carta.desenho)) el.dataset.arte = 'clara';
    el.style.setProperty('--largura', largura + 'px');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'Carta ' + carta.album + ', ' + carta.numero + ' de ' + carta.total + ', ' + RARIDADES[rar].nome + ': '
      + carta.titulo + '. Você sabia? ' + carta.sabia + ' ' + carta.ref);
    el.innerHTML = '<div class="cv-giro"><div class="cv-face cv-frente">' + CAMADAS + '</div><div class="cv-face cv-verso">' + CAMADAS + '</div></div>';
    el.querySelector('.cv-frente').prepend(frente);
    el.querySelector('.cv-verso').prepend(atras);
    if (rar === 'ouro' || rar === 'gloria') {
      const pw = Math.round(largura * Math.min(2, dpr));
      el.querySelectorAll('.cv-purpurina').forEach((p, i) => p.appendChild(purpurina(pw, Math.round(pw * 1.4), rar, 31 + i)));
    }
    // o estado: valor atual, velocidade e alvo de cada variável
    const est = { rx: [0, 0, 0], ry: [0, 0, 0], mx: [50, 0, 50], my: [50, 0, 50], o: [0, 0, 0], giro: [verso ? 180 : 0, 0, verso ? 180 : 0] };
    let quadro = 0;
    let tween = null;
    const max = INCLINACAO[rar];
    const aplicar = () => {
      const g = est.giro[0];
      const s = el.style;
      s.setProperty('--rx', est.rx[0].toFixed(2) + 'deg');
      s.setProperty('--ry', est.ry[0].toFixed(2) + 'deg');
      s.setProperty('--giro', g.toFixed(2) + 'deg');
      s.setProperty('--mx', est.mx[0].toFixed(1) + '%');
      s.setProperty('--my', est.my[0].toFixed(1) + '%');
      // o holo corre com o ângulo: inclinar e girar mexem a posição das faixas
      const gx = Math.sin((g * Math.PI) / 180) * 40;
      s.setProperty('--bx', (50 + (est.mx[0] - 50) * 0.9 + gx).toFixed(1) + '%');
      s.setProperty('--by', (50 + (est.my[0] - 50) * 0.9).toFixed(1) + '%');
      s.setProperty('--o', Math.max(0, Math.min(1, est.o[0])).toFixed(3));
      s.setProperty('--d', (Math.hypot(est.mx[0] - 50, est.my[0] - 50) / 70).toFixed(3));
      const lado = ((Math.round(g / 180) % 2) + 2) % 2 === 1;
      el.classList.toggle('mostra-verso', lado);
    };
    const passo = () => {
      quadro = 0;
      let mexendo = false;
      if (tween) {
        const t = Math.min(1, (performance.now() - tween.inicio) / tween.duracao);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        for (const [nome, de, para] of tween.vars) { est[nome][0] = de + (para - de) * e; est[nome][1] = 0; est[nome][2] = para; }
        if (t < 1) mexendo = true; else { const fim = tween.fim; tween = null; if (fim) fim(); }
      }
      if (!tween) {
        for (const [nome, v] of Object.entries(est)) {
          const rigidez = nome === 'giro' ? 0.075 : nome === 'o' ? 0.08 : 0.1;
          const amortece = nome === 'giro' ? 0.74 : 0.72;
          v[1] = (v[1] + (v[2] - v[0]) * rigidez) * amortece;
          v[0] += v[1];
          if (Math.abs(v[1]) > 0.01 || Math.abs(v[2] - v[0]) > 0.02) mexendo = true; else v[0] = v[2];
        }
      }
      aplicar();
      if (mexendo) quadro = requestAnimationFrame(passo);
    };
    const mover = () => { if (!quadro) quadro = requestAnimationFrame(passo); };
    const alvo = (vals) => { for (const [n, v] of Object.entries(vals)) est[n][2] = v; mover(); };
    const mirar = (fx, fy, forca = 1) => {
      // fx, fy de 0 a 1 na carta; a carta inclina para longe do dedo, como quem aperta a ponta
      const verso = el.classList.contains('mostra-verso');
      alvo({ rx: (0.5 - fy) * 2 * max * forca, ry: (fx - 0.5) * 2 * max * forca * (verso ? -1 : 1), mx: fx * 100, my: fy * 100, o: forca });
    };
    const api = {
      el,
      raridade: rar,
      // fx, fy (0 a 1): põe a carta naquele ângulo na hora, sem mola (para as capturas)
      inclinar(fx, fy, forca = 1) {
        mirar(fx, fy, forca);
        for (const v of Object.values(est)) { v[0] = v[2]; v[1] = 0; }
        aplicar();
      },
      soltar() { alvo({ rx: 0, ry: 0, mx: 50, my: 50, o: 0 }); },
      virar(paraVerso) {
        const atual = Math.round(est.giro[2] / 180) * 180;
        const verso = paraVerso === undefined ? !el.classList.contains('mostra-verso') : paraVerso;
        const dest = verso ? (Math.abs(atual % 360) === 180 ? atual : atual + 180) : (Math.abs(atual % 360) === 0 ? atual : atual - 180);
        if (menosMovimento()) { est.giro = [dest, 0, dest]; aplicar(); return; }
        alvo({ giro: dest });
      },
      // a varredura da revelação: a luz passa de um canto ao outro, com a carta acompanhando
      varrer(duracao, fim) {
        if (menosMovimento()) { est.o = [0.45, 0, 0.45]; aplicar(); if (fim) fim(); return; }
        tween = { inicio: performance.now(), duracao, fim: () => { api.soltar(); if (fim) fim(); },
          vars: [['mx', 8, 92], ['my', 22, 78], ['ry', -max * 0.8, max * 0.8], ['rx', max * 0.4, -max * 0.4], ['o', 1, 1]] };
        mover();
      },
      girarPara(graus, duracao, fim) {
        if (menosMovimento()) { est.giro = [graus, 0, graus]; aplicar(); if (fim) fim(); return; }
        tween = { inicio: performance.now(), duracao, fim, vars: [['giro', est.giro[0], graus]] };
        mover();
      },
      // só para as capturas: o giro num ângulo exato
      girarJa(graus) { est.giro = [graus, 0, graus]; aplicar(); },
      // O giroscópio, só se a pessoa ativar (o iPhone pede licença num toque): inclinar o
      // celular inclina a carta, a partir de como ele estava quando ligou.
      async giroscopio() {
        const D = window.DeviceOrientationEvent;
        if (!D || menosMovimento()) return false;
        if (typeof D.requestPermission === 'function') {
          try { if ((await D.requestPermission()) !== 'granted') return false; } catch (e) { return false; }
        }
        let base = null;
        const ouvir = (ev) => {
          if (!el.isConnected) { window.removeEventListener('deviceorientation', ouvir); return; }
          if (ev.beta == null || ev.gamma == null) return;
          if (!base) base = [ev.beta, ev.gamma];
          const lim = (v) => Math.max(-1, Math.min(1, v / 25));
          mirar(0.5 + lim(ev.gamma - base[1]) * 0.5, 0.5 + lim(ev.beta - base[0]) * 0.5, 0.9);
        };
        window.addEventListener('deviceorientation', ouvir);
        return true;
      },
    };
    aplicar();
    if (interativa) {
      el.tabIndex = -1;
      let toque = null;
      el.addEventListener('pointermove', (ev) => {
        if (menosMovimento()) return;
        const q = el.getBoundingClientRect();
        const fx = Math.max(0, Math.min(1, (ev.clientX - q.left) / q.width));
        const fy = Math.max(0, Math.min(1, (ev.clientY - q.top) / q.height));
        if (toque && toque.id === ev.pointerId) {
          const dx = ev.clientX - toque.x;
          if (!toque.girando && Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(ev.clientY - toque.y) * 1.4) toque.girando = true;
          if (toque.girando) {
            const agora = performance.now();
            toque.vel = ((ev.clientX - toque.ux) / Math.max(1, agora - toque.ut)) * 16;
            toque.ux = ev.clientX;
            toque.ut = agora;
            est.giro[2] = toque.giro + dx * (180 / Math.max(160, q.width * 0.9));
            alvo({ rx: 0, ry: 0, o: 0.8, mx: 50 + Math.sin((est.giro[2] * Math.PI) / 180) * 40, my: 50 });
            return;
          }
        }
        if (ev.pointerType === 'mouse' || toque) mirar(fx, fy);
      });
      el.addEventListener('pointerdown', (ev) => {
        toque = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, ux: ev.clientX, ut: performance.now(), vel: 0, giro: est.giro[2], girando: false };
        try { el.setPointerCapture(ev.pointerId); } catch (e) { /* sem captura */ }
      });
      const largar = (ev, cancelou) => {
        if (!toque || toque.id !== ev.pointerId) return;
        const t = toque;
        toque = null;
        if (t.girando) {
          // assenta no lado mais perto, contando o embalo do dedo
          const final = est.giro[2] + t.vel * 6;
          alvo({ giro: Math.round(final / 180) * 180 });
        } else if (!cancelou) {
          api.virar();
          el.dispatchEvent(new CustomEvent('virou'));
        }
        if (ev.pointerType !== 'mouse') api.soltar();
      };
      el.addEventListener('pointerup', (ev) => largar(ev, false));
      el.addEventListener('pointercancel', (ev) => largar(ev, true));
      el.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse' && !toque) api.soltar(); });
    }
    return api;
  }
  // O botão "Virar carta", ao lado da carta, para quem não toca nela (teclado e leitor de tela).
  function botaoVirar(api) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cv-botao-virar';
    b.setAttribute('aria-label', 'Virar carta');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>Virar';
    b.onclick = () => api.virar();
    return b;
  }

  // ---------- a miniatura do álbum: parada, sem brilho ----------
  function miniatura(carta, largura = 96) {
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const px = Math.round(largura * dpr);
    const c = desenharCarta(tela(px, Math.round(px * 1.4)), carta);
    c.className = 'cv-mini';
    c.style.width = largura + 'px';
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', carta.titulo + ', ' + RARIDADES[raridadeDe(carta)].nome);
    return c;
  }

  // ---------- a revelação no baú ----------
  // Tocar abre (Pular sempre à vista): o baú balança (0-400 ms); a tampa abre e sobe a luz na
  // cor da raridade, que nunca engana (400-700); o verso sobe com a aura, o ícone e o nome da
  // raridade (700-1300); toque na carta, ou 3 s, e ela vira (450); o brilho passa (700; prata
  // e ouro 900; glória mais o halo); no fim, "Nova!", a referência e "Ler a história", com a
  // carta inclinável. Com menos movimento: sem balanço nem giro, a carta aparece com o halo
  // parado e o nome. Sem som.
  function bauSvg() {
    const [ouro, ouroS, corpo, corpoS] = ['#d2a24e', '#9e7328', '#b07a42', '#82552b'];
    return '<svg class="rv-bau-arte" viewBox="0 0 120 110" aria-hidden="true">'
      + '<ellipse cx="60" cy="102" rx="44" ry="7" fill="#000" opacity=".18"/>'
      + '<rect x="14" y="50" width="92" height="48" rx="10" fill="' + corpo + '"/>'
      + '<rect x="14" y="80" width="92" height="18" rx="8" fill="' + corpoS + '"/>'
      + '<rect x="30" y="50" width="10" height="48" fill="' + ouro + '"/><rect x="80" y="50" width="10" height="48" fill="' + ouro + '"/>'
      + '<ellipse class="rv-bau-boca" cx="60" cy="52" rx="40" ry="6" fill="#1a1a1a"/>'
      + '<ellipse class="rv-bau-luz" cx="60" cy="51" rx="30" ry="4" fill="currentColor"/>'
      + '<g class="rv-bau-tampa"><rect x="14" y="26" width="92" height="30" rx="10" fill="' + corpo + '"/>'
      + '<rect x="14" y="44" width="92" height="12" fill="' + corpoS + '"/>'
      + '<rect x="30" y="26" width="10" height="30" fill="' + ouro + '"/><rect x="80" y="26" width="10" height="30" fill="' + ouro + '"/>'
      + '<rect x="48" y="44" width="24" height="24" rx="7" fill="' + ouro + '"/><rect x="48" y="58" width="24" height="10" rx="4" fill="' + ouroS + '"/>'
      + '<circle cx="60" cy="54" r="4" fill="' + corpoS + '"/></g></svg>';
  }
  function revelacao(palco, carta, { progresso = '', aoLer, largura } = {}) {
    const rar = raridadeDe(carta);
    const R = RARIDADES[rar];
    const larg = largura || Math.round(Math.min(300, window.innerWidth * 0.72, (window.innerHeight - 300) / 1.4));
    palco.innerHTML = '<div class="rv" data-raridade="' + rar + '" data-fase="fechado" style="--luz:' + R.luz + '">'
      + '<button type="button" class="rv-pular">Pular</button>'
      + '<div class="rv-palco" style="--largura:' + larg + 'px">'
      + '<i class="rv-raios" aria-hidden="true"></i><i class="rv-coluna" aria-hidden="true"></i>'
      + '<div class="rv-carta"></div>'
      + '<button type="button" class="rv-bau" aria-label="Abrir o baú">' + bauSvg() + '</button></div>'
      + '<p class="rv-raridade" aria-live="polite">' + iconeSvg(rar) + '<span>' + R.nome + '</span></p>'
      + '<div class="rv-fim"><p class="rv-nova"><strong>Nova!</strong> ' + CC.esc(progresso ? progresso + ' · ' + carta.album : carta.album) + '</p>'
      + '<p class="rv-titulo">' + CC.esc(carta.titulo) + ' <span>' + CC.esc(carta.ref) + '</span></p>'
      + '<div class="rv-botoes"><button type="button" class="botao rv-ler">Ler a história</button></div></div></div>';
    const rv = palco.querySelector('.rv');
    const api = cartaViva(carta, { largura: larg, verso: true });
    rv.querySelector('.rv-carta').appendChild(api.el);
    rv.querySelector('.rv-botoes').prepend(botaoVirar(api));
    const timers = [];
    const depois = (ms, f) => timers.push(setTimeout(f, ms));
    const fase = (f) => { rv.dataset.fase = f; };
    let virou = false;
    const brilhar = () => {
      fase('brilha');
      const dur = rar === 'linho' || rar === 'bronze' ? 700 : 900;
      api.varrer(dur, () => {
        if (rar === 'gloria') { rv.classList.add('com-halo'); depois(400, terminar); } else terminar();
      });
      if (rar === 'gloria') rv.classList.add('com-halo');
    };
    const virar = () => {
      if (virou) return;
      virou = true;
      fase('vira');
      api.girarPara(0, 450, brilhar);
    };
    const terminar = () => {
      timers.forEach(clearTimeout);
      fase('fim');
      rv.classList.add('com-halo');
      api.soltar();
      const ler = rv.querySelector('.rv-ler');
      ler.onclick = () => (aoLer ? aoLer(carta) : null);
      ler.focus({ preventScroll: true });
    };
    const pular = () => {
      timers.forEach(clearTimeout);
      virou = true;
      api.girarJa(0);
      terminar();
    };
    api.el.addEventListener('virou', (ev) => {
      // o primeiro toque na carta de costas é o que a vira na revelação
      if (rv.dataset.fase === 'espera') { api.girarJa(180); virar(); }
    });
    const abrir = () => {
      if (rv.dataset.fase !== 'fechado') return;
      if (menosMovimento()) {
        fase('sobe');
        depois(500, () => { virou = true; api.girarJa(0); fase('brilha'); api.varrer(0); depois(300, terminar); });
        return;
      }
      fase('balanca');
      depois(400, () => fase('abre'));
      depois(700, () => fase('sobe'));
      depois(1300, () => fase('espera'));
      depois(4300, virar);
    };
    rv.querySelector('.rv-bau').onclick = abrir;
    rv.querySelector('.rv-pular').onclick = pular;
    return { el: rv, abrir, pular, carta: api, fase: () => rv.dataset.fase };
  }

  // Na Trilha (03-trilha.js): a carta entra de costas e vira sozinha; depois, inclina e vira
  // ao toque, com o botão "Virar carta" embaixo.
  function revelar(alvo, carta) {
    const larg = Math.round(Math.min(340, window.innerWidth * 0.8, Math.max(200, (window.innerHeight - 360) / 1.4)));
    const api = cartaViva(carta, { largura: larg, verso: !menosMovimento() });
    alvo.innerHTML = '';
    alvo.classList.add('revelar-carta-viva');
    alvo.appendChild(api.el);
    alvo.appendChild(botaoVirar(api));
    if (!menosMovimento()) setTimeout(() => api.girarPara(0, 650, () => api.varrer(RARIDADES[api.raridade].ordem >= 2 ? 900 : 700)), 250);
    return api;
  }

  // A carta de cada baú (amostra): fixa pelo número do dia, enquanto o sorteio por pessoa não vem.
  const cartaDoBau = (numero) => CARTAS[Math.floor(numero / 7) % CARTAS.length];

  CC.cartas = { lista: CARTAS, desenhos: DESENHOS, RARIDADES, iconeSvg, cartaViva, botaoVirar, miniatura, revelacao,
    cartaDoBau, desenharCarta, desenharVerso, revelar, storyDaCarta, papelDeParede,
    tela: () => tela(CW, CH), CW, CH };
})(window.CC);
