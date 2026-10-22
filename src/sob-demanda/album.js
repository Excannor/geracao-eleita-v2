/* O álbum das cartas (docs/cartas.md, seções 8 a 11): o catálogo inteiro, a tela do álbum, a carta
   grande com as versões, "O que pode vir", a escolha da Glória e as revelações (no baú e das outras
   fontes). Pedida com a regra (cartas-regras.js) e a arte (cartas.js) só quando o baú ou o álbum
   abre (CC.pedirCartas, 02b-jogo.js). O build põe o catálogo no lugar da marca abaixo.
   A arte é chamada por poucas funções (CC.cartas.revelar, cartaViva, botaoVirar, miniatura,
   desenharVerso, storyDaCarta, papelDeParede, iconeSvg); carta sem desenho ainda cai numa carta
   de texto, com a moldura da raridade, e a miniatura vira silhueta. */
(function (CC) {
  'use strict';
  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-album]')) {
    const s = document.createElement('style');
    s.dataset.album = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }
  const CATALOGO = '/*CATALOGO_CARTAS*/';
  const R = () => CC.cartasRegras;
  const porId = new Map(CATALOGO.cartas.map((c) => [c.id, c]));
  const albumDe = (id) => CATALOGO.albuns.find((a) => a.id === id) || { id, nome: '' };
  const doAlbum = (id) => CATALOGO.cartas.filter((c) => c.album === id).sort((x, y) => x.numero - y.numero);
  const NOMES = { linho: 'Linho', bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', gloria: 'Glória' };
  const ORDEM = ['linho', 'bronze', 'prata', 'ouro', 'gloria'];
  const melhor = (versoes) => ORDEM.slice().reverse().find((v) => (versoes || {})[v]) || '';
  const menosMovimento = () => CC.semMovimento && CC.semMovimento();
  const estado = () => CC.estado().cartas || { eventos: {}, glorias: {} };

  // ---------- a carta para a arte ----------
  // O objeto que a peça de arte recebe: os campos dela (album com o nome, total, sabia, ref,
  // desenho) e a raridade da cópia.
  const paraArte = (id, raridade) => {
    const c = porId.get(id) || {};
    const a = albumDe(c.album);
    return { id, album: a.nome, albumId: a.id, numero: c.numero, total: doAlbum(c.album).length, titulo: c.titulo, sabia: c.voceSabia,
      ref: c.referencia, desenho: c.desenho || id, link: c.link || '', raridade: raridade || c.raridade || 'linho', rascunho: !!c.rascunho };
  };
  // temArte(id) na arte nova (os desenhos pelo id da carta); na amostra, pelo campo desenho.
  const temArte = (carta) => !!(CC.cartas && (CC.cartas.temArte ? CC.cartas.temArte(carta.id) : (CC.cartas.desenhos || {})[carta.desenho]));
  const icone = (rar) => (CC.cartas && CC.cartas.iconeSvg ? CC.cartas.iconeSvg(rar) : '');

  // A carta de texto, para quem ainda não tem desenho: frente com o texto, verso com a marca.
  function cartaDeTexto(carta, largura) {
    const el = document.createElement('div');
    el.className = 'carta-texto';
    el.dataset.raridade = carta.raridade;
    el.style.setProperty('--largura', largura + 'px');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'Carta ' + carta.album + ', ' + NOMES[carta.raridade] + ': ' + carta.titulo + '. Você sabia? ' + carta.sabia + ' ' + carta.ref);
    el.innerHTML = '<div class="ct-giro"><div class="ct-face ct-frente"><span class="ct-rar">' + icone(carta.raridade) + NOMES[carta.raridade] + '</span>'
      + '<b class="ct-titulo">' + CC.esc(carta.titulo) + '</b><span class="ct-sabia"><small>Você sabia?</small>' + CC.esc(carta.sabia) + '</span>'
      + '<span class="ct-ref">' + CC.esc(carta.ref) + '</span><span class="ct-album">' + CC.esc(carta.album) + ' · ' + carta.numero + '/' + carta.total + '</span></div>'
      + '<div class="ct-face ct-verso"></div></div>';
    if (CC.cartas && CC.cartas.desenharVerso && CC.cartas.tela) {
      const verso = CC.cartas.desenharVerso(CC.cartas.tela(), carta.raridade);
      verso.setAttribute('aria-hidden', 'true');
      el.querySelector('.ct-verso').appendChild(verso);
    }
    return { el, virar: () => el.classList.toggle('mostra-verso') };
  }
  function botaoVirarTexto(api) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cv-botao-virar';
    b.setAttribute('aria-label', 'Virar carta');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>Virar';
    b.onclick = () => api.virar();
    return b;
  }
  // A carta grande: viva (com desenho) ou de texto.
  function cartaGrande(alvo, carta, largura) {
    alvo.innerHTML = '';
    if (temArte(carta)) {
      const api = CC.cartas.cartaViva(carta, { largura });
      alvo.appendChild(api.el);
      alvo.appendChild(CC.cartas.botaoVirar(api));
      return api;
    }
    const api = cartaDeTexto(carta, largura);
    alvo.appendChild(api.el);
    alvo.appendChild(botaoVirarTexto(api));
    return api;
  }
  // A miniatura: desenhada, ou a silhueta da raridade (sem texto).
  function miniatura(carta, largura) {
    if (temArte(carta)) return CC.cartas.miniatura(carta, largura);
    const el = document.createElement('span');
    el.className = 'album-sem-arte';
    el.dataset.raridade = carta.raridade;
    el.style.width = largura + 'px';
    el.innerHTML = icone(carta.raridade);
    return el;
  }

  // ---------- compartilhar ----------
  const arquivoDe = (canvas, nome) => new Promise((r) => canvas.toBlob(r, 'image/png')).then((b) => new File([b], nome, { type: 'image/png' }));
  const imagemDaCarta = (carta) => arquivoDe(CC.cartas.storyDaCarta(carta), 'geracao-eleita-carta-' + carta.id + '-' + carta.raridade + '.png');
  const textoDaCarta = (carta) => carta.titulo + ' (' + NOMES[carta.raridade] + '), uma carta do Geração Eleita. https://' + ((CC.story || {}).ENDERECO || 'geracaoeleita.app');
  function ligarCompartilhar(botao, carta) {
    const pronta = new Promise((r) => setTimeout(r, menosMovimento() ? 0 : 1200)).then(() => imagemDaCarta(carta));
    pronta.catch(() => {});
    botao.onclick = (ev) => CC.ocupado(ev.currentTarget, async () => {
      const arquivo = await pronta.catch(() => null);
      if (!arquivo) { CC.avisar('Não consegui gerar a imagem agora.'); return; }
      await CC.compartilharImagem(arquivo, textoDaCarta(carta));
    });
  }
  function ligarPapelDeParede(botao, ref) {
    const pronto = new Promise((r) => setTimeout(r, menosMovimento() ? 0 : 1500))
      .then(() => (ref && CC.textoDoVersiculo ? CC.textoDoVersiculo(ref) : null))
      .then((texto) => (texto ? arquivoDe(CC.cartas.papelDeParede({ ref, texto }), 'geracao-eleita-papel-de-parede.png') : null));
    pronto.catch(() => {});
    botao.onclick = (ev) => CC.ocupado(ev.currentTarget, async () => {
      const arquivo = await pronto.catch(() => null);
      if (!arquivo) { CC.avisar('Não consegui gerar o papel de parede agora.'); return; }
      await CC.compartilharImagem(arquivo, ref + ', no Geração Eleita.', 'Papel de parede salvo. Escolha a imagem nas suas fotos para usar na tela de bloqueio.');
    });
  }

  // ---------- a legenda da revelação ----------
  // Nova carta, nova versão ou repetida: sempre curto e para cima.
  function legenda(x) {
    const c = porId.get(x.carta) || {};
    const a = albumDe(c.album);
    if (x.nova) return '<strong>Nova!</strong> Você tem ' + x.tem + ' de ' + x.total + ' em ' + CC.esc(a.nome);
    if (x.versaoNova) return '<strong>Nova versão ' + NOMES[x.raridade] + '</strong> de ' + CC.esc(c.titulo);
    return 'Repetida: agora você tem ' + x.copias + ' de ' + CC.esc(c.titulo) + ' (' + NOMES[x.raridade] + ')';
  }
  const ORIGEM = {
    conhecer: 'Conhecer Jesus completo', passos: 'Primeiros passos completos', desafio: 'Desafio concluído', parabolas: 'Parábolas lidas no Explorar',
    pratica: 'Prática sem nenhum erro', proposito: 'Sete dias num propósito', celula: 'Seu primeiro encontro da célula', discipulado: 'Seu primeiro encontro de discipulado',
    convite: 'Amigos que chegaram pelo seu convite', convidado: 'Boas-vindas',
  };

  // Uma revelação: a arte faz a animação (CC.cartas.revelar); embaixo, a legenda, o título e os botões.
  function montarRevelacao(el, palco, x, { titulo, ref, aoContinuar }) {
    const carta = paraArte(x.carta, x.raridade);
    palco.innerHTML = '<div class="cena-carta revelando album-revela">'
      + '<h1>' + CC.esc(titulo) + '</h1><div class="album-revela-carta"></div>'
      + '<p class="album-legenda" aria-live="polite"></p>'
      + '<p class="album-revela-titulo"><b>' + CC.esc(carta.titulo) + '</b> <span>' + CC.esc(carta.ref) + '</span></p>'
      + (x.completou ? '<p class="album-completo">' + icone('gloria') + '<span>Álbum completo! Escolha uma carta para a versão Glória.</span></p>' : '') + '</div>';
    const alvo = palco.querySelector('.album-revela-carta');
    const largura = Math.round(Math.min(300, innerWidth * 0.68, Math.max(180, (innerHeight - 380) / 1.4)));
    const texto = legenda(x);
    let daArte = false;
    if (temArte(carta)) {
      // A arte faz a revelação; a nova (uma Promise) já mostra a legenda e o título dentro dela.
      const api = CC.cartas.revelar(alvo, carta, { raridade: carta.raridade, nova: !!x.nova, progresso: x.tem + '/' + x.total,
        legenda: texto.replace(/<[^>]+>/g, ''), abrir: 'ja' });
      daArte = !!(api && typeof api.then === 'function');
    } else {
      const api = cartaGrande(alvo, carta, largura);
      api.el.classList.add('entrando');
    }
    const fala = palco.querySelector('.album-legenda');
    if (daArte) { fala.remove(); palco.querySelector('.album-revela-titulo').remove(); }
    else setTimeout(() => { fala.innerHTML = texto; palco.querySelector('.album-revela').classList.add('legenda-pronta'); }, menosMovimento() ? 0 : 1200);
    let pe = el.querySelector('.tela-cheia-pe');
    if (!pe) { pe = document.createElement('div'); pe.className = 'tela-cheia-pe'; el.appendChild(pe); }
    pe.innerHTML = (temArte(carta) ? '<button class="botao contorno" data-compartilhar-carta>' + CC.ico('compartilhar') + 'Compartilhar carta</button>' : '')
      + (ref ? '<button class="botao contorno" data-papel-de-parede>' + CC.ico('baixar') + 'Salvar papel de parede</button>' : '')
      + (x.completou ? '<a class="botao contorno" href="#/perfil/album" data-escolher-gloria>' + CC.ico('estrela') + 'Escolher a Glória</a>' : '')
      + '<button class="botao" data-continuar>Continuar</button>';
    const comp = pe.querySelector('[data-compartilhar-carta]');
    if (comp) ligarCompartilhar(comp, carta);
    const papel = pe.querySelector('[data-papel-de-parede]');
    if (papel) ligarPapelDeParede(papel, ref);
    pe.querySelector('[data-continuar]').onclick = aoContinuar;
    pe.querySelector('[data-continuar]').focus({ preventScroll: true });
  }

  // No baú (03-trilha.js): a carta que o baú pagou. outros: o que mais foi pago junto (outras fontes).
  function revelarNoBau(el, palco, { chave, ref, fechar }) {
    const ev = estado().eventos[chave];
    if (!ev || !ev.carta) return false;
    const r = R().resumo(estado());
    const c = porId.get(ev.carta);
    const doMesmo = doAlbum(c.album);
    const copias = R().copias(estado()).filter((y) => y.carta === ev.carta);
    const desta = copias.filter((y) => y.raridade === ev.raridade);
    const x = { carta: ev.carta, raridade: ev.raridade, nova: copias[0].chave === chave, versaoNova: desta[0].chave === chave, copias: desta.length,
      tem: doMesmo.filter((y) => r.tem[y.id]).length, total: doMesmo.length,
      completou: estado().eventos['album:' + c.album] && copias[0].chave === chave && doMesmo.every((y) => r.tem[y.id]) ? c.album : '' };
    montarRevelacao(el, palco, x, { titulo: 'Baú aberto!', ref, aoContinuar: () => { fechar(); CC.redesenhar(); } });
    return true;
  }

  // As cartas de outras fontes, uma depois da outra.
  function revelarNovas(lista) {
    const fila = lista.slice();
    if (!fila.length || document.querySelector('.tela-cheia')) return;
    CC.telaCheia('<div></div>', {
      classe: 'tela-bau tela-carta-nova',
      rotulo: 'Carta nova',
      fecharAoNavegar: true,
      ligar: (el, fechar) => {
        const palco = el.querySelector('.tela-cheia-palco');
        const proxima = () => {
          const x = fila.shift();
          if (!x) { fechar(); CC.redesenhar(); return; }
          montarRevelacao(el, palco, x, { titulo: ORIGEM[x.fonte] || 'Carta nova', aoContinuar: proxima });
          if (CC.arte && CC.arte.confete) CC.arte.confete(el);
        };
        proxima();
      },
    });
  }

  // ---------- a tela do álbum ----------
  const plural = (n, um, muitos) => n + ' ' + (n === 1 ? um : muitos);
  function pips(versoes) {
    return '<span class="album-pips" aria-hidden="true">' + ORDEM.map((v) => '<i class="pip-' + v + ((versoes || {})[v] ? ' tem' : '') + '"></i>').join('') + '</span>';
  }
  function rotuloDaCarta(c, versoes) {
    const tem = ORDEM.filter((v) => versoes[v]);
    const rep = tem.filter((v) => versoes[v] > 1).map((v) => versoes[v] + ' de ' + NOMES[v]);
    return c.titulo + '. Versões: ' + tem.map((v) => NOMES[v]).join(', ') + (rep.length ? '. Repetidas: ' + rep.join(', ') : '') + '.';
  }
  function itemDaGrade(c, tem, largura, extra) {
    const versoes = tem[c.id];
    if (!versoes) return '<div class="album-vaga" aria-hidden="true"' + (extra ? ' data-limiar' : '') + '></div>' + (extra || '');
    // a miniatura é a melhor versão; ×N quando há mais de uma cópia dela
    const n = versoes[melhor(versoes)];
    return '<button class="album-carta" data-carta="' + c.id + '" aria-label="' + CC.esc(rotuloDaCarta(c, versoes)) + '"><span class="album-mini" data-mini="' + c.id + '"></span>'
      + pips(versoes) + (n > 1 ? '<span class="album-copias" aria-hidden="true">×' + n + '</span>' : '') + '</button>' + (extra || '');
  }

  function tela(raiz) {
    if (CC.cartasEmDia) CC.cartasEmDia({ calado: true });
    const cartas = estado();
    const r = R().resumo(cartas, CC.hojeIso());
    const tem = r.tem;
    const largura = innerWidth >= 720 ? 108 : Math.floor((Math.min(innerWidth, 560) - 32 - 3 * 10) / 4);
    const podeEscolher = r.pendentes.length && Object.keys(tem).some((id) => R().podeGloria(cartas, id));
    const atual = r.albuns.find((a) => a.id === r.atual);
    const secoes = r.albuns.map((a) => '<section class="album-secao" data-album="' + a.id + '">'
      + CC.tituloSecao(a.nome, a.tem + ' de ' + a.total + ' cartas')
      + '<p class="album-versoes">Coleção: ' + a.versoes + ' de ' + a.totalVersoes + ' versões' + (a.glorias ? ' · ' + plural(a.glorias, 'Glória', 'Glórias') : '') + '</p>'
      + '<div class="album-grade">' + doAlbum(a.id).map((c) => itemDaGrade(c, tem, largura)).join('') + '</div></section>').join('');
    const quem = (CC.quem || {}).cartasServidor;
    const semeadores = doAlbum('semeadores');
    const secSemeadores = '<section class="album-secao album-especial" data-album="semeadores">'
      + CC.tituloSecao('Semeadores', plural(semeadores.filter((c) => tem[c.id]).length, 'carta', 'cartas'))
      + (quem ? '<p class="album-versoes">' + (quem.amigos === 1 ? '1 amigo chegou' : quem.amigos + ' amigos chegaram') + ' pelo seu convite.</p>' : '')
      + '<div class="album-grade">' + semeadores.map((c) => '<div class="album-limiar">' + itemDaGrade(c, tem, largura)
        + '<small>' + plural(c.amigos, 'amigo', 'amigos') + '</small></div>').join('') + '</div></section>';
    const boas = doAlbum('boas-vindas').filter((c) => tem[c.id]);
    const secBoas = boas.length ? '<section class="album-secao album-especial" data-album="boas-vindas">' + CC.tituloSecao('Boas-vindas')
      + '<div class="album-grade">' + boas.map((c) => itemDaGrade(c, tem, largura)).join('') + '</div></section>' : '';
    raiz.innerHTML = '<div class="folha-perfil">' + CC.botaoVoltar('Perfil') + '<h1>Cartas</h1>'
      + '<p class="passo-dica">' + r.cartas + ' de ' + r.totalCartas + ' cartas' + (r.repetidas ? ' · ' + plural(r.repetidas, 'repetida', 'repetidas') : '') + '</p></div>'
      + (podeEscolher ? '<div class="album-gloria">' + icone('gloria') + '<p><b>' + (r.pendentes.length === 1 ? 'Uma versão Glória para escolher' : r.pendentes.length + ' versões Glória para escolher')
        + '</b></p><button class="botao pequeno" data-escolher>Escolher</button></div>' : '')
      + '<div class="album-acoes"><button class="botao contorno pequeno" data-pode-vir>' + CC.ico('info') + 'O que pode vir</button>'
      + (atual ? '<span>Álbum atual: <b>' + CC.esc(atual.nome) + '</b></span>' : '') + '</div>'
      + secoes + secSemeadores + secBoas;
    raiz.style.setProperty('--album-mini', largura + 'px');
    raiz.querySelectorAll('[data-mini]').forEach((m) => {
      const id = m.dataset.mini;
      m.appendChild(miniatura(paraArte(id, melhor(tem[id])), largura));
    });
    raiz.querySelectorAll('[data-carta]').forEach((b) => { b.onclick = () => abrirCarta(b.dataset.carta); });
    raiz.querySelector('[data-pode-vir]').onclick = oQuePodeVir;
    const esc = raiz.querySelector('[data-escolher]');
    if (esc) esc.onclick = escolherGloria;
    if (CC.ligarVoltarDoTopo) CC.ligarVoltarDoTopo(raiz);
  }

  // ---------- a carta grande ----------
  function abrirCarta(id, raridade) {
    const tem = R().tem(estado())[id];
    if (!tem) return;
    let rar = raridade && tem[raridade] ? raridade : melhor(tem);
    const c = porId.get(id);
    const link = c.link ? (/^#\/parabola\//.test(c.link) ? 'Ler a parábola' : 'Ver no mapa') : '';
    CC.telaCheia('<div class="carta-grande"><div class="carta-grande-arte"></div>'
      + '<div class="carta-versoes" role="group" aria-label="Versões">' + ORDEM.map((v) => (tem[v]
        ? '<button class="carta-versao" data-versao="' + v + '" aria-pressed="false">' + icone(v) + '<span>' + NOMES[v] + '</span>' + (tem[v] > 1 ? '<small>×' + tem[v] + '</small>' : '') + '</button>'
        : '<span class="carta-versao falta" aria-label="' + NOMES[v] + ': ainda não"><i></i><span>' + NOMES[v] + '</span></span>')).join('') + '</div>'
      + '<h2>' + CC.esc(c.titulo) + '</h2>'
      + '<p class="carta-sabia"><small>Você sabia?</small> ' + CC.esc(c.voceSabia) + '</p>'
      + '<p class="carta-links"><a href="' + CC.hrefDoVerso(c.referencia) + '">' + CC.ico('livro') + CC.esc(c.referencia) + '</a>'
      + (link ? '<a href="' + c.link + '">' + CC.ico(link === 'Ver no mapa' ? 'bussola' : 'caderno') + link + '</a>' : '') + '</p></div>', {
      classe: 'tela-carta',
      rotulo: c.titulo,
      fecharAoNavegar: true,
      pe: '<button class="botao contorno" data-compartilhar-carta>' + CC.ico('compartilhar') + 'Compartilhar</button><button class="botao" data-fechar>Fechar</button>',
      ligar: (el, fechar) => {
        const largura = Math.round(Math.min(320, innerWidth * 0.72, Math.max(180, (innerHeight - 400) / 1.4)));
        const mostrar = () => {
          const carta = paraArte(id, rar);
          cartaGrande(el.querySelector('.carta-grande-arte'), carta, largura);
          el.querySelectorAll('[data-versao]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.versao === rar)));
          const comp = el.querySelector('[data-compartilhar-carta]');
          comp.hidden = !temArte(carta);
          if (!comp.hidden) ligarCompartilhar(comp, carta);
        };
        el.querySelectorAll('[data-versao]').forEach((b) => { b.onclick = () => { rar = b.dataset.versao; mostrar(); }; });
        el.querySelector('[data-fechar]').onclick = fechar;
        mostrar();
      },
    });
  }

  // ---------- O que pode vir ----------
  // As chances são públicas: a de cada raridade, as proteções e os números da própria pessoa.
  function oQuePodeVir() {
    const P = R().PESOS;
    const r = R().resumo(estado(), CC.hojeIso());
    const atual = r.albuns.find((a) => a.id === r.atual);
    const linha = (rar, texto) => '<li>' + icone(rar) + '<span><b>' + NOMES[rar] + '</b> ' + texto + '</span></li>';
    CC.folha('<h2>O que pode vir</h2>'
      + '<p class="passo-dica pequena">Cada baú sorteia uma raridade e depois a carta.</p>'
      + '<ul class="album-chances">' + ['linho', 'bronze', 'prata', 'ouro'].map((v) => linha(v, P[v] + '%')).join('')
      + linha('gloria', 'não sai no sorteio') + '</ul>'
      + '<h3 class="album-sub">Proteções</h3><ul class="album-regras">'
      + '<li>A primeira carta é uma Prata.</li>'
      + '<li>No máximo ' + R().MAX_SEM_ALTA + ' seguidas sem Prata ou Ouro.</li>'
      + '<li>A partir do ' + R().OURO_SOBE_EM + 'º sorteio sem Ouro, a chance dele sobe ' + R().OURO_PASSO + ' pontos a cada um, e o ' + R().OURO_ATE + 'º é Ouro.</li>'
      + '<li>As cartas que você ainda não tem saem mais, principalmente as do álbum atual.</li>'
      + '<li>A versão Glória você escolhe ao completar um álbum ou uma unidade da Trilha, e nos 100 e 365 dias de leitura.</li></ul>'
      + '<h3 class="album-sub">Você</h3><ul class="album-regras">'
      + (atual ? '<li>Álbum atual: ' + CC.esc(atual.nome) + ', ' + atual.tem + ' de ' + atual.total + ' cartas.</li>' : '<li>Todas as cartas já estão no álbum. Agora vêm as versões.</li>')
      + '<li>Desde o último Ouro: ' + plural(r.semOuro, 'sorteio', 'sorteios') + '.</li>'
      + '<li>Desde a última Prata ou Ouro: ' + plural(r.semAlta, 'sorteio', 'sorteios') + '.</li></ul>'
      + '<div class="acoes"><button class="botao plano" data-fechar>Fechar</button></div>', {
      rotulo: 'O que pode vir',
      classe: 'folha-pode-vir',
      rolavel: true,
      ligar: (folha, fechar) => { folha.querySelector('[data-fechar]').onclick = fechar; },
    });
  }

  // ---------- a escolha da Glória ----------
  function escolherGloria() {
    const cartas = estado();
    const tem = R().tem(cartas);
    const ids = CATALOGO.cartas.filter((c) => R().podeGloria(cartas, c.id)).map((c) => c.id);
    if (!ids.length) return;
    const largura = innerWidth >= 720 ? 96 : Math.floor((Math.min(innerWidth, 560) - 32 - 3 * 10) / 4);
    CC.telaCheia('<div class="album-escolha"><h1>Versão Glória</h1><p class="passo-dica">Escolha a carta.</p>'
      + '<div class="album-grade" style="--album-mini:' + largura + 'px">' + ids.map((id) => '<button class="album-carta" data-glorificar="' + id + '" aria-label="' + CC.esc(porId.get(id).titulo) + '">'
        + '<span class="album-mini" data-mini="' + id + '"></span></button>').join('') + '</div></div>', {
      classe: 'tela-carta tela-escolha',
      rotulo: 'Escolher a versão Glória',
      fecharAoNavegar: true,
      pe: '<button class="botao plano" data-depois>Depois</button>',
      ligar: (el, fechar) => {
        el.querySelectorAll('[data-mini]').forEach((m) => m.appendChild(miniatura(paraArte(m.dataset.mini, melhor(tem[m.dataset.mini])), largura)));
        el.querySelector('[data-depois]').onclick = fechar;
        el.querySelectorAll('[data-glorificar]').forEach((b) => {
          b.onclick = async () => {
            const id = b.dataset.glorificar;
            const sim = await CC.confirmar({ titulo: 'Versão Glória de ' + porId.get(id).titulo + '?', acao: 'Escolher' });
            if (!sim) return;
            const novo = R().escolherGloria(estado(), id);
            if (!novo) return;
            CC.gravar('cartas', novo);
            fechar();
            CC.redesenhar();
            abrirCarta(id, 'gloria');
          };
        });
      },
    });
  }

  CC.album = { CATALOGO, tela, abrirCarta, oQuePodeVir, escolherGloria, revelarNoBau, revelarNovas, paraArte, temArte };
})(window.CC);
