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
    const pe = [(p0 + p1) / 2, 800];
    const caminho = [...bezier([20, 712], [230, 700], [pe[0] - 60, 836], pe, 11)];
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
    // a boca: o lado de dentro em hachura curva (escuro sob a borda de trás), e o aro
    const boca = new Path2D();
    boca.ellipse(bx, bo, RX - 8, RY - 6, 0, 0, 6.283);
    k.fillStyle = '#8a6438';
    k.fill(boca);
    k.save();
    k.clip(boca);
    for (let i = 0; i < 16; i++) {
      const t = i / 16;
      k.strokeStyle = 'rgba(30,18,6,' + (0.7 - t * 0.4).toFixed(2) + ')';
      k.lineWidth = 2.2 - t * 1.2;
      k.beginPath();
      k.ellipse(bx, bo - RY * 0.2 + t * 60, (RX - 14) * (1 - t * 0.12), (RY - 10) * (1 - t * 0.1), 0, Math.PI * 1.04, Math.PI * 1.96);
      k.stroke();
    }
    k.restore();
    const aro = (a0, a1) => cordao(k, Array.from({ length: 37 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 36; return [bx + Math.cos(a) * (RX - 3), bo + Math.sin(a) * (RY - 2)]; }), 10, { cor: '#d8b47a', escuro: '#2e1e0c', luz: 'rgba(255,240,200,.6)' });
    aro(Math.PI, Math.PI * 2);
    marcar(k, obj, boca);
    // a criança enrolada: o embrulho de pano, a ponta da cabeça mais cheia (à esquerda), as faixas
    // cruzadas e as dobras; sem rosto
    const bb = bo + 24;
    const emb = new Path2D();
    emb.moveTo(bx - 168, bb + 4);
    emb.bezierCurveTo(bx - 176, bb - 60, bx - 96, bb - 86, bx - 58, bb - 54);
    emb.bezierCurveTo(bx - 10, bb - 66, bx + 70, bb - 58, bx + 120, bb - 34);
    emb.bezierCurveTo(bx + 158, bb - 18, bx + 162, bb + 10, bx + 130, bb + 18);
    emb.bezierCurveTo(bx + 40, bb + 26, bx - 80, bb + 28, bx - 168, bb + 4);
    emb.closePath();
    sombraNoChao(k, emb, -10, 8, 8, 0.45);
    peca(k, emb, [bx - 176, bb - 86, bx + 162, bb + 28], { cor: '#f7eedb', ang: 0.25, passo: 3.8, maxL: 1.6, sombra: (x, y) => 0.1 + (y - bb + 40) / 120 + (bx - x) / 900, tinta: '#3a2c16', cruzada: 0.7, obj, traco: 2.2 });
    k.save();
    k.clip(emb);
    // o pano dobrado em volta da cabeça
    k.strokeStyle = '#3a2c16';
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(bx - 60, bb - 56);
    k.bezierCurveTo(bx - 40, bb - 30, bx - 52, bb + 2, bx - 80, bb + 22);
    k.stroke();
    k.lineWidth = 1.4;
    k.beginPath();
    k.moveTo(bx - 120, bb - 72);
    k.bezierCurveTo(bx - 96, bb - 50, bx - 92, bb - 20, bx - 110, bb + 12);
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
    // as dobras compridas do pano
    k.lineWidth = 1.3;
    for (const [a, b] of [[-140, -10], [-10, -30], [100, 0]]) {
      k.beginPath();
      k.moveTo(bx + a, bb + b);
      k.quadraticCurveTo(bx + a + 30, bb + b - 18, bx + a + 60, bb + b - 8);
      k.stroke();
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
    for (const [a, b] of [[10, -40], [60, -20], [40, 6]]) { k.beginPath(); k.moveTo(bx + a, bb + b); k.quadraticCurveTo(bx + a + 40, bb + b - 14, bx + a + 80, bb + b + 2); k.stroke(); }
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
      const coroa = pol([[-12, -26], [-14, -40], [-7, -33], [0, -44], [7, -33], [14, -40], [12, -26]]);
      peca(k, coroa, [-14, -44, 14, -26], { cor: '#b9784a', sombra: () => 0.5, passo: 2.8, maxL: 1.2, tinta: '#3a1a08', obj, traco: 1.8 });
      k.strokeStyle = 'rgba(110,30,14,.85)';
      k.lineWidth = 3;
      k.beginPath();
      k.ellipse(0, -2, 31, 7, 0, 0.1, Math.PI - 0.1);
      k.stroke();
      k.lineWidth = 2;
      k.beginPath();
      k.ellipse(0, 10, 27, 6, 0, 0.2, Math.PI - 0.2);
      k.stroke();
      k.fillStyle = '#2a1206';
      for (const [dx, dy] of [[-14, -12], [8, -16], [18, -6], [-4, -10]]) { k.beginPath(); k.arc(dx, dy, 2, 0, 6.283); k.fill(); }
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
    k.rotate(giro);
    const contorno = [[-L * 0.62, 0], [-L * 0.36, -alto * 0.3], [-L * 0.2, yA], [-L * 0.5 * abre, -alto * 0.74], [-L * 0.62 * abre, -alto * 0.92], [-L * 0.3 * abre, -alto * 1.02],
      [0, -alto * 1.05], [L * 0.3 * abre, -alto * 1.02], [L * 0.62 * abre, -alto * 0.92], [L * 0.5 * abre, -alto * 0.74], [L * 0.2, yA], [L * 0.36, -alto * 0.3], [L * 0.62, 0]].map(B);
    const p = new Path2D();
    p.moveTo(contorno[0][0], contorno[0][1]);
    for (let i = 1; i < contorno.length - 1; i++) p.quadraticCurveTo(contorno[i][0], contorno[i][1], (contorno[i][0] + contorno[i + 1][0]) / 2, (contorno[i][1] + contorno[i + 1][1]) / 2);
    p.lineTo(contorno[contorno.length - 1][0], contorno[contorno.length - 1][1]);
    p.closePath();
    sombraNoChao(k, p, 8, 4, 6, 0.3);
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
    // a roda dos onze feixes: espaçados por igual numa elipse aberta na frente, cada um
    // inclinado de 20 a 35 graus para o feixe de José, com a cabeça curvada para ele
    const cx = W / 2;
    const cy = 616;
    const RX = 366;
    const RY = 150;
    // seis à esquerda e cinco à direita, por igual ao longo do arco (na tela), com a abertura
    // na frente e uma fresta atrás, para nenhum ficar escondido atrás do feixe de José
    const arco = (a0, a1, n) => {
      const pts = Array.from({ length: 201 }, (_, i) => a0 + ((a1 - a0) * i) / 200);
      const acum = [0];
      for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + Math.hypot(RX * (Math.cos(pts[i]) - Math.cos(pts[i - 1])), RY * (Math.sin(pts[i]) - Math.sin(pts[i - 1]))));
      const tot = acum[acum.length - 1];
      return Array.from({ length: n }, (_, j) => pts[acum.findIndex((v) => v >= (tot * j) / (n - 1))]);
    };
    const roda = [...arco(Math.PI / 2 + 0.78, Math.PI * 1.5 - 0.3, 6), ...arco(Math.PI * 1.5 + 0.42, Math.PI * 2.5 - 0.78, 5)];
    const um = (a) => {
      const sx = Math.cos(a);
      const sy = Math.sin(a);
      const e = 0.72 + sy * 0.16;
      const lado = sx < 0 ? 1 : -1;
      const fundo = Math.max(0, -sy);
      const inc = (0.35 + r() * 0.26) * (1 - fundo * Math.max(0, 1 - Math.abs(sx) * 2.2) * 0.5);
      k.save();
      k.translate(cx + sx * RX, cy + sy * RY);
      k.scale(1, 1 - fundo * 0.12);
      feixe(k, r, 0, 0, 176 * e, lado * inc, { obj, dobra: lado * (0.18 + r() * 0.12), varia: 1, cor: r() < 0.5 ? '#e2b866' : '#ddb05c' });
      k.restore();
    };
    for (const a of roda.filter((a) => Math.sin(a) < 0)) um(a);
    feixe(k, r, cx, cy + 14, 318, 0, { cor: '#f0c874', obj });
    for (const a of roda.filter((a) => Math.sin(a) >= 0).sort((a, b) => Math.sin(a) - Math.sin(b))) um(a);
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
    // o linho posto para secar no terraço: feixes de hastes deitados no parapeito, com as
    // cápsulas numa ponta e a amarra no meio
    for (let i = 0; i < 5; i++) {
      const fx = x0 - 6 + i * 66 + (r() - 0.5) * 8;
      const fy = tc - 30 - (i % 2) * 6;
      const g = (r() - 0.5) * 0.12;
      k.save();
      k.translate(fx, fy);
      k.rotate(g);
      const f = pol([[0, -6], [104, -9], [112, 0], [104, 9], [0, 6]]);
      peca(k, f, [0, -9, 112, 9], { cor: '#e3cf98', ang: 0, passo: 2.6, maxL: 1, sombra: (x, yy) => 0.2 + (yy + 9) / 30, traco: 1.6 });
      k.fillStyle = '#7a6436';
      for (let j = 0; j < 7; j++) { k.beginPath(); k.arc(104 + (r() - 0.5) * 8, (j - 3) * 2.6, 2.2, 0, 6.283); k.fill(); }
      k.strokeStyle = '#8a5a2a';
      k.lineWidth = 3;
      k.beginPath();
      k.moveTo(46, -8);
      k.lineTo(46, 8);
      k.stroke();
      k.restore();
    }
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
      k.strokeStyle = '#5a2406';
      k.lineWidth = 1.6;
      k.stroke(p);
    }
    camadas.forEach(([s, cor], i) => {
      const p = lingua(s * (1 - i * 0.04), -i * 3, h * (0.35 + s * 0.65), vai * s * (1 + i * 0.25));
      k.fillStyle = cor;
      k.fill(p);
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
    // o vaso quebrado: a barriga que ficou, partida em linha torta que acompanha a curva do
    // vaso; na beirada, a espessura do barro (clara por dentro), e o escuro lá dentro
    const bx = tx;
    const bb = 744;
    const R = 78;
    // a linha da quebra: alta à esquerda (ficou um pedaço do ombro), baixa à direita, com
    // degraus e lascas desiguais, nunca em dente regular
    const alturas = [158, 150, 162, 140, 128, 132, 112, 104, 108, 92, 96, 84, 88, 80];
    const corte = alturas.map((h, i) => {
      const t = i / (alturas.length - 1);
      const x = bx - R * 1.02 + t * R * 2.04 + (r() - 0.5) * 6;
      const larg = R * (h > 120 ? 0.86 + (h - 120) / 400 : 1);
      return [bx + ((x - bx) / R) * larg, bb - h + (r() - 0.5) * 5];
    });
    const barriga = new Path2D();
    barriga.moveTo(corte[0][0], corte[0][1]);
    corte.forEach(([x, y]) => barriga.lineTo(x, y));
    barriga.bezierCurveTo(bx + R + 8, bb - 40, bx + R * 0.7, bb, bx, bb);
    barriga.bezierCurveTo(bx - R * 0.7, bb, bx - R - 8, bb - 40, corte[0][0], corte[0][1]);
    barriga.closePath();
    sombraNoChao(k, barriga, -26, 10, 8, 0.6);
    // o lado de dentro, escuro, que aparece por cima da beirada de trás
    const dentro = new Path2D();
    dentro.ellipse(bx + 4, bb - 104, R - 10, 18, -0.12, 0, 6.283);
    k.fillStyle = '#120804';
    k.fill(dentro);
    peca(k, barriga, [bx - R - 8, bb - 170, bx + R + 8, bb], { cor: '#a6623a', tinta: '#1a0c04', ang: 0.2, passo: 3.4, maxL: 2.1, sombra: (x, y) => 0.25 - (x - bx) / 260 + (y - bb + 100) / 400, cruzada: 0.72, traco: 2.4, obj, abaulado: 0.25 });
    // a espessura na beirada partida: a faixa clara do barro cortado
    k.strokeStyle = '#e2a874';
    k.lineWidth = 5;
    k.lineJoin = 'miter';
    k.beginPath();
    corte.forEach(([x, y], i) => (i ? k.lineTo(x, y + 3) : k.moveTo(x, y + 3)));
    k.stroke();
    k.strokeStyle = '#1a0c04';
    k.lineWidth = 1.6;
    k.beginPath();
    corte.forEach(([x, y], i) => (i ? k.lineTo(x, y + 6) : k.moveTo(x, y + 6)));
    k.stroke();
    // a tocha: o cabo curto de madeira saindo do vaso, inclinado, com o pano enrolado
    const t0 = [bx - 4, bb - 80];
    const t1 = [bx + 64, bb - 268];
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
    // os cacos: lascas angulosas e curvas, clara a face de dentro, escura a de fora, com a
    // espessura na quebra
    const cacos = [[bx - 162, bb + 26, 0.4, 1], [bx + 132, bb + 18, -0.5, 0], [bx + 210, bb - 16, 1.1, 1], [bx - 110, bb + 62, -0.9, 0], [bx + 52, bb + 54, 0.25, 1], [bx - 230, bb - 6, 2.2, 0]];
    for (const [x, y, gi, dentroV] of cacos) {
      const s = 0.8 + r() * 0.5;
      const pts = [[-30, -4], [-12, -20], [16, -16], [34, 2], [20, 14], [-6, 10], [-22, 12]].map(([a, b]) => [a * s + (r() - 0.5) * 6, b * s + (r() - 0.5) * 5]);
      k.save();
      k.translate(x, y);
      k.rotate(gi);
      sombraNoChao(k, pol(pts), -8, 6, 4, 0.6);
      const face = pol(pts);
      peca(k, face, [-34, -22, 36, 16], { cor: dentroV ? '#d39864' : '#94522c', tinta: '#1a0c04', ang: 0.8, passo: 3.2, maxL: 1.5, sombra: (px, py) => (dentroV ? 0.15 : 0.5) + (py + 20) / 120, cruzada: 0.8, traco: 2, obj });
      // a espessura: a faixa clara num dos lados partidos
      k.strokeStyle = '#e8b484';
      k.lineWidth = 3.4;
      k.beginPath();
      k.moveTo(pts[3][0], pts[3][1]);
      k.lineTo(pts[4][0], pts[4][1] + 2);
      k.lineTo(pts[5][0], pts[5][1] + 2);
      k.stroke();
      // a curva do vaso que a lasca guarda
      k.strokeStyle = 'rgba(26,12,4,.7)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(pts[0][0] + 6, pts[0][1] + 2);
      k.quadraticCurveTo(0, -6 * s, pts[3][0] - 6, pts[3][1]);
      k.stroke();
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

  // A juba em gravura: mechas curvas que saem de um centro (cx, cy) e vão para fora, mais
  // grossas e escuras longe da luz; "forma" é o contorno da juba.
  function juba(k, r, forma, cx, cy, raio, luz, tinta) {
    k.save();
    k.clip(forma);
    k.lineCap = 'round';
    for (let i = 0; i < 900; i++) {
      const a = r() * 6.283;
      const d0 = raio * (0.2 + r() * 0.85);
      const c = 14 + r() * 22;
      const x0 = cx + Math.cos(a) * d0;
      const y0 = cy + Math.sin(a) * d0 * 1.05;
      const curva = (r() - 0.5) * 0.8;
      const x1 = x0 + Math.cos(a + curva) * c;
      const y1 = y0 + Math.sin(a + curva) * c;
      const s = Math.max(0, Math.min(1, luz(x0, y0)));
      k.strokeStyle = tinta;
      k.globalAlpha = 0.35 + s * 0.6;
      k.lineWidth = 0.7 + s * 1.6;
      k.beginPath();
      k.moveTo(x0, y0);
      k.quadraticCurveTo((x0 + x1) / 2 + Math.cos(a + 1.57) * c * 0.15, (y0 + y1) / 2 + Math.sin(a + 1.57) * c * 0.15, x1, y1);
      k.stroke();
    }
    k.restore();
  }
  // Um leão deitado de perfil, virado para a direita, com a cabeça pousada nas patas da frente e
  // os olhos fechados: o corpo comprido, a anca, a pata de trás dobrada, o rabo com o tufo, a
  // juba em mechas e a cabeça de focinho reto, sobrancelha pesada e boca fechada. Gravura de
  // livro de história natural. (x, y) é o chão sob o peito; "e" a escala.
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
    // a pata da frente de trás (a do outro lado), um pouco atrás da de cá
    const pata2 = pol([[60, -44], [150, -30], [214, -30], [226, -20], [222, -6], [150, -8], [60, -14]]);
    peca(k, pata2, [60, -44, 226, -6], { cor: '#b98c52', tinta, ang: 0.1, passo: 3.2, maxL: 1.6, sombra: () => 0.6, cruzada: 0.75, traco: 1.8 });
    // a juba: das orelhas ao peito, em mechas
    const jb = lanoso(r, [[20, -150], [70, -168], [120, -150], [138, -110], [132, -60], [110, -20], [70, -8], [30, -24], [0, -70], [4, -120]], 12, 22);
    k.fillStyle = '#9a6a38';
    k.fill(jb);
    marcar(k, obj, jb);
    juba(k, r, jb, 116, -84, 120, (px, py) => 0.35 + (120 - px) / 220 + (py + 80) / 300, tinta);
    k.strokeStyle = tinta;
    k.lineWidth = 2;
    k.stroke(jb);
    // a pata da frente de cá, estendida, com a pata redonda e os dedos
    const pata = new Path2D();
    pata.moveTo(40, -44);
    pata.bezierCurveTo(100, -40, 160, -34, 196, -34);
    pata.bezierCurveTo(232, -36, 254, -22, 252, -6);
    pata.bezierCurveTo(250, 4, 230, 4, 200, 2);
    pata.lineTo(40, 0);
    pata.closePath();
    peca(k, pata, [40, -44, 254, 4], { cor: '#d6ab70', tinta, ang: 0.05, passo: 3.2, maxL: 1.7, sombra: (px, py) => 0.18 + (py + 40) / 50, cruzada: 0.75, traco: 2, obj, abaulado: 0.3 });
    k.strokeStyle = tinta;
    k.lineWidth = 1.6;
    for (const dx of [216, 228, 240]) { k.beginPath(); k.moveTo(dx, -30 + (dx - 216) * 0.3); k.quadraticCurveTo(dx + 5, -14, dx + 3, 1); k.stroke(); }
    // a cabeça, pousada nas patas: a testa que desce, a cana do nariz reta, o focinho de frente
    // quadrada, o queixo e a queixada
    const cab = new Path2D();
    cab.moveTo(108, -134);
    cab.bezierCurveTo(132, -142, 156, -132, 172, -120);
    cab.bezierCurveTo(190, -108, 204, -96, 214, -86);
    cab.bezierCurveTo(218, -80, 218, -70, 214, -62);
    cab.bezierCurveTo(206, -58, 196, -56, 190, -56);
    cab.bezierCurveTo(196, -52, 198, -44, 190, -40);
    cab.bezierCurveTo(176, -36, 152, -36, 132, -42);
    cab.bezierCurveTo(108, -54, 96, -104, 108, -134);
    cab.closePath();
    peca(k, cab, [96, -142, 218, -36], { cor: '#dcb47a', tinta, ang: 1.1, passo: 3.2, maxL: 1.7, sombra: (px, py) => 0.12 + (py + 120) / 120 + (150 - px) / 300, cruzada: 0.7, traco: 2.2, obj, abaulado: 0.2 });
    k.save();
    k.clip(cab);
    k.strokeStyle = tinta;
    k.lineCap = 'round';
    k.globalAlpha = 0.6;
    for (let i = 0; i < 40; i++) {
      const px = 112 + r() * 60;
      const py = -126 + r() * 84;
      k.lineWidth = 1;
      k.beginPath();
      k.moveTo(px, py);
      k.lineTo(px - 8 - r() * 6, py + (r() - 0.5) * 4);
      k.stroke();
    }
    k.globalAlpha = 1;
    const boch = new Path2D();
    boch.ellipse(190, -62, 20, 12, 0.2, 0, 6.283);
    gravar(k, boch, 190, -62, 22, 1.3, 3, 1.1, (px, py) => 0.2 + (py + 66) / 30, tinta, 0);
    k.restore();
    // a orelha, redonda, meio na juba
    const orelha = new Path2D();
    orelha.ellipse(118, -138, 13, 11, -0.5, 0, 6.283);
    peca(k, orelha, [105, -149, 131, -127], { cor: '#b48450', tinta, sombra: () => 0.6, passo: 2.8, maxL: 1.3, traco: 1.8 });
    k.strokeStyle = tinta;
    // a sobrancelha pesada e o olho fechado
    k.lineWidth = 2.8;
    k.beginPath();
    k.moveTo(146, -118);
    k.quadraticCurveTo(160, -122, 174, -114);
    k.stroke();
    k.lineWidth = 2.2;
    k.beginPath();
    k.moveTo(152, -104);
    k.quadraticCurveTo(162, -99, 172, -103);
    k.stroke();
    k.lineWidth = 1.1;
    for (let i = 0; i < 5; i++) { k.beginPath(); k.moveTo(149 + i * 5, -112); k.lineTo(153 + i * 5, -105); k.stroke(); }
    // a cana do nariz, o nariz, a boca fechada e os pontos dos bigodes
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(176, -114);
    k.quadraticCurveTo(196, -100, 208, -88);
    k.stroke();
    const nariz = pol([[204, -88], [216, -86], [216, -76], [206, -78]]);
    k.fillStyle = '#2a1c0e';
    k.fill(nariz);
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(214, -74);
    k.lineTo(212, -62);
    k.quadraticCurveTo(200, -58, 186, -58);
    k.stroke();
    k.fillStyle = tinta;
    for (const [px, py] of [[194, -72], [200, -70], [190, -66], [197, -65], [204, -64]]) { k.beginPath(); k.arc(px, py, 1.3, 0, 6.283); k.fill(); }
    k.restore();
  }
  // Um leão deitado como esfinge, de cabeça erguida, com a cara de três quartos para quem olha:
  // a juba em volta, as orelhas redondas, a sobrancelha pesada, os olhos abertos e calmos, o
  // nariz largo e a boca bem fechada (Dn 6.22); o corpo vai para trás, à direita, com as patas
  // da frente no chão. (x, y) é o centro da cara; "e" a escala.
  function leaoAtento(k, r, x, y, e, obj) {
    const tinta = '#2a1c0e';
    k.save();
    k.translate(x, y);
    k.scale(e, e);
    k.lineJoin = 'round';
    k.lineCap = 'round';
    const chao = 158;
    k.save();
    k.filter = 'blur(8px)';
    k.fillStyle = 'rgba(20,12,4,.5)';
    k.beginPath();
    k.ellipse(110, chao + 4, 240, 16, 0, 0, 6.283);
    k.fill();
    k.restore();
    // o corpo, deitado, para trás e para a direita: o lombo baixo, a anca, a barriga no chão
    const corpo = new Path2D();
    corpo.moveTo(40, -30);
    corpo.bezierCurveTo(120, -28, 200, -12, 250, 10);
    corpo.bezierCurveTo(306, 30, 330, 80, 318, 120);
    corpo.bezierCurveTo(310, 146, 290, chao, 256, chao);
    corpo.lineTo(40, chao);
    corpo.closePath();
    peca(k, corpo, [40, -30, 330, chao], { cor: '#d0a468', tinta, ang: 1.4, passo: 3.6, maxL: 1.9, sombra: (px, py) => 0.2 + (py + 30) / 260 + (px - 40) / 900, cruzada: 0.72, traco: 2.2, obj, abaulado: 0.25 });
    const anca = new Path2D();
    anca.ellipse(252, 96, 66, 56, -0.2, 0, 6.283);
    k.save();
    k.clip(corpo);
    gravar(k, anca, 252, 96, 76, 0.7, 3.6, 1.8, (px, py) => sombraOval(252, 96, 66, 56, -0.2)(px, py) * 0.9, tinta, 0.3);
    k.strokeStyle = tinta;
    k.lineWidth = 1.8;
    k.beginPath();
    k.ellipse(252, 96, 66, 56, -0.2, Math.PI * 0.75, Math.PI * 1.55);
    k.stroke();
    k.restore();
    // o rabo, que vem para a frente pelo chão
    const rabo = bezier([300, 140], [260, chao + 6], [190, chao + 4], [160, chao - 4], 20);
    k.strokeStyle = tinta;
    k.lineWidth = 10;
    k.beginPath();
    rabo.forEach(([a, b], i) => (i ? k.lineTo(a, b) : k.moveTo(a, b)));
    k.stroke();
    k.strokeStyle = '#c69a5e';
    k.lineWidth = 6;
    k.stroke();
    k.fillStyle = '#4a321a';
    k.fill(seixo(r, 154, chao - 6, 14, 9, -0.3, 0.2));
    // as patas da frente, deitadas no chão, viradas para quem olha
    for (const s of [-1, 1]) {
      const braco = pol([[s * 14, 96], [s * 62, 96], [s * 66, chao - 18], [s * 12, chao - 18]]);
      peca(k, braco, [-70, 96, 70, chao], { cor: '#d4a96e', tinta, ang: 1.5, passo: 3.2, maxL: 1.6, sombra: (px) => 0.3 + (s * px - 14) / 120, cruzada: 0.8, traco: 1.8, obj });
      const pata = new Path2D();
      pata.ellipse(s * 40, chao - 10, 36, 16, 0, 0, 6.283);
      peca(k, pata, [s * 40 - 36, chao - 26, s * 40 + 36, chao + 6], { cor: '#dcb27a', tinta, ang: 0.2, passo: 3, maxL: 1.5, sombra: (px, py) => 0.2 + (py - chao + 26) / 40, cruzada: 0.8, traco: 2, obj });
      k.strokeStyle = tinta;
      k.lineWidth = 1.6;
      for (const d of [-14, -2, 10, 22]) { k.beginPath(); k.moveTo(s * 40 + d, chao - 4); k.lineTo(s * 40 + d + 1, chao + 5); k.stroke(); }
    }
    // a juba: o anel de mechas em volta da cara, mais comprida embaixo
    const jb = lanoso(r, Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * 6.283; return [Math.cos(a) * 108, 8 + Math.sin(a) * (Math.sin(a) > 0 ? 112 : 112)]; }), 12, 24);
    k.fillStyle = '#9a6a38';
    k.fill(jb);
    marcar(k, obj, jb);
    juba(k, r, jb, 0, 6, 128, (px, py) => 0.3 + (px + 60) / 260 + (py + 40) / 400, tinta);
    k.strokeStyle = tinta;
    k.lineWidth = 2;
    k.stroke(jb);
    // as orelhas, redondas, no alto da juba
    for (const s of [-1, 1]) {
      const o = new Path2D();
      o.ellipse(s * 50, -64, 17, 14, s * 0.4, 0, 6.283);
      peca(k, o, [s * 50 - 17, -78, s * 50 + 17, -50], { cor: '#c4935a', tinta, sombra: () => 0.45, passo: 2.8, maxL: 1.3, traco: 2, obj });
      k.strokeStyle = tinta;
      k.lineWidth = 1.4;
      k.beginPath();
      k.ellipse(s * 50, -62, 8, 6, s * 0.4, 0, Math.PI);
      k.stroke();
    }
    // a cara: a testa larga, as maçãs, o focinho; virada um pouco para a esquerda (três quartos)
    k.save();
    k.translate(-6, 0);
    const cara = new Path2D();
    cara.moveTo(0, -66);
    cara.bezierCurveTo(30, -66, 52, -50, 56, -20);
    cara.bezierCurveTo(60, 10, 48, 34, 34, 50);
    cara.bezierCurveTo(22, 64, 8, 70, -4, 70);
    cara.bezierCurveTo(-18, 70, -32, 62, -42, 48);
    cara.bezierCurveTo(-56, 30, -62, 6, -58, -20);
    cara.bezierCurveTo(-54, -50, -30, -66, 0, -66);
    cara.closePath();
    peca(k, cara, [-62, -66, 60, 70], { cor: '#e0b97e', tinta, ang: 1.45, passo: 3.2, maxL: 1.6, sombra: (px, py) => 0.08 + Math.max(0, (px - 10) / 80) + Math.max(0, (py - 30) / 80) + Math.max(0, (-px - 40) / 60), cruzada: 0.7, traco: 2.2, obj, abaulado: 0.25 });
    // o pelo curto da cara: riscos da beirada para dentro, e a sombra das órbitas e do focinho
    k.save();
    k.clip(cara);
    k.strokeStyle = tinta;
    k.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * 6.283;
      const ex = Math.cos(a) * 58;
      const ey = Math.sin(a) * 66 + 2;
      const c = 8 + r() * 10;
      k.lineWidth = 1 + r() * 0.6;
      k.globalAlpha = 0.6;
      k.beginPath();
      k.moveTo(ex, ey);
      k.lineTo(ex - Math.cos(a) * c + (r() - 0.5) * 4, ey - Math.sin(a) * c);
      k.stroke();
    }
    k.globalAlpha = 1;
    for (const s2 of [-1, 1]) {
      const orb = new Path2D();
      orb.ellipse(s2 * 24 - 4, -18, 20, 12, 0, 0, 6.283);
      gravar(k, orb, s2 * 24 - 4, -18, 22, 0.5 * s2, 3, 1.2, (px, py) => 0.5 - (py + 18) / 30, tinta, 0);
      const boch = new Path2D();
      boch.ellipse(s2 * 20 - 4, 40, 22, 16, 0, 0, 6.283);
      gravar(k, boch, s2 * 20 - 4, 40, 24, 1.2, 3.2, 1.1, (px, py) => 0.2 + (py - 34) / 30 + (s2 * px - 10) / 60, tinta, 0);
    }
    k.restore();
    // a sobrancelha pesada, as rugas da testa
    k.strokeStyle = tinta;
    for (const s of [-1, 1]) {
      k.lineWidth = 2.8;
      k.beginPath();
      k.moveTo(s * 8 - 4, -28);
      k.quadraticCurveTo(s * 24 - 4, -34, s * 42 - 4, -28);
      k.stroke();
    }
    k.lineWidth = 1.2;
    for (const yy of [-48, -42]) { k.beginPath(); k.moveTo(-14, yy); k.quadraticCurveTo(-4, yy - 4, 8, yy); k.stroke(); }
    // os olhos: amêndoa inclinada, a íris clara, a pupila e a pálpebra
    for (const s of [-1, 1]) {
      const ox = s * 24 - 4;
      const oy = -16;
      k.save();
      k.translate(ox, oy);
      k.rotate(-s * 0.18);
      const olho = new Path2D();
      olho.moveTo(-11, 0);
      olho.quadraticCurveTo(0, -8, 11, 0);
      olho.quadraticCurveTo(0, 6, -11, 0);
      k.fillStyle = '#e8c070';
      k.fill(olho);
      k.fillStyle = '#1a0e04';
      k.beginPath();
      k.arc(0, -0.5, 3.6, 0, 6.283);
      k.fill();
      k.strokeStyle = tinta;
      k.lineWidth = 2;
      k.stroke(olho);
      k.lineWidth = 2.6;
      k.beginPath();
      k.moveTo(-12, -1);
      k.quadraticCurveTo(0, -9, 12, -1);
      k.stroke();
      k.restore();
      // a lágrima escura que desce do canto de dentro (a marca do leão)
      k.lineWidth = 1.6;
      k.beginPath();
      k.moveTo(s * 13 - 4, -12);
      k.quadraticCurveTo(s * 12 - 4, -2, s * 14 - 4, 8);
      k.stroke();
    }
    // a cana do nariz, larga, e o nariz em escudo
    k.lineWidth = 1.6;
    for (const s of [-1, 1]) { k.beginPath(); k.moveTo(s * 7 - 4, -24); k.quadraticCurveTo(s * 9 - 4, -4, s * 13 - 4, 14); k.stroke(); }
    const nariz = new Path2D();
    nariz.moveTo(-20, 14);
    nariz.quadraticCurveTo(-4, 8, 12, 14);
    nariz.quadraticCurveTo(10, 24, -4, 30);
    nariz.quadraticCurveTo(-18, 24, -20, 14);
    k.fillStyle = '#3a2214';
    k.fill(nariz);
    k.lineWidth = 1.8;
    k.stroke(nariz);
    // o focinho: as duas almofadas com os pontos dos bigodes, a boca bem fechada, o queixo
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(-4, 30);
    k.lineTo(-4, 38);
    k.stroke();
    for (const s of [-1, 1]) {
      k.beginPath();
      k.moveTo(-4, 38);
      k.quadraticCurveTo(s * 12 - 4, 45, s * 26 - 4, 44);
      k.stroke();
      k.fillStyle = tinta;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { k.beginPath(); k.arc(s * (10 + i * 6) - 4, 30 + j * 5 + i, 1.3, 0, 6.283); k.fill(); }
    }
    k.lineWidth = 1.4;
    k.beginPath();
    k.moveTo(-16, 56);
    k.quadraticCurveTo(-4, 62, 8, 56);
    k.stroke();
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
    leaoDeitado(k, r, 232, 770, 0.92, obj);
    leaoAtento(k, r, 590, 622, 0.92, obj);
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
  // Nas arquibancadas de pedra, em gravura sépia, fileira por fileira, a multidão em luz: gente
  // só em silhueta clara, sem rosto, que diminui com a distância e dá a volta na curva do fundo
  // ("temos uma multidão de testemunhas ao nosso redor"). Atrás da largada, o manto pesado
  // deixado para trás, com a corda enroscada ("afastemos de nós qualquer coisa que nos torne
  // vagarosos... aqueles pecados que se enroscam... em nossos pés").
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
    // a gente: cabeça e ombros, em luz, sem rosto; h é a altura da fileira ali. Cada um muda
    // um pouco (mais alto, mais largo, a cabeça de lado), para a fileira ser gente e não ícone
    const pessoa = (x, y, h) => {
      const w = h * (0.36 + r() * 0.12);
      const alto = h * (0.4 + r() * 0.14);
      const hc = h * (0.17 + r() * 0.05);
      const dx = (r() - 0.5) * h * 0.12;
      const p = new Path2D();
      p.moveTo(x - w, y);
      p.bezierCurveTo(x - w, y - alto * 0.8, x - w * 0.5, y - alto, x + dx * 0.5, y - alto);
      p.bezierCurveTo(x + w * 0.5, y - alto, x + w, y - alto * 0.8, x + w, y);
      p.closePath();
      p.moveTo(x + dx + hc, y - alto - hc * 0.7);
      p.ellipse(x + dx, y - alto - hc * 0.7, hc, hc * 1.1, 0, 0, 6.283);
      return p;
    };
    const luz = (p, h, x, y) => {
      k.save();
      k.translate(x, y);
      k.scale(1.18, 1.12);
      k.translate(-x, -y);
      k.fillStyle = 'rgba(255,236,186,.4)';
      k.fill(p);
      k.restore();
      k.fillStyle = '#fff6dc';
      k.fill(p);
      k.strokeStyle = 'rgba(110,72,20,.45)';
      k.lineWidth = Math.max(0.5, h * 0.03);
      k.stroke(p);
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
      peca(k, pisos, [cx0, F[1] - 60, cx1, H + 10], { cor: '#d2ac70', tinta: '#2e1c06', ang: lado > 0 ? 0.62 : Math.PI - 0.62, passo: 4.4, maxL: 1.2, sombra: () => 0.3, cruzada: 1, traco: 0 });
      peca(k, espelhos, [cx0, F[1] - 60, cx1, H + 10], { cor: '#9c7240', tinta: '#2e1c06', ang: 0, passo: 3.2, maxL: 1.8, sombra: (x) => 0.55 + Math.abs(x - F[0]) / 3000, cruzada: 0.6, traco: 0 });
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
          if (r() > 0.04) luz(pessoa(px, py, h), h, px, py);
          t += (h * (0.46 + r() * 0.22)) / (380 + 430 * u);
        }
      }
      k.strokeStyle = '#2e1c06';
      k.lineWidth = 2.4;
      k.stroke(todo);
    }
    // a curva do fundo, atrás da chegada, também cheia
    const curva = new Path2D();
    curva.moveTo(...ponto(-1, 0, 1));
    curva.quadraticCurveTo(F[0], F[1] - 90, ...ponto(1, 0, 1));
    curva.lineTo(...ponto(1, 0, 0));
    curva.quadraticCurveTo(F[0], F[1] + 4, ...ponto(-1, 0, 0));
    curva.closePath();
    peca(k, curva, [F[0] - 160, F[1] - 90, F[0] + 160, F[1] + 30], { cor: '#b48a52', tinta: '#2e1c06', ang: 0, passo: 3, maxL: 1.4, sombra: () => 0.5, cruzada: 0.7, traco: 2 });
    for (let d = 3; d >= 0; d--) {
      const f = (d + 0.5) / 4;
      for (let a = 0.05; a < 0.96; a += 0.026) {
        const ax = ponto(-1, 0, f)[0] + (ponto(1, 0, f)[0] - ponto(-1, 0, f)[0]) * a;
        const ay = F[1] + 30 - f * 60 - Math.sin(a * Math.PI) * 40 * f - 6;
        const px = ax + (r() - 0.5) * 3;
        luz(pessoa(px, ay, 13 + r() * 2), 13, px, ay);
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
    peca(k, frente, [P.x - P.w, P.y - P.h, P.x + P.w, P.y], { cor: '#efe2c0', tinta: '#2e1c06', ang: 0, passo: 3.4, maxL: 1.4, sombra: (x) => 0.2 + (x - P.x + P.w) / 600, cruzada: 1, traco: 2.2, obj });
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
    // atrás da largada (mais perto de quem olha), o manto pesado, largado, com as dobras, e a
    // corda que se enrosca em laçadas
    // o manto, aberto no chão como caiu: a gola no alto, as abas que se abrem, a barra com a
    // franja embaixo, e as dobras que saem da gola
    const gola = [236, 722];
    const manto = new Path2D();
    manto.moveTo(gola[0] - 40, gola[1] + 2);
    manto.bezierCurveTo(gola[0] - 20, gola[1] + 16, gola[0] + 20, gola[1] + 16, gola[0] + 40, gola[1] + 2);
    manto.bezierCurveTo(gola[0] + 80, gola[1] - 6, gola[0] + 120, gola[1] + 4, gola[0] + 150, gola[1] + 30);
    manto.bezierCurveTo(gola[0] + 162, gola[1] + 54, gola[0] + 150, gola[1] + 76, gola[0] + 160, gola[1] + 92);
    manto.lineTo(gola[0] - 160, gola[1] + 96);
    manto.bezierCurveTo(gola[0] - 150, gola[1] + 70, gola[0] - 166, gola[1] + 44, gola[0] - 146, gola[1] + 26);
    manto.bezierCurveTo(gola[0] - 116, gola[1] + 2, gola[0] - 76, gola[1] - 6, gola[0] - 40, gola[1] + 2);
    manto.closePath();
    sombraNoChao(k, manto, 10, 6, 10, 0.5);
    peca(k, manto, [gola[0] - 166, gola[1] - 6, gola[0] + 162, gola[1] + 96], { cor: '#7e4a32', tinta: '#22100a', ang: 0.9, passo: 3.4, maxL: 1.8, sombra: (x, y) => 0.3 + (y - gola[1]) / 220 + Math.abs(x - gola[0]) / 900, cruzada: 0.7, traco: 2.4, obj });
    k.save();
    k.clip(manto);
    for (const [dx, dy] of [[-150, 92], [-96, 96], [-40, 96], [24, 96], [86, 94], [146, 90]]) {
      const x0 = gola[0] + dx * 0.18;
      const y0 = gola[1] + 12;
      const x1 = gola[0] + dx;
      const y1 = gola[1] + dy;
      const sulco = pol([[x0, y0], [x1, y1], [x1 + 16, y1], [x0 + 4, y0]]);
      gravar(k, sulco, (x0 + x1) / 2 + 6, (y0 + y1) / 2, 70, Math.atan2(y1 - y0, x1 - x0) + 0.4, 2.6, 1.6, () => 0.85, '#22100a', 0);
      k.strokeStyle = 'rgba(236,196,150,.6)';
      k.lineWidth = 1.8;
      k.beginPath();
      k.moveTo(x0 - 3, y0);
      k.lineTo(x1 - 6, y1);
      k.stroke();
    }
    k.strokeStyle = 'rgba(214,170,96,.9)';
    k.lineWidth = 7;
    k.beginPath();
    k.moveTo(gola[0] - 164, gola[1] + 82);
    k.lineTo(gola[0] + 164, gola[1] + 78);
    k.stroke();
    k.restore();
    // a gola, com o avesso claro aparecendo
    const avesso = new Path2D();
    avesso.moveTo(gola[0] - 40, gola[1] + 2);
    avesso.bezierCurveTo(gola[0] - 20, gola[1] + 16, gola[0] + 20, gola[1] + 16, gola[0] + 40, gola[1] + 2);
    avesso.bezierCurveTo(gola[0] + 20, gola[1] - 6, gola[0] - 20, gola[1] - 6, gola[0] - 40, gola[1] + 2);
    peca(k, avesso, [gola[0] - 40, gola[1] - 6, gola[0] + 40, gola[1] + 16], { cor: '#dcc69a', tinta: '#22100a', ang: 0, passo: 2.6, maxL: 1.2, sombra: (x, y) => 0.6 - (y - gola[1]) / 30, traco: 2, obj });
    k.strokeStyle = '#22100a';
    k.lineWidth = 1.6;
    for (let x = gola[0] - 156; x < gola[0] + 158; x += 9) { const y = gola[1] + 96 - ((x - gola[0] + 156) / 314) * 4; k.beginPath(); k.moveTo(x, y); k.lineTo(x - 2, y + 9); k.stroke(); }
    const laco = (cx, cy, rx, ry, g) => Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * 6.283; return [cx + Math.cos(a) * rx * Math.cos(g) - Math.sin(a) * ry * Math.sin(g), cy + Math.cos(a) * rx * Math.sin(g) + Math.sin(a) * ry * Math.cos(g)]; });
    cordao(k, [[380, 782], [410, 770], ...laco(444, 766, 30, 16, -0.2), [472, 762], ...laco(508, 772, 26, 14, 0.25), [534, 778], [580, 770], [616, 778]], 6, { cor: '#c9a86a', escuro: '#2a1408' });
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
    // Lugares
    'jardim-eden': desenhoEden, 'montes-ararate': desenhoArarate, 'betel': desenhoBetel, 'monte-sinai': desenhoSinai,
    'rio-jordao': desenhoJordao, 'jerusalem': desenhoJerusalem, 'babilonia': desenhoBabilonia, 'ninive': desenhoNinive,
    'belem': desenhoBelem, 'mar-galileia': desenhoGalileia, 'nazare': desenhoNazare, 'patmos': desenhoPatmos };
  const temArte = (id) => Object.prototype.hasOwnProperty.call(DESENHOS, id);
  // O foco da arte cheia (a glória), opcional por desenho: [fx, fy] é o ponto do desenho (em
  // fração dos 888 x 846) que tem de ficar à vista, entre a pílula do alto e o papel do texto;
  // o terceiro número (opcional, até 1) afasta a arte, usando a margem do desenho. Quando o
  // desenho não tem mais para onde ir, a arte desce (ou sobe) e a beirada dela se estende.
  // Gideão: a corneta, deitada embaixo à direita; Ester: o alto do dossel, na beirada de cima; Sara: as
  // borlas do pano da tenda, no alto.
  const FOCO = { 'gideao-tochas': [0.6, 0.84, 0.92], 'ester-cetro': [0.5, 0, 1], 'sara-riso': [0.4, 0.15, 0.96] };
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
  // O flanco de um monte em gravura: os espigões que descem de cada pico em raio, cada um com
  // a face da luz (à direita) clara e a outra em hachura cheia. As linhas são compridas, pela
  // queda do monte (do pico para fora), e engrossam e afinam com a sombra; quando os raios se
  // abrem, entram linhas novas no meio, como o gravador faz. O lado do monte que dá as costas
  // para a luz escurece. picos: [{ x, y, n (espigões), fase }]; luz: 1 vem da direita.
  function flancoEmRaios(k, r, forma, picos, [x0, y0, x1, y1], { maxL = 2.2, cor = SEPIA, passo = 5, luz = 1, base = 0, escurece = 0.22, alcance = 900, cruzada = 0.62 } = {}) {
    k.save();
    k.clip(forma);
    k.strokeStyle = cor;
    k.lineCap = 'round';
    const dono = (x, y) => { let p = picos[0]; let dm = 1e9; for (const q of picos) { const d = Math.hypot(x - q.x, (y - q.y) * 0.8); if (d < dm && y > q.y - 6) { dm = d; p = q; } } return p; };
    for (const p of picos) {
      const n = p.n || 9;
      const fase = p.fase || 0;
      for (let D = 10, nivel = 0; D < alcance; D *= 2, nivel++) {
        const passoA = passo / D;
        const total = Math.floor(3.0 / passoA);
        for (let i = 0; i <= total; i++) {
          if (nivel > 0 && i % 2 === 0) continue;
          const a0 = -1.5 + i * passoA;
          const treme = r() * 6.283;
          let ant = null;
          for (let d = nivel ? D : 4; d < alcance; d += 6) {
            const a = a0 + Math.sin(d * 0.02 + treme) * 0.012;
            const x = p.x + Math.sin(a) * d;
            const y = p.y + Math.cos(a) * d;
            if (y > y1 || x < x0 - 20 || x > x1 + 20) break;
            if (picos.length > 1 && dono(x, y) !== p) { ant = null; continue; }
            const fi = a * n + fase + Math.sin(d * 0.018 + fase) * 0.7;
            const dx = x - p.x;
            const sv = 0.42 + Math.cos(fi) * 0.36 * luz + (dx * luz < 0 ? escurece : -escurece * 0.5) + base + d / 2400;
            const w = maxL * Math.max(0, Math.min(1, sv)) * (0.85 + Math.sin(d * 0.15 + treme) * 0.15);
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
      }
    }
    // na sombra funda, a hachura cruzada: linhas quase deitadas, como as curvas de nível
    if (cruzada < 1) {
      for (let y = y0; y < y1; y += passo * 1.3) {
        let ant = null;
        const treme = r() * 6.283;
        for (let x = x0; x <= x1; x += 6) {
          const yy = y + Math.sin(x * 0.03 + treme) * 2;
          const p = dono(x, yy);
          const dx = x - p.x;
          const dy = Math.max(1, yy - p.y);
          const a = Math.atan2(dx, dy);
          const d = Math.hypot(dx, dy);
          const fi = a * (p.n || 9) + (p.fase || 0) + Math.sin(d * 0.018 + (p.fase || 0)) * 0.7;
          const sv = 0.42 + Math.cos(fi) * 0.36 * luz + (dx * luz < 0 ? escurece : -escurece * 0.5) + base + d / 2400;
          const w = maxL * 0.75 * Math.max(0, Math.min(1, (sv - cruzada) * 2.6));
          if (ant && w > 0.25) {
            k.lineWidth = w;
            k.beginPath();
            k.moveTo(ant[0], ant[1]);
            k.lineTo(x, yy);
            k.stroke();
          }
          ant = [x, yy];
        }
      }
    }
    k.restore();
  }
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

  // (2) Os montes de Ararate (Gn 8.4): "a embarcação tocou no alto das montanhas de Ararate".
  // De longe: os dois montes (o grande, largo, de cume nevado, e o pequeno, em cone, ao lado),
  // com os espigões em gravura; a arca pequena e escura pousada no ombro do monte grande,
  // contra o céu; e a água que baixa (8.3): no flanco, as faixas molhadas dos níveis de antes;
  // embaixo, o mar da enchente em ondas compridas, com o reflexo dos montes. O vento forte que
  // fez a água baixar (8.1) rasga as nuvens em tiras.
  function desenhoArarate(k, W, H, obj) {
    const r = sorteio(6201);
    papelVelho(k, W, H, r, ['#f7efd9', '#e6d8b6', '#c6b18a'], [W * 0.45, 380]);
    const nivel = 572;
    // o céu de vento: o fim da tempestade indo embora no alto (linhas cheias), e embaixo a
    // faixa clara onde o céu abriu, atrás dos montes
    linhas(k, 0, 0, W, nivel, 5.5, 2, (x, y) => 0.12 + Math.max(0, 1 - y / 330) ** 1.4 * 0.85);
    k.strokeStyle = 'rgba(43,33,18,.5)';
    k.lineCap = 'round';
    for (let i = 0; i < 30; i++) {
      const x = r() * W;
      const y = 200 + r() * 260;
      k.lineWidth = 1 + r() * 0.8;
      k.beginPath();
      k.moveTo(x, y);
      k.quadraticCurveTo(x + 30, y - 3, x + 60 + r() * 60, y + 1);
      k.stroke();
    }
    // a frente da tempestade: uma massa só, presa ao alto, com a beirada de baixo em rolos
    for (const [base, amp, tom, sem] of [[150, 34, '#b3a689', 1], [112, 30, '#a0937a', 2]]) {
      const rr = sorteio(6230 + sem);
      const frente = new Path2D();
      frente.moveTo(-20, -20);
      frente.lineTo(W + 20, -20);
      let x = W + 20;
      let y = base + (rr() - 0.5) * amp;
      frente.lineTo(x, y);
      while (x > -20) {
        const l = 50 + rr() * 70;
        const ny = base + (rr() - 0.5) * amp + Math.sin(x * 0.01 + sem) * amp * 0.6;
        frente.quadraticCurveTo(x - l / 2, Math.max(y, ny) + 18 + rr() * 22, x - l, ny);
        x -= l;
        y = ny;
      }
      frente.lineTo(-20, -20);
      frente.closePath();
      k.fillStyle = tom;
      k.fill(frente);
      gravar(k, frente, W / 2, base / 2, 520, 0, 3.8, 2.1, (px, py) => 0.9 - Math.max(0, (py - base + 30) / 60) * 0.7, SEPIA, 0);
      gravar(k, frente, W / 2, base / 2, 520, 0.75, 5.2, 1.5, (px, py) => 0.8 - py / base * 0.6, SEPIA, 0);
      k.strokeStyle = 'rgba(43,33,18,.8)';
      k.lineWidth = 1.6;
      k.stroke(frente);
    }
    const contorno = (pts, asp) => { const p = contornoRocha(r, pts, asp); p.closePath(); return p; };
    // o monte pequeno, em cone, atrás e mais claro
    const pq = contorno([[-10, nivel + 4], [-10, 452], [52, 396], [112, 338], [150, 300], [172, 288], [194, 296], [230, 332], [280, 382], [334, 426], [404, nivel + 4]], 4);
    k.fillStyle = '#d2c5a2';
    k.fill(pq);
    flancoEmRaios(k, r, pq, [{ x: 172, y: 288, n: 7, fase: 1 }], [-10, 280, 410, nivel + 4], { maxL: 2.4, passo: 5, base: 0.05 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(pq);
    // o monte grande: o ombro largo onde a arca pousou e o cume arredondado e nevado
    const pico = { x: 700, y: 146, n: 11, fase: 0.4 };
    const perfil = [[226, nivel + 4], [250, 494], [290, 436], [334, 382], [362, 348], [390, 334], [470, 330], [556, 326], [594, 304], [622, 254], [648, 200], [672, 164], [700, 146], [728, 150], [758, 180], [800, 224], [846, 262], [W + 10, 286], [W + 10, nivel + 4]];
    const gr = contorno(perfil, 4);
    k.fillStyle = '#c2b28c';
    k.fill(gr);
    flancoEmRaios(k, r, gr, [pico, { x: 470, y: 330, n: 5, fase: 2 }], [220, 140, W + 10, nivel + 4], { maxL: 3.2, passo: 5, escurece: 0.3, base: 0.05 });
    // a neve do cume: desce mais pelos espigões e menos pelos vales
    const linhaNeve = (x) => { const a = Math.atan2(x - pico.x, 90); return 232 + Math.abs(x - pico.x) * 0.14 - Math.max(0, Math.cos(a * pico.n + pico.fase)) * 34 + Math.sin(x * 0.13) * 5; };
    const neve = new Path2D();
    neve.moveTo(560, linhaNeve(560));
    for (let x = 560; x <= W + 10; x += 5) neve.lineTo(x, linhaNeve(x));
    neve.lineTo(W + 10, 0);
    neve.lineTo(560, 0);
    neve.closePath();
    k.save();
    k.clip(gr);
    k.fillStyle = '#f8f6ee';
    k.fill(neve);
    flancoEmRaios(k, r, neve, [pico], [560, 140, W + 10, 340], { maxL: 1.3, passo: 5, base: -0.25, cruzada: 1 });
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.3;
    k.beginPath();
    for (let x = 560; x <= W + 10; x += 5) (x === 560 ? k.moveTo(x, linhaNeve(x)) : k.lineTo(x, linhaNeve(x)));
    k.stroke();
    k.restore();
    // as faixas molhadas dos níveis de antes, nos dois montes (a água foi baixando)
    for (const m of [pq, gr]) {
      k.save();
      k.clip(m);
      for (let i = 0; i < 4; i++) {
        const y = nivel - 14 - i * 24;
        const yy = (x) => y + Math.sin(x * 0.03 + i) * 2;
        k.fillStyle = 'rgba(70,58,38,' + (0.3 - i * 0.06).toFixed(2) + ')';
        k.beginPath();
        k.moveTo(-10, yy(-10));
        for (let x = -10; x <= W + 10; x += 8) k.lineTo(x, yy(x));
        k.lineTo(W + 10, y + 11);
        k.lineTo(-10, y + 11);
        k.closePath();
        k.fill();
        k.strokeStyle = 'rgba(250,246,232,.9)';
        k.lineWidth = 1.5;
        k.beginPath();
        for (let x = -10; x <= W + 10; x += 8) (x < 0 ? k.moveTo(x, yy(x)) : k.lineTo(x, yy(x)));
        k.stroke();
      }
      k.restore();
    }
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(gr);
    // a arca: o casco comprido e escuro, de piche, um pouco torta no ombro do monte
    k.save();
    k.translate(470, 334);
    k.rotate(-0.03);
    const L = 214;
    const casco = pol([[-L / 2, -2], [-L / 2 + 6, -44], [L / 2 - 6, -44], [L / 2, -2]]);
    const teto = pol([[-L / 2 + 10, -44], [-L / 2 + 22, -60], [L / 2 - 22, -60], [L / 2 - 10, -44]]);
    sombraNoChao(k, pol([[-L / 2, -4], [L / 2 + 14, -4], [L / 2 + 24, 8], [-L / 2 + 8, 8]]), 0, 0, 4, 0.5);
    peca(k, casco, [-L / 2, -44, L / 2, -2], { cor: '#1d150e', tinta: 'rgba(236,214,170,.45)', ang: 0, passo: 6, maxL: 0.9, sombra: () => 0.6, cruzada: 1, traco: 0, obj });
    peca(k, teto, [-L / 2, -60, L / 2, -44], { cor: '#2c2219', tinta: 'rgba(236,214,170,.5)', ang: 0, passo: 3.6, maxL: 0.8, sombra: () => 0.6, cruzada: 1, traco: 0, obj });
    k.strokeStyle = '#120d08';
    k.lineWidth = 2;
    k.stroke(casco);
    k.stroke(teto);
    k.strokeStyle = 'rgba(240,222,180,.5)';
    k.lineWidth = 1;
    for (const y of [-31, -17]) { k.beginPath(); k.moveTo(-L / 2 + 6, y); k.lineTo(L / 2 - 6, y); k.stroke(); }
    k.strokeStyle = 'rgba(255,246,220,.85)';
    k.lineWidth = 1.8;
    k.beginPath();
    k.moveTo(-L / 2 + 8, -41);
    k.lineTo(L / 2 - 8, -41);
    k.stroke();
    k.fillStyle = 'rgba(240,222,180,.7)';
    k.fillRect(-L / 2 + 24, -47, L - 48, 2.4);
    k.fillStyle = '#0b0704';
    k.fillRect(30, -36, 18, 30);
    k.restore();
    // o mar da enchente: ondas compridas, mais escuras e mais altas perto; debaixo dos montes,
    // o reflexo deles (a linha engrossa), e debaixo da neve, a linha some
    const alturaDoPerfil = (pts, x) => { for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) { const [ax, ay] = pts[i - 1]; const [bx, by] = pts[i]; return ay + (by - ay) * ((x - ax) / Math.max(1, bx - ax)); } return nivel; };
    const topo = (x) => Math.min(alturaDoPerfil(perfil, x), x < 404 ? alturaDoPerfil([[-10, 452], [52, 396], [112, 338], [150, 300], [172, 288], [194, 296], [230, 332], [280, 382], [334, 426], [404, nivel]], x) : nivel);
    const mar = new Path2D();
    mar.rect(-10, nivel, W + 20, H);
    k.fillStyle = '#c9bc9c';
    k.fill(mar);
    k.save();
    k.clip(mar);
    k.strokeStyle = SEPIA;
    k.lineCap = 'round';
    for (let y = nivel + 3; y < H + 20; y += 3.6 + (y - nivel) * 0.04) {
      const t = (y - nivel) / (H - nivel);
      const fase = r() * 6.283;
      const comp = 0.01 + (1 - t) * 0.02;
      const prof = (y - nivel) / 0.55;
      let ant = null;
      for (let x = -10; x <= W + 10; x += 6) {
        const yy = y + Math.sin(x * comp + fase) * (1 + t * 6);
        const alto = nivel - topo(x);
        const dentro = prof < alto;
        const naNeve = x > 600 && prof > nivel - linhaNeve(x) && dentro;
        const w = (0.5 + t * 1.6) * Math.max(0.12, 0.45 + Math.cos(x * comp + fase) * 0.35 + (dentro ? 0.4 : 0) - (naNeve ? 0.6 : 0));
        if (ant && r() > (dentro ? 0.08 : 0.03)) {
          k.lineWidth = w;
          k.beginPath();
          k.moveTo(ant[0], ant[1]);
          k.lineTo(x, yy);
          k.stroke();
        }
        ant = [x, yy];
      }
    }
    // o reflexo da arca, escuro e partido, e as cristas de espuma levadas pelo vento
    k.fillStyle = 'rgba(29,21,14,.55)';
    for (let i = 0; i < 9; i++) k.fillRect(372 + r() * 20, nivel + 98 + i * 4.5 + r() * 2, 190 - r() * 70, 2.2);
    k.strokeStyle = 'rgba(252,250,240,.9)';
    for (let i = 0; i < 44; i++) {
      const x = r() * W;
      const y = nivel + 20 + r() * (H - nivel - 30);
      const t = (y - nivel) / (H - nivel);
      k.lineWidth = 1 + t * 2.4;
      k.beginPath();
      k.moveTo(x, y);
      k.quadraticCurveTo(x + 10 + t * 20, y - 3 - t * 5, x + 22 + t * 50, y + 1);
      k.stroke();
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.beginPath();
    k.moveTo(-10, nivel);
    k.lineTo(W + 10, nivel);
    k.stroke();
    vinheta(k, W, H, 0.22);
  }

  // (3) Betel (Gn 28.18-19): "Logo que amanheceu, Jacó colocou a pedra que tinha usado como
  // travesseiro em pé, como uma coluna. Depois derramou óleo sobre ela." O alto pedregoso de
  // Betel ao nascer do sol (o sol ainda cortado pelos morros, os raios no céu), a pedra em pé,
  // calçada com pedras miúdas, com o óleo escorrendo do alto: o topo molhado e brilhante, a
  // face escurecida por onde ele desce, os fios de comprimentos diferentes e a poça ao pé. No
  // chão, a botija de barro tombada, com as últimas gotas.
  function desenhoBetel(k, W, H, obj) {
    const r = sorteio(6301);
    papelVelho(k, W, H, r, ['#fcf0da', '#f1dab5', '#d8b78c'], [690, 470]);
    const sol = [690, 480];
    const hz = 500;
    // o céu da madrugada: linhas, mais cheias no alto e à esquerda, que abrem em volta do sol
    linhas(k, 0, 0, W, hz, 5.5, 1.5, (x, y) => 0.1 + Math.min(1, Math.hypot(x - sol[0], (y - sol[1]) * 1.4) / 720) * 0.72);
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
    for (const [base, amp, cor, sombra, sem] of [[470, 30, '#e3c69c', 0.35, 1], [512, 22, '#cfae84', 0.55, 2]]) {
      const f = onda(sorteio(6310 + sem), 4, 0.006);
      const m = pol([[-10, 570], ...Array.from({ length: 48 }, (_, i) => [i * 19 - 4, base + f(i * 19) * amp]), [W + 10, 570]]);
      peca(k, m, [-10, base - amp, W + 10, 570], { cor, ang: 0, passo: 4.6, maxL: 1.2, sombra: (x) => sombra - Math.max(0, 1 - Math.abs(x - sol[0]) / 300) * 0.3, cruzada: 0.8, traco: 1.5 });
    }
    // o alto de Betel: o chão de calcário, perto
    const chao = new Path2D();
    chao.moveTo(-10, 560);
    for (let x = -10; x <= W + 10; x += 10) chao.lineTo(x, 550 + Math.sin(x * 0.012) * 8);
    chao.lineTo(W + 10, H + 10);
    chao.lineTo(-10, H + 10);
    chao.closePath();
    k.fillStyle = '#d9bd90';
    k.fill(chao);
    chaoEmLinhas(k, r, chao, -10, W + 10, 550, H, 1.9, (x, y) => 0.45 + (y - 550) / 700 + Math.sin(x * 0.02) * 0.1);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.8;
    k.stroke(chao);
    // as pedras do chão: blocos de calcário meio enterrados, gastos e arredondados
    const bloco = (x, y, rx, ry) => {
      const p = seixo(r, x, y, rx, ry, (r() - 0.5) * 0.2, 0.1);
      const enterra = new Path2D();
      enterra.rect(x - rx - 10, y - ry - 10, rx * 2 + 20, ry * 1.55 + 10);
      k.save();
      k.clip(enterra);
      sombraNoChao(k, p, 8, 6, 4, 0.3);
      peca(k, p, [x - rx, y - ry, x + rx, y + ry], { cor: '#e4cfa4', ang: 0.3, passo: 3.6, maxL: 1.8, sombra: (px, py) => sombraOval(x, y, rx, ry, 0)(px, py) * 0.85, cruzada: 0.7, traco: 1.8 });
      k.save();
      k.clip(p);
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) { const yy = y - ry * 0.4 + i * ry * 0.35; k.beginPath(); k.moveTo(x - rx, yy); k.quadraticCurveTo(x, yy + (r() - 0.5) * 6, x + rx, yy + (r() - 0.5) * 4); k.stroke(); }
      k.restore();
      k.restore();
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.6;
      k.beginPath();
      k.moveTo(x - rx - 6, y + ry * 0.55);
      k.quadraticCurveTo(x, y + ry * 0.62, x + rx + 6, y + ry * 0.55);
      k.stroke();
    };
    bloco(110, 630, 74, 30);
    bloco(720, 610, 60, 22);
    bloco(790, 770, 90, 40);
    bloco(40, 790, 80, 38);
    bloco(560, 600, 34, 14);
    // a pedra em pé: alta, de beirada torta e lascada, com a luz da manhã de lado (direita)
    const bx = 356;
    const by = 704;
    const pedra = contornoRocha(r, [[bx - 98, by + 4], [bx - 104, by - 90], [bx - 94, by - 190], [bx - 100, by - 250], [bx - 86, by - 330], [bx - 74, by - 410], [bx - 50, by - 456], [bx - 12, by - 486], [bx + 26, by - 478], [bx + 62, by - 448], [bx + 78, by - 392], [bx + 84, by - 300], [bx + 96, by - 260], [bx + 92, by - 160], [bx + 102, by - 60], [bx + 104, by + 4]], 4);
    pedra.closePath();
    sombraNoChao(k, pol([[bx - 100, by], [bx + 100, by], [bx - 20, by + 44], [bx - 320, by + 64], [bx - 280, by + 18]]), 0, 0, 6, 0.4);
    const luzP = (x, y) => 0.12 + Math.max(0, (bx + 50 - x) / 160) * 0.78 + (y - by + 480) / 2600;
    peca(k, pedra, [bx - 106, by - 490, bx + 106, by + 4], { cor: '#dac59c', ang: 1.5, passo: 4.4, maxL: 2.4, sombra: luzP, cruzada: 0.55, traco: 0, obj });
    // as facetas da pedra: planos lascados, cada um com a sua hachura e a beirada viva
    k.save();
    k.clip(pedra);
    const facetasP = [[[bx - 70, by - 440], [bx + 10, by - 470], [bx + 40, by - 400], [bx - 30, by - 370]], [[bx + 30, by - 300], [bx + 90, by - 280], [bx + 96, by - 180], [bx + 40, by - 200]], [[bx - 104, by - 260], [bx - 40, by - 240], [bx - 50, by - 130], [bx - 104, by - 150]], [[bx - 20, by - 120], [bx + 50, by - 100], [bx + 40, by - 20], [bx - 30, by - 30]]];
    for (const f of facetasP) {
      const p = pol(f);
      const cx = f.reduce((s, q) => s + q[0], 0) / 4;
      const cy = f.reduce((s, q) => s + q[1], 0) / 4;
      gravar(k, p, cx, cy, 90, 0.9 + (r() - 0.5) * 0.6, 5, 1.4, (x, y) => luzP(x, y) - 0.1, SEPIA, 0);
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.6;
      k.beginPath();
      k.moveTo(f[0][0], f[0][1]);
      k.lineTo(f[1][0], f[1][1]);
      k.lineTo(f[2][0], f[2][1]);
      k.stroke();
      k.strokeStyle = 'rgba(255,246,222,.85)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(f[0][0] + 2, f[0][1] + 2);
      k.lineTo(f[3][0] + 2, f[3][1] - 2);
      k.stroke();
    }
    for (let i = 0; i < 150; i++) { k.fillStyle = 'rgba(43,33,18,.45)'; k.beginPath(); k.arc(bx - 96 + r() * 192, by - 470 + r() * 470, 0.7 + r() * 1.3, 0, 6.283); k.fill(); }
    // o óleo: a face escurecida por onde ele desce (de beirada em gotas), os fios e o brilho
    const molhado = new Path2D();
    molhado.moveTo(bx - 60, by - 470);
    molhado.bezierCurveTo(bx - 70, by - 420, bx - 58, by - 380, bx - 44, by - 360);
    molhado.quadraticCurveTo(bx - 34, by - 330, bx - 26, by - 352);
    molhado.quadraticCurveTo(bx - 10, by - 310, bx + 6, by - 250);
    molhado.quadraticCurveTo(bx + 16, by - 240, bx + 20, by - 300);
    molhado.quadraticCurveTo(bx + 40, by - 360, bx + 54, by - 344);
    molhado.quadraticCurveTo(bx + 70, by - 380, bx + 70, by - 440);
    molhado.lineTo(bx + 40, by - 486);
    molhado.closePath();
    k.fillStyle = 'rgba(160,104,26,.5)';
    k.fill(molhado);
    k.save();
    k.clip(molhado);
    k.strokeStyle = 'rgba(255,240,180,.8)';
    k.lineCap = 'round';
    for (let i = 0; i < 7; i++) { const x = bx - 50 + i * 17 + r() * 6; k.lineWidth = 1.6; k.beginPath(); k.moveTo(x, by - 470); k.quadraticCurveTo(x + 4, by - 420, x - 2, by - 380 + r() * 40); k.stroke(); }
    k.restore();
    const fios = [[bx - 36, by - 352, by - 140, 10], [bx + 8, by - 252, by - 6, 13], [bx + 50, by - 346, by - 236, 8]];
    for (const [x0, y0, y1, larg] of fios) {
      const pts = [];
      for (let t = 0; t <= 1.0001; t += 0.05) pts.push([x0 + Math.sin(t * 7 + x0 * 0.1) * 5 + t * 6, y0 + t * (y1 - y0), larg * (1 - t * 0.45)]);
      for (const [mais, c, dx] of [[4, 'rgba(70,40,6,.9)', 0], [0, 'rgba(198,140,38,.97)', 0], [-1, 'rgba(255,240,170,.95)', -1]]) {
        k.strokeStyle = c;
        k.lineCap = 'round';
        for (let i = 1; i < pts.length; i++) {
          const w = mais < 0 ? pts[i][2] * 0.3 : pts[i][2] + mais;
          k.lineWidth = w;
          k.beginPath();
          k.moveTo(pts[i - 1][0] + dx * pts[i][2] * 0.22, pts[i - 1][1]);
          k.lineTo(pts[i][0] + dx * pts[i][2] * 0.22, pts[i][1]);
          k.stroke();
        }
      }
      const [ex, ey, ew] = pts[pts.length - 1];
      k.fillStyle = 'rgba(198,140,38,.97)';
      k.beginPath();
      k.ellipse(ex, ey + ew * 0.5, ew * 0.75, ew * 0.95, 0, 0, 6.283);
      k.fill();
      k.strokeStyle = 'rgba(70,40,6,.9)';
      k.lineWidth = 1.6;
      k.stroke();
      k.fillStyle = 'rgba(255,246,200,.95)';
      k.beginPath();
      k.arc(ex - ew * 0.25, ey + ew * 0.25, ew * 0.22, 0, 6.283);
      k.fill();
    }
    k.restore();
    // o alto da pedra, molhado e brilhante: a película de óleo que cobre o topo
    const alto = new Path2D();
    alto.moveTo(bx - 70, by - 440);
    alto.quadraticCurveTo(bx - 30, by - 500, bx + 30, by - 490);
    alto.quadraticCurveTo(bx + 76, by - 470, bx + 78, by - 430);
    alto.quadraticCurveTo(bx, by - 452, bx - 70, by - 440);
    k.save();
    k.clip(pedra);
    k.fillStyle = 'rgba(190,128,30,.92)';
    k.fill(alto);
    k.strokeStyle = 'rgba(70,40,6,.85)';
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(bx - 70, by - 440);
    k.quadraticCurveTo(bx, by - 452, bx + 78, by - 430);
    k.stroke();
    k.strokeStyle = 'rgba(255,246,206,.95)';
    k.lineWidth = 3;
    k.beginPath();
    k.moveTo(bx - 40, by - 470);
    k.quadraticCurveTo(bx - 10, by - 486, bx + 26, by - 478);
    k.stroke();
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.6;
    k.stroke(pedra);
    marcar(k, obj, alto);
    // a poça de óleo ao pé da pedra
    const poca = new Path2D();
    poca.ellipse(bx + 14, by + 8, 46, 8, 0, 0, 6.283);
    k.fillStyle = 'rgba(160,104,24,.85)';
    k.fill(poca);
    k.strokeStyle = 'rgba(70,40,6,.8)';
    k.lineWidth = 1.2;
    k.stroke(poca);
    k.strokeStyle = 'rgba(255,240,180,.9)';
    k.lineWidth = 1.4;
    k.beginPath();
    k.ellipse(bx + 4, by + 6, 22, 3, 0, 3.4, 5.8);
    k.stroke();
    // as pedras de calço, encostadas no pé
    for (const [x, y, rx, ry] of [[bx - 116, by - 2, 30, 22], [bx - 72, by + 14, 26, 15], [bx + 104, by, 34, 24], [bx + 146, by + 14, 22, 14], [bx + 58, by + 22, 22, 12]]) {
      const p = seixo(r, x, y, rx, ry, (r() - 0.5) * 0.4, 0.14);
      sombraNoChao(k, p, 5, 5, 3, 0.35);
      peca(k, p, [x - rx, y - ry, x + rx, y + ry], { cor: '#cdb688', ang: 0.6, passo: 3.2, maxL: 1.6, sombra: sombraOval(x, y, rx, ry, 0), cruzada: 0.7, traco: 1.8, obj });
    }
    // a botija de óleo tombada, de barro, com a alça e as últimas gotas
    k.save();
    k.translate(600, 700);
    k.rotate(-1.3);
    const bot = vaso(k, 0, 44, 100, 56, (t) => (t < 0.16 ? 0.32 : t < 0.28 ? 0.32 + (t - 0.16) * 2.5 : 0.62 + Math.sin(((t - 0.28) / 0.72) * Math.PI) * 0.38 - (t - 0.28) * 0.25));
    sombraNoChao(k, bot, 10, -6, 5, 0.35);
    peca(k, bot, [-32, -56, 32, 48], { cor: '#bf7d45', tinta: '#3a1e08', ang: 0.2, passo: 3.4, maxL: 1.8, sombra: sombraOval(0, 10, 28, 36, 0), cruzada: 0.6, traco: 2, obj, abaulado: 0.25 });
    k.strokeStyle = '#3a1e08';
    k.lineWidth = 6;
    k.beginPath();
    k.moveTo(9, -36);
    k.bezierCurveTo(32, -38, 36, -14, 18, -6);
    k.stroke();
    k.strokeStyle = '#bf7d45';
    k.lineWidth = 2.6;
    k.stroke();
    k.fillStyle = '#2a1404';
    k.beginPath();
    k.ellipse(0, -56, 10, 3.6, 0, 0, 6.283);
    k.fill();
    k.restore();
    for (const [x, y, s] of [[530, 708, 6], [512, 714, 4.4], [498, 709, 3]]) {
      k.fillStyle = 'rgba(176,118,28,.95)';
      k.beginPath();
      k.ellipse(x, y, s * 1.5, s * 0.7, 0, 0, 6.283);
      k.fill();
    }
    capim(k, r, 222, 724, 22, 7);
    capim(k, r, 520, 640, 18, 6);
    capim(k, r, 470, 790, 24, 8);
    vinheta(k, W, H, 0.22);
  }

  // (4) O monte Sinai (Êx 19.18): "Saía fumaça do monte Sinai, porque o Senhor tinha descido
  // sobre ele no meio de labaredas de fogo. Subia fumaça como de uma fornalha. E todo o monte
  // tremia violentamente." O monte de granito, alto e de muitos picos; no cume, envolto em
  // fumaça, as labaredas; a fumaça grossa que sobe em rolos, como de fornalha, e enche o céu
  // (a nuvem do 19.16), com os relâmpagos; o tremor na crista em traço dobrado, nas pedras que
  // rolam e no pó que sobe ao pé do monte.
  function desenhoSinai(k, W, H, obj) {
    const r = sorteio(6401);
    papelVelho(k, W, H, r, ['#ecdcbc', '#d2b88e', '#9c8160'], [W / 2, 300]);
    const cume = [420, 184];
    // o céu é a fumaça: linhas cheias e cruzadas, quase pretas no alto
    const ceu = new Path2D();
    ceu.rect(-10, -10, W + 20, 600);
    k.fillStyle = '#6e5f4e';
    k.fill(ceu);
    gravar(k, ceu, W / 2, 290, 660, 0, 5, 2.4, (x, y) => 0.8 - y / 1500, '#1a120a', 0);
    gravar(k, ceu, W / 2, 290, 660, 0.8, 6, 1.6, (x, y) => 0.62 - y / 900, '#1a120a', 0);
    // um rolo de fumaça: contorno em tufos, a barriga acesa pelo fogo de baixo
    const rolo = (q) => {
      const forma = lanoso(r, Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.283; const f = 0.88 + r() * 0.24; return [q.x + Math.cos(a) * q.rr * f, q.y + Math.sin(a) * q.rr * 0.72 * f]; }), q.rr * 0.15, q.rr * 0.48);
      const perto = Math.max(0, 1 - Math.hypot(q.x - cume[0], q.y - cume[1]) / 380);
      k.fillStyle = q.claro ? '#9a8870' : '#83725f';
      k.fill(forma);
      const so = (px, py) => 0.82 - Math.max(0, (py - q.y) / q.rr) * (0.3 + perto * 0.7) - Math.max(0, -(px - q.x) / q.rr) * 0.15;
      gravar(k, forma, q.x, q.y, q.rr * 1.05, 0.35, 4, 2.2, so, '#1a120a', 0.4);
      gravar(k, forma, q.x, q.y, q.rr * 1.05, -0.8, 5.2, 1.5, (px, py) => so(px, py) - 0.35, '#1a120a', 0.3);
      k.save();
      k.clip(forma);
      k.strokeStyle = 'rgba(238,150,62,' + (0.2 + perto * 0.65).toFixed(2) + ')';
      k.lineWidth = 2 + perto * 4;
      k.beginPath();
      k.ellipse(q.x, q.y + q.rr * 0.12, q.rr * 0.95, q.rr * 0.62, 0, 0.25, Math.PI - 0.25);
      k.stroke();
      k.restore();
      k.strokeStyle = 'rgba(20,14,8,.8)';
      k.lineWidth = 1.6;
      k.stroke(forma);
    };
    // a coluna: estreita no cume, abrindo para o alto e para os lados
    const atras = [];
    for (const [y, x0, x1, rr, n] of [[46, -60, 950, 128, 7], [126, 40, 830, 110, 6], [186, 170, 700, 86, 5], [236, 290, 580, 66, 4]]) {
      for (let i = 0; i < n; i++) atras.push({ x: x0 + ((x1 - x0) * (i + 0.5)) / n + (r() - 0.5) * 50, y: y + (r() - 0.5) * 30, rr: rr * (0.8 + r() * 0.4) });
    }
    for (const q of atras) rolo(q);
    // os relâmpagos (19.16): riscos brancos e quebrados, com a beirada fina de tinta
    for (const [x, y, segs, dir] of [[150, 30, 7, 1], [740, 40, 6, -1], [610, 120, 4, 1]]) {
      const pts = [[x, y]];
      for (let i = 0; i < segs; i++) { const [px, py] = pts[pts.length - 1]; pts.push([px + dir * (10 + r() * 24) * (i % 2 ? -0.5 : 1), py + 22 + r() * 16]); }
      for (const [w, c] of [[7, 'rgba(26,18,10,.9)'], [3.4, '#fff8e2']]) {
        k.strokeStyle = c;
        k.lineWidth = w;
        k.lineJoin = 'miter';
        k.beginPath();
        pts.forEach(([px, py], i) => (i ? k.lineTo(px, py) : k.moveTo(px, py)));
        const [fx, fy] = pts[Math.floor(segs / 2)];
        k.moveTo(fx, fy);
        k.lineTo(fx - dir * 22, fy + 28);
        k.lineTo(fx - dir * 16, fy + 48);
        k.stroke();
      }
    }
    // o monte: alto, de granito, com muitos picos; os espigões descem de cada um
    const perfil = [[-10, 548], [50, 500], [96, 446], [128, 462], [170, 392], [214, 346], [244, 362], [282, 296], [318, 262], [350, 274], [384, 220], cume, [452, 196], [482, 230], [516, 206], [548, 238], [584, 268], [620, 252], [660, 318], [700, 352], [740, 336], [780, 404], [830, 448], [W + 10, 490]];
    const monte = contornoRocha(r, [...perfil, [W + 10, 700], [-10, 700]], 5);
    monte.closePath();
    k.fillStyle = '#b48a6a';
    k.fill(monte);
    const picos = [{ x: cume[0], y: cume[1], n: 8, fase: 0.3 }, { x: 214, y: 346, n: 6, fase: 1.2 }, { x: 96, y: 446, n: 5, fase: 2 }, { x: 318, y: 262, n: 6, fase: 0.4 }, { x: 516, y: 206, n: 6, fase: 2.6 }, { x: 620, y: 252, n: 6, fase: 1.7 }, { x: 740, y: 336, n: 6, fase: 0.8 }];
    flancoEmRaios(k, r, monte, picos, [-10, 160, W + 10, 700], { maxL: 3.2, cor: '#2a1a10', passo: 5, base: 0.12, escurece: 0.18 });
    // o reflexo do fogo nas pedras do alto: um tom chapado e quente, em dois degraus
    k.save();
    k.clip(monte);
    for (const [rx, ry, a] of [[250, 130, 0.16]]) {
      k.fillStyle = 'rgba(232,140,56,' + a + ')';
      k.beginPath();
      k.ellipse(cume[0] + 10, cume[1] + 40, rx, ry, 0, 0, 6.283);
      k.fill();
    }
    k.restore();
    // o tremor: a crista em traço dobrado, cada vez mais fraco
    for (const [d, a] of [[0, 1], [5, 0.5], [10, 0.25]]) {
      k.strokeStyle = 'rgba(26,18,10,' + a + ')';
      k.lineWidth = d ? 1.5 : 2.6;
      k.beginPath();
      perfil.forEach(([x, y], i) => (i ? k.lineTo(x + d * 0.6, y - d) : k.moveTo(x + d * 0.6, y - d)));
      k.stroke();
    }
    // no alto, o fogo: labaredas de muitas alturas que saem das pedras da crista e sobem para
    // dentro da nuvem; por cima, a nuvem de fumaça que envolve o cume, acesa por dentro
    const crista = (x) => { for (let i = 1; i < perfil.length; i++) if (perfil[i][0] >= x) { const [ax, ay] = perfil[i - 1]; const [bx, by] = perfil[i]; return ay + (by - ay) * ((x - ax) / Math.max(1, bx - ax)); } return 500; };
    const linguas = [];
    for (let i = 0; i < 40; i++) {
      const x = 240 + (i / 39) * 420 + (r() - 0.5) * 16;
      const meio = 1 - Math.abs(x - cume[0]) / 230;
      const h = (50 + Math.max(0, meio) * 170) * (0.5 + r() * 0.75);
      const y = crista(x) + 18 + r() * 14;
      linguas.push({ x, y, h: Math.min(h, y - 120), vai: (r() - 0.5) * 40 + (x - cume[0]) * 0.08, larg: 22 + r() * 22 });
    }
    linguas.sort((a, b) => b.h - a.h);
    for (const q of linguas) {
      const p = chama(q.x, q.y, q.larg, q.h, q.vai);
      const dentro = chama(q.x + q.vai * 0.05, q.y - q.h * 0.05, q.larg * 0.42, q.h * 0.6, q.vai * 0.6);
      k.fillStyle = 'rgba(224,116,38,.94)';
      k.fill(p);
      gravar(k, p, q.x, q.y - q.h / 2, q.h * 0.7, -Math.PI / 2 + Math.atan2(q.vai, q.h), 3.4, 1.5, (px, py) => 0.35 + Math.abs(px - q.x - (q.y - py) / q.h * q.vai) / q.larg, '#6b2208', 0.2);
      k.fillStyle = 'rgba(255,212,116,.96)';
      k.fill(dentro);
      k.strokeStyle = '#4a1804';
      k.lineWidth = 1.6;
      k.stroke(p);
      marcar(k, obj, p);
    }
    const capa = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI;
      capa.push({ x: cume[0] + Math.cos(a) * 190 + (r() - 0.5) * 30, y: cume[1] - 30 - Math.sin(a) * 50 + (r() - 0.5) * 16, rr: 62 + r() * 20, claro: true });
    }
    capa.push({ x: cume[0] - 40, y: cume[1] - 10, rr: 84, claro: true }, { x: cume[0] + 60, y: cume[1] - 4, rr: 78, claro: true });
    for (const q of capa) rolo(q);
    // as pedras que rolam, com os riscos do movimento
    for (const [x, y, s] of [[206, 430, 17], [170, 500, 11], [650, 400, 15], [716, 470, 11], [300, 470, 9]]) {
      const p = seixo(r, x, y, s, s * 0.8, r(), 0.18);
      peca(k, p, [x - s, y - s, x + s, y + s], { cor: '#9b7458', sombra: sombraOval(x, y, s, s * 0.8, 0), passo: 2.4, maxL: 1.2, traco: 1.6 });
      k.strokeStyle = 'rgba(26,18,10,.75)';
      k.lineWidth = 1.3;
      const dir = x < cume[0] ? 1 : -1;
      for (let i = -1; i <= 1; i++) { k.beginPath(); k.moveTo(x + dir * s * 0.7 + i * 5, y - s * 1.2); k.lineTo(x + dir * s * 1.9 + i * 5, y - s * 2.8); k.stroke(); }
    }
    // o pé do monte e a planície de areia, perto
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
    // o pó que o tremor levanta: uma faixa baixa e comprida, de beirada em tufos desiguais
    const po = lanoso(r, [[-30, 660], ...Array.from({ length: 14 }, (_, i) => [i * 70, 618 - Math.abs(Math.sin(i * 1.7)) * 26 - r() * 10]), [W + 30, 640], [W + 30, 668], [-30, 672]], 7, 22);
    k.fillStyle = 'rgba(232,216,180,.92)';
    k.fill(po);
    gravar(k, po, W / 2, 640, 480, 0, 3.6, 1.1, (px, py) => (py - 600) / 60, SEPIA, 0);
    k.strokeStyle = 'rgba(43,33,18,.6)';
    k.lineWidth = 1.3;
    k.stroke(po);
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
      k.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) { const qx = x + r() * n * 30; k.beginPath(); k.moveTo(qx, y); k.lineTo(qx + (r() - 0.5) * 30, y + 14 + r() * 14); k.stroke(); }
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
    // a margem de lá, alagada: a água da cheia entre os tamariscos
    const la = pol([[-10, 300], [W + 10, 290], [W + 10, 440], [-10, 452]]);
    k.fillStyle = '#e4e2cc';
    k.fill(la);
    agua(k, r, -10, 296, W + 10, 448, 'rgba(43,33,18,.5)');
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.beginPath();
    k.moveTo(-10, 300);
    k.lineTo(W + 10, 290);
    k.stroke();
    for (let i = 0; i < 18; i++) {
      const x = 260 + r() * 640;
      const y = 316 + r() * 100;
      const e = 0.5 + (y - 300) / 220;
      const rx = (20 + r() * 14) * e;
      // o reflexo do tufo na água, partido
      k.fillStyle = 'rgba(43,33,18,.35)';
      for (let j = 0; j < 4; j++) k.fillRect(x - rx * 0.7 + r() * 6, y + 4 + j * 4, rx * 1.3 - j * 5, 1.6);
      copaGravada(k, r, x, y - rx * 0.55, rx, rx * 0.65, { cor: '#9c9663' });
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.2;
      for (let j = -1; j <= 1; j++) { k.beginPath(); k.moveTo(x + j * rx * 0.25, y); k.lineTo(x + j * rx * 0.15, y - rx * 0.4); k.stroke(); }
    }
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
    // a muralha de água: a água de cima parada e amontoada, mais alta que as margens. O alto
    // sobe da esquerda para a crista, onde a água chega e para; a face, junto do leito seco, é
    // íngreme e debruça um pouco, escura e lisa, com os brilhos; a crista tem a espuma.
    const crX = 300;
    const crY = 214;
    const altoM = (x) => crY + Math.pow(Math.max(0, (crX - x) / 310), 1.4) * 110 + Math.sin(x * 0.05) * 3;
    const face = (y) => crX + 20 - Math.sin(((y - crY) / 480) * Math.PI * 0.5) * 46;
    const muralha = new Path2D();
    muralha.moveTo(-10, altoM(-10));
    for (let x = -10; x <= crX; x += 8) muralha.lineTo(x, altoM(x));
    muralha.quadraticCurveTo(crX + 16, crY - 4, face(crY + 6), crY + 6);
    for (let y = crY + 6; y <= 694; y += 8) muralha.lineTo(face(y), y);
    muralha.lineTo(-10, 694);
    muralha.closePath();
    k.fillStyle = '#c3cbbd';
    k.fill(muralha);
    marcar(k, obj, muralha);
    k.save();
    k.clip(muralha);
    k.lineCap = 'round';
    // o corpo: ondinhas curtas que vão ficando mais juntas e mais escuras embaixo
    k.strokeStyle = '#26312c';
    for (let y = crY; y < 700; y += 4 + (y - crY) * 0.004) {
      const t = (y - crY) / 480;
      let x = -10 - r() * 30;
      while (x < face(y)) {
        const c = 10 + r() * 22;
        if (y > altoM(x) + 4) {
          k.lineWidth = 0.6 + t * 1.5;
          k.beginPath();
          k.moveTo(x, y);
          k.quadraticCurveTo(x + c / 2, y - 2.5 - t * 2, x + c, y);
          k.stroke();
        }
        x += c + 3 + r() * (10 - t * 6);
      }
    }
    // a face íngreme: as linhas acompanham a curva, mais escuras perto do leito
    for (let d = 2; d < 64; d += 5) {
      k.lineWidth = 0.6 + (1 - d / 64) * 1.6;
      k.beginPath();
      for (let y = crY + 10; y <= 694; y += 8) { const x = face(y) - d - Math.sin(y * 0.03 + d) * 1.5; if (y === crY + 10) k.moveTo(x, y); else k.lineTo(x, y); }
      k.stroke();
    }
    k.strokeStyle = 'rgba(250,250,240,.9)';
    for (let i = 0; i < 7; i++) {
      const y0 = crY + 50 + i * 60 + r() * 20;
      k.lineWidth = 2.2;
      k.beginPath();
      k.moveTo(face(y0) - 22, y0);
      k.lineTo(face(y0 + 34) - 22, y0 + 34);
      k.stroke();
    }
    k.restore();
    k.strokeStyle = SEPIA;
    k.lineWidth = 2.4;
    k.beginPath();
    for (let y = crY + 6; y <= 690; y += 8) (y === crY + 6 ? k.moveTo(face(y), y) : k.lineTo(face(y), y));
    k.stroke();
    // a espuma: a beirada de cima em rolinhos, que engrossa na crista e debruça sobre a face
    const pts = [];
    for (let x = -10; x <= crX; x += 16) pts.push([x, altoM(x) - 4 - (x / crX) * 8]);
    pts.push([crX + 24, crY - 20], [face(crY + 10) + 24, crY + 4], [face(crY + 24) + 14, crY + 30], [face(crY + 30) - 10, crY + 26]);
    for (let x = crX - 10; x >= -10; x -= 16) pts.push([x, altoM(x) + 8 + (x / crX) * 10]);
    const espuma = lanoso(r, pts, 6, 14);
    k.fillStyle = '#f7f6ee';
    k.fill(espuma);
    gravar(k, espuma, 160, crY + 40, 260, 0, 3, 1.1, (px, py) => (py - altoM(px) + 6) / 26, '#26312c', 0);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(espuma);
    marcar(k, obj, espuma);
    // gotas e borrifos soltos da crista
    k.fillStyle = '#26312c';
    for (let i = 0; i < 18; i++) { const x = face(crY) + 18 + r() * 40; const y = crY - 6 + r() * 70; k.beginPath(); k.arc(x, y, 1.2 + r() * 1.8, 0, 6.283); k.fill(); }
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
    // as pegadas molhadas dos sacerdotes: saem da margem de cá e entram no leito, até o meio
    const passos = [[612, 800, 1], [586, 744, 0.9], [560, 694, 0.8], [540, 650, 0.68], [522, 612, 0.58], [508, 580, 0.5], [496, 554, 0.44]];
    for (const [x, y, e] of passos) {
      for (const lado of [-1, 1]) {
        const p = new Path2D();
        p.ellipse(x + lado * 12 * e, y + (lado > 0 ? -10 * e : 0), 6 * e, 13 * e * 0.55, -0.35, 0, 6.283);
        k.fillStyle = 'rgba(70,52,26,.75)';
        k.fill(p);
        k.strokeStyle = 'rgba(255,248,226,.6)';
        k.lineWidth = 1;
        k.stroke(p);
      }
    }
    // no meio do leito, onde os sacerdotes ficaram parados (3.17), as pegadas se juntam
    for (let i = 0; i < 10; i++) {
      const x = 450 + (i % 5) * 18 + r() * 6;
      const y = 520 + Math.floor(i / 5) * 18 + r() * 4;
      const p = new Path2D();
      p.ellipse(x, y, 3.4, 4, -0.3, 0, 6.283);
      k.fillStyle = 'rgba(70,52,26,.7)';
      k.fill(p);
    }
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
    linhas(k, 0, 0, W, 330, 5.5, 1.5, (x, y) => 0.12 + (1 - y / 330) * 0.5 + x / 3000);
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
      casinha(k, r, c.x, c.base, c.w, c.h, c.d, { cor: r() < 0.5 ? '#f5e3b8' : '#ecd5a4', lado: '#c09c66', teto: '#e6cc98', traco: 1.2, janela: r() < 0.7, porta: r() < 0.4, obj });
      // às vezes, o quarto de cima no terraço
      if (r() < 0.22) casinha(k, r, c.x + c.w * 0.5, c.base - c.h - c.d * 0.2, c.w * 0.4, 14, c.d * 0.6, { cor: '#f5e3b8', lado: '#c09c66', teto: '#e6cc98', traco: 1, porta: true, janela: false, obj });
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
    k.fillStyle = '#b08c58';
    k.fill(ca);
    chaoEmLinhas(k, r, ca, -10, W + 10, 690, H, 2.4, (x, y) => 0.6 + (y - 700) / 400);
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
    const cx = 590;
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
    for (const [x0, x1] of [[326, 476], [690, 830]]) for (let i = 0; i < 9; i++) k.fillRect(x0 + r() * 20, hz + 14 + i * 7, x1 - x0 - r() * 50, 2.2);
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
    // a copa: a massa escura no alto, à esquerda
    const copa = lanoso(r, [[-30, 20], [120, -10], [300, 30], [400, 120], [380, 250], [300, 360], [160, 420], [20, 430], [-30, 300]], 10, 34);
    k.fillStyle = '#9a9668';
    k.fill(copa);
    gravar(k, copa, 180, 200, 300, 1.45, 3.6, 2, (x, y) => 0.35 + (y - 20) / 700 + Math.max(0, (x - 260) / 400), SEPIA, 0.1);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.6;
    k.stroke(copa);
    marcar(k, obj, copa);
    // o galho que avança sobre a água, grosso no pé e fino na ponta
    const galho = bezier([tx + 10, 330], [360, 200], [600, 190], [860, 210], 40);
    const larG = (t) => 13 * (1 - t) + 3;
    const cimaG = [];
    const baixoG = [];
    galho.forEach(([x, y], i) => { const t = i / (galho.length - 1); const q = galho[Math.min(galho.length - 1, i + 1)]; const p = galho[Math.max(0, i - 1)]; const dx = q[0] - p[0]; const dy = q[1] - p[1]; const l = Math.hypot(dx, dy) || 1; cimaG.push([x + (dy / l) * larG(t), y - (dx / l) * larG(t)]); baixoG.push([x - (dy / l) * larG(t), y + (dx / l) * larG(t)]); });
    const galhoP = pol([...cimaG, ...baixoG.reverse()]);
    peca(k, galhoP, [150, 180, 870, 350], { cor: '#8a7652', ang: -0.1, passo: 2.8, maxL: 1.4, sombra: (x, y) => 0.3 + Math.max(0, (y - 200) / 120), cruzada: 0.75, traco: 2, obj });
    k.save();
    k.clip(galhoP);
    k.strokeStyle = SEPIA;
    k.lineWidth = 1.2;
    for (let i = 2; i < galho.length - 2; i += 2) { const [x, y] = galho[i]; k.beginPath(); k.moveTo(x - 4, y - 6); k.quadraticCurveTo(x + 4, y, x - 2, y + 6); k.stroke(); }
    k.restore();
    // as varas caídas, cheias de folhinhas, que pendem da copa e do galho
    const vara = (x, y, l, d, forte) => {
      const fim = [x + d, y + l];
      k.strokeStyle = 'rgba(43,33,18,.85)';
      k.lineWidth = forte ? 1.3 : 1;
      k.beginPath();
      k.moveTo(x, y);
      k.quadraticCurveTo(x + d * 0.2, y + l * 0.5, fim[0], fim[1]);
      k.stroke();
      for (let s = 0.06; s < 1; s += 0.055) {
        const px = (1 - s) * (1 - s) * x + 2 * (1 - s) * s * (x + d * 0.2) + s * s * fim[0];
        const py = y + l * s;
        const lado = Math.round(s * 100) % 2 ? -1 : 1;
        k.fillStyle = '#7f7b52';
        k.beginPath();
        k.ellipse(px + lado * 3.4, py + 3, 1.6, 5.4, lado * 0.45, 0, 6.283);
        k.fill();
        k.strokeStyle = 'rgba(43,33,18,.8)';
        k.lineWidth = 0.7;
        k.stroke();
      }
    };
    for (let i = 0; i < 70; i++) {
      const x = -20 + r() * 420;
      const topo = 120 + r() * 200;
      vara(x, topo, 120 + r() * 260 + (x > 200 ? 60 : 0), (r() - 0.5) * 24, true);
    }
    for (let i = 4; i < galho.length - 2; i += 1) {
      if (r() < 0.35) continue;
      const [x, y] = galho[i];
      const ok = Math.abs(x - 405) > 90 && Math.abs(x - 760) > 90;
      vara(x, y + 4, ok ? 80 + r() * 200 : 30 + r() * 30, (r() - 0.5) * 20, false);
    }
    // os cordões
    const cordao2 = (x0, y0, x1, y1) => {
      const p = new Path2D();
      p.moveTo(x0, y0);
      p.quadraticCurveTo((x0 + x1) / 2 + 3, (y0 + y1) / 2, x1, y1);
      k.strokeStyle = '#3a2410';
      k.lineWidth = 3;
      k.stroke(p);
      k.strokeStyle = '#c9a86a';
      k.lineWidth = 1.2;
      k.stroke(p);
      marcar(k, obj, p, 4);
    };
    // a lira: a caixa embaixo, os dois braços que se abrem e a travessa, com as cordas
    const lx = 326;
    const ly = 290;
    cordao2(405, 238, lx + 4, ly + 4);
    cordao2(405, 238, lx + 160, ly - 2);
    k.save();
    k.translate(lx, ly);
    const bracoE = new Path2D();
    bracoE.moveTo(-6, 4);
    bracoE.bezierCurveTo(4, 50, 22, 100, 20, 150);
    bracoE.lineTo(36, 150);
    bracoE.bezierCurveTo(38, 100, 18, 50, 10, 4);
    bracoE.closePath();
    const bracoD = new Path2D();
    bracoD.moveTo(166, -2);
    bracoD.bezierCurveTo(150, 50, 132, 100, 132, 150);
    bracoD.lineTo(116, 150);
    bracoD.bezierCurveTo(116, 100, 138, 50, 150, -2);
    bracoD.closePath();
    for (const b of [bracoE, bracoD]) peca(k, b, [-6, -2, 166, 150], { cor: '#9a6a36', tinta: '#2a1606', ang: 1.3, passo: 2.6, maxL: 1.3, sombra: (x) => 0.3 + x / 260, cruzada: 1, traco: 1.8, obj });
    const caixaL = pol([[6, 150], [146, 150], [140, 206], [12, 206]]);
    peca(k, caixaL, [6, 150, 146, 206], { cor: '#b07c44', tinta: '#2a1606', ang: 0.15, passo: 2.8, maxL: 1.4, sombra: (x, y) => 0.25 + x / 300 + (y - 150) / 160, cruzada: 0.7, traco: 2, obj });
    k.strokeStyle = 'rgba(42,22,6,.7)';
    k.lineWidth = 1.2;
    k.strokeRect(20, 160, 112, 36);
    const trav = pol([[-14, 0], [176, -10], [178, 6], [-12, 16]]);
    peca(k, trav, [-14, -10, 178, 16], { cor: '#7d5428', tinta: '#2a1606', ang: 0, passo: 2.4, maxL: 1.1, sombra: () => 0.5, traco: 1.8, obj });
    for (let i = 0; i < 7; i++) {
      const x = 44 + i * 11;
      const ytop = 8 - x * 0.055;
      k.strokeStyle = 'rgba(42,22,6,.9)';
      k.lineWidth = 2.6;
      k.beginPath();
      k.arc(x, ytop + 2, 2.4, 0, 6.283);
      k.stroke();
      k.strokeStyle = 'rgba(252,240,206,.95)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(x, ytop + 4);
      k.lineTo(x + (i - 3) * 1.2, 176);
      k.stroke();
    }
    k.fillStyle = '#2a1606';
    k.fillRect(36, 172, 80, 6);
    k.restore();
    // a harpa: a coluna, o braço curvo em cima, a caixa em diagonal e as cordas entre eles
    const hx = 690;
    const hy = 246;
    cordao2(760, 212, hx + 6, hy + 4);
    k.save();
    k.translate(hx, hy);
    k.rotate(0.04);
    const pescoco = (x) => 6 + x * 0.24 - Math.sin((x / 140) * Math.PI) * 20;
    const caixaY = (x) => 40 + (130 - x) * 1.557;
    const caixaH = new Path2D();
    caixaH.moveTo(150, 30);
    caixaH.lineTo(130, 40);
    caixaH.lineTo(8, 230);
    caixaH.lineTo(30, 244);
    caixaH.quadraticCurveTo(110, 150, 160, 50);
    caixaH.closePath();
    peca(k, caixaH, [8, 30, 160, 244], { cor: '#b07c44', tinta: '#2a1606', ang: 0.95, passo: 2.8, maxL: 1.4, sombra: (x, y) => 0.25 + (y - 30) / 400 + x / 600, cruzada: 0.7, traco: 2, obj });
    const coluna = pol([[-8, 0], [6, -2], [12, 236], [-2, 240]]);
    peca(k, coluna, [-8, -2, 12, 240], { cor: '#7d5428', tinta: '#2a1606', ang: 1.55, passo: 2.4, maxL: 1.2, sombra: () => 0.55, traco: 1.8, obj });
    const braco = new Path2D();
    braco.moveTo(-6, 0);
    for (let x = 0; x <= 150; x += 10) braco.lineTo(x, pescoco(x) - 8);
    for (let x = 150; x >= 0; x -= 10) braco.lineTo(x, pescoco(x) + 6);
    braco.closePath();
    peca(k, braco, [-6, -20, 150, 50], { cor: '#8d5f2e', tinta: '#2a1606', ang: 0.2, passo: 2.4, maxL: 1.2, sombra: () => 0.45, traco: 1.8, obj });
    // a voluta na ponta do braço
    k.strokeStyle = '#2a1606';
    k.lineWidth = 3;
    k.beginPath();
    k.arc(156, pescoco(150) - 6, 9, 0, 5.2);
    k.stroke();
    for (let x = 18; x <= 124; x += 11) {
      k.strokeStyle = 'rgba(252,240,206,.95)';
      k.lineWidth = 1.2;
      k.beginPath();
      k.moveTo(x, pescoco(x) + 6);
      k.lineTo(x, caixaY(x) - 2);
      k.stroke();
      k.fillStyle = '#2a1606';
      k.beginPath();
      k.arc(x, pescoco(x) + 6, 2, 0, 6.283);
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
    const sol = [600, 84];
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
      const y = hz + 4 + Math.pow(t, 1.7) * 330;
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
      // a faixa de tijolo vidrado, com as rosetas
      k.fillStyle = '#4e6a72';
      k.fillRect(x, mt - alto + 40, w, 12);
      k.fillStyle = '#efe2be';
      for (let a = x + 10; a < x + w - 4; a += 20) { k.beginPath(); k.arc(a, mt - alto + 46, 4, 0, 6.283); k.fill(); }
      k.strokeStyle = SEPIA;
      k.lineWidth = 1.2;
      k.strokeRect(x, mt - alto + 40, w, 12);
    };
    for (const x of [40, 760]) torre(x, 92, 50);
    torre(300, 110, 90);
    torre(480, 110, 90);
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
    // pela porta, lá dentro, a estrada que segue clara
    k.save();
    k.clip(porta);
    k.fillStyle = '#e8d4a4';
    k.beginPath();
    k.moveTo(430, mb);
    k.lineTo(440, mt + 10);
    k.lineTo(452, mt + 10);
    k.lineTo(462, mb);
    k.fill();
    k.restore();
    for (const a of [0, 1, 2]) { k.strokeStyle = 'rgba(250,236,200,.7)'; k.lineWidth = 1.2; k.beginPath(); k.arc(445, mt + 30, 40 + a * 6, Math.PI, 0); k.stroke(); }
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
    // a rede de lançar aberta na água, à direita do barco: a malha, a borda de chumbadas e as
    // dobras que ainda boiam, e a corda que volta ao barco
    const rx = 690;
    const ry = 560;
    const borda = new Path2D();
    borda.ellipse(rx, ry, 150, 44, -0.04, 0, 6.283);
    k.save();
    k.clip(borda);
    k.fillStyle = 'rgba(210,206,184,.6)';
    k.fill(borda);
    k.strokeStyle = 'rgba(43,33,18,.7)';
    k.lineWidth = 1;
    for (let d = -200; d < 200; d += 9) {
      k.beginPath();
      k.moveTo(rx + d - 60, ry - 60);
      k.lineTo(rx + d + 60, ry + 60);
      k.stroke();
      k.beginPath();
      k.moveTo(rx + d + 60, ry - 60);
      k.lineTo(rx + d - 60, ry + 60);
      k.stroke();
    }
    k.restore();
    marcar(k, obj, borda);
    k.strokeStyle = SEPIA;
    k.lineWidth = 2;
    k.stroke(borda);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * 6.283;
      const px = rx + Math.cos(a) * 150;
      const py = ry + Math.sin(a) * 44;
      k.fillStyle = '#3a3226';
      k.beginPath();
      k.ellipse(px, py, 4.4, 3, 0, 0, 6.283);
      k.fill();
      k.strokeStyle = 'rgba(250,246,230,.7)';
      k.lineWidth = 1;
      k.stroke();
    }
    // as ondinhas que a rede abriu em volta
    k.strokeStyle = 'rgba(43,33,18,.6)';
    for (const [a, b, w] of [[170, 54, 1.4], [196, 66, 1]]) { k.lineWidth = w; k.beginPath(); k.ellipse(rx, ry + 4, a, b, -0.04, 0.2, Math.PI - 0.2); k.stroke(); }
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
    peca(k, casco, [bx - L / 2, by - 170, bx + L / 2, by + 20], { cor: '#5d4630', tinta: '#1c140c', ang: 0.04, passo: 3.2, maxL: 1.8, sombra: (x, y) => 0.35 + (y - by + 100) / 200, cruzada: 0.8, traco: 2.4, obj });
    // as tábuas compridas, seguindo a borda
    k.save();
    k.clip(casco);
    for (let j = 1; j < 6; j++) {
      k.strokeStyle = 'rgba(240,222,180,.55)';
      k.lineWidth = 1.2;
      k.beginPath();
      for (let i = 0; i <= 40; i++) { const t = i / 40; const x = bx - L / 2 + t * L; const y = borda1(t) + j * 18 + Math.sin(t * Math.PI) * j * 3; if (i) k.lineTo(x, y); else k.moveTo(x, y); }
      k.stroke();
    }
    // a faixa clara da borda e o brilho
    k.fillStyle = '#c8a77a';
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
    // o reflexo escuro do casco, partido
    k.fillStyle = 'rgba(40,30,20,.45)';
    for (let i = 0; i < 8; i++) k.fillRect(bx - L / 2 + 30 + r() * 30, by + 44 + i * 7, L - 80 - r() * 80, 2.4);
    // o mastro, a verga com a vela enrolada e os cabos
    const mx = bx + 20;
    const topoMastro = 150;
    vara(k, [[mx, borda1(0.5) + 6], [mx + 4, topoMastro]], 7, '#8a6a44', obj);
    const verga = [[mx - 150, topoMastro + 40], [mx + 160, topoMastro + 14]];
    vara(k, verga, 5, '#8a6a44', obj);
    const vela = new Path2D();
    vela.moveTo(mx - 150, topoMastro + 40);
    for (let i = 0; i <= 12; i++) { const t = i / 12; vela.quadraticCurveTo(mx - 150 + t * 310 - 13, topoMastro + 40 - t * 26 + 14, mx - 150 + t * 310, topoMastro + 40 - t * 26 + (i % 2 ? 4 : 0)); }
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
    const caida = pol([[bx + 110, borda1(0.79) + 4], [bx + 160, borda1(0.92) + 6], [bx + 172, by - 2], [bx + 120, by - 6]]);
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
    corda.bezierCurveTo(bx + 220, by + 20, rx - 200, ry - 20, rx - 148, ry - 6);
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
      const p = seixo(r, x, y, s * 1.3, s * 0.75, (r() - 0.5) * 0.4, 0.12);
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
    for (let i = 0; i < 18; i++) { const x = r() * W; const y = 210 + r() * 70; k.beginPath(); k.moveTo(x, y); k.lineTo(x + (r() - 0.5) * 6, y + 20); k.stroke(); }
    k.restore();
    const gruta = (x, y, w, h) => {
      const g = contornoRocha(r, [[x, y], [x + 4, y - h * 0.6], [x + w * 0.3, y - h], [x + w * 0.7, y - h * 0.95], [x + w - 4, y - h * 0.55], [x + w, y]], 4);
      g.closePath();
      k.fillStyle = '#2a1e10';
      k.fill(g);
      gravar(k, g, x + w / 2, y - h / 2, w, 0.8, 4, 1, () => 0.5, 'rgba(240,220,180,.25)', 0);
      k.strokeStyle = SEPIA;
      k.lineWidth = 2;
      k.stroke(g);
    };
    gruta(120, 292, 90, 62);
    gruta(600, 290, 100, 66);
    gruta(380, 290, 60, 40);
    // as casas, por degraus, de trás para a frente
    const fileiras = [
      [[-20, 330, 96], [64, 326, 84], [210, 334, 120], [430, 330, 90], [530, 328, 74], [700, 334, 110], [820, 330, 80]],
      [[0, 452, 120], [150, 456, 104], [500, 458, 116], [650, 452, 96], [770, 460, 120]],
      [[540, 590, 150], [720, 600, 140]],
    ];
    fileiras.forEach((fila, f) => {
      // o socalco: a mureta de pedra embaixo de cada fileira
      const ym = fila[0][1] + 18;
      const mur = new Path2D();
      mur.moveTo(-10, ym);
      for (let x = -10; x <= W + 10; x += 12) mur.lineTo(x, ym + Math.sin(x * 0.01 + f) * 6);
      for (let x = W + 10; x >= -10; x -= 12) mur.lineTo(x, ym + 22 + Math.sin(x * 0.01 + f) * 6);
      mur.closePath();
      if (f < 2) {
        muroEmFiadas(k, r, mur, [-10, ym - 8, W + 10, ym + 30], { h: 7, larg: 2, cor: '#e2cb9a', sombra: () => 0.4 });
        k.strokeStyle = SEPIA;
        k.lineWidth = 1.5;
        k.stroke(mur);
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
        // o jarro à porta
        if (r() < 0.6) {
          const jx = x + w * 0.45;
          const j = vaso(k, jx, base + 2, 30, 20, (u) => (u < 0.15 ? 0.4 : 0.55 + Math.sin(u * Math.PI) * 0.45));
          peca(k, j, [jx - 10, base - 28, jx + 10, base + 2], { cor: '#c48852', tinta: '#3a1e08', ang: 0.2, passo: 2.4, maxL: 1.1, sombra: sombraOval(jx, base - 13, 10, 15, 0), cruzada: 0.7, traco: 1.4, obj });
        }
      }
    });
    // o caminho de terra que sobe entre as casas
    const cam = bezier([430, H + 20], [330, 720], [500, 650], [420, 590], 30).concat(bezier([420, 590], [350, 540], [420, 500], [370, 470], 20).slice(1));
    k.lineCap = 'round';
    for (let i = 1; i < cam.length; i++) {
      const t = (cam[i][1] - 470) / 380;
      k.strokeStyle = '#f2e5c2';
      k.lineWidth = 10 + t * 56;
      k.beginPath();
      k.moveTo(cam[i - 1][0], cam[i - 1][1]);
      k.lineTo(cam[i][0], cam[i][1]);
      k.stroke();
    }
    k.strokeStyle = 'rgba(43,33,18,.6)';
    k.lineWidth = 1.1;
    for (let i = 2; i < cam.length; i += 2) { const [x, y] = cam[i]; const t = (y - 470) / 380; k.beginPath(); k.moveTo(x - 6 - t * 22, y); k.lineTo(x + 6 + t * 22, y + 1); k.stroke(); }
    for (let i = 0; i < 12; i++) {
      const y = 620 + r() * 210;
      const x = (r() < 0.5 ? 260 + r() * 100 : 520 + r() * 160);
      const s = 5 + (y - 600) / 30 + r() * 4;
      const p = seixo(r, x, y, s, s * 0.6, 0, 0.18);
      peca(k, p, [x - s, y - s, x + s, y + s], { cor: '#e2cd9e', sombra: sombraOval(x, y, s, s * 0.6, 0), passo: 2.2, maxL: 1, traco: 1.2 });
    }
    // a figueira, perto, à esquerda: o tronco liso e claro, os galhos e as folhas largas de
    // cinco lobos, com as nervuras claras
    const tronco = new Path2D();
    tronco.moveTo(60, H + 10);
    tronco.bezierCurveTo(70, 760, 110, 700, 120, 640);
    tronco.lineTo(150, 646);
    tronco.bezierCurveTo(140, 710, 112, 770, 116, H + 10);
    tronco.closePath();
    peca(k, tronco, [60, 640, 150, H + 10], { cor: '#a8987a', ang: 1.4, passo: 3.2, maxL: 1.8, sombra: (x) => 0.2 + (x - 60) / 120, cruzada: 0.7, traco: 2.2, obj });
    const galhos = [[[130, 650], [90, 590], [40, 560], [-10, 540]], [[136, 648], [190, 600], [250, 590], [310, 560]], [[134, 646], [140, 590], [130, 540], [150, 500]]];
    for (const g of galhos) {
      const pts = bezier(g[0], g[1], g[2], g[3], 16);
      vara(k, pts, 9, '#a8987a', obj);
    }
    const folha = (x, y, s, g) => {
      k.save();
      k.translate(x, y);
      k.rotate(g);
      const f = new Path2D();
      const n = 60;
      for (let i = 0; i <= n; i++) {
        const a = -Math.PI + (i / n) * Math.PI;
        const lobo = Math.pow(Math.abs(Math.cos((a + Math.PI / 2) * 2.5)), 0.7);
        const rr = s * (0.42 + 0.58 * lobo) * (1 - Math.pow(Math.abs(a + Math.PI / 2) / (Math.PI / 2), 6) * 0.35);
        const px = Math.cos(a) * rr * 0.9;
        const py = Math.sin(a) * rr;
        if (i) f.lineTo(px, py); else f.moveTo(px, py);
      }
      f.quadraticCurveTo(0, s * 0.18, -s * 0.9 * 0.42, 0);
      f.closePath();
      peca(k, f, [-s, -s, s, s * 0.2], { cor: '#8e8c58', ang: 0.6, passo: 2.8, maxL: 1.5, sombra: (px, py) => 0.3 + (px / s) * 0.35 + (py / s) * -0.1, cruzada: 0.7, traco: 1.8, obj });
      k.strokeStyle = 'rgba(250,240,200,.8)';
      k.lineWidth = 1.5;
      for (const a of [-Math.PI * 0.82, -Math.PI * 0.66, -Math.PI / 2, -Math.PI * 0.34, -Math.PI * 0.18]) { k.beginPath(); k.moveTo(0, 2); k.quadraticCurveTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.4, Math.cos(a) * s * 0.78, Math.sin(a) * s * 0.85); k.stroke(); }
      k.restore();
    };
    for (const [x, y, s, g] of [[-6, 548, 80, -0.9], [60, 560, 76, -0.3], [150, 500, 84, 0.1], [214, 586, 72, 0.6], [300, 556, 66, 1.0], [96, 620, 62, -1.4], [250, 640, 58, 1.6], [176, 470, 60, -0.4]]) folha(x, y, s, g);
    for (const [x, y] of [[120, 560], [200, 540], [40, 600]]) {
      const p = seixo(r, x, y, 11, 14, 0.3, 0.05);
      peca(k, p, [x - 11, y - 14, x + 11, y + 14], { cor: '#7d7a48', sombra: sombraOval(x, y, 11, 14, 0), passo: 2.2, maxL: 1.1, traco: 1.6, obj });
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
    papelVelho(k, W, H, r, ['#f8f0dc', '#e8d8b4', '#c4aa7e'], [170, 230]);
    const hz = 410;
    const sol = [170, 250];
    // o céu da tarde: linhas que abrem em volta do sol baixo, as nuvens redondas
    linhas(k, 0, 0, W, hz, 5, 1.5, (x, y) => 0.1 + Math.min(1, Math.hypot(x - sol[0], y - sol[1]) / 760) * 0.6);
    for (const [x, y, rr] of [[560, 120, 70], [650, 96, 56], [730, 130, 60], [470, 140, 48], [300, 70, 44], [360, 60, 36], [820, 200, 40]]) {
      const n = lanoso(r, Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.283; return [x + Math.cos(a) * rr * 1.2, y + Math.min(Math.sin(a) * rr * 0.8, rr * 0.3)]; }), rr * 0.18, rr * 0.5);
      k.fillStyle = '#fbf3df';
      k.fill(n);
      gravar(k, n, x, y, rr * 1.3, 0.3, 3.4, 1.6, (px, py) => 0.1 + Math.max(0, (py - y + rr * 0.2) / rr) * 0.9 + (px - x) / rr * 0.2, SEPIA, 0.3);
      k.strokeStyle = 'rgba(43,33,18,.7)';
      k.lineWidth = 1.4;
      k.stroke(n);
    }
    k.fillStyle = '#fff6de';
    k.beginPath();
    k.arc(sol[0], sol[1], 34, 0, 6.283);
    k.fill();
    k.strokeStyle = '#7a4a1c';
    k.lineWidth = 1.6;
    k.stroke();
    {
      const n = lanoso(r, Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.283; return [sol[0] + 30 + Math.cos(a) * 70, sol[1] + 26 + Math.min(Math.sin(a) * 26, 10)]; }), 9, 26);
      k.fillStyle = '#fbf3df';
      k.fill(n);
      gravar(k, n, sol[0] + 30, sol[1] + 26, 80, 0.3, 3.4, 1.5, (px, py) => 0.1 + Math.max(0, (py - sol[1] - 20) / 20) * 0.9, SEPIA, 0.3);
      k.strokeStyle = 'rgba(43,33,18,.7)';
      k.lineWidth = 1.4;
      k.stroke(n);
    }
    // as gaivotas: o corpo e as asas em arco, poucas
    for (const [x, y, s] of [[420, 230, 1], [470, 260, 0.8], [640, 250, 1.2], [700, 300, 0.7], [250, 180, 0.6]]) {
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
    flancoEmRaios(k, r, ilha, [{ x: 414, y: 270, n: 9, fase: 0.6 }, { x: 300, y: 290, n: 7, fase: 1.8 }, { x: 530, y: 300, n: 7, fase: 2.4 }, { x: 660, y: 330, n: 6, fase: 0.2 }, { x: 160, y: 346, n: 5, fase: 1.1 }], [50, 260, 880, hz + 8], { maxL: 2.4, passo: 4.6, luz: -1, base: 0.04 });
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
    flancoEmRaios(k, r, roch, [{ x: 720, y: 640, n: 6, fase: 1 }, { x: 850, y: 610, n: 5, fase: 2.2 }], [560, 600, W + 10, H + 10], { maxL: 2.8, passo: 5, luz: -1, base: 0.15 });
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
      // a luz da glória, parada no papel: o clarão no alto e os raios finos, simétricos. Na arte
      // escura (a noite de Abraão, de Gideão), os raios ficam curtos e fracos, só no alto: no céu
      // escuro, raio longo vira grade
      const escura = tom === 'escura';
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
        g.addColorStop(0, 'rgba(255,244,214,' + (i % 2 ? 0.16 : 0.3) * (escura ? 0.3 : 1) + ')');
        g.addColorStop(escura ? 0.36 : 0.75, 'rgba(255,244,214,0)');
        k.strokeStyle = g;
        k.lineWidth = i % 2 ? 2 : 4;
        k.beginPath();
        k.moveTo(CW / 2, -60);
        k.lineTo(CW / 2 + Math.cos(a) * 1100, -60 + Math.sin(a) * 1100);
        k.stroke();
      }
      // nas artes claras o clarão some; ali os raios entram como traço de ouro fino
      k.save();
      k.globalAlpha = escura ? 0 : 0.16;
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
