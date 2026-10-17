/* O estudo da célula pronto (À Mesa): a aba Estudo, o modo encontro passo a passo e a folha
   "Mandar no grupo". Pedida na primeira vez que alguém abre o estudo: o build junta este arquivo
   com estudo-regras.js na peça estudo-celula.<resumo>.js, com o estilo (estudo-celula.css) no
   lugar da marca abaixo, e o service worker a guarda no cache "caminho-telas". A casca (o vazio,
   o selo "Encontro hoje", a rota do preparo) mora em 08b-propositos.js, no index.html.
   O texto de cada cartão vem da Bíblia do app, na tradução do estudo, na hora de desenhar. */
(function (CC) {
  'use strict';

  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-estudo-celula]')) {
    const s = document.createElement('style');
    s.dataset.estudoCelula = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  const R = CC.estudoRegras;
  const esc = CC.esc;
  const PONTO = ' · ';
  const ddmm = (iso) => String(iso).slice(8, 10) + '/' + String(iso).slice(5, 7);
  const siglaDe = (e) => (e && e.traducao) || 'nbv';
  // Só o estudo da semana precisa da semana: a do dia congelado ao salvar, ou a do líder hoje.
  const semanaDe = (p) => (p.estudo && p.estudo.tipo === 'semana' && CC.D && CC.D.plano ? R.semana(p.estudo.planoAte || p.semanaAte) : null);
  const membroEu = (p) => p.membros.find((m) => m.usuario === (CC.quem || {}).usuario) || {};

  // O texto de cada cartão, na tradução do estudo (sem rede ou fora do servidor: sem texto). Fica
  // guardado como veio da Bíblia: o "Copiar" da barra não lê a tela, onde CC.inseparavel já trocou
  // espaços ("Efésios 6") por espaços que não quebram.
  const lidos = new Map();
  async function textosDe(refs, sigla) {
    const unicas = [...new Set(refs)];
    const textos = await Promise.all(unicas.map((r) => (CC.textoDoVersiculo ? CC.textoDoVersiculo(r, sigla).catch(() => null) : null)));
    unicas.forEach((r, i) => { if (textos[i]) lidos.set(sigla + ' ' + r, textos[i]); });
    return new Map(unicas.map((r, i) => [r, textos[i] || '']));
  }

  // Quantos versículos tem cada capítulo, na tradução do estudo: o trecho de um capítulo curto
  // (Salmos 117) mostra o que ele tem, e não "1-10". Sem a Bíblia (sem rede), fica null.
  async function contagemDe(e) {
    const b = e && e.tipo === 'trecho' && CC.carregarBiblia ? CC.traducao(siglaDe(e)) : null;
    const biblia = b ? await CC.carregarBiblia(b).catch(() => null) : null;
    return biblia ? (livro, cap) => ((biblia.livros[livro] || [])[cap - 1] || []).length : null;
  }

  // O cartão de sempre, sem a barra de ações à mostra: os três pontos abrem a barra logo abaixo
  // daquele cartão (marcar, nota, Juntos, copiar e story), um cartão aberto por vez.
  function cartaoComMais(ref, texto, sigla) {
    return CC.cartaoVersiculo(ref, texto, { semAcoes: true, sigla })
      .replace('<figure class="cartao-versiculo', '<figure class="cartao-versiculo com-mais')
      .replace(/<figcaption>([\s\S]*?)<\/figcaption>/, (_, dentro) => '<figcaption><span>' + dentro + '</span>'
        + '<button type="button" class="mesa-mais" aria-label="Ações de ' + esc(ref) + '" aria-expanded="false">' + CC.ico('mais') + '</button></figcaption>');
  }
  function ligarMais(raiz) {
    raiz.querySelectorAll('.mesa-mais').forEach((botao) => {
      botao.onclick = () => {
        const figura = botao.closest('.cartao-versiculo');
        const estava = botao.getAttribute('aria-expanded') === 'true';
        raiz.querySelectorAll('.mesa-mais[aria-expanded="true"]').forEach((b) => {
          b.setAttribute('aria-expanded', 'false');
          const barra = b.closest('.cartao-versiculo').querySelector('.acoes-verso.no-cartao');
          if (barra) barra.remove();
        });
        if (estava || !figura) return;
        const ref = figura.dataset.ref;
        const sigla = figura.dataset.sigla;
        figura.insertAdjacentHTML('beforeend', CC.versiculos.acoesDoCartao(ref, { sigla }));
        const citacao = figura.querySelector('blockquote');
        const texto = lidos.get(sigla + ' ' + ref) || (citacao ? citacao.textContent.replace(/\u2060/g, '') : '');
        CC.versiculos.ligarCartao(figura, ref, texto, { sigla });
        botao.setAttribute('aria-expanded', 'true');
      };
    });
  }

  // "Abrir Efésios 6 na Bíblia": o capítulo de um cartão, inteiro, na Bíblia do app.
  const abrirNaBiblia = (ref, classe) => {
    const cap = R.capituloDe(ref);
    return cap ? '<a class="botao contorno pequeno' + (classe ? ' ' + classe : '') + '" href="#/biblia/' + encodeURIComponent(cap.livro) + '/' + cap.cap + '" data-abrir-biblia>' + CC.ico('livro')
      + 'Abrir ' + esc(cap.livro + ' ' + cap.cap) + ' na Bíblia</a>' : '';
  };
  // O cartão de uma parte do estudo; o cortado (capítulo inteiro, trecho longo) leva logo abaixo
  // o caminho para o capítulo inteiro.
  const cartaoDaParte = (c, textos, sigla, versiculos) => cartaoComMais(c.ref, textos.get(c.ref) || '', sigla)
    + (R.cortaTrecho(c, versiculos) ? '<p class="mesa-abrir-cartao">' + abrirNaBiblia(c.escrito || c.ref) + '</p>' : '');

  const secaoW = (titulo, corpo) => '<div class="secao-w"><span class="etiqueta">' + esc(titulo) + '</span>' + corpo + '</div>';
  const quatroWs = (p) => ({
    acolhida: p.estudoAcolhida || R.sugestaoAcolhida(CC.hojeIso()),
    adoracao: p.estudoAdoracao || R.SUGESTAO_ADORACAO,
    testemunho: p.estudoTestemunho || R.SUGESTAO_TESTEMUNHO,
  });
  // Quem preparou: "você", o nome de quem preparou (o @ se a conta não existe mais) ou nada (o
  // estudo de antes da v19, que não guardou o autor).
  const quemPreparou = (e) => (!e.criadoPor ? '' : e.criadoPor === (CC.quem || {}).usuario ? 'você' : e.criadoPorNome || '@' + e.criadoPor);

  // "No plano": a leitura do dia de cada capítulo do estudo. "Você leu em" só aparece no
  // aparelho de quem leu, e nada disso vai para a célula.
  function noPlanoHtml(refs) {
    const linhas = R.noPlano(refs, CC.D && CC.D.plano);
    if (!linhas.length) return '';
    return '<div class="mesa-plano"><span class="etiqueta">No plano</span>' + linhas.map((d) => {
      const lido = CC.lidoEm ? CC.lidoEm(d.numero) : '';
      return '<a class="mesa-dia" href="#/dia/' + d.numero + '">' + CC.ico('trilha') + '<span><b>' + esc(d.capitulo + ' é o dia ' + d.numero) + '</b>'
        + '<small>' + esc(d.passagem) + '</small>'
        + (lido ? '<small class="leu">' + CC.ico('certo') + 'Você leu em ' + ddmm(lido) + ' · só você vê</small>' : '') + '</span>' + CC.ico('direita') + '</a>';
    }).join('') + '</div>';
  }

  // O roteiro de semana e trecho, como já era: Leiam juntos, a leitura da semana, as perguntas
  // (as escolhidas ou as de sempre) e a oração.
  function roteiro(p, e, sem, textos, sigla, versiculos) {
    const cartao = R.comoBlocos(e, sem, versiculos).find((b) => b.t === 'versiculo');
    const abrir = cartao ? abrirNaBiblia(cartao.ref) : '';
    const leiam = cartao ? '<li><b>Leiam juntos</b>' + cartaoComMais(cartao.ref, textos.get(cartao.ref) || '', sigla) + abrir + '</li>' : '';
    const perguntas = R.perguntasDe(e, sem);
    return '<ol class="roteiro">'
      + (e.tipo === 'semana' ? '<li><b>Para começar</b><p>' + esc(R.COMECAR_SEMANA) + '</p></li>' : '')
      + leiam
      + (e.tipo === 'semana' ? '<li><b>A leitura da semana</b><ul class="roteiro-dias">' + sem.dias.map((d) => '<li><span>Dia ' + d.n + '</span>' + esc(CC.passagemDe(d.dia))
        + (d.r.titulo ? '<small>' + esc(d.r.titulo) + '</small>' : '') + '</li>').join('') + '</ul></li>' : '')
      + (perguntas.length ? '<li><b>Para conversar</b><ul class="roteiro-perguntas">' + perguntas.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ul></li>' : '')
      + (e.tipo === 'semana' && sem.oracao.length ? '<li><b>Para orar juntos</b><ul class="roteiro-oracao">' + sem.oracao.map((o) => '<li>' + esc(o) + '</li>').join('') + '</ul></li>' : '')
      + (e.tipo === 'trecho' ? '<li><b>Para orar juntos</b><p>' + esc(R.ORAR_TRECHO) + '</p></li>' : '')
      + '</ol>';
  }

  // ---------- a aba Estudo ----------
  async function aba(painel, p, apoio, aindaAqui) {
    const e = p.estudo;
    const sem = semanaDe(p);
    const sigla = siglaDe(e);
    const versiculos = await contagemDe(e);
    const blocos = R.comoBlocos(e, sem, versiculos);
    const refs = blocos.filter((b) => b.t === 'versiculo').map((b) => b.ref);
    const textos = await textosDe(refs, sigla);
    if (aindaAqui && !aindaAqui()) return;
    const data = apoio.dataDoEncontro(p);
    const quem = quemPreparou(e);
    const linha = data ? 'Para o encontro de ' + data + (quem ? PONTO + 'preparado por ' + quem : '') : quem ? 'Preparado por ' + quem : '';
    const ws = quatroWs(p);
    const legado = e.tipo === 'semana' || e.tipo === 'trecho';
    const nome = R.titulo(e);
    const palavra = legado
      ? (e.texto ? '<div class="recado-lider"><span class="etiqueta">Palavra de ' + esc(quem && quem !== 'você' ? quem : apoio.nomeDoLider(p)) + '</span>'
        + e.texto.split(/\n+/).filter(Boolean).map((l) => '<p>' + esc(l) + '</p>').join('') + '</div>' : '') + roteiro(p, e, sem, textos, sigla, versiculos)
      : '<div class="mesa-estudo">' + (nome ? '<h2 class="mesa-t1">' + esc(nome) + '</h2>' : '')
        + blocos.map((b) => R.blocoEmHtml(b, { cartao: (c) => cartaoDaParte(c, textos, sigla, versiculos) })).join('') + '</div>';
    const perguntas = legado ? [] : R.perguntasDe(e, sem);
    painel.innerHTML = (linha ? '<p class="passo-dica">' + esc(linha) + '</p>' : '')
      // O estudo que já foi usado num encontro fica guardado: o caminho é preparar o próximo (o
      // servidor faz o mesmo, estudos.mjs, estudoUsado)
      + (p.euPreparoEstudo ? '<div class="mesa-lider">' + CC.ico('caneta') + '<span><b>' + (e.criadoPor === (CC.quem || {}).usuario ? 'Você preparou este estudo' : 'O estudo desta célula') + '</b>'
        + '<small>' + (e.usado ? 'Ele já foi usado num encontro e fica guardado na célula.' : 'Só o líder pode mudar o estudo.') + '</small></span>'
        + '<button type="button" class="botao pequeno contorno" data-mudar>' + (e.usado ? 'Preparar o próximo' : 'Mudar o estudo') + '</button></div>' : '')
      + (e.tipo === 'blocos' || e.tipo === 'trecho' ? noPlanoHtml(refs) : '')
      + secaoW('Acolhida', '<p>' + esc(ws.acolhida) + '</p>')
      + secaoW('Adoração', '<p>' + esc(ws.adoracao) + '</p>')
      + secaoW('Palavra', palavra)
      + (perguntas.length ? secaoW('Para conversar', '<ol class="roteiro-perguntas mesa-perguntas">' + perguntas.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ol>') : '')
      + secaoW('Testemunho', '<p>' + esc(ws.testemunho) + '</p>')
      + '<div class="acoes"><button class="botao" data-compartilhar>' + CC.ico('compartilhar') + 'Mandar no grupo</button>'
      + '<button class="botao contorno" data-modo-encontro>' + CC.ico('livro') + 'Modo encontro</button></div>';
    ligarMais(painel);
    if (CC.inseparavel) CC.inseparavel(painel);
    painel.querySelector('[data-compartilhar]').onclick = () => mandarNoGrupo(p, apoio);
    painel.querySelector('[data-modo-encontro]').onclick = () => modoEncontro(p, apoio);
    const mudar = painel.querySelector('[data-mudar]');
    if (mudar) mudar.onclick = () => { location.hash = apoio.endereco(p.id, 'preparar'); };
  }

  // ---------- Mandar no grupo: o estudo inteiro, formatado para o WhatsApp ----------
  async function mandarNoGrupo(p, apoio) {
    const e = p.estudo;
    if (!e) return;
    const sem = semanaDe(p);
    const sigla = siglaDe(e);
    const versiculos = await contagemDe(e);
    const principal = R.comoBlocos(e, sem, versiculos).find((b) => b.t === 'versiculo');
    const texto = principal && CC.textoDoVersiculo ? await CC.textoDoVersiculo(principal.ref, sigla).catch(() => null) : null;
    const t = CC.traducao(sigla);
    const endereco = location.protocol.startsWith('http') ? location.origin : '';
    const zap = R.textoParaGrupo(e, { data: apoio.dataDoEncontro(p), principal: { texto: texto || '', abreviatura: t ? t.abreviatura : '' }, endereco, semana: sem, versiculos });
    let previa = esc(zap).replace(/\*([^*\n]+)\*/g, '<span class="ast">*</span><b>$1</b><span class="ast">*</span>');
    if (endereco) previa = previa.split(esc(endereco)).join('<span class="link">' + esc(endereco) + '</span>');
    CC.folha('<h2>Mandar no grupo</h2>'
      + '<p class="passo-dica">Assim o estudo chega no WhatsApp. O texto se entende sozinho, mesmo para quem não tem o app.</p>'
      + '<div class="mesa-zap-moldura"><span>Prévia</span><div class="mesa-zap">' + previa + '</div></div>'
      + '<p class="passo-dica pequena">No WhatsApp, o que fica entre asteriscos aparece em negrito.</p>'
      + '<div class="acoes"><button class="botao" data-mandar>' + CC.ico('compartilhar') + 'Mandar</button>'
      + '<button class="botao contorno" data-copiar>Copiar o texto</button>'
      + '<button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Mandar no grupo',
      rolavel: true,
      classe: 'folha-zap',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-mandar]').onclick = async () => {
          const r = await CC.compartilhar(zap, '');
          if (r === 'copiado') CC.avisar('Estudo copiado. É só colar no grupo.');
          else if (r === 'falhou') CC.avisar('Não consegui compartilhar agora.');
        };
        folha.querySelector('[data-copiar]').onclick = async () => {
          CC.avisar((await CC.copiar(zap)) ? 'Estudo copiado. É só colar no grupo.' : 'Não consegui copiar agora.');
        };
      },
    });
  }

  // ---------- o modo encontro, passo a passo ----------
  // Reabrir o mesmo estudo na mesma sessão volta ao passo em que estava (só na memória).
  const passoGuardado = new Map();
  const ICO_CERTO = () => CC.ico('certo');

  function topoDoPasso(s) {
    const etiqueta = '<span class="etiqueta">' + esc(s.etiqueta) + '</span>';
    if (s.tipo === 'palavra') {
      return etiqueta + (s.titulo ? '<h1 class="mesa-titulo-cena">' + R.negrito(s.titulo) + '</h1>' : '')
        + (s.abrir ? abrirNaBiblia(s.abrir.livro + ' ' + s.abrir.cap, 'mesa-abrir') : '');
    }
    return etiqueta + (s.frase ? '<p class="frase-cena mesa-frase">' + R.negrito(s.frase) + '</p>' : '');
  }
  function corpoDoPasso(s, textos, sigla, versiculos) {
    if (s.tipo === 'palavra') {
      // o cartão cortado ganha o caminho para o capítulo, a não ser o do primeiro cartão, que já
      // tem o botão no alto do passo
      const capitulo = (ref) => { const c = R.capituloDe(ref); return c ? c.livro + ' ' + c.cap : ''; };
      const noAlto = s.abrir ? s.abrir.livro + ' ' + s.abrir.cap : '';
      const cartao = (c) => (noAlto && capitulo(c.ref) === noAlto ? cartaoComMais(c.ref, textos.get(c.ref) || '', sigla) : cartaoDaParte(c, textos, sigla, versiculos));
      return s.blocos.map((b) => (b.t === 'texto' ? '<p class="mesa-fala">' + R.negrito(b.texto) + '</p>' : R.blocoEmHtml(b, { cartao }))).join('');
    }
    if (s.tipo === 'orar' && s.convite) {
      return '<div class="mesa-convite">' + CC.ico('oracao') + '<p>Os pedidos de oração ficam na aba Oração da célula, no celular de cada um. Eles não aparecem nesta tela.</p></div>';
    }
    if (s.tipo === 'fechar') {
      return s.registrar
        ? '<div class="mesa-registrar"><h2>Quem veio hoje?</h2><p>Abre o registro de presença deste encontro. Só quem conduz vê quem veio e quem faltou.</p>'
          + '<button type="button" class="botao" data-registrar>' + CC.ico('lista-visto') + 'Registrar quem veio</button></div>'
        : '<div class="mesa-convite">' + CC.ico('livro') + '<p>O estudo fica na aba Estudo para você reler durante a semana.</p></div>';
    }
    return '';
  }

  async function modoEncontro(p, apoio) {
    const e = p.estudo;
    if (!e) return;
    const sem = semanaDe(p);
    const sigla = siglaDe(e);
    const ws = quatroWs(p);
    const versiculos = await contagemDe(e);
    const lista = R.passos(e, { conduzo: !!p.euConduzo, visitante: membroEu(p).papel === 'visitante', acolhida: ws.acolhida, adoracao: ws.adoracao, testemunho: ws.testemunho, semana: sem, versiculos });
    const refs = lista.flatMap((s) => (s.blocos || []).filter((b) => b.t === 'versiculo').map((b) => b.ref));
    const textos = await textosDe(refs, sigla);
    let i = Math.min(passoGuardado.get(e.id) || 0, lista.length - 1);
    CC.telaCheia('', {
      classe: 'tela-modo-encontro',
      rotulo: 'Modo encontro',
      fecharAoNavegar: true,
      pe: '<div class="modo-encontro-nav">'
        + '<button type="button" class="botao contorno pequeno" data-anterior>Anterior</button>'
        + '<span data-indice></span>'
        + '<button type="button" class="botao pequeno" data-proximo>Próximo</button>'
        + '<button type="button" class="botao pequeno" data-concluir hidden>' + ICO_CERTO() + 'Concluir</button></div>'
        + '<button class="botao plano" data-fechar>Sair do modo encontro</button>',
      ligar: (el, fechar) => {
        const palco = el.querySelector('.tela-cheia-palco');
        el.querySelector('.tela-cheia-pe').classList.add('mesa-pe');
        const q = (s) => el.querySelector(s);
        const mostrar = () => {
          const s = lista[i];
          const corpo = corpoDoPasso(s, textos, sigla, versiculos);
          palco.innerHTML = '<div class="cena modo-encontro mesa-topo">' + topoDoPasso(s) + '</div>' + (corpo ? '<div class="mesa-corpo-encontro">' + corpo + '</div>' : '');
          palco.scrollTop = 0;
          const ultimo = i === lista.length - 1;
          q('[data-indice]').textContent = (i + 1) + ' de ' + lista.length;
          q('[data-anterior]').disabled = i === 0;
          q('[data-proximo]').hidden = ultimo;
          q('[data-concluir]').hidden = !ultimo;
          q('[data-fechar]').hidden = ultimo;
          passoGuardado.set(e.id, i);
          ligarMais(palco);
          if (CC.inseparavel) CC.inseparavel(palco);
          const registrar = palco.querySelector('[data-registrar]');
          if (registrar) registrar.onclick = () => { passoGuardado.delete(e.id); fechar(); apoio.registrarEncontro(p); };
        };
        q('[data-fechar]').onclick = fechar;
        q('[data-anterior]').onclick = () => { if (i > 0) { i--; mostrar(); } };
        q('[data-proximo]').onclick = () => { if (i < lista.length - 1) { i++; mostrar(); } };
        q('[data-concluir]').onclick = () => { passoGuardado.delete(e.id); fechar(); };
        mostrar();
      },
    });
  }

  CC.estudoCelula = { aba, modoEncontro, mandarNoGrupo, cartaoComMais, ligarMais, textosDe };
})(window.CC);
