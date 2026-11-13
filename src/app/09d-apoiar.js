/* A casca de Apoiar o app (#/apoiar). A tela com o Pix (src/sob-demanda/apoiar.js,
   CC.apoiarTela) sai do index.html, que tem piso de folga: pouca gente abre. Aqui fica o título
   e o esqueleto até ela chegar e o "Tentar de novo" quando ela não chega, como no painel. */
(function (CC) {
  'use strict';

  CC.vistaApoiar = function (raiz) {
    if (CC.apoiarTela) return CC.apoiarTela(raiz);
    raiz.innerHTML = '<div class="folha-perfil titulo-frase">' + CC.botaoVoltar('Voltar') + '<h1>Ajude a manter o app</h1></div>' + CC.esqueleto('cartoes');
    CC.ligarVoltarDoTopo(raiz);
    const geracao = (raiz.dataset.apoiarGeracao = String(Date.now()));
    const ainda = () => raiz.dataset.apoiarGeracao === geracao && location.hash.startsWith('#/apoiar') && raiz.querySelector('.esqueleto');
    CC.pedirPeca(window.APOIAR_TELA, () => !!CC.apoiarTela).then(() => { if (ainda()) CC.apoiarTela(raiz); }, () => {
      if (!ainda()) return;
      raiz.querySelector('.esqueleto').outerHTML = CC.estadoSemPeca('Não consegui abrir esta tela');
      const b = raiz.querySelector('[data-acao-estado]');
      if (b) b.onclick = () => CC.vistaApoiar(raiz);
    });
  };
})(window.CC);
