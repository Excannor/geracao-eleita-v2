/* Praticar: a casca. O quiz de memorização de versículos mora na peça src/sob-demanda/praticar.js
   (o index.html tem teto de 1 MB). O service worker já guarda a peça na instalação (PECAS_DE_ANTEMAO,
   build.mjs): a tela abre sem rede mesmo sem ter sido aberta antes, como quando morava aqui. */
(function (CC) {
  'use strict';

  CC.vistaPraticar = (raiz) => CC.cascaDaPeca(raiz, { peca: window.PRATICAR, pronta: () => CC.praticarTela, titulo: 'Praticar', voltar: 'Desafios', rota: '#/praticar' });
  // o roteador fecha o quiz a cada troca de tela; sem a peça, não há quiz aberto
  CC.fecharPratica = () => { if (CC.praticarFechar) CC.praticarFechar(); };
})(window.CC);
