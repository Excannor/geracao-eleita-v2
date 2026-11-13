/* Minha história com Deus (#/perfil/historia): peça sob demanda, pedida pela casca em
   07-perfil.js (CC.cascaDaPeca). O index.html tem piso de folga, e esta tela é de poucos. */
(function (CC) {
  'use strict';

  // ---------- Minha história com Deus ----------
  // Guia privado: nunca sai daqui, para amigo, célula, discipulado nem painel (só volta pela
  // própria conta da pessoa, em api/estado). Três campos livres, com autosalvamento, como o
  // "Escrever sobre hoje" da lição (04-licao.js). Entra pelo cartão fixo no topo de Minhas
  // anotações (07g-anotacoes.js), e o voltar leva de volta para lá.
  // 1 Pedro 3.15 na NBV, palavra por palavra (conteudo/biblias/nbv.json; teste-anotacoes confere).
  const VERSO_HISTORIA = 'Entreguem-se aos cuidados de Cristo, seu Senhor, e se alguém perguntar acerca da esperança que vocês têm, '
    + 'estejam preparados para contar-lhe, e façam-no de uma maneira amável e respeitosa.';
  const CAMPOS_HISTORIA = [
    ['antes', 'Antes: como era a sua vida? O que você buscava?'],
    ['encontro', 'O encontro: como você conheceu Jesus? Quem estava por perto?'],
    ['hoje', 'Hoje: o que mudou? Conte uma coisa concreta.'],
  ];
  const MAX_HISTORIA = 600;

  function campoHistoria(chave, pergunta, valor) {
    return '<div class="campo"><label for="campo-historia-' + chave + '">' + CC.esc(pergunta) + '</label>'
      + '<textarea id="campo-historia-' + chave + '" data-campo="' + chave + '" maxlength="' + MAX_HISTORIA
      + '" rows="4" autocomplete="off" autocapitalize="sentences">' + CC.esc(valor || '') + '</textarea>'
      + '<p class="passo-dica pequena" data-conta="' + chave + '"></p></div>';
  }

  CC.historiaTela = function (raiz) {
    const h = CC.minhaHistoria() || {};
    raiz.innerHTML = '<div class="folha-perfil titulo-frase">' + CC.botaoVoltar('Minhas anotações')
      + '<h1>Minha história com Deus</h1>'
      + '<p class="passo-dica">Contar o que Deus fez na sua vida é um jeito simples de falar de Jesus. Se você cresceu na igreja, conte quando a fé passou a ser sua.</p></div>'
      + '<blockquote class="verso-historia"><p>“' + VERSO_HISTORIA + '”</p><cite>1 Pedro 3.15</cite></blockquote>'
      + '<span class="selo-status" id="salvo-historia" role="status"></span>'
      + CAMPOS_HISTORIA.map(([chave, pergunta]) => campoHistoria(chave, pergunta, h[chave])).join('')
      + '<p class="passo-dica pequena">Use palavras suas, sem termos de igreja.</p>'
      + '<div class="acoes"><button class="botao contorno pequeno" data-copiar>' + CC.ico('compartilhar') + 'Copiar minha história</button></div>';

    const conta = (chave) => {
      const campo = raiz.querySelector('[data-campo="' + chave + '"]');
      const nota = raiz.querySelector('[data-conta="' + chave + '"]');
      if (campo && nota) nota.textContent = CC.pertoDoLimite(campo.value.length, MAX_HISTORIA) ? campo.value.length + ' de ' + MAX_HISTORIA + ' caracteres' : '';
    };
    const salvo = raiz.querySelector('#salvo-historia');
    const salvar = () => {
      const v = (chave) => (raiz.querySelector('[data-campo="' + chave + '"]') || {}).value || '';
      CC.gravarHistoria(v('antes'), v('encontro'), v('hoje'));
      if (salvo) { salvo.classList.add('leu'); salvo.innerHTML = CC.ico('certo') + 'Salvo'; }
    };
    CAMPOS_HISTORIA.forEach(([chave]) => {
      conta(chave);
      const campo = raiz.querySelector('[data-campo="' + chave + '"]');
      campo.addEventListener('input', () => { conta(chave); salvar(); });
    });
    raiz.querySelector('[data-copiar]').onclick = async () => {
      const atual = CC.minhaHistoria() || {};
      const texto = ['antes', 'encontro', 'hoje'].map((c) => atual[c] || '').filter(Boolean).join('\n\n');
      if (!texto) { CC.avisar('Escreva sua história antes de copiar.'); return; }
      CC.avisar((await CC.copiar(texto)) ? 'História copiada' : 'Não consegui copiar');
    };
  };
})(window.CC);
