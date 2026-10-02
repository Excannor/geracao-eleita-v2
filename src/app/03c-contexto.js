/* Onde estamos: a placa na beira da estrada, antes de ler. O mapa da história com a parada
   de cada passagem do dia acesa, o contexto do dia em poucas frases (quem escreveu, para
   quem, o que ligar), uma coisa só para procurar enquanto lê, e os guias dos trechos de
   lista dentro do leitor (conteudo/primeiros-dias.json). Nada aqui é doutrina nem muda a
   leitura: é para a pessoa saber onde está e o que esperar, principalmente nos primeiros
   dias, quando a genealogia de Mateus 1 derrubava quem nunca tinha lido a Bíblia. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const dados = () => D.primeirosDias || { paradas: [], livros: {}, dias: {}, guias: {} };

  // A parada da história em que cada capítulo está, pela divisão da nota "A história bíblica
  // em uma página" do Explorar. Só o livro e o capítulo bastam, então vale para os 365 dias.
  // Jó não tem data no próprio texto e não acende parada nenhuma.
  const POVO = ['Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute'];
  const REINO = ['1 Samuel', '2 Samuel', '1 Crônicas', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cânticos'];
  const EXILIO = ['2 Reis', 'Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 'Oseias', 'Joel', 'Amós',
    'Obadias', 'Jonas', 'Miqueias', 'Naum', 'Habacuque', 'Sofonias'];
  const ESPERA = ['Esdras', 'Neemias', 'Ester', 'Ageu', 'Zacarias', 'Malaquias'];
  const JESUS = ['Mateus', 'Marcos', 'Lucas', 'João'];
  CC.paradaDe = (livro, cap) => {
    if (livro === 'Gênesis') return cap <= 2 ? 'criacao' : cap <= 11 ? 'queda' : 'promessa';
    if (POVO.includes(livro)) return 'povo';
    if (livro === '1 Reis') return cap <= 11 ? 'reino' : 'exilio';
    if (livro === '2 Crônicas') return cap <= 9 ? 'reino' : 'exilio';
    if (REINO.includes(livro)) return 'reino';
    if (EXILIO.includes(livro)) return 'exilio';
    if (ESPERA.includes(livro)) return 'espera';
    if (JESUS.includes(livro)) return 'jesus';
    if (livro === 'Apocalipse') return 'fim';
    if (livro === 'Jó') return '';
    return 'igreja';
  };

  CC.paradasDoDia = (numero) => {
    const dia = D.plano[numero - 1] || { trechos: [] };
    const acesas = new Set();
    for (const t of dia.trechos || []) {
      for (let c = t.de; c <= t.ate; c++) { const p = CC.paradaDe(t.livro, c); if (p) acesas.add(p); }
    }
    return acesas;
  };

  CC.contextoDoDia = (numero) => dados().dias[String(numero)] || null;

  // O primeiro dia de cada livro no plano ganha a apresentação do livro, quando ela existe.
  const PRIMEIRO_DIA = new Map();
  for (const d of D.plano) for (const l of d.livros || []) if (!PRIMEIRO_DIA.has(l)) PRIMEIRO_DIA.set(l, d.numero);
  CC.livroQueComeca = (numero) => ((D.plano[numero - 1] || {}).livros || [])
    .find((l) => PRIMEIRO_DIA.get(l) === numero && dados().livros[l]) || '';

  // O cartão da lição, antes das passagens: o mapa (as paradas acesas), o texto do dia (ou a
  // apresentação do livro que começa hoje) e o "procure".
  CC.cartaoOndeEstamos = function (numero) {
    const paradas = dados().paradas || [];
    if (!paradas.length) return '';
    const acesas = CC.paradasDoDia(numero);
    const ctx = CC.contextoDoDia(numero);
    const livro = ctx ? '' : CC.livroQueComeca(numero);
    const texto = ctx ? ctx.contexto : (livro ? dados().livros[livro] : '');
    const nomes = paradas.filter((p) => acesas.has(p.id)).map((p) => p.nome);
    const lista = nomes.length > 1 ? nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1] : (nomes[0] || '');
    return '<section class="onde-estamos" aria-label="' + CC.esc('Onde estamos na história' + (lista ? ': ' + lista : '')) + '">'
      + '<span class="etiqueta">Onde estamos na história</span>'
      + '<ol class="mapa-historia" aria-hidden="true">'
      + paradas.map((p) => '<li' + (acesas.has(p.id) ? ' class="acesa"' : '') + '>' + CC.esc(p.nome) + '</li>').join('')
      + '</ol>'
      + (texto ? '<p class="contexto-dia">' + CC.esc(texto) + '</p>' : '')
      + (ctx && ctx.procure ? '<p class="procure">' + CC.ico('lupa') + '<span><b>Enquanto lê, procure:</b> ' + CC.esc(ctx.procure) + '</span></p>' : '')
      + '</section>';
  };

  // ---------- os guias dos trechos de lista, no leitor ----------
  CC.guiaDoCapitulo = (livro, cap) => dados().guias[livro + ' ' + cap] || null;

  // Entra logo abaixo do título do capítulo (04b-leitor.js textoDe): o que é aquele trecho,
  // como ler, o que não perder, e o salto para o versículo em que a história recomeça.
  CC.htmlDoGuia = function (livro, cap) {
    const g = CC.guiaDoCapitulo(livro, cap);
    if (!g) return '';
    const salto = g.salto ? String(g.salto).split(':') : null;
    const rotuloSalto = salto ? (Number(salto[0]) === Number(cap) ? 'Ir ao versículo ' + salto[1] : 'Ir ao capítulo ' + salto[0]) : '';
    return '<aside class="leitor-guia" role="note">'
      + '<span class="etiqueta">' + CC.ico('bussola') + 'Guia de leitura' + (g.inteiro ? '' : ' · v. ' + g.de + ' a ' + g.ate) + '</span>'
      + '<p>' + CC.esc(g.texto) + '</p>'
      + (salto ? '<button type="button" class="botao contorno pequeno" data-saltar="' + CC.esc(g.salto) + '">' + CC.esc(rotuloSalto) + CC.ico('baixo') + '</button>' : '')
      + '</aside>';
  };

  // O salto rola até o versículo dentro do próprio leitor (ou da Bíblia), sem trocar de tela.
  // (o teste roda este arquivo sem DOM de verdade: só liga o clique quando existe)
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', (ev) => {
      const b = ev.target.closest && ev.target.closest('[data-saltar]');
      if (!b) return;
      const raiz = b.closest('.leitor-texto') || document;
      const alvo = raiz.querySelector('.leitor-verso[data-v="' + b.dataset.saltar + '"]');
      if (alvo) alvo.scrollIntoView({ block: 'start', behavior: CC.semMovimento && CC.semMovimento() ? 'auto' : 'smooth' });
    });
  }
})(window.CC);
