/* O estudo da célula pronto (À Mesa): a aba Estudo, o modo encontro passo a passo, a folha
   "Mandar no grupo" e, na Fase 2 (docs/a-mesa-fase2.md, seção 4), os estudos anteriores (a lista
   e a leitura), "Usar como base", "Quem não veio", a anotação de cada um e a impressão. Pedida na primeira vez que alguém abre o estudo: o build junta este arquivo
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
  // no papel, o nome mesmo para quem preparou ("preparado por você" não diz nada a quem lê a folha)
  const noPapel = (linha, e) => (e.criadoPor === (CC.quem || {}).usuario ? linha.replace(/ por você$/, ' por ' + (e.criadoPorNome || '@' + e.criadoPor)) : linha);

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

  // O título que a anotação nova já traz: o do estudo, cortado na última palavra inteira que cabe
  // em CC.MAX_TITULO_NOTA (60).
  function tituloDaNota(e) {
    const t = String(R.titulo(e) || 'Estudo da célula').replace(/\s+/g, ' ').trim();
    const max = CC.MAX_TITULO_NOTA || 60;
    if (t.length <= max) return t;
    const corte = t.slice(0, max + 1);
    const i = corte.lastIndexOf(' ');
    return (i > 10 ? corte.slice(0, i) : t.slice(0, max)).replace(/[\s,.;:]+$/, '');
  }
  // Minha anotação neste estudo: uma nota como as outras, cifrada, só da pessoa (07g-anotacoes.js).
  // Não vale ponto nem conquista, e não entra no modo encontro nem na impressão.
  const blocoAnotacao = (e) => '<div class="mesa-anotacao" data-notas-contexto="estudo:' + esc(e.id) + '" data-tipo-nota="nota" data-titulo-notas="Minha anotação neste estudo"'
    + ' data-botao-notas="Escrever minha anotação" data-titulo-nota="' + esc(tituloDaNota(e)) + '"></div>';
  const ligarAnotacao = (raiz) => { if (CC.notasDoContexto) CC.notasDoContexto(raiz); };
  // O combinado da semana passada, na Acolhida: só a frase, sem nada para marcar (ninguém marca
  // se cumpriu).
  const combinadoLembrado = (texto) => '<div class="mesa-combinado"><p><b>Na semana passada combinamos:</b> '
    + esc(R.lembrarCombinado(texto).replace(/^Na semana passada combinamos: /, '')) + '</p></div>';
  const secaoCombinado = (e) => (e.combinado ? secaoW('Combinado para a semana', '<p>' + esc(e.combinado) + '</p>') : '');
  const visitante = (p) => membroEu(p).papel === 'visitante';

  // A Palavra de um estudo (a aba, a leitura de um anterior): o estudo escrito em partes, ou o
  // roteiro da leitura da semana e do trecho.
  function palavraHtml(p, e, sem, textos, sigla, versiculos, quem, apoio) {
    const legado = e.tipo === 'semana' || e.tipo === 'trecho';
    const nome = R.titulo(e);
    if (legado) {
      return (e.texto ? '<div class="recado-lider"><span class="etiqueta">Palavra de ' + esc(quem && quem !== 'você' ? quem : apoio.nomeDoLider(p)) + '</span>'
        + e.texto.split(/\n+/).filter(Boolean).map((l) => '<p>' + esc(l) + '</p>').join('') + '</div>' : '') + roteiro(p, e, sem, textos, sigla, versiculos);
    }
    return '<div class="mesa-estudo">' + (nome ? '<h2 class="mesa-t1">' + esc(nome) + '</h2>' : '')
      + R.comoBlocos(e, sem, versiculos).map((b) => R.blocoEmHtml(b, { cartao: (c) => cartaoDaParte(c, textos, sigla, versiculos) })).join('') + '</div>';
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
    const palavra = palavraHtml(p, e, sem, textos, sigla, versiculos, quem, apoio);
    const perguntas = legado ? [] : R.perguntasDe(e, sem);
    const anterior = p.combinadoAnterior && p.combinadoAnterior.texto;
    painel.innerHTML = (linha ? '<p class="passo-dica">' + esc(linha) + '</p>' : '')
      // O estudo que já foi usado num encontro fica guardado: o caminho é preparar o próximo (o
      // servidor faz o mesmo, estudos.mjs, estudoUsado)
      + (p.euPreparoEstudo ? '<div class="mesa-lider">' + CC.ico('caneta') + '<span><b>' + (e.criadoPor === (CC.quem || {}).usuario ? 'Você preparou este estudo' : 'O estudo desta célula') + '</b>'
        + '<small>' + (e.usado ? 'Ele já foi usado num encontro. Quando você preparar o próximo, este fica em Estudos anteriores.' : 'Só o líder pode mudar o estudo.') + '</small></span>'
        + '<button type="button" class="botao pequeno contorno" data-mudar>' + (e.usado ? 'Preparar o próximo' : 'Mudar o estudo') + '</button></div>' : '')
      + (e.tipo === 'blocos' || e.tipo === 'trecho' ? noPlanoHtml(refs) : '')
      + secaoW('Acolhida', (anterior ? combinadoLembrado(anterior) : '') + '<p>' + esc(ws.acolhida) + '</p>')
      + secaoW('Adoração', '<p>' + esc(ws.adoracao) + '</p>')
      + secaoW('Palavra', palavra)
      + (perguntas.length ? secaoW('Para conversar', '<ol class="roteiro-perguntas mesa-perguntas">' + perguntas.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ol>') : '')
      + secaoCombinado(e)
      + secaoW('Testemunho', '<p>' + esc(ws.testemunho) + '</p>')
      + blocoAnotacao(e)
      + '<div class="acoes"><button class="botao" data-compartilhar>' + CC.ico('compartilhar') + 'Mandar no grupo</button>'
      + '<button class="botao contorno" data-modo-encontro>' + CC.ico('livro') + 'Modo encontro</button>'
      + '<button class="botao plano" data-imprimir>' + CC.ico('folha') + 'Imprimir</button></div>'
      // os estudos anteriores, para quem faz parte da célula (o visitante vê só o atual)
      + (visitante(p) ? '' : '<div data-anteriores></div>');
    ligarMais(painel);
    if (CC.inseparavel) CC.inseparavel(painel);
    ligarAnotacao(painel);
    painel.querySelector('[data-compartilhar]').onclick = () => mandarNoGrupo(p, apoio);
    painel.querySelector('[data-modo-encontro]').onclick = () => modoEncontro(p, apoio);
    painel.querySelector('[data-imprimir]').onclick = () => imprimir(p, e, apoio, {
      linha: noPapel(linha, e), ws, combinadoAnterior: anterior, palavraDe: legado && e.texto ? 'Palavra de ' + (quem && quem !== 'você' ? quem : apoio.nomeDoLider(p)) : '',
    });
    const mudar = painel.querySelector('[data-mudar]');
    if (mudar) mudar.onclick = () => { location.hash = apoio.endereco(p.id, 'preparar'); };
    const lugar = painel.querySelector('[data-anteriores]');
    if (lugar) anteriores(lugar, p, apoio);
  }

  // ---------- Estudos anteriores: a lista (docs/a-mesa-fase2.md, 4.3) ----------
  // Fica na memória da peça durante a sessão, por célula; registrar um encontro ou salvar um
  // estudo a esquece (esquecer). Nenhuma contagem de leitura, presença ou anotação na lista.
  const listas = new Map();
  const leituras = new Map();
  const maeAberta = new Set();
  function esquecer(celula) {
    for (const k of [...listas.keys(), ...leituras.keys()]) if (k.startsWith(celula + '|')) { listas.delete(k); leituras.delete(k); }
  }
  const nomeDaCelula = (titulo) => (/^c[ée]lula(\s|$)/i.test(titulo || '') ? titulo : 'célula ' + (titulo || ''));
  const linhaAnterior = (p, x) => '<a class="mesa-anterior" href="' + CC.apoioCelula.endereco(p.id, 'estudo') + '/' + encodeURIComponent(x.id) + '">' + CC.ico('livro')
    + '<span><small>' + esc(R.dataDaLista(x)) + '</small><b>' + esc(R.titulo(x) || 'Estudo do encontro') + '</b>'
    + (R.refsCurtas(x.refs) ? '<small>' + esc(R.refsCurtas(x.refs)) + '</small>' : '') + '</span>' + CC.ico('direita') + '</a>';
  // Pede uma página (de: '' para os da própria célula, 'mae' para os da célula de origem) e
  // desenha a lista dentro de "alvo", acrescentando as páginas seguintes em "Ver mais estudos".
  async function carregarLista(alvo, p, de) {
    const chave = p.id + '|' + de;
    const desenhar = (l) => {
      alvo.innerHTML = (l.itens.length ? '<div class="mesa-anteriores">' + l.itens.map((x) => linhaAnterior(p, x)).join('') + '</div>' : '')
        + (l.mais ? '<button type="button" class="botao contorno pequeno mesa-mais-estudos" data-mais-estudos>Ver mais estudos</button>' : '')
        + (!l.itens.length && !de && p.estudo ? '<p class="passo-dica pequena">' + (p.euPreparoEstudo ? 'Quando você preparar o próximo estudo, este fica guardado aqui para a célula reler.'
          : 'Quando o próximo estudo for preparado, este fica guardado aqui para a célula reler.') + '</p>' : '');
      if (CC.inseparavel) CC.inseparavel(alvo);
      const mais = alvo.querySelector('[data-mais-estudos]');
      if (mais) mais.onclick = () => pedir(l.antes);
    };
    const pedir = async (antes) => {
      const l = listas.get(chave) || { itens: [], mais: false, antes: '' };
      if (!antes) alvo.innerHTML = CC.esqueleto('lista');
      let r;
      try {
        r = await CC.api('api/estudos?celula=' + encodeURIComponent(p.id) + (de ? '&de=' + de : '') + (antes ? '&antes=' + encodeURIComponent(antes) : ''));
      } catch (e) {
        if (!alvo.isConnected) return;
        if (antes) { CC.avisar('Não deu para abrir os estudos anteriores agora.'); return; }
        alvo.innerHTML = '<p class="passo-dica pequena">Não deu para abrir os estudos anteriores agora.</p><button type="button" class="botao contorno pequeno" data-tentar-lista>Tentar de novo</button>';
        alvo.querySelector('[data-tentar-lista]').onclick = () => pedir('');
        return;
      }
      const nova = { itens: (antes ? l.itens : []).concat(r.estudos || []), mais: !!r.mais, antes: r.antes || '', titulo: (r.celula || {}).titulo || '' };
      listas.set(chave, nova);
      if (alvo.isConnected) desenhar(nova);
    };
    if (listas.has(chave)) desenhar(listas.get(chave));
    else await pedir('');
  }

  // A seção inteira, embaixo dos botões da aba (ou do vazio, sem estudo atual): os da própria
  // célula e, na célula que nasceu de uma multiplicação, os da célula de origem, só para leitura.
  function anteriores(alvo, p) {
    if (visitante(p)) { alvo.innerHTML = ''; return; }
    const proprios = p.temAnteriores || p.estudo;
    const mae = p.daMae;
    alvo.className = 'mesa-secao-anteriores';
    alvo.innerHTML = (proprios ? CC.tituloSecao('Estudos anteriores') + '<div data-lista-propria></div>' : '')
      + (mae ? CC.tituloSecao('Da célula de origem') + '<p class="passo-dica pequena">Os estudos da ' + esc(nomeDaCelula(mae.titulo)) + ' até a multiplicação, em ' + ddmm(mae.ate) + '. Só para leitura.</p>'
        + '<div data-lista-mae><button type="button" class="botao contorno pequeno" data-ver-mae>' + CC.ico('livro') + 'Ver os estudos da ' + esc(nomeDaCelula(mae.titulo)) + '</button></div>' : '');
    const propria = alvo.querySelector('[data-lista-propria]');
    if (propria) {
      if (p.temAnteriores) carregarLista(propria, p, '');
      else propria.innerHTML = '<p class="passo-dica pequena">' + (p.euPreparoEstudo ? 'Quando você preparar o próximo estudo, este fica guardado aqui para a célula reler.'
        : 'Quando o próximo estudo for preparado, este fica guardado aqui para a célula reler.') + '</p>';
    }
    // a lista da célula de origem abre no toque e continua aberta nos redesenhos da sessão
    const daMae = alvo.querySelector('[data-lista-mae]');
    if (daMae) {
      if (listas.has(p.id + '|mae') || maeAberta.has(p.id)) carregarLista(daMae, p, 'mae');
      else daMae.querySelector('[data-ver-mae]').onclick = () => { maeAberta.add(p.id); carregarLista(daMae, p, 'mae'); };
    }
  }

  // ---------- ler um estudo anterior (docs/a-mesa-fase2.md, 4.4) ----------
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const diaDaSemana = (iso) => DIAS[new Date(iso + 'T12:00:00').getDay()];
  // O que fazer quando o estudo não abre: 404 (quem saiu, o estudo que não existe mais), 403 (a
  // visitante num anterior) ou sem rede.
  function naoAbriu(raiz, e, p, apoio, tentar) {
    const vazio = (texto, botao) => '<div class="vazio-amigos">' + CC.ico('livro') + '<p>' + esc(texto) + '</p>' + botao + '</div>';
    if (e && e.status === 404) {
      raiz.innerHTML = vazio('Este estudo não está aberto para você. Se você escreveu uma anotação nele, ela continua em Minhas anotações.',
        '<a class="botao contorno" href="#/perfil/anotacoes">' + CC.ico('caderno') + 'Minhas anotações</a>');
    } else if (e && e.status === 403) {
      raiz.innerHTML = vazio('Os estudos anteriores ficam para quem faz parte da célula. O estudo atual está na aba Estudo.',
        '<a class="botao contorno" href="' + (p ? apoio.endereco(p.id, 'estudo') : '#/celula') + '" data-atual>Ver o estudo atual</a>');
      const atual = raiz.querySelector('[data-atual]');
      if (atual && p) atual.onclick = (ev) => { ev.preventDefault(); CC.substituirRota(apoio.endereco(p.id, 'estudo')); };
    } else {
      raiz.innerHTML = CC.estadoSemPeca('Não deu para abrir o estudo');
      const b = raiz.querySelector('[data-acao-estado]');
      if (b) b.onclick = tentar;
    }
  }

  async function anterior(painel, p, apoio, alvo, aindaAqui) {
    const chave = p.id + '|' + alvo;
    let r = leituras.get(chave);
    if (!r) {
      painel.innerHTML = CC.esqueleto('texto');
      try {
        r = await CC.api('api/estudos?estudo=' + encodeURIComponent(alvo) + '&celula=' + encodeURIComponent(p.id));
      } catch (erro) {
        if (aindaAqui && !aindaAqui()) return;
        naoAbriu(painel, erro, p, apoio, () => anterior(painel, p, apoio, alvo, aindaAqui));
        return;
      }
      leituras.set(chave, r);
    }
    // o estudo atual tem a aba de sempre
    if (r.atual) { CC.substituirRota(apoio.endereco(p.id, 'estudo')); return; }
    const e = r.estudo;
    const sem = e.tipo === 'semana' && CC.D && CC.D.plano ? R.semana(e.planoAte || p.semanaAte) : null;
    const sigla = siglaDe(e);
    const versiculos = await contagemDe(e);
    const refs = R.comoBlocos(e, sem, versiculos).filter((b) => b.t === 'versiculo').map((b) => b.ref);
    const textos = await textosDe(refs, sigla);
    if (aindaAqui && !aindaAqui()) return;
    const quem = quemPreparou(e);
    const linha = (r.dataDe === 'encontro' ? 'Encontro de ' + diaDaSemana(r.data) + ', ' + ddmm(r.data) + (quem ? PONTO + 'preparado por ' + quem : '')
      : 'Preparado em ' + ddmm(r.data) + (quem ? ' por ' + quem : ''));
    const legado = e.tipo === 'semana' || e.tipo === 'trecho';
    const perguntas = legado ? [] : R.perguntasDe(e, sem);
    const etiqueta = r.daMae ? 'Da ' + nomeDaCelula(r.daMae.titulo) + PONTO + 'só para leitura' : 'Estudo anterior';
    const presenca = (r.encontros || []).slice(0, 3);
    painel.innerHTML = '<div class="mesa-volta">' + CC.botaoVoltar('Estudo') + '</div>'
      + '<div class="mesa-cabeca-anterior"><span class="etiqueta">' + esc(etiqueta) + '</span><p class="passo-dica">' + esc(linha) + '</p></div>'
      // quantas pessoas vieram: só quem conduz a célula do estudo, nunca na lista (não vira placar)
      + (presenca.length ? '<div class="mesa-presenca">' + CC.ico('pessoas') + '<span>' + presenca.map((x) => '<b>' + esc((x.pessoas === 1 ? 'Veio 1 pessoa' : 'Vieram ' + x.pessoas + ' pessoas') + ' no encontro de ' + ddmm(x.data) + '.') + '</b>').join('')
        + '<small>Só quem conduz a célula vê este número.</small></span></div>' : '')
      + (e.tipo === 'blocos' || e.tipo === 'trecho' ? noPlanoHtml(refs) : '')
      + secaoW('Palavra', palavraHtml(p, e, sem, textos, sigla, versiculos, quem, apoio))
      + (perguntas.length ? secaoW('Para conversar', '<ol class="roteiro-perguntas mesa-perguntas">' + perguntas.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ol>') : '')
      + secaoCombinado(e)
      + blocoAnotacao(e)
      + '<div class="acoes">' + (r.usarComoBase ? '<button class="botao" data-usar-base>' + CC.ico('caneta') + 'Usar como base</button>' : '')
      + '<button class="botao contorno" data-imprimir>' + CC.ico('folha') + 'Imprimir</button></div>';
    ligarMais(painel);
    if (CC.inseparavel) CC.inseparavel(painel);
    ligarAnotacao(painel);
    // o voltar: de volta à lista (no histórico) ou, sem tela anterior, à aba Estudo
    painel.querySelector('.mesa-volta [data-voltar]').onclick = () => { if (CC.anteriorNaPilha && CC.anteriorNaPilha()) history.back(); else CC.substituirRota(apoio.endereco(p.id, 'estudo')); };
    painel.querySelector('[data-imprimir]').onclick = () => imprimir(p, e, apoio, { anterior: true, linha: noPapel(linha, e), palavraDe: legado && e.texto ? 'Palavra de ' + (quem || apoio.nomeDoLider(p)) : '' });
    const base = painel.querySelector('[data-usar-base]');
    if (base) base.onclick = () => usarComoBase(p, apoio, alvo, r.data);
  }

  // ---------- Usar como base (docs/a-mesa-fase2.md, 4.5): só o líder, num anterior da célula ----------
  async function usarComoBase(p, apoio, alvo, data) {
    // o rascunho deste mesmo estudo de base continua de onde parou: não há o que trocar
    let rascunho = null;
    try { rascunho = JSON.parse(localStorage.getItem('cc.rascunho.estudo.' + p.id) || 'null'); } catch (e) { rascunho = null; }
    const outroRascunho = !!rascunho && rascunho.deBase !== alvo;
    const atualSemUso = !!(p.estudo && !p.estudo.usado);
    const frases = [];
    if (outroRascunho) frases.push('Você já começou um estudo neste celular. Se continuar, esse rascunho dá lugar ao estudo' + (data ? ' de ' + ddmm(data) : '') + '.');
    if (atualSemUso) frases.push('O estudo atual ainda não foi usado num encontro. Quando você salvar o novo, o atual sai da aba Estudo e fica em Estudos anteriores.');
    // só "Usar como base" segue: tocar fora (null) e "Cancelar" (false) ficam na leitura
    if (frases.length && await CC.confirmar({ titulo: 'Usar como base?', texto: frases.join(' '), acao: 'Usar como base' }) !== true) return;
    location.hash = apoio.endereco(p.id, 'preparar') + '/' + encodeURIComponent(alvo);
  }

  // ---------- Quem não veio (docs/a-mesa-fase2.md, 4.8) ----------
  // Depois do registro, para quem conduz: a mensagem pronta para cada pessoa, que ele manda, se
  // quiser, pelo próprio WhatsApp. O app não avisa ninguém e não guarda nada disso.
  function paraQuemFaltou(p, { data, faltaram, estudo } = {}) {
    const lista = faltaram || [];
    if (!lista.length) return;
    const apoio = CC.apoioCelula;
    const quando = apoio.quandoFoi ? apoio.quandoFoi(data) : '';
    const recado = (x) => CC.recadoFaltou({ nome: x.nome, celula: p.titulo, quando, estudo });
    const retrato = (x) => CC.retratoAmigo(Object.assign({}, x, (p.membros || []).find((m) => m.usuario === x.usuario) || {}));
    CC.folha('<h2>Quem não veio</h2>'
      + '<p class="passo-dica">O app não avisa ninguém. Se quiser, mande uma mensagem para cada pessoa pelo seu WhatsApp.</p>'
      + '<div class="mesa-zap-moldura"><span>A mensagem, com o nome de cada um</span><div class="mesa-zap">' + esc(recado(lista[0])) + '</div></div>'
      + '<div class="lista-pedidos mesa-faltou">' + lista.map((x, i) => '<div class="linha-amigo">' + retrato(x)
        + '<div class="quem-amigo"><b>' + esc(x.nome) + '</b></div><div class="mesa-faltou-acoes"><a class="botao-whatsapp" data-zap-faltou="' + esc(x.usuario) + '" href="https://wa.me/?text=' + encodeURIComponent(recado(x)) + '" target="_blank" rel="noopener">'
        + CC.ico('balao') + 'Mandar no WhatsApp</a><button type="button" class="botao contorno pequeno" data-copiar-faltou="' + i + '">Copiar</button></div></div>').join('') + '</div>'
      + '<div class="acoes"><button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Quem não veio',
      rolavel: true,
      classe: 'folha-faltou',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-copiar-faltou]').forEach((b) => {
          b.onclick = async () => {
            CC.avisar((await CC.copiar(recado(lista[Number(b.dataset.copiarFaltou)]))) ? 'Mensagem copiada. É só colar na conversa.' : 'Não consegui copiar agora.');
          };
        });
      },
    });
  }

  // ---------- Imprimir (docs/a-mesa-fase2.md, 4.10) ----------
  // O estudo no papel, em tinta preta sobre branco nos dois temas, sem as barras do app: um bloco
  // ligado direto no <body>, que o CSS de impressão (estudo-celula.css) deixa sozinho na página.
  // Ele sai na próxima impressão ou na próxima troca de endereço (há navegador de celular que
  // dispara o afterprint antes de a impressão terminar). Sem anotação, presença nem pedido.
  async function imprimir(p, e, apoio, opcoes = {}) {
    if (typeof window.print !== 'function') {
      CC.avisar('Este aparelho não abriu a impressão. Abra o app no navegador do celular ou do computador e tente de novo.', { tipo: 'erro' });
      return;
    }
    const sem = e.tipo === 'semana' && CC.D && CC.D.plano ? R.semana(e.planoAte || p.semanaAte) : null;
    const sigla = siglaDe(e);
    const versiculos = await contagemDe(e);
    const refs = R.comoBlocos(e, sem, versiculos).filter((b) => b.t === 'versiculo').map((b) => b.ref);
    const textos = await textosDe(refs, sigla);
    if (refs.some((r) => !textos.get(r))) {
      CC.avisar('Sem conexão, o texto dos versículos não veio. Tente imprimir de novo com internet.', { tipo: 'erro' });
      return;
    }
    const t = CC.traducao(sigla) || {};
    const ws = opcoes.ws || {};
    const html = R.paraImprimir(e, {
      celula: p.titulo, linha: opcoes.linha || '', textos, sigla: t.abreviatura || '', anterior: !!opcoes.anterior,
      credito: (t.credito || []).concat(t.licenca ? ['Licença ' + t.licenca] : []),
      acolhida: ws.acolhida, adoracao: ws.adoracao, testemunho: ws.testemunho, combinadoAnterior: opcoes.combinadoAnterior || '',
      noPlano: e.tipo === 'blocos' || e.tipo === 'trecho' ? R.noPlano(refs, CC.D && CC.D.plano) : [], palavraDe: opcoes.palavraDe || '', semana: sem, versiculos,
    });
    document.querySelectorAll('.mesa-impressao').forEach((x) => x.remove());
    const folha = document.createElement('div');
    folha.className = 'mesa-impressao';
    folha.setAttribute('aria-hidden', 'true');
    folha.innerHTML = html;
    document.body.appendChild(folha);
    document.body.classList.add('imprimindo-estudo');
    const tirarClasse = () => { document.body.classList.remove('imprimindo-estudo'); removeEventListener('afterprint', tirarClasse); };
    const tirarBloco = () => { folha.remove(); tirarClasse(); removeEventListener('hashchange', tirarBloco); };
    addEventListener('afterprint', tirarClasse);
    addEventListener('hashchange', tirarBloco);
    window.print();
  }

  // ---------- o endereço curto (#/estudo/<id>), vindo de Minhas anotações ----------
  // O servidor diz por qual célula a pessoa lê (a do estudo ou a filha), e a rota troca para a aba
  // Estudo dela; senão, o estado de "não está aberto".
  async function solto(raiz, estudo, apoio) {
    const aqui = location.hash;
    let r;
    try {
      r = await CC.api('api/estudos?estudo=' + encodeURIComponent(estudo));
    } catch (e) {
      if (location.hash === aqui) naoAbriu(raiz, e, null, apoio, () => solto(raiz, estudo, apoio));
      return;
    }
    if (location.hash !== aqui) return;
    leituras.set(r.celula + '|' + estudo, r);
    CC.substituirRota(apoio.endereco(r.celula, 'estudo') + (r.atual ? '' : '/' + encodeURIComponent(estudo)));
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
    // a acolhida que começa pelo combinado de antes: a pergunta da acolhida fica aqui embaixo
    if (s.tipo === 'acolhida' && s.pergunta) {
      return '<div class="mesa-convite">' + CC.ico('balao') + '<span><span class="etiqueta">Pergunta da acolhida</span><p>' + esc(s.pergunta) + '</p></span></div>';
    }
    if (s.tipo === 'combinado') {
      return '<div class="mesa-convite">' + CC.ico('balao') + '<p>Combinem juntos. No próximo encontro, a acolhida começa por aqui.</p></div>';
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
    const lista = R.passos(e, { conduzo: !!p.euConduzo, visitante: visitante(p), acolhida: ws.acolhida, adoracao: ws.adoracao, testemunho: ws.testemunho, semana: sem, versiculos,
      combinadoAnterior: p.combinadoAnterior ? p.combinadoAnterior.texto : '' });
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
          // a folha de registro já abre com este estudo escolhido
          if (registrar) registrar.onclick = () => { passoGuardado.delete(e.id); fechar(); apoio.registrarEncontro(p, { estudo: e.id }); };
        };
        q('[data-fechar]').onclick = fechar;
        q('[data-anterior]').onclick = () => { if (i > 0) { i--; mostrar(); } };
        q('[data-proximo]').onclick = () => { if (i < lista.length - 1) { i++; mostrar(); } };
        q('[data-concluir]').onclick = () => { passoGuardado.delete(e.id); fechar(); };
        mostrar();
      },
    });
  }

  CC.estudoCelula = { aba, modoEncontro, mandarNoGrupo, cartaoComMais, ligarMais, textosDe, anteriores, anterior, paraQuemFaltou, imprimir, solto, esquecer };
})(window.CC);
