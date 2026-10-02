/* Primeiros passos: as lições de fundamento, na ordem. Cada uma conta quando a pessoa
   lê a nota até o fim; marcar sem abrir não existe mais. */
(function (CC) {
  'use strict';

  const D = CC.D;

  // Quanto tempo leva cada lição: as palavras da nota a 200 por minuto, nunca menos de 2.
  // A lista mostrava só nome e resumo; sem o tempo, uma lição de 877 palavras parecia um
  // texto sem fim para quem está decidindo se abre.
  const minutosDaLicao = (n) => Math.max(2, Math.round(String(n.html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / (CC.PALAVRAS_POR_MINUTO || 200)));
  CC.minutosDaLicao = minutosDaLicao;

  CC.vistaPassos = function (raiz) {
    const feitas = CC.ler('licoes', []);
    const proxima = D.licoes.find((id) => !feitas.includes(id));
    const fracao = D.licoes.length ? feitas.length / D.licoes.length : 0;

    const lista = D.licoes.map((id, i) => {
      const n = D.notas[id];
      if (!n) return '';
      const feita = feitas.includes(id);
      return '<a class="item-licao' + (feita ? ' feita' : '') + (id === proxima ? ' proxima' : '') + '" '
        + 'href="#/nota/' + encodeURIComponent(id) + '">'
        + '<span class="num" aria-hidden="true">' + (feita ? CC.ico('certo') : (i + 1)) + '</span>'
        + '<span class="textos">'
        + (id === proxima ? '<span class="marca-proxima">Próxima</span>' : '')
        + '<b>' + CC.esc(CC.semPrefixo(n.nome)) + (feita ? '<span class="so-leitor">, concluída</span>' : '')
        + ' <small class="minutos-licao">· uns ' + minutosDaLicao(n) + ' min</small></b>'
        + '<span>' + CC.esc(n.resumo || '') + '</span></span>'
        + CC.ico('avancar') + '</a>';
    }).join('');

    const nomeProxima = proxima ? CC.semPrefixo(D.notas[proxima].nome) : '';
    // A cabeça (voltar, título, resumo, progresso e a próxima lição) continua a folha do
    // topo do app (.folha-cabeca, em 21-trilha.css); a próxima lição é o cartão de destaque.
    raiz.innerHTML = '<div class="folha-cabeca cabeca-passos c-roxo">'
      + CC.botaoVoltar('Trilha')
      + '<h1>Primeiros passos</h1>'
      + '<div class="textos">'
      + '<p class="subtitulo-tela">Doze lições pra firmar a fé. Cada uma conta quando você lê até o fim, e uma por semana é um bom ritmo.</p>'
      + '<div class="progresso-passos">' + CC.barra(fracao) + '<b>' + feitas.length + ' de ' + D.licoes.length + '</b></div>'
      + (proxima
        ? '<a class="cartao-destaque" href="#/nota/' + encodeURIComponent(proxima) + '"><span>' + CC.esc(nomeProxima) + '<small class="minutos-licao">uns ' + minutosDaLicao(D.notas[proxima]) + ' min</small></span>' + CC.ico('bandeira') + '</a>'
        : '<p class="conquista-linha">' + CC.ico('estrela') + 'Você concluiu os primeiros passos!</p>')
      + '</div></div>'
      + CC.tituloSecao('As doze lições')
      + '<div class="lista-licoes caixa-lista">' + lista + '</div>';
  };

})(window.CC);
