/* O álbum das cartas do baú (docs/cartas.md, seção 9): o catálogo inteiro, a tela do álbum, a
   carta grande, "O que pode vir", a escolha da Glória e a revelação no baú. Pedida só quando o
   baú ou o álbum abre. */
(function (CC) {
  'use strict';
  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-album]')) {
    const s = document.createElement('style');
    s.dataset.album = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }
  const CATALOGO = '/*CATALOGO_CARTAS*/';
  CC.album = { CATALOGO };
})(window.CC);
