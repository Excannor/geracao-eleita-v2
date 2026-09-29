/* O mascote e os personagens que ficam à beira da trilha.
   Tudo em SVG desenhado à mão: nenhuma imagem externa, nada que precise de rede. */
(function (CC) {
  'use strict';

  // ---------- o mascote ----------
  // Um jumentinho de carga: o animal que levou Jesus a Jerusalém. Carrega nos
  // alforjes o progresso de quem lê, e comemora cada passo dado.
  CC.MASCOTE = 'Bento';

  // Paleta em camadas: luz no alto, sombra embaixo e do lado direito.
  const C = {
    peloClaro: '#c3ccd6',
    pelo:      '#aeb9c4',
    peloSomb:  '#95a1ae',
    peloEsc:   '#7d8b99',
    crina:     '#55616e',
    focinho:   '#f6efe4',
    focinhoS:  '#e6dacb',
    orelha:    '#dda3ae',
    orelhaS:   '#c98f9c',
    casco:     '#4e5964',
    alforje:   '#c96a45',
    alforjeS:  '#a94f30',
    alforjeT:  '#8f4028',
    correia:   '#7a4a30',
    fivela:    '#efc64c',
    tinta:     '#2f2b38',
  };

  function olhosMascote(humor) {
    if (humor === 'feliz' || humor === 'comemora') {
      return '<g fill="none" stroke="' + C.tinta + '" stroke-width="7" stroke-linecap="round">'
        + '<path d="M68 92q14-16 28 0"/><path d="M124 92q14-16 28 0"/></g>';
    }
    if (humor === 'dormindo') {
      return '<g fill="none" stroke="' + C.tinta + '" stroke-width="7" stroke-linecap="round">'
        + '<path d="M68 88q14 14 28 0"/><path d="M124 88q14 14 28 0"/></g>';
    }
    // olhos abertos, grandes, com dois brilhos
    return '<g>'
      + '<ellipse cx="82" cy="88" rx="14" ry="15.5" fill="#fff"/>'
      + '<ellipse cx="138" cy="88" rx="14" ry="15.5" fill="#fff"/>'
      + '<circle cx="84" cy="89" r="10.5" fill="' + C.tinta + '"/>'
      + '<circle cx="140" cy="89" r="10.5" fill="' + C.tinta + '"/>'
      + '<circle cx="88" cy="84" r="4" fill="#fff"/>'
      + '<circle cx="144" cy="84" r="4" fill="#fff"/>'
      + '<circle cx="80" cy="95" r="2" fill="#fff" opacity=".7"/>'
      + '<circle cx="136" cy="95" r="2" fill="#fff" opacity=".7"/>'
      + '</g>';
  }

  function bocaMascote(humor) {
    if (humor === 'comemora') {
      return '<path d="M96 143c0-3 4-4 14-4s14 1 14 4c0 11-6 19-14 19s-14-8-14-19z" fill="#9c5560"/>'
        + '<path d="M99 142q11 5 22 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'
        + '<path d="M104 156q6 5 12 0" fill="#e0808c"/>';
    }
    return '<path d="M100 142q10 8 20 0" fill="none" stroke="#a08b74" stroke-width="4" stroke-linecap="round"/>';
  }

  // O desenho em si. Sai daqui como texto de SVG para quem precisa do desenho cru; quem põe
  // o Bento na tela usa CC.mascoteSvg, que o entrega como imagem.
  function mascoteDesenho(humor = 'parado') {
    // Na comemoração as orelhas sobem: é o que um jumento de verdade faz.
    const comemora = humor === 'comemora';
    const giroE = comemora ? -30 : -17;
    const giroD = comemora ? 30 : 17;
    return '<svg viewBox="0 0 220 250" class="mascote-svg"'
      + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'

      // ---------- sombra no chão ----------
      + '<ellipse cx="110" cy="236" rx="62" ry="10" fill="#000" opacity=".16"/>'

      // Sem rabo: visto de frente, um jumento não mostra o rabo, e o que havia aqui
      // saía da lateral na altura do ombro e descia com um tufo escuro na ponta,
      // exatamente onde um braço com mão estaria.

      // ---------- orelhas ----------
      + '<g>'
      + '<g transform="rotate(' + (giroE + 17) + ' 84 62)">'
      + '<path d="M78 62C64 40 54 16 62 8c9-9 22 10 28 34z" fill="' + C.peloSomb + '"/>'
      + '<path d="M79 56C69 40 62 22 66 17c5-6 14 9 19 28z" fill="' + C.orelha + '"/></g>'
      + '<g transform="rotate(' + (giroD - 17) + ' 136 62)">'
      + '<path d="M142 62c14-22 24-46 16-54-9-9-22 10-28 34z" fill="' + C.peloSomb + '"/>'
      + '<path d="M141 56c10-16 17-34 13-39-5-6-14 9-19 28z" fill="' + C.orelhaS + '"/></g>'
      + '</g>'

      // A correia vem antes do corpo: ela passa por cima do lombo, e atravessando o
      // peito era lida como um par de braços segurando alguma coisa.
      + '<path d="M60 160h100v10H60z" fill="' + C.correia + '"/>'

      // ---------- corpo, em forma de pera ----------
      + '<path d="M110 132c-30 0-48 20-48 48 0 22 20 36 48 36s48-14 48-36c0-28-18-48-48-48z" fill="' + C.pelo + '"/>'
      + '<path d="M110 132c30 0 48 20 48 48 0 22-20 36-48 36z" fill="' + C.peloSomb + '"/>'
      + '<ellipse cx="108" cy="182" rx="30" ry="26" fill="' + C.peloClaro + '" opacity=".6"/>'

      // Jumento não tem braço: quem comemora aqui são as orelhas, a boca e o pulo
      // que o CSS dá na figura inteira.

      // ---------- alforjes ----------
      // Baixos, largos e encostados no lombo. Altos e estreitos, como estavam, eles
      // eram lidos como dois braços pendurados quando a figura ficava pequena.
      + '<path d="M46 168h40v22c0 7-9 12-20 12s-20-5-20-12z" fill="' + C.alforje + '"/>'
      + '<path d="M46 168h40v8H46z" fill="' + C.alforjeS + '"/>'
      + '<path d="M66 168h20v22c0 7-9 12-20 12z" fill="' + C.alforjeT + '" opacity=".38"/>'
      + '<circle cx="66" cy="184" r="4" fill="' + C.fivela + '"/>'
      + '<path d="M134 168h40v22c0 7-9 12-20 12s-20-5-20-12z" fill="' + C.alforje + '"/>'
      + '<path d="M134 168h40v8h-40z" fill="' + C.alforjeS + '"/>'
      + '<path d="M154 168h20v22c0 7-9 12-20 12z" fill="' + C.alforjeT + '" opacity=".48"/>'
      + '<circle cx="154" cy="184" r="4" fill="' + C.fivela + '"/>'

      // ---------- patas ----------
      // Finas, retas e por baixo do corpo. Largas e penduradas na frente, elas eram
      // lidas como bracinhos, e jumento não tem braço.
      + '<path d="M93 196c-6 0-10 5-10 12v17c0 6 4 11 10 11s10-5 10-11v-17c0-7-4-12-10-12z" fill="' + C.peloSomb + '"/>'
      + '<path d="M127 196c-6 0-10 5-10 12v17c0 6 4 11 10 11s10-5 10-11v-17c0-7-4-12-10-12z" fill="' + C.peloEsc + '"/>'
      + '<path d="M83 224h20v1c0 6-4 11-10 11s-10-5-10-11z" fill="' + C.casco + '"/>'
      + '<path d="M117 224h20v1c0 6-4 11-10 11s-10-5-10-11z" fill="' + C.casco + '"/>'

      // ---------- cabeça ----------
      + '<path d="M110 36C80 36 60 58 60 88c0 16 3 30 10 41 9 14 24 22 40 22s31-8 40-22c7-11 10-25 10-41 0-30-20-52-50-52z" fill="' + C.pelo + '"/>'
      + '<path d="M110 36c30 0 50 22 50 52 0 16-3 30-10 41-9 14-24 22-40 22z" fill="' + C.peloSomb + '" opacity=".55"/>'
      + '<path d="M110 44c-22 0-38 14-42 36 8-16 23-24 42-24s34 8 42 24c-4-22-20-36-42-36z" fill="' + C.peloClaro + '" opacity=".8"/>'

      // ---------- crina ----------
      + '<path d="M84 52c2-14 6-24 12-30 2 6 3 11 3 16 4-8 8-13 11-16 3 3 7 8 11 16 0-5 1-10 3-16 6 6 10 16 12 30-8-10-19-15-26-15s-18 5-26 15z" fill="' + C.crina + '"/>'

      // ---------- focinho ----------
      + '<path d="M110 108c-22 0-36 10-36 24s14 24 36 24 36-10 36-24-14-24-36-24z" fill="' + C.focinho + '"/>'
      + '<path d="M110 108c22 0 36 10 36 24s-14 24-36 24z" fill="' + C.focinhoS + '" opacity=".6"/>'
      + '<path d="M94 124c-5 0-8 3-8 7s3 6 7 6 7-3 7-7-2-6-6-6z" fill="#8b7a68"/>'
      + '<path d="M126 124c5 0 8 3 8 7s-3 6-7 6-7-3-7-7 2-6 6-6z" fill="#8b7a68"/>'
      + bocaMascote(humor)

      // ---------- bochechas ----------
      + '<ellipse cx="68" cy="116" rx="10" ry="7" fill="' + C.orelha + '" opacity=".5"/>'
      + '<ellipse cx="152" cy="116" rx="10" ry="7" fill="' + C.orelha + '" opacity=".42"/>'

      // ---------- sobrancelhas e olhos ----------
      + (humor === 'comemora'
        ? '<g fill="none" stroke="' + C.crina + '" stroke-width="5" stroke-linecap="round">'
          + '<path d="M70 68q12-8 22-2"/><path d="M150 68q-12-8-22-2"/></g>'
        : '')
      + olhosMascote(humor)
      + '</svg>';
  }

  // O Bento vai para a tela como imagem, não como SVG solto no documento. Navegador que
  // escurece sites por conta própria (o do Android, o Samsung Internet) reescreve as cores
  // do que está no documento e clareia o que é escuro: a pupila do Bento sumia e ele ficava
  // com cara de cego. Imagem esses navegadores não mexem. O desenho é o mesmo.
  CC.mascoteDesenho = mascoteDesenho;
  CC.mascoteSvg = function (humor = 'parado', extra) {
    const fonte = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mascoteDesenho(humor));
    return '<img class="mascote-svg" src="' + fonte + '" alt="" aria-hidden="true"'
      + (extra ? ' ' + extra : '') + '>';
  };

  // ---------- o que o mascote diz ----------
  // Frases curtas, no tom de quem caminha junto. Nada que cobre ou culpe quem parou, e
  // o Bento nunca fala em nome de Deus.
  const FALAS = {
    primeiroDia: [
      'Seu primeiro dia é {passagem}. Leva de 10 a 20 minutos. Bora?',
    ],
    comecando: [
      'Hoje tem {passagem}. Vamos?',
      'Um capítulo de cada vez. Bora começar?',
      'Seu passo de hoje: {passagem}.',
    ],
    emDia: [
      'Lição de hoje feita! Mais um dia guardado.',
      'Mandou bem hoje. Até amanhã!',
      'Passo dado é passo que não se perde.',
    ],
    ofensiva: [
      '{n} dias seguidos! A leitura está virando hábito.',
      '{n} dias de estrada. Olha até onde chegamos!',
    ],
    voltando: [
      'Que bom te ver! Vamos recomeçar hoje?',
      'A estrada esperou por você. O plano continua de onde parou.',
    ],
    quaseLa: [
      'Faltam poucos dias para fechar esta unidade. Bora?',
    ],
  };

  const sorteio = (lista, semente) => lista[semente % lista.length];

  // A frase muda por dia, não a cada toque: um mascote que tagarela cansa. Quando um
  // amigo já leu e você ainda não, é isso que ele conta.
  CC.falaMascote = function (amigos) {
    const seq = CC.sequencia();
    const lidos = CC.ler('lidos', []).length;
    const hoje = CC.hojeIso();
    const semente = Number(hoje.slice(8, 10)) + Number(hoje.slice(5, 7));
    const atual = CC.diaAtual();
    const passagem = CC.passagemDe(CC.D.plano[atual - 1]).replace(' · ', ' e ');
    const trocar = (t) => t.replace('{passagem}', passagem).replace('{n}', seq.atual);

    if (!lidos) return trocar(FALAS.primeiroDia[0]);
    const leuAmigo = ((amigos && amigos.amigos) || []).find((a) => a.leuHoje);
    if (!seq.feitoHoje && leuAmigo) return leuAmigo.nome + ' já leu hoje. Sua vez!';
    if (!seq.feitoHoje && seq.atual === 0) return trocar(sorteio(FALAS.voltando, semente));

    const u = CC.unidadeDoDia(atual);
    const p = CC.progressoUnidade(u);
    if (!seq.feitoHoje && p.total - p.feitos <= 3 && p.feitos > 0) return trocar(sorteio(FALAS.quaseLa, semente));

    if (seq.feitoHoje) return trocar(sorteio(seq.atual >= 3 ? FALAS.ofensiva : FALAS.emDia, semente));
    return trocar(sorteio(FALAS.comecando, semente));
  };

  // ---------- personagens à beira da trilha ----------
  // Figura base no padrão que serviu de referência: cabeça grande com lenço e faixa
  // na testa, rosto expressivo, túnica em duas camadas, faixa na cintura com a ponta
  // caída, manto na diagonal e sandálias. Cada personagem muda cor, cabelo, pose e
  // o objeto que carrega. Desenhar assim mantém os vinte e dois coerentes entre si
  // e o arquivo pequeno: o aplicativo continua sendo um HTML só.
  function pessoa(o) {
    const pele    = o.pele    || '#f0a882';
    const peleS   = o.peleS   || '#d98e68';
    const cabelo  = o.cabelo  || '#8a8a8a';
    const cabeloS = o.cabeloS || '#6e6e6e';
    const fora    = o.fora;
    const foraS   = o.foraS;
    const dentro  = o.dentro  || '#ded3bc';
    const cinto   = o.cinto   || '#7a5236';
    const cintoS  = o.cintoS  || '#63412a';
    const pano    = o.pano    || '#cfc4a8';
    const panoS   = o.panoS   || '#bdb193';

    const mao = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r="13" fill="' + pele + '"/>';
    const bracos = {
      baixoE: '<path d="M62 132c-11 1-17 10-16 22l4 34c1 9 8 14 16 13s13-8 12-17l-4-34c-1-12-5-19-12-18z" fill="' + fora + '"/>' + mao(64, 196),
      baixoD: '<path d="M138 132c11 1 17 10 16 22l-4 34c-1 9-8 14-16 13s-13-8-12-17l4-34c1-12 5-19 12-18z" fill="' + foraS + '"/>' + mao(136, 196),
      erguidoD: '<path d="M146 128c10-5 20 0 24 11l13 33c3 9-2 17-10 20s-16-2-19-11l-13-33c-3-11-1-16 5-20z" fill="' + foraS + '"/>' + mao(160, 138),
      erguidoE: '<path d="M54 128c-10-5-20 0-24 11l-13 33c-3 9 2 17 10 20s16-2 19-11l13-33c3-11-1-16-5-20z" fill="' + fora + '"/>' + mao(40, 138),
      frenteE: '<path d="M62 132c-11 1-17 10-16 22l3 24c1 9 8 14 16 13s13-8 12-17l-3-24c-1-12-5-19-12-18z" fill="' + fora + '"/>' + mao(66, 186),
      frenteD: '<path d="M138 132c11 1 17 10 16 22l-3 24c-1 9-8 14-16 13s-13-8-12-17l3-24c1-12 5-19 12-18z" fill="' + foraS + '"/>' + mao(134, 186),
    };
    const bE = o.bracoEsq === 'erguido' ? bracos.erguidoE
      : (o.bracoEsq === 'frente' ? bracos.frenteE : bracos.baixoE);
    const bD = o.bracoDir === 'erguido' ? bracos.erguidoD
      : (o.bracoDir === 'frente' ? bracos.frenteD : bracos.baixoD);

    return '<svg viewBox="0 0 200 270" xmlns="http://www.w3.org/2000/svg">'
      + '<ellipse cx="100" cy="258" rx="54" ry="7" fill="#000" opacity=".13"/>'
      + (o.atras || '')

      // pernas e sandálias
      + '<path d="M80 210h16v30H80zM104 210h16v30h-16z" fill="' + pele + '"/>'
      + '<path d="M70 240h32c3 0 5 2 5 5s-2 6-5 6H70c-3 0-5-3-5-6s2-5 5-5z" fill="' + cinto + '"/>'
      + '<path d="M98 240h32c3 0 5 2 5 5s-2 6-5 6H98c-3 0-5-3-5-6s2-5 5-5z" fill="' + cintoS + '"/>'
      + '<path d="M74 236h24v6H74zM102 236h24v6h-24z" fill="' + cintoS + '"/>'

      // túnica interna
      + '<path d="M100 120c-16 0-26 8-28 24l-8 66c-1 8 4 14 12 14h48c8 0 13-6 12-14l-8-66c-2-16-12-24-28-24z" fill="' + dentro + '"/>'
      + bD
      // túnica externa
      + '<path d="M100 118c-23 0-37 11-40 30l-9 62c-2 10 5 18 15 18h20V118zM100 118c23 0 37 11 40 30l9 62c2 10-5 18-15 18h-20V118z" fill="' + fora + '"/>'
      + '<path d="M100 118c23 0 37 11 40 30l9 62c2 10-5 18-15 18h-20z" fill="' + foraS + '"/>'
      + '<path d="M74 150c-3 22-5 46-4 70M126 150c3 22 5 46 4 70" stroke="' + foraS + '" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>'
      // manto na diagonal
      + (o.semManto ? ''
        : '<path d="M78 118l-8 96 16 4 14-96z" fill="' + cinto + '"/>'
          + '<path d="M84 118l-8 96 10 3 12-99z" fill="' + cintoS + '" opacity=".5"/>')
      // faixa na cintura
      + '<path d="M62 166h76c3 0 5 2 5 6v10c0 4-2 6-5 6H62c-3 0-5-2-5-6v-10c0-4 2-6 5-6z" fill="' + cinto + '"/>'
      + '<path d="M100 166h38c3 0 5 2 5 6v10c0 4-2 6-5 6h-38z" fill="' + cintoS + '" opacity=".55"/>'
      + '<path d="M112 188h14l-3 26c0 3-3 5-6 5s-6-2-6-5z" fill="' + cinto + '"/>'
      + '<path d="M118 188h8l-2 26c0 3-2 5-4 5z" fill="' + cintoS + '" opacity=".6"/>'
      + bE
      + (o.naMao || '')

      // cabeça
      + '<path d="M100 26c-31 0-52 22-52 52 0 30 23 52 52 52s52-22 52-52c0-30-21-52-52-52z" fill="' + pele + '"/>'
      + '<path d="M100 26c31 0 52 22 52 52 0 30-23 52-52 52z" fill="' + peleS + '" opacity=".22"/>'
      // barba
      + (o.semBarba ? ''
        : '<path d="M52 74c-2 22 2 40 12 52 9 11 21 16 36 16s27-5 36-16c10-12 14-30 12-52-4 20-14 30-26 33-4 10-12 15-22 15s-18-5-22-15c-12-3-22-13-26-33z" fill="' + cabelo + '"/>'
          + '<path d="M100 142c10 0 18-5 22-15 12-3 22-13 26-33 2 22-2 40-12 52-9 11-21 16-36 16z" fill="' + cabeloS + '" opacity=".45"/>')
      // lenço de cabeça, com a faixa na testa: mais baixa, ela virava uma venda
      + (o.cabeca || (
        '<path d="M44 60c0-26 24-44 56-44s56 18 56 44v6H44z" fill="' + pano + '"/>'
        + '<path d="M100 16c32 0 56 18 56 44v6h-56z" fill="' + panoS + '"/>'
        + '<path d="M44 52c-7 28-5 58 1 78 5-26 5-54-1-78z" fill="' + panoS + '"/>'
        + '<path d="M156 52c7 28 5 58-1 78-5-26-5-54 1-78z" fill="' + panoS + '"/>'
        + '<path d="M42 50h116v15c0 4-3 7-7 7H49c-4 0-7-3-7-7z" fill="' + cinto + '"/>'
        + '<path d="M100 50h58v15c0 4-3 7-7 7h-51z" fill="' + cintoS + '" opacity=".5"/>'))
      // sobrancelhas, olhos, nariz, bochechas e boca
      + '<g fill="none" stroke="' + cabeloS + '" stroke-width="6.5" stroke-linecap="round">'
      + '<path d="M67 84q13-10 25-3"/><path d="M133 84q-13-10-25-3"/></g>'
      + '<ellipse cx="80" cy="96" rx="13" ry="15" fill="#fff"/>'
      + '<ellipse cx="120" cy="96" rx="13" ry="15" fill="#fff"/>'
      + '<circle cx="82" cy="97" r="9.5" fill="#4a3524"/>'
      + '<circle cx="122" cy="97" r="9.5" fill="#4a3524"/>'
      + '<circle cx="82" cy="97" r="5" fill="#2a1d13"/>'
      + '<circle cx="122" cy="97" r="5" fill="#2a1d13"/>'
      + '<circle cx="85" cy="92" r="3.6" fill="#fff"/>'
      + '<circle cx="125" cy="92" r="3.6" fill="#fff"/>'
      + '<ellipse cx="100" cy="110" rx="7" ry="6" fill="' + peleS + '"/>'
      + '<ellipse cx="66" cy="110" rx="9" ry="6" fill="#e98c7a" opacity=".55"/>'
      + '<ellipse cx="134" cy="110" rx="9" ry="6" fill="#e98c7a" opacity=".5"/>'
      + (o.bocaFechada
        ? '<path d="M90 124q10 8 20 0" fill="none" stroke="#b5553f" stroke-width="4" stroke-linecap="round"/>'
        : '<path d="M86 120c0-3 6-4 14-4s14 1 14 4c0 10-6 17-14 17s-14-7-14-17z" fill="#c2412f"/>'
          + '<path d="M92 130q8 8 16 0c0 5-4 8-8 8s-8-3-8-8z" fill="#ef7f78"/>')
      + (o.frente || '')
      + '</svg>';
  }

  const PERSONAGENS = {
    'Noé': () => pessoa({
      fora:'#6e7d4a', foraS:'#5a6839', dentro:'#ded3bc', cinto:'#7a5236', cintoS:'#63412a',
      pano:'#cfc4a8', panoS:'#bdb193', cabelo:'#8a8a8a', cabeloS:'#6e6e6e',
      bracoEsq:'erguido',
      naMao:'<g><rect x="28" y="96" width="12" height="62" rx="5" fill="#8a5a3a"/>'
        + '<path d="M12 78h44c5 0 8 4 8 9v14c0 5-3 9-8 9H12c-5 0-8-4-8-9V87c0-5 3-9 8-9z" fill="#5d6168"/>'
        + '<path d="M34 78h22c5 0 8 4 8 9v14c0 5-3 9-8 9H34z" fill="#484c52"/></g>',
      frente:'<g><ellipse cx="164" cy="122" rx="16" ry="13" fill="#f4f2ee"/>'
        + '<circle cx="173" cy="112" r="10" fill="#fff"/>'
        + '<circle cx="177" cy="110" r="2" fill="#2a1d13"/>'
        + '<path d="M183 113l8 3-8 3z" fill="#e8a33a"/></g>',
    }),
    'Moisés': () => pessoa({
      fora:'#a8492f', foraS:'#8c3b25', dentro:'#e6dcc6', cinto:'#6f4a2e', cintoS:'#573820',
      pano:'#d8cdb4', panoS:'#c4b89c', cabelo:'#e8e4dc', cabeloS:'#cfcac0',
      bracoDir:'erguido',
      atras:'<g><path d="M8 128h34c5 0 9 4 9 10v76H8z" fill="#c2bbab"/>'
        + '<path d="M8 128a17 17 0 0 1 34 0" fill="#c2bbab"/>'
        + '<path d="M30 112c8 3 12 10 12 16v86H30z" fill="#a9a293"/>'
        + '<g stroke="#8b8478" stroke-width="4" stroke-linecap="round">'
        + '<path d="M16 146h18M16 160h18M16 174h18M16 188h14"/></g></g>',
    }),
    'Josué': () => pessoa({
      fora:'#3f6f9e', foraS:'#325a82', dentro:'#dbe4ee', cinto:'#4a3a2a', cintoS:'#3a2d20',
      pano:'#7d9cbe', panoS:'#6a86a5', cabelo:'#3d3a36', cabeloS:'#2c2a27',
      bracoEsq:'erguido',
      naMao:'<g><path d="M18 96l34-16v22l-34 12z" fill="#e0b352"/>'
        + '<path d="M18 96l34-16v11l-34 13z" fill="#f0cd7e"/>'
        + '<rect x="46" y="92" width="14" height="14" rx="6" fill="#c99a3e"/></g>',
    }),
    'Davi': () => pessoa({
      fora:'#7a4f9e', foraS:'#633f82', dentro:'#e0d6ea', cinto:'#4e3168', cintoS:'#3d2552',
      pano:'#9a76bc', panoS:'#83609f', cabelo:'#5a3f2a', cabeloS:'#46301f',
      bracoEsq:'frente', bracoDir:'frente',
      atras:'<g><path d="M14 130c26 10 34 48 34 92" stroke="#e0b352" stroke-width="12" fill="none" stroke-linecap="round"/>'
        + '<path d="M14 130v92h34" stroke="#c99a3e" stroke-width="10" fill="none" stroke-linecap="round"/>'
        + '<g stroke="#f7e7b4" stroke-width="2.6"><path d="M22 142v78M30 154v66M38 170v50"/></g></g>',
    }),
    'Salomão': () => pessoa({
      fora:'#c9a227', foraS:'#a8871c', dentro:'#f2e6c2', cinto:'#8a6e15', cintoS:'#6e5810',
      pano:'#e0c04a', panoS:'#c9a838', cabelo:'#4a4038', cabeloS:'#372f29',
      cabeca:'<g><path d="M48 62c0-24 22-42 52-42s52 18 52 42v4H48z" fill="#7a4f9e"/>'
        + '<path d="M100 20c30 0 52 18 52 42v4h-52z" fill="#633f82"/>'
        + '<path d="M44 38h112l-10 26H54z" fill="#efc64c"/>'
        + '<path d="M44 38l10-26 16 16 30-22 30 22 16-16 10 26z" fill="#f5d76e"/>'
        + '<circle cx="72" cy="30" r="5" fill="#c2412f"/><circle cx="128" cy="30" r="5" fill="#3f7ea3"/>'
        + '<circle cx="100" cy="20" r="6" fill="#c2412f"/></g>',
    }),
    'Ester': () => pessoa({
      fora:'#b8477a', foraS:'#9a3763', dentro:'#f0dce6', cinto:'#7c3050', cintoS:'#632541',
      pano:'#d9739e', panoS:'#c2417a', cabelo:'#3a2820', cabeloS:'#2a1c16',
      semBarba:true, bocaFechada:true, bracoEsq:'frente', bracoDir:'frente',
      cabeca:'<g><path d="M46 84c-3-30 20-56 54-56s57 26 54 56c-6-28-27-46-54-46S52 56 46 84z" fill="#3a2820"/>'
        + '<path d="M44 82c-7 30-5 60 2 80 5-24 5-52-2-80zM156 82c7 30 5 60-2 80-5-24-5-52 2-80z" fill="#2f2019"/>'
        + '<path d="M60 46h80l-7 14H67z" fill="#efc64c"/>'
        + '<circle cx="100" cy="36" r="8" fill="#efc64c"/><circle cx="100" cy="36" r="3.5" fill="#c2412f"/></g>',
    }),
    'Jó': () => pessoa({
      fora:'#8a8578', foraS:'#6e695e', dentro:'#ddd8cc', cinto:'#57534a', cintoS:'#443f38',
      pano:'#a8a294', panoS:'#948e80', cabelo:'#dcd6ca', cabeloS:'#c4beb2',
      bracoEsq:'frente',
      naMao:'<path d="M62 74c10 0 10 14 0 14s-10 0-10 12v122" stroke="#8a6a4a" stroke-width="9" fill="none" stroke-linecap="round"/>',
    }),
    'Paulo': () => pessoa({
      fora:'#3f7a6e', foraS:'#325f56', dentro:'#dae8e4', cinto:'#2a4d44', cintoS:'#1f3b34',
      pano:'#6f9e93', panoS:'#5b857b', cabelo:'#4a4038', cabeloS:'#372f29',
      bracoEsq:'frente', bracoDir:'frente',
      frente:'<g><rect x="58" y="176" width="84" height="20" rx="10" fill="#f2e8d2"/>'
        + '<rect x="58" y="176" width="12" height="20" rx="6" fill="#d4c5a4"/>'
        + '<rect x="130" y="176" width="12" height="20" rx="6" fill="#d4c5a4"/>'
        + '<path d="M78 183h44M78 190h34" stroke="#b0a078" stroke-width="2.6" stroke-linecap="round"/></g>',
    }),
    'Isaías': () => pessoa({
      fora:'#4a5aa0', foraS:'#3a4780', dentro:'#dcdff0', cinto:'#2e3760', cintoS:'#232a4a',
      pano:'#7b87c0', panoS:'#6672a8', cabelo:'#e2dcd2', cabeloS:'#cac4b9',
      bracoDir:'erguido',
      frente:'<g><circle cx="162" cy="120" r="14" fill="#e8763a"/>'
        + '<circle cx="162" cy="120" r="7" fill="#f6c445"/>'
        + '<path d="M162 100c3 6 3 9 0 12-3-3-3-6 0-12z" fill="#f6c445" opacity=".85"/></g>',
    }),
    'Jeremias': () => pessoa({
      fora:'#5f6480', foraS:'#4b4f66', dentro:'#d8dae4', cinto:'#3f4255', cintoS:'#313344',
      pano:'#8f94ac', panoS:'#7a7f96', cabelo:'#b9b2a4', cabeloS:'#a29b8e',
      bracoEsq:'frente', bracoDir:'frente',
      frente:'<path d="M126 108c5 8 8 12 8 16a8 8 0 0 1-16 0c0-4 3-8 8-16z" fill="#5aa9d6"/>',
    }),
    'Ezequiel': () => pessoa({
      fora:'#6a4f8e', foraS:'#553f73', dentro:'#ddd4ea', cinto:'#42305c', cintoS:'#332548',
      pano:'#9a7fbc', panoS:'#8469a5', cabelo:'#c9c2b6', cabeloS:'#b0a99d',
      bracoEsq:'erguido', bracoDir:'erguido',
      atras:'<g><circle cx="100" cy="150" r="46" fill="none" stroke="#c9a227" stroke-width="9" opacity=".55"/>'
        + '<circle cx="100" cy="150" r="26" fill="none" stroke="#e8c547" stroke-width="8" opacity=".5"/></g>',
    }),
    'Daniel': () => pessoa({
      fora:'#2f6180', foraS:'#254e67', dentro:'#d6e4ec', cinto:'#1f4154', cintoS:'#173242',
      pano:'#5e93b0', panoS:'#4e7e99', cabelo:'#3d3a36', cabeloS:'#2c2a27',
      bracoEsq:'frente', bracoDir:'frente',
      frente:'<g><ellipse cx="34" cy="228" rx="28" ry="20" fill="#d9a23f"/>'
        + '<path d="M34 180c-18 0-30 12-30 28s12 28 30 28 30-12 30-28-12-28-30-28z" fill="#c98d2e"/>'
        + '<circle cx="34" cy="206" r="19" fill="#f0cf8a"/>'
        + '<circle cx="27" cy="202" r="3" fill="#2c2a33"/><circle cx="41" cy="202" r="3" fill="#2c2a33"/>'
        + '<ellipse cx="34" cy="211" rx="5" ry="3.6" fill="#8a6a3a"/>'
        + '<path d="M29 216q5 4 10 0" stroke="#8a6a3a" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>',
    }),
    'João': () => pessoa({
      fora:'#b9bec8', foraS:'#9aa0ac', dentro:'#eef0f4', cinto:'#7f8899', cintoS:'#68707f',
      pano:'#d2d6de', panoS:'#bcc1cb', cabelo:'#f2eee6', cabeloS:'#dcd7cd',
      bracoEsq:'frente', bracoDir:'frente',
      frente:'<g><path d="M58 168h84v40H58z" fill="#f2e8d2"/>'
        + '<path d="M100 168v40" stroke="#d4c5a4" stroke-width="5"/>'
        + '<path d="M58 168c0-7 84-7 84 0" fill="none" stroke="#d4c5a4" stroke-width="5"/>'
        + '<path d="M68 180h22M68 190h22M110 180h22M110 190h22" stroke="#b0a078" stroke-width="2.6" stroke-linecap="round"/></g>',
    }),
    'Abraão': () => pessoa({
      fora:'#9a7a52', foraS:'#7e6241', dentro:'#e8dcc4', cinto:'#5f4a30', cintoS:'#4a3924',
      pano:'#c2a878', panoS:'#ab9264', cabelo:'#e4e0d6', cabeloS:'#ccc7bb',
      bracoDir:'erguido',
      atras:'<g fill="#f6e6a8"><circle cx="24" cy="40" r="5"/><circle cx="52" cy="24" r="4"/>'
        + '<circle cx="168" cy="34" r="5"/><circle cx="142" cy="18" r="3.5"/><circle cx="186" cy="62" r="4"/>'
        + '<circle cx="16" cy="76" r="3.5"/></g>',
    }),
    'Sara': () => pessoa({
      fora:'#d8c49a', foraS:'#bda87e', dentro:'#f2e8d4', cinto:'#8a6e4a', cintoS:'#6f5738',
      pano:'#e6d6b2', panoS:'#cfbd96', cabelo:'#d8d2c6', cabeloS:'#bfb9ad',
      semBarba:true, bracoEsq:'frente',
      cabeca:'<g><path d="M46 80c-3-28 20-52 54-52s57 24 54 52c-6-26-27-42-54-42S52 54 46 80z" fill="#c9c2b6"/>'
        + '<path d="M44 78c-7 28-5 56 2 74 5-22 5-48-2-74zM156 78c7 28 5 56-2 74-5-22-5-48 2-74z" fill="#b3ada0"/>'
        + '<path d="M42 50h116v15c0 4-3 7-7 7H49c-4 0-7-3-7-7z" fill="#8a6e4a"/></g>',
    }),
    'José': () => pessoa({
      fora:'#3f7ea3', foraS:'#325f7d', dentro:'#f2e2c4', cinto:'#8a4f2f', cintoS:'#6d3c23',
      pano:'#d8a04a', panoS:'#bd8a3a', cabelo:'#3c2d24', cabeloS:'#2a1f19',
      bocaFechada:true, bracoEsq:'frente', bracoDir:'frente', semManto:true,
      frente:'<g opacity=".9"><path d="M62 140h76v9H62z" fill="#c2412f"/>'
        + '<path d="M60 154h80v9H60z" fill="#e0b352"/>'
        + '<path d="M58 196h84v9H58z" fill="#4a9e7a"/>'
        + '<path d="M56 210h88v9H56z" fill="#c2412f"/></g>',
    }),
    'Rute': () => pessoa({
      fora:'#7aa05e', foraS:'#628249', dentro:'#e8f0dc', cinto:'#6f5738', cintoS:'#56422a',
      pano:'#a8c48e', panoS:'#90ab76', cabelo:'#4a3a2a', cabeloS:'#38291d',
      semBarba:true, bocaFechada:true, bracoEsq:'frente', bracoDir:'frente',
      frente:'<g><path d="M52 176c10-26 24-34 34-30 8 4 4 20-6 32-8 10-20 12-28 8z" fill="#e0b352"/>'
        + '<g stroke="#c99a3e" stroke-width="2.4"><path d="M60 176l18-20M68 182l16-18M56 168l18-18"/></g></g>',
    }),
    'Samuel': () => pessoa({
      fora:'#dcd6c8', foraS:'#c2bbaa', dentro:'#f2eee4', cinto:'#8a7a5a', cintoS:'#6d6045',
      pano:'#eae4d6', panoS:'#d4ccba', cabelo:'#4a3a2a', cabeloS:'#38291d',
      semBarba:true, bracoEsq:'erguido',
      naMao:'<g><ellipse cx="40" cy="150" rx="18" ry="12" fill="#c98d2e"/>'
        + '<path d="M22 150c0-7 8-12 18-12s18 5 18 12z" fill="#e0b352"/>'
        + '<path d="M58 146c6-2 10 0 12 4-4 2-9 2-12-4z" fill="#f6c445"/>'
        + '<path d="M70 140c3 5 3 8 0 11-3-3-3-6 0-11z" fill="#f6a445"/></g>',
    }),
    'Elias': () => pessoa({
      fora:'#7a5236', foraS:'#5f3f28', dentro:'#ddd0ba', cinto:'#4a3320', cintoS:'#392715',
      pano:'#a07a52', panoS:'#8a6642', cabelo:'#dcd6ca', cabeloS:'#c4beb2',
      bracoDir:'erguido',
      atras:'<g><path d="M150 30c8 14 4 26-6 30 4-12 6-20 6-30z" fill="#f6a445"/>'
        + '<path d="M168 46c6 12 2 22-6 26 4-10 6-17 6-26z" fill="#f6c445"/>'
        + '<ellipse cx="30" cy="116" rx="16" ry="11" fill="#3a3a42"/>'
        + '<circle cx="18" cy="108" r="9" fill="#2f2f38"/>'
        + '<circle cx="15" cy="106" r="2" fill="#fff"/>'
        + '<path d="M9 108l-7 3 7 3z" fill="#e8a33a"/></g>',
    }),
    'Jonas': () => pessoa({
      fora:'#5e9ec4', foraS:'#4a7fa0', dentro:'#dceaf2', cinto:'#3a627d', cintoS:'#2c4d63',
      pano:'#8fbcd8', panoS:'#77a4c0', cabelo:'#3d3a36', cabeloS:'#2c2a27',
      bracoEsq:'frente', bracoDir:'frente',
      atras:'<g opacity=".85"><path d="M4 168c22-30 60-30 82 0-22 30-60 30-82 0z" fill="#3f7ea3"/>'
        + '<path d="M86 168c8-10 18-14 22-10-2 8-10 14-22 10z" fill="#325f7d"/>'
        + '<circle cx="26" cy="160" r="4" fill="#fff"/><circle cx="26" cy="160" r="2" fill="#2a2a33"/></g>',
    }),
    'Maria': () => pessoa({
      fora:'#4a7ec4', foraS:'#3c66a0', dentro:'#e4ecf8', cinto:'#2f5080', cintoS:'#243e63',
      pano:'#7ba4da', panoS:'#648cc2', cabelo:'#3c2d24', cabeloS:'#2a1f19',
      semBarba:true, bocaFechada:true, bracoEsq:'frente', bracoDir:'frente',
      cabeca:'<g><path d="M44 64c0-28 24-48 56-48s56 20 56 48v8H44z" fill="#7ba4da"/>'
        + '<path d="M100 16c32 0 56 20 56 48v8h-56z" fill="#648cc2"/>'
        + '<path d="M42 60c-8 30-6 62 2 84 6-28 6-58-2-84zM158 60c8 30 6 62-2 84-6-28-6-58 2-84z" fill="#648cc2"/></g>',
    }),
    'Pedro': () => pessoa({
      fora:'#a0522d', foraS:'#7f3f22', dentro:'#e8d8c0', cinto:'#5f3a1f', cintoS:'#482b16',
      pano:'#c2825a', panoS:'#a86c46', cabelo:'#4a3a2a', cabeloS:'#38291d',
      bracoEsq:'frente', bracoDir:'frente',
      frente:'<g><path d="M50 168h100v40H50z" fill="none" stroke="#c9b88e" stroke-width="3"/>'
        + '<g stroke="#c9b88e" stroke-width="2"><path d="M70 168v40M90 168v40M110 168v40M130 168v40M50 181h100M50 194h100"/></g>'
        + '<g fill="#e8c547"><circle cx="150" cy="200" r="7"/><rect x="150" y="198" width="20" height="5" rx="2"/>'
        + '<rect x="164" y="203" width="4" height="6" rx="2"/></g></g>',
    }),
  };

  // Quem fica em cada unidade, escolhido pelos livros que ela percorre. Mais de um
  // por unidade: a trilha os distribui em pontos diferentes da estrada.
  const POR_UNIDADE = {
    1:  ['Noé', 'Abraão', 'Sara', 'José'],     // Gênesis e Êxodo
    2:  ['Moisés', 'José'],                    // Êxodo, Levítico, Números
    3:  ['Josué', 'Samuel'],                   // Josué e Juízes
    4:  ['Davi', 'Rute', 'Samuel'],            // Rute, 1 e 2 Samuel
    5:  ['Salomão', 'Elias'],                  // 1 e 2 Reis
    6:  ['Ester', 'Pedro'],                    // Esdras, Neemias, Ester, Atos
    7:  ['Jó', 'Paulo'],                       // Jó, Salmos, Romanos
    8:  ['Paulo', 'Maria'],                    // as cartas
    9:  ['Salomão', 'Isaías'],                 // Provérbios, Eclesiastes, Isaías
    10: ['Isaías', 'Jeremias'],                // Isaías e Jeremias
    11: ['Ezequiel', 'Pedro', 'Jonas'],        // Ezequiel e as cartas de Pedro
    12: ['Daniel', 'Jonas', 'João'],           // Daniel, profetas menores, Apocalipse
  };

  // A lista da unidade, ou a primeira delas quando se pede um nome só.
  CC.personagensDaUnidade = (numero) => POR_UNIDADE[numero] || POR_UNIDADE[1];
  CC.personagemDaUnidade = (numero) => {
    const nome = CC.personagensDaUnidade(numero)[0];
    return [nome, nome];
  };

  CC.personagemSvg = function (nome) {
    const fn = PERSONAGENS[nome];
    return fn ? fn() : '';
  };
})(window.CC);
