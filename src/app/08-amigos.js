/* Feed e amigos: o Propósito dos amigos, os pedidos e o mural com os marcos de quem
   caminha junto. Só entra quem aceitou, a busca é pelo @ exato e o que a pessoa escreve
   nunca aparece aqui. Mostrar os próprios marcos no mural é escolha de cada um. */
(function (CC) {
  'use strict';

  const servido = () => location.protocol.startsWith('http');
  const comConta = () => servido() && !(CC.quem && !CC.quem.comSenha);
  let cache = null;
  let mural = null;

  CC.carregarAmigos = function () {
    // Sem conta (servidor aberto das ferramentas de teste) não há amigos a pedir.
    if (!comConta()) return Promise.resolve(null);
    return CC.api('api/amigos').then((d) => { cache = d; return d; }).catch(() => null);
  };
  CC.amigosEmCache = () => cache;

  CC.carregarNovidades = function () {
    if (!comConta()) return Promise.resolve(null);
    // O quadro do mês saiu da tela junto com os personagens (redesenho futuro): os já
    // publicados ficam no servidor, mas não aparecem nem contam como novidade.
    // As células vêm junto: o recado do líder também entra no feed.
    const celulas = CC.carregarPropositos ? CC.carregarPropositos() : null;
    return Promise.all([CC.api('api/novidades'), celulas]).then(([d]) => {
      if (d && d.eventos) d.eventos = d.eventos.filter((e) => e.tipo !== 'quadro');
      mural = d;
      return d;
    }).catch(() => null);
  };

  // O recado do líder aparece no feed de quem está na célula, na hora em que foi publicado.
  // Recado velho sai do feed, mas continua no alto da célula enquanto o líder não o trocar.
  const RECADO_NO_FEED_DIAS = 14;
  const recadosDasCelulas = () => (CC.minhasCelulas ? CC.minhasCelulas() : [])
    .filter((p) => p.recado && p.recadoEm)
    .map((p) => ({ celula: p, em: Date.parse(p.recadoEm), lider: p.membros.find((m) => m.usuario === p.criadoPor) }))
    .filter((r) => r.em && r.lider && Date.now() - r.em < RECADO_NO_FEED_DIAS * 864e5);
  CC.novidadesEmCache = () => mural;

  const lerLocal = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const gravarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* segue */ } };

  // O ponto no sino: pedido, toque ou novidade de amigo desde a última visita ao mural.
  CC.pendenciasDeAmigos = () => {
    const visto = Number(lerLocal('cc.novidades.visto') || 0);
    const eu = (CC.quem || {}).usuario;
    const novas = ((mural && mural.eventos) || []).filter((e) => e.em > visto && e.autor.usuario !== eu).length
      + recadosDasCelulas().filter((r) => r.em > visto && r.lider.usuario !== eu).length;
    return (cache ? (cache.recebidos || []).length + (cache.toques || []).length + (cache.convitesProposito || 0) : 0) + novas;
  };

  const TEXTO_CONVITE = 'Bora ler a Bíblia inteira em um ano, junto? No Geração Eleita é uma leitura por dia, e a gente mantém um propósito juntos. Aceita meu convite:';
  const FALA_TOQUE = 'Bora ler hoje?';

  // ---------- peças ----------
  const TONS = ['verde', 'azul', 'roxo', 'turquesa', 'amarelo'];

  function retrato(p, tamanho) {
    const cls = 'retrato-amigo' + (tamanho ? ' ' + tamanho : '');
    if (p.foto) return '<span class="' + cls + '"><img src="' + CC.esc(p.foto) + '" alt=""></span>';
    const letra = (p.nome || p.usuario || '?').trim().charAt(0).toUpperCase();
    const soma = [...String(p.usuario)].reduce((s, c) => s + c.charCodeAt(0), 0);
    return '<span class="' + cls + ' inicial c-' + TONS[soma % TONS.length] + '" aria-hidden="true">' + CC.esc(letra) + '</span>';
  }
  CC.retratoAmigo = retrato;

  // A inicial do retrato vem do nome de verdade; o rótulo "Você" fica por conta de cada tela.
  const eu = () => ({ usuario: (CC.quem || {}).usuario || 'eu', nome: String(CC.apelido() || (CC.quem || {}).nome || 'Você').trim(), foto: CC.foto() });
  const acaoAmizade = (acao, usuario) => CC.api('api/amizade', { acao, usuario });

  async function recarregar() {
    await Promise.all([CC.carregarAmigos(), CC.carregarNovidades()]);
    CC.redesenhar();
  }

  const enviarToque = async (usuario) => {
    await CC.salvarNoServidor();
    await CC.api('api/toques', { para: usuario });
  };


  // ---------- publicar no mural ----------
  CC.podeCompartilharComAmigos = () => comConta() && !!(cache && (cache.amigos || []).length);

  async function publicar(tipo, dados) {
    if (!comConta() || !mural || !mural.ligado) return false;
    const chave = tipo + ':' + JSON.stringify(dados);
    const enviadas = (lerLocal('cc.novidades.enviadas') || '').split('\n').filter(Boolean);
    if (tipo !== 'versiculo' && enviadas.includes(chave)) return true;
    try {
      await CC.api('api/novidades', { tipo, dados });
      gravarLocal('cc.novidades.enviadas', [...enviadas, chave].slice(-120).join('\n'));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Os marcos saem daqui depois que o progresso já foi para o servidor, que confere tudo.
  CC.publicarNovidades = async function ({ ofensiva, niveis, livros, unidade } = {}) {
    if (!comConta()) return;
    if (!mural) await CC.carregarNovidades();
    if (!mural || !mural.ligado) return;
    await CC.salvarNoServidor();
    if (ofensiva) await publicar('ofensiva', { dias: ofensiva });
    for (const c of niveis || []) await publicar('conquista', { id: c.id, nivel: c.nivel });
    for (const l of livros || []) await publicar('livro', { livro: l });
    if (unidade) await publicar('unidade', { numero: unidade });
  };

  CC.compartilharVersiculo = async function (ref) {
    if (!mural) await CC.carregarNovidades();
    if (mural && !mural.ligado) {
      const ligar = await CC.confirmar({
        titulo: 'Mostrar aos amigos?',
        texto: 'Seus amigos passam a ver no Feed os versículos que você guarda e seus marcos: ofensiva, livros e conquistas.',
        acao: 'Mostrar',
      });
      if (!ligar) return false;
      await preferir(true);
    }
    return publicar('versiculo', { ref });
  };

  async function preferir(ligado) {
    await CC.api('api/novidades/preferencia', { ligado });
    if (mural) { mural.ligado = ligado; mural.perguntado = true; }
  }

  // ---------- convidar ----------
  CC.convidar = async function () {
    if (cache && !cache.perfilCompleto) {
      const completou = await CC.completarCadastro(CC.quem || {});
      if (!completou) return;
    }
    let link = '';
    try {
      link = (await CC.api('api/convites', {})).link;
    } catch (e) {
      // O cache do perfil pode estar desatualizado: se o servidor recusou por cadastro
      // incompleto, oferece completar na hora em vez de só mostrar o erro sem saída.
      if (e.status === 403) {
        const completou = await CC.completarCadastro(CC.quem || {});
        if (!completou) return;
        try {
          link = (await CC.api('api/convites', {})).link;
        } catch (e2) {
          CC.avisar(e2.message || 'Não consegui gerar o convite. Tente de novo em instantes.');
          return;
        }
      } else {
        CC.avisar(e.message || 'Não consegui gerar o convite. Tente de novo em instantes.');
        return;
      }
    }
    CC.folha('<h2>Convide alguém para ler junto!</h2>'
      + '<p class="mensagem-convite">' + CC.esc(TEXTO_CONVITE) + ' <span>' + CC.esc(link) + '</span></p>'
      + '<div class="acoes"><button class="botao" data-compartilhar>' + CC.ico('compartilhar') + 'Compartilhar convite</button>'
      + '<button class="botao contorno" data-copiar>Copiar link</button></div>'
      + '<p class="separador"><span>ou pelo @ exato</span></p>'
      + '<form class="busca-exata" data-pedido><label class="so-leitor" for="arroba">@usuário</label>'
      + '<input id="arroba" placeholder="@usuario" autocomplete="off" autocapitalize="none" spellcheck="false">'
      + '<button class="botao pequeno" type="submit">Enviar</button></form>'
      + '<p class="recado-senha" id="recado" role="status"></p>'
      + '<p class="passo-dica pequena">O link vale por 30 dias e serve para quantas pessoas você quiser chamar.</p>'
      + '<div class="acoes"><button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: 'Convidar',
      ligar: (folha, fechar) => {
        const recado = folha.querySelector('#recado');
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-compartilhar]').onclick = async () => {
          const r = await CC.compartilhar(TEXTO_CONVITE, link);
          if (r === 'copiado') CC.avisar('Convite copiado. É só colar na conversa.');
          else if (r === 'falhou') CC.avisar('Não consegui compartilhar. Toque em "Copiar link" e cole na conversa.');
        };
        folha.querySelector('[data-copiar]').onclick = async () => {
          CC.avisar((await CC.copiar(link)) ? 'Link copiado' : 'Não consegui copiar');
        };
        folha.querySelector('[data-pedido]').onsubmit = async (ev) => {
          ev.preventDefault();
          const arroba = folha.querySelector('#arroba').value.trim().replace(/^@/, '');
          if (!arroba) return;
          recado.textContent = '';
          try {
            const { achado } = await CC.api('api/procurar?q=' + encodeURIComponent(arroba));
            if (!achado) { recado.textContent = 'Não achei ninguém com esse @.'; return; }
            if (achado.relacao === 'amigos') { recado.textContent = 'Vocês já leem juntos!'; return; }
            await acaoAmizade('pedir', achado.usuario);
            recado.textContent = 'Pedido enviado para @' + achado.usuario + '.';
            folha.querySelector('#arroba').value = '';
            CC.carregarAmigos().then(() => CC.redesenhar());
          } catch (e) {
            recado.textContent = e.message;
          }
        };
      },
    });
  };

  // ---------- telas cheias: novo propósito e toques ----------
  const duplaGrande = (a, b) => '<div class="dupla-grande">' + retrato(a, 'enorme') + retrato(b, 'enorme') + '</div>';

  CC.telaNovoProposito = function (amigo) {
    CC.telaCheia('<div class="cena cena-novo-proposito">'
      + '<h1>Começou um novo propósito dos amigos!</h1>'
      + '<div class="dupla-nomeada">'
      + '<span>' + retrato(eu(), 'enorme') + '<b>Você</b></span>'
      + '<span class="chama-meio">' + CC.icoChama() + '</span>'
      + '<span>' + retrato(amigo, 'enorme') + '<b>' + CC.esc(amigo.nome) + '</b></span></div>'
      + '<p class="frase-cena">A contagem sobe nos dias em que vocês dois fazem a lição.</p></div>', {
      classe: 'tela-proposito',
      rotulo: 'Novo propósito',
      pe: '<button class="botao azul" data-ver>Ver propósito</button>',
      ligar: (el, fechar) => {
        CC.arte.confete(el, 30);
        el.querySelector('[data-ver]').onclick = () => { fechar(); location.hash = '#/novidades'; };
      },
    });
  };

  CC.telaToque = function (amigo) {
    CC.telaCheia('<div class="cena cena-amigos">'
      + '<h1 class="titulo-toque">Dê um toque em ' + CC.esc(amigo.nome) + '</h1>'
      + '<div class="balao-fala">' + FALA_TOQUE + '</div>' + duplaGrande(eu(), amigo)
      + '<p class="dias-dupla">' + CC.icoChama() + '<b>' + (amigo.dias || 0) + '</b> ' + ((amigo.dias || 0) === 1 ? 'dia' : 'dias') + ' de propósito</p></div>', {
      classe: 'tela-toque',
      rotulo: 'Dar um toque',
      pe: '<button class="botao azul" data-enviar-toque>' + CC.ico('sino') + 'Notificar</button>'
        + '<button class="botao plano" data-fechar-tela>Continuar</button>',
      ligar: (el, fechar) => {
        el.querySelector('[data-fechar-tela]').onclick = fechar;
        const b = el.querySelector('[data-enviar-toque]');
        b.onclick = async () => {
          b.disabled = true;
          try {
            await enviarToque(amigo.usuario);
            b.innerHTML = CC.ico('certo') + 'Notificado';
            el.querySelector('.balao-fala').classList.add('enviado');
            CC.carregarAmigos().then(() => { if (location.hash.startsWith('#/novidades') || location.hash.startsWith('#/amigos')) CC.redesenhar(); });
          } catch (e) {
            b.disabled = false;
            CC.avisar(e.message);
          }
        };
      },
    });
  };

  CC.folhaToque = function (toque) {
    CC.telaCheia('<div class="cena cena-amigos">'
      + '<h1 class="titulo-toque">' + CC.esc(toque.nome) + ' deu um toque!</h1>'
      + '<div class="balao-fala lado-esquerdo">' + FALA_TOQUE + '</div>' + duplaGrande(toque, eu())
      + '<p class="frase-cena">A lição de hoje espera vocês dois.</p></div>', {
      classe: 'tela-toque',
      rotulo: 'Toque de ' + toque.nome,
      pe: '<button class="botao" data-ler>Fazer a lição</button>'
        + '<div class="pe-duplo-plano"><button class="botao plano" data-fechar>Depois</button>'
        + '<button class="botao plano" data-silenciar>Silenciar ' + CC.esc(toque.nome) + '</button></div>',
      ligar: (el, fechar) => {
        el.querySelector('[data-fechar]').onclick = fechar;
        el.querySelector('[data-ler]').onclick = () => { fechar(); CC.abrirLicao(CC.diaAtual()); };
        el.querySelector('[data-silenciar]').onclick = async () => {
          try { await acaoAmizade('silenciar', toque.usuario); CC.avisar('Toques silenciados'); } catch (e) { CC.avisar(e.message); }
          fechar();
        };
      },
    });
  };

  // ---------- aceitar convite ----------
  CC.aceitarConvite = async function (token) {
    let info;
    try {
      info = await CC.api('api/convites/' + encodeURIComponent(token));
    } catch (e) {
      CC.folha('<h2>Esse convite venceu ou foi cancelado</h2><p>Peça um novo para quem te chamou!</p>'
        + '<div class="acoes"><button class="botao" data-fechar>Entendi</button></div>',
      { ligar: (folha, fechar) => { folha.querySelector('[data-fechar]').onclick = fechar; } });
      return;
    }
    if (CC.quem && CC.quem.usuario === info.usuario) {
      CC.avisar('Esse convite é seu. Mande o link para alguém!');
      return;
    }
    CC.folha('<div class="dupla-convite">' + retrato(info, 'grande') + '<span class="chama-convite">' + CC.icoChama() + '</span>'
      + retrato(eu(), 'grande') + '</div>'
      + '<h2>' + CC.esc(info.nome) + ' te chamou para um propósito!</h2>'
      + '<p>No propósito dos amigos, a contagem sobe nos dias em que vocês dois fazem a lição.</p>'
      + '<p class="recado-senha" id="recado" role="alert"></p>'
      + '<div class="acoes"><button class="botao" data-aceitar>Aceitar</button>'
      + '<button class="botao plano" data-fechar>Agora não</button></div>',
    {
      rotulo: 'Convite',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-aceitar]').onclick = async () => {
          if (CC.quem && !CC.quem.perfilCompleto) {
            fechar();
            if (await CC.completarCadastro(CC.quem)) CC.aceitarConvite(token);
            return;
          }
          try {
            const r = await CC.api('api/convites/aceitar', { token });
            fechar();
            if (r.ja) CC.avisar('Vocês já leem juntos!');
            else CC.telaNovoProposito(info);
            recarregar();
          } catch (e) {
            folha.querySelector('#recado').textContent = e.message;
          }
        };
      },
    });
  };

  // ---------- um amigo ----------
  function folhaAmigo(amigo) {
    const euLi = CC.sequencia().feitoHoje;
    let estado;
    if (amigo.leuHoje && euLi) estado = '<span class="selo-status leu">' + CC.ico('certo') + 'Vocês dois leram hoje</span>';
    else if (amigo.leuHoje) estado = '<span class="selo-status leu">' + CC.ico('certo') + 'Já leu hoje</span>';
    else estado = '<span class="selo-status">Ainda não leu hoje</span>';
    const podeTocar = euLi && !amigo.leuHoje && !amigo.toqueEnviado;

    CC.folha('<div class="cabeca-amigo">' + retrato(amigo, 'grande') + '<div><h2>' + CC.esc(amigo.nome) + '</h2>'
      + '<span class="conta">@' + CC.esc(amigo.usuario) + '</span>'
      + '<span class="dias-proposito aceso">' + CC.icoChama() + CC.plural(amigo.dias, 'dia', 'dias') + ' lendo juntos</span></div></div>'
      + estado
      + (!euLi && !amigo.leuHoje ? '<p class="passo-dica pequena">Leia hoje para poder dar um toque.</p>' : '')
      + '<div class="acoes">'
      + (podeTocar ? '<button class="botao azul" data-toque>' + CC.ico('sino') + 'Notificar</button>' : '')
      + (amigo.toqueEnviado ? '<button class="botao" disabled>' + CC.ico('certo') + 'Notificado hoje</button>' : '')
      + '<button class="botao contorno" data-novo-com>' + CC.ico('mais-sinal') + 'Novo propósito com ' + CC.esc(amigo.nome) + '</button>'
      + '<button class="botao plano" data-encerrar>Desfazer amizade</button>'
      + '<div class="pe-duplo-plano"><button class="botao plano" data-denunciar>' + CC.ico('bandeira') + 'Denunciar</button>'
      + '<button class="botao plano perigo" data-bloquear>' + CC.ico('bloquear') + 'Bloquear</button></div>'
      + '<button class="botao plano" data-fechar>Fechar</button></div>',
    {
      rotulo: amigo.nome,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const toque = folha.querySelector('[data-toque]');
        if (toque) toque.onclick = () => { fechar(); CC.telaToque(amigo); };
        folha.querySelector('[data-novo-com]').onclick = () => { fechar(); CC.novoProposito(amigo.usuario); };
        folha.querySelector('[data-encerrar]').onclick = async () => {
          fechar();
          if (!await CC.confirmar({ titulo: 'Desfazer a amizade com ' + amigo.nome + '?', texto: 'Os propósitos em dupla de vocês acabam, e a contagem some. Ninguém é avisado.', acao: 'Desfazer' })) return;
          try { await acaoAmizade('desfazer', amigo.usuario); recarregar(); } catch (e) { CC.avisar(e.message); }
        };
        folha.querySelector('[data-bloquear]').onclick = async () => {
          fechar();
          if (!await CC.confirmar({
            titulo: 'Bloquear @' + amigo.usuario + '?',
            texto: 'A pessoa deixa de ver você e não consegue te convidar. Ela não é avisada.',
            acao: 'Bloquear', perigo: true,
          })) return;
          try { await acaoAmizade('bloquear', amigo.usuario); CC.avisar('Pessoa bloqueada'); recarregar(); } catch (e) { CC.avisar(e.message); }
        };
        folha.querySelector('[data-denunciar]').onclick = () => { fechar(); folhaDenuncia(amigo); };
      },
    });
  }

  function folhaDenuncia(pessoa) {
    const motivos = (cache && cache.motivos) || [];
    CC.folha('<h2>Denunciar @' + CC.esc(pessoa.usuario) + '</h2>'
      + '<p>Escolha o motivo. A denúncia fica guardada para quem cuida do app, e a pessoa não é avisada.</p>'
      + '<div class="opcoes-traducao">' + motivos.map((m) => '<button class="opcao-traducao" data-motivo="' + CC.esc(m) + '"><b>'
        + CC.esc(m) + '</b></button>').join('') + '</div>'
      + '<p class="passo-dica pequena">Se alguém te incomoda, você também pode bloquear. Se estiver em perigo, fale com um adulto de confiança ou ligue 190.</p>'
      + '<div class="acoes"><button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Denunciar',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-motivo]').forEach((b) => {
          b.onclick = async () => {
            try {
              await CC.api('api/denuncias', { usuario: pessoa.usuario, motivo: b.dataset.motivo });
              fechar();
              CC.avisar('Denúncia enviada. Obrigado por avisar.');
            } catch (e) {
              CC.avisar(e.message);
            }
          };
        });
      },
    });
  }

  // ---------- o mural ----------
  const quando = (ms) => {
    const minutos = Math.round((Date.now() - ms) / 60000);
    if (minutos < 2) return 'agora';
    if (minutos < 60) return minutos + ' min';
    const horas = Math.round(minutos / 60);
    if (horas < 24) return horas + (horas === 1 ? ' hora' : ' horas');
    const dias = Math.round(horas / 24);
    return dias + (dias === 1 ? ' dia' : ' dias');
  };

  function itemDoMural(ev) {
    const meu = ev.autor.usuario === (CC.quem || {}).usuario;
    const quem = meu ? 'Você' : ev.autor.nome;
    const d = ev.dados || {};
    let frase = '';
    let arte = '';
    let extra = '';
    if (ev.tipo === 'ofensiva') {
      frase = quem + ' chegou a <b>' + d.dias + ' dias de ofensiva</b>!';
      arte = CC.icoChama();
    } else if (ev.tipo === 'conquista') {
      const c = CC.conquistasComNivel().find((x) => x.id === d.id);
      const titulo = c ? c.titulo : 'uma conquista';
      frase = quem + (d.nivel > 1 ? ' subiu para o nível ' + d.nivel + ' em <b>' : ' ganhou a conquista <b>') + CC.esc(titulo) + '</b>!';
      if (c) arte = CC.arte.medalha({ ...c, nivel: d.nivel, maximo: false });
    } else if (ev.tipo === 'livro') {
      frase = quem + ' terminou de ler <b>' + CC.esc(d.livro) + '</b>!';
      arte = '<span class="arte-livro pequena">' + CC.ico('livro') + '</span>';
    } else if (ev.tipo === 'unidade') {
      const u = CC.D.unidades.find((x) => x.numero === Number(d.numero));
      frase = quem + ' concluiu a <b>unidade ' + CC.esc(d.numero) + '</b> do plano!';
      arte = CC.arte.trofeu(u ? u.cor : 'amarelo', true);
    } else if (ev.tipo === 'versiculo') {
      frase = quem + ' guardou um versículo:';
      extra = '<div class="versiculo-mural" data-ref="' + CC.esc(d.ref) + '"><p class="texto-versiculo">…</p><b>' + CC.esc(d.ref) + '</b></div>';
    } else if (ev.tipo === 'novoProposito' || ev.tipo === 'proposito') {
      const outro = meu ? ev.com : ev.autor;
      frase = ev.tipo === 'novoProposito'
        ? 'Você e ' + CC.esc(outro ? outro.nome : 'um amigo') + ' começaram um <b>propósito</b>!'
        : 'Você e ' + CC.esc(outro ? outro.nome : 'um amigo') + ' chegaram a <b>' + d.dias + ' dias de propósito</b>!';
      arte = CC.icoChama();
    } else if (ev.tipo === 'semeador') {
      const artes = ['broto', 'bronze', 'prata', 'ouro', 'igreja'];
      frase = quem + ' chegou ao nível <b>' + CC.esc(d.nome || '') + '</b> da Trilha do Semeador!';
      arte = CC.arte.semeador(artes[(Number(d.nivel) || 1) - 1] || 'broto', true);
    } else if (ev.tipo === 'propositoGrupo') {
      frase = 'O grupo <b>' + CC.esc(d.titulo || 'de vocês') + '</b> chegou a <b>' + CC.plural(Number(d.dias) || 0, 'dia', 'dias') + '</b> de meta batida!';
      arte = CC.icoChama();
    }
    const reacao = '<button class="botao-reagir' + (ev.euReagi ? ' ligado' : '') + '" data-celebrar="' + CC.esc(ev.id) + '" aria-pressed="' + ev.euReagi + '">'
      + CC.ico('aperto') + '<b>' + (ev.total || '') + '</b><span class="so-leitor">Celebrar</span></button>';
    const nomes = (ev.quem || []);
    const celebrado = ev.total
      ? '<span class="quem-celebrou">Celebrado por ' + (nomes.length
        ? CC.esc(nomes.slice(0, 2).join(' e ')) + (ev.total > nomes.slice(0, 2).length ? ' e outras pessoas' : '')
        : (ev.total === 1 ? '1 pessoa' : ev.total + ' pessoas')) + '</span>'
      : '';
    return '<article class="item-mural">'
      + '<div class="cabeca-mural">' + retrato(ev.autor, 'medio') + '<div><b>' + CC.esc(meu ? 'Você' : ev.autor.nome) + '</b><span>' + quando(ev.em) + '</span></div></div>'
      + '<div class="corpo-mural"><p>' + frase.replace(/^(Você|[^<]+?)(?= )/, (m) => CC.esc(m)) + '</p>' + (arte ? '<span class="arte-mural">' + arte + '</span>' : '') + '</div>'
      + extra
      + '<div class="pe-mural">' + reacao + celebrado + '</div>'
      + '</article>';
  }

  // O recado no feed: com a faixa da célula em cima, para ninguém confundir com um marco de amigo.
  function itemRecado({ celula, em, lider }) {
    const meu = lider.usuario === (CC.quem || {}).usuario;
    return '<article class="item-mural item-recado">'
      + '<p class="faixa-recado">' + CC.ico('pessoas') + '<span>Recado na <b>' + CC.esc(celula.titulo) + '</b></span></p>'
      + '<div class="cabeca-mural">' + retrato(lider, 'medio') + '<div><b>' + CC.esc(meu ? 'Você' : lider.nome) + ' <small class="selo-lider">líder</small></b><span>' + quando(em) + '</span></div></div>'
      + '<p class="texto-recado">' + CC.esc(celula.recado) + '</p>'
      + '<div class="pe-mural"><button class="botao contorno pequeno" data-abrir-celula="' + CC.esc(celula.id) + '">Abrir a célula' + CC.ico('avancar') + '</button></div>'
      + '</article>';
  }

  // Sem célula, o cartão explica o que ela é e como começar; com célula, mostra cada uma.
  function blocoCelula(celulas) {
    if (celulas.length) return '<div class="lista-propositos">' + celulas.map(CC.cartaoCelula).join('') + '</div>';
    return '<div class="cartao-proposito cartao-celula vazia">'
      + '<span class="etiqueta-celula">' + CC.ico('pessoas') + 'Célula</span>'
      + '<p>Leiam o plano juntos, até 20 pessoas, com o recado do líder e o estudo do encontro.</p>'
      + '<button class="botao azul" data-nova-celula>Criar uma célula</button>'
      + '<p class="passo-dica pequena">Recebeu o link da sua célula? É só abrir que você entra.</p>'
      + '</div>';
  }

  CC.vistaAmigos = function (raiz) {
    if (!servido()) {
      raiz.innerHTML = '<h1>Juntos</h1><div class="vazio">Os amigos aparecem quando o aplicativo está aberto pelo servidor.</div>';
      return;
    }

    const desenhar = (dados, novidades, aviso) => {
      const d = dados || {};
      const amigos = d.amigos || [];
      const recebidos = d.recebidos || [];
      const enviados = d.enviados || [];
      const m = novidades || {};
      const celulas = CC.minhasCelulas ? CC.minhasCelulas() : [];

      const roda = amigos.map((a) => '<button class="amigo-roda' + (a.leuHoje ? ' leu' : '') + '" data-amigo="' + CC.esc(a.usuario) + '" '
        + 'aria-label="' + CC.esc(a.nome) + ', ' + CC.plural(a.dias, 'dia', 'dias') + ' de propósito' + (a.leuHoje ? ', já leu hoje' : '') + '">'
        + '<span class="moldura">' + retrato(a, 'grande') + (a.leuHoje ? '<i class="selo-leu">' + CC.ico('certo') + '</i>' : '') + '</span>'
        + '<b>' + CC.esc(a.nome) + '</b><small>' + CC.icoChama() + a.dias + '</small></button>').join('')
        // Amigos sem teto: uma vaga só, sempre no fim da roda, para chamar mais alguém.
        + '<button class="vaga" data-convidar aria-label="Convidar alguém">'
          + '<span class="moldura">' + CC.ico('mais-sinal') + '</span><b>Convidar</b></button>';

      let corpo;
      if (dados && !d.perfilCompleto) {
        corpo = '<div class="vazio-amigos">' + CC.ico('pessoas') + '<p>Complete seu cadastro para ler com amigos.</p>'
          + '<button class="botao" data-completar>Completar cadastro</button></div>';
      } else if (!dados) {
        corpo = '<div class="leitor-esqueleto"><i></i><i></i><i></i></div>';
      } else {
        const eventos = m.eventos || [];
        const linhaDoTempo = eventos.map((e) => ({ em: e.em, html: itemDoMural(e) }))
          .concat(recadosDasCelulas().map((r) => ({ em: r.em, html: itemRecado(r) })))
          .sort((a, b) => b.em - a.em);
        const pedidoLigar = !m.ligado && !m.perguntado && amigos.length
          ? '<div class="pedido-mural">' + CC.ico('pessoas') + '<div><b>Mostrar seus marcos aos amigos?</b>'
            + '<p>Ofensiva, livros terminados, conquistas e versículos que você guardar.</p>'
            + '<div class="pe-duplo-plano"><button class="botao pequeno" data-mural-ligar>Mostrar</button>'
            + '<button class="botao pequeno plano" data-mural-nao>Agora não</button></div></div></div>'
          : '';
        corpo = '<div class="roda-amigos lista-amigos" role="list">' + roda + '</div>'
          + blocoCelula(celulas)
          + '<button class="botao contorno convidar-largo" data-convidar>' + CC.ico('compartilhar') + 'Convidar para ler junto</button>'
          + '<button class="entrada-propositos" data-propositos>' + CC.ico('aperto')
            + '<span><b>Propósitos</b><small>Duplas e grupos de leitura e oração</small></span>'
            + (d.convitesProposito ? '<i class="selo-numero" aria-label="' + CC.plural(d.convitesProposito, 'convite', 'convites') + '">' + d.convitesProposito + '</i>' : '')
            + CC.ico('avancar') + '</button>'
          + (recebidos.length
            ? CC.tituloSecao('Pedidos', String(recebidos.length))
              + '<div class="lista-pedidos">' + recebidos.map((p) => '<div class="linha-amigo pedido">' + retrato(p)
                + '<div class="quem-amigo"><b>' + CC.esc(p.nome) + '</b><span class="arroba">@' + CC.esc(p.usuario) + ' quer ler com você</span></div>'
                + '<button class="botao pequeno" data-aceitar="' + CC.esc(p.usuario) + '">Aceitar</button>'
                + '<button class="botao plano pequeno" data-recusar="' + CC.esc(p.usuario) + '">Recusar</button>'
                + '</div>').join('') + '</div>'
            : '')
          + pedidoLigar
          + (linhaDoTempo.length
            ? '<div class="mural">' + linhaDoTempo.map((i) => i.html).join('') + '</div>'
            : '<div class="vazio-amigos">' + CC.ico('pessoas')
              + '<p>' + (amigos.length ? 'Quando alguém bater uma meta, aparece aqui.' : 'Ler junto é mais fácil! Chame a sua célula ou até 4 amigos e montem um propósito.') + '</p></div>')
          + (enviados.length
            ? CC.tituloSecao('Convites enviados') + '<div class="lista-pedidos">' + enviados.map((p) => '<div class="linha-amigo enviado">'
              + '<div class="quem-amigo"><b>@' + CC.esc(p.usuario) + '</b><span class="arroba">aguardando</span></div>'
              + '<button class="botao plano pequeno" data-cancelar="' + CC.esc(p.usuario) + '">Cancelar</button></div>').join('') + '</div>'
            : '')
          + '<p class="rodape-privacidade"><span><a href="#/amigos/bloqueados">Pessoas bloqueadas</a> · <a href="privacidade.html">Privacidade</a></span></p>';
      }

      raiz.innerHTML = '<div class="cabeca-tela"><h1>Juntos</h1>'
        + '<span class="contagem-amigos">' + CC.plural(amigos.length, 'amigo', 'amigos') + '</span></div>'
        + (aviso ? '<p class="aviso-cadeado">' + CC.esc(aviso) + '</p>' : '')
        + corpo;

      const ligar = (sel, fn) => raiz.querySelectorAll(sel).forEach((el) => { el.onclick = () => fn(el); });
      ligar('[data-convidar]', () => CC.convidar());
      ligar('[data-nova-celula]', () => CC.novaCelula());
      ligar('[data-propositos]', () => { location.hash = '#/novidades/propositos'; });
      ligar('[data-celula]', (el) => CC.abrirCelula(el.dataset.celula));
      ligar('[data-abrir-celula]', (el) => CC.abrirCelula(el.dataset.abrirCelula));
      ligar('[data-completar]', () => CC.completarCadastro(CC.quem || {}));
      ligar('[data-amigo]', (el) => folhaAmigo(amigos.find((a) => a.usuario === el.dataset.amigo)));
      ligar('[data-aceitar]', async (el) => {
        el.disabled = true;
        const pessoa = recebidos.find((p) => p.usuario === el.dataset.aceitar);
        try { await acaoAmizade('aceitar', el.dataset.aceitar); CC.telaNovoProposito(pessoa); } catch (e) { CC.avisar(e.message); }
        recarregar();
      });
      ligar('[data-recusar]', async (el) => { await acaoAmizade('recusar', el.dataset.recusar).catch(() => {}); recarregar(); });
      ligar('[data-cancelar]', async (el) => { await acaoAmizade('cancelar', el.dataset.cancelar).catch(() => {}); recarregar(); });
      ligar('[data-mural-ligar]', async () => { await preferir(true).catch(() => {}); recarregar(); });
      ligar('[data-mural-nao]', async () => { await preferir(false).catch(() => {}); recarregar(); });
      ligar('[data-celebrar]', async (el) => {
        const ev = (m.eventos || []).find((x) => x.id === el.dataset.celebrar);
        el.classList.toggle('ligado');
        el.classList.add('pulando');
        try {
          const r = await CC.api('api/novidades/reagir', { id: el.dataset.celebrar });
          if (ev) { ev.euReagi = r.reagiu; ev.total = r.total; }
          el.querySelector('b').textContent = r.total || '';
          el.setAttribute('aria-pressed', r.reagiu);
        } catch (e) {
          el.classList.toggle('ligado');
          CC.avisar(e.message);
        }
      });
      raiz.querySelectorAll('.versiculo-mural').forEach((v) => {
        if (!CC.textoDoVersiculo) return;
        CC.textoDoVersiculo(v.dataset.ref).then((t) => { if (t) v.querySelector('.texto-versiculo').textContent = t; });
      });
      if (m.eventos) gravarLocal('cc.novidades.visto', String(Date.now()));
    };

    desenhar(cache, mural);
    // A resposta do servidor só redesenha se trouxe algo novo; e aí sem repetir a entrada, que
    // já tocou no primeiro desenho. Redesenhar igual fazia a tela piscar ao abrir o Feed.
    const celulasAgora = () => (CC.minhasCelulas ? CC.minhasCelulas() : []);
    const antes = JSON.stringify([cache, mural, celulasAgora()]);
    const jaMostrou = !!cache;
    Promise.all([CC.carregarAmigos(), CC.carregarNovidades()]).then(([d, n]) => {
      if (!/^#\/(amigos|novidades)\/?$/.test(location.hash)) return;
      if (CC.pintarTopo) CC.pintarTopo();
      if (d && JSON.stringify([d, n || mural, celulasAgora()]) === antes) return;
      if (jaMostrou) raiz.classList.add('sem-entrada');
      desenhar(d || cache, n || mural, d ? '' : 'Não consegui falar com o servidor agora.');
    });
  };
  CC.vistaNovidades = CC.vistaAmigos;

  CC.vistaBloqueados = function (raiz) {
    const desenhar = (d) => {
      const lista = (d && d.bloqueados) || [];
      raiz.innerHTML = CC.botaoVoltar('Juntos') + '<h1>Pessoas bloqueadas</h1>'
        + '<p class="passo-dica">Quem está aqui não vê você e não consegue te convidar.</p>'
        + (lista.length
          ? '<div class="lista-pedidos">' + lista.map((p) => '<div class="linha-amigo">' + retrato(p)
            + '<div class="quem-amigo"><b>' + CC.esc(p.nome) + '</b><span class="arroba">@' + CC.esc(p.usuario) + '</span></div>'
            + '<button class="botao contorno pequeno" data-desbloquear="' + CC.esc(p.usuario) + '">Desbloquear</button></div>').join('') + '</div>'
          : '<div class="vazio">Ninguém bloqueado.</div>');
      raiz.querySelectorAll('[data-desbloquear]').forEach((el) => {
        el.onclick = async () => { await acaoAmizade('desbloquear', el.dataset.desbloquear).catch(() => {}); recarregar(); };
      });
    };
    desenhar(cache);
    CC.carregarAmigos().then((d) => { if (location.hash.startsWith('#/amigos/bloqueados')) desenhar(d || cache); });
  };

  // Para a tela de configurações.
  CC.preferirNovidades = preferir;
})(window.CC);
