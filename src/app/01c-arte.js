/* Arte e movimento: a chama grande, o baú, o calendário, medalhas e troféus desenhados em
   SVG, e as peças de animação das celebrações (confete, contagem, tela cheia). */
(function (CC) {
  'use strict';

  let serie = 0;
  const id = (nome) => nome + '-' + (++serie);
  const A = (CC.arte = {});

  // Quem pediu menos movimento no sistema vê tudo parado, já no lugar.
  CC.semMovimento = () => {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };

  // ---------- o fogo da ofensiva ----------
  // A ofensiva é um fogo que cresce com os dias, e os textos falam só de fogo, brasa e lenha
  // (a lamparina de barro de antes saiu do app). Quando a ofensiva zera, o fogo não some:
  // ainda tem brasa, e o convite é reavivar (Is 42.3).
  // O estágio é só da própria pessoa: amigos e Feed nunca veem o tamanho da chama.
  // A frase e o versículo de cada estágio aparecem no resumo da lição, quando a chama sobe.
  const ESTAGIOS = [
    { de: 0, nome: 'Reavivar', ref: 'Is 42.3',
      frase: 'Deus não apaga a chama que quase não dá luz. Ele está acendendo a sua de novo.' },
    { de: 1, nome: 'Fogo aceso', ref: 'Lv 6.12',
      frase: 'A chama acendeu, e quem acendeu foi Deus. A você cabe a lenha de cada manhã.' },
    { de: 7, nome: 'Fogo no coração', ref: 'Jr 20.9',
      frase: 'Jeremias tentou ficar calado, mas as palavras de Deus queimavam como fogo no coração dele. Uma semana lendo, e essa chama já pegou em você.' },
    { de: 30, nome: 'Luz do mundo', ref: 'Mt 5.14',
      frase: 'Um fogo aceso todo dia não fica escondido. Quem está por perto vê a luz.' },
    { de: 100, nome: 'Coração ardente', ref: 'Lc 24.32',
      frase: 'O coração arde quando a Escritura se abre.' },
    { de: 365, nome: 'Um ano na Palavra', ref: 'Lv 6.13',
      frase: 'Um ano de fogo que não se apagou sobre o altar.' },
  ];
  CC.ESTAGIOS_CHAMA = ESTAGIOS;

  // O carimbo da folha da ofensiva: uma destas frases, sorteada a cada vez que a folha abre.
  // A lista é do dono (2026-09-25), com a grafia acertada; os versículos foram conferidos na
  // NBV e na Bíblia Livre. As linhas já vêm quebradas: a Permanent Marker é larga, e cada
  // linha com até ~20 letras cabe numa tela de 320px (a que passar encolhe na hora).
  CC.FRASES_OFENSIVA = [
    { linhas: ['Direcionados', 'à santidade'], ref: '2 Timóteo 2.22' },
    { linhas: ['Somos', 'remanescentes'] },
    { linhas: ['Nele vivemos,', 'nos movemos', 'e existimos'], ref: 'Atos 17.28' },
    { linhas: ['Prepara-te,', 'Ele vem'] },
    { linhas: ['Até que', 'Ele venha'] },
    { linhas: ['Quem já foi', 'comprado', 'não se vende'] },
    { linhas: ['Atraídos pela', 'Sua presença'] },
    { linhas: ['Marcados pela', 'diferença'] },
    { linhas: ['Perseverando', 'até o fim'] },
    { linhas: ['Há esperança', 'para a árvore que,', 'se for cortada,', 'ainda se renovará'], ref: 'Jó 14.7-9' },
    { linhas: ['Jesus para', 'as nações'] },
    { linhas: ['Conhecer a Deus', 'e fazê-Lo', 'conhecido'] },
    { linhas: ['Se alguém quiser', 'vir após mim,', 'negue a si mesmo,', 'tome diariamente', 'a sua cruz', 'e siga-me'], ref: 'Lucas 9.23' },
    { linhas: ['Firmes no propósito,', 'constantes', 'na oração', 'e inabaláveis na fé'] },
    { linhas: ['O propósito de Deus', 'para a sua vida', 'é maior do que', 'qualquer obstáculo', 'no seu caminho'] },
    { linhas: ['A sua oração', 'de hoje está', 'construindo', 'o milagre de amanhã.', 'Continue firme'] },
    { linhas: ['Onde o mundo', 'vê um fim, Deus', 'escreve um', 'novo começo cheio', 'de esperança'] },
    { linhas: ['Geração', 'inconformada'] },
  ];
  // Nunca a mesma da última vez: abrir de novo e ver a mesma frase parece que não sorteou.
  let ultimaFrase = -1;
  CC.fraseDaOfensiva = () => {
    const total = CC.FRASES_OFENSIVA.length;
    let i = Math.floor(Math.random() * total);
    if (i === ultimaFrase && total > 1) i = (i + 1 + Math.floor(Math.random() * (total - 1))) % total;
    ultimaFrase = i;
    return CC.FRASES_OFENSIVA[i];
  };
  // Quebra um texto em linhas que cabem numa largura, encolhendo a letra até o bloco caber
  // também na altura: a mesma lógica do carimbo da ofensiva (começa grande, diminui aos
  // poucos), só que aqui o texto não vem pré-quebrado, então quem quebra as linhas é a
  // própria função. Pura: "medir" é quem sabe a largura de um texto num tamanho de fonte
  // (o cartão de versículo usa o canvas; o teste usa uma régua sintética).
  CC.ajustarTextoCartao = function ajustarTextoCartao(texto, {
    larguraMax, alturaMax, fonteMax, fonteMin = fonteMax * 0.35, entreLinhas = 1.25, medir,
  }) {
    const palavras = String(texto || '').split(/\s+/).filter(Boolean);
    const quebrar = (tamanho) => {
      const linhas = [];
      let atual = '';
      for (const p of palavras) {
        const tentativa = atual ? atual + ' ' + p : p;
        if (atual && medir(tentativa, tamanho) > larguraMax) { linhas.push(atual); atual = p; }
        else atual = tentativa;
      }
      if (atual) linhas.push(atual);
      return linhas;
    };
    let tamanho = fonteMax;
    let linhas = quebrar(tamanho);
    for (let i = 0; i < 40 && tamanho > fonteMin; i++) {
      const alturaBloco = linhas.length * tamanho * entreLinhas;
      const maiorLinha = Math.max(0, ...linhas.map((l) => medir(l, tamanho)));
      if (alturaBloco <= alturaMax && maiorLinha <= larguraMax) break;
      tamanho = Math.max(fonteMin, tamanho * 0.94);
      linhas = quebrar(tamanho);
    }
    return { linhas, tamanho };
  };

  CC.estagioDaChama = (dias) => {
    const n = Math.max(0, Number(dias) || 0);
    let i = 0;
    ESTAGIOS.forEach((e, k) => { if (n >= e.de) i = k; });
    const proximo = ESTAGIOS[i + 1] || null;
    return Object.assign({ nivel: i, proximo, faltam: proximo ? proximo.de - n : 0 }, ESTAGIOS[i]);
  };
  // O fogo, em qualquer tamanho (topo, folha da ofensiva, listas, contagens).
  // Nível 0 é a chama apagada: herda a cor do texto (cinza), em vez de fingir fogo.
  const FOGO_FORA = 'M12 1.9c1.1 4.3 5.7 6.2 5.7 11.1a5.7 5.7 0 0 1-11.4 0c0-2.2 1-3.9 2.2-4.9'
    + '.1 1.8 1.1 3 2.2 3 1.3 0 2-1.9 1.2-4.6-.4-1.6-.5-3.2.1-4.6Z';
  const FOGO_DENTRO = 'M12 10.6c.5 2 2.4 2.9 2.4 5.2a2.4 2.4 0 0 1-4.8 0c0-1 .4-1.8.9-2.3'
    + '.1.8.5 1.4.9 1.4.6 0 .9-.9.6-2.2Z';
  // A chama cresce com a ofensiva: quem está no primeiro dia vê um
  // fogo pequeno, quem está há um ano vê o maior. É a mesma escada de seis estágios do
  // resto do app. Cresce a partir da base (12, 21), para o fogo subir em vez de inchar.
  const ESCALA_FOGO = [0.58, 0.72, 0.84, 0.94, 1.04, 1.14];
  CC.icoChama = (dias) => {
    const nivel = dias === undefined ? 2 : CC.estagioDaChama(dias).nivel;
    const apagada = nivel === 0;
    const s = ESCALA_FOGO[nivel] || 1;
    return '<svg viewBox="0 0 24 24" class="ico-aba ico-chama estagio-' + nivel + (apagada ? ' apagada' : '') + '" aria-hidden="true">'
      // Dois grupos, de propósito: o de fora leva a escala do estágio no atributo, o de
      // dentro fica livre para a animação do CSS. Num grupo só, o transform do CSS
      // substituiria o do atributo e a chama voltaria ao mesmo tamanho em todos os níveis.
      + '<g transform="translate(12 21) scale(' + s + ') translate(-12 -21)"><g class="fogo">'
      + '<path d="' + FOGO_FORA + '" fill="' + (apagada ? 'currentColor' : '#e23d1b') + '"'
      + (apagada ? ' opacity=".45"' : '') + '/>'
      + (apagada ? '' : '<path class="miolo" d="' + FOGO_DENTRO + '" fill="#ff9d1c"/>')
      + '</g></g></svg>';
  };

  // ---------- o baú ----------
  A.bau = (estado, cor) => {
    // Baú tem cor de baú: madeira e ferragem. É uma exceção assumida na paleta, como o
    // fogo — um baú cinza ou verde não lê como baú. Os tons são menos saturados que os
    // originais para não gritar ao lado do petróleo, e ficam iguais nos dois temas.
    // A ordem clara e escura de cada estado é o que dá volume ao desenho.
    // Travado fica na madeira apagada, sem brilho de ferragem: ainda não é seu.
    const tons = {
      aberto: ['#d2a24e', '#9e7328', '#a9703c', '#7a4c27'],
      pronto: ['#d2a24e', '#9e7328', '#a9703c', '#7a4c27'],
      travado: ['#8e7b63', '#6b5a45', '#7d6650', '#5a4736'],
    }[estado] || ['#d2a24e', '#9e7328', '#a9703c', '#7a4c27'];
    if (cor === 'madeira') { tons[2] = '#b07a42'; tons[3] = '#82552b'; }
    const [ouro, ouroS, corpo, corpoS] = tons;
    // Aberto: a tampa continua sendo a mesma tampa, só que deitada para trás e achatada pela
    // perspectiva, presa na borda de cima. Antes ela virava um trapézio solto no ar, sem
    // dobradiça, que parecia um funil. Embaixo dela fica a boca escura do baú, e é de dentro
    // dessa boca que a luz sai.
    const tampa = estado === 'aberto'
      ? '<g class="tampa aberta">'
        + '<g transform="rotate(-14 60 47)">'
        + '<rect x="18" y="20" width="84" height="27" rx="9" fill="' + corpo + '"/>'
        + '<rect x="25" y="26" width="70" height="16" rx="7" fill="' + corpoS + '"/>'
        + '<rect x="32" y="20" width="10" height="27" fill="' + ouro + '"/>'
        + '<rect x="78" y="20" width="10" height="27" fill="' + ouro + '"/>'
        + '</g>'
        + '<ellipse cx="60" cy="50" rx="43" ry="8" fill="' + corpoS + '"/>'
        + '<ellipse cx="60" cy="51" rx="35" ry="5.5" fill="#1a1a1a" opacity=".75"/>'
        + '<ellipse class="brilho-bau" cx="60" cy="50" rx="20" ry="3.5" fill="#f2f2f2" opacity=".95"/>'
        + '</g>'
      : '<g class="tampa"><rect x="14" y="26" width="92" height="30" rx="10" fill="' + corpo + '"/>'
        + '<rect x="14" y="44" width="92" height="12" fill="' + corpoS + '"/>'
        + '<rect x="30" y="26" width="10" height="30" fill="' + ouro + '"/><rect x="80" y="26" width="10" height="30" fill="' + ouro + '"/></g>';
    return '<svg class="arte-bau ' + (estado || '') + '" viewBox="0 0 120 110" aria-hidden="true">'
      + '<ellipse cx="60" cy="102" rx="44" ry="7" fill="currentColor" opacity=".12"/>'
      + '<rect x="14" y="50" width="92" height="48" rx="10" fill="' + corpo + '"/>'
      + '<rect x="14" y="80" width="92" height="18" rx="8" fill="' + corpoS + '"/>'
      + '<rect x="30" y="50" width="10" height="48" fill="' + ouro + '"/><rect x="80" y="50" width="10" height="48" fill="' + ouro + '"/>'
      + tampa
      + (estado === 'aberto' ? '' : '<rect x="48" y="44" width="24" height="24" rx="7" fill="' + ouro + '"/><rect x="48" y="58" width="24" height="10" rx="4" fill="' + ouroS + '"/>'
        + '<circle cx="60" cy="54" r="4" fill="' + corpoS + '"/>')
      + '</svg>';
  };

  // ---------- calendário dos marcos de ofensiva ----------
  A.calendario = (numero, estado) => '<span class="arte-calendario ' + (estado || '') + '" aria-hidden="true">'
    + '<i class="argolas"></i><b>' + (estado === 'feito' ? CC.ico('certo') : CC.esc(numero)) + '</b></span>';

  // ---------- medalha de conquista ----------
  // Escudo arredondado com a faixa do nível: o desenho diz "subiu de nível" sem texto.
  A.medalha = (c, grande) => {
    const ganha = c.nivel > 0;
    return '<span class="arte-medalha c-' + c.cor + (ganha ? '' : ' sem-nivel') + (grande ? ' grande' : '') + '" aria-hidden="true">'
      + '<span class="escudo">' + (c.icone === 'chama' ? CC.icoChama() : CC.ico(c.icone)) + '</span>'
      + (ganha ? '<span class="faixa">' + (c.maximo ? 'MÁX' : 'NÍVEL ' + c.nivel) + '</span>' : '')
      + '</span>';
  };

  // ---------- troféu ----------
  // fracao (0 a 1) enche a copa de baixo para cima enquanto o troféu não foi ganho: a estante
  // mostra o quanto falta, e não 22 taças cinza iguais.
  A.trofeu = (cor, ganho, fracao) => {
    const f = !ganho && fracao > 0 ? Math.min(1, fracao) : 0;
    const g = f ? id('copa') : '';
    return '<span class="arte-trofeu c-' + (cor || 'amarelo') + (ganho ? ' ganho' : '') + (f ? ' parcial' : '') + '" aria-hidden="true">'
    + '<svg viewBox="0 0 64 72">' + (f ? '<defs><clipPath id="' + g + '"><rect x="0" y="' + (42 - 36 * f).toFixed(1) + '" width="64" height="' + (36 * f).toFixed(1) + '"/></clipPath></defs>' : '')
    + '<path class="copa" d="M16 6h32v18c0 10-7 18-16 18S16 34 16 24z"/>'
    + (f ? '<path class="copa-parte" clip-path="url(#' + g + ')" d="M16 6h32v18c0 10-7 18-16 18S16 34 16 24z"/>' : '')
    + '<path class="alcas" d="M16 12H8v4c0 7 4 12 10 13M48 12h8v4c0 7-4 12-10 13" fill="none" stroke-width="5" stroke-linecap="round"/>'
    + '<rect class="haste" x="28" y="40" width="8" height="12" rx="2"/>'
    + '<rect class="base" x="16" y="52" width="32" height="12" rx="4"/>'
    + '<path class="reflexo" d="M22 10h5v14c0 4 1 7 3 9-5-1-8-5-8-10z" fill="#fff" opacity=".35"/></svg></span>';
  };

  // ---------- Trilha do Semeador ----------
  // Cinco desenhos, um por nível: o broto, os troféus de bronze (ovelha), prata (rede) e ouro
  // (pães e peixes), e a igreja com gente em volta. Nível ainda não ganho aparece apagado.
  const copa = (cor, sombra) => '<ellipse cx="32" cy="67" rx="20" ry="4" fill="currentColor" opacity=".12"/>'
    + '<path d="M16 12H8v4c0 7 4 12 10 13M48 12h8v4c0 7-4 12-10 13" fill="none" stroke="' + sombra + '" stroke-width="5" stroke-linecap="round"/>'
    + '<path d="M16 6h32v18c0 10-7 18-16 18S16 34 16 24z" fill="' + cor + '"/>'
    + '<rect x="28" y="40" width="8" height="12" rx="2" fill="' + sombra + '"/>'
    + '<rect x="16" y="52" width="32" height="12" rx="4" fill="' + sombra + '"/>'
    + '<path d="M20 9h4v14c0 4 1 7 3 9-5-1-7-5-7-10z" fill="#fff" opacity=".35"/>';
  const DESENHOS_SEMEADOR = {
    broto: '<ellipse cx="32" cy="66" rx="22" ry="4" fill="currentColor" opacity=".12"/>'
      + '<path d="M10 64c3-12 41-12 44 0z" fill="#5c5c5c"/><path d="M16 60c6-5 26-5 32 0" stroke="#3a3a3a" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + '<path d="M32 58V28" stroke="#3a3a3a" stroke-width="4" stroke-linecap="round"/>'
      + '<path d="M31 42c-15 2-22-8-19-18 11-2 19 5 19 18z" fill="#8e8e8e"/>'
      + '<path d="M33 34c9-13 23-12 25-5-4 11-15 13-25 5z" fill="#b5b5b5"/>'
      + '<path d="M16 26c5 2 10 7 14 13M36 32c6-3 12-4 18-3" stroke="#3a3a3a" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>',
    // troféus de conquista: não são fogo, viram cinza; o que os diferencia agora é o
    // enfeite (ovelha, rede, pães) e não mais a cor
    bronze: copa('#8e8e8e', '#5c5c5c')
      + '<g transform="translate(32 21)"><circle cx="-5" cy="1" r="4.6" fill="#fff"/><circle cx="1" cy="-3" r="5" fill="#fff"/><circle cx="6" cy="1" r="4.4" fill="#fff"/><circle cx="1" cy="3" r="5" fill="#fff"/>'
      + '<ellipse cx="-9" cy="0" rx="3.4" ry="2.8" fill="#3a3a3a"/><rect x="-3" y="6" width="2" height="5" rx="1" fill="#3a3a3a"/><rect x="4" y="6" width="2" height="5" rx="1" fill="#3a3a3a"/></g>',
    prata: copa('#dcdcdc', '#8e8e8e')
      + '<g stroke="#5c5c5c" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M21 12l22 20M27 10l18 16M20 19l17 15M43 12L22 32M37 10L20 25M45 19L28 34"/></g>'
      + '<path d="M26 28c3-3 8-3 10 0-2 3-7 3-10 0z" fill="#8e8e8e"/><path d="M26 28l-3-2v4z" fill="#8e8e8e"/>',
    ouro: copa('#dcdcdc', '#8e8e8e')
      + '<ellipse cx="25" cy="16" rx="6" ry="4" fill="#b5b5b5"/><path d="M21.5 15.5l2-2M25 15.5l2-2M28 15.5l1.5-1.5" stroke="#5c5c5c" stroke-width="1.2" stroke-linecap="round"/>'
      + '<ellipse cx="38" cy="13" rx="5" ry="3.4" fill="#b5b5b5"/><path d="M35 12.5l2-2M38.5 12.5l1.5-1.5" stroke="#5c5c5c" stroke-width="1.2" stroke-linecap="round"/>'
      + '<path d="M27 27c4-4 10-4 13 0-3 4-9 4-13 0z" fill="#8e8e8e"/><path d="M27 27l-4-3v6z" fill="#8e8e8e"/><circle cx="36" cy="26" r="1" fill="#1a1a1a"/>',
    igreja: '<ellipse cx="32" cy="67" rx="28" ry="4" fill="currentColor" opacity=".12"/>'
      + '<path d="M14 36L32 22l18 14v28H14z" fill="#f2f2f2"/>'
      + '<path d="M10 38L32 20l22 18" fill="none" stroke="#5c5c5c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<rect x="29.5" y="3" width="5" height="15" rx="1" fill="#5c5c5c"/><rect x="25" y="7" width="14" height="4.5" rx="1" fill="#5c5c5c"/>'
      + '<circle cx="32" cy="38" r="4.5" fill="#dcdcdc"/>'
      + '<path d="M26 64V51a6 6 0 0 1 12 0v13z" fill="#1a1a1a"/>'
      + '<circle cx="7" cy="53" r="3.6" fill="#8e8e8e"/><path d="M1.5 65c0-6 2.5-8.5 5.5-8.5s5.5 2.5 5.5 8.5z" fill="#8e8e8e"/>'
      + '<circle cx="57" cy="53" r="3.6" fill="#3a3a3a"/><path d="M51.5 65c0-6 2.5-8.5 5.5-8.5s5.5 2.5 5.5 8.5z" fill="#3a3a3a"/>'
      + '<path d="M14 64c-2-6 1-10 5-12M50 64c2-6-1-10-5-12" stroke="#b5b5b5" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
      + '<circle cx="18" cy="54" r="2.4" fill="#b5b5b5"/><circle cx="46" cy="54" r="2.4" fill="#b5b5b5"/>',
  };
  A.semeador = (arte, ganho) => '<span class="arte-semeador' + (ganho ? ' ganho' : ' travado') + '" aria-hidden="true">'
    + '<svg viewBox="0 0 64 72">' + (DESENHOS_SEMEADOR[arte] || DESENHOS_SEMEADOR.broto) + '</svg></span>';

  // ---------- movimento ----------
  // Confete que cai do alto da tela: uns quarenta papéis, cada um com a sua cor e rota.
  // confete de comemoração é o "fogo" da festa: continua colorido, só que agora só com a
  // família do fogo, sem o arco-íris de antes
  const CORES_CONFETE = ['#e23d1b', '#ff4b3e', '#ff9d1c', '#ffc83d'];
  A.confete = (alvo, quantidade = 44) => {
    if (CC.semMovimento() || !alvo) return;
    const caixa = document.createElement('div');
    caixa.className = 'confete';
    caixa.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < quantidade; i++) {
      const p = document.createElement('i');
      p.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      p.style.setProperty('--desvio', ((Math.random() - 0.5) * 160).toFixed(0) + 'px');
      p.style.setProperty('--giro', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      p.style.setProperty('--atraso', (Math.random() * 0.5).toFixed(2) + 's');
      p.style.setProperty('--duracao', (1.6 + Math.random() * 1.2).toFixed(2) + 's');
      p.style.background = CORES_CONFETE[i % CORES_CONFETE.length];
      if (i % 3 === 0) p.style.borderRadius = '50%';
      caixa.appendChild(p);
    }
    alvo.appendChild(caixa);
    setTimeout(() => caixa.remove(), 3400);
  };

  // Faíscas em volta de algo que acabou de ser ganho.
  A.faiscas = () => '<span class="faiscas" aria-hidden="true">'
    + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => '<i style="--i:' + i + '"></i>').join('') + '</span>';

  // Conta de um número a outro, do jeito de placar.
  CC.contar = (el, de, ate, ms = 900, depois) => {
    if (!el) return;
    if (CC.semMovimento() || de === ate) { el.textContent = ate; if (depois) depois(); return; }
    const inicio = performance.now();
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / ms);
      const suave = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(de + (ate - de) * suave);
      if (t < 1) requestAnimationFrame(passo);
      else if (depois) depois();
    };
    requestAnimationFrame(passo);
  };

  CC.esperar = (ms) => new Promise((r) => setTimeout(r, CC.semMovimento() ? 0 : ms));

  // ---------- tela cheia ----------
  // As celebrações, o toque e o baú abrem por cima de tudo, com um botão grande embaixo.
  CC.telaCheia = (interno, opcoes = {}) => {
    const origem = document.activeElement;
    const el = document.createElement('div');
    el.className = 'tela-cheia ' + (opcoes.classe || '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    if (opcoes.rotulo) el.setAttribute('aria-label', opcoes.rotulo);
    el.innerHTML = '<div class="tela-cheia-palco">' + interno + '</div>'
      + (opcoes.pe ? '<div class="tela-cheia-pe">' + opcoes.pe + '</div>' : '');
    document.body.appendChild(el);
    const fechar = () => {
      el.classList.add('saindo');
      setTimeout(() => el.remove(), CC.semMovimento() ? 0 : 180);
      if (origem && origem.focus && document.body.contains(origem)) origem.focus();
    };
    if (opcoes.ligar) opcoes.ligar(el, fechar);
    const primeiro = el.querySelector('.tela-cheia-pe button, button');
    if (primeiro) primeiro.focus({ preventScroll: true });
    return { el, fechar };
  };
})(window.CC);
