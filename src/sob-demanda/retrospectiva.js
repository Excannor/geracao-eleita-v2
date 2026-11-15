/* A retrospectiva de dezembro (R3.4, docs/fases/r3-temporadas.md). Peça sob demanda: o index.html
   tem teto de 1 MB. Duas partes, na tela "#/perfil/retrospectiva":
   - "Seu ano na Palavra": contado aqui, no aparelho, só do estado da própria pessoa. Nada vai ao
     servidor e ninguém mais vê;
   - "O ano da célula": os números que o servidor já manda somados (desafios-grupo.mjs,
     anoDaCelula), sem nomes, e só para células com 3 pessoas ou mais.
   Cada parte tem a sua imagem para story, desenhada no aparelho (01d-story.js). */
(function (CC) {
  'use strict';

  const D = CC.D;
  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-retrospectiva]')) {
    const s = document.createElement('style');
    s.dataset.retrospectiva = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  // A época: de 1º de dezembro a 7 de janeiro (em janeiro, o ano que acabou). A mesma regra do
  // servidor (anoDaRetrospectiva). Fora dela, a tela mostra o ano de agora, "até hoje".
  const ATE_JANEIRO = 7;
  function anoDaRetrospectiva(hoje) {
    const ano = Number(hoje.slice(0, 4));
    if (hoje.slice(5, 7) === '12') return ano;
    if (hoje.slice(5, 7) === '01' && Number(hoje.slice(8, 10)) <= ATE_JANEIRO) return ano - 1;
    return 0;
  }

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const numero = (n) => Number(n || 0).toLocaleString('pt-BR');

  // O ano da pessoa, só do estado dela (as mesmas datas da chama e dos dias com a Palavra).
  function meuAno(ano, e) {
    e = e || CC.estado();
    const doAno = (d) => typeof d === 'string' && d.slice(0, 4) === String(ano);
    const marcado = e.marcadoEm || {};
    const lidos = new Set((e.lidos || []).map(Number));
    const diasDoPlano = [...lidos].filter((n) => doAno(marcado[n]));
    const capitulos = diasDoPlano.reduce((s, n) => s + CC.capitulosDoDia(n), 0);
    const datas = new Set([...CC.datasFeitas(e), ...(e.diasComPalavra || [])].filter(doAno));
    // o mês com mais dias com a Palavra
    const porMes = new Array(12).fill(0);
    for (const d of datas) porMes[Number(d.slice(5, 7)) - 1]++;
    const maior = Math.max(...porMes);
    const mes = maior ? porMes.indexOf(maior) : -1;
    // semanas completas: 5 dias com a Palavra, de segunda a domingo, contadas pela segunda-feira
    const semanas = new Map();
    for (const d of datas) { const s = CC.segundaDaSemana(d); semanas.set(s, (semanas.get(s) || 0) + 1); }
    const completas = [...semanas].filter(([s, n]) => doAno(s) && n >= CC.DIAS_DA_SEMANA_COMPLETA).length;
    // o que fechou no ano: todos os dias lidos, e o último deles marcado neste ano
    const fechouNoAno = (dias) => {
      let ultima = '';
      for (const n of dias) { if (!lidos.has(n) || !marcado[n]) return false; if (marcado[n] > ultima) ultima = marcado[n]; }
      return dias.length > 0 && doAno(ultima);
    };
    const diasDoLivro = new Map();
    for (const d of D.plano) for (const l of d.livros) { if (!diasDoLivro.has(l)) diasDoLivro.set(l, []); diasDoLivro.get(l).push(d.numero); }
    // na ordem da Bíblia
    const ordem = (CC.LIVROS || []).map(([l]) => l);
    const livros = [...diasDoLivro].filter(([, dias]) => fechouNoAno(dias)).map(([l]) => l).sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
    const temporadas = (D.temporadas || []).filter((t) => fechouNoAno(Array.from({ length: t.ate - t.de + 1 }, (_, i) => t.de + i)));
    return { ano, diasComAPalavra: datas.size, diasDoPlano: diasDoPlano.length, capitulos, semanas: completas, livros, temporadas, mes, diasNoMes: maior };
  }

  // ---------- as imagens para story ----------
  // As duas no mesmo desenho: o fundo grafite das imagens do app, o título, o ano grande em sálvia e
  // até 4 números, um por linha, dentro da área segura do Instagram.
  function desenharAno(ctx, { titulo, sub, ano, linhas }) {
    const S = CC.story;
    const { L, A, SEGURA } = S;
    ctx.fillStyle = '#1b1c1a';
    ctx.fillRect(0, 0, L, A);
    const brilho = ctx.createRadialGradient(L / 2, SEGURA + 360, 0, L / 2, SEGURA + 360, 700);
    brilho.addColorStop(0, 'rgba(200,218,140,.16)');
    brilho.addColorStop(1, 'rgba(200,218,140,0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(0, 0, L, A);
    let y = SEGURA + 110;
    // o título pode ser longo ("O ano da Célula Videira"): encolhe para caber em 920px
    let t = 64;
    ctx.font = S.Mn(800, t);
    while (ctx.measureText(titulo).width > 920 && t > 36) { t -= 2; ctx.font = S.Mn(800, t); }
    S.escrever(ctx, titulo, L / 2, y, S.Mn(800, t), '#eef0ea');
    if (sub) { y += 64; S.escrever(ctx, sub, L / 2, y, S.Mn(700, 44), '#a4a99d'); }
    y += sub ? 210 : 250;
    S.escrever(ctx, String(ano), L / 2, y, S.Mn(800, 230), '#c9d98f', { espaco: -6 });
    y += 180;
    for (const [valor, rotulo] of linhas.slice(0, 4)) {
      S.escrever(ctx, valor, L / 2, y, S.Mn(800, 120), '#eef0ea', { espaco: -3 });
      y += 66;
      S.escrever(ctx, rotulo, L / 2, y, S.Mn(700, 42), '#a4a99d');
      y += 140;
    }
    S.marca(ctx, A - SEGURA - 80, { cor: '#c9d98f', corFraca: '#a4a99d' });
  }
  async function compartilhar(dados, nomeArquivo, texto) {
    try {
      await CC.story.prepararFontes();
      const c = CC.story.tela();
      desenharAno(c.getContext('2d'), dados);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      if (!blob) throw new Error('sem imagem');
      return CC.compartilharImagem(new File([blob], nomeArquivo, { type: 'image/png' }), texto + ' https://' + CC.story.ENDERECO);
    } catch (e) {
      CC.avisar('Não consegui gerar a imagem agora.');
      return 'falhou';
    }
  }

  // ---------- a tela ----------
  const linha = (valor, rotulo, dado) => '<div class="numero-ano"' + (dado ? ' ' + dado : '') + '><b>' + valor + '</b><span>' + CC.esc(rotulo) + '</span></div>';
  const plural = (n, um, muitos) => (n === 1 ? um : muitos);
  // os números da pessoa, na ordem da tela e da imagem (sem zeros: um "0 livros" não diz nada)
  function linhasMinhas(m) {
    return [
      [numero(m.diasComAPalavra), plural(m.diasComAPalavra, 'dia com a Palavra', 'dias com a Palavra'), 'dias-palavra'],
      [numero(m.diasDoPlano), plural(m.diasDoPlano, 'dia do plano lido', 'dias do plano lidos'), 'dias-plano'],
      [numero(m.capitulos), plural(m.capitulos, 'capítulo', 'capítulos'), 'capitulos'],
      [numero(m.livros.length), plural(m.livros.length, 'livro terminado', 'livros terminados'), 'livros'],
      [numero(m.temporadas.length), plural(m.temporadas.length, 'temporada concluída', 'temporadas concluídas'), 'temporadas'],
      [numero(m.semanas), plural(m.semanas, 'semana completa', 'semanas completas'), 'semanas'],
    ].filter(([v]) => v !== '0');
  }
  function linhasDaCelula(c) {
    return [
      [numero(c.diasLidos), plural(c.diasLidos, 'dia do plano lido, somando todos', 'dias do plano lidos, somando todos'), 'dias-plano'],
      [numero(c.capitulos), plural(c.capitulos, 'capítulo', 'capítulos'), 'capitulos'],
      [numero(c.temporadas), plural(c.temporadas, 'temporada concluída', 'temporadas concluídas'), 'temporadas'],
      [numero(c.encontros), plural(c.encontros, 'encontro registrado', 'encontros registrados'), 'encontros'],
      [c.metas + ' de ' + c.momentos, 'metas do calendário da célula', 'metas'],
    // as metas do calendário só entram quando alguma foi batida: "0 de 5" seria cobrança
    ].filter(([v], i) => v !== '0' && !(i === 4 && !c.metas));
  }

  function tela(raiz) {
    const hoje = CC.hojeIso();
    const naEpoca = anoDaRetrospectiva(hoje);
    const ano = naEpoca || Number(hoje.slice(0, 4));
    const m = meuAno(ano);
    const ate = naEpoca && String(naEpoca) !== hoje.slice(0, 4) ? '' : ', até hoje';
    const minhas = linhasMinhas(m);
    const cels = (CC.minhasCelulas ? CC.minhasCelulas() : []).filter((c) => c.anoDaCelula && c.anoDaCelula.ano === ano);
    const celula = (c) => {
      const a = c.anoDaCelula;
      if (a.poucos) {
        return '<section class="bloco-ano" data-ano-celula="' + CC.esc(c.id) + '"><h2>O ano da célula</h2><p class="nome-celula-ano">' + CC.esc(c.titulo) + '</p>'
          + '<p class="passo-dica">O ano da célula aparece quando ela tem 3 pessoas ou mais, para que ninguém seja reconhecido pelos números.</p></section>';
      }
      const ls = linhasDaCelula(a);
      return '<section class="bloco-ano" data-ano-celula="' + CC.esc(c.id) + '"><h2>O ano da célula</h2><p class="nome-celula-ano">' + CC.esc(c.titulo) + '</p>'
        + '<p class="passo-dica">Os números da célula em ' + ano + ', somados, sem nomes. ' + CC.plural(a.pessoas, 'pessoa conta', 'pessoas contam') + ' hoje.</p>'
        + '<div class="numeros-ano">' + ls.map(([v, r, d]) => linha(v, r, 'data-celula-' + d)).join('') + '</div>'
        + '<button class="botao contorno" data-story-celula="' + CC.esc(c.id) + '">' + CC.ico('compartilhar') + 'Imagem para o story</button></section>';
    };
    raiz.innerHTML = '<div class="folha-perfil titulo-frase">' + CC.botaoVoltar('Perfil') + '<h1>Seu ano na Palavra</h1>'
      + '<p class="passo-dica">' + ano + ate + '. Só você vê esta parte: ela é contada no seu aparelho.</p></div>'
      + '<section class="bloco-ano" data-meu-ano="' + ano + '">'
      + (minhas.length
        ? '<div class="numeros-ano">' + minhas.map(([v, r, d]) => linha(v, r, 'data-meu-' + d)).join('') + '</div>'
          + (m.mes >= 0 ? '<p class="mes-ano" data-mes-ano>O mês com mais dias com a Palavra foi ' + MESES[m.mes] + ', com ' + CC.plural(m.diasNoMes, 'dia', 'dias') + '.</p>' : '')
          + (m.livros.length ? '<p class="lista-ano" data-livros-ano>' + plural(m.livros.length, 'Livro terminado: ', 'Livros terminados: ') + CC.esc(m.livros.join(', ')) + '.</p>' : '')
          + '<button class="botao contorno" data-story-meu>' + CC.ico('compartilhar') + 'Imagem para o story</button>'
        : '<p class="passo-dica" data-ano-vazio>Em ' + ano + ' ainda não há leitura marcada. O plano continua de onde você está.</p>')
      + '</section>'
      + cels.map(celula).join('');
    CC.ligarVoltarDoTopo(raiz);
    const meu = raiz.querySelector('[data-story-meu]');
    if (meu) meu.onclick = () => compartilhar({ titulo: 'Meu ano na Palavra', ano, linhas: minhas }, 'geracao-eleita-meu-ano-' + ano + '.png', 'Meu ano na Palavra, no Geração Eleita.');
    raiz.querySelectorAll('[data-story-celula]').forEach((b) => {
      const c = cels.find((x) => x.id === b.dataset.storyCelula);
      b.onclick = () => compartilhar({ titulo: 'O ano da célula', sub: c.titulo, ano, linhas: linhasDaCelula(c.anoDaCelula) }, 'geracao-eleita-ano-da-celula-' + ano + '.png', 'O ano da nossa célula, no Geração Eleita.');
    });
  }

  CC.retrospectivaTela = tela;
  CC.retrospectiva = { anoDaRetrospectiva, meuAno, linhasMinhas, linhasDaCelula, desenharAno };
})(window.CC);
