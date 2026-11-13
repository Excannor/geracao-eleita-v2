/* A tela do dia lido (04-licao.js): "Dia N lido", a chama e o baú, o versículo para guardar, os
   cartões opcionais "Pensar" e "Orar", o que o dia trouxe e um "Voltar à trilha" só. Peça sob
   demanda: o index.html tem teto de 1 MB. A lição a pede assim que abre, e o service worker a
   guarda; a casca no index mostra "Dia N lido" enquanto ela chega. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-dia-lido]')) {
    const s = document.createElement('style');
    s.dataset.diaLido = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
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

  // "Dia N lido" no alto, com a chama e o baú (quando há); o versículo para guardar, com cor,
  // Story e Escrever; "Pensar" e "Orar" como dois cartões opcionais que abrem ali mesmo; o que o
  // dia trouxe (conquista, livro, unidade, amanhã, desafios); e um "Voltar à trilha" só. Antes
  // eram três passos (Guardar, Pensar, Orar) e mais uma tela de resumo. A celebração festeja o
  // que foi lido e a constância, nunca o valor espiritual de quem leu; escrever e orar ficam fora
  // de qualquer placar. O que se escreve vai para o registro do dia (CC.gravarRegistro), como antes.
  // As frases de oração terminam em reticências: é um começo para a pessoa completar.
  const comReticencias = (f) => (/(…|\.\.\.)$/.test(f) ? f : f + '…');
  const semReticencias = (f) => f.replace(/\s*(…|\.\.\.)$/, '');
  const CHAVE_CARTOES = 'cc.diaLido.abertos';
  const cartoesAbertos = () => { try { return JSON.parse(localStorage.getItem(CHAVE_CARTOES) || '{}') || {}; } catch (e) { return {}; } };
  const lembrarCartao = (k, aberto) => {
    try { const a = cartoesAbertos(); a[k] = aberto; localStorage.setItem(CHAVE_CARTOES, JSON.stringify(a)); } catch (e) { /* segue */ }
  };

  CC.telaDiaLido = function (L, dia, u) {
    const sessao = L.sessao();
    const { ir, sair, botao, nb, primeiroNome, totalApoio, pintarVersiculo } = L;
    const lido = CC.leu(sessao.dia);
    const c = sessao.celebracao;
    const ganhou = lido && !sessao.antes.lido && !!c;
    const papel = CC.origemDoDia(sessao.dia) === 'papel';
    const r = CC.reflexaoDoDia(sessao.dia);
    const seq = CC.sequencia();
    const nome = primeiroNome();
    const escrever = CC.temRegistro(sessao.dia) ? 'Escrever mais' : 'Escrever';
    const apoio = totalApoio(dia);
    const escolhida = Number.isInteger(sessao.pergunta) ? sessao.pergunta : -1;
    const registro = CC.registro(sessao.dia);
    const subiuHoje = ganhou && !sessao.antes.feitoHoje && seq.feitoHoje;
    // guardados aqui: os temporizadores de baixo podem disparar depois de a lição fechar
    const ofensivaAntes = sessao.antes.ofensiva;
    const diaDaSessao = sessao.dia;
    const abertos = cartoesAbertos();
    const textoPergunta = (p) => (Array.isArray(p) ? p[1] : p);

    // o que o dia trouxe, só no dia lido agora
    const destaques = [];
    const item = (arte, titulo, sub, extra) => destaques.push('<li class="destaque-dia' + (extra ? ' ' + extra : '') + '">'
      + '<span class="arte-destaque">' + arte + '</span><span class="texto-destaque"><b>' + titulo + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></li>');
    let bau = '';
    if (ganhou) {
      const estAntes = CC.estagioDaChama(sessao.antes.ofensiva);
      const est = CC.estagioDaChama(seq.atual);
      if (subiuHoje && est.nivel > estAntes.nivel) item(CC.icoChama(seq.atual), 'Sua chama agora é ' + est.nome, CC.esc(est.frase) + ' (' + est.ref + ')', 'chama');
      if (CC.MARCOS_OFENSIVA.includes(seq.atual) && seq.atual > sessao.antes.ofensiva) {
        const proximoMarco = CC.MARCOS_OFENSIVA[CC.MARCOS_OFENSIVA.indexOf(seq.atual) + 1];
        item(CC.arte.calendario(seq.atual, 'agora'), 'Meta de ' + seq.atual + ' dias seguidos', proximoMarco ? 'Próxima meta: ' + proximoMarco + ' dias' : '', 'marco');
      }
      for (const q of c.subiram.slice(0, 3)) {
        const def = CC.CONQUISTAS.find((x) => x.id === q.id);
        item(CC.arte.medalha(q, false), (q.nivel === 1 ? 'Conquista nova: ' : 'Subiu de nível: ') + CC.esc(q.titulo), CC.esc(def.texto(def.niveis[q.nivel - 1])), 'conquista');
      }
      for (const l of c.livros.slice(0, 2)) item('<span class="arte-livro">' + CC.ico('livro') + '</span>', 'Você terminou ' + CC.esc(l) + '!', 'Fica marcado em Livros da Bíblia', 'livro');
      if (c.unidade) item(CC.arte.trofeu(u.cor, true), 'Unidade ' + u.numero + ' concluída!', CC.esc(u.titulo), 'unidade');
      if (subiuHoje && seq.atual === 2) item('<span class="arte-volta">' + CC.ico('broto') + '</span>', 'Você voltou!', 'Voltar no dia seguinte é a parte mais difícil. Você voltou.', 'volta');
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
      // O baú (e a carta dentro dele) vem com a semana lida aqui no app; "Li na minha Bíblia" não
      // mostra baú nenhum.
      if (!papel && CC.temBau(sessao.dia) && !CC.bauAberto(sessao.dia)) {
        bau = CC.bauLiberado(sessao.dia)
          ? '<button class="bau-do-dia pronto" data-abrir-bau-dia>' + CC.arte.bau('pronto', 'madeira') + '<span><b>O baú do dia ' + sessao.dia + ' está pronto</b><small>Toque para abrir</small></span></button>'
          : '<div class="bau-do-dia">' + CC.arte.bau('travado', '') + '<span><b>Um baú na estrada</b><small>Leia os dias ' + Math.max(1, sessao.dia - 6) + ' a ' + sessao.dia + ' aqui no app para abrir.</small></span></div>';
      }
    }

    // A frase da chama (as mesmas do carimbo), sorteada, com a referência quando tem uma.
    const f = CC.fraseDaOfensiva({ comTexto: true });
    const lidos = CC.ler('lidos', []).length;

    const pensar = '<details class="cartao-opcional" data-cartao="pensar"' + (abertos.pensar ? ' open' : '') + '>'
      + '<summary><span class="ico-etapa">' + CC.ico('lupa') + '</span><span class="rot-opcional"><b>Pensar</b><small>'
      + (r.pensamento ? CC.esc(r.titulo || 'A reflexão de hoje') : 'Uma pergunta para levar') + '</small></span>' + CC.ico('baixo') + '</summary>'
      + '<div class="corpo-opcional">'
      + (r.pensamento ? '<p class="texto-reflexao">' + CC.esc(r.pensamento) + '</p>' : '')
      // As perguntas são para ler e ficar com uma. Tocar numa a leva para a escrita, já em cima
      // do campo: não é formulário, não tem resposta certa nem errada.
      + '<p class="passo-dica pequena">Fique com a que mais falar com você. Se quiser, escreva sobre ela.</p>'
      + '<ul class="perguntas-leitura">' + r.perguntas.map((p, i) => {
        const [rotulo, pergunta] = Array.isArray(p) ? p : ['', p];
        return '<li><button class="pergunta-leitura" data-pergunta="' + i + '"' + (i === escolhida ? ' aria-current="true"' : '') + '>'
          + '<span>' + (rotulo ? '<small>' + CC.esc(rotulo) + '</small>' : '') + CC.esc(pergunta) + '</span>' + CC.ico('caneta') + '</button></li>';
      }).join('') + '</ul>'
      + (apoio ? '<button class="linha-fundo" data-fundo><span class="ico-linha">' + CC.ico('camadas') + '</span>'
        + '<span class="rotulo-linha">Ir mais fundo</span><span class="conta-linha">' + CC.plural(apoio, 'nota', 'notas') + '</span>' + CC.ico('direita') + '</button>' : '')
      + '</div></details>';

    const orar = '<details class="cartao-opcional" data-cartao="orar"' + (abertos.orar ? ' open' : '') + '>'
      + '<summary><span class="ico-etapa">' + CC.ico('oracao') + '</span><span class="rot-opcional"><b>Orar</b><small>Com as suas palavras</small></span>' + CC.ico('baixo') + '</summary>'
      + '<div class="corpo-opcional">'
      + '<ul class="oracao-guia">' + r.oracao.map((frase, i) => '<li><button class="frase-oracao" data-frase-oracao="' + i + '">'
        + '<span>' + CC.esc(comReticencias(frase)) + '</span>' + CC.ico('caneta') + '</button></li>').join('') + '</ul>'
      + '<div class="campo"><label for="oracao-do-dia">Sua oração</label>'
      + '<textarea id="oracao-do-dia" data-oracao-inline placeholder="' + CC.esc(r.oracao.join('\n')) + '">' + CC.esc(registro.oracao || '') + '</textarea></div>'
      + '<span class="salvo" id="salvo-oracao" role="status"></span>'
      + '<div class="pe-duplo-plano"><button class="botao contorno" data-escrever-oia>' + CC.ico('caneta') + 'Escrever o estudo do dia</button>'
      + '<button class="botao plano" data-orei>Orei</button></div>'
      + '<p class="amem" hidden>Amém!</p>'
      + '</div></details>';

    return {
      semTopo: true,
      corpo: '<div class="resumo-dia dia-lido"><div class="cabeca-licao">'
        + '<div class="chama-palco">' + (ganhou ? CC.arte.faiscas() : '') + CC.icoChama(seq.atual) + '</div>'
        + '<h1 class="rotulo-ofensiva">' + (ganhou ? 'Dia ' + sessao.dia + ' lido' : 'Revisão do dia ' + sessao.dia) + '</h1>'
        + '<p class="linha-chama"><b class="numero-ofensiva" data-de="' + (subiuHoje ? ofensivaAntes : seq.atual) + '">' + (subiuHoje ? ofensivaAntes : seq.atual) + '</b> '
        + '<span>' + (seq.atual === 1 ? 'dia seguido com a chama acesa' : 'dias seguidos com a chama acesa') + '</span></p>'
        + '<p class="passo-dica">' + nb(CC.esc(CC.passagemDe(dia))) + (papel ? ' · lido na sua Bíblia' : '') + '</p>'
        + (ganhou ? faixaDaSemana() : '')
        + '<button class="botao contorno pequeno compartilhar-chama" data-compartilhar>' + CC.ico('compartilhar') + 'Story da chama</button>'
        + '</div>'
        + bau
        // guardar: o versículo do dia, ou a nota nos dias em que um versículo solto confunde
        + '<section class="etapa-reflexao" data-etapa-bloco="guardar"><h2 class="titulo-guardar">Para levar com você</h2>'
        + '<div id="festa-versiculo">' + (r.ref
          ? CC.esqueleto('texto')
          : '<figure class="cartao-versiculo nota-reflexao"><span class="etiqueta">Para entender hoje</span><p>' + CC.esc(r.nota) + '</p>'
            + '<div class="acoes-verso no-cartao"><div class="botoes-verso"><button class="botao pequeno contorno" data-escrever>'
            + CC.ico('caneta') + escrever + '</button></div></div></figure>') + '</div>'
        + (r.contexto ? '<p class="contexto-reflexao"><b>Contexto:</b> ' + CC.esc(r.contexto)
          + ' <button class="link-inline" data-nota-reflexao>Ler a nota</button></p>' : '')
        + '</section>'
        + pensar + orar
        + (ganhou ? '<p class="frase-cena">' + CC.esc(f.linhas.join(' ')) + (f.ref ? ' <span class="ref-frase">' + CC.esc(f.ref) + '</span>' : '') + '</p>' : '')
        + (destaques.length ? '<ul class="destaques">' + destaques.join('') + '</ul>' : '')
        + linhaDoMapa(dia)
        + '<div id="resumo-amigos"></div>'
        + (ganhou ? '<div class="progresso-plano"><span>' + lidos + ' de ' + D.plano.length + ' dias lidos</span>' + CC.barra(lidos / D.plano.length, 'fina') + '</div>' : '')
        + '</div>',
      pe: botao(ganhou && nome ? 'Voltar à trilha' : 'Voltar à trilha', 'data-voltar-trilha'),
      ligar(el) {
        if (ganhou) CC.arte.confete(el, 26);
        const numero = el.querySelector('.numero-ofensiva');
        if (subiuHoje) setTimeout(() => {
          if (!numero.isConnected) return;
          numero.classList.add('subindo');
          CC.contar(numero, ofensivaAntes, seq.atual, 500);
        }, 600);
        if (subiuHoje) sessao.antes.feitoHoje = true;
        if (subiuHoje) sessao.antes.ofensiva = seq.atual;
        el.querySelector('[data-voltar-trilha]').onclick = () => {
          CC.recemFeito = diaDaSessao;
          sair();
          setTimeout(() => CC.rolarAteAtual(true), 120);
          // conta nova que acabou de ler pela primeira vez: agora sim, instalar e lembretes
          if (ganhou && CC.depoisDoPrimeiroDia) CC.depoisDoPrimeiroDia();
        };
        const abrirBau = el.querySelector('[data-abrir-bau-dia]');
        if (abrirBau) abrirBau.onclick = () => { CC.recemFeito = diaDaSessao; CC.fecharLicao(); location.hash = '#/'; setTimeout(() => CC.telaBau(diaDaSessao), 60); };
        el.querySelector('.resumo-dia').addEventListener('click', (ev) => {
          if (ev.target.closest('[data-escrever]')) { sessao.modo = 'oracao'; sessao.escolheu = false; ir('escrever'); }
        });
        const fundo = el.querySelector('[data-fundo]');
        if (fundo) fundo.onclick = () => ir('fundo');
        if (r.ref) pintarVersiculo(el.querySelector('#festa-versiculo'), r.ref, { escrever, rotuloCor: true });
        el.querySelectorAll('details[data-cartao]').forEach((d) => {
          d.addEventListener('toggle', () => lembrarCartao(d.dataset.cartao, d.open));
        });
        el.querySelectorAll('[data-pergunta]').forEach((b) => {
          b.onclick = () => {
            sessao.pergunta = Number(b.dataset.pergunta);
            sessao.modo = 'oia';
            sessao.escolheu = true;
            ir('escrever');
          };
        });
        const notaReflexao = el.querySelector('[data-nota-reflexao]');
        if (notaReflexao) notaReflexao.onclick = () => CC.folhaNota(r.idNota);
        // a oração escrita aqui mesmo, guardada a cada letra no registro do dia
        const campo = el.querySelector('[data-oracao-inline]');
        const salvo = el.querySelector('#salvo-oracao');
        campo.addEventListener('input', () => {
          const atual = { ...CC.registro(sessao.dia) };
          atual.oracao = campo.value;
          CC.gravarRegistro(sessao.dia, atual);
          if (salvo) salvo.innerHTML = CC.ico('certo') + 'Salvo';
        });
        el.querySelectorAll('[data-frase-oracao]').forEach((b) => {
          b.onclick = () => {
            const frase = semReticencias(r.oracao[Number(b.dataset.fraseOracao)]) + ' ';
            campo.value = (campo.value.trim() ? campo.value.trimEnd() + '\n\n' : '') + frase;
            campo.dispatchEvent(new Event('input'));
            campo.focus({ preventScroll: true });
            campo.setSelectionRange(campo.value.length, campo.value.length);
            campo.scrollIntoView({ block: 'center', behavior: CC.semMovimento() ? 'auto' : 'smooth' });
          };
        });
        el.querySelector('[data-escrever-oia]').onclick = () => { sessao.modo = 'oia'; sessao.escolheu = true; ir('escrever'); };
        el.querySelector('[data-orei]').onclick = (ev) => {
          ev.currentTarget.disabled = true;
          CC.marcarOrei();
          el.querySelector('.amem').hidden = false;
        };
        const verMapa = el.querySelector('[data-ver-mapa]');
        if (verMapa) verMapa.onclick = (ev) => { ev.preventDefault(); CC.recemFeito = diaDaSessao; CC.fecharLicao(); location.hash = verMapa.getAttribute('href'); };
        const desafios = el.querySelector('[data-ver-desafios]');
        if (desafios) desafios.onclick = (ev) => { ev.preventDefault(); CC.fecharLicao(); location.hash = '#/missoes'; };
        // Story da chama, com a frase que está na tela (01d-story.js)
        const compartilhar = el.querySelector('[data-compartilhar]');
        const pedido = { tipo: 'ofensiva', dias: seq.atual, frase: { linhas: f.linhas, ref: f.ref || '' } };
        setTimeout(() => { if (compartilhar.isConnected) CC.story.preparar(pedido).catch(() => null); }, 1200);
        compartilhar.onclick = async () => {
          compartilhar.disabled = true;
          await CC.imagemStory(pedido);
          compartilhar.disabled = false;
        };
        const alvo = el.querySelector('#resumo-amigos');
        if (c && ganhou) {
          if (c.amigos === undefined) c.pedidoAmigos.then(() => { if (alvo.isConnected) pintarAmigosDoResumo(alvo, c); });
          else pintarAmigosDoResumo(alvo, c);
        }
      },
    };
  };

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

})(window.CC);
