/* Mapas bíblicos (o atlas): o cartão no Explorar e a casca das rotas #/atlas (a lista) e
   #/atlas/<slug> (um mapa). Não confundir com o "Mapa do livro" (#/mapa/<slug>, 06b-mapas.js),
   que é o mapa mental de cada livro: aqui são mapas geográficos.
   O index.html tem teto de 1 MB, então aqui fica só o cartão e o carregamento:
   - o mínimo de cada mapa publicado vem em window.ATLAS (gerado pelo build);
   - a lista e a tela do mapa, código e estilo, vêm em atlas.<resumo>.js (src/sob-demanda/atlas.js),
     pedido por CC.pedirPeca na primeira vez;
   - cada mapa em atlas-<slug>.<resumo>.json e o relevo em atlas-relevo-<slug>.<resumo>.webp.
   O service worker guarda tudo isso na primeira vez (cache "caminho-atlas"); depois abre sem rede.
   Nada aqui grava dado da pessoa. */
(function (CC) {
  'use strict';

  const A = window.ATLAS || { grupos: [], itens: [] };
  const porSlug = new Map(A.itens.map((m) => [m.slug, m]));

  // ---------- o cartão no Explorar ----------
  // Logo abaixo das parábolas. A miniatura é o relevo do primeiro mapa, recortado no cartão.
  CC.cartaoAtlas = () => {
    if (!A.itens.length) return '';
    const capa = A.itens[0];
    // fundo por CSS (e não <img>): sem a imagem, fica só o tom do cartão, sem ícone de quebrada
    return '<a class="cartao-atlas" href="#/atlas"><span class="atlas-capa" aria-hidden="true" style="background-image:url(\'./' + CC.esc(capa.imagem) + '\')"></span>'
      + '<span class="cartao-atlas-textos"><span class="cartao-atlas-titulo">Mapas bíblicos</span>'
      + '<span class="cartao-atlas-dica">Onde a história aconteceu</span></span>' + CC.ico('avancar') + '</a>';
  };

  // ---------- os arquivos sob demanda ----------
  const carregados = new Map();
  function buscar(arquivo) {
    if (!carregados.has(arquivo)) {
      const pedido = fetch('./' + arquivo).then((r) => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then((dados) => { carregados.set(arquivo, { pronto: dados }); return dados; });
      pedido.catch(() => carregados.delete(arquivo));
      carregados.set(arquivo, { pedido });
    }
    const c = carregados.get(arquivo);
    return c.pronto ? Promise.resolve(c.pronto) : c.pedido;
  }
  const pronto = (arquivo) => (carregados.get(arquivo) || {}).pronto;
  const temTela = () => !!(CC.atlas && CC.atlas.tela);

  // A lista (sem slug) ou um mapa: desenha na hora quando o código e os dados já chegaram (o
  // redesenho não perde a rolagem); senão, a folha com o voltar e o esqueleto até chegarem.
  CC.vistaAtlas = function (raiz, slug) {
    const item = slug ? porSlug.get(String(slug)) : null;
    if (slug && !item) return CC.vazio(raiz, 'Não encontrei esse mapa.');
    const pintar = () => CC.atlas.tela(raiz, item, item ? pronto(item.arquivo) : null);
    if (temTela() && (!item || pronto(item.arquivo))) { pintar(); return; }
    raiz.innerHTML = '<div class="folha-mapa"><div class="mapa-barra"><button class="botao-redondo" data-voltar data-rotulo-voltar="'
      + (item ? 'Mapas bíblicos' : 'Explorar') + '" aria-label="Voltar">' + CC.ico('voltar') + '</button>'
      + '<span class="mapa-barra-titulo">Mapas bíblicos</span><span style="width:44px"></span></div></div>' + CC.esqueleto('texto');
    CC.ligarVoltarDoTopo(raiz);
    if (!CC.appServido()) { raiz.querySelector('.esqueleto').outerHTML = '<div class="vazio">Não consegui abrir os mapas agora.</div>'; return; }
    const geracao = (raiz.dataset.atlasGeracao = String(Date.now()));
    const ainda = () => raiz.dataset.atlasGeracao === geracao && raiz.querySelector('.esqueleto');
    Promise.all([CC.pedirPeca(window.ATLAS_TELA, temTela), item ? buscar(item.arquivo) : null]).then(() => { if (ainda()) pintar(); }, () => {
      if (!ainda()) return;
      raiz.querySelector('.esqueleto').outerHTML = CC.estadoSemPeca('Não consegui abrir o mapa');
      const b = raiz.querySelector('[data-acao-estado]');
      if (b) b.onclick = () => CC.redesenhar();
    });
  };

  // o que a peça (src/sob-demanda/atlas.js) usa daqui
  CC.atlasDados = { A, porSlug, buscar, pronto };
})(window.CC);
