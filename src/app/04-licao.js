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

  CC.fecharLicao = function () {
    if (CC.fecharLeitor) CC.fecharLeitor();
    CC.sair(document.querySelector('.licao:not(.saindo)'));
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
        marcadas: { antigo: antes.lido || partesGuardadas(numero).antigo, novo: antes.lido || partesGuardadas(numero).novo },
      };
      CC.gravar('dia', numero);
      // A lição de um dia ainda não lido foi aberta: um contador por data no diário (como
      // "leitor" e "notas"), nunca texto. É o que deixa o painel do dono ver quem abre a
      // lição e não termina, nos primeiros dias de conta.
      if (!antes.lido && CC.marcarNoDiario) CC.marcarNoDiario('abriu');
    }
    desenhar();
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
      fracao = trilhas.filter(([k]) => sessao.marcadas[k]).length / (trilhas.length * 2);
    } else if (sessao.tela === 'festa' || sessao.tela === 'escrever' || sessao.tela === 'fundo') {
      fracao = 0.5 + 0.5 * (ETAPAS.indexOf(sessao.etapaReflexao || 'guardar') + 1) / 4;
    }

    let el = document.querySelector('.licao:not(.saindo)');
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      document.body.appendChild(el);
    }
    el.className = 'licao licao-dia c-' + u.cor + ' tela-' + sessao.tela;
    el.setAttribute('aria-label', 'Dia ' + sessao.dia);

    const tela = ({ leitura: telaLeitura, festa: telaFesta, resumo: telaResumo, fundo: telaFundo, escrever: telaEscrever })[sessao.tela](dia, u, trilhas);
    el.innerHTML = (tela.semTopo ? '' : '<div class="licao-topo">'
      + '<button class="fechar" data-fechar aria-label="Fechar">' + CC.ico('fechar') + '</button>'
      + (tela.topo || CC.barra(fracao))
      + '</div>')
      + '<div class="licao-palco"><div class="interno">' + tela.corpo + '</div></div>'
      + '<div class="licao-pe' + (tela.pe ? '' : ' vazio') + '"><div class="interno">' + (tela.pe || '') + '</div></div>';

    const fechar = el.querySelector('[data-fechar]');
    if (fechar) fechar.onclick = sair;
    if (tela.ligar) tela.ligar(el);

    const palco = el.querySelector('.licao-palco');
    if (palco) palco.scrollTop = 0;
    const titulo = el.querySelector('h1');
    if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }); }
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
  function telaLeitura(dia, u, trilhas) {
    const marcadas = sessao.marcadas;
    const traducao = CC.traducao();

    const cartoes = trilhas.map(([chave, rot, ref]) => {
      const feita = !!marcadas[chave];
      const minutos = CC.minutosDoDia({ trechos: CC.trechosDaTrilha(dia, chave) });
      return '<div class="passagem' + (feita ? ' feita' : '') + '">'
        + '<div class="cabeca-passagem">'
        + '<span class="marca-trilha">' + CC.ico(feita ? 'certo' : (chave === 'antigo' ? 'marcador' : 'livro')) + '</span>'
        + '<span class="textos"><span class="rot">' + rot + '</span>'
        + '<span class="ref">' + nb(CC.esc(ref)) + '</span>'
        + '<span class="tempo">cerca de ' + minutos + ' min</span></span>'
        + '</div>'
        + '<div class="acoes-passagem">'
        + (traducao ? '<button class="botao pequeno cor" data-ler="' + chave + '">' + CC.ico('folha') + 'Ler aqui</button>' : '')
        + '<button class="botao pequeno marcar' + (feita ? ' ligado' : ' contorno') + '" data-trilha="' + chave + '" '
        + 'aria-pressed="' + feita + '">' + (feita ? CC.ico('certo') + 'Lido' : 'Marcar como lido') + '</button>'
        + '</div></div>';
    }).join('');

    const faltam = trilhas.filter(([k]) => !marcadas[k]);
    const todas = !faltam.length;
    // Antes de ler: o título do dia e a placa "Onde estamos" (03c-contexto.js), com o mapa da
    // história, o contexto e o que procurar. Sem eles o dia 1 abria em "Leitura de hoje" e
    // caía, sem aviso, na genealogia de Mateus 1.
    const ctx = CC.contextoDoDia ? CC.contextoDoDia(sessao.dia) : null;
    const titulo = sessao.antes.lido ? 'Revisar o dia ' + sessao.dia : (ctx && ctx.titulo ? ctx.titulo : 'Leitura de hoje');
    const dica = ctx && ctx.sub && !sessao.antes.lido ? ctx.sub
      : (traducao ? 'Leia aqui ou na sua Bíblia e marque ao terminar.' : 'Abra a sua Bíblia, leia as passagens e marque ao terminar.');

    const marcar = (k, valor) => {
      marcadas[k] = valor;
      guardarPartes(sessao.dia, marcadas);
      CC.marcarLido(sessao.dia, trilhas.every(([c]) => marcadas[c]));
      desenhar();
    };

    return {
      // .cabeca-licao: só apresentação, a folha do alto de cada passo (22-leitura.css)
      corpo: '<div class="cabeca-licao"><span class="etiqueta">Unidade ' + u.numero + ' · Dia ' + sessao.dia + '</span>'
        + '<h1 class="passo-titulo">' + CC.esc(titulo) + '</h1>'
        + '<p class="passo-dica">' + CC.esc(dica) + '</p></div>'
        + (CC.cartaoOndeEstamos ? CC.cartaoOndeEstamos(sessao.dia) : '')
        + cartoes
        + (trilhas.length === 1 ? '<p class="passo-dica">Hoje é mais leve: uma leitura só!</p>' : ''),
      // O rodapé diz a próxima leitura que falta e abre o texto dela; depois da última, vira
      // "Concluir o dia". Antes era um botão cinza parado ("Falta marcar…") e o "Ler aqui"
      // ficava abaixo da dobra. Sem tradução no app, a pessoa lê na Bíblia dela e só marca.
      pe: todas || !traducao
        ? botao(todas ? 'Concluir o dia' : 'Falta marcar ' + faltam.map(([, , r]) => nb(r)).join(' e '), 'data-concluir', todas)
        : '<button class="botao cor" data-ler-pe="' + faltam[0][0] + '">' + CC.ico('folha') + 'Ler ' + nb(CC.esc(faltam[0][2])) + '</button>',
      ligar(el) {
        const abrir = (chave) => CC.abrirLeitor({
          dia,
          chave,
          trilhas,
          cor: u.cor,
          lida: (k) => !!marcadas[k],
          marcar: (k) => { if (!marcadas[k]) marcar(k, true); },
        });
        el.querySelectorAll('[data-ler]').forEach((b) => { b.onclick = () => abrir(b.dataset.ler); });
        const lerPe = el.querySelector('[data-ler-pe]');
        if (lerPe) lerPe.onclick = () => abrir(lerPe.dataset.lerPe);
        el.querySelectorAll('[data-trilha]').forEach((b) => {
          b.onclick = () => {
            const ligando = !marcadas[b.dataset.trilha];
            CC.vibrar(ligando ? 'certo' : 'leve');
            marcar(b.dataset.trilha, ligando);
          };
        });
        const concluir = el.querySelector('[data-concluir]');
        if (concluir && !concluir.disabled) concluir.onclick = () => { CC.vibrar('conquista'); iniciarCelebracao(); };
      },
    };
  }

  // ---------- depois da leitura ----------
  // A Palavra antes do aplauso. Antes eram até nove telas de festa, cada uma pedindo um
  // toque, entre marcar a leitura e chegar à reflexão, e o mesmo sétimo dia era comemorado
  // três vezes. Agora: a leitura conta na hora de marcar, a reflexão vem em seguida, e no
  // fim uma tela só junta tudo o que o dia trouxe.
  const ETAPAS = ['guardar', 'pensar', 'orar'];

  function iniciarCelebracao() {
    const dia = D.plano[sessao.dia - 1];
    const u = CC.unidadeDoDia(sessao.dia);
    const ganhou = CC.leu(sessao.dia) && !sessao.antes.lido;
    sessao.etapaReflexao = 'guardar';
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

  // A semana em volta de hoje: cinco dias para trás, hoje e amanhã.
  function faixaDaSemana() {
    const hoje = CC.hojeIso();
    const feitas = CC.datasFeitas();
    const protegidos = CC.sequencia().protegidos;
    const dias = [-5, -4, -3, -2, -1, 0, 1].map((n) => {
      const d = CC.somaDias(hoje, n);
      const estado = n > 0 ? 'futuro' : (feitas.has(d) ? 'feito' : (protegidos.includes(d) ? 'escudo' : 'vazio'));
      return { d, n, estado };
    });
    // a faixa acesa cobre a corrida que termina hoje
    let inicio = 5;
    while (inicio > 0 && dias[inicio - 1].estado !== 'vazio') inicio--;
    const nome = (d) => CC.diaDaSemana(d).replace(/^./, (c) => c.toUpperCase());
    return '<div class="semana-ofensiva" style="--de:' + inicio + ';--ate:6">'
      + '<div class="nomes">' + dias.map((x) => '<span class="' + (x.n === 0 ? 'hoje' : '') + '">' + nome(x.d) + '</span>').join('') + '</div>'
      + '<div class="trilho"><i class="aceso"></i>' + dias.map((x, i) => '<span class="marca-dia ' + x.estado + '" style="--i:' + i + '">'
        + (x.estado === 'feito' ? CC.ico('certo') : (x.estado === 'escudo' ? CC.ico('escudo') : '')) + '</span>').join('') + '</div></div>';
  }

  // ---------- a reflexão: guardar, pensar, orar ----------
  // Um botão principal só, que muda a cada etapa, e "Pular por hoje" discreto. O que é do dia
  // fica dentro da etapa (escrever no cartão do versículo, ir mais fundo logo abaixo do
  // contexto); o que leva a outro dia ("Ler o dia N") só aparece no fim.
  const ICONE_ETAPA = { guardar: 'marcador', pensar: 'lupa', orar: 'oracao' };
  // O título da etapa leva o ícone dela, no mesmo círculo sálvia dos passos do topo.
  const tituloEtapa = (etapa, texto) => '<h2 class="titulo-etapa"><span class="ico-etapa">' + CC.ico(ICONE_ETAPA[etapa]) + '</span>'
    + '<span>' + CC.esc(texto) + '</span></h2>';
  // As frases de oração terminam em reticências: é um começo para a pessoa completar.
  const comReticencias = (f) => (/(…|\.\.\.)$/.test(f) ? f : f + '…');
  const semReticencias = (f) => f.replace(/\s*(…|\.\.\.)$/, '');

  function telaFesta(dia) {
    const lido = CC.leu(sessao.dia);
    const ganhou = lido && !sessao.antes.lido && !!sessao.celebracao;
    const proximo = sessao.dia + 1;
    const etapa = sessao.etapaReflexao || 'guardar';
    const r = CC.reflexaoDoDia(sessao.dia);
    const seq = CC.sequencia();
    const escrever = CC.temRegistro(sessao.dia) ? 'Escrever mais' : 'Escrever';
    const apoio = totalApoio(dia);
    const escolhida = Number.isInteger(sessao.pergunta) ? sessao.pergunta : -1;
    // ao passar para orar, pensar encolhe e fica só a pergunta escolhida, como lembrete
    const encolhida = etapa === 'orar';
    const textoPergunta = (p) => (Array.isArray(p) ? p[1] : p);

    const avancar = { guardar: ['Pensar sobre isso', 'lupa'], pensar: ['Transformar em oração', 'oracao'], orar: ['Terminar', 'certo'] }[etapa];

    return {
      corpo: '<div class="festa"><div class="cabeca-licao">'
        + (ganhou ? '<p class="retorno-lido" role="status">' + CC.icoChama(seq.atual) + '<span><b>Dia ' + sessao.dia + ' lido.</b> Sua chama está acesa.</span></p>' : '')
        + '<h1>' + (ganhou ? 'Para levar com você' : 'Revisão do dia ' + sessao.dia) + '</h1>'
        + '<ol class="passos-reflexao" aria-label="Guardar, pensar e orar">'
        + ['Guardar', 'Pensar', 'Orar'].map((nome, i) => '<li' + (i <= ETAPAS.indexOf(etapa) ? ' class="ativa"' : '')
          + (i === ETAPAS.indexOf(etapa) ? ' aria-current="step"' : '') + '>' + nome + '</li>').join('') + '</ol></div>'
        // guardar: o versículo do dia, ou a nota nos dias em que um versículo solto confunde.
        // O botão de escrever fica no cartão, com o mesmo nome em todo lugar.
        + '<section class="etapa-reflexao" data-etapa-bloco="guardar">'
        + '<div id="festa-versiculo">' + (r.ref
          ? CC.esqueleto('texto')
          : '<figure class="cartao-versiculo nota-reflexao"><span class="etiqueta">Para entender hoje</span><p>' + CC.esc(r.nota) + '</p>'
            + '<div class="acoes-verso no-cartao"><div class="botoes-verso"><button class="botao pequeno contorno" data-escrever>'
            + CC.ico('caneta') + escrever + '</button></div></div></figure>') + '</div>'
        + (r.contexto ? '<p class="contexto-reflexao"><b>Contexto:</b> ' + CC.esc(r.contexto)
          + ' <button class="link-inline" data-nota-reflexao>Ler a nota</button></p>' : '')
        + (apoio ? '<button class="linha-fundo" data-fundo><span class="ico-linha">' + CC.ico('camadas') + '</span>'
          + '<span class="rotulo-linha">Ir mais fundo</span><span class="conta-linha">' + CC.plural(apoio, 'nota', 'notas') + '</span>'
          + CC.ico('direita') + '</button>' : '')
        + '</section>'
        // pensar: uma pergunta, escolhida pela pessoa
        + '<section class="etapa-reflexao etapa-pensar' + (encolhida ? ' encolhida' : '') + '" data-etapa-bloco="pensar"'
        + (ETAPAS.indexOf(etapa) >= 1 ? '' : ' hidden') + '>'
        + (encolhida
          ? '<div class="pensar-lembrete">' + tituloEtapa('pensar', 'Para pensar')
            + (escolhida >= 0 ? '<p class="lembrete-pergunta">' + CC.esc(textoPergunta(r.perguntas[escolhida])) + '</p>' : '') + '</div>'
          : '')
        + '<div class="pensar-inteiro" id="pensar-inteiro">'
        + '<span class="etiqueta">' + nb(CC.esc(r.pensamento ? (r.ref || r.passagem) : r.passagem + ' · ' + r.nomeGenero)) + '</span>'
        // a reflexão escrita para o dia, sobre o que acontece na leitura
        // recolhida no título, com "Ver o texto": as perguntas sobem para o alto da etapa
        + (r.pensamento
          ? '<figure class="pensamento-dia recolhivel"><div class="cabeca-pensamento">'
            + '<h2>' + CC.esc(r.titulo || 'A reflexão de hoje') + '</h2>'
            + '<button class="ver-texto-reflexao" data-ver-texto aria-expanded="false" aria-controls="texto-reflexao">'
            + '<span>Ver o texto</span>' + CC.ico('baixo') + '</button></div>'
            + '<p id="texto-reflexao" hidden>' + CC.esc(r.pensamento) + '</p></figure>'
          : '')
        + tituloEtapa('pensar', r.pensamento ? 'Para pensar' : 'Escolha uma pergunta')
        // As reflexões escritas trazem só a pergunta; as genéricas por gênero ainda vêm como
        // [rótulo, pergunta]. Sem rótulo não sai a etiqueta em cima. São opções: um círculo
        // marca a escolhida, e só uma fica escolhida por vez.
        + '<div class="perguntas-reflexao" role="group" aria-label="Perguntas para pensar">' + r.perguntas.map((p, i) => {
          const [rotulo, pergunta] = Array.isArray(p) ? p : ['', p];
          return '<button class="pergunta-reflexao" data-pergunta="' + i + '" aria-pressed="' + (i === escolhida) + '">'
            + '<span class="marca-escolha" aria-hidden="true"></span><span class="texto-pergunta">'
            + (rotulo ? '<span class="rotulo-pergunta">' + CC.esc(rotulo) + '</span>' : '') + '<span>' + CC.esc(pergunta) + '</span></span></button>';
        }).join('') + '</div>'
        + '<p class="passo-dica pequena dica-pensar"' + (escolhida >= 0 ? '' : ' hidden') + '>Fique um minuto com essa pergunta. Se ajudar, volte ao texto.</p>'
        + '</div>'
        // encolhida, só o título e a pergunta escolhida; o botão do fim abre tudo de novo
        + (encolhida
          ? '<button class="abrir-pensar" data-abrir-pensar aria-expanded="false" aria-controls="pensar-inteiro">'
            + '<span>' + (escolhida >= 0 ? 'Ver a reflexão e as perguntas' : 'Ver as perguntas') + '</span>' + CC.ico('baixo') + '</button>'
          : '')
        + '</section>'
        // orar: começos de frase para a pessoa completar, nunca uma oração pronta. Tocar numa
        // frase abre a escrita da oração já começando por ela.
        + '<section class="etapa-reflexao painel-orar" data-etapa-bloco="orar"' + (etapa === 'orar' ? '' : ' hidden') + '>'
        + tituloEtapa('orar', 'Ore com as suas palavras')
        + '<p class="dica-orar">Toque numa frase para começar a escrever por ela.</p>'
        + '<ul class="oracao-guia">' + r.oracao.map((frase, i) => '<li><button class="frase-oracao" data-frase-oracao="' + i + '">'
          + '<span>' + CC.esc(comReticencias(frase)) + '</span>' + CC.ico('caneta') + '</button></li>').join('') + '</ul>'
        + '<div class="pe-duplo-plano"><button class="botao contorno" data-orar-escrevendo>' + CC.ico('caneta') + 'Escrever</button>'
        + '<button class="botao plano" data-orei>Orei</button></div>'
        + '<p class="amem" hidden>Amém!</p>'
        + '</section>'
        + '</div>',
      pe: '<button class="botao cor" data-avancar>' + CC.ico(avancar[1]) + CC.esc(avancar[0]) + '</button>'
        + (etapa !== 'orar' ? '<button class="botao plano" data-pular>Pular por hoje</button>'
          // na revisão de um dia já lido, o próximo dia é a ação de quem terminou
          : (proximo <= D.plano.length && !ganhou ? '<button class="botao plano" data-proximo>' + CC.ico('avancar') + 'Ler o dia ' + proximo + '</button>' : '')),
      ligar(el) {
        const terminar = () => {
          if (ganhou) { ir('resumo'); return; }
          sair();
          setTimeout(() => CC.rolarAteAtual(true), 120);
        };
        const irPara = (bloco, suave) => {
          const alvo = document.querySelector('.licao [data-etapa-bloco="' + bloco + '"]');
          if (alvo) requestAnimationFrame(() => alvo.scrollIntoView({ block: 'start', behavior: suave && !CC.semMovimento() ? 'smooth' : 'auto' }));
        };
        el.querySelector('[data-avancar]').onclick = () => {
          const i = ETAPAS.indexOf(etapa);
          if (i < ETAPAS.length - 1) {
            sessao.etapaReflexao = ETAPAS[i + 1];
            desenhar();
            irPara(sessao.etapaReflexao, true);
            return;
          }
          terminar();
        };
        const pular = el.querySelector('[data-pular]');
        if (pular) pular.onclick = terminar;
        // o botão de escrever do cartão chega depois (o versículo carrega à parte)
        el.querySelector('.festa').addEventListener('click', (ev) => {
          if (ev.target.closest('[data-escrever]')) ir('escrever');
        });
        const fundo = el.querySelector('[data-fundo]');
        if (fundo) fundo.onclick = () => ir('fundo');
        const prox = el.querySelector('[data-proximo]');
        if (prox) prox.onclick = () => { CC.fecharLicao(); CC.abrirLicao(proximo); };
        if (r.ref) pintarVersiculo(el.querySelector('#festa-versiculo'), r.ref, { escrever, rotuloCor: true });

        el.querySelectorAll('[data-pergunta]').forEach((b) => {
          b.onclick = () => {
            sessao.pergunta = Number(b.dataset.pergunta);
            el.querySelectorAll('[data-pergunta]').forEach((x) => x.setAttribute('aria-pressed', x === b));
            el.querySelector('.dica-pensar').hidden = false;
          };
        });
        const verTexto = el.querySelector('[data-ver-texto]');
        if (verTexto) {
          verTexto.onclick = () => {
            const texto = el.querySelector('#texto-reflexao');
            texto.hidden = !texto.hidden;
            verTexto.setAttribute('aria-expanded', !texto.hidden);
            verTexto.querySelector('span').textContent = texto.hidden ? 'Ver o texto' : 'Recolher';
          };
        }
        const abrirPensar = el.querySelector('[data-abrir-pensar]');
        if (abrirPensar) {
          abrirPensar.onclick = () => {
            const bloco = el.querySelector('.etapa-pensar');
            const aberto = bloco.classList.toggle('encolhida') === false;
            abrirPensar.setAttribute('aria-expanded', aberto);
            abrirPensar.querySelector('span').textContent = aberto ? 'Recolher'
              : (escolhida >= 0 || Number.isInteger(sessao.pergunta) ? 'Ver a reflexão e as perguntas' : 'Ver as perguntas');
          };
        }
        const notaReflexao = el.querySelector('[data-nota-reflexao]');
        if (notaReflexao) notaReflexao.onclick = () => CC.folhaNota(r.idNota);
        const escreverOracao = (frase) => {
          sessao.modo = 'oracao';
          sessao.escolheu = true;
          sessao.dicaOracao = r.oracao.join('\n');
          sessao.frasePronta = frase || '';
          sessao.voltarPara = 'orar';
          ir('escrever');
        };
        el.querySelector('[data-orar-escrevendo]').onclick = () => escreverOracao('');
        el.querySelectorAll('[data-frase-oracao]').forEach((b) => {
          b.onclick = () => escreverOracao(semReticencias(r.oracao[Number(b.dataset.fraseOracao)]) + ' ');
        });
        el.querySelector('[data-orei]').onclick = (ev) => {
          ev.currentTarget.disabled = true;
          CC.marcarOrei();
          el.querySelector('.amem').hidden = false;
        };
        // de volta da escrita da oração: a tela reabre na etapa de orar, e não no alto
        if (sessao.voltarPara && etapa === 'orar') { const b = sessao.voltarPara; sessao.voltarPara = ''; irPara(b, false); }
      },
    };
  }

  // ---------- o resumo do dia ----------
  // Uma tela só, no fim: o fogo no estágio de hoje, a semana, e o que o dia trouxe
  // como destaque dentro dela (meta, chama que cresceu, conquista, livro, unidade, peça do
  // quadro, baú). O XP não aparece: ele é só um número para a própria pessoa, no Perfil.
  function telaResumo(dia, u) {
    const c = sessao.celebracao;
    const seq = CC.sequencia();
    const nome = primeiroNome();
    const subiuHoje = !sessao.antes.feitoHoje && seq.feitoHoje;
    // guardados aqui: os temporizadores de baixo podem disparar depois de a lição fechar,
    // e nesse momento a sessão já foi zerada
    const ofensivaAntes = sessao.antes.ofensiva;
    const diaDaSessao = sessao.dia;
    const estAntes = CC.estagioDaChama(sessao.antes.ofensiva);
    const est = CC.estagioDaChama(seq.atual);
    const lidos = CC.ler('lidos', []).length;

    const destaques = [];
    const item = (arte, titulo, sub, extra) => destaques.push('<li class="destaque-dia' + (extra ? ' ' + extra : '') + '">'
      + '<span class="arte-destaque">' + arte + '</span><span class="texto-destaque"><b>' + titulo + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></li>');

    if (subiuHoje && est.nivel > estAntes.nivel) {
      item(CC.icoChama(seq.atual), 'Sua chama agora é ' + est.nome, CC.esc(est.frase) + ' (' + est.ref + ')', 'chama');
    }
    if (CC.MARCOS_OFENSIVA.includes(seq.atual) && seq.atual > sessao.antes.ofensiva) {
      const proximoMarco = CC.MARCOS_OFENSIVA[CC.MARCOS_OFENSIVA.indexOf(seq.atual) + 1];
      item(CC.arte.calendario(seq.atual, 'agora'), 'Meta de ' + seq.atual + ' dias de ofensiva', proximoMarco ? 'Próxima meta: ' + proximoMarco + ' dias' : '', 'marco');
    }
    for (const q of c.subiram.slice(0, 3)) {
      const def = CC.CONQUISTAS.find((x) => x.id === q.id);
      item(CC.arte.medalha(q, false), (q.nivel === 1 ? 'Conquista nova: ' : 'Subiu de nível: ') + CC.esc(q.titulo), CC.esc(def.texto(def.niveis[q.nivel - 1])), 'conquista');
    }
    for (const l of c.livros.slice(0, 2)) item('<span class="arte-livro">' + CC.ico('livro') + '</span>', 'Você terminou ' + CC.esc(l) + '!', 'Fica marcado em Livros da Bíblia', 'livro');
    if (c.unidade) item(CC.arte.trofeu(u.cor, true), 'Unidade ' + u.numero + ' concluída!', CC.esc(u.titulo), 'unidade');
    if (CC.temBau(sessao.dia) && !CC.bauAberto(sessao.dia)) item(CC.arte.bau('pronto', 'madeira'), 'O baú do dia ' + sessao.dia + ' está pronto', 'Abra na trilha para ver o que tem dentro', 'bau');
    // O segundo dia seguido é o que mais decide: merece a sua própria festa, pequena.
    if (subiuHoje && seq.atual === 2) item('<span class="arte-volta">' + CC.ico('broto') + '</span>', 'Você voltou!', 'Voltar no dia seguinte é a parte mais difícil. Você voltou.', 'volta');
    // O gancho de amanhã: a passagem, o tempo de verdade e uma frase do que vem (escrita para os
    // primeiros dias; depois, o título da reflexão do dia seguinte). Sem isto o dia terminava em
    // "Até amanhã" sem dizer o que amanhã tem.
    const proximoDia = D.plano[sessao.dia];
    if (proximoDia && !CC.leu(proximoDia.numero)) {
      const ctxHoje = CC.contextoDoDia ? CC.contextoDoDia(sessao.dia) : null;
      const escritaAmanha = CC.reflexaoEscrita ? CC.reflexaoEscrita(proximoDia.numero) : null;
      const gancho = (ctxHoje && ctxHoje.amanha) || (escritaAmanha && escritaAmanha.titulo ? escritaAmanha.titulo + '.' : '');
      item('<span class="arte-amanha">' + CC.ico('avancar') + '</span>',
        'Amanhã: ' + CC.esc(CC.colarRef(CC.passagemDe(proximoDia))) + ', uns ' + CC.minutosDoDia(proximoDia) + ' min', CC.esc(gancho), 'amanha');
    }
    const feitas = c.missoes.lista.filter((m) => m.feita).length;
    item(CC.arte.bau(feitas === c.missoes.lista.length ? 'aberto' : 'travado', feitas === c.missoes.lista.length ? 'madeira' : ''),
      'Desafios do dia: ' + feitas + ' de ' + c.missoes.lista.length, feitas === c.missoes.lista.length ? 'Todos feitos' : '<a href="#/missoes" data-ver-desafios>Ver os desafios</a>', 'desafios');

    // A frase do fim do dia é uma das frases da ofensiva (as mesmas do carimbo), sorteada,
    // com a referência quando a frase tem uma.
    const f = CC.fraseDaOfensiva();
    const frase = CC.esc(f.linhas.join(' ')) + (f.ref ? ' <span class="ref-frase">' + CC.esc(f.ref) + '</span>' : '');

    return {
      semTopo: true,
      corpo: '<div class="resumo-dia"><div class="cabeca-licao">'
        + '<div class="chama-palco">' + CC.arte.faiscas() + CC.icoChama(seq.atual) + '</div>'
        + '<b class="numero-ofensiva" data-de="' + (subiuHoje ? sessao.antes.ofensiva : seq.atual) + '">' + (subiuHoje ? sessao.antes.ofensiva : seq.atual) + '</b>'
        + '<h1 class="rotulo-ofensiva">' + (seq.atual === 1 ? 'dia de ofensiva' : 'dias de ofensiva') + '</h1>'
        + '<p class="passo-dica">Dia ' + sessao.dia + ' · ' + nb(CC.esc(CC.passagemDe(dia))) + '</p>'
        + faixaDaSemana() + '</div>'
        + '<p class="frase-cena">' + frase + '</p>'
        + '<ul class="destaques">' + destaques.join('') + '</ul>'
        + linhaDoMapa(dia)
        + '<div id="resumo-amigos"></div>'
        + '<div class="progresso-plano"><span>' + lidos + ' de ' + D.plano.length + ' dias lidos</span>' + CC.barra(lidos / D.plano.length, 'fina') + '</div>'
        + '</div>',
      pe: '<div class="pe-duplo"><button class="botao contorno quadrado" data-compartilhar aria-label="Compartilhar">' + CC.ico('compartilhar') + '</button>'
        + botao(nome ? 'Até amanhã, ' + nome + '!' : 'Voltar à trilha', 'data-voltar-trilha') + '</div>',
      ligar(el) {
        CC.arte.confete(el, 26);
        const numero = el.querySelector('.numero-ofensiva');
        if (subiuHoje) setTimeout(() => {
          if (!numero.isConnected) return;
          numero.classList.add('subindo');
          CC.contar(numero, ofensivaAntes, seq.atual, 500);
        }, 600);
        el.querySelector('[data-voltar-trilha]').onclick = () => {
          CC.recemFeito = diaDaSessao;
          sair();
          setTimeout(() => CC.rolarAteAtual(true), 120);
          // conta nova que acabou de ler pela primeira vez: agora sim, instalar e lembretes
          if (CC.depoisDoPrimeiroDia) CC.depoisDoPrimeiroDia();
        };
        const verMapa = el.querySelector('[data-ver-mapa]');
        if (verMapa) verMapa.onclick = (ev) => { ev.preventDefault(); CC.recemFeito = diaDaSessao; CC.fecharLicao(); location.hash = verMapa.getAttribute('href'); };
        const desafios = el.querySelector('[data-ver-desafios]');
        if (desafios) desafios.onclick = (ev) => { ev.preventDefault(); CC.fecharLicao(); location.hash = '#/missoes'; };
        // Compartilhar gera a imagem de story da ofensiva com a frase que está na tela (f),
        // a mesma do parágrafo acima, e não uma sorteada de novo (01d-story.js).
        const compartilhar = el.querySelector('[data-compartilhar]');
        const pedido = { tipo: 'ofensiva', dias: seq.atual, frase: { linhas: f.linhas, ref: f.ref || '' } };
        setTimeout(() => { if (compartilhar.isConnected) CC.story.preparar(pedido).catch(() => null); }, 1200);
        compartilhar.onclick = async () => {
          compartilhar.disabled = true;
          await CC.imagemStory(pedido);
          compartilhar.disabled = false;
        };
        const alvo = el.querySelector('#resumo-amigos');
        if (c.amigos === undefined) c.pedidoAmigos.then(() => { if (alvo.isConnected) pintarAmigosDoResumo(alvo, c); });
        else pintarAmigosDoResumo(alvo, c);
      },
    };
  }

  // No fim do dia, o mapa do livro que a pessoa acabou de ler, quando ele já foi publicado
  // (conteudo/mapas/indice.json): os mapas moravam só no fim do Explorar (item 10).
  function linhaDoMapa(dia) {
    const mapa = CC.mapaDoLivro ? (dia.livros || []).map((l) => CC.mapaDoLivro(l)).find(Boolean) : null;
    if (!mapa) return '';
    return '<a class="linha-fundo linha-mapa" href="#/mapa/' + mapa.slug + '" data-ver-mapa><span class="ico-linha">' + CC.ico('mapa') + '</span>'
      + '<span class="rotulo-linha">Ver o mapa de ' + CC.esc(mapa.nome) + '<small>A história do livro numa tela</small></span>' + CC.ico('direita') + '</a>';
  }

  // Amigos no resumo: quem também leu hoje, e um botão pequeno para encorajar quem ainda não
  // leu. Nada de número de dias ao lado de um zero, nem ação principal empurrando a cobrar.
  function pintarAmigosDoResumo(alvo, c) {
    if (!c.amigos) { alvo.innerHTML = ''; return; }
    const amigos = c.amigos.amigos || [];
    // Sem amigo ainda: o convite de Juntos aqui mesmo, no fim do dia, que é quando se chama
    // alguém. "Com seus amigos" é a promessa da entrada, e nada nos primeiros dias a cumpria.
    if (!amigos.length) {
      alvo.innerHTML = '<div class="amigos-resumo"><button class="botao contorno pequeno" data-chamar>' + CC.ico('pessoas') + 'Chamar alguém para ler junto</button></div>';
      alvo.querySelector('[data-chamar]').onclick = () => { if (CC.convidar) CC.convidar(); };
      return;
    }
    for (const a of amigos) CC.anotarProposito(a.dias);
    const leram = amigos.filter((a) => a.leuHoje);
    if (leram.length) CC.marcarNoDiario('juntos');
    const semLer = amigos.find((a) => !a.leuHoje && !a.toqueEnviado);
    const primeiro = (a) => CC.esc(String(a.nome).split(' ')[0]);
    alvo.innerHTML = '<div class="amigos-resumo">'
      + (leram.length ? '<p class="lendo-junto-linha"><span class="rostos">' + leram.slice(0, 3).map((a) => CC.retratoAmigo(a, 'mini')).join('') + '</span>'
        + (leram.length === 1 ? primeiro(leram[0]) + ' também leu hoje' : leram.length + ' amigos também leram hoje') + '</p>' : '')
      + (semLer ? '<button class="botao contorno pequeno" data-encorajar="' + CC.esc(semLer.usuario) + '">' + CC.ico('aperto') + 'Dar um toque em ' + primeiro(semLer) + '</button>' : '')
      + '</div>';
    const b = alvo.querySelector('[data-encorajar]');
    if (b) {
      b.onclick = async () => {
        b.disabled = true;
        try {
          await CC.salvarNoServidor();
          await CC.api('api/toques', { para: semLer.usuario });
          semLer.toqueEnviado = true;
          b.innerHTML = CC.ico('certo') + 'Toque enviado para ' + primeiro(semLer);
        } catch (e) {
          b.disabled = false;
          CC.avisar(e.message);
        }
      };
    }
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

  CC.cartaoVersiculo = (ref, texto, { semAcoes, escrever, rotuloCor } = {}) => {
    const t = CC.traducao();
    return '<figure class="cartao-versiculo' + (texto ? '' : ' sem-texto') + '">'
      + (texto ? '<span class="aspas" aria-hidden="true">“</span><blockquote>' + CC.esc(texto) + '</blockquote>' : '')
      + '<figcaption><b>' + nb(CC.esc(ref)) + '</b>' + (t && texto ? ' · ' + CC.esc(t.abreviatura) : '') + '</figcaption>'
      + (semAcoes ? '' : CC.versiculos.acoesDoCartao(ref, { escrever, rotuloCor }))
      + '</figure>';
  };
  // As ações são as mesmas dos leitores (04e-versiculos.js): marcar, nota, Juntos, copiar.
  CC.ligarCartaoVersiculo = (raiz, ref, opcoes) => {
    const citacao = raiz.querySelector('.cartao-versiculo blockquote');
    CC.versiculos.ligarCartao(raiz, ref, citacao ? citacao.textContent : '', opcoes);
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

    return {
      topo: '<span class="salvo" id="salvo" role="status"></span>',
      corpo: '<div class="cabeca-licao"><span class="etiqueta">' + nb(CC.esc(CC.passagemDe(dia))) + '</span>'
        + '<h1 class="passo-titulo">Escrever sobre hoje</h1></div>'
        + '<div class="segmentado" role="group" aria-label="Como escrever">'
        + '<button data-modo="oracao" aria-pressed="' + (sessao.modo === 'oracao') + '">Oração</button>'
        + '<button data-modo="oia" aria-pressed="' + (sessao.modo === 'oia') + '">OIA completo</button>'
        + '</div>'
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
