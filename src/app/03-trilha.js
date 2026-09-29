/* A trilha: os 365 dias do plano como nós redondos de um caminho, agrupados por unidade,
   com um baú a cada sete dias e o troféu no fim de cada unidade. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const AMPLITUDE = 70;

  // O dia em que a pessoa está: o primeiro não lido, a menos que ela tenha
  // escolhido outro. Sem isto, quem pula um dia fica preso nele para sempre.
  CC.diaAtual = function () {
    const escolhido = Number(CC.ler('dia', 1)) || 1;
    if (!CC.leu(escolhido)) return Math.min(Math.max(1, escolhido), D.plano.length);
    for (let n = 1; n <= D.plano.length; n++) if (!CC.leu(n)) return n;
    return D.plano.length;
  };

  const unidadeDoDia = (n) => D.unidades.find((u) => n >= u.de && n <= u.ate) || D.unidades[0];
  CC.unidadeDoDia = unidadeDoDia;

  const progressoUnidade = (u) => {
    let feitos = 0;
    for (let n = u.de; n <= u.ate; n++) if (CC.leu(n)) feitos++;
    return { feitos, total: u.ate - u.de + 1 };
  };
  CC.progressoUnidade = progressoUnidade;

  const passagemDe = (dia) => [dia.antigo, dia.novo].filter(Boolean).join(' · ');
  CC.passagemDe = passagemDe;

  // Uma estimativa honesta de tempo: uns 4 minutos por capítulo, arredondado para 5.
  CC.minutosDoDia = (dia) => {
    const capitulos = (dia.trechos || []).reduce((s, t) => s + (t.ate - t.de + 1), 0);
    return Math.max(5, Math.round((capitulos * 4) / 5) * 5);
  };

  let abertas = null;
  CC.recemFeito = null;

  const FECHA_LIVRO = (() => {
    const ultimo = new Map();
    for (const d of D.plano) for (const l of d.livros) ultimo.set(l, d.numero);
    const mapa = new Map();
    for (const [livro, numero] of ultimo) {
      if (!mapa.has(numero)) mapa.set(numero, []);
      mapa.get(numero).push(livro);
    }
    return mapa;
  })();
  CC.livrosQueFecham = (numero) => FECHA_LIVRO.get(numero) || [];

  const deslocamento = (passo) => Math.round(Math.sin(passo * Math.PI / 4) * AMPLITUDE);


  // ---------- nós ----------
  function iconeDoDia(numero, feito, atual) {
    if (FECHA_LIVRO.has(numero) && (feito || atual)) return 'livro';
    if (feito && CC.temRegistro(numero)) return 'caneta';
    if (feito) return 'certo';
    // o de hoje é a estrela; os que ainda vêm levam cadeado, para não parecer que tocar abre
    return atual ? 'estrela' : 'cadeado';
  }

  // Ao lado de cada nó vai o "Dia N" e a passagem. Com as duas trilhas no mesmo dia, os
  // livros vão abreviados, para o rótulo caber ao lado do nó sem empurrar o caminho.
  const ABREVIATURAS = {
    'Gênesis': 'Gn', 'Êxodo': 'Êx', 'Levítico': 'Lv', 'Números': 'Nm', 'Deuteronômio': 'Dt', 'Josué': 'Js',
    'Juízes': 'Jz', 'Rute': 'Rt', '1 Samuel': '1Sm', '2 Samuel': '2Sm', '1 Reis': '1Rs', '2 Reis': '2Rs',
    '1 Crônicas': '1Cr', '2 Crônicas': '2Cr', 'Esdras': 'Ed', 'Neemias': 'Ne', 'Ester': 'Et', 'Jó': 'Jó',
    'Salmos': 'Sl', 'Provérbios': 'Pv', 'Eclesiastes': 'Ec', 'Cânticos': 'Ct', 'Isaías': 'Is', 'Jeremias': 'Jr',
    'Lamentações': 'Lm', 'Ezequiel': 'Ez', 'Daniel': 'Dn', 'Oseias': 'Os', 'Joel': 'Jl', 'Amós': 'Am',
    'Obadias': 'Ob', 'Jonas': 'Jn', 'Miqueias': 'Mq', 'Naum': 'Na', 'Habacuque': 'Hc', 'Sofonias': 'Sf',
    'Ageu': 'Ag', 'Zacarias': 'Zc', 'Malaquias': 'Ml', 'Mateus': 'Mt', 'Marcos': 'Mc', 'Lucas': 'Lc',
    'João': 'Jo', 'Atos': 'At', 'Romanos': 'Rm', '1 Coríntios': '1Co', '2 Coríntios': '2Co', 'Gálatas': 'Gl',
    'Efésios': 'Ef', 'Filipenses': 'Fp', 'Colossenses': 'Cl', '1 Tessalonicenses': '1Ts',
    '2 Tessalonicenses': '2Ts', '1 Timóteo': '1Tm', '2 Timóteo': '2Tm', 'Tito': 'Tt', 'Filemom': 'Fm',
    'Hebreus': 'Hb', 'Tiago': 'Tg', '1 Pedro': '1Pe', '2 Pedro': '2Pe', '1 João': '1Jo', '2 João': '2Jo',
    '3 João': '3Jo', 'Judas': 'Jd', 'Apocalipse': 'Ap',
  };
  // os 66 na ordem da Bíblia: a estante do Perfil desenha um traço por livro
  CC.livrosEmOrdem = Object.keys(ABREVIATURAS);
  const NOMES_LIVROS = Object.keys(ABREVIATURAS).sort((a, b) => b.length - a.length);
  const abreviar = (ref) => NOMES_LIVROS.reduce((t, nome) => t.split(nome).join(ABREVIATURAS[nome]), String(ref || ''));
  const passagemCurta = (dia) => (dia.antigo && dia.novo ? abreviar(dia.antigo) + ' · ' + abreviar(dia.novo)
    : (dia.antigo || dia.novo).length > 22 ? abreviar(dia.antigo || dia.novo) : (dia.antigo || dia.novo));
  CC.passagemCurta = passagemCurta;

  // O rótulo vai do lado oposto ao desvio do nó, onde sobra estrada; "--xa" é o quanto sobra.
  const ladoDoRotulo = (x) => (x > 0 ? 'esq' : 'dir');

  // As trilhas do dia (Antigo e Novo): quais já foram marcadas e quais faltam.
  function partesDoDia(numero) {
    const dia = D.plano[numero - 1];
    const trilhas = [['antigo', dia.antigo], ['novo', dia.novo]].filter(([, ref]) => ref);
    const feito = CC.leu(numero);
    const marcadas = feito ? {} : (CC.partesMarcadas ? CC.partesMarcadas(numero) : {});
    const lidas = trilhas.filter(([k]) => feito || marcadas[k]);
    return { trilhas, lidas, faltam: trilhas.filter(([k]) => !(feito || marcadas[k])) };
  }

  // O dia lido hoje, se houver: quem já leu vê a leitura feita, e o nó seguinte deixa de
  // ser chamado de "hoje".
  const diaLidoHoje = () => {
    const hoje = CC.hojeIso();
    const marcados = CC.ler('marcadoEm', {});
    return Object.keys(marcados).filter((k) => marcados[k] === hoje).map(Number).sort((a, b) => b - a)[0];
  };

  // O cartão ao lado do nó de hoje: o que falta ler e o botão de seguir.
  function cartaoDoNoDeHoje(numero, feito, lado) {
    const jaLeuHoje = !feito && !!diaLidoHoje();
    const dia = D.plano[numero - 1];
    const { lidas, faltam } = partesDoDia(numero);
    // Com uma das duas marcada, o cartão mostra a que falta e diz qual já foi.
    const metade = !feito && lidas.length > 0 && faltam.length > 0;
    const titulo = metade ? faltam.map(([, r]) => r).join(' · ') : passagemDe(dia);
    const sub = feito ? 'Leitura feita'
      : (metade ? lidas.map(([, r]) => r).join(' · ') + ' já lido' : 'cerca de ' + CC.minutosDoDia(dia) + ' min');
    const acao = feito ? 'Revisar' : (lidas.length ? 'Continuar' : 'Começar');
    return '<section class="cartao-no-hoje lado-' + lado + '" aria-label="' + (jaLeuHoje ? 'Próxima leitura' : 'Leitura de hoje') + '">'
      + '<span class="rot-hoje">' + (jaLeuHoje ? 'Próximo' : 'Hoje') + ' · Dia ' + numero + '</span>'
      + '<b>' + CC.esc(titulo) + '</b>'
      + '<span class="sub-hoje">' + CC.esc(sub) + '</span>'
      + '<button class="botao-pilula" data-abrir-dia="' + numero + '">' + acao + CC.ico('avancar') + '</button>'
      + '</section>';
  }

  function no(numero, passo, atual) {
    const dia = D.plano[numero - 1];
    const feito = CC.leu(numero);
    const classes = ['no'];
    if (feito) classes.push('feito');
    else if (atual) classes.push('atual');
    else classes.push('travado');
    if (atual && feito) classes.push('atual');
    if (numero === CC.recemFeito) classes.push('recem');
    if (FECHA_LIVRO.has(numero)) classes.push('fecha-livro');
    else if (feito && CC.temRegistro(numero)) classes.push('com-registro');

    const fechados = CC.livrosQueFecham(numero);
    const legenda = 'Dia ' + numero + ', ' + passagemDe(dia) + (feito ? ', lido' : '')
      + (fechados.length ? '. Fecha ' + fechados.join(' e ') : '');
    const x = deslocamento(passo);
    const lado = ladoDoRotulo(x);

    // O rótulo repete o que a legenda do botão já diz: fica fora do leitor de tela.
    const rotulo = atual ? cartaoDoNoDeHoje(numero, feito, lado)
      : '<span class="rotulo-dia lado-' + lado + (feito ? ' lido' : '') + '" aria-hidden="true">'
        + '<b>Dia ' + numero + '</b><span>' + CC.esc(passagemCurta(dia)) + '</span>'
        + (fechados.length && feito ? '<span class="fechou">Fecha ' + CC.esc(fechados.join(' e ')) + '</span>' : '')
        + '</span>';

    return '<div class="no-linha' + (atual ? ' hoje' : '') + '" style="--x:' + x + 'px;--xa:' + (lado === 'esq' ? x : -x) + 'px">'
      + '<div class="deslocado">'
      + '<button class="' + classes.join(' ') + '" data-dia="' + numero + '" '
      + 'aria-label="' + CC.esc(legenda) + '"' + (atual ? ' aria-current="step"' : '') + '>'
      + (atual ? '<span class="anel-atual" aria-hidden="true" style="--parte:' + Math.round((CC.fracaoDoDia ? CC.fracaoDoDia(numero) : 0) * 100) + '%"></span>' : '')
      + '<span class="face">' + CC.ico(iconeDoDia(numero, feito, atual)) + '</span></button>'
      + '</div>' + rotulo + '</div>';
  }

  function noBau(numero, passo) {
    const aberto = CC.bauAberto(numero);
    const pronto = !aberto && CC.leu(numero);
    const estado = aberto ? 'aberto' : (pronto ? 'pronto' : 'travado');
    const legenda = aberto ? 'Baú aberto do dia ' + numero : (pronto ? 'Abrir o baú do dia ' + numero : 'Baú do dia ' + numero + ', ainda fechado');
    // Fechado em cinza e pronto em madeira, com o balão "Abrir": antes os dois saíam de
    // madeira, e o baú do dia 7 passava sem ninguém notar que já podia ser aberto.
    return '<div class="no-linha linha-bau' + (pronto ? ' com-balao' : '') + '" style="--x:' + deslocamento(passo) + 'px"><div class="deslocado">'
      + (pronto ? '<span class="balao balao-bau">Abrir</span>' : '')
      + '<button class="no-bau ' + estado + '" data-bau="' + numero + '" aria-label="' + legenda + '">'
      + CC.arte.bau(estado, estado === 'travado' ? '' : 'madeira') + '</button></div></div>';
  }

  function marco(u) {
    const p = progressoUnidade(u);
    const ganho = p.feitos === p.total;
    return '<div class="no-linha linha-marco" data-ate="' + u.ate + '" style="--x:0px"><div class="deslocado">'
      + '<button class="no-marco' + (ganho ? ' ganho' : '') + '" data-marco="' + u.numero + '" '
      + 'aria-label="Troféu da unidade ' + u.numero + (ganho ? ', conquistado' : '') + '">'
      + CC.arte.trofeu(u.cor, ganho, p.total ? p.feitos / p.total : 0) + '</button>'
      + '<span class="rotulo-no">' + (ganho ? 'Unidade concluída!' : p.feitos + ' de ' + p.total + ' dias') + '</span>'
      + (p.feitos ? '<a class="praticar-unidade" href="#/praticar">' + CC.ico('alvo') + 'Praticar a unidade</a>' : '')
      + '</div></div>';
  }

  function figuraAoLado(u, numero, atual, passo) {
    const lado = deslocamento(passo) > 0 ? 'esquerda' : 'direita';
    if (numero === atual) {
      return '<div class="figura-trilha ' + lado + ' mascote" aria-hidden="true">'
        + CC.mascoteSvg(CC.leu(numero) ? 'feliz' : 'parado') + '</div>';
    }
    const elenco = CC.personagensDaUnidade(u.numero);
    const total = u.ate - u.de + 1;
    const vao = Math.floor(total / (elenco.length + 1));
    const indice = elenco.findIndex((_, i) => numero === u.de + vao * (i + 1));
    if (indice === -1) return '';
    const nome = elenco[indice];
    return '<div class="figura-trilha ' + lado + (CC.leu(numero) ? '' : ' adiante') + '" '
      + 'title="' + CC.esc(nome) + '">' + CC.personagemSvg(nome) + '</div>';
  }

  function faixa(u, aberta) {
    const p = progressoUnidade(u);
    const travada = p.feitos === 0 && u.de > CC.diaAtual();
    return '<div class="faixa-unidade c-' + u.cor + (travada ? ' travada' : '') + (aberta ? ' aberta' : '') + '">'
      + '<button class="corpo-faixa" data-abrir="' + u.numero + '" aria-expanded="' + aberta + '">'
      // O número grande é o que substituiu a cor de cada unidade: quem diz "mudou de
      // unidade" agora é a tipografia, não o fundo colorido. Fica escondido de leitor de
      // tela porque o rótulo ao lado já diz "Unidade N" por extenso.
      + '<span class="numero-unidade" aria-hidden="true">' + String(u.numero).padStart(2, '0') + '</span>'
      + '<span class="textos-faixa">'
      + '<span class="rot">Unidade ' + u.numero + ' · ' + p.feitos + ' de ' + p.total + ' dias</span>'
      + '<span class="nome">' + CC.esc(u.titulo) + '</span>'
      + '</span>'
      + '</button>'
      + '<button class="guia" data-guia="' + u.numero + '" aria-label="Sobre esta unidade">'
      + CC.ico('folha') + '</button>'
      + '</div>';
  }

  // ---------- a folha do alto ----------
  // Uma folha clara no alto da trilha, com a saudação e dois cartões: a leitura de hoje
  // (quantas das partes do dia já foram) e a ofensiva. Tocar no primeiro abre a lição; no
  // segundo, a folha da chama. Amigos aparecem só como sinal de quem já leu hoje, sem
  // número nem comparação.
  let ofensivaVista = null;
  function folhaDoTopo(atual, amigos, faixaToque) {
    // Quem já leu hoje vê a leitura feita, e não o dia seguinte oferecido como se faltasse.
    const lidoHoje = diaLidoHoje();
    const feito = !!lidoHoje;
    const numero = feito ? lidoHoje : atual;
    const dia = D.plano[numero - 1];
    const { trilhas, lidas } = partesDoDia(numero);
    const seq = CC.sequencia();
    const subiu = ofensivaVista !== null && seq.atual > ofensivaVista;
    ofensivaVista = seq.atual;

    const quemLeu = ((amigos && amigos.amigos) || []).filter((a) => a.leuHoje);
    const juntos = quemLeu.length
      ? '<span class="lendo-junto-linha"><span class="rostos">' + quemLeu.slice(0, 3).map((a) => CC.retratoAmigo(a, 'mini')).join('') + '</span>'
        + CC.esc(quemLeu.length === 1 ? quemLeu[0].nome.split(' ')[0] + ' já leu hoje' : quemLeu.length + ' amigos já leram hoje') + '</span>'
      : '';
    const novo = !feito && CC.ler('lidos', []).length < 3 && CC.ler('licoes', []).length < D.licoes.length;
    const primeira = !CC.ler('lidos', []).length;
    const nome = String(CC.apelido() || (CC.quem || {}).nome || '').trim().split(/\s+/)[0];
    const foto = CC.foto();
    const servido = location.protocol.startsWith('http');
    const pendencias = CC.pendenciasDeAmigos ? CC.pendenciasDeAmigos() : 0;

    const saudacao = '<header class="saudacao">'
      + '<a class="avatar-topo" href="#/perfil" aria-label="Seu perfil">'
      + (foto ? '<img src="' + CC.esc(foto) + '" alt="">' : CC.ico('pessoa')) + '</a>'
      + '<div class="textos-saudacao"><b>' + CC.esc(primeira ? 'Bem-vindo!' : (nome ? 'Olá, ' + nome + '!' : 'Olá! Bora ler?')) + '</b>'
      + '<span>Dia ' + numero + ' de ' + D.plano.length + ' do plano</span></div>'
      + (servido
        ? '<a class="botao-redondo" href="#/novidades" aria-label="Juntos' + (pendencias ? ', há novidades' : '') + '">'
          + CC.ico('balao') + (pendencias ? '<i class="ponto"></i>' : '') + '</a>'
          + '<a class="botao-redondo" href="#/config/notificacoes" aria-label="Lembretes">' + CC.ico('sino') + '</a>'
        : '')
      + '</header>';

    const rotuloLeitura = feito
      ? 'Leitura de hoje feita. Rever o dia ' + numero
      : 'Leitura de hoje, dia ' + numero + ': ' + passagemDe(dia) + ', ' + lidas.length + ' de ' + trilhas.length + ' lidas';
    const cartoes = '<div class="cartoes-hoje">'
      + '<button class="cartao-lima" data-abrir-dia="' + numero + '" aria-label="' + CC.esc(rotuloLeitura) + '">'
      + '<span class="textos-lima"><b>' + lidas.length + ' de ' + trilhas.length + '</b>'
      + '<span>' + (trilhas.length === 1 ? 'leitura hoje' : 'leituras hoje') + '</span></span>'
      + '<span class="redondo-preto" aria-hidden="true">' + CC.ico(feito ? 'certo' : 'direita') + '</span></button>'
      + '<button class="cartao-lima" data-ofensiva aria-label="' + CC.plural(seq.atual, 'dia', 'dias') + ' de ofensiva, '
      + CC.esc(CC.estagioDaChama(seq.atual).nome) + '">'
      + '<span class="textos-lima"><b' + (subiu ? ' class="subiu"' : '') + '>' + CC.plural(seq.atual, 'dia', 'dias') + '</b>'
      + '<span>seguidos</span></span>'
      + '<span class="redondo-preto" aria-hidden="true">' + CC.icoChama(seq.atual) + '</span></button>'
      + '</div>';

    return '<section class="folha-topo" aria-label="Hoje">'
      + saudacao
      + faixaToque
      + (primeira ? '<p class="fala-bento pequena apresenta">Vamos caminhar juntos pela Bíblia, um dia de cada vez.</p>' : '')
      + cartoes
      + juntos
      + (novo ? '<a class="novo-na-fe" href="#/passos">' + CC.ico('bandeira') + 'Novo na fé? Comece pelos Primeiros passos</a>' : '')
      + '</section>';
  }

  // ---------- atalho de amigos ----------
  CC.cartaoAmigosTrilha = function (dados) {
    if (!location.protocol.startsWith('http') || !dados || !dados.perfilCompleto) return '';
    const amigos = dados.amigos || [];
    if (!amigos.length) {
      return '<button class="atalho-trilha vazio-proposito" data-convidar>'
        + '<span class="marca-atalho c-azul">' + CC.ico('pessoas') + '</span>'
        + '<span class="texto-atalho"><b>Convidar</b><small>ler junto</small></span></button>';
    }
    const melhor = amigos.reduce((m, a) => (a.dias > m.dias ? a : m), amigos[0]);
    return '<a class="atalho-trilha com-amigos" href="#/novidades">'
      + '<span class="rostos">' + amigos.slice(0, 3).map((a) => CC.retratoAmigo(a, 'mini')).join('') + '</span>'
      + '<span class="texto-atalho"><b>' + CC.icoChama() + melhor.dias + '</b><small>' + (melhor.dias === 1 ? 'dia' : 'dias') + ' juntos</small></span></a>';
  };

  // ---------- a tela ----------
  // A unidade de hoje abre sozinha, e a que tinha aberto sozinha antes fecha, a menos que
  // a pessoa tenha mexido nela. Num aparelho novo a primeira tela sai antes de o progresso
  // chegar do servidor: sem isto, ficava aberta a unidade 1 e fechada a de hoje.
  let unidadeVista = null;
  let abertaSozinha = null;
  CC.vistaTrilha = function (raiz) {
    const atual = CC.diaAtual();
    const uAtual = unidadeDoDia(atual);
    if (abertas === null) abertas = new Set();
    let mudouDeUnidade = false;
    if (unidadeVista !== uAtual.numero) {
      if (abertaSozinha !== null && abertaSozinha !== uAtual.numero) abertas.delete(abertaSozinha);
      if (!abertas.has(uAtual.numero)) { abertas.add(uAtual.numero); abertaSozinha = uAtual.numero; }
      mudouDeUnidade = unidadeVista !== null;
      unidadeVista = uAtual.numero;
    }
    const amigos = CC.amigosEmCache ? CC.amigosEmCache() : null;

    const toques = (amigos && amigos.toques) || [];
    const faixaToque = toques.length && !CC.sequencia().feitoHoje
      ? '<button class="toque-recebido" data-ver-toque>' + CC.ico('sino') + '<span><b>' + CC.esc(toques[0].nome)
        + '</b> deu um toque em você</span>' + CC.ico('direita') + '</button>'
      : '';

    const corpo = D.unidades.map((u) => {
      const aberta = abertas.has(u.numero);
      if (!aberta) return faixa(u, false);
      const nos = [];
      let passo = 0;
      for (let n = u.de; n <= u.ate; n++) {
        nos.push(no(n, passo, n === atual));
        passo++;
        if (CC.temBau(n) && n !== u.ate) { nos.push(noBau(n, passo)); passo++; }
      }
      nos.push(marco(u));
      return faixa(u, true) + '<div class="nos c-' + u.cor + '">' + nos.join('') + '</div>';
    }).join('');

    raiz.innerHTML = '<div class="trilha">'
      + folhaDoTopo(atual, amigos, faixaToque)
      + '<div class="trilha-caminho">' + corpo + '</div></div>'
      + '<button class="ir-atual" data-ir-atual hidden aria-label="Voltar ao dia de hoje">' + CC.ico('baixo') + '</button>';

    raiz.querySelectorAll('[data-dia]').forEach((el) => {
      el.onclick = (ev) => { ev.stopPropagation(); abrirPop(Number(el.dataset.dia), el); };
    });
    raiz.querySelectorAll('[data-bau]').forEach((el) => {
      el.onclick = (ev) => { ev.stopPropagation(); tocarBau(Number(el.dataset.bau), el); };
    });
    raiz.querySelectorAll('[data-marco], [data-guia]').forEach((el) => {
      el.onclick = () => CC.folhaUnidade(Number(el.dataset.marco || el.dataset.guia));
    });
    raiz.querySelectorAll('[data-abrir]').forEach((el) => {
      el.onclick = () => {
        const n = Number(el.dataset.abrir);
        if (abertas.has(n)) abertas.delete(n); else abertas.add(n);
        if (n === abertaSozinha) abertaSozinha = null;
        CC.redesenhar();
      };
    });
    raiz.querySelectorAll('[data-abrir-dia]').forEach((el) => {
      el.onclick = () => CC.abrirLicao(Number(el.dataset.abrirDia));
    });
    const convidar = raiz.querySelector('[data-convidar]');
    if (convidar) convidar.onclick = () => CC.convidar();
    const verToque = raiz.querySelector('[data-ver-toque]');
    if (verToque) verToque.onclick = () => CC.folhaToque(toques[0]);
    raiz.querySelectorAll('[data-ofensiva]').forEach((el) => { el.onclick = CC.folhaOfensiva; });

    vigiarAtual(raiz);
    vigiarEstrada(raiz);
    if (mudouDeUnidade) requestAnimationFrame(() => CC.rolarAteAtual(false));
    if (CC.recemFeito) setTimeout(() => { CC.recemFeito = null; }, 1400);
  };

  // ---------- a estrada ----------
  // Uma linha liga os nós de cada unidade: contínua até o dia de hoje e pontilhada depois,
  // sobre uma faixa larga que faz o papel da estrada. Ela é desenhada depois do HTML, a
  // partir de onde cada nó caiu na tela, e refeita quando a largura muda.
  const SVG = 'http://www.w3.org/2000/svg';
  function caminhoPor(pontos) {
    if (!pontos.length) return '';
    let d = 'M' + pontos[0].x + ' ' + pontos[0].y;
    for (let i = 1; i < pontos.length; i++) {
      const a = pontos[i - 1];
      const b = pontos[i];
      const meio = (a.y + b.y) / 2;
      d += ' C' + a.x + ' ' + meio + ', ' + b.x + ' ' + meio + ', ' + b.x + ' ' + b.y;
    }
    return d;
  }

  function desenharEstradas(raiz) {
    const atual = CC.diaAtual();
    raiz.querySelectorAll('.nos').forEach((nos) => {
      const caixa = nos.getBoundingClientRect();
      if (!caixa.width) return;
      const pontos = [...nos.querySelectorAll('.no-linha')].map((linha) => {
        const alvo = linha.querySelector('.no, .no-bau, .no-marco');
        if (!alvo) return null;
        const r = alvo.getBoundingClientRect();
        // o marco fecha a unidade: conta como depois do último dia dela
        const numero = Number(alvo.dataset.dia || alvo.dataset.bau || (alvo.dataset.marco ? 1e4 : 0));
        const ate = alvo.dataset.marco ? Number(linha.dataset.ate || 0) + 0.5 : numero + (alvo.dataset.bau ? 0.5 : 0);
        return { x: Math.round(r.left + r.width / 2 - caixa.left), y: Math.round(r.top + r.height / 2 - caixa.top), ate };
      }).filter(Boolean);
      if (pontos.length < 2) return;
      // Até hoje, inclusive, a linha é contínua; daí em diante, pontilhada.
      let corte = pontos.findIndex((p) => p.ate >= atual);
      if (corte === -1) corte = pontos.length - 1;
      const feitos = pontos.slice(0, corte + 1);
      const adiante = pontos.slice(corte);
      let svg = nos.querySelector(':scope > svg.estrada');
      if (!svg) {
        svg = document.createElementNS(SVG, 'svg');
        svg.setAttribute('class', 'estrada');
        svg.setAttribute('aria-hidden', 'true');
        nos.prepend(svg);
      }
      svg.setAttribute('width', caixa.width);
      svg.setAttribute('height', nos.scrollHeight);
      svg.setAttribute('viewBox', '0 0 ' + caixa.width + ' ' + nos.scrollHeight);
      svg.innerHTML = '<path class="faixa-estrada" d="' + caminhoPor(pontos) + '"/>'
        + (feitos.length > 1 ? '<path class="linha-feita" d="' + caminhoPor(feitos) + '"/>' : '')
        + (adiante.length > 1 ? '<path class="linha-adiante" d="' + caminhoPor(adiante) + '"/>' : '');
    });
  }

  let observador = null;
  function vigiarEstrada(raiz) {
    const trilha = raiz.querySelector('.trilha-caminho');
    if (!trilha) return;
    requestAnimationFrame(() => desenharEstradas(raiz));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (trilha.isConnected) desenharEstradas(raiz); });
    if (observador) observador.disconnect();
    if (!('ResizeObserver' in window)) return;
    let largura = 0;
    observador = new ResizeObserver(([registro]) => {
      const w = Math.round(registro.contentRect.width);
      if (w === largura) return;
      largura = w;
      if (trilha.isConnected) desenharEstradas(raiz); else observador.disconnect();
    });
    observador.observe(trilha);
  }

  // A seta que aparece quando o dia de hoje sai da tela, como no aplicativo de referência.
  let vigia = null;
  function vigiarAtual(raiz) {
    if (vigia) vigia.disconnect();
    const alvo = raiz.querySelector('.no.atual');
    const seta = raiz.querySelector('[data-ir-atual]');
    if (!alvo || !seta || !('IntersectionObserver' in window)) return;
    vigia = new IntersectionObserver(([registro]) => {
      seta.hidden = registro.isIntersecting;
      seta.classList.toggle('para-cima', registro.boundingClientRect.top < 0);
    });
    vigia.observe(alvo);
    seta.onclick = () => CC.rolarAteAtual(true);
  }

  CC.rolarAteAtual = function (suave) {
    const alvo = document.querySelector('.no.atual');
    if (!alvo) return;
    alvo.scrollIntoView({ block: 'center', behavior: suave ? 'smooth' : 'auto' });
  };

  // ---------- balão do nó ----------
  function fecharPop() {
    document.querySelectorAll('.pop-no').forEach((p) => p.remove());
    document.querySelectorAll('.no.aberto').forEach((n) => n.classList.remove('aberto'));
  }
  CC.fecharPopNo = fecharPop;
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest || !ev.target.closest('.pop-no')) fecharPop();
  });

  function montarPop(botao, classe, interno) {
    const ja = botao.classList.contains('aberto');
    fecharPop();
    if (ja) return null;
    const linha = botao.closest('.no-linha');
    const pop = document.createElement('div');
    pop.className = 'pop-no ' + classe;
    pop.setAttribute('role', 'dialog');
    pop.innerHTML = interno;
    linha.appendChild(pop);
    botao.classList.add('aberto');
    // Perto do fim da tela, a trilha rola o suficiente para o balão caber inteiro.
    requestAnimationFrame(() => {
      const caixa = pop.getBoundingClientRect();
      const falta = caixa.bottom - (innerHeight - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--alt-barra')) || 68) - 12);
      if (falta > 0) scrollBy({ top: falta, behavior: CC.semMovimento() ? 'auto' : 'smooth' });
    });
    return pop;
  }

  function abrirPop(numero, botao) {
    const dia = D.plano[numero - 1];
    const u = unidadeDoDia(numero);
    const feito = CC.leu(numero);
    const atual = numero === CC.diaAtual();
    const adiante = !feito && !atual;
    const fala = atual && !feito ? '<p class="fala-bento">' + CC.esc(CC.falaMascote(CC.amigosEmCache && CC.amigosEmCache())) + '</p>' : '';
    const pop = montarPop(botao, adiante ? 'adiante' : 'c-' + u.cor,
      '<b class="titulo-pop">' + CC.esc(passagemDe(dia)) + '</b>'
      + '<span class="sub-pop">Dia ' + numero + ' de ' + D.plano.length + ' · uns ' + CC.minutosDoDia(dia) + ' min</span>'
      + fala
      + (adiante ? '<span class="sub-pop">Este dia vem mais adiante, mas pode ler agora se quiser.</span>' : '')
      + '<button class="botao ' + (adiante ? 'contorno' : 'branco') + '" data-comecar="' + numero + '">'
      + (feito ? 'Revisar' : (adiante ? 'Ler mesmo assim' : 'Começar <span class="xp-pop">+' + CC.XP_LEITURA + ' XP</span>')) + '</button>');
    if (!pop) return;
    pop.querySelector('[data-comecar]').onclick = () => { fecharPop(); CC.abrirLicao(numero); };
  }

  function tocarBau(numero, botao) {
    if (CC.bauAberto(numero)) return;
    if (CC.leu(numero)) { fecharPop(); CC.telaBau(numero); return; }
    const pop = montarPop(botao, 'adiante',
      '<b class="titulo-pop">Um baú na estrada</b>'
      + '<span class="sub-pop">Leia o dia ' + numero + ' para abrir.</span>');
    if (pop) pop.onclick = (ev) => ev.stopPropagation();
  }

  // ---------- baú e cartas ----------
  CC.cartaHtml = function (nome) {
    const id = '11 - Pessoas/' + nome;
    const nota = D.notas[id];
    const sub = nota && nota.sub ? nota.sub.split('·')[0].trim() : '';
    return '<div class="carta">'
      + '<div class="carta-arte">' + CC.personagemSvg(nome) + '</div>'
      + '<div class="carta-texto"><span class="etiqueta">' + CC.esc(sub || 'Personagem') + '</span>'
      + '<h2>' + CC.esc(nome) + '</h2>'
      + (nota && nota.resumo ? '<p>' + CC.esc(nota.resumo) + '</p>' : '')
      + '</div></div>';
  };

  CC.mostrarCarta = function (nome) {
    const nota = D.notas['11 - Pessoas/' + nome];
    CC.telaCheia('<div class="cena-carta">' + CC.cartaHtml(nome) + '</div>', {
      classe: 'tela-carta',
      rotulo: 'Carta de ' + nome,
      pe: (nota ? '<button class="botao contorno" data-ler-nota>Ler sobre ' + CC.esc(nome) + '</button>' : '')
        + '<button class="botao" data-fechar-tela>Fechar</button>',
      ligar: (el, fechar) => {
        el.querySelector('[data-fechar-tela]').onclick = fechar;
        const ler = el.querySelector('[data-ler-nota]');
        if (ler) ler.onclick = () => { fechar(); location.hash = '#/nota/' + encodeURIComponent('11 - Pessoas/' + nome); };
      },
    });
  };

  CC.telaBau = function (numero) {
    const u = unidadeDoDia(numero);
    CC.telaCheia('<div class="cena-bau">'
      + '<h1>Um baú na estrada!</h1>'
      + '<button class="bau-grande" data-abrir-bau aria-label="Abrir o baú">' + CC.faiscasDoBau() + CC.arte.bau('pronto', 'madeira') + '</button>'
      + '<p class="dica-bau">Toque no baú para abrir</p></div>', {
      classe: 'tela-bau c-' + u.cor,
      rotulo: 'Baú do dia ' + numero,
      ligar: (el, fechar) => {
        const botao = el.querySelector('[data-abrir-bau]');
        botao.onclick = async () => {
          botao.disabled = true;
          const bau = CC.abrirBau(numero);
          botao.classList.add('abrindo');
          CC.vibrar('conquista');
          await CC.esperar(650);
          const palco = el.querySelector('.tela-cheia-palco');
          const ref = bau.ref || CC.versiculoDoBau(numero);
          palco.innerHTML = '<div class="cena-carta revelando"><h1>Baú aberto!</h1>'
            + '<p class="passo-dica">Um versículo dos sete dias que você acabou de ler.</p>'
            + '<div class="versiculo-do-bau" id="versiculo-do-bau"></div></div>';
          CC.arte.confete(el);
          // O texto vem da tradução escolhida e chega depois: o cartão entra quando
          // chegar, sem segurar a comemoração esperando o carregamento.
          if (ref && CC.textoDoVersiculo) {
            const alvo = palco.querySelector('#versiculo-do-bau');
            CC.textoDoVersiculo(ref).then((texto) => {
              if (!alvo.isConnected || !texto) return;
              alvo.innerHTML = CC.cartaoVersiculo(ref, texto);
              if (CC.ligarCartaoVersiculo) CC.ligarCartaoVersiculo(alvo, ref);
            }).catch(() => { /* sem rede ou sem tradução: o baú abre do mesmo jeito */ });
          }
          const pe = document.createElement('div');
          pe.className = 'tela-cheia-pe';
          pe.innerHTML = '<button class="botao" data-guardar>Continuar</button>';
          el.appendChild(pe);
          pe.querySelector('[data-guardar]').onclick = () => { fechar(); CC.redesenhar(); };
          pe.querySelector('[data-guardar]').focus();
          const novos = CC.guardarConquistas();
          if (CC.publicarNovidades) CC.publicarNovidades({ niveis: novos });
        };
      },
    });
  };
  CC.faiscasDoBau = () => CC.arte.faiscas();

  // ---------- folha da unidade ----------
  // "Ir para o dia" leva ao próximo dia não lido desta unidade, e não ao dia atual do
  // plano: quem está no dia 41 e abre a unidade 1 quer revisar a unidade 1.
  CC.folhaUnidade = function (numero) {
    const u = D.unidades.find((x) => x.numero === numero);
    if (!u) return;
    const p = progressoUnidade(u);
    let destino = u.de;
    for (let n = u.de; n <= u.ate; n++) if (!CC.leu(n)) { destino = n; break; }
    const livros = u.livros.map((l) => {
      const pl = CC.progressoDoLivro(l);
      const id = '03 - Livros da Bíblia/' + l;
      const completo = pl.lidos === pl.total;
      return '<a class="pilula' + (completo ? ' livro-feito' : '') + '" href="#/nota/' + encodeURIComponent(id) + '">'
        + (completo ? CC.ico('certo') : '') + CC.esc(l)
        + ' <span class="conta-livro">' + pl.lidos + '/' + pl.total + '</span></a>';
    }).join('');

    CC.folha('<div class="cabeca-folha-unidade">' + CC.arte.trofeu(u.cor, p.feitos === p.total)
      + '<div><span class="etiqueta">Unidade ' + u.numero + '</span>'
      + '<h2>' + CC.esc(u.titulo) + '</h2>'
      + '<p>' + p.feitos + ' de ' + p.total + ' dias lidos</p></div></div>'
      + CC.barra(p.feitos / p.total)
      + '<div class="pilulas" style="margin:16px 0">' + livros + '</div>'
      + '<div class="acoes"><button class="botao cor" data-ir>'
      + (p.feitos === p.total ? 'Revisar o dia ' + u.de : 'Ir para o dia ' + destino) + '</button></div>',
    {
      classe: 'c-' + u.cor,
      rotulo: 'Unidade ' + u.numero,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-ir]').onclick = () => { fechar(); CC.abrirLicao(destino); };
        folha.querySelectorAll('a').forEach((a) => { a.onclick = fechar; });
      },
    });
  };
})(window.CC);
