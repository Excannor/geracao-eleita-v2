/* Desafios de vários dias (aba Desafios): a pessoa entra num desafio, como "21 dias sem
   redes sociais", marca cada dia vencido e tem um estudo bíblico curto por dia (um trecho
   que abre no leitor, uma pergunta e um passo prático). Perder um dia não zera nada: os dias
   vencidos continuam valendo e a pessoa segue de onde parou. Concluir dá troféu.
   Os trechos foram conferidos na NBV; o texto bíblico não é copiado aqui, abre no leitor. */
(function (CC) {
  'use strict';

  CC.DESAFIOS = [
    {
      id: 'sem-redes-21',
      titulo: '21 dias sem redes sociais',
      dias: 21,
      resumo: 'Trocar o tempo de rolar a tela por um tempo com Deus.',
      desafio: 'Ficar longe de Instagram, TikTok e parecidos. Mensagem com amigos e família pode.',
      base: { texto: '“Posso fazer qualquer coisa que eu quiser”, mas algumas dessas coisas não são boas para mim.', ref: '1 Coríntios 6.12' },
      noLugar: 'Quando der vontade de abrir a rede, abra a leitura do dia.',
      dicas: ['Tire os apps da tela inicial do celular.', 'Avise os amigos que você vai dar um tempo.', 'Anote o que você fez com o tempo que sobrou.'],
      estudos: [
        ['Mateus 6.22-24', 'Jesus diz que os olhos são como uma luz para o corpo. O que os seus olhos mais viram nesta última semana?', 'Tire os apps de rede social da tela inicial do celular.'],
        ['Filipenses 4.8-9', 'Paulo pede para firmar os pensamentos no que é verdadeiro, puro e agradável. Quanto do que você via na rede entrava nessa lista?', 'Anote três coisas boas que aconteceram hoje e que ninguém postou.'],
        ['Salmos 101.2-3', 'O salmista diz que quer começar pela própria casa. Que parte da sua rotina você quer arrumar primeiro?', 'Passe 15 minutos com alguém da sua casa, sem celular por perto.'],
        ['1 Coríntios 6.12', 'Paulo diz que recusa o que pode ter domínio sobre ele. Em que momento do dia a vontade de abrir a rede aparece mais forte?', 'Quando essa vontade vier hoje, pare e faça uma oração curta.'],
        ['Efésios 5.15-17', 'Paulo pede para aproveitar cada oportunidade de fazer o bem. O que você fez de bom com o tempo que antes ia para a tela?', 'Use 20 minutos de hoje para ajudar alguém em alguma coisa.'],
        ['Salmos 139.13-14', 'Davi agradece por ter sido feito de maneira maravilhosa. A rede já te fez se comparar com alguém e achar que você vale menos?', 'Agradeça a Deus por uma coisa em você que ele fez com cuidado.'],
        ['Gálatas 1.10', 'Paulo diz que não está procurando agradar as pessoas, e sim a Deus. De quem você mais espera aprovação hoje?', 'Faça uma coisa boa hoje sem contar para ninguém.'],
        ['Lucas 10.38-42', 'Marta estava ocupada com muita coisa; Maria se sentou para ouvir Jesus. O que mais tira a sua atenção de Deus no dia a dia?', 'Separe dez minutos só para ler e ouvir, sem fazer mais nada junto.'],
        ['Marcos 1.35', 'Jesus acordou cedo e foi sozinho a um lugar deserto para orar. Onde fica o seu lugar quieto para falar com Deus?', 'Escolha um lugar e um horário para orar amanhã cedo.'],
        ['Provérbios 4.23', 'O texto diz que toda a vida depende do coração. O que tem entrado no seu coração pelos olhos e pelos ouvidos?', 'Escolha uma música de louvor para ouvir hoje com atenção.'],
        ['Romanos 12.2', 'Paulo pede para não imitar os costumes deste mundo. Que costume da rede você percebeu que tinha pegado sem querer?', 'Troque esse costume por outro hoje, de propósito.'],
        ['1 Samuel 16.7', 'Deus diz a Samuel que o homem vê a aparência exterior, mas o Senhor examina os pensamentos e as intenções. Como seria parar de medir as pessoas pela foto?', 'Elogie alguém hoje por uma coisa que não aparece na foto.'],
        ['Mateus 6.1-4', 'Jesus pede para não fazer o bem para ser admirado. O que muda quando ninguém vai ver, curtir ou comentar?', 'Faça um bem escondido hoje: ninguém precisa saber.'],
        ['Filipenses 4.11-13', 'Paulo aprendeu a viver contente tendo muito ou pouco. A rede te deixava contente ou sempre querendo mais?', 'Anote três coisas que você já tem e pelas quais quer agradecer.'],
        ['Salmos 46.10', 'Deus diz: fiquem quietos e saibam que eu sou Deus. Quando foi a última vez que você ficou em silêncio de verdade?', 'Fique cinco minutos em silêncio hoje, só lembrando quem Deus é.'],
        ['Hebreus 10.24-25', 'O texto pede para animar uns aos outros e não deixar de se reunir. Quem você não vê pessoalmente há muito tempo?', 'Combine de encontrar alguém ao vivo nesta semana.'],
        ['Tiago 1.19', 'Tiago pede para estar pronto para ouvir e demorar para falar e para ficar irado. Como isso vale para o que a gente comenta na internet?', 'Hoje, numa conversa, ouça até o fim antes de responder.'],
        ['Efésios 4.29', 'Paulo pede para dizer só o que é bom e útil para quem ouve. Suas palavras de hoje construíram ou derrubaram alguém?', 'Mande uma mensagem de ânimo para alguém que está passando por um momento difícil.'],
        ['Eclesiastes 4.9-10', 'O texto diz que, quando um cai, o outro ajuda a levantar. Quem você pode chamar para caminhar junto com você na fé?', 'Convide alguém para ler a Bíblia com você no app.'],
        ['Colossenses 3.1-2', 'Paulo pede para pôr os olhos nas coisas do alto. O que tem ocupado os seus pensamentos nesses dias?', 'Escreva uma coisa que você aprendeu com Deus nestes 20 dias.'],
        ['Filipenses 3.13-14', 'Paulo diz que esquece o passado e segue em frente. O que você quer levar deste desafio para depois dele?', 'Decida como vai ser o seu uso da rede daqui para frente e escreva isso.'],
      ],
    },
    {
      id: 'celular-cama-7',
      titulo: '7 dias sem celular na cama',
      dias: 7,
      resumo: 'A primeira coisa do dia é a Palavra, e não a tela.',
      desafio: 'O celular dorme longe da cama. Nada de tela ao deitar nem ao acordar.',
      base: { texto: 'Quando vou dormir, meu coração está em perfeita paz e tenho um sono tranquilo porque o Senhor me dá a mais perfeita segurança.', ref: 'Salmos 4.8' },
      noLugar: 'Uma oração curta antes de dormir e outra ao acordar.',
      dicas: ['Carregue o celular em outro cômodo.', 'Use um despertador comum.', 'Deixe a Bíblia ou um caderno do lado da cama.'],
      estudos: [
        ['Salmos 4.8', 'Davi dorme em paz porque o Senhor dá segurança. O que costuma tirar a sua paz na hora de dormir?', 'Hoje, antes de deitar, entregue a Deus em oração o que está te preocupando.'],
        ['Salmos 5.3', 'Davi faz a oração de manhã e fica esperando a resposta. O que você faz nos primeiros minutos depois de acordar?', 'Amanhã, antes de qualquer coisa, fale com Deus por dois minutos.'],
        ['Salmos 63.6-7', 'Davi, acordado de noite, fica pensando no Senhor. Quando o sono demora, em que você costuma pensar?', 'Se acordar ou demorar a dormir, lembre de uma coisa boa que Deus já fez por você.'],
        ['Lamentações 3.22-23', 'O texto diz que a misericórdia de Deus se renova a cada manhã. O que você quer deixar para trás de ontem?', 'Comece o dia agradecendo por uma coisa nova.'],
        ['Mateus 11.28-30', 'Jesus chama os cansados para descansar nele. Qual cansaço você carrega que não é só do corpo?', 'Deite hoje meia hora mais cedo que o normal.'],
        ['Salmos 127.2', 'O texto diz que o Senhor dá o sustento aos seus amados mesmo enquanto estão dormindo. O que você acha que precisa resolver por conta própria, sem deixar Deus cuidar?', 'Escreva essa preocupação num papel e deixe o papel fora do quarto.'],
        ['Provérbios 3.24', 'O texto promete um sono tranquilo, sem medo. O que mudou no seu sono nesta semana?', 'Decida onde o seu celular vai dormir daqui para frente.'],
      ],
    },
  ];

  // ---------- as contas (puras, sobre o estado) ----------
  const registro = (id, e) => ((e || CC.estado()).desafios || {})[id] || null;

  CC.situacaoDesafio = function (d, e, hoje) {
    hoje = hoje || CC.hojeIso();
    const r = registro(d.id, e);
    const dias = r ? [...new Set(r.dias || [])].sort() : [];
    const vencidos = Math.min(dias.length, d.dias);
    const venceuHoje = dias.includes(hoje);
    // Seguidos: dias vencidos em sequência até hoje (ou até ontem, se hoje ainda não venceu).
    let seguidos = 0;
    let dia = venceuHoje ? hoje : CC.somaDias(hoje, -1);
    while (dias.includes(dia)) { seguidos++; dia = CC.somaDias(dia, -1); }
    const concluido = !!(r && r.concluidoEm) || vencidos >= d.dias;
    // O estudo do dia: o de hoje, se já venceu hoje; senão o próximo.
    const numero = Math.min(d.dias, venceuHoje ? vencidos : vencidos + 1);
    return {
      ativo: !!(r && r.ativo) && !concluido, concluido, vencidos, faltam: d.dias - vencidos,
      seguidos, venceuHoje, numero, estudo: d.estudos[numero - 1],
      escapou: !!(r && r.ativo) && !venceuHoje && vencidos > 0 && !dias.includes(CC.somaDias(hoje, -1)),
    };
  };

  function gravarRegistro(id, mudar) {
    const todos = { ...(CC.estado().desafios || {}) };
    const atual = todos[id] || { inicio: CC.hojeIso(), dias: [], ativo: false, concluidoEm: '' };
    todos[id] = { ...mudar({ ...atual, dias: [...(atual.dias || [])] }), em: Date.now() };
    CC.gravar('desafios', todos);
  }

  // ---------- telas ----------
  const selo = (t) => '<span class="dsf-selo">' + CC.esc(t) + '</span>';

  function cartaoAtivo(d) {
    const s = CC.situacaoDesafio(d);
    return '<button type="button" class="dsf-card" data-desafio="' + d.id + '">'
      + '<span class="dsf-topo"><span class="dsf-linha">' + selo(d.dias + ' dias')
      + (s.seguidos ? '<span class="dsf-dias">' + CC.plural(s.seguidos, 'dia seguido', 'dias seguidos') + '</span>' : '') + '</span>'
      + '<b class="dsf-nome">' + CC.esc(d.titulo) + '</b></span>'
      + '<span class="dsf-corpo"><span class="dsf-stats">'
      + '<span><b>' + s.seguidos + '</b><small>Seguidos</small></span>'
      + '<span><b>' + s.vencidos + '</b><small>Vencidos</small></span>'
      + '<span><b>' + s.faltam + '</b><small>Faltam</small></span></span>'
      + '<span class="dsf-acao' + (s.venceuHoje ? ' feito' : '') + '">' + (s.venceuHoje ? 'Hoje vencido ✓' : 'Ver o estudo do dia ' + s.numero) + '</span>'
      + '<span class="dsf-barra"><i style="width:' + Math.round((s.vencidos / d.dias) * 100) + '%"></i></span>'
      + '<span class="dsf-pe">' + s.vencidos + ' de ' + d.dias + ' dias vencidos</span></span></button>';
  }

  function linhaNovo(d) {
    const s = CC.situacaoDesafio(d);
    return '<button type="button" class="dsf-item" data-desafio="' + d.id + '"><span><b>' + CC.esc(d.titulo) + '</b>'
      + '<small>' + CC.esc(s.concluido ? 'Concluído' : s.vencidos ? 'Pausado · ' + s.vencidos + ' de ' + d.dias + ' dias vencidos' : d.resumo) + '</small></span>'
      + '<span class="dsf-n">' + (s.concluido ? CC.ico('trofeu') : d.dias + ' dias') + '</span></button>';
  }

  // O bloco que entra na aba Desafios, acima dos desafios do dia.
  CC.blocoDesafiosLongos = function () {
    const ativos = CC.DESAFIOS.filter((d) => CC.situacaoDesafio(d).ativo);
    const outros = CC.DESAFIOS.filter((d) => !CC.situacaoDesafio(d).ativo);
    return (ativos.length ? '<div class="titulo-bloco"><h2>Meus desafios</h2></div>' + ativos.map(cartaoAtivo).join('') : '')
      + (outros.length ? '<div class="titulo-bloco"><h2>' + (ativos.length ? 'Começar um novo' : 'Desafios de consagração') + '</h2></div>'
        + '<div class="dsf-lista">' + outros.map(linhaNovo).join('') + '</div>' : '');
  };

  CC.ligarDesafiosLongos = function (raiz, redesenhar) {
    raiz.querySelectorAll('[data-desafio]').forEach((b) => {
      b.onclick = () => folhaDesafio(CC.DESAFIOS.find((d) => d.id === b.dataset.desafio), redesenhar);
    });
  };

  function folhaDesafio(d, redesenhar) {
    if (!d) return;
    const s = CC.situacaoDesafio(d);
    const sobre = '<p class="passo-dica">' + CC.esc(d.desafio) + '</p>'
      + '<blockquote class="dsf-base">' + CC.esc(d.base.texto) + ' <cite>' + CC.esc(d.base.ref) + '</cite></blockquote>'
      + '<p><b>No lugar disso:</b> ' + CC.esc(d.noLugar) + '</p>'
      + '<ul class="dsf-dicas">' + d.dicas.map((x) => '<li>' + CC.esc(x) + '</li>').join('') + '</ul>';
    let corpo;
    if (s.ativo) {
      const [ref, pergunta, passo] = s.estudo;
      corpo = (s.escapou ? '<p class="aviso-cadeado">Escapou um dia? Tudo bem. Os dias que você venceu continuam valendo. Siga de onde parou.</p>' : '')
        + '<div class="dsf-estudo"><span class="etiqueta">Estudo do dia ' + s.numero + ' de ' + d.dias + '</span>'
        + '<a class="botao contorno" href="' + CC.hrefDoVerso(ref) + '" data-fechar-e-ler>' + CC.ico('livro') + 'Ler ' + CC.esc(ref) + '</a>'
        + '<p><b>Para pensar:</b> ' + CC.esc(pergunta) + '</p>'
        + '<p><b>Hoje:</b> ' + CC.esc(passo) + '</p></div>'
        + '<div class="acoes">' + (s.venceuHoje
          ? '<button class="botao contorno" disabled>Hoje vencido ✓</button>'
          : '<button class="botao azul" data-vencer>Vencer o dia de hoje</button>')
        + '</div>'
        + '<details class="dsf-sobre"><summary>Sobre o desafio</summary>' + sobre + '</details>'
        + '<div class="acoes"><button class="botao plano" data-pausar>Deixar para depois</button><button class="botao plano" data-fechar>Fechar</button></div>';
    } else if (s.concluido) {
      corpo = '<p class="aviso-cadeado">' + CC.ico('trofeu') + ' Você concluiu este desafio. O troféu está no seu Perfil.</p>' + sobre
        + '<div class="acoes"><button class="botao plano" data-fechar>Fechar</button></div>';
    } else {
      corpo = sobre + (s.vencidos ? '<p class="passo-dica">Você já venceu ' + CC.plural(s.vencidos, 'dia', 'dias') + '. Continue de onde parou.</p>' : '')
        + '<p class="passo-dica pequena">Todo dia tem um estudo curto: um trecho da Bíblia, uma pergunta e um passo prático.</p>'
        + '<div class="acoes"><button class="botao azul" data-comecar>' + (s.vencidos ? 'Continuar' : 'Começar hoje') + '</button>'
        + '<button class="botao plano" data-fechar>Agora não</button></div>';
    }
    CC.folha('<span class="etiqueta">' + d.dias + ' dias</span><h2>' + CC.esc(d.titulo) + '</h2>' + corpo, {
      rotulo: d.titulo,
      rolavel: true,
      ligar: (folha, fechar) => {
        const q = (sel) => folha.querySelector(sel);
        folha.querySelectorAll('[data-fechar]').forEach((b) => { b.onclick = fechar; });
        if (q('[data-fechar-e-ler]')) q('[data-fechar-e-ler]').addEventListener('click', () => fechar());
        if (q('[data-comecar]')) q('[data-comecar]').onclick = () => {
          gravarRegistro(d.id, (r) => ({ ...r, ativo: true }));
          fechar(); redesenhar(); folhaDesafio(d, redesenhar);
        };
        if (q('[data-pausar]')) q('[data-pausar]').onclick = () => {
          gravarRegistro(d.id, (r) => ({ ...r, ativo: false }));
          fechar(); redesenhar(); CC.avisar('Pausado. Os dias vencidos ficam guardados.');
        };
        if (q('[data-vencer]')) q('[data-vencer]').onclick = () => {
          const hoje = CC.hojeIso();
          let terminou = false;
          gravarRegistro(d.id, (r) => {
            if (!r.dias.includes(hoje)) r.dias.push(hoje);
            if (r.dias.length >= d.dias && !r.concluidoEm) { r.concluidoEm = hoje; r.ativo = false; terminou = true; }
            return r;
          });
          CC.vibrar && CC.vibrar('sucesso');
          fechar(); redesenhar();
          CC.avisar(terminou ? 'Desafio concluído! Troféu novo no seu Perfil.' : 'Dia vencido. Continue firme!');
        };
      },
    });
  }
})(window.CC);
