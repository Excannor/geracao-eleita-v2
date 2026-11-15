/* Quem atrasou volta sem culpa (R2, docs/fases/r2-volta-sem-culpa.md). Peça sob demanda: o
   index.html tem teto de 1 MB. R2.1: "Ficar em dia" em dois caminhos para quem está atrás da
   célula (com a célula, o padrão; ou no meu ritmo) e os dias pendentes. A Trilha (03-trilha.js)
   pede esta peça só quando a pessoa está 2 dias ou mais atrás da célula ou já pulou alguma vez;
   a conta do dia em que ela está mora em 02-estado.js (CC.diaDoPlano). R2.2b: o dia 0, a primeira
   leitura curta antes do dia 1 do plano, para quem nunca leu nada. */
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

  // ---------- R2.2b: o dia 0 ----------
  // "No começo": o dia 1 do Conhecer Jesus (Gênesis 1.1 a 2.3, uns 4 minutos), reaproveitado inteiro
  // (o trecho, a abertura, o "Onde estamos", o "Repare", a pergunta e a frase para falar com Deus).
  // Só para quem nunca leu nada: nenhuma data com a Palavra e o dia 1 do plano não lido. A leitura
  // segue a regra do plano (o leitor destrava "Terminei a leitura" no fim do texto e com um terço do
  // tempo), e "Li na minha Bíblia" também vale. Lido, grava diaZero (a data de hoje): acende a chama
  // e conta como dia com a Palavra, mas não é dia do plano (02-estado.js, CC.datasFeitas).
  const diaZeroDe = () => { const d = ((D.conhecer || {}).dias || [])[0]; return d ? { ...d, numero: 0 } : null; };
  const podeDiaZero = () => !!diaZeroDe() && !CC.diasComAPalavra() && !CC.leu(1) && !CC.ler('diaZero', '');
  const minutosZero = (dia) => Math.max(3, Math.round(dia.trechos.reduce((n, t) => n + (t.palavras || 0), 0) / (CC.PALAVRAS_POR_MINUTO || 200)) || 4);
  const refZero = (dia) => CC.colarRef(dia.trechos.map((t) => CC.escreverRef(t.livro, t.cap, t.de, t.ate)).join(' e '));

  function telaDiaZero() {
    const dia = diaZeroDe();
    if (!dia) return;
    const minutos = minutosZero(dia);
    const primeiro = String((CC.apelido && CC.apelido()) || (CC.quem || {}).nome || '').trim().split(/\s+/)[0];
    let lida = false;
    const { el, fechar } = CC.telaCheia('<div class="dia-zero" data-dia-zero-tela></div>', { classe: 'tela-dia-zero c-azul', rotulo: 'Dia 0: ' + dia.titulo, fecharAoNavegar: true });
    const palco = el.querySelector('[data-dia-zero-tela]');
    const desenhar = () => {
      const feito = !!CC.ler('diaZero', '');
      const seq = CC.sequencia();
      const dia1 = D.plano[0];
      palco.innerHTML = (feito
        ? '<div class="festa-zero" data-dia-zero-feito>' + CC.icoChama(seq.atual)
          + '<h1>Seu primeiro dia com a Palavra!</h1>'
          + '<p class="linha-zero">A chama acendeu: ' + CC.plural(seq.atual, 'dia', 'dias') + '. Agora é um dia de cada vez' + (primeiro ? ', ' + CC.esc(primeiro) : '') + '.</p></div>'
          + '<section class="etapa-reflexao"><span class="etiqueta">Repare</span><p>' + CC.esc(dia.repare) + '</p></section>'
          + '<section class="etapa-reflexao"><div class="pensamento-dia"><p>' + CC.esc(dia.pergunta) + '</p></div></section>'
          + '<section class="etapa-reflexao"><h2>Se quiser, fale com Deus:</h2><ul class="oracao-guia"><li>' + CC.esc(dia.conversa) + '</li></ul></section>'
          + '<p class="amanha-zero" data-amanha-zero><b>Amanhã: Dia 1 do plano</b><span>' + CC.esc(CC.colarRef(CC.passagemDe(dia1))) + ', uns ' + CC.minutosDoDia(dia1) + ' min</span></p>'
        : '<span class="etiqueta">Antes do dia 1 · uns ' + minutos + ' minutos</span>'
          + '<h1>' + CC.esc(dia.titulo) + '</h1>'
          + '<p class="passo-dica">' + CC.esc(dia.abertura) + '</p>'
          + '<div class="leitura-hoje"><span class="etiqueta">O que você vai ler</span><span class="passagem-hoje">' + CC.esc(refZero(dia)) + '</span>'
          + '<span class="tempo">uns ' + minutos + ' minutos</span></div>'
          + (CC.cartaoOndeEstamosConhecer ? CC.cartaoOndeEstamosConhecer(dia) : ''));
      const pe = el.querySelector('.tela-cheia-pe') || el.appendChild(Object.assign(document.createElement('div'), { className: 'tela-cheia-pe' }));
      pe.innerHTML = feito ? '<button class="botao" data-voltar-zero>Voltar à trilha</button>'
        : '<button class="botao" data-ler-zero>Ler</button><button class="botao plano" data-sair-zero>Agora não</button>';
      const ler = pe.querySelector('[data-ler-zero]');
      if (ler) ler.onclick = abrirLeitor;
      const sair = pe.querySelector('[data-sair-zero]');
      if (sair) sair.onclick = fechar;
      const voltar = pe.querySelector('[data-voltar-zero]');
      if (voltar) voltar.onclick = () => {
        fechar();
        CC.redesenhar();
        // o primeiro dia feito: agora sim, instalar e lembretes (como depois do primeiro Dia lido)
        if (CC.depoisDoPrimeiroDia) CC.depoisDoPrimeiroDia();
      };
      if (feito && CC.arte && CC.arte.confete) CC.arte.confete(palco, 26);
      // a festa começa do alto (a chama), e não de onde a pessoa estava antes de ler
      const alto = () => { el.scrollTop = 0; const r = el.querySelector('.tela-cheia-palco'); if (r) r.scrollTop = 0; };
      alto();
      requestAnimationFrame(alto);
      setTimeout(alto, 400);
    };
    const liberar = () => {
      if (lida) return;
      lida = true;
      if (!CC.ler('diaZero', '') && !CC.datasFeitas().size) CC.gravar('diaZero', CC.hojeIso());
      desenhar();
      if (CC.pintarTopo) CC.pintarTopo();
    };
    function abrirLeitor() {
      CC.abrirLeitor({
        dia, chave: 'dia', trilhas: [['dia', 'Antes do dia 1', dia.titulo]], cor: 'azul', conhecer: true,
        lida: () => lida, minutos: () => minutos, marcar: liberar, papel: liberar,
      });
    }
    desenhar();
  }

  // Por cima da Trilha já desenhada (03-trilha.js chama depois de cada desenho): o cartão do
  // "Ficar em dia" logo abaixo do "Ler hoje", a linha dos pendentes e a marca nos nós pendentes.
  function trilha(raiz, atual, cel) {
    const folha = raiz.querySelector('.folha-topo');
    if (!folha || folha.querySelector('[data-ficar-em-dia], [data-pendentes], [data-dia-zero]') || !folha.querySelector('.ler-hoje')) return;
    const depois = folha.querySelector('.ler-hoje');
    const lista = pendentes();
    let html = '';
    if (atrasado(atual, cel) && !noMeuRitmo()) {
      html += '<button class="cartao-ficar-em-dia" data-ficar-em-dia="' + cel + '">'
        + '<span class="redondo-volta" aria-hidden="true">' + CC.ico('pessoas') + '</span>'
        + '<span class="textos-volta"><b>Ficar em dia com a célula</b>'
        + '<span>Ela está no dia ' + cel + '. Perder um dia não é perder a Palavra.</span></span>' + CC.ico('avancar') + '</button>';
    }
    // R2.2b: o convite do dia 0 vem antes do "Ler hoje" (o dia 1 continua ali, para quem preferir)
    if (podeDiaZero() && !folha.querySelector('[data-dia-zero]')) {
      const dia = diaZeroDe();
      folha.querySelector('.ler-hoje').insertAdjacentHTML('beforebegin', '<button class="cartao-dia-zero" data-dia-zero>'
        + '<span class="redondo-volta" aria-hidden="true">' + CC.ico('folha') + '</span>'
        + '<span class="textos-volta"><b>Comece aqui: ' + CC.esc(dia.titulo) + '</b>'
        + '<span>' + CC.esc(refZero(dia)) + ', uns ' + minutosZero(dia) + ' minutos, antes do dia 1</span></span>' + CC.ico('avancar') + '</button>');
      folha.querySelector('[data-dia-zero]').onclick = telaDiaZero;
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
  CC.volta = { trilha, folhaFicarEmDia, folhaPendentes, pendentes, pularParaACelula, atrasado, ATRASO_MINIMO, DIAS_NO_MEU_RITMO, telaDiaZero, podeDiaZero };
})(window.CC);
