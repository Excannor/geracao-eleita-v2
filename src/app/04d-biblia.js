/* Bíblia: ler os 66 livros à vontade, fora da trilha do dia. Só leitura — sem busca,
   sem XP, sem marcar como lido, sem ações de versículo. O leitor daqui é uma cópia
   enxuta do leitor da lição (04b-leitor.js), porque aquele carrega junto o progresso
   do dia e a marcação de versículo, que não fazem sentido aqui. */
(function (CC) {
  'use strict';

  const CHAVE_LETRA = 'cc.letra';
  const CHAVE_MODO = 'cc.leitor.modo';
  const LETRAS = ['menor', 'normal', 'maior', 'enorme'];
  const gravarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* segue */ } };

  let geracao = 0;

  function wireVoltar(alvo) {
    alvo.querySelectorAll('[data-voltar]').forEach((el) => {
      el.onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/biblia'; };
    });
  }

  // CC.vazio já monta o botão de voltar, mas a tela pode ter sido preenchida dentro de
  // uma promise — depois que o roteador já ligou os [data-voltar] que existiam então.
  function mostrarVazio(alvo, mensagem) {
    CC.vazio(alvo, mensagem);
    wireVoltar(alvo);
  }

  function esqueleto(alvo, titulo, voltar) {
    alvo.innerHTML = (voltar ? CC.botaoVoltar(voltar) : '') + '<h1>' + CC.esc(titulo) + '</h1>'
      + '<div class="leitor-esqueleto"><i></i><i></i><i></i><i></i></div>';
    if (voltar) wireVoltar(alvo);
  }

  function semTraducaoOuOffline(alvo) {
    const b = CC.traducao();
    if (!b) { mostrarVazio(alvo, 'Este aplicativo foi gerado sem nenhuma tradução da Bíblia.'); return true; }
    if (!CC.appServido()) { mostrarVazio(alvo, 'Aberto como arquivo solto, o aplicativo não tem de onde trazer o texto.'); return true; }
    return false;
  }

  function erroDeCarga(alvo) {
    mostrarVazio(alvo, navigator.onLine === false
      ? 'Esta tradução ainda não está guardada neste celular. Com internet, ela fica guardada para ler sem rede.'
      : 'Não deu para abrir o texto agora.');
  }

  // ---------- lista dos 66 livros ----------
  function gradeLivros(lista) {
    return '<div class="grade-livros">' + lista.map((l) => '<a class="item-livro" href="#/biblia/'
      + encodeURIComponent(l) + '">' + CC.esc(l) + '</a>').join('') + '</div>';
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
      alvo.innerHTML = '<h1>Bíblia</h1>'
        + '<p class="passo-dica">Escolha um livro e leia à vontade, no seu ritmo.</p>'
        + CC.tituloSecao('Antigo Testamento', CC.plural(antigo.length, 'livro', 'livros')) + gradeLivros(antigo)
        + CC.tituloSecao('Novo Testamento', CC.plural(novo.length, 'livro', 'livros')) + gradeLivros(novo);
    }).catch(() => { if (minha === geracao) erroDeCarga(alvo); });
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
        + '<h1>' + CC.esc(livro) + '</h1>'
        + '<p class="passo-dica">' + CC.esc(CC.plural(total, 'capítulo', 'capítulos')) + '</p>'
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
      const atual = document.querySelector('.leitor-biblia');
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
    else location.replace('#/biblia/' + encodeURIComponent(livro));
  }

  CC.fecharLeituraBiblia = function () {
    leitorSobreGrade = false;
    const el = document.querySelector('.leitor-biblia');
    if (el) el.remove();
    if (escOuvinte) { document.removeEventListener('keydown', escOuvinte); escOuvinte = null; }
  };

  function abrirLeitor(livro, n, biblia, b) {
    let el = document.querySelector('.leitor-biblia');
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
      + '<b>' + CC.esc(livro) + ' ' + n + '</b></div>'
      + '<button class="botao-icone letra" data-aa-biblia aria-label="Tradução, letra e tema">Aa</button>'
      + '</div>'
      + '<div class="leitor-progresso"><i></i></div>'
      + '</div>'
      + '<div class="licao-palco"><div class="interno">'
      + '<div class="leitor-texto">' + CC.htmlDoTrecho(biblia, [{ livro, de: n, ate: n }]) + CC.creditoBiblia(b) + '</div>'
      + '</div></div>'
      + '<div class="licao-pe"><div class="interno">'
      + (temAnterior ? '<button class="botao contorno" data-anterior>‹ ' + CC.esc(antLivro) + ' ' + antCap + '</button>' : '')
      + (temProximo ? '<button class="botao contorno" data-proximo>' + CC.esc(proxLivro) + ' ' + proxCap + ' ›</button>' : '')
      + '</div></div>';

    el.querySelector('[data-fechar-biblia]').onclick = () => voltarParaGrade(livro);
    el.querySelector('[data-aa-biblia]').onclick = () => folhaAaBiblia(el, livro, n);
    const btAnt = el.querySelector('[data-anterior]');
    // replace e não hash: virar capítulo não empilha histórico, e o voltar do celular leva
    // à grade de capítulos em vez de refazer, um por um, todos os capítulos lidos.
    if (btAnt) btAnt.onclick = () => { location.replace('#/biblia/' + encodeURIComponent(antLivro) + '/' + antCap); };
    const btProx = el.querySelector('[data-proximo]');
    if (btProx) btProx.onclick = () => { location.replace('#/biblia/' + encodeURIComponent(proxLivro) + '/' + proxCap); };

    // Cada capítulo aberto começa do topo: navegar para o próximo/anterior não deveria
    // herdar a rolagem de onde a pessoa parou no capítulo passado.
    const palco = el.querySelector('.licao-palco');
    palco.scrollTop = 0;
    ligarProgresso(palco, el.querySelector('.leitor-progresso i'));

    if (novo) ligarEsc();
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
