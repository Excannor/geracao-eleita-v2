/* Minhas anotações: um lugar só para tudo o que a pessoa escreveu e marcou. Junta as notas
   (nota, oração, estudo: E.notas, 02-estado.js), os versículos marcados, as reflexões dos dias
   (OIA do plano), as anotações do Explorar e os versículos dos baús. Busca, filtros e ordem
   rodam aqui mesmo, sem rede. Tudo privado: nada desta tela sai para amigo, célula,
   discipulado nem liderança. O editor de nota mora em 04e-versiculos.js.
   Rotas: #/perfil/anotacoes; #/perfil/versiculos e #/perfil/escritos (as duas telas antigas)
   viram esta. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const nb = (t) => String(t).replace(/(\d) (?=\p{L})/gu, '$1 ').replace(/(\p{L}) (?=\d)/gu, '$1 ')
    .replace(/(\d)-(?=\d)/g, '$1-⁠');
  const TIPOS = [['tudo', 'Tudo'], ['nota', 'Notas'], ['marcado', 'Marcados'], ['reflexao', 'Reflexões'],
    ['oracao', 'Orações'], ['estudo', 'Estudos'], ['explorar', 'Explorar'], ['bau', 'Dos baús']];
  // o nome no cartão e o ícone de cada tipo
  const CARA = {
    nota: ['Nota', 'caneta'], oracao: ['Oração', 'aperto'], estudo: ['Estudo', 'lupa'], marcado: ['Marcado', 'marca-texto'],
    reflexao: ['Reflexão do dia', 'caderno'], explorar: ['Explorar', 'bussola'], bau: ['Do baú', 'bau'],
  };
  const PERIODOS = [['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['365', 'Último ano']];
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const novoFiltro = () => ({ tipo: 'tudo', q: '', livro: '', cor: 0, tag: '', periodo: '', ordem: 'recentes' });
  let F = novoFiltro();

  const LIVROS = () => CC.COLECOES.flatMap(([, l]) => l);
  const deIso = (d) => (d ? new Date(d + 'T12:00:00').getTime() : 0);

  // ---------- os itens da tela, todos com o mesmo esqueleto ----------
  function itens() {
    const ordem = new Map(LIVROS().map((l, i) => [l, i]));
    const posicao = (ref) => {
      const r = CC.lerRef(ref);
      return r && ordem.has(r.livro) ? ordem.get(r.livro) * 1e6 + r.cap * 1e3 + r.de : Infinity;
    };
    const livroDe = (ref) => (CC.lerRef(ref) || {}).livro;
    const saida = [];
    for (const n of CC.notas()) {
      saida.push({ chave: 'n:' + n.id, tipo: n.tipo, nota: n, refs: n.versos, livros: n.versos.map(livroDe).filter(Boolean),
        em: n.editadaEm, texto: n.texto, cor: n.cor, tags: n.tags, fixada: n.fixada, pos: posicao(n.versos[0]) });
    }
    for (const m of CC.versiculos.marcados()) {
      saida.push({ chave: 'm:' + m.ref, tipo: 'marcado', refs: [m.ref], livros: [livroDe(m.ref)], em: m.em, texto: '', cor: m.cor, tags: [], pos: posicao(m.ref) });
    }
    const { porDia, porNota } = CC.minhasAnotacoes();
    const E = CC.estado();
    for (const d of porDia) {
      const p = D.plano[d.dia - 1];
      const t = (p.trechos || [])[0];
      saida.push({ chave: 'd:' + d.dia, tipo: 'reflexao', dia: d.dia, passagem: d.passagem, campos: d.campos, refs: [], livros: p.livros || [],
        em: deIso((E.marcadoEm || {})[d.dia]), texto: d.campos.map((c) => c.texto).join(' '), cor: 0, tags: [],
        pos: t && ordem.has(t.livro) ? ordem.get(t.livro) * 1e6 + t.de * 1e3 : Infinity });
    }
    for (const n of porNota) {
      saida.push({ chave: 'e:' + n.chave, tipo: 'explorar', titulo: n.titulo, href: n.href, refs: [], livros: [], em: 0, texto: n.texto, cor: 0, tags: [], pos: Infinity });
    }
    for (const v of (CC.versiculosGuardados ? CC.versiculosGuardados() : [])) {
      const bau = (E.bausAbertos || {})[CC.chaveBau ? CC.chaveBau(v.dia) : 'dia:' + v.dia] || {};
      saida.push({ chave: 'b:' + v.dia, tipo: 'bau', dia: v.dia, refs: [v.ref], livros: [livroDe(v.ref)], em: deIso(bau.em), texto: '', cor: 0, tags: [], pos: posicao(v.ref) });
    }
    return saida;
  }

  // ---------- filtros ----------
  const passa = (it, semTipo) => {
    if (!semTipo && F.tipo !== 'tudo' && it.tipo !== F.tipo) return false;
    if (F.q) {
      const alvo = CC.semAcento([it.texto, it.refs.join(' '), it.tags.join(' '), it.passagem || '', it.titulo || ''].join(' '));
      if (!CC.semAcento(F.q).trim().split(/\s+/).every((p) => alvo.includes(p))) return false;
    }
    if (F.livro === 'AT' && !it.livros.some((l) => !CC.ehNovoTestamento(l))) return false;
    if (F.livro === 'NT' && !it.livros.some(CC.ehNovoTestamento)) return false;
    if (F.livro.length > 2 && !it.livros.includes(F.livro)) return false;
    if (F.cor && it.cor !== F.cor) return false;
    if (F.tag && !it.tags.includes(F.tag)) return false;
    if (F.periodo && !(it.em >= Date.now() - Number(F.periodo) * 864e5)) return false;
    return true;
  };
  const nomeDoLivro = (v) => (v === 'AT' ? 'Antigo Testamento' : v === 'NT' ? 'Novo Testamento' : v);
  // [chave do filtro, rótulo, ícone, valor escrito quando ligado]
  const MENUS = [
    ['livro', 'Livro', 'livro', () => nomeDoLivro(F.livro)],
    ['cor', 'Cor', 'marca-texto', () => 'Cor ' + CC.versiculos.NOMES_COR[F.cor]],
    ['tag', 'Tag', 'caneta', () => '#' + F.tag],
    ['periodo', 'Período', 'calendario', () => (PERIODOS.find(([k]) => k === F.periodo) || [])[1]],
  ];

  // ---------- o cartão ----------
  function cartao(it) {
    const [nome, icone] = CARA[it.tipo];
    const n = it.nota;
    const ref = it.refs[0] || '';
    const respondida = n && n.tipo === 'oracao' && n.respondidaEm;
    const sub = it.tipo === 'reflexao' || it.tipo === 'bau' ? 'Dia ' + it.dia : it.tipo === 'explorar' ? it.titulo : ref;
    const q = respondida && CC.quando(n.respondidaEm);
    const quando = respondida ? CC.ico('certo') + 'Respondida ' + (/^\d/.test(q) ? 'em ' : '') + q : (it.em ? CC.quando(it.em) : '');
    const citacao = ref && it.tipo !== 'estudo' ? '<blockquote class="citacao-anot' + (it.cor ? ' marca-' + it.cor : '') + '"><span data-citar="' + CC.esc(ref) + '">'
      + nb(CC.esc(ref)) + '</span></blockquote>' : '';
    let corpo = '';
    if (it.tipo === 'reflexao') {
      corpo = '<h3>' + nb(CC.esc(it.passagem)) + '</h3>' + it.campos.map((c) => '<p class="campo-anot"><b>' + CC.esc(c.rotulo[0]) + '</b> ' + CC.esc(c.texto) + '</p>').join('');
    } else if (it.tipo === 'estudo') {
      const [titulo, ...resto] = n.texto.split('\n');
      corpo = '<h3>' + CC.esc(titulo) + '</h3>' + (resto.join('\n').trim() ? '<p class="texto-anot">' + CC.esc(resto.join('\n').trim()) + '</p>' : '');
    } else if (it.texto) {
      corpo = '<p class="texto-anot">' + CC.esc(it.texto) + '</p>';
    }
    const chips = (it.tipo === 'estudo' ? it.refs : it.refs.slice(1)).map((r) => '<span class="chip">' + nb(CC.esc(r)) + '</span>')
      .concat(it.tags.map((t) => '<span class="chip">#' + CC.esc(t) + '</span>'));
    return '<article class="cartao-anot' + (it.fixada ? ' fixada' : '') + '" data-item="' + CC.esc(it.chave) + '">'
      + '<div class="linha-tipo">' + CC.ico(icone) + '<b>' + nome + '</b>' + (sub ? '<span class="sub">· ' + nb(CC.esc(sub)) + '</span>' : '')
      + '<span class="quando' + (respondida ? ' respondida' : '') + '">' + (it.fixada ? CC.ico('pino') + '<span class="so-leitor">Fixada. </span>' : '') + quando + '</span>'
      + '<button class="mais-anot" data-acoes aria-label="Ações: ' + CC.esc(nome + (sub ? ', ' + sub : '')) + '">' + CC.ico('mais') + '</button></div>'
      + '<div class="corpo-anot" data-abrir>' + citacao + corpo + '</div>'
      + (chips.length ? '<div class="chips-anot">' + chips.join('') + '</div>' : '')
      + (n && n.tipo === 'oracao' && !respondida ? '<button class="botao pequeno contorno" data-responder>' + CC.ico('certo') + 'Marcar como respondida</button>' : '')
      + '</article>';
  }

  // ---------- a lista ----------
  function grupos(lista) {
    const saida = [];
    const em = (nome) => {
      let g = saida.find((x) => x.nome === nome);
      if (!g) saida.push(g = { nome, itens: [] });
      return g;
    };
    if (F.ordem === 'biblica') {
      lista.sort((a, b) => a.pos - b.pos || b.em - a.em);
      for (const it of lista) em(it.pos === Infinity ? 'Sem versículo' : it.livros[0]).itens.push(it);
    } else {
      lista.sort((a, b) => b.em - a.em);
      const ano = new Date().getFullYear();
      for (const it of lista) {
        const d = new Date(it.em);
        em(!it.em ? 'Sem data' : MESES[d.getMonth()] + (d.getFullYear() !== ano ? ' de ' + d.getFullYear() : '')).itens.push(it);
      }
    }
    return saida;
  }

  function controles(todos) {
    const base = todos.filter((it) => passa(it, true));
    const conta = (t) => (t === 'tudo' ? base.length : base.filter((it) => it.tipo === t).length);
    const tags = [...new Set(todos.flatMap((it) => it.tags))];
    return '<div class="pilulas-anot" role="group" aria-label="Tipo">'
      + TIPOS.filter(([t]) => t === 'tudo' || t === F.tipo || todos.some((it) => it.tipo === t))
        .map(([t, nome]) => '<button class="filtro' + (F.tipo === t ? ' ligado' : '') + '" data-tipo="' + t + '" aria-pressed="' + (F.tipo === t) + '">'
          + nome + (t === 'tudo' ? '' : ' <span class="conta">' + conta(t) + '</span>') + '</button>').join('') + '</div>'
      + '<div class="pilulas-anot filtros-anot">'
      + MENUS.filter(([k]) => k !== 'tag' || tags.length || F.tag).map(([k, rotulo, icone, valor]) => (F[k]
        ? '<button class="filtro aplicado" data-tirar="' + k + '" aria-label="' + CC.esc(rotulo + ': ' + valor() + '. Tirar o filtro') + '">'
          + CC.ico(icone) + CC.esc(valor()) + CC.ico('fechar') + '</button>'
        : '<button class="filtro" data-menu="' + k + '" aria-haspopup="dialog">' + rotulo + CC.ico('baixo') + '</button>')).join('')
      + '<button class="filtro" data-menu="ordem" aria-haspopup="dialog" aria-label="Ordem: ' + (F.ordem === 'biblica' ? 'ordem bíblica' : 'recentes primeiro') + '">'
      + (F.ordem === 'biblica' ? 'Ordem bíblica' : 'Recentes') + CC.ico('baixo') + '</button></div>';
  }

  function lista(todos) {
    const vistos = todos.filter((it) => passa(it));
    if (!vistos.length) {
      return '<div class="vazio">' + (F.q ? 'Nada com “' + CC.esc(F.q) + '”. Tente outra palavra.' : 'Nada com esses filtros.')
        + '</div><div class="acoes"><button class="botao contorno pequeno" data-limpar>Tirar os filtros</button></div>';
    }
    const fixadas = vistos.filter((it) => it.fixada);
    const resto = vistos.filter((it) => !it.fixada);
    return (fixadas.length ? CC.tituloSecao('Fixadas', String(fixadas.length)) + fixadas.map(cartao).join('') : '')
      + grupos(resto).map((g, i) => CC.tituloSecao(g.nome, i || fixadas.length ? String(g.itens.length)
        : (F.ordem === 'biblica' ? 'Ordem bíblica' : 'Recentes primeiro')) + g.itens.map(cartao).join('')).join('');
  }

  function vazioHtml() {
    return '<div class="vazio-anot"><span class="icone-vazio">' + CC.ico('caderno') + '</span>'
      + '<h2>Seu caderno com Deus começa aqui</h2>'
      + '<p>Tudo o que você marcar e escrever na Bíblia fica guardado aqui, só para você.</p>'
      + '<ol class="passos-anot"><li><span><b>Toque num versículo</b> enquanto lê</span></li>'
      + '<li><span><b>Escolha uma cor</b> ou toque em <b>Escrever nota</b></span></li>'
      + '<li><span>Encontre tudo aqui, por <b>livro, cor ou tag</b></span></li></ol>'
      + '<a class="botao" href="#/dia/' + CC.diaAtual() + '">' + CC.ico('livro') + 'Abrir a leitura de hoje</a>'
      + '<button class="botao contorno" data-nova>' + CC.ico('mais-sinal') + 'Escrever uma nota livre</button></div>';
  }

  // ---------- a tela ----------
  CC.vistaAnotacoes = function (raiz, opcoes) {
    if (!opcoes || !opcoes.manter) F = { ...novoFiltro(), ordem: F.ordem };
    const todos = itens();
    const apagadas = CC.notasApagadas().length;
    raiz.innerHTML = '<div class="folha-perfil cabeca-anot">' + CC.botaoVoltar('Perfil') + '<h1>Minhas anotações</h1>'
      + '<button class="botao-redondo salvia nova-anot" data-nova aria-label="Escrever uma nota livre">' + CC.ico('mais-sinal') + '</button>'
      + (todos.length ? '<div class="busca-caixa">' + CC.ico('lupa') + '<input id="busca-anot" type="search" placeholder="Buscar no que escrevi" aria-label="Buscar no que escrevi" autocomplete="off" enterkeyhint="search" value="' + CC.esc(F.q) + '"></div>' : '')
      + '</div>'
      + (todos.length ? '<div data-controles></div><div class="lista-anot" data-lista></div>' : vazioHtml())
      + '<div class="rodape-anot">'
      + (todos.length ? '<button class="botao contorno" data-exportar>' + CC.ico('baixar') + 'Baixar tudo o que escrevi</button>' : '')
      + (apagadas ? '<button class="botao contorno" data-apagadas>' + CC.ico('lixeira') + 'Apagadas (' + apagadas + ')</button>' : '')
      + (todos.length ? '<button class="botao plano perigo" data-apagar-todas>Apagar todas as anotações</button>' : '')
      + CC.avisoPrivado() + '</div>';

    CC.ligarAvisoPrivado(raiz);
    const redesenhar = () => CC.vistaAnotacoes(raiz, { manter: true });
    const pintarLista = () => {
      const alvo = raiz.querySelector('[data-lista]');
      if (!alvo) return;
      raiz.querySelector('[data-controles]').innerHTML = controles(todos);
      alvo.innerHTML = lista(todos);
      ligarControles();
      ligarCartoes(alvo, todos, redesenhar);
    };
    const ligarControles = () => {
      raiz.querySelectorAll('[data-tipo]').forEach((b) => { b.onclick = () => { F.tipo = b.dataset.tipo; pintarLista(); }; });
      raiz.querySelectorAll('[data-tirar]').forEach((b) => { b.onclick = () => { F[b.dataset.tirar] = b.dataset.tirar === 'cor' ? 0 : ''; pintarLista(); }; });
      raiz.querySelectorAll('[data-menu]').forEach((b) => { b.onclick = () => menu(b.dataset.menu, todos, pintarLista); });
      const limpar = raiz.querySelector('[data-limpar]');
      if (limpar) limpar.onclick = () => { F = { ...novoFiltro(), ordem: F.ordem }; const c = raiz.querySelector('#busca-anot'); if (c) c.value = ''; pintarLista(); };
    };
    pintarLista();
    const busca = raiz.querySelector('#busca-anot');
    if (busca) busca.addEventListener('input', () => { F.q = busca.value; pintarLista(); });
    raiz.querySelectorAll('[data-nova]').forEach((b) => { b.onclick = () => CC.versiculos.abrirEditor({ depois: redesenhar }); });
    const exportar = raiz.querySelector('[data-exportar]');
    if (exportar) exportar.onclick = exportarComAviso;
    const verApagadas = raiz.querySelector('[data-apagadas]');
    if (verApagadas) verApagadas.onclick = () => folhaApagadas(redesenhar);
    const todas = raiz.querySelector('[data-apagar-todas]');
    if (todas) {
      todas.onclick = async () => {
        if (!await CC.confirmar({ titulo: 'Apagar todas as anotações?', texto: 'Notas, orações, estudos, marcas e o que você escreveu nos dias somem deste aparelho e da sua conta. A conta, a leitura e a ofensiva continuam. Não há como desfazer: se quiser guardar, baixe antes.', acao: 'Apagar tudo', perigo: true })) return;
        CC.apagarTodasAnotacoes();
        CC.avisar('Anotações apagadas');
        redesenhar();
      };
    }
  };

  // Uma folha com as opções de um filtro (ou da ordem).
  function menu(qual, todos, depois) {
    let opcoes;
    if (qual === 'livro') {
      const presentes = new Set(todos.flatMap((it) => it.livros));
      opcoes = [['AT', 'Antigo Testamento'], ['NT', 'Novo Testamento']].concat(LIVROS().filter((l) => presentes.has(l)).map((l) => [l, l]));
    } else if (qual === 'cor') opcoes = CC.versiculos.CORES.map(([c, nome]) => [c, nome[0].toUpperCase() + nome.slice(1)]);
    else if (qual === 'tag') opcoes = [...new Set(todos.flatMap((it) => it.tags))].sort().map((t) => [t, '#' + t]);
    else if (qual === 'periodo') opcoes = PERIODOS;
    else opcoes = [['recentes', 'Recentes primeiro'], ['biblica', 'Ordem bíblica']];
    const titulo = { livro: 'Livro', cor: 'Cor', tag: 'Tag', periodo: 'Período', ordem: 'Ordem' }[qual];
    CC.folha('<h2>' + titulo + '</h2><div class="pilulas opcoes-filtro">'
      + opcoes.map(([v, nome]) => '<button class="pilula' + (qual === 'cor' ? ' com-cor marca-' + v : '') + '" data-valor="' + CC.esc(v) + '" aria-pressed="' + (String(F[qual]) === String(v)) + '">'
        + CC.esc(nome) + '</button>').join('') + '</div>',
    {
      rotulo: titulo, rolavel: true,
      ligar: (f, fechar) => f.querySelectorAll('[data-valor]').forEach((b) => {
        b.onclick = () => { F[qual] = qual === 'cor' ? Number(b.dataset.valor) : b.dataset.valor; fechar(); depois(); };
      }),
    });
  }

  // ---------- tocar no cartão e as ações do "mais" ----------
  function ligarCartoes(alvo, todos, redesenhar) {
    const porChave = new Map(todos.map((it) => [it.chave, it]));
    alvo.querySelectorAll('.cartao-anot').forEach((el) => {
      const it = porChave.get(el.dataset.item);
      el.querySelector('[data-abrir]').onclick = () => abrir(it, redesenhar);
      el.querySelector('[data-acoes]').onclick = () => acoes(it, redesenhar);
      const responder = el.querySelector('[data-responder]');
      if (responder) responder.onclick = () => { CC.responderOracao(it.nota.id, true); CC.avisar('Que bom! Oração marcada como respondida'); redesenhar(); };
      const citar = el.querySelector('[data-citar]');
      if (citar && CC.textoDoVersiculo) {
        CC.textoDoVersiculo(citar.dataset.citar).then((t) => {
          if (!t || !citar.isConnected) return;
          citar.textContent = t;
        }).catch(() => null);
      }
    });
  }

  function abrir(it, redesenhar) {
    if (it.nota) CC.versiculos.abrirEditor({ id: it.nota.id, depois: redesenhar });
    else if (it.tipo === 'reflexao') location.hash = '#/dia/' + it.dia;
    else if (it.tipo === 'explorar') location.hash = it.href;
    else CC.versiculos.irPara(it.refs[0]);
  }

  const textoParaCopiar = (it) => (it.tipo === 'reflexao' ? it.passagem + '\n' + it.campos.map((c) => c.rotulo + ': ' + c.texto).join('\n')
    : [it.refs.join('; '), it.texto].filter(Boolean).join('\n'));

  function acoes(it, redesenhar) {
    const n = it.nota;
    const ref = it.refs[0];
    const linha = (chave, icone, rotulo, extra) => '<button class="linha-acao' + (extra || '') + '" data-acao="' + chave + '">' + CC.ico(icone) + '<span>' + rotulo + '</span></button>';
    const linhas = [];
    if (n) linhas.push(linha('editar', 'caneta', 'Editar'), linha('fixar', 'pino', n.fixada ? 'Desafixar' : 'Fixar no topo'));
    if (n && n.tipo === 'oracao') linhas.push(linha('responder', 'certo', n.respondidaEm ? 'Ainda esperando resposta' : 'Marcar como respondida'));
    if (it.tipo === 'reflexao') linhas.push(linha('abrir', 'livro', 'Abrir o dia ' + it.dia));
    if (it.tipo === 'explorar') linhas.push(linha('abrir', 'bussola', 'Abrir no Explorar'));
    if (ref) linhas.push(linha('biblia', 'livro', 'Abrir na Bíblia'));
    if (ref && !n) linhas.push(linha('escrever', 'caneta', 'Escrever nota'));
    if (ref && CC.imagemStory) linhas.push(linha('story', 'imagem', 'Story do versículo'));
    linhas.push(linha('copiar', 'folha', 'Copiar texto'));
    if (n) linhas.push(linha('apagar', 'lixeira', 'Apagar ' + CARA[n.tipo][0].toLowerCase(), ' perigo'));
    if (it.tipo === 'marcado') linhas.push(linha('tirar', 'bloquear', 'Tirar a marca', ' perigo'));
    const titulo = (ref || it.titulo || (it.dia ? 'Dia ' + it.dia : '')) + ' · ' + CARA[it.tipo][0].toLowerCase();
    CC.folha('<h2>' + nb(CC.esc(titulo)) + '</h2><div class="lista-acoes">' + linhas.join('') + '</div>'
      + (n ? '<p class="dica-acoes">' + CC.ico('info') + '<span>Apagou sem querer? Fica em “Apagadas” por ' + CC.DIAS_APAGADAS + ' dias.</span></p>' : ''),
    {
      rotulo: 'Ações',
      ligar: (f, fechar) => f.querySelectorAll('[data-acao]').forEach((b) => {
        b.onclick = async () => {
          const a = b.dataset.acao;
          fechar();
          if (a === 'editar' || a === 'abrir') abrir(it, redesenhar);
          else if (a === 'fixar') {
            if (!CC.fixarNota(n.id, !n.fixada)) CC.avisar('Dá para fixar até ' + CC.MAX_FIXADAS + '. Desafixe uma antes.', { tipo: 'erro' });
            else redesenhar();
          } else if (a === 'responder') { CC.responderOracao(n.id, !n.respondidaEm); redesenhar(); }
          else if (a === 'biblia') CC.versiculos.irPara(ref);
          else if (a === 'escrever') CC.versiculos.abrirEditor({ ref, depois: redesenhar });
          else if (a === 'story') {
            const t = CC.traducao();
            CC.imagemStory({ tipo: 'versiculo', ref, texto: await CC.textoDoVersiculo(ref).catch(() => '') || '', traducao: t ? t.nome.replace(/Biblica® Open |™/g, '') : '' });
          } else if (a === 'copiar') CC.avisar(await CC.copiar(textoParaCopiar(it)) ? 'Texto copiado' : 'Não consegui copiar');
          else if (a === 'apagar') { CC.apagarNota(n.id); CC.avisar('Apagada. Fica em Apagadas por ' + CC.DIAS_APAGADAS + ' dias'); redesenhar(); }
          else if (a === 'tirar') {
            const r = CC.lerRef(ref);
            if (r) CC.marcar(CC.versiculos.chavesDoTrecho(r), 0);
            redesenhar();
          }
        };
      }),
    });
  }

  // ---------- Apagadas (30 dias) ----------
  function folhaApagadas(redesenhar) {
    const dias = (n) => Math.max(0, CC.DIAS_APAGADAS - Math.floor((Date.now() - n.apagadaEm) / 864e5));
    const lista = CC.notasApagadas().sort((a, b) => b.apagadaEm - a.apagadaEm);
    CC.folha('<h2>Apagadas</h2><p>Ficam aqui por ' + CC.DIAS_APAGADAS + ' dias e depois somem de vez, deste aparelho e da sua conta.</p>'
      + lista.map((n) => '<div class="previa-item"><p class="linha-tipo"><b>' + CARA[n.tipo][0] + '</b>' + (n.versos[0] ? ' · ' + nb(CC.esc(n.versos[0])) : '')
        + ' · some em ' + CC.plural(dias(n), 'dia', 'dias') + '</p><p class="texto-previa">' + CC.esc(n.texto.slice(0, 240)) + '</p>'
        + '<div class="pe-previa"><button class="botao pequeno contorno" data-recuperar="' + CC.esc(n.id) + '">Recuperar</button>'
        + '<button class="botao plano perigo" data-de-vez="' + CC.esc(n.id) + '">Apagar agora</button></div></div>').join(''),
    {
      rotulo: 'Apagadas', rolavel: true,
      ligar: (f, fechar) => {
        f.querySelectorAll('[data-recuperar]').forEach((b) => { b.onclick = () => { CC.recuperarNota(b.dataset.recuperar); fechar(); CC.avisar('Nota recuperada'); redesenhar(); }; });
        f.querySelectorAll('[data-de-vez]').forEach((b) => {
          b.onclick = async () => {
            if (!await CC.confirmar({ titulo: 'Apagar de vez?', texto: 'Não há como desfazer.', acao: 'Apagar', perigo: true })) return;
            CC.apagarNotaDeVez(b.dataset.deVez);
            fechar();
            redesenhar();
          };
        });
      },
    });
  }

  // O arquivo baixado é uma cópia fora do app: avisa antes (Configurações usa o mesmo).
  async function exportarComAviso() {
    if (!await CC.confirmar({ titulo: 'Baixar uma cópia?', texto: 'O arquivo leva tudo o que você escreveu e marcou e fica fora do app: quem tiver o arquivo consegue ler. Guarde num lugar só seu.', acao: 'Baixar' })) return;
    CC.baixarExportacao();
    CC.avisar('Arquivo gerado');
  }
  CC.exportarComAviso = exportarComAviso;
})(window.CC);
