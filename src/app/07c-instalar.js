/* Instalar no celular: o tutorial que transforma o site num ícone na tela de início.
   Abre sozinho depois do primeiro dia feito pela conta nova (nunca antes da primeira
   leitura) e fica à mão no Perfil. Sempre dá para pular: ninguém fica preso nele.

   O que a pessoa vê depende de onde ela está (02/10, "instalar não funciona no Android"):
   - o navegador avisou que sabe instalar (beforeinstallprompt): um botão que abre a janela
     dele, com o passo a passo pelo menu logo abaixo para quem recusar ou se ela não abrir;
   - Chrome no Android sem esse aviso: os passos pelo menu ⋮, com o que fazer quando o menu
     não tem "Instalar app" (já instalado, ou a janela é do WhatsApp/Instagram);
   - navegador de dentro de outro app (WebView, Facebook, Instagram, ou a aba que o WhatsApp
     abre): "Abra no Chrome", com um botão que abre o Chrome e outro que copia o link;
   - Samsung Internet, Firefox, Edge: os passos do menu de cada um;
   - iPhone: Compartilhar > Adicionar à Tela de Início (no app do Instagram/Facebook, abrir no Safari);
   - já instalado: diz isso e onde achar o ícone, sem oferecer instalar de novo.
   Nenhum botão fica sem resposta: se a janela do navegador não abre, aparece o passo manual. */
