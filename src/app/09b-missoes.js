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
      + '<div class="barra-missao c-' + (m.feita ? 'amarelo' : m.cor) + '"><i style="width:' + pct(inicio, m.alvo) + '" data-encher="' + pct(m.valor, m.alvo) + '"></i>'
      + '<span>' + m.valor + ' / ' + m.alvo + '</span></div></div>'
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
    if (!dados) return titulo + '<div class="leitor-esqueleto"><i></i></div>';
    if (!amigos.length) {
      return titulo + '<div class="missao-convite">' + CC.ico('pessoas')
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
        + '<div class="barra-missao"><i style="width:' + pct(dias, ALVO_SEMANA) + '"></i><span>' + dias + ' / ' + ALVO_SEMANA + '</span></div>'
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

    raiz.innerHTML = '<div class="cabeca-missoes">'
      + '<div class="textos"><h1>Desafios</h1><p>Complete os três desafios de hoje.</p></div>'
      + '<span class="bau-cabeca">' + CC.arte.bau(feitas === lista.length ? 'aberto' : 'pronto') + '</span></div>'
      + '<section class="bloco-missoes">'
      + '<div class="titulo-bloco"><h2>Desafios do dia</h2><span class="relogio">' + CC.ico('calendario') + CC.plural(CC.horasAteAmanha(), 'hora', 'horas') + '</span></div>'
      + '<div class="lista-missoes">' + lista.map((m) => CC.linhaMissao(m)).join('') + '</div></section>'
      // Praticar mora aqui: guardar versículos é o mesmo trabalho do "Guardar" da reflexão
      + '<a class="cartao-praticar" href="#/praticar"><span class="icone-praticar">' + CC.ico('alvo') + '</span>'
      + '<span class="textos"><b>Praticar</b><small>Guarde os versículos das unidades num quiz rápido</small></span>' + CC.ico('avancar') + '</a>'
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

