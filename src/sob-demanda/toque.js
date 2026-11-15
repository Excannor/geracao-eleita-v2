/* O toque com versículo (R1.5, docs/fases/r1-chama-que-perdoa.md): um toque por dia por amigo, e
   sempre com um versículo junto. Mora fora do index.html (ele tem teto de 1 MB). Quem dá o toque
   escolhe o versículo: o da leitura de hoje, ou um dos de encorajamento (CC.VERSOS_DO_TOQUE, a
   mesma lista que o servidor usa quando o toque chega sem um). Só a referência viaja; o texto vem
   da Bíblia do app, palavra por palavra. */
(function (CC) {
  'use strict';

  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-toque]')) {
    const s = document.createElement('style');
    s.dataset.toque = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  // O versículo da leitura de hoje (o dia do plano marcado hoje), e depois os de encorajamento.
  function opcoes() {
    const hoje = CC.hojeIso();
    const lido = Object.entries(CC.ler('marcadoEm', {})).filter(([, d]) => d === hoje).map(([k]) => Number(k)).sort((a, b) => b - a)[0];
    const daLeitura = lido && CC.reflexaoDoDia ? CC.reflexaoDoDia(lido).ref : '';
    return [...new Set([daLeitura, ...CC.VERSOS_DO_TOQUE].filter(Boolean))];
  }

  const primeiro = (nome) => CC.esc(String(nome || '').split(' ')[0]);
  const citar = (alvo, ref) => {
    CC.textoDoVersiculo(ref).then((t) => {
      const el = alvo.querySelector('[data-texto-verso]');
      if (el && el.dataset.ref === ref) el.textContent = t || '';
    });
    return '<blockquote class="verso-toque-citacao"><b>' + CC.esc(ref) + '</b><span data-texto-verso data-ref="' + CC.esc(ref) + '"></span></blockquote>';
  };

  // A escolha do versículo dentro de um elemento; devolve { ref() } com o escolhido.
  function cartao(el) {
    const lista = opcoes();
    let i = 0;
    const pintar = () => {
      el.innerHTML = '<span class="etiqueta">Junto vai este versículo</span>' + citar(el, lista[i])
        + (lista.length > 1 ? '<button type="button" class="link-inline" data-outro-verso>Outro versículo</button>' : '');
      const outro = el.querySelector('[data-outro-verso]');
      if (outro) outro.onclick = () => { i = (i + 1) % lista.length; pintar(); };
    };
    el.classList.add('verso-toque');
    pintar();
    return { ref: () => lista[i] };
  }

  // Manda o toque. Devolve 'enviado' ou 'ja' (o servidor guarda um por dia por amigo).
  async function enviar(usuario, ref) {
    await CC.salvarNoServidor();
    const r = await CC.api('api/toques', { para: usuario, versiculo: ref || '' });
    return r.resultado;
  }

  // A folha rápida (Desafios, Dia lido): para quem vai, o versículo e "Enviar o toque".
  // depois(resultado) é chamado com 'enviado' ou 'ja'.
  function folha(amigo, depois) {
    if (amigo.toqueEnviado) { CC.avisar('Você já tocou hoje em ' + primeiro(amigo.nome) + '.'); if (depois) depois('ja'); return; }
    let verso;
    CC.folha('<h2>Dar um toque em ' + primeiro(amigo.nome) + '</h2>'
      + '<p class="passo-dica">' + primeiro(amigo.nome) + ' recebe um aviso no celular, com o versículo. Um toque por dia.</p>'
      + '<div data-verso-toque></div>'
      + '<div class="acoes"><button class="botao" data-enviar-toque>' + CC.ico('sino') + 'Enviar o toque</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Dar um toque',
      ligar: (f, fechar) => {
        verso = cartao(f.querySelector('[data-verso-toque]'));
        f.querySelector('[data-fechar]').onclick = fechar;
        const b = f.querySelector('[data-enviar-toque]');
        b.onclick = async () => {
          b.disabled = true;
          try {
            const r = await enviar(amigo.usuario, verso.ref());
            amigo.toqueEnviado = true;
            fechar();
            CC.avisar(r === 'ja' ? 'Você já tocou hoje em ' + primeiro(amigo.nome) + '.' : 'Toque enviado, com ' + verso.ref() + '.', { tipo: 'certo' });
            if (depois) depois(r);
          } catch (e) {
            b.disabled = false;
            CC.avisar(e.message);
          }
        };
      },
    });
  }

  // Quem recebe: o versículo que veio com o toque.
  function recebido(el, toque) {
    if (!el || !toque || !toque.versiculo) return;
    el.classList.add('verso-toque', 'recebido');
    el.innerHTML = '<span class="etiqueta">' + primeiro(toque.nome) + ' mandou junto</span>' + citar(el, toque.versiculo);
  }

  CC.toque = { opcoes, cartao, enviar, folha, recebido };
})(window.CC);
