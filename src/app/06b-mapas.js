/* Mapa do livro: a grade dos 66 no Explorar e a casca da tela de cada mapa (#/mapa/<slug>).
   O conteúdo de cada livro mora em conteudo/mapas/<slug>.json e chega pelo arquivo
   mapa-<slug>.<resumo>.json que o build publica (window.MAPAS lista os prontos, com os
   desenhos já embutidos); o service worker o guarda na primeira abertura, como as bíblias.
   A Bíblia do app (#/biblia) não muda: o mapa só aponta para ela no botão do fim. A ficha do
   livro (Explorar > Livros) e o mapa apontam um para o outro.
   O index.html tem teto de 1 MB, então aqui fica o cartão, os grupos da grade, o link da ficha e a
   casca da tela (a barra, a cabeça com o nome e o esqueleto). O desenho do mapa (as setas, os
   blocos, o estilo deles) vem em mapa-tela.<resumo>.js (src/sob-demanda/mapa-tela.js), pedido
   na primeira vez que um mapa abre e guardado pelo service worker para abrir sem rede. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const MAPAS = window.MAPAS || [];

  // Os grupos da grade; a tabela dos 66 (nome, grupo e sigla) mora em 01-nucleo.js (CC.LIVROS).
  // A mesma tabela vive em ferramentas/checar-mapa.mjs; o teste.mjs confere que as duas batem.
  const GRUPOS = ['Lei', 'Históricos', 'Poéticos', 'Profetas maiores', 'Profetas menores',
    'Evangelhos e Atos', 'Cartas de Paulo', 'Outras cartas', 'Apocalipse'];
  const LIVROS = CC.LIVROS;
  CC.LIVROS_MAPA = LIVROS;
  CC.GRUPOS_MAPA = GRUPOS;
  // "1 Samuel" vira "1-samuel"; "Cânticos", "canticos": sem acento, minúsculo, com hífen.
  CC.slugDoLivro = (nome) => CC.semAcento(nome).replace(/\s+/g, '-');
  const porSlug = new Map(MAPAS.map((m) => [m.slug, m]));
  CC.mapaDoLivro = (nome) => porSlug.get(CC.slugDoLivro(nome)) || null;

  // espaço inseparável entre sigla e capítulo e um juntor depois do traço, só na tela
  const nb = (t) => String(t).replace(/(\S) (?=\d)/g, '$1 ').replace(/(\d)([-–])(?=\d)/g, '$1$2⁠');
  const livroLido = (nome) => { const p = CC.progressoDoLivro ? CC.progressoDoLivro(nome) : { total: 0 }; return p.total > 0 && p.lidos === p.total; };

  // ---------- o cartão "Mapas dos livros" no Explorar ----------
  // Um cartão só, logo depois de "Pra ir além na leitura de hoje": fechado, mostra o título no
  // pincel, o desenho do rolo com a pena, o progresso e o atalho para o mapa do livro de hoje;
  // aberto, a grade de um testamento (os prontos primeiro, os "em breve" depois). Abre e fecha
  // no lugar: nada de pular até o fim da página, como fazia o cartão antigo (pedido do dono).
  // O desenho vem de conteudo/mapas/desenhos/pena-e-rolo.svg: o build troca a marca abaixo pelo
  // SVG (sem o <style>), e as cores dos traços vêm do 27-mapas.css, que segue o tema.
  const DESENHO_CARTAO = '@@DESENHO:pena-e-rolo@@';
  const AT = 39; // os 39 primeiros livros da tabela são do Antigo Testamento
  const testamentoDe = (nome) => (LIVROS.findIndex(([l]) => l === nome) < AT ? 'at' : 'nt');
  // Duas colunas, nomes no pincel: 20, 17, 15 ou 14px conforme o tamanho do nome, para
  // "1 Tessalonicenses" nunca quebrar no meio da palavra nem sair da célula a 360px (dentro do
  // cartão a célula é mais estreita que na grade antiga, e 15px já encostava na borda).
  // Doze letras pedem 15px: "Deuteronômio" a 17px passou da célula pronta (que tem a seta à
  // direita) a 360px quando o mapa foi ao ar, e a 14px ficava miúdo ao lado dos vizinhos.
  const tamanhoDoNome = (nome) => (nome.length <= 8 ? 20 : nome.length <= 10 ? 17 : nome.length <= 12 ? 15 : 14);

  function celula([nome]) {
    const m = porSlug.get(CC.slugDoLivro(nome));
    const lido = livroLido(nome);
    const nomeHtml = '<span class="nome-mapa" style="font-size:' + tamanhoDoNome(nome) + 'px">' + nb(CC.esc(nome)) + '</span>';
    if (!m) return '<span class="celula-mapa breve">' + nomeHtml + '<span class="so-leitor">, mapa em breve</span></span>';
    return '<a class="celula-mapa pronto' + (lido ? ' lido' : '') + (nome.length > 15 ? ' nome-longo' : '') + '" href="#/mapa/' + m.slug + '">' + nomeHtml
      + (lido ? '<span class="so-leitor">, lido inteiro no plano</span>' : '')
      + '<i class="marca-mapa" aria-hidden="true">' + CC.ico(lido ? 'certo' : 'avancar') + '</i></a>';
  }

  function gradeDoTestamento(t) {
    const livros = LIVROS.filter(([nome]) => testamentoDe(nome) === t);
    const prontos = livros.filter(([nome]) => porSlug.has(CC.slugDoLivro(nome)));
    const breve = livros.filter(([nome]) => !porSlug.has(CC.slugDoLivro(nome)));
    return (prontos.length
      ? (breve.length ? '<p class="grupo-mapas">Prontos</p>' : '') + '<div class="grade-mapas">' + prontos.map(celula).join('') + '</div>'
      : '<p class="passo-dica mapas-nenhum">Nenhum mapa deste testamento ainda.</p>')
      + (breve.length ? '<p class="grupo-mapas">Em breve</p><div class="grade-mapas">' + breve.map(celula).join('') + '</div>' : '');
  }

  // Aberto ou fechado, e em que testamento, o cartão continua como a pessoa deixou enquanto ela
  // anda pelo app (como o "Comece por aqui").
  let mapasAberto = false;
  let testamento = null;
  // o mapa do livro que o plano lê hoje, quando existe
  const mapaDeHoje = () => {
    const dia = D.plano[CC.diaAtual() - 1];
    return ((dia && dia.livros) || []).map((l) => CC.mapaDoLivro(l)).find(Boolean) || null;
  };

  CC.cartaoMapas = function () {
    const dia = D.plano[CC.diaAtual() - 1];
    const deHoje = mapaDeHoje();
    if (!testamento) testamento = testamentoDe(deHoje ? deHoje.nome : (((dia && dia.livros) || [])[0] || 'Gênesis'));
    const prontos = LIVROS.filter(([nome]) => porSlug.has(CC.slugDoLivro(nome))).length;
    const botaoT = (t, rotulo) => '<button type="button" class="segmento-mapas" data-testamento="' + t + '" aria-pressed="' + (t === testamento) + '">' + rotulo + '</button>';
    return '<section class="cartao-mapas" aria-labelledby="titulo-mapas">'
      + '<button type="button" class="mapas-cabeca" data-abrir-mapas aria-expanded="' + mapasAberto + '" aria-controls="corpo-mapas">'
      + '<span class="mapas-desenho desenho" aria-hidden="true">' + DESENHO_CARTAO + '</span>'
      + '<span class="mapas-textos"><span class="mapas-titulo" id="titulo-mapas">Mapas dos livros</span>'
      // Enquanto faltava livro, a linha contava "N de 66 prontos" com a barra; com os 66 prontos
      // a contagem não diz mais nada, e fica só o que o cartão traz.
      + '<span class="mapas-linha"><span class="mapas-progresso">' + (prontos < LIVROS.length ? prontos + ' de ' + LIVROS.length + ' prontos' : 'Os ' + LIVROS.length + ' livros da Bíblia') + '</span>'
      + (prontos < LIVROS.length ? '<span class="barra-mapas" aria-hidden="true"><i style="width:' + Math.max(2, Math.round((prontos / LIVROS.length) * 100)) + '%"></i></span>' : '') + '</span></span>'
      + '<span class="mapas-seta" aria-hidden="true">' + CC.ico('baixo') + '</span></button>'
      + (deHoje ? '<a class="mapas-hoje" href="#/mapa/' + deHoje.slug + '"><span>Mapa de hoje: <b>' + CC.esc(deHoje.nome) + '</b></span>' + CC.ico('avancar') + '</a>' : '')
      + '<div class="mapas-corpo" id="corpo-mapas"' + (mapasAberto ? '' : ' hidden') + '>'
      + '<p class="passo-dica mapas-dica">Cada livro da Bíblia desmontado num mapa: a raiz, os ramos, as conexões e onde Jesus aparece.</p>'
      + '<div class="segmentos-mapas" role="group" aria-label="Testamento">' + botaoT('at', 'Antigo Testamento') + botaoT('nt', 'Novo Testamento') + '</div>'
      + '<div class="grades-mapas" data-grade-mapas>' + gradeDoTestamento(testamento) + '</div>'
      + '<button type="button" class="botao contorno mapas-fechar" data-fechar-mapas>Fechar</button>'
      + '</div></section>';
  };

  // Abrir e fechar sem rolar: o que está na tela fica parado (a cabeça do cartão, ao abrir e
  // fechar por ela; o fim do cartão, ao fechar pelo "Fechar" lá embaixo, para o resto do
  // Explorar não pular). Quem rola a página é só a pessoa.
  const manterNoLugar = (el, mudar) => {
    const antes = el.getBoundingClientRect().bottom;
    mudar();
    const depois = el.getBoundingClientRect().bottom;
    if (Math.abs(depois - antes) > 1) CC.rolarPara(Math.max(0, CC.rolagemY() + depois - antes));
  };

  // Voltando de um mapa aberto pelo cartão, o Explorar reabre no mesmo ponto, com o cartão como
  // estava (e não no alto da página, nem no fim).
  let veioDoMapa = false;
  let rolagemDoExplorar = null;
  CC.ligarMapas = function (raiz) {
    const cartao = raiz.querySelector('.cartao-mapas');
    if (!cartao) return;
    const cabeca = cartao.querySelector('[data-abrir-mapas]');
    const corpo = cartao.querySelector('.mapas-corpo');
    const definir = (aberto) => { mapasAberto = aberto; corpo.hidden = !aberto; cabeca.setAttribute('aria-expanded', String(aberto)); };
    cabeca.addEventListener('click', () => manterNoLugar(cabeca, () => definir(!mapasAberto)));
    cartao.querySelector('[data-fechar-mapas]').addEventListener('click', () => {
      manterNoLugar(cartao, () => definir(false));
      cabeca.focus({ preventScroll: true });
    });
    cartao.querySelectorAll('[data-testamento]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.testamento === testamento) return;
      testamento = b.dataset.testamento;
      cartao.querySelectorAll('[data-testamento]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      cartao.querySelector('[data-grade-mapas]').innerHTML = gradeDoTestamento(testamento);
      CC.inseparavel(cartao);
    }));
    cartao.addEventListener('click', (ev) => { if (ev.target.closest('a[href^="#/mapa/"]')) rolagemDoExplorar = CC.rolagemY(); });
    if (veioDoMapa && rolagemDoExplorar !== null) {
      const y = rolagemDoExplorar;
      requestAnimationFrame(() => CC.rolarPara(y));
    }
    veioDoMapa = false;
    rolagemDoExplorar = null;
  };

  // Na ficha do livro (Explorar > Livros), o caminho para o mapa, quando ele existe: um link só,
  // logo abaixo do nome. O mapa devolve o caminho para a ficha no fim da página.
  CC.linkDoMapa = function (nomeDoLivro) {
    const m = CC.mapaDoLivro(nomeDoLivro);
    if (!m) return '';
    return '<a class="link-mapa" href="#/mapa/' + m.slug + '"><span class="link-mapa-icone" aria-hidden="true">' + CC.ico('alfinete') + '</span>'
      + '<span><b>Ver o mapa</b><small>' + CC.esc(m.nome) + ' inteiro numa página</small></span>' + CC.ico('avancar') + '</a>';
  };
  // ---------- a casca da tela do mapa ----------
  // A barra e a cabeça (o nome no pincel e os capítulos) saem daqui, na hora: é o que aparece
  // enquanto o desenho do mapa chega.
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

  // O desenho do mapa vem de mapa-tela.<resumo>.js (CC.mapas.tela): na primeira vez, a barra, a
  // cabeça e o esqueleto até ele chegar; sem rede e sem cópia guardada, o recado com o "Tentar
  // de novo", como nas parábolas.
  CC.vistaMapa = function (raiz, slug) {
    const m = porSlug.get(String(slug || ''));
    if (!m) {
      const nome = (LIVROS.find(([l]) => CC.slugDoLivro(l) === slug) || [])[0];
      return CC.vazio(raiz, nome ? 'O mapa de ' + nome + ' ainda está sendo feito. Em breve ele aparece aqui.' : 'Não encontrei esse mapa.');
    }
    veioDoMapa = true;
    if (CC.mapas.tela) { CC.mapas.tela(raiz, m); return; }
    raiz.innerHTML = folha(m) + CC.esqueleto('texto');
    CC.ligarVoltarDoTopo(raiz);
    ajustarNome(raiz);
    if (!CC.appServido()) { raiz.querySelector('.esqueleto').outerHTML = '<div class="vazio">Não consegui abrir o mapa agora.</div>'; return; }
    const geracao = (raiz.dataset.mapaGeracao = String(Date.now()));
    const ainda = () => raiz.dataset.mapaGeracao === geracao && raiz.querySelector('.folha-mapa .mapa-nome') && raiz.querySelector('.esqueleto');
    CC.pedirPeca(window.MAPA_TELA, () => !!CC.mapas.tela).then(() => { if (ainda()) CC.mapas.tela(raiz, m); }, () => {
      if (!ainda()) return;
      raiz.querySelector('.esqueleto').outerHTML = CC.estadoSemPeca('Não consegui abrir o mapa');
      const b = raiz.querySelector('[data-acao-estado]');
      if (b) b.onclick = () => CC.redesenhar();
    });
  };

  // o que a tela do mapa (src/sob-demanda/mapa-tela.js) usa daqui
  CC.mapas = { LIVROS, nb, folha, ajustarNome };
})(window.CC);
