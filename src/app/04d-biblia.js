/* Bíblia: ler os 66 livros à vontade, fora da trilha do dia. Sem XP, sem marcar
   como lido. O leitor daqui é uma cópia enxuta do leitor da lição (04b-leitor.js), porque
   aquele carrega junto o progresso do dia. As ações de versículo (marcar, nota, Juntos,
   copiar) são as mesmas dos dois leitores e moram em 04e-versiculos.js. */
(function (CC) {
  'use strict';

  const CHAVE_LETRA = 'cc.letra';
  const CHAVE_MODO = 'cc.leitor.modo';
  const LETRAS = ['menor', 'normal', 'maior', 'enorme'];
  // espaço inseparável entre número e livro e entre livro e capítulo, só na tela
  const nb = (t) => String(t).replace(/(\d) (?=\p{L})/gu, '$1\u00a0').replace(/(\p{L}) (?=\d)/gu, '$1\u00a0')
    .replace(/(\d)-(?=\d)/g, '$1-\u2060');
  const gravarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* segue */ } };

  let geracao = 0;

  function wireVoltar(alvo) {
    CC.ligarVoltarDoTopo(alvo);
  }

  // CC.vazio já monta o botão de voltar, mas a tela pode ter sido preenchida dentro de
  // uma promise — depois que o roteador já ligou os [data-voltar] que existiam então.
  function mostrarVazio(alvo, mensagem) {
    CC.vazio(alvo, mensagem);
    wireVoltar(alvo);
  }

  function esqueleto(alvo, titulo, voltar) {
    alvo.innerHTML = (voltar ? CC.botaoVoltar(voltar) : '') + '<h1' + (voltar ? '' : ' class="titulo-biblia"') + '>' + nb(CC.esc(titulo)) + '</h1>'
      + CC.esqueleto('biblia');
    if (voltar) wireVoltar(alvo);
  }

  function semTraducaoOuOffline(alvo) {
    const b = CC.traducao();
    if (!b) { mostrarVazio(alvo, 'Este aplicativo foi gerado sem nenhuma tradução da Bíblia.'); return true; }
    if (!CC.appServido()) { mostrarVazio(alvo, 'Aberto como arquivo solto, o aplicativo não tem de onde trazer o texto.'); return true; }
    return false;
  }

  function erroDeCarga(alvo) {
    const semRede = navigator.onLine === false;
    alvo.innerHTML = CC.botaoVoltar('Voltar') + CC.estado({
      erro: true,
      icone: 'info',
      titulo: semRede ? 'Sem internet agora' : 'Não deu para abrir o texto',
      texto: semRede ? 'Esta tradução ainda não está guardada neste celular. Com internet, ela fica guardada para ler sem rede.' : 'Pode ter sido a conexão. Tente de novo em instantes.',
      acao: 'Tentar de novo',
    });
    const b = alvo.querySelector('[data-acao-estado]');
    if (b) b.onclick = () => CC.redesenhar();
    wireVoltar(alvo);
  }

  // ---------- lista dos 66 livros ----------
  // Cada livro mostra quanto dele o plano já leu: um visto quando terminou, uma barra fina
  // enquanto está no meio. É o mesmo número da tela "Livros" do Perfil.
  function gradeLivros(lista) {
    return '<div class="grade-livros">' + lista.map((l) => {
      const p = CC.progressoDoLivro(l);
      const completo = p.total > 0 && p.lidos === p.total;
      const fracao = p.total ? p.lidos / p.total : 0;
      const rotulo = completo ? ', lido inteiro no plano' : p.lidos ? ', ' + p.lidos + ' de ' + p.total + ' dias do plano' : '';
      // nome comprido (Deuteronômio, 1 Tessalonicenses) ocupa a linha inteira no celular, para
      // não quebrar no meio da palavra nem separar o número do nome
      return '<a class="item-livro' + (completo ? ' completo' : '') + (l.length >= 12 ? ' longo' : '') + '" href="#/biblia/' + encodeURIComponent(l) + '"'
        + (rotulo ? ' aria-label="' + CC.esc(l + rotulo) + '"' : '') + '>'
        + '<span>' + nb(CC.esc(l)) + '</span>'
        + (completo ? CC.ico('certo') : fracao > 0 ? '<i class="progresso-livro" style="--f:' + (fracao * 100).toFixed(0) + '%"></i>' : '')
        + '</a>';
    }).join('') + '</div>';
  }

  // No topo: voltar ao capítulo que estava aberto, ou, para quem nunca abriu, a passagem do
  // plano de hoje. É o que o YouVersion faz ao abrir: ninguém procura de novo onde parou.
  function cartaoContinuar(biblia) {
    const u = CC.ultimaBiblia();
    if (u && Object.hasOwn(biblia.livros, u.livro) && u.cap >= 1 && u.cap <= biblia.livros[u.livro].length) {
      return '<a class="cartao-continuar" href="#/biblia/' + encodeURIComponent(u.livro) + '/' + u.cap + '">'
        + '<span class="icone-continuar">' + CC.ico('livro') + '</span>'
        + '<span class="textos"><small>Continuar lendo</small><b>' + nb(CC.esc(u.livro + ' ' + u.cap)) + '</b></span>'
        + CC.ico('avancar') + '</a>';
    }
    const dia = CC.D.plano[CC.diaAtual() - 1];
    const t = dia && (dia.trechos || [])[0];
    if (!t || !Object.hasOwn(biblia.livros, t.livro)) return '';
    return '<a class="cartao-continuar" href="#/biblia/' + encodeURIComponent(t.livro) + '/' + t.de + '">'
      + '<span class="icone-continuar">' + CC.ico('livro') + '</span>'
      // cada passagem numa linha, para o "·" nunca sobrar no fim da linha; o leitor de tela lê o "·"
      + '<span class="textos"><small>Leitura de hoje no plano</small><b>' + CC.passagemDe(dia).split(' · ')
        .map((p) => '<span class="parte">' + nb(CC.esc(p)) + '</span>').join('<span class="so-leitor"> · </span>') + '</b></span>'
      + CC.ico('avancar') + '</a>';
  }

  function listar(alvo, minha) {
    if (semTraducaoOuOffline(alvo)) return;
    const b = CC.traducao();
    esqueleto(alvo, 'Bíblia');
    CC.carregarBiblia(b).then((biblia) => {
      if (minha !== geracao) return;
      const livros = Object.keys(biblia.livros); // ordem canônica, do jeito que vem no arquivo
      const antigo = livros.filter((l) => !CC.ehNovoTestamento(l));
      const novo = livros.filter((l) => CC.ehNovoTestamento(l));
      // O título abre a escolha da tradução: a sigla da atual fica à vista ao lado.
      alvo.innerHTML = '<h1 class="titulo-biblia"><button class="botao-versao" data-versao aria-haspopup="dialog" aria-label="Bíblia, tradução '
        + CC.esc(b.nome.replace(/Biblica® Open |™/g, '')) + '. Trocar a tradução">Bíblia<span class="sigla-versao">'
        + CC.esc(b.abreviatura || b.sigla.toUpperCase()) + CC.ico('baixo') + '</span></button></h1>'
        + '<p class="subtitulo-tela">Escolha um livro e leia à vontade, no seu ritmo.</p>'
        + cartaoContinuar(biblia)
        + '<div class="busca-caixa">' + CC.ico('lupa') + '<input id="busca-livro" type="search" placeholder="Buscar livro (ex.: João 3)" aria-label="Buscar livro da Bíblia" autocomplete="off" spellcheck="false" enterkeyhint="go"></div>'
        + '<p class="passo-dica" id="busca-livro-vazia" hidden>Nenhum livro com esse nome.</p>'
        + '<div id="testamento-antigo">' + CC.tituloSecao('Antigo Testamento', CC.plural(antigo.length, 'livro', 'livros')) + gradeLivros(antigo) + '</div>'
        + '<div id="testamento-novo">' + CC.tituloSecao('Novo Testamento', CC.plural(novo.length, 'livro', 'livros')) + gradeLivros(novo) + '</div>';
      ligarBuscaLivro(alvo, biblia);
      const versao = alvo.querySelector('[data-versao]');
      if (versao) versao.onclick = () => folhaVersao(alvo);
    }).catch(() => { if (minha === geracao) erroDeCarga(alvo); });
  }

  // Busca pelo nome, sem acento e sem espaço ("1co", "joao"): primeiro o nome exato, depois os
  // que começam assim, depois os que contêm.
  // Com número depois do nome ("joão 3"), o Enter abre direto o capítulo.
  function ligarBuscaLivro(alvo, biblia) {
    const campo = alvo.querySelector('#busca-livro');
    if (!campo) return;
    const chave = (t) => CC.semAcento(t).replace(/[^a-z0-9]/g, '');
    const livros = Object.keys(biblia.livros);
    const separar = (texto) => {
      const m = texto.trim().match(/^(.*?)(?:\s+(\d+))?$/);
      return { nome: chave(m[1]), cap: m[2] ? Number(m[2]) : 0 };
    };
    const achados = (nome) => [...new Set(livros.filter((l) => chave(l) === nome)
      .concat(livros.filter((l) => chave(l).startsWith(nome)), livros.filter((l) => chave(l).includes(nome))))];
    campo.oninput = () => {
      const { nome } = separar(campo.value);
      const vistos = new Set(nome ? achados(nome) : livros);
      alvo.querySelectorAll('.item-livro').forEach((a) => { a.hidden = !vistos.has(a.querySelector('span').textContent.replace(/\u00a0/g, ' ')); });
      ['#testamento-antigo', '#testamento-novo'].forEach((sel) => {
        const bloco = alvo.querySelector(sel);
        bloco.hidden = !bloco.querySelector('.item-livro:not([hidden])');
      });
      alvo.querySelector('#busca-livro-vazia').hidden = vistos.size > 0;
    };
    campo.onkeydown = (ev) => {
      if (ev.key !== 'Enter') return;
      const { nome, cap } = separar(campo.value);
      const livro = nome && achados(nome)[0];
      if (!livro) return;
      ev.preventDefault();
      const total = biblia.livros[livro].length;
      location.hash = '#/biblia/' + encodeURIComponent(livro) + (cap ? '/' + Math.min(cap, total) : '');
    };
  }

  // ---------- grade de capítulos de um livro ----------
  function capitulos(alvo, livro, capitulo, minha) {
    if (semTraducaoOuOffline(alvo)) return;
    const b = CC.traducao();
    esqueleto(alvo, livro, 'Bíblia');
    CC.carregarBiblia(b).then((biblia) => {
      if (minha !== geracao) return;
      const caps = Object.hasOwn(biblia.livros, livro) ? biblia.livros[livro] : null;
      if (!caps) { mostrarVazio(alvo, 'Não encontrei esse livro.'); CC.fecharLeituraBiblia(); return; }
      const total = caps.length;
      const capValido = capitulo >= 1 && capitulo <= total ? capitulo : 0;
      alvo.innerHTML = CC.botaoVoltar('Bíblia')
        + '<h1>' + nb(CC.esc(livro)) + '</h1>'
        + '<p class="subtitulo-tela">' + CC.esc(CC.plural(total, 'capítulo', 'capítulos')) + '</p>'
        + '<div class="grade-capitulos">' + Array.from({ length: total }, (_, i) => i + 1).map((n) => '<a href="#/biblia/'
          + encodeURIComponent(livro) + '/' + n + '"' + (n === capValido ? ' aria-current="true" class="atual"' : '')
          + '>' + n + '</a>').join('') + '</div>';
      wireVoltar(alvo);
      alvo.querySelectorAll('.grade-capitulos a').forEach((a) => a.addEventListener('click', () => { leitorSobreGrade = true; }));
      if (capValido) abrirLeitor(livro, capValido, biblia, b);
      else CC.fecharLeituraBiblia();
    }).catch(() => { if (minha === geracao) erroDeCarga(alvo); });
  }

  CC.vistaBiblia = function (alvo, arg) {
    const minha = ++geracao;
    const partes = (arg || '').split('/').filter(Boolean);
    const livro = partes[0] || '';
    const capitulo = partes[1] ? Number(partes[1]) : 0;
    if (!livro) {
      CC.fecharLeituraBiblia();
      listar(alvo, minha);
      return;
    }
    capitulos(alvo, livro, capitulo, minha);
  };

  // ---------- leitor em tela cheia ----------
  function ligarProgresso(palco, barra) {
    let agendado = false;
    palco.addEventListener('scroll', () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        const total = palco.scrollHeight - palco.clientHeight;
        barra.style.width = (total > 0 ? Math.min(100, (palco.scrollTop / total) * 100) : 100) + '%';
      });
    }, { passive: true });
  }

  let escOuvinte = null;
  function ligarEsc() {
    if (escOuvinte) return;
    escOuvinte = (ev) => {
      if (ev.key !== 'Escape') return;
      if (document.querySelector('.cortina')) return; // a folha "Aa" fecha primeiro, pelo listener do roteador
      const atual = document.querySelector('.leitor-biblia:not(.saindo)');
      if (atual) voltarParaGrade(atual.dataset.livro);
    };
    document.addEventListener('keydown', escOuvinte);
  }

  // Fechar o leitor tem de devolver o histórico ao estado de antes dele. Se o capítulo foi
  // aberto por um toque na grade, a entrada anterior É a grade: volta de verdade (virar
  // capítulo usa replace, então ela continua ali). Se ninguém passou pela grade (link direto),
  // troca a entrada do capítulo pela da grade. Empurrar uma entrada nova, como antes, fazia o
  // "Voltar" da grade cair no capítulo recém-fechado e reabrir o leitor.
  let leitorSobreGrade = false;
  function voltarParaGrade(livro) {
    if (leitorSobreGrade) history.back();
    else CC.substituirRota('#/biblia/' + encodeURIComponent(livro));
  }

  CC.fecharLeituraBiblia = function () {
    leitorSobreGrade = false;
    CC.sair(document.querySelector('.leitor-biblia:not(.saindo)'));
    if (escOuvinte) { document.removeEventListener('keydown', escOuvinte); escOuvinte = null; }
  };

  function abrirLeitor(livro, n, biblia, b) {
    CC.guardarUltimaBiblia(livro, n);
    let el = document.querySelector('.leitor-biblia:not(.saindo)');
    const novo = !el;
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      document.body.appendChild(el);
    }
    // Duas classes de propósito: ".leitor" traz pronto todo o CSS da tela cheia (cabeçalho,
    // progresso, tamanhos de letra); ".leitor-biblia" é só para o NOSSO código, para
    // nunca pegar por engano o leitor da lição do dia num querySelector('.leitor').
    el.className = 'leitor leitor-biblia letra-' + CC.tamanhoDaLetra() + (CC.leituraCorrida() ? ' corrido' : '');
    el.setAttribute('aria-label', livro + ' ' + n);
    el.dataset.livro = livro;

    const livros = Object.keys(biblia.livros);
    const idx = livros.indexOf(livro);
    const total = (biblia.livros[livro] || []).length;

    let antLivro = livro;
    let antCap = n - 1;
    if (antCap < 1) { antLivro = livros[idx - 1]; antCap = antLivro ? biblia.livros[antLivro].length : 0; }
    let proxLivro = livro;
    let proxCap = n + 1;
    if (proxCap > total) { proxLivro = livros[idx + 1]; proxCap = 1; }
    const temAnterior = idx > 0 || n > 1;
    const temProximo = idx < livros.length - 1 || n < total;

    el.innerHTML = '<div class="leitor-cabeca">'
      + '<div class="licao-topo">'
      + '<button class="fechar" data-fechar-biblia aria-label="Voltar aos capítulos">' + CC.ico('fechar') + '</button>'
      + '<div class="leitor-titulo"><span class="rot">' + CC.esc(b.abreviatura) + '</span>'
      + '<b>' + nb(CC.esc(livro) + ' ' + n) + '</b></div>'
      + '<button class="botao-icone letra" data-aa-biblia aria-label="Tradução, letra e tema">Aa</button>'
      + '</div>'
      + '<div class="leitor-progresso"><i></i></div>'
      + '</div>'
      + '<div class="licao-palco"><div class="interno">'
      + '<div class="leitor-texto">' + CC.htmlDoTrecho(biblia, [{ livro, de: n, ate: n }]) + CC.creditoBiblia(b) + '</div>'
      + '</div></div>'
      + '<div class="licao-pe"><div class="interno">'
      + '<div class="acoes-verso" hidden></div>'
      + (temAnterior ? '<button class="botao contorno" data-anterior>‹\u00a0' + nb(CC.esc(antLivro) + ' ' + antCap) + '</button>' : '')
      + (temProximo ? '<button class="botao contorno" data-proximo>' + nb(CC.esc(proxLivro) + ' ' + proxCap) + '\u00a0›</button>' : '')
      + '</div></div>';

    el.querySelector('[data-fechar-biblia]').onclick = () => voltarParaGrade(livro);
    el.querySelector('[data-aa-biblia]').onclick = () => folhaAaBiblia(el, livro, n);
    const btAnt = el.querySelector('[data-anterior]');
    // replace e não hash: virar capítulo não empilha histórico, e o voltar do celular leva
    // à grade de capítulos em vez de refazer, um por um, todos os capítulos lidos.
    if (btAnt) btAnt.onclick = () => { CC.substituirRota('#/biblia/' + encodeURIComponent(antLivro) + '/' + antCap); };
    const btProx = el.querySelector('[data-proximo]');
    if (btProx) btProx.onclick = () => { CC.substituirRota('#/biblia/' + encodeURIComponent(proxLivro) + '/' + proxCap); };

    // Cada capítulo aberto começa do topo: navegar para o próximo/anterior não deveria
    // herdar a rolagem de onde a pessoa parou no capítulo passado.
    const palco = el.querySelector('.licao-palco');
    palco.scrollTop = 0;
    ligarProgresso(palco, el.querySelector('.leitor-progresso i'));
    CC.versiculos.ligar(el);

    if (novo) ligarEsc();
  }

  // ---------- escolher a tradução (pelo título da Bíblia) ----------
  function folhaVersao(alvo) {
    const atual = CC.traducao();
    const biblias = CC.biblias();
    CC.folha('<h2>Tradução</h2><div class="opcoes-traducao">'
      + biblias.map((b) => '<button class="opcao-traducao" data-traducao="' + CC.esc(b.sigla) + '" aria-pressed="'
        + (atual && b.sigla === atual.sigla) + '"><b>' + CC.esc(b.nome.replace(/Biblica® Open |™/g, '')) + '</b>'
        + '<span>' + CC.esc(b.resumo) + '</span></button>').join('') + '</div>'
      + '<div class="acoes"><button class="botao contorno" data-fechar>Pronto</button></div>',
    {
      rotulo: 'Escolher a tradução',
      classe: 'folha-aa folha-versao',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-traducao]').forEach((b) => {
          b.onclick = () => {
            fechar();
            if (atual && b.dataset.traducao === atual.sigla) return;
            CC.escolherTraducao(b.dataset.traducao);
            CC.vistaBiblia(alvo, '');
          };
        });
      },
    });
  }

  // ---------- folha "Aa" própria ----------
  // Cópia da folha de 04b-leitor.js: aquela chama o desenhar() da lição ao trocar tradução,
  // o que abriria (ou recriaria) o leitor errado. Grava nas mesmas chaves do aparelho.
  function folhaAaBiblia(el, livro, n) {
    const atual = CC.traducao();
    const tema = CC.temaGuardado();
    const biblias = CC.biblias();
    CC.folha('<h2>Leitura</h2>'
      + (biblias.length > 1 ? '<span class="etiqueta">Tradução</span><div class="opcoes-traducao">'
        + biblias.map((b) => '<button class="opcao-traducao" data-traducao="' + CC.esc(b.sigla) + '" aria-pressed="'
          + (atual && b.sigla === atual.sigla) + '"><b>' + CC.esc(b.nome.replace(/Biblica® Open |™/g, '')) + '</b>'
          + '<span>' + CC.esc(b.resumo) + '</span></button>').join('') + '</div>' : '')
      + '<span class="etiqueta">Tamanho da letra</span><div class="tamanhos">'
      + LETRAS.map((l) => '<button data-letra="' + l + '" class="t-' + l + '" aria-pressed="' + (l === CC.tamanhoDaLetra())
        + '" aria-label="Letra ' + l + '">Aa</button>').join('') + '</div>'
      + '<span class="etiqueta">Versículos</span><div class="segmentado" role="group" aria-label="Como mostrar os versículos">'
      + '<button data-modo-leitura="blocos" aria-pressed="' + !CC.leituraCorrida() + '">Um por linha</button>'
      + '<button data-modo-leitura="corrido" aria-pressed="' + CC.leituraCorrida() + '">Texto corrido</button></div>'
      + '<span class="etiqueta">Tema</span><div class="segmentado" role="group" aria-label="Tema">'
      + [['Sistema', null], ['Claro', false], ['Escuro', true]].map(([rot, v]) =>
        '<button data-tema="' + JSON.stringify(v) + '" aria-pressed="' + (tema === v) + '">' + rot + '</button>').join('')
      + '</div>'
      + '<div class="acoes"><button class="botao contorno" data-fechar>Pronto</button></div>',
    {
      rotulo: 'Opções de leitura',
      classe: 'folha-aa',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-traducao]').forEach((b) => {
          b.onclick = () => {
            if (atual && b.dataset.traducao === atual.sigla) return;
            CC.escolherTraducao(b.dataset.traducao);
            fechar();
            CC.vistaBiblia(document.getElementById('conteudo'), livro + '/' + n);
          };
        });
        folha.querySelectorAll('[data-letra]').forEach((b) => {
          b.onclick = () => {
            gravarLocal(CHAVE_LETRA, b.dataset.letra);
            LETRAS.forEach((l) => el.classList.toggle('letra-' + l, l === b.dataset.letra));
            folha.querySelectorAll('[data-letra]').forEach((x) => x.setAttribute('aria-pressed', x === b));
          };
        });
        folha.querySelectorAll('[data-modo-leitura]').forEach((b) => {
          b.onclick = () => {
            gravarLocal(CHAVE_MODO, b.dataset.modoLeitura);
            el.classList.toggle('corrido', b.dataset.modoLeitura === 'corrido');
            folha.querySelectorAll('[data-modo-leitura]').forEach((x) => x.setAttribute('aria-pressed', x === b));
          };
        });
        folha.querySelectorAll('[data-tema]').forEach((b) => {
          b.onclick = () => {
            CC.guardarTema(JSON.parse(b.dataset.tema));
            folha.querySelectorAll('[data-tema]').forEach((x) => x.setAttribute('aria-pressed', x === b));
            if (CC.pintarTopo) CC.pintarTopo();
          };
        });
      },
    });
  }
})(window.CC);
