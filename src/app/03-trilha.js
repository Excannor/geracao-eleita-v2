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

  // Espaço inseparável entre número e livro ("1 Samuel 16", "Marcos 2")
  CC.colarRef = (t) => String(t || '').replace(/(\d) (?=\p{L})/gu, '$1\u00a0').replace(/(\p{L}) (?=\d)/gu, '$1\u00a0').replace(/ · /g, '\u00a0· ');
  const refHtml = (t) => CC.esc(CC.colarRef(t));

  // "Dia N" vai do lado onde sobra estrada
  const ladoDoRotulo = (x, passo) => (x > 0 || (x === 0 && passo % 8 === 0) ? 'esq' : 'dir');
  const diaLidoHoje = () => {
    const hoje = CC.hojeIso();
    const marcados = CC.ler('marcadoEm', {});
    return Object.keys(marcados).filter((k) => marcados[k] === hoje).map(Number).sort((a, b) => b - a)[0];
  };

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
  const NOMES_LIVROS = Object.keys(ABREVIATURAS).sort((a, b) => b.length - a.length);
  const abreviar = (ref) => NOMES_LIVROS.reduce((t, nome) => t.split(nome).join(ABREVIATURAS[nome]), String(ref || ''));
  const passagemCurta = (dia) => (dia.antigo && dia.novo ? abreviar(dia.antigo) + ' · ' + abreviar(dia.novo)
    : (dia.antigo || dia.novo).length > 22 ? abreviar(dia.antigo || dia.novo) : (dia.antigo || dia.novo));

  // As trilhas do dia (Antigo e Novo): quantas já foram marcadas hoje, pela fração que a
  // lição guarda (a mesma que enche o anel do nó).
  function partesDoDia(numero) {
    const dia = D.plano[numero - 1];
    const trilhas = [dia.antigo, dia.novo].filter(Boolean);
    const lidas = Math.round((CC.fracaoDoDia ? CC.fracaoDoDia(numero) : (CC.leu(numero) ? 1 : 0)) * trilhas.length);
    return { total: trilhas.length, lidas };
  }

  // O cartão ao lado do nó de hoje: a passagem e o botão de seguir.
  function cartaoDoNoDeHoje(numero, feito, lado) {
    const jaLeuHoje = !feito && !!diaLidoHoje();
    const dia = D.plano[numero - 1];
    const { lidas } = partesDoDia(numero);
    const acao = feito ? 'Revisar' : (lidas ? 'Continuar' : 'Começar');
    return '<section class="cartao-no-hoje lado-' + lado + '" aria-label="' + (jaLeuHoje ? 'Próxima leitura' : 'Leitura de hoje') + '">'
      + '<span class="rot-hoje">' + (jaLeuHoje ? 'Próximo' : 'Hoje') + ' · Dia ' + numero + '</span>'
      + '<b>' + refHtml(passagemDe(dia)) + '</b>'
      + '<span class="sub-hoje">' + (feito ? 'Leitura feita' : 'cerca de ' + CC.minutosDoDia(dia) + ' min') + '</span>'
      + '<button class="botao-pilula" data-abrir-dia="' + numero + '">' + acao + CC.ico('avancar') + '</button>'
      + '</section>';
  }


  // ---------- nós ----------
  function iconeDoDia(numero, feito, atual) {
    if (FECHA_LIVRO.has(numero) && (feito || atual)) return 'livro';
    if (feito && CC.temRegistro(numero)) return 'caneta';
    if (feito) return 'certo';
    // o de hoje é a estrela; os que ainda vêm levam cadeado, para não parecer que tocar abre
    return atual ? 'estrela' : 'cadeado';
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

    // O nó de hoje vai à borda da curva, para o cartão ao lado caber.
    const x0 = deslocamento(passo);
    const x = atual ? (x0 > 0 || (x0 === 0 && passo % 8 === 0) ? AMPLITUDE : -AMPLITUDE) : x0;
    const lado = ladoDoRotulo(x, passo);
    // Repete a legenda do botão: fora do leitor de tela. O de hoje é um cartão com o botão.
    const rotulo = atual ? cartaoDoNoDeHoje(numero, feito, lado)
      : '<span class="rotulo-dia lado-' + lado + (feito ? ' lido' : '') + '" aria-hidden="true">'
        + '<b>Dia ' + numero + '</b><span>' + refHtml(passagemCurta(dia)) + '</span>'
        + (fechados.length && feito ? '<span class="fechou">Fecha ' + CC.esc(fechados.join(' e ')) + '</span>' : '')
        + '</span>';

    return '<div class="no-linha' + (atual ? ' hoje' : '') + '" style="--x:' + x + 'px;--xa:' + Math.abs(x) + 'px">'
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
    return '<div class="no-linha linha-marco" style="--x:0px"><div class="deslocado">'
      + '<button class="no-marco' + (ganho ? ' ganho' : '') + '" data-marco="' + u.numero + '" '
      + 'aria-label="Troféu da unidade ' + u.numero + (ganho ? ', conquistado' : '') + '">'
      + CC.arte.trofeu(u.cor, ganho, p.total ? p.feitos / p.total : 0) + '</button>'
      + '<span class="rotulo-no">' + (ganho ? 'Unidade concluída!' : p.feitos + ' de ' + p.total + ' dias') + '</span>'
      + (p.feitos ? '<a class="praticar-unidade" href="#/praticar">' + CC.ico('alvo') + 'Praticar a unidade</a>' : '')
      + '</div></div>';
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
      + '<span class="nome">' + refHtml(u.titulo) + '</span>'
      + '</span>'
      + '</button>'
      + '<button class="guia" data-guia="' + u.numero + '" aria-label="Sobre esta unidade">'
      + CC.ico('folha') + '</button>'
      + '</div>';
  }

  // ---------- a folha do alto ----------
  // Uma folha clara no alto da trilha, com a saudação e dois cartões sálvia: a leitura de
  // hoje (quantas das partes do dia já foram) e a ofensiva. Tocar no primeiro abre a lição;
  // no segundo, a folha da chama. Amigos aparecem só como sinal de quem já leu hoje, sem
  // número nem comparação.
  let ofensivaVista = null;
  function folhaDoTopo(atual, amigos, faixaToque) {
    // Quem já leu hoje vê a leitura feita, e não o dia seguinte oferecido como se faltasse.
    const lidoHoje = diaLidoHoje();
    const feito = !!lidoHoje;
    const numero = feito ? lidoHoje : atual;
    const dia = D.plano[numero - 1];
    const { total, lidas } = partesDoDia(numero);
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
    const nome = String((CC.apelido && CC.apelido()) || (CC.quem || {}).nome || '').trim().split(/\s+/)[0];
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
      : 'Leitura de hoje, dia ' + numero + ': ' + passagemDe(dia) + ', ' + lidas + ' de ' + total + ' lidas';
    const cartoes = '<div class="cartoes-hoje leitura-hoje">'
      + '<button class="cartao-salvia" data-abrir-dia="' + numero + '" aria-label="' + CC.esc(rotuloLeitura) + '">'
      + '<span class="textos-salvia"><b>' + lidas + ' de ' + total + '</b>'
      + '<span>' + (total === 1 ? 'leitura hoje' : 'leituras hoje') + '</span></span>'
      + '<span class="redondo-preto" aria-hidden="true">' + CC.ico(feito ? 'certo' : 'avancar') + '</span></button>'
      + '<button class="cartao-salvia" data-ofensiva aria-label="' + CC.plural(seq.atual, 'dia', 'dias') + ' de ofensiva, '
      + CC.esc(CC.estagioDaChama(seq.atual).nome) + '">'
      + '<span class="textos-salvia"><b' + (subiu ? ' class="subiu"' : '') + '>' + CC.plural(seq.atual, 'dia', 'dias') + '</b>'
      + '<span>seguidos</span></span>'
      + '<span class="redondo-preto" aria-hidden="true">' + CC.icoChama(seq.atual) + '</span></button>'
      + '</div>';

    return '<section class="folha-topo" aria-label="Hoje">'
      + saudacao
      + faixaToque
      + (primeira ? '<p class="fala-bento pequena apresenta">Que bom ter você aqui! Vamos caminhar juntos pela Bíblia, um dia de cada vez.</p>' : '')
      + cartoes
      + (novo ? '<a class="novo-na-fe" href="#/passos">' + CC.ico('bandeira') + 'Novo na fé? Comece pelos Primeiros passos</a>' : '')
      + juntos
      + '</section>';
  }

  // ---------- a tela ----------
  CC.vistaTrilha = function (raiz) {
    // Quem está no Conhecer Jesus vê os 14 dias aqui, no lugar do plano anual: é o caminho
    // dela até decidir seguir Jesus (ou trocar de volta pelo link discreto no fim da lista).
    if (CC.quem && CC.quem.caminho === 'conhecer' && CC.vistaConhecer) {
      CC.vistaConhecer(raiz, true);
      return;
    }
    const atual = CC.diaAtual();
    const uAtual = unidadeDoDia(atual);
    if (abertas === null) abertas = new Set([uAtual.numero]);
    const amigos = CC.amigosEmCache ? CC.amigosEmCache() : null;

    const toques = (amigos && amigos.toques) || [];
    const faixaToque = toques.length && !CC.sequencia().feitoHoje
      ? '<button class="toque-recebido" data-ver-toque>' + CC.ico('sino') + '<span><b>' + CC.esc(toques[0].nome)
        + '</b> deu um toque em você</span>' + CC.ico('avancar') + '</button>'
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
        CC.redesenhar();
      };
    });
    raiz.querySelectorAll('[data-abrir-dia]').forEach((el) => {
      el.onclick = () => CC.abrirLicao(Number(el.dataset.abrirDia));
    });
    raiz.querySelectorAll('[data-ofensiva]').forEach((el) => { el.onclick = CC.folhaOfensiva; });
    const convidar = raiz.querySelector('[data-convidar]');
    if (convidar) convidar.onclick = () => CC.convidar();
    const verToque = raiz.querySelector('[data-ver-toque]');
    if (verToque) verToque.onclick = () => CC.folhaToque(toques[0]);

    vigiarAtual(raiz);
    vigiarEstrada(raiz);
    if (CC.recemFeito) setTimeout(() => { CC.recemFeito = null; }, 1400);
  };

  // ---------- a estrada ----------
  // Faixa ligando os nós, com a linha contínua até hoje e pontilhada depois; refeita
  // quando a largura muda. Só enfeite: fica fora do leitor de tela.
  const caminhoPor = (p) => p.map((b, i) => (i ? 'C' + p[i - 1].x + ' ' + (p[i - 1].y + b.y) / 2 + ',' + b.x + ' ' + (p[i - 1].y + b.y) / 2 + ',' : 'M') + b.x + ' ' + b.y).join('');
  const traco = (classe, p) => (p.length > 1 ? '<path class="' + classe + '" d="' + caminhoPor(p) + '"/>' : '');

  function desenharEstradas(raiz) {
    const atual = CC.diaAtual();
    raiz.querySelectorAll('.nos').forEach((nos) => {
      const caixa = nos.getBoundingClientRect();
      const pontos = [...nos.querySelectorAll('.no, .no-bau, .no-marco')].map((el) => {
        const r = el.getBoundingClientRect();
        const d = el.dataset;
        return { x: Math.round(r.left + r.width / 2 - caixa.left), y: Math.round(r.top + r.height / 2 - caixa.top), ate: d.marco ? 1e9 : +(d.dia || d.bau) + (d.bau ? 0.5 : 0) };
      });
      let corte = pontos.findIndex((p) => p.ate >= atual);
      if (corte < 0) corte = pontos.length - 1;
      const velha = nos.querySelector(':scope > .estrada');
      if (velha) velha.remove();
      if (caixa.width) {
        nos.insertAdjacentHTML('afterbegin', '<svg class="estrada" aria-hidden="true" width="' + caixa.width + '" height="' + nos.scrollHeight + '">'
          + traco('faixa-estrada', pontos) + traco('linha-feita', pontos.slice(0, corte + 1)) + traco('linha-adiante', pontos.slice(corte)) + '</svg>');
      }
    });
  }

  let observador = null;
  function vigiarEstrada(raiz) {
    const trilha = raiz.querySelector('.trilha');
    const desenhar = () => { if (trilha.isConnected) desenharEstradas(raiz); };
    requestAnimationFrame(desenhar);
    if (document.fonts) document.fonts.ready.then(desenhar);
    if (observador) observador.disconnect();
    let largura = 0;
    if (window.ResizeObserver) {
      observador = new ResizeObserver(([r]) => { if (Math.round(r.contentRect.width) !== largura) { largura = Math.round(r.contentRect.width); desenhar(); } });
      observador.observe(trilha);
    }
    vigiarFolha(raiz);
  }

  // A folha do alto fica fixa enquanto a trilha rola: a faixa da unidade gruda logo abaixo
  // dela e a seta de "hoje" conta como fora da tela o que está escondido atrás dela.
  let observadorFolha = null;
  function vigiarFolha(raiz) {
    const folha = raiz.querySelector('.folha-topo');
    const raizDoc = document.documentElement;
    if (observadorFolha) observadorFolha.disconnect();
    if (!folha) { raizDoc.style.removeProperty('--alt-folha'); return; }
    const medir = () => {
      if (!folha.isConnected) { raizDoc.style.removeProperty('--alt-folha'); if (observadorFolha) observadorFolha.disconnect(); return; }
      raizDoc.style.setProperty('--alt-folha', Math.round(folha.getBoundingClientRect().height) + 'px');
    };
    medir();
    if (window.ResizeObserver) { observadorFolha = new ResizeObserver(medir); observadorFolha.observe(folha); }
  }

  // A seta que aparece quando o dia de hoje sai da tela, como no aplicativo de referência.
  let vigia = null;
  function vigiarAtual(raiz) {
    if (vigia) vigia.disconnect();
    const alvo = raiz.querySelector('.no.atual');
    const seta = raiz.querySelector('[data-ir-atual]');
    if (!alvo || !seta || !('IntersectionObserver' in window)) return;
    const folha = raiz.querySelector('.folha-topo');
    const altFolha = folha ? Math.round(folha.getBoundingClientRect().height) : 0;
    vigia = new IntersectionObserver(([registro]) => {
      seta.hidden = registro.isIntersecting;
      seta.classList.toggle('para-cima', registro.boundingClientRect.top < altFolha);
    }, { rootMargin: '-' + altFolha + 'px 0px 0px 0px' });
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
    document.querySelectorAll('.pop-no').forEach((p) => CC.sair(p, 140));
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
    const fala = atual && !feito ? '<p class="fala-bento">' + CC.esc(CC.falaDoDia(CC.amigosEmCache && CC.amigosEmCache())) + '</p>' : '';
    const pop = montarPop(botao, adiante ? 'adiante' : 'c-' + u.cor,
      '<b class="titulo-pop">' + refHtml(passagemDe(dia)) + '</b>'
      + '<span class="sub-pop">Dia ' + numero + ' de ' + D.plano.length + ' · uns ' + CC.minutosDoDia(dia) + ' min</span>'
      + fala
      + (adiante ? '<span class="sub-pop">Este dia vem mais adiante, mas pode ler agora se quiser.</span>' : '')
      + '<button class="botao' + (adiante ? ' contorno' : '') + '" data-comecar="' + numero + '">'
      + (feito ? 'Revisar' : (adiante ? 'Ler mesmo assim' : 'Começar')) + '</button>');
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

  // ---------- baú ----------
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
