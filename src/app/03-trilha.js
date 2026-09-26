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

    return '<div class="no-linha' + (atual ? ' com-balao' : '') + '" style="--x:' + deslocamento(passo) + 'px">'
      + '<div class="deslocado">'
      + (atual ? '<span class="balao">' + (feito ? 'Revisar' : 'Começar') + '</span>' : '')
      + '<button class="' + classes.join(' ') + '" data-dia="' + numero + '" '
      + 'aria-label="' + CC.esc(legenda) + '"' + (atual ? ' aria-current="step"' : '') + '>'
      + (atual ? '<span class="anel-atual" aria-hidden="true" style="--parte:' + Math.round((CC.fracaoDoDia ? CC.fracaoDoDia(numero) : 0) * 100) + '%"></span>' : '')
      + '<span class="face">' + CC.ico(iconeDoDia(numero, feito, atual)) + '</span></button>'
      + (fechados.length && feito ? '<span class="rotulo-no fechou">' + CC.esc(fechados.join(' · ')) + '</span>' : '')
      + '</div></div>';
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
      + '<span class="nome">' + CC.esc(u.titulo) + '</span>'
      + '</span>'
      + '</button>'
      + '<button class="guia" data-guia="' + u.numero + '" aria-label="Sobre esta unidade">'
      + CC.ico('folha') + '</button>'
      + '</div>';
  }

  // ---------- leitura de hoje ----------
  // Uma ação só no alto da trilha: a leitura do dia. Antes eram três atalhos (amigos, missões
  // e passos) que repetiam as abas e cortavam o texto. Depois de ler, o cartão encolhe numa
  // linha. Amigos aparecem só como sinal de quem já leu hoje, sem número nem comparação.
  function cartaoLeituraDeHoje(atual, amigos) {
    // Quem já leu hoje vê a leitura feita, e não o dia seguinte oferecido como se faltasse.
    const hoje = CC.hojeIso();
    const marcados = CC.ler('marcadoEm', {});
    const lidoHoje = Object.keys(marcados).filter((k) => marcados[k] === hoje).map(Number).sort((a, b) => b - a)[0];
    const feito = !!lidoHoje;
    const numero = feito ? lidoHoje : atual;
    const dia = D.plano[numero - 1];
    const quemLeu = ((amigos && amigos.amigos) || []).filter((a) => a.leuHoje);
    const juntos = quemLeu.length
      ? '<span class="lendo-junto-linha"><span class="rostos">' + quemLeu.slice(0, 3).map((a) => CC.retratoAmigo(a, 'mini')).join('') + '</span>'
        + CC.esc(quemLeu.length === 1 ? quemLeu[0].nome.split(' ')[0] + ' já leu hoje' : quemLeu.length + ' amigos já leram hoje') + '</span>'
      : '';
    if (feito) {
      return '<div class="leitura-hoje feita">'
        + '<span class="selo-feito">' + CC.ico('certo') + '</span>'
        + '<span class="texto"><b>Leitura de hoje feita</b><small>Dia ' + numero + ' · ' + CC.esc(passagemDe(dia)) + '</small></span>'
        + '<button class="botao plano pequeno" data-abrir-dia="' + numero + '">Rever</button>'
        + '</div>' + juntos;
    }
    const novo = CC.ler('lidos', []).length < 3 && CC.ler('licoes', []).length < D.licoes.length;
    const primeira = !CC.ler('lidos', []).length;
    return (primeira ? '<p class="fala-bento pequena apresenta">Bem-vindo! Vamos caminhar juntos pela Bíblia, um dia de cada vez.</p>' : '')
      + '<div class="leitura-hoje">'
      + '<span class="etiqueta">Leitura de hoje · Dia ' + atual + '</span>'
      + '<b class="passagem-hoje">' + CC.esc(passagemDe(dia)) + '</b>'
      + '<small class="tempo">cerca de ' + CC.minutosDoDia(dia) + ' min</small>'
      + '<button class="botao" data-abrir-dia="' + atual + '">Começar</button>'
      + (novo ? '<a class="novo-na-fe" href="#/passos">' + CC.ico('bandeira') + 'Novo na fé? Comece pelos Primeiros passos</a>' : '')
      + juntos
      + '</div>';
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
      + faixaToque
      + cartaoLeituraDeHoje(atual, amigos)
      + corpo + '</div>'
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
    const convidar = raiz.querySelector('[data-convidar]');
    if (convidar) convidar.onclick = () => CC.convidar();
    const verToque = raiz.querySelector('[data-ver-toque]');
    if (verToque) verToque.onclick = () => CC.folhaToque(toques[0]);

    vigiarAtual(raiz);
    if (CC.recemFeito) setTimeout(() => { CC.recemFeito = null; }, 1400);
  };

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
    const fala = atual && !feito ? '<p class="fala-bento">' + CC.esc(CC.falaDoDia(CC.amigosEmCache && CC.amigosEmCache())) + '</p>' : '';
    const pop = montarPop(botao, adiante ? 'adiante' : 'c-' + u.cor,
      '<b class="titulo-pop">' + CC.esc(passagemDe(dia)) + '</b>'
      + '<span class="sub-pop">Dia ' + numero + ' de ' + D.plano.length + ' · uns ' + CC.minutosDoDia(dia) + ' min</span>'
      + fala
      + (adiante ? '<span class="sub-pop">Este dia vem mais adiante, mas pode ler agora se quiser.</span>' : '')
      + '<button class="botao ' + (adiante ? 'contorno' : 'branco') + '" data-comecar="' + numero + '">'
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
