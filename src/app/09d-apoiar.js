/* A casca de Apoiar o app (#/apoiar): a tela com o Pix mora na peça sob demanda "apoiar"
   (src/sob-demanda/apoiar.js, CC.apoiarTela), porque o index.html tem piso de folga. */
(function (CC) {
  'use strict';
  CC.vistaApoiar = (raiz) => CC.cascaDaPeca(raiz, { peca: window.APOIAR_TELA, pronta: () => CC.apoiarTela,
    titulo: 'Ajude a manter o app', voltar: 'Voltar', rota: '#/apoiar' });
})(window.CC);
