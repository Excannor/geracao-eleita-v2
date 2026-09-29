/* Desafios: os três do dia, praticar os versículos, o quadro do mês e a leitura da semana com os amigos.
   (O arquivo e a rota continuam com o nome antigo, "missões", para não quebrar links guardados.) */
(function (CC) {
  'use strict';

  const CORES_MES = ['verde', 'azul', 'roxo', 'vermelho', 'amarelo', 'turquesa'];
  const pct = (valor, alvo) => Math.max(0, Math.min(100, (valor / alvo) * 100)).toFixed(1) + '%';
  const ALVO_SEMANA = 4;

  // Uma linha de desafio: ícone num círculo, o texto, a barra e a conta numa pílula.
  // "de" é o valor de antes, para a barra andar até o de agora.
  CC.linhaMissao = (m, de) => {
    const inicio = de === undefined ? m.valor : Math.min(de, m.alvo);
    return '<div class="missao' + (m.feita ? ' feita' : '') + (de !== undefined && m.feita && inicio < m.alvo ? ' fechou-agora' : '') + '">'
      + '<span class="icone-missao" aria-hidden="true">' + CC.ico(m.feita ? 'certo' : m.icone) + '</span>'
      + '<div class="corpo-missao"><b>' + CC.esc(m.texto) + '</b>'
      + '<div class="progresso-missao"><div class="barra-missao"><i style="width:' + pct(inicio, m.alvo) + '" data-encher="' + pct(m.valor, m.alvo) + '"></i></div>'
      + '<span class="conta-selo" role="img" aria-label="' + m.valor + ' de ' + m.alvo + '">' + m.valor + '/' + m.alvo + '</span></div></div>'
      + '</div>';
  };

  // O quadro: nove peças, cada uma um recorte do mesmo retrato.
  CC.quadroHtml = (q, nova) => {
    const cor = CORES_MES[(Number(q.mes.slice(5, 7)) - 1) % CORES_MES.length];
    const cena = '<span class="cena-retrato">' + CC.personagemSvg(q.personagem) + '</span>';
    const pecas = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
      const revelada = q.pecas.includes(i);
      return '<span class="peca' + (revelada ? ' revelada' : '') + (i === nova ? ' nova' : '') + '" style="--r:' + Math.floor(i / 3) + ';--c:' + (i % 3) + '">'
        + '<span class="recorte' + (revelada ? '' : ' apagado') + '">' + cena + '</span></span>';
    }).join('');
    return '<div class="quadro c-' + cor + (q.completo ? ' completo' : '') + '" role="img" aria-label="Quadro de ' + CC.esc(q.nome) + ': '
      + q.quantas + ' de ' + CC.PECAS_QUADRO + ' peças">' + pecas + '</div>'
      + '<div class="barra-missao c-' + cor + ' barra-quadro"><i style="width:' + pct(Math.max(0, q.quantas - (nova === undefined ? 0 : 1)), CC.PECAS_QUADRO) + '" data-encher="'
      + pct(q.quantas, CC.PECAS_QUADRO) + '"></i><span>' + q.quantas + ' / ' + CC.PECAS_QUADRO + '</span></div>';
  };

  // Segunda-feira da semana de uma data, no formato do diário.
  const segundaDe = (data) => {
    const dia = new Date(data + 'T12:00:00').getDay();
    return CC.somaDias(data, -((dia + 6) % 7));
  };

  function missaoAmigos(dados) {
    if (!location.protocol.startsWith('http')) return '';
    const amigos = (dados && dados.amigos) || [];
    const titulo = CC.tituloSecao('Lendo junto na semana', 'até domingo');
    if (!dados) return titulo + '<div class="leitor-esqueleto"><i></i></div>';
    if (!amigos.length) {
      return titulo + '<div class="missao-convite">' + CC.ico('pessoas')
        + '<p>Leiam juntos 4 dias na mesma semana. Chame alguém para começar!</p>'
        + '<button class="botao pequeno" data-convidar>' + CC.ico('compartilhar') + 'Convidar</button></div>';
    }
    const eu = { usuario: (CC.quem || {}).usuario || 'eu', nome: String(CC.apelido() || (CC.quem || {}).nome || 'Você').trim(), foto: CC.foto() };
    const semana = segundaDe(CC.hojeIso());
    const juntos = { ...(CC.ler('semanasJuntos', {})) };
    let mudou = false;
    const linhas = amigos.map((a) => {
      const dias = Math.min(ALVO_SEMANA, (a.semana && a.semana.dias) || 0);
      const feita = dias >= ALVO_SEMANA;
      const chave = semana + ':' + a.usuario;
      const primeiro = CC.esc(a.nome.split(' ')[0]);
      if (feita && !juntos[chave]) { juntos[chave] = CC.hojeIso(); mudou = true; }
      return '<div class="missao missao-dupla' + (feita ? ' feita' : '') + '">'
        + '<div class="cabeca-dupla"><span class="dupla-mini">' + CC.retratoAmigo(eu, 'mini') + CC.retratoAmigo(a, 'mini') + '</span>'
        + '<span class="textos-dupla"><span>Desafio em dupla</span><b>Leiam juntos ' + ALVO_SEMANA + ' dias com ' + CC.esc(a.nome) + '</b></span></div>'
        // a barra é da dupla: conta os dias em que os dois leram, nunca quanto cada um leu
        + '<div class="progresso-missao"><div class="barra-missao"><i style="width:' + pct(dias, ALVO_SEMANA) + '"></i></div>'
        + '<span class="conta-selo" role="img" aria-label="' + dias + ' de ' + ALVO_SEMANA + ' dias">' + dias + '/' + ALVO_SEMANA + '</span></div>'
        + '<span class="estado-dupla">' + (a.leuHoje ? '<span class="selo-status leu">' + CC.ico('certo') + primeiro + ' já leu hoje</span>'
          : (a.toqueEnviado ? '<span class="selo-status">' + primeiro + ' foi encorajado hoje</span>'
            : '<button class="botao pequeno" data-encorajar="' + CC.esc(a.usuario) + '">' + CC.ico('aperto') + 'Encorajar ' + primeiro + '</button>')) + '</span>'
        + '</div>';
    }).join('');
    if (mudou) CC.gravar('semanasJuntos', juntos);
    return titulo + '<div class="lista-missoes">' + linhas + '</div>';
  }

  CC.vistaMissoes = function (raiz) {
    const { lista } = CC.conferirMissoes();
    const feitas = lista.filter((m) => m.feita).length;
    const horas = CC.horasAteAmanha();

    raiz.innerHTML = CC.cabecaTela('Desafios', {
      direita: '<button class="botao-redondo" data-renovam aria-label="Renovam em ' + CC.plural(horas, 'hora', 'horas') + '">' + CC.ico('relogio') + '</button>',
    })
      + '<section class="cabeca-missoes" aria-labelledby="titulo-desafios-hoje">'
      + '<div class="textos"><h2 id="titulo-desafios-hoje">Desafios de hoje</h2>'
      + '<p class="placar-missoes">' + feitas + ' de ' + lista.length + ' feitos</p>'
      + '<span class="renovam">' + CC.ico('relogio') + 'Renovam em ' + horas + ' h</span></div>'
      + '<span class="bau-cabeca">' + CC.arte.bau(feitas === lista.length ? 'aberto' : 'pronto') + '</span></section>'
      + '<section class="bloco-missoes" aria-label="Desafios do dia">'
      + '<div class="lista-missoes">' + lista.map((m) => CC.linhaMissao(m)).join('') + '</div></section>'
      // Praticar mora aqui: guardar versículos é o mesmo trabalho do "Guardar" da reflexão
      + '<a class="cartao-praticar" href="#/praticar"><span class="textos"><b>Praticar</b>'
      + '<small>Guarde os versículos das unidades num quiz rápido</small></span>'
      + '<span class="redondo-preto" aria-hidden="true">' + CC.ico('direita') + '</span></a>'
      + '<section class="bloco-missoes" id="missao-amigos">' + missaoAmigos(CC.amigosEmCache && CC.amigosEmCache()) + '</section>';

    raiz.querySelector('[data-renovam]').onclick = () => CC.avisar('Novos desafios em ' + CC.plural(horas, 'hora', 'horas') + '.');

    const ligarAmigos = () => {
      const b = raiz.querySelector('#missao-amigos [data-convidar]');
      if (b) b.onclick = () => CC.convidar();
      raiz.querySelectorAll('#missao-amigos [data-encorajar]').forEach((e) => {
        e.onclick = async () => {
          e.disabled = true;
          try {
            await CC.api('api/toques', { para: e.dataset.encorajar });
            e.outerHTML = '<span class="selo-status leu">' + CC.ico('certo') + 'Encorajado hoje</span>';
          } catch (erro) { e.disabled = false; CC.avisar(erro.message); }
        };
      });
    };
    ligarAmigos();
    if (CC.carregarAmigos) {
      CC.carregarAmigos().then((d) => {
        const alvo = raiz.querySelector('#missao-amigos');
        if (!alvo || !location.hash.startsWith('#/missoes')) return;
        alvo.innerHTML = missaoAmigos(d);
        ligarAmigos();
      });
    }
  };
})(window.CC);

