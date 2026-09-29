/* Roteador, topo, navegação e partida do aplicativo. */
(function (CC) {
  'use strict';

  const conteudo = document.getElementById('conteudo');
  const topo = document.getElementById('topo');
  const navegacao = document.getElementById('navegacao');

  // Cinco abas, cada uma com um trabalho claro e o nome à vista: um ícone sozinho não diz a
  // quem acabou de chegar que o baú é Desafios e a bússola é Explorar. Praticar mora dentro
  // de Desafios e no fim de cada unidade da trilha.
  const ABAS = [
    ['#/', 'Trilha', 'aba-trilha'],
    ['#/missoes', 'Desafios', 'aba-desafios'],
    ['#/novidades', 'Juntos', 'aba-juntos'],
    ['#/explorar', 'Explorar', 'aba-explorar'],
    ['#/perfil', 'Perfil', 'aba-perfil'],
  ];

  const ABA_DA_ROTA = {
    '': '#/', dia: '#/', passos: '#/', licoes: '#/', praticar: '#/missoes', missoes: '#/missoes',
    amigos: '#/novidades', novidades: '#/novidades',
    explorar: '#/explorar', secao: '#/explorar', nota: '#/explorar', busca: '#/explorar',
    perfil: '#/perfil', config: '#/perfil',
  };

  const lerLocal = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const gravarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* segue */ } };

  let ultimaRota = null;

  function partesDaRota() {
    const bruto = (location.hash || '#/').slice(2);
    const [caminho, consulta] = bruto.split('?');
    const partes = caminho.split('/').filter(Boolean).map(decodeURIComponent);
    return { rota: partes[0] || '', arg: partes.slice(1).join('/'), consulta };
  }

  // ---------- topo ----------
  // Só a lamparina com os dias, em todas as telas. Dias lidos, escudos e o sino saíram: o
  // topo parecia placar até dentro de uma nota de estudo. Tocar na lamparina abre a semana,
  // os escudos e o recorde; as novidades dos amigos aparecem como ponto na aba Juntos.
  let ofensivaAnterior = null;

  let topoDesenhado = '';
  function pintarTopo() {
    const seq = CC.sequencia();
    const subiu = ofensivaAnterior !== null && seq.atual > ofensivaAnterior;
    ofensivaAnterior = seq.atual;

    const html = '<div class="estatisticas">'
      + '<button class="contador ofensiva' + (seq.atual ? ' ativo' : '') + (seq.feitoHoje ? ' hoje' : '') + (subiu ? ' subiu' : '')
      + '" data-ofensiva aria-label="' + CC.plural(seq.atual, 'dia', 'dias') + ' de ofensiva, ' + CC.estagioDaChama(seq.atual).nome + '">'
      + CC.icoChama(seq.atual)
      + '<span>' + seq.atual + '</span><small>' + (seq.atual === 1 ? 'dia' : 'dias') + '</small></button>'
      + '</div>';
    if (html === topoDesenhado && topo.firstChild) return;
    topoDesenhado = html;
    topo.innerHTML = html;
    topo.querySelectorAll('[data-ofensiva]').forEach((b) => { b.onclick = CC.folhaOfensiva; });
  }
  CC.pintarTopo = pintarTopo;

  // A cor da barra do sistema segue o alto da tela: a folha branca na Trilha e no Perfil, o
  // cinza nas outras, e o escuro no tema escuro.
  function pintarCorDoSistema() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const escuro = document.documentElement.dataset.tema === 'escuro';
    const rota = document.documentElement.dataset.rota;
    const comFolha = rota === 'trilha' || rota === 'dia' || rota === 'perfil';
    meta.content = escuro ? (comFolha ? '#1c1c1c' : '#0c0c0c') : (comFolha ? '#ffffff' : '#efefef');
  }
  CC.pintarCorDoSistema = pintarCorDoSistema;

  // ---------- folha da ofensiva ----------
  CC.folhaOfensiva = function () {
    const seq = CC.sequencia();
    const hoje = CC.hojeIso();
    const feitas = CC.datasFeitas();
    const semana = [6, 5, 4, 3, 2, 1, 0].map((atras) => {
      const d = CC.somaDias(hoje, -atras);
      let estado = '';
      if (feitas.has(d)) estado = 'feito';
      else if (seq.protegidos.includes(d)) estado = 'escudo';
      else if (atras === 0) estado = 'hoje';
      return '<span class="bolinha ' + estado + '"><i>'
        + (estado === 'feito' ? CC.ico('certo') : (estado === 'escudo' ? CC.ico('escudo') : '')) + '</i>'
        + '<b>' + CC.diaDaSemana(d) + '</b></span>';
    }).join('');
    const amigos = (CC.amigosEmCache() || {}).amigos || [];

    const est = CC.estagioDaChama(seq.atual);
    CC.folha('<div class="folha-ofensiva">'
      + '<div class="chama-grande' + (seq.atual ? '' : ' apagada') + '">' + CC.icoChama(seq.atual) + '<b>' + seq.atual + '</b>'
      + '<span>' + (seq.atual === 1 ? 'dia de ofensiva' : 'dias de ofensiva') + (seq.atual ? '!' : '') + '</span></div>'
      + '<p class="estagio-chama"><b>' + est.nome + '</b> · ' + est.ref + '<br><span>' + est.frase + '</span>'
      + (est.proximo ? '<br><small>' + CC.plural(est.faltam, 'dia', 'dias') + ' para ' + est.proximo.nome + '</small>' : '') + '</p>'
      + (seq.atual === 0 ? '<p class="passo-dica">Leia hoje para acender sua lamparina.</p>'
        : (seq.feitoHoje ? '' : '<p class="passo-dica">O azeite de hoje ainda não entrou. Leia para manter a chama acesa!</p>'))
      + '<div class="semana-bolinhas">' + semana + '</div>'
      + '<p class="linha-escudos">' + [0, 1].map((i) => '<i class="' + (i < seq.escudos ? 'tem' : '') + '">' + CC.ico('escudo') + '</i>').join('')
      + '<span><b>' + CC.plural(seq.escudos, 'escudo', 'escudos') + '.</b> Um dia em branco usa um. Você ganha um todo mês e outro a cada 7 dias seguidos.</span></p>'
      + '<p class="linha-recorde"><span>Recorde</span><b>' + CC.plural(seq.recorde, 'dia', 'dias') + '</b></p>'
      + (seq.recorde >= 7 ? '<p class="passo-dica pequena marcas-barro">As marcas no barro guardam até onde você já chegou. Até aqui nos ajudou o Senhor (1Sm 7.12).</p>' : '')
      + (amigos.length
        ? '<span class="etiqueta">Lendo junto</span><div class="lista-proposito">'
          + amigos.map((a) => '<span class="pessoa-proposito">' + CC.retratoAmigo(a, 'pequeno') + '<span class="quem"><b>'
            + CC.esc(a.nome) + '</b><span class="estado">' + CC.icoChama() + a.dias + '</span></span></span>').join('') + '</div>'
        : '')
      + '<div class="acoes"><button class="botao contorno" data-ver-amigos>Ver amigos</button></div>'
      + '</div>',
    {
      rotulo: 'Ofensiva',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-ver-amigos]').onclick = () => { fechar(); location.hash = '#/novidades'; };
      },
    });
  };

  function pintarNavegacao(rota) {
    const ativa = ABA_DA_ROTA[rota] || '#/';
    const pendencias = CC.pendenciasDeAmigos ? CC.pendenciasDeAmigos() : 0;
    navegacao.innerHTML = '<a class="marca-lateral" href="#/">'
      + '<span class="simbolo">' + CC.icoLogo() + '</span>'
      + '<span>Geração <em>Eleita</em></span></a>'
      + ABAS.map(([href, rotulo, icone]) => {
        const foto = icone === 'aba-perfil' ? CC.foto() : '';
        const marca = foto ? '<img class="retrato-aba" src="' + CC.esc(foto) + '" alt="">' : CC.ico(icone, 'class="ico-aba"');
        const ponto = icone === 'aba-juntos' && pendencias ? '<i class="ponto-aba"></i>' : '';
        return '<button class="aba' + (href === ativa ? ' selecionada' : '') + '" data-ir="' + href + '"'
          + (href === ativa ? ' aria-current="page"' : '') + '><span class="icone-aba">' + marca + ponto + '</span>'
          + '<span class="rotulo-aba">' + rotulo + '</span></button>';
      }).join('');
    navegacao.querySelectorAll('[data-ir]').forEach((el) => {
      el.onclick = () => {
        CC.vibrar('leve');
        if (location.hash === el.dataset.ir) { CC.redesenhar(); scrollTo(0, 0); } else location.hash = el.dataset.ir;
      };
    });
  }

  // ---------- roteamento ----------
  const PERFIL = () => ({
    escritos: CC.vistaEscritos, livros: CC.vistaLivros, conquistas: CC.vistaConquistas,
    trofeus: CC.vistaTrofeus, versiculos: CC.vistaVersiculos,
  });

  function rotear() {
    const { rota, arg, consulta } = partesDaRota();

    conteudo.classList.toggle('sem-entrada', redesenhando);
    if (rota !== 'dia') CC.fecharLicao();
    if (rota !== 'praticar') CC.fecharPratica();
    if (CC.fecharPopNo) CC.fecharPopNo();

    if (rota === '' || rota === 'dia') CC.vistaTrilha(conteudo);
    else if (rota === 'passos' || rota === 'licoes') CC.vistaPassos(conteudo);
    else if (rota === 'praticar') CC.vistaPraticar(conteudo);
    else if (rota === 'missoes') CC.vistaMissoes(conteudo);
    else if (rota === 'amigos' || rota === 'novidades') (arg === 'bloqueados' ? CC.vistaBloqueados : arg === 'propositos' ? CC.vistaPropositos : CC.vistaAmigos)(conteudo);
    else if (rota === 'explorar') CC.vistaExplorar(conteudo);
    else if (rota === 'secao') CC.vistaSecao(conteudo, arg, consulta ? decodeURIComponent(consulta) : '');
    else if (rota === 'nota') CC.vistaNota(conteudo, arg);
    else if (rota === 'busca') CC.vistaBusca(conteudo, arg);
    else if (rota === 'perfil') (PERFIL()[arg] || CC.vistaPerfil)(conteudo);
    else if (rota === 'config') (arg === 'textos' ? CC.vistaTextos : arg === 'notificacoes' ? CC.vistaNotificacoes : CC.vistaConfig)(conteudo);
    else CC.vazio(conteudo, 'Página não encontrada.');

    conteudo.classList.toggle('largo', rota === 'nota');
    conteudo.dataset.rota = rota || 'trilha';
    // A Trilha e o Perfil têm a folha clara no alto e o resto em fundo escuro: a página
    // inteira precisa saber em que tela está, e a barra do sistema acompanha a folha.
    document.documentElement.dataset.rota = rota || 'trilha';
    document.documentElement.dataset.sub = arg ? '1' : '';
    pintarCorDoSistema();
    if (rota === 'dia') CC.montarLicao(Number(arg));

    pintarTopo();
    pintarNavegacao(rota);

    conteudo.querySelectorAll('[data-voltar]').forEach((el) => {
      el.onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/'; };
    });

    if ((rota === '' || rota === 'dia') && ultimaRota !== rota) {
      requestAnimationFrame(() => CC.rolarAteAtual(false));
    }
    if (rota !== ultimaRota && rota !== 'busca') scrollTo(0, 0);
    entradaDaTela(rota);
    ultimaRota = rota;
  }

  // A tela entra pelo lado de onde a pessoa veio: da direita quando anda para frente na barra
  // de abas, da esquerda quando volta. Isso dá noção de lugar, como virar página. Dentro da
  // mesma aba (abrir uma nota, entrar numa seção) ela sobe, que é o gesto de aprofundar.
  // Redesenho no mesmo lugar não anima: piscaria a cada atualização.
  function entradaDaTela(rota) {
    if (redesenhando || rota === ultimaRota) { conteudo.dataset.entrada = ''; return; }
    const ondeFica = (r) => ABAS.findIndex(([href]) => href === (ABA_DA_ROTA[r] || '#/'));
    const novo = ondeFica(rota);
    const velho = ultimaRota === null ? novo : ondeFica(ultimaRota);
    conteudo.dataset.entrada = novo === velho ? 'fundo' : (novo > velho ? 'direita' : 'esquerda');
    // Sem isto, ir duas vezes para o mesmo lado não reinicia a animação.
    conteudo.style.animation = 'none';
    void conteudo.offsetWidth;
    conteudo.style.animation = '';
  }

  let redesenhando = false;
  CC.redesenhar = function () {
    const y = scrollY;
    const guardar = ultimaRota;
    redesenhando = true;
    try { rotear(); } finally { redesenhando = false; }
    ultimaRota = guardar;
    scrollTo(0, y);
  };

  // ---------- avisos da abertura ----------
  // Cada aviso aparece uma vez: o escudo que cobriu ontem, a ofensiva que zerou e o
  // toque de um amigo. Nenhum cobra nem diz quem faltou.
  function avisosDoDia() {
    const seq = CC.sequencia();
    const hoje = CC.hojeIso();
    const ontem = CC.somaDias(hoje, -1);
    // As marcas de "já avisei" são de cada conta: no aparelho de casa, o que uma pessoa já
    // viu não pode esconder o aviso de outra que entra depois.
    const dono = (CC.quem && CC.quem.usuario) || '';
    if (seq.protegidos.includes(ontem) && lerLocal('cc.aviso.escudo') !== dono + ':' + ontem) {
      gravarLocal('cc.aviso.escudo', dono + ':' + ontem);
      CC.avisar('Seu escudo cobriu ontem. A ofensiva segue em ' + seq.atual + '!');
      return;
    }
    if (seq.zerouEm && !seq.feitoHoje && seq.zerouEm >= CC.somaDias(hoje, -14) && lerLocal('cc.aviso.zerou') !== dono + ':' + seq.zerouEm) {
      gravarLocal('cc.aviso.zerou', dono + ':' + seq.zerouEm);
      CC.folha('<div class="recomeco">' + CC.icoChama(0) + '<h2>O pavio ainda fumega</h2>'
        + '<p>O azeite que você guardou não se perdeu: tudo o que leu continua aqui, e o seu recorde de '
        + CC.plural(seq.recorde, 'dia', 'dias') + ' também. Hoje é um novo dia para acender de novo.</p></div>'
        + '<div class="acoes"><button class="botao" data-ler>Reavivar hoje</button>'
        + '<button class="botao plano" data-fechar>Agora não</button></div>',
      {
        rotulo: 'Recomeçar',
        ligar: (folha, fechar) => {
          folha.querySelector('[data-fechar]').onclick = fechar;
          folha.querySelector('[data-ler]').onclick = () => { fechar(); CC.abrirLicao(CC.diaAtual()); };
        },
      });
      return;
    }
    const toques = ((CC.amigosEmCache() || {}).toques || []);
    const vistos = lerLocal('cc.aviso.toques') || '';
    const novo = !seq.feitoHoje && toques.find((t) => !vistos.split(',').includes(dono + '>' + hoje + ':' + t.usuario));
    if (novo) {
      gravarLocal('cc.aviso.toques', [vistos, dono + '>' + hoje + ':' + novo.usuario].filter(Boolean).slice(-20).join(','));
      CC.folhaToque(novo);
    }
  }

  // ---------- partida ----------
  const guardado = CC.temaGuardado();
  CC.aplicarTema(guardado === null ? matchMedia('(prefers-color-scheme: dark)').matches : guardado);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (ev) => {
    if (CC.temaGuardado() === null) { CC.aplicarTema(ev.matches); pintarTopo(); }
  });

  CC.carregarLocal();
  if (!location.hash) history.replaceState(null, '', location.pathname + location.search + '#/');
  rotear();

  // A abertura sai assim que a primeira tela está desenhada.
  const abertura = document.getElementById('abertura');
  if (abertura) {
    requestAnimationFrame(() => {
      abertura.classList.add('saindo');
      setTimeout(() => abertura.remove(), 300);
    });
  }

  addEventListener('hashchange', rotear);
  addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const cortinas = document.querySelectorAll('.cortina');
    const cortina = cortinas[cortinas.length - 1];
    if (cortina) { if (!cortina.dataset.presa) cortina.remove(); return; }
    const telas = document.querySelectorAll('.tela-cheia');
    if (telas.length) { telas[telas.length - 1].remove(); return; }
    if (document.querySelector('.pop-no')) { CC.fecharPopNo(); return; }
    if (CC.leitorAberto && CC.leitorAberto()) { CC.fecharLeitor(); return; }
    if (document.querySelector('.licao')) location.hash = '#/';
  });

  CC.sincronizar(true).then(async () => {
    CC.migrarEstado();
    CC.guardarConquistas();
    const quem = CC.quem;
    if (quem && quem.comSenha) {
      try {
        const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (fuso) CC.api('api/fuso', { fuso }).catch(() => {});
      } catch (e) { /* segue */ }
    }
    await Promise.all([CC.carregarAmigos(), CC.carregarNovidades()]);
    CC.conferirMissoes();
    CC.redesenhar();

    // Conta recém-criada: primeiro a leitura do dia 1, que é o que dá sentido ao app. O
    // tutorial de pôr o app na tela de início espera a primeira leitura concluída; a marca
    // fica guardada até lá e sai quando ele aparece, para não repetir a cada abertura.
    let novaConta = false;
    try { novaConta = localStorage.getItem('cc.instalar') === '1'; } catch (e) { /* segue */ }
    if (novaConta && CC.ler('lidos', []).length) {
      try { localStorage.removeItem('cc.instalar'); } catch (e) { /* segue */ }
      if (!CC.rodandoComoApp()) await CC.tutorialInstalar({ contaNova: true });
    }

    const convite = new URLSearchParams(location.search).get('convite');
    if (convite) {
      history.replaceState(null, '', location.pathname + (location.hash || '#/'));
      if (quem && quem.comSenha && !quem.perfilCompleto) {
        if (await CC.completarCadastro(quem)) CC.aceitarConvite(convite);
      } else {
        CC.aceitarConvite(convite);
      }
      return;
    }
    // Uma vez por dia por conta, e não por aparelho: veja as marcas em avisosDoDia.
    const marcaCadastro = ((quem && quem.usuario) || '') + ':' + CC.hojeIso();
    if (quem && quem.comSenha && !quem.perfilCompleto && lerLocal('cc.aviso.cadastro') !== marcaCadastro) {
      gravarLocal('cc.aviso.cadastro', marcaCadastro);
      CC.completarCadastro(quem);
      return;
    }
    avisosDoDia();
    // O convite para ativar notificações só aparece quando nada mais está aberto na tela.
    if (!document.querySelector('.cortina, .tela-cheia')) CC.talvezOferecerNotificacoes();
  });

  addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    CC.sincronizar(false)
      .then(() => Promise.all([CC.carregarAmigos(), CC.carregarNovidades()]))
      .then(() => pintarTopo());
  });

  if (location.protocol.startsWith('http')) {
    const elo = document.createElement('link');
    elo.rel = 'manifest';
    elo.href = 'manifest.webmanifest';
    document.head.appendChild(elo);
  }

  // ---------- atualizações ----------
  // O app abre do cache, e é por isso que abre sem rede. Para não ficar preso numa versão
  // velha, ele pergunta ao servidor qual é a atual ao abrir e sempre que volta para a tela.
  // Se mudou, registra o service worker com a versão no endereço, o que passa por cima de
  // qualquer cache, e recarrega quando a versão nova assume: na hora, se nada estiver
  // aberto; senão, assim que a pessoa fechar a lição ou a janela.
  const VERSAO = (document.querySelector('meta[name="versao-app"]') || {}).content || '';
  CC.versaoApp = () => VERSAO;
  CC.conferirVersao = async () => {};
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    let recarregarDepois = false;
    const podeRecarregar = () => !document.querySelector('.licao, .cortina, .tela-cheia')
      && !(CC.leitorAberto && CC.leitorAberto());
    const recarregarQuandoPuder = () => {
      if (podeRecarregar()) location.reload();
      else recarregarDepois = true;
    };
    addEventListener('hashchange', () => { if (recarregarDepois && podeRecarregar()) location.reload(); });

    // Só recarrega quando quem assumiu é de outra versão: a versão vem no endereço do
    // service worker (sw.js?v=...). A mesma versão assumindo, como na primeira instalação,
    // não recarrega, qualquer que seja a ordem em que os eventos chegam.
    const versaoDoControlador = () => {
      try { return new URL(navigator.serviceWorker.controller.scriptURL).searchParams.get('v') || ''; } catch (e) { return ''; }
    };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      const versao = versaoDoControlador();
      if (versao && versao !== VERSAO) recarregarQuandoPuder();
    });

    CC.conferirVersao = async () => {
      try {
        const r = await fetch('api/versao', { cache: 'no-store' });
        if (!r.ok) return;
        const { versao } = await r.json();
        if (versao && versao !== VERSAO) await navigator.serviceWorker.register('sw.js?v=' + versao);
      } catch (e) { /* sem rede: segue com a versão que tem */ }
    };

    addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js' + (VERSAO ? '?v=' + VERSAO : ''))
        .catch(() => { /* segue sem cache */ })
        .then(() => CC.conferirVersao());
    });
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') CC.conferirVersao(); });
  }
})(window.CC);
