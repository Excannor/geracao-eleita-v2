/* Quem atrasou volta sem culpa (R2, docs/fases/r2-volta-sem-culpa.md). Peça sob demanda: o
   index.html tem teto de 1 MB. R2.1: "Ficar em dia" em dois caminhos para quem está atrás da
   célula (com a célula, o padrão; ou no meu ritmo) e os dias pendentes. A Trilha (03-trilha.js)
   pede esta peça só quando a pessoa está 2 dias ou mais atrás da célula ou já pulou alguma vez;
   a conta do dia em que ela está mora em 02-estado.js (CC.diaDoPlano). */
(function (CC) {
  'use strict';

  const D = CC.D;
  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-volta]')) {
    const s = document.createElement('style');
    s.dataset.volta = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  // Os dias pendentes: os do plano antes do dia para onde a pessoa pulou que ainda não foram
  // lidos. Não são guardados: saem do estado, iguais em todo aparelho. Lido um deles (no app ou
  // no papel), ele sai da lista como qualquer dia lido.
  const pendentes = (e) => {
    e = e || CC.estado();
    const lidos = new Set((e.lidos || []).map(Number));
    const saida = [];
    for (let n = 1; n < (e.pulouPara || 0); n++) if (!lidos.has(n)) saida.push(n);
    return saida;
  };

  // "No meu ritmo" vale por 7 dias neste aparelho: o convite não volta todo dia (seria cobrança).
  // A marca é da conta ("dono:até"), como as outras marcas de aviso.
  const CHAVE_RITMO = 'cc.volta.ritmo';
  const DIAS_NO_MEU_RITMO = 7;
  const dono = () => (CC.estado().dono || '');
  const noMeuRitmo = () => {
    let m = '';
    try { m = localStorage.getItem(CHAVE_RITMO) || ''; } catch (e) { return false; }
    return m.startsWith(dono() + ':') && m.slice(dono().length + 1) >= CC.hojeIso();
  };
  const escolherMeuRitmo = () => {
    try { localStorage.setItem(CHAVE_RITMO, dono() + ':' + CC.somaDias(CC.hojeIso(), DIAS_NO_MEU_RITMO - 1)); } catch (e) { /* segue */ }
  };

  // Para quem a peça oferece o "Ficar em dia": 2 dias ou mais atrás do dia da célula.
  const ATRASO_MINIMO = 2;
  const atrasado = (atual, cel) => cel - atual >= ATRASO_MINIMO;

  const intervalo = (de, ate) => (ate <= de ? 'o dia ' + de : (ate === de + 1 ? 'os dias ' + de + ' e ' + ate : 'os dias ' + de + ' a ' + ate));

  // Pula para o dia da célula. Só muda o dia em que a pessoa está: nada é marcado como lido, e as
  // datas, a chama, os baús e as cartas seguem só o que foi lido de verdade.
  function pularParaACelula(cel) {
    const n = Math.min(Math.max(1, Number(cel) || 1), D.plano.length);
    CC.gravar('pulouPara', Math.max(CC.ler('pulouPara', 0) || 0, n));
    CC.gravar('dia', n);
    return n;
  }

  // A folha dos dois caminhos. "Com a célula" vem marcado: é o padrão para quem tem célula.
  function folhaFicarEmDia(atual, cel) {
    const ate = cel - 1;
    CC.folha('<div class="ficar-em-dia" data-ficar-em-dia-folha>'
      + '<h2>Ficar em dia</h2>'
      + '<p class="sem-culpa">Perder um dia não é perder a Palavra. Escolha como seguir:</p>'
      + '<div class="caminhos" role="radiogroup" aria-label="Como seguir">'
      + '<label class="caminho"><input type="radio" name="caminho" value="celula" checked>'
      + '<span class="textos-caminho"><b>Com a célula <small class="selo-padrao">Recomendado</small></b>'
      + '<span>Vá para o dia ' + cel + ', o que a sua célula está lendo. ' + intervalo(atual, ate).replace(/^./, (c) => c.toUpperCase())
      + (ate > atual ? ' ficam pendentes' : ' fica pendente') + ': sem cobrança, para ler quando quiser.</span></span></label>'
      + '<label class="caminho"><input type="radio" name="caminho" value="ritmo">'
      + '<span class="textos-caminho"><b>No meu ritmo</b><span>Continue do dia ' + atual + ', de onde você parou.</span></span></label>'
      + '</div>'
      + '<p class="passo-dica pequena">Um dia pendente só conta como lido depois que você o lê. A chama segue os dias em que você lê, qualquer que seja o dia do plano.</p>'
      + '</div>'
      + '<div class="acoes"><button class="botao" data-seguir>Continuar</button><button class="botao plano" data-fechar>Agora não</button></div>',
    {
      rotulo: 'Ficar em dia',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-seguir]').onclick = () => {
          const escolha = (folha.querySelector('input[name="caminho"]:checked') || {}).value;
          fechar();
          if (escolha === 'ritmo') {
            escolherMeuRitmo();
            CC.avisar('Tudo bem. Siga do dia ' + atual + ', no seu ritmo.');
            CC.redesenhar();
            return;
          }
          const n = pularParaACelula(cel);
          CC.avisar('Pronto: você está no dia ' + n + ', com a sua célula.');
          CC.redesenhar();
          requestAnimationFrame(() => { if (CC.rolarAteAtual) CC.rolarAteAtual(true); });
        };
      },
    });
  }

  // A lista dos pendentes, do mais antigo para o mais novo. Uma lista comprida (quem pulou muito)
  // mostra os primeiros e diz quantos faltam.
  const MOSTRAR = 30;
  function folhaPendentes() {
    const lista = pendentes();
    if (!lista.length) { CC.avisar('Nenhum dia pendente. Tudo em dia!'); return; }
    const itens = lista.slice(0, MOSTRAR).map((n) => {
      const dia = D.plano[n - 1];
      return '<li><button class="pendente-item" data-ler-pendente="' + n + '">'
        + '<span class="textos-pendente"><b>Dia ' + n + '</b><span>' + CC.esc(CC.colarRef(CC.passagemDe(dia))) + '</span></span>'
        + '<small>' + CC.minutosDoDia(dia) + ' min</small>' + CC.ico('avancar') + '</button></li>';
    }).join('');
    CC.folha('<div class="pendentes" data-pendentes-folha="' + lista.length + '">'
      + '<h2>' + (lista.length === 1 ? '1 dia pendente' : lista.length + ' dias pendentes') + '</h2>'
      + '<p>Os dias que ficaram para trás quando você foi ler com a célula. Sem pressa e sem cobrança: leia quando quiser.</p>'
      + '<ul class="lista-pendentes">' + itens + '</ul>'
      + (lista.length > MOSTRAR ? '<p class="passo-dica pequena">E mais ' + (lista.length - MOSTRAR) + ' depois destes.</p>' : '')
      + '</div>'
      + '<div class="acoes"><button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Dias pendentes',
      rolavel: true,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-ler-pendente]').forEach((b) => {
          b.onclick = () => { fechar(); CC.abrirLicao(Number(b.dataset.lerPendente)); };
        });
      },
    });
  }

  // Por cima da Trilha já desenhada (03-trilha.js chama depois de cada desenho): o cartão do
  // "Ficar em dia" logo abaixo do "Ler hoje", a linha dos pendentes e a marca nos nós pendentes.
  function trilha(raiz, atual, cel) {
    const folha = raiz.querySelector('.folha-topo');
    if (!folha || folha.querySelector('[data-ficar-em-dia], [data-pendentes]')) return;
    const depois = folha.querySelector('.ler-hoje');
    const lista = pendentes();
    let html = '';
    if (atrasado(atual, cel) && !noMeuRitmo()) {
      html += '<button class="cartao-ficar-em-dia" data-ficar-em-dia="' + cel + '">'
        + '<span class="redondo-volta" aria-hidden="true">' + CC.ico('pessoas') + '</span>'
        + '<span class="textos-volta"><b>Ficar em dia com a célula</b>'
        + '<span>Ela está no dia ' + cel + '. Perder um dia não é perder a Palavra.</span></span>' + CC.ico('avancar') + '</button>';
    }
    if (lista.length) {
      html += '<button class="linha-pendentes" data-pendentes="' + lista.length + '">' + CC.ico('calendario')
        + '<span><b>' + (lista.length === 1 ? '1 dia pendente' : lista.length + ' dias pendentes') + '</b> · sem pressa</span>' + CC.ico('direita') + '</button>';
    }
    if (html && depois) {
      depois.insertAdjacentHTML('afterend', html);
      const ficar = folha.querySelector('[data-ficar-em-dia]');
      if (ficar) ficar.onclick = () => folhaFicarEmDia(atual, cel);
      const pend = folha.querySelector('[data-pendentes]');
      if (pend) pend.onclick = folhaPendentes;
    }
    const sao = new Set(lista);
    raiz.querySelectorAll('.no[data-dia]').forEach((b) => {
      const n = Number(b.dataset.dia);
      if (!sao.has(n) || b.classList.contains('pendente')) return;
      b.classList.add('pendente');
      b.setAttribute('aria-label', b.getAttribute('aria-label') + ', pendente');
    });
  }

  // Para o Dia lido (dia-lido.js): depois de ler um pendente, o que vem a seguir é o dia em que a
  // pessoa está com a célula, e não o dia seguinte ao pendente (outro pendente).
  CC.volta = { trilha, folhaFicarEmDia, folhaPendentes, pendentes, pularParaACelula, atrasado, ATRASO_MINIMO, DIAS_NO_MEU_RITMO };
})(window.CC);
