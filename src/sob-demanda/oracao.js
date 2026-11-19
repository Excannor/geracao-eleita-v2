/* A aba Oração da célula (Atos 2.42; 2.44-45), com a lista de oração da R4.2
   (docs/r4-celula.md). Peça sob demanda: saiu do index.html (08b-propositos.js) para devolver a
   folga dele; o index pede a peça quando a aba abre e passa o que ela usa da célula.
   Sem chat: o pedido é só do autor, os outros só reagem com um gesto sem texto. "Estou orando"
   aparece só como número para todos, nunca com nomes. O autor escreve atualizações e marca
   "Deus respondeu", e a oração respondida vai para "Respondidas". Nada disto vai para o Feed,
   nada vale XP. As regras (quem vê, limites, filtro, denúncia) moram no servidor (cuidado.mjs,
   filtro-texto.mjs, contas.mjs); aqui só desenha e liga os botões. */
(function (CC) {
  'use strict';

  const ESTILO = '/*ESTILO_PECA*/';
  if (!document.querySelector('style[data-oracao]')) {
    const s = document.createElement('style');
    s.dataset.oracao = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  const cache = {}; // por id de célula
  const MOTIVO_PERIGO = 'Alguém pode estar em perigo';
  // Texto fixo da Fase 4 (seção 5): mostrado inteiro assim que alguém denuncia por perigo.
  const AJUDA_PERIGO_DENUNCIA = 'Se você ou alguém está em perigo, se machucando ou pensando em se machucar, '
    + 'não espere: fale agora com um adulto de confiança ou ligue 188 (CVV), a qualquer hora. Se for abuso ou violência, ligue 100. Em emergência, 192 (SAMU) ou 190 (Polícia).';
  // Para quem conduz, junto da denúncia de perigo.
  const AJUDA_PERIGO_CONDUZ = 'Procure a pessoa hoje e avise o pastor ou um responsável da igreja. '
    + 'Se for abuso ou violência, ligue 100. Em emergência, 192 (SAMU) ou 190 (Polícia). Não tente resolver isso sem ajuda.';
  const TEXTO_MAX_PEDIDO = { oracao: 280, necessidade: 200 };
  const ATUALIZACAO_MAX = 200;
  const ATUALIZACOES_MAX = 5;
  // Quantas atualizações aparecem abertas antes do "Ver mais".
  const ATUALIZACOES_ABERTAS = 2;

  const ddmm = (iso) => String(iso || '').slice(8, 10) + '/' + String(iso || '').slice(5, 7);
  const contagem = (n) => (n === 1 ? '1 pessoa está orando' : n + ' pessoas estão orando');

  let A = null; // { enderecoCelula }
  const carregar = (celulaId) => CC.api('api/cuidado?celula=' + encodeURIComponent(celulaId))
    .then((d) => { cache[celulaId] = d; return d; }).catch(() => null);

  function linhasDeAtualizacao(item) {
    const lista = item.atualizacoes || [];
    if (!lista.length) return '';
    const linha = (u, escondida) => '<li' + (escondida ? ' hidden data-atualizacao-escondida' : '') + '><small>' + ddmm(u.em) + '</small> '
      + CC.esc(u.texto)
      + (item.meu ? '<button type="button" class="botao-icone apagar-atualizacao" data-apagar-atualizacao="' + CC.esc(item.id) + '" data-ordem="' + u.ordem + '" aria-label="Apagar a atualização de ' + ddmm(u.em) + '">' + CC.ico('fechar') + '</button>' : '')
      + '</li>';
    const sobra = lista.length - ATUALIZACOES_ABERTAS;
    return '<ul class="oracao-atualizacoes">' + lista.map((u, i) => linha(u, i >= ATUALIZACOES_ABERTAS)).join('') + '</ul>'
      + (sobra > 0 ? '<button type="button" class="botao plano pequeno" data-ver-atualizacoes>Ver mais ' + sobra + '</button>' : '');
  }

  function cartaoPedido(item, conduzo) {
    const necessidade = item.tipo === 'necessidade';
    const respondida = item.respondido && !necessidade;
    const quem = item.meu ? 'Você' : CC.esc(item.autor.nome);
    const rotulo = necessidade ? 'Pedido de ajuda' : (item.destino === 'conduz' ? 'Pedido de oração · só quem conduz' : 'Pedido de oração');
    let html = '<div class="cartao-proposito cartao-pedido' + (respondida ? ' respondida' : '') + '" data-pedido="' + CC.esc(item.id) + '" style="cursor:default">'
      + '<div class="quem-amigo"><b>' + quem + '</b><span class="arroba">' + rotulo + '</span></div>'
      + '<p>' + CC.esc(item.texto) + '</p>'
      + (respondida ? '<p class="selo-status leu">' + CC.ico('certo') + '<span>Deus respondeu em ' + ddmm(item.respondidoEm) + '</span></p>'
        : '<p class="passo-dica pequena">Vence em ' + ddmm(item.venceEm) + '</p>')
      + linhasDeAtualizacao(item)
      + (!necessidade && item.orando > 0 ? '<p class="oracao-contagem" data-contagem>' + CC.ico('aperto') + '<span>' + contagem(item.orando) + '</span></p>' : '');

    if (item.meu) {
      // Num pedido de ajuda (carona, mudança) "Deus respondeu" soa estranho: ali é "Já resolvi".
      const fimDoPedido = necessidade ? 'Já resolvi' : 'Deus respondeu';
      const ajudou = (item.gestos || []).filter((g) => g.gesto === 'ajudo');
      if (necessidade && ajudou.length) {
        const nomes = ajudou.map((g) => '<b>' + CC.esc(g.nome) + '</b>').join(', ');
        html += '<p class="selo-status leu">' + CC.ico('certo') + '<span>' + nomes + (ajudou.length === 1 ? ' pode ajudar' : ' podem ajudar') + '</span></p>';
      }
      if (respondida) {
        html += '<div class="pe-duplo-plano"><button class="botao plano perigo pequeno" data-apagar-pedido="' + CC.esc(item.id) + '">Apagar</button></div>';
      } else {
        const podeAtualizar = !item.respondido && (item.atualizacoes || []).length < ATUALIZACOES_MAX;
        html += '<div class="pe-duplo-plano oracao-acoes">'
          + (podeAtualizar ? '<button class="botao contorno pequeno" data-atualizar="' + CC.esc(item.id) + '">Atualizar</button>' : '')
          + (item.respondido ? '<span class="selo-status leu">' + CC.ico('certo') + fimDoPedido + '</span>'
            : '<button class="botao contorno pequeno" data-respondido="' + CC.esc(item.id) + '" data-fim="' + fimDoPedido + '">' + fimDoPedido + '</button>')
          + '<button class="botao plano perigo pequeno" data-apagar-pedido="' + CC.esc(item.id) + '">Apagar</button></div>';
      }
    } else {
      if (!respondida) {
        html += '<div class="pe-duplo-plano">'
          + (necessidade ? '' : '<button class="botao pequeno' + (item.euOro ? ' contorno' : '') + '" data-orando="' + CC.esc(item.id) + '" aria-pressed="' + !!item.euOro + '">'
            + (item.euOro ? CC.ico('certo') + 'Você está orando' : 'Estou orando') + '</button>')
          + (necessidade ? (item.ajudei ? '<span class="selo-status leu">' + CC.ico('certo') + 'Você disse que pode ajudar</span>'
            : '<button class="botao contorno pequeno" data-ajudo="' + CC.esc(item.id) + '">Posso ajudar</button>') : '')
          + '</div>';
      }
      // Menu discreto, como o de denunciar um amigo (08-amigos.js): não fica ao lado dos gestos,
      // para não parecer a mesma categoria de resposta. Quem conduz tira direto.
      html += '<div class="pe-duplo-plano">'
        + '<button class="botao plano pequeno" data-denunciar-pedido="' + CC.esc(item.id) + '">' + CC.ico('bandeira') + 'Denunciar</button>'
        + (conduzo ? '<button class="botao plano perigo pequeno" data-tirar-direto="' + CC.esc(item.id) + '">Tirar</button>' : '')
        + '</div>';
    }
    return html + '</div>';
  }

  // Quem conduz vê, no topo da aba, os pedidos com denúncia, à espera de uma decisão.
  function blocoRevisao(denuncias) {
    return CC.tituloSecao('Pedidos para rever', String(denuncias.length))
      + '<div class="lista-pedidos">' + denuncias.map((x) => '<div class="cartao-proposito" style="cursor:default">'
        + '<div class="quem-amigo"><b>' + CC.esc(x.autor) + '</b></div>'
        + '<p>' + CC.esc(x.texto) + '</p>'
        + '<p class="passo-dica pequena">' + CC.plural(x.total, 'denúncia', 'denúncias') + ' · ' + x.motivos.map((m) => CC.esc(m)).join(', ') + '</p>'
        + (x.motivos.includes(MOTIVO_PERIGO) ? '<div class="linha-ajuda">' + CC.ico('aperto') + '<p>' + AJUDA_PERIGO_CONDUZ + '</p></div>' : '')
        + '<div class="pe-duplo-plano"><button class="botao contorno pequeno" data-manter-pedido="' + CC.esc(x.pedido) + '">Manter</button>'
        + '<button class="botao plano perigo pequeno" data-tirar-pedido="' + CC.esc(x.pedido) + '">Tirar</button></div>'
        + '</div>').join('') + '</div>';
  }

  function desenhar(painel, p, d) {
    if (!d) { painel.innerHTML = '<div class="vazio-amigos">' + CC.ico('aperto') + '<p>Sem conexão. Tente de novo.</p></div>'; return; }
    const conduzo = p.euConduzo;
    const respondidas = d.respondidas || [];
    painel.innerHTML = '<div class="oracao-aba">'
      + (conduzo && d.denuncias && d.denuncias.length ? blocoRevisao(d.denuncias) : '')
      + '<div class="acoes"><button class="botao" data-pedir="oracao">' + CC.ico('aperto') + 'Pedir oração</button>'
      + '<button class="botao contorno" data-pedir="necessidade">Pedir ajuda</button></div>'
      + (d.pedidos.length
        ? '<div class="lista-pedidos" data-lista-pedidos>' + d.pedidos.map((x) => cartaoPedido(x, conduzo)).join('') + '</div>'
        : '<div class="vazio-amigos">' + CC.ico('aperto') + '<p>Nenhum pedido agora. Quando alguém pedir oração, aparece aqui.</p></div>')
      + (respondidas.length ? CC.tituloSecao('Respondidas', String(respondidas.length))
        + '<div class="lista-pedidos" data-respondidas>' + respondidas.map((x) => cartaoPedido(x, conduzo)).join('') + '</div>' : '')
      + '</div>';
    ligar(painel, p);
  }

  async function recarregar(p) {
    const d = await carregar(p.id);
    if (location.hash !== A.enderecoCelula(p.id, 'oracao')) return;
    const painel = document.querySelector('.painel-celula');
    if (painel) desenhar(painel, p, d);
  }

  // Um botão que chama o servidor e redesenha a aba depois, com o erro (se houver) num aviso.
  const tocar = (b, fazer, p) => {
    b.onclick = async () => {
      b.disabled = true;
      try { await fazer(); } catch (e) { CC.avisar(e.message); }
      recarregar(p);
    };
  };

  function ligar(painel, p) {
    const todos = (sel, fn) => painel.querySelectorAll(sel).forEach(fn);
    todos('[data-pedir]', (b) => { b.onclick = () => folhaPedido(p, b.dataset.pedir); });
    todos('[data-orando]', (b) => tocar(b, () => CC.api('api/cuidado', { acao: 'orando', id: b.dataset.orando, sim: b.getAttribute('aria-pressed') !== 'true' }), p));
    todos('[data-ajudo]', (b) => tocar(b, async () => {
      await CC.api('api/cuidado', { acao: 'ajudo', id: b.dataset.ajudo });
      CC.avisar('Combinem pessoalmente ou no WhatsApp.');
    }, p));
    todos('[data-ver-atualizacoes]', (b) => {
      b.onclick = () => {
        b.closest('.cartao-pedido').querySelectorAll('[data-atualizacao-escondida]').forEach((li) => { li.hidden = false; });
        b.remove();
      };
    });
    todos('[data-atualizar]', (b) => {
      b.onclick = () => {
        const item = (cache[p.id].pedidos || []).find((x) => x.id === b.dataset.atualizar);
        if (item) folhaAtualizar(p, item);
      };
    });
    todos('[data-apagar-atualizacao]', (b) => {
      b.onclick = async () => {
        if (!await CC.confirmar({ titulo: 'Apagar a atualização?', texto: 'Ela sai do pedido.', acao: 'Apagar', perigo: true })) return;
        try { await CC.api('api/cuidado', { acao: 'apagarAtualizacao', id: b.dataset.apagarAtualizacao, ordem: Number(b.dataset.ordem) }); } catch (e) { CC.avisar(e.message); }
        recarregar(p);
      };
    });
    todos('[data-respondido]', (b) => {
      b.onclick = () => {
        const item = (cache[p.id].pedidos || []).find((x) => x.id === b.dataset.respondido);
        if (item) folhaRespondido(p, item, b.dataset.fim);
      };
    });
    todos('[data-apagar-pedido]', (b) => {
      b.onclick = async () => {
        if (!await CC.confirmar({ titulo: 'Apagar este pedido?', texto: 'Ninguém mais vê o pedido nem as atualizações.', acao: 'Apagar', perigo: true })) return;
        try { await CC.api('api/cuidado', { acao: 'apagar', id: b.dataset.apagarPedido }); CC.avisar('Pedido apagado'); } catch (e) { CC.avisar(e.message); }
        recarregar(p);
      };
    });
    todos('[data-denunciar-pedido]', (b) => {
      b.onclick = () => {
        const d = cache[p.id];
        const item = d && [...d.pedidos, ...(d.respondidas || [])].find((x) => x.id === b.dataset.denunciarPedido);
        if (item) folhaDenuncia(p, item);
      };
    });
    todos('[data-manter-pedido]', (b) => tocar(b, async () => {
      await CC.api('api/cuidado', { acao: 'decidir', id: b.dataset.manterPedido, manter: true });
      CC.avisar('Pedido mantido');
    }, p));
    const tirar = (b, chamada) => {
      b.onclick = async () => {
        if (!await CC.confirmar({ titulo: 'Tirar este pedido?', texto: 'O pedido some para todo mundo.', acao: 'Tirar', perigo: true })) return;
        try { await chamada(); CC.avisar('Pedido tirado'); } catch (e) { CC.avisar(e.message); }
        recarregar(p);
      };
    };
    todos('[data-tirar-pedido]', (b) => tirar(b, () => CC.api('api/cuidado', { acao: 'decidir', id: b.dataset.tirarPedido, manter: false })));
    todos('[data-tirar-direto]', (b) => tirar(b, () => CC.api('api/cuidado', { acao: 'tirar', id: b.dataset.tirarDireto })));
  }

  // Um campo de texto com o contador perto do limite e o erro do servidor embaixo.
  const campoComContador = (rotulo, max, dica) => '<label class="campo-senha"><span>' + rotulo + '</span>'
    + '<textarea data-texto maxlength="' + max + '" rows="3" autocomplete="off" autocapitalize="sentences"></textarea></label>'
    + '<p class="passo-dica pequena" data-conta></p>'
    + (dica ? '<p class="passo-dica pequena">' + dica + '</p>' : '')
    + '<p class="erro-proposito" role="alert" hidden></p>';
  function ligarContador(folha, max) {
    const campo = folha.querySelector('[data-texto]');
    const conta = () => { folha.querySelector('[data-conta]').textContent = CC.pertoDoLimite(campo.value.length, max) ? campo.value.length + ' de ' + max + ' caracteres' : ''; };
    campo.oninput = conta;
    conta();
    return campo;
  }
  async function enviarDaFolha(folha, botao, chamada) {
    const erro = folha.querySelector('.erro-proposito');
    botao.disabled = true;
    erro.hidden = true;
    try { await chamada(); return true; } catch (e) {
      erro.textContent = e.message;
      erro.hidden = false;
      botao.disabled = false;
      return false;
    }
  }

  function folhaAtualizar(p, item) {
    CC.folha('<h2>Atualizar o pedido</h2>'
      + '<p class="passo-dica oracao-original">' + CC.esc(item.texto) + '</p>'
      + campoComContador('O que mudou', ATUALIZACAO_MAX, '')
      + '<div class="acoes"><button class="botao" data-enviar>Salvar</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Atualizar o pedido',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const campo = ligarContador(folha, ATUALIZACAO_MAX);
        const enviar = folha.querySelector('[data-enviar]');
        enviar.onclick = async () => {
          if (await enviarDaFolha(folha, enviar, () => CC.api('api/cuidado', { acao: 'atualizar', id: item.id, texto: campo.value }))) {
            fechar();
            CC.avisar('Pedido atualizado');
            recarregar(p);
          }
        };
      },
    });
  }

  function folhaRespondido(p, item, fim) {
    const oracao = item.tipo === 'oracao';
    CC.folha('<h2>Marcar "' + CC.esc(fim) + '"?</h2>'
      + '<p>' + (oracao ? 'O pedido vai para Respondidas.' : 'O pedido some da lista dos outros, e some da sua em 7 dias.') + '</p>'
      + (oracao ? campoComContador('Como Deus respondeu', ATUALIZACAO_MAX, '') : '<p class="erro-proposito" role="alert" hidden></p>')
      + '<div class="acoes"><button class="botao" data-enviar>Marcar</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Marcar ' + fim,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const campo = oracao ? ligarContador(folha, ATUALIZACAO_MAX) : null;
        const enviar = folha.querySelector('[data-enviar]');
        enviar.onclick = async () => {
          const corpo = { acao: 'respondido', id: item.id };
          if (campo && campo.value.trim()) corpo.texto = campo.value;
          if (await enviarDaFolha(folha, enviar, () => CC.api('api/cuidado', corpo))) {
            fechar();
            CC.avisar(oracao ? 'Pedido em Respondidas' : 'Pedido marcado como resolvido');
            recarregar(p);
          }
        };
      },
    });
  }

  function folhaPedido(p, tipo) {
    const max = TEXTO_MAX_PEDIDO[tipo] || TEXTO_MAX_PEDIDO.oracao;
    const oracao = tipo === 'oracao';
    const titulo = oracao ? 'Pedir oração' : 'Pedir ajuda';
    let destino = 'celula';
    let dias = 7;
    CC.folha('<h2>' + titulo + '</h2>'
      + '<div class="linha-ajuda">' + CC.ico('aperto') + '<p>Em perigo ou pensando em se machucar? Ligue <b>188 (CVV)</b> ou fale com um adulto de confiança agora. Se for abuso ou violência, ligue <b>100</b>.</p></div>'
      + '<label class="campo-senha"><span>' + (oracao ? 'Seu pedido de oração' : 'O que você precisa') + '</span>'
      + '<textarea data-texto maxlength="' + max + '" rows="4" autocomplete="off" autocapitalize="sentences"></textarea></label>'
      + '<p class="passo-dica pequena" data-conta></p>'
      // Até 20 pessoas leem: um lembrete para não expor a vida de ninguém sem querer.
      + '<p class="passo-dica pequena">' + (oracao
        ? 'Não escreva nome nem detalhe da vida de outra pessoa. Se for algo mais pessoal, escolha "Só quem conduz".'
        : 'Toda a célula lê. Não escreva endereço nem detalhe da vida de outra pessoa.') + '</p>'
      + (oracao
        ? '<span class="dica-campo">Para quem?</span>'
          + '<div class="segmentado" role="group" aria-label="Para quem é o pedido">'
          + '<button type="button" data-destino="celula" aria-pressed="true">Toda a célula</button>'
          + '<button type="button" data-destino="conduz" aria-pressed="false">Só quem conduz</button></div>'
        : '')
      + '<span class="dica-campo">Por quanto tempo?</span>'
      + '<div class="segmentado" role="group" aria-label="Por quanto tempo o pedido fica de pé">'
      + '<button type="button" data-dias="7" aria-pressed="true">7 dias</button>'
      + '<button type="button" data-dias="30" aria-pressed="false">30 dias</button></div>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao" data-enviar>Pedir</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: titulo,
      rolavel: true,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const campo = ligarContador(folha, max);
        const escolher = (sel, fn) => folha.querySelectorAll(sel).forEach((b) => {
          b.onclick = () => {
            fn(b);
            folha.querySelectorAll(sel).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          };
        });
        escolher('[data-destino]', (b) => { destino = b.dataset.destino; });
        escolher('[data-dias]', (b) => { dias = Number(b.dataset.dias); });
        const enviar = folha.querySelector('[data-enviar]');
        enviar.onclick = async () => {
          if (await enviarDaFolha(folha, enviar, () => CC.api('api/cuidado', { acao: 'criar', celula: p.id, tipo, destino, texto: campo.value, dias }))) {
            fechar();
            CC.avisar(oracao ? 'Pedido de oração enviado' : 'Pedido de ajuda enviado');
            recarregar(p);
          }
        };
      },
    });
  }

  function folhaDenuncia(p, item) {
    const motivos = (cache[p.id] && cache[p.id].motivos) || [];
    CC.folha('<h2>Denunciar pedido</h2>'
      + '<p>Escolha o motivo. A pessoa que pediu não fica sabendo quem denunciou.</p>'
      + '<div class="opcoes-traducao">' + motivos.map((m) => '<button class="opcao-traducao" data-motivo="' + CC.esc(m) + '"><b>'
        + CC.esc(m) + '</b></button>').join('') + '</div>'
      + '<div class="acoes"><button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Denunciar pedido',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-motivo]').forEach((b) => {
          b.onclick = async () => {
            const motivo = b.dataset.motivo;
            try {
              await CC.api('api/cuidado', { acao: 'denunciar', id: item.id, motivo });
              if (motivo === MOTIVO_PERIGO) {
                // A caixa de ajuda completa, mostrada na hora para quem denunciou; quem conduz é
                // avisado na hora pelo servidor (denunciaPerigo).
                folha.innerHTML = '<h2>Obrigado por avisar</h2>'
                  + '<div class="linha-ajuda">' + CC.ico('aperto') + '<p>' + AJUDA_PERIGO_DENUNCIA + '</p></div>'
                  + '<div class="acoes"><button class="botao" data-entendi>Entendi</button></div>';
                folha.querySelector('[data-entendi]').onclick = fechar;
              } else {
                fechar();
                CC.avisar('Denúncia enviada. Obrigado por avisar.');
              }
            } catch (e) {
              fechar();
              CC.avisar(e.message);
            }
            recarregar(p);
          };
        });
      },
    });
  }

  // A entrada da peça: o index chama quando a aba Oração abre, já com a peça carregada.
  CC.oracaoCelula = {
    async preencher(painel, p, aindaAqui, apoio) {
      A = apoio;
      const d = await carregar(p.id);
      if (!aindaAqui()) return;
      desenhar(painel, p, d);
    },
  };
})(window.CC);