(function (CC) {
  'use strict';

  // O fim do primeiro dia da conta nova (o "Até amanhã" da lição, o "Terminei o dia" do Conhecer
  // Jesus): agora sim, instalar e lembretes. A marca cc.instalar vem do cadastro (entrar.html) e
  // sai aqui, para o tutorial não voltar a cada dia; o convite de notificações decide sozinho se
  // ainda cabe (07d-notificacoes.js). Com algo aberto na tela, espera a próxima vez.
  CC.depoisDoPrimeiroDia = function () {
    let nova = false;
    try { nova = localStorage.getItem('cc.instalar') === '1'; if (nova) localStorage.removeItem('cc.instalar'); } catch (e) { /* segue */ }
    setTimeout(async () => {
      if (nova && !CC.rodandoComoApp() && !document.querySelector('.cortina, .tela-cheia')) await CC.tutorialInstalar({ contaNova: true });
      if (!document.querySelector('.cortina, .tela-cheia') && CC.talvezOferecerNotificacoes) CC.talvezOferecerNotificacoes();
    }, 900);
  };

  // O aviso do navegador (beforeinstallprompt) chega uma vez por página. O primeiro script do
  // index.html já o guarda em window.__pedidoInstalar, antes de o app (que espera 4 MB de
  // conteúdo) existir: assim ele não se perde se vier cedo. Daqui em diante, este ouvinte.
  let pedidoInstalar = window.__pedidoInstalar || null;
  let recebeuPedido = !!pedidoInstalar;
  addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); pedidoInstalar = ev; recebeuPedido = true; });
  const marcarInstalado = () => { try { localStorage.setItem('cc.instalado', CC.hojeIso ? CC.hojeIso() : '1'); } catch (e) { /* segue */ } };
  addEventListener('appinstalled', () => { pedidoInstalar = null; marcarInstalado(); });
  if (window.__appInstalado) marcarInstalado();

  CC.rodandoComoApp = () => {
    try { if (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches) return true; } catch (e) { /* segue */ }
    return navigator.standalone === true;
  };

  // Onde a pessoa está, pelo userAgent (e pela origem guardada pela página de entrada: a aba
  // que o WhatsApp abre tem o userAgent do Chrome, mas chega com referrer android-app://).
  const ua = () => navigator.userAgent || '';
  const sistemaProvavel = () => {
    const u = ua();
    if (/iPhone|iPad|iPod/i.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(u)) return 'android';
    return '';
  };
  const origemApp = () => { try { return sessionStorage.getItem('cc.origemApp') || ''; } catch (e) { return ''; } };
  CC.navegadorProvavel = () => {
    const u = ua();
    if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat|Pinterest|LinkedInApp|Twitter/i.test(u)) return 'embutido';
    if (sistemaProvavel() === 'android') {
      if (/; ?wv\)/.test(u) || /Version\/\d+(\.\d+)* Chrome\/[\d.]+ Mobile/.test(u)) return 'embutido';
      if (/SamsungBrowser/i.test(u)) return 'samsung';
      if (/Firefox/i.test(u)) return 'firefox';
      if (/EdgA/i.test(u)) return 'edge';
      if (/OPR\/|Opera|YaBrowser|UCBrowser|MiuiBrowser|HuaweiBrowser|HeyTapBrowser/i.test(u)) return 'outro';
      return 'chrome';
    }
    if (sistemaProvavel() === 'ios') return /CriOS|FxiOS|EdgiOS/i.test(u) ? 'outro' : 'safari';
    return '';
  };
  // Aberto pela aba de outro app (o link chegou pelo WhatsApp, por exemplo): o Chrome não oferece
  // instalar ali dentro, e o menu dela tem "Abrir no Chrome" no lugar de "Instalar app".
  const dentroDeOutroApp = () => CC.navegadorProvavel() === 'embutido' || (!!origemApp() && !recebeuPedido);
  const nomeDoApp = () => {
    const o = origemApp().replace(/^android-app:\/\//, '').replace(/\/.*$/, '');
    if (/whatsapp/i.test(o)) return 'WhatsApp';
    if (/instagram/i.test(o) || /Instagram/.test(ua())) return 'Instagram';
    if (/facebook|katana|orca/i.test(o) || /FBAN|FBAV|FB_IAB/.test(ua())) return 'Facebook';
    if (/telegram/i.test(o)) return 'Telegram';
    return '';
  };

  const lembrado = () => { try { return localStorage.getItem('cc.sistema') || ''; } catch (e) { return ''; } };
  const lembrar = (s) => { try { localStorage.setItem('cc.sistema', s); } catch (e) { /* segue */ } };

  // Já instalado neste aparelho? No Android, o Chrome responde por getInstalledRelatedApps (o
  // manifesto aponta para ele mesmo em related_applications); a marca local vem do appinstalled.
  CC.jaInstalado = async () => {
    if (CC.rodandoComoApp()) return true;
    try {
      if (navigator.getInstalledRelatedApps) {
        const lista = await Promise.race([navigator.getInstalledRelatedApps(), new Promise((r) => setTimeout(() => r(null), 1500))]);
        if (lista && lista.length) return true;
      }
    } catch (e) { /* segue */ }
    return false;
  };

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
    tracos: traco('<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>'),
    sair: traco('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
    certo: traco('<path d="M20 6 9 17l-5-5"/>'),
  };

  // Os passos de cada navegador. O primeiro do Chrome já responde ao caso mais comum de "não
  // tem Instalar no menu": o link aberto dentro do WhatsApp ou do Instagram.
  const PASSOS = {
    safari: [
      ['navegador', 'Abra no Safari', 'Pelo Chrome também dá: o botão Compartilhar fica ao lado do endereço.'],
      ['compartilhar', 'Toque em Compartilhar', 'É o quadrado com a seta para cima, na barra de baixo do Safari.'],
      ['adicionar', 'Adicionar à Tela de Início', 'Role a lista para baixo até achar. Se não estiver lá, toque em "Editar Ações" e ative.'],
      ['certo', 'Toque em Adicionar', 'Fica no canto de cima, à direita. Pronto: o ícone aparece na sua tela de início.'],
    ],
    chrome: [
      ['menu', 'Toque nos três pontinhos', 'Ficam no canto de cima, à direita do endereço. Se o menu mostrar "Abrir no Chrome", toque nele antes: você está numa janela de outro app.'],
      ['adicionar', 'Instalar app', 'Em alguns celulares o nome é "Adicionar à tela inicial". Qualquer um dos dois serve.'],
      ['certo', 'Confirme em Instalar', 'O ícone do app aparece junto dos seus outros aplicativos.'],
    ],
    samsung: [
      ['tracos', 'Toque no menu', 'São os três tracinhos, na barra de baixo, à direita.'],
      ['adicionar', 'Adicionar página a', 'E depois em "Tela inicial". Se aparecer um ícone de baixar na barra de endereço, ele também instala.'],
      ['certo', 'Confirme em Adicionar', 'O ícone do app aparece na sua tela inicial.'],
    ],
    firefox: [
      ['menu', 'Toque nos três pontinhos', 'Ficam ao lado do endereço, em cima ou embaixo, conforme o seu Firefox.'],
      ['adicionar', 'Instalar', 'Em algumas versões o nome é "Adicionar à tela inicial".'],
      ['certo', 'Confirme em Adicionar', 'O ícone do app aparece na sua tela inicial.'],
    ],
    edge: [
      ['menu', 'Toque nos três pontinhos', 'Ficam na barra de baixo, no meio.'],
      ['adicionar', 'Adicionar ao telefone', 'Ou "Instalar app", conforme a versão.'],
      ['certo', 'Confirme em Instalar', 'O ícone do app aparece junto dos seus outros aplicativos.'],
    ],
  };
  const NOME = { ios: 'iPhone', android: 'Android' };
  const NOME_NAVEGADOR = { chrome: 'Chrome', samsung: 'Samsung Internet', firefox: 'Firefox', edge: 'Edge', safari: 'Safari' };

  // O link que abre esta mesma página no Chrome do Android (padrão intent:// do Android), com a
  // busca (?convite=...) junto. Sem o Chrome instalado, o Android volta ao endereço de reserva.
  const linkDoChrome = () => 'intent://' + location.host + location.pathname + location.search
    + '#Intent;scheme=' + location.protocol.replace(':', '') + ';package=com.android.chrome;S.browser_fallback_url='
    + encodeURIComponent(location.href.split('#')[0]) + ';end';
  // No iPhone, o navegador de dentro do Instagram/Facebook abre o Safari por x-safari-https://.
  const linkDoSafari = () => 'x-safari-' + location.protocol.replace(':', '') + '://' + location.host + location.pathname + location.search;

  // Uma linha para quem ajuda a pessoa (ou o dono, num print): o que o app enxerga daqui.
  CC.diagnosticoInstalar = () => {
    const v = (ua().match(/(?:Chrome|CriOS|SamsungBrowser|Firefox|FxiOS|Version)\/(\d+)/) || [])[1] || '?';
    const sw = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    return [
      (NOME_NAVEGADOR[CC.navegadorProvavel()] || CC.navegadorProvavel() || 'navegador') + ' ' + v,
      NOME[sistemaProvavel()] || 'computador',
      'janela de instalar: ' + (pedidoInstalar ? 'pronta' : recebeuPedido ? 'já usada' : 'não veio'),
      'service worker: ' + (sw ? 'ativo' : 'não'),
      'modo: ' + (CC.rodandoComoApp() ? 'app' : 'navegador'),
      origemApp() ? 'aberto por ' + origemApp().replace(/^android-app:\/\//, '') : '',
    ].filter(Boolean).join(' · ');
  };

  // Abre a janela do navegador. Devolve 'aceito', 'recusado' ou 'falhou' (sem pedido, ou o
  // navegador não deixou: aí quem chama mostra o passo manual, nunca um botão mudo).
  const usarPedido = async () => {
    const pedido = pedidoInstalar;
    if (!pedido) return 'falhou';
    pedidoInstalar = null;
    try {
      await pedido.prompt();
      const escolha = await Promise.race([pedido.userChoice, new Promise((r) => setTimeout(() => r(null), 120000))]);
      if (escolha && escolha.outcome === 'accepted') { marcarInstalado(); return 'aceito'; }
      return 'recusado';
    } catch (e) {
      return 'falhou';
    }
  };

  const fala = (contaNova) => '<p class="fala-bento pequena">'
    + (contaNova ? 'Primeiro dia feito! Que tal deixar o app na tela de início do seu celular?'
      : 'Vamos colocar o app na tela de início do seu celular?')
    + '</p>';
  const listaPassos = (lista) => '<ol class="passos-instalar">' + lista.map(([desenho, titulo, texto]) => '<li>'
    + '<div><b>' + CC.esc(titulo) + '</b><span>' + CC.esc(texto) + '</span></div>'
    + '<i class="marca-passo">' + DESENHO[desenho] + '</i></li>').join('') + '</ol>';

  // Abre o tutorial e resolve quando ele fecha, por qualquer caminho: pular, pronto,
  // toque fora ou Esc. Assim a partida do app espera por ele antes de abrir outra folha.
  CC.tutorialInstalar = function ({ contaNova = false, fora = false } = {}) {
    return new Promise((resolver) => {
      const { folha, fechar } = CC.folha('', { classe: 'folha-instalar', rolavel: true, rotulo: 'Instalar no celular' });
      const cortina = folha.parentNode;
      const vigia = new MutationObserver(() => {
        if (!document.body.contains(cortina)) { vigia.disconnect(); resolver(); }
      });
      vigia.observe(document.body, { childList: true });
      const botaoFechar = '<button class="botao plano" data-pular>' + (contaNova ? 'Pular por agora' : 'Fechar') + '</button>';
      const ligarFechar = () => { const p = folha.querySelector('[data-pular]'); if (p) p.onclick = fechar; };

      // "Não funcionou?": o que fazer quando o menu não tem a opção, e a linha de diagnóstico.
      const ajuda = (variante) => '<div class="ajuda-instalar">'
        + '<button class="link-nota" data-nao-funcionou aria-expanded="false">Não funcionou?</button>'
        + '<div class="ajuda-instalar-corpo" hidden>'
        + '<p>Se o menu mostra <b>Abrir app</b>, ele já está instalado: procure o ícone do Geração Eleita junto dos seus aplicativos.</p>'
        + (variante === 'safari' ? '<p>No iPhone, só o Safari (ou o Chrome com iOS 16.4 ou mais novo) coloca na Tela de Início.</p>'
          : '<p>Se não aparece <b>Instalar app</b> nem <b>Adicionar à tela inicial</b>, abra o link no Chrome atualizado. Dentro do WhatsApp, do Instagram ou do Facebook não dá.</p>')
        + '<p class="diagnostico-instalar">' + CC.esc(CC.diagnosticoInstalar()) + '</p>'
        + '</div></div>';
      const ligarAjuda = () => {
        const b = folha.querySelector('[data-nao-funcionou]');
        if (!b) return;
        b.onclick = () => {
          const corpo = folha.querySelector('.ajuda-instalar-corpo');
          corpo.hidden = !corpo.hidden;
          b.setAttribute('aria-expanded', String(!corpo.hidden));
        };
      };

      // Escolha do celular: só quando o userAgent não diz (computador, tablet estranho).
      const escolha = () => {
        folha.innerHTML = fala(contaNova)
          + '<h2>Qual celular você usa?</h2>'
          + '<p>Assim ele abre como um aplicativo, em tela cheia, com um toque.</p>'
          + '<div class="escolha-sistema">'
          + ['ios', 'android'].map((s) => '<button class="opcao-sistema" data-sistema="' + s + '">'
            + DESENHO.celular + NOME[s] + '<small>' + (s === 'ios' ? 'Safari' : 'Chrome') + '</small></button>').join('')
          + '</div>'
          + '<div class="acoes">' + botaoFechar + '</div>'
          + (contaNova ? '<p class="nota-instalar">Dá para ver isto de novo em Perfil › Instalar no celular.</p>' : '');
        folha.querySelectorAll('[data-sistema]').forEach((b) => {
          b.onclick = () => { lembrar(b.dataset.sistema); guia(b.dataset.sistema); };
        });
        ligarFechar();
      };

      // Os passos manuais. O navegador vem do userAgent quando o sistema é o deste celular;
      // trocando para o outro sistema (ajudar alguém), valem os passos do navegador padrão dele.
      const guia = (sistema, { aviso = '' } = {}) => {
        if (!NOME[sistema]) sistema = 'android';
        const daqui = sistema === sistemaProvavel();
        let variante = sistema === 'ios' ? 'safari' : 'chrome';
        if (daqui && PASSOS[CC.navegadorProvavel()]) variante = CC.navegadorProvavel();
        if (daqui && dentroDeOutroApp()) { abrirFora(); return; }
        const podeInstalarJa = daqui && sistema === 'android' && pedidoInstalar;
        folha.innerHTML = '<h2>Instalar no ' + NOME[sistema] + '</h2>'
          + '<div class="segmentado" role="group" aria-label="Celular">'
          + ['ios', 'android'].map((s) => '<button data-trocar="' + s + '" aria-pressed="' + (s === sistema) + '">'
            + NOME[s] + '</button>').join('')
          + '</div>'
          + (aviso ? '<p class="nota-instalar aviso-instalar" role="status">' + CC.esc(aviso) + '</p>' : '')
          + (CC.rodandoComoApp() ? '<p class="nota-instalar">Você já está usando pelo ícone. Os passos ficam aqui para ajudar alguém.</p>' : '')
          + (podeInstalarJa ? '<div class="acoes"><button class="botao" data-instalar-ja>Instalar agora</button></div>'
            + '<p class="nota-instalar">Ou faça pelo menu do Chrome:</p>' : '')
          + (variante !== 'chrome' && variante !== 'safari' ? '<p class="nota-instalar">No ' + NOME_NAVEGADOR[variante] + ':</p>' : '')
          + listaPassos(PASSOS[variante])
          + '<div class="acoes">'
          + (podeInstalarJa ? '' : '<button class="botao" data-pronto>Já adicionei</button>')
          + botaoFechar
          + '</div>'
          + (daqui ? ajuda(variante) : '');
        folha.querySelectorAll('[data-trocar]').forEach((b) => {
          b.onclick = () => { lembrar(b.dataset.trocar); guia(b.dataset.trocar); };
        });
        ligarFechar();
        ligarAjuda();
        const pronto = folha.querySelector('[data-pronto]');
        if (pronto) pronto.onclick = () => { fechar(); CC.avisar('Agora é só abrir pelo ícone do app'); };
        const ja = folha.querySelector('[data-instalar-ja]');
        if (ja) ja.onclick = () => instalarJa(sistema);
      };

      const instalarJa = async (sistema) => {
        const resultado = await usarPedido();
        if (resultado === 'aceito') { fechar(); CC.avisar('Instalado! O app está na sua tela de início'); return; }
        guia(sistema || sistemaProvavel() || lembrado(), {
          aviso: resultado === 'falhou' ? 'O navegador não abriu a janela de instalar. Faça pelo menu, assim:'
            : 'Tudo bem. Se mudar de ideia, é só seguir estes passos:',
        });
      };

      // Dentro de outro app (WebView, Instagram, Facebook, a aba do WhatsApp): dali não se
      // instala. Abre no Chrome (Android) ou no Safari (iPhone), ou copia o link.
      const abrirFora = () => {
        const ios = sistemaProvavel() === 'ios';
        const app = nomeDoApp();
        folha.innerHTML = fala(contaNova)
          + '<h2>Abra no ' + (ios ? 'Safari' : 'Chrome') + '</h2>'
          + '<p>' + (app ? 'Você abriu o link pelo ' + app + '. ' : 'Você está no navegador de outro app. ')
          + 'Daqui não dá para instalar: abra no ' + (ios ? 'Safari' : 'Chrome') + ' e entre com o mesmo @usuário e senha.'
          + (ios ? ' No iPhone, só o Safari coloca o app na Tela de Início.' : '') + '</p>'
          + listaPassos(ios
            ? [['menu', 'Toque nos três pontinhos', 'Ou no ícone de compartilhar do app.'], ['navegador', 'Abrir no Safari', 'Ou "Abrir no navegador".']]
            : [['menu', 'Toque nos três pontinhos', 'Ficam no canto de cima, à direita.'], ['sair', 'Abrir no Chrome', 'Ou "Abrir no navegador". Lá, o menu tem "Instalar app".']])
          + '<div class="acoes">'
          + (ios ? '<a class="botao" data-abrir-safari href="' + CC.esc(linkDoSafari()) + '">Abrir no Safari</a>'
            : '<a class="botao" data-abrir-chrome href="' + CC.esc(linkDoChrome()) + '">Abrir no Chrome</a>')
          + '<button class="botao contorno" data-copiar-link>Copiar o link</button>'
          + botaoFechar
          + '</div>'
          + ajuda(ios ? 'safari' : 'chrome');
        ligarFechar();
        ligarAjuda();
        folha.querySelector('[data-copiar-link]').onclick = async () => {
          const ok = CC.copiar ? await CC.copiar(location.origin + '/') : false;
          CC.avisar(ok ? 'Link copiado. Cole no ' + (ios ? 'Safari' : 'Chrome') : location.origin + '/');
        };
      };

      // Um toque, quando o navegador deixa. Se ele avisou que sabe instalar, perguntar qual
      // celular é pergunta sem uso: ele já respondeu. O passo a passo fica embaixo.
      const umToque = () => {
        folha.innerHTML = fala(contaNova)
          + '<h2>É um toque</h2>'
          + '<p>Ele passa a abrir como aplicativo, em tela cheia, e funciona sem internet.</p>'
          + '<div class="acoes">'
          + '<button class="botao" data-instalar-ja>' + CC.ico('baixar') + 'Adicionar à tela de início</button>'
          + botaoFechar
          + '</div>'
          + '<button class="link-nota" data-passo-a-passo>Prefiro fazer pelo menu do navegador</button>'
          + (contaNova ? '<p class="nota-instalar">Dá para ver isto de novo em Perfil › Instalar no celular.</p>' : '');
        ligarFechar();
        folha.querySelector('[data-passo-a-passo]').onclick = () => guia(sistemaProvavel() || lembrado());
        folha.querySelector('[data-instalar-ja]').onclick = () => instalarJa();
      };

      // Já instalado neste celular: o ícone já existe, não há o que instalar de novo.
      const instalado = () => {
        folha.innerHTML = '<h2>O app já está instalado</h2>'
          + '<p>Procure o ícone do Geração Eleita junto dos seus aplicativos e abra por ele: é ali que ele roda em tela cheia e sem internet.</p>'
          + '<div class="acoes"><button class="botao" data-pular>Entendi</button></div>'
          + '<button class="link-nota" data-passo-a-passo>Ver os passos mesmo assim</button>';
        ligarFechar();
        folha.querySelector('[data-passo-a-passo]').onclick = () => guia(sistemaProvavel() || lembrado());
      };

      const comecar = async () => {
        if (fora) { abrirFora(); return; }
        if (pedidoInstalar && !CC.rodandoComoApp()) { umToque(); return; }
        if (!CC.rodandoComoApp() && await CC.jaInstalado()) { instalado(); return; }
        const sistema = sistemaProvavel() || (contaNova ? '' : lembrado());
        if (sistema) guia(sistema);
        else escolha();
      };
      comecar().then(() => folha.focus());
    });
  };

  // Chegou ao app (já com sessão) pelo navegador de dentro de outro app: no Android, tenta abrir
  // no Chrome sozinho, uma vez por aba (a página de entrada faz o mesmo); depois, nos dois
  // sistemas, a folha "Abra no Chrome/Safari", também uma vez por aba. Quem está num navegador
  // de verdade (Chrome, Samsung Internet, Firefox, Edge, Safari) nunca é empurrado: lá ele instala.
  CC.talvezAbrirNoNavegador = async () => {
    if (CC.navegadorProvavel() !== 'embutido' || CC.rodandoComoApp()) return;
    if (sistemaProvavel() === 'android') {
      let tentou = '1';
      try { tentou = sessionStorage.getItem('cc.tentouChrome') || ''; sessionStorage.setItem('cc.tentouChrome', '1'); } catch (e) { /* segue */ }
      if (!tentou) location.href = linkDoChrome();
    }
    // Conta recém-criada não vê folha antes do texto bíblico: o tutorial do fim do primeiro dia
    // já abre em "Abra no Chrome/Safari" (abrirFora), e a faixa da entrada já avisou.
    let nova = false;
    try { nova = localStorage.getItem('cc.instalar') === '1'; } catch (e) { /* segue */ }
    if (nova || document.querySelector('.cortina, .tela-cheia')) return;
    let visto = '1';
    try { visto = sessionStorage.getItem('cc.folhaFora') || ''; sessionStorage.setItem('cc.folhaFora', '1'); } catch (e) { /* segue */ }
    if (!visto) await CC.tutorialInstalar({ fora: true });
  };
})(window.CC);
