/* Discipulado: a relação de acompanhamento 1 a 1 (Mateus 28.19-20; 2 Timóteo 2.2). Quem
   acompanha só vê números e datas, nunca o que a outra pessoa escreveu; quem é acompanhado
   decide o que mostra e pode mudar quando quiser. Sem chat, sem XP e sem conquista nova: aqui
   é só a caminhada e o encontro da semana. As regras moram no servidor (discipulado.mjs);
   aqui é só a tela, no mesmo padrão do Perfil e dos Amigos. */
(function (CC) {
  'use strict';

  let cache = null;
  const retrato = (p, tamanho) => CC.retratoAmigo(p, tamanho);
  const acao = (corpo) => CC.api('api/discipulado', corpo);
  const ddmm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
  const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0];
  // Mesma guarda de CC.carregarAmigos: sem conta de verdade (servidor aberto das
  // ferramentas de teste, ou visitante sem senha) não há discipulado a pedir.
  const servido = () => location.protocol.startsWith('http');
  const comConta = () => servido() && !(CC.quem && !CC.quem.comSenha);

  CC.carregarDiscipulado = () => {
    if (!comConta()) return Promise.resolve(null);
    return CC.api('api/discipulado').then((d) => { cache = d; return d; }).catch(() => null);
  };
  // Para a barra de abas: existe algum vínculo (ativo ou só convidado, de qualquer lado)?
  // Lê do mesmo cache que a tela usa, carregado no boot junto com amigos e novidades.
  CC.temDiscipulado = () => !!(cache && cache.algumVinculo);

  async function recarregar() {
    await CC.carregarDiscipulado();
    CC.redesenhar();
  }

  // Os 4 marcos de "Minha caminhada", na mesma ordem e com os mesmos rótulos do servidor.
  const MARCOS = ['decisao', 'batismo', 'celula', 'discipula'];
  const ROTULOS_MARCO = {
    decisao: 'Decidi seguir Jesus',
    batismo: 'Me batizei',
    celula: 'Entrei numa célula',
    discipula: 'Comecei a acompanhar alguém na fé',
  };

  // O que o discípulo decide mostrar: os mesmos 3 interruptores em todo lugar que aparecem.
  const ORDEM_MOSTRAR = ['passos', 'semana', 'marcos'];
  const ROTULOS_MOSTRAR = {
    passos: 'Os Primeiros passos que concluí',
    semana: 'Em quantos dias li nesta semana',
    marcos: 'Minha caminhada',
  };

  const grupo = (titulo, dentro) => '<section class="grupo-config"><h2 class="etiqueta">' + CC.esc(titulo) + '</h2>'
    + '<div class="caixa-config">' + dentro + '</div></section>';

  const linhaInterruptor = (attr, chave, rotulo, ligado, dica) => '<button type="button" class="linha-config" role="switch" '
    + 'data-' + attr + '="' + CC.esc(chave) + '" aria-checked="' + !!ligado + '">'
    + '<span>' + CC.esc(rotulo) + (dica ? '<small class="dica-config">' + CC.esc(dica) + '</small>' : '') + '</span>'
    + '<span class="interruptor" aria-hidden="true"><i></i></span></button>';

  // ---------- textos do que o discípulo mostra ----------
  function linhasDoQueMostra(x) {
    const linhas = [];
    if ('passos' in x) linhas.push(x.passos + ' de 12 primeiros passos');
    if ('semana' in x) linhas.push('leu em ' + x.semana + ' dos últimos 7 dias');
    if (x.marcos) {
      for (const chave of MARCOS) if (x.marcos[chave]) linhas.push(ROTULOS_MARCO[chave] + ' · ' + ddmm(x.marcos[chave]));
      if (x.acompanha) linhas.push('acompanha ' + CC.plural(x.acompanha, 'pessoa', 'pessoas'));
    }
    if (!linhas.length) linhas.push('Ainda não mostra nada.');
    return linhas;
  }

  // ---------- Minha caminhada ----------
  function linhaMarco(chave, data) {
    return linhaInterruptor('marco', chave, ROTULOS_MARCO[chave], !!data, data ? ddmm(data) : '')
      .replace('data-marco=', 'data-data-marco="' + CC.esc(data || '') + '" data-marco=');
  }

  function folhaDataMarco(chave, atual) {
    const hoje = CC.hojeIso();
    CC.folha('<h2>' + CC.esc(ROTULOS_MARCO[chave]) + '</h2>'
      + '<label class="campo-senha"><span>Quando foi?</span>'
      + '<input type="date" data-quando max="' + hoje + '" value="' + CC.esc(atual || hoje) + '"></label>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao azul" data-salvar>Salvar</button>'
      + (atual ? '<button class="botao plano perigo" data-desmarcar>Desmarcar</button>' : '')
      + '<button class="botao plano" data-fechar>Cancelar</button></div>', {
      rotulo: ROTULOS_MARCO[chave],
      ligar: (folha, fechar) => {
        const erro = folha.querySelector('.erro-proposito');
        const gravar = async (data) => {
          try {
            await acao({ acao: 'marco', chave, data });
            fechar();
            await recarregar();
          } catch (e) { erro.textContent = e.message; erro.hidden = false; }
        };
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-salvar]').onclick = () => {
          const data = folha.querySelector('[data-quando]').value;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data > hoje) { erro.textContent = 'Escolha uma data até hoje.'; erro.hidden = false; return; }
          gravar(data);
        };
        const desmarcar = folha.querySelector('[data-desmarcar]');
        if (desmarcar) desmarcar.onclick = () => gravar('');
      },
    });
  }

  function ligarMarcos(raiz) {
    raiz.querySelectorAll('[data-marco]').forEach((b) => {
      // Tocar abre a escolha da data: o batismo, por exemplo, pode ter sido anos atrás.
      b.onclick = () => folhaDataMarco(b.dataset.marco, b.dataset.dataMarco || '');
    });
  }

  // ---------- o roteiro do encontro da semana (texto fixo, literal) ----------
  const PERGUNTAS_ENCONTRO = [
    'Como você está, de verdade?',
    'O que você leu nesta semana que ficou com você?',
    'O que você fez com o que leu? Tem algo que quer colocar em prática nesta semana?',
    'Pelo que podemos orar juntos?',
  ];

  function folhaEncontroDaSemana(id) {
    const hoje = CC.hojeIso();
    const opcoes = Array.from({ length: 8 }, (_, i) => CC.somaDias(hoje, -i));
    const rotuloData = (d) => (d === hoje ? 'Hoje' : d === CC.somaDias(hoje, -1) ? 'Ontem' : ddmm(d).slice(0, 5));
    CC.folha('<h2>Encontro da semana</h2>'
      + '<p class="passo-dica">Uma conversa de meia hora, pessoalmente ou por chamada. Sem pressa e sem prova. Se um de vocês é menor de idade, encontrem-se num lugar aberto ou com outras pessoas por perto, e com os responsáveis sabendo.</p>'
      + '<ul class="oracao-guia">' + PERGUNTAS_ENCONTRO.map((p) => '<li>' + CC.esc(p) + '</li>').join('') + '</ul>'
      + '<p class="passo-dica">Terminem orando um pelo outro.</p>'
      + '<div class="escolha-dia" role="group" aria-label="Dia do encontro">' + opcoes.map((d, i) => '<button type="button" class="botao '
        + (i === 0 ? 'azul' : 'contorno') + ' pequeno" data-data="' + d + '" aria-pressed="' + (i === 0) + '">' + rotuloData(d) + '</button>').join('') + '</div>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao azul" data-marcar>Marcar que nos encontramos</button>'
      + '<button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Encontro da semana',
      rolavel: true,
      ligar: (folha, fechar) => {
        let dataEscolhida = hoje;
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-data]').forEach((b) => {
          b.onclick = () => {
            dataEscolhida = b.dataset.data;
            folha.querySelectorAll('[data-data]').forEach((x) => {
              const sel = x === b;
              x.classList.toggle('azul', sel);
              x.classList.toggle('contorno', !sel);
              x.setAttribute('aria-pressed', String(sel));
            });
          };
        });
        folha.querySelector('[data-marcar]').onclick = async () => {
          const botao = folha.querySelector('[data-marcar]');
          botao.disabled = true;
          try {
            await acao({ acao: 'encontro', id, data: dataEscolhida });
            fechar();
            CC.avisar('Encontro marcado!');
            recarregar();
          } catch (e) {
            botao.disabled = false;
            const erro = folha.querySelector('.erro-proposito');
            erro.textContent = e.message;
            erro.hidden = false;
          }
        };
      },
    });
  }

  function encerrar(id, nome) {
    return CC.confirmar({
      titulo: 'Encerrar o acompanhamento com ' + nome + '?',
      texto: 'A relação some da tela dos dois. Ninguém é avisado.',
      acao: 'Encerrar',
      perigo: true,
    }).then((sim) => {
      if (!sim) return;
      return acao({ acao: 'encerrar', id }).then(() => { CC.avisar('Encerrado'); recarregar(); }).catch((e) => CC.avisar(e.message));
    });
  }

  // ---------- quem me acompanha ----------
  function blocoMeuDiscipulador(m) {
    const mostrar = m.mostrar || {};
    return CC.tituloSecao('Quem me acompanha')
      + '<div class="linha-amigo">' + retrato(m) + '<div class="quem-amigo"><b>' + CC.esc(m.nome) + '</b>'
      + '<span class="arroba">Te acompanha desde ' + ddmm(m.desde) + '</span>'
      + '<span class="arroba">' + (m.ultimoEncontro ? 'Último encontro: ' + ddmm(m.ultimoEncontro) : 'Vocês ainda não marcaram um encontro') + '</span>'
      + '</div></div>'
      + grupo('O que eu mostro', ORDEM_MOSTRAR.map((chave) => linhaInterruptor('mostrar-meu', chave, ROTULOS_MOSTRAR[chave], mostrar[chave])).join(''))
      + '<div class="pe-duplo-plano">'
      + '<button class="botao contorno" data-encontro-meu="' + CC.esc(m.id) + '">' + CC.ico('calendario') + 'Marcar que nos encontramos</button>'
      + '<button class="botao plano perigo" data-encerrar-meu="' + CC.esc(m.id) + '" data-nome-meu="' + CC.esc(m.nome) + '">Encerrar</button>'
      + '</div>';
  }

  function ligarMeuDiscipulador(raiz, m) {
    if (!m) return;
    raiz.querySelectorAll('[data-mostrar-meu]').forEach((b) => {
      b.onclick = async () => {
        const chave = b.dataset.mostrarMeu;
        const novo = b.getAttribute('aria-checked') !== 'true';
        b.setAttribute('aria-checked', String(novo));
        const mostrar = { ...(m.mostrar || {}), [chave]: novo };
        try {
          await acao({ acao: 'mostrar', id: m.id, mostrar });
          m.mostrar = mostrar;
        } catch (e) {
          b.setAttribute('aria-checked', String(!novo));
          CC.avisar(e.message);
        }
      };
    });
    const encontro = raiz.querySelector('[data-encontro-meu]');
    if (encontro) encontro.onclick = () => folhaEncontroDaSemana(encontro.dataset.encontroMeu);
    const enc = raiz.querySelector('[data-encerrar-meu]');
    if (enc) enc.onclick = () => encerrar(enc.dataset.encerrarMeu, enc.dataset.nomeMeu);
  }

  // ---------- quem eu acompanho ----------
  function cartaoDiscipulo(x) {
    const linhas = ['Desde ' + ddmm(x.desde)].concat(linhasDoQueMostra(x));
    linhas.push(x.ultimoEncontro ? 'Último encontro: ' + ddmm(x.ultimoEncontro) : 'Vocês ainda não marcaram um encontro');
    // Os botões entram numa linha à parte (flex-basis:100%): dentro do mesmo flex do
    // .linha-amigo, dois botões de texto longo espremiam o nome e as linhas de texto até
    // sobrar quase nada, em vez de quebrar para a linha de baixo.
    return '<div class="linha-amigo">' + retrato(x) + '<div class="quem-amigo"><b>' + CC.esc(x.nome) + '</b>'
      + linhas.map((l) => '<span class="arroba">' + CC.esc(l) + '</span>').join('') + '</div>'
      + '<div class="pe-duplo-plano" style="flex-basis:100%">'
      + '<button class="botao contorno pequeno" data-encontro="' + CC.esc(x.id) + '">Encontro da semana</button>'
      + '<button class="botao plano perigo pequeno" data-encerrar="' + CC.esc(x.id) + '" data-nome="' + CC.esc(x.nome) + '">Encerrar</button>'
      + '</div></div>';
  }

  function ligarDiscipulos(raiz) {
    raiz.querySelectorAll('[data-encontro]').forEach((b) => { b.onclick = () => folhaEncontroDaSemana(b.dataset.encontro); });
    raiz.querySelectorAll('[data-encerrar]').forEach((b) => { b.onclick = () => encerrar(b.dataset.encerrar, b.dataset.nome); });
  }

  // ---------- pedidos recebidos ----------
  function linhaPedido(p) {
    const texto = p.papel === 'discipulador' ? 'Quer te acompanhar na fé.' : 'Pediu para você acompanhar a caminhada de fé.';
    return '<div class="linha-amigo pedido">' + retrato(p.de) + '<div class="quem-amigo"><b>' + CC.esc(p.de.nome) + '</b>'
      + '<span class="arroba">' + texto + '</span></div>'
      + '<button class="botao pequeno" data-aceitar="' + CC.esc(p.id) + '">Aceitar</button>'
      + '<button class="botao plano pequeno" data-recusar="' + CC.esc(p.id) + '">Agora não</button>'
      + '</div>';
  }

  function folhaAceitar(pedido) {
    const estado = { passos: true, semana: true, marcos: false };
    CC.folha('<h2>O que você quer mostrar?</h2>'
      + '<p class="passo-dica">' + CC.esc(pedido.de.nome) + ' vai ver só o que você deixar ligado, nunca o que você escreve. Você pode mudar isso quando quiser.</p>'
      + '<div class="caixa-config">' + ORDEM_MOSTRAR.map((chave) => linhaInterruptor('escolha', chave, ROTULOS_MOSTRAR[chave], estado[chave])).join('') + '</div>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao azul" data-confirmar>Aceitar</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'O que você quer mostrar',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-escolha]').forEach((b) => {
          b.onclick = () => {
            const chave = b.dataset.escolha;
            estado[chave] = !estado[chave];
            b.setAttribute('aria-checked', String(estado[chave]));
          };
        });
        folha.querySelector('[data-confirmar]').onclick = async () => {
          const botao = folha.querySelector('[data-confirmar]');
          botao.disabled = true;
          try {
            await acao({ acao: 'aceitar', id: pedido.id, mostrar: estado });
            fechar();
            CC.avisar('Combinado!');
            recarregar();
          } catch (e) {
            botao.disabled = false;
            const erro = folha.querySelector('.erro-proposito');
            erro.textContent = e.message;
            erro.hidden = false;
          }
        };
      },
    });
  }

  function ligarPedidos(raiz, pedidos) {
    raiz.querySelectorAll('[data-aceitar]').forEach((b) => {
      b.onclick = () => { const p = pedidos.find((x) => x.id === b.dataset.aceitar); if (p) folhaAceitar(p); };
    });
    raiz.querySelectorAll('[data-recusar]').forEach((b) => {
      b.onclick = async () => { await acao({ acao: 'recusar', id: b.dataset.recusar }).catch(() => {}); recarregar(); };
    });
  }

  // ---------- convidar alguém ----------
  function folhaEscolherPapel(amigo) {
    CC.folha('<h2>Convidar ' + CC.esc(amigo.nome) + '</h2>'
      + '<div class="acoes">'
      + '<button class="botao azul" data-papel="discipulador">Quero te acompanhar na fé</button>'
      + '<button class="botao contorno" data-papel="discipulo">Quero que você me acompanhe</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button>'
      + '</div>',
    {
      rotulo: 'Convidar ' + amigo.nome,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-papel]').forEach((b) => {
          b.onclick = async () => {
            b.disabled = true;
            try {
              await acao({ acao: 'convidar', usuario: amigo.usuario, papel: b.dataset.papel });
              fechar();
              CC.avisar('Convite enviado!');
              recarregar();
            } catch (e) {
              b.disabled = false;
              CC.avisar(e.message);
            }
          };
        });
      },
    });
  }

  function folhaConvidar(d) {
    const ligados = new Set([
      ...(d.meuDiscipulador ? [d.meuDiscipulador.usuario] : []),
      ...d.meusDiscipulos.map((x) => x.usuario),
      ...d.pedidos.map((p) => p.de.usuario),
    ]);
    const amigos = ((CC.amigosEmCache() || {}).amigos || []).filter((a) => !ligados.has(a.usuario));
    CC.folha('<h2>Convidar alguém</h2>'
      + (amigos.length
        ? '<div class="lista-pedidos">' + amigos.map((a) => '<div class="linha-amigo">' + retrato(a)
          + '<div class="quem-amigo"><b>' + CC.esc(a.nome) + '</b><span class="arroba">@' + CC.esc(a.usuario) + '</span></div>'
          + '<button class="botao pequeno" data-amigo="' + CC.esc(a.usuario) + '">Convidar</button></div>').join('') + '</div>'
        : '<div class="vazio">Nenhum amigo disponível para convidar agora.</div>')
      + '<div class="acoes"><button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Convidar alguém',
      rolavel: true,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-amigo]').forEach((b) => {
          b.onclick = () => { const a = amigos.find((x) => x.usuario === b.dataset.amigo); fechar(); if (a) folhaEscolherPapel(a); };
        });
      },
    });
  }

  // ---------- acompanhar na fé, a partir do Juntos (integração com a Fase 1) ----------
  CC.folhaAcompanharNaFe = function (pessoa) {
    const nome = primeiroNome(pessoa.nome);
    CC.folha('<h2>Acompanhar ' + CC.esc(nome) + ' na fé?</h2>'
      + '<p class="passo-dica">Você vai ver o que ' + CC.esc(nome) + ' escolher mostrar: os primeiros passos, quantos dias leu e a caminhada. Nunca o que ' + CC.esc(nome) + ' escreve.</p>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao azul" data-enviar>Convidar</button>'
      + '<button class="botao plano" data-fechar>Agora não</button></div>',
    {
      rotulo: 'Acompanhar na fé',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-enviar]').onclick = async () => {
          const botao = folha.querySelector('[data-enviar]');
          botao.disabled = true;
          try {
            await acao({ acao: 'convidar', usuario: pessoa.usuario, papel: 'discipulador' });
            fechar();
            CC.avisar('Convite enviado!');
            recarregar();
          } catch (e) {
            botao.disabled = false;
            const erro = folha.querySelector('.erro-proposito');
            erro.textContent = e.message;
            erro.hidden = false;
          }
        };
      },
    });
  };

  // ---------- a tela ----------
  CC.vistaDiscipulado = function (raiz) {
    // Rota nova (#/discipulado), aberta pela própria aba: sem "voltar para o Perfil". A
    // rota antiga (#/perfil/discipulado) continua existindo por causa das notificações já
    // entregues antes desta mudança, e essa sim mostra o voltar de sempre.
    const viaPerfil = location.hash.startsWith('#/perfil/discipulado');
    const cabeca = '<div class="cabeca-centro">' + (viaPerfil ? CC.botaoVoltar('Perfil') : '') + '<h1>Discipulado</h1></div>';
    const desenhar = (d) => {
      if (!d) {
        raiz.innerHTML = cabeca + CC.esqueleto('lista');
        return;
      }
      const marcos = d.marcos || {};
      raiz.innerHTML = cabeca
        + '<p class="subtitulo-tela">Caminhe com alguém mais perto de Jesus. O que você escreve no app continua só seu.</p>'
        + CC.tituloSecao('Minha caminhada')
        + '<div class="caixa-config">' + MARCOS.map((chave) => linhaMarco(chave, marcos[chave])).join('') + '</div>'
        + (d.meuDiscipulador ? blocoMeuDiscipulador(d.meuDiscipulador) : '')
        + CC.tituloSecao('Quem eu acompanho', d.meusDiscipulos.length ? String(d.meusDiscipulos.length) : '')
        + (d.meusDiscipulos.length
          ? '<div class="lista-pedidos">' + d.meusDiscipulos.map(cartaoDiscipulo).join('') + '</div>'
          : '<div class="vazio-amigos">' + CC.ico('pessoas') + '<p>Quando você acompanhar alguém na fé, a pessoa aparece aqui.</p></div>')
        + (d.pedidos.length ? CC.tituloSecao('Pedidos', String(d.pedidos.length)) + '<div class="lista-pedidos">' + d.pedidos.map(linhaPedido).join('') + '</div>' : '')
        + '<div class="acoes"><button class="botao contorno pequeno" data-convidar>' + CC.ico('mais-sinal') + 'Convidar alguém</button></div>';

      ligarMarcos(raiz);
      ligarMeuDiscipulador(raiz, d.meuDiscipulador);
      ligarDiscipulos(raiz);
      ligarPedidos(raiz, d.pedidos);
      raiz.querySelector('[data-convidar]').onclick = () => folhaConvidar(d);
    };

    desenhar(cache);
    const antes = JSON.stringify(cache);
    const jaMostrou = !!cache;
    CC.carregarDiscipulado().then((d) => {
      if (!(location.hash.startsWith('#/perfil/discipulado') || location.hash.startsWith('#/discipulado'))) return;
      if (d && JSON.stringify(d) === antes) return;
      if (jaMostrou) raiz.classList.add('sem-entrada');
      desenhar(d || cache);
      // A barra reflete "tem discipulado" a partir deste mesmo cache: se mudou (aceitou,
      // encerrou, um pedido chegou), ela se redesenha aqui, sem esperar o próximo boot.
      if (CC.pintarNavegacao) CC.pintarNavegacao();
    });
  };
})(window.CC);
