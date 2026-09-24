/* Leitor: o texto bíblico dentro do aplicativo, numa tela que abre por cima da lição. */
(function (CC) {
  'use strict';

  const BIBLIAS = window.BIBLIAS || [];
  const CHAVE_TRADUCAO = 'cc.traducao';
  const CHAVE_LETRA = 'cc.letra';
  const CHAVE_POSICAO = 'cc.leitor.posicao';
  const CHAVE_MODO = 'cc.leitor.modo';
  const LETRAS = ['menor', 'normal', 'maior', 'enorme'];

  const NOVO = new Set(['Mateus', 'Marcos', 'Lucas', 'João', 'Atos', 'Romanos', '1 Coríntios',
    '2 Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 'Colossenses', '1 Tessalonicenses',
    '2 Tessalonicenses', '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom', 'Hebreus', 'Tiago',
    '1 Pedro', '2 Pedro', '1 João', '2 João', '3 João', 'Judas', 'Apocalipse']);
  CC.ehNovoTestamento = (livro) => NOVO.has(livro);

  // Um dia do plano pode juntar dois livros na mesma trilha ("Rute 3-4; 1 Samuel 1"),
  // então a trilha é recortada pelos trechos, e não pela referência escrita.
  CC.trechosDaTrilha = (dia, chave) =>
    (dia.trechos || []).filter((t) => NOVO.has(t.livro) === (chave === 'novo'));

  // ---------- preferências deste aparelho ----------
  const lerLocal = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const gravarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* segue */ } };

  CC.biblias = () => BIBLIAS;
  CC.traducao = () => BIBLIAS.find((b) => b.sigla === lerLocal(CHAVE_TRADUCAO)) || BIBLIAS[0] || null;
  CC.escolherTraducao = (sigla) => {
    gravarLocal(CHAVE_TRADUCAO, sigla);
    guardarNoAparelho();
  };
  const letra = () => (LETRAS.includes(lerLocal(CHAVE_LETRA)) ? lerLocal(CHAVE_LETRA) : 'normal');
  // Um versículo por bloco é o padrão: texto corrido numa tela de celular vira um paredão.
  const corrido = () => lerLocal(CHAVE_MODO) === 'corrido';
  CC.tamanhoDaLetra = letra;
  CC.leituraCorrida = corrido;

  const posicoes = () => { try { return JSON.parse(lerLocal(CHAVE_POSICAO) || '{}'); } catch (e) { return {}; } };
  const guardarPosicao = (chave, valor) => {
    const p = posicoes();
    if (valor) p[chave] = valor; else delete p[chave];
    // só as últimas trinta leituras: o resto é passado
    const chaves = Object.keys(p);
    if (chaves.length > 30) delete p[chaves[0]];
    gravarLocal(CHAVE_POSICAO, JSON.stringify(p));
  };

  // ---------- carregar o texto ----------
  const servido = () => location.protocol.startsWith('http');
  CC.appServido = servido;
  const carregadas = new Map();

  function carregar(b) {
    if (!carregadas.has(b.sigla)) {
      const pedido = fetch(b.arquivo).then((r) => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      });
      pedido.catch(() => carregadas.delete(b.sigla));
      carregadas.set(b.sigla, pedido);
    }
    return carregadas.get(b.sigla);
  }
  CC.carregarBiblia = carregar;

  // "Marcos 1.35" ou "João 3.16-17": devolve o texto na tradução escolhida.
  CC.textoDoVersiculo = function (ref) {
    const b = CC.traducao();
    const m = /^(.+?) (\d+)\.(\d+)(?:-(\d+))?/.exec(String(ref || ''));
    if (!b || !m || !servido()) return Promise.resolve(null);
    return carregar(b).then((biblia) => {
      const cap = ((biblia.livros[m[1]] || [])[Number(m[2]) - 1]) || [];
      const de = Number(m[3]);
      const ate = Math.min(Number(m[4] || m[3]), de + 2);
      // o cabeçalho acróstico da Bíblia Livre ("[Nun] :") não entra na citação
      const texto = cap.slice(de - 1, ate).filter(Boolean).join(' ').replace(/^\[[^\]]*\]\s*:?\s*/, '');
      return texto || null;
    }).catch(() => null);
  };

  // Notas de versículo do Explorar trazem o texto de cada tradução do app ("versos"):
  // mostra a escolhida, sem esperar o arquivo da Bíblia carregar.
  CC.textoDaNota = function (n) {
    const b = CC.traducao();
    return (n && n.versos && b && n.versos[b.sigla]) || (n && n.texto) || '';
  };
  CC.htmlDaNota = function (n) {
    if (!n || !n.versos) return n ? n.html : '';
    // a referência em <cite>, no versículo-chave das notas de livro, fica
    return n.html.replace(/(<blockquote data-verso="[^"]*">)[\s\S]*?(<cite>[\s\S]*?<\/cite><\/blockquote>|<\/blockquote>)/,
      (_, abre, fecha) => abre + CC.esc(CC.textoDaNota(n)) + fecha);
  };

  // Pede a tradução escolhida sem abri-la, só para o service worker guardá-la.
  function guardarNoAparelho() {
    const b = CC.traducao();
    if (!b || !servido() || !navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    fetch(b.arquivo).then((r) => r.blob()).catch(() => { /* fica para a próxima abertura */ });
  }
  CC.quandoCarregar(() => setTimeout(guardarNoAparelho, 5000));

  // ---------- a tela ----------
  let aberto = null;
  let geracao = 0;

  CC.leitorAberto = () => !!aberto;

  CC.fecharLeitor = function () {
    const el = document.querySelector('.leitor');
    if (el) el.remove();
    aberto = null;
  };

  CC.abrirLeitor = function (opcoes) {
    aberto = { ...opcoes };
    desenhar();
  };

  const chavePosicao = () => aberto.dia.numero + ':' + aberto.chave;

  function desenhar() {
    const minha = ++geracao;
    const { dia, chave, trilhas, cor } = aberto;
    const [, rotulo, ref] = trilhas.find(([k]) => k === chave);
    const atual = CC.traducao();
    const lida = aberto.lida(chave);
    const seguinte = trilhas.find(([k]) => k !== chave && !aberto.lida(k));

    let el = document.querySelector('.leitor');
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      document.body.appendChild(el);
    }
    el.className = 'leitor letra-' + letra() + (corrido() ? ' corrido' : '') + (cor ? ' c-' + cor : '');
    el.setAttribute('aria-label', ref);

    let principal = lida ? 'Voltar à lição' : 'Terminei a leitura';
    if (seguinte) principal = (lida ? 'Ler ' : 'Terminei! Ler ') + seguinte[2];

    el.innerHTML = '<div class="leitor-cabeca">'
      + '<div class="licao-topo">'
      + '<button class="fechar" data-fechar-leitor aria-label="Voltar à lição">' + CC.ico('fechar') + '</button>'
      + '<div class="leitor-titulo"><span class="rot">' + CC.esc(rotulo) + '</span>'
      + '<b>' + CC.esc(ref) + '</b></div>'
      + '<button class="botao-icone letra" data-aa aria-label="Tradução, letra e tema">Aa</button>'
      + '</div>'
      + '<div class="leitor-progresso"><i></i></div>'
      + '</div>'
      + '<div class="licao-palco"><div class="interno">'
      + '<div class="leitor-retomada" hidden></div>'
      + '<div class="leitor-texto"></div>'
      + '<span class="so-leitor" role="status"></span>'
      + '</div></div>'
      + '<div class="licao-pe"><div class="interno">'
      + '<div class="acoes-verso" hidden><b></b>'
      + '<button class="botao pequeno contorno" data-copiar-verso>' + CC.ico('folha') + 'Copiar</button>'
      + (CC.podeCompartilharComAmigos && CC.podeCompartilharComAmigos() ? '<button class="botao pequeno contorno" data-verso-amigos>' + CC.ico('pessoas') + 'Amigos</button>' : '')
      + '<button class="botao-icone" data-fechar-verso aria-label="Tirar a marca do versículo">' + CC.ico('fechar') + '</button></div>'
      + '<button class="botao cor" data-terminei>' + CC.esc(principal) + '</button>'
      + '</div></div>';

    el.querySelector('[data-fechar-leitor]').onclick = CC.fecharLeitor;
    el.querySelector('[data-aa]').onclick = () => folhaAa(el);
    el.querySelector('[data-terminei]').onclick = () => {
      guardarPosicao(chavePosicao(), null);
      if (!lida) { CC.anotarDiario('leitor', 1); aberto.marcar(chave); }
      if (seguinte) {
        aberto.chave = seguinte[0];
        desenhar();
      } else {
        CC.fecharLeitor();
      }
    };

    const palco = el.querySelector('.licao-palco');
    const barra = el.querySelector('.leitor-progresso i');
    let agendado = false;
    palco.addEventListener('scroll', () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        const total = palco.scrollHeight - palco.clientHeight;
        barra.style.width = (total > 0 ? Math.min(100, (palco.scrollTop / total) * 100) : 100) + '%';
        lembrarOndeParou(palco);
      });
    }, { passive: true });

    preencher(el, dia, chave, atual, minha);
  }

  // O primeiro versículo visível fica guardado, para a pessoa voltar ao mesmo lugar.
  function lembrarOndeParou(palco) {
    if (!aberto) return;
    const topo = palco.getBoundingClientRect().top + 8;
    const versos = palco.querySelectorAll('.leitor-verso');
    for (const v of versos) {
      if (v.getBoundingClientRect().bottom > topo) {
        guardarPosicao(chavePosicao(), v === versos[0] ? null : v.dataset.v);
        return;
      }
    }
  }

  function aviso(texto, tentar) {
    return '<div class="leitor-aviso">' + CC.ico('livro') + '<p>' + CC.esc(texto) + '</p>'
      + (tentar ? '<button class="botao contorno" data-tentar>Tentar de novo</button>' : '')
      + '</div>';
  }

  function preencher(el, dia, chave, b, minha) {
    const alvo = el.querySelector('.leitor-texto');
    const status = el.querySelector('.so-leitor');
    if (!b) {
      alvo.innerHTML = aviso('Este aplicativo foi gerado sem nenhuma tradução da Bíblia. Leia na sua Bíblia e marque a passagem na lição.');
      return;
    }
    if (!servido()) {
      alvo.innerHTML = aviso('Aberto como arquivo solto, o aplicativo não tem de onde trazer o texto. Leia na sua Bíblia e marque a passagem na lição.');
      return;
    }
    alvo.innerHTML = '<div class="leitor-esqueleto"><i></i><i></i><i></i><i></i></div>';
    carregar(b).then((biblia) => {
      if (minha !== geracao) return;
      alvo.innerHTML = textoDe(biblia, CC.trechosDaTrilha(dia, chave)) + credito(b);
      status.textContent = 'Texto carregado';
      ligarVersos(el);
      retomar(el);
    }).catch(() => {
      if (minha !== geracao) return;
      alvo.innerHTML = aviso(navigator.onLine === false
        ? 'Esta tradução ainda não está neste celular. Com internet, ela fica guardada para ler sem rede.'
        : 'Não deu para abrir o texto agora.', true);
      alvo.querySelector('[data-tentar]').onclick = () => preencher(el, dia, chave, b, minha);
    });
  }

  function retomar(el) {
    const salvo = posicoes()[chavePosicao()];
    const verso = salvo && el.querySelector('.leitor-verso[data-v="' + salvo + '"]');
    const faixa = el.querySelector('.leitor-retomada');
    if (!verso) return;
    const [cap, v] = salvo.split(':');
    faixa.hidden = false;
    faixa.innerHTML = '<span>Continuando do versículo ' + cap + '.' + v + '</span>'
      + '<button class="botao plano pequeno" data-inicio>Do início</button>';
    faixa.querySelector('[data-inicio]').onclick = () => {
      guardarPosicao(chavePosicao(), null);
      faixa.hidden = true;
      el.querySelector('.licao-palco').scrollTop = 0;
    };
    verso.scrollIntoView({ block: 'start' });
    el.querySelector('.licao-palco').scrollTop -= 12;
  }

  // Cada versículo num bloco, com o número em destaque discreto e o capítulo como título.
  // A separação é só visual: o arquivo não tem parágrafos, e nenhuma palavra é mudada.
  function textoDe(biblia, trechos) {
    let html = '';
    for (const t of trechos) {
      const capitulos = biblia.livros[t.livro] || [];
      const nome = t.livro === 'Salmos' ? 'Salmo' : t.livro;
      for (let c = t.de; c <= t.ate; c++) {
        const versos = capitulos[c - 1] || [];
        html += '<section class="leitor-capitulo" data-livro="' + CC.esc(t.livro) + '">'
          + '<h2><small>' + CC.esc(nome) + '</small> ' + c + '</h2>'
          + (versos.some(Boolean)
            ? '<div class="versos">' + versos.map((v, i) => (v
              ? '<p class="leitor-verso" data-v="' + c + ':' + (i + 1) + '"><sup>' + (i + 1) + '</sup>' + CC.esc(v) + ' </p>'
              : '')).join('') + '</div>'
            : '<p class="passo-dica">Este capítulo não veio nesta tradução.</p>')
          + '</section>';
      }
    }
    return html;
  }
  CC.htmlDoTrecho = textoDe;

  // Tocar num versículo marca e abre o que fazer com ele: copiar ou mostrar aos amigos.
  function ligarVersos(el) {
    const barra = el.querySelector('.acoes-verso');
    const limpar = () => {
      el.querySelectorAll('.leitor-verso.escolhido').forEach((v) => v.classList.remove('escolhido'));
      barra.hidden = true;
    };
    el.querySelector('.leitor-texto').onclick = (ev) => {
      const verso = ev.target.closest && ev.target.closest('.leitor-verso');
      if (!verso) return;
      const ja = verso.classList.contains('escolhido');
      limpar();
      if (ja) return;
      verso.classList.add('escolhido');
      const [c, v] = verso.dataset.v.split(':');
      barra.dataset.ref = verso.closest('.leitor-capitulo').dataset.livro + ' ' + c + '.' + v;
      barra.dataset.texto = verso.textContent.replace(/^\d+/, '').trim();
      barra.querySelector('b').textContent = barra.dataset.ref;
      barra.hidden = false;
    };
    barra.querySelector('[data-fechar-verso]').onclick = limpar;
    barra.querySelector('[data-copiar-verso]').onclick = async () => {
      const t = CC.traducao();
      const certo = await CC.copiar('“' + barra.dataset.texto + '” ' + barra.dataset.ref + (t ? ' (' + t.abreviatura + ')' : ''));
      CC.avisar(certo ? 'Versículo copiado' : 'Não consegui copiar');
      limpar();
    };
    const amigos = barra.querySelector('[data-verso-amigos]');
    if (amigos) {
      amigos.onclick = async () => {
        const certo = await CC.compartilharVersiculo(barra.dataset.ref);
        CC.avisar(certo ? 'Seus amigos vão ver no Feed' : 'Não deu para mostrar agora');
        limpar();
      };
    }
  }

  const credito = (b) => '<footer class="leitor-credito">'
    + b.credito.map((linha) => '<p>' + CC.esc(linha) + '</p>').join('')
    + '<p><a href="' + CC.esc(b.licencaUrl) + '" target="_blank" rel="noopener">Licença '
    + CC.esc(b.licenca) + '</a></p></footer>';
  CC.creditoBiblia = credito;

  // ---------- folha Aa ----------
  function folhaAa(el) {
    const atual = CC.traducao();
    const tema = CC.temaGuardado();
    CC.folha('<h2>Leitura</h2>'
      + (BIBLIAS.length > 1 ? '<span class="etiqueta">Tradução</span><div class="opcoes-traducao">'
        + BIBLIAS.map((b) => '<button class="opcao-traducao" data-traducao="' + CC.esc(b.sigla) + '" aria-pressed="'
          + (atual && b.sigla === atual.sigla) + '"><b>' + CC.esc(b.nome.replace(/Biblica® Open |™/g, '')) + '</b>'
          + '<span>' + CC.esc(b.resumo) + '</span></button>').join('') + '</div>' : '')
      + '<span class="etiqueta">Tamanho da letra</span><div class="tamanhos">'
      + LETRAS.map((l) => '<button data-letra="' + l + '" class="t-' + l + '" aria-pressed="' + (l === letra())
        + '" aria-label="Letra ' + l + '">Aa</button>').join('') + '</div>'
      + '<span class="etiqueta">Versículos</span><div class="segmentado" role="group" aria-label="Como mostrar os versículos">'
      + '<button data-modo-leitura="blocos" aria-pressed="' + !corrido() + '">Um por linha</button>'
      + '<button data-modo-leitura="corrido" aria-pressed="' + corrido() + '">Texto corrido</button></div>'
      + '<span class="etiqueta">Tema</span><div class="segmentado" role="group" aria-label="Tema">'
      + [['Sistema', null], ['Claro', false], ['Escuro', true]].map(([rot, v]) =>
        '<button data-tema="' + JSON.stringify(v) + '" aria-pressed="' + (tema === v) + '">' + rot + '</button>').join('')
      + '</div>'
      + '<p class="passo-dica pequena">A Nova Bíblia Viva ajuda a ler bastante. Para estudar um trecho, compare com a Bíblia da sua igreja.</p>'
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
            desenhar();
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
