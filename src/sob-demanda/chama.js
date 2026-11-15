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

  CC.chama = { avisoEscudo };
})(window.CC);
