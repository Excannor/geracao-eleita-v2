/* Variantes da imagem de story (rodada 1): três composições da ofensiva e três do versículo,
   desenhadas com as peças de src/app/01d-story.js. Gere os PNGs com
   CHROME=... node design/compartilhar/gerar.mjs; a escolha e o porquê estão em LEIA.md. */
(function () {
  const S = CC.story;
  const { L, A } = S;
  const meio = L / 2;
  const Mn = (peso, t) => peso + ' ' + t + 'px Manrope, sans-serif';
  const Lit = (peso, t) => peso + ' ' + t + 'px Literata, Georgia, serif';

  function textoCentro(ctx, txt, y, fonte, cor, espaco) {
    ctx.font = fonte;
    ctx.fillStyle = cor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    try { ctx.letterSpacing = (espaco || 0) + 'px'; } catch (e) { /* */ }
    ctx.fillText(txt, meio, y);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* */ }
  }
  const rotulo = (dias) => (dias === 1 ? 'dia de ofensiva' : 'dias de ofensiva');
  const alturaChama = (dias, base) => base * (CC.CAMINHOS_FOGO.escala[CC.estagioDaChama(dias).nivel] / 1.14);

  // a referência em cima do carimbo: Oswald 700, maiúscula, espaçada, inclinada como na folha
  function refCarimbo(ctx, ref, y, tamanho, cor) {
    ctx.save();
    ctx.font = '700 ' + tamanho + 'px Oswald, sans-serif';
    ctx.fillStyle = cor;
    ctx.textAlign = 'center';
    try { ctx.letterSpacing = (tamanho * 0.14) + 'px'; } catch (e) { /* */ }
    ctx.translate(meio, y);
    ctx.transform(1, 0, -0.2, 1, 0, 0);
    ctx.fillText(ref.toUpperCase(), 0, 0);
    ctx.restore();
  }

  // ---------- ofensiva A: a folha do Início (sálvia pálida), tudo empilhado ----------
  function ofensivaA(ctx, d) {
    ctx.fillStyle = '#dfe8c1';
    ctx.fillRect(0, 0, L, A);
    const hc = alturaChama(d.dias, 300);
    const tamCarimbo = S.tamanhoDoCarimbo(ctx, d.frase.linhas, 880, 470, 64);
    const mc = S.medidasDoCarimbo(ctx, d.frase.linhas, tamCarimbo);
    const altRef = d.frase.ref ? 62 : 0;
    const altura = hc + 30 + 190 + 30 + 54 + 90 + altRef + mc.altura;
    let y = 250 + (1430 - 160 - altura) / 2;
    S.chama(ctx, meio, y + hc, hc, d.dias === 0, '#686b66');
    y += hc + 30 + 190;
    textoCentro(ctx, String(d.dias), y, Mn(800, 250), '#b3321a', -6);
    y += 30 + 54;
    textoCentro(ctx, rotulo(d.dias), y, Mn(700, 54), '#151615');
    y += 90;
    if (d.frase.ref) { refCarimbo(ctx, d.frase.ref, y + 30, 32, '#151615'); y += altRef; }
    S.carimbo(ctx, d.frase.linhas, meio, y, tamCarimbo, { chapa: '#151615', letra: '#dfe8c1' });
    S.marca(ctx, A - 250 - 70, { cor: '#151615', corFraca: '#4f5a36' });
  }

  // ---------- ofensiva B: grafite, o fogo brilhando no escuro ----------
  function ofensivaB(ctx, d) {
    ctx.fillStyle = '#1b1c1a';
    ctx.fillRect(0, 0, L, A);
    const hc = alturaChama(d.dias, 380);
    const tamCarimbo = S.tamanhoDoCarimbo(ctx, d.frase.linhas, 880, 440, 60);
    const mc = S.medidasDoCarimbo(ctx, d.frase.linhas, tamCarimbo);
    const altRef = d.frase.ref ? 62 : 0;
    const altura = hc + 40 + 200 + 26 + 50 + 100 + altRef + mc.altura;
    let y = 250 + (1430 - 160 - altura) / 2;
    const brilho = ctx.createRadialGradient(meio, y + hc * 0.62, 10, meio, y + hc * 0.62, hc * 1.25);
    brilho.addColorStop(0, 'rgba(255,122,82,.30)');
    brilho.addColorStop(1, 'rgba(255,122,82,0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(0, y - hc, L, hc * 3);
    S.chama(ctx, meio, y + hc, hc, d.dias === 0, '#a4a99d');
    y += hc + 40 + 200;
    textoCentro(ctx, String(d.dias), y, Mn(800, 260), '#ff9a7a', -6);
    y += 26 + 50;
    textoCentro(ctx, rotulo(d.dias), y, Mn(700, 50), '#eef0ea');
    y += 100;
    if (d.frase.ref) { refCarimbo(ctx, d.frase.ref, y + 30, 32, '#eef0ea'); y += altRef; }
    S.carimbo(ctx, d.frase.linhas, meio, y, tamCarimbo, { chapa: '#eef0ea', letra: '#1b1c1a' });
    S.marca(ctx, A - 250 - 70, { cor: '#c9d98f', corFraca: '#a4a99d' });
  }

  // ---------- ofensiva C: o carimbo é o herói; a contagem num cartão branco em cima ----------
  function ofensivaC(ctx, d) {
    ctx.fillStyle = '#f4f5f0';
    ctx.fillRect(0, 0, L, A);
    const est = CC.estagioDaChama(d.dias);
    // cartão da contagem: chama à esquerda, número e rótulo à direita
    const cx0 = 140;
    const cw = L - 280;
    const ch = 300;
    const tamCarimbo = S.tamanhoDoCarimbo(ctx, d.frase.linhas, 940, 640, 92);
    const mc = S.medidasDoCarimbo(ctx, d.frase.linhas, tamCarimbo);
    const altRef = d.frase.ref ? 70 : 0;
    const altura = ch + 110 + altRef + mc.altura + 80 + 70;
    let y = 250 + (1430 - 160 - altura) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(cx0, y, cw, ch, 64); ctx.fill();
    const hc = 200;
    S.chama(ctx, cx0 + 150, y + ch / 2 + hc / 2, hc, d.dias === 0, '#686b66');
    ctx.textAlign = 'left';
    ctx.font = Mn(800, 170);
    ctx.fillStyle = '#b3321a';
    ctx.fillText(String(d.dias), cx0 + 280, y + 180);
    ctx.font = Mn(700, 44);
    ctx.fillStyle = '#151615';
    ctx.fillText(rotulo(d.dias), cx0 + 284, y + 240);
    y += ch + 110;
    if (d.frase.ref) { refCarimbo(ctx, d.frase.ref, y + 10, 36, '#151615'); y += altRef; }
    S.carimbo(ctx, d.frase.linhas, meio, y, tamCarimbo, { chapa: '#151615', letra: '#f4f5f0' });
    y += mc.altura + 80;
    // o estágio numa pílula sálvia
    ctx.font = Mn(800, 36);
    const w = ctx.measureText(est.nome).width + 80;
    ctx.fillStyle = '#c8da8c';
    ctx.beginPath(); ctx.roundRect(meio - w / 2, y, w, 70, 35); ctx.fill();
    textoCentro(ctx, est.nome, y + 48, Mn(800, 36), '#151615');
    S.marca(ctx, A - 250 - 70, { cor: '#151615', corFraca: '#686b66' });
  }

  // ---------- versículo A: o cartão de antes (folha sálvia, cartão branco, aspas) ----------
  function versiculoA(ctx, d) {
    ctx.fillStyle = '#dfe8c1';
    ctx.fillRect(0, 0, L, A);
    const margem = 72;
    const recuo = 84;
    const t = S.textoEquilibrado(ctx, d.texto, { fonte: (x) => Lit(500, x), larguraMax: L - (margem + recuo) * 2, alturaMax: 760, fonteMax: 64, fonteMin: 24, entreLinhas: 1.45 });
    const altura = 64 + 56 + t.altura + 56 + 44 + (d.traducao ? 46 : 0) + 84;
    const topo = 250 + 64 + Math.max(0, (1430 - 64 - 170 - altura) / 2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(margem, topo, L - margem * 2, altura, 64); ctx.fill();
    ctx.fillStyle = '#151615';
    ctx.beginPath(); ctx.arc(meio, topo, 64, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8da8c'; ctx.font = Lit(600, 150); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('“', meio, topo + 50);
    ctx.textBaseline = 'alphabetic';
    let y = topo + 64 + 56 + t.tamanho;
    for (const l of t.linhas) { textoCentro(ctx, l, y, Lit(500, t.tamanho), '#2c2d2b'); y += t.tamanho * 1.45; }
    y = topo + 64 + 56 + t.altura + 56 + 36;
    textoCentro(ctx, d.ref, y, Mn(800, 44), '#151615');
    if (d.traducao) textoCentro(ctx, d.traducao, y + 52, Mn(600, 30), '#686b66');
    S.marca(ctx, A - 250 - 70, { cor: '#151615', corFraca: '#4f5a36' });
  }

  // ---------- versículo B: grafite, aspas grandes em sálvia ----------
  function versiculoB(ctx, d) {
    ctx.fillStyle = '#1b1c1a';
    ctx.fillRect(0, 0, L, A);
    const t = S.textoEquilibrado(ctx, d.texto, { fonte: (x) => Lit(500, x), larguraMax: 860, alturaMax: 860, fonteMax: 70, fonteMin: 24, entreLinhas: 1.42 });
    const altura = 200 + t.altura + 90 + 50 + (d.traducao ? 50 : 0);
    let y = 250 + (1430 - 160 - altura) / 2;
    textoCentro(ctx, '“', y + 250, Lit(600, 300), '#bfd083');
    y += 200;
    for (const l of t.linhas) { y += t.tamanho * 1.42; textoCentro(ctx, l, y - t.tamanho * 0.42, Lit(500, t.tamanho), '#eef0ea'); }
    y += 90;
    ctx.fillStyle = '#bfd083'; ctx.fillRect(meio - 40, y - 40, 80, 6);
    y += 40;
    textoCentro(ctx, d.ref, y, Mn(800, 44), '#c9d98f');
    if (d.traducao) textoCentro(ctx, d.traducao, y + 52, Mn(600, 30), '#a4a99d');
    S.marca(ctx, A - 250 - 70, { cor: '#eef0ea', corFraca: '#a4a99d' });
  }

  // ---------- versículo C: página de leitura, alinhado à esquerda, referência marcada ----------
  function versiculoC(ctx, d) {
    ctx.fillStyle = '#f4f5f0';
    ctx.fillRect(0, 0, L, A);
    const x = 110;
    const t = S.textoEquilibrado(ctx, d.texto, { fonte: (z) => Lit(500, z), larguraMax: L - 2 * x, alturaMax: 900, fonteMax: 76, fonteMin: 24, entreLinhas: 1.38 });
    const altura = 90 + t.altura + 70 + 70 + (d.traducao ? 50 : 0);
    let y = 250 + (1430 - 160 - altura) / 2;
    ctx.fillStyle = '#c8da8c'; ctx.fillRect(x, y, 120, 14);
    y += 90;
    ctx.textAlign = 'left';
    for (const l of t.linhas) { y += t.tamanho * 1.38; ctx.font = Lit(500, t.tamanho); ctx.fillStyle = '#151615'; ctx.fillText(l, x, y - t.tamanho * 0.38); }
    y += 70;
    ctx.font = Mn(800, 44);
    const w = ctx.measureText(d.ref).width;
    ctx.fillStyle = '#c8da8c'; ctx.fillRect(x - 10, y - 40, w + 20, 54);
    ctx.fillStyle = '#151615'; ctx.fillText(d.ref, x, y);
    if (d.traducao) { ctx.font = Mn(600, 30); ctx.fillStyle = '#686b66'; ctx.fillText(d.traducao, x, y + 56); }
    S.marca(ctx, A - 250 - 70, { cor: '#151615', corFraca: '#686b66' });
  }

  window.VARIANTES = { ofensivaA, ofensivaB, ofensivaC, versiculoA, versiculoB, versiculoC };
})();
