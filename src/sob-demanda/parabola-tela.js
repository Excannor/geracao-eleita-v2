/* A lista das parábolas (#/parabolas) e a página de cada uma (#/parabola/<slug>), pedidas só
   na primeira vez que a pessoa entra: o build as publica como parabola-tela.<resumo>.js, com o
   estilo (parabola-tela.css) embutido no lugar da marca abaixo, e o service worker as guarda
   junto com as parábolas. A casca (o carregamento e o erro) e o cartão do Explorar moram em
   src/app/06c-parabolas.js, no index.html. Referência aprovada pelo dono: o mock de 09/10.
   A lista agrupa por onde a parábola está (só os grupos com publicadas, também nos filtros) e
   marca as lidas. A página, de cima para baixo, como no mock: o desenho grande e o nome no
   pincel; as seções (onde Jesus está, a história) com as falas destacadas e o bloco de itens;
   "O que Jesus está dizendo"; "Pra pensar"; as parecidas em outros evangelhos; "Ler … na
   Bíblia"; as anotações da parábola (contexto "parabola:<slug>", 07g-anotacoes.js). */
(function (CC) {
  'use strict';

  const { P, porSlug, buscar, pronto } = CC.parabolas;
  const ESTILO = '/*ESTILO_PARABOLA*/';
  if (!document.querySelector('style[data-parabola-tela]')) {
    const s = document.createElement('style');
    s.dataset.parabolaTela = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  // espaço inseparável entre sigla e capítulo e um juntor depois do traço, como nos mapas
  const nb = (t) => String(t).replace(/(\S) (?=\d)/g, '$1\u00a0').replace(/(\d)([-–])(?=\d)/g, '$1$2\u2060');
  const marca = (r) => (r ? '<mark>' + nb(CC.esc(r)) + '</mark>' : '');
  const grupoDe = (id) => P.grupos.find((g) => g.id === id) || { nome: '', curto: '' };
  const lidas = () => (CC.estado().parabolasLidas || {});
  function marcarLida(slug) {
    const atuais = lidas();
    if (atuais[slug] || !porSlug.has(slug)) return;
    CC.gravar('parabolasLidas', { ...atuais, [slug]: CC.hojeIso() });
  }
  const barra = (titulo, voltar, extra) => '<div class="mapa-barra">'
    // o rótulo vai pronto no data-rotulo-voltar: o roteador não escreve "Voltar" visível no botão redondo
    + '<button class="botao-redondo" data-voltar data-rotulo-voltar="' + voltar + '" aria-label="Voltar">' + CC.ico('voltar') + '</button>'
    + '<span class="mapa-barra-titulo">' + titulo + '</span>' + (extra || '<span class="parabola-vaga"></span>') + '</div>';

  // ---------- a lista ----------
  let filtro = 'todas';
  function itemDaLista(p, desenhos) {
    const lida = !!lidas()[p.slug];
    return '<a class="item-parabola' + (lida ? ' lida' : '') + '" href="#/parabola/' + p.slug + '">'
      + '<span class="desenho" aria-hidden="true" data-desenho-lista="' + CC.esc(p.desenho) + '">' + ((desenhos || {})[p.desenho] || '') + '</span>'
      + '<span class="item-parabola-textos"><b>' + CC.esc(p.titulo) + '</b><span class="item-parabola-linha">' + CC.esc(p.linha) + '</span>'
      + '<span class="item-parabola-pe">' + marca(p.ref) + (lida ? '<span class="parabola-lida">' + CC.ico('certo') + 'lida</span>' : '') + '</span></span>'
      + CC.ico('avancar') + '</a>';
  }
  function listaHtml() {
    const desenhos = pronto(P.desenhos);
    return P.grupos.filter((g) => filtro === 'todas' || g.id === filtro).map((g) => '<section class="grupo-parabolas">'
      + '<h2>' + CC.esc(g.nome) + (g.sub ? '<small>' + CC.esc(g.sub) + '</small>' : '') + '</h2>'
      + P.itens.filter((p) => p.grupo === g.id).map((p) => itemDaLista(p, desenhos)).join('') + '</section>').join('');
  }
  function lista(raiz) {
    if (filtro !== 'todas' && !P.grupos.some((g) => g.id === filtro)) filtro = 'todas';
    const chip = (id, nome) => '<button type="button" class="chip-parabola" data-filtro="' + id + '" aria-pressed="' + (filtro === id) + '">' + CC.esc(nome) + '</button>';
    raiz.innerHTML = '<div class="folha-mapa folha-parabolas">' + barra('Parábolas', 'Explorar')
      + '<div class="parabolas-cabeca"><span class="mapa-grupo">Explorar</span><h1 class="parabolas-nome">Parábolas da Bíblia</h1>'
      + '<p>Jesus contava histórias do dia a dia, de semente, ovelha, festa e dinheiro, para falar do Reino de Deus. Toque numa para ver a cena e ler na Bíblia.</p></div>'
      + '<div class="chips-parabolas" role="group" aria-label="Filtrar por livro">' + chip('todas', 'Todas') + P.grupos.map((g) => chip(g.id, g.curto)).join('') + '</div></div>'
      + '<div class="lista-parabolas" data-lista-parabolas>' + listaHtml() + '</div>';
    const pintar = () => { raiz.querySelector('[data-lista-parabolas]').innerHTML = listaHtml(); CC.inseparavel(raiz); };
    raiz.querySelectorAll('[data-filtro]').forEach((b) => {
      b.onclick = () => {
        filtro = b.dataset.filtro;
        raiz.querySelectorAll('[data-filtro]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        pintar();
      };
    });
    CC.ligarVoltarDoTopo(raiz);
    CC.inseparavel(raiz);
    // Os desenhos da lista chegam num arquivo à parte; sem ele (sem rede na primeira vez), a lista funciona sem eles.
    if (P.desenhos && !pronto(P.desenhos)) {
      buscar(P.desenhos).then(() => { if (raiz.querySelector('[data-lista-parabolas]')) pintar(); }).catch(() => null);
    }
  }

  // ---------- a parábola ----------
  // citação que abre com palavra curta não deixa a aspa e a palavra sozinhas no fim da linha
  const tx = (t) => CC.esc(t).replace(/([“‘]\S{1,2}) /g, '$1 ');
  const ref = (r) => (r ? ' ' + marca(r) : '');
  // "dizer-lhe", "vê-lo": dentro das falas, a palavra com hífen não quebra no hífen
  const falaTx = (t) => tx(t).replace(/[^\s“]+-[^\s”]+/g, '<span class="sem-quebra">$&</span>');
  // "Lc 14.15-24" → { livro: "Lucas", cap: 14, de: 15, ate: 24 }
  const NOME_DA_SIGLA = new Map((CC.LIVROS_MAPA || []).map(([nome, , sigla]) => [sigla, nome]));
  const trechoDe = (r) => {
    const m = /^(\S+) (\d+)\.(\d+)(?:-(\d+))?/.exec(String(r || ''));
    return m ? { livro: NOME_DA_SIGLA.get(m[1]) || m[1], cap: Number(m[2]), de: Number(m[3]), ate: Number(m[4] || m[3]) } : null;
  };

  const ICONE = {
    alfinete: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    pao: '<path d="M4 12a8 5 0 0 1 16 0v5H4z"/><path d="M9 9l1.5 2M13 8.5l1.5 2"/>',
    pessoas: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5 2.2 5 5"/>',
    estrada: '<path d="M8 3L4 21M16 3l4 18M12 5v3M12 11v3M12 17v3"/>',
    broto: '<path d="M12 21V11"/><path d="M12 11C12 6 8 4 4 4c0 4 3 7 8 7zM12 13c0-4 3-6 8-6 0 4-3 6-8 6z"/>',
    lamparina: '<path d="M3 15c2 3 12 3 15-1H8c-3 0-5 0-5 1z"/><path d="M18 14l3-2"/><path d="M20 10c-2-2-1-4 0-6 1 2 2 4 0 6z"/>',
    moeda: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/>',
    ancora: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8M5 14c0 4 3 7 7 7s7-3 7-7"/>',
  };
  const rotulo = (icone, texto) => '<h2 class="mapa-rotulo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + (ICONE[icone] || ICONE.alfinete) + '</svg><span>' + CC.esc(texto) + '</span></h2>';
  // a curva pontilhada entre as partes, como no mapa, alternando o lado
  const seta = (i) => '<svg class="seta parabola-seta" viewBox="0 0 120 44" aria-hidden="true">'
    + (i % 2 ? '<path class="pontos" d="M30 2C50 20 80 16 88 36"/><path class="ponta" d="M82 33l6 5 3-8"/>'
      : '<path class="pontos" d="M80 2C70 20 40 18 32 36"/><path class="ponta" d="M26 32l6 6 5-7"/>') + '</svg>';
  const desenho = (p, id, classe) => (p.desenhos && p.desenhos[id] ? '<span class="desenho' + (classe ? ' ' + classe : '') + '" aria-hidden="true">' + p.desenhos[id] + '</span>' : '');

  // quatro itens viram duas linhas de dois: a 390px, quatro colunas espremem os nomes
  function bloco(p, b) {
    if (b.fala !== undefined) return '<p class="fala-parabola">“' + falaTx(b.fala) + '”' + ref(b.ref) + '</p>';
    if (b.itens) {
      return '<div class="itens-parabola" style="--colunas:' + (b.itens.length === 4 ? 2 : b.itens.length) + '">' + b.itens.map((it) => '<div class="item-cena">' + desenho(p, it.desenho)
        + '<b>' + CC.esc(it.titulo) + '</b>' + (it.fala ? '<span>“' + falaTx(it.fala) + '”</span>' : '') + '</div>').join('') + '</div>';
    }
    return '<p class="texto-parabola">' + tx(b.texto) + ref(b.ref) + '</p>';
  }

  // os minutos de leitura da página: o texto corrido a 200 palavras por minuto
  function minutos(p) {
    const textos = [p.dizendo.texto, p.dizendo.apoio || ''].concat(p.perguntas);
    for (const s of p.secoes) for (const b of s.blocos) textos.push(b.texto || b.fala || '', ...(b.itens || []).map((it) => it.titulo + ' ' + (it.fala || '')));
    return Math.max(1, Math.round(textos.join(' ').split(/\s+/).filter(Boolean).length / 200));
  }

  function corpo(p, slug) {
    const t = trechoDe(p.ref);
    const d = p.dizendo;
    const parecidas = (p.parecidas || []).map((x) => {
      const destino = x.slug && porSlug.get(x.slug);
      const dentro = desenho(p, p.desenhoLista) + '<span><b>Parecida em ' + CC.esc((trechoDe(x.ref) || {}).livro || '') + ' · ' + CC.esc(x.titulo) + '</b>'
        + '<small>' + nb(CC.esc(x.ref)) + (x.linha ? ' · ' + CC.esc(x.linha) : '') + '</small></span>';
      return destino ? '<a class="parecida-parabola" href="#/parabola/' + x.slug + '">' + dentro + CC.ico('avancar') + '</a>' : '<div class="parecida-parabola">' + dentro + '</div>';
    }).join('');
    return '<div class="parabola">'
      + p.secoes.map((s, i) => seta(i) + '<section class="secao-parabola">' + rotulo(s.icone, s.titulo) + s.blocos.map((b) => bloco(p, b)).join('') + '</section>').join('')
      + seta(p.secoes.length) + '<section class="dizendo-parabola">' + rotulo('ancora', 'O que Jesus está dizendo')
      + '<p class="dizendo-texto">' + tx(d.texto) + '</p><p class="dizendo-apoio">' + (d.apoio ? tx(d.apoio) + ref(d.ref) : marca(d.ref)) + '</p></section>'
      + '<h2 class="pensar-parabola">Pra pensar</h2><ol class="perguntas-parabola">' + p.perguntas.map((q) => '<li>' + tx(q) + '</li>').join('') + '</ol>'
      + parecidas
      + (t ? '<a class="botao parabola-ler" data-ler-parabola href="#/biblia/' + encodeURIComponent(t.livro) + '/' + t.cap + '">Ler ' + CC.esc(t.livro + ' ' + t.cap) + ' na Bíblia</a>' : '')
      + '<span class="parabola-fim" data-fim-parabola aria-hidden="true"></span>'
      + '<div data-notas-contexto="parabola:' + CC.esc(slug) + '" data-tipo-nota="nota"></div></div>';
  }

  // O nome no pincel encolhe até caber numa linha (como o nome do livro no mapa).
  function ajustarNome(raiz) {
    const nome = raiz.querySelector('.parabola-nome');
    if (!nome) return;
    nome.style.fontSize = '';
    let tamanho = parseFloat(getComputedStyle(nome).fontSize);
    for (let i = 0; i < 10 && tamanho > 24 && nome.scrollWidth > nome.clientWidth + 1; i++) { tamanho -= 2; nome.style.fontSize = tamanho + 'px'; }
  }

  let observador = null;
  function pagina(raiz, item, p) {
    raiz.innerHTML = '<div class="folha-mapa folha-parabola">' + barra('Parábola', 'Parábolas',
      '<button class="botao-redondo" data-compartilhar-parabola aria-label="Compartilhar esta parábola">' + CC.ico('compartilhar') + '</button>')
      + '<div class="parabola-cabeca"><span class="mapa-grupo">' + CC.esc(grupoDe(item.grupo).nome) + '</span>' + desenho(p, p.desenho, 'parabola-heroi')
      + '<h1 class="parabolas-nome parabola-nome">' + CC.esc(item.titulo) + '</h1>'
      + '<span class="parabola-sub">' + marca(item.ref) + '<span> · ' + minutos(p) + ' min de leitura</span></span></div></div>' + corpo(p, item.slug);
    raiz.querySelector('[data-compartilhar-parabola]').onclick = async () => {
      const r = await CC.compartilhar('A parábola “' + item.titulo + '” no Geração Eleita', location.origin + location.pathname + '#/parabola/' + item.slug);
      if (r === 'copiado') CC.avisar('Link copiado');
      else if (r === 'falhou') CC.avisar('Não consegui compartilhar agora');
    };
    CC.ligarVoltarDoTopo(raiz);
    CC.inseparavel(raiz);
    ajustarNome(raiz);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ajustarNome(raiz));
    CC.notasDoContexto(raiz);
    const ler = raiz.querySelector('[data-ler-parabola]');
    if (ler) {
      ler.onclick = (ev) => {
        const t = trechoDe(p.ref);
        marcarLida(item.slug);
        if (!t || !CC.versiculos) return;
        ev.preventDefault();
        // o leitor abre no capítulo com o começo da parábola escolhido (até o teto do trecho)
        CC.versiculos.irPara(t.livro + ' ' + t.cap + '.' + t.de + '-' + Math.min(t.ate, t.de + CC.MAX_TRECHO - 1));
      };
    }
    // Rolou até o fim (depois do "Pra pensar" e do botão da Bíblia): lida.
    const fim = raiz.querySelector('[data-fim-parabola]');
    if (fim && 'IntersectionObserver' in window) {
      observador = new IntersectionObserver((vistos) => {
        if (!vistos.some((v) => v.isIntersecting) || !fim.isConnected) return;
        if (CC.rolagemY() < 40 && document.documentElement.scrollHeight > innerHeight + 80) return;
        marcarLida(item.slug);
        observador.disconnect();
        observador = null;
      });
      observador.observe(fim);
    }
  }

  CC.parabolas.tela = (raiz, item, p) => {
    if (observador) { observador.disconnect(); observador = null; }
    if (item) pagina(raiz, item, p);
    else lista(raiz);
  };
})(window.CC);
