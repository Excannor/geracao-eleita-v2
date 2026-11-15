/* As temporadas do plano (R3, docs/fases/r3-temporadas.md). Peça sob demanda: o index.html tem
   teto de 1 MB. R3.1: na folha do alto da Trilha, o cartão da temporada em que a pessoa está (o
   nome, a barra e "faltam N dias"), com a frase de abertura enquanto nenhum dia dela foi lido, e a
   folha da temporada. A conta (CC.temporadaDoDia, CC.progressoTemporada, CC.temporadaCompletaEm) e
   o selo em Conquistas ficam no index (02b-jogo.js, 07-perfil.js); a chegada fica no Dia lido.
   R3.2: em Conquistas, as barras de "faltam N dias para fechar" (temporada, livros e semana). */
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

  // ---------- R3.2: perto de fechar (Conquistas) ----------
  // As barras de "faltam N dias para fechar": a temporada em que a pessoa está, os livros já
  // começados (os mais perto do fim) e a semana de agora (5 dias com a Palavra fazem a semana
  // completa, R1.2). Só o que está em andamento: nada de lista do que falta no ano.
  const LIVROS_EM_ANDAMENTO = 3;
  const faltamPara = (n, oQue) => (n === 1 ? 'falta 1 dia' : 'faltam ' + n + ' dias') + ' para ' + oQue;
  const linha = (arte, titulo, conta, fracao, descricao, dado) => '<div class="linha-conquista linha-perto"' + (dado ? ' ' + dado : '') + '>' + arte
    + '<div class="corpo-conquista"><div class="titulo-conquista"><b>' + CC.esc(titulo) + '</b><span>' + conta + '</span></div>'
    + '<div class="barra-missao"><i style="width:' + (Math.max(0, Math.min(1, fracao)) * 100).toFixed(1) + '%"></i></div>'
    + '<span class="descricao-conquista">' + CC.esc(descricao) + '</span></div></div>';
  const arteIcone = (icone, cor) => '<span class="arte-medalha arte-perto c-' + cor + '" aria-hidden="true"><span class="escudo">' + CC.ico(icone) + '</span></span>';

  function pertoDeFechar() {
    const linhas = [];
    // quem nunca leu nada não tem nada perto de fechar (na Trilha, vê o dia 0)
    if (!CC.diasComAPalavra() && !CC.ler('lidos', []).length) return linhas;
    const t = CC.temporadaDoDia(CC.diaAtual());
    if (t) {
      const p = CC.progressoTemporada(t);
      const faltam = p.total - p.feitos;
      const pend = pendentesDe(t);
      if (faltam) {
        linhas.push(linha('<span class="selo-temporada selo-perto" aria-hidden="true">' + selo(t, p) + '</span>', 'Temporada ' + t.numero + ': ' + t.titulo,
          p.feitos + '/' + p.total, p.feitos / p.total, faltamPara(faltam, 'fechar a temporada') + (pend ? ', ' + (pend === 1 ? '1 deles pendente' : pend + ' deles pendentes') : ''),
          'data-perto-temporada="' + t.numero + '"'));
      }
    }
    // os livros começados e ainda não terminados, na ordem do que falta menos
    const vistos = [];
    for (const d of D.plano) for (const l of d.livros) if (!vistos.includes(l)) vistos.push(l);
    vistos.map((l, ordem) => ({ l, ordem, ...CC.progressoDoLivro(l) }))
      .filter((x) => x.lidos > 0 && x.lidos < x.total)
      .sort((a, b) => (a.total - a.lidos) - (b.total - b.lidos) || a.ordem - b.ordem)
      .slice(0, LIVROS_EM_ANDAMENTO)
      .forEach((x) => linhas.push(linha(arteIcone('livro', 'turquesa'), x.l, x.lidos + '/' + x.total, x.lidos / x.total,
        faltamPara(x.total - x.lidos, 'fechar ' + x.l), 'data-perto-livro="' + CC.esc(x.l) + '"')));
    // a semana de agora
    {
      const alvo = CC.DIAS_DA_SEMANA_COMPLETA;
      const dias = Math.min(CC.diasNaSemana(), alvo);
      const total = CC.semanasCompletas();
      // os dias que ainda cabem nesta semana (até domingo, sem contar hoje se já leu): quando não dá
      // mais para completar, o texto não cobra o impossível, só lembra que a segunda recomeça
      const hoje = CC.hojeIso();
      const restam = 7 - Math.round((Date.parse(hoje) - Date.parse(CC.segundaDaSemana(hoje))) / 864e5) - (CC.sequencia().feitoHoje ? 1 : 0);
      linhas.push(linha(arteIcone('semana', 'verde'), 'Semana completa', dias + '/' + alvo, dias / alvo,
        dias >= alvo ? 'Esta semana já está completa. ' + (total === 1 ? 'É a sua primeira.' : 'São ' + total + ' semanas completas.')
          : dias + restam < alvo ? CC.plural(dias, 'dia', 'dias') + ' com a Palavra nesta semana. Na segunda começa uma semana nova.'
            : faltamPara(alvo - dias, 'completar esta semana') + ' (' + alvo + ' dias com a Palavra, de segunda a domingo)',
        'data-perto-semana="' + dias + '"'));
    }
    return linhas;
  }
  // Pinta a seção no lugar guardado pela tela de Conquistas (07-perfil.js).
  function conquistas(raiz) {
    const lugar = raiz.querySelector('[data-perto-de-fechar]');
    if (!lugar || lugar.childElementCount) return;
    const linhas = pertoDeFechar();
    if (linhas.length) lugar.innerHTML = CC.tituloSecao('Perto de fechar') + '<div class="caixa-lista">' + linhas.join('') + '</div>';
  }

  CC.temporadas = { trilha, folha: folhaTemporada, pendentesDe, pertoDeFechar, conquistas };
})(window.CC);
