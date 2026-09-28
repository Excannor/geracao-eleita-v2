/* Perfil: quem você é, a visão geral, a coleção (conquistas e troféus), o Semeador, o que
   você escreveu e guardou, e o aplicativo. Quem lê junto com você mora no Juntos. O Perfil mostra fidelidade e comunhão, não placar: o XP
   saiu da vista, e os marcos só aparecem para amigos se você escolher mostrá-los no Feed. */
(function (CC) {
  'use strict';

  const D = CC.D;

  // Uma conquista em linha: medalha com o nível, título, barra até o próximo nível.
  CC.linhaConquista = (c) => '<div class="linha-conquista selo-conquista' + (c.nivel ? ' ganha' : '') + '">'
    + CC.arte.medalha(c)
    + '<div class="corpo-conquista"><div class="titulo-conquista"><b>' + CC.esc(c.titulo) + '</b>'
    + '<span>' + (c.maximo ? 'Completa' : c.valor + '/' + c.alvo) + '</span></div>'
    + '<div class="barra-missao"><i style="width:' + (c.fracao * 100).toFixed(1) + '%"></i></div>'
    + '<span class="descricao-conquista">' + CC.esc(c.maximo ? 'Você chegou ao último nível!' : c.descricao) + '</span></div></div>';

  const FORMA_DO_TIPO = { unidade: 'taca', colecao: 'livros', testamento: 'biblia', plano: 'calendario', desafio: 'bandeira' };
  const trofeuHtml = (t) => '<div class="trofeu' + (t.ganho ? ' ganho' : '') + '">'
    + CC.arte.trofeu(t.cor || 'amarelo', t.ganho, t.total ? t.feitos / t.total : 0, FORMA_DO_TIPO[t.tipo])
    + '<b>' + CC.esc(t.titulo) + '</b>'
    + '<span>' + (t.ganho ? 'Conquistado' : t.feitos + ' de ' + t.total) + '</span></div>';

  // ---------- Trilha do Semeador ----------
  // O número vem do servidor (conta nova pelo seu link que fez a primeira lição). O cartão
  // nasce com o que veio na abertura do app e se atualiza quando o perfil abre.
  const metaDoNivel = (n) => (n.nivel === 5 ? n.meta + '+ convites' : n.meta === 1 ? '1 convite' : n.meta + ' convites');

  function cartaoSemeador(s) {
    if (!s) return '';
    const atual = (s.niveis || []).find((n) => n.nivel === s.nivel);
    const anterior = atual ? atual.meta : 0;
    const fracao = s.proximo ? (s.pessoas - anterior) / (s.proximo.meta - anterior) : 1;
    const pessoas = CC.plural(s.pessoas, 'pessoa pelo seu convite', 'pessoas pelo seu convite');
    return '<button class="cartao-semeador' + (s.nivel ? ' ganho' : '') + '" data-abrir-semeador>'
      + CC.arte.semeador(atual ? atual.arte : 'broto', !!s.nivel)
      + '<span class="corpo-semeador"><small>Trilha do Semeador</small>'
      + '<b>' + CC.esc(atual ? atual.nome : 'Lance a primeira semente') + '</b>'
      + '<span class="barra-missao" style="--cor: var(--verde)"><i style="width:' + (Math.max(0, Math.min(1, fracao)) * 100).toFixed(1) + '%"></i></span>'
      + '<span class="descricao-conquista">' + pessoas
      + (s.proximo ? ' · ' + (s.proximo.faltam === 1 ? 'falta 1' : 'faltam ' + s.proximo.faltam) + ' para ' + CC.esc(s.proximo.nome) : ' · último nível!') + '</span>'
      + '</span>' + CC.ico('avancar') + '</button>';
  }

  function folhaSemeador(s) {
    if (!s) return;
    CC.folha('<h2>Trilha do Semeador</h2>'
      + '<p class="passo-dica pequena">Até aqui, ' + CC.plural(s.pessoas, 'pessoa chegou', 'pessoas chegaram') + ' pelo seu convite.</p>'
      + '<div class="niveis-semeador">' + (s.niveis || []).map((n) => {
        const ganho = s.nivel >= n.nivel;
        return '<details class="nivel-semeador' + (ganho ? ' ganho' : '') + '"' + (n.nivel === Math.max(1, s.nivel) ? ' open' : '') + '>'
          + '<summary>' + CC.arte.semeador(n.arte, ganho)
          + '<span><b>Nível ' + n.nivel + ' · ' + CC.esc(n.nome) + '</b><small>' + metaDoNivel(n) + (ganho ? ' · conquistado' : '') + '</small></span></summary>'
          + '<p>' + CC.esc(n.texto) + '</p></details>';
      }).join('') + '</div>'
      + '<div class="acoes"><button class="botao azul" data-convidar-semeador>' + CC.ico('compartilhar') + 'Convidar alguém</button>'
      + '<button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Trilha do Semeador',
      rolavel: true,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-convidar-semeador]').onclick = () => { fechar(); CC.convidar(); };
      },
    });
  }

  // Subiu de nível desde a última vez que este aparelho viu: celebra uma vez.
  function celebrarSemeador(s) {
    const usuario = (CC.quem || {}).usuario;
    if (!s || !s.nivel || !usuario) return;
    const chave = 'cc.semeador.visto:' + usuario;
    let visto;
    try { visto = Number(localStorage.getItem(chave) || 0); } catch (e) { return; }
    if (s.nivel <= visto) return;
    try { localStorage.setItem(chave, String(s.nivel)); } catch (e) { return; }
    const n = (s.niveis || []).find((x) => x.nivel === s.nivel);
    if (!n || document.querySelector('.tela-cheia, .licao')) return;
    CC.telaCheia('<div class="cena cena-semeador">' + CC.arte.semeador(n.arte, true)
      + '<span class="etiqueta">Trilha do Semeador · nível ' + n.nivel + '</span>'
      + '<h1>' + CC.esc(n.nome) + '</h1>'
      + '<p class="frase-cena">' + CC.esc(n.texto) + '</p></div>', {
      classe: 'tela-semeador',
      rotulo: n.nome,
      pe: '<button class="botao azul" data-ok>Glória a Deus!</button>',
      ligar: (el, fechar) => {
        CC.arte.confete(el, 40);
        el.querySelector('[data-ok]').onclick = fechar;
      },
    });
  }

  function ligarSemeador(raiz) {
    const caixa = raiz.querySelector('[data-semeador]');
    if (!caixa) return;
    const ligar = () => {
      const b = caixa.querySelector('[data-abrir-semeador]');
      if (b) b.onclick = () => folhaSemeador((CC.quem || {}).semeador);
    };
    ligar();
    if (!location.protocol.startsWith('http') || !(CC.quem && CC.quem.comSenha)) return;
    CC.api('api/quem').then((q) => {
      if (!q || !q.semeador || !caixa.isConnected) return;
      CC.quem.semeador = q.semeador;
      caixa.innerHTML = cartaoSemeador(q.semeador);
      ligar();
      celebrarSemeador(q.semeador);
    }).catch(() => {});
  }

  CC.vistaPerfil = function (raiz) {
    const seq = CC.sequencia();
    const lidos = CC.ler('lidos', []).length;
    const semNada = !lidos && !CC.ler('licoes', []).length;
    const foto = CC.foto();
    const quem = CC.quem || {};
    const ritmo = CC.ritmo();
    const conquistas = CC.conquistasComNivel();
    const trofeus = CC.trofeus();
    const todos = [...trofeus.unidades, ...trofeus.colecoes, ...(trofeus.desafios || []), ...(trofeus.testamentos || [])];
    const ganhos = todos.filter((t) => t.ganho);

    // Visão geral: quatro números em grade simples, sem cartão colorido em volta de cada um
    const numero = (icone, valor, rotulo, href, dado) => (href ? '<a class="visao-item" href="' + href + '">'
      : '<button class="visao-item"' + (dado ? ' ' + dado : '') + '>') + icone
      + '<span><b>' + valor + '</b><small>' + CC.esc(rotulo) + '</small></span>' + (href ? '</a>' : '</button>');

    // Primeiro as conquistas mais perto do próximo nível: é o que dá vontade de seguir.
    const vitrine = conquistas.slice().sort((a, b) => (a.maximo - b.maximo) || (b.fracao - a.fracao)).slice(0, 3);

    raiz.innerHTML = '<div class="cabeca-tela"><h1>Perfil</h1>'
      + '<a class="botao-icone" href="#/config" aria-label="Configurações">' + CC.ico('engrenagem') + '</a></div>'
      + '<div class="cartao-pessoa">'
      + '<button class="retrato" data-trocar-foto aria-label="' + (foto ? 'Trocar a foto' : 'Escolher uma foto') + '">'
      + (foto ? '<img src="' + CC.esc(foto) + '" alt="">' : '<span class="sem-foto">' + CC.ico('pessoa') + '</span>')
      + '<span class="lapis">' + CC.ico('caneta') + '</span></button>'
      + '<div class="quem">'
      + '<label class="so-leitor" for="apelido">Seu nome</label>'
      + '<input id="apelido" class="campo-apelido" value="' + CC.esc(CC.apelido() || quem.nome || '') + '" '
      + 'placeholder="Seu nome" maxlength="20">'
      + (quem.usuario && quem.comSenha ? '<span class="conta">@' + CC.esc(quem.usuario) + '</span>' : '')
      + '</div>'
      + '<input type="file" id="arquivo-foto" accept="image/*" hidden>'
      + '</div>'
      + (semNada ? '<p class="passo-dica">Sua primeira lição acende tudo isso!</p>' : '')
      + '<h2 class="titulo-perfil">Visão geral</h2>'
      + '<div class="visao-geral">'
      + numero(CC.icoChama(seq.atual), seq.atual, seq.atual === 1 ? 'dia de ofensiva' : 'dias de ofensiva', '', 'data-ofensiva-perfil')
      + numero(CC.ico('trilha'), lidos + ' de ' + D.plano.length, 'dias do plano')
      + numero(CC.ico('livro'), CC.livrosCompletos() + ' de ' + CC.totalLivros, 'livros terminados', '#/perfil/livros')
      + numero(CC.ico('medalha'), conquistas.filter((c) => c.nivel).length + ' de ' + conquistas.length, 'conquistas', '#/perfil/conquistas')
      + '</div>'
      // A previsão só aparece quando anima: em até um ano e três meses. Mais longe que isso, a
      // data vira cobrança para quem está lendo devagar.
      + (ritmo.termino && ritmo.faltam && ritmo.porSemana >= 1 && (ritmo.termino - Date.now()) < 456 * 864e5
        ? '<div class="linha-ritmo">' + CC.ico('bussola') + '<span>No seu ritmo, você termina a Bíblia em <b>'
          + ritmo.termino.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) + '</b>.</span></div>'
        : '')
      // A coleção num lugar só: as três conquistas mais perto do próximo nível e os atalhos.
      + '<div class="titulo-secao"><h2>Coleção</h2></div>'
      + '<div class="caixa-lista">' + vitrine.map(CC.linhaConquista).join('') + '</div>'
      + '<div class="colecao-atalhos">'
      + '<a href="#/perfil/conquistas">' + CC.ico('medalha') + '<b>Conquistas</b><small>' + conquistas.filter((c) => c.nivel).length + ' de ' + conquistas.length + '</small></a>'
      + '<a href="#/perfil/trofeus">' + CC.ico('trofeu') + '<b>Troféus</b><small>' + ganhos.length + ' de ' + todos.length + '</small></a>'
      + '</div>'
      + '<div data-semeador>' + cartaoSemeador((CC.quem || {}).semeador) + '</div>'
      // O que é da pessoa: o que escreveu, guardou e leu.
      + '<div class="titulo-secao"><h2>Meus conteúdos</h2></div>'
      + '<div class="lista-atalhos">'
      + atalho('#/perfil/escritos', 'caneta', 'Minhas anotações')
      + atalho('#/perfil/versiculos', 'marcador', 'Meus versículos')
      + atalho('#/perfil/livros', 'livro', 'Livros da Bíblia')
      + atalho('#/passos', 'bandeira', 'Primeiros passos')
      + atalho('#/perfil/discipulado', 'cruz', 'Discipulado')
      + atalho('#/perfil/historia', 'aperto', 'Minha história com Deus')
      // Só para quem ainda não está em nenhuma célula: quem já está numa (ou mais) usa a
      // aba Célula da barra, que abre direto (ou lista, se for mais de uma).
      + (CC.minhasCelulas && CC.minhasCelulas().length ? '' : '<button class="atalho" data-nova-celula>' + CC.ico('pessoas') + '<span>Criar uma célula</span>' + CC.ico('avancar') + '</button>')
      + '</div>'
      // O app: instalar e as configurações com nome, não só o ícone do canto.
      + '<div class="titulo-secao"><h2>O aplicativo</h2></div>'
      + '<div class="lista-atalhos">'
      + '<button class="atalho" data-instalar>' + CC.ico('baixar') + '<span>Instalar no celular</span>' + CC.ico('avancar') + '</button>'
      + atalho('#/config', 'engrenagem', 'Configurações e conta')
      + '</div>'
      // Só o dono (CAMINHO_ADMIN no servidor) vê; o servidor recusa o painel para qualquer outra conta.
      + (CC.quem && CC.quem.admin ? '<div class="titulo-secao"><h2>Administração</h2></div><div class="lista-atalhos">'
        + atalho('#/config/painel', 'grafico', 'Painel do administrador') + '</div>' : '')
      + '<div class="linha-ajuda">' + CC.ico('aperto') + '<p>Precisa conversar com alguém? Fale com alguém de '
      + 'confiança ou ligue <b>188 (CVV)</b>, a qualquer hora. Se for abuso ou violência, ligue <b>100</b>.</p></div>';

    const novaCelula = raiz.querySelector('[data-nova-celula]');
    if (novaCelula) novaCelula.onclick = () => CC.novaCelula();
    const arquivo = raiz.querySelector('#arquivo-foto');
    raiz.querySelector('[data-trocar-foto]').onclick = () => arquivo.click();
    arquivo.onchange = async () => {
      const escolhido = arquivo.files && arquivo.files[0];
      if (!escolhido) return;
      try {
        CC.guardarFoto(await CC.prepararFoto(escolhido));
        CC.avisar('Foto atualizada');
        CC.redesenhar();
      } catch (e) {
        CC.avisar(e.message || 'Não consegui usar essa imagem.');
      }
      arquivo.value = '';
    };
    const campoNome = raiz.querySelector('#apelido');
    campoNome.addEventListener('input', () => CC.guardarApelido(campoNome.value));
    raiz.querySelector('[data-instalar]').onclick = () => CC.tutorialInstalar();
    const ofensiva = raiz.querySelector('[data-ofensiva-perfil]');
    if (ofensiva) ofensiva.onclick = CC.folhaOfensiva;
    ligarSemeador(raiz);
  };

  const atalho = (href, icone, texto) => '<a class="atalho" href="' + href + '">' + CC.ico(icone)
    + '<span>' + CC.esc(texto) + '</span>' + CC.ico('avancar') + '</a>';

  // ---------- conquistas ----------
  CC.vistaConquistas = function (raiz) {
    const conquistas = CC.conquistasComNivel();
    const legado = CC.conquistasLegado();
    raiz.innerHTML = CC.botaoVoltar('Perfil') + '<h1>Conquistas</h1>'
      + '<div class="caixa-lista">' + conquistas.map(CC.linhaConquista).join('') + '</div>'
      + (legado.length
        ? CC.tituloSecao('Da primeira versão') + '<div class="caixa-lista">' + legado.map((c) => '<div class="linha-conquista ganha">'
          + '<span class="arte-medalha c-amarelo"><span class="escudo">' + CC.ico(c.icone) + '</span></span>'
          + '<div class="corpo-conquista"><b>' + CC.esc(c.titulo) + '</b><span class="descricao-conquista">' + CC.esc(c.descricao) + '</span></div></div>').join('') + '</div>'
        : '');
  };

  // ---------- troféus ----------
  CC.vistaTrofeus = function (raiz) {
    const t = CC.trofeus();
    raiz.innerHTML = CC.botaoVoltar('Perfil') + '<h1>Troféus</h1>'
      + CC.tituloSecao('A Bíblia toda', t.testamentos.filter((x) => x.ganho).length + ' de ' + t.testamentos.length)
      + '<div class="estante">' + t.testamentos.map(trofeuHtml).join('') + '</div>'
      + CC.tituloSecao('Unidades do plano', t.unidades.filter((x) => x.ganho).length + ' de ' + t.unidades.length)
      + '<div class="estante">' + t.unidades.map(trofeuHtml).join('') + '</div>'
      + CC.tituloSecao('Partes da Bíblia', t.colecoes.filter((x) => x.ganho).length + ' de ' + t.colecoes.length)
      + '<div class="estante">' + t.colecoes.map(trofeuHtml).join('') + '</div>'
      + CC.tituloSecao('Desafios', t.desafios.filter((x) => x.ganho).length + ' de ' + t.desafios.length)
      + '<div class="estante">' + t.desafios.map(trofeuHtml).join('') + '</div>';
  };

  // ---------- meus versículos ----------
  // Tudo o que a pessoa fez com versículos, num lugar só: os que marcou, os que têm nota e
  // os que vieram nos baús, cada grupo do mais novo para o mais antigo. A lista aparece de
  // cara só com a referência e cada cartão se completa quando o texto da tradução carrega,
  // para a tela não ficar em branco e continuar servindo sem rede. Tocar num cartão abre o
  // trecho na Bíblia já escolhido: as ações (marcar, nota, Juntos) moram lá, e não repetidas
  // em cada cartão da lista.
  const itemVersiculo = (ref, etiqueta, cor) => '<a class="item-versiculo' + (cor ? ' marca-' + cor : '') + '" href="'
    + CC.hrefDoVerso(ref) + '" data-ref="' + CC.esc(ref) + '">'
    + (etiqueta ? '<span class="etiqueta">' + CC.esc(etiqueta) + '</span>' : '')
    + '<div class="cartao-do-versiculo"><p class="ref-carregando">' + CC.esc(ref) + '</p></div></a>';

  CC.vistaVersiculos = function (raiz) {
    const V = CC.versiculos;
    const marcados = V.marcados();
    const comNota = V.comNota();
    const guardados = CC.versiculosGuardados ? CC.versiculosGuardados() : [];
    const algum = marcados.length || comNota.length || guardados.length;

    raiz.innerHTML = CC.botaoVoltar('Perfil') + '<h1>Meus versículos</h1>'
      + (algum ? '' : '<p class="passo-dica">Enquanto lê, toque num versículo para marcar, escrever uma nota ou mostrar no Juntos. '
        + 'Os baús da trilha também trazem versículos para cá.</p>')
      + (marcados.length ? CC.tituloSecao('Marcados', String(marcados.length))
        + '<div class="lista-versiculos">' + marcados.map((m) => itemVersiculo(m.ref, '', m.cor)).join('') + '</div>' : '')
      + (comNota.length ? CC.tituloSecao('Com nota', String(comNota.length))
        + '<div class="lista-notas-verso">' + comNota.map((n) => '<div class="nota-verso">'
          + '<button class="abrir-nota-verso" data-nota="' + CC.esc(n.ref) + '"><b>' + CC.esc(n.ref) + '</b>'
          + '<span class="resumo">' + CC.esc(n.texto.slice(0, 220)) + '</span></button>'
          + '<button class="botao plano pequeno" data-abrir="' + CC.esc(n.ref) + '">' + CC.ico('livro') + 'Abrir na Bíblia</button></div>').join('')
        + '</div>' : '')
      + (guardados.length ? CC.tituloSecao('Dos baús', String(guardados.length))
        + '<div class="lista-versiculos">' + guardados.map((v) => itemVersiculo(v.ref, 'Dia ' + v.dia)).join('') + '</div>' : '');

    raiz.querySelectorAll('.item-versiculo').forEach((item) => {
      const ref = item.dataset.ref;
      item.onclick = (ev) => { ev.preventDefault(); V.irPara(ref); };
      if (!CC.textoDoVersiculo) return;
      const alvo = item.querySelector('.cartao-do-versiculo');
      CC.textoDoVersiculo(ref).then((texto) => {
        if (!alvo.isConnected || !texto) return;
        alvo.innerHTML = CC.cartaoVersiculo(ref, texto, { semAcoes: true });
      }).catch(() => { /* fica só a referência, que já diz qual é */ });
    });
    raiz.querySelectorAll('[data-nota]').forEach((b) => {
      b.onclick = () => V.abrirNota(b.dataset.nota, null, () => CC.vistaVersiculos(raiz));
    });
    raiz.querySelectorAll('[data-abrir]').forEach((b) => { b.onclick = () => V.irPara(b.dataset.abrir); });
  };

  // ---------- minhas anotações ----------
  // Um dia de leitura vira um cartão que abre para mostrar o que foi escrito nele: como um
  // caderno, não como uma pilha de post-its soltos. As anotações feitas numa nota do Explorar
  // (uma pessoa, um tema) não têm um único dia dono, então ficam à parte, com os dias em que
  // aquele material apareceu na leitura, quando dá para saber.
  function cartaoDoDia(d) {
    const u = CC.unidadeDoDia(d.dia);
    return '<details class="cartao-caderno c-' + u.cor + '">'
      + '<summary><span class="rotulo-dia-caderno">Dia ' + d.dia + '</span>'
      + '<span class="passagem-caderno">' + CC.esc(d.passagem) + '</span>'
      + '<span class="conta-caderno">' + CC.plural(d.campos.length, 'anotação', 'anotações') + '</span></summary>'
      + '<div class="campos-caderno">'
      + d.campos.map((c) => '<p><b>' + CC.esc(c.rotulo) + '</b>' + CC.esc(c.texto) + '</p>').join('')
      + '<a class="link-nota" href="#/dia/' + d.dia + '">' + CC.ico('avancar') + 'Abrir o dia ' + d.dia + '</a>'
      + '</div></details>';
  }

  function itemDaNota(n) {
    const dias = n.dias.length
      ? ' <span class="dias-da-nota">· surgiu no ' + (n.dias.length === 1 ? 'dia ' + n.dias[0]
        : 'dia ' + n.dias[0] + (n.dias.length > 1 ? ' e mais ' + (n.dias.length - 1) : '')) + '</span>'
      : '';
    return '<a class="item" href="' + n.href + '"><span class="sub">' + CC.esc(n.titulo) + dias + '</span>'
      + '<span class="resumo">' + CC.esc(n.texto.slice(0, 220)) + '</span></a>';
  }

  CC.vistaEscritos = function (raiz) {
    const { porDia, porNota, porVerso } = CC.minhasAnotacoes();
    const total = porDia.reduce((s, d) => s + d.campos.length, 0) + porNota.length + porVerso.length;
    raiz.innerHTML = CC.botaoVoltar('Perfil')
      + '<h1>Minhas anotações</h1>'
      + (total
        ? '<p class="passo-dica">' + CC.plural(total, 'anotação', 'anotações')
          + (porDia.length ? ' em ' + CC.plural(porDia.length, 'dia de leitura', 'dias de leitura') : '') + '.</p>'
          + (porDia.length ? '<div class="cadernos-dias">' + porDia.map(cartaoDoDia).join('') + '</div>' : '')
          + (porVerso.length ? '<h2 class="titulo-anotacoes-nota">Nos versículos</h2>'
            + '<div class="grade">' + porVerso.map((n) => '<a class="item" href="' + n.href + '" data-ref-nota="' + CC.esc(n.ref) + '">'
              + '<span class="sub">' + CC.esc(n.ref) + '</span><span class="resumo">' + CC.esc(n.texto.slice(0, 220)) + '</span></a>').join('')
            + '</div>' : '')
          + (porNota.length ? '<h2 class="titulo-anotacoes-nota">No material do Explorar</h2>'
            + '<div class="grade">' + porNota.map(itemDaNota).join('') + '</div>' : '')
        : '<div class="vazio">Quando você escrever sobre uma leitura, um versículo ou uma nota, aparece aqui.</div>')
      + '<div class="acoes"><button class="botao contorno" data-exportar>' + CC.ico('baixar') + 'Baixar tudo o que escrevi</button></div>';
    if (porDia.length) raiz.querySelector('.cadernos-dias details').open = true;
    raiz.querySelectorAll('[data-ref-nota]').forEach((a) => {
      a.onclick = (ev) => { ev.preventDefault(); CC.versiculos.irPara(a.dataset.refNota); };
    });
    raiz.querySelector('[data-exportar]').onclick = () => { CC.baixarExportacao(); CC.avisar('Arquivo gerado'); };
  };

  // ---------- livros ----------
  CC.vistaLivros = function (raiz) {
    const vistos = [];
    for (const d of D.plano) for (const l of d.livros) if (!vistos.includes(l)) vistos.push(l);
    const pilula = (l) => {
      const p = CC.progressoDoLivro(l);
      const completo = p.lidos === p.total;
      const id = '03 - Livros da Bíblia/' + l;
      const dentro = (completo ? CC.ico('certo') : '') + CC.esc(l)
        + ' <span class="conta-livro">' + p.lidos + '/' + p.total + '</span>';
      const classe = 'pilula' + (completo ? ' livro-feito' : (p.lidos ? ' livro-andando' : ''));
      return D.notas[id]
        ? '<a class="' + classe + '" href="#/nota/' + encodeURIComponent(id) + '">' + dentro + '</a>'
        : '<span class="' + classe + '">' + dentro + '</span>';
    };
    raiz.innerHTML = CC.botaoVoltar('Perfil')
      + '<h1>Livros da Bíblia</h1>'
      + '<p class="passo-dica">' + CC.livrosCompletos() + ' de ' + CC.totalLivros + ' concluídos. '
      + 'Cada livro se acende conforme você lê os dias que passam por ele.</p>'
      + '<div class="pilulas">' + vistos.map(pilula).join('') + '</div>';
  };

  // ---------- Minha história com Deus ----------
  // Guia privado: nunca sai daqui, para amigo, célula, discipulado nem painel (só volta pela
  // própria conta da pessoa, em api/estado). Três campos livres, com autosalvamento, como o
  // "Escrever sobre hoje" da lição (04-licao.js).
  const CAMPOS_HISTORIA = [
    ['antes', 'Antes: como era a sua vida? O que você buscava?'],
    ['encontro', 'O encontro: como você conheceu Jesus? Quem estava por perto?'],
    ['hoje', 'Hoje: o que mudou? Conte uma coisa concreta.'],
  ];
  const MAX_HISTORIA = 600;

  function campoHistoria(chave, pergunta, valor) {
    return '<div class="campo"><label for="campo-historia-' + chave + '">' + CC.esc(pergunta) + '</label>'
      + '<textarea id="campo-historia-' + chave + '" data-campo="' + chave + '" maxlength="' + MAX_HISTORIA
      + '" rows="4" autocomplete="off" autocapitalize="sentences">' + CC.esc(valor || '') + '</textarea>'
      + '<p class="passo-dica pequena" data-conta="' + chave + '"></p></div>';
  }

  CC.vistaHistoria = function (raiz) {
    const h = CC.minhaHistoria() || {};
    raiz.innerHTML = CC.botaoVoltar('Perfil')
      + '<h1>Minha história com Deus</h1>'
      + '<p class="passo-dica">Contar o que Deus fez na sua vida é um jeito simples de falar de Jesus. Se você cresceu na igreja, conte quando a fé passou a ser sua. '
      + 'Escreva só para você. Ninguém vê o que está aqui.</p>'
      + '<span class="selo-status" id="salvo-historia" role="status"></span>'
      + CAMPOS_HISTORIA.map(([chave, pergunta]) => campoHistoria(chave, pergunta, h[chave])).join('')
      + '<p class="passo-dica pequena">Use palavras suas, sem termos de igreja. Três minutos de conversa bastam.</p>'
      + '<div class="acoes"><button class="botao contorno pequeno" data-copiar>' + CC.ico('compartilhar') + 'Copiar minha história</button></div>';

    const conta = (chave) => {
      const campo = raiz.querySelector('[data-campo="' + chave + '"]');
      const nota = raiz.querySelector('[data-conta="' + chave + '"]');
      if (campo && nota) nota.textContent = campo.value.length + ' de ' + MAX_HISTORIA + ' caracteres';
    };
    const salvo = raiz.querySelector('#salvo-historia');
    const salvar = () => {
      const v = (chave) => (raiz.querySelector('[data-campo="' + chave + '"]') || {}).value || '';
      CC.gravarHistoria(v('antes'), v('encontro'), v('hoje'));
      if (salvo) { salvo.classList.add('leu'); salvo.innerHTML = CC.ico('certo') + 'Salvo'; }
    };
    CAMPOS_HISTORIA.forEach(([chave]) => {
      conta(chave);
      const campo = raiz.querySelector('[data-campo="' + chave + '"]');
      campo.addEventListener('input', () => { conta(chave); salvar(); });
    });
    raiz.querySelector('[data-copiar]').onclick = async () => {
      const atual = CC.minhaHistoria() || {};
      const texto = ['antes', 'encontro', 'hoje'].map((c) => atual[c] || '').filter(Boolean).join('\n\n');
      if (!texto) { CC.avisar('Escreva sua história antes de copiar.'); return; }
      CC.avisar((await CC.copiar(texto)) ? 'História copiada' : 'Não consegui copiar');
    };
  };
})(window.CC);
