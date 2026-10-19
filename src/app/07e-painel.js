/* A casca do painel do administrador (#/config/painel, e dentro dele /aviso e /celula/<id>).
   O painel em si (src/sob-demanda/painel-tela.js, CC.painelTela) não mora no index.html, que
   tem teto de 1 MB: só o administrador o abre. Aqui fica o que aparece até ele chegar (o título
   e o esqueleto, como o próprio painel desenha enquanto busca os números) e o erro com o
   "Tentar de novo" quando a peça não chega. O item "Painel do administrador" do Mais mora em
   10-roteador.js e só aparece para o administrador (CC.quem.admin). */
(function (CC) {
  'use strict';

  const TITULOS = { aviso: ['Voltar', 'Enviar aviso'], celula: ['Painel', 'Célula'] };
  CC.vistaPainel = function (raiz, arg) {
    if (CC.painelTela) return CC.painelTela(raiz, arg);
    const parte = String(arg || '').split('/')[1] || '';
    const [voltar, titulo] = TITULOS[parte] || ['Voltar', 'Painel do administrador'];
    raiz.innerHTML = '<div class="folha-perfil titulo-frase">' + CC.botaoVoltar(voltar) + '<h1>' + CC.esc(titulo) + '</h1></div>' + CC.esqueleto('cartoes');
    CC.ligarVoltarDoTopo(raiz);
    const geracao = (raiz.dataset.painelGeracao = String(Date.now()));
    // ainda no painel e sem outro desenho por cima (cada abertura troca a geração)
    const ainda = () => raiz.dataset.painelGeracao === geracao && location.hash.startsWith('#/config/painel') && raiz.querySelector('.esqueleto');
    CC.pedirPeca(window.PAINEL_TELA, () => !!CC.painelTela).then(() => { if (ainda()) CC.painelTela(raiz, arg); }, () => {
      if (!ainda()) return;
      raiz.querySelector('.esqueleto').outerHTML = CC.estadoSemPeca('Não consegui abrir o painel');
      const b = raiz.querySelector('[data-acao-estado]');
      if (b) b.onclick = () => CC.vistaPainel(raiz, arg);
    });
  };
})(window.CC);
