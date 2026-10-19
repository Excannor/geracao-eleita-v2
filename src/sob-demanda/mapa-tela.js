/* A tela de cada mapa do livro (#/mapa/<slug>): as setas, os blocos e o estilo deles. Pedida só
   na primeira vez que um mapa abre: o build a publica como mapa-tela.<resumo>.js, com o estilo
   (mapa-tela.css) no lugar da marca abaixo, e o service worker a guarda no cache "caminho-telas"
   para abrir sem rede. A casca (a barra, a cabeça, o carregamento e o erro), o cartão do
   Explorar e a tabela dos 66 moram em src/app/06b-mapas.js, no index.html. O conteúdo de cada
   livro chega pelo arquivo mapa-<slug>.<resumo>.json, como antes. */
(function (CC) {
  'use strict';

  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-mapa-tela]')) {
    const s = document.createElement('style');
    s.dataset.mapaTela = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  const D = CC.D;
  const { LIVROS, nb, folha, ajustarNome } = CC.mapas;
  const NOME_DA_SIGLA = new Map(LIVROS.map(([nome, , sigla]) => [sigla, nome]));
  const siglaDe = (nome) => (LIVROS.find(([l]) => l === nome) || [])[2] || nome;
  // citação que abre com palavra curta (“O nome...”, “o Filho...”) não deixa o “O sozinho no fim da linha
  const tx = (t) => CC.esc(t).replace(/([“‘]\S{1,2}) /g, '$1\u00a0');
  const marca = (ref) => '<mark>' + nb(CC.esc(ref)) + '</mark>';
  const marcas = (refs) => (refs || []).map(marca).join(' ');
  // "Mt 1.23" por extenso: "Mateus 1.23"
  const porExtenso = (ref) => String(ref || '').replace(/^(\S+) /, (m, sigla) => (NOME_DA_SIGLA.get(sigla) || sigla) + ' ');

  // ---------- os capítulos que o plano já leu deste livro ----------
  // O progresso que o app já tem (dias lidos), recortado pelos trechos de cada dia.
  function capitulosLidos(nome) {
    const lidos = new Set();
    if (!CC.leu) return lidos;
    for (const d of D.plano) {
      if (!CC.leu(d.numero)) continue;
      for (const t of d.trechos || []) if (t.livro === nome) for (let c = t.de; c <= t.ate; c++) lidos.add(c);
    }
    return lidos;
  }
  const FICHA = (nome) => '03 - Livros da Bíblia/' + nome;

  // ---------- a tela do mapa ----------
  const ICONE = {
    alfinete: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    pena: '<path d="M20 4C12 5 7 11 6 19c5-3 11-8 14-15z"/><path d="M20 4L5 21"/>',
    raiz: '<path d="M12 3v11"/><path d="M12 14c-3 0-5 2-6 6M12 14c3 0 5 2 6 6M12 14v7"/>',
    linhas: '<path d="M4 6h16M4 12h10M4 18h13"/>',
    lampada: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c1 1 1.5 2 1.5 3.5h5c0-1.5.5-2.5 1.5-3.5A6 6 0 0 0 12 3z"/>',
    lupa: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  };
  const icone = (nome) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONE[nome] + '</svg>';
  const rotulo = (nome, texto) => '<div class="mapa-rotulo">' + icone(nome) + '<span>' + CC.esc(texto) + '</span></div>';
  const desenho = (mapa, id) => (mapa.desenhos && mapa.desenhos[id] ? '<span class="desenho" aria-hidden="true">' + mapa.desenhos[id] + '</span>' : '');
  const POR_EXTENSO = { 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete' };

  // Uma curva pontilhada de (x1, 4) até a ponta, em alt - 6, com a ponta de seta em cima do bloco
  // seguinte. A largura é a da coluna de verdade: assim a ponta cai em cima do desenho ou do
  // título certo em qualquer tela.
  // A curva é um S simétrico, como a estrada da trilha: sai vertical do bloco de cima, cruza com
  // a mesma curvatura dos dois lados e chega vertical em cima do bloco de baixo (cada ponto de
  // controle a 55% da altura, um em cada ponta). Antes, o primeiro ponto de controle ficava quase
  // no fundo: a linha descia reta e dobrava num cotovelo perto do fim, e a ponta, um "v" fixo
  // para baixo, nem sempre seguia a direção em que a curva chegava (o dono viu no iPhone).
  let W = 358;
  const K = 0.55;
  const r1 = (n) => Math.round(n * 10) / 10;
  // os quatro pontos da cúbica e um ponto dela em t
  const curvaS = (a, b, y0, y1) => { const d = (y1 - y0) * K; return [[a, y0], [a, y0 + d], [b, y1 - d], [b, y1]]; };
  const ponto = (P, t) => {
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return [k[0] * P[0][0] + k[1] * P[1][0] + k[2] * P[2][0] + k[3] * P[3][0], k[0] * P[0][1] + k[1] * P[1][1] + k[2] * P[2][1] + k[3] * P[3][1]];
  };
  const comprimento = (P) => {
    let L = 0; let [x, y] = P[0];
    for (let i = 1; i <= 64; i++) { const [nx, ny] = ponto(P, i / 64); L += Math.hypot(nx - x, ny - y); x = nx; y = ny; }
    return L;
  };
  function seta(x1, x2, alt) {
    const fim = alt - 6;
    const P = curvaS(Math.round(x1), Math.round(x2), 4, fim);
    // Os pontos caem certos nas duas pontas: o passo do pontilhado é acertado pelo comprimento
    // da curva, para o último ponto ficar na ponta da seta (sem vão antes dela).
    const L = comprimento(P);
    const passo = r1(L / Math.max(1, Math.round(L / 7.1)) - 0.1);
    // A ponta segue a tangente no fim da curva (a direção do último ponto de controle ao fim),
    // com o bico exatamente no fim da linha.
    const ang = Math.atan2(P[3][1] - P[2][1], P[3][0] - P[2][0]);
    const asa = (lado) => { const t = ang + Math.PI + lado * 0.68; return r1(P[3][0] + 10 * Math.cos(t)) + ' ' + r1(P[3][1] + 10 * Math.sin(t)); };
    return '<svg class="seta" width="' + W + '" height="' + alt + '" viewBox="0 0 ' + W + ' ' + alt + '" aria-hidden="true">'
      + '<path class="pontos" style="stroke-dasharray:0.1 ' + passo + '" d="M' + P[0].join(' ') + 'C' + P[1].map(r1).join(' ') + ' ' + P[2].map(r1).join(' ') + ' ' + P[3].join(' ') + '"/>'
      + '<path class="ponta" d="M' + asa(-1) + 'L' + P[3].join(' ') + 'L' + asa(1) + '"/></svg>';
  }
  // A altura da curva entre dois blocos cresce com a distância de um lado ao outro, para o S
  // não deitar quando atravessa a coluna inteira.
  const curta = (x1, x2) => seta(x1, x2, Math.round(Math.min(110, Math.max(64, 64 + Math.abs(x2 - x1) * 0.16))));
  // Entre dois ramos, com a conexão escrita no canto que a curva deixa livre. A altura é
  // acertada depois, pelo tamanho real do texto (ajustarConexoes).
  const longa = (x1, x2, texto, lado) => '<div class="mapa-conexao" data-x1="' + Math.round(x1) + '" data-x2="' + Math.round(x2) + '" data-lado="' + lado + '">' + seta(x1, x2, 150)
    + (texto ? '<p class="mapa-ligacao ' + lado + '">' + tx(texto) + '</p>' : '') + '</div>';
  // A curva só cruza para o lado do texto abaixo dele: a área tem a menor altura em que nenhum
  // ponto do S cai no retângulo do texto (com 10px de folga). Com o S simétrico, ela fica
  // perto do dobro da altura do texto.
  function alturaLivre(x1, x2, caixa) {
    for (let alt = 150; alt < 900; alt += 4) {
      const P = curvaS(x1, x2, 4, alt - 6);
      let livre = true;
      for (let i = 0; i <= 80 && livre; i++) {
        const [x, y] = ponto(P, i / 80);
        if (x > caixa.esq - 10 && x < caixa.dir + 10 && y < caixa.baixo + 10) livre = false;
      }
      if (livre) return alt;
    }
    return 900;
  }
  function ajustarConexoes(raiz) {
    raiz.querySelectorAll('.mapa-conexao').forEach((el) => {
      const p = el.querySelector('.mapa-ligacao');
      const x1 = Number(el.dataset.x1); const x2 = Number(el.dataset.x2);
      const alt = p ? alturaLivre(x1, x2, { esq: p.offsetLeft, dir: p.offsetLeft + p.offsetWidth, baixo: p.offsetTop + p.offsetHeight }) : 150;
      el.style.height = alt + 'px';
      el.querySelector('.seta').outerHTML = seta(x1, x2, alt);
    });
  }
  function corpoDoMapa(mapa) {
    const nome = mapa.nome;
    const esq = 56; const dir = W - 56; const meio = W / 2;
    const lidos = capitulosLidos(nome);
    const s = mapa.significado || {};
    const LANG = { hebraico: 'he', grego: 'el', aramaico: 'arc' };

    const significado = rotulo('alfinete', 'Significado do nome')
      + '<p>Em ' + CC.esc(s.lingua || 'hebraico') + ', '
      + (s.original ? '<span class="mapa-original" lang="' + (LANG[s.lingua] || 'he') + '" dir="' + (s.lingua === 'grego' ? 'ltr' : 'rtl') + '">' + CC.esc(s.original) + '</span>, ' : '')
      + (s.transliteracao ? '<i>' + CC.esc(s.transliteracao) + '</i>: ' : '')
      + '<b>“' + CC.esc(s.traducao) + '”</b>. ' + CC.esc(s.texto) + '</p>';

    const a = mapa.autoria || {};
    const autoria = '<div class="mapa-textos">' + rotulo('pena', 'Autoria e época')
      + '<p>' + tx(a.texto) + ' ' + marcas(a.refs) + '</p>'
      + (a.apoio ? '<p>' + tx(a.apoio) + '</p>' : '') + '</div>' + desenho(mapa, a.desenho);

    const r = mapa.raiz || {};
    const raiz = rotulo('raiz', 'A raiz do livro') + '<p class="mapa-raiz-texto">' + tx(r.texto) + '</p>'
      + (r.apoio ? '<p>' + tx(r.apoio) + ' ' + marcas(r.refs) + '</p>' : '<p>' + marcas(r.refs) + '</p>');

    const ramos = (mapa.ramos || []).map((ramo, i) => {
      const lado = i % 2 ? 'lado-dir' : 'lado-esq';
      const galhos = (ramo.galhos || []).map((g) => '<li>' + tx(g.texto) + ' ' + marca(g.ref) + '</li>').join('')
        + (ramo.jesus ? '<li class="mapa-jesus">' + tx(ramo.jesus.texto) + ' ' + marcas(ramo.jesus.refs) + '</li>' : '');
      const proximo = mapa.ramos[i + 1];
      // do desenho deste ramo até o desenho do seguinte, que fica do outro lado
      const ligacao = proximo ? longa(i % 2 ? dir : esq, i % 2 ? esq : dir, ramo.conexao, i % 2 ? 'esq' : 'dir') : '';
      return '<div class="mapa-ramo ' + lado + '" data-ramo="' + (i + 1) + '"><div class="mapa-ramo-cabeca">' + desenho(mapa, ramo.desenho)
        + '<div class="mapa-ramo-textos"><span class="mapa-ramo-rotulo">Ramo ' + (i + 1) + '</span>'
        + '<span class="mapa-ramo-nome">' + CC.esc(ramo.titulo) + '</span>'
        + '<span class="mapa-ramo-sub">' + CC.esc(ramo.sub) + '</span></div></div>'
        + '<ul class="mapa-galhos">' + galhos + '</ul></div>' + ligacao;
    }).join('');
    const n = (mapa.ramos || []).length;
    const ultimoLado = n % 2 ? esq : dir;

    const c = mapa.cristo || {};
    const cristo = '<div class="mapa-cristo-cabeca"><div class="mapa-textos"><span class="mapa-rotulo-claro">' + CC.esc(nome + ' e Cristo') + '</span>'
      + '<span>' + tx(c.texto) + ' ' + marca(c.ref) + '</span></div>' + desenho(mapa, c.desenho) + '</div>'
      + '<div class="mapa-pares">' + (c.pares || []).map((p) => '<span class="mapa-par-at">' + nb(CC.esc(p.at)) + '</span>'
        + '<span><span class="mapa-par-texto">' + CC.esc(p.texto) + '</span><br><span class="mapa-par-nt">' + nb(CC.esc(porExtenso(p.nt)))
        + (p.nota ? ': ' + CC.esc(p.nota) : '') + '</span></span>').join('') + '</div>';

    // "você está aqui": a primeira parte que o plano ainda não terminou, só depois que a leitura
    // do livro começou; antes disso, só a lista.
    const partes = mapa.estrutura || [];
    const comecou = lidos.size > 0;
    // Num livro de um capítulo só, as partes contam versículos do capítulo 1.
    const umCapitulo = mapa.capitulos === 1;
    const lida = (p) => { if (umCapitulo) return lidos.has(1); for (let ch = p.de; ch <= p.ate; ch++) if (!lidos.has(ch)) return false; return true; };
    let aqui = -1;
    if (comecou) aqui = partes.findIndex((p) => !lida(p));
    const estrutura = rotulo('linhas', 'Estrutura do livro') + '<ol class="mapa-estrutura">' + partes.map((p, i) => {
      const ref = mapa.sigla + ' ' + (umCapitulo ? '1.' + (p.de === p.ate ? p.de : p.de + '-' + p.ate) : (p.de === p.ate ? p.de : p.de + '–' + p.ate));
      const feita = comecou && lida(p);
      return '<li class="' + (feita ? 'lida' : '') + (i === aqui ? ' aqui' : '') + '">' + (feita ? CC.ico('certo') : '')
        + CC.esc(p.titulo) + ' ' + marca(ref) + (i === aqui ? ' <span class="mapa-aqui">você está aqui</span>' : '') + '</li>';
    }).join('') + '</ol>';

    const curiosidades = rotulo('lampada', 'Curiosidades do texto') + '<ul class="mapa-curiosidades">'
      + (mapa.curiosidades || []).map((x) => '<li>' + tx(x.texto) + ' ' + marca(x.ref) + '</li>').join('') + '</ul>';

    const procure = rotulo('lupa', 'Enquanto lê, procure') + '<p class="mapa-procure-texto">' + tx((mapa.procure || {}).texto) + '</p>';

    // O botão do fim leva à Bíblia do app, no capítulo em que o plano parou (ou no 1).
    let proximoCap = 1;
    while (lidos.has(proximoCap) && proximoCap < mapa.capitulos) proximoCap++;
    const tudoLido = lidos.size >= mapa.capitulos;
    const ler = '<a class="botao mapa-ler" href="#/biblia/' + encodeURIComponent(nome) + '/' + (tudoLido ? 1 : proximoCap) + '">'
      + (tudoLido ? 'Reler ' + CC.esc(nome) + ' 1' : (comecou ? 'Continuar em ' : 'Ler ') + CC.esc(nome) + ' ' + proximoCap) + '</a>';

    return '<div class="mapa">'
      + seta(96, 40, 64) + '<section class="mapa-bloco mapa-significado">' + significado + '</section>'
      + curta(60, W - 52) + '<section class="mapa-bloco mapa-autoria">' + autoria + '</section>'
      + curta(W - 52, meio) + '<section class="mapa-bloco mapa-raiz">' + raiz + '</section>'
      + curta(meio, 64) + '<div class="mapa-ramos-titulo"><span>Os ' + (POR_EXTENSO[n] || n) + ' ramos</span><span>siga as setas</span></div>'
      + ramos
      + curta(ultimoLado, meio) + '<section class="mapa-bloco mapa-cristo">' + cristo + '</section>'
      + curta(meio, W - 58) + '<section class="mapa-bloco mapa-estrutura-bloco">' + estrutura + '</section>'
      + curta(W - 58, 64) + '<section class="mapa-bloco mapa-curiosidades-bloco">' + curiosidades + '</section>'
      + curta(64, meio) + '<section class="mapa-bloco mapa-procure">' + procure + '</section>'
      + ler
      // a ficha do livro (Explorar > Livros) e o mapa ficam ligados nos dois sentidos
      + (D.notas[FICHA(nome)] ? '<a class="botao contorno mapa-ficha" href="#/nota/' + encodeURIComponent(FICHA(nome)) + '">Ver a ficha do livro</a>' : '')
      + '</div>';
  }

  const carregados = new Map();
  function carregar(m) {
    if (!carregados.has(m.slug)) {
      const pedido = fetch(m.arquivo).then((r) => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then((mapa) => { carregados.set(m.slug, { pronto: mapa }); return mapa; });
      pedido.catch(() => carregados.delete(m.slug));
      carregados.set(m.slug, { pedido });
    }
    const c = carregados.get(m.slug);
    return c.pronto ? Promise.resolve(c.pronto) : c.pedido;
  }

  function ligar(raiz, m) {
    const bt = raiz.querySelector('[data-compartilhar-mapa]');
    if (bt) {
      bt.onclick = async () => {
        const r = await CC.compartilhar('Mapa do livro de ' + m.nome + ' no Geração Eleita', location.origin + location.pathname + '#/mapa/' + m.slug);
        if (r === 'copiado') CC.avisar('Link copiado');
        else if (r === 'falhou') CC.avisar('Não consegui compartilhar agora');
      };
    }
    CC.ligarVoltarDoTopo(raiz);
    CC.inseparavel(raiz);
    // As medidas dependem da letra: na primeira abertura a Literata e a Permanent Marker ainda
    // podem estar chegando, e o texto medido com a letra de reserva era mais curto (a curva
    // atravessava a última linha da conexão). Por isso mede agora, no quadro seguinte e de
    // novo quando as fontes terminam de carregar; o ajuste é o mesmo as três vezes.
    const ajustar = () => { if (!raiz.querySelector('.mapa')) return; ajustarNome(raiz); ajustarConexoes(raiz); };
    ajustar();
    requestAnimationFrame(ajustar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar);
  }

  // A tela de um mapa que existe (a casca, em 06b-mapas.js, cuida do "não encontrei"): desenha
  // na hora quando o mapa já chegou (o redesenho não perde a rolagem); senão, a barra, a cabeça
  // e o esqueleto até o arquivo do mapa chegar.
  CC.mapas.tela = function (raiz, m) {
    W = Math.max(280, raiz.clientWidth - 32);
    const cache = carregados.get(m.slug);
    const pintar = (mapa) => {
      raiz.innerHTML = folha(m) + corpoDoMapa({ ...mapa, sigla: siglaDe(mapa.nome) });
      ligar(raiz, m);
    };
    // Já carregado: desenha na hora, para o redesenho não perder a rolagem.
    if (cache && cache.pronto) { pintar(cache.pronto); return; }
    raiz.innerHTML = folha(m) + CC.esqueleto('texto');
    ligar(raiz, m);
    if (!CC.appServido()) { raiz.querySelector('.esqueleto').outerHTML = '<div class="vazio">Não consegui abrir o mapa agora.</div>'; return; }
    const geracao = (raiz.dataset.mapaGeracao = String(Date.now()));
    carregar(m).then((mapa) => {
      if (raiz.dataset.mapaGeracao !== geracao || !raiz.querySelector('.folha-mapa')) return;
      pintar(mapa);
    }).catch(() => {
      if (raiz.dataset.mapaGeracao !== geracao || !raiz.querySelector('.folha-mapa')) return;
      const semRede = navigator.onLine === false;
      raiz.querySelector('.esqueleto').outerHTML = CC.estado({
        erro: true, icone: 'info',
        titulo: semRede ? 'Sem conexão' : 'Não consegui abrir o mapa',
        texto: semRede ? 'Conecte-se para abrir.' : 'Pode ter sido a conexão. Tente de novo em instantes.',
        acao: 'Tentar de novo',
      });
      const b = raiz.querySelector('[data-acao-estado]');
      if (b) b.onclick = () => CC.redesenhar();
    });
  };

  // Girou o celular: as setas são desenhadas na largura da coluna, então o mapa é redesenhado.
  let atraso;
  addEventListener('resize', () => {
    clearTimeout(atraso);
    atraso = setTimeout(() => {
      const raiz = document.querySelector('.conteudo');
      if (raiz && raiz.querySelector('.mapa') && Math.abs(raiz.clientWidth - 32 - W) > 4) CC.redesenhar();
    }, 150);
  });
})(window.CC);
