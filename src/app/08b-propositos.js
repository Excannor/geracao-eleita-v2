/* Propósitos: o compromisso de ler, ou orar, junto. Em dupla, com quantas pessoas quiser; em
   grupo, até 5, com a meta coletiva do dia. A célula é um grupo de até 20 que cresce por link. O
   servidor faz as contas; aqui só aparece quem já fez hoje, nunca o que alguém escreveu ou orou. */
(function (CC) {
  'use strict';

  let cache = null;
  const retrato = (p, tamanho) => CC.retratoAmigo(p, tamanho);
  const euUsuario = () => (CC.quem || {}).usuario;
  const acao = (corpo) => CC.api('api/propositos', corpo);

  CC.carregarPropositos = () => CC.api('api/propositos').then((d) => { cache = d; return d; }).catch(() => null);
  // A célula mora no Juntos, num cartão próprio; Propósitos fica com as duplas e os grupos.
  CC.minhasCelulas = () => ((cache && cache.propositos) || []).filter((p) => p.celula && !p.euConvidado);

  const ICONE = { plano: 'trilha', livro: 'livro', oracao: 'aperto' };
  const ROTULO_TIPO = { plano: 'Plano de leitura', livro: 'Leitura', oracao: 'Oração' };
  const EXPLICA = {
    plano: 'Conta os dias seguidos em que todos fazem a lição do plano.',
    livro: 'Conta os dias em que vocês leem, no plano, um trecho dessa leitura. Não precisa ser seguido.',
    // Oração não tem placar: nem dias seguidos, nem pontos, nem quem faltou (Mt 6.5-6).
    oracao: 'Um lugar para lembrar de orar uns pelos outros.',
  };

  // O que o propósito pede, independente do nome que o grupo ganhou.
  const oQue = (p) => (p.tipo !== 'livro' ? ROTULO_TIPO[p.tipo] || ''
    : p.alvo === 'nt' ? 'Novo Testamento' : p.alvo === 'at' ? 'Antigo Testamento' : p.alvo);
  const ativos = (p) => p.membros.filter((m) => m.estado === 'ativo');
  const nomeCurto = (m) => (m.usuario === euUsuario() ? 'Você' : m.nome);
  const verbo = (p, plural) => (p.tipo === 'oracao' ? (plural ? 'oraram' : 'orou') : (plural ? 'leram' : 'leu'));

  function contagem(p) {
    if (p.tipo === 'oracao') return '<span class="dias-cartao orando">' + CC.ico('aperto') + '<small>orando juntos</small></span>';
    const um = p.dias === 1;
    const rotulo = p.grupo
      ? (p.tipo === 'livro' ? (um ? 'dia de meta' : 'dias de meta') : (um ? 'dia seguido' : 'dias seguidos'))
      : (p.tipo === 'livro' ? (um ? 'dia lido' : 'dias lidos') : (um ? 'dia junto' : 'dias juntos'));
    return '<span class="dias-cartao">' + CC.icoChama() + p.dias + '<small>' + rotulo + '</small></span>';
  }

  function barraDoGrupo(hoje) {
    const fracao = hoje.meta ? Math.min(1, hoje.pontos / hoje.meta) : 0;
    return '<div class="barra-missao" style="--cor: var(--' + (hoje.batida ? 'verde' : 'azul') + ')">'
      + '<i style="width:' + (fracao * 100).toFixed(1) + '%"></i>'
      + '<span>' + (hoje.batida ? 'Meta de hoje batida!' : hoje.pontos + ' de ' + hoje.meta + ' pontos hoje') + '</span></div>';
  }

  function situacaoDaDupla(p) {
    const gente = ativos(p);
    const eu = gente.find((m) => m.usuario === euUsuario());
    const outro = gente.find((m) => m.usuario !== euUsuario());
    if (!outro) return '<span class="selo-status">Esperando aceitar</span>';
    if (p.tipo === 'oracao') return '<span class="selo-status">' + (eu && eu.fezHoje ? CC.ico('certo') + 'Você orou hoje' : 'Orem uns pelos outros') + '</span>';
    if (eu && eu.fezHoje && outro.fezHoje) return '<span class="selo-status leu">' + CC.ico('certo') + 'Vocês dois ' + verbo(p, true) + ' hoje</span>';
    if (outro.fezHoje) return '<span class="selo-status leu">' + CC.ico('certo') + CC.esc(outro.nome) + ' já ' + verbo(p) + ' hoje</span>';
    if (eu && eu.fezHoje) return '<span class="selo-status">Falta ' + CC.esc(outro.nome) + '</span>';
    return '<span class="selo-status">Ninguém ' + verbo(p) + ' hoje ainda</span>';
  }

  function cabeca(p) {
    const gente = p.membros.filter((m) => m.estado !== 'saiu');
    const outros = gente.filter((m) => m.usuario !== euUsuario());
    const quem = p.grupo ? CC.plural(ativos(p).length, 'pessoa', 'pessoas') : outros.map((m) => CC.esc(m.nome)).join(', ');
    return '<div class="cabeca-proposito">'
      + '<span class="' + (p.grupo ? 'retratos-grupo' : 'retratos-dupla') + '">'
      // Célula pode ter 20 pessoas: o cartão mostra 5 retratos e conta o resto.
      + (p.grupo ? gente : outros).slice(0, 5).map((m) => retrato(m, (p.grupo ? 'pequeno' : 'medio') + (m.fezHoje ? ' fez' : ''))).join('')
      + (p.grupo && gente.length > 5 ? '<span class="retrato-amigo pequeno retrato-mais">+' + (gente.length - 5) + '</span>' : '') + '</span>'
      + '<span class="quem-amigo"><b>' + CC.esc(p.grupo ? p.titulo : quem) + '</b>'
      // Toda célula lê o plano: ali o "Plano de leitura" só roubava espaço do número de pessoas.
      + '<span class="tipo-proposito">' + CC.ico(p.celula ? 'pessoas' : ICONE[p.tipo] || 'trilha') + '<span>'
        + CC.esc(p.celula ? quem : p.grupo ? quem + ' · ' + oQue(p) : oQue(p)) + '</span></span></span>'
      + (p.euConvidado ? '' : contagem(p))
      + '</div>';
  }

  function cartao(p) {
    return '<button class="cartao-proposito" data-proposito="' + CC.esc(p.id) + '">'
      + cabeca(p)
      + (p.celula && encontroHoje(p) ? '<span class="selo-status leu">' + CC.ico('livro') + 'Encontro hoje · veja o estudo</span>' : '')
      + (p.celula && p.recado ? '<p class="recado-cartao">' + CC.esc(p.recado) + '</p>' : '')
      + (p.grupo && p.hoje && p.tipo !== 'oracao' ? barraDoGrupo(p.hoje) : situacaoDaDupla(p))
      + '</button>';
  }

  // O cartão da célula no Juntos: o nome, quem leu hoje, o encontro e o recado do líder.
  CC.cartaoCelula = function (p) {
    return '<button class="cartao-proposito cartao-celula" data-celula="' + CC.esc(p.id) + '">'
      + '<span class="etiqueta-celula">' + CC.ico('pessoas') + 'Célula'
        + (p.encontro >= 0 && !encontroHoje(p) ? '<small>Encontro ' + nomeDoEncontro(p.encontro) + '</small>' : '') + '</span>'
      + cabeca(p)
      + (p.recado ? '<p class="recado-cartao"><span><b>' + CC.esc(nomeDoLider(p)) + ':</b> ' + CC.esc(p.recado) + '</span></p>' : '')
      + (encontroHoje(p) ? '<span class="selo-status leu">' + CC.ico('livro') + 'Encontro hoje · veja o estudo</span>' : '')
      + (p.hoje ? barraDoGrupo(p.hoje) : '')
      + '</button>';
  };
  // ---------- a célula como tela ----------
  // Uma célula de 20 pessoas não cabia numa folha: a célula tem tela própria, com três abas.
  //   Hoje: o recado, o encontro e a meta do dia, e o que o líder muda (recado, dia, link)
  //   Estudo: o estudo do encontro inteiro, para ler antes e mandar no grupo
  //   Pessoas: quem leu hoje, notificar quem falta, chamar alguém, sair ou encerrar
  const ABAS_CELULA = [['hoje', 'Hoje'], ['estudo', 'Estudo'], ['pessoas', 'Pessoas']];
  const enderecoCelula = (id, aba) => '#/novidades/celula/' + encodeURIComponent(id) + (aba && aba !== 'hoje' ? '/' + aba : '');
  CC.abrirCelula = (id, aba) => { location.hash = enderecoCelula(id, aba); };
  let desenhoCelula = 0;

  CC.vistaCelula = function (raiz, arg) {
    const [id, pedida] = String(arg || '').split('/');
    const aba = ABAS_CELULA.some(([k]) => k === pedida) ? pedida : 'hoje';
    const meu = ++desenhoCelula;
    const nestaTela = () => meu === desenhoCelula && location.hash.startsWith('#/novidades/celula/');

    const desenhar = (d) => {
      if (!d) { raiz.innerHTML = CC.botaoVoltar('Juntos') + '<div class="leitor-esqueleto"><i></i><i></i><i></i></div>'; ligarVoltar(raiz); return; }
      const p = (d.propositos || []).find((x) => x.id === id && x.celula && !x.euConvidado);
      if (!p) {
        raiz.innerHTML = CC.botaoVoltar('Juntos') + '<div class="vazio-amigos">' + CC.ico('pessoas') + '<p>Essa célula não está mais na sua lista.</p></div>';
        ligarVoltar(raiz);
        return;
      }
      const souLider = p.criadoPor === euUsuario();
      raiz.innerHTML = CC.botaoVoltar('Juntos')
        + '<div class="cabeca-celula"><div><span class="etiqueta-celula">' + CC.ico('pessoas') + 'Célula</span>'
        + '<h1>' + CC.esc(p.titulo) + '</h1>'
        + '<p class="passo-dica">' + CC.plural(ativos(p).length, 'pessoa', 'pessoas')
        + (p.encontro >= 0 ? ' · encontro ' + nomeDoEncontro(p.encontro) : '') + '</p></div>'
        + contagem(p) + '</div>'
        + '<div class="segmentado abas-celula" role="tablist" aria-label="Partes da célula">'
        + ABAS_CELULA.map(([k, r]) => '<button type="button" role="tab" data-aba="' + k + '" aria-selected="' + (k === aba) + '" aria-pressed="' + (k === aba) + '">'
          + r + (k === 'estudo' && p.estudo ? '<i class="ponto-estudo" aria-hidden="true"></i>' : '') + '</button>').join('')
        + '</div>'
        + '<div class="painel-celula" role="tabpanel">'
        + (aba === 'hoje' ? abaHoje(p, souLider) : aba === 'pessoas' ? abaPessoas(p, souLider) : '<div class="leitor-esqueleto"><i></i><i></i><i></i></div>')
        + '</div>';
      ligarVoltar(raiz);
      // Trocar de aba não empilha histórico: o "voltar" do celular sai da célula de uma vez.
      raiz.querySelectorAll('[data-aba]').forEach((b) => { b.onclick = () => location.replace(enderecoCelula(p.id, b.dataset.aba)); });
      const painel = raiz.querySelector('.painel-celula');
      if (aba === 'hoje') ligarHoje(painel, p, souLider);
      if (aba === 'pessoas') ligarPessoas(painel, p, souLider);
      if (aba === 'estudo') preencherEstudo(painel, p, souLider, () => meu === desenhoCelula);
    };

    desenhar(cache);
    // Como em Propósitos: redesenha só se a resposta mudou algo, e sem repetir a entrada.
    const antes = JSON.stringify(cache);
    const jaMostrou = !!cache;
    CC.carregarPropositos().then((d) => {
      if (!nestaTela() || (d && JSON.stringify(d) === antes)) return;
      if (jaMostrou) raiz.classList.add('sem-entrada');
      desenhar(d || cache);
    });
  };

  function ligarVoltar(raiz) {
    raiz.querySelectorAll('[data-voltar]').forEach((el) => {
      el.onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/novidades'; };
    });
  }

  function abaHoje(p, souLider) {
    const eu = p.membros.find((m) => m.usuario === euUsuario()) || {};
    const podeChamar = p.membros.filter((m) => m.estado !== 'saiu').length < (p.limite || (cache && cache.limiteCelula) || 20);
    return topoDaCelula(p, souLider)
      + (encontroHoje(p) ? '<button class="selo-status leu botao-selo" data-ir-estudo>' + CC.ico('livro') + 'Encontro hoje · veja o estudo</button>' : '')
      + (p.hoje ? barraDoGrupo(p.hoje) : '')
      + '<div class="acoes">'
      + (podeChamar && eu.estado === 'ativo' ? '<button class="botao contorno" data-link-celula>' + CC.ico('compartilhar') + 'Mandar o link da célula</button>' : '')
      + (souLider ? '<div class="pe-duplo-plano"><button class="botao plano pequeno" data-recado>' + (p.recado ? 'Mudar o recado' : 'Escrever um recado') + '</button>'
        + '<button class="botao plano pequeno" data-encontro>Dia do encontro</button></div>' : '')
      + '</div>';
  }

  function ligarHoje(painel, p) {
    const ligar = (sel, fn) => { const el = painel.querySelector(sel); if (el) el.onclick = fn; };
    ligar('[data-ir-estudo]', () => location.replace(enderecoCelula(p.id, 'estudo')));
    ligar('[data-link-celula]', () => folhaLinkCelula(p));
    ligar('[data-recado]', () => folhaRecado(p));
    ligar('[data-encontro]', () => folhaEncontro(p));
  }

  async function preencherEstudo(painel, p, souLider, aindaAqui) {
    if (!p.estudo) {
      painel.innerHTML = '<div class="vazio-amigos">' + CC.ico('livro')
        + '<p>' + (souLider ? 'O estudo do encontro ainda não foi preparado. Você escolhe: a leitura da semana, um trecho ou um estudo seu.'
          : CC.esc(nomeDoLider(p)) + ' ainda não preparou o estudo deste encontro.') + '</p>'
        + (souLider ? '<button class="botao azul" data-preparar>' + CC.ico('livro') + 'Preparar o estudo</button>' : '') + '</div>';
      const preparar = painel.querySelector('[data-preparar]');
      if (preparar) preparar.onclick = () => folhaPrepararEstudo(p);
      return;
    }
    const { html, texto } = await montarEstudo(p);
    if (!aindaAqui()) return;
    painel.innerHTML = html
      + '<div class="acoes"><button class="botao azul" data-compartilhar>' + CC.ico('compartilhar') + 'Mandar o estudo no grupo</button>'
      + (souLider ? '<button class="botao contorno" data-mudar>Mudar o estudo</button>' : '') + '</div>';
    painel.querySelector('[data-compartilhar]').onclick = () => compartilharEstudo(texto);
    const mudar = painel.querySelector('[data-mudar]');
    if (mudar) mudar.onclick = () => folhaPrepararEstudo(p);
  }

  function abaPessoas(p, souLider) {
    const gente = p.membros.filter((m) => m.estado !== 'saiu');
    const eu = gente.find((m) => m.usuario === euUsuario()) || {};
    const faltam = faltamNotificar(p);
    const limite = p.limite || (cache && cache.limiteCelula) || 20;
    // O líder primeiro, depois quem já leu hoje, depois os outros: quem faltou não vira lista à parte.
    const ordem = gente.slice().sort((a, b) => (b.usuario === p.criadoPor) - (a.usuario === p.criadoPor)
      || (b.fezHoje - a.fezHoje) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    const leram = gente.filter((m) => m.estado === 'ativo' && m.fezHoje).length;
    return '<p class="passo-dica">' + leram + ' de ' + CC.plural(ativos(p).length, 'pessoa leu', 'pessoas leram') + ' hoje.</p>'
      + '<div class="lista-pedidos">' + ordem.map((m) => {
        const situacao = m.estado === 'convidado' ? 'Ainda não aceitou'
          : m.fezHoje ? 'Leu hoje' + (m.extraHoje ? ' e fez o extra' : '')
            : m.extraHoje ? 'Fez o extra hoje' : 'Ainda não leu hoje';
        return '<div class="linha-amigo' + (m.estado === 'convidado' ? ' enviado' : '') + '">' + retrato(m)
          + '<div class="quem-amigo"><b>' + CC.esc(nomeCurto(m)) + (m.usuario === p.criadoPor ? ' <small class="selo-lider">líder</small>' : '') + '</b>'
          + '<span class="arroba">' + situacao + '</span></div>'
          + (m.fezHoje ? '<span class="selo-status leu">' + CC.ico('certo') + '</span>' : '')
          + (souLider && m.usuario !== p.criadoPor ? '<button class="botao plano pequeno" data-remover="' + CC.esc(m.usuario) + '" aria-label="Tirar ' + CC.esc(m.nome) + ' da célula">Tirar</button>' : '')
          + '</div>';
      }).join('') + '</div>'
      + '<div class="acoes">'
      + (eu.fezHoje && faltam.length ? '<button class="botao azul" data-notificar>' + CC.ico('sino')
        + (faltam.length === 1 ? 'Notificar ' + CC.esc(faltam[0].nome) : 'Notificar quem falta (' + faltam.length + ')') + '</button>' : '')
      + (gente.length < limite ? '<button class="botao contorno" data-chamar>' + CC.ico('mais-sinal') + 'Chamar um amigo</button>' : '')
      + (souLider ? '<button class="botao plano perigo" data-encerrar>Encerrar a célula</button>' : '<button class="botao plano perigo" data-sair>Sair da célula</button>')
      + '</div>';
  }

  // Só quem é amigo recebe o toque: o "Notificar" é o mesmo toque de amigo de sempre.
  function faltamNotificar(p) {
    const amigos = ((CC.amigosEmCache() || {}).amigos || []).map((a) => a.usuario);
    return ativos(p).filter((m) => !m.fezHoje && m.usuario !== euUsuario() && amigos.includes(m.usuario));
  }

  function ligarPessoas(painel, p) {
    const gente = p.membros.filter((m) => m.estado !== 'saiu');
    const limite = p.limite || (cache && cache.limiteCelula) || 20;
    const notificar = painel.querySelector('[data-notificar]');
    if (notificar) notificar.onclick = async () => {
      notificar.disabled = true;
      const r = await Promise.allSettled(faltamNotificar(p).map((m) => CC.api('api/toques', { para: m.usuario })));
      CC.avisar(r.some((x) => x.status === 'fulfilled') ? 'Notificado! 🔔' : 'Hoje você já notificou quem falta');
      recarregar();
    };
    const chamar = painel.querySelector('[data-chamar]');
    if (chamar) chamar.onclick = () => folhaChamar(p, limite - gente.length);
    painel.querySelectorAll('[data-remover]').forEach((b) => {
      b.onclick = async () => {
        const m = gente.find((x) => x.usuario === b.dataset.remover);
        if (!await CC.confirmar({
          titulo: 'Tirar ' + (m ? m.nome : '@' + b.dataset.remover) + ' da célula?',
          texto: 'A pessoa sai da célula e da contagem do grupo. A amizade com você continua, e ninguém é avisado.',
          acao: 'Tirar', perigo: true,
        })) return;
        try { await CC.api('api/celula', { acao: 'remover', id: p.id, usuario: b.dataset.remover }); CC.avisar('Pronto'); } catch (e) { CC.avisar(e.message); }
        recarregar();
      };
    });
    const sair = painel.querySelector('[data-sair]');
    if (sair) sair.onclick = async () => {
      if (!await CC.confirmar({ titulo: 'Sair da ' + comoCelula(p.titulo) + '?', texto: 'A célula continua sem você. Ninguém é avisado.', acao: 'Sair', perigo: true })) return;
      try { await acao({ acao: 'sair', id: p.id }); location.hash = '#/novidades'; } catch (e) { CC.avisar(e.message); }
      recarregar();
    };
    const encerrar = painel.querySelector('[data-encerrar]');
    if (encerrar) encerrar.onclick = async () => {
      if (!await CC.confirmar({ titulo: 'Encerrar a ' + comoCelula(p.titulo) + '?', texto: 'A célula acaba para todo mundo.', acao: 'Encerrar', perigo: true })) return;
      try { await acao({ acao: 'encerrar', id: p.id }); location.hash = '#/novidades'; } catch (e) { CC.avisar(e.message); }
      recarregar();
    };
  }

  function cartaoConvite(p) {
    const quem = p.membros.find((m) => m.usuario === p.convidadoPor);
    return '<div class="cartao-proposito convite">'
      + '<p><b>' + CC.esc(quem ? quem.nome : 'Um amigo') + '</b> te chamou para ' + (p.grupo ? 'o grupo' : 'um propósito de') + ' <b>' + CC.esc(p.titulo) + '</b>.</p>'
      + cabeca(p)
      + '<p class="passo-dica pequena">' + CC.esc(EXPLICA[p.tipo] || '') + '</p>'
      + '<div class="pe-duplo-plano"><button class="botao pequeno" data-aceitar-proposito="' + CC.esc(p.id) + '">Aceitar</button>'
      + '<button class="botao plano pequeno" data-recusar-proposito="' + CC.esc(p.id) + '">Recusar</button></div>'
      + '</div>';
  }

  async function recarregar() {
    await Promise.all([CC.carregarPropositos(), CC.carregarAmigos()]);
    CC.redesenhar();
  }
  // A célula mora no Juntos: criar ou entrar numa leva a pessoa para lá.
  function irParaJuntos() {
    if (!/^#\/(novidades|amigos)\/?$/.test(location.hash)) location.hash = '#/novidades';
    else recarregar();
  }

  // ---------- a tela ----------
  CC.vistaPropositos = function (raiz) {
    const desenhar = (d, aviso) => {
      const lista = (d && d.propositos) || [];
      const convites = lista.filter((p) => p.euConvidado);
      const grupos = lista.filter((p) => !p.euConvidado && p.grupo && !p.celula);
      const duplas = lista.filter((p) => !p.euConvidado && !p.grupo);
      raiz.innerHTML = CC.botaoVoltar('Juntos')
        + '<div class="cabeca-tela"><h1>Propósitos</h1>'
        + (d ? '<span class="contagem-amigos">' + CC.plural(grupos.length + duplas.length, 'propósito', 'propósitos') + '</span>' : '') + '</div>'
        + (aviso ? '<p class="aviso-cadeado">' + CC.esc(aviso) + '</p>' : '')
        + '<button class="botao azul" data-novo-proposito>' + CC.ico('mais-sinal') + 'Novo propósito com amigos</button>'
        + (!d ? '<div class="leitor-esqueleto"><i></i><i></i><i></i></div>' : '')
        + (convites.length ? CC.tituloSecao('Convites', String(convites.length)) + '<div class="lista-propositos">' + convites.map(cartaoConvite).join('') + '</div>' : '')
        + (grupos.length ? CC.tituloSecao('Grupos') + '<div class="lista-propositos">' + grupos.map(cartao).join('') + '</div>' : '')
        + (duplas.length ? CC.tituloSecao('Em dupla') + '<div class="lista-propositos">' + duplas.map(cartao).join('') + '</div>' : '')
        + (d && !lista.length
          ? '<div class="vazio-amigos">' + CC.ico('pessoas') + '<p>Chame um amigo para ler, ou orar, junto com você. A célula fica no Juntos.</p></div>'
          : '')
        ;

      const ligar = (sel, fn) => raiz.querySelectorAll(sel).forEach((el) => { el.onclick = () => fn(el); });
      ligar('[data-novo-proposito]', () => CC.novoProposito());
      ligar('[data-proposito]', (el) => folhaProposito(lista.find((p) => p.id === el.dataset.proposito)));
      ligar('[data-aceitar-proposito]', async (el) => {
        el.disabled = true;
        try { await acao({ acao: 'aceitar', id: el.dataset.aceitarProposito }); CC.avisar('Bora juntos!'); } catch (e) { CC.avisar(e.message); }
        recarregar();
      });
      ligar('[data-recusar-proposito]', async (el) => {
        el.disabled = true;
        await acao({ acao: 'recusar', id: el.dataset.recusarProposito }).catch(() => {});
        recarregar();
      });
    };

    desenhar(cache);
    // Como no Feed: só redesenha se a resposta mudou algo, e sem repetir a entrada.
    const antes = JSON.stringify(cache);
    const jaMostrou = !!cache;
    CC.carregarPropositos().then((d) => {
      if (!/^#\/novidades\/propositos\/?$/.test(location.hash)) return;
      if (d && JSON.stringify(d) === antes) return;
      if (jaMostrou) raiz.classList.add('sem-entrada');
      desenhar(d || cache, d ? '' : 'Não consegui falar com o servidor agora.');
    });
  };

  // ---------- um propósito ----------
  function folhaProposito(p) {
    if (!p) return;
    const gente = p.membros.filter((m) => m.estado !== 'saiu');
    const eu = gente.find((m) => m.usuario === euUsuario()) || {};
    const amigos = ((CC.amigosEmCache() || {}).amigos || []).map((a) => a.usuario);
    const faltam = ativos(p).filter((m) => !m.fezHoje && m.usuario !== euUsuario() && amigos.includes(m.usuario));
    const podeNotificar = p.tipo !== 'oracao' && eu.fezHoje && faltam.length;
    const oracao = p.tipo === 'oracao';
    const limite = p.limite || (cache && cache.limiteGrupo) || 5;
    const podeChamar = p.grupo && gente.length < limite;
    const ehDaAmizade = !p.grupo && p.tipo === 'plano';
    const souLider = p.celula && p.criadoPor === euUsuario();

    const linhas = gente.map((m) => {
      let situacao;
      if (m.estado === 'convidado') situacao = 'Ainda não aceitou';
      else if (oracao) situacao = m.usuario === euUsuario() && m.fezHoje ? 'Você orou hoje' : 'Orando junto';
      else if (m.fezHoje) situacao = (p.tipo === 'oracao' ? 'Orou hoje' : 'Leu hoje') + (m.extraHoje ? ' e fez o extra' : '');
      else situacao = m.extraHoje ? 'Fez o extra hoje' : 'Ainda não ' + verbo(p) + ' hoje';
      return '<div class="linha-amigo' + (m.estado === 'convidado' ? ' enviado' : '') + '">' + retrato(m)
        + '<div class="quem-amigo"><b>' + CC.esc(nomeCurto(m)) + (p.celula && m.usuario === p.criadoPor ? ' <small class="selo-lider">líder</small>' : '') + '</b>'
        + '<span class="arroba">' + situacao + '</span></div>'
        + (m.fezHoje && !oracao ? '<span class="selo-status leu">' + CC.ico('certo') + '</span>' : '')
        + (souLider && m.usuario !== p.criadoPor ? '<button class="botao plano pequeno" data-remover="' + CC.esc(m.usuario) + '" aria-label="Tirar ' + CC.esc(m.nome) + ' da célula">Tirar</button>' : '')
        + '</div>';
    }).join('');

    CC.folha('<h2>' + CC.esc(p.grupo ? p.titulo : 'Propósito de ' + p.titulo.toLowerCase()) + '</h2>'
      + '<p class="tipo-proposito">' + CC.ico(ICONE[p.tipo] || 'trilha') + CC.esc(ROTULO_TIPO[p.tipo] || '') + (p.tipo === 'livro' ? ': ' + CC.esc(p.titulo) : '')
      + (oracao ? '' : ' · ' + CC.plural(p.dias, 'dia', 'dias')) + '</p>'
      + (p.celula ? topoDaCelula(p, souLider) : '')
      + (p.grupo && p.hoje && !oracao ? barraDoGrupo(p.hoje)
        : '<p class="passo-dica pequena">' + CC.esc(EXPLICA[p.tipo] || '') + '</p>')
      + '<div class="lista-pedidos">' + linhas + '</div>'
      + '<div class="acoes">'
      + (podeNotificar ? '<button class="botao azul" data-notificar>' + CC.ico('sino') + (faltam.length === 1 ? 'Notificar ' + CC.esc(faltam[0].nome) : 'Notificar quem falta (' + faltam.length + ')') + '</button>' : '')
      + (p.celula ? '<button class="botao azul" data-roteiro>' + CC.ico('livro') + 'Estudo do encontro</button>' : '')
      + (p.celula && podeChamar && eu.estado === 'ativo' ? '<button class="botao contorno" data-link-celula>' + CC.ico('compartilhar') + 'Mandar o link da célula</button>' : '')
      + (souLider ? '<div class="pe-duplo-plano"><button class="botao plano pequeno" data-recado>' + (p.recado ? 'Mudar o recado' : 'Escrever um recado') + '</button>'
        + '<button class="botao plano pequeno" data-encontro>Dia do encontro</button></div>' : '')
      + (podeChamar ? '<button class="botao contorno" data-chamar>' + CC.ico('mais-sinal') + 'Chamar um amigo</button>' : '')
      + (p.grupo && p.criadoPor === euUsuario() ? '<button class="botao plano perigo" data-encerrar>Encerrar grupo</button>' : '')
      + (p.grupo && p.criadoPor !== euUsuario() ? '<button class="botao plano perigo" data-sair>Sair do grupo</button>' : '')
      + (!p.grupo && !ehDaAmizade ? '<button class="botao plano perigo" data-sair>Encerrar propósito</button>' : '')
      + '<button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: p.titulo,
      rolavel: true,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const notificar = folha.querySelector('[data-notificar]');
        if (notificar) notificar.onclick = async () => {
          notificar.disabled = true;
          const r = await Promise.allSettled(faltam.map((m) => CC.api('api/toques', { para: m.usuario })));
          const foram = r.filter((x) => x.status === 'fulfilled').length;
          fechar();
          CC.avisar(foram ? 'Notificado! 🔔' : 'Hoje você já notificou quem falta');
          recarregar();
        };
        const chamar = folha.querySelector('[data-chamar]');
        if (chamar) chamar.onclick = () => { fechar(); folhaChamar(p, limite - gente.length); };
        const linkCelula = folha.querySelector('[data-link-celula]');
        if (linkCelula) linkCelula.onclick = () => { fechar(); folhaLinkCelula(p); };
        const roteiro = folha.querySelector('[data-roteiro]');
        if (roteiro) roteiro.onclick = () => { fechar(); CC.estudoDoEncontro(p); };
        const recado = folha.querySelector('[data-recado]');
        if (recado) recado.onclick = () => { fechar(); folhaRecado(p); };
        const encontro = folha.querySelector('[data-encontro]');
        if (encontro) encontro.onclick = () => { fechar(); folhaEncontro(p); };
        folha.querySelectorAll('[data-remover]').forEach((b) => {
          b.onclick = async () => {
            const m = gente.find((x) => x.usuario === b.dataset.remover);
            fechar();
            if (!await CC.confirmar({
              titulo: 'Tirar ' + (m ? m.nome : '@' + b.dataset.remover) + ' da célula?',
              texto: 'A pessoa sai da célula e da contagem do grupo. A amizade com você continua, e ninguém é avisado.',
              acao: 'Tirar', perigo: true,
            })) return;
            try { await CC.api('api/celula', { acao: 'remover', id: p.id, usuario: b.dataset.remover }); CC.avisar('Pronto'); } catch (e) { CC.avisar(e.message); }
            recarregar();
          };
        });
        const sair = folha.querySelector('[data-sair]');
        if (sair) sair.onclick = async () => {
          fechar();
          if (!await CC.confirmar({
            titulo: p.grupo ? 'Sair do grupo ' + p.titulo + '?' : 'Encerrar este propósito?',
            texto: p.grupo ? 'O grupo continua sem você. Ninguém é avisado.' : 'A contagem de vocês some. Ninguém é avisado.',
            acao: p.grupo ? 'Sair' : 'Encerrar', perigo: true,
          })) return;
          try { await acao({ acao: 'sair', id: p.id }); } catch (e) { CC.avisar(e.message); }
          recarregar();
        };
        const encerrar = folha.querySelector('[data-encerrar]');
        if (encerrar) encerrar.onclick = async () => {
          fechar();
          if (!await CC.confirmar({ titulo: 'Encerrar o grupo ' + p.titulo + '?', texto: 'O grupo acaba para todo mundo.', acao: 'Encerrar', perigo: true })) return;
          try { await acao({ acao: 'encerrar', id: p.id }); } catch (e) { CC.avisar(e.message); }
          recarregar();
        };
      },
    });
  }

  function folhaChamar(p, vagas) {
    const dentro = p.membros.filter((m) => m.estado !== 'saiu').map((m) => m.usuario);
    const amigos = ((CC.amigosEmCache() || {}).amigos || []).filter((a) => !dentro.includes(a.usuario));
    CC.folha('<h2>Chamar para ' + CC.esc(p.titulo) + '</h2>'
      + '<p class="passo-dica pequena">' + (vagas === 1 ? 'Resta 1 vaga.' : 'Restam ' + vagas + ' vagas.') + '</p>'
      + (amigos.length
        ? '<div class="lista-pedidos">' + amigos.map((a) => '<div class="linha-amigo">' + retrato(a)
          + '<div class="quem-amigo"><b>' + CC.esc(a.nome) + '</b><span class="arroba">@' + CC.esc(a.usuario) + '</span></div>'
          + '<button class="botao pequeno" data-chamar-amigo="' + CC.esc(a.usuario) + '">Chamar</button></div>').join('') + '</div>'
        : '<div class="vazio">Todos os seus amigos já estão aqui.</div>')
      + '<div class="acoes"><button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Chamar para o grupo',
      rolavel: true,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-chamar-amigo]').forEach((b) => {
          b.onclick = async () => {
            b.disabled = true;
            try {
              await acao({ acao: 'convidar', id: p.id, usuario: b.dataset.chamarAmigo });
              b.textContent = 'Chamado';
            } catch (e) {
              b.disabled = false;
              CC.avisar(e.message);
            }
          };
        });
        folha.parentElement.addEventListener('click', (ev) => { if (ev.target === folha.parentElement) recarregar(); });
      },
    });
  }

  // ---------- célula ----------
  // A célula nasce só com quem criou e cresce por um link, mandado no grupo do WhatsApp: quem
  // abre entra direto, sem precisar ser amigo antes. É o "junto com a sua célula" do app.
  // "Célula de quinta" já diz o que é; "Jovens Betel" ganha a palavra na frente.
  const comoCelula = (titulo) => (/^c[ée]lula(\s|$)/i.test(titulo) ? titulo : 'célula ' + titulo);
  const textoCelula = (titulo) => 'Bora ler a Bíblia inteira em um ano, junto? Entra na ' + comoCelula(titulo) + ' no Geração Eleita:';

  CC.novaCelula = function () {
    if (CC.quem && CC.quem.comSenha && !CC.quem.perfilCompleto) {
      CC.completarCadastro(CC.quem).then((ok) => { if (ok) CC.novaCelula(); });
      return;
    }
    const limite = (cache && cache.limiteCelula) || 20;
    CC.folha('<h2>Criar uma célula</h2>'
      + '<p class="passo-dica">Vocês leem o plano juntos, até ' + limite + ' pessoas. Depois de criar, você manda o link no grupo do WhatsApp e quem abrir já entra.</p>'
      + '<label class="campo-senha"><span>Nome da célula</span><input data-titulo name="nome-da-celula" maxlength="30" placeholder="Ex.: Célula de quinta" autocomplete="off" autocapitalize="sentences" enterkeyhint="done"></label>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao azul" data-criar>Criar e pegar o link</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Criar uma célula',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const botao = folha.querySelector('[data-criar]');
        botao.onclick = async () => {
          const erro = folha.querySelector('.erro-proposito');
          botao.disabled = true;
          erro.hidden = true;
          try {
            const { proposito } = await CC.api('api/celula', { acao: 'criar', titulo: folha.querySelector('[data-titulo]').value });
            fechar();
            irParaJuntos();
            folhaLinkCelula(proposito);
          } catch (e) {
            erro.textContent = e.message;
            erro.hidden = false;
            botao.disabled = false;
          }
        };
      },
    });
  };

  async function folhaLinkCelula(p) {
    let link = '';
    try {
      link = (await CC.api('api/celula', { acao: 'link', id: p.id })).link;
    } catch (e) {
      CC.avisar(e.message || 'Não consegui gerar o link agora.');
      return;
    }
    const texto = textoCelula(p.titulo);
    CC.folha('<h2>Link da ' + CC.esc(comoCelula(p.titulo)) + '</h2>'
      + '<p class="mensagem-convite">' + CC.esc(texto) + ' <span>' + CC.esc(link) + '</span></p>'
      + '<div class="acoes"><button class="botao" data-compartilhar>' + CC.ico('compartilhar') + 'Mandar no grupo</button>'
      + '<button class="botao contorno" data-copiar>Copiar link</button></div>'
      + '<p class="passo-dica pequena">Quem abrir o link entra direto na célula. O link vale por 30 dias.</p>'
      + '<div class="acoes"><button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Link da célula',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-compartilhar]').onclick = async () => {
          const r = await CC.compartilhar(texto, link);
          if (r === 'copiado') CC.avisar('Link copiado. É só colar no grupo.');
          else if (r === 'falhou') CC.avisar('Não consegui compartilhar. Toque em "Copiar link" e cole no grupo.');
        };
        folha.querySelector('[data-copiar]').onclick = async () => {
          CC.avisar((await CC.copiar(link)) ? 'Link copiado' : 'Não consegui copiar');
        };
      },
    });
  }

  // ---------- a célula por dentro: encontro, recado e estudo do líder ----------
  const DIAS_ENCONTRO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const encontroHoje = (p) => p.encontro >= 0 && new Date(CC.hojeIso() + 'T12:00:00').getDay() === p.encontro;
  const nomeDoEncontro = (d) => (d === 0 || d === 6 ? 'aos ' + DIAS_ENCONTRO[d] + 's' : 'às ' + DIAS_ENCONTRO[d] + 's-feiras');
  const nomeDoLider = (p) => { const l = p.membros.find((m) => m.usuario === p.criadoPor); return l ? l.nome : 'o líder'; };
  const paragrafos = (texto) => String(texto || '').split(/\n+/).filter(Boolean).map((l) => '<p>' + CC.esc(l) + '</p>').join('');

  function topoDaCelula(p, souLider) {
    const s = p.semanaLider;
    return (p.recado
      ? '<div class="recado-lider"><span class="etiqueta">Recado de ' + CC.esc(nomeDoLider(p)) + '</span><p>' + CC.esc(p.recado) + '</p></div>'
      : '')
      + '<p class="passo-dica pequena">' + (p.encontro >= 0
        ? (encontroHoje(p) ? '<b>O encontro é hoje.</b>' + (p.estudo ? ' O estudo já está pronto.' : '') : 'Encontro ' + nomeDoEncontro(p.encontro) + '.')
        : (souLider ? 'Marque o dia do encontro para a célula ver "Encontro hoje" no dia.' : 'O líder ainda não marcou o dia do encontro.')) + '</p>'
      // Só o líder vê, e só o número do grupo: quem faltou não aparece em lugar nenhum.
      + (souLider && s
        ? '<p class="semana-lider">' + CC.ico('pessoas') + '<span>Nos últimos 7 dias, <b>' + s.leram + ' de ' + s.pessoas + '</b> leram ao menos uma vez ('
          + s.leituras + ' de ' + s.possiveis + ' leituras possíveis).</span></p>'
        : '');
  }

  function folhaRecado(p) {
    const max = 280;
    CC.folha('<h2>Recado para a célula</h2>'
      + '<p class="passo-dica">Aparece no alto da célula para todos: um lembrete do encontro, um pedido de oração, uma palavra de ânimo.</p>'
      + '<label class="campo-senha"><span>Recado</span><textarea data-texto name="recado-da-celula" maxlength="' + max + '" rows="4" autocomplete="off">' + CC.esc(p.recado || '') + '</textarea></label>'
      + '<p class="passo-dica pequena" data-conta></p>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao azul" data-salvar>Publicar recado</button>'
      + (p.recado ? '<button class="botao plano perigo" data-apagar>Apagar o recado</button>' : '')
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Recado para a célula',
      ligar: (folha, fechar) => {
        const campo = folha.querySelector('[data-texto]');
        const conta = () => { folha.querySelector('[data-conta]').textContent = campo.value.length + ' de ' + max + ' caracteres'; };
        campo.oninput = conta;
        conta();
        folha.querySelector('[data-fechar]').onclick = fechar;
        const enviar = async (texto) => {
          try {
            await CC.api('api/celula', { acao: 'recado', id: p.id, texto });
            fechar();
            CC.avisar(texto ? 'Recado publicado' : 'Recado apagado');
            recarregar();
          } catch (e) {
            const erro = folha.querySelector('.erro-proposito');
            erro.textContent = e.message;
            erro.hidden = false;
          }
        };
        folha.querySelector('[data-salvar]').onclick = () => enviar(campo.value);
        const apagar = folha.querySelector('[data-apagar]');
        if (apagar) apagar.onclick = () => enviar('');
      },
    });
  }

  function folhaEncontro(p) {
    CC.folha('<h2>Dia do encontro</h2>'
      + '<div class="escolha-dia">' + DIAS_ENCONTRO.map((d, i) => '<button class="botao ' + (p.encontro === i ? 'azul' : 'contorno') + ' pequeno" data-dia="' + i + '" aria-pressed="' + (p.encontro === i) + '">'
        + d.charAt(0).toUpperCase() + d.slice(1) + '</button>').join('') + '</div>'
      + '<div class="acoes">' + (p.encontro >= 0 ? '<button class="botao plano" data-dia="-1">Sem dia marcado</button>' : '')
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Dia do encontro',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-dia]').forEach((b) => {
          b.onclick = async () => {
            const dia = Number(b.dataset.dia);
            try {
              await CC.api('api/celula', { acao: 'encontro', id: p.id, dia });
              fechar();
              CC.avisar(dia >= 0 ? 'Encontro ' + nomeDoEncontro(dia) : 'Dia do encontro tirado');
              recarregar();
            } catch (e) { CC.avisar(e.message); }
          };
        });
      },
    });
  }

  // ---------- o estudo do encontro ----------
  // O líder escolhe; o app não impõe. Três jeitos:
  //   semana: um roteiro pronto com a leitura dos 7 dias do plano até onde o líder leu, as
  //           perguntas das reflexões escritas desses dias e um começo de oração
  //   trecho: um livro e capítulo (ou versículos) que o líder escolheu, com as perguntas do OIA
  //   livre:  o estudo que o próprio líder escreveu
  // Nos dois primeiros o líder ainda pode deixar uma palavra dele por cima.
  const PERGUNTAS_OIA = [
    'O que o texto diz? Contem com as próprias palavras, sem interpretar ainda.',
    'O que o autor quis dizer a quem leu primeiro? O que isso mostra sobre Deus e sobre nós?',
    'O que muda na minha semana? Uma atitude concreta, com dia e hora.',
  ];

  function semanaDoEstudo(p) {
    const D = CC.D;
    const ate = Math.min(D.plano.length, Math.max(7, p.semanaAte || 7));
    const dias = [];
    for (let n = ate - 6; n <= ate; n++) dias.push({ n, dia: D.plano[n - 1], r: CC.reflexaoDoDia(n) });
    const chave = dias[3].r.ref ? dias[3] : dias.find((d) => d.r.ref) || dias[0];
    // Uma pergunta de dias espalhados pela semana, para a conversa passar por ela inteira.
    const perguntas = [0, 2, 4, 6].map((i) => ({ d: dias[i], q: (dias[i].r.perguntas || [])[0] })).filter((x) => x.q);
    const oracao = (dias[6].r.oracao || []).slice(0, 3);
    return { de: ate - 6, ate, dias, chave, perguntas, oracao };
  }

  // O mesmo estudo em texto corrido, para o líder mandar no grupo do WhatsApp.
  function estudoEmTexto(p, e, versiculo) {
    const est = p.estudo;
    const l = ['Estudo do encontro · ' + p.titulo, ''];
    if (est.tipo !== 'livre' && est.texto) l.push('Palavra de ' + nomeDoLider(p) + ':', est.texto, '');
    if (est.tipo === 'livre') l.push(est.texto);
    if (est.tipo === 'semana') {
      l.push('Dias ' + e.de + ' a ' + e.ate + ' do plano', '', '1. Para começar: cada um conta, em uma frase, o que mais marcou na leitura da semana.', '',
        '2. Leiam juntos: ' + e.chave.r.ref + (versiculo ? ': "' + versiculo + '"' : ''), '', '3. A leitura da semana:');
      e.dias.forEach((d) => l.push('Dia ' + d.n + ': ' + CC.passagemDe(d.dia)));
      l.push('', '4. Para conversar:');
      e.perguntas.forEach((x, i) => l.push((i + 1) + ') ' + x.q));
      if (e.oracao.length) { l.push('', '5. Para orar juntos:'); e.oracao.forEach((o) => l.push('• ' + o)); }
    }
    if (est.tipo === 'trecho') {
      l.push('Leiam juntos: ' + est.ref + (versiculo ? ': "' + versiculo + '"' : ''), '', 'Para conversar:');
      PERGUNTAS_OIA.forEach((q, i) => l.push((i + 1) + ') ' + q));
      l.push('', 'Para orar juntos: orem a partir do que o texto mostrou.');
    }
    return l.join('\n');
  }

  CC.estudoDoEncontro = async function (p) {
    const souLider = p.criadoPor === euUsuario();
    if (!p.estudo) {
      if (souLider) { folhaPrepararEstudo(p); return; }
      CC.folha('<h2>Estudo do encontro</h2><p>' + CC.esc(nomeDoLider(p)) + ' ainda não preparou o estudo deste encontro.</p>'
        + '<div class="acoes"><button class="botao" data-fechar>Entendi</button></div>',
      { rotulo: 'Estudo do encontro', ligar: (folha, fechar) => { folha.querySelector('[data-fechar]').onclick = fechar; } });
      return;
    }
    const { html, texto } = await montarEstudo(p);
    CC.folha('<h2>Estudo do encontro</h2>' + html
      + '<div class="acoes"><button class="botao azul" data-compartilhar>' + CC.ico('compartilhar') + 'Mandar o estudo no grupo</button>'
      + (souLider ? '<button class="botao contorno" data-mudar>Mudar o estudo</button>' : '')
      + '<button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Estudo do encontro',
      rolavel: true,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const abrir = folha.querySelector('[data-abrir-biblia]');
        if (abrir) abrir.addEventListener('click', () => fechar());
        const mudar = folha.querySelector('[data-mudar]');
        if (mudar) mudar.onclick = () => { fechar(); folhaPrepararEstudo(p); };
        folha.querySelector('[data-compartilhar]').onclick = () => compartilharEstudo(texto);
      },
    });
  };

  async function compartilharEstudo(texto) {
    const r = await CC.compartilhar(texto, '');
    if (r === 'copiado') CC.avisar('Estudo copiado. É só colar no grupo.');
    else if (r === 'falhou') CC.avisar('Não consegui compartilhar agora.');
  }

  // O estudo pronto para ler: a linha de quem preparou, a palavra do líder e o roteiro. Serve
  // à folha do estudo e à aba Estudo da tela da célula; "texto" é a versão para o WhatsApp.
  async function montarEstudo(p) {
    const est = p.estudo;
    const e = est.tipo === 'semana' ? semanaDoEstudo(p) : null;
    const refLer = est.tipo === 'semana' ? e.chave.r.ref : est.tipo === 'trecho' ? est.ref : '';
    // Com versículos, o texto vem para a folha; capítulo inteiro abre na Bíblia do app.
    const temVersiculo = /\.\d/.test(refLer || '');
    const versiculo = temVersiculo ? await CC.textoDoVersiculo(refLer).catch(() => null) : null;
    const cap = /^(.+?) (\d+)/.exec(refLer || '');
    const abrirTrecho = cap ? '<a class="botao contorno pequeno" href="#/biblia/' + encodeURIComponent(cap[1]) + '/' + cap[2] + '" data-abrir-biblia>' + CC.ico('livro')
      + 'Abrir ' + CC.esc(cap[1] + ' ' + cap[2]) + ' na Bíblia</a>' : '';
    const leiam = refLer ? '<li><b>Leiam juntos</b>' + (versiculo ? CC.cartaoVersiculo(refLer, versiculo) : '<p>' + CC.esc(refLer) + '</p>') + abrirTrecho + '</li>' : '';

    let corpo = '';
    if (est.tipo === 'livre') corpo = '<div class="estudo-livre">' + paragrafos(est.texto) + '</div>';
    if (est.tipo === 'semana') {
      corpo = '<ol class="roteiro">'
        + '<li><b>Para começar</b><p>Cada um conta, em uma frase, o que mais marcou na leitura da semana.</p></li>'
        + leiam
        + '<li><b>A leitura da semana</b><ul class="roteiro-dias">' + e.dias.map((d) => '<li><span>Dia ' + d.n + '</span>' + CC.esc(CC.passagemDe(d.dia))
          + (d.r.titulo ? '<small>' + CC.esc(d.r.titulo) + '</small>' : '') + '</li>').join('') + '</ul></li>'
        + '<li><b>Para conversar</b><ul class="roteiro-perguntas">' + e.perguntas.map((x) => '<li>' + CC.esc(x.q)
          + '<small>Dia ' + x.d.n + (x.d.r.titulo ? ' · ' + CC.esc(x.d.r.titulo) : '') + '</small></li>').join('') + '</ul></li>'
        + (e.oracao.length ? '<li><b>Para orar juntos</b><ul class="roteiro-oracao">' + e.oracao.map((o) => '<li>' + CC.esc(o) + '</li>').join('') + '</ul></li>' : '')
        + '</ol>';
    }
    if (est.tipo === 'trecho') {
      corpo = '<ol class="roteiro">' + leiam
        + '<li><b>Para conversar</b><ul class="roteiro-perguntas">' + PERGUNTAS_OIA.map((q) => '<li>' + CC.esc(q) + '</li>').join('') + '</ul></li>'
        + '<li><b>Para orar juntos</b><p>Orem a partir do que o texto mostrou.</p></li></ol>';
    }

    return {
      html: '<p class="passo-dica">' + CC.esc(p.titulo) + (est.tipo === 'semana' ? ' · dias ' + e.de + ' a ' + e.ate + ' do plano' : '')
        + ' · preparado por ' + CC.esc(nomeDoLider(p)) + '</p>'
        + (est.tipo !== 'livre' && est.texto ? '<div class="recado-lider"><span class="etiqueta">Palavra de ' + CC.esc(nomeDoLider(p)) + '</span>' + paragrafos(est.texto) + '</div>' : '')
        + corpo,
      texto: estudoEmTexto(p, e, versiculo),
    };
  }

  function folhaPrepararEstudo(p) {
    const atual = p.estudo || {};
    let tipo = atual.tipo || 'semana';
    const livros = (cache && cache.livros) || [];
    const partes = /^(.+?) (\d+)(?:\.(.+))?$/.exec(atual.tipo === 'trecho' ? atual.ref : '') || [];
    const semana = semanaDoEstudo(p);
    CC.folha('<h2>Preparar o estudo</h2>'
      + '<p class="passo-dica">Você escolhe o que a célula vai estudar no encontro.</p>'
      + '<div class="segmentado" role="group" aria-label="Como vai ser o estudo">'
      + [['semana', 'Leitura da semana'], ['trecho', 'Um trecho'], ['livre', 'Eu escrevo']].map(([k, r]) => '<button type="button" data-tipo="' + k + '" aria-pressed="' + (k === tipo) + '">' + r + '</button>').join('')
      + '</div>'
      + '<p class="passo-dica pequena" data-bloco="semana">O app monta o roteiro com a leitura dos dias ' + semana.de + ' a ' + semana.ate
        + ' do plano (até onde você leu), as perguntas das reflexões desses dias e um começo de oração.</p>'
      + '<div data-bloco="trecho" class="escolha-trecho"><label class="campo-senha"><span>Livro</span><select data-livro>'
        + livros.map((l) => '<option' + (l === partes[1] ? ' selected' : '') + '>' + CC.esc(l) + '</option>').join('') + '</select></label>'
        + '<label class="campo-senha"><span>Capítulo</span><input data-cap type="number" inputmode="numeric" min="1" max="150" value="' + CC.esc(partes[2] || '1') + '" autocomplete="off"></label>'
        + '<label class="campo-senha"><span>Versículos (opcional)</span><input data-vers inputmode="numeric" placeholder="Ex.: 16-18" value="' + CC.esc(partes[3] || '') + '" autocomplete="off"></label>'
        + '<p class="passo-dica pequena">A conversa segue o método OIA: observação, interpretação e aplicação.</p></div>'
      + '<label class="campo-senha"><span data-rotulo-texto>Sua palavra para a célula (opcional)</span>'
        + '<textarea data-texto name="estudo-do-lider" rows="5" maxlength="3000" autocomplete="off">' + CC.esc(atual.texto || '') + '</textarea></label>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao azul" data-salvar>Salvar o estudo</button>'
      + (p.estudo ? '<button class="botao plano perigo" data-tirar>Tirar o estudo</button>' : '')
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Preparar o estudo',
      rolavel: true,
      ligar: (folha, fechar) => {
        const q = (s) => folha.querySelector(s);
        const mostrar = () => {
          folha.querySelectorAll('[data-tipo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipo === tipo)));
          folha.querySelectorAll('[data-bloco]').forEach((el) => { el.hidden = el.dataset.bloco !== tipo; });
          q('[data-rotulo-texto]').textContent = tipo === 'livre' ? 'O estudo' : 'Sua palavra para a célula (opcional)';
          q('[data-texto]').rows = tipo === 'livre' ? 12 : 5;
        };
        folha.querySelectorAll('[data-tipo]').forEach((b) => { b.onclick = () => { tipo = b.dataset.tipo; mostrar(); }; });
        mostrar();
        q('[data-fechar]').onclick = fechar;
        const salvar = async (corpo) => {
          try {
            await CC.api('api/celula', Object.assign({ acao: 'estudo', id: p.id }, corpo));
            fechar();
            CC.avisar(corpo.estudo ? 'Estudo salvo' : 'Estudo tirado');
            await recarregar();
            const novo = ((cache && cache.propositos) || []).find((x) => x.id === p.id);
            // Na tela da célula, o estudo novo aparece na aba Estudo; fora dela, abre na folha.
            if (location.hash.startsWith('#/novidades/celula/')) location.replace(enderecoCelula(p.id, 'estudo'));
            else if (novo && novo.estudo) CC.estudoDoEncontro(novo);
          } catch (e) {
            const erro = q('.erro-proposito');
            erro.textContent = e.message;
            erro.hidden = false;
          }
        };
        q('[data-salvar]').onclick = () => {
          const vers = q('[data-vers]').value.replace(/\s+/g, '');
          const ref = q('[data-livro]').value + ' ' + q('[data-cap]').value + (vers ? '.' + vers : '');
          salvar({ estudo: tipo, ref: tipo === 'trecho' ? ref : '', texto: q('[data-texto]').value });
        };
        const tirar = q('[data-tirar]');
        if (tirar) tirar.onclick = () => salvar({ estudo: '' });
      },
    });
  }

  // Quem já tem conta e abre o link da célula.
  CC.abrirLinkCelula = async function (token) {
    let info;
    try {
      info = await CC.api('api/celula/' + encodeURIComponent(token));
    } catch (e) {
      CC.folha('<h2>Esse link de célula venceu</h2><p>Peça um novo para quem te chamou!</p>'
        + '<div class="acoes"><button class="botao" data-fechar>Entendi</button></div>',
      { ligar: (folha, fechar) => { folha.querySelector('[data-fechar]').onclick = fechar; } });
      return;
    }
    const dentro = info.usuario === euUsuario();
    CC.folha('<h2>' + (dentro ? 'Esse é o link da sua célula' : CC.esc(info.nome) + ' te chamou para a ' + CC.esc(comoCelula(info.titulo)) + '!') + '</h2>'
      + '<p>' + CC.plural(info.pessoas, 'pessoa', 'pessoas') + ' lendo o plano juntos'
      + (info.vagas > 0 ? ' · ' + CC.plural(info.vagas, 'vaga', 'vagas') : ' · sem vagas') + '.</p>'
      + '<p class="recado-senha" id="recado" role="alert"></p>'
      + '<div class="acoes">' + (dentro ? '' : '<button class="botao azul" data-entrar' + (info.vagas > 0 ? '' : ' disabled') + '>Entrar na célula</button>')
      + '<button class="botao plano" data-fechar>' + (dentro ? 'Fechar' : 'Agora não') + '</button></div>',
    {
      rotulo: 'Célula',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const entrar = folha.querySelector('[data-entrar]');
        if (entrar) entrar.onclick = async () => {
          entrar.disabled = true;
          try {
            const r = await CC.api('api/celula', { acao: 'entrar', token });
            fechar();
            CC.avisar(r.ja ? 'Você já está nessa célula' : 'Bem-vindo à ' + comoCelula(r.titulo) + '!');
            irParaJuntos();
          } catch (e) {
            entrar.disabled = false;
            folha.querySelector('#recado').textContent = e.message;
          }
        };
      },
    });
  };

  // ---------- criar ----------
  CC.novoProposito = async function (preEscolhido) {
    if (!cache) await CC.carregarPropositos();
    if (!CC.amigosEmCache()) await CC.carregarAmigos();
    const amigos = ((CC.amigosEmCache() || {}).amigos || []);
    if (!amigos.length) { CC.avisar('Convide um amigo primeiro'); CC.convidar(); return; }
    const livros = (cache && cache.livros) || [];
    const limite = (cache && cache.limiteGrupo) || 5;
    let tipo = 'plano';

    CC.folha('<h2>Novo propósito</h2>'
      + '<div class="segmentado" role="group" aria-label="O que vão fazer juntos">'
      + [['plano', 'Plano'], ['livro', 'Livro'], ['oracao', 'Oração']].map(([k, r]) => '<button type="button" data-tipo="' + k + '" aria-pressed="' + (k === tipo) + '">' + r + '</button>').join('')
      + '</div>'
      + '<p class="passo-dica pequena" data-explica>' + EXPLICA[tipo] + '</p>'
      + '<label class="campo-senha" data-bloco-livro hidden><span>Qual leitura</span><select data-alvo>'
      + '<option value="nt">Novo Testamento</option><option value="at">Antigo Testamento</option>'
      + livros.map((l) => '<option value="' + CC.esc(l) + '">' + CC.esc(l) + '</option>').join('') + '</select></label>'
      + '<span class="rotulo-escolha">Com quem · até ' + (limite - 1) + ' pessoas</span>'
      + '<div class="escolha-amigos">' + amigos.map((a) => '<label class="linha-amigo escolha-amigo">'
        + '<input type="checkbox" value="' + CC.esc(a.usuario) + '"' + (preEscolhido === a.usuario ? ' checked' : '') + '>' + retrato(a)
        + '<span class="quem-amigo"><b>' + CC.esc(a.nome) + '</b><span class="arroba">@' + CC.esc(a.usuario) + '</span></span></label>').join('') + '</div>'
      + '<p class="passo-dica pequena" data-dica-grupo hidden>Com 3 ou mais pessoas, vira um grupo.</p>'
      + '<label class="campo-senha" data-bloco-nome hidden><span>Nome do grupo</span><input data-titulo name="nome-do-grupo" maxlength="30" placeholder="Ex.: Amigos da escola" autocomplete="off" autocapitalize="sentences" enterkeyhint="done"></label>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao azul" data-criar disabled>Chamar para o propósito</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Novo propósito',
      rolavel: true,
      ligar: (folha, fechar) => {
        const q = (s) => folha.querySelector(s);
        const marcados = () => [...folha.querySelectorAll('.escolha-amigo input:checked')].map((i) => i.value);
        const atualizar = () => {
          const n = marcados().length;
          folha.querySelectorAll('.escolha-amigo input').forEach((i) => { i.disabled = !i.checked && n >= limite - 1; });
          q('[data-dica-grupo]').hidden = n < 2;
          q('[data-bloco-nome]').hidden = n < 2;
          q('[data-bloco-livro]').hidden = tipo !== 'livro';
          q('[data-explica]').textContent = EXPLICA[tipo];
          q('[data-criar]').disabled = !n;
          q('[data-criar]').textContent = n >= 2 ? 'Criar grupo' : 'Chamar para o propósito';
        };
        folha.querySelectorAll('[data-tipo]').forEach((b) => {
          b.onclick = () => {
            tipo = b.dataset.tipo;
            folha.querySelectorAll('[data-tipo]').forEach((x) => x.setAttribute('aria-pressed', x === b));
            atualizar();
          };
        });
        folha.querySelectorAll('.escolha-amigo input').forEach((i) => { i.onchange = atualizar; });
        q('[data-fechar]').onclick = fechar;
        q('[data-criar]').onclick = async () => {
          const botao = q('[data-criar]');
          const erro = q('.erro-proposito');
          botao.disabled = true;
          erro.hidden = true;
          const com = marcados();
          try {
            await acao({
              acao: 'criar', tipo, com,
              alvo: tipo === 'livro' ? q('[data-alvo]').value : '',
              titulo: com.length >= 2 ? q('[data-titulo]').value : '',
            });
            fechar();
            CC.avisar(com.length >= 2 ? 'Grupo criado! Começa quando aceitarem.' : 'Convite enviado! Começa quando aceitarem.');
            if (!/^#\/novidades\/propositos/.test(location.hash)) location.hash = '#/novidades/propositos';
            else recarregar();
          } catch (e) {
            erro.textContent = e.message;
            erro.hidden = false;
            botao.disabled = false;
          }
        };
        atualizar();
      },
    });
  };
})(window.CC);
