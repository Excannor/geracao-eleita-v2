/* Mapa do livro: a grade dos 66 no Explorar e a tela de cada mapa (#/mapa/<slug>).
   O conteúdo de cada livro mora em conteudo/mapas/<slug>.json e chega pelo arquivo
   mapa-<slug>.<resumo>.json que o build publica (window.MAPAS lista os prontos, com os
   desenhos já embutidos); o service worker o guarda na primeira abertura, como as bíblias.
   A Bíblia do app (#/biblia) não muda: o mapa só aponta para ela no botão do fim. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const MAPAS = window.MAPAS || [];

  // Os 66, na ordem do cânon, com o grupo da grade e a sigla das referências ("Is 6.1-4").
  // A mesma tabela vive em ferramentas/checar-mapa.mjs; o teste.mjs confere que as duas batem.
  const GRUPOS = ['Lei', 'Históricos', 'Poéticos', 'Profetas maiores', 'Profetas menores',
    'Evangelhos e Atos', 'Cartas de Paulo', 'Outras cartas', 'Apocalipse'];
  const LIVROS = [
    ['Gênesis', 0, 'Gn'], ['Êxodo', 0, 'Êx'], ['Levítico', 0, 'Lv'], ['Números', 0, 'Nm'], ['Deuteronômio', 0, 'Dt'],
    ['Josué', 1, 'Js'], ['Juízes', 1, 'Jz'], ['Rute', 1, 'Rt'], ['1 Samuel', 1, '1Sm'], ['2 Samuel', 1, '2Sm'],
    ['1 Reis', 1, '1Rs'], ['2 Reis', 1, '2Rs'], ['1 Crônicas', 1, '1Cr'], ['2 Crônicas', 1, '2Cr'], ['Esdras', 1, 'Ed'],
    ['Neemias', 1, 'Ne'], ['Ester', 1, 'Et'],
    ['Jó', 2, 'Jó'], ['Salmos', 2, 'Sl'], ['Provérbios', 2, 'Pv'], ['Eclesiastes', 2, 'Ec'], ['Cânticos', 2, 'Ct'],
    ['Isaías', 3, 'Is'], ['Jeremias', 3, 'Jr'], ['Lamentações', 3, 'Lm'], ['Ezequiel', 3, 'Ez'], ['Daniel', 3, 'Dn'],
    ['Oseias', 4, 'Os'], ['Joel', 4, 'Jl'], ['Amós', 4, 'Am'], ['Obadias', 4, 'Ob'], ['Jonas', 4, 'Jn'], ['Miqueias', 4, 'Mq'],
    ['Naum', 4, 'Na'], ['Habacuque', 4, 'Hc'], ['Sofonias', 4, 'Sf'], ['Ageu', 4, 'Ag'], ['Zacarias', 4, 'Zc'], ['Malaquias', 4, 'Ml'],
    ['Mateus', 5, 'Mt'], ['Marcos', 5, 'Mc'], ['Lucas', 5, 'Lc'], ['João', 5, 'Jo'], ['Atos', 5, 'At'],
    ['Romanos', 6, 'Rm'], ['1 Coríntios', 6, '1Co'], ['2 Coríntios', 6, '2Co'], ['Gálatas', 6, 'Gl'], ['Efésios', 6, 'Ef'],
    ['Filipenses', 6, 'Fp'], ['Colossenses', 6, 'Cl'], ['1 Tessalonicenses', 6, '1Ts'], ['2 Tessalonicenses', 6, '2Ts'],
    ['1 Timóteo', 6, '1Tm'], ['2 Timóteo', 6, '2Tm'], ['Tito', 6, 'Tt'], ['Filemom', 6, 'Fm'],
    ['Hebreus', 7, 'Hb'], ['Tiago', 7, 'Tg'], ['1 Pedro', 7, '1Pe'], ['2 Pedro', 7, '2Pe'], ['1 João', 7, '1Jo'],
    ['2 João', 7, '2Jo'], ['3 João', 7, '3Jo'], ['Judas', 7, 'Jd'],
    ['Apocalipse', 8, 'Ap'],
  ];
  CC.LIVROS_MAPA = LIVROS;
  CC.GRUPOS_MAPA = GRUPOS;
  const NOME_DA_SIGLA = new Map(LIVROS.map(([nome, , sigla]) => [sigla, nome]));
  const siglaDe = (nome) => (LIVROS.find(([l]) => l === nome) || [])[2] || nome;
  // "1 Samuel" vira "1-samuel"; "Cânticos", "canticos": sem acento, minúsculo, com hífen.
  CC.slugDoLivro = (nome) => CC.semAcento(nome).replace(/\s+/g, '-');
  const porSlug = new Map(MAPAS.map((m) => [m.slug, m]));
  CC.mapaDoLivro = (nome) => porSlug.get(CC.slugDoLivro(nome)) || null;

  // espaço inseparável entre sigla e capítulo e um juntor depois do traço, só na tela
  const nb = (t) => String(t).replace(/(\S) (?=\d)/g, '$1 ').replace(/(\d)([-–])(?=\d)/g, '$1$2⁠');
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
  const livroLido = (nome) => { const p = CC.progressoDoLivro ? CC.progressoDoLivro(nome) : { total: 0 }; return p.total > 0 && p.lidos === p.total; };

  // ---------- a grade dos 66 no Explorar ----------
  // Duas colunas, nomes no pincel: 20, 17 ou 15px conforme o tamanho do nome, para
  // "Tessalonicenses" nunca quebrar no meio da palavra.
  const tamanhoDoNome = (nome) => (nome.length <= 8 ? 20 : nome.length <= 12 ? 17 : 15);

  function celula([nome]) {
    const m = porSlug.get(CC.slugDoLivro(nome));
    const lido = livroLido(nome);
    const nomeHtml = '<span class="nome-mapa" style="font-size:' + tamanhoDoNome(nome) + 'px">' + nb(CC.esc(nome)) + '</span>';
    if (!m) {
      return '<span class="celula-mapa breve" aria-label="' + CC.esc(nome + ', mapa em breve') + '">' + nomeHtml + '<small>em breve</small></span>';
    }
    return '<a class="celula-mapa pronto' + (lido ? ' lido' : '') + '" href="#/mapa/' + m.slug + '"'
      + (lido ? ' aria-label="' + CC.esc(nome + ', lido inteiro no plano') + '"' : '') + '>' + nomeHtml
      + '<i class="marca-mapa" aria-hidden="true">' + CC.ico(lido ? 'certo' : 'avancar') + '</i></a>';
  }

  CC.secaoMapas = function () {
    const prontos = LIVROS.filter(([nome]) => porSlug.has(CC.slugDoLivro(nome))).length;
    const grupos = GRUPOS.map((grupo, g) => '<p class="etiqueta grupo-mapas">' + CC.esc(grupo) + '</p>'
      + '<div class="grade-mapas">' + LIVROS.filter((l) => l[1] === g).map(celula).join('') + '</div>').join('');
    return '<div class="titulo-secao" id="mapas-dos-livros"><h2>Mapas dos livros</h2><span>' + prontos + ' de ' + LIVROS.length + ' prontos</span></div>'
      + '<p class="passo-dica mapas-dica">Cada livro da Bíblia desmontado num mapa mental: a raiz, os ramos, as conexões e onde Jesus aparece.</p>'
      + grupos;
  };

  // O cartão de entrada, no alto do Explorar: leva ao mapa do livro que o plano lê hoje,
  // quando ele existe; senão, desce até a grade.
  CC.cartaoMapas = function () {
    const dia = D.plano[CC.diaAtual() - 1];
    const deHoje = ((dia && dia.livros) || []).map((l) => CC.mapaDoLivro(l)).find(Boolean);
    const prontos = MAPAS.length;
    if (deHoje) {
      return '<a class="cartao cartao-historia cartao-mapas" href="#/mapa/' + deHoje.slug + '">' + CC.ico('alfinete')
        + '<span><b>Mapa de ' + CC.esc(deHoje.nome) + '</b><span class="passo-dica">O livro que você lê hoje, inteiro numa página.</span></span>'
        + CC.ico('avancar') + '</a>';
    }
    return '<a class="cartao cartao-historia cartao-mapas" href="#/explorar" data-ir-mapas>' + CC.ico('alfinete')
      + '<span><b>Mapas dos livros</b><span class="passo-dica">' + (prontos === 1 ? 'O primeiro dos 66 já está pronto.' : prontos + ' dos 66 já estão prontos.') + '</span></span>'
      + CC.ico('baixo') + '</a>';
  };

  // Voltando de um mapa, o Explorar abre na grade, e não no alto da página.
  let veioDoMapa = false;
  const rolarAteGrade = (raiz) => {
    const alvo = raiz.querySelector('#mapas-dos-livros');
    if (!alvo) return;
    CC.rolarPara(Math.max(0, alvo.getBoundingClientRect().top + CC.rolagemY() - 72));
  };
  CC.ligarMapas = function (raiz) {
    const atalho = raiz.querySelector('[data-ir-mapas]');
    if (atalho) atalho.addEventListener('click', (ev) => { ev.preventDefault(); rolarAteGrade(raiz); });
    if (veioDoMapa) {
      veioDoMapa = false;
      requestAnimationFrame(() => rolarAteGrade(raiz));
    }
  };

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
    + (texto ? '<p class="mapa-ligacao ' + lado + '">' + CC.esc(texto) + '</p>' : '') + '</div>';
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
  // O nome no pincel encolhe até caber na coluna (Deuteronômio, 2 Tessalonicenses).
  function ajustarNome(raiz) {
    const nome = raiz.querySelector('.mapa-nome');
    if (!nome) return;
    let tamanho = parseFloat(getComputedStyle(nome).fontSize);
    for (let i = 0; i < 12 && tamanho > 24 && nome.scrollWidth > nome.clientWidth + 1; i++) {
      tamanho -= 4;
      nome.style.fontSize = tamanho + 'px';
    }
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
      + '<p>' + CC.esc(a.texto) + ' ' + marcas(a.refs) + '</p>'
      + (a.apoio ? '<p>' + CC.esc(a.apoio) + '</p>' : '') + '</div>' + desenho(mapa, a.desenho);

    const r = mapa.raiz || {};
    const raiz = rotulo('raiz', 'A raiz do livro') + '<p class="mapa-raiz-texto">' + CC.esc(r.texto) + '</p>'
      + (r.apoio ? '<p>' + CC.esc(r.apoio) + ' ' + marcas(r.refs) + '</p>' : '<p>' + marcas(r.refs) + '</p>');

    const ramos = (mapa.ramos || []).map((ramo, i) => {
      const lado = i % 2 ? 'lado-dir' : 'lado-esq';
      const galhos = (ramo.galhos || []).map((g) => '<li>' + CC.esc(g.texto) + ' ' + marca(g.ref) + '</li>').join('')
        + (ramo.jesus ? '<li class="mapa-jesus">' + CC.esc(ramo.jesus.texto) + ' ' + marcas(ramo.jesus.refs) + '</li>' : '');
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
      + '<span>' + CC.esc(c.texto) + ' ' + marca(c.ref) + '</span></div>' + desenho(mapa, c.desenho) + '</div>'
      + '<div class="mapa-pares">' + (c.pares || []).map((p) => '<span class="mapa-par-at">' + nb(CC.esc(p.at)) + '</span>'
        + '<span><span class="mapa-par-texto">' + CC.esc(p.texto) + '</span><br><span class="mapa-par-nt">' + nb(CC.esc(porExtenso(p.nt)))
        + (p.nota ? ': ' + CC.esc(p.nota) : '') + '</span></span>').join('') + '</div>';

    // "você está aqui": a primeira parte que o plano ainda não terminou, só depois que a leitura
    // do livro começou; antes disso, só a lista.
    const partes = mapa.estrutura || [];
    const comecou = lidos.size > 0;
    const lida = (p) => { for (let ch = p.de; ch <= p.ate; ch++) if (!lidos.has(ch)) return false; return true; };
    let aqui = -1;
    if (comecou) aqui = partes.findIndex((p) => !lida(p));
    const estrutura = rotulo('linhas', 'Estrutura do livro') + '<ol class="mapa-estrutura">' + partes.map((p, i) => {
      const ref = mapa.sigla + ' ' + (p.de === p.ate ? p.de : p.de + '–' + p.ate);
      const feita = comecou && lida(p);
      return '<li class="' + (feita ? 'lida' : '') + (i === aqui ? ' aqui' : '') + '">' + (feita ? CC.ico('certo') : '')
        + CC.esc(p.titulo) + ' ' + marca(ref) + (i === aqui ? ' <span class="mapa-aqui">você está aqui</span>' : '') + '</li>';
    }).join('') + '</ol>';

    const curiosidades = rotulo('lampada', 'Curiosidades do texto') + '<ul class="mapa-curiosidades">'
      + (mapa.curiosidades || []).map((x) => '<li>' + CC.esc(x.texto) + ' ' + marca(x.ref) + '</li>').join('') + '</ul>';

    const procure = rotulo('lupa', 'Enquanto lê, procure') + '<p class="mapa-procure-texto">' + CC.esc((mapa.procure || {}).texto) + '</p>';

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
      + ler + '</div>';
  }

  function folha(m) {
    return '<div class="folha-mapa"><div class="mapa-barra">'
      + '<button class="botao-redondo" data-voltar aria-label="Voltar ao Explorar">' + CC.ico('voltar') + '<span class="so-leitor">Explorar</span></button>'
      + '<span class="mapa-barra-titulo">Mapa do livro</span>'
      + '<button class="botao-redondo" data-compartilhar-mapa aria-label="Compartilhar este mapa">' + CC.ico('compartilhar') + '</button></div>'
      + '<div class="mapa-cabeca' + (m.nome.length > 11 ? ' longo' : '') + '"><div class="mapa-cabeca-nome"><span class="mapa-grupo">' + CC.esc(m.grupo) + '</span>'
      + '<h1 class="mapa-nome">' + CC.esc(m.nome) + '</h1>'
      + '<span class="mapa-ordem">Livro ' + m.numero + ' de ' + LIVROS.length + '</span></div>'
      + '<div class="mapa-capitulos"><b>' + m.capitulos + '</b><span>' + (m.capitulos === 1 ? 'capítulo' : 'capítulos') + '</span></div></div></div>';
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

  CC.vistaMapa = function (raiz, slug) {
    const m = porSlug.get(String(slug || ''));
    if (!m) {
      const nome = (LIVROS.find(([l]) => CC.slugDoLivro(l) === slug) || [])[0];
      return CC.vazio(raiz, nome ? 'O mapa de ' + nome + ' ainda está sendo feito. Em breve ele aparece aqui.' : 'Não encontrei esse mapa.');
    }
    veioDoMapa = true;
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
    if (!CC.appServido()) { raiz.querySelector('.esqueleto').outerHTML = '<div class="vazio">Aberto como arquivo solto, o aplicativo não tem de onde trazer o mapa.</div>'; return; }
    const geracao = (raiz.dataset.mapaGeracao = String(Date.now()));
    carregar(m).then((mapa) => {
      if (raiz.dataset.mapaGeracao !== geracao || !raiz.querySelector('.folha-mapa')) return;
      pintar(mapa);
    }).catch(() => {
      if (raiz.dataset.mapaGeracao !== geracao || !raiz.querySelector('.folha-mapa')) return;
      const semRede = navigator.onLine === false;
      raiz.querySelector('.esqueleto').outerHTML = CC.estado({
        erro: true, icone: 'info',
        titulo: semRede ? 'Sem internet agora' : 'Não deu para abrir o mapa',
        texto: semRede ? 'Este mapa ainda não está guardado neste celular. Com internet, ele fica guardado para abrir sem rede.' : 'Pode ter sido a conexão. Tente de novo em instantes.',
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
