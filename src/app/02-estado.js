/* Estado: o que a pessoa fez. Vive na memória, no localStorage deste aparelho e,
   quando há servidor, no arquivo da conta. As cópias são fundidas, nunca substituídas.
   O servidor carrega este mesmo arquivo para fundir e contar a ofensiva igual. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const CHAVE = 'cc.app.estado';
  const CHAVE_ANTIGA = 'cc.estado';
  const CHAVE_TEMA = 'cc.tema';

  const VAZIO = () => ({
    atualizadoEm: 0,
    dia: 1,
    lidos: [],
    licoes: [],
    oia: {},
    anotacoes: {},
    marcadoEm: {},
    licoesEm: {},
    // Conhecer Jesus: número do dia (1 a 14) → data ISO em que a pessoa o terminou. Vive
    // separado de "licoesEm" porque não é primeiro passo nem lição do plano, mas conta
    // do mesmo jeito para a ofensiva.
    conhecidos: {},
    pratica: {},
    foto: '',
    apelido: '',
    zeradoEm: 0,
    // XP ganho com registros antes de escrever deixar de valer pontos: fica congelado
    xpLegado: null,
    conquistasGanhas: {},
    maiorProposito: 0,
    // o jogo: o que se fez em cada dia (para as missões), baús e contadores
    diario: {},
    bausAbertos: {},
    notasVistas: [],
    acertosTotal: 0,
    missoesTotal: 0,
    semanasJuntos: {},
    // as datas do "Orei": só a data, para o propósito de oração; a oração continua só sua
    oradoEm: {},
    // o último capítulo aberto na Bíblia livre: { livro, cap, em }, para continuar de onde parou
    ultimaBiblia: null,
    // marca-texto por versículo: { "João 3:16": { cor: 1..4, em } }; cor 0 é marca apagada
    marcas: {},
    // Minha história com Deus (Perfil): guia privado, nunca sai para amigo, célula,
    // discipulado nem painel. { antes, encontro, hoje, em }.
    historia: null,
  });

  // O diário só precisa do mês corrente e do anterior: é o que as missões leem.
  const DIAS_DE_DIARIO = 70;
  function fundirDiario(a, b) {
    const saida = {};
    for (const fonte of [a || {}, b || {}]) {
      for (const [data, dia] of Object.entries(fonte)) {
        const atual = saida[data] || {};
        const junto = { ...atual };
        for (const [campo, valor] of Object.entries(dia || {})) {
          if (campo === 'missoes') junto.missoes = atual.missoes || valor;
          else if (typeof valor === 'number') junto[campo] = Math.max(atual[campo] || 0, valor);
        }
        saida[data] = junto;
      }
    }
    const datas = Object.keys(saida).sort();
    for (const velha of datas.slice(0, Math.max(0, datas.length - DIAS_DE_DIARIO))) delete saida[velha];
    return saida;
  }
  function fundirBaus(a, b) {
    const saida = { ...(b || {}) };
    for (const [chave, bau] of Object.entries(a || {})) {
      if (!saida[chave] || (bau.em || '') < (saida[chave].em || '')) saida[chave] = bau;
    }
    return saida;
  }

  // União por dia; quando os dois lados marcaram o mesmo dia do Conhecer, vale a data mais
  // antiga: é a que corresponde a quando a pessoa terminou de verdade.
  function fundirConhecidos(a, b) {
    const saida = { ...(a || {}) };
    for (const [dia, data] of Object.entries(b || {})) {
      if (!saida[dia] || data < saida[dia]) saida[dia] = data;
    }
    return saida;
  }

  // Vence a mudança mais recente de cada versículo. Apagar deixa { cor: 0 } com a data, senão
  // o outro aparelho, que ainda tem a marca, a traria de volta na fusão. Passados 90 dias,
  // todo aparelho já recebeu a lápide e ela pode sumir.
  const LAPIDE_MS = 90 * 864e5;
  function fundirMarcas(a, b) {
    const saida = { ...(a || {}) };
    for (const [chave, m] of Object.entries(b || {})) {
      if (!saida[chave] || (m.em || 0) > (saida[chave].em || 0)) saida[chave] = m;
    }
    const limite = Date.now() - LAPIDE_MS;
    for (const [chave, m] of Object.entries(saida)) if (!m.cor && (m.em || 0) < limite) delete saida[chave];
    return saida;
  }

  // Minha história com Deus: vence a cópia com "em" mais recente, sem misturar campo a
  // campo (é um relato só, escrito de uma vez; misturar pedaços de dois textos não faz sentido).
  function fundirHistoria(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    return (b.em || 0) >= (a.em || 0) ? b : a;
  }

  let E = VAZIO();
  let servidorVivo = false;
  CC.servidorVivo = () => servidorVivo;

  // ---------- pontuação ----------
  // Orar e escrever não valem pontos: ficam entre a pessoa e Deus.
  CC.XP_LEITURA = 10;
  CC.XP_LICAO = 20;
  CC.XP_PRATICA_ACERTO = 3;

  // ---------- fusão ----------
  const uniao = (a, b) => [...new Set([...(a || []), ...(b || [])])];

  // Nunca perde uma marcação: conjuntos são unidos, e só os campos únicos seguem
  // o carimbo de tempo mais recente.
  function fundir(a, b) {
    if (!a) return b || VAZIO();
    if (!b) return a;
    // Zerar é a única operação que apaga.
    if ((b.zeradoEm || 0) > (a.atualizadoEm || 0)) return b;
    if ((a.zeradoEm || 0) > (b.atualizadoEm || 0)) return a;
    const maisNovo = (b.atualizadoEm || 0) >= (a.atualizadoEm || 0) ? b : a;

    const vazio = (r) => !r || !((r.o || '') + (r.i || '') + (r.a || '') + (r.oracao || '')).trim();
    const oia = { ...(a.oia || {}) };
    for (const [k, v] of Object.entries(b.oia || {})) {
      if (!oia[k] || vazio(oia[k]) || maisNovo === b) oia[k] = v;
    }
    const anotacoes = { ...(a.anotacoes || {}) };
    for (const [k, v] of Object.entries(b.anotacoes || {})) {
      if (!anotacoes[k] || !anotacoes[k].trim() || maisNovo === b) anotacoes[k] = v;
    }
    const legado = [a.xpLegado, b.xpLegado].filter((x) => typeof x === 'number');
    const conquistas = { ...(b.conquistasGanhas || {}) };
    for (const [k, v] of Object.entries(a.conquistasGanhas || {})) {
      if (!conquistas[k] || v < conquistas[k]) conquistas[k] = v;
    }
    return {
      atualizadoEm: Math.max(a.atualizadoEm || 0, b.atualizadoEm || 0),
      dia: maisNovo.dia || a.dia || 1,
      lidos: uniao(a.lidos, b.lidos),
      licoes: uniao(a.licoes, b.licoes),
      oia,
      anotacoes,
      marcadoEm: { ...(a.marcadoEm || {}), ...(b.marcadoEm || {}) },
      licoesEm: { ...(a.licoesEm || {}), ...(b.licoesEm || {}) },
      conhecidos: fundirConhecidos(a.conhecidos, b.conhecidos),
      pratica: fundirPratica(a.pratica, b.pratica),
      foto: maisNovo.foto || a.foto || b.foto || '',
      apelido: maisNovo.apelido || a.apelido || b.apelido || '',
      zeradoEm: Math.max(a.zeradoEm || 0, b.zeradoEm || 0),
      xpLegado: legado.length ? Math.max(...legado) : null,
      conquistasGanhas: conquistas,
      maiorProposito: Math.max(a.maiorProposito || 0, b.maiorProposito || 0),
      diario: fundirDiario(a.diario, b.diario),
      bausAbertos: fundirBaus(a.bausAbertos, b.bausAbertos),
      notasVistas: uniao(a.notasVistas, b.notasVistas).slice(-400),
      acertosTotal: Math.max(a.acertosTotal || 0, b.acertosTotal || 0),
      missoesTotal: Math.max(a.missoesTotal || 0, b.missoesTotal || 0),
      semanasJuntos: { ...(a.semanasJuntos || {}), ...(b.semanasJuntos || {}) },
      oradoEm: { ...(a.oradoEm || {}), ...(b.oradoEm || {}) },
      // vale o capítulo aberto por último, em qualquer aparelho
      ultimaBiblia: ((b.ultimaBiblia || {}).em || 0) >= ((a.ultimaBiblia || {}).em || 0) ? (b.ultimaBiblia || a.ultimaBiblia || null) : a.ultimaBiblia,
      marcas: fundirMarcas(a.marcas, b.marcas),
      historia: fundirHistoria(a.historia, b.historia),
    };
  }
  function fundirPratica(a, b) {
    const saida = { ...(a || {}) };
    for (const [u, p] of Object.entries(b || {})) {
      const atual = saida[u];
      saida[u] = !atual ? p
        : { melhor: Math.max(atual.melhor || 0, p.melhor || 0),
            total: p.total || atual.total || 0,
            feitoEm: (p.feitoEm || '') > (atual.feitoEm || '') ? p.feitoEm : atual.feitoEm,
            vezes: (atual.vezes || 0) + (p.vezes || 0) };
    }
    return saida;
  }
  CC.fundir = fundir;

  // O aplicativo antigo guardava as lições em "trilha" e tinha meta e protetor guardados.
  function normalizar(bruto) {
    if (!bruto || typeof bruto !== 'object' || bruto.vazio) return null;
    const e = { ...VAZIO(), ...bruto };
    if (bruto.trilha && !bruto.licoes) e.licoes = bruto.trilha;
    delete e.trilha;
    delete e.meta;
    delete e.protegidos;
    e.lidos = (e.lidos || []).map(Number).filter((n) => n >= 1 && n <= D.plano.length);
    return e;
  }
  CC.normalizarEstado = normalizar;

  const localLer = (chave) => {
    try {
      const v = localStorage.getItem(chave);
      return v ? normalizar(JSON.parse(v)) : null;
    } catch (e) { return null; }
  };
  const localGravar = () => {
    try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) { /* segue */ }
  };

  // O progresso vai inteiro a cada marcação, menos a foto: ela é quase todo o peso (uns 30 KB)
  // e quase nunca muda. Vai só quando é diferente da que o servidor já tem; sem ela no
  // pedido, a fusão do servidor fica com a que estava guardada.
  let fotoNoServidor = null;
  function corpoDoEnvio() {
    const foto = E.foto || '';
    if (foto && foto === fotoNoServidor) {
      const { foto: _semFoto, ...resto } = E;
      return { corpo: JSON.stringify(resto), foto };
    }
    return { corpo: JSON.stringify(E), foto };
  }
  function enviar() {
    const { corpo, foto } = corpoDoEnvio();
    return fetch('api/estado', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: corpo })
      .then((r) => { if (r.ok) fotoNoServidor = foto; })
      .catch(() => { servidorVivo = false; });
  }

  let envioPendente;
  function enviarAoServidor() {
    if (!servidorVivo) return;
    clearTimeout(envioPendente);
    envioPendente = setTimeout(enviar, 600);
  }

  // Grava agora, sem esperar a pausa: o servidor precisa saber que a pessoa leu antes
  // de aceitar o toque que ela vai dar num amigo.
  CC.salvarNoServidor = function () {
    if (!servidorVivo) return Promise.resolve();
    clearTimeout(envioPendente);
    return enviar();
  };

  CC.estado = () => E;
  CC.ler = (chave, padrao) => (E[chave] === undefined ? padrao : E[chave]);
  CC.gravar = (chave, valor) => {
    E[chave] = valor;
    E.atualizadoEm = Date.now();
    localGravar();
    enviarAoServidor();
  };

  CC.registro = (dia) => E.oia[dia] || { o: '', i: '', a: '', oracao: '' };
  CC.gravarRegistro = (dia, valor) => { E.oia[dia] = valor; CC.gravar('atualizadoEm', Date.now()); };
  CC.temRegistro = (dia) => {
    const r = E.oia[dia];
    return !!r && Object.values(r).some((x) => (x || '').trim());
  };
  // Marca-texto: a chave é "Livro cap:vers", um versículo por chave.
  CC.marcaDe = (chave) => ((E.marcas || {})[chave] || {}).cor || 0;
  CC.marcar = (chaves, cor) => {
    const em = Date.now();
    for (const k of chaves) (E.marcas ||= {})[k] = { cor, em };
    CC.gravar('atualizadoEm', em);
  };
  CC.marcas = () => Object.entries(E.marcas || {}).filter(([, m]) => m.cor).map(([chave, m]) => ({ chave, cor: m.cor, em: m.em }));

  CC.anotacao = (chave) => (E.anotacoes || {})[chave] || '';
  CC.gravarAnotacao = (chave, texto) => {
    (E.anotacoes ||= {})[chave] = texto;
    CC.gravar('atualizadoEm', Date.now());
  };

  // Minha história com Deus: guia privado do Perfil. Só volta pela própria conta da pessoa
  // (api/estado); nunca sai em amigos, célula, discipulado ou painel.
  CC.minhaHistoria = () => E.historia || null;
  CC.gravarHistoria = (antes, encontro, hoje) => {
    CC.gravar('historia', { antes, encontro, hoje, em: Date.now() });
  };

  // ---------- marcação ----------
  CC.leu = (dia) => E.lidos.includes(Number(dia));
  CC.marcarLido = (dia, marcar) => {
    const n = Number(dia);
    const i = E.lidos.indexOf(n);
    if (marcar && i === -1) { E.lidos.push(n); E.marcadoEm[n] = CC.hojeIso(); }
    if (!marcar && i !== -1) { E.lidos.splice(i, 1); delete E.marcadoEm[n]; }
    CC.gravar('lidos', E.lidos);
  };

  CC.fezLicao = (id) => E.licoes.includes(id);
  CC.marcarLicao = (id, marcar) => {
    const i = E.licoes.indexOf(id);
    if (marcar && i === -1) { E.licoes.push(id); (E.licoesEm ||= {})[id] = CC.hojeIso(); }
    if (!marcar && i !== -1) { E.licoes.splice(i, 1); delete (E.licoesEm || {})[id]; }
    CC.gravar('licoes', E.licoes);
  };

  // O "Orei" do dia. Guarda só a data: é o que o propósito de oração enxerga.
  CC.marcarOrei = () => {
    (E.oradoEm ||= {})[CC.hojeIso()] = 1;
    CC.gravar('oradoEm', E.oradoEm);
  };

  // ---------- conhecer jesus ----------
  CC.conhecido = (n) => !!(E.conhecidos || {})[n];
  CC.marcarConhecido = (n) => {
    (E.conhecidos ||= {})[n] = CC.hojeIso();
    CC.gravar('conhecidos', E.conhecidos);
  };
  CC.conhecidos = () => Object.keys(E.conhecidos || {}).map(Number);

  // ---------- ofensiva e escudos ----------
  // Uma data está feita quando houve lição do plano, primeiros passos lidos até o fim, ou
  // um dia do Conhecer Jesus terminado: quem está nesse caminho também tem ofensiva.
  CC.datasFeitas = (estado) => {
    const s = new Set();
    for (const d of Object.values((estado || E).marcadoEm || {})) if (d) s.add(d);
    for (const d of Object.values((estado || E).licoesEm || {})) if (d) s.add(d);
    for (const d of Object.values((estado || E).conhecidos || {})) if (d) s.add(d);
    return s;
  };

  // A ofensiva é contada do começo, dia a dia, para dar sempre o mesmo resultado em
  // qualquer aparelho e no servidor. Escudo: começa com 1, ganha 1 a cada mês e 1 a
  // cada 7 dias seguidos, guarda no máximo 2. Um buraco de dias em branco é coberto
  // inteiro se houver escudos para todos eles; se não houver, a ofensiva zera e nenhum
  // escudo é gasto à toa. Hoje nunca é buraco: o dia ainda não acabou.
  CC.simularOfensiva = function (datas, hoje) {
    const feitas = new Set(datas);
    const r = { atual: 0, recorde: 0, escudos: 1, protegidos: [], feitoHoje: feitas.has(hoje), zerouEm: null, recomeco: false };
    const ordenadas = [...feitas].filter((d) => d <= hoje).sort();
    if (!ordenadas.length) return r;

    const mesDe = (d) => d.slice(0, 7);
    const ganhar = () => { r.escudos = Math.min(2, r.escudos + 1); };
    const ontem = CC.somaDias(hoje, -1);
    let mes = mesDe(ordenadas[0]);
    let corrida = 0;
    let zerou = false;
    let d = ordenadas[0];

    while (d <= hoje) {
      if (mesDe(d) !== mes) { mes = mesDe(d); ganhar(); }
      if (feitas.has(d)) {
        corrida++;
        if (corrida % 7 === 0) ganhar();
        if (corrida > r.recorde) r.recorde = corrida;
        if (zerou && corrida >= 3) r.recomeco = true;
        d = CC.somaDias(d, 1);
        continue;
      }
      if (d === hoje) break;
      let fim = d;
      let tamanho = 0;
      while (fim <= ontem && !feitas.has(fim)) {
        if (mesDe(fim) !== mes) { mes = mesDe(fim); ganhar(); }
        tamanho++;
        fim = CC.somaDias(fim, 1);
      }
      if (corrida > 0 && tamanho <= r.escudos) {
        r.escudos -= tamanho;
        for (let i = 0, c = d; i < tamanho; i++, c = CC.somaDias(c, 1)) r.protegidos.push(c);
      } else {
        if (corrida > 0) { zerou = true; r.zerouEm = d; }
        corrida = 0;
      }
      d = fim;
    }
    r.atual = corrida;
    return r;
  };

  // Recebe as datas por parâmetro para poder ser exercitada por teste.
  CC.sequencia = function (marcadas, referencia) {
    const datas = marcadas ? new Set(Object.values(marcadas)) : CC.datasFeitas();
    const s = CC.simularOfensiva(datas, referencia || CC.hojeIso());
    return { ...s, recorde: Math.max(s.recorde, s.atual), total: datas.size };
  };

  // ---------- prática ----------
  CC.praticaDe = (unidade) => (E.pratica || {})[unidade] || { melhor: 0, total: 0, feitoEm: null };

  // Guarda só o melhor resultado de cada unidade: repetir uma prática já dominada não
  // infla o total, mas melhorar a pontuação conta.
  CC.registrarPratica = function (unidade, acertos, total) {
    const atual = CC.praticaDe(unidade);
    const pratica = { ...(E.pratica || {}) };
    pratica[unidade] = {
      melhor: Math.max(atual.melhor || 0, acertos),
      total,
      feitoEm: CC.hojeIso(),
      vezes: (atual.vezes || 0) + 1,
    };
    CC.gravar('pratica', pratica);
  };

  CC.xpPratica = () => Object.values(E.pratica || {})
    .reduce((s, p) => s + (p.melhor || 0) * CC.XP_PRATICA_ACERTO, 0);

  // ---------- ritmo ----------
  CC.ritmo = function () {
    const JANELA = 28;
    const hoje = CC.hojeIso();
    const inicio = CC.somaDias(hoje, -(JANELA - 1));
    const datas = new Set(Object.values(E.marcadoEm || {}));
    let dias = 0;
    for (const d of datas) if (d >= inicio && d <= hoje) dias++;
    const porSemana = (dias / JANELA) * 7;
    const faltam = D.plano.length - E.lidos.length;
    if (!dias || !faltam) return { porSemana, faltam, termino: null };
    const fim = new Date();
    fim.setDate(fim.getDate() + Math.round((faltam / porSemana) * 7));
    return { porSemana, faltam, termino: fim };
  };

  // ---------- XP (privado) ----------
  CC.xpTotal = () => E.lidos.length * CC.XP_LEITURA + E.licoes.length * CC.XP_LICAO
    + CC.xpPratica() + (E.xpLegado || 0);


  // ---------- livros ----------
  const DIAS_POR_LIVRO = (() => {
    const mapa = new Map();
    for (const d of D.plano) {
      for (const l of d.livros) {
        if (!mapa.has(l)) mapa.set(l, []);
        mapa.get(l).push(d.numero);
      }
    }
    return mapa;
  })();
  CC.totalLivros = DIAS_POR_LIVRO.size;
  CC.ultimaBiblia = () => E.ultimaBiblia || null;
  CC.guardarUltimaBiblia = (livro, cap) => {
    const u = E.ultimaBiblia;
    if (u && u.livro === livro && u.cap === cap) return;
    CC.gravar('ultimaBiblia', { livro, cap, em: Date.now() });
  };
  CC.progressoDoLivro = (livro) => {
    const dias = DIAS_POR_LIVRO.get(livro) || [];
    const lidos = new Set(E.lidos);
    return { lidos: dias.filter((x) => lidos.has(x)).length, total: dias.length };
  };
  const livroCompleto = (l) => { const p = CC.progressoDoLivro(l); return p.total > 0 && p.lidos === p.total; };
  CC.livrosCompletos = () => [...DIAS_POR_LIVRO.keys()].filter(livroCompleto).length;

  // ---------- foto ----------
  CC.LADO_FOTO = 256;
  CC.foto = () => E.foto || '';
  CC.apelido = () => E.apelido || '';

  CC.prepararFoto = function (arquivo) {
    return new Promise((resolver, rejeitar) => {
      if (!arquivo || !/^image\//.test(arquivo.type)) {
        rejeitar(new Error('isso não é uma imagem'));
        return;
      }
      const leitor = new FileReader();
      leitor.onerror = () => rejeitar(new Error('não consegui ler o arquivo'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => rejeitar(new Error('não consegui abrir a imagem'));
        img.onload = () => {
          try {
            const lado = CC.LADO_FOTO;
            const tela = document.createElement('canvas');
            tela.width = lado;
            tela.height = lado;
            const ctx = tela.getContext('2d');
            const corte = Math.min(img.width, img.height);
            ctx.drawImage(img, (img.width - corte) / 2, (img.height - corte) / 2, corte, corte, 0, 0, lado, lado);
            resolver(tela.toDataURL('image/jpeg', 0.82));
          } catch (e) {
            rejeitar(new Error('não consegui preparar a imagem'));
          }
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  };
  CC.guardarFoto = (dados) => CC.gravar('foto', dados || '');
  CC.guardarApelido = (texto) => CC.gravar('apelido', String(texto || '').slice(0, 20));

  // ---------- conquistas (privadas) ----------
  const LEGADO = {
    'Escriba': ['caneta', 'Dez registros escritos, da versão anterior'],
    'Estante cheia': ['livro', 'Vinte livros concluídos, da versão anterior'],
    'Os sessenta e seis': ['coroa', 'Todos os livros, da versão anterior'],
  };

  // As conquistas agora têm níveis (02b-jogo.js). As da primeira versão, que não existem
  // mais, continuam na estante de quem as ganhou.
  CC.conquistasLegado = () => Object.entries(E.conquistasGanhas || {})
    .filter(([titulo]) => LEGADO[titulo])
    .map(([titulo, desde]) => ({ titulo, descricao: LEGADO[titulo][1], icone: LEGADO[titulo][0], desde }));

  // Quais níveis de cada conquista a pessoa tem agora, para comparar antes e depois.
  CC.fotoDosNiveis = () => {
    const foto = {};
    for (const c of CC.conquistasComNivel()) foto[c.id] = c.nivel;
    return foto;
  };

  // Guarda a data de cada nível na primeira vez que ele aparece, para não sumir se um
  // critério mudar depois. Devolve os níveis que acabaram de ser guardados.
  CC.guardarConquistas = () => {
    const ganhas = { ...(E.conquistasGanhas || {}) };
    const novos = [];
    for (const c of CC.conquistasComNivel()) {
      for (let n = 1; n <= c.nivel; n++) {
        const chave = 'nivel:' + c.id + ':' + n;
        if (!ganhas[chave]) { ganhas[chave] = CC.hojeIso(); novos.push({ ...c, nivel: n }); }
      }
    }
    if (novos.length) CC.gravar('conquistasGanhas', ganhas);
    return novos;
  };

  CC.anotarProposito = (dias) => {
    if (Number(dias) > (E.maiorProposito || 0)) CC.gravar('maiorProposito', Number(dias));
  };

  // Quem vem da versão com XP por registro e conquistas antigas não perde nada.
  CC.migrarEstado = () => {
    // Acertos de antes do contador: o melhor de cada unidade é o que se sabe deles.
    const melhores = Object.values(E.pratica || {}).reduce((s, p) => s + (p.melhor || 0), 0);
    if ((E.acertosTotal || 0) < melhores) CC.gravar('acertosTotal', melhores);
    if (typeof E.xpLegado === 'number') return;
    const registros = E.lidos.filter((d) => CC.temRegistro(d)).length;
    const ganhas = { ...(E.conquistasGanhas || {}) };
    const escritos = Object.keys(E.oia || {}).filter((k) => CC.temRegistro(k)).length;
    const hoje = CC.hojeIso();
    if (escritos >= 10) ganhas['Escriba'] ||= hoje;
    if (CC.livrosCompletos() >= 20) ganhas['Estante cheia'] ||= hoje;
    if (CC.livrosCompletos() >= CC.totalLivros) ganhas['Os sessenta e seis'] ||= hoje;
    E.conquistasGanhas = ganhas;
    CC.gravar('xpLegado', registros * 5);
  };

  // ---------- exportação ----------
  CC.montarExportacao = function () {
    const L = [];
    const nl = String.fromCharCode(10);
    const seq = CC.sequencia();
    L.push('# Geração Eleita: meus registros', '');
    L.push('Exportado em ' + CC.hojeIso() + '.', '');
    L.push('## Progresso', '');
    L.push('- Dias lidos: ' + E.lidos.length + ' de ' + D.plano.length);
    L.push('- Ofensiva atual: ' + seq.atual + ' · recorde: ' + seq.recorde);
    L.push('- Primeiros passos: ' + E.licoes.length + ' de ' + D.licoes.length);
    L.push('- Livros concluídos: ' + CC.livrosCompletos() + ' de ' + CC.totalLivros, '');

    const comTexto = Object.keys(E.oia || {}).filter((k) => CC.temRegistro(k)).sort((a, b) => Number(a) - Number(b));
    if (comTexto.length) {
      L.push('## Registros de leitura', '');
      for (const k of comTexto) {
        const d = D.plano[Number(k) - 1];
        const r = E.oia[k];
        L.push('### Dia ' + k + (d ? ': ' + [d.antigo, d.novo].filter(Boolean).join(' | ') : ''));
        if (E.marcadoEm[k]) L.push('', 'Lido em ' + E.marcadoEm[k] + '.');
        for (const [chave, rotulo] of [['o', 'Observação'], ['i', 'Interpretação'], ['a', 'Aplicação'], ['oracao', 'Oração']]) {
          if (!(r[chave] || '').trim()) continue;
          L.push('', '**' + rotulo + '**', '', r[chave].trim());
        }
        L.push('');
      }
    }

    const anot = E.anotacoes || {};
    const comTextoAnot = Object.keys(anot).filter((k) => (anot[k] || '').trim()).sort();
    const deVerso = comTextoAnot.filter((k) => k.startsWith('verso:'));
    if (deVerso.length) {
      L.push('## Notas nos versículos', '');
      for (const k of deVerso) L.push('### ' + k.slice(6), '', anot[k].trim(), '');
    }
    const chaves = comTextoAnot.filter((k) => !k.startsWith('verso:'));
    if (chaves.length) {
      L.push('## Anotações', '');
      for (const k of chaves) {
        const alvo = k.replace(/^(nota|secao):/, '');
        const nome = D.notas[alvo] ? D.notas[alvo].nome : alvo;
        L.push('### ' + CC.semPrefixo(nome), '', anot[k].trim(), '');
      }
    }
    return L.join(nl);
  };

  CC.baixarExportacao = function () {
    const blob = new Blob([CC.montarExportacao()], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'geracao-eleita-' + CC.hojeIso() + '.md';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };

  CC.zerarProgresso = function () {
    const agora = Date.now();
    E = { ...VAZIO(), xpLegado: 0, atualizadoEm: agora, zeradoEm: agora };
    localGravar();
    enviarAoServidor();
  };

  // Limpa só o que ficou neste aparelho, sem avisar o servidor.
  CC.zerarLocal = function () {
    E = VAZIO();
    try { localStorage.removeItem(CHAVE); } catch (e) { /* segue */ }
    try { localStorage.removeItem(CHAVE_ANTIGA); } catch (e) { /* segue */ }
  };

  // ---------- tema ----------
  CC.aplicarTema = (escuro) => {
    document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro';
    const cor = document.querySelector('meta[name="theme-color"]');
    if (cor) cor.content = escuro ? '#15110b' : '#fdfbf5';
  };
  // null segue o sistema; true e false fixam o escuro ou o claro.
  CC.guardarTema = (escuro) => {
    try {
      if (escuro === null) localStorage.removeItem(CHAVE_TEMA);
      else localStorage.setItem(CHAVE_TEMA, JSON.stringify(escuro));
    } catch (e) { /* segue */ }
    CC.aplicarTema(escuro === null ? matchMedia('(prefers-color-scheme: dark)').matches : escuro);
  };
  CC.temaGuardado = () => {
    try {
      const v = localStorage.getItem(CHAVE_TEMA);
      return v === null ? null : JSON.parse(v);
    } catch (e) { return null; }
  };

  // ---------- partida e sincronização ----------
  CC.carregarLocal = function () {
    E = localLer(CHAVE) || localLer(CHAVE_ANTIGA) || VAZIO();
  };

  CC.sincronizar = async function (primeiraVez) {
    let doServidor = null;
    let dono = '';
    if (location.protocol.startsWith('http')) {
      try {
        const q = await fetch('api/quem', { cache: 'no-store' });
        // Sessão vencida ou quem acabou de sair: o aplicativo guardado no aparelho abre
        // sem conta, e a pessoa precisa voltar à tela de entrada. Sem rede, o fetch
        // falha antes de chegar aqui e o aplicativo segue funcionando com o que tem.
        if (q.status === 401) {
          location.replace('entrar.html' + location.search);
          return false;
        }
        if (q.ok) {
          const quem = await q.json();
          dono = quem.usuario || '';
          CC.quem = quem;
        }
      } catch (e) { /* sem servidor, segue sem dono */ }
      try {
        const r = await fetch('api/estado', { cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          servidorVivo = true;
          doServidor = normalizar(d);
          fotoNoServidor = (doServidor && doServidor.foto) || '';
        }
      } catch (e) { servidorVivo = false; }
    }

    // Num aparelho compartilhado, quem sai deixa o progresso no localStorage: a próxima
    // pessoa não pode herdá-lo. Progresso sem dono também fica de fora: veio da versão
    // sem contas ou do servidor aberto de teste, e somado a uma conta nova aparecia
    // como fases já concluídas por quem nunca leu nada.
    if (dono && E.dono !== dono) E = VAZIO();

    const antes = JSON.stringify(E);
    E = fundir(E, doServidor);
    if (dono) E.dono = dono;
    localGravar();
    if (servidorVivo && (doServidor === null || JSON.stringify(E) !== JSON.stringify({ ...doServidor, dono }))) {
      enviarAoServidor();
    }
    const mudou = JSON.stringify(E) !== antes;
    if (!primeiraVez && mudou && CC.redesenhar) CC.redesenhar();
    return mudou;
  };
})(window.CC);
