/* As temporadas do plano (R3, docs/fases/r3-temporadas.md). Peça sob demanda: o index.html tem
   teto de 1 MB. R3.1: na folha do alto da Trilha, o cartão da temporada em que a pessoa está (o
   nome, a barra e "faltam N dias"), com a frase de abertura enquanto nenhum dia dela foi lido, e a
   folha da temporada. A conta (CC.temporadaDoDia, CC.progressoTemporada, CC.temporadaCompletaEm) e
   o selo em Conquistas ficam no index (02b-jogo.js, 07-perfil.js); a chegada fica no Dia lido. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-temporadas]')) {
    const s = document.createElement('style');
    s.dataset.temporadas = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  const TOTAL = (D.temporadas || []).length;
  // Os dias da temporada que ainda não foram lidos e ficaram para trás num pulo para a célula
  // (R2.1): contam no "faltam", porque a temporada só fecha com todos lidos, mas sem cobrança.
  const pendentesDe = (t) => {
    const pulou = CC.ler('pulouPara', 0) || 0;
    let n = 0;
    for (let d = t.de; d <= t.ate && d < pulou; d++) if (!CC.leu(d)) n++;
    return n;
  };
  const faltamTexto = (faltam) => (faltam === 1 ? 'falta 1 dia' : 'faltam ' + faltam + ' dias');
  const selo = (t, p) => CC.arte.trofeu(t.cor, p.feitos === p.total, p.total ? p.feitos / p.total : 0, 'selo', t.numero);

  // Por cima da Trilha já desenhada (03-trilha.js chama depois de cada desenho): o cartão logo
  // abaixo do "Ler hoje" e da chama.
  function trilha(raiz, atual) {
    const folha = raiz.querySelector('.folha-topo');
    const t = CC.temporadaDoDia(atual);
    if (!folha || !t || folha.querySelector('[data-temporada]')) return;
    const depois = folha.querySelector('.cartoes-hoje');
    if (!depois) return;
    const p = CC.progressoTemporada(t);
    const faltam = p.total - p.feitos;
    const pend = pendentesDe(t);
    // "ao entrar": enquanto nenhum dia da temporada foi lido, a frase de abertura vem junto
    const entrando = p.feitos === 0;
    const situacao = faltam ? faltamTexto(faltam) + (pend ? ' · ' + (pend === 1 ? '1 pendente' : pend + ' pendentes') : '') : 'Temporada concluída';
    depois.insertAdjacentHTML('afterend', '<button class="cartao-temporada' + (entrando ? ' entrando' : '') + '" data-temporada="' + t.numero + '"'
      + ' aria-label="' + CC.esc('Temporada ' + t.numero + ' de ' + TOTAL + ': ' + t.titulo + ', ' + situacao + '. Ver a temporada') + '">'
      + '<span class="selo-temporada" aria-hidden="true">' + selo(t, p) + '</span>'
      + '<span class="textos-temporada" aria-hidden="true"><small>Temporada ' + t.numero + ' de ' + TOTAL + '</small>'
      + '<b>' + CC.esc(t.titulo) + '</b>'
      + '<span class="barra-temporada"><i style="width:' + (p.feitos / p.total * 100).toFixed(1) + '%"></i></span>'
      + '<span class="faltam-temporada" data-faltam="' + faltam + '">' + CC.esc(situacao) + '</span>'
      + (entrando ? '<span class="abertura-temporada" data-abertura-temporada>' + CC.esc(t.abertura) + '</span>' : '')
      + '</span>' + CC.ico('avancar') + '</button>');
    folha.querySelector('[data-temporada]').onclick = () => folhaTemporada(t.numero);
  }

  // A folha da temporada: a abertura, o que se lê, quantos dias faltam e o selo.
  function folhaTemporada(numero) {
    const t = (D.temporadas || []).find((x) => x.numero === Number(numero));
    if (!t) return;
    const p = CC.progressoTemporada(t);
    const faltam = p.total - p.feitos;
    const pend = pendentesDe(t);
    const seguinte = (D.temporadas || []).find((x) => x.numero === t.numero + 1);
    CC.folha('<div class="folha-temporada" data-folha-temporada="' + t.numero + '">'
      + '<div class="cabeca-temporada"><span class="selo-temporada grande" aria-hidden="true">' + selo(t, p) + '</span>'
      + '<span><small>Temporada ' + t.numero + ' de ' + TOTAL + ' · Unidade ' + t.unidade + '</small><h2>' + CC.esc(t.titulo) + '</h2></span></div>'
      + '<p>' + CC.esc(t.abertura) + '</p>'
      + '<dl class="leitura-temporada">'
      + '<dt>Dias</dt><dd>' + t.de + ' a ' + t.ate + ' do plano, ' + p.total + ' dias</dd>'
      + '<dt>Antigo Testamento</dt><dd>' + CC.esc(CC.colarRef(t.antigo)) + '</dd>'
      + (t.novo ? '<dt>Novo Testamento</dt><dd>' + CC.esc(CC.colarRef(t.novo)) + '</dd>' : '')
      + '</dl>'
      + '<span class="barra-temporada"><i style="width:' + (p.feitos / p.total * 100).toFixed(1) + '%"></i></span>'
      + '<p class="conta-temporada">' + p.feitos + ' de ' + p.total + ' dias lidos' + (faltam ? ', ' + faltamTexto(faltam) + '.' : '.') + '</p>'
      + (pend ? '<p class="passo-dica pequena" data-pendentes-temporada="' + pend + '">' + (pend === 1 ? '1 desses dias está pendente' : pend + ' desses dias estão pendentes')
        + '. A temporada fecha quando todos forem lidos, sem pressa.</p>' : '')
      + '<p class="linha-selo-temporada">' + (faltam ? 'Selo ao terminar: ' : 'Selo conquistado: ') + '<b>' + CC.esc(t.selo) + '</b></p>'
      + (seguinte ? '<p class="passo-dica pequena">Depois: temporada ' + seguinte.numero + ', ' + CC.esc(seguinte.titulo) + '.</p>' : '')
      + '</div>'
      + '<div class="acoes"><button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Temporada ' + t.numero + ': ' + t.titulo,
      ligar: (f, fechar) => { f.querySelector('[data-fechar]').onclick = fechar; },
    });
  }

  CC.temporadas = { trilha, folha: folhaTemporada, pendentesDe };
})(window.CC);
