/* Preparar o estudo da célula (À Mesa), em 3 passos: o estudo (colado, escrito com as marcas, a
   leitura da semana ou um trecho), "Confira as partes" e "Para conversar". Só o líder chega aqui
   (a casca em 08b-propositos.js confere euPreparoEstudo). O build junta este arquivo com o leitor
   de marcas (estudo-marcas.js) na peça estudo-preparo, que depende da estudo-celula.
   O rascunho fica neste celular (localStorage, cc.rascunho.estudo.<célula>) a cada mudança.
   O texto bíblico dos cartões vem da Bíblia do app pela referência, na tradução do estudo: o que o
   líder colou de outra tradução fica fora (o servidor relê a fonte e grava só a versão limpa). */
(function (CC) {
  'use strict';

  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-estudo-preparo]')) {
    const s = document.createElement('style');
    s.dataset.estudoPreparo = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  const R = CC.estudoRegras;
  const esc = CC.esc;
  const PONTO = ' · ';
  const SETA = ' \u2192 ';
  // Os tetos de estudos.mjs (o servidor confere de novo): avisar aqui poupa a ida e volta.
  const ESTUDO_MAX = 10000;
  const ESTUDO_BRUTO_MAX = 2 * ESTUDO_MAX;
  const AVISO_LIMITE = 9000;
  const TITULO_MAX = 120;
  const TEXTO_BLOCO_MAX = 1500;
  const BLOCOS_MAX = 80;
  const CARTOES_MAX = 15;
  const PERGUNTAS_MAX = 6;
  const PERGUNTA_MAX = 300;
  const CAMPO_4W_MAX = 300;
  // As mensagens do servidor (estudos.mjs, MENSAGENS), com a maiúscula e o ponto da tela.
  const MSG = {
    vazio: 'Escreva o estudo.',
    titulo: 'Escreva o título na primeira linha, com até 120 caracteres.',
    tamanho: 'O estudo tem no máximo 10.000 caracteres.',
    parte: 'Cada parte do texto tem no máximo 1.500 caracteres.',
    partes: 'O estudo passou de 80 partes. Divida em dois encontros.',
    cartoes: 'O estudo tem no máximo 15 versículos.',
    trecho: 'Escolha um livro e um capítulo, como \u201cRomanos 8\u201d ou \u201cJoão 3.16-18\u201d.',
    perguntas: 'Escolha até 6 perguntas.',
  };
  const semVersiculo = (ref) => 'Não achamos ' + ref + ' na Bíblia do app. Confira a referência.';
  const NOME_TRADUCAO = { nbv: 'NBV', blivre: 'Bíblia Livre' };
  const nomeDa = (sigla) => NOME_TRADUCAO[sigla] || ((CC.traducao(sigla) || {}).abreviatura) || 'NBV';
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  let capitulosMemo = null;
  const capitulos = () => capitulosMemo || (capitulosMemo = CC.capitulosDoPlano(CC.D.plano));
  // A mesma limpeza do leitor de marcas: as linhas (.l) dos blocos contam a partir daqui.
  const normalizar = (t) => String(t == null ? '' : t).replace(/\r\n?|[\u2028\u2029]/g, '\n').replace(/^(?:[ \t\u00a0]*\n)+/, '').replace(/\s+$/, '');

  // ---------- o rascunho neste celular ----------
  const chave = (id) => 'cc.rascunho.estudo.' + id;
  function lerRascunho(id) {
    try {
      const r = JSON.parse(localStorage.getItem(chave(id)) || 'null');
      return r && r.v === 1 ? r : null;
    } catch (e) { return null; }
  }
  const gravarRascunho = (id, st) => { try { localStorage.setItem(chave(id), JSON.stringify(Object.assign({}, st, { em: new Date().toISOString() }))); } catch (e) { /* segue */ } };
  const apagarRascunho = (id) => { try { localStorage.removeItem(chave(id)); } catch (e) { /* segue */ } };

  // Um rascunho de outro estudo (o estudo mudou em outro aparelho) não serve mais.
  function estadoInicial(p) {
    const e = p.estudo;
    const base = e ? e.id : '';
    const salvo = lerRascunho(p.id);
    if (salvo && (salvo.base || '') === base) return salvo;
    const st = {
      v: 1, base, tipo: 'blocos', passo: 1, fonte: '', palavra: '', trecho: { livro: 'Gênesis', cap: '1', vers: '' }, traducao: 'nbv',
      opcoes: true, modo: 'colar', colado: false, coladoWord: false, recusadas: [], perguntas: null, chavePerguntas: '', salvas: null, ws: null,
    };
    if (!e) return st;
    const r = e.tipo === 'trecho' ? CC.lerRefLivre(e.ref) : null;
    return Object.assign(st, {
      tipo: e.tipo === 'livre' ? 'blocos' : e.tipo,
      fonte: e.tipo === 'blocos' ? e.fonte || '' : e.tipo === 'livre' ? e.texto || '' : '',
      palavra: e.tipo === 'semana' || e.tipo === 'trecho' ? e.texto || '' : '',
      trecho: r ? { livro: r.livro, cap: String(r.cap), vers: r.de ? r.de + (r.ate && r.ate !== r.de ? '-' + r.ate : '') : '' } : st.trecho,
      traducao: e.traducao || 'nbv', opcoes: false, modo: 'escrever', salvas: (e.perguntas || []).slice(),
    });
  }

  // ---------- colar do Word: o negrito vira *asteriscos*, o resto vira texto ----------
  // O HTML é lido com DOMParser (nada dele roda). Cada bloco (parágrafo, item, linha de tabela)
  // vira uma linha; b, strong ou font-weight de 600 para cima vira *negrito*, linha a linha.
  const BLOCO = /^(P|DIV|LI|H[1-6]|TR|UL|OL|TABLE|BLOCKQUOTE|SECTION|ARTICLE|HEADER|FOOTER|PRE)$/;
  function emNegrito(el) {
    const peso = el.style && el.style.fontWeight;
    if (peso) return peso === 'bold' || peso === 'bolder' || Number(peso) >= 600;
    return el.tagName === 'B' || el.tagName === 'STRONG';
  }
  function textoDoHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const andar = (no, dentroDeNegrito) => {
      if (no.nodeType === 3) return no.nodeValue.replace(/\s+/g, ' ');
      if (no.nodeType !== 1 || /^(SCRIPT|STYLE|HEAD|TITLE|META|LINK|TEMPLATE)$/.test(no.tagName)) return '';
      if (no.tagName === 'BR') return '\n';
      const negrito = !dentroDeNegrito && emNegrito(no);
      let dentro = [...no.childNodes].map((c) => andar(c, dentroDeNegrito || negrito)).join('');
      if (negrito) dentro = dentro.split('\n').map((l) => { const m = /^(\s*)(.*?)(\s*)$/.exec(l); return m[2] ? m[1] + '*' + m[2] + '*' + m[3] : l; }).join('\n');
      return BLOCO.test(no.tagName) ? '\n' + dentro + '\n' : dentro;
    };
    return andar(doc.body || doc.documentElement, false).replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{2,}/g, '\n').trim();
  }

  // ---------- a tela ----------
  let geracao = 0;
  function tela(raiz, p, apoio) {
    const meu = ++geracao;
    const vivo = () => meu === geracao && raiz.isConnected && /\/preparar$/.test(location.hash);
    const st = estadoInicial(p);
    const guardar = () => gravarRascunho(p.id, st);
    const sem = () => R.semana(p.semanaAte);
    const refDoTrecho = () => {
      const v = String(st.trecho.vers || '').replace(/\s+/g, '').replace(/[\u2013\u2014]/g, '-');
      return st.trecho.livro + ' ' + String(st.trecho.cap || '').trim() + (v ? '.' + v : '');
    };
    const bibliaDe = (sigla) => {
      const b = CC.traducao(sigla);
      return b && CC.carregarBiblia && (!CC.appServido || CC.appServido()) ? CC.carregarBiblia(b).catch(() => null) : Promise.resolve(null);
    };
    const contar = (biblia) => (biblia ? (livro, cap) => ((biblia.livros[livro] || [])[cap - 1] || []).length : null);
    const rolarAoTopo = () => { if (CC.rolarPara) CC.rolarPara(0); else scrollTo(0, 0); };

    // A moldura de cada passo: voltar, título, as três barrinhas e "Passo N de 3".
    function moldura(n, titulo, nome, voltarPara, painel) {
      raiz.innerHTML = '<div class="folha-juntos"><div class="cabeca-centro mesa-cabeca"><button class="voltar" data-voltar aria-label="Voltar para ' + esc(voltarPara) + '">' + CC.ico('voltar') + '</button>'
        + '<h1>' + esc(titulo) + '</h1><span class="vao"></span></div>'
        + '<div class="mesa-passos" aria-hidden="true">' + [1, 2, 3].map((k) => '<i' + (k <= n ? ' class="feito"' : '') + '></i>').join('') + '</div>'
        + '<p class="mesa-passo"><b>Passo ' + n + ' de 3</b>' + PONTO + esc(nome) + '</p></div>'
        + '<div class="painel-celula mesa-preparo" data-passo="' + n + '" data-celula="' + esc(p.id) + '">' + painel + '</div>';
      raiz.querySelector('[data-voltar]').onclick = () => (n === 1 ? sair() : irPara(n - 1));
      return raiz.querySelector('.mesa-preparo');
    }
    function irPara(n) {
      st.passo = n;
      guardar();
      rolarAoTopo();
      desenhar();
    }
    function desenhar() {
      if (st.passo === 2) passo2();
      else if (st.passo === 3) passo3();
      else passo1();
    }
    const temConteudo = () => !!(String(st.fonte || '').trim() || String(st.palavra || '').trim() || st.passo > 1);
    async function sair() {
      if (temConteudo() && await CC.confirmar({
        titulo: 'Sair do preparo?', texto: 'O rascunho fica guardado neste celular. Quando voltar, você continua de onde parou.',
        acao: 'Continuar preparando', cancelar: 'Sair',
      })) return;
      CC.substituirRota(apoio.endereco(p.id, 'estudo'));
    }
    const mostrarErro = (painel, mensagens) => {
      const el = painel.querySelector('[data-erro]');
      if (!el) return;
      el.innerHTML = (mensagens || []).map((m) => '<p class="erro-proposito">' + esc(m) + '</p>').join('');
      el.hidden = !(mensagens || []).length;
    };

    // ---------- passo 1: o estudo ----------
    const legendaCompleta = '<span>Entre asteriscos: negrito. Veio assim do Word, e assim também chega no WhatsApp.</span>'
      + '<span>Para um versículo, basta a referência numa linha, como Efésios 6:12. Na próxima tela você confere cada cartão.</span>'
      + '<span>As perguntas para conversar ficam no passo 3.</span>';
    const legendaRascunho = '<span>Rascunho guardado neste celular. Se a tela fechar, o texto continua aqui.</span>';
    const MARCAS = [
      ['topico', '<span class="g">1.</span>', 'Tópico', 'Escreve 1. no começo da linha'],
      ['seta', CC.ico('avancar'), 'Seta', 'Escreve uma seta onde está o cursor'],
      ['frase', '<span class="g">&gt;</span>', 'Frase de alguém', 'Escreve > no começo da linha'],
      ['guardar', CC.ico('marcador'), 'Para guardar', 'Escreve Para guardar: no começo da linha'],
    ];
    function escolhaHtml() {
      if (st.colado) {
        return '<div class="mesa-escolhido">' + CC.ico('caderno') + '<span><b>Estudo colado</b><small>'
          + (st.coladoWord ? 'Do Word, com o negrito em asteriscos.' : 'Do Word ou do WhatsApp. O app separa as partes.') + '</small></span>'
          + '<button type="button" class="botao pequeno contorno" data-trocar>Trocar</button></div>';
      }
      if (!st.opcoes) return '';
      const opcao = (modo, ico, titulo, texto) => '<button type="button" class="mesa-opcao" role="radio" aria-checked="' + (st.modo === modo) + '" data-modo="' + modo + '">'
        + CC.ico(ico) + '<span><b>' + titulo + '</b><small>' + texto + '</small></span><span class="marca-opcao">' + (st.modo === modo ? CC.ico('certo') : '') + '</span></button>';
      return '<div class="mesa-opcoes" role="radiogroup" aria-label="Como você vai escrever">'
        + opcao('colar', 'caderno', 'Colar um estudo pronto', 'Do Word ou do WhatsApp. O app separa as partes.')
        + opcao('escrever', 'caneta', 'Escrever aqui', 'Começar em branco, com as marcas.') + '</div>';
    }
    const campoPalavra = () => '<label class="campo-senha"><span>Sua palavra para a célula (opcional)</span>'
      + '<textarea data-palavra name="palavra-do-lider" rows="5" maxlength="' + ESTUDO_MAX + '" autocomplete="off"></textarea></label>';

    function passo1() {
      const semana = sem();
      let corpo = '';
      if (st.tipo === 'blocos') {
        corpo = '<div class="mesa-escolha" data-escolha>' + escolhaHtml() + '</div>'
          + '<div class="mesa-rotulo"><b id="rotulo-estudo">O estudo</b></div>'
          + '<textarea class="mesa-campo" data-fonte aria-labelledby="rotulo-estudo" rows="2" autocomplete="off" spellcheck="true"></textarea>'
          + '<p class="mesa-limite" data-limite role="status" hidden></p>'
          + '<div class="mesa-legenda" data-legenda></div>'
          + '<div class="mesa-barra-marcas" role="toolbar" aria-label="Marcas do estudo" data-marcas hidden><p>Toque numa linha do texto e escolha o que ela é.</p><div class="grade">'
          + MARCAS.map(([k, g, r, dica]) => '<button type="button" class="mesa-marca" data-marca="' + k + '" aria-label="' + esc(r + '. ' + dica) + '">' + g + r + '</button>').join('') + '</div></div>';
      } else if (st.tipo === 'semana') {
        corpo = '<p class="passo-dica pequena">O app monta o roteiro com a leitura dos dias ' + semana.de + ' a ' + semana.ate
          + ' do plano (até onde você leu), as perguntas das reflexões desses dias e um começo de oração.</p>' + campoPalavra();
      } else {
        corpo = '<div class="escolha-trecho"><label class="campo-senha"><span>Livro</span><select data-livro>'
          + CC.LIVROS.map(([l]) => '<option' + (l === st.trecho.livro ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></label>'
          + '<label class="campo-senha"><span>Capítulo</span><input data-cap type="number" inputmode="numeric" min="1" max="150" autocomplete="off"></label>'
          + '<label class="campo-senha"><span>Versículos (opcional)</span><input data-vers inputmode="numeric" placeholder="Ex.: 16-18" autocomplete="off"></label>'
          + '<p class="passo-dica pequena">A conversa segue o método OIA: observação, interpretação e aplicação.</p></div>' + campoPalavra();
      }
      const painel = moldura(1, 'Preparar o estudo', 'O estudo', p.titulo, '<div class="segmentado" role="group" aria-label="Como vai ser a Palavra" data-tipos' + (st.tipo === 'blocos' && st.colado ? ' hidden' : '') + '>'
        + [['semana', 'Leitura da semana'], ['trecho', 'Um trecho'], ['blocos', 'Eu escrevo']].map(([k, r]) => '<button type="button" data-tipo="' + k + '" aria-pressed="' + (st.tipo === k) + '">' + r + '</button>').join('') + '</div>'
        + corpo
        + '<div data-erro role="alert" hidden></div>'
        + '<div class="acoes"><button class="botao" data-ver>Ver as partes' + CC.ico('avancar') + '</button>'
        + '<button class="botao plano" data-cancelar>Cancelar</button>'
        + (p.estudo ? '<button class="botao plano perigo" data-tirar>Tirar o estudo</button>' : '') + '</div>');
      const q = (s) => painel.querySelector(s);
      painel.querySelectorAll('[data-tipo]').forEach((b) => {
        b.onclick = () => { if (st.tipo !== b.dataset.tipo) { st.tipo = b.dataset.tipo; guardar(); passo1(); } };
      });
      q('[data-cancelar]').onclick = sair;
      const tirar = q('[data-tirar]');
      if (tirar) tirar.onclick = async () => {
        if (!await CC.confirmar({ titulo: 'Tirar o estudo?', texto: 'A célula volta a ver que o estudo ainda não foi preparado.', acao: 'Tirar', perigo: true })) return;
        try {
          await CC.api('api/celula', { acao: 'estudo', id: p.id, estudo: '' });
        } catch (e) { mostrarErro(painel, [e.message]); return; }
        apagarRascunho(p.id);
        await apoio.carregar();
        CC.substituirRota(apoio.endereco(p.id, 'estudo'));
        CC.avisar('Estudo tirado', { tipo: 'certo' });
      };
      const ver = q('[data-ver]');
      ver.onclick = () => irPara(2);
      const palavra = q('[data-palavra]');
      if (palavra) {
        palavra.value = st.palavra || '';
        palavra.oninput = () => { st.palavra = palavra.value; guardar(); };
      }
      if (st.tipo === 'trecho') {
        const livro = q('[data-livro]');
        const cap = q('[data-cap]');
        const vers = q('[data-vers]');
        cap.value = st.trecho.cap || '';
        vers.value = st.trecho.vers || '';
        const mudou = () => { st.trecho = { livro: livro.value, cap: cap.value, vers: vers.value }; guardar(); };
        livro.onchange = mudou;
        cap.oninput = mudou;
        vers.oninput = mudou;
      }
      if (st.tipo === 'blocos') ligarCampo(painel, ver);
    }

    function ligarCampo(painel, ver) {
      const q = (s) => painel.querySelector(s);
      const campo = q('[data-fonte]');
      const escolha = q('[data-escolha]');
      const legenda = q('[data-legenda]');
      const limite = q('[data-limite]');
      const barra = q('[data-marcas]');
      campo.value = st.fonte || '';
      const ajustarAltura = () => { campo.style.height = 'auto'; campo.style.height = Math.max(120, campo.scrollHeight + 4) + 'px'; };
      const pintarEscolha = () => {
        escolha.innerHTML = escolhaHtml();
        escolha.querySelectorAll('[data-modo]').forEach((b) => {
          b.onclick = () => { st.modo = b.dataset.modo; guardar(); pintarEscolha(); if (st.modo === 'escrever') campo.focus(); };
        });
        const trocar = escolha.querySelector('[data-trocar]');
        if (trocar) trocar.onclick = () => { st.colado = false; st.opcoes = true; guardar(); pintarEscolha(); };
        // depois de colar, a escolha recolhe numa linha e o seletor de tipo sai junto (mock, quadro 4)
        const tipos = painel.querySelector('[data-tipos]');
        if (tipos) tipos.hidden = !!st.colado;
        campo.placeholder = st.modo === 'escrever' ? 'Escreva o título na primeira linha.' : 'Toque e segure aqui para colar o seu estudo.';
      };
      let medida = 0;
      const medir = () => {
        clearTimeout(medida);
        medida = setTimeout(() => {
          if (!campo.isConnected) return;
          // o teto vale para o texto limpo, sem as citações de outra tradução (como no servidor);
          // o texto bruto acima do dobro nem passa pelo leitor
          const n = st.fonte.length > ESTUDO_BRUTO_MAX ? st.fonte.length : CC.lerEstudo(st.fonte, { capitulos: capitulos() }).fonte.length;
          limite.hidden = n < AVISO_LIMITE;
          limite.textContent = n > ESTUDO_MAX ? MSG.tamanho : 'Faltam ' + (ESTUDO_MAX - n).toLocaleString('pt-BR') + ' caracteres para o limite do estudo';
        }, 250);
      };
      const aoMudar = () => {
        st.fonte = campo.value;
        guardar();
        const tem = !!st.fonte.trim();
        legenda.innerHTML = (tem ? legendaCompleta : '') + legendaRascunho;
        ver.disabled = !tem;
        ajustarAltura();
        medir();
      };
      pintarEscolha();
      aoMudar();
      campo.addEventListener('input', aoMudar);
      campo.addEventListener('paste', (ev) => {
        const dados = ev.clipboardData;
        const vazio = !campo.value.trim();
        const html = dados ? dados.getData('text/html') : '';
        const texto = html ? textoDoHtml(html) : '';
        if (texto) {
          ev.preventDefault();
          campo.setRangeText(texto, campo.selectionStart, campo.selectionEnd, 'end');
        }
        if (vazio && st.modo === 'colar') {
          st.colado = true;
          st.coladoWord = !!texto;
          st.opcoes = false;
          pintarEscolha();
        }
        setTimeout(aoMudar, 0);
      });
      // A barra de marcas: só com o campo em foco, presa logo acima do teclado (visualViewport).
      const vv = window.visualViewport;
      const posicionar = () => {
        if (!barra.isConnected) { if (vv) { vv.removeEventListener('resize', posicionar); vv.removeEventListener('scroll', posicionar); } return; }
        barra.style.bottom = (vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0) + 'px';
      };
      if (vv) { vv.addEventListener('resize', posicionar); vv.addEventListener('scroll', posicionar); }
      campo.addEventListener('focus', () => { barra.hidden = false; posicionar(); });
      campo.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== campo && barra.isConnected) barra.hidden = true; }, 150));
      // tocar na barra não tira o foco do campo (o teclado continua aberto)
      barra.addEventListener('mousedown', (ev) => ev.preventDefault());
      barra.querySelectorAll('[data-marca]').forEach((b) => {
        b.onclick = () => {
          marcar(campo, b.dataset.marca);
          aoMudar();
        };
      });
    }

    // Cada marca escreve o sinal no texto: no começo da linha do cursor, ou no cursor (a seta).
    function marcar(campo, tipo) {
      const v = campo.value;
      const pos = campo.selectionStart;
      const ini = v.lastIndexOf('\n', pos - 1) + 1;
      const fim = v.indexOf('\n', ini) < 0 ? v.length : v.indexOf('\n', ini);
      const linha = v.slice(ini, fim);
      let novo = v;
      let cursor = pos;
      const noComeco = (sinal, ja) => {
        if (ja.test(linha)) return;
        novo = v.slice(0, ini) + sinal + v.slice(ini);
        cursor = pos + sinal.length;
      };
      if (tipo === 'seta') {
        novo = v.slice(0, pos) + SETA + v.slice(campo.selectionEnd);
        cursor = pos + SETA.length;
      } else if (tipo === 'topico') {
        let n = 0;
        for (const l of v.slice(0, ini).split('\n')) { const m = /^\s*\**\s*(\d{1,2})[.)]\s/.exec(l); if (m) n = Math.max(n, Number(m[1])); }
        noComeco((n + 1) + '. ', /^\s*\**\s*\d{1,2}[.)]\s/);
      } else if (tipo === 'frase') noComeco('> ', /^\s*>/);
      else if (tipo === 'guardar') noComeco('Para guardar: ', /^\s*\**\s*para guardar\s*\**\s*:/i);
      campo.value = novo;
      campo.focus();
      campo.setSelectionRange(cursor, cursor);
    }

    // ---------- passo 2: confira as partes ----------
    async function passo2() {
      const painel = moldura(2, 'Confira as partes', 'Cada parte do estudo', 'O estudo', CC.esqueleto('texto'));
      const biblia = await bibliaDe(st.traducao);
      if (!vivo() || st.passo !== 2) return;
      if (st.tipo === 'blocos') await previaDoEstudo(painel, biblia);
      else await previaDoRoteiro(painel, biblia);
      if (CC.inseparavel && painel.isConnected) CC.inseparavel(painel);
    }
    const cartao = (ref, texto) => CC.cartaoVersiculo(ref, texto || '', { semAcoes: true, sigla: st.traducao });
    const blocoTraducao = (n) => {
      const nome = nomeDa(st.traducao);
      return '<div class="mesa-bloco"><span class="etiqueta">Tradução do estudo</span>'
        + '<div class="segmentado" role="group" aria-label="Tradução do estudo">' + (CC.biblias ? CC.biblias() : []).map((b) => '<button type="button" data-traducao="' + esc(b.sigla) + '" aria-pressed="' + (b.sigla === st.traducao) + '">' + esc(nomeDa(b.sigla)) + '</button>').join('') + '</div>'
        + '<p>A ' + esc(nome) + ' vale para todos, e assim cada um lê as mesmas palavras em voz alta.' + (n ? ' Se trocar, ' + (n === 1 ? 'o cartão muda junto.' : 'os ' + n + ' cartões mudam juntos.') : '') + '</p>'
        + '<p>Se o seu texto usa palavras de outra tradução, confira se combinam com os cartões.</p></div>';
    };
    const ligarTraducao = (painel) => painel.querySelectorAll('[data-traducao]').forEach((b) => {
      b.onclick = () => { if (st.traducao !== b.dataset.traducao) { st.traducao = b.dataset.traducao; guardar(); passo2(); } };
    });
    const acoes2 = '<div data-erro role="alert" hidden></div><div class="acoes"><button class="botao" data-continuar>Continuar' + CC.ico('avancar') + '</button>'
      + '<button class="botao plano" data-voltar-texto>Voltar ao texto</button></div>';

    async function previaDoEstudo(painel, biblia) {
      const r = CC.lerEstudo(st.fonte, { capitulos: capitulos(), versiculos: contar(biblia), semCartao: st.recusadas });
      const refs = r.blocos.filter((b) => b.t === 'versiculo').map((b) => b.ref).concat(r.sugestoes.map((s) => s.ref));
      const textos = await CC.estudoCelula.textosDe(refs, st.traducao);
      if (!vivo() || st.passo !== 2) return;
      const nome = nomeDa(st.traducao);
      const cartoes = r.blocos.filter((b) => b.t === 'versiculo').length;
      const erros = errosDe(r);
      // o que o app encontrou, contado
      const topicos = r.blocos.filter((b) => b.t === 'topico').length;
      const conclusao = r.blocos.some((b) => b.t === 'conclusao');
      const contagem = [
        r.titulo ? '1 título' : '',
        topicos ? plural(topicos, 'tópico', 'tópicos') + (conclusao ? ' e a conclusão' : '') : conclusao ? 'a conclusão' : '',
        cartoes ? plural(cartoes, 'versículo', 'versículos') : '',
        ((n) => (n ? plural(n, 'lista com seta', 'listas com seta') : ''))(r.blocos.filter((b) => b.t === 'seta').length),
        ((n) => (n ? plural(n, 'frase de alguém', 'frases de alguém') : ''))(r.blocos.filter((b) => b.t === 'citacao').length),
        ((n) => (n ? plural(n, 'frase para guardar', 'frases para guardar') : ''))(r.blocos.filter((b) => b.t === 'guardar').length),
        r.perguntas.length ? plural(r.perguntas.length, 'pergunta', 'perguntas') : '',
      ].filter(Boolean);
      // o cartão, com o que havia no texto do líder naquele lugar
      const primeiraTroca = r.trocas[0];
      const cartaoComOrigem = (b, n) => {
        const troca = r.trocas.find((t) => t.bloco === n);
        const origem = troca ? (troca.de ? 'No seu texto: citação da ' + troca.de + '. Agora na ' + nome + '.' : 'No seu texto: citação de outra tradução. Agora na ' + nome + '.')
          : 'No seu texto: só a referência. Agora com o texto da ' + nome + '.';
        const avisos = r.avisos.filter((a) => a.bloco === n).map((a) => (a.tipo === 'sem-versiculo' ? semVersiculo(a.ref)
          : 'Mostramos os 10 primeiros versículos de ' + a.ref + '. Para o capítulo inteiro, use Abrir na Bíblia, ou divida em dois cartões.'));
        return '<div class="mesa-com-origem"' + (troca && troca === primeiraTroca ? ' id="troca-1"' : '') + '>' + cartao(b.ref, textos.get(b.ref))
          + '<p class="mesa-origem">' + CC.ico('info') + esc(origem) + '</p>'
          + avisos.map((a) => '<p class="mesa-origem mesa-origem-aviso">' + CC.ico('info') + esc(a) + '</p>').join('') + '</div>';
      };
      const sugestao = (s) => '<div class="mesa-sugestao"><span class="etiqueta">Sugestão do app</span>'
        + '<p>Você citou <b>' + esc(s.ref) + '</b> no meio do texto. Quer mostrar o texto num cartão?</p>' + cartao(s.ref, textos.get(s.ref))
        + '<div class="mesa-sugestao-botoes" role="group" aria-label="Cartão de ' + esc(s.ref) + '">'
        + '<button type="button" class="botao pequeno contorno" data-mostrar="' + s.bloco + '" data-ref="' + esc(s.ref) + '">' + CC.ico('certo') + 'Mostrar o cartão</button>'
        + '<button type="button" class="botao pequeno contorno" data-nao-mostrar="' + esc(s.ref) + '">' + CC.ico('fechar') + 'Não mostrar</button></div></div>';
      // O aviso de uma parte que não é cartão: a referência de um capítulo que não existe, ou o que
      // parece ser o texto de um versículo de outra tradução, que ficou como veio.
      const avisoDaParte = (a) => (a.tipo === 'sem-versiculo' ? semVersiculo(a.ref)
        : a.ref ? 'Esta parte começa com ' + a.ref + ' e pode trazer o texto do versículo em outra tradução. Se trouxer, deixe só a referência: o cartão já mostra o texto da ' + nome + '.'
          : 'Esta parte parece citar a Bíblia em outra tradução. Ponha a referência numa linha só, e o app mostra o texto da ' + nome + ' num cartão.');
      const parteHtml = (n) => {
        const b = r.blocos[n];
        const html = b.t === 'versiculo' ? cartaoComOrigem(b, n) : R.blocoEmHtml(b, { semConclusao: true, semEtiqueta: true })
          + r.avisos.filter((a) => a.bloco === n && (a.tipo === 'citacao' || a.tipo === 'sem-versiculo')).map((a) => '<p class="mesa-origem mesa-origem-aviso">' + CC.ico('info') + esc(avisoDaParte(a)) + '</p>').join('');
        return html + r.sugestoes.filter((s) => s.bloco === n).map(sugestao).join('');
      };
      // As partes: o título, a introdução, cada tópico, a conclusão e cada "Para guardar".
      const partes = [];
      let atual = { rotulo: 'Introdução', itens: [] };
      const fecharParte = () => { if (atual.itens.length) partes.push(atual); };
      r.blocos.forEach((b, n) => {
        if (b.t === 'topico') { fecharParte(); atual = { rotulo: 'Tópico ' + b.n, itens: [n] }; } else if (b.t === 'conclusao') { fecharParte(); atual = { rotulo: 'Conclusão', itens: [n] }; } else if (b.t === 'guardar') { fecharParte(); partes.push({ rotulo: 'Para guardar', itens: [n] }); atual = { rotulo: atual.rotulo, itens: [] }; } else atual.itens.push(n);
      });
      fecharParte();
      if (!r.blocos.some((b) => b.t === 'topico' || b.t === 'conclusao')) partes.forEach((x) => { if (x.rotulo === 'Introdução') x.rotulo = 'O estudo'; });
      const linhasDe = (itens) => [Math.min(...itens.map((n) => r.blocos[n].l[0])), Math.max(...itens.map((n) => r.blocos[n].l[1]))];
      const todas = [{ rotulo: 'Título', linhas: r.linhaTitulo >= 0 ? [r.linhaTitulo, r.linhaTitulo] : [0, -1],
        html: r.titulo && r.titulo.length <= TITULO_MAX ? '<h2 class="mesa-t1">' + esc(r.titulo) + '</h2>' : '<p class="erro-proposito">' + esc(MSG.titulo) + '</p>' }]
        .concat(partes.map((x) => ({ rotulo: x.rotulo, linhas: linhasDe(x.itens), html: x.itens.map(parteHtml).join('') })));
      painel.innerHTML = (r.trocas.length ? '<button type="button" class="mesa-aviso" data-ver-troca>' + CC.ico('info') + '<b>Trocamos o texto citado pelo da Bíblia do app</b>'
        + '<p>' + (r.trocas.length === 1 ? 'Seu estudo trazia 1 citação em outra tradução. Agora ela é um cartão com o texto da ' + esc(nome) + ', palavra por palavra.'
          : 'Seu estudo trazia ' + r.trocas.length + ' citações em outra tradução. Agora cada uma é um cartão com o texto da ' + esc(nome) + ', palavra por palavra.') + '</p>'
        + '<span class="ir">Ver a primeira troca' + CC.ico('direita') + '</span></button>' : '')
        + blocoTraducao(cartoes)
        + (contagem.length ? '<div class="mesa-bloco"><span class="etiqueta">O app encontrou</span><ul class="mesa-resumo">' + contagem.map((c) => '<li>' + esc(c) + '</li>').join('') + '</ul></div>' : '')
        + todas.map((x, k) => '<section class="mesa-parte"><header><span class="etiqueta">' + esc(x.rotulo) + '</span>'
          + '<button type="button" class="botao pequeno contorno" data-mudar-parte="' + k + '" aria-label="Mudar: ' + esc(x.rotulo) + '">' + CC.ico('caneta') + 'Mudar</button></header>'
          + '<div class="mesa-estudo">' + x.html + '</div></section>').join('')
        + acoes2;
      mostrarErro(painel, erros);
      const q = (s) => painel.querySelector(s);
      q('[data-continuar]').disabled = erros.length > 0;
      q('[data-continuar]').onclick = () => irPara(3);
      q('[data-voltar-texto]').onclick = () => irPara(1);
      const verTroca = q('[data-ver-troca]');
      if (verTroca) verTroca.onclick = () => { const alvo = document.getElementById('troca-1'); if (alvo) alvo.scrollIntoView({ block: 'center', behavior: CC.semMovimento && CC.semMovimento() ? 'auto' : 'smooth' }); };
      ligarTraducao(painel);
      const linhas = () => normalizar(st.fonte).split('\n');
      painel.querySelectorAll('[data-mostrar]').forEach((b) => {
        b.onclick = () => {
          const ls = linhas();
          ls.splice(r.blocos[Number(b.dataset.mostrar)].l[1] + 1, 0, b.dataset.ref);
          st.fonte = ls.join('\n');
          guardar();
          passo2();
        };
      });
      painel.querySelectorAll('[data-nao-mostrar]').forEach((b) => {
        b.onclick = () => { st.recusadas = [...new Set((st.recusadas || []).concat(b.dataset.naoMostrar))]; guardar(); passo2(); };
      });
      painel.querySelectorAll('[data-mudar-parte]').forEach((b) => {
        b.onclick = () => mudarParte(todas[Number(b.dataset.mudarParte)]);
      });
    }

    // "Mudar" numa parte: as linhas do texto daquela parte, numa folha; ao terminar, voltam para o
    // lugar delas e o estudo é lido de novo.
    function mudarParte(parte) {
      const ls = normalizar(st.fonte).split('\n');
      const [a, b] = parte.linhas;
      const trecho = b >= a ? ls.slice(a, b + 1).join('\n') : '';
      CC.folha('<h2>Mudar: ' + esc(parte.rotulo) + '</h2>'
        + '<label class="campo-senha"><span>O texto desta parte</span><textarea data-trecho rows="8" autocomplete="off" spellcheck="true"></textarea></label>'
        + '<div class="acoes"><button class="botao" data-pronto>Pronto</button><button class="botao plano" data-fechar>Cancelar</button></div>',
      {
        rotulo: 'Mudar: ' + parte.rotulo,
        rolavel: true,
        ligar: (folha, fechar) => {
          const campo = folha.querySelector('[data-trecho]');
          campo.value = trecho;
          folha.querySelector('[data-fechar]').onclick = fechar;
          folha.querySelector('[data-pronto]').onclick = () => {
            const novas = normalizar(campo.value) ? campo.value.replace(/\r\n?/g, '\n').split('\n') : [];
            if (b >= a) ls.splice(a, b - a + 1, ...novas);
            else ls.splice(a, 0, ...novas);
            st.fonte = ls.join('\n');
            guardar();
            fechar();
            passo2();
          };
        },
      });
    }

    function errosDe(r) {
      const erros = [];
      if (!r.blocos.length) erros.push(MSG.vazio);
      if (!r.titulo || r.titulo.length > TITULO_MAX) erros.push(MSG.titulo);
      if (r.fonte.length > ESTUDO_MAX || st.fonte.length > ESTUDO_BRUTO_MAX) erros.push(MSG.tamanho);
      if (r.blocos.length > BLOCOS_MAX) erros.push(MSG.partes);
      if (r.blocos.some((b) => (b.t === 'seta' ? b.itens.map((x) => x.join(' ')) : [b.texto || '', b.autor || '']).some((t) => t.length > TEXTO_BLOCO_MAX))) erros.push(MSG.parte);
      if (r.blocos.filter((b) => b.t === 'versiculo').length > CARTOES_MAX) erros.push(MSG.cartoes);
      r.avisos.filter((a) => a.tipo === 'sem-versiculo').forEach((a) => erros.push(semVersiculo(a.ref)));
      return erros;
    }

    // Leitura da semana e um trecho: o roteiro montado (o cartão e, na semana, os dias).
    async function previaDoRoteiro(painel, biblia) {
      const erros = [];
      let blocos = [];
      // a palavra como o servidor vai gravar: a citação de outra tradução fica só com a referência
      const palavra = st.palavra && st.palavra.length <= ESTUDO_BRUTO_MAX ? CC.lerEstudo(st.palavra, { capitulos: capitulos(), semTitulo: true }) : { fonte: st.palavra || '', trocas: [] };
      if (palavra.fonte.length > ESTUDO_MAX || String(st.palavra || '').length > ESTUDO_BRUTO_MAX) erros.push(MSG.tamanho);
      if (st.tipo === 'semana') blocos = R.comoBlocos({ tipo: 'semana', texto: palavra.fonte }, sem());
      else {
        const ref = refDoTrecho();
        const r = CC.lerRefLivre(ref, capitulos());
        if (!r) erros.push(MSG.trecho);
        else {
          const c = R.cartaoDe(ref, contar(biblia));
          const total = contar(biblia) ? contar(biblia)(r.livro, r.cap) : 0;
          if (total && (r.de || 1) > total) erros.push(semVersiculo(CC.escreverRef(r.livro, r.cap, r.de, r.ate)));
          blocos = R.comoBlocos({ tipo: 'trecho', texto: palavra.fonte, ref: '' }).concat(c ? [c] : []);
        }
      }
      const refs = blocos.filter((b) => b.t === 'versiculo').map((b) => b.ref);
      const textos = await CC.estudoCelula.textosDe(refs, st.traducao);
      if (!vivo() || st.passo !== 2) return;
      const html = blocos.map((b) => (b.t === 'versiculo'
        ? '<div class="mesa-com-origem">' + cartao(b.ref, textos.get(b.ref)) + (b.escrito ? '<p class="mesa-origem mesa-origem-aviso">' + CC.ico('info')
          + esc('Mostramos os 10 primeiros versículos de ' + b.escrito + '. Para o capítulo inteiro, use Abrir na Bíblia, ou divida em dois cartões.') + '</p>' : '') + '</div>'
        : R.blocoEmHtml(b))).join('');
      const n = palavra.trocas.length;
      painel.innerHTML = (n ? '<div class="mesa-aviso">' + CC.ico('info') + '<b>Tiramos o texto citado da sua palavra</b><p>'
        + (n === 1 ? 'Ela trazia 1 citação em outra tradução. No lugar dela fica só a referência.' : 'Ela trazia ' + n + ' citações em outra tradução. No lugar de cada uma fica só a referência.') + '</p></div>' : '')
        + (st.tipo === 'trecho' ? blocoTraducao(refs.length) : '')
        + (html ? '<section class="mesa-parte"><header><span class="etiqueta">' + (st.tipo === 'semana' ? 'Leitura da semana' : 'Um trecho') + '</span></header><div class="mesa-estudo">' + html + '</div></section>' : '')
        + acoes2;
      mostrarErro(painel, erros);
      painel.querySelector('[data-continuar]').disabled = erros.length > 0;
      painel.querySelector('[data-continuar]').onclick = () => irPara(3);
      painel.querySelector('[data-voltar-texto]').onclick = () => irPara(1);
      ligarTraducao(painel);
    }

    // ---------- passo 3: para conversar ----------
    // As perguntas de cada grupo, com o que a pessoa já marcou ou mudou (guardado no rascunho).
    async function montarPerguntas() {
      let refs = [];
      let doTexto = [];
      const semana = st.tipo === 'semana' ? sem() : null;
      if (st.tipo === 'blocos') {
        const r = CC.lerEstudo(st.fonte, { capitulos: capitulos() });
        refs = r.refs;
        doTexto = r.perguntas.concat(...r.avisos.filter((a) => a.tipo === 'perguntas-demais').map((a) => a.perguntas));
      } else if (st.tipo === 'trecho') {
        const r = CC.lerRefLivre(refDoTrecho(), capitulos());
        refs = r ? [CC.escreverRef(r.livro, r.cap, r.de, r.ate)] : [];
      }
      const chaveAgora = JSON.stringify([st.tipo, refs, doTexto, semana ? semana.ate : 0]);
      if (st.perguntas && st.chavePerguntas === chaveAgora && st.grupos) return;
      let parabola = null;
      const item = st.tipo === 'semana' ? null : R.parabolaDoEstudo(refs, (window.PARABOLAS || {}).itens);
      if (item && item.arquivo) {
        try {
          const d = await fetch(item.arquivo).then((x) => (x.ok ? x.json() : null));
          if (d && Array.isArray(d.perguntas)) parabola = { titulo: item.titulo, ref: item.ref, perguntas: d.perguntas };
        } catch (e) { /* sem rede: o grupo da parábola não aparece */ }
      }
      const grupos = R.gruposDePerguntas({ tipo: st.tipo, perguntas: doTexto, refs }, { plano: CC.D.plano, reflexaoEscrita: CC.reflexaoEscrita, refs, semana, parabola, doTexto });
      const antigas = st.perguntas || [];
      const lista = [];
      grupos.forEach((g, gi) => g.perguntas.forEach((pergunta) => {
        const antes = antigas.find((x) => x.de === pergunta);
        lista.push({ g: gi, de: pergunta, texto: antes ? antes.texto : pergunta, marcada: antes ? antes.marcada : st.salvas ? st.salvas.includes(pergunta) : g.marcadas.includes(pergunta) });
      }));
      antigas.filter((x) => !x.de).forEach((x) => lista.push(Object.assign({}, x, { g: -1 })));
      if (st.salvas) st.salvas.filter((x) => !lista.some((y) => y.texto === x)).forEach((x) => lista.push({ g: -1, de: '', texto: x, marcada: true }));
      let marcadas = 0;
      lista.forEach((x) => { if (x.marcada && ++marcadas > PERGUNTAS_MAX) x.marcada = false; });
      st.salvas = null;
      st.grupos = grupos.map((g) => ({ titulo: g.titulo, subtitulo: g.subtitulo }));
      st.perguntas = lista;
      st.chavePerguntas = chaveAgora;
      guardar();
    }
    const contaPerguntas = () => {
      const n = st.perguntas.filter((x) => x.marcada).length;
      return (n ? plural(n, 'pergunta escolhida', 'perguntas escolhidas') : 'Nenhuma pergunta escolhida') + PONTO + 'até ' + PERGUNTAS_MAX;
    };
    const valorW = (k) => (st.ws ? st.ws[k] : { acolhida: p.estudoAcolhida, adoracao: p.estudoAdoracao, testemunho: p.estudoTestemunho }[k]) || '';
    const sugestaoW = { acolhida: () => R.sugestaoAcolhida(CC.hojeIso()), adoracao: () => R.SUGESTAO_ADORACAO, testemunho: () => R.SUGESTAO_TESTEMUNHO };

    async function passo3() {
      const painel = moldura(3, 'Para conversar', 'As perguntas', 'As partes', CC.esqueleto('lista'));
      await montarPerguntas();
      if (!vivo() || st.passo !== 3) return;
      desenharPerguntas(painel);
    }
    // A caixa de texto cresce com o que está escrito, sem barra de rolagem por dentro.
    const crescer = (campo) => { campo.style.height = 'auto'; campo.style.height = (campo.scrollHeight + 4) + 'px'; };
    function linhaPergunta(x, k) {
      if (x.editando) {
        return '<div class="mesa-pergunta editando" role="group" aria-label="Mudando a pergunta" data-q="' + k + '"><span class="caixa-marcar" aria-hidden="true"></span><div class="campo-editar">'
          + '<textarea class="texto-editar" data-texto-q rows="3" maxlength="' + PERGUNTA_MAX + '" aria-label="A pergunta" autocomplete="off"></textarea>'
          + '<div class="pe-editar"><button type="button" class="botao pequeno" data-pronto-q>Pronto</button><button type="button" class="botao pequeno contorno" data-desfazer-q>Desfazer</button></div></div></div>';
      }
      return '<div class="mesa-pergunta' + (x.marcada ? ' marcada' : '') + '" data-q="' + k + '"><label for="q' + k + '"><input type="checkbox" id="q' + k + '"' + (x.marcada ? ' checked' : '') + '>'
        + '<span class="caixa-marcar" aria-hidden="true">' + (x.marcada ? CC.ico('certo') : '') + '</span><span class="texto">' + esc(x.texto) + '</span></label>'
        + '<button type="button" class="botao pequeno contorno" data-mudar-q="' + k + '" aria-label="Mudar a pergunta">Mudar</button></div>';
    }
    function desenharPerguntas(painel) {
      const ultimo = st.grupos.length - 1;
      const perguntas = (gi) => st.perguntas.map((x, k) => (x.g === gi || (gi === ultimo && x.g === -1) ? linhaPergunta(x, k) : '')).join('');
      painel.innerHTML = '<p class="mesa-nota">' + CC.ico('balao') + 'É em torno das perguntas que a conversa acontece. Marque as que quiser, mude o texto ou escreva a sua.</p>'
        + st.grupos.map((g, gi) => '<div class="mesa-grupo"><header><b>' + esc(g.titulo) + '</b>' + (g.subtitulo ? '<span>' + esc(g.subtitulo) + '</span>' : '') + '</header>'
          + perguntas(gi)
          + (gi === ultimo ? '<div class="mesa-escrever"><input class="campo-falso" data-nova type="text" maxlength="' + PERGUNTA_MAX + '" placeholder="Escreva a sua pergunta" aria-label="Escreva a sua pergunta" autocomplete="off">'
            + '<button type="button" class="botao pequeno contorno" data-por>' + CC.ico('mais-sinal') + 'Pôr na lista</button></div>' : '') + '</div>').join('')
        + '<p class="mesa-conta" data-conta>' + contaPerguntas() + '</p>'
        + '<div class="mesa-ws"><header><b>Acolhida, adoração e testemunho</b><button type="button" class="botao pequeno contorno" data-mudar-ws>Mudar</button></header><dl>'
        + [['acolhida', 'Acolhida'], ['adoracao', 'Adoração'], ['testemunho', 'Testemunho']].map(([k, r]) => '<dt>' + r + '</dt><dd>' + esc(valorW(k) || sugestaoW[k]()) + '</dd>').join('') + '</dl></div>'
        + '<p class="mesa-nota">' + CC.ico('pessoas') + 'Ao salvar, todos da célula veem o estudo na aba Estudo, inclusive quem está só conhecendo.</p>'
        + '<div data-erro role="alert" hidden></div>'
        + '<div class="acoes"><button class="botao" data-salvar>' + CC.ico('certo') + 'Salvar o estudo</button>'
        + '<button class="botao plano" data-voltar-partes>Voltar às partes</button></div>';
      const q = (s) => painel.querySelector(s);
      painel.querySelectorAll('.mesa-pergunta input[type="checkbox"]').forEach((caixa) => {
        caixa.onchange = () => {
          const linha = caixa.closest('[data-q]');
          const x = st.perguntas[Number(linha.dataset.q)];
          if (caixa.checked && st.perguntas.filter((y) => y.marcada).length >= PERGUNTAS_MAX) {
            caixa.checked = false;
            CC.avisar(MSG.perguntas, { tipo: 'erro' });
            return;
          }
          x.marcada = caixa.checked;
          linha.classList.toggle('marcada', x.marcada);
          linha.querySelector('.caixa-marcar').innerHTML = x.marcada ? CC.ico('certo') : '';
          q('[data-conta]').textContent = contaPerguntas();
          guardar();
        };
      });
      painel.querySelectorAll('[data-mudar-q]').forEach((b) => {
        b.onclick = () => {
          const x = st.perguntas[Number(b.dataset.mudarQ)];
          st.perguntas.forEach((y) => { delete y.editando; });
          x.editando = true;
          x.antes = x.texto;
          desenharPerguntas(painel);
          const campo = painel.querySelector('[data-texto-q]');
          campo.value = x.texto;
          crescer(campo);
          campo.focus();
        };
      });
      const editando = painel.querySelector('.mesa-pergunta.editando');
      if (editando) {
        const x = st.perguntas[Number(editando.dataset.q)];
        const campoQ = editando.querySelector('[data-texto-q]');
        campoQ.value = x.texto;
        crescer(campoQ);
        campoQ.oninput = () => crescer(campoQ);
        editando.querySelector('[data-pronto-q]').onclick = () => {
          const t = editando.querySelector('[data-texto-q]').value.replace(/\s+/g, ' ').trim();
          if (t) x.texto = t.slice(0, PERGUNTA_MAX);
          delete x.editando; delete x.antes;
          guardar();
          desenharPerguntas(painel);
        };
        editando.querySelector('[data-desfazer-q]').onclick = () => {
          x.texto = x.de || x.antes || x.texto;
          delete x.editando; delete x.antes;
          guardar();
          desenharPerguntas(painel);
        };
      }
      q('[data-por]').onclick = () => {
        const campo = q('[data-nova]');
        const t = campo.value.replace(/\s+/g, ' ').trim().slice(0, PERGUNTA_MAX);
        if (!t) { campo.focus(); return; }
        const cheia = st.perguntas.filter((y) => y.marcada).length >= PERGUNTAS_MAX;
        st.perguntas.push({ g: -1, de: '', texto: t, marcada: !cheia });
        if (cheia) CC.avisar(MSG.perguntas, { tipo: 'erro' });
        guardar();
        desenharPerguntas(painel);
      };
      q('[data-mudar-ws]').onclick = () => mudarWs(painel);
      q('[data-voltar-partes]').onclick = () => irPara(2);
      q('[data-salvar]').onclick = () => salvar(painel);
      if (CC.inseparavel) CC.inseparavel(painel);
    }

    // Acolhida, adoração e testemunho: três campos de até 300 caracteres. Vazio é a sugestão da
    // semana, que muda sozinha.
    function mudarWs(painel) {
      const campo = (k, rotulo, dica) => '<label class="campo-senha"><span>' + rotulo + ' (opcional)</span><small class="dica-campo">' + dica + '</small>'
        + '<textarea data-w="' + k + '" rows="2" maxlength="' + CAMPO_4W_MAX + '" autocomplete="off" placeholder="' + esc(sugestaoW[k]()) + '"></textarea></label>';
      CC.folha('<h2>Acolhida, adoração e testemunho</h2>'
        + campo('acolhida', 'Acolhida', 'uma pergunta para começar a conversa')
        + campo('adoracao', 'Adoração', 'uma música ou um momento de louvor')
        + campo('testemunho', 'Testemunho', 'quem vamos convidar e pelo que vamos orar')
        + '<div class="acoes"><button class="botao" data-pronto>Pronto</button><button class="botao plano" data-fechar>Cancelar</button></div>',
      {
        rotulo: 'Acolhida, adoração e testemunho',
        rolavel: true,
        ligar: (folha, fechar) => {
          folha.querySelectorAll('[data-w]').forEach((t) => { t.value = valorW(t.dataset.w); });
          folha.querySelector('[data-fechar]').onclick = fechar;
          folha.querySelector('[data-pronto]').onclick = () => {
            st.ws = {};
            folha.querySelectorAll('[data-w]').forEach((t) => { st.ws[t.dataset.w] = t.value.replace(/\s+/g, ' ').trim().slice(0, CAMPO_4W_MAX); });
            guardar();
            fechar();
            desenharPerguntas(painel);
          };
        },
      });
    }

    async function salvar(painel) {
      const botao = painel.querySelector('[data-salvar]');
      const corpo = {
        acao: 'estudo', id: p.id, estudo: st.tipo,
        fonte: st.tipo === 'blocos' ? st.fonte : st.palavra,
        ref: st.tipo === 'trecho' ? refDoTrecho() : '',
        traducao: st.tipo === 'semana' ? 'nbv' : st.traducao,
        perguntas: st.perguntas.filter((x) => x.marcada).map((x) => x.texto.trim()).filter(Boolean),
        base: st.base || '',
      };
      if (st.ws) Object.assign(corpo, st.ws);
      botao.disabled = true;
      try {
        await CC.api('api/celula', corpo);
      } catch (e) {
        botao.disabled = false;
        const m = String(e.message || 'Não deu certo agora. Tente de novo.');
        mostrarErro(painel, [m.charAt(0).toUpperCase() + m.slice(1) + (/[.!?]$/.test(m) ? '' : '.')]);
        return;
      }
      apagarRascunho(p.id);
      await apoio.carregar();
      CC.substituirRota(apoio.endereco(p.id, 'estudo'));
      CC.avisar('Estudo salvo. Ele fica guardado na célula.', { tipo: 'certo' });
    }

    desenhar();
  }

  CC.estudoPreparo = { tela, textoDoHtml };
})(window.CC);
