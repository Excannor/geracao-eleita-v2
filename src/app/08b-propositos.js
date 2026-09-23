/* Propósitos: o compromisso de ler, ou orar, junto. Em dupla, com quantas pessoas quiser; em
   grupo, de 3 a 5, com a meta coletiva do dia. O servidor faz as contas; aqui só aparece quem
   já fez hoje, nunca o que alguém escreveu ou orou. */
(function (CC) {
  'use strict';

  let cache = null;
  const retrato = (p, tamanho) => CC.retratoAmigo(p, tamanho);
  const euUsuario = () => (CC.quem || {}).usuario;
  const acao = (corpo) => CC.api('api/propositos', corpo);

  CC.carregarPropositos = () => CC.api('api/propositos').then((d) => { cache = d; return d; }).catch(() => null);

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
    const rotulo = p.grupo
      ? (p.tipo === 'livro' ? 'dias de meta' : 'dias seguidos')
      : (p.tipo === 'livro' ? 'dias lidos' : 'dias juntos');
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
      + (p.grupo ? gente : outros).map((m) => retrato(m, (p.grupo ? 'pequeno' : 'medio') + (m.fezHoje ? ' fez' : ''))).join('') + '</span>'
      + '<span class="quem-amigo"><b>' + CC.esc(p.grupo ? p.titulo : quem) + '</b>'
      + '<span class="tipo-proposito">' + CC.ico(ICONE[p.tipo] || 'trilha') + '<span>' + CC.esc(p.grupo ? quem + ' · ' + oQue(p) : oQue(p)) + '</span></span></span>'
      + (p.euConvidado ? '' : contagem(p))
      + '</div>';
  }

  function cartao(p) {
    return '<button class="cartao-proposito" data-proposito="' + CC.esc(p.id) + '">'
      + cabeca(p)
      + (p.grupo && p.hoje && p.tipo !== 'oracao' ? barraDoGrupo(p.hoje) : situacaoDaDupla(p))
      + '</button>';
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

  // ---------- a tela ----------
  CC.vistaPropositos = function (raiz) {
    const desenhar = (d, aviso) => {
      const lista = (d && d.propositos) || [];
      const convites = lista.filter((p) => p.euConvidado);
      const grupos = lista.filter((p) => !p.euConvidado && p.grupo);
      const duplas = lista.filter((p) => !p.euConvidado && !p.grupo);
      raiz.innerHTML = CC.botaoVoltar('Juntos')
        + '<div class="cabeca-tela"><h1>Propósitos</h1>'
        + (d ? '<span class="contagem-amigos">' + CC.plural(grupos.length + duplas.length, 'propósito', 'propósitos') + '</span>' : '') + '</div>'
        + (aviso ? '<p class="aviso-cadeado">' + CC.esc(aviso) + '</p>' : '')
        + '<button class="botao azul" data-novo-proposito>' + CC.ico('mais-sinal') + 'Novo propósito</button>'
        + (!d ? '<div class="leitor-esqueleto"><i></i><i></i><i></i></div>' : '')
        + (convites.length ? CC.tituloSecao('Convites', String(convites.length)) + '<div class="lista-propositos">' + convites.map(cartaoConvite).join('') + '</div>' : '')
        + (grupos.length ? CC.tituloSecao('Grupos') + '<div class="lista-propositos">' + grupos.map(cartao).join('') + '</div>' : '')
        + (duplas.length ? CC.tituloSecao('Em dupla') + '<div class="lista-propositos">' + duplas.map(cartao).join('') + '</div>' : '')
        + (d && !lista.length
          ? '<div class="vazio-amigos">' + CC.ico('pessoas') + '<p>Chame um amigo para ler, ou orar, junto com você.</p></div>'
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
    const limite = (cache && cache.limiteGrupo) || 5;
    const podeChamar = p.grupo && gente.length < limite;
    const ehDaAmizade = !p.grupo && p.tipo === 'plano';

    const linhas = gente.map((m) => {
      let situacao;
      if (m.estado === 'convidado') situacao = 'Ainda não aceitou';
      else if (oracao) situacao = m.usuario === euUsuario() && m.fezHoje ? 'Você orou hoje' : 'Orando junto';
      else if (m.fezHoje) situacao = (p.tipo === 'oracao' ? 'Orou hoje' : 'Leu hoje') + (m.extraHoje ? ' e fez o extra' : '');
      else situacao = m.extraHoje ? 'Fez o extra hoje' : 'Ainda não ' + verbo(p) + ' hoje';
      return '<div class="linha-amigo' + (m.estado === 'convidado' ? ' enviado' : '') + '">' + retrato(m)
        + '<div class="quem-amigo"><b>' + CC.esc(nomeCurto(m)) + '</b><span class="arroba">' + situacao + '</span></div>'
        + (m.fezHoje && !oracao ? '<span class="selo-status leu">' + CC.ico('certo') + '</span>' : '')
        + '</div>';
    }).join('');

    CC.folha('<h2>' + CC.esc(p.grupo ? p.titulo : 'Propósito de ' + p.titulo.toLowerCase()) + '</h2>'
      + '<p class="tipo-proposito">' + CC.ico(ICONE[p.tipo] || 'trilha') + CC.esc(ROTULO_TIPO[p.tipo] || '') + (p.tipo === 'livro' ? ': ' + CC.esc(p.titulo) : '')
      + (oracao ? '' : ' · ' + CC.plural(p.dias, 'dia', 'dias')) + '</p>'
      + (p.grupo && p.hoje && !oracao ? barraDoGrupo(p.hoje)
        + '<p class="passo-dica pequena">A meta do dia é o número de pessoas. Cada um soma 1 ponto por '
        + (p.tipo === 'oracao' ? 'orar' : 'ler') + ' e mais 1 se praticar ou abrir uma nota de estudo. Quem fez mais cobre quem faltou.</p>'
        : '<p class="passo-dica pequena">' + CC.esc(EXPLICA[p.tipo] || '') + '</p>')
      + '<div class="lista-pedidos">' + linhas + '</div>'
      + '<div class="acoes">'
      + (podeNotificar ? '<button class="botao azul" data-notificar>' + CC.ico('sino') + (faltam.length === 1 ? 'Notificar ' + CC.esc(faltam[0].nome) : 'Notificar quem falta (' + faltam.length + ')') + '</button>' : '')
      + (podeChamar ? '<button class="botao contorno" data-chamar>' + CC.ico('mais-sinal') + 'Chamar mais alguém</button>' : '')
      + (p.grupo && p.criadoPor === euUsuario() ? '<button class="botao plano perigo" data-encerrar>Encerrar grupo</button>' : '')
      + (p.grupo && p.criadoPor !== euUsuario() ? '<button class="botao plano perigo" data-sair>Sair do grupo</button>' : '')
      + (!p.grupo && !ehDaAmizade ? '<button class="botao plano perigo" data-sair>Encerrar propósito</button>' : '')
      + (ehDaAmizade ? '<p class="passo-dica pequena">A leitura em dupla anda junto com a amizade.</p>' : '')
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
      + '<p class="passo-dica pequena" data-dica-grupo hidden>Com 3 ou mais vira grupo: a meta do dia é o número de pessoas, e quem fizer mais cobre quem faltou.</p>'
      + '<label class="campo-senha" data-bloco-nome hidden><span>Nome do grupo</span><input data-titulo maxlength="30" placeholder="Ex.: Célula de quinta"></label>'
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
