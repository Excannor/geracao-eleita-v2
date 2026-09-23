/* Explorar: o material de consulta, as seções, cada nota e a busca. */
(function (CC) {
  'use strict';

  const D = CC.D;

  // Nenhuma categoria usa "vermelho". Na paleta nova ele é a cor de erro, a única que
  // carrega significado próprio no app; gasto como cor de categoria, deixa de avisar
  // quando precisa. Livros, Alianças e Oração eram vermelhos e saíram dele.
  const ESTILO_SECAO = {
    '01 - Trilha do Recém-Batizado': ['bandeira', 'azul'],
    '05 - Hermenêutica': ['bussola', 'roxo'],
    '15 - Fios Bíblicos': ['elo', 'turquesa'],
    '03 - Livros da Bíblia': ['livro', 'turquesa'],
    '08 - Versículos': ['marcador', 'amarelo'],
    '06 - Estudos Temáticos': ['camadas', 'roxo'],
    '11 - Pessoas': ['pessoas', 'azul'],
    '12 - Eventos': ['calendario', 'verde'],
    '13 - Lugares': ['alfinete', 'turquesa'],
    '14 - Alianças': ['aperto', 'amarelo'],
    '00 - Início': ['info', 'azul'],
    '02 - Plano de Leitura': ['trilha', 'verde'],
    '04 - Diário de Leitura': ['caneta', 'amarelo'],
    '07 - Reflexões': ['balao', 'roxo'],
    '09 - Oração': ['aperto', 'roxo'],
    '10 - Igreja': ['casa', 'azul'],
    '98 - Templates': ['folha', 'verde'],
  };
  const estilo = (pasta) => ESTILO_SECAO[pasta] || ['folha', 'azul'];

  // Os nomes e descrições das seções são escritos aqui, para quem abre o app pela
  // primeira vez, e não com os termos de quem montou o material.
  const TEXTO_SECAO = {
    '01 - Trilha do Recém-Batizado': ['Primeiros passos', 'Doze lições pra começar firme na fé'],
    '05 - Hermenêutica': ['Como ler a Bíblia', 'Dicas pra entender o texto sem tirar nada do lugar'],
    '15 - Fios Bíblicos': ['Conexões', 'Imagens e promessas que aparecem do começo ao fim da Bíblia'],
    '03 - Livros da Bíblia': ['Livros', 'Os 66 livros, cada um com a sua ficha'],
    '08 - Versículos': ['Versículos', 'Versículos importantes explicados dentro do contexto'],
    '06 - Estudos Temáticos': ['Temas', 'Assuntos da vida acompanhados pela Bíblia inteira'],
    '11 - Pessoas': ['Pessoas', 'Quem é quem nas histórias e o que cada um mostra sobre Deus'],
    '12 - Eventos': ['Acontecimentos', 'O que aconteceu e em que ordem, da criação ao fim'],
    '13 - Lugares': ['Lugares', 'Onde as histórias aconteceram'],
    '14 - Alianças': ['Alianças', 'As promessas que Deus fez com o seu povo'],
  };
  const FILTRO_LEGIVEL = { Antigo: 'Antigo Testamento', Novo: 'Novo Testamento', Marco: 'Grandes marcos', 'Episódio': 'Histórias' };
  const secaoDe = (pasta) => {
    const s = D.secoes.find((x) => x.pasta === pasta);
    if (!s || !TEXTO_SECAO[pasta]) return s;
    return { ...s, rotulo: TEXTO_SECAO[pasta][0], descricao: TEXTO_SECAO[pasta][1] };
  };

  // O subtítulo que só repete o nome da seção some, e a data perde a nota acadêmica entre
  // parênteses: no cartão basta a época, o detalhe fica dentro do texto.
  const SUB_REPETIDO = new Set(['Estudo temático', 'Hermenêutica', 'Trilha do recém-batizado', 'Aliança', 'Hub']);
  const subtitulo = (sub) => (SUB_REPETIDO.has(sub) ? ''
    : String(sub || '').replace(/\s*\((cronologia|sem data|sem consenso)[^)]*\)/gi, '').trim());

  // ---------- peças ----------
  CC.itemNota = function (id) {
    const n = D.notas[id];
    if (!n) return '';
    const sub = subtitulo(n.sub);
    return '<a class="item" href="#/nota/' + encodeURIComponent(id) + '" data-nota="' + CC.esc(id) + '">'
      + (sub ? '<span class="sub">' + CC.esc(sub) + '</span>' : '')
      + '<b>' + CC.esc(CC.semPrefixo(n.nome)) + '</b>'
      + (n.resumo ? '<span class="resumo">' + CC.esc(n.resumo) + '</span>' : '')
      + (n.destaque ? '<span class="destaque">' + CC.esc(n.destaque) + '</span>' : '')
      + (n.chips && n.chips.length
        ? '<span class="chips">' + n.chips.map((c) => '<span class="chip">' + CC.esc(
          Array.isArray(c) ? c.join(': ') : c) + '</span>').join('') + '</span>'
        : '')
      + '</a>';
  };

  CC.pilulaNota = function (id) {
    const n = D.notas[id];
    if (!n) return '';
    return '<a class="pilula" href="#/nota/' + encodeURIComponent(id) + '" data-nota="' + CC.esc(id) + '">'
      + CC.esc(CC.semPrefixo(n.nome)) + '</a>';
  };

  // Dentro da lição, abrir uma nota não pode tirar a pessoa do meio do passo:
  // a nota sobe numa folha por cima, e a lição continua onde estava.
  CC.ligarNotas = function (raiz) {
    raiz.querySelectorAll('[data-nota]').forEach((a) => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        CC.folhaNota(a.dataset.nota);
      });
    });
  };

  CC.folhaNota = function (id) {
    const n = D.notas[id];
    if (!n) return;
    CC.anotarNotaVista(id);
    CC.folha('<span class="etiqueta">' + CC.esc((secaoDe(n.pasta) || {}).rotulo || n.pasta) + '</span>'
      + '<div class="nota-corpo">' + n.html + '</div>'
      + '<div class="acoes"><a class="botao contorno" href="#/nota/' + encodeURIComponent(id)
      + '">Abrir o texto inteiro</a>'
      + '<button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rolavel: true,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('.nota-corpo [data-nota]').forEach((a) => {
          a.addEventListener('click', (ev) => { ev.preventDefault(); fechar(); CC.folhaNota(a.dataset.nota); });
        });
        folha.querySelector('a.botao').addEventListener('click', () => { CC.fecharLicao(); fechar(); });
      },
    });
  };

  // ---------- explorar ----------
  const GRUPOS = [
    ['Aprender a ler a Bíblia', ['05 - Hermenêutica', '15 - Fios Bíblicos']],
    ['Pra consultar quando precisar', ['03 - Livros da Bíblia', '08 - Versículos', '06 - Estudos Temáticos',
      '11 - Pessoas', '12 - Eventos', '13 - Lugares', '14 - Alianças']],
  ];

  // Textos de bastidor do material: modelos, o plano em texto, as páginas que explicam
  // como cada seção foi organizada e as de diário, oração e igreja, que o app substitui
  // pelas próprias telas. Continuam no arquivo, mas não aparecem em lista nem em busca.
  const PASTAS_INTERNAS = new Set(['02 - Plano de Leitura', '98 - Templates', '04 - Diário de Leitura',
    '07 - Reflexões', '09 - Oração', '10 - Igreja']);
  const INDICES = new Set(D.secoes.map((s) => s.indice).filter(Boolean));
  const HISTORIA = '00 - Início/A história bíblica em uma página';
  CC.notaInterna = (id) => {
    const n = D.notas[id];
    if (!n) return true;
    if (PASTAS_INTERNAS.has(n.pasta) || INDICES.has(id) || /\/00 - Índice/.test(id)) return true;
    return n.pasta === '00 - Início' && id !== HISTORIA;
  };

  CC.vistaExplorar = function (raiz) {
    const blocos = GRUPOS.map(([titulo, pastas]) => {
      const cartoes = pastas.map((pasta) => {
        const s = secaoDe(pasta);
        if (!s) return '';
        const [icone, cor] = estilo(pasta);
        return '<a class="bloco-secao c-' + cor + '" href="#/secao/' + encodeURIComponent(pasta) + '">'
          + '<span class="icone">' + CC.ico(icone) + '</span>'
          + '<b>' + CC.esc(s.rotulo) + '</b>'
          + '<span>' + CC.esc(s.descricao) + '</span></a>';
      }).join('');
      return CC.tituloSecao(titulo) + '<div class="grade-secoes">' + cartoes + '</div>';
    }).join('');

    const dia = D.plano[CC.diaAtual() - 1];
    const deHoje = [...(dia.rel.livros || []), ...(dia.rel.pessoas || []), ...(dia.rel.eventos || [])].slice(0, 8);
    const total = Object.keys(D.notas).filter((id) => !CC.notaInterna(id)).length;

    raiz.innerHTML = '<h1>Explorar</h1>'
      + '<p class="passo-dica">Quer entender melhor o que leu? Aqui tem quem é quem, onde tudo aconteceu e o que cada livro conta.</p>'
      + CC.campoBusca('')
      + (deHoje.length
        ? '<div class="cartao notas-de-hoje"><span class="etiqueta">Pra ir além na leitura de hoje</span>'
          + '<b>' + CC.esc(CC.passagemDe(dia)) + '</b>'
          + '<div class="pilulas">' + deHoje.map(CC.pilulaNota).join('') + '</div></div>'
        : '')
      + (D.notas[HISTORIA] ? '<a class="cartao cartao-historia" href="#/nota/' + encodeURIComponent(HISTORIA) + '">'
        + CC.ico('livro') + '<span><b>A história da Bíblia em uma página</b>'
        + '<span class="passo-dica">Veja o todo antes das partes.</span></span>' + CC.ico('avancar') + '</a>' : '')
      + blocos
      + '<p class="passo-dica" style="margin-top:26px">' + total + ' textos pra explorar.</p>';
    CC.ligarBusca(raiz);
  };

  // ---------- uma seção ----------
  CC.vistaSecao = function (raiz, pasta, filtro) {
    const s = secaoDe(pasta);
    if (!s) return CC.vazio(raiz, 'Não encontrei essa seção.');
    const [icone, cor] = estilo(pasta);
    const ids = filtro ? s.ids.filter((id) => D.notas[id].filtro === filtro) : s.ids;

    const filtros = s.filtros.length
      ? '<div class="filtros">'
        + '<button class="filtro' + (filtro ? '' : ' ligado') + '" data-filtro="">Tudo</button>'
        + s.filtros.map((f) => '<button class="filtro' + (f === filtro ? ' ligado' : '')
          + '" data-filtro="' + CC.esc(f) + '">' + CC.esc(FILTRO_LEGIVEL[f] || f) + '</button>').join('')
        + '</div>'
      : '';

    raiz.innerHTML = CC.botaoVoltar('Explorar')
      + '<div class="cabeca-secao c-' + cor + '">'
      + '<span class="icone-secao">' + CC.ico(icone) + '</span>'
      + '<div><h1>' + CC.esc(s.rotulo) + '</h1><p>' + CC.esc(s.descricao) + '</p></div></div>'
      + CC.tituloSecao(filtro ? FILTRO_LEGIVEL[filtro] || filtro : 'Tudo', CC.plural(ids.length, 'texto', 'textos'))
      + filtros
      + (ids.length ? '<div class="grade">' + ids.map(CC.itemNota).join('') + '</div>'
        : '<div class="vazio">Nada por aqui com esse filtro.</div>')
      + CC.painelAnotacao('secao:' + pasta, 'Suas anotações sobre ' + s.rotulo);

    raiz.querySelectorAll('[data-filtro]').forEach((el) => {
      el.onclick = () => {
        const f = el.dataset.filtro;
        location.hash = '#/secao/' + encodeURIComponent(pasta) + (f ? '?' + encodeURIComponent(f) : '');
      };
    });
    CC.ligarAnotacao(raiz);
  };

  // ---------- uma nota ----------
  CC.vistaNota = function (raiz, id) {
    const n = D.notas[id];
    if (!n) return CC.vazio(raiz, 'Não encontrei esse texto.');
    if (CC.notaVistaAgora !== id) { CC.notaVistaAgora = id; CC.anotarNotaVista(id); }
    const s = secaoDe(n.pasta);
    const [, cor] = estilo(n.pasta);

    const daqui = (n.backlinks || []).filter((b) => D.notas[b]);
    const grupos = {};
    for (const b of daqui) (grupos[D.notas[b].pasta] ||= []).push(b);

    const citada = Object.keys(grupos).length
      ? CC.tituloSecao('Aparece também em', CC.plural(daqui.length, 'texto', 'textos'))
        + Object.keys(grupos).map((pasta) =>
          '<p class="etiqueta" style="margin:12px 0 6px">'
          + CC.esc((secaoDe(pasta) || {}).rotulo || pasta) + '</p>'
          + '<div class="pilulas">' + grupos[pasta].map(CC.pilulaNota).join('') + '</div>').join('')
      : '';

    const ehLicao = D.licoes.includes(id);
    const feita = ehLicao && CC.fezLicao(id);

    raiz.innerHTML = CC.botaoVoltar(ehLicao ? 'Primeiros passos' : (s ? s.rotulo : 'Voltar'))
      + '<article class="nota-artigo c-' + cor + '">'
      + (n.alerta ? '<p class="etiqueta" style="color:var(--vermelho)">Assunto delicado: leia com calma</p>' : '')
      + '<div class="nota-corpo">' + n.html + '</div></article>'
      + (ehLicao
        ? '<div class="fim-da-licao" id="fim-da-licao">'
          + (feita
            ? '<p class="conquista-linha">' + CC.ico('certo') + 'Lição concluída</p>'
            : '<p class="passo-dica" data-leia-ate-o-fim>Leia até o fim para concluir esta lição.</p>'
              + '<button class="botao" data-concluir hidden>Concluí esta lição</button>')
          + '</div>'
        : '')
      + CC.painelAnotacao('nota:' + id, 'Suas anotações')
      + citada;

    // A lição só conta quando a pessoa chega ao fim do texto: o botão aparece ali.
    const bt = raiz.querySelector('[data-concluir]');
    if (bt) {
      const fim = raiz.querySelector('#fim-da-licao');
      const mostrar = () => {
        bt.hidden = false;
        const dica = raiz.querySelector('[data-leia-ate-o-fim]');
        if (dica) dica.hidden = true;
      };
      if ('IntersectionObserver' in window) {
        const olho = new IntersectionObserver((entradas) => {
          if (entradas.some((e) => e.isIntersecting)) { mostrar(); olho.disconnect(); }
        });
        olho.observe(fim);
      } else {
        mostrar();
      }
      bt.onclick = () => {
        CC.marcarLicao(id, true);
        CC.guardarConquistas();
        CC.avisar('Lição concluída!');
        CC.redesenhar();
      };
    }
    CC.ligarAnotacao(raiz);
  };

  // ---------- anotações livres ----------
  CC.painelAnotacao = function (chave, titulo) {
    const texto = CC.anotacao(chave);
    return CC.tituloSecao(titulo, texto ? 'escrito' : '')
      + '<div class="cartao"><div class="campo" style="margin:0">'
      + '<textarea data-anotacao="' + CC.esc(chave) + '" placeholder="Escreva aqui o que você quer lembrar."'
      + ' style="min-height:110px">' + CC.esc(texto) + '</textarea></div>'
      + '<div class="acoes"><button class="botao contorno pequeno" data-copiar-anotacao '
      + 'style="width:auto">Copiar</button></div></div>';
  };

  CC.ligarAnotacao = function (raiz) {
    const ta = raiz.querySelector('[data-anotacao]');
    if (!ta) return;
    ta.addEventListener('input', () => CC.gravarAnotacao(ta.dataset.anotacao, ta.value));
    const bt = raiz.querySelector('[data-copiar-anotacao]');
    if (bt) {
      bt.onclick = async () => {
        const certo = await CC.copiar(ta.value);
        CC.avisar(certo ? 'Anotação copiada' : 'Não consegui copiar');
      };
    }
  };

  // ---------- busca ----------
  CC.campoBusca = function (valor) {
    return '<div class="busca-caixa">' + CC.ico('lupa')
      + '<input id="campo-busca" type="search" placeholder="Buscar pessoas, lugares, temas…" aria-label="Buscar nos textos do app" '
      + 'autocomplete="off" spellcheck="false" enterkeyhint="search" value="' + CC.esc(valor) + '"></div>';
  };

  CC.ligarBusca = function (raiz) {
    const campo = raiz.querySelector('#campo-busca');
    if (!campo) return;
    let atraso;
    campo.addEventListener('input', () => {
      clearTimeout(atraso);
      atraso = setTimeout(() => {
        const q = campo.value.trim();
        const fim = campo.selectionStart;
        location.hash = q ? '#/busca/' + encodeURIComponent(q) : '#/explorar';
        const novo = document.getElementById('campo-busca');
        if (novo) { novo.focus(); try { novo.setSelectionRange(fim, fim); } catch (e) { /* segue */ } }
      }, 220);
    });
  };

  CC.vistaBusca = function (raiz, consulta) {
    const q = CC.semAcento(consulta);
    const achados = q.length < 2 ? [] : Object.keys(D.notas)
      .filter((id) => D.notas[id].t.includes(q) && !CC.notaInterna(id))
      .sort((a, b) => {
        const na = CC.semAcento(D.notas[a].nome).includes(q) ? 0 : 1;
        const nb = CC.semAcento(D.notas[b].nome).includes(q) ? 0 : 1;
        return na - nb || D.notas[a].nome.localeCompare(D.notas[b].nome, 'pt-BR');
      })
      .slice(0, 60);

    const meus = q.length < 2 ? [] : CC.meusTextos().filter((x) => CC.semAcento(x.texto).includes(q));

    raiz.innerHTML = CC.campoBusca(consulta)
      + (meus.length
        ? CC.tituloSecao('No que você escreveu', CC.plural(meus.length, 'trecho', 'trechos'))
          + '<div class="grade">' + meus.slice(0, 12).map((x) =>
            '<a class="item" href="' + x.href + '"><span class="sub">' + CC.esc(x.onde) + '</span>'
            + '<span class="resumo">' + CC.esc(x.texto.slice(0, 220)) + '</span></a>').join('')
          + '</div>'
        : '')
      + (achados.length
        ? CC.tituloSecao('Nos textos do app', CC.plural(achados.length, 'texto', 'textos'))
          + '<div class="grade">' + achados.map(CC.itemNota).join('') + '</div>'
        : (q.length < 2 ? '<div class="vazio">Digite pelo menos duas letras.</div>'
          : '<div class="vazio">Não achei nada com “' + CC.esc(consulta) + '”. Tente outra palavra.</div>'));
    CC.ligarBusca(raiz);
  };

  // Tudo o que a pessoa escreveu, achatado, para a busca alcançar.
  CC.meusTextos = function () {
    const E = CC.estado();
    const saida = [];
    const ROTULOS = [['o', 'Observação'], ['i', 'Interpretação'],
      ['a', 'Aplicação'], ['oracao', 'Oração']];
    for (const [dia, r] of Object.entries(E.oia || {})) {
      for (const [chave, rotulo] of ROTULOS) {
        const texto = (r || {})[chave];
        if (!texto || !texto.trim()) continue;
        saida.push({ onde: 'Dia ' + dia + ' · ' + rotulo, texto: texto.trim(), href: '#/dia/' + dia });
      }
    }
    for (const [chave, texto] of Object.entries(E.anotacoes || {})) {
      if (!texto || !texto.trim()) continue;
      const alvo = chave.replace(/^(nota|secao):/, '');
      const nome = D.notas[alvo] ? CC.semPrefixo(D.notas[alvo].nome) : ((secaoDe(alvo) || {}).rotulo || alvo);
      saida.push({
        onde: 'Anotação · ' + nome,
        texto: texto.trim(),
        href: chave.startsWith('nota:') ? '#/nota/' + encodeURIComponent(alvo)
          : '#/secao/' + encodeURIComponent(alvo),
      });
    }
    return saida;
  };

  // O mesmo material de CC.meusTextos, mas organizado como uma pessoa lembraria dele: os
  // registros de OIA nascem de um dia específico, então viram um caderno por dia, do mais
  // recente para o mais antigo. As anotações soltas numa nota ou seção do Explorar não têm
  // um único dia dono (a nota de uma pessoa bíblica pode valer para dezenas de dias), então
  // ficam à parte, mas levam consigo em que dias aquele material apareceu na leitura, quando
  // dá para saber, como uma ponte de volta ao dia que gerou a anotação.
  CC.minhasAnotacoes = function () {
    const E = CC.estado();
    const ROTULOS = [['o', 'Observação'], ['i', 'Interpretação'],
      ['a', 'Aplicação'], ['oracao', 'Oração']];
    const porDia = [];
    for (const [diaTexto, r] of Object.entries(E.oia || {})) {
      const dia = Number(diaTexto);
      const campos = ROTULOS.map(([chave, rotulo]) => ({ rotulo, texto: (r || {})[chave] }))
        .filter((c) => c.texto && c.texto.trim());
      if (!campos.length || !D.plano[dia - 1]) continue;
      porDia.push({ dia, passagem: CC.passagemDe(D.plano[dia - 1]), campos });
    }
    porDia.sort((a, b) => b.dia - a.dia);

    // de cada nota, os dias do plano em que ela aparece como material de apoio
    const diasPorNota = new Map();
    D.plano.forEach((p, i) => {
      for (const lista of Object.values(p.rel || {})) {
        for (const id of lista) {
          if (!diasPorNota.has(id)) diasPorNota.set(id, []);
          diasPorNota.get(id).push(i + 1);
        }
      }
    });

    const porNota = [];
    for (const [chave, texto] of Object.entries(E.anotacoes || {})) {
      if (!texto || !texto.trim()) continue;
      const alvo = chave.replace(/^(nota|secao):/, '');
      const ehNota = chave.startsWith('nota:');
      const nome = ehNota ? (D.notas[alvo] ? CC.semPrefixo(D.notas[alvo].nome) : alvo)
        : ((secaoDe(alvo) || {}).rotulo || alvo);
      porNota.push({
        titulo: nome,
        texto: texto.trim(),
        href: ehNota ? '#/nota/' + encodeURIComponent(alvo) : '#/secao/' + encodeURIComponent(alvo),
        dias: ehNota ? (diasPorNota.get(alvo) || []) : [],
      });
    }
    return { porDia, porNota };
  };

  CC.vazio = function (raiz, mensagem) {
    raiz.innerHTML = CC.botaoVoltar('Voltar') + '<div class="vazio">' + CC.esc(mensagem) + '</div>';
  };
})(window.CC);
