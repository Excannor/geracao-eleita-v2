/* Conhecer Jesus: os 14 dias de quem ainda não segue Jesus, as perguntas honestas e a tela
   "E agora, o que eu faço?". Nada aqui pontua, sobe de nível ou aparece no Feed: os dias só
   contam para a ofensiva, do mesmo jeito que uma leitura do plano (02-estado.js). Reaproveita
   as peças visuais dos Primeiros passos e da reflexão do dia (04-licao.js) de propósito, para
   não nascer uma segunda linguagem visual dentro do mesmo app. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const conteudoDe = () => D.conhecer;

  const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0];
  // "por que" e "o que" não se separam na quebra de linha dos títulos (como o espaço
  // inseparável das referências): nada de "por / que existe sofrimento?".
  const colarTitulo = (t) => CC.esc(t).replace(/\b([Pp]or|[Oo]) que\b/g, '$1\u00a0que');

  // Pede a conversa ao servidor e devolve o texto pronto de "seguir" para mostrar depois:
  // o servidor decide sozinho quem avisa (quem convidou e, se houver, o líder da célula) e
  // nunca manda o que a pessoa escreveu.
  function pedirConversa() {
    return CC.api('api/conhecer/conversar', {});
  }

  // A folha que "Converse com {nome}" abre nas perguntas honestas: confirma antes de avisar,
  // porque ali a pessoa pode só estar pesquisando, não necessariamente pronta para chamar.
  function abrirFolhaConversar(nome) {
    const S = conteudoDe().seguir;
    CC.folha('<h2>Converse com ' + CC.esc(nome) + '</h2>'
      + '<p class="passo-dica">' + CC.esc(nome) + ' vai saber que você quer conversar (e o líder da sua célula, se você tiver uma). O que você escreve no app fica só com você.</p>'
      + '<div class="acoes"><button class="botao azul" data-enviar>' + CC.esc(S.conversar) + '</button>'
      + '<button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Conversar',
      classe: 'cj',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-enviar]').onclick = async (ev) => {
          ev.currentTarget.disabled = true;
          try {
            await pedirConversa();
            folha.innerHTML = '<p class="conquista-linha">' + CC.ico('certo') + CC.esc(S.conversarFeito) + '</p>'
              + '<div class="acoes"><button class="botao plano" data-fechar2>Fechar</button></div>';
            folha.querySelector('[data-fechar2]').onclick = fechar;
          } catch (e) {
            ev.currentTarget.disabled = false;
            CC.avisar(e.message);
          }
        };
      },
    });
  }

  // ---------- #/conhecer: a lista dos 14 dias ----------
  // `comLinkPlano` só é verdadeiro quando esta mesma lista aparece na aba Trilha (03-trilha.js):
  // é ali que faz sentido oferecer trocar de caminho, não dentro do próprio #/conhecer.
  CC.vistaConhecer = function (raiz, comLinkPlano) {
    const C = conteudoDe();
    const feitos = CC.conhecidos();
    const proximo = C.dias.find((d) => !feitos.includes(d.numero));
    const fracao = C.dias.length ? feitos.length / C.dias.length : 0;

    const lista = C.dias.map((dia) => {
      const feita = feitos.includes(dia.numero);
      const ehProxima = !!proximo && dia.numero === proximo.numero;
      const referencia = dia.trechos.map((t) => CC.escreverRef(t.livro, t.cap, t.de, t.ate)).join('; ');
      return '<a class="item-licao' + (feita ? ' feita' : '') + (ehProxima ? ' proxima' : '') + '" '
        + 'href="#/conhecer/' + dia.numero + '">'
        + '<span class="num" aria-hidden="true">' + (feita ? CC.ico('certo') : dia.numero) + '</span>'
        + '<span class="textos">'
        + (ehProxima ? '<span class="marca-proxima">Próximo</span>' : '')
        + '<b>' + CC.esc(dia.titulo) + (feita ? '<span class="so-leitor">, concluído</span>' : '') + '</b>'
        + '<span>' + CC.esc(CC.colarRef(referencia)) + '</span></span>'
        + CC.ico('avancar') + '</a>';
    }).join('');

    // A cabeça continua a folha do topo do app (.folha-cabeca, em 21-trilha.css), como a
    // saudação do Início; o próximo dia é o cartão de destaque.
    raiz.innerHTML = '<div class="tela-conhecer-lista"><div class="folha-cabeca cabeca-passos c-azul">'
      + '<div class="textos"><h1>' + CC.esc(C.titulo) + '</h1>'
      + '<p>' + CC.esc(C.subtitulo) + '</p>'
      + '<div class="progresso-passos">' + CC.barra(fracao) + '<b>' + feitos.length + ' de ' + C.dias.length + '</b></div>'
      + (proximo
        ? '<a class="cartao-destaque" href="#/conhecer/' + proximo.numero + '"><span>'
          + (feitos.length ? 'Continuar: ' : 'Começar: ') + CC.esc(proximo.titulo) + '</span>' + CC.ico('bandeira') + '</a>'
        : '<p class="conquista-linha">' + CC.ico('certo') + 'Você terminou os 14 dias!</p>')
      + '</div></div>'
      // Quem convidou vê em que dia a pessoa está (nunca o que ela escreve): dito aqui, às claras.
      + (CC.quem && CC.quem.acompanhadoPor
        ? '<p class="passo-dica pequena" style="margin:12px 4px 0">' + CC.esc(String(CC.quem.acompanhadoPor.nome).split(' ')[0])
          + ' vê em que dia você está. O que você escreve fica só com você.</p>'
        : '')
      + CC.tituloSecao('Os 14 dias')
      + '<div class="lista-licoes caixa-lista">' + lista + '</div>'
      + '<div class="lista-atalhos atalhos-conhecer">'
      + '<a class="atalho" href="#/perguntas">' + CC.ico('balao') + '<span><b>Perguntas honestas</b>'
      + '<small>Dúvidas comuns de quem está conhecendo Jesus.</small></span>' + CC.ico('avancar') + '</a>'
      + '<a class="atalho" href="#/seguir">' + CC.ico('bandeira') + '<span><b>' + colarTitulo(C.seguir.titulo) + '</b></span>' + CC.ico('avancar') + '</a>'
      + '</div>'
      + (comLinkPlano ? '<div class="ver-plano"><button class="link-nota" data-ver-plano>Ver o plano da Bíblia em um ano</button></div>' : '')
      + '</div>';

    const verPlano = raiz.querySelector('[data-ver-plano]');
    if (verPlano) {
      verPlano.onclick = async () => {
        verPlano.disabled = true;
        try {
          await CC.api('api/caminho', { caminho: 'plano' });
          if (CC.quem) CC.quem.caminho = 'plano';
          CC.redesenhar();
        } catch (e) {
          verPlano.disabled = false;
          CC.avisar(e.message);
        }
      };
    }
  };

  // ---------- #/conhecer/N: a tela do dia, em folha cheia ----------
  let sessaoDia = null;


  CC.fecharConhecerDia = function () {
    if (CC.fecharLeitor) CC.fecharLeitor();
    const el = document.querySelector('.licao.tela-conhecer');
    if (el) el.remove();
    sessaoDia = null;
  };

  CC.montarConhecerDia = function (numero) {
    const C = conteudoDe();
    const n = Math.min(Math.max(1, Number(numero) || 1), C.dias.length);
    if (!sessaoDia || sessaoDia.numero !== n) sessaoDia = { numero: n, lida: CC.conhecido(n) };
    desenharConhecerDia();
  };

  function desenharConhecerDia() {
    const C = conteudoDe();
    const dia = C.dias[sessaoDia.numero - 1];
    const terminado = CC.conhecido(dia.numero);
    // Uma vez terminado o dia, reabrir sempre mostra o conteúdo inteiro, mesmo que a sessão
    // (aberta agora) ainda não tenha passado pelo "Ler".
    const lida = sessaoDia.lida || terminado;
    const fracao = terminado ? 1 : (lida ? 0.6 : 0.1);

    let el = document.querySelector('.licao.tela-conhecer');
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      document.body.appendChild(el);
    }
    el.className = 'licao c-azul tela-conhecer cj';
    el.setAttribute('aria-label', 'Dia ' + dia.numero + ' do Conhecer Jesus');

    const perguntasFixas = '<details class="cartao"><summary>Mais perguntas para pensar</summary>'
      + '<ul class="perguntas-fixas">'
      + C.perguntasFixas.map((p) => '<li>' + CC.esc(p) + '</li>').join('') + '</ul></details>';

    const corpoLido = !lida ? '' : '<section class="etapa-reflexao">'
      + '<span class="etiqueta">Repare</span><p>' + CC.esc(dia.repare) + '</p></section>'
      + '<section class="etapa-reflexao"><div class="pensamento-dia"><p>' + CC.esc(dia.pergunta) + '</p></div></section>'
      + '<section class="etapa-reflexao">' + perguntasFixas + '</section>'
      + '<section class="etapa-reflexao"><h2>Se quiser, fale com Deus:</h2>'
      + '<ul class="oracao-guia"><li>' + CC.esc(dia.conversa) + '</li></ul></section>'
      + CC.painelAnotacao('conhecer:' + dia.numero, 'Escrever sobre isso')
      + (terminado ? '<p class="conquista-linha">' + CC.ico('certo') + 'Dia concluído</p>' : '');

    el.innerHTML = '<div class="licao-topo">'
      + '<button class="fechar" data-fechar aria-label="Fechar">' + CC.ico('fechar') + '</button>'
      + CC.barra(fracao)
      + '</div>'
      + '<div class="licao-palco"><div class="interno">'
      // .cabeca-cj: só apresentação, a folha do alto do dia, por baixo do topo (21-trilha.css)
      + '<div class="cabeca-cj"><span class="etiqueta">Conhecer Jesus · Dia ' + dia.numero + ' de 14</span>'
      + '<h1 class="passo-titulo">' + CC.esc(dia.titulo) + '</h1>'
      + '<p class="passo-dica">' + CC.esc(dia.abertura) + '</p></div>'
      // Antes de ler, a tela mostra o que vem: sem isso, sobrava um vazio que parecia travado.
      + (lida ? '' : '<div class="leitura-hoje"><span class="etiqueta">O que você vai ler</span>'
        + '<span class="passagem-hoje">' + CC.esc(CC.colarRef(dia.trechos.map((t) => CC.escreverRef(t.livro, t.cap, t.de, t.ate)).join(' e '))) + '</span>'
        + '<span class="tempo">uns ' + minutosDoConhecer(dia) + ' minutos</span></div>')
      + corpoLido
      + '</div></div>'
      + '<div class="licao-pe' + (peDoConhecer(dia, lida, terminado) ? '' : ' vazio') + '"><div class="interno">'
      + peDoConhecer(dia, lida, terminado) + '</div></div>';

    el.querySelector('[data-fechar]').onclick = () => { location.hash = '#/conhecer'; };
    const ler = el.querySelector('[data-ler]');
    if (ler) {
      ler.onclick = () => {
        sessaoDia.lida = true;
        desenharConhecerDia();
        CC.abrirLeitor({
          dia,
          chave: 'dia',
          trilhas: [['dia', 'Dia ' + dia.numero, dia.titulo]],
          cor: 'azul',
          conhecer: true,
          lida: () => true,
          marcar: () => {},
        });
      };
    }
    const terminar = el.querySelector('[data-terminar]');
    if (terminar) {
      terminar.onclick = () => {
        CC.vibrar('certo');
        CC.marcarConhecido(dia.numero);
        desenharConhecerDia();
      };
    }
    const continuarPlano = el.querySelector('[data-continuar-plano]');
    if (continuarPlano) {
      continuarPlano.onclick = async () => {
        continuarPlano.disabled = true;
        try {
          await CC.api('api/caminho', { caminho: 'plano' });
          if (CC.quem) CC.quem.caminho = 'plano';
          location.hash = '#/';
        } catch (e) {
          continuarPlano.disabled = false;
          CC.avisar(e.message);
        }
      };
    }
    CC.ligarAnotacao(el);
  }

  // O rodapé muda com o estado do dia: primeiro só "Ler"; depois de ler, "Terminei o dia";
  // terminado, só nos dias 13 e 14 aparece um próximo passo, senão o rodapé fica vazio e a
  // pessoa sai pelo X.
  // Uns 6 versículos por minuto, arredondado; os trechos do Conhecer são curtos e por versículo.
  const minutosDoConhecer = (dia) => Math.max(3, Math.round(dia.trechos.reduce((n, t) => n + (t.ate - t.de + 1), 0) / 6));

  function peDoConhecer(dia, lida, terminado) {
    if (!lida) return '<button class="botao cor" data-ler>Ler</button>';
    if (!terminado) return '<button class="botao cor" data-terminar>Terminei o dia</button>';
    const botoes = [];
    if (dia.numero === 13 || dia.numero === 14) {
      botoes.push('<a class="botao cor" href="#/seguir">' + CC.esc(conteudoDe().seguir.titulo) + '</a>');
    }
    if (dia.numero === 14) {
      botoes.push('<button class="botao contorno" data-continuar-plano>Continuar lendo a Bíblia</button>');
    }
    return botoes.join('');
  }

  // ---------- #/perguntas: as 10 perguntas honestas ----------
  CC.vistaPerguntas = function (raiz) {
    const C = conteudoDe();
    raiz.innerHTML = '<div class="tela-perguntas cj"><div class="folha-cabeca">' + CC.botaoVoltar('Voltar')
      + '<h1>Perguntas honestas</h1>'
      + '<p class="subtitulo-tela">Dúvidas comuns de quem está conhecendo Jesus, ou de quem já segue e quer conversar com um amigo.</p></div>'
      + '<div class="grade caixa-lista">' + C.perguntas.map((p) => '<a class="item" href="#/perguntas/' + encodeURIComponent(p.id) + '">'
        + '<span class="textos"><b>' + colarTitulo(p.titulo) + '</b>'
        + '<span class="resumo">' + CC.esc(p.resumo) + '</span></span>' + CC.ico('avancar') + '</a>').join('') + '</div></div>';
  };

  CC.vistaPergunta = function (raiz, id) {
    const p = conteudoDe().perguntas.find((x) => x.id === id);
    if (!p) return CC.vazio(raiz, 'Não encontrei essa pergunta.');

    const pilulas = (p.leia || []).map((ref) => {
      const m = /^(.+?)\s+(\d+)/.exec(ref);
      return m ? '<a class="pilula" href="#/biblia/' + encodeURIComponent(m[1]) + '/' + m[2] + '">' + CC.esc(CC.colarRef(ref)) + '</a>'
        : '<span class="pilula">' + CC.esc(CC.colarRef(ref)) + '</span>';
    }).join('');

    const quem = CC.quem && CC.quem.acompanhadoPor;

    // O título é uma frase inteira: desce para baixo do voltar, na largura da folha.
    raiz.innerHTML = '<div class="tela-pergunta cj"><div class="folha-cabeca titulo-frase">' + CC.botaoVoltar('Voltar')
      + '<h1>' + colarTitulo(p.titulo) + '</h1></div>'
      + '<div class="cartao texto-pergunta">' + p.paragrafos.map((par) => '<p>' + CC.esc(par) + '</p>').join('') + '</div>'
      + (pilulas ? CC.tituloSecao('Leia na Bíblia') + '<div class="pilulas">' + pilulas + '</div>' : '')
      + (quem ? '<div class="acoes"><button class="botao contorno" data-conversar>Converse com '
        + CC.esc(primeiroNome(quem.nome)) + '</button></div>' : '') + '</div>';

    const btn = raiz.querySelector('[data-conversar]');
    if (btn) btn.onclick = () => abrirFolhaConversar(primeiroNome(quem.nome));
  };

  // ---------- #/seguir: "E agora, o que eu faço?" ----------
  CC.vistaSeguir = function (raiz) {
    const S = conteudoDe().seguir;
    const quem = CC.quem && CC.quem.acompanhadoPor;

    const passos = S.passos.map((p) => '<section class="etapa-reflexao"><h2>' + CC.esc(p.titulo) + '</h2>'
      + '<p>' + CC.esc(p.texto) + '</p></section>').join('');

    raiz.innerHTML = '<div class="tela-seguir cj"><div class="folha-cabeca titulo-frase">' + CC.botaoVoltar('Voltar')
      + '<h1>' + colarTitulo(S.titulo) + '</h1></div>'
      + '<p class="cartao abertura-seguir">' + CC.esc(S.abertura) + '</p>'
      + passos
      + '<section class="etapa-reflexao"><h2>' + CC.esc(S.oracaoTitulo) + '</h2>'
      + '<p class="passo-dica">' + CC.esc(S.oracaoAbertura) + '</p>'
      + '<div class="pensamento-dia"><p>' + CC.esc(S.oracao) + '</p></div></section>'
      + '<div class="acoes" id="acoes-conversar-seguir">'
      + (quem ? '<button class="botao azul" data-conversar>' + CC.esc(S.conversar) + '</button>'
        : '<p class="passo-dica">Converse com um amigo que segue Jesus ou procure uma igreja perto de você.</p>')
      + '</div>'
      // Integração com o Discipulado (Fase 3): depois de "Quero conversar", o caminho para
      // pedir alguém que acompanhe na fé, sem obrigar ninguém a fazer isso agora.
      + '<p class="passo-dica pequena">Quando quiser, peça para alguém te acompanhar na fé no Perfil.</p>'
      + '<div class="acoes"><a class="botao contorno" href="#/passos">' + CC.esc(S.proximo) + '</a></div></div>';

    const btn = raiz.querySelector('[data-conversar]');
    if (btn) {
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          await pedirConversa();
          document.getElementById('acoes-conversar-seguir').innerHTML =
            '<p class="conquista-linha">' + CC.ico('certo') + CC.esc(S.conversarFeito) + '</p>';
        } catch (e) {
          btn.disabled = false;
          CC.avisar(e.message);
        }
      };
    }
  };
  // ---------- "Quero conversar sobre o batismo" (lição 3 dos Primeiros passos) ----------
  // O botão vem pronto no texto da lição; o clique é pego aqui, em qualquer tela.
  const juntarNomes = (lista) => (lista.length > 1 ? lista.slice(0, -1).join(', ') + ' e ' + lista.at(-1) : lista[0] || '');

  CC.conversarSobreBatismo = function () {
    CC.folha('<h3>Conversar sobre o batismo</h3>'
      + '<p>Vamos avisar quem te acompanha no app: quem te convidou, o líder da sua célula e quem faz discipulado com você, se houver. A pessoa vai te procurar para conversar, do jeito que vocês costumam falar.</p>'
      + '<p class="passo-dica">Só vai o aviso. Ninguém vê o que você escreveu no app.</p>'
      + '<div class="acoes"><button class="botao" data-avisar>Avisar</button><button class="botao plano" data-fechar>Agora não</button></div>', {
      rotulo: 'Conversar sobre o batismo',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const avisar = folha.querySelector('[data-avisar]');
        avisar.onclick = async () => {
          avisar.disabled = true;
          let r;
          try { r = await CC.api('api/batismo/conversar', {}); } catch (e) { avisar.disabled = false; CC.avisar(e.message || 'Não consegui avisar agora'); return; }
          let corpo;
          if (r.ninguem) {
            corpo = '<h3>Ainda não tem ninguém ligado a você no app</h3>'
              + '<p>Converse com o pastor ou com um líder da igreja que você frequenta. Se você tem menos de 18 anos, conte também para seus pais ou responsáveis.</p>';
          } else if (r.ja) {
            corpo = '<h3>O aviso já foi hoje</h3><p>Quem te acompanha já recebeu o seu pedido. Agora é esperar a pessoa te procurar.</p>';
          } else {
            // Quem não recebeu a notificação agora (sem aviso ligado ou de madrugada) vê o
            // pedido no Juntos quando abrir o app.
            const avisados = r.avisados || [];
            const noApp = r.noApp || [];
            corpo = '<h3>Pedido enviado</h3>'
              + (avisados.length ? '<p>Avisamos ' + CC.esc(juntarNomes(avisados)) + '.</p>' : '')
              + (noApp.length ? '<p>' + CC.esc(juntarNomes(noApp)) + ' vai ver o pedido quando abrir o app.</p>' : '')
              + '<p class="passo-dica">Agora é esperar a pessoa te procurar. Se quiser, fale pessoalmente também.</p>';
          }
          folha.innerHTML = corpo + '<div class="acoes"><button class="botao" data-fechar>Fechar</button></div>';
          folha.querySelector('[data-fechar]').onclick = fechar;
        };
      },
    });
  };

  // (o teste roda este arquivo sem DOM de verdade: só liga o clique quando existe)
  if (typeof document.addEventListener === 'function') document.addEventListener('click', (ev) => {
    const bt = ev.target.closest && ev.target.closest('[data-conversar-batismo]');
    if (!bt) return;
    ev.preventDefault();
    CC.conversarSobreBatismo();
  });

})(window.CC);
