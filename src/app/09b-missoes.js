/* Desafios: os três do dia, praticar os versículos, e a leitura da semana com os amigos.
   (O arquivo e a rota continuam com o nome antigo, "missões", para não quebrar links guardados.) */
(function (CC) {
  'use strict';

  const CORES_MES = ['verde', 'azul', 'roxo', 'vermelho', 'amarelo', 'turquesa'];
  const pct = (valor, alvo) => Math.max(0, Math.min(100, (valor / alvo) * 100)).toFixed(1) + '%';
  const ALVO_SEMANA = 4;

  // Uma linha de missão. "de" é o valor de antes, para a barra andar até o de agora.
  CC.linhaMissao = (m, de) => {
    const inicio = de === undefined ? m.valor : Math.min(de, m.alvo);
    return '<div class="missao' + (m.feita ? ' feita' : '') + (de !== undefined && m.feita && inicio < m.alvo ? ' fechou-agora' : '') + '">'
      + '<span class="icone-missao c-' + m.cor + '">' + CC.ico(m.icone) + '</span>'
      + '<div class="corpo-missao"><b>' + CC.esc(m.texto) + '</b>'
      // a barra e a conta lado a lado: a conta numa pílula, fora da barra
      + '<div class="linha-barra"><div class="barra-missao c-' + (m.feita ? 'amarelo' : m.cor) + '"><i style="width:' + pct(inicio, m.alvo) + '" data-encher="' + pct(m.valor, m.alvo) + '"></i></div>'
      + '<span class="conta-missao">' + m.valor + '/' + m.alvo + '</span></div>'
      // a presencial o app não confere: vale a palavra da pessoa
      + (m.presencial ? (m.feita ? '<span class="selo-presencial">' + CC.ico('certo') + 'Feito ao vivo</span>'
        : '<button type="button" class="botao pequeno contorno botao-presencial" data-missao-presencial="' + m.id + '">' + CC.ico('certo') + 'Já fiz</button>') : '')
      + '</div>'
      + '<span class="premio-missao">' + CC.arte.bau(m.feita ? 'aberto' : 'travado') + '</span>'
      + '</div>';
  };

  // Segunda-feira da semana de uma data, no formato do diário.
  const segundaDe = (data) => {
    const dia = new Date(data + 'T12:00:00').getDay();
    return CC.somaDias(data, -((dia + 6) % 7));
  };

  function missaoAmigos(dados) {
    if (!location.protocol.startsWith('http')) return '';
    const amigos = (dados && dados.amigos) || [];
    const titulo = '<div class="titulo-bloco"><h2>Lendo junto na semana</h2><span>até domingo</span></div>';
    if (!dados) return titulo + CC.esqueleto('lista');
    if (!amigos.length) {
      return titulo + '<div class="missao-convite"><span class="icone-missao">' + CC.ico('pessoas') + '</span>'
        + '<p>Leiam juntos 4 dias na mesma semana. Chame alguém para começar!</p>'
        + '<button class="botao pequeno" data-convidar>' + CC.ico('compartilhar') + 'Convidar</button></div>';
    }
    const eu = { usuario: (CC.quem || {}).usuario || 'eu', nome: String(CC.apelido() || (CC.quem || {}).nome || 'Você').trim(), foto: CC.foto() };
    const semana = segundaDe(CC.hojeIso());
    const juntos = { ...(CC.ler('semanasJuntos', {})) };
    let mudou = false;
    const linhas = amigos.map((a) => {
      const dias = Math.min(ALVO_SEMANA, (a.semana && a.semana.dias) || 0);
      const feita = dias >= ALVO_SEMANA;
      const chave = semana + ':' + a.usuario;
      if (feita && !juntos[chave]) { juntos[chave] = CC.hojeIso(); mudou = true; }
      return '<div class="missao missao-dupla' + (feita ? ' feita' : '') + '">'
        + '<span class="dupla-mini">' + CC.retratoAmigo(eu, 'mini') + CC.retratoAmigo(a, 'mini') + '</span>'
        + '<div class="corpo-missao"><b>Leiam juntos ' + ALVO_SEMANA + ' dias com ' + CC.esc(a.nome) + '</b>'
        // a barra é da dupla: conta os dias em que os dois leram, nunca quanto cada um leu
        + '<div class="linha-barra"><div class="barra-missao"><i style="width:' + pct(dias, ALVO_SEMANA) + '"></i></div><span class="conta-missao">' + dias + '/' + ALVO_SEMANA + '</span></div>'
        + '<span class="estado-dupla">' + (a.leuHoje ? CC.ico('certo') + CC.esc(a.nome.split(' ')[0]) + ' já leu hoje'
          : (a.toqueEnviado ? CC.esc(a.nome.split(' ')[0]) + ' foi encorajado hoje'
            : '<button class="link-nota" data-encorajar="' + CC.esc(a.usuario) + '">' + CC.ico('aperto') + 'Encorajar ' + CC.esc(a.nome.split(' ')[0]) + '</button>')) + '</span></div>'
        + '<span class="premio-missao">' + CC.arte.bau(feita ? 'aberto' : 'travado', feita ? 'madeira' : '') + '</span></div>';
    }).join('');
    if (mudou) CC.gravar('semanasJuntos', juntos);
    return titulo + '<div class="lista-missoes">' + linhas + '</div>';
  }

  CC.vistaMissoes = function (raiz) {
    const { lista } = CC.conferirMissoes();
    const feitas = lista.filter((m) => m.feita).length;

    // O título da tela fica no alto, no meio; o destaque é um cartão com a conta do dia em bold.
    // .folha-desafios: só apresentação, a folha do alto destas telas (23-desafios.css).
    raiz.innerHTML = '<div class="folha-desafios">'
      + '<div class="cabeca-centro"><span class="vao"></span><h1>Desafios</h1><span class="vao"></span></div>'
      + '<div class="cabeca-missoes">'
      + '<div class="textos"><b class="placar-missoes">' + feitas + '<small> de ' + lista.length + '</small></b>'
      + '<p>Complete os três desafios de hoje.</p></div>'
      + '<span class="bau-cabeca">' + CC.arte.bau(feitas === lista.length ? 'aberto' : 'pronto') + '</span></div></div>'
      + '<section class="bloco-missoes" id="desafios-grupo"' + (CC.blocoDesafiosDoGrupo() ? '' : ' hidden') + '>' + CC.blocoDesafiosDoGrupo() + '</section>'
      + '<section class="bloco-missoes" id="desafios-longos">' + CC.blocoDesafiosLongos() + '</section>'
      + '<section class="bloco-missoes">'
      + '<div class="titulo-bloco"><h2>Desafios do dia</h2><span class="relogio">' + CC.ico('calendario') + CC.plural(CC.horasAteAmanha(), 'hora', 'horas') + '</span></div>'
      + '<div class="lista-missoes">' + lista.map((m) => CC.linhaMissao(m)).join('') + '</div></section>'
      // Praticar mora aqui: guardar versículos é o mesmo trabalho do "Guardar" da reflexão
      + '<a class="cartao-praticar" href="#/praticar"><span class="icone-praticar">' + CC.ico('alvo') + '</span>'
      + '<span class="textos"><b>Praticar</b><small>Guarde os versículos das unidades num quiz rápido</small></span>'
      + '<span class="botao-redondo salvia" aria-hidden="true">' + CC.ico('avancar') + '</span></a>'
      + '<section class="bloco-missoes" id="missao-amigos">' + missaoAmigos(CC.amigosEmCache && CC.amigosEmCache()) + '</section>';

    const ligarAmigos = () => {
      const b = raiz.querySelector('#missao-amigos [data-convidar]');
      if (b) b.onclick = () => CC.convidar();
      raiz.querySelectorAll('#missao-amigos [data-encorajar]').forEach((e) => {
        e.onclick = async () => {
          e.disabled = true;
          try {
            await CC.api('api/toques', { para: e.dataset.encorajar });
            e.outerHTML = '<span>' + CC.ico('certo') + 'Encorajado hoje</span>';
          } catch (erro) { e.disabled = false; CC.avisar(erro.message); }
        };
      });
    };
    ligarAmigos();
    raiz.querySelectorAll('[data-missao-presencial]').forEach((b) => {
      b.onclick = () => {
        CC.marcarNoDiario(CC.chaveMissaoPresencial(b.dataset.missaoPresencial));
        const { novas } = CC.conferirMissoes();
        if (novas && CC.vibrar) CC.vibrar();
        CC.vistaMissoes(raiz);
      };
    });
    const redesenhar = () => { if (location.hash.startsWith('#/missoes')) CC.vistaMissoes(raiz); };
    CC.ligarDesafiosLongos(raiz, redesenhar);
    CC.ligarDesafiosDoGrupo(raiz, redesenhar);
    // Os desafios em grupo vêm do servidor: a tela abre com a última resposta e troca o bloco
    // quando a nova chegar.
    if (CC.carregarDesafiosDoGrupo) {
      CC.carregarDesafiosDoGrupo().then(() => {
        const alvo = raiz.querySelector('#desafios-grupo');
        if (!alvo || !location.hash.startsWith('#/missoes')) return;
        const html = CC.blocoDesafiosDoGrupo();
        alvo.hidden = !html;
        alvo.innerHTML = html;
        CC.ligarDesafiosDoGrupo(alvo, redesenhar);
      });
    }
    if (CC.carregarAmigos) {
      CC.carregarAmigos().then((d) => {
        const alvo = raiz.querySelector('#missao-amigos');
        if (!alvo || !location.hash.startsWith('#/missoes')) return;
        alvo.innerHTML = missaoAmigos(d);
        ligarAmigos();
      });
    }
  };
})(window.CC);

