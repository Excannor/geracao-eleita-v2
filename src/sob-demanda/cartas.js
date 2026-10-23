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
   - cartaViva(carta, { largura, verso, interativa, parada }) -> { el, inclinar, soltar, virar,
     parada, ... }: a carta que inclina com o dedo e vira, com o brilho da raridade. Parada (em
     repouso), o brilho continua vivo: a luz passeia devagar e a carta respira 1 a 2 graus
     (o "brilho parado", PARADO abaixo); o dedo ou o giroscópio assume sem pulo e, depois de
     soltar(), ele volta devagar. parada (padrão true) liga esse brilho; false o deixa
     desligado até api.parada(true) (a revelação o liga só no fim). Ele dorme fora da tela e
     com a aba escondida; com menos movimento, o brilho fica parado num repouso fixo.
   - miniatura(carta, largura) -> canvas da miniatura já no tamanho da tela (sem texto); da
     Prata para cima, com o tom parado do holo na moldura (para a raridade se ver na grade).
   - storyDaCarta(carta) -> canvas 1080x1920, com o brilho da raridade assado num repouso fixo
     (e o halo, na glória); papelDeParede({ ref, texto }) -> canvas 1080x2340 (sem brilho).
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
    { id: 'davi-funda', album: 'Heróis da fé', numero: 10, total: 13, titulo: 'Davi e a funda',
      sabia: 'Davi apanhou cinco pedras lisas de um riacho e usou só uma.', ref: '1 Samuel 17.40-49', raridade: 'linho' },
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
  // Uma prancha de gravura, como as dos livros antigos de história natural: no papel sálvia
  // (puxado para o sépia, para casar com as outras pranchas do álbum),
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
    g.addColorStop(0, '#e3e0bd');
    g.addColorStop(0.6, '#cfcc9f');
    g.addColorStop(1, '#b1ad7f');
    k.fillStyle = g;
    k.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) {
      k.fillStyle = r() < 0.6 ? 'rgba(70,64,30,' + (0.03 + r() * 0.07).toFixed(3) + ')' : 'rgba(255,252,236,.22)';
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
  // De cima e de trás, olhando ao longo do caminho, de madrugada (Êx 14.21-22, 14.24): o mar
  // agitado pelo vento dos dois lados e, no meio dele, o corredor de fundo seco, de areia
  // molhada com conchas, algas e poças, que foge até a outra margem. As duas paredes de água
  // se veem pela face (o lado que olha para o caminho), em pé, da crista até a areia: as
  // linhas da água correm deitadas para o mesmo ponto de fuga (nunca de pé como cachoeira),
  // mais claras em cima, onde a luz atravessa, e a espuma fica só na crista. No fim do
  // corredor, a luz da madrugada. Ninguém desenhado, nenhum peixe: o mar é só água em pé.
  function desenhoMar(k, W, H, obj) {
    const r = sorteio(4401);
    const hz = 236;
    const vx = 452;
    const f = 1500;
    const olho = 8.9;
    const P = 3.0;
    const Hw = 7.6;
    // um ponto: lado lateral X (em unidades), altura h, distância z
    const px = (X, z) => vx + f * X / z;
    // a face não é um plano: bojuda e torta, um pouco debruçada para o corredor no alto
    const bojo = onda(sorteio(4420), 3, 0.08);
    const Xf = (lado, h, z) => lado * (P + Math.sin((h / Hw) * Math.PI) * 0.12 * (1 + bojo(z)) - Math.pow(h / Hw, 4) * 0.55 + bojo(z * 1.7) * 0.05);
    const py = (h, z) => hz + f * (olho - h) / z;
    const zPerto = 4;
    const zFim = 420;
    const zs = [];
    for (let z = zPerto; z < zFim; z *= 1.03) zs.push(z);
    zs.push(zFim);
    const zDoChao = (y) => f * olho / Math.max(0.5, y - hz);
    // a madrugada: a tinta lisa e as linhas claras da gravura, mais cheias perto do horizonte
    k.fillStyle = '#151816';
    k.fillRect(0, 0, W, H);
    papelVelho(k, W, H, r, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'], [vx, hz], true);
    linhas(k, 0, 0, W, hz + 2, 4.4, 1.6, (x, y) => 0.06 + Math.pow(y / hz, 2.4) * 0.7 + Math.max(0, 1 - Math.hypot((x - vx) / 330, (y - hz) / 70)) * 0.4, 'rgba(238,224,192,.55)');
    estrelasDoCeu(k, r, 40, 12, W - 40, 150, 120);
    // a outra margem, baixa e escura, no horizonte
    const fM = onda(sorteio(4410), 4, 0.01);
    const margem = pol([[-10, hz + 3], ...Array.from({ length: 46 }, (_, i) => [i * 20 - 4, hz - 4 - Math.max(0, fM(i * 20)) * 7]), [W + 10, hz + 3]]);
    k.fillStyle = '#0f110e';
    k.fill(margem);
    // o mar dos dois lados, visto de pouco acima: ondas curtas e agitadas pelo vento, com as
    // cristas brancas, cada vez mais miúdas e juntas longe
    const marP = new Path2D();
    marP.rect(-10, hz + 2, W + 20, H);
    k.fillStyle = '#26312c';
    k.fill(marP);
    k.save();
    k.clip(marP);
    k.lineCap = 'round';
    for (let y = hz + 3; y < H + 10; y += 1.5 + (y - hz) * 0.035) {
      const t = (y - hz) / (H - hz);
      let x = -20 - r() * 40;
      while (x < W + 20) {
        const c = (8 + r() * 26) * (0.35 + t * 2.6);
        const luz = Math.max(0, 1 - Math.hypot((x - vx) / 480, (y - hz) / 170));
        k.strokeStyle = 'rgba(' + Math.round(160 + luz * 80) + ',' + Math.round(178 + luz * 62) + ',' + Math.round(166 + luz * 46) + ',' + (0.35 + luz * 0.4 + t * 0.15).toFixed(2) + ')';
        k.lineWidth = 0.5 + t * 2;
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x + c * 0.45, y - 1 - t * 7, x + c, y + t * 1.5);
        k.stroke();
        if (r() < 0.08 + t * 0.06) {
          k.strokeStyle = 'rgba(238,240,226,' + (0.5 + t * 0.4).toFixed(2) + ')';
          k.lineWidth = 0.8 + t * 2.6;
          k.beginPath();
          k.moveTo(x + c * 0.3, y - t * 4);
          k.quadraticCurveTo(x + c * 0.5, y - 2 - t * 8, x + c * 0.75, y - t * 3);
          k.stroke();
        }
        x += c + (2 + r() * 14) * (0.4 + t * 1.6);
      }
    }
    k.restore();
    // o corredor: o fundo de areia entre os pés das paredes, e as duas faces
    const pe = (lado) => zs.map((z) => [px(Xf(lado, 0, z), z), py(0, z)]);
    const crista = (lado) => zs.map((z) => [px(Xf(lado, Hw, z), z), py(Hw + Math.sin(z * 0.11 + lado) * 0.1 + Math.sin(z * 0.37) * 0.05, z)]);
    const cE = crista(-1);
    const cD = crista(1);
    const pE = pe(-1);
    const pD = pe(1);
    const chao = pol([...pE, ...pD.slice().reverse()]);
    k.fillStyle = '#b7a37f';
    k.fill(chao);
    k.save();
    k.clip(chao);
    // o tom da areia: pontinhos de grão, mais cheios longe e rente às paredes (molhado)
    for (let i = 0; i < 9000; i++) {
      const y = hz + Math.pow(r(), 0.7) * (H - hz);
      const z = zDoChao(y);
      const lat = (r() * 2 - 1) * P;
      const x = vx + f * lat / z;
      const molhado = Math.pow(Math.abs(lat) / P, 3);
      const s = Math.max(0.6, Math.min(2.4, 40 / z));
      k.fillStyle = 'rgba(46,36,20,' + (0.22 + molhado * 0.5 + Math.min(0.3, z / 300)).toFixed(2) + ')';
      k.fillRect(x, y, s, s * 0.7);
    }
    // a luz da madrugada que vem do fim, clareando o meio do caminho
    brilho(k, vx, hz + 30, 300, 'rgba(255,232,190,.35)');
    // as marcas de onda: grupos de arquinhos oblíquos e tortos, nunca de través em régua
    k.lineCap = 'round';
    for (let g = 0; g < 26; g++) {
      const z0 = zPerto * Math.pow(zFim / zPerto * 0.4, Math.pow(r(), 1.5)) + 2;
      const lat0 = (r() * 2 - 1) * P * 0.75;
      const giro = (r() - 0.5) * 1.4;
      const n = 3 + Math.floor(r() * 4);
      for (let j = 0; j < n; j++) {
        const z = z0 * (1 + j * 0.06);
        const lat = lat0 + j * 0.12 * Math.sin(giro);
        const x = px(lat, z);
        const y = py(0, z);
        const c = (0.5 + r() * 0.5) * f / z;
        k.strokeStyle = 'rgba(40,30,16,' + (0.35 + Math.min(1, 20 / z) * 0.35).toFixed(2) + ')';
        k.lineWidth = Math.max(0.5, 30 / z);
        k.beginPath();
        k.moveTo(x - Math.cos(giro) * c / 2, y - Math.sin(giro) * c * 0.25);
        k.bezierCurveTo(x - c * 0.15, y - c * 0.1, x + c * 0.15, y + c * 0.08, x + Math.cos(giro) * c / 2, y + Math.sin(giro) * c * 0.25);
        k.stroke();
      }
    }
    // as manchas molhadas que ficaram na areia: claras, rasas, sem fundo escuro (nada de buraco)
    for (const [lat, z, w, d] of [[-2.6, 34, 1.2, 0.5], [1.9, 44, 0.9, 0.4], [-0.6, 70, 1.1, 0.4], [2.4, 110, 0.9, 0.4], [-1.8, 150, 0.9, 0.4]]) {
      const x = px(lat, z);
      const y = py(0, z);
      const p = seixo(r, x, y, w * f / z, Math.max(3, d * f / z * 0.6), 0, 0.06);
      k.save();
      k.filter = 'blur(3px)';
      k.fillStyle = 'rgba(90,80,56,.22)';
      k.fill(p);
      k.restore();
      k.save();
      k.clip(p);
      for (let yy = y - d * f / z; yy < y + d * f / z; yy += 2.6) {
        k.strokeStyle = 'rgba(70,60,40,' + (0.15 + r() * 0.2).toFixed(2) + ')';
        k.lineWidth = 1;
        const c = w * f / z * (0.3 + r() * 0.7);
        const xx = x + (r() - 0.5) * w * f / z;
        k.beginPath();
        k.moveTo(xx - c / 2, yy);
        k.lineTo(xx + c / 2, yy);
        k.stroke();
      }
      k.restore();

    }
    // as algas deitadas e as conchas
    for (let i = 0; i < 10; i++) {
      const z = zPerto * 4.6 * (1 + Math.pow(r(), 1.4) * 5);
      const lat = (r() * 2 - 1) * P * 0.8;
      const x = px(lat, z);
      const y = py(0, z);
      const L = (1 + r() * 1.2) * f / z;
      const a = (r() - 0.5) * 1.4;
      k.strokeStyle = 'rgba(30,40,24,.9)';
      k.lineWidth = Math.max(1, 60 / z);
      k.beginPath();
      for (let s = 0; s <= 1.0001; s += 0.08) {
        const xx = x + Math.cos(a) * L * (s - 0.5) + Math.sin(s * 9 + i) * L * 0.05;
        const yy = y + Math.sin(a) * L * (s - 0.5) * 0.35 + Math.cos(s * 9 + i) * L * 0.025;
        if (s === 0) k.moveTo(xx, yy); else k.lineTo(xx, yy);
      }
      k.stroke();
      k.lineWidth = Math.max(0.6, 30 / z);
      for (let s = 0.12; s < 0.95; s += 0.14) {
        const xx = x + Math.cos(a) * L * (s - 0.5);
        const yy = y + Math.sin(a) * L * (s - 0.5) * 0.35;
        const ld = (s * 7) % 2 > 1 ? 1 : -1;
        k.beginPath();
        k.moveTo(xx, yy);
        k.quadraticCurveTo(xx + L * 0.04 * ld, yy - L * 0.08, xx + L * 0.09 * ld, yy - L * 0.1);
        k.stroke();
      }
    }
    const concha = (x, y, s, giro) => {
      k.save();
      k.translate(x, y);
      k.rotate(giro);
      k.scale(1, 0.62);
      const p = new Path2D();
      p.moveTo(0, s * 0.5);
      p.bezierCurveTo(-s * 1.1, s * 0.2, -s * 0.9, -s * 0.9, 0, -s);
      p.bezierCurveTo(s * 0.9, -s * 0.9, s * 1.1, s * 0.2, 0, s * 0.5);
      p.closePath();
      k.fillStyle = '#ece2c8';
      k.fill(p);
      k.strokeStyle = 'rgba(40,30,16,.85)';
      k.lineWidth = Math.max(0.6, s * 0.08);
      for (let i = -3; i <= 3; i++) {
        k.beginPath();
        k.moveTo(0, s * 0.45);
        k.quadraticCurveTo(i * s * 0.25, -s * 0.2, i * s * 0.28, -s * 0.88 + Math.abs(i) * s * 0.12);
        k.stroke();
      }
      k.lineWidth = Math.max(0.8, s * 0.11);
      k.stroke(p);
      k.restore();
    };
    for (const [lat, z, giro] of [[-1.3, 29, 0.4], [2.5, 31, -0.6], [0.7, 38, 2.2], [-2.9, 48, -0.3], [1.4, 62, 0.9], [-0.4, 90, 0], [2.6, 80, 1.4]]) concha(px(lat, z), py(0, z), 0.42 * f / z, giro);
    // os seixos do fundo
    for (let i = 0; i < 24; i++) {
      const z = zPerto * 4.6 * Math.pow(zFim / zPerto / 4.6, Math.pow(r(), 2));
      const lat = (r() * 2 - 1) * P * 0.85;
      const x = px(lat, z);
      const y = py(0, z);
      const s = (0.14 + r() * 0.18) * f / z;
      const p = seixo(r, x, y, s, s * 0.6, 0, 0.2);
      sombraNoChao(k, p, s * 0.3, s * 0.2, 1 + s * 0.1, 0.4);
      peca(k, p, [x - s, y - s, x + s, y + s], { cor: '#8a7b62', tinta: '#1e170c', sombra: sombraOval(x, y, s, s * 0.6, 0), passo: Math.max(1.6, s * 0.2), maxL: 1.2, cruzada: 0.75, traco: Math.max(0.8, s * 0.1) });
    }
    k.restore();
    // as duas faces de água, em pé, da crista até a areia
    for (const lado of [-1, 1]) {
      const cr = lado < 0 ? cE : cD;
      const pp = lado < 0 ? pE : pD;
      const face = pol([...cr, ...pp.slice().reverse()]);
      k.fillStyle = '#52625a';
      k.fill(face);
      marcar(k, obj, face);
      k.save();
      k.clip(face);
      // a luz da coluna de fogo, atrás de quem olha, acende a água de perto; longe, o escuro
      brilho(k, lado < 0 ? 60 : W - 60, H + 60, 620, 'rgba(226,206,160,.38)');
      brilho(k, vx, hz, 240, 'rgba(10,16,14,.55)');
      // a água clara perto da crista, onde a madrugada atravessa
      for (let i = 0; i < 40; i++) {
        const u = 0.6 + (i / 40) * 0.4;
        k.strokeStyle = 'rgba(184,212,190,' + (0.04 + Math.pow(i / 40, 1.5) * 0.2).toFixed(3) + ')';
        k.beginPath();
        zs.forEach((z, j) => { const h = u * Hw; const x = px(Xf(lado, h, z), z); const y = py(h, z); k.lineWidth = Math.max(1, Hw * 0.012 * f / z); if (j) k.lineTo(x, y); else k.moveTo(x, y); });
        k.stroke();
      }
      k.lineCap = 'round';
      // o tom da água em linhas de tinta, deitadas ao longo do caminho e ondeadas, com a mesma
      // densidade na tela perto e longe (as linhas do meio só entram onde as outras se abrem):
      // grossas no pé e no fundo, finas e ralas em cima, onde a água clareia
      const N = 256;
      const alvo = 3.6;
      const nivel = (i) => (i === 0 ? N : i & -i);
      const fases = Array.from({ length: N + 1 }, () => [r() * 6.283, r() * 6.283]);
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const lv = nivel(i);
        const [fase, f2] = fases[i];
        let ant = null;
        let falha = 0;
        for (const z of zs) {
          const hh = u * Hw + Math.sin(z * 0.12 + fase) * 0.06 + Math.sin(z * 0.43 + f2) * 0.025;
          const p = [px(Xf(lado, hh, z), z), py(hh, z)];
          const vao = (2 * lv / N) * Hw * f / z;
          const entra = lv === N ? 1 : Math.max(0, Math.min(1, (vao - alvo) / alvo));
          if (falha > 0) { falha--; ant = null; continue; }
          if (r() < 0.16) falha = 1 + Math.floor(r() * 3);
          if (ant && entra > 0) {
            const perto = Math.min(1, 24 / z);
            const escuro = 0.16 + Math.pow(1 - u, 1.6) * 0.72 + Math.min(1, z / 160) * 0.3 - Math.max(0, u - 0.7) * 1.1 + Math.sin(z * 0.07 + u * 9 + lado) * 0.14;
            const w = escuro * (0.7 + perto * 0.9) * entra;
            if (w > 0.25) {
              k.strokeStyle = 'rgba(14,24,19,.8)';
              k.lineWidth = w;
              k.beginPath();
              k.moveTo(ant[0], ant[1]);
              k.lineTo(p[0], p[1]);
              k.stroke();
            }
          }
          ant = p;
        }
      }
      // a água que corre dentro da parede: faixas compridas e tortas, um pouco mais claras,
      // que seguem a face (a luz da madrugada passando pela água)
      for (let c = 0; c < 9; c++) {
        const u0 = 0.35 + r() * 0.58;
        const fase = r() * 6.283;
        const z0 = zPerto * (1 + r() * 0.5);
        const z1 = z0 * (4 + r() * 10);
        for (let q = 0; q < 5; q++) {
          k.strokeStyle = 'rgba(196,220,200,' + (0.07 + u0 * 0.1).toFixed(3) + ')';
          k.beginPath();
          let ini = true;
          for (let z = z0; z <= z1; z *= 1.03) {
            const t = Math.log(z / z0) / Math.log(z1 / z0);
            const h = (u0 + Math.sin(z * 0.05 + fase) * 0.04 + q * 0.006) * Hw;
            const x = px(Xf(lado, h, z), z);
            const y = py(h, z);
            k.lineWidth = Math.max(0.5, Hw * 0.006 * f / z * Math.sin(t * Math.PI));
            if (ini) { k.moveTo(x, y); ini = false; } else k.lineTo(x, y);
          }
          k.stroke();
        }
      }
      // as bolhas presas na água, miúdas, em fios que sobem
      for (let b = 0; b < 26; b++) {
        const z = zPerto * 1.2 * Math.pow(12, r());
        const e = f / z;
        let h = r() * Hw * 0.5;
        for (let q = 0; q < 6; q++) {
          h += (0.1 + r() * 0.2);
          const x = px(Xf(lado, h, z), z) + (r() - 0.5) * e * 0.04;
          const y = py(h, z);
          const rr = Math.max(0.6, e * (0.008 + r() * 0.012));
          k.strokeStyle = 'rgba(214,230,214,.55)';
          k.lineWidth = Math.max(0.5, rr * 0.35);
          k.beginPath();
          k.arc(x, y, rr, 0, 6.283);
          k.stroke();
        }
      }
      // as algas compridas, presas no pé e de pé na água, com as folhas soltas
      for (let a = 0; a < 7; a++) {
        const z = 8 * (1.15 + a * 0.85 + r() * 0.5);
        const e = f / z;
        const alto = Hw * (0.28 + r() * 0.3);
        const caule = [];
        for (let t = 0; t <= 1.0001; t += 0.04) {
          const zz = z * (1 + Math.sin(t * 4.5 + a) * 0.06 * t);
          caule.push([px(Xf(lado, t * alto, zz), zz), py(t * alto, zz)]);
        }
        k.strokeStyle = 'rgba(16,30,18,.85)';
        k.lineWidth = Math.max(1, e * 0.03);
        k.beginPath();
        caule.forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
        k.stroke();
        for (let i = 3; i < caule.length - 1; i += 2) {
          const [x, y] = caule[i];
          const ld = i % 4 === 1 ? 1 : -1;
          const fl = new Path2D();
          fl.moveTo(x, y);
          fl.quadraticCurveTo(x + ld * e * 0.09, y - e * 0.02, x + ld * e * 0.13, y - e * 0.11);
          fl.quadraticCurveTo(x + ld * e * 0.05, y - e * 0.05, x, y);
          k.fillStyle = 'rgba(40,58,34,.8)';
          k.fill(fl);
          k.strokeStyle = 'rgba(16,30,18,.8)';
          k.lineWidth = Math.max(0.5, e * 0.008);
          k.stroke(fl);
        }
      }
      k.restore();
      // a beirada do pé: a água encostada na areia, um fio claro e molhado
      k.strokeStyle = 'rgba(220,218,192,.6)';
      k.lineWidth = 1.4;
      k.beginPath();
      pp.forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
      k.stroke();
      // a crista: uma faixa de espuma grossa e embolada que se debruça para o corredor (sem
      // pingente nem fio em pé), com o escuro por baixo e os respingos por cima
      const fE = onda(sorteio(4430 + lado), 4, 0.25);
      const espuma = (j) => { const z = zs[j]; const e = Math.min(1, 30 / z); return (5 + Math.max(0, fE(z) + 0.3) * 16 + Math.max(0, Math.sin(z * 0.9 + lado * 2)) * 6) * e; };
      const baixo = cr.map(([x, y], j) => [x - lado * espuma(j) * 0.25, y + espuma(j)]);
      const lip = pol([...cr.map(([x, y], j) => [x + lado * espuma(j) * 0.25, y - espuma(j) * (0.35 + Math.max(0, Math.sin(j * 1.3 + lado)) * 0.3)]), ...baixo.slice().reverse()]);
      k.fillStyle = '#d9ddcd';
      k.fill(lip);
      marcar(k, obj, lip);
      k.save();
      k.clip(lip);
      for (let i = 0; i < 1400; i++) {
        const j = Math.floor(Math.pow(r(), 1.6) * (cr.length - 1));
        const [x, y] = cr[j];
        const e = espuma(j);
        k.fillStyle = 'rgba(40,56,50,' + (0.25 + r() * 0.35).toFixed(2) + ')';
        k.beginPath();
        k.arc(x + (r() - 0.5) * 8, y + r() * e, 0.5 + r() * Math.min(2.2, e * 0.12), 0, 6.283);
        k.fill();
      }
      k.restore();
      k.strokeStyle = 'rgba(14,22,18,.85)';
      k.lineWidth = 1.6;
      k.beginPath();
      baixo.forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
      k.stroke();
      for (let j = 0; j < cr.length; j += 1) {
        if (r() < 0.55) continue;
        const [x, y] = cr[j];
        const e = Math.min(1, 30 / zs[j]);
        k.fillStyle = 'rgba(240,242,230,' + (0.35 + e * 0.45).toFixed(2) + ')';
        k.beginPath();
        k.arc(x + lado * (r() - 0.7) * e * 22, y - espuma(j) * 0.4 - r() * e * 20, 0.6 + r() * e * 2.2, 0, 6.283);
        k.fill();
      }
    }
    // a luz do fim do corredor: um clarão baixo, no ponto de fuga
    brilho(k, vx, hz, 110, 'rgba(255,232,186,.5)', 'screen');
    vinheta(k, W, H, 0.42);
  }

  // ---------- (5) Objetos: a Arca da Aliança (ouro, a carta-tema do álbum) ----------
  // Em três quartos, no escuro do Lugar Santíssimo, como prancha gravada: atrás, o véu em
  // pregas fundas; a arca de ouro (2,5 x 1,5 x 1,5 côvados) com a moldura em volta (Êx 25.11),
  // os pés, as argolas e as duas varas passando por dentro delas (Êx 25.12-15); sobre a tampa,
  // os querubins de ouro mostrados só pelas asas (dono, 23/10: nem corpo nem rosto): em cada
  // ponta da tampa, um par de asas que sobe dela, de uma peça só com ela (Êx 25.19), e se abre
  // para cima e para a frente, cobrindo-a, as duas pontas de frente uma para a outra (Êx
  // 25.20): penas em fileiras ordenadas, umas por cima das outras. Entre elas, a luz (Êx 25.22).
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
  // As asas de um querubim, sem corpo nem rosto: o par sobe da ponta da tampa (as penas de
  // baixo pousam nela, de uma peça só) e se abre para cima e para dentro, para o meio da
  // tampa. A asa de trás é mais alta e mais escura; a da frente, mais baixa, avança mais sobre
  // a tampa. "lado" 1 abre para a direita.
  function asasDoQuerubim(k, x0, y0, esc, lado, luzEm, obj) {
    const T = (x, y) => [x0 + lado * x * esc, y0 + y * esc];
    // a asa de trás: mais alta, mais escura, a ponta lá em cima, sobre o meio da tampa
    asaOrdenada(k, [T(-40, -96), T(-96, -270), T(10, -348), T(96, -316)], luzEm, { escurecer: 0.42, escala: esc * 0.92, lado, obj });
    // a asa da frente: sai mais baixa e avança mais sobre a tampa
    asaOrdenada(k, [T(-14, -84), T(-56, -236), T(40, -306), T(118, -262)], luzEm, { escala: esc, lado, obj });
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
    // 4) as asas dos querubins: as do de trás (esquerda, mais longe) antes, as do da frente depois
    const qe = P([-L + 26, mA, 0]);
    const qd = P([L - 26, mA, 0]);
    asasDoQuerubim(k, qe[0], qe[1] + 4, 1.08 * qe[3], 1, luzEm, obj);
    asasDoQuerubim(k, qd[0], qd[1] + 4, 1.08 * qd[3], -1, luzEm, obj);
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
  // Uma prancha de gravura em papel, de manhã bem cedo (Jo 20.1): a encosta de calcário em
  // camadas deitadas, com a boca do túmulo cavada nela, de beirada irregular, e o pedaço da
  // rocha em volta alisado a cinzel; a grande pedra redonda rolada para o lado, de pé no sulco,
  // inteira e com ar em volta. Lá dentro, no banco cavado na rocha, a luz da manhã entra de
  // viés e mostra as faixas de linho deitadas e, num lugar à parte, o pano da cabeça
  // enrolado (Jo 20.5-7). Ninguém desenhado.
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
    papelVelho(k, W, H, r, ['#fbf1d8', '#ecdcb6', '#cdb88a'], [90, 150]);
    // o céu da manhã: linhas finas, que somem perto da luz que vem da esquerda (sem sol)
    linhas(k, 0, 0, W, 330, 4.8, 1.3, (x, y) => 0.1 + Math.min(1, Math.hypot(x - 60, (y - 200) * 1.6) / 900) * 0.55);
    // a cena um pouco mais perto (a boca e a pedra maiores, menos chão vazio)
    k.save();
    k.translate(440, 330);
    k.scale(1.1, 1.1);
    k.translate(-440, -330);
    // os morros de longe, baixos, à esquerda
    const fL = onda(sorteio(4620), 4, 0.012);
    const longe = pol([[-10, 300], ...Array.from({ length: 24 }, (_, i) => [i * 16 - 6, 250 - Math.max(0, fL(i * 16)) * 14 - i * 1.2]), [380, 300]]);
    peca(k, longe, [-10, 200, 380, 300], { cor: '#e2cfa6', ang: 0.05, passo: 4, maxL: 1, sombra: () => 0.3, cruzada: 1, traco: 1.2 });
    // a encosta de calcário: o alto ondulado e irregular (nada de degrau), de lado a lado
    const fA = onda(sorteio(4630), 5, 0.006);
    const alto = (x) => 222 - Math.exp(-(((x - 420) / 300) ** 2)) * 70 + fA(x) * 10 + Math.sin(x * 0.045) * 3;
    const ptsA = [];
    for (let x = -20; x <= W + 20; x += 12) ptsA.push([x, alto(x)]);
    const chaoY = (x) => 612 + Math.sin(x * 0.013 + 1) * 8 + Math.sin(x * 0.051) * 3;
    const rocha = pol([...ptsA, [W + 20, chaoY(W + 20) + 30], ...Array.from({ length: 30 }, (_, i) => { const x = W + 20 - i * 31; return [x, chaoY(x) + 30]; }), [-20, chaoY(-20) + 30]]);
    k.fillStyle = '#e4cf9f';
    k.fill(rocha);
    marcar(k, obj, rocha);
    // o calcário em bancadas: camadas de espessuras bem diferentes, de beiradas onduladas e
    // gastas (o traço da beirada falha aqui e ali), umas afinando até sumir; a hachura inclinada
    // corre por toda a rocha e escurece no recuo logo abaixo de cada bancada que avança; poucas
    // fraturas compridas atravessam várias bancadas de uma vez, com a lasca clara de um lado
    const bases = [168, 214, 300, 336, 420, 506, 552, 640];
    const curvas = bases.map((b, i) => { const fq = onda(sorteio(4640 + i), 4, 0.007); return (x) => b + x * 0.028 + fq(x) * (9 + i * 1.2); });
    const recuo = (x, y) => { let d = 1; for (const c of curvas) { const t = y - c(x); if (t > 0 && t < 22) d = Math.min(d, t / 22); } return 1 - d; };
    const ruidoR = onda(sorteio(4660), 3, 0.004);
    const luzRocha = (x, y) => 0.2 + Math.max(0, (x - 120) / 900) * 0.45 + (y - 200) / 1800 + ruidoR(x + y) * 0.05;
    k.save();
    k.clip(rocha);
    gravar(k, rocha, W / 2, 400, 620, 0.78, 4.2, 1.8, (x, y) => luzRocha(x, y) + recuo(x, y) * 0.5, SEPIA, 0);
    gravar(k, rocha, W / 2, 400, 620, 2.0, 5.4, 1.3, (x, y) => (luzRocha(x, y) - 0.45) * 1.4 + recuo(x, y) * 0.6, SEPIA, 0);
    k.lineCap = 'round';
    for (const c of curvas) {
      // a beirada de cima da bancada pega a luz; a de baixo, em traço firme que falha
      let x = -20;
      while (x < W + 20) {
        const L = 60 + r() * 220;
        k.strokeStyle = SEPIA;
        k.lineWidth = 1.4 + r() * 1.2;
        k.beginPath();
        for (let xx = x; xx <= Math.min(W + 20, x + L); xx += 8) { const y = c(xx) + (r() - 0.5) * 1.4; if (xx === x) k.moveTo(xx, y); else k.lineTo(xx, y); }
        k.stroke();
        k.strokeStyle = 'rgba(255,246,220,.65)';
        k.lineWidth = 1.3;
        k.beginPath();
        for (let xx = x + 6; xx <= Math.min(W + 20, x + L - 6); xx += 8) { const y = c(xx) - 2.5; if (xx === x + 6) k.moveTo(xx, y); else k.lineTo(xx, y); }
        k.stroke();
        x += L + 10 + r() * 50;
      }
    }
    // as fraturas compridas, que cortam duas, três bancadas
    for (const [x0, i0, n] of [[70, 1, 3], [250, 0, 2], [560, 2, 3], [700, 0, 2], [820, 3, 3], [150, 4, 2]]) {
      const pts = [];
      let x = x0;
      for (let i = i0; i <= Math.min(curvas.length - 1, i0 + n); i++) { pts.push([x, curvas[i](x)]); x += (r() - 0.4) * 22; }
      k.strokeStyle = SEPIA;
      k.lineWidth = 2.2;
      k.beginPath();
      pts.forEach(([px, py], j) => { if (j) { const [qx, qy] = pts[j - 1]; k.lineTo((px + qx) / 2 + (r() - 0.5) * 8, (py + qy) / 2); k.lineTo(px, py); } else k.moveTo(px, py); });
      k.stroke();
      k.strokeStyle = 'rgba(255,246,220,.55)';
      k.lineWidth = 1.2;
      k.beginPath();
      pts.forEach(([px, py], j) => (j ? k.lineTo(px - 4, py) : k.moveTo(px - 4, py)));
      k.stroke();
    }
    for (let i = 0; i < 160; i++) {
      const x = r() * W;
      const y = alto(x) + 20 + r() * (620 - alto(x));
      const s0 = 0.8 + r() * 2.4;
      k.fillStyle = 'rgba(52,36,16,' + (0.35 + r() * 0.3).toFixed(2) + ')';
      k.beginPath();
      k.ellipse(x, y, s0 * 1.3, s0 * 0.9, (r() - 0.5) * 0.6, 0, 6.283);
      k.fill();
    }
    k.restore();
    // o alto da rocha em traço firme e os tufos de capim ralo lá em cima
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.6;
    k.beginPath();
    ptsA.forEach(([x, y], i) => (i ? k.lineTo(x + (r() - 0.5) * 2, y + (r() - 0.5) * 2) : k.moveTo(x, y)));
    k.stroke();
    for (const x of [130, 300, 610, 790]) capim(k, r, x, alto(x) + 4, 24, 12, 'rgba(70,52,24,.75)');
    // o pedaço alisado a cinzel em volta da boca: a rocha cortada, mais clara, de beirada torta
    const bx0 = 168;
    const bx1 = 512;
    const by0 = 268;
    const fb = onda(sorteio(4650), 3, 0.05);
    const corte = pol([
      ...Array.from({ length: 14 }, (_, i) => { const t = i / 13; return [bx0 + (bx1 - bx0) * t, by0 + Math.sin(t * Math.PI) * -14 + fb(t * 40) * 5]; }),
      ...Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [bx1 + fb(t * 30 + 7) * 6 + t * 8, by0 + (606 - by0) * t]; }),
      ...Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [bx0 - 6 + fb(t * 30 + 3) * 6 - (1 - t) * 4, 606 - (606 - by0) * t]; }),
    ]);
    k.save();
    k.clip(corte);
    k.filter = 'blur(12px)';
    k.fillStyle = 'rgba(244,230,196,.4)';
    k.fill(corte);
    k.filter = 'none';
    // as marcas do cinzel: talhos curtos, inclinados, em fileiras soltas
    k.strokeStyle = 'rgba(60,42,18,.55)';
    k.lineCap = 'round';
    for (let i = 0; i < 160; i++) {
      const x = bx0 + r() * (bx1 - bx0);
      const y = by0 + r() * (600 - by0);
      k.lineWidth = 1 + r() * 0.8;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + 4 + r() * 4, y + 6 + r() * 4);
      k.stroke();
    }
    k.restore();

    // a boca e a pedra, um pouco maiores que o resto da encosta, para o linho ler
    k.save();
    k.translate(420, 612);
    k.scale(1.3, 1.3);
    k.translate(-420, -612);
    // a boca: cavada na rocha, um arco baixo e torto, de beirada lascada, sem batente
    const bocaPts = [[230, 592], [222, 560], [229, 528], [221, 492], [231, 456], [236, 428], [256, 404], [282, 392], [300, 378], [322, 380], [346, 370], [366, 381], [392, 384], [410, 398], [432, 412], [440, 440], [449, 470], [444, 506], [453, 540], [448, 592]];
    const boca = contornoRocha(r, bocaPts, 7);
    boca.closePath();
    k.save();
    k.clip(boca);
    k.fillStyle = '#21180c';
    k.fillRect(200, 360, 280, 240);
    marcar(k, obj, boca);
    // a parede do fundo, o banco cavado nela (à direita, passando por trás da ombreira) e o chão
    const fundo = pol([[226, 400], [470, 400], [470, 496], [226, 500]]);
    gravar(k, fundo, 340, 450, 150, 0.12, 3.4, 2.1, (x) => 0.9 - Math.max(0, (x - 300) / 300) * 0.3, '#0e0904', 0);
    const tampo = pol([[268, 496], [470, 486], [470, 506], [262, 514]]);
    const frente = pol([[262, 514], [470, 506], [470, 556], [262, 562]]);
    k.fillStyle = '#5e4a2c';
    k.fill(frente);
    gravar(k, frente, 360, 534, 130, 0.03, 3, 1.6, (x, y) => 0.55 - (x - 262) / 900 + (y - 514) / 120, '#0e0904', 0);
    // os talhos do cinzel na frente do banco e a sombra funda logo abaixo da beirada
    k.save();
    k.clip(frente);
    k.strokeStyle = 'rgba(200,170,120,.4)';
    k.lineWidth = 1;
    for (let i = 0; i < 40; i++) { const x = 266 + r() * 200; const y = 520 + r() * 36; k.beginPath(); k.moveTo(x, y); k.lineTo(x + 6 + r() * 6, y + 2); k.stroke(); }
    k.fillStyle = 'rgba(10,6,2,.55)';
    k.fill(pol([[262, 514], [470, 506], [470, 514], [262, 522]]));
    k.restore();
    k.fillStyle = '#9c8358';
    k.fill(tampo);
    k.strokeStyle = '#1a1208';
    k.lineWidth = 1.4;
    k.stroke(tampo);
    const piso = pol([[200, 562], [480, 554], [480, 600], [200, 600]]);
    k.fillStyle = '#4a3a22';
    k.fill(piso);
    gravar(k, piso, 340, 578, 160, 0.05, 3.2, 1.6, () => 0.75, '#0e0904', 0);
    // a luz da manhã entra de viés pela boca e cai no banco e no chão, à direita
    const feixe = pol([[226, 380], [330, 372], [470, 520], [470, 600], [380, 600]]);
    k.save();
    k.filter = 'blur(14px)';
    k.fillStyle = 'rgba(255,224,160,.22)';
    k.fill(feixe);
    k.restore();
    // a ombreira da direita por dentro (a espessura da rocha), acesa pela luz que entra
    const ombreira = pol([[452, 592], [446, 540], [450, 500], [444, 456], [438, 428], [424, 410], [416, 412], [426, 438], [430, 470], [426, 506], [433, 548], [436, 596]]);
    peca(k, ombreira, [410, 396, 456, 598], { cor: '#d9c08e', ang: 1.5, passo: 3.6, maxL: 1.3, sombra: (x, y) => 0.25 + (y - 400) / 600, cruzada: 1, traco: 0 });
    // o alto por dentro, na sombra
    gravar(k, boca, 340, 400, 140, 0.05, 2.8, 2.2, (x, y) => 0.95 - (y - 374) / 46, '#0e0904', 0);
    // as faixas de linho, deitadas e vazias sobre o banco: tiras compridas e frouxas, umas por
    // cima das outras, com as dobras finas, e duas pontas caídas pela beirada
    // as faixas de linho, deitadas e vazias sobre o banco: tiras moles, de beirada torta, que
    // se cruzam um pouco, com a trama em fios finos ao longo e as rugas onde o pano dobra
    const faixa = (pts, larg, tom, sem) => {
      const rr = sorteio(sem);
      const c = curvaPor(pts, 2);
      const fw = onda(rr, 3, 0.08);
      const e = [];
      const d = [];
      for (const q of c) {
        const w = larg * (0.8 + fw(q.s) * 0.12) / 2;
        e.push([q.x + q.ty * w + (rr() - 0.5) * 0.8, q.y - q.tx * w + (rr() - 0.5) * 0.8]);
        d.push([q.x - q.ty * w + (rr() - 0.5) * 0.8, q.y + q.tx * w + (rr() - 0.5) * 0.8]);
      }
      const forma = pol([...e, ...d.reverse()]);
      k.fillStyle = tom;
      k.fill(forma);
      marcar(k, obj, forma);
      k.save();
      k.clip(forma);
      for (let v = -0.7; v <= 0.71; v += 0.35) {
        k.strokeStyle = 'rgba(110,88,52,.3)';
        k.lineWidth = 0.6;
        k.beginPath();
        c.forEach((q, i) => { const w = larg / 2; const x = q.x - q.ty * v * w; const y = q.y + q.tx * v * w; if (i) k.lineTo(x, y); else k.moveTo(x, y); });
        k.stroke();
      }
      // as rugas: arquinhos curtos de través, tortos, onde o pano se junta
      for (let i = 10; i < c.length - 6; i += 22 + Math.floor(rr() * 16)) {
        const q = c[i];
        const w = larg * 0.5;
        k.strokeStyle = 'rgba(90,68,36,.4)';
        k.lineWidth = 0.8;
        k.beginPath();
        k.moveTo(q.x + q.ty * w, q.y - q.tx * w);
        k.quadraticCurveTo(q.x + q.tx * 4 * (rr() - 0.3), q.y + 2, q.x - q.ty * w * 0.4, q.y + q.tx * w * 0.4);
        k.stroke();
      }
      k.restore();
      k.strokeStyle = 'rgba(40,28,12,.8)';
      k.lineWidth = 1.1;
      k.stroke(forma);
    };
    faixa([[320, 502], [346, 496], [372, 500], [398, 494], [426, 497], [452, 491], [470, 493]], 12, '#ece2c8', 4701);
    faixa([[336, 506], [360, 509], [388, 503], [414, 508], [440, 502], [462, 506], [472, 512], [470, 530], [474, 546]], 11, '#f4ecd8', 4702);
    faixa([[356, 494], [380, 489], [406, 492], [430, 487], [458, 489]], 9, '#e4d8ba', 4703);
    faixa([[392, 508], [404, 502], [422, 506], [436, 499]], 8, '#efe6cf', 4704);
    // o pano da cabeça, enrolado, num lugar à parte (Jo 20.7): na outra ponta do banco, um
    // pano enrolado frouxo e deitado de lado, mole, com as camadas do pano aparecendo em
    // beiradas onduladas e as rugas em arco, de todo jeito (nada de espiral nem de ponta solta)
    {
      const cx = 290;
      const cy = 490;
      const contorno = [[cx - 32, cy + 6], [cx - 33, cy - 3], [cx - 25, cy - 11], [cx - 10, cy - 12], [cx + 4, cy - 10], [cx + 16, cy - 7], [cx + 28, cy - 4], [cx + 40, cy - 1], [cx + 46, cy + 3], [cx + 40, cy + 8], [cx + 26, cy + 9], [cx + 10, cy + 11], [cx - 10, cy + 12], [cx - 24, cy + 11]];
      const trouxa = contornoRocha(r, contorno, 1.2);
      trouxa.closePath();
      k.fillStyle = '#ece2c6';
      k.fill(trouxa);
      gravar(k, trouxa, cx, cy, 50, 1.2, 2.4, 1.1, (x, y) => 0.05 + (y - cy + 8) / 20 * 0.8, '#3a2c14', 0);
      k.save();
      k.clip(trouxa);
      k.strokeStyle = 'rgba(60,44,20,.75)';
      k.lineWidth = 1.1;
      // a volta de fora do pano: a beirada ondulada que dá a volta no rolo, de viés
      k.beginPath();
      k.moveTo(cx - 20, cy - 12);
      k.bezierCurveTo(cx - 12, cy - 2, cx - 16, cy + 6, cx - 8, cy + 12);
      k.stroke();
      // a torção da ponta: traços em diagonal, cada vez mais juntos onde o pano afina
      for (const [x, inc] of [[cx + 14, 7], [cx + 24, 6], [cx + 32, 5], [cx + 38, 4]]) {
        k.beginPath();
        k.moveTo(x - inc, cy - 9);
        k.quadraticCurveTo(x, cy, x + inc * 0.6, cy + 10);
        k.stroke();
      }
      // as rugas moles do corpo
      for (const [x0, y0, x1, y1, d] of [[cx - 28, cy - 2, cx - 22, cy + 6, 3], [cx - 4, cy - 9, cx + 4, cy - 2, -2]]) {
        k.beginPath();
        k.moveTo(x0, y0);
        k.quadraticCurveTo((x0 + x1) / 2 + d, (y0 + y1) / 2, x1, y1);
        k.stroke();
      }
      k.restore();
      k.strokeStyle = 'rgba(40,28,12,.85)';
      k.lineWidth = 1.2;
      k.stroke(trouxa);
      marcar(k, obj, trouxa);
    }
    k.restore();
    // a beirada da boca: o traço firme e lascado, com a luz no lábio da esquerda
    k.strokeStyle = SEPIA;
    k.lineWidth = 3.2;
    k.stroke(boca);
    k.save();
    k.clip(pol([[150, 300], [330, 300], [330, 560], [150, 560]]));
    k.translate(-4, -2);
    k.strokeStyle = 'rgba(255,244,214,.75)';
    k.lineWidth = 2.2;
    k.stroke(boca);
    k.restore();
    // a soleira e o sulco raso cavado na rocha da frente, onde a pedra corre: duas linhas
    // finas e a sombra rasa dentro (nada de tábua)
    const sulco = pol([[470, 601], [720, 603], [720, 613], [470, 612]]);
    k.fillStyle = 'rgba(120,92,52,.35)';
    k.fill(sulco);
    k.strokeStyle = 'rgba(43,33,18,.8)';
    k.lineWidth = 1.4;
    k.beginPath();
    k.moveTo(470, 601);
    for (let x = 470; x <= 720; x += 12) k.lineTo(x, 601 + Math.sin(x * 0.07) * 1.1 + (r() - 0.5) * 1.2);
    k.stroke();
    k.strokeStyle = 'rgba(255,244,214,.6)';
    k.beginPath();
    k.moveTo(470, 613);
    for (let x = 470; x <= 720; x += 12) k.lineTo(x, 613 + Math.sin(x * 0.05) * 1 + (r() - 0.5) * 1.2);
    k.stroke();
    k.restore();
    // o chão de terra e pedra na frente
    const chao = pol([[-20, 640], ...Array.from({ length: 31 }, (_, i) => { const x = i * 31 - 20; return [x, chaoY(x) + 26]; }), [W + 20, 640], [W + 20, H + 20], [-20, H + 20]]);
    k.fillStyle = '#dcc69a';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -20, W + 20, 620, H, 2, (x, y) => 0.3 + (y - 620) / 500 + Math.max(0, (x - 300) / 1600));
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.2;
    k.beginPath();
    for (let x = -20; x <= W + 20; x += 10) { const y = chaoY(x) + 26 + (r() - 0.5) * 3; if (x === -20) k.moveTo(x, y); else k.lineTo(x, y); }
    k.stroke();
    for (const [x, y, s] of [[90, 700, 14], [150, 770, 10], [470, 690, 9], [560, 760, 16], [760, 720, 12], [820, 790, 9], [330, 800, 12]]) {
      const p = contornoRocha(r, [[x - s, y + s * 0.4], [x - s * 0.8, y - s * 0.5], [x - s * 0.1, y - s * 0.8], [x + s * 0.7, y - s * 0.6], [x + s, y + s * 0.3]], 2);
      p.closePath();
      sombraNoChao(k, p, s * 0.4, s * 0.3, 3, 0.3);
      peca(k, p, [x - s, y - s, x + s, y + s], { cor: '#d3bb8c', ang: 0.6, passo: 2.6, maxL: 1.3, sombra: sombraOval(x, y, s, s * 0.7, 0), cruzada: 0.72, traco: 1.4 });
    }
    // dois pedaços de calcário caídos da encosta, irregulares, com a face de cima clara
    for (const [x, y, w, h] of [[176, 712, 92, 40], [736, 692, 70, 30]]) {
      const pts = [[x - w / 2, y + h * 0.4], [x - w * 0.46, y - h * 0.1], [x - w * 0.3, y - h * 0.48], [x + w * 0.05, y - h * 0.55], [x + w * 0.36, y - h * 0.42], [x + w / 2, y - h * 0.05], [x + w * 0.44, y + h * 0.42], [x, y + h * 0.5]];
      const p = contornoRocha(r, pts, 4);
      p.closePath();
      sombraNoChao(k, p, 14, 8, 6, 0.4);
      peca(k, p, [x - w / 2, y - h, x + w / 2, y + h], { cor: '#dcc697', ang: 0.8, passo: 3.4, maxL: 1.6, sombra: (px, py) => 0.15 + (py - y + h * 0.5) / h * 0.6 + Math.max(0, (px - x) / w) * 0.3, cruzada: 0.72, traco: 1.8 });
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.4;
      k.beginPath();
      k.moveTo(x - w * 0.46, y - h * 0.05);
      k.quadraticCurveTo(x, y - h * 0.02, x + w * 0.48, y - h * 0.1);
      k.stroke();
      for (let i = 0; i < 6; i++) { k.fillStyle = 'rgba(52,36,16,.5)'; k.beginPath(); k.ellipse(x - w / 3 + r() * w * 0.6, y + r() * h * 0.3, 1.6, 1.1, 0, 0, 6.283); k.fill(); }
    }
    capim(k, r, 120, 652, 40, 13, 'rgba(70,52,24,.8)');
    capim(k, r, 610, 650, 34, 11, 'rgba(70,52,24,.8)');
    capim(k, r, 860, 660, 30, 10, 'rgba(70,52,24,.8)');

    k.save();
    k.translate(420, 612);
    k.scale(1.3, 1.3);
    k.translate(-420, -612);
    // a grande pedra redonda, rolada para o lado, de pé no sulco, inteira e com ar em volta
    const pcx = 590;
    const pcy = 492;
    const R = 112;
    const esp = 26;
    // a sombra dela na rocha
    k.save();
    k.filter = 'blur(10px)';
    k.fillStyle = 'rgba(40,26,8,.35)';
    k.beginPath();
    k.ellipse(pcx + 26, pcy + 8, R * 1.02, R, 0, 0, 6.283);
    k.fill();
    k.restore();
    // a espessura: a borda que se vê do lado da boca (a luz vem da esquerda)
    const aro = new Path2D();
    aro.ellipse(pcx - esp, pcy, R * 0.98, R, 0, Math.PI * 0.5, Math.PI * 1.5);
    aro.lineTo(pcx, pcy - R);
    aro.ellipse(pcx, pcy, R * 0.98, R, 0, Math.PI * 1.5, Math.PI * 0.5, true);
    aro.closePath();
    peca(k, aro, [pcx - R - esp, pcy - R, pcx, pcy + R], { cor: '#d4bb88', ang: 1.45, passo: 3.2, maxL: 1.5, sombra: (x, y) => 0.25 + (y - pcy + R) / (2 * R) * 0.5, cruzada: 0.8, traco: 2.2, obj });
    // a face: pedra lavrada, abaulada, clara do lado da manhã, com os talhos do cinzel
    const face = new Path2D();
    face.ellipse(pcx, pcy, R * 0.98, R, 0, 0, 6.283);
    k.fillStyle = '#e8d6a8';
    k.fill(face);
    marcar(k, obj, face);
    const so = (x, y) => { const u = (x - pcx) / R; const v = (y - pcy) / R; return 0.15 + Math.max(0, u * 0.45 + v * 0.35) + Math.max(0, u * u + v * v - 0.75) * 0.9; };
    gravar(k, face, pcx, pcy, R * 1.05, 0.7, 4, 1.8, so, SEPIA, 0.25);
    gravar(k, face, pcx, pcy, R * 1.05, -0.5, 5, 1.3, (x, y) => (so(x, y) - 0.45) * 1.6, SEPIA, 0);
    k.save();
    k.clip(face);
    k.strokeStyle = 'rgba(60,42,18,.35)';
    k.lineCap = 'round';
    for (let i = 0; i < 50; i++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * R * 0.92;
      const x = pcx + Math.cos(a) * d;
      const y = pcy + Math.sin(a) * d;
      k.lineWidth = 1 + r();
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + Math.cos(a + 1.6) * (4 + r() * 5), y + Math.sin(a + 1.6) * (4 + r() * 5));
      k.stroke();
    }
    // uma lasca no rebordo e uma rachadura fina
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(pcx + 40, pcy - R + 12);
    k.lineTo(pcx + 52, pcy - R + 40);
    k.lineTo(pcx + 46, pcy - R + 66);
    k.stroke();
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 3;
    k.stroke(face);
    // a luz da manhã no rebordo de cima, à esquerda
    k.strokeStyle = 'rgba(255,246,220,.85)';
    k.lineWidth = 2.4;
    k.beginPath();
    k.ellipse(pcx, pcy, R * 0.98 - 4, R - 4, 0, Math.PI * 1.05, Math.PI * 1.55);
    k.stroke();
    // o calço de pedra que segura a pedra no sulco
    const calco = contornoRocha(r, [[pcx - 118, 612], [pcx - 128, 588], [pcx - 96, 578], [pcx - 82, 610]], 2);
    calco.closePath();
    peca(k, calco, [pcx - 130, 576, pcx - 80, 614], { cor: '#d6c393', ang: 0.7, passo: 3, maxL: 1.4, sombra: () => 0.55, cruzada: 0.8, traco: 1.8, obj });
    k.restore();
    k.restore();
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

  // A fumaça em gravura: do fogo sobe um fio estreito de traços que serpenteiam e, mais acima,
  // rolos que se abrem com o vento (vai), cada um com o contorno em ondinhas e a hachura curva
  // do lado da sombra, cada vez mais claros, até sumir no céu. Sem disco de luz nem tampa.
  function fumaca(k, r, x, y, yTopo, larg0, larg1, vai, cor = SEPIA) {
    const alto = y - yTopo;
    const meio = (t) => x + vai * Math.pow(t, 1.4) + Math.sin(t * 6.2 + 0.4) * 22 * t;
    const larg = (t) => larg0 + (larg1 - larg0) * Math.pow(t, 0.9);
    k.save();
    k.lineCap = 'round';
    k.strokeStyle = cor;
    // o fio que sai do fogo
    for (let i = 0; i < 7; i++) {
      const u = (i / 6) * 2 - 1;
      const fase = r() * 6.283;
      let ant = null;
      for (let t = 0; t <= 0.3; t += 0.01) {
        const px = meio(t) + u * larg(t) * 0.32 + Math.sin(t * 20 + fase) * 4;
        const py = y - t * alto;
        if (ant) {
          k.globalAlpha = 0.75;
          k.lineWidth = 1.5 - t * 2;
          k.beginPath();
          k.moveTo(ant[0], ant[1]);
          k.lineTo(px, py);
          k.stroke();
        }
        ant = [px, py];
      }
    }
    // os rolos, do mais alto (atrás) ao mais baixo (na frente)
    const rolos = [];
    for (let i = 0; i < 9; i++) {
      const t = 0.2 + i * 0.095;
      rolos.push({ t, x: meio(t) + (i % 2 ? 1 : -1) * larg(t) * 0.18 + (r() - 0.5) * 10, y: y - t * alto, rr: larg(t) * (0.34 + r() * 0.08) });
    }
    for (const q of rolos.reverse()) {
      const forma = seixo(r, q.x, q.y, q.rr, q.rr * 0.78, (r() - 0.5) * 0.4, 0.07);
      const a = Math.max(0, 1 - q.t * 1.05);
      k.globalAlpha = 0.25 + a * 0.6;
      k.fillStyle = '#efe5ca';
      k.fill(forma);
      k.globalAlpha = 0.15 + a * 0.75;
      const so = sombraOval(q.x, q.y, q.rr, q.rr * 0.78, 0);
      gravar(k, forma, q.x, q.y, q.rr * 1.1, 0.5, 4.2, 1.5 * a + 0.3, (px, py) => (so(px, py) - 0.45) * 1.6, cor, 0.35);
      // o contorno em ondinhas, só do lado de baixo e da direita (o de cima se perde na luz)
      k.lineWidth = 0.8 + a * 1.1;
      k.beginPath();
      for (let g = -0.6; g <= 2.6; g += 0.05) {
        const w = 1 + Math.sin(g * 9) * 0.035;
        const px = q.x + Math.cos(g) * q.rr * w;
        const py = q.y + Math.sin(g) * q.rr * 0.78 * w;
        if (g === -0.6) k.moveTo(px, py); else k.lineTo(px, py);
      }
      k.stroke();
    }
    k.restore();
  }
  // O contorno de uma labareda: a base reta e, em cima, as línguas (pontas de alturas soltas,
  // tortas para o lado do vento), ligadas por vales, com os lados em curva de S.
  function contornoDeLabareda(x, y, larg, picos) {
    const p = new Path2D();
    p.moveTo(x - larg / 2, y);
    let ant = [x - larg / 2, y - picos[0].v];
    p.quadraticCurveTo(x - larg / 2 - 6, y - picos[0].v * 0.4, ant[0], ant[1]);
    picos.forEach((q, i) => {
      const prox = picos[i + 1];
      const vale = prox ? [(q.x + prox.x) / 2 + q.vai * 0.25, y - prox.v] : [x + larg / 2, y - q.v * 0.5];
      const ponta = [q.x + q.vai, y - q.h];
      const dy = ant[1] - ponta[1];
      p.bezierCurveTo(ant[0] - 4, ant[1] - dy * 0.45, ponta[0] - q.vai * 0.7 - q.curva, ponta[1] + dy * 0.42, ponta[0], ponta[1]);
      const dy2 = vale[1] - ponta[1];
      p.bezierCurveTo(ponta[0] - q.vai * 0.15 + q.curva * 0.5, ponta[1] + dy2 * 0.35, vale[0] + 6, vale[1] - dy2 * 0.5, vale[0], vale[1]);
      ant = vale;
    });
    p.quadraticCurveTo(x + larg / 2 + 8, y - 10, x + larg / 2, y);
    p.closePath();
    return p;
  }
  // O fogo do altar em gravura: uma labareda só, larga e baixa, com várias línguas tortas
  // para o lado do vento; o miolo claro; a hachura que sobe acompanhando o fogo, mais cheia
  // nas beiradas; umas lascas soltas no alto e as fagulhas. É fogo de lenha; a tocha de
  // Gideão tem outro.
  function fogoDoAltar(k, r, x, y, larg, alto, n, vento = 1) {
    const picos = Array.from({ length: n }, (_, i) => {
      const t = (i + 0.5) / n - 0.5;
      const h = alto * Math.max(0.12, 1 - Math.abs(t) * 1.7) * (0.55 + r() * 0.5) * (i % 2 ? 0.8 : 1);
      return { x: x + t * larg * 0.9 + (r() - 0.5) * 10, h, v: h * (0.3 + r() * 0.2), vai: vento * (h * 0.14 + r() * 16), curva: (r() - 0.5) * 18 };
    });
    // a do meio é a mais alta
    const m = picos[Math.floor(n / 2)];
    m.h = Math.min(alto, Math.max(...picos.map((q) => q.h)) * 1.18);
    m.vai = vento * m.h * 0.2;
    m.curva = 22;
    const fora = contornoDeLabareda(x, y, larg, picos);
    const dentro = contornoDeLabareda(x + 6, y, larg * 0.62, picos.slice(1, -1).map((q) => ({ ...q, x: x + 6 + (q.x - x) * 0.62, h: q.h * 0.58, v: q.v * 0.7, vai: q.vai * 0.6 })));
    k.save();
    k.lineJoin = 'round';
    k.fillStyle = 'rgba(217,138,58,.72)';
    k.fill(fora);
    k.fillStyle = 'rgba(255,230,168,.85)';
    k.fill(dentro);
    // a hachura sobe com o fogo, inclinada para o vento, mais grossa longe do miolo
    gravar(k, fora, x, y - alto / 2, alto * 0.75, -Math.PI / 2 + vento * 0.16, 3.4, 1.6,
      (px, py) => 0.12 + Math.min(1, Math.abs(px - x - (y - py) * 0.16 * vento) / (larg * 0.5)) * 0.8 - Math.max(0, (py - y + alto * 0.5) / alto) * 0.3, '#6b2a08', 0.3);
    gravar(k, dentro, x, y - alto / 3, alto * 0.5, -Math.PI / 2 + vento * 0.16, 4.4, 0.9, () => 0.5, '#9a4a14', 0.3);
    k.strokeStyle = '#5a2406';
    k.lineWidth = 1.8;
    k.stroke(fora);
    k.lineWidth = 1;
    k.strokeStyle = 'rgba(120,52,14,.7)';
    k.stroke(dentro);
    k.strokeStyle = '#7a3410';
    k.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const px = x + (r() - 0.3) * larg * 0.8;
      const py = y - alto * (0.85 + r() * 0.5);
      const a = -Math.PI / 2 + vento * 0.4 + (r() - 0.5) * 0.8;
      k.lineWidth = 1.3 + r() * 0.8;
      k.beginPath();
      k.moveTo(px, py);
      k.lineTo(px + Math.cos(a) * (3 + r() * 4), py + Math.sin(a) * (3 + r() * 4));
      k.stroke();
    }
    k.restore();
  }
  // Um cordeiro deitado, de perfil para a esquerda, com a cabeça erguida: a lã em cachinhos
  // gravados (mais cheios e mais escuros embaixo, longe da luz), a cara de pelo curto, a
  // orelha de lado, o olho manso, o focinho e os cascos. (ox, oy) é o chão sob a barriga.
  function cordeiro(k, r, ox, oy, e, obj) {
    k.save();
    k.translate(ox, oy);
    k.scale(e, e);
    k.lineJoin = 'round';
    k.lineCap = 'round';
    k.save();
    k.filter = 'blur(9px)';
    k.fillStyle = 'rgba(40,26,10,.42)';
    k.beginPath();
    k.ellipse(14, 4, 160, 17, 0, 0, 6.283);
    k.fill();
    k.restore();
    const tinta = '#3a2c18';
    // o casco de trás, que aparece sob a barriga, e o rabo
    const cascoTras = pol([[48, -12], [26, -10], [16, 1], [50, 1]]);
    peca(k, cascoTras, [16, -12, 50, 1], { cor: '#4a3a26', sombra: () => 0.6, passo: 3, maxL: 1, traco: 1.6, tinta, obj });
    const rabo = lanoso(r, [[118, -70], [140, -66], [150, -40], [142, -20], [126, -28]], 4, 9);
    peca(k, rabo, [118, -70, 150, -20], { cor: '#efe6cf', sombra: (x, y) => 0.4 + (y + 70) / 90, passo: 3.6, maxL: 1.3, traco: 1.8, tinta, obj });
    // o corpo de lã
    const corpo = lanoso(r, [[-112, -6], [-126, -40], [-134, -80], [-130, -112], [-114, -134], [-84, -128], [-40, -124], [10, -128], [60, -122],
      [100, -106], [128, -78], [136, -44], [126, -16], [98, -2], [40, 2], [-30, 2], [-80, 0]], 6, 15);
    k.fillStyle = '#f7f0de';
    k.fill(corpo);
    marcar(k, obj, corpo);
    const so = sombraOval(-2, -66, 136, 70, 0);
    gravar(k, corpo, 0, -64, 160, 0.35, 5, 1.5, (x, y) => (so(x, y) - 0.5) * 1.6, tinta, 0.25);
    k.save();
    k.clip(corpo);
    // os cachos: fileiras de arcos que seguem o volume
    for (let y = -132, f = 0; y < 6; y += 9.5, f++) {
      for (let x = -140 + (f % 2) * 6; x < 142; x += 11.5) {
        const px = x + (r() - 0.5) * 6;
        const py = y + (r() - 0.5) * 4;
        const s = Math.max(0, Math.min(1, so(px, py)));
        if (r() > s * 1.05 + 0.22) continue;
        const rr = 3.4 + r() * 2.4;
        const a0 = 2.2 + (r() - 0.5) * 1.6;
        k.lineWidth = 0.7 + s * 1.5;
        k.strokeStyle = 'rgba(58,44,24,' + (0.4 + s * 0.5).toFixed(2) + ')';
        k.beginPath();
        k.arc(px, py, rr, a0, a0 + 3.4 + r() * 1.2);
        k.stroke();
      }
    }
    k.restore();
    k.strokeStyle = tinta;
    k.lineWidth = 2;
    k.stroke(corpo);
    // a perna da frente dobrada para a frente, com o casco fendido
    const perna = pol([[-100, -26], [-120, -22], [-136, -14], [-140, -2], [-124, 0], [-100, -2]]);
    peca(k, perna, [-140, -26, -100, 0], { cor: '#f1e8d2', sombra: (x, y) => 0.25 + (y + 24) / 34, passo: 3.4, maxL: 1.3, traco: 1.8, tinta, obj });
    const casco = pol([[-136, -15], [-149, -11], [-155, -1], [-136, -1]]);
    peca(k, casco, [-155, -15, -136, -1], { cor: '#4a3a26', sombra: () => 0.55, passo: 3, maxL: 1, traco: 1.6, tinta, obj });
    k.strokeStyle = '#efe6cf';
    k.lineWidth = 1.2;
    k.beginPath();
    k.moveTo(-145, -10);
    k.lineTo(-147, -2);
    k.stroke();
    // a cabeça é grande (é um filhote): tudo dela sai 1,18 vez em volta do pescoço
    k.save();
    k.translate(-118, -126);
    k.scale(1.18, 1.18);
    k.translate(118, 126);
    // a orelha de trás, só a ponta acima da cabeça
    const orelha2 = new Path2D();
    orelha2.moveTo(-142, -156);
    orelha2.quadraticCurveTo(-140, -180, -118, -186);
    orelha2.quadraticCurveTo(-124, -168, -128, -154);
    orelha2.closePath();
    peca(k, orelha2, [-142, -186, -118, -154], { cor: '#e3d6b8', sombra: () => 0.6, passo: 3, maxL: 1.2, traco: 1.6, tinta, obj });
    // a cabeça: o perfil de nariz curvo, o focinho e o queixo
    const cab = new Path2D();
    cab.moveTo(-110, -150);
    cab.bezierCurveTo(-128, -168, -158, -168, -174, -152);
    cab.bezierCurveTo(-188, -138, -198, -118, -205, -102);
    cab.bezierCurveTo(-209, -93, -204, -85, -194, -84);
    cab.bezierCurveTo(-182, -82, -168, -88, -152, -96);
    cab.bezierCurveTo(-136, -104, -122, -108, -108, -120);
    cab.closePath();
    k.fillStyle = '#f6eedb';
    k.fill(cab);
    marcar(k, obj, cab);
    gravar(k, cab, -156, -126, 70, 2.56, 3.4, 1.5, (x, y) => (y + 128) / 40 + (x + 150) / 160 - 0.1, tinta, 0.2);
    k.strokeStyle = tinta;
    k.lineWidth = 2;
    k.stroke(cab);
    // o topete de lã entre as orelhas
    const topete = lanoso(r, [[-156, -158], [-142, -170], [-120, -166], [-106, -148], [-124, -148], [-142, -152]], 4, 8);
    k.fillStyle = '#f7f0de';
    k.fill(topete);
    k.save();
    k.clip(topete);
    k.strokeStyle = 'rgba(58,44,24,.6)';
    k.lineWidth = 1;
    for (let i = 0; i < 9; i++) { k.beginPath(); k.arc(-150 + i * 5 + (r() - 0.5) * 4, -158 + (r() - 0.5) * 8, 3, 2, 5.6); k.stroke(); }
    k.restore();
    k.strokeStyle = tinta;
    k.lineWidth = 1.6;
    k.stroke(topete);
    // a orelha da frente, de lado, caída para trás
    const orelha = new Path2D();
    orelha.moveTo(-128, -150);
    orelha.quadraticCurveTo(-106, -164, -80, -150);
    orelha.quadraticCurveTo(-102, -136, -126, -140);
    orelha.closePath();
    peca(k, orelha, [-128, -164, -80, -136], { cor: '#efe2c6', sombra: (x, y) => 0.2 + (y + 150) / 24, passo: 3, maxL: 1.3, traco: 1.8, tinta, obj });
    // o olho manso, com a pálpebra, a narina e a boca
    k.save();
    k.translate(-160, -134);
    k.rotate(0.45);
    k.fillStyle = '#2a1e10';
    k.beginPath();
    k.ellipse(0, 0, 6.4, 3.8, 0, 0, 6.283);
    k.fill();
    k.fillStyle = 'rgba(255,248,226,.9)';
    k.beginPath();
    k.arc(-2.2, -1.2, 1.3, 0, 6.283);
    k.fill();
    k.strokeStyle = tinta;
    k.lineWidth = 1.6;
    k.beginPath();
    k.ellipse(0, 0.6, 9, 6, 0, Math.PI * 1.08, Math.PI * 1.92);
    k.stroke();
    k.restore();
    k.lineWidth = 1.8;
    k.beginPath();
    k.moveTo(-196, -110);
    k.quadraticCurveTo(-203, -106, -199, -100);
    k.stroke();
    k.beginPath();
    k.moveTo(-201, -92);
    k.quadraticCurveTo(-194, -91, -184, -93);
    k.stroke();
    k.restore();
    k.restore();
  }

  // (1) A oferta de Abel (Gn 4.4): o altar de pedras brutas com a lenha e o fogo, e a fumaça
  // subindo e se desfazendo no céu; ao pé do altar, deitado, o cordeiro, uma das primeiras crias
  // do rebanho, e o cajado de pastor (Abel era pastor de ovelhas, 4.2) encostado nas pedras.
  function desenhoAbel(k, W, H, obj) {
    const r = sorteio(5101);
    papelVelho(k, W, H, r, ['#fbf2da', '#efdfba', '#d4ba86'], [W * 0.4, 120]);
    linhas(k, 0, 0, W, 600, 7, 0.95, (x, y) => 0.12 + (1 - y / 600) * 0.55);
    // os morros de longe e o chão
    const fm = onda(r, 4, 0.01);
    const morro = pol([[-10, 640], ...Array.from({ length: 46 }, (_, i) => [i * 20, 560 + fm(i * 20) * 16]), [W + 10, 640]]);
    peca(k, morro, [0, 530, W, 640], { cor: '#e2cea2', ang: -0.15, passo: 5.5, maxL: 1.2, sombra: () => 0.72, cruzada: 0.6, traco: 1.6 });
    const chao = new Path2D();
    chao.rect(-10, 604, W + 20, H);
    k.fillStyle = '#dcc597';
    k.fill(chao);
    linhas(k, 0, 604, W, H, 5.5, 1.8, (x, y) => 0.22 + (y - 604) / 420);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(0, 604);
    for (let x = 0; x <= W; x += 8) k.lineTo(x, 604 + Math.sin(x * 0.03) * 1.5);
    k.stroke();
    // a fumaça, que sobe do fogo e se desfaz com o vento
    const cx = 330;
    fumaca(k, r, cx + 24, 400, 24, 110, 260, 120);
    // o altar: três fiadas de pedras brutas, de baixo para cima, e a sombra à direita
    sombraNoChao(k, pol([[220, 700], [600, 700], [720, 742], [300, 748]]), 10, 0, 12, 0.42);
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
    // a lenha em cima das pedras: toras cruzadas, com o topo cortado à mostra
    const toras = [[208, 532, 448, 520, 10], [228, 516, 466, 528, 9], [248, 506, 430, 500, 8.5]];
    for (const [x0, y0, x1, y1, rr] of toras) {
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const nx = -Math.sin(ang) * rr;
      const ny = Math.cos(ang) * rr;
      const tora = pol([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]);
      peca(k, tora, [x0, y0 - rr, x1, y1 + rr], { cor: '#8f6a42', ang, passo: 3, maxL: 1.7, sombra: (x, y) => 0.3 + ((y - (y0 + (x - x0) * Math.tan(ang))) / rr + 1) * 0.3, obj });
      const topo = new Path2D();
      topo.ellipse(x1, y1, rr * 0.55, rr, ang, 0, 6.283);
      k.fillStyle = '#e2c897';
      k.fill(topo);
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.6;
      k.stroke(topo);
      k.lineWidth = 0.9;
      k.beginPath();
      k.ellipse(x1, y1, rr * 0.28, rr * 0.5, ang, 0, 6.283);
      k.stroke();
    }
    // o fogo sobre a lenha
    fogoDoAltar(k, r, cx + 4, 514, 230, 210, 7);
    // uma tora na frente do fogo, para ele ficar dentro da lenha
    {
      const [x0, y0, x1, y1, rr] = [262, 528, 418, 536, 8];
      const tora = pol([[x0, y0 - rr], [x1, y1 - rr], [x1, y1 + rr], [x0, y0 + rr]]);
      peca(k, tora, [x0, y0 - rr, x1, y1 + rr], { cor: '#7d5a36', ang: 0.05, passo: 3, maxL: 1.7, sombra: (x, y) => 0.35 + (y - y0 + rr) / (rr * 2) * 0.5, obj });
      k.fillStyle = '#e2c897';
      k.beginPath();
      k.ellipse(x1, y1, rr * 0.55, rr, 0, 0, 6.283);
      k.fill();
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.5;
      k.stroke();
    }
    // o cajado de pastor, encostado nas pedras da esquerda, com a sombra onde toca
    const cajado = [[112, 722], ...bezier([112, 722], [124, 640], [146, 470], [162, 384], 24), ...bezier([162, 384], [166, 352], [178, 334], [198, 336], 10),
      ...bezier([198, 336], [220, 338], [228, 352], [224, 366], 10)];
    k.save();
    k.filter = 'blur(4px)';
    k.fillStyle = 'rgba(30,20,8,.4)';
    k.beginPath();
    k.ellipse(134, 642, 10, 18, 0.2, 0, 6.283);
    k.fill();
    k.beginPath();
    k.ellipse(122, 724, 22, 6, 0, 0, 6.283);
    k.fill();
    k.restore();
    vara(k, cajado, 9, '#a07648', obj);
    // o cordeiro deitado ao pé do altar
    cordeiro(k, r, 640, 772, 1, obj);
    capim(k, r, 88, 650, 30, 8);
    capim(k, r, 812, 640, 34, 9);
    capim(k, r, 300, 790, 26, 7);
    capim(k, r, 470, 730, 22, 6);
    vinheta(k, W, H, 0.22);
  }
  // (2) Noé e a arca (Gn 6.14-16): a embarcação comprida e baixa como uma caixa (150 por 15
  // metros, 6.15), que sai pela beirada da prancha, em terra seca; revestida de piche por dentro
  // e por fora (6.14), o casco quase preto, com o brilho do piche na curva e as tábuas compridas
  // de ponta a ponta, as juntas de piche; duas cintas marcam os três andares (6.16), e entre o
  // teto e o corpo fica a abertura de meio metro. A porta do lado desceu como rampa, de frente
  // para quem olha, e as pegadas dos bichos, duas a duas, sobem por ela. O céu pesa à direita.
  function desenhoNoe(k, W, H, obj) {
    const r = sorteio(5201);
    papelVelho(k, W, H, r, ['#f6ecd2', '#e6d6b0', '#c9b088'], [W * 0.15, 110]);
    linhas(k, 0, 0, W, 506, 6.5, 1.5, (x, y) => 0.1 + (x / W) ** 1.5 * 0.7 + (1 - y / 506) * 0.22);
    // as nuvens pesadas à direita: rolos de contorno em ondinhas, com a hachura embaixo
    for (const [x, y, rx, ry] of [[820, 230, 150, 46], [700, 150, 190, 54], [860, 90, 170, 50], [560, 70, 120, 34]]) {
      const n = lanoso(r, Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * 6.283; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry * (Math.sin(a) > 0 ? 0.7 : 1.1)]; }), 6, 30);
      k.save();
      k.filter = 'blur(3px)';
      k.fillStyle = '#efe4c8';
      k.fill(n);
      k.restore();
      gravar(k, n, x, y, rx * 1.1, 0, 3.6, 1.9, (px, py) => Math.max(0, (py - y + ry * 0.1) / (ry * 1.1)) * 1.1, SEPIA, 0);
    }
    // os morros de longe e o chão seco
    const fm = onda(r, 4, 0.012);
    const morro = pol([[-10, 520], ...Array.from({ length: 46 }, (_, i) => [i * 20, 482 + fm(i * 20) * 12]), [W + 10, 520]]);
    peca(k, morro, [0, 462, W, 520], { cor: '#dccaa0', ang: -0.15, passo: 5.5, maxL: 1.2, sombra: () => 0.7, cruzada: 0.6, traco: 1.6 });
    const chao = new Path2D();
    chao.rect(-10, 506, W + 20, H);
    k.fillStyle = '#d9c293';
    k.fill(chao);
    linhas(k, 0, 506, W, H, 5.5, 1.7, (x, y) => 0.2 + (y - 506) / 560);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(0, 506);
    k.lineTo(W, 506);
    k.stroke();
    // a arca: o casco comprido, o vão de meio metro e o teto baixo
    const xE = -60;
    const xD = 806;
    const fundo = 600;
    const borda = (x) => 418 - 8 * ((x - 380) / 440) ** 2;
    sombraNoChao(k, pol([[xE, fundo - 6], [xD, fundo - 6], [xD + 60, fundo + 30], [xE, fundo + 34]]), 0, 0, 12, 0.5);
    // os calços de madeira sob o casco
    for (const x of [40, 190, 340, 610, 760]) {
      const p = pol([[x - 22, fundo - 6], [x + 22, fundo - 6], [x + 26, fundo + 14], [x - 26, fundo + 14]]);
      peca(k, p, [x - 26, fundo - 6, x + 26, fundo + 14], { cor: '#9a7a50', sombra: () => 0.5, passo: 3.2, maxL: 1.3, traco: 1.8 });
    }
    const casco = new Path2D();
    casco.moveTo(xE, borda(xE));
    for (let x = xE; x <= xD + 14; x += 12) casco.lineTo(x, borda(x));
    casco.lineTo(xD + 16, borda(xD + 16));
    casco.quadraticCurveTo(xD + 6, fundo - 30, xD - 14, fundo);
    casco.lineTo(xE, fundo);
    casco.closePath();
    k.fillStyle = '#1c140c';
    k.fill(casco);
    marcar(k, obj, casco);
    k.save();
    k.clip(casco);
    // as tábuas, de ponta a ponta, seguindo o tosado: a junta de piche e o brilho na beirada
    const nT = 10;
    const yT = (x, t) => borda(x) + (fundo - borda(x)) * t;
    for (let i = 1; i < nT; i++) {
      const t = i / nT;
      const cinta = i === 4 || i === 7;
      k.strokeStyle = '#050302';
      k.lineWidth = cinta ? 9 : 2.2;
      k.beginPath();
      for (let x = xE; x <= xD + 20; x += 10) (x === xE ? k.moveTo(x, yT(x, t)) : k.lineTo(x, yT(x, t)));
      k.stroke();
      // o brilho do piche: forte na luz (esquerda, em cima) e sumindo para a direita
      for (let x = xE; x <= xD + 20; x += 10) {
        const a = Math.max(0, 0.42 - (x - xE) / 2100 - t * 0.18) * (cinta ? 1.3 : 1);
        if (a < 0.02) continue;
        k.strokeStyle = 'rgba(255,232,190,' + a.toFixed(3) + ')';
        k.lineWidth = cinta ? 1.8 : 1.2;
        k.beginPath();
        k.moveTo(x, yT(x, t) + (cinta ? 5.5 : 2.4));
        k.lineTo(x + 10, yT(x + 10, t) + (cinta ? 5.5 : 2.4));
        k.stroke();
      }
      // os topos das tábuas, poucos e espaçados (tábua comprida não é tijolo)
      k.strokeStyle = '#050302';
      k.lineWidth = 1.6;
      for (let x = xE + 150 + ((i * 211) % 260); x < xD; x += 330 + r() * 120) {
        k.beginPath();
        k.moveTo(x, yT(x, t - 1 / nT) + 2);
        k.lineTo(x + 2, yT(x, t));
        k.stroke();
      }
    }
    // a faixa de brilho na curva do casco: hachura clara bem fina, no terço de cima
    gravar(k, casco, 300, 530, 520, 0.02, 3, 1, (x, y) => Math.max(0, 0.5 - Math.abs(y - borda(x) - 34) / 40) * (1 - x / 1100), 'rgba(255,236,200,.55)', 0);
    // as cavilhas de madeira em fileiras
    k.fillStyle = 'rgba(120,96,64,.7)';
    for (let i = 1; i < nT; i += 2) for (let x = xE + 40 + (i % 4) * 20; x < xD; x += 84) { k.beginPath(); k.arc(x, yT(x, i / nT + 0.05), 1.8, 0, 6.283); k.fill(); }
    k.restore();
    k.strokeStyle = '#000';
    k.lineWidth = 3;
    k.stroke(casco);
    // o vão de meio metro entre o teto e o corpo, com os esteios
    const vao = pol([[xE, borda(xE) - 16], [xD + 8, borda(xD) - 16], [xD + 16, borda(xD + 16)], [xE, borda(xE)]]);
    k.fillStyle = '#0c0805';
    k.fill(vao);
    marcar(k, obj, vao);
    for (let x = xE + 20; x < xD; x += 46) {
      const p = pol([[x, borda(x) - 16], [x + 7, borda(x) - 16], [x + 7, borda(x)], [x, borda(x)]]);
      peca(k, p, [x, borda(x) - 16, x + 7, borda(x)], { cor: '#3a2a1a', sombra: () => 0.3, passo: 3, maxL: 0.8, traco: 1, tinta: '#000' });
    }
    // o teto baixo, de tábuas cobertas de piche, com o beiral
    const teto = new Path2D();
    teto.moveTo(xE, borda(xE) - 14);
    for (let x = xE; x <= xD + 30; x += 12) teto.lineTo(x, borda(x) - 14);
    teto.lineTo(xD + 30, borda(xD) - 12);
    teto.lineTo(xD - 10, borda(xD) - 58);
    for (let x = xD - 10; x >= xE; x -= 12) teto.lineTo(x, borda(x) - 58);
    teto.closePath();
    peca(k, teto, [xE, borda(0) - 60, xD + 30, borda(0) - 10], { cor: '#2b1f13', ang: 1.42, passo: 4.2, maxL: 1.6, sombra: (x, y) => 0.2 + x / 1600, tinta: '#000', obj, traco: 2.6, cruzada: 1 });
    k.save();
    k.clip(teto);
    for (let x = xE + 30; x < xD + 20; x += 30) {
      k.strokeStyle = 'rgba(255,232,190,' + Math.max(0.06, 0.32 - x / 2600).toFixed(3) + ')';
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(x, borda(x) - 57);
      k.lineTo(x + 6, borda(x) - 15);
      k.stroke();
    }
    k.restore();
    k.strokeStyle = 'rgba(255,232,190,.35)';
    k.lineWidth = 1.5;
    k.beginPath();
    k.moveTo(xE, borda(xE) - 56);
    for (let x = xE; x <= xD - 10; x += 12) k.lineTo(x, borda(x) - 56);
    k.stroke();
    // a porta do lado, aberta, e a rampa: a própria porta descida até o chão, vindo para a frente
    const p0 = 470;
    const p1 = 548;
    const sol = fundo - 6;
    const topoP = 494;
    const porta = pol([[p0, topoP], [p1, topoP - 1], [p1, sol], [p0, sol]]);
    k.fillStyle = '#060402';
    k.fill(porta);
    k.save();
    k.clip(porta);
    linhas(k, p0, topoP, p1, sol, 4, 1.2, (x, y) => 0.25 + (y - topoP) / 200, 'rgba(160,110,60,.6)');
    k.restore();
    k.strokeStyle = '#7a5834';
    k.lineWidth = 3;
    k.stroke(porta);
    const rampa = pol([[p0 - 2, sol], [p1 + 2, sol], [p1 + 66, 790], [p0 - 70, 790]]);
    sombraNoChao(k, rampa, 16, 4, 10, 0.45);
    peca(k, rampa, [p0 - 70, sol, p1 + 66, 790], { cor: '#93704a', ang: 0.02, passo: 4.4, maxL: 1.3, sombra: (x, y) => 0.22 + (x - p0) / 700 + (y - sol) / 900, tinta: '#140c05', obj, traco: 2.4 });
    // as tábuas atravessadas da rampa, mais juntas lá no alto (a perspectiva) e os sarrafos
    k.strokeStyle = '#140c05';
    for (let i = 1; i < 13; i++) {
      const t = i / 13;
      const y = sol + (790 - sol) * t ** 1.3;
      const u = (y - sol) / (790 - sol);
      k.lineWidth = 1.2 + u * 1.8;
      k.beginPath();
      k.moveTo(p0 - 2 - 68 * u, y);
      k.lineTo(p1 + 2 + 64 * u, y);
      k.stroke();
    }
    // as pegadas, duas a duas: vêm pelo chão, chegam ao pé da rampa e sobem por ela
    const pegada = (x, y, e, giro, tipo) => {
      k.save();
      k.translate(x, y);
      k.rotate(giro);
      k.fillStyle = 'rgba(38,26,12,.8)';
      if (tipo === 'casco') {
        for (const lado of [-1, 1]) { k.beginPath(); k.ellipse(lado * 2.8 * e, 0, 2.3 * e, 5 * e, lado * 0.12, 0, 6.283); k.fill(); }
      } else {
        k.beginPath(); k.ellipse(0, 1.8 * e, 3.6 * e, 3 * e, 0, 0, 6.283); k.fill();
        for (let d = -1.5; d <= 1.5; d += 1) { k.beginPath(); k.arc(d * 2.6 * e, -3.4 * e - Math.abs(d) * -0.6 * e, 1.3 * e, 0, 6.283); k.fill(); }
      }
      k.restore();
    };
    const pe = [(p0 + p1) / 2, 786];
    const caminho = [...bezier([20, 700], [230, 690], [pe[0] - 70, 800], pe, 11)];
    for (const [trilha, dx, tipo] of [[0, -18, 'casco'], [1, 18, 'pata']]) {
      caminho.forEach(([x, y], i) => {
        if (i === caminho.length - 1) return;
        const [x2, y2] = caminho[i + 1];
        const d = Math.hypot(x2 - x, y2 - y) || 1;
        const giro = Math.atan2(y2 - y, x2 - x) + Math.PI / 2;
        const e = 1.25 + (i % 2) * 0.05 - trilha * 0.05;
        pegada(x - ((y2 - y) / d) * dx + ((x2 - x) / d) * (i % 2) * 6, y + ((x2 - x) / d) * dx + ((y2 - y) / d) * (i % 2) * 6, e, giro, tipo);
      });
      // na rampa: sobem, cada vez menores
      for (let i = 0; i < 6; i++) {
        const u = 1 - (i + 0.5) / 7;
        const y = sol + (790 - sol) * u ** 1.3;
        const cxr = (p0 + p1) / 2 + (dx * 0.9 + (i % 2) * 4) * (0.35 + u * 0.65);
        pegada(cxr, y, 0.6 + u * 0.9, 0, tipo);
      }
    }
    capim(k, r, 96, 660, 30, 8);
    capim(k, r, 300, 720, 28, 8);
    capim(k, r, 780, 760, 26, 7);
    capim(k, r, 680, 650, 22, 6);
    vinheta(k, W, H, 0.22);
  }
  // (3) Abraão e as estrelas (Gn 15.5): de noite, fora da tenda, o céu cheio de estrelas que
  // não se podem contar, com a Via Láctea atravessando; a tenda de pelo de cabra no alto do
  // morro, com a porta aberta e a lamparina acesa lá dentro (ele saiu). Gravura em linha
  // branca sobre o fundo escuro, como na xilogravura.
  function desenhoAbraao(k, W, H, obj) {
    const r = sorteio(5301);
    // a noite é a tinta lisa; o tom do céu vem só das linhas brancas da gravura
    k.fillStyle = '#15131b';
    k.fillRect(0, 0, W, H);
    papelVelho(k, W, H, r, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'], [W / 2, H / 2], true);
    // a linha branca do céu, mais cheia perto do horizonte
    linhas(k, 0, 0, W, 660, 5.5, 1.3, (x, y) => 0.06 + (y / 660) ** 2 * 0.8, 'rgba(236,220,186,.42)');
    // a Via Láctea: uma faixa de luz e de estrelas miúdas, na diagonal
    const via = (t) => [80 + t * 760, 600 - t * 560];
    for (let i = 0; i < 2200; i++) {
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
    // a tenda sai 1,25 vez, em volta do pé do meio (para ler na miniatura)
    k.save();
    k.translate(tc + 44, B);
    k.scale(1.25, 1.25);
    k.translate(-tc, -B);
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
    k.restore();
    vinheta(k, W, H, 0.35);
  }
  // (4) O riso de Sara (Gn 21.1-7): Isaque nasceu quando Abraão tinha cem anos. Na sombra da
  // tenda, o berço de vime em espiral (a trama natural, que acompanha a curva) com a criança
  // enrolada nos panos: só o embrulho de pano, com as faixas cruzadas, a manta de beirada
  // tecida caindo pela frente, sem rosto. No chão, o chocalho de barro em forma de romã;
  // encostados no esteio, os dois cajados gastos dos velhos. Lá fora, o sol do deserto; no
  // alto, só a beirada do pano da tenda, com as borlas.
  function desenhoSara(k, W, H, obj) {
    const r = sorteio(5401);
    papelVelho(k, W, H, r, ['#fdf3d8', '#f0dcae', '#d6b984'], [W * 0.9, 330]);
    // lá fora, à direita: o horizonte claro, o sol e a areia
    linhas(k, 560, 120, W, 470, 7, 0.9, (x, y) => 0.08 + (470 - y) / 1400);
    const fm = onda(r, 3, 0.01);
    const morro = pol([[540, 500], ...Array.from({ length: 20 }, (_, i) => [540 + i * 20, 446 + fm(i * 20) * 8]), [W + 10, 500]]);
    peca(k, morro, [540, 430, W, 500], { cor: '#ead8ae', ang: -0.1, passo: 6, maxL: 1, sombra: () => 0.55, traco: 1.4 });
    k.strokeStyle = 'rgba(110,80,30,.6)';
    k.lineWidth = 1.4;
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (i / 16) * Math.PI * 2;
      k.beginPath();
      k.moveTo(800 + Math.cos(a) * 40, 210 + Math.sin(a) * 40);
      k.lineTo(800 + Math.cos(a) * (i % 2 ? 58 : 70), 210 + Math.sin(a) * (i % 2 ? 58 : 70));
      k.stroke();
    }
    k.beginPath();
    k.arc(800, 210, 30, 0, 6.283);
    k.stroke();
    // o fundo da tenda: o pano de pelo de cabra em faixas tecidas, na sombra
    const fundo = pol([[-10, 90], [600, 90], [600, 500], [-10, 500]]);
    peca(k, fundo, [-10, 90, 600, 500], { cor: '#5e4429', ang: 1.5, passo: 4.4, maxL: 2.1, sombra: (x) => 0.55 + (600 - x) / 1800, tinta: '#140d06', cruzada: 0.7, traco: 0 });
    k.save();
    k.clip(fundo);
    for (let x = -10; x < 600; x += 58) {
      k.fillStyle = 'rgba(160,126,84,.2)';
      k.fillRect(x, 90, 18, 420);
      k.strokeStyle = 'rgba(20,13,6,.6)';
      k.lineWidth = 1.4;
      k.beginPath();
      k.moveTo(x + 58, 90);
      k.lineTo(x + 58, 500);
      k.stroke();
    }
    k.restore();
    // o chão: areia lá fora e a esteira de junco na sombra
    const chao = pol([[-10, 496], [W + 10, 470], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#e4cd9c';
    k.fill(chao);
    linhas(k, 0, 470, W, H, 6, 1.5, (x, y) => 0.15 + (y - 470) / 700 + Math.max(0, 560 - x) / 1600);
    const esteira = pol([[30, 512], [640, 506], [760, 800], [-60, 800]]);
    peca(k, esteira, [-60, 506, 760, 800], { cor: '#c99c5c', ang: 0.02, passo: 4.4, maxL: 1.3, sombra: (x, y) => 0.4 + (600 - x) / 1600, traco: 2 });
    k.save();
    k.clip(esteira);
    k.strokeStyle = 'rgba(90,50,20,.55)';
    k.lineWidth = 1.3;
    for (let i = 1; i < 22; i++) {
      const t = i / 22;
      k.beginPath();
      k.moveTo(30 + 610 * t, 508);
      k.lineTo(-60 + 820 * t, 800);
      k.stroke();
    }
    k.strokeStyle = 'rgba(120,46,22,.6)';
    k.lineWidth = 6;
    for (const y of [530, 770]) { k.beginPath(); k.moveTo(-60, y); k.lineTo(W, y); k.stroke(); }
    k.restore();
    // a sombra da tenda no chão
    k.save();
    k.filter = 'blur(14px)';
    k.fillStyle = 'rgba(60,40,16,.22)';
    k.fillRect(-20, 500, 640, 400);
    k.restore();
    // o esteio da porta, com os dois cajados encostados, cruzados
    vara(k, [[606, 92], [610, 520]], 14, '#8a6440');
    k.save();
    k.filter = 'blur(4px)';
    k.fillStyle = 'rgba(30,20,8,.4)';
    k.beginPath();
    k.ellipse(590, 760, 60, 8, 0, 0, 6.283);
    k.fill();
    k.restore();
    const caj1 = Array.from({ length: 26 }, (_, i) => { const t = i / 25; return [548 + t * 66 + Math.sin(t * 17) * 3, 762 - t * 450 + Math.cos(t * 11) * 2]; });
    vara(k, [...caj1, ...bezier(caj1[25], [618, 292], [600, 272], [586, 286], 8)], 11, '#9a7244', obj);
    const caj2 = Array.from({ length: 26 }, (_, i) => { const t = i / 25; return [664 - t * 62 + Math.sin(t * 23) * 3, 768 - t * 436 + Math.cos(t * 9) * 2]; });
    vara(k, caj2, 12, '#7e5a34', obj);
    const nob = new Path2D();
    nob.ellipse(600, 326, 15, 12, 0.5, 0, 6.283);
    peca(k, nob, [585, 314, 615, 338], { cor: '#7a5432', sombra: sombraOval(600, 326, 15, 12, 0.5), passo: 3, maxL: 1.6, obj, traco: 2 });
    for (const [x, y] of [[612, 520], [626, 430], [640, 610]]) { k.strokeStyle = SEPIA; k.lineWidth = 1.6; k.beginPath(); k.ellipse(x, y, 5, 3, 0.3, 0, 6.283); k.stroke(); }
    // o berço: vime em espiral, oval, visto de cima e de lado
    const bx = 330;
    const bo = 560;
    const fd = 690;
    const RX = 224;
    const RY = 72;
    const rx2 = 190;
    const ry2 = 52;
    sombraNoChao(k, pol([[bx - 190, fd], [bx + 200, fd], [bx + 250, fd + 34], [bx - 150, fd + 40]]), -14, 0, 12, 0.55);
    const corpo = new Path2D();
    corpo.ellipse(bx, bo, RX, RY, 0, Math.PI, 0, true);
    corpo.lineTo(bx + rx2, fd);
    corpo.ellipse(bx, fd, rx2, ry2, 0, 0, Math.PI);
    corpo.closePath();
    k.fillStyle = '#c8a066';
    k.fill(corpo);
    marcar(k, obj, corpo);
    // as voltas da espiral, de cima a baixo, cada uma um rolo com luz em cima e sombra embaixo,
    // e os pontos de costura inclinados, desencontrados de uma volta para a outra
    k.save();
    k.clip(corpo);
    const nV = 9;
    const volta = (t) => ({ y: bo + (fd - bo) * t, rx: RX + (rx2 - RX) * t, ry: RY + (ry2 - RY) * t });
    for (let i = 0; i < nV; i++) {
      const a = volta(i / nV);
      const b = volta((i + 1) / nV);
      for (let g = 0.02; g < Math.PI - 0.02; g += 0.03) {
        const c = Math.cos(g);
        const lado = (1 + c) / 2;
        // sombra: o lado esquerdo (longe do sol) e a barriga de cada rolo
        for (let s = 0; s < 1; s += 0.2) {
          const y0 = a.y + Math.sin(g) * a.ry + (b.y + Math.sin(g) * b.ry - a.y - Math.sin(g) * a.ry) * s;
          const x0 = bx + c * (a.rx + (b.rx - a.rx) * s);
          const w = (0.4 + (1 - lado) * 1.4) * (s > 0.55 ? 1.3 : 0.5);
          if (w < 0.5 || r() < 0.2) continue;
          k.strokeStyle = 'rgba(46,30,12,.75)';
          k.lineWidth = w;
          k.beginPath();
          k.moveTo(x0, y0);
          k.lineTo(x0 - 6 * Math.sin(g), y0 + 0.5);
          k.stroke();
        }
      }
      k.strokeStyle = '#2e1e0c';
      k.lineWidth = 2;
      k.beginPath();
      k.ellipse(bx, b.y, b.rx, b.ry, 0, 0.02, Math.PI - 0.02);
      k.stroke();
      k.strokeStyle = 'rgba(255,238,196,.55)';
      k.lineWidth = 1.4;
      k.beginPath();
      k.ellipse(bx, a.y + 4, a.rx, a.ry, 0, 0.15, Math.PI * 0.62);
      k.stroke();
      // os pontos: costura que prende cada volta na de baixo
      k.strokeStyle = '#3a2610';
      k.lineWidth = 1.5;
      for (let g = 0.1 + (i % 2) * 0.09; g < Math.PI - 0.06; g += 0.18) {
        const x = bx + Math.cos(g) * (a.rx + b.rx) / 2;
        const y = (a.y + b.y) / 2 + Math.sin(g) * (a.ry + b.ry) / 2;
        const h = (b.y - a.y) * 0.9 * Math.max(0.4, Math.sin(g));
        k.beginPath();
        k.moveTo(x - 3, y - h / 2);
        k.lineTo(x + 3, y + h / 2);
        k.stroke();
      }
    }
    k.restore();
    k.strokeStyle = '#2e1e0c';
    k.lineWidth = 2.6;
    k.stroke(corpo);
    // a boca: o lado de dentro, de vime claro; a parede de trás desce em voltas de espiral, com
    // a hachura curva que escurece logo abaixo da borda de trás (a sombra dela), e o fundo
    const boca = new Path2D();
    boca.ellipse(bx, bo, RX - 8, RY - 6, 0, 0, 6.283);
    k.fillStyle = '#b48c56';
    k.fill(boca);
    k.save();
    k.clip(boca);
    for (let i = 0; i < 9; i++) {
      const cy = bo - (RY - 8) + 4 + i * 9;
      const rx = (RX - 12) * (1 - i * 0.035);
      const ry = (RY - 8) * (1 - i * 0.06);
      k.strokeStyle = 'rgba(46,30,12,.85)';
      k.lineWidth = 1.8;
      k.beginPath();
      k.ellipse(bx, cy + ry, rx, ry, 0, Math.PI * 1.03, Math.PI * 1.97);
      k.stroke();
      k.strokeStyle = 'rgba(255,238,196,.45)';
      k.lineWidth = 1.1;
      k.beginPath();
      k.ellipse(bx, cy + ry + 3, rx, ry, 0, Math.PI * 1.15, Math.PI * 1.6);
      k.stroke();
      // os pontos da costura, desencontrados
      k.strokeStyle = 'rgba(46,30,12,.75)';
      k.lineWidth = 1.2;
      for (let g = Math.PI * 1.08 + (i % 2) * 0.06; g < Math.PI * 1.94; g += 0.13) {
        const x = bx + Math.cos(g) * rx;
        const y = cy + ry + Math.sin(g) * ry + 4;
        k.beginPath();
        k.moveTo(x - 2, y - 3);
        k.lineTo(x + 2, y + 3);
        k.stroke();
      }
    }
    // a sombra da borda de trás, em hachura curva que acompanha a boca, e o lado esquerdo
    // (longe do sol) mais escuro
    gravar(k, boca, bx, bo, RX, 0.06, 3.4, 2, (x, y) => 0.95 - (y - bo + RY) / (RY * 1.5) + (bx - x) / 900, '#24160a', 0.5);
    gravar(k, boca, bx, bo, RX, 1.1, 4.4, 1.5, (x, y) => (0.85 - (y - bo + RY) / (RY * 1.4) - 0.3) * 1.8, '#24160a', 0);
    k.restore();
    const aro = (a0, a1) => cordao(k, Array.from({ length: 37 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 36; return [bx + Math.cos(a) * (RX - 3), bo + Math.sin(a) * (RY - 2)]; }), 10, { cor: '#d8b47a', escuro: '#2e1e0c', luz: 'rgba(255,240,200,.6)' });
    aro(Math.PI, Math.PI * 2);
    marcar(k, obj, boca);
    // a criança enrolada, afundada no berço (a beirada da frente passa por cima): o embrulho de
    // pano, a ponta da cabeça coberta por um capuz do mesmo pano, as faixas cruzadas e as
    // dobras; sem rosto
    const bb = bo + 40;
    const dentro = new Path2D();
    dentro.rect(-10, -10, W + 20, bo + 10);
    dentro.ellipse(bx, bo, RX - 8, RY - 6, 0, 0, Math.PI * 2);
    k.save();
    k.clip(dentro);
    const emb = new Path2D();
    emb.moveTo(bx - 168, bb + 4);
    emb.bezierCurveTo(bx - 180, bb - 30, bx - 174, bb - 66, bx - 160, bb - 84);
    emb.bezierCurveTo(bx - 120, bb - 80, bx - 80, bb - 70, bx - 58, bb - 54);
    emb.bezierCurveTo(bx - 10, bb - 66, bx + 70, bb - 58, bx + 120, bb - 34);
    emb.bezierCurveTo(bx + 158, bb - 18, bx + 162, bb + 10, bx + 130, bb + 18);
    emb.bezierCurveTo(bx + 40, bb + 26, bx - 80, bb + 28, bx - 168, bb + 4);
    emb.closePath();
    sombraNoChao(k, emb, -10, 8, 8, 0.5);
    peca(k, emb, [bx - 176, bb - 86, bx + 162, bb + 28], { cor: '#f4ead4', ang: 0.25, passo: 3.6, maxL: 1.7, sombra: (x, y) => 0.18 + (y - bb + 40) / 100 + (bx - x) / 700, tinta: '#3a2c16', cruzada: 0.62, obj, traco: 2.2 });
    k.save();
    k.clip(emb);
    // o capuz: a ponta do pano que cobre a cabeça vem dobrada por cima, uma aba em ponta
    // deitada para a direita, com a sombra embaixo; as rugas saem do bico do capuz
    const aba = new Path2D();
    aba.moveTo(bx - 150, bb - 76);
    aba.bezierCurveTo(bx - 164, bb - 86, bx - 172, bb - 64, bx - 158, bb - 62);
    aba.bezierCurveTo(bx - 128, bb - 56, bx - 96, bb - 44, bx - 52, bb - 30);
    aba.bezierCurveTo(bx - 70, bb - 12, bx - 96, bb + 4, bx - 120, bb + 22);
    aba.bezierCurveTo(bx - 140, bb - 6, bx - 146, bb - 40, bx - 150, bb - 76);
    aba.closePath();
    k.save();
    k.filter = 'blur(4px)';
    k.translate(6, 7);
    k.fillStyle = 'rgba(40,28,10,.45)';
    k.fill(aba);
    k.restore();
    peca(k, aba, [bx - 160, bb - 84, bx - 52, bb + 22], { cor: '#efe2c6', ang: 0.6, passo: 3.2, maxL: 1.5, sombra: (x, y) => 0.12 + (y - bb + 84) / 160 + (x - bx + 160) / 500, tinta: '#3a2c16', cruzada: 0.7, traco: 2, obj });
    k.strokeStyle = '#3a2c16';
    k.lineWidth = 1.2;
    // as rugas: uma corre ao longo do embrulho, para trás; as outras são curtas e soltas
    k.beginPath();
    k.moveTo(bx - 148, bb - 58);
    k.bezierCurveTo(bx - 120, bb - 44, bx - 90, bb - 36, bx - 60, bb - 30);
    k.stroke();
    for (const [x0, y0, x1, y1] of [[bx - 136, bb - 34, bx - 108, bb - 22], [bx - 132, bb - 8, bx - 112, bb + 4]]) {
      k.beginPath();
      k.moveTo(x0, y0);
      k.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 6, x1, y1);
      k.stroke();
    }
    // a beirada da aba, com a barra tecida
    k.strokeStyle = 'rgba(130,52,28,.8)';
    k.lineWidth = 3;
    k.beginPath();
    k.moveTo(bx - 56, bb - 30);
    k.bezierCurveTo(bx - 72, bb - 14, bx - 96, bb + 2, bx - 118, bb + 18);
    k.stroke();
    // as faixas cruzadas, com a beirada tecida
    for (const [x0, x1] of [[-30, 20], [20, 70], [70, 116]]) {
      const faixa = pol([[bx + x0, bb - 66], [bx + x0 + 22, bb - 66], [bx + x1 + 14, bb + 30], [bx + x1 - 8, bb + 30]]);
      k.fillStyle = 'rgba(214,190,150,.55)';
      k.fill(faixa);
      k.strokeStyle = '#3a2c16';
      k.lineWidth = 1.6;
      k.stroke(faixa);
      gravar(k, faixa, bx + (x0 + x1) / 2 + 10, bb - 18, 60, 1.1, 3.4, 1, (x, y) => 0.25 + (y - bb + 40) / 120, '#3a2c16', 0);
    }
    k.restore();
    // a manta por cima do embrulho, da cintura para baixo, com a beirada tecida
    const manta = new Path2D();
    manta.moveTo(bx - 34, bb - 64);
    manta.bezierCurveTo(bx + 10, bb - 74, bx + 80, bb - 62, bx + 126, bb - 40);
    manta.bezierCurveTo(bx + 170, bb - 20, bx + 176, bb + 14, bx + 150, bb + 26);
    manta.lineTo(bx - 50, bb + 30);
    manta.bezierCurveTo(bx - 58, bb + 4, bx - 52, bb - 40, bx - 34, bb - 64);
    manta.closePath();
    peca(k, manta, [bx - 58, bb - 74, bx + 176, bb + 30], { cor: '#e9d7b4', ang: 0.9, passo: 3.6, maxL: 1.6, sombra: (x, y) => 0.12 + (y - bb + 60) / 110 + (bx - x) / 700, tinta: '#3a2c16', cruzada: 0.7, obj, traco: 2 });
    k.save();
    k.clip(manta);
    const borda = bezier([bx - 34, bb - 60], [bx - 50, bb - 30], [bx - 54, bb], [bx - 48, bb + 30], 20);
    for (const [cor, lw, dx] of [['rgba(130,52,28,.85)', 5, 8], ['rgba(130,52,28,.6)', 2, 20]]) {
      k.strokeStyle = cor;
      k.lineWidth = lw;
      k.beginPath();
      borda.forEach(([x, y], i) => (i ? k.lineTo(x + dx, y) : k.moveTo(x + dx, y)));
      k.stroke();
    }
    k.fillStyle = 'rgba(130,52,28,.75)';
    borda.forEach(([x, y], i) => { if (i % 2) return; k.beginPath(); k.moveTo(x + 12, y - 4); k.lineTo(x + 16, y); k.lineTo(x + 12, y + 4); k.lineTo(x + 8, y); k.fill(); });
    k.strokeStyle = '#3a2c16';
    k.lineWidth = 1.3;
    for (const [a2, b2] of [[10, -40], [60, -20], [40, 6]]) { k.beginPath(); k.moveTo(bx + a2, bb + b2); k.quadraticCurveTo(bx + a2 + 40, bb + b2 - 14, bx + a2 + 80, bb + b2 + 2); k.stroke(); }
    k.restore();
    k.restore();
    // a metade da frente do aro, por cima do embrulho
    aro(0, Math.PI);
    // o chocalho de barro, em forma de romã, com a coroa, as faixas pintadas e os furinhos
    {
      const cx = 120;
      const cy = 724;
      k.save();
      k.translate(cx, cy);
      k.rotate(-0.5);
      sombraNoChao(k, seixo(r, 8, 22, 34, 12, 0, 0.02), 0, 0, 6, 0.45);
      const corpoR = seixo(r, 0, 0, 32, 29, 0, 0.03);
      peca(k, corpoR, [-32, -29, 32, 29], { cor: '#c98a5a', sombra: (x, y) => sombraOval(0, 0, 32, 29, 0)(x, y) * 0.9, passo: 3, maxL: 1.7, tinta: '#3a1a08', cruzada: 0.8, obj, traco: 2 });
      // o cálice, pequeno, e em volta dele o anel de furinhos por onde sai o som
      const coroa = pol([[-7, -27], [-8, -35], [-4, -31], [0, -37], [4, -31], [8, -35], [7, -27]]);
      peca(k, coroa, [-8, -37, 8, -27], { cor: '#b9784a', sombra: () => 0.5, passo: 2.6, maxL: 1.1, tinta: '#3a1a08', obj, traco: 1.6 });
      k.fillStyle = '#2a1206';
      for (let i = 0; i < 7; i++) { const a2 = Math.PI + 0.35 + (i / 6) * (Math.PI - 0.7); k.beginPath(); k.arc(Math.cos(a2) * 15, -22 + Math.sin(a2) * -4 + 4, 1.4, 0, 6.283); k.fill(); }
      // a faixa pintada, baixa e quase reta (na barriga), com o zigue-zague do oleiro
      k.strokeStyle = 'rgba(110,30,14,.85)';
      k.lineWidth = 2;
      for (const yb of [6, 16]) { k.beginPath(); k.ellipse(0, yb, 31 - (yb - 6) * 0.3, 3, 0, 0.12, Math.PI - 0.12); k.stroke(); }
      k.lineWidth = 1.6;
      k.beginPath();
      for (let i = 0; i <= 12; i++) { const x = -26 + i * (52 / 12); const y = 11 + (i % 2 ? -3 : 3) + Math.abs(x) * 0.04; if (i) k.lineTo(x, y); else k.moveTo(x, y); }
      k.stroke();
      k.restore();
    }
    // a beirada do pano da tenda, no alto: tecida em faixas, com as borlas
    const beira = (x) => 96 + Math.sin(x * 0.011) * 6 + (x / W) * 8;
    const toldo = new Path2D();
    toldo.moveTo(-10, -10);
    toldo.lineTo(W + 10, -10);
    toldo.lineTo(W + 10, beira(W));
    for (let x = W + 10; x >= -10; x -= 10) toldo.lineTo(x, beira(x) + Math.sin(x * 0.07) * 4);
    toldo.closePath();
    sombraNoChao(k, toldo, -6, 12, 10, 0.4);
    peca(k, toldo, [0, 0, W, 110], { cor: '#4e3822', ang: 0.04, passo: 4, maxL: 1.9, sombra: (x, y) => 0.45 + y / 500, tinta: '#140d06', traco: 2.6, cruzada: 0.8 });
    k.save();
    k.clip(toldo);
    for (const y of [26, 60]) {
      k.fillStyle = 'rgba(214,184,132,.42)';
      k.fillRect(0, y, W, 10);
      k.fillStyle = 'rgba(20,13,6,.6)';
      for (let x = 0; x < W; x += 18) { k.beginPath(); k.moveTo(x, y + 5); k.lineTo(x + 9, y); k.lineTo(x + 18, y + 5); k.lineTo(x + 9, y + 10); k.fill(); }
    }
    k.restore();
    for (let x = 30; x < W; x += 74) {
      const y = beira(x) + Math.sin(x * 0.07) * 4;
      k.strokeStyle = '#140d06';
      k.lineWidth = 2;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x, y + 12);
      k.stroke();
      const borla = pol([[x - 2, y + 12], [x + 2, y + 12], [x + 7, y + 32], [x - 7, y + 32]]);
      peca(k, borla, [x - 7, y + 12, x + 7, y + 32], { cor: '#a2502c', sombra: () => 0.4, passo: 2.4, maxL: 1, tinta: '#2a1206', traco: 1.4 });
    }
    capim(k, r, 840, 560, 30, 8);
    capim(k, r, 800, 770, 26, 7);
    vinheta(k, W, H, 0.22);
  }
  // Um feixe de trigo ou cevada, de pé em (x, base): os talos se juntam na amarra e se abrem
  // embaixo e em cima, nas espigas; "giro" inclina o feixe em volta da base (a reverência) e
  // "dobra" curva a cabeça das espigas um pouco mais para o mesmo lado. "varia" (0 a 1) muda de
  // um feixe para outro o número de talos, a altura da amarra e a abertura das espigas (até
  // 15%), para nenhum ser cópia do outro.
  function feixe(k, r, x, base, alto, giro, { cor = '#e2b866', tinta = '#3a2a0e', barba = false, obj, dobra = 0, varia = 0 } = {}) {
    const vv = (a) => 1 + (r() - 0.5) * 2 * a * varia;
    const L = alto * 0.3 * vv(0.15);
    const am = 0.54 * vv(0.12);
    const abre = vv(0.15);
    const nT = Math.max(9, Math.round(14 * vv(0.25)));
    const yA = -alto * am;
    // a cabeça curva em volta da amarra, mais na ponta
    const B = ([px, py]) => {
      if (py >= yA || !dobra) return [px, py];
      const u = Math.min(1, (yA - py) / (alto - alto * am));
      const a = dobra * (0.4 + u * 0.6);
      const dx = px;
      const dy = py - yA;
      return [dx * Math.cos(a) - dy * Math.sin(a), yA + dx * Math.sin(a) + dy * Math.cos(a)];
    };
    k.save();
    k.translate(x, base);
    // o pé no chão: a sombra de contato logo embaixo, achatada, e a sombra curta que o sol
    // (à esquerda, baixo) joga para a direita
    k.save();
    k.filter = 'blur(3px)';
    k.fillStyle = 'rgba(40,26,8,.55)';
    k.beginPath();
    k.ellipse(0, 1, L * 0.85, L * 0.16, 0, 0, 6.283);
    k.fill();
    k.filter = 'blur(6px)';
    k.fillStyle = 'rgba(40,26,8,.25)';
    k.beginPath();
    k.ellipse(L * 1.1, 2, L * 1.2, L * 0.16, 0, 0, 6.283);
    k.fill();
    k.restore();
    k.rotate(giro);
    const contorno = [[-L * 0.62, 0], [-L * 0.36, -alto * 0.3], [-L * 0.2, yA], [-L * 0.5 * abre, -alto * 0.74], [-L * 0.62 * abre, -alto * 0.92], [-L * 0.3 * abre, -alto * 1.02],
      [0, -alto * 1.05], [L * 0.3 * abre, -alto * 1.02], [L * 0.62 * abre, -alto * 0.92], [L * 0.5 * abre, -alto * 0.74], [L * 0.2, yA], [L * 0.36, -alto * 0.3], [L * 0.62, 0]].map(B);
    const p = new Path2D();
    p.moveTo(contorno[0][0], contorno[0][1]);
    for (let i = 1; i < contorno.length - 1; i++) p.quadraticCurveTo(contorno[i][0], contorno[i][1], (contorno[i][0] + contorno[i + 1][0]) / 2, (contorno[i][1] + contorno[i + 1][1]) / 2);
    p.lineTo(contorno[contorno.length - 1][0], contorno[contorno.length - 1][1]);
    p.closePath();
    peca(k, p, [-L, -alto * 1.05, L, 0], { cor, tinta, ang: -Math.PI / 2 + dobra * 0.5, passo: 3.6, maxL: 1.4, sombra: (px) => 0.2 + ((px + L) / (2 * L)) * 0.7, cruzada: 0.8, traco: 1.8, obj });
    // os talos e as espigas
    k.strokeStyle = tinta;
    k.lineCap = 'round';
    for (let i = 0; i < nT; i++) {
      const t = i / (nT - 1) - 0.5 + (r() - 0.5) * 0.04;
      k.lineWidth = 1.1;
      k.beginPath();
      k.moveTo(t * L * 1.2, -2);
      k.quadraticCurveTo(t * L * 0.15, yA * 0.9, t * L * 0.3, yA);
      k.stroke();
      const e = B([t * L * 1.5 * abre + (r() - 0.5) * 8, -alto * (0.86 + Math.cos(t * 3) * 0.12) * (0.97 + r() * 0.06)]);
      const c = B([t * L * 0.6, -alto * 0.72]);
      k.beginPath();
      k.moveTo(t * L * 0.3, yA);
      k.quadraticCurveTo(c[0], c[1], e[0], e[1]);
      k.stroke();
      k.save();
      k.translate(e[0], e[1]);
      k.rotate(t * 1.2 * abre + dobra * 0.9);
      k.fillStyle = '#c99640';
      k.beginPath();
      k.ellipse(0, -alto * 0.06, alto * 0.022, alto * 0.07, 0, 0, 6.283);
      k.fill();
      k.lineWidth = 1;
      k.stroke();
      for (let g = -2; g <= 2; g++) { k.beginPath(); k.moveTo(-alto * 0.02, -alto * (0.06 + g * 0.025)); k.lineTo(alto * 0.02, -alto * (0.07 + g * 0.025)); k.stroke(); }
      if (barba) for (const s of [-1, 0, 1]) { k.beginPath(); k.moveTo(s * alto * 0.01, -alto * 0.12); k.lineTo(s * alto * 0.035, -alto * 0.24); k.stroke(); }
      k.restore();
    }
    // o pé do feixe: as pontas cortadas dos talos, assentadas no chão
    k.strokeStyle = tinta;
    k.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      const t = i / 6 - 0.5;
      k.beginPath();
      k.ellipse(t * L * 1.1, -1, 2.2, 1.2, 0, 0, 6.283);
      k.stroke();
    }
    // a amarra de palha torcida
    const am2 = pol([[-L * 0.3, yA + alto * 0.04], [L * 0.3, yA + alto * 0.04], [L * 0.28, yA - alto * 0.045], [-L * 0.28, yA - alto * 0.045]]);
    peca(k, am2, [-L * 0.3, yA - alto * 0.05, L * 0.3, yA + alto * 0.04], { cor: '#b98a3a', tinta, ang: 1, passo: 3, maxL: 1.2, sombra: () => 0.5, traco: 1.6 });
    k.restore();
  }

  // (5) Os sonhos de José (Gn 37.5-9): no campo de trigo ceifado, ao entardecer, os onze feixes
  // dos irmãos em roda, todos inclinados diante do feixe de José, que se levantou e ficou em pé
  // no meio (a roda se abre na frente, para ele se ver do pé à ponta); no céu, o outro sonho:
  // o sol, a lua e onze estrelas. Céu e chão só em linha gravada.
  function desenhoJose(k, W, H, obj) {
    const r = sorteio(5501);
    const hz = 430;
    papelVelho(k, W, H, r, ['#f4dca6', '#e6c587', '#c9a466'], [150, 380]);
    // o céu: as linhas engrossam para o alto (a noite que vem) e afinam perto do sol
    linhas(k, 0, 0, W, hz, 5.5, 2.1, (x, y) => 0.08 + (1 - y / hz) ** 1.6 * 0.95 - Math.max(0, 0.5 - Math.hypot(x - 150, y - 360) / 400), '#3a2a1c');
    // o sol, baixo, à esquerda, com os raios gravados; a lua à direita
    const sol = [150, 360];
    k.strokeStyle = '#7a4a14';
    k.lineCap = 'round';
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * 6.283;
      k.lineWidth = i % 2 ? 1.4 : 2.2;
      k.beginPath();
      k.moveTo(sol[0] + Math.cos(a) * 62, sol[1] + Math.sin(a) * 62);
      k.lineTo(sol[0] + Math.cos(a) * (i % 2 ? 92 : 124), sol[1] + Math.sin(a) * (i % 2 ? 92 : 124));
      k.stroke();
    }
    const disco = new Path2D();
    disco.arc(sol[0], sol[1], 54, 0, 6.283);
    peca(k, disco, [sol[0] - 54, sol[1] - 54, sol[0] + 54, sol[1] + 54], { cor: '#ffe3a0', tinta: '#8a5414', sombra: (x, y) => 0.15 + Math.hypot(x - sol[0], y - sol[1]) / 120, ang: 0, passo: 4.6, maxL: 1.3, cruzada: 1, traco: 2.4, obj });
    const lua = new Path2D();
    const fi = Math.atan2(-12, 22);
    const dl = Math.hypot(22, 12);
    const al = Math.acos((50 * 50 - 44 * 44 + dl * dl) / (2 * dl) / 50);
    const p1 = [730 + Math.cos(fi + al) * 50, 150 + Math.sin(fi + al) * 50];
    const p2 = [730 + Math.cos(fi - al) * 50, 150 + Math.sin(fi - al) * 50];
    lua.arc(730, 150, 50, fi + al, fi - al + 6.283);
    lua.arc(752, 138, 44, Math.atan2(p2[1] - 138, p2[0] - 752), Math.atan2(p1[1] - 138, p1[0] - 752), true);
    lua.closePath();
    peca(k, lua, [680, 100, 780, 200], { cor: '#f8efd4', tinta: '#3a2a1c', sombra: (x) => 0.1 + (x - 680) / 200, ang: 0.4, passo: 4, maxL: 1.2, cruzada: 1, traco: 2.2, obj });
    // as onze estrelas, em arco entre o sol e a lua: papel recortado no céu de linhas
    for (let i = 0; i < 11; i++) {
      const t = i / 10;
      const x = 250 + t * 400;
      const y = 226 - Math.sin(t * Math.PI) * 130 + (i % 2) * 14;
      const e = new Path2D();
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * Math.PI * 2 - Math.PI / 2;
        const d = j % 2 ? 4.4 : 17;
        e.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
      e.closePath();
      k.fillStyle = '#fbefcf';
      k.fill(e);
      k.strokeStyle = '#3a2a1c';
      k.lineWidth = 1.4;
      k.stroke(e);
      marcar(k, obj, e);
    }
    // o campo ceifado: a palha cortada em linha e os tocos
    const campo = new Path2D();
    campo.rect(-10, hz, W + 20, H);
    k.fillStyle = '#d6b36c';
    k.fill(campo);
    linhas(k, 0, hz, W, H, 5, 1.25, (x, y) => 0.15 + (y - hz) / 700);
    k.strokeStyle = 'rgba(58,42,14,.6)';
    k.lineWidth = 1.2;
    for (let i = 0; i < 260; i++) {
      const x = r() * W;
      const y = hz + 10 + r() * (H - hz);
      const h = 4 + (y - hz) / 40;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + (r() - 0.5) * 3, y - h);
      k.stroke();
    }
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(0, hz);
    k.lineTo(W, hz);
    k.stroke();
    // os onze feixes dos irmãos em roda, abertos na frente: cinco atrás e três de cada lado, em
    // lugares escolhidos para nenhum cobrir o outro. Cada um tem o pé plantado no chão, quase em
    // pé, e se inclina para o feixe de José: um pouco o feixe inteiro e mais a cabeça, dobrada
    // na amarra.
    const cx = W / 2;
    const roda = [
      [338, 466, 0.58], [240, 486, 0.63], [150, 524, 0.7], [62, 668, 0.84], [170, 772, 0.94], [292, 806, 1],
      [552, 466, 0.58], [650, 486, 0.63], [742, 524, 0.7], [826, 668, 0.84], [700, 776, 0.96],
    ];
    const um = ([x, y, e]) => {
      const lado = x < cx ? 1 : -1;
      const perto = Math.min(1, Math.abs(x - cx) / 260);
      feixe(k, r, x, y, 176 * e, lado * (0.12 + r() * 0.1) * (0.6 + perto * 0.4), { obj, dobra: lado * (0.42 + r() * 0.16), varia: 1, cor: r() < 0.5 ? '#e2b866' : '#ddb05c' });
    };
    for (const p of roda.filter((q) => q[1] < 600).sort((a2, b2) => a2[1] - b2[1])) um(p);
    feixe(k, r, cx, 640, 318, 0, { cor: '#f0c874', obj });
    for (const p of roda.filter((q) => q[1] >= 600).sort((a2, b2) => a2[1] - b2[1])) um(p);
    vinheta(k, W, H, 0.25);
  }

  // Um junco de papiro: a haste de três quinas, um pouco curva, e a umbela no alto, de raios
  // finos que se abrem e caem nas pontas (alguns mais caídos), com as florzinhas.
  function papiro(k, r, x, base, alto, giro, tinta = SEPIA, cor = '#8f8a58') {
    const tx = x + Math.sin(giro) * alto;
    const ty = base - Math.cos(giro) * alto;
    k.strokeStyle = tinta;
    k.lineCap = 'round';
    k.lineWidth = 5.5;
    k.beginPath();
    k.moveTo(x, base);
    k.quadraticCurveTo(x + (tx - x) * 0.3 + giro * 40, (base + ty) / 2, tx, ty);
    k.stroke();
    k.strokeStyle = cor;
    k.lineWidth = 2.6;
    k.stroke();
    // as brácteas na base da umbela
    k.fillStyle = tinta;
    k.beginPath();
    k.moveTo(tx - 5, ty + 2);
    k.lineTo(tx, ty - 9);
    k.lineTo(tx + 5, ty + 2);
    k.fill();
    k.strokeStyle = tinta;
    const n = 34;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5;
      const a = giro - Math.PI / 2 + u * 2.9;
      const c = alto * (0.13 + r() * 0.07);
      const cai = c * (0.25 + Math.abs(u) * 0.7 + (r() < 0.15 ? 0.6 : 0));
      const fx = tx + Math.cos(a) * c;
      const fy = ty + Math.sin(a) * c + cai;
      k.lineWidth = 0.9;
      k.beginPath();
      k.moveTo(tx, ty - 4);
      k.quadraticCurveTo(tx + Math.cos(a) * c * 0.7, ty + Math.sin(a) * c * 0.7 - 6, fx, fy);
      k.stroke();
      k.lineWidth = 1.4;
      k.beginPath();
      k.moveTo(fx, fy);
      k.lineTo(fx + Math.cos(a) * 4, fy + 3);
      k.stroke();
    }
  }
  // Água em linhas: ondinhas horizontais quebradas, mais densas embaixo.
  function agua(k, r, x0, y0, x1, y1, tinta = SEPIA) {
    k.strokeStyle = tinta;
    k.lineCap = 'round';
    for (let y = y0 + 4; y < y1; y += 5 + (y - y0) * 0.012) {
      let x = x0 - r() * 40;
      while (x < x1) {
        const c = 20 + r() * 60;
        k.lineWidth = 0.8 + ((y - y0) / (y1 - y0)) * 1.4;
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x + c / 2, y + (r() - 0.5) * 4, x + c, y);
        k.stroke();
        x += c + 6 + r() * 30;
      }
    }
  }

  // (6) Moisés no cesto (Êx 2.3-5): o cesto feito de junco, oval, de lados retos e um pouco
  // abertos, mais alto que a tampa; a tampa baixa e chata, um pouco fora do lugar (vê-se a
  // beirada de dentro); o junco trançado em espiral, e o betume escuro e brilhante só da
  // metade para baixo, até a linha da água. Ele fica entre os juncos, junto da margem de lama
  // com as raízes; na frente, umas hastes de papiro; do outro lado do Nilo, as palmeiras.
  function desenhoMoises(k, W, H, obj) {
    const r = sorteio(5601);
    papelVelho(k, W, H, r, ['#f6efd8', '#e6dcb8', '#c9bb8e'], [W * 0.7, 140]);
    linhas(k, 0, 0, W, 330, 6.5, 1.1, (x, y) => 0.1 + (1 - y / 330) * 0.45);
    // a outra margem: uma faixa de terra com a sua hachura, e as palmeiras plantadas nela
    const fm = onda(r, 3, 0.01);
    const topoM = (x) => 302 + fm(x) * 8;
    const outra = pol([[-10, 352], ...Array.from({ length: 46 }, (_, i) => [i * 20, topoM(i * 20)]), [W + 10, 352]]);
    peca(k, outra, [0, 290, W, 352], { cor: '#d3c596', ang: -0.08, passo: 4.2, maxL: 1.5, sombra: (x, y) => 0.4 + (y - 300) / 120, cruzada: 0.7, traco: 1.6 });
    for (const [x, h, g] of [[520, 92, 0.05], [566, 74, -0.08], [690, 100, 0.1], [742, 70, -0.05], [820, 88, 0.06]]) {
      const b = topoM(x) + 8;
      const tx = x + g * h;
      k.strokeStyle = SEPIA;
      k.lineCap = 'round';
      k.lineWidth = 4;
      k.beginPath();
      k.moveTo(x, b);
      k.quadraticCurveTo(x + g * h * 0.2 + 4, b - h / 2, tx, b - h);
      k.stroke();
      k.lineWidth = 1;
      for (let y = b - 6; y > b - h; y -= 6) { k.beginPath(); k.moveTo(x - 3 + (b - y) / h * g * h, y); k.lineTo(x + 3 + (b - y) / h * g * h, y - 2); k.stroke(); }
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i / 8 - 0.5) * 3.3;
        const c = 28 + r() * 8;
        const folha = new Path2D();
        folha.moveTo(tx, b - h);
        folha.quadraticCurveTo(tx + Math.cos(a) * c * 0.5, b - h + Math.sin(a) * c * 0.5 - 10, tx + Math.cos(a) * c, b - h + Math.sin(a) * c + 12);
        k.lineWidth = 2.4;
        k.stroke(folha);
      }
    }
    // o rio, em linhas de água
    const rio = new Path2D();
    rio.rect(-10, 350, W + 20, H);
    k.fillStyle = '#e0d9b8';
    k.fill(rio);
    agua(k, r, 0, 352, W, H, 'rgba(43,33,18,.62)');
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.beginPath();
    for (let x = 0; x <= W; x += 10) (x ? k.lineTo(x, topoM(x) + 50) : k.moveTo(x, topoM(x) + 50));
    k.stroke();
    // a margem de cá, à esquerda: a lama em camadas, com as raízes dos juncos
    const margem = new Path2D();
    margem.moveTo(-10, 520);
    margem.bezierCurveTo(120, 540, 200, 640, 250, 700);
    margem.bezierCurveTo(300, 760, 420, 800, 520, 860);
    margem.lineTo(-10, 860);
    margem.closePath();
    k.fillStyle = '#b9a174';
    k.fill(margem);
    hachuraEmFaixas(k, r, margem, -10, 530, [(x) => 520 + x * 0.2, (x) => 600 + x * 0.3, (x) => 690 + x * 0.3, (x) => 790 + x * 0.2, (x) => 880], 5, 1.9, (x) => 0.45 + (300 - x) / 900, SEPIA, { quebra: 0.05 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.stroke(margem);
    // os juncos de trás, do lado da margem
    for (let i = 0; i < 16; i++) papiro(k, r, 10 + i * 24 + (r() - 0.5) * 16, 600 + i * 6 + r() * 20, 230 + r() * 140, -0.05 + (r() - 0.5) * 0.35, 'rgba(43,33,18,.6)', '#aaa676');
    // o cesto
    const cx = 336;
    const yA = 482;
    const yF = 624;
    const RA = 142;
    const rA = 46;
    const RF = 124;
    const rF = 40;
    const agua0 = 600;
    // a sombra e o reflexo na água, em linhas mais grossas logo embaixo
    k.save();
    k.beginPath();
    k.ellipse(cx + 10, yF + 6, RF + 40, 26, 0, 0, 6.283);
    k.clip();
    agua(k, r, cx - RF - 50, yF - 20, cx + RF + 60, yF + 40, 'rgba(30,20,8,.9)');
    k.restore();
    const corpo = new Path2D();
    corpo.ellipse(cx, yA, RA, rA, 0, Math.PI, 0, true);
    corpo.lineTo(cx + RF, yF);
    corpo.ellipse(cx, yF, RF, rF, 0, 0, Math.PI);
    corpo.closePath();
    k.fillStyle = '#c9aa6c';
    k.fill(corpo);
    marcar(k, obj, corpo);
    // a trança: voltas de junco costuradas, que acompanham a curva
    const volta = (t) => ({ y: yA + (yF - yA) * t, rx: RA + (RF - RA) * t, ry: rA + (rF - rA) * t });
    k.save();
    k.clip(corpo);
    const nV = 9;
    gravar(k, corpo, cx, (yA + yF) / 2, RA + 20, 0.05, 3.4, 1.4, (x) => (cx - x) / 260 + 0.12, '#3a2610', 0);
    for (let i = 0; i < nV; i++) {
      const a = volta(i / nV);
      const b = volta((i + 1) / nV);
      k.strokeStyle = '#2e1e0c';
      k.lineWidth = 2;
      k.beginPath();
      k.ellipse(cx, b.y, b.rx, b.ry, 0, 0.02, Math.PI - 0.02);
      k.stroke();
      k.strokeStyle = '#3a2610';
      k.lineWidth = 1.4;
      for (let g = 0.12 + (i % 2) * 0.1; g < Math.PI - 0.08; g += 0.2) {
        const x = cx + (Math.cos(g) * (a.rx + b.rx)) / 2;
        const y = (a.y + b.y) / 2 + (Math.sin(g) * (a.ry + b.ry)) / 2;
        const h = (b.y - a.y) * 0.85;
        k.beginPath();
        k.moveTo(x + 3, y - h / 2);
        k.lineTo(x - 3, y + h / 2);
        k.stroke();
      }
    }
    k.restore();
    // o betume: da metade para baixo, escuro e brilhante, com a beirada de cima desigual
    const betume = new Path2D();
    const yB = (x) => yA + (yF - yA) * 0.46 + Math.sin(x * 0.09) * 4 + Math.sin(x * 0.031) * 6;
    betume.moveTo(cx - RA - 10, yB(cx - RA));
    for (let x = cx - RA - 10; x <= cx + RA + 10; x += 6) betume.lineTo(x, yB(x) + rA * 0.8 * Math.sqrt(Math.max(0, 1 - ((x - cx) / (RA + 10)) ** 2)));
    betume.lineTo(cx + RA + 10, yF + 60);
    betume.lineTo(cx - RA - 10, yF + 60);
    betume.closePath();
    k.save();
    k.clip(corpo);
    k.fillStyle = 'rgba(28,18,8,.9)';
    k.fill(betume);
    k.clip(betume);
    for (let i = 1; i < nV; i++) {
      const b = volta(i / nV);
      k.strokeStyle = 'rgba(0,0,0,.8)';
      k.lineWidth = 2.2;
      k.beginPath();
      k.ellipse(cx, b.y, b.rx, b.ry, 0, 0.02, Math.PI - 0.02);
      k.stroke();
    }
    // o brilho do betume: riscos claros na luz (à direita, de onde vem o sol)
    gravar(k, betume, cx + 60, yF, RA, 0.04, 3.2, 1.3, (x, y) => Math.max(0, 0.55 - Math.abs(y - yF + 6) / 30) * Math.max(0, (x - cx + 60) / 260), 'rgba(255,236,200,.7)', 0.2);
    k.restore();
    k.strokeStyle = '#140c04';
    k.lineWidth = 2.6;
    k.stroke(corpo);
    // a boca e a beirada de dentro, que aparece porque a tampa ficou um pouco de lado
    const boca = new Path2D();
    boca.ellipse(cx, yA, RA, rA, 0, 0, 6.283);
    k.fillStyle = '#4a3218';
    k.fill(boca);
    k.save();
    k.clip(boca);
    for (let i = 0; i < 8; i++) {
      k.strokeStyle = 'rgba(20,12,4,.7)';
      k.lineWidth = 1.6;
      k.beginPath();
      k.ellipse(cx, yA - rA * 0.4 + i * 9, RA - 10, rA - 8, 0, Math.PI * 1.05, Math.PI * 1.95);
      k.stroke();
    }
    k.restore();
    cordao(k, Array.from({ length: 61 }, (_, i) => [cx + Math.cos((i / 60) * 6.283) * RA, yA + Math.sin((i / 60) * 6.283) * rA]), 8, { cor: '#d2b278', escuro: '#2e1e0c', luz: 'rgba(255,240,200,.55)' });
    marcar(k, obj, boca);
    // a tampa: baixa e chata, de junco em espiral, deslocada para a direita e um pouco inclinada
    k.save();
    k.translate(cx + 40, yA - 10);
    k.rotate(-0.07);
    const TR = RA + 6;
    const tr = rA + 4;
    const aba = new Path2D();
    aba.ellipse(0, 0, TR, tr, 0, 0, Math.PI);
    aba.lineTo(-TR, -12);
    aba.ellipse(0, -12, TR, tr, 0, Math.PI, 0, true);
    aba.closePath();
    peca(k, aba, [-TR, -tr - 12, TR, tr], { cor: '#b8955a', tinta: '#2e1e0c', ang: 0, passo: 3.2, maxL: 1.3, sombra: (x) => 0.3 + (-x) / 500, cruzada: 1, traco: 2.2, obj });
    const topo = new Path2D();
    topo.ellipse(0, -12, TR, tr, 0, 0, 6.283);
    k.fillStyle = '#d4b67c';
    k.fill(topo);
    marcar(k, obj, topo);
    k.save();
    k.clip(topo);
    // a espiral da tampa, do meio para fora, com os pontos
    k.strokeStyle = '#3a2610';
    for (let i = 1; i <= 7; i++) {
      const f = i / 7;
      k.lineWidth = 1.3;
      k.globalAlpha = 0.75;
      k.beginPath();
      k.ellipse(0, -12 - (1 - f) * 6, TR * f, tr * f, 0, 0, 6.283);
      k.stroke();
      k.lineWidth = 1.1;
      for (let g = (i % 2) * 0.2; g < 6.283; g += 0.5 / f + 0.14) {
        const x = Math.cos(g) * TR * (f - 0.055);
        const y = -12 - (1 - f) * 6 + Math.sin(g) * tr * (f - 0.055);
        k.beginPath();
        k.moveTo(x - 2, y - 2.5);
        k.lineTo(x + 2, y + 2.5);
        k.stroke();
      }
    }
    k.globalAlpha = 1;
    gravar(k, topo, 0, -12, TR, 0.1, 4.4, 1.2, (x, y) => (-x) / 400 + (y + 12) / 120 + 0.05, '#3a2610', 0);
    k.restore();
    k.strokeStyle = '#2e1e0c';
    k.lineWidth = 2.2;
    k.stroke(topo);
    k.restore();
    // o pé do cesto dentro da água: a água passa por cima da parte de baixo
    k.save();
    k.clip(corpo);
    const linhaAgua = new Path2D();
    linhaAgua.rect(cx - RA - 20, yF + 18, RA * 2 + 40, 80);
    k.fillStyle = 'rgba(214,206,176,.82)';
    k.fill(linhaAgua);
    k.clip(linhaAgua);
    agua(k, r, cx - RA - 20, yF + 16, cx + RA + 20, yF + 90, 'rgba(30,20,8,.75)');
    k.restore();
    // a água batendo no cesto, na linha do betume
    k.strokeStyle = 'rgba(250,244,224,.85)';
    k.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      k.lineWidth = 2.2 - i * 0.5;
      k.beginPath();
      k.ellipse(cx, yF + 14 + i * 10, RF + 10 + i * 28, rF * 0.4 + i * 4, 0, 0.1, Math.PI - 0.1);
      k.stroke();
    }
    // as hastes de papiro na frente do cesto, que o escondem um pouco
    for (const [x, b, h, g] of [[150, 860, 430, 0.08], [206, 860, 400, -0.03], [252, 860, 470, 0.1], [536, 860, 420, -0.08]]) papiro(k, r, x, b, h, g);
    // e, do lado de lá, uns juncos soltos na água
    for (let i = 0; i < 4; i++) papiro(k, r, 700 + i * 46 + (r() - 0.5) * 10, 860, 300 + r() * 120, 0.08 + (r() - 0.5) * 0.25, 'rgba(43,33,18,.75)', '#a6a070');
    vinheta(k, W, H, 0.22);
  }

  // (7) A corda vermelha de Raabe (Js 2.15-21): a casa de Raabe fazia parte do muro de Jericó
  // (2.15): no alto do muro de pedra, a frente de barro rebocado da casa, com o terraço e o
  // linho posto para secar (2.6). Na janela, uma trave de madeira atravessada na soleira, a
  // corda de fios vermelhos amarrada nela com o nó, a volta por cima da beirada e a queda pelo
  // muro (2.18, 2.21). As ameias são blocos inteiros; as fiadas de pedra, de tamanhos
  // desencontrados, escurecem embaixo, onde o muro assenta no talude.
  function desenhoRaabe(k, W, H, obj) {
    const r = sorteio(5701);
    papelVelho(k, W, H, r, ['#fbf1d8', '#ecdab2', '#d2b886'], [W * 0.2, 80]);
    linhas(k, 0, 0, W, 240, 7, 1, (x, y) => 0.08 + x / 2400 + y / 1200);
    const fm = onda(r, 4, 0.008);
    const mont = pol([[-10, 250], ...Array.from({ length: 46 }, (_, i) => [i * 20, 160 + fm(i * 20) * 26 + Math.abs(i - 30) * 1.2]), [W + 10, 250]]);
    peca(k, mont, [0, 100, W, 250], { cor: '#e2d0a6', ang: -0.5, passo: 5, maxL: 1.2, sombra: (x) => 0.4 + Math.sin(x * 0.02) * 0.2, cruzada: 0.55, traco: 1.6 });
    const topo = 236;
    const chao = 790;
    const talude = 676;
    // a casa: de x0 a x1, sobe acima do muro
    const x0 = 300;
    const x1 = 640;
    const tc = 120;
    // o muro de pedra, sem a parte da casa
    const muro = new Path2D();
    muro.rect(-10, topo, W + 20, talude - topo);
    k.fillStyle = '#ddc898';
    k.fill(muro);
    k.save();
    k.clip(muro);
    let y = topo;
    let fiada = 0;
    while (y < talude) {
      const h = Math.min(talude - y, 30 + fiada * 3 + r() * 14);
      let x = -10 - r() * 60;
      while (x < W + 10) {
        const w = 44 + r() * (r() < 0.3 ? 120 : 70) + fiada * 3;
        const pedra = pol([[x + 3 + r() * 2, y + 2 + r() * 2], [x + w - 3 - r() * 2, y + 2 + r() * 2], [x + w - 2, y + h - 2 - r() * 2], [x + 3, y + h - 2]]);
        const t = 0.12 + r() * 0.25 + Math.max(0, (y - 420) / 600);
        peca(k, pedra, [x, y, x + w, y + h], { cor: r() < 0.5 ? '#d9c391' : '#ceb581', ang: 0.6 + (r() - 0.5) * 0.4, passo: 4.4, maxL: 1.9, sombra: (px, py) => t + ((py - y) / h) * 0.35 + ((px - x) / w) * 0.2, cruzada: 0.62, traco: 1.6 });
        x += w;
      }
      y += h;
      fiada++;
    }
    k.restore();
    // o talude de pedra embaixo, inclinado, mais escuro
    const tal = pol([[-10, talude], [W + 10, talude], [W + 40, chao], [-40, chao]]);
    peca(k, tal, [-40, talude, W + 40, chao], { cor: '#c3a878', ang: 0.35, passo: 4, maxL: 2, sombra: (x, yy) => 0.55 + (yy - talude) / 300, cruzada: 0.6, traco: 2.2 });
    k.save();
    k.clip(tal);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    for (let yy = talude + 26; yy < chao; yy += 30) { k.beginPath(); k.moveTo(-40, yy); k.lineTo(W + 40, yy); k.stroke(); }
    for (let i = 0; i < 26; i++) { const x = r() * W; const yy = talude + Math.floor(r() * 4) * 30; k.beginPath(); k.moveTo(x, yy); k.lineTo(x + 6, yy + 30); k.stroke(); }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.stroke(muro);
    // as ameias: cada uma um bloco só, com a sombra e a hachura dele
    for (let x = -30; x < W + 10; x += 76) {
      if (x + 40 > x0 - 6 && x < x1 + 6) continue;
      const a = pol([[x, topo], [x, topo - 34], [x + 42, topo - 34], [x + 42, topo]]);
      peca(k, a, [x, topo - 34, x + 42, topo], { cor: '#d6bf8c', ang: 0.6, passo: 4.4, maxL: 1.8, sombra: (px) => 0.2 + (px - x) / 120, cruzada: 0.7, traco: 2.2 });
    }
    // a casa de Raabe no muro: a frente de barro rebocado, as vigas de madeira, o terraço
    const casa = pol([[x0, topo + 170], [x0, tc], [x1, tc], [x1, topo + 170]]);
    sombraNoChao(k, casa, 10, 6, 10, 0.3);
    peca(k, casa, [x0, tc, x1, topo + 170], { cor: '#e6d3a6', ang: 1.2, passo: 5, maxL: 1.4, sombra: (x, yy) => 0.12 + (x - x0) / 1400 + (yy - tc) / 900, cruzada: 1, traco: 2.4 });
    // o reboco gasto deixa ver os tijolos aqui e ali
    k.save();
    k.clip(casa);
    k.strokeStyle = 'rgba(43,33,18,.55)';
    k.lineWidth = 1.2;
    for (const [bx, by] of [[330, 180], [560, 300], [600, 170], [350, 330]]) {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) k.strokeRect(bx + j * 30 + (i % 2) * 15, by + i * 14, 30, 14);
    }
    k.restore();
    // a casa assenta nas pedras: a última fiada passa por baixo dela
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.beginPath();
    k.moveTo(x0, topo + 170);
    k.lineTo(x1, topo + 170);
    k.stroke();
    // as pontas das vigas do teto e o parapeito do terraço
    const parapeito = pol([[x0 - 10, tc], [x0 - 10, tc - 26], [x1 + 10, tc - 26], [x1 + 10, tc]]);
    peca(k, parapeito, [x0 - 10, tc - 26, x1 + 10, tc], { cor: '#dcc694', ang: 0, passo: 4, maxL: 1.4, sombra: () => 0.35, traco: 2.2 });
    for (let x = x0 + 14; x < x1; x += 40) {
      const v = new Path2D();
      v.ellipse(x, tc + 14, 7, 6, 0, 0, 6.283);
      k.fillStyle = '#8a6440';
      k.fill(v);
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.6;
      k.stroke(v);
      k.beginPath();
      k.arc(x, tc + 14, 3, 0, 6.283);
      k.stroke();
    }
    // o linho posto para secar no terraço (Js 2.6): feixes de hastes finas e compridas,
    // deitados sobre o parapeito, um pouco abertos, com as cápsulas numa ponta, a amarra no
    // meio e umas hastes soltas
    k.save();
    k.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const fx = x0 + 6 + i * 84 + (r() - 0.5) * 8;
      const fy = tc - 28 - (i % 2) * 5;
      const g = (r() - 0.5) * 0.1;
      const n = 22;
      for (let j = 0; j < n; j++) {
        const u = j / (n - 1) - 0.5;
        const comp = 112 + r() * 22;
        const meio = 50;
        const ax = fx;
        const ay = fy + u * 8;
        const bx = fx + comp * Math.cos(g);
        const by = fy + comp * Math.sin(g) + u * 20 + (r() - 0.5) * 4;
        k.strokeStyle = j % 3 ? '#4a3a1c' : '#7a6436';
        k.lineWidth = 1.1;
        k.beginPath();
        k.moveTo(ax, ay);
        k.quadraticCurveTo(fx + meio, fy + u * 3, bx, by);
        k.stroke();
        k.fillStyle = '#6a5428';
        k.beginPath();
        k.arc(bx + 1.5, by, 1.8, 0, 6.283);
        k.fill();
      }
      k.strokeStyle = '#8a5a2a';
      k.lineWidth = 3.4;
      k.beginPath();
      k.moveTo(fx + 50, fy - 6);
      k.lineTo(fx + 52, fy + 6);
      k.stroke();
      // umas hastes soltas, caindo pela beirada
      k.strokeStyle = '#4a3a1c';
      k.lineWidth = 1;
      for (let j = 0; j < 2; j++) {
        const sx = fx + 20 + r() * 70;
        k.beginPath();
        k.moveTo(sx, fy + 4);
        k.quadraticCurveTo(sx + 10, fy + 14, sx + 6 + r() * 12, fy + 26);
        k.stroke();
      }
    }
    k.restore();
    // a janela: o lintel de madeira, o batente, o escuro de dentro e a sombra que cai embaixo
    const jx = 420;
    const jy = 214;
    const jw = 104;
    const jh = 118;
    k.save();
    k.filter = 'blur(6px)';
    k.fillStyle = 'rgba(40,26,10,.35)';
    k.beginPath();
    k.moveTo(jx - 4, jy + jh + 8);
    k.lineTo(jx + jw + 30, jy + jh + 8);
    k.lineTo(jx + jw + 46, jy + jh + 44);
    k.lineTo(jx + 10, jy + jh + 44);
    k.fill();
    k.restore();
    const batente = pol([[jx - 14, jy - 6], [jx + jw + 14, jy - 6], [jx + jw + 14, jy + jh + 10], [jx - 14, jy + jh + 10]]);
    peca(k, batente, [jx - 14, jy - 6, jx + jw + 14, jy + jh + 10], { cor: '#b89060', ang: 0, passo: 3.6, maxL: 1.4, sombra: () => 0.42, traco: 2.4, obj });
    const vao = pol([[jx, jy], [jx + jw, jy], [jx + jw, jy + jh], [jx, jy + jh]]);
    k.fillStyle = '#1a120a';
    k.fill(vao);
    gravar(k, vao, jx + jw / 2, jy + jh / 2, 90, 0.8, 4, 1.4, () => 0.6, '#000', 0);
    const lintel = pol([[jx - 30, jy - 30], [jx + jw + 30, jy - 30], [jx + jw + 30, jy - 6], [jx - 30, jy - 6]]);
    peca(k, lintel, [jx - 30, jy - 30, jx + jw + 30, jy - 6], { cor: '#8a6440', ang: 0.02, passo: 3, maxL: 1.6, sombra: (x, yy) => 0.25 + (yy - jy + 30) / 50, traco: 2.2, obj });
    const soleira = pol([[jx - 22, jy + jh], [jx + jw + 22, jy + jh], [jx + jw + 26, jy + jh + 14], [jx - 26, jy + jh + 14]]);
    peca(k, soleira, [jx - 26, jy + jh, jx + jw + 26, jy + jh + 14], { cor: '#c8a878', ang: 0, passo: 3, maxL: 1.2, sombra: () => 0.35, traco: 2, obj });
    // a trave de madeira clara atravessada na janela, por cima da soleira
    const tb = jy + jh - 16;
    const trave = pol([[jx - 8, tb - 7], [jx + jw + 8, tb - 7], [jx + jw + 8, tb + 7], [jx - 8, tb + 7]]);
    peca(k, trave, [jx - 8, tb - 7, jx + jw + 8, tb + 7], { cor: '#d9b27a', ang: 0, passo: 2.8, maxL: 1.1, sombra: (x, yy) => 0.15 + (yy - tb + 7) / 20, traco: 1.8, obj });
    // a corda: as voltas e o nó na trave, a volta por cima da beirada da soleira e a queda
    const nx = jx + 52;
    const vermelho = { cor: '#c4392a', escuro: '#3a0e08', luz: 'rgba(255,196,170,.6)' };
    for (const dx of [-14, -3, 8]) {
      const volta = pol([[nx + dx, tb - 8], [nx + dx + 9, tb - 8], [nx + dx + 13, tb + 8], [nx + dx + 4, tb + 8]]);
      k.fillStyle = '#c4392a';
      k.fill(volta);
      gravar(k, volta, nx + dx + 6, tb, 12, 1.2, 2.6, 1, (x, yy) => 0.3 + (yy - tb + 8) / 24, '#3a0e08', 0);
      k.strokeStyle = '#3a0e08';
      k.lineWidth = 1.6;
      k.stroke(volta);
      marcar(k, obj, volta);
    }
    const no = new Path2D();
    no.ellipse(nx + 22, tb + 4, 10, 9, 0.4, 0, 6.283);
    k.fillStyle = '#c4392a';
    k.fill(no);
    gravar(k, no, nx + 22, tb + 4, 14, 0.8, 3, 1.3, (x, yy) => 0.3 + (x - nx - 14) / 30, '#3a0e08', 0);
    k.strokeStyle = '#3a0e08';
    k.lineWidth = 2;
    k.stroke(no);
    cordao(k, [[nx + 26, tb + 8], [nx + 34, tb + 14], [nx + 36, tb + 26]], 7, vermelho);
    const fio = bezier([nx + 16, tb + 10], [nx + 22, jy + jh + 18], [nx + 4, jy + jh + 22], [nx + 2, jy + jh + 40], 12)
      .concat(bezier([nx + 2, jy + jh + 40], [nx + 24, 470], [nx - 24, 600], [nx + 4, 700], 50));
    cordao(k, fio, 15, vermelho);
    marcar(k, obj, pol(fio, false), 21);
    marcar(k, obj, no);
    k.lineWidth = 1.8;
    k.strokeStyle = '#a82a1e';
    for (let i = -2; i <= 2; i++) { k.beginPath(); k.moveTo(nx + 4, 700); k.lineTo(nx + 4 + i * 5, 718 + Math.abs(i) * 2); k.stroke(); }
    // o chão ao pé do muro
    const base = new Path2D();
    base.rect(-10, chao, W + 20, H);
    k.fillStyle = '#d6bf8e';
    k.fill(base);
    linhas(k, 0, chao, W, H, 5, 1.5, () => 0.5);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(0, chao);
    k.lineTo(W, chao);
    k.stroke();
    capim(k, r, 120, chao + 4, 30, 9);
    capim(k, r, 300, chao + 2, 22, 7);
    capim(k, r, 700, chao + 4, 34, 9);
    vinheta(k, W, H, 0.22);
  }

  // O fogo de uma tocha de pano, à noite, em xilogravura: uma língua alta só, com duas menores
  // do lado, em camadas de dentro para fora (cada uma com o contorno), e o clarão em traços
  // curtos em volta, não em mancha. É diferente do fogo de lenha do altar de Abel.
  function fogoDePano(k, r, x, y, h, vai) {
    k.save();
    k.lineCap = 'round';
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * 6.283;
      const d0 = h * (0.62 + r() * 0.1);
      const d1 = d0 + h * (0.12 + r() * 0.22);
      const cy = y - h * 0.42;
      k.strokeStyle = 'rgba(255,196,110,' + (0.25 + r() * 0.3).toFixed(2) + ')';
      k.lineWidth = 1.2 + r();
      k.beginPath();
      k.moveTo(x + vai * 0.4 + Math.cos(a) * d0 * 0.75, cy + Math.sin(a) * d0);
      k.lineTo(x + vai * 0.4 + Math.cos(a) * d1 * 0.75, cy + Math.sin(a) * d1);
      k.stroke();
    }
    const lingua = (s, dx, hh, v) => {
      const l = h * 0.34 * s;
      const p = new Path2D();
      p.moveTo(x + dx - l / 2, y);
      p.bezierCurveTo(x + dx - l * 0.9, y - hh * 0.4, x + dx + v * 0.2 - l * 0.35, y - hh * 0.62, x + dx + v, y - hh);
      p.bezierCurveTo(x + dx + v * 0.35 + l * 0.15, y - hh * 0.72, x + dx + l * 0.95, y - hh * 0.42, x + dx + l / 2, y);
      p.closePath();
      return p;
    };
    const camadas = [[1, '#d9772a'], [0.72, '#f0a344'], [0.48, '#ffd27a'], [0.26, '#fff2c4']];
    for (const [dx, hh, v, s] of [[-h * 0.2, h * 0.42, -h * 0.16, 0.5], [h * 0.2, h * 0.7, h * 0.3, 0.58]]) {
      const p = lingua(s, dx, hh, v);
      k.fillStyle = '#d9772a';
      k.fill(p);
      gravar(k, p, x + dx, y - hh * 0.5, hh * 0.7, -Math.PI / 2 + 0.25, 3.2, 1.3, () => 0.6, '#6b2a08', 0.4);
      k.strokeStyle = '#5a2406';
      k.lineWidth = 1.6;
      k.stroke(p);
    }
    camadas.forEach(([s, cor], i) => {
      const p = lingua(s * (1 - i * 0.04), -i * 3, h * (0.35 + s * 0.65), vai * s * (1 + i * 0.25));
      k.fillStyle = cor;
      k.fill(p);
      if (i < 2) gravar(k, p, x, y - h * 0.5, h * 0.7, -Math.PI / 2 + 0.25, 3.2, 1.3, (px, py) => 0.35 + Math.abs(px - x - (y - py) * 0.2) / (h * 0.3) * 0.6 - i * 0.25, '#6b2a08', 0.4);
      k.strokeStyle = i ? 'rgba(122,52,10,.7)' : '#5a2406';
      k.lineWidth = i ? 1.2 : 1.8;
      k.stroke(p);
    });
    k.restore();
  }

  // (8) Gideão e as tochas (Jz 7.16-20): de noite, no alto do morro, os vasos de barro com a
  // tocha escondida dentro (a boca acesa); um quebrado, de beirada partida com a espessura do
  // barro à mostra e os cacos em volta, e a tocha de pano saindo dele, inclinada; na frente,
  // a corneta de chifre. Lá embaixo, no vale, as tendas do acampamento de Midiã.
  function desenhoGideao(k, W, H, obj) {
    const r = sorteio(5801);
    k.fillStyle = '#171316';
    k.fillRect(0, 0, W, H);
    papelVelho(k, W, H, r, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'], [W / 2, H / 2], true);
    linhas(k, 0, 0, W, 420, 5.5, 1.2, (x, y) => 0.06 + (y / 420) ** 1.6 * 0.6, 'rgba(236,214,170,.38)');
    estrelasDoCeu(k, r, 30, 30, W - 30, 300, 200);
    // os morros dos dois lados e o vale lá embaixo, com as tendas
    const fm = onda(r, 3, 0.01);
    const serra = pol([[-10, 470], ...Array.from({ length: 46 }, (_, i) => [i * 20, 330 + fm(i * 20) * 16 + Math.abs(i - 23) ** 1.4 * 0.9 + 40 * Math.exp(-(((i - 23) / 7) ** 2))]), [W + 10, 470]]);
    k.fillStyle = '#211a17';
    k.fill(serra);
    gravar(k, serra, W / 2, 420, 480, -0.12, 5.5, 1, (x, y) => 0.35 + (y - 330) / 500, 'rgba(236,214,170,.32)', 0);
    k.strokeStyle = 'rgba(236,214,170,.55)';
    k.lineWidth = 1.4;
    k.stroke(serra);
    const fundoVale = pol([[-10, 520], [-10, 452], [200, 440], [444, 432], [700, 442], [W + 10, 450], [W + 10, 520]]);
    k.fillStyle = '#2a211c';
    k.fill(fundoVale);
    linhas(k, 0, 432, W, 520, 4.5, 1.1, () => 0.4, 'rgba(236,214,170,.32)');
    // as tendas: baixas, de pelo de cabra, com a cumeeira, a porta acesa e uma fogueirinha
    const tendas = [[90, 466, 70], [178, 460, 56], [262, 470, 78], [350, 452, 50], [430, 462, 66], [520, 450, 52], [598, 466, 74], [690, 456, 58], [770, 468, 72], [140, 486, 64], [470, 488, 62], [820, 486, 56]];
    for (const [x, y, w] of tendas) {
      const h = w * 0.42;
      const t = pol([[x - w / 2, y], [x - w * 0.44, y - h * 0.62], [x - w * 0.2, y - h], [x + w * 0.08, y - h * 0.86], [x + w * 0.3, y - h], [x + w * 0.46, y - h * 0.6], [x + w / 2, y]]);
      k.fillStyle = '#0d0a09';
      k.fill(t);
      gravar(k, t, x, y - h / 2, w * 0.7, 1.5, 3.4, 0.8, () => 0.5, 'rgba(236,214,170,.35)', 0);
      k.strokeStyle = 'rgba(236,214,170,.7)';
      k.lineWidth = 1.3;
      k.stroke(t);
      k.fillStyle = 'rgba(255,190,100,.85)';
      k.fillRect(x - w * 0.06, y - h * 0.5, w * 0.12, h * 0.5);
      k.strokeStyle = 'rgba(255,200,120,.5)';
      k.lineWidth = 1;
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i / 5 - 0.5) * 2; k.beginPath(); k.moveTo(x + w * 0.6 + Math.cos(a) * 3, y + Math.sin(a) * 3); k.lineTo(x + w * 0.6 + Math.cos(a) * 8, y + Math.sin(a) * 8); k.stroke(); }
    }
    // o alto do morro, perto: a terra escura em linhas, que clareiam perto da tocha
    const tx = 446;
    const chao = pol([[-10, H + 10], [-10, 548], [200, 528], [520, 540], [W + 10, 518], [W + 10, H + 10]]);
    k.fillStyle = '#251c15';
    k.fill(chao);
    gravar(k, chao, W / 2, 690, 520, 0.03, 5, 1.6, (x, y) => 0.85 - Math.hypot(x - tx, (y - 640) * 1.6) / 700, 'rgba(255,214,150,.42)', 0);
    k.strokeStyle = 'rgba(236,214,170,.55)';
    k.lineWidth = 1.4;
    k.stroke(chao);
    // um vaso inteiro: o perfil de cântaro e a luz da tocha escondida, na boca, em raios
    const cantaro = (t) => (t < 0.12 ? 0.42 + t : t < 0.3 ? 0.54 + (t - 0.12) * 2.2 : 0.94 - Math.pow((t - 0.3) / 0.7, 2) * 0.5);
    const umVaso = (cx, base, alt, larg) => {
      const p = vaso(k, cx, base, alt, larg, cantaro);
      const dir = Math.sign(tx - cx);
      sombraNoChao(k, pol([[cx - larg * 0.4, base], [cx + larg * 0.4, base], [cx + larg * 0.4 - dir * 50, base + 20], [cx - larg * 0.4 - dir * 50, base + 20]]), 0, 0, 8, 0.6);
      peca(k, p, [cx - larg / 2, base - alt, cx + larg / 2, base], { cor: '#a8643a', tinta: '#1a0c04', ang: 0.2, passo: 3.6, maxL: 2.2, sombra: (x, y) => 0.42 - ((x - cx) * dir) / larg * 0.9 + ((y - base + alt) / alt) * 0.15, cruzada: 0.72, traco: 2.4, obj, abaulado: 0.2 });
      k.save();
      k.clip(p);
      k.strokeStyle = 'rgba(40,16,4,.6)';
      k.lineWidth = 1.6;
      for (const f of [0.34, 0.38, 0.62]) { k.beginPath(); k.ellipse(cx, base - alt * (1 - f), larg * cantaro(f) / 2, larg * 0.06, 0, 0.1, Math.PI - 0.1); k.stroke(); }
      k.restore();
      const boca = new Path2D();
      boca.ellipse(cx, base - alt + 2, larg * 0.21, larg * 0.06, 0, 0, 6.283);
      k.fillStyle = '#ffd88a';
      k.fill(boca);
      k.strokeStyle = 'rgba(255,214,140,.65)';
      k.lineCap = 'round';
      for (let i = 0; i < 13; i++) {
        const a = -Math.PI + (i / 12) * Math.PI;
        k.lineWidth = 1.4;
        k.beginPath();
        k.moveTo(cx + Math.cos(a) * larg * 0.26, base - alt + Math.sin(a) * larg * 0.12);
        k.lineTo(cx + Math.cos(a) * larg * (0.36 + (i % 2) * 0.12), base - alt + Math.sin(a) * larg * (0.26 + (i % 2) * 0.14));
        k.stroke();
      }
      k.strokeStyle = '#1a0c04';
      k.lineWidth = 2;
      k.stroke(boca);
    };
    umVaso(176, 694, 196, 150);
    umVaso(744, 628, 158, 120);
    // o vaso quebrado: o mesmo cântaro dos inteiros (pé, barriga, ombro), com o terço de cima
    // partido. O vaso é uma superfície de revolução vista um pouco de cima: o ponto da altura t
    // (0 = boca, 1 = pé) e do ângulo g fica em (cx + raio(t) cos g, y(t) + 0,26 raio(t) sen g).
    // A quebra é uma altura t para cada ângulo, em trechos compridos e tortos, com dois degraus:
    // o pedaço do ombro que ficou de um lado, e o barro mais baixo do outro.
    const bx = tx;
    const bb = 748;
    const alt = 188;
    const larg = 146;
    const yDe = (t) => bb - alt + t * alt;
    const rDe = (t) => (cantaro(t) * larg) / 2;
    const pt = (t, g) => [bx + rDe(t) * Math.cos(g), yDe(t) + 0.26 * rDe(t) * Math.sin(g)];
    const quebra = [[0, 0.4], [0.45, 0.44], [0.8, 0.47], [1.15, 0.45], [1.45, 0.5], [1.8, 0.46], [2.1, 0.36], [2.3, 0.34], [2.6, 0.2], [2.95, 0.14],
      [3.4, 0.13], [3.9, 0.12], [4.3, 0.2], [4.7, 0.24], [5.1, 0.3], [5.6, 0.34], [6.283, 0.4]];
    const tQ = (g) => {
      const gg = ((g % 6.283) + 6.283) % 6.283;
      for (let i = 1; i < quebra.length; i++) {
        if (gg <= quebra[i][0]) {
          const [g0, t0] = quebra[i - 1];
          const [g1, t1] = quebra[i];
          return t0 + ((t1 - t0) * (gg - g0)) / (g1 - g0);
        }
      }
      return quebra[0][1];
    };
    const N = 120;
    const borda = Array.from({ length: N + 1 }, (_, i) => { const g = (i / N) * 6.283; return pt(tQ(g) + (r() - 0.5) * 0.006, g); });
    const frente = borda.slice(0, N / 2 + 1);
    const tras = borda.slice(N / 2);
    // a sombra no chão, para a esquerda (a tocha está acima, à direita)
    sombraNoChao(k, pol([[bx - 60, bb], [bx + 60, bb], [bx + 10, bb + 22], [bx - 110, bb + 22]]), 0, 0, 8, 0.6);
    // a boca partida, por dentro: o escuro, e a parede de dentro, de trás, iluminada pela tocha
    const abertura = pol(borda);
    k.fillStyle = '#2a1206';
    k.fill(abertura);
    const paredeDentro = pol([...tras, ...tras.slice().reverse().map(([x, y]) => [x, y + 44])]);
    k.save();
    k.clip(abertura);
    peca(k, paredeDentro, [bx - 80, bb - 140, bx + 80, bb - 40], { cor: '#8a4a26', tinta: '#1a0c04', ang: 1.45, passo: 3, maxL: 1.6, sombra: (x, y) => 0.3 + (y - bb + 130) / 80 + (bx - x) / 300, cruzada: 0.8, traco: 0 });
    gravar(k, abertura, bx, bb - 100, 90, 0.1, 3.2, 1.8, (x, y) => 0.45 + (y - bb + 120) / 60, '#120602', 0.4);
    k.restore();
    // a espessura da beirada de trás: uma linha clara fina por cima
    k.strokeStyle = '#e2a874';
    k.lineWidth = 3;
    k.beginPath();
    tras.forEach(([x, y], i) => (i ? k.lineTo(x, y - 1.5) : k.moveTo(x, y - 1.5)));
    k.stroke();
    // a tocha: o cabo curto de madeira enfiado na boca partida, inclinado, com o pano enrolado
    const t0 = [bx - 6, bb - 112];
    const t1 = [bx + 64, bb - 272];
    vara(k, [t0, t1], 15, '#8a5e36', obj);
    fogoDePano(k, r, t1[0] - 2, t1[1] + 26, 196, 44);
    k.save();
    k.translate(t1[0], t1[1]);
    k.rotate(Math.atan2(t1[1] - t0[1], t1[0] - t0[0]) + Math.PI / 2);
    const pano = pol([[-15, -6], [15, -6], [17, 54], [-13, 56]]);
    peca(k, pano, [-17, -6, 17, 56], { cor: '#5a3c26', tinta: '#140a04', ang: 0.5, passo: 3, maxL: 1.4, sombra: (x) => 0.35 + (x + 15) / 60, traco: 2, obj });
    k.strokeStyle = '#140a04';
    k.lineWidth = 1.8;
    for (let yy = 4; yy < 54; yy += 9) { k.beginPath(); k.moveTo(-16, yy); k.quadraticCurveTo(0, yy + 7, 17, yy + 2); k.stroke(); }
    k.restore();
    // o corpo de fora: da quebra da frente até o pé, pelo perfil do cântaro
    const tD = tQ(0);
    const tE = tQ(Math.PI);
    const corpo = new Path2D();
    corpo.moveTo(frente[0][0], frente[0][1]);
    frente.forEach(([x, y]) => corpo.lineTo(x, y));
    for (let i = 0; i <= 30; i++) { const t = tE + ((1 - tE) * i) / 30; corpo.lineTo(bx - rDe(t), yDe(t)); }
    corpo.quadraticCurveTo(bx, bb + larg * 0.05, bx + rDe(1), yDe(1));
    for (let i = 30; i >= 0; i--) { const t = tD + ((1 - tD) * i) / 30; corpo.lineTo(bx + rDe(t), yDe(t)); }
    corpo.closePath();
    peca(k, corpo, [bx - larg / 2, bb - alt, bx + larg / 2, bb], { cor: '#a8643a', tinta: '#1a0c04', ang: 0.2, passo: 3.6, maxL: 2.2, sombra: (x, y) => 0.42 - ((x - bx) / larg) * 0.9 + ((y - bb + alt) / alt) * 0.15, cruzada: 0.72, traco: 2.4, obj, abaulado: 0.2 });
    // as faixas do torno, como nos inteiros, só abaixo da quebra
    k.save();
    k.clip(corpo);
    k.strokeStyle = 'rgba(40,16,4,.6)';
    k.lineWidth = 1.6;
    for (const f of [0.34, 0.38, 0.62]) { k.beginPath(); k.ellipse(bx, yDe(f), rDe(f), 0.26 * rDe(f), 0, 0.1, Math.PI - 0.1); k.stroke(); }
    k.restore();
    // a espessura do barro na quebra da frente: a faixa clara do corte, com a linha escura
    // embaixo (a face de fora)
    k.lineJoin = 'round';
    k.strokeStyle = '#e8b07c';
    k.lineWidth = 6;
    k.beginPath();
    frente.forEach(([x, y], i) => (i ? k.lineTo(x, y + 2) : k.moveTo(x, y + 2)));
    k.stroke();
    k.strokeStyle = '#1a0c04';
    k.lineWidth = 1.8;
    k.beginPath();
    frente.forEach(([x, y], i) => (i ? k.lineTo(x, y + 5.5) : k.moveTo(x, y + 5.5)));
    k.stroke();
    k.lineWidth = 1.4;
    k.beginPath();
    frente.forEach(([x, y], i) => (i ? k.lineTo(x, y - 1) : k.moveTo(x, y - 1)));
    k.stroke();
    // os cacos: pedaços do mesmo cântaro, cada um um trecho do anel da parede (uma beirada
    // curva, a do vaso, e as outras partidas), deitados no chão. A face de fora (escura, com a
    // hachura que segue a curva) é a maior parte; a espessura, uma faixa clara na beirada partida.
    const cacos = [[bx - 170, bb + 34, 0.3, 1.35, 0], [bx + 134, bb + 26, -0.5, 1.2, 1], [bx + 222, bb - 6, 1.0, 1.05, 0], [bx - 100, bb + 70, -1.1, 1.45, 0],
      [bx + 58, bb + 62, 0.15, 1.1, 1], [bx - 240, bb + 2, 2.3, 1.0, 0]];
    for (const [x, y, gi, e, dentroV] of cacos) {
      k.save();
      k.translate(x, y);
      k.rotate(gi);
      k.scale(e, e * 0.82);
      // a lasca: um polígono anguloso de quebra, com um lado só em curva leve (a boca ou a
      // barriga do vaso); a face de fora escura, hachurada em diagonal, com a luz na lombada
      const n = 6;
      const partida = [];
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 0.15 + (i / (n - 1)) * Math.PI * 1.25 + (r() - 0.5) * 0.25;
        const d = 22 + r() * 14;
        partida.push([Math.cos(a) * d * 1.2, Math.sin(a) * d]);
      }
      const p0 = partida[n - 1];
      const p1 = partida[0];
      const curva = bezier(p0, [p0[0] + 14, p0[1] - 10], [p1[0] + 16, p1[1] - 4], p1, 10);
      const forma = pol([...partida, ...curva]);
      k.save();
      k.translate(-5, 5);
      k.filter = 'blur(3px)';
      k.fillStyle = 'rgba(0,0,0,.6)';
      k.fill(forma);
      k.restore();
      k.fillStyle = dentroV ? '#c98a5a' : '#8e4e2a';
      k.fill(forma);
      marcar(k, obj, forma);
      gravar(k, forma, 0, 0, 50, 0.75, 3.2, dentroV ? 1.2 : 1.7, (px, py) => (dentroV ? 0.2 : 0.45) + (px + py) / 160 + Math.hypot(px - p0[0] - 10, py - p0[1] + 6) / 260, '#1a0c04', 0.3);
      // a luz na beirada curva (a lombada da parede)
      k.strokeStyle = dentroV ? 'rgba(255,226,180,.7)' : 'rgba(240,170,110,.75)';
      k.lineWidth = 2.4;
      k.beginPath();
      curva.forEach(([px, py], i) => (i ? k.lineTo(px - 2, py + 3) : k.moveTo(px - 2, py + 3)));
      k.stroke();
      // a espessura: a faixa clara ao longo da beirada partida
      k.strokeStyle = '#ebb888';
      k.lineWidth = 4;
      k.lineJoin = 'miter';
      k.beginPath();
      partida.slice(1).forEach(([px, py], i) => (i ? k.lineTo(px - 1.5, py - 1.5) : k.moveTo(px - 1.5, py - 1.5)));
      k.stroke();
      k.strokeStyle = '#1a0c04';
      k.lineWidth = 2;
      k.stroke(forma);
      k.restore();
    }
    // a corneta de chifre de carneiro, deitada na frente, à direita, com os anéis do chifre
    const ch = bezier([540, 722], [614, 740], [700, 732], [780, 670], 30);
    const raioDe = (i) => 5 + (i / (ch.length - 1)) ** 1.6 * 30;
    const lado = (s) => ch.map(([x, y], i) => { const j = Math.min(i, ch.length - 2); const a = Math.atan2(ch[j + 1][1] - ch[j][1], ch[j + 1][0] - ch[j][0]); return [x - Math.sin(a) * raioDe(i) * s, y + Math.cos(a) * raioDe(i) * s]; });
    const chifre = new Path2D();
    lado(1).forEach(([x, y], i) => (i ? chifre.lineTo(x, y) : chifre.moveTo(x, y)));
    lado(-1).reverse().forEach(([x, y]) => chifre.lineTo(x, y));
    chifre.closePath();
    sombraNoChao(k, chifre, -10, 12, 6, 0.6);
    peca(k, chifre, [520, 650, 850, 790], { cor: '#d6b47c', tinta: '#1a0c04', ang: 1.3, passo: 3.4, maxL: 1.8, sombra: (x, y) => 0.15 + (y - 690) / 140 + (x - 546) / 1400, cruzada: 0.8, traco: 2.4, obj });
    k.save();
    k.clip(chifre);
    k.strokeStyle = 'rgba(26,12,4,.75)';
    k.lineWidth = 1.5;
    for (let i = 3; i < ch.length - 1; i += 2) {
      const [x, y] = ch[i];
      const a = Math.atan2(ch[i + 1][1] - ch[i][1], ch[i + 1][0] - ch[i][0]) + Math.PI / 2;
      const rr = raioDe(i);
      k.beginPath();
      k.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      k.quadraticCurveTo(x + Math.cos(a - Math.PI / 2) * rr * 0.3, y + Math.sin(a - Math.PI / 2) * rr * 0.3, x - Math.cos(a) * rr, y - Math.sin(a) * rr);
      k.stroke();
    }
    k.restore();
    const [ex, ey] = ch[ch.length - 1];
    const bocal = new Path2D();
    bocal.ellipse(ex, ey, 14, 30, 0.6, 0, 6.283);
    k.fillStyle = '#2a1a0a';
    k.fill(bocal);
    k.strokeStyle = '#1a0c04';
    k.lineWidth = 2.4;
    k.stroke(bocal);
    marcar(k, obj, bocal);
    vinheta(k, W, H, 0.35);
  }

  // Uma espiga de cevada, deitada ou em pé, de (x, y) para o ângulo a: o pedaço de talo, os
  // grãos em duas fileiras alternadas, cada um com a barba comprida que segue a espiga (é a
  // barba que diz cevada, não trigo). "e" é a escala (1 = uns 60 px de espiga, mais a barba).
  function cevada(k, x, y, a, e, { tinta = '#3b3220', cor = '#efe0b0', talo = 40 } = {}) {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    k.save();
    k.lineCap = 'round';
    k.lineJoin = 'round';
    // o talo, antes da espiga
    k.strokeStyle = tinta;
    k.lineWidth = 3.4 * e;
    k.beginPath();
    k.moveTo(x - ca * talo * e, y - sa * talo * e);
    k.lineTo(x, y);
    k.stroke();
    k.strokeStyle = '#d9c88e';
    k.lineWidth = 1.6 * e;
    k.stroke();
    const n = 8;
    const comp = 60 * e;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const lado = i % 2 ? 1 : -1;
      const px = x + ca * comp * t;
      const py = y + sa * comp * t;
      const gx = px - sa * lado * 4.2 * e;
      const gy = py + ca * lado * 4.2 * e;
      const ga = a + lado * 0.32;
      // a barba: longa, quase paralela à espiga, abrindo um pouco
      k.strokeStyle = tinta;
      k.lineWidth = 0.9 * e;
      k.beginPath();
      k.moveTo(gx + Math.cos(ga) * 6 * e, gy + Math.sin(ga) * 6 * e);
      k.quadraticCurveTo(gx + Math.cos(a + lado * 0.14) * 50 * e, gy + Math.sin(a + lado * 0.14) * 50 * e, gx + Math.cos(a + lado * 0.2) * (78 - t * 20) * e, gy + Math.sin(a + lado * 0.2) * (78 - t * 20) * e);
      k.stroke();
      // o grão, em gota, com a hachura do lado de baixo
      const grao = new Path2D();
      grao.ellipse(gx, gy, 7.2 * e, 3.6 * e, ga, 0, 6.283);
      k.fillStyle = cor;
      k.fill(grao);
      k.save();
      k.clip(grao);
      k.strokeStyle = 'rgba(59,50,32,.6)';
      k.lineWidth = 0.9 * e;
      for (let d = -6; d <= 6; d += 2.4) { k.beginPath(); k.moveTo(gx + Math.cos(ga) * d * e, gy + Math.sin(ga) * d * e + 1.4 * e); k.lineTo(gx + Math.cos(ga) * d * e + 2 * e, gy + Math.sin(ga) * d * e + 4 * e); k.stroke(); }
      k.restore();
      k.strokeStyle = tinta;
      k.lineWidth = 1.2 * e;
      k.stroke(grao);
    }
    k.restore();
  }

  // (9) Rute e as espigas (Rt 2.2-3): no campo de Boaz, de tarde, na colheita da cevada (1.22),
  // visto de perto do chão: o restolho, e as espigas que sobraram atrás dos ceifeiros (2.3),
  // soltas, uma aqui, outra ali, levando ao xale dobrado onde está o punhado que Rute já
  // recolheu. Os feixes dos ceifeiros ficam lá no meio do campo, pequenos. A cevada é pálida,
  // de palha clara; o sol da tarde, gravado em raios.
  function desenhoRute(k, W, H, obj) {
    const r = sorteio(5901);
    papelVelho(k, W, H, r, ['#f7f1dc', '#e9e0c0', '#cfc49c'], [W * 0.8, 160]);
    linhas(k, 0, 0, W, 300, 6.5, 1.1, (x, y) => 0.1 + (1 - y / 300) * 0.4 - Math.max(0, 0.4 - Math.hypot(x - 700, y - 170) / 300));
    // o sol da tarde, baixo, com os raios gravados
    const sol = [700, 170];
    k.strokeStyle = '#6e5a2c';
    k.lineCap = 'round';
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * 6.283;
      k.lineWidth = i % 2 ? 1.2 : 2;
      k.beginPath();
      k.moveTo(sol[0] + Math.cos(a) * 46, sol[1] + Math.sin(a) * 46);
      k.lineTo(sol[0] + Math.cos(a) * (i % 2 ? 68 : 90), sol[1] + Math.sin(a) * (i % 2 ? 68 : 90));
      k.stroke();
    }
    const disco = new Path2D();
    disco.arc(sol[0], sol[1], 38, 0, 6.283);
    peca(k, disco, [sol[0] - 38, sol[1] - 38, sol[0] + 38, sol[1] + 38], { cor: '#fbf0c8', tinta: '#6e5a2c', sombra: (x, y) => 0.1 + Math.hypot(x - sol[0], y - sol[1]) / 90, ang: 0, passo: 4.4, maxL: 1.1, cruzada: 1, traco: 2, obj });
    // os morros de Belém, longe
    const fm = onda(r, 4, 0.009);
    const morro = pol([[-10, 320], ...Array.from({ length: 46 }, (_, i) => [i * 20, 262 + fm(i * 20) * 18]), [W + 10, 320]]);
    peca(k, morro, [0, 230, W, 320], { cor: '#e2dbb8', ang: -0.3, passo: 5, maxL: 1.1, sombra: (x) => 0.45 + Math.sin(x * 0.015) * 0.15, cruzada: 0.55, traco: 1.6 });
    // a cevada ainda em pé, na beira do fundo: uma faixa de hastes com as barbas
    const campo = new Path2D();
    campo.rect(-10, 300, W + 20, H);
    k.fillStyle = '#e6dcb4';
    k.fill(campo);
    linhas(k, 0, 300, W, H, 5.5, 1.3, (x, y) => 0.18 + (y - 300) / 1200);
    k.strokeStyle = 'rgba(59,50,32,.75)';
    k.lineWidth = 1;
    for (let x = 0; x < W; x += 4) {
      const h = 22 + r() * 10;
      k.beginPath();
      k.moveTo(x, 322);
      k.lineTo(x + 2, 322 - h);
      k.lineTo(x + 6, 322 - h - 10);
      k.stroke();
    }
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(0, 322);
    k.lineTo(W, 322);
    k.stroke();
    // os feixes dos ceifeiros, pequenos, no meio do campo: medas de palha com as barbas no alto
    for (const [x, y, h] of [[90, 376, 46], [250, 362, 38], [430, 370, 42], [640, 358, 36], [800, 380, 48]]) {
      sombraNoChao(k, pol([[x - h * 0.5, y], [x + h * 0.5, y], [x + h * 0.2, y + 8], [x - h * 0.8, y + 8]]), 0, 0, 3, 0.35);
      const m = new Path2D();
      m.moveTo(x - h * 0.5, y);
      m.quadraticCurveTo(x - h * 0.42, y - h * 0.7, x - h * 0.1, y - h);
      m.quadraticCurveTo(x + h * 0.1, y - h * 1.08, x + h * 0.22, y - h * 0.94);
      m.quadraticCurveTo(x + h * 0.44, y - h * 0.6, x + h * 0.5, y);
      m.closePath();
      peca(k, m, [x - h * 0.5, y - h * 1.08, x + h * 0.5, y], { cor: '#e8dbab', tinta: '#3b3220', ang: -Math.PI / 2 + 0.1, passo: 2.6, maxL: 1.1, sombra: (px) => 0.25 + (px - x + h * 0.5) / h * 0.6, traco: 1.4 });
      k.strokeStyle = '#3b3220';
      k.lineWidth = 1;
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i / 8 - 0.5) * 2.2; k.beginPath(); k.moveTo(x + Math.cos(a) * h * 0.2, y - h * 0.9 + Math.sin(a) * h * 0.1); k.lineTo(x + Math.cos(a) * h * 0.55, y - h * 0.9 + Math.sin(a) * h * 0.5); k.stroke(); }
      k.lineWidth = 2;
      k.beginPath();
      k.moveTo(x - h * 0.36, y - h * 0.45);
      k.quadraticCurveTo(x, y - h * 0.38, x + h * 0.36, y - h * 0.45);
      k.stroke();
    }
    // o restolho: os tocos cortados, espalhados, maiores e mais grossos perto
    k.strokeStyle = 'rgba(59,50,32,.7)';
    for (let i = 0; i < 1500; i++) {
      const u = r();
      const y = 390 + u ** 1.7 * (H - 390);
      const e = 0.4 + (y - 390) / 260;
      const xx = r() * (W + 20) - 10;
      const h = (4 + r() * 5) * e;
      const g = (r() - 0.5) * 0.5;
      k.lineWidth = 0.8 * e;
      k.beginPath();
      k.moveTo(xx, y);
      k.lineTo(xx + Math.sin(g) * h, y - h);
      k.stroke();
    }
    // as espigas que sobraram, soltas no chão, uma depois da outra até o xale
    for (const [x, y, a, e] of [[602, 410, 2.9, 0.45], [520, 440, 0.3, 0.5], [610, 476, 3.4, 0.58], [470, 506, 2.6, 0.64], [802, 470, 3.6, 0.6], [120, 456, -0.2, 0.55], [120, 800, -0.15, 1.02], [800, 790, 3.3, 1.08], [700, 560, 3.0, 0.8]]) {
      sombraNoChao(k, pol([[x, y + 3], [x + Math.cos(a) * 110 * e, y + Math.sin(a) * 110 * e + 3], [x + Math.cos(a) * 110 * e, y + Math.sin(a) * 110 * e + 9], [x, y + 9]]), 0, 0, 3 * e, 0.3);
      cevada(k, x, y, a, e);
      const m = new Path2D();
      m.ellipse(x + Math.cos(a) * 40 * e, y + Math.sin(a) * 40 * e, 50 * e, 12 * e, a, 0, 6.283);
      marcar(k, obj, m);
    }
    // o xale de lã crua, largado no chão, com as dobras, as listras e a franja
    const xale = new Path2D();
    xale.moveTo(200, 612);
    xale.bezierCurveTo(330, 580, 520, 600, 660, 556);
    xale.bezierCurveTo(690, 600, 700, 640, 752, 690);
    xale.bezierCurveTo(600, 712, 420, 760, 262, 786);
    xale.bezierCurveTo(250, 730, 226, 660, 200, 612);
    xale.closePath();
    sombraNoChao(k, xale, -12, 12, 12, 0.5);
    peca(k, xale, [200, 556, 752, 786], { cor: '#f0e6c8', tinta: '#3b3220', ang: 0.2, passo: 4, maxL: 1.5, sombra: (x, y) => 0.12 + (y - 560) / 420 + (752 - x) / 1800, cruzada: 0.75, traco: 2.2, obj });
    k.save();
    k.clip(xale);
    for (const [d, w, al] of [[30, 10, 0.8], [48, 4, 0.8], [190, 10, 0.65], [206, 4, 0.65]]) {
      k.strokeStyle = 'rgba(92,60,34,' + al + ')';
      k.lineWidth = w;
      k.beginPath();
      k.moveTo(200 + d * 0.3, 612 + d * 0.9);
      k.bezierCurveTo(330 + d * 0.2, 580 + d * 0.95, 520 + d * 0.15, 600 + d * 0.9, 660 + d * 0.45, 556 + d * 0.65);
      k.stroke();
    }
    // as dobras: sulcos com a hachura do lado da sombra
    for (const [x0, y0, x1, y1, x2, y2] of [[420, 596, 450, 670, 430, 760], [560, 586, 600, 650, 590, 728], [300, 600, 330, 660, 320, 776]]) {
      const sulco = pol([...bezier([x0, y0], [x1, y1], [x1, y1], [x2, y2], 12), ...bezier([x2 + 26, y2 - 4], [x1 + 30, y1], [x1 + 30, y1], [x0 + 22, y0 - 2], 12)]);
      gravar(k, sulco, x1 + 12, y1, 110, 1.25, 3.2, 1.6, (x) => 0.9 - (x - x1) / 36, '#3b3220', 0.1);
      k.strokeStyle = '#3b3220';
      k.lineWidth = 1.6;
      k.beginPath();
      k.moveTo(x0, y0);
      k.quadraticCurveTo(x1, y1, x2, y2);
      k.stroke();
    }
    k.restore();
    k.strokeStyle = '#3b3220';
    k.lineWidth = 1.6;
    for (let t = 0.02; t < 1; t += 0.03) {
      const p = bezier([752, 690], [600, 712], [420, 760], [262, 786], 40)[Math.round(t * 40)];
      k.beginPath();
      k.moveTo(p[0], p[1]);
      k.lineTo(p[0] - 1 + (r() - 0.5) * 3, p[1] + 12);
      k.stroke();
    }
    // o punhado: sete espigas soltas, juntas pelo talo e abertas em leque, no colo do xale
    for (const [a, e, rr] of [[-0.5, 1.12, 120], [-0.33, 1.2, 168], [-0.17, 1.22, 128], [0, 1.24, 176], [0.16, 1.2, 134], [0.32, 1.14, 170], [0.47, 1.06, 126]]) {
      const x = 250 + Math.cos(a) * rr;
      const y = 700 + Math.sin(a) * rr * 0.8;
      cevada(k, x, y, a * 0.85, e, { talo: rr / e, tinta: '#2e2614', cor: '#e6d293' });
      const m = new Path2D();
      m.ellipse(x + Math.cos(a) * 46 * e, y + Math.sin(a) * 46 * e, 58 * e, 14 * e, a, 0, 6.283);
      marcar(k, obj, m);
    }
    // a aba do xale virada por cima dos talos
    const aba = new Path2D();
    aba.moveTo(200, 612);
    aba.bezierCurveTo(250, 600, 290, 604, 318, 598);
    aba.bezierCurveTo(340, 650, 344, 712, 330, 772);
    aba.bezierCurveTo(300, 778, 280, 782, 262, 786);
    aba.bezierCurveTo(250, 730, 226, 660, 200, 612);
    aba.closePath();
    peca(k, aba, [200, 598, 344, 786], { cor: '#e8dcbc', tinta: '#3b3220', ang: 1.3, passo: 3.4, maxL: 1.5, sombra: (x) => 0.25 + (x - 200) / 220, cruzada: 0.8, traco: 2.2, obj });
    k.save();
    k.clip(aba);
    k.strokeStyle = 'rgba(92,60,34,.8)';
    k.lineWidth = 10;
    k.beginPath();
    k.moveTo(296, 600);
    k.quadraticCurveTo(318, 690, 306, 780);
    k.stroke();
    k.restore();
    vinheta(k, W, H, 0.2);
  }

  // A juba do leão, de perfil, com o focinho para +x (em coordenadas da cabeça): uma massa que
  // começa na testa, à frente da orelha, passa por cima do crânio, desce pela nuca e pelo pescoço
  // até o peito ("baixo") e volta por baixo da queixada. As mechas saem para trás e para baixo.
  function jubaDeLeao(k, r, { baixo = 140, tinta = '#2a1c0e', obj } = {}) {
    const forma = lanoso(r, [[30, -50], [6, -80], [-40, -92], [-90, -72], [-124, -26], [-130, 36], [-112, baixo * 0.72], [-66, baixo], [-6, baixo * 0.96],
      [36, baixo * 0.66], [62, 58], [40, 50], [18, 18], [10, -16], [16, -44]], 4, 10);
    k.save();
    k.filter = 'blur(6px)';
    k.translate(6, 8);
    k.fillStyle = 'rgba(20,12,4,.35)';
    k.fill(forma);
    k.restore();
    k.fillStyle = '#946436';
    k.fill(forma);
    marcar(k, obj, forma);
    // as mechas: curvas que nascem perto da cara e vão para trás e para baixo, mais escuras
    // longe da luz (alto, à esquerda da cena) e embaixo
    k.save();
    k.clip(forma);
    k.lineCap = 'round';
    for (let i = 0; i < 1300; i++) {
      const u = r();
      const v = r();
      const x0 = 64 - u * 196;
      const y0 = -86 + v * (baixo + 86);
      const ang = Math.atan2(y0 + 10, x0 - 40) + (r() - 0.5) * 0.5;
      const c = 16 + r() * 26;
      const s = Math.max(0, Math.min(1, 0.35 + (y0 + 60) / (baixo * 2.4) + (-x0) / 400));
      k.strokeStyle = tinta;
      k.globalAlpha = 0.3 + s * 0.6;
      k.lineWidth = 0.6 + s * 1.6;
      k.beginPath();
      k.moveTo(x0, y0);
      k.quadraticCurveTo(x0 + Math.cos(ang) * c * 0.5 + Math.cos(ang + 1.57) * c * 0.18, y0 + Math.sin(ang) * c * 0.5 + Math.sin(ang + 1.57) * c * 0.18, x0 + Math.cos(ang) * c, y0 + Math.sin(ang) * c);
      k.stroke();
    }
    k.restore();
    // a beirada: mechas compridas e desiguais que passam da massa para fora, para trás e para
    // baixo, sem contorno (a juba é cabelo, não gola)
    k.save();
    k.lineCap = 'round';
    const bordaJ = [[30, -50], [6, -80], [-40, -92], [-90, -72], [-124, -26], [-130, 36], [-112, baixo * 0.72], [-66, baixo], [-6, baixo * 0.96], [36, baixo * 0.66]];
    for (let i = 0; i < bordaJ.length - 1; i++) {
      const [x0, y0] = bordaJ[i];
      const [x1, y1] = bordaJ[i + 1];
      const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 7);
      for (let j = 0; j < n; j++) {
        const t = j / n;
        const px = x0 + (x1 - x0) * t;
        const py = y0 + (y1 - y0) * t;
        const ang = 0.45 * (Math.atan2(py + 10, px - 40) + 0.3) + 0.55 * 2.5 + (r() - 0.5) * 0.5;
        const c = 6 + r() * 13;
        const ix = px + Math.cos(ang + Math.PI) * 10;
        const iy = py + Math.sin(ang + Math.PI) * 10;
        k.strokeStyle = tinta;
        k.globalAlpha = 0.75;
        k.lineWidth = 1 + r() * 1.2;
        k.beginPath();
        k.moveTo(ix, iy);
        k.quadraticCurveTo(px + Math.cos(ang + 0.5) * c * 0.3, py + Math.sin(ang + 0.5) * c * 0.3, px + Math.cos(ang) * c, py + Math.sin(ang) * c);
        k.stroke();
        if (r() < 0.5) {
          k.strokeStyle = '#946436';
          k.globalAlpha = 0.9;
          k.lineWidth = 2.4;
          k.beginPath();
          k.moveTo(ix, iy);
          k.quadraticCurveTo(px + Math.cos(ang + 0.5) * c * 0.25, py + Math.sin(ang + 0.5) * c * 0.25, px + Math.cos(ang) * c * 0.7, py + Math.sin(ang) * c * 0.7);
          k.stroke();
        }
      }
    }
    k.restore();
  }
  // A cabeça do leão de perfil, focinho para +x, em gravura: a testa larga, a cana do nariz longa
  // e reta, a almofada escura do nariz na ponta, o lábio de cima cheio com as fileiras dos pontos
  // dos bigodes, a linha da boca que corre para trás e para baixo (nada de sorriso), o queixo e a
  // queixada; o olho pequeno, em amêndoa inclinada, sob a arcada (a arcada é tom, não risco); a
  // orelha redonda meio enterrada na juba; e as mechas da juba que passam por cima da beirada da
  // cara, na testa e na bochecha, emoldurando-a. fechado: o olho é uma linha reta.
  function cabecaDeLeao(k, r, { fechado = false, tinta = '#2a1c0e', obj } = {}) {
    // a orelha
    const orelha = new Path2D();
    orelha.ellipse(-6, -56, 12, 15, -0.5, 0, 6.283);
    peca(k, orelha, [-20, -72, 8, -40], { cor: '#b48450', tinta, sombra: () => 0.55, passo: 2.6, maxL: 1.3, traco: 1.8, obj });
    k.strokeStyle = tinta;
    k.lineWidth = 1.2;
    k.beginPath();
    k.ellipse(-4, -54, 6, 9, -0.5, Math.PI * 0.6, Math.PI * 1.6);
    k.stroke();
    const cab = new Path2D();
    cab.moveTo(4, -48);
    cab.bezierCurveTo(30, -60, 56, -54, 70, -44);
    cab.bezierCurveTo(88, -32, 104, -22, 112, -14);
    cab.bezierCurveTo(118, -10, 120, -2, 116, 4);
    cab.bezierCurveTo(118, 14, 116, 30, 106, 36);
    cab.bezierCurveTo(98, 42, 86, 44, 76, 42);
    cab.bezierCurveTo(72, 50, 60, 56, 46, 56);
    cab.bezierCurveTo(24, 56, 8, 40, 4, 18);
    cab.bezierCurveTo(0, -6, -2, -32, 4, -48);
    cab.closePath();
    peca(k, cab, [0, -60, 120, 56], { cor: '#c99d62', tinta, ang: 0.62, passo: 2.8, maxL: 1.8, sombra: (x, y) => 0.28 + Math.max(0, (y + 10) / 60) * 0.55 + Math.max(0, (40 - x) / 60) * 0.5 - Math.max(0, 1 - Math.hypot(x - 84, y + 20) / 34) * 0.3, cruzada: 0.6, traco: 0, obj, abaulado: 0.25 });
    // só o perfil da frente leva contorno (da testa ao queixo); o de trás se perde na juba
    const perfil = new Path2D();
    perfil.moveTo(30, -58);
    perfil.bezierCurveTo(44, -56, 60, -50, 70, -44);
    perfil.bezierCurveTo(88, -32, 104, -22, 112, -14);
    perfil.bezierCurveTo(118, -10, 120, -2, 116, 4);
    perfil.bezierCurveTo(118, 14, 116, 30, 106, 36);
    perfil.bezierCurveTo(98, 42, 86, 44, 76, 42);
    perfil.bezierCurveTo(72, 50, 60, 56, 46, 56);
    k.strokeStyle = tinta;
    k.lineWidth = 2.2;
    k.stroke(perfil);
    k.save();
    k.clip(cab);
    // o pelo curto da cara, ao longo do focinho
    k.strokeStyle = tinta;
    k.lineCap = 'round';
    k.globalAlpha = 0.5;
    k.lineWidth = 0.9;
    for (let i = 0; i < 80; i++) {
      const px = 10 + r() * 100;
      const py = -50 + r() * 100;
      k.beginPath();
      k.moveTo(px, py);
      k.lineTo(px - 6 - r() * 4, py - 2 + (r() - 0.5) * 2);
      k.stroke();
    }
    k.globalAlpha = 1;
    // a arcada: tom em hachura cruzada acima do olho, e a sombra da órbita
    const arcada = new Path2D();
    arcada.ellipse(56, -40, 22, 9, 0.45, 0, 6.283);
    gravar(k, arcada, 56, -40, 22, 0.2, 2.4, 1.6, () => 0.85, tinta, 0);
    // o focinho: a bochecha dos bigodes em sombra embaixo, e a sombra sob a queixada
    const boch = new Path2D();
    boch.ellipse(94, 24, 24, 16, -0.2, 0, 6.283);
    gravar(k, boch, 94, 24, 28, 1.1, 2.6, 1.2, (x, y) => 0.15 + (y - 14) / 24, tinta, 0.2);
    const garganta = new Path2D();
    garganta.ellipse(42, 50, 36, 12, 0.1, 0, 6.283);
    gravar(k, garganta, 42, 50, 38, 0.3, 2.4, 1.4, () => 0.75, tinta, 0);
    k.restore();
    // o olho
    k.lineCap = 'round';
    if (fechado) {
      k.strokeStyle = tinta;
      k.lineWidth = 3;
      k.beginPath();
      k.moveTo(52, -32);
      k.lineTo(70, -26);
      k.stroke();
      k.lineWidth = 1;
      k.beginPath();
      k.moveTo(55, -28);
      k.lineTo(67, -24);
      k.stroke();
    } else {
      const olho = new Path2D();
      olho.moveTo(52, -34);
      olho.quadraticCurveTo(60, -37, 70, -27);
      olho.quadraticCurveTo(59, -25, 52, -34);
      olho.closePath();
      k.fillStyle = '#d4a040';
      k.fill(olho);
      k.fillStyle = '#140a02';
      k.beginPath();
      k.arc(61, -30, 2.2, 0, 6.283);
      k.fill();
      k.strokeStyle = tinta;
      k.lineWidth = 1.8;
      k.stroke(olho);
    }
    // a cana do nariz e a almofada do nariz, escura, na ponta
    k.strokeStyle = 'rgba(42,28,14,.55)';
    k.lineWidth = 1.2;
    k.beginPath();
    k.moveTo(72, -40);
    k.lineTo(106, -18);
    k.stroke();
    const nariz = new Path2D();
    nariz.moveTo(108, -14);
    nariz.bezierCurveTo(114, -13, 119, -6, 118, 0);
    nariz.bezierCurveTo(116, 5, 111, 6, 108, 3);
    nariz.bezierCurveTo(107, -2, 106, -8, 108, -14);
    k.fillStyle = '#2a140a';
    k.fill(nariz);
    k.fillStyle = 'rgba(255,230,200,.35)';
    k.beginPath();
    k.ellipse(112, -9, 2, 1.1, -0.4, 0, 6.283);
    k.fill();
    // a boca fechada: do nariz desce o sulco e a linha corre para trás e para baixo
    k.strokeStyle = tinta;
    k.lineWidth = 1.8;
    k.beginPath();
    k.moveTo(112, 10);
    k.lineTo(111, 24);
    k.quadraticCurveTo(96, 34, 74, 41);
    k.stroke();
    // os pontos dos bigodes, em fileiras, e uns fios compridos
    k.fillStyle = tinta;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { k.beginPath(); k.arc(86 + i * 6, 12 + j * 5 - i * 0.8, 1.2, 0, 6.283); k.fill(); }
    k.strokeStyle = 'rgba(42,28,14,.5)';
    k.lineWidth = 0.7;
    for (let i = 0; i < 4; i++) { k.beginPath(); k.moveTo(102, 16 + i * 3); k.quadraticCurveTo(122, 18 + i * 6, 140, 20 + i * 11); k.stroke(); }
    // as mechas da juba por cima da beirada da cara: no alto da testa e descendo pela bochecha
    // até debaixo da queixada, para a juba emoldurar a cara
    const borda = [...bezier([40, -58], [18, -56], [4, -44], [2, -20], 10), ...bezier([2, -20], [2, 12], [18, 44], [50, 60], 14)];
    k.lineCap = 'round';
    for (let i = 0; i < borda.length; i++) {
      for (let j = 0; j < 5; j++) {
        const [bx, by] = borda[i];
        const dentro = 6 + r() * 16;
        const ang = (i < 10 ? -2.6 : 2.9 - (i - 10) * 0.05) + (r() - 0.5) * 0.5;
        const c = 18 + r() * 20;
        const x0 = bx + dentro * (i < 10 ? 0.35 : 1);
        const y0 = by + dentro * (i < 10 ? 1 : -0.15);
        const x1 = x0 + Math.cos(ang) * c;
        const y1 = y0 + Math.sin(ang) * c;
        if (j < 2) {
          k.strokeStyle = '#946436';
          k.globalAlpha = 0.95;
          k.lineWidth = 3;
          k.beginPath();
          k.moveTo(x0, y0);
          k.quadraticCurveTo((x0 + x1) / 2 + 3, (y0 + y1) / 2, x1, y1);
          k.stroke();
        }
        k.strokeStyle = tinta;
        k.globalAlpha = 0.85;
        k.lineWidth = 1.1 + r() * 0.8;
        k.beginPath();
        k.moveTo(x0, y0);
        k.quadraticCurveTo((x0 + x1) / 2 + 3, (y0 + y1) / 2, x1, y1);
        k.stroke();
      }
    }
    k.globalAlpha = 1;
  }
  // Um leão deitado de perfil, virado para a direita, com a cabeça pousada nas patas da frente e
  // os olhos fechados: o corpo comprido, a anca, a pata de trás dobrada, o rabo com o tufo, a
  // juba (jubaDeLeao) e a cabeça (cabecaDeLeao). Gravura de livro de história natural. (x, y) é
  // o chão sob o peito; "e" a escala.
  function leaoDeitado(k, r, x, y, e, obj) {
    const tinta = '#2a1c0e';
    k.save();
    k.translate(x, y);
    k.scale(e, e);
    k.lineJoin = 'round';
    k.lineCap = 'round';
    k.save();
    k.filter = 'blur(8px)';
    k.fillStyle = 'rgba(20,12,4,.5)';
    k.beginPath();
    k.ellipse(-20, 4, 250, 16, 0, 0, 6.283);
    k.fill();
    k.restore();
    // o rabo, pelo chão, com o tufo
    const rabo = bezier([-150, -40], [-200, -10], [-250, 4], [-290, -6], 20);
    k.strokeStyle = tinta;
    k.lineWidth = 11;
    k.beginPath();
    rabo.forEach(([a, b], i) => (i ? k.lineTo(a, b) : k.moveTo(a, b)));
    k.stroke();
    k.strokeStyle = '#c69a5e';
    k.lineWidth = 7;
    k.stroke();
    const tufo = seixo(r, -298, -8, 16, 10, 0.2, 0.2);
    k.fillStyle = '#4a321a';
    k.fill(tufo);
    // o corpo: o lombo, a anca redonda, a barriga e o peito
    const corpo = new Path2D();
    corpo.moveTo(50, -122);
    corpo.bezierCurveTo(30, -134, 0, -132, -20, -118);
    corpo.bezierCurveTo(-50, -106, -90, -110, -120, -120);
    corpo.bezierCurveTo(-160, -128, -194, -100, -196, -60);
    corpo.bezierCurveTo(-196, -24, -170, -4, -130, 0);
    corpo.bezierCurveTo(-100, -2, -70, -14, -40, -10);
    corpo.bezierCurveTo(-10, -6, 20, 0, 40, 0);
    corpo.lineTo(80, -40);
    corpo.closePath();
    peca(k, corpo, [-200, -134, 80, 0], { cor: '#d3a86c', tinta, ang: 0.25, passo: 3.6, maxL: 1.9, sombra: (px, py) => 0.12 + (py + 120) / 150 * 0.8 + (px > -170 && px < -60 ? -0.1 : 0), cruzada: 0.72, traco: 2.2, obj, abaulado: 0.25 });
    // a anca e a coxa de trás dobrada, com a pata para a frente
    const anca = new Path2D();
    anca.moveTo(-176, -96);
    anca.bezierCurveTo(-130, -110, -70, -86, -64, -44);
    anca.bezierCurveTo(-60, -20, -70, -8, -40, -6);
    anca.lineTo(-6, -6);
    anca.bezierCurveTo(4, -2, 2, 6, -8, 6);
    anca.lineTo(-120, 6);
    anca.bezierCurveTo(-170, 4, -196, -30, -190, -62);
    anca.closePath();
    peca(k, anca, [-196, -110, 4, 6], { cor: '#cfa266', tinta, ang: 0.9, passo: 3.4, maxL: 1.9, sombra: (px, py) => sombraOval(-130, -50, 70, 56, 0)(px, py) * 0.9, cruzada: 0.7, traco: 2, obj, abaulado: 0.3 });
    k.strokeStyle = tinta;
    k.lineWidth = 1.4;
    for (const dx of [-24, -16, -8]) { k.beginPath(); k.moveTo(dx, -4); k.lineTo(dx + 2, 4); k.stroke(); }
    // a perna da frente do outro lado, mais escura, um pouco atrás da de cá
    const p2 = pernaDeLeao(10, -10, 206);
    peca(k, p2, [40, -74, 236, -8], { cor: '#b48650', tinta, ang: 0.05, passo: 3, maxL: 1.6, sombra: () => 0.62, cruzada: 0.7, traco: 1.8 });
    dedosDeLeao(k, 10, -10, 206, tinta);
    // a juba e, depois da perna, a cabeça pousada nela, de olho fechado
    k.save();
    k.translate(112, -84);
    k.rotate(0.06);
    jubaDeLeao(k, r, { baixo: 100, tinta, obj });
    k.restore();
    // a perna da frente de cá, estendida: o cotovelo no chão, o antebraço e a pata com os dedos
    const pata = pernaDeLeao(0, 0, 230);
    peca(k, pata, [36, -60, 250, 4], { cor: '#d0a46a', tinta, ang: 0.05, passo: 3.2, maxL: 1.7, sombra: (px, py) => 0.3 + (py + 40) / 60 + Math.max(0, (110 - px) / 200), cruzada: 0.75, traco: 2, obj, abaulado: 0.3 });
    dedosDeLeao(k, 0, 0, 230, tinta);
    k.save();
    k.translate(112, -84);
    k.rotate(0.06);
    cabecaDeLeao(k, r, { fechado: true, tinta, obj });
    k.restore();
    k.restore();
  }
  // Uma perna da frente de leão deitado, estendida para a frente (para a direita), em coordenadas
  // do leão: o ombro sob a juba, o cotovelo que encosta no chão, o antebraço deitado e a pata
  // redonda com os dedos e as almofadas. Devolve a forma, para quem a pinta.
  function pernaDeLeao(dx, dy, comp) {
    const p = new Path2D();
    p.moveTo(dx + 34, dy - 40);
    p.bezierCurveTo(dx + 38, dy - 50, dx + 66, dy - 44, dx + 96, dy - 32);
    p.bezierCurveTo(dx + 130, dy - 26, dx + comp - 50, dy - 30, dx + comp - 22, dy - 32);
    p.bezierCurveTo(dx + comp - 4, dy - 36, dx + comp + 16, dy - 26, dx + comp + 18, dy - 12);
    p.bezierCurveTo(dx + comp + 19, dy - 2, dx + comp + 10, dy + 2, dx + comp - 6, dy + 2);
    p.lineTo(dx + 80, dy + 2);
    p.bezierCurveTo(dx + 50, dy + 4, dx + 32, dy - 10, dx + 34, dy - 40);
    p.closePath();
    return p;
  }
  function dedosDeLeao(k, dx, dy, comp, tinta) {
    k.strokeStyle = tinta;
    k.lineWidth = 1.6;
    for (const d of [-26, -14, -3]) {
      k.beginPath();
      k.moveTo(dx + comp + d, dy - 30 + (d + 26) * 0.4);
      k.quadraticCurveTo(dx + comp + d + 6, dy - 14, dx + comp + d + 3, dy + 1);
      k.stroke();
    }
    // o cotovelo, a dobra do pelo
    k.lineWidth = 1.4;
    k.beginPath();
    k.moveTo(dx + 50, dy - 2);
    k.quadraticCurveTo(dx + 64, dy - 18, dx + 92, dy - 26);
    k.stroke();
  }
  // Um leão deitado de perfil, de cabeça erguida e boca fechada (Dn 6.22): o corpo comprido e
  // baixo, a coxa dobrada (só em hachura de contorno), as patas da frente estendidas no chão, o
  // rabo, e a cabeça (cabecaDeLeao) com a juba (jubaDeLeao) que desce pelo pescoço até os ombros.
  // Desenhado virado para a direita e espelhado. (x, y) é o chão sob o peito.
  function leaoAtento(k, r, x, y, e, obj) {
    const tinta = '#2a1c0e';
    k.save();
    k.translate(x, y);
    k.scale(-e, e);
    k.lineJoin = 'round';
    k.lineCap = 'round';
    k.save();
    k.filter = 'blur(8px)';
    k.fillStyle = 'rgba(20,12,4,.5)';
    k.beginPath();
    k.ellipse(-60, 4, 270, 15, 0, 0, 6.283);
    k.fill();
    k.restore();
    // (desenhado virado para a direita e espelhado pela escala: a luz fica à esquerda na tela)
    // o rabo, no chão, atrás
    const rabo = bezier([-250, -30], [-300, -6], [-330, 4], [-344, -12], 20);
    k.strokeStyle = tinta;
    k.lineWidth = 11;
    k.beginPath();
    rabo.forEach(([a, b], i) => (i ? k.lineTo(a, b) : k.moveTo(a, b)));
    k.stroke();
    k.strokeStyle = '#c69a5e';
    k.lineWidth = 7;
    k.stroke();
    k.fillStyle = '#4a321a';
    k.fill(seixo(r, -348, -16, 14, 10, 0.4, 0.2));
    // a perna da frente do outro lado, mais escura, um pouco atrás
    const p2 = pernaDeLeao(-20, -8, 210);
    peca(k, p2, [0, -70, 220, 0], { cor: '#b48650', tinta, ang: 0.05, passo: 3, maxL: 1.6, sombra: () => 0.62, cruzada: 0.7, traco: 1.8 });
    dedosDeLeao(k, -20, -8, 210, tinta);
    // o corpo: o peito alto, o lombo baixo e comprido, a anca redonda, a barriga no chão
    const corpo = new Path2D();
    corpo.moveTo(40, -150);
    corpo.bezierCurveTo(0, -128, -60, -112, -120, -112);
    corpo.bezierCurveTo(-180, -112, -230, -118, -262, -92);
    corpo.bezierCurveTo(-290, -66, -284, -22, -250, -6);
    corpo.bezierCurveTo(-220, 2, -160, 0, -100, 0);
    corpo.lineTo(40, 0);
    corpo.bezierCurveTo(60, -40, 64, -110, 40, -150);
    corpo.closePath();
    peca(k, corpo, [-290, -150, 64, 0], { cor: '#d0a468', tinta, ang: 0.2, passo: 3.6, maxL: 1.9, sombra: (px, py) => 0.14 + ((py + 110) / 120) * 0.7, cruzada: 0.72, traco: 2.2, obj, abaulado: 0.3 });
    // a coxa de trás dobrada, só em hachura que segue o volume, com a pata dobrada à frente
    const coxa = new Path2D();
    coxa.moveTo(-268, -70);
    coxa.bezierCurveTo(-250, -112, -170, -110, -150, -64);
    coxa.bezierCurveTo(-140, -36, -150, -14, -120, -8);
    coxa.lineTo(-84, -8);
    coxa.bezierCurveTo(-72, -6, -72, 4, -86, 4);
    coxa.lineTo(-220, 4);
    coxa.bezierCurveTo(-256, 0, -276, -36, -268, -70);
    coxa.closePath();
    k.save();
    k.clip(corpo);
    gravar(k, coxa, -200, -50, 110, 0.9, 3.4, 1.8, (px, py) => sombraOval(-205, -52, 72, 56, 0)(px, py) * 0.85, tinta, 0.35);
    k.restore();
    k.strokeStyle = tinta;
    k.lineWidth = 1.8;
    k.beginPath();
    k.moveTo(-160, -92);
    k.bezierCurveTo(-142, -62, -150, -30, -126, -10);
    k.stroke();
    const pataT = new Path2D();
    pataT.ellipse(-96, -4, 26, 10, 0, 0, 6.283);
    peca(k, pataT, [-122, -14, -70, 6], { cor: '#d0a468', tinta, sombra: () => 0.4, passo: 2.8, maxL: 1.3, traco: 1.8, obj });
    // a juba, do alto da cabeça ao peito e aos ombros
    k.save();
    k.translate(118, -192);
    jubaDeLeao(k, r, { baixo: 196, tinta, obj });
    k.restore();
    // a perna da frente de cá
    const p1 = pernaDeLeao(0, 0, 218);
    peca(k, p1, [30, -64, 240, 4], { cor: '#d0a46a', tinta, ang: 0.05, passo: 3.2, maxL: 1.7, sombra: (px, py) => 0.3 + (py + 40) / 60 + Math.max(0, (110 - px) / 200), cruzada: 0.75, traco: 2, obj, abaulado: 0.3 });
    dedosDeLeao(k, 0, 0, 218, tinta);
    // a cabeça de perfil, erguida, olhando para a frente (para a direita, antes do espelho)
    k.save();
    k.translate(118, -192);
    cabecaDeLeao(k, r, { tinta, obj });
    k.restore();
    k.restore();
  }

  // (12) Daniel na cova dos leões (Dn 6.17-23): em corte, como numa prancha de geologia. Em cima,
  // o chão com o capim, ao amanhecer; a pedra pesada e chata posta na boca da cova, assentada na
  // beirada, com a corda passada e os dois selos de barro (o anel do rei e o selo do reino,
  // 6.17) sobre a junta. Embaixo, as camadas da terra e da rocha; o poço estreito que se abre na
  // gruta, de paredes em hachura que acompanha a rocha e chão reto até a beirada da prancha. Lá
  // dentro, os dois leões, deitados e calmos, de boca fechada (6.22): um com a cabeça nas patas,
  // o outro de cabeça erguida. A luz vem de dentro da cova, não da pedra.
  function desenhoDaniel(k, W, H, obj) {
    const r = sorteio(6201);
    papelVelho(k, W, H, r, ['#fbeed2', '#efd7ae', '#d2b080'], [W * 0.8, 200]);
    // o céu do amanhecer, em linhas, com o sol nascendo à direita, em raios
    linhas(k, 0, 0, W, 230, 6, 1.1, (x, y) => 0.12 + (1 - y / 230) * 0.45 - Math.max(0, 0.3 - Math.hypot(x - 780, y - 230) / 500));
    k.strokeStyle = 'rgba(110,70,20,.55)';
    k.lineCap = 'round';
    for (let i = 0; i < 13; i++) {
      const a = Math.PI + (i / 12) * Math.PI;
      k.lineWidth = i % 2 ? 1.2 : 1.8;
      k.beginPath();
      k.moveTo(780 + Math.cos(a) * 48, 230 + Math.sin(a) * 48);
      k.lineTo(780 + Math.cos(a) * (i % 2 ? 80 : 110), 230 + Math.sin(a) * (i % 2 ? 80 : 110));
      k.stroke();
    }
    k.lineWidth = 2;
    k.beginPath();
    k.arc(780, 230, 38, Math.PI, 0);
    k.stroke();
    const fm = onda(r, 3, 0.012);
    const morro = pol([[-10, 236], ...Array.from({ length: 46 }, (_, i) => [i * 20, 204 + fm(i * 20) * 10]), [W + 10, 236]]);
    peca(k, morro, [0, 190, W, 236], { cor: '#e3cfa2', ang: -0.1, passo: 5, maxL: 1, sombra: () => 0.5, cruzada: 0.6, traco: 1.4 });
    // a terra em corte
    const sup = (x) => 238 + Math.sin(x * 0.012) * 4;
    const terra = pol([[-10, sup(-10)], ...Array.from({ length: 46 }, (_, i) => [i * 20, sup(i * 20)]), [W + 10, sup(W)], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#c4a272';
    k.fill(terra);
    const camadas = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (x) => sup(x) + 6 + i * 84 + Math.sin(x * 0.01 + i) * 12);
    hachuraEmFaixas(k, r, terra, 0, W, camadas.slice(0, 3), 6, 1.7, (x) => 0.3 + Math.abs(x - W / 2) / 1300, '#3a2810', { quebra: 0.04 });
    // embaixo da terra, a rocha, em facetas, onde a cova foi cavada
    const rochaY = (x) => sup(x) + 6 + 2 * 84 + Math.sin(x * 0.01 + 2) * 12;
    const rocha = pol([[-10, rochaY(-10)], ...Array.from({ length: 46 }, (_, i) => [i * 20, rochaY(i * 20)]), [W + 10, rochaY(W)], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#cdb38a';
    k.fill(rocha);
    rochaEmFacetas(k, r, rocha, [-10, 380, W + 10, H + 10], 96, 62, (x, y) => 0.3 + (y - 400) / 1200 + Math.abs(x - W / 2) / 2000, '#3a2810');
    k.strokeStyle = '#3a2810';
    k.lineWidth = 2;
    k.stroke(rocha);
    // a cova: o poço estreito e a gruta larga, de contorno de rocha, com o chão reto até a beirada
    const contorno = [[398, 244], [394, 300], [388, 350], [376, 392], [330, 418], [250, 430], [160, 452], [80, 486], [24, 530], [-20, 560],
      [-20, 772], [W + 20, 772], [W + 20, 556], [850, 520], [790, 470], [700, 440], [600, 424], [530, 404], [506, 360], [500, 300], [496, 244]];
    // a beirada de rocha, quebrada: pontos a cada 18 px, cada um puxado um pouco para dentro
    // ou para fora (o teto de pedra não é liso)
    const aspero = [];
    contorno.forEach((p, i) => {
      const q = contorno[(i + 1) % contorno.length];
      const n = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 18));
      for (let j = 0; j < n; j++) {
        const t = j / n;
        const chaoReto = p[1] >= 772 && q[1] >= 772;
        const parede = Math.abs(p[0]) > 900 || p[0] < -10 || p[0] > W + 10;
        const dj = chaoReto || parede ? 0 : (r() - 0.5) * 16;
        aspero.push([p[0] + (q[0] - p[0]) * t + dj * 0.6, p[1] + (q[1] - p[1]) * t + dj]);
      }
    });
    const cova = pol(aspero);
    // o fundo da gruta: a hachura cruzada, que se abre na luz do meio
    const luzDentro = (px, py) => Math.max(0, 1 - Math.hypot((px - 450) / 460, (py - 660) / 300));
    k.fillStyle = '#a8845a';
    k.fill(cova);
    gravar(k, cova, 444, 560, 520, 0.08, 5, 2.4, (px, py) => 0.05 + (1 - luzDentro(px, py)) ** 1.4 * 1.1, '#24170a', 0);
    gravar(k, cova, 444, 560, 520, 1.25, 5.6, 1.9, (px, py) => ((1 - luzDentro(px, py)) - 0.55) * 2, '#24170a', 0);
    k.save();
    k.clip(cova);
    k.globalCompositeOperation = 'screen';
    k.filter = 'blur(30px)';
    k.fillStyle = 'rgba(255,226,170,.35)';
    k.beginPath();
    k.ellipse(450, 650, 300, 160, 0, 0, 6.283);
    k.fill();
    k.restore();
    // as paredes: linhas que acompanham a rocha, por dentro da beirada, cada vez mais leves
    k.save();
    k.clip(cova);
    const teto = aspero.filter(([, b]) => b < 770);
    for (let d = 7; d < 64; d += 7) {
      k.strokeStyle = 'rgba(36,23,10,' + (0.85 - d / 80).toFixed(2) + ')';
      k.lineWidth = 2.2 - d / 40;
      k.beginPath();
      let ant = null;
      teto.forEach(([a2, b2], i) => {
        const q = teto[Math.min(i + 1, teto.length - 1)];
        const p0 = teto[Math.max(i - 1, 0)];
        const tx = q[0] - p0[0];
        const ty = q[1] - p0[1];
        const l = Math.hypot(tx, ty) || 1;
        const px = a2 - (ty / l) * d;
        const py = b2 + (tx / l) * d;
        if (ant && Math.hypot(px - ant[0], py - ant[1]) < 60) k.lineTo(px, py); else k.moveTo(px, py);
        ant = [px, py];
      });
      k.stroke();
    }
    k.restore();
    k.strokeStyle = '#1e1208';
    k.lineWidth = 3;
    k.stroke(cova);
    // o chão da gruta, reto até a beirada, de terra batida com pedrinhas
    const chaoG = pol([[-20, 772], [W + 20, 772], [W + 20, 792], [-20, 792]]);
    peca(k, chaoG, [-20, 772, W + 20, 792], { cor: '#8a6a44', tinta: '#24170a', ang: 0, passo: 3.4, maxL: 1.6, sombra: () => 0.6, traco: 2 });
    for (let i = 0; i < 18; i++) {
      const p = seixo(r, 30 + r() * (W - 60), 768 + r() * 6, 5 + r() * 8, 3 + r() * 3, 0, 0.2);
      peca(k, p, [0, 760, W, 780], { cor: '#b89a70', tinta: '#24170a', sombra: () => 0.45, passo: 2.4, maxL: 1, traco: 1.4 });
    }
    // a luz fraca da manhã pela fresta, na beirada da pedra, descendo pelo poço
    k.save();
    k.clip(cova);
    k.strokeStyle = 'rgba(255,236,190,.45)';
    k.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      k.lineWidth = 1.4;
      k.beginPath();
      k.moveTo(492 - i * 3, 246);
      k.lineTo(470 - i * 14, 420 + i * 6);
      k.stroke();
    }
    k.restore();
    // os dois leões: um com a cabeça nas patas (perfil), outro de cabeça erguida
    leaoDeitado(k, r, 150, 772, 0.84, obj);
    leaoAtento(k, r, 622, 774, 0.86, obj);
    // o capim na beirada de cima
    for (const x of [40, 140, 250, 330, 580, 650, 760, 850]) capim(k, r, x, sup(x) + 2, 22, 7);
    // a pedra: a laje pesada, de face chata e beirada irregular, assentada na boca da cova
    const laje = pol([[326, 254], [316, 214], [332, 184], [470, 178], [562, 186], [580, 212], [574, 254], [450, 260]]);
    sombraNoChao(k, laje, 10, 6, 8, 0.45);
    peca(k, laje, [316, 178, 580, 260], { cor: '#cbb994', ang: 0.55, passo: 3.8, maxL: 2, sombra: (px, py) => 0.25 + (py - 192) / 120 + (px - 318) / 900, cruzada: 0.62, traco: 2.6, obj });
    const topo = pol([[316, 214], [332, 184], [470, 178], [562, 186], [580, 212], [470, 204]]);
    peca(k, topo, [316, 178, 580, 214], { cor: '#ddcfae', ang: 0.1, passo: 4.6, maxL: 1.1, sombra: () => 0.2, traco: 1.6 });
    // as marcas do cinzel na face
    k.strokeStyle = 'rgba(43,33,18,.75)';
    k.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) {
      const px = 336 + r() * 220;
      const py = 214 + r() * 34;
      k.beginPath();
      k.moveTo(px, py);
      k.lineTo(px + 5, py + 7);
      k.stroke();
    }
    // a corda por cima da pedra, presa dos dois lados na rocha com os selos de barro
    cordao(k, bezier([306, 252], [326, 200], [566, 196], [590, 252], 30), 6, { cor: '#c9a86a', escuro: '#2a1c0e' });
    for (const [sx, marca] of [[310, 'anel'], [588, 'reino']]) {
      const selo = seixo(r, sx, 252, 14, 11, 0.2, 0.14);
      sombraNoChao(k, selo, 3, 3, 3, 0.5);
      peca(k, selo, [sx - 15, 240, sx + 15, 264], { cor: '#9a6646', tinta: '#2a1006', sombra: sombraOval(sx, 252, 14, 11, 0), passo: 2.6, maxL: 1.3, cruzada: 0.8, traco: 1.8, obj });
      k.strokeStyle = '#2a1006';
      k.lineWidth = 1.3;
      if (marca === 'anel') {
        k.beginPath();
        k.arc(sx, 251, 5.5, 0, 6.283);
        k.stroke();
        k.beginPath();
        k.arc(sx, 251, 2, 0, 6.283);
        k.stroke();
      } else {
        for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; k.beginPath(); k.moveTo(sx, 251); k.lineTo(sx + Math.cos(a) * 6, 251 + Math.sin(a) * 5); k.stroke(); }
      }
    }
    vinheta(k, W, H, 0.24);
  }

  // (11) Ester diante do rei (Et 5.1-2): o salão do trono em Susã, visto do pátio. As colunas
  // de capitel de touros; a sanefa de pano pesado em festões, com as borlas, e as cortinas
  // presas dos lados; o trono de ouro de espaldar cheio, em painéis com rosetas, a almofada e o
  // escabelo. O rei não aparece: o cetro de ouro vem estendido do braço do trono para a frente,
  // em escorço, e a ponta brilha acima do pé da escada, junto da barra bordada do vestido real
  // de Ester (5.1), que entra pelo canto. O piso é de mármore em quatro cores (1.6).
  function desenhoEster(k, W, H, obj) {
    const r = sorteio(6101);
    papelVelho(k, W, H, r, ['#f8ecd2', '#e9d4aa', '#c9a874'], [W * 0.5, 220]);
    const tx = 444;
    // a parede do salão, em linhas
    linhas(k, 0, 0, W, 470, 6, 1.4, (x, y) => 0.25 + Math.abs(x - tx) / 1400 - Math.max(0, 0.3 - Math.hypot(x - tx, y - 240) / 900));
    // as colunas de Susã: o fuste canelado e o capitel de dois touros, de costas um para o outro
    const touro = (cx, cy, s, obj2) => {
      k.save();
      k.translate(cx, cy);
      k.scale(s, 1);
      const corpo = new Path2D();
      corpo.moveTo(0, -14);
      corpo.bezierCurveTo(18, -20, 34, -20, 44, -8);
      corpo.bezierCurveTo(52, -14, 62, -14, 66, -4);
      corpo.lineTo(70, 6);
      corpo.bezierCurveTo(64, 10, 58, 10, 54, 6);
      corpo.lineTo(50, 18);
      corpo.lineTo(54, 30);
      corpo.lineTo(44, 30);
      corpo.lineTo(40, 16);
      corpo.lineTo(26, 20);
      corpo.lineTo(28, 30);
      corpo.lineTo(18, 30);
      corpo.lineTo(14, 18);
      corpo.lineTo(0, 18);
      corpo.closePath();
      peca(k, corpo, [0, -20, 70, 30], { cor: '#e6d8b4', ang: 0.8, passo: 3.2, maxL: 1.4, sombra: (x, y) => 0.2 + (y + 20) / 80, cruzada: 0.8, traco: 1.8, obj: obj2 });
      k.strokeStyle = SEPIA;
      k.lineWidth = 2;
      k.beginPath();
      k.moveTo(52, -10);
      k.quadraticCurveTo(52, -26, 62, -28);
      k.stroke();
      k.fillStyle = SEPIA;
      k.beginPath();
      k.arc(60, -4, 1.8, 0, 6.283);
      k.fill();
      k.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) { k.beginPath(); k.arc(36 + i * 3, -6 + i * 4, 4, 2.5, 4.5); k.stroke(); }
      k.restore();
    };
    for (const cx of [86, 802]) {
      const fuste = pol([[cx - 30, 130], [cx + 30, 130], [cx + 34, 470], [cx - 34, 470]]);
      peca(k, fuste, [cx - 34, 130, cx + 34, 470], { cor: '#efe4ca', ang: Math.PI / 2, passo: 4, maxL: 1.8, sombra: (x) => 0.1 + Math.abs(x - cx + 10) / 46, cruzada: 0.8, traco: 2.2 });
      k.strokeStyle = 'rgba(43,33,18,.55)';
      k.lineWidth = 1.4;
      for (let x = cx - 22; x <= cx + 22; x += 11) { k.beginPath(); k.moveTo(x, 138); k.lineTo(x + (x - cx) * 0.1, 466); k.stroke(); }
      const colar = pol([[cx - 40, 110], [cx + 40, 110], [cx + 34, 132], [cx - 34, 132]]);
      peca(k, colar, [cx - 40, 110, cx + 40, 132], { cor: '#e2d2a8', ang: 0, passo: 3, maxL: 1.3, sombra: () => 0.4, traco: 2 });
      touro(cx, 90, 1, null);
      touro(cx, 90, -1, null);
      const abaco = pol([[cx - 76, 54], [cx + 76, 54], [cx + 76, 62], [cx - 76, 62]]);
      peca(k, abaco, [cx - 76, 54, cx + 76, 62], { cor: '#d8c69c', ang: 0, passo: 3, maxL: 1, sombra: () => 0.4, traco: 1.8 });
    }
    // o trono: o espaldar alto e cheio, de ouro, em painéis entalhados, com a crista no alto
    const esp = pol([[tx - 104, 340], [tx - 104, 132], [tx - 80, 112], [tx - 40, 106], [tx, 88], [tx + 40, 106], [tx + 80, 112], [tx + 104, 132], [tx + 104, 340]]);
    sombraNoChao(k, esp, 14, 10, 12, 0.4);
    peca(k, esp, [tx - 104, 88, tx + 104, 340], { cor: '#d9a84a', tinta: '#2e1c04', ang: Math.PI / 2, passo: 3.8, maxL: 1.7, sombra: (x, y) => 0.32 + (x - tx) / 420 + (y - 88) / 1200, cruzada: 0.7, traco: 2.4, obj });
    for (const [x0, y0, x1, y1] of [[tx - 82, 140, tx - 8, 236], [tx + 8, 140, tx + 82, 236], [tx - 82, 250, tx + 82, 320]]) {
      const pn = pol([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
      peca(k, pn, [x0, y0, x1, y1], { cor: '#c8963c', tinta: '#2e1c04', ang: 0.6, passo: 3.2, maxL: 1.3, sombra: (x, y) => 0.45 + (y - y0) / (y1 - y0) * 0.2, cruzada: 0.8, traco: 1.8 });
      k.strokeStyle = 'rgba(255,236,170,.75)';
      k.lineWidth = 1.6;
      k.beginPath();
      k.moveTo(x0 + 2, y1 - 2);
      k.lineTo(x0 + 2, y0 + 2);
      k.lineTo(x1 - 2, y0 + 2);
      k.stroke();
      // a roseta no meio do painel
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283;
        const p = new Path2D();
        p.ellipse(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 7, 3.4, a, 0, 6.283);
        k.fillStyle = '#f0c860';
        k.fill(p);
        k.strokeStyle = '#2e1c04';
        k.lineWidth = 1.1;
        k.stroke(p);
      }
      k.beginPath();
      k.arc(cx, cy, 4, 0, 6.283);
      k.fillStyle = '#2e1c04';
      k.fill();
    }
    for (const s of [-1, 0, 1]) {
      const b = new Path2D();
      b.arc(tx + s * 80, s ? 106 : 80, 11, 0, 6.283);
      peca(k, b, [tx + s * 80 - 11, 69, tx + s * 80 + 11, 117], { cor: '#f0c860', tinta: '#2e1c04', sombra: sombraOval(tx + s * 80, s ? 106 : 80, 11, 11, 0), passo: 3, maxL: 1.4, traco: 2, obj });
    }
    // o dossel: a sanefa de pano pesado, em festões, com as borlas, e as cortinas dos lados,
    // presas; a sombra dele cai sobre o espaldar
    k.save();
    k.clip(esp);
    const gs = new Path2D();
    gs.rect(tx - 110, 80, 220, 60);
    gravar(k, gs, tx, 110, 120, 0.3, 3.6, 1.8, (x, y) => 0.9 - (y - 80) / 60, '#2e1c04', 0);
    k.restore();
    for (const s of [-1, 1]) {
      const cort = new Path2D();
      cort.moveTo(tx + s * 150, 30);
      cort.bezierCurveTo(tx + s * 150, 140, tx + s * 128, 220, tx + s * 140, 300);
      cort.bezierCurveTo(tx + s * 160, 330, tx + s * 186, 330, tx + s * 196, 300);
      cort.bezierCurveTo(tx + s * 210, 210, tx + s * 236, 120, tx + s * 250, 30);
      cort.closePath();
      peca(k, cort, [tx - 250, 30, tx + 250, 330], { cor: '#7a2e2a', tinta: '#1e0806', ang: Math.PI / 2 - s * 0.08, passo: 3.8, maxL: 2, sombra: (x) => 0.45 + Math.sin((x - tx) * 0.12) * 0.25, cruzada: 0.7, traco: 2.2 });
      const amarra = pol([[tx + s * 136, 250], [tx + s * 200, 246], [tx + s * 200, 260], [tx + s * 136, 264]]);
      peca(k, amarra, [tx - 200, 246, tx + 200, 264], { cor: '#d9a84a', tinta: '#2e1c04', sombra: () => 0.4, passo: 3, maxL: 1, traco: 1.6 });
    }
    const sanefa = new Path2D();
    sanefa.moveTo(tx - 280, -10);
    sanefa.lineTo(tx + 280, -10);
    sanefa.lineTo(tx + 280, 40);
    for (let i = 4; i > 0; i--) {
      const x1 = tx - 280 + i * 140;
      const x0 = x1 - 140;
      sanefa.bezierCurveTo(x1 - 30, 100, x0 + 30, 100, x0, 40);
    }
    sanefa.closePath();
    sombraNoChao(k, sanefa, 0, 14, 10, 0.35);
    peca(k, sanefa, [tx - 280, -10, tx + 280, 100], { cor: '#86332c', tinta: '#1e0806', ang: 0.05, passo: 3.6, maxL: 1.8, sombra: (x, y) => 0.3 + y / 160 + Math.abs(((x - tx + 280) % 140) - 70) / 200, cruzada: 0.7, traco: 2.4 });
    k.save();
    k.clip(sanefa);
    for (let i = 0; i < 4; i++) {
      const x0 = tx - 280 + i * 140;
      for (let j = 1; j < 4; j++) {
        k.strokeStyle = 'rgba(30,8,6,.6)';
        k.lineWidth = 1.6;
        k.beginPath();
        k.moveTo(x0 + j * 8, 40 + j * 4);
        k.bezierCurveTo(x0 + 34, 92 - j * 14, x0 + 106, 92 - j * 14, x0 + 140 - j * 8, 40 + j * 4);
        k.stroke();
      }
    }
    k.strokeStyle = '#d9a84a';
    k.lineWidth = 6;
    k.beginPath();
    k.moveTo(tx - 280, 40);
    k.lineTo(tx + 280, 40);
    k.stroke();
    k.restore();
    for (let i = 0; i <= 4; i++) {
      const x = tx - 280 + i * 140;
      k.strokeStyle = '#2e1c04';
      k.lineWidth = 2;
      k.beginPath();
      k.moveTo(x, 40);
      k.lineTo(x, 64);
      k.stroke();
      const borla = pol([[x - 3, 64], [x + 3, 64], [x + 9, 92], [x - 9, 92]]);
      peca(k, borla, [x - 9, 64, x + 9, 92], { cor: '#d9a84a', tinta: '#2e1c04', ang: Math.PI / 2, passo: 2.4, maxL: 1, sombra: () => 0.4, traco: 1.6 });
    }
    // o assento com a almofada, os braços e os pés de garra
    for (const s of [-1, 1]) {
      const pe = pol([[tx + s * 104 - 12, 360], [tx + s * 104 + 12, 360], [tx + s * 104 + 10, 418], [tx + s * 104 + 18, 430], [tx + s * 104 - 18, 430], [tx + s * 104 - 10, 418]]);
      peca(k, pe, [tx + s * 104 - 18, 360, tx + s * 104 + 18, 430], { cor: '#c99a3e', tinta: '#2e1c04', sombra: () => 0.4, passo: 3, maxL: 1.2, traco: 2, obj });
    }
    const assento = pol([[tx - 124, 340], [tx + 124, 340], [tx + 128, 364], [tx - 128, 364]]);
    peca(k, assento, [tx - 128, 340, tx + 128, 364], { cor: '#c89436', tinta: '#2e1c04', ang: 0, passo: 3, maxL: 1.4, sombra: () => 0.5, traco: 2.2, obj });
    const almofada = new Path2D();
    almofada.moveTo(tx - 98, 340);
    almofada.bezierCurveTo(tx - 102, 310, tx - 60, 312, tx, 314);
    almofada.bezierCurveTo(tx + 60, 312, tx + 102, 310, tx + 98, 340);
    almofada.closePath();
    peca(k, almofada, [tx - 102, 310, tx + 102, 340], { cor: '#8a3a30', tinta: '#1e0806', ang: 0.1, passo: 3.2, maxL: 1.5, sombra: (x, y) => 0.25 + (y - 310) / 50 + (x - tx) / 600, cruzada: 0.8, traco: 2, obj });
    for (const s of [-1, 1]) {
      const braco = pol([[tx + s * 104, 300], [tx + s * 150, 296], [tx + s * 156, 310], [tx + s * 150, 344], [tx + s * 104, 344]]);
      peca(k, braco, [tx - 156, 296, tx + 156, 344], { cor: '#d9a84a', tinta: '#2e1c04', ang: 0, passo: 3.2, maxL: 1.4, sombra: (x, y) => 0.25 + (y - 296) / 80, traco: 2.2, obj });
      const bola = new Path2D();
      bola.arc(tx + s * 154, 300, 12, 0, 6.283);
      peca(k, bola, [tx + s * 154 - 12, 288, tx + s * 154 + 12, 312], { cor: '#f0c860', tinta: '#2e1c04', sombra: sombraOval(tx + s * 154, 300, 12, 12, 0), passo: 3, maxL: 1.4, traco: 2, obj });
    }
    // o estrado e os três degraus de mármore
    for (let i = 0; i < 4; i++) {
      const y0 = 430 + i * 52;
      const m = 190 + i * 56;
      const piso = pol([[tx - m, y0], [tx + m, y0], [tx + m + 22, y0 + 18], [tx - m - 22, y0 + 18]]);
      const espelho = pol([[tx - m - 22, y0 + 18], [tx + m + 22, y0 + 18], [tx + m + 22, y0 + 52], [tx - m - 22, y0 + 52]]);
      peca(k, piso, [tx - m - 22, y0, tx + m + 22, y0 + 18], { cor: '#efe4c8', ang: 0, passo: 4.4, maxL: 1, sombra: (x) => 0.15 + Math.abs(x - tx) / 1600, traco: 2 });
      peca(k, espelho, [tx - m - 22, y0 + 18, tx + m + 22, y0 + 52], { cor: '#d6c6a0', ang: 0, passo: 3.6, maxL: 1.8, sombra: (x) => 0.4 + Math.abs(x - tx) / 1400, cruzada: 0.8, traco: 2 });
      // os veios do mármore
      k.save();
      k.clip(espelho);
      k.strokeStyle = 'rgba(43,33,18,.4)';
      k.lineWidth = 1;
      for (let j = 0; j < 3; j++) { const x = tx - m + r() * m * 2; k.beginPath(); k.moveTo(x, y0 + 18); k.bezierCurveTo(x + 20, y0 + 30, x - 10, y0 + 40, x + 30, y0 + 52); k.stroke(); }
      k.restore();
    }
    // o escabelo diante do trono
    const esc = pol([[tx - 70, 410], [tx + 70, 410], [tx + 76, 432], [tx - 76, 432]]);
    peca(k, esc, [tx - 76, 410, tx + 76, 432], { cor: '#c99a3e', tinta: '#2e1c04', ang: 0, passo: 3, maxL: 1.3, sombra: () => 0.45, traco: 2, obj });
    // o piso do pátio: mármore em quatro cores (preta, vermelha, branca e amarela, Et 1.6), em
    // ladrilhos com o losango de outra cor dentro e o disco no meio, em perspectiva
    const Y0 = 638;
    const piso = new Path2D();
    piso.rect(-10, Y0, W + 20, H);
    k.fillStyle = '#e4d6b4';
    k.fill(piso);
    k.save();
    k.clip(piso);
    const cores = ['#3d3530', '#a3554a', '#efe6d2', '#d6b460'];
    const fy = (i) => Y0 + i * 30 + i * i * 4.2;
    const esc0 = (y) => 1 + (y - Y0) / 200;
    for (let i = 0; i < 7; i++) {
      const y0 = fy(i);
      const y1 = fy(i + 1);
      for (let j = -9; j < 10; j++) {
        const xa = (y, jj) => tx + (jj - 0.5) * 78 * esc0(y);
        const q = [[xa(y0, j), y0], [xa(y0, j + 1), y0], [xa(y1, j + 1), y1], [xa(y1, j), y1]];
        const c1 = cores[(i + j * 3 + 40) % 4];
        const c2 = cores[(i * 3 + j + 42) % 4];
        peca(k, pol(q), [q[3][0], y0, q[2][0], y1], { cor: c1, ang: 0.6, passo: 4.4, maxL: 1, sombra: () => 0.3, cruzada: 1, traco: 1.4 });
        const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const los = pol([mid(q[0], q[1]), mid(q[1], q[2]), mid(q[2], q[3]), mid(q[3], q[0])]);
        peca(k, los, [q[3][0], y0, q[2][0], y1], { cor: c2, ang: -0.6, passo: 4.4, maxL: 0.9, sombra: () => 0.25, cruzada: 1, traco: 1.2 });
        const cc = mid(mid(q[0], q[2]), mid(q[1], q[3]));
        const disco = new Path2D();
        disco.ellipse(cc[0], cc[1], (q[1][0] - q[0][0]) * 0.13, (y1 - y0) * 0.13, 0, 0, 6.283);
        k.fillStyle = cores[(i + j + 41) % 4];
        k.fill(disco);
        k.strokeStyle = SEPIA;
        k.lineWidth = 1;
        k.stroke(disco);
      }
    }
    k.restore();
    // a barra do vestido real de Ester, entrando pelo canto (só o pano, bordado na beirada)
    const barra = new Path2D();
    barra.moveTo(600, H + 10);
    barra.bezierCurveTo(620, 740, 680, 676, 756, 660);
    barra.bezierCurveTo(810, 650, 860, 656, W + 10, 640);
    barra.lineTo(W + 10, H + 10);
    barra.closePath();
    sombraNoChao(k, barra, -14, -6, 10, 0.4);
    peca(k, barra, [600, 640, W + 10, H + 10], { cor: '#6a2f4a', tinta: '#1e0a14', ang: 1.1, passo: 3.6, maxL: 1.8, sombra: (x, y) => 0.3 + (y - 640) / 300, cruzada: 0.7, traco: 2.2, obj });
    k.save();
    k.clip(barra);
    const borda = bezier([600, H + 10], [620, 740], [680, 676], [756, 660], 30).concat(bezier([756, 660], [810, 650], [860, 656], [W + 10, 640], 20));
    for (const [d, cor, lw] of [[10, '#d9a84a', 8], [22, '#d9a84a', 3]]) {
      k.strokeStyle = cor;
      k.lineWidth = lw;
      k.beginPath();
      borda.forEach(([x, y], i) => (i ? k.lineTo(x + d * 0.3, y + d) : k.moveTo(x + d * 0.3, y + d)));
      k.stroke();
    }
    k.fillStyle = '#2e1c04';
    borda.forEach(([x, y], i) => { if (i % 3) return; k.beginPath(); k.arc(x + 3, y + 10, 2, 0, 6.283); k.fill(); });
    k.strokeStyle = 'rgba(26,12,30,.7)';
    k.lineWidth = 1.6;
    for (const [x0, y0] of [[690, 730], [780, 700], [850, 690]]) { k.beginPath(); k.moveTo(x0, y0); k.quadraticCurveTo(x0 + 10, y0 + 40, x0 - 6, H + 10); k.stroke(); }
    k.restore();
    // o cetro de ouro estendido: sai da mão do rei, sobre o braço direito do trono, e vem para a
    // frente e para baixo, em escorço (mais grosso na ponta, que está mais perto); a ponta
    // brilha logo acima do pé da escada, junto da barra do vestido
    const c0 = [tx + 160, 300];
    const c1 = [706, 486];
    const ang = Math.atan2(c1[1] - c0[1], c1[0] - c0[0]);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const vara = pol([[c0[0] + nx * 5, c0[1] + ny * 5], [c1[0] + nx * 14, c1[1] + ny * 14], [c1[0] - nx * 14, c1[1] - ny * 14], [c0[0] - nx * 5, c0[1] - ny * 5]]);
    sombraNoChao(k, vara, 30, 150, 14, 0.25);
    peca(k, vara, [Math.min(c0[0], c1[0]), c0[1], Math.max(c0[0], c1[0]), c1[1]], { cor: '#e6b64e', tinta: '#3a2404', ang, passo: 2.8, maxL: 1.5, sombra: (x, y) => 0.25 + ((x - c0[0]) * nx + (y - c0[1]) * ny) / 10 * 0.3, cruzada: 1, traco: 2.2, obj });
    k.strokeStyle = 'rgba(255,248,214,.85)';
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(c0[0] - nx * 2, c0[1] - ny * 2);
    k.lineTo(c1[0] - nx * 5, c1[1] - ny * 5);
    k.stroke();
    for (const [t, w] of [[0.3, 9], [0.62, 13], [0.92, 17]]) {
      const x = c0[0] + (c1[0] - c0[0]) * t;
      const y = c0[1] + (c1[1] - c0[1]) * t;
      const anel = pol([[x + nx * w - Math.cos(ang) * 4, y + ny * w - Math.sin(ang) * 4], [x + nx * w + Math.cos(ang) * 4, y + ny * w + Math.sin(ang) * 4], [x - nx * w + Math.cos(ang) * 4, y - ny * w + Math.sin(ang) * 4], [x - nx * w - Math.cos(ang) * 4, y - ny * w - Math.sin(ang) * 4]]);
      peca(k, anel, [x - w, y - w, x + w, y + w], { cor: '#d19a32', tinta: '#3a2404', sombra: () => 0.45, passo: 2.4, maxL: 1.1, traco: 1.8, obj });
    }
    // a ponta: o botão de ouro canelado, com o brilho em raios gravados
    const pc = [c1[0] + Math.cos(ang) * 24, c1[1] + Math.sin(ang) * 24];
    k.strokeStyle = 'rgba(170,110,10,.65)';
    k.lineCap = 'round';
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * 6.283 + 0.1;
      k.lineWidth = i % 2 ? 1.3 : 2;
      k.beginPath();
      k.moveTo(pc[0] + Math.cos(a) * 50, pc[1] + Math.sin(a) * 50);
      k.lineTo(pc[0] + Math.cos(a) * (i % 2 ? 70 : 92), pc[1] + Math.sin(a) * (i % 2 ? 70 : 92));
      k.stroke();
    }
    const ponta = new Path2D();
    ponta.ellipse(pc[0], pc[1], 38, 34, ang, 0, 6.283);
    peca(k, ponta, [pc[0] - 38, pc[1] - 38, pc[0] + 38, pc[1] + 38], { cor: '#f4cc66', tinta: '#3a2404', sombra: sombraOval(pc[0], pc[1], 38, 34, ang), passo: 3, maxL: 1.8, cruzada: 0.8, traco: 2.4, obj });
    k.strokeStyle = 'rgba(58,36,4,.7)';
    k.lineWidth = 1.4;
    for (const d of [-12, 0, 12]) { k.beginPath(); k.ellipse(pc[0], pc[1], 36, Math.abs(d) * 1.8 + 4, ang + Math.PI / 2, 0, 6.283); k.stroke(); }
    k.fillStyle = 'rgba(255,250,224,.9)';
    k.beginPath();
    k.ellipse(pc[0] - 9, pc[1] - 9, 7, 4, -0.6, 0, 6.283);
    k.fill();
    vinheta(k, W, H, 0.24);
  }

  // (13) A multidão de testemunhas (Hb 12.1), a capa do álbum: o estádio visto da largada. A
  // soleira de pedra com os sulcos para os pés (a balbis dos estádios antigos) e as raias que
  // sobem a pista até a chegada, onde a coroa de louros está deitada sobre um pedestal largo.
  // Nas arquibancadas de pedra escura, em gravura sépia, a multidão é uma nuvem de luz: em cada
  // lugar, uma lamparina acesa, fileira por fileira, diminuindo ao longe e dando a volta na curva
  // do fundo ("temos uma multidão de testemunhas ao nosso redor"); nenhuma figura de gente.
  // Diante da largada, só a pista com a poeira e umas pedrinhas.
  function desenhoTestemunhas(k, W, H, obj) {
    const r = sorteio(6301);
    const F = [444, 318];
    papelVelho(k, W, H, r, ['#fbf1d6', '#f0dcae', '#cfae72'], F);
    // o céu: linhas gravadas, mais leves perto da chegada, e os raios finos que saem dela
    linhas(k, 0, 0, W, F[1] + 40, 6, 1.3, (x, y) => 0.12 + Math.min(1, Math.hypot(x - F[0], (y - F[1]) * 1.6) / 700) * 0.6);
    k.save();
    k.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const a = Math.PI + 0.1 + (i / 39) * (Math.PI - 0.2);
      k.strokeStyle = 'rgba(110,70,14,' + (i % 3 ? 0.12 : 0.22) + ')';
      k.lineWidth = i % 3 ? 1.2 : 2;
      k.beginPath();
      k.moveTo(F[0] + Math.cos(a) * 140, F[1] - 40 + Math.sin(a) * 140);
      k.lineTo(F[0] + Math.cos(a) * 800, F[1] - 40 + Math.sin(a) * 800);
      k.stroke();
    }
    k.restore();
    // a perspectiva: t = 0 na chegada, t = 1 na borda de baixo; u = 0 na beira da pista, 1 no
    // alto da arquibancada
    const yT = (t) => F[1] + 30 + t * (H - F[1] - 30);
    const larg = (t) => 40 + t * 380;
    const altA = (t) => 60 + t * 420;
    const ponto = (lado, t, u) => [F[0] + lado * (larg(t) + (40 + t * 430) * u), yT(t) - altA(t) * u];
    const NF = 9;
    // as testemunhas em luz: em cada lugar da arquibancada, uma lamparina de barro acesa (o
    // corpo baixo, o bico, a chama), sem gente desenhada; de perto, a lamparina; de longe, só a
    // chama e o clarão. Fileira por fileira, elas enchem as arquibancadas como uma nuvem de luz.
    const lampada = (x, y, h) => {
      const gx = x + h * 0.42;
      const gy = y - h * 0.5;
      const gl = k.createRadialGradient(gx, gy, 0, gx, gy, h * 0.9);
      gl.addColorStop(0, 'rgba(255,230,160,.55)');
      gl.addColorStop(1, 'rgba(255,230,160,0)');
      k.fillStyle = gl;
      k.fillRect(gx - h, gy - h, h * 2, h * 2);
      if (h > 10) {
        const corpo = new Path2D();
        corpo.ellipse(x, y - h * 0.1, h * 0.3, h * 0.12, 0, 0, 6.283);
        corpo.moveTo(x + h * 0.22, y - h * 0.16);
        corpo.lineTo(x + h * 0.46, y - h * 0.17);
        corpo.lineTo(x + h * 0.44, y - h * 0.08);
        corpo.lineTo(x + h * 0.22, y - h * 0.05);
        k.fillStyle = '#9a6234';
        k.fill(corpo);
        k.strokeStyle = '#2e1c06';
        k.lineWidth = Math.max(0.6, h * 0.035);
        k.stroke(corpo);
        k.fillStyle = '#2e1c06';
        k.beginPath();
        k.ellipse(x - h * 0.04, y - h * 0.16, h * 0.08, h * 0.03, 0, 0, 6.283);
        k.fill();
      }
      const fx = x + h * 0.42;
      const fy = y - h * 0.17;
      const fh = h * (0.7 + r() * 0.16);
      const fl = h * 0.22;
      const ch = new Path2D();
      ch.moveTo(fx - fl / 2, fy);
      ch.bezierCurveTo(fx - fl * 0.7, fy - fh * 0.45, fx - fl * 0.1, fy - fh * 0.7, fx + fl * 0.15, fy - fh);
      ch.bezierCurveTo(fx + fl * 0.4, fy - fh * 0.6, fx + fl * 0.7, fy - fh * 0.35, fx + fl / 2, fy);
      ch.closePath();
      k.fillStyle = '#fff3c8';
      k.fill(ch);
      k.strokeStyle = '#a8661a';
      k.lineWidth = Math.max(0.5, h * 0.03);
      k.stroke(ch);
    };
    // as arquibancadas: degraus de pedra, cada um com o espelho escuro e o piso claro, e a
    // fileira de gente sentada em cada um
    for (const lado of [-1, 1]) {
      const todo = pol([ponto(lado, 0, 0), ponto(lado, 0, 1), ponto(lado, 1.3, 1), ponto(lado, 1.3, 0)]);
      k.fillStyle = '#b48a52';
      k.fill(todo);
      // os pisos (claros) e os espelhos (escuros) de todos os degraus, cada grupo numa forma só
      const pisos = new Path2D();
      const espelhos = new Path2D();
      const bordas = [];
      for (let d = 0; d < NF; d++) {
        const u0 = d / NF;
        const u1 = (d + 1) / NF;
        const um = u0 + (u1 - u0) * 0.45;
        const qe = [ponto(lado, 0, u0), ponto(lado, 0, um), ponto(lado, 1.3, um), ponto(lado, 1.3, u0)];
        const qp = [ponto(lado, 0, um), ponto(lado, 0, u1), ponto(lado, 1.3, u1), ponto(lado, 1.3, um)];
        espelhos.addPath(pol(qe));
        pisos.addPath(pol(qp));
        bordas.push(um);
      }
      const cx0 = lado > 0 ? F[0] : -10;
      const cx1 = lado > 0 ? W + 10 : F[0];
      peca(k, pisos, [cx0, F[1] - 60, cx1, H + 10], { cor: '#8c6438', tinta: '#22140a', ang: lado > 0 ? 0.62 : Math.PI - 0.62, passo: 3.6, maxL: 1.5, sombra: () => 0.5, cruzada: 0.7, traco: 0 });
      peca(k, espelhos, [cx0, F[1] - 60, cx1, H + 10], { cor: '#5e3e20', tinta: '#1a0e04', ang: 0, passo: 3, maxL: 2, sombra: (x) => 0.65 + Math.abs(x - F[0]) / 3000, cruzada: 0.5, traco: 0 });
      k.strokeStyle = '#2e1c06';
      k.lineWidth = 1.4;
      for (const um of bordas) {
        k.beginPath();
        k.moveTo(...ponto(lado, 0, um));
        k.lineTo(...ponto(lado, 1.3, um));
        k.stroke();
      }
      // a gente, do fundo para a frente, fileira por fileira (de cima para baixo)
      for (let d = NF - 1; d >= 0; d--) {
        const u = (d + 0.5) / NF;
        let t = 0.03 + r() * 0.02;
        while (t < 1.3) {
          const h = (altA(t) / NF) * (0.95 + r() * 0.25);
          const [x, y] = ponto(lado, t, u + 0.02);
          const px = x + (r() - 0.5) * h * 0.2;
          const py = y + (r() - 0.5) * h * 0.08;
          lampada(px, py, h);
          t += (h * (0.62 + r() * 0.2)) / (380 + 430 * u);
        }
      }
      k.strokeStyle = '#2e1c06';
      k.lineWidth = 2.4;
      k.stroke(todo);
    }
    // a curva do fundo, atrás da chegada, também cheia
    const curva = new Path2D();
    curva.moveTo(...ponto(-1, 0, 1));
    curva.quadraticCurveTo(F[0], F[1] - 50, ...ponto(1, 0, 1));
    curva.lineTo(...ponto(1, 0, 0));
    curva.quadraticCurveTo(F[0], F[1] + 4, ...ponto(-1, 0, 0));
    curva.closePath();
    peca(k, curva, [F[0] - 160, F[1] - 50, F[0] + 160, F[1] + 30], { cor: '#7a5430', tinta: '#22140a', ang: 0, passo: 3, maxL: 1.6, sombra: () => 0.55, cruzada: 0.6, traco: 2 });
    for (let d = 3; d >= 0; d--) {
      const f = (d + 0.5) / 4;
      for (let a = 0.05; a < 0.96; a += 0.034) {
        const ax = ponto(-1, 0, f)[0] + (ponto(1, 0, f)[0] - ponto(-1, 0, f)[0]) * a;
        const ay = F[1] + 30 - f * 60 - Math.sin(a * Math.PI) * 14 * f - 6;
        const px = ax + (r() - 0.5) * 3;
        lampada(px, ay, 12 + r() * 2);
      }
    }
    // a pista de areia batida, em linhas que se apertam ao longe, e as raias
    const pista = pol([[F[0] - larg(0), yT(0)], [F[0] + larg(0), yT(0)], [F[0] + larg(1.3), yT(1.3)], [F[0] - larg(1.3), yT(1.3)]]);
    k.fillStyle = '#ecd6a4';
    k.fill(pista);
    k.save();
    k.clip(pista);
    k.lineCap = 'round';
    for (let t = 0.02; t < 1.3; t *= 1.09) {
      const y = yT(t);
      k.strokeStyle = 'rgba(70,44,10,' + Math.min(0.6, 0.15 + t * 0.4).toFixed(2) + ')';
      k.lineWidth = 0.6 + t * 1.4;
      let x = F[0] - larg(t);
      while (x < F[0] + larg(t)) {
        const c = 20 + r() * 80 * (0.3 + t);
        k.beginPath();
        k.moveTo(x, y + (r() - 0.5) * 2);
        k.lineTo(x + c, y + (r() - 0.5) * 2);
        k.stroke();
        x += c + 10 + r() * 30 * t;
      }
    }
    k.strokeStyle = 'rgba(255,250,232,.9)';
    for (let i = 1; i < 6; i++) {
      const f = (i / 6) * 2 - 1;
      k.lineWidth = 2;
      k.beginPath();
      k.moveTo(F[0] + f * larg(0.12), yT(0.12));
      k.lineTo(F[0] + f * larg(1.3), yT(1.3));
      k.stroke();
    }
    k.restore();
    k.strokeStyle = '#2e1c06';
    k.lineWidth = 2.4;
    for (const lado of [-1, 1]) { k.beginPath(); k.moveTo(F[0] + lado * larg(0), yT(0)); k.lineTo(F[0] + lado * larg(1.3), yT(1.3)); k.stroke(); }
    // a linha de chegada e, sobre ela, o pedestal largo com a coroa de louros deitada
    const tc = 0.12;
    const yc = yT(tc);
    k.strokeStyle = 'rgba(255,253,240,.95)';
    k.lineWidth = 5;
    k.beginPath();
    k.moveTo(F[0] - larg(tc), yc);
    k.lineTo(F[0] + larg(tc), yc);
    k.stroke();
    const P = { x: F[0], y: yc + 6, w: 118, h: 52, p: 16 };
    sombraNoChao(k, pol([[P.x - P.w, P.y], [P.x + P.w, P.y], [P.x + P.w + 40, P.y + 16], [P.x - P.w + 20, P.y + 16]]), 0, 0, 6, 0.4);
    const frente = pol([[P.x - P.w, P.y], [P.x + P.w, P.y], [P.x + P.w, P.y - P.h], [P.x - P.w, P.y - P.h]]);
    peca(k, frente, [P.x - P.w, P.y - P.h, P.x + P.w, P.y], { cor: '#e6d6b0', tinta: '#2e1c06', ang: 0, passo: 3, maxL: 1.6, sombra: (x, y) => 0.4 + (x - P.x + P.w) / 500 + (y - P.y + P.h) / 300, cruzada: 0.75, traco: 2.2, obj });
    k.strokeStyle = '#2e1c06';
    k.lineWidth = 1.4;
    for (const dy of [10, P.h - 10]) { k.beginPath(); k.moveTo(P.x - P.w, P.y - dy); k.lineTo(P.x + P.w, P.y - dy); k.stroke(); }
    const tampo = pol([[P.x - P.w - 8, P.y - P.h], [P.x + P.w + 8, P.y - P.h], [P.x + P.w - 10, P.y - P.h - P.p], [P.x - P.w + 10, P.y - P.h - P.p]]);
    peca(k, tampo, [P.x - P.w - 8, P.y - P.h - P.p, P.x + P.w + 8, P.y - P.h], { cor: '#f6ecd0', tinta: '#2e1c06', ang: 0, passo: 4.6, maxL: 0.9, sombra: () => 0.2, cruzada: 1, traco: 2, obj });
    // a coroa: o aro de louro deitado (uma elipse larga), as folhas aos pares, a fita
    const cc = [P.x, P.y - P.h - P.p * 0.5 - 4];
    const RX = 84;
    const RY = 24;
    k.save();
    k.lineCap = 'round';
    const folhasDe = (de, ate) => {
      for (let i = 0; i <= 26; i++) {
        const a = de + ((ate - de) * i) / 26;
        const x = cc[0] + Math.cos(a) * RX;
        const y = cc[1] + Math.sin(a) * RY;
        const tg = Math.atan2(Math.cos(a) * RY, -Math.sin(a) * RX);
        for (const s of [-1, 1]) {
          const fa = tg + s * 0.75;
          const folha = new Path2D();
          folha.ellipse(x + Math.cos(fa) * 11, y + Math.sin(fa) * 7, 13, 5, fa, 0, 6.283);
          k.fillStyle = s > 0 ? '#8a9640' : '#66722c';
          k.fill(folha);
          k.strokeStyle = '#26280a';
          k.lineWidth = 1.4;
          k.stroke(folha);
          k.lineWidth = 0.8;
          k.beginPath();
          k.moveTo(x + Math.cos(fa) * 2, y + Math.sin(fa) * 1.4);
          k.lineTo(x + Math.cos(fa) * 20, y + Math.sin(fa) * 13);
          k.stroke();
        }
      }
    };
    // a metade de trás primeiro, depois a da frente (por cima)
    k.strokeStyle = '#3a3a10';
    k.lineWidth = 3;
    k.beginPath();
    k.ellipse(cc[0], cc[1], RX, RY, 0, 0, 6.283);
    k.stroke();
    folhasDe(Math.PI, Math.PI * 2);
    folhasDe(0, Math.PI);
    k.restore();
    marcar(k, obj, (() => { const p = new Path2D(); p.ellipse(cc[0], cc[1], RX + 18, RY + 14, 0, 0, 6.283); return p; })());
    // a fita amarrada na frente, caindo pela beirada do pedestal
    cordao(k, bezier([cc[0] - 4, cc[1] + RY], [cc[0] - 20, cc[1] + RY + 20], [cc[0] - 10, P.y - P.h + 18], [cc[0] - 24, P.y - P.h + 40], 14), 6, { cor: '#c23a2a', escuro: '#3a0e08', luz: 'rgba(255,200,170,.6)' });
    cordao(k, bezier([cc[0] + 4, cc[1] + RY], [cc[0] + 18, cc[1] + RY + 22], [cc[0] + 30, P.y - P.h + 20], [cc[0] + 22, P.y - P.h + 44], 14), 6, { cor: '#c23a2a', escuro: '#3a0e08', luz: 'rgba(255,200,170,.6)' });
    // a largada: a soleira de pedra de lado a lado, com os dois sulcos para os pés
    const tl = 0.62;
    const t2 = 0.71;
    const laje = pol([[F[0] - larg(tl), yT(tl)], [F[0] + larg(tl), yT(tl)], [F[0] + larg(t2), yT(t2)], [F[0] - larg(t2), yT(t2)]]);
    peca(k, laje, [F[0] - larg(t2), yT(tl), F[0] + larg(t2), yT(t2)], { cor: '#efe2c0', tinta: '#2e1c06', ang: 0.5, passo: 4.4, maxL: 1.4, sombra: (x, y) => 0.15 + (y - yT(tl)) / 120 + Math.abs(x - F[0]) / 1600, cruzada: 0.8, traco: 2.4, obj });
    // a frente da soleira: a espessura da pedra, em sombra
    const espelhoL = pol([[F[0] - larg(t2), yT(t2)], [F[0] + larg(t2), yT(t2)], [F[0] + larg(t2) + 3, yT(t2) + 14], [F[0] - larg(t2) - 3, yT(t2) + 14]]);
    peca(k, espelhoL, [F[0] - larg(t2) - 3, yT(t2), F[0] + larg(t2) + 3, yT(t2) + 14], { cor: '#cdbb92', tinta: '#2e1c06', ang: 0, passo: 3, maxL: 1.6, sombra: () => 0.6, cruzada: 0.7, traco: 2.2 });
    for (const t of [0.65, 0.68]) {
      k.strokeStyle = '#2e1c06';
      k.lineWidth = 3.2;
      k.beginPath();
      k.moveTo(F[0] - larg(t) + 10, yT(t));
      k.lineTo(F[0] + larg(t) - 10, yT(t));
      k.stroke();
      k.strokeStyle = 'rgba(255,250,232,.85)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(F[0] - larg(t) + 10, yT(t) + 3);
      k.lineTo(F[0] + larg(t) - 10, yT(t) + 3);
      k.stroke();
    }
    // os furos dos postes entre as raias, na pedra
    k.fillStyle = '#2e1c06';
    for (let i = 1; i < 6; i++) {
      const f = (i / 6) * 2 - 1;
      k.beginPath();
      k.ellipse(F[0] + f * larg(0.665), yT(0.665), 5, 3, 0, 0, 6.283);
      k.fill();
    }
    // diante da largada, a pista vazia: só a poeira batida pelos pés (riscos curtos em leque, mais
    // densos perto da soleira) e umas pedrinhas soltas, espalhadas sem ordem
    const ySol = yT(t2) + 14;
    k.save();
    k.clip(pista);
    k.lineCap = 'round';
    for (let i = 0; i < 160; i++) {
      const t = r();
      const y = ySol + 6 + t * t * (H - ySol - 6);
      const meia = larg(Math.min(1.3, (y - F[1] - 30) / (H - F[1] - 30)));
      const x = F[0] + (r() * 2 - 1) * meia * 0.95;
      const c = 4 + r() * 8 + t * 6;
      const g = (r() - 0.5) * 0.5;
      k.strokeStyle = 'rgba(70,44,10,' + (0.35 + r() * 0.3).toFixed(2) + ')';
      k.lineWidth = 0.9 + t * 0.8;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + Math.cos(g) * c, y + Math.sin(g) * c * 0.3);
      k.stroke();
    }
    // a sombra da soleira na pista
    k.save();
    k.filter = 'blur(5px)';
    k.fillStyle = 'rgba(46,28,6,.28)';
    k.fillRect(F[0] - larg(1.3), ySol, larg(1.3) * 2, 10);
    k.restore();
    k.restore();
    // duas pedras chatas, da cor da pista, de tamanhos desencontrados e longe uma da outra
    // (as duas dentro da janela da frente e acima do papel da glória)
    for (const [x, y, rx, ry, g] of [[222, ySol + 66, 26, 9, 0.12], [610, ySol + 40, 15, 6, -0.18]]) {
      const p = seixo(r, x, y, rx, ry, g, 0.22);
      sombraNoChao(k, p, 5, 4, 4, 0.4);
      peca(k, p, [x - rx, y - ry, x + rx, y + ry], { cor: '#dcc394', tinta: '#2e1c06', ang: 0.6, passo: 3, maxL: 1.4, sombra: (px, py) => 0.2 + (py - y + ry) / (ry * 2) * 0.6, cruzada: 0.8, traco: 1.8 });
    }
    vinheta(k, W, H, 0.22);
  }

  // As artes, pela id da carta. temArte(id) diz se a carta já tem desenho; sem ele, a carta
  // sai com a gravura neutra (desenhoEmBreve) e o sistema pode preferir a silhueta.
  const DESENHOS = { 'davi-funda': desenhoDavi, 'poco-jaco': desenhoPoco, 'azeite-viuva': desenhoAzeite, 'mar-vermelho': desenhoMar,
    'arca-alianca': desenhoArca, 'tumulo-vazio': desenhoTumulo,
    'abel-oferta': desenhoAbel, 'noe-arca': desenhoNoe,
    'abraao-estrelas': desenhoAbraao, 'sara-riso': desenhoSara,
    'jose-sonhos': desenhoJose, 'moises-cesto': desenhoMoises,
    'raabe-corda': desenhoRaabe, 'gideao-tochas': desenhoGideao, 'rute-espigas': desenhoRute,
    'ester-cetro': desenhoEster, 'daniel-leoes': desenhoDaniel, 'nuvem-testemunhas': desenhoTestemunhas,
    // Milagres
    'mana': desenhoMana, 'agua-rocha': desenhoAguaRocha, 'muralhas-jerico': desenhoMuralhas,
    'fogo-carmelo': desenhoFogoCarmelo, 'machado-flutua': desenhoMachado, 'fornalha': desenhoFornalha,
    'jonas-peixe': desenhoJonas, 'tempestade': desenhoTempestade, 'pesca': desenhoPesca,
    'agua-vinho': desenhoAguaVinho, 'pedro-prisao': desenhoPedro,
    // Lugares
    'jardim-eden': desenhoEden, 'montes-ararate': desenhoArarate, 'betel': desenhoBetel, 'monte-sinai': desenhoSinai,
    'rio-jordao': desenhoJordao, 'jerusalem': desenhoJerusalem, 'babilonia': desenhoBabilonia, 'ninive': desenhoNinive,
    'belem': desenhoBelem, 'mar-galileia': desenhoGalileia, 'nazare': desenhoNazare, 'patmos': desenhoPatmos,
    // Objetos
    'tunica-jose': desenhoTunica,
    'vara-moises': desenhoVara,
    'candelabro': desenhoCandelabro,
    'tabuas-alianca': desenhoTabuas,
    'serpente-bronze': desenhoSerpente,
    'harpa-davi': desenhoHarpa,
    'manto-elias': desenhoManto,
    'vaso-oleiro': desenhoVaso,
    'perola': desenhoPerola,
    'moeda-perdida': desenhoMoeda,
    'paes-peixes': desenhoPaes };
  const temArte = (id) => Object.prototype.hasOwnProperty.call(DESENHOS, id);
  // O foco da arte cheia (a glória), opcional por desenho: [fx, fy] é o ponto do desenho (em
  // fração dos 888 x 846) que tem de ficar à vista, entre a pílula do alto e o papel do texto;
  // o terceiro número (opcional, até 1) afasta a arte, usando a margem do desenho. Quando o
  // desenho não tem mais para onde ir, a arte desce (ou sobe) e a beirada dela se estende.
  // Gideão: a corneta, deitada embaixo à direita; Ester: o alto do dossel, na beirada de cima; Sara: as
  // borlas do pano da tenda, no alto; Raabe: o terraço com o linho, no alto da casa; a
  // Multidão: a soleira da largada, acima do papel.
  const FOCO = { 'gideao-tochas': [0.6, 0.84, 0.92], 'ester-cetro': [0.5, 0, 1], 'sara-riso': [0.4, 0.15, 0.96], 'raabe-corda': [0.5, 0.09, 0.96], 'nuvem-testemunhas': [0.5, 0.85, 0.96], /* objetos */ 'tunica-jose': [0.5, 0.94, 0.95], 'candelabro': [0.5, 0.93, 0.94], 'manto-elias': [0.5, 0.86, 0.96], 'vaso-oleiro': [0.5, 0.9, 0.95], 'perola': [0.45, 0.9, 0.96] };
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

  // ---------- Lugares: as pranchas ----------
  // Cada lugar é uma gravura de paisagem em tinta sépia sobre papel com fibra, como as pranchas
  // dos Heróis: o céu e a água em linhas, a hachura que engrossa na sombra, e gente nenhuma (só
  // o que as pessoas fizeram ou deixaram: muros, casas, barcos, redes, harpas). Cada prancha tem
  // o seu céu e a sua água, para nenhuma repetir a outra. As peças abaixo são comuns a elas.

  // O chão em perspectiva: linhas quase horizontais, mais juntas e finas perto do horizonte,
  // quebradas aqui e ali, mais grossas onde a sombra pede.
  function chaoEmLinhas(k, r, forma, x0, x1, y0, y1, maxL, sombra, cor = SEPIA) {
    k.save();
    k.clip(forma);
    k.strokeStyle = cor;
    k.lineCap = 'round';
    for (let y = y0 + 1; y < y1; y += 2.2 + (y - y0) * 0.022) {
      let x = x0 - r() * 30;
      const t = (y - y0) / Math.max(1, y1 - y0);
      while (x < x1) {
        const c = 30 + r() * 120 * (0.4 + t);
        const w = maxL * (0.35 + t * 0.65) * Math.max(0, Math.min(1, sombra(x + c / 2, y)));
        if (w > 0.2) {
          k.lineWidth = w;
          k.beginPath();
          k.moveTo(x, y + (r() - 0.5) * 1.2);
          k.quadraticCurveTo(x + c / 2, y + (r() - 0.5) * 2, x + c, y + (r() - 0.5) * 1.2);
          k.stroke();
        }
        x += c + 3 + r() * 14 * (0.3 + t);
      }
    }
    k.restore();
  }
  // A copa de uma árvore em gravura: o contorno em tufos, o tom, a hachura da sombra (de cima à
  // esquerda vem a luz, se nada disser o contrário) e os arquinhos das folhas do lado escuro.
  function copaGravada(k, r, x, y, rx, ry, { cor = '#a29c68', tinta = SEPIA, obj, luz = [-0.55, -0.6] } = {}) {
    const pts = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.283; const f = 0.84 + r() * 0.32; return [x + Math.cos(a) * rx * f, y + Math.sin(a) * ry * f]; });
    const forma = lanoso(r, pts, Math.max(2.4, rx * 0.13), Math.max(5, rx * 0.34));
    const so = (px, py) => {
      const u = (px - x) / rx;
      const v = (py - y) / ry;
      const zz = 1 - u * u - v * v;
      const l = Math.max(0, luz[0] * u + luz[1] * v + 0.58 * Math.sqrt(Math.max(0, zz)));
      return 1 - l * 1.15 + (zz < 0.12 ? 0.25 : 0);
    };
    peca(k, forma, [x - rx, y - ry, x + rx, y + ry], { cor, tinta, ang: 0.9, passo: Math.max(2.4, rx * 0.075), maxL: Math.min(2.2, 0.55 + rx * 0.022), sombra: so, cruzada: 0.74, traco: Math.min(1.9, 0.7 + rx * 0.016), obj });
    if (rx > 12) {
      k.save();
      k.clip(forma);
      k.strokeStyle = tinta;
      k.lineWidth = Math.min(1.5, 0.5 + rx * 0.016);
      const n = Math.round((rx * ry) / 70);
      for (let i = 0; i < n; i++) {
        const a = r() * 6.283;
        const d = Math.sqrt(r());
        const px = x + Math.cos(a) * rx * d;
        const py = y + Math.sin(a) * ry * d;
        if (so(px, py) < 0.4) continue;
        const s = rx * 0.08 + 1.6;
        k.beginPath();
        k.arc(px, py, s, 0.25, Math.PI - 0.25);
        k.stroke();
      }
      k.restore();
    }
    return forma;
  }
  // Uma árvore de fruto: o tronco (dois traços e a casca), dois ou três tufos de copa e, se
  // pedir, os frutos miúdos.
  function arvoreDeFruto(k, r, x, base, e, { cor = '#a29c68', fruto = null, obj } = {}) {
    const alto = 54 * e;
    const tronco = pol([[x - 5 * e, base], [x - 3 * e, base - alto * 0.55], [x - 9 * e, base - alto], [x + 9 * e, base - alto], [x + 3 * e, base - alto * 0.55], [x + 6 * e, base]]);
    peca(k, tronco, [x - 9 * e, base - alto, x + 9 * e, base], { cor: '#8a7448', ang: 1.5, passo: 2.4, maxL: 0.9, sombra: (px) => 0.3 + (px - x + 9 * e) / (18 * e) * 0.6, traco: Math.min(1.6, 0.6 + e * 0.6), obj });
    const tufos = [[x - 14 * e, base - alto - 8 * e, 24 * e, 19 * e], [x + 15 * e, base - alto - 6 * e, 22 * e, 18 * e], [x, base - alto - 26 * e, 30 * e, 24 * e]];
    for (const [cx, cy, rx, ry] of tufos) copaGravada(k, r, cx, cy, rx, ry, { cor, obj });
    if (fruto) {
      for (let i = 0; i < 9; i++) {
        const [cx, cy, rx, ry] = tufos[i % 3];
        const a = r() * 6.283;
        const d = 0.3 + r() * 0.55;
        const px = cx + Math.cos(a) * rx * d;
        const py = cy + Math.sin(a) * ry * d;
        const rr = Math.max(1.2, 3.2 * e);
        k.fillStyle = fruto;
        k.beginPath();
        k.arc(px, py, rr, 0, 6.283);
        k.fill();
        k.lineWidth = Math.max(0.6, 0.9 * e);
        k.strokeStyle = SEPIA;
        k.stroke();
      }
    }
  }
  // Uma tamareira: o tronco de anéis, um pouco torto, e as folhas compridas em arco, cada uma
  // com os folíolos em traço.
  function palmeiraGravada(k, r, x, base, alto, giro, e = 1, obj) {
    const tx = x + Math.sin(giro) * alto;
    const ty = base - Math.cos(giro) * alto;
    const mx = x + (tx - x) * 0.4 + giro * 30;
    const my = (base + ty) / 2;
    const tronco = new Path2D();
    tronco.moveTo(x, base);
    tronco.quadraticCurveTo(mx, my, tx, ty);
    marcar(k, obj, tronco, 7 * e);
    k.save();
    k.lineCap = 'round';
    k.strokeStyle = SEPIA;
    k.lineWidth = 7 * e;
    k.stroke(tronco);
    k.strokeStyle = '#a58c5c';
    k.lineWidth = 4 * e;
    k.stroke(tronco);
    k.strokeStyle = SEPIA;
    k.lineWidth = Math.max(0.6, 1 * e);
    for (let t = 0.04; t < 0.98; t += 0.06) {
      const u = 1 - t;
      const px = u * u * x + 2 * u * t * mx + t * t * tx;
      const py = u * u * base + 2 * u * t * my + t * t * ty;
      k.beginPath();
      k.moveTo(px - 3.5 * e, py + 1.5 * e);
      k.lineTo(px + 3.5 * e, py - 1.5 * e);
      k.stroke();
    }
    // as folhas: lâminas em arco, largas no meio, com a nervura e os folíolos pendentes
    const folhas = [];
    for (let i = 0; i < 12; i++) folhas.push(-Math.PI / 2 + (i / 11 - 0.5) * 3.7 + (r() - 0.5) * 0.18);
    folhas.sort((a, b) => Math.abs(Math.cos(b)) - Math.abs(Math.cos(a)));
    for (const a of folhas) {
      const c = (36 + r() * 14) * e;
      const cai = (6 + Math.abs(Math.cos(a)) * 30) * e;
      const fim = [tx + Math.cos(a) * c, ty + Math.sin(a) * c * 0.55 + cai];
      const ctl = [tx + Math.cos(a) * c * 0.6, ty + Math.sin(a) * c * 0.8 - 12 * e];
      const pts = [];
      for (let t = 0; t <= 1.0001; t += 0.1) { const u = 1 - t; pts.push([u * u * tx + 2 * u * t * ctl[0] + t * t * fim[0], u * u * ty + 2 * u * t * ctl[1] + t * t * fim[1]]); }
      const larg = (t) => 5.5 * e * Math.sin(Math.PI * Math.min(1, t * 1.15));
      const cima = [];
      const baixo = [];
      pts.forEach(([px, py], i) => { const q = pts[Math.min(pts.length - 1, i + 1)]; const p0 = pts[Math.max(0, i - 1)]; const dx = q[0] - p0[0]; const dy = q[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; const w = larg(i / (pts.length - 1)); cima.push([px + (dy / l) * w, py - (dx / l) * w]); baixo.push([px - (dy / l) * w, py + (dx / l) * w]); });
      const lamina = pol([...cima, ...baixo.reverse()]);
      marcar(k, obj, lamina);
      // os folíolos que caem da lâmina
      k.strokeStyle = SEPIA;
      k.lineWidth = Math.max(0.5, 0.75 * e);
      for (let i = 2; i < pts.length; i++) {
        const [px, py] = pts[i];
        const l = (11 - i * 0.6) * e;
        k.beginPath();
        k.moveTo(px, py);
        k.lineTo(px - 2.5 * e, py + l);
        k.moveTo(px, py);
        k.lineTo(px + 2.5 * e, py + l);
        k.stroke();
      }
      k.fillStyle = '#8c8656';
      k.fill(lamina);
      gravar(k, lamina, (tx + fim[0]) / 2, (ty + fim[1]) / 2, c * 0.6 + 4, a + 1.2, Math.max(1.6, 2.4 * e), Math.max(0.4, 0.8 * e), () => 0.6, SEPIA, 0);
      k.lineWidth = Math.max(0.7, 1.1 * e);
      k.stroke(lamina);
    }
    k.restore();
  }
  // Uma casa de pedra de teto chato, vista um pouco de cima: a frente ao sol (de largura w e
  // altura h), o lado na sombra (para a direita, profundidade d) e o teto com a mureta. A porta
  // e uma janela escuras. Devolve o contorno inteiro, para a máscara e para o que vem na frente.
  function casinha(k, r, x, base, w, h, d, { cor = '#e2cfa2', lado = '#b99d6c', teto = '#d6c294', luzDaDireita = false, porta = true, janela = true, acesa = null, tinta = SEPIA, obj, traco = 1.6 } = {}) {
    const dx = d * 0.82 * (luzDaDireita ? -1 : 1);
    const dy = d * 0.46;
    const frente = pol([[x, base], [x, base - h], [x + w, base - h], [x + w, base]]);
    const xl = luzDaDireita ? x : x + w;
    const ladoP = pol([[xl, base], [xl, base - h], [xl + dx, base - h - dy], [xl + dx, base - dy]]);
    const tetoP = pol([[x, base - h], [x + w, base - h], [x + w + dx, base - h - dy], [x + dx, base - h - dy]]);
    const tudo = pol([[x, base], [x, base - h], [x + dx, base - h - dy], [x + w + dx, base - h - dy], [x + w + dx, base - dy], [x + w, base]]);
    const s = Math.max(0.6, Math.min(1, w / 90));
    peca(k, frente, [x, base - h, x + w, base], { cor, tinta, ang: 0.15, passo: 3.6 * s + 1, maxL: 1.1 * s, sombra: () => 0.32 + r() * 0.08, cruzada: 1, traco, obj });
    peca(k, ladoP, [Math.min(xl, xl + dx), base - h - dy, Math.max(xl, xl + dx), base], { cor: lado, tinta, ang: 1.45, passo: 2.6 * s + 0.8, maxL: 1.4 * s, sombra: () => 0.75, cruzada: 0.6, traco, obj });
    peca(k, tetoP, [Math.min(x, x + dx), base - h - dy, Math.max(x + w, x + w + dx), base - h], { cor: teto, tinta, ang: -0.5, passo: 4 * s + 1, maxL: 0.9 * s, sombra: () => 0.3, cruzada: 1, traco, obj });
    // a mureta do teto
    k.strokeStyle = tinta;
    k.lineWidth = traco * 0.8;
    k.beginPath();
    k.moveTo(x + 3 * s, base - h + 3 * s);
    k.lineTo(x + w - 3 * s, base - h + 3 * s);
    k.stroke();
    const escuro = acesa || '#2a2014';
    if (porta && w > 14) {
      const pw = Math.max(4, w * 0.2);
      const px = x + w * (luzDaDireita ? 0.62 : 0.2);
      const pp = pol([[px, base], [px, base - h * 0.55], [px + pw, base - h * 0.55], [px + pw, base]]);
      k.fillStyle = escuro;
      k.fill(pp);
      k.lineWidth = traco * 0.7;
      k.stroke(pp);
    }
    if (janela && w > 22) {
      const jw = Math.max(3, w * 0.12);
      const jx = x + w * (luzDaDireita ? 0.22 : 0.62);
      const jy = base - h * 0.75;
      k.fillStyle = escuro;
      k.fillRect(jx, jy, jw, jw * 0.9);
      k.strokeRect(jx, jy, jw, jw * 0.9);
    }
    return tudo;
  }
  // Os raios de um sol baixo: traços finos que saem dele, um comprido e um curto, só onde
  // pode (dentro, ex.: o céu).
  function raiosDoSol(k, cx, cy, r0, r1, n, dentro, cor = SEPIA, larg = 1.1) {
    k.save();
    if (dentro) k.clip(dentro);
    k.strokeStyle = cor;
    k.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283;
      const l = i % 2 ? r1 * 0.62 : r1;
      k.lineWidth = i % 2 ? larg * 0.7 : larg;
      k.beginPath();
      k.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      k.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l);
      k.stroke();
    }
    k.restore();
  }
  // Um rio de largura que muda: a lista de pontos { x, y, w } passada em traços redondos (a
  // margem, a beirada de tinta e a água por cima, numa tela à parte, para as linhas da água
  // ficarem só dentro dela). Vários rios juntos fazem uma água só, sem emenda.
  function passarRios(k, rios, extra, cor) {
    k.save();
    k.strokeStyle = cor;
    k.lineCap = 'round';
    k.lineJoin = 'round';
    for (const rio of rios) {
      for (let i = 1; i < rio.length; i++) {
        const a = rio[i - 1];
        const b = rio[i];
        k.lineWidth = (a.w + b.w) / 2 + extra;
        k.beginPath();
        k.moveTo(a.x, a.y);
        k.lineTo(b.x, b.y);
        k.stroke();
      }
    }
    k.restore();
  }
  const curvaDeRio = (p0, p1, p2, p3, w0, w1, n = 50) => bezier(p0, p1, p2, p3, n).map(([x, y], i) => ({ x, y, w: w0 + (w1 - w0) * Math.pow(i / n, 0.8) }));
  // (1) O jardim do Éden (Gn 2.10): "Nascia no Éden um rio que atravessava o jardim para o
  // irrigar, dividindo-se depois em quatro braços." Vista do alto, como numa prancha de atlas:
  // a nascente no fundo, entre as árvores, o rio que desce em curvas pelo jardim e, no meio,
  // se parte em quatro braços: dois saem para os lados, dois descem até a beira da prancha,
  // cada um com o seu número (I a IV, como os quatro nomes de 2.11-14). Árvores de fruto e
  // tamareiras por toda parte, cada vez menores para longe; no céu, só a névoa da manhã.
  function desenhoEden(k, W, H, obj) {
    const r = sorteio(6101);
    papelVelho(k, W, H, r, ['#f8f2d8', '#ebe2bd', '#cfc28f'], [W / 2, 120]);
    const hz = 150;
    // o céu: linhas finas e ralas, mais cheias no alto, e duas faixas de névoa
    linhas(k, 0, 0, W, hz, 5.5, 1.2, (x, y) => 0.12 + (1 - y / hz) * 0.5);
    for (const [x, y, rx] of [[220, 72, 170], [660, 104, 140]]) {
      const n = pol(Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * 6.283; return [x + Math.cos(a) * rx, y + Math.sin(a) * 8 * (1 + Math.cos(a * 3) * 0.25)]; }));
      k.fillStyle = '#f8f2d8';
      k.fill(n);
      k.strokeStyle = 'rgba(43,33,18,.55)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(x - rx * 0.85, y + 6);
      k.quadraticCurveTo(x, y + 11, x + rx * 0.85, y + 6);
      k.stroke();
    }
    // os morros baixos do horizonte e a linha de árvores de longe
    const fl = onda(r, 4, 0.03);
    const fm = onda(r, 3, 0.008);
    const morros = pol([[-10, hz + 10], ...Array.from({ length: 48 }, (_, i) => [i * 19 - 4, hz - 22 + fm(i * 19) * 12]), [W + 10, hz + 10]]);
    peca(k, morros, [-10, hz - 40, W + 10, hz + 10], { cor: '#ddd5ae', ang: 0, passo: 4.4, maxL: 0.8, sombra: () => 0.45, cruzada: 1, traco: 1.1 });
    const longe = new Path2D();
    longe.moveTo(-10, hz + 14);
    for (let x = -10; x <= W + 10; x += 6) longe.lineTo(x, hz - 4 - Math.abs(fl(x)) * 7);
    longe.lineTo(W + 10, hz + 14);
    longe.closePath();
    peca(k, longe, [-10, hz - 20, W + 10, hz + 14], { cor: '#bdb487', ang: 1.4, passo: 2.8, maxL: 0.9, sombra: () => 0.55, cruzada: 1, traco: 1.1 });
    // o chão do jardim: a relva em linhas, mais escura perto
    const chao = new Path2D();
    chao.rect(-10, hz + 4, W + 20, H);
    k.fillStyle = '#c4bc87';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, hz + 4, H, 1.8, (x, y) => 0.55 + Math.sin(x * 0.013 + y * 0.02) * 0.18 + (y - hz) / 2400);
    // o rio: da nascente, em curvas, até o ponto em que se divide; e os quatro braços
    const div = [452, 470];
    const tronco = [...curvaDeRio([430, 190], [380, 230], [520, 270], [470, 320], 8, 26, 24), ...curvaDeRio([470, 320], [420, 370], [400, 420], div, 26, 50, 24).slice(1)];
    const bracos = [
      curvaDeRio(div, [360, 470], [250, 430], [150, 470], 34, 46, 26).concat(curvaDeRio([150, 470], [70, 500], [30, 540], [-40, 530], 46, 54, 16).slice(1)),
      curvaDeRio(div, [400, 560], [210, 600], [250, 690], 36, 60, 30).concat(curvaDeRio([250, 690], [280, 760], [190, 810], [200, 900], 60, 84, 20).slice(1)),
      curvaDeRio(div, [500, 560], [680, 600], [620, 690], 36, 60, 30).concat(curvaDeRio([620, 690], [570, 770], [680, 820], [660, 900], 60, 84, 20).slice(1)),
      curvaDeRio(div, [560, 470], [650, 440], [740, 480], 34, 46, 26).concat(curvaDeRio([740, 480], [810, 515], [850, 560], [930, 560], 46, 54, 16).slice(1)),
    ];
    const rios = [tronco, ...bracos];
    // a margem: um barranco de terra e a beirada de tinta
    passarRios(k, rios, 18, '#9f8e58');
    passarRios(k, rios, 5, SEPIA);
    // a água, numa tela à parte: o tom e as ondinhas (só dentro do rio)
    const ta = tela(W, H);
    const ka = ta.getContext('2d');
    passarRios(ka, rios, 0, '#d9e1d6');
    ka.fillStyle = '#d9e1d6';
    ka.beginPath();
    ka.ellipse(div[0], div[1], 44, 22, 0, 0, 6.283);
    ka.fill();
    marcar(k, obj, (() => { const p = new Path2D(); p.ellipse(div[0], div[1], 44, 22, 0, 0, 6.283); return p; })());
    if (obj) passarRios(obj, rios, 0, '#000');
    ka.globalCompositeOperation = 'source-atop';
    ka.strokeStyle = 'rgba(40,54,52,.6)';
    ka.lineCap = 'round';
    for (let y = 186; y < H; y += 3.4 + (y - 186) * 0.008) {
      const t = (y - 186) / (H - 186);
      let x = -r() * 30;
      while (x < W) {
        const c = 6 + r() * 26 * (0.4 + t);
        ka.lineWidth = 0.6 + t * 1.2;
        ka.beginPath();
        ka.moveTo(x, y);
        ka.quadraticCurveTo(x + c / 2, y - 1.5 - t * 2, x + c, y);
        ka.stroke();
        x += c + 4 + r() * 18 * (0.4 + t);
      }
    }
    // as linhas da correnteza, que dizem para onde a água vai
    ka.strokeStyle = 'rgba(255,255,250,.8)';
    for (const rio of rios) {
      for (const u of [-0.24, 0.2]) {
        ka.lineWidth = 1.3;
        ka.beginPath();
        rio.forEach((q, i) => { const n = rio[Math.min(rio.length - 1, i + 1)]; const p = rio[Math.max(0, i - 1)]; const dx = n.x - p.x; const dy = n.y - p.y; const l = Math.hypot(dx, dy) || 1; const x = q.x - (dy / l) * q.w * u; const y = q.y + (dx / l) * q.w * u; if (i % 7 < 4) { if (i % 7 === 0) ka.moveTo(x, y); else ka.lineTo(x, y); } });
        ka.stroke();
      }
    }
    k.drawImage(ta, 0, 0);
    // a nascente: o olho d'água entre pedras
    const olho = new Path2D();
    olho.ellipse(430, 188, 24, 7, 0, 0, 6.283);
    k.fillStyle = '#e6ece2';
    k.fill(olho);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.3;
    k.stroke(olho);
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * (0.92 + i * 0.16);
      const p = seixo(r, 430 + Math.cos(a) * 30, 190 + Math.sin(a) * 10, 6, 3.6, 0, 0.12);
      peca(k, p, [400, 175, 460, 205], { cor: '#d8cfaa', sombra: () => 0.5, passo: 2.2, maxL: 0.7, traco: 1 });
    }
    // as árvores, de trás para a frente, longe da água
    const longeDoRio = (x, y, folga) => rios.every((rio) => rio.every((q) => Math.hypot(q.x - x, q.y - y) > q.w / 2 + folga));
    const arvores = [];
    for (let i = 0; i < 700 && arvores.length < 64; i++) {
      const y = hz + 16 + Math.pow(r(), 0.85) * (H - hz - 30);
      const x = 10 + r() * (W - 20);
      const e = 0.2 + ((y - hz) / (H - hz)) * 0.95;
      if (!longeDoRio(x, y, 8 + 30 * e)) continue;
      if (arvores.some((a) => Math.abs(a.x - x) < 44 * Math.max(a.e, e) && Math.abs(a.y - y) < 30 * Math.max(a.e, e))) continue;
      arvores.push({ x, y, e, palma: r() < 0.28 });
    }
    arvores.sort((a, b) => a.y - b.y);
    for (const a of arvores) {
      sombraNoChao(k, pol([[a.x - 18 * a.e, a.y], [a.x + 30 * a.e, a.y - 2 * a.e], [a.x + 36 * a.e, a.y + 7 * a.e], [a.x - 12 * a.e, a.y + 8 * a.e]]), 4 * a.e, 0, 3, 0.35);
      if (a.palma) palmeiraGravada(k, r, a.x, a.y, 92 * a.e, (r() - 0.5) * 0.25, a.e * 0.95, obj);
      else arvoreDeFruto(k, r, a.x, a.y, a.e, { cor: r() < 0.5 ? '#a29c68' : '#928c58', fruto: r() < 0.35 ? (r() < 0.5 ? '#c0602a' : '#d9a23a') : null, obj });
    }
    // os números dos quatro braços, como nas pranchas de atlas
    const rom = ['I', 'II', 'III', 'IV'];
    for (const [i, x, y] of [[0, 92, 590], [1, 120, 760], [2, 770, 760], [3, 800, 630]]) {
      k.fillStyle = 'rgba(248,242,216,.9)';
      k.beginPath();
      k.ellipse(x, y - 9, 22, 16, 0, 0, 6.283);
      k.fill();
      k.strokeStyle = 'rgba(43,33,18,.5)';
      k.lineWidth = 1;
      k.stroke();
      escrever(k, rom[i], x, y, 'italic 500 26px Literata, Georgia, serif', 'rgba(43,33,18,.9)', { alinhar: 'center' });
    }
    vinheta(k, W, H, 0.2);
  }

  // (2) Os montes de Ararate (Gn 8.4-5): "no décimo sétimo dia do sétimo mês, a embarcação
  // tocou no alto das montanhas de Ararate"; os cumes só apareceram no décimo mês. Então: o mar
  // da enchente ainda cobre tudo; só um ressalto de rocha escura, molhada, rompe a água, e a
  // arca pousou nele, com as pontas do casco ainda sobre a água. A arca é o casco comprido e
  // baixo de piche, com a borda em curva, as faixas de tábuas (6.16) e o teto com a cumeeira.
  // O vento forte que fez a água baixar (8.1) arrasta a frente da tempestade em farrapos para o
  // lado; a chuva já parou (8.2).
  function desenhoArarate(k, W, H, obj) {
    const r = sorteio(6201);
    papelVelho(k, W, H, r, ['#f7efd9', '#e6d8b6', '#c6b18a'], [W * 0.45, 380]);
    const nivel = 480;
    // o céu claro do fim da tarde, em linhas ralas
    linhas(k, 0, 0, W, nivel, 5.5, 1.4, (x, y) => 0.12 + Math.max(0, 1 - y / 300) * 0.25);
    // a frente da tempestade: no alto, a massa da nuvem, em hachura aberta (o papel aparece
    // entre os traços); embaixo, a beirada rasgada em farrapos de tamanhos soltos, puxados pelo
    // vento para a direita e para baixo (a chuva já parou)
    const fr = sorteio(6231);
    const baseDe = (xx) => 150 + Math.sin(xx * 0.006 + 1) * 30 + Math.sin(xx * 0.019) * 12 + Math.sin(xx * 0.047 + 2) * 6;
    const pts = [[-20, -20], [W + 20, -20]];
    for (let xx = W + 20; xx >= -20; xx -= 8) pts.push([xx, baseDe(xx) + (fr() - 0.5) * 8]);
    const frente = pol(pts);
    k.fillStyle = '#e4d9bf';
    k.fill(frente);
    gravar(k, frente, W / 2, 110, 560, -0.1, 3.6, 2.4, (px, py) => 0.95 - Math.max(0, py - 60) / 190, SEPIA, 0);
    gravar(k, frente, W / 2, 110, 560, 0.7, 5.4, 1.6, (px, py) => 0.75 - Math.max(0, py - 30) / 120, SEPIA, 0);
    // os farrapos que o vento arrasta da beirada: feixes de traços curvos, compridos e finos,
    // que saem da nuvem, descem para a direita e se desfazem
    k.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x0 = -40 + fr() * 880;
      const y0 = baseDe(x0) - 10 + fr() * 8;
      const l = 120 + fr() * 200;
      const cai = 10 + fr() * 26;
      const n = 3 + Math.floor(fr() * 4);
      for (let q = 0; q < n; q++) {
        const dy = q * 2.6;
        const ini = q * 14 * fr();
        const comp = l * (0.7 + fr() * 0.3);
        k.strokeStyle = 'rgba(43,33,18,' + (0.7 - q * 0.08).toFixed(2) + ')';
        k.lineWidth = 1.4 - q * 0.15;
        k.beginPath();
        k.moveTo(x0 + ini, y0 + dy);
        k.bezierCurveTo(x0 + ini + comp * 0.4, y0 + dy + cai * 0.15, x0 + ini + comp * 0.75, y0 + dy + cai * 0.6, x0 + ini + comp, y0 + dy + cai);
        k.stroke();
      }
    }
    // farrapos soltos embaixo, rasgados pelo vento: tiras compridas e finas, inclinadas
    for (let i = 0; i < 5; i++) {
      const cx = 40 + fr() * 800;
      const cy = 230 + fr() * 110;
      const l = 60 + fr() * 140;
      const h = 2 + fr() * 3;
      const tira = pol([[cx, cy], [cx + l * 0.4, cy - h], [cx + l * 1.6, cy + h * 0.6 + l * 0.08], [cx + l * 0.6, cy + h * 0.5]]);
      k.fillStyle = '#e8dec6';
      k.fill(tira);
      gravar(k, tira, cx + l / 2, cy, l, -0.08, 3, 1.3, () => 0.45, SEPIA, 0);
    }
    // os riscos do vento, soltos, no céu claro
    k.strokeStyle = 'rgba(43,33,18,.45)';
    k.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const xx = r() * W;
      const yy = 250 + r() * 130;
      k.lineWidth = 1 + r() * 0.6;
      k.beginPath();
      k.moveTo(xx, yy);
      k.quadraticCurveTo(xx + 30, yy - 3, xx + 60 + r() * 60, yy + 1);
      k.stroke();
    }
    // o alto do monte que rompe a água: basalto molhado em dois ou três nós de pedra, com a
    // hachura deitada que acompanha a encosta, a beirada de cima acesa, a faixa escura e
    // molhada logo acima da água e uns fios de água escorrendo nos vãos. A arca pousa num nó;
    // na ponta da proa sobra um vão de céu debaixo da quilha.
    const nos = [[226, 470], [262, 452], [300, 446], [334, 452], [360, 444], [392, 440], [430, 446], [452, 458], [474, 452], [500, 462], [534, 474], [560, nivel + 2]];
    const topoM = (xx) => { for (let i = 1; i < nos.length; i++) if (nos[i][0] >= xx) { const [ax2, ay2] = nos[i - 1]; const [bx2, by2] = nos[i]; return ay2 + (by2 - ay2) * ((xx - ax2) / (bx2 - ax2)); } return nivel; };
    const rocha = pol([[200, nivel + 3], [206, 478], ...nos, [560, nivel + 3]]);
    k.fillStyle = '#7d6f58';
    k.fill(rocha);
    k.save();
    k.clip(rocha);
    k.strokeStyle = '#1f170e';
    k.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      let ant = null;
      for (let xx = 196; xx <= 564; xx += 5) {
        const yy = topoM(xx) + 3 + i * 2.8 + Math.sin(xx * 0.05 + i) * 1.4;
        const w = 0.6 + (i / 14) * 1.4 + Math.max(0, (xx - 392) / 200) * 0.8;
        if (ant && r() > 0.08) { k.lineWidth = w; k.beginPath(); k.moveTo(ant[0], ant[1]); k.lineTo(xx, yy); k.stroke(); }
        ant = [xx, yy];
      }
    }
    // a faixa molhada, escura, logo acima da água
    k.fillStyle = 'rgba(28,20,12,.55)';
    k.fillRect(190, nivel - 9, 380, 10);
    // a água escorrendo nos vãos, em traços curtos e partidos
    k.strokeStyle = 'rgba(246,240,222,.85)';
    k.lineWidth = 1.2;
    for (const xx of [244, 318, 412, 486]) { let yy = topoM(xx) + 6; while (yy < nivel - 4) { k.beginPath(); k.moveTo(xx + (r() - 0.5) * 3, yy); k.lineTo(xx + (r() - 0.5) * 3, yy + 3 + r() * 3); k.stroke(); yy += 6 + r() * 4; } }
    k.restore();
    k.strokeStyle = 'rgba(250,244,226,.8)';
    k.lineWidth = 1.4;
    k.beginPath();
    nos.slice(0, -1).forEach(([xx, yy], i) => (i ? k.lineTo(xx, yy + 2) : k.moveTo(xx, yy + 2)));
    k.stroke();
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(206, 478);
    nos.forEach(([xx, yy]) => k.lineTo(xx, yy));
    k.stroke();
    // a arca: o casco comprido e baixo de piche, a borda em curva, as três faixas de tábuas e o
    // teto com a cumeeira; tudo escuro de verdade (o raio da glória só passa no claro)
    const ax = 372;
    const ay = 454;
    const L = 420;
    const borda = (t) => ay - 64 - Math.pow(Math.abs(t - 0.5) * 2, 4) * 6;
    const fundo = (t) => ay - Math.pow(Math.abs(t - 0.5) * 2, 6) * 26;
    const xDe = (t) => ax - L / 2 + t * L;
    const casco = new Path2D();
    for (let i = 0; i <= 30; i++) { const t = i / 30; (i ? casco.lineTo(xDe(t), borda(t)) : casco.moveTo(xDe(t), borda(t))); }
    for (let i = 30; i >= 0; i--) { const t = i / 30; casco.lineTo(xDe(t), fundo(t)); }
    casco.closePath();
    k.fillStyle = '#2a2016';
    k.fill(casco);
    marcar(k, obj, casco);
    // o casco gravado: as tábuas compridas em hachura que segue as fiadas, mais escura embaixo,
    // e a faixa de tábuas acesa logo abaixo da borda (não é só silhueta)
    k.save();
    k.clip(casco);
    k.lineCap = 'round';
    for (let j = 0; j < 16; j++) {
      const u = j / 15;
      const luz = u < 0.22 ? 0.8 : 0;
      k.strokeStyle = luz ? 'rgba(150,128,96,.85)' : 'rgba(84,66,46,' + (0.6 - u * 0.35).toFixed(2) + ')';
      k.lineWidth = luz ? 2.2 : 1.4;
      k.beginPath();
      for (let i = 0; i <= 30; i++) { const t = i / 30; const y = borda(t) + (fundo(t) - borda(t)) * u + 1; (i ? k.lineTo(xDe(t), y) : k.moveTo(xDe(t), y)); }
      k.stroke();
    }
    for (const j of [1, 2]) {
      k.strokeStyle = '#120c06';
      k.lineWidth = 2.6;
      k.beginPath();
      for (let i = 0; i <= 30; i++) { const t = i / 30; const y = borda(t) + (fundo(t) - borda(t)) * (j / 3); (i ? k.lineTo(xDe(t), y) : k.moveTo(xDe(t), y)); }
      k.stroke();
    }
    k.strokeStyle = 'rgba(18,12,6,.8)';
    k.lineWidth = 1.2;
    for (let i = 1; i < 18; i++) { const t = i / 18; k.beginPath(); k.moveTo(xDe(t) + (i % 2) * 6, borda(t) + 4); k.lineTo(xDe(t) + (i % 2) * 6, fundo(t) - 2); k.stroke(); }
    k.restore();
    k.strokeStyle = '#0e0905';
    k.lineWidth = 2.4;
    k.stroke(casco);
    // o brilho do piche na borda, fino
    k.strokeStyle = 'rgba(150,126,96,.9)';
    k.lineWidth = 1.4;
    k.beginPath();
    for (let i = 2; i <= 28; i++) { const t = i / 30; (i > 2 ? k.lineTo(xDe(t), borda(t) + 3) : k.moveTo(xDe(t), borda(t) + 3)); }
    k.stroke();
    // o teto: baixo, de duas águas, com a fresta de meio metro (6.16) e a cumeeira
    const tE = xDe(0.08);
    const tD = xDe(0.92);
    const ty = borda(0.5) - 6;
    const teto = pol([[tE, ty + 4], [tE + 18, ty - 30], [tD - 18, ty - 30], [tD, ty + 4]]);
    k.fillStyle = '#2a1f14';
    k.fill(teto);
    marcar(k, obj, teto);
    k.strokeStyle = '#4a3a28';
    k.lineWidth = 1.2;
    for (let x = tE + 10; x < tD - 6; x += 9) { k.beginPath(); k.moveTo(x, ty + 2); k.lineTo(x + 8, ty - 28); k.stroke(); }
    k.strokeStyle = '#0e0905';
    k.lineWidth = 2.2;
    k.stroke(teto);
    k.strokeStyle = '#6a5640';
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(tE + 18, ty - 30);
    k.lineTo(tD - 18, ty - 30);
    k.stroke();
    k.fillStyle = '#0e0905';
    k.fillRect(tE + 4, ty + 3, tD - tE - 8, 5);
    // a porta do lado (6.16), fechada
    k.strokeStyle = '#4a3a28';
    k.lineWidth = 1.6;
    k.strokeRect(ax + 40, borda(0.63) + 10, 22, 34);
    // as janelinhas sob o teto (a fresta de 6.16), em fila
    k.fillStyle = 'rgba(160,138,104,.9)';
    for (let x = tE + 20; x < tD - 20; x += 26) k.fillRect(x, ty - 2, 10, 4);
    // o mar da enchente: ondas compridas, mais escuras e mais altas perto, com o reflexo
    const mar = new Path2D();
    mar.rect(-10, nivel, W + 20, H);
    k.fillStyle = '#a99e83';
    k.fill(mar);
    k.save();
    k.clip(mar);
    k.strokeStyle = SEPIA;
    k.lineCap = 'round';
    for (let y = nivel + 3; y < H + 20; y += 3.6 + (y - nivel) * 0.032) {
      const t = (y - nivel) / (H - nivel);
      const fase = r() * 6.283;
      const comp = 0.01 + (1 - t) * 0.02;
      let ant = null;
      for (let x = -10; x <= W + 10; x += 6) {
        const yy = y + Math.sin(x * comp + fase) * (1 + t * 6);
        const dentro = x > 200 && x < 560 && (y - nivel) * 1.4 < nivel - topoM(x) + 8;
        const arca = false;
        const w = (0.7 + t * 2.1) * Math.max(0.15, 0.5 + Math.cos(x * comp + fase) * 0.35 + (dentro ? 0.35 : 0) + (arca ? 0.8 : 0));
        if (ant && r() > 0.04) { k.lineWidth = w; k.beginPath(); k.moveTo(ant[0], ant[1]); k.lineTo(x, yy); k.stroke(); }
        ant = [x, yy];
      }
    }
    // o reflexo da arca: traços escuros partidos, mais curtos e ralos com a fundura
    for (let y = nivel + 4; y < nivel + 90; y += 5) {
      const t = (y - nivel) / 90;
      let x = ax - L / 2 + 20 + r() * 30;
      while (x < ax + L / 2 - 30) {
        const c = (16 + r() * 50) * (1 - t * 0.6);
        if (r() > t * 0.7) { k.strokeStyle = 'rgba(32,24,15,' + (0.85 - t * 0.5).toFixed(2) + ')'; k.lineWidth = 2.6 - t * 1.4; k.beginPath(); k.moveTo(x, y + Math.sin(x * 0.05) * 1.5); k.lineTo(x + c, y + Math.sin((x + c) * 0.05) * 1.5); k.stroke(); }
        x += c + 6 + r() * 18 * (1 + t * 2);
      }
    }
    // as cristas de espuma levadas pelo vento
    k.strokeStyle = 'rgba(252,250,240,.9)';
    for (let i = 0; i < 50; i++) {
      const x = r() * W;
      const y = nivel + 16 + r() * (H - nivel - 26);
      const t = (y - nivel) / (H - nivel);
      k.lineWidth = 1 + t * 2.4;
      k.beginPath();
      k.moveTo(x, y);
      k.quadraticCurveTo(x + 10 + t * 20, y - 3 - t * 5, x + 22 + t * 50, y + 1);
      k.stroke();
    }
    k.restore();
    // a espuma batendo no pé do monte: traços quebrados de tamanhos e vãos soltos, mais cheios
    // do lado do vento (à esquerda), com falhas onde a pedra entra direto na água
    k.strokeStyle = 'rgba(252,250,240,.95)';
    for (let x = 196; x < 566;) {
      const l = 8 + r() * 30 * (1 - (x - 196) / 600);
      if (r() > 0.3) {
        k.lineWidth = 1.2 + r() * 2 * (1 - (x - 196) / 400);
        k.beginPath();
        k.moveTo(x, nivel + 1 + r() * 2);
        k.lineTo(x + l * 0.4, nivel - r() * 2);
        k.lineTo(x + l, nivel + 1 + r() * 2);
        k.stroke();
      }
      x += l + 2 + r() * 20;
    }
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(-10, nivel);
    k.lineTo(200, nivel);
    k.moveTo(560, nivel);
    k.lineTo(W + 10, nivel);
    k.stroke();
    vinheta(k, W, H, 0.22);
  }

  // (3) Betel (Gn 28.18-19): "Logo que amanheceu, Jacó colocou a pedra que tinha usado como
  // travesseiro em pé, como uma coluna. Depois derramou óleo sobre ela." Uma pedra do tamanho
  // de um travesseiro (28.11), posta em pé como marco baixo: uma laje calcária irregular, mais
  // larga embaixo, de alto quebrado e um canto lascado, calçada com pedras miúdas. O óleo
  // escurece o alto e desce em dois ou três fios pelas facetas. Ao lado, a botija de barro
  // tombada, que dá a escala. A vista é baixa, rente ao chão: a pedra pequena fica contra o céu
  // da alvorada (o sol ainda cortado pelo morro) e o planalto vazio de Betel.
  function desenhoBetel(k, W, H, obj) {
    const r = sorteio(6301);
    papelVelho(k, W, H, r, ['#fcf0da', '#f1dab5', '#d8b78c'], [690, 470]);
    const sol = [690, 512];
    const hz = 540;
    // o céu da madrugada: linhas, mais cheias no alto e à esquerda, que abrem em volta do sol
    // (um ruído miúdo no peso de cada traço: sem ele, a linha que cruza 1 px de grossura vira um
    // arco visível no céu)
    const ruido = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v) - 0.5; };
    linhas(k, 0, 0, W, hz, 5.5, 1.5, (x, y) => 0.1 + Math.pow(Math.hypot(x - sol[0], (y - sol[1]) * 1.4) / 1100, 0.9) * 0.95 + ruido(x, y) * 0.22);
    // umas tiras de nuvem baixa, com a barriga acesa
    for (const [x, y, rx] of [[170, 330, 150], [520, 236, 110], [840, 380, 80]]) {
      const n = pol(Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * 6.283; return [x + Math.cos(a) * rx, y + Math.sin(a) * 9 * (1 + Math.cos(a * 3) * 0.2)]; }));
      k.fillStyle = '#f8e6c4';
      k.fill(n);
      gravar(k, n, x, y, rx, 0, 3, 1.3, (px, py) => (py < y ? 0.6 : 0.1), SEPIA, 0);
      k.strokeStyle = 'rgba(160,90,40,.75)';
      k.lineWidth = 1.5;
      k.beginPath();
      k.moveTo(x - rx * 0.8, y + 7);
      k.quadraticCurveTo(x, y + 12, x + rx * 0.8, y + 7);
      k.stroke();
    }
    // o sol: o disco cortado pelo morro e os raios longos no céu
    const ceu = new Path2D();
    ceu.rect(0, 0, W, hz);
    k.fillStyle = '#fff6dc';
    k.beginPath();
    k.arc(sol[0], sol[1], 50, 0, 6.283);
    k.fill();
    raiosDoSol(k, sol[0], sol[1], 64, 400, 40, ceu, 'rgba(150,84,30,.45)', 1.3);
    k.strokeStyle = '#7a4a1c';
    k.lineWidth = 1.8;
    k.beginPath();
    k.arc(sol[0], sol[1], 50, 0, 6.283);
    k.stroke();
    // os morros de longe, em duas camadas
    for (const [base, amp, cor, sombra, sem] of [[500, 26, '#e3c69c', 0.35, 1], [540, 20, '#cfae84', 0.55, 2]]) {
      const f = onda(sorteio(6310 + sem), 4, 0.006);
      const m = pol([[-10, 600], ...Array.from({ length: 48 }, (_, i) => [i * 19 - 4, base + f(i * 19) * amp]), [W + 10, 600]]);
      peca(k, m, [-10, base - amp, W + 10, 600], { cor, ang: 0, passo: 4.6, maxL: 1.2, sombra: (x) => Math.max(0.18, sombra - Math.max(0, 1 - Math.abs(x - sol[0]) / 300) * 0.3), cruzada: 0.8, traco: 1.5 });
    }
    // o alto de Betel: o chão de calcário, perto
    const chao = new Path2D();
    chao.moveTo(-10, 590);
    for (let x = -10; x <= W + 10; x += 10) chao.lineTo(x, 584 + Math.sin(x * 0.012) * 6);
    chao.lineTo(W + 10, H + 10);
    chao.lineTo(-10, H + 10);
    chao.closePath();
    k.fillStyle = '#d9bd90';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, 580, H, 1.9, (x, y) => 0.45 + (y - 580) / 600 + Math.sin(x * 0.02) * 0.1);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(chao);
    // as pedras do chão: blocos de calcário meio enterrados, de beirada viva, poucos e longe
    const bloco = (x, y, w, h) => {
      const p = contornoRocha(r, [[x, y + h], [x + w * 0.06, y + h * 0.3], [x + w * 0.3, y], [x + w * 0.7, y + h * 0.08], [x + w, y + h * 0.4], [x + w + 4, y + h]], 3);
      p.closePath();
      sombraNoChao(k, p, 8, 4, 4, 0.3);
      peca(k, p, [x, y, x + w, y + h], { cor: '#e2cba0', ang: 1.45, passo: 3.4, maxL: 1.5, sombra: (px, py) => 0.2 + (px - x) / w * -0.1 + (py - y) / h * 0.5, cruzada: 0.75, traco: 1.6 });
    };
    bloco(60, 608, 110, 30);
    bloco(560, 600, 70, 18);
    bloco(760, 640, 120, 40);
    bloco(-20, 760, 140, 56);
    bloco(690, 790, 150, 50);
    // a pedra: um bloco de calcário bruto, do tamanho de um travesseiro, posto de pé: mais
    // largo embaixo, de alto torto e lascado, com o lado direito aceso pelo sol baixo
    const frente = [[200, 744], [196, 690], [210, 632], [234, 586], [258, 548], [290, 514], [318, 498], [334, 486], [356, 490], [366, 480], [392, 482], [406, 500], [418, 548], [430, 630], [446, 744]];
    const face = pol(frente);
    sombraNoChao(k, pol([[200, 744], [446, 744], [476, 734], [300, 792], [70, 790], [110, 758]]), 0, 0, 6, 0.38);
    k.fillStyle = '#d6bf96';
    k.fill(face);
    marcar(k, obj, face);
    // as facetas da face, cada uma com o seu ângulo de hachura e a sua luz
    const facetas = [
      [[[210, 632], [234, 586], [258, 548], [290, 514], [318, 498], [334, 560], [282, 642]], 0.9, 0.42],
      [[[318, 498], [334, 486], [356, 490], [366, 480], [392, 482], [406, 500], [384, 556], [334, 560]], 1.5, 0.55],
      [[[282, 642], [334, 560], [384, 556], [406, 500], [418, 548], [430, 630], [356, 664]], 0.35, 0.6],
      [[[392, 482], [406, 500], [418, 548], [430, 630], [446, 744], [422, 744], [410, 640], [400, 560], [390, 520]], 1.5, 0.12],
      [[[196, 690], [210, 632], [282, 642], [356, 664], [430, 630], [446, 744], [200, 744]], 1.35, 0.72],
    ];
    k.save();
    k.clip(face);
    for (const [pts, ang, sv] of facetas) {
      const p = pol(pts);
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length;
      const cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      gravar(k, p, cx, cy, 140, ang, 3.8, 2.2, (x, y) => sv + (y - cy) / 500, SEPIA, 0.12);
      if (sv > 0.5) gravar(k, p, cx, cy, 140, ang + 1.1, 5, 1.5, (x, y) => (sv - 0.45) * 2 + (y - cy) / 400, SEPIA, 0);
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.8;
      k.stroke(p);
    }
    // as beiradas vivas acesas, as lascas e os poros
    k.strokeStyle = 'rgba(255,246,222,.85)';
    k.lineWidth = 1.6;
    for (const [[x0, y0], [x1, y1]] of [[[334, 560], [384, 556]], [[282, 642], [334, 560]], [[356, 664], [434, 640]]]) { k.beginPath(); k.moveTo(x0, y0 - 2); k.lineTo(x1, y1 - 2); k.stroke(); }
    k.strokeStyle = SEPIA;
    for (const [x, y, l, a] of [[250, 690, 22, -0.4], [380, 700, 20, 0.3], [300, 600, 16, 0.6]]) { k.lineWidth = 1.5; k.beginPath(); k.moveTo(x, y); k.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.6); k.lineTo(x + Math.cos(a) * l + 3, y + Math.sin(a) * l * 0.6 + 8); k.stroke(); }
    for (let i = 0; i < 110; i++) { k.fillStyle = 'rgba(43,33,18,.45)'; k.beginPath(); k.arc(200 + r() * 240, 470 + r() * 270, 0.7 + r() * 1.3, 0, 6.283); k.fill(); }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.6;
    k.stroke(face);
    // o óleo, em gravura: a faceta de cima escurece por uma segunda hachura, cerrada, num marrom
    // quente; a beirada molhada tem um fio de luz; e o óleo desce em três fios finos que seguem
    // as arestas das facetas (o mais comprido com uns 60 px)
    const topo = pol(facetas[1][0]);
    k.save();
    k.clip(face);
    gravar(k, topo, 362, 500, 70, 0.25, 2.6, 1.3, (px, py) => 0.7 - Math.max(0, py - 486) / 34 - Math.abs(px - 364) / 160 + Math.sin(px * 0.3) * 0.08, '#5a3810', 0);
    const molhado = new Path2D();
    molhado.moveTo(318, 498);
    for (const [x, y] of [[334, 486], [356, 490], [366, 480], [392, 482], [406, 500], [398, 514], [384, 508], [366, 526], [350, 512], [334, 520]]) molhado.lineTo(x, y);
    molhado.closePath();
    gravar(k, molhado, 362, 504, 70, -0.5, 3.2, 1, (px, py) => 0.55 - Math.max(0, py - 500) / 40, '#5a3810', 0);
    k.strokeStyle = 'rgba(255,240,190,.9)';
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(320, 497);
    k.lineTo(334, 487);
    k.lineTo(356, 491);
    k.lineTo(366, 481);
    k.lineTo(392, 483);
    k.stroke();
    // os fios: linhas de 2 a 3 px pelas arestas (334,560) a (384,556), e pela face
    k.lineCap = 'round';
    for (const pts of [[[366, 524], [362, 540], [358, 556], [352, 572], [350, 584]], [[396, 512], [392, 528], [388, 546], [386, 556]], [[336, 520], [334, 534], [333, 546]]]) {
      k.strokeStyle = 'rgba(78,48,12,.9)';
      k.lineWidth = 2.6;
      k.beginPath();
      pts.forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
      k.stroke();
      k.strokeStyle = 'rgba(255,236,176,.8)';
      k.lineWidth = 0.9;
      k.beginPath();
      pts.forEach(([x, y], i) => (i ? k.lineTo(x - 0.8, y) : k.moveTo(x - 0.8, y)));
      k.stroke();
      const [ex, ey] = pts[pts.length - 1];
      k.fillStyle = 'rgba(78,48,12,.9)';
      k.beginPath();
      k.ellipse(ex, ey + 2, 2.2, 3, 0, 0, 6.283);
      k.fill();
    }
    k.restore();
    // a mancha de óleo no chão, ao pé
    const poca = new Path2D();
    poca.ellipse(340, 750, 36, 5, 0, 0, 6.283);
    k.fillStyle = 'rgba(96,60,14,.5)';
    k.fill(poca);
    // as pedras de calço, encostadas no pé
    for (const [x, y, rx, ry] of [[198, 742, 26, 16], [244, 754, 22, 12], [446, 744, 28, 16], [486, 750, 18, 11], [384, 760, 20, 10]]) {
      const p = contornoRocha(r, [[x - rx, y + ry * 0.6], [x - rx * 0.8, y - ry * 0.4], [x - rx * 0.1, y - ry], [x + rx * 0.7, y - ry * 0.6], [x + rx, y + ry * 0.4], [x + rx * 0.4, y + ry]], 2);
      p.closePath();
      sombraNoChao(k, p, 5, 4, 3, 0.35);
      peca(k, p, [x - rx, y - ry, x + rx, y + ry], { cor: '#d3bd92', ang: 0.6, passo: 3, maxL: 1.6, sombra: sombraOval(x, y, rx, ry, 0), cruzada: 0.7, traco: 1.8, obj });
    }
    // a botija de óleo tombada, de barro: dois terços do tamanho da pedra, para dar a escala
    k.save();
    k.translate(612, 742);
    k.rotate(-1.38);
    k.scale(1.7, 1.7);
    const bot = vaso(k, 0, 44, 100, 56, (t) => (t < 0.16 ? 0.32 : t < 0.28 ? 0.32 + (t - 0.16) * 2.5 : 0.62 + Math.sin(((t - 0.28) / 0.72) * Math.PI) * 0.38 - (t - 0.28) * 0.25));
    sombraNoChao(k, bot, 8, -4, 4, 0.35);
    peca(k, bot, [-32, -56, 32, 48], { cor: '#bf7d45', tinta: '#3a1e08', ang: 0.2, passo: 2.4, maxL: 1.2, sombra: sombraOval(0, 10, 28, 36, 0), cruzada: 0.6, traco: 1.4, obj, abaulado: 0.25 });
    k.strokeStyle = '#3a1e08';
    k.lineWidth = 4;
    k.beginPath();
    k.moveTo(9, -36);
    k.bezierCurveTo(32, -38, 36, -14, 18, -6);
    k.stroke();
    k.strokeStyle = '#bf7d45';
    k.lineWidth = 1.8;
    k.stroke();
    k.fillStyle = '#2a1404';
    k.beginPath();
    k.ellipse(0, -56, 10, 3.6, 0, 0, 6.283);
    k.fill();
    k.restore();
    // as últimas gotas, da boca da botija para a pedra
    for (const [x, y, s] of [[506, 754, 6], [488, 758, 4.4], [474, 754, 3]]) {
      k.fillStyle = 'rgba(112,72,20,.8)';
      k.beginPath();
      k.ellipse(x, y, s * 1.5, s * 0.6, 0, 0, 6.283);
      k.fill();
    }
    // um tufo de capim de verdade, ao pé da pedra
    // um tufo de capim seco ao pé da pedra: claro, baixo e largo, de folhas curvas
    k.save();
    k.strokeStyle = 'rgba(120,100,60,.55)';
    k.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const bx = 150 + r() * 46;
      const a = -Math.PI / 2 + (r() - 0.5) * 2.4;
      const c = 12 + r() * 14;
      k.lineWidth = 1.6 + r();
      k.beginPath();
      k.moveTo(bx, 752);
      k.quadraticCurveTo(bx + Math.cos(a) * c * 0.6, 752 + Math.sin(a) * c * 0.8, bx + Math.cos(a) * c * 1.3, 752 + Math.sin(a) * c * 0.55);
      k.stroke();
    }
    k.restore();
    vinheta(k, W, H, 0.22);
  }

  // Um maciço de granito em faces grandes: o monte partido em poucos planos largos (cada um
  // com uma luz só: acesos à esquerda, na sombra à direita), hachura de pé no ângulo de cada
  // plano, cruzada só na sombra funda, as camadas inclinadas do granito dentro de alguns
  // planos, só as juntas principais em traço e umas fraturas compridas que descem do alto.
  function granitoEmFaces(k, r, forma, [x0, y0, x1, y1], luz, { cor = '#2a1a10', fraturas = [] } = {}) {
    k.save();
    k.clip(forma);
    k.lineCap = 'round';
    k.lineJoin = 'round';
    // poucos planos grandes; o valor de cada um vem antes, para a junta só aparecer onde a luz
    // muda de verdade entre dois planos vizinhos
    const cels = facetas(r, x0, y0, x1, y1, 260, 200).filter((q) => q.pol.length >= 3);
    for (const q of cels) q.v = Math.max(0.08, Math.min(1, luz(q.c[0], q.c[1]) + (r() - 0.5) * 0.16));
    const vizinha = (x, y) => { let m = null; let dm = 1e9; for (const q of cels) { const d = Math.hypot(q.c[0] - x, q.c[1] - y); if (d < dm) { dm = d; m = q; } } return m; };
    for (const q of cels) {
      const { c, pol: pl, v } = q;
      const p = new Path2D();
      pl.forEach((pt, i) => (i ? p.lineTo(pt[0], pt[1]) : p.moveTo(pt[0], pt[1])));
      p.closePath();
      const ang = Math.PI / 2 + (v < 0.5 ? -0.4 : 0.35) + (r() - 0.5) * 0.25;
      const R = Math.max(...pl.map((pt) => Math.hypot(pt[0] - c[0], pt[1] - c[1]))) + 2;
      gravar(k, p, c[0], c[1], R, ang, 4.2, 2.3, (x, y) => v + (y - c[1]) / 700, cor, 0.08);
      if (v > 0.55) gravar(k, p, c[0], c[1], R, ang + 0.65, 5, 1.7, () => (v - 0.5) * 1.8, cor, 0);
      // as camadas inclinadas do granito, em traço partido, só em parte dos planos
      if (r() < 0.6) {
        k.save();
        k.clip(p);
        k.strokeStyle = cor;
        k.lineWidth = 1.4;
        const inc = -0.3 + (r() - 0.5) * 0.2;
        for (let yy = c[1] - R; yy < c[1] + R; yy += 22 + r() * 18) {
          let x = c[0] - R;
          while (x < c[0] + R) { const l = 20 + r() * 50; if (r() < 0.6) { k.beginPath(); k.moveTo(x, yy + (x - c[0]) * inc); k.lineTo(x + l, yy + (x + l - c[0]) * inc); k.stroke(); } x += l + 8 + r() * 24; }
        }
        k.restore();
      }
      // a junta: só onde a luz muda entre os dois planos, ou numa parte das beiradas, e partida
      for (let i = 0; i < pl.length; i++) {
        const a2 = pl[i];
        const b2 = pl[(i + 1) % pl.length];
        const nx = b2[1] - a2[1];
        const ny = a2[0] - b2[0];
        if (!(ny > 0 || nx > 0)) continue;
        const l = Math.hypot(nx, ny) || 1;
        const m = [(a2[0] + b2[0]) / 2 + (nx / l) * 6, (a2[1] + b2[1]) / 2 + (ny / l) * 6];
        const viz = vizinha(m[0], m[1]);
        const muda = viz && viz !== q && Math.abs(viz.v - v) > 0.2;
        if (!muda && r() > 0.3) continue;
        k.strokeStyle = cor;
        k.lineWidth = muda ? 2.4 : 1.6;
        for (let t = 0; t < 1; ) {
          const t2 = Math.min(1, t + 0.18 + r() * 0.25);
          k.beginPath();
          k.moveTo(a2[0] + (b2[0] - a2[0]) * t + (r() - 0.5) * 4, a2[1] + (b2[1] - a2[1]) * t + (r() - 0.5) * 4);
          k.lineTo(a2[0] + (b2[0] - a2[0]) * t2 + (r() - 0.5) * 4, a2[1] + (b2[1] - a2[1]) * t2 + (r() - 0.5) * 4);
          k.stroke();
          t = t2 + 0.06 + r() * 0.12;
        }
      }
    }
    // as fraturas compridas: descem tortas do alto, com a sombra cerrada de um lado
    for (const fr of fraturas) {
      const pts = bezier(...fr, 30);
      k.strokeStyle = cor;
      for (let i = 1; i < pts.length; i++) {
        const t = i / pts.length;
        k.lineWidth = 1.5 + t * 2.4;
        k.beginPath();
        k.moveTo(pts[i - 1][0] + (r() - 0.5) * 3, pts[i - 1][1]);
        k.lineTo(pts[i][0] + (r() - 0.5) * 3, pts[i][1]);
        k.stroke();
        k.lineWidth = 0.9;
        for (let q = 1; q < 4; q++) { k.beginPath(); k.moveTo(pts[i][0] - q * 3.4, pts[i][1] - 3); k.lineTo(pts[i][0] - q * 3.4 + 1, pts[i][1] + 6); k.stroke(); }
      }
    }
    k.restore();
  }
  // (4) O monte Sinai (Êx 19.18): "Saía fumaça do monte Sinai, porque o Senhor tinha descido
  // sobre ele no meio de labaredas de fogo. Subia fumaça como de uma fornalha. E todo o monte
  // tremia violentamente." O maciço de granito, em blocos de tamanhos soltos e ravinas; o alto
  // dele some dentro da coluna de fumaça, grossa como de fornalha, em rolos gravados que se
  // abrem para cima e para fora da prancha (a nuvem do 19.16, com os relâmpagos); embaixo dela,
  // saindo das fendas da rocha, três línguas de fogo em traço que sobem para a fumaça. O tremor
  // está na crista em traço dobrado e nas pedras que rolam, com o sopro de pó.
  function desenhoSinai(k, W, H, obj) {
    const r = sorteio(6401);
    papelVelho(k, W, H, r, ['#ecdcbc', '#d2b88e', '#9c8160'], [W / 2, 300]);
    // o céu é a nuvem: escuro de verdade (para o raio da glória não cruzar a hachura)
    const ceu = new Path2D();
    ceu.rect(-10, -10, W + 20, 620);
    k.fillStyle = '#2c241c';
    k.fill(ceu);
    gravar(k, ceu, W / 2, 300, 660, Math.PI / 2, 5, 1.6, () => 0.7, '#120c07', 0);
    // o monte: largo, de muitos picos, em granito; o cume some dentro da fumaça
    const perfil = [[-10, 540], [40, 494], [92, 452], [128, 466], [170, 400], [214, 352], [244, 366], [282, 300], [318, 262], [350, 276], [384, 222], [420, 196], [452, 206], [482, 238], [516, 214], [548, 246], [584, 274], [620, 262], [660, 324], [700, 356], [740, 342], [780, 410], [830, 450], [W + 10, 488]];
    const monte = contornoRocha(r, [...perfil, [W + 10, 700], [-10, 700]], 4);
    monte.closePath();
    // o granito vai numa tela à parte: entra aqui e de novo no ombro, na frente do fogo
    const tg = tela(W, H);
    const kg = tg.getContext('2d');
    kg.fillStyle = '#b48a6a';
    kg.fill(monte);
    granitoEmFaces(kg, r, monte, [-10, 190, W + 10, 700], (x, y) => (x < 430 ? 0.24 : 0.74) + (y - 220) / 1400, {
      fraturas: [[[300, 270], [270, 380], [220, 480], [170, 660]], [[560, 250], [600, 380], [640, 500], [700, 660]], [[430, 300], [446, 420], [420, 540], [450, 660]]],
    });
    k.drawImage(tg, 0, 0);
    // o tremor: a crista em traço dobrado, cada vez mais fraco
    for (const [d, a] of [[0, 1], [5, 0.5], [10, 0.25]]) {
      k.strokeStyle = 'rgba(26,18,10,' + a + ')';
      k.lineWidth = d ? 1.5 : 2.6;
      k.beginPath();
      perfil.forEach(([x, y], i) => (i ? k.lineTo(x + d * 0.6, y - d) : k.moveTo(x + d * 0.6, y - d)));
      k.stroke();
    }
    // a fumaça, como de fornalha: uma massa de rolos irregulares, que se sobrepõem, cobre o
    // alto do monte e sobe para fora da prancha. Cada rolo é uma mancha de beirada em tufos,
    // escura, com a hachura em linhas paralelas (diagonais, todas no mesmo sentido) mais
    // cheias do lado da sombra (em cima, à direita) e uma cruzada na sombra funda; o lado de
    // baixo dos que ficam perto do fogo acende em poucos traços quentes, na mesma direção.
    // Nada de anéis nem de círculos em volta de um centro.
    const base = (x) => 290 + 74 * Math.exp(-(((x - 440) / 280) ** 2));
    const rolo = (q) => {
      const fogo = Math.max(0, Math.min(1, (q.y + q.rr * 0.7 - 210) / 120)) * Math.max(0, 1 - Math.abs(q.x - 460) / 330);
      const pts = Array.from({ length: 11 }, (_, i) => { const a = (i / 11) * 6.283; const f2 = 0.82 + r() * 0.36; return [q.x + Math.cos(a) * q.rr * f2 * (q.y < 100 ? 1.6 : 1.15), q.y + Math.sin(a) * q.rr * (Math.sin(a) > 0 ? 0.55 : 0.8) * f2]; });
      const forma = lanoso(r, pts, q.rr * 0.1, q.rr * 0.38);
      k.fillStyle = q.tom;
      k.fill(forma);
      const so = (px, py) => 0.55 - (py - q.y) / q.rr * 0.45 + (px - q.x) / q.rr * 0.22;
      gravar(k, forma, q.x, q.y, q.rr * 1.3, -0.62, 3.6, 2.1, so, '#0c0805', 0);
      gravar(k, forma, q.x, q.y, q.rr * 1.3, 0.5, 4.6, 1.5, (px, py) => so(px, py) - 0.35, '#0c0805', 0);
      if (fogo > 0.15) {
        // a barriga acesa: só a beirada de baixo, em traços curtos que seguem a beirada
        k.save();
        k.clip(forma);
        k.strokeStyle = 'rgba(214,128,56,' + (0.3 + fogo * 0.5).toFixed(2) + ')';
        k.lineWidth = 1.6 + fogo * 1.4;
        const a0 = 0.5 + r() * 0.4;
        k.beginPath();
        k.ellipse(q.x, q.y, q.rr * 1.05, q.rr * 0.5, 0, a0, a0 + 1.2 + r() * 0.6);
        k.stroke();
        k.restore();
      }
      // a beirada de cima, que separa o rolo do de trás: um traço só, aberto
      k.strokeStyle = 'rgba(8,5,2,.85)';
      k.lineWidth = 1.6;
      k.beginPath();
      const a0 = Math.PI * 1.05 + r() * 0.3;
      k.ellipse(q.x, q.y, q.rr * 1.1, q.rr * 0.76, 0, a0, a0 + 0.9 + r() * 0.5);
      k.stroke();
    };
    const rolos = [];
    // a massa: em faixas, de cima para baixo, nenhum rolo baixo perto do fogo
    for (const [y, n, rr] of [[-20, 6, 120], [60, 7, 104], [140, 7, 92], [210, 7, 80], [262, 6, 66]]) {
      for (let i = 0; i < n; i++) {
        const x = -60 + ((W + 120) * (i + 0.3 + r() * 0.4)) / n;
        const rrr = rr * (0.8 + r() * 0.35);
        if (Math.abs(x - 470) < 170 && (y > 240 || y + rrr * 0.4 > base(x) - rrr)) continue;
        rolos.push({ x, y: y + (r() - 0.5) * 24, rr: rrr, tom: ['#2a221a', '#30271e', '#382d23', '#403326', '#463829'][Math.min(4, Math.floor((y + 20) / 60))] });
      }
    }
    // os rolos baixos, postos à mão: dois só, longe do fogo, de alturas e tamanhos diferentes
    rolos.push({ x: 160, y: 300, rr: 72, tom: '#382d23' }, { x: 742, y: 330, rr: 54, tom: '#382d23' });
    rolos.sort((a, b) => a.y - b.y);
    for (const q of rolos) rolo(q);
    // as cristas que rompem a beirada de baixo da fumaça: dois espigões de pedra, em faces
    for (const crPts of [[[150, 400], [204, 330], [230, 296], [250, 312], [270, 296], [300, 340], [330, 400]], [[590, 420], [636, 356], [664, 316], [690, 334], [712, 322], [746, 380], [780, 430]]]) {
      const cr = pol([...crPts, [crPts[crPts.length - 1][0], 440], [crPts[0][0], 440]]);
      const cx = (crPts[0][0] + crPts[crPts.length - 1][0]) / 2;
      const meio = crPts[3];
      const esq = pol([...crPts.slice(0, 4), [meio[0] - 6, 440], [crPts[0][0], 440]]);
      const dir = pol([...crPts.slice(3), [crPts[crPts.length - 1][0], 440], [meio[0] - 6, 440]]);
      peca(k, esq, [crPts[0][0], 290, meio[0], 440], { cor: '#b48a6a', tinta: '#2a1a10', ang: Math.PI / 2 - 0.35, passo: 4.2, maxL: 2.2, sombra: () => 0.35, cruzada: 1, traco: 0 });
      peca(k, dir, [meio[0], 290, crPts[crPts.length - 1][0], 440], { cor: '#9c765a', tinta: '#2a1a10', ang: Math.PI / 2 + 0.35, passo: 3.6, maxL: 2.3, sombra: () => 0.75, cruzada: 0.6, traco: 0 });
      k.strokeStyle = '#2a1a10';
      k.lineWidth = 2;
      k.beginPath();
      k.moveTo(...meio);
      k.lineTo(meio[0] - 6, 440);
      k.stroke();
      k.lineWidth = 2.6;
      k.beginPath();
      crPts.forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
      k.stroke();
      void cr; void cx;
    }
    // o fogo: três línguas de tamanhos diferentes, saindo das fendas da rocha e subindo para
    // dentro da fumaça; cada uma é um feixe de traços em S que se abrem, se dividem e afinam,
    // com a base torta escondida atrás de uma beirada de pedra
    const crista = (x) => { for (let i = 1; i < perfil.length; i++) if (perfil[i][0] >= x) { const [ax, ay] = perfil[i - 1]; const [bx, by] = perfil[i]; return ay + (by - ay) * ((x - ax) / Math.max(1, bx - ax)); } return 500; };
    const tracoDeFogo = (x0, y0, x1, y1, ondula, larg, cor) => {
      const pts = bezier([x0, y0], [x0 + ondula, y0 - (y0 - y1) * 0.35], [x1 - ondula * 0.8, y0 - (y0 - y1) * 0.72], [x1, y1], 18);
      k.strokeStyle = cor;
      for (let i = 1; i < pts.length; i++) {
        k.lineWidth = Math.max(0.4, larg * (1 - i / pts.length));
        k.beginPath();
        k.moveTo(pts[i - 1][0], pts[i - 1][1]);
        k.lineTo(pts[i][0], pts[i][1]);
        k.stroke();
      }
      return pts;
    };
    const lingua = (x, y, h, vai, larg) => {
      // de fora para dentro: as línguas largas e escuras de laranja, depois as do meio, mais
      // claras; cada traço é largo na base e afina na ponta, em S, e as pontas se juntam no alto
      for (const [n, wl, cor, fh, fl] of [[7, 9, 'rgba(196,106,40,.82)', 1, 1], [6, 7, 'rgba(226,146,62,.88)', 0.86, 0.72], [4, 5, 'rgba(248,210,130,.95)', 0.66, 0.42]]) {
        for (let j = 0; j < n; j++) {
          const u = n > 1 ? j / (n - 1) - 0.5 : 0;
          const x0 = x + u * larg * fl + (r() - 0.5) * 8;
          const y0 = y + (r() - 0.5) * 12;
          const hj = h * fh * (0.55 + (0.5 - Math.abs(u)) * 0.9 + r() * 0.3);
          const x1 = x + vai * (hj / h) + u * larg * 0.18 + (r() - 0.5) * 14;
          const pts = tracoDeFogo(x0, y0, x1, y0 - hj, (r() < 0.5 ? -1 : 1) * (18 + r() * 30), wl, cor);
          if (r() < 0.35 && n > 4) {
            const [bx, by] = pts[10];
            tracoDeFogo(bx, by, bx + (u < 0 ? -1 : 1) * (14 + r() * 24), by - hj * (0.22 + r() * 0.18), (r() - 0.5) * 16, wl * 0.45, cor);
          }
        }
      }
      const p = new Path2D();
      p.ellipse(x + vai * 0.5, y - h * 0.5, larg * 0.8, h * 0.55, 0, 0, 6.283);
      marcar(k, obj, p);
    };
    // o fogo sai de trás de três nós de rocha, de alturas diferentes, que se sobrepõem; os da
    // direita têm a barriga escura; a beirada acesa só no alto, virada para as chamas
    const nosR = [
      { x0: 196, x1: 420, y: base(300) + 70, pico: 300 },
      { x0: 380, x1: 560, y: base(470) + 34, pico: 470 },
      { x0: 520, x1: 730, y: base(620) + 90, pico: 600 },
    ];
    const topoNo = (n, x) => n.y + Math.pow(Math.abs(x - n.pico) / ((n.x1 - n.x0) / 2), 1.6) * 36 + Math.sin(x * 0.11) * 4;
    for (const [x, h, vai, larg, n] of [[340, 160, -22, 70, 0], [470, 220, 12, 90, 1], [600, 130, 26, 60, 2]]) lingua(x, topoNo(nosR[n], x) + 18, h, vai, larg);
    for (const [ni, n] of [[0, nosR[0]], [2, nosR[2]], [1, nosR[1]]]) {
      const cima = [];
      for (let x = n.x0; x <= n.x1; x += 8) cima.push([x, topoNo(n, x) + (r() - 0.5) * 5]);
      const no = pol([...cima, [n.x1 + 10, n.y + 140], [n.x0 - 10, n.y + 140]]);
      k.save();
      k.clip(monte);
      k.clip(no);
      k.drawImage(tg, 0, 0);
      if (ni > 0) {
        // a sombra que o nó faz logo abaixo da beirada (a barriga escura), em hachura que some
        gravar(k, no, n.pico, n.y + 40, 160, Math.PI / 2 + 0.35, 3.2, 1.8, (x, y) => 0.9 - (y - topoNo(n, x)) / 50, '#2a1a10', 0);
      }
      k.restore();
      k.strokeStyle = '#2a1a10';
      k.lineWidth = 2.6;
      k.beginPath();
      cima.forEach(([px, py], i) => (i ? k.lineTo(px, py) : k.moveTo(px, py)));
      k.stroke();
      // a beirada acesa: só no trecho de cima, perto do fogo
      k.strokeStyle = 'rgba(240,170,90,.85)';
      k.lineWidth = 1.6;
      k.beginPath();
      let dentro = false;
      cima.forEach(([px, py]) => { const perto = Math.abs(px - n.pico) < (n.x1 - n.x0) * 0.3; if (perto && !dentro) { k.moveTo(px, py + 3); dentro = true; } else if (perto) k.lineTo(px, py + 3); else dentro = false; });
      k.stroke();
    }
    // o relâmpago (19.16): um só, fora do meio, quebrado e com um galho
    {
      const pts = [[150, 30]];
      for (let i = 0; i < 6; i++) { const [px, py] = pts[pts.length - 1]; pts.push([px + (i % 2 ? -10 : 18) + r() * 10, py + 22 + r() * 14]); }
      const galho = [pts[3], [pts[3][0] + 34, pts[3][1] + 16], [pts[3][0] + 42, pts[3][1] + 42]];
      for (const [w, c] of [[6, 'rgba(18,12,7,.95)'], [2.8, '#f6eedc']]) {
        k.strokeStyle = c;
        k.lineWidth = w;
        k.lineJoin = 'miter';
        for (const l of [pts, galho]) { k.beginPath(); l.forEach(([px, py], i) => (i ? k.lineTo(px, py) : k.moveTo(px, py))); k.stroke(); }
      }
    }
    // as pedras que rolam, com os riscos do movimento e um sopro de pó atrás
    for (const [x, y, s] of [[150, 486, 15], [116, 540, 10], [740, 458, 14], [790, 520, 10]]) {
      const dir = x < 430 ? 1 : -1;
      k.strokeStyle = 'rgba(236,214,176,.7)';
      k.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) { k.beginPath(); k.ellipse(x + dir * s * 1.6, y - s * 1.6, s * (0.6 + i * 0.2), s * 0.4, 0, Math.PI + 0.3, Math.PI * 2 - 0.3); k.stroke(); }
      const p = seixo(r, x, y, s, s * 0.8, r(), 0.18);
      peca(k, p, [x - s, y - s, x + s, y + s], { cor: '#9b7458', sombra: sombraOval(x, y, s, s * 0.8, 0), passo: 2.4, maxL: 1.2, traco: 1.6 });
      k.strokeStyle = 'rgba(26,18,10,.75)';
      k.lineWidth = 1.3;
      for (let i = -1; i <= 1; i++) { k.beginPath(); k.moveTo(x + dir * s * 0.7 + i * 5, y - s * 1.2); k.lineTo(x + dir * s * 1.9 + i * 5, y - s * 2.8); k.stroke(); }
    }
    // o pé do monte e a planície de areia, perto, sem faixa de pó
    const chao = new Path2D();
    chao.moveTo(-10, 650);
    for (let x = -10; x <= W + 10; x += 12) chao.lineTo(x, 640 + Math.sin(x * 0.01 + 1) * 10);
    chao.lineTo(W + 10, H + 10);
    chao.lineTo(-10, H + 10);
    chao.closePath();
    k.fillStyle = '#d6bc90';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, 630, H, 2, (x, y) => 0.45 + (y - 630) / 520);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(chao);
    // as rachaduras na planície, abertas pelo tremor
    k.strokeStyle = SEPIA;
    k.lineCap = 'round';
    for (const [x, y, n] of [[150, 730, 6], [600, 770, 7], [360, 810, 5]]) {
      let px = x;
      let py = y;
      k.lineWidth = 2.6;
      k.beginPath();
      k.moveTo(px, py);
      for (let i = 0; i < n; i++) { px += 22 + r() * 20; py += (r() - 0.5) * 18; k.lineTo(px, py); }
      k.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const x = r() * W;
      const y = 690 + r() * 140;
      const s = 4 + (y - 660) / 30 + r() * 6;
      const p = seixo(r, x, y, s, s * 0.6, 0, 0.2);
      peca(k, p, [x - s, y - s, x + s, y + s], { cor: '#c9ab80', sombra: sombraOval(x, y, s, s * 0.6, 0), passo: 2.2, maxL: 1, traco: 1.2 });
    }
    vinheta(k, W, H, 0.3);
  }
  // Um muro de pedra em fiadas: o tom, as fiadas com as juntas desencontradas, a hachura de
  // cada pedra (mais cheia embaixo e para o lado da sombra) e a beirada de tinta. h é a altura
  // da fiada; serve para muralhas de perto e de longe (com h pequeno).
  function muroEmFiadas(k, r, forma, [x0, y0, x1, y1], { h = 22, cor = '#e2cb98', tinta = SEPIA, sombra = () => 0.35, traco = 1.3, larg = 2.6 } = {}) {
    k.save();
    k.clip(forma);
    k.fillStyle = cor;
    k.fillRect(x0, y0, x1 - x0, y1 - y0);
    k.strokeStyle = tinta;
    k.lineCap = 'round';
    let fiada = 0;
    for (let y = y0; y < y1; y += h, fiada++) {
      let x = x0 - r() * h * larg;
      while (x < x1) {
        const w = h * (larg * 0.6 + r() * larg * 0.8);
        const s = sombra(x + w / 2, y + h / 2);
        // a hachura deitada da pedra, mais grossa na sombra e embaixo
        for (let yy = y + 2.5; yy < y + h - 1; yy += Math.max(2.2, h * 0.16)) {
          const lw = Math.max(0, Math.min(1, s + (yy - y) / h * 0.35)) * Math.min(1.6, h * 0.07);
          if (lw < 0.2) continue;
          k.lineWidth = lw;
          k.beginPath();
          k.moveTo(x + 2, yy);
          k.lineTo(x + w - 2, yy + (r() - 0.5));
          k.stroke();
        }
        k.lineWidth = traco;
        k.beginPath();
        k.moveTo(x, y);
        k.lineTo(x + (r() - 0.5) * 2, y + h);
        k.stroke();
        x += w;
      }
      k.lineWidth = traco;
      k.beginPath();
      k.moveTo(x0, y + h);
      k.lineTo(x1, y + h + (r() - 0.5) * 1.5);
      k.stroke();
    }
    k.restore();
  }

  // (5) O rio Jordão (Js 3.15-16): era época das colheitas, e o Jordão transbordava em ambas
  // as margens; quando os sacerdotes molharam os pés, "as águas que vinham do lado de cima
  // pararam de repente e formou-se uma muralha". De lado, da margem de cá: à esquerda, a água
  // de cima parada e amontoada, de pé como um muro, com a crista de espuma; à direita, o leito
  // seco, de seixos e lama rachada; as margens alagadas, com os tamariscos dentro da água; as
  // pegadas molhadas dos sacerdotes que entram no leito e param no meio; e, do outro lado,
  // nos morros, a cidade de Jericó entre as palmeiras (o povo atravessou de frente para ela).
  function desenhoJordao(k, W, H, obj) {
    const r = sorteio(6501);
    papelVelho(k, W, H, r, ['#fbf4dc', '#ecdfba', '#d0bc8c'], [W * 0.6, 160]);
    // o céu da colheita: claro, de linhas ralas, com riscos de nuvem alta
    linhas(k, 0, 0, W, 250, 6, 1.2, (x, y) => 0.1 + (1 - y / 250) * 0.4);
    k.strokeStyle = 'rgba(43,33,18,.55)';
    k.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const x = 320 + r() * 560;
      const y = 40 + r() * 140;
      const l = 40 + r() * 90;
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(x, y);
      k.quadraticCurveTo(x + l / 2, y - 6, x + l, y - 2);
      k.stroke();
    }
    // os morros do outro lado (oeste), em duas camadas
    for (const [base, amp, cor, sombra, sem] of [[206, 26, '#e7d6ae', 0.32, 1], [236, 18, '#d8c294', 0.5, 2]]) {
      const f = onda(sorteio(6510 + sem), 4, 0.008);
      const m = pol([[-10, 290], ...Array.from({ length: 48 }, (_, i) => [i * 19 - 4, base + f(i * 19) * amp]), [W + 10, 290]]);
      peca(k, m, [-10, base - amp, W + 10, 290], { cor, ang: 0, passo: 4.8, maxL: 1.2, sombra: () => sombra, cruzada: 0.8, traco: 1.4 });
    }
    // Jericó no morro, à direita: o muro baixo, as casas e as palmeiras
    const jx = 640;
    const jy = 244;
    const muroJ = pol([[jx, jy + 14], [jx, jy - 4], [jx + 170, jy - 6], [jx + 170, jy + 14]]);
    muroEmFiadas(k, r, muroJ, [jx, jy - 6, jx + 170, jy + 14], { h: 5, larg: 3, cor: '#e8d4a6', traco: 0.8 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.2;
    k.stroke(muroJ);
    for (const [x, w, h] of [[jx + 6, 14, 10], [jx + 30, 18, 14], [jx + 60, 12, 9], [jx + 82, 22, 16], [jx + 118, 14, 11], [jx + 140, 18, 9]]) {
      k.fillStyle = '#efe0bb';
      k.fillRect(x, jy - 6 - h, w, h);
      k.fillStyle = '#b39b6e';
      k.fillRect(x + w, jy - 6 - h - 2, 4, h + 2);
      k.strokeRect(x, jy - 6 - h, w, h);
    }
    for (const x of [jx - 20, jx + 50, jx + 100, jx + 186, jx + 206]) palmeiraGravada(k, r, x, jy + 12, 40, (r() - 0.5) * 0.3, 0.42);
    // a margem de lá: terra baixa e alagada pela cheia, mais alta que o leito, com o barranco
    // que desce até ele; a água da cheia fica em poças entre os tamariscos, de pé na terra
    const la = pol([[-10, 300], [W + 10, 290], [W + 10, 424], [-10, 434]]);
    k.fillStyle = '#d8c597';
    k.fill(la);
    chaoEmLinhas(k, r, la, -10, W + 10, 290, 434, 1.4, (x, y) => 0.4 + (y - 290) / 500);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(-10, 300);
    k.lineTo(W + 10, 290);
    k.stroke();
    for (const [x, y, rx, ry] of [[420, 330, 70, 7], [620, 350, 90, 9], [800, 318, 60, 6], [520, 396, 80, 9], [760, 404, 70, 8], [380, 412, 50, 7]]) {
      const p = seixo(r, x, y, rx, ry, 0, 0.12);
      k.fillStyle = '#e4e2cc';
      k.fill(p);
      k.save();
      k.clip(p);
      agua(k, r, x - rx, y - ry, x + rx, y + ry, 'rgba(43,33,18,.55)');
      k.restore();
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.3;
      k.stroke(p);
    }
    for (let i = 0; i < 16; i++) {
      const x = 384 + r() * 520;
      const y = 316 + r() * 96;
      const e = 0.5 + (y - 300) / 220;
      const rx = (18 + r() * 14) * e;
      copaGravada(k, r, x, y - rx * 0.6, rx, rx * 0.66, { cor: '#9c9663' });
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.4;
      for (let j = -1; j <= 1; j++) { k.beginPath(); k.moveTo(x + j * rx * 0.25, y); k.lineTo(x + j * rx * 0.15, y - rx * 0.45); k.stroke(); }
      k.beginPath();
      k.moveTo(x - rx * 0.6, y + 1);
      k.lineTo(x + rx * 0.6, y + 1);
      k.stroke();
    }
    // o barranco da margem de lá, que desce para o leito
    const barr = pol([[-10, 434], [W + 10, 424], [W + 10, 440], [-10, 452]]);
    peca(k, barr, [-10, 424, W + 10, 452], { cor: '#c2a878', ang: Math.PI / 2, passo: 3.4, maxL: 1.4, sombra: () => 0.55, cruzada: 1, traco: 1.6 });
    // o leito seco: lama clara, rachada em placas, com seixos e as marcas da correnteza
    const lt = new Path2D();
    lt.moveTo(-10, 452);
    lt.bezierCurveTo(300, 444, 600, 440, W + 10, 436);
    lt.lineTo(W + 10, 660);
    lt.bezierCurveTo(600, 668, 300, 676, -10, 680);
    lt.closePath();
    k.fillStyle = '#dcc79c';
    k.fill(lt);
    chaoEmLinhas(k, r, lt, -10, W + 10, 436, 680, 1.5, (x, y) => 0.35 + (y - 440) / 600);
    // as placas de lama rachada
    k.save();
    k.clip(lt);
    k.strokeStyle = SEPIA;
    for (let i = 0; i < 70; i++) {
      const x = 260 + r() * 640;
      const y = 450 + r() * 220;
      const e = 0.6 + (y - 440) / 300;
      k.lineWidth = 0.9 + e * 0.6;
      k.beginPath();
      k.moveTo(x, y);
      let px = x;
      let py = y;
      for (let j = 0; j < 3; j++) { px += (r() - 0.3) * 30 * e; py += (r() - 0.5) * 10 * e; k.lineTo(px, py); }
      k.stroke();
    }
    // as ondulações que a água deixou na areia
    k.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) {
      const x = 300 + r() * 560;
      const y = 460 + r() * 190;
      k.beginPath();
      k.moveTo(x, y);
      for (let j = 1; j <= 6; j++) k.quadraticCurveTo(x + j * 9 - 4.5, y + (j % 2 ? -3 : 3), x + j * 9, y);
      k.stroke();
    }
    k.restore();
    for (let i = 0; i < 40; i++) {
      const y = 456 + r() * 210;
      const x = 280 + r() * 620;
      const s = 4 + (y - 440) / 22 + r() * 5;
      const p = seixo(r, x, y, s, s * 0.6, (r() - 0.5) * 0.5, 0.12);
      peca(k, p, [x - s, y - s, x + s, y + s], { cor: r() < 0.5 ? '#cdbb92' : '#bfa97e', sombra: sombraOval(x, y, s, s * 0.6, 0), passo: 2.4, maxL: 1.1, traco: 1.2 });
    }
    // a muralha de água (3.16, "formou-se uma muralha"): o rio vem de longe, dos morros do fundo,
    // em S entre as margens, e aqui a água se levanta e para, como uma onda que ficou de pé: o
    // alto sobe até a crista, a crista se enrola num lábio que não cai, e a face côncava, escura,
    // dá para o leito seco. As linhas da água acompanham a curva da onda (deitadas, dobrando
    // para baixo só debaixo do lábio), mais juntas e escuras embaixo; uma faixa mais clara logo
    // abaixo da crista; a espuma é uma renda partida só no lábio; no pé, só a linha molhada.
    k.lineCap = 'round';
    // o valor de uma curva amostrada, interpolado entre as amostras (v no eixo a, devolve o b)
    const lerpEm = (pts, a, b) => (v) => { for (let i = 1; i < pts.length; i++) { const p = pts[i - 1]; const q = pts[i]; if ((v - p[a]) * (v - q[a]) <= 0) return p[b] + (q[b] - p[b]) * ((v - p[a]) / ((q[a] - p[a]) || 1)); } return v < pts[0][a] ? pts[0][b] : pts[pts.length - 1][b]; };
    // o rio que vem de longe: uma faixa em S, estreita nos morros e larga perto, que entra
    // pelas costas da muralha na altura do alto dela (a parte de baixo fica coberta pela água)
    const eixoR = bezier([214, 236], [300, 252], [40, 262], [90, 300], 30);
    const meiaR = (t) => 8 + t * 34 + t * t * 60;
    const rioE = eixoR.map(([x, y], i) => [x - meiaR(i / 30), y]);
    const rioD = eixoR.map(([x, y], i) => [x + meiaR(i / 30), y]);
    const rio = pol([...rioE, [rioE[30][0], 330], [rioD[30][0], 330], ...rioD.slice().reverse()]);
    k.fillStyle = '#8f917e';
    k.fill(rio);
    k.save();
    k.clip(rio);
    for (let y = 236, p = 1.6; y < 330; y += p, p = Math.min(4, p * 1.08)) {
      const t = (y - 236) / 70;
      let x = -10 - r() * 30;
      while (x < 330) {
        const c = 6 + t * 40 + r() * 20;
        k.strokeStyle = r() < 0.12 ? 'rgba(240,240,228,.8)' : 'rgba(30,34,26,' + Math.min(0.85, 0.5 + t * 0.35).toFixed(2) + ')';
        k.lineWidth = 0.5 + Math.min(1, t) * 1.1;
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x + c / 2, y + (r() - 0.5) * 2, x + c, y);
        k.stroke();
        x += c + 3 + r() * 10;
      }
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.4;
    for (const m of [rioE, rioD]) { k.beginPath(); m.forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y))); k.stroke(); }
    marcar(k, obj, rio);
    // a muralha: o alto é largo e quase plano (sobe pouco da esquerda até perto do lábio), com
    // umas ondinhas baixas; o lábio é fino e agudo, pendurado para a frente sobre o oco escuro
    // da onda; a face côncava desce até o pé
    const pe = 690;
    const altoLiso = bezier([-10, 300], [90, 280], [170, 262], [250, 256], 20).concat(bezier([250, 256], [300, 253], [340, 250], [372, 248], 8).slice(1));
    const picos = [[96, -5, 22], [168, 6, 18], [232, -6, 20], [300, 5, 16]];
    const ondinha = (x) => picos.reduce((s2, [c, a, l]) => s2 + a * Math.max(0, 1 - Math.abs(x - c) / l), 0);
    const alto = [];
    for (let x = -10; x <= 372; x += 4) alto.push([x, lerpEm(altoLiso, 0, 1)(x) + ondinha(x)]);
    const labio = bezier([372, 248], [392, 242], [414, 246], [424, 262], 10);
    const debaixo = bezier([424, 262], [410, 259], [394, 262], [380, 276], 8);
    const face = bezier([380, 276], [348, 320], [326, 470], [348, 610], 24).concat(bezier([348, 610], [362, 656], [386, 680], [410, pe], 8).slice(1));
    const perfil = [...alto, ...labio.slice(1), ...debaixo.slice(1), ...face.slice(1)];
    const muralha = pol([...perfil, [-10, pe]]);
    const faceX = lerpEm(face, 1, 0);
    const altoY = lerpEm(altoLiso, 0, 1);
    k.fillStyle = '#585b4c';
    k.fill(muralha);
    marcar(k, obj, muralha);
    k.save();
    k.clip(muralha);
    // a faixa clara, translúcida, logo abaixo do alto
    const faixa = pol([...alto, ...labio.slice(1, 6), ...alto.slice().reverse().map(([x]) => [x, altoY(x) + 28 + (x + 10) * 0.04])]);
    k.fillStyle = '#7f826e';
    k.fill(faixa);
    // as linhas da água: deitadas, seguem o alto (sem as ondinhas) e, perto da face, dobram
    // para baixo por dentro do oco; mais juntas e mais escuras embaixo
    for (let d = 4, p = 7; d < 440; d += p, p = Math.max(3.6, p * 0.985)) {
      const t = d / 440;
      const pts = [];
      for (let x = -10; x <= 420; x += 6) {
        const yTopo = altoY(Math.min(x, 372));
        let y = yTopo + d * (1 - Math.max(0, (x - 240) / 300) * 0.2);
        const fx = faceX(y) - 6;
        if (x > fx - 50) { const u = Math.min(1, (x - (fx - 50)) / 50); y += u * u * 30; if (x > faceX(y) - 4) break; }
        pts.push([x, y + Math.sin(x * 0.04 + d * 0.3) * 1.6]);
      }
      const fase = r() * 6.283;
      const corte = r() < 0.5 ? -1 : Math.floor(r() * pts.length);
      for (let i = 1; i < pts.length; i++) {
        if (i === corte || i === corte + 1) continue;
        k.strokeStyle = 'rgba(18,20,14,' + (0.45 + t * 0.5).toFixed(2) + ')';
        k.lineWidth = 0.8 + t * 1.8 + Math.sin(i * 0.3 + fase) * 0.3;
        k.beginPath();
        k.moveTo(pts[i - 1][0], pts[i - 1][1]);
        k.lineTo(pts[i][0], pts[i][1]);
        k.stroke();
      }
    }
    // o oco da onda, debaixo do lábio: em linha cheia que acompanha a curva de dentro, mais
    // escuro colado na face e sumindo para dentro e para baixo
    for (let dx = 2; dx < 40; dx += 2.2) {
      const u = dx / 40;
      k.strokeStyle = 'rgba(16,18,12,' + (0.85 - u * 0.7).toFixed(2) + ')';
      k.lineWidth = 1.6 - u * 0.8;
      k.beginPath();
      const ate = Math.round(12 - u * 6);
      face.slice(0, ate).forEach(([x, y], q) => (q ? k.lineTo(x - dx * (1 - q / (ate * 1.6)), y) : k.moveTo(x - dx * 0.7, y - 6 + u * 4)));
      k.stroke();
    }
    // dentro do oco, três linhas claras que acompanham a curva de dentro da onda
    for (const [dx, al] of [[8, 0.42], [18, 0.3], [30, 0.2]]) {
      k.strokeStyle = 'rgba(176,182,160,' + al + ')';
      k.lineWidth = 1.3;
      k.beginPath();
      face.slice(0, 9).forEach(([x, y], q) => (q ? k.lineTo(x - dx + q * 0.6, y + 2) : k.moveTo(x - dx + 6, y + 4)));
      k.stroke();
    }
    // uns brilhos deitados na água
    k.strokeStyle = 'rgba(236,236,224,.75)';
    for (const [x0, y0, l] of [[60, 420, 90], [180, 350, 70], [120, 480, 110], [250, 300, 50]]) { k.lineWidth = 1.6; k.beginPath(); k.moveTo(x0, y0); k.quadraticCurveTo(x0 + l / 2, y0 - 5, x0 + l, y0 + 2); k.stroke(); }
    k.restore();
    // as beiradas: o alto e o lábio, firmes; a face, firme
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.2;
    k.beginPath();
    perfil.forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
    k.stroke();
    // a renda de espuma, partida, só na ponta do lábio e na barriga dele: traços curtos
    // deitados ao longo da beirada, não espetados para fora
    const beira = [...labio.slice(5), ...debaixo.slice(1)];
    for (let q = 1; q < beira.length; q++) {
      if (r() < 0.3) continue;
      const [x0, y0] = beira[q - 1];
      const [x1, y1] = beira[q];
      k.strokeStyle = 'rgba(252,251,244,.95)';
      k.lineWidth = 1.4 + r() * 1.2;
      k.beginPath();
      k.moveTo(x0 + (x1 - x0) * 0.15, y0 + (y1 - y0) * 0.15 + 1);
      k.lineTo(x0 + (x1 - x0) * 0.85, y0 + (y1 - y0) * 0.85 + 1);
      k.stroke();
    }
    // umas gotas de água clara que caem da ponta do lábio
    for (const [x, y, s2] of [[421, 276, 1.6], [418, 298, 1.3], [420, 324, 1.1]]) {
      k.beginPath();
      k.ellipse(x, y, s2 * 1.2, s2 * 2.2, 0, 0, 6.283);
      k.fillStyle = 'rgba(232,234,222,.85)';
      k.fill();
      k.strokeStyle = 'rgba(30,34,26,.7)';
      k.lineWidth = 0.7;
      k.stroke();
    }
    // a margem de cá: lama escura, alagada em poças, com os juncos
    const ca = new Path2D();
    ca.moveTo(-10, 676);
    ca.bezierCurveTo(300, 672, 600, 662, W + 10, 656);
    ca.lineTo(W + 10, H + 10);
    ca.lineTo(-10, H + 10);
    ca.closePath();
    k.fillStyle = '#b9a173';
    k.fill(ca);
    chaoEmLinhas(k, r, ca, -10, W + 10, 656, H, 2.2, (x, y) => 0.55 + (y - 660) / 400);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(ca);
    // no pé da muralha, a areia molhada onde a água encosta no leito seco: uma faixa escura
    // logo acima da margem de cá, da face até um pouco à direita
    k.save();
    const beiraCa = bezier([-10, 676], [300, 672], [600, 662], [W + 10, 656], 80);
    const caY = lerpEm(beiraCa, 0, 1);
    k.lineCap = 'round';
    for (const [off, ate, lw] of [[-2.5, 540, 2.2], [-5.5, 490, 1.6], [-8.5, 440, 1.2]]) {
      k.strokeStyle = 'rgba(46,36,20,.8)';
      k.lineWidth = lw;
      k.beginPath();
      for (let x = 352; x <= ate; x += 6) (x === 352 ? k.moveTo(x, caY(x) + off) : k.lineTo(x, caY(x) + off + Math.sin(x * 0.3) * 0.6));
      k.stroke();
    }
    k.restore();
    for (const [x, y, rx] of [[120, 760, 110], [760, 800, 90], [400, 820, 60]]) {
      const p = seixo(r, x, y, rx, rx * 0.16, 0, 0.1);
      k.fillStyle = '#e4e2cc';
      k.fill(p);
      agua(k, r, x - rx, y - rx * 0.16, x + rx, y + rx * 0.16, 'rgba(43,33,18,.5)');
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.4;
      k.stroke(p);
    }
    for (const [x, n] of [[50, 9], [250, 6], [840, 9], [690, 5]]) {
      for (let i = 0; i < n; i++) {
        // o junco da beira: a vara fina e alta, as folhas em fita e o penacho
        const bx = x + (r() - 0.5) * 60;
        const by = 720 + r() * 120;
        const h = 90 + r() * 70;
        const g = (r() - 0.5) * 0.3;
        k.strokeStyle = SEPIA;
        k.lineCap = 'round';
        k.lineWidth = 2.2;
        k.beginPath();
        k.moveTo(bx, by);
        k.quadraticCurveTo(bx + g * h * 0.3, by - h / 2, bx + g * h, by - h);
        k.stroke();
        for (let j = 0; j < 3; j++) { const yy = by - h * (0.25 + j * 0.2); const lado = j % 2 ? 1 : -1; k.lineWidth = 1.4; k.beginPath(); k.moveTo(bx + g * h * (0.25 + j * 0.2), yy); k.quadraticCurveTo(bx + lado * 26, yy - 10, bx + lado * 40, yy + 16); k.stroke(); }
        k.lineWidth = 1;
        for (let j = 0; j < 7; j++) { const tx = bx + g * h; const ty = by - h; k.beginPath(); k.moveTo(tx, ty); k.quadraticCurveTo(tx + 6 + j * 2, ty - 8, tx + 10 + j * 3, ty + 4 + j * 3); k.stroke(); }
      }
    }
    // as pegadas molhadas dos sacerdotes: saem da margem de cá e entram no leito, em pares,
    // escuras de lama molhada, e param juntas no meio do leito (3.17)
    const pegada = (x, y, e, g) => {
      k.save();
      k.translate(x, y);
      k.rotate(g);
      k.scale(e, e);
      const sola = new Path2D();
      sola.ellipse(0, -6, 8, 13, 0, 0, 6.283);
      const calc = new Path2D();
      calc.ellipse(0, 12, 6.5, 7.5, 0, 0, 6.283);
      for (const p of [sola, calc]) {
        k.fillStyle = 'rgba(58,40,18,.88)';
        k.fill(p);
        k.strokeStyle = 'rgba(255,246,220,.75)';
        k.lineWidth = 1.4 / e;
        k.stroke(p);
      }
      k.fillStyle = 'rgba(200,214,206,.5)';
      k.beginPath();
      k.ellipse(-2, -9, 3, 5, 0, 0, 6.283);
      k.fill();
      k.restore();
    };
    const passos = [[640, 812, 1.25], [602, 748, 1.1], [566, 692, 0.95], [538, 646, 0.82], [514, 608, 0.72], [494, 576, 0.64], [478, 550, 0.57]];
    passos.forEach(([x, y, e], i) => pegada(x + (i % 2 ? 14 : -14) * e, y, e, -0.5));
    // onde pararam: dois pares lado a lado, e a marca molhada em volta
    const parada = new Path2D();
    parada.ellipse(462, 520, 70, 16, -0.05, 0, 6.283);
    k.fillStyle = 'rgba(96,74,40,.28)';
    k.fill(parada);
    for (const [x, y] of [[436, 516], [456, 512], [482, 520], [502, 516]]) pegada(x, y, 0.55, -0.1);
    vinheta(k, W, H, 0.22);
  }

  // (6) Jerusalém (2 Sm 5.7-9), a capa dos Lugares: "Davi e os seus soldados os derrotaram e
  // tomaram a fortaleza de Sião, que depois se chamou Cidade de Davi... Começando por Milo,
  // Davi foi construindo defesas até o palácio." Do outro lado do vale do Cedrom, ao entardecer:
  // a crista estreita da Cidade de Davi, que sobe para a direita (para o norte); a fortaleza
  // de Sião no alto, com as torres; a muralha de torre em torre pela encosta; as casas de
  // pedra apertadas em degraus dentro dela; o Milo, os terraços de pedra que seguram a encosta
  // debaixo da fortaleza; embaixo, no vale, a boca do canal de água cortada na rocha (5.8),
  // com a água que sai para o tanque. Na frente, as oliveiras da encosta de cá.
  function desenhoJerusalem(k, W, H, obj) {
    const r = sorteio(6601);
    papelVelho(k, W, H, r, ['#fdf1d4', '#f1d9a8', '#d2ad74'], [W * 0.15, 160]);
    // o céu do entardecer: linhas, e as nuvens compridas em faixas de traço, acesas embaixo
    linhas(k, 0, 0, W, 330, 5.5, 1.8, (x, y) => 0.12 + (1 - y / 330) * 0.6 + x / 2500, '#3a2610');
    for (const [x, y, l, n] of [[520, 52, 380, 5], [150, 118, 240, 4], [700, 150, 200, 3], [330, 190, 160, 3]]) {
      for (let i = 0; i < n; i++) {
        const yy = y + i * 7;
        const a = x - l / 2 + (r() - 0.5) * 40 + i * 14;
        const b = x + l / 2 + (r() - 0.5) * 40 - i * 20;
        k.fillStyle = '#fbe9c6';
        k.fillRect(a, yy - 3, b - a, 7);
        k.strokeStyle = SEPIA;
        k.lineWidth = 1.6 - i * 0.2;
        k.beginPath();
        k.moveTo(a, yy - 3);
        k.quadraticCurveTo((a + b) / 2, yy - 6, b, yy - 3);
        k.stroke();
        k.strokeStyle = 'rgba(206,110,40,.85)';
        k.lineWidth = 2;
        k.beginPath();
        k.moveTo(a + 10, yy + 4);
        k.lineTo(b - 10, yy + 4);
        k.stroke();
      }
    }
    // os montes de trás, claros e longe
    const fm = onda(r, 4, 0.006);
    const atras = pol([[-10, 380], ...Array.from({ length: 48 }, (_, i) => [i * 19 - 4, 292 + fm(i * 19) * 18]), [W + 10, 380]]);
    peca(k, atras, [-10, 240, W + 10, 380], { cor: '#ecd6a8', ang: 0, passo: 5, maxL: 1.1, sombra: () => 0.3, cruzada: 1, traco: 1.4 });
    // o morro da Cidade de Davi: a crista sobe para a direita; o pé, no vale, à esquerda
    const crista = (x) => 352 - x * 0.17 + Math.sin(x * 0.014) * 6;
    const muroY = (x) => crista(x) + 150 - x * 0.03;
    const morro = new Path2D();
    morro.moveTo(-10, 680);
    morro.lineTo(-10, crista(-10) + 20);
    for (let x = -10; x <= W + 10; x += 10) morro.lineTo(x, crista(x) + 20);
    morro.lineTo(W + 10, 640);
    morro.closePath();
    k.fillStyle = '#d6b884';
    k.fill(morro);
    chaoEmLinhas(k, r, morro, -10, W + 10, 230, 690, 1.9, (x, y) => 0.42 + (y - crista(x)) / 700 + Math.sin(x * 0.04 + y * 0.01) * 0.12);
    // a encosta: afloramentos de rocha em camadas e os arbustos baixos
    for (let i = 0; i < 16; i++) {
      const x = r() * 560;
      const y = muroY(x) + 30 + r() * (600 - muroY(x));
      const w = 30 + r() * 50;
      const p = contornoRocha(r, [[x - w / 2, y + 6], [x - w / 2 + 6, y - 6], [x + w / 2 - 4, y - 8], [x + w / 2, y + 6]], 3);
      p.closePath();
      peca(k, p, [x - w / 2, y - 8, x + w / 2, y + 6], { cor: '#e6cc98', ang: 0, passo: 2.8, maxL: 1.2, sombra: (px, py) => 0.25 + (py - y + 8) / 20, traco: 1.4 });
    }
    for (let i = 0; i < 22; i++) {
      const x = r() * 600;
      const y = muroY(x) + 24 + r() * (620 - muroY(x));
      copaGravada(k, r, x, y, 9 + r() * 6, 6 + r() * 3, { cor: '#a39d6c' });
    }
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(morro);
    // as casas dentro da muralha, em degraus, de cima (atrás) para baixo (na frente)
    const fx = 610;
    const casas = [];
    for (let fileira = 0; fileira < 7; fileira++) {
      let x = -30 + (fileira % 2) * 16 + r() * 14;
      while (x < fx + 20) {
        const w = 30 + r() * 30;
        const base = crista(x) + 34 + fileira * 17 + r() * 5;
        if (base < muroY(x) - 40) casas.push({ x, base, w, h: 22 + r() * 18 + (r() < 0.2 ? 16 : 0), d: 14 + r() * 8 });
        x += w - 2 + r() * 10;
      }
    }
    casas.sort((a, b) => a.base - b.base);
    for (const c of casas) {
      casinha(k, r, c.x, c.base, c.w, c.h, c.d, { cor: r() < 0.5 ? '#f5e3b8' : '#ecd5a4', lado: '#a98450', teto: '#e6cc98', traco: 1.2, janela: r() < 0.7, porta: r() < 0.4, obj });
      // às vezes, o quarto de cima no terraço
      if (r() < 0.22) casinha(k, r, c.x + c.w * 0.5, c.base - c.h - c.d * 0.2, c.w * 0.4, 14, c.d * 0.6, { cor: '#f5e3b8', lado: '#a98450', teto: '#e6cc98', traco: 1, porta: true, janela: false, obj });
    }
    // a muralha da cidade, de torre em torre, até a fortaleza
    const altM = 52;
    const muro = new Path2D();
    muro.moveTo(-10, muroY(-10));
    for (let x = -10; x <= fx + 20; x += 10) muro.lineTo(x, muroY(x) - altM);
    for (let x = fx + 20; x >= -10; x -= 10) muro.lineTo(x, muroY(x));
    muro.closePath();
    muroEmFiadas(k, r, muro, [-10, muroY(fx) - altM - 4, fx + 20, muroY(-10) + 4], { h: 9, cor: '#efd8a6', sombra: () => 0.32 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(muro);
    marcar(k, obj, muro);
    for (let x = -6; x < fx + 10; x += 16) {
      const y = muroY(x) - altM;
      const am = pol([[x, y + 1], [x, y - 10], [x + 9, y - 10.4], [x + 9, y + 1]]);
      k.fillStyle = '#efd8a6';
      k.fill(am);
      k.lineWidth = 1.2;
      k.stroke(am);
      marcar(k, obj, am);
    }
    // a sombra da muralha na encosta, embaixo dela
    k.save();
    k.clip(morro);
    k.fillStyle = 'rgba(70,46,18,.22)';
    k.beginPath();
    k.moveTo(-10, muroY(-10));
    for (let x = -10; x <= fx + 20; x += 10) k.lineTo(x, muroY(x));
    for (let x = fx + 20; x >= -10; x -= 10) k.lineTo(x, muroY(x) + 16);
    k.fill();
    k.restore();
    // uma torre: o corpo em fiadas, o lado na sombra, as ameias e a seteira
    const torre = (tx, yb, tw, th) => {
      const t = pol([[tx, yb], [tx, yb - th], [tx + tw, yb - th - 2], [tx + tw, yb]]);
      muroEmFiadas(k, r, t, [tx, yb - th - 4, tx + tw, yb], { h: 9, larg: 2, cor: '#f5e4b8', sombra: (x) => 0.18 + (x - tx) / tw * 0.4 });
      const lt = pol([[tx + tw, yb], [tx + tw, yb - th - 2], [tx + tw + tw * 0.28, yb - th - 10], [tx + tw + tw * 0.28, yb - 8]]);
      peca(k, lt, [tx + tw, yb - th - 10, tx + tw * 1.28, yb], { cor: '#c19e68', ang: 1.45, passo: 2.6, maxL: 1.4, sombra: () => 0.8, traco: 1.4, obj });
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.8;
      k.stroke(t);
      marcar(k, obj, t);
      const n = Math.max(3, Math.round(tw / 15));
      for (let a = 0; a < n; a++) {
        const ax = tx + 1 + a * (tw / n);
        const am = pol([[ax, yb - th], [ax, yb - th - 12], [ax + tw / n - 5, yb - th - 12], [ax + tw / n - 5, yb - th]]);
        k.fillStyle = '#f5e4b8';
        k.fill(am);
        k.lineWidth = 1.2;
        k.stroke(am);
        marcar(k, obj, am);
      }
      k.fillStyle = '#3a2a14';
      for (let y = yb - th + 20; y < yb - 20; y += 34) k.fillRect(tx + tw / 2 - 3, y, 6, 14);
    };
    for (const tx of [30, 150, 272, 392, 506]) torre(tx, muroY(tx) + 4, 42, altM + 36);
    // a porta da cidade, na muralha
    const px = 210;
    const py = muroY(px);
    const pt = new Path2D();
    pt.moveTo(px - 15, py);
    pt.lineTo(px - 15, py - 26);
    pt.arc(px, py - 26, 15, Math.PI, 0);
    pt.lineTo(px + 15, py);
    pt.closePath();
    k.fillStyle = '#2a1e0e';
    k.fill(pt);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(pt);
    // a fortaleza de Sião no alto: o corpo largo, as duas torres altas e o portal
    const fb = muroY(fx + 120) + 10;
    const forte = pol([[fx, fb], [fx, fb - 150], [fx + 220, fb - 162], [fx + 220, fb]]);
    muroEmFiadas(k, r, forte, [fx, fb - 164, fx + 220, fb], { h: 10, cor: '#f2ddac', sombra: (x) => 0.22 + (x - fx) / 900 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(forte);
    marcar(k, obj, forte);
    for (let a = fx + 2; a < fx + 216; a += 16) {
      const y = fb - 150 - (a - fx) / 220 * 12;
      const am = pol([[a, y + 1], [a, y - 11], [a + 10, y - 11.5], [a + 10, y + 1]]);
      k.fillStyle = '#f2ddac';
      k.fill(am);
      k.lineWidth = 1.2;
      k.stroke(am);
      marcar(k, obj, am);
    }
    const ladoF = pol([[fx + 220, fb], [fx + 220, fb - 162], [fx + 262, fb - 180], [fx + 262, fb - 20]]);
    peca(k, ladoF, [fx + 220, fb - 180, fx + 262, fb], { cor: '#c19e68', ang: 1.45, passo: 3, maxL: 1.5, sombra: () => 0.75, cruzada: 0.6, traco: 1.8, obj });
    torre(fx - 24, fb, 62, 210);
    torre(fx + 150, fb, 66, 230);
    const portal = new Path2D();
    portal.moveTo(fx + 82, fb);
    portal.lineTo(fx + 82, fb - 50);
    portal.arc(fx + 104, fb - 50, 22, Math.PI, 0);
    portal.lineTo(fx + 126, fb);
    portal.closePath();
    k.fillStyle = '#2a1e0e';
    k.fill(portal);
    k.stroke(portal);
    for (const [x, y] of [[fx + 60, fb - 110], [fx + 140, fb - 116]]) { k.fillRect(x, y, 8, 16); }
    // o Milo: os terraços de pedra que seguram a encosta debaixo da fortaleza, cada degrau com
    // o muro de arrimo e a terra em cima, com tufos
    for (let i = 0; i < 7; i++) {
      const y0 = fb + 6 + i * 26;
      const xa = fx + 20 - i * 26;
      const xb = W + 10;
      const frente = pol([[xa, y0 + 18], [xa + 4, y0], [xb, y0 - 8], [xb, y0 + 12]]);
      muroEmFiadas(k, r, frente, [xa, y0 - 10, xb, y0 + 18], { h: 6, larg: 2.4, cor: '#e9cd98', sombra: () => 0.45 + i * 0.03 });
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.5;
      k.stroke(frente);
      const topo = pol([[xa + 4, y0], [xb, y0 - 8], [xb, y0 - 14], [xa + 10, y0 - 6]]);
      k.fillStyle = '#cbb07c';
      k.fill(topo);
      for (let j = 0; j < 4; j++) capim(k, r, xa + 30 + r() * (xb - xa - 40), y0 - 4, 9, 5);
    }
    // o vale do Cedrom: o fundo, a boca do canal de água na rocha e o tanque
    const vale = new Path2D();
    vale.moveTo(-10, 650);
    vale.bezierCurveTo(300, 660, 600, 640, W + 10, 620);
    vale.lineTo(W + 10, 720);
    vale.lineTo(-10, 730);
    vale.closePath();
    k.fillStyle = '#c4a473';
    k.fill(vale);
    chaoEmLinhas(k, r, vale, -10, W + 10, 620, 730, 2, () => 0.75);
    const gx = 250;
    const gy = 640;
    // a rocha cortada ao pé do morro: uma face plana aberta pelo homem, e a boca baixa e
    // quadrada do canal
    const corte = pol([[gx - 90, gy + 16], [gx - 86, gy - 64], [gx - 40, gy - 70], [gx + 50, gy - 74], [gx + 96, gy - 66], [gx + 100, gy + 16]]);
    sombraNoChao(k, corte, 6, 6, 5, 0.3);
    peca(k, corte, [gx - 90, gy - 74, gx + 100, gy + 16], { cor: '#e2c99a', ang: 0, passo: 3.4, maxL: 1.3, sombra: (x) => 0.3 + (x - gx) / 500, cruzada: 1, traco: 1.8 });
    k.save();
    k.clip(corte);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) { const x = gx - 86 + r() * 180; const y = gy - 66 + r() * 76; k.beginPath(); k.moveTo(x, y); k.lineTo(x + 3, y + 7); k.stroke(); }
    k.restore();
    const boca = pol([[gx - 16, gy + 10], [gx - 16, gy - 30], [gx + 22, gy - 31], [gx + 22, gy + 10]]);
    k.fillStyle = '#1e160c';
    k.fill(boca);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(boca);
    // a água que sai da boca, desce em degraus de pedra e chega ao tanque
    const tanque = pol([[gx - 90, gy + 30], [gx + 130, gy + 26], [gx + 150, gy + 58], [gx - 110, gy + 62]]);
    muroEmFiadas(k, r, pol([[gx - 110, gy + 62], [gx + 150, gy + 58], [gx + 150, gy + 70], [gx - 110, gy + 74]]), [gx - 110, gy + 56, gx + 150, gy + 76], { h: 6, larg: 2, cor: '#dcc092' });
    k.fillStyle = '#dfe2cf';
    k.fill(tanque);
    agua(k, r, gx - 104, gy + 30, gx + 146, gy + 60, 'rgba(43,33,18,.6)');
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(tanque);
    k.fillStyle = '#e6e8d8';
    k.fillRect(gx - 12, gy + 10, 30, 18);
    k.strokeStyle = 'rgba(38,49,44,.8)';
    k.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { k.beginPath(); k.moveTo(gx - 10 + i * 5, gy + 10); k.lineTo(gx - 9 + i * 5, gy + 28); k.stroke(); }
    // a encosta de cá, escura, com as oliveiras e as pedras
    const ca = new Path2D();
    ca.moveTo(-10, 730);
    ca.bezierCurveTo(260, 700, 560, 712, W + 10, 690);
    ca.lineTo(W + 10, H + 10);
    ca.lineTo(-10, H + 10);
    ca.closePath();
    k.fillStyle = '#9c7848';
    k.fill(ca);
    chaoEmLinhas(k, r, ca, -10, W + 10, 690, H, 2.6, (x, y) => 0.7 + (y - 700) / 300);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(ca);
    for (const [x, y, e] of [[60, 820, 1.5], [196, 790, 1.05], [610, 760, 0.85], [760, 812, 1.55], [886, 760, 1.15]]) {
      // a oliveira: o tronco torto e retorcido, a copa em tufos ralos de folha cinza
      const tr = new Path2D();
      tr.moveTo(x - 9 * e, y);
      tr.bezierCurveTo(x - 20 * e, y - 22 * e, x + 12 * e, y - 30 * e, x - 4 * e, y - 54 * e);
      tr.lineTo(x + 8 * e, y - 54 * e);
      tr.bezierCurveTo(x + 24 * e, y - 30 * e, x - 2 * e, y - 22 * e, x + 9 * e, y);
      tr.closePath();
      peca(k, tr, [x - 20 * e, y - 54 * e, x + 24 * e, y], { cor: '#8e7a55', ang: 1.4, passo: 2.4, maxL: 1.3, sombra: (px) => 0.3 + (px - x) / (30 * e), traco: 1.6, obj });
      for (const [dx, dy, rx] of [[-28, -66, 30], [24, -70, 28], [0, -90, 30], [-44, -50, 20], [42, -52, 20]]) copaGravada(k, r, x + dx * e, y + dy * e, rx * e, rx * e * 0.6, { cor: '#adab80', obj });
    }
    for (let i = 0; i < 10; i++) {
      const x = 260 + r() * 340;
      const y = 740 + r() * 90;
      const s = 6 + (y - 700) / 14 + r() * 6;
      const p = seixo(r, x, y, s, s * 0.6, 0, 0.18);
      peca(k, p, [x - s, y - s, x + s, y + s], { cor: '#c7a878', sombra: sombraOval(x, y, s, s * 0.6, 0), passo: 2.4, maxL: 1.2, traco: 1.4 });
    }
    vinheta(k, W, H, 0.22);
  }

  // (7) Os rios da Babilônia (Sl 137.1-2): "Junto aos rios da Babilônia nós nos sentamos e
  // choramos, lembrando de Sião. Pendurávamos os nossos instrumentos musicais, as harpas e as
  // liras, nos galhos dos salgueiros." A margem de um canal, num fim de tarde nublado: o
  // salgueiro de copa caída à esquerda, com um galho comprido que avança sobre a água; dele
  // pendem, por cordões, uma lira e uma harpa, caladas; a água parada, com o reflexo delas;
  // do outro lado, longe e na névoa, a muralha e a torre de degraus da Babilônia.
  function desenhoBabilonia(k, W, H, obj) {
    const r = sorteio(6701);
    papelVelho(k, W, H, r, ['#f2ecdc', '#ded3b8', '#bbac8a'], [W * 0.72, 300]);
    const hz = 520;
    // o céu nublado: linhas cheias, com as nuvens baixas em faixas de traço
    linhas(k, 0, 0, W, hz, 5, 1.6, (x, y) => 0.3 + Math.sin(y * 0.025 + x * 0.002) * 0.1 + (1 - y / hz) * 0.25);
    for (const [y, x0, x1] of [[150, 380, 920], [240, -20, 470], [330, 480, 920]]) {
      for (let i = 0; i < 3; i++) {
        const yy = y + i * 8;
        const a = x0 + i * 30 + r() * 30;
        const b = x1 - i * 40 - r() * 30;
        k.fillStyle = '#ebe3cc';
        k.fillRect(a, yy - 4, b - a, 8);
        k.strokeStyle = 'rgba(43,33,18,.75)';
        k.lineWidth = 1.4;
        k.beginPath();
        k.moveTo(a, yy + 4);
        k.lineTo(b, yy + 4);
        k.stroke();
      }
    }
    // a cidade de lá, clara na névoa: a muralha com ameias, as casas e a torre de degraus
    const cx = 548;
    let yb = hz - 18;
    for (const [m, h] of [[84, 40], [66, 34], [48, 28], [32, 24], [18, 18]]) {
      const p = pol([[cx - m, yb], [cx - m + 6, yb - h], [cx + m - 6, yb - h], [cx + m, yb]]);
      peca(k, p, [cx - m, yb - h, cx + m, yb], { cor: '#ddd3b8', ang: 0, passo: 3.4, maxL: 1, sombra: (x) => 0.28 + (x - cx + m) / (2 * m) * 0.4, cruzada: 1, traco: 1.3 });
      yb -= h;
    }
    k.fillStyle = '#ddd3b8';
    k.fillRect(cx - 12, yb - 20, 24, 20);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.2;
    k.strokeRect(cx - 12, yb - 20, 24, 20);
    peca(k, pol([[cx - 12, hz - 18], [cx - 6, yb], [cx + 6, yb], [cx + 12, hz - 18]]), [cx - 12, yb, cx + 12, hz - 18], { cor: '#cbbf9f', sombra: () => 0.5, passo: 2.6, maxL: 0.8, traco: 1.1 });
    const muroB = pol([[300, hz], [300, hz - 26], [W + 10, hz - 28], [W + 10, hz]]);
    muroEmFiadas(k, r, muroB, [300, hz - 30, W + 10, hz], { h: 6, larg: 3, cor: '#e2d9bf', traco: 0.8, sombra: () => 0.28 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.2;
    k.stroke(muroB);
    for (let x = 304; x < W; x += 15) { k.fillStyle = '#e2d9bf'; k.fillRect(x, hz - 34, 8, 8); k.strokeRect(x, hz - 34, 8, 8); }
    for (const x of [500, 660, 870]) palmeiraGravada(k, r, x, hz - 4, 56, (r() - 0.5) * 0.3, 0.5);
    // o canal: água parada, em linhas compridas
    const agu = new Path2D();
    agu.rect(-10, hz, W + 20, 200);
    k.fillStyle = '#e4dfca';
    k.fill(agu);
    k.save();
    k.clip(agu);
    k.strokeStyle = SEPIA;
    k.lineCap = 'round';
    for (let y = hz + 3; y < hz + 200; y += 4.4) {
      const t = (y - hz) / 200;
      let x = -10 - r() * 40;
      while (x < W + 10) {
        const c = 40 + r() * 150;
        const refl = (x > cx - 80 && x < cx + 80 && y < hz + 110 ? 0.4 : 0) + (x < 330 ? 0.7 : 0);
        k.lineWidth = (0.5 + t * 0.9) * (0.6 + refl);
        k.beginPath();
        k.moveTo(x, y);
        k.lineTo(x + c, y + (r() - 0.5));
        k.stroke();
        x += c + 6 + r() * 22;
      }
    }
    // o reflexo partido da lira e da harpa, embaixo delas
    k.fillStyle = 'rgba(80,48,18,.5)';
    for (const [x0, x1, y0] of [[338, 470, 66], [632, 778, 82]]) for (let i = 0; i < 10; i++) k.fillRect(x0 + r() * 16, hz + y0 + i * 7, x1 - x0 - r() * 40, 2.2);
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(-10, hz);
    k.lineTo(W + 10, hz);
    k.stroke();
    // a margem de cá
    const mg = new Path2D();
    mg.moveTo(-10, 700);
    mg.bezierCurveTo(300, 690, 600, 716, W + 10, 700);
    mg.lineTo(W + 10, H + 10);
    mg.lineTo(-10, H + 10);
    mg.closePath();
    k.fillStyle = '#c3b088';
    k.fill(mg);
    chaoEmLinhas(k, r, mg, -10, W + 10, 690, H, 2.2, (x, y) => 0.5 + (y - 700) / 300);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(mg);
    for (let i = 0; i < 18; i++) capim(k, r, 300 + r() * 600, 714 + r() * 120, 18 + r() * 18, 7);
    for (let i = 0; i < 7; i++) {
      const x = 360 + r() * 520;
      const y = 730 + r() * 100;
      const s = 8 + r() * 10;
      const p = seixo(r, x, y, s * 1.4, s * 0.7, 0, 0.15);
      peca(k, p, [x - s * 1.4, y - s, x + s * 1.4, y + s], { cor: '#d3c39c', sombra: sombraOval(x, y, s * 1.4, s * 0.7, 0), passo: 2.6, maxL: 1.2, traco: 1.4 });
    }
    // o salgueiro: o tronco grosso e torto, a copa caída em cortina e o galho comprido
    const tx = 150;
    const tronco = new Path2D();
    tronco.moveTo(tx - 70, 720);
    tronco.bezierCurveTo(tx - 40, 620, tx - 70, 480, tx - 30, 330);
    tronco.lineTo(tx + 30, 320);
    tronco.bezierCurveTo(tx + 10, 470, tx + 40, 620, tx + 50, 720);
    tronco.closePath();
    peca(k, tronco, [tx - 70, 320, tx + 50, 720], { cor: '#8a7652', ang: 1.45, passo: 3.4, maxL: 2.3, sombra: (x) => 0.25 + (x - tx + 60) / 110 * 0.7, cruzada: 0.6, traco: 2.4, obj });
    k.save();
    k.clip(tronco);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    for (let i = 0; i < 16; i++) { const y = 340 + r() * 360; const x = tx - 50 + r() * 80; k.beginPath(); k.moveTo(x, y); k.quadraticCurveTo(x + 5, y + 24, x - 3, y + 44 + r() * 30); k.stroke(); }
    k.restore();
    // a copa: cortinas de varas caídas, em camadas (as de trás mais escuras), sem massa chapada
    const vara = (x, y, l, d, cor, tinta) => {
      const fim = [x + d, y + l];
      k.strokeStyle = tinta;
      k.lineWidth = 1;
      k.beginPath();
      k.moveTo(x, y);
      k.quadraticCurveTo(x + d * 0.2, y + l * 0.5, fim[0], fim[1]);
      k.stroke();
      for (let s2 = 0.04; s2 < 1; s2 += 0.05) {
        const px = (1 - s2) * (1 - s2) * x + 2 * (1 - s2) * s2 * (x + d * 0.2) + s2 * s2 * fim[0];
        const py = y + l * s2;
        const lado = Math.round(s2 * 100) % 2 ? -1 : 1;
        k.fillStyle = cor;
        k.beginPath();
        k.ellipse(px + lado * 3.2, py + 3, 1.5, 5.4, lado * 0.4, 0, 6.283);
        k.fill();
        k.strokeStyle = tinta;
        k.lineWidth = 0.7;
        k.stroke();
      }
    };
    for (const [n, cor, tinta, y0, y1] of [[130, '#5e5c3a', 'rgba(30,24,12,.9)', 30, 130], [140, '#7a774c', 'rgba(36,28,14,.88)', 50, 200], [110, '#9a976a', 'rgba(43,33,18,.8)', 100, 290]]) {
      for (let i = 0; i < n; i++) {
        const x = -30 + r() * 430;
        const topo = y0 + r() * (y1 - y0) + Math.pow(Math.abs(x - 170) / 230, 2) * 90;
        const l = 140 + r() * 220 + (x > 220 ? 40 : 0);
        vara(x, topo, Math.min(l, 600 - topo), (r() - 0.5) * 22, cor, tinta);
      }
    }
    if (obj) { const p = new Path2D(); p.ellipse(180, 260, 230, 200, 0, 0, 6.283); marcar(k, obj, p); }
    // o galho: sai do tronco, sobe e dobra, faz a forquilha e cede um pouco com o peso das duas
    // coisas penduradas; da forquilha sai um ramo para o alto
    const membro = (pts, l0, l1) => {
      const cima = [];
      const baixo = [];
      pts.forEach(([x, y], i) => { const t = i / (pts.length - 1); const q = pts[Math.min(pts.length - 1, i + 1)]; const p = pts[Math.max(0, i - 1)]; const dx = q[0] - p[0]; const dy = q[1] - p[1]; const l = Math.hypot(dx, dy) || 1; const w = l0 + (l1 - l0) * t; cima.push([x + (dy / l) * w, y - (dx / l) * w]); baixo.push([x - (dy / l) * w, y + (dx / l) * w]); });
      const p = pol([...cima, ...baixo.reverse()]);
      peca(k, p, [0, 100, W, 360], { cor: '#8a7652', ang: Math.atan2(pts[pts.length - 1][1] - pts[0][1], pts[pts.length - 1][0] - pts[0][0]), passo: 2.8, maxL: 1.6, sombra: (x, y) => 0.35 + Math.max(0, (y - 200) / 110), cruzada: 0.7, traco: 2, obj });
      k.save();
      k.clip(p);
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.2;
      for (let i = 2; i < pts.length - 2; i += 2) { const [x, y] = pts[i]; k.beginPath(); k.moveTo(x - 4, y - 5); k.quadraticCurveTo(x + 4, y, x - 2, y + 5); k.stroke(); }
      k.restore();
    };
    const g1 = bezier([tx + 10, 330], [210, 250], [300, 214], [470, 232], 26);
    const g2 = bezier([470, 232], [580, 244], [700, 196], [870, 236], 26);
    const g3 = bezier([470, 232], [520, 190], [560, 150], [610, 128], 16);
    membro(g3, 7, 2.5);
    membro(g2, 8, 3);
    membro(g1, 15, 8);
    // as varas que caem do galho, menos onde ficam as coisas penduradas
    for (const g of [g1, g2, g3]) {
      for (let i = 3; i < g.length - 1; i++) {
        if (r() < 0.45) continue;
        const [x, y] = g[i];
        const longe = Math.abs(x - 405) > 90 && Math.abs(x - 715) > 100;
        vara(x, y + 4, longe ? 80 + r() * 200 : 20 + r() * 26, (r() - 0.5) * 18, '#8b8858', 'rgba(43,33,18,.85)');
      }
    }
    // os cordões: dois fios torcidos, com o nó no galho
    const cordao2 = (x0, y0, x1, y1) => {
      const p = new Path2D();
      p.moveTo(x0, y0);
      p.quadraticCurveTo((x0 + x1) / 2 + 4, (y0 + y1) / 2, x1, y1);
      k.strokeStyle = '#3a2410';
      k.lineWidth = 3;
      k.stroke(p);
      k.strokeStyle = '#c9a86a';
      k.lineWidth = 1.2;
      k.stroke(p);
      marcar(k, obj, p, 4);
      k.fillStyle = '#3a2410';
      k.beginPath();
      k.ellipse(x0, y0 + 2, 5, 4, 0, 0, 6.283);
      k.fill();
    };
    // a madeira de um membro: o tom, o veio ao longo dele, a sombra de um lado e o contorno
    const madeira = (p, caixa, ang, sombraFn, cor) => peca(k, p, caixa, { cor, tinta: '#2a1606', ang, passo: 2.4, maxL: 1.7, sombra: sombraFn, cruzada: 0.62, traco: 2, obj });
    // a lira: a caixa embaixo, os dois braços que se abrem e a travessa, com as cordas
    const lx = 330;
    const ly = 356;
    const yG1 = (x) => { let m = g1[0]; for (const q of g1) if (Math.abs(q[0] - x) < Math.abs(m[0] - x)) m = q; return m[1]; };
    cordao2(405, yG1(405) + 6, lx + 2, ly + 2);
    cordao2(405, yG1(405) + 6, lx + 162, ly - 6);
    k.save();
    k.translate(lx, ly);
    k.rotate(0.03);
    const bracoE = new Path2D();
    bracoE.moveTo(-6, 4);
    bracoE.bezierCurveTo(4, 50, 22, 100, 20, 150);
    bracoE.lineTo(38, 150);
    bracoE.bezierCurveTo(40, 100, 20, 50, 12, 4);
    bracoE.closePath();
    const bracoD = new Path2D();
    bracoD.moveTo(166, -2);
    bracoD.bezierCurveTo(150, 50, 132, 100, 132, 150);
    bracoD.lineTo(114, 150);
    bracoD.bezierCurveTo(114, 100, 136, 50, 148, -2);
    bracoD.closePath();
    madeira(bracoE, [-6, -2, 40, 150], 1.35, (x) => 0.35 + (x + 6) / 60, '#a8743e');
    madeira(bracoD, [114, -2, 166, 150], 1.8, (x) => 0.25 + (x - 114) / 70, '#a8743e');
    const caixaL = pol([[4, 150], [148, 150], [142, 208], [10, 208]]);
    madeira(caixaL, [4, 150, 148, 208], 0.04, (x, y) => 0.3 + x / 320 + (y - 150) / 120, '#b5814a');
    k.strokeStyle = 'rgba(42,22,6,.8)';
    k.lineWidth = 1.4;
    k.strokeRect(20, 162, 112, 34);
    k.beginPath();
    k.arc(76, 180, 9, 0, 6.283);
    k.fillStyle = '#2a1606';
    k.fill();
    const trav = pol([[-16, 0], [178, -12], [180, 6], [-14, 16]]);
    madeira(trav, [-16, -12, 180, 16], -0.06, (x, y) => 0.3 + (y + 4) / 30, '#8d5f2e');
    // as cordas: tinta fina, da travessa ao cavalete; uma delas frouxa
    for (let i = 0; i < 7; i++) {
      const x = 44 + i * 11;
      const ytop = 8 - x * 0.06;
      k.fillStyle = '#2a1606';
      k.beginPath();
      k.arc(x, ytop + 2, 2.6, 0, 6.283);
      k.fill();
      k.strokeStyle = 'rgba(32,18,6,.95)';
      k.lineWidth = 1.1;
      k.beginPath();
      k.moveTo(x, ytop + 4);
      if (i === 5) k.quadraticCurveTo(x + 9, 90, x + (i - 3) * 1.2, 176);
      else k.lineTo(x + (i - 3) * 1.2, 176);
      k.stroke();
    }
    k.fillStyle = '#2a1606';
    k.fillRect(36, 172, 80, 6);
    k.restore();
    // a harpa: a coluna, o braço curvo em cima, a caixa em diagonal e as cordas entre eles;
    // pendurada mais baixa, com o pé por cima da água
    const hx = 640;
    const hy = 336;
    const yG2 = (x) => { let m = g2[0]; for (const q of g2) if (Math.abs(q[0] - x) < Math.abs(m[0] - x)) m = q; return m[1]; };
    cordao2(708, yG2(708) + 6, hx + 4, hy + 2);
    cordao2(708, yG2(708) + 6, hx + 150, hy + 28);
    k.save();
    k.translate(hx, hy);
    k.rotate(0.05);
    const pescoco = (x) => 6 + x * 0.24 - Math.sin((x / 140) * Math.PI) * 20;
    const caixaY = (x) => 40 + (130 - x) * 1.557;
    const caixaH = new Path2D();
    caixaH.moveTo(150, 30);
    caixaH.lineTo(130, 40);
    caixaH.lineTo(8, 230);
    caixaH.lineTo(32, 246);
    caixaH.quadraticCurveTo(112, 150, 162, 50);
    caixaH.closePath();
    madeira(caixaH, [8, 30, 162, 246], 2.14, (x, y) => 0.3 + (y - 30) / 360 + x / 700, '#b5814a');
    const coluna = pol([[-8, 0], [6, -2], [12, 236], [-2, 240]]);
    madeira(coluna, [-8, -2, 12, 240], 1.55, (x) => 0.4 + (x + 8) / 40, '#8d5f2e');
    const braco = new Path2D();
    braco.moveTo(-6, 0);
    for (let x = 0; x <= 150; x += 10) braco.lineTo(x, pescoco(x) - 8);
    for (let x = 150; x >= 0; x -= 10) braco.lineTo(x, pescoco(x) + 6);
    braco.closePath();
    madeira(braco, [-6, -20, 150, 50], 0.2, (x, y) => 0.3 + (y - pescoco(x) + 8) / 30, '#9a6a36');
    k.strokeStyle = '#2a1606';
    k.lineWidth = 3;
    k.beginPath();
    k.arc(156, pescoco(150) - 6, 9, 0, 5.2);
    k.stroke();
    for (let x = 18; x <= 124; x += 11) {
      k.strokeStyle = 'rgba(32,18,6,.95)';
      k.lineWidth = 1.1;
      k.beginPath();
      k.moveTo(x, pescoco(x) + 6);
      if (x === 62) k.quadraticCurveTo(x + 8, (pescoco(x) + caixaY(x)) / 2, x, caixaY(x) - 2);
      else k.lineTo(x, caixaY(x) - 2);
      k.stroke();
      k.fillStyle = '#2a1606';
      k.beginPath();
      k.arc(x, pescoco(x) + 6, 2.2, 0, 6.283);
      k.fill();
    }
    k.restore();
    vinheta(k, W, H, 0.24);
  }

  // (8) Nínive (Jn 3.3): "Nínive era uma cidade muito grande, tão grande que uma pessoa
  // levaria três dias para atravessá-la a pé." Do alto de um morro, de fora: na frente, a
  // muralha imensa de tijolo, com as ameias em degraus e a porta entre duas torres; a estrada
  // que entra pela porta e some na cidade; e a cidade que não acaba, telhados e mais telhados
  // até a névoa do horizonte, com o palácio no monte e o rio Tigre do lado. O sol alto e
  // branco do meio-dia.
  function desenhoNinive(k, W, H, obj) {
    const r = sorteio(6801);
    papelVelho(k, W, H, r, ['#fbf1d6', '#efd9ab', '#d3b078'], [W * 0.66, 70]);
    const hz = 236;
    // o céu quente do meio-dia: linhas ralas, quase brancas perto do sol
    const sol = [610, 140];
    linhas(k, 0, 0, W, hz, 6, 1.2, (x, y) => 0.08 + Math.min(1, Math.hypot(x - sol[0], y - sol[1]) / 600) * 0.5);
    k.fillStyle = '#fffaea';
    k.beginPath();
    k.arc(sol[0], sol[1], 30, 0, 6.283);
    k.fill();
    k.strokeStyle = 'rgba(122,74,28,.85)';
    k.lineWidth = 1.6;
    k.stroke();
    k.beginPath();
    k.arc(sol[0], sol[1], 40, 0, 6.283);
    k.lineWidth = 0.9;
    k.stroke();
    // a cidade que não acaba: fileiras de telhados que diminuem até o horizonte
    const chao = new Path2D();
    chao.rect(-10, hz, W + 20, H);
    k.fillStyle = '#e4cc98';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, hz, 560, 1.2, () => 0.35);
    // o Tigre, à esquerda, uma faixa de água que vem do horizonte
    const rio = new Path2D();
    rio.moveTo(-10, 330);
    rio.bezierCurveTo(60, 300, 120, 270, 170, hz);
    rio.lineTo(190, hz);
    rio.bezierCurveTo(150, 280, 110, 330, 60, 400);
    rio.lineTo(-10, 430);
    rio.closePath();
    k.fillStyle = '#e8e6d2';
    k.fill(rio);
    k.save();
    k.clip(rio);
    agua(k, r, -10, hz, 200, 430, 'rgba(43,33,18,.55)');
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.4;
    k.stroke(rio);
    // as casas, da última fileira (longe, miúdas) para a primeira (logo atrás do muro)
    for (let f = 0; f < 22; f++) {
      const t = f / 21;
      const y = hz + 4 + Math.pow(t, 1.7) * 292;
      const e = 0.14 + Math.pow(t, 1.5) * 0.9;
      let x = -10 - r() * 40 * e + (y < 420 ? 60 + (1 - t) * 120 : 0);
      while (x < W + 10) {
        const w = (40 + r() * 30) * e;
        const h = (22 + r() * 16) * e;
        if (e < 0.3) {
          k.fillStyle = r() < 0.5 ? '#f1dfb4' : '#e6cf9c';
          k.fillRect(x, y - h, w, h);
          k.fillStyle = '#b4935e';
          k.fillRect(x + w, y - h - 2 * e, 6 * e + 1, h + 2 * e);
          k.strokeStyle = SEPIA;
          k.lineWidth = 0.7;
          k.strokeRect(x, y - h, w, h);
        } else casinha(k, r, x, y, w, h, 16 * e, { cor: r() < 0.5 ? '#f1dfb4' : '#e8d2a2', lado: '#b4935e', teto: '#e4cb98', traco: Math.min(1.3, 0.5 + e), janela: e > 0.5 && r() < 0.5, porta: r() < 0.5 });
        x += w + (4 + r() * 10) * e;
      }
    }
    // o palácio no monte, longe, à direita, e um templo de degraus mais longe ainda
    const mx = 690;
    const my = 300;
    const monte = pol([[mx - 130, my + 20], [mx - 80, my - 18], [mx + 90, my - 22], [mx + 140, my + 20]]);
    peca(k, monte, [mx - 130, my - 22, mx + 140, my + 20], { cor: '#dcc08a', ang: 0.3, passo: 3, maxL: 1, sombra: () => 0.45, traco: 1.2 });
    const pal = pol([[mx - 70, my - 16], [mx - 70, my - 54], [mx + 80, my - 58], [mx + 80, my - 18]]);
    muroEmFiadas(k, r, pal, [mx - 70, my - 60, mx + 80, my - 16], { h: 5, larg: 3, cor: '#f1dfb4', traco: 0.7 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.2;
    k.stroke(pal);
    for (let x = mx - 68; x < mx + 78; x += 10) { k.fillStyle = '#f1dfb4'; k.fillRect(x, my - 64, 6, 7); k.strokeRect(x, my - 64, 6, 7); }
    // a névoa da distância: a cidade some aos poucos no horizonte (linhas claras por cima)
    k.save();
    k.globalAlpha = 0.55;
    linhas(k, 0, hz, W, hz + 70, 3.2, 1.6, (x, y) => 1 - (y - hz) / 70, '#f6ead0');
    k.restore();
    // a muralha, perto: tijolo em fiadas, as ameias em degraus, as torres e a porta
    const mt = 560;
    const mb = 720;
    const muro = pol([[-10, mt], [W + 10, mt - 10], [W + 10, mb], [-10, mb]]);
    muroEmFiadas(k, r, muro, [-10, mt - 12, W + 10, mb], { h: 11, larg: 2.4, cor: '#d9b884', sombra: (x, y) => 0.3 + (y - mt) / 400 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(muro);
    marcar(k, obj, muro);
    const ameia = (x, y, w, cor = '#d9b884') => {
      const p = pol([[x, y], [x, y - w * 0.5], [x + w * 0.25, y - w * 0.5], [x + w * 0.25, y - w * 0.8], [x + w * 0.75, y - w * 0.8], [x + w * 0.75, y - w * 0.5], [x + w, y - w * 0.5], [x + w, y]]);
      k.fillStyle = cor;
      k.fill(p);
      gravar(k, p, x + w / 2, y - w * 0.4, w, 0, 2.6, 0.9, () => 0.4, SEPIA, 0);
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.4;
      k.stroke(p);
      marcar(k, obj, p);
    };
    for (let x = -10; x < W + 10; x += 34) ameia(x + 4, mt - (x + 10) / (W + 20) * 10 + 1, 26);
    // as torres e a porta no meio
    const torre = (x, w, alto) => {
      const p = pol([[x, mb], [x, mt - alto], [x + w, mt - alto], [x + w, mb]]);
      muroEmFiadas(k, r, p, [x, mt - alto, x + w, mb], { h: 11, larg: 2, cor: '#e2c290', sombra: (px) => 0.2 + (px - x) / w * 0.5 });
      k.strokeStyle = SEPIA;
      k.lineWidth = 2;
      k.stroke(p);
      marcar(k, obj, p);
      for (let a = x; a < x + w - 10; a += 30) ameia(a + 2, mt - alto + 1, 26, '#e2c290');
      // a faixa de pedra lavrada, com as rosetas em relevo
      k.fillStyle = '#ecd6a6';
      k.fillRect(x, mt - alto + 40, w, 14);
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.2;
      k.strokeRect(x, mt - alto + 40, w, 14);
      for (let a = x + 10; a < x + w - 4; a += 20) {
        k.beginPath();
        k.arc(a, mt - alto + 47, 4.6, 0, 6.283);
        k.stroke();
        for (let p = 0; p < 6; p++) { const g = (p / 6) * 6.283; k.beginPath(); k.moveTo(a, mt - alto + 47); k.lineTo(a + Math.cos(g) * 4, mt - alto + 47 + Math.sin(g) * 4); k.stroke(); }
      }
      k.strokeStyle = 'rgba(43,33,18,.6)';
      k.beginPath();
      k.moveTo(x, mt - alto + 56);
      k.lineTo(x + w, mt - alto + 56);
      k.stroke();
    };
    for (const x of [40, 760]) torre(x, 92, 50);
    torre(300, 110, 90);
    torre(480, 110, 90);
    // o corpo da porta, entre as duas torres, alto como elas, com as ameias
    const corpo = pol([[410, mb], [410, mt - 62], [480, mt - 62], [480, mb]]);
    muroEmFiadas(k, r, corpo, [410, mt - 64, 480, mb], { h: 11, larg: 2, cor: '#ddbd88', sombra: () => 0.35 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(corpo);
    marcar(k, obj, corpo);
    ameia(412, mt - 61, 26, '#ddbd88');
    ameia(444, mt - 61, 26, '#ddbd88');
    const porta = new Path2D();
    porta.moveTo(410, mb);
    porta.lineTo(410, mt + 30);
    porta.arc(445, mt + 30, 35, Math.PI, 0);
    porta.lineTo(480, mb);
    porta.closePath();
    k.fillStyle = '#2a1c0c';
    k.fill(porta);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(porta);
    // a passagem da porta é escura; lá no fundo, a boca de dentro, pequena e clara, com o
    // começo da rua e dois telhados vistos por ela
    const fundo = new Path2D();
    fundo.moveTo(432, mt + 96);
    fundo.lineTo(432, mt + 62);
    fundo.arc(445, mt + 62, 13, Math.PI, 0);
    fundo.lineTo(458, mt + 96);
    fundo.closePath();
    k.fillStyle = '#efe0bb';
    k.fill(fundo);
    k.save();
    k.clip(fundo);
    k.fillStyle = '#d9c296';
    k.fillRect(426, mt + 66, 12, 12);
    k.fillRect(450, mt + 70, 12, 10);
    k.strokeStyle = SEPIA;
    k.lineWidth = 0.8;
    k.strokeRect(426, mt + 66, 12, 12);
    k.strokeRect(450, mt + 70, 12, 10);
    k.fillStyle = '#e8d4a4';
    k.beginPath();
    k.moveTo(440, mt + 96);
    k.lineTo(443, mt + 84);
    k.lineTo(447, mt + 84);
    k.lineTo(450, mt + 96);
    k.fill();
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.4;
    k.stroke(fundo);
    // o chão da passagem, na sombra, até a soleira
    k.save();
    k.clip(porta);
    k.fillStyle = 'rgba(60,42,20,.9)';
    k.beginPath();
    k.moveTo(410, mb);
    k.lineTo(432, mt + 96);
    k.lineTo(458, mt + 96);
    k.lineTo(480, mb);
    k.fill();
    k.strokeStyle = 'rgba(120,96,60,.6)';
    k.lineWidth = 1;
    for (let y = mt + 104; y < mb; y += 8) { const t = (y - mt - 96) / (mb - mt - 96); k.beginPath(); k.moveTo(432 - t * 22, y); k.lineTo(458 + t * 22, y); k.stroke(); }
    k.restore();
    k.strokeStyle = '#e8d4a4';
    k.lineWidth = 3;
    k.beginPath();
    k.moveTo(410, mb - 1);
    k.lineTo(480, mb - 1);
    k.stroke();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.beginPath();
    k.arc(445, mt + 30, 44, Math.PI, 0);
    k.stroke();
    // a estrada de cá, que chega à porta, e o chão do morro
    const ca = new Path2D();
    ca.moveTo(-10, mb);
    ca.lineTo(W + 10, mb);
    ca.lineTo(W + 10, H + 10);
    ca.lineTo(-10, H + 10);
    ca.closePath();
    k.fillStyle = '#c9a773';
    k.fill(ca);
    chaoEmLinhas(k, r, ca, -10, W + 10, mb, H, 2.4, (x, y) => 0.55 + (y - mb) / 300);
    const estrada = pol([[410, mb], [480, mb], [600, H + 10], [290, H + 10]]);
    k.fillStyle = '#e8d4a4';
    k.fill(estrada);
    chaoEmLinhas(k, r, estrada, 280, 610, mb, H, 1.4, () => 0.3);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(estrada);
    // os sulcos das rodas e as pedras da estrada
    k.lineWidth = 1.4;
    for (const d of [-0.25, 0.25]) { k.beginPath(); k.moveTo(445 + d * 70, mb); k.lineTo(445 + d * 310, H + 10); k.stroke(); }
    for (let i = 0; i < 20; i++) {
      const x = r() * W;
      const y = mb + 20 + r() * 110;
      if (Math.abs(x - 445) < 60 + (y - mb) * 0.6) continue;
      const s = 5 + (y - mb) / 14 + r() * 5;
      const p = seixo(r, x, y, s, s * 0.6, 0, 0.18);
      peca(k, p, [x - s, y - s, x + s, y + s], { cor: '#d3b583', sombra: sombraOval(x, y, s, s * 0.6, 0), passo: 2.4, maxL: 1.1, traco: 1.3 });
    }
    vinheta(k, W, H, 0.22);
  }
  // Uma oliveira de perto: o tronco torto e retorcido, a copa em tufos ralos de folha cinza.
  function oliveira(k, r, x, y, e, obj, cor = '#adab80') {
    const tr = new Path2D();
    tr.moveTo(x - 9 * e, y);
    tr.bezierCurveTo(x - 20 * e, y - 22 * e, x + 12 * e, y - 30 * e, x - 4 * e, y - 54 * e);
    tr.lineTo(x + 8 * e, y - 54 * e);
    tr.bezierCurveTo(x + 24 * e, y - 30 * e, x - 2 * e, y - 22 * e, x + 9 * e, y);
    tr.closePath();
    peca(k, tr, [x - 20 * e, y - 54 * e, x + 24 * e, y], { cor: '#8e7a55', ang: 1.4, passo: 2.4, maxL: 1.3, sombra: (px) => 0.3 + (px - x) / (30 * e), traco: Math.min(1.6, 0.6 + e * 0.7), obj });
    for (const [dx, dy, rx] of [[-28, -66, 30], [24, -70, 28], [0, -90, 30], [-44, -50, 20], [42, -52, 20]]) copaGravada(k, r, x + dx * e, y + dy * e, rx * e, rx * e * 0.6, { cor, obj });
  }

  // (9) Belém (Mq 5.2): "Ó Belém Efrata, você é apenas uma pequena vila da Judeia, mas será o
  // lugar onde vai nascer o rei de Israel." No crepúsculo: a vila pequena no alto do morro,
  // poucas casas de pedra com as janelas acesas; os morros da Judeia em volta, largos e
  // escuros; na frente, as encostas de Efrata em socalcos de pedra, com as oliveiras e as
  // videiras, e o caminho que sobe até a vila. O céu ainda claro no horizonte e já fundo no
  // alto, só em linhas (sem estrela, que não está em Miqueias).
  function desenhoBelem(k, W, H, obj) {
    const r = sorteio(6901);
    papelVelho(k, W, H, r, ['#f4e6c8', '#dcc59a', '#a88b62'], [W * 0.5, 330]);
    const hz = 330;
    // o céu do crepúsculo: linhas que engrossam para o alto, e as nuvens finas, escuras
    linhas(k, 0, 0, W, hz + 20, 4.6, 2.4, (x, y) => 0.1 + Math.pow(1 - y / hz, 1.2) * 0.7, '#22190f');
    for (const [y, x0, x1] of [[96, 80, 520], [150, 420, 900], [220, -20, 340]]) {
      for (let i = 0; i < 2; i++) {
        const yy = y + i * 7;
        k.strokeStyle = 'rgba(30,22,14,.85)';
        k.lineWidth = 3 - i;
        k.beginPath();
        k.moveTo(x0 + i * 40, yy);
        k.quadraticCurveTo((x0 + x1) / 2, yy - 5, x1 - i * 50, yy + 2);
        k.stroke();
        k.strokeStyle = 'rgba(232,170,96,.8)';
        k.lineWidth = 1.4;
        k.beginPath();
        k.moveTo(x0 + i * 40 + 20, yy + 3);
        k.lineTo(x1 - i * 50 - 20, yy + 4);
        k.stroke();
      }
    }
    // os morros da Judeia de longe, em camadas, cada vez mais escuros para perto
    for (const [base, amp, cor, sem, s] of [[300, 28, '#c8b08a', 1, 0.45], [330, 34, '#a78f6a', 2, 0.6]]) {
      const f = onda(sorteio(6910 + sem), 4, 0.007);
      const m = pol([[-10, 530], ...Array.from({ length: 48 }, (_, i) => [i * 19 - 4, base + f(i * 19) * amp]), [W + 10, 530]]);
      peca(k, m, [-10, base - amp, W + 10, 530], { cor, ang: 0, passo: 4.4, maxL: 1.5, sombra: () => s, cruzada: 0.7, traco: 1.4 });
    }
    // o morro de Belém, no meio: largo, de topo arredondado
    const topoB = (x) => 300 + Math.pow((x - 470) / 300, 2) * 120;
    const morro = new Path2D();
    morro.moveTo(60, 520);
    for (let x = 60; x <= 880; x += 10) morro.lineTo(x, topoB(x));
    morro.lineTo(880, 520);
    morro.closePath();
    k.fillStyle = '#b39871';
    k.fill(morro);
    chaoEmLinhas(k, r, morro, 60, 880, 290, 520, 2, (x, y) => 0.5 + (y - 300) / 500 + Math.max(0, (x - 520) / 600));
    // os socalcos do morro: muretas de pedra que seguem a curva, com as oliveiras miúdas
    k.save();
    k.clip(morro);
    for (let i = 0; i < 6; i++) {
      const dy = 50 + i * 30;
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.6;
      k.beginPath();
      for (let x = 60; x <= 880; x += 10) { const y = topoB(x) + dy + Math.sin(x * 0.02 + i) * 3; if (x === 60) k.moveTo(x, y); else k.lineTo(x, y); }
      k.stroke();
      k.strokeStyle = 'rgba(250,236,200,.6)';
      k.lineWidth = 1;
      k.beginPath();
      for (let x = 60; x <= 880; x += 10) { const y = topoB(x) + dy - 3 + Math.sin(x * 0.02 + i) * 3; if (x === 60) k.moveTo(x, y); else k.lineTo(x, y); }
      k.stroke();
      for (let x = 80 + (i % 2) * 30; x < 880; x += 54 + r() * 20) copaGravada(k, r, x, topoB(x) + dy - 8, 7, 5, { cor: '#8c8a62' });
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(morro);
    // a vila: poucas casas apertadas no alto, de pedra, com as janelas e as portas acesas
    const casas = [];
    for (const [x, w, h, f] of [[290, 50, 38, 0], [338, 44, 32, 0], [384, 62, 46, 0], [446, 48, 36, 0], [494, 58, 50, 0], [552, 46, 34, 0], [598, 52, 38, 0], [300, 56, 38, 1], [356, 48, 34, 1], [404, 58, 40, 1], [462, 50, 36, 1], [512, 62, 42, 1], [574, 50, 36, 1]]) casas.push({ x, w, h, base: topoB(x + w / 2) + 8 + f * 32 });
    casas.sort((a, b) => a.base - b.base);
    for (const c of casas) {
      const t = casinha(k, r, c.x, c.base, c.w, c.h, 16, { cor: '#d3bb92', lado: '#8f7756', teto: '#c8b084', traco: 1.5, janela: true, porta: r() < 0.7, acesa: '#ffc561', obj });
      // a luz que sai das janelas acesas: só um traço quente embaixo de cada uma
      k.strokeStyle = 'rgba(242,182,90,.7)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(c.x + c.w * 0.6, c.base - c.h * 0.75 + c.w * 0.12 + 3);
      k.lineTo(c.x + c.w * 0.75, c.base - c.h * 0.75 + c.w * 0.12 + 3);
      k.stroke();
      marcar(k, obj, t);
      // as janelas acesas, maiores, com a luz morna e o caixilho escuro
      for (const jx of [c.x + c.w * 0.18, c.x + c.w * 0.62]) {
        if (r() < 0.35) continue;
        const jy = c.base - c.h * 0.72;
        k.fillStyle = '#ffd27a';
        k.fillRect(jx, jy, 7, 9);
        k.strokeStyle = '#2a1f14';
        k.lineWidth = 1.4;
        k.strokeRect(jx, jy, 7, 9);
      }
    }
    // o vale e o caminho que sobe em curvas até a vila
    const vale = new Path2D();
    vale.moveTo(-10, 500);
    vale.bezierCurveTo(300, 520, 600, 500, W + 10, 512);
    vale.lineTo(W + 10, H + 10);
    vale.lineTo(-10, H + 10);
    vale.closePath();
    k.fillStyle = '#a88d64';
    k.fill(vale);
    chaoEmLinhas(k, r, vale, -10, W + 10, 500, H, 2.4, (x, y) => 0.55 + (y - 500) / 500);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(vale);
    const cam = bezier([520, H + 20], [700, 700], [300, 620], [450, 470], 40).concat(bezier([450, 470], [520, 430], [400, 400], [470, topoB(470) + 70], 20).slice(1));
    k.lineCap = 'round';
    for (let i = 1; i < cam.length; i++) {
      const t = (cam[i][1] - 360) / 500;
      k.strokeStyle = '#e4cfa0';
      k.lineWidth = 6 + t * 40;
      k.beginPath();
      k.moveTo(cam[i - 1][0], cam[i - 1][1]);
      k.lineTo(cam[i][0], cam[i][1]);
      k.stroke();
    }
    // os socalcos de perto: muretas de pedra miúda, a terra lavrada e as videiras em fila
    for (let i = 0; i < 4; i++) {
      const y0 = 560 + i * 72;
      const mur = new Path2D();
      mur.moveTo(-10, y0);
      for (let x = -10; x <= W + 10; x += 12) mur.lineTo(x, y0 + Math.sin(x * 0.008 + i) * 14);
      for (let x = W + 10; x >= -10; x -= 12) mur.lineTo(x, y0 + 14 + i * 3 + Math.sin(x * 0.008 + i) * 14);
      mur.closePath();
      muroEmFiadas(k, r, mur, [-10, y0 - 16, W + 10, y0 + 34 + i * 3], { h: 5 + i * 1.4, larg: 1.8, cor: '#cdb383', sombra: () => 0.45 });
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.6;
      k.stroke(mur);
      // as videiras: cepas baixas e retorcidas, em fila em cima da mureta de baixo
      for (let x = 30 + (i % 2) * 40; x < W; x += 90 + r() * 30) {
        const y = y0 - 6 + Math.sin(x * 0.008 + i) * 14;
        const e = 0.6 + i * 0.25;
        k.strokeStyle = SEPIA;
        k.lineWidth = 3 * e;
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x - 6 * e, y - 14 * e, x + 4 * e, y - 26 * e);
        k.stroke();
        copaGravada(k, r, x - 8 * e, y - 30 * e, 14 * e, 9 * e, { cor: '#8d8c5c' });
        copaGravada(k, r, x + 12 * e, y - 28 * e, 12 * e, 8 * e, { cor: '#8d8c5c' });
      }
    }
    for (const [x, y, e] of [[70, 810, 1.25], [820, 790, 1.35]]) oliveira(k, r, x, y, e, obj, '#9e9c72');
    vinheta(k, W, H, 0.28);
  }

  // (10) O mar da Galileia (Mt 4.18): "Um dia, quando estava andando à beira da praia do mar da
  // Galileia, Jesus viu dois irmãos: Simão, também chamado Pedro, e seu irmão André. Eles
  // estavam num barco pescando com uma rede, pois eram pescadores por profissão." De manhã,
  // com a névoa baixa nos morros da outra margem: o barco de pesca de madeira, de proa alta,
  // com o mastro e a vela enrolada, os remos recolhidos; ao lado dele, a rede de lançar aberta
  // na água, com a borda de chumbadas; perto, a praia de pedras escuras de basalto.
  function desenhoGalileia(k, W, H, obj) {
    const r = sorteio(7001);
    papelVelho(k, W, H, r, ['#f6f2e2', '#e3dcc2', '#c1b590'], [W * 0.3, 200]);
    const hz = 300;
    // o céu da manhã: linhas ralas, e a névoa baixa em faixas claras sobre os morros
    linhas(k, 0, 0, W, hz, 5.5, 1.3, (x, y) => 0.12 + (1 - y / hz) * 0.4);
    // os morros da outra margem, longos e baixos
    for (const [base, amp, cor, sem, s] of [[250, 30, '#d6cfb2', 1, 0.35], [284, 22, '#c4ba98', 2, 0.5]]) {
      const f = onda(sorteio(7010 + sem), 4, 0.006);
      const m = pol([[-10, hz + 4], ...Array.from({ length: 48 }, (_, i) => [i * 19 - 4, base + f(i * 19) * amp]), [W + 10, hz + 4]]);
      peca(k, m, [-10, base - amp, W + 10, hz + 4], { cor, ang: 0, passo: 4.6, maxL: 1.2, sombra: () => s, cruzada: 1, traco: 1.4 });
    }
    for (const [y, x0, x1] of [[262, 80, 460], [286, 520, 900], [240, 600, 820]]) {
      const n = pol([[x0, y + 6], ...Array.from({ length: 12 }, (_, i) => [x0 + ((x1 - x0) * i) / 11, y - Math.abs(Math.sin(i * 1.1)) * 9]), [x1, y + 6]]);
      k.fillStyle = '#f4efdf';
      k.fill(n);
      k.strokeStyle = 'rgba(43,33,18,.45)';
      k.lineWidth = 1;
      k.beginPath();
      k.moveTo(x0 + 20, y + 6);
      k.lineTo(x1 - 20, y + 6);
      k.stroke();
    }
    // o lago: ondinhas compridas e mansas, mais juntas longe
    const lago = new Path2D();
    lago.rect(-10, hz, W + 20, H);
    k.fillStyle = '#e1e0cf';
    k.fill(lago);
    k.save();
    k.clip(lago);
    k.strokeStyle = SEPIA;
    k.lineCap = 'round';
    for (let y = hz + 2; y < H; y += 2.6 + (y - hz) * 0.025) {
      const t = (y - hz) / (H - hz);
      let x = -10 - r() * 60;
      while (x < W + 10) {
        const c = (20 + r() * 70) * (0.4 + t);
        const sob = x > 140 && x < 560 && y > 470 && y < 560 ? 0.6 : 0;
        k.lineWidth = (0.5 + t * 1.5) * (0.7 + sob);
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x + c / 2, y - 1.5 - t * 3, x + c, y);
        k.stroke();
        x += c + (6 + r() * 30) * (0.4 + t);
      }
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.4;
    k.beginPath();
    k.moveTo(-10, hz);
    k.lineTo(W + 10, hz);
    k.stroke();
    // a rede de lançar, já na água, à direita do barco: a beirada torta de chumbadas, a metade
    // de lá afundada (a água passa por cima dela), a metade de cá ainda à vista, com a malha;
    // em volta, o anel de ondinhas onde ela caiu; a corda volta ao barco
    const rx = 630;
    const ry = 566;
    const raio = (a) => 1 + Math.sin(a * 3 + 1) * 0.07 + Math.sin(a * 7) * 0.04;
    const borda = new Path2D();
    for (let i = 0; i <= 48; i++) { const a = (i / 48) * 6.283; const px = rx + Math.cos(a) * 130 * raio(a); const py = ry + Math.sin(a) * 38 * raio(a); (i ? borda.lineTo(px, py) : borda.moveTo(px, py)); }
    borda.closePath();
    k.save();
    k.clip(borda);
    k.fillStyle = 'rgba(200,194,170,.55)';
    k.fill(borda);
    k.strokeStyle = 'rgba(43,33,18,.75)';
    k.lineWidth = 1;
    for (let d = -220; d < 220; d += 9) {
      k.beginPath();
      k.moveTo(rx + d - 50, ry - 50);
      k.quadraticCurveTo(rx + d, ry + Math.sin(d * 0.05) * 4, rx + d + 50, ry + 50);
      k.stroke();
      k.beginPath();
      k.moveTo(rx + d + 50, ry - 50);
      k.quadraticCurveTo(rx + d, ry + Math.cos(d * 0.05) * 4, rx + d - 50, ry + 50);
      k.stroke();
    }
    // a metade de lá, debaixo d'água: a água por cima e as ondinhas atravessando
    const lado = new Path2D();
    lado.moveTo(rx - 150, ry + 6);
    for (let x = rx - 150; x <= rx + 150; x += 10) lado.lineTo(x, ry + 4 + Math.sin(x * 0.05) * 5);
    lado.lineTo(rx + 170, ry - 60);
    lado.lineTo(rx - 170, ry - 60);
    lado.closePath();
    k.fillStyle = 'rgba(225,224,207,.78)';
    k.fill(lado);
    k.strokeStyle = SEPIA;
    for (let y = ry - 46; y < ry + 6; y += 4.4) {
      let x = rx - 170 + r() * 20;
      while (x < rx + 170) { const c = 14 + r() * 30; k.lineWidth = 1; k.beginPath(); k.moveTo(x, y); k.quadraticCurveTo(x + c / 2, y - 2, x + c, y); k.stroke(); x += c + 6 + r() * 16; }
    }
    k.restore();
    marcar(k, obj, borda);
    // a beirada: inteira e firme na metade de cá, só sugerida na de lá
    k.lineWidth = 2;
    k.strokeStyle = SEPIA;
    k.beginPath();
    for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI; const px = rx + Math.cos(a) * 130 * raio(a); const py = ry + Math.sin(a) * 38 * raio(a); (i ? k.lineTo(px, py) : k.moveTo(px, py)); }
    k.stroke();
    k.strokeStyle = 'rgba(43,33,18,.35)';
    k.lineWidth = 1.2;
    k.setLineDash([6, 8]);
    k.beginPath();
    for (let i = 24; i <= 48; i++) { const a = (i / 48) * 6.283; const px = rx + Math.cos(a) * 130 * raio(a); const py = ry + Math.sin(a) * 38 * raio(a); (i > 24 ? k.lineTo(px, py) : k.moveTo(px, py)); }
    k.stroke();
    k.setLineDash([]);
    // as chumbadas da beirada de cá
    for (let i = 1; i < 24; i++) {
      const a = (i / 24) * Math.PI;
      const px = rx + Math.cos(a) * 130 * raio(a);
      const py = ry + Math.sin(a) * 38 * raio(a);
      k.fillStyle = '#3a3226';
      k.beginPath();
      k.ellipse(px, py + 1, 3.6, 2.6, 0, 0, 6.283);
      k.fill();
    }
    // o anel de ondinhas onde ela caiu
    k.strokeStyle = 'rgba(43,33,18,.6)';
    for (const [a, b, w] of [[150, 50, 1.5], [172, 60, 1.1], [194, 70, 0.8]]) { k.lineWidth = w; k.beginPath(); k.ellipse(rx, ry + 2, a, b, -0.03, 0.15, Math.PI - 0.15); k.stroke(); k.beginPath(); k.ellipse(rx, ry + 2, a, b, -0.03, Math.PI + 0.5, Math.PI * 2 - 0.5); k.stroke(); }

    // o barco: de lado, a proa alta à esquerda, as tábuas, a borda clara e o casco escuro
    const bx = 330;
    const by = 520;
    const L = 380;
    const borda1 = (t) => by - 96 - Math.pow(1 - t, 3) * 70 - Math.pow(t, 4) * 34 + t * 10;
    const quilha = (t) => by - Math.sin(t * Math.PI) * -18 + (t < 0.1 ? (0.1 - t) * -500 : 0);
    const casco = new Path2D();
    for (let i = 0; i <= 40; i++) { const t = i / 40; const x = bx - L / 2 + t * L; if (i) casco.lineTo(x, borda1(t)); else casco.moveTo(x, borda1(t)); }
    for (let i = 40; i >= 0; i--) { const t = i / 40; const x = bx - L / 2 + t * L + (t < 0.08 ? (0.08 - t) * 200 : 0) - (t > 0.94 ? (t - 0.94) * 160 : 0); casco.lineTo(x, Math.min(quilha(t), by + 16)); }
    casco.closePath();
    sombraNoChao(k, casco, 0, 40, 10, 0.25);
    k.fillStyle = '#32261a';
    k.fill(casco);
    k.strokeStyle = '#140e08';
    k.lineWidth = 2.4;
    k.stroke(casco);
    marcar(k, obj, casco);
    // as tábuas compridas, seguindo a borda
    k.save();
    k.clip(casco);
    for (let j = 1; j < 6; j++) {
      k.strokeStyle = '#5a4632';
      k.lineWidth = 1.6;
      k.beginPath();
      for (let i = 0; i <= 40; i++) { const t = i / 40; const x = bx - L / 2 + t * L; const y = borda1(t) + j * 18 + Math.sin(t * Math.PI) * j * 3; if (i) k.lineTo(x, y); else k.moveTo(x, y); }
      k.stroke();
    }
    // a faixa clara da borda e o brilho
    k.fillStyle = '#7a6040';
    k.beginPath();
    for (let i = 0; i <= 40; i++) { const t = i / 40; const x = bx - L / 2 + t * L; if (i) k.lineTo(x, borda1(t)); else k.moveTo(x, borda1(t)); }
    for (let i = 40; i >= 0; i--) { const t = i / 40; const x = bx - L / 2 + t * L; k.lineTo(x, borda1(t) + 13); }
    k.fill();
    k.restore();
    k.strokeStyle = '#1c140c';
    k.lineWidth = 2;
    k.beginPath();
    for (let i = 0; i <= 40; i++) { const t = i / 40; const x = bx - L / 2 + t * L; if (i) k.lineTo(x, borda1(t) + 13); else k.moveTo(x, borda1(t) + 13); }
    k.stroke();
    // a linha d'água: o casco entra no lago, com as ondinhas por cima
    k.fillStyle = '#e1e0cf';
    k.beginPath();
    k.moveTo(bx - L / 2, by - 4);
    for (let x = bx - L / 2; x <= bx + L / 2; x += 10) k.lineTo(x, by - 6 + Math.sin(x * 0.08) * 3);
    k.lineTo(bx + L / 2 + 20, by + 40);
    k.lineTo(bx - L / 2 - 20, by + 40);
    k.closePath();
    k.fill();
    k.save();
    k.clip(new Path2D('M' + (bx - L / 2 - 20) + ' ' + (by - 8) + 'H' + (bx + L / 2 + 20) + 'V' + (by + 40) + 'H' + (bx - L / 2 - 20) + 'Z'));
    k.strokeStyle = SEPIA;
    for (let y = by - 2; y < by + 40; y += 5) { k.lineWidth = 1.4; let x = bx - L / 2 - 20 + r() * 20; while (x < bx + L / 2 + 20) { const c = 16 + r() * 30; k.beginPath(); k.moveTo(x, y); k.quadraticCurveTo(x + c / 2, y - 2.5, x + c, y); k.stroke(); x += c + 4 + r() * 10; } }
    k.restore();
    // o reflexo do casco: traços escuros deitados e partidos, colados na linha d'água, de
    // comprimentos soltos, cada vez mais curtos e ralos com a fundura; nada de mancha fechada
    k.lineCap = 'round';
    for (let y = by - 2; y < by + 78; y += 4.2) {
      const t = (y - by + 2) / 80;
      const x0 = bx - L / 2 + 30 + t * 40;
      const x1 = bx + L / 2 - 40 - t * 50;
      let x = x0 + r() * 12;
      while (x < x1) {
        const c = (14 + r() * 46) * (1 - t * 0.55);
        if (r() > t * 0.75) {
          k.strokeStyle = 'rgba(40,30,20,' + (0.9 - t * 0.5).toFixed(2) + ')';
          k.lineWidth = 3 - t * 1.8;
          k.beginPath();
          k.moveTo(x, y + Math.sin(x * 0.07 + y) * 1.4);
          k.lineTo(Math.min(x1, x + c), y + Math.sin((x + c) * 0.07 + y) * 1.4);
          k.stroke();
        }
        x += c + 4 + r() * (8 + t * 30);
      }
    }
    // o mastro, a verga com a vela enrolada e os cabos
    const mx = bx + 20;
    const topoMastro = 150;
    vara(k, [[mx, borda1(0.5) + 6], [mx + 4, topoMastro]], 7, '#8a6a44', obj);
    const verga = [[mx - 150, topoMastro + 40], [mx + 160, topoMastro + 14]];
    vara(k, verga, 5, '#8a6a44', obj);
    const vela = new Path2D();
    vela.moveTo(mx - 150, topoMastro + 40);
    for (let i = 0, t = 0; t < 1; i++) { const dt = 0.05 + r() * 0.09; t = Math.min(1, t + dt); vela.quadraticCurveTo(mx - 150 + (t - dt / 2) * 310, topoMastro + 40 - t * 26 + 6 + r() * 14, mx - 150 + t * 310, topoMastro + 40 - t * 26 + r() * 5); }
    vela.lineTo(mx + 160, topoMastro + 6);
    vela.lineTo(mx - 150, topoMastro + 30);
    vela.closePath();
    peca(k, vela, [mx - 150, topoMastro, mx + 160, topoMastro + 58], { cor: '#efe4c4', ang: 1.4, passo: 3.4, maxL: 1.2, sombra: (x, y) => 0.25 + (y - topoMastro - 20) / 60, cruzada: 1, traco: 1.6, obj });
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.2;
    for (const [x0, y0, x1, y1] of [[mx + 4, topoMastro, bx - L / 2 + 20, borda1(0.05) + 4], [mx + 4, topoMastro, bx + L / 2 - 16, borda1(0.96) + 4], [mx - 150, topoMastro + 40, bx - 120, borda1(0.15) + 6]]) { k.beginPath(); k.moveTo(x0, y0); k.lineTo(x1, y1); k.stroke(); }
    // os remos recolhidos, deitados sobre a borda
    vara(k, [[bx - 140, borda1(0.12) + 2], [bx + 110, borda1(0.78) - 12]], 5, '#a2825a', obj);
    vara(k, [[bx - 30, borda1(0.42) + 4], [bx + 180, borda1(0.97) - 10]], 5, '#a2825a', obj);
    // a rede: uma ponta molhada caída por cima da borda, da popa até a água, e a corda até a
    // rede aberta
const caida = pol([[bx + 112, borda1(0.79) + 2], [bx + 150, borda1(0.9) + 4], [bx + 158, borda1(0.92) + 40], [bx + 166, by - 4], [bx + 146, by + 2], [bx + 134, borda1(0.85) + 46]]);
    k.save();
    k.clip(caida);
    k.fillStyle = 'rgba(200,190,160,.85)';
    k.fill(caida);
    k.strokeStyle = 'rgba(43,33,18,.85)';
    k.lineWidth = 1;
    for (let d = -80; d < 80; d += 7) { k.beginPath(); k.moveTo(bx + 140 + d, borda1(0.85) - 20); k.lineTo(bx + 140 + d + 60, by + 20); k.stroke(); k.beginPath(); k.moveTo(bx + 140 + d + 60, borda1(0.85) - 20); k.lineTo(bx + 140 + d, by + 20); k.stroke(); }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(caida);
    marcar(k, obj, caida);
    const corda = new Path2D();
    corda.moveTo(bx + 166, by - 4);
    corda.bezierCurveTo(bx + 220, by + 20, rx - 170, ry - 20, rx - 128, ry - 6);
    k.strokeStyle = '#3a2410';
    k.lineWidth = 2.6;
    k.stroke(corda);
    marcar(k, obj, corda, 3);
    // a praia de cá: pedras escuras de basalto, redondas, e a água rasa entre elas
    const praia = new Path2D();
    praia.moveTo(-10, 720);
    praia.bezierCurveTo(250, 700, 600, 740, W + 10, 716);
    praia.lineTo(W + 10, H + 10);
    praia.lineTo(-10, H + 10);
    praia.closePath();
    k.fillStyle = '#c8bb98';
    k.fill(praia);
    chaoEmLinhas(k, r, praia, -10, W + 10, 700, H, 1.8, (x, y) => 0.4 + (y - 710) / 300);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(praia);
    k.strokeStyle = 'rgba(250,248,236,.9)';
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(-10, 716);
    k.bezierCurveTo(250, 696, 600, 736, W + 10, 712);
    k.stroke();
    const pedras = [];
    for (let i = 0; i < 26; i++) {
      const y = 726 + Math.pow(r(), 0.8) * 110;
      const x = r() * W;
      const s = 8 + (y - 710) / 7 + r() * 10;
      pedras.push([x, y, s]);
    }
    pedras.sort((a, b) => a[1] - b[1]);
    for (const [x, y, s] of pedras) {
      const p = pol(Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * 6.283 + r() * 0.5; const f2 = 0.7 + r() * 0.35; return [x + Math.cos(a) * s * 1.3 * f2, y + Math.sin(a) * s * 0.75 * f2]; }));
      sombraNoChao(k, p, 4, 4, 3, 0.35);
      peca(k, p, [x - s * 1.3, y - s, x + s * 1.3, y + s], { cor: '#5f584a', tinta: '#1a1712', ang: 0.6, passo: 2.8, maxL: 1.6, sombra: (px, py) => sombraOval(x, y, s * 1.3, s * 0.75, 0)(px, py) * 0.8, cruzada: 0.7, traco: 1.8 });
      // os poros do basalto
      k.fillStyle = 'rgba(250,240,220,.35)';
      for (let j = 0; j < 4; j++) { k.beginPath(); k.arc(x - s * 0.5 + r() * s, y - s * 0.4 + r() * s * 0.4, 1 + r(), 0, 6.283); k.fill(); }
    }
    vinheta(k, W, H, 0.2);
  }

  // (11) Nazaré (Jo 1.46): "Nazaré!", exclamou Natanael. "Pode vir alguma coisa boa de lá?"
  // A aldeia pequena e simples, de perto, ao sol do meio do dia: uma dúzia de casas de pedra
  // em três degraus pela encosta de calcário, as de cima encostadas na boca das grutas da
  // rocha (como as casas da Nazaré daquele tempo), as escadas de fora, os jarros à porta; o
  // caminho de terra que sobe entre elas; no alto, a crista com os arbustos. Na frente, à
  // esquerda, a figueira de folhas largas.
  function desenhoNazare(k, W, H, obj) {
    const r = sorteio(7101);
    papelVelho(k, W, H, r, ['#fcf5e0', '#efe0bb', '#d4bd8e'], [W * 0.5, 80]);
    // o céu do meio-dia: liso, só em linhas ralas e claras
    linhas(k, 0, 0, W, 220, 6.5, 1.1, (x, y) => 0.08 + (1 - y / 220) * 0.32);
    // a encosta, até a crista no alto
    const crista = (x) => 150 + Math.sin(x * 0.006 + 0.6) * 30 + Math.sin(x * 0.03) * 6;
    const encosta = new Path2D();
    encosta.moveTo(-10, H + 10);
    encosta.lineTo(-10, crista(-10));
    for (let x = -10; x <= W + 10; x += 10) encosta.lineTo(x, crista(x));
    encosta.lineTo(W + 10, H + 10);
    encosta.closePath();
    k.fillStyle = '#d9c192';
    k.fill(encosta);
    chaoEmLinhas(k, r, encosta, -10, W + 10, 110, H, 1.9, (x, y) => 0.42 + (y - crista(x)) / 1600 + Math.sin(x * 0.03 + y * 0.012) * 0.1);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.beginPath();
    for (let x = -10; x <= W + 10; x += 10) (x < 0 ? k.moveTo(x, crista(x)) : k.lineTo(x, crista(x)));
    k.stroke();
    for (let i = 0; i < 16; i++) { const x = r() * W; copaGravada(k, r, x, crista(x) + 4, 12 + r() * 12, 8 + r() * 6, { cor: '#a39d6c' }); }
    // o banco de rocha calcária no alto da aldeia, com as bocas das grutas
    const banco = contornoRocha(r, [[-10, 296], [-10, 214], [80, 204], [200, 214], [320, 200], [450, 210], [580, 198], [700, 210], [820, 202], [W + 10, 210], [W + 10, 296]], 6);
    banco.closePath();
    peca(k, banco, [-10, 196, W + 10, 296], { cor: '#efdcb0', ang: 0, passo: 3.6, maxL: 1.6, sombra: (x, y) => 0.18 + (y - 200) / 120, cruzada: 0.7, traco: 1.8 });
    k.save();
    k.clip(banco);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.4;
    for (const y of [236, 262]) { k.beginPath(); for (let x = -10; x <= W + 10; x += 14) (x < 0 ? k.moveTo(x, y) : k.lineTo(x, y + (r() - 0.5) * 5)); k.stroke(); }
    for (let i = 0; i < 16; i++) { const x = r() * W; const [ya, yb] = [[214, 232], [240, 258], [266, 288]][i % 3]; const inc = (r() < 0.5 ? -1 : 1) * (6 + r() * 8); if (i % 3 === 0 || [[84, 296], [346, 518], [564, 784]].some(([a, b]) => x > a && x < b)) continue; k.lineWidth = 1.2; k.beginPath(); k.moveTo(x, ya); k.lineTo(x + inc * 0.5 + (r() - 0.5) * 3, (ya + yb) / 2); k.lineTo(x + inc, yb); k.stroke(); }
    k.restore();
    // a gruta: uma boca larga e baixa na face de rocha, com a laje de cima saliente (o beiral
    // que faz sombra) e o fundo escuro só lá dentro; nas beiradas, meio-tom em hachura
    const gruta = (x, y, w, h) => {
      // a boca: larga e baixa, de beirada torta; o mais escuro é a faixa logo debaixo da laje
      // (a sombra dela), e clareia para o chão da gruta; a beirada tem um meio-tom de pedra
      const topo = [];
      for (let i = 0; i <= 8; i++) topo.push([x + w * 0.06 + w * 0.88 * (i / 8), y - h + Math.sin((i / 8) * Math.PI) * h * 0.18 + (r() - 0.5) * 3 + (i === 0 || i === 8 ? h * 0.3 : 0)]);
      const g = pol([[x, y], [x + 4, y - h * 0.45], ...topo, [x + w - 3, y - h * 0.4], [x + w, y]]);
      k.fillStyle = '#9a8564';
      k.fill(g);
      gravar(k, g, x + w / 2, y - h / 2, w * 0.7, 0.1, 2.4, 2.4, (px, py) => 1 - (py - (y - h)) / h * 0.75 - Math.pow(Math.abs(px - x - w / 2) / (w / 2), 3) * 0.4, '#1e150a', 0);
      gravar(k, g, x + w / 2, y - h / 2, w * 0.7, 1.3, 3.4, 1.6, (px, py) => 0.7 - (py - (y - h)) / h, '#1e150a', 0);
      k.strokeStyle = 'rgba(236,220,186,.8)';
      k.lineWidth = 1.4;
      k.beginPath();
      k.moveTo(x + 2, y - 1);
      k.lineTo(x + 5, y - h * 0.45);
      k.moveTo(x + w - 2, y - 1);
      k.lineTo(x + w - 4, y - h * 0.4);
      k.stroke();
      // a laje de cima: uma pedra com grossura, a face de cima acesa e a de baixo escura,
      // que acaba na rocha (não sai solta para os lados)
      const lajeTopo = topo.map(([px], i) => [px + (i === 0 ? -8 : i === 8 ? 8 : 0), y - h - 3]);
      const laje = pol([...lajeTopo.map(([px, py]) => [px, py - 6]), ...lajeTopo.slice().reverse().map(([px, py]) => [px, py + 2])]);
      // a sombra debaixo da laje, colada na boca: não fica fresta clara entre as duas
      const vao = pol([...lajeTopo.map(([px, py]) => [px, py + 1]), ...topo.slice().reverse().map(([px, py]) => [px, py + 3])]);
      k.fillStyle = '#2a1e10';
      k.fill(vao);
      k.fillStyle = '#e6d3a8';
      k.fill(laje);
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.2;
      k.stroke(laje);
      // a barriga escura da laje, que sobra sobre a boca
      k.strokeStyle = '#2a1e10';
      k.lineWidth = 2.6;
      k.beginPath();
      lajeTopo.forEach(([px, py], i) => (i ? k.lineTo(px, py + 3) : k.moveTo(px, py + 3)));
      k.stroke();
    };
    gruta(130, 268, 120, 34);
    gruta(610, 266, 128, 36);
    gruta(392, 262, 80, 26);
    // as casas, por degraus, de trás para a frente
    const fileiras = [
      [[-20, 330, 96], [64, 326, 84], [210, 334, 120], [430, 330, 90], [530, 328, 74], [700, 334, 110], [820, 330, 80]],
      [[0, 452, 120], [150, 456, 104], [500, 458, 116], [680, 452, 90], [790, 460, 110]],
      [[150, 600, 150], [330, 590, 130]],
    ];
    // a ruela da aldeia: entra pela beirada da direita, no socalco do meio, e sobe em dois
    // lances de degraus entre as casas, virando num patamar; cada lance some em parte atrás
    // da parede de uma casa (as casas vêm depois). As muretas passam com uma abertura.
    const lance = (x0, y0, x1, y1, larg, n) => {
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        const xa = x0 + (x1 - x0) * t0;
        const ya = y0 + (y1 - y0) * t0;
        const xb = x0 + (x1 - x0) * t1;
        const yb = y0 + (y1 - y0) * t1;
        const esp = pol([[xa - larg / 2, ya], [xa + larg / 2, ya], [xa + larg / 2, yb + (ya - yb) * 0.45], [xa - larg / 2, yb + (ya - yb) * 0.45]]);
        peca(k, esp, [xa - larg / 2, yb, xa + larg / 2, ya], { cor: '#b89c6c', ang: 0, passo: 2.4, maxL: 1.4, sombra: () => 0.75, cruzada: 1, traco: 1.2 });
        const piso = pol([[xa - larg / 2, yb + (ya - yb) * 0.45], [xa + larg / 2, yb + (ya - yb) * 0.45], [xb + larg / 2, yb], [xb - larg / 2, yb]]);
        k.fillStyle = r() < 0.5 ? '#ead8b0' : '#e2cda2';
        k.fill(piso);
        k.strokeStyle = SEPIA;
        k.lineWidth = 1;
        k.stroke(piso);
      }
      // as muretas dos lados, em fiadas
      for (const lado of [-1, 1]) {
        const m = pol([[x0 + lado * (larg / 2 + 1), y0 + 2], [x0 + lado * (larg / 2 + 8), y0 - 6], [x1 + lado * (larg / 2 + 8), y1 - 14], [x1 + lado * (larg / 2 + 1), y1 - 6]]);
        muroEmFiadas(k, r, m, [Math.min(x0, x1) - larg, y1 - 20, Math.max(x0, x1) + larg, y0 + 4], { h: 5, larg: 2, cor: '#ddc597', sombra: () => 0.45, traco: 0.9 });
        k.strokeStyle = SEPIA;
        k.lineWidth = 1.2;
        k.stroke(m);
      }
    };
    // o trecho plano que entra pela direita, de lajes, até o pé do primeiro lance
    const rua = pol([[W + 10, 518], [720, 518], [712, 550], [W + 10, 550]]);
    k.fillStyle = '#d9c398';
    k.fill(rua);
    k.save();
    k.clip(rua);
    for (let x = 712; x < W + 10;) { const w2 = 16 + r() * 22; for (const yy of [518, 534]) { const lj = pol([[x + r() * 2, yy + 1], [x + w2, yy + 1 + r() * 2], [x + w2 - 1, yy + 15], [x + 1, yy + 15]]); peca(k, lj, [x, yy, x + w2, yy + 16], { cor: r() < 0.5 ? '#e6d3a8' : '#dcc699', passo: 2.6, maxL: 0.9, sombra: () => 0.35, cruzada: 1, traco: 1 }); } x += w2 + 1; }
    k.restore();
    lance(716, 536, 652, 482, 38, 5);
    // o patamar na abertura da mureta do meio
    const pat = pol([[612, 470], [676, 470], [684, 492], [606, 492]]);
    peca(k, pat, [606, 470, 684, 492], { cor: '#e6d3a8', passo: 2.6, maxL: 0.9, sombra: () => 0.3, cruzada: 1, traco: 1.2 });
    lance(642, 474, 636, 360, 32, 8);
    let jarroFeito = false; // um jarro só na aldeia toda
    fileiras.forEach((fila, f) => {
      // o socalco: a mureta de pedra embaixo de cada fileira
      const ym = fila[0][1] + 18;
      const mur = new Path2D();
      mur.moveTo(-10, ym);
      for (let x = -10; x <= W + 10; x += 12) mur.lineTo(x, ym + Math.sin(x * 0.01 + f) * 6);
      for (let x = W + 10; x >= -10; x -= 12) mur.lineTo(x, ym + 22 + Math.sin(x * 0.01 + f) * 6);
      mur.closePath();
      {
        // a abertura na mureta, por onde a ruela passa (as duas de cima)
        const [g0, g1] = f === 0 ? [612, 660] : f === 1 ? [606, 680] : [W + 30, W + 30];
        const fora = new Path2D();
        fora.rect(-20, ym - 20, g0 + 20, 60);
        fora.rect(g1, ym - 20, W + 40 - g1, 60);
        k.save();
        k.clip(fora);
        muroEmFiadas(k, r, mur, [-10, ym - 8, W + 10, ym + 30], { h: 7, larg: 2, cor: '#e2cb9a', sombra: () => 0.4 });
        k.strokeStyle = SEPIA;
        k.lineWidth = 1.5;
        k.stroke(mur);
        k.restore();
      }
      for (const [x, base, w] of fila) {
        const h = w * (0.5 + r() * 0.12) + f * 4;
        const t = casinha(k, r, x, base, w, h, 24 + f * 4, { cor: '#f3e5c0', lado: '#c4a674', teto: '#e9d6aa', traco: 1.8, janela: true, porta: true, obj });
        marcar(k, obj, t);
        // a escada de fora, de pedra, que sobe para o terraço (em umas casas)
        if (r() < 0.5 && w > 90) {
          for (let d = 0; d < 5; d++) {
            const sx = x - 22 + d * 4;
            const sy = base - d * (h / 5);
            const deg = pol([[sx, sy], [sx, sy - h / 5], [sx + 22, sy - h / 5], [sx + 22, sy]]);
            peca(k, deg, [sx, sy - h / 5, sx + 22, sy], { cor: '#e9d6aa', ang: 0, passo: 3, maxL: 1, sombra: () => 0.45, traco: 1.2, obj });
          }
        }
        // às vezes um jarro, de feitio diferente: o alto de colo estreito, o pote baixo, a bilha
        if (r() < 0.2 && !jarroFeito) {
          const tipo = Math.floor(r() * 3);
          const naLaje = tipo === 2 && r() < 0.6;
          const jx = naLaje ? x + w * 0.7 : x + w * 0.84;
          const jb = naLaje ? base - h - 4 : base + 2;
          const perfis = [[38, 20, (u) => (u < 0.18 ? 0.32 : 0.5 + Math.sin(u * Math.PI) * 0.5)], [24, 30, (u) => (u < 0.1 ? 0.7 : 0.8 + Math.sin(u * Math.PI) * 0.2)], [32, 22, (u) => (u < 0.25 ? 0.3 + u : 0.62 + Math.sin(u * Math.PI) * 0.38)]];
          const [alt, larg, perfil] = perfis[tipo];
          if (jx - larg / 2 < 90 || jx + larg / 2 > W - 90) continue;
          jarroFeito = true;
          const j = vaso(k, jx, jb, alt, larg, perfil);
          peca(k, j, [jx - larg / 2, jb - alt, jx + larg / 2, jb], { cor: '#c6a072', tinta: '#3a1e08', ang: 0.2 + tipo * 0.5, passo: 2.4, maxL: 1.3, sombra: sombraOval(jx, jb - alt / 2, larg / 2, alt / 2, 0), cruzada: 0.65, traco: 1.4, obj });
        }
      }
    });
    // perto, de lado a lado: o socalco da horta, embaixo da mureta da última fileira, com os
    // pés de lentilha e cebola em fila; à direita, o muro alto de pedra do fundo da horta
    const horta = pol([[-10, 846], [-10, 634], [W + 10, 640], [W + 10, 846]]);
    k.fillStyle = '#c9ad7c';
    k.fill(horta);
    chaoEmLinhas(k, r, horta, -10, W + 10, 634, H, 2, () => 0.6);
    // os canteiros: fileiras de lentilha (tufos redondos) alternando com as de cebola (folhas
    // finas e retas), cada fileira num sulco escuro; os canteiros mudam de lugar em lugar
    for (let fila = 0; fila < 7; fila++) {
      const y = 656 + fila * 26 + fila * fila * 0.6;
      k.strokeStyle = 'rgba(58,40,18,0.55)';
      k.lineWidth = 1.4 + fila * 0.2;
      k.beginPath();
      k.moveTo(-10, y + 4 + fila);
      k.lineTo(W + 10, y + 4 + fila * 0.6);
      k.stroke();
      const cebola = (fila + 1) % 3 === 0;
      for (let x = 10 + (fila % 2) * 13; x < W; x += 26 + fila * 2) {
        if (r() < 0.08) continue;
        if (cebola) capim(k, r, x, y + 3, 10 + fila * 2.4, 5, '#4e4a26');
        else copaGravada(k, r, x + (r() - 0.5) * 6, y, (6 + fila * 1.4) * (0.8 + r() * 0.35), (4 + fila * 0.9) * (0.8 + r() * 0.3), { cor: r() < 0.3 ? '#a09a68' : '#b3ad7c' });
      }
    }
    const mh = pol([[694, 746], [698, 726], [710, 718], [714, 700], [730, 692], [738, 678], [W + 10, 662], [W + 10, 742]]);
    const pe = pol([[680, 744], [W + 10, 740], [W + 10, 754], [690, 756]]);
    peca(k, pe, [680, 740, W + 10, 756], { cor: '#a98d60', ang: 0, passo: 2.4, maxL: 1.3, sombra: () => 0.7, cruzada: 0, traco: 0 });
    muroEmFiadas(k, r, mh, [700, 660, W + 10, 744], { h: 9, larg: 2, cor: '#e2cb9a', sombra: (x) => 0.35 + (x - 700) / 400 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(mh);
    // a figueira, à direita, alta e esguia, encostada no muro da horta: o tronco cinza de
    // casca lisa, que sobe torto e se abre em poucos galhos; a copa estreita e alta de folhas
    // largas de três e cinco lobos, gravadas, as de trás mais escuras
    const tronco = new Path2D();
    tronco.moveTo(744, H + 10);
    tronco.bezierCurveTo(752, 792, 738, 762, 750, 712);
    tronco.lineTo(772, 714);
    tronco.bezierCurveTo(764, 762, 778, 792, 782, H + 10);
    tronco.closePath();
    peca(k, tronco, [736, 712, 782, H + 10], { cor: '#a8a08c', ang: 1.45, passo: 3, maxL: 1.8, sombra: (x) => 0.2 + (x - 740) / 50, cruzada: 0.7, traco: 2.2, obj });
    for (const g of [[[756, 732], [742, 702], [734, 678], [724, 648]], [[764, 724], [780, 692], [794, 672], [802, 648]], [[760, 722], [760, 682], [764, 652], [760, 612]]]) vara(k, bezier(g[0], g[1], g[2], g[3], 14), 7, '#7e7662', obj);
    const sombraCopa = lanoso(r, [[716, 732], [708, 672], [714, 612], [736, 578], [768, 570], [802, 588], [820, 642], [818, 712], [794, 754], [746, 758]], 9, 26);
    k.fillStyle = '#5b5734';
    k.fill(sombraCopa);
    gravar(k, sombraCopa, 766, 666, 140, 0.8, 2.8, 1.8, () => 0.85, '#1c1a0e', 0);
    gravar(k, sombraCopa, 766, 666, 140, -0.6, 3.6, 1.4, () => 0.7, '#1c1a0e', 0);
    marcar(k, obj, sombraCopa);
    const folha = (x, y, s2, g, achata, nl, escuro) => {
      k.save();
      k.translate(x, y);
      k.rotate(g);
      k.scale(1, achata);
      const lobos = nl === 5 ? [-Math.PI / 2, -Math.PI / 2 - 0.85, -Math.PI / 2 + 0.85, -Math.PI / 2 - 1.65, -Math.PI / 2 + 1.65] : [-Math.PI / 2, -Math.PI / 2 - 0.95, -Math.PI / 2 + 0.95];
      const tam = nl === 5 ? [1, 0.82, 0.86, 0.55, 0.6] : [1, 0.78, 0.8];
      const f2 = new Path2D();
      const n = 80;
      for (let i = 0; i <= n; i++) {
        const a = -Math.PI - 0.5 + (i / n) * (Math.PI + 1);
        let m = 0;
        lobos.forEach((c, q) => { m = Math.max(m, tam[q] * Math.pow(Math.max(0, Math.cos((a - c) * (nl === 5 ? 2.3 : 1.7))), 0.9)); });
        const rr = s2 * (0.42 + 0.58 * m);
        (i ? f2.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : f2.moveTo(Math.cos(a) * rr, Math.sin(a) * rr));
      }
      f2.closePath();
      k.fillStyle = escuro ? '#7d7a4c' : '#a9a676';
      k.fill(f2);
      // o tom em linha: a hachura curva acompanha a folha, mais cheia do lado de baixo
      gravar(k, f2, 0, -s2 * 0.4, s2 * 1.1, 0.35, 2.6, 1.4, (px, py) => (escuro ? 0.55 : 0.2) + (px / s2) * 0.35 + (py / s2 + 0.5) * 0.3, '#2a2812', 0.3);
      k.strokeStyle = '#2a2812';
      k.lineWidth = 1.1 / Math.max(0.5, achata);
      k.stroke(f2);
      k.lineWidth = 0.9;
      lobos.forEach((c, q) => { k.beginPath(); k.moveTo(0, 0); k.quadraticCurveTo(Math.cos(c) * s2 * 0.3 + 2, Math.sin(c) * s2 * 0.35, Math.cos(c) * s2 * tam[q] * 0.8, Math.sin(c) * s2 * tam[q] * 0.8); k.stroke(); });
      k.restore();
    };
    const folhas = [];
    for (let i = 0; i < 34; i++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * (i > 22 ? 1.08 : 1);
      const x = 766 + Math.cos(a) * 46 * d;
      const y = 664 + Math.sin(a) * 82 * d;
      folhas.push([x, y, 14 + r() * 14, a + (r() - 0.5), 0.45 + r() * 0.55, r() < 0.55 ? 5 : 3, x < 740 ? false : r() < 0.5]);
    }
    folhas.sort((p, q) => (q[6] ? 1 : 0) - (p[6] ? 1 : 0) || p[1] - q[1]);
    for (const fo of folhas) folha(...fo);
    for (const [x, y] of [[738, 684], [790, 644], [776, 724]]) {
      const p = seixo(r, x, y, 6, 8, 0.3, 0.05);
      peca(k, p, [x - 6, y - 8, x + 6, y + 8], { cor: '#7d7a48', sombra: sombraOval(x, y, 6, 8, 0), passo: 2, maxL: 1, traco: 1.2, obj });
    }
    vinheta(k, W, H, 0.2);
  }

  // (12) A ilha de Patmos (Ap 1.9): "Eu estava na ilha de Patmos, para onde tinha sido levado
  // por causa da palavra de Deus." A ilha de pedra no meio do mar, de longe, numa tarde de
  // vento: os morros secos e rochosos, as escarpas que caem no mar, as enseadas, a espuma
  // batendo nos rochedos; o mar aberto, de ondas com crista, e a trilha de luz do sol baixo;
  // no céu, as nuvens redondas do Egeu e as gaivotas.
  function desenhoPatmos(k, W, H, obj) {
    const r = sorteio(7201);
    papelVelho(k, W, H, r, ['#f8f0dc', '#e8d8b4', '#c4aa7e'], [210, 380]);
    const hz = 410;
    const sol = [210, 400];
    // o céu da tarde, só em linhas: um banco de nuvens que atravessa o céu, cheio de linha
    // embaixo de cada rolo (a sombra) e com o alto dos rolos deixado em papel (a luz); embaixo
    // dele, rente ao mar, a faixa clara onde o sol baixo rompe, sem disco
    // as nuvens: cúmulos de base chata, cada um feito de vários rolos redondos; o alto fica
    // no papel (a luz) e a sombra cresce para a base; o céu em volta, em linha mais cheia
    const nuvens = [[330, 256, 140], [600, 236, 160], [170, 300, 96], [470, 316, 84], [740, 318, 84]];
    const bolas = [];
    for (const [cx, base, larg] of nuvens) {
      const n = 6;
      for (let q = 0; q < n; q++) {
        const t = q / (n - 1) - 0.5;
        const rr = larg * (0.32 - Math.abs(t) * 0.22) * (0.85 + r() * 0.3);
        bolas.push({ x: cx + t * larg * 1.3 + (r() - 0.5) * 12, y: base - rr * 0.6, rr, base, larg });
      }
      bolas.push({ x: cx + (r() - 0.5) * 30, y: base - larg * 0.42, rr: larg * 0.3, base, larg });
    }
    const nuvem = (x, y) => {
      let v = -1;
      for (const b of bolas) {
        if (y > b.base) continue;
        const d = Math.hypot(x - b.x, y - b.y) / b.rr;
        if (d < 1) {
          const lado = (x - b.x) / b.rr;
          v = Math.max(v, Math.min(0.85, 0.02 + Math.max(0, (y - (b.base - b.larg * 0.45)) / (b.larg * 0.45)) * 0.75 + Math.max(0, lado) * 0.2));
        }
      }
      return v;
    };
    const fenda = (x, y) => Math.max(0, 1 - Math.hypot((x - sol[0]) / 280, (y - 372) / 46));
    linhas(k, 0, 0, W, hz, 4, 2, (x, y) => {
      const v = nuvem(x, y);
      const base = v >= 0 ? v : 0.36 + (y < 120 ? (120 - y) / 300 : 0);
      return base - fenda(x, y) * 0.95;
    });
    // os raios do sol que saem da fenda, finos, para cima, por trás das nuvens
    k.strokeStyle = 'rgba(122,74,28,.35)';
    k.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.16; k.beginPath(); k.moveTo(sol[0] + Math.cos(a) * 60, 356 + Math.sin(a) * 40); k.lineTo(sol[0] + Math.cos(a) * 300, 356 + Math.sin(a) * 250); k.stroke(); }
    // as gaivotas: o corpo e as asas em arco, poucas
    for (const [x, y, s] of [[420, 330, 1], [470, 352, 0.8], [640, 340, 1.2], [700, 364, 0.7]]) {
      k.strokeStyle = SEPIA;
      k.lineWidth = 2.2 * s;
      k.lineCap = 'round';
      k.beginPath();
      k.moveTo(x - 18 * s, y - 2 * s);
      k.quadraticCurveTo(x - 9 * s, y - 10 * s, x, y);
      k.quadraticCurveTo(x + 9 * s, y - 10 * s, x + 18 * s, y - 2 * s);
      k.stroke();
      k.fillStyle = SEPIA;
      k.beginPath();
      k.ellipse(x, y + 1 * s, 3 * s, 2 * s, 0, 0, 6.283);
      k.fill();
    }
    // a ilha: morros rochosos, vários picos, com as escarpas que caem no mar
    const perfil = [[60, hz + 6], [70, 374], [110, 356], [160, 346], [214, 330], [260, 306], [300, 290], [340, 300], [380, 280], [414, 270], [446, 282], [490, 312], [530, 300], [570, 318], [620, 340], [660, 330], [710, 350], [770, 364], [830, 370], [866, hz + 6]];
    const ilha = contornoRocha(r, perfil, 5);
    ilha.closePath();
    k.fillStyle = '#c9ae80';
    k.fill(ilha);
    // a pele da ilha: camadas de rocha deitadas, que acompanham o morro, mais cheias do lado da
    // sombra (a luz vem da esquerda, do sol baixo), e o mato baixo em pontinhos
    const alto = (x) => { for (let i = 1; i < perfil.length; i++) if (perfil[i][0] >= x) { const [ax, ay] = perfil[i - 1]; const [bx2, by2] = perfil[i]; return ay + (by2 - ay) * ((x - ax) / Math.max(1, bx2 - ax)); } return hz; };
    k.save();
    k.clip(ilha);
    k.strokeStyle = SEPIA;
    k.lineCap = 'round';
    for (let y = 268; y < hz + 4; y += 4.2) {
      let ant = null;
      for (let x = 56; x <= 870; x += 5) {
        const yy = y + Math.sin(x * 0.012 + y * 0.05) * 3 + (alto(x) - 270) * 0.18;
        const dx = x - 414;
        const w = 0.5 + Math.max(0, dx / 420) * 1.6 + (yy - alto(x)) / 260 + Math.max(0, Math.sin(x * 0.04 + y * 0.1)) * 0.5;
        if (ant && yy > alto(x) + 2 && r() > 0.06) { k.lineWidth = Math.min(2.4, w); k.beginPath(); k.moveTo(ant[0], ant[1]); k.lineTo(x, yy); k.stroke(); }
        ant = [x, yy];
      }
    }
    for (let i = 0; i < 160; i++) {
      const x = 70 + r() * 790;
      const y = alto(x) + 6 + r() * (hz - alto(x) - 30);
      k.fillStyle = 'rgba(43,33,18,.75)';
      k.beginPath();
      k.ellipse(x, y, 2.6 + r() * 2, 1.6 + r(), 0, 0, 6.283);
      k.fill();
    }
    k.restore();

    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(ilha);
    marcar(k, obj, ilha);
    // as escarpas: a faixa de penhasco claro que cai no mar, em traço vertical, com as enseadas
    const esc = (x) => hz - 22 - Math.sin(x * 0.03) * 8 - Math.max(0, Math.sin(x * 0.011 + 1)) * 10;
    const penhasco = new Path2D();
    penhasco.moveTo(66, hz + 2);
    for (let x = 66; x <= 862; x += 8) penhasco.lineTo(x, esc(x));
    penhasco.lineTo(862, hz + 2);
    penhasco.closePath();
    k.save();
    k.clip(ilha);
    k.fillStyle = '#e8d4a8';
    k.fill(penhasco);
    k.strokeStyle = SEPIA;
    k.lineCap = 'round';
    for (let x = 68; x < 862; x += 4.2) { const y0 = esc(x); k.lineWidth = 0.6 + Math.max(0, Math.sin(x * 0.05)) * 1.6; k.beginPath(); k.moveTo(x, y0 + 2); k.lineTo(x + (r() - 0.5) * 2, hz + 2); k.stroke(); }
    k.lineWidth = 1.6;
    k.beginPath();
    for (let x = 66; x <= 862; x += 8) (x === 66 ? k.moveTo(x, esc(x)) : k.lineTo(x, esc(x)));
    k.stroke();
    k.restore();
    // a espuma na beira da ilha
    k.strokeStyle = 'rgba(252,250,240,.95)';
    k.lineWidth = 2.4;
    for (let x = 96; x < 856; x += 18) { const y = hz + 2 + r() * 4; k.beginPath(); k.moveTo(x, y); k.quadraticCurveTo(x + 6, y - 4, x + 12 + r() * 6, y); k.stroke(); }
    // o mar: ondas com crista, maiores perto, e a trilha de luz do sol
    const mar = new Path2D();
    mar.rect(-10, hz, W + 20, H);
    k.fillStyle = '#c9c4ad';
    k.fill(mar);
    k.save();
    k.clip(mar);
    k.lineCap = 'round';
    for (let y = hz + 4; y < H + 20; y += 3 + (y - hz) * 0.038) {
      const t = (y - hz) / (H - hz);
      let x = -10 - r() * 40;
      while (x < W + 10) {
        const c = (16 + r() * 40) * (0.35 + t * 1.6);
        const h = 2 + t * 14;
        const trilha = Math.abs(x + c / 2 - sol[0] - (y - hz) * 0.15) < 50 + t * 120;
        if (trilha && r() < 0.6) {
          k.strokeStyle = 'rgba(255,250,232,.95)';
          k.lineWidth = 1 + t * 2.2;
          k.beginPath();
          k.moveTo(x, y);
          k.lineTo(x + c * 0.6, y);
          k.stroke();
        } else {
          // o lado escuro da onda e a crista clara em cima
          k.strokeStyle = SEPIA;
          k.lineWidth = 0.6 + t * 2;
          k.beginPath();
          k.moveTo(x, y);
          k.quadraticCurveTo(x + c * 0.5, y - h, x + c, y);
          k.stroke();
          if (t > 0.25 && r() < 0.35) {
            k.strokeStyle = 'rgba(252,250,240,.95)';
            k.lineWidth = 1 + t * 2.4;
            k.beginPath();
            k.moveTo(x + c * 0.35, y - h * 0.75);
            k.quadraticCurveTo(x + c * 0.5, y - h * 1.05, x + c * 0.7, y - h * 0.7);
            k.stroke();
          }
        }
        x += c + (2 + r() * 10) * (0.4 + t);
      }
    }
    k.restore();
    // perto, à direita: um rochedo da ilha, batido pelo mar, com a espuma em volta
    const roch = contornoRocha(r, [[560, H + 10], [600, 720], [660, 660], [720, 640], [790, 650], [850, 610], [W + 10, 620], [W + 10, H + 10]], 8);
    roch.closePath();
    k.fillStyle = '#8f7656';
    k.fill(roch);
    hachuraEmFaixas(k, r, roch, 560, W + 10, [610, 660, 712, 760, 812, 870].map((b0, q) => (x) => b0 + (x - 560) * -0.12 + Math.sin(x * 0.03 + q) * 6), 5, 2.4, (x) => 0.45 + (x - 600) / 500, SEPIA, { juntas: 3 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.stroke(roch);
    const espuma = lanoso(r, [[520, H + 10], [540, 790], [580, 740], [610, 700], [650, 690], [600, 760], [610, 820], [660, H + 10]], 9, 18);
    k.fillStyle = '#fbf8ee';
    k.fill(espuma);
    gravar(k, espuma, 590, 780, 120, 0.3, 3.4, 1, (px, py) => 0.1 + (px - 560) / 200, SEPIA, 0.3);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(espuma);
    k.fillStyle = SEPIA;
    for (let i = 0; i < 26; i++) { const x = 560 + r() * 80; const y = 650 + r() * 90; k.beginPath(); k.arc(x, y, 1 + r() * 2, 0, 6.283); k.fill(); }
    vinheta(k, W, H, 0.22);
  }
  // ---------- fim dos Lugares ----------

  // ---------- Objetos: as pranchas ----------
  // Cada objeto é uma prancha de gravura, como a funda de Davi: o objeto grande, no meio, em
  // tinta sépia sobre papel com fibra (ou no escuro da casa, quando a história pede luz de
  // lâmpada), com o lugar dele em volta só para contar a história. Gente nenhuma: só o que as
  // pessoas usaram ou deixaram. Cada prancha tem o seu chão e o seu céu, sem repetir as outras.

  // Um céu de manhã em linhas, mais cheio no alto, com bancos de nuvem feitos só de linha mais
  // rala (sem contorno) e a barriga um pouco mais escura.
  function ceuEmLinhas(k, W, hz, nuvens, { passo = 5.2, maxL = 1.5, topo = 0.62, base = 0.08 } = {}) {
    const ruido = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v) - 0.5; };
    linhas(k, 0, 0, W, hz, passo, maxL, (x, y) => {
      let v = base + Math.pow(1 - y / hz, 1.3) * (topo - base);
      for (const [cx, cy, rx, ry] of nuvens) {
        const u = (x - cx) / rx;
        const w = (y - cy) / ry;
        const d = u * u + w * w;
        if (d < 1) v = v * (0.15 + 0.85 * d) + (w > 0.25 ? (1 - d) * 0.32 : 0);
      }
      return v + ruido(x, y) * 0.16;
    });
  }
  // A faixa bordada (barra, punho): losangos e dentes em tinta e cor, ao longo de uma tira.
  function faixaBordada(k, a, b, alt, cor, cor2, tinta) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    k.save();
    k.translate(a[0], a[1]);
    k.rotate(Math.atan2(dy, dx));
    k.fillStyle = cor;
    k.fillRect(0, -alt / 2, L, alt);
    k.strokeStyle = tinta;
    k.lineWidth = 1.2;
    k.strokeRect(0, -alt / 2, L, alt);
    const n = Math.max(2, Math.round(L / (alt * 1.1)));
    const p = L / n;
    for (let i = 0; i < n; i++) {
      const x = i * p;
      k.fillStyle = cor2;
      k.beginPath();
      k.moveTo(x + p * 0.5, -alt * 0.36);
      k.lineTo(x + p * 0.86, 0);
      k.lineTo(x + p * 0.5, alt * 0.36);
      k.lineTo(x + p * 0.14, 0);
      k.closePath();
      k.fill();
      k.stroke();
      k.fillStyle = tinta;
      k.beginPath();
      k.arc(x + p * 0.5, 0, Math.max(1, alt * 0.07), 0, 6.283);
      k.fill();
    }
    k.lineWidth = 1;
    k.beginPath();
    for (let x = 0; x <= L; x += alt * 0.32) { k.moveTo(x, -alt / 2); k.lineTo(x + alt * 0.16, -alt / 2 + alt * 0.14); k.lineTo(x + alt * 0.32, -alt / 2); }
    k.stroke();
    k.restore();
  }

  // ---------- (1) A túnica de José (Gn 37.3) ----------
  // A túnica longa de diversas cores, pendurada pelos ombros numa vara de pastor deitada sobre
  // duas forquilhas, no campo de Hebrom, de manhã. Uma manga cai solta, a outra foi jogada por
  // cima da vara; a barra bordada encosta no capim e dobra no chão (é longa). As faixas de cor
  // descem pelas pregas, e a gravura aperta no fundo de cada prega.
  function desenhoTunica(k, W, H, obj) {
    const r = sorteio(7101);
    papelVelho(k, W, H, r, ['#fbf1dc', '#f0dcb8', '#d9bb90'], [200, 160]);
    const hz = 492;
    ceuEmLinhas(k, W, hz, [[180, 150, 230, 34], [640, 96, 200, 26], [760, 300, 170, 22]]);
    // os morros de Hebrom, longe, em duas camadas
    for (const [base, amp, cor, sv, sem] of [[452, 30, '#e6cda4', 0.32, 1], [486, 22, '#d4b48a', 0.5, 2]]) {
      const f = onda(sorteio(7110 + sem), 4, 0.007);
      const m = pol([[-10, 560], ...Array.from({ length: 48 }, (_, i) => [i * 19 - 4, base + f(i * 19) * amp]), [W + 10, 560]]);
      peca(k, m, [-10, base - amp, W + 10, 560], { cor, ang: 0, passo: 4.4, maxL: 1.2, sombra: () => sv, cruzada: 0.85, traco: 1.4 });
    }
    // o campo: capim baixo em linhas, mais cheio perto
    const chao = new Path2D();
    chao.moveTo(-10, 520);
    for (let x = -10; x <= W + 10; x += 10) chao.lineTo(x, 514 + Math.sin(x * 0.01 + 1) * 5);
    chao.lineTo(W + 10, H + 10);
    chao.lineTo(-10, H + 10);
    chao.closePath();
    k.fillStyle = '#dcc596';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, 510, H, 1.8, (x, y) => 0.4 + (y - 510) / 700 + Math.sin(x * 0.015) * 0.08);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(chao);
    // a vara deitada nas duas forquilhas
    const yv = (x) => 214 + (x - 70) * 0.03;
    const poste = (x, base, alto, inc) => {
      const t = [x + inc, base - alto];
      const p = pol([[x - 11, base], [x - 9, base - alto * 0.5], [t[0] - 8, t[1] + 26], [t[0] - 24, t[1] - 18], [t[0] - 17, t[1] - 22], [t[0] - 1, t[1] + 8], [t[0] + 2, t[1] + 8], [t[0] + 16, t[1] - 20], [t[0] + 23, t[1] - 15], [t[0] + 9, t[1] + 26], [x + 10, base - alto * 0.5], [x + 12, base]]);
      sombraNoChao(k, pol([[x - 10, base - 2], [x + 12, base - 2], [x + 150, base + 22], [x + 120, base + 26]]), 0, 0, 5, 0.3);
      peca(k, p, [x - 24, t[1] - 22, x + 24, base], { cor: '#a98a5c', ang: 1.52, passo: 2.8, maxL: 1.5, sombra: (px) => 0.25 + (px - x + 12) / 24 * 0.6, cruzada: 0.7, traco: 2, obj });
      // os nós da madeira e a casca
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.4;
      for (const f of [0.28, 0.55, 0.8]) { const yy = base - alto * f; k.beginPath(); k.ellipse(x + (r() - 0.5) * 6, yy, 4, 7, 0, 0, 6.283); k.stroke(); }
      // as pedras de calço no pé
      for (const [dx, rx, ry] of [[-24, 16, 10], [22, 13, 8]]) {
        const s = contornoRocha(r, [[x + dx - rx, base + 4], [x + dx - rx * 0.7, base - ry], [x + dx + rx * 0.4, base - ry * 1.1], [x + dx + rx, base + 4]], 2);
        s.closePath();
        peca(k, s, [x + dx - rx, base - ry, x + dx + rx, base + 4], { cor: '#d8c29a', ang: 0.5, passo: 3, maxL: 1.4, sombra: sombraOval(x + dx, base - ry * 0.3, rx, ry, 0), cruzada: 0.7, traco: 1.5 });
      }
    };
    poste(116, 772, 572, 4);
    poste(782, 760, 532, -4);
    const varaP = [[52, yv(52) + 1], [300, yv(300)], [560, yv(560)], [846, yv(846) - 1]];
    vara(k, varaP, 13, '#9c7a4c', obj);
    // a casca da vara: anéis e nós
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.2;
    for (let x = 80; x < 840; x += 26 + r() * 30) { k.beginPath(); k.moveTo(x, yv(x) - 7); k.quadraticCurveTo(x + 3, yv(x), x + 1, yv(x) + 7); k.stroke(); }

    // a túnica: pendurada pela gola na vara; o corpo longo cai em pregas até o capim, as mangas
    // pendem fora dele (com o vão da cava entre a manga e o corpo, para ler "túnica")
    const TI = '#24180a';
    const yo = (x) => yv(x) - 2;
    const xs0 = 300;
    const xs1 = 590;
    // as bordas do corpo: retas até a cava, depois abrem para a barra
    const bordaE = (y) => xs0 + 4 - Math.max(0, y - 380) * 0.13 + Math.sin(y * 0.021) * 2;
    const bordaD = (y) => xs1 - 4 + Math.max(0, y - 380) * 0.14 + Math.sin(y * 0.017 + 1) * 3;
    // as pregas: espaços desiguais (u torto), cada uma com a sua fundura
    const torto = (u) => u + Math.sin(u * 9.4 + 0.7) * 0.035;
    const NP = 6;
    const fase = (u) => torto(u) * NP * Math.PI * 2 + 0.5;
    const fundura = [0.7, 1, 0.55, 0.9, 0.65, 1, 0.8];
    const fu = (u) => fundura[Math.max(0, Math.min(6, Math.floor(torto(u) * NP + 0.5)))];
    // a barra: cada prega acaba na sua altura (a crista desce mais, o fundo sobe), sem dente igual
    const barra = (u) => 782 + Math.cos(fase(u)) * 6 * fu(u) + Math.sin(u * 17 + 0.4) * 2.5 + u * 6 - (u < 0.05 ? (0.05 - u) * 110 : 0) - (u > 0.96 ? (u - 0.96) * 110 : 0);
    const xDe = (u, y) => bordaE(y) + (bordaD(y) - bordaE(y)) * u + Math.sin(fase(u)) * 11 * fu(u) * Math.min(1, Math.max(0, (y - 250) / 260)) * Math.max(0, Math.min(1, u * 9, (1 - u) * 9));
    const corpoPts = [];
    for (let y = yo(xs0) - 6; y <= barra(0); y += 8) corpoPts.push([bordaE(y), y]);
    for (let i = 0; i <= 90; i++) { const u = i / 90; corpoPts.push([xDe(u, barra(u)), barra(u)]); }
    for (let y = barra(1); y >= yo(xs1) - 6; y -= 8) corpoPts.push([bordaD(y), y]);
    // o alto: os ombros dobram por cima da vara (uma curva baixa) e a gola abre no meio
    corpoPts.push([xs1 - 30, yo(xs1) - 14], [490, yo(490) - 15], [470, yo(470) - 13], [445, yo(445) - 11], [420, yo(420) - 13], [400, yo(400) - 15], [xs0 + 30, yo(xs0) - 14]);
    const corpo = pol(corpoPts);
    // a sombra da túnica no capim, para a direita (o sol vem da esquerda, de manhã)
    sombraNoChao(k, pol([[bordaE(780) + 20, 778], [bordaD(780), 788], [bordaD(780) + 170, 812], [bordaE(780) + 160, 808]]), 0, 0, 10, 0.32);
    marcar(k, obj, corpo);
    // as faixas de cor (tingidas, gastas: o tom é baixo, a gravura faz o resto)
    const faixas = [['#b0603c', 0.12], ['#ece0c2', 0.04], ['#5a6e92', 0.13], ['#d8b062', 0.08], ['#8a9258', 0.11], ['#ece0c2', 0.04], ['#b0603c', 0.13], ['#6e5a80', 0.07], ['#d8b062', 0.1], ['#5a6e92', 0.1], ['#b0603c', 0.08]];
    const pinta = (forma, lista, xDeU, y0, y1) => {
      const soma = lista.reduce((s, f) => s + f[1], 0);
      k.save();
      k.clip(forma);
      let u0 = 0;
      for (const [cor, w] of lista) {
        const u1 = u0 + w / soma;
        const pts = [];
        for (let y = y0; y <= y1; y += 10) pts.push([xDeU(u0, y) - 0.6, y]);
        for (let y = y1; y >= y0; y -= 10) pts.push([xDeU(u1, y) + 0.6, y]);
        k.fillStyle = cor;
        k.fill(pol(pts));
        // um fio fino de tinta entre as faixas (o tear)
        k.strokeStyle = 'rgba(36,24,10,.45)';
        k.lineWidth = 1;
        k.beginPath();
        for (let y = y0; y <= y1; y += 10) { const x = xDeU(u1, y); if (y === y0) k.moveTo(x, y); else k.lineTo(x, y); }
        k.stroke();
        u0 = u1;
      }
      k.restore();
    };
    pinta(corpo, faixas, (u, y) => xDe(u, y), 180, 820);
    k.save();
    k.clip(corpo);
    // as pregas: a sombra sobe no fundo de cada prega e do lado direito; a luz, na crista
    const uDe = (x, y) => (x - bordaE(y)) / (bordaD(y) - bordaE(y));
    const sombraPano = (x, y) => {
      const u = uDe(x, y);
      const funda = Math.max(0, Math.sin(fase(u) + Math.PI * 0.5)) * fu(u);
      const desce = Math.min(1, Math.max(0, (y - 240) / 160));
      const crista = Math.max(0, Math.sin(fase(u) - Math.PI * 0.5)) * fu(u);
      return 0.14 + funda * 0.8 * desce - crista * 0.12 * desce + u * 0.16 + Math.max(0, 0.34 - (y - 226) / 70) * 0.7;
    };
    gravar(k, corpo, 444, 500, 380, Math.PI / 2, 3.4, 1.8, sombraPano, TI, 0);
    gravar(k, corpo, 444, 500, 380, Math.PI / 2 - 0.55, 4.4, 1.4, (x, y) => (sombraPano(x, y) - 0.55) * 2.2, TI, 0);
    // as linhas das pregas, do ombro à barra, cada uma com o filete de luz ao lado
    for (let i = 0; i < NP; i++) {
      const u = (i + 0.75 - 0.5 / NP) / NP;
      const y0 = 248 + (i % 3) * 22;
      k.strokeStyle = 'rgba(30,18,6,.85)';
      k.lineWidth = 1.4 + fu(u);
      k.beginPath();
      for (let y = y0; y <= barra(u) - 8; y += 8) { const x = xDe(u, y); if (y === y0) k.moveTo(x, y); else k.lineTo(x, y); }
      k.stroke();
      k.strokeStyle = 'rgba(255,246,222,.55)';
      k.lineWidth = 1.3;
      k.beginPath();
      for (let y = y0 + 16; y <= barra(u) - 14; y += 8) { const x = xDe(u - 0.42 / NP, y); if (y === y0 + 16) k.moveTo(x, y); else k.lineTo(x, y); }
      k.stroke();
    }
    // a barra bordada, seguindo a quebra das pregas
    for (let i = 0; i < 36; i++) {
      const ua = i / 36;
      const ub = (i + 1) / 36;
      faixaBordada(k, [xDe(ua, barra(ua) - 15), barra(ua) - 15], [xDe(ub, barra(ub) - 15) + 0.8, barra(ub) - 15], 22, '#7e3622', '#c7a052', TI);
    }
    k.restore();
    k.strokeStyle = TI;
    k.lineWidth = 2.4;
    k.lineJoin = 'round';
    k.stroke(corpo);
    // a gola: a abertura funda do pescoço (a vara passa por dentro dela) e a tira bordada em volta
    const gola = pol([[408, yo(408) - 13], [445, yo(445) + 52], [482, yo(482) - 13], [470, yo(470) - 13], [445, yo(445) + 30], [420, yo(420) - 13]]);
    k.fillStyle = '#1c1206';
    k.fill(gola);
    k.lineCap = 'round';
    for (const [a, b] of [[[404, yo(404) - 12], [445, yo(445) + 56]], [[445, yo(445) + 56], [486, yo(486) - 12]]]) {
      faixaBordada(k, a, b, 14, '#7e3622', '#c7a052', TI);
    }
    // a vara aparece no fundo da gola
    k.save();
    k.clip(gola);
    vara(k, [[400, yv(400)], [490, yv(490)]], 13, '#7f6440', null);
    k.restore();
    // a manga esquerda: dobra por cima da vara e cai solta, fora do corpo (o vão da cava fica à vista)
    const mE = pol([[xs0 + 34, yo(xs0 + 34) - 14], [262, yo(262) - 14], [236, yo(236) - 8], [226, yo(226) + 16], [222, 330], [214, 420], [212, 488], [268, 494], [276, 430], [284, 352], [292, 318], [306, yo(306) + 50]]);
    sombraNoChao(k, mE, 10, 8, 6, 0.3);
    marcar(k, obj, mE);
    const xManga = (u, y) => 226 - (y - 240) * 0.05 + u * (60 + (y - 240) * 0.01);
    pinta(mE, [['#5a6e92', 0.3], ['#d8b062', 0.12], ['#b0603c', 0.3], ['#ece0c2', 0.08], ['#8a9258', 0.3]], xManga, 200, 520);
    const sManga = (x, y) => 0.16 + Math.max(0, Math.sin((x - 230) * 0.1 + 1.4)) * 0.45 + (x - 214) / 180 + Math.max(0, 0.3 - (y - 226) / 60);
    gravar(k, mE, 250, 360, 200, Math.PI / 2 + 0.05, 3.4, 1.8, sManga, TI, 0);
    gravar(k, mE, 250, 360, 200, Math.PI / 2 + 1.1, 4.2, 1.5, (x, y) => (sManga(x, y) - 0.62) * 2.2, TI, 0);
    faixaBordada(k, [212, 472], [272, 478], 22, '#7e3622', '#c7a052', TI);
    k.strokeStyle = TI;
    k.lineWidth = 2.4;
    k.stroke(mE);
    // a boca do punho, escura, e a cava (a costura onde a manga encontra o corpo)
    k.fillStyle = '#1c1206';
    k.beginPath();
    k.ellipse(240, 491, 27, 5, 0.1, 0, 6.283);
    k.fill();
    // a manga direita: jogada por cima da vara, pende na frente dela, mais curta e torcida
    const mD = pol([[xs1 - 18, yo(xs1) - 13], [640, yo(640) - 16], [690, yo(690) - 13], [708, yo(708) + 8], [714, 300], [710, 368], [664, 376], [660, 316], [650, yo(650) + 20], [604, yo(604) + 18], [xs1 - 6, yo(xs1) + 30]]);
    sombraNoChao(k, mD, 10, 8, 6, 0.28);
    marcar(k, obj, mD);
    pinta(mD, [['#b0603c', 0.32], ['#ece0c2', 0.08], ['#5a6e92', 0.3], ['#d8b062', 0.3]], (u, y) => 562 + u * 156, 180, 400);
    const sMD = (x, y) => 0.26 + (x - 600) / 220 + (y < yo(x) + 4 ? -0.18 : 0.14) + Math.max(0, Math.sin((x - 600) * 0.08)) * 0.25;
    gravar(k, mD, 656, 290, 150, Math.PI / 2 - 0.05, 3.4, 1.8, sMD, TI, 0);
    gravar(k, mD, 656, 290, 150, Math.PI / 2 + 1.1, 4.2, 1.5, (x, y) => (sMD(x, y) - 0.62) * 2.2, TI, 0);
    faixaBordada(k, [662, 360], [712, 356], 20, '#7e3622', '#c7a052', TI);
    k.strokeStyle = TI;
    k.lineWidth = 2.4;
    k.stroke(mD);
    // o capim na barra e no pé dos postes: tufos cheios, claros
    k.save();
    k.strokeStyle = 'rgba(96,78,40,.6)';
    k.lineCap = 'round';
    for (const [x0, x1, y, n] of [[90, 150, 776, 22], [744, 820, 764, 20], [230, 330, 800, 18], [560, 660, 806, 18]]) {
      for (let i = 0; i < n; i++) {
        const bx = x0 + r() * (x1 - x0);
        const a = -Math.PI / 2 + (r() - 0.5) * 1.9;
        const c = 14 + r() * 18;
        k.lineWidth = 1.4 + r() * 0.9;
        k.beginPath();
        k.moveTo(bx, y + 4);
        k.quadraticCurveTo(bx + Math.cos(a) * c * 0.5, y + Math.sin(a) * c * 0.7, bx + Math.cos(a) * c, y + Math.sin(a) * c * 0.9);
        k.stroke();
      }
    }
    k.restore();
    vinheta(k, W, H, 0.2);
  }
  // Uma curva lisa pelos pontos (Catmull-Rom), amostrada a cada "passo" px de comprimento:
  // [{ x, y, tx, ty, s }], com a tangente unitária e o comprimento acumulado.
  function curvaPor(pts, passo = 3) {
    const fino = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let j = 0; j < 24; j++) {
        const t = j / 24;
        const t2 = t * t;
        const t3 = t2 * t;
        fino.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    fino.push(pts[pts.length - 1]);
    const out = [];
    let s = 0;
    let falta = 0;
    for (let i = 1; i < fino.length; i++) {
      const [ax, ay] = fino[i - 1];
      const [bx, by] = fino[i];
      const d = Math.hypot(bx - ax, by - ay) || 1e-6;
      while (falta <= d) {
        const t = falta / d;
        out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, tx: (bx - ax) / d, ty: (by - ay) / d, s: s + falta });
        falta += passo;
      }
      falta -= d;
      s += d;
    }
    return out;
  }
  // O contorno de um tubo (vara, corpo de serpente) em volta da curva, com a largura em cada
  // comprimento: larg(s). Devolve a forma e as bordas (para gravar e pintar por cima).
  function tuboAo(c, larg) {
    const e = [];
    const d = [];
    for (const q of c) {
      const w = larg(q.s) / 2;
      e.push([q.x + q.ty * w, q.y - q.tx * w]);
      d.push([q.x - q.ty * w, q.y + q.tx * w]);
    }
    const forma = pol([...e, ...d.reverse()]);
    return { forma, e, d: d.reverse() };
  }

  // ---------- (2) A vara de Moisés (Êx 4.2-4) ----------
  // Rente ao chão do deserto de Midiã: a vara de pastor jogada no chão, que da metade em diante
  // já virou serpente. A madeira gasta (o nó da mão, a casca, os veios) racha em escamas, o
  // corpo serpenteia na areia e ergue o pescoço, de perfil, a língua de fora. As sombras vão
  // para a direita (o sol da tarde está à esquerda). Ninguém: Moisés fugiu dela (4.3).
  function desenhoVara(k, W, H, obj) {
    const r = sorteio(7201);
    papelVelho(k, W, H, r, ['#fbefd6', '#f0d6ac', '#d6b07e'], [140, 120]);
    const hz = 236;
    ceuEmLinhas(k, W, hz, [[620, 90, 260, 26], [150, 170, 200, 16]], { topo: 0.55, base: 0.06 });
    // a serra de Midiã, longe e baixa, em faixas de camada
    const fS = onda(sorteio(7210), 5, 0.008);
    const serra = pol([[-10, 280], ...Array.from({ length: 60 }, (_, i) => [i * 16 - 6, 222 - Math.max(0, fS(i * 16)) * 18 - (i > 6 && i < 22 ? Math.sin((i - 6) / 16 * Math.PI) * 24 : 0)]), [W + 10, 280]]);
    peca(k, serra, [-10, 170, W + 10, 280], { cor: '#e2c49a', ang: 0.05, passo: 4.2, maxL: 1.2, sombra: (x, y) => 0.25 + (y - 190) / 200, cruzada: 0.9, traco: 1.4 });
    // o chão de areia e cascalho, em perspectiva
    const chao = new Path2D();
    chao.moveTo(-10, hz + 10);
    for (let x = -10; x <= W + 10; x += 10) chao.lineTo(x, hz + 6 + Math.sin(x * 0.013) * 4);
    chao.lineTo(W + 10, H + 10);
    chao.lineTo(-10, H + 10);
    chao.closePath();
    k.fillStyle = '#ead5ae';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, hz, H, 1.7, (x, y) => 0.32 + (y - hz) / 1000 + Math.sin(x * 0.011 + y * 0.004) * 0.12);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.5;
    k.stroke(chao);
    // umas ondulações de vento na areia e o cascalho
    k.save();
    k.strokeStyle = 'rgba(70,46,18,.45)';
    k.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const y = hz + 30 + r() * (H - hz - 40);
      const x = r() * W;
      const l = 30 + (y - hz) * 0.25 * (0.5 + r());
      k.lineWidth = 0.8 + (y - hz) / 400;
      k.beginPath();
      k.moveTo(x, y);
      k.quadraticCurveTo(x + l / 2, y - 3 - (y - hz) / 100, x + l, y);
      k.stroke();
    }
    k.restore();
    const pedrinha = (x, y, rx, ry) => {
      const p = contornoRocha(r, [[x - rx, y + ry * 0.5], [x - rx * 0.7, y - ry * 0.6], [x + rx * 0.2, y - ry], [x + rx, y - ry * 0.2], [x + rx * 0.8, y + ry * 0.7]], Math.max(1, rx * 0.12));
      p.closePath();
      sombraNoChao(k, p, rx * 0.5, ry * 0.4, 2 + rx * 0.08, 0.3);
      peca(k, p, [x - rx, y - ry, x + rx, y + ry], { cor: '#d9c09a', ang: 0.6, passo: Math.max(2.2, rx * 0.12), maxL: 1.4, sombra: sombraOval(x, y, rx, ry, 0), cruzada: 0.72, traco: Math.min(1.6, 0.6 + rx * 0.04) });
    };
    for (const [x, y, rx, ry] of [[150, 310, 22, 9], [470, 280, 14, 6], [350, 300, 22, 8], [60, 470, 34, 14], [850, 790, 40, 18], [300, 806, 30, 12], [560, 800, 24, 10], [520, 266, 10, 4], [250, 262, 9, 4], [420, 420, 16, 6]]) pedrinha(x, y, rx, ry);
    // um arbusto seco de deserto, longe, à esquerda
    k.save();
    k.strokeStyle = 'rgba(58,40,18,.8)';
    k.lineCap = 'round';
    const galho = (x, y, a, l, g) => {
      if (g > 4 || l < 4) return;
      const x1 = x + Math.cos(a) * l;
      const y1 = y + Math.sin(a) * l;
      k.lineWidth = Math.max(0.6, 2.6 - g * 0.5);
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x1, y1);
      k.stroke();
      galho(x1, y1, a - 0.35 - r() * 0.3, l * 0.7, g + 1);
      galho(x1, y1, a + 0.3 + r() * 0.3, l * 0.68, g + 1);
    };
    for (const a of [-1.9, -1.6, -1.25]) galho(560, 262, a, 14, 0);
    k.restore();

    // a vara e a serpente: uma linha só, do cabo (na madeira) à cabeça erguida
    const linha = curvaPor([[118, 704], [86, 712], [76, 744], [102, 768], [150, 764], [300, 690], [440, 618], [530, 584], [612, 616], [680, 662], [748, 652], [772, 588], [752, 510], [744, 442], [722, 404], [688, 394]].map(([x, y]) => [x, y - 34]), 2.5);
    const S = linha[linha.length - 1].s;
    const qDe0 = (s) => linha[Math.max(0, Math.min(linha.length - 1, Math.round(s / 2.5)))];
    const qDe = qDe0;
    const sMuda = 470;
    const sFim = 630;
    // a largura: a vara fina e gasta; a serpente engrossa no meio e afina no pescoço
    const larg = (s) => {
      const wVara = 30 - Math.max(0, 40 - s) * 0.12;
      const cobra = 34 + Math.sin(Math.min(1, Math.max(0, (s - sMuda) / (S - 120 - sMuda))) * Math.PI) * 18 - Math.max(0, s - (S - 120)) * 0.06;
      const t = Math.max(0, Math.min(1, (s - sMuda) / (sFim - sMuda)));
      return wVara * (1 - t) + cobra * t;
    };
    // a sombra no chão: a parte deitada encosta; a do pescoço erguido cai no chão, à direita
    const sPesc = linha.find((q) => q.s > S - 300 && q.ty < -0.5)?.s || S;
    const yPe = qDe0(sPesc).y;
    const somb = linha.map((q) => {
      const h = q.s > sPesc ? Math.max(0, yPe - q.y) : 0;
      return { x: q.x + 9 + h * 0.75, y: (h ? yPe : q.y) + 9 + h * 0.12, tx: q.tx, ty: q.ty, s: q.s };
    });
    const sombraC = tuboAo(curvaPor(somb.filter((q, i) => i % 4 === 0).map((q) => [q.x, q.y]), 3), (s) => larg(Math.min(S, s)) * 0.85).forma;
    sombraNoChao(k, sombraC, 0, 0, 6, 0.42);
    const { forma: tubo, e: bE, d: bD } = tuboAo(linha, larg);
    marcar(k, obj, tubo);
    // a madeira: o tom, os veios ao longo e a sombra embaixo
    k.save();
    k.clip(tubo);
    k.lineCap = 'round';
    for (let i = 0; i < linha.length - 1; i++) {
      const q = linha[i];
      const t = Math.max(0, Math.min(1, (q.s - sMuda) / (sFim - sMuda)));
      const w = larg(q.s) / 2 + 2;
      // o corte transversal: escuro embaixo (lado d), claro em cima (lado e)
      for (let v = -1; v <= 1; v += 0.25) {
        const luz = Math.max(0, -v * 0.8 + 0.25);
        const cMad = [Math.round(132 + 70 * luz), Math.round(92 + 56 * luz), Math.round(48 + 40 * luz)];
        const cCob = [Math.round(100 + 70 * luz), Math.round(90 + 64 * luz), Math.round(54 + 42 * luz)];
        const c = cMad.map((m, j) => Math.round(m * (1 - t) + cCob[j] * t));
        k.fillStyle = 'rgb(' + c.join(',') + ')';
        k.beginPath();
        k.arc(q.x - q.ty * v * w, q.y + q.tx * v * w, 2.4, 0, 6.283);
        k.fill();
      }
    }
    // os veios da madeira, compridos, que somem onde as escamas começam
    for (let f = -0.75; f <= 0.8; f += 0.22) {
      k.strokeStyle = 'rgba(52,30,10,' + (0.35 + Math.max(0, f) * 0.5).toFixed(2) + ')';
      k.lineWidth = 0.9 + Math.max(0, f) * 1.3;
      k.beginPath();
      let ini = true;
      for (const q of linha) {
        if (q.s > sMuda + 40 + f * 30) break;
        const w = larg(q.s) / 2;
        const ond = Math.sin(q.s * 0.05 + f * 9) * 0.08;
        const x = q.x - q.ty * (f + ond) * w;
        const y = q.y + q.tx * (f + ond) * w;
        if (ini) { k.moveTo(x, y); ini = false; } else k.lineTo(x, y);
      }
      k.stroke();
    }
    // a hachura de volta da madeira: traços curtos de través no lado da sombra
    k.strokeStyle = 'rgba(46,26,8,.75)';
    for (let i = 0; i < linha.length; i += 1) {
      const q = linha[i];
      if (q.s > sMuda + 30 || i % 1) continue;
      if (Math.round(q.s / 2.5) % 1.2 > 1) continue;
      const w = larg(q.s) / 2;
      const ini = 0.25 + Math.sin(q.s * 0.7) * 0.06;
      k.lineWidth = 0.8;
      k.beginPath();
      k.moveTo(q.x - q.ty * ini * w, q.y + q.tx * ini * w);
      k.lineTo(q.x - q.ty * 0.98 * w, q.y + q.tx * 0.98 * w);
      k.stroke();
    }
    // os nós da madeira e o gasto do cabo (onde a mão segura, mais liso e escuro)
    for (const s0 of [250, 380]) {
      const q = qDe(s0);
      k.strokeStyle = 'rgba(52,30,10,.85)';
      k.lineWidth = 1.4;
      k.beginPath();
      k.ellipse(q.x - q.ty * 3, q.y + q.tx * 3, 7, 4, Math.atan2(q.ty, q.tx), 0, 6.283);
      k.stroke();
      k.beginPath();
      k.ellipse(q.x - q.ty * 3, q.y + q.tx * 3, 3, 1.6, Math.atan2(q.ty, q.tx), 0, 6.283);
      k.stroke();
    }
    // as escamas: fileiras ao longo do corpo, cada escama um losango de ponta redonda, com a
    // luz em cima; na passagem, as rachaduras da casca viram escamas aos poucos
    const escama = (x, y, a, tam, luz, cor) => {
      k.save();
      k.translate(x, y);
      k.rotate(a);
      k.beginPath();
      k.moveTo(-tam * 0.6, 0);
      k.quadraticCurveTo(-tam * 0.2, -tam * 0.55, tam * 0.55, -tam * 0.05);
      k.quadraticCurveTo(-tam * 0.2, tam * 0.55, -tam * 0.6, 0);
      k.closePath();
      k.fillStyle = cor;
      k.fill();
      k.strokeStyle = 'rgba(30,22,8,' + (0.55 + (1 - luz) * 0.4).toFixed(2) + ')';
      k.lineWidth = 0.9 + (1 - luz) * 0.7;
      k.stroke();
      if (luz > 0.45) {
        k.strokeStyle = 'rgba(255,246,214,' + ((luz - 0.45) * 1.2).toFixed(2) + ')';
        k.lineWidth = 0.9;
        k.beginPath();
        k.moveTo(-tam * 0.35, -tam * 0.18);
        k.quadraticCurveTo(0, -tam * 0.34, tam * 0.3, -tam * 0.08);
        k.stroke();
      }
      k.restore();
    };
    const desenho = (s, v) => {
      // o desenho do dorso: manchas em losango escuras ao longo da espinha
      const fase = ((s - sMuda) / 46) % 1;
      const losango = Math.abs(v) < 0.5 - Math.abs(fase - 0.5) * 0.9;
      return losango;
    };
    for (let s = sMuda - 50; s < S - 4; s += 7.5) {
      const q = qDe(s);
      const t = Math.max(0, Math.min(1, (s - sMuda + 50) / (sFim - sMuda + 30)));
      const w = larg(s) / 2;
      const a = Math.atan2(q.ty, q.tx);
      const fila = Math.round((s - sMuda) / 7.5);
      for (let v = -0.95; v <= 0.95; v += 0.21) {
        if (r() > t * 1.15) continue;
        const vv = v + (fila % 2 ? 0.105 : 0);
        if (Math.abs(vv) > 0.98) continue;
        const luz = Math.max(0, Math.min(1, -vv * 0.7 + 0.35));
        const escuro = desenho(s, vv) && s > sMuda;
        const base = escuro ? [58, 44, 22] : [140 + luz * 60, 124 + luz * 56, 76 + luz * 44];
        escama(q.x - q.ty * vv * w, q.y + q.tx * vv * w, a, 6.8 + w * 0.12, luz, 'rgb(' + base.map(Math.round).join(',') + ')');
      }
    }
    // as rachaduras da casca, na passagem
    k.strokeStyle = 'rgba(40,24,8,.8)';
    k.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) {
      const s = sMuda - 90 + r() * 110;
      const q = qDe(s);
      const v = (r() - 0.5) * 1.6;
      const w = larg(s) / 2;
      const x = q.x - q.ty * v * w;
      const y = q.y + q.tx * v * w;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + q.tx * (5 + r() * 6) - q.ty * (r() - 0.5) * 6, y + q.ty * (5 + r() * 6) + q.tx * (r() - 0.5) * 6);
      k.stroke();
    }
    // a barriga do pescoço erguido: as placas largas, em faixas
    for (let s = S - 230; s < S - 66; s += 8) {
      const q = qDe(s);
      if (q.ty > -0.3) continue;
      const w = larg(s) / 2;
      const lado = 0.55;
      k.strokeStyle = 'rgba(40,28,10,.7)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(q.x + q.ty * lado * w, q.y - q.tx * lado * w);
      k.lineTo(q.x + q.ty * w, q.y - q.tx * w);
      k.stroke();
    }
    k.restore();
    k.strokeStyle = '#24180a';
    k.lineWidth = 3;
    k.lineJoin = 'round';
    k.stroke(tubo);
    // a ponta do cabo: o corte gasto da madeira
    const q0 = linha[0];
    k.fillStyle = '#b8935e';
    k.beginPath();
    k.ellipse(q0.x, q0.y, larg(0) * 0.22, larg(0) * 0.52, Math.atan2(q0.ty, q0.tx), 0, 6.283);
    k.fill();
    k.stroke();
    k.strokeStyle = 'rgba(52,30,10,.6)';
    k.lineWidth = 1;
    k.beginPath();
    k.ellipse(q0.x, q0.y, larg(0) * 0.1, larg(0) * 0.26, Math.atan2(q0.ty, q0.tx), 0, 6.283);
    k.stroke();

    // a cabeça, de perfil, olhando para a direita: larga atrás dos olhos, o focinho baixo,
    // a boca fechada em linha comprida, a narina, o olho pequeno e a língua bifurcada
    const fim = linha[linha.length - 1];
    k.save();
    k.translate(fim.x + 14, fim.y + 4);
    k.scale(-1.55, 1.55);
    k.rotate(Math.atan2(fim.ty, -fim.tx) * 0.5 - 0.08);
    const cab = new Path2D();
    cab.moveTo(-16, 14);
    cab.bezierCurveTo(-12, -6, 0, -18, 18, -18);
    cab.bezierCurveTo(34, -18, 50, -12, 60, -4);
    cab.bezierCurveTo(66, 0, 66, 6, 60, 9);
    cab.bezierCurveTo(44, 14, 22, 18, 4, 20);
    cab.bezierCurveTo(-6, 21, -14, 20, -16, 14);
    cab.closePath();
    k.fillStyle = '#b4a16a';
    k.fill(cab);
    marcar(k, obj, cab);
    gravar(k, cab, 22, 2, 50, 0.15, 2.8, 1.6, (x, y) => 0.25 + (y + 18) / 40 * 0.6, '#24180a', 0.1);
    // as placas de cima da cabeça e o desenho escuro atrás do olho
    k.save();
    k.clip(cab);
    k.strokeStyle = 'rgba(36,24,10,.75)';
    k.lineWidth = 1.1;
    for (const [x0, y0, x1, y1] of [[6, -16, 10, -6], [20, -18, 22, -8], [34, -16, 34, -7], [46, -11, 44, -4]]) { k.beginPath(); k.moveTo(x0, y0); k.lineTo(x1, y1); k.stroke(); }
    k.fillStyle = 'rgba(52,38,16,.85)';
    k.beginPath();
    k.moveTo(28, -2);
    k.bezierCurveTo(16, 2, 4, 6, -14, 6);
    k.lineTo(-14, 12);
    k.bezierCurveTo(4, 12, 18, 8, 30, 3);
    k.closePath();
    k.fill();
    k.restore();
    k.strokeStyle = '#24180a';
    k.lineWidth = 2.2;
    k.stroke(cab);
    // a boca: uma linha comprida, fechada, que desce um pouco para trás
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(62, 6);
    k.bezierCurveTo(46, 10, 28, 12, 12, 13);
    k.stroke();
    // o olho: pequeno, com a sobrancelha de escama por cima (tom, não arco)
    k.fillStyle = '#d9a640';
    k.beginPath();
    k.ellipse(36, -6, 4.2, 3.6, 0, 0, 6.283);
    k.fill();
    k.strokeStyle = '#24180a';
    k.lineWidth = 1.2;
    k.stroke();
    k.fillStyle = '#140c04';
    k.beginPath();
    k.ellipse(36.5, -6, 1.1, 3.2, 0, 0, 6.283);
    k.fill();
    // a narina
    k.beginPath();
    k.ellipse(56, -2, 1.6, 1.1, 0.3, 0, 6.283);
    k.fill();
    // a língua bifurcada, para fora
    k.strokeStyle = '#7a2a18';
    k.lineWidth = 1.8;
    k.lineCap = 'round';
    k.beginPath();
    k.moveTo(64, 6);
    k.lineTo(80, 8);
    k.lineTo(90, 3);
    k.moveTo(80, 8);
    k.lineTo(91, 13);
    k.stroke();
    k.restore();
    vinheta(k, W, H, 0.2);
  }
  // Um tubo de ouro gravado ao longo de uma curva: o tom pela largura (aceso do lado da luz),
  // a hachura de volta na sombra e o fio de luz. "luz" diz de que lado (−1 ou 1) a luz bate.
  function tuboDeOuro(k, c, larg, { luz = -1, obj, claro = 0, tom = tomDeOuro, tinta = TINTA_OURO, brilhoCor = 'rgba(255,246,214,.75)', semPontas = false } = {}) {
    const { forma, e: bordaE, d: bordaD } = tuboAo(c, larg);
    marcar(k, obj, forma);
    // o lado da sombra de cada amostra é o que olha para baixo e para a direita (a luz vem de
    // cima, da esquerda), qualquer que seja o sentido em que a curva foi traçada; onde a curva
    // vira, o lado passa de um para o outro aos poucos (sem salto na sombra nem no brilho)
    const lado = (q) => Math.max(-1, Math.min(1, (q.ty * 0.55 - q.tx * 0.83) * 3));
    k.save();
    k.clip(forma);
    for (const q of c) {
      const w = larg(q.s) / 2 + 1.5;
      const sl = lado(q);
      for (let v = -1; v <= 1.001; v += 0.2) {
        const l = Math.max(0, Math.min(1, 0.5 + v * sl * 0.42 - Math.abs(v) * 0.18 + claro));
        k.fillStyle = tom(0.2 + l * 0.75);
        k.beginPath();
        k.arc(q.x - q.ty * v * w, q.y + q.tx * v * w, Math.max(1.6, w * 0.24), 0, 6.283);
        k.fill();
      }
    }
    k.strokeStyle = tinta;
    k.lineCap = 'round';
    for (let i = 0; i < c.length; i += 2) {
      const q = c[i];
      const w = larg(q.s) / 2;
      // os traços de volta só no lado da sombra, mais grossos perto da beirada
      const lq = lado(q);
      if (Math.abs(lq) < 0.05) continue;
      for (const [v0, v1, lw] of [[0.05, 0.45, 0.6], [0.45, 1.0, 1.1]]) {
        k.lineWidth = lw * Math.abs(lq);
        k.beginPath();
        const sl = Math.sign(lq);
        k.moveTo(q.x + q.ty * sl * v0 * w, q.y - q.tx * sl * v0 * w);
        k.lineTo(q.x + q.ty * sl * v1 * w, q.y - q.tx * sl * v1 * w);
        k.stroke();
      }
    }
    k.strokeStyle = brilhoCor;
    k.lineWidth = Math.max(1, larg(0) * 0.08);
    k.beginPath();
    c.forEach((q, i) => { const w = larg(q.s) / 2; const sl = lado(q); const x = q.x - q.ty * sl * 0.55 * w; const y = q.y + q.tx * sl * 0.55 * w; if (i) k.lineTo(x, y); else k.moveTo(x, y); });
    k.stroke();
    k.restore();
    k.strokeStyle = tinta;
    k.lineWidth = 1.8;
    if (semPontas) { k.stroke(pol(bordaE, false)); k.stroke(pol(bordaD, false)); } else k.stroke(forma);
    return forma;
  }
  // Um corpo de ouro torneado (o pé do candelabro): o perfil é a lista [y, raio] de cima para
  // baixo; visto um pouco de cima, cada anel é uma elipse achatada (kE). O tom corre da luz (à
  // esquerda) para a sombra, as linhas da gravura são verticais, mais grossas na sombra, e o
  // tampo de cada degrau fica aceso.
  function torneadoDeOuro(k, cx, perfil, kE, obj) {
    const esq = perfil.map(([y, rr]) => [cx - rr, y]);
    const dir = perfil.map(([y, rr]) => [cx + rr, y]).reverse();
    const [yb, rb] = perfil[perfil.length - 1];
    const forma = new Path2D();
    forma.moveTo(esq[0][0], esq[0][1]);
    for (const p of esq) forma.lineTo(p[0], p[1]);
    forma.ellipse(cx, yb, rb, rb * kE, 0, Math.PI, 0, true);
    for (const p of dir) forma.lineTo(p[0], p[1]);
    forma.closePath();
    const rMax = Math.max(...perfil.map((p) => p[1]));
    const g = k.createLinearGradient(cx - rMax, 0, cx + rMax, 0);
    g.addColorStop(0, tomDeOuro(0.5));
    g.addColorStop(0.28, tomDeOuro(0.92));
    g.addColorStop(0.62, tomDeOuro(0.55));
    g.addColorStop(1, tomDeOuro(0.18));
    k.fillStyle = g;
    k.fill(forma);
    marcar(k, obj, forma);
    // as linhas verticais que seguem o volume (curvas como as elipses), na sombra
    k.save();
    k.clip(forma);
    k.strokeStyle = TINTA_OURO;
    k.lineCap = 'round';
    for (let u = -0.98; u <= 0.98; u += 0.05) {
      const sv = u > -0.3 ? (u + 0.3) * 1.4 : (-0.62 - u) * 1.5;
      if (sv <= 0.08) continue;
      k.lineWidth = Math.min(2, sv * 1.8);
      k.beginPath();
      perfil.forEach(([y, rr], i) => { const x = cx + u * rr; const yy = y + Math.sqrt(Math.max(0, 1 - u * u)) * rr * kE; if (i) k.lineTo(x, yy); else k.moveTo(x, yy); });
      k.stroke();
    }
    k.restore();
    // os degraus: onde o raio aumenta de repente, o tampo do degrau, aceso, e a sua beirada
    for (let i = 1; i < perfil.length; i++) {
      const [y0, r0] = perfil[i - 1];
      const [y1, r1] = perfil[i];
      if (r1 - r0 > 6 && y1 - y0 < 6) {
        const tampo = new Path2D();
        tampo.ellipse(cx, y1, r1, r1 * kE, 0, 0, 6.283);
        k.save();
        k.clip(tampo);
        const gt = k.createLinearGradient(cx - r1, 0, cx + r1, 0);
        gt.addColorStop(0, tomDeOuro(0.98));
        gt.addColorStop(1, tomDeOuro(0.6));
        k.fillStyle = gt;
        k.fill(tampo);
        k.restore();
        k.strokeStyle = TINTA_OURO;
        k.lineWidth = 1.4;
        k.beginPath();
        k.ellipse(cx, y1, r1, r1 * kE, 0, 0, Math.PI);
        k.stroke();
        k.strokeStyle = tomDeOuro(0.4);
        k.beginPath();
        k.ellipse(cx, y1, r0, r0 * kE, 0, 0, Math.PI);
        k.stroke();
      }
    }
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 2;
    k.stroke(forma);
  }
  // Uma taça em flor de amêndoa num braço do candelabro (Êx 25.33), de uma peça com ele: o
  // botão (um anel bojudo, mais largo que o braço, que o abraça) e a flor (o cálice que sai do
  // braço e abre em três pétalas viradas para a lâmpada, cada uma com a nervura); o braço
  // continua de dentro do cálice. "ang" 0 é o braço subindo; w é a largura do braço.
  function tacaDeAmendoa(k, x, y, ang, w, obj, flor = true) {
    k.save();
    k.translate(x, y);
    k.rotate(ang);
    const pinta = (p, a0, a1) => {
      const g = k.createLinearGradient(-w * 1.2, 0, w * 1.2, 0);
      g.addColorStop(0, tomDeOuro(a0));
      g.addColorStop(0.35, tomDeOuro(0.82));
      g.addColorStop(1, tomDeOuro(a1));
      k.fillStyle = g;
      k.fill(p);
      marcar(k, obj, p);
    };
    // o botão: um anel bojudo em volta do braço
    const bt = new Path2D();
    bt.moveTo(-w * 0.5, w * 1.0);
    bt.bezierCurveTo(-w * 0.95, w * 0.95, -w * 0.95, w * 0.25, -w * 0.5, w * 0.18);
    bt.lineTo(w * 0.5, w * 0.18);
    bt.bezierCurveTo(w * 0.95, w * 0.25, w * 0.95, w * 0.95, w * 0.5, w * 1.0);
    bt.closePath();
    pinta(bt, 0.55, 0.2);
    k.save();
    k.clip(bt);
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 0.8;
    for (let u = 0.1; u < 1; u += 0.18) { k.beginPath(); k.moveTo(u * w * 0.9, w * 0.2); k.quadraticCurveTo(u * w * 1.05, w * 0.6, u * w * 0.9, w * 1.0); k.stroke(); }
    k.restore();
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 1.3;
    k.stroke(bt);
    if (!flor) { k.restore(); return; }
    // o cálice: sai do braço logo acima do botão e abre em três pétalas
    const f = new Path2D();
    f.moveTo(-w * 0.48, w * 0.12);
    f.bezierCurveTo(-w * 0.6, -w * 0.2, -w * 1.15, -w * 0.5, -w * 1.2, -w * 1.0);
    f.quadraticCurveTo(-w * 0.75, -w * 0.82, -w * 0.42, -w * 0.72);
    f.quadraticCurveTo(-w * 0.3, -w * 1.15, 0, -w * 1.4);
    f.quadraticCurveTo(w * 0.3, -w * 1.15, w * 0.42, -w * 0.72);
    f.quadraticCurveTo(w * 0.75, -w * 0.82, w * 1.2, -w * 1.0);
    f.bezierCurveTo(w * 1.15, -w * 0.5, w * 0.6, -w * 0.2, w * 0.48, w * 0.12);
    f.closePath();
    pinta(f, 0.6, 0.25);
    k.save();
    k.clip(f);
    // a sombra do lado de lá de cada pétala e as nervuras
    k.strokeStyle = TINTA_OURO;
    k.lineCap = 'round';
    for (const [sx, tx, ty] of [[-0.3, -1.05, -0.9], [0, 0, -1.25], [0.3, 1.05, -0.9]]) {
      k.lineWidth = 1;
      k.beginPath();
      k.moveTo(sx * w, -w * 0.05);
      k.quadraticCurveTo((sx + tx) * w * 0.5, -w * 0.45, tx * w * 0.9, ty * w * 0.92);
      k.stroke();
    }
    gravar(k, f, 0, -w * 0.5, w * 1.6, 1.2, 2.2, 1, (px) => (px / w) * 0.6 + 0.05, TINTA_OURO, 0);
    k.restore();
    k.strokeStyle = TINTA_OURO;
    k.lineWidth = 1.3;
    k.stroke(f);
    k.restore();
  }

  // ---------- (4) O candelabro de ouro (Êx 25.31-37) ----------
  // De noite, no Lugar Santo: o candelabro de ouro batido, de frente, uma peça só: o pedestal
  // torneado (disco, degrau e domo), a haste com as suas quatro taças, e os seis braços em arco (três de cada lado), cada
  // um com três taças em flor de amêndoa, botão e flor; um botão debaixo de cada par de braços
  // (25.35). No alto, as sete lâmpadas acesas, com o bico virado para a frente (25.37). Atrás,
  // as tábuas de acácia revestidas de ouro, com as travessas, na penumbra.
  function desenhoCandelabro(k, W, H, obj) {
    const r = sorteio(7401);
    const cx = W / 2;
    const topo = 222;
    const chao = 760;
    const lamp = [-3, -2, -1, 0, 1, 2, 3].map((i) => [cx + i * 92, topo]);
    const luzEm = ([x, y]) => {
      let l = 0;
      for (const [lx, ly] of lamp) l += Math.exp(-(((x - lx) / 260) ** 2 + ((y - ly + 30) / 300) ** 2));
      return Math.min(1, l * 0.32);
    };
    // as tábuas da parede, em pé, de ouro na penumbra (Êx 26.29)
    k.fillStyle = '#120d06';
    k.fillRect(0, 0, W, H);
    const larT = 118;
    for (let i = -1; i < 9; i++) {
      const x0 = i * larT + 22;
      for (let x = x0 + 3; x < x0 + larT - 2; x += 3.4) {
        for (let y = -10; y < chao + 20; y += 12) {
          const l = luzEm([x, y]) * (0.75 + 0.25 * Math.sin((x - x0) / larT * Math.PI));
          k.strokeStyle = 'rgba(214,160,64,' + (0.05 + l * 0.6).toFixed(3) + ')';
          k.lineWidth = 0.4 + l * 1.6;
          k.beginPath();
          k.moveTo(x + Math.sin(y * 0.02 + i) * 0.6, y);
          k.lineTo(x + Math.sin((y + 12) * 0.02 + i) * 0.6, y + 12);
          k.stroke();
        }
      }
      // a junta entre as tábuas
      k.strokeStyle = 'rgba(0,0,0,.85)';
      k.lineWidth = 3;
      k.beginPath();
      k.moveTo(x0, -10);
      k.lineTo(x0, chao + 10);
      k.stroke();
      k.strokeStyle = 'rgba(232,190,110,' + (0.08 + luzEm([x0, 300]) * 0.4).toFixed(3) + ')';
      k.lineWidth = 1;
      k.beginPath();
      k.moveTo(x0 + 2.5, -10);
      k.lineTo(x0 + 2.5, chao + 10);
      k.stroke();
    }
    // as travessas de ouro, por fora das tábuas, com as argolas
    for (const yb of [96, 590]) {
      const c = curvaPor([[-20, yb], [W + 20, yb]], 3);
      k.save();
      k.globalAlpha = 0.85;
      tuboDeOuro(k, c, () => 16, { luz: -1, claro: -0.25 });
      k.restore();
    }
    // a escuridão por cima das tábuas, longe das lâmpadas
    const esc = k.createRadialGradient(cx, topo + 120, 120, cx, topo + 200, 720);
    esc.addColorStop(0, 'rgba(10,7,3,0)');
    esc.addColorStop(1, 'rgba(10,7,3,.72)');
    k.fillStyle = esc;
    k.fillRect(0, 0, W, H);
    // o chão de terra batida
    const gch = k.createLinearGradient(0, chao, 0, H);
    gch.addColorStop(0, '#2a1d0c');
    gch.addColorStop(1, '#120c05');
    k.fillStyle = gch;
    k.fillRect(0, chao, W, H - chao);
    k.save();
    k.lineCap = 'round';
    for (let y = chao + 4; y < H; y += 3 + (y - chao) * 0.05) {
      let x = -r() * 40;
      while (x < W) {
        const c = 20 + r() * 80;
        const l = luzEm([x + c / 2, chao - 80]) * (1 - (y - chao) / 140);
        k.strokeStyle = 'rgba(214,160,80,' + Math.max(0.03, l * 0.5).toFixed(3) + ')';
        k.lineWidth = 0.8 + (y - chao) / 80;
        k.beginPath();
        k.moveTo(x, y);
        k.lineTo(x + c, y + (r() - 0.5) * 1.5);
        k.stroke();
        x += c + 6 + r() * 16;
      }
    }
    k.restore();
    k.strokeStyle = 'rgba(232,190,110,.25)';
    k.lineWidth = 1.5;
    k.beginPath();
    k.moveTo(0, chao);
    k.lineTo(W, chao);
    k.stroke();
    // o clarão das lâmpadas na parede (antes do candelabro, que fica na frente dele)
    brilho(k, cx, topo - 10, 470, 'rgba(255,190,90,.2)', 'screen');
    // a sombra do candelabro no chão e na parede
    k.save();
    k.filter = 'blur(10px)';
    k.fillStyle = 'rgba(0,0,0,.6)';
    k.beginPath();
    k.ellipse(cx, chao + 6, 150, 16, 0, 0, 6.283);
    k.fill();
    k.restore();

    // o candelabro
    const hW = 15;
    // os braços: três de cada lado, em arco, do ponto na haste até o alto
    const sai = [470, 392, 314];
    const raio = [276, 184, 92];
    const bracos = [];
    for (let i = 0; i < 3; i++) {
      for (const lado of [-1, 1]) {
        const R = raio[i];
        const h = sai[i] - topo;
        const pts = [];
        for (let a = 0; a <= 1.0001; a += 0.05) {
          const t = a * Math.PI / 2;
          pts.push([cx + lado * R * Math.sin(t), topo + h * Math.cos(t)]);
        }
        bracos.push({ c: curvaPor(pts, 2.5), lado, i, R, h });
      }
    }
    // o pé (25.31 "o pedestal"): torneado de ouro, visto um pouco de cima: o disco largo do
    // chão, o degrau, o domo que sobe e o colar onde a haste começa
    torneadoDeOuro(k, cx, [[640, 18], [652, 18], [656, 26], [668, 30], [690, 48], [712, 76], [728, 96], [734, 98], [736, 112], [748, 114], [750, 124], [764, 126]], 0.22, obj);
    // a haste
    const haste = curvaPor([[cx, 642], [cx, topo]], 2.5);
    tuboDeOuro(k, haste, () => hW * 2, { luz: -1, obj });
    // os braços (os de trás primeiro não há: todos no mesmo plano, de frente)
    // (sem as tampas nas pontas: os braços de um lado e do outro se encontram na haste sem
    // a costura do meio; a ponta de cima fica debaixo da lâmpada)
    for (const b of bracos) tuboDeOuro(k, b.c, () => hW * 1.7, { luz: -1, obj, semPontas: true });
    // um botão debaixo de cada par de braços, na haste (25.35)
    for (const y of sai) tacaDeAmendoa(k, cx, y + 4, 0, hW * 1.7, obj, false);
    // as quatro taças da haste (25.34): no alto e entre os pares
    for (const y of [600, 444, 366, 290]) tacaDeAmendoa(k, cx, y, 0, hW * 1.5, obj);
    // as três taças de cada braço, ao longo do arco, na direção dele
    for (const b of bracos) {
      const L = b.c[b.c.length - 1].s;
      for (const f of b.i === 2 ? [0.3, 0.55, 0.78] : [0.28, 0.56, 0.83]) {
        const q = b.c[Math.round((f * L) / 2.5)];
        tacaDeAmendoa(k, q.x, q.y, Math.atan2(q.ty, q.tx) + Math.PI / 2, hW * 1.3, obj);
      }
    }
    // as sete lâmpadas de ouro, com o bico virado para a frente e a chama acesa
    for (const [lx, ly] of lamp) {
      const lp = new Path2D();
      lp.moveTo(lx - 30, ly - 6);
      lp.bezierCurveTo(lx - 28, ly + 14, lx + 26, ly + 14, lx + 30, ly - 6);
      lp.quadraticCurveTo(lx + 16, ly - 14, lx, ly - 13);
      lp.quadraticCurveTo(lx - 16, ly - 14, lx - 30, ly - 6);
      lp.closePath();
      const gl = k.createLinearGradient(lx - 30, 0, lx + 30, 0);
      gl.addColorStop(0, tomDeOuro(0.95));
      gl.addColorStop(0.5, tomDeOuro(0.7));
      gl.addColorStop(1, tomDeOuro(0.3));
      k.fillStyle = gl;
      k.fill(lp);
      marcar(k, obj, lp);
      gravar(k, lp, lx, ly, 34, 0.1, 2.4, 1, (x) => 0.2 + (x - lx + 30) / 60 * 0.6, TINTA_OURO, 0);
      k.strokeStyle = TINTA_OURO;
      k.lineWidth = 1.6;
      k.stroke(lp);
      // a boca do óleo, escura, e o bico para a frente (para baixo, na vista de frente)
      k.fillStyle = '#2a1c05';
      k.beginPath();
      k.ellipse(lx - 6, ly - 8, 9, 3, 0, 0, 6.283);
      k.fill();
      k.fillStyle = tomDeOuro(0.7);
      k.beginPath();
      k.ellipse(lx + 12, ly - 4, 7, 5, 0, 0, 6.283);
      k.fill();
      k.stroke();
      // a chama: língua em traços que afinam, sem contorno cheio
      brilho(k, lx + 12, ly - 32, 60, 'rgba(255,214,140,.45)', 'screen');
      const ch = chama(lx + 12, ly - 7, 13, 40 + (lx % 7), (lx % 5) - 2);
      k.fillStyle = 'rgba(255,214,120,.95)';
      k.fill(ch);
      k.save();
      k.clip(ch);
      k.strokeStyle = 'rgba(200,96,24,.85)';
      k.lineWidth = 1.1;
      for (let j = -2; j <= 2; j++) {
        k.beginPath();
        k.moveTo(lx + 12 + j * 3, ly - 6);
        k.quadraticCurveTo(lx + 12 + j * 2.4, ly - 24, lx + 12 + (lx % 5) - 2, ly - 46);
        k.stroke();
      }
      k.restore();
      k.fillStyle = 'rgba(255,250,232,.95)';
      k.beginPath();
      k.ellipse(lx + 12, ly - 14, 3, 7, 0, 0, 6.283);
      k.fill();
    }
    vinheta(k, W, H, 0.4);
  }
  // ---------- (5) As tábuas da aliança (Êx 31.18) ----------
  // No alto do Sinai, debaixo da nuvem pesada (Êx 24.16): as duas tábuas de pedra, juntas e de
  // pé num afloramento de granito partido em facetas, de pedra cinza, alto reto e cantos
  // partidos em lascas, a grossura maciça à vista; a de trás, menor, fica por trás da outra.
  // A escrita de Deus não se imita: a hachura da pedra se desfaz em luz no meio da face, sem
  // letra nem fileira, e a luz passa para o céu. A nuvem desce em massas de linha cerrada.
  function desenhoTabuas(k, W, H, obj) {
    const r = sorteio(7501);
    papelVelho(k, W, H, r, ['#efe0c4', '#dcc6a0', '#b89a72'], [444, 520]);
    // a nuvem pesada: massas que só existem pelo peso da linha (sem contorno), mais escuras no
    // alto, com a barriga mais clara onde a luz das tábuas bate
    const massa = (x, y) => {
      let v = 0;
      for (const [cx, cy, rx, ry] of [[120, 120, 260, 120], [420, 80, 300, 110], [760, 140, 240, 120], [260, 260, 220, 80], [640, 290, 260, 90], [40, 330, 160, 70], [880, 360, 160, 70]]) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        v = Math.max(v, 1 - d);
      }
      return v;
    };
    const ruido = (x, y) => { const q = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return q - Math.floor(q) - 0.5; };
    linhas(k, 0, 0, W, 560, 3.8, 2.6, (x, y) => {
      const m = Math.max(0, massa(x, y));
      const barriga = Math.max(0, massa(x, y - 26) - m) * 2.2;
      const luz = Math.exp(-(((x - 444) / 300) ** 2) - (((y - 470) / 160) ** 2));
      // a luz das tábuas passa do alto delas para o céu: as linhas afinam por cima delas
      const sobra = Math.exp(-(((x - 400) / 230) ** 2) - (((y - 300) / 110) ** 2));
      return 0.22 + m * 0.75 + (1 - y / 560) * 0.25 - barriga * 0.6 - luz * 0.55 - sobra * 0.5 + ruido(x, y) * 0.12;
    });
    // o cume: um afloramento de granito partido em facetas (o tampo aceso onde as tábuas
    // estão, as faces da frente e dos ombros em planos de ângulos diferentes), separadas por
    // fraturas tortas; a crista é uma linha quebrada em lascas oblíquas, sem degrau reto
    const baseC = (x) => 654 + Math.sin(x * 0.009 + 0.6) * 5 + Math.max(0, Math.abs(x - 450) - 250) * 0.5;
    const crista = [];
    const fC = onda(sorteio(7531), 4, 0.02);
    for (let x = -14; x <= W + 40;) {
      crista.push([x, baseC(x) + fC(x) * 4 + (r() - 0.5) * 5]);
      const dx = 30 + r() * 24;
      // uma lasca: um entalhe em V raso, de lados oblíquos (nunca um degrau em pé)
      if (r() < 0.45 && x > 0 && x < W) crista.push([x + dx * (0.4 + r() * 0.2), baseC(x + dx / 2) + fC(x + dx / 2) * 4 + 4 + r() * 5]);
      x += dx;
    }
    const naCrista = (x) => {
      for (let i = 1; i < crista.length; i++) {
        if (crista[i][0] >= x) { const [ax, ay] = crista[i - 1]; const [bx, by] = crista[i]; return ay + (by - ay) * ((x - ax) / (bx - ax)); }
      }
      return crista[crista.length - 1][1];
    };
    const cume = pol([...crista, [W + 40, H + 10], [-14, H + 10]]);
    k.fillStyle = '#b09878';
    k.fill(cume);
    // o tampo: de xa a xb, a beirada da frente desce até uns 34 px abaixo da crista, em lascas
    const xa = 150;
    const xb = 748;
    const beira = [];
    for (let x = xa; x <= xb; x += 14 + r() * 16) {
      const t = (x - xa) / (xb - xa);
      beira.push([x, naCrista(x) + Math.pow(Math.sin(Math.PI * t), 0.55) * (40 + (r() - 0.5) * 10)]);
    }
    beira.push([xb, naCrista(xb)]);
    beira[0] = [xa, naCrista(xa)];
    const naBeira = (x) => {
      if (x <= xa || x >= xb) return naCrista(x);
      for (let i = 1; i < beira.length; i++) {
        if (beira[i][0] >= x) { const [ax, ay] = beira[i - 1]; const [bx, by] = beira[i]; return ay + (by - ay) * ((x - ax) / (bx - ax)); }
      }
      return naCrista(x);
    };
    // as facetas: blocos partidos em planos de ângulos diferentes (o ombro da esquerda pega a
    // luz, o da direita fica na sombra), pintados um por cima do outro; as beiradas são
    // fraturas quebradas em lascas oblíquas
    const rJ = sorteio(7521);
    const lasca = (a, b) => {
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 22));
      const nx = -(b[1] - a[1]);
      const ny = b[0] - a[0];
      const nl = Math.hypot(nx, ny) || 1;
      const out = [];
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const d = i ? (rJ() - 0.5) * 12 : 0;
        out.push([a[0] + (b[0] - a[0]) * t + (nx / nl) * d, a[1] + (b[1] - a[1]) * t + (ny / nl) * d]);
      }
      return out;
    };
    const bloco = (vs) => vs.flatMap((v, i) => lasca(v, vs[(i + 1) % vs.length]));
    // cada faceta: o tom e o ângulo dela; a hachura esmorece no alto (a beirada que pega a luz)
    // e adensa embaixo (a parte de baixo do bloco), com uma segunda hachura cruzada só na sombra
    const facetas = [
      { vs: [[-30, 700], [150, 640], [214, 706], [176, 786], [120, 870], [-30, 870]], cor: '#c8b494', ang: 0.5, base: -0.15, desce: 0.7, borda: [1, 2, 3] },
      { vs: [[748, 640], [930, 690], [930, 870], [690, 870], [770, 770]], cor: '#8e7a5e', ang: -0.55, base: 0.45, desce: 0.6, borda: [3, 4] },
      { vs: [[150, 640], [482, 660], [536, 776], [404, 816], [300, 870], [120, 870], [176, 786], [214, 706]], cor: '#b8a280', ang: -1.05, base: 0.0, desce: 0.85, borda: [1, 2, 3] },
      { vs: [[482, 660], [748, 650], [770, 770], [690, 870], [300, 870], [404, 816], [536, 776]], cor: '#a28b6a', ang: 1.25, base: 0.2, desce: 0.8, borda: [1, 2, 5, 6] },
      // o bloco caído: o tampo aceso, partido em lascas
      { vs: [[392, 806], [448, 784], [500, 780], [538, 768], [600, 786], [646, 806], [618, 818], [566, 812], [520, 824], [462, 820], [418, 828]], cor: '#d2bf9c', ang: 0.12, base: -0.2, desce: 0.5, borda: [0, 1, 2, 3, 4, 5] },
      // e a frente dele, escura
      { vs: [[418, 828], [462, 820], [520, 824], [566, 812], [618, 818], [646, 806], [612, 870], [330, 870], [366, 846]], cor: '#7e6a50', ang: 1.1, base: 0.55, desce: 0.5, borda: [0, 1, 2, 3, 4, 5, 6] },
    ];
    const bordas = [];
    for (const f of facetas) {
      const pts = bloco(f.vs);
      const fac = pol(pts);
      k.save();
      k.clip(cume);
      k.fillStyle = f.cor;
      k.fill(fac);
      const ys = f.vs.map((v) => v[1]);
      const y0 = Math.min(...ys);
      const y1 = Math.min(846, Math.max(...ys));
      const cxF = f.vs.reduce((s0, v) => s0 + v[0], 0) / f.vs.length;
      const sv = (x, y) => f.base + ((y - y0) / Math.max(30, y1 - y0)) * f.desce + Math.abs(x - 444) / 2000;
      gravar(k, fac, cxF, (y0 + y1) / 2, 460, f.ang, 3.6, 1.7, sv, SEPIA, 0.1);
      gravar(k, fac, cxF, (y0 + y1) / 2, 460, f.ang + 1.3, 4.4, 1.3, (x, y) => (sv(x, y) - 0.62) * 2.2, SEPIA, 0.1);
      k.restore();
      for (const e of f.borda) bordas.push(lasca(f.vs[e], f.vs[(e + 1) % f.vs.length]).concat([f.vs[(e + 1) % f.vs.length]]));
    }
    // as fraturas: a beirada clara do bloco de cima e a racha escura; e umas rachas curtas
    k.save();
    k.clip(cume);
    k.lineCap = 'round';
    k.lineJoin = 'round';
    for (const b of bordas) {
      // mais fino nas fraturas do fundo (mais longe do olho), mais grosso na frente
      const ym = b.reduce((s0, p) => s0 + p[1], 0) / b.length;
      const perto = Math.max(0, Math.min(1, (ym - 680) / 140));
      k.strokeStyle = 'rgba(250,236,204,.55)';
      k.lineWidth = 1.1 + perto * 0.4;
      k.stroke(pol(b.map(([x, y]) => [x - 2, y - 2]), false));
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.4 + perto * 1.1;
      k.stroke(pol(b, false));
    }
    k.strokeStyle = 'rgba(43,33,18,.75)';
    k.lineWidth = 1.2;
    for (const [x0, y0, n] of [[80, 760, 3], [262, 740, 4], [430, 720, 3], [600, 700, 4], [700, 790, 3], [830, 760, 3], [340, 790, 2]]) {
      let x = x0;
      let y = y0;
      k.beginPath();
      k.moveTo(x, y);
      for (let s = 0; s < n; s++) { x += (rJ() - 0.5) * 22; y += 10 + rJ() * 16; k.lineTo(x, y); }
      k.stroke();
    }
    k.restore();
    // o tampo aceso: opaco, com hachura rala quase na horizontal
    const tampo = pol([...crista.filter(([x]) => x >= xa && x <= xb), [xb, naCrista(xb)], ...beira.slice().reverse(), [xa, naCrista(xa)]]);
    k.fillStyle = '#e2cfa6';
    k.fill(tampo);
    gravar(k, tampo, 450, 670, 320, 0.06, 4.2, 1, (x, y) => 0.15 + (y - naCrista(x)) / 60 + Math.abs(x - 450) / 700, SEPIA, 0);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(pol(beira, false));
    k.lineWidth = 2.2;
    k.stroke(pol(crista, false));
    // as duas tábuas: lajes de pedra cinza, de alto reto e cantos partidos em lascas
    // desiguais, vistas um pouco da esquerda (a grossura aparece à esquerda e em cima). A da
    // frente está mais perto e mais baixa; a de trás, menor e mais alta, fica por trás dela,
    // com dois terços escondidos. A escrita de Deus é luz: a hachura da pedra afina e se
    // desfaz em traços soltos até o papel nu no meio da face (a luz é a falta de linha), mais
    // na da frente que na de trás, sem letra nem fileira.
    const tabua = (x0, base, w, h, giro, semente, cantos, esp, luzF) => {
      const rt = sorteio(semente);
      const loc = cantos(w, h);
      const cg = Math.cos(giro);
      const sg = Math.sin(giro);
      const face = loc.map(([x, y]) => [x0 + x * cg - y * sg, base + x * sg + y * cg]);
      const atras = face.map(([x, y]) => [x + esp[0], y + esp[1]]);
      const n = face.length;
      // a sombra de contato no pé e a projetada no tampo, para trás e à direita
      const pe0 = face[0];
      const pe1 = face[n - 1];
      sombraNoChao(k, pol([[pe0[0] + esp[0] - 4, pe0[1] + 3], [pe1[0] + 6, pe1[1] + 3], [pe1[0] + 46, pe1[1] - 18], [pe0[0] + 30, pe0[1] - 20]]), 0, 0, 7, 0.55);
      sombraNoChao(k, pol([[pe0[0] + 2, pe0[1] + 4], [pe1[0] - 2, pe1[1] + 4], [pe1[0] - 2, pe1[1] + 9], [pe0[0] + 2, pe0[1] + 9]]), 0, 0, 2.5, 0.7);
      // a grossura: opaca, pedaço a pedaço; o alto pega a luz, o lado é meio-tom
      const pedacos = [pol(atras), ...face.slice(1).map((p, i) => pol([face[i], p, atras[i + 1], atras[i]]))];
      k.lineWidth = 1.2;
      k.fillStyle = '#8a8574';
      k.strokeStyle = '#8a8574';
      k.fill(pedacos[0]);
      k.stroke(pedacos[0]);
      marcar(k, obj, pedacos[0]);
      const sobe = (i) => { const dx = face[i][0] - face[i - 1][0]; const dy = face[i][1] - face[i - 1][1]; return dx > Math.abs(dy) * 0.4; };
      for (let i = 1; i < n; i++) {
        k.fillStyle = sobe(i) ? '#b4af9f' : '#8a8574';
        k.strokeStyle = k.fillStyle;
        k.fill(pedacos[i]);
        k.stroke(pedacos[i]);
        marcar(k, obj, pedacos[i]);
      }
      for (let i = 1; i < n; i++) {
        const dx = face[i][0] - face[i - 1][0];
        const dy = face[i][1] - face[i - 1][1];
        const c = sobe(i);
        const m = Math.max(1, Math.round(Math.hypot(dx, dy) / (c ? 6 : 4)));
        k.strokeStyle = 'rgba(34,32,26,.6)';
        k.lineWidth = c ? 0.7 : 1;
        for (let j = 0; j < m; j++) {
          const t = j / m;
          const x = face[i - 1][0] + dx * t;
          const y = face[i - 1][1] + dy * t;
          k.beginPath();
          k.moveTo(x + esp[0] * 0.15, y + esp[1] * 0.15);
          k.lineTo(x + esp[0], y + esp[1]);
          k.stroke();
        }
        const f = 0.45 + rt() * 0.15;
        k.strokeStyle = c ? 'rgba(236,232,220,.55)' : 'rgba(30,28,22,.45)';
        k.lineWidth = 1;
        k.beginPath();
        k.moveTo(face[i - 1][0] + esp[0] * f, face[i - 1][1] + esp[1] * f);
        k.lineTo(face[i][0] + esp[0] * f, face[i][1] + esp[1] * f);
        k.stroke();
      }
      k.strokeStyle = '#1c1a14';
      k.lineWidth = 2;
      k.stroke(pol(atras.slice(0, -1), false));
      k.lineWidth = 1.2;
      for (let i = 0; i < n; i++) {
        k.beginPath();
        k.moveTo(face[i][0], face[i][1]);
        k.lineTo(atras[i][0], atras[i][1]);
        k.stroke();
      }
      // a face: o papel claro da pedra; o cinza vem da hachura
      const fF = pol(face);
      marcar(k, obj, fF);
      const [lu, lv, lr, lmin] = luzF;
      const lx = x0 + w * lu;
      const ly = base - h * lv;
      const R = Math.max(w, h) * lr;
      const gf = k.createRadialGradient(lx, ly, 0, lx, ly, R * 1.6);
      gf.addColorStop(0, '#efe6cc');
      gf.addColorStop(0.5, '#d8d2c0');
      gf.addColorStop(1, '#bcb6a6');
      k.fillStyle = gf;
      k.fill(fF);
      k.save();
      k.clip(fF);
      // a força da hachura: zero no meio da luz (ou lmin, na de trás), cheia nas beiradas
      const forca = (x, y) => {
        const d = Math.hypot((x - lx) / R, (y - ly) / (R * 1.25));
        return lmin + (1 - lmin) * Math.max(0, Math.min(1, (d - 0.25) / 0.9));
      };
      // duas hachuras de direções próprias de cada tábua; perto da luz os traços se partem
      k.lineCap = 'round';
      for (const [ang, passo, peso] of [[luzF[4], 3.2, 1.25 * luzF[5]], [luzF[4] + 1.1, 4.6, 0.9 * luzF[5]]]) {
        const dx = Math.cos(ang);
        const dy = Math.sin(ang);
        const raio = Math.hypot(w, h) * 0.75;
        const cx0 = x0 + w / 2;
        const cy0 = base - h / 2;
        k.strokeStyle = '#2c2a22';
        for (let d = -raio; d <= raio; d += passo) {
          let ant = null;
          let liga = true;
          for (let s = -raio; s <= raio; s += 3) {
            const x = cx0 + s * dx - d * dy;
            const y = cy0 + s * dy + d * dx;
            let f = forca(x, y);
            if (peso < 1) f = Math.max(0, f * 1.4 - 0.5);
            // perto da luz o traço se parte em pedaços de tamanhos desiguais
            if (f < 0.6 && rt() < 0.07 + (0.6 - f) * 0.22) liga = !liga;
            if (f >= 0.6) liga = true;
            const lw = peso * f;
            if (ant && lw > 0.12 && liga) {
              k.lineWidth = lw;
              k.beginPath();
              k.moveTo(ant[0], ant[1]);
              k.lineTo(x, y);
              k.stroke();
            }
            ant = [x, y];
          }
        }
      }
      // o grão do granito: pontilhado miúdo, que também some na luz
      for (let m = 0; m < w * h * 0.03; m++) {
        const qx = x0 - 20 + rt() * (w + 40);
        const qy = base - h - 20 + rt() * (h + 40);
        if (rt() > forca(qx, qy) + 0.15) continue;
        k.fillStyle = 'rgba(40,36,28,' + (0.2 + rt() * 0.25).toFixed(2) + ')';
        k.fillRect(qx, qy, 1, 1);
      }
      // um veio comprido, claro e apagado
      const pts = [];
      const vb0 = 0.2 + rt() * 0.2;
      for (let t = 0; t <= 1.0001; t += 0.05) pts.push([x0 + w * (-0.1 + 1.2 * t) + Math.sin(t * 9 + semente) * 6, base - h + h * (vb0 + 0.35 * t) + Math.sin(t * 5.3 + semente) * 10]);
      k.strokeStyle = 'rgba(244,240,228,.5)';
      k.lineWidth = 1.3;
      k.stroke(pol(pts, false));
      k.restore();
      // as quinas: escuras em volta, a luz nas beiradas do alto
      k.strokeStyle = '#1c1a14';
      k.lineWidth = 2.4;
      k.lineJoin = 'miter';
      k.stroke(fF);
      return face;
    };
    const baseT = 670;
    // o resplendor atrás das tábuas, macio (gradiente, sem beirada)
    k.save();
    const hal = k.createRadialGradient(440, 440, 40, 440, 440, 320);
    hal.addColorStop(0, 'rgba(255,224,150,.35)');
    hal.addColorStop(1, 'rgba(255,224,150,0)');
    k.globalCompositeOperation = 'screen';
    k.fillStyle = hal;
    k.fillRect(0, 0, W, 640);
    k.restore();
    // a de trás primeiro: 9 % menor, mais alta (mais longe, no fundo do tampo) e à direita,
    // com uns dois terços escondidos pela da frente; um nada tombada para ela
    tabua(392, baseT - 18, 188, 306, -0.035, 7511, (w, h) => [
      [0, 0], [0, -h + 7], [7, -h], [w * 0.46, -h - 1], [w - 40, -h + 2], [w - 18, -h + 14], [w, -h + 42], [w, 0],
    ], [-20, -11], [0.7, 0.6, 0.3, 0.3, -0.95, 0.95]);
    // a da frente: maior, mais baixa, com uma lasca grande e irregular no lado esquerdo
    tabua(250, baseT + 14, 206, 336, 0.0, 7512, (w, h) => [
      [0, 0], [0, -h * 0.4], [3, -h * 0.45], [6, -h * 0.485], [11, -h * 0.515], [9, -h * 0.54], [4, -h * 0.552], [0, -h * 0.558], [0, -h + 30], [26, -h], [w * 0.54, -h - 2], [w * 0.61, -h], [w * 0.65, -h + 8],
      [w * 0.7, -h + 1], [w - 4, -h + 1], [w, -h + 7], [w, 0],
    ], [-24, -13], [0.44, 0.56, 0.42, 0, 1.15, 1]);
    // o brilho das tábuas no ar (fraco: nunca mais claro que o céu)
    brilho(k, 444, baseT - 170, 360, 'rgba(255,214,140,.14)', 'screen');
    vinheta(k, W, H, 0.24);
  }
  // O tom do bronze, do escuro (0) ao brilho (1).
  const BRONZE_TONS = [[0, [34, 16, 6]], [0.3, [104, 50, 20]], [0.6, [176, 98, 46]], [0.85, [232, 170, 104]], [1, [255, 232, 196]]];
  function tomDeBronze(v, a = 1) {
    const t = Math.max(0, Math.min(1, v));
    let i = 0;
    while (i < BRONZE_TONS.length - 2 && t > BRONZE_TONS[i + 1][0]) i++;
    const [p0, c0] = BRONZE_TONS[i];
    const [p1, c1] = BRONZE_TONS[i + 1];
    const u = (t - p0) / (p1 - p0);
    return 'rgba(' + c0.map((c, j) => Math.round(c + (c1[j] - c) * u)).join(',') + ',' + a + ')';
  }
  const TINTA_BRONZE = '#2a1206';

  // ---------- (6) A serpente de bronze (Nm 21.8-9) ----------
  // No deserto, no fim da tarde: o poste de madeira com a travessa no alto (a haste de
  // estandarte), firmado num monte de lajes chatas, e a serpente de bronze fundido enrolada
  // nele, rente, em duas voltas: um corpo só, que afina para o rabo, sobe na frente do poste e
  // deita o pescoço por cima da travessa, com a cabeça em cunha de perfil, no fim do corpo, com
  // o olho pequeno e escuro e a boca fechada. O bronze é gravado: a sombra em linhas ao
  // comprido do corpo (o lado aceso troca sem salto), as escamas em losango e o fio de luz.
  // Atrás, as serras de Edom (21.4).
  function desenhoSerpente(k, W, H, obj) {
    const r = sorteio(7601);
    papelVelho(k, W, H, r, ['#fbeccf', '#f1d2a2', '#d8ac76'], [700, 520]);
    const hz = 640;
    ceuEmLinhas(k, W, hz, [[200, 220, 260, 30], [640, 140, 220, 24], [300, 470, 300, 20], [760, 400, 160, 16]], { topo: 0.66, base: 0.12, maxL: 1.6 });
    for (const [base, amp, cor, sv, sem] of [[600, 60, '#e2c09a', 0.3, 1], [636, 34, '#d2ac80', 0.5, 2]]) {
      const f = onda(sorteio(7610 + sem), 5, 0.009);
      const m = pol([[-10, 700], ...Array.from({ length: 60 }, (_, i) => [i * 16 - 6, base - Math.abs(f(i * 16)) * amp]), [W + 10, 700]]);
      peca(k, m, [-10, base - amp, W + 10, 700], { cor, ang: 1.1, passo: 4, maxL: 1.1, sombra: (x, y) => sv + (y - base + amp) / 300, cruzada: 0.9, traco: 1.4 });
    }
    const chao = new Path2D();
    chao.moveTo(-10, hz + 6);
    for (let x = -10; x <= W + 10; x += 10) chao.lineTo(x, hz + 2 + Math.sin(x * 0.015) * 4);
    chao.lineTo(W + 10, H + 10);
    chao.lineTo(-10, H + 10);
    chao.closePath();
    k.fillStyle = '#dcbf92';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, hz, H, 1.8, (x, y) => 0.4 + (y - hz) / 400);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.5;
    k.stroke(chao);
    // uma laje chata de pedra (o monte do poste): um polígono baixo e anguloso, com o tampo
    // claro e a beirada da frente na sombra, em hachura deitada
    const laje = (x, y, w, h, o) => {
      const t = [[x - w, y], [x - w * 0.7, y - h * 0.55], [x - w * 0.1, y - h * 0.7], [x + w * 0.6, y - h * 0.5], [x + w, y - h * 0.1]].map(([a, b]) => [a + (r() - 0.5) * w * 0.12, b + (r() - 0.5) * h * 0.2]);
      const tampo = pol(t);
      const frente = pol([t[0], t[4], [t[4][0] - 2, t[4][1] + h * 0.45], [t[0][0] + 3, t[0][1] + h * 0.5]]);
      sombraNoChao(k, frente, -w * 0.3, h * 0.25, 3, 0.3);
      peca(k, frente, [x - w, y - h, x + w, y + h], { cor: '#b59a72', ang: 0.04, passo: 2.6, maxL: 1.6, sombra: () => 0.65, cruzada: 0.8, traco: 1.6, obj: o });
      peca(k, tampo, [x - w, y - h, x + w, y + h], { cor: '#dcc6a0', ang: 0.1, passo: 3, maxL: 1.2, sombra: (px) => 0.15 + (px - x + w) / (2 * w) * 0.35, cruzada: 0.9, traco: 1.6, obj: o });
    };
    for (const [x, y, w, h] of [[90, 700, 40, 12], [760, 690, 48, 14], [650, 780, 30, 10], [150, 812, 56, 16]]) laje(x, y, w, h);
    // o poste, com a travessa no alto (a haste de estandarte), de madeira, um pouco torto
    const px = 430;
    const pTopo = 214;
    const pBase = 740;
    const yBar = 252;
    const poste = pol([[px - 19, pBase], [px - 16, 420], [px - 14, pTopo + 4], [px - 6, pTopo - 3], [px + 8, pTopo - 2], [px + 15, pTopo + 6], [px + 16, 420], [px + 20, pBase]]);
    const barra = pol([[px - 132, yBar - 9], [px - 120, yBar - 13], [px + 128, yBar - 12], [px + 136, yBar - 7], [px + 134, yBar + 9], [px - 128, yBar + 11]]);
    sombraNoChao(k, pol([[px - 14, pBase], [px + 14, pBase], [px - 220, pBase + 70], [px - 250, pBase + 66]]), 0, 0, 6, 0.3);
    const pintaPoste = (o) => {
      peca(k, poste, [px - 16, pTopo, px + 16, pBase], { cor: '#9a7a50', ang: 1.56, passo: 2.6, maxL: 1.5, sombra: (x) => 0.2 + (px + 16 - x) / 32 * 0.55, cruzada: 0.75, traco: 2.2, obj: o });
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.3;
      for (const [y, dx] of [[470, -1], [620, 0]]) { k.beginPath(); k.ellipse(px + dx, y, 4, 8, 0, 0, 6.283); k.stroke(); }
      peca(k, barra, [px - 132, yBar - 13, px + 136, yBar + 11], { cor: '#a08056', ang: 0.02, passo: 2.6, maxL: 1.5, sombra: (x, y) => 0.15 + (y - yBar + 12) / 24 * 0.6, cruzada: 0.75, traco: 2.2, obj: o });
      // a amarra de couro onde a travessa cruza o poste
      k.strokeStyle = '#3a2410';
      k.lineWidth = 2.4;
      for (const dy of [-6, 0, 6]) { k.beginPath(); k.moveTo(px - 18, yBar + dy - 4); k.lineTo(px + 18, yBar + dy + 4); k.stroke(); }
    };
    pintaPoste(obj);
    // o monte de lajes empilhadas no pé do poste
    for (const [x, y, w, h] of [[px - 64, pBase + 16, 50, 26], [px + 60, pBase + 18, 54, 26], [px - 4, pBase + 30, 50, 24], [px - 36, pBase - 6, 38, 22], [px + 36, pBase - 4, 38, 22], [px + 2, pBase - 26, 32, 18]]) laje(x, y, w, h, obj);

    // a serpente: um corpo só, ao longo de uma curva lisa: do rabo (embaixo, atrás) às duas
    // voltas em volta do poste, e o pescoço que sobe acima da ponta
    const R = 38;
    const yRabo = 600;
    const yCima = 300;
    const voltas = 2;
    // a hélice bem amostrada (cada ponto com a sua profundidade: seno > 0 é a frente), que acaba
    // na frente do poste; dali o corpo sobe rente a ele, passa por cima da travessa e a cabeça
    // pende do outro lado, olhando para baixo, para quem olha para ela (21.8)
    const fase0 = Math.PI / 2 - voltas * Math.PI * 2;
    const densa = [];
    for (let i = 0; i <= 600; i++) {
      const t = i / 600;
      const a = fase0 + t * voltas * Math.PI * 2;
      densa.push([px + Math.cos(a) * R * (0.85 + 0.15 * t), yRabo - t * (yRabo - yCima) + Math.sin(a) * 6, Math.sin(a)]);
    }
    const fimH = densa[600];
    const subida = curvaPor([[fimH[0], fimH[1]], [px + 4, yBar + 6], [px + 30, yBar - 24], [px + 78, yBar - 30], [px + 120, yBar - 26], [px + 150, yBar - 14]], 1);
    for (const q of subida.slice(1)) densa.push([q.x, q.y, 1]);
    const corpoC = curvaPor(densa.filter((q, i) => i % 3 === 0 || i === densa.length - 1).map((q) => [q[0], q[1]]), 2);
    const L = corpoC[corpoC.length - 1].s;
    let ji = 0;
    const zs = corpoC.map((q) => {
      let melhor = ji;
      let dm = 1e9;
      for (let j = ji; j < Math.min(densa.length, ji + 40); j++) { const d = Math.hypot(densa[j][0] - q.x, densa[j][1] - q.y); if (d < dm) { dm = d; melhor = j; } }
      ji = melhor;
      return densa[melhor][2];
    });
    // a largura: o rabo fino, o corpo cheio, o pescoço mais fino e a cabeça em cunha (larga nas
    // mandíbulas, afinando para o focinho, que fecha redondo)
    const perfilCab = [[0, 12], [6, 22], [16, 30], [42, 38], [58, 31], [76, 23], [96, 21]];
    const larg = (s) => {
      const dd = L - s;
      if (dd < 96) {
        let i = 1;
        while (i < perfilCab.length - 1 && perfilCab[i][0] < dd) i++;
        const [d0, w0] = perfilCab[i - 1];
        const [d1, w1] = perfilCab[i];
        return w0 + (w1 - w0) * Math.max(0, Math.min(1, (dd - d0) / (d1 - d0)));
      }
      const corpo = 32 * Math.min(1, s / 240) ** 0.7;
      const pesc = dd < 240 ? 21 + (corpo - 21) * ((dd - 96) / 144) : corpo;
      return Math.max(5, pesc);
    };
    const tons = (v) => {
      // bronze fosco: do escuro esverdeado ao claro dourado
      const t = Math.max(0, Math.min(1, v));
      const c0 = [34, 30, 16];
      const c1 = [96, 78, 40];
      const c2 = [206, 172, 104];
      const c = t < 0.5 ? c0.map((x, i) => x + (c1[i] - x) * t * 2) : c1.map((x, i) => x + (c2[i] - x) * (t - 0.5) * 2);
      return 'rgb(' + c.map(Math.round).join(',') + ')';
    };
    // um pedaço do corpo entre as amostras i e i+1: o tom pela largura (luz à direita e em
    // cima), as linhas de sombra ao comprido, as escamas em losango e o contorno dos lados
    const ponto = (q, v) => { const w = larg(q.s) / 2; return [q.x - q.ty * v * w, q.y + q.tx * v * w]; };
    // o lado aceso é o que olha para cima e para a esquerda; a troca é contínua (sem virada brusca)
    const ladoLuz = (q) => Math.max(-1, Math.min(1, (0.6 * q.ty - 0.8 * q.tx) * 3));
    const pedaco = (i) => {
      const a = corpoC[i];
      const b = corpoC[i + 1];
      const sl = ladoLuz(a);
      for (let v = -1; v < 1; v += 0.25) {
        const vm = v + 0.125;
        const luz = 0.5 + vm * sl * 0.42 - Math.abs(vm) ** 2 * 0.45;
        k.fillStyle = tons(luz);
        const p = pol([ponto(a, v - 0.01), ponto(b, v - 0.01), ponto(b, v + 0.26), ponto(a, v + 0.26)]);
        k.fill(p);
      }
      // as linhas de sombra ao comprido, mais grossas do lado escuro (v < 0)
      k.lineCap = 'butt';
      for (const v of [-0.85, -0.65, -0.45, -0.25, -0.05, 0.25, 0.45, 0.65, 0.85]) {
        const w = (Math.max(0, -v * sl) * 2.2 + Math.max(0, Math.abs(v) - 0.6) * 1.6) * Math.min(1, larg(a.s) / 20);
        if (w < 0.25) continue;
        k.strokeStyle = 'rgba(30,22,8,.75)';
        k.lineWidth = w;
        const p0 = ponto(a, v);
        const p1 = ponto(b, v);
        k.beginPath();
        k.moveTo(p0[0], p0[1]);
        k.lineTo(p1[0], p1[1]);
        k.stroke();
      }
      // o fio de luz no lombo
      k.strokeStyle = 'rgba(255,240,196,.75)';
      k.lineWidth = 1.4;
      const l0 = ponto(a, 0.55 * sl);
      const l1 = ponto(b, 0.55 * sl);
      k.beginPath();
      k.moveTo(l0[0], l0[1]);
      k.lineTo(l1[0], l1[1]);
      k.stroke();
      // a beirada dos dois lados
      k.strokeStyle = '#1e160a';
      k.lineWidth = 2;
      k.lineCap = 'round';
      for (const v of [-1, 1]) {
        const p0 = ponto(a, v);
        const p1 = ponto(b, v);
        k.beginPath();
        k.moveTo(p0[0], p0[1]);
        k.lineTo(p1[0], p1[1]);
        k.stroke();
      }
    };
    // as escamas: duas famílias de riscos oblíquos que seguem o corpo (losangos), cinzeladas
    const escamas = (i0, i1) => {
      k.save();
      const faixa = new Path2D();
      for (let i = i0; i < Math.min(i1, corpoC.length - 1); i++) faixa.addPath(pol([ponto(corpoC[i], -0.97), ponto(corpoC[i + 1], -0.97), ponto(corpoC[i + 1], 0.97), ponto(corpoC[i], 0.97)]));
      k.clip(faixa);
      k.strokeStyle = 'rgba(36,26,10,.7)';
      k.lineWidth = 1;
      k.lineCap = 'round';
      for (let i = i0; i < i1; i += 3) {
        const q = corpoC[i];
        const w = larg(q.s) / 2;
        const passo = Math.max(3, w * 0.5);
        for (const sg of [1, -1]) {
          const p0 = ponto(q, -0.92);
          const p1 = [p0[0] + q.ty * w * 1.84 * 1 + q.tx * passo * sg * 1.6, p0[1] - q.tx * w * 1.84 + q.ty * passo * sg * 1.6];
          k.beginPath();
          k.moveTo(p0[0], p0[1]);
          k.lineTo(p1[0], p1[1]);
          k.stroke();
        }
      }
      k.restore();
    };
    const marcaCorpo = (lista) => { if (!obj) return; for (const q of lista) { const pp = new Path2D(); pp.arc(q.x, q.y, larg(q.s) / 2 + 2, 0, 6.283); marcar(k, obj, pp); } };
    // a sombra do corpo no ar (no poste e no céu atrás), leve
    const tras = [];
    const frente = [];
    for (let i = 0; i < corpoC.length - 1; i++) (zs[i] < 0 ? tras : frente).push(i);
    // as voltas de trás, depois o poste por cima delas, depois as da frente
    for (const i of tras) pedaco(i);
    escamasDe(tras);
    function escamasDe(lista) {
      // em trechos seguidos
      let ini = null;
      for (let n = 0; n <= lista.length; n++) {
        if (n < lista.length && (ini === null || lista[n] === lista[n - 1] + 1)) { if (ini === null) ini = lista[n]; continue; }
        if (ini !== null) escamas(ini, lista[n - 1] + 1);
        ini = n < lista.length ? lista[n] : null;
      }
    }
    // o poste passa na frente das voltas de trás: só ele, por cima
    k.save();
    const faixaTras = new Path2D();
    for (const i of tras) faixaTras.addPath(pol([ponto(corpoC[i], -1.15), ponto(corpoC[i + 1], -1.15), ponto(corpoC[i + 1], 1.15), ponto(corpoC[i], 1.15)]));
    k.clip(faixaTras);
    pintaPoste(null);
    k.restore();
    for (const i of frente) pedaco(i);
    escamasDe(frente);
    // as viradas (onde o corpo passa de trás para a frente do poste) ficam longe do poste: ali
    // os pedaços são pintados de novo em sequência, para a curva não ter corte
    for (let i = 1; i < corpoC.length - 1; i++) {
      if ((zs[i - 1] < 0) === (zs[i] < 0)) continue;
      const lista = [];
      for (let j = Math.max(0, i - 7); j < Math.min(corpoC.length - 1, i + 7); j++) lista.push(j);
      const atrasPrimeiro = zs[i - 1] < 0;
      for (const j of atrasPrimeiro ? lista : lista.slice().reverse()) pedaco(j);
      escamas(lista[0], lista[lista.length - 1] + 1);
    }
    marcaCorpo(corpoC);
    // a cabeça é o fim do corpo (a mesma gravura): o focinho fecha num arco; o lado de cima da
    // cabeça é o de fora da curva (à direita); o olho é um ponto escuro pequeno, sem brilho; a
    // boca é uma linha reta e curta ao longo da mandíbula, fechada; a narina, um ponto
    const fim = corpoC[corpoC.length - 1];
    const ultimo = corpoC[corpoC.length - 2];
    k.fillStyle = tons(0.45);
    k.beginPath();
    k.arc(fim.x, fim.y, larg(L) / 2, Math.atan2(fim.ty, fim.tx) - Math.PI / 2, Math.atan2(fim.ty, fim.tx) + Math.PI / 2);
    k.fill();
    k.strokeStyle = '#1e160a';
    k.lineWidth = 2;
    k.stroke();
    const qEm = (dd) => corpoC[Math.max(0, Math.min(corpoC.length - 1, Math.round((L - dd) / 2)))];
    const dorso = ponto(qEm(30), 1)[0] > ponto(qEm(30), -1)[0] ? 1 : -1;
    // o escudo da cabeça: umas placas maiores no alto, em traço
    k.strokeStyle = 'rgba(30,22,8,.7)';
    k.lineWidth = 1;
    for (const dd of [14, 24, 34, 46]) {
      const q = qEm(dd);
      const a = ponto(q, dorso * 0.95);
      const b = ponto(q, dorso * 0.2);
      k.beginPath();
      k.moveTo(a[0], a[1]);
      k.lineTo(b[0], b[1]);
      k.stroke();
    }
    // o olho
    const olho = ponto(qEm(30), dorso * 0.42);
    k.fillStyle = '#120c04';
    k.beginPath();
    k.ellipse(olho[0], olho[1], 3.6, 3, 0, 0, 6.283);
    k.fill();
    // a placa de cima do olho, sombreada (tom, não sobrancelha)
    k.strokeStyle = 'rgba(30,22,8,.55)';
    k.lineWidth = 3;
    const sob = [ponto(qEm(24), dorso * 0.62), ponto(qEm(36), dorso * 0.66)];
    k.beginPath();
    k.moveTo(sob[0][0], sob[0][1]);
    k.lineTo(sob[1][0], sob[1][1]);
    k.stroke();
    // a boca: do focinho até o canto da mandíbula, reta, no lado de baixo
    k.strokeStyle = '#1e160a';
    k.lineWidth = 1.6;
    k.beginPath();
    for (let dd = 1; dd <= 40; dd += 3) { const p = ponto(qEm(dd), -dorso * 0.38); if (dd === 1) k.moveTo(p[0], p[1]); else k.lineTo(p[0], p[1]); }
    k.stroke();
    // a narina
    const nar = ponto(qEm(5), dorso * 0.4);
    k.fillStyle = '#1e160a';
    k.beginPath();
    k.arc(nar[0], nar[1], 1.6, 0, 6.283);
    k.fill();
    void ultimo;
    vinheta(k, W, H, 0.22);
  }
  // ---------- (7) A harpa de Davi (1 Sm 16.23) ----------
  // Na casa de Saul, de tarde: a harpa de Davi (o kinnor, a lira de braços desiguais) de pé
  // sobre um tapete, apoiada na caixa, virada de três quartos, diante de um banco de cedro. O braço da
  // esquerda é mais alto, a travessa desce em diagonal, as dez cordas vão da travessa ao
  // cavalete da caixa e duas ainda vibram (as linhas dobradas): acabou de tocar. A luz entra
  // por uma janela alta e cai sobre ela. No banco, a palheta de osso. Diferente da lira da
  // Babilônia: outra forma, dentro de casa, de pé e de lado, não pendurada de frente.
  function desenhoHarpa(k, W, H, obj) {
    const r = sorteio(7701);
    // a parede de pedra rebocada, em linhas, mais escura longe da janela
    k.fillStyle = '#d9c6a2';
    k.fillRect(0, 0, W, H);
    const jan = [120, 90, 110, 170];
    const luzEm = (x, y) => {
      // o facho da janela desce para a direita
      const t = (y - jan[1]) / 600;
      const cx = jan[0] + jan[2] / 2 + t * 420;
      const larg = 110 + t * 260;
      return Math.max(0, 1 - Math.abs(x - cx) / larg) * (y > jan[1] ? 1 : 0);
    };
    const chao = 640;
    linhas(k, 0, 0, W, chao, 4.2, 2, (x, y) => 0.62 - luzEm(x, y) * 0.5 + Math.sin(x * 0.03 + y * 0.01) * 0.04);
    // as fiadas de pedra, sob o reboco gasto
    k.strokeStyle = 'rgba(43,33,18,.35)';
    k.lineWidth = 1.2;
    for (let y = 40; y < chao; y += 58) {
      k.beginPath();
      k.moveTo(0, y + (r() - 0.5) * 4);
      for (let x = 0; x <= W; x += 40) k.lineTo(x, y + (r() - 0.5) * 4);
      k.stroke();
      for (let x = ((y / 58) % 2) * 60 + r() * 30; x < W; x += 110 + r() * 40) { k.beginPath(); k.moveTo(x, y); k.lineTo(x + (r() - 0.5) * 4, y + 58); k.stroke(); }
    }
    // a janela alta: o vão em arco, fundo na parede grossa, o peitoril e o céu da tarde lá fora,
    // com o morro de longe
    const [jx, jy, jw, jh] = jan;
    const vao = new Path2D();
    vao.moveTo(jx, jy + jh);
    vao.lineTo(jx, jy + jw / 2);
    vao.arc(jx + jw / 2, jy + jw / 2, jw / 2, Math.PI, 0);
    vao.lineTo(jx + jw, jy + jh);
    vao.closePath();
    k.fillStyle = '#f8ecd0';
    k.fill(vao);
    k.save();
    k.clip(vao);
    linhas(k, jx, jy, jx + jw, jy + jh, 5, 1, (x, y) => 0.12 + (jy + jh - y) / jh * 0.3);
    const morro = pol([[jx - 5, jy + jh], [jx - 5, jy + jh - 34], [jx + 30, jy + jh - 52], [jx + 70, jy + jh - 40], [jx + jw + 5, jy + jh - 58], [jx + jw + 5, jy + jh]]);
    peca(k, morro, [jx, jy + jh - 60, jx + jw, jy + jh], { cor: '#e2c99e', ang: 0, passo: 3, maxL: 1.1, sombra: () => 0.4, cruzada: 0.9, traco: 1.2 });
    k.restore();
    // a parede grossa: o lado direito do vão, na sombra
    const lado = new Path2D();
    lado.moveTo(jx + jw, jy + jw / 2);
    lado.arc(jx + jw / 2, jy + jw / 2, jw / 2, 0, -0.9, true);
    lado.lineTo(jx + jw - 14, jy + jw / 2 - 8);
    lado.lineTo(jx + jw - 14, jy + jh);
    lado.lineTo(jx + jw, jy + jh);
    lado.closePath();
    peca(k, lado, [jx + jw - 20, jy, jx + jw, jy + jh], { cor: '#b9a27a', ang: 1.5, passo: 2.6, maxL: 1.5, sombra: () => 0.65, cruzada: 0.7, traco: 1.2 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.stroke(vao);
    peca(k, pol([[jx - 14, jy + jh], [jx + jw + 14, jy + jh], [jx + jw + 18, jy + jh + 16], [jx - 18, jy + jh + 16]]), [jx - 18, jy + jh, jx + jw + 18, jy + jh + 16], { cor: '#e2cfa8', ang: 0, passo: 3, maxL: 1.2, sombra: () => 0.35, cruzada: 0.9, traco: 1.6 });
    // o facho de luz no ar: só a parede mais clara (feito acima) e uns grãos de poeira
    for (let i = 0; i < 90; i++) {
      const y = jy + jh + r() * 420;
      const t = (y - jy) / 600;
      const x = jx + jw / 2 + t * 420 + (r() - 0.5) * (110 + t * 260);
      k.fillStyle = 'rgba(255,246,222,' + (0.3 + r() * 0.5).toFixed(2) + ')';
      k.beginPath();
      k.arc(x, y, 0.8 + r() * 1.2, 0, 6.283);
      k.fill();
    }
    // o chão de lajes, em perspectiva
    const piso = pol([[-10, chao], [W + 10, chao], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#c9b089';
    k.fill(piso);
    chaoEmLinhas(k, r, piso, -10, W + 10, chao, H, 1.8, (x, y) => 0.5 - luzEm(x, y) * 0.3 + (y - chao) / 900);
    k.strokeStyle = 'rgba(43,33,18,.6)';
    k.lineWidth = 1.4;
    for (const xb of [-300, -60, 180, 420, 660, 900, 1140]) { k.beginPath(); k.moveTo(444 + (xb - 444) * 0.62, chao); k.lineTo(xb, H + 10); k.stroke(); }
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(0, chao);
    k.lineTo(W, chao);
    k.stroke();
    // o banco de cedro, encostado na parede, à direita
    const bx0 = 470;
    const bx1 = 900;
    const tampoB = pol([[bx0, 520], [bx1, 520], [bx1, 548], [bx0, 548]]);
    const frenteB = pol([[bx0, 548], [bx1, 548], [bx1, 690], [bx0, 690]]);
    sombraNoChao(k, pol([[bx0 - 10, 690], [bx1, 690], [bx1, 720], [bx0 - 40, 716]]), 0, 0, 8, 0.35);
    peca(k, tampoB, [bx0, 520, bx1, 548], { cor: '#a8794a', ang: 0, passo: 3, maxL: 1.4, sombra: (x) => 0.3 - luzEm(x, 520) * 0.2, cruzada: 0.8, traco: 2, obj });
    peca(k, frenteB, [bx0, 548, bx1, 690], { cor: '#8e6238', ang: 0.02, passo: 3.2, maxL: 1.8, sombra: (x, y) => 0.55 - luzEm(x, y) * 0.25, cruzada: 0.7, traco: 2, obj });
    // os veios e as almofadas do painel do banco
    k.strokeStyle = 'rgba(40,22,8,.7)';
    k.lineWidth = 1.6;
    for (const xa of [bx0 + 20, bx0 + 160, bx0 + 300]) k.strokeRect(xa, 566, 120, 106);
    // o pano dobrado em cima do banco, com a palheta de osso
    const pano = pol([[640, 522], [660, 498], [790, 494], [812, 520]]);
    peca(k, pano, [640, 494, 812, 522], { cor: '#7e3a2a', ang: 0, passo: 2.6, maxL: 1.3, sombra: (x, y) => 0.35 + (y - 494) / 60, cruzada: 0.8, traco: 1.6, obj });
    k.strokeStyle = '#d9a443';
    k.lineWidth = 3;
    k.beginPath();
    k.moveTo(646, 516);
    k.lineTo(806, 514);
    k.stroke();
    const palheta = new Path2D();
    palheta.moveTo(700, 494);
    palheta.quadraticCurveTo(724, 484, 744, 488);
    palheta.quadraticCurveTo(730, 496, 704, 499);
    palheta.closePath();
    k.fillStyle = '#f2e6c8';
    k.fill(palheta);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.4;
    k.stroke(palheta);
    marcar(k, obj, palheta);
    // o tapete no chão, em perspectiva, com as faixas tecidas
    const tap = [[120, 700], [600, 690], [700, 820], [40, 836]];
    const tapete = pol(tap);
    sombraNoChao(k, tapete, 4, 6, 4, 0.25);
    k.fillStyle = '#b45a3a';
    k.fill(tapete);
    k.save();
    k.clip(tapete);
    const T = (u, v) => [tap[0][0] + (tap[1][0] - tap[0][0]) * u + (tap[3][0] - tap[0][0]) * v + (tap[2][0] - tap[1][0] - tap[3][0] + tap[0][0]) * u * v, tap[0][1] + (tap[1][1] - tap[0][1]) * u + (tap[3][1] - tap[0][1]) * v + (tap[2][1] - tap[1][1] - tap[3][1] + tap[0][1]) * u * v];
    for (const [v0, v1, cor] of [[0.08, 0.2, '#e3c78a'], [0.32, 0.44, '#3f4e6e'], [0.56, 0.68, '#e3c78a'], [0.8, 0.92, '#3f4e6e']]) {
      k.fillStyle = cor;
      k.fill(pol([T(0, v0), T(1, v0), T(1, v1), T(0, v1)]));
      // os losangos da faixa
      k.fillStyle = cor === '#e3c78a' ? '#7e3a2a' : '#e3c78a';
      for (let u = 0.03; u < 1; u += 0.07) {
        const vm = (v0 + v1) / 2;
        k.fill(pol([T(u, vm - 0.04), T(u + 0.025, vm), T(u, vm + 0.04), T(u - 0.025, vm)]));
      }
    }
    gravar(k, tapete, 370, 765, 380, 0.05, 3, 1.3, (x, y) => 0.3 - luzEm(x, y) * 0.3 + (y - 690) / 400, '#2a1408', 0);
    k.restore();
    k.strokeStyle = '#2a1408';
    k.lineWidth = 1.8;
    k.stroke(tapete);

    // a harpa (kinnor): desenhada em pé no seu próprio plano e posta no lugar com um giro
    // de três quartos (achatada no x) e uma leve inclinação para trás, contra o banco
    const ox = 420;
    const oy = 752;
    const giro = -0.07;
    const ach = 0.78;
    const P = (x, y) => [ox + (x * ach) * Math.cos(giro) - y * Math.sin(giro), oy + (x * ach) * Math.sin(giro) + y * Math.cos(giro)];
    const esp = [16, -5];
    const caminho = (pts, fechar = true) => pol(pts.map(([x, y]) => P(x, y)), fechar);
    const madeira = '#a26a36';
    const sombraLira = (x, y) => 0.32 - luzEm(x, y) * 0.3;
    // as formas, em coordenadas da harpa (y para cima é negativo; a base da caixa é y = 0)
    const caixa = [[-118, -4], [-128, -40], [-120, -78], [124, -82], [134, -42], [124, -4]];
    // os braços: curvos, abrindo para fora; o da esquerda bem mais alto (a travessa desce)
    const bracoE = curvaPor([[-104, -70], [-140, -160], [-182, -270], [-196, -370], [-184, -452]].map(([x, y]) => P(x, y)), 3);
    const bracoD = curvaPor([[104, -72], [138, -150], [158, -230], [156, -300], [140, -346]].map(([x, y]) => P(x, y)), 3);
    const lBE = (s) => 30 - s * 0.03;
    const lBD = (s) => 28 - s * 0.03;
    const yE = [-196, -428];
    const yD = [150, -326];
    const travessa = [[yE[0] - 26, yE[1] - 18], [yE[0] + 14, yE[1] - 14], [yD[0] + 8, yD[1] - 14], [yD[0] + 34, yD[1] - 6], [yD[0] + 32, yD[1] + 16], [yD[0] + 6, yD[1] + 10], [yE[0] + 12, yE[1] + 12], [yE[0] - 28, yE[1] + 6]];
    const espessura = (pts) => pol(pts.map(([x, y]) => { const [a, b] = P(x, y); return [a + esp[0], b + esp[1]]; }));
    const espTubo = (c, l) => tuboAo(c.map((q) => ({ ...q, x: q.x + esp[0], y: q.y + esp[1] })), l).forma;
    // a sombra no tapete e no banco
    sombraNoChao(k, pol([P(-130, 0), P(130, 0), [P(130, 0)[0] + 120, P(130, 0)[1] - 10], [P(-130, 0)[0] + 140, P(-130, 0)[1] + 4]]), 0, 0, 8, 0.35);
    // a espessura (o lado de trás que aparece), mais escura
    for (const f of [espTubo(bracoE, lBE), espTubo(bracoD, lBD), espessura(travessa), espessura(caixa)]) peca(k, f, [0, 0, W, H], { cor: '#6a4220', sombra: () => 0.7, ang: 0.4, passo: 3, maxL: 1.4, cruzada: 0.75, traco: 1.8, obj });
    // a caixa de som, com a tampa de madeira fina
    const fCaixa = caminho(caixa);
    peca(k, fCaixa, [P(-130, -82)[0], P(130, -82)[1] - 60, P(130, 0)[0], P(-130, 0)[1] + 10], { cor: madeira, ang: giro + 0.05, passo: 3, maxL: 1.8, sombra: (x, y) => sombraLira(x, y) + (y - P(0, -42)[1]) / 220, cruzada: 0.7, traco: 2.2, obj });
    k.save();
    k.clip(fCaixa);
    k.strokeStyle = 'rgba(50,24,6,.55)';
    k.lineWidth = 1;
    for (let y = -72; y < -8; y += 9) {
      k.beginPath();
      for (let x = -128; x <= 132; x += 8) { const [a, b] = P(x, y + Math.sin(x * 0.03 + y) * 2.2); if (x === -128) k.moveTo(a, b); else k.lineTo(a, b); }
      k.stroke();
    }
    k.restore();
    // os braços, curvos, e a travessa
    for (const [c, l] of [[bracoE, lBE], [bracoD, lBD]]) {
      const fb = tuboAo(c, l).forma;
      peca(k, fb, [0, 0, W, H], { cor: madeira, ang: giro + Math.PI / 2 + 0.1, passo: 2.8, maxL: 1.7, sombra: (x, y) => sombraLira(x, y) + 0.12, cruzada: 0.7, traco: 2.2, obj });
    }
    const fT = caminho(travessa);
    peca(k, fT, [0, 0, W, H], { cor: '#93602f', ang: giro - 0.55, passo: 2.8, maxL: 1.7, sombra: (x, y) => sombraLira(x, y) + 0.15, cruzada: 0.7, traco: 2.2, obj });
    // o cavalete na caixa, onde cada corda se prende embaixo
    const cav = caminho([[-80, -60], [80, -62], [80, -50], [-80, -48]]);
    peca(k, cav, [0, 0, W, H], { cor: '#e6d2a8', ang: 0, passo: 2.4, maxL: 1, sombra: () => 0.3, cruzada: 0.9, traco: 1.4, obj });
    const n = 10;
    const cordas = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const baixo = [-72 + u * 144, -54];
      const alto = [yE[0] + 40 + u * (yD[0] - yE[0] - 70), yE[1] + 8 + u * (yD[1] - yE[1] - 12)];
      cordas.push([baixo, alto]);
    }
    k.lineCap = 'round';
    cordas.forEach(([b, a], i) => {
      const [x0, y0] = P(...b);
      const [x1, y1] = P(...a);
      const vibra = i === 3 || i === 6;
      k.strokeStyle = 'rgba(40,20,6,.55)';
      k.lineWidth = 1.6;
      k.beginPath();
      k.moveTo(x0 + 3, y0 + 1);
      k.lineTo(x1 + 3, y1 + 1);
      k.stroke();
      for (const d of vibra ? [-2.6, 2.6] : [0]) {
        k.strokeStyle = vibra ? 'rgba(250,238,208,.8)' : '#f4e6c0';
        k.lineWidth = vibra ? 1.1 : 1.6;
        k.beginPath();
        k.moveTo(x0, y0);
        k.quadraticCurveTo((x0 + x1) / 2 + d, (y0 + y1) / 2, x1, y1);
        k.stroke();
      }
      // a volta de cordão na travessa
      k.fillStyle = '#e6d2a8';
      k.beginPath();
      k.ellipse(x1, y1 - 2, 5, 7, giro - 0.55, 0, 6.283);
      k.fill();
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.2;
      k.stroke();
      k.beginPath();
      k.moveTo(x1 - 4, y1 - 4);
      k.lineTo(x1 + 4, y1);
      k.stroke();
    });
    // as pontas dos braços acima da travessa, entalhadas em botão
    for (const [x, y] of [[-184, -462], [140, -356]]) {
      const [a, b] = P(x, y);
      const bt = new Path2D();
      bt.ellipse(a, b, 13, 15, giro, 0, 6.283);
      peca(k, bt, [a - 14, b - 16, a + 14, b + 16], { cor: '#93602f', ang: 1, passo: 2.4, maxL: 1.2, sombra: sombraOval(a, b, 13, 15, 0), cruzada: 0.7, traco: 1.8, obj });
    }
    vinheta(k, W, H, 0.32);
  }
  // ---------- (8) O manto de Elias (2 Rs 2.13-14) ----------
  // Do lado de cá do Jordão, depois da travessia (2.14): o manto de pelos de Elias (2 Rs 1.8)
  // largado na areia molhada da beira, grande, perto de quem olha: um pano pesado, com dobras
  // compridas e baixas, a barra tecida em listras e uma ponta dobrada por cima, mostrando o
  // avesso mais claro. Atrás, o rio já fechado corre de lado a lado, largo e manso, com a
  // margem de lá baixa, de juncos, e os morros. Sem gente, sem água aberta.
  function desenhoManto(k, W, H, obj) {
    const r = sorteio(7801);
    papelVelho(k, W, H, r, ['#f8ecd2', '#ecd6ae', '#cfae80'], [620, 160]);
    const hz = 300;
    ceuEmLinhas(k, W, hz, [[180, 120, 260, 26], [700, 200, 220, 20]], { topo: 0.5, base: 0.1 });
    // os morros de lá, baixos, em duas camadas
    for (const [base, amp, cor, sv, sem] of [[272, 46, '#e3c9a0', 0.3, 1], [306, 24, '#d1b086', 0.48, 2]]) {
      const f = onda(sorteio(7810 + sem), 4, 0.007);
      const m = pol([[-10, 380], ...Array.from({ length: 50 }, (_, i) => [i * 19 - 4, base - Math.abs(f(i * 19)) * amp]), [W + 10, 380]]);
      peca(k, m, [-10, base - amp, W + 10, 380], { cor, ang: 1.2, passo: 4.2, maxL: 1.1, sombra: (x, y) => sv + (y - base + amp) / 260, cruzada: 0.9, traco: 1.4 });
    }
    // a margem de lá: uma faixa baixa de terra, com uma fileira de juncos em traço
    const outra = pol([[-10, 336], ...Array.from({ length: 30 }, (_, i) => [i * 31, 326 + Math.sin(i * 0.8) * 3]), [W + 10, 336], [W + 10, 372], [-10, 372]]);
    k.fillStyle = '#d6bb8e';
    k.fill(outra);
    chaoEmLinhas(k, r, outra, -10, W + 10, 324, 372, 1.2, () => 0.45);
    k.save();
    k.strokeStyle = 'rgba(60,52,24,.8)';
    k.lineCap = 'round';
    // touceiras de juncos separadas, de alturas bem diferentes, com folhas que se curvam e,
    // aqui e ali, um pendão; entre elas, a margem fica limpa
    let xj = -10 + r() * 30;
    while (xj < W + 10) {
      const n = 5 + Math.floor(r() * 5);
      const alto = 14 + r() * 40;
      const larg = 14 + r() * 22;
      for (let q = 0; q < n; q++) {
        const x = xj + (q / (n - 1) - 0.5) * larg + (r() - 0.5) * 4;
        const h = alto * (0.5 + r() * 0.6);
        const curva = (x - xj) / larg * 14 + (r() - 0.5) * 6;
        k.lineWidth = 0.9 + r() * 0.7;
        k.beginPath();
        k.moveTo(x, 362);
        k.quadraticCurveTo(x + curva * 0.3, 362 - h * 0.6, x + curva, 362 - h);
        k.stroke();
        if (r() < 0.18) {
          k.fillStyle = 'rgba(60,52,24,.8)';
          k.beginPath();
          k.ellipse(x + curva, 362 - h - 4, 2.4, 6, curva * 0.03, 0, 6.283);
          k.fill();
        }
      }
      xj += larg + 24 + r() * 70;
    }
    k.restore();
    // o rio, largo e manso, de lado a lado: linhas compridas deitadas, mais juntas longe, e o
    // reflexo claro do céu no meio
    const rio = pol([[-10, 368], [W + 10, 368], [W + 10, 520], [-10, 520]]);
    k.fillStyle = '#b4b6a0';
    k.fill(rio);
    k.save();
    k.clip(rio);
    k.strokeStyle = 'rgba(40,46,36,.75)';
    k.lineCap = 'round';
    for (let y = 371; y < 522; y += 2.6 + (y - 368) * 0.05) {
      let x = -r() * 60;
      while (x < W) {
        const c = 40 + r() * 120;
        const refl = Math.exp(-(((x + c / 2 - 560) / 150) ** 2));
        k.lineWidth = (0.5 + (y - 368) / 80) * (1 - refl * 0.7);
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x + c / 2, y + Math.sin(x * 0.05 + y) * 1.2, x + c, y);
        k.stroke();
        x += c + 6 + r() * 18;
      }
    }
    k.restore();
    // a beira de cá: a lama molhada (escura) e a areia que sobe, clara, até embaixo
    const lama = pol([[-10, 512], ...Array.from({ length: 30 }, (_, i) => [i * 31, 518 + Math.sin(i * 1.3) * 5]), [W + 10, 512], [W + 10, 560], [-10, 560]]);
    k.fillStyle = '#a99476';
    k.fill(lama);
    chaoEmLinhas(k, r, lama, -10, W + 10, 512, 560, 1.6, () => 0.6);
    const areia = pol([[-10, 552], ...Array.from({ length: 30 }, (_, i) => [i * 31, 548 + Math.sin(i * 0.9) * 6]), [W + 10, 552], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#ecdcbc';
    k.fill(areia);
    chaoEmLinhas(k, r, areia, -10, W + 10, 548, H, 1.3, (x, y) => 0.22 + (y - 548) / 900);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.4;
    k.stroke(areia);
    // umas marcas de onda na lama, e as poças rasas
    k.strokeStyle = 'rgba(255,250,236,.8)';
    k.lineWidth = 1.4;
    for (const [x, y, l] of [[90, 530, 60], [340, 536, 80], [700, 528, 70], [820, 540, 40]]) { k.beginPath(); k.moveTo(x, y); k.quadraticCurveTo(x + l / 2, y - 3, x + l, y); k.stroke(); }

    // o manto, largado na areia da margem, perto da água: um pano pesado amarrotado, com as
    // dobras desiguais que atravessam o pano em várias direções e a barra tecida em listras
    // que corre torta pela beirada (em mundo: x para a direita, y para cima, z para quem olha)
    const S0 = 520;
    const cx0 = 500;
    const cy0 = 696;
    const V = (x, y, z) => [cx0 + x * S0 + z * S0 * 0.1, cy0 - y * S0 * 0.95 + z * S0 * 0.48];
    const NU = 56;
    const NV = 44;
    const rugas = [];
    for (let n = 0; n < 12; n++) rugas.push([0.1 + r() * 0.8, 0.1 + r() * 0.8, r() * 3.14, 0.018 + r() * 0.026, 0.025 + r() * 0.035, 0.9 + r() * 1.3]);
    // duas dobras compridas e baixas, que cruzam o pano de beira a beira (nada de calombo)
    rugas.push([0.45, 0.5, 0.35, 0.045, 0.06, 2.6], [0.68, 0.45, 2.1, 0.035, 0.05, 2.2]);
    const malha = [];
    for (let j = 0; j <= NV; j++) {
      const linha = [];
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        const v = j / NV;
        // o pano encolhe ao amarrotar: as linhas do tecido entortam
        let X = -0.72 + u * 1.42 + Math.sin(v * 6 + u * 2) * 0.05 + Math.sin(v * 15 + 1) * 0.015;
        let Z = -0.42 + v * 0.8 + Math.sin(u * 5 + 2) * 0.06 + Math.sin(u * 13) * 0.015;
        // onde duas dobras se cruzam, vale a mais alta (somar faria um calombo)
        let Y = 0.006;
        let soma = 0;
        for (const [ru, rv, ang, alt, larg, comp] of rugas) {
          const dd = (u - ru) * Math.sin(ang) - (v - rv) * Math.cos(ang);
          const ao = (u - ru) * Math.cos(ang) + (v - rv) * Math.sin(ang);
          const h = alt * Math.exp(-((dd / larg) ** 2)) * Math.max(0, 1 - (Math.abs(ao) * 2 / comp) ** 2);
          Y = Math.max(Y, 0.006 + h);
          soma += h;
        }
        Y += (soma - Y) * 0.15;
        // a parte da direita dobrou por cima, ao cair: o avesso (mais claro) fica para cima,
        // num rolo baixo que faz a curva da dobra
        let avesso = false;
        let dobra = false;
        const uf = 0.73;
        if (u > uf) {
          dobra = true;
          const t = (u - uf) * 1.42;
          const ang = Math.min(Math.PI, t / 0.022);
          const raio = 0.022;
          const xf = -0.72 + uf * 1.42 + Math.sin(v * 6 + uf * 2) * 0.05;
          if (t < raio * Math.PI) { X = xf + Math.sin(ang) * raio; Y = 0.006 + raio - Math.cos(ang) * raio; } else { X = xf - (t - raio * Math.PI); Y = 0.006 + raio * 2 + Y * 0.12; avesso = true; }
          Z += (u - uf) * 0.12;
        }
        linha.push({ X, Y, Z, u, v, avesso, dobra });
      }
      malha.push(linha);
    }
    const proj = (q) => V(q.X, q.Y, q.Z);
    // a luz: de cima, à esquerda e da frente
    const L = [-0.75, 0.55, 0.2];
    const nl = Math.hypot(...L);
    const luzDe = (i, j) => {
      const a = malha[j][Math.min(NU, i + 1)];
      const b = malha[j][Math.max(0, i - 1)];
      const c = malha[Math.min(NV, j + 1)][i];
      const d = malha[Math.max(0, j - 1)][i];
      const du = [a.X - b.X, a.Y - b.Y, a.Z - b.Z];
      const dv = [c.X - d.X, c.Y - d.Y, c.Z - d.Z];
      const n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
      const nn = Math.hypot(...n) || 1;
      const s = n[1] < 0 ? -1 : 1;
      return Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) * s / nn / nl);
    };
    // o pano em duas camadas (o corpo e, por cima, a dobra virada): em cada uma, o tom vem de
    // uma tela à parte, pintada célula a célula e depois borrada (o tom corre contínuo, sem
    // mosaico), recortada na silhueta; por cima, a gravura: as linhas ao longo do pano, mais
    // grossas na sombra, e a hachura cruzada nas sombras fundas; a barra é uma faixa tecida
    // (duas linhas com os pontos de través) e a beirada em tinta
    const celula = (i, j) => pol([proj(malha[j][i]), proj(malha[j][i + 1]), proj(malha[j + 1][i + 1]), proj(malha[j + 1][i])]);
    const camadas = [[], []];
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) camadas[malha[j][i].dobra && malha[j + 1][i].dobra ? 1 : 0].push([i, j]);
    const fManto = new Path2D();
    for (const lista of camadas) for (const [i, j] of lista) fManto.addPath(celula(i, j));
    sombraNoChao(k, fManto, 22, 10, 9, 0.38);
    for (const lista of camadas) for (const [i, j] of lista) { const c = celula(i, j); marcar(k, obj, c); marcar(k, obj, c, 2); }
    const tomPelo = (l, aves) => {
      const base = aves ? [150, 122, 86] : [98, 72, 46];
      const f = 0.45 + l * 0.75;
      return 'rgb(' + base.map((c) => Math.round(Math.min(255, c * f))).join(',') + ')';
    };
    camadas.forEach((lista, aves) => {
      if (!lista.length) return;
      const sil = new Path2D();
      for (const [i, j] of lista) sil.addPath(celula(i, j));
      const t = tela(W, H);
      const kt = t.getContext('2d');
      for (const [i, j] of lista) {
        const p = celula(i, j);
        kt.fillStyle = tomPelo(luzDe(i, j), aves);
        kt.strokeStyle = kt.fillStyle;
        kt.lineWidth = 2;
        kt.fill(p);
        kt.stroke(p);
      }
      k.save();
      k.clip(sil);
      k.fillStyle = tomPelo(0.5, aves);
      k.fill(sil);
      k.filter = 'blur(5px)';
      k.drawImage(t, 0, 0);
      k.filter = 'none';
      // a gravura ao longo do pano
      k.lineCap = 'round';
      const naCamada = new Set(lista.map(([i, j]) => i + ',' + j));
      for (let i = 1; i < NU; i++) {
        for (let j = 0; j < NV; j++) {
          if (!naCamada.has(i + ',' + j)) continue;
          const l = luzDe(i, j);
          const w = (1 - l) * 2.1 * (i % 2 ? 0.6 : 1);
          if (w < 0.3) continue;
          const [x0, y0] = proj(malha[j][i]);
          const [x1, y1] = proj(malha[j + 1][i]);
          k.strokeStyle = 'rgba(24,14,4,.8)';
          k.lineWidth = w;
          k.beginPath();
          k.moveTo(x0, y0);
          k.lineTo(x1, y1);
          k.stroke();
        }
      }
      for (let j = 1; j < NV; j += 2) {
        for (let i = 0; i < NU; i++) {
          if (!naCamada.has(i + ',' + j)) continue;
          const l = luzDe(i, j);
          if (l > 0.38) continue;
          const [x0, y0] = proj(malha[j][i]);
          const [x1, y1] = proj(malha[j][i + 1]);
          k.strokeStyle = 'rgba(24,14,4,.6)';
          k.lineWidth = (0.38 - l) * 3.4;
          k.beginPath();
          k.moveTo(x0, y0);
          k.lineTo(x1, y1);
          k.stroke();
        }
      }
      // a barra tecida: duas linhas paralelas à beirada e os pontos de través entre elas
      const faixa = (pts0, pts1) => {
        k.strokeStyle = 'rgba(30,18,6,.8)';
        k.lineWidth = 1.3;
        k.stroke(pol(pts0, false));
        k.stroke(pol(pts1, false));
        k.strokeStyle = 'rgba(214,180,130,.55)';
        k.lineWidth = 1;
        for (let n = 1; n < pts0.length - 1; n += 3) { k.beginPath(); k.moveTo(pts0[n][0], pts0[n][1]); k.lineTo(pts1[n + 1][0], pts1[n + 1][1]); k.stroke(); }
      };
      faixa(malha[1].map(proj), malha[3].map(proj));
      faixa(malha[NV - 1].map(proj), malha[NV - 3].map(proj));
      faixa(malha.map((l) => proj(l[1])), malha.map((l) => proj(l[3])));
      faixa(malha.map((l) => proj(l[NU - 1])), malha.map((l) => proj(l[NU - 3])));
      k.restore();
      // a beirada desta camada em tinta: as arestas de célula que não têm vizinha no pano; o
      // vinco da dobra (onde a dobra encontra o corpo) é uma linha lisa à parte
      const noPano = (i, j) => i >= 0 && j >= 0 && i < NU && j < NV;
      if (aves) {
        const vinco = [];
        for (let j = 0; j <= NV; j++) {
          const row = lista.filter(([, jj]) => jj === Math.min(j, NV - 1)).map(([i]) => i);
          if (row.length) vinco.push(proj(malha[j][Math.min(...row)]));
        }
        if (vinco.length > 2) {
          const lisa = curvaPor(vinco, 3).map((q) => [q.x, q.y]);
          k.strokeStyle = '#1e1308';
          k.lineWidth = 2.4;
          k.stroke(pol(lisa, false));
        }
      }
      k.strokeStyle = '#1e1308';
      k.lineWidth = 2.4;
      k.beginPath();
      for (const [i, j] of lista) {
        const A = proj(malha[j][i]);
        const B = proj(malha[j][i + 1]);
        const C = proj(malha[j + 1][i + 1]);
        const D = proj(malha[j + 1][i]);
        if (!noPano(i, j - 1)) { k.moveTo(A[0], A[1]); k.lineTo(B[0], B[1]); }
        if (!noPano(i, j + 1)) { k.moveTo(D[0], D[1]); k.lineTo(C[0], C[1]); }
        if (!noPano(i - 1, j)) { k.moveTo(A[0], A[1]); k.lineTo(D[0], D[1]); }
        if (!noPano(i + 1, j)) { k.moveTo(B[0], B[1]); k.lineTo(C[0], C[1]); }
      }
      k.stroke();
    });
    // o pelo de cabra: uns fios curtos e claros no lado da luz, só na parte de cima à vista
    for (let n = 0; n < 500; n++) {
      const i = 2 + Math.floor(r() * (NU - 4));
      const j = 2 + Math.floor(r() * (NV - 4));
      const l = luzDe(i, j);
      if (l < 0.55 || (!malha[j][i].avesso && malha[j][Math.min(NU, i + 1)].avesso === false && i > NU * 0.45)) continue;
      const [x0, y0] = proj(malha[j][i]);
      const [x1, y1] = proj(malha[j + 1][i]);
      k.strokeStyle = 'rgba(214,186,140,.55)';
      k.lineWidth = 1;
      k.beginPath();
      k.moveTo(x0 + (r() - 0.5) * 4, y0);
      k.quadraticCurveTo((x0 + x1) / 2 + (r() - 0.5) * 4, (y0 + y1) / 2, x1 + (r() - 0.5) * 4, y1);
      k.stroke();
    }
    vinheta(k, W, H, 0.22);
  }
  // ---------- (10) O vaso do oleiro (Jr 18.3-4) ----------
  // Na casa do oleiro, debaixo do alpendre de esteira, de manhã: a roda de oleiro de pedra (o
  // disco grande de baixo, que o pé gira, o eixo e o prato de cima) e, no prato, o vaso que
  // não saiu bom (18.4): o barro ainda mole e molhado cedeu, o corpo torceu e pendeu, o ombro
  // de um lado afundou numa dobra macia e a boca ficou torta, com as linhas da roda inteiras. Ao lado, no chão:
  // a bacia de água, a faca de madeira e o fio de cortar; atrás, numa prateleira de tábua, dois
  // jarros secando. Ninguém: só o barro que ainda vai ser outro jarro.
  function desenhoVaso(k, W, H, obj) {
    const r = sorteio(8001);
    papelVelho(k, W, H, r, ['#f8eed8', '#ecd9b6', '#d2b48a'], [300, 200]);
    // a parede de adobe do fundo, em linhas, com as fiadas de tijolo cru
    const chao = 560;
    linhas(k, 0, 0, W, chao, 4.6, 1.6, (x, y) => 0.32 + (y / chao) * 0.25 + Math.sin(x * 0.02 + y * 0.03) * 0.04);
    k.strokeStyle = 'rgba(60,40,18,.4)';
    k.lineWidth = 1.2;
    for (let y = 150; y < chao; y += 44) {
      k.beginPath();
      k.moveTo(0, y);
      k.lineTo(W, y + (r() - 0.5) * 3);
      k.stroke();
      for (let x = ((y / 44) % 2) * 50 + r() * 20; x < W; x += 100 + r() * 20) { k.beginPath(); k.moveTo(x, y); k.lineTo(x + (r() - 0.5) * 3, y + 44); k.stroke(); }
    }
    // o alpendre: a esteira de junco por cima e a sombra listrada que ela joga na parede
    const esteira = pol([[-10, 0], [W + 10, 0], [W + 10, 118], [-10, 140]]);
    k.fillStyle = '#c9a874';
    k.fill(esteira);
    k.save();
    k.clip(esteira);
    k.strokeStyle = 'rgba(60,40,14,.7)';
    for (let x = -20; x < W + 20; x += 9) { k.lineWidth = 1.4 + r() * 0.8; k.beginPath(); k.moveTo(x, 0); k.lineTo(x + 4, 140); k.stroke(); }
    k.strokeStyle = 'rgba(60,40,14,.5)';
    k.lineWidth = 2;
    for (const y of [40, 86]) { k.beginPath(); k.moveTo(-10, y + 6); k.lineTo(W + 10, y - 6); k.stroke(); }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(-10, 140);
    k.lineTo(W + 10, 118);
    k.stroke();
    // a viga que segura a esteira
    vara(k, [[-10, 142], [W + 10, 120]], 16, '#8a6a40', null);
    // a prateleira de tábua com dois jarros secando, à direita
    const prat = pol([[560, 330], [870, 324], [870, 342], [560, 348]]);
    peca(k, prat, [560, 324, 870, 348], { cor: '#a8865a', ang: 0, passo: 2.8, maxL: 1.4, sombra: () => 0.45, cruzada: 0.8, traco: 1.8 });
    for (const x of [600, 840]) peca(k, pol([[x - 6, 346], [x + 6, 346], [x + 4, 380], [x - 4, 380]]), [x - 6, 346, x + 6, 380], { cor: '#8a6a40', ang: 1.5, passo: 2.4, maxL: 1, sombra: () => 0.6, traco: 1.4 });
    const jarro = (cx, base, alt, larg, perfil) => {
      const v = vaso(k, cx, base, alt, larg, perfil);
      sombraNoChao(k, v, 10, 2, 4, 0.25);
      peca(k, v, [cx - larg / 2, base - alt, cx + larg / 2, base], { cor: '#d9b48a', tinta: '#3a2410', ang: 1.45, passo: 2.8, maxL: 1.4, sombra: (x) => 0.18 + (x - cx + larg / 2) / larg * 0.6, cruzada: 0.7, traco: 1.8, abaulado: 0.2 });
      k.fillStyle = '#3a2410';
      k.beginPath();
      k.ellipse(cx, base - alt, perfil(0) * larg / 2, 4, 0, 0, 6.283);
      k.fill();
    };
    jarro(650, 324, 110, 70, (t) => (t < 0.15 ? 0.4 : 0.4 + Math.sin(((t - 0.15) / 0.85) * Math.PI) * 0.55 - (t > 0.9 ? (t - 0.9) * 3 : 0)));
    jarro(770, 324, 84, 76, (t) => (t < 0.1 ? 0.55 : 0.5 + Math.sin(((t - 0.1) / 0.9) * Math.PI * 0.85) * 0.48));
    // o chão de terra batida, em perspectiva
    const piso = pol([[-10, chao], [W + 10, chao], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#d8bf96';
    k.fill(piso);
    chaoEmLinhas(k, r, piso, -10, W + 10, chao, H, 1.8, (x, y) => 0.36 + (y - chao) / 700);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.beginPath();
    k.moveTo(0, chao);
    k.lineTo(W, chao);
    k.stroke();
    // o bloco de barro amassado, alto, com a face lisa do corte do fio, e os respingos
    const monte = pol([[690, 616], [694, 580], [712, 556], [748, 548], [790, 556], [812, 580], [816, 616]]);
    sombraNoChao(k, monte, 12, 4, 4, 0.3);
    peca(k, monte, [690, 548, 816, 616], { cor: '#a8754a', tinta: '#2e1a08', ang: 1.2, passo: 2.6, maxL: 1.5, sombra: (x, y) => 0.25 + (x - 690) / 200 + (y - 548) / 300, cruzada: 0.7, traco: 1.8 });
    const corte = pol([[712, 556], [748, 548], [790, 556], [770, 570], [730, 572]]);
    peca(k, corte, [712, 548, 790, 572], { cor: '#c48e60', tinta: '#2e1a08', ang: 0.1, passo: 2.4, maxL: 0.9, sombra: () => 0.2, cruzada: 0.95, traco: 1.4 });
    for (let i = 0; i < 14; i++) { k.fillStyle = 'rgba(130,84,46,.7)'; k.beginPath(); k.ellipse(200 + r() * 500, 700 + r() * 120, 2 + r() * 5, 1 + r() * 2, 0, 0, 6.283); k.fill(); }

    // a roda: o disco grande de baixo (de pedra), o eixo e o prato de cima
    const cx = 400;
    const yB = 724;
    const rB = 236;
    const kB = 0.3;
    const yT = 492;
    const rT = 156;
    // o disco de baixo: a borda (a espessura) e a face de cima
    const bordaB = new Path2D();
    bordaB.ellipse(cx, yB + 26, rB, rB * kB, 0, 0, Math.PI);
    bordaB.lineTo(cx - rB, yB);
    bordaB.ellipse(cx, yB, rB, rB * kB, 0, Math.PI, 0, true);
    bordaB.closePath();
    const faceB = new Path2D();
    faceB.ellipse(cx, yB, rB, rB * kB, 0, 0, 6.283);
    sombraNoChao(k, faceB, 30, 30, 10, 0.35);
    peca(k, bordaB, [cx - rB, yB, cx + rB, yB + 26 + rB * kB], { cor: '#9c8c72', ang: 1.5, passo: 2.8, maxL: 1.7, sombra: (x) => 0.4 + (x - cx) / rB * 0.3, cruzada: 0.7, traco: 2.2, obj });
    peca(k, faceB, [cx - rB, yB - rB * kB, cx + rB, yB + rB * kB], { cor: '#c4b496', ang: 0.05, passo: 3, maxL: 1.5, sombra: (x, y) => 0.25 + (x - cx) / rB * 0.25 + (y - yB) / 300, cruzada: 0.8, traco: 2.2, obj });
    // as marcas do pé na pedra, gastas, e o furo do eixo
    k.strokeStyle = 'rgba(43,33,18,.55)';
    k.lineWidth = 1.4;
    for (const f of [0.55, 0.78]) { k.beginPath(); k.ellipse(cx, yB, rB * f, rB * kB * f, 0, 0.3, 2.6); k.stroke(); }
    // o eixo de madeira
    const eixo = pol([[cx - 10, yB], [cx - 8, yT + 10], [cx + 8, yT + 10], [cx + 10, yB]]);
    peca(k, eixo, [cx - 10, yT, cx + 10, yB], { cor: '#8a6a40', ang: 1.56, passo: 2.4, maxL: 1.3, sombra: (x) => 0.25 + (x - cx + 10) / 20 * 0.6, cruzada: 0.75, traco: 2, obj });
    // o prato de cima, de pedra, com o barro molhado escorrido na borda
    const bordaT = new Path2D();
    bordaT.ellipse(cx, yT + 16, rT, rT * kB, 0, 0, Math.PI);
    bordaT.lineTo(cx - rT, yT);
    bordaT.ellipse(cx, yT, rT, rT * kB, 0, Math.PI, 0, true);
    bordaT.closePath();
    const faceT = new Path2D();
    faceT.ellipse(cx, yT, rT, rT * kB, 0, 0, 6.283);
    peca(k, bordaT, [cx - rT, yT, cx + rT, yT + 16 + rT * kB], { cor: '#9c8c72', ang: 1.5, passo: 2.6, maxL: 1.6, sombra: (x) => 0.4 + (x - cx) / rT * 0.3, cruzada: 0.7, traco: 2, obj });
    peca(k, faceT, [cx - rT, yT - rT * kB, cx + rT, yT + rT * kB], { cor: '#a9805a', ang: 0.05, passo: 2.8, maxL: 1.3, sombra: (x) => 0.3 + (x - cx) / rT * 0.2, cruzada: 0.85, traco: 2, obj });
    // as linhas de barro em volta, deixadas pela roda
    k.strokeStyle = 'rgba(70,40,16,.6)';
    k.lineWidth = 1;
    for (const f of [0.7, 0.86]) { k.beginPath(); k.ellipse(cx, yT, rT * f, rT * kB * f, 0, 0, 6.283); k.stroke(); }
    // o vaso que não saiu bom (18.4): barro ainda mole e molhado, sem queimar, que cedeu: o
    // corpo torceu e pendeu para a direita, o ombro desse lado afundou para dentro numa dobra
    // macia e a boca ficou torta, mais baixa desse lado. As linhas da roda seguem a forma,
    // inteiras, e o brilho é o da água no barro, em traços curtos.
    const base = yT + 4;
    const alt = 230;
    const rad = (t) => 52 + Math.sin(Math.min(1, t / 0.78) * Math.PI * 0.95) * 58 - Math.max(0, t - 0.78) * 70;
    const pende = (t) => t * t * 34;
    const afunda = (t) => Math.exp(-(((t - 0.74) / 0.18) ** 2)) * 0.5;
    const desce = (t) => Math.max(0, t - 0.5) ** 1.5 * 150;
    const anel = (t, a) => {
      const c = Math.cos(a);
      const lado = Math.max(0, c);
      const rr = rad(t) * (1 - afunda(t) * lado * lado);
      return [cx + pende(t) + c * rr, base - t * alt + Math.sin(a) * rad(t) * 0.26 + desce(t) * lado * lado];
    };
    const T = 60;
    const esq = [];
    const dir = [];
    for (let i = 0; i <= T; i++) { esq.push(anel(i / T, Math.PI)); dir.push(anel(i / T, 0)); }
    const frenteB = [];
    for (let i = 0; i <= 24; i++) frenteB.push(anel(0, Math.PI - (i / 24) * Math.PI));
    const boca = [];
    for (let i = 0; i <= 48; i++) boca.push(anel(1, (i / 48) * 6.283));
    const corpo = pol([...esq, ...boca.slice(24, 49), ...dir.slice().reverse(), ...frenteB.slice(1)]);
    // a lama molhada no prato, em volta do pé
    const lamaP = new Path2D();
    lamaP.ellipse(cx + 6, base + 2, rad(0) + 34, (rad(0) + 34) * 0.26, 0, 0, 6.283);
    k.fillStyle = 'rgba(112,66,34,.75)';
    k.fill(lamaP);
    k.strokeStyle = 'rgba(255,236,206,.6)';
    k.lineWidth = 1.4;
    for (const [a0, a1] of [[3.4, 3.9], [4.5, 5.0], [0.3, 0.8]]) { k.beginPath(); k.ellipse(cx + 6, base + 2, rad(0) + 26, (rad(0) + 26) * 0.26, 0, a0, a1); k.stroke(); }
    sombraNoChao(k, corpo, 18, 6, 8, 0.3);
    marcar(k, obj, corpo);
    k.fillStyle = '#a8714a';
    k.fill(corpo);
    k.save();
    k.clip(corpo);
    // as linhas da roda: anéis inteiros que seguem a forma (só a metade da frente), mais
    // grossos na sombra (à direita) e onde a dobra afunda
    k.lineCap = 'round';
    for (let i = 1; i < T; i++) {
      const t = i / T;
      for (let j = 0; j < 24; j++) {
        const a0 = Math.PI - (j / 24) * Math.PI;
        const a1 = Math.PI - ((j + 1) / 24) * Math.PI;
        const p0 = anel(t, a0);
        const p1 = anel(t, a1);
        const c = Math.cos((a0 + a1) / 2);
        const sv = 0.25 - c * 0.45 + afunda(t) * Math.max(0, -c) * 0 + afunda(t) * Math.max(0, c) * 2.2 + (t > 0.95 ? 0.3 : 0);
        k.strokeStyle = 'rgba(46,22,6,' + Math.max(0.2, Math.min(0.9, 0.3 + sv * 0.6)).toFixed(2) + ')';
        k.lineWidth = Math.max(0.5, Math.min(2.4, 0.6 + sv * 1.6));
        k.beginPath();
        k.moveTo(p0[0], p0[1]);
        k.lineTo(p1[0], p1[1]);
        k.stroke();
      }
    }
    // a dobra macia: a sombra funda embaixo do ombro que afundou e a crista acesa por cima
    for (const [dt, cor, lw] of [[0.04, 'rgba(36,14,2,.7)', 6], [-0.06, 'rgba(255,226,190,.55)', 3]]) {
      k.strokeStyle = cor;
      k.lineWidth = lw;
      k.beginPath();
      for (let j = 0; j <= 12; j++) {
        const a = -0.9 + (j / 12) * 1.6;
        const p = anel(0.72 + dt, a);
        if (j) k.lineTo(p[0], p[1]); else k.moveTo(p[0], p[1]);
      }
      k.stroke();
    }
    // o brilho da água no barro: traços curtos e quebrados no lado da luz
    k.strokeStyle = 'rgba(255,240,220,.8)';
    k.lineWidth = 2;
    for (let n = 0; n < 16; n++) {
      const t = 0.15 + r() * 0.6;
      const a = Math.PI * (0.62 + r() * 0.2);
      const p = anel(t, a);
      k.beginPath();
      k.moveTo(p[0], p[1]);
      k.lineTo(p[0] + 2, p[1] - 6 - r() * 8);
      k.stroke();
    }
    k.restore();
    k.strokeStyle = '#2e1a08';
    k.lineWidth = 2.4;
    k.lineJoin = 'round';
    k.stroke(corpo);
    // a boca: o lábio grosso (um anel de barro que é do pescoço) e o escuro de dentro
    const fora = pol(boca);
    const dentro = pol(boca.map(([x, y]) => { const [mx, my] = anel(1, 0); const [ex, ey] = anel(1, Math.PI); const ccx = (mx + ex) / 2; const ccy = (my + ey) / 2; return [ccx + (x - ccx) * 0.72, ccy + (y - ccy) * 0.6 + 2]; }));
    k.fillStyle = '#c08a5e';
    k.fill(fora);
    k.fillStyle = '#2a1206';
    k.fill(dentro);
    k.strokeStyle = '#2e1a08';
    k.lineWidth = 2;
    k.stroke(fora);
    k.lineWidth = 1.4;
    k.stroke(dentro);
    // a luz no lábio, de cima à esquerda
    k.strokeStyle = 'rgba(255,236,206,.85)';
    k.lineWidth = 2;
    k.beginPath();
    for (let i = 14; i <= 30; i++) { const p = boca[i]; if (i === 14) k.moveTo(p[0], p[1] - 1.5); else k.lineTo(p[0], p[1] - 1.5); }
    k.stroke();
    // a bacia de água e a faca de madeira, no chão, à frente
    const bacia = new Path2D();
    bacia.ellipse(120, 760, 70, 22, 0, 0, Math.PI);
    bacia.lineTo(50, 742);
    bacia.ellipse(120, 742, 70, 22, 0, Math.PI, 0, true);
    bacia.closePath();
    sombraNoChao(k, bacia, 14, 8, 5, 0.3);
    peca(k, bacia, [50, 720, 190, 782], { cor: '#c48a58', tinta: '#3a2410', ang: 1.45, passo: 2.6, maxL: 1.4, sombra: (x) => 0.2 + (x - 50) / 140 * 0.6, cruzada: 0.7, traco: 2, obj });
    const agua = new Path2D();
    agua.ellipse(120, 744, 60, 16, 0, 0, 6.283);
    k.fillStyle = '#8f8a70';
    k.fill(agua);
    gravar(k, agua, 120, 744, 64, 0, 3, 1.2, () => 0.55, '#2a2a1e', 0);
    k.strokeStyle = 'rgba(255,250,236,.85)';
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(90, 740);
    k.quadraticCurveTo(110, 736, 130, 740);
    k.stroke();
    const faca = pol([[690, 650], [790, 630], [802, 638], [696, 662]]);
    sombraNoChao(k, faca, 6, 6, 3, 0.3);
    peca(k, faca, [690, 630, 802, 662], { cor: '#b8925e', ang: -0.2, passo: 2.4, maxL: 1, sombra: () => 0.35, traco: 1.6, obj });
    // o fio de cortar, com os dois pauzinhos
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.2;
    k.beginPath();
    k.moveTo(640, 760);
    k.bezierCurveTo(670, 790, 730, 730, 760, 772);
    k.stroke();
    for (const [x, y] of [[640, 760], [760, 772]]) vara(k, [[x - 10, y - 4], [x + 10, y + 4]], 6, '#8a6a40', obj);
    vinheta(k, W, H, 0.22);
  }
  // ---------- (11) A pérola de grande valor (Mt 13.45-46) ----------
  // Sobre a mesa do negociante, de tarde, com a luz que entra pela esquerda: a caixinha rasa de
  // madeira de oliveira, aberta, forrada de um pano de lã cor de vinho velho, amarrotado; no
  // meio do forro, na cova do pano, a pérola, sozinha, com o lustre de madrepérola (um rosado e
  // um verde-água bem leves) e a sombra mansa embaixo. A tampa abre para trás, nas dobradiças.
  // Na frente, a bolsa de couro do negociante, sentada e murcha, com a boca amarrotada aberta
  // e vazia e o cordão solto: ele vendeu tudo o que tinha (13.46).
  function desenhoPerola(k, W, H, obj) {
    const r = sorteio(8101);
    papelVelho(k, W, H, r, ['#f4e8d0', '#e2cba4', '#c3a274'], [200, 220]);
    const mesa = 420;
    // a parede: linhas, e o facho de luz que entra pela esquerda e desce na diagonal
    const facho = (x, y) => Math.max(0, 1 - Math.abs((x - 120) - (y * 0.9)) / 260);
    linhas(k, 0, 0, W, mesa, 4, 2, (x, y) => 0.62 - facho(x, y) * 0.45 + y / mesa * 0.08);
    // a mesa de madeira, com o veio e a borda da frente
    const tampo = pol([[-10, mesa], [W + 10, mesa], [W + 10, 790], [-10, 790]]);
    k.fillStyle = '#b8946a';
    k.fill(tampo);
    k.save();
    k.clip(tampo);
    k.strokeStyle = 'rgba(52,30,10,.6)';
    k.lineCap = 'round';
    for (let y = mesa + 3; y < 790; y += 3 + (y - mesa) * 0.02) {
      k.lineWidth = (0.6 + (y - mesa) / 200) * (1 - facho(400, y) * 0.2);
      k.beginPath();
      for (let x = -10; x <= W + 10; x += 12) { const yy = y + Math.sin(x * 0.012 + y * 0.05) * 2; if (x === -10) k.moveTo(x, yy); else k.lineTo(x, yy); }
      k.stroke();
    }
    k.restore();
    const bordaM = pol([[-10, 790], [W + 10, 790], [W + 10, H + 10], [-10, H + 10]]);
    peca(k, bordaM, [-10, 790, W + 10, H + 10], { cor: '#8a6438', ang: 0.02, passo: 3, maxL: 1.8, sombra: (x) => 0.45 + x / W * 0.3, cruzada: 0.7, traco: 2 });
    k.strokeStyle = 'rgba(255,236,196,.6)';
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(-10, 791);
    k.lineTo(W + 10, 791);
    k.stroke();

    // a caixinha: em mundo (x à direita, y para cima, z para quem olha), vista de cima, de leve
    const S0 = 300;
    const V = (x, y, z) => [470 + x * S0 + z * S0 * 0.28, 600 - y * S0 + z * S0 * 0.5];
    const bw = 0.62;
    const bd = 0.42;
    const bh = 0.16;
    const parede = 0.035;
    const face = (pts, cor, sv, ang, o = obj) => { const p = pol(pts.map((q) => V(...q))); peca(k, p, [0, 0, W, H], { cor, tinta: '#24140a', ang, passo: 2.4, maxL: 1.5, sombra: typeof sv === 'function' ? sv : () => sv, cruzada: 0.75, traco: 1.8, obj: o }); return p; };
    // a sombra da caixa na mesa
    sombraNoChao(k, pol([V(-bw, 0, -bd), V(bw, 0, -bd), V(bw + 0.25, 0, bd), V(-bw + 0.1, 0, bd + 0.05)]), 26, 10, 10, 0.45);
    // a tampa: presa nas dobradiças da beirada de trás (y = bh, z = -bd), aberta para trás uns
    // 105 graus, na mesma perspectiva da caixa; vê-se o lado de dentro, forrado, e a grossura
    const abre = 0.26;
    const tampaP = (x, l, e = 0) => [x, bh + l * Math.cos(abre) + e * Math.sin(abre), -bd - l * Math.sin(abre) + e * Math.cos(abre)];
    const lt = bd * 2;
    const et = 0.035;
    // a grossura da tampa, do lado direito e em cima
    face([tampaP(bw, 0, -et), tampaP(bw, lt, -et), tampaP(bw, lt, 0), tampaP(bw, 0, 0)], '#7a5634', 0.65, 1.5);
    face([tampaP(-bw, lt, -et), tampaP(bw, lt, -et), tampaP(bw, lt, 0), tampaP(-bw, lt, 0)], '#a07a4c', 0.4, 0.05);
    // o lado de dentro da tampa: a moldura de madeira e a almofada do mesmo pano
    face([tampaP(-bw, 0), tampaP(bw, 0), tampaP(bw, lt), tampaP(-bw, lt)], '#9c7448', (x) => 0.3 + (x - 300) / 900, 1.45);
    face([tampaP(-bw + 0.05, 0.05), tampaP(bw - 0.05, 0.05), tampaP(bw - 0.05, lt - 0.05), tampaP(-bw + 0.05, lt - 0.05)], '#6a3a2c', 0.55, 0.3, null);
    // a caixa: a frente e o lado direito
    face([[-bw, 0, bd], [bw, 0, bd], [bw, bh, bd], [-bw, bh, bd]], '#b08452', (x) => 0.25 + (x - 300) / 1200, 1.52);
    face([[bw, 0, bd], [bw, 0, -bd], [bw, bh, -bd], [bw, bh, bd]], '#8c6640', 0.6, 1.2);
    // o alto das paredes (a beirada da caixa) e o vão de dentro
    const fora = [[-bw, bh, -bd], [bw, bh, -bd], [bw, bh, bd], [-bw, bh, bd]];
    const dentro = [[-bw + parede, bh, -bd + parede], [bw - parede, bh, -bd + parede], [bw - parede, bh, bd - parede], [-bw + parede, bh, bd - parede]];
    const beira = new Path2D();
    beira.addPath(pol(fora.map((q) => V(...q))));
    k.fillStyle = '#d2a670';
    k.fill(beira);
    marcar(k, obj, beira);
    const vao = pol(dentro.map((q) => V(...q)));
    // o forro: pano de lã amarrotado, cor de vinho velho, que sobe nas paredes; dobras desiguais
    // em volta de uma cova no meio, onde a pérola descansa
    k.save();
    k.clip(vao);
    k.fillStyle = '#5e3428';
    k.fill(vao);
    const [cx, cy] = V(0.02, bh - 0.02, 0.02);
    // as dobras: vincos curvos e desiguais que atravessam o forro, cada um com o fundo escuro e a
    // crista acesa ao lado; nenhum sai do meio (nada de raio)
    const vincos = [
      [[-0.56, 0.11, -0.3], [-0.3, 0.13, -0.24], [-0.14, 0.11, -0.32]],
      [[0.2, 0.11, -0.3], [0.38, 0.13, -0.24], [0.56, 0.11, -0.3]],
      [[-0.56, 0.11, 0.26], [-0.36, 0.13, 0.18], [-0.18, 0.11, 0.3]],
      [[0.22, 0.11, 0.28], [0.4, 0.13, 0.2], [0.56, 0.11, 0.3]],
    ];
    gravar(k, vao, cx, cy, 260, 0.15, 2.4, 1.5, (x, y) => 0.5 + (x - cx) / 900 + Math.exp(-(((x - cx) / 60) ** 2) - (((y - cy) / 26) ** 2)) * 0.35, '#1e0e08', 0.1);
    // as dobras macias do pano: largas e borradas (a lã não faz vinco), cada uma uma sombra e,
    // ao lado, uma crista clara
    k.lineCap = 'round';
    for (const v of vincos) {
      const c = bezier(V(...v[0]), V(...v[1]), V(...v[1]), V(...v[2]), 20);
      k.save();
      k.filter = 'blur(5px)';
      k.strokeStyle = 'rgba(18,6,2,.55)';
      k.lineWidth = 14;
      k.beginPath();
      c.forEach(([x, y], i) => (i ? k.lineTo(x + 5, y + 4) : k.moveTo(x + 5, y + 4)));
      k.stroke();
      k.strokeStyle = 'rgba(200,140,110,.5)';
      k.lineWidth = 10;
      k.beginPath();
      c.forEach(([x, y], i) => (i ? k.lineTo(x - 5, y - 4) : k.moveTo(x - 5, y - 4)));
      k.stroke();
      k.restore();
    }
    // a gravura do pano por cima, para as dobras virarem linha (mais grossa na sombra)
    gravar(k, vao, cx, cy, 260, 0.15, 3, 1.2, () => 0.35, '#1e0e08', 0.1);
    // as paredes de dentro, a de trás e a da esquerda (que olham para quem vê), de madeira,
    // da beirada até o forro
    const pi = parede;
    for (const [pts, sv] of [[[[-bw + pi, bh, -bd + pi], [bw - pi, bh, -bd + pi], [bw - pi, 0.07, -bd + pi], [-bw + pi, 0.07, -bd + pi]], 0.55], [[[-bw + pi, bh, -bd + pi], [-bw + pi, bh, bd - pi], [-bw + pi, 0.07, bd - pi], [-bw + pi, 0.07, -bd + pi]], 0.4]]) {
      const p = pol(pts.map((q) => V(...q)));
      peca(k, p, [0, 0, W, H], { cor: '#8a6440', tinta: '#24140a', ang: 1.5, passo: 2.4, maxL: 1.4, sombra: () => sv, cruzada: 0.8, traco: 1.4 });
    }
    // a sombra das paredes no forro (lado da luz à esquerda)
    k.fillStyle = 'rgba(20,8,4,.35)';
    k.fill(pol([V(-bw + parede, bh, -bd + parede), V(bw - parede, bh, -bd + parede), V(bw - parede, bh - 0.05, -bd + 0.12), V(-bw + parede, bh - 0.05, -bd + 0.12)]));
    k.fill(pol([V(bw - parede, bh, -bd + parede), V(bw - parede, bh, bd - parede), V(bw - 0.1, bh - 0.05, bd - parede), V(bw - 0.1, bh - 0.05, -bd + parede)]));
    k.restore();
    k.strokeStyle = '#24140a';
    k.lineWidth = 1.6;
    k.stroke(vao);
    k.lineWidth = 2;
    k.stroke(pol(fora.map((q) => V(...q))));
    // as dobradiças de bronze, na beirada de trás
    for (const xh of [-bw * 0.6, bw * 0.6]) {
      const p = pol([V(xh - 0.05, bh, -bd), V(xh + 0.05, bh, -bd), V(...tampaP(xh + 0.05, 0.05)), V(...tampaP(xh - 0.05, 0.05))]);
      k.fillStyle = '#b8873e';
      k.fill(p);
      k.strokeStyle = '#24140a';
      k.lineWidth = 1.2;
      k.stroke(p);
    }
    // a pérola: lisa, um nada irregular, com o lustre: o tom perolado, um rosado de um lado e um
    // verde-água do outro, a janela da luz em cima (macia) e o reflexo morno do pano embaixo
    const pr = 50;
    const px = cx + 6;
    const py = cy - pr * 0.62;
    const perola = new Path2D();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * 6.283;
      const rr = pr * (1 + Math.sin(a * 3 + 0.4) * 0.012 + Math.sin(a * 2) * 0.01);
      if (i) perola.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); else perola.moveTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr);
    }
    perola.closePath();
    // a sombra mansa, deitada no pano, e o escuro da cova logo embaixo
    k.save();
    k.filter = 'blur(7px)';
    k.fillStyle = 'rgba(16,6,2,.6)';
    k.beginPath();
    k.ellipse(px + 18, py + pr * 0.9, pr * 1.05, pr * 0.32, 0, 0, 6.283);
    k.fill();
    k.restore();
    const g = k.createRadialGradient(px - pr * 0.35, py - pr * 0.4, pr * 0.05, px, py, pr * 1.02);
    g.addColorStop(0, '#fbf6ea');
    g.addColorStop(0.45, '#ece2d0');
    g.addColorStop(0.8, '#c9bcae');
    g.addColorStop(1, '#9c8c84');
    k.fillStyle = g;
    k.fill(perola);
    marcar(k, obj, perola);
    k.save();
    k.clip(perola);
    // o oriente: lavagens leves de rosado e verde-água, e o reflexo vinho do pano embaixo
    brilho(k, px + pr * 0.42, py - pr * 0.05, pr * 0.75, 'rgba(236,180,190,.32)');
    brilho(k, px - pr * 0.3, py + pr * 0.35, pr * 0.65, 'rgba(160,200,192,.3)');
    brilho(k, px + pr * 0.1, py + pr * 1.05, pr * 0.7, 'rgba(150,70,60,.45)');
    // a sombra da pérola: o lado de baixo e da direita escurece macio (gradiente, sem linha), e
    // um anel de luz refletida bem na beirada
    const gs = k.createRadialGradient(px - pr * 0.3, py - pr * 0.35, pr * 0.5, px - pr * 0.1, py - pr * 0.1, pr * 1.15);
    gs.addColorStop(0, 'rgba(90,70,64,0)');
    gs.addColorStop(1, 'rgba(90,70,64,.35)');
    k.fillStyle = gs;
    k.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    k.strokeStyle = 'rgba(255,236,226,.35)';
    k.lineWidth = 3;
    k.beginPath();
    k.arc(px, py, pr - 3, 0.2, 1.9);
    k.stroke();
    // a janela da luz: um brilho macio (sem ponto duro) e um segundo, fraco, do outro lado
    brilho(k, px - pr * 0.38, py - pr * 0.42, pr * 0.32, 'rgba(255,255,255,.95)');
    brilho(k, px + pr * 0.42, py + pr * 0.38, pr * 0.18, 'rgba(255,240,230,.4)');
    k.restore();
    k.strokeStyle = 'rgba(80,66,60,.85)';
    k.lineWidth = 1.4;
    k.stroke(perola);

    // a bolsa de couro do negociante, vazia: sentada na mesa, murcha (o fundo largo e chato, as
    // paredes caídas em rugas moles), o pescoço franzido amarrado com o cordão e, por cima, a
    // boca de couro amarrotado, tombada de lado e aberta um pouco: não há nada dentro
    {
      const bx = 176;
      const by = 760;
      const saco = new Path2D();
      saco.moveTo(bx - 14, by - 74);
      saco.bezierCurveTo(bx - 34, by - 66, bx - 72, by - 40, bx - 78, by - 14);
      saco.bezierCurveTo(bx - 82, by + 2, bx - 60, by + 8, bx - 10, by + 8);
      saco.bezierCurveTo(bx + 40, by + 8, bx + 74, by + 4, bx + 72, by - 12);
      saco.bezierCurveTo(bx + 66, by - 40, bx + 30, by - 66, bx + 12, by - 74);
      saco.closePath();
      sombraNoChao(k, saco, 18, 6, 6, 0.38);
      peca(k, saco, [bx - 82, by - 74, bx + 74, by + 8], { cor: '#9a6a40', tinta: '#2a1406', ang: 0.9, passo: 2.6, maxL: 1.6, sombra: (x, y) => 0.2 + (x - bx + 60) / 220 + (y - by + 70) / 300, cruzada: 0.75, traco: 2, obj });
      // as rugas do couro murcho: dobras que descem do pescoço e se abrem no fundo, desiguais
      k.lineCap = 'round';
      for (const [x1, y1, c, lw] of [[bx - 62, by - 6, -8, 1.8], [bx - 30, by + 4, 4, 1.4], [bx + 18, by + 2, -6, 1.6], [bx + 52, by - 8, 8, 1.3], [bx - 46, by - 30, 6, 1.1]]) {
        k.strokeStyle = 'rgba(42,20,6,.75)';
        k.lineWidth = lw;
        k.beginPath();
        k.moveTo(bx + (x1 - bx) * 0.12, by - 68);
        k.quadraticCurveTo((bx + x1) / 2 + c, (by - 68 + y1) / 2, x1, y1);
        k.stroke();
        k.strokeStyle = 'rgba(232,196,150,.45)';
        k.lineWidth = 1.2;
        k.beginPath();
        k.moveTo(bx + (x1 - bx) * 0.12 - 3, by - 66);
        k.quadraticCurveTo((bx + x1) / 2 + c - 4, (by - 68 + y1) / 2, x1 - 5, y1 - 2);
        k.stroke();
      }
      // o pescoço franzido e o cordão amarrado
      const pesc = pol([[bx - 14, by - 74], [bx - 9, by - 86], [bx + 9, by - 86], [bx + 12, by - 74]]);
      peca(k, pesc, [bx - 14, by - 86, bx + 12, by - 74], { cor: '#8a5a30', tinta: '#2a1406', ang: 1.5, passo: 2, maxL: 1.2, sombra: () => 0.5, traco: 1.6, obj });
      k.strokeStyle = '#d8c09a';
      k.lineWidth = 4;
      k.beginPath();
      k.moveTo(bx - 13, by - 79);
      k.quadraticCurveTo(bx, by - 76, bx + 12, by - 80);
      k.stroke();
      k.strokeStyle = 'rgba(42,20,6,.85)';
      k.lineWidth = 1;
      k.stroke();
      // a boca: couro amarrotado que tomba para a direita, em ondas moles, com o escuro de dentro
      const boca = new Path2D();
      boca.moveTo(bx - 10, by - 86);
      boca.quadraticCurveTo(bx - 26, by - 104, bx - 8, by - 112);
      boca.quadraticCurveTo(bx + 4, by - 124, bx + 18, by - 112);
      boca.quadraticCurveTo(bx + 34, by - 114, bx + 38, by - 100);
      boca.quadraticCurveTo(bx + 50, by - 92, bx + 38, by - 84);
      boca.quadraticCurveTo(bx + 24, by - 80, bx + 10, by - 86);
      boca.closePath();
      peca(k, boca, [bx - 26, by - 124, bx + 50, by - 80], { cor: '#b07c4a', tinta: '#2a1406', ang: 0.5, passo: 2.2, maxL: 1.2, sombra: (x, y) => 0.2 + (x - bx + 20) / 160 + (y - by + 120) / 140, cruzada: 0.85, traco: 1.6, obj });
      k.fillStyle = 'rgba(36,16,4,.85)';
      k.beginPath();
      k.ellipse(bx + 14, by - 100, 14, 6, -0.25, 0, 6.283);
      k.fill();
      k.strokeStyle = 'rgba(42,20,6,.6)';
      k.lineWidth = 1.1;
      for (const [x0, y0, x1, y1] of [[bx - 4, by - 88, bx - 14, by - 106], [bx + 22, by - 88, bx + 40, by - 96]]) { k.beginPath(); k.moveTo(x0, y0); k.quadraticCurveTo((x0 + x1) / 2 + 3, (y0 + y1) / 2, x1, y1); k.stroke(); }
      // o resto do cordão, solto na mesa
      k.strokeStyle = '#d8c09a';
      k.lineWidth = 3;
      k.beginPath();
      k.moveTo(bx + 12, by - 80);
      k.bezierCurveTo(bx + 60, by - 70, bx + 70, by + 26, bx + 120, by + 20);
      k.bezierCurveTo(bx + 150, by + 16, bx + 140, by - 4, bx + 118, by + 4);
      k.stroke();
      k.strokeStyle = 'rgba(42,20,6,.85)';
      k.lineWidth = 1;
      k.stroke();
    }
    vinheta(k, W, H, 0.28);
  }
  // ---------- (12) A moeda perdida (Lc 15.8-9) ----------
  // De noite, rente ao chão de lajes da casa: a lamparina de pires (tigelinha de barro de
  // borda apertada em bico) acesa no chão, a vassoura
  // de ramos deitada ao lado, o pó varrido em arcos e, numa junta entre as lajes, a dracma de
  // prata achada, de pé e torta, brilhando na luz da lamparina. O escuro da casa é linha
  // cerrada no papel; só a roda de luz em volta da lamparina fica clara. Ninguém: a mulher
  // está só no achado.
  function desenhoMoeda(k, W, H, obj) {
    const r = sorteio(8201);
    papelVelho(k, W, H, r, ['#f6e2b8', '#e2c08a', '#b88a56'], [470, 560]);
    const luz = [470, 520];
    const escuro = (x, y) => Math.min(1, Math.hypot((x - luz[0]) / 1.2, (y - luz[1]) * 1.25) / 430);
    // a parede do fundo (no alto) e o chão em lajes, em perspectiva
    const hz = 250;
    const par = new Path2D();
    par.rect(0, 0, W, hz);
    linhas(k, 0, 0, W, hz, 3.6, 2.2, (x, y) => 0.55 + escuro(x, y) * 0.6);

    const chao = pol([[-10, hz], [W + 10, hz], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#d8b884';
    k.fill(chao);
    // as lajes: juntas que fogem para um ponto de fuga alto e as juntas de través, mais juntas longe
    const fuga = [470, -260];
    const juntasY = [hz, 296, 356, 436, 540, 676, 860];
    const linhaFuga = (xb, y) => fuga[0] + (xb - fuga[0]) * ((y - fuga[1]) / (H - fuga[1]));
    // o tom do chão: linhas deitadas, mais grossas longe da luz
    chaoEmLinhas(k, r, chao, -10, W + 10, hz, H, 2.4, (x, y) => 0.15 + escuro(x, y) * 1.1);

    k.strokeStyle = 'rgba(30,20,8,.75)';
    k.lineCap = 'round';
    for (let i = 0; i < juntasY.length - 1; i++) {
      const y0 = juntasY[i];
      const y1 = juntasY[i + 1];
      k.lineWidth = 1.2 + i * 0.4;
      k.beginPath();
      k.moveTo(-10, y0 + (r() - 0.5) * 2);
      k.lineTo(W + 10, y0 + (r() - 0.5) * 2);
      k.stroke();
      // juntas de pé, desencontradas por fileira
      const des = (i % 2) * 0.5;
      for (let xb = -900 + des * 300; xb < 1800; xb += 300) {
        const xa = linhaFuga(xb, y0);
        const xc = linhaFuga(xb, y1);
        k.beginPath();
        k.moveTo(xa, y0);
        k.lineTo(xc + (r() - 0.5) * 3, y1);
        k.stroke();
      }
    }
    // o pó varrido: arcos de traço fino, de vassoura, e o montinho de pó num canto
    k.strokeStyle = 'rgba(120,90,50,.55)';
    k.lineWidth = 1;
    for (let n = 0; n < 9; n++) {
      const cx = 170 + n * 26;
      const cy = 640 + n * 6;
      for (let f = 0; f < 6; f++) {
        k.beginPath();
        k.arc(cx, cy + 200, 200 + f * 3, -Math.PI * 0.62, -Math.PI * 0.38);
        k.stroke();
      }
    }
    const po = lanoso(r, [[90, 560], [120, 540], [170, 536], [210, 552], [190, 566], [120, 570]], 4, 10);
    peca(k, po, [90, 536, 210, 570], { cor: '#c8a878', ang: 0.2, passo: 2.2, maxL: 1, sombra: (x, y) => 0.3 + (y - 536) / 80, cruzada: 0.9, traco: 1.2 });

    // o escuro da casa, longe da lamparina: mais duas camadas de hachura cruzada, cerradas
    const tudo = new Path2D();
    tudo.rect(0, 0, W, H);
    // (uma aguada sépia por baixo, e por cima uma só família de linhas, deitadas e de peso
    // variável, que engrossam até quase fechar; nada de trama cruzada, que vira tela)
    k.save();
    const ag = k.createRadialGradient(luz[0], luz[1], 120, luz[0], luz[1], 620);
    ag.addColorStop(0, 'rgba(40,24,8,0)');
    ag.addColorStop(1, 'rgba(40,24,8,.6)');
    k.fillStyle = ag;
    k.fillRect(0, 0, W, H);
    k.restore();
    gravar(k, tudo, W / 2, H / 2, 700, 0.04, 4.2, 3.6, (x, y) => escuro(x, y) * 1.6 - 0.6, '#1e140a', 0);
    // a vassoura de ramos deitada, do canto da esquerda para a lamparina
    const cabo = [[-20, 760], [250, 690]];
    vara(k, cabo, 13, '#8a6a40', obj);
    k.save();
    k.translate(250, 690);
    k.rotate(Math.atan2(-70, 270));
    k.scale(1.25, 1.25);
    const feixe = pol([[-6, -12], [40, -18], [150, -34], [170, 0], [150, 38], [40, 18], [-6, 12]]);
    sombraNoChao(k, feixe, 4, 14, 6, 0.35);
    k.fillStyle = '#b8955a';
    k.fill(feixe);
    marcar(k, obj, feixe);
    k.strokeStyle = 'rgba(52,32,10,.85)';
    k.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const a = (r() - 0.5) * 0.45;
      const l = 120 + r() * 50;
      k.lineWidth = 0.8 + r() * 1.2;
      k.beginPath();
      k.moveTo(10, (r() - 0.5) * 16);
      k.quadraticCurveTo(l * 0.5, Math.sin(a) * l * 0.5 + (r() - 0.5) * 6, l, Math.sin(a) * l);
      k.stroke();
    }
    k.strokeStyle = '#24160a';
    k.lineWidth = 2;
    k.stroke(feixe);
    // as amarras de cordão
    for (const x of [8, 26]) {
      k.fillStyle = '#d8c09a';
      k.fillRect(x, -15, 8, 30);
      k.strokeStyle = '#24160a';
      k.lineWidth = 1.2;
      k.strokeRect(x, -15, 8, 30);
    }
    k.restore();

    // a lamparina de barro, no chão: uma tigelinha aberta (de pires), de borda dobrada e
    // apertada num lado para fazer o bico; dentro, o azeite e o pavio de pano deitado no bico
    const lx = 0;
    const ly = 0;
    k.save();
    k.translate(440, 540);
    k.scale(1.55, 1.55);
    // o bojo: a meia elipse de baixo, mais funda que a borda
    const bojo = new Path2D();
    bojo.moveTo(lx - 66, ly);
    bojo.bezierCurveTo(lx - 64, ly + 40, lx + 52, ly + 42, lx + 70, ly + 2);
    bojo.lineTo(lx + 96, ly - 4);
    bojo.lineTo(lx + 98, ly + 2);
    bojo.bezierCurveTo(lx + 60, ly + 26, lx - 40, ly + 50, lx - 66, ly);
    bojo.closePath();
    sombraNoChao(k, bojo, -30, 18, 8, 0.4);
    peca(k, bojo, [lx - 66, ly - 4, lx + 98, ly + 46], { cor: '#b9774a', tinta: '#2e1606', ang: 1.35, passo: 2.4, maxL: 1.5, sombra: (x, y) => 0.25 + (y - ly) / 60 + (lx - x) / 300, cruzada: 0.7, traco: 2, obj });
    // a borda de cima: o anel largo da tigela, que se aperta em bico à direita
    const beira = new Path2D();
    beira.moveTo(lx - 68, ly);
    beira.bezierCurveTo(lx - 66, ly - 34, lx + 40, ly - 38, lx + 66, ly - 12);
    beira.quadraticCurveTo(lx + 82, ly - 10, lx + 100, ly - 7);
    beira.quadraticCurveTo(lx + 84, ly - 1, lx + 68, ly + 6);
    beira.bezierCurveTo(lx + 40, ly + 30, lx - 64, ly + 30, lx - 68, ly);
    beira.closePath();
    peca(k, beira, [lx - 68, ly - 36, lx + 100, ly + 30], { cor: '#d49a64', tinta: '#2e1606', ang: 0.1, passo: 2.6, maxL: 1.1, sombra: (x, y) => 0.12 + (y - ly + 30) / 120, cruzada: 0.9, traco: 2, obj });
    // o azeite dentro, escuro e liso, com o reflexo da chama
    const oleo = new Path2D();
    oleo.moveTo(lx - 54, ly);
    oleo.bezierCurveTo(lx - 52, ly - 24, lx + 34, ly - 27, lx + 56, ly - 8);
    oleo.quadraticCurveTo(lx + 62, ly - 4, lx + 56, ly + 2);
    oleo.bezierCurveTo(lx + 30, ly + 20, lx - 50, ly + 20, lx - 54, ly);
    oleo.closePath();
    k.fillStyle = '#4a2a10';
    k.fill(oleo);
    gravar(k, oleo, lx, ly - 4, 64, 0.05, 2.2, 1.1, () => 0.6, '#1e0e04', 0);
    k.strokeStyle = 'rgba(255,214,140,.7)';
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(lx + 18, ly - 12);
    k.quadraticCurveTo(lx + 30, ly - 14, lx + 40, ly - 10);
    k.stroke();
    // a dobra apertada do bico: as duas beiradas que se encontram
    k.strokeStyle = '#2e1606';
    k.lineWidth = 1.4;
    k.beginPath();
    k.moveTo(lx + 60, ly - 10);
    k.quadraticCurveTo(lx + 78, ly - 8, lx + 96, ly - 6);
    k.moveTo(lx + 60, ly + 2);
    k.quadraticCurveTo(lx + 78, ly - 2, lx + 96, ly - 5);
    k.stroke();
    // o pavio de pano torcido, deitado no bico, com a ponta queimada para fora
    k.strokeStyle = '#e8d6b0';
    k.lineWidth = 4;
    k.lineCap = 'round';
    k.beginPath();
    k.moveTo(lx + 40, ly - 4);
    k.quadraticCurveTo(lx + 70, ly - 6, lx + 96, ly - 6);
    k.stroke();
    k.strokeStyle = 'rgba(46,22,6,.7)';
    k.lineWidth = 1;
    for (let t = 44; t < 94; t += 6) { k.beginPath(); k.moveTo(lx + t, ly - 8); k.lineTo(lx + t + 3, ly - 3); k.stroke(); }
    k.fillStyle = '#2a1608';
    k.beginPath();
    k.arc(lx + 98, ly - 6, 3, 0, 6.283);
    k.fill();
    // a chama: uma língua mansa e redonda, larga embaixo, com o clarão em volta
    const fx = lx + 98;
    const fy = ly - 6;
    brilho(k, fx, fy - 30, 160, 'rgba(255,214,140,.35)', 'screen');
    brilho(k, fx, fy - 22, 60, 'rgba(255,236,190,.55)', 'screen');
    const ch = new Path2D();
    ch.moveTo(fx, fy + 2);
    ch.bezierCurveTo(fx - 16, fy - 2, fx - 14, fy - 26, fx - 2, fy - 44);
    ch.bezierCurveTo(fx + 2, fy - 38, fx + 14, fy - 24, fx + 13, fy - 10);
    ch.bezierCurveTo(fx + 12, fy - 2, fx + 6, fy + 2, fx, fy + 2);
    ch.closePath();
    const gch = k.createRadialGradient(fx, fy - 12, 2, fx, fy - 16, 30);
    gch.addColorStop(0, 'rgba(255,252,236,1)');
    gch.addColorStop(0.45, 'rgba(255,214,120,.97)');
    gch.addColorStop(1, 'rgba(226,120,40,.9)');
    k.fillStyle = gch;
    k.fill(ch);
    k.strokeStyle = 'rgba(190,90,24,.6)';
    k.lineWidth = 1;
    k.stroke(ch);
    // o pé azulado da chama, junto ao pavio
    k.strokeStyle = 'rgba(110,130,180,.45)';
    k.lineWidth = 2;
    k.beginPath();
    k.arc(fx, fy - 4, 5, 0.3, Math.PI - 0.3);
    k.stroke();
    k.restore();

    // a dracma: um disco de prata grosso, de pé e torto na junta das lajes, à direita e na
    // frente da lamparina; na face, um ramo de palma estampado; o brilho da chama na beirada
    const mx = 650;
    const my = 690;
    k.save();
    k.translate(mx, my);
    k.rotate(-0.28);
    const raio = 66;
    const esp = 13;
    const borda = new Path2D();
    borda.ellipse(esp, 0, raio * 0.42, raio, 0, -Math.PI / 2, Math.PI / 2);
    borda.lineTo(0, raio);
    borda.ellipse(0, 0, raio * 0.42, raio, 0, Math.PI / 2, -Math.PI / 2, true);
    borda.closePath();
    const face = new Path2D();
    face.ellipse(0, 0, raio * 0.42, raio, 0, 0, 6.283);
    sombraNoChao(k, face, 26, 12, 6, 0.5);
    k.fillStyle = '#6e7276';
    k.fill(borda);
    k.strokeStyle = '#1c1e20';
    k.lineWidth = 1.6;
    k.stroke(borda);
    // os riscos da serrilha na borda
    k.save();
    k.clip(borda);
    k.strokeStyle = 'rgba(20,22,24,.7)';
    k.lineWidth = 1;
    for (let a = -1.4; a < 1.4; a += 0.12) { k.beginPath(); k.moveTo(Math.cos(a) * raio * 0.42, Math.sin(a) * raio); k.lineTo(Math.cos(a) * raio * 0.42 + esp, Math.sin(a) * raio); k.stroke(); }
    k.restore();
    const gm = k.createLinearGradient(-raio * 0.42, -raio, raio * 0.42, raio);
    gm.addColorStop(0, '#f6f7f2');
    gm.addColorStop(0.45, '#c9ccc8');
    gm.addColorStop(1, '#8a8e90');
    k.fillStyle = gm;
    k.fill(face);
    k.strokeStyle = '#1c1e20';
    k.lineWidth = 2;
    k.stroke(face);
    // o ramo de palma estampado (a haste e as folhinhas), achatado pela perspectiva
    k.save();
    k.scale(0.42, 1);
    k.strokeStyle = 'rgba(40,42,44,.85)';
    k.lineWidth = 2.2;
    k.beginPath();
    k.moveTo(0, raio * 0.7);
    k.quadraticCurveTo(-4, 0, 2, -raio * 0.7);
    k.stroke();
    k.lineWidth = 1.6;
    for (let t = -0.55; t < 0.6; t += 0.18) {
      const y = t * raio;
      k.beginPath();
      k.moveTo(0, y);
      k.lineTo(-14 - (0.6 - Math.abs(t)) * 10, y - 10);
      k.moveTo(0, y);
      k.lineTo(14 + (0.6 - Math.abs(t)) * 10, y - 10);
      k.stroke();
    }
    k.beginPath();
    k.arc(0, 0, raio * 0.86, 0, 6.283);
    k.setLineDash([3, 4]);
    k.stroke();
    k.setLineDash([]);
    k.restore();
    k.restore();
    const mF = new Path2D();
    mF.ellipse(mx + 4, my, raio * 0.6, raio * 1.05, -0.28, 0, 6.283);
    marcar(k, obj, mF);
    // o brilho: uma estrelinha de luz na beirada que olha para a chama
    estrelinha(k, mx - 16, my - 46, 22, 'rgba(255,250,230,.95)');
    vinheta(k, W, H, 0.3);
  }
  // ---------- (13) Cinco pães e dois peixes (Jo 6.9) ----------
  // No gramado do monte (Jo 6.10), de tarde: uma bandeja oval e rasa de folha de palmeira
  // trançada em diagonal, vista de cima, e nela os cinco pães de cevada (chatos, de cúpula
  // baixa, a casca rachada, cortados em cruz ou em talhos, com farinha; um partido à mão) e os
  // dois peixinhos secos, deitados por cima. A bandeja descansa no capim alto; atrás, a encosta
  // e o céu de linhas. Ninguém: só o lanche do rapaz.
  function desenhoPaes(k, W, H, obj) {
    const r = sorteio(8301);
    papelVelho(k, W, H, r, ['#f8eed6', '#ead8b0', '#cfb486'], [260, 140]);
    const hz = 260;
    ceuEmLinhas(k, W, hz, [[240, 120, 240, 26], [700, 190, 200, 18]], { topo: 0.5, base: 0.1 });
    // a encosta: o gramado sobe para trás, em faixas de capim, mais miúdo longe
    const fE = onda(sorteio(8310), 4, 0.008);
    const enc = pol([[-10, H + 10], ...Array.from({ length: 48 }, (_, i) => [i * 19 - 4, hz + 10 + fE(i * 19) * 18 - Math.sin(i / 47 * Math.PI) * 26]), [W + 10, H + 10]]);
    k.fillStyle = '#d4c896';
    k.fill(enc);
    k.save();
    k.clip(enc);
    k.strokeStyle = 'rgba(64,56,24,.7)';
    k.lineCap = 'round';
    for (let y = hz - 30; y < H + 10; y += 3 + (y - hz) * 0.03) {
      const t = (y - hz) / (H - hz);
      let x = -r() * 20;
      while (x < W + 10) {
        const h = 3 + t * 22 * (0.6 + r() * 0.6);
        k.lineWidth = 0.5 + t * 1.4;
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x + (r() - 0.5) * 4, y - h * 0.6, x + (r() - 0.3) * h * 0.4, y - h);
        k.stroke();
        x += 2 + (1 - t) * 3 + r() * 5;
      }
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(enc);

    // o cesto: uma bandeja oval e rasa de folha de palmeira trançada em diagonal (sarja, duas
    // por cima e duas por baixo), vista de cima; a borda é um feixe amarrado com tiras
    const cx = 444;
    const cy = 540;
    const rx = 318;
    const ry = 150;
    const alt = 58;
    const rb = 0.9;
    const rxi = rx - 10;
    const ryi = ry - 7;
    const sombraC = new Path2D();
    sombraC.ellipse(cx + 36, cy + alt + 18, rx * 0.98, ry * 0.86, 0, 0, 6.283);
    k.save();
    k.filter = 'blur(14px)';
    k.fillStyle = 'rgba(40,36,10,.55)';
    k.fill(sombraC);
    k.restore();
    // a trança: células em losango (as tiras correm a 45°), mapeadas na superfície por
    // mapa(s, h); tom(s, h) dá a sombra de 0 (luz) a 1 (escuro)
    const tranca = (forma, mapa, s0, s1, h0, h1, w, tom) => {
      k.save();
      k.clip(forma);
      k.lineCap = 'round';
      const i0 = Math.floor((s0 + h0) / w) - 1;
      const i1 = Math.ceil((s1 + h1) / w) + 1;
      const j0 = Math.floor((s0 - h1) / w) - 1;
      const j1 = Math.ceil((s1 - h0) / w) + 1;
      const PQ = (p, q) => mapa((p + q) / 2, (p - q) / 2);
      const lado = (pa, qa, pb, qb) => [0, 1, 2, 3].map((n) => PQ(pa + (pb - pa) * n / 3, qa + (qb - qa) * n / 3));
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          const p = i * w;
          const q = j * w;
          const sc = (p + q + w) / 2;
          const hc = (p - q) / 2;
          if (sc < s0 - w || sc > s1 + w || hc < h0 - w || hc > h1 + w) continue;
          const pts = [...lado(p, q, p + w, q), ...lado(p + w, q, p + w, q + w), ...lado(p + w, q + w, p, q + w), ...lado(p, q + w, p, q)];
          const cel = pol(pts);
          const emCima = (((i - j) % 4) + 4) % 4 < 2;
          const sv = Math.max(0, Math.min(1, tom(sc, hc)));
          const base = emCima ? [222, 190, 128] : [200, 162, 100];
          k.fillStyle = 'rgb(' + base.map((c) => Math.round(c * (1 - sv * 0.5))).join(',') + ')';
          k.fill(cel);
          // as fibras da folha, ao comprido da tira, e o fio de luz no meio dela
          k.strokeStyle = 'rgba(60,38,12,' + (0.35 + sv * 0.3).toFixed(2) + ')';
          k.lineWidth = 0.7;
          for (const f of [0.22, 0.5, 0.78]) {
            const a = emCima ? PQ(p + w * 0.08, q + w * f) : PQ(p + w * f, q + w * 0.08);
            const b = emCima ? PQ(p + w * 0.92, q + w * f) : PQ(p + w * f, q + w * 0.92);
            k.beginPath();
            k.moveTo(a[0], a[1]);
            k.lineTo(b[0], b[1]);
            k.stroke();
          }
          k.strokeStyle = 'rgba(255,240,200,' + (0.55 * (1 - sv)).toFixed(2) + ')';
          k.lineWidth = 1.1;
          const a = emCima ? PQ(p + w * 0.2, q + w * 0.36) : PQ(p + w * 0.36, q + w * 0.2);
          const b = emCima ? PQ(p + w * 0.8, q + w * 0.36) : PQ(p + w * 0.36, q + w * 0.8);
          k.beginPath();
          k.moveTo(a[0], a[1]);
          k.lineTo(b[0], b[1]);
          k.stroke();
          // onde a tira mergulha por baixo da outra, a sombra fica funda
          const m0 = emCima ? PQ(p, q) : PQ(p, q);
          const m1 = emCima ? PQ(p, q + w) : PQ(p + w, q);
          k.strokeStyle = 'rgba(40,22,6,.9)';
          k.lineWidth = 2;
          k.beginPath();
          k.moveTo(m0[0], m0[1]);
          k.lineTo(m1[0], m1[1]);
          k.stroke();
          k.strokeStyle = 'rgba(40,22,6,.7)';
          k.lineWidth = 0.9;
          k.stroke(cel);
        }
      }
      k.restore();
    };
    // a parede de fora, na frente: baixa, abrindo para cima
    const S0 = Math.PI * (rx + ry) / 2;
    const naParede = (s, h) => {
      const a = Math.PI * (1 - s / S0);
      const t = h / alt;
      const e = 1 - t * (1 - rb);
      return [cx + Math.cos(a) * rx * e, cy + t * alt + Math.sin(a) * ry * e];
    };
    const parede = new Path2D();
    parede.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
    parede.lineTo(cx - rx * rb, cy + alt);
    parede.ellipse(cx, cy + alt, rx * rb, ry * rb, 0, Math.PI, 0, true);
    parede.closePath();
    const tampaCesto = new Path2D();
    tampaCesto.ellipse(cx, cy, rx + 9, ry + 6, 0, 0, 6.283);
    marcar(k, obj, parede);
    marcar(k, obj, tampaCesto);
    k.fillStyle = '#b08850';
    k.fill(parede);
    tranca(parede, naParede, 0, S0, 0, alt, 15, (s, h) => 0.15 + (s / S0) * 0.55 + (h / alt) * 0.25);
    gravar(k, parede, cx, cy + alt / 2, rx + 20, 1.2, 3.6, 1.5, (x, y) => (x - cx) / rx * 0.9 + (y - cy - alt) / 200 + 0.05, '#2e1c08', 0);
    k.strokeStyle = '#2e1c08';
    k.lineWidth = 2.2;
    k.stroke(parede);
    // por dentro: a parede de trás (na sombra que a borda faz) e o fundo trançado
    const boca = new Path2D();
    boca.ellipse(cx, cy, rxi, ryi, 0, 0, 6.283);
    k.fillStyle = '#8c6838';
    k.fill(boca);
    const S1 = Math.PI * (rxi + ryi) / 2;
    const dentro = (s, h) => {
      const a = Math.PI + Math.PI * (s / S1);
      const t = h / alt;
      const e = 1 - t * (1 - rb) - t * 0.03;
      return [cx + Math.cos(a) * rxi * e, cy + t * alt + Math.sin(a) * ryi * e];
    };
    tranca(boca, dentro, 0, S1, 0, alt, 13, (s, h) => 0.5 + (h / alt) * 0.3 - Math.sin(Math.PI * s / S1) * 0.1);
    const fundo = new Path2D();
    fundo.ellipse(cx, cy + alt, rxi * (rb - 0.03), ryi * (rb - 0.03), 0, 0, 6.283);
    k.save();
    k.clip(boca);
    tranca(fundo, (s, h) => [cx + s, cy + alt + h * (ry / rx)], -rxi, rxi, -rxi, rxi, 18, (s, h) => 0.3 + (s / rxi) * 0.2 - (h / rxi) * 0.3 + (h < -rxi * 0.55 ? 0.3 : 0));
    // a sombra da borda de trás sobre o fundo
    k.save();
    k.filter = 'blur(10px)';
    k.fillStyle = 'rgba(30,18,4,.5)';
    k.beginPath();
    k.ellipse(cx, cy + 10, rxi, ryi, 0, Math.PI, 0);
    k.lineTo(cx + rxi, cy + 40);
    k.ellipse(cx, cy + 40, rxi * 0.9, ryi * 0.82, 0, 0, Math.PI, true);
    k.closePath();
    k.fill();
    k.restore();
    k.restore();
    k.strokeStyle = 'rgba(40,22,6,.8)';
    k.lineWidth = 1.4;
    k.save();
    k.clip(boca);
    k.stroke(fundo);
    k.restore();
    // a borda: um feixe de capim seco (as fibras ao comprido) amarrado com tiras de palha
    // que dão a volta nele a intervalos, inclinadas
    const borda = (de, ate) => {
      const fora = [];
      const dent = [];
      for (let i = 0; i <= 80; i++) {
        const a = de + (ate - de) * (i / 80);
        fora.push([cx + Math.cos(a) * (rx + 9), cy + Math.sin(a) * (ry + 6)]);
        dent.push([cx + Math.cos(a) * (rxi - 2), cy + Math.sin(a) * (ryi - 2)]);
      }
      const banda = pol([...fora, ...dent.slice().reverse()]);
      k.fillStyle = '#a88450';
      k.fill(banda);
      k.save();
      k.clip(banda);
      // o feixe: fibras ao comprido
      for (let f = 0; f < 11; f++) {
        const m = (f + 0.5) / 11;
        k.strokeStyle = 'rgba(52,30,8,' + (0.4 + m * 0.4).toFixed(2) + ')';
        k.lineWidth = 0.9;
        k.beginPath();
        for (let i = 0; i <= 80; i++) {
          const a = de + (ate - de) * (i / 80);
          const x = cx + Math.cos(a) * (rx + 9 - m * (rx + 11 - rxi));
          const y = cy + Math.sin(a) * (ry + 6 - m * (ry + 8 - ryi)) + Math.sin(i * 1.7 + f) * 0.6;
          if (i) k.lineTo(x, y);
          else k.moveTo(x, y);
        }
        k.stroke();
      }
      // as amarras: tiras de palha enroladas no feixe a passos desiguais, às vezes duas ou três
      // juntas, de largura e inclinação variadas, quase do tom do feixe
      const ra = sorteio(de > 3.5 ? 8341 : 8342);
      const P = (aa, m) => [cx + Math.cos(aa) * (rx + 11 - m * (rx + 14 - rxi)), cy + Math.sin(aa) * (ry + 7 - m * (ry + 10 - ryi))];
      const dirA = ate > de ? 1 : -1;
      let a = de + dirA * (0.03 + ra() * 0.08);
      while ((a - ate) * dirA < 0) {
        const nJ = ra() < 0.55 ? 1 : ra() < 0.6 ? 2 : 3;
        for (let j = 0; j < nJ; j++) {
          const d = 0.011 + ra() * 0.012;
          const inc = 0.014 + ra() * 0.03;
          const tira = pol([P(a - d - inc, 0), P(a + d - inc, 0), P(a + d + inc, 1), P(a - d + inc, 1)]);
          const luz = 0.5 - Math.cos(a) * 0.3 + Math.sin(a) * 0.1 + (ra() - 0.5) * 0.15;
          k.fillStyle = 'rgb(' + [200, 168, 112].map((c) => Math.round(c * (0.72 + luz * 0.3))).join(',') + ')';
          k.fill(tira);
          k.strokeStyle = 'rgba(46,26,8,.6)';
          k.lineWidth = 0.9;
          k.stroke(tira);
          k.strokeStyle = 'rgba(70,44,14,.4)';
          k.lineWidth = 0.6;
          const m0 = P(a - inc * 0.2, 0.15);
          const m1 = P(a + inc * 0.6, 0.85);
          k.beginPath();
          k.moveTo(m0[0], m0[1]);
          k.lineTo(m1[0], m1[1]);
          k.stroke();
          a += dirA * (2 * d + 0.004);
        }
        a += dirA * (0.06 + ra() * 0.11);
      }
      k.restore();
      k.strokeStyle = '#2e1c08';
      k.lineWidth = 1.8;
      k.stroke(pol(fora, false));
      k.stroke(pol(dent, false));
    };
    borda(Math.PI, Math.PI * 2);

    // os cinco pães de cevada: pães chatos e redondos, de cúpula baixa, com o contorno
    // irregular; a casca rachada nos ombros, os cortes em cruz ou em talhos soltos e a
    // farinha por cima. Um deles foi partido com a mão: o miolo rasgado aparece.
    const elev = 0.58;
    const sE = Math.sin(elev);
    const cE = Math.cos(elev);
    const luzW = [-0.5, -0.42, 0.76];
    const pao = (x, y, R, H, giro, semente, corte, partido = false) => {
      const rr = sorteio(semente);
      const harm = [2, 3, 4, 5, 7].map((n) => ({ n, a: (0.07 / n) * (0.6 + rr() * 0.8) * (n === 2 ? 1.6 : 1), f: rr() * 6.283 }));
      const borda = (phi) => 1 + harm.reduce((s, o) => s + Math.sin(phi * o.n + o.f) * o.a, 0);
      const cg = Math.cos(giro);
      const sg = Math.sin(giro);
      // a altura da cúpula: chata em cima, o ombro redondo
      const alto = (u, v) => {
        const q = Math.hypot(u, v) / borda(Math.atan2(v, u));
        return q >= 1 ? 0 : H * Math.sqrt(1 - q * q * q);
      };
      const proj = (u, v, z = alto(u, v)) => {
        const wx = (u * cg - v * sg) * R;
        const wy = (u * sg + v * cg) * R;
        return [x + wx, y + wy * sE - z * cE];
      };
      // o rasgo (pão partido em dois): 'tras' e 'frente' são as duas metades; cada uma é girada
      // para que a face do miolo fique virada para nós
      const fR = onda(sorteio(semente + 7), 6, 2.2);
      const rR = sorteio(semente + 11);
      const passos = [];
      let vr = 0;
      for (let i = 0; i <= 140; i++) {
        vr = vr * 0.55 + (rR() - 0.5) * (rR() < 0.15 ? 0.09 : 0.03);
        passos.push(vr);
      }
      const rasgo = (u) => -0.02 + fR(u) * 0.07 + passos[Math.max(0, Math.min(140, Math.round((u + 1.4) * 50)))];
      const lasca = passos.map(() => (rR() < 0.3 ? rR() * 4.5 : rR() * 1.2) * (rR() < 0.5 ? 1 : -0.6));
      const fica = (u, v) => !partido || (partido === 'tras' ? v < rasgo(u) : v > rasgo(u));
      // a luz em cada ponto da cúpula
      const luzEm = (u, v) => {
        const e = 0.01;
        const dzu = (alto(u + e, v) - alto(u - e, v)) / (2 * e * R);
        const dzv = (alto(u, v + e) - alto(u, v - e)) / (2 * e * R);
        // a normal no mundo (girada com o pão)
        const nx = -(dzu * cg - dzv * sg);
        const ny = -(dzu * sg + dzv * cg);
        const nl = Math.hypot(nx, ny, 1);
        return Math.max(0, (nx * luzW[0] + ny * luzW[1] + luzW[2]) / nl);
      };
      // a silhueta: o casco em estrela dos pontos da cúpula (e do rasgo, se partido)
      const amostras = [];
      for (let qi = 12; qi <= 24; qi++) {
        for (let fi = 0; fi < 720; fi++) {
          const phi = (fi / 720) * 6.283;
          const q = Math.min(0.999, qi / 24);
          const u = Math.cos(phi) * q * borda(phi);
          const v = Math.sin(phi) * q * borda(phi);
          if (!fica(u, v)) continue;
          amostras.push(proj(u, v));
          if (qi === 24) amostras.push(proj(u, v, 0));
        }
      }
      const face = [];
      const faceBaixo = [];
      if (partido) {
        for (let u = -1.3; u <= 1.3; u += 0.01) {
          const v = rasgo(u);
          if (Math.hypot(u, v) >= borda(Math.atan2(v, u)) * 0.995) continue;
          // o miolo rasgado não é um corte reto: a beirada de cima sobe e desce em lascas
          const z = alto(u, v) * 0.94 - lasca[Math.max(0, Math.min(140, Math.round((u + 1.4) * 50)))];
          face.push(proj(u, v, z));
          faceBaixo.push(proj(u, v, 0));
          amostras.push(proj(u, v, 0));
          amostras.push(proj(u, v, z));
        }
      }
      const c0 = proj(0, partido === 'tras' ? -0.3 : partido ? 0.45 : 0, H * 0.4);
      const raio = new Array(240).fill(0);
      for (const [px, py] of amostras) {
        const a = Math.atan2(py - c0[1], px - c0[0]);
        const b = Math.round(((a + Math.PI) / 6.283) * 240) % 240;
        raio[b] = Math.max(raio[b], Math.hypot(px - c0[0], py - c0[1]));
      }
      for (let b = 0; b < 240; b++) if (!raio[b]) raio[b] = Math.max(raio[(b + 239) % 240], raio[(b + 1) % 240]);
      const sil = pol(raio.map((d, b) => {
        const dd = (raio[(b + 239) % 240] + d * 2 + raio[(b + 1) % 240]) / 4;
        const a = (b / 240) * 6.283 - Math.PI;
        return [c0[0] + Math.cos(a) * dd, c0[1] + Math.sin(a) * dd];
      }));
      sombraNoChao(k, sil, 8, 9, 7, 0.5);
      marcar(k, obj, sil);
      k.fillStyle = '#5a3210';
      k.fill(sil);
      k.save();
      k.clip(sil);
      // o tom da casca em malha, do fundo para a frente; e um mapa da sombra para a hachura
      const mapa = new Map();
      const quads = [];
      const NQ = 18;
      const NF = 72;
      for (let qi = 0; qi < NQ; qi++) {
        for (let fi = 0; fi < NF; fi++) {
          const cant = [[qi, fi], [qi + 1, fi], [qi + 1, fi + 1], [qi, fi + 1]].map(([a, b]) => {
            const phi = (b / NF) * 6.283;
            const q = Math.min(0.999, a / NQ);
            return [Math.cos(phi) * q * borda(phi), Math.sin(phi) * q * borda(phi)];
          });
          const um = (cant[0][0] + cant[2][0]) / 2;
          const vm = (cant[0][1] + cant[2][1]) / 2;
          if (!fica(um, vm)) continue;
          const zm = alto(um, vm);
          quads.push({ cant, um, vm, prof: (um * sg + vm * cg) * R * cE + zm * sE });
        }
      }
      quads.sort((a, b) => a.prof - b.prof);
      for (const qd of quads) {
        const l = luzEm(qd.um, qd.vm);
        const t = Math.min(1, 0.12 + l * 0.85);
        const cor = [[104, 66, 30], [160, 112, 62], [202, 160, 108]];
        const m = t < 0.5 ? 0 : 1;
        const f = t < 0.5 ? t * 2 : (t - 0.5) * 2;
        const c = cor[m].map((v, i) => Math.round(v + (cor[m + 1][i] - v) * f));
        const p = pol(qd.cant.map(([u, v]) => proj(u, v)));
        k.fillStyle = 'rgb(' + c.join(',') + ')';
        k.strokeStyle = k.fillStyle;
        k.lineWidth = 0.8;
        k.fill(p);
        k.stroke(p);
        // o mapa guarda, por célula de 4 px, a sombra do pedaço mais da frente que a cobre
        const sv = 1 - l * 1.2;
        const pc = qd.cant.map(([u, v]) => proj(u, v));
        const xs = pc.map((p) => p[0]);
        const ys = pc.map((p) => p[1]);
        for (let gx = Math.floor(Math.min(...xs) / 4) - 1; gx <= Math.floor(Math.max(...xs) / 4) + 1; gx++) {
          for (let gy = Math.floor(Math.min(...ys) / 4) - 1; gy <= Math.floor(Math.max(...ys) / 4) + 1; gy++) mapa.set(gx + ',' + gy, sv);
        }
      }
      const somb = (px, py) => mapa.get(Math.floor(px / 4) + ',' + Math.floor(py / 4)) ?? 0.6;
      gravar(k, sil, c0[0], c0[1], R * 1.3, giro + 0.62, 2.8, 1.6, somb, '#2a1404', 0.25);
      gravar(k, sil, c0[0], c0[1], R * 1.3, giro - 0.7, 3.6, 1.3, (px, py) => (somb(px, py) - 0.45) * 1.6, '#2a1404', 0.2);
      // um traço na superfície da cúpula (u, v) com a beirada de luz de um lado
      const sobre = (pts) => pts.map(([u, v]) => proj(u, v));
      const talho = (a, b, curva, larg) => {
        const meio = [(a[0] + b[0]) / 2 + curva * (b[1] - a[1]), (a[1] + b[1]) / 2 - curva * (b[0] - a[0])];
        const fino = curvaPor([a, meio, b], 0.02);
        const L = fino.length - 1;
        const esq = [];
        const dir = [];
        const lab = [];
        fino.forEach((o, i) => {
          const w = Math.sin((i / L) * Math.PI) ** 0.7 * larg * (0.85 + rr() * 0.3);
          esq.push([o.x - o.ty * w, o.y + o.tx * w]);
          dir.push([o.x + o.ty * w, o.y - o.tx * w]);
          lab.push([o.x - o.ty * (w + 0.035), o.y + o.tx * (w + 0.035)]);
        });
        if (!esq.every(([u, v]) => fica(u, v) && Math.hypot(u, v) < 0.92)) return;
        // a massa aberta no corte (mais clara) e a boca escura
        k.fillStyle = '#d9b47a';
        k.fill(pol(sobre([...esq, ...dir.slice().reverse()])));
        k.strokeStyle = '#2a1404';
        k.lineWidth = 1.6;
        k.stroke(pol(sobre(dir), false));
        k.fillStyle = 'rgba(42,20,4,.8)';
        const fundoT = fino.map((o, i) => [o.x + o.ty * Math.sin((i / L) * Math.PI) * larg * 0.3, o.y - o.tx * Math.sin((i / L) * Math.PI) * larg * 0.3]);
        k.fill(pol(sobre([...dir, ...fundoT.slice().reverse()])));
        // a orelha levantada do corte: luz
        k.strokeStyle = 'rgba(250,224,170,.85)';
        k.lineWidth = 1.6;
        k.stroke(pol(sobre(lab), false));
        k.strokeStyle = 'rgba(42,20,4,.7)';
        k.lineWidth = 1;
        k.stroke(pol(sobre(esq), false));
      };
      if (corte === 'cruz') {
        const a = rr() * 0.6;
        const d1 = [Math.cos(a), Math.sin(a)];
        const d2 = [Math.cos(a + 1.5 + rr() * 0.3), Math.sin(a + 1.5 + rr() * 0.3)];
        const l1 = 0.58 + rr() * 0.1;
        const l2 = 0.5 + rr() * 0.1;
        talho([-d1[0] * l1, -d1[1] * l1], [d1[0] * l1 * 0.9, d1[1] * l1 * 0.9], 0.06, 0.07);
        talho([-d2[0] * l2 * 0.9, -d2[1] * l2 * 0.9], [d2[0] * l2, d2[1] * l2], -0.05, 0.06);
      } else {
        // talhos soltos: de tamanhos, curvas e direções diferentes, não paralelos
        for (const [u0, v0, ang, l, cv] of corte) {
          talho([u0 - Math.cos(ang) * l, v0 - Math.sin(ang) * l], [u0 + Math.cos(ang) * l, v0 + Math.sin(ang) * l], cv, 0.06);
        }
      }
      // a textura da casca: golpes curtos e pontos, fosca e áspera
      for (let n = 0; n < R * 9; n++) {
        const a = rr() * 6.283;
        const d = Math.sqrt(rr()) * 0.95;
        const u = Math.cos(a) * d * borda(a);
        const v = Math.sin(a) * d * borda(a);
        if (!fica(u, v)) continue;
        const [px, py] = proj(u, v);
        const g = rr() * 3.14;
        const l = 1 + rr() * 2.5;
        k.strokeStyle = rr() < 0.7 ? 'rgba(48,24,6,.32)' : 'rgba(236,206,156,.3)';
        k.lineWidth = 0.9;
        k.beginPath();
        k.moveTo(px, py);
        k.lineTo(px + Math.cos(g) * l, py + Math.sin(g) * l);
        k.stroke();
      }
      // a casca rachada nos ombros: duas a quatro fendas que seguem a volta do pão; cada uma é
      // uma fenda escura que afina nas pontas, com a beirada de cima acesa
      const nR = 2 + Math.floor(rr() * 3);
      for (let n = 0; n < nR; n++) {
        // só no ombro de trás e nos lados: na frente, uma fenda em arco leria como boca
        const setor = [[-2.6, -0.6], [-0.55, 0.15], [2.95, 3.55]][Math.floor(rr() * 3)];
        const phi = setor[0] + rr() * (setor[1] - setor[0]);
        const q0 = 0.72 + rr() * 0.12;
        const comp = 0.4 + rr() * 0.35;
        const meio = [];
        for (let s0 = 0; s0 <= 10; s0++) {
          const ph = phi + (s0 / 10) * comp;
          const q = (q0 + Math.sin(s0 * 0.9 + n) * 0.008) * borda(ph);
          meio.push([ph, q]);
        }
        const pts = meio.map(([ph, q]) => [Math.cos(ph) * q, Math.sin(ph) * q]);
        if (!pts.every(([u, v]) => fica(u, v))) continue;
        const fora = meio.map(([ph, q], i) => { const w = Math.sin((i / 10) * Math.PI) * 0.035; return [Math.cos(ph) * (q + w), Math.sin(ph) * (q + w)]; });
        const dentro = meio.map(([ph, q], i) => { const w = Math.sin((i / 10) * Math.PI) * 0.025; return [Math.cos(ph) * (q - w), Math.sin(ph) * (q - w)]; });
        const fenda = pol(sobre([...fora, ...dentro.slice().reverse()]));
        k.fillStyle = 'rgba(40,18,2,.9)';
        k.fill(fenda);
        // a beirada acesa: do lado que olha para cima na imagem
        const sf = sobre(fora);
        const sd = sobre(dentro);
        const lab = sf[5][1] < sd[5][1] ? sf : sd;
        k.strokeStyle = 'rgba(232,200,146,.85)';
        k.lineWidth = 1.5;
        k.stroke(pol(lab.map(([px, py]) => [px, py - 1.2]), false));
      }
      // a farinha: manchas secas de pó miúdo (pontos soltos, sem brilho), mais no alto
      for (let n = 0; n < 4; n++) {
        const u0 = (rr() - 0.5) * 0.9;
        const v0 = (rr() - 0.65) * 0.8;
        const ru = 0.12 + rr() * 0.14;
        const rv = 0.08 + rr() * 0.08;
        for (let m = 0; m < 70; m++) {
          const a = rr() * 6.283;
          const d = Math.sqrt(rr());
          const u = u0 + Math.cos(a) * ru * d;
          const v = v0 + Math.sin(a) * rv * d;
          if (!fica(u, v) || Math.hypot(u, v) > 0.9) continue;
          const [px, py] = proj(u, v);
          k.fillStyle = 'rgba(232,222,196,' + (0.35 + rr() * 0.35).toFixed(2) + ')';
          const sz = 0.8 + rr() * 1.4;
          k.fillRect(px, py, sz, sz);
        }
      }
      k.restore();
      k.strokeStyle = '#2a1404';
      k.lineWidth = 2;
      k.stroke(sil);
      if (partido) {
        // a face do miolo, rasgada: clara, porosa, com lascas; a casca é uma tira fina em cima
        const miolo = pol([...face, ...faceBaixo.slice().reverse()]);
        k.fillStyle = '#ead4a4';
        k.fill(miolo);
        k.save();
        k.clip(miolo);
        const yTopo = Math.min(...face.map((p) => p[1]));
        const yBase = Math.max(...faceBaixo.map((p) => p[1]));
        const x0 = Math.min(...face.map((p) => p[0]));
        const x1 = Math.max(...face.map((p) => p[0]));
        // a sombra do miolo: mais funda embaixo e à direita
        gravar(k, miolo, (x0 + x1) / 2, (yTopo + yBase) / 2, (x1 - x0) * 0.6, 0.5, 3.4, 1.2, (px, py) => (py - yTopo) / (yBase - yTopo) * 0.7 + (px - x0) / (x1 - x0) * 0.4 - 0.2, '#5a3a14', 0);
        // os buracos do miolo: irregulares, de tamanhos variados, com a beirada de luz em cima
        for (let n = 0; n < 150; n++) {
          const px = x0 + rr() * (x1 - x0);
          const py = yTopo + rr() * (yBase - yTopo);
          const s = 0.8 + rr() * rr() * 4.2;
          const g = rr() * 3;
          k.fillStyle = 'rgba(110,70,28,.75)';
          k.beginPath();
          k.ellipse(px, py, s * 1.3, s * 0.8, g, 0, 6.283);
          k.fill();
          k.fillStyle = 'rgba(255,246,222,.7)';
          k.beginPath();
          k.ellipse(px - 0.6, py - s * 0.9, s * 1.1, s * 0.35, g, 0, 6.283);
          k.fill();
        }
        k.restore();
        // a beirada rasgada: a casca em cima, puxada em lascas, e fiapos de miolo
        k.strokeStyle = '#3a1c06';
        k.lineWidth = 3.2;
        k.lineJoin = 'round';
        k.stroke(pol(face, false));
        k.strokeStyle = 'rgba(248,226,180,.85)';
        k.lineWidth = 1;
        k.stroke(pol(face.map(([px, py]) => [px, py + 3]), false));
        // fiapos de miolo puxados, soltos e desencontrados
        for (let i = 3; i < face.length - 3; i += 4 + Math.floor(rr() * 9)) {
          const [px, py] = face[i];
          k.strokeStyle = 'rgba(90,56,20,.7)';
          k.lineWidth = 0.9;
          k.beginPath();
          k.moveTo(px, py + 3);
          k.quadraticCurveTo(px + (rr() - 0.5) * 8, py + 6, px + (rr() - 0.5) * 9, py + 6 + rr() * 9);
          k.stroke();
        }
        k.strokeStyle = '#2a1404';
        k.lineWidth = 1.8;
        k.stroke(pol(faceBaixo, false));
        k.stroke(pol([face[0], faceBaixo[0]], false));
        k.stroke(pol([face[face.length - 1], faceBaixo[faceBaixo.length - 1]], false));
      }
    };
    // os três de trás, encostados na borda; os dois da frente por cima
    // cinco pães inteiros (Jo 6.9: o lanche ainda não foi repartido), afastados um do outro
    pao(262, 480, 80, 17, 0.18, 8331, [[-0.15, -0.2, -0.5, 0.42, 0.08], [0.22, 0.18, 0.45, 0.32, -0.06]]);
    pao(446, 470, 84, 18, -0.1, 8332, 'cruz');
    pao(630, 484, 80, 16, 0.12, 8337, [[-0.2, -0.25, 0.35, 0.4, 0.07], [0.3, 0.05, 1.15, 0.3, -0.06]]);
    pao(330, 622, 94, 18, -0.08, 8334, [[-0.3, -0.3, 0.3, 0.32, 0.06], [0.2, 0.0, -0.9, 0.3, -0.07], [0.15, 0.42, 0.15, 0.2, 0.05]]);
    pao(582, 616, 96, 18, 0.1, 8335, [[-0.1, -0.15, 0.7, 0.45, -0.1], [0.28, 0.25, -0.35, 0.28, 0.07]]);

    // os dois peixinhos, secos e salgados, diferentes: um comprido e fino (de lombo cinza-pardo,
    // salgado), outro mais curto e alto, mais escuro e torto do sol; deitados, com a sombra
    // de contato, um por cima de um pão
    const peixe = (x, y, L, ang, lado, D, curva, semente, cores) => {
      const rp = sorteio(semente);
      k.save();
      k.translate(x, y);
      k.rotate(ang);
      k.scale(lado, 1);
      const A = D * L;
      const yc = (t) => curva * L * ((t - 0.45) ** 2 - 0.2);
      const perfil = [[0, 0], [0.03, 0.42], [0.1, 0.78], [0.25, 1], [0.45, 0.94], [0.62, 0.66], [0.74, 0.4], [0.8, 0.26]];
      const meia = (t) => {
        for (let i = 1; i < perfil.length; i++) {
          if (perfil[i][0] >= t) { const [t0, h0] = perfil[i - 1]; const [t1, h1] = perfil[i]; const f = (t - t0) / (t1 - t0); return (h0 + (h1 - h0) * (0.5 - Math.cos(f * Math.PI) / 2)) * A; }
        }
        return perfil[perfil.length - 1][1] * A;
      };
      const X = (t) => (t - 0.5) * L;
      const cima = [];
      const baixo = [];
      for (let t = 0; t <= 0.8001; t += 0.02) {
        cima.push([X(t), yc(t) - meia(t) * 1.05]);
        baixo.push([X(t), yc(t) + meia(t) * 0.95]);
      }
      const yT = yc(0.8);
      const rabo = [[X(1.0), yT - A * 0.85], [X(0.93), yT + A * 0.02], [X(1.0), yT + A * 0.8]];
      const corpo = pol([...cima, ...rabo, ...baixo.slice().reverse()]);
      // as barbatanas do dorso e do ventre: a base fica por baixo do corpo
      const barb = (t0, t1, alto, emCima) => {
        const base = [];
        const ponta = [];
        for (let t = t0; t <= t1 + 1e-6; t += (t1 - t0) / 8) {
          const f = (t - t0) / (t1 - t0);
          const yb = emCima ? yc(t) - meia(t) * 1.05 : yc(t) + meia(t) * 0.95;
          const h = A * alto * Math.sin(Math.min(1, f * 1.15) * Math.PI * 0.85 + 0.15);
          base.push([X(t), yb + (emCima ? A * 0.2 : -A * 0.2)]);
          ponta.push([X(t) + L * 0.02 * f, yb + (emCima ? -h : h)]);
        }
        return { forma: pol([...base, ...ponta.slice().reverse()]), base, ponta };
      };
      const fins = [barb(0.36, 0.58, 0.5, true), barb(0.6, 0.74, 0.32, false)];
      const tudo = new Path2D();
      tudo.addPath(corpo);
      for (const f of fins) tudo.addPath(f.forma);
      // a sombra no que está embaixo: larga e mole, e a de contato, curta e escura
      sombraNoChao(k, tudo, 4 * lado, 8, 6, 0.5);
      sombraNoChao(k, corpo, 1 * lado, 3, 2, 0.55);
      if (obj) marcar(k, obj, tudo);
      for (const f of fins) {
        k.fillStyle = cores[1];
        k.fill(f.forma);
        k.strokeStyle = 'rgba(30,20,8,.8)';
        k.lineWidth = 0.8;
        f.base.forEach((b, i) => { if (i % 2) return; k.beginPath(); k.moveTo(b[0], b[1]); k.lineTo(f.ponta[i][0], f.ponta[i][1]); k.stroke(); });
        k.lineWidth = 1.2;
        k.stroke(f.forma);
      }
      // o corpo: o lombo escuro, o ventre claro
      const g = k.createLinearGradient(0, -A, 0, A);
      g.addColorStop(0, cores[0]);
      g.addColorStop(0.45, cores[1]);
      g.addColorStop(1, cores[2]);
      k.fillStyle = g;
      k.fill(corpo);
      k.save();
      k.clip(corpo);
      // a hachura ao comprido no lombo (o volume) e as escamas gravadas, mais fortes no alto
      for (let row = -6; row <= 6; row++) {
        for (let t = 0.17; t < 0.78; t += 0.028) {
          const sy = yc(t) + (row / 6) * meia(t);
          const sx = X(t + (row % 2 ? 0.014 : 0));
          const al = 0.2 + Math.max(0, -row) * 0.07;
          k.strokeStyle = 'rgba(30,20,8,' + al.toFixed(2) + ')';
          k.lineWidth = 0.9;
          k.beginPath();
          k.arc(sx, sy, L * 0.016, -1.15, 1.15);
          k.stroke();
        }
      }
      for (let row = 0; row < 5; row++) {
        k.strokeStyle = 'rgba(30,20,8,' + (0.55 - row * 0.08).toFixed(2) + ')';
        k.lineWidth = 1.1 - row * 0.12;
        k.beginPath();
        for (let t = 0.05; t <= 0.8; t += 0.02) {
          const yy = yc(t) - meia(t) * (0.95 - row * 0.12);
          if (t > 0.05) k.lineTo(X(t), yy);
          else k.moveTo(X(t), yy);
        }
        k.stroke();
      }
      // a linha do flanco
      k.strokeStyle = 'rgba(30,20,8,.75)';
      k.lineWidth = 1.2;
      k.beginPath();
      for (let t = 0.2; t <= 0.8; t += 0.02) { const yy = yc(t) - meia(t) * 0.12; if (t > 0.2) k.lineTo(X(t), yy); else k.moveTo(X(t), yy); }
      k.stroke();
      // a cabeça gravada: a hachura da bochecha, mais escura debaixo do olho e para trás
      const cab = pol([...cima.filter((p, i) => i <= 10), ...baixo.filter((p, i) => i <= 10).reverse()]);
      gravar(k, cab, X(0.1), yc(0.1), A * 2.2, 1.35, 2.4, 1.1, (qx, qy) => 0.25 + (qy - yc(0.1)) / A * 0.45 + (qx - X(0)) / (L * 0.2) * 0.25, '#1e160a', 0);
      // o opérculo: duas curvas de contorno
      k.strokeStyle = 'rgba(30,20,8,.65)';
      k.lineWidth = 0.9;
      k.beginPath();
      k.arc(X(0.06), yc(0.17), meia(0.17) * 0.8, -0.95, 0.95);
      k.stroke();
      k.beginPath();
      k.arc(X(0.1), yc(0.16), meia(0.16) * 0.55, -0.6, 1.1);
      k.stroke();
      // o rabo: os raios saindo da raiz, mais escura
      const raiz = [X(0.8), yT];
      const gr = k.createRadialGradient(raiz[0], raiz[1], 2, raiz[0], raiz[1], A * 1.4);
      gr.addColorStop(0, 'rgba(30,20,8,.55)');
      gr.addColorStop(1, 'rgba(30,20,8,0)');
      k.fillStyle = gr;
      k.fillRect(raiz[0] - 2, raiz[1] - A * 1.5, L * 0.25, A * 3);
      k.strokeStyle = 'rgba(30,20,8,.6)';
      k.lineWidth = 0.8;
      for (let i = 0; i <= 10; i++) {
        const f = i / 10;
        const pa = f < 0.5 ? rabo[0] : rabo[2];
        const ff = f < 0.5 ? 1 - f * 2 : (f - 0.5) * 2;
        const qx = rabo[1][0] + (pa[0] - rabo[1][0]) * ff;
        const qy = rabo[1][1] + (pa[1] - rabo[1][1]) * ff;
        k.beginPath();
        k.moveTo(raiz[0] + 3, raiz[1] + (qy - raiz[1]) * 0.15);
        k.lineTo(qx - 2, qy);
        k.stroke();
      }
      // o sal: grãos claros soltos
      for (let n = 0; n < L * 0.25; n++) {
        const t = 0.1 + rp() * 0.65;
        const yy = yc(t) + (rp() - 0.5) * 1.6 * meia(t);
        k.fillStyle = 'rgba(246,240,224,' + (0.4 + rp() * 0.4).toFixed(2) + ')';
        k.fillRect(X(t), yy, 1.3, 1.3);
      }
      k.restore();
      k.strokeStyle = '#241a0c';
      k.lineWidth = 1.8;
      k.lineJoin = 'round';
      k.stroke(corpo);
      // a guelra, a barbatana do peito, a boca e o olho (um ponto escuro)
      k.lineWidth = 1.3;
      k.beginPath();
      k.arc(X(0.02), yc(0.18), meia(0.18) * 0.95, -1.05, 1.05);
      k.stroke();
      // a barbatana do peito: um leque pequeno de raios, colado atrás da guelra
      const p0 = [X(0.19), yc(0.19) + meia(0.19) * 0.25];
      const raios = [0.05, 0.22, 0.4, 0.56].map((f) => [X(0.19 + 0.11 - f * 0.02), yc(0.3) + meia(0.3) * (0.05 + f)]);
      const pe = pol([p0, ...raios]);
      k.fillStyle = cores[1];
      k.globalAlpha = 0.85;
      k.fill(pe);
      k.globalAlpha = 1;
      k.lineWidth = 0.8;
      for (const q of raios) { k.beginPath(); k.moveTo(p0[0], p0[1]); k.lineTo(q[0], q[1]); k.stroke(); }
      k.lineWidth = 1;
      k.stroke(pol([raios[0], ...raios.slice(1)], false));
      // a boca: uma fenda curta e oblíqua, que segue a queixada para trás e para baixo
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(X(0.003), yc(0.003) + 0.5);
      k.quadraticCurveTo(X(0.03), yc(0.03) + meia(0.03) * 0.15, X(0.055), yc(0.055) + meia(0.055) * 0.42);
      k.stroke();
      k.lineWidth = 0.8;
      k.beginPath();
      k.moveTo(X(0.02), yc(0.02) + meia(0.02) * 0.6);
      k.quadraticCurveTo(X(0.045), yc(0.045) + meia(0.045) * 0.62, X(0.06), yc(0.06) + meia(0.06) * 0.45);
      k.stroke();
      // o olho: a órbita, a íris baça e a pupila, com um ponto de luz pequeno
      const ex = X(0.085);
      const ey = yc(0.085) - meia(0.085) * 0.28;
      const er = Math.max(3.2, L * 0.02);
      k.fillStyle = '#c8bc98';
      k.beginPath();
      k.arc(ex, ey, er, 0, 6.283);
      k.fill();
      k.lineWidth = 1;
      k.stroke();
      k.fillStyle = '#140e06';
      k.beginPath();
      k.arc(ex + er * 0.1, ey + er * 0.05, er * 0.58, 0, 6.283);
      k.fill();
      k.fillStyle = 'rgba(255,250,236,.75)';
      k.beginPath();
      k.arc(ex - er * 0.15, ey - er * 0.2, er * 0.18, 0, 6.283);
      k.fill();
      k.restore();
    };
    // a metade da frente da borda passa por cima do pé dos pães da frente
    borda(0, Math.PI);
    peixe(452, 468, 240, -0.14, 1, 0.1, 0.03, 8351, ['#5c4c32', '#a8946e', '#dccfae']);
    peixe(604, 596, 192, 0.3, -1, 0.165, -0.09, 8352, ['#4a3016', '#94703f', '#d2b484']);
    vinheta(k, W, H, 0.22);
  }
  // ---------- fim dos Objetos ----------

  // ---------- Milagres: as pranchas ----------
  // Cada milagre é contado pelo efeito que ficou à vista e pelas coisas da história, nunca por
  // uma figura: gravura em tinta sépia sobre papel com fibra, como as outras pranchas. Cada
  // prancha tem a sua luz, a sua água e o seu fogo, sem repetir os dos outros álbuns.

  // ---------- (2) O maná (Êx 16.14-16, 16.31) ----------
  // De manhã cedo, quando o orvalho já subiu: o chão do deserto coberto de flocos brancos e
  // miúdos, como semente de coentro, mais graúdos perto e virando um véu claro longe; ao
  // fundo, rente ao horizonte, as tendas baixas do acampamento. Na frente, a tigela de madeira
  // (16.16, "uma tigela por pessoa") já cheia, com uns grãos caídos em volta.
  function desenhoMana(k, W, H, obj) {
    const r = sorteio(9201);
    papelVelho(k, W, H, r, ['#fbf3df', '#efe0bd', '#d2bc8e'], [W * 0.62, 250]);
    const hz = 272;
    // o céu de antes do sol: linhas ralas que somem perto do horizonte, à direita
    linhas(k, 0, 0, W, hz, 5, 1.5, (x, y) => 0.1 + Math.pow(1 - y / hz, 1.2) * 0.62 + Math.min(1, Math.abs(x - W * 0.62) / 900) * 0.2);
    // uma faixa de névoa baixa (o orvalho que subiu), clara e sem contorno
    k.save();
    k.filter = 'blur(10px)';
    k.fillStyle = 'rgba(255,250,236,.55)';
    k.fillRect(-20, hz - 22, W + 40, 30);
    k.restore();
    // a serra baixa, longe
    const fS = onda(sorteio(9210), 4, 0.009);
    const serra = pol([[-10, hz + 2], ...Array.from({ length: 46 }, (_, i) => [i * 20 - 6, hz - 16 - Math.max(0, fS(i * 20)) * 16 - (i > 26 && i < 40 ? Math.sin((i - 26) / 14 * Math.PI) * 18 : 0)]), [W + 10, hz + 2]]);
    peca(k, serra, [-10, hz - 60, W + 10, hz + 2], { cor: '#e6d6b2', ang: 0.04, passo: 4.4, maxL: 1, sombra: () => 0.32, cruzada: 1, traco: 1.2 });
    // o chão do deserto, em perspectiva, com umas ondulações largas de duna; o tom em linhas
    // de grossura variada, que falham, mais cheias na sombra de cada ondulação
    const chao = new Path2D();
    chao.moveTo(-10, hz);
    for (let x = -10; x <= W + 10; x += 10) chao.lineTo(x, hz + Math.sin(x * 0.01) * 2);
    chao.lineTo(W + 10, H + 10);
    chao.lineTo(-10, H + 10);
    chao.closePath();
    k.fillStyle = '#c4a574';
    k.fill(chao);
    const duna = (x, y) => Math.sin(x * 0.006 + y * 0.018) * 0.5 + Math.sin(x * 0.013 - y * 0.009 + 2) * 0.3;
    k.save();
    k.clip(chao);
    k.strokeStyle = SEPIA;
    k.lineCap = 'round';
    for (let y = hz + 1; y < H; y += 2.6 + (y - hz) * 0.03) {
      let x = -10 - r() * 40;
      const t = (y - hz) / (H - hz);
      while (x < W + 10) {
        const c = 20 + r() * 90 * (0.4 + t);
        const v = 0.3 + duna(x + c / 2, y) * 0.35 + t * 0.2;
        const w = (0.4 + t * 1.6) * Math.max(0, v) * (0.5 + r() * 0.8);
        if (w > 0.25) {
          k.lineWidth = w;
          k.beginPath();
          k.moveTo(x, y + (r() - 0.5));
          k.quadraticCurveTo(x + c / 2, y - 1 + duna(x, y) * 3, x + c, y + (r() - 0.5));
          k.stroke();
        }
        x += c + 6 + r() * 30 * (0.4 + t);
      }
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.3;
    k.beginPath();
    for (let x = -10; x <= W + 10; x += 10) { const y = hz + Math.sin(x * 0.01) * 2; if (x === -10) k.moveTo(x, y); else k.lineTo(x, y); }
    k.stroke();
    // o acampamento, longe, rente ao horizonte: tendas de pelo de cabra compridas e baixas, de
    // teto quase reto que cede entre as varas, o lado da frente aberto (as varas à vista) e as
    // cordas esticadas até as estacas
    const tenda = (x, y, w, h) => {
      const teto = new Path2D();
      teto.moveTo(x - w / 2, y - h * 0.55);
      for (let i = 1; i <= 4; i++) { const xi = x - w / 2 + (w * i) / 4; teto.quadraticCurveTo(xi - w / 8, y - h * 0.85, xi, y - h * (i % 2 ? 1 : 0.95)); }
      teto.lineTo(x + w / 2 + w * 0.08, y);
      teto.lineTo(x - w / 2 - w * 0.06, y);
      teto.closePath();
      k.fillStyle = '#4a3a2a';
      k.fill(teto);
      // o lado aberto: o escuro de dentro e as varas
      const aberto = pol([[x - w * 0.36, y], [x - w * 0.36, y - h * 0.6], [x + w * 0.3, y - h * 0.62], [x + w * 0.3, y]]);
      k.fillStyle = '#6e5a40';
      k.fill(aberto);
      gravar(k, aberto, x, y - h * 0.3, w * 0.4, 0.05, 2, 0.9, (px, py) => 0.3 + (y - h * 0.6 - py) / (-h * 0.6) * -0.5 + 0.4, '#1a120a', 0);
      k.strokeStyle = '#1a120a';
      k.lineWidth = Math.max(0.8, w * 0.012);
      for (const t of [-0.36, -0.1, 0.12, 0.3]) { k.beginPath(); k.moveTo(x + w * t, y); k.lineTo(x + w * t, y - h * 0.62); k.stroke(); }
      k.strokeStyle = 'rgba(20,14,8,.9)';
      k.lineWidth = Math.max(0.6, w * 0.012);
      k.stroke(teto);
      k.lineWidth = Math.max(0.4, w * 0.006);
      k.beginPath();
      k.moveTo(x - w / 2, y - h * 0.55);
      k.lineTo(x - w / 2 - w * 0.22, y);
      k.moveTo(x + w / 2, y - h * 0.95);
      k.lineTo(x + w / 2 + w * 0.24, y);
      k.stroke();
      marcar(k, obj, teto);
    };
    for (const [x, w] of [[60, 70], [150, 54], [236, 82], [330, 48], [640, 60], [728, 86], [826, 58]]) tenda(x, hz + 1 + (r() - 0.5) * 2, w, w * 0.26);
    // o maná no chão: flocos finos e miúdos como escamas de geada (16.14), sem contorno:
    // cada um uma lasquinha torta e clara com uma sombrinha de um lado; graúdos e soltos perto,
    // cada vez menores e mais juntos longe, até virar um pontilhado
    const floco = (x, y, s) => {
      const n = 5;
      const pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.283 + r() * 0.8; const f = 0.5 + r() * 0.7; return [x + Math.cos(a) * s * f, y + Math.sin(a) * s * f * 0.55]; });
      if (s > 1.6) {
        k.fillStyle = 'rgba(80,58,26,.35)';
        k.beginPath();
        pts.forEach(([px, py], i) => (i ? k.lineTo(px + s * 0.35, py + s * 0.3) : k.moveTo(px + s * 0.35, py + s * 0.3)));
        k.closePath();
        k.fill();
      }
      k.fillStyle = s > 1.6 ? '#fbf8ee' : 'rgba(252,248,236,.85)';
      k.beginPath();
      pts.forEach(([px, py], i) => (i ? k.lineTo(px, py) : k.moveTo(px, py)));
      k.closePath();
      k.fill();
    };
    const pontos = [];
    for (let i = 0; i < 17000; i++) {
      const t = Math.pow(r(), 1.25);
      const y = hz + 4 + t * (H - hz);
      const x = r() * W;
      pontos.push([x, y, 0.7 + Math.pow(t, 1.2) * 4.4 * (0.6 + r() * 0.8)]);
    }
    // longe, a geada vira um véu claro e liso por cima do chão
    k.save();
    k.clip(chao);
    const veu = k.createLinearGradient(0, hz, 0, hz + 180);
    veu.addColorStop(0, 'rgba(250,246,232,.7)');
    veu.addColorStop(1, 'rgba(250,246,232,0)');
    k.fillStyle = veu;
    k.fillRect(0, hz, W, 180);
    k.restore();
    pontos.sort((a, b) => a[1] - b[1]);
    for (const [x, y, s] of pontos) floco(x, y, s);
    // a tigela de madeira, cheia, em três quartos, com os grãos que caíram em volta
    const tx = 540;
    const ty = 600;
    const rx = 178;
    const ry = 54;
    const fundoT = 108;
    const corpo = new Path2D();
    corpo.moveTo(tx - rx, ty);
    corpo.bezierCurveTo(tx - rx, ty + fundoT * 0.75, tx - rx * 0.5, ty + fundoT, tx, ty + fundoT);
    corpo.bezierCurveTo(tx + rx * 0.5, ty + fundoT, tx + rx, ty + fundoT * 0.75, tx + rx, ty);
    corpo.ellipse(tx, ty, rx, ry, 0, 0, Math.PI);
    corpo.closePath();
    const sombraT = new Path2D();
    sombraT.ellipse(tx + 36, ty + fundoT - 4, rx * 1.05, 26, 0, 0, 6.283);
    sombraNoChao(k, sombraT, 0, 0, 10, 0.4);
    peca(k, corpo, [tx - rx, ty - ry, tx + rx, ty + fundoT], { cor: '#a8774a', tinta: '#2a1608', ang: 1.45, passo: 3.6, maxL: 2, sombra: (x, y) => 0.25 + (x - tx + rx) / (2 * rx) * 0.6 + (y - ty) / 300, cruzada: 0.7, traco: 2.4, obj });
    // os veios da madeira, curvos, seguindo a barriga da tigela
    k.save();
    k.clip(corpo);
    k.strokeStyle = 'rgba(52,26,8,.55)';
    k.lineWidth = 1.1;
    for (let i = 0; i < 9; i++) {
      const v = 0.12 + i * 0.1;
      k.beginPath();
      for (let a = 0; a <= Math.PI + 0.01; a += 0.05) {
        const x = tx - Math.cos(a) * rx * (1 - v * 0.08);
        const y = ty + Math.sin(a) * (ry * 0.2 + fundoT * v) + Math.sin(a * 6 + i) * 2;
        if (a === 0) k.moveTo(x, y); else k.lineTo(x, y);
      }
      k.stroke();
    }
    k.restore();
    // a borda: o aro de madeira, claro em cima
    const boca = new Path2D();
    boca.ellipse(tx, ty, rx, ry, 0, 0, 6.283);
    k.fillStyle = '#c99868';
    k.fill(boca);
    const dentro = new Path2D();
    dentro.ellipse(tx, ty + 2, rx - 11, ry - 6, 0, 0, 6.283);
    k.fillStyle = '#7a4e2a';
    k.fill(dentro);
    k.strokeStyle = '#2a1608';
    k.lineWidth = 2.2;
    k.stroke(boca);
    k.lineWidth = 1.4;
    k.stroke(dentro);
    marcar(k, obj, boca);
    // o monte de maná dentro da tigela: um morrinho de grãos brancos, mais alto no meio
    const monte = new Path2D();
    monte.moveTo(tx - rx + 14, ty + 4);
    monte.bezierCurveTo(tx - rx * 0.6, ty - 30, tx - rx * 0.25, ty - 52, tx + 4, ty - 50);
    monte.bezierCurveTo(tx + rx * 0.35, ty - 48, tx + rx * 0.7, ty - 24, tx + rx - 14, ty + 4);
    monte.ellipse(tx, ty + 2, rx - 14, ry - 8, 0, 0, Math.PI);
    monte.closePath();
    k.fillStyle = '#efe7d2';
    k.fill(monte);
    marcar(k, obj, monte);
    k.save();
    k.clip(monte);
    gravar(k, monte, tx, ty - 20, rx, 0.5, 3.6, 1.2, (x, y) => 0.08 + Math.max(0, (x - tx) / rx) * 0.55 + (y - ty + 50) / 200, '#5a4426', 0.2);
    const graos = [];
    for (let i = 0; i < 520; i++) graos.push([tx + (r() - 0.5) * rx * 2, ty - 56 + r() * 70, 1.6 + r() * 2.4]);
    graos.sort((a, b) => a[1] - b[1]);
    for (const [x, y, s] of graos) floco(x, y, s);
    k.restore();
    k.strokeStyle = 'rgba(70,52,24,.6)';
    k.lineWidth = 1.2;
    k.stroke(monte);
    // a beirada da frente do aro, por cima do monte
    k.save();
    k.beginPath();
    k.ellipse(tx, ty, rx, ry, 0, 0.05, Math.PI - 0.05);
    k.strokeStyle = '#c99868';
    k.lineWidth = 9;
    k.stroke();
    k.strokeStyle = '#2a1608';
    k.lineWidth = 2.2;
    k.beginPath();
    k.ellipse(tx, ty, rx, ry, 0, 0, Math.PI);
    k.stroke();
    k.strokeStyle = 'rgba(255,236,200,.7)';
    k.lineWidth = 1.6;
    k.beginPath();
    k.ellipse(tx, ty - 3, rx - 4, ry - 3, 0, Math.PI * 0.15, Math.PI * 0.6);
    k.stroke();
    k.restore();
    // os grãos que caíram em volta
    for (let i = 0; i < 60; i++) {
      const a = r() * 6.283;
      const d = 1.02 + r() * 0.5;
      floco(tx + Math.cos(a) * rx * d, ty + fundoT * 0.55 + Math.sin(a) * 40 * d, 2.4 + r() * 2.4);
    }
    vinheta(k, W, H, 0.2);
  }

  // ---------- (3) A água da rocha (Êx 17.5-6) ----------
  // No monte Horebe, à tarde: um penhasco de granito redondo e gasto, descascado em lâminas
  // curvas, e da fenda que a vara abriu jorra a água num arco grosso, que cai numa poça de
  // pedra e desce num regato entre as pedras até a frente. Do outro lado, o chão ainda seco e
  // rachado. A vara de pastor ficou deitada numa laje, ao lado do regato. Ninguém desenhado.
  function desenhoAguaRocha(k, W, H, obj) {
    const r = sorteio(9301);
    papelVelho(k, W, H, r, ['#fbefd6', '#eed6ac', '#cfac78'], [860, 40]);
    const hz = 300;
    ceuEmLinhas(k, W, hz, [[720, 120, 220, 22], [180, 70, 160, 14]], { topo: 0.5, base: 0.08 });
    // a serra seca de longe, à direita
    const fS = onda(sorteio(9310), 4, 0.01);
    const serra = pol([[400, hz + 4], ...Array.from({ length: 26 }, (_, i) => [400 + i * 20, hz - 26 - Math.max(0, fS(i * 20)) * 20 - i * 0.6]), [W + 10, hz + 4]]);
    peca(k, serra, [400, hz - 80, W + 10, hz + 4], { cor: '#e2c69c', ang: 0.05, passo: 4.4, maxL: 1.1, sombra: () => 0.34, cruzada: 1, traco: 1.3 });
    // o chão: areia e cascalho; à direita, o barro seco e rachado
    const chao = pol([[-10, hz], [W + 10, hz], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#e4cb9e';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, hz, H, 1.8, (x, y) => 0.32 + (y - hz) / 900);
    const seco = pol([[520, 560], [W + 10, 520], [W + 10, H + 10], [600, H + 10], [560, 700]]);
    k.save();
    k.clip(seco);
    k.strokeStyle = 'rgba(60,40,16,.7)';
    k.lineCap = 'round';
    // as rachaduras do barro: placas de cantos tortos
    const cx0 = 520;
    for (let y = 540; y < H + 20; y += 34 + (y - 540) * 0.08) {
      let x = cx0 + (r() - 0.5) * 30;
      const alt = 34 + (y - 540) * 0.08;
      while (x < W + 20) {
        const w = 40 + (y - 500) * 0.18 + r() * 30;
        k.lineWidth = 1 + (y - 520) / 300;
        k.beginPath();
        k.moveTo(x, y + (r() - 0.5) * 6);
        k.lineTo(x + w * 0.5, y + (r() - 0.5) * 8);
        k.lineTo(x + w, y + (r() - 0.5) * 6);
        k.moveTo(x + w * (0.4 + r() * 0.3), y + (r() - 0.5) * 6);
        k.lineTo(x + w * (0.4 + r() * 0.3) + (r() - 0.5) * 10, y + alt);
        k.stroke();
        x += w;
      }
    }
    k.restore();
    // o penhasco: um paredão de granito gasto que sai da beirada esquerda, de alto torto e
    // ombros arredondados, partido por fraturas compridas; a luz vem da direita e do alto, e o
    // grão da pedra em pintinhas
    const contorno = [[-30, 120], [30, 96], [96, 106], [150, 72], [226, 82], [292, 124], [356, 146], [414, 172], [470, 214], [512, 254], [536, 298], [548, 346], [582, 378], [598, 436], [588, 512], [610, 590], [604, 652], [-30, 668]];
    const rocha = contornoRocha(r, contorno, 12);
    rocha.closePath();
    sombraNoChao(k, rocha, 34, 14, 16, 0.38);
    k.fillStyle = '#ccab84';
    k.fill(rocha);
    marcar(k, obj, rocha);
    const fraturas = [
      [[150, 74], [176, 150], [166, 220], [196, 300], [188, 380], [214, 470], [204, 560], [222, 660]],
      [[356, 148], [340, 210], [362, 270], [346, 330]],
      [[60, 300], [120, 330], [184, 322]],
      [[214, 470], [262, 488], [300, 482]],
    ];
    // a luz: cada bloco entre as fraturas clareia para a direita e escurece embaixo
    const bloco = (x, y) => (x < 190 + (y - 300) * 0.05 ? 0.22 : 0) + (y > 490 + (x - 300) * 0.05 ? 0.18 : 0) + (x > 350 && y < 300 ? -0.12 : 0);
    const luzR = (x, y) => 0.24 + Math.max(0, (420 - x) / 520) * 0.5 + Math.max(0, (y - 420) / 420) * 0.3 + bloco(x, y);
    gravar(k, rocha, 300, 380, 360, 0.42, 4.4, 2.1, luzR, SEPIA, 0.08);
    gravar(k, rocha, 300, 380, 360, -0.9, 5.4, 1.6, (x, y) => (luzR(x, y) - 0.48) * 1.7, SEPIA, 0);
    k.save();
    k.clip(rocha);
    // o grão do granito
    for (let i = 0; i < 1600; i++) {
      const x = r() * 620;
      const y = 70 + r() * 600;
      k.fillStyle = r() < 0.6 ? 'rgba(40,26,10,.45)' : 'rgba(255,246,222,.55)';
      k.fillRect(x, y, 1.2 + r() * 1.6, 1.2 + r() * 1.2);
    }
    // as fraturas: o risco fundo, a sombra de um lado e a beirada clara do outro
    for (const f of fraturas) {
      const c = curvaPor(f, 4);
      k.strokeStyle = 'rgba(22,12,4,.85)';
      k.lineWidth = 3.4;
      k.beginPath();
      c.forEach((q, i) => (i ? k.lineTo(q.x + (r() - 0.5) * 2.4, q.y) : k.moveTo(q.x, q.y)));
      k.stroke();
      k.strokeStyle = 'rgba(30,18,6,.35)';
      k.lineWidth = 7;
      k.beginPath();
      c.forEach((q, i) => (i ? k.lineTo(q.x - 5, q.y + 3) : k.moveTo(q.x - 5, q.y + 3)));
      k.stroke();
      k.strokeStyle = 'rgba(255,242,212,.6)';
      k.lineWidth = 1.4;
      k.beginPath();
      c.forEach((q, i) => (i ? k.lineTo(q.x + 4, q.y - 1) : k.moveTo(q.x + 4, q.y - 1)));
      k.stroke();
    }
    // as lascas soltas do alto: beiradas claras curtas onde a pedra descascou
    for (const [x, y, L] of [[60, 140, 70], [250, 120, 60], [420, 210, 50], [520, 330, 40], [90, 420, 60]]) {
      k.strokeStyle = SEPIA;
      k.lineWidth = 2.2;
      k.beginPath();
      k.moveTo(x, y);
      k.quadraticCurveTo(x + L * 0.5, y - 10, x + L, y + 6);
      k.stroke();
      k.strokeStyle = 'rgba(255,242,212,.6)';
      k.lineWidth = 1.3;
      k.beginPath();
      k.moveTo(x + 4, y - 5);
      k.quadraticCurveTo(x + L * 0.5, y - 14, x + L - 4, y + 1);
      k.stroke();
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 3;
    k.stroke(rocha);
    // as saliências da face: duas prateleiras tortas onde a água quebra. Em cima a beirada
    // clara, embaixo a sombra cavada em hachura cruzada
    const saliencias = [
      { x0: 340, x1: 520, y: 474, inc: -0.08, f: 0.6 },
      { x0: 300, x1: 470, y: 566, inc: 0.06, f: 2.1 },
      { x0: 446, x1: 570, y: 560, inc: -0.1, f: 4.0 },
    ];
    const ySal = (s, x) => s.y + (x - s.x0) * s.inc + Math.sin(x * 0.045 + s.f) * 5 + Math.sin(x * 0.13 + s.f) * 2;
    k.save();
    k.clip(rocha);
    for (const s of saliencias) {
      const topo = [];
      for (let x = s.x0; x <= s.x1; x += 6) topo.push([x, ySal(s, x)]);
      const fim = (x) => Math.min(1, (x - s.x0) / 40, (s.x1 - x) / 40);
      const baixo = topo.slice().reverse().map(([x, y]) => [x, y + 3 + 9 * fim(x) * (0.7 + 0.3 * Math.sin(x * 0.08 + s.f))]);
      const sombra = pol([...topo, ...baixo]);
      gravar(k, sombra, (s.x0 + s.x1) / 2, s.y + 10, (s.x1 - s.x0) / 2 + 20, 0.5, 2.4, 1.6, () => 0.85, '#24160a', 0);
      k.lineCap = 'round';
      k.strokeStyle = 'rgba(255,244,218,.85)';
      k.lineWidth = 2.4;
      k.beginPath();
      topo.forEach(([x, y], i) => (i ? k.lineTo(x, y - 1.5) : k.moveTo(x, y - 1.5)));
      k.stroke();
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.6;
      k.beginPath();
      topo.forEach(([x, y], i) => (i ? k.lineTo(x, y + 1) : k.moveTo(x, y + 1)));
      k.stroke();
    }
    k.restore();
    // os filetes de água: cordas de larguras diferentes que saem da fenda e descem grudadas na
    // face, cada uma pelo seu caminho; na beirada de cada saliência a água se solta um pouco e
    // engrossa, e embaixo cai na poça
    const filetes = [
      { pts: [[426, 398], [433, 452], [443, 520], [455, 590], [467, 640], [476, 684]], w0: 22, w1: 36, fase: 0.4 },
      { pts: [[414, 400], [403, 452], [394, 520], [386, 590], [378, 640], [374, 680]], w0: 9, w1: 15, fase: 2.2 },
      { pts: [[410, 352], [400, 384], [392, 426], [380, 470], [366, 500], [358, 540], [350, 572], [338, 606], [334, 646], [332, 676]], w0: 4, w1: 8, fase: 4.1 },
      { pts: [[460, 570], [486, 592], [500, 628], [508, 682]], w0: 9, w1: 15, fase: 1.3 },
    ];
    const naSaliencia = (y) => saliencias.reduce((m, s) => Math.max(m, Math.max(0, 1 - Math.abs(y - s.y - 8) / 18)), 0);
    filetes.forEach((f) => {
      f.c = curvaPor(f.pts, 3);
      f.L = f.c[f.c.length - 1].s;
      f.w = (s) => {
        const q = f.c[Math.min(f.c.length - 1, Math.round(s / 3))];
        return f.w0 + (f.w1 - f.w0) * (s / f.L) + Math.sin(s * 0.05 + f.fase) * f.w0 * 0.08 + naSaliencia(q.y) * f.w0 * 0.12;
      };
      f.forma = tuboAo(f.c, f.w).forma;
    });
    // a pedra molhada: só faixas estreitas e partidas grudadas nos filetes, cada uma de um
    // lado e de um tamanho, seguindo a queda; entre elas a pedra seca aparece
    k.save();
    k.clip(rocha);
    filetes.forEach((f, fi) => {
      for (const lado of [-1, 1]) {
        let s0 = r() * 30;
        while (s0 < f.L - 10) {
          const comp = 26 + r() * 70;
          const s1 = Math.min(f.L, s0 + comp);
          if (r() < (lado === 1 ? 0.7 : 0.45) - fi * 0.08) {
            const larg = 5 + r() * 9;
            const a = [];
            const b = [];
            for (const q of f.c) {
              if (q.s < s0 || q.s > s1) continue;
              const t = (q.s - s0) / (s1 - s0);
              const w = f.w(q.s) / 2;
              const ex = larg * Math.sin(Math.PI * t);
              a.push([q.x - q.ty * w * lado, q.y + q.tx * w * lado]);
              b.push([q.x - q.ty * (w + ex) * lado, q.y + q.tx * (w + ex) * lado]);
            }
            if (a.length > 2) {
              const m = pol([...a, ...b.reverse()]);
              k.fillStyle = 'rgba(60,40,20,.34)';
              k.fill(m);
              gravar(k, m, a[0][0], (a[0][1] + a[a.length - 1][1]) / 2, comp, 1.5, 2.4, 1.6, () => 0.85, '#2a1a0c', 0);
            }
          }
          s0 = s1 + 10 + r() * 40;
        }
      }
    });
    k.lineCap = 'round';
    filetes.forEach((f) => {
      for (let i = 0; i < 6; i++) {
        const q = f.c[Math.floor(r() * f.c.length)];
        const lado = r() < 0.5 ? -1 : 1;
        const d = f.w(q.s) / 2 + 5 + r() * 8;
        k.strokeStyle = 'rgba(255,248,228,.7)';
        k.lineWidth = 1.2;
        k.beginPath();
        k.moveTo(q.x - q.ty * d * lado, q.y + q.tx * d * lado);
        k.lineTo(q.x - q.ty * d * lado + 1, q.y + q.tx * d * lado + 10 + r() * 14);
        k.stroke();
      }
    });
    k.restore();
    // a fenda: um talho fundo e torto na face, uns 100 de alto, escuro por dentro; a beirada
    // de cima clara e a de baixo, por onde a água transborda, molhada
    // (a beirada quebrada, de cantos vivos e lascas, e uma racha que corre para fora)
    const fenda = pol([[402, 290], [412, 300], [416, 318], [428, 324], [430, 344], [425, 352], [436, 370], [446, 392], [440, 405], [424, 401], [414, 394], [410, 376], [404, 352], [398, 330], [400, 312]]);
    k.fillStyle = '#160e06';
    k.fill(fenda);
    k.save();
    k.clip(fenda);
    gravar(k, fenda, 420, 350, 70, 1.3, 2.4, 1.3, () => 0.6, '#4a3420', 0);
    k.restore();
    k.lineCap = 'round';
    k.strokeStyle = 'rgba(255,244,218,.85)';
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(415, 302);
    k.lineTo(419, 318);
    k.lineTo(431, 324);
    k.lineTo(433, 343);
    k.moveTo(439, 369);
    k.lineTo(449, 390);
    k.stroke();
    // a racha que sai da fenda, para cima e para a direita, e uma lasca solta na beirada
    k.strokeStyle = 'rgba(22,12,4,.85)';
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(400, 292);
    k.lineTo(408, 276);
    k.lineTo(404, 262);
    k.lineTo(414, 244);
    k.moveTo(430, 344);
    k.lineTo(446, 340);
    k.lineTo(458, 348);
    k.stroke();
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.2;
    k.stroke(fenda);
    marcar(k, obj, fenda);
    // a poça ao pé da rocha, em perspectiva: uma bacia oval de pedra, a beirada de lá encostada
    // na rocha e a de cá com pedras; a água com o reflexo da rocha e dos filetes
    const pcx = 432;
    const pcy = 708;
    const prx = 200;
    const pry = 44;
    const pocaPts = Array.from({ length: 20 }, (_, i) => {
      const a = (i / 20) * Math.PI * 2;
      const j = 1 + Math.sin(a * 3 + 1) * 0.05 + Math.sin(a * 7) * 0.025;
      return [pcx + Math.cos(a) * prx * j, pcy + Math.sin(a) * pry * j];
    });
    const poca = contornoRocha(r, [...pocaPts, pocaPts[0]], 4);
    poca.closePath();
    // a margem molhada: um anel de areia escura em volta, em hachura, sem borrão
    const margem = new Path2D();
    margem.ellipse(pcx - 6, pcy + 6, prx + 34, pry + 20, 0, 0, Math.PI * 2);
    gravar(k, margem, pcx, pcy, prx + 40, 0.03, 2.6, 1.4, (x, y) => 0.75 - Math.hypot((x - pcx) / (prx + 34), (y - pcy - 6) / (pry + 20)) * 0.6, '#3a2814', 0);
    // o regato: sai de baixo da beirada de cá, à esquerda, e desce até a frente, alargando;
    // as margens molhadas e sem contorno, a água em riscos que seguem a corrente
    const rio = curvaPor([[322, 742], [300, 764], [262, 784], [236, 808], [214, 836], [200, 860]], 3);
    const larRio = (s) => 26 + s * 0.24 + Math.sin(s * 0.07) * 5 + Math.sin(s * 0.19 + 1) * 3;
    const margRio = tuboAo(rio, (s) => larRio(s) + 30 + Math.sin(s * 0.05 + 2) * 8).forma;
    gravar(k, margRio, 260, 800, 160, 0.03, 2.6, 1.5, () => 0.62, '#3a2814', 0);
    const corpoRio = tuboAo(rio, larRio).forma;
    k.fillStyle = '#9fae9f';
    k.fill(corpoRio);
    marcar(k, obj, corpoRio);
    k.save();
    k.clip(corpoRio);
    k.lineCap = 'round';
    for (let v = -0.9; v <= 0.91; v += 0.15) {
      let ant = null;
      for (const q of rio) {
        const w = larRio(q.s) / 2;
        const pt = [q.x - q.ty * v * w, q.y + q.tx * v * w];
        if (ant && r() > 0.4) {
          k.strokeStyle = v > 0.2 || r() < 0.35 ? 'rgba(250,252,244,.85)' : 'rgba(34,48,42,.6)';
          k.lineWidth = 0.9 + Math.abs(v) * 0.8;
          k.beginPath();
          k.moveTo(ant[0], ant[1]);
          k.lineTo(pt[0], pt[1]);
          k.stroke();
        }
        ant = pt;
      }
    }
    k.restore();
    k.fillStyle = '#8fa096';
    k.fill(poca);
    marcar(k, obj, poca);
    k.save();
    k.clip(poca);
    k.lineCap = 'round';
    // a beirada de lá por dentro: a parede da bacia, de pedra molhada, acesa
    const paredeL = new Path2D();
    paredeL.ellipse(pcx, pcy - 4, prx * 0.98, pry * 0.9, 0, Math.PI, Math.PI * 2);
    paredeL.ellipse(pcx, pcy + 4, prx * 0.94, pry * 0.78, 0, 0, Math.PI, true);
    k.fillStyle = '#6e5a42';
    k.fill(paredeL);
    gravar(k, paredeL, pcx, pcy - 30, prx, 1.45, 3, 1.3, () => 0.7, '#1e1408', 0);
    // a água: hachura deitada, mais escura no fundo (o reflexo da rocha) e clara na frente
    gravar(k, poca, pcx, pcy, prx + 10, 0, 2.8, 1.5, (x, y) => 0.75 - (y - pcy + pry) / (pry * 2) * 0.6, '#24322c', 0);
    // o reflexo da rocha: riscos escuros de pé, partidos, no fundo da poça
    for (let x = pcx - prx + 20; x < 600; x += 4) {
      let y = pcy - pry * 0.55 + r() * 4;
      while (y < pcy + 6) {
        const c = 3 + r() * 9;
        if (r() < 0.45) { k.strokeStyle = 'rgba(44,32,18,.55)'; k.lineWidth = 1.4; k.beginPath(); k.moveTo(x, y); k.lineTo(x, y + c); k.stroke(); }
        y += c + 2 + r() * 4;
      }
    }
    // o reflexo dos filetes: riscos claros de pé, partidos, debaixo de onde cada um cai
    filetes.forEach((f) => {
      const q = f.c[f.c.length - 1];
      for (let i = 0; i < 6; i++) {
        const x = q.x + (r() - 0.5) * f.w1 * 0.8;
        const y = q.y + 6 + i * 6 + r() * 3;
        k.strokeStyle = 'rgba(250,252,244,.8)';
        k.lineWidth = 1.2 + f.w1 / 18;
        k.beginPath();
        k.moveTo(x, y);
        k.lineTo(x + (r() - 0.5) * 3, y + 3 + r() * 3);
        k.stroke();
      }
    });
    // as ondinhas: onde cada filete bate, dois ou três arcos achatados e partidos que se
    // abrem; no resto, riscos deitados e curtos
    filetes.forEach((f) => {
      const q = f.c[f.c.length - 1];
      for (let i = 1; i <= 3; i++) {
        const rx = f.w1 * 0.6 + i * (10 + f.w1 * 0.5);
        const a0 = 0.15 + r() * 0.5;
        k.strokeStyle = i % 2 ? 'rgba(250,252,244,.85)' : 'rgba(24,36,30,.6)';
        k.lineWidth = 1.4 - i * 0.2;
        k.beginPath();
        k.ellipse(q.x, q.y + 4, rx, rx * 0.2, 0, a0, Math.PI - a0 - r() * 0.6);
        k.stroke();
      }
    });
    for (let i = 0; i < 40; i++) {
      const x = pcx - prx * 0.8 + r() * prx * 1.6;
      const y = pcy + 8 + r() * pry * 0.8;
      const c = 8 + r() * 20;
      k.strokeStyle = r() < 0.5 ? 'rgba(250,252,244,.8)' : 'rgba(24,36,30,.55)';
      k.lineWidth = 1;
      k.beginPath();
      k.moveTo(x, y);
      k.quadraticCurveTo(x + c / 2, y - 1.4, x + c, y);
      k.stroke();
    }
    k.restore();
    // a beirada de cá: a linha da pedra, escura, e a luz em cima
    k.lineCap = 'round';
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.ellipse(pcx, pcy + 2, prx, pry, 0, 0.12, Math.PI - 0.12);
    k.stroke();
    // as pedras molhadas da beira; a da frente, à esquerda, cobre a saída do regato
    for (const [x, y, s] of [[318, 744, 22], [352, 750, 14], [596, 744, 18], [636, 712, 20], [234, 714, 16], [196, 812, 13], [270, 834, 12]]) {
      const pp = contornoRocha(r, [[x - s, y + s * 0.3], [x - s * 0.7, y - s * 0.55], [x + s * 0.2, y - s * 0.75], [x + s, y - s * 0.1], [x + s * 0.7, y + s * 0.5]], 2);
      pp.closePath();
      peca(k, pp, [x - s, y - s, x + s, y + s], { cor: '#8d7a62', tinta: '#1e150a', ang: 0.6, passo: 2.6, maxL: 1.5, sombra: sombraOval(x, y, s, s * 0.7, 0), cruzada: 0.72, traco: 1.6, obj });
    }
    // agora os filetes, por cima de tudo, até a água da poça
    filetes.forEach((f) => {
      k.fillStyle = 'rgba(220,232,224,.92)';
      k.fill(f.forma);
      marcar(k, obj, f.forma);
      k.save();
      k.clip(f.forma);
      k.lineCap = 'round';
      const n = Math.max(3, Math.round(f.w1 / 3.2));
      for (let j = 0; j <= n; j++) {
        const v = (j / n) * 2 - 1;
        let ant = null;
        for (const q of f.c) {
          const w = f.w(q.s) / 2;
          const pt = [q.x - q.ty * v * w + Math.sin(q.s * 0.12 + j) * 1.2, q.y + q.tx * v * w];
          if (ant && r() > 0.12) {
            // a corda é redonda: escura do lado de lá da luz (esquerda), clara à direita
            const escuro = v < -0.3 || (j % 3 === 0 && v < 0.4);
            k.strokeStyle = escuro ? 'rgba(40,62,56,' + (0.45 + Math.abs(v) * 0.3).toFixed(2) + ')' : 'rgba(255,255,250,.9)';
            k.lineWidth = escuro ? 1 + Math.abs(v) * 0.7 : 1.3;
            k.beginPath();
            k.moveTo(ant[0], ant[1]);
            k.lineTo(pt[0], pt[1]);
            k.stroke();
          }
          ant = pt;
        }
      }
      k.restore();
      // onde passa pela beirada de cada saliência, uns respingos soltos para os lados
      for (const q of f.c) {
        if (naSaliencia(q.y) > 0.85 && r() < 0.35) {
          const w = f.w(q.s) / 2;
          const lado = r() < 0.5 ? -1 : 1;
          const L = 4 + r() * 8;
          k.strokeStyle = 'rgba(255,255,252,.95)';
          k.lineWidth = 1.3;
          k.beginPath();
          k.moveTo(q.x + lado * (w + 2), q.y);
          k.lineTo(q.x + lado * (w + 2 + L), q.y + 3 + r() * 5);
          k.stroke();
        }
      }
      k.strokeStyle = 'rgba(30,44,40,.55)';
      k.lineWidth = 1;
      k.stroke(f.forma);
    });
    // onde cada um cai: o respingo, em traços curtos para cima e para os lados, e gotas
    k.lineCap = 'round';
    filetes.forEach((f) => {
      const q = f.c[f.c.length - 1];
      const n = 6 + Math.round(f.w1 * 0.7);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.4;
        const x0 = q.x + (r() - 0.5) * f.w1;
        const L = 5 + r() * (6 + f.w1 * 0.6);
        k.strokeStyle = 'rgba(255,255,250,.95)';
        k.lineWidth = 1.2 + r();
        k.beginPath();
        k.moveTo(x0, q.y + 2);
        k.lineTo(x0 + Math.cos(a) * L, q.y + 2 + Math.sin(a) * L);
        k.stroke();
      }
      for (let i = 0; i < 5; i++) {
        k.fillStyle = 'rgba(255,255,250,.95)';
        k.beginPath();
        k.ellipse(q.x + (r() - 0.5) * f.w1 * 2.4, q.y - 8 - r() * 16, 1.4, 2, 0, 0, 6.283);
        k.fill();
      }
    });
    // a vara de pastor, encostada de pé na quina da rocha, à direita da água: o pé no barro
    // seco, o cabo inclinado e a curva do alto apoiada na pedra
    const caminhoVara = curvaPor([[676, 730], [648, 662], [622, 592], [598, 524], [582, 478], [576, 450], [582, 430], [598, 424], [610, 434], [610, 450]], 2.5);
    const { forma: varaF } = tuboAo(caminhoVara, (s) => 13 - s * 0.009);
    // a sombra dela: na pedra, para a esquerda, e no chão, curta
    k.save();
    k.clip(rocha);
    k.strokeStyle = 'rgba(40,24,10,.45)';
    k.lineWidth = 8;
    k.lineCap = 'round';
    k.beginPath();
    k.moveTo(600, 662);
    k.lineTo(592, 600);
    k.lineTo(584, 532);
    k.lineTo(580, 478);
    k.stroke();
    k.restore();
    // no chão: do pé da vara até o pé da rocha, para a esquerda (o sol vem da direita)
    const sombraV = pol([[678, 732], [640, 704], [602, 668], [598, 660], [610, 662], [646, 694], [682, 726]]);
    gravar(k, sombraV, 640, 700, 70, -0.7, 2.2, 1.5, () => 0.85, '#2a1a0c', 0);
    k.fillStyle = '#8a5a30';
    k.fill(varaF);
    marcar(k, obj, varaF);
    k.save();
    k.clip(varaF);
    k.lineCap = 'round';
    for (const v of [-0.5, -0.1, 0.3, 0.6]) {
      k.strokeStyle = v < 0 ? 'rgba(40,20,6,.65)' : 'rgba(255,226,170,.6)';
      k.lineWidth = v < 0 ? 1.2 : 1.4;
      k.beginPath();
      caminhoVara.forEach((q, i) => { const x = q.x - q.ty * v * 6; const y = q.y + q.tx * v * 6; if (i) k.lineTo(x, y); else k.moveTo(x, y); });
      k.stroke();
    }
    k.restore();
    k.strokeStyle = '#24140a';
    k.lineWidth = 2.2;
    k.stroke(varaF);
    vinheta(k, W, H, 0.2);
  }
  // ---------- (4) As muralhas de Jericó (Js 6.20) ----------
  // De baixo e de viés, ao pé do monte da cidade: o talude de pedra que reveste o morro e, em
  // cima, o muro de tijolo de barro, que foge em perspectiva para a direita. No meio, o muro
  // "veio abaixo": o rombo tem a beirada em degraus quebrados, fiada por fiada, com pedaços de
  // fiada ainda pendurados; o entulho são massas de tijolo ainda grudado (faces planas e
  // quebra torta), pedaços menores, tijolos soltos e terra miúda, que escorrem talude abaixo
  // num cone. Do entulho sobe o pó em rolos gravados e opacos, com o lado da sombra em
  // hachura. Pelo rombo aparecem as casas da cidade. Na frente, uma corneta de chifre de
  // carneiro só, encostada numa pedra. Ninguém desenhado.
  function desenhoMuralhas(k, W, H, obj) {
    const r = sorteio(9401);
    papelVelho(k, W, H, r, ['#fbf0d6', '#ecd6aa', '#cfae7a'], [760, 100]);
    const hz = 250;
    ceuEmLinhas(k, W, hz, [[120, 60, 200, 18], [700, 120, 160, 14]], { topo: 0.5, base: 0.08 });
    const chao = pol([[-10, hz], [W + 10, hz], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#e0c698';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, hz, H, 1.8, (x, y) => 0.3 + (y - hz) / 900);
    // a perspectiva: tudo do muro é desenhado num plano inclinado (y cai para a direita)
    const inc = -0.2;
    const S0 = (x, y) => [x, y + x * inc];
    const base = 600;
    const fiada = 16;
    const alt = (x) => 230 - x * 0.11;
    const rombo = [300, 600];
    // o perfil do rombo: degraus de fiada inteira, cada um de largura diferente, mais fundo no
    // meio e de lados desiguais
    const degraus = [];
    for (let x = rombo[0], i = 0; x < rombo[1]; i++) {
      const t = (x - rombo[0]) / (rombo[1] - rombo[0]);
      const v = Math.pow(Math.abs(2 * t - 1.08), 1.25);
      const n = Math.max(1, Math.round((v * alt(x) * 0.92 + (r() - 0.5) * 50) / fiada));
      const w = 10 + r() * 36;
      degraus.push([x, Math.min(x + w, rombo[1]), n * fiada]);
      x += w;
    }
    const topoM = (x) => {
      for (const [a, b, h] of degraus) if (x >= a && x < b) return base - h;
      return base - alt(x);
    };
    // as casas da cidade, atrás, que aparecem pelo rombo
    // (de alturas e larguras diferentes; uma com porta, outra com janela, outras lisas)
    for (const [x, w, h, porta, janela, dy] of [[326, 58, 38, true, false, 4], [382, 46, 56, false, true, -6], [426, 64, 32, false, false, 6], [486, 52, 48, true, true, 0], [536, 46, 36, false, false, 8], [584, 62, 52, true, false, -2], [642, 50, 40, false, true, 4]]) {
      const [, y] = S0(x, base - alt(x) - 6);
      casinha(k, r, x, y + 10 + dy, w, h, 10, { cor: '#e8d2a2', lado: '#c2a172', teto: '#d8c08e', porta, janela, traco: 1.3 });
    }
    k.save();
    k.transform(1, inc, 0, 1, 0, 0);
    // o talude: o revestimento do morro em pedras brutas, de tamanhos e cantos diferentes,
    // assentadas em fiadas tortas; a terra escura nas juntas
    const talude = pol([[-30, base], [W + 60, base], [W + 60, base + 60], [-30, base + 150]]);
    k.fillStyle = '#9a7a50';
    k.fill(talude);
    k.save();
    k.clip(talude);
    for (let y = base, j = 0; y < base + 150; j++) {
      const h = 20 + r() * 10 + j * 2;
      let x = -40 - r() * 30;
      while (x < W + 60) {
        const w = 34 + r() * 40;
        const j2 = () => (r() - 0.5) * 6;
        const pts = [[x + j2(), y + h + j2() * 0.5], [x + j2(), y + h * (0.3 + r() * 0.3)], [x + 3 + j2(), y + j2() * 0.5], [x + w * (0.3 + r() * 0.4), y + j2() * 0.6]];
        if (r() < 0.6) pts.push([x + w + j2(), y + h * (0.2 + r() * 0.3)]);
        pts.push([x + w + j2(), y + h * (0.6 + r() * 0.3)], [x + w * (0.4 + r() * 0.3), y + h + j2() * 0.5]);
        const pp = pol(pts);
        k.fillStyle = r() < 0.5 ? '#dcbc8a' : '#d0ae7a';
        k.fill(pp);
        const cxp = x + w / 2;
        const cyp = y + h / 2;
        gravar(k, pp, cxp, cyp, w * 0.7, 0.75, 3, 1.2, (px, py) => 0.12 + ((px - cxp) / w + (py - cyp) / h) * 0.5 + (y - base) / 500, SEPIA, 0);
        k.strokeStyle = 'rgba(40,24,8,.75)';
        k.lineWidth = 1.1;
        k.stroke(pp);
        x += w + 2 + r() * 3;
      }
      y += h + 2;
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(talude);
    marcar(k, obj, talude);
    // o muro de tijolo: inteiro dos dois lados, e no rombo a beirada em degraus quebrados
    const perfil = [[-30, base]];
    for (let x = -30; x < rombo[0]; x += 10) perfil.push([x, base - alt(x) + (Math.floor((x + 30) / 22) % 2 === 0 ? -12 : 0)]);
    degraus.forEach(([a, b, h], i) => {
      const ant = i ? degraus[i - 1][2] : alt(a);
      // o canto de cada degrau sai torto (meio tijolo a mais ou a menos)
      perfil.push([a + (r() - 0.5) * 6, base - ant], [a + (r() - 0.5) * 6, base - h + (r() - 0.5) * 3], [b - 2 - r() * 4, base - h + (r() - 0.5) * 3]);
    });
    for (let x = rombo[1]; x <= W + 60; x += 10) perfil.push([x, base - alt(x) + (Math.floor(x / 22) % 2 === 0 ? -12 : 0)]);
    perfil.push([W + 60, base]);
    const muro = pol(perfil);
    muroEmFiadas(k, r, muro, [-30, base - 240, W + 60, base], { h: fiada, cor: '#dcbc86', sombra: (x, y) => 0.3 + (y - 380) / 500 + (x > rombo[0] - 40 && x < rombo[1] + 40 ? 0.12 : 0), traco: 1.1, larg: 2.4 });
    // as faces quebradas dos degraus: o lado de cada degrau virado para a luz fica claro, o
    // outro na sombra
    k.lineCap = 'round';
    degraus.forEach(([a, , h], i) => {
      const ant = i ? degraus[i - 1][2] : alt(a);
      if (Math.abs(ant - h) < 4) return;
      const sobe = ant > h;
      k.strokeStyle = sobe ? 'rgba(255,244,214,.8)' : 'rgba(30,16,6,.7)';
      k.lineWidth = sobe ? 2 : 4;
      k.beginPath();
      k.moveTo(a + (sobe ? 3 : -3), base - Math.max(ant, h) + 3);
      k.lineTo(a + (sobe ? 3 : -3), base - Math.min(ant, h) - 2);
      k.stroke();
    });
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.stroke(muro);
    marcar(k, obj, muro);
    // as rachaduras compridas nas beiradas do rombo
    k.strokeStyle = 'rgba(26,14,4,.9)';
    for (const [x0, dir] of [[rombo[0] - 14, -1], [rombo[0] - 70, -1], [rombo[1] + 16, 1], [rombo[1] + 84, 1]]) {
      let x = x0;
      let y = topoM(x0) + 14;
      k.lineWidth = 2.2;
      k.beginPath();
      k.moveTo(x, y);
      for (let i = 0; i < 7; i++) { x += dir * (2 + r() * 8) * (r() < 0.5 ? -1 : 1); y += 18 + r() * 10; k.lineTo(x, y); }
      k.stroke();
    }
    // pedaços de fiada que ficaram pendurados nas beiradas, tortos, quase caindo
    const pendura = (x, y, w, n, giro) => {
      k.save();
      k.translate(x, y);
      k.rotate(giro);
      const p = pol([[0, 0], [w * 0.55, 0], [w * 0.55, -1], [w - 8, 0], [w - 8, fiada * 0.5], [w + 3, fiada * 0.6], [w - 4, n * fiada * 0.8], [w * 0.7, n * fiada], [w * 0.3, n * fiada - 3], [0, n * fiada]]);
      muroEmFiadas(k, r, p, [-4, -4, w + 8, n * fiada + 6], { h: fiada, cor: '#d6b47c', sombra: () => 0.5, traco: 1.1, larg: 2 });
      k.strokeStyle = SEPIA;
      k.lineWidth = 2;
      k.stroke(p);
      marcar(k, obj, p);
      k.restore();
    };
    {
      const [a, , h] = degraus[1];
      pendura(a - 34, base - h - 4, 70, 2, 0.22);
      const dR = degraus[degraus.length - 2];
      pendura(dR[1] - 52, base - dR[2] + 14, 56, 1, -0.4);
    }
    // a torre do lado direito do rombo, partida no alto, de beirada quebrada
    const tx = rombo[1] + 60;
    const tw = 80;
    const tTopo = base - alt(tx) - 70;
    const torre = pol([[tx - tw / 2, base], [tx - tw / 2, tTopo + 64], [tx - tw / 2 + 14, tTopo + 64], [tx - tw / 2 + 14, tTopo + 32], [tx - 6, tTopo + 32], [tx - 6, tTopo + 16], [tx + 18, tTopo + 16], [tx + 18, tTopo], [tx + tw / 2, tTopo], [tx + tw / 2, base]]);
    muroEmFiadas(k, r, torre, [tx - tw / 2, tTopo - 4, tx + tw / 2, base], { h: fiada, cor: '#e2c792', sombra: (x) => 0.22 + (x - tx + tw / 2) / tw * 0.5, traco: 1.1, larg: 1.6 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.stroke(torre);
    marcar(k, obj, torre);
    // a torre da esquerda, inteira, com as ameias
    const ex = 90;
    const ew = 96;
    const eTopo = base - alt(ex) - 60;
    const torreE = pol([[ex - ew / 2, base], [ex - ew / 2, eTopo], [ex - ew / 2 + 18, eTopo], [ex - ew / 2 + 18, eTopo - 16], [ex - 10, eTopo - 16], [ex - 10, eTopo], [ex + 10, eTopo], [ex + 10, eTopo - 16], [ex + ew / 2 - 18, eTopo - 16], [ex + ew / 2 - 18, eTopo], [ex + ew / 2, eTopo], [ex + ew / 2, base]]);
    muroEmFiadas(k, r, torreE, [ex - ew / 2, eTopo - 18, ex + ew / 2, base], { h: fiada, cor: '#e2c792', sombra: (x) => 0.22 + (x - ex + ew / 2) / ew * 0.5, traco: 1.1, larg: 1.6 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.stroke(torreE);
    marcar(k, obj, torreE);
    k.restore();
    // o pó: rolos opacos, de beirada partida, a luz do alto à esquerda e a barriga de baixo e
    // da direita em hachura (cruzada no mais fundo); cada rolo cobre o de trás
    // a sombra do pó é da massa toda: mais escura embaixo e à direita (a luz vem do alto à
    // esquerda), e cada rolo só escurece na barriga de baixo e no lado de lá
    const nuvemTopo = 220;
    const nuvemBase = 500;
    const rolo = (x, y, rr, t = 0, ach = 0.8) => {
      const n = 26;
      const f = r() * 6.28;
      const pts = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const q = rr * (1 + Math.sin(a * 4 + f) * 0.08 + Math.sin(a * 9 + f * 2) * 0.05);
        return [x + Math.cos(a) * q, y + Math.sin(a) * q * ach];
      });
      const p = contornoRocha(r, [...pts, pts[0]], 3);
      p.closePath();
      const somb = (px, py) => (py - nuvemTopo) / (nuvemBase - nuvemTopo) * 0.4 + (px - 540) / 700 + Math.max(0, ((px - x) * 0.45 + (py - y) / ach) / rr - 0.15) * 0.9;
      if (t > 0.78) {
        // no alto o pó se desfaz: só uns riscos partidos e a hachura rala, sem massa
        gravar(k, p, x, y, rr * 1.05, 0.45, 3.6, 1.1, (px, py) => somb(px, py) * 0.7, 'rgba(84,58,26,.8)', 0.3);
        k.strokeStyle = 'rgba(70,46,18,.7)';
        k.lineWidth = 1;
        k.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
          const a = Math.PI * (1.1 + r() * 0.7);
          k.beginPath();
          k.ellipse(x + (r() - 0.5) * rr * 0.4, y, rr * (0.7 + r() * 0.3), rr * ach * 0.8, 0, a, a + 0.4 + r() * 0.3);
          k.stroke();
        }
        return;
      }
      k.fillStyle = '#eadab2';
      k.fill(p);
      gravar(k, p, x, y, rr * 1.05, 0.45, 2.6, 1.7, somb, 'rgba(84,58,26,.95)', 0.3);
      gravar(k, p, x, y, rr * 1.05, -0.7, 3.2, 1.4, (px, py) => somb(px, py) - 0.55, 'rgba(84,58,26,.9)', 0.2);
      // o contorno partido: mais cheio na barriga e no lado de lá, fino e falhado do lado da
      // luz
      k.lineCap = 'round';
      for (let a = -Math.PI; a < Math.PI; a += 0.3) {
        const sombra = Math.sin(a) > -0.2 || Math.cos(a) > 0.4;
        if (r() < (sombra ? 0.3 : 0.55)) continue;
        k.strokeStyle = 'rgba(70,46,18,.8)';
        k.lineWidth = sombra ? 1.4 : 0.8;
        k.beginPath();
        k.ellipse(x, y, rr, rr * ach, 0, a, a + 0.18 + r() * 0.1);
        k.stroke();
      }
      marcar(k, obj, p);
    };
    // os rolos altos, de trás, que sobem do rombo e se abrem, levados um pouco para a direita
    const altos = [];
    // grandes embaixo, pequenos em cima, a massa levada para a direita
    for (let i = 0; i < 46; i++) {
      const t = Math.pow(r(), 1.1);
      altos.push([490 + t * 150 + (r() - 0.5) * (320 - t * 140), 482 - t * 270 + (r() - 0.5) * 20, 14 + Math.pow(1 - t, 1.3) * 50 + r() * 14, t]);
    }
    altos.sort((a, b) => a[1] - b[1]);
    for (const q of altos) rolo(...q);
    // o entulho: o cone de terra miúda e cacos que escorre do rombo pelo talude e se espalha
    // no chão
    const cone = contornoRocha(r, [[296, 548], [330, 512], [380, 496], [430, 486], [480, 474], [530, 462], [576, 452], [606, 458], [636, 500], [680, 556], [722, 606], [716, 646], [640, 676], [540, 700], [430, 714], [320, 722], [236, 714], [196, 690], [226, 640], [262, 592]], 8);
    cone.closePath();
    k.fillStyle = '#c4a06c';
    k.fill(cone);
    gravar(k, cone, 460, 600, 300, 0.5, 3, 1.6, (x, y) => 0.25 + (x - 300) / 900 + (y - 480) / 600, SEPIA, 0);
    k.save();
    k.clip(cone);
    for (let i = 0; i < 1400; i++) {
      const x = 190 + r() * 540;
      const y = 450 + r() * 280;
      k.fillStyle = r() < 0.6 ? 'rgba(40,24,8,.6)' : 'rgba(255,240,206,.7)';
      k.fillRect(x, y, 1.4 + r() * 1.6, 1.2 + r() * 1.2);
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(cone);
    marcar(k, obj, cone);
    // os pedaços: massas de tijolo ainda grudado (as fiadas e as juntas aparecem na face), de
    // faces planas e beirada quebrada; a face de cima clara, a da frente meia-tinta, a do lado
    // escura
    const terra = (x, y, w, h) => {
      // a terra miúda que cobre o pé de cada pedaço: um montinho torto, em hachura e grão
      const m = contornoRocha(r, [[x - w * 0.62, y + h * 0.62], [x - w * 0.4, y + h * 0.3 + r() * h * 0.2], [x - w * 0.05, y + h * 0.22 + r() * h * 0.2], [x + w * 0.3, y + h * 0.3 + r() * h * 0.2], [x + w * 0.64, y + h * 0.62], [x, y + h * 0.75]], 4);
      m.closePath();
      k.fillStyle = '#c4a06c';
      k.fill(m);
      gravar(k, m, x, y + h * 0.5, w * 0.7, 0.5, 3, 1.5, (px) => 0.3 + (px - 300) / 900, SEPIA, 0);
      k.save();
      k.clip(m);
      for (let i = 0; i < w * 0.8; i++) {
        k.fillStyle = r() < 0.6 ? 'rgba(40,24,8,.6)' : 'rgba(255,240,206,.7)';
        k.fillRect(x - w * 0.6 + r() * w * 1.2, y + h * 0.2 + r() * h * 0.6, 1.4 + r() * 1.4, 1.2 + r());
      }
      k.restore();
      marcar(k, obj, m);
    };
    const pedaco = (x, y, w, h, giro, n) => {
      const q = Math.min(w, h);
      const d = q * (0.3 + r() * 0.2);
      const dx = d * 0.75;
      const dy = -d * 0.5;
      const J = () => (r() - 0.5) * q * 0.14;
      const nb = h / n;
      // a face de cima é um plano só; a quebra fica no contorno: o canto da frente à esquerda
      // comido e o canto de trás à direita lascado
      const c1 = q * (0.12 + r() * 0.2);
      const topo = [[-w / 2 + c1, -h / 2 + J() * 0.15], [w / 2 - r() * w * 0.12, -h / 2 + J() * 0.15]];
      const tr = topo[1];
      const dir = [[w / 2 + J() * 0.5, -h / 2 + h * (0.3 + r() * 0.2)], [w / 2 - q * 0.12 + J(), h * 0.12], [w / 2 + J() * 0.5, h / 2]];
      const fr = [...topo, ...dir, [w * 0.2 + J(), h / 2 + J() * 0.4], [-w * 0.25 + J(), h / 2 + J() * 0.4], [-w / 2 + J(), h * 0.15], [-w / 2 + J() * 0.4, -h / 2 + c1 * 0.8]];
      const lasca = 0.25 + r() * 0.3;
      const cima = [topo[0], topo[1], [topo[1][0] + dx * lasca, topo[1][1] + dy * lasca - 2], [topo[1][0] + dx - w * 0.12, topo[1][1] + dy], [topo[0][0] + dx, topo[0][1] + dy]];
      const lado = [tr, [tr[0] + dx, tr[1] + dy], [dir[0][0] + dx, dir[0][1] + dy], [dir[1][0] + dx * 0.8, dir[1][1] + dy * 0.8], dir[1], dir[0]];
      k.save();
      k.translate(x, y);
      k.rotate(giro);
      const fCima = pol(cima);
      const fLado = pol(lado);
      const fFrente = pol(fr);
      for (const [f, cor, s, ang] of [[fLado, '#94704a', 0.75, 1.3], [fCima, '#ead2a0', 0.1, 0.2], [fFrente, '#c9a26c', 0.4, 0.1]]) {
        k.fillStyle = cor;
        k.fill(f);
        gravar(k, f, 0, 0, Math.max(w, h), ang, 2.8, 1.3, () => s, SEPIA, 0);
      }
      if (n > 1) {
        // as fiadas e as juntas na face da frente, partidas onde a face quebrou
        k.save();
        k.clip(fFrente);
        k.strokeStyle = 'rgba(30,16,4,.85)';
        k.lineWidth = 1.2;
        for (let j = 1; j < n; j++) {
          const yy = -h / 2 + nb * j;
          k.beginPath();
          k.moveTo(-w / 2 - 4, yy);
          k.lineTo(w / 2 + 4, yy + (r() - 0.5) * 1.5);
          k.stroke();
        }
        for (let j = 0; j < n; j++) {
          let xx = -w / 2 + (j % 2) * nb * 1.1 + r() * 6;
          while (xx < w / 2) {
            k.beginPath();
            k.moveTo(xx, -h / 2 + nb * j);
            k.lineTo(xx, -h / 2 + nb * (j + 1));
            k.stroke();
            xx += nb * 2.2;
          }
        }
        // a quebra: uns riscos tortos na face, de onde o tijolo lascou
        k.lineWidth = 1.4;
        k.beginPath();
        const lx = (r() - 0.5) * w * 0.6;
        k.moveTo(lx, h / 2);
        k.lineTo(lx + (r() - 0.5) * 12, h * 0.15);
        k.lineTo(lx + (r() - 0.5) * 20, -h * 0.1);
        k.stroke();
        k.restore();
      }
      k.strokeStyle = SEPIA;
      k.lineWidth = n > 1 ? 1.8 : 1.3;
      for (const f of [fLado, fCima, fFrente]) k.stroke(f);
      marcar(k, obj, fLado);
      marcar(k, obj, fCima);
      marcar(k, obj, fFrente);
      k.restore();
      if (n > 1) terra(x, y, w, h);
    };
    const pecas = [];
    // as massas grandes: poucas, de três e quatro fiadas, meio enterradas
    for (const [x, y, w, h, g, n] of [[380, 530, 110, 66, -0.14, 4], [526, 512, 96, 52, 0.2, 3], [452, 612, 132, 70, 0.07, 4], [618, 596, 86, 54, -0.34, 3], [304, 648, 84, 50, 0.3, 3], [566, 668, 104, 46, -0.1, 3]]) pecas.push([x, y, w, h, g, n]);
    // as médias (duas fiadas) e os cacos soltos
    for (let i = 0; i < 46; i++) {
      const x = 240 + r() * 470;
      const y = 490 + r() * 230;
      if (!k.isPointInPath(cone, x, y)) continue;
      const g = r();
      const sz = g < 0.3 ? 36 + r() * 18 : 9 + r() * 14;
      pecas.push([x, y, sz * (1.1 + r() * 0.6), sz * (0.65 + r() * 0.3), (r() - 0.5) * 1.6, g < 0.3 ? 2 : 1]);
    }
    pecas.sort((a, b) => a[1] - b[1]);
    for (const p of pecas) pedaco(...p);

    // uma corneta de chifre de carneiro, só, encostada numa pedra no canto de baixo
    const pedra = contornoRocha(r, [[84, 742], [96, 714], [128, 700], [150, 680], [196, 684], [232, 702], [256, 736]], 4);
    pedra.closePath();
    sombraNoChao(k, pedra, 16, 8, 6, 0.35);
    peca(k, pedra, [84, 676, 256, 744], { cor: '#c6a676', ang: 0.6, passo: 3, maxL: 1.6, sombra: (x, y) => 0.25 + (x - 90) / 300 + (y - 680) / 200, cruzada: 0.72, traco: 2, obj });
    const c = curvaPor([[150, 730], [196, 718], [246, 690], [284, 654], [300, 620], [316, 606]], 3);
    const S1 = c[c.length - 1].s;
    const lg = (sx) => 7 + 30 * Math.pow(sx / S1, 1.4);
    const { forma } = tuboAo(c, lg);
    sombraNoChao(k, forma, 8, 10, 5, 0.4);
    k.fillStyle = '#8a5a2c';
    k.fill(forma);
    marcar(k, obj, forma);
    k.save();
    k.clip(forma);
    k.strokeStyle = 'rgba(30,16,4,.8)';
    for (let sx = 10; sx < S1 - 12; sx += 6 + (sx / S1) * 8) {
      const q = c[Math.min(c.length - 1, Math.round(sx / 3))];
      const w = lg(sx) / 2 + 2;
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(q.x + q.ty * w, q.y - q.tx * w);
      k.quadraticCurveTo(q.x + q.tx * w * 0.35, q.y + q.ty * w * 0.35, q.x - q.ty * w, q.y + q.tx * w);
      k.stroke();
    }
    gravar(k, forma, 230, 680, 140, 0.8, 3, 1.4, (x, y) => 0.3 + (y - 630) / 200, '#1e1006', 0);
    k.restore();
    k.strokeStyle = '#1e1206';
    k.lineWidth = 2.2;
    k.stroke(forma);
    const fb = c[c.length - 1];
    k.fillStyle = '#2a1608';
    k.beginPath();
    k.ellipse(fb.x, fb.y, 10, 19, Math.atan2(fb.ty, fb.tx), 0, 6.283);
    k.fill();
    k.strokeStyle = '#e8c890';
    k.lineWidth = 2;
    k.stroke();
    capim(k, r, 420, 790, 30, 11);
    capim(k, r, 780, 740, 26, 9);
    vinheta(k, W, H, 0.2);
  }

  // ---------- (5) O fogo no Carmelo (1 Rs 18.30-38) ----------
  // No alto do monte, na hora do sacrifício da tarde: o altar refeito com doze pedras grandes e
  // brutas (cinco, quatro e três) e em volta o rego cheio de água (18.32-35). O fogo cai do céu
  // por um rasgo da nuvem, numa coluna torta que alarga para baixo, de beiradas rasgadas em
  // línguas que ficam para trás; bate no alto do altar e se esparrama: a lenha e a oferta
  // somem dentro dele, o fogo escorre pelas pedras e lambe a água da valeta, que vira vapor
  // (18.38). Ninguém desenhado.
  function desenhoFogoCarmelo(k, W, H, obj) {
    const r = sorteio(9501);
    // a tarde que escurece: papel quente e o céu em linhas, mais cheio no alto e mais ralo
    // debaixo do rasgo da nuvem (a luz que vem de cima é só a falta de traço)
    papelVelho(k, W, H, r, ['#f6e2bc', '#e2c08c', '#b08654'], [444, 470]);
    const hz = 330;
    linhas(k, 0, 0, W, hz, 4, 1.9, (x, y) => 0.36 + Math.pow(1 - y / hz, 1.1) * 0.6 - Math.max(0, 1 - Math.abs(x - 444) / (150 + y * 0.5)) * 0.42);
    // o mar lá embaixo, à esquerda (o Carmelo dá para o mar), e a serra do outro lado
    const marL = pol([[-10, hz - 6], [330, hz - 4], [330, hz + 4], [-10, hz + 4]]);
    k.fillStyle = '#cdbb98';
    k.fill(marL);
    k.strokeStyle = 'rgba(43,33,18,.5)';
    k.lineWidth = 1;
    for (let y = hz - 4; y < hz + 4; y += 2.6) { k.beginPath(); k.moveTo(-10, y); k.lineTo(330, y); k.stroke(); }
    // o alto do monte: uma chapada de rocha e terra, de beirada contínua
    const borda = (x) => hz + 12 + Math.sin(x * 0.009 + 0.4) * 6 + Math.sin(x * 0.027 + 1) * 3 + Math.max(0, x - 600) * 0.02;
    const chapada = pol([...Array.from({ length: 58 }, (_, i) => { const x = -10 + i * 16; return [x, borda(x)]; }), [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#cfae7c';
    k.fill(chapada);
    chaoEmLinhas(k, r, chapada, -10, W + 10, hz, H, 2.1, (x, y) => 0.4 + (y - hz) / 800 - Math.max(0, 1 - Math.hypot(x - 444, (y - 600) * 1.6) / 380) * 0.34);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(chapada);
    const cx = 444;
    // o rego em volta do altar: uma vala cavada em elipse. A parede de lá (virada para cá) na
    // sombra, a de dentro (do lado do altar) aparece na frente, e a água fica lá no fundo,
    // mais baixa que as beiradas
    const cy = 650;
    const ext = [370, 130];
    const int = [236, 72];
    const elip = (rx, ry, dy = 0) => { const p = new Path2D(); p.ellipse(cx, cy + dy, rx, ry, 0, 0, 6.283); return p; };
    const fora = elip(ext[0], ext[1]);
    const dentroV = elip(int[0], int[1], -8);
    const vala = new Path2D();
    vala.addPath(fora);
    vala.addPath(dentroV);
    marcar(k, obj, fora);
    k.save();
    k.clip(vala, 'evenodd');
    k.fillStyle = '#7a6044';
    k.fill(fora);
    // as paredes: a de lá funda e escura, a de cá (a margem de dentro) meia-tinta, em hachura
    // de pé que vai rareando para baixo
    gravar(k, fora, cx, cy, ext[0] + 10, Math.PI / 2, 2.8, 1.9, (x, y) => (y < cy ? 0.95 - (y - cy + ext[1]) / 260 : 0.55) + (r() - 0.5) * 0.05, '#140c04', 0);
    gravar(k, fora, cx, cy, ext[0] + 10, 0.25, 3.4, 1.4, (x, y) => (y < cy ? 0.7 - (y - cy + ext[1]) / 200 : 0.2), '#140c04', 0);
    // a água no fundo: um anel mais estreito e mais baixo que a vala
    const agua = new Path2D();
    agua.ellipse(cx, cy + 18, ext[0] - 26, ext[1] - 18, 0, 0, 6.283);
    agua.ellipse(cx, cy + 14, int[0] + 18, int[1] + 12, 0, 0, 6.283);
    k.save();
    k.clip(agua, 'evenodd');
    k.fillStyle = '#9a8e72';
    k.fill(fora);
    gravar(k, fora, cx, cy, ext[0], 0, 2.6, 1.2, (x, y) => 0.45 + (y < cy ? 0.25 : 0), '#2a2214', 0);
    k.lineCap = 'round';
    // a fervura: riscos deitados, claros e escuros, partidos, e uns pingos
    for (let i = 0; i < 260; i++) {
      const a = r() * 6.283;
      const d = r();
      const x = cx + Math.cos(a) * ((ext[0] + int[0]) / 2 - 10 + d * 40);
      const y = cy + 16 + Math.sin(a) * ((ext[1] + int[1]) / 2 - 8 + d * 20);
      const L = 5 + r() * 12;
      k.strokeStyle = r() < 0.5 ? 'rgba(255,236,190,.9)' : 'rgba(34,26,14,.6)';
      k.lineWidth = 1.1;
      k.beginPath();
      k.moveTo(x - L / 2, y);
      k.quadraticCurveTo(x, y - 1.8, x + L / 2, y);
      k.stroke();
    }
    k.restore();
    k.restore();
    // as beiradas: a de fora em traço e com a luz em cima; a de dentro acesa pelo fogo
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.2;
    k.stroke(fora);
    k.lineWidth = 1.8;
    k.stroke(dentroV);
    k.strokeStyle = 'rgba(255,236,196,.75)';
    k.lineWidth = 1.6;
    k.beginPath();
    k.ellipse(cx, cy - 6, int[0] + 2, int[1] + 2, 0, 0.1, Math.PI - 0.1);
    k.stroke();
    k.beginPath();
    k.ellipse(cx, cy + 2, ext[0] - 2, ext[1] - 2, 0, Math.PI + 0.15, Math.PI * 2 - 0.15);
    k.stroke();
    // o vapor: fiapos gravados, cada um uns poucos riscos finos juntos que sobem torcendo,
    // se abrem e se apagam; mais na frente e dos lados, onde a água aparece
    const vapor = (x, y, alto, vai) => {
      // uma fita de vapor que sobe em S e se alarga, só de contorno partido e uns riscos de
      // dentro, quase transparente; o pé some na água e a ponta se apaga
      const fase = r() * 6.28;
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        pts.push([x + Math.sin(t * 3.4 + fase) * 14 * t + vai * t * t, y - alto * t]);
      }
      const c = curvaPor(pts, 3);
      const L = c[c.length - 1].s;
      const w = (s2) => 5 + 22 * (s2 / L);
      const { forma, e, d } = tuboAo(c, w);
      k.fillStyle = 'rgba(250,244,228,.16)';
      k.fill(forma);
      k.lineCap = 'round';
      const fio = (pp, lw) => {
        for (let i = 1; i < pp.length; i++) {
          const t = i / pp.length;
          if (r() < 0.2) continue;
          const forca = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.8);
          k.strokeStyle = 'rgba(252,246,230,' + (0.7 * forca).toFixed(2) + ')';
          k.lineWidth = lw * (0.4 + forca * 0.6);
          k.beginPath();
          k.moveTo(pp[i - 1][0], pp[i - 1][1]);
          k.lineTo(pp[i][0], pp[i][1]);
          k.stroke();
        }
      };
      fio(e, 1.5);
      fio(d, 1.5);
      fio(c.map((q) => [q.x - q.ty * w(q.s) * 0.15, q.y + q.tx * w(q.s) * 0.15]), 1);
    };
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * (-0.06 + (i / 11) * 1.12 + (r() - 0.5) * 0.05);
      const x = cx + Math.cos(a) * ((ext[0] + int[0]) / 2);
      const y = cy + 16 + Math.sin(a) * ((ext[1] + int[1]) / 2);
      vapor(x, y, 70 + r() * 50, 26 + r() * 30);
    }
    // o altar: doze pedras brutas, de tamanhos e formas desencontrados, empilhadas em três
    // fiadas (cinco, quatro e três), com as frestas escuras; a face de cima acesa pelo fogo,
    // as de cima chamuscadas e rachadas (18.38: o fogo queimou até as pedras)
    const sombraAltar = pol([[cx - 210, 660], [cx + 210, 660], [cx + 230, 690], [cx - 190, 694]]);
    gravar(k, sombraAltar, cx, 676, 240, 0.05, 2.4, 1.6, () => 0.85, '#1e1208', 0);
    const fiadas = [[5, 664, [78, 96, 70, 88, 74], 54], [4, 612, [92, 70, 96, 78], 50], [3, 566, [96, 84, 90], 46]];
    for (const [n, base, largs, h] of fiadas) {
      const tot = largs.reduce((a2, b2) => a2 + b2, 0);
      let x0 = cx - tot / 2;
      for (let i = 0; i < n; i++) {
        const w = largs[i];
        const x1 = x0 + w;
        const hh = h * (0.85 + r() * 0.3);
        const y0 = base - hh;
        const q = (v, a2) => v + (r() - 0.5) * a2;
        const pts = [[q(x0 + 4, 6), q(y0 + 10, 8)], [q(x0 + w * 0.3, 8), q(y0, 6)], [q(x0 + w * 0.7, 8), q(y0 + 4, 8)], [q(x1 - 3, 4), q(y0 + 14, 8)], [q(x1, 4), q(base - hh * 0.4, 10)], [q(x1 - 6, 6), q(base, 3)], [q(x0 + w * 0.4, 8), q(base + 2, 3)], [q(x0 + 2, 4), q(base - 4, 4)], [q(x0, 4), q(y0 + hh * 0.5, 10)]];
        const p = pol(pts);
        peca(k, p, [x0, y0, x1, base], { cor: '#a88e6a', tinta: '#1e1208', ang: 0.3 + (r() - 0.5) * 1.2, passo: 3, maxL: 1.9, sombra: (px, py) => 0.32 + (py - y0) / hh * 0.45 + (r() - 0.5) * 0.05, cruzada: 0.66, traco: 2.4, obj });
        const topoP = pol([pts[0], pts[1], pts[2], pts[3], [(pts[3][0] + pts[8][0]) / 2, (pts[3][1] + pts[8][1]) / 2 + 6]]);
        k.fillStyle = 'rgba(255,220,160,.4)';
        k.fill(topoP);
        // a fuligem: hachura cruzada escura que desce do alto da pedra, mais nas de cima
        if (n < 5) {
          const fu = n === 3 ? 0.9 : 0.55;
          gravar(k, p, (x0 + x1) / 2, y0 + hh * 0.4, w, 0.9, 2.6, 1.4, (px, py) => fu - (py - y0) / hh * 1.1, '#1a0e06', 0);
        }
        k.strokeStyle = 'rgba(20,10,4,.85)';
        k.lineWidth = 1.6;
        k.beginPath();
        const xr = x0 + w * (0.3 + r() * 0.4);
        k.moveTo(xr, y0 + 6);
        k.lineTo(xr + (r() - 0.5) * 10, y0 + hh * 0.5);
        k.lineTo(xr + (r() - 0.5) * 14, base - 4);
        k.stroke();
        x0 = x1 + 4;
      }
    }
    // a língua de fogo em gravura (a mesma maneira da fornalha): um tubo em S, largo no pé e
    // fino na ponta, a hachura correndo ao longo dele, cheia nas beiradas e rala no meio. Com
    // alto negativo ela desce (o fogo que escorre pela beirada)
    const lingua = (x, y, alto, larg, vai, cor, tinta, contorno, turb = 0.18) => {
      const fase = r() * 6.28;
      const pts = [];
      for (let i = 0; i <= 7; i++) {
        const t = i / 7;
        pts.push([x + vai * t * t + Math.sin(fase + t * 3.3) * larg * 0.28 * t, y - alto * t]);
      }
      const c = curvaPor(pts, 3);
      const L = c[c.length - 1].s;
      const w = (s) => { const t = s / L; return larg * Math.pow(Math.max(0, 1 - t), 0.75) * (1 + turb * Math.sin(t * 10 + fase) + turb * 0.5 * Math.sin(t * 23 + fase * 2)) * (t < 0.1 ? 0.75 + t * 2.5 : 1); };
      const { forma } = tuboAo(c, w);
      k.fillStyle = cor;
      k.fill(forma);
      k.save();
      k.clip(forma);
      k.strokeStyle = tinta;
      k.lineCap = 'round';
      for (let f2 = -0.5; f2 <= 0.5001; f2 += 0.1) {
        let ant = null;
        for (const q of c) {
          const ww = w(q.s) / 2;
          const px = q.x - q.ty * f2 * 2 * ww;
          const py = q.y + q.tx * f2 * 2 * ww;
          const lw = 1.6 * Math.pow(Math.abs(f2) * 2, 1.5) * (1 - (q.s / L) * 0.4);
          if (ant && lw > 0.2) { k.lineWidth = lw; k.beginPath(); k.moveTo(ant[0], ant[1]); k.lineTo(px, py); k.stroke(); }
          ant = [px, py];
        }
      }
      k.restore();
      if (contorno) { k.strokeStyle = contorno; k.lineWidth = 1.2; k.stroke(forma); }
      marcar(k, obj, forma);
      return forma;
    };
    const VERM = ['rgba(176,58,18,.96)', '#3a0a02', 'rgba(50,10,2,.75)'];
    const LARA = ['rgba(232,124,40,.96)', '#6a1a04', 'rgba(80,20,4,.6)'];
    const AMAR = ['rgba(252,204,116,.97)', '#9a4a10', null];
    const BRAN = ['rgba(255,246,222,.98)', '#d09040', null];

    // a coluna que cai: sai do rasgo da nuvem, torta e desigual, e alarga até o altar
    const yTopo = 90;
    const yBase = 530;
    const eixo = (y) => cx - 14 + (y - yTopo) * 0.05 + Math.sin(y * 0.012 + 1) * 10;
    const meia = (y) => 66 + Math.pow(Math.max(0, (y - yTopo) / (yBase - yTopo)), 1.6) * 110;
    const beira = (y, lado, f, esc) => eixo(y) + lado * meia(y) * esc * (1 + 0.1 * Math.sin(y * 0.033 + f) + 0.07 * Math.sin(y * 0.087 + f * 2) + 0.05 * Math.sin(y * 0.19 + f * 3));
    // as línguas que ficam para trás: a coluna cai e as beiradas se rasgam em línguas que
    // apontam para cima e para fora, de tamanhos e lugares desencontrados
    for (const [y, lado, alto, larg] of [[300, 1, 70, 34], [372, -1, 60, 30], [410, 1, 86, 40], [470, -1, 74, 36]]) {
      const x = beira(y, lado, lado > 0 ? 2.3 : 0.7, 1) - lado * 14;
      lingua(x, y + 30, alto, larg, lado * (16 + alto * 0.2), ...VERM, 0.3);
    }
    const camada = (esc, f, cor, tinta, peso, contorno, dx = 0) => {
      const pts = [];
      for (let y = yTopo; y <= yBase; y += 5) pts.push([beira(y, -1, f, esc) + dx * Math.sin(y * 0.02 + f), y]);
      for (let y = yBase; y >= yTopo; y -= 5) pts.push([beira(y, 1, f + 1.9, esc) + dx * Math.sin(y * 0.02 + f), y]);
      const p = pol(pts);
      k.fillStyle = cor;
      k.fill(p);
      k.save();
      k.clip(p);
      k.strokeStyle = tinta;
      k.lineCap = 'round';
      for (let u = -1.1; u <= 1.1001; u += 0.08) {
        let ant = null;
        for (let y = yTopo; y <= yBase + 10; y += 6) {
          const x = eixo(y) + u * meia(y) * esc * (1 + 0.12 * Math.sin(y * 0.04 + u * 5 + f));
          const lw = peso * Math.pow(Math.min(1, Math.abs(u)), 1.4) * (0.6 + 0.4 * Math.sin(y * 0.07 + u * 9));
          if (ant && lw > 0.2 && r() > 0.12) { k.lineWidth = lw; k.beginPath(); k.moveTo(ant[0], ant[1]); k.lineTo(x, y); k.stroke(); }
          ant = [x, y];
        }
      }
      k.restore();
      if (contorno) { k.strokeStyle = contorno; k.lineWidth = 1.6; k.stroke(p); }
      return p;
    };
    const coluna = camada(1, 0.4, 'rgba(180,62,18,.96)', '#3a0c02', 2.2, '#3a1004');
    camada(0.74, 2.1, 'rgba(232,126,42,.96)', '#6a1e04', 1.8, null, 14);
    camada(0.46, 3.7, 'rgba(250,196,108,.97)', '#9a4a10', 1.4, null, 22);
    marcar(k, obj, coluna);
    // o miolo: não uma faixa reta, mas uns fios claros, tortos e partidos, que descem
    k.lineCap = 'round';
    for (let j = 0; j < 6; j++) {
      const u0 = (r() - 0.5) * 0.5;
      const f = r() * 6.28;
      let y = yTopo + 30 + r() * 60;
      while (y < yBase - 20) {
        const comp = 40 + r() * 90;
        const pts = [];
        for (let yy = y; yy < Math.min(yBase, y + comp); yy += 6) pts.push([eixo(yy) + (u0 + 0.22 * Math.sin(yy * 0.025 + f)) * meia(yy) * 0.5, yy]);
        if (pts.length > 2) {
          const c = curvaPor(pts, 3);
          const { forma } = tuboAo(c, (s) => (3 + j % 3 * 2) * Math.sin(Math.PI * Math.min(1, s / (c[c.length - 1].s || 1))) + 1);
          k.fillStyle = 'rgba(255,248,228,.95)';
          k.fill(forma);
        }
        y += comp + 14 + r() * 30;
      }
    }
    // o céu fechado: uma nuvem pesada e baixa, opaca, só de hachura, com o rasgo de onde o
    // fogo sai; a beirada do rasgo acesa em traço claro
    const nuvem = new Path2D();
    for (let i = 0; i < 16; i++) {
      const x = (i / 15) * (W + 100) - 50;
      const longe = Math.abs(x - (cx - 14));
      nuvem.addPath(seixo(r, x, 110 + r() * 40 + Math.max(0, 220 - longe) * 0.12, 90 + r() * 50, 46 + r() * 30, (r() - 0.5) * 0.2, 0.14));
    }
    nuvem.rect(-20, -20, W + 40, 150);
    k.fillStyle = '#a88a62';
    k.fill(nuvem);
    gravar(k, nuvem, cx, 100, 560, 0.08, 3, 2.4, (x, y) => 0.5 + Math.min(1, Math.abs(x - cx) / 400) * 0.35 + (y - 60) / 360 - Math.max(0, 1 - Math.abs(x - cx) / 160) * 0.25, '#1e140a', 0);
    gravar(k, nuvem, cx, 100, 560, 1.3, 4, 1.6, (x, y) => 0.25 + Math.min(1, Math.abs(x - cx) / 400) * 0.5, '#1e140a', 0);
    marcar(k, obj, nuvem);
    // a barriga da nuvem acesa por baixo, em volta de onde o fogo sai: riscos claros curtos
    k.save();
    k.clip(nuvem);
    k.strokeStyle = 'rgba(255,214,150,.85)';
    k.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      const x = cx - 14 + (r() - 0.5) * 360;
      const y = 168 + r() * 50;
      const L = 6 + r() * 18 * (1 - Math.abs(x - cx) / 220);
      if (L < 4) continue;
      k.lineWidth = 1.2 + (1 - Math.abs(x - cx) / 210) * 1.2;
      k.beginPath();
      k.moveTo(x, y);
      k.lineTo(x + L, y + (r() - 0.5) * 2);
      k.stroke();
    }
    k.restore();
    // onde cai: o fogo bate no alto do altar e se esparrama. A lenha e a oferta somem dentro
    // dele (18.38); só uma sombra queimada aparece entre as línguas. Atrás as vermelhas,
    // depois laranja, amarelas e umas brancas; as das pontas se deitam para os lados
    const queimado = pol([[cx - 110, 548], [cx - 70, 528], [cx + 30, 524], [cx + 96, 534], [cx + 104, 552], [cx - 100, 556]]);
    gravar(k, queimado, cx, 540, 120, 0.3, 2.2, 1.8, () => 0.9, '#140804', 0);
    const estouro = (n, esp, alt0, alt1, larg0, larg1, cores) => {
      for (let i = 0; i < n; i++) {
        const t = n > 1 ? i / (n - 1) : 0.5;
        const x = cx + (t - 0.5) * esp + (r() - 0.5) * 24;
        const longe = Math.abs(x - cx) / (esp / 2);
        const lado = x < cx ? -1 : 1;
        lingua(x, 556 + r() * 10, alt0 + (1 - longe) * (alt1 - alt0) * (0.6 + r() * 0.6), larg0 + r() * (larg1 - larg0), lado * (10 + longe * 70) + (r() - 0.5) * 20, ...cores);
      }
    };
    estouro(9, 420, 70, 170, 54, 86, VERM);
    estouro(8, 320, 50, 140, 44, 70, LARA);
    estouro(5, 200, 40, 100, 34, 50, AMAR);
    for (const [x, alto] of [[cx - 30, 46], [cx + 22, 38]]) lingua(x, 560, alto, 26, (x - cx) * 0.3, ...BRAN);
    // o fogo que escorre pela beirada do altar e lambe as pedras por fora, para baixo e de
    // novo para cima, e chega na água
    for (const [x, y, alto, vai] of [[cx - 190, 548, -60, -30], [cx + 186, 552, -70, 34], [cx - 214, 600, -50, -26], [cx + 214, 606, -48, 30]]) {
      lingua(x, y, alto, 30, vai, ...LARA);
    }
    for (const [x, y, alto] of [[cx - 196, 640, 60], [cx + 200, 648, 54], [cx - 150, 668, 40], [cx + 160, 670, 46]]) {
      lingua(x, y, alto, 26, (x - cx) * 0.12, ...LARA);
    }

    // fagulhas
    k.fillStyle = 'rgba(255,230,170,.95)';
    for (let i = 0; i < 60; i++) { const x = cx + (r() - 0.5) * 520; const y = 300 + r() * 300; k.beginPath(); k.arc(x, y, 0.8 + r() * 1.6, 0, 6.283); k.fill(); }
    vinheta(k, W, H, 0.28);
  }

  // ---------- (6) O machado que flutuou (2 Rs 6.4-7) ----------
  // Rente à água, de perto: a câmera baixa, quase na correnteza do Jordão, que vem de longe
  // entre as tamargueiras da outra margem. No meio, o ferro do machado veio à tona: a cunha de
  // ferro boiando, metade fora d'água, com a água lambendo as beiradas e uma esteira de
  // marolas rio abaixo; perto dele, a vara que Eliseu cortou, boiando torta. Na frente, em
  // diagonal, a margem de cá com o tronco derrubado, o talho do machado e as lascas (6.4).
  // Ninguém desenhado.
  function desenhoMachado(k, W, H, obj) {
    const r = sorteio(9601);
    papelVelho(k, W, H, r, ['#f4eedb', '#e2d8b8', '#c0b08a'], [640, 120]);
    const hz = 214;
    linhas(k, 0, 0, W, hz, 5, 1.2, (x, y) => 0.1 + (1 - y / hz) * 0.4);
    // a outra margem: o barranco baixo e as tamargueiras, de folha em fiapos (não em bolas)
    const fM = onda(sorteio(9610), 4, 0.012);
    const margem = pol([[-10, hz + 4], ...Array.from({ length: 46 }, (_, i) => [i * 20 - 6, hz - 6 - Math.max(0, fM(i * 20)) * 6]), [W + 10, hz + 4]]);
    peca(k, margem, [-10, hz - 30, W + 10, hz + 4], { cor: '#c8b48a', ang: 0.05, passo: 3, maxL: 1.2, sombra: () => 0.45, cruzada: 1, traco: 1.2 });
    const tamargueira = (x, base, alto, e) => {
      k.strokeStyle = 'rgba(52,40,22,.85)';
      k.lineCap = 'round';
      k.lineWidth = 2.4 * e;
      k.beginPath();
      k.moveTo(x, base);
      k.quadraticCurveTo(x + 4 * e, base - alto * 0.4, x - 2 * e, base - alto * 0.6);
      k.stroke();
      // a folhagem: uma coluna fofa e torta de fiapos finos e caídos, que sobe do chão até a
      // copa (a tamargueira não tem copa redonda nem de guarda-chuva)
      for (let i = 0; i < 240; i++) {
        const t = r();
        const cx = x + (r() - 0.5) * alto * 0.55 * (0.4 + Math.sin(t * Math.PI) * 0.8) + Math.sin(t * 5) * 4 * e;
        const cy = base - alto * (0.12 + t * 0.88);
        const L = (5 + r() * 9) * e;
        const ld = r() < 0.5 ? -1 : 1;
        k.strokeStyle = 'rgba(60,64,38,' + (0.35 + r() * 0.45).toFixed(2) + ')';
        k.lineWidth = 0.9;
        k.beginPath();
        k.moveTo(cx, cy);
        k.quadraticCurveTo(cx + ld * L * 0.6, cy - L * 0.2, cx + ld * L * 0.8, cy + L * 0.7);
        k.stroke();
      }
    };
    // a margem de lá em moitas: grupos desiguais de tamargueiras, uns choupos altos e finos, e
    // entre eles só o mato baixo (nada de fila de árvores iguais)
    const choupo = (x, base, alto) => {
      k.strokeStyle = 'rgba(52,40,22,.85)';
      k.lineWidth = 2;
      k.beginPath();
      k.moveTo(x, base);
      k.lineTo(x + 1, base - alto * 0.3);
      k.stroke();
      const copa = new Path2D();
      copa.moveTo(x, base - alto);
      copa.bezierCurveTo(x + alto * 0.16, base - alto * 0.8, x + alto * 0.14, base - alto * 0.35, x + 2, base - alto * 0.25);
      copa.bezierCurveTo(x - alto * 0.12, base - alto * 0.35, x - alto * 0.14, base - alto * 0.8, x, base - alto);
      k.fillStyle = '#9a9a6a';
      k.fill(copa);
      gravar(k, copa, x, base - alto * 0.6, alto * 0.5, 1.45, 2.4, 1.2, (px) => 0.3 + (px - x + 10) / 40, '#2a2a14', 0);
      k.strokeStyle = 'rgba(30,30,14,.8)';
      k.lineWidth = 1;
      k.stroke(copa);
    };
    const mato = (x0, x1) => {
      for (let x = x0; x < x1; x += 3) {
        const h = 6 + r() * 10;
        k.strokeStyle = 'rgba(60,64,38,' + (0.4 + r() * 0.4).toFixed(2) + ')';
        k.lineWidth = 1;
        k.beginPath();
        k.moveTo(x, hz - 2);
        k.lineTo(x + (r() - 0.5) * 6, hz - 2 - h);
        k.stroke();
      }
    };
    mato(-10, W + 10);
    // cada moita: uma barra baixa e escura de arbusto em hachura, e por cima as tamargueiras de
    // alturas bem diferentes, umas por cima das outras
    for (const [x0, x1, n, a0] of [[0, 120, 4, 70], [150, 215, 2, 110], [250, 280, 1, 40], [440, 610, 6, 90], [625, 720, 3, 130], [770, 880, 3, 60]]) {
      const moita = pol([[x0, hz - 1], ...Array.from({ length: 12 }, (_, i) => { const x = x0 + ((x1 - x0) * i) / 11; return [x, hz - 8 - Math.sin((i / 11) * Math.PI) * (10 + r() * 10)]; }), [x1, hz - 1]]);
      k.fillStyle = '#8a8a5c';
      k.fill(moita);
      gravar(k, moita, (x0 + x1) / 2, hz - 10, (x1 - x0) / 2 + 20, 0.05, 2.4, 1.2, () => 0.6, '#2a2a14', 0);
      for (let i = 0; i < n; i++) tamargueira(x0 + 10 + r() * (x1 - x0 - 20), hz - 4, a0 * (0.5 + r() * 0.6), 0.7 + r() * 0.5);
    }
    void choupo;
    // o rio, visto rente: as ondulações compridas e mansas, cada vez mais juntas longe, a
    // corrente da esquerda para a direita; o reflexo das árvores em riscos de pé longe
    const rio = pol([[-10, hz + 2], [W + 10, hz + 2], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#b2ae90';
    k.fill(rio);
    const cx = 540;
    const cy = 456;
    k.save();
    k.clip(rio);
    k.lineCap = 'round';
    for (let y = hz + 3; y < H + 10; y += 1.8 + (y - hz) * 0.035) {
      const t = (y - hz) / (H - hz);
      let x = -20 - r() * 60;
      while (x < W + 20) {
        const c = (30 + r() * 80) * (0.3 + t * 1.8);
        // perto do ferro a água se abre em volta dele
        const d = Math.hypot((x + c / 2 - cx) / 2.4, y - cy);
        if (Math.hypot((x + c / 2 - cx + 30) / 4, y - cy - 10) > 56) {
          // o tom da água: mais escura rente à margem de lá e perto de quem olha, com umas faixas
          // mais claras de correnteza no meio
          const faixa = Math.sin((y - hz) * 0.022 + Math.sin(x * 0.004) * 1.5);
          const tom = 0.75 + Math.max(0, 1 - (y - hz) / 50) * 0.6 + t * 0.35 - Math.max(0, faixa) * 0.35;
          const claro = r() < 0.18 + Math.max(0, faixa) * 0.25;
          k.strokeStyle = claro ? 'rgba(248,246,230,.8)' : 'rgba(40,44,30,' + Math.min(0.95, (0.35 + t * 0.4) * tom).toFixed(2) + ')';
          k.lineWidth = (0.5 + t * 2) * (claro ? 0.8 : tom);
          k.beginPath();
          k.moveTo(x, y);
          k.quadraticCurveTo(x + c / 2, y - 1 - t * 4, x + c, y);
          k.stroke();
        }
        x += c + (4 + r() * 20) * (0.3 + t * 1.6);
      }
    }
    // o reflexo das tamargueiras, longe: riscos escuros de pé, quebrados
    const moitas = [[20, 110, 34], [150, 210, 40], [240, 270, 22], [450, 600, 40], [620, 720, 44], [780, 850, 30]];
    for (let x = 0; x < W; x += 3) {
      const m = moitas.find(([a, b]) => x >= a && x <= b);
      if (r() < (m ? 0.3 : 0.75)) continue;
      const L = m ? 10 + r() * m[2] : 4 + r() * 8;
      k.strokeStyle = 'rgba(60,62,40,.35)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(x, hz + 4);
      k.lineTo(x + (r() - 0.5) * 2, hz + 4 + L);
      k.stroke();
    }
    k.restore();
    // a esteira do ferro: dois braços de marolas partidas que se abrem rio abaixo
    k.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      for (const lado of [-1, 1]) {
        const x = cx + 120 + i * 46;
        const y = cy + 8 + lado * (12 + i * 9);
        const L = 26 - i * 1.5;
        k.strokeStyle = 'rgba(40,44,30,' + (0.8 - i * 0.07).toFixed(2) + ')';
        k.lineWidth = 2 - i * 0.18;
        k.beginPath();
        k.moveTo(x - L / 2, y - lado * 2);
        k.quadraticCurveTo(x, y + lado * 2, x + L / 2, y + lado * 3);
        k.stroke();
        k.strokeStyle = 'rgba(250,248,232,.85)';
        k.lineWidth = 1.2;
        k.beginPath();
        k.moveTo(x - L / 2 + 2, y - lado * 2 - 3);
        k.quadraticCurveTo(x, y + lado * 2 - 3, x + L / 2 - 2, y + lado * 3 - 3);
        k.stroke();
      }
    }
    // o ferro: a cunha de lado, a lâmina larga em leque à esquerda e o olho do cabo à direita
    // a grossura do ferro, vista de pouco acima: a beirada que fica fora d'água
    k.save();
    k.translate(cx, cy - 4);
    k.rotate(-0.04);
    k.scale(1.8, 0.95);
    const grossura = new Path2D();
    grossura.moveTo(-110, 48);
    grossura.quadraticCurveTo(-60, 22, -4, 14);
    grossura.lineTo(74, 22);
    grossura.lineTo(74, 30);
    grossura.lineTo(-4, 22);
    grossura.quadraticCurveTo(-60, 30, -110, 56);
    grossura.closePath();
    k.fillStyle = '#2a2620';
    k.fill(grossura);
    marcar(k, obj, grossura);
    k.restore();
    k.save();
    k.translate(cx, cy - 4);
    k.rotate(-0.04);
    k.scale(1.8, 0.95);
    const ferro = new Path2D();
    ferro.moveTo(-112, -50);
    ferro.quadraticCurveTo(-134, 0, -110, 48);
    ferro.quadraticCurveTo(-60, 22, -4, 14);
    ferro.lineTo(34, 16);
    ferro.lineTo(40, 22);
    ferro.lineTo(74, 22);
    ferro.quadraticCurveTo(82, 0, 74, -22);
    ferro.lineTo(40, -22);
    ferro.lineTo(34, -16);
    ferro.lineTo(-4, -14);
    ferro.quadraticCurveTo(-60, -22, -112, -50);
    ferro.closePath();
    k.fillStyle = '#5e5a50';
    k.fill(ferro);
    marcar(k, obj, ferro);
    gravar(k, ferro, -20, 0, 120, 0.1, 2.6, 1.8, (x, y) => 0.4 + y / 50 + Math.max(0, (-60 - x) / 200), '#121008', 0);
    k.save();
    k.clip(ferro);
    // a ferrugem: riscos ao longo das beiradas, em sépia
    k.strokeStyle = 'rgba(120,70,34,.6)';
    k.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) { const x = -100 + r() * 170; const y = (r() < 0.5 ? -1 : 1) * (12 + r() * 10); k.beginPath(); k.moveTo(x, y); k.lineTo(x + 6 + r() * 12, y + (r() - 0.5) * 3); k.stroke(); }
    k.strokeStyle = 'rgba(232,228,214,.9)';
    k.lineWidth = 2.4;
    k.beginPath();
    k.moveTo(-110, -46);
    k.quadraticCurveTo(-129, 0, -107, 44);
    k.stroke();
    k.strokeStyle = 'rgba(232,228,214,.5)';
    k.lineWidth = 1.4;
    k.beginPath();
    k.moveTo(-100, -44);
    k.quadraticCurveTo(-60, -20, -4, -12);
    k.lineTo(34, -14);
    k.stroke();
    k.restore();
    const olho = new Path2D();
    olho.ellipse(56, 0, 9, 14, 0, 0, 6.283);
    k.fillStyle = '#8a8668';
    k.fill(olho);
    k.strokeStyle = '#121008';
    k.lineWidth = 2;
    k.stroke(olho);
    k.lineWidth = 2.6;
    k.stroke(ferro);
    // a água por cima da metade de baixo: a linha d'água torta e, por baixo dela, o ferro
    // visto através da água (mais claro e esverdeado, as linhas do rio passando por cima)
    k.save();
    k.clip(ferro);
    const debaixo = pol([[-140, 12], ...Array.from({ length: 26 }, (_, i) => [-140 + i * 9, 10 + Math.sin(i * 1.1) * 3 + (i - 13) * 0.6]), [100, 26], [100, 90], [-140, 90]]);
    k.fillStyle = 'rgba(170,168,138,.86)';
    k.fill(debaixo);
    k.strokeStyle = 'rgba(40,44,30,.6)';
    k.lineWidth = 1;
    for (let y = 14; y < 60; y += 4) { k.beginPath(); k.moveTo(-140, y + (y - 14) * 0.1); k.lineTo(100, y + 14); k.stroke(); }
    k.restore();
    // a linha d'água atravessando o ferro, clara e torta
    k.strokeStyle = 'rgba(252,250,236,.95)';
    k.lineWidth = 1.6;
    k.beginPath();
    for (let i = 0; i < 26; i++) { const x = -140 + i * 9; const y = 10 + Math.sin(i * 1.1) * 3 + (i - 13) * 0.6; if (i) k.lineTo(x, y); else k.moveTo(x, y); }
    k.save();
    k.clip(ferro);
    k.stroke();
    k.restore();
    k.restore();
    // a linha d'água em volta do ferro: o menisco claro, partido, rente às beiradas, e as
    // marolinhas que lambem a lâmina e o olho (sem anel fechado)
    k.lineCap = 'round';
    for (const [a0, a1, rx, ry] of [[0.15, 1.2, 250, 34], [1.6, 2.9, 250, 34]]) {
      k.strokeStyle = 'rgba(252,250,236,.95)';
      k.lineWidth = 2;
      k.beginPath();
      k.ellipse(cx - 30, cy + 14, rx, ry, -0.04, a0, a1);
      k.stroke();
      k.strokeStyle = 'rgba(40,44,30,.7)';
      k.lineWidth = 1.3;
      k.beginPath();
      k.ellipse(cx - 30, cy + 18, rx + 14, ry + 8, -0.04, a0 + 0.1, a1 - 0.1);
      k.stroke();
    }
    // a vara que Eliseu cortou: um galho reto, de casca, as pontas cortadas claras e uma folha,
    // boiando torta perto do ferro, com a linha d'água ao longo
    const v0 = [cx - 420, cy + 150];
    const v1 = [cx - 190, cy + 104];
    vara(k, [v0, [(v0[0] + v1[0]) / 2, (v0[1] + v1[1]) / 2 + 6], v1], 14, '#7a5a34', obj);
    for (const [x, y] of [v0, v1]) {
      k.fillStyle = '#efdcae';
      k.beginPath();
      k.ellipse(x, y, 5, 8, 0.1, 0, 6.283);
      k.fill();
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.4;
      k.stroke();
    }
    k.strokeStyle = 'rgba(252,250,236,.9)';
    k.lineWidth = 1.8;
    k.beginPath();
    k.moveTo(v0[0] + 4, v0[1] + 8);
    k.lineTo((v0[0] + v1[0]) / 2, (v0[1] + v1[1]) / 2 + 14);
    k.lineTo(v1[0] + 4, v1[1] + 8);
    k.stroke();
    const folha = new Path2D();
    folha.moveTo(cx - 300, cy + 128);
    folha.quadraticCurveTo(cx - 284, cy + 100, cx - 252, cy + 98);
    folha.quadraticCurveTo(cx - 272, cy + 120, cx - 300, cy + 128);
    folha.closePath();
    k.fillStyle = '#8e9258';
    k.fill(folha);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.2;
    k.stroke(folha);
    marcar(k, obj, folha);
    // a margem de cá, em diagonal, no canto de baixo à esquerda: terra e capim, e o tronco
    // derrubado, com a casca em gravura, o corte em cunha do machado e os anéis na ponta
    const banco = pol([[-10, 600], [120, 640], [300, 720], [470, 800], [560, H + 10], [-10, H + 10]]);
    k.fillStyle = '#c4aa7c';
    k.fill(banco);
    chaoEmLinhas(k, r, banco, -10, 560, 580, H, 2, (x, y) => 0.35 + (y - 600) / 600);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(banco);
    k.strokeStyle = 'rgba(252,250,236,.8)';
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(-10, 594);
    k.lineTo(120, 634);
    k.lineTo(300, 714);
    k.lineTo(470, 794);
    k.stroke();
    marcar(k, obj, banco);
    const eixo = curvaPor([[-30, 790], [120, 740], [260, 700], [372, 676]], 3);
    const { forma: tronco } = tuboAo(eixo, (sx) => 66 - sx * 0.04);
    sombraNoChao(k, tronco, 10, 14, 8, 0.4);
    k.fillStyle = '#7a5a36';
    k.fill(tronco);
    marcar(k, obj, tronco);
    k.save();
    k.clip(tronco);
    // a casca: sulcos compridos ao longo, partidos, e o escuro embaixo
    for (let v = -0.9; v <= 0.9; v += 0.12) {
      let ant = null;
      for (const q of eixo) {
        const w = (66 - q.s * 0.04) / 2;
        const pt = [q.x - q.ty * v * w, q.y + q.tx * v * w + Math.sin(q.s * 0.2 + v * 7) * 1.2];
        if (ant && r() > 0.2) { k.strokeStyle = v > 0.2 ? 'rgba(30,18,6,.85)' : 'rgba(30,18,6,.55)'; k.lineWidth = 1 + Math.max(0, v) * 1.6; k.beginPath(); k.moveTo(ant[0], ant[1]); k.lineTo(pt[0], pt[1]); k.stroke(); }
        ant = pt;
      }
    }
    // o talho do machado: a cunha clara cortada no tronco
    const qT = eixo[Math.round(eixo.length * 0.55)];
    const talho = pol([[qT.x - 18, qT.y - 30], [qT.x + 16, qT.y - 34], [qT.x + 2, qT.y + 2]]);
    k.fillStyle = '#ecd2a0';
    k.fill(talho);
    gravar(k, talho, qT.x, qT.y - 16, 30, 0.6, 2.2, 0.9, () => 0.4, '#7a5a30', 0);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.4;
    k.stroke(talho);
    k.restore();
    k.strokeStyle = '#1e1208';
    k.lineWidth = 2.4;
    k.stroke(tronco);
    // a ponta cortada: os anéis da madeira
    const pf = eixo[eixo.length - 1];
    const corte = new Path2D();
    corte.ellipse(pf.x + 2, pf.y, 11, 26, -0.35, 0, 6.283);
    k.fillStyle = '#e8cc96';
    k.fill(corte);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(corte);
    k.lineWidth = 0.8;
    for (const f of [0.7, 0.45, 0.2]) { k.beginPath(); k.ellipse(pf.x + 2, pf.y, 11 * f, 26 * f, -0.35, 0, 6.283); k.stroke(); }
    // as lascas no chão
    for (let i = 0; i < 16; i++) {
      const x = 60 + r() * 360;
      const y = 760 + r() * 70 - (x - 60) * 0.05;
      k.save();
      k.translate(x, y);
      k.rotate(r() * 3);
      const p = pol([[-8, -2], [8, -4], [7, 3], [-6, 4]]);
      k.fillStyle = '#ecd4a0';
      k.fill(p);
      k.strokeStyle = SEPIA;
      k.lineWidth = 1;
      k.stroke(p);
      k.restore();
    }
    capim(k, r, 470, 790, 34, 12, 'rgba(70,52,24,.8)');
    capim(k, r, 30, 610, 30, 10, 'rgba(70,52,24,.8)');
    vinheta(k, W, H, 0.22);
  }

  // ---------- (7) A fornalha ardente (Dn 3.19-27) ----------
  // De noite, a grande fornalha de tijolo da Babilônia, aquecida sete vezes mais (3.19): a boca
  // em arco aberta, cheia de fogo do chão ao alto, as línguas lambendo a fachada por cima da
  // boca, e os tijolos em volta acesos de laranja. Dentro, só fogo, rolando de lado (ninguém
  // desenhado). Na soleira, as cordas que amarravam os três, soltas e inteiras, sem queimadura
  // (3.21, 3.25, 3.27).
  function desenhoFornalha(k, W, H, obj) {
    const r = sorteio(9701);
    k.fillStyle = '#1a120c';
    k.fillRect(0, 0, W, H);
    papelVelho(k, W, H, r, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'], [W / 2, H / 2], true);
    linhas(k, 0, 0, W, 240, 5, 1.2, (x, y) => 0.1 + (y / 240) * 0.3, 'rgba(236,200,150,.35)');
    estrelasDoCeu(k, r, 30, 20, W - 30, 160, 70);
    // a fornalha: um forno de tijolo enorme, em cúpula, que sai dos lados da prancha
    const cx = 444;
    const corpo = new Path2D();
    corpo.moveTo(-20, 720);
    corpo.lineTo(-20, 330);
    corpo.bezierCurveTo(60, 170, 250, 96, cx, 96);
    corpo.bezierCurveTo(638, 96, 828, 170, W + 20, 330);
    corpo.lineTo(W + 20, 720);
    corpo.closePath();
    const luzF = (x, y) => Math.max(0, 1 - Math.hypot((x - cx) / 1.1, (y - 480) * 1.1) / 430);
    muroEmFiadas(k, r, corpo, [-20, 90, W + 20, 730], { h: 20, cor: '#6a4428', tinta: '#140a04', sombra: (x, y) => 0.78 - luzF(x, y) * 0.72, traco: 1.4, larg: 2.4 });
    k.save();
    k.clip(corpo);
    // a curva da cúpula: hachura escura que acompanha o alto, mais cheia longe do fogo
    gravar(k, corpo, cx, 400, 520, 0.02, 3.6, 2.2, (x, y) => 0.7 - luzF(x, y) * 1.1 + Math.max(0, (Math.abs(x - cx) - 250) / 300), '#0c0602', 0.4);
    k.restore();
    k.strokeStyle = '#120804';
    k.lineWidth = 3;
    k.stroke(corpo);
    marcar(k, obj, corpo);
    // a boca em arco, grande, e o fogo lá dentro
    const bx0 = 262;
    const bx1 = 626;
    const by1 = 690;
    const by0 = 380;
    const boca = new Path2D();
    boca.moveTo(bx0, by1);
    boca.lineTo(bx0, by0 + 90);
    boca.quadraticCurveTo(bx0, by0 - 10, cx, by0 - 16);
    boca.quadraticCurveTo(bx1, by0 - 10, bx1, by0 + 90);
    boca.lineTo(bx1, by1);
    boca.closePath();
    // o arco de tijolos em pé (as aduelas) em volta da boca
    const aduelas = new Path2D();
    aduelas.moveTo(bx0 - 36, by1);
    aduelas.lineTo(bx0 - 36, by0 + 90);
    aduelas.quadraticCurveTo(bx0 - 36, by0 - 48, cx, by0 - 54);
    aduelas.quadraticCurveTo(bx1 + 36, by0 - 48, bx1 + 36, by0 + 90);
    aduelas.lineTo(bx1 + 36, by1);
    aduelas.closePath();
    k.fillStyle = '#a8622e';
    k.fill(aduelas);
    k.save();
    k.clip(aduelas);
    k.strokeStyle = '#2a1206';
    k.lineWidth = 1.6;
    for (let t = 0; t <= 1.0001; t += 1 / 22) {
      const a = Math.PI + t * Math.PI;
      k.beginPath();
      k.moveTo(cx + Math.cos(a) * 150, by0 + 70 + Math.sin(a) * 140);
      k.lineTo(cx + Math.cos(a) * 260, by0 + 70 + Math.sin(a) * 240);
      k.stroke();
    }
    for (let y = by0 + 90; y < by1; y += 20) { k.beginPath(); k.moveTo(bx0 - 40, y); k.lineTo(bx0, y); k.moveTo(bx1, y); k.lineTo(bx1 + 40, y); k.stroke(); }
    k.restore();
    k.strokeStyle = '#120804';
    k.lineWidth = 2.6;
    k.stroke(aduelas);
    marcar(k, obj, aduelas);
    // o fogo em gravura: línguas que sobem do leito de brasa em curva de S, largas no pé e
    // finas na ponta, tortas para fora e para a direita (a tiragem puxa a chama pela boca);
    // a hachura corre ao longo de cada língua, cheia nas beiradas e rala no meio, então cada
    // uma tem volume. Atrás vermelhas e escuras, na frente laranja e amarelas; o miolo branco.
    const chama = (x, y, alto, larg, vai, cor, tinta, claro, contorno, turb = 0.14, fase = r() * 6.28, pe = 0, volta = 0) => {
      const amp = larg * (0.18 + ((fase * 7.3) % 1) * 0.22);
      const pts = [];
      for (let i = 0; i <= 9; i++) {
        const t = i / 9;
        // a ponta que se dobra de volta por cima de si mesma (volta > 0)
        const u = Math.max(0, (t - 0.62) / 0.38);
        pts.push([x + vai * t * t + Math.sin(fase + t * 3.2) * amp * t - Math.sign(vai || 1) * volta * u * u * alto * 0.42, y - alto * t + volta * u * u * alto * 0.2]);
      }
      const c = curvaPor(pts, 3);
      const L = c[c.length - 1].s;
      const w = (s) => {
        const t = s / L;
        return larg * Math.pow(Math.max(0, 1 - t), 0.85) * (1 + turb * Math.sin(t * 11 + fase) + turb * 0.6 * Math.sin(t * 23 + fase * 2)) * (t < 0.08 ? 0.8 + t * 2.5 : 1) * (pe && t < pe ? 0.5 + (t / pe) * 0.5 : 1);
      };
      const { forma } = tuboAo(c, w);
      k.fillStyle = cor;
      k.fill(forma);
      k.save();
      k.clip(forma);
      k.strokeStyle = tinta;
      k.lineCap = 'round';
      for (let f = -0.5; f <= 0.5001; f += 0.1) {
        const peso = claro + Math.pow(Math.abs(f) * 2, 1.6) * 0.9;
        let ant = null;
        for (const q of c) {
          const t = q.s / L;
          const ww = w(q.s) / 2;
          const px = q.x - q.ty * f * 2 * ww;
          const py = q.y + q.tx * f * 2 * ww;
          const lw = 1.7 * Math.max(0, Math.min(1, peso * (1 - t * 0.5)));
          if (ant && lw > 0.2) {
            k.lineWidth = lw;
            k.beginPath();
            k.moveTo(ant[0], ant[1]);
            k.lineTo(px, py);
            k.stroke();
          }
          ant = [px, py];
        }
      }
      k.restore();
      if (contorno) {
        k.strokeStyle = contorno;
        k.lineWidth = 1.2;
        k.stroke(forma);
      }
      return forma;
    };
    const calor = (x, y) => Math.max(0, 1 - Math.hypot((x - cx) / 180, (y - 590) / 150));
    k.save();
    k.clip(boca);
    k.fillStyle = '#5a1a06';
    k.fill(boca);
    // a parede do fundo do forno, vermelha, em hachura deitada
    gravar(k, boca, cx, 520, 260, 0.04, 3, 1.4, (x, y) => 0.75 - calor(x, y) * 0.7, '#1e0602', 0);
    // as línguas grandes que vão sair pelo alto da boca: o pé delas fica aqui dentro. De
    // alturas bem diferentes, desencontradas, umas se juntando, uma bifurcada, duas com a
    // ponta dobrada de volta, as beiradas rasgadas
    const sai = [
      { x: 372, alto: 300, larg: 150, vai: -70, volta: 0, turb: 0.34 },
      { x: 404, alto: 470, larg: 200, vai: 30, volta: 0.9, turb: 0.26 },
      { x: 430, alto: 360, larg: 130, vai: -10, volta: 0, turb: 0.4 },
      { x: 470, alto: 540, larg: 230, vai: 150, volta: 0, turb: 0.3 },
      { x: 478, alto: 420, larg: 140, vai: 260, volta: 0, turb: 0.36 },
      { x: 530, alto: 280, larg: 120, vai: 120, volta: 0.7, turb: 0.42 },
      { x: 552, alto: 500, larg: 190, vai: 230, volta: 0.4, turb: 0.28 },
    ].map((q) => ({ ...q, fase: r() * 6.28 }));
    const passaSai = () => {
      const p = new Path2D();
      sai.forEach((q) => p.addPath(chama(q.x, by1, q.alto, q.larg, q.vai, 'rgba(192,68,20,.96)', '#3a0a02', 0.22, 'rgba(46,10,2,.75)', q.turb, q.fase, 0.45, q.volta)));
      sai.forEach((q, i) => {
        if (i % 3 !== 1) p.addPath(chama(q.x + 12, by1, q.alto * (0.6 + (i % 2) * 0.2), q.larg * 0.55, q.vai * 0.85, 'rgba(240,148,54,.96)', '#7a2406', 0.1, null, 0.22, q.fase + 1, 0.45, q.volta * 0.6));
      });
      return p;
    };
    // a fundura: a beirada do vão por dentro na sombra, em hachura (sem borrão), por baixo
    // das línguas, para nenhuma linha atravessar o fogo
    for (let d = 0; d < 34; d += 3.4) {
      k.strokeStyle = 'rgba(30,6,2,' + (0.6 - d / 60).toFixed(2) + ')';
      k.lineWidth = 3.2 - d / 12;
      const enc = new Path2D();
      enc.moveTo(bx0 + d, by1);
      enc.lineTo(bx0 + d, by0 + 90);
      enc.quadraticCurveTo(bx0 + d, by0 - 10 + d, cx, by0 - 16 + d);
      enc.quadraticCurveTo(bx1 - d, by0 - 10 + d, bx1 - d, by0 + 90);
      enc.lineTo(bx1 - d, by1);
      k.stroke(enc);
    }
    passaSai();
    for (let i = 0; i < 22; i++) {
      const x = bx0 - 10 + r() * (bx1 - bx0 + 20);
      chama(x, by1 + 10, 240 + r() * 120, 60 + r() * 50, 20 + r() * 70, 'rgba(168,52,16,.95)', '#2e0802', 0.25, 'rgba(40,8,2,.6)');
    }
    for (let i = 0; i < 16; i++) {
      const x = cx - 160 + r() * 300;
      chama(x, by1 + 10, 170 + r() * 130, 50 + r() * 40, 16 + r() * 60, 'rgba(230,124,40,.96)', '#6a1a04', 0.12, 'rgba(90,24,4,.5)');
    }
    for (let i = 0; i < 11; i++) {
      const x = cx - 110 + r() * 200;
      chama(x, by1 + 10, 110 + r() * 100, 40 + r() * 34, 10 + r() * 40, 'rgba(252,204,114,.97)', '#9a4a10', 0.05, null);
    }
    for (let i = 0; i < 7; i++) {
      const x = cx - 70 + r() * 130;
      chama(x, by1 + 6, 70 + r() * 70, 34 + r() * 24, 6 + r() * 24, 'rgba(255,248,228,.98)', '#d08a30', -0.15, null);
    }
    // o leito de brasa no chão do forno, em hachura cruzada acesa
    const leito = pol([[bx0, by1], [bx0 + 30, by1 - 26], [cx, by1 - 34], [bx1 - 30, by1 - 26], [bx1, by1]]);
    k.fillStyle = '#e88a34';
    k.fill(leito);
    gravar(k, leito, cx, by1 - 18, 220, 0.4, 3, 1.6, (x) => 0.6 - calor(x, by1 - 80) * 0.5, '#5a1404', 0);
    gravar(k, leito, cx, by1 - 18, 220, -0.6, 4, 1.2, (x) => 0.4 - calor(x, by1 - 80) * 0.4, '#5a1404', 0);
    k.restore();
    marcar(k, obj, boca);
    // o fogo que sai pelo alto da boca: as línguas nascem lá dentro e passam por cima do arco,
    // subindo e se abrindo para fora; mais para a direita, onde a tiragem leva (lado desigual)
    k.save();
    const fora = new Path2D();
    fora.rect(-20, -20, W + 40, H + 40);
    fora.addPath(boca);
    k.clip(fora, 'evenodd');
    const escapa = passaSai();
    k.restore();
    // uns fiapos soltos acima das pontas, que se desprendem e vão para a direita
    for (const [x, y, alto, larg, vai] of [[488, 196, 84, 30, 34], [700, 262, 70, 26, 40], [612, 214, 56, 20, 22]]) {
      escapa.addPath(chama(x, y, alto, larg, vai, 'rgba(226,112,36,.95)', '#4a1204', 0.2, 'rgba(46,10,2,.6)', 0.06, r() * 6.28, 0.35));
    }
    marcar(k, obj, escapa);
    // a soleira de pedra e o chão de tijolo, acesos pelo fogo
    const chao = pol([[-10, 690], [W + 10, 690], [W + 10, H + 10], [-10, H + 10]]);
    muroEmFiadas(k, r, chao, [-10, 690, W + 10, H + 10], { h: 22, cor: '#5c3a22', tinta: '#120804', sombra: (x, y) => 0.8 - luzF(x, y - 120) * 0.8, traco: 1.4, larg: 3 });
    const soleira = pol([[bx0 - 60, 690], [bx1 + 60, 690], [bx1 + 80, 716], [bx0 - 80, 716]]);
    peca(k, soleira, [bx0 - 80, 688, bx1 + 80, 718], { cor: '#c8925a', tinta: '#1a0c04', ang: 0.05, passo: 3.2, maxL: 1.4, sombra: (x, y) => 0.25 + (y - 690) / 40, cruzada: 0.8, traco: 2.2, obj });
    // as cordas soltas na soleira e no chão: de cânhamo claro, inteiras, de pontas desfiadas,
    // jogadas em voltas frouxas (umas sobre as outras, sem dois laços iguais)
    const corda = (pts) => {
      const c = curvaPor(pts, 3);
      cordao(k, c.map((q) => [q.x, q.y]), 9, { cor: '#e2c894', escuro: '#2a1a0a', luz: 'rgba(255,240,200,.85)' });
      const { forma } = tuboAo(c, () => 12);
      marcar(k, obj, forma);
      // as pontas desfiadas
      for (const q of [c[0], c[c.length - 1]]) {
        k.strokeStyle = '#e2c894';
        k.lineWidth = 1.4;
        for (let i = 0; i < 5; i++) {
          const a = Math.atan2(q.ty, q.tx) + (q === c[0] ? Math.PI : 0) + (r() - 0.5) * 0.9;
          k.beginPath();
          k.moveTo(q.x, q.y);
          k.lineTo(q.x + Math.cos(a) * (8 + r() * 8), q.y + Math.sin(a) * (8 + r() * 8));
          k.stroke();
        }
      }
    };
    corda([[170, 742], [240, 724], [316, 734], [360, 712], [336, 694], [292, 700], [304, 728], [392, 750], [460, 742]]);
    corda([[496, 748], [556, 730], [616, 740], [686, 724], [732, 740], [712, 760], [646, 764]]);
    corda([[300, 766], [380, 770], [450, 762]]);
    // fagulhas no ar
    k.fillStyle = 'rgba(255,220,150,.95)';
    for (let i = 0; i < 70; i++) { const x = cx + (r() - 0.5) * 560; const y = 120 + r() * 300; k.beginPath(); k.arc(x, y, 0.7 + r() * 1.6, 0, 6.283); k.fill(); }
    vinheta(k, W, H, 0.35);
  }
  // ---------- (8) Jonas e o grande peixe (Jn 1.15-17, 2.3-6) ----------
  // Visto de fora, em corte: em cima, o mar que acaba de se aquietar (1.15), de ondas longas, e o
  // navio pequeno indo embora no horizonte; embaixo da linha d'água, o fundo verde-escuro do
  // mar, e o grande peixe descendo, enorme, de boca fechada, entre as algas (2.5) e as pedras
  // do fundo (2.6). Ninguém desenhado: Jonas está dentro do peixe (1.17).
  function desenhoJonas(k, W, H, obj) {
    const r = sorteio(9801);
    papelVelho(k, W, H, r, ['#f4eedb', '#e0d6b8', '#bfb08c'], [640, 80]);
    const hz = 150;
    const nivel = 262;
    // o céu que limpa: linhas ralas, mais cheias à esquerda (a tempestade que vai embora)
    linhas(k, 0, 0, W, hz, 4.6, 1.5, (x, y) => 0.12 + Math.max(0, (400 - x) / 600) * 0.6 + (1 - y / hz) * 0.15);
    // o navio, pequeno, indo embora: o casco, o mastro e a vela cheia
    {
      const nx = 690;
      const ny = hz + 4;
      const casco = pol([[nx - 40, ny - 10], [nx + 44, ny - 12], [nx + 30, ny + 2], [nx - 30, ny + 2]]);
      k.fillStyle = '#3a2a1a';
      k.fill(casco);
      vara(k, [[nx, ny - 10], [nx + 2, ny - 62]], 2.4, '#5a4026');
      const vela = pol([[nx - 22, ny - 58], [nx + 26, ny - 60], [nx + 30, ny - 20], [nx - 20, ny - 18]]);
      peca(k, vela, [nx - 22, ny - 62, nx + 30, ny - 18], { cor: '#efe2c0', ang: 1.4, passo: 2.6, maxL: 1, sombra: (x) => 0.2 + (x - nx + 20) / 100, cruzada: 1, traco: 1.4 });
      marcar(k, obj, casco);
      marcar(k, obj, vela);
    }
    // o mar de cima: ondas longas e mansas, já sem espuma
    const sup = pol([[-10, hz], [W + 10, hz], [W + 10, nivel], [-10, nivel]]);
    k.fillStyle = '#c8c3a6';
    k.fill(sup);
    k.save();
    k.clip(sup);
    k.strokeStyle = SEPIA;
    k.lineCap = 'round';
    for (let y = hz + 3; y < nivel; y += 2.4 + (y - hz) * 0.05) {
      const t = (y - hz) / (nivel - hz);
      let x = -20 - r() * 40;
      while (x < W + 20) {
        const c = (40 + r() * 90) * (0.5 + t);
        k.lineWidth = 0.6 + t * 1.6;
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x + c / 2, y - 2 - t * 6, x + c, y);
        k.stroke();
        x += c + 6 + r() * 26;
      }
    }
    k.restore();
    // a linha d'água do corte, ondulada, clara
    const ondaN = (x) => nivel + Math.sin(x * 0.018) * 8 + Math.sin(x * 0.051 + 1) * 3;
    // o fundo do mar: verde-escuro, mais fundo embaixo, em linhas deitadas
    const fundo = pol([[-10, ondaN(-10)], ...Array.from({ length: 46 }, (_, i) => [i * 20 - 6, ondaN(i * 20 - 6)]), [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#3d4a40';
    k.fill(fundo);
    marcar(k, obj, fundo);
    k.save();
    k.clip(fundo);
    linhas(k, 0, nivel - 10, W, H, 3.4, 1.6, (x, y) => 0.25 + (y - nivel) / 700, 'rgba(14,22,18,.9)');
    // os feixes de luz que descem da superfície, retos e ralos, que somem no fundo
    for (let i = 0; i < 9; i++) {
      const x0 = 80 + i * 92 + (r() - 0.5) * 40;
      const p = pol([[x0, nivel], [x0 + 26, nivel], [x0 + 110, H], [x0 + 60, H]]);
      k.save();
      k.filter = 'blur(6px)';
      k.fillStyle = 'rgba(200,220,190,.12)';
      k.fill(p);
      k.restore();
    }
    // as pedras do fundo (a base das montanhas, 2.6), escuras, e as algas compridas que sobem
    const fundoY = (x) => 770 + Math.sin(x * 0.012) * 24 + Math.sin(x * 0.04) * 8;
    const chao = pol([[-10, fundoY(-10)], ...Array.from({ length: 46 }, (_, i) => [i * 20 - 6, fundoY(i * 20 - 6)]), [W + 10, H + 10], [-10, H + 10]]);
    peca(k, chao, [-10, 720, W + 10, H + 10], { cor: '#2c342c', tinta: '#0a0e0a', ang: 0.2, passo: 3, maxL: 1.8, sombra: () => 0.75, cruzada: 0.6, traco: 2 });
    for (const [x, y, s0] of [[90, 770, 46], [250, 790, 34], [600, 780, 52], [780, 760, 40], [430, 800, 30]]) {
      const p = seixo(r, x, y, s0, s0 * 0.6, 0, 0.16);
      peca(k, p, [x - s0, y - s0, x + s0, y + s0], { cor: '#3c463a', tinta: '#0a0e0a', ang: 0.6, passo: 3, maxL: 1.6, sombra: sombraOval(x, y, s0, s0 * 0.6, 0), cruzada: 0.7, traco: 1.8 });
    }
    const alga = (x, base, alto, fase, passo = 0.11, larg = 18) => {
      k.strokeStyle = 'rgba(80,98,62,.95)';
      k.lineCap = 'round';
      k.lineWidth = 3.4;
      k.beginPath();
      for (let t = 0; t <= 1.0001; t += 0.04) {
        const xx = x + Math.sin(t * 5 + fase) * 16 * t;
        const yy = base - t * alto;
        if (t === 0) k.moveTo(xx, yy); else k.lineTo(xx, yy);
      }
      k.stroke();
      for (let t = 0.12 + fase * 0.02; t < 1; t += passo) {
        const xx = x + Math.sin(t * 5 + fase) * 16 * t;
        const yy = base - t * alto;
        const ld = (t * 9 + fase) % 2 > 1 ? 1 : -1;
        const fl = new Path2D();
        fl.moveTo(xx, yy);
        fl.quadraticCurveTo(xx + ld * larg, yy - 4, xx + ld * larg * 1.45, yy - larg);
        fl.quadraticCurveTo(xx + ld * larg * 0.45, yy - larg * 0.55, xx, yy);
        k.fillStyle = 'rgba(96,114,70,.9)';
        k.fill(fl);
        k.strokeStyle = 'rgba(20,28,14,.9)';
        k.lineWidth = 1;
        k.stroke(fl);
      }
    };
    for (const [x, a, f, ps, lg] of [[60, 260, 0, 0.09, 16], [130, 200, 1.4, 0.15, 22], [320, 150, 2.2, 0.2, 14], [690, 220, 0.6, 0.12, 20], [760, 300, 2.9, 0.08, 15], [830, 180, 1.1, 0.17, 24]]) alga(x, fundoY(x) + 4, a, f, ps, lg);
    k.restore();
    // a linha d'água: o traço claro da superfície vista de lado
    k.strokeStyle = 'rgba(240,238,220,.9)';
    k.lineWidth = 2.4;
    k.beginPath();
    for (let x = -10; x <= W + 10; x += 6) { const y = ondaN(x); if (x === -10) k.moveTo(x, y); else k.lineTo(x, y); }
    k.stroke();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.2;
    k.beginPath();
    for (let x = -10; x <= W + 10; x += 6) { const y = ondaN(x) + 3; if (x === -10) k.moveTo(x, y); else k.lineTo(x, y); }
    k.stroke();
    // o grande peixe: enorme, de lado, descendo para a esquerda, de corpo alto como o de uma
    // garoupa: a cabeça grande, a boca comprida e fechada (o queixo um pouco para fora), as
    // costas escuras e a barriga clara, as escamas, as barbatanas de raios e a cauda em leque
    k.save();
    k.translate(440, 520);
    k.rotate(-0.13);
    k.scale(0.96, 0.96);
    k.translate(-470, -520);
    const perfil = curvaPor([[140, 520], [170, 470], [230, 428], [320, 398], [430, 384], [540, 392], [640, 420], [720, 452], [770, 470], [772, 500], [726, 520], [640, 560], [530, 604], [420, 626], [310, 620], [230, 596], [176, 568], [150, 548], [140, 520]], 3);
    const peixe = pol(perfil.map((q) => [q.x, q.y]));
    // uma barbatana: a membrana clara entre a base (no corpo) e a beirada, e os raios finos que
    // vão de uma à outra, sem se cruzar
    const barb = (base, borda, cor = '#7c846c') => {
      const p = pol([...base, ...borda.slice().reverse()]);
      k.fillStyle = cor;
      k.fill(p);
      marcar(k, obj, p);
      const cb = curvaPor(base, 2);
      const ce = curvaPor(borda, 2);
      k.strokeStyle = 'rgba(12,16,10,.8)';
      k.lineWidth = 1.2;
      for (let t = 0; t <= 1.0001; t += 1 / 12) {
        const qa = cb[Math.round(t * (cb.length - 1))];
        const qb = ce[Math.round(t * (ce.length - 1))];
        k.beginPath();
        k.moveTo(qa.x, qa.y);
        k.quadraticCurveTo((qa.x + qb.x) / 2 + 4, (qa.y + qb.y) / 2, qb.x, qb.y);
        k.stroke();
      }
      k.strokeStyle = '#0c100a';
      k.lineWidth = 2;
      k.beginPath();
      ce.forEach((q, i) => (i ? k.lineTo(q.x, q.y) : k.moveTo(q.x, q.y)));
      k.stroke();
    };
    // a cauda, a barbatana das costas e a de baixo, atrás do corpo
    barb([[756, 470], [764, 486], [758, 502]], [[820, 392], [850, 440], [836, 488], [852, 540], [818, 584]]);
    barb([[340, 402], [440, 386], [540, 392], [640, 420], [700, 446]], [[352, 352], [430, 328], [520, 334], [610, 372], [690, 428]]);
    barb([[540, 600], [600, 580], [660, 556]], [[560, 650], [620, 640], [670, 576]]);
    k.fillStyle = '#727a66';
    k.fill(peixe);
    marcar(k, obj, peixe);
    k.save();
    k.clip(peixe);
    // o tom: escuro nas costas, claro na barriga, em linhas que acompanham o corpo
    gravar(k, peixe, 460, 510, 340, -0.05, 3.2, 2.4, (x, y) => 0.95 - (y - 390) / 230 * 0.9, '#10140c', 0.25);
    gravar(k, peixe, 460, 510, 340, 0.9, 4.6, 1.6, (x, y) => 0.75 - (y - 390) / 200, '#10140c', 0);
    // as escamas, em fileiras desencontradas, do corpo para trás (não na cabeça)
    k.strokeStyle = 'rgba(14,18,12,.7)';
    k.lineWidth = 1.1;
    for (let x = 330; x < 760; x += 15) {
      const fila = Math.round(x / 15) % 2;
      for (let y = 390 + fila * 7; y < 630; y += 14) {
        k.beginPath();
        k.arc(x, y, 8, Math.PI * 0.6, Math.PI * 1.4);
        k.stroke();
      }
    }
    // as manchas de garoupa nas costas
    for (let i = 0; i < 26; i++) {
      k.fillStyle = 'rgba(20,24,16,.45)';
      k.beginPath();
      k.ellipse(300 + r() * 420, 410 + r() * 90, 6 + r() * 10, 4 + r() * 6, 0, 0, 6.283);
      k.fill();
    }
    k.restore();
    // a linha do lado
    k.strokeStyle = 'rgba(232,228,200,.65)';
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(300, 440);
    k.bezierCurveTo(420, 420, 600, 440, 760, 486);
    k.stroke();
    k.strokeStyle = '#0c100a';
    k.lineWidth = 2.8;
    k.stroke(peixe);
    // a tampa da guelra
    k.lineWidth = 2.4;
    k.beginPath();
    k.moveTo(300, 404);
    k.bezierCurveTo(334, 470, 330, 560, 290, 616);
    k.stroke();
    k.lineWidth = 1.4;
    k.beginPath();
    k.moveTo(278, 414);
    k.bezierCurveTo(306, 470, 302, 550, 268, 606);
    k.stroke();
    // a boca: comprida e fechada, quase reta, caindo um pouco para trás; o queixo de baixo
    // passa um pouco da de cima
    k.lineWidth = 2.6;
    k.beginPath();
    k.moveTo(142, 528);
    k.bezierCurveTo(170, 534, 210, 542, 248, 552);
    k.stroke();
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(150, 546);
    k.quadraticCurveTo(190, 560, 236, 566);
    k.stroke();
    // a narina e o olho, redondo e pequeno, sem sobrancelha
    k.fillStyle = '#0c100a';
    k.beginPath();
    k.arc(186, 486, 3, 0, 6.283);
    k.fill();
    k.fillStyle = '#cbbd86';
    k.beginPath();
    k.arc(232, 468, 11, 0, 6.283);
    k.fill();
    k.lineWidth = 2;
    k.stroke();
    k.fillStyle = '#0a0c08';
    k.beginPath();
    k.arc(230, 469, 6, 0, 6.283);
    k.fill();
    // a barbatana do peito, por cima do corpo
    barb([[330, 514], [340, 540], [352, 560]], [[400, 520], [440, 556], [432, 594]], '#6a7460');
    // umas bolhas que saem da fenda da guelra e sobem, poucas e desencontradas
    for (const [x, y, rr] of [[306, 420, 4], [298, 396, 6], [312, 372, 3], [300, 346, 5], [314, 318, 3.5]]) {
      k.strokeStyle = 'rgba(224,232,214,.85)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.arc(x, y, rr, 0, 6.283);
      k.stroke();
    }
    k.restore();
    vinheta(k, W, H, 0.24);
  }

  // ---------- (9) A tempestade acalmada (Mc 4.37-39) ----------
  // De dentro do barco, olhando para a popa, logo depois da ordem "Aquiete-se!": o mar liso
  // como espelho até o horizonte e as nuvens da tempestade se desfazendo para os lados. No
  // barco, a água que entrou ainda no fundo (4.37), os remos largados, um balde de couro e, na
  // popa, a almofada (4.38), com a dobra de quem dormiu. Ninguém desenhado.
  function desenhoTempestade(k, W, H, obj) {
    const r = sorteio(9901);
    papelVelho(k, W, H, r, ['#ece4cc', '#e2d8b8', '#bcae88'], [444, -300]);
    const hz = 330;
    // o céu: claro no meio, onde abre; as nuvens pesadas indo embora pelos lados e por cima,
    // em massas gravadas (hachura cruzada), de beirada rasgada e clara do lado da luz
    linhas(k, 0, 0, W, hz, 5, 1.2, (x, y) => 0.2 + Math.min(1, Math.hypot(x - 444, (y - 300) * 1.4) / 700) * 0.35);
    // cada nuvem é um punhado de bolos sobrepostos, feita só de hachura (sem contorno): mais
    // escura embaixo e para fora, a beirada do lado da luz deixada no papel
    const nuvem = (cx, cy, rx, ry) => {
      const p = new Path2D();
      for (let i = 0; i < 9; i++) p.addPath(seixo(r, cx + (r() - 0.5) * rx * 1.5, cy + (r() - 0.5) * ry * 0.8, rx * (0.3 + r() * 0.3), ry * (0.4 + r() * 0.3), (r() - 0.5) * 0.15, 0.1));
      const fora = (x) => Math.min(1, Math.abs(x - 444) / 420);
      gravar(k, p, cx, cy, Math.max(rx, ry) * 1.3, 0.12, 3.2, 2.4, (x, y) => 0.25 + fora(x) * 0.6 + (y - cy) / ry * 0.3, '#1e180e', 0.1);
      gravar(k, p, cx, cy, Math.max(rx, ry) * 1.3, 1.25, 4.4, 1.6, (x, y) => fora(x) * 0.8 + (y - cy) / ry * 0.25 - 0.1, '#1e180e', 0);
      marcar(k, obj, p);
    };
    for (const [cx, cy, rx, ry] of [[60, 70, 300, 80], [830, 60, 300, 76], [10, 200, 200, 46], [880, 190, 200, 50], [260, 6, 260, 44], [640, 10, 240, 40]]) nuvem(cx, cy, rx, ry);
    // os fiapos que se desfazem no meio do céu
    k.strokeStyle = 'rgba(60,52,36,.55)';
    k.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const lado = i % 2 ? 1 : -1;
      const x0 = 444 + lado * (180 + r() * 120);
      const y0 = 60 + r() * 200;
      k.lineWidth = 2 + r() * 2;
      k.beginPath();
      k.moveTo(x0, y0);
      k.quadraticCurveTo(x0 - lado * 40, y0 + 6, x0 - lado * (70 + r() * 50), y0 + 2);
      k.stroke();
    }
    // o mar liso: linhas longas e finas, quase retas, e o reflexo claro do céu aberto
    const mar = pol([[-10, hz], [W + 10, hz], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#ddd6bc';
    k.fill(mar);
    k.save();
    k.clip(mar);
    k.strokeStyle = SEPIA;
    for (let y = hz + 2; y < H; y += 2.2 + (y - hz) * 0.03) {
      const t = (y - hz) / (H - hz);
      let x = -10 - r() * 40;
      while (x < W + 10) {
        const c = 160 + r() * 340;
        const meio = Math.abs(x + c / 2 - 444) < 120;
        k.lineWidth = (0.4 + t * 1.2) * (meio ? 0.4 : 1);
        k.beginPath();
        k.moveTo(x, y);
        k.lineTo(x + c, y + (r() - 0.5));
        k.stroke();
        x += c + 10 + r() * 40;
      }
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.4;
    k.beginPath();
    k.moveTo(-10, hz);
    k.lineTo(W + 10, hz);
    k.stroke();
    // o barco, de dentro: as duas bordas que vêm dos cantos de baixo e se juntam na popa, alta
    const popa = [444, 352];
    const bordaE = curvaPor([[-30, 700], [80, 590], [220, 470], [350, 392], [430, 356], [444, 352]], 4);
    const bordaD = curvaPor([[918, 700], [808, 590], [668, 470], [538, 392], [458, 356], [444, 352]], 4);
    const fundoB = curvaPor([[-30, 900], [200, 760], [340, 620], [420, 520], [444, 470]], 4);
    const fundoD = curvaPor([[918, 900], [688, 760], [548, 620], [468, 520], [444, 470]], 4);
    // o costado por dentro (as tábuas), de cada lado
    const ladoE = pol([...bordaE.map((q) => [q.x, q.y]), ...fundoB.slice().reverse().map((q) => [q.x, q.y])]);
    const ladoD = pol([...bordaD.map((q) => [q.x, q.y]), ...fundoD.slice().reverse().map((q) => [q.x, q.y])]);
    for (const [p, lado] of [[ladoE, -1], [ladoD, 1]]) {
      k.fillStyle = '#7a5634';
      k.fill(p);
      marcar(k, obj, p);
      k.save();
      k.clip(p);
      // as tábuas: linhas que acompanham a borda e correm para a popa
      for (let j = 1; j < 9; j++) {
        const t = j / 9;
        const a = lado < 0 ? bordaE : bordaD;
        const b = lado < 0 ? fundoB : fundoD;
        k.strokeStyle = 'rgba(30,16,6,.85)';
        k.lineWidth = 1.6;
        k.beginPath();
        for (let i = 0; i <= 40; i++) {
          const u = i / 40;
          const qa = a[Math.round(u * (a.length - 1))];
          const qb = b[Math.round(u * (b.length - 1))];
          const x = qa.x + (qb.x - qa.x) * t;
          const y = qa.y + (qb.y - qa.y) * t;
          if (i) k.lineTo(x, y); else k.moveTo(x, y);
        }
        k.stroke();
      }
      gravar(k, p, 444 + lado * 260, 620, 420, lado < 0 ? -0.75 : 0.75, 3.6, 1.4, (x, y) => 0.35 + (y - 400) / 700, '#1e1006', 0);
      // as cavernas (as costelas do barco), de través
      for (const u of [0.18, 0.4, 0.62]) {
        const a = lado < 0 ? bordaE : bordaD;
        const b = lado < 0 ? fundoB : fundoD;
        const qa = a[Math.round(u * (a.length - 1))];
        const qb = b[Math.round(u * (b.length - 1))];
        vara(k, [[qa.x, qa.y], [qb.x, qb.y]], 16 - u * 14, '#8e6a42');
      }
      k.restore();
    }
    // o fundo do barco entre os costados, com a água que entrou, rasa, refletindo o céu
    const piso = pol([...fundoB.map((q) => [q.x, q.y]), ...fundoD.slice().reverse().map((q) => [q.x, q.y]), [918, H + 20], [-30, H + 20]]);
    k.fillStyle = '#6e4e30';
    k.fill(piso);
    marcar(k, obj, piso);
    k.save();
    k.clip(piso);
    gravar(k, piso, 444, 760, 500, 0, 3.6, 1.6, () => 0.6, '#1e1006', 0);
    for (let x = -20; x < W + 20; x += 54) { k.strokeStyle = 'rgba(30,16,6,.8)'; k.lineWidth = 1.6; k.beginPath(); k.moveTo(444 + (x - 444) * 0.08, 470); k.lineTo(x, H + 20); k.stroke(); }
    // a água que entrou: uma lâmina rasa no fundo, deitada entre as tábuas (que aparecem por
    // baixo dela), com as ondinhas e o reflexo das cavernas, e a beirada molhada e torta
    const agua = pol(Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * 6.283; const f = 1 + Math.sin(a * 3 + 1) * 0.08 + Math.sin(a * 5) * 0.05; return [444 + Math.cos(a) * 250 * f, 700 + Math.sin(a) * 46 * f]; }));
    k.fillStyle = 'rgba(132,132,112,.45)';
    k.fill(agua);
    k.save();
    k.clip(agua);
    k.lineCap = 'round';
    for (let y = 656; y < 750; y += 3.6) {
      let x = 180 + r() * 30;
      while (x < 710) {
        const c = 16 + r() * 40;
        k.strokeStyle = r() < 0.3 ? 'rgba(250,246,226,.7)' : 'rgba(43,33,18,.45)';
        k.lineWidth = 1;
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x + c / 2, y - 1.6, x + c, y);
        k.stroke();
        x += c + 12 + r() * 30;
      }
    }
    // o reflexo das cavernas: traços escuros, quebrados, que descem da beirada
    for (const x0 of [262, 330, 558, 626]) {
      for (let y = 664; y < 744; y += 6) { if (r() < 0.35) continue; k.strokeStyle = 'rgba(40,24,10,.55)'; k.lineWidth = 3; k.beginPath(); k.moveTo(x0 + (r() - 0.5) * 4, y); k.lineTo(x0 + (r() - 0.5) * 4 + 8, y); k.stroke(); }
    }
    k.restore();
    k.strokeStyle = 'rgba(30,16,6,.55)';
    k.lineWidth = 1.2;
    k.stroke(agua);
    k.restore();
    // as bordas (as falcas), grossas e claras em cima
    for (const b of [bordaE, bordaD]) {
      const { forma } = tuboAo(b, (s) => 30 - s * 0.03);
      k.fillStyle = '#a07a4c';
      k.fill(forma);
      gravar(k, forma, 444, 520, 520, 0.6, 3.6, 1.3, (x, y) => 0.3 + (y - 352) / 900, '#1e1006', 0);
      k.strokeStyle = '#1a0e04';
      k.lineWidth = 2.2;
      k.stroke(forma);
      marcar(k, obj, forma);
    }
    // a popa: o banco de trás, alto, e a almofada de couro em cima, com a dobra de quem dormiu
    // o banco da popa e a almofada, um pouco maiores, para a almofada ler
    k.save();
    k.translate(444, 450);
    k.scale(1.35, 1.35);
    k.translate(-444, -450);
    const banco = pol([[372, 420], [516, 420], [530, 446], [358, 446]]);
    peca(k, banco, [358, 418, 530, 448], { cor: '#9a7448', tinta: '#1a0e04', ang: 0.05, passo: 2.8, maxL: 1.4, sombra: (x, y) => 0.3 + (y - 420) / 40, cruzada: 0.8, traco: 2, obj });
    const frenteBanco = pol([[358, 446], [530, 446], [522, 486], [366, 486]]);
    peca(k, frenteBanco, [358, 446, 530, 486], { cor: '#6e4e30', tinta: '#1a0e04', ang: 1.5, passo: 3, maxL: 1.6, sombra: () => 0.7, cruzada: 0.7, traco: 2, obj });
    // a almofada: um saco de couro chato e gasto, em cima do banco, mais largo que alto, com
    // a costura em volta, as rugas e a cova rasa onde a cabeça ficou (Mc 4.38)
    const topo = new Path2D();
    topo.moveTo(384, 414);
    topo.bezierCurveTo(390, 398, 420, 394, 446, 395);
    topo.bezierCurveTo(476, 394, 502, 398, 506, 414);
    topo.bezierCurveTo(508, 424, 504, 430, 498, 432);
    topo.bezierCurveTo(470, 436, 420, 436, 392, 432);
    topo.bezierCurveTo(384, 430, 380, 422, 384, 414);
    topo.closePath();
    const lado = new Path2D();
    lado.moveTo(392, 432);
    lado.bezierCurveTo(420, 436, 470, 436, 498, 432);
    lado.lineTo(500, 440);
    lado.bezierCurveTo(470, 445, 420, 445, 390, 440);
    lado.closePath();
    k.fillStyle = '#6a4a2c';
    k.fill(lado);
    k.fillStyle = '#a07c54';
    k.fill(topo);
    gravar(k, topo, 445, 414, 70, 0.1, 2.8, 1.2, (x, y) => 0.2 + (y - 396) / 60 + Math.max(0, (x - 470) / 120), '#2a1608', 0.15);
    // a cova: mais escura, um pouco fora do meio, com a beirada de baixo acesa
    const cova = new Path2D();
    cova.ellipse(432, 414, 30, 9, -0.05, 0, 6.283);
    k.save();
    k.clip(cova);
    k.filter = 'blur(3px)';
    k.fillStyle = 'rgba(60,34,14,.22)';
    k.fill(cova);
    k.filter = 'none';
    gravar(k, cova, 432, 414, 34, 0.1, 2.2, 1.1, (x, y) => 0.1 + (y - 407) / 16, '#2a1608', 0);
    k.restore();
    k.strokeStyle = 'rgba(250,230,190,.6)';
    k.lineWidth = 1.2;
    k.beginPath();
    k.ellipse(432, 416, 26, 7, -0.05, Math.PI + 0.3, Math.PI * 2 - 0.3);
    k.stroke();
    k.strokeStyle = 'rgba(42,22,8,.5)';
    k.lineWidth = 1;
    k.beginPath();
    k.ellipse(432, 414, 30, 9, -0.05, Math.PI + 0.6, Math.PI * 2 - 0.6);
    k.stroke();
    // as rugas que saem da cova
    k.strokeStyle = 'rgba(42,22,8,.7)';
    k.lineWidth = 1;
    for (const [x0, y0, x1, y1] of [[402, 412, 390, 420], [462, 410, 482, 404], [460, 418, 488, 424], [420, 406, 410, 400]]) { k.beginPath(); k.moveTo(x0, y0); k.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 2, x1, y1); k.stroke(); }
    // a costura em volta
    k.setLineDash([3, 3]);
    k.strokeStyle = 'rgba(42,22,8,.7)';
    k.beginPath();
    k.moveTo(390, 426);
    k.bezierCurveTo(420, 431, 470, 431, 500, 426);
    k.stroke();
    k.setLineDash([]);
    k.strokeStyle = '#2a1608';
    k.lineWidth = 1.8;
    k.stroke(topo);
    k.stroke(lado);
    marcar(k, obj, topo);
    marcar(k, obj, lado);
    k.restore();
    // o cadaste: a peça alta da popa que sobe e se curva, por trás da almofada
    vara(k, [[444, 360], [446, 320], [456, 292], [470, 280]], 14, '#8e6a42', obj);
    // o remo de governo, de lado, e os remos largados no fundo
    vara(k, [[520, 400], [600, 470], [720, 560]], 12, '#9a7650', obj);
    vara(k, [[120, 830], [300, 640], [380, 560]], 13, '#a07c52', obj);
    vara(k, [[620, 846], [560, 700], [530, 600]], 12, '#93704a', obj);
    // o balde de aduelas, tombado, com a água que saiu dele
    k.save();
    k.translate(664, 742);
    k.rotate(-0.35);
    const corpoB = pol([[-50, -30], [42, -36], [42, 36], [-50, 30]]);
    sombraNoChao(k, corpoB, 6, 8, 5, 0.4);
    k.fillStyle = '#8a6440';
    k.fill(corpoB);
    k.save();
    k.clip(corpoB);
    for (let i = -3; i <= 3; i++) {
      const y = i * 10;
      k.strokeStyle = 'rgba(30,16,6,.8)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(-50, y * 0.85);
      k.lineTo(42, y);
      k.stroke();
    }
    gravar(k, corpoB, 0, 0, 60, 0.05, 3, 1.4, (x, y) => 0.3 + (y + 30) / 70, '#1e1006', 0);
    k.restore();
    for (const x of [-30, 20]) { k.strokeStyle = '#2a2420'; k.lineWidth = 4; k.beginPath(); k.moveTo(x, -31 - (x + 50) * 0.06); k.lineTo(x, 31 + (x + 50) * 0.06); k.stroke(); }
    k.strokeStyle = '#140a02';
    k.lineWidth = 2;
    k.stroke(corpoB);
    const bocaB = new Path2D();
    bocaB.ellipse(44, 0, 12, 36, 0, 0, 6.283);
    k.fillStyle = '#2a1a0c';
    k.fill(bocaB);
    k.strokeStyle = '#c49a68';
    k.lineWidth = 2.4;
    k.stroke(bocaB);
    // a alça de corda
    k.strokeStyle = '#3a2410';
    k.lineWidth = 3;
    k.beginPath();
    k.moveTo(30, -36);
    k.bezierCurveTo(70, -70, 100, -30, 70, 10);
    k.stroke();
    marcar(k, obj, corpoB);
    marcar(k, obj, bocaB);
    k.restore();
    // a água que saiu do balde: uma língua rasa com ondinhas
    const derrame = pol([[700, 736], [760, 726], [800, 740], [790, 760], [736, 768], [700, 756]]);
    k.fillStyle = 'rgba(132,132,112,.45)';
    k.fill(derrame);
    k.strokeStyle = 'rgba(250,246,226,.7)';
    k.lineWidth = 1;
    for (const y of [738, 746, 754]) { k.beginPath(); k.moveTo(714, y); k.quadraticCurveTo(740, y - 2, 770, y); k.stroke(); }
    vinheta(k, W, H, 0.22);
  }
  // ---------- (10) A pesca maravilhosa (Lc 5.4-7) ----------
  // De manhã cedo, no meio do lago: o nosso barco de três quartos, visto de fora e um pouco de
  // cima, tão carregado que a água chega quase à borda (5.7); por dentro, os bancos de través e
  // o peixe amontoado. Por cima da borda de cá vem a rede, puxada da água: um saco de malha
  // que pesa e estufa, cheio de peixe que aparece entre os fios, a parte de baixo ainda na
  // água; na beirada, um rasgo torto por onde os peixes escapam (5.6). Lá atrás, o outro barco,
  // um barco de pesca aberto, com o mastro e a vela enrolada na verga, também fundo na água e
  // cheio de peixe. O sol baixo, à direita, em traço. Ninguém desenhado.
  function desenhoPesca(k, W, H, obj) {
    const r = sorteio(10001);
    papelVelho(k, W, H, r, ['#f6f0da', '#e2d8b8', '#c0b08a'], [700, 150]);
    const hz = 214;
    const sol = [716, hz - 4];
    // o céu em linhas, mais ralas perto do sol
    linhas(k, 0, 0, W, hz, 4.4, 1.5, (x, y) => 0.12 + Math.min(1, Math.hypot(x - sol[0], (y - sol[1]) * 1.4) / 700) * 0.6);
    // o sol ainda atrás dos morros: só a claridade, em linhas mais ralas no céu e na água
    // a outra margem, os morros baixos e longe
    const fM = onda(sorteio(10010), 4, 0.008);
    const morros = pol([[-10, hz + 2], ...Array.from({ length: 46 }, (_, i) => [i * 20 - 6, hz - 10 - Math.max(0, fM(i * 20)) * 16]), [W + 10, hz + 2]]);
    peca(k, morros, [-10, hz - 40, W + 10, hz + 2], { cor: '#cfc4a2', ang: 0.04, passo: 3.6, maxL: 1, sombra: () => 0.35, cruzada: 1, traco: 1.2 });
    // o lago: ondinhas em perspectiva, mais miúdas e juntas longe; a esteira do sol clara
    const lago = pol([[-10, hz], [W + 10, hz], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#d2cfb8';
    k.fill(lago);
    k.save();
    k.clip(lago);
    k.strokeStyle = SEPIA;
    k.lineCap = 'round';
    for (let y = hz + 2; y < H; y += 2 + (y - hz) * 0.03) {
      const t = (y - hz) / (H - hz);
      let x = -10 - r() * 40;
      while (x < W + 10) {
        const c = (12 + r() * 40) * (0.4 + t * 1.4);
        const esteira = Math.max(0, 1 - Math.abs(x + c / 2 - sol[0]) / (40 + t * 120));
        k.lineWidth = (0.5 + t * 1.5) * (1 - esteira * 0.7);
        k.beginPath();
        k.moveTo(x, y);
        k.quadraticCurveTo(x + c / 2, y - 1.5 - t * 4, x + c, y);
        k.stroke();
        x += c + (6 + r() * 24) * (0.4 + t * 1.2);
      }
    }
    k.restore();
    // um peixe em gravura: o corpo fusiforme, a barbatana de cima, o rabo em forquilha; o
    // dorso escuro em riscos ao comprido e a barriga clara; o olho é um pontinho
    const peixe = (x, y, L, a, claro = 1) => {
      const tom = typeof claro === 'string' ? claro : claro ? '#e8ebe2' : '#c2c8be';
      k.save();
      k.translate(x, y);
      k.rotate(a);
      const h = L * 0.2;
      const p = new Path2D();
      p.moveTo(-L / 2, 0);
      p.bezierCurveTo(-L * 0.4, -h * 1.1, -L * 0.05, -h * 1.15, L * 0.1, -h * 0.95);
      p.lineTo(L * 0.02, -h * 1.5);
      p.lineTo(L * 0.2, -h * 0.8);
      p.bezierCurveTo(L * 0.3, -h * 0.6, L * 0.36, -h * 0.3, L * 0.38, -h * 0.15);
      p.lineTo(L / 2, -h * 0.9);
      p.lineTo(L * 0.46, 0);
      p.lineTo(L / 2, h * 0.9);
      p.lineTo(L * 0.38, h * 0.15);
      p.bezierCurveTo(L * 0.3, h * 0.6, -L * 0.1, h * 1.05, -L * 0.35, h * 0.7);
      p.quadraticCurveTo(-L * 0.46, h * 0.4, -L / 2, 0);
      p.closePath();
      k.fillStyle = tom;
      k.fill(p);
      k.save();
      k.clip(p);
      k.strokeStyle = 'rgba(30,36,30,.75)';
      k.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const yy = -h * 1.1 + i * h * 0.26;
        k.lineWidth = Math.max(0.4, L * 0.03 * (1 - i / 6));
        k.beginPath();
        k.moveTo(-L * 0.42, yy + h * 0.3);
        k.quadraticCurveTo(0, yy - h * 0.1, L * 0.45, yy * 0.4);
        k.stroke();
      }
      k.lineWidth = Math.max(0.5, L * 0.025);
      k.beginPath();
      k.moveTo(-L * 0.3, -h * 0.75);
      k.quadraticCurveTo(-L * 0.24, 0, -L * 0.3, h * 0.6);
      k.stroke();
      k.restore();
      k.strokeStyle = 'rgba(20,22,18,.9)';
      k.lineWidth = Math.max(0.6, L * 0.032);
      k.stroke(p);
      k.fillStyle = '#141410';
      k.beginPath();
      k.arc(-L * 0.38, -h * 0.2, Math.max(0.7, L * 0.022), 0, 6.283);
      k.fill();
      k.restore();
    };
    const cardume = (forma, x0, y0, x1, y1, n, Lm, fundo) => {
      k.save();
      k.clip(forma);
      k.fillStyle = fundo;
      k.fill(forma);
      // os de perto maiores, os de longe menores; uns de dorso escuro, outros de barriga
      // prateada, em ângulos e tamanhos desencontrados, uns por cima dos outros
      const ps = [];
      for (let i = 0; i < n; i++) {
        const y = y0 + r() * (y1 - y0);
        const perto = (y - y0) / (y1 - y0 || 1);
        const sorte = r();
        ps.push([x0 + r() * (x1 - x0), y, Lm * (0.55 + perto * 0.7) * (0.7 + r() * 0.6), (r() - 0.5) * 3 + (r() < 0.5 ? Math.PI : 0), sorte < 0.22 ? '#7e8a80' : sorte < 0.5 ? '#c2c8be' : sorte < 0.6 ? '#a8b0a4' : '#eef0e8']);
      }
      ps.sort((a, b) => a[1] - b[1]);
      for (const [x, y, L, a, tom] of ps) peixe(x, y, L, a, tom);
      k.restore();
    };
    // um barco de pesca aberto, de três quartos: de S (popa) a B (proa), a boca de largura b;
    // a borda de cá embaixo, a de lá em cima, as pontas subindo; tão fundo que a água chega
    // quase na borda
    const barco = (S, B, b, sobeS, sobeB, bordo, inclina = 0) => {
      const A = (t) => [S[0] + (B[0] - S[0]) * t, S[1] + (B[1] - S[1]) * t];
      const forma = (t) => Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.62);
      const sobe = (t) => sobeS * Math.pow(1 - t, 3) + sobeB * Math.pow(t, 3);
      const N = (t) => { const [x, y] = A(t); return [x, y + b * forma(t) - sobe(t)]; };
      const F = (t) => { const [x, y] = A(t); return [x, y - b * 0.82 * forma(t) - sobe(t)]; };
      // a linha d'água é mais curta que a borda: a proa e a popa avançam por cima da água
      // (a água é um plano: a borda fica rente a ela no meio e só sobe nas pontas; inclinado,
      // o barco afunda mais de um lado)
      const Wl = (t) => { const t2 = 0.07 + t * 0.86; const [x, y] = N(t2); return [x, y + bordo * (1 - inclina * t2) + sobe(t2) * 0.8]; };
      const ts = Array.from({ length: 49 }, (_, i) => i / 48);
      return { A, N, F, Wl, ts, miolo: pol([...ts.map(F), ...ts.slice().reverse().map(N)]), costado: pol([...ts.map(N), ...ts.slice().reverse().map(Wl)]) };
    };
    const desenhaBarco = (bc, { escala, peixes, Lp, bancos, mastro }) => {
      const { N, F, Wl, ts, miolo, costado } = bc;
      // por dentro: o costado de lá, em tábuas, e o fundo cheio de peixe
      k.fillStyle = '#4a3420';
      k.fill(miolo);
      k.save();
      k.clip(miolo);
      const ladoLa = pol([...ts.map(F), ...ts.slice().reverse().map((t) => { const [x, y] = F(t); return [x, y + 26 * escala]; })]);
      k.fillStyle = '#8a6a44';
      k.fill(ladoLa);
      gravar(k, ladoLa, (F(0.5)[0]), F(0.5)[1] + 12 * escala, 500 * escala, -0.12, 2.8, 1.3, (x) => 0.55 - (x - F(0)[0]) / 1600, '#1e1006', 0);
      k.strokeStyle = 'rgba(30,16,6,.8)';
      k.lineWidth = 1.2;
      for (const f of [0.35, 0.7]) { k.beginPath(); ts.forEach((t, i) => { const [x, y] = F(t); if (i) k.lineTo(x, y + 26 * escala * f); else k.moveTo(x, y + 26 * escala * f); }); k.stroke(); }
      // o fundo: as tábuas do soalho, que aparecem nas pontas
      k.strokeStyle = 'rgba(20,10,2,.85)';
      k.lineWidth = 1.3 * escala + 0.4;
      for (const f of [0.25, 0.45, 0.65, 0.85]) {
        k.beginPath();
        ts.forEach((t, i) => { const [x1, y1] = F(t); const [, y2] = N(t); const y = y1 + 26 * escala + (y2 - y1 - 26 * escala) * f; if (i) k.lineTo(x1, y); else k.moveTo(x1, y); });
        k.stroke();
      }
      // o monte de peixe, mais alto no meio, deixando as pontas
      const tm = ts.filter((t) => t > 0.1 && t < 0.9);
      const monte = pol([...tm.map((t) => { const [x, y] = F(t); return [x, y + 18 * escala - Math.sin(Math.PI * (t - 0.1) / 0.8) * 10 * escala]; }), ...tm.slice().reverse().map((t) => { const [x, y] = N(t); return [x, y - (1 - Math.sin(Math.PI * (t - 0.1) / 0.8)) * 30 * escala]; })]);
      cardume(monte, F(0.1)[0], F(0.5)[1] - 20, N(0.9)[0], N(0.5)[1] + 10, peixes, Lp, '#3a3a2e');
      gravar(k, monte, N(0.5)[0], N(0.5)[1], 520 * escala, 0.5, 3.4, 1.3, (x, y) => Math.abs(x - N(0.5)[0]) / (360 * escala) * 0.7 - 0.15, '#1a1a12', 0);
      k.restore();
      // os bancos de través, de borda a borda
      for (const t of bancos) {
        const d = 0.018;
        const q = [N(t - d), N(t + d), F(t + d), F(t - d)].map(([x, y], i) => [x, y + (i < 2 ? -3 : 6) * escala]);
        const banco = pol(q);
        k.fillStyle = '#a8845a';
        k.fill(banco);
        gravar(k, banco, (q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, 120 * escala, Math.atan2(q[2][1] - q[1][1], q[2][0] - q[1][0]), 2.8, 1.2, () => 0.35, '#1e1006', 0);
        const frente = pol([q[0], q[1], [q[1][0], q[1][1] + 6 * escala], [q[0][0], q[0][1] + 6 * escala]]);
        k.fillStyle = '#3a2614';
        k.fill(frente);
        k.strokeStyle = '#140a02';
        k.lineWidth = 1.4;
        k.stroke(banco);
      }
      if (mastro) mastro();
      // a borda de lá, por cima
      k.lineCap = 'round';
      k.lineJoin = 'round';
      k.strokeStyle = '#140a02';
      k.lineWidth = 8 * escala;
      k.beginPath();
      ts.forEach((t, i) => { const [x, y] = F(t); if (i) k.lineTo(x, y); else k.moveTo(x, y); });
      k.stroke();
      k.strokeStyle = '#b08c5e';
      k.lineWidth = 5 * escala;
      k.stroke();
      // o casco debaixo d'água: escuro, visto através da água, em hachura, e as ondinhas por
      // cima
      const fundoC = pol([...ts.map(Wl), ...ts.slice().reverse().map((t) => { const [x, y] = Wl(t); return [x, y + 26 * escala * Math.sin(Math.PI * t)]; })]);
      gravar(k, fundoC, N(0.5)[0], Wl(0.5)[1] + 10, 520 * escala, 0.02, 2.8, 1.5, (x, y) => 0.8 - (y - Wl(0.5)[1]) / (40 * escala), '#2a1e10', 0);
      // o costado de cá, por fora: as tábuas em fiadas que seguem o tosado, as emendas, a
      // cinta grossa logo abaixo da borda; molhado embaixo
      k.fillStyle = '#6a4a2c';
      k.fill(costado);
      const ang = Math.atan2(N(0.6)[1] - N(0.4)[1], N(0.6)[0] - N(0.4)[0]);
      gravar(k, costado, N(0.5)[0], N(0.5)[1] + 10, 520 * escala, ang, 2.4, 1.3, (x, y) => 0.4 + (y - N(0.5)[1]) / (60 * escala) * 0.4, '#140a04', 0);
      k.save();
      k.clip(costado);
      k.strokeStyle = 'rgba(20,10,2,.95)';
      for (const f of [0.3, 0.55, 0.8]) {
        k.lineWidth = 1.4 * escala + 0.3;
        k.beginPath();
        ts.forEach((t, i) => { const [x, y] = N(t); const [, y2] = Wl(t); const yy = y + 5 * escala + (y2 - y + 20 * escala) * f; if (i) k.lineTo(x, yy); else k.moveTo(x, yy); });
        k.stroke();
      }
      for (let i = 0; i < 9; i++) {
        const t = 0.08 + r() * 0.84;
        const [x, y] = N(t);
        const f = [0.3, 0.55, 0.8][i % 3];
        const [, y2] = Wl(t);
        k.lineWidth = 1;
        k.beginPath();
        k.moveTo(x, y + 5 * escala + (y2 - y + 20 * escala) * f);
        k.lineTo(x - 1, y + 5 * escala + (y2 - y + 20 * escala) * (f + 0.25));
        k.stroke();
      }
      // a cinta
      k.lineCap = 'round';
      k.strokeStyle = '#2a1a0c';
      k.lineWidth = 7 * escala;
      k.beginPath();
      ts.forEach((t, i) => { const [x, y] = N(t); if (i) k.lineTo(x, y + 7 * escala); else k.moveTo(x, y + 7 * escala); });
      k.stroke();
      k.strokeStyle = '#9a7650';
      k.lineWidth = 3.6 * escala;
      k.stroke();
      k.restore();
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.8;
      k.stroke(costado);
      // a roda de proa e o cadaste: as pontas que fecham as bordas, lançadas para fora, e o
      // topo da roda um pouco acima da borda
      for (const t of [0, 1]) {
        const [wx, wy] = Wl(t);
        const [nx, ny] = N(t);
        const roda = pol([[wx, wy], [nx, ny], [nx + (t ? 8 : -8) * escala, ny - 18 * escala]], false);
        k.lineCap = 'round';
        k.lineJoin = 'round';
        k.strokeStyle = '#140a02';
        k.lineWidth = 12 * escala;
        k.stroke(roda);
        k.strokeStyle = '#8a6640';
        k.lineWidth = 7 * escala;
        k.stroke(roda);
        k.strokeStyle = 'rgba(255,236,200,.5)';
        k.lineWidth = 2 * escala;
        k.stroke(roda);
      }
      // a linha d'água rente e as ondinhas que batem no costado
      k.strokeStyle = 'rgba(250,250,240,.9)';
      k.lineWidth = 1.6;
      k.beginPath();
      ts.forEach((t, i) => { const [x, y] = Wl(t); if (i) k.lineTo(x, y + Math.sin(t * 40) * 1.4); else k.moveTo(x, y); });
      k.stroke();
      marcar(k, obj, miolo);
      marcar(k, obj, costado);
    };
    const bordaCa = (bc, escala) => {
      const { N, ts } = bc;
      k.lineCap = 'round';
      k.lineJoin = 'round';
      k.strokeStyle = '#140a02';
      k.lineWidth = 11 * escala;
      k.beginPath();
      ts.forEach((t, i) => { const [x, y] = N(t); if (i) k.lineTo(x, y); else k.moveTo(x, y); });
      k.stroke();
      k.strokeStyle = '#b8946a';
      k.lineWidth = 7.4 * escala;
      k.stroke();
      k.strokeStyle = 'rgba(255,240,210,.7)';
      k.lineWidth = 2 * escala;
      k.beginPath();
      ts.forEach((t, i) => { const [x, y] = N(t); if (i) k.lineTo(x, y - 2 * escala); else k.moveTo(x, y - 2 * escala); });
      k.stroke();
      marcar(k, obj, pol([...ts.map((t) => { const [x, y] = N(t); return [x, y - 7 * escala]; }), ...ts.slice().reverse().map((t) => { const [x, y] = N(t); return [x, y + 7 * escala]; })]));
    };
    // o outro barco, lá atrás, de proa para a esquerda e um pouco para cá, com o mastro e a
    // vela enrolada na verga
    const outro = barco([400, 316], [84, 340], 40, 26, 34, 10, 0.9);
    desenhaBarco(outro, {
      escala: 0.5, peixes: 380, Lp: 15, bancos: [0.3, 0.62],
      mastro: () => {
        const [mx, my] = outro.A(0.62);
        const topoM = [mx + 4, my - 200];
        k.lineCap = 'round';
        k.strokeStyle = '#140a02';
        k.lineWidth = 5.4;
        k.beginPath();
        k.moveTo(mx, my);
        k.lineTo(...topoM);
        k.stroke();
        k.strokeStyle = '#a07c50';
        k.lineWidth = 3;
        k.stroke();
        // a verga inclinada, com a vela enrolada nela: um rolo torto amarrado em voltas
        const v0 = [mx - 112, my - 84];
        const v1 = [mx + 84, my - 192];
        const enrolada = curvaPor([v0, [mx - 12, my - 134], v1], 3);
        const { forma } = tuboAo(enrolada, (s) => 6 + Math.sin(s * 0.09) * 2.4 + Math.min(1, s / 30) * 4 * Math.min(1, (190 - s) / 30));
        k.fillStyle = '#e6dcc0';
        k.fill(forma);
        gravar(k, forma, mx, my - 138, 130, 1.0, 2.4, 1.1, (x, y) => 0.25 + (y - (my - 192)) / 240, '#3a2a14', 0);
        k.strokeStyle = '#2a1c0c';
        k.lineWidth = 1.4;
        k.stroke(forma);
        for (let s = 18; s < 180; s += 26) {
          const q = enrolada[Math.min(enrolada.length - 1, Math.round(s / 3))];
          k.beginPath();
          k.moveTo(q.x + q.ty * 9, q.y - q.tx * 9);
          k.lineTo(q.x - q.ty * 9, q.y + q.tx * 9);
          k.stroke();
        }
        marcar(k, obj, forma);
        // os cabos: do topo à proa e à popa, finos
        k.strokeStyle = 'rgba(30,20,8,.75)';
        k.lineWidth = 1;
        k.beginPath();
        k.moveTo(...topoM);
        k.lineTo(...outro.F(0.02));
        k.moveTo(...topoM);
        k.lineTo(...outro.N(0.98));
        k.stroke();
        marcar(k, obj, pol([[mx - 4, my], [topoM[0] - 4, topoM[1]], [topoM[0] + 4, topoM[1]], [mx + 4, my]]));
      },
    });
    bordaCa(outro, 0.5);
    // o nosso barco, de perto: a popa sai pela esquerda, a proa sobe à direita
    const nosso = barco([100, 588], [812, 452], 130, 40, 64, 12);
    desenhaBarco(nosso, { escala: 1, peixes: 700, Lp: 30, bancos: [0.22, 0.5, 0.78] });
    // a rede: o saco de malha que vem da água, sobe pelo costado e passa por cima da borda de
    // cá; a parte de dentro derrama sobre o peixe do barco. A malha é desenhada num pano que
    // estufa: os fios se apertam nas beiradas, como numa bola.
    const t0 = 0.3;
    const t1 = 0.7;
    const P0 = nosso.N(t0);
    const P1 = nosso.N(t1);
    const fundo = 96;
    const meiaL = (v) => (P1[0] - P0[0]) / 2 * (1 + 0.12 * Math.sin(Math.PI * Math.min(1, v * 1.15))) * (v > 0.7 ? 1 - (v - 0.7) * 0.9 : 1);
    const meioX = (P0[0] + P1[0]) / 2 + 14;
    const sacoXY = (u, v) => {
      const x = meioX + meiaL(v) * Math.sin((u - 0.5) * Math.PI * 0.86) / Math.sin(0.43 * Math.PI);
      const yTop = P0[1] + (P1[1] - P0[1]) * u;
      const y = yTop + fundo * Math.pow(v, 0.92) + Math.sin(Math.PI * u) * 34 * v;
      return [x, y];
    };
    // o contorno, com as bolotas dos peixes que forçam a malha
    const borda = [];
    for (let v = 0; v <= 1.0001; v += 0.04) borda.push(sacoXY(0, v));
    for (let u = 0; u <= 1.0001; u += 0.04) borda.push(sacoXY(u, 1));
    for (let v = 1; v >= -0.0001; v -= 0.04) borda.push(sacoXY(1, v));
    const bolotas = borda.map(([x, y], i) => {
      const c = [meioX, P0[1] + fundo * 0.5];
      const d = Math.hypot(x - c[0], y - c[1]) || 1;
      const b2 = Math.pow(Math.abs(Math.sin(i * 0.42 + 0.6)), 1.5) * 12;
      return [x + (x - c[0]) / d * b2, y + (y - c[1]) / d * b2];
    });
    const saco = contornoRocha(r, [...bolotas, P0], 1);
    saco.closePath();
    // a parte de dentro do barco: a rede que passou por cima da borda e escorre no peixe
    const dentroR = contornoRocha(r, [P0, [P0[0] + 16, P0[1] - 40], [P0[0] + 80, P0[1] - 64], [meioX - 40, P0[1] - 58], [meioX + 30, P0[1] - 80], [P1[0] - 70, P1[1] - 66], [P1[0] - 14, P1[1] - 40], P1], 6);
    dentroR.closePath();
    // o rasgo, na beirada de baixo à direita: um buraco torto aberto no pano (em u, v)
    const rasgo = (u, v) => {
      const du = (u - 0.88) / 0.17;
      const dv = (v - 0.7) / 0.24;
      return du * du + dv * dv + Math.sin(u * 40) * 0.15 + Math.sin(v * 31) * 0.12 < 1;
    };
    // a malha: fio de cânhamo claro de beirada escura, cruzado em losango, com os nós
    const malha = (forma, mapa, passo) => {
      k.save();
      k.clip(forma);
      k.lineCap = 'round';
      const fios = [];
      for (const sgn of [1, -1]) {
        for (let c = -1; c <= 2.0001; c += passo) {
          let fio = [];
          for (let s2 = 0; s2 <= 1.0001; s2 += 0.01) {
            const u = s2;
            const v = c + sgn * (s2 - 0.5);
            if (v < -0.02 || v > 1.02 || (mapa === sacoXY && rasgo(u, v))) { if (fio.length > 1) fios.push(fio); fio = []; continue; }
            fio.push(mapa(u, v));
          }
          if (fio.length > 1) fios.push(fio);
        }
      }
      for (const [lw, cor] of [[2.4, 'rgba(30,22,10,.9)'], [1.1, '#d8c8a0']]) {
        k.strokeStyle = cor;
        k.lineWidth = lw;
        for (const fio of fios) {
          k.beginPath();
          fio.forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
          k.stroke();
        }
      }
      for (let a2 = -1; a2 <= 2; a2 += passo) {
        for (let b2 = -1; b2 <= 2; b2 += passo) {
          const u = (a2 + b2) / 2 + 0.5;
          const v = (a2 - b2) / 2 + 0.5;
          if (u < 0 || u > 1 || v < 0 || v > 1 || (mapa === sacoXY && rasgo(u, v))) continue;
          const [x, y] = mapa(u, v);
          k.fillStyle = 'rgba(30,22,10,.95)';
          k.beginPath();
          k.arc(x, y, 2.3, 0, 6.283);
          k.fill();
          k.fillStyle = '#e2d4b0';
          k.beginPath();
          k.arc(x - 0.4, y - 0.4, 1.3, 0, 6.283);
          k.fill();
        }
      }
      k.restore();
    };
    // por dentro: o peixe derramado e a malha por cima
    cardume(dentroR, P0[0] - 20, P0[1] - 100, P1[0] + 20, P1[1] + 10, 160, 32, '#3a3e34');
    const mapaDentro = (u, v) => [P0[0] + (P1[0] - P0[0]) * u + Math.sin(Math.PI * u) * 10, P0[1] + (P1[1] - P0[1]) * u - 84 * (1 - v) * Math.pow(Math.sin(Math.PI * (0.1 + u * 0.8)), 0.7) + 4];
    malha(dentroR, mapaDentro, 0.14);
    k.strokeStyle = '#2a1c0c';
    k.lineWidth = 1.8;
    k.stroke(dentroR);
    marcar(k, obj, dentroR);
    // por fora: o saco cheio, pendurado no costado; a sombra dele no casco
    cardume(saco, P0[0] - 80, P0[1] - 20, P1[0] + 80, P1[1] + fundo + 60, 300, 40, '#2e3430');
    // o volume do saco: a barriga de baixo e as beiradas na sombra, em hachura
    k.save();
    k.clip(saco);
    gravar(k, saco, meioX, P0[1] + fundo * 0.5, 300, 0.5, 3.4, 1.6, (x, y) => {
      const u = (x - meioX) / (meiaL(0.5) * 1.1);
      return Math.pow(Math.abs(u), 3) * 0.7 + Math.max(0, (y - P0[1] - fundo * 0.65) / fundo) * 0.7;
    }, '#141a14', 0);
    k.restore();
    malha(saco, sacoXY, 0.11);
    // o pé do saco ainda na água: o lago passa por cima, em véu e ondinhas
    const linhaDagua = (x) => nosso.Wl(Math.max(0, Math.min(1, (x - 70) / 756)))[1] + 54;
    k.save();
    k.clip(saco);
    const abaixo = pol([[0, linhaDagua(0)], ...Array.from({ length: 30 }, (_, i) => [i * 30, linhaDagua(i * 30)]), [W, H], [0, H]]);
    k.clip(abaixo);
    k.fillStyle = 'rgba(206,204,184,.4)';
    k.fill(saco);
    k.strokeStyle = 'rgba(43,33,18,.7)';
    k.lineCap = 'round';
    for (let y = P0[1]; y < P0[1] + fundo + 60; y += 6) {
      let x = P0[0] - 80 + r() * 20;
      while (x < P1[0] + 80) { const c = 14 + r() * 30; k.lineWidth = 1.2; k.beginPath(); k.moveTo(x, y); k.quadraticCurveTo(x + c / 2, y - 2, x + c, y); k.stroke(); x += c + 8 + r() * 14; }
    }
    k.restore();
    k.strokeStyle = '#1e160a';
    k.lineWidth = 2.4;
    k.stroke(saco);
    marcar(k, obj, saco);
    // a beirada do rasgo: os fios rompidos, soltos para dentro do buraco e para baixo, de
    // tamanhos desencontrados
    k.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const a = r() * 6.283;
      let u = 0.88 + Math.cos(a) * 0.17;
      let v = 0.7 + Math.sin(a) * 0.24;
      for (let j = 0; j < 10 && rasgo(u, v); j++) { u += Math.cos(a) * 0.02; v += Math.sin(a) * 0.02; }
      if (u > 1 || v > 1) continue;
      const [x, y] = sacoXY(u, v);
      const L = 10 + r() * 18;
      const pts = [[x, y], [x - Math.cos(a) * L * 0.5 + (r() - 0.5) * 8, y - Math.sin(a) * L * 0.4 + 6], [x - Math.cos(a) * L + (r() - 0.5) * 6, y - Math.sin(a) * L * 0.6 + 14]];
      for (const [lw, cor] of [[2.4, 'rgba(30,22,10,.9)'], [1.1, '#d8c8a0']]) {
        k.strokeStyle = cor;
        k.lineWidth = lw;
        k.beginPath();
        k.moveTo(...pts[0]);
        k.quadraticCurveTo(...pts[1], ...pts[2]);
        k.stroke();
      }
    }
    // os peixes que escapam pelo rasgo, de volta à água: meio de fora, de cabeça para baixo,
    // e as marolas partidas onde caem
    const [rx0, ry0] = sacoXY(0.9, 0.78);
    for (const [dx, dy, L, a] of [[18, 10, 44, 1.2], [44, 30, 40, 0.7], [70, 58, 38, 1.5], [30, 66, 36, 0.4], [86, 20, 34, 0.9]]) {
      const x = rx0 + dx;
      const y = ry0 + dy;
      peixe(x, y, L, a, 1);
      k.strokeStyle = 'rgba(43,33,18,.75)';
      k.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const w = L * (0.4 + i * 0.3);
        const a0 = 0.3 + r() * 0.5;
        k.beginPath();
        k.ellipse(x + Math.cos(a) * L * 0.4, y + Math.sin(a) * L * 0.4 + 4, w, w * 0.22, 0, a0, Math.PI - a0 - r() * 0.5);
        k.stroke();
      }
      marcar(k, obj, pol([[x - L / 2, y - L / 2], [x + L / 2, y - L / 2], [x + L / 2, y + L / 2], [x - L / 2, y + L / 2]]));
    }
    // a borda de cá passa por cima da rede, e a malha se dobra sobre ela
    bordaCa(nosso, 1);
    // num ponto a marola passa por cima da borda de cá e entra no barco (5.7): a água do lago
    // cobre a borda ali, com a crista de espuma, e um lençol fino escorre para dentro
    {
      const ts2 = Array.from({ length: 15 }, (_, i) => 0.13 + i * 0.01);
      const sobe2 = (t) => Math.sin(Math.PI * (t - 0.13) / 0.14);
      const crista = ts2.map((t) => { const [x, y] = nosso.N(t); return [x, y - 4 - 7 * sobe2(t)]; });
      const pe = ts2.slice().reverse().map((t) => { const [x, y] = nosso.N(t); return [x, y + 26]; });
      const marola = pol([...crista, ...pe]);
      const lencol = pol([...ts2.map((t) => { const [x, y] = nosso.N(t); return [x, y - 4]; }), ...ts2.slice().reverse().map((t) => { const [x, y] = nosso.N(t); return [x + 6 * sobe2(t), y - 4 - 30 * Math.pow(sobe2(t), 0.8)]; })]);
      for (const p of [lencol, marola]) {
        k.fillStyle = 'rgba(210,207,184,.92)';
        k.fill(p);
        k.save();
        k.clip(p);
        k.strokeStyle = 'rgba(43,33,18,.75)';
        k.lineCap = 'round';
        const [x0, y0] = nosso.N(0.13);
        for (let y = y0 - 40; y < y0 + 30; y += 3.4) {
          let x = x0 - 10 + r() * 8;
          while (x < x0 + 120) { const c = 10 + r() * 16; k.lineWidth = 1.6; k.beginPath(); k.moveTo(x, y); k.quadraticCurveTo(x + c / 2, y - 2.4, x + c, y); k.stroke(); x += c + 3 + r() * 6; }
        }
        k.restore();
        marcar(k, obj, p);
      }
      // a crista: espuma em festões, com a beirada escura embaixo
      for (let i = 0; i < crista.length - 2; i += 2) {
        const [xa, ya] = crista[i];
        const [xb, yb] = crista[i + 2];
        k.strokeStyle = 'rgba(30,26,16,.8)';
        k.lineWidth = 1.4;
        k.beginPath();
        k.moveTo(xa, ya + 3);
        k.quadraticCurveTo((xa + xb) / 2, (ya + yb) / 2 - 4, xb, yb + 3);
        k.stroke();
        k.strokeStyle = 'rgba(252,252,244,.98)';
        k.lineWidth = 2.4;
        k.beginPath();
        k.moveTo(xa, ya);
        k.quadraticCurveTo((xa + xb) / 2, (ya + yb) / 2 - 7, xb, yb);
        k.stroke();
      }
    }
    k.save();
    k.strokeStyle = 'rgba(30,22,10,.95)';
    k.lineWidth = 1.6;
    k.lineCap = 'round';
    for (let t = t0 + 0.006; t < t1; t += 0.009) {
      const [x, y] = nosso.N(t);
      k.beginPath();
      k.moveTo(x - 3, y - 9);
      k.quadraticCurveTo(x + 2, y, x + 4, y + 9);
      k.stroke();
    }
    k.restore();
    vinheta(k, W, H, 0.2);
  }

  // ---------- (11) A água que virou vinho (Jo 2.6-9) ----------
  // No pátio da casa da festa, à tarde: as seis talhas de pedra da purificação (2.6), altas e
  // torneadas, de pé, em fila que foge para o fundo; nas cinco de lá a superfície é de água; na
  // da frente, o vinho escuro, com a concha de tirar ainda dentro e o jarro já cheio ao lado
  // (2.8). Ninguém desenhado.
  function desenhoAguaVinho(k, W, H, obj) {
    const r = sorteio(10101);
    papelVelho(k, W, H, r, ['#f8ecd2', '#e8d0a4', '#c4a070'], [160, 160]);
    const chaoY = 470;
    // a parede de reboco, com as juntas de pedra aparecendo embaixo e um arco fechado
    const parede = pol([[-10, -10], [W + 10, -10], [W + 10, chaoY], [-10, chaoY]]);
    k.fillStyle = '#e6d2a8';
    k.fill(parede);
    linhas(k, 0, 0, W, chaoY, 4.2, 1.5, (x, y) => 0.22 + x / 2200 + (y / chaoY) * 0.2);
    const arco = new Path2D();
    arco.moveTo(560, chaoY);
    arco.lineTo(560, 230);
    arco.quadraticCurveTo(560, 140, 680, 140);
    arco.quadraticCurveTo(800, 140, 800, 230);
    arco.lineTo(800, chaoY);
    arco.closePath();
    k.save();
    k.clip(arco);
    muroEmFiadas(k, r, arco, [560, 130, 800, chaoY], { h: 26, cor: '#cdb486', sombra: (x, y) => 0.45 + (y - 140) / 800, traco: 1.3, larg: 1.8 });
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.stroke(arco);
    // a guirlanda de folhas da festa, pendurada na parede
    k.strokeStyle = '#4a4a26';
    k.lineWidth = 2.2;
    k.beginPath();
    k.moveTo(40, 90);
    k.quadraticCurveTo(250, 170, 480, 96);
    k.stroke();
    for (let t = 0.04; t < 1; t += 0.05) {
      const p = bezier([40, 90], [180, 145], [330, 140], [480, 96], 40)[Math.round(t * 40)];
      for (const ld of [-1, 1]) {
        const fl = new Path2D();
        fl.moveTo(p[0], p[1]);
        fl.quadraticCurveTo(p[0] + ld * 10, p[1] + 6, p[0] + ld * 6, p[1] + 20);
        fl.quadraticCurveTo(p[0] + ld * 2, p[1] + 8, p[0], p[1]);
        k.fillStyle = '#8c9258';
        k.fill(fl);
        k.strokeStyle = '#2a2a10';
        k.lineWidth = 1;
        k.stroke(fl);
      }
    }
    // o chão de lajes, em perspectiva
    const chao = pol([[-10, chaoY], [W + 10, chaoY], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#d8bc8c';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, chaoY, H, 2, (x, y) => 0.32 + (y - chaoY) / 900 + x / 3000);
    k.strokeStyle = 'rgba(43,33,18,.75)';
    k.lineWidth = 1.4;
    for (const y of [chaoY, 520, 590, 690, 830]) { k.beginPath(); k.moveTo(-10, y); k.lineTo(W + 10, y); k.stroke(); }
    for (let xb = -800; xb < 1800; xb += 230) { k.beginPath(); k.moveTo(444 + (xb - 444) * 0.25, chaoY); k.lineTo(xb, H + 10); k.stroke(); }
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(-10, chaoY);
    k.lineTo(W + 10, chaoY);
    k.stroke();
    // uma talha de pedra: a boca larga de beiço grosso, o pescoço, o corpo alto e reto que
    // afina um pouco e o pé torneado; os anéis do torno e a pedra clara riscada
    const talha = (cx, base, e, conteudo, largura = 1, altura = 1) => {
      const alt = 300 * e * altura;
      const R = (t) => {
        // t = 0 no alto, 1 no pé
        if (t < 0.06) return 1.0;
        if (t < 0.12) return 0.86;
        if (t < 0.8) return 0.92 - (t - 0.12) * 0.22;
        if (t < 0.88) return 0.58;
        return 0.74;
      };
      const larg = 116 * e * largura;
      const p = new Path2D();
      const n = 60;
      const pts = [];
      for (let i = 0; i <= n; i++) { const t = i / n; pts.push([R(t) * larg / 2, base - alt + t * alt]); }
      p.moveTo(cx - pts[0][0], pts[0][1]);
      for (const [x, y] of pts) p.lineTo(cx - x, y);
      for (let i = n; i >= 0; i--) p.lineTo(cx + pts[i][0], pts[i][1]);
      p.closePath();
      sombraNoChao(k, p, 24 * e, 8 * e, 10 * e, 0.3);
      const so = (x, y) => 0.12 + Math.max(0, (x - cx + larg * 0.25) / larg) * 0.75;
      peca(k, p, [cx - larg / 2, base - alt, cx + larg / 2, base], { cor: '#ddd2b8', tinta: '#2a2216', ang: 1.5, passo: 3 * Math.max(0.7, e), maxL: 1.8, sombra: so, cruzada: 0.62, traco: 2.2, obj });
      // os anéis do torno
      k.strokeStyle = 'rgba(42,34,22,.75)';
      for (const t of [0.06, 0.12, 0.2, 0.5, 0.8, 0.88, 0.94]) {
        const y = base - alt + t * alt;
        const w = R(t) * larg / 2;
        k.lineWidth = 1.2;
        k.beginPath();
        k.ellipse(cx, y, w, w * 0.16, 0, 0.1, Math.PI - 0.1);
        k.stroke();
      }
      // a boca: o beiço e o que está dentro (água ou vinho)
      const yb = base - alt;
      const wb = larg / 2;
      const beico = new Path2D();
      beico.ellipse(cx, yb, wb, wb * 0.24, 0, 0, 6.283);
      k.fillStyle = '#e8dec6';
      k.fill(beico);
      k.strokeStyle = '#2a2216';
      k.lineWidth = 2;
      k.stroke(beico);
      const sup = new Path2D();
      sup.ellipse(cx, yb + 3 * e, wb * 0.8, wb * 0.17, 0, 0, 6.283);
      if (conteudo === 'vinho') {
        k.fillStyle = '#3e1a14';
        k.fill(sup);
        gravar(k, sup, cx, yb + 3 * e, wb, 0, 2.2, 1, () => 0.6, '#140604', 0);
        k.strokeStyle = 'rgba(240,206,170,.75)';
        k.lineWidth = 1.8;
        k.beginPath();
        k.ellipse(cx, yb + 3 * e, wb * 0.78, wb * 0.16, 0, Math.PI * 1.05, Math.PI * 1.6);
        k.stroke();
      } else {
        k.fillStyle = '#b4b8a6';
        k.fill(sup);
        k.strokeStyle = 'rgba(250,250,240,.8)';
        k.lineWidth = 1.2;
        k.beginPath();
        k.moveTo(cx - wb * 0.5, yb + 3 * e);
        k.lineTo(cx + wb * 0.2, yb + 3 * e);
        k.stroke();
      }
      k.strokeStyle = '#2a2216';
      k.lineWidth = 1.2;
      k.stroke(sup);
      marcar(k, obj, beico);
      return { yb, wb };
    };
    // as cinco de lá, em fila que foge para o fundo, e a da frente, maior
    for (const [cx, base, e] of [[96, 508, 0.66], [212, 520, 0.72], [334, 534, 0.8], [462, 552, 0.88], [600, 576, 0.97]]) talha(cx, base, e, 'agua');
    const { yb, wb } = talha(722, 640, 1.18, 'vinho', 1.32, 0.86);
    // a concha de tirar: uma cuia de barro de cabo comprido, pendurada pela beirada da boca,
    // com o vinho dentro; o cabo sobe para fora
    vara(k, [[690, yb - 4], [652, yb - 60], [628, yb - 98]], 9, '#8e6a42', obj);
    const cuia = new Path2D();
    cuia.moveTo(668, yb - 8);
    cuia.bezierCurveTo(668, yb + 22, 716, yb + 26, 720, yb - 4);
    cuia.closePath();
    k.fillStyle = '#9a5a32';
    k.fill(cuia);
    gravar(k, cuia, 694, yb + 6, 30, 1.5, 2.4, 1.2, (x) => 0.2 + (x - 668) / 60, '#2a1206', 0);
    k.strokeStyle = '#2a1206';
    k.lineWidth = 1.8;
    k.stroke(cuia);
    const vinhoC = new Path2D();
    vinhoC.ellipse(694, yb - 6, 26, 6, 0.05, 0, 6.283);
    k.fillStyle = '#3e1a14';
    k.fill(vinhoC);
    k.strokeStyle = 'rgba(240,206,170,.7)';
    k.lineWidth = 1.2;
    k.beginPath();
    k.ellipse(690, yb - 7, 16, 3, 0.05, Math.PI * 1.1, Math.PI * 1.7);
    k.stroke();
    k.strokeStyle = '#2a1206';
    k.lineWidth = 1.6;
    k.stroke(vinhoC);
    marcar(k, obj, cuia);
    // o jarro de barro ao lado, já cheio de vinho, para levar ao mestre de cerimônias (2.8)
    const jx = 470;
    const jb = 734;
    const jarro = vaso(k, jx, jb, 150, 104, (t) => (t < 0.08 ? 0.5 : t < 0.2 ? 0.42 : 0.42 + Math.sin(((t - 0.2) / 0.8) * Math.PI) * 0.55));
    sombraNoChao(k, jarro, 20, 8, 8, 0.35);
    peca(k, jarro, [jx - 60, jb - 150, jx + 60, jb], { cor: '#b46a3c', tinta: '#2a1206', ang: 1.45, passo: 3, maxL: 1.8, sombra: (x) => 0.18 + Math.max(0, (x - jx + 20) / 120) * 0.8, cruzada: 0.65, traco: 2.2, obj });
    const bocaJ = new Path2D();
    bocaJ.ellipse(jx, jb - 150, 27, 7, 0, 0, 6.283);
    k.fillStyle = '#3e1a14';
    k.fill(bocaJ);
    k.strokeStyle = '#2a1206';
    k.lineWidth = 1.8;
    k.stroke(bocaJ);
    // a asa do jarro
    k.strokeStyle = '#2a1206';
    k.lineWidth = 9;
    k.beginPath();
    k.moveTo(jx + 22, jb - 136);
    k.bezierCurveTo(jx + 70, jb - 136, jx + 76, jb - 90, jx + 46, jb - 76);
    k.stroke();
    k.strokeStyle = '#b46a3c';
    k.lineWidth = 5;
    k.stroke();
    // o copo de barro cheio, ao pé do jarro
    const copo = vaso(k, jx + 100, jb + 6, 30, 60, (t) => 0.98 - t * 0.38);
    peca(k, copo, [jx + 70, jb - 24, jx + 130, jb + 6], { cor: '#b87442', tinta: '#2a1206', ang: 1.45, passo: 2.6, maxL: 1.4, sombra: (x) => 0.2 + Math.max(0, (x - jx - 90) / 50) * 0.7, cruzada: 0.7, traco: 1.8, obj });
    const bocaC = new Path2D();
    bocaC.ellipse(jx + 100, jb - 24, 29, 7, 0, 0, 6.283);
    k.fillStyle = '#3e1a14';
    k.fill(bocaC);
    k.strokeStyle = '#2a1206';
    k.lineWidth = 1.4;
    k.stroke(bocaC);
    vinheta(k, W, H, 0.22);
  }
  // ---------- (13) Pedro sai da prisão (At 12.6-10) ----------
  // De noite, na cela: as paredes de pedra grande, o chão de lajes; no fundo, o portão de ferro
  // aberto, de folha gradeada escancarada para dentro, e por ele entra uma luz forte (12.7, 12.10)
  // que corre pelo chão e desenha a sombra das grades. Na frente, as duas correntes (12.6), presas
  // nas argolas da parede, caídas no chão em voltas soltas, cada uma com a algema aberta na ponta
  // (12.7). Ninguém desenhado.
  function desenhoPedro(k, W, H, obj) {
    const r = sorteio(10301);
    k.fillStyle = '#2a2018';
    k.fillRect(0, 0, W, H);
    const chaoY = 560;
    const porta = [430, 232, 640, chaoY];
    const luz = [535, 420];
    const longe = (x, y) => Math.min(1, Math.hypot((x - luz[0]) / 1.2, y - luz[1]) / 520);
    // a parede do fundo, de pedra grande em fiadas, escura longe da luz
    const parede = pol([[-10, -10], [W + 10, -10], [W + 10, chaoY], [-10, chaoY]]);
    muroEmFiadas(k, r, parede, [-10, -10, W + 10, chaoY], { h: 46, cor: '#6e6050', tinta: '#140e08', sombra: (x, y) => 0.35 + longe(x, y) * 0.7, traco: 1.8, larg: 1.9 });
    k.save();
    k.globalCompositeOperation = 'screen';
    brilho(k, luz[0], luz[1], 380, 'rgba(255,226,160,.4)');
    k.restore();
    marcar(k, obj, parede);
    // a porta: o vão com a verga de pedra, e a luz forte lá fora
    const [px0, py0, px1, py1] = porta;
    const vao = pol([[px0, py1], [px0, py0], [px1, py0], [px1, py1]]);
    k.fillStyle = '#fbf3da';
    k.fill(vao);
    k.save();
    k.clip(vao);
    // a luz em linhas finas que saem do meio do vão
    k.strokeStyle = 'rgba(214,180,110,.55)';
    k.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * 6.283;
      k.beginPath();
      k.moveTo(luz[0] + Math.cos(a) * 30, luz[1] - 30 + Math.sin(a) * 30);
      k.lineTo(luz[0] + Math.cos(a) * 400, luz[1] - 30 + Math.sin(a) * 400);
      k.stroke();
    }
    brilho(k, luz[0], luz[1] - 30, 110, 'rgba(255,255,248,.95)');
    k.restore();
    const verga = pol([[px0 - 40, py0 - 50], [px1 + 40, py0 - 50], [px1 + 40, py0], [px0 - 40, py0]]);
    peca(k, verga, [px0 - 40, py0 - 50, px1 + 40, py0], { cor: '#a08868', tinta: '#140e08', ang: 0.05, passo: 3.2, maxL: 1.6, sombra: (x, y) => 0.25 + (py0 - y) / 120, cruzada: 0.8, traco: 2.4, obj });
    for (const [xa, xb] of [[px0 - 40, px0], [px1, px1 + 40]]) {
      const ombreira = pol([[xa, py0], [xb, py0], [xb, py1], [xa, py1]]);
      peca(k, ombreira, [xa, py0, xb, py1], { cor: '#8e7658', tinta: '#140e08', ang: 1.5, passo: 3.4, maxL: 1.6, sombra: (x) => 0.3 + Math.abs(x - (xa + xb) / 2) / 60, cruzada: 0.8, traco: 2.2, obj });
    }
    // o chão de lajes em perspectiva
    const chao = pol([[-10, chaoY], [W + 10, chaoY], [W + 10, H + 10], [-10, H + 10]]);
    k.fillStyle = '#5a4c3c';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, chaoY, H, 2.4, (x, y) => 0.45 + longe(x, y) * 0.6, '#140e08');
    k.strokeStyle = 'rgba(20,14,8,.85)';
    k.lineWidth = 1.6;
    for (const y of [chaoY, 600, 660, 750]) { k.beginPath(); k.moveTo(-10, y); k.lineTo(W + 10, y); k.stroke(); }
    for (let xb = -900; xb < 1800; xb += 200) { k.beginPath(); k.moveTo(535 + (xb - 535) * 0.3, chaoY); k.lineTo(xb, H + 10); k.stroke(); }
    marcar(k, obj, chao);
    // a luz que entra e corre pelo chão, abrindo para cá (sai da porta, que é a fonte)
    const raia = pol([[px0, py1], [px1, py1], [px1 + 260, H + 10], [px0 - 160, H + 10]]);
    k.save();
    k.clip(raia);
    k.fillStyle = 'rgba(246,226,176,.75)';
    k.fill(raia);
    chaoEmLinhas(k, r, raia, px0 - 200, px1 + 300, chaoY, H, 1.4, () => 0.5, 'rgba(120,90,50,.8)');
    k.restore();
    // a folha aberta fica fora da raia, à esquerda da porta: a luz que espalha pela cela
    // desenha a sombra das grades no chão para a esquerda, cada uma saindo do pé da sua grade e
    // se abrindo para longe da porta (a fonte), mais larga e mais fraca longe
    {
      const fonte = [535, 548];
      const pes = Array.from({ length: 7 }, (_, i) => { const t = i / 6; return [px0 + (px0 - 150 - px0) * t, py1 + 52 * t]; });
      k.save();
      k.clip(chao);
      k.lineCap = 'butt';
      for (const [fx, fy] of pes) {
        const dx = fx - fonte[0];
        const dy = fy - fonte[1];
        const L = 1.6;
        const g = k.createLinearGradient(fx, fy, fx + dx * L, fy + dy * L);
        g.addColorStop(0, 'rgba(10,6,2,.55)');
        g.addColorStop(1, 'rgba(10,6,2,0)');
        k.strokeStyle = g;
        k.lineWidth = 7;
        k.beginPath();
        k.moveTo(fx, fy + 2);
        k.lineTo(fx + dx * L, fy + dy * L + 2);
        k.stroke();
      }
      k.restore();
    }
    // a luz (o vão e a raia no chão) fica fora da máscara dos objetos: ali o brilho pode entrar
    if (obj) {
      obj.save();
      obj.setTransform(k.getTransform());
      obj.globalCompositeOperation = 'destination-out';
      obj.fill(vao);
      obj.fill(raia);
      obj.restore();
    }
    // a folha do portão, de ferro, aberta para dentro: a moldura, as grades em pé e as duas
    // travessas rebitadas; as dobradiças do lado da ombreira
    const folha = [[px0, py0 + 4], [px0, py1], [px0 - 150, py1 + 52], [px0 - 150, py0 - 40]];
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    k.save();
    k.lineCap = 'round';
    const barra = (a, b, w) => {
      for (const [ww, c] of [[w + 3, '#0c0806'], [w, '#3a342c'], [w * 0.35, 'rgba(250,230,180,.55)']]) { k.strokeStyle = c; k.lineWidth = ww; k.beginPath(); k.moveTo(a[0], a[1]); k.lineTo(b[0], b[1]); k.stroke(); }
    };
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      barra(lerp(folha[0], folha[3], t), lerp(folha[1], folha[2], t), 6 + t * 2);
    }
    for (const t of [0.04, 0.5, 0.96]) barra(lerp(folha[0], folha[1], t), lerp(folha[3], folha[2], t), 10);
    for (const t of [0.04, 0.5, 0.96]) {
      for (let i = 0; i <= 6; i++) {
        const p = lerp(lerp(folha[0], folha[1], t), lerp(folha[3], folha[2], t), i / 6);
        k.fillStyle = '#d8c090';
        k.beginPath();
        k.arc(p[0], p[1], 2.4, 0, 6.283);
        k.fill();
      }
    }
    const contornoF = pol(folha);
    marcar(k, obj, contornoF);
    for (const t of [0.12, 0.88]) { const p = lerp(folha[0], folha[1], t); k.fillStyle = '#1a140e'; k.fillRect(p[0] - 8, p[1] - 10, 14, 20); }
    k.restore();
    // as argolas na parede e as correntes caídas, de elos alternados (um de frente, um de lado),
    // em voltas soltas pelo chão, cada uma com a algema aberta na ponta
    const corrente = (pts, e) => {
      const c = curvaPor(pts, 3);
      const passo = 15 * e;
      let acum = 0;
      let n = 0;
      for (let i = 1; i < c.length; i++) {
        acum += 3;
        if (acum < passo) continue;
        acum = 0;
        const q = c[i];
        const a = Math.atan2(q.ty, q.tx);
        k.save();
        k.translate(q.x, q.y);
        k.rotate(a);
        if (n % 2 === 0) {
          const elo = new Path2D();
          elo.ellipse(0, 0, 11 * e, 6 * e, 0, 0, 6.283);
          elo.ellipse(0, 0, 6 * e, 2.4 * e, 0, 0, 6.283);
          k.fillStyle = '#4a443a';
          k.fill(elo, 'evenodd');
          k.strokeStyle = '#0c0806';
          k.lineWidth = 1.6;
          k.stroke(elo);
          k.strokeStyle = 'rgba(250,230,180,.6)';
          k.lineWidth = 1.2;
          k.beginPath();
          k.ellipse(0, 0, 9 * e, 4.4 * e, 0, Math.PI * 1.1, Math.PI * 1.7);
          k.stroke();
          marcar(k, obj, elo);
        } else {
          const elo = pol([[-11 * e, -2.6 * e], [11 * e, -2.6 * e], [11 * e, 2.6 * e], [-11 * e, 2.6 * e]]);
          k.fillStyle = '#3a342c';
          k.fill(elo);
          k.strokeStyle = '#0c0806';
          k.lineWidth = 1.6;
          k.stroke(elo);
          marcar(k, obj, elo);
        }
        k.restore();
        n++;
      }
      return c[c.length - 1];
    };
    const algema = (x, y, giro, e) => {
      k.save();
      k.translate(x, y);
      k.rotate(giro);
      k.scale(e, e);
      // meia argola: uma faixa de ferro em arco, com a beirada de dentro e a de fora
      const meia = (abre) => {
        k.save();
        k.rotate(abre);
        const p = new Path2D();
        p.ellipse(0, 22, 26, 22, 0, -Math.PI / 2, Math.PI / 2, true);
        p.ellipse(0, 22, 17, 14, 0, Math.PI / 2, -Math.PI / 2);
        p.closePath();
        k.fillStyle = '#4c463a';
        k.fill(p);
        k.strokeStyle = '#0c0806';
        k.lineWidth = 2;
        k.stroke(p);
        k.strokeStyle = 'rgba(250,230,180,.55)';
        k.lineWidth = 1.6;
        k.beginPath();
        k.ellipse(0, 22, 22, 18, 0, -Math.PI * 0.55, -Math.PI * 0.95, true);
        k.stroke();
        // a ponta de fechar: um dente com o furo
        k.fillStyle = '#3a342c';
        k.fillRect(-4, 40, 8, 10);
        k.strokeRect(-4, 40, 8, 10);
        k.restore();
        return p;
      };
      const p1 = meia(1.05);
      k.save();
      k.scale(-1, 1);
      const p2 = meia(0.8);
      k.restore();
      // a dobradiça: as duas orelhas e o pino redondo
      k.fillStyle = '#3a342c';
      k.beginPath();
      k.ellipse(0, 0, 9, 7, 0, 0, 6.283);
      k.fill();
      k.strokeStyle = '#0c0806';
      k.lineWidth = 2;
      k.stroke();
      k.fillStyle = '#c8b088';
      k.beginPath();
      k.arc(0, 0, 3, 0, 6.283);
      k.fill();
      const m = new Path2D();
      m.ellipse(0, 20, 46, 40, 0, 0, 6.283);
      marcar(k, obj, m);
      void p1; void p2;
      k.restore();
    };
    for (const [x, y] of [[110, 392], [262, 456]]) {
      k.strokeStyle = '#0c0806';
      k.lineWidth = 12;
      k.beginPath();
      k.ellipse(x, y + 18, 16, 20, 0, 0, 6.283);
      k.stroke();
      k.strokeStyle = '#5a544a';
      k.lineWidth = 7;
      k.stroke();
      k.fillStyle = '#1a140e';
      k.fillRect(x - 10, y - 8, 20, 12);
    }
    const f1 = corrente([[110, 428], [104, 540], [120, 610], [170, 650], [250, 640], [276, 672], [220, 700], [184, 724], [250, 742], [322, 726]], 1.2);
    algema(f1.x + 8, f1.y - 4, -1.3, 1.25);
    const f2 = corrente([[262, 492], [268, 560], [320, 600], [400, 616], [466, 636], [448, 670], [384, 688], [440, 714], [530, 706]], 1.15);
    algema(f2.x + 8, f2.y - 2, -1.6, 1.2);
    // uns fiapos de palha no chão
    k.strokeStyle = 'rgba(200,170,110,.7)';
    k.lineWidth = 1.4;
    for (let i = 0; i < 40; i++) { const x = r() * W; const y = 600 + r() * 220; const a = r() * 3; k.beginPath(); k.moveTo(x, y); k.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 6); k.stroke(); }
    vinheta(k, W, H, 0.4);
  }
  // ---------- fim dos Milagres ----------

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
  // O tom da arte, medido uma vez por desenho (a luminância média do que aparece na janela):
  // 'clara' (papel, terra ao sol, acima de 135), 'escura' (noite, cova, abaixo de 80) ou ''. Na
  // clara, o holo do ouro e da glória é soft-light (o color-dodge estoura o claro); na escura,
  // os raios da glória e o reflexo da inclinação baixam (senão viram grade e névoa no céu).
  function tomDe(ilu) {
    const m = tela(48, 46);
    const km = m.getContext('2d');
    km.drawImage(ilu, ARTE_MARGEM, ILU_CORTE + ARTE_MARGEM, JW - 2 * ARTE_MARGEM, JH - 2 * ARTE_MARGEM, 0, 0, 48, 46);
    let d;
    try { d = km.getImageData(0, 0, 48, 46).data; } catch (e) { return ''; }
    let t = 0;
    for (let i = 0; i < d.length; i += 4) t += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    const luz = t / (d.length / 4);
    return luz > 135 ? 'clara' : luz < 80 ? 'escura' : '';
  }
  const TONS = new Map();
  const tomDaArte = (carta) => ilustracao(carta).tom;
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
    if (!TONS.has(id)) TONS.set(id, tomDe(ilu));
    const v = { ilu, obj, tom: TONS.get(id), foco: FOCO[id] || null };
    GUARDADAS.set(id, v);
    if (GUARDADAS.size > 6) GUARDADAS.delete(GUARDADAS.keys().next().value);
    return v;
  }
  // Onde a arte entra: na janela (cortada em cima e embaixo) ou cheia (glória): cobrindo o
  // retângulo ARTE_CHEIA sem a margem do desenho, recortada no vão de dentro da moldura. Nada
  // da arte passa para baixo do papel nem para a moldura (nada de pixel esticado).
  // a faixa da arte cheia que fica à vista: abaixo da pílula do rótulo e acima do papel
  const SEGURO_CHEIA = { topo: 110, base: 858 };
  function porArte(k, img, cheia, foco) {
    k.imageSmoothingQuality = 'high';
    if (cheia) {
      const A = ARTE_CHEIA;
      const sw = JW - 2 * ARTE_MARGEM;
      const sh = ILU_H - 2 * ARTE_MARGEM;
      let e = Math.max(A.w / sw, A.h / sh);
      if (foco && foco[2]) e = Math.max(e * foco[2], A.w / JW, A.h / ILU_H);
      const uw = A.w / e;
      const uh = A.h / e;
      let sx = (JW - uw) / 2;
      let sy = (ILU_H - uh) / 2;
      let dy = 0;
      if (foco) {
        // o ponto do foco entre a pílula e o papel; o que o desenho não cobre vira deslocamento
        const fx = foco[0] * JW;
        const fy = foco[1] * ILU_H;
        const y = A.y + (fy - sy) * e;
        if (y < SEGURO_CHEIA.topo) sy = fy - (SEGURO_CHEIA.topo - A.y) / e;
        else if (y > SEGURO_CHEIA.base) sy = fy - (SEGURO_CHEIA.base - A.y) / e;
        if (sy < 0) { dy = -sy * e; sy = 0; } else if (sy > ILU_H - uh) { dy = -(sy - (ILU_H - uh)) * e; sy = ILU_H - uh; }
        const x = A.x + (fx - sx) * e;
        if (x < A.x + 60) sx = fx - 60 / e; else if (x > A.x + A.w - 60) sx = fx - (A.w - 60) / e;
        sx = Math.max(0, Math.min(JW - uw, sx));
      }
      k.save();
      k.beginPath();
      k.rect(A.x, A.y, A.w, A.h);
      k.clip();
      retRedondo(k, FAIXA, FAIXA, CW - 2 * FAIXA, CH - 2 * FAIXA, 26);
      k.clip();
      // a beirada que sobra (com a arte deslocada) é a última linha do desenho, esticada
      if (dy > 0) k.drawImage(img, sx, 0, uw, 3, A.x, A.y, A.w, dy + 2);
      if (dy < 0) k.drawImage(img, sx, ILU_H - 3, uw, 3, A.x, A.y + A.h + dy - 2, A.w, -dy + 2);
      k.drawImage(img, sx, sy, uw, uh, A.x, A.y + dy, A.w, A.h);
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
  // Os raios da glória numa camada à parte, recortada pela luz da arte já pintada em c: alfa =
  // smoothstep(luminância, 70, 160). Assim o papel recebe os raios inteiros e o escuro, nenhum,
  // qualquer que seja o tom médio do desenho.
  // As camadas prontas (raios e traço de ouro, já recortados) ficam guardadas por carta e por
  // tamanho: a leitura dos pixels e a máscara custam ~60 ms numa carta de 1000 px, e a mesma carta
  // é desenhada de novo (a viva, a story, a miniatura grande).
  const RAIOS = new Map();
  function raiosDaGloria(k, c, s, escura, id) {
    const A = ARTE_CHEIA;
    const x0 = Math.floor(A.x * s);
    const y0 = Math.floor(A.y * s);
    const w = Math.ceil(A.w * s);
    const h = Math.ceil(A.h * s);
    const chave = id + '|' + w + 'x' + h + (escura ? '|e' : '');
    const pronto = RAIOS.get(chave);
    if (pronto) { pintarRaios(k, pronto, x0, y0); return; }
    const camada = tela(w, h);
    const kc = camada.getContext('2d');
    kc.setTransform(s, 0, 0, s, -x0, -y0);
    kc.lineCap = 'round';
    for (let i = 0; i < 72; i++) {
      const a = Math.PI / 2 + ((i + 0.5) / 72 - 0.5) * 2.6;
      const g = kc.createLinearGradient(CW / 2, -60, CW / 2 + Math.cos(a) * 1100, -60 + Math.sin(a) * 1100);
      g.addColorStop(0, 'rgba(255,244,214,' + (i % 2 ? 0.16 : 0.3) * (escura ? 0.3 : 1) + ')');
      g.addColorStop(escura ? 0.36 : 0.75, 'rgba(255,244,214,0)');
      kc.strokeStyle = g;
      kc.lineWidth = i % 2 ? 2 : 4;
      kc.beginPath();
      kc.moveTo(CW / 2, -60);
      kc.lineTo(CW / 2 + Math.cos(a) * 1100, -60 + Math.sin(a) * 1100);
      kc.stroke();
    }
    // nas artes claras o clarão some; ali os raios entram como traço de ouro fino (numa segunda
    // camada, que entra normal, não em screen)
    const ouro = tela(w, h);
    const ko = ouro.getContext('2d');
    if (!escura) {
      ko.setTransform(s, 0, 0, s, -x0, -y0);
      ko.globalAlpha = 0.16;
      ko.strokeStyle = '#b8862a';
      ko.lineWidth = 1.5;
      ko.lineCap = 'round';
      for (let i = 0; i < 72; i += 2) {
        const a = Math.PI / 2 + ((i + 0.5) / 72 - 0.5) * 2.6;
        ko.beginPath();
        ko.moveTo(CW / 2 + Math.cos(a) * 160, -60 + Math.sin(a) * 160);
        ko.lineTo(CW / 2 + Math.cos(a) * 1100, -60 + Math.sin(a) * 1100);
        ko.stroke();
      }
    }
    // a máscara: a luminância da arte já pintada
    let mascara = null;
    try {
      const d = c.getContext('2d', { willReadFrequently: true }).getImageData(x0, y0, w, h);
      const px = d.data;
      for (let i = 0; i < px.length; i += 4) {
        const l = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
        const t = Math.max(0, Math.min(1, (l - 70) / 90));
        px[i] = px[i + 1] = px[i + 2] = 0;
        px[i + 3] = Math.round(255 * t * t * (3 - 2 * t));
      }
      mascara = tela(w, h);
      mascara.getContext('2d').putImageData(d, 0, 0);
    } catch (e) { /* sem leitura de pixel: os raios entram sem máscara */ }
    for (const kk of [kc, ko]) {
      if (!mascara) break;
      kk.setTransform(1, 0, 0, 1, 0, 0);
      kk.globalAlpha = 1;
      kk.globalCompositeOperation = 'destination-in';
      kk.drawImage(mascara, 0, 0);
    }
    const v = { camada, ouro };
    if (mascara && id) {
      RAIOS.set(chave, v);
      if (RAIOS.size > 6) RAIOS.delete(RAIOS.keys().next().value);
    }
    pintarRaios(k, v, x0, y0);
  }
  function pintarRaios(k, { camada, ouro }, x0, y0) {
    k.save();
    k.setTransform(1, 0, 0, 1, 0, 0);
    k.globalCompositeOperation = 'screen';
    k.drawImage(camada, x0, y0);
    k.globalCompositeOperation = 'source-over';
    k.drawImage(ouro, x0, y0);
    k.restore();
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
    const { ilu, foco, tom } = ilustracao(carta);
    retRedondo(k, 0, 0, CW, CH, 46);
    k.save();
    k.clip();
    if (M.cheia) {
      porArte(k, ilu, true, foco);
      // a luz da glória, parada no papel: o clarão no alto e os raios finos, simétricos. Os raios
      // são pintados à parte e só ficam onde a arte é clara, pixel a pixel (a máscara de
      // luminância, de 70 a 160): sobre o escuro (o casco de piche, a cova, a janela, o céu da
      // noite), raio claro cruza a hachura e vira grade. Na arte escura no todo (a noite de
      // Abraão, de Gideão), eles ainda ficam curtos e fracos.
      const escura = tom === 'escura';
      k.save();
      k.beginPath();
      k.rect(ARTE_CHEIA.x, ARTE_CHEIA.y, ARTE_CHEIA.w, ARTE_CHEIA.h);
      k.clip();
      raiosDaGloria(k, c, s, escura, carta.id);
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
    const { ilu, obj, foco } = ilustracao(carta);
    k.setTransform(w / CW, 0, 0, h / CH, 0, 0);
    if (M.cheia) porArte(k, ilu, true, foco);
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
    porArte(k, obj, !!M.cheia, foco);
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
  // ---------- o brilho assado: a imagem salva (storyDaCarta) e a miniatura do álbum ----------
  // O brilho da raridade do cartas.css, pintado no canvas num repouso fixo (a luz no alto, à
  // esquerda, como a carta parada sobre a mesa), com as mesmas camadas e as mesmas máscaras:
  // nada sobre os objetos desenhados nem sobre o texto. Determinístico: a mesma carta sai
  // sempre igual. Linho é fosco (nada). Na miniatura (mini), só o tom parado da moldura, da
  // prata para cima, para a raridade se ver na grade.
  const REPOUSO = { mx: 34, my: 28, o: 0.5, og: 0.45 };
  // a linha de um linear-gradient do CSS (graus: 0 para cima, 90 para a direita) na caixa
  function gradienteCss(k, graus, x, y, w, h, paradas) {
    const a = (graus * Math.PI) / 180;
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    const meia = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const g = k.createLinearGradient(cx - dx * meia, cy - dy * meia, cx + dx * meia, cy + dy * meia);
    for (const [q, cor] of paradas) g.addColorStop(Math.max(0, Math.min(1, q)), cor);
    return g;
  }
  // as paradas de um repeating-linear-gradient (em fração da linha), repetidas até o fim dela
  const repetir = (paradas, periodo) => {
    const r = [];
    for (let i = 0; i * periodo < 1; i++) for (const [q, cor] of paradas) if (q + i * periodo <= 1) r.push([q + i * periodo, cor]);
    return r;
  };
  // as riscas de um repeating-linear-gradient fino do CSS (graus), uma a cada passo
  function riscas(k, W, H, graus, passo, largura, cor) {
    const L = Math.hypot(W, H);
    k.save();
    k.translate(W / 2, H / 2);
    k.rotate(((graus - 90) * Math.PI) / 180);
    k.strokeStyle = cor;
    k.lineWidth = largura;
    k.beginPath();
    for (let d = -L / 2; d < L / 2; d += passo) { k.moveTo(d, -L / 2); k.lineTo(d, L / 2); }
    k.stroke();
    k.restore();
  }
  // o radial-gradient(farthest-corner circle at mx my) do CSS
  function radialCss(k, W, H, mx, my, paradas) {
    const x = (W * mx) / 100;
    const y = (H * my) / 100;
    const g = k.createRadialGradient(x, y, 0, x, y, Math.hypot(Math.max(x, W - x), Math.max(y, H - y)));
    for (const [q, cor] of paradas) g.addColorStop(q, cor);
    return g;
  }
  // As zonas (máscaras só de alfa, no tamanho W x H): a moldura sem o texto, e a carta sem o
  // papel nem o rótulo do alto (o --zona-moldura / --zona-sem-texto / --sem-rotulos do CSS).
  function zonaDaCarta(carta, rar, W, H, { moldura, mini }) {
    const c = tela(W, H);
    const k = c.getContext('2d');
    const M = MOLDURAS[rar];
    k.setTransform(W / CW, 0, 0, H / CH, 0, 0);
    k.fillStyle = '#000';
    if (moldura) k.fill(M.cheia ? vazado(FAIXA, FAIXA, CW - 2 * FAIXA, CH - 2 * FAIXA, 26) : vazado(JX, JY, JW, JH, 22), 'evenodd');
    else k.fillRect(0, 0, CW, CH);
    k.globalCompositeOperation = 'destination-out';
    if (M.cheia) k.fillRect(PAPEL_CHEIO.x - 4, PAPEL_CHEIO.y - 6, PAPEL_CHEIO.w + 8, PAPEL_CHEIO.h + 10);
    else { retRedondo(k, JX - 2, PY - 2, JW + 4, PH + 4, 24); k.fill(); }
    if (!mini) {
      const P = plaqueta(k, carta, M);
      if (P.forma) k.fill(P.forma);
      else {
        // o rótulo escrito direto na moldura: a elipse macia do --sem-rotulos
        k.save();
        k.translate(CW / 2, CH * 0.056);
        k.scale(1, (CH * 0.044) / (CW * 0.35));
        const g = k.createRadialGradient(0, 0, 0, 0, 0, CW * 0.35);
        g.addColorStop(0, '#000');
        g.addColorStop(0.6, '#000');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        k.fillStyle = g;
        k.fillRect(-CW * 0.35, -CW * 0.35, CW * 0.7, CW * 0.7);
        k.restore();
      }
    }
    return c;
  }
  // uma camada: pinta, corta pelas máscaras (todas juntas, e sempre pela forma da própria carta,
  // para nada sair nos cantos redondos) e mistura na carta
  function camadaDeBrilho(k, W, H, pintar, mascaras, modo, alfa, filtro) {
    const l = tela(W, H);
    const kl = l.getContext('2d');
    pintar(kl);
    kl.globalCompositeOperation = 'destination-in';
    for (const m of [...mascaras, k.canvas]) if (m) kl.drawImage(m, 0, 0, W, H);
    k.save();
    k.globalCompositeOperation = modo;
    k.globalAlpha = Math.max(0, Math.min(1, alfa));
    if (filtro) k.filter = filtro;
    k.drawImage(l, 0, 0);
    k.restore();
  }
  function assarBrilho(c, carta, { mini = false } = {}) {
    const rar = raridadeDe(carta);
    if (rar === 'linho' || (mini && RARIDADES[rar].ordem < 2)) return c;
    const W = c.width;
    const H = c.height;
    const k = c.getContext('2d');
    const { mx, my, o, og } = REPOUSO;
    const bx = 50 + (mx - 50) * 0.9;
    const by = 50 + (my - 50) * 0.9;
    // o px do CSS numa carta de 340 (na miniatura, a trama fica um pouco mais grossa)
    const u = W / (mini ? 170 : 340);
    const tom = tomDaArte(carta);
    const clara = tom === 'clara';
    const escura = tom === 'escura';
    const moldura = zonaDaCarta(carta, rar, W, H, { moldura: true, mini });
    const semTexto = mini ? null : zonaDaCarta(carta, rar, W, H, { moldura: false });
    let luzes = moldura;
    if (!mini && (rar === 'ouro' || rar === 'gloria')) { try { luzes = mascaraDoBrilho(carta, rar); } catch (e) { /* fica a moldura */ } }
    // o fundo de 320% (ou 260%, 300%) do CSS, posto em --bx --by
    const caixa = (escala) => [(W - W * escala) * bx / 100, (H - H * escala) * by / 100, W * escala, H * escala];
    // a faixa de luz do metal, de lado a lado da moldura (o lampejo, aqui parado em --bx)
    const faixa = (meia, cor) => (kl) => {
      kl.fillStyle = gradienteCss(kl, 112, 0, 0, W, H, [[(bx - meia) / 100, 'rgba(0,0,0,0)'], [bx / 100, cor], [(bx + meia) / 100, 'rgba(0,0,0,0)']]);
      kl.fillRect(0, 0, W, H);
    };
    if (rar === 'bronze') {
      camadaDeBrilho(k, W, H, (kl) => {
        kl.fillStyle = gradienteCss(kl, 112, 0, 0, W, H, [[(bx - 46) / 100, 'rgba(90,40,0,.5)'], [(bx - 30) / 100, 'rgba(255,190,120,0)'],
          [bx / 100, 'rgba(255,206,150,.85)'], [(bx + 30) / 100, 'rgba(255,190,120,0)'], [(bx + 46) / 100, 'rgba(90,40,0,.5)']]);
        kl.fillRect(0, 0, W, H);
        faixa(7, 'rgba(255,246,228,.95)')(kl);
      }, [moldura], 'overlay', 0.3 + o * 0.7);
    }
    if (rar === 'prata') {
      camadaDeBrilho(k, W, H, (kl) => {
        const [x, y, w, h] = caixa(3.2);
        kl.fillStyle = gradienteCss(kl, 105, x, y, w, h, repetir([[0, '#6c80b4'], [0.05, '#92bcff'], [0.1, '#d2bfff'], [0.135, '#f4f8ff'],
          [0.18, '#8fdcff'], [0.23, '#b7a2ff'], [0.265, '#e9f2ff'], [0.31, '#6c80b4']], 0.31));
        kl.fillRect(0, 0, W, H);
        // a trama em losango da folha holográfica
        riscas(kl, W, H, 58, 3 * u, u, 'rgba(20,24,40,.32)');
        riscas(kl, W, H, -58, 3 * u, u, 'rgba(20,24,40,.32)');
      }, [moldura], 'hard-light', 0.32 + o * 0.55, 'brightness(.9) contrast(1.25) saturate(1.35)');
    }
    if (rar === 'ouro') {
      camadaDeBrilho(k, W, H, (kl) => {
        const [x, y, w, h] = caixa(2.6);
        kl.fillStyle = gradienteCss(kl, -58, x, y, w, h, [[0, '#8c6216'], [0.09, '#d9a640'], [0.16, '#fbe7a8'], [0.23, '#e7b552'], [0.31, '#b88a3a'],
          [0.39, '#f3d48a'], [0.47, '#c99a3c'], [0.55, '#ffe9b0'], [0.63, '#d8a24a'], [0.71, '#a87c30'], [0.8, '#f0cc7c'], [0.88, '#e2ad4c'], [1, '#8c6216']]);
        kl.fillRect(0, 0, W, H);
        kl.globalCompositeOperation = 'soft-light';
        riscas(kl, W, H, -58, 2.5 * u, 1.2 * u, 'rgba(255,246,214,.28)');
        kl.globalCompositeOperation = 'multiply';
        kl.fillStyle = radialCss(kl, W, H, mx, my, [[0, 'rgba(255,250,235,.9)'], [0.7, 'rgba(120,80,10,.35)'], [1, 'rgba(120,80,10,.35)']]);
        kl.fillRect(0, 0, W, H);
      }, semTexto ? [luzes, semTexto] : [luzes], clara && !mini ? 'soft-light' : 'color-dodge', mini ? 0.5 : clara ? 0.45 + o * 0.55 : 0.28 + o * 0.55,
      clara && !mini ? 'saturate(1.5) contrast(1.15)' : 'brightness(.6) contrast(1.15)');
    }
    if (rar === 'gloria') {
      camadaDeBrilho(k, W, H, (kl) => {
        // as faixas finas do prisma (15 px do CSS), deslocadas com --bx
        const per = 15 * u;
        const cores = ['hsl(42 95% 74%)', 'hsl(330 80% 80%)', 'hsl(265 70% 82%)', 'hsl(205 85% 76%)', 'hsl(160 60% 74%)', 'hsl(42 95% 74%)'];
        const L = Math.hypot(W, H) + per * 2;
        const desvio = ((bx / 100) * W * 2) % per;
        kl.save();
        kl.translate(W / 2, H / 2);
        kl.rotate(((115 - 90) * Math.PI) / 180);
        const g = kl.createLinearGradient(-L / 2 - desvio, 0, L / 2 - desvio, 0);
        const n = Math.ceil(L / per);
        for (let i = 0; i < n; i++) cores.forEach((cor, j) => g.addColorStop(Math.min(1, (i + j / 5) / n), cor));
        kl.fillStyle = g;
        kl.fillRect(-L / 2, -L / 2, L, L);
        kl.restore();
        kl.globalCompositeOperation = 'multiply';
        kl.fillStyle = radialCss(kl, W, H, mx, my, [[0, 'rgba(255,255,255,.7)'], [0.8, 'rgba(60,60,80,.4)'], [1, 'rgba(60,60,80,.4)']]);
        kl.fillRect(0, 0, W, H);
      }, semTexto ? [luzes, semTexto] : [luzes], (clara || escura) && !mini ? 'soft-light' : 'color-dodge',
      mini ? 0.55 : clara ? 0.3 + o * 0.55 : escura ? 0.25 + o * 0.35 : 0.4 + o * 0.55,
      clara && !mini ? 'saturate(1.5) contrast(1.15)' : escura && !mini ? 'saturate(1.3)' : 'brightness(.6) contrast(1.25)');
    }
    // o metal da moldura: a faixa de luz que corre (prata, ouro e glória)
    if (rar !== 'bronze') {
      const [meia, cor, alfa] = { prata: [9, 'rgba(240,248,255,.95)', 0.15], ouro: [10, 'rgba(255,252,230,.95)', 0.25], gloria: [12, 'rgba(255,255,255,.95)', 0.3] }[rar];
      camadaDeBrilho(k, W, H, faixa(meia, cor), [moldura], 'overlay', alfa + o * (1 - alfa));
    }
    if (mini) return c;
    // a purpurina perto da luz (ouro e glória), nas luzes da arte e na moldura
    if (rar === 'ouro' || rar === 'gloria') {
      const pp = purpurina(W, H, rar, 31);
      const perto = tela(W, H);
      const kp = perto.getContext('2d');
      kp.fillStyle = radialCss(kp, W, H, mx, my, rar === 'ouro' ? [[0, '#000'], [0.26, 'rgba(0,0,0,.55)'], [0.58, 'rgba(0,0,0,0)']]
        : [[0, '#000'], [0.34, 'rgba(0,0,0,.6)'], [0.7, 'rgba(0,0,0,.15)'], [1, 'rgba(0,0,0,.15)']]);
      kp.fillRect(0, 0, W, H);
      camadaDeBrilho(k, W, H, (kl) => kl.drawImage(pp, 0, 0), [perto, luzes, semTexto],
        rar === 'gloria' ? 'screen' : clara ? 'overlay' : 'color-dodge', rar === 'gloria' ? 0.4 + o * 0.6 : 0.35 + o * 0.65);
    }
    // o reflexo: a luz da mesa, fora do papel e do rótulo
    camadaDeBrilho(k, W, H, (kl) => {
      kl.fillStyle = radialCss(kl, W, H, mx, my, [[0, 'rgba(255,255,255,.85)'], [0.22, 'rgba(255,255,255,.3)'], [0.95, 'rgba(0,0,0,.4)'], [1, 'rgba(0,0,0,.4)']]);
      kl.fillRect(0, 0, W, H);
    }, [semTexto], 'overlay', og * (escura ? 0.3 : 0.55));
    return c;
  }
  // O halo da glória em volta da carta (o ::before do CSS): o brilho macio, dourado e perolado,
  // na forma da carta, igual dos quatro lados. x, y, w, h é a carta; ela é desenhada por cima.
  function haloAssado(k, x, y, w, h) {
    const u = w / 340;
    const raio = w * 0.046;
    for (const [borrao, abre, cor] of [[16, 3, 'rgba(255,224,150,.8)'], [34, 8, 'rgba(255,196,228,.32)'], [56, 14, 'rgba(170,214,255,.24)']]) {
      const a = abre * u;
      k.save();
      // só a sombra: a forma fica longe, fora do canvas, e a sombra volta para o lugar
      k.shadowColor = cor;
      k.shadowBlur = borrao * u;
      k.shadowOffsetX = 20000;
      k.fillStyle = '#000';
      retRedondo(k, x - a - 20000, y - a, w + 2 * a, h + 2 * a, raio + a);
      k.fill();
      k.restore();
    }
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
    const { ilu, foco } = ilustracao(carta);
    retRedondo(k, 0, 0, CW, CH, 46);
    k.clip();
    let papel;
    if (M.cheia) {
      porArte(k, ilu, true, foco);
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
    // da prata para cima, o tom parado do holo na moldura, para a raridade se ver na grade
    return assarBrilho(c, carta, { mini: true });
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
    // a carta com o brilho da raridade assado, no repouso (assarBrilho); na glória, o halo
    const carta2 = assarBrilho(desenharCarta(tela(cw, ch), carta), carta);
    k.save();
    k.filter = 'blur(40px)';
    k.fillStyle = 'rgba(0,0,0,.7)';
    k.fillRect(L / 2 - cw / 2 + 20, 420 + 40, cw - 40, ch - 20);
    k.restore();
    if (raridadeDe(carta) === 'gloria') haloAssado(k, L / 2 - cw / 2, 400, cw, ch);
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
  const INCLINACAO = { linho: 7, bronze: 10, prata: 12, ouro: 14, gloria: 14 };
  const MQ_MENOS = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const menosMovimento = () => !!(MQ_MENOS && MQ_MENOS.matches) || document.documentElement.classList.contains('menos-movimento');
  // O brilho parado: com a carta em repouso (sem dedo nem giroscópio, sem varredura, fora das
  // fases da revelação), a luz passeia devagar pela carta, como um holográfico sobre a mesa.
  // Por raridade: o (o holo em repouso, 0 a 1), og (o reflexo), ax/ay (quanto a luz anda, em %
  // da carta), incl (a respiração da inclinação, em graus), lampejo [a cada s, dura s, reforço]
  // (o reflexo de metal que passa de lado a lado da moldura) e halo (o pulso do halo, em s).
  // A luz faz uma Lissajous lenta (10,5 s por 14,5 s), sem repetir o mesmo caminho logo.
  const PARADO = {
    linho: { o: 0, og: 0.55, ax: 22, ay: 15, incl: 0.8 },
    bronze: { o: 0.12, og: 0.32, ax: 18, ay: 12, incl: 1, lampejo: [4.2, 1.4, 0.5] },
    prata: { o: 0.42, og: 0.3, ax: 30, ay: 22, incl: 1.2, lampejo: [6, 1.7, 0.15] },
    ouro: { o: 0.45, og: 0.3, ax: 32, ay: 26, incl: 1.4, lampejo: [5.5, 1.7, 0] },
    gloria: { o: 0.55, og: 0.3, ax: 34, ay: 28, incl: 1.5, lampejo: [5, 1.9, 0], halo: 4.6 },
  };
  // Quem está à vista: um IntersectionObserver só, para todas as cartas vivas, e o
  // visibilitychange da aba; fora da tela ou com a aba escondida, o brilho parado dorme.
  const VIGIADAS = new Map();
  let olho = null;
  function vigiar(el, aviso) {
    VIGIADAS.set(el, aviso);
    if (typeof IntersectionObserver !== 'function') { aviso(true); return; }
    if (!olho) olho = new IntersectionObserver((es) => { for (const e of es) { const f = VIGIADAS.get(e.target); if (f) f(e.isIntersecting); } });
    olho.observe(el);
  }
  function esquecer(el) {
    VIGIADAS.delete(el);
    if (olho) olho.unobserve(el);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) for (const f of [...VIGIADAS.values()]) f(null); });
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
  function cartaViva(carta, { largura = 300, verso = false, interativa = true, parada = true } = {}) {
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
    // o tom da arte, medido no desenho (tomDe): na clara, o holo troca o color-dodge, que
    // estoura o claro; na escura, o reflexo e o holo da glória baixam
    const tom = tomDaArte(carta);
    if (tom) el.dataset.arte = tom;
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
    // O brilho parado (PARADO): w é o peso dele (0 a 1), que sobe devagar quando a carta fica em
    // repouso e desce rápido quando o dedo pega; o que ele soma vai por cima do valor da mola,
    // então a troca entre o dedo e o repouso nunca pula. t é o relógio dele (só anda quando ele
    // roda); lx é o lugar do lampejo de metal (estacionado fora da carta entre um e outro).
    const P = PARADO[rar];
    const pd = { ligado: !!parada, visivel: false, conectou: false, mao: false, w: 0, t: 0, ultimo: 0, aplicou: 0,
      lx: 130, ini: -1, prox: 0.6, reforco: 0 };
    const rodaParado = () => pd.ligado && pd.visivel && !document.hidden && !menosMovimento();
    const querParado = () => rodaParado() && !pd.mao && !tween;
    const aplicar = () => {
      const g = est.giro[0];
      const s = el.style;
      const w = pd.w;
      const a = (pd.t / 10.5) * 6.2832;
      const b = (pd.t / 14.5) * 6.2832 + 0.9;
      const mx = est.mx[0] + w * P.ax * Math.sin(a);
      const my = est.my[0] + w * P.ay * Math.sin(b);
      s.setProperty('--rx', (est.rx[0] - w * P.incl * 0.8 * Math.sin(b)).toFixed(2) + 'deg');
      s.setProperty('--ry', (est.ry[0] + w * P.incl * Math.sin(a)).toFixed(2) + 'deg');
      s.setProperty('--giro', g.toFixed(2) + 'deg');
      s.setProperty('--mx', mx.toFixed(1) + '%');
      s.setProperty('--my', my.toFixed(1) + '%');
      // o holo corre com o ângulo: inclinar e girar mexem a posição das faixas
      const gx = Math.sin((g * Math.PI) / 180) * 40;
      const bx = 50 + (mx - 50) * 0.9 + gx;
      s.setProperty('--bx', bx.toFixed(1) + '%');
      s.setProperty('--by', (50 + (my - 50) * 0.9).toFixed(1) + '%');
      // o lampejo: com o dedo, na faixa de luz do holo (--bx); parada, no lugar dele
      s.setProperty('--lx', (P.lampejo ? bx * (1 - w) + pd.lx * w : bx).toFixed(1) + '%');
      s.setProperty('--o', Math.max(0, Math.min(1, est.o[0] + w * (P.o + pd.reforco))).toFixed(3));
      s.setProperty('--og', Math.max(0, Math.min(1, est.o[0] + w * P.og)).toFixed(3));
      if (P.halo) s.setProperty('--halo', (w * (0.5 - 0.5 * Math.cos((pd.t / P.halo) * 6.2832))).toFixed(3));
      // a sombra só segue o dedo (o brilho parado não repinta a sombra a cada quadro)
      s.setProperty('--d', (Math.hypot(est.mx[0] - 50, est.my[0] - 50) / 70).toFixed(3));
      const lado = ((Math.round(g / 180) % 2) + 2) % 2 === 1;
      el.classList.toggle('mostra-verso', lado);
      pd.aplicou = performance.now();
    };
    // um passo do brilho parado: o peso, o relógio e o lampejo; diz se ainda quer quadros
    const passoParado = (agora) => {
      const dt = Math.min(50, Math.max(0, agora - (pd.ultimo || agora)));
      pd.ultimo = agora;
      if (!rodaParado()) { pd.ultimo = 0; return false; }
      const alvoW = querParado() ? 1 : 0;
      if (pd.w !== alvoW) {
        pd.w += (alvoW - pd.w) * (1 - Math.exp(-dt / (alvoW > pd.w ? 500 : 220)));
        if (Math.abs(alvoW - pd.w) < 0.003) pd.w = alvoW;
      }
      if (pd.w <= 0) return alvoW > 0;
      pd.t += dt / 1000;
      if (P.lampejo) {
        const [cada, dura, forca] = P.lampejo;
        // só começa com o peso cheio: assim a volta para fora da carta nunca aparece
        if (pd.ini < 0 && pd.t >= pd.prox && pd.w > 0.97) pd.ini = pd.t;
        if (pd.ini >= 0) {
          const f = (pd.t - pd.ini) / dura;
          if (f >= 1) { pd.ini = -1; pd.lx = 130; pd.reforco = 0; pd.prox = pd.t + cada - dura; } else {
            pd.lx = -30 + 160 * f * f * (3 - 2 * f);
            pd.reforco = forca * Math.sin(Math.PI * f);
          }
        }
      }
      return true;
    };
    const passo = () => {
      quadro = 0;
      const agora = performance.now();
      let mexendo = false;
      if (tween) {
        const t = Math.min(1, (agora - tween.inicio) / tween.duracao);
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
      if (pd.conectou && !el.isConnected) { esquecer(el); pd.ligado = false; }
      const parado = passoParado(agora);
      // só o brilho parado andando (a luz devagar): 30 quadros por segundo bastam
      if (mexendo || pd.w < 1 || agora - pd.aplicou > 30) aplicar();
      if (mexendo || parado) quadro = requestAnimationFrame(passo);
    };
    const mover = () => { if (!quadro) quadro = requestAnimationFrame(passo); };
    const alvo = (vals) => { for (const [n, v] of Object.entries(vals)) est[n][2] = v; mover(); };
    vigiar(el, (v) => {
      if (v !== null) pd.visivel = v;
      if (v) pd.conectou = true;
      if (pd.conectou && !el.isConnected) { esquecer(el); return; }
      mover();
    });
    const mirar = (fx, fy, forca = 1) => {
      // fx, fy de 0 a 1 na carta; a carta inclina para longe do dedo, como quem aperta a ponta
      const verso = el.classList.contains('mostra-verso');
      pd.mao = true;
      alvo({ rx: (0.5 - fy) * 2 * max * forca, ry: (fx - 0.5) * 2 * max * forca * (verso ? -1 : 1), mx: fx * 100, my: fy * 100, o: forca });
    };
    const api = {
      el,
      raridade: rar,
      // fx, fy (0 a 1): põe a carta naquele ângulo na hora, sem mola (para as capturas)
      inclinar(fx, fy, forca = 1) {
        mirar(fx, fy, forca);
        for (const v of Object.values(est)) { v[0] = v[2]; v[1] = 0; }
        pd.w = 0;
        aplicar();
      },
      // larga a carta: ela volta ao repouso e, se o brilho parado estiver ligado, ele volta devagar
      soltar() { pd.mao = false; alvo({ rx: 0, ry: 0, mx: 50, my: 50, o: 0 }); },
      // liga (padrão) ou desliga o brilho parado; a revelação o liga só no fim
      parada(ligar = true) { pd.ligado = !!ligar; mover(); },
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
            pd.mao = true;
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
    // o brilho parado espera o fim: nas fases da revelação, a luz é a da linha do tempo
    const api = cartaViva(c, { largura: larg, verso: true, parada: false });
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
      api.parada(true);
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
