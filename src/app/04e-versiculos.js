/* Versículos: tudo o que se faz com um versículo, igual em todo lugar. Os dois leitores (o da
   lição e o da Bíblia) e o cartão de versículo (baú, versículo da semana) usam esta mesma
   barra: marcar em quatro cores, escrever uma nota, mostrar no Juntos (aos amigos, dentro do
   app), copiar e compartilhar como imagem de story (fora do app, 01d-story.js).

   Onde cada coisa fica guardada, no estado que já vai para o servidor:
   - marca: E.marcas["João 3:16"] = { cor, em }, um versículo por chave (02-estado.js);
   - nota:  E.notas[id] = { versos: ["João 3.16-18", ...], tipo, texto, tags, ... } (02-estado.js),
            sempre privada; o editor mora aqui e a lista em Minhas anotações (07g-anotacoes.js);
   - Juntos: a novidade "versiculo" do Feed, só a referência (08-amigos.js). */
(function (CC) {
  'use strict';

  const CORES = [[1, 'amarelo'], [2, 'verde'], [3, 'azul'], [4, 'rosa']];
  // espaço inseparável entre número e livro e entre livro e capítulo, só na tela
  const nb = (t) => String(t).replace(/(\d) (?=\p{L})/gu, '$1\u00a0').replace(/(\p{L}) (?=\d)/gu, '$1\u00a0')
    .replace(/(\d)-(?=\d)/g, '$1-\u2060');
  const chaveVerso = (livro, cap, v) => livro + ' ' + cap + ':' + v;
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

  const NOMES_COR = ['', 'amarelo', 'verde', 'azul', 'rosa'];
  const sobrepoe = (a, b) => a && b && a.livro === b.livro && a.cap === b.cap && a.de <= b.ate && b.de <= a.ate;
  // As notas cujo trecho principal (o primeiro versículo ligado) cruza este trecho, a mais nova primeiro.
  const notasDoTrecho = (r) => CC.notas().filter((n) => sobrepoe(CC.lerRef(n.versos[0]), r)).sort((a, b) => b.editadaEm - a.editadaEm);

  // "hoje", "ontem", "seg" (nesta semana) ou "3 out" (com o ano, se for de outro ano).
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  CC.quando = (ms) => {
    if (!ms) return '';
    const d = new Date(ms);
    const dia = CC.isoDe(d);
    const hoje = CC.hojeIso();
    if (dia === hoje) return 'hoje';
    if (dia === CC.somaDias(hoje, -1)) return 'ontem';
    if (dia > CC.somaDias(hoje, -7)) return CC.diaDaSemana(dia);
    return d.getDate() + ' ' + MESES[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  };

  // ---------- a barra de ações ----------
  // "Escrever nota" é a ação principal; a prévia da nota mais nova aparece em cima quando já
  // existe. As cores e a bolinha "sem cor" ficam juntas; o único X fecha a barra.
  // escrever: na revisão do dia, o botão principal leva à tela de escrever da lição.
  function barraHtml(ref, { fechar, escrever, rotuloCor } = {}) {
    const r = CC.lerRef(ref);
    const atual = r ? corDoTrecho(r) : 0;
    const notas = r ? notasDoTrecho(r) : [];
    const n = notas[0];
    const qtos = r ? r.ate - r.de + 1 : 1;
    const sub = CC.plural(qtos, 'versículo', 'versículos') + (atual ? ' · marcado em ' + NOMES_COR[atual] : '');
    return '<b class="ref-verso">' + nb(CC.esc(ref)) + (fechar ? '<small>' + sub + '</small>' : '') + '</b>'
      + (n ? '<button class="previa-nota" data-previa-nota>' + CC.ico('caneta')
        + '<span><b>' + (notas.length > 1 ? 'Suas notas (' + notas.length + ')' : 'Sua nota') + ' · ' + CC.quando(n.editadaEm) + '</b>'
        + '<span class="resumo">' + CC.esc(n.texto.slice(0, 160)) + '</span></span></button>' : '')
      + (rotuloCor ? '<span class="rotulo-cores" aria-hidden="true">Marcar com cor</span>' : '')
      + '<div class="cores-marca" role="group" aria-label="Marcar com cor">'
      + CORES.map(([c, nome]) => '<button class="cor-marca marca-' + c + '" data-cor="' + c + '" aria-pressed="' + (atual === c)
        + '" aria-label="Marcar em ' + nome + '"></button>').join('')
      + (r ? '<button class="cor-marca sem-cor" data-cor="0" aria-pressed="' + !algumMarcado(r) + '" aria-label="Sem cor">' + CC.ico('bloquear') + '</button>' : '')
      + '</div>'
      + (escrever
        ? '<button class="botao escrever-nota" data-escrever>' + CC.ico('caneta') + CC.esc(escrever) + '</button>'
        : '<button class="botao escrever-nota" data-nota-verso>' + CC.ico('caneta') + (n ? 'Escrever outra nota' : 'Escrever nota') + '</button>')
      + '<div class="botoes-verso">'
      + (CC.podeCompartilharComAmigos && CC.podeCompartilharComAmigos()
        ? '<button class="botao pequeno contorno" data-juntos-verso>' + CC.ico('pessoas') + 'Juntos</button>' : '')
      + '<button class="botao pequeno contorno" data-copiar-verso>' + CC.ico('folha') + 'Copiar</button>'
      + '<button class="botao pequeno contorno" data-compartilhar-verso>' + CC.ico('imagem') + 'Story</button>'
      + '</div>'
      + (fechar ? '<button class="botao-icone" data-fechar-verso aria-label="Fechar">' + CC.ico('fechar') + '</button>' : '');
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
    const nota = barra.querySelector('[data-nota-verso]');
    if (nota) nota.onclick = () => abrirEditor({ ref, texto, depois: () => aoMudar('nota') });
    const previa = barra.querySelector('[data-previa-nota]');
    if (previa) {
      previa.onclick = () => {
        const notas = notasDoTrecho(r);
        if (notas.length === 1) abrirEditor({ id: notas[0].id, texto, depois: () => aoMudar('nota') });
        else abrirPrevia(notas, () => aoMudar('nota'));
      };
    }
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
    // Compartilhar: a imagem de story do trecho (01d-story.js) para o Instagram e o WhatsApp,
    // fora do app. "Juntos", acima, é outra coisa: mostra o versículo aos amigos dentro do app.
    const compartilhar = barra.querySelector('[data-compartilhar-verso]');
    if (compartilhar) {
      const t = CC.traducao();
      const pedido = async () => ({ tipo: 'versiculo', ref, texto: await Promise.resolve(texto()).catch(() => ''),
        traducao: t ? t.nome.replace(/Biblica® Open |™/g, '') : '' });
      // A imagem fica pronta pouco depois de a barra aparecer (o Safari só abre o
      // compartilhamento logo depois do toque); quem segue escolhendo versículos não paga nada.
      setTimeout(() => { if (compartilhar.isConnected) pedido().then(CC.story.preparar).catch(() => null); }, 700);
      compartilhar.onclick = async () => {
        compartilhar.disabled = true;
        const r = await CC.imagemStory(await pedido());
        compartilhar.disabled = false;
        // recusado pelo navegador ou cancelado: a barra fica, para tentar de novo
        if (r === 'compartilhado' || r === 'baixado') aoMudar('compartilhar');
      };
    }
  }

  // ---------- o editor de nota (folha alta) ----------
  // Rascunho guardado neste aparelho a cada tecla: fechar sem guardar não perde o que se
  // escreveu, e a folha devolve o rascunho na próxima vez que abrir a mesma nota.
  const CHAVE_RASCUNHO = 'cc.rascunho.nota';
  const lerRascunho = () => { try { return JSON.parse(localStorage.getItem(CHAVE_RASCUNHO)) || null; } catch (e) { return null; } };
  const gravarRascunho = (r) => { try { if (r) localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(r)); else localStorage.removeItem(CHAVE_RASCUNHO); } catch (e) { /* segue */ } };
  const TIPOS = [['nota', 'Nota'], ['oracao', 'Oração'], ['estudo', 'Estudo']];
  const AJUDA = {
    nota: 'Para começar: O que diz? · O que significa? · Como vivo isso?',
    oracao: 'Fale com Deus do seu jeito. De outras pessoas, use só o primeiro nome.',
    estudo: 'A primeira linha vira o título. Ligue os versículos que se explicam.',
  };
  // "romanos 5:8" vira "Romanos 5.8", com o nome do livro como está na Bíblia.
  const LIVROS = () => (CC.COLECOES || []).flatMap(([, l]) => l);
  function lerRefDigitada(t) {
    const m = /^\s*(.+?)\s+(\d{1,3})\s*[.:,]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*$/.exec(String(t || ''));
    if (!m) return null;
    const livro = LIVROS().find((l) => CC.semAcento(l).replace(/\s/g, '') === CC.semAcento(m[1]).replace(/\s/g, ''));
    return livro ? (CC.lerRef(CC.escreverRef(livro, Number(m[2]), Number(m[3]), Number(m[4] || m[3]))) && CC.escreverRef(livro, Number(m[2]), Number(m[3]), Number(m[4] || m[3]))) : null;
  }
  const todasAsTags = () => [...new Set(CC.notas().flatMap((n) => n.tags))].sort();

  // { id } edita; { ref } abre nota nova no trecho; sem os dois, nota livre (Estudo).
  function abrirEditor({ id, ref, texto, tipo, depois } = {}) {
    const existente = id ? CC.nota(id) : null;
    const chave = id || 'novo:' + (ref || '');
    const r0 = ref && CC.lerRef(ref);
    const inicio = existente || { texto: '', tipo: tipo || (ref ? 'nota' : 'estudo'), tags: [], versos: ref ? [ref] : [], cor: r0 ? corDoTrecho(r0) : 0 };
    const campos = (x) => JSON.stringify([x.texto, x.tipo, x.tags, x.versos, x.cor]);
    const rasc = lerRascunho();
    const recuperou = rasc && rasc.chave === chave && campos(rasc) !== campos(inicio);
    const st = JSON.parse(JSON.stringify(recuperou ? rasc : inicio));

    // os versículos ligados e as tags: a mesma lista de chips, com um formulário para pôr mais
    const chips = (k) => st[k].map((v, i) => '<span class="chip-nota">' + (k === 'versos' && !i ? CC.ico('livro') : '') + (k === 'tags' ? '#' : '') + nb(CC.esc(v))
      + (k === 'tags' || i || !ref ? '<button class="tirar" data-tirar="' + k + '" data-i="' + i + '" aria-label="Tirar ' + CC.esc(v) + '">' + CC.ico('fechar') + '</button>' : '') + '</span>').join('');
    const lista = (k, botao, rotulo, exemplo, extra) => '<div class="chips-nota"><span data-chips="' + k + '">' + chips(k) + '</span>'
      + '<button class="chip-nota mais" data-mais="' + k + '" aria-expanded="false">' + CC.ico('mais-sinal') + botao + '</button></div>'
      + '<form class="por-nota" data-form="' + k + '" hidden><input aria-label="' + rotulo + '" placeholder="' + exemplo + '" maxlength="40" autocomplete="off" enterkeyhint="done"' + extra
      + '><button class="botao pequeno contorno">' + (k === 'tags' ? 'Pôr' : 'Ligar') + '</button></form>';
    const corHtml = () => CORES.concat([[0, 'sem cor']]).map(([c, nome]) => '<button class="cor-marca ' + (c ? 'marca-' + c : 'sem-cor') + '" data-cor-nota="' + c
      + '" aria-pressed="' + (st.cor === c) + '" aria-label="' + (c ? 'Cor ' : '') + nome + '">' + (c ? '' : CC.ico('bloquear')) + '</button>').join('');

    const { folha, fechar } = CC.folha('<div class="cabeca-editor">'
      + '<button class="botao plano" data-cancelar>Cancelar</button>'
      + '<h2>' + (existente ? 'Editar nota' : 'Nova nota') + '</h2>'
      + '<button class="botao pequeno" data-guardar>Guardar</button></div>'
      + lista('versos', 'Ligar versículo', 'Versículo para ligar', 'Ex.: Romanos 5.8', '')
      + '<blockquote class="trecho-editor" hidden><span></span>'
      + '<button class="ver-trecho" data-ver-trecho aria-expanded="false">Ver o trecho todo</button></blockquote>'
      + '<div class="segmentado tipo-nota" role="group" aria-label="Tipo">'
      + TIPOS.map(([t, nome]) => '<button data-tipo="' + t + '" aria-pressed="' + (st.tipo === t) + '">' + nome + '</button>').join('') + '</div>'
      + '<label class="so-leitor" for="campo-nota">Sua nota</label>'
      + '<textarea id="campo-nota" class="campo-nota" rows="6" maxlength="5000" autocapitalize="sentences">' + CC.esc(st.texto) + '</textarea>'
      + '<p class="ajuda-nota" data-ajuda>' + AJUDA[st.tipo] + '</p>'
      + '<p class="rotulo-editor">Cor</p><div class="cores-marca" role="group" aria-label="Cor da nota" data-cores>' + corHtml() + '</div>'
      + '<p class="rotulo-editor">Tags</p>' + lista('tags', 'tag', 'Nova tag', 'Ex.: graça', ' list="tags-usadas"')
      + '<datalist id="tags-usadas">' + todasAsTags().map((t) => '<option value="' + CC.esc(t) + '">').join('') + '</datalist>'
      + CC.avisoPrivado()
      + (existente ? '<button class="botao plano perigo" data-apagar>' + CC.ico('lixeira') + 'Apagar nota</button>' : '')
      + '<p class="so-leitor" role="status" data-vivo></p>',
    { rotulo: existente ? 'Editar nota' : 'Nova nota', classe: 'folha-editor', rolavel: true });

    CC.ligarAvisoPrivado(folha);
    const $ = (sel) => folha.querySelector(sel);
    const campo = $('#campo-nota');
    const guardarRascunho = () => {
      st.texto = campo.value;
      gravarRascunho(campos(st) !== campos(inicio) ? { chave, ...st } : null);
    };
    campo.addEventListener('input', guardarRascunho);
    if (recuperou) CC.avisar('Rascunho recuperado');

    // o trecho do versículo principal, recolhido em duas linhas, na cor da nota
    const trecho = $('.trecho-editor');
    const pintarTrecho = () => {
      const v = st.versos[0];
      trecho.className = 'trecho-editor' + (st.cor ? ' marca-' + st.cor : '');
      if (!v) { trecho.hidden = true; return; }
      Promise.resolve(v === ref && texto ? texto() : CC.textoDoVersiculo(v)).then((t) => {
        if (!t || !trecho.isConnected) return;
        trecho.firstChild.textContent = t;
        trecho.hidden = false;
      }).catch(() => null);
    };
    pintarTrecho();
    $('[data-ver-trecho]').onclick = (ev) => {
      const aberto = trecho.classList.toggle('aberto');
      ev.currentTarget.setAttribute('aria-expanded', aberto);
      ev.currentTarget.textContent = aberto ? 'Recolher o trecho' : 'Ver o trecho todo';
    };
    const mudou = () => {
      for (const k of ['versos', 'tags']) $('[data-chips="' + k + '"]').innerHTML = chips(k);
      $('[data-cores]').innerHTML = corHtml();
      folha.querySelectorAll('[data-tipo]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.tipo === st.tipo));
      $('[data-ajuda]').textContent = AJUDA[st.tipo];
      pintarTrecho();
      guardarRascunho();
    };
    folha.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      if (d.tirar) { st[d.tirar].splice(Number(d.i), 1); mudou(); } else if (d.tipo) { st.tipo = d.tipo; mudou(); } else if (d.corNota) { st.cor = Number(d.corNota); mudou(); } else if (d.mais) {
        const form = $('[data-form="' + d.mais + '"]');
        form.hidden = !form.hidden;
        b.setAttribute('aria-expanded', !form.hidden);
        if (!form.hidden) form.firstChild.focus({ preventScroll: true });
      }
    });
    folha.querySelectorAll('form').forEach((form) => {
      form.onsubmit = (ev) => {
        ev.preventDefault();
        const k = form.dataset.form;
        const entrada = form.firstChild;
        const v = k === 'tags' ? entrada.value.replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, 30) : lerRefDigitada(entrada.value);
        if (!v) { if (k === 'versos') CC.avisar('Escreva assim: Romanos 5.8', { tipo: 'erro' }); return; }
        if (!st[k].some((x) => CC.semAcento(x) === CC.semAcento(v)) && st[k].length < 12) st[k].push(v);
        entrada.value = '';
        if (k === 'versos') form.hidden = true;
        mudou();
        $('[data-vivo]').textContent = v + (k === 'tags' ? ' pronta' : ' ligado');
      };
    });

    const terminar = (aviso) => {
      gravarRascunho(null);
      fechar();
      CC.avisar(aviso);
      if (depois) depois();
    };
    const apagar = () => terminar((CC.apagarNota(id), 'Nota apagada. Fica em Apagadas por ' + CC.DIAS_APAGADAS + ' dias'));
    $('[data-cancelar]').onclick = () => {
      guardarRascunho();
      fechar();
      if (lerRascunho()) CC.avisar('Rascunho guardado neste aparelho');
    };
    $('[data-guardar]').onclick = () => {
      st.texto = campo.value.trim();
      if (!st.texto) {
        if (existente) apagar(); else { campo.focus(); $('[data-vivo]').textContent = 'Escreva alguma coisa antes de guardar'; }
        return;
      }
      const primeira = !CC.notas().length && !CC.notasApagadas().length;
      CC.gravarNota(existente ? id : null, { versos: st.versos, tipo: st.tipo, texto: st.texto, tags: st.tags, cor: st.cor });
      // a cor escolhida aqui também marca o trecho principal
      const principal = CC.lerRef(st.versos[0]);
      if (principal && st.cor !== inicio.cor) CC.marcar(chavesDoTrecho(principal), st.cor);
      terminar(st.tipo === 'oracao' ? 'Oração guardada' : 'Nota guardada');
      if (primeira) dicaPrivada();
    };
    if (existente) $('[data-apagar]').onclick = apagar;
  }

  // ---------- privacidade: a linha do cadeado e a folha "Como guardamos" ----------
  // Sem promessa absoluta (o relatório jurídico pede): diz o que é verdade e como funciona.
  CC.avisoPrivado = () => '<button class="aviso-privado" data-como-guardamos>' + CC.ico('cadeado')
    + '<span>Só você vê. Guardado com criptografia.</span><u>Saiba mais</u></button>';
  CC.comoGuardamos = () => CC.folha('<h2>Como guardamos suas anotações</h2><ul class="lista-privada">'
    + '<li>' + CC.ico('pessoa') + '<span><b>Só você vê no app.</b> Amigos, célula, discipulador e liderança não veem o texto.</span></li>'
    + '<li>' + CC.ico('cadeado') + '<span><b>Guardado com criptografia</b> no nosso servidor, e só a sua conta abre.</span></li>'
    + '<li>' + CC.ico('baixar') + '<span><b>É seu.</b> Baixe uma cópia (que fica fora do app) ou apague quando quiser, em Minhas anotações.</span></li>'
    + '<li>' + CC.ico('folha') + '<span><a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade</a></span></li></ul>'
    + '<div class="acoes"><button class="botao contorno" data-fechar>Entendi</button></div>',
  { rotulo: 'Como guardamos suas anotações', rolavel: true, ligar: (f, fechar) => { f.querySelector('[data-fechar]').onclick = fechar; } });
  CC.ligarAvisoPrivado = (raiz) => raiz.querySelectorAll('[data-como-guardamos]').forEach((b) => { b.onclick = CC.comoGuardamos; });
  // Na primeira nota, uma dica leve (não bloqueia nada e some sozinha) leva à mesma folha.
  function dicaPrivada() {
    try { if (localStorage.getItem('cc.dica.privada')) return; localStorage.setItem('cc.dica.privada', '1'); } catch (e) { return; }
    const el = document.createElement('div');
    el.className = 'dica-privada';
    el.setAttribute('role', 'status');
    el.innerHTML = CC.ico('cadeado') + '<p>Sua primeira nota está guardada. Só você vê, com criptografia.</p>'
      + '<button class="botao-icone" data-dispensar aria-label="Dispensar a dica">' + CC.ico('fechar') + '</button>'
      + '<button class="botao pequeno contorno" data-ver>Como guardamos</button>';
    // depois do aviso "Nota guardada", para os dois não se cobrirem
    setTimeout(() => document.body.appendChild(el), 2600);
    const sair = () => { clearTimeout(t); if (el.isConnected) CC.sair(el, 200); };
    const t = setTimeout(sair, 15000);
    el.querySelector('[data-ver]').onclick = () => { sair(); CC.comoGuardamos(); };
    el.querySelector('[data-dispensar]').onclick = sair;
  }

  // ---------- a prévia das notas de um trecho (a etiqueta do leitor) ----------
  const ROTULO_TIPO = { nota: 'Nota', oracao: 'Oração', estudo: 'Estudo' };
  function abrirPrevia(notas, depois) {
    if (!notas.length) return;
    CC.folha('<h2>' + nb(CC.esc(notas[0].versos[0] || '')) + '</h2>'
      + notas.map((n) => '<div class="previa-item"><p class="linha-tipo"><b>' + ROTULO_TIPO[n.tipo] + '</b> · ' + CC.quando(n.editadaEm) + '</p>'
        + '<p class="texto-previa">' + CC.esc(n.texto) + '</p>'
        + '<button class="botao pequeno contorno" data-editar="' + CC.esc(n.id) + '">' + CC.ico('caneta') + 'Editar</button></div>').join('')
      + '<div class="acoes"><a class="botao plano" href="#/perfil/anotacoes" data-ir-anotacoes>' + CC.ico('caderno') + 'Minhas anotações</a></div>',
    {
      rotulo: CC.plural(notas.length, 'nota', 'notas') + ' neste trecho',
      rolavel: true,
      ligar: (f, fechar) => {
        f.querySelectorAll('[data-editar]').forEach((b) => { b.onclick = () => { fechar(); abrirEditor({ id: b.dataset.editar, depois }); }; });
        f.querySelector('[data-ir-anotacoes]').onclick = () => fechar();
      },
    });
  }

  // ---------- nos leitores ----------
  // Pinta marcas e notas em todos os versículos da tela. A nota leva uma etiqueta (caneta e
  // número) no último versículo do trecho principal; tocar nela abre a prévia.
  function pintar(el) {
    const etiquetas = new Map();
    for (const n of CC.notas()) {
      const r = CC.lerRef(n.versos[0]);
      if (!r) continue;
      const k = chaveVerso(r.livro, r.cap, r.ate);
      etiquetas.set(k, (etiquetas.get(k) || 0) + 1);
    }
    el.querySelectorAll('.leitor-capitulo').forEach((sec) => {
      const livro = sec.dataset.livro;
      sec.querySelectorAll('.leitor-verso').forEach((p) => {
        const [c, v] = p.dataset.v.split(':');
        const k = chaveVerso(livro, c, v);
        const cor = CC.marcaDe(k);
        for (const [n] of CORES) p.classList.toggle('marca-' + n, cor === n);
        const qtas = etiquetas.get(k) || 0;
        let etiqueta = p.querySelector('.etiqueta-nota');
        if (!qtas) { if (etiqueta) etiqueta.remove(); return; }
        if (!etiqueta) { etiqueta = document.createElement('button'); etiqueta.className = 'etiqueta-nota'; p.appendChild(etiqueta); }
        etiqueta.dataset.n = qtas;
        etiqueta.dataset.verso = k;
        etiqueta.setAttribute('aria-label', CC.plural(qtas, 'nota', 'notas') + ' neste versículo. Abrir');
        etiqueta.innerHTML = CC.ico('caneta');
      });
    });
  }
  // As notas cujo trecho principal termina neste versículo ("João 3:17").
  const notasQueTerminamEm = (k) => CC.notas().filter((n) => {
    const r = CC.lerRef(n.versos[0]);
    return r && chaveVerso(r.livro, r.cap, r.ate) === k;
  }).sort((a, b) => b.editadaEm - a.editadaEm);

  let pendente = null; // o versículo para onde Minhas anotações mandou a pessoa

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
      const etiqueta = ev.target.closest && ev.target.closest('.etiqueta-nota');
      if (etiqueta) { abrirPrevia(notasQueTerminamEm(etiqueta.dataset.verso), () => { pintar(el); if (sel) desenhar(); }); return; }
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
  const acoesDoCartao = (ref, opcoes) => (CC.lerRef(ref) ? '<div class="acoes-verso no-cartao">' + barraHtml(ref, opcoes) + '</div>' : '');
  function ligarCartao(raiz, ref, texto, opcoes) {
    const barra = raiz.querySelector('.acoes-verso.no-cartao');
    if (!barra) return;
    const figura = barra.closest('.cartao-versiculo');
    const repintar = () => {
      const r = CC.lerRef(ref);
      const cor = r ? corDoTrecho(r) : 0;
      if (figura) for (const [n] of CORES) figura.classList.toggle('marca-' + n, cor === n);
      barra.innerHTML = barraHtml(ref, opcoes);
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

  CC.versiculos = { CORES, NOMES_COR, notasDoTrecho, chavesDoTrecho, corDoTrecho, ligar, irPara, abrirEditor, abrirPrevia, acoesDoCartao, ligarCartao, marcados, lerRefDigitada };
})(window.CC);
