/* As cartas colecionáveis do baú (amostra para o dono aprovar: o estilo em 2026-10-11, as
   raridades em 2026-10-22). Cada baú da Trilha revela uma carta ilustrada: a moldura com o
   álbum e o número, a ilustração, o título, um "Você sabia?" de uma linha, a referência e a
   raridade. Os desenhos são em canvas, em gravura sobre papel com grão, sem figura humana
   (gente só como objeto ou cena). A raridade (linho, bronze, prata, ouro, glória) é o
   material da moldura e do verso, sempre com nome e ícone; o brilho que muda com o ângulo é
   do cartas.css, por cima do canvas (cartaViva). Nada de imagem: tudo desenhado por código.
   Pedida só quando a tela do baú abre: o build a publica como cartas.<resumo>.js, com o
   estilo (cartas.css) no lugar da marca abaixo, e o service worker a guarda no cache
   "caminho-telas". Tudo desenhado com semente fixa: a mesma carta sai sempre igual.

   A INTERFACE (CC.cartas), estável para o sistema de cartas (sorteio, estado, álbum):
   - revelar(el, carta, opts) -> Promise. A entrada única da revelação inteira, do baú fechado
     à carta aberta, dentro de el. opts:
       raridade  a raridade que sai (senão carta.raridade); a luz do baú é sempre a dela;
       legenda   o texto do fim, ex.: "Nova! Você tem 9 de 13 em Objetos" ("Nova!" em destaque);
       abrir     'toque' (padrão: o baú espera o toque) ou 'ja' (abre sozinho);
       largura   a largura da carta em px (padrão: 320 a 340 no celular);
       aoLer     se vier, mostra "Ler a história" no fim e chama aoLer(carta).
     A Promise resolve no fim (ou ao Pular) com { pulou, carta (a carta viva), el }. Ela traz
     junto .abrir(), .pular(), .virar(), .fase() e .el, para quem quiser comandar.
   - desenharCarta(carta, { largura, raridade, semTexto, canvas }) -> canvas. largura é a do
     canvas em px (padrão 1000; a altura é 1,4 vez). semTexto: a miniatura do álbum (moldura,
     arte e o selo da raridade, sem nenhuma letra). raridade troca o acabamento.
   - desenharVerso({ largura, raridade, semTexto, canvas }) -> canvas. semTexto tira o nome do
     pé (fica o símbolo).
   - temArte(id) -> true se a carta de id tem desenho; os desenhos vão pela carta.id. Sem
     desenho, desenharCarta sai com uma gravura neutra (o sistema pode preferir a silhueta).
   - cartaViva(carta, { largura, verso, interativa }) -> { el, inclinar, soltar, virar, ... }:
     a carta que inclina com o dedo e vira, com o brilho da raridade.
   - miniatura(carta, largura) -> canvas da miniatura já no tamanho da tela (sem texto).
   - storyDaCarta(carta) -> canvas 1080x1920; papelDeParede({ ref, texto }) -> canvas 1080x2340.
   - RARIDADES (nome, ícone, cores), iconeSvg(raridade), lista (as cartas de amostra),
     cartaDoBau(numero) (a carta fixa da amostra, até o sorteio vir do sistema).
   carta = { id, album, numero, total, titulo, sabia, ref, raridade }. */
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
      sabia: 'Davi apanhou cinco pedras lisas num riacho e usou só uma.', ref: '1 Samuel 17.40-50', raridade: 'linho' },
    { id: 'poco-jaco', album: 'Lugares', numero: 3, total: 13, titulo: 'O poço de Jacó',
      sabia: 'Jesus chegou cansado a este poço por volta do meio-dia e pediu água.', ref: 'João 4.6-7', raridade: 'bronze' },
    { id: 'azeite-viuva', album: 'Objetos', numero: 7, total: 13, titulo: 'O azeite da viúva',
      sabia: 'O azeite só parou de correr quando não sobrou nenhuma vasilha vazia.', ref: '2 Reis 4.1-7', raridade: 'prata' },
    { id: 'arca-alianca', album: 'Objetos', numero: 1, total: 13, titulo: 'A Arca da Aliança',
      sabia: 'Era de madeira de acácia, coberta de ouro puro por dentro e por fora.', ref: 'Êxodo 25.10-22', raridade: 'ouro' },
    { id: 'tumulo-vazio', album: 'Milagres', numero: 13, total: 13, titulo: 'O túmulo vazio',
      sabia: 'O linho ficou ali, e o pano da cabeça, dobrado num lugar à parte.', ref: 'João 20.1-8', raridade: 'gloria' },
    { id: 'mar-vermelho', album: 'Milagres', numero: 1, total: 13, titulo: 'O mar aberto',
      sabia: 'Um vento forte soprou a noite inteira e deixou o fundo do mar seco.', ref: 'Êxodo 14.21-22', raridade: 'bronze' },
  ];

  // ---------- as raridades: os materiais do tabernáculo (Êx 25.3-4) ----------
  // Cada uma tem nome, ícone e cor: a raridade nunca é dita só pela cor. "tinta" é a cor do
  // nome no papel da carta (contraste AA sobre o creme); "luz" é a cor da luz do baú, uma para
  // cada raridade (o linho morno, o bronze cobre, a prata fria, o ouro dourado, a glória branca
  // e perolada), para a luz nunca enganar.
  const RARIDADES = {
    linho: { nome: 'Linho', icone: 'linho', cor: '#E8DCC4', cor2: '#BFAE8E', tinta: '#5f5136', luz: '#e8c48e', ordem: 0,
      brilho: 'Fosco. Inclina pouco, com um reflexo branco leve.' },
    bronze: { nome: 'Bronze', icone: 'bacia', cor: '#B07A45', cor2: '#8C5A2B', tinta: '#6e3d14', luz: '#ec8548', ordem: 1,
      brilho: 'Metal batido na moldura, que acende com o ângulo.' },
    prata: { nome: 'Prata', icone: 'trombeta', cor: '#C9CED6', cor2: '#8E96A3', tinta: '#454e5c', luz: '#9fc3ff', ordem: 2,
      brilho: 'Holográfico frio (prata, azul, lilás) só na moldura.' },
    ouro: { nome: 'Ouro', icone: 'candelabro', cor: '#D4A62A', cor2: '#A87B12', tinta: '#6f4f08', luz: '#ffb92e', ordem: 3,
      brilho: 'Holográfico dourado na ilustração, com purpurina.' },
    gloria: { nome: 'Glória', icone: 'nuvem', cor: '#FFF4D6', cor2: '#E9D9A6', tinta: '#5e4a14', luz: '#fffaf0', ordem: 4,
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
    // duas trombetas de prata batida (Nm 10.2), longas e retas, cruzadas, com as campânulas
    // para cima: o bocal em taça, o tubo fino, um anel e a campânula que abre em curva até a
    // boca (a elipse aberta), o que faz ler "trombeta" e não martelo, mesmo pequeno
    trombeta: { partes: [
      ...[-58, -122].flatMap((g) => [
        ['s', 'M2.6 12H13', g],
        ['s', 'M.9 11.1v1.8', g],
        ['s', 'M6.6 11.2v1.6', g],
        ['sf', 'M12.6 11.5C16.8 11.4 19.6 10.6 22 8.6V15.4C19.6 13.4 16.8 12.6 12.6 12.5z', g],
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
    // a nuvem da glória pousada sobre a tenda do tabernáculo (Êx 40.34): a tenda de pano, de
    // lados caídos até o chão, com a porta aberta, a ponta da estaca no alto, as cordas e as
    // estacas; a nuvem em traço, como os outros ícones
    nuvem: { partes: [
      ['s', 'M6.6 9.4h10.8a2.5 2.5 0 0 0 .2-5 3.8 3.8 0 0 0-7.2-.9A2.9 2.9 0 0 0 6.6 9.4z'],
      ['s', 'M12 11.9V13.2'],
      ['sf', 'M12 13.2L3.4 21.2H20.6z'],
      ['f', 'M12 15.8L9.7 21.2H14.3z'],
      ['s', 'M1.4 21.2H3.4M20.6 21.2H22.6M3.4 21.2L1.8 19.4M20.6 21.2L22.2 19.4'],
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
  // A moldura como forma: o retângulo da carta com um buraco redondo (para clip evenodd).
  function vazado(x, y, w, h, raio) {
    const p = new Path2D();
    p.rect(-10, -10, 2000, 3000);
    p.moveTo(x + raio, y);
    p.arcTo(x + w, y, x + w, y + h, raio);
    p.arcTo(x + w, y + h, x, y + h, raio);
    p.arcTo(x, y + h, x, y, raio);
    p.arcTo(x, y, x + w, y, raio);
    p.closePath();
    return p;
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
  function redondo(x, y, w, h, raio) {
    const p = new Path2D();
    p.moveTo(x + raio, y);
    p.arcTo(x + w, y, x + w, y + h, raio);
    p.arcTo(x + w, y + h, x, y + h, raio);
    p.arcTo(x, y + h, x, y, raio);
    p.arcTo(x, y, x + w, y, raio);
    p.closePath();
    return p;
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
  function pedraGravada(k, r, x, y, rx, ry, giro, { quente = false, obj } = {}) {
    const p = seixo(r, x, y, rx, ry, giro, 0.06);
    marcar(k, obj, p);
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
  function desenhoDavi(k, W, H, obj) {
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
      const fio = new Path2D();
      pts.forEach((p, i) => (i ? fio.lineTo(p[0], p[1]) : fio.moveTo(p[0], p[1])));
      marcar(k, obj, fio, larg + 6);
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
    marcar(k, obj, bolsa);
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
    pedraGravada(k, r, bx + 4, by - 2, 62, 46, -0.12, { quente: true, obj });
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
        pedraGravada(k, r, x, fila, rx, ry, giro, { obj });
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
  // Um querubim de ouro ajoelhado, de perfil, de rosto baixo para a tampa (Êx 25.20): uma
  // escultura em gravura, como a arca: a veste longa em pregas (a hachura aperta no fundo de
  // cada prega), a faixa na cintura, o pé de quem ajoelha aparecendo atrás, a manga com as
  // mãos juntas e a cabeça de perfil, inclinada, com o cabelo em mechas. "lado" 1 olha para a
  // direita. Desenha a asa de trás antes do corpo e a da frente depois.
  function querubim(k, x0, y0, esc, lado, luzEm, obj) {
    const T = (x, y) => [x0 + lado * x * esc, y0 + y * esc];
    const caminho = (lista) => {
      const p = new Path2D();
      p.moveTo(...T(...lista[0]));
      for (let i = 1; i < lista.length; i += 3) p.bezierCurveTo(...T(...lista[i]), ...T(...lista[i + 1]), ...T(...lista[i + 2]));
      p.closePath();
      return p;
    };
    const luzLocal = (x, y) => luzEm(T(x, y));
    // a forma em ouro gravado: o tom (mais claro do lado da luz, que vem da frente) e as
    // linhas; "pregas" faz a sombra subir e descer em faixas, como pano dobrado
    const ouroGravado = (forma, cx, cy, raio, ang, pregas = 0) => {
      const [gx0, gy0] = T(-64, 0);
      const [gx1, gy1] = T(60, 0);
      const g = k.createLinearGradient(gx0, gy0, gx1, gy1);
      g.addColorStop(0, tomDeOuro(0.2));
      g.addColorStop(0.6, tomDeOuro(0.42 + luzLocal(cx, cy) * 0.28));
      g.addColorStop(1, tomDeOuro(0.66 + luzLocal(cx, cy) * 0.3));
      k.fillStyle = g;
      k.fill(forma);
      if (obj) obj.fill(forma);
      const [ccx, ccy] = T(cx, cy);
      gravar(k, forma, ccx, ccy, raio * esc, ang, 3.3, 1.9, (x, y) => {
        const u = (x - x0) * lado / esc;
        const base = 0.8 - (u + 64) / 124 * 0.62 - luzLocal(cx, cy) * 0.22;
        return base + (pregas ? Math.max(0, Math.sin(u * pregas + (y - y0) / esc * 0.02)) * 0.42 : 0);
      }, TINTA_OURO, 0.15);
      k.strokeStyle = TINTA_OURO;
      k.lineWidth = 2.2;
      k.stroke(forma);
    };
    // a asa de trás: mais alta, mais escura
    const borda = (dx, dy) => [T(-26 + dx, -134 + dy), T(-62 + dx, -290 + dy), T(40 + dx, -350 + dy), T(124 + dx, -292 + dy)];
    asaOrdenada(k, borda(16, -26), luzEm, { escurecer: 0.45, escala: esc * 0.95, lado, obj });
    // o pé de trás, a sola virada para fora (de quem está de joelhos)
    const pe = caminho([[-58, -2], [-70, -4], [-84, -6], [-86, -14], [-84, -22], [-72, -22], [-60, -18], [-58, -12], [-58, -6], [-58, -2]]);
    ouroGravado(pe, -72, -12, 20, 0.2);
    const corpo = caminho([[-56, 0], [-62, -10], [-66, -28], [-64, -40], [-62, -60], [-48, -84], [-44, -110], [-40, -130], [-32, -144], [-22, -150],
      [-12, -158], [0, -156], [6, -152], [16, -146], [26, -134], [24, -120], [22, -106], [20, -94], [22, -86], [34, -78], [52, -66], [62, -50],
      [70, -36], [70, -12], [66, 0], [30, 4], [-20, 4], [-56, 0]]);
    ouroGravado(corpo, 0, -76, 124, Math.PI / 2 + lado * 0.12, 0.42);
    // as pregas: do ombro e da cintura até a barra, com o filete de luz ao lado de cada uma
    k.save();
    k.clip(corpo);
    k.lineCap = 'round';
    const prega = (pts, larg = 2) => {
      k.strokeStyle = 'rgba(42,28,5,.85)';
      k.lineWidth = larg;
      k.beginPath();
      k.moveTo(...T(...pts[0]));
      k.bezierCurveTo(...T(...pts[1]), ...T(...pts[2]), ...T(...pts[3]));
      k.stroke();
      k.strokeStyle = 'rgba(255,240,200,.55)';
      k.lineWidth = 1.1;
      k.beginPath();
      k.moveTo(...T(pts[0][0] + 3, pts[0][1]));
      k.bezierCurveTo(...T(pts[1][0] + 3, pts[1][1]), ...T(pts[2][0] + 3, pts[2][1]), ...T(pts[3][0] + 3, pts[3][1]));
      k.stroke();
    };
    prega([[-36, -136], [-48, -100], [-58, -50], [-60, -6]]);
    prega([[-22, -140], [-30, -100], [-34, -50], [-40, 0]]);
    prega([[-8, -142], [-12, -110], [-14, -60], [-18, 2]]);
    prega([[6, -84], [4, -56], [2, -30], [4, 2]]);
    prega([[22, -82], [34, -62], [40, -34], [40, 2]], 1.8);
    prega([[36, -74], [52, -56], [58, -30], [56, 2]], 1.8);
    // a barra da veste, ondulada, no chão
    k.strokeStyle = 'rgba(42,28,5,.9)';
    k.lineWidth = 2;
    k.beginPath();
    for (let x = -60; x <= 68; x += 4) { const q = T(x, -6 + Math.sin(x * 0.28) * 3); if (x === -60) k.moveTo(...q); else k.lineTo(...q); }
    k.stroke();
    k.restore();
    // a faixa da cintura
    const faixa = caminho([[-46, -96], [-20, -102], [6, -102], [24, -98], [25, -92], [24, -86], [22, -82], [6, -88], [-20, -88], [-46, -96]]);
    ouroGravado(faixa, -10, -92, 40, 0.1);
    // a manga e as mãos juntas, estendidas para a tampa
    const braco = caminho([[-12, -146], [6, -132], [26, -118], [44, -112], [54, -110], [62, -108], [62, -98], [50, -92], [32, -94], [12, -104], [-8, -120], [-16, -134], [-12, -146]]);
    ouroGravado(braco, 22, -118, 52, 0.35, 0.6);
    const maos = caminho([[58, -112], [66, -114], [74, -110], [76, -104], [76, -98], [70, -94], [62, -96], [58, -100], [58, -106], [58, -112]]);
    ouroGravado(maos, 66, -104, 16, 1.2);
    k.strokeStyle = 'rgba(42,28,5,.8)';
    k.lineWidth = 1.2;
    k.beginPath();
    k.moveTo(...T(60, -104));
    k.lineTo(...T(75, -103));
    k.stroke();
    // a cabeça de perfil, inclinada para a tampa: o crânio, a testa, o nariz, o queixo
    const giro = 0.6;
    const H = (x, y) => {
      const c = Math.cos(giro);
      const s = Math.sin(giro);
      return T(18 + x * c - y * s, -170 + x * s + y * c);
    };
    const perfil = [[-20, -2], [-21, -16], [-12, -26], [2, -26], [14, -24], [20, -16], [21, -8], [22, -4], [26, 1], [22, 3], [21, 6],
      [22, 9], [20, 11], [19, 15], [15, 19], [8, 20], [2, 18], [-4, 22], [-10, 24], [-14, 16], [-18, 10]];
    const cabeca = new Path2D();
    cabeca.moveTo(...H(...perfil[0]));
    for (let i = 1; i < perfil.length; i++) cabeca.lineTo(...H(...perfil[i]));
    cabeca.closePath();
    const pescoco = caminho([[-8, -148], [-2, -158], [8, -164], [14, -160], [16, -154], [10, -146], [-8, -148]]);
    ouroGravado(pescoco, 4, -152, 16, 0.4);
    ouroGravado(cabeca, 16, -172, 30, giro + Math.PI / 2);
    // o cabelo: a massa atrás e em cima, em mechas curvas; o rosto fica liso
    k.save();
    k.clip(cabeca);
    const cab = new Path2D();
    cab.moveTo(...H(-22, 24));
    cab.lineTo(...H(-24, -10));
    cab.lineTo(...H(-10, -28));
    cab.lineTo(...H(8, -28));
    cab.lineTo(...H(16, -20));
    cab.quadraticCurveTo(...H(2, -14), ...H(-2, 2));
    cab.quadraticCurveTo(...H(-4, 14), ...H(-6, 24));
    cab.closePath();
    k.fillStyle = tomDeOuro(0.3, 0.92);
    k.fill(cab);
    k.strokeStyle = 'rgba(42,28,5,.85)';
    k.lineCap = 'round';
    k.lineWidth = 1.3;
    for (let i = 0; i < 8; i++) {
      k.beginPath();
      k.moveTo(...H(12 - i * 4, -24 + i));
      k.quadraticCurveTo(...H(-2 - i * 3, -10), ...H(-8 - i * 2, 14 + i));
      k.stroke();
    }
    k.restore();
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 2;
    k.stroke(cabeca);
    // a sobrancelha e o olho baixo, só um traço
    k.lineWidth = 1.4;
    k.beginPath();
    k.moveTo(...H(10, -10));
    k.quadraticCurveTo(...H(15, -12), ...H(19, -9));
    k.stroke();
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
    // a perspectiva é leve (foco longo): as quinas de cima e de baixo da frente correm quase
    // paralelas e se encontram, de leve, no mesmo ponto de fuga à esquerda
    const P = camera(W / 2 + 10, 690, 1.42, -0.5, 0.3, 4000);
    const chao = Math.round(P([0, -16, -330])[1]);
    // a luz pousa sobre a tampa, no meio dos dois querubins (Êx 25.22), não nas mãos deles
    const centro = P([0, 188, 0]);
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
    // as duas varas do mesmo tamanho, saindo o mesmo tanto dos dois lados
    const VARA = 290;
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
    vara(-VZ, -VARA, VARA, 7.5);
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
    // o painel rebaixado da frente, liso (Êx 25 só fala da coroa de ouro em volta)
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
    vara(VZ, -VARA, VARA, 7.5);
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
      // só para cima e para os lados: a luz sai de cima da tampa
      const a = Math.PI * (1.04 + (i / 47) * 0.92) + (r() - 0.5) * 0.05;
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
    // o clarão deitado sobre a tampa (mais largo que alto) e o miolo, perto dela
    k.save();
    k.translate(fonte[0], fonte[1] + 14);
    k.scale(1, 0.42);
    brilho(k, 0, 0, 190, 'rgba(255,214,130,.55)', 'screen');
    brilho(k, 0, 0, 80, 'rgba(255,246,220,.8)', 'screen');
    k.restore();
    brilho(k, fonte[0], fonte[1] + 6, 26, 'rgba(255,250,232,.9)', 'screen');
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
    // dois tufos ralos de capim seco no alto da rocha
    capim(k, r, 452, 133, 22, 6, 'rgba(43,33,18,.75)');
    capim(k, r, 690, 128, 18, 5, 'rgba(43,33,18,.75)');
    // a boca da gruta: um vão cavado na rocha, de beirada irregular e arredondada, sem batente
    // a porta mais à esquerda e a pedra mais para dentro, com ar dos dois lados: nem a moldura
    // da carta nem o recorte da arte cheia (glória) cortam a pedra
    const bx = 292;
    const bw = 190;
    const bBase = 630;
    // a pedra redonda (desenhada no fim, de pé no sulco, à direita da porta)
    const pcx = 648;
    const pR = 158;
    const pcy = 620 - pR;
    const bontos = [];
    for (let i = 0; i <= 22; i++) {
      const a = Math.PI - (i / 22) * Math.PI;
      const ruido = (r() - 0.5) * 22 + Math.sin(i * 1.7) * 6;
      bontos.push([bx + Math.cos(a) * (bw + ruido), bBase - Math.sin(a) * (360 + ruido * 0.8)]);
    }
    bontos.push([bx + bw, bBase + 4], [bx - bw, bBase + 4]);
    const porta = contornoRocha(r, bontos, 6);
    porta.closePath();
    // a sombra da beirada na rocha, fora (para baixo e à direita)
    k.save();
    k.filter = 'blur(8px)';
    k.strokeStyle = 'rgba(43,33,18,.45)';
    k.lineWidth = 16;
    k.translate(6, 4);
    k.stroke(porta);
    k.restore();
    k.save();
    k.clip(porta);
    // dentro: a câmara funda, mais escura no alto e no meio, em hachura cruzada
    const gd = k.createRadialGradient(bx, bBase - 220, 40, bx, bBase - 120, 330);
    gd.addColorStop(0, '#120c05');
    gd.addColorStop(0.7, '#2a1d0f');
    gd.addColorStop(1, '#4a3820');
    k.fillStyle = gd;
    k.fillRect(bx - 230, bBase - 400, 460, 420);
    const dentro = new Path2D();
    dentro.rect(bx - 230, bBase - 400, 460, 420);
    gravar(k, dentro, bx, bBase - 190, 330, 0.75, 5, 2.2, (x, y) => 0.7 + (1 - Math.hypot(x - bx, y - bBase + 120) / 330) * 0.3, '#0a0703', 0);
    gravar(k, dentro, bx, bBase - 190, 330, -0.75, 5.5, 2, (x, y) => 0.5 + (1 - Math.hypot(x - bx, y - bBase + 120) / 330) * 0.5, '#0a0703', 0);
    // o fundo da gruta: uma parede curva, mais baixa e mais escura
    const fundoG = new Path2D();
    fundoG.ellipse(bx + 10, bBase - 70, 160, 250, 0, Math.PI, 0);
    k.fillStyle = 'rgba(8,5,2,.45)';
    k.fill(fundoG);
    // a luz da manhã entra de viés e cai no banco
    const faixa = new Path2D();
    faixa.moveTo(bx - 260, bBase - 400);
    faixa.lineTo(bx - 60, bBase - 400);
    faixa.lineTo(bx + 240, bBase + 10);
    faixa.lineTo(bx - 10, bBase + 10);
    faixa.closePath();
    k.save();
    k.filter = 'blur(18px)';
    k.fillStyle = 'rgba(255,230,170,.4)';
    k.fill(faixa);
    k.restore();
    // o banco cavado na rocha, ao longo do fundo
    const bancoT = 500;
    const bancoF = 556;
    const banco = contornoRocha(r, [[bx - 210, bancoT + 4], [bx - 120, bancoT], [bx, bancoT - 2], [bx + 120, bancoT], [bx + 210, bancoT + 6], [bx + 210, bancoF], [bx - 210, bancoF]], 3);
    banco.closePath();
    k.fillStyle = '#8f7a52';
    k.fill(banco);
    gravar(k, banco, bx, (bancoT + bancoF) / 2, 230, 0, 4.2, 1.8, (x) => 0.3 + Math.abs(x - bx + 40) / 320, '#1d160a', 0);
    const tampo = contornoRocha(r, [[bx - 210, bancoT + 4], [bx - 180, bancoT - 26], [bx + 190, bancoT - 28], [bx + 210, bancoT + 6]], 2);
    tampo.closePath();
    k.fillStyle = '#c3ab78';
    k.fill(tampo);
    gravar(k, tampo, bx, bancoT - 12, 230, 0, 4, 1.1, (x) => 0.25 + Math.abs(x - bx + 40) / 420, '#1d160a', 0);
    k.strokeStyle = '#1d160a';
    k.lineWidth = 1.8;
    k.stroke(tampo);
    k.stroke(banco);
    // o lençol de linho: um só pano comprido, deitado e vazio, com uma ponta caída pela beirada
    const L0 = bx - 172;
    const ly = bancoT - 16;
    const lencol = new Path2D();
    lencol.moveTo(L0, ly + 12);
    lencol.bezierCurveTo(L0 + 2, ly - 4, L0 + 6, ly - 12, L0 + 24, ly - 13);
    lencol.bezierCurveTo(L0 + 72, ly - 18, L0 + 120, ly - 9, L0 + 171, ly - 16);
    lencol.bezierCurveTo(L0 + 189, ly - 18, L0 + 202, ly - 12, L0 + 203, ly);
    lencol.lineTo(L0 + 205, ly + 16);
    lencol.lineTo(L0 + 61, ly + 22);
    lencol.bezierCurveTo(L0 + 64, ly + 46, L0 + 59, ly + 66, L0 + 54, ly + 84);
    lencol.lineTo(L0 + 14, ly + 78);
    lencol.bezierCurveTo(L0 + 11, ly + 56, L0 + 6, ly + 36, L0 + 2, ly + 20);
    lencol.closePath();
    k.save();
    k.filter = 'blur(5px)';
    k.fillStyle = 'rgba(10,8,4,.75)';
    k.translate(7, 9);
    k.fill(lencol);
    k.restore();
    k.fillStyle = '#f8f0de';
    k.fill(lencol);
    if (obj) obj.fill(lencol);
    gravar(k, lencol, L0 + 102, ly + 30, 170, 0.02, 4, 1.3, (x, y) => (y - ly + 14) / 38 * 0.55 + (x < L0 + 62 && y > ly + 20 ? 0.25 : 0), '#4a3d24', 0);
    k.save();
    k.clip(lencol);
    k.strokeStyle = 'rgba(58,47,29,.85)';
    k.lineCap = 'round';
    k.lineWidth = 1.8;
    for (const yy of [ly - 6, ly + 3]) {
      k.beginPath();
      k.moveTo(L0 + 13, yy + 3);
      k.bezierCurveTo(L0 + 64, yy - 4, L0 + 128, yy + 4, L0 + 197, yy - 1);
      k.stroke();
    }
    for (const x of [L0 + 50, L0 + 83, L0 + 120, L0 + 157]) { k.beginPath(); k.moveTo(x, ly - 14); k.quadraticCurveTo(x + 7, ly, x + 3, ly + 16); k.stroke(); }
    k.beginPath();
    k.moveTo(L0 + 61, ly + 22);
    k.bezierCurveTo(L0 + 96, ly + 19, L0 + 160, ly + 17, L0 + 205, ly + 16);
    k.stroke();
    for (const x of [L0 + 24, L0 + 42]) { k.beginPath(); k.moveTo(x, ly + 24); k.quadraticCurveTo(x + 5, ly + 50, x + 1, ly + 80); k.stroke(); }
    k.restore();
    k.strokeStyle = '#2b2112';
    k.lineWidth = 2.2;
    k.stroke(lencol);
    // o pano da cabeça, dobrado, num lugar à parte (Jo 20.7)
    const D0 = bx + 60;
    const pano = new Path2D();
    pano.moveTo(D0, ly + 4);
    pano.lineTo(D0 + 8, ly - 14);
    pano.lineTo(D0 + 70, ly - 16);
    pano.lineTo(D0 + 76, ly + 2);
    pano.lineTo(D0 + 76, ly + 18);
    pano.lineTo(D0, ly + 19);
    pano.closePath();
    k.save();
    k.filter = 'blur(5px)';
    k.fillStyle = 'rgba(10,8,4,.75)';
    k.translate(6, 8);
    k.fill(pano);
    k.restore();
    k.fillStyle = '#f3e9d2';
    k.fill(pano);
    if (obj) obj.fill(pano);
    k.fillStyle = 'rgba(74,61,36,.35)';
    k.fillRect(D0, ly + 3, 76, 16);
    k.strokeStyle = '#2b2112';
    k.lineWidth = 2;
    k.stroke(pano);
    k.lineWidth = 1.3;
    k.beginPath();
    k.moveTo(D0, ly + 3); k.lineTo(D0 + 76, ly + 2);
    k.moveTo(D0 + 1, ly + 9); k.lineTo(D0 + 75, ly + 8.5);
    k.moveTo(D0 + 1, ly + 14); k.lineTo(D0 + 75, ly + 13.5);
    k.moveTo(D0 + 39, ly - 15); k.lineTo(D0 + 38, ly + 2);
    k.stroke();
    brilho(k, bx - 40, ly, 190, 'rgba(255,248,226,.32)', 'screen');
    k.restore();
    // a beirada cavada: a espessura da rocha por dentro do vão, de largura irregular, clara à
    // esquerda (do lado do sol) e na sombra à direita, gravada em linhas que entram no escuro
    const dentroBorda = [];
    for (let i = 0; i <= 22; i++) {
      const a = Math.PI - (i / 22) * Math.PI;
      const e = 16 + r() * 22 + (i > 14 ? 10 : 0);
      dentroBorda.push([bx + Math.cos(a) * (bw - e) + 4, bBase + 6 - Math.sin(a) * (360 - e * 1.3)]);
    }
    const bordaIn = contornoRocha(r, dentroBorda, 5);
    const aro = new Path2D();
    aro.addPath(porta);
    aro.addPath(bordaIn);
    k.save();
    k.clip(porta);
    k.save();
    k.clip(aro, 'evenodd');
    const gb = k.createLinearGradient(bx - 220, 0, bx + 220, 0);
    gb.addColorStop(0, '#eadbb4');
    gb.addColorStop(0.5, '#b49b6c');
    gb.addColorStop(1, '#6a5432');
    k.fillStyle = gb;
    k.fillRect(bx - 240, bBase - 400, 480, 420);
    for (let i = 0; i < 70; i++) {
      const a = Math.PI - (i / 69) * Math.PI;
      const x = bx + Math.cos(a) * (bw + 8);
      const y = bBase - Math.sin(a) * 370;
      const som = 0.3 + (Math.cos(a) + 1) / 2 * 0.0 + (1 - (Math.cos(a) + 1) / 2) * 0.0 + (x - bx) / 400;
      k.strokeStyle = 'rgba(43,33,18,' + Math.max(0.25, Math.min(0.9, 0.45 + som)).toFixed(2) + ')';
      k.lineWidth = 1 + Math.max(0, som) * 1.6;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x - Math.cos(a) * 48, y + Math.sin(a) * 60);
      k.stroke();
    }
    k.restore();
    k.strokeStyle = '#1d160a';
    k.lineWidth = 2.4;
    k.stroke(bordaIn);
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 3;
    k.stroke(porta);
    // o pé da rocha: uma beirada irregular (nada de tábua de lado a lado) e, só na frente da
    // porta e da pedra, o sulco raso cavado onde a pedra corre
    const sy = 624;
    const pe = onda(sorteio(4630), 4, 0.02);
    const yPe = (x) => sy + 10 + pe(x) * 5;
    const s0 = bx - bw - 16;
    const s1 = pcx + 150;
    const sulco = new Path2D();
    sulco.moveTo(s0, sy + 2);
    for (let x = s0; x <= s1; x += 12) sulco.lineTo(x, sy + 2 + pe(x * 1.7) * 1.5);
    sulco.lineTo(s1 + 8, sy + 8);
    for (let x = s1; x >= s0; x -= 12) sulco.lineTo(x, sy + 13 + pe(x * 2.3) * 1.5);
    sulco.closePath();
    k.fillStyle = '#b29d70';
    k.fill(sulco);
    gravar(k, sulco, (s0 + s1) / 2, sy + 8, (s1 - s0) / 2 + 10, -0.01, 3.4, 1.2, () => 0.55, '#1d160a', 0);
    k.strokeStyle = 'rgba(43,33,18,.8)';
    k.lineWidth = 1.6;
    k.stroke(sulco);
    // o chão de pedra e terra na frente, com o capim
    const chao = new Path2D();
    const beira = (x) => (x > s0 && x < s1 ? Math.max(yPe(x), sy + 14) : yPe(x));
    chao.moveTo(-10, beira(-10));
    for (let x = 0; x <= W + 10; x += 10) chao.lineTo(x, beira(x));
    chao.lineTo(W + 10, H + 10);
    chao.lineTo(-10, H + 10);
    chao.closePath();
    k.fillStyle = '#e2d1a4';
    k.fill(chao);
    // a beirada da rocha sobre o chão, em traço irregular
    k.strokeStyle = 'rgba(43,33,18,.85)';
    k.lineWidth = 2;
    k.beginPath();
    for (let x = -10; x <= W + 10; x += 10) { if (x === -10) k.moveTo(x, beira(x)); else k.lineTo(x, beira(x)); }
    k.stroke();
    const linhasChao = [];
    for (let i = 0; i < 9; i++) {
      const f = onda(sorteio(800 + i), 3, 0.008);
      const y0 = sy + 26 + Math.pow(i / 8, 1.5) * (H - sy);
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
    for (let i = 0; i < 7; i++) capim(k, r, r() * W, sy + 60 + r() * (H - sy - 80), 20 + r() * 22, 6);
    // a grande pedra redonda, rolada para fora e de pé no sulco, à direita da porta
    const esp = 22;
    // a sombra dela na rocha e no chão
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
  // ---------- Heróis da fé: as pranchas ----------
  // Cada herói é contado por um objeto ou um lugar, nunca por uma figura: gravura em tinta
  // sépia sobre papel com fibra, a hachura que engrossa na sombra e a silhueta dos objetos na
  // máscara do brilho. As peças abaixo são comuns às pranchas.
  // O papel: o tom em gradiente a partir da luz, a fibra e as manchas do tempo.
  function papelVelho(k, W, H, r, tons, luz, escuro = false) {
    const g = k.createRadialGradient(luz[0], luz[1], 30, W / 2, H / 2, W * 0.95);
    tons.forEach((c, i) => g.addColorStop(i / (tons.length - 1), c));
    k.fillStyle = g;
    k.fillRect(0, 0, W, H);
    for (let i = 0; i < 8000; i++) {
      k.fillStyle = r() < 0.6 ? 'rgba(' + (escuro ? '0,0,0' : '70,52,24') + ',' + (0.03 + r() * 0.06).toFixed(3) + ')' : 'rgba(255,248,226,' + (escuro ? 0.05 : 0.25) + ')';
      k.fillRect(r() * W, r() * H, 1 + r() * 4, 1);
    }
    for (let i = 0; i < 20; i++) brilho(k, r() * W, r() * H, 6 + r() * 24, 'rgba(120,90,40,' + (0.04 + r() * 0.06).toFixed(3) + ')');
  }
  // Um caminho pelos pontos (fechado, se nada disser o contrário).
  function pol(pts, fechar = true) {
    const p = new Path2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    if (fechar) p.closePath();
    return p;
  }
  // A sombra que vai do lado da luz (a) ao lado escuro (b), de v0 a v1.
  const degrade = (ax, ay, bx, by, v0, v1) => (x, y) => {
    const t = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2);
    return v0 + (v1 - v0) * Math.max(0, Math.min(1, t));
  };
  // Uma peça gravada: o tom, a hachura pela sombra (e a cruzada onde escurece), o contorno de
  // tinta e a silhueta na máscara do brilho. caixa = [x0, y0, x1, y1].
  function peca(k, forma, [x0, y0, x1, y1], { cor, tinta = SEPIA, ang = 0.7, passo = 4.6, maxL = 2.4, sombra, cruzada = 0.62, traco = 2.2, obj, abaulado = 0 } = {}) {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const raio = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
    if (cor) { k.fillStyle = cor; k.fill(forma); }
    if (sombra) {
      gravar(k, forma, cx, cy, raio, ang, passo, maxL, sombra, tinta, abaulado);
      if (cruzada < 1) gravar(k, forma, cx, cy, raio, ang + 1.2, passo * 1.25, maxL * 0.75, (x, y) => (sombra(x, y) - cruzada) * 2.2, tinta, 0);
    }
    if (traco) { k.strokeStyle = tinta; k.lineWidth = traco; k.lineJoin = 'round'; k.stroke(forma); }
    marcar(k, obj, forma);
  }
  // A sombra de uma forma no chão, borrada.
  function sombraNoChao(k, forma, dx, dy, desfoque, alfa) {
    k.save();
    k.filter = 'blur(' + desfoque + 'px)';
    k.fillStyle = 'rgba(30,20,8,' + alfa + ')';
    k.translate(dx, dy);
    k.fill(forma);
    k.restore();
  }
  // O céu e o chão em linhas: horizontais, mais grossas onde a sombra pede.
  function linhas(k, x0, y0, x1, y1, passo, maxL, sombra, cor = SEPIA) {
    const p = new Path2D();
    p.rect(x0, y0, x1 - x0, y1 - y0);
    gravar(k, p, (x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(x1 - x0, y1 - y0) / 2, 0, passo, maxL, sombra, cor, 0);
  }
  // Uma vara em traço (cajado, poste, haste): o contorno escuro, a madeira e a luz de um lado.
  function vara(k, pts, larg, cor, obj) {
    const p = pol(pts, false);
    marcar(k, obj, p, larg + 4);
    k.save();
    k.lineCap = 'round';
    k.lineJoin = 'round';
    for (const [w, c] of [[larg + 4, SEPIA], [larg, cor], [larg * 0.3, 'rgba(255,240,200,.55)']]) {
      k.strokeStyle = c;
      k.lineWidth = w;
      if (w < larg) k.translate(-larg * 0.22, -larg * 0.1);
      k.stroke(p);
    }
    k.restore();
  }
  // Um contorno de lã ou nuvem: os pontos ligados por arcos para fora (a beirada em rolinhos).
  function lanoso(r, pts, bolha = 7, passo = 13) {
    const q = [];
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / passo));
      for (let j = 0; j < n; j++) q.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    });
    const p = new Path2D();
    p.moveTo(q[0][0], q[0][1]);
    q.forEach((a, i) => {
      const b = q[(i + 1) % q.length];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const s = bolha * (0.7 + r() * 0.6);
      p.quadraticCurveTo((a[0] + b[0]) / 2 + (b[1] - a[1]) / d * s, (a[1] + b[1]) / 2 - (b[0] - a[0]) / d * s, b[0], b[1]);
    });
    p.closePath();
    return p;
  }
  // Uma língua de fogo, da base (x, y) até a ponta, com a inclinação "vai".
  function chama(x, y, larg, alto, vai) {
    const p = new Path2D();
    p.moveTo(x - larg / 2, y);
    p.bezierCurveTo(x - larg * 0.6, y - alto * 0.45, x + vai * 0.2 - larg * 0.1, y - alto * 0.7, x + vai, y - alto);
    p.bezierCurveTo(x + vai * 0.3 + larg * 0.25, y - alto * 0.62, x + larg * 0.65, y - alto * 0.38, x + larg / 2, y);
    p.closePath();
    return p;
  }
  function fogo(k, r, x, y, larg, alto, n) {
    brilho(k, x, y - alto * 0.4, alto * 1.1, 'rgba(255,190,90,.5)');
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5;
      const h = alto * (1 - Math.abs(t) * 1.1) * (0.75 + r() * 0.3);
      const p = chama(x + t * larg, y, larg / n * 1.9, h, (r() - 0.5) * 30 - t * 20);
      k.fillStyle = '#eda048';
      k.fill(p);
      k.fillStyle = '#ffe196';
      k.fill(chama(x + t * larg, y, larg / n * 1.0, h * 0.62, (r() - 0.5) * 16));
      gravar(k, p, x + t * larg, y - h / 2, h * 0.6, -Math.PI / 2 + 0.15, 5, 1.6, (px, py) => 0.2 + (py - y + h) / h * 0.7, '#7a3410', 0.4);
      k.strokeStyle = '#5e2606';
      k.lineWidth = 1.8;
      k.stroke(p);
    }
  }
  // Poucos pontos de estrela (cinco pontas não: quatro, como as da purpurina).
  function estrelasDoCeu(k, r, x0, y0, x1, y1, n, fora) {
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0);
      const y = y0 + r() * (y1 - y0);
      if (fora && fora(x, y)) continue;
      const g = r();
      k.fillStyle = 'rgba(255,246,220,' + (0.35 + g * 0.6).toFixed(3) + ')';
      k.beginPath();
      k.arc(x, y, 0.6 + g * g * 2.2, 0, 6.283);
      k.fill();
    }
  }

  // (1) A oferta de Abel (Gn 4.4): o altar de pedras brutas, a lenha, a lã branca do cordeiro
  // (uma das primeiras crias do rebanho) e a fumaça subindo reta no céu claro; o cajado de
  // pastor (Abel era pastor de ovelhas, 4.2) encostado no altar.
  function desenhoAbel(k, W, H, obj) {
    const r = sorteio(5101);
    papelVelho(k, W, H, r, ['#fbf2da', '#efdfba', '#d4ba86'], [W * 0.5, 120]);
    linhas(k, 0, 0, W, 600, 7, 1.2, (x, y) => Math.min(1, Math.hypot(x - W / 2, (y - 120) * 1.3) / 640) * 0.95 - 0.1);
    // os morros de longe e o chão
    const fm = onda(r, 4, 0.01);
    const morro = pol([[-10, 640], ...Array.from({ length: 46 }, (_, i) => [i * 20, 566 + fm(i * 20) * 14]), [W + 10, 640]]);
    peca(k, morro, [0, 540, W, 640], { cor: '#e4d0a4', ang: -0.15, passo: 6, maxL: 1.1, sombra: () => 0.55, traco: 1.6 });
    const chao = new Path2D();
    chao.rect(-10, 606, W + 20, H);
    k.fillStyle = '#dcc597';
    k.fill(chao);
    linhas(k, 0, 606, W, H, 6, 1.7, (x, y) => 0.25 + (y - 606) / 500);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(0, 606);
    for (let x = 0; x <= W; x += 8) k.lineTo(x, 606 + Math.sin(x * 0.03) * 1.5);
    k.stroke();
    // a fumaça, reta, que se abre e some no alto
    const cx = W * 0.5;
    const meio = (y) => cx + Math.sin(y * 0.018) * 8 * (1 - y / 420);
    const larg = (y) => 46 + (420 - y) * 0.32;
    const fum = pol([...Array.from({ length: 30 }, (_, i) => { const y = 420 - i * 12.4; return [meio(y) - larg(y) / 2, y]; }),
      ...Array.from({ length: 30 }, (_, i) => { const y = 60 + i * 12.4; return [meio(y) + larg(y) / 2, y]; })]);
    const gf = k.createLinearGradient(0, 60, 0, 420);
    gf.addColorStop(0, 'rgba(160,146,120,0)');
    gf.addColorStop(0.4, 'rgba(150,136,112,.35)');
    gf.addColorStop(1, 'rgba(110,96,74,.55)');
    k.fillStyle = gf;
    k.fill(fum);
    if (obj) { obj.save(); obj.globalAlpha = 0.7; marcar(k, obj, fum); obj.restore(); }
    gravar(k, fum, cx, 240, 240, -Math.PI / 2, 5.5, 1.5, (x, y) => (0.25 + Math.abs(x - meio(y)) / larg(y)) * Math.min(1, (y - 60) / 200), SEPIA, 0.5);
    // o altar: três fiadas de pedras brutas, de baixo para cima
    const sombraAltar = pol([[250, 700], [640, 700], [700, 740], [300, 744]]);
    sombraNoChao(k, sombraAltar, 10, 0, 12, 0.4);
    const fiadas = [[668, 4, 54, 36, 98, 0], [610, 4, 50, 33, 92, 14], [556, 4, 47, 30, 86, -6]];
    for (const [y, n, rx, ry, passoX, des] of fiadas) {
      for (let i = 0; i < n; i++) {
        const x = cx + (i - (n - 1) / 2) * passoX + des + (r() - 0.5) * 10;
        const a = rx * (0.9 + r() * 0.2);
        const b = ry * (0.9 + r() * 0.25);
        const giro = (r() - 0.5) * 0.3;
        const p = seixo(r, x, y + (r() - 0.5) * 6, a, b, giro, 0.12);
        const so = sombraOval(x, y, a, b, giro);
        peca(k, p, [x - a, y - b, x + a, y + b], { cor: r() < 0.5 ? '#d3c29c' : '#c6b28a', ang: 0.5 + r() * 0.5, passo: 4.2, maxL: 2.6, sombra: (px, py) => so(px, py) * 0.85 + (px - cx) / 900, obj, abaulado: 0.15 });
      }
    }
    // a lenha sobre as pedras
    for (const [x0, y0, x1, y1] of [[318, 526, 590, 516], [338, 514, 578, 530], [360, 506, 556, 502]]) {
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const nx = -Math.sin(ang) * 9;
      const ny = Math.cos(ang) * 9;
      const tora = pol([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]);
      peca(k, tora, [x0, y0 - 10, x1, y1 + 10], { cor: '#9c7448', ang, passo: 3.4, maxL: 1.8, sombra: (x, y) => 0.3 + ((y - (y0 + (x - x0) * Math.tan(ang))) / 9 + 1) * 0.3, obj });
    }
    // o fogo, atrás e dos lados da lã
    fogo(k, r, cx, 512, 270, 150, 7);
    // a lã do cordeiro, estendida sobre a lenha, com as pontas das patas caídas pela frente
    const la = lanoso(r, [[350, 506], [366, 474], [420, 462], [470, 466], [522, 460], [554, 480], [558, 506], [546, 524], [520, 528], [514, 552], [506, 578], [488, 582],
      [480, 556], [474, 532], [432, 532], [422, 556], [410, 584], [392, 586], [386, 560], [380, 532], [358, 526]]);
    sombraNoChao(k, la, 6, 8, 6, 0.45);
    k.fillStyle = '#fbf6e6';
    k.fill(la);
    marcar(k, obj, la);
    k.save();
    k.clip(la);
    k.strokeStyle = 'rgba(90,72,40,.7)';
    k.lineWidth = 1.4;
    for (let i = 0; i < 190; i++) {
      const x = 346 + r() * 216;
      const y = 452 + r() * 136;
      k.beginPath();
      k.arc(x, y, 2.5 + r() * 3.5, r() * 6, r() * 6 + 3.8);
      k.stroke();
    }
    k.restore();
    gravar(k, la, 452, 510, 130, 0.3, 4.4, 1.5, (x, y) => (y - 500) / 90 + (x - 452) / 500, '#5a4628', 0);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.2;
    k.stroke(la);
    brilho(k, cx, 486, 170, 'rgba(255,214,140,.28)', 'screen');
    // o cajado de pastor encostado no altar
    vara(k, [[690, 716], ...bezier([690, 716], [672, 600], [640, 460], [628, 360], 20), ...bezier([628, 360], [620, 316], [578, 304], [566, 334], 14), [574, 352]], 9, '#a37a4a', obj);
    capim(k, r, 150, 640, 30, 8);
    capim(k, r, 760, 700, 34, 9);
    capim(k, r, 222, 760, 26, 7);
    vinheta(k, W, H, 0.22);
  }
  // (2) Noé e a arca (Gn 6.14-16): a embarcação de cipreste, em terra seca, revestida de piche
  // por dentro e por fora (o casco escuro e brilhante, as tábuas com as juntas de piche), os
  // três andares, a porta do lado e a abertura de meio metro entre o teto e o corpo. A porta
  // desceu como rampa, e as pegadas, duas a duas, sobem por ela; o céu pesa à direita.
  function desenhoNoe(k, W, H, obj) {
    const r = sorteio(5201);
    papelVelho(k, W, H, r, ['#f6ecd2', '#e6d6b0', '#c9b088'], [W * 0.18, 110]);
    linhas(k, 0, 0, W, 584, 7, 1.3, (x, y) => 0.12 + (x / W) * 0.45 + (1 - y / 584) * 0.3 - Math.max(0, 0.25 - Math.hypot(x - 160, y - 110) / 700));
    const fm = onda(r, 4, 0.012);
    const morro = pol([[-10, 600], ...Array.from({ length: 46 }, (_, i) => [i * 20, 552 + fm(i * 20) * 12]), [W + 10, 600]]);
    peca(k, morro, [0, 530, W, 600], { cor: '#dfcca2', ang: -0.15, passo: 6, maxL: 1.2, sombra: () => 0.55, traco: 1.6 });
    const chao = new Path2D();
    chao.rect(-10, 584, W + 20, H);
    k.fillStyle = '#d9c293';
    k.fill(chao);
    linhas(k, 0, 584, W, H, 6, 1.7, (x, y) => 0.22 + (y - 584) / 560);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(0, 584);
    k.lineTo(W, 584);
    k.stroke();
    // a arca: o casco de tábuas curvas, escorado no chão seco
    const cx = 445;
    const conves = (x) => 404 + 30 * (1 - ((x - cx) / 355) ** 2);
    const quilha = (x) => 628 - 80 * ((x - cx) / 330) ** 2;
    const casco = new Path2D();
    casco.moveTo(86, conves(86));
    for (let x = 86; x <= 804; x += 12) casco.lineTo(x, conves(x));
    casco.bezierCurveTo(800, 500, 776, 548, 712, quilha(712));
    for (let x = 712; x >= 178; x -= 12) casco.lineTo(x, quilha(x));
    casco.bezierCurveTo(124, 556, 92, 500, 86, conves(86));
    casco.closePath();
    // as escoras e a sombra
    sombraNoChao(k, pol([[150, 622], [740, 622], [820, 668], [200, 668]]), 0, 0, 14, 0.5);
    for (const [x, d] of [[196, -1], [330, -1], [600, 1], [720, 1]]) vara(k, [[x, quilha(x) - 36], [x + d * 58, 660]], 8, '#8a6642');
    for (const x of [300, 445, 590]) peca(k, pol([[x - 26, quilha(x) - 4], [x + 26, quilha(x) - 4], [x + 28, 648], [x - 28, 648]]), [x - 28, 600, x + 28, 648], { cor: '#9a7a50', sombra: () => 0.5, passo: 3.4, maxL: 1.4, traco: 2 });
    peca(k, casco, [86, 398, 804, 628], { cor: '#5a4029', ang: 0, passo: 4.2, maxL: 1.9, sombra: (x, y) => 0.38 + (x - 86) / 1800 + (y - 420) / 520, tinta: '#140c05', obj, traco: 3 });
    // as tábuas acompanham a curva do casco: a junta de piche e a luz na beirada
    k.save();
    k.clip(casco);
    for (let i = 1; i < 13; i++) {
      const t = i / 13;
      const y = (x) => conves(x) + (quilha(x) + 26 * ((x - cx) / 330) ** 2 - conves(x)) * t;
      for (const [cor, lw, dy] of [['#120a04', i === 4 || i === 8 ? 8 : 3, 0], ['rgba(255,226,170,.3)', 1.2, i === 4 || i === 8 ? 5 : 2.5]]) {
        k.strokeStyle = cor;
        k.lineWidth = lw;
        k.beginPath();
        for (let x = 70; x <= 820; x += 12) (x === 70 ? k.moveTo(x, y(x) + dy) : k.lineTo(x, y(x) + dy));
        k.stroke();
      }
      k.strokeStyle = '#120a04';
      k.lineWidth = 2;
      for (let x = 100 + ((i * 97) % 170); x < 800; x += 150 + r() * 70) {
        k.beginPath();
        k.moveTo(x, y(x) - 15);
        k.lineTo(x, y(x));
        k.stroke();
      }
    }
    brilho(k, 300, 450, 240, 'rgba(255,230,180,.2)', 'screen');
    k.restore();
    // a casa de cima: as paredes, a abertura com os esteios e o teto baixo
    const h0 = 214;
    const h1 = 676;
    const parede = pol([[h0, conves(h0) + 2], [h0, 352], [h1, 352], [h1, conves(h1) + 2]]);
    peca(k, parede, [h0, 352, h1, 432], { cor: '#5f442b', ang: 0, passo: 4, maxL: 1.8, sombra: (x) => 0.45 + (x - h0) / 1200, tinta: '#140c05', obj, traco: 2.4 });
    const vao = pol([[h0 - 4, 330], [h1 + 4, 330], [h1, 352], [h0, 352]]);
    k.fillStyle = '#120b05';
    k.fill(vao);
    marcar(k, obj, vao);
    for (let x = h0 + 4; x < h1; x += 38) {
      const p = pol([[x, 330], [x + 8, 330], [x + 8, 352], [x, 352]]);
      peca(k, p, [x, 330, x + 8, 352], { cor: '#7a5834', sombra: () => 0.35, passo: 3, maxL: 1, traco: 1.2, tinta: '#140c05' });
    }
    const teto = pol([[h0 - 34, 332], [h1 + 34, 332], [h1 - 40, 276], [h0 + 40, 276]]);
    peca(k, teto, [h0 - 34, 276, h1 + 34, 332], { cor: '#6a4b2c', ang: 1.45, passo: 4.4, maxL: 1.9, sombra: (x, y) => 0.32 + (x - h0) / 1300 + (y - 276) / 200, tinta: '#140c05', obj, traco: 3 });
    // a porta do lado, aberta, e a rampa (a própria porta descida até o chão)
    const px0 = 506;
    const px1 = 572;
    const yB = 568;
    const porta = pol([[px0, 466], [px1, 464], [px1, yB], [px0, yB + 2]]);
    k.fillStyle = '#0c0703';
    k.fill(porta);
    brilho(k, (px0 + px1) / 2, yB - 24, 50, 'rgba(255,190,110,.25)');
    k.strokeStyle = '#2a1c0e';
    k.lineWidth = 4;
    k.stroke(porta);
    const rampa = pol([[px0, yB + 2], [px1, yB], [px1 + 112, 742], [px0 + 66, 752]]);
    sombraNoChao(k, rampa, 14, 6, 8, 0.4);
    peca(k, rampa, [px0, yB, px1 + 112, 752], { cor: '#8a6642', ang: 0.12, passo: 4, maxL: 1.6, sombra: (x) => 0.22 + (x - px0) / 600, tinta: '#140c05', obj, traco: 2.4 });
    k.strokeStyle = '#140c05';
    k.lineWidth = 3;
    for (let t = 0.12; t < 1; t += 0.14) {
      k.beginPath();
      k.moveTo(px0 + 66 * t, yB + 2 + (752 - yB) * t);
      k.lineTo(px1 + 112 * t, yB + (742 - yB) * t);
      k.stroke();
    }
    // as pegadas, duas a duas, vindo pelo chão e subindo a rampa
    const pegada = (x, y, e, giro) => {
      k.save();
      k.translate(x, y);
      k.rotate(giro);
      k.fillStyle = 'rgba(43,33,18,.75)';
      for (const lado of [-1, 1]) { k.beginPath(); k.ellipse(lado * 3.2 * e, 0, 2.6 * e, 5 * e, lado * 0.15, 0, 6.283); k.fill(); }
      k.restore();
    };
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const x = 800 - t * 190 + Math.sin(t * 5) * 8;
      const y = 800 - t * 230;
      const e = 1.4 - t * 0.5;
      if (y < 586) continue;
      pegada(x - 12, y + (i % 2) * 8, e, -0.7);
      pegada(x + 12, y + 6 + ((i + 1) % 2) * 8, e, -0.7);
    }
    // um par de aves sobre o teto
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.lineCap = 'round';
    for (const [x, y, e] of [[600, 214, 1], [646, 196, 0.85]]) {
      k.beginPath();
      k.moveTo(x - 18 * e, y - 4 * e);
      k.quadraticCurveTo(x - 8 * e, y - 12 * e, x, y);
      k.quadraticCurveTo(x + 8 * e, y - 12 * e, x + 18 * e, y - 5 * e);
      k.stroke();
    }
    capim(k, r, 96, 676, 30, 8);
    capim(k, r, 300, 740, 28, 8);
    capim(k, r, 420, 790, 24, 7);
    vinheta(k, W, H, 0.22);
  }
  // (3) Abraão e as estrelas (Gn 15.5): de noite, fora da tenda, o céu cheio de estrelas que
  // não se podem contar, com a Via Láctea atravessando; a tenda de pelo de cabra no alto do
  // morro, com a porta aberta e a lamparina acesa lá dentro (ele saiu). Gravura em linha
  // branca sobre o fundo escuro, como na xilogravura.
  function desenhoAbraao(k, W, H, obj) {
    const r = sorteio(5301);
    const g = k.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#100f18');
    g.addColorStop(0.55, '#1d1a27');
    g.addColorStop(0.78, '#3b2e30');
    g.addColorStop(1, '#1a1512');
    k.fillStyle = g;
    k.fillRect(0, 0, W, H);
    papelVelho(k, W, H, r, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'], [W / 2, H / 2], true);
    // a linha branca do céu, mais cheia perto do horizonte
    linhas(k, 0, 0, W, 660, 6, 1.1, (x, y) => 0.12 + (y / 660) ** 2 * 0.7, 'rgba(236,220,186,.4)');
    // a Via Láctea: uma faixa de luz e de estrelas miúdas, na diagonal
    const via = (t) => [80 + t * 760, 600 - t * 560];
    for (let i = 0; i < 26; i++) { const [x, y] = via(i / 25); brilho(k, x + (r() - 0.5) * 40, y + (r() - 0.5) * 40, 70 + r() * 50, 'rgba(230,214,190,.07)'); }
    for (let i = 0; i < 1100; i++) {
      const [x, y] = via(r());
      const d = (r() + r() + r() - 1.5) * 90;
      const px = x + d * 0.6;
      const py = y + d * 0.8;
      k.fillStyle = 'rgba(250,240,214,' + (0.25 + r() * 0.5).toFixed(3) + ')';
      k.fillRect(px, py, 1.4, 1.4);
    }
    // as estrelas: muitas pequenas e algumas grandes, com a cruz de luz
    const morroY = (x) => 650 - 40 * Math.exp(-(((x - 320) / 300) ** 2)) + Math.sin(x * 0.02) * 6;
    estrelasDoCeu(k, r, 30, 30, W - 30, 660, 900, (x, y) => y > morroY(x) - 10);
    for (let i = 0; i < 16; i++) {
      const x = 60 + r() * (W - 120);
      const y = 60 + r() * 440;
      const t = 5 + r() * 12;
      if (y > 440 && x < 600) continue;
      brilho(k, x, y, t * 2.2, 'rgba(255,236,190,.35)');
      estrelinha(k, x, y, t, 'rgba(255,248,226,.95)');
    }
    // o morro, escuro, com a linha da crista
    const morro = new Path2D();
    morro.moveTo(-10, H + 10);
    for (let x = -10; x <= W + 10; x += 8) morro.lineTo(x, morroY(x));
    morro.lineTo(W + 10, H + 10);
    morro.closePath();
    k.fillStyle = '#16120f';
    k.fill(morro);
    gravar(k, morro, W / 2, 720, 520, 0.08, 7, 1.1, (x, y) => 0.45 - (y - 560) / 900, 'rgba(236,214,170,.35)', 0);
    k.strokeStyle = 'rgba(240,222,180,.6)';
    k.lineWidth = 1.6;
    k.beginPath();
    for (let x = -10; x <= W + 10; x += 8) (x < 0 ? k.moveTo(x, morroY(x)) : k.lineTo(x, morroY(x)));
    k.stroke();
    // a tenda: baixa e larga, os três esteios levantando o teto, as faixas do pano de pelo de
    // cabra e a parede da frente com a porta aberta
    const B = 664;
    const tx0 = 120;
    const tx1 = 520;
    const tc = (tx0 + tx1) / 2;
    const tenda = new Path2D();
    tenda.moveTo(tx0 - 36, B);
    tenda.lineTo(tx0, B - 96);
    tenda.quadraticCurveTo(tx0 + 30, B - 120, tx0 + 64, B - 152);
    tenda.quadraticCurveTo(tx0 + 120, B - 120, tc, B - 166);
    tenda.quadraticCurveTo(tx1 - 120, B - 120, tx1 - 64, B - 152);
    tenda.quadraticCurveTo(tx1 - 30, B - 120, tx1, B - 96);
    tenda.lineTo(tx1 + 36, B);
    tenda.closePath();
    const pd = tc + 40;
    brilho(k, pd, B, 150, 'rgba(255,190,100,.42)');
    k.fillStyle = 'rgba(0,0,0,.5)';
    k.fillRect(tx0 - 40, B - 2, tx1 - tx0 + 80, 10);
    peca(k, tenda, [tx0 - 36, B - 166, tx1 + 36, B], { cor: '#2b221d', tinta: 'rgba(240,216,170,.55)', ang: 1.5, passo: 5, maxL: 1.3, sombra: (x, y) => (y < B - 96 ? 0.25 : 0.4) + Math.abs(x - pd) / 600, cruzada: 1, traco: 0, obj });
    k.save();
    k.clip(tenda);
    for (let y = B - 166; y < B - 96; y += 18) { k.fillStyle = 'rgba(150,120,86,.3)'; k.fillRect(tx0 - 40, y, tx1 - tx0 + 80, 7); }
    k.fillStyle = 'rgba(0,0,0,.35)';
    k.fillRect(tx0 - 40, B - 98, tx1 - tx0 + 80, 10);
    k.restore();
    k.strokeStyle = 'rgba(244,224,180,.85)';
    k.lineWidth = 2;
    k.stroke(tenda);
    k.beginPath();
    k.moveTo(tx0, B - 96);
    k.lineTo(tx1, B - 96);
    k.stroke();
    // a porta: o dentro aceso, a lamparina no chão e a aba dobrada de lado
    const porta = pol([[pd - 36, B], [pd - 34, B - 92], [pd + 34, B - 92], [pd + 36, B]]);
    const gp = k.createLinearGradient(0, B - 92, 0, B);
    gp.addColorStop(0, '#6e421a');
    gp.addColorStop(1, '#f4bc66');
    k.fillStyle = gp;
    k.fill(porta);
    gravar(k, porta, pd, B - 46, 60, 0, 4, 1.2, (x, y) => 0.8 - (y - B + 92) / 110, '#3a2410', 0);
    k.strokeStyle = '#120d0a';
    k.lineWidth = 2;
    k.stroke(porta);
    const lamp = pol([[pd - 15, B - 12], [pd + 15, B - 12], [pd + 8, B - 5], [pd - 8, B - 5]]);
    k.fillStyle = '#3a2410';
    k.fill(lamp);
    k.fillStyle = '#fff1b8';
    k.fill(chama(pd + 12, B - 12, 7, 16, 2));
    brilho(k, pd + 12, B - 20, 46, 'rgba(255,230,160,.85)');
    const aba = pol([[pd + 34, B - 92], [pd + 70, B - 92], [pd + 40, B - 20]]);
    peca(k, aba, [pd + 34, B - 92, pd + 70, B - 20], { cor: '#3a2e26', tinta: 'rgba(240,216,170,.7)', ang: 1.2, passo: 4, maxL: 1, sombra: () => 0.4, cruzada: 1, traco: 1.6, obj });
    // as cordas e as estacas
    k.strokeStyle = 'rgba(240,222,180,.7)';
    for (const [x, y, dx] of [[tx0, B - 96, -80], [tx0 + 64, B - 152, -150], [tx1, B - 96, 80], [tx1 - 64, B - 152, 150]]) {
      k.lineWidth = 1.4;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + dx, B + 14);
      k.stroke();
      k.lineWidth = 3;
      k.beginPath();
      k.moveTo(x + dx, B + 8);
      k.lineTo(x + dx + 3, B + 20);
      k.stroke();
    }
    vinheta(k, W, H, 0.35);
  }
  // (4) O riso de Sara (Gn 21.1-7): Isaque nasceu quando Abraão tinha cem anos. Na sombra do
  // toldo da tenda, o berço de pano pendurado na trave, com a manta dobrada e um chocalho de
  // barro; encostados no esteio, os dois cajados gastos dos velhos. Lá fora, o sol do
  // deserto.
  function desenhoSara(k, W, H, obj) {
    const r = sorteio(5401);
    papelVelho(k, W, H, r, ['#fdf3d8', '#f0dcae', '#d6b984'], [W * 0.85, 360]);
    // lá fora: o horizonte claro e o chão de areia
    linhas(k, 0, 300, W, 520, 7, 1, (x, y) => 0.1 + Math.abs(x - 750) / 1600);
    const fm = onda(r, 3, 0.01);
    const morro = pol([[-10, 540], ...Array.from({ length: 46 }, (_, i) => [i * 20, 500 + fm(i * 20) * 10]), [W + 10, 540]]);
    peca(k, morro, [0, 480, W, 540], { cor: '#e6d3a8', ang: -0.1, passo: 6, maxL: 1, sombra: () => 0.5, traco: 1.4 });
    const chao = new Path2D();
    chao.rect(-10, 530, W + 20, H);
    k.fillStyle = '#e2cb9a';
    k.fill(chao);
    linhas(k, 0, 530, W, H, 6, 1.6, (x, y) => 0.15 + (y - 530) / 600);
    // o toldo: o pano listrado da tenda, esticado no alto, com a beirada em franja
    const beira = (x) => 236 + (x - 40) * 0.07 + Math.sin(x * 0.012) * 8;
    const toldo = new Path2D();
    toldo.moveTo(-10, -10);
    toldo.lineTo(W + 10, -10);
    for (let x = W + 10; x >= -10; x -= 10) toldo.lineTo(x, beira(x));
    toldo.closePath();
    // a sombra do toldo no chão, à esquerda (o sol vem da direita)
    k.save();
    k.filter = 'blur(10px)';
    k.fillStyle = 'rgba(60,40,16,.28)';
    k.beginPath();
    k.moveTo(-10, 560);
    k.lineTo(620, 560);
    k.lineTo(520, 780);
    k.lineTo(-10, 780);
    k.fill();
    k.restore();
    // o fundo da tenda, escuro, entre os esteios
    const fundo = pol([[60, beira(60)], [700, beira(700)], [700, 612], [60, 612]]);
    peca(k, fundo, [60, 230, 700, 590], { cor: '#5a4128', ang: 1.5, passo: 4.4, maxL: 2, sombra: (x, y) => 0.45 + (590 - y) / 700, tinta: '#140d06', cruzada: 0.7, traco: 0 });
    k.save();
    k.clip(fundo);
    for (let x = 60; x < 700; x += 64) { k.fillStyle = 'rgba(150,118,80,.22)'; k.fillRect(x, 0, 14, 600); }
    k.restore();
    // a esteira no chão da tenda
    const esteira = pol([[100, 610], [670, 610], [740, 712], [30, 712]]);
    peca(k, esteira, [30, 610, 740, 712], { cor: '#c79a5a', ang: 0, passo: 5, maxL: 1.3, sombra: () => 0.45, traco: 2 });
    k.save();
    k.clip(esteira);
    k.strokeStyle = 'rgba(110,40,20,.6)';
    k.lineWidth = 6;
    for (const y of [626, 696]) { k.beginPath(); k.moveTo(0, y); k.lineTo(W, y); k.stroke(); }
    k.fillStyle = 'rgba(110,40,20,.55)';
    for (let x = 50; x < 740; x += 36) { k.beginPath(); k.moveTo(x, 661); k.lineTo(x + 10, 652); k.lineTo(x + 20, 661); k.lineTo(x + 10, 670); k.fill(); }
    k.restore();
    sombraNoChao(k, toldo, 0, 14, 10, 0.4);
    peca(k, toldo, [0, 0, W, 300], { cor: '#6e5236', ang: 0.05, passo: 4.6, maxL: 2, sombra: (x, y) => 0.3 + y / 900, tinta: '#140d06', traco: 0 });
    k.save();
    k.clip(toldo);
    for (let y = 30; y < 300; y += 56) { k.fillStyle = 'rgba(236,214,170,.38)'; k.fillRect(0, y, W, 16); }
    k.restore();
    k.strokeStyle = '#140d06';
    k.lineWidth = 3;
    k.stroke(toldo);
    k.lineWidth = 2;
    for (let x = 0; x <= W; x += 14) { k.beginPath(); k.moveTo(x, beira(x)); k.lineTo(x + 2, beira(x) + 12); k.stroke(); }
    // os esteios e a trave
    vara(k, [[72, beira(72) + 4], [70, 700]], 12, '#8a6440');
    vara(k, [[700, beira(700) + 4], [702, 712]], 12, '#8a6440');
    // o cajado gasto, torto e cheio de nós, encostado no esteio da direita
    const caj = Array.from({ length: 24 }, (_, i) => { const t = i / 23; return [626 + t * 62 + Math.sin(t * 19) * 4, 726 - t * 352 + Math.cos(t * 13) * 2]; });
    vara(k, caj, 12, '#9a7244', obj);
    const nob = new Path2D();
    nob.ellipse(689, 372, 14, 11, 0.4, 0, 6.283);
    peca(k, nob, [675, 361, 703, 383], { cor: '#8a6238', sombra: sombraOval(689, 372, 14, 11, 0.4), passo: 3, maxL: 1.6, obj, traco: 2 });
    // o berço de vime sobre a esteira, com a manta dobrada por cima da beirada
    const bx = 380;
    const bo = 548;
    const bb = 652;
    k.save();
    k.translate(bx, bb);
    k.scale(1.18, 1.18);
    k.translate(-bx, -bb);
    const corpo = new Path2D();
    corpo.ellipse(bx, bo, 170, 42, 0, Math.PI, 0, true);
    corpo.lineTo(bx + 142, bb);
    corpo.ellipse(bx, bb, 142, 30, 0, 0, Math.PI);
    corpo.closePath();
    sombraNoChao(k, pol([[bx - 150, bb], [bx + 160, bb], [bx + 200, bb + 30], [bx - 120, bb + 34]]), 0, 0, 10, 0.5);
    peca(k, corpo, [bx - 170, bo - 42, bx + 170, bb + 30], { cor: '#c9a066', ang: 0, passo: 4, maxL: 1.4, sombra: (x) => 0.25 + (bx - x) / 500, tinta: '#2e1e0c', cruzada: 1, obj, traco: 2.4 });
    // a trama do vime: as fiadas curvas e as varetas em pé
    k.save();
    k.clip(corpo);
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      k.strokeStyle = 'rgba(46,30,12,.75)';
      k.lineWidth = 2.2;
      k.beginPath();
      k.ellipse(bx, bo + (bb - bo) * t, 170 - 28 * t, 42 - 12 * t, 0, 0.05, Math.PI - 0.05);
      k.stroke();
      k.strokeStyle = 'rgba(255,236,190,.4)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.ellipse(bx, bo + (bb - bo) * t - 4, 170 - 28 * t, 42 - 12 * t, 0, 0.3, Math.PI - 0.3);
      k.stroke();
    }
    k.strokeStyle = 'rgba(46,30,12,.5)';
    k.lineWidth = 1.4;
    for (let a = 0.12; a < Math.PI; a += 0.16) {
      k.beginPath();
      k.moveTo(bx + Math.cos(a) * 170, bo + Math.sin(a) * 42);
      k.lineTo(bx + Math.cos(a) * 142, bb + Math.sin(a) * 30);
      k.stroke();
    }
    k.restore();
    // a boca: o fundo de dentro e o aro de vime trançado
    const boca = new Path2D();
    boca.ellipse(bx, bo, 170, 42, 0, 0, 6.283);
    k.fillStyle = '#4a3218';
    k.fill(boca);
    gravar(k, boca, bx, bo, 170, 0, 4, 1.4, (x, y) => 0.5 + (bo - y) / 60, '#1e1206', 0);
    cordao(k, Array.from({ length: 61 }, (_, i) => [bx + Math.cos(i / 60 * 6.283) * 170, bo + Math.sin(i / 60 * 6.283) * 42]), 9, { cor: '#d8b47a', escuro: '#2e1e0c', luz: 'rgba(255,240,200,.6)' });
    marcar(k, obj, boca);
    // a manta: deitada dentro e caindo pela frente
    const manta = new Path2D();
    manta.moveTo(bx - 120, bo - 6);
    manta.bezierCurveTo(bx - 60, bo - 30, bx + 40, bo - 22, bx + 110, bo - 14);
    manta.bezierCurveTo(bx + 120, bo + 6, bx + 112, bo + 30, bx + 104, bo + 62);
    manta.lineTo(bx + 30, bo + 70);
    manta.bezierCurveTo(bx + 34, bo + 50, bx + 30, bo + 40, bx + 24, bo + 34);
    manta.bezierCurveTo(bx - 30, bo + 34, bx - 90, bo + 30, bx - 120, bo - 6);
    manta.closePath();
    peca(k, manta, [bx - 120, bo - 30, bx + 120, bo + 70], { cor: '#f6ecd6', ang: 0.2, passo: 3.8, maxL: 1.6, sombra: (x, y) => 0.12 + (y - bo + 20) / 140, tinta: '#3a2c16', cruzada: 1, obj, traco: 2.2 });
    k.save();
    k.clip(manta);
    k.strokeStyle = 'rgba(160,62,36,.85)';
    k.lineWidth = 6;
    for (const d of [30, 46]) { k.beginPath(); k.moveTo(bx + d, bo - 30); k.bezierCurveTo(bx + d + 8, bo, bx + d + 4, bo + 40, bx + d - 2, bo + 80); k.stroke(); }
    k.restore();
    k.restore();
    // o chocalho de barro na esteira
    const ch = [150, 684];
    vara(k, [[ch[0] - 8, ch[1] + 4], [ch[0] - 40, ch[1] + 14]], 6, '#b06a3c', obj);
    const bola = new Path2D();
    bola.arc(ch[0], ch[1], 15, 0, 6.283);
    peca(k, bola, [ch[0] - 15, ch[1] - 15, ch[0] + 15, ch[1] + 15], { cor: '#c4794a', sombra: sombraOval(ch[0], ch[1], 15, 15, 0), passo: 3, maxL: 1.6, tinta: '#3a1a08', obj, traco: 1.8 });
    k.fillStyle = '#3a1a08';
    for (const [dx, dy] of [[-5, -4], [4, -6], [0, 3]]) { k.beginPath(); k.arc(ch[0] + dx, ch[1] + dy, 1.6, 0, 6.283); k.fill(); }
    capim(k, r, 820, 600, 30, 8);
    capim(k, r, 790, 780, 26, 7);
    vinheta(k, W, H, 0.22);
  }
  // As artes, pela id da carta. temArte(id) diz se a carta já tem desenho; sem ele, a carta
  // sai com a gravura neutra (desenhoEmBreve) e o sistema pode preferir a silhueta.
  const DESENHOS = { 'davi-funda': desenhoDavi, 'poco-jaco': desenhoPoco, 'azeite-viuva': desenhoAzeite, 'mar-vermelho': desenhoMar,
    'arca-alianca': desenhoArca, 'tumulo-vazio': desenhoTumulo,
    'abel-oferta': desenhoAbel, 'noe-arca': desenhoNoe,
    'abraao-estrelas': desenhoAbraao, 'sara-riso': desenhoSara };
  const temArte = (id) => Object.prototype.hasOwnProperty.call(DESENHOS, id);
  // A gravura neutra das cartas ainda sem desenho: o papel, a guilhoché e o símbolo.
  function desenhoEmBreve(k, W, H) {
    const g = k.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.75);
    g.addColorStop(0, '#f1e8cf');
    g.addColorStop(1, '#d6c7a0');
    k.fillStyle = g;
    k.fillRect(0, 0, W, H);
    k.lineWidth = 1.2;
    for (let i = 0; i < 30; i++) {
      k.strokeStyle = 'rgba(43,33,18,' + (i % 4 === 0 ? 0.22 : 0.1) + ')';
      k.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.02) {
        const d = 60 + i * 12 + Math.sin(a * 16 + i * 0.5) * 4;
        const x = W / 2 + Math.cos(a) * d;
        const y = H / 2 + Math.sin(a) * d * 0.95;
        if (a === 0) k.moveTo(x, y); else k.lineTo(x, y);
      }
      k.stroke();
    }
    if (CC.story && CC.CAMINHO_SIMBOLO) CC.story.logo(k, W / 2 - 120 * 1357 / 1936 / 2, H / 2 - 60, 120, 'rgba(43,33,18,.35)');
  }
  // Marca a silhueta de um objeto no contexto "obj" (a máscara do brilho), no mesmo lugar em
  // que o desenho está (copia a transformação do contexto da arte).
  function marcar(k, obj, forma, traco) {
    if (!obj) return;
    obj.save();
    obj.setTransform(k.getTransform());
    if (traco) { obj.lineWidth = traco; obj.lineCap = 'round'; obj.lineJoin = 'round'; obj.stroke(forma); } else obj.fill(forma);
    obj.restore();
  }

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
  function medir(k, txt, fonte, espaco) {
    k.font = fonte;
    try { k.letterSpacing = espaco + 'px'; } catch (e) { /* idem */ }
    const w = k.measureText(txt).width;
    try { k.letterSpacing = '0px'; } catch (e) { /* idem */ }
    return w;
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
  // Cada raridade tem um material que se reconhece de longe, e também um enfeite próprio nos
  // cantos (além do nome e do ícone no pé): o linho é pano cru com pesponto; o bronze, metal
  // batido escuro com rebites; a prata, metal frio e claro com guilhoché e rosetas; o ouro,
  // folha dourada com cantoneiras de filigrana; a glória, arte cheia com moldura de madrepérola.
  const METAIS = {
    bronze: [[0, '#3f2410'], [0.13, '#94592a'], [0.26, '#d9a06a'], [0.35, '#9c6230'], [0.5, '#4f2c12'], [0.64, '#a26a36'], [0.77, '#e0b07c'], [0.88, '#7c4c22'], [1, '#36200c']],
    prata: [[0, '#6b7380'], [0.14, '#c3c9d2'], [0.27, '#fbfcff'], [0.37, '#c0c6d0'], [0.52, '#7d8592'], [0.66, '#d9dde4'], [0.78, '#ffffff'], [0.88, '#a9b0bc'], [1, '#606875']],
    ouro: [[0, '#7a5714'], [0.14, '#d9a23a'], [0.27, '#fff0b8'], [0.36, '#e3ae45'], [0.52, '#8c6519'], [0.66, '#e8b84e'], [0.78, '#fff4c8'], [0.88, '#c99430'], [1, '#6e4f12']],
  };
  function folhaDeMetal(k, w, h, r, tons, { escuro = '80,50,0', claro = '255,250,220', batido = false, guilloche = false, escovado = true } = {}) {
    const g = k.createLinearGradient(0, 0, w, h);
    tons.forEach(([p, c]) => g.addColorStop(p, c));
    k.fillStyle = g;
    k.fillRect(0, 0, w, h);
    if (batido) {
      // as marcas do martelo: covinhas regulares, o brilho em cima à esquerda, a sombra embaixo
      const passo = 19;
      for (let y = -passo, l = 0; y < h + passo; y += passo * 0.87, l++) {
        for (let x = -passo + (l % 2) * passo / 2; x < w + passo; x += passo) {
          const cx = x + (r() - 0.5) * 3;
          const cy = y + (r() - 0.5) * 3;
          const rr = 7.5 + r() * 1.5;
          k.strokeStyle = 'rgba(' + claro + ',.42)';
          k.lineWidth = 1.8;
          k.beginPath();
          k.arc(cx, cy, rr, Math.PI * 0.95, Math.PI * 1.55);
          k.stroke();
          k.strokeStyle = 'rgba(' + escuro + ',.3)';
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
      k.lineWidth = 1.2;
      for (const [ox, oy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
        for (let i = 0; i < 60; i++) {
          const raio = 40 + i * 9;
          k.strokeStyle = i % 5 === 0 ? 'rgba(' + escuro + ',.2)' : 'rgba(' + escuro + ',.09)';
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
  // O linho: o pano cru, a trama fina e regular (por cima, por baixo) e a borda mais escura.
  function tecidoDeLinho(k, w, h, r) {
    const g = k.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#ece2cb');
    g.addColorStop(0.55, '#ddd0b2');
    g.addColorStop(1, '#cbbb98');
    k.fillStyle = g;
    k.fillRect(0, 0, w, h);
    const passo = 5;
    for (let y = 0; y < h; y += passo) {
      for (let x = 0; x < w; x += passo) {
        const cima = ((x + y) / passo) % 2 === 0;
        k.fillStyle = cima ? 'rgba(255,250,236,' + (0.2 + r() * 0.08).toFixed(3) + ')' : 'rgba(100,82,50,' + (0.12 + r() * 0.06).toFixed(3) + ')';
        k.fillRect(x, y + (cima ? 0 : 1), cima ? passo : passo - 1, cima ? passo - 1.6 : passo - 1);
      }
    }
    vinheta(k, w, h, 0.22);
  }
  // A madrepérola da glória: o branco quente com as cores do nácar (rosa, céu, menta e ouro
  // claros) em faixas diagonais largas, as linhas de crescimento da concha e um brilho.
  function madreperola(k, w, h, r, desloc = 0) {
    const g = k.createLinearGradient(0, 0, w, h);
    const tons = ['#fbf1de', '#f4b9d3', '#a8cdf6', '#b2ead0', '#fbd788', '#d3bcf6', '#fbf1de'];
    for (let i = 0; i <= 18; i++) g.addColorStop(i / 18, tons[(i + desloc) % tons.length]);
    k.fillStyle = g;
    k.fillRect(0, 0, w, h);
    k.save();
    k.lineWidth = 1.4;
    for (let i = 0; i < 90; i++) {
      const y0 = -h * 0.2 + i * (h * 1.4) / 90;
      k.strokeStyle = i % 3 ? 'rgba(255,255,255,.55)' : 'rgba(150,130,110,.16)';
      k.beginPath();
      for (let x = -20; x <= w + 20; x += 16) {
        const y = y0 + x * 0.35 + Math.sin(x * 0.02 + i * 0.7) * 10;
        if (x === -20) k.moveTo(x, y); else k.lineTo(x, y);
      }
      k.stroke();
    }
    k.globalCompositeOperation = 'screen';
    k.filter = 'blur(26px)';
    k.fillStyle = 'rgba(255,255,255,.65)';
    k.beginPath();
    k.moveTo(w * 0.6, -50);
    k.lineTo(w * 0.74, -50);
    k.lineTo(w * 0.24, h + 50);
    k.lineTo(w * 0.1, h + 50);
    k.fill();
    k.restore();
  }
  // Os enfeites dos cantos, na cor da letra da moldura.
  function enfeiteDosCantos(k, tipo, cor, claro, { recuo = 40, escala = 1 } = {}) {
    const cantos = [[1, 1, recuo, recuo], [-1, 1, CW - recuo, recuo], [1, -1, recuo, CH - recuo], [-1, -1, CW - recuo, CH - recuo]];
    k.save();
    k.lineCap = 'round';
    for (const [sx, sy, x, y] of cantos) {
      k.save();
      k.translate(x, y);
      k.scale(sx * escala, sy * escala);
      if (tipo === 'rebite') {
        // o rebite de bronze: a cabeça redonda, a luz e a sombra
        const g = k.createRadialGradient(-3 * sx, -3 * sy, 1, 0, 0, 11);
        g.addColorStop(0, claro);
        g.addColorStop(1, cor);
        k.fillStyle = 'rgba(0,0,0,.35)';
        k.beginPath();
        k.arc(2, 3, 11, 0, Math.PI * 2);
        k.fill();
        k.fillStyle = g;
        k.beginPath();
        k.arc(0, 0, 10, 0, Math.PI * 2);
        k.fill();
        k.strokeStyle = 'rgba(40,18,4,.7)';
        k.lineWidth = 1.5;
        k.stroke();
      } else if (tipo === 'roseta') {
        // a roseta gravada da prata
        k.strokeStyle = cor;
        k.lineWidth = 1.6;
        for (let i = 0; i < 8; i++) {
          k.save();
          k.rotate((i / 8) * Math.PI * 2);
          k.beginPath();
          k.ellipse(0, -7, 3.2, 7, 0, 0, Math.PI * 2);
          k.stroke();
          k.restore();
        }
        k.beginPath();
        k.arc(0, 0, 2.6, 0, Math.PI * 2);
        k.fillStyle = cor;
        k.fill();
      } else if (tipo === 'filigrana') {
        // a cantoneira de filigrana do ouro: duas volutas e a estrela
        k.strokeStyle = cor;
        k.lineWidth = 2.2;
        k.beginPath();
        k.moveTo(-14, 34);
        k.bezierCurveTo(-14, 6, 6, -14, 34, -14);
        k.stroke();
        k.lineWidth = 1.6;
        for (const [ax, ay, dx, dy] of [[-14, 34, 1, 0], [34, -14, 0, 1]]) {
          k.beginPath();
          k.arc(ax + dx * 7, ay + dy * 7, 7, 0, Math.PI * 1.6);
          k.stroke();
        }
        estrelinha(k, 4, 4, 9, cor);
      } else if (tipo === 'pesponto') {
        // o canto do pesponto: um ponto em cruz
        k.strokeStyle = cor;
        k.lineWidth = 2;
        k.beginPath();
        k.moveTo(-6, -6);
        k.lineTo(6, 6);
        k.moveTo(6, -6);
        k.lineTo(-6, 6);
        k.stroke();
      }
      k.restore();
    }
    k.restore();
  }
  // O que muda em cada material: o fundo, a cor das letras, dos filetes e o enfeite.
  const MOLDURAS = {
    linho: { pintar: tecidoDeLinho, letra: '#3b3120', filete: 'rgba(59,49,32,.45)', luz: 'rgba(255,250,236,.6)', janela: 'rgba(43,34,18,.85)', enfeite: 'traco', cantos: 'pesponto', pesponto: true },
    bronze: { pintar: (k, w, h, r) => folhaDeMetal(k, w, h, r, METAIS.bronze, { escuro: '40,18,4', claro: '255,226,190', batido: true, escovado: false }),
      letra: '#24120a', filete: 'rgba(40,18,4,.6)', luz: 'rgba(255,226,190,.45)', janela: 'rgba(36,16,2,.85)', enfeite: 'traco', cantos: 'rebite', corCanto: '#7a4a20', claroCanto: '#f0c08a' },
    prata: { pintar: (k, w, h, r) => folhaDeMetal(k, w, h, r, METAIS.prata, { escuro: '30,36,48', claro: '255,255,255', guilloche: true }),
      letra: '#1d222b', filete: 'rgba(30,36,48,.5)', luz: 'rgba(255,255,255,.7)', janela: 'rgba(24,28,36,.8)', enfeite: 'traco', cantos: 'roseta', corCanto: 'rgba(30,36,48,.7)' },
    ouro: { pintar: (k, w, h, r) => folhaDeMetal(k, w, h, r, METAIS.ouro), letra: '#2a1d04', filete: 'rgba(70,46,6,.55)', luz: 'rgba(255,248,214,.5)',
      janela: 'rgba(60,40,4,.75)', enfeite: 'estrela', papel: '#b8862a', cantos: 'filigrana', corCanto: 'rgba(70,46,6,.8)', cartela: true },
    gloria: { cheia: true, pintar: madreperola, letra: '#3d300c', filete: 'rgba(120,96,60,.5)', luz: 'rgba(255,255,255,.8)', janela: 'rgba(120,96,60,.6)', enfeite: 'estrela', papel: '#d9b860' },
  };
  // As medidas da carta (em 1000 x 1400): a janela da ilustração e o papel do texto. A máscara
  // do brilho (mascaraDoBrilho) e o CSS usam as mesmas, para o brilho ficar fora do texto.
  // A ilustração é desenhada em 888 x 846 e entra cortada em cima e embaixo (ILU_CORTE).
  const JX = 56;
  const JY = 118;
  const JW = CW - 112;
  const JH = 800;
  const ILU_H = 846;
  const ILU_CORTE = (ILU_H - JH) / 2;
  const PY = JY + JH + 16;
  const PH = CH - 56 - PY;
  // A moldura da glória: o aro de ouro grosso por fora (0 a 16), a faixa de madrepérola e o
  // filete de ouro de dentro (44 a 52). A arte cheia fica só dentro dela (ARTE_CHEIA: de FAIXA
  // até um pouco abaixo do alto do papel, que a cobre), nunca embaixo nem dos lados do papel.
  const FAIXA = 52;
  const ARO = 16;
  // Na glória o papel sobe um pouco (PY_CHEIA), para a arte caber inteira na largura do vão.
  const PY_CHEIA = 898;
  const ARTE_CHEIA = { x: FAIXA, y: FAIXA, w: CW - 2 * FAIXA, h: PY_CHEIA + 8 - FAIXA };
  // A margem da arte que fica de fora na arte cheia e na miniatura: a beirada de cada desenho
  // tem filete, vinheta e grão que só servem dentro da janela.
  const ARTE_MARGEM = 40;
  // o papel da glória: de lado a lado do vão, do alto do papel até o filete de dentro
  const PAPEL_CHEIO = { x: FAIXA, y: PY_CHEIA, w: CW - 2 * FAIXA, h: CH - FAIXA - PY_CHEIA };
  // A ilustração e a silhueta dos objetos dela (para a máscara do brilho), guardadas por id:
  // desenhar a arte é o que mais custa, e a carta viva, a miniatura e a máscara a usam.
  const GUARDADAS = new Map();
  function ilustracao(carta) {
    const id = carta.id;
    if (GUARDADAS.has(id)) return GUARDADAS.get(id);
    const ilu = tela(JW, ILU_H);
    const obj = tela(JW, ILU_H);
    const ko = obj.getContext('2d');
    ko.fillStyle = '#000';
    ko.strokeStyle = '#000';
    (DESENHOS[id] || desenhoEmBreve)(ilu.getContext('2d'), JW, ILU_H, ko);
    grao(ilu.getContext('2d'), JW, ILU_H, 16, 5000 + (carta.numero || 0));
    const v = { ilu, obj };
    GUARDADAS.set(id, v);
    if (GUARDADAS.size > 6) GUARDADAS.delete(GUARDADAS.keys().next().value);
    return v;
  }
  // Onde a arte entra: na janela (cortada em cima e embaixo) ou cheia (glória): cobrindo o
  // retângulo ARTE_CHEIA sem a margem do desenho, recortada no vão de dentro da moldura. Nada
  // da arte passa para baixo do papel nem para a moldura (nada de pixel esticado).
  function porArte(k, img, cheia) {
    k.imageSmoothingQuality = 'high';
    if (cheia) {
      const A = ARTE_CHEIA;
      const sw = JW - 2 * ARTE_MARGEM;
      const sh = ILU_H - 2 * ARTE_MARGEM;
      const e = Math.max(A.w / sw, A.h / sh);
      const uw = A.w / e;
      const uh = A.h / e;
      k.save();
      k.beginPath();
      k.rect(A.x, A.y, A.w, A.h);
      k.clip();
      retRedondo(k, FAIXA, FAIXA, CW - 2 * FAIXA, CH - 2 * FAIXA, 26);
      k.clip();
      k.drawImage(img, ARTE_MARGEM + (sw - uw) / 2, ARTE_MARGEM + (sh - uh) / 2, uw, uh, A.x, A.y, A.w, A.h);
      k.restore();
    } else k.drawImage(img, 0, ILU_CORTE, JW, JH, JX, JY, JW, JH);
  }
  // O rótulo do alto: o álbum e o número. No ouro e na glória ele vai numa plaqueta (a
  // cartela de ouro, de cantos recortados, e a pílula de madrepérola); a máscara do brilho
  // (mascaraDoBrilho e mascaraDoRotulo) recorta exatamente a mesma forma, para a beirada da
  // plaqueta sair nítida com a carta inclinada.
  const textoDoRotulo = (carta) => String(carta.album || '').toUpperCase() + '  ·  ' + carta.numero + '/' + (carta.total || 13);
  function plaqueta(k, carta, M) {
    const wr = medir(k, textoDoRotulo(carta), oswald(32, 600), 4.5);
    if (M.cheia) return { wr, forma: redondo(CW / 2 - wr / 2 - 62, 44, wr + 124, 54, 27), x: CW / 2 - wr / 2 - 62, y: 44, w: wr + 124, h: 54 };
    if (M.cartela) {
      const w = wr + 132;
      const x = CW / 2 - w / 2;
      return { wr, forma: cartela(x, 46, w, 56, 12), x, y: 46, w, h: 56 };
    }
    return { wr, forma: null };
  }
  // A cartela: o retângulo com os quatro cantos recortados para dentro.
  function cartela(x, y, w, h, q) {
    const p = new Path2D();
    p.moveTo(x + q, y);
    p.lineTo(x + w - q, y);
    p.arc(x + w, y, q, Math.PI, Math.PI / 2, true);
    p.lineTo(x + w, y + h - q);
    p.arc(x + w, y + h, q, Math.PI * 1.5, Math.PI, true);
    p.lineTo(x + q, y + h);
    p.arc(x, y + h, q, 0, -Math.PI / 2, true);
    p.lineTo(x, y + q);
    p.arc(x, y, q, Math.PI / 2, 0, true);
    p.closePath();
    return p;
  }
  function rotuloDoAlto(k, carta, M) {
    const rotulo = textoDoRotulo(carta);
    const P = plaqueta(k, carta, M);
    const wr = P.wr;
    if (M.cheia) {
      // na arte cheia, numa plaqueta de madrepérola, para ler sobre qualquer arte
      k.save();
      k.filter = 'blur(8px)';
      k.fillStyle = 'rgba(20,16,8,.35)';
      retRedondo(k, P.x - 4, P.y + 6, P.w + 8, P.h, 27);
      k.fill();
      k.restore();
      k.save();
      k.clip(P.forma);
      k.translate(P.x, P.y);
      madreperola(k, P.w, P.h, sorteio(5), 2);
      k.restore();
      k.strokeStyle = M.papel;
      k.lineWidth = 3;
      k.stroke(P.forma);
    } else if (M.cartela) {
      // no ouro, a cartela de ouro gravada: a folha mais clara, o contorno escuro e o filete
      k.save();
      k.translate(1.5, 3);
      k.fillStyle = 'rgba(60,36,0,.45)';
      k.fill(P.forma);
      k.restore();
      const g = k.createLinearGradient(0, P.y, 0, P.y + P.h);
      g.addColorStop(0, '#fff1c2');
      g.addColorStop(0.5, '#f1cd78');
      g.addColorStop(1, '#d9a845');
      k.fillStyle = g;
      k.fill(P.forma);
      k.save();
      k.clip(P.forma);
      k.strokeStyle = 'rgba(110,72,8,.16)';
      k.lineWidth = 1;
      for (let x = P.x; x < P.x + P.w; x += 4) { k.beginPath(); k.moveTo(x, P.y); k.lineTo(x, P.y + P.h); k.stroke(); }
      k.restore();
      k.strokeStyle = '#4a3006';
      k.lineWidth = 2.5;
      k.stroke(P.forma);
      k.strokeStyle = 'rgba(74,48,6,.55)';
      k.lineWidth = 1.2;
      k.stroke(cartela(P.x + 6, P.y + 6, P.w - 12, P.h - 12, 8));
    }
    escrever(k, rotulo, CW / 2, 84, oswald(32, 600), M.letra, { alinhar: 'center', espaco: 4.5 });
    if (M.enfeite === 'estrela') {
      estrelinha(k, CW / 2 - wr / 2 - 30, 72, 12, M.letra);
      estrelinha(k, CW / 2 + wr / 2 + 30, 72, 12, M.letra);
    } else {
      k.fillStyle = M.letra;
      k.globalAlpha = 0.55;
      for (const lado of [-1, 1]) k.fillRect(CW / 2 + lado * (wr / 2 + 26) - (lado < 0 ? 40 : 0), 71, 40, 2.5);
      k.globalAlpha = 1;
    }
  }
  // A máscara do resto do brilho (o metal e o reflexo): tudo menos a plaqueta do rótulo, com a
  // mesma forma dela. Sem plaqueta, fica a elipse macia do CSS (--sem-rotulos).
  function mascaraDoRotulo(carta, rar) {
    const M = MOLDURAS[rar];
    const w = 400;
    const c = tela(w, w * 1.4);
    const k = c.getContext('2d');
    k.setTransform(w / CW, 0, 0, w / CW, 0, 0);
    const P = plaqueta(k, carta, M);
    if (!P.forma) return null;
    k.fillStyle = '#000';
    k.fillRect(0, 0, CW, CH);
    k.globalCompositeOperation = 'destination-out';
    k.fill(P.forma);
    return c;
  }
  // A moldura (o material e os filetes); na glória, a faixa de madrepérola por cima da arte.
  function moldura(k, M, r, rar) {
    if (M.cheia) {
      // a madrepérola: de ARO até FAIXA, com as cores do nácar à vista mesmo parada
      k.save();
      const banda = new Path2D();
      banda.addPath(redondo(ARO, ARO, CW - 2 * ARO, CH - 2 * ARO, 36));
      banda.addPath(redondo(FAIXA, FAIXA, CW - 2 * FAIXA, CH - 2 * FAIXA, 26));
      k.clip(banda, 'evenodd');
      madreperola(k, CW, CH, r);
      k.restore();
      // o ouro: o aro grosso por fora e o filete de dentro, em folha com gravura fina
      const go = k.createLinearGradient(0, 0, CW, CH);
      METAIS.ouro.forEach(([q, cor]) => go.addColorStop(q, cor));
      const anelDeOuro = (fora, dentro) => {
        const a = new Path2D();
        a.addPath(fora);
        a.addPath(dentro);
        k.save();
        k.clip(a, 'evenodd');
        k.fillStyle = go;
        k.fillRect(0, 0, CW, CH);
        k.strokeStyle = 'rgba(90,60,10,.22)';
        k.lineWidth = 1.2;
        for (let i = -CH; i < CW + CH; i += 7) { k.beginPath(); k.moveTo(i, 0); k.lineTo(i - CH * 0.55, CH); k.stroke(); }
        k.restore();
      };
      anelDeOuro(redondo(0, 0, CW, CH, 46), redondo(ARO, ARO, CW - 2 * ARO, CH - 2 * ARO, 36));
      anelDeOuro(redondo(FAIXA - 9, FAIXA - 9, CW - 2 * FAIXA + 18, CH - 2 * FAIXA + 18, 32), redondo(FAIXA, FAIXA, CW - 2 * FAIXA, CH - 2 * FAIXA, 26));
      // os relevos: a luz na beira de fora de cada ouro e a sombra na de dentro
      k.lineWidth = 2;
      k.strokeStyle = 'rgba(255,248,214,.85)';
      retRedondo(k, 3, 3, CW - 6, CH - 6, 44);
      k.stroke();
      retRedondo(k, FAIXA - 8, FAIXA - 8, CW - 2 * FAIXA + 16, CH - 2 * FAIXA + 16, 31);
      k.stroke();
      k.strokeStyle = 'rgba(70,44,4,.75)';
      retRedondo(k, ARO, ARO, CW - 2 * ARO, CH - 2 * ARO, 36);
      k.stroke();
      retRedondo(k, FAIXA, FAIXA, CW - 2 * FAIXA, CH - 2 * FAIXA, 26);
      k.stroke();
      k.strokeStyle = 'rgba(0,0,0,.35)';
      k.lineWidth = 4;
      retRedondo(k, FAIXA + 2, FAIXA + 3, CW - 2 * FAIXA - 4, CH - 2 * FAIXA - 4, 25);
      k.stroke();
      return;
    }
    M.pintar(k, CW, CH, r);
    k.lineWidth = 2;
    k.strokeStyle = M.filete;
    retRedondo(k, 20, 20, CW - 40, CH - 40, 30);
    k.stroke();
    k.strokeStyle = M.luz;
    retRedondo(k, 23, 23, CW - 46, CH - 46, 28);
    k.stroke();
    if (M.pesponto) {
      k.save();
      k.setLineDash([10, 7]);
      k.lineWidth = 2.2;
      k.strokeStyle = 'rgba(70,54,30,.6)';
      retRedondo(k, 32, 32, CW - 64, CH - 64, 24);
      k.stroke();
      k.restore();
    }
    enfeiteDosCantos(k, M.cantos, M.corCanto || M.letra, M.claroCanto || '#fff');
  }
  function desenharFrente(c, carta) {
    const k = c.getContext('2d');
    const s = c.width / CW;
    k.save();
    k.setTransform(s, 0, 0, s, 0, 0);
    const r = sorteio(9000 + carta.id.length * 97 + (carta.numero || 0));
    const rar = raridadeDe(carta);
    const R = RARIDADES[rar];
    const M = MOLDURAS[rar];
    const { ilu } = ilustracao(carta);
    retRedondo(k, 0, 0, CW, CH, 46);
    k.save();
    k.clip();
    if (M.cheia) {
      porArte(k, ilu, true);
      // a luz da glória, parada no papel: o clarão no alto e os raios finos, simétricos
      k.save();
      k.beginPath();
      k.rect(ARTE_CHEIA.x, ARTE_CHEIA.y, ARTE_CHEIA.w, ARTE_CHEIA.h);
      k.clip();
      k.save();
      k.globalCompositeOperation = 'screen';
      k.lineCap = 'round';
      for (let i = 0; i < 72; i++) {
        const a = Math.PI / 2 + ((i + 0.5) / 72 - 0.5) * 2.6;
        const g = k.createLinearGradient(CW / 2, -60, CW / 2 + Math.cos(a) * 1100, -60 + Math.sin(a) * 1100);
        g.addColorStop(0, 'rgba(255,244,214,' + (i % 2 ? 0.16 : 0.3) + ')');
        g.addColorStop(0.75, 'rgba(255,244,214,0)');
        k.strokeStyle = g;
        k.lineWidth = i % 2 ? 2 : 4;
        k.beginPath();
        k.moveTo(CW / 2, -60);
        k.lineTo(CW / 2 + Math.cos(a) * 1100, -60 + Math.sin(a) * 1100);
        k.stroke();
      }
      // nas artes claras o clarão some; ali os raios entram como traço de ouro fino
      k.save();
      k.globalAlpha = 0.16;
      k.strokeStyle = '#b8862a';
      k.lineWidth = 1.5;
      for (let i = 0; i < 72; i += 2) {
        const a = Math.PI / 2 + ((i + 0.5) / 72 - 0.5) * 2.6;
        k.beginPath();
        k.moveTo(CW / 2 + Math.cos(a) * 160, -60 + Math.sin(a) * 160);
        k.lineTo(CW / 2 + Math.cos(a) * 1100, -60 + Math.sin(a) * 1100);
        k.stroke();
      }
      k.restore();
      k.restore();
      brilho(k, CW / 2, 0, 640, 'rgba(255,236,190,.5)', 'screen');
      k.restore();
    }
    moldura(k, M, r, rar);
    // na glória, a filigrana menor, na faixa de madrepérola (sem entrar no vão nem no papel)
    if (M.cheia) enfeiteDosCantos(k, 'filigrana', 'rgba(150,110,30,.9)', '#fff', { recuo: 30, escala: 0.62 });
    rotuloDoAlto(k, carta, M);
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
      porArte(k, ilu, false);
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
    // o papel do texto (na glória, de lado a lado do vão, com a beirada de cima translúcida
    // sobre a arte, que termina embaixo dele)
    const py = M.cheia ? PY_CHEIA : PY;
    const ph = M.cheia ? CH - FAIXA - 8 - PY_CHEIA : PH;
    const papel = M.cheia ? PAPEL_CHEIO : { x: JX, y: py, w: JW, h: ph };
    if (M.cheia) {
      k.save();
      retRedondo(k, FAIXA, FAIXA, CW - 2 * FAIXA, CH - 2 * FAIXA, 26);
      k.clip();
      const gv = k.createLinearGradient(0, py - 40, 0, py + 4);
      gv.addColorStop(0, 'rgba(236,229,207,0)');
      gv.addColorStop(0.6, 'rgba(236,229,207,.55)');
      gv.addColorStop(1, 'rgba(236,229,207,.96)');
      k.fillStyle = gv;
      k.fillRect(FAIXA, py - 40, CW - 2 * FAIXA, 44);
      k.restore();
    } else {
      k.save();
      k.filter = 'blur(6px)';
      k.fillStyle = 'rgba(0,0,0,.3)';
      retRedondo(k, JX + 2, py + 5, JW, ph, 22);
      k.fill();
      k.restore();
    }
    k.save();
    if (M.cheia) {
      retRedondo(k, FAIXA, FAIXA, CW - 2 * FAIXA, CH - 2 * FAIXA, 26);
      k.clip();
      k.beginPath();
      k.rect(papel.x, papel.y, papel.w, papel.h);
    } else retRedondo(k, JX, py, JW, ph, 22);
    k.clip();
    k.fillStyle = COR.papel;
    k.fillRect(papel.x, papel.y, papel.w, papel.h);
    brilho(k, CW / 2, py + ph * 0.4, 520, 'rgba(255,252,240,.5)');
    for (let i = 0; i < 2400; i++) {
      k.fillStyle = r() < 0.6 ? 'rgba(90,80,50,' + (0.03 + r() * 0.06).toFixed(3) + ')' : 'rgba(255,255,250,.3)';
      k.fillRect(papel.x + r() * papel.w, papel.y + r() * papel.h, 1 + r() * 3, 1);
    }
    const gb = k.createLinearGradient(0, papel.y, 0, papel.y + papel.h);
    gb.addColorStop(0, 'rgba(60,50,20,.10)');
    gb.addColorStop(0.15, 'rgba(60,50,20,0)');
    gb.addColorStop(0.85, 'rgba(60,50,20,0)');
    gb.addColorStop(1, 'rgba(60,50,20,.12)');
    k.fillStyle = gb;
    k.fillRect(papel.x, papel.y, papel.w, papel.h);
    k.restore();
    if (M.cheia) {
      // o filete de ouro que separa a arte do papel
      const gl = k.createLinearGradient(FAIXA, 0, CW - FAIXA, 0);
      gl.addColorStop(0, M.papel);
      gl.addColorStop(0.5, '#ffe7a0');
      gl.addColorStop(1, M.papel);
      k.fillStyle = 'rgba(70,44,4,.55)';
      k.fillRect(FAIXA, py + 1, CW - 2 * FAIXA, 2);
      k.fillStyle = gl;
      k.fillRect(FAIXA, py + 3, CW - 2 * FAIXA, 4);
    } else {
      k.lineWidth = 2;
      k.strokeStyle = M.janela;
      retRedondo(k, JX, py, JW, ph, 22);
      k.stroke();
    }
    if (M.papel) {
      // o ouro e a glória levam o filete de folha também no papel
      k.lineWidth = 3;
      const gf = k.createLinearGradient(JX, py, JX + JW, py + ph);
      gf.addColorStop(0, M.papel);
      gf.addColorStop(0.5, '#ffe7a0');
      gf.addColorStop(1, M.papel);
      k.strokeStyle = gf;
      retRedondo(k, JX + 10, py + 10, JW - 20, ph - 20, 14);
      k.stroke();
    }
    // o texto: título 64, "Você sabia?" 28, a frase 44, o pé 32 (a 330 px de largura na
    // tela, o título fica com 21 px, a frase com 14,5 e o pé com 10,5)
    const x0 = JX + 44;
    const larg = JW - 88;
    let tT = 64;
    k.font = literata(tT);
    while (k.measureText(carta.titulo).width > larg && tT > 48) { tT -= 2; k.font = literata(tT); }
    escrever(k, carta.titulo, x0, py + 76, literata(tT), COR.tinta, { espaco: -0.5 });
    escrever(k, 'VOCÊ SABIA?', x0, py + 124, oswald(28, 600), COR.salviaEscura, { espaco: 4 });
    let tS = 44;
    let linhas = quebrar(k, carta.sabia, manrope(tS, 600), larg);
    while (linhas.length > 3 && tS > 38) { tS -= 2; linhas = quebrar(k, carta.sabia, manrope(tS, 600), larg); }
    linhas.slice(0, 3).forEach((l, i) => escrever(k, l, x0, py + 178 + i * (tS + 9), manrope(tS, 600), '#2b2c25'));
    // o pé: a referência e a raridade (ícone e nome, nunca só a cor)
    const yPe = py + ph - 32;
    // o filete do pé, aberto no meio para a marca (o símbolo e GERAÇÃO ELEITA, pequenos)
    const yM = yPe - 53;
    const marca = 'GERAÇÃO ELEITA';
    const wm = medir(k, marca, oswald(21, 600), 5.5);
    const hl = 26;
    const wl = CC.story && CC.CAMINHO_SIMBOLO ? hl * 1357 / 1936 : 0;
    const wTot = wl + (wl ? 10 : 0) + wm;
    const xm = CW / 2 - wTot / 2;
    k.fillStyle = 'rgba(35,36,30,.18)';
    k.fillRect(x0, yM - 1, xm - 18 - x0, 2);
    k.fillRect(xm + wTot + 18, yM - 1, x0 + larg - (xm + wTot + 18), 2);
    if (wl) CC.story.logo(k, xm, yM - hl / 2 - 1, hl, 'rgba(69,70,60,.78)');
    escrever(k, marca, xm + wl + (wl ? 10 : 0), yM + 7.5, oswald(21, 600), 'rgba(69,70,60,.78)', { espaco: 5.5 });
    escrever(k, String(carta.ref || '').toUpperCase(), x0, yPe, oswald(32, 600), '#45463c', { espaco: 3 });
    const wn = medir(k, R.nome.toUpperCase(), oswald(32, 600), 3.5);
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
  // A máscara do brilho (canvas pequeno, só alfa): onde o holográfico pode aparecer. Fica nas
  // luzes da arte (pela luminância) e na moldura; sai de cima dos objetos desenhados (a
  // silhueta que o desenho marca) e de todo o texto (o papel e o rótulo do alto).
  function mascaraDoBrilho(carta, rar) {
    const w = 200;
    const h = 280;
    const c = tela(w, h);
    const k = c.getContext('2d');
    const M = MOLDURAS[rar];
    const { ilu, obj } = ilustracao(carta);
    k.setTransform(w / CW, 0, 0, h / CH, 0, 0);
    if (M.cheia) porArte(k, ilu, true);
    else {
      k.save();
      retRedondo(k, JX, JY, JW, JH, 22);
      k.clip();
      porArte(k, ilu, false);
      k.restore();
    }
    k.setTransform(1, 0, 0, 1, 0, 0);
    const img = k.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
      const t = Math.max(0, Math.min(1, (l - 0.3) / 0.55));
      d[i + 3] = d[i + 3] ? Math.round(255 * t * t * (3 - 2 * t)) : 0;
      d[i] = d[i + 1] = d[i + 2] = 0;
    }
    k.putImageData(img, 0, 0);
    k.setTransform(w / CW, 0, 0, h / CH, 0, 0);
    // fora dos objetos
    k.globalCompositeOperation = 'destination-out';
    k.globalAlpha = 0.9;
    k.filter = 'blur(2px)';
    porArte(k, obj, !!M.cheia);
    k.filter = 'none';
    k.globalAlpha = 1;
    // fora do texto: o papel e a plaqueta do rótulo (a forma exata dela)
    const P = plaqueta(k, carta, M);
    const tirarTexto = () => {
      k.fillStyle = '#000';
      if (M.cheia) k.fillRect(PAPEL_CHEIO.x - 4, PAPEL_CHEIO.y - 6, PAPEL_CHEIO.w + 8, PAPEL_CHEIO.h + 10);
      else { retRedondo(k, JX - 6, PY - 6, JW + 12, PH + 12, 26); k.fill(); }
      if (P.forma) k.fill(P.forma);
      else { retRedondo(k, CW / 2 - 300, 36, 600, 72, 36); k.fill(); }
    };
    tirarTexto();
    // a moldura inteira entra
    k.globalCompositeOperation = 'source-over';
    k.save();
    k.clip(M.cheia ? vazado(FAIXA, FAIXA, CW - 2 * FAIXA, CH - 2 * FAIXA, 26) : vazado(JX - 6, JY - 6, JW + 12, JH + 12, 26), 'evenodd');
    k.fillRect(0, 0, CW, CH);
    k.globalCompositeOperation = 'destination-out';
    tirarTexto();
    k.restore();
    return c;
  }
  // O verso: o desenho aprovado (o campo escuro com as curvas de nível, o medalhão com o anel
  // fino e o símbolo creme, centrado) com a moldura no material da raridade e o anel na cor dela.
  const VERSOS = {
    linho: { anel: '#e8dcc4' },
    bronze: { anel: '#e0a466' },
    prata: { anel: '#e6ebf3' },
    ouro: { anel: '#ffc44d' },
    gloria: { anel: '#fff1c8', duplo: true },
  };
  const MARGEM_VERSO = 30;
  function desenharCostas(c, raridade, semTexto) {
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
    M.pintar(k, CW, CH, r);
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
    // o medalhão com o símbolo, no centro exato
    k.fillStyle = '#151612';
    k.beginPath();
    k.arc(CW / 2, CH / 2, 160, 0, Math.PI * 2);
    k.fill();
    k.strokeStyle = V.anel;
    k.lineWidth = 5;
    k.stroke();
    if (V.duplo) {
      k.lineWidth = 2;
      k.beginPath();
      k.arc(CW / 2, CH / 2, 148, 0, Math.PI * 2);
      k.stroke();
    }
    k.strokeStyle = 'rgba(242,236,216,.3)';
    k.lineWidth = 1.5;
    k.beginPath();
    k.arc(CW / 2, CH / 2, 176, 0, Math.PI * 2);
    k.stroke();
    if (CC.story && CC.CAMINHO_SIMBOLO) {
      // o símbolo inteiro (1357 x 1936) com a altura de 190, centrado no medalhão
      const h = 190;
      CC.story.logo(k, CW / 2 - h * 1357 / 1936 / 2, CH / 2 - h / 2, h, COR.creme);
    }
    if (!semTexto) escrever(k, 'GERAÇÃO ELEITA', CW / 2, CH - 110, oswald(30, 600), 'rgba(242,236,216,.72)', { alinhar: 'center', espaco: 8 });
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
  // A miniatura do álbum: a moldura e a arte no mesmo enquadramento da carta inteira (nada de
  // corte novo, para o objeto principal nunca sair da miniatura) e, no lugar do texto, o
  // ícone da raridade num selo grande, para ler pequeno.
  function desenharMiniatura(c, carta) {
    const k = c.getContext('2d');
    const s = c.width / CW;
    k.save();
    k.setTransform(s, 0, 0, s, 0, 0);
    const rar = raridadeDe(carta);
    const R = RARIDADES[rar];
    const M = MOLDURAS[rar];
    const r = sorteio(9100 + (carta.numero || 0));
    const { ilu } = ilustracao(carta);
    retRedondo(k, 0, 0, CW, CH, 46);
    k.clip();
    let papel;
    if (M.cheia) {
      porArte(k, ilu, true);
      moldura(k, M, r, rar);
      papel = PAPEL_CHEIO;
      k.save();
      retRedondo(k, FAIXA, FAIXA, CW - 2 * FAIXA, CH - 2 * FAIXA, 26);
      k.clip();
      k.fillStyle = COR.papel;
      k.fillRect(papel.x, papel.y, papel.w, papel.h);
      k.restore();
      k.fillStyle = M.papel;
      k.fillRect(FAIXA, PY_CHEIA, CW - 2 * FAIXA, 6);
    } else {
      moldura(k, M, r, rar);
      k.save();
      retRedondo(k, JX, JY, JW, JH, 22);
      k.clip();
      porArte(k, ilu, false);
      k.restore();
      k.lineWidth = 4;
      k.strokeStyle = M.janela;
      retRedondo(k, JX, JY, JW, JH, 22);
      k.stroke();
      papel = { x: JX, y: PY, w: JW, h: PH };
      k.fillStyle = COR.papel;
      retRedondo(k, JX, PY, JW, PH, 22);
      k.fill();
      k.lineWidth = 3;
      k.strokeStyle = M.janela;
      k.stroke();
    }
    // o ícone num selo, no meio do papel
    const cy = papel.y + papel.h / 2;
    const rs = 150;
    k.fillStyle = 'rgba(255,252,240,.6)';
    k.beginPath();
    k.arc(CW / 2, cy, rs, 0, Math.PI * 2);
    k.fill();
    k.lineWidth = 7;
    k.strokeStyle = R.tinta;
    k.stroke();
    iconeCanvas(k, rar, CW / 2 - rs * 0.7, cy - rs * 0.7, rs * 1.4, R.tinta, { traco: 1.9, cheio: 0.25 });
    k.lineWidth = 3;
    k.strokeStyle = 'rgba(0,0,0,.45)';
    retRedondo(k, 1.5, 1.5, CW - 3, CH - 3, 45);
    k.stroke();
    k.restore();
    return c;
  }
  // A carta, por fora: desenharCarta(carta, { largura, raridade, semTexto, canvas }) devolve o
  // canvas. largura é a do canvas em px (padrão 1000; a altura é 1,4 vez); semTexto dá a
  // miniatura do álbum (moldura, arte e o selo da raridade, sem letra nenhuma). Ainda aceita
  // a forma antiga desenharCarta(canvas, carta).
  function desenharCarta(a, b) {
    let carta = a;
    let op = b || {};
    let c;
    if (a && a.getContext) { c = a; carta = b; op = {}; } else {
      const larg = Math.max(40, Math.round(op.largura || CW));
      c = op.canvas || tela(larg, Math.round(larg * 1.4));
    }
    if (op.raridade) carta = { ...carta, raridade: op.raridade };
    return op.semTexto ? desenharMiniatura(c, carta) : desenharFrente(c, carta);
  }
  // O verso: desenharVerso({ largura, raridade, semTexto, canvas }) devolve o canvas; semTexto
  // tira o "GERAÇÃO ELEITA" do pé (fica só o símbolo). Aceita a forma antiga (canvas, raridade).
  function desenharVerso(a, b) {
    if (a && a.getContext) return desenharCostas(a, b, false);
    const op = a || {};
    const larg = Math.max(40, Math.round(op.largura || CW));
    return desenharCostas(op.canvas || tela(larg, Math.round(larg * 1.4)), op.raridade, !!op.semTexto);
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
  const ARTE_CLARA = new Set(['davi-funda', 'poco-jaco', 'tumulo-vazio']);
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
    if (ARTE_CLARA.has(carta.id)) el.dataset.arte = 'clara';
    // o holográfico do ouro e da glória só nas luzes e na moldura, fora dos objetos e do texto
    if (rar === 'ouro' || rar === 'gloria') {
      try { el.style.setProperty('--mascara', 'url(' + mascaraDoBrilho(carta, rar).toDataURL() + ')'); } catch (e) { /* sem máscara, fica o recorte do CSS */ }
      try {
        const mr = mascaraDoRotulo(carta, rar);
        if (mr) el.style.setProperty('--sem-rotulos', 'url(' + mr.toDataURL() + ')');
      } catch (e) { /* fica a elipse macia */ }
    }
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
  // revelar(el, carta, opts) faz tudo, do baú fechado à carta aberta, e devolve uma Promise
  // que resolve quando a revelação termina ou é pulada. A linha do tempo (cartas-raridade.md):
  //   0-400 ms    o baú balança;
  //   400-700     a tampa abre na dobradiça e sobe a luz na cor da raridade (a de verdade);
  //   700-1300    o verso sobe de dentro do baú, com a aura, o ícone e o nome da raridade;
  //   espera      a carta pulsa forte; vira sozinha em 3 s, ou no toque;
  //   vira        450 ms;
  //   brilho      700 ms (prata e ouro: varredura holográfica de 900; ouro: purpurina;
  //               glória: mais 400 de halo);
  //   fim         a legenda ("Nova! Você tem 9 de 13 em Objetos"), o título e a referência;
  //               a carta fica inclinável.
  // "Pular" fica à vista até o fim. Menos movimento: sem balanço nem giro; o baú some e a
  // carta aparece de frente (troca suave), com o halo parado e o nome. Sem som. Só transform
  // e opacity animam (nada de layout), para correr liso num Android médio.
  // O baú é o mesmo da Trilha (CC.arte.bau('pronto', 'madeira'), 01c-arte.js), em tamanho
  // grande e partido em peças: o corpo, a boca (a do baú "aberto") e a tampa, com a face de
  // fora (a fechada, com a fechadura) e a de dentro (a tampa do "aberto", que fica inclinada).
  let ESCALA_TEMPO = 1;
  // A cópia do desenho, para quando a peça roda fora do app (a amostra). No app, o desenho
  // vem do próprio CC.arte.bau, então os dois baús não se separam.
  const BAU_COPIA = {
    pronto: '<svg viewBox="0 0 120 110"><ellipse cx="60" cy="102" rx="44" ry="7" fill="currentColor" opacity=".12"/><rect x="14" y="50" width="92" height="48" rx="10" fill="#b07a42"/><rect x="14" y="80" width="92" height="18" rx="8" fill="#82552b"/><rect x="30" y="50" width="10" height="48" fill="#d2a24e"/><rect x="80" y="50" width="10" height="48" fill="#d2a24e"/>'
      + '<g class="tampa"><rect x="14" y="26" width="92" height="30" rx="10" fill="#b07a42"/><rect x="14" y="44" width="92" height="12" fill="#82552b"/><rect x="30" y="26" width="10" height="30" fill="#d2a24e"/><rect x="80" y="26" width="10" height="30" fill="#d2a24e"/></g>'
      + '<rect x="48" y="44" width="24" height="24" rx="7" fill="#d2a24e"/><rect x="48" y="58" width="24" height="10" rx="4" fill="#9e7328"/><circle cx="60" cy="54" r="4" fill="#82552b"/></svg>',
    aberto: '<svg viewBox="0 0 120 110"><g class="tampa aberta"><g transform="rotate(-14 60 47)"><rect x="18" y="20" width="84" height="27" rx="9" fill="#b07a42"/><rect x="25" y="26" width="70" height="16" rx="7" fill="#82552b"/><rect x="32" y="20" width="10" height="27" fill="#d2a24e"/><rect x="78" y="20" width="10" height="27" fill="#d2a24e"/></g>'
      + '<ellipse cx="60" cy="50" rx="43" ry="8" fill="#82552b"/><ellipse cx="60" cy="51" rx="35" ry="5.5" fill="#1a1a1a" opacity=".75"/><ellipse class="brilho-bau" cx="60" cy="50" rx="20" ry="3.5" fill="#f2f2f2" opacity=".95"/></g></svg>',
  };
  // As peças saem no mesmo quadro (viewBox) e no mesmo lugar, umas por cima das outras: assim
  // balançam juntas e a carta passa entre elas. O quadro corta 10 de cada lado do da Trilha,
  // para o baú ocupar a largura do palco.
  const BAU_QUADRO = '10 0 100 112';
  function bauDaTrilha() {
    const ler = (estado) => {
      const d = document.createElement('div');
      d.innerHTML = CC.arte && CC.arte.bau ? CC.arte.bau(estado, 'madeira') : BAU_COPIA[estado];
      return d.firstElementChild;
    };
    const svg = (classe, ...nos) => {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', BAU_QUADRO);
      s.setAttribute('aria-hidden', 'true');
      s.setAttribute('class', 'rv-svg ' + classe);
      s.append(...nos);
      return s;
    };
    const pronto = ler('pronto');
    const tampa = pronto.querySelector('.tampa');
    const filhos = [...pronto.children];
    const antes = filhos.slice(0, filhos.indexOf(tampa));
    const depois = filhos.slice(filhos.indexOf(tampa) + 1);
    const aberta = ler('aberto').querySelector('.tampa');
    const giro = aberta.querySelector('g');
    const brilho = aberta.querySelector('.brilho-bau');
    if (brilho) brilho.setAttribute('class', 'rv-brilho');
    // a face de dentro é a tampa do "aberto" sem o giro (o CSS faz o giro); desenhada 21 acima
    // (a distância que a dobradiça desce ao abrir), para chegar ao lugar dela no fim
    giro.setAttribute('transform', 'translate(0 -21)');
    return {
      corpo: svg('rv-corpo-svg', ...antes),
      boca: svg('rv-boca-svg', ...aberta.querySelectorAll(':scope > ellipse')),
      fora: svg('rv-tampa-fora', tampa, ...depois),
      dentro: svg('rv-tampa-dentro', giro),
    };
  }
  // A legenda do fim: "Nova!" em destaque quando a frase começa com ela.
  function legendaHtml(texto) {
    const t = CC.esc(texto);
    return t.startsWith('Nova!') ? '<strong>Nova!</strong>' + t.slice(5) : t;
  }
  function revelar(alvo, carta, opts = {}) {
    const rar = RARIDADES[opts.raridade] ? opts.raridade : raridadeDe(carta);
    const c = rar === raridadeDe(carta) ? carta : { ...carta, raridade: rar };
    const R = RARIDADES[rar];
    const menos = menosMovimento();
    const T = (ms) => ms * ESCALA_TEMPO;
    // a largura que vale é a do lugar onde a revelação entra (o baú nunca passa da borda dele)
    const vw = Math.min(window.innerWidth || 390, document.documentElement.clientWidth || 9999, alvo.clientWidth || 9999);
    const vh = window.innerHeight || 844;
    // a carta com 320 a 340 px de largura no celular (menos se a tela for baixa); o baú, maior
    const larg = opts.largura || Math.round(Math.max(220, Math.min(340, vw - 50, (vh - 300) / 1.4)));
    const largBau = Math.round(Math.min(vw - 20, larg + 44));
    // A linha da boca do baú (o meio da boca escura, y 51 no desenho), no palco: o baú
    // fechado fica no meio do palco, desce o que for preciso para a carta estreita caber
    // inteira acima da boca, e nunca passa do pé do palco. u é a unidade do desenho em px.
    const u = largBau / 100;
    const hc = larg * 1.4;
    const S0 = 0.56;
    const yb = Math.round(Math.min(hc + 14 - 47 * u, Math.max((hc + 20) / 2 - 11 * u, S0 * hc - 32)));
    // o recorte da carta enquanto ela sobe: tudo acima da beirada da frente da boca (a metade
    // de baixo da elipse escura), para a carta sair de dentro dela
    const arco = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      arco.push((50 * u + 35 * u * Math.cos(a)).toFixed(1) + 'px ' + (yb + 5.5 * u * Math.sin(a)).toFixed(1) + 'px');
    }
    const boca = 'polygon(-200% -200%, 300% -200%, 300% ' + yb + 'px, ' + arco.join(', ') + ', -200% ' + yb + 'px)';
    const legenda = opts.legenda || ('Nova! ' + (carta.album || ''));
    alvo.innerHTML = '<div class="rv" data-raridade="' + rar + '" data-fase="fechado" style="--luz:' + R.luz + ';--tinta-r:' + R.tinta
      + ';--t:' + ESCALA_TEMPO + ';--lc:' + larg + 'px;--lb:' + largBau + 'px;--yb:' + yb + 'px;--s0:' + S0 + ';--boca:' + boca + '">'
      + '<button type="button" class="botao contorno pequeno rv-pular">Pular</button>'
      + '<div class="rv-palco">'
      + '<i class="rv-raios" aria-hidden="true"></i><i class="rv-aura" aria-hidden="true"></i>'
      + '<div class="rv-bau-pecas" aria-hidden="true"><span class="rv-peca rv-boca"></span><i class="rv-luz"></i>'
      + '<span class="rv-faiscas">' + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => '<i style="--i:' + i + '"></i>').join('') + '</span></div>'
      + '<div class="rv-saida"><div class="rv-carta"><i class="rv-anel" aria-hidden="true"></i></div></div>'
      + '<button type="button" class="rv-bau" aria-label="Abrir o baú"><span class="rv-peca rv-corpo"></span><span class="rv-peca rv-tampa"><span class="rv-dobradica"></span></span></button>'
      + '</div>'
      + '<p class="rv-raridade">' + iconeSvg(rar) + '<span>' + R.nome + '</span></p>'
      + '<div class="rv-fim" tabindex="-1" aria-live="polite"><p class="rv-nova">' + legendaHtml(legenda) + '</p>'
      + '<p class="rv-titulo">' + CC.esc(carta.titulo) + ' <span>' + CC.esc(carta.ref) + '</span></p>'
      + '<div class="rv-botoes"></div></div></div>';
    const rv = alvo.querySelector('.rv');
    const bau = bauDaTrilha();
    rv.querySelector('.rv-corpo').appendChild(bau.corpo);
    rv.querySelector('.rv-boca').appendChild(bau.boca);
    // a tampa é uma peça só, com duas faces: a de fora e, no verso dela, a de dentro
    rv.querySelector('.rv-dobradica').append(bau.fora, bau.dentro);
    const api = cartaViva(c, { largura: larg, verso: true });
    api.el.setAttribute('tabindex', '0');
    rv.querySelector('.rv-carta').appendChild(api.el);
    const botoes = rv.querySelector('.rv-botoes');
    const virar0 = botaoVirar(api);
    virar0.classList.add('botao', 'contorno', 'pequeno');
    botoes.appendChild(virar0);
    if (opts.aoLer) {
      const ler = document.createElement('button');
      ler.type = 'button';
      ler.className = 'botao pequeno rv-ler';
      ler.textContent = 'Ler a história';
      ler.onclick = () => opts.aoLer(carta);
      botoes.appendChild(ler);
    }
    const timers = [];
    const depois = (ms, f) => timers.push(setTimeout(f, T(ms)));
    const fase = (f) => { rv.dataset.fase = f; };
    let virou = false;
    let acabou = false;
    let pulou = false;
    let resolver;
    const fim = new Promise((res) => { resolver = res; });
    const terminar = () => {
      if (acabou) return;
      acabou = true;
      timers.forEach(clearTimeout);
      fase('fim');
      api.soltar();
      // o foco vai para o fim (a legenda é lida); "Ler a história", se houver, fica a um Tab
      const foco = rv.querySelector('.rv-fim');
      try { foco.focus({ preventScroll: true }); } catch (e) { /* sem foco */ }
      resolver({ pulou, carta: api, el: rv });
    };
    const brilhar = () => {
      fase('brilha');
      const dur = rar === 'prata' || rar === 'ouro' ? 900 : rar === 'gloria' ? 900 : 700;
      api.varrer(T(dur), () => {
        if (rar === 'gloria') { rv.classList.add('com-halo'); depois(400, terminar); } else terminar();
      });
    };
    const virar = () => {
      if (virou || acabou) return;
      virou = true;
      timers.forEach(clearTimeout);
      fase('vira');
      api.girarPara(0, T(450), brilhar);
    };
    const pular = () => {
      if (acabou) return;
      pulou = true;
      timers.forEach(clearTimeout);
      virou = true;
      api.girarJa(0);
      rv.classList.add('com-halo', 'pulou');
      terminar();
    };
    api.el.addEventListener('virou', () => {
      // na espera, o toque na carta de costas é o que a vira; depois, vira à vontade
      if (rv.dataset.fase === 'espera') { api.girarJa(180); virar(); }
    });
    api.el.addEventListener('keydown', (ev) => {
      if ((ev.key === 'Enter' || ev.key === ' ') && rv.dataset.fase === 'espera') { ev.preventDefault(); virar(); }
    });
    const abrir = () => {
      if (rv.dataset.fase !== 'fechado') return;
      if (menos) {
        // troca suave: o baú some, a carta aparece de frente com o halo parado e o nome
        virou = true;
        api.girarJa(0);
        fase('menos');
        depois(500, () => { rv.classList.add('com-halo'); terminar(); });
        return;
      }
      fase('balanca');
      depois(400, () => fase('abre'));
      depois(700, () => fase('sobe'));
      depois(1300, () => fase('espera'));
      depois(1300 + 3000, virar);
    };
    rv.querySelector('.rv-bau').onclick = abrir;
    rv.querySelector('.rv-pular').onclick = pular;
    if (opts.abrir === 'ja') requestAnimationFrame(() => requestAnimationFrame(abrir));
    // a Promise, com os controles junto (para a amostra e para quem chama)
    return Object.assign(fim, { el: rv, abrir, pular, virar, carta: api, fase: () => rv.dataset.fase });
  }

  // A carta de cada baú (amostra): fixa pelo número do dia, enquanto o sorteio por pessoa não vem.
  const cartaDoBau = (numero) => CARTAS[Math.floor(numero / 7) % CARTAS.length];

  CC.cartas = { revelar, desenharCarta, desenharVerso, temArte, cartaViva, miniatura, storyDaCarta, papelDeParede,
    RARIDADES, iconeSvg, lista: CARTAS, cartaDoBau, botaoVirar, desenhos: DESENHOS, iconeCanvasTeste: iconeCanvas,
    // só para as capturas da amostra: a revelação em câmera lenta (2 = metade da velocidade)
    _escalaTempo: (n) => { ESCALA_TEMPO = n > 0 ? n : 1; },
    tela: () => tela(CW, CH), CW, CH };
})(window.CC);
