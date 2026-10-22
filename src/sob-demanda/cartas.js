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
    // a bacia de bronze do pátio (Êx 30.18): larga e rasa, com a água, o pé curto e a base
    bacia: { partes: [
      ['s', bola(12, 9.6, 10, 1.7)],
      ['s', 'M2.1 10.1C3.1 13.7 7.1 15.4 12 15.4s8.9-1.7 9.9-5.3'],
      ['s', 'M10.7 15.4v2.2M13.3 15.4v2.2'],
      ['sf', 'M5.2 20.8h13.6c-.8-1.9-3.3-3-6.8-3s-6 1.1-6.8 3z'],
    ] },
    // duas trombetas de prata batida (Nm 10.2), longas e retas, cruzadas: tubo fino, dois anéis
    // e a campânula
    trombeta: { partes: [
      ...[-45, -135].flatMap((g) => [
        ['s', 'M1.6 12H17.8', g],
        ['s', 'M1.2 10.9v2.2', g],
        ['s', 'M6.6 11v2M11.8 11v2', g],
        ['sf', 'M17.6 11.3c1.7-.1 3-1 4.3-2.8v7c-1.3-1.8-2.6-2.7-4.3-2.8z', g],
      ]),
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
    // a nuvem da glória pousada sobre a tenda do tabernáculo (Êx 40.34)
    nuvem: { partes: [
      ['sf', 'M6.1 12.6h11.6a3.1 3.1 0 0 0 .3-6.2 4.6 4.6 0 0 0-8.8-1A3.6 3.6 0 0 0 6.1 12.6z'],
      ['sf', 'M4.6 21.4V17.2L12 14.8l7.4 2.4v4.2z'],
      ['s', 'M10.4 21.4v-3.4h3.2v3.4M2.6 21.4h18.8'],
    ] },
  };
  function iconeSvg(id, classe) {
    const ic = ICONES[RARIDADES[id] ? RARIDADES[id].icone : id];
    const corpo = ic.partes.map(([t, d, g]) => '<path d="' + d + '"' + (g ? ' transform="rotate(' + g + ' 12 12)"' : '')
      + (t === 's' ? ' fill="none"' : t === 'f' ? ' stroke="none"' : ' fill="currentColor" fill-opacity=".28"') + '/>').join('');
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
    for (const [t, d, g] of ic.partes) {
      const p = new Path2D(d);
      k.save();
      if (g) { k.translate(12, 12); k.rotate((g * Math.PI) / 180); k.translate(-12, -12); }
      if (t === 'f') k.fill(p);
      if (t === 'sf') { k.globalAlpha = cheio; k.fill(p); k.globalAlpha = 1; }
      if (t !== 'f') k.stroke(p);
      k.restore();
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
  // Em três quartos, no escuro do Lugar Santíssimo, como prancha gravada: atrás, o véu em
  // pregas fundas; a arca de ouro (2,5 x 1,5 x 1,5 côvados) com a moldura em volta (Êx 25.11),
  // os pés, as argolas e as duas varas passando por dentro delas (Êx 25.12-15); sobre a tampa,
  // os dois querubins de ouro ajoelhados, de frente um para o outro e de rosto para a tampa,
  // com as asas abertas para cima e para a frente, cobrindo-a (Êx 25.18-20): penas em fileiras
  // ordenadas, umas por cima das outras. Entre eles, a luz (Êx 25.22). Rosto nenhum desenhado.
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
  // A câmera: gira em volta do eixo de pé (giro) e olha um pouco de cima (queda), com
  // perspectiva leve. Devolve [x, y] na tela e a profundidade (maior = mais perto).
  function camera(cx, cy, escala, giro, queda, foco) {
    const cg = Math.cos(giro);
    const sg = Math.sin(giro);
    const cq = Math.cos(queda);
    const sq = Math.sin(queda);
    return ([x, y, z]) => {
      const xr = x * cg + z * sg;
      const zr = -x * sg + z * cg;
      const yr = y * cq - zr * sq;
      const zz = y * sq + zr * cq;
      const p = foco / (foco - zz);
      return [cx + xr * escala * p, cy - yr * escala * p, zz, p];
    };
  }
  const poligono = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };
  // Uma face de ouro gravada: o gradiente do tom e as linhas na direção pedida.
  function faceDeOuro(k, pts, tomA, tomB, ang, passo, sombra, obj) {
    const p = poligono(pts);
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    const g = k.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    g.addColorStop(0, tomDeOuro(tomA));
    g.addColorStop(1, tomDeOuro(tomB));
    k.fillStyle = g;
    k.fill(p);
    if (obj) obj.fill(p);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    gravar(k, p, cx, cy, Math.hypot(Math.max(...xs) - cx, Math.max(...ys) - cy) + 4, ang, passo, 1.9, sombra, TINTA_OURO, 0);
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 2;
    k.stroke(p);
    return p;
  }
  // Uma pena: a lâmina de ponta redonda, o tom da luz, a haste e a gravura no lado da sombra.
  function pena(k, B, D, comp, larg, luz) {
    const N = [-D[1], D[0]];
    const P = (a, b) => [B[0] + D[0] * a + N[0] * b, B[1] + D[1] * a + N[1] * b];
    const p = new Path2D();
    p.moveTo(...P(0, larg * 0.3));
    p.bezierCurveTo(...P(comp * 0.35, larg * 0.55), ...P(comp * 0.75, larg * 0.55), ...P(comp * 0.94, larg * 0.32));
    p.quadraticCurveTo(...P(comp * 1.04, 0), ...P(comp * 0.94, -larg * 0.32));
    p.bezierCurveTo(...P(comp * 0.75, -larg * 0.55), ...P(comp * 0.35, -larg * 0.55), ...P(0, -larg * 0.3));
    p.closePath();
    const g = k.createLinearGradient(...P(0, -larg / 2), ...P(0, larg / 2));
    g.addColorStop(0, tomDeOuro(0.18 + luz * 0.62));
    g.addColorStop(1, tomDeOuro(0.1 + luz * 0.45));
    k.fillStyle = g;
    k.fill(p);
    k.save();
    k.clip(p);
    k.strokeStyle = TINTA_OURO;
    k.lineCap = 'round';
    // as barbas: riscos finos e oblíquos no lado da sombra, mais fortes quanto menos luz
    const n = Math.round(comp / 6);
    for (let i = 1; i < n; i++) {
      const a = (i / n) * comp;
      k.lineWidth = 0.6 + (1 - luz) * 1.1;
      k.beginPath();
      k.moveTo(...P(a, 0));
      k.lineTo(...P(a + larg * 0.35, larg * 0.6));
      k.stroke();
      if (luz < 0.55) {
        k.lineWidth = 0.5 + (0.55 - luz) * 1.4;
        k.beginPath();
        k.moveTo(...P(a, 0));
        k.lineTo(...P(a + larg * 0.35, -larg * 0.6));
        k.stroke();
      }
    }
    k.restore();
    k.lineCap = 'round';
    k.strokeStyle = tomDeOuro(0.55 + luz * 0.45, 0.9);
    k.lineWidth = 1.3;
    k.beginPath();
    k.moveTo(...P(comp * 0.02, -1));
    k.quadraticCurveTo(...P(comp * 0.5, -larg * 0.05), ...P(comp * 0.9, -1));
    k.stroke();
    k.strokeStyle = 'rgba(42,28,5,.95)';
    k.lineWidth = 1.4;
    k.stroke(p);
  }
  // A asa aberta, ordenada como numa escultura: as rêmiges (primárias na mão, secundárias no
  // braço), depois três fileiras de coberteiras, cada uma por cima da anterior, e a fileira
  // miúda na beirada. "borda" é a beirada da frente, do ombro à ponta; as penas pendem dela
  // para o lado de "baixo" (o lado de fora da curva, para a tampa).
  function asaOrdenada(k, borda, luzEm, { escurecer = 0, escala = 1, lado = 1, obj } = {}) {
    const n = 160;
    const pts = bezier(...borda, n);
    const em = (t) => pts[Math.round(Math.max(0, Math.min(1, t)) * n)];
    const norm = (v) => { const d = Math.hypot(v[0], v[1]) || 1; return [v[0] / d, v[1] / d]; };
    // as penas pendem da beirada: para baixo e um pouco para trás no braço; na mão (a ponta)
    // deitam para a frente, para onde a asa aponta
    const pontaDir = norm([pts[n][0] - pts[n - 12][0], pts[n][1] - pts[n - 12][1]]);
    const dir = (t) => {
      const desce = norm([-0.32 * lado, 1]);
      if (t < 0.6) return desce;
      const u = (t - 0.6) / 0.4;
      return norm([desce[0] * (1 - u) + (pontaDir[0] + 0.25 * lado * 0) * u * 1.1, desce[1] * (1 - u) + (pontaDir[1] + 0.5) * u]);
    };
    const luz = (B, D, L) => Math.max(0.05, Math.min(1, luzEm([B[0] + D[0] * L * 0.6, B[1] + D[1] * L * 0.6]) * (1 - escurecer)));
    const comp = (t) => (100 - t * 36 + (t > 0.78 ? (t - 0.78) * 160 : 0)) * escala;
    const pinta = (B, D, L, larg) => pena(k, B, D, L, larg * escala, luz(B, D, L));
    if (obj) {
      const sil = new Path2D();
      for (let i = 0; i <= 24; i++) { const q = em(i / 24); if (i) sil.lineTo(q[0], q[1]); else sil.moveTo(q[0], q[1]); }
      for (let i = 24; i >= 0; i--) { const tt = i / 24; const B = em(tt); const D = dir(tt); const L = comp(tt); sil.lineTo(B[0] + D[0] * L, B[1] + D[1] * L); }
      sil.closePath();
      obj.fill(sil);
    }
    // as rêmiges: do ombro à ponta, cada uma por cima da anterior
    for (let i = 0; i <= 19; i++) {
      const t = 0.04 + (i / 19) * 0.96;
      pinta(em(t), dir(t), comp(t), 25);
    }
    // as coberteiras, em três fileiras: cada fileira mais curta, mais perto da beirada e por cima
    for (const [fr, L, larg, qtd] of [[0.5, 0.52, 22, 17], [0.26, 0.34, 18, 21], [0.08, 0.2, 14, 27]]) {
      for (let i = 0; i < qtd; i++) {
        const t = 0.02 + (i / (qtd - 1)) * 0.9;
        const B = em(t);
        const D = dir(t);
        const c = comp(t);
        pinta([B[0] + D[0] * c * fr * 0.35, B[1] + D[1] * c * fr * 0.35], D, c * L, larg);
      }
    }
    // a beirada: o osso da asa, um friso liso de ouro
    k.save();
    k.lineCap = 'round';
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 10 * escala;
    k.beginPath();
    pts.forEach((q, i) => (i ? k.lineTo(q[0], q[1]) : k.moveTo(q[0], q[1])));
    k.stroke();
    k.strokeStyle = tomDeOuro(0.72 * (1 - escurecer) + 0.1);
    k.lineWidth = 6.5 * escala;
    k.stroke();
    k.strokeStyle = 'rgba(255,246,214,' + (0.7 * (1 - escurecer)).toFixed(2) + ')';
    k.lineWidth = 1.4;
    k.translate(0, -2);
    k.stroke();
    k.restore();
  }
  // Um querubim de ouro ajoelhado, de perfil, com a cabeça baixa para a tampa: só o volume
  // da escultura (a veste longa em pregas, o braço recolhido, as mãos juntas), sem rosto.
  // "lado" 1 olha para a direita. Desenha a asa de trás antes do corpo e a da frente depois.
  function querubim(k, x0, y0, esc, lado, luzEm, obj) {
    const T = (x, y) => [x0 + lado * x * esc, y0 + y * esc];
    const caminho = (lista) => {
      const p = new Path2D();
      p.moveTo(...T(...lista[0]));
      for (let i = 1; i < lista.length; i += 3) p.bezierCurveTo(...T(...lista[i]), ...T(...lista[i + 1]), ...T(...lista[i + 2]));
      p.closePath();
      return p;
    };
    // a asa de trás: mais alta, mais escura
    const borda = (dx, dy) => [T(-26 + dx, -134 + dy), T(-62 + dx, -290 + dy), T(40 + dx, -350 + dy), T(124 + dx, -292 + dy)];
    asaOrdenada(k, borda(16, -26), luzEm, { escurecer: 0.45, escala: esc * 0.95, lado, obj });
    const corpo = caminho([[-56, 0], [-62, -10], [-66, -28], [-64, -40], [-62, -60], [-48, -84], [-44, -110], [-40, -130], [-32, -144], [-22, -150],
      [-12, -158], [0, -156], [6, -152], [16, -146], [26, -134], [24, -120], [22, -106], [20, -94], [22, -86], [34, -78], [52, -66], [62, -50],
      [70, -36], [70, -12], [66, 0], [30, 4], [-20, 4], [-56, 0]]);
    // a cabeça baixa, para a tampa, com o cabelo preso atrás; sem rosto
    const cabeca = new Path2D();
    const [hx, hy] = T(20, -168);
    cabeca.ellipse(hx, hy, 21 * esc, 25 * esc, lado * 0.62, 0, Math.PI * 2);
    const braco = caminho([[-12, -144], [6, -130], [26, -116], [44, -110], [56, -108], [66, -106], [64, -96], [52, -92], [32, -94], [12, -104], [-8, -120], [-16, -132], [-12, -144]]);
    const luzLocal = (x, y) => luzEm(T(x, y));
    for (const [forma, cx, cy, raio] of [[corpo, 0, -76, 124], [cabeca, 20, -168, 34], [braco, 26, -116, 50]]) {
      const [gx0, gy0] = T(-60, 0);
      const [gx1, gy1] = T(56, 0);
      const g = k.createLinearGradient(gx0, gy0, gx1, gy1);
      g.addColorStop(0, tomDeOuro(0.22));
      g.addColorStop(0.65, tomDeOuro(0.42 + luzLocal(cx, cy) * 0.3));
      g.addColorStop(1, tomDeOuro(0.62 + luzLocal(cx, cy) * 0.3));
      k.fillStyle = g;
      k.fill(forma);
      if (obj) obj.fill(forma);
      const [ccx, ccy] = T(cx, cy);
      gravar(k, forma, ccx, ccy, raio * esc, Math.PI / 2 + lado * 0.18, 3.6, 1.8, (x) => {
        const u = ((x - x0) * lado / esc + 60) / 116;
        return 0.85 - u * 0.7 - luzLocal(cx, cy) * 0.25;
      }, TINTA_OURO, 0.2);
      k.strokeStyle = TINTA_OURO;
      k.lineWidth = 2;
      k.stroke(forma);
    }
    // o cabelo preso, na parte de trás da cabeça, em linhas curvas (o rosto fica liso, sem traço)
    k.save();
    k.clip(cabeca);
    const [cx2, cy2] = T(8, -176);
    k.fillStyle = tomDeOuro(0.28, 0.9);
    k.beginPath();
    k.ellipse(cx2, cy2, 19 * esc, 24 * esc, lado * 0.62, 0, Math.PI * 2);
    k.fill();
    k.strokeStyle = 'rgba(42,28,5,.8)';
    k.lineCap = 'round';
    k.lineWidth = 1.4;
    for (let i = 0; i < 7; i++) {
      k.beginPath();
      k.moveTo(...T(-4 + i * 4, -194 + i * 1.5));
      k.quadraticCurveTo(...T(-16 + i * 3, -176), ...T(-6 + i * 3, -150));
      k.stroke();
    }
    k.restore();
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 2;
    k.stroke(cabeca);
    // as pregas da veste, da cintura ao chão
    k.save();
    k.clip(corpo);
    k.strokeStyle = 'rgba(42,28,5,.75)';
    k.lineCap = 'round';
    for (const [a, b, c, d] of [[-40, -120, -56, -8], [-24, -126, -30, -4], [-8, -112, -6, -2], [30, -72, 30, -4], [46, -60, 52, -6]]) {
      k.lineWidth = 1.7;
      k.beginPath();
      k.moveTo(...T(a, b));
      k.quadraticCurveTo(...T((a + c) / 2 + 6, (b + d) / 2), ...T(c, d));
      k.stroke();
      k.strokeStyle = 'rgba(255,240,200,.35)';
      k.lineWidth = 1;
      k.beginPath();
      k.moveTo(...T(a + 3, b));
      k.quadraticCurveTo(...T((a + c) / 2 + 9, (b + d) / 2), ...T(c + 3, d));
      k.stroke();
      k.strokeStyle = 'rgba(42,28,5,.75)';
    }
    k.restore();
    // a asa da frente
    asaOrdenada(k, borda(0, 0), luzEm, { escala: esc, lado, obj });
  }
  // O véu atrás, em pregas fundas: as linhas da gravura correm de cima a baixo e se apertam
  // onde a prega vira para dentro (escuro) e se abrem onde ela vem para a frente (luz).
  function veuEmPregas(k, r, W, chao, luzEm) {
    const passo = 7;
    const P = 112;
    const fase = (u) => Math.sin((u / P) * Math.PI * 2 + Math.sin(u * 0.013) * 1.2);
    k.save();
    const fundo = k.createLinearGradient(0, 0, 0, chao);
    fundo.addColorStop(0, '#120f0b');
    fundo.addColorStop(1, '#1d1710');
    k.fillStyle = fundo;
    k.fillRect(0, 0, W, chao + 10);
    // a sombra no fundo de cada prega
    for (let u = -40; u < W + 60; u += 2) {
      const luzPrega = 0.5 + 0.5 * Math.cos((u / P) * Math.PI * 2 + Math.sin(u * 0.013) * 1.2 + 0.9);
      const x = u + fase(u) * 16;
      const l = 0.25 + luzEm([x, chao * 0.45]) * 0.75;
      k.fillStyle = 'rgba(' + Math.round(40 + 70 * l * luzPrega) + ',' + Math.round(30 + 52 * l * luzPrega) + ',' + Math.round(18 + 26 * l * luzPrega) + ',' + (0.55 * luzPrega).toFixed(3) + ')';
      k.fillRect(x, 0, 3, chao + 6);
    }
    k.lineCap = 'round';
    for (let u = -40; u < W + 60; u += passo) {
      const x = u + fase(u) * 16;
      const luzPrega = 0.5 + 0.5 * Math.cos((u / P) * Math.PI * 2 + Math.sin(u * 0.013) * 1.2 + 0.9);
      let ant = null;
      for (let y = -10; y <= chao + 8; y += 10) {
        const xx = x + Math.sin(y * 0.006 + u * 0.05) * 3;
        const l = (0.18 + luzEm([xx, y]) * 0.82) * luzPrega;
        const w = 0.3 + l * 2.4;
        if (ant) {
          k.strokeStyle = 'rgba(232,196,120,' + (0.08 + l * 0.6).toFixed(3) + ')';
          k.lineWidth = w;
          k.beginPath();
          k.moveTo(ant[0], ant[1]);
          k.lineTo(xx, y);
          k.stroke();
        }
        ant = [xx, y];
      }
    }
    // a barra do véu, ondulando com as pregas sobre o chão
    k.strokeStyle = 'rgba(232,196,120,.35)';
    k.lineWidth = 2;
    k.beginPath();
    for (let u = -40; u < W + 60; u += 4) {
      const x = u + fase(u) * 16;
      const y = chao + Math.cos((u / P) * Math.PI * 2 + Math.sin(u * 0.013) * 1.2) * 5;
      if (u === -40) k.moveTo(x, y); else k.lineTo(x, y);
    }
    k.stroke();
    // o varão e as argolas no alto
    k.fillStyle = 'rgba(0,0,0,.6)';
    k.fillRect(0, 0, W, 34);
    k.strokeStyle = 'rgba(232,196,120,.5)';
    k.lineWidth = 3;
    k.beginPath();
    k.moveTo(0, 30);
    k.lineTo(W, 30);
    k.stroke();
    for (let u = 0; u < W + 60; u += P) {
      k.lineWidth = 2;
      k.beginPath();
      k.ellipse(u + fase(u) * 16, 32, 7, 9, 0, 0, Math.PI * 2);
      k.stroke();
    }
    k.restore();
  }
  function desenhoArca(k, W, H, obj) {
    const r = sorteio(4507);
    const P = camera(W / 2 + 10, 690, 1.42, -0.5, 0.3, 1400);
    const chao = Math.round(P([0, -16, -330])[1]);
    const centro = P([0, 250, 0]);
    const fonte = [centro[0], centro[1]];
    const luzEm = ([x, y]) => Math.max(0, Math.min(1, 0.06 + 0.94 * Math.exp(-(((x - fonte[0]) / 300) ** 2 + ((y - fonte[1]) / 280) ** 2))));
    veuEmPregas(k, r, W, chao, luzEm);
    // o chão de pedra, em perspectiva
    const gch = k.createLinearGradient(0, chao, 0, H);
    gch.addColorStop(0, '#1a150d');
    gch.addColorStop(1, '#0a0806');
    k.fillStyle = gch;
    k.fillRect(0, chao, W, H - chao);
    k.save();
    k.strokeStyle = 'rgba(232,196,120,.07)';
    k.lineWidth = 1.2;
    for (let i = -8; i <= 8; i++) {
      const a = P([i * 70, -16, 300]);
      const b = P([i * 70, -16, -300]);
      k.beginPath();
      k.moveTo(a[0], a[1]);
      k.lineTo(b[0], b[1]);
      k.stroke();
    }
    for (let j = -3; j <= 4; j++) {
      const a = P([-600, -16, j * 70]);
      const b = P([600, -16, j * 70]);
      k.beginPath();
      k.moveTo(a[0], a[1]);
      k.lineTo(b[0], b[1]);
      k.stroke();
    }
    k.restore();
    brilho(k, fonte[0], chao + 30, 360, 'rgba(255,196,77,.12)', 'screen');
    brilho(k, fonte[0], fonte[1], 420, 'rgba(255,206,110,.2)', 'screen');
    // a sombra da arca no chão
    k.save();
    k.filter = 'blur(16px)';
    k.fillStyle = 'rgba(0,0,0,.8)';
    k.fill(poligono([P([-150, -16, -95]), P([150, -16, -95]), P([150, -16, 95]), P([-150, -16, 95])]));
    k.restore();
    const L = 125;
    const Z = 75;
    const A = 150;
    const VZ = 88;
    const VY = 4;
    // uma vara: cilindro ao longo de x, em z = vz
    const vara = (vz, x0, x1, rr) => {
      const a = P([x0, VY, vz]);
      const b = P([x1, VY, vz]);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
      const ra = rr * 1.42 * a[3];
      const rb = rr * 1.42 * b[3];
      const c = [Math.cos(ang), Math.sin(ang)];
      const pts = [[a[0] - c[0] * ra, a[1] - c[1] * ra], [b[0] - c[0] * rb, b[1] - c[1] * rb], [b[0] + c[0] * rb, b[1] + c[1] * rb], [a[0] + c[0] * ra, a[1] + c[1] * ra]];
      const p = poligono(pts);
      const g = k.createLinearGradient(a[0] - c[0] * ra, a[1] - c[1] * ra, a[0] + c[0] * ra, a[1] + c[1] * ra);
      g.addColorStop(0, tomDeOuro(0.9));
      g.addColorStop(0.35, tomDeOuro(0.66));
      g.addColorStop(1, tomDeOuro(0.18));
      k.fillStyle = g;
      k.fill(p);
      if (obj) obj.fill(p);
      gravar(k, p, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.hypot(b[0] - a[0], b[1] - a[1]) / 2 + 10, Math.atan2(b[1] - a[1], b[0] - a[0]), 3.2, 1.6,
        (x, y) => ((x - a[0]) * c[0] + (y - a[1]) * c[1]) / (ra * 2) + 0.5, TINTA_OURO, 0);
      k.strokeStyle = TINTA_OURO;
      k.lineWidth = 1.8;
      k.stroke(p);
      // a ponta de perto, redonda
      k.fillStyle = tomDeOuro(0.55);
      k.beginPath();
      k.ellipse(b[0], b[1], rb * 0.45, rb, Math.atan2(b[1] - a[1], b[0] - a[0]), 0, Math.PI * 2);
      k.fill();
      k.stroke();
    };
    // uma argola: o aro em pé no plano y-z, na quina de baixo; metade de trás antes da vara
    const argola = (x, vz, metade) => {
      let seg = [];
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        if ((Math.cos(a) >= 0) === (metade === 'frente')) seg.push(P([x, VY + Math.sin(a) * 15, vz + Math.cos(a) * 15]));
        else { desenhaAro(seg); seg = []; }
      }
      desenhaAro(seg);
    };
    const desenhaAro = (pts) => {
      if (pts.length < 2) return;
      k.save();
      k.lineCap = 'round';
      k.strokeStyle = TINTA_OURO;
      k.lineWidth = 9;
      k.beginPath();
      pts.forEach((q, i) => (i ? k.lineTo(q[0], q[1]) : k.moveTo(q[0], q[1])));
      k.stroke();
      k.strokeStyle = tomDeOuro(0.78);
      k.lineWidth = 5;
      k.stroke();
      k.strokeStyle = 'rgba(255,246,214,.75)';
      k.lineWidth = 1.3;
      k.stroke();
      k.restore();
    };
    // 1) a vara de trás e as argolas de trás (aparecem dos dois lados da arca)
    argola(-L + 20, -VZ, 'tras');
    argola(L - 20, -VZ, 'tras');
    vara(-VZ, -250, 250, 7);
    argola(-L + 20, -VZ, 'frente');
    argola(L - 20, -VZ, 'frente');
    // 2) os pés
    const pe = (x, z) => {
      const s = 14;
      faceDeOuro(k, [P([x - s, 0, z + s]), P([x + s, 0, z + s]), P([x + s, -16, z + s]), P([x - s, -16, z + s])], 0.5, 0.25, Math.PI / 2, 3.4, () => 0.55, obj);
      faceDeOuro(k, [P([x + s, 0, z + s]), P([x + s, 0, z - s]), P([x + s, -16, z - s]), P([x + s, -16, z + s])], 0.3, 0.15, Math.PI / 2, 3.4, () => 0.75, obj);
    };
    pe(L - 14, -Z + 14);
    pe(-L + 14, Z - 14);
    pe(L - 14, Z - 14);
    // 3) a caixa: o lado (a cabeceira da direita), a frente, a moldura e a tampa
    const sombraFrente = (x, y) => 1.05 - luzEm([x, y - 120]) * 0.95 + (y - P([0, A, Z])[1]) / 300;
    faceDeOuro(k, [P([L, A, Z]), P([L, A, -Z]), P([L, 0, -Z]), P([L, 0, Z])], 0.38, 0.14, Math.atan2(P([L, 0, -Z])[1] - P([L, 0, Z])[1], P([L, 0, -Z])[0] - P([L, 0, Z])[0]), 4, () => 0.85, obj);
    faceDeOuro(k, [P([-L, A, Z]), P([L, A, Z]), P([L, 0, Z]), P([-L, 0, Z])], 0.7, 0.24, Math.PI / 2 + 0.06, 4.2, sombraFrente, obj);
    // o painel rebaixado da frente, com o friso de folhas de amendoeira
    const painel = (u0, u1, v0, v1) => [P([u0, v0, Z]), P([u1, v0, Z]), P([u1, v1, Z]), P([u0, v1, Z])];
    const pp = painel(-L + 22, L - 22, A - 26, 22);
    const pPainel = poligono(pp);
    k.fillStyle = 'rgba(40,24,0,.22)';
    k.fill(pPainel);
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 2.4;
    k.stroke(pPainel);
    k.strokeStyle = tomDeOuro(0.95, 0.8);
    k.lineWidth = 1.4;
    k.beginPath();
    k.moveTo(pp[3][0] + 2, pp[3][1] - 2);
    k.lineTo(pp[2][0] - 2, pp[2][1] - 2);
    k.lineTo(pp[1][0] - 2, pp[1][1] + 2);
    k.stroke();
    // o friso: um ramo correndo no meio do painel, com folhas e flores
    const fr = (u) => P([u, A * 0.48 + Math.sin(u * 0.08) * 6, Z]);
    k.save();
    k.lineCap = 'round';
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 3.4;
    k.beginPath();
    for (let u = -L + 32; u <= L - 32; u += 3) { const q = fr(u); if (u === -L + 32) k.moveTo(q[0], q[1]); else k.lineTo(q[0], q[1]); }
    k.stroke();
    k.strokeStyle = tomDeOuro(0.85);
    k.lineWidth = 1.4;
    k.stroke();
    for (let u = -L + 40, i = 0; u <= L - 40; u += 15, i++) {
      const q = fr(u);
      const up = i % 2 ? -1 : 1;
      const f = new Path2D();
      f.moveTo(q[0], q[1]);
      f.quadraticCurveTo(q[0] + 9, q[1] + up * 10, q[0] + 4, q[1] + up * 20);
      f.quadraticCurveTo(q[0] - 5, q[1] + up * 9, q[0], q[1]);
      k.fillStyle = tomDeOuro(0.8);
      k.fill(f);
      k.lineWidth = 1.1;
      k.strokeStyle = TINTA_OURO;
      k.stroke(f);
      if (i % 4 === 2) {
        for (let pe2 = 0; pe2 < 5; pe2++) {
          const a = (pe2 / 5) * Math.PI * 2;
          k.fillStyle = tomDeOuro(0.95);
          k.beginPath();
          k.ellipse(q[0] + Math.cos(a) * 5, q[1] - up * 2 + Math.sin(a) * 5, 4.4, 2.6, a, 0, Math.PI * 2);
          k.fill();
          k.stroke();
        }
      }
    }
    k.restore();
    // a moldura em volta (a coroa de ouro), um pouco para fora, com as contas
    const M = 6;
    const mA = A + 16;
    faceDeOuro(k, [P([L + M, mA, Z + M]), P([L + M, mA, -Z - M]), P([L + M, A, -Z - M]), P([L + M, A, Z + M])], 0.5, 0.25, 0, 3.2, () => 0.7, obj);
    faceDeOuro(k, [P([-L - M, mA, Z + M]), P([L + M, mA, Z + M]), P([L + M, A, Z + M]), P([-L - M, A, Z + M])], 0.98, 0.5, 0, 3.2, (x, y) => 0.6 - luzEm([x, y]) * 0.55, obj);
    for (let u = -L; u <= L; u += 9) {
      const q = P([u, A + 7, Z + M]);
      k.fillStyle = TINTA_OURO;
      k.beginPath();
      k.arc(q[0] + 0.8, q[1] + 1.2, 3.6, 0, Math.PI * 2);
      k.fill();
      k.fillStyle = tomDeOuro(0.6 + luzEm(q) * 0.4);
      k.beginPath();
      k.arc(q[0], q[1], 3.1, 0, Math.PI * 2);
      k.fill();
      k.fillStyle = 'rgba(255,250,230,.85)';
      k.beginPath();
      k.arc(q[0] - 1, q[1] - 1, 1, 0, Math.PI * 2);
      k.fill();
    }
    // a tampa (o propiciatório), vista de cima, acesa pela luz
    faceDeOuro(k, [P([-L - M, mA, -Z - M]), P([L + M, mA, -Z - M]), P([L + M, mA, Z + M]), P([-L - M, mA, Z + M])], 0.8, 0.98, -0.32, 3.4, (x, y) => 0.7 - luzEm([x, y]) * 0.7, obj);
    // 4) os querubins: o de trás (esquerda, mais longe) antes, o da frente depois
    const qe = P([-L + 26, mA, 0]);
    const qd = P([L - 26, mA, 0]);
    querubim(k, qe[0], qe[1] + 4, 1.08 * qe[3], 1, luzEm, obj);
    querubim(k, qd[0], qd[1] + 4, 1.08 * qd[3], -1, luzEm, obj);
    // 5) a vara da frente, por dentro das argolas
    argola(-L + 20, VZ, 'tras');
    argola(L - 20, VZ, 'tras');
    vara(VZ, -260, 262, 7.5);
    argola(-L + 20, VZ, 'frente');
    argola(L - 20, VZ, 'frente');
    // as presilhas das argolas na arca
    for (const x of [-L + 20, L - 20]) {
      const q = P([x, VY + 16, Z]);
      k.fillStyle = tomDeOuro(0.55);
      k.fillRect(q[0] - 6, q[1] - 5, 12, 10);
      k.strokeStyle = TINTA_OURO;
      k.lineWidth = 1.4;
      k.strokeRect(q[0] - 6, q[1] - 5, 12, 10);
    }
    // 6) a luz entre as asas: o centro pequeno, os raios finos e o pó no ar
    k.save();
    k.globalCompositeOperation = 'screen';
    k.lineCap = 'round';
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 + (r() - 0.5) * 0.05;
      const r0 = 18 + r() * 8;
      const r1 = 70 + r() * (i % 3 === 0 ? 150 : 70);
      const gr = k.createLinearGradient(fonte[0], fonte[1], fonte[0] + Math.cos(a) * r1, fonte[1] + Math.sin(a) * r1);
      gr.addColorStop(0, 'rgba(255,236,180,.6)');
      gr.addColorStop(1, 'rgba(255,236,180,0)');
      k.strokeStyle = gr;
      k.lineWidth = 0.9 + r() * 0.8;
      k.beginPath();
      k.moveTo(fonte[0] + Math.cos(a) * r0, fonte[1] + Math.sin(a) * r0);
      k.lineTo(fonte[0] + Math.cos(a) * r1, fonte[1] + Math.sin(a) * r1);
      k.stroke();
    }
    k.restore();
    brilho(k, fonte[0], fonte[1], 120, 'rgba(255,214,130,.5)', 'screen');
    brilho(k, fonte[0], fonte[1], 30, 'rgba(255,250,232,.95)', 'screen');
    for (let i = 0; i < 180; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 300;
      const x = fonte[0] + Math.cos(a) * d;
      const y = fonte[1] + Math.sin(a) * d * 0.8;
      k.fillStyle = 'rgba(255,240,200,' + (luzEm([x, y]) * (0.2 + r() * 0.5)).toFixed(3) + ')';
      k.beginPath();
      k.arc(x, y, 0.6 + r() * 1.3, 0, Math.PI * 2);
      k.fill();
    }
    vinheta(k, W, H, 0.5);
  }

  // ---------- (6) Milagres: o túmulo vazio (glória) ----------
  // Uma prancha de gravura em papel, de manhã cedo (Jo 20.1): a porta lavrada na rocha, a
  // grande pedra redonda rolada para FORA, de pé no sulco, ao lado da porta; lá dentro, no
  // banco de pedra, o lençol de linho deitado, vazio, e o pano da cabeça dobrado à parte
  // (Jo 20.5-7). Ninguém desenhado, nenhuma estrela: só o céu claro da manhã. A rocha é
  // traço de tinta sépia sobre o papel; o escuro de dentro, hachura cruzada.
  const SEPIA = '#2b2112';
  // Um contorno de rocha: pontos com um pouco de aspereza, ligados por curvas.
  function contornoRocha(r, pts, aspereza = 6) {
    const p = new Path2D();
    const q = pts.map(([x, y]) => [x + (r() - 0.5) * aspereza, y + (r() - 0.5) * aspereza]);
    p.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < q.length - 1; i++) p.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2);
    p.lineTo(q[q.length - 1][0], q[q.length - 1][1]);
    return p;
  }
  // Tufos de capim e hissopo, em traço.
  function capim(k, r, x, y, alto, n = 9, cor = SEPIA) {
    k.save();
    k.strokeStyle = cor;
    k.lineCap = 'round';
    for (let f = 0; f < n; f++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 1.6;
      const c = alto * (0.5 + r() * 0.6);
      k.lineWidth = 1.2 + r() * 0.9;
      k.beginPath();
      k.moveTo(x + (r() - 0.5) * 8, y);
      k.quadraticCurveTo(x + Math.cos(a) * c * 0.5 + (r() - 0.5) * 10, y + Math.sin(a) * c * 0.55, x + Math.cos(a) * c, y + Math.sin(a) * c);
      k.stroke();
    }
    k.restore();
  }
  // Hachura que acompanha faixas onduladas (as camadas da rocha, o chão): entre a curva de
  // cima e a de baixo de cada faixa, linhas paralelas a elas, quebradas em traços, mais
  // grossas na sombra e embaixo de cada camada (onde a de cima faz beiral).
  function hachuraEmFaixas(k, r, forma, x0, x1, curvas, nLinhas, maxL, sombra, cor, { quebra = 0.03, juntas = 0 } = {}) {
    k.save();
    k.clip(forma);
    k.strokeStyle = cor;
    k.lineCap = 'round';
    for (let i = 0; i < curvas.length - 1; i++) {
      const a = curvas[i];
      const b = curvas[i + 1];
      for (let j = 1; j <= nLinhas; j++) {
        const t = j / (nLinhas + 1);
        let ant = null;
        let falha = r() * 30;
        let tremor = 0;
        for (let x = x0; x <= x1; x += 5) {
          tremor = tremor * 0.6 + (r() - 0.5) * 1.4;
          const y = a(x) + (b(x) - a(x)) * t + tremor;
          if (falha > 0) { falha -= 5; ant = null; continue; }
          if (r() < quebra) falha = 6 + r() * 30;
          const w = maxL * Math.max(0, Math.min(1, sombra(x, y) + t * t * 0.5)) * (0.65 + r() * 0.5);
          if (ant && w > 0.25) {
            k.lineWidth = w;
            k.beginPath();
            k.moveTo(ant[0], ant[1]);
            k.lineTo(x, y);
            k.stroke();
          }
          ant = [x, y];
        }
      }
      // a beirada da camada: o traço firme, irregular
      k.lineWidth = 2;
      k.beginPath();
      for (let x = x0; x <= x1; x += 7) { const y = b(x) + (r() - 0.5) * 2.2; if (x === x0) k.moveTo(x, y); else k.lineTo(x, y); }
      k.stroke();
      // as juntas: rachaduras quase em pé que partem a camada em blocos, com sombra à direita
      for (let q = 0; q < juntas; q++) {
        const x = x0 + r() * (x1 - x0);
        const ya = a(x);
        const yb = b(x);
        k.lineWidth = 1.8;
        k.beginPath();
        k.moveTo(x, ya);
        k.lineTo(x + (r() - 0.5) * 8, (ya + yb) / 2);
        k.lineTo(x + (r() - 0.5) * 8, yb);
        k.stroke();
        k.lineWidth = 1;
        for (let s = 3; s < 14; s += 4) {
          k.beginPath();
          k.moveTo(x + s, ya + 3);
          k.lineTo(x + s + (r() - 0.5) * 3, yb - 3);
          k.stroke();
        }
      }
    }
    k.restore();
  }
  // A rocha em facetas, como na gravura: o plano partido em blocos irregulares (células de
  // Voronoi de pontos sorteados), cada um com a hachura no seu ângulo e na sua luz; os da
  // sombra ganham a hachura cruzada.
  function facetas(r, x0, y0, x1, y1, px, py) {
    const pts = [];
    for (let y = y0 - py; y < y1 + py; y += py) {
      for (let x = x0 - px; x < x1 + px; x += px) pts.push([x + (r() - 0.25) * px * 0.9, y + (r() - 0.5) * py * 0.8]);
    }
    const corta = (pol, a, b) => {
      // mantém o lado de pol mais perto de a do que de b
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const nx = b[0] - a[0];
      const ny = b[1] - a[1];
      const lado = (p) => (p[0] - mx) * nx + (p[1] - my) * ny;
      const out = [];
      for (let i = 0; i < pol.length; i++) {
        const p = pol[i];
        const q = pol[(i + 1) % pol.length];
        const lp = lado(p);
        const lq = lado(q);
        if (lp <= 0) out.push(p);
        if ((lp < 0) !== (lq < 0)) { const u = lp / (lp - lq); out.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]); }
      }
      return out;
    };
    return pts.map((a) => {
      let pol = [[a[0] - px * 2, a[1] - py * 2], [a[0] + px * 2, a[1] - py * 2], [a[0] + px * 2, a[1] + py * 2], [a[0] - px * 2, a[1] + py * 2]];
      for (const b of pts) if (b !== a && Math.abs(b[0] - a[0]) < px * 2.5 && Math.abs(b[1] - a[1]) < py * 2.5) pol = corta(pol, a, b);
      return { c: a, pol };
    });
  }
  function rochaEmFacetas(k, r, forma, caixa, px, py, luz, cor) {
    k.save();
    k.clip(forma);
    k.lineCap = 'round';
    k.lineJoin = 'round';
    for (const { c, pol } of facetas(r, ...caixa, px, py)) {
      if (pol.length < 3) continue;
      const p = new Path2D();
      const lados = [];
      // a beirada partida: cada lado ganha um ponto torto no meio
      pol.forEach((q, i) => {
        const s = pol[(i + 1) % pol.length];
        const m = [(q[0] + s[0]) / 2 + (r() - 0.5) * 9, (q[1] + s[1]) / 2 + (r() - 0.5) * 9];
        if (i === 0) p.moveTo(q[0], q[1]);
        p.lineTo(m[0], m[1]);
        p.lineTo(s[0], s[1]);
        lados.push([q, m, s]);
      });
      p.closePath();
      const v = Math.max(0, Math.min(1, luz(c[0], c[1]) + (r() - 0.5) * 0.45));
      const ang = (r() < 0.6 ? 0.05 : r() < 0.5 ? -0.6 : 1.2) + (r() - 0.5) * 0.4;
      const raio = Math.max(px, py) * 1.6;
      if (v > 0.12) gravar(k, p, c[0], c[1], raio, ang, 5.2, 1.9, () => v, cor, 0.12);
      if (v > 0.62) gravar(k, p, c[0], c[1], raio, ang + 1.15, 6, 1.5, () => (v - 0.5) * 1.6, cor, 0);
      // só parte das beiradas leva traço, como na gravura (o resto é a hachura que muda)
      k.strokeStyle = cor;
      for (const [q, m, s] of lados) {
        if (r() < 0.4) continue;
        k.lineWidth = 1 + v * 1.6;
        k.beginPath();
        k.moveTo(q[0], q[1]);
        k.lineTo(m[0], m[1]);
        k.lineTo(s[0], s[1]);
        k.stroke();
      }
    }
    k.restore();
  }
  function desenhoTumulo(k, W, H, obj) {
    const r = sorteio(4611);
    const sol = [96, 120];
    // o papel: creme quente, mais claro perto do sol, com fibra e manchas do tempo
    const gp = k.createRadialGradient(sol[0], sol[1], 40, W * 0.5, H * 0.5, W * 1.05);
    gp.addColorStop(0, '#fbf3dc');
    gp.addColorStop(0.45, '#efe3c2');
    gp.addColorStop(1, '#d9c9a0');
    k.fillStyle = gp;
    k.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) {
      k.fillStyle = r() < 0.6 ? 'rgba(80,62,30,' + (0.03 + r() * 0.06).toFixed(3) + ')' : 'rgba(255,253,240,.3)';
      k.fillRect(r() * W, r() * H, 1 + r() * 4, 1);
    }
    for (let i = 0; i < 22; i++) brilho(k, r() * W, r() * H, 6 + r() * 26, 'rgba(130,100,50,' + (0.04 + r() * 0.06).toFixed(3) + ')');
    brilho(k, sol[0], sol[1], 380, 'rgba(255,214,130,.55)');
    // o céu da manhã: linhas finas e horizontais, que somem perto do sol (sem estrelas)
    const ceu = new Path2D();
    ceu.rect(0, 0, W, 300);
    gravar(k, ceu, W / 2, 150, 640, 0, 7, 1.25, (x, y) => Math.min(1, Math.hypot(x - sol[0], (y - sol[1]) * 1.6) / 760) * 0.95 - y / 900, SEPIA, 0);
    // os morros de longe, à esquerda, em traço leve
    const morro = contornoRocha(r, [[-10, 214], [60, 196], [140, 206], [220, 190], [300, 214], [300, 320], [-10, 320]], 4);
    k.fillStyle = '#e7d8b2';
    k.fill(morro);
    gravar(k, morro, 150, 250, 220, -0.2, 6, 1.1, () => 0.55, SEPIA, 0);
    // a rocha: o morro de calcário onde o túmulo foi cavado, com o alto irregular
    const topo = [[-20, 262], [40, 248], [110, 232], [170, 196], [250, 170], [330, 150], [420, 136], [520, 128], [620, 132], [720, 120], [800, 128], [W + 20, 116]];
    const rocha = new Path2D();
    rocha.moveTo(-20, 680);
    topo.forEach(([x, y]) => rocha.lineTo(x, y));
    rocha.lineTo(W + 20, 680);
    rocha.closePath();
    k.fillStyle = '#e4d3a8';
    k.fill(rocha);
    // a luz da manhã vem da esquerda: a rocha clareia para lá, escurece para a direita
    rochaEmFacetas(k, r, rocha, [-10, 100, W + 10, 680], 170, 96, (x, y) => 0.12 + (x / W) * 0.45 + Math.max(0, (y - 420) / 600), SEPIA);
    // rachaduras
    k.save();
    k.clip(rocha);
    k.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      let x = r() * W;
      let y = 170 + r() * 440;
      let a = Math.PI / 2 + (r() - 0.5) * 1.2;
      k.strokeStyle = 'rgba(43,33,18,' + (0.4 + r() * 0.35).toFixed(3) + ')';
      k.lineWidth = 1.2 + r() * 1.2;
      k.beginPath();
      k.moveTo(x, y);
      for (let s = 0; s < 3; s++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * (12 + r() * 18); y += Math.sin(a) * (12 + r() * 18); k.lineTo(x, y); }
      k.stroke();
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.beginPath();
    topo.forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
    k.stroke();
    // o arbusto no alto da rocha
    for (let i = 0; i < 14; i++) capim(k, r, 340 + i * 26 + r() * 12, 140 - Math.sin(i / 13 * Math.PI) * 4 + (i > 7 ? -6 : 0), 26 + r() * 22, 7);
    // a fachada lavrada: o plano liso cortado na rocha, com as marcas do cinzel
    const fx0 = 92;
    const fx1 = 600;
    const fy0 = 214;
    const fy1 = 640;
    const fachada = contornoRocha(r, [[fx0, fy1], [fx0 + 4, fy0 + 30], [fx0 + 30, fy0 + 6], [fx1 - 40, fy0], [fx1 - 4, fy0 + 20], [fx1, fy1]], 5);
    fachada.closePath();
    k.save();
    k.filter = 'blur(6px)';
    k.fillStyle = 'rgba(43,33,18,.35)';
    k.translate(10, 8);
    k.fill(fachada);
    k.restore();
    k.fillStyle = '#eadcb6';
    k.fill(fachada);
    gravar(k, fachada, (fx0 + fx1) / 2, 430, 340, Math.PI / 2, 6, 1.3, (x) => 0.18 + ((x - fx0) / (fx1 - fx0)) * 0.42, SEPIA, 0);
    k.save();
    k.clip(fachada);
    k.strokeStyle = 'rgba(43,33,18,.45)';
    k.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const x = fx0 + r() * (fx1 - fx0);
      const y = fy0 + r() * (fy1 - fy0);
      k.lineWidth = 1 + r() * 0.8;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + 7 + r() * 6, y - 9 - r() * 5);
      k.stroke();
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.2;
    k.stroke(fachada);
    // a porta: um vão baixo e largo, de verga reta, com a espessura da rocha à direita
    const px0 = 176;
    const px1 = 486;
    const py0 = 300;
    const py1 = 628;
    const porta = contornoRocha(r, [[px0, py1], [px0 - 2, py0 + 14], [px0 + 10, py0], [px1 - 10, py0 - 2], [px1 + 2, py0 + 12], [px1, py1]], 3);
    porta.closePath();
    // dentro: o escuro da câmara, em hachura cruzada sobre o fundo
    k.save();
    k.clip(porta);
    k.fillStyle = '#3a2f1d';
    k.fillRect(px0 - 20, py0 - 20, px1 - px0 + 40, py1 - py0 + 40);
    const dentro = new Path2D();
    dentro.rect(px0 - 20, py0 - 20, px1 - px0 + 40, py1 - py0 + 40);
    gravar(k, dentro, (px0 + px1) / 2, (py0 + py1) / 2, 300, 0.75, 5, 2.4, () => 0.95, '#120d06', 0);
    gravar(k, dentro, (px0 + px1) / 2, (py0 + py1) / 2, 300, -0.75, 5, 2.4, () => 0.95, '#120d06', 0);
    // a luz da manhã entra de viés pela porta e cai no banco
    const faixa = new Path2D();
    faixa.moveTo(px0 - 10, py0 - 10);
    faixa.lineTo(px0 + 150, py0 - 10);
    faixa.lineTo(px1 + 30, py1 + 10);
    faixa.lineTo(px0 + 120, py1 + 10);
    faixa.closePath();
    k.save();
    k.filter = 'blur(16px)';
    k.fillStyle = 'rgba(255,230,170,.42)';
    k.fill(faixa);
    k.restore();
    // a parede do fundo e o banco de pedra cavado nela
    const bancoT = 470;
    const bancoF = 520;
    const banco = new Path2D();
    banco.rect(px0 - 10, bancoT, px1 - px0 + 20, bancoF - bancoT);
    k.fillStyle = '#8a7650';
    k.fill(banco);
    gravar(k, banco, (px0 + px1) / 2, (bancoT + bancoF) / 2, 200, 0, 4.2, 1.8, (x) => 0.35 + Math.abs(x - 340) / 300, '#1d160a', 0);
    const tampo = new Path2D();
    tampo.moveTo(px0 - 10, bancoT);
    tampo.lineTo(px0 + 14, bancoT - 22);
    tampo.lineTo(px1 - 4, bancoT - 22);
    tampo.lineTo(px1 + 10, bancoT);
    tampo.closePath();
    k.fillStyle = '#b9a272';
    k.fill(tampo);
    gravar(k, tampo, 330, bancoT - 11, 200, 0, 4, 1.1, (x) => 0.3 + Math.abs(x - 330) / 400, '#1d160a', 0);
    k.strokeStyle = '#1d160a';
    k.lineWidth = 1.6;
    k.stroke(tampo);
    k.stroke(banco);
    // o chão da câmara, mais baixo que a soleira
    const chaoD = new Path2D();
    chaoD.rect(px0 - 10, bancoF, px1 - px0 + 20, py1 - bancoF + 10);
    k.fillStyle = 'rgba(40,30,16,.55)';
    k.fill(chaoD);
    gravar(k, chaoD, 330, 580, 200, 0, 5, 1.6, () => 0.7, '#120d06', 0);
    // o lençol de linho: um só pano comprido, deitado e vazio, com uma ponta caída pela beirada
    const lencol = new Path2D();
    lencol.moveTo(194, 462);
    lencol.bezierCurveTo(196, 452, 200, 446, 214, 445);
    lencol.bezierCurveTo(250, 442, 290, 447, 330, 443);
    lencol.bezierCurveTo(350, 441, 362, 444, 364, 452);
    lencol.lineTo(366, 466);
    lencol.lineTo(244, 470);
    // a ponta que cai pela frente do banco
    lencol.bezierCurveTo(246, 486, 242, 500, 238, 512);
    lencol.lineTo(206, 508);
    lencol.bezierCurveTo(204, 494, 200, 480, 196, 470);
    lencol.closePath();
    k.save();
    k.filter = 'blur(4px)';
    k.fillStyle = 'rgba(10,8,4,.7)';
    k.translate(5, 7);
    k.fill(lencol);
    k.restore();
    k.fillStyle = '#f7efdc';
    k.fill(lencol);
    if (obj) obj.fill(lencol);
    gravar(k, lencol, 280, 470, 140, 0.02, 3.6, 1.2, (x, y) => (y - 446) / 26 * 0.55 + (x < 246 && y > 468 ? 0.25 : 0), '#4a3d24', 0);
    k.save();
    k.clip(lencol);
    k.strokeStyle = 'rgba(58,47,29,.8)';
    k.lineCap = 'round';
    k.lineWidth = 1.4;
    // as pregas no comprimento e as rugas curtas
    for (const yy of [451, 457]) {
      k.beginPath();
      k.moveTo(206, yy + 2);
      k.bezierCurveTo(250, yy - 3, 300, yy + 3, 356, yy - 1);
      k.stroke();
    }
    for (const x of [236, 262, 298, 326]) { k.beginPath(); k.moveTo(x, 446); k.quadraticCurveTo(x + 5, 455, x + 2, 466); k.stroke(); }
    k.beginPath();
    k.moveTo(244, 470);
    k.bezierCurveTo(260, 468, 330, 466, 366, 466);
    k.stroke();
    k.beginPath();
    k.moveTo(222, 472);
    k.quadraticCurveTo(226, 490, 222, 508);
    k.stroke();
    k.restore();
    k.strokeStyle = '#2b2112';
    k.lineWidth = 1.8;
    k.stroke(lencol);
    // o pano da cabeça, dobrado, num lugar à parte (Jo 20.7)
    const pano = new Path2D();
    pano.moveTo(394, 456);
    pano.lineTo(400, 444);
    pano.lineTo(442, 443);
    pano.lineTo(446, 455);
    pano.lineTo(446, 466);
    pano.lineTo(394, 467);
    pano.closePath();
    k.save();
    k.filter = 'blur(4px)';
    k.fillStyle = 'rgba(10,8,4,.7)';
    k.translate(5, 6);
    k.fill(pano);
    k.restore();
    k.fillStyle = '#f2e8d0';
    k.fill(pano);
    if (obj) obj.fill(pano);
    k.fillStyle = 'rgba(74,61,36,.35)';
    k.fillRect(394, 456, 52, 11);
    k.strokeStyle = '#2b2112';
    k.lineWidth = 1.6;
    k.stroke(pano);
    k.lineWidth = 1.1;
    k.beginPath();
    k.moveTo(394, 456); k.lineTo(446, 455);
    k.moveTo(395, 460); k.lineTo(445, 459.5);
    k.moveTo(395, 463.5); k.lineTo(445, 463);
    k.moveTo(421, 443.5); k.lineTo(420, 455.5);
    k.stroke();
    brilho(k, 300, 452, 150, 'rgba(255,248,226,.3)', 'screen');
    k.restore();
    // a espessura da porta (o lado de dentro do batente direito, aceso) e a soleira
    const batente = new Path2D();
    batente.moveTo(px1 - 2, py0 + 10);
    batente.lineTo(px1 - 26, py0 + 30);
    batente.lineTo(px1 - 26, py1 - 6);
    batente.lineTo(px1, py1);
    batente.closePath();
    k.fillStyle = '#d9c597';
    k.fill(batente);
    gravar(k, batente, px1 - 13, (py0 + py1) / 2, 180, Math.PI / 2, 5, 1.1, () => 0.45, SEPIA, 0);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(batente);
    const verga = new Path2D();
    verga.moveTo(px0 + 10, py0);
    verga.lineTo(px1 - 10, py0 - 2);
    verga.lineTo(px1 - 26, py0 + 26);
    verga.lineTo(px0 + 22, py0 + 26);
    verga.closePath();
    k.fillStyle = '#5a4a2c';
    k.fill(verga);
    gravar(k, verga, (px0 + px1) / 2, py0 + 12, 200, 0, 3.6, 1.6, () => 0.8, '#120d06', 0);
    k.strokeStyle = SEPIA;
    k.lineWidth = 3;
    k.stroke(porta);
    // o sulco cavado na frente da fachada, onde a pedra corre
    const sy = 624;
    const sulco = new Path2D();
    sulco.moveTo(60, sy);
    sulco.lineTo(W + 10, sy - 8);
    sulco.lineTo(W + 10, sy + 14);
    sulco.lineTo(60, sy + 20);
    sulco.closePath();
    k.fillStyle = '#7d6942';
    k.fill(sulco);
    gravar(k, sulco, W / 2, sy + 6, 500, -0.01, 3.2, 1.5, () => 0.85, '#1d160a', 0);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(60, sy);
    k.lineTo(W + 10, sy - 8);
    k.stroke();
    // o lábio de baixo do sulco, aceso
    k.strokeStyle = 'rgba(255,248,226,.8)';
    k.lineWidth = 2.5;
    k.beginPath();
    k.moveTo(60, sy + 22);
    k.lineTo(W + 10, sy + 16);
    k.stroke();
    // o chão de pedra e terra na frente, com o capim
    const chao = new Path2D();
    chao.moveTo(-10, sy + 26);
    chao.lineTo(W + 10, sy + 16);
    chao.lineTo(W + 10, H + 10);
    chao.lineTo(-10, H + 10);
    chao.closePath();
    k.fillStyle = '#e2d1a4';
    k.fill(chao);
    const linhasChao = [];
    for (let i = 0; i < 9; i++) {
      const f = onda(sorteio(800 + i), 3, 0.008);
      const y0 = sy + 22 + Math.pow(i / 8, 1.5) * (H - sy);
      linhasChao.push((x) => y0 + f(x) * (4 + i * 1.5));
    }
    hachuraEmFaixas(k, r, chao, -10, W + 10, linhasChao, 3, 1.7, (x, y) => 0.1 + (x / W) * 0.3, 'rgba(43,33,18,.8)', { quebra: 0.3 });
    for (let i = 0; i < 26; i++) {
      const x = r() * W;
      const y = sy + 60 + r() * (H - sy - 60);
      const rr = 5 + r() * r() * 16;
      const sx = seixo(r, x, y, rr, rr * 0.55, (r() - 0.5) * 0.4, 0.14);
      k.save();
      k.translate(rr * 0.4, rr * 0.3);
      k.fillStyle = 'rgba(43,33,18,.3)';
      k.fill(sx);
      k.restore();
      k.fillStyle = '#efe2bd';
      k.fill(sx);
      gravar(k, sx, x, y, rr * 1.2, 0.6, 3, 1.1, (px) => (px - x) / rr * 0.5 + 0.35, SEPIA, 0);
      k.strokeStyle = 'rgba(43,33,18,.8)';
      k.lineWidth = 1.2;
      k.stroke(sx);
    }
    for (let i = 0; i < 16; i++) capim(k, r, r() * W, sy + 50 + r() * (H - sy - 60), 22 + r() * 30, 8);
    // a grande pedra redonda, rolada para fora e de pé no sulco, à direita da porta
    const pcx = 716;
    const pcy = 438;
    const pR = 182;
    const esp = 22;
    // a sombra dela na fachada e no chão
    k.save();
    k.filter = 'blur(12px)';
    k.fillStyle = 'rgba(43,33,18,.45)';
    k.beginPath();
    k.ellipse(pcx + 40, pcy + 14, pR * 0.86, pR, 0, 0, Math.PI * 2);
    k.fill();
    k.beginPath();
    k.ellipse(pcx + 70, sy + 20, pR * 0.9, 18, 0, 0, Math.PI * 2);
    k.fill();
    k.restore();
    // a espessura (a borda que se vê do lado da porta)
    const borda = new Path2D();
    borda.ellipse(pcx - esp, pcy, pR * 0.86, pR, 0, Math.PI * 0.5, Math.PI * 1.5);
    borda.ellipse(pcx, pcy, pR * 0.86, pR, 0, Math.PI * 1.5, Math.PI * 0.5, true);
    borda.closePath();
    k.fillStyle = '#cdb88a';
    k.fill(borda);
    if (obj) obj.fill(borda);
    gravar(k, borda, pcx - esp, pcy, pR, Math.PI / 2, 4.2, 1.6, (x, y) => 0.4 + (y - pcy) / pR * 0.35, SEPIA, 0.3);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.2;
    k.stroke(borda);
    // a face, lavrada em círculos, clara do lado da manhã
    const face = new Path2D();
    face.ellipse(pcx, pcy, pR * 0.86, pR, 0, 0, Math.PI * 2);
    k.fillStyle = '#ecdcb3';
    k.fill(face);
    if (obj) obj.fill(face);
    const sf = sombraOval(pcx, pcy, pR * 0.86, pR, 0);
    gravar(k, face, pcx, pcy, pR * 1.1, 0.9, 5.2, 2.2, (x, y) => sf(x, y) * 0.7 + 0.08, SEPIA, 0.12);
    k.save();
    k.clip(face);
    // a pedra lavrada a ponteiro: picadas curtas em todas as direções, e as lascas da beirada
    k.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * pR;
      const x = pcx + Math.cos(a) * d * 0.86;
      const y = pcy + Math.sin(a) * d;
      const sombra = sf(x, y);
      k.strokeStyle = 'rgba(43,33,18,' + (0.25 + sombra * 0.45).toFixed(3) + ')';
      k.lineWidth = 0.9 + sombra * 1.1;
      const g = r() * Math.PI;
      const c = 3 + r() * 5;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + Math.cos(g) * c, y + Math.sin(g) * c);
      k.stroke();
    }
    // o anel gasto perto da borda, de rolar no sulco
    k.strokeStyle = 'rgba(43,33,18,.45)';
    k.lineWidth = 1.6;
    k.beginPath();
    k.ellipse(pcx, pcy, pR * 0.86 - 14, pR - 14, 0, 0, Math.PI * 2);
    k.stroke();
    k.strokeStyle = 'rgba(255,250,232,.6)';
    k.lineWidth = 1.4;
    k.beginPath();
    k.ellipse(pcx - 1.5, pcy - 1.5, pR * 0.86 - 17, pR - 17, 0, Math.PI * 0.9, Math.PI * 1.6);
    k.stroke();
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 3;
    k.stroke(face);
    // o calço de pedra que segura a roda no sulco
    const calco = contornoRocha(r, [[pcx - 150, sy + 6], [pcx - 160, sy - 26], [pcx - 120, sy - 34], [pcx - 104, sy + 4]], 3);
    calco.closePath();
    k.fillStyle = '#d6c393';
    k.fill(calco);
    gravar(k, calco, pcx - 130, sy - 14, 40, 0.7, 4, 1.4, () => 0.6, SEPIA, 0);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(calco);
    capim(k, r, 120, sy + 30, 46, 11);
    capim(k, r, 560, sy + 34, 40, 9);
    vinheta(k, W, H, 0.2);
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
  function folhaDeMetal(k, w, h, r, tons, { escuro = '80,50,0', claro = '255,250,220', batido = false, guilloche = false, escovado = true } = {}) {
    const g = k.createLinearGradient(0, 0, w, h);
    tons.forEach(([p, c]) => g.addColorStop(p, c));
    k.fillStyle = g;
    k.fillRect(0, 0, w, h);
    if (batido) {
      // as marcas do martelo: covinhas pequenas e regulares, uma ao lado da outra, cada uma
      // com o brilho em cima à esquerda e a sombra curta embaixo à direita
      const passo = 17;
      for (let y = -passo, l = 0; y < h + passo; y += passo * 0.87, l++) {
        for (let x = -passo + (l % 2) * passo / 2; x < w + passo; x += passo) {
          const cx = x + (r() - 0.5) * 3;
          const cy = y + (r() - 0.5) * 3;
          const rr = 6.5 + r() * 1.5;
          k.strokeStyle = 'rgba(' + claro + ',.32)';
          k.lineWidth = 1.4;
          k.beginPath();
          k.arc(cx, cy, rr, Math.PI * 0.95, Math.PI * 1.55);
          k.stroke();
          k.strokeStyle = 'rgba(' + escuro + ',.16)';
          k.beginPath();
          k.arc(cx, cy, rr, Math.PI * 1.95, Math.PI * 2.55);
          k.stroke();
        }
      }
    }
    if (escovado) {
      for (let i = 0; i < 1800; i++) {
        const y = r() * h;
        k.strokeStyle = r() < 0.5 ? 'rgba(' + claro + ',' + (0.04 + r() * 0.07).toFixed(3) + ')' : 'rgba(' + escuro + ',' + (0.03 + r() * 0.06).toFixed(3) + ')';
        k.lineWidth = 0.8 + r();
        const x = r() * w;
        k.beginPath();
        k.moveTo(x, y);
        k.lineTo(x + 60 + r() * 200, y + (r() - 0.5) * 4);
        k.stroke();
      }
    }
    if (guilloche) {
      // a guilhoché: ondas finas em leque a partir dos quatro cantos, como em cédula
      k.lineWidth = 1;
      for (const [ox, oy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
        for (let i = 0; i < 60; i++) {
          const raio = 40 + i * 9;
          k.strokeStyle = i % 5 === 0 ? 'rgba(' + escuro + ',.12)' : 'rgba(' + escuro + ',.06)';
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
    k.fillStyle = 'rgba(' + claro + ',.45)';
    k.beginPath();
    k.moveTo(w * 0.55, -50);
    k.lineTo(w * 0.72, -50);
    k.lineTo(w * 0.2, h + 50);
    k.lineTo(w * 0.03, h + 50);
    k.fill();
    k.restore();
  }
  // O linho: o tecido cru, só a trama fina e regular (por cima, por baixo) e a borda mais escura.
  function tecidoDeLinho(k, w, h, r) {
    const g = k.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#e6d9be');
    g.addColorStop(0.55, '#d8c9a9');
    g.addColorStop(1, '#c6b490');
    k.fillStyle = g;
    k.fillRect(0, 0, w, h);
    const passo = 4;
    for (let y = 0; y < h; y += passo) {
      for (let x = 0; x < w; x += passo) {
        const cima = ((x + y) / passo) % 2 === 0;
        k.fillStyle = cima ? 'rgba(255,250,236,' + (0.14 + r() * 0.06).toFixed(3) + ')' : 'rgba(100,82,50,' + (0.08 + r() * 0.05).toFixed(3) + ')';
        k.fillRect(x, y + (cima ? 0 : 1), cima ? passo : passo - 1, cima ? passo - 1.4 : passo - 1);
      }
    }
    vinheta(k, w, h, 0.25);
  }
  // A glória é "arte cheia": a ilustração passa por baixo da moldura, que vira dois filetes de
  // ouro. Aqui só o que fica por baixo de tudo e o filete; a arte entra em desenharCarta.
  function filetesDeOuro(k, w, h) {
    const g = k.createLinearGradient(0, 0, w, h);
    [[0, '#a87b12'], [0.25, '#ffe9a8'], [0.45, '#c99430'], [0.7, '#fff4c8'], [1, '#8c6519']].forEach(([p, c]) => g.addColorStop(p, c));
    k.save();
    k.strokeStyle = 'rgba(0,0,0,.45)';
    k.lineWidth = 4;
    retRedondo(k, 16, 16, w - 32, h - 32, 32);
    k.stroke();
    k.strokeStyle = g;
    k.lineWidth = 13;
    retRedondo(k, 12, 12, w - 24, h - 24, 34);
    k.stroke();
    k.strokeStyle = 'rgba(60,40,4,.6)';
    k.lineWidth = 1.5;
    retRedondo(k, 19, 19, w - 38, h - 38, 28);
    k.stroke();
    k.strokeStyle = g;
    k.lineWidth = 3;
    retRedondo(k, 30, 30, w - 60, h - 60, 24);
    k.stroke();
    // os cantos: um losango de ouro em cada
    for (const [x, y] of [[30, 30], [w - 30, 30], [30, h - 30], [w - 30, h - 30]]) {
      k.fillStyle = g;
      k.beginPath();
      k.moveTo(x, y - 14);
      k.lineTo(x + 14, y);
      k.lineTo(x, y + 14);
      k.lineTo(x - 14, y);
      k.closePath();
      k.fill();
      k.strokeStyle = 'rgba(60,40,4,.7)';
      k.lineWidth = 1.5;
      k.stroke();
    }
    k.restore();
  }
  // O que muda em cada material: o fundo, a cor das letras e dos filetes da moldura.
  const MOLDURAS = {
    linho: { pintar: tecidoDeLinho, letra: '#3b3120', filete: 'rgba(59,49,32,.4)', luz: 'rgba(255,250,236,.55)', janela: 'rgba(43,34,18,.85)', enfeite: 'traco' },
    bronze: { pintar: (k, w, h, r) => folhaDeMetal(k, w, h, r, METAIS.bronze, { escuro: '60,30,8', claro: '255,236,210', batido: true, escovado: false }),
      letra: '#2a1405', filete: 'rgba(50,24,4,.55)', luz: 'rgba(255,232,200,.5)', janela: 'rgba(42,20,4,.8)', enfeite: 'traco' },
    prata: { pintar: (k, w, h, r) => folhaDeMetal(k, w, h, r, METAIS.prata, { escuro: '30,36,48', claro: '255,255,255', guilloche: true }),
      letra: '#1d222b', filete: 'rgba(30,36,48,.5)', luz: 'rgba(255,255,255,.65)', janela: 'rgba(24,28,36,.8)', enfeite: 'traco' },
    ouro: { pintar: (k, w, h, r) => folhaDeMetal(k, w, h, r, METAIS.ouro), letra: '#2a1d04', filete: 'rgba(70,46,6,.55)', luz: 'rgba(255,248,214,.5)',
      janela: 'rgba(60,40,4,.75)', enfeite: 'estrela', papel: '#b8862a' },
    gloria: { cheia: true, letra: '#f6e7b8', filete: 'rgba(255,233,168,.6)', luz: 'rgba(255,255,255,.5)', janela: 'rgba(110,82,20,.7)', enfeite: 'estrela', papel: '#c9a548' },
  };
  // As medidas da carta (em 1000 x 1400): a janela da ilustração e o papel do texto. O CSS do
  // brilho (cartas.css) usa as mesmas, em porcentagem, para deixar o texto sempre fora dele.
  // A ilustração é desenhada em 888 x 846 e entra cortada em cima e embaixo (ILU_CORTE).
  const JX = 56;
  const JY = 118;
  const JW = CW - 112;
  const JH = 800;
  const ILU_H = 846;
  const ILU_CORTE = (ILU_H - JH) / 2;
  const PY = JY + JH + 16;
  const PH = CH - 56 - PY;
  function desenharIlustracao(carta) {
    const ilu = tela(JW, ILU_H);
    const ki = ilu.getContext('2d');
    (DESENHOS[carta.desenho] || desenhoDavi)(ki, JW, ILU_H);
    grao(ki, JW, ILU_H, 16, 5000 + carta.numero);
    return ilu;
  }
  // A arte da glória, cheia: a ilustração cobre a carta de lado a lado até o papel, e embaixo
  // dele continua escurecendo.
  function arteCheia(k, ilu) {
    const esc = CW / JW;
    k.fillStyle = '#0f0f0c';
    k.fillRect(0, 0, CW, CH);
    k.imageSmoothingQuality = 'high';
    const alto = ILU_H * esc;
    k.drawImage(ilu, 0, 0, CW, alto);
    k.drawImage(ilu, 0, ILU_H - 2, JW, 2, 0, alto - 1, CW, CH - alto + 1);
    const g = k.createLinearGradient(0, alto - 120, 0, CH);
    g.addColorStop(0, 'rgba(12,12,9,0)');
    g.addColorStop(0.4, 'rgba(12,12,9,.75)');
    g.addColorStop(1, 'rgba(12,12,9,.95)');
    k.fillStyle = g;
    k.fillRect(0, alto - 120, CW, CH - alto + 120);
  }
  function desenharCarta(c, carta) {
    const k = c.getContext('2d');
    const s = c.width / CW;
    k.save();
    k.setTransform(s, 0, 0, s, 0, 0);
    const r = sorteio(9000 + carta.id.length * 97 + carta.numero);
    const rar = raridadeDe(carta);
    const R = RARIDADES[rar];
    const M = MOLDURAS[rar];
    const ilu = desenharIlustracao(carta);
    retRedondo(k, 0, 0, CW, CH, 46);
    k.save();
    k.clip();
    if (M.cheia) {
      arteCheia(k, ilu);
      filetesDeOuro(k, CW, CH);
    } else {
      M.pintar(k, CW, CH, r);
      k.lineWidth = 2;
      k.strokeStyle = M.filete;
      retRedondo(k, 20, 20, CW - 40, CH - 40, 30);
      k.stroke();
      k.strokeStyle = M.luz;
      retRedondo(k, 23, 23, CW - 46, CH - 46, 28);
      k.stroke();
    }
    // o álbum e o número, no alto (na arte cheia, numa plaqueta escura, para ler sobre qualquer arte)
    const rotulo = carta.album.toUpperCase() + '  ·  ' + carta.numero + '/' + carta.total;
    k.font = oswald(32, 600);
    try { k.letterSpacing = '4.5px'; } catch (e) { /* idem */ }
    const wr = k.measureText(rotulo).width;
    try { k.letterSpacing = '0px'; } catch (e) { /* idem */ }
    if (M.cheia) {
      k.save();
      k.filter = 'blur(10px)';
      k.fillStyle = 'rgba(10,10,8,.55)';
      retRedondo(k, CW / 2 - wr / 2 - 70, 48, wr + 140, 52, 26);
      k.fill();
      k.restore();
      k.fillStyle = 'rgba(14,13,10,.6)';
      retRedondo(k, CW / 2 - wr / 2 - 60, 50, wr + 120, 48, 24);
      k.fill();
      k.strokeStyle = 'rgba(255,233,168,.55)';
      k.lineWidth = 1.5;
      k.stroke();
    }
    escrever(k, rotulo, CW / 2, 86, oswald(32, 600), M.letra, { alinhar: 'center', espaco: 4.5 });
    if (M.enfeite === 'estrela') {
      estrelinha(k, CW / 2 - wr / 2 - 30, 74, 12, M.letra);
      estrelinha(k, CW / 2 + wr / 2 + 30, 74, 12, M.letra);
    } else {
      k.fillStyle = M.filete;
      for (const lado of [-1, 1]) k.fillRect(CW / 2 + lado * (wr / 2 + 26) - (lado < 0 ? 40 : 0), 73, 40, 2);
    }
    if (!M.cheia) {
      // a janela da ilustração, rebaixada na moldura
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
      k.drawImage(ilu, 0, ILU_CORTE, JW, JH, JX, JY, JW, JH);
      k.restore();
      k.lineWidth = 3;
      k.strokeStyle = M.janela;
      retRedondo(k, JX, JY, JW, JH, 22);
      k.stroke();
      k.lineWidth = 1.5;
      k.strokeStyle = M.luz;
      retRedondo(k, JX - 4, JY - 4, JW + 8, JH + 8, 25);
      k.stroke();
    }
    // o papel do texto
    k.save();
    k.filter = 'blur(6px)';
    k.fillStyle = 'rgba(0,0,0,.3)';
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
    // o texto: título 64, "Você sabia?" 28, a frase 44, o pé 32
    const x0 = JX + 44;
    const larg = JW - 88;
    let tT = 64;
    k.font = literata(tT);
    while (k.measureText(carta.titulo).width > larg && tT > 48) { tT -= 2; k.font = literata(tT); }
    escrever(k, carta.titulo, x0, PY + 76, literata(tT), COR.tinta, { espaco: -0.5 });
    escrever(k, 'VOCÊ SABIA?', x0, PY + 124, oswald(28, 600), COR.salviaEscura, { espaco: 4 });
    let tS = 44;
    let linhas = quebrar(k, carta.sabia, manrope(tS, 600), larg);
    while (linhas.length > 3 && tS > 38) { tS -= 2; linhas = quebrar(k, carta.sabia, manrope(tS, 600), larg); }
    linhas.slice(0, 3).forEach((l, i) => escrever(k, l, x0, PY + 178 + i * (tS + 9), manrope(tS, 600), '#2b2c25'));
    // o pé: a referência e a raridade (ícone e nome, nunca só a cor)
    const yPe = PY + PH - 32;
    k.fillStyle = 'rgba(35,36,30,.18)';
    k.fillRect(x0, yPe - 54, larg, 2);
    escrever(k, carta.ref.toUpperCase(), x0, yPe, oswald(32, 600), '#45463c', { espaco: 3 });
    k.font = oswald(32, 600);
    try { k.letterSpacing = '3.5px'; } catch (e) { /* idem */ }
    const wn = k.measureText(R.nome.toUpperCase()).width;
    try { k.letterSpacing = '0px'; } catch (e) { /* idem */ }
    escrever(k, R.nome.toUpperCase(), x0 + larg, yPe, oswald(32, 600), R.tinta, { alinhar: 'right', espaco: 3.5 });
    iconeCanvas(k, rar, x0 + larg - wn - 52, yPe - 37, 44, R.tinta, { traco: 1.7, cheio: 0.25 });
    k.restore();
    // o relevo da borda de fora
    k.lineWidth = 3;
    k.strokeStyle = 'rgba(0,0,0,.45)';
    retRedondo(k, 1.5, 1.5, CW - 3, CH - 3, 45);
    k.stroke();
    k.restore();
    return c;
  }
  // O verso: o desenho aprovado (o campo escuro com as curvas de nível, o medalhão com o anel
  // fino e o símbolo creme) com a moldura no material da raridade e o anel na cor dela.
  const VERSOS = {
    linho: { anel: '#e8dcc4' },
    bronze: { anel: '#d39457' },
    prata: { anel: '#dfe4ec' },
    ouro: { anel: '#ffc44d' },
    gloria: { anel: '#ffe9a8', duplo: true },
  };
  const MARGEM_VERSO = 30;
  function desenharVerso(c, raridade = 'linho') {
    const rar = RARIDADES[raridade] ? raridade : 'linho';
    const M = MOLDURAS[rar];
    const V = VERSOS[rar];
    const k = c.getContext('2d');
    const s = c.width / CW;
    k.save();
    k.setTransform(s, 0, 0, s, 0, 0);
    const r = sorteio(777);
    retRedondo(k, 0, 0, CW, CH, 46);
    k.clip();
    // a moldura no material
    if (M.cheia) {
      const g = k.createLinearGradient(0, 0, CW, CH);
      [[0, '#e9d39a'], [0.25, '#fffaf0'], [0.5, '#f1dfae'], [0.75, '#fffdf6'], [1, '#c9a548']].forEach(([p, cor]) => g.addColorStop(p, cor));
      k.fillStyle = g;
      k.fillRect(0, 0, CW, CH);
      k.strokeStyle = '#b8862a';
      k.lineWidth = 3;
      retRedondo(k, 12, 12, CW - 24, CH - 24, 36);
      k.stroke();
    } else M.pintar(k, CW, CH, r);
    // o campo escuro
    const m = MARGEM_VERSO;
    k.save();
    retRedondo(k, m, m, CW - 2 * m, CH - 2 * m, 30);
    k.clip();
    k.fillStyle = '#151612';
    k.fillRect(0, 0, CW, CH);
    brilho(k, CW / 2, CH / 2, 760, 'rgba(200,218,140,.12)');
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
    k.strokeStyle = V.anel;
    k.lineWidth = 4;
    k.stroke();
    if (V.duplo) {
      k.lineWidth = 1.5;
      k.beginPath();
      k.arc(CW / 2, CH / 2, 140, 0, Math.PI * 2);
      k.stroke();
    }
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
    retRedondo(k, m + 14, m + 14, CW - 2 * m - 28, CH - 2 * m - 28, 22);
    k.stroke();
    k.restore();
    k.lineWidth = 2.5;
    k.strokeStyle = 'rgba(0,0,0,.6)';
    retRedondo(k, m, m, CW - 2 * m, CH - 2 * m, 30);
    k.stroke();
    k.lineWidth = 3;
    k.strokeStyle = 'rgba(0,0,0,.45)';
    retRedondo(k, 1.5, 1.5, CW - 3, CH - 3, 45);
    k.stroke();
    k.restore();
    return c;
  }
  // A miniatura do álbum: só a moldura, a arte e o ícone da raridade, sem texto.
  function desenharMiniatura(c, carta) {
    const k = c.getContext('2d');
    const s = c.width / CW;
    k.save();
    k.setTransform(s, 0, 0, s, 0, 0);
    const rar = raridadeDe(carta);
    const R = RARIDADES[rar];
    const M = MOLDURAS[rar];
    const r = sorteio(9100 + carta.numero);
    const ilu = desenharIlustracao(carta);
    retRedondo(k, 0, 0, CW, CH, 46);
    k.clip();
    const ax = 56;
    const ay = 56;
    const aw = CW - 112;
    const ah = 960;
    // a arte cortada para caber na janela alta
    const fonteW = ILU_H * aw / ah;
    if (M.cheia) {
      k.fillStyle = '#0f0f0c';
      k.fillRect(0, 0, CW, CH);
      k.drawImage(ilu, (JW - JW * 0.8) / 2, 0, JW * 0.8, ILU_H, -20, 0, CW + 40, CH * 0.88);
      const g = k.createLinearGradient(0, CH * 0.62, 0, CH);
      g.addColorStop(0, 'rgba(12,12,9,0)');
      g.addColorStop(1, 'rgba(12,12,9,.95)');
      k.fillStyle = g;
      k.fillRect(0, CH * 0.62, CW, CH * 0.38);
      filetesDeOuro(k, CW, CH);
    } else {
      M.pintar(k, CW, CH, r);
      k.save();
      retRedondo(k, ax, ay, aw, ah, 26);
      k.clip();
      k.drawImage(ilu, (JW - fonteW) / 2, 0, fonteW, ILU_H, ax, ay, aw, ah);
      k.restore();
      k.lineWidth = 4;
      k.strokeStyle = M.janela;
      retRedondo(k, ax, ay, aw, ah, 26);
      k.stroke();
    }
    // o ícone num selo, embaixo
    const cy = ay + ah + (CH - ay - ah) / 2;
    k.fillStyle = M.cheia ? 'rgba(14,13,10,.7)' : COR.papel;
    k.beginPath();
    k.arc(CW / 2, cy, 92, 0, Math.PI * 2);
    k.fill();
    k.lineWidth = 5;
    k.strokeStyle = M.cheia ? '#ffe9a8' : M.janela;
    k.stroke();
    iconeCanvas(k, rar, CW / 2 - 62, cy - 62, 124, M.cheia ? '#ffe9a8' : R.tinta, { traco: 1.8, cheio: 0.25 });
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
    const c = desenharMiniatura(tela(px, Math.round(px * 1.4)), carta);
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

  CC.cartas = { desenharMiniatura, lista: CARTAS, desenhos: DESENHOS, RARIDADES, iconeSvg, iconeCanvasTeste: iconeCanvas, cartaViva, botaoVirar, miniatura, revelacao,
    cartaDoBau, desenharCarta, desenharVerso, revelar, storyDaCarta, papelDeParede,
    tela: () => tela(CW, CH), CW, CH };
})(window.CC);
