/* Praticar: quiz de memorização de versículos, por unidade. Mostra um versículo e
   pede a referência, ou o contrário, com acerto, erro e transição entre as perguntas. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const POR_SESSAO = 8;

  // Toda unidade com versículos suficientes para montar quatro alternativas entra.
  // Decorar um versículo antes de chegar ao livro não estraga nada, e prender onze
  // unidades atrás do progresso deixava esta tela vazia por meses.
  function unidadesJogaveis() {
    return D.unidades.filter((u) => u.versiculos.length >= 4);
  }

  // A ordem que faz sentido abrir: a unidade de hoje, o que já ficou para trás e,
  // por último, o que ainda vem pela frente.
  function ordenar(lista, atual) {
    const peso = (u) => (u.numero === atual ? 0 : (u.numero < atual ? 1 : 2));
    return lista.slice().sort((a, b) => {
      const d = peso(a) - peso(b);
      if (d) return d;
      return peso(a) === 1 ? b.numero - a.numero : a.numero - b.numero;
    });
  }


  const ref = (id) => CC.semPrefixo(D.notas[id].nome);
  const embaralhar = (a) => {
    const v = a.slice();
    for (let i = v.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [v[i], v[j]] = [v[j], v[i]];
    }
    return v;
  };

  // ---------- tela inicial ----------
  CC.vistaPraticar = function (raiz) {
    const atual = CC.unidadeDoDia(CC.diaAtual()).numero;
    const jogaveis = ordenar(unidadesJogaveis(), atual);

    const cartao = (u) => {
      const p = CC.praticaDe(u.numero);
      const total = Math.min(POR_SESSAO, u.versiculos.length);
      const estrelas = p.melhor ? Math.round((p.melhor / (p.total || total)) * 3) : 0;
      const adiante = u.numero > atual;
      const rot = u.numero === atual ? ' · atual' : (adiante ? ' · adiante' : '');
      return '<button class="cartao-pratica c-' + u.cor + (adiante ? ' adiante' : '') + '" '
        + 'data-unidade="' + u.numero + '">'
        + '<span class="marca">' + CC.ico('alvo') + '</span>'
        + '<span class="textos">'
        + '<span class="rot">Unidade ' + u.numero + rot + '</span>'
        + '<b>' + CC.esc(u.titulo) + '</b>'
        + '<span class="sub">' + u.versiculos.length + ' versículos'
        + (p.melhor ? ' · seu melhor: ' + p.melhor + ' de ' + (p.total || total) : ' · ainda não praticou') + '</span>'
        + '<span class="estrelas">' + [0, 1, 2].map((i) =>
          '<i class="' + (i < estrelas ? 'cheia' : '') + '">' + CC.ico('estrela') + '</i>').join('') + '</span>'
        + '</span>' + CC.ico('direita') + '</button>';
    };

    // A unidade de agora ganha o destaque; as outras ficam numa lista só, sem pilha de cartões.
    const daVez = jogaveis.find((u) => u.numero === atual) || jogaveis[0];
    raiz.innerHTML = CC.cabecaTela('Praticar', { voltar: 'Desafios' })
      + '<div class="cabeca-pratica c-' + daVez.cor + '">'
      + '<div class="textos">'
      + '<p>Rodadas de ' + POR_SESSAO + ' perguntas, uns 2 minutos, pra guardar versículos na memória.</p>'
      + '<button class="botao branco" data-unidade="' + daVez.numero + '">' + CC.ico('alvo') + 'Praticar a unidade ' + daVez.numero + '</button></div>'
      + '</div>'
      + CC.tituloSecao('Todas as unidades')
      + '<div class="lista-pratica caixa-lista">' + jogaveis.map(cartao).join('') + '</div>';

    raiz.querySelectorAll('[data-unidade]').forEach((el) => {
      el.onclick = () => iniciarSessao(Number(el.dataset.unidade));
    });
  };

  // ---------- montagem das perguntas ----------
  function montarPerguntas(u) {
    const fonte = embaralhar(u.versiculos).slice(0, Math.min(POR_SESSAO, u.versiculos.length));
    const todos = u.versiculos;
    return fonte.map((id, i) => {
      // Distratores: outros versículos da mesma unidade.
      const outros = embaralhar(todos.filter((x) => x !== id)).slice(0, 3);
      const opcoes = embaralhar([id, ...outros]);
      // Alterna o sentido da pergunta, para não decorar a posição.
      const tipo = i % 2 === 0 ? 'refDoTexto' : 'textoDaRef';
      return { certo: id, opcoes, tipo };
    });
  }

  let sessao = null;

  function iniciarSessao(numeroUnidade) {
    const u = D.unidades.find((x) => x.numero === numeroUnidade);
    if (!u) return;
    sessao = {
      unidade: u,
      perguntas: montarPerguntas(u),
      indice: 0,
      acertos: 0,
      escolhido: null,
      conferido: false,
    };
    desenhar();
  }

  CC.fecharPratica = function () {
    const el = document.querySelector('.quiz');
    if (el) el.remove();
    sessao = null;
  };

  const trecho = (texto, limite) => (texto.length <= limite ? texto
    : texto.slice(0, limite).replace(/\s+\S*$/, '') + '…');

  function desenhar() {
    const s = sessao;
    const u = s.unidade;
    const fim = s.indice >= s.perguntas.length;
    const fracao = s.indice / s.perguntas.length;

    let el = document.querySelector('.quiz');
    if (!el) {
      el = document.createElement('div');
      document.body.appendChild(el);
    }
    el.className = 'quiz licao c-' + u.cor;

    if (fim) { el.innerHTML = telaFim(); ligarFim(el); return; }

    const q = s.perguntas[s.indice];
    const enunciado = q.tipo === 'refDoTexto'
      ? '<span class="etiqueta">Qual é a referência?</span>'
        + '<blockquote class="verso">' + CC.esc(D.notas[q.certo].texto) + '</blockquote>'
      : '<span class="etiqueta">Qual texto é ' + CC.esc(ref(q.certo)) + '?</span>';

    const opcoes = q.opcoes.map((id) => {
      const rotulo = q.tipo === 'refDoTexto' ? ref(id) : trecho(D.notas[id].texto, 90);
      let estado = '';
      if (s.conferido) {
        if (id === q.certo) estado = ' certo';
        else if (id === s.escolhido) estado = ' errado';
        else estado = ' apagado';
      } else if (id === s.escolhido) estado = ' marcado';
      return '<button class="opcao' + estado + '" data-opcao="' + CC.esc(id) + '"'
        + (s.conferido ? ' disabled' : '') + '>'
        + '<span>' + CC.esc(rotulo) + '</span>'
        + (estado === ' certo' ? CC.ico('certo') : (estado === ' errado' ? CC.ico('fechar') : ''))
        + '</button>';
    }).join('');

    const rodape = s.conferido ? rodapeConferido() : rodapeEscolha();

    el.innerHTML = '<div class="licao-topo">'
      + '<button class="fechar botao-redondo" data-fechar aria-label="Fechar">' + CC.ico('fechar') + '</button>'
      + CC.barra(fracao)
      + '<span class="quiz-contador">' + (s.indice + 1) + '/' + s.perguntas.length + '</span>'
      + '</div>'
      + '<div class="licao-palco"><div class="interno">'
      + '<div class="pergunta">' + enunciado + '</div>'
      + '<div class="opcoes">' + opcoes + '</div>'
      + '</div></div>'
      + rodape;

    el.querySelector('[data-fechar]').onclick = sair;
    if (!s.conferido) {
      el.querySelectorAll('[data-opcao]').forEach((b) => {
        b.onclick = () => {
          s.escolhido = b.dataset.opcao;
          CC.vibrar(s.escolhido === s.perguntas[s.indice].certo ? 'certo' : 'errado');
          desenhar();
        };
      });
      const conf = el.querySelector('[data-conferir]');
      conf.onclick = conferir;
      conf.disabled = !s.escolhido;
    } else {
      el.querySelector('[data-adiante]').onclick = adiante;
    }
  }

  function rodapeEscolha() {
    return '<div class="licao-pe"><div class="interno">'
      + '<button class="botao cor" data-conferir>Conferir</button>'
      + '</div></div>';
  }

  function rodapeConferido() {
    const s = sessao;
    const q = s.perguntas[s.indice];
    const acertou = s.escolhido === q.certo;
    const n = D.notas[q.certo];
    const ultima = s.indice === s.perguntas.length - 1;
    // Quando a pergunta já mostra o versículo, a resposta traz só a referência:
    // repetir o texto inteiro embaixo dele não ensina nada e ocupa meia tela.
    const mostraTexto = q.tipo === 'textoDaRef' && !acertou;
    return '<div class="licao-pe ' + (acertou ? 'certo' : 'erro') + '"><div class="interno">'
      + '<div class="veredito">'
      + '<span class="selo-v">' + CC.ico(acertou ? 'certo' : 'fechar') + '</span>'
      + '<div><b>' + (acertou ? 'Isso!' : 'A resposta era') + '</b>'
      + '<span>' + CC.esc(ref(q.certo))
      + (mostraTexto ? ': ' + CC.esc(trecho(n.texto, 80)) : '') + '</span></div>'
      + '</div>'
      + '<button class="botao ' + (acertou ? 'cor' : 'vermelho') + '" data-adiante>'
      + (ultima ? 'Ver resultado' : 'Continuar') + '</button>'
      + '</div></div>';
  }

  function conferir() {
    const s = sessao;
    if (!s.escolhido || s.conferido) return;
    s.conferido = true;
    if (s.escolhido === s.perguntas[s.indice].certo) s.acertos++;
    desenhar();
  }

  function adiante() {
    sessao.indice++;
    sessao.escolhido = null;
    sessao.conferido = false;
    desenhar();
  }

  // ---------- tela final ----------
  function telaFim() {
    const s = sessao;
    const total = s.perguntas.length;
    const antes = CC.praticaDe(s.unidade.numero).melhor || 0;
    CC.registrarPratica(s.unidade.numero, s.acertos, total);
    CC.anotarDiario('praticas', 1);
    CC.somarAcertos(s.acertos);
    CC.conferirMissoes();
    const recorde = s.acertos > antes;
    const ganho = s.acertos * CC.XP_PRATICA_ACERTO;
    const proporcao = s.acertos / total;
    const nota = proporcao === 1 ? 'Perfeito!'
      : proporcao >= 0.7 ? 'Muito bem!'
        : proporcao >= 0.4 ? 'Está fixando!' : 'Continue praticando';
    const estrelas = Math.round(proporcao * 3);

    return '<div class="licao-topo"><button class="fechar botao-redondo" data-fechar aria-label="Fechar">'
      + CC.ico('fechar') + '</button>' + CC.barra(1) + '</div>'
      + '<div class="licao-palco"><div class="interno"><div class="festa">'
      + '<div class="estrelas-fim">' + [0, 1, 2].map((i) =>
        '<i class="' + (i < estrelas ? 'cheia' : '') + '" style="animation-delay:'
        + (i * 0.15) + 's">' + CC.ico('estrela') + '</i>').join('') + '</div>'
      + '<h1>' + nota + '</h1>'
      + '<p class="passo-dica">Unidade ' + s.unidade.numero + ' · ' + CC.esc(s.unidade.titulo) + '</p>'
      + '<div class="premios">'
      + '<div class="premio c-verde"><div class="cabeca">Acertos</div>'
      + '<div class="valor">' + CC.ico('certo') + s.acertos + '/' + total + '</div></div>'
      + '<div class="premio c-amarelo"><div class="cabeca">XP ganho</div>'
      + '<div class="valor">' + CC.ico('raio') + '+' + ganho + '</div></div>'
      + '</div>'
      + (recorde && antes > 0 ? '<p class="conquista-linha">' + CC.ico('coroa') + 'Novo recorde!</p>' : '')
      + '</div></div></div>'
      + '<div class="licao-pe certo"><div class="interno">'
      + '<button class="botao cor" data-repetir>Praticar de novo</button>'
      + '<button class="botao plano" data-sair>Voltar</button>'
      + '</div></div>';
  }

  function ligarFim(el) {
    el.querySelector('[data-fechar]').onclick = sair;
    el.querySelector('[data-sair]').onclick = sair;
    el.querySelector('[data-repetir]').onclick = () => iniciarSessao(sessao.unidade.numero);
  }

  function sair() {
    CC.fecharPratica();
    location.hash = '#/praticar';
  }
})(window.CC);
