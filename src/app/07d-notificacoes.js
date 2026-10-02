/* Notificações: ativar neste aparelho, escolher o que chega e quando.
   As regras de quando avisar moram no servidor (notificacoes.mjs). Aqui fica só o pedido
   de permissão, a inscrição do aparelho e a tela de preferências. */
(function (CC) {
  'use strict';

  let cache = null;

  const suportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const ehIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
    || (/Macintosh/.test(navigator.userAgent || '') && navigator.maxTouchPoints > 1);
  const bytesDaChave = (b64) => {
    const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  };
  const chaveEmTexto = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  CC.carregarNotificacoes = () => CC.api('api/notificacoes').then((d) => { cache = d; return d; }).catch(() => null);

  async function inscricaoDoAparelho() {
    if (!suportado()) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? reg.pushManager.getSubscription() : null;
  }

  // O estado deste aparelho, do jeito que a tela precisa mostrar.
  CC.estadoNotificacoes = async function () {
    if (!location.protocol.startsWith('http')) return { situacao: 'sem-servidor' };
    if (!suportado()) return { situacao: ehIos() && !CC.rodandoComoApp() ? 'instalar' : 'sem-suporte' };
    const dados = await CC.carregarNotificacoes();
    if (Notification.permission === 'denied') return { situacao: 'bloqueado', dados };
    const sub = await inscricaoDoAparelho().catch(() => null);
    // Inscrição feita com a chave de outro servidor não recebe nada: conta como desligada.
    const chaveCerta = !(sub && sub.options && sub.options.applicationServerKey && dados && chaveEmTexto(sub.options.applicationServerKey) !== dados.chave);
    const ativo = !!(sub && dados && chaveCerta && (dados.aparelhos || []).includes(sub.endpoint));
    return { situacao: ativo ? 'ativo' : 'desligado', dados };
  };

  // Tem de ser chamada direto do toque num botão: o iPhone só mostra o pedido de
  // permissão quando ele nasce de um gesto da pessoa.
  CC.ativarNotificacoes = async function () {
    const permissao = await Notification.requestPermission();
    if (permissao !== 'granted') {
      throw new Error(permissao === 'denied' ? 'As notificações ficaram bloqueadas neste aparelho.' : 'Sem permissão, sem notificação.');
    }
    const dados = cache || await CC.carregarNotificacoes();
    if (!dados) throw new Error('Não consegui falar com o servidor agora.');
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) reg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    // Se o servidor trocou de chave, a inscrição antiga não recebe mais nada.
    if (sub && sub.options && sub.options.applicationServerKey && chaveEmTexto(sub.options.applicationServerKey) !== dados.chave) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDaChave(dados.chave) });
    await CC.api('api/notificacoes/inscrever', { inscricao: sub.toJSON() });
    await CC.carregarNotificacoes();
    try { localStorage.setItem('cc.aviso.push', 'feito'); localStorage.removeItem('cc.push.desligado'); } catch (e) { /* segue */ }
  };

  CC.desativarNotificacoes = async function () {
    const sub = await inscricaoDoAparelho().catch(() => null);
    if (sub) {
      await CC.api('api/notificacoes/cancelar', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    // Desligou por escolha: o conserto automático abaixo não religa.
    try { localStorage.setItem('cc.push.desligado', '1'); } catch (e) { /* segue */ }
    await CC.carregarNotificacoes();
  };

  CC.resumoNotificacoes = () => {
    if (!suportado()) return '';
    if (Notification.permission === 'denied') return 'bloqueadas';
    return Notification.permission === 'granted' && cache && (cache.aparelhos || []).length ? 'ativadas' : '';
  };

  // ---------- a tela ----------
  const HORAS = [];
  for (let m = 7 * 60; m <= 22 * 60; m += 30) HORAS.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));

  const cartao = (icone, titulo, texto, acoes) => '<div class="cartao-push">'
    + '<div class="cabeca-push"><span class="marca-push">' + CC.ico(icone) + '</span>'
    + '<div><b>' + CC.esc(titulo) + '</b><p>' + CC.esc(texto) + '</p></div></div>'
    + (acoes ? '<div class="acoes">' + acoes + '</div>' : '') + '</div>';

  const interruptor = (chave, rotulo, dica, ligado) => '<button class="linha-config" role="switch" data-pref="' + chave + '" aria-checked="' + !!ligado + '">'
    + '<span>' + CC.esc(rotulo) + '<small class="dica-config">' + CC.esc(dica) + '</small></span>'
    + '<span class="interruptor" aria-hidden="true"><i></i></span></button>';

  const salvar = async (mudanca) => {
    const r = await CC.api('api/notificacoes/preferencias', mudanca);
    if (cache) cache.preferencias = r.preferencias;
    return r.preferencias;
  };

  CC.vistaNotificacoes = async function (raiz) {
    // .folha-perfil: só apresentação, a folha do alto (25-perfil.css), com o cartão do estado.
    raiz.innerHTML = '<div class="folha-perfil">' + CC.botaoVoltar('Configurações') + '<h1>Notificações</h1></div>' + CC.esqueleto('lista');
    const e = await CC.estadoNotificacoes();
    if (!location.hash.startsWith('#/config/notificacoes')) return;
    const p = (e.dados && e.dados.preferencias) || { lembrete: true, hora: '19:00', ofensiva: true, amigos: true };

    const topo = ({
      ativo: cartao('certo', 'Ativadas neste aparelho', 'Os lembretes chegam mesmo com o app fechado.',
        '<button class="botao contorno" data-testar>' + CC.ico('sino') + 'Mandar uma de teste</button>'),
      desligado: cartao('sino', 'Receba um toque na hora certa',
        'Lembrete da leitura, ofensiva em risco e avisos dos amigos. No máximo 2 lembretes por dia, e nada de madrugada.',
        '<button class="botao" data-ativar>Ativar notificações</button>'),
      instalar: cartao('baixar', 'No iPhone, instale o app primeiro',
        'A Apple só entrega notificações para o app aberto pelo ícone da tela de início.',
        '<button class="botao" data-instalar>Ver como instalar</button>'),
      bloqueado: cartao('cadeado', 'As notificações estão bloqueadas',
        ehIos() ? 'Abra os Ajustes do iPhone, entre em Notificações, toque em Geração Eleita e ative.'
          : 'Toque no cadeado ao lado do endereço, ou nas informações do app no celular, e permita notificações.', ''),
      'sem-suporte': cartao('info', 'Este navegador não recebe notificações', 'No Android, use o Chrome. No iPhone, instale o app pela tela de início.', ''),
      'sem-servidor': cartao('info', 'Sem servidor, sem notificação', 'Abra o app pelo endereço dele para ativar.', ''),
    })[e.situacao];

    const preferencias = e.dados
      ? '<section class="grupo-config"><h2 class="etiqueta">O que chega</h2><div class="caixa-config">'
        + interruptor('lembrete', 'Lembrete da leitura', 'Só se você ainda não leu no dia', p.lembrete)
        + '<label class="linha-config sem-toque' + (p.lembrete ? '' : ' apagada') + '" for="hora-lembrete"><span>Horário do lembrete</span>'
        + '<select id="hora-lembrete" class="seletor-config"' + (p.lembrete ? '' : ' disabled') + '>'
        + HORAS.map((h) => '<option' + (h === p.hora ? ' selected' : '') + '>' + h + '</option>').join('') + '</select></label>'
        + interruptor('ofensiva', 'Ofensiva em risco', 'Às 21h, se a sua chama ainda não foi acesa', p.ofensiva)
        + interruptor('amigos', 'Amigos', 'Toques, pedidos e convites aceitos', p.amigos)
        + '</div></section>'
      : '';

    raiz.innerHTML = '<div class="folha-perfil">' + CC.botaoVoltar('Configurações') + '<h1>Notificações</h1>' + topo + '</div>' + preferencias
      + (e.situacao === 'ativo' ? '<div class="acoes"><button class="botao plano" data-desativar>Desativar neste aparelho</button></div>' : '');

    const ligar = (sel, fn) => { const el = raiz.querySelector(sel); if (el) el.onclick = () => fn(el); };
    ligar('[data-ativar]', async (b) => {
      b.disabled = true;
      try { await CC.ativarNotificacoes(); CC.avisar('Notificações ativadas!'); } catch (err) { CC.avisar(err.message); }
      CC.vistaNotificacoes(raiz);
    });
    ligar('[data-testar]', async (b) => {
      b.disabled = true;
      try { await CC.api('api/notificacoes/testar', {}); CC.avisar('Enviada! Deve chegar em segundos'); } catch (err) { CC.avisar(err.message); }
      b.disabled = false;
    });
    ligar('[data-instalar]', () => CC.tutorialInstalar());
    ligar('[data-desativar]', async () => {
      await CC.desativarNotificacoes();
      CC.avisar('Desativadas neste aparelho');
      CC.vistaNotificacoes(raiz);
    });
    raiz.querySelectorAll('[data-pref]').forEach((b) => {
      b.onclick = async () => {
        const novo = b.getAttribute('aria-checked') !== 'true';
        b.setAttribute('aria-checked', String(novo));
        try {
          await salvar({ [b.dataset.pref]: novo });
        } catch (err) {
          b.setAttribute('aria-checked', String(!novo));
          CC.avisar(err.message);
          return;
        }
        if (b.dataset.pref === 'lembrete') {
          const s = raiz.querySelector('#hora-lembrete');
          if (s) { s.disabled = !novo; s.closest('label').classList.toggle('apagada', !novo); }
        }
      };
    });
    const hora = raiz.querySelector('#hora-lembrete');
    if (hora) {
      hora.onchange = async () => {
        try { await salvar({ hora: hora.value }); CC.avisar('Lembrete às ' + hora.value); } catch (err) { CC.avisar(err.message); }
      };
    }
  };

  // ---------- o conserto ----------
  // A pessoa ligou as notificações, mas a inscrição deste aparelho não vale mais (o servidor
  // trocou de chave, ou a descartou porque o serviço de push recusou). Ao abrir o app, ela é
  // refeita em silêncio. Se o celular exigir um toque para isso, pergunta uma vez por dia.
  async function religar() {
    if (!(CC.quem && CC.quem.comSenha)) return;
    try { if (localStorage.getItem('cc.push.desligado')) return; } catch (e) { return; }
    const e = await CC.estadoNotificacoes().catch(() => null);
    if (!e || e.situacao !== 'desligado') return;
    try { await CC.ativarNotificacoes(); return; } catch (err) { /* segue para o pedido */ }
    const marca = 'religar:' + CC.hojeIso();
    try {
      if (localStorage.getItem('cc.aviso.religar') === marca) return;
      localStorage.setItem('cc.aviso.religar', marca);
    } catch (err) { return; }
    if (document.querySelector('.cortina, .tela-cheia')) return;
    CC.folha('<p class="fala-bento pequena">As notificações pararam neste celular.</p>'
      + '<p>Um toque e o lembrete da leitura volta a chegar.</p>'
      + '<div class="acoes"><button class="botao" data-sim>Religar</button>'
      + '<button class="botao plano" data-nao>Agora não</button></div>', {
      rotulo: 'Notificações', classe: 'folha-conta',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-nao]').onclick = fechar;
        folha.querySelector('[data-sim]').onclick = async () => {
          const ativando = CC.ativarNotificacoes();
          fechar();
          try { await ativando; CC.avisar('Notificações religadas!'); } catch (err) { CC.avisar(err.message); }
        };
      },
    });
  }

  // ---------- o convite para ativar ----------
  // Uma pergunta só, na hora em que faz sentido: o app já aberto pelo ícone (no iPhone é
  // o único jeito de receber) e a pessoa ainda não decidiu. "Agora não" pergunta de novo
  // uma única vez, uma semana depois, e nunca mais.
  CC.talvezOferecerNotificacoes = function () {
    if (suportado() && CC.rodandoComoApp() && Notification.permission === 'granted') { religar(); return; }
    // No iPhone só há notificação com o app instalado (suportado() já dá falso fora dele); no
    // Android o navegador também aceita, então o pedido vem logo depois do tutorial de instalar.
    if (!suportado() || Notification.permission !== 'default') return;
    if (!(CC.quem && CC.quem.comSenha)) return;
    // Nunca antes da primeira leitura: quem ainda não fez um dia (do plano, dos Primeiros passos
    // ou do Conhecer Jesus) não sabe do que o lembrete serve, e "Agora não" custava 7 dias sem
    // convite. O pedido vem no fim do primeiro dia feito (CC.depoisDoPrimeiroDia).
    if (CC.datasFeitas && !CC.datasFeitas().size) return;
    let marca = '';
    try { marca = localStorage.getItem('cc.aviso.push') || ''; } catch (e) { return; }
    if (marca === 'feito' || marca === 'nunca') return;
    if (marca && Date.now() - Number(marca) < 7 * 864e5) return;
    try { localStorage.setItem('cc.aviso.push', marca ? 'nunca' : String(Date.now())); } catch (e) { return; }

    CC.folha('<p class="fala-bento pequena">Posso te dar um toque na hora da leitura?</p>'
      + '<p>Um lembrete por dia, no horário que você escolher, e os avisos dos seus amigos. Nada de madrugada, nada de spam.</p>'
      + '<div class="acoes"><button class="botao" data-sim>Pode mandar</button>'
      + '<button class="botao plano" data-nao>Agora não</button></div>', {
      rotulo: 'Notificações', classe: 'folha-conta',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-nao]').onclick = fechar;
        folha.querySelector('[data-sim]').onclick = async () => {
          const ativando = CC.ativarNotificacoes();
          fechar();
          try {
            await ativando;
            CC.avisar('Pronto! Lembrete às ' + ((cache && cache.preferencias && cache.preferencias.hora) || '19:00'));
          } catch (err) { CC.avisar(err.message); }
        };
      },
    });
  };
})(window.CC);
