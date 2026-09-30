/* Versículos: tudo o que se faz com um versículo, igual em todo lugar. Os dois leitores (o da
   lição e o da Bíblia) e o cartão de versículo (baú, versículo da semana) usam esta mesma
   barra: marcar em quatro cores, escrever uma nota, mostrar no Juntos e copiar.

   Onde cada coisa fica guardada, no estado que já vai para o servidor:
   - marca: E.marcas["João 3:16"] = { cor, em }, um versículo por chave (02-estado.js);
   - nota:  E.anotacoes["verso:João 3.16-18"], junto das outras anotações, sempre privada;
   - Juntos: a novidade "versiculo" do Feed, só a referência (08-amigos.js). */
(function (CC) {
  'use strict';

  const CORES = [[1, 'amarelo'], [2, 'verde'], [3, 'azul'], [4, 'rosa']];
  // espaço inseparável entre número e livro e entre livro e capítulo, só na tela
  const nb = (t) => String(t).replace(/(\d) (?=\p{L})/gu, '$1\u00a0').replace(/(\p{L}) (?=\d)/gu, '$1\u00a0')
    .replace(/(\d)-(?=\d)/g, '$1-\u2060');
  const chaveVerso = (livro, cap, v) => livro + ' ' + cap + ':' + v;
  const chaveNota = (ref) => 'verso:' + ref;
  const chavesDoTrecho = (r) => {
    const saida = [];
    for (let v = r.de; v <= r.ate; v++) saida.push(chaveVerso(r.livro, r.cap, v));
    return saida;
  };
  // A cor que o trecho inteiro tem, ou 0 quando está sem marca ou misturado.
  const corDoTrecho = (r) => {
    const cores = new Set(chavesDoTrecho(r).map(CC.marcaDe));
    return cores.size === 1 ? [...cores][0] : 0;
  };
  const algumMarcado = (r) => chavesDoTrecho(r).some((k) => CC.marcaDe(k));

  // Os versículos que têm nota, para o sinalzinho no leitor.
  function versosComNota() {
    const saida = new Set();
    for (const [chave, texto] of Object.entries(CC.estado().anotacoes || {})) {
      if (!chave.startsWith('verso:') || !(texto || '').trim()) continue;
      const r = CC.lerRef(chave.slice(6));
      if (r) chavesDoTrecho(r).forEach((k) => saida.add(k));
    }
    return saida;
  }

  // ---------- a barra de ações ----------
  function barraHtml(ref, { fechar } = {}) {
    const r = CC.lerRef(ref);
    const atual = r ? corDoTrecho(r) : 0;
    const temNota = !!CC.anotacao(chaveNota(ref)).trim();
    return '<b class="ref-verso">' + nb(CC.esc(ref)) + '</b>'
      + '<div class="cores-marca" role="group" aria-label="Marcar">'
      + CORES.map(([n, nome]) => '<button class="cor-marca marca-' + n + '" data-cor="' + n + '" aria-pressed="' + (atual === n)
        + '" aria-label="Marcar em ' + nome + '"></button>').join('')
      + (r && algumMarcado(r) ? '<button class="botao-icone tirar-marca" data-cor="0" aria-label="Tirar a marca">' + CC.ico('fechar') + '</button>' : '')
      + '</div>'
      + '<div class="botoes-verso">'
      + '<button class="botao pequeno contorno" data-nota-verso>' + CC.ico('caneta') + (temNota ? 'Ver nota' : 'Nota') + '</button>'
      + (CC.podeCompartilharComAmigos && CC.podeCompartilharComAmigos()
        ? '<button class="botao pequeno contorno" data-juntos-verso>' + CC.ico('pessoas') + 'Juntos</button>' : '')
      + '<button class="botao pequeno contorno" data-copiar-verso>' + CC.ico('folha') + 'Copiar</button>'
      + '<button class="botao pequeno contorno" data-imagem-verso>' + CC.ico('imagem') + 'Imagem</button>'
      + (fechar ? '<button class="botao-icone" data-fechar-verso aria-label="Desfazer a escolha">' + CC.ico('fechar') + '</button>' : '')
      + '</div>';
  }

  // texto(): o texto do trecho (string ou promessa); aoMudar(o que): marca, nota ou fim.
  function ligarBarra(barra, ref, texto, aoMudar) {
    const r = CC.lerRef(ref);
    barra.querySelectorAll('[data-cor]').forEach((b) => {
      b.onclick = () => {
        if (!r) return;
        const cor = Number(b.dataset.cor);
        CC.marcar(chavesDoTrecho(r), cor && corDoTrecho(r) === cor ? 0 : cor);
        aoMudar('marca');
      };
    });
    barra.querySelector('[data-nota-verso]').onclick = () => abrirNota(ref, texto, () => aoMudar('nota'));
    const juntos = barra.querySelector('[data-juntos-verso]');
    if (juntos) {
      juntos.onclick = async () => {
        juntos.disabled = true;
        const certo = await CC.compartilharVersiculo(ref).catch(() => false);
        CC.avisar(certo ? 'Seus amigos vão ver no Juntos' : 'Não deu para mostrar agora');
        juntos.disabled = false;
        if (certo) aoMudar('juntos');
      };
    }
    barra.querySelector('[data-copiar-verso]').onclick = async () => {
      const t = CC.traducao();
      const corpo = await Promise.resolve(texto()).catch(() => '');
      const certo = await CC.copiar((corpo ? '“' + corpo + '” ' : '') + ref + (t ? ' (' + t.abreviatura + ')' : ''));
      CC.avisar(certo ? 'Versículo copiado' : 'Não consegui copiar');
      aoMudar('copiar');
    };
    const imagem = barra.querySelector('[data-imagem-verso]');
    if (imagem) {
      imagem.onclick = async () => {
        imagem.disabled = true;
        const corpo = await Promise.resolve(texto()).catch(() => '');
        await CC.gerarImagemVersiculo(ref, corpo);
        imagem.disabled = false;
        aoMudar('imagem');
      };
    }
  }

  // ---------- nota ----------
  function abrirNota(ref, texto, depois) {
    const chave = chaveNota(ref);
    const atual = CC.anotacao(chave);
    const { folha } = CC.folha('<h2>' + nb(CC.esc(ref)) + '</h2>'
      + '<blockquote class="trecho-da-nota">…</blockquote>'
      + '<label class="campo-senha"><span>Sua nota</span>'
      + '<textarea data-nota name="nota-do-versiculo" rows="6" maxlength="3000" autocomplete="off" autocapitalize="sentences">'
      + CC.esc(atual) + '</textarea></label>'
      + '<div class="acoes"><button class="botao azul" data-salvar>Guardar nota</button>'
      + (atual.trim() ? '<button class="botao plano perigo" data-apagar>Apagar nota</button>' : '')
      + '<button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Nota em ' + ref,
      rolavel: true,
      ligar: (f, fechar) => {
        const campo = f.querySelector('[data-nota]');
        f.querySelector('[data-fechar]').onclick = fechar;
        f.querySelector('[data-salvar]').onclick = () => {
          CC.gravarAnotacao(chave, campo.value.trim());
          CC.avisar(campo.value.trim() ? 'Nota guardada' : 'Nota apagada');
          fechar();
          depois();
        };
        const apagar = f.querySelector('[data-apagar]');
        if (apagar) {
          apagar.onclick = () => {
            CC.gravarAnotacao(chave, '');
            CC.avisar('Nota apagada');
            fechar();
            depois();
          };
        }
      },
    });
    Promise.resolve(texto ? texto() : CC.textoDoVersiculo(ref)).then((t) => {
      const alvo = folha.querySelector('.trecho-da-nota');
      if (!alvo) return;
      if (t) alvo.textContent = t; else alvo.remove();
    }).catch(() => { const alvo = folha.querySelector('.trecho-da-nota'); if (alvo) alvo.remove(); });
  }

  // ---------- nos leitores ----------
  // Pinta marcas e notas em todos os versículos da tela.
  function pintar(el) {
    const comNota = versosComNota();
    el.querySelectorAll('.leitor-capitulo').forEach((sec) => {
      const livro = sec.dataset.livro;
      sec.querySelectorAll('.leitor-verso').forEach((p) => {
        const [c, v] = p.dataset.v.split(':');
        const k = chaveVerso(livro, c, v);
        const cor = CC.marcaDe(k);
        for (const [n] of CORES) p.classList.toggle('marca-' + n, cor === n);
        p.classList.toggle('com-nota', comNota.has(k));
      });
    });
  }

  let pendente = null; // o versículo para onde "Meus versículos" mandou a pessoa

  // Liga a escolha de versículos num leitor que tenha .leitor-texto e .acoes-verso.
  // Um toque escolhe; tocar noutro do mesmo capítulo estende o trecho até ele; tocar numa
  // ponta do trecho a recolhe; tocar no meio recomeça ali.
  function ligar(el) {
    const texto = el.querySelector('.leitor-texto');
    const barra = el.querySelector('.acoes-verso');
    if (!texto || !barra) return;
    let sel = null;

    const versosDaSel = () => [...texto.querySelectorAll('.leitor-capitulo')]
      .filter((s) => s.dataset.livro === sel.livro)
      .flatMap((s) => [...s.querySelectorAll('.leitor-verso')])
      .filter((p) => {
        const [c, v] = p.dataset.v.split(':').map(Number);
        return c === sel.cap && v >= sel.de && v <= sel.ate;
      });

    const desenhar = () => {
      texto.querySelectorAll('.leitor-verso.escolhido').forEach((p) => p.classList.remove('escolhido'));
      el.classList.toggle('escolhendo', !!sel);
      if (!sel) { barra.hidden = true; barra.innerHTML = ''; return; }
      const versos = versosDaSel();
      versos.forEach((p) => p.classList.add('escolhido'));
      const ref = CC.escreverRef(sel.livro, sel.cap, sel.de, sel.ate);
      barra.innerHTML = barraHtml(ref, { fechar: true });
      barra.hidden = false;
      const corpo = () => versos.map((p) => p.textContent.replace(/^\d+/, '').trim()).join(' ');
      ligarBarra(barra, ref, corpo, (oque) => {
        pintar(el);
        if (oque === 'nota') { desenhar(); return; }
        sel = null;
        desenhar();
      });
      barra.querySelector('[data-fechar-verso]').onclick = () => { sel = null; desenhar(); };
    };

    texto.onclick = (ev) => {
      const p = ev.target.closest && ev.target.closest('.leitor-verso');
      if (!p) return;
      const livro = p.closest('.leitor-capitulo').dataset.livro;
      const [cap, v] = p.dataset.v.split(':').map(Number);
      const max = CC.MAX_TRECHO;
      if (!sel || sel.livro !== livro || sel.cap !== cap) sel = { livro, cap, de: v, ate: v };
      else if (v < sel.de) sel.de = Math.max(v, sel.ate - max + 1);
      else if (v > sel.ate) sel.ate = Math.min(v, sel.de + max - 1);
      else if (sel.de === sel.ate) sel = null;
      else if (v === sel.de) sel.de += 1;
      else if (v === sel.ate) sel.ate -= 1;
      else sel = { livro, cap, de: v, ate: v };
      desenhar();
    };

    pintar(el);

    if (pendente) {
      const alvo = pendente;
      const p = [...texto.querySelectorAll('.leitor-capitulo')].filter((s) => s.dataset.livro === alvo.livro)
        .map((s) => s.querySelector('.leitor-verso[data-v="' + alvo.cap + ':' + alvo.de + '"]')).find(Boolean);
      if (p) {
        pendente = null;
        sel = { ...alvo };
        desenhar();
        requestAnimationFrame(() => {
          p.scrollIntoView({ block: 'center' });
        });
      }
    }
  }

  // Abre o capítulo na Bíblia com o trecho já escolhido.
  function irPara(ref) {
    const r = CC.lerRef(ref);
    if (!r) return;
    pendente = r;
    location.hash = '#/biblia/' + encodeURIComponent(r.livro) + '/' + r.cap;
  }

  // ---------- no cartão de versículo ----------
  // Trecho longo demais para marcar (um capítulo inteiro no estudo da célula) fica sem barra.
  const acoesDoCartao = (ref) => (CC.lerRef(ref) ? '<div class="acoes-verso no-cartao">' + barraHtml(ref) + '</div>' : '');
  function ligarCartao(raiz, ref, texto) {
    const barra = raiz.querySelector('.acoes-verso.no-cartao');
    if (!barra) return;
    const figura = barra.closest('.cartao-versiculo');
    const repintar = () => {
      const r = CC.lerRef(ref);
      const cor = r ? corDoTrecho(r) : 0;
      if (figura) for (const [n] of CORES) figura.classList.toggle('marca-' + n, cor === n);
      barra.innerHTML = barraHtml(ref);
      ligarBarra(barra, ref, () => texto, repintar);
    };
    repintar();
  }

  // Tudo o que a pessoa marcou, juntando versículos seguidos da mesma cor num trecho só.
  function marcados() {
    const lista = CC.marcas().map((m) => {
      const x = /^(.+) (\d+):(\d+)$/.exec(m.chave);
      return x ? { livro: x[1], cap: Number(x[2]), v: Number(x[3]), cor: m.cor, em: m.em } : null;
    }).filter(Boolean).sort((a, b) => (a.livro < b.livro ? -1 : a.livro > b.livro ? 1 : a.cap - b.cap || a.v - b.v));
    const trechos = [];
    for (const m of lista) {
      const t = trechos[trechos.length - 1];
      if (t && t.livro === m.livro && t.cap === m.cap && t.cor === m.cor && t.ate === m.v - 1 && t.ate - t.de + 1 < CC.MAX_TRECHO) {
        t.ate = m.v;
        t.em = Math.max(t.em, m.em);
      } else {
        trechos.push({ livro: m.livro, cap: m.cap, de: m.v, ate: m.v, cor: m.cor, em: m.em });
      }
    }
    return trechos.map((t) => ({ ref: CC.escreverRef(t.livro, t.cap, t.de, t.ate), cor: t.cor, em: t.em }))
      .sort((a, b) => b.em - a.em);
  }

  function comNota() {
    return Object.entries(CC.estado().anotacoes || {})
      .filter(([k, t]) => k.startsWith('verso:') && (t || '').trim())
      .map(([k, t]) => ({ ref: k.slice(6), texto: t.trim() }));
  }

  // ---------- cartão de versículo em imagem ----------
  // Formato de status e stories (1080x1920), no aparelho, com <canvas>: nada sai daqui, nada
  // vai para o servidor. A letra encolhe para caber (mesma lógica do carimbo da ofensiva, só
  // que quebrando o texto na hora, porque o versículo não vem pré-quebrado).
  const CARTAO_LARGURA = 1080;
  const CARTAO_ALTURA = 1920;
  async function desenharCartaoVersiculo(ref, corpo) {
    const t = CC.traducao();
    const nomeTraducao = t ? t.nome.replace(/Biblica® Open |™/g, '') : '';
    const tela = document.createElement('canvas');
    tela.width = CARTAO_LARGURA;
    tela.height = CARTAO_ALTURA;
    const ctx = tela.getContext('2d');

    // As cores da folha do Início (paleta C, a do tema claro): o fundo em sálvia pálida e o
    // versículo num cartão branco, em Literata (a letra do texto bíblico no app), com as
    // aspas no botão redondo preto do Início. Não depende do tema que a pessoa está usando.
    const folha = '#dfe8c1';
    const cartao = '#ffffff';
    const tinta = '#2c2d2b';
    const forte = '#151615';
    const fraco = '#686b66';
    const legenda = '#4f5a36';
    const salvia = '#c8da8c';
    const meio = CARTAO_LARGURA / 2;
    const margem = 72;
    const recuo = 84;
    const larguraTexto = CARTAO_LARGURA - (margem + recuo) * 2;
    const raioAspas = 64;
    ctx.fillStyle = folha;
    ctx.fillRect(0, 0, CARTAO_LARGURA, CARTAO_ALTURA);

    const medir = (t, tamanho) => { ctx.font = '500 ' + tamanho + 'px Literata, Georgia, serif'; return ctx.measureText(t).width; };
    const texto = String(corpo || '').trim() || ref;
    const ajuste = { alturaMax: CARTAO_ALTURA * 0.5, fonteMax: 64, fonteMin: 30, entreLinhas: 1.45, medir };
    const { tamanho, linhas: cheias } = CC.ajustarTextoCartao(texto, { ...ajuste, larguraMax: larguraTexto });
    // Linhas equilibradas, como o text-wrap: balance da tela: a menor largura que mantém o
    // mesmo número de linhas, para a última não ficar com uma palavra sozinha.
    const quebrar = (largura) => CC.ajustarTextoCartao(texto, { ...ajuste, larguraMax: largura, fonteMax: tamanho, fonteMin: tamanho }).linhas;
    let linhas = cheias;
    for (let de = larguraTexto * 0.55, ate = larguraTexto, i = 0; i < 12 && cheias.length > 1; i++) {
      const meioDoIntervalo = (de + ate) / 2;
      const tentativa = quebrar(meioDoIntervalo);
      if (tentativa.length === cheias.length) { linhas = tentativa; ate = meioDoIntervalo; } else de = meioDoIntervalo;
    }
    const alturaBloco = linhas.length * tamanho * 1.45;

    // O cartão cresce com o texto e fica no meio da área acima do nome do app.
    const altura = raioAspas + 56 + alturaBloco + 56 + 44 + (nomeTraducao ? 46 : 0) + 84;
    const topo = Math.max(150, Math.round((CARTAO_ALTURA - 170 - altura) / 2));
    ctx.fillStyle = cartao;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(margem, topo, CARTAO_LARGURA - margem * 2, altura, 64);
    else ctx.rect(margem, topo, CARTAO_LARGURA - margem * 2, altura);
    ctx.fill();

    // As aspas num círculo preto, metade para fora da borda de cima do cartão.
    ctx.fillStyle = forte;
    ctx.beginPath();
    ctx.arc(meio, topo, raioAspas, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = salvia;
    ctx.font = '600 150px Literata, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('“', meio, topo + 50);

    ctx.font = '500 ' + tamanho + 'px Literata, Georgia, serif';
    ctx.fillStyle = tinta;
    let y = topo + raioAspas + 56 + tamanho * 0.725;
    for (const linha of linhas) { ctx.fillText(linha, meio, y); y += tamanho * 1.45; }

    // Referência e tradução, embaixo do texto (a licença da tradução pede o nome dela).
    y = topo + raioAspas + 56 + alturaBloco + 56 + 22;
    ctx.font = '800 44px Manrope, sans-serif';
    ctx.fillStyle = forte;
    ctx.fillText(ref, meio, y);
    if (nomeTraducao) {
      ctx.font = '600 30px Manrope, sans-serif';
      ctx.fillStyle = fraco;
      ctx.fillText(nomeTraducao, meio, y + 54);
    }

    // O nome do app, pequeno, no pé, sobre a folha.
    ctx.font = '700 30px Manrope, sans-serif';
    ctx.fillStyle = legenda;
    ctx.fillText('Geração Eleita', meio, CARTAO_ALTURA - 96);

    return tela;
  }

  CC.gerarImagemVersiculo = async function (ref, corpo) {
    try {
      // As fontes precisam estar prontas antes de desenhar, senão o canvas usa a fonte de
      // sistema e o texto sai diferente do que a pessoa vê no app.
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
        try { await Promise.all([document.fonts.load('500 72px Literata'), document.fonts.load('800 44px Manrope')]); } catch (e) { /* segue com o que tiver */ }
      }
      const tela = await desenharCartaoVersiculo(ref, corpo);
      const blob = await new Promise((resolver) => tela.toBlob(resolver, 'image/png'));
      if (!blob) throw new Error('sem imagem');
      const nomeArquivo = 'versiculo-' + ref.replace(/[^\w]+/g, '-').toLowerCase() + '.png';
      const arquivo = new File([blob], nomeArquivo, { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        try {
          await navigator.share({ files: [arquivo] });
          CC.avisar('Imagem pronta.');
          return true;
        } catch (e) {
          if (e && e.name === 'AbortError') return false;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      CC.avisar('Imagem pronta.');
      return true;
    } catch (e) {
      CC.avisar('Não consegui gerar a imagem agora.');
      return false;
    }
  };

  CC.versiculos = { CORES, chaveNota, chavesDoTrecho, ligar, irPara, abrirNota, acoesDoCartao, ligarCartao, marcados, comNota };
})(window.CC);
