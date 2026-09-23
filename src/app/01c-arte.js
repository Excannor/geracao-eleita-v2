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

  // ---------- a lamparina ----------
  // A ofensiva é uma lamparina de barro, a candeia dos tempos bíblicos, com a chama no
  // bico. A imagem vem de Salmos 119.105: a Palavra é a lâmpada que ilumina o caminho.
  //
  // A chama cresce com os dias, em cinco estágios, e o barro nunca muda: a luz é o que
  // cresce, não o vaso (2Co 4.7). Quando a ofensiva zera, a lamparina não fica cinza nem
  // some: o pavio ainda fumega, com uma brasa, e o convite é reavivar (Is 42.3).
  // O estágio é só da própria pessoa: amigos e Feed nunca veem o tamanho da chama.
  // "selo" são as duas linhas do carimbo na folha da ofensiva, no tom da marca. Muda a cada
  // estágio de propósito: uma frase só, fixa, seria a mesma no primeiro dia e no ano inteiro,
  // e aí ela deixa de dizer onde a pessoa chegou.
  const ESTAGIOS = [
    { de: 0, nome: 'Reavivar', ref: 'Is 42.3', selo: ['Ainda tem brasa', 'debaixo da cinza'],
      frase: 'O pavio ainda fumega. Deus está acendendo a sua chama de novo.' },
    { de: 1, nome: 'Pavio aceso', ref: 'Lv 6.12', selo: ['A nossa geração tem lenha', 'pra queimar'],
      frase: 'A chama acendeu, e quem acendeu foi Deus. A você cabe a lenha de cada manhã.' },
    { de: 7, nome: 'Candeia', ref: 'Mt 25.4', selo: ['Não é fogo de palha', 'é azeite guardado'],
      frase: 'Pavio sozinho acende e logo apaga. O que sustenta é o azeite guardado por dentro.' },
    { de: 30, nome: 'Luz no velador', ref: 'Mt 5.15', selo: ['Essa chama', 'não se esconde'],
      frase: 'O pavio queima à vista de todos. O azeite, ninguém vê.' },
    { de: 100, nome: 'Coração ardente', ref: 'Lc 24.32', selo: ['Coração que arde', 'não volta atrás'],
      frase: 'O coração arde quando a Escritura se abre.' },
    { de: 365, nome: 'Um ano na Palavra', ref: 'Lv 6.13', selo: ['Um ano de fogo', 'que não apagou'],
      frase: 'Um ano de fogo que não se apagou sobre o altar.' },
  ];
  CC.ESTAGIOS_CHAMA = ESTAGIOS;
  CC.estagioDaChama = (dias) => {
    const n = Math.max(0, Number(dias) || 0);
    let i = 0;
    ESTAGIOS.forEach((e, k) => { if (n >= e.de) i = k; });
    const proximo = ESTAGIOS[i + 1] || null;
    return Object.assign({ nivel: i, proximo, faltam: proximo ? proximo.de - n : 0 }, ESTAGIOS[i]);
  };
  // ---------- o desenho ----------
  // Uma lamparina de barro vista de lado, com o que faz qualquer um reconhecer: o bico
  // alongado com o pavio e a chama na ponta, a barriga redonda, o furo do azeite em cima,
  // a faixa de pontinhos, a alça em argola e o pé. O mesmo desenho serve para o ícone do
  // topo e para a ilustração grande, só muda o enquadramento.
  const TAMANHO_CHAMA = [0, 0.82, 0.96, 1.08, 1.2, 1.2];

  function desenhoLamparina(nivel, opcoes = {}) {
    // o corpo de barro vira neutro; só a chama (mais abaixo) continua colorida
    const barro = '#8e8e8e', claro = '#b5b5b5', escuro = '#3a3a3a', furo = '#1a1a1a';
    const k = TAMANHO_CHAMA[nivel];
    const g = id('luz');
    let chama;
    if (k) {
      // a base da chama fica presa ao pavio, na ponta do bico (10, 26)
      const brilho = nivel >= 2
        ? '<radialGradient id="' + g + '"><stop offset="0" stop-color="#ffc83d" stop-opacity="' + (nivel >= 4 ? '.75' : '.55') + '"/><stop offset="1" stop-color="#ffc83d" stop-opacity="0"/></radialGradient>'
          + '<circle class="brilho-fogo" cx="10" cy="' + (26 - 8 * k).toFixed(1) + '" r="' + ((nivel >= 4 ? 15 : 11) * k).toFixed(1) + '" fill="url(#' + g + ')"/>'
        : '';
      chama = brilho + '<g transform="translate(10 26) scale(' + k + ')"><g class="fogo">'
        + '<path d="M0 0C-4.6 0-6.4-3.4-5.6-7-4.9-10.2-2.2-12.4-.6-16.6 1.8-13.4 5.8-10.4 5.9-6 6-2.6 3.8 0 0 0Z" fill="#ff9d1c"/>'
        + '<path d="M0 0C-2.8 0-4-2.2-3.4-4.6-2.9-6.7-1.2-8.2-.3-10.8 1.3-8.6 3.8-6.6 3.8-3.9 3.8-1.6 2.4 0 0 0Z" fill="#ffc83d"/>'
        + '<path d="M0 0C-1.3 0-1.9-1-1.6-2.2-1.3-3.2-.6-3.9-.1-5.1.6-4.1 1.8-3.2 1.8-1.9 1.8-.8 1.1 0 0 0Z" fill="#fff2c4"/>'
        + '</g></g>';
    } else {
      // apagada: o pavio ainda fumega, com uma brasa (Is 42.3)
      chama = '<path class="fumaca" d="M10 24c-3-3 2-5-1-8-2-2 1.5-4 0-7" fill="none" stroke="#8e8e8e" stroke-width="1.8" stroke-linecap="round" opacity=".75"/>'
        + '<circle class="brasa" cx="10" cy="26" r="2.2" fill="#ff9d1c"/><circle cx="10" cy="26" r="1" fill="#ffc83d"/>';
    }
    // marcas gravadas no barro, uma por estágio já alcançado na vida (só onde a pessoa se vê)
    const marcas = opcoes.marcas
      ? Array.from({ length: opcoes.marcas }, (_, i) => '<path d="M' + (21 + i * 3.4).toFixed(1) + ' 35.4l.9 2.4" stroke="' + escuro + '" stroke-width="1" stroke-linecap="round" opacity=".7"/>').join('')
      : '';
    const selo = nivel === 5
      ? '<circle cx="41" cy="14" r="5.5" fill="#3a3a3a"/><path d="M38.4 14l1.9 1.9 3.3-3.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
      : '';
    return (opcoes.sombra === false ? '' : '<ellipse cx="27" cy="44.5" rx="14" ry="1.8" fill="currentColor" opacity=".13"/>')
      + '<path d="M21 38.5h12l-1.6 4.6c-.2.6-.8 1-1.4 1h-6.4c-.6 0-1.2-.4-1.4-1z" fill="' + escuro + '"/>'
      + '<path d="M38.5 29.5c3.6-3.8 8.6-2.2 8.3 1.9-.3 3.8-4.6 5.6-8.2 4.6" fill="none" stroke="' + barro + '" stroke-width="3.2" stroke-linecap="round"/>'
      + '<path d="M8.6 27.4c3.4-.6 6.6-1.4 9.6-2.9 5.8-3 14.6-3.3 19.7.3 4.6 3.3 4.4 9.4-.6 12.6-5.6 3.6-15.6 3.4-20.8-.6-2.6-2-5-4.4-8.2-6.2-1.2-.7-1.1-2.9.3-3.2z" fill="' + barro + '"/>'
      + '<path d="M11 31c3 1.6 5.2 3.8 7.4 5.6 5.2 4 15.2 4.2 20.8.6 2.4-1.5 3.6-3.6 3.8-5.8-2.6 3.6-9.8 5.6-16.2 4.8-6.6-.8-11.2-3.4-15.8-5.2z" fill="' + escuro + '" opacity=".45"/>'
      + '<path d="M19 26.2c5-2.6 12.8-2.8 17.4.2-5-1.4-12-1.2-17.4-.2z" fill="' + claro + '"/>'
      + '<ellipse cx="29.5" cy="25.6" rx="4.2" ry="1.5" fill="' + furo + '"/>'
      + '<circle cx="22" cy="32.6" r="1" fill="' + claro + '"/><circle cx="27" cy="33.6" r="1" fill="' + claro + '"/><circle cx="32" cy="33.4" r="1" fill="' + claro + '"/><circle cx="36.4" cy="32" r="1" fill="' + claro + '"/>'
      + marcas
      + '<ellipse cx="9.4" cy="27.6" rx="1.7" ry="1.1" fill="' + furo + '"/>'
      + '<path d="M9.6 27.4l.4-1.6" stroke="#1a1a1a" stroke-width="1.6" stroke-linecap="round"/>'
      + chama + selo;
  }

  // Ilustração grande: folha da ofensiva, resumo do dia, recomeço. opcoes.recorde grava no
  // barro uma marca por estágio já alcançado na vida.
  A.lamparina = (dias, opcoes = {}) => {
    const est = CC.estagioDaChama(dias);
    const marcas = opcoes.recorde ? Math.max(0, CC.estagioDaChama(opcoes.recorde).nivel - 1) : 0;
    return '<svg class="arte-chama estagio-' + est.nivel + (est.nivel ? '' : ' apagada') + '" viewBox="-2 0 52 48" aria-hidden="true">'
      + desenhoLamparina(est.nivel, { marcas }) + '</svg>';
  };

  // A lamparina de sempre, para lugares que falam da constância sem ser a de alguém em
  // particular (marco de um amigo, propósito): tamanho fixo de Candeia, ou apagada.
  A.chama = (apagada) => A.lamparina(apagada ? 0 : 7);

  // Ícone pequeno (topo, listas, contagens): um foguinho, não a lamparina. A lamparina é um
  // desenho com corpo, pavio e alça — some quando reduzida a 20px ao lado de um número, e
  // ainda arrasta um cinza grande para dentro de uma barra que deveria ser preta e branca.
  // O fogo sozinho lê bem em qualquer tamanho. A lamparina inteira continua existindo em
  // A.lamparina, que é o desenho grande da comemoração e da folha da ofensiva.
  // Nível 0 é a chama apagada: herda a cor do texto (cinza), em vez de fingir fogo.
  const FOGO_FORA = 'M12 1.9c1.1 4.3 5.7 6.2 5.7 11.1a5.7 5.7 0 0 1-11.4 0c0-2.2 1-3.9 2.2-4.9'
    + '.1 1.8 1.1 3 2.2 3 1.3 0 2-1.9 1.2-4.6-.4-1.6-.5-3.2.1-4.6Z';
  const FOGO_DENTRO = 'M12 10.6c.5 2 2.4 2.9 2.4 5.2a2.4 2.4 0 0 1-4.8 0c0-1 .4-1.8.9-2.3'
    + '.1.8.5 1.4.9 1.4.6 0 .9-.9.6-2.2Z';
  // A chama cresce com a ofensiva, como a da lamparina: quem está no primeiro dia vê um
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
  A.lamparinaTopo = (dias) => CC.icoChama(dias);

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
      + '<span class="faixa">' + (c.maximo ? 'MÁX' : 'NÍVEL ' + Math.max(1, c.nivel)) + '</span>'
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
