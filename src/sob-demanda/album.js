/* O álbum das cartas (docs/cartas.md, seções 8 a 11): o catálogo inteiro, a tela do álbum, a carta
   grande com as versões, "O que pode vir" e as revelações (no baú, das outras fontes e dos marcos). Pedida com a regra (cartas-regras.js) e a arte (cartas.js) só quando o baú ou o álbum
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
  const estado = () => CC.estado().cartas || { eventos: {} };

  // ---------- a carta para a arte ----------
  // O objeto que a peça de arte recebe: os campos dela (album com o nome, total, sabia, ref,
  // desenho) e a raridade da cópia.
  const paraArte = (id, raridade) => {
    const c = porId.get(id) || {};
    const a = albumDe(c.album);
    return { id, album: a.nome, albumId: a.id, numero: c.numero, total: doAlbum(c.album).length, titulo: c.titulo, sabia: c.voceSabia,
      ref: c.referencia, desenho: id, link: c.link || '', raridade: raridade || c.raridade || 'linho', rascunho: !!c.rascunho };
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
    if (CC.cartas && CC.cartas.desenharVerso) {
      const verso = CC.cartas.desenharVerso({ largura: Math.min(1000, Math.round(largura * 2)), raridade: carta.raridade });
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
  // O título da revelação: a origem; nos marcos, "Marco: ..." (o sorteio de marco tem chance maior
  // de Ouro e de Glória).
  const origem = (x) => {
    const [fonte, arg] = String(x.chave || x.fonte || '').split(':');
    if (fonte === 'album') return 'Marco: ' + albumDe(arg).nome + ' completo';
    if (fonte === 'unidade') return 'Marco: unidade ' + arg + ' completa';
    if (fonte === 'dias') return 'Marco: ' + arg + ' dias de leitura';
    return ORIGEM[fonte] || 'Carta nova';
  };

  // Uma revelação, num fluxo só (dono, 22/10): a arte faz a abertura inteira
  // (CC.cartas.revelar: o baú da Trilha balança, a tampa abre, a luz sobe, a carta sai, vira e
  // brilha), com "Pular" como único controle. Quando ela termina (ou no Pular), a tela passa ao fim:
  // só a carta, grande, a legenda ("Nova! ...", "Repetida: ..."), "Ler a história" e "Virar", e
  // embaixo "Compartilhar carta", "Salvar papel de parede" e "Continuar", que só então aparecem.
  // Nenhum baú fica no fim, e tudo cabe na tela sem rolar (390x844 e 360x740).
  // x: o resultado (ou uma função que o lê no fim, quando ele só existe depois do toque).
  // abrir: 'ja' (o baú abre sozinho) ou 'toque' (o baú da revelação espera o toque, e antes() roda
  // nele: é ali que a Trilha guarda o baú). titulo: o título enquanto o baú está fechado.
  function montarRevelacao(el, palco, x, { origem: kicker, ref, aoContinuar, abrir = 'ja', antes, titulo }) {
    el.classList.add('com-revelacao');
    const lerX = () => (typeof x === 'function' ? x() : x);
    const x0 = lerX();
    const carta = paraArte(x0.carta, x0.raridade);
    const texto = legenda(x0);
    const ler = () => { location.hash = CC.hrefDoVerso(carta.ref); };
    let pe = el.querySelector('.tela-cheia-pe');
    if (!pe) { pe = document.createElement('div'); pe.className = 'tela-cheia-pe'; el.appendChild(pe); }
    pe.classList.add('album-pe');
    pe.hidden = true;
    pe.innerHTML = (temArte(carta) ? '<button class="botao contorno pequeno" data-compartilhar-carta>' + CC.ico('compartilhar') + 'Compartilhar carta</button>' : '')
      + (ref ? '<button class="botao contorno pequeno" data-papel-de-parede>' + CC.ico('baixar') + 'Salvar papel de parede</button>' : '')
      + '<button class="botao" data-continuar>Continuar</button>';
    const comp = pe.querySelector('[data-compartilhar-carta]');
    if (comp) ligarCompartilhar(comp, carta);
    const papel = pe.querySelector('[data-papel-de-parede]');
    if (papel) ligarPapelDeParede(papel, ref);
    pe.querySelector('[data-continuar]').onclick = aoContinuar;
    let terminou = false;
    const fim = () => {
      if (terminou || !palco.isConnected) return;
      terminou = true;
      const x = lerX();
      const texto = legenda(x);
      pe.hidden = false;
      pe.classList.add('album-pe-entra');
      palco.innerHTML = '<div class="album-fim">' + (kicker ? '<p class="album-origem">' + CC.esc(kicker) + '</p>' : '')
        + '<div class="album-fim-carta"></div><p class="album-legenda" aria-live="polite">' + texto + '</p>'
        + (x.completou ? '<p class="album-completo">' + icone('gloria') + '<span>Álbum completo! Ganhou um sorteio de marco.</span></p>' : '')
        + '<div class="album-fim-acoes"><button type="button" class="botao contorno pequeno" data-ler>' + CC.ico('livro') + 'Ler a história</button></div></div>';
      // a carta ocupa a altura que sobra
      const resto = palco.querySelector('.album-fim').getBoundingClientRect().height;
      const alto = palco.clientHeight - resto - 16;
      const largura = Math.round(Math.max(150, Math.min(330, innerWidth - 64, alto / 1.4)));
      const api = cartaGrande(palco.querySelector('.album-fim-carta'), carta, largura);
      const virar = palco.querySelector('.album-fim-carta .cv-botao-virar');
      if (virar) { virar.classList.add('botao', 'contorno', 'pequeno'); palco.querySelector('.album-fim-acoes').appendChild(virar); }
      if (api.soltar) api.soltar();
      palco.querySelector('[data-ler]').onclick = ler;
      pe.querySelector('[data-continuar]').focus({ preventScroll: true });
    };
    if (temArte(carta)) {
      // a raridade é a da cópia (a Glória também sai por sorte, mais nos marcos)
      palco.innerHTML = (titulo ? '<h1 class="album-titulo-bau">' + CC.esc(titulo) + '</h1>' : '') + '<div class="album-revela"></div>';
      const rv = CC.cartas.revelar(palco.querySelector('.album-revela'), carta, { raridade: carta.raridade, legenda: texto.replace(/<[^>]+>/g, ''), abrir,
        largura: Math.round(Math.max(170, Math.min(300, innerWidth - 80, (innerHeight - 300) / 1.4))), aoLer: ler });
      if (abrir === 'toque') {
        // o toque no baú (ou "Pular" antes dele): primeiro quem chamou guarda o baú, uma vez; se ele
        // recusar (a carta paga não é a prevista), a revelação não segue
        let guardado = false;
        const guardar = (ev) => {
          if (guardado) return;
          guardado = true;
          const t = palco.querySelector('.album-titulo-bau');
          if (t) t.remove();
          if (antes && antes() === false) { ev.stopImmediatePropagation(); ev.preventDefault(); }
        };
        palco.querySelectorAll('.rv-bau, .rv-pular').forEach((b) => b.addEventListener('click', guardar, true));
      }
      if (rv && typeof rv.then === 'function') rv.then(fim); else fim();
    } else fim();
  }

  // O resultado de um evento já pago, lido do livro-caixa (para a legenda).
  function resultadoDe(chave) {
    const ev = estado().eventos[chave];
    const c = porId.get(ev.carta);
    const r = R().resumo(estado());
    const copias = R().copias(estado()).filter((y) => y.carta === ev.carta);
    const desta = copias.filter((y) => y.raridade === ev.raridade);
    const doMesmo = doAlbum(c.album);
    return { chave, carta: ev.carta, raridade: ev.raridade, nova: copias[0].chave === chave, versaoNova: desta[0].chave === chave, copias: desta.length,
      tem: doMesmo.filter((y) => r.tem[y.id]).length, total: doMesmo.length };
  }

  // No baú (03-trilha.js): a carta que o baú pagou e, em seguida, na mesma tela, o que mais foi pago
  // junto (outros: o sorteio de marco do álbum que ele completou, um marco de unidade...).
  function revelarNoBau(el, palco, { chave, ref, fechar, outros = [] }) {
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
    const fila = outros.filter((y) => y.carta && estado().eventos[y.chave]).map((y) => resultadoDe(y.chave));
    const proxima = () => {
      const y = fila.shift();
      if (!y) { fechar(); CC.redesenhar(); return; }
      montarRevelacao(el, palco, y, { origem: origem(y), aoContinuar: proxima });
    };
    montarRevelacao(el, palco, x, { ref, aoContinuar: proxima });
    return true;
  }

  // O baú da Trilha já como o baú da revelação (um baú só, um toque): a carta prevista é a que o
  // toque vai pagar (o sorteio é o mesmo, com a mesma semente). guardar() é o toque: guarda o baú
  // e devolve o que foi pago; se a carta paga não for a prevista (o estado mudou no meio), a
  // revelação recomeça com a carta de verdade.
  function bauDaRevelacao(el, palco, { previsto, chave, ref, fechar, guardar, titulo }) {
    let fila = [];
    const proxima = () => {
      const y = fila.shift();
      if (!y) { fechar(); CC.redesenhar(); return; }
      montarRevelacao(el, palco, y, { origem: origem(y), aoContinuar: proxima });
    };
    montarRevelacao(el, palco, () => (estado().eventos[chave] ? resultadoDe(chave) : previsto), {
      ref, abrir: 'toque', titulo, aoContinuar: proxima,
      antes: () => {
        const pago = guardar();
        fila = pago.novos.filter((y) => y.chave !== chave && y.fonte !== 'bau' && y.carta && estado().eventos[y.chave]).map((y) => resultadoDe(y.chave));
        const ev = estado().eventos[chave];
        if (ev && ev.carta === previsto.carta && ev.raridade === previsto.raridade) return true;
        setTimeout(() => revelarNoBau(el, palco, { chave, ref, fechar, outros: pago.novos.filter((y) => y.chave !== chave && y.fonte !== 'bau') }));
        return false;
      },
    });
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
          montarRevelacao(el, palco, x, { origem: origem(x), aoContinuar: proxima });
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
    const atual = r.albuns.find((a) => a.id === r.atual);
    const secoes = r.albuns.map((a) => '<section class="album-secao" data-album="' + a.id + '">'
      + CC.tituloSecao(a.nome, a.tem + ' de ' + a.total + ' cartas')
      + '<p class="album-versoes">Coleção: ' + a.versoes + ' de ' + a.totalVersoes + ' versões</p>'
      + '<div class="album-grade">' + doAlbum(a.id).map((c) => itemDaGrade(c, tem, largura)).join('') + '</div></section>').join('');
    const quem = (CC.quem || {}).cartasServidor;
    const semeadores = doAlbum('semeadores');
    const secSemeadores = '<section class="album-secao album-especial" data-album="semeadores">'
      + CC.tituloSecao('Semeadores', plural(semeadores.filter((c) => tem[c.id]).length, 'carta', 'cartas'))
      + (quem ? '<p class="album-versoes">' + (quem.amigos === 1 ? '1 amigo chegou' : quem.amigos + ' amigos chegaram') + ' pelo seu convite.</p>' : '')
      + '<div class="album-grade">' + semeadores.map((c, i) => {
        // limiar alcançado cuja carta ainda não tem desenho: fica anotado e a carta vem depois
        const alcancado = !tem[c.id] && r.alcancados.includes('convite:tier:' + (i + 1));
        return '<div class="album-limiar' + (alcancado ? ' alcancado' : '') + '">' + itemDaGrade(c, tem, largura)
          + '<small>' + plural(c.amigos, 'amigo', 'amigos') + (alcancado ? ' · alcançado' : '') + '</small></div>';
      }).join('') + '</div></section>';
    const boas = doAlbum('boas-vindas').filter((c) => tem[c.id]);
    const secBoas = boas.length ? '<section class="album-secao album-especial" data-album="boas-vindas">' + CC.tituloSecao('Boas-vindas')
      + '<div class="album-grade">' + boas.map((c) => itemDaGrade(c, tem, largura)).join('') + '</div></section>' : '';
    raiz.innerHTML = '<div class="folha-perfil">' + CC.botaoVoltar('Perfil') + '<h1>Cartas</h1>'
      + '<p class="passo-dica">' + r.cartas + ' de ' + r.totalCartas + ' cartas' + (r.repetidas ? ' · ' + plural(r.repetidas, 'repetida', 'repetidas') : '') + '</p></div>'
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
  // As chances são públicas: as do sorteio comum e as do sorteio de marco, as proteções e os
  // números da própria pessoa.
  function oQuePodeVir() {
    const P = R().PESOS;
    const r = R().resumo(estado(), CC.hojeIso());
    const M = R().chancesDeMarco(r.marcosSemGloria);
    const atual = r.albuns.find((a) => a.id === r.atual);
    const linha = (rar, texto) => '<li>' + icone(rar) + '<span><b>' + NOMES[rar] + '</b> ' + texto + '</span></li>';
    CC.folha('<h2>O que pode vir</h2>'
      + '<p class="passo-dica pequena">Cada baú sorteia uma raridade e depois a carta.</p>'
      + '<ul class="album-chances" data-tabela="comum">' + ORDEM.map((v) => linha(v, P[v] + '%')).join('') + '</ul>'
      + '<h3 class="album-sub">Nos marcos</h3>'
      + '<p class="passo-dica pequena">Álbum completo, fim de uma unidade da Trilha, 100 e 365 dias de leitura: um sorteio a mais, sem Linho nem Bronze.</p>'
      + '<ul class="album-chances" data-tabela="marco">' + ['prata', 'ouro', 'gloria'].map((v) => linha(v, M[v] + '%')).join('') + '</ul>'
      + '<h3 class="album-sub">Proteções</h3><ul class="album-regras">'
      + '<li>A primeira carta é uma Prata.</li>'
      + '<li>No máximo ' + R().MAX_SEM_ALTA + ' seguidas sem Prata ou melhor.</li>'
      + '<li>A partir do ' + R().OURO_SOBE_EM + 'º sorteio sem Ouro, a chance dele sobe ' + R().OURO_PASSO + ' pontos a cada um, e o ' + R().OURO_ATE + 'º é Ouro.</li>'
      + '<li>A cada marco sem Glória, a chance dela no marco seguinte sobe ' + R().MARCO_PASSO + ' pontos.</li>'
      + '<li>As cartas que você ainda não tem saem mais, principalmente as do álbum atual.</li>'
      + (r.lancadas < r.totalCartas ? '<li>Hoje podem sair ' + r.lancadas + ' das ' + r.totalCartas + ' cartas.</li>' : '') + '</ul>'
      + '<h3 class="album-sub">Você</h3><ul class="album-regras">'
      + (atual ? '<li>Álbum atual: ' + CC.esc(atual.nome) + ', ' + atual.tem + ' de ' + atual.total + ' cartas.</li>' : '')
      + '<li>Desde o último Ouro: ' + plural(r.semOuro, 'sorteio', 'sorteios') + '.</li>'
      + '<li>Desde a última Prata ou melhor: ' + plural(r.semAlta, 'sorteio', 'sorteios') + '.</li>'
      + '<li>No seu próximo marco, a Glória tem ' + M.gloria + '%.</li></ul>'
      + '<div class="acoes"><button class="botao plano" data-fechar>Fechar</button></div>', {
      rotulo: 'O que pode vir',
      classe: 'folha-pode-vir',
      rolavel: true,
      ligar: (folha, fechar) => { folha.querySelector('[data-fechar]').onclick = fechar; },
    });
  }

  CC.album = { CATALOGO, tela, abrirCarta, oQuePodeVir, revelarNoBau, bauDaRevelacao, revelarNovas, paraArte, temArte };
})(window.CC);
