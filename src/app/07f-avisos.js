/* Avisos: a caixa do sino do Início. Mostra as notificações que o app mandou para a pessoa
   (lembretes, toques, pedidos, convites, metas do grupo), mesmo as que não chegaram como
   push porque o aparelho não estava inscrito ou o aviso estava desligado. Ligar e desligar
   os avisos continua em Configurações > Lembretes e avisos (07d-notificacoes.js). */
(function (CC) {
  'use strict';

  // O ícone de cada aviso, pelo tipo (a "tag" da notificação, ver notificacoes.mjs).
  const ICONE = [
    [/^(lembrete|ofensiva|escudo|volta)/, 'chama'],
    [/^toque/, 'sino'],
    [/^(pedido|aceito)/, 'pessoa'],
    [/^(querConversar|querBatismo|possoAjudar|pedidoConduz|denunciaPerigo)/, 'balao'],
    [/^(proposito|grupo|metaDoGrupo|metaBatida|celula)/, 'pessoas'],
    [/^discipulado/, 'cruz'],
    [/^desafio/, 'bandeira'],
  ];
  const iconeDe = (tipo) => (ICONE.find(([re]) => re.test(tipo || '')) || [null, 'sino'])[1];

  let naoLidos = 0;
  // A tela é desenhada mais de uma vez ao abrir (o app redesenha depois de sincronizar), e a
  // primeira já marca tudo como lido no servidor: o que chegou novo continua com cara de
  // novo por um minuto, para a pessoa ver o que mudou.
  const vistoNovoEm = new Map();
  const ehNovo = (a) => !a.lido || (vistoNovoEm.has(a.id) && Date.now() - vistoNovoEm.get(a.id) < 60000);
  CC.avisosNaoLidos = () => naoLidos;

  // Conta os não lidos sem abrir a tela: o ponto do sino no Início.
  CC.atualizarPontoDoSino = async function () {
    if (!CC.appServido || !CC.appServido()) return;
    try {
      const r = await CC.api('api/avisos');
      naoLidos = r.naoLidos || 0;
    } catch (e) { return; }
    document.querySelectorAll('[data-sino]').forEach((a) => {
      a.querySelector('.ponto')?.remove();
      if (naoLidos) a.insertAdjacentHTML('beforeend', '<i class="ponto"></i>');
      a.setAttribute('aria-label', naoLidos ? 'Avisos, ' + naoLidos + ' novos' : 'Avisos');
    });
  };

  // "agora", "há 5 min", "há 3 h", "ontem", "12/09"
  function quando(em) {
    const seg = Math.max(0, (Date.now() - em) / 1000);
    if (seg < 60) return 'agora';
    if (seg < 3600) return 'há ' + Math.floor(seg / 60) + ' min';
    const d = new Date(em);
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (iso === CC.hojeIso()) return 'há ' + Math.floor(seg / 3600) + ' h';
    if (iso === CC.somaDias(CC.hojeIso(), -1)) return 'ontem';
    return iso.slice(8, 10) + '/' + iso.slice(5, 7);
  }

  const destino = (url) => {
    const i = String(url || '').indexOf('#');
    return i >= 0 ? url.slice(i) : '#/';
  };

  CC.vistaAvisos = async function (raiz) {
    const cabeca = '<div class="folha-cabeca folha-avisos">' + CC.botaoVoltar('Voltar')
      + '<h1>Avisos</h1></div>';
    raiz.innerHTML = cabeca + CC.esqueleto('lista');
    CC.ligarVoltarDoTopo(raiz);
    let r;
    try {
      r = await CC.api('api/avisos');
    } catch (e) {
      raiz.innerHTML = cabeca + CC.estado({ erro: true, icone: 'info', titulo: 'Não deu para abrir os avisos', texto: 'Pode ter sido a conexão. Tente de novo em instantes.', acao: 'Tentar de novo' });
      CC.ligarVoltarDoTopo(raiz);
      const b = raiz.querySelector('[data-acao-estado]');
      if (b) b.onclick = () => CC.redesenhar();
      return;
    }
    const avisos = r.avisos || [];
    for (const a of avisos) if (!a.lido && !vistoNovoEm.has(a.id)) vistoNovoEm.set(a.id, Date.now());
    const ajustes = '<a class="linha-ajustes-avisos" href="#/config/notificacoes">' + CC.ico('engrenagem')
      + '<span>Escolher quais avisos chegam no celular</span>' + CC.ico('avancar') + '</a>';
    raiz.innerHTML = cabeca
      + (avisos.length
        ? '<div class="caixa-lista lista-avisos">' + avisos.map((a) => '<a class="item-aviso' + (ehNovo(a) ? ' novo' : '') + '" href="'
          + CC.esc(destino(a.url)) + '"><span class="ico-aviso">' + CC.ico(iconeDe(a.tipo)) + '</span>'
          + '<span class="textos-aviso"><b>' + CC.esc(a.titulo) + '</b><span>' + CC.esc(a.corpo) + '</span>'
          + '<small>' + quando(a.em) + '</small></span>' + (ehNovo(a) ? '<i class="ponto-novo" aria-label="novo"></i>' : '') + '</a>').join('') + '</div>'
        : CC.estado({ icone: 'sino', titulo: 'Nenhum aviso ainda', texto: 'Lembretes da leitura, toques de amigos e convites aparecem aqui.' }))
      + ajustes;
    CC.ligarVoltarDoTopo(raiz);
    if (r.naoLidos) {
      naoLidos = 0;
      // o sino do topo (o mesmo em todas as abas) perde o ponto na hora
      document.querySelectorAll('[data-sino] .ponto').forEach((p) => p.remove());
      CC.api('api/avisos/lidos', {}).catch(() => {});
    }
  };
})(window.CC);
