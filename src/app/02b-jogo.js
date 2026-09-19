/* O jogo: missões do dia, baús da trilha, cartas, quadro do mês, conquistas com níveis e
   troféus. Tudo é contado a partir de um estado e de uma data passados por parâmetro: o
   servidor carrega este mesmo arquivo para conferir o que alguém publica no Feed.
   Orar e escrever continuam fora de qualquer contagem. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const est = (e) => e || CC.estado();
  const hojeDe = (h) => h || CC.hojeIso();

  // ---------- leitura em números ----------
  const CAPITULOS_DO_DIA = D.plano.map((d) => (d.trechos || []).reduce((s, t) => s + (t.ate - t.de + 1), 0));
  CC.capitulosDoDia = (numero) => CAPITULOS_DO_DIA[numero - 1] || 0;
  CC.capitulosLidos = (e) => est(e).lidos.reduce((s, n) => s + CC.capitulosDoDia(n), 0);

  const DIAS_DO_LIVRO = new Map();
  for (const d of D.plano) {
    for (const l of d.livros) {
      if (!DIAS_DO_LIVRO.has(l)) DIAS_DO_LIVRO.set(l, []);
      DIAS_DO_LIVRO.get(l).push(d.numero);
    }
  }
  CC.livroCompletoEm = (livro, e) => {
    const dias = DIAS_DO_LIVRO.get(livro) || [];
    const lidos = new Set(est(e).lidos);
    return dias.length > 0 && dias.every((n) => lidos.has(n));
  };
  const livrosCompletosDe = (e) => [...DIAS_DO_LIVRO.keys()].filter((l) => CC.livroCompletoEm(l, e)).length;
  CC.unidadeCompletaEm = (numero, e) => {
    const u = D.unidades.find((x) => x.numero === Number(numero));
    if (!u) return false;
    const lidos = new Set(est(e).lidos);
    for (let n = u.de; n <= u.ate; n++) if (!lidos.has(n)) return false;
    return true;
  };

  // ---------- diário ----------
  // Cada dia guarda contadores do que a pessoa fez: rodadas e acertos no Praticar,
  // leituras terminadas no leitor, notas abertas. É daqui que as missões leem.
  CC.diaDoDiario = (data, e) => (est(e).diario || {})[hojeDe(data)] || {};

  CC.anotarDiario = (campo, n = 1) => {
    const E = CC.estado();
    const hoje = CC.hojeIso();
    const diario = { ...(E.diario || {}) };
    diario[hoje] = { ...(diario[hoje] || {}), [campo]: ((diario[hoje] || {})[campo] || 0) + n };
    CC.gravar('diario', diario);
  };
  CC.marcarNoDiario = (campo) => {
    if (CC.diaDoDiario()[campo]) return;
    CC.anotarDiario(campo, 1);
  };

  CC.somarAcertos = (n) => {
    if (!n) return;
    CC.anotarDiario('acertos', n);
    CC.gravar('acertosTotal', (CC.estado().acertosTotal || 0) + n);
  };

  CC.anotarNotaVista = (id) => {
    const E = CC.estado();
    CC.anotarDiario('notas', 1);
    if ((E.notasVistas || []).includes(id)) return;
    CC.gravar('notasVistas', [...(E.notasVistas || []), id].slice(-400));
  };

  // ---------- missões do dia ----------
  CC.MISSOES = {
    licao: { texto: 'Conclua a lição do dia', alvo: 1, icone: 'livro', cor: 'verde' },
    capitulos: { texto: 'Leia 4 capítulos', alvo: 4, icone: 'marcador', cor: 'azul', familia: 'ler' },
    maratona: { texto: 'Leia 8 capítulos', alvo: 8, icone: 'marcador', cor: 'azul', familia: 'ler' },
    pratica: { texto: 'Faça uma rodada no Praticar', alvo: 1, icone: 'alvo', cor: 'vermelho', familia: 'pratica' },
    acertos: { texto: 'Acerte 6 perguntas no Praticar', alvo: 6, icone: 'alvo', cor: 'vermelho', familia: 'pratica' },
    leitor: { texto: 'Termine uma leitura aqui no app', alvo: 1, icone: 'folha', cor: 'turquesa' },
    fundo: { texto: 'Abra 2 notas para ir mais fundo', alvo: 2, icone: 'bussola', cor: 'roxo' },
    passo: { texto: 'Leia um dos Primeiros passos', alvo: 1, icone: 'bandeira', cor: 'roxo', so: (e) => e.licoes.length < D.licoes.length },
    juntos: { texto: 'Leia no mesmo dia que um amigo', alvo: 1, icone: 'pessoas', cor: 'azul', so: (e, ctx) => !!ctx.amigos },
  };

  function valorDaMissao(id, e, data) {
    const dia = (e.diario || {})[data] || {};
    const marcadosHoje = Object.entries(e.marcadoEm || {}).filter(([, v]) => v === data);
    switch (id) {
      case 'licao': return marcadosHoje.length ? 1 : 0;
      case 'capitulos':
      case 'maratona': return marcadosHoje.reduce((s, [k]) => s + CC.capitulosDoDia(Number(k)), 0);
      case 'pratica': return dia.praticas || 0;
      case 'acertos': return dia.acertos || 0;
      case 'leitor': return dia.leitor || 0;
      case 'fundo': return dia.notas || 0;
      case 'passo': return Object.values(e.licoesEm || {}).filter((v) => v === data).length;
      case 'juntos': return dia.juntos || 0;
      default: return 0;
    }
  }

  const semente = (texto) => [...String(texto)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

  // A lição do dia é sempre a primeira; as outras duas saem da data, sem repetir família.
  // Uma vez mostradas, ficam guardadas no diário e não mudam mais naquele dia.
  function escolherMissoes(e, data, ctx) {
    const elegiveis = Object.keys(CC.MISSOES)
      .filter((id) => id !== 'licao' && (!CC.MISSOES[id].so || CC.MISSOES[id].so(e, ctx || {})));
    let h = semente(data);
    const escolhidas = [];
    const familias = new Set();
    while (escolhidas.length < 2 && elegiveis.length) {
      const id = elegiveis.splice(h % elegiveis.length, 1)[0];
      h = (Math.imul(h, 1103515245) + 12345) >>> 0;
      const f = CC.MISSOES[id].familia;
      if (f && familias.has(f)) continue;
      if (f) familias.add(f);
      escolhidas.push(id);
    }
    return ['licao', ...escolhidas];
  }

  CC.missoesDoDia = (data, e, ctx) => {
    e = est(e);
    data = hojeDe(data);
    const guardadas = ((e.diario || {})[data] || {}).missoes;
    const ids = (guardadas && guardadas.length ? guardadas : escolherMissoes(e, data, ctx)).filter((id) => CC.MISSOES[id]);
    return ids.map((id) => {
      const m = CC.MISSOES[id];
      const valor = Math.min(m.alvo, valorDaMissao(id, e, data));
      return { id, ...m, valor, feita: valor >= m.alvo };
    });
  };

  // No aparelho: fixa as missões de hoje, soma as que ficaram prontas e entrega a peça
  // do quadro quando as três fecham. Devolve o que mudou, para a tela celebrar.
  CC.conferirMissoes = (ctx) => {
    const E = CC.estado();
    const hoje = CC.hojeIso();
    const lista = CC.missoesDoDia(hoje, E, ctx || { amigos: !!((CC.amigosEmCache && CC.amigosEmCache()) || {}).amigos?.length });
    const diario = { ...(E.diario || {}) };
    const dia = { ...(diario[hoje] || {}) };
    let mudou = false;
    if (!dia.missoes) { dia.missoes = lista.map((m) => m.id); mudou = true; }
    const feitas = lista.filter((m) => m.feita).length;
    const novas = Math.max(0, feitas - (dia.contadas || 0));
    if (novas) { dia.contadas = feitas; mudou = true; }
    diario[hoje] = dia;
    if (mudou) CC.gravar('diario', diario);
    if (novas) CC.gravar('missoesTotal', (E.missoesTotal || 0) + novas);

    let peca = false;
    if (feitas === lista.length) {
      const mes = hoje.slice(0, 7);
      const quadros = { ...(E.quadros || {}) };
      if (!(quadros[mes] || []).includes(hoje)) {
        quadros[mes] = [...(quadros[mes] || []), hoje].sort();
        CC.gravar('quadros', quadros);
        peca = true;
      }
    }
    return { lista, novas, peca };
  };

  // Horas até a meia-noite, para o "faltam 5 horas" das missões.
  CC.horasAteAmanha = () => {
    const agora = new Date();
    const fim = new Date(agora);
    fim.setHours(24, 0, 0, 0);
    return Math.max(1, Math.ceil((fim - agora) / 3600000));
  };

  // ---------- quadro do mês ----------
  // Cada dia com as três missões feitas revela uma peça do retrato do mês. Nove peças
  // completam o quadro, que fica na estante de troféus.
  CC.PECAS_QUADRO = 9;
  const RETRATOS = ['Noé', 'Abraão', 'José', 'Moisés', 'Rute', 'Davi', 'Elias', 'Ester', 'Daniel', 'Jonas', 'Maria', 'Pedro'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  CC.nomeDoMes = (mes) => MESES[Number(String(mes).slice(5, 7)) - 1] || '';

  CC.quadroDoMes = (mes, e) => {
    mes = mes || CC.hojeIso().slice(0, 7);
    const dias = ((est(e).quadros || {})[mes]) || [];
    // a ordem em que as peças aparecem também sai do mês, e é igual em todo aparelho
    const ordem = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    let h = semente(mes);
    for (let i = ordem.length - 1; i > 0; i--) {
      h = (Math.imul(h, 1103515245) + 12345) >>> 0;
      const j = h % (i + 1);
      [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
    }
    const quantas = Math.min(CC.PECAS_QUADRO, dias.length);
    return {
      mes,
      nome: CC.nomeDoMes(mes),
      personagem: RETRATOS[Number(mes.slice(5, 7)) - 1] || 'Davi',
      pecas: ordem.slice(0, quantas),
      quantas,
      completo: quantas >= CC.PECAS_QUADRO,
    };
  };
  CC.quadrosCompletos = (e) => Object.keys(est(e).quadros || {})
    .filter((mes) => CC.quadroDoMes(mes, e).completo).sort();

  // ---------- baús da trilha ----------
  // A cada sete dias lidos a trilha tem um baú, e dentro dele vai um versículo tirado
  // justamente desses sete dias: o baú guarda a memória do trecho que a pessoa acabou de
  // ler, e não um brinde avulso. A referência de cada dia já existe em CC.reflexaoDoDia.
  //
  // O array de personagens continua aqui, sem uso na tela, esperando a arte nova. Antes o
  // baú sorteava uma carta daqui; quando os personagens saíram da interface, ele seguiu
  // sorteando e gravando cartas que ninguém via.
  CC.CARTAS = ['Noé', 'Abraão', 'Sara', 'José', 'Moisés', 'Josué', 'Rute', 'Samuel', 'Davi', 'Salomão',
    'Elias', 'Ester', 'Jó', 'Isaías', 'Jeremias', 'Ezequiel', 'Daniel', 'Jonas', 'Maria', 'Pedro', 'João', 'Paulo'];
  CC.cartas = (e) => {
    const vistas = new Set(Object.values(est(e).bausAbertos || {}).map((b) => b.carta).filter(Boolean));
    return CC.CARTAS.filter((c) => vistas.has(c));
  };
  CC.temBau = (numero) => numero % 7 === 0;
  CC.chaveBau = (numero) => 'dia:' + numero;
  CC.bauAberto = (numero, e) => !!(est(e).bausAbertos || {})[CC.chaveBau(numero)];

  // Qual versículo cabe ao baú do dia N, entre os sete dias que ele fecha. A escolha é
  // fixa para cada baú (deriva só do número), por dois motivos: reabrir a tela mostra o
  // mesmo versículo, e os baús abertos antes desta mudança — que só guardaram carta —
  // conseguem a referência na hora, sem precisar migrar nada no banco.
  CC.versiculoDoBau = (numero) => {
    if (!CC.reflexaoDoDia) return null;
    const refs = [];
    for (let n = Math.max(1, numero - 6); n <= numero; n++) {
      const ref = (CC.reflexaoDoDia(n) || {}).ref;
      if (ref && !refs.includes(ref)) refs.push(ref);
    }
    if (!refs.length) return null;
    // Sem aleatoriedade: o mesmo baú cai sempre no mesmo versículo.
    return refs[numero % refs.length];
  };

  // A referência guardada manda sobre a derivada: se o conteúdo das reflexões mudar
  // depois, o versículo que a pessoa já recebeu não pode trocar debaixo dela.
  CC.versiculoGuardado = (numero, e) => {
    const bau = (est(e).bausAbertos || {})[CC.chaveBau(numero)];
    if (!bau) return null;
    return bau.ref || CC.versiculoDoBau(numero);
  };

  CC.abrirBau = (numero) => {
    const E = CC.estado();
    const chave = CC.chaveBau(numero);
    if ((E.bausAbertos || {})[chave]) return E.bausAbertos[chave];
    const bau = { em: CC.hojeIso(), ref: CC.versiculoDoBau(numero) };
    CC.gravar('bausAbertos', { ...(E.bausAbertos || {}), [chave]: bau });
    return bau;
  };

  // Todos os versículos já guardados, do mais novo para o mais antigo.
  CC.versiculosGuardados = (e) => Object.keys(est(e).bausAbertos || {})
    .map((chave) => Number(String(chave).replace('dia:', '')))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a)
    .map((numero) => ({ dia: numero, ref: CC.versiculoGuardado(numero, e) }))
    .filter((v) => v.ref);

  // ---------- conquistas com níveis ----------
  CC.CONQUISTAS = [
    { id: 'chama', titulo: 'Chama acesa', icone: 'chama', cor: 'vermelho', niveis: [3, 7, 30, 100, 365],
      texto: (n) => 'Chegue a ' + n + ' dias de ofensiva',
      valor: (e, hoje) => CC.simularOfensiva(CC.datasFeitas(e), hoje).recorde },
    { id: 'leitor', titulo: 'Todo dia na Palavra', icone: 'marcador', cor: 'verde', niveis: [10, 50, 100, 200, 365],
      texto: (n) => 'Leia ' + n + ' dias do plano', valor: (e) => e.lidos.length },
    { id: 'capitulos', titulo: 'Página a página', icone: 'folha', cor: 'azul', niveis: [50, 200, 500, 900, 1189],
      texto: (n) => 'Leia ' + n + ' capítulos', valor: (e) => CC.capitulosLidos(e) },
    { id: 'livros', titulo: 'Estante', icone: 'livro', cor: 'turquesa', niveis: [1, 5, 20, 40, 66],
      texto: (n) => (n === 1 ? 'Termine um livro da Bíblia' : 'Termine ' + n + ' livros'), valor: (e) => livrosCompletosDe(e) },
    { id: 'passos', titulo: 'Alicerce', icone: 'bandeira', cor: 'roxo', niveis: [1, 4, 8, 12],
      texto: (n) => (n === 1 ? 'Leia o primeiro dos Primeiros passos' : 'Leia ' + n + ' dos Primeiros passos'), valor: (e) => e.licoes.length },
    { id: 'memoria', titulo: 'Memória', icone: 'alvo', cor: 'vermelho', niveis: [10, 50, 150, 400, 1000],
      texto: (n) => 'Acerte ' + n + ' perguntas no Praticar', valor: (e) => e.acertosTotal || 0 },
    { id: 'proposito', titulo: 'Lado a lado', icone: 'pessoas', cor: 'azul', niveis: [3, 7, 30, 100, 365],
      texto: (n) => 'Chegue a ' + n + ' dias num propósito dos amigos', valor: (e) => e.maiorProposito || 0 },
    { id: 'missoes', titulo: 'Dia após dia', icone: 'estrela', cor: 'amarelo', niveis: [5, 25, 100, 250, 500],
      texto: (n) => 'Complete ' + n + ' desafios', valor: (e) => e.missoesTotal || 0 },
    // O id segue 'cartas' de propósito: quem já tinha nível guardado em conquistasGanhas
    // não perde o que conquistou. O que mudou foi o que se junta — versículos, não cartas.
    // Os níveis acompanham o ano: são 52 baús, um a cada sete dias.
    { id: 'cartas', titulo: 'Versículos guardados', icone: 'marcador', cor: 'amarelo', niveis: [3, 10, 26, 52],
      texto: (n) => 'Guarde ' + n + ' versículos nos baús', valor: (e) => CC.versiculosGuardados(e).length },
    { id: 'explorador', titulo: 'Explorador', icone: 'bussola', cor: 'roxo', niveis: [5, 20, 60, 150],
      texto: (n) => 'Abra ' + n + ' notas de estudo', valor: (e) => (e.notasVistas || []).length },
  ];

  CC.conquistasComNivel = (e, hoje) => {
    e = est(e);
    hoje = hojeDe(hoje);
    return CC.CONQUISTAS.map((c) => {
      const valor = c.valor(e, hoje);
      const nivel = c.niveis.filter((alvo) => valor >= alvo).length;
      const maximo = nivel === c.niveis.length;
      const alvo = maximo ? c.niveis[c.niveis.length - 1] : c.niveis[nivel];
      return {
        id: c.id, titulo: c.titulo, icone: c.icone, cor: c.cor,
        valor, nivel, maximo, alvo, totalNiveis: c.niveis.length,
        descricao: c.texto(alvo),
        fracao: maximo ? 1 : Math.min(1, valor / alvo),
      };
    });
  };

  // ---------- troféus ----------
  CC.COLECOES = [
    ['Pentateuco', ['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio']],
    ['Livros históricos', ['Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel', '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras', 'Neemias', 'Ester']],
    ['Poesia e sabedoria', ['Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cânticos']],
    ['Profetas maiores', ['Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel']],
    ['Profetas menores', ['Oseias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miqueias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias']],
    ['Evangelhos', ['Mateus', 'Marcos', 'Lucas', 'João']],
    ['Atos', ['Atos']],
    ['Cartas de Paulo', ['Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom']],
    ['Cartas gerais', ['Hebreus', 'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João', '3 João', 'Judas']],
    ['Apocalipse', ['Apocalipse']],
  ];

  CC.trofeus = (e) => {
    e = est(e);
    const colecoes = CC.COLECOES.map(([titulo, livros]) => {
      const feitos = livros.filter((l) => CC.livroCompletoEm(l, e)).length;
      return { tipo: 'colecao', titulo, feitos, total: livros.length, ganho: feitos === livros.length };
    });
    const lidos = new Set(e.lidos);
    const unidades = D.unidades.map((u) => {
      let feitos = 0;
      for (let n = u.de; n <= u.ate; n++) if (lidos.has(n)) feitos++;
      const total = u.ate - u.de + 1;
      return { tipo: 'unidade', numero: u.numero, titulo: 'Unidade ' + u.numero, sub: u.titulo, cor: u.cor, feitos, total, ganho: feitos === total };
    });
    const quadros = CC.quadrosCompletos(e).map((mes) => ({ tipo: 'quadro', mes, ...CC.quadroDoMes(mes, e), ganho: true }));
    return { colecoes, unidades, quadros };
  };

  // ---------- novidades: o que o servidor confere ----------
  CC.MARCOS_OFENSIVA = [7, 14, 30, 50, 100, 150, 200, 250, 300, 365];
  const LIVROS = new Set(DIAS_DO_LIVRO.keys());

  // Devolve a chave que impede repetir a novidade, ou null quando o progresso não confirma.
  CC.conferirNovidade = (tipo, dados, e, hoje) => {
    dados = dados || {};
    e = e || CC.normalizarEstado({});
    if (!e) return null;
    if (tipo === 'ofensiva') {
      const dias = Number(dados.dias);
      const sim = CC.simularOfensiva(CC.datasFeitas(e), hoje);
      if (!CC.MARCOS_OFENSIVA.includes(dias) || sim.atual < dias) return null;
      return 'ofensiva:' + dias + ':' + (sim.zerouEm || 'inicio');
    }
    if (tipo === 'conquista') {
      const c = CC.conquistasComNivel(e, hoje).find((x) => x.id === dados.id);
      const nivel = Number(dados.nivel);
      if (!c || !(nivel >= 1) || nivel > c.nivel) return null;
      return 'conquista:' + c.id + ':' + nivel;
    }
    if (tipo === 'livro') return LIVROS.has(dados.livro) && CC.livroCompletoEm(dados.livro, e) ? 'livro:' + dados.livro : null;
    if (tipo === 'unidade') return CC.unidadeCompletaEm(dados.numero, e) ? 'unidade:' + Number(dados.numero) : null;
    if (tipo === 'quadro') return /^\d{4}-\d{2}$/.test(dados.mes || '') && CC.quadroDoMes(dados.mes, e).completo ? 'quadro:' + dados.mes : null;
    if (tipo === 'versiculo') {
      const m = /^(.+?) (\d{1,3})\.(\d{1,3})(?:-(\d{1,3}))?$/.exec(String(dados.ref || ''));
      if (!m || !LIVROS.has(m[1])) return null;
      return 'versiculo:' + dados.ref + ':' + hoje;
    }
    return null;
  };
})(window.CC);
