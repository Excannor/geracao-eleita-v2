/* Instalar no celular: o tutorial que transforma o site num ícone na tela de início.
   Abre sozinho logo depois de criar a conta, perguntando qual celular a pessoa usa, e
   fica à mão no Perfil. Sempre dá para pular: ninguém fica preso nele. */
(function (CC) {
  'use strict';

  // No Android, o Chrome oferece a própria janela de instalar. Guardada aqui, ela vira
  // o botão "Instalar agora" no tutorial, que poupa a pessoa de procurar no menu.
  let pedidoInstalar = null;
  addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); pedidoInstalar = ev; });
  addEventListener('appinstalled', () => { pedidoInstalar = null; });

  CC.rodandoComoApp = () => {
    try { if (matchMedia('(display-mode: standalone)').matches) return true; } catch (e) { /* segue */ }
    return navigator.standalone === true;
  };

  const sistemaProvavel = () => {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return '';
  };
  const lembrado = () => { try { return localStorage.getItem('cc.sistema') || ''; } catch (e) { return ''; } };
  const lembrar = (s) => { try { localStorage.setItem('cc.sistema', s); } catch (e) { /* segue */ } };

  // Desenhos dos botões que a pessoa vai procurar na tela do próprio celular.
  const traco = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const DESENHO = {
    celular: traco('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>'),
    navegador: traco('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20"/>'),
    compartilhar: traco('<path d="M8 10H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2"/><path d="M12 15V2"/><path d="m8 6 4-4 4 4"/>'),
    adicionar: traco('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8"/><path d="M8 12h8"/>'),
    menu: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2.2"/>'
      + '<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="19" r="2.2"/></svg>',
    certo: traco('<path d="M20 6 9 17l-5-5"/>'),
  };

  const PASSOS = {
    ios: [
      ['navegador', 'Abra no Safari', 'Pelo Chrome também dá: o botão Compartilhar fica ao lado do endereço.'],
      ['compartilhar', 'Toque em Compartilhar', 'É o quadrado com a seta para cima, na barra de baixo do Safari.'],
      ['adicionar', 'Adicionar à Tela de Início', 'Role a lista para baixo até achar. Se não estiver lá, toque em "Editar Ações" e ative.'],
      ['certo', 'Toque em Adicionar', 'Fica no canto de cima, à direita. Pronto: o ícone aparece na sua tela de início.'],
    ],
    android: [
      ['navegador', 'Abra no Chrome', 'No Samsung Internet e no Edge também funciona, com nomes parecidos.'],
      ['menu', 'Toque nos três pontinhos', 'Ficam no canto de cima, à direita do endereço.'],
      ['adicionar', 'Instalar app', 'Em alguns celulares o nome é "Adicionar à tela inicial". Qualquer um dos dois serve.'],
      ['certo', 'Confirme em Instalar', 'O ícone do app aparece junto dos seus outros aplicativos.'],
    ],
  };
  const NOME = { ios: 'iPhone', android: 'Android' };

  // Abre o tutorial e resolve quando ele fecha, por qualquer caminho: pular, pronto,
  // toque fora ou Esc. Assim a partida do app espera por ele antes de abrir outra folha.
  CC.tutorialInstalar = function ({ contaNova = false } = {}) {
    return new Promise((resolver) => {
      const { folha, fechar } = CC.folha('', { classe: 'folha-instalar', rolavel: true, rotulo: 'Instalar no celular' });
      const cortina = folha.parentNode;
      const vigia = new MutationObserver(() => {
        if (!document.body.contains(cortina)) { vigia.disconnect(); resolver(); }
      });
      vigia.observe(document.body, { childList: true });

      const sugerido = sistemaProvavel();

      const escolha = () => {
        folha.innerHTML = '<p class="fala-bento pequena">'
          + (contaNova ? 'Conta criada! Que tal deixar o app na tela de início do seu celular?'
            : 'Vamos colocar o app na tela de início do seu celular?')
          + '</p>'
          + '<h2>Qual celular você usa?</h2>'
          + '<p>Assim ele abre como um aplicativo, em tela cheia, com um toque.</p>'
          + '<div class="escolha-sistema">'
          + ['ios', 'android'].map((s) => '<button class="opcao-sistema" data-sistema="' + s + '">'
            + (s === sugerido ? '<span class="sugerido">o seu</span>' : '')
            + DESENHO.celular + NOME[s] + '<small>' + (s === 'ios' ? 'Safari' : 'Chrome') + '</small></button>').join('')
          + '</div>'
          + '<div class="acoes"><button class="botao plano" data-pular>Pular por agora</button></div>'
          + (contaNova ? '<p class="nota-instalar">Dá para ver isto de novo em Perfil › Instalar no celular.</p>' : '');
        folha.querySelectorAll('[data-sistema]').forEach((b) => {
          b.onclick = () => { lembrar(b.dataset.sistema); guia(b.dataset.sistema); };
        });
        folha.querySelector('[data-pular]').onclick = fechar;
      };

      const guia = (sistema) => {
        const podeInstalarJa = sistema === 'android' && pedidoInstalar;
        folha.innerHTML = '<h2>Instalar no ' + NOME[sistema] + '</h2>'
          + '<div class="segmentado" role="group" aria-label="Celular">'
          + ['ios', 'android'].map((s) => '<button data-trocar="' + s + '" aria-pressed="' + (s === sistema) + '">'
            + NOME[s] + '</button>').join('')
          + '</div>'
          + (CC.rodandoComoApp() ? '<p class="nota-instalar">Você já está usando pelo ícone. Os passos ficam aqui para ajudar alguém.</p>' : '')
          + (podeInstalarJa ? '<div class="acoes"><button class="botao" data-instalar-ja>Instalar agora</button></div>'
            + '<p class="nota-instalar">Ou faça pelo menu do Chrome:</p>' : '')
          + '<ol class="passos-instalar">' + PASSOS[sistema].map(([desenho, titulo, texto]) => '<li>'
            + '<div><b>' + CC.esc(titulo) + '</b><span>' + CC.esc(texto) + '</span></div>'
            + '<i class="marca-passo">' + DESENHO[desenho] + '</i></li>').join('') + '</ol>'
          + '<div class="acoes">'
          + (podeInstalarJa ? '' : '<button class="botao" data-pronto>Já adicionei</button>')
          + '<button class="botao plano" data-pular>' + (contaNova ? 'Pular por agora' : 'Fechar') + '</button>'
          + '</div>';
        folha.querySelectorAll('[data-trocar]').forEach((b) => {
          b.onclick = () => { lembrar(b.dataset.trocar); guia(b.dataset.trocar); };
        });
        folha.querySelector('[data-pular]').onclick = fechar;
        const pronto = folha.querySelector('[data-pronto]');
        if (pronto) pronto.onclick = () => { fechar(); CC.avisar('Agora é só abrir pelo ícone do app'); };
        const ja = folha.querySelector('[data-instalar-ja]');
        if (ja) {
          ja.onclick = async () => {
            const pedido = pedidoInstalar;
            if (!pedido) { guia(sistema); return; }
            pedidoInstalar = null;
            pedido.prompt();
            const escolhaFeita = await pedido.userChoice.catch(() => null);
            if (escolhaFeita && escolhaFeita.outcome === 'accepted') {
              fechar();
              CC.avisar('Instalado! O app está na sua tela de início');
            } else {
              guia(sistema);
            }
          };
        }
      };

      // Um toque, quando o navegador deixa. Se ele avisou que sabe instalar, perguntar qual
      // celular é pergunta sem uso: ele já respondeu. Aqui a folha abre no botão, e o passo
      // a passo fica embaixo para quem recusar o pedido do navegador.
      const umToque = () => {
        folha.innerHTML = '<p class="fala-bento pequena">'
          + (contaNova ? 'Conta criada! Que tal deixar o app na tela de início do seu celular?'
            : 'Vamos colocar o app na tela de início do seu celular?')
          + '</p>'
          + '<h2>É um toque</h2>'
          + '<p>Ele passa a abrir como aplicativo, em tela cheia, e funciona sem internet.</p>'
          + '<div class="acoes">'
          + '<button class="botao" data-instalar-ja>' + CC.ico('baixar') + 'Adicionar à tela de início</button>'
          + '<button class="botao plano" data-pular>' + (contaNova ? 'Pular por agora' : 'Fechar') + '</button>'
          + '</div>'
          + '<button class="link-nota" data-passo-a-passo>Prefiro fazer pelo menu do navegador</button>'
          + (contaNova ? '<p class="nota-instalar">Dá para ver isto de novo em Perfil › Instalar no celular.</p>' : '');
        folha.querySelector('[data-pular]').onclick = fechar;
        folha.querySelector('[data-passo-a-passo]').onclick = () => guia(sistemaProvavel());
        folha.querySelector('[data-instalar-ja]').onclick = async () => {
          const pedido = pedidoInstalar;
          if (!pedido) { guia(sistemaProvavel()); return; }
          pedidoInstalar = null;
          pedido.prompt();
          const escolhaFeita = await pedido.userChoice.catch(() => null);
          if (escolhaFeita && escolhaFeita.outcome === 'accepted') {
            fechar();
            CC.avisar('Pronto! O app está na sua tela de início');
          } else {
            guia(sistemaProvavel());
          }
        };
      };

      // Pelo Perfil, quem já escolheu antes vai direto aos passos do seu celular.
      const conhecido = contaNova ? '' : lembrado();
      if (pedidoInstalar && !CC.rodandoComoApp()) umToque();
      else if (conhecido && PASSOS[conhecido]) guia(conhecido);
      else escolha();
      folha.focus();
    });
  };
})(window.CC);
