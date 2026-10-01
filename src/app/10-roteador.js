/* Roteador, topo, navegação e partida do aplicativo. */
(function (CC) {
  'use strict';

  const conteudo = document.getElementById('conteudo');
  const topo = document.getElementById('topo');
  const navegacao = document.getElementById('navegacao');

  // A barra muda de cara com quem está falando: Desafios sai do lugar quando entra Célula ou
  // Discipulado (aí mora dentro do Mais), e some de vez o Explorar, que virou item do Mais.
  // Praticar mora dentro de Desafios e no fim de cada unidade da trilha. O Perfil saiu daqui:
  // virou o retrato no canto do topo (pintarTopo).
  //   nada:        Trilha · Desafios          | Bíblia | Juntos · Mais
  //   só célula:   Trilha · Célula            | Bíblia | Juntos · Mais
  //   só disc.:    Trilha · Discipulado       | Bíblia | Juntos · Mais
  //   os dois:     Trilha · Juntos · Célula   | Bíblia | Discipulado · Mais
  // No caso dos dois o Juntos passa para a esquerda: "DISCIPULADO" não cabe ao lado de
  // "JUNTOS" a 320px, e são 6 botões em vez de 5.
  const TRILHA = ['#/', 'Trilha', 'trilha', 'trilha'];
  const DESAFIOS = ['#/missoes', 'Desafios', 'bau', 'desafios'];
  const JUNTOS = ['#/novidades', 'Juntos', 'novidades', 'juntos'];
  const CELULA = ['#/celula', 'Célula', 'casa', 'celula'];
  const DISCIPULADO = ['#/discipulado', 'Discipulado', 'dupla', 'discipulado'];
  const EXPLORAR = ['#/explorar', 'Explorar', 'bussola', 'explorar'];

  function estadoDaBarra() {
    return {
      temCelula: !!(CC.minhasCelulas && CC.minhasCelulas().length),
      temDiscipulado: !!(CC.temDiscipulado && CC.temDiscipulado()),
    };
  }

  // As abas do celular, já na ordem visual: uma ilha de cada lado da Bíblia. O Mais mora
  // sempre por último, na ilha da direita.
  function abasDoCelular({ temCelula, temDiscipulado }) {
    if (temCelula && temDiscipulado) return { esq: [TRILHA, JUNTOS, CELULA], dir: [DISCIPULADO, null] };
    if (temCelula) return { esq: [TRILHA, CELULA], dir: [JUNTOS, null] };
    if (temDiscipulado) return { esq: [TRILHA, DISCIPULADO], dir: [JUNTOS, null] };
    return { esq: [TRILHA, DESAFIOS], dir: [JUNTOS, null] };
  }
  // null é o marcador do botão Mais: ele não é um item de dados como os outros (não tem
  // rota própria, abre um painel), então entra por fora do array de abas comuns.

  const ABA_DA_ROTA = {
    '': '#/', dia: '#/', passos: '#/', licoes: '#/', praticar: '#/missoes', missoes: '#/missoes',
    amigos: '#/novidades', novidades: '#/novidades',
    celula: '#/celula',
    discipulado: '#/discipulado',
    // O Explorar não é mais aba própria: mora dentro do Mais, mas continua marcando o Mais
    // como selecionado enquanto a pessoa está nele (ver maisSelecionado, abaixo).
    explorar: '#/explorar', secao: '#/explorar', nota: '#/explorar', busca: '#/explorar',
    // O Conhecer Jesus mora na Trilha (troca de lugar com o plano anual para quem está
    // nesse caminho); as perguntas honestas são material de consulta, como o Explorar.
    conhecer: '#/', seguir: '#/', perguntas: '#/explorar',
    // A caixa do sino abre do Início.
    avisos: '#/',
    // Apoiar também mora no Mais: marca o Mais como selecionado, como o Explorar.
    apoiar: '#/explorar',
    // Perfil e Config não apontam para nenhuma das abas da barra: quem marca o retrato
    // do topo como selecionado é pintarTopo, lendo a rota direto.
    perfil: '#/perfil', config: '#/perfil',
    // não aponta para nenhuma aba: assim nenhuma fica marcada como selecionada enquanto a
    // Bíblia está aberta, e o botão central cuida da sua própria marcação.
    biblia: '#/biblia',
  };

  const lerLocal = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const gravarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* segue */ } };

  let ultimaRota = null;

  function partesDaRota() {
    const bruto = (location.hash || '#/').slice(2);
    const [caminho, consulta] = bruto.split('?');
    const partes = caminho.split('/').filter(Boolean).map(decodeURIComponent);
    return { rota: partes[0] || '', arg: partes.slice(1).join('/'), consulta };
  }

  // ---------- topo ----------
  // Só o fogo com os dias, em todas as telas. Dias lidos, escudos e o sino saíram: o
  // topo parecia placar até dentro de uma nota de estudo. Tocar no fogo abre a semana,
  // os escudos e o recorde; as novidades dos amigos aparecem como ponto na aba Juntos.
  let ofensivaAnterior = null;

  let topoDesenhado = '';
  function pintarTopo() {
    const seq = CC.sequencia();
    const subiu = ofensivaAnterior !== null && seq.atual > ofensivaAnterior;
    ofensivaAnterior = seq.atual;

    // O Perfil saiu da barra de baixo e virou este retrato redondo no canto do topo, ao
    // lado do fogo. `pintarTopo` não recebe a rota do roteador: lê direto daqui, e o
    // estado de selecionado entra no próprio HTML para o cache abaixo redesenhar ao mudar.
    const rota = partesDaRota().rota;
    const naContaOuConfig = rota === 'perfil' || rota === 'config';
    const foto = CC.foto();
    const retrato = foto ? '<img class="retrato-topo" src="' + CC.esc(foto) + '" alt="">' : CC.icoAba('pessoa');

    const html = '<div class="estatisticas">'
      + '<button class="contador ofensiva' + (seq.atual ? ' ativo' : '') + (seq.feitoHoje ? ' hoje' : '') + (subiu ? ' subiu' : '')
      + '" data-ofensiva aria-label="' + CC.plural(seq.atual, 'dia', 'dias') + ' de ofensiva, ' + CC.estagioDaChama(seq.atual).nome + '">'
      + CC.icoChama(seq.atual)
      + '<span>' + seq.atual + '</span><small>' + (seq.atual === 1 ? 'dia' : 'dias') + '</small></button>'
      + '</div>'
      + '<button class="perfil-topo' + (naContaOuConfig ? ' selecionado' : '') + '" data-ir="#/perfil" aria-label="Perfil"'
      + (naContaOuConfig ? ' aria-current="page"' : '') + '>' + retrato + '</button>';
    if (html === topoDesenhado && topo.firstChild) return;
    topoDesenhado = html;
    topo.innerHTML = html;
    topo.querySelectorAll('[data-ofensiva]').forEach((b) => { b.onclick = CC.folhaOfensiva; });
    topo.querySelectorAll('[data-ir]').forEach((el) => {
      el.onclick = () => {
        CC.vibrar('leve');
        if (location.hash === el.dataset.ir) { CC.redesenhar(); CC.rolarPara(0); } else location.hash = el.dataset.ir;
      };
    });
  }
  CC.pintarTopo = pintarTopo;

  // ---------- folha da ofensiva ----------
  CC.folhaOfensiva = function () {
    const seq = CC.sequencia();
    const hoje = CC.hojeIso();
    const feitas = CC.datasFeitas();
    const semana = [6, 5, 4, 3, 2, 1, 0].map((atras) => {
      const d = CC.somaDias(hoje, -atras);
      let estado = '';
      if (feitas.has(d)) estado = 'feito';
      else if (seq.protegidos.includes(d)) estado = 'escudo';
      else if (atras === 0) estado = 'hoje';
      return '<span class="bolinha ' + estado + '"><i>'
        + (estado === 'feito' ? CC.ico('certo') : (estado === 'escudo' ? CC.ico('escudo') : '')) + '</i>'
        + '<b>' + CC.diaDaSemana(d) + '</b></span>';
    }).join('');
    const amigos = (CC.amigosEmCache() || {}).amigos || [];

    const lema = CC.fraseDaOfensiva();
    CC.folha('<div class="folha-ofensiva">'
      + '<div class="chama-grande' + (seq.atual ? '' : ' apagada') + '">' + CC.icoChama(seq.atual) + '<b>' + seq.atual + '</b>'
      + '<span>' + (seq.atual === 1 ? 'dia de ofensiva' : 'dias de ofensiva') + (seq.atual ? '!' : '') + '</span></div>'
      // O carimbo vem logo abaixo da contagem, na arte do onboarding: uma frase sorteada
      // (CC.FRASES_OFENSIVA), com a referência em cima quando é versículo, como no portal.
      // Só o carimbo, sem texto corrido embaixo: o dono quer a frase sozinha, motivando.
      + (lema.ref ? '<span class="selo-ref">' + CC.esc(lema.ref) + '</span>' : '')
      + '<div class="selo-lema selo-ofensiva" data-linhas="' + lema.linhas.length + '">'
      + lema.linhas.map((l) => '<span class="selo-linha">' + CC.esc(l) + '</span>').join('')
      + '</div>'
      + (seq.atual === 0 ? '<p class="passo-dica">Leia hoje para acender o seu fogo.</p>'
        : (seq.feitoHoje ? '' : '<p class="passo-dica">A lenha de hoje ainda não entrou. Leia para manter o fogo aceso!</p>'))
      + '<div class="semana-bolinhas">' + semana + '</div>'
      + '<p class="linha-escudos">' + [0, 1].map((i) => '<i class="' + (i < seq.escudos ? 'tem' : '') + '">' + CC.ico('escudo') + '</i>').join('')
      + '<span><b>' + CC.plural(seq.escudos, 'escudo', 'escudos') + '.</b> Um dia em branco usa um. Você ganha um todo mês e outro a cada 7 dias seguidos.</span></p>'
      + '<p class="linha-recorde"><span>Recorde</span><b>' + CC.plural(seq.recorde, 'dia', 'dias') + '</b></p>'
      + (seq.recorde >= 7 ? '<p class="passo-dica pequena marcas-barro">Seu recorde guarda até onde você já chegou. Até aqui o Senhor nos ajudou! (1Sm 7.12)</p>' : '')
      + (amigos.length
        ? '<span class="etiqueta">Lendo junto</span><div class="lista-proposito">'
          + amigos.map((a) => '<span class="pessoa-proposito">' + CC.retratoAmigo(a, 'pequeno') + '<span class="quem"><b>'
            + CC.esc(a.nome) + '</b><span class="estado">' + CC.icoChama() + a.dias + '</span></span></span>').join('') + '</div>'
        : '')
      + '<div class="acoes"><button class="botao contorno" data-ver-amigos>Ver amigos</button></div>'
      + '</div>',
    {
      rotulo: 'Ofensiva',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-ver-amigos]').onclick = () => { fechar(); location.hash = '#/novidades'; };
        // A frase do carimbo é sorteada (CC.FRASES_OFENSIVA), de 2 a 6 linhas. O tamanho de
        // partida já vem do CSS pela quantidade de linhas (data-linhas): frase curta em letra
        // grande, frase longa menor, para não virar um cartaz que empurra a folha inteira.
        // Se a linha mais larga ainda não couber, o carimbo TODO encolhe junto, na mesma
        // medida: linhas de tamanhos diferentes davam aparência de carimbo remendado.
        const selo = folha.querySelector('.selo-ofensiva');
        const linhas = [...selo.querySelectorAll('.selo-linha')];
        let tamanho = parseFloat(getComputedStyle(linhas[0]).fontSize);
        const minimo = tamanho * 0.7;
        for (let i = 0; i < 14 && tamanho > minimo && linhas.some((l) => l.scrollWidth > l.clientWidth + 1); i++) {
          tamanho *= 0.95;
          selo.style.setProperty('--tam-selo', tamanho + 'px');
        }
      },
    });
  };

  // ---------- painel do Mais ----------
  // Um painel por cima da barra (não a tela cheia da folha comum: a barra continua à vista
  // por baixo do véu, como no mock aprovado). Fecha tocando fora, no próprio Mais, com Escape
  // ou com o voltar do celular — por isso o history.pushState/back só para ele.
  let painelMaisAberto = false;
  function fecharPainelMais(semVoltar) {
    if (!painelMaisAberto) return;
    painelMaisAberto = false;
    document.querySelectorAll('.veu-mais, .painel-mais').forEach((el) => CC.sair(el, 200));
    if (!semVoltar && history.state && history.state.painelMais) history.back();
  }
  CC.fecharPainelMais = fecharPainelMais;

  // O painel empilha uma entrada no histórico (para o voltar do celular fechá-lo). Se a
  // pessoa sai do painel indo para outra tela, essa entrada tem de ser TROCADA pelo destino,
  // senão o próximo voltar cai nela, na mesma tela, e parece que o botão não funciona.
  function irSemFantasma(destino) {
    if (history.state && history.state.painelMais) location.replace(destino);
    else location.hash = destino;
  }

  function itemPainelMais(icone, leve, rotulo, sub, href) {
    return '<a href="' + href + '" data-ir-mais="' + href + '"><span class="q' + (leve ? ' leve' : '') + '">' + icone + '</span>'
      + '<span>' + CC.esc(rotulo) + (sub ? '<small>' + CC.esc(sub) + '</small>' : '') + '</span></a>';
  }

  function abrirPainelMais(desafiosNoPainel) {
    if (painelMaisAberto) { fecharPainelMais(); return; }
    painelMaisAberto = true;
    const itens = [];
    if (desafiosNoPainel) {
      const lista = CC.missoesDoDia ? CC.missoesDoDia(CC.hojeIso(), CC.estado()) : [];
      const feitas = lista.filter((m) => m.feita).length;
      const sub = feitas && lista.length ? feitas + ' de ' + lista.length + ' desafios de hoje concluídos' : 'Complete os três desafios de hoje';
      itens.push(itemPainelMais(CC.icoAba('bau'), false, 'Desafios', sub, '#/missoes'));
    }
    itens.push(itemPainelMais(CC.icoAba('bussola'), true, 'Explorar', 'Temas, pessoas e lugares da Bíblia', '#/explorar'));
    itens.push(itemPainelMais(CC.icoAba('marcador'), true, 'Meus versículos', '', '#/perfil/versiculos'));
    itens.push(itemPainelMais(CC.icoAba('caneta'), true, 'Minha história com Deus', '', '#/perfil/historia'));
    itens.push(itemPainelMais(CC.ico('aperto'), true, 'Apoiar o app', 'Doação opcional pelo Pix', '#/apoiar'));
    itens.push(itemPainelMais(CC.ico('engrenagem'), true, 'Configurações', 'Tema, notificações e conta', '#/config'));
    document.body.insertAdjacentHTML('beforeend', '<div class="veu-mais"></div><div class="painel-mais" role="dialog" aria-modal="true" aria-label="Mais">' + itens.join('') + '</div>');
    document.querySelector('.veu-mais').onclick = () => fecharPainelMais();
    document.querySelectorAll('[data-ir-mais]').forEach((a) => {
      a.onclick = (ev) => {
        ev.preventDefault();
        painelMaisAberto = false;
        document.querySelectorAll('.veu-mais, .painel-mais').forEach((el) => CC.sair(el, 200));
        CC.vibrar('leve');
        irSemFantasma(a.dataset.irMais);
      };
    });
    history.pushState({ painelMais: true }, '', location.href);
  }
  addEventListener('popstate', () => { if (painelMaisAberto) fecharPainelMais(true); });
  addEventListener('hashchange', () => { if (painelMaisAberto) fecharPainelMais(true); });

  function pintarNavegacao(rotaPedida, argPedido) {
    let rota = rotaPedida;
    let arg = argPedido;
    if (rota === undefined) { const p = partesDaRota(); rota = p.rota; arg = p.arg; }
    const { temCelula, temDiscipulado } = estadoDaBarra();
    const { esq, dir } = abasDoCelular({ temCelula, temDiscipulado });
    const desafiosNaBarra = !temCelula && !temDiscipulado;
    const dono = (CC.quem && CC.quem.usuario) || '';
    const chaveNova = (papel) => 'cc.novaaba.' + papel + ':' + dono;

    let ativa = ABA_DA_ROTA[rota] || '#/';
    if ((rota === 'novidades' || rota === 'amigos') && arg && arg.startsWith('celula/')) ativa = '#/celula';
    if (rota === 'perfil' && arg === 'discipulado') ativa = '#/discipulado';
    const naBiblia = rota === 'biblia';
    const pendencias = CC.pendenciasDeAmigos ? CC.pendenciasDeAmigos() : 0;
    // Meus versículos e Minha história abrem pelo Mais; vindo de lá (e não do Perfil), o Mais fica aceso.
    const anteriorNav = pilha.length >= 2 ? pilha[pilha.length - 2] : '';
    const doMais = rota === 'perfil' && (arg === 'versiculos' || arg === 'historia') && !anteriorNav.startsWith('#/perfil');
    const maisSelecionado = !naBiblia && (doMais || ativa === '#/explorar' || (!desafiosNaBarra && ativa === '#/missoes'));
    const pontoMais = !desafiosNaBarra && !!(CC.haDesafioPendenteHoje && CC.haDesafioPendenteHoje());
    const pontoCelula = temCelula && !lerLocal(chaveNova('celula'));
    const pontoDiscipulado = temDiscipulado && !lerLocal(chaveNova('discipulado'));
    // Uma vez que a pessoa chegou na aba, o pontinho de novidade não aparece nunca mais.
    if (ativa === '#/celula') gravarLocal(chaveNova('celula'), '1');
    if (ativa === '#/discipulado') gravarLocal(chaveNova('discipulado'), '1');

    const aba = ([href, rotulo, icone, papel], soTrilho) => {
      const sel = href === ativa;
      const ponto = (papel === 'juntos' && pendencias) || (papel === 'celula' && pontoCelula) || (papel === 'discipulado' && pontoDiscipulado)
        ? '<i class="ponto-aba"></i>' : '';
      return '<button type="button" class="aba' + (sel ? ' selecionada' : '') + (soTrilho ? ' so-trilho' : '') + '" data-papel="' + papel + '" data-ir="' + href + '"'
        + (sel ? ' aria-current="page"' : '') + ' aria-label="' + CC.esc(rotulo) + '"><span class="icone-aba">' + CC.icoAba(icone) + ponto + '</span>'
        + '<span class="rotulo-aba">' + rotulo + '</span></button>';
    };

    const botaoMais = () => {
      const ponto = pontoMais ? '<i class="ponto-aba"></i>' : '';
      return '<button type="button" class="aba' + (maisSelecionado ? ' selecionada' : '') + '" data-papel="mais" data-abrir-mais'
        + (maisSelecionado ? ' aria-current="page"' : '') + ' aria-label="Mais"><span class="icone-aba">' + CC.icoAba('mais') + ponto + '</span>'
        + '<span class="rotulo-aba">Mais</span></button>';
    };

    const lado = (itens) => itens.map((t) => (t === null ? botaoMais() : aba(t))).join('');
    const biblia = '<button type="button" class="aba aba-central' + (naBiblia ? ' selecionada' : '') + '" data-papel="biblia" data-ir="#/biblia" aria-label="Bíblia"'
      + (naBiblia ? ' aria-current="page"' : '') + '><span class="icone-aba">' + CC.icoAba('livro') + '</span>'
      + '<span class="rotulo-aba">Bíblia</span></button>';
    // Fantasmas: só existem para o trilho lateral (>= 860px), que sempre mostra Desafios e
    // Explorar mesmo quando o celular os escondeu dentro do Mais ou trocou por Célula/
    // Discipulado. .so-trilho fica invisível no celular (ver estilo.css).
    const fantasmaDesafios = desafiosNaBarra ? '' : aba(DESAFIOS, true);
    const fantasmaExplorar = aba(EXPLORAR, true);

    // Duas ilhas em pílula, uma de cada lado do botão da Bíblia: no trilho lateral (>= 860px)
    // .ilha vira `display: contents` e some do layout, e a ordem visual passa a ser dada por
    // `order` (ver @media (min-width: 860px) perto do fim do estilo.css), não mais pela
    // ordem no HTML — que no celular muda de caso para caso (ver abasDoCelular).
    navegacao.innerHTML = '<a class="marca-lateral" href="#/">'
      + '<span class="simbolo">' + CC.icoLogo() + '</span>'
      + '<span>Geração <em>Eleita</em></span></a>'
      + '<div class="ilha">' + lado(esq) + '</div>'
      + biblia
      + '<div class="ilha">' + lado(dir) + '</div>'
      + fantasmaDesafios + fantasmaExplorar;
    navegacao.classList.toggle('cheia', esq.length + dir.length + 1 === 6);
    navegacao.querySelectorAll('[data-ir]').forEach((el) => {
      el.onclick = () => {
        CC.vibrar('leve');
        if (painelMaisAberto) { painelMaisAberto = false; document.querySelectorAll('.veu-mais, .painel-mais').forEach((x) => CC.sair(x, 200)); }
        if (location.hash === el.dataset.ir && !(history.state && history.state.painelMais)) { CC.redesenhar(); CC.rolarPara(0); } else irSemFantasma(el.dataset.ir);
      };
    });
    const botao = navegacao.querySelector('[data-abrir-mais]');
    if (botao) botao.onclick = () => { CC.vibrar('leve'); abrirPainelMais(!desafiosNaBarra); };
  }
  CC.pintarNavegacao = pintarNavegacao;

  // A ordem visual do celular, achatada, para o cálculo de "de que lado a tela entra"
  // (entradaDaTela) — muda de caso para caso, então não dá para usar um array fixo.
  function ordemDasAbas() {
    const { esq, dir } = abasDoCelular(estadoDaBarra());
    return esq.concat(dir).filter(Boolean).map((t) => t[0]);
  }

  // ---------- roteamento ----------
  const PERFIL = () => ({
    escritos: CC.vistaEscritos, livros: CC.vistaLivros, conquistas: CC.vistaConquistas,
    trofeus: CC.vistaTrofeus, versiculos: CC.vistaVersiculos, discipulado: CC.vistaDiscipulado,
    historia: CC.vistaHistoria,
  });

  // ---------- o caminho percorrido, para o botão de voltar dizer a verdade ----------
  // O voltar do topo é o "voltar" do navegador, mas o nome escrito nele era fixo ("Perfil",
  // "Juntos"). Com a barra nova as mesmas telas abrem por outros caminhos (o Mais, por
  // exemplo), e o botão dizia um lugar e levava a outro. A pilha abaixo acompanha as telas
  // visitadas: quando o voltar vai dar em outro lugar, o botão passa a dizer só "Voltar"; e
  // quando não há para onde voltar (app aberto direto numa tela), ele leva ao lugar escrito.
  const pilha = [];
  let substituirRota = false;
  CC.substituirRota = (destino) => { substituirRota = true; location.replace(destino); };
  function anotarCaminho() {
    const h = location.hash || '#/';
    if (pilha[pilha.length - 1] === h) return;
    if (substituirRota && pilha.length) pilha[pilha.length - 1] = h;
    else if (pilha.length >= 2 && pilha[pilha.length - 2] === h) pilha.pop();
    else pilha.push(h);
    substituirRota = false;
    if (pilha.length > 60) pilha.splice(0, pilha.length - 60);
  }
  const DESTINO_DO_ROTULO = {
    'Trilha': (h) => h === '#/' || h === '#' || h === '',
    'Perfil': (h) => h === '#/perfil',
    'Juntos': (h) => h === '#/novidades',
    'Explorar': (h) => h === '#/explorar',
    'Configurações': (h) => h === '#/config',
    'Bíblia': (h) => h === '#/biblia',
    'Primeiros passos': (h) => h === '#/licoes',
  };
  const ENDERECO_DO_ROTULO = { 'Trilha': '#/', 'Perfil': '#/perfil', 'Juntos': '#/novidades', 'Explorar': '#/explorar',
    'Configurações': '#/config', 'Bíblia': '#/biblia', 'Primeiros passos': '#/licoes' };
  // Muitas telas (Discipulado, Painel, Notificações, Perfil...) só desenham o voltar DEPOIS
  // que os dados chegam, quando o roteador já tinha passado. Ligar o clique botão a botão
  // deixava esses mortos. Por isso: o nome é acertado por um observador assim que o botão
  // aparece, e o toque é tratado por um único ouvinte na área de conteúdo, que vale para
  // qualquer voltar, desenhado a qualquer momento.
  const anteriorNaPilha = () => (pilha.length >= 2 ? pilha[pilha.length - 2] : null);
  function rotularVoltar(el) {
    if (el.dataset.rotuloVoltar) return;
    const rotulo = el.textContent.trim();
    el.dataset.rotuloVoltar = rotulo;
    const anterior = anteriorNaPilha();
    const confere = DESTINO_DO_ROTULO[rotulo];
    if (anterior && confere && !confere(anterior)) {
      // Vai voltar para outra tela: o nome fixo mentiria.
      [...el.childNodes].forEach((n) => { if (n.nodeType === 3) n.remove(); });
      el.append('Voltar');
    }
  }
  function ligarVoltarDoTopo(raiz) {
    raiz.querySelectorAll('[data-voltar]').forEach(rotularVoltar);
  }
  CC.ligarVoltarDoTopo = ligarVoltarDoTopo;
  new MutationObserver(() => ligarVoltarDoTopo(conteudo)).observe(conteudo, { childList: true, subtree: true });
  conteudo.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-voltar]');
    // Um voltar com comportamento próprio (onclick posto pela tela) segue o dele.
    if (!el || !conteudo.contains(el) || el.onclick) return;
    ev.preventDefault();
    if (anteriorNaPilha()) history.back();
    else location.hash = ENDERECO_DO_ROTULO[el.dataset.rotuloVoltar || el.textContent.trim()] || '#/';
  });

  function rotear() {
    anotarCaminho();
    const { rota, arg, consulta } = partesDaRota();

    conteudo.classList.toggle('sem-entrada', redesenhando);
    if (rota !== 'dia') CC.fecharLicao();
    // A tela do dia do Conhecer Jesus é uma folha cheia por cima da lista (igual à lição),
    // então só fica aberta enquanto a rota aponta para aquele dia específico.
    if ((rota !== 'conhecer' || !arg) && CC.fecharConhecerDia) CC.fecharConhecerDia();
    if (rota !== 'biblia' && CC.fecharLeituraBiblia) CC.fecharLeituraBiblia();
    if (rota !== 'praticar') CC.fecharPratica();
    if (CC.fecharPopNo) CC.fecharPopNo();

    if (rota === 'propositos') { CC.substituirRota('#/novidades/propositos'); return; }
    if (rota === '' || rota === 'dia') CC.vistaTrilha(conteudo);
    else if (rota === 'passos' || rota === 'licoes') CC.vistaPassos(conteudo);
    else if (rota === 'praticar') CC.vistaPraticar(conteudo);
    else if (rota === 'missoes') CC.vistaMissoes(conteudo);
    else if (rota === 'amigos' || rota === 'novidades') (arg.startsWith('celula/') ? (alvo) => CC.vistaCelula(alvo, arg.slice(7)) : arg === 'bloqueados' ? CC.vistaBloqueados : arg === 'propositos' ? CC.vistaPropositos : CC.vistaAmigos)(conteudo);
    else if (rota === 'celula') CC.vistaEscolherCelula(conteudo);
    else if (rota === 'discipulado') CC.vistaDiscipulado(conteudo);
    else if (rota === 'biblia') CC.vistaBiblia(conteudo, arg);
    else if (rota === 'explorar') CC.vistaExplorar(conteudo);
    else if (rota === 'secao') CC.vistaSecao(conteudo, arg, consulta ? decodeURIComponent(consulta) : '');
    else if (rota === 'nota') CC.vistaNota(conteudo, arg);
    else if (rota === 'busca') CC.vistaBusca(conteudo, arg);
    else if (rota === 'conhecer') CC.vistaConhecer(conteudo);
    else if (rota === 'perguntas') (arg ? (r) => CC.vistaPergunta(r, arg) : CC.vistaPerguntas)(conteudo);
    else if (rota === 'seguir') CC.vistaSeguir(conteudo);
    else if (rota === 'apoiar') CC.vistaApoiar(conteudo);
    else if (rota === 'avisos') CC.vistaAvisos(conteudo);
    else if (rota === 'perfil') (PERFIL()[arg] || CC.vistaPerfil)(conteudo);
    else if (rota === 'config') (arg === 'textos' ? CC.vistaTextos : arg === 'notificacoes' ? CC.vistaNotificacoes : arg === 'painel' ? CC.vistaPainel : CC.vistaConfig)(conteudo);
    else CC.vazio(conteudo, 'Página não encontrada.');

    conteudo.classList.toggle('largo', rota === 'nota');
    conteudo.dataset.rota = rota || 'trilha';
    if (rota === 'dia') CC.montarLicao(Number(arg));
    if (rota === 'conhecer' && arg) CC.montarConhecerDia(Number(arg));

    pintarTopo();
    pintarNavegacao(rota, arg);

    ligarVoltarDoTopo(conteudo);

    if ((rota === '' || rota === 'dia') && ultimaRota !== rota) {
      requestAnimationFrame(() => CC.rolarAteAtual(false));
    }
    if (rota !== ultimaRota && rota !== 'busca') CC.rolarPara(0);
    entradaDaTela(rota);
    ultimaRota = rota;
  }

  // A tela entra pelo lado de onde a pessoa veio: da direita quando anda para frente na barra
  // de abas, da esquerda quando volta. Isso dá noção de lugar, como virar página. Dentro da
  // mesma aba (abrir uma nota, entrar numa seção) ela sobe, que é o gesto de aprofundar.
  // Redesenho no mesmo lugar não anima: piscaria a cada atualização.
  function entradaDaTela(rota) {
    if (redesenhando || rota === ultimaRota) { conteudo.dataset.entrada = ''; return; }
    const ordem = ordemDasAbas();
    const ondeFica = (r) => ordem.indexOf(ABA_DA_ROTA[r] || '#/');
    const novo = ondeFica(rota);
    const velho = ultimaRota === null ? novo : ondeFica(ultimaRota);
    conteudo.dataset.entrada = novo === velho ? 'fundo' : (novo > velho ? 'direita' : 'esquerda');
    // Sem isto, ir duas vezes para o mesmo lado não reinicia a animação.
    conteudo.style.animation = 'none';
    void conteudo.offsetWidth;
    conteudo.style.animation = '';
  }

  let redesenhando = false;
  CC.redesenhar = function () {
    const y = CC.rolagemY();
    const guardar = ultimaRota;
    redesenhando = true;
    try { rotear(); } finally { redesenhando = false; }
    ultimaRota = guardar;
    CC.rolarPara(y);
  };

  // ---------- avisos da abertura ----------
  // Cada aviso aparece uma vez: o escudo que cobriu ontem, a ofensiva que zerou e o
  // toque de um amigo. Nenhum cobra nem diz quem faltou.
  function avisosDoDia() {
    const seq = CC.sequencia();
    const hoje = CC.hojeIso();
    const ontem = CC.somaDias(hoje, -1);
    // As marcas de "já avisei" são de cada conta: no aparelho de casa, o que uma pessoa já
    // viu não pode esconder o aviso de outra que entra depois.
    const dono = (CC.quem && CC.quem.usuario) || '';
    if (seq.protegidos.includes(ontem) && lerLocal('cc.aviso.escudo') !== dono + ':' + ontem) {
      gravarLocal('cc.aviso.escudo', dono + ':' + ontem);
      CC.avisar('Seu escudo cobriu ontem. A ofensiva segue em ' + seq.atual + '!');
      return;
    }
    if (seq.zerouEm && !seq.feitoHoje && seq.zerouEm >= CC.somaDias(hoje, -14) && lerLocal('cc.aviso.zerou') !== dono + ':' + seq.zerouEm) {
      gravarLocal('cc.aviso.zerou', dono + ':' + seq.zerouEm);
      CC.folha('<div class="recomeco">' + CC.icoChama(0) + '<h2>Ainda tem brasa</h2>'
        + '<p>O que você leu não se perdeu: tudo continua aqui, e o seu recorde de '
        + CC.plural(seq.recorde, 'dia', 'dias') + ' também. Hoje é um novo dia para acender de novo.</p></div>'
        + '<div class="acoes"><button class="botao" data-ler>Reavivar hoje</button>'
        + '<button class="botao plano" data-fechar>Agora não</button></div>',
      {
        rotulo: 'Recomeçar',
        ligar: (folha, fechar) => {
          folha.querySelector('[data-fechar]').onclick = fechar;
          folha.querySelector('[data-ler]').onclick = () => { fechar(); CC.abrirLicao(CC.diaAtual()); };
        },
      });
      return;
    }
    const toques = ((CC.amigosEmCache() || {}).toques || []);
    const vistos = lerLocal('cc.aviso.toques') || '';
    const novo = !seq.feitoHoje && toques.find((t) => !vistos.split(',').includes(dono + '>' + hoje + ':' + t.usuario));
    if (novo) {
      gravarLocal('cc.aviso.toques', [vistos, dono + '>' + hoje + ':' + novo.usuario].filter(Boolean).slice(-20).join(','));
      CC.folhaToque(novo);
    }
  }

  // ---------- partida ----------
  const guardado = CC.temaGuardado();
  CC.aplicarTema(guardado === null ? matchMedia('(prefers-color-scheme: dark)').matches : guardado);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (ev) => {
    if (CC.temaGuardado() === null) { CC.aplicarTema(ev.matches); pintarTopo(); }
  });

  CC.carregarLocal();
  if (!location.hash) history.replaceState(null, '', location.pathname + location.search + '#/');
  rotear();

  // A abertura é só de quando o app foi fechado e aberto de novo (decisão do dono, 01/10).
  // Voltar do segundo plano não recarrega a página; e o que recarrega dentro da mesma sessão
  // (a atualização ao voltar para a tela, trocar de conta) não mostra abertura nenhuma: o
  // script do tema, no index.html, já marca html.sem-abertura e ela nem chega a aparecer.
  // Na abertura a frio ela fica o bastante para ser vista: com o app em cache ele fica pronto
  // em uns 200 ms, e sair nessa hora era só um piscar. Dura pelo menos ABERTURA_MINIMA desde
  // que a página começou a carregar (o tempo carregando já conta, então numa rede lenta nada
  // é somado); quem pede menos movimento fica com ABERTURA_CURTA. Pronto, a barra completa e
  // a abertura sai.
  // A exceção é a atualização que chega no meio da abertura (logo depois de um deploy, a
  // primeira abertura baixa a versão nova e recarrega): a página velha deixa a marca
  // cc.abertura.segue, o script do tema troca sem-abertura por abertura-segue e a página nova
  // continua a abertura de onde ela estava, sem entrar de novo, e sai assim que fica pronta.
  // As folhas e avisos da partida (consentimento, check-in, escudo, convites) esperam
  // CC.aberturaSaiu: abertos por baixo dela, gastariam o tempo de leitura escondidos.
  const ABERTURA_MINIMA = 1600;
  const ABERTURA_CURTA = 700;
  const ABERTURA_SEGUE = 400;
  const abertura = document.getElementById('abertura');
  let aberturaFora;
  CC.aberturaSaiu = new Promise((r) => { aberturaFora = r; });
  const segue = document.documentElement.classList.contains('abertura-segue');
  let jaVista = false;
  try {
    jaVista = sessionStorage.getItem('cc.abertura') === '1';
    sessionStorage.setItem('cc.abertura', '1');
  } catch (e) { /* sem sessionStorage, vale a abertura inteira */ }
  if (!abertura) {
    aberturaFora();
  } else if (jaVista && !segue) {
    abertura.remove();
    CC.aplicarTema(document.documentElement.dataset.tema === 'escuro');
    aberturaFora();
  } else {
    const calma = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const espera = Math.max(0, (segue ? ABERTURA_SEGUE : calma ? ABERTURA_CURTA : ABERTURA_MINIMA) - performance.now());
    setTimeout(() => requestAnimationFrame(() => {
      // A barra sai da animação para uma transição: fixa o ponto em que está e corre até o fim.
      const barra = abertura.querySelector('.abertura-barra i');
      if (barra) {
        const agora = getComputedStyle(barra).transform;
        if (agora && agora !== 'none') barra.style.transform = agora;
      }
      abertura.classList.add('pronta');
      requestAnimationFrame(() => { if (barra) barra.style.transform = 'scaleX(1)'; });
      setTimeout(() => {
        abertura.classList.add('saindo');
        // a barra de status volta para a cor da folha do tema (a abertura a deixou preta)
        CC.aplicarTema(document.documentElement.dataset.tema === 'escuro');
        aberturaFora();
        setTimeout(() => abertura.remove(), 500);
      }, calma ? 0 : 320);
    }), espera);
  }

  addEventListener('hashchange', rotear);
  addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    if (document.querySelector('.painel-mais')) { fecharPainelMais(); return; }
    const cortinas = document.querySelectorAll('.cortina');
    const cortina = cortinas[cortinas.length - 1];
    if (cortina) { if (!cortina.dataset.presa) cortina.remove(); return; }
    const telas = document.querySelectorAll('.tela-cheia');
    if (telas.length) { telas[telas.length - 1].remove(); return; }
    if (document.querySelector('.pop-no:not(.saindo)')) { CC.fecharPopNo(); return; }
    if (CC.leitorAberto && CC.leitorAberto()) { CC.fecharLeitor(); return; }
    if (document.querySelector('.licao:not(.saindo)')) location.hash = '#/';
  });

  CC.sincronizar(true).then(async () => {
    CC.migrarEstado();
    CC.guardarConquistas();
    const quem = CC.quem;
    if (quem && quem.comSenha) {
      try {
        const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (fuso) CC.api('api/fuso', { fuso }).catch(() => {});
      } catch (e) { /* segue */ }
    }
    // Discipulado entra no mesmo lote de propósitos/amigos: é dali que a barra sabe, já na
    // primeira tela, se a aba Discipulado deve aparecer.
    await Promise.all([CC.carregarAmigos(), CC.carregarNovidades(), CC.carregarDiscipulado ? CC.carregarDiscipulado() : null]);
    CC.conferirMissoes();
    CC.redesenhar();
    // Antes de saber quem é a pessoa, a abertura desenha o plano padrão e pode rolar até o
    // dia atual dele; quando a conta é do Conhecer Jesus, o redesenho troca para outra
    // lista, mas herda aquela rolagem, escondendo o título. Corrige assim que o caminho
    // é conhecido, só na Trilha.
    if (quem && quem.caminho === 'conhecer' && (location.hash === '#/' || location.hash === '')) CC.rolarPara(0);
    // Daqui para baixo vêm folhas e avisos: só com a abertura saindo.
    await CC.aberturaSaiu;

    // Conta recém-criada: o tutorial de pôr o app na tela de início aparece logo na primeira
    // abertura, antes de qualquer leitura (quem entra pelo Conhecer Jesus nem lê o plano). A marca
    // sai quando ele aparece, para não repetir a cada abertura.
    let novaConta = false;
    try { novaConta = localStorage.getItem('cc.instalar') === '1'; } catch (e) { /* segue */ }
    if (novaConta) {
      try { localStorage.removeItem('cc.instalar'); } catch (e) { /* segue */ }
      if (!CC.rodandoComoApp()) await CC.tutorialInstalar({ contaNova: true });
    }
    // Depois do tutorial de instalar (ou na primeira abertura do app já instalado), o pedido
    // para mandar notificações. A função só pergunta quando ainda não foi respondido.
    if (CC.talvezOferecerNotificacoes && !document.querySelector('.cortina')) CC.talvezOferecerNotificacoes();

    // Conta com senha que ainda não concordou com o uso do dado de fé (LGPD art. 11) não
    // segue para convite, célula ou completar cadastro antes de decidir isso.
    if (quem && quem.comSenha && !quem.consentimento) await CC.pedirConsentimento();

    // Endereço novo: quem ainda usa o app pelo endereço antigo (o ícone instalado fica preso
    // a ele) recebe, no máximo uma vez por dia, o convite para abrir e instalar o novo. A
    // conta é a mesma: tudo fica no servidor.
    if (location.hostname === 'ge.off-sec.net') {
      let visto = '';
      try { visto = localStorage.getItem('cc.enderecoNovo') || ''; } catch (e) { /* segue */ }
      if (visto !== CC.hojeIso()) {
        try { localStorage.setItem('cc.enderecoNovo', CC.hojeIso()); } catch (e) { /* segue */ }
        {
          CC.folha('<h2>O app tem endereço novo</h2>'
            + '<p>Agora o Geração Eleita fica em <b>geracaoeleita.app</b>. Abra por lá, entre com o mesmo usuário e senha e instale de novo na tela de início. Suas leituras, amigos e célula continuam todos lá.</p>'
            + '<p class="passo-dica pequena">Depois de instalar o novo, você pode apagar este ícone antigo. Se usa notificações, ative de novo no app novo.</p>'
            + '<div class="acoes"><a class="botao azul" href="https://geracaoeleita.app/" target="_blank" rel="noopener" data-fechar-novo>Abrir o endereço novo</a>'
            + '<button class="botao plano" data-fechar>Agora não</button></div>', {
            rotulo: 'Endereço novo',
            ligar: (folha, fechar) => {
              folha.querySelector('[data-fechar]').onclick = fechar;
              folha.querySelector('[data-fechar-novo]').addEventListener('click', () => fechar());
            },
          });
        }
      }
    }

    const celula = new URLSearchParams(location.search).get('celula');
    if (celula) {
      history.replaceState(null, '', location.pathname + (location.hash || '#/'));
      if (quem && quem.comSenha && !quem.perfilCompleto) {
        if (await CC.completarCadastro(quem)) CC.abrirLinkCelula(celula);
      } else {
        CC.abrirLinkCelula(celula);
      }
      return;
    }
    const convite = new URLSearchParams(location.search).get('convite');
    if (convite) {
      history.replaceState(null, '', location.pathname + (location.hash || '#/'));
      if (quem && quem.comSenha && !quem.perfilCompleto) {
        if (await CC.completarCadastro(quem)) CC.aceitarConvite(convite);
      } else {
        CC.aceitarConvite(convite);
      }
      return;
    }
    // Uma vez por dia por conta, e não por aparelho: veja as marcas em avisosDoDia.
    const marcaCadastro = ((quem && quem.usuario) || '') + ':' + CC.hojeIso();
    if (quem && quem.comSenha && !quem.perfilCompleto && lerLocal('cc.aviso.cadastro') !== marcaCadastro) {
      gravarLocal('cc.aviso.cadastro', marcaCadastro);
      CC.completarCadastro(quem);
      return;
    }
    avisosDoDia();
    // O check-in do discípulo (uma vez por dia), só com a tela livre.
    if (CC.talvezCheckin) CC.talvezCheckin();
    // O convite para ativar notificações só aparece quando nada mais está aberto na tela.
    if (!document.querySelector('.cortina, .tela-cheia')) CC.talvezOferecerNotificacoes();
  });

  addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    CC.sincronizar(false)
      .then(() => Promise.all([CC.carregarAmigos(), CC.carregarNovidades(), CC.carregarDiscipulado ? CC.carregarDiscipulado() : null]))
      .then(() => { pintarTopo(); pintarNavegacao(); });
  });

  if (location.protocol.startsWith('http')) {
    const elo = document.createElement('link');
    elo.rel = 'manifest';
    elo.href = 'manifest.webmanifest';
    document.head.appendChild(elo);
  }

  // ---------- atualizações ----------
  // O app abre do cache, e é por isso que abre sem rede. Para não ficar preso numa versão
  // velha, ele pergunta ao servidor qual é a atual ao abrir e sempre que volta para a tela.
  // Se mudou, registra o service worker com a versão no endereço, o que passa por cima de
  // qualquer cache, e recarrega quando a versão nova assume: na hora, se nada estiver
  // aberto; senão, assim que a pessoa fechar a lição ou a janela.
  const VERSAO = (document.querySelector('meta[name="versao-app"]') || {}).content || '';
  CC.versaoApp = () => VERSAO;
  CC.conferirVersao = async () => {};
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    let recarregarDepois = false;
    const podeRecarregar = () => !document.querySelector('.licao, .cortina, .tela-cheia')
      && !(CC.leitorAberto && CC.leitorAberto());
    const recarregarQuandoPuder = () => {
      if (podeRecarregar()) {
        // Com a abertura ainda na tela, a página nova a continua em vez de cortá-la. A marca é
        // gravada no pagehide, quando a página nova de fato assume (a velha pode seguir
        // desenhando a abertura por um tempo depois do reload).
        addEventListener('pagehide', () => {
          if (document.querySelector('#abertura:not(.saindo)')) try { sessionStorage.setItem('cc.abertura.segue', '1'); } catch (e) { /* segue */ }
        }, { once: true });
        location.reload();
      } else recarregarDepois = true;
    };
    addEventListener('hashchange', () => { if (recarregarDepois && podeRecarregar()) location.reload(); });

    // Só recarrega quando quem assumiu é de outra versão: a versão vem no endereço do
    // service worker (sw.js?v=...). A mesma versão assumindo, como na primeira instalação,
    // não recarrega, qualquer que seja a ordem em que os eventos chegam.
    const versaoDoControlador = () => {
      try { return new URL(navigator.serviceWorker.controller.scriptURL).searchParams.get('v') || ''; } catch (e) { return ''; }
    };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      const versao = versaoDoControlador();
      if (versao && versao !== VERSAO) recarregarQuandoPuder();
    });

    CC.conferirVersao = async () => {
      try {
        const r = await fetch('api/versao', { cache: 'no-store' });
        if (!r.ok) return;
        const { versao } = await r.json();
        if (versao && versao !== VERSAO) await navigator.serviceWorker.register('sw.js?v=' + versao);
      } catch (e) { /* sem rede: segue com a versão que tem */ }
    };

    CC.quandoCarregar(() => {
      navigator.serviceWorker.register('sw.js' + (VERSAO ? '?v=' + VERSAO : ''))
        .catch(() => { /* segue sem cache */ })
        .then(() => CC.conferirVersao());
    });
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') CC.conferirVersao(); });
  }
})(window.CC);
