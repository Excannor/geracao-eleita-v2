/* Parábolas da Bíblia: o cartão no Explorar e a casca das rotas #/parabolas (a lista) e
   #/parabola/<slug>. Referência aprovada pelo dono: o mock de 09/10.
   O index.html tem teto de 1 MB, então aqui fica só o cartão e o carregamento:
   - o mínimo de cada parábola publicada vem em window.PARABOLAS (gerado pelo build);
   - a lista e a página, código e estilo, vêm em parabola-tela.<resumo>.js
     (src/sob-demanda/parabola-tela.js), pedido na primeira vez que a pessoa entra;
   - os desenhos da lista em parabolas-desenhos.<resumo>.json;
   - o texto de cada parábola em parabola-<slug>.<resumo>.json, como os mapas (06b-mapas.js).
   O service worker guarda tudo isso na primeira vez (cache "caminho-parabolas"), e a lista e as
   parábolas já abertas abrem sem rede. "Lida" mora em E.parabolasLidas (02-estado.js). */
(function (CC) {
  'use strict';

  const P = window.PARABOLAS || { desenhos: '', tela: '', grupos: [], itens: [] };
  const porSlug = new Map(P.itens.map((p) => [p.slug, p]));
  CC.tituloDaParabola = (slug) => (porSlug.get(slug) || {}).titulo || slug;

  // ---------- o cartão no Explorar ----------
  // Logo abaixo de "Mapas dos livros", para todos os caminhos. O desenho (a mesa posta) entra
  // no lugar da marca no build, como o rolo com a pena do cartão dos mapas.
  const DESENHO_CARTAO = '@@DESENHO:mesa-posta@@';
  CC.cartaoParabolas = () => (P.itens.length
    ? '<a class="cartao-parabolas" href="#/parabolas"><span class="desenho" aria-hidden="true">' + DESENHO_CARTAO + '</span>'
      + '<span class="parabolas-textos"><span class="parabolas-titulo">Parábolas da Bíblia</span>'
      + '<span class="parabolas-dica">Histórias que Jesus contava</span></span>' + CC.ico('avancar') + '</a>'
    : '');

  // ---------- os arquivos sob demanda ----------
  const carregados = new Map();
  function buscar(arquivo, pedir) {
    if (!carregados.has(arquivo)) {
      const pedido = (pedir || (() => fetch(arquivo).then((r) => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })))().then((dados) => { carregados.set(arquivo, { pronto: dados }); return dados; });
      pedido.catch(() => carregados.delete(arquivo));
      carregados.set(arquivo, { pedido });
    }
    const c = carregados.get(arquivo);
    return c.pronto ? Promise.resolve(c.pronto) : c.pedido;
  }
  const pronto = (arquivo) => (carregados.get(arquivo) || {}).pronto;
  // o código da lista e da página: um <script> do próprio app, que registra CC.parabolas.tela
  const pedirTela = () => new Promise((resolver, falhar) => {
    const s = document.createElement('script');
    s.src = './' + P.tela;
    s.onload = () => (CC.parabolas.tela ? resolver(CC.parabolas.tela) : falhar(new Error('tela')));
    s.onerror = () => { s.remove(); falhar(new Error('tela')); };
    document.head.appendChild(s);
  });

  // A lista (sem slug) ou uma parábola: desenha na hora quando o código e o texto já chegaram
  // (o redesenho não perde a rolagem); senão, a barra com o voltar e o esqueleto até chegarem.
  function abrir(raiz, slug) {
    const item = slug === null ? null : porSlug.get(String(slug || ''));
    if (slug !== null && !item) return CC.vazio(raiz, 'Não encontrei essa parábola.');
    const pintar = (p) => pronto(P.tela)(raiz, item, p);
    if (pronto(P.tela) && (!item || pronto(item.arquivo))) { pintar(item && pronto(item.arquivo)); return; }
    raiz.innerHTML = '<div class="folha-mapa"><div class="mapa-barra"><button class="botao-redondo" data-voltar aria-label="Voltar">'
      + CC.ico('voltar') + '<span class="so-leitor">' + (item ? 'Parábolas' : 'Explorar') + '</span></button></div></div>' + CC.esqueleto('texto');
    CC.ligarVoltarDoTopo(raiz);
    if (!CC.appServido()) { raiz.querySelector('.esqueleto').outerHTML = '<div class="vazio">Aberto como arquivo solto, o aplicativo não tem de onde trazer as parábolas.</div>'; return; }
    const geracao = (raiz.dataset.parabolaGeracao = String(Date.now()));
    const ainda = () => raiz.dataset.parabolaGeracao === geracao && raiz.querySelector('.esqueleto');
    Promise.all([buscar(P.tela, pedirTela), item ? buscar(item.arquivo) : null]).then(([, p]) => { if (ainda()) pintar(p); }).catch(() => {
      if (!ainda()) return;
      const semRede = navigator.onLine === false;
      raiz.querySelector('.esqueleto').outerHTML = CC.estado({
        erro: true, icone: 'info',
        titulo: semRede ? 'Sem internet agora' : 'Não deu para abrir as parábolas',
        texto: semRede ? 'Isto ainda não está guardado neste celular. Com internet, fica guardado para abrir sem rede.' : 'Pode ter sido a conexão. Tente de novo em instantes.',
        acao: 'Tentar de novo',
      });
      const b = raiz.querySelector('[data-acao-estado]');
      if (b) b.onclick = () => CC.redesenhar();
    });
  }
  CC.vistaParabolas = (raiz) => abrir(raiz, null);
  CC.vistaParabola = (raiz, slug) => abrir(raiz, slug);

  // o que a lista e a página (src/sob-demanda/parabola-tela.js) usam daqui
  CC.parabolas = { P, porSlug, buscar, pronto };
})(window.CC);
