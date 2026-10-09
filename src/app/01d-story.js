/* Imagem de story (1080x1920): a ofensiva e o versículo viram uma imagem para o story do
   Instagram e o status do WhatsApp. Tudo no aparelho, num <canvas>: nada vai ao servidor.

   Por que uma imagem, e não um link: um app web não consegue abrir o editor de story do
   Instagram nem o status do WhatsApp sozinho (isso pede app nativo, com a API de Stories).
   O que o navegador oferece é o Web Share com arquivo (navigator.share({ files })): a folha
   de compartilhar do sistema abre já com a imagem, e ali estão "Instagram > Story" e
   "WhatsApp > Meu status". Onde isso não existe, a imagem é baixada e o aviso diz como postar.

   Área segura: o Instagram põe a barra do perfil nos 250px de cima e a caixa de resposta nos
   250px de baixo. Nada que importe fica nessas faixas; só o fundo e, embaixo, a marca discreta
   logo acima da faixa. As composições foram escolhidas entre variantes (design/compartilhar/). */
(function (CC) {
  'use strict';

  const L = 1080;
  const A = 1920;
  const SEGURA = 250;
  const ENDERECO = 'geracaoeleita.app';

  // ---------- fontes ----------
  // O canvas não espera a fonte: se ela não chegou, desenha com a do sistema. As quatro são
  // pedidas antes (e, na folha da ofensiva, já quando a folha abre), para o toque sair rápido.
  const FONTES = ['800 100px Manrope', '700 100px Manrope', '500 100px Literata', '600 100px Literata',
    '400 100px "Permanent Marker"', '700 100px Oswald'];
  let fontesProntas = null;
  function prepararFontes() {
    if (!fontesProntas) {
      fontesProntas = (document.fonts && document.fonts.load
        ? Promise.all(FONTES.map((f) => document.fonts.load(f, 'AÉgjçã“1').catch(() => null))) : Promise.resolve())
        .then(() => true, () => true);
    }
    return fontesProntas;
  }

  // ---------- peças ----------
  // A pincelada do carimbo: o mesmo desenho do .selo-linha::before (estilo.css), esticado no
  // tamanho do bloco; as linhas pares saem espelhadas, como na tela.
  const PINCEL = 'M3 11C42 5 84 12 124 7 168 2 214 11 256 6c18-2 34 3 42 0l0 44c-20 7-46-2-82 4-44 7-90-4-134 2-30 4-58-5-80 0z';
  function pincelada(ctx, x, y, w, h, espelhar, cor) {
    ctx.save();
    ctx.translate(espelhar ? x + w : x, y);
    ctx.scale((espelhar ? -w : w) / 300, h / 60);
    ctx.fillStyle = cor;
    ctx.fill(new Path2D(PINCEL));
    ctx.restore();
  }

  // O carimbo em pincel, com as medidas do app (estilo.css: padding 8/18/4, line-height 1.12,
  // -3px entre linhas, letra .02em, o empurrão de cada linha) multiplicadas pela escala.
  // Permanent Marker só tem o peso 400; o app pede 600 e o navegador engrossa a letra: aqui
  // também, para o traço ser o mesmo.
  const EMPURRAO = [3, -8, 6, -5, 4, -7];
  const fonteSelo = (t) => '600 ' + t + 'px "Permanent Marker", cursive';
  function medidasDoCarimbo(ctx, linhas, tamanho) {
    const k = tamanho / 21.6;
    ctx.font = fonteSelo(tamanho);
    try { ctx.letterSpacing = (tamanho * 0.02).toFixed(2) + 'px'; } catch (e) { /* navegador sem letterSpacing */ }
    const altLinha = tamanho * 1.12;
    const bloco = altLinha + 12 * k;
    const passo = bloco - 3 * k;
    const larguras = linhas.map((l) => ctx.measureText(l.toUpperCase()).width + 36 * k);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* idem */ }
    return { k, altLinha, bloco, passo, larguras, altura: bloco + passo * (linhas.length - 1), largura: Math.max(...larguras) + 16 * k };
  }
  // O maior tamanho em que o carimbo cabe na caixa: o carimbo todo encolhe por igual, como
  // na folha (linhas de tamanhos diferentes pareciam um carimbo remendado).
  function tamanhoDoCarimbo(ctx, linhas, larguraMax, alturaMax, tamanhoMax) {
    let t = tamanhoMax;
    for (let i = 0; i < 60; i++) {
      const m = medidasDoCarimbo(ctx, linhas, t);
      if (m.largura <= larguraMax && m.altura <= alturaMax) break;
      t *= 0.96;
    }
    return t;
  }
  function carimbo(ctx, linhas, cx, topo, tamanho, { chapa, letra }) {
    const m = medidasDoCarimbo(ctx, linhas, tamanho);
    ctx.font = fonteSelo(tamanho);
    const met = ctx.measureText('HÁ');
    const asc = met.fontBoundingBoxAscent || tamanho * 0.95;
    const desc = met.fontBoundingBoxDescent || tamanho * 0.3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    linhas.forEach((linha, i) => {
      const w = m.larguras[i];
      const x = cx - w / 2 + EMPURRAO[i % EMPURRAO.length] * m.k;
      const y = topo + i * m.passo;
      pincelada(ctx, x, y, w, m.bloco, i % 2 === 1, chapa);
      ctx.fillStyle = letra;
      ctx.font = fonteSelo(tamanho);
      try { ctx.letterSpacing = (tamanho * 0.02).toFixed(2) + 'px'; } catch (e) { /* idem */ }
      const base = y + 8 * m.k + (m.altLinha - (asc + desc)) / 2 + asc;
      ctx.fillText(linha.toUpperCase(), x + w / 2, base);
      try { ctx.letterSpacing = '0px'; } catch (e) { /* idem */ }
    });
    return m;
  }

  // A chama da ofensiva (os caminhos de CC.icoChama), com a base em (cx, base) e a altura
  // do fogo; o estágio só muda o tamanho. Nível 0 é a chama apagada, em cinza.
  function chama(ctx, cx, base, altura, apagada, corApagada) {
    const f = CC.CAMINHOS_FOGO;
    const s = altura / 16.8; // o fogo vai de y 1.9 a 18.7 na caixa de 24
    ctx.save();
    ctx.translate(cx - 12 * s, base - 18.7 * s);
    ctx.scale(s, s);
    ctx.fillStyle = apagada ? corApagada : '#e23d1b';
    ctx.globalAlpha = apagada ? 0.45 : 1;
    ctx.fill(new Path2D(f.fora));
    if (!apagada) { ctx.fillStyle = '#ff9d1c'; ctx.fill(new Path2D(f.dentro)); }
    ctx.restore();
  }

  // O símbolo GE na chama (CC.icoLogo), com o topo em (x, y) e a altura dada; devolve a largura.
  function logo(ctx, x, y, altura, cor) {
    const s = altura / 1936;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.translate(-569, -169);
    ctx.translate(0, 2508);
    ctx.scale(0.1, -0.1);
    ctx.fillStyle = cor;
    ctx.fill(new Path2D(CC.CAMINHO_SIMBOLO));
    ctx.restore();
    return 1357 * s;
  }

  // A marca no pé: símbolo + "Geração Eleita" + endereço, centrada, com o pé em y. Os
  // modelos das artes (01e-story-artes.js) põem a contagem de dias nessa segunda linha (sub).
  function marca(ctx, cy, { cor, corFraca, tamanho = 34, sub = ENDERECO }) {
    const alturaLogo = tamanho * 2.1;
    ctx.font = '800 ' + tamanho + 'px Manrope, sans-serif';
    const wNome = ctx.measureText('Geração Eleita').width;
    ctx.font = '600 ' + Math.round(tamanho * 0.78) + 'px Manrope, sans-serif';
    const wEnd = ctx.measureText(sub).width;
    const wTexto = Math.max(wNome, wEnd);
    const wLogo = alturaLogo * 1357 / 1936;
    const vao = tamanho * 0.6;
    const x0 = L / 2 - (wLogo + vao + wTexto) / 2;
    logo(ctx, x0, cy - alturaLogo / 2, alturaLogo, cor);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = cor;
    ctx.font = '800 ' + tamanho + 'px Manrope, sans-serif';
    ctx.fillText('Geração Eleita', x0 + wLogo + vao, cy - tamanho * 0.08);
    ctx.fillStyle = corFraca;
    ctx.font = '600 ' + Math.round(tamanho * 0.78) + 'px Manrope, sans-serif';
    ctx.fillText(sub, x0 + wLogo + vao, cy + tamanho * 0.86);
  }

  // Texto corrido quebrado em linhas equilibradas (o text-wrap: balance da tela): primeiro
  // o maior tamanho que cabe na caixa, depois a menor largura que mantém o mesmo número de
  // linhas, para a última não ficar com uma palavra sozinha.
  function textoEquilibrado(ctx, texto, { fonte, larguraMax, alturaMax, fonteMax, fonteMin, entreLinhas }) {
    const medir = (t, tam) => { ctx.font = fonte(tam); return ctx.measureText(t).width; };
    const ajuste = { alturaMax, fonteMax, fonteMin, entreLinhas, medir };
    const { tamanho, linhas: cheias } = CC.ajustarTextoCartao(texto, { ...ajuste, larguraMax });
    let linhas = cheias;
    for (let de = larguraMax * 0.5, ate = larguraMax, i = 0; i < 14 && cheias.length > 1; i++) {
      const meio = (de + ate) / 2;
      const t = CC.ajustarTextoCartao(texto, { ...ajuste, larguraMax: meio, fonteMax: tamanho, fonteMin: tamanho }).linhas;
      if (t.length === cheias.length) { linhas = t; ate = meio; } else de = meio;
    }
    return { tamanho, linhas, altura: linhas.length * tamanho * entreLinhas };
  }

  // Uma frase sem linhas prontas (a do estágio da chama) quebrada como o carimbo: linhas de
  // até uns 20 caracteres, equilibradas.
  function linhasDoCarimbo(texto) {
    const palavras = String(texto || '').split(/\s+/).filter(Boolean);
    const n = Math.max(1, Math.ceil(palavras.join(' ').length / 22));
    // a divisão em n linhas mais parecidas entre si (menor soma dos quadrados da diferença
    // para a média): nem palavra sozinha numa ponta, nem uma linha comprida no meio
    const comp = (i, j) => palavras.slice(i, j).join(' ').length;
    const media = palavras.join(' ').length / n;
    const memo = new Map();
    const melhor = (i, k) => {
      const chave = i + ':' + k;
      if (memo.has(chave)) return memo.get(chave);
      let r;
      if (k === 1) r = { custo: (comp(i, palavras.length) - media) ** 2, cortes: [] };
      else {
        r = { custo: Infinity, cortes: [] };
        for (let j = i + 1; j <= palavras.length - k + 1; j++) {
          const resto = melhor(j, k - 1);
          const custo = (comp(i, j) - media) ** 2 + resto.custo;
          if (custo < r.custo) r = { custo, cortes: [j, ...resto.cortes] };
        }
      }
      memo.set(chave, r);
      return r;
    };
    const quantas = Math.min(n, palavras.length);
    const cortes = [0, ...melhor(0, quantas).cortes, palavras.length];
    return cortes.slice(1).map((fim, i) => palavras.slice(cortes[i], fim).join(' '));
  }

  function tela() {
    const c = document.createElement('canvas');
    c.width = L;
    c.height = A;
    return c;
  }

  // ---------- as duas composições ----------
  const Mn = (peso, t) => peso + ' ' + t + 'px Manrope, sans-serif';
  const Lit = (peso, t) => peso + ' ' + t + 'px Literata, Georgia, serif';
  function escrever(ctx, txt, x, y, fonte, cor, { alinhar = 'center', espaco = 0 } = {}) {
    ctx.font = fonte;
    ctx.fillStyle = cor;
    ctx.textAlign = alinhar;
    ctx.textBaseline = 'alphabetic';
    try { ctx.letterSpacing = espaco + 'px'; } catch (e) { /* idem */ }
    ctx.fillText(txt, x, y);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* idem */ }
  }
  // A referência em cima do carimbo: Oswald 700, maiúscula, espaçada e inclinada, como na folha.
  function refDoCarimbo(ctx, ref, y, tamanho, cor) {
    ctx.save();
    ctx.translate(L / 2, y);
    ctx.transform(1, 0, -0.2, 1, 0, 0);
    escrever(ctx, ref.toUpperCase(), 0, 0, '700 ' + tamanho + 'px Oswald, sans-serif', cor, { espaco: tamanho * 0.14 });
    ctx.restore();
  }

  // Ofensiva (variante B, escolhida): grafite, a chama do estágio acesa com um brilho atrás,
  // o número grande em chama clara e o carimbo com as chapas claras do tema escuro.
  function desenharOfensiva(ctx, { dias, frase }) {
    const est = CC.estagioDaChama(dias);
    const lema = frase && frase.linhas && frase.linhas.length ? frase : { linhas: linhasDoCarimbo(est.frase), ref: est.ref };
    ctx.fillStyle = '#1b1c1a';
    ctx.fillRect(0, 0, L, A);
    // a área do conteúdo: abaixo da faixa de cima, acima da marca (que fica logo acima da
    // faixa de baixo)
    const z0 = SEGURA + 40;
    const z1 = A - SEGURA - 190;
    // O carimbo tem o lugar dele garantido (frase de seis linhas legível); a chama e o número
    // encolhem juntos se não couberem no que sobra, para nada ficar miúdo.
    const altRef = lema.ref ? 64 : 0;
    const tamCarimbo = tamanhoDoCarimbo(ctx, lema.linhas, 900, 440, 78);
    const mc = medidasDoCarimbo(ctx, lema.linhas, tamCarimbo);
    const natural = (460 * CC.CAMINHOS_FOGO.escala[est.nivel] / CC.CAMINHOS_FOGO.escala[5]) + 48 + 300 * 0.72;
    const g = Math.min(1, (z1 - z0 - mc.altura - altRef - 104 - 86 - 64) / natural);
    const hc = 460 * g * CC.CAMINHOS_FOGO.escala[est.nivel] / CC.CAMINHOS_FOGO.escala[5];
    const tamNumero = 300 * g;
    const capa = tamNumero * 0.72;
    const fixo = hc + 48 * g + capa + 86 + 64 + 104 + altRef;
    let y = z0 + Math.max(0, (z1 - z0 - fixo - mc.altura) / 2);

    const brilho = ctx.createRadialGradient(L / 2, y + hc * 0.6, 0, L / 2, y + hc * 0.6, hc * 1.35);
    brilho.addColorStop(0, dias ? 'rgba(255,122,82,.32)' : 'rgba(164,169,157,.12)');
    brilho.addColorStop(1, 'rgba(255,122,82,0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(0, Math.max(0, y - hc), L, hc * 3.2);
    chama(ctx, L / 2, y + hc, hc, !dias, '#a4a99d');
    y += hc + 48 * g + capa;
    escrever(ctx, String(dias), L / 2, y, Mn(800, tamNumero), dias ? '#ff9a7a' : '#a4a99d', { espaco: -8 });
    y += 86;
    escrever(ctx, dias === 1 ? 'dia de ofensiva' : 'dias de ofensiva', L / 2, y, Mn(700, 56), '#eef0ea');
    y += 64;
    escrever(ctx, est.nome.toUpperCase(), L / 2, y, Mn(800, 30), '#c9d98f', { espaco: 30 * 0.16 });
    y += 104;
    if (lema.ref) { refDoCarimbo(ctx, lema.ref, y, 34, '#eef0ea'); y += altRef - 34; }
    carimbo(ctx, lema.linhas, L / 2, y, tamCarimbo, { chapa: '#eef0ea', letra: '#1b1c1a' });
    marca(ctx, A - SEGURA - 80, { cor: '#c9d98f', corFraca: '#a4a99d' });
  }

  // Versículo (redesenho de 2026-10-09, design/compartilhar/LEIA.md): a página escura da
  // landing, as aspas grandes em sálvia como o elemento gráfico (sem a bolinha de antes), o
  // versículo em Literata alinhado à esquerda, a referência em Oswald amarela com a versão
  // embaixo, e no pé o carimbo "Leia a Bíblia comigo" com a marca: o story também apresenta o
  // app a quem vê. O texto vai como está; se o trecho começa no meio da frase (minúscula),
  // ganha reticências na frente, só na imagem. A paleta clara existe para comparar
  // (design/compartilhar/gerar.mjs versiculo); o app usa a escura.
  const PALETAS_VERSICULO = {
    escura: { fundo: '#0d0e0c', brilho: 'rgba(200,218,140,.10)', aspas: '#c8da8c', texto: '#f2efdc', barra: '#c8da8c',
      ref: '#ffc44d', versao: '#a3a69a', chapa: '#c8da8c', letra: '#12130f', marca: '#f2efdc', marcaFraca: '#a3a69a' },
    clara: { fundo: '#dfe8c1', brilho: 'rgba(255,255,255,.35)', aspas: '#12130f', texto: '#12130f', barra: '#12130f',
      ref: '#12130f', versao: '#4f5a36', chapa: '#12130f', letra: '#dfe8c1', marca: '#12130f', marcaFraca: '#4f5a36' },
  };
  function desenharVersiculo(ctx, { ref, texto, traducao, paleta }) {
    const P = PALETAS_VERSICULO[paleta] || PALETAS_VERSICULO.escura;
    // o fundo de cartaz da marca vem com as artes (01e-story-artes.js); sem ele, a página lisa
    const cartaz = !paleta && CC.story.fundoCartaz;
    if (cartaz) CC.story.fundoCartaz(ctx);
    else {
      ctx.fillStyle = P.fundo;
      ctx.fillRect(0, 0, L, A);
      const brilho = ctx.createRadialGradient(160, 420, 0, 160, 420, 900);
      brilho.addColorStop(0, P.brilho);
      brilho.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = brilho;
      ctx.fillRect(0, 0, L, A);
    }
    const margem = 96;
    const largura = L - 2 * margem;
    const bruto = String(texto || '').trim();
    // começa no meio da frase: reticências na frente (o texto em si não muda)
    const corpo = bruto ? (/^\p{Ll}/u.test(bruto) ? '…' + bruto : bruto) : ref;
    const z0 = SEGURA + (cartaz ? 150 : 60);
    const z1 = A - SEGURA - (cartaz ? 300 : 250);
    const altAspas = 190;
    const altRef = 46 + 70 + (traducao ? 46 : 0);
    // Letra de 42px para cima (abaixo disso o story vira um paredão). Um trecho longo demais
    // (até dez versículos) para no fim da última palavra que cabe, com reticências: a referência
    // diz o trecho inteiro.
    const caixa = { fonte: (x) => Lit(500, x), larguraMax: largura, alturaMax: z1 - z0 - altAspas - altRef,
      fonteMax: 128, fonteMin: 42, entreLinhas: 1.3 };
    let t = textoEquilibrado(ctx, corpo, caixa);
    if (t.altura > caixa.alturaMax) {
      const palavras = corpo.split(/\s+/);
      let de = 1;
      let ate = palavras.length;
      while (de < ate) {
        const meio = Math.ceil((de + ate) / 2);
        const tentativa = textoEquilibrado(ctx, palavras.slice(0, meio).join(' ') + '…', caixa);
        if (tentativa.altura <= caixa.alturaMax) de = meio; else ate = meio - 1;
      }
      t = textoEquilibrado(ctx, palavras.slice(0, de).join(' ').replace(/[,;:.!?]+$/, '') + '…', caixa);
    }
    const altura = altAspas + t.altura + altRef;
    let y = z0 + Math.max(0, (z1 - z0 - altura) / 2);
    // as aspas grandes, o elemento gráfico
    escrever(ctx, '“', margem - 14, y + 300, Lit(600, 420), P.aspas, { alinhar: 'left' });
    y += altAspas;
    for (const linha of t.linhas) {
      escrever(ctx, linha, margem, y + t.tamanho * 1.0, Lit(500, t.tamanho), P.texto, { alinhar: 'left' });
      y += t.tamanho * 1.3;
    }
    y += 46;
    ctx.fillStyle = P.barra;
    ctx.fillRect(margem, y, 90, 8);
    y += 70;
    escrever(ctx, ref.toUpperCase(), margem, y, '700 52px Oswald, sans-serif', P.ref, { alinhar: 'left', espaco: 52 * 0.06 });
    if (traducao) escrever(ctx, traducao.toUpperCase(), margem, y + 46, Mn(700, 26), P.versao, { alinhar: 'left', espaco: 26 * 0.16 });
    // o convite e a marca (no cartaz, o pé dele: convite, endereço, cruz e coroa)
    if (cartaz) { CC.story.rodapeCartaz(ctx); return; }
    const convite = ['Leia a Bíblia comigo'];
    const tc = tamanhoDoCarimbo(ctx, convite, 760, 90, 46);
    carimbo(ctx, convite, L / 2, A - SEGURA - 210, tc, { chapa: P.chapa, letra: P.letra });
    marca(ctx, A - SEGURA - 60, { cor: P.marca, corFraca: P.marcaFraca });
  }

  // A frase que tem arte própria (FRASES_OFENSIVA com "arte") usa o modelo dela; as outras,
  // e a frase do estágio, o modelo de sempre. A arte sai da lista pela frase, e não do pedido,
  // para o pedido continuar o mesmo (a folha e o fim da lição mandam linhas e referência).
  // arteDesejada: o modelo que a frase pede; arteDaFrase: o mesmo, se os desenhos já chegaram.
  function arteDesejada(frase) {
    if (!frase || !frase.linhas || !CC.FRASES_OFENSIVA) return null;
    const texto = frase.linhas.join(' ');
    const f = CC.FRASES_OFENSIVA.find((x) => x.arte && x.linhas.join(' ') === texto && (x.ref || '') === (frase.ref || ''));
    return f ? f.arte : null;
  }
  function arteDaFrase(frase) {
    const arte = arteDesejada(frase);
    return arte && CC.story.artes && CC.story.artes[arte] ? arte : null;
  }
  // Os desenhos das artes moram num arquivo à parte (window.STORY_ARTES, gerado pelo build),
  // pedido só quando um story desses vai ser gerado. Falhou (sem rede na primeira vez): a
  // promessa resolve assim mesmo, e o story sai no modelo de sempre.
  let artesPedidas = null;
  function carregarArtes() {
    if (CC.story.artes) return Promise.resolve(true);
    if (!artesPedidas) {
      artesPedidas = new Promise((resolver) => {
        const arquivo = window.STORY_ARTES;
        if (!arquivo) { resolver(false); return; }
        const s = document.createElement('script');
        const fim = (certo) => { clearTimeout(espera); resolver(certo && !!CC.story.artes); if (!CC.story.artes) artesPedidas = null; };
        const espera = setTimeout(() => fim(false), 10000);
        s.src = './' + arquivo;
        s.onload = () => fim(true);
        s.onerror = () => { s.remove(); fim(false); };
        document.head.appendChild(s);
      });
    }
    return artesPedidas;
  }
  function desenhar(ctx, tipo, dados) {
    const arte = tipo === 'ofensiva' ? arteDaFrase(dados.frase) : null;
    if (arte) CC.story.artes[arte](ctx, dados);
    else if (tipo === 'ofensiva') desenharOfensiva(ctx, dados);
    else desenharVersiculo(ctx, dados);
  }

  // ---------- gerar e compartilhar ----------
  const semAcento = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const nomeDoArquivo = (p) => (p.tipo === 'ofensiva'
    ? 'geracao-eleita-ofensiva-' + p.dias + (p.dias === 1 ? '-dia' : '-dias')
    : 'geracao-eleita-' + semAcento(p.ref)) + '.png';
  // O texto que vai junto (legenda no WhatsApp), quando o destino aceita texto com o arquivo.
  const textoDe = (p) => (p.tipo === 'ofensiva'
    ? 'Estou há ' + p.dias + (p.dias === 1 ? ' dia' : ' dias') + ' lendo a Bíblia no Geração Eleita!'
    : p.ref + (p.traducao ? ' (' + p.traducao + ')' : '') + ', no Geração Eleita.') + ' https://' + ENDERECO;

  // A imagem pronta (um File), guardada para o mesmo pedido: a folha da ofensiva prepara a
  // dela assim que abre, e o toque em Compartilhar só abre a folha do sistema. O Safari só
  // deixa abrir o compartilhamento logo depois de um toque; com a imagem já pronta, nada de
  // espera entre o toque e o navigator.share.
  let guardada = { chave: '', promessa: null };
  function preparar(pedido) {
    const chave = JSON.stringify(pedido);
    if (guardada.chave !== chave || !guardada.promessa) {
      const querArte = pedido.tipo === 'ofensiva' && !!arteDesejada(pedido.frase);
      const arte = querArte ? arteDesejada(pedido.frase) : null;
      // o versículo usa o fundo de cartaz, que vem com as artes (e as montanhas)
      const ehVerso = pedido.tipo === 'versiculo' && !pedido.paleta;
      const promessa = prepararFontes()
        .then(() => (querArte || ehVerso ? carregarArtes() : true))
        .then(() => (querArte && CC.story.prepararArte && arteDaFrase(pedido.frase) ? CC.story.prepararArte(arte) : true))
        .then(() => (ehVerso && CC.story.prepararVersiculo ? CC.story.prepararVersiculo() : true))
        .then(() => {
          const c = tela();
          desenhar(c.getContext('2d'), pedido.tipo, pedido);
          // a arte (ou a foto dela) não chegou: esta sai no modelo de sempre (ou na
          // ilustração), e o próximo toque tenta de novo
          const faltou = (querArte && (!arteDaFrase(pedido.frase) || (CC.story.arteCompleta && !CC.story.arteCompleta(arte))))
            || (ehVerso && (!CC.story.fundoCartaz || !CC.story.versiculoCompleto()));
          if (faltou) setTimeout(() => { if (guardada.promessa === promessa) guardada = { chave: '', promessa: null }; }, 0);
          return new Promise((resolver) => c.toBlob(resolver, 'image/png'));
        }).then((blob) => {
        if (!blob) throw new Error('sem imagem');
        return new File([blob], nomeDoArquivo(pedido), { type: 'image/png' });
      });
      promessa.catch(() => { if (guardada.promessa === promessa) guardada = { chave: '', promessa: null }; });
      guardada = { chave, promessa };
    }
    return guardada.promessa;
  }

  function baixar(arquivo) {
    const url = URL.createObjectURL(arquivo);
    const a = document.createElement('a');
    a.href = url;
    a.download = arquivo.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Compartilha a imagem de story. pedido: { tipo: 'ofensiva', dias, frase? } ou
  // { tipo: 'versiculo', ref, texto, traducao? }. Devolve 'compartilhado', 'cancelado',
  // 'baixado', 'de-novo' (o navegador pediu um toque novo) ou 'falhou'.
  CC.imagemStory = async function (pedido) {
    let arquivo;
    try { arquivo = await preparar(pedido); } catch (e) {
      CC.avisar('Não consegui gerar a imagem agora.');
      return 'falhou';
    }
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      const comTexto = { files: [arquivo], text: textoDe(pedido) };
      try {
        await navigator.share(navigator.canShare(comTexto) ? comTexto : { files: [arquivo] });
        return 'compartilhado';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelado';
        if (e && e.name === 'NotAllowedError') {
          CC.avisar('Imagem pronta. Toque de novo para compartilhar.');
          return 'de-novo';
        }
      }
    }
    try { baixar(arquivo); } catch (e) {
      CC.avisar('Não consegui salvar a imagem agora.');
      return 'falhou';
    }
    CC.avisar('Imagem salva. Poste pela galeria no story do Instagram ou no status do WhatsApp.');
    return 'baixado';
  };

  CC.story = { L, A, SEGURA, ENDERECO, desenhar, arteDaFrase, arteDesejada, carregarArtes, Mn, Lit, escrever, preparar, nomeDoArquivo, textoDe, prepararFontes, pincelada, medidasDoCarimbo, tamanhoDoCarimbo, carimbo, chama, logo, marca, textoEquilibrado, linhasDoCarimbo, tela };
})(window.CC);
