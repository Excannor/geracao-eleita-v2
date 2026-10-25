/* Propósitos: o compromisso de ler, ou orar, junto. Em dupla, com quantas pessoas quiser; em
   grupo, até 5, com a meta coletiva do dia. A célula é um grupo de até 20 que cresce por link. O
   servidor faz as contas; aqui só aparece quem já fez hoje, nunca o que alguém escreveu ou orou. */
(function (CC) {
  'use strict';

  // O teto do nome da célula, do grupo e do propósito (o mesmo de contas.mjs, TITULO_GRUPO_MAX):
  // ele aparece nas notificações.
  const TITULO_GRUPO_MAX = 24;
  let cache = null;
  const retrato = (p, tamanho) => CC.retratoAmigo(p, tamanho);
  const euUsuario = () => (CC.quem || {}).usuario;
  const acao = (corpo) => CC.api('api/propositos', corpo);

  // Retrato para a pilha do cartão (célula e grupo): com foto, o de sempre; sem foto, uma cor
  // de fundo suave e própria por pessoa, escolhida pelo @usuario (sempre a mesma pessoa, sempre
  // a mesma cor), com a letra na cor forte da mesma família. Contraste conferido nos dois temas
  // em ferramentas/contraste.mjs.
  // Na paleta atual verde, azul e amarelo dão o mesmo petróleo: ficam só as 3 famílias distintas.
  const CORES_PILHA = ['verde', 'roxo', 'vermelho'];
  function retratoPilha(m, tamanho) {
    if (m.foto) return retrato(m, tamanho);
    const cls = 'retrato-amigo inicial' + (tamanho ? ' ' + tamanho : '');
    const soma = [...String(m.usuario)].reduce((s, c) => s + c.charCodeAt(0), 0);
    const letra = (m.nome || m.usuario || '?').trim().charAt(0).toUpperCase();
    return '<span class="' + cls + ' retrato-cor-' + CORES_PILHA[soma % CORES_PILHA.length] + '" aria-hidden="true">' + CC.esc(letra) + '</span>';
  }

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
    // Na célula, a contagem diz o que conta: não é a ofensiva da pessoa, é a célula inteira.
    const rotulo = p.celula ? (um ? 'dia com a célula inteira lendo' : 'dias com a célula inteira lendo')
      : p.grupo
      ? (p.tipo === 'livro' ? (um ? 'dia de meta' : 'dias de meta') : (um ? 'dia seguido' : 'dias seguidos'))
      : (p.tipo === 'livro' ? (um ? 'dia lido' : 'dias lidos') : (um ? 'dia junto' : 'dias juntos'));
    return '<span class="dias-cartao">' + CC.icoChama() + p.dias + '<small>' + rotulo + '</small></span>';
  }

  function barraDoGrupo(hoje) {
    const fracao = hoje.meta ? Math.min(1, hoje.pontos / hoje.meta) : 0;
    return '<div class="barra-missao barra-grupo" style="--cor: var(--' + (hoje.batida ? 'verde' : 'azul') + ')">'
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
      // Célula pode ter 20 pessoas: o cartão mostra só 3 retratos e conta o resto, para a
      // pilha não virar um amontoado de bordas por cima uma da outra.
      + (p.grupo ? gente : outros).slice(0, 3).map((m) => retratoPilha(m, (p.grupo ? 'pequeno' : 'medio') + (m.fezHoje ? ' fez' : ''))).join('')
      + (p.grupo && gente.length > 3 ? '<span class="retrato-amigo pequeno retrato-mais">+' + (gente.length - 3) + '</span>' : '') + '</span>'
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
      + (p.celula && encontroHoje(p) && p.estudo ? '<span class="selo-status leu">' + CC.ico('livro') + 'Encontro hoje · veja o estudo</span>' : '')
      + (p.celula && p.recado ? '<p class="recado-cartao">' + CC.esc(p.recado) + '</p>' : '')
      + (p.grupo && p.hoje && p.tipo !== 'oracao' ? barraDoGrupo(p.hoje) : situacaoDaDupla(p))
      + '</button>';
  }

  // O cartão da célula saiu do Juntos: a célula tem aba própria agora (ver
  // CC.vistaEscolherCelula, mais abaixo, para quem está em mais de uma).
  // ---------- a célula como tela ----------
  // Uma célula de 20 pessoas não cabia numa folha: a célula tem tela própria, com quatro abas.
  //   Hoje: o recado, o encontro e a meta do dia, e o que o líder muda (recado, dia, link)
  //   Estudo: o estudo do encontro inteiro, para ler antes e mandar no grupo
  //   Oração: pedir oração ou ajuda, e reagir com um gesto, sem chat (Atos 2.42; 2.44-45)
  //   Pessoas: quem leu hoje, notificar quem falta, chamar alguém, sair ou encerrar
  // Visitante (só está conhecendo) não vê a aba Oração: pedido é dado sensível, e ele ainda
  // não é membro de verdade.
  // Painel: as estatísticas da célula, só para quem conduz (líder e auxiliar).
  const ABAS_CELULA = [['hoje', 'Hoje'], ['estudo', 'Estudo'], ['oracao', 'Oração'], ['pessoas', 'Pessoas'], ['painel', 'Painel']];
  const enderecoCelula = (id, aba) => '#/novidades/celula/' + encodeURIComponent(id) + (aba && aba !== 'hoje' ? '/' + aba : '');
  let desenhoCelula = 0;

  CC.vistaCelula = function (raiz, arg) {
    // alvo: o estudo anterior aberto na aba Estudo (…/estudo/<id>) ou o estudo de base do preparo
    // ("Usar como base", …/preparar/<id>)
    const [id, pedida, alvo] = String(arg || '').split('/');
    // O preparo do estudo já aberto (ou abrindo, com a pergunta do rascunho na tela) não se
    // redesenha (a sincronização chama CC.redesenhar): o líder perderia o foco do texto no meio de
    // uma frase, ou ganharia uma segunda pergunta por cima da primeira. O rascunho já está
    // guardado. Trocar de …/preparar/<base> para …/preparar (ou o contrário) é outro preparo, e
    // redesenha.
    if (pedida === 'preparar' && [...raiz.querySelectorAll('.mesa-preparo[data-celula]')].some((el) => el.dataset.celula === id && (el.dataset.deBase || '') === (alvo || ''))) return;
    const meu = ++desenhoCelula;
    const nestaTela = () => meu === desenhoCelula && location.hash.startsWith('#/novidades/celula/');
    // O preparo é montado uma vez por abertura: a resposta nova do servidor (ou a falha dela, sem
    // internet) não o refaz, senão o líder perde o foco e o teclado no meio da digitação.
    let preparoMontado = false;

    const desenhar = (d) => {
      if (!d) { raiz.innerHTML = CC.esqueleto('lista'); ligarVoltar(raiz); return; }
      const p = (d.propositos || []).find((x) => x.id === id && x.celula && !x.euConvidado);
      if (!p) {
        raiz.innerHTML = voltarCelulas() + '<div class="vazio-amigos">' + CC.ico('pessoas') + '<p>Essa célula não está mais na sua lista.</p></div>';
        ligarVoltar(raiz);
        return;
      }
      // O preparo do estudo é tela própria, sem as abas, e só de quem prepara (o líder).
      if (pedida === 'preparar') {
        if (!p.euPreparoEstudo) { CC.substituirRota(enderecoCelula(p.id, 'estudo')); return; }
        if (preparoMontado) return;
        preparoMontado = true;
        abrirPreparo(raiz, p, () => meu === desenhoCelula, alvo || '');
        return;
      }
      const souLider = p.criadoPor === euUsuario();
      const euMembro = p.membros.find((m) => m.usuario === euUsuario()) || {};
      const visitante = euMembro.papel === 'visitante';
      // Visitante não vê a aba Oração: se chegou nela por um link antigo, cai em Hoje.
      const abasVisiveis = ABAS_CELULA.filter(([k]) => (k !== 'oracao' || !visitante) && (k !== 'painel' || p.euConduzo));
      const aba = abasVisiveis.some(([k]) => k === pedida) ? pedida : 'hoje';
      // A folha do alto (só apresentação, 24-juntos.css): o nome, os dias seguidos no cartão
      // de destaque do Início e as abas; o painel da aba fica embaixo, no fundo.
      raiz.innerHTML = '<div class="folha-juntos">' + voltarCelulas()
        + '<div class="cabeca-celula"><div><span class="etiqueta-celula">' + CC.ico('pessoas') + 'Célula</span>'
        + '<h1>' + CC.esc(p.titulo) + '</h1>'
        + '<p class="passo-dica">' + CC.plural(ativos(p).length, 'pessoa', 'pessoas') + '</p></div>'
        + cartaoProximoEncontro(p) + contagem(p) + '</div>'
        + '<div class="segmentado abas-celula" role="tablist" aria-label="Partes da célula">'
        + abasVisiveis.map(([k, r]) => '<button type="button" role="tab" data-aba="' + k + '" aria-selected="' + (k === aba) + '" aria-pressed="' + (k === aba) + '">'
          + r + (k === 'estudo' && p.estudo ? '<i class="ponto-estudo" aria-hidden="true"></i>' : '') + '</button>').join('')
        + '</div></div>'
        + '<div class="painel-celula" role="tabpanel">'
        + (aba === 'hoje' ? abaHoje(p) : aba === 'pessoas' ? abaPessoas(p, souLider) : aba === 'painel' ? abaPainel(p) : CC.esqueleto('lista'))
        + '</div>';
      ligarVoltar(raiz);
      // Trocar de aba não empilha histórico: o "voltar" do celular sai da célula de uma vez.
      raiz.querySelectorAll('[data-aba]').forEach((b) => { b.onclick = () => CC.substituirRota(enderecoCelula(p.id, b.dataset.aba)); });
      const painel = raiz.querySelector('.painel-celula');
      if (aba === 'hoje') ligarHoje(painel, p);
      if (aba === 'pessoas') ligarPessoas(painel, p, souLider);
      if (aba === 'painel') ligarPainel(painel, p);
      if (aba === 'estudo') preencherEstudo(painel, p, () => meu === desenhoCelula, alvo || '');
      if (aba === 'oracao') preencherOracao(painel, p, () => meu === desenhoCelula);
    };

    desenhar(cache);
    // Como em Propósitos: redesenha só se a resposta mudou algo, e sem repetir a entrada.
    const antes = JSON.stringify(cache);
    const jaMostrou = !!cache;
    CC.carregarPropositos().then((d) => {
      if (!nestaTela()) return;
      if (CC.pintarNavegacao) CC.pintarNavegacao();
      if (d && JSON.stringify(d) === antes) return;
      if (jaMostrou) raiz.classList.add('sem-entrada');
      desenhar(d || cache);
    });
  };

  // ---------- a aba Célula (#/celula) ----------
  // Com uma célula só, abre ela direto (location.replace: o "voltar" do celular não fica
  // preso numa tela de escolha com um item só). Com mais de uma, uma lista simples.
  CC.vistaEscolherCelula = function (raiz) {
    const nestaTela = () => location.hash === '#/celula';
    const desenhar = (d, carregando) => {
      if (!nestaTela()) return;
      if (carregando) { raiz.innerHTML = CC.esqueleto('lista'); return; }
      const celulas = CC.minhasCelulas ? CC.minhasCelulas() : [];
      if (celulas.length === 1) { CC.substituirRota(enderecoCelula(celulas[0].id)); return; }
      if (!celulas.length) {
        raiz.innerHTML = '<div class="folha-juntos"><div class="cabeca-centro"><h1>Célula</h1></div></div><div class="vazio-amigos">' + CC.ico('pessoas') + '<p>Você ainda não está em nenhuma célula.</p></div>';
        return;
      }
      raiz.innerHTML = '<div class="folha-juntos"><div class="cabeca-centro"><h1>Escolha uma célula</h1></div></div>'
        + '<div class="lista-pedidos">' + celulas.map((p) => '<button type="button" class="cartao-proposito" data-ir-celula="' + CC.esc(p.id) + '">'
          + cabeca(p) + '</button>').join('') + '</div>';
      raiz.querySelectorAll('[data-ir-celula]').forEach((b) => { b.onclick = () => { location.hash = enderecoCelula(b.dataset.irCelula); }; });
    };
    desenhar(cache, !cache);
    if (cache && (CC.minhasCelulas() || []).length === 1) return;
    CC.carregarPropositos().then((d) => { if (CC.pintarNavegacao) CC.pintarNavegacao(); desenhar(d || cache); });
  };

  // A célula agora é aba da barra: não volta para o Juntos. Só quem está em mais de uma
  // célula ganha um caminho de volta, para a lista delas.
  const voltarCelulas = () => ((CC.minhasCelulas() || []).length > 1
    ? '<button class="voltar" data-lista-celulas>' + CC.ico('voltar') + 'Minhas células</button>' : '');

  function ligarVoltar(raiz) {
    CC.ligarVoltarDoTopo(raiz);
    raiz.querySelectorAll('[data-lista-celulas]').forEach((el) => { el.onclick = () => { location.hash = '#/celula'; }; });
  }

  function abaHoje(p) {
    const eu = p.membros.find((m) => m.usuario === euUsuario()) || {};
    const conduzo = p.euConduzo;
    // Visitante não conta contra o limite de membros: o link fica disponível para quem
    // ainda tem vaga de membro de verdade, mesmo com a célula cheia de gente conhecendo.
    const podeChamar = p.membros.filter((m) => m.estado !== 'saiu' && m.papel !== 'visitante').length < (p.limite || (cache && cache.limiteCelula) || 20);
    const membro = eu.estado === 'ativo' && eu.papel !== 'visitante';
    return topoDaCelula(p)
      + (conduzo ? oreHojePorHtml(p) : '')
      // No dia do encontro: com estudo, o caminho até ele; sem estudo, só quem prepara vê o selo.
      + (encontroHoje(p) && p.estudo ? '<button class="selo-status leu botao-selo" data-ir-estudo>' + CC.ico('livro') + 'Encontro hoje · veja o estudo</button>' : '')
      + (encontroHoje(p) && !p.estudo && p.euPreparoEstudo ? '<button class="selo-status botao-selo" data-ir-preparar>' + CC.ico('livro') + 'Encontro hoje · preparar o estudo</button>' : '')
      + (p.hoje ? barraDoGrupo(p.hoje) : '')
      // A meta ainda não foi batida e falta a minha leitura: o caminho até ela, sem rodeio.
      + (p.hoje && !p.hoje.batida && eu.estado === 'ativo' && !eu.fezHoje
        ? '<div class="acoes-missao acoes-meta"><a class="botao pequeno botao-ir-missao botao-ir-escuro" href="#/" data-ler-agora>Ler agora' + CC.ico('avancar') + '</a></div>' : '')
      + (conduzo ? blocoEncontro(p) : '')
      + (membro ? blocoCheckinHoje() : '')
      + (membro ? blocoCaminhadaHoje() : '')
      + '<div class="acoes">'
      + (eu.papel === 'visitante' ? '<button class="botao" data-tornar-membro>' + CC.ico('mais-sinal') + 'Fazer parte da célula</button>' : '')
      + (eu.papel !== 'visitante' && eu.estado === 'ativo' && p.encontro >= 0 && !p.celulaAguardando
        ? '<button class="botao contorno" data-convidar-encontro>' + CC.ico('compartilhar') + 'Convidar para o encontro</button>' : '')
      + (podeChamar && eu.estado === 'ativo' && !p.celulaAguardando ? '<button class="botao contorno pequeno" data-link-celula>' + CC.ico('compartilhar') + 'Mandar o link da célula</button>' : '')
      + (conduzo ? '<div class="pe-duplo-plano"><button class="botao plano pequeno" data-recado>' + (p.recado ? 'Mudar o recado' : 'Escrever um recado') + '</button>'
        + '<button class="botao plano pequeno" data-encontro>Dia do encontro</button></div>' : '')
      + '</div>';
  }

  function ligarHoje(painel, p) {
    const ligar = (sel, fn) => { const el = painel.querySelector(sel); if (el) el.onclick = fn; };
    ligar('[data-ir-estudo]', () => CC.substituirRota(enderecoCelula(p.id, 'estudo')));
    ligar('[data-ir-preparar]', () => { location.hash = enderecoCelula(p.id, 'preparar'); });
    ligar('[data-link-celula]', () => folhaLinkCelula(p));
    ligar('[data-recado]', () => folhaRecado(p));
    ligar('[data-encontro]', () => folhaEncontro(p));
    ligar('[data-registrar-encontro]', () => folhaRegistrarEncontro(p));
    ligar('[data-corrigir-encontro]', () => folhaRegistrarEncontro(p));
    ligar('[data-checkin]', () => { if (CC.abrirCheckin) CC.abrirCheckin(() => CC.redesenhar()); });
    ligar('[data-agenda]', () => baixarAgenda(p));
    // "Orei": anota no diário de hoje e a linha some até amanhã.
    painel.querySelectorAll('[data-orei]').forEach((b) => {
      b.onclick = () => {
        if (CC.marcarNoDiario) CC.marcarNoDiario('orei_' + b.dataset.orei);
        const linha = b.closest('.linha-amigo');
        const lista = linha && linha.parentElement;
        if (linha) linha.remove();
        if (lista && !lista.children.length) lista.remove();
        CC.avisar('Anotado. Até amanhã!');
      };
    });
    ligar('[data-convidar-encontro]', async () => {
      let link = '';
      try {
        link = (await CC.api('api/celula', { acao: 'link', id: p.id })).link;
      } catch (e) {
        CC.avisar(e.message || 'Não consegui gerar o link agora.');
        return;
      }
      // O mesmo link de "Mandar o link da célula": quem abrir escolhe entrar ou só conhecer.
      const texto = 'Quer ir comigo no encontro da minha célula? É ' + nomeDoEncontro(p.encontro) + '. Me chama que eu te passo o endereço.';
      const r = await CC.compartilhar(texto, link);
      if (r === 'copiado') CC.avisar('Link copiado');
      else if (r === 'falhou') CC.avisar('Não consegui compartilhar agora.');
    });
    const tornar = painel.querySelector('[data-tornar-membro]');
    if (tornar) tornar.onclick = async () => {
      tornar.disabled = true;
      try {
        await CC.api('api/celula', { acao: 'tornarMembro', id: p.id });
        CC.avisar('Agora você faz parte da célula!');
      } catch (e) {
        tornar.disabled = false;
        CC.avisar(e.message);
      }
      recarregar();
    };
    // "Dar um toque" de quem precisa de atenção é o mesmo toque de amigo de sempre.
    painel.querySelectorAll('[data-toque]').forEach((b) => {
      b.onclick = () => CC.telaToque({ usuario: b.dataset.toque, nome: b.dataset.nome });
    });
  }

  // ---------- o estudo (À Mesa): a casca ----------
  // O estudo pronto, o modo encontro e "Mandar no grupo" moram na peça estudo-celula; o preparo,
  // na estudo-preparo (src/sob-demanda/). Aqui fica o que abre na hora: o vazio, com o caminho de
  // cada um, e o pedido das peças. Quem prepara é só o líder (euPreparoEstudo, do servidor),
  // nunca decidido por euConduzo: o auxiliar vê o estudo como membro.
  const pedirEstudo = (comPreparo) => CC.pedirPeca(window.ESTUDO_CELULA, () => !!CC.estudoCelula)
    .then(() => (comPreparo ? CC.pedirPeca(window.ESTUDO_PREPARO, () => !!CC.estudoPreparo) : null));
  function semPeca(painel, titulo) {
    painel.innerHTML = CC.estadoSemPeca(titulo);
    const b = painel.querySelector('[data-acao-estado]');
    if (b) b.onclick = () => CC.redesenhar();
  }
  // alvo: um estudo anterior (…/estudo/<id>), lido pela peça (GET /api/estudos). Sem estudo
  // atual, o vazio de sempre e, para quem faz parte da célula e tem estudos guardados (ou os da
  // célula de origem), a seção "Estudos anteriores" embaixo, desenhada pela peça; para quem
  // conduz, com a fila não vazia, também "Próximos estudos" (docs/a-mesa-fila.md, 5.1).
  function preencherEstudo(painel, p, aindaAqui, alvo) {
    if (alvo && !(p.estudo && p.estudo.id === alvo)) {
      pedirEstudo(false).then(() => { if (aindaAqui()) CC.estudoCelula.anterior(painel, p, apoio, alvo, aindaAqui); },
        () => { if (aindaAqui()) semPeca(painel, 'Não consegui abrir o estudo'); });
      return;
    }
    if (!p.estudo) {
      painel.innerHTML = '<div class="vazio-amigos">' + CC.ico('livro')
        + '<p>' + (p.euPreparoEstudo ? 'O estudo do encontro ainda não foi preparado. Você escolhe: a leitura da semana, um trecho ou um estudo seu.'
          : CC.esc(nomeDoLider(p)) + ' ainda não preparou o estudo deste encontro.') + '</p>'
        + (p.euPreparoEstudo ? '<button class="botao" data-preparar>' + CC.ico('livro') + 'Preparar o estudo</button>'
          : '<a class="botao" href="' + leituraDaSemana(p) + '" data-leitura-semana>Ler a leitura da semana' + CC.ico('avancar') + '</a>') + '</div>'
        + (p.temAnteriores || p.daMae || (p.fila && p.fila.length) ? '<div data-anteriores></div>' : '');
      const preparar = painel.querySelector('[data-preparar]');
      if (preparar) preparar.onclick = () => { location.hash = enderecoCelula(p.id, 'preparar'); };
      const anteriores = painel.querySelector('[data-anteriores]');
      if (anteriores) pedirEstudo(false).then(() => { if (aindaAqui() && anteriores.isConnected) CC.estudoCelula.anteriores(anteriores, p, apoio); }, () => {});
      return;
    }
    pedirEstudo(false).then(() => { if (aindaAqui()) CC.estudoCelula.aba(painel, p, apoio, aindaAqui); },
      () => { if (aindaAqui()) semPeca(painel, 'Não consegui abrir o estudo'); });
  }
  // deBase: o estudo anterior que o líder usa como base ("Usar como base").
  function abrirPreparo(raiz, p, aindaAqui, deBase) {
    raiz.innerHTML = '<div class="folha-juntos"><div class="cabeca-centro"><h1>Preparar o estudo</h1></div></div>'
      + '<div class="painel-celula mesa-preparo" data-celula="' + CC.esc(p.id) + '" data-de-base="' + CC.esc(deBase || '') + '">' + CC.esqueleto('texto') + '</div>';
    // sem a peça, "Tentar de novo" redesenha: o vazio perde a marca de preparo aberto
    const semPreparo = () => { const m = raiz.querySelector('.mesa-preparo'); delete m.dataset.celula; semPeca(m, 'Não consegui abrir o preparo'); };
    pedirEstudo(true).then(() => { if (aindaAqui()) CC.estudoPreparo.tela(raiz, p, apoio, { deBase }); },
      () => { if (aindaAqui()) semPreparo(); });
  }

  // O endereço curto de um estudo (#/estudo/<id>, o caminho de Minhas anotações, que só sabe o
  // id): a peça pergunta ao servidor por qual célula a pessoa lê e troca para a aba Estudo dela.
  CC.abrirEstudoSolto = (raiz, arg) => {
    raiz.innerHTML = CC.esqueleto('texto');
    const aqui = location.hash;
    pedirEstudo(false).then(() => { if (location.hash === aqui) CC.estudoCelula.solto(raiz, String(arg || '').split('/')[0], apoio); },
      () => { if (location.hash === aqui) semPeca(raiz, 'Não consegui abrir o estudo'); });
  };

  function abaPessoas(p, souLider) {
    // Visitante (só está conhecendo) fica fora da meta, do "leram hoje" e vira uma seção
    // própria, sem estado de leitura: ainda não é membro de verdade.
    const gente = p.membros.filter((m) => m.estado !== 'saiu' && m.papel !== 'visitante');
    const visitantes = p.membros.filter((m) => m.estado !== 'saiu' && m.papel === 'visitante');
    const eu = p.membros.find((m) => m.usuario === euUsuario()) || {};
    const faltam = faltamNotificar(p);
    const limite = p.limite || (cache && cache.limiteCelula) || 20;
    // O líder primeiro, depois quem já leu hoje, depois os outros: quem faltou não vira lista à parte.
    const ordem = gente.slice().sort((a, b) => (b.usuario === p.criadoPor) - (a.usuario === p.criadoPor)
      || (b.fezHoje - a.fezHoje) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    const leram = gente.filter((m) => m.estado === 'ativo' && m.fezHoje).length;
    const ativosSemVisitante = gente.filter((m) => m.estado === 'ativo').length;
    // Líder menor de 18 à espera da aprovação da liderança: ainda não tira gente, não marca
    // auxiliar e não multiplica (pode encerrar a própria célula).
    const gere = souLider && p.aguardandoAprovacao !== 'lider';
    return '<p class="passo-dica">' + leram + ' de ' + CC.plural(ativosSemVisitante, 'pessoa leu', 'pessoas leram') + ' hoje.</p>'
      + '<div class="lista-pedidos">' + ordem.map((m) => {
        const situacao = m.estado === 'convidado' ? 'Ainda não aceitou'
          : m.fezHoje ? 'Leu hoje' + (m.extraHoje ? ' e fez o extra' : '')
            : m.extraHoje ? 'Fez o extra hoje' : 'Ainda não leu hoje';
        const selo = m.usuario === p.criadoPor ? ' <small class="selo-lider">líder</small>'
          : m.papel === 'auxiliar' ? ' <small class="selo-lider">auxiliar</small>' : '';
        return '<div class="linha-amigo' + (m.estado === 'convidado' ? ' enviado' : '') + '">' + retrato(m)
          + '<div class="quem-amigo"><b>' + CC.esc(nomeCurto(m)) + selo + '</b>'
          + '<span class="arroba">' + situacao + '</span></div>'
          + (m.fezHoje ? '<span class="selo-status leu">' + CC.ico('certo') + '</span>' : '')
          // Tirar da célula é sério: fica separado, em vermelho, e ainda pede confirmação.
          + (gere && m.usuario !== p.criadoPor ? '<div class="acoes-pessoa">'
            + (m.estado === 'ativo'
              ? '<button class="botao contorno pequeno" data-auxiliar="' + CC.esc(m.usuario) + '" data-sim="' + (m.papel === 'auxiliar' ? '0' : '1') + '">'
                + (m.papel === 'auxiliar' ? 'Tirar de auxiliar' : 'Tornar auxiliar') + '</button>' : '')
            + botaoTirar(m) + '</div>' : '')
          + '</div>';
      }).join('') + '</div>'
      + (visitantes.length ? CC.tituloSecao('Visitantes') + '<div class="lista-pedidos">' + visitantes.map((m) => '<div class="linha-amigo">' + retrato(m)
        + '<div class="quem-amigo"><b>' + CC.esc(nomeCurto(m)) + '</b></div>'
        + (gere ? '<div class="acoes-pessoa">' + botaoTirar(m) + '</div>' : '')
        + '</div>').join('') + '</div>' : '')
      + '<div class="acoes">'
      + (eu.fezHoje && faltam.length ? '<button class="botao" data-notificar>' + CC.ico('sino')
        + (faltam.length === 1 ? 'Notificar ' + CC.esc(faltam[0].nome) : 'Notificar quem falta (' + faltam.length + ')') + '</button>' : '')
      + (gente.length < limite && !p.celulaAguardando ? '<button class="botao contorno" data-chamar>' + CC.ico('mais-sinal') + 'Chamar um amigo</button>' : '')
      + (gere && p.membros.some((m) => m.estado === 'ativo' && m.papel === 'auxiliar')
        ? '<button class="botao contorno" data-multiplicar>' + CC.ico('mais-sinal') + 'Multiplicar a célula</button>' : '')
      + (souLider ? '<button class="botao plano perigo" data-encerrar>Encerrar a célula</button>' : '<button class="botao plano perigo" data-sair>Sair da célula</button>')
      + '</div>';
  }

  const botaoTirar = (m) => '<button class="botao contorno pequeno botao-perigo" data-remover="' + CC.esc(m.usuario) + '" aria-label="Tirar ' + CC.esc(m.nome) + ' da célula">Tirar da célula</button>';

  // Só quem é amigo recebe o toque: o "Notificar" é o mesmo toque de amigo de sempre.
  // Visitante fica fora: ainda não é membro de verdade, então não entra em "quem falta".
  function faltamNotificar(p) {
    const amigos = ((CC.amigosEmCache() || {}).amigos || []).map((a) => a.usuario);
    return ativos(p).filter((m) => m.papel !== 'visitante' && !m.fezHoje && m.usuario !== euUsuario() && amigos.includes(m.usuario));
  }

  function ligarPessoas(painel, p) {
    const gente = p.membros.filter((m) => m.estado !== 'saiu' && m.papel !== 'visitante');
    const limite = p.limite || (cache && cache.limiteCelula) || 20;
    painel.querySelectorAll('[data-auxiliar]').forEach((b) => {
      b.onclick = async () => {
        const sim = b.dataset.sim === '1';
        const m = p.membros.find((x) => x.usuario === b.dataset.auxiliar);
        if (!await CC.confirmar({
          titulo: (sim ? 'Tornar ' : 'Tirar ') + (m ? m.nome : '@' + b.dataset.auxiliar) + (sim ? ' auxiliar?' : ' de auxiliar?'),
          texto: sim ? 'A pessoa passa a poder escrever o recado, marcar o dia do encontro e registrar quem veio, junto com você. O estudo continua só com você.'
            : 'A pessoa deixa de conduzir a célula com você.',
          acao: sim ? 'Tornar auxiliar' : 'Tirar de auxiliar', perigo: !sim,
        })) return;
        try { await CC.api('api/celula', { acao: 'auxiliar', id: p.id, usuario: b.dataset.auxiliar, sim }); CC.avisar('Pronto'); } catch (e) { CC.avisar(e.message); }
        recarregar();
      };
    });
    const notificar = painel.querySelector('[data-notificar]');
    if (notificar) notificar.onclick = async () => {
      notificar.disabled = true;
      const r = await Promise.allSettled(faltamNotificar(p).map((m) => CC.api('api/toques', { para: m.usuario })));
      CC.avisar(r.some((x) => x.status === 'fulfilled') ? 'Notificado!' : 'Hoje você já notificou quem falta');
      recarregar();
    };
    const chamar = painel.querySelector('[data-chamar]');
    if (chamar) chamar.onclick = () => folhaChamar(p, limite - gente.length);
    painel.querySelectorAll('[data-remover]').forEach((b) => {
      b.onclick = async () => {
        const m = gente.find((x) => x.usuario === b.dataset.remover);
        if (!await CC.confirmar({
          titulo: 'Tirar ' + (m ? m.nome : '@' + b.dataset.remover) + ' da célula?',
          texto: 'A pessoa sai da célula e da contagem do grupo. A amizade com você continua.',
          acao: 'Tirar', perigo: true,
        })) return;
        try { await CC.api('api/celula', { acao: 'remover', id: p.id, usuario: b.dataset.remover }); CC.avisar('Pronto'); } catch (e) { CC.avisar(e.message); }
        recarregar();
      };
    });
    const sair = painel.querySelector('[data-sair]');
    if (sair) sair.onclick = async () => {
      if (!await CC.confirmar({ titulo: 'Sair da ' + comoCelula(p.titulo) + '?', texto: 'A célula continua sem você.', acao: 'Sair', perigo: true })) return;
      try { await acao({ acao: 'sair', id: p.id }); location.hash = '#/novidades'; } catch (e) { CC.avisar(e.message); }
      recarregar();
    };
    const encerrar = painel.querySelector('[data-encerrar]');
    if (encerrar) encerrar.onclick = async () => {
      if (!await CC.confirmar({ titulo: 'Encerrar a ' + comoCelula(p.titulo) + '?', texto: 'A célula acaba para todo mundo.', acao: 'Encerrar', perigo: true })) return;
      try { await acao({ acao: 'encerrar', id: p.id }); location.hash = '#/novidades'; } catch (e) { CC.avisar(e.message); }
      recarregar();
    };
    const multiplicar = painel.querySelector('[data-multiplicar]');
    if (multiplicar) multiplicar.onclick = () => folhaMultiplicar(p);
  }

  // ---------- multiplicar a célula (Atos 2.47; 2 Timóteo 2.2) ----------
  // Só o líder vê o botão (já garantido em abaPessoas). Ele escolhe o auxiliar que vai
  // liderar a nova célula, o nome dela e quem vai junto (membros ativos; visitante também
  // pode ir). O auxiliar escolhido sempre vai, então não aparece de novo na lista de "quem vai".
  function folhaMultiplicar(p) {
    const gente = p.membros.filter((m) => m.estado === 'ativo' && m.usuario !== p.criadoPor);
    const auxiliares = gente.filter((m) => m.papel === 'auxiliar');
    CC.folha('<h2>Multiplicar a célula</h2>'
      + '<p class="passo-dica">Quando a célula cresce, ela pode virar duas. Um auxiliar passa a liderar a nova, e vocês escolhem juntos quem vai para lá.</p>'
      + '<label class="campo-senha"><span>Quem vai liderar a nova célula</span><select data-auxiliar>'
      + auxiliares.map((m) => '<option value="' + CC.esc(m.usuario) + '">' + CC.esc(m.nome) + '</option>').join('') + '</select></label>'
      + '<label class="campo-senha"><span>Nome da nova célula ' + CC.contagem('', TITULO_GRUPO_MAX) + '</span><input data-titulo maxlength="' + TITULO_GRUPO_MAX + '" placeholder="Ex.: Célula de quinta" autocomplete="off" autocapitalize="sentences" enterkeyhint="done"></label>'
      + '<p class="etiqueta">Quem mais vai para a nova célula</p>'
      + '<div class="escolha-amigos" data-lista-pessoas>' + gente.filter((m) => m.papel !== 'auxiliar' || auxiliares.length > 1).map((m) => '<label class="linha-amigo escolha-amigo">'
        + '<input type="checkbox" value="' + CC.esc(m.usuario) + '" data-pessoa-multiplicar' + (m.papel === 'auxiliar' ? ' data-outro-auxiliar' : '') + '>' + retrato(m)
        + '<span class="quem-amigo"><b>' + CC.esc(nomeCurto(m)) + (m.papel === 'visitante' ? ' <small class="selo-lider">visitante</small>' : '') + '</b></span></label>').join('') + '</div>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao" data-confirmar-multiplicar>Multiplicar</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Multiplicar a célula',
      rolavel: true,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const erro = folha.querySelector('.erro-proposito');
        const botao = folha.querySelector('[data-confirmar-multiplicar]');
        // Marcar a pessoa que virou "quem vai liderar" desmarca ela da lista de "quem mais vai":
        // o auxiliar escolhido sempre vai, então não faz sentido escolher ele duas vezes.
        const selecionaAuxiliar = folha.querySelector('[data-auxiliar]');
        const atualizarOutroAuxiliar = () => {
          folha.querySelectorAll('[data-outro-auxiliar]').forEach((c) => {
            const linha = c.closest('.escolha-amigo');
            const escondido = c.value === selecionaAuxiliar.value;
            if (linha) linha.hidden = escondido;
            if (escondido) c.checked = false;
          });
        };
        if (selecionaAuxiliar) { selecionaAuxiliar.onchange = atualizarOutroAuxiliar; atualizarOutroAuxiliar(); }
        botao.onclick = async () => {
          const auxiliar = selecionaAuxiliar ? selecionaAuxiliar.value : '';
          const titulo = folha.querySelector('[data-titulo]').value.trim();
          const pessoas = [...folha.querySelectorAll('[data-pessoa-multiplicar]:checked')].map((c) => c.value);
          erro.hidden = true;
          if (!auxiliar) { erro.textContent = 'A célula precisa de um auxiliar ativo para poder multiplicar.'; erro.hidden = false; return; }
          if (!titulo) { erro.textContent = 'Diga o nome da nova célula.'; erro.hidden = false; return; }
          const nomeAux = (auxiliares.find((m) => m.usuario === auxiliar) || {}).nome || '@' + auxiliar;
          if (!await CC.confirmar({
            titulo: 'Multiplicar a célula?',
            texto: nomeAux + ' passa a liderar a nova célula "' + titulo + '", com ' + CC.plural(pessoas.length + 1, 'pessoa', 'pessoas') + ' (incluindo ' + nomeAux + ').',
            acao: 'Multiplicar',
          })) return;
          botao.disabled = true;
          try {
            await CC.api('api/celula', { acao: 'multiplicar', id: p.id, auxiliar, titulo, pessoas });
            CC.avisar('Célula multiplicada!');
            fechar();
            recarregar();
          } catch (e) {
            botao.disabled = false;
            erro.textContent = e.message;
            erro.hidden = false;
          }
        };
      },
    });
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
  // A célula tem aba própria: criar ou entrar numa leva a pessoa direto para ela.
  function irParaCelula(id) {
    const alvo = enderecoCelula(id);
    if (location.hash === alvo) recarregar(); else location.hash = alvo;
  }

  // ---------- a tela ----------
  CC.vistaPropositos = function (raiz) {
    const desenhar = (d, aviso) => {
      const lista = (d && d.propositos) || [];
      const convites = lista.filter((p) => p.euConvidado);
      const grupos = lista.filter((p) => !p.euConvidado && p.grupo && !p.celula);
      const duplas = lista.filter((p) => !p.euConvidado && !p.grupo);
      // A folha do alto (só apresentação, 24-juntos.css): o título e o convite para um
      // propósito novo, no cartão de destaque do Início.
      raiz.innerHTML = '<div class="folha-juntos"><div class="cabeca-centro">' + CC.botaoVoltar('Juntos') + '<h1>Propósitos</h1></div>'
        + (d ? '<p class="subtitulo-tela">' + CC.plural(grupos.length + duplas.length, 'propósito', 'propósitos') + '</p>' : '')
        + (aviso ? '<p class="estado-linha">' + CC.ico('info') + '<span>' + CC.esc(aviso) + '</span></p>' : '')
        + '<button class="destaque-juntos" data-novo-proposito><span>Novo propósito com amigos</span>' + CC.ico('mais-sinal') + '</button></div>'
        + (!d ? CC.esqueleto('cartoes') : '')
        + (convites.length ? CC.tituloSecao('Convites', String(convites.length)) + '<div class="lista-propositos">' + convites.map(cartaoConvite).join('') + '</div>' : '')
        + (grupos.length ? CC.tituloSecao('Grupos') + '<div class="lista-propositos">' + grupos.map(cartao).join('') + '</div>' : '')
        + (duplas.length ? CC.tituloSecao('Em dupla') + '<div class="lista-propositos">' + duplas.map(cartao).join('') + '</div>' : '')
        + (d && !lista.length
          ? '<div class="vazio-amigos">' + CC.ico('pessoas') + '<p>Chame um amigo para ler, ou orar, junto com você. Os propósitos de vocês aparecem aqui.</p></div>'
          : '')
        ;

      const ligar = (sel, fn) => raiz.querySelectorAll(sel).forEach((el) => { el.onclick = () => fn(el); });
      ligar('[data-novo-proposito]', () => CC.novoProposito());
      ligar('[data-proposito]', (el) => folhaProposito(lista.find((p) => p.id === el.dataset.proposito)));
      ligar('[data-aceitar-proposito]', async (el) => {
        el.disabled = true;
        try { await acao({ acao: 'aceitar', id: el.dataset.aceitarProposito }); CC.avisar('Propósito aceito. Boa leitura juntos!'); } catch (e) { CC.avisar(e.message); }
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
      desenhar(d || cache, d ? '' : 'Sem conexão. Tente de novo.');
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

    CC.folha('<h2>' + CC.esc(p.grupo ? p.titulo : 'Propósito de ' + (/^Bíblia/.test(p.titulo) ? p.titulo : p.titulo.charAt(0).toLowerCase() + p.titulo.slice(1))) + '</h2>'
      + '<p class="tipo-proposito">' + CC.ico(ICONE[p.tipo] || 'trilha') + CC.esc(ROTULO_TIPO[p.tipo] || '') + (p.tipo === 'livro' ? ': ' + CC.esc(p.titulo) : '')
      + (oracao ? '' : ' · ' + CC.plural(p.dias, 'dia', 'dias')) + '</p>'
      + (p.celula ? topoDaCelula(p) : '')
      + (p.grupo && p.hoje && !oracao ? barraDoGrupo(p.hoje)
        : '<p class="passo-dica pequena">' + CC.esc(EXPLICA[p.tipo] || '') + '</p>')
      + '<div class="lista-pedidos">' + linhas + '</div>'
      + '<div class="acoes">'
      + (podeNotificar ? '<button class="botao" data-notificar>' + CC.ico('sino') + (faltam.length === 1 ? 'Notificar ' + CC.esc(faltam[0].nome) : 'Notificar quem falta (' + faltam.length + ')') + '</button>' : '')
      + (p.celula ? '<button class="botao" data-roteiro>' + CC.ico('livro') + 'Estudo do encontro</button>' : '')
      + (p.celula && podeChamar && eu.estado === 'ativo' ? '<button class="botao contorno pequeno" data-link-celula>' + CC.ico('compartilhar') + 'Mandar o link da célula</button>' : '')
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
          CC.avisar(foram ? 'Notificado!' : 'Hoje você já notificou quem falta');
          recarregar();
        };
        const chamar = folha.querySelector('[data-chamar]');
        if (chamar) chamar.onclick = () => { fechar(); folhaChamar(p, limite - gente.length); };
        const linkCelula = folha.querySelector('[data-link-celula]');
        if (linkCelula) linkCelula.onclick = () => { fechar(); folhaLinkCelula(p); };
        const roteiro = folha.querySelector('[data-roteiro]');
        if (roteiro) roteiro.onclick = () => { fechar(); location.hash = enderecoCelula(p.id, 'estudo'); };
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
              texto: 'A pessoa sai da célula e da contagem do grupo. A amizade com você continua.',
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
            texto: p.grupo ? 'O grupo continua sem você.' : 'A contagem de vocês some.',
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
  const textoCelula = (titulo) => 'Vamos ler a Bíblia juntos, um pouco por dia, e conversar sobre o que aprendemos. Entre na ' + comoCelula(titulo) + ' no Geração Eleita:';

  CC.novaCelula = function () {
    if (CC.quem && CC.quem.comSenha && !CC.quem.perfilCompleto) {
      CC.completarCadastro(CC.quem).then((ok) => { if (ok) CC.novaCelula(); });
      return;
    }
    const limite = (cache && cache.limiteCelula) || 20;
    CC.folha('<h2>Criar uma célula</h2>'
      + '<p class="passo-dica">Vocês leem o plano juntos, até ' + limite + ' pessoas. Depois de criar, você manda o link no grupo do WhatsApp e quem abrir já entra.</p>'
      + '<label class="campo-senha"><span>Nome da célula ' + CC.contagem('', TITULO_GRUPO_MAX) + '</span><input data-titulo name="nome-da-celula" maxlength="' + TITULO_GRUPO_MAX + '" placeholder="Ex.: Célula de quinta" autocomplete="off" autocapitalize="sentences" enterkeyhint="done"></label>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao" data-criar>Criar e pegar o link</button>'
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
            irParaCelula(proposito.id);
            if (proposito.aguardandoAprovacao) folhaAguardandoAprovacao();
            else folhaLinkCelula(proposito);
          } catch (e) {
            erro.textContent = e.message;
            erro.hidden = false;
            botao.disabled = false;
          }
        };
      },
    });
  };

  // Menor de 18 que cria a célula: ela espera a aprovação da liderança antes do link e do painel.
  const TEXTO_AGUARDANDO = {
    lider: ['Sua célula está aguardando aprovação da liderança.',
      'Quem tem menos de 18 anos lidera uma célula depois que a liderança da igreja aprova. Assim que aprovarem, você manda o link e vê o painel da célula.'],
    auxiliar: ['Sua função de auxiliar está aguardando aprovação da liderança.',
      'Quem tem menos de 18 anos ajuda a conduzir a célula depois que a liderança da igreja aprova. Até lá, você participa como membro.'],
  };
  function folhaAguardandoAprovacao() {
    CC.folha('<h2>Célula criada</h2>'
      + '<p>' + TEXTO_AGUARDANDO.lider[0] + '</p>'
      + '<p class="passo-dica">' + TEXTO_AGUARDANDO.lider[1] + '</p>'
      + '<div class="acoes"><button class="botao" data-fechar>Entendi</button></div>',
    { rotulo: 'Célula aguardando aprovação', ligar: (folha, fechar) => { folha.querySelector('[data-fechar]').onclick = fechar; } });
  }

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
      + CC.qrDoLink(link)
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
          if (r === 'copiado') CC.avisar('Link copiado');
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
  const ddmm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
  // Dia do ano (1 a 366) de uma data ISO: base para o rodízio de oração, sempre o mesmo para
  // toda a célula no mesmo dia (a pergunta de acolhida da semana mora em estudo-regras.js).
  const diaDoAno = (iso) => Math.floor((Date.parse(iso + 'T12:00:00Z') - Date.parse(iso.slice(0, 4) + '-01-01T12:00:00Z')) / 86400000) + 1;

  function topoDaCelula(p) {
    const conduzo = p.euConduzo;
    const espera = TEXTO_AGUARDANDO[p.aguardandoAprovacao];
    return (espera ? '<div class="recado-lider aviso-aprovacao" role="status"><span class="etiqueta">Aguardando aprovação</span><p><b>' + espera[0] + '</b></p>'
      + '<p class="passo-dica">' + espera[1] + '</p></div>' : '')
      + (p.nasceuDe ? '<div class="recado-lider"><p>Esta célula nasceu da ' + CC.esc(comoCelula(p.nasceuDe.titulo)) + '.</p></div>' : '')
      + (p.multiplicouPara ? '<div class="recado-lider"><p>Nasceu a ' + CC.esc(comoCelula(p.multiplicouPara.titulo)) + ' a partir desta célula.</p></div>' : '')
      + (p.recado
      ? '<div class="recado-lider"><span class="etiqueta">Recado de ' + CC.esc(nomeDoLider(p)) + '</span><p>' + CC.esc(p.recado) + '</p>'
        // Com dia e hora escolhidos pelo líder, o recado vira evento na agenda do celular.
        + (quandoValendo(p) ? '<div class="acoes-missao"><button type="button" class="botao pequeno contorno botao-ir-missao" data-agenda>'
          + CC.ico('calendario') + 'Pôr na agenda · ' + CC.esc(rotuloAgenda(p.recadoQuando)) + '</button></div>' : '')
        + '</div>'
      : '')
      // O dia do encontro mora no cartão "Próximo encontro", no alto: aqui só o aviso de
      // que ainda não há dia marcado.
      + (p.encontro >= 0 || quandoValendo(p) ? '' : '<p class="passo-dica pequena">'
        + (conduzo ? 'Marque o dia do encontro.' : 'Quem conduz a célula ainda não marcou o dia do encontro.') + '</p>')
      // Só quem conduz vê a pessoa a procurar, com o motivo, nunca um placar. As estatísticas
      // (chama, encontros, check-in, caminhada) moram na aba Painel.
      + (conduzo ? blocoAtencao(p) : '');
  }

  // A aba Painel, só de quem conduz: como a célula está, num lugar só.
  function abaPainel(p) {
    if (!p.painel) return CC.esqueleto('lista');
    return cartaoSaude(p, true) + blocoCheckin(p, true) + blocoFunil(p, true);
  }

  function ligarPainel(painel, p) {
    const registrar = painel.querySelector('[data-registrar-encontro]');
    if (registrar) registrar.onclick = () => folhaRegistrarEncontro(p);
  }

  // Um link do WhatsApp com o recado pronto: quem conduz escolhe o grupo da célula.
  const linkZap = (texto) => 'https://wa.me/?text=' + encodeURIComponent(texto);
  const enderecoApp = (rota) => (location.protocol.startsWith('http') ? ' ' + location.origin + location.pathname + rota : '');
  const botaoZap = (texto, rotulo, attr) => '<a class="botao-whatsapp" ' + attr + ' href="' + linkZap(texto) + '" target="_blank" rel="noopener">'
    + CC.ico('balao') + rotulo + '</a>';

  // O painel inteiro da célula, para o administrador que abre qualquer célula (src/sob-demanda/painel-tela.js):
  // o mesmo que o líder dela vê, com a caminhada junto (lá ela mora na aba Pessoas).
  CC.painelDaCelulaHtml = (p) => cartaoSaude(p) + blocoCheckin(p) + blocoFunil(p) + blocoAtencao(p);

  // ---------- o painel de quem conduz (inteligencia.mjs) ----------
  // A chama da célula (com quem está acesa e apagada) e a frequência das últimas 4 semanas
  // (com a presença de cada um), num cartão só, antes de "Precisam de atenção". Vem pronto do
  // servidor, só para quem conduz a célula e para o administrador: os nomes ajudam a agir.
  const nomeLista = (lista) => lista.map((x) => CC.esc(x.nome)).join(', ');
  function quemEstaComo(c) {
    const pessoas = c.pessoas || [];
    if (!pessoas.length) return '';
    const acesas = pessoas.filter((x) => x.acesa).map((x) => ({ nome: x.nome + (x.dias ? ' (' + x.dias + ')' : '') }));
    const apagadas = pessoas.filter((x) => !x.acesa);
    return '<p class="saude-nomes">' + (acesas.length ? '<b>Acesa:</b> ' + nomeLista(acesas) : '')
      + (acesas.length && apagadas.length ? '<br>' : '') + (apagadas.length ? '<b>Apagada:</b> ' + nomeLista(apagadas) : '') + '</p>';
  }
  // Presença de cada pessoa nos encontros do gráfico: linha por pessoa, uma marca por semana.
  function grelhaDePresenca(f) {
    const lista = f.presencas || [];
    if (!lista.length || !f.encontros.length) return '';
    const marca = (v) => (v === null ? '<i class="nulo" aria-label="não conta">·</i>' : v ? '<i class="sim" aria-label="presente">✓</i>' : '<i class="nao" aria-label="faltou">–</i>');
    return '<div class="presencas" style="--n:' + f.encontros.length + '">'
      + '<div class="presencas-linha cabeca"><span>Presença</span>' + f.encontros.map((e) => '<em>' + ddmm(e.data) + '</em>').join('') + '</div>'
      + lista.map((m) => '<div class="presencas-linha"><span>' + CC.esc(m.nome) + (m.papel === 'visitante' ? ' <small>visitante</small>' : '') + '</span>' + m.encontros.map(marca).join('') + '</div>').join('')
      + '</div>';
  }
  function cartaoSaude(p, comAcoes) {
    const s = p.painel;
    if (!s || !s.chama) return '';
    const c = s.chama;
    const f = s.frequencia || { encontros: [] };
    const legenda = c.total
      ? CC.plural(c.acesos, 'pessoa', 'pessoas') + ' de ' + c.total + ' com a chama acesa hoje'
      : 'Nenhuma chama acesa hoje.';
    const maior = Math.max(1, ...f.encontros.map((e) => e.pessoas || 0));
    const barras = f.encontros.length
      ? '<div class="mini-barras" role="img" aria-label="' + CC.esc(f.encontros.map((e) => ddmm(e.data) + ': ' + (e.semEncontro ? 'sem encontro' : CC.plural(e.pessoas, 'pessoa', 'pessoas'))).join(', ')) + '">'
        + f.encontros.map((e) => '<span class="mini-barra' + (e.semEncontro ? ' sem' : '') + '"><small>' + (e.semEncontro ? 'sem' : e.pessoas) + '</small>'
          + '<i style="--v:' + (e.semEncontro ? 0 : Math.max(0.08, e.pessoas / maior).toFixed(3)) + '"></i><em>' + ddmm(e.data) + '</em></span>').join('')
        + '</div>'
      : '<p class="passo-dica pequena">Registre os encontros e a frequência das últimas semanas aparece aqui.</p>'
        + (comAcoes ? '<div class="acoes-missao"><button type="button" class="botao pequeno contorno botao-ir-missao" data-registrar-encontro>'
          + CC.ico('calendario') + 'Registrar o encontro</button></div>' : '');
    const d = f.diferenca;
    const tendencia = f.tendencia === null ? ''
      : f.tendencia === 'estavel' ? 'O mesmo número de pessoas do encontro anterior.'
        : CC.plural(Math.abs(d), 'pessoa', 'pessoas') + (d > 0 ? ' a mais' : ' a menos') + ' que no encontro anterior.';
    const semEncontro = f.encontros.some((e) => e.semEncontro) ? ' Tracejado: semana sem encontro.' : '';
    return '<div class="cartao-saude">'
      + '<div class="saude-chama' + (c.acesos ? ' acesa' : '') + '">' + CC.icoChama(c.acesos ? undefined : 0)
      + '<div><b>' + (c.pct === null ? 'sem membros' : c.pct + '%') + '</b><span>' + CC.esc(legenda) + '</span></div></div>'
      + quemEstaComo(c)
      + '<div class="saude-encontros"><span class="etiqueta">Últimas 4 semanas</span>' + barras
      + (tendencia || semEncontro ? '<p class="passo-dica pequena">' + CC.esc((tendencia + semEncontro).trim()) + '</p>' : '')
      + grelhaDePresenca(f) + '</div>'
      + '</div>';
  }

  // O check-in de Corpo, Mente e Espírito da célula, somado: quantos estão em baixa em cada
  // esfera, nunca quem. É dado de saúde: o de uma pessoa só o discipulador dela vê.
  const ESFERAS_CELULA = { corpo: 'Corpo', mente: 'Mente', espirito: 'Espírito' };
  function blocoCheckin(p, comAcoes) {
    const s = p.painel && p.painel.saude;
    if (!s) return '';
    // Quem conduz não sabe quem fez: só que falta gente. O lembrete vai para o grupo todo.
    const membros = ativos(p).filter((m) => m.papel !== 'visitante').length;
    const lembrar = comAcoes && s.base < membros
      ? '<div class="acoes-missao">' + botaoZap('Oi, gente! Quando der, façam o check-in de hoje no app: na aba Célula, "Fazer meu check-in".' + enderecoApp('#/celula'), 'Lembrar a célula', 'data-lembrar-checkin') + '</div>'
      : '';
    if (!s.suficiente) {
      return CC.tituloSecao('Como a célula está')
        + '<p class="passo-dica pequena">' + (s.base ? CC.plural(s.base, 'pessoa fez', 'pessoas fizeram') + ' o check-in nesta semana; a soma aparece a partir de ' + s.minimo + '.' : 'Ninguém fez o check-in de Corpo, Mente e Espírito nesta semana.')
        + '</p>' + lembrar;
    }
    return CC.tituloSecao('Como a célula está')
      + '<div class="funil-celula">' + Object.keys(ESFERAS_CELULA).map((k) => {
        const n = s.esferas[k].n.baixa;
        return '<div class="funil-linha"><span>' + ESFERAS_CELULA[k] + ' em baixa</span>'
          + '<span class="painel-trilho" aria-hidden="true"><i style="width:' + Math.round((n / s.base) * 100) + '%"></i></span><b>' + n + '</b></div>';
      }).join('')
      + '<p class="passo-dica pequena">Do último check-in de cada um nesta semana (' + CC.plural(s.base, 'pessoa', 'pessoas') + ').</p>' + lembrar + '</div>';
  }

  // O funil da caminhada, na aba Pessoas de quem conduz: onde as pessoas da célula estão, pelo
  // que cada uma marcou em Minha caminhada e por quem já acompanha alguém, com os nomes de
  // cada etapa, para saber por onde cuidar.
  function blocoFunil(p, comAcoes) {
    const etapas = (p.painel && p.painel.funil) || [];
    const total = etapas.reduce((s, e) => s + e.pessoas, 0);
    if (!total) return '';
    const maior = Math.max(1, ...etapas.map((e) => e.pessoas));
    const comeco = etapas.find((e) => e.etapa === 'comecando') || {};
    const nota = [
      comeco.conhecendo ? CC.plural(comeco.conhecendo, 'pessoa ainda conhecendo Jesus', 'pessoas ainda conhecendo Jesus') : '',
      comeco.passosConcluidos ? CC.plural(comeco.passosConcluidos, 'já concluiu os Primeiros passos', 'já concluíram os Primeiros passos') : '',
    ].filter(Boolean).join(' · ');
    return CC.tituloSecao('Caminhada da célula')
      + '<div class="funil-celula">' + etapas.map((e) => '<div class="funil-linha"><span>' + CC.esc(e.rotulo) + '</span>'
        + '<span class="painel-trilho" aria-hidden="true"><i style="width:' + Math.round((e.pessoas / maior) * 100) + '%"></i></span><b>' + e.pessoas + '</b></div>'
        + (e.nomes && e.nomes.length ? '<p class="funil-nomes">' + nomeLista(e.nomes) + '</p>' : '')).join('')
      + '<p class="passo-dica pequena">' + (nota ? CC.esc(nota) + '. ' : '') + 'Pelo que cada um marcou em Minha caminhada.</p>'
      // Quem ainda não marcou nada não sabe onde marcar: o líder manda o caminho no grupo.
      + (comAcoes && comeco.pessoas ? '<div class="acoes-missao">' + botaoZap('Oi, gente! Quem puder, marque no app o que já aconteceu na sua caminhada: decisão, batismo, célula. Fica em Minha caminhada, no Discipulado. Ajuda a gente a cuidar melhor de cada um.' + enderecoApp('#/perfil/discipulado'), 'Pedir para a célula marcar', 'data-pedir-caminhada') + '</div>' : '')
      + '</div>';
  }

  // Quem precisa de atenção: a conta vem pronta do servidor (propositos.mjs), sempre sem
  // quem conduz e sem visitante. "Dar um toque" só aparece para quem é amigo.
  function blocoAtencao(p) {
    const lista = p.atencao || [];
    const amigos = ((CC.amigosEmCache() || {}).amigos || []).map((a) => a.usuario);
    // Pedidos de conversa de quem é desta célula e avisou quem conduz (os mesmos do Juntos).
    const daqui = new Set((p.membros || []).filter((m) => m.estado === 'ativo').map((m) => m.usuario));
    const pedidos = (CC.pedidosDeConversa ? CC.pedidosDeConversa() : []).filter((x) => daqui.has(x.usuario));
    return (pedidos.length && CC.blocoPedidosConversa ? CC.blocoPedidosConversa(pedidos) : '')
      + CC.tituloSecao('Precisam de atenção')
      + (lista.length
        ? '<div class="lista-pedidos lista-atencao">' + lista.map((m) => '<div class="linha-amigo linha-atencao">' + retrato(m)
          + '<div class="quem-amigo"><b>' + CC.esc(m.nome) + '</b><span class="arroba">' + CC.esc(m.motivo) + '</span>'
          // O cuidado fora do app: abre o WhatsApp já com uma mensagem, para quem conduz
          // escolher o contato da pessoa.
          + '<div class="acoes-atencao"><a class="botao-whatsapp" href="https://wa.me/?text=' + encodeURIComponent(recadoDeCuidado(p, m))
          + '" target="_blank" rel="noopener">' + CC.ico('balao') + 'Chamar no WhatsApp</a>'
          + (amigos.includes(m.usuario) ? '<button class="botao plano pequeno" data-toque="' + CC.esc(m.usuario) + '" data-nome="' + CC.esc(m.nome) + '">Dar um toque</button>' : '')
          + '</div></div></div>').join('') + '</div>'
        : '<p class="passo-dica pequena">Ninguém precisa de atenção agora.</p>');
  }

  // A mensagem pronta do WhatsApp, pelo primeiro gatilho: falta no encontro, uma ofensiva longa
  // que parou há pouco, ou dias sem ler. Sem cobrança: é um convite para voltar.
  function recadoDeCuidado(p, m) {
    const nome = String(m.nome || '').split(' ')[0];
    const tipo = (m.gatilhos && m.gatilhos[0] && m.gatilhos[0].tipo) || (/faltou/.test(m.motivo || '') ? 'faltou' : 'semLer');
    // quem faltou: a mesma mensagem da folha "Quem não veio", com o estudo do último encontro
    if (tipo === 'faltou') return CC.recadoFaltou({ nome, celula: p.titulo, quando: '', estudo: p.ultimoEncontro && p.ultimoEncontro.estudo });
    if (tipo === 'ofensiva') return 'Oi, ' + nome + '! Vi que a sua sequência de leitura parou, depois de tantos dias seguidos. Está tudo bem por aí? Se quiser, recomeçamos juntos.';
    return 'Oi, ' + nome + '! Passando para saber como você está. Que tal voltar a ler junto com a gente?';
  }

  CC.recadoDeCuidado = recadoDeCuidado;

  // A mensagem pronta para quem faltou ao encontro (docs/a-mesa-fase2.md, 5.3), que quem conduz
  // manda, se quiser, pelo próprio WhatsApp: o app não avisa ninguém. Cita o estudo pela
  // referência, nunca pelo texto bíblico. nome: o primeiro nome; celula: o título; quando:
  // 'de hoje', 'de ontem', 'de quinta' ou ''; estudo: { tipo, titulo, refs } ou null.
  CC.recadoFaltou = function ({ nome, celula, quando, estudo } = {}) {
    const daCelula = /^c[ée]lula(\s|$)/i.test(celula || '') ? celula : 'célula';
    let texto = 'Oi, ' + String(nome || '').split(' ')[0] + '! Sentimos sua falta no encontro ' + (quando || 'da ' + daCelula) + '.';
    const e = estudo || null;
    const r = e && (e.refs || [])[0] ? CC.lerRefLivre(e.refs[0]) : null;
    const capitulo = r ? r.livro + ' ' + r.cap : '';
    const fala = !e ? '' : e.tipo === 'semana' ? 'a leitura da semana do plano'
      : e.tipo === 'trecho' ? e.titulo || (e.refs || [])[0] || ''
      : e.titulo ? '\u201c' + e.titulo + '\u201d' + (capitulo ? ', em ' + capitulo : '') : capitulo;
    if (fala) texto += ' Estudamos ' + fala + '. O estudo está na aba Estudo da célula, no app, se você quiser ler.';
    return texto + ' Está tudo bem com você? Posso orar por alguma coisa?';
  };
  // "de hoje", "de ontem", "de quinta" (até 6 dias) ou "de 11/10", pelo dia do encontro.
  const quandoFoi = (data) => {
    const hoje = CC.hojeIso();
    if (data === hoje) return 'de hoje';
    if (data === CC.somaDias(hoje, -1)) return 'de ontem';
    for (let i = 2; i <= 6; i++) if (data === CC.somaDias(hoje, -i)) return 'de ' + DIAS_ENCONTRO[new Date(data + 'T12:00:00').getDay()];
    return 'de ' + ddmm(data);
  };

  // Membros ativos que conduzem a célula (líder ou auxiliar): nunca entram no rodízio de
  // oração nem em "quem precisa de atenção".
  const conduzCelula = (p, m) => m.usuario === p.criadoPor || m.papel === 'auxiliar';

  // Rodízio diário de oração de quem conduz: 2 nomes (3 numa célula grande), sempre os
  // mesmos para todo mundo no mesmo dia. Função pura, testada em teste.mjs.
  CC.oreHojePor = function (candidatos, referencia, totalMembrosAtivos) {
    const nomes = candidatos.slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    const total = nomes.length;
    if (!total) return [];
    const quantidade = Math.min(total, (totalMembrosAtivos || total) > 12 ? 3 : 2);
    const inicio = (diaDoAno(referencia) * quantidade) % total;
    return Array.from({ length: quantidade }, (_, i) => nomes[(inicio + i) % total]);
  };

  // Uma linha por pessoa do rodízio, com "Orei" (anota no diário de hoje e some até amanhã)
  // e "Mandar uma mensagem" (o WhatsApp com o recado pronto, como o de quem sumiu).
  function oreHojePorHtml(p) {
    const candidatos = ativos(p).filter((m) => m.papel !== 'visitante' && !conduzCelula(p, m)).map((m) => ({ usuario: m.usuario, nome: m.nome }));
    if (!candidatos.length) return '';
    const totalMembrosAtivos = ativos(p).filter((m) => m.papel !== 'visitante').length;
    const diario = CC.diaDoDiario ? CC.diaDoDiario() : {};
    const hoje = CC.oreHojePor(candidatos, CC.hojeIso(), totalMembrosAtivos).filter((m) => !diario['orei_' + m.usuario]);
    if (!hoje.length) return '';
    return '<div class="lista-pedidos lista-atencao lista-ore-hoje">' + hoje.map((c) => {
      const m = p.membros.find((x) => x.usuario === c.usuario) || c;
      const nome = String(c.nome || '').split(' ')[0];
      return '<div class="linha-amigo linha-atencao" data-ore-hoje="' + CC.esc(c.usuario) + '">' + retrato(m)
        + '<div class="quem-amigo"><b>Ore hoje por ' + CC.esc(c.nome) + '</b><span class="arroba">Rodízio de oração de quem conduz</span></div>'
        + '<div class="acoes-missao acoes-linha"><button type="button" class="botao pequeno contorno botao-ir-missao" data-orei="' + CC.esc(c.usuario) + '">' + CC.ico('certo') + 'Orei</button>'
        + botaoZap('Oi, ' + nome + '! Hoje eu orei por você. Tem alguma coisa que você quer que eu leve a Deus?', 'Mandar uma mensagem', 'data-mensagem-oracao="' + CC.esc(c.usuario) + '"')
        + '</div></div>';
    }).join('') + '</div>';
  }

  // ---------- o que todo membro faz na aba Hoje ----------
  // O check-in de Corpo, Mente e Espírito: some quando o de hoje já foi feito.
  function blocoCheckinHoje() {
    if (!CC.abrirCheckin || !CC.checkinFeitoHoje || CC.checkinFeitoHoje()) return '';
    return '<div class="bloco-acao bloco-checkin"><h3>Como você está hoje?</h3>'
      + '<p class="passo-dica pequena">Corpo, mente e espírito.</p>'
      + '<div class="acoes-missao"><button type="button" class="botao pequeno" data-checkin>Fazer meu check-in</button></div></div>';
  }
  // Minha caminhada: o atalho fica até a pessoa marcar alguma coisa.
  function blocoCaminhadaHoje() {
    const marcos = CC.meusMarcos ? CC.meusMarcos() : null;
    if (!marcos || Object.values(marcos).some(Boolean)) return '';
    return '<div class="bloco-acao bloco-caminhada"><h3>Sua caminhada</h3>'
      + '<p class="passo-dica pequena">Batismo, decisão, célula: marque o que já aconteceu com você.</p>'
      + '<div class="acoes-missao"><a class="botao pequeno contorno botao-ir-missao" href="#/perfil/discipulado" data-marcar-caminhada>Marcar minha caminhada' + CC.ico('avancar') + '</a></div></div>';
  }

  // A leitura da semana da célula (os 7 dias do plano até onde o líder leu): abre o primeiro
  // dia dela que eu ainda não li; com tudo lido, ou no Conhecer Jesus, a Trilha.
  function leituraDaSemana(p) {
    if (!CC.D || !CC.D.plano || !CC.leu || (CC.quem && CC.quem.caminho === 'conhecer')) return '#/';
    const ate = Math.min(CC.D.plano.length, Math.max(7, p.semanaAte || 7));
    for (let n = ate - 6; n <= ate; n++) if (!CC.leu(n)) return '#/dia/' + n;
    return '#/';
  }

  // ---------- o próximo encontro e a agenda (recado com dia e hora) ----------
  const DIA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const DIA_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const partesQuando = (q) => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(q || '')); return m ? m.slice(1).map(Number) : null; };
  const horaCurta = (h, mi) => h + 'h' + (mi ? String(mi).padStart(2, '0') : '');
  const diaDaSemana = (a, m, d) => new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay();
  // O dia e a hora do recado valem até 2 horas depois do começo (o encontro pode estar rolando).
  function quandoValendo(p) {
    const x = partesQuando(p.recadoQuando);
    if (!x || !p.recado) return false;
    const [a, m, d, h, mi] = x;
    return new Date(a, m - 1, d, h, mi).getTime() > Date.now() - 2 * 3600 * 1000;
  }
  // "qui, 9/10, 20h"
  function rotuloAgenda(q) {
    const [a, m, d, h, mi] = partesQuando(q);
    return DIA_CURTO[diaDaSemana(a, m, d)] + ', ' + d + '/' + m + ', ' + horaCurta(h, mi);
  }
  CC.rotuloAgenda = rotuloAgenda;

  // O próximo encontro: o dia e a hora do recado quando houver; senão, o próximo dia da semana
  // marcado (hoje inclusive). { iso, hora } ou null.
  function proximoEncontro(p) {
    if (quandoValendo(p)) {
      const [a, m, d, h, mi] = partesQuando(p.recadoQuando);
      return { iso: a + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'), hora: horaCurta(h, mi) };
    }
    if (!(p.encontro >= 0)) return null;
    const hoje = CC.hojeIso();
    for (let i = 0; i < 7; i++) {
      const dia = CC.somaDias(hoje, i);
      if (new Date(dia + 'T12:00:00').getDay() === p.encontro) return { iso: dia, hora: '' };
    }
    return null;
  }
  // O cartão do alto. Sem dia marcado, não aparece (o aviso de marcar o dia fica na aba Hoje).
  function cartaoProximoEncontro(p) {
    const x = proximoEncontro(p);
    if (!x) return '';
    const texto = (x.iso === CC.hojeIso() ? 'Hoje' : DIA_LONGO[new Date(x.iso + 'T12:00:00').getDay()] + ', ' + Number(x.iso.slice(8, 10)) + '/' + Number(x.iso.slice(5, 7)))
      + (x.hora ? ', às ' + x.hora : '');
    return '<div class="cartao-encontro"><span class="textos"><b>Próximo encontro</b><span>' + CC.esc(texto) + '</span></span>' + CC.ico('calendario') + '</div>';
  }
  // "quinta, 22/10": a linha do estudo ("Para o encontro de quinta, 22/10") e o texto do grupo.
  const dataDoProximo = (p) => { const x = proximoEncontro(p); return x ? DIAS_ENCONTRO[new Date(x.iso + 'T12:00:00').getDay()] + ', ' + ddmm(x.iso) : ''; };

  // O evento para a agenda do celular (.ics): hora local, sem fuso (o encontro é na cidade de
  // quem lê), duas horas de duração e um lembrete 1 hora antes. Função pura, testada no navegador.
  const escIcs = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  CC.icsDoEncontro = function (p, agora = new Date()) {
    const x = partesQuando(p.recadoQuando);
    if (!x) return '';
    const [a, m, d, h, mi] = x;
    const fmt = (dt) => dt.getUTCFullYear() + String(dt.getUTCMonth() + 1).padStart(2, '0') + String(dt.getUTCDate()).padStart(2, '0')
      + 'T' + String(dt.getUTCHours()).padStart(2, '0') + String(dt.getUTCMinutes()).padStart(2, '0') + '00';
    // As contas de data em UTC só como calendário: o resultado sai sem "Z" (hora local).
    const inicio = new Date(Date.UTC(a, m - 1, d, h, mi));
    const fim = new Date(inicio.getTime() + 2 * 3600 * 1000);
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Geracao Eleita//Celula//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + p.id + '-' + fmt(inicio) + '@geracaoeleita',
      'DTSTAMP:' + fmt(agora) + 'Z',
      'DTSTART:' + fmt(inicio),
      'DTEND:' + fmt(fim),
      'SUMMARY:' + escIcs('Encontro da ' + comoCelula(p.titulo)),
      'DESCRIPTION:' + escIcs(p.recado),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT1H', 'DESCRIPTION:' + escIcs('Encontro da ' + comoCelula(p.titulo) + ' em 1 hora'), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR', '',
    ].join('\r\n');
  };
  // Baixa o .ics por um link de download (funciona no PWA): o celular oferece pôr na agenda.
  function baixarAgenda(p) {
    const ics = CC.icsDoEncontro(p);
    if (!ics) return;
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'encontro-da-celula.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  // A data do último encontro (hoje ou um dos 6 dias anteriores) no dia da semana marcado.
  function dataDoEncontro(p, hoje) {
    if (!(p.encontro >= 0)) return null;
    for (let i = 0; i <= 6; i++) {
      const d = CC.somaDias(hoje, -i);
      if (new Date(d + 'T12:00:00').getDay() === p.encontro) return d;
    }
    return null;
  }

  // Botão (ou selo) de registrar o encontro: só aparece com dia de encontro marcado.
  function blocoEncontro(p) {
    const hoje = CC.hojeIso();
    const alvo = dataDoEncontro(p, hoje);
    if (!alvo) return '';
    if (p.ultimoEncontro && p.ultimoEncontro.data === alvo && p.ultimoEncontro.semEncontro) {
      return '<div class="registro-encontro"><span class="selo-status">' + CC.ico('calendario')
        + 'Sem encontro em ' + ddmm(alvo) + '</span>'
        + '<button class="botao plano pequeno" data-corrigir-encontro>Corrigir</button></div>';
    }
    if (p.ultimoEncontro && p.ultimoEncontro.data === alvo) {
      const total = p.ultimoEncontro.presentes + p.ultimoEncontro.visitantes;
      return '<div class="registro-encontro"><span class="selo-status leu">' + CC.ico('certo')
        + 'Encontro de ' + ddmm(alvo) + ' registrado · ' + CC.plural(total, 'pessoa', 'pessoas') + '</span>'
        + '<button class="botao plano pequeno" data-corrigir-encontro>Corrigir</button></div>';
    }
    return '<button class="botao contorno" data-registrar-encontro>' + CC.ico('calendario') + 'Registrar o encontro</button>';
  }

  function folhaRecado(p) {
    const max = 280;
    const quandoAtual = quandoValendo(p) ? p.recadoQuando : '';
    CC.folha('<h2>Recado para a célula</h2>'
      + '<p class="passo-dica">Aparece no alto da célula para todos: um lembrete do encontro, um pedido de oração, uma palavra de ânimo.</p>'
      + '<label class="campo-senha"><span>Recado</span><textarea data-texto name="recado-da-celula" maxlength="' + max + '" rows="4" autocomplete="off">' + CC.esc(p.recado || '') + '</textarea></label>'
      + '<p class="passo-dica pequena" data-conta></p>'
      // Dia e hora à parte (opcionais): é o que deixa a célula pôr o encontro na agenda.
      + '<div class="campos-quando"><label class="campo-senha"><span>Dia do encontro</span><input type="date" data-quando-dia min="' + CC.hojeIso() + '" value="' + CC.esc(quandoAtual.slice(0, 10)) + '"></label>'
      + '<label class="campo-senha"><span>Hora</span><input type="time" data-quando-hora step="900" value="' + CC.esc(quandoAtual.slice(11, 16)) + '"></label></div>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao" data-salvar>Publicar recado</button>'
      + (p.recado ? '<button class="botao plano perigo" data-apagar>Apagar o recado</button>' : '')
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Recado para a célula',
      ligar: (folha, fechar) => {
        const campo = folha.querySelector('[data-texto]');
        const conta = () => { folha.querySelector('[data-conta]').textContent = CC.pertoDoLimite(campo.value.length, max) ? campo.value.length + ' de ' + max + ' caracteres' : ''; };
        campo.oninput = conta;
        conta();
        folha.querySelector('[data-fechar]').onclick = fechar;
        const erro = folha.querySelector('.erro-proposito');
        const enviar = async (texto, quando = '') => {
          try {
            await CC.api('api/celula', { acao: 'recado', id: p.id, texto, quando });
            fechar();
            CC.avisar(texto ? 'Recado publicado' : 'Recado apagado');
            recarregar();
          } catch (e) {
            erro.textContent = e.message;
            erro.hidden = false;
          }
        };
        folha.querySelector('[data-salvar]').onclick = () => {
          const dia = folha.querySelector('[data-quando-dia]').value;
          const hora = folha.querySelector('[data-quando-hora]').value;
          erro.hidden = true;
          if (dia && !hora) { erro.textContent = 'Escolha a hora do encontro também.'; erro.hidden = false; return; }
          if (hora && !dia) { erro.textContent = 'Escolha o dia do encontro também.'; erro.hidden = false; return; }
          if (dia && dia < CC.hojeIso()) { erro.textContent = 'Escolha um dia de hoje em diante.'; erro.hidden = false; return; }
          enviar(campo.value, dia && hora ? dia + 'T' + hora.slice(0, 5) : '');
        };
        const apagar = folha.querySelector('[data-apagar]');
        if (apagar) apagar.onclick = async () => {
          if (!await CC.confirmar({ titulo: 'Apagar o recado?', texto: 'Ele some do alto da célula para todo mundo.', acao: 'Apagar', perigo: true })) return;
          enviar('');
        };
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

  // Últimos 8 dias (hoje e os 7 anteriores): a folha deixa trocar entre eles.
  function opcoesDataEncontro(hoje) {
    return Array.from({ length: 8 }, (_, i) => CC.somaDias(hoje, -i));
  }

  // O estudo de cada encontro (docs/a-mesa-fase2.md, 4.7): a folha já traz escolhido o estudo
  // daquele dia, e quem conduz troca quando registra um encontro de dias atrás. Os estudos e os 8
  // dias vêm do servidor (p.registro, só para quem conduz). Na leitura da semana o título vem vazio.
  const tituloDoEstudo = (e) => (e.tipo === 'semana' ? 'A leitura da semana' : e.titulo || (e.refs || [])[0] || 'Estudo do encontro');
  const NENHUM_ESTUDO = 'Outro estudo, fora do app';
  // A mensagem do servidor com a maiúscula e o ponto da tela.
  const comoFrase = (m) => CC.frase(m);

  // opcoes.estudo: o estudo que o modo encontro acabou de usar.
  function folhaRegistrarEncontro(p, opcoes = {}) {
    const hoje = CC.hojeIso();
    const alvo = dataDoEncontro(p, hoje) || hoje;
    const reg = p.registro || null;
    const estudosReg = ((reg && reg.estudos) || []).slice().sort((a, b) => (a.em < b.em ? 1 : a.em > b.em ? -1 : 0));
    const diaDoReg = (d) => ((reg && reg.dias) || []).find((x) => x.data === d) || null;
    // os estudos preparados até a data (o preparado depois não foi usado nela)
    const estudosAte = (d) => estudosReg.filter((e) => !e.dia || e.dia <= d);
    const vale = (x, d) => x === '-' || estudosAte(d).some((e) => e.id === x);
    const escolhaDe = (d) => {
      const r = diaDoReg(d);
      const ordem = [d === alvo ? opcoes.estudo : '', r && r.estudo, r && r.padrao, p.estudo && p.estudo.id];
      return ordem.find((x) => x && vale(x, d)) || '-';
    };
    const visitantesDe = (d) => { const r = diaDoReg(d); return r ? Number(r.visitantes) || 0 : (p.ultimoEncontro && p.ultimoEncontro.data === d ? p.ultimoEncontro.visitantes : 0); };
    const nomeDoEscolhido = (x) => { const e = estudosReg.find((y) => y.id === x); return e ? tituloDoEstudo(e) : NENHUM_ESTUDO; };
    const opcoesEstudo = (d, escolhido) => estudosAte(d).map((e) => '<label class="opcao-estudo"><input type="radio" name="estudo-registro" value="' + CC.esc(e.id) + '"' + (e.id === escolhido ? ' checked' : '') + '>'
      + '<span><b>' + CC.esc(tituloDoEstudo(e)) + '</b>' + (e.dia ? '<small>Preparado em ' + ddmm(e.dia) + '</small>' : '') + '</span></label>').join('')
      + '<label class="opcao-estudo"><input type="radio" name="estudo-registro" value="-"' + (escolhido === '-' ? ' checked' : '') + '><span><b>' + NENHUM_ESTUDO + '</b></span></label>';
    const datas = opcoesDataEncontro(hoje);
    const gente = p.membros.filter((m) => m.estado === 'ativo');
    const rotuloData = (d) => (d === hoje ? 'Hoje' : d === CC.somaDias(hoje, -1) ? 'Ontem' : ddmm(d));
    // A data em destaque é a do encontro desta semana; as outras ficam atrás de "Outra data".
    const doEncontro = dataDoEncontro(p, hoje);
    const nomeData = (d) => (d === hoje ? 'Hoje' : d === CC.somaDias(hoje, -1) ? 'Ontem' : DIA_LONGO[new Date(d + 'T12:00:00').getDay()])
      + ', ' + Number(d.slice(8, 10)) + '/' + Number(d.slice(5, 7));
    const realce = (d) => '<b>' + nomeData(d) + '</b>' + (d === doEncontro ? ' <span>· o encontro desta semana</span>' : '');
    CC.folha('<h2>Quem foi ao encontro?</h2>'
      + '<div class="data-encontro-realce realce" data-realce-data>' + realce(alvo) + '</div>'
      + '<button type="button" class="botao contorno pequeno" data-outra-data aria-expanded="false">' + CC.ico('calendario') + 'Outra data</button>'
      + '<div class="escolha-dia" role="group" aria-label="Dia do encontro" data-outras-datas hidden>' + datas.map((d) => '<button type="button" class="botao '
        + (d === alvo ? 'azul' : 'contorno') + ' pequeno" data-data="' + d + '" aria-pressed="' + (d === alvo) + '">' + rotuloData(d) + '</button>').join('') + '</div>'
      // sem nenhum estudo na célula, o bloco não aparece e o registro vai sem o campo
      + (estudosReg.length ? '<div class="estudo-do-registro"><span class="etiqueta">Estudo deste encontro</span><b data-estudo-escolhido></b>'
        + '<button type="button" class="botao plano pequeno" data-trocar-estudo aria-expanded="false">Trocar</button></div>'
        + '<div class="escolha-estudo" role="radiogroup" aria-label="Estudo deste encontro" data-opcoes-estudo hidden></div>' : '')
      + '<div class="escolha-amigos">' + gente.map((m) => '<label class="linha-amigo escolha-amigo">'
        + '<input type="checkbox" value="' + CC.esc(m.usuario) + '"' + (m.usuario === euUsuario() ? ' checked' : '') + '>' + retrato(m)
        + '<span class="quem-amigo"><b>' + CC.esc(nomeCurto(m)) + (m.papel === 'visitante' ? ' <small class="selo-lider">visitante</small>' : '') + '</b></span></label>').join('') + '</div>'
      + '<div class="conta-visitantes"><span>Pessoas sem conta que vieram</span><div class="conta-visitantes-controles">'
      + '<button type="button" class="botao-icone" data-visitantes-menos aria-label="Diminuir">−</button>'
      + '<b data-visitantes-valor>0</b>'
      + '<button type="button" class="botao-icone" data-visitantes-mais aria-label="Aumentar">+</button></div></div>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao" data-salvar>Salvar</button>'
      // Feriado ou imprevisto: a semana fica registrada sem encontro e ninguém conta como falta.
      + '<button class="botao contorno" data-sem-encontro>Não houve encontro nesta semana</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Quem foi ao encontro',
      rolavel: true,
      ligar: (folha, fechar) => {
        let dataEscolhida = alvo;
        let n = visitantesDe(alvo);
        const valor = folha.querySelector('[data-visitantes-valor]');
        valor.textContent = n;
        // o estudo escolhido: refeito ao trocar a data, a não ser que a pessoa já tenha escolhido
        let estudoEscolhido = escolhaDe(alvo);
        let escolheuEstudo = false;
        const caixaEstudos = folha.querySelector('[data-opcoes-estudo]');
        const trocar = folha.querySelector('[data-trocar-estudo]');
        const pintarEstudo = () => {
          if (!caixaEstudos) return;
          folha.querySelector('[data-estudo-escolhido]').textContent = nomeDoEscolhido(estudoEscolhido);
          caixaEstudos.innerHTML = opcoesEstudo(dataEscolhida, estudoEscolhido);
          caixaEstudos.querySelectorAll('input').forEach((i) => {
            i.onchange = () => { estudoEscolhido = i.value; escolheuEstudo = true; folha.querySelector('[data-estudo-escolhido]').textContent = nomeDoEscolhido(estudoEscolhido); };
          });
        };
        pintarEstudo();
        if (trocar) trocar.onclick = () => {
          const abrir = caixaEstudos.hidden;
          caixaEstudos.hidden = !abrir;
          trocar.setAttribute('aria-expanded', String(abrir));
        };
        const outra = folha.querySelector('[data-outra-data]');
        const outras = folha.querySelector('[data-outras-datas]');
        outra.onclick = () => {
          const abrir = outras.hidden;
          outras.hidden = !abrir;
          outra.setAttribute('aria-expanded', String(abrir));
        };
        folha.querySelectorAll('[data-data]').forEach((b) => {
          b.onclick = () => {
            dataEscolhida = b.dataset.data;
            folha.querySelector('[data-realce-data]').innerHTML = realce(dataEscolhida);
            folha.querySelectorAll('[data-data]').forEach((x) => {
              const sel = x === b;
              x.classList.toggle('azul', sel);
              x.classList.toggle('contorno', !sel);
              x.setAttribute('aria-pressed', String(sel));
            });
            n = visitantesDe(dataEscolhida);
            valor.textContent = n;
            if (!escolheuEstudo || !vale(estudoEscolhido, dataEscolhida)) estudoEscolhido = escolhaDe(dataEscolhida);
            pintarEstudo();
          };
        });
        folha.querySelector('[data-visitantes-menos]').onclick = () => { n = Math.max(0, n - 1); valor.textContent = n; };
        folha.querySelector('[data-visitantes-mais]').onclick = () => { n = Math.min(30, n + 1); valor.textContent = n; };
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-sem-encontro]').onclick = async () => {
          const botao = folha.querySelector('[data-sem-encontro]');
          botao.disabled = true;
          try {
            await CC.api('api/celula', { acao: 'registrarEncontro', id: p.id, data: dataEscolhida, semEncontro: true, presentes: [], visitantes: 0 });
            fechar();
            CC.avisar('Semana registrada sem encontro');
            // a lista e a leitura dos anteriores mudam (a data e a presença daquele dia)
            if (CC.estudoCelula && CC.estudoCelula.esquecer) CC.estudoCelula.esquecer(p.id);
            recarregar();
          } catch (e) {
            botao.disabled = false;
            const erro = folha.querySelector('.erro-proposito');
            erro.textContent = e.message || 'Não deu certo agora. Tente de novo.';
            erro.hidden = false;
          }
        };
        folha.querySelector('[data-salvar]').onclick = async () => {
          const botao = folha.querySelector('[data-salvar]');
          botao.disabled = true;
          const presentes = [...folha.querySelectorAll('.escolha-amigo input:checked')].map((i) => i.value);
          let r;
          try {
            r = await CC.api('api/celula', Object.assign({ acao: 'registrarEncontro', id: p.id, data: dataEscolhida, presentes, visitantes: n }, caixaEstudos ? { estudo: estudoEscolhido } : {}));
          } catch (e) {
            botao.disabled = false;
            const erro = folha.querySelector('.erro-proposito');
            erro.textContent = comoFrase(e.message);
            erro.hidden = false;
            return;
          }
          fechar();
          // depois do encontro, o próximo da fila entra na célula (docs/a-mesa-fila.md, 3.6)
          CC.avisar(r && r.promovido ? 'Encontro registrado. O próximo estudo já está na aba Estudo.' : 'Encontro registrado');
          if (CC.estudoCelula && CC.estudoCelula.esquecer) CC.estudoCelula.esquecer(p.id);
          // quem não veio, com a mensagem pronta: quem conduz decide se manda (o app não avisa ninguém)
          const faltaram = (r && r.faltaram) || [];
          if (faltaram.length) pedirEstudo(false).then(() => CC.estudoCelula.paraQuemFaltou(p, { data: dataEscolhida, faltaram, estudo: r.estudo || null }), () => {});
          recarregar();
        };
      },
    });
  }

  // O que as peças do estudo (src/sob-demanda/estudo-celula.js e estudo-preparo.js) usam daqui.
  const apoio = {
    registrarEncontro: (p, opcoes) => folhaRegistrarEncontro(p, opcoes),
    quandoFoi,
    comoCelula,
    tituloDoEstudo,
    recarregar: () => recarregar(),
    // só o retrato novo, sem redesenhar: quem chama troca o endereço logo depois
    carregar: () => CC.carregarPropositos(),
    endereco: enderecoCelula,
    dataDoEncontro: dataDoProximo,
    nomeDoLider,
  };
  CC.apoioCelula = apoio;
  // O estudo do encontro abre na aba Estudo da célula; o modo encontro, na peça.
  CC.estudoDoEncontro = (p) => { location.hash = enderecoCelula(p.id, 'estudo'); };
  CC.modoEncontro = (p) => (p && p.estudo ? pedirEstudo(false).then(() => CC.estudoCelula.modoEncontro(p, apoio), () => CC.avisar('Não consegui abrir o modo encontro agora.')) : null);

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
      // Quem só quer conhecer entra como visitante: não ocupa vaga de membro, não conta na
      // meta e pode virar membro de verdade depois, na aba Hoje.
      + '<div class="acoes">' + (dentro ? '' : '<button class="botao" data-entrar' + (info.vagas > 0 ? '' : ' disabled') + '>Entrar na célula</button>'
        + '<button class="botao contorno" data-visitante>Só quero conhecer</button>')
      + '<button class="botao plano" data-fechar>' + (dentro ? 'Fechar' : 'Agora não') + '</button></div>',
    {
      rotulo: 'Célula',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const entrarComo = (visitante) => async () => {
          const botao = folha.querySelector(visitante ? '[data-visitante]' : '[data-entrar]');
          botao.disabled = true;
          try {
            const r = await CC.api('api/celula', { acao: 'entrar', token, visitante });
            fechar();
            CC.avisar(r.ja ? 'Você já está nessa célula' : 'Que bom ter você na ' + comoCelula(r.titulo) + '!');
            irParaCelula(r.id);
          } catch (e) {
            botao.disabled = false;
            folha.querySelector('#recado').textContent = e.message;
          }
        };
        const entrar = folha.querySelector('[data-entrar]');
        if (entrar) entrar.onclick = entrarComo(false);
        const visitante = folha.querySelector('[data-visitante]');
        if (visitante) visitante.onclick = entrarComo(true);
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
      + '<label class="campo-senha" data-bloco-nome hidden><span>Nome do grupo ' + CC.contagem('', TITULO_GRUPO_MAX) + '</span><input data-titulo name="nome-do-grupo" maxlength="' + TITULO_GRUPO_MAX + '" placeholder="Ex.: Amigos da escola" autocomplete="off" autocapitalize="sentences" enterkeyhint="done"></label>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao" data-criar disabled>Chamar para o propósito</button>'
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

  // ---------- oração e ajuda: aba "Oração" da célula (Atos 2.42; 2.44-45) ----------
  // Sem chat: o pedido é só do autor, os outros só reagem com um gesto sem texto. Nada disto
  // vai para o Feed, nada vale XP. As regras (quem vê, limites, denúncia) já moram no servidor
  // (cuidado.mjs / contas.mjs); aqui só desenha e liga os botões.
  let cuidadoCache = {}; // por id de célula
  const MOTIVO_PERIGO = 'Alguém pode estar em perigo';
  // Texto fixo da seção 5 da spec: mostrado inteiro assim que alguém denuncia por perigo.
  const AJUDA_PERIGO_DENUNCIA = 'Se você ou alguém está em perigo, se machucando ou pensando em se machucar, '
    + 'não espere: fale agora com um adulto de confiança ou ligue 188 (CVV), a qualquer hora. Se for abuso ou violência, ligue 100. Em emergência, 192 (SAMU) ou 190 (Polícia).';
  // Para quem conduz, junto da denúncia de perigo (seção 5).
  const AJUDA_PERIGO_CONDUZ = 'Procure a pessoa hoje e avise o pastor ou um responsável da igreja. '
    + 'Se for abuso ou violência, ligue 100. Em emergência, 192 (SAMU) ou 190 (Polícia). Não tente resolver isso sem ajuda.';

  const carregarCuidado = (celulaId) => CC.api('api/cuidado?celula=' + encodeURIComponent(celulaId))
    .then((d) => { cuidadoCache[celulaId] = d; return d; }).catch(() => null);

  function cartaoPedido(item) {
    const necessidade = item.tipo === 'necessidade';
    const quem = item.meu ? 'Você' : CC.esc(item.autor.nome);
    const rotulo = necessidade ? 'Pedido de ajuda' : (item.destino === 'conduz' ? 'Pedido de oração · só quem conduz' : 'Pedido de oração');
    let html = '<div class="cartao-proposito" style="cursor:default">'
      + '<div class="quem-amigo"><b>' + quem + '</b><span class="arroba">' + rotulo + '</span></div>'
      + '<p>' + CC.esc(item.texto) + '</p>'
      + '<p class="passo-dica pequena">Vence em ' + ddmm(item.venceEm) + '</p>';

    if (item.meu) {
      // Num pedido de ajuda (carona, mudança) "Deus respondeu" soa estranho: ali é "Já resolvi".
      const fimDoPedido = necessidade ? 'Já resolvi' : 'Deus respondeu';
      const gestos = item.gestos || [];
      const orou = gestos.filter((g) => g.gesto === 'orei');
      const ajudou = gestos.filter((g) => g.gesto === 'ajudo');
      if (orou.length) {
        const nomes = orou.map((g) => '<b>' + CC.esc(g.nome) + '</b>');
        const juntos = nomes.length === 1 ? nomes[0] : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
        const ultima = orou.reduce((a, b) => (a.data > b.data ? a : b)).data;
        html += '<p class="selo-status leu">' + CC.ico('certo') + '<span>' + juntos + (orou.length === 1 ? ' orou' : ' oraram')
          + ' por você · última vez em ' + ddmm(ultima) + '</span></p>';
      }
      if (necessidade && ajudou.length) {
        const nomes = ajudou.map((g) => '<b>' + CC.esc(g.nome) + '</b>').join(', ');
        html += '<p class="selo-status leu">' + CC.ico('certo') + '<span>' + nomes + (ajudou.length === 1 ? ' pode ajudar' : ' podem ajudar') + '</span></p>';
      }
      html += '<div class="pe-duplo-plano">'
        + (item.respondido ? '<span class="selo-status leu">' + CC.ico('certo') + fimDoPedido + '</span>'
          : '<button class="botao contorno pequeno" data-respondido="' + CC.esc(item.id) + '" data-fim="' + fimDoPedido + '">' + fimDoPedido + '</button>')
        + '<button class="botao plano perigo pequeno" data-apagar-pedido="' + CC.esc(item.id) + '">Apagar</button></div>';
    } else {
      html += '<div class="pe-duplo-plano">'
        + (item.oreiHoje ? '<span class="selo-status leu">' + CC.ico('certo') + 'Você orou hoje</span>'
          : '<button class="botao pequeno" data-orei="' + CC.esc(item.id) + '">Orei por você</button>')
        + (necessidade ? (item.ajudei ? '<span class="selo-status leu">' + CC.ico('certo') + 'Você disse que pode ajudar</span>'
          : '<button class="botao contorno pequeno" data-ajudo="' + CC.esc(item.id) + '">Posso ajudar</button>') : '')
        + '</div>'
        // Menu discreto, como o de denunciar um amigo (08-amigos.js): não fica ao lado dos
        // gestos, para não parecer a mesma categoria de resposta.
        + '<button class="botao plano pequeno" data-denunciar-pedido="' + CC.esc(item.id) + '">' + CC.ico('bandeira') + 'Denunciar</button>';
    }
    return html + '</div>';
  }

  // Quem conduz vê, no topo da aba, os pedidos com denúncia, à espera de uma decisão.
  function blocoRevisaoPedidos(denuncias) {
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

  function desenharOracao(painel, p, d) {
    if (!d) { painel.innerHTML = '<div class="vazio-amigos">' + CC.ico('aperto') + '<p>Sem conexão. Tente de novo.</p></div>'; return; }
    const conduzo = p.euConduzo;
    painel.innerHTML = (conduzo && d.denuncias && d.denuncias.length ? blocoRevisaoPedidos(d.denuncias) : '')
      + '<div class="acoes"><button class="botao" data-pedir="oracao">' + CC.ico('aperto') + 'Pedir oração</button>'
      + '<button class="botao contorno" data-pedir="necessidade">Pedir ajuda</button></div>'
      + (d.pedidos.length
        ? '<div class="lista-pedidos">' + d.pedidos.map(cartaoPedido).join('') + '</div>'
        : '<div class="vazio-amigos">' + CC.ico('aperto') + '<p>Nenhum pedido agora. Quando alguém pedir oração, aparece aqui.</p></div>');
    ligarOracao(painel, p);
  }

  async function recarregarOracao(p) {
    const d = await carregarCuidado(p.id);
    if (location.hash !== enderecoCelula(p.id, 'oracao')) return;
    const painel = document.querySelector('.painel-celula');
    if (painel) desenharOracao(painel, p, d);
  }

  function ligarOracao(painel, p) {
    painel.querySelectorAll('[data-pedir]').forEach((b) => { b.onclick = () => folhaPedido(p, b.dataset.pedir); });
    painel.querySelectorAll('[data-orei]').forEach((b) => {
      b.onclick = async () => {
        b.disabled = true;
        try { await CC.api('api/cuidado', { acao: 'orei', id: b.dataset.orei }); } catch (e) { CC.avisar(e.message); }
        recarregarOracao(p);
      };
    });
    painel.querySelectorAll('[data-ajudo]').forEach((b) => {
      b.onclick = async () => {
        b.disabled = true;
        try { await CC.api('api/cuidado', { acao: 'ajudo', id: b.dataset.ajudo }); CC.avisar('Combinem pessoalmente ou no WhatsApp.'); } catch (e) { CC.avisar(e.message); }
        recarregarOracao(p);
      };
    });
    painel.querySelectorAll('[data-respondido]').forEach((b) => {
      b.onclick = async () => {
        if (!await CC.confirmar({ titulo: 'Marcar "' + b.dataset.fim + '"?', texto: 'O pedido some da lista dos outros, e some da sua em 7 dias.', acao: 'Marcar' })) return;
        try {
          await CC.api('api/cuidado', { acao: 'respondido', id: b.dataset.respondido });
          CC.avisar(b.dataset.fim === 'Já resolvi' ? 'Que bom!' : 'Que alegria!');
        } catch (e) { CC.avisar(e.message); }
        recarregarOracao(p);
      };
    });
    painel.querySelectorAll('[data-apagar-pedido]').forEach((b) => {
      b.onclick = async () => {
        if (!await CC.confirmar({ titulo: 'Apagar este pedido?', texto: 'Ninguém mais vê o pedido, quem orou ou quem se ofereceu para ajudar.', acao: 'Apagar', perigo: true })) return;
        try { await CC.api('api/cuidado', { acao: 'apagar', id: b.dataset.apagarPedido }); CC.avisar('Pedido apagado'); } catch (e) { CC.avisar(e.message); }
        recarregarOracao(p);
      };
    });
    painel.querySelectorAll('[data-denunciar-pedido]').forEach((b) => {
      b.onclick = () => {
        const d = cuidadoCache[p.id];
        const item = d && d.pedidos.find((x) => x.id === b.dataset.denunciarPedido);
        if (item) folhaDenunciaPedido(p, item);
      };
    });
    painel.querySelectorAll('[data-manter-pedido]').forEach((b) => {
      b.onclick = async () => {
        try { await CC.api('api/cuidado', { acao: 'decidir', id: b.dataset.manterPedido, manter: true }); CC.avisar('Pedido mantido'); } catch (e) { CC.avisar(e.message); }
        recarregarOracao(p);
      };
    });
    painel.querySelectorAll('[data-tirar-pedido]').forEach((b) => {
      b.onclick = async () => {
        if (!await CC.confirmar({ titulo: 'Tirar este pedido?', texto: 'O pedido some para todo mundo.', acao: 'Tirar', perigo: true })) return;
        try { await CC.api('api/cuidado', { acao: 'decidir', id: b.dataset.tirarPedido, manter: false }); CC.avisar('Pedido tirado'); } catch (e) { CC.avisar(e.message); }
        recarregarOracao(p);
      };
    });
  }

  async function preencherOracao(painel, p, aindaAqui) {
    const d = await carregarCuidado(p.id);
    if (!aindaAqui()) return;
    desenharOracao(painel, p, d);
  }

  const TEXTO_MAX_PEDIDO = { oracao: 280, necessidade: 200 };

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
        const campo = folha.querySelector('[data-texto]');
        const conta = () => { folha.querySelector('[data-conta]').textContent = CC.pertoDoLimite(campo.value.length, max) ? campo.value.length + ' de ' + max + ' caracteres' : ''; };
        campo.oninput = conta;
        conta();
        folha.querySelectorAll('[data-destino]').forEach((b) => {
          b.onclick = () => {
            destino = b.dataset.destino;
            folha.querySelectorAll('[data-destino]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          };
        });
        folha.querySelectorAll('[data-dias]').forEach((b) => {
          b.onclick = () => {
            dias = Number(b.dataset.dias);
            folha.querySelectorAll('[data-dias]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          };
        });
        const enviar = folha.querySelector('[data-enviar]');
        enviar.onclick = async () => {
          const erro = folha.querySelector('.erro-proposito');
          enviar.disabled = true;
          erro.hidden = true;
          try {
            await CC.api('api/cuidado', { acao: 'criar', celula: p.id, tipo, destino, texto: campo.value, dias });
            fechar();
            CC.avisar(oracao ? 'Pedido de oração enviado' : 'Pedido de ajuda enviado');
            recarregarOracao(p);
          } catch (e) {
            erro.textContent = e.message;
            erro.hidden = false;
            enviar.disabled = false;
          }
        };
      },
    });
  }

  function folhaDenunciaPedido(p, item) {
    const motivos = (cuidadoCache[p.id] && cuidadoCache[p.id].motivos) || [];
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
                // A caixa de ajuda completa da seção 5, mostrada na hora para quem denunciou.
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
            recarregarOracao(p);
          };
        });
      },
    });
  }
})(window.CC);
