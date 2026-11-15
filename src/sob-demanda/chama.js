/* A chama que perdoa (R1, docs/fases/r1-chama-que-perdoa.md): as folhas que só aparecem de vez em
   quando, fora do index.html (ele tem teto de 1 MB). R1.3: o aviso do escudo usado sozinho, que
   10-roteador.js (avisosDoDia) pede na abertura. A conta mora em 02-estado.js. */
(function (CC) {
  'use strict';

  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-chama]')) {
    const s = document.createElement('style');
    s.dataset.chama = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  // escudo: o que CC.escudoParaAvisar devolveu; seq: CC.sequencia() da abertura.
  function avisoEscudo(escudo, seq) {
    const ontem = CC.somaDias(CC.hojeIso(), -1);
    const dois = escudo.dias.length > 1;
    CC.folha('<div class="recomeco escudo-usado" data-escudo-usado="' + escudo.dias.length + '">' + CC.ico('escudo')
      + '<h2>' + (escudo.iniciante ? 'O escudo do iniciante cuidou da chama' : dois ? 'Seus escudos cuidaram da chama' : 'Um escudo cuidou da sua chama') + '</h2>'
      + '<p>' + (dois ? 'Dois dias ficaram' : escudo.ultimo === ontem ? 'Ontem ficou' : 'Um dia ficou') + ' em branco, e '
      + (escudo.iniciante ? 'ele cobriu sem gastar os seus escudos.' : 'o app usou ' + (dois ? 'dois escudos' : 'um escudo') + ' por você.')
      + ' A chama segue acesa: ' + CC.plural(seq.atual, 'dia seguido', 'dias seguidos') + '.</p>'
      + '<p class="passo-dica pequena">' + (seq.escudos ? (seq.escudos === 1 ? 'Ainda resta 1 escudo.' : 'Ainda restam 2 escudos.')
        : 'O próximo escudo chega com 7 dias seguidos ou no mês que vem.') + '</p></div>'
      + '<div class="acoes">' + (seq.feitoHoje ? '<button class="botao" data-fechar>Que bom!</button>'
        : '<button class="botao" data-ler>Ler hoje</button><button class="botao plano" data-fechar>Agora não</button>') + '</div>',
    {
      rotulo: 'Escudo usado',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const ler = folha.querySelector('[data-ler]');
        if (ler) ler.onclick = () => { fechar(); CC.abrirLicao(CC.diaAtual()); };
      },
    });
  }

  // A folha de volta, depois de uma falta (10-roteador.js, avisosDoDia). R1.1: o número em destaque
  // é o dos dias com a Palavra, nunca um zero. R1.4: quem pode reacender vê o convite, e o botão de
  // cima vira "Reacender lendo hoje".
  function folhaDeVolta(seq) {
    const vida = CC.diasComAPalavra();
    const voltam = CC.reacenderPossivel();
    CC.folha('<div class="recomeco">' + CC.icoChama(0) + '<h2>Ainda tem brasa</h2>'
      + (vida ? '<p class="vida-grande" data-dias-palavra="' + vida + '"><b>' + vida + '</b><span>' + (vida === 1 ? 'dia com a Palavra' : 'dias com a Palavra') + '</span></p>' : '')
      + '<p>Perder um dia não é perder a Palavra. Tudo o que você leu continua aqui, e o seu recorde de '
      + CC.plural(seq.recorde, 'dia', 'dias') + ' também.' + (voltam ? '' : ' Hoje é um bom dia para acender de novo.') + '</p>'
      + (voltam ? '<p class="reacender-caixa" data-pode-reacender="' + voltam + '"><b>Você pode reacender a chama</b>'
        + '<small>Leia hoje e os seus ' + voltam + ' dias seguidos voltam. Vale uma vez por mês.</small></p>' : '')
      + '</div>'
      + '<div class="acoes">' + (voltam ? '<button class="botao" data-ler data-reacender>Reacender lendo hoje</button>' : '<button class="botao" data-ler>Reavivar hoje</button>')
      + '<button class="botao plano" data-fechar>Agora não</button></div>',
    {
      rotulo: 'Recomeçar',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-ler]').onclick = () => { fechar(); if (voltam) reacender(); else CC.abrirLicao(CC.diaAtual()); };
      },
    });
  }

  // R1.4: grava o reacender de hoje, se ainda vale e se hoje já tem leitura (senão, false). A
  // chave é o mês: um por mês, e a fusão fica com a data mais antiga (02-estado.js).
  CC.registrarReacender = () => {
    const hoje = CC.hojeIso();
    if (!CC.datasFeitas().has(hoje) || !CC.reacenderPossivel()) return false;
    CC.gravar('reacesoEm', { ...CC.ler('reacesoEm', {}), [hoje.slice(0, 7)]: hoje });
    return true;
  };

  // "Reacender lendo hoje". Quem já leu hoje reacende na hora; quem não leu deixa o pedido neste
  // aparelho (cc.reacender.pedido, "dono:hoje") e vai para a leitura de hoje: a tela do Dia lido
  // (dia-lido.js) o cumpre quando o dia de hoje é lido.
  function reacender() {
    if (!CC.reacenderPossivel()) { CC.avisar('Este mês a chama já foi reacesa.'); return; }
    if (CC.registrarReacender()) {
      CC.avisar('A chama voltou: ' + CC.plural(CC.sequencia().atual, 'dia seguido', 'dias seguidos') + '!');
      if (CC.redesenhar) CC.redesenhar();
      if (CC.pintarTopo) CC.pintarTopo();
      return;
    }
    try { localStorage.setItem('cc.reacender.pedido', (CC.estado().dono || '') + ':' + CC.hojeIso()); } catch (e) { /* segue */ }
    CC.abrirLicao(CC.diaAtual());
  }

  CC.chama = { avisoEscudo, folhaDeVolta, reacender };
})(window.CC);
