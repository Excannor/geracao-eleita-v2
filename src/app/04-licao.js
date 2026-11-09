/* A lição do dia: a leitura, a celebração em passos e, se a pessoa quiser, escrever ou ir
   mais fundo. A celebração festeja o que foi lido e a constância, nunca o valor espiritual
   de quem leu; escrever e orar ficam fora de qualquer placar. */
(function (CC) {
  'use strict';

  const D = CC.D;

  const CAMPOS = {
    o: ['Observação', 'O que está escrito, sem interpretar ainda',
      'Quem fala, com quem, o que acontece, o que se repete.'],
    i: ['Interpretação', 'O que o autor quis dizer a quem leu primeiro',
      'O que isso significava para quem ouviu naquela época?'],
    a: ['Aplicação', 'Uma atitude concreta, com dia e hora',
      'Exemplo: hoje à noite, ouvir alguém da minha casa até o fim antes de responder.'],
    oracao: ['Oração', 'Fale com Deus sobre o que você leu',
      'Senhor, o texto de hoje diz que… e eu preciso disso porque…'],
  };

  let sessao = null;

  // Espaço inseparável entre número e livro e entre livro e capítulo ("1 Samuel 16.7"):
  // a referência nunca quebra no meio, nem no hífen do intervalo (15-17). Só na tela; o
  // texto guardado fica igual.
  const nb = (t) => String(t).replace(/(\d) (?=\p{L})/gu, '$1\u00a0').replace(/(\p{L}) (?=\d)/gu, '$1\u00a0')
    .replace(/(\d)-(?=\d)/g, '$1-\u2060');

  CC.abrirLicao = function (dia) { location.hash = '#/dia/' + dia; };
  // "Ler hoje" na Trilha: o leitor abre direto na primeira passagem que falta, por cima da lição
  // (que não é mais uma parada do caminho de hoje). A última passagem lida conclui o dia, e o
  // leitor fecha na tela do dia lido. Fechar o leitor no meio volta para a Trilha.
  let pedidoDireto = 0;
  CC.lerHoje = function (dia) {
    pedidoDireto = Number(dia);
    if (location.hash === '#/dia/' + dia) CC.montarLicao(dia);
    else location.hash = '#/dia/' + dia;
  };

  // ---------- as telas cheias prendem o foco ----------
  // A lição, o dia do Conhecer Jesus, a prática e o leitor se declaram janela modal: o que está
  // atrás deles (a Trilha, o topo, a barra de abas) fica inerte enquanto estão abertos, para o
  // Tab e o leitor de tela não saírem para a tela escondida. Vale a camada de cima (o leitor, por
  // cima da lição); as folhas, as telas cheias e o aviso que abrem depois ficam de fora. Refeito a
  // cada filho que entra ou sai do body, então nenhuma tela precisa lembrar de soltar.
  const MODAIS = '.licao:not(.saindo), .leitor:not(.saindo)';
  const FORA_DO_INERTE = /^(SCRIPT|STYLE|LINK|TEMPLATE)$/;
  function acertarInerte() {
    const corpo = document.body;
    if (!corpo || !corpo.children) return;
    const filhos = [...corpo.children];
    const modais = filhos.filter((x) => x.matches && x.matches(MODAIS));
    const topo = modais[modais.length - 1] || null;
    for (const x of filhos) {
      const deveria = !!topo && x !== topo && filhos.indexOf(x) < filhos.indexOf(topo) && !FORA_DO_INERTE.test(x.tagName);
      if (deveria && !x.inert) { x.inert = true; x.dataset.inerteModal = '1'; }
      else if (!deveria && x.dataset && x.dataset.inerteModal) { x.inert = false; delete x.dataset.inerteModal; }
    }
  }
  CC.acertarInerte = acertarInerte;
  if (typeof MutationObserver === 'function' && document.body) {
    new MutationObserver(acertarInerte).observe(document.body, { childList: true });
  }

  // Só a lição do dia (.licao-dia): o dia do Conhecer Jesus e a prática também usam .licao, e
  // o roteador fecha a lição em toda rota que não é #/dia. Com o seletor largo, qualquer
  // redesenho (a sincronização) fechava o dia do Conhecer Jesus ou a prática no meio.
  CC.fecharLicao = function () {
    if (CC.fecharLeitor) CC.fecharLeitor();
    CC.sair(document.querySelector('.licao-dia:not(.saindo)'));
    sessao = null;
  };

  // O retrato de antes da leitura: é contra ele que a celebração mede o que mudou.
  function fotoDeAntes(numero) {
    const seq = CC.sequencia();
    const dia = D.plano[numero - 1];
    return {
      lido: CC.leu(numero),
      ofensiva: seq.atual,
      feitoHoje: seq.feitoHoje,
      niveis: CC.fotoDosNiveis(),
      missoes: Object.fromEntries(CC.missoesDoDia().map((m) => [m.id, m.valor])),
      livros: (dia.livros || []).filter((l) => CC.livroCompletoEm(l)),
      unidade: CC.unidadeCompletaEm(CC.unidadeDoDia(numero).numero),
    };
  }

  // As partes do dia já marcadas (Antigo e Novo Testamento) ficam guardadas neste aparelho,
  // por conta: é o que enche o anel do nó de hoje na trilha e o que a lição reabre marcado
  // quando a pessoa sai no meio. O dia só conta como lido com as duas partes.
  const CHAVE_PARTES = 'cc.partes';
  const donoPartes = () => (CC.quem && CC.quem.usuario) || '';
  function partesGuardadas(numero) {
    try {
      const p = JSON.parse(localStorage.getItem(CHAVE_PARTES) || 'null');
      return p && p.dono === donoPartes() && p.dia === numero && p.data === CC.hojeIso() ? p : { antigo: false, novo: false };
    } catch (e) { return { antigo: false, novo: false }; }
  }
  function guardarPartes(numero, marcadas) {
    try { localStorage.setItem(CHAVE_PARTES, JSON.stringify({ dono: donoPartes(), dia: numero, data: CC.hojeIso(), antigo: !!marcadas.antigo, novo: !!marcadas.novo })); } catch (e) { /* segue */ }
  }
  CC.fracaoDoDia = (numero) => {
    if (CC.leu(numero)) return 1;
    const dia = D.plano[numero - 1];
    const trilhas = trilhasDe(dia);
    const p = partesGuardadas(numero);
    return trilhas.length ? trilhas.filter(([k]) => p[k]).length / trilhas.length : 0;
  };

  CC.montarLicao = function (dia) {
    const numero = Math.min(Math.max(1, Number(dia) || 1), D.plano.length);
    if (!sessao || sessao.dia !== numero) {
      const antes = fotoDeAntes(numero);
      sessao = {
        dia: numero,
        tela: 'leitura',
        modo: 'oracao',
        antes,
        // as passagens lidas aqui no app (um dia lido no app tem as duas; o de papel, as que a
        // pessoa ler aqui depois)
        marcadas: antes.lido && CC.lidoNoApp(numero) ? { antigo: true, novo: true } : { antigo: partesGuardadas(numero).antigo, novo: partesGuardadas(numero).novo },
      };
      CC.gravar('dia', numero);
      // A lição de um dia ainda não lido foi aberta: um contador por data no diário (como
      // "leitor" e "notas"), nunca texto. É o que deixa o painel do dono ver quem abre a
      // lição e não termina, nos primeiros dias de conta.
      if (!antes.lido && CC.marcarNoDiario) CC.marcarNoDiario('abriu');
    }
    // a tela do dia lido já vem chegando enquanto a pessoa lê
    pedirDiaLido().catch(() => {});
    const direto = pedidoDireto === numero;
    pedidoDireto = 0;
    if (direto && sessao.tela === 'leitura') sessao.direto = true;
    desenhar();
    if (direto && sessao.tela === 'leitura' && sessao.abrirLeitor && !(CC.leitorAberto && CC.leitorAberto())) {
      const dia = D.plano[numero - 1];
      const falta = trilhasDe(dia).find(([k]) => !(CC.lidoNoApp(numero) || sessao.marcadas[k]));
      if (falta) sessao.abrirLeitor(falta[0]); else sessao.direto = false;
    }
  };

  const APOIO = [
    ['versiculos', 'Versículos destes livros', 'cartao'],
    ['conexoes', 'Conexões', 'cartao'],
    ['pessoas', 'Pessoas', 'pilula'],
    ['eventos', 'Eventos', 'pilula'],
    ['lugares', 'Lugares', 'pilula'],
    ['temas', 'Temas', 'pilula'],
    ['livros', 'Fichas dos livros', 'cartao'],
  ];
  const totalApoio = (dia) => APOIO.reduce((s, [k]) => s + (dia.rel[k] || []).length, 0);

  const trilhasDe = (dia) => [['antigo', 'Antigo Testamento', dia.antigo], ['novo', 'Novo Testamento', dia.novo]]
    .filter(([, , ref]) => ref);

  function desenhar() {
    const dia = D.plano[sessao.dia - 1];
    const u = CC.unidadeDoDia(sessao.dia);
    const trilhas = trilhasDe(dia);

    // A barra acompanha a lição inteira: a leitura enche a primeira metade e a reflexão a
    // segunda. Ela só chega ao fim ao terminar de orar, e não já cheia na hora de pensar.
    let fracao = 1;
    if (sessao.tela === 'leitura') {
      fracao = CC.leu(sessao.dia) ? 0.5 : trilhas.filter(([k]) => sessao.marcadas[k]).length / (trilhas.length * 2);
    }

    let el = document.querySelector('.licao-dia:not(.saindo)');
    // Redesenhar a MESMA tela (marcar uma passagem, a sincronização que chama CC.redesenhar)
    // deixa o palco onde a pessoa estava; só uma tela nova da lição, ou outro dia, começa no
    // topo. Antes o palco voltava sempre ao zero, e marcar a passagem de baixo jogava a lição
    // para o alto (relato do dono, 09/10).
    const qualTela = sessao.dia + ':' + sessao.tela;
    const palcoAntes = el && el.dataset.tela === qualTela ? el.querySelector('.licao-palco') : null;
    const rolagemAntes = palcoAntes ? palcoAntes.scrollTop : 0;
    const focoAntes = el && el.contains(document.activeElement) ? document.activeElement.dataset.ler : '';
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      document.body.appendChild(el);
    }
    el.className = 'licao licao-dia c-' + u.cor + ' tela-' + sessao.tela;
    el.setAttribute('aria-label', 'Dia ' + sessao.dia);

    const tela = ({ leitura: telaLeitura, festa: telaFesta, fundo: telaFundo, escrever: telaEscrever })[sessao.tela](dia, u, trilhas);
    el.innerHTML = (tela.semTopo ? '' : '<div class="licao-topo">'
      + '<button class="fechar" data-fechar aria-label="Fechar">' + CC.ico('fechar') + '</button>'
      + (tela.topo || CC.barra(fracao))
      + '</div>')
      + '<div class="licao-palco"><div class="interno">' + tela.corpo + '</div></div>'
      + '<div class="licao-pe' + (tela.pe ? '' : ' vazio') + '"><div class="interno">' + (tela.pe || '') + '</div></div>';

    const fechar = el.querySelector('[data-fechar]');
    if (fechar) fechar.onclick = sair;
    if (tela.ligar) tela.ligar(el);

    el.dataset.tela = qualTela;
    const palco = el.querySelector('.licao-palco');
    if (palco) palco.scrollTop = rolagemAntes;
    // O foco vai para o título numa tela nova; no redesenho, volta ao botão de marcar que foi
    // tocado (o innerHTML trocou o elemento), sem rolar.
    const tocado = palcoAntes && focoAntes ? el.querySelector('[data-ler="' + focoAntes + '"]') : null;
    const titulo = el.querySelector('h1');
    if (tocado) tocado.focus({ preventScroll: true });
    else if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }); }
  }

  function sair() {
    CC.fecharLicao();
    location.hash = '#/';
  }

  const ir = (tela) => { sessao.tela = tela; desenhar(); };

  function botao(rotulo, atributo, ligado, classe) {
    return '<button class="botao ' + (classe || 'cor') + '" ' + atributo + (ligado === false ? ' disabled' : '') + '>'
      + CC.esc(rotulo) + '</button>';
  }

  const primeiroNome = () => String(CC.apelido() || (CC.quem || {}).nome || '').trim().split(/\s+/)[0];

  // ---------- leitura ----------
  // Ler no app conta tudo; "Li na minha Bíblia" conta para a chama, o progresso, a unidade e os
  // amigos, mas não para os baús nem para as cartas (02b-jogo.js, CC.bauLiberado). Cada passagem é
  // um cartão inteiro que abre o leitor, com o ✓ quando foi lida. Marcar sem ler não existe mais:
  // a passagem conta quando o leitor destrava "Terminei a leitura" (04b-leitor.js).
  // sessao.marcadas: as passagens lidas aqui no app hoje (as partes guardadas neste aparelho).
  const textoIndisponivel = () => !CC.traducao() || !(CC.appServido && CC.appServido())
    || (typeof navigator !== 'undefined' && navigator.onLine === false) || !!CC.textoFalhou;

  // A folha de "Li na minha Bíblia": curta, sem prova de leitura. Confirmar marca o dia como lido,
  // com a origem 'papel'.
  function folhaPapel(aoConfirmar) {
    const hoje = sessao && sessao.dia === CC.diaAtual();
    CC.folha('<h2>Li na minha Bíblia</h2>'
      + '<p>Leu as passagens ' + (hoje ? 'de hoje' : 'do dia ' + sessao.dia) + ' na sua Bíblia? O dia conta para a sua chama. '
      + 'O baú da semana abre com as leituras feitas aqui.</p>'
      + '<div class="acoes"><button class="botao" data-papel-sim>Sim, li</button>'
      + '<button class="botao plano" data-fechar>Voltar</button></div>', {
      rotulo: 'Li na minha Bíblia',
      classe: 'folha-papel',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-papel-sim]').onclick = () => { fechar(); aoConfirmar(); };
      },
    });
  }
  CC.folhaPapel = folhaPapel;

  function telaLeitura(dia, u, trilhas) {
    const marcadas = sessao.marcadas;
    const traducao = CC.traducao();
    const lidoDia = CC.leu(sessao.dia);
    const papel = CC.origemDoDia(sessao.dia) === 'papel';
    // no app: as passagens lidas aqui (o dia lido no app tem todas)
    const noApp = (k) => (lidoDia && !papel) || !!marcadas[k];
    const semTexto = textoIndisponivel();

    const cartoes = trilhas.map(([chave, rot, ref]) => {
      const feita = lidoDia || !!marcadas[chave];
      const minutos = CC.minutosDoDia({ trechos: CC.trechosDaTrilha(dia, chave) });
      const sub = papel && !marcadas[chave] ? 'lida na sua Bíblia' : 'cerca de ' + minutos + ' min';
      const etiqueta = rot + ', ' + ref + ', ' + sub + (feita ? ', lida' : '');
      const dentro = '<span class="cabeca-passagem">'
        + '<span class="marca-trilha" aria-hidden="true">' + CC.ico(feita ? 'certo' : (chave === 'antigo' ? 'marcador' : 'livro')) + '</span>'
        + '<span class="textos"><span class="rot">' + rot + '</span>'
        + '<span class="ref">' + nb(CC.esc(ref)) + '</span>'
        + '<span class="tempo">' + sub + '</span></span>'
        + (traducao ? '<span class="seta-passagem" aria-hidden="true">' + CC.ico('avancar') + '</span>' : '')
        + '</span>';
      return traducao
        ? '<button class="passagem tocavel' + (feita ? ' feita' : '') + '" data-ler="' + chave + '" aria-label="' + CC.esc(etiqueta) + '">' + dentro + '</button>'
        : '<div class="passagem' + (feita ? ' feita' : '') + '">' + dentro + '</div>';
    }).join('');

    const faltam = trilhas.filter(([k]) => !noApp(k));
    const algumaLida = trilhas.some(([k]) => noApp(k));
    const todas = lidoDia || !faltam.length;
    // Antes de ler: o título do dia e a placa "Onde estamos" (03c-contexto.js), com o mapa da
    // história, o contexto e o que procurar.
    const ctx = CC.contextoDoDia ? CC.contextoDoDia(sessao.dia) : null;
    const titulo = sessao.antes.lido ? 'Revisar o dia ' + sessao.dia : (ctx && ctx.titulo ? ctx.titulo : 'Leitura de hoje');
    let dica;
    if (papel) dica = 'Você leu este dia na sua Bíblia. Lido aqui, ele conta também para o baú.';
    else if (sessao.antes.lido) dica = 'Toque numa passagem para ler de novo.';
    else if (!traducao) dica = 'Abra a sua Bíblia, leia as passagens e conclua o dia.';
    else dica = trilhas.length === 1 ? 'Leia a passagem e conclua o dia.' : 'Leia as duas passagens e conclua o dia.';

    // "Sim, li": o dia conta na hora e a tela do dia lido vem em seguida (sem baú)
    const marcarPapel = () => {
      CC.vibrar('conquista');
      CC.marcarLido(sessao.dia, 'papel');
      iniciarCelebracao();
    };
    // "Li na minha Bíblia": um link discreto; sem o texto (sem rede, sem tradução ou o texto que
    // não abriu), à frente, como botão.
    const linkPapel = lidoDia ? ''
      : (semTexto
        ? '<button class="botao contorno papel-destaque" data-papel>' + CC.ico('livro') + 'Li na minha Bíblia</button>'
        : '<p class="linha-papel"><button class="link-inline" data-papel>Li na minha Bíblia</button></p>');

    let pe;
    if (todas) pe = botao(sessao.antes.lido ? 'Ver a reflexão do dia' : 'Concluir o dia', 'data-concluir');
    else if (!traducao) pe = '';
    else if (!algumaLida) pe = '<button class="botao cor" data-ler-pe="' + faltam[0][0] + '">' + CC.ico('folha') + 'Começar a leitura</button>';
    else pe = '<button class="botao cor" data-ler-pe="' + faltam[0][0] + '">' + CC.ico('folha') + 'Continuar: ' + nb(CC.esc(faltam[0][2])) + '</button>';

    return {
      // .cabeca-licao: só apresentação, a folha do alto de cada passo (22-leitura.css)
      corpo: '<div class="cabeca-licao"><span class="etiqueta">Unidade ' + u.numero + ' · Dia ' + sessao.dia + '</span>'
        + '<h1 class="passo-titulo">' + CC.esc(titulo) + '</h1>'
        + '<p class="passo-dica">' + CC.esc(dica) + '</p></div>'
        + (CC.cartaoOndeEstamos ? CC.cartaoOndeEstamos(sessao.dia) : '')
        + cartoes
        + (trilhas.length === 1 ? '<p class="passo-dica">Hoje é mais leve: uma leitura só!</p>' : '')
        + linkPapel,
      pe,
      ligar(el) {
        const abrir = (chave) => CC.abrirLeitor({
          dia,
          chave,
          trilhas,
          cor: u.cor,
          // no leitor, "lida" é lida aqui: o dia de papel ainda pode ser lido no app
          lida: (k) => noApp(k),
          minutos: (k) => CC.minutosDoDia({ trechos: CC.trechosDaTrilha(dia, k) }),
          // a última passagem lida conclui o dia na hora: o leitor fecha direto na tela do dia lido
          marcar: (k) => {
            if (marcadas[k]) return;
            marcadas[k] = true;
            guardarPartes(sessao.dia, marcadas);
            if (trilhas.every(([c]) => marcadas[c])) { CC.marcarLido(sessao.dia, 'app'); CC.vibrar('conquista'); iniciarCelebracao(); return; }
            desenhar();
          },
          contexto: true,
          aoFechar: sessao.direto ? () => { sair(); } : null,
          papel: lidoDia ? null : () => folhaPapel(marcarPapel),
        });
        sessao.abrirLeitor = abrir;
        el.querySelectorAll('[data-ler]').forEach((b) => { b.onclick = () => { sessao.direto = false; abrir(b.dataset.ler); }; });
        const lerPe = el.querySelector('[data-ler-pe]');
        if (lerPe) lerPe.onclick = () => { sessao.direto = false; abrir(lerPe.dataset.lerPe); };
        const papelBt = el.querySelector('[data-papel]');
        if (papelBt) papelBt.onclick = () => folhaPapel(marcarPapel);
        const concluir = el.querySelector('[data-concluir]');
        if (concluir) concluir.onclick = () => { CC.vibrar('conquista'); iniciarCelebracao(); };
      },
    };
  }

  // ---------- depois da leitura ----------
  // A Palavra antes do aplauso. Antes eram até nove telas de festa, cada uma pedindo um
  // toque, entre marcar a leitura e chegar à reflexão, e o mesmo sétimo dia era comemorado
  // três vezes. Agora: a leitura conta na hora de marcar, a reflexão vem em seguida, e no
  // fim uma tela só junta tudo o que o dia trouxe.
  function iniciarCelebracao() {
    const dia = D.plano[sessao.dia - 1];
    const u = CC.unidadeDoDia(sessao.dia);
    const ganhou = CC.leu(sessao.dia) && !sessao.antes.lido;
    if (!ganhou) { ir('festa'); return; }

    const seq = CC.sequencia();
    const missoes = CC.conferirMissoes();
    CC.guardarConquistas();
    const subiram = CC.conquistasComNivel().filter((c) => c.nivel > (sessao.antes.niveis[c.id] || 0));
    const livros = (dia.livros || []).filter((l) => CC.livroCompletoEm(l) && !sessao.antes.livros.includes(l));
    const unidade = !sessao.antes.unidade && CC.unidadeCompletaEm(u.numero);
    sessao.celebracao = { seq, missoes, subiram, livros, unidade, amigos: undefined };

    if (CC.publicarNovidades) {
      CC.publicarNovidades({
        ofensiva: CC.MARCOS_OFENSIVA.includes(seq.atual) && seq.atual > sessao.antes.ofensiva ? seq.atual : 0,
        niveis: subiram, livros, unidade: unidade ? u.numero : 0,
      });
    }
    // O servidor precisa desta leitura antes de contar o propósito com os amigos.
    const carregar = CC.carregarAmigos && location.protocol.startsWith('http')
      ? CC.salvarNoServidor().then(() => CC.carregarAmigos()) : Promise.resolve(null);
    sessao.celebracao.pedidoAmigos = carregar.then((d) => {
      if (sessao && sessao.celebracao) sessao.celebracao.amigos = d;
      return d;
    }).catch(() => null);
    ir('festa');
  }

  // ---------- depois de ler: uma tela só ----------
  // A tela do dia lido mora na peça src/sob-demanda/dia-lido.js (o index.html tem teto de 1 MB),
  // pedida assim que a lição abre e guardada pelo service worker. Enquanto ela chega, a casca
  // mostra "Dia N lido" com o esqueleto; sem ela (sem rede na primeira vez), o dia já contou e a
  // casca fica com o "Voltar à trilha".
  const pedirDiaLido = () => CC.pedirPeca(window.DIA_LIDO, () => !!CC.telaDiaLido);
  CC.pedirDiaLido = pedirDiaLido;
  // e é pedida também logo depois da abertura do app, para o service worker já guardá-la
  if (CC.quandoCarregar) CC.quandoCarregar(() => setTimeout(() => { if (CC.appServido && CC.appServido()) pedirDiaLido().catch(() => {}); }, 6000));
  const pontes = { sessao: () => sessao, ir, sair, botao, nb, primeiroNome, totalApoio, pintarVersiculo };
  function telaFesta(dia, u) {
    if (CC.telaDiaLido) return CC.telaDiaLido(pontes, dia, u);
    const numero = sessao.dia;
    let falhou = false;
    pedirDiaLido().then(() => { if (sessao && sessao.dia === numero && sessao.tela === 'festa') desenhar(); }, () => { falhou = true; });
    return {
      semTopo: true,
      corpo: '<div class="resumo-dia"><div class="cabeca-licao"><div class="chama-palco">' + CC.icoChama(CC.sequencia().atual) + '</div>'
        + '<h1 class="rotulo-ofensiva">' + (CC.leu(numero) ? 'Dia ' + numero + ' lido' : 'Dia ' + numero) + '</h1></div>'
        + (falhou ? '' : CC.esqueleto('texto')) + '</div>',
      pe: botao('Voltar à trilha', 'data-voltar-trilha'),
      ligar(el) { el.querySelector('[data-voltar-trilha]').onclick = () => { sair(); }; },
    };
  }

  // O versículo vem da tradução escolhida, para a pessoa guardar a mesma redação que leu.
  // Na revisão do dia o botão de escrever mora no cartão: sem o texto (sem tradução ou sem
  // rede), o cartão sai só com a referência, para o botão não sumir junto.
  function pintarVersiculo(alvo, ref, opcoes) {
    if (!alvo) return;
    const pedido = CC.textoDoVersiculo ? CC.textoDoVersiculo(ref) : Promise.resolve(null);
    pedido.then((texto) => {
      if (!alvo.isConnected) return;
      if (!texto && !(opcoes && opcoes.escrever)) { alvo.innerHTML = ''; return; }
      alvo.innerHTML = CC.cartaoVersiculo(ref, texto || '', opcoes);
      CC.ligarCartaoVersiculo(alvo, ref, opcoes);
    });
  }

  // sigla: a tradução do texto (o estudo da célula tem a dele); sem ela, a da pessoa. A figura
  // leva a referência e a sigla, para cada cartão da tela ser ligado com o que é dele.
  CC.cartaoVersiculo = (ref, texto, { semAcoes, escrever, rotuloCor, sigla } = {}) => {
    const t = CC.traducao(sigla);
    return '<figure class="cartao-versiculo' + (texto ? '' : ' sem-texto') + '" data-ref="' + CC.esc(ref) + '"' + (sigla ? ' data-sigla="' + CC.esc(sigla) + '"' : '') + '>'
      + (texto ? '<span class="aspas" aria-hidden="true">“</span><blockquote>' + CC.esc(texto) + '</blockquote>' : '')
      + '<figcaption><b>' + nb(CC.esc(ref)) + '</b>' + (t && texto ? ' · ' + CC.esc(t.abreviatura) : '') + '</figcaption>'
      + (semAcoes ? '' : CC.versiculos.acoesDoCartao(ref, { escrever, rotuloCor, sigla }))
      + '</figure>';
  };
  // As ações são as mesmas dos leitores (04e-versiculos.js): marcar, nota, Juntos, copiar.
  // Liga cada cartão de raiz com a referência, a tradução e o texto dele; ref vale só para um
  // cartão sem data-ref. Antes só o primeiro da tela era ligado.
  CC.ligarCartaoVersiculo = (raiz, ref, opcoes) => {
    const cartoes = raiz.matches && raiz.matches('.cartao-versiculo') ? [raiz] : [...raiz.querySelectorAll('.cartao-versiculo')];
    for (const figura of cartoes) {
      const citacao = figura.querySelector('blockquote');
      const sigla = figura.dataset.sigla;
      CC.versiculos.ligarCartao(figura, figura.dataset.ref || ref, citacao ? citacao.textContent : '', sigla ? Object.assign({}, opcoes, { sigla }) : opcoes);
    }
  };

  // ---------- ir mais fundo ----------
  function telaFundo(dia) {
    const blocos = APOIO.map(([chave, titulo, forma]) => {
      const ids = dia.rel[chave] || [];
      if (!ids.length) return '';
      const lista = forma === 'cartao'
        ? '<div class="grade">' + ids.map(CC.itemNota).join('') + '</div>'
        : '<div class="pilulas">' + ids.map(CC.pilulaNota).join('') + '</div>';
      return CC.tituloSecao(titulo, ids.length > 3 ? ids.length + ' notas' : '') + lista;
    }).join('');

    return {
      corpo: '<div class="cabeca-licao"><span class="etiqueta">' + nb(CC.esc(CC.passagemDe(dia))) + '</span>'
        + '<h1 class="passo-titulo">Ir mais fundo</h1>'
        + '<p class="passo-dica">Notas sobre os livros de hoje.</p></div>'
        + blocos,
      pe: botao('Voltar', 'data-voltar'),
      ligar(el) {
        el.querySelector('[data-voltar]').onclick = () => ir('festa');
        CC.ligarNotas(el);
      },
    };
  }

  // ---------- escrever ----------
  // Escrever não vale pontos nem festa: é conversa com Deus e fica só com a pessoa.
  function telaEscrever(dia) {
    const r = CC.registro(sessao.dia);
    if (r.o || r.i || r.a) sessao.modo = sessao.modo === 'oracao' && !sessao.escolheu ? 'oia' : sessao.modo;
    const campos = sessao.modo === 'oia' ? ['o', 'i', 'a', 'oracao'] : ['oracao'];
    // Tocar numa frase de oração abre aqui com ela já escrita, depois do que já havia.
    const frase = sessao.modo === 'oracao' ? (sessao.frasePronta || '') : '';
    const valor = (chave) => (chave === 'oracao' && frase
      ? ((r.oracao || '').trim() ? r.oracao.trimEnd() + '\n\n' : '') + frase
      : r[chave] || '');
    // A nota do versículo do dia (feita nos leitores) continua à mão aqui, onde se escreve.
    const refDoDia = CC.reflexaoDoDia(sessao.dia).ref;
    const notasVerso = refDoDia && CC.lerRef(refDoDia) ? CC.versiculos.notasDoTrecho(CC.lerRef(refDoDia)) : [];
    const temNotaVerso = notasVerso.length > 0;
    const perguntas = CC.reflexaoDoDia(sessao.dia).perguntas || [];
    const p = Number.isInteger(sessao.pergunta) ? perguntas[sessao.pergunta] : null;
    const pergunta = p ? (Array.isArray(p) ? p[1] : p) : '';

    return {
      topo: '<span class="salvo" id="salvo" role="status"></span>',
      corpo: '<div class="cabeca-licao"><span class="etiqueta">' + nb(CC.esc(CC.passagemDe(dia))) + '</span>'
        + '<h1 class="passo-titulo">Escrever sobre hoje</h1></div>'
        // a pergunta que a pessoa tocou em "Pensar" fica em cima do que ela escreve
        + (pergunta ? '<p class="pergunta-escolhida"><span class="etiqueta">Para pensar</span>' + CC.esc(pergunta) + '</p>' : '')
        + '<div class="segmentado" role="group" aria-label="Como escrever">'
        + '<button data-modo="oracao" aria-pressed="' + (sessao.modo === 'oracao') + '">Oração</button>'
        + '<button data-modo="oia" aria-pressed="' + (sessao.modo === 'oia') + '">Observar, entender, aplicar</button>'
        + '</div>'
        + (sessao.modo === 'oia' ? '<p class="passo-dica pequena ajuda-oia">O que o texto diz, o que ele quis dizer a quem leu primeiro e o que muda na sua vida hoje.</p>' : '')
        + campos.map((chave) => {
          const [rotulo, dica, exemplo] = CAMPOS[chave];
          return '<div class="campo"><label for="campo-' + chave + '">' + rotulo + '</label>'
            + '<span class="dica-campo">' + dica + '</span>'
            + '<textarea id="campo-' + chave + '" data-campo="' + chave + '" placeholder="' + CC.esc(chave === 'oracao' && sessao.dicaOracao ? sessao.dicaOracao : exemplo) + '"'
            + (campos.length === 1 ? ' class="alto"' : '') + '>' + CC.esc(valor(chave)) + '</textarea></div>';
        }).join('')
        + (temNotaVerso ? '<p class="nota-do-verso">' + CC.ico('caneta') + '<span>Você tem uma nota em ' + nb(CC.esc(refDoDia)) + '. '
          + '<button class="link-inline" data-nota-do-verso>Ver a nota</button></span></p>' : ''),
      pe: botao('Pronto', 'data-pronto'),
      ligar(el) {
        const salvo = el.querySelector('#salvo');
        el.querySelectorAll('[data-campo]').forEach((ta) => {
          // com o teclado aberto, o que se digita fica à vista, acima do "Pronto"
          const cursorAVista = () => {
            if (!ta.isConnected) return;
            const pe = el.querySelector('.licao-pe');
            const vv = window.visualViewport;
            const baixo = Math.min(vv ? vv.offsetTop + vv.height : innerHeight, pe ? pe.getBoundingClientRect().top : innerHeight) - 12;
            const r = ta.getBoundingClientRect();
            const palco = el.querySelector('.licao-palco');
            if (r.bottom > baixo && palco) palco.scrollTop += Math.min(r.bottom - baixo, r.top - 80);
          };
          ta.addEventListener('focus', () => setTimeout(cursorAVista, 320));
          if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { if (document.activeElement === ta) cursorAVista(); });
          ta.addEventListener('input', () => {
            const atual = { ...CC.registro(sessao.dia) };
            atual[ta.dataset.campo] = ta.value;
            CC.gravarRegistro(sessao.dia, atual);
            if (ta.dataset.campo === 'oracao') sessao.frasePronta = '';
            if (salvo) salvo.innerHTML = CC.ico('certo') + 'Salvo';
          });
        });
        // com a frase já escrita, o cursor vai para o fim dela (depois do foco no título)
        const campoOracao = el.querySelector('#campo-oracao');
        if (frase && campoOracao) {
          setTimeout(() => {
            if (!campoOracao.isConnected) return;
            campoOracao.focus({ preventScroll: true });
            const fim = campoOracao.value.length;
            campoOracao.setSelectionRange(fim, fim);
            campoOracao.scrollTop = campoOracao.scrollHeight;
          }, 0);
        }
        const notaVerso = el.querySelector('[data-nota-do-verso]');
        if (notaVerso) notaVerso.onclick = () => CC.versiculos.abrirPrevia(notasVerso, () => desenhar());
        el.querySelectorAll('[data-modo]').forEach((b) => {
          b.onclick = () => { sessao.modo = b.dataset.modo; sessao.escolheu = true; desenhar(); };
        });
        el.querySelector('[data-pronto]').onclick = () => {
          sessao.frasePronta = '';
          if (CC.temRegistro(sessao.dia)) CC.avisar('Guardado');
          ir('festa');
        };
      },
    };
  }
})(window.CC);
