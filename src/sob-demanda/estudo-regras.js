/* As regras do estudo da célula (À Mesa), sem tela: os passos do modo encontro, o texto que vai
   para o grupo do WhatsApp, onde o estudo está no plano, as perguntas para escolher e o HTML de
   cada parte. O build junta este arquivo com estudo-celula.js na peça estudo-celula; o teste.mjs o
   roda no vm, sem DOM (docs/a-mesa-fase1.md, seção 5.4).
   O texto bíblico não passa por aqui: o cartão leva a referência, e as palavras vêm da Bíblia do
   app na hora de desenhar (CC.textoDoVersiculo). As letras especiais (seta, aspas curvas, ponto do
   meio) vão escritas como escape. */
(function (CC) {
  'use strict';

  // ---------- os textos de sempre (vieram de 08b-propositos.js) ----------
  const PERGUNTAS_OIA = [
    'O que o texto diz? Contem com as próprias palavras, sem interpretar ainda.',
    'O que o autor quis dizer a quem leu primeiro? O que isso mostra sobre Deus e sobre nós?',
    'O que muda na minha semana? Uma atitude concreta, com dia e hora.',
  ];
  const PERGUNTAS_ACOLHIDA = [
    'Qual foi a melhor parte da sua semana?',
    'O que fez você rir nos últimos dias?',
    'Se você pudesse passar um dia em qualquer lugar, onde seria?',
    'Qual música não sai da sua cabeça esta semana?',
    'Conte uma coisa pequena pela qual você quer agradecer hoje.',
    'Qual foi a parte mais difícil da sua semana?',
    'Quem ajudou você nos últimos dias?',
    'Qual comida lembra a sua casa?',
  ];
  const SUGESTAO_ADORACAO = 'Escolham juntos uma música de louvor para começar.';
  const SUGESTAO_TESTEMUNHO = 'Quem vocês querem convidar para o próximo encontro? Orem juntos por essas pessoas, pelo nome.';
  const ORAR = 'Orem uns pelos outros, a partir do que conversaram.';
  // o começo e a oração do roteiro de semana e trecho (a aba e o texto do grupo dizem o mesmo)
  const COMECAR_SEMANA = 'Cada um conta, em uma frase, o que mais marcou na leitura da semana.';
  const ORAR_TRECHO = 'Orem a partir do que o texto mostrou.';
  // A leitura da semana guardada sem a semana do plano (planoAte 0, as de antes da v19), aberta
  // como estudo anterior ou impressa: os dias daquela semana não ficaram guardados.
  const SEMANA_SEM_DIAS = 'Os dias do plano que a célula leu naquela semana não ficaram guardados.';
  const SETA = ' \u2192 ';
  const ABRE = '\u201c';
  const FECHA = '\u201d';
  const PONTO = ' · ';
  // A mesma pergunta de acolhida para a célula inteira na semana: escolhida pela semana do ano.
  const diaDoAno = (iso) => Math.floor((Date.parse(iso + 'T12:00:00Z') - Date.parse(iso.slice(0, 4) + '-01-01T12:00:00Z')) / 86400000) + 1;
  const sugestaoAcolhida = (iso) => PERGUNTAS_ACOLHIDA[Math.floor((diaDoAno(iso) - 1) / 7) % PERGUNTAS_ACOLHIDA.length];

  const esc = (s) => CC.esc(String(s == null ? '' : s));
  // Escapa tudo e só depois o *negrito* (o do WhatsApp) vira <b>: nenhuma outra marca vira HTML.
  const negrito = (s) => esc(s).replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
  const semAsteriscos = (s) => String(s || '').replace(/\*+/g, '');
  const lerR = (ref) => (typeof ref === 'string' ? CC.lerRefLivre(ref) : ref);
  const escrever = (r) => CC.escreverRef(r.livro, r.cap, r.de, r.ate);

  // Duas referências se cruzam: o mesmo livro e capítulo e algum versículo em comum. O capítulo
  // inteiro cruza tudo o que é dele.
  function cruza(a, b) {
    const x = lerR(a);
    const y = lerR(b);
    if (!x || !y || x.livro !== y.livro || x.cap !== y.cap) return false;
    if (!x.de || !y.de) return true;
    return x.de <= (y.ate || y.de) && y.de <= (x.ate || x.de);
  }

  // O cartão de uma referência do trecho: até CC.MAX_TRECHO versículos, guardando o que foi escrito.
  // versiculos(livro, cap), quando houver, diz quantos o capítulo tem (Salmos 117 tem 2).
  function cartaoDe(ref, versiculos) {
    const r = lerR(ref);
    if (!r) return null;
    const de = r.de || 1;
    let ate = r.inteiro ? de + CC.MAX_TRECHO - 1 : Math.min(r.ate, de + CC.MAX_TRECHO - 1);
    const total = versiculos ? Number(versiculos(r.livro, r.cap)) || 0 : 0;
    if (total && ate > total) ate = Math.max(de, total);
    const b = { t: 'versiculo', ref: CC.escreverRef(r.livro, r.cap, de, ate) };
    if (b.ref !== escrever(r)) b.escrito = escrever(r);
    return b;
  }
  // O cartão mostra menos do que o líder escreveu? O capítulo inteiro de mais versículos do que o
  // cartão mostra, e o trecho de mais de 10. O "Salmos 117" (2 versículos) e o "Salmos 117.1-5"
  // não: o cartão já mostra o capítulo inteiro. Sem a contagem da Bíblia, o capítulo inteiro
  // conta como cortado quando o cartão mostra os 10 (o servidor cortou pelo que o capítulo tem).
  function cortaTrecho(b, versiculos) {
    const r = b && b.escrito ? lerR(b.escrito) : null;
    const c = b ? lerR(b.ref) : null;
    if (!r || !c) return false;
    const mostra = (c.ate || c.de) - (c.de || 1) + 1;
    const total = versiculos ? Number(versiculos(r.livro, r.cap)) || 0 : 0;
    if (r.inteiro) return total ? total > mostra : mostra >= CC.MAX_TRECHO;
    return (total ? Math.min(r.ate, total) : r.ate) - (r.de || 1) + 1 > mostra;
  }
  // O capítulo de um cartão, para "Abrir Efésios 6 na Bíblia".
  function capituloDe(ref) {
    const r = lerR(ref);
    return r ? { livro: r.livro, cap: r.cap } : null;
  }

  // ---------- a leitura da semana (o roteiro "Leitura da semana") ----------
  // Os 7 dias do plano até "ate" (o dia em que o líder estava ao salvar), a referência-chave (a
  // da reflexão do 4º dia), uma pergunta de dias espalhados e o começo de oração do último dia.
  function semana(ate) {
    const plano = CC.D.plano;
    const n = Math.min(plano.length, Math.max(7, Number(ate) || 7));
    const dias = [];
    for (let k = n - 6; k <= n; k++) dias.push({ n: k, dia: plano[k - 1], r: CC.reflexaoDoDia(k) });
    const chave = dias[3].r.ref ? dias[3] : dias.find((d) => d.r.ref) || dias[0];
    const perguntas = [0, 2, 4, 6].map((i) => ({ d: dias[i], q: (dias[i].r.perguntas || [])[0] })).filter((x) => x.q);
    const oracao = (dias[6].r.oracao || []).slice(0, 3);
    return { de: n - 6, ate: n, dias, chave, perguntas, oracao };
  }

  const paragrafos = (texto) => String(texto || '').split(/\n+/).map((s) => s.trim()).filter(Boolean).map((texto) => ({ t: 'texto', texto }));
  const passagem = (d) => [d.antigo, d.novo].filter(Boolean).join(' e ');
  // como CC.passagemDe (03-trilha.js), que não roda fora da tela
  const passagemDoDia = (d) => [d.antigo, d.novo].filter(Boolean).join(PONTO);

  // O título que o estudo mostra. O escrito de antes da v19 (livre) não tinha título.
  function titulo(e) {
    if (e.tipo === 'semana') return 'A leitura da semana';
    if (e.tipo === 'trecho') return e.titulo || e.ref || '';
    return e.titulo || '';
  }

  // Semana, trecho e o escrito de antes da v19 em partes, como o estudo escrito: assim a tela, o
  // encontro e o WhatsApp tratam todos do mesmo jeito. "dias" só existe aqui, nunca é gravado.
  // versiculos(livro, cap), quando houver: o cartão do capítulo curto mostra só o que ele tem.
  function comoBlocos(e, sem, versiculos) {
    if (!e) return [];
    if (e.tipo === 'blocos') return e.blocos || [];
    const b = paragrafos(e.texto);
    if (e.tipo === 'trecho') {
      const c = cartaoDe(e.ref, versiculos);
      if (c) b.push(c);
    }
    if (e.tipo === 'semana' && sem) {
      if (sem.chave.r.ref) b.push(cartaoDe(sem.chave.r.ref));
      b.push({ t: 'texto', texto: 'A leitura da semana, dias ' + sem.de + ' a ' + sem.ate + ' do plano:' });
      b.push({ t: 'dias', dias: sem.dias.map((d) => ({ n: d.n, passagem: passagemDoDia(d.dia), titulo: d.r.titulo || '' })) });
    }
    return b.filter(Boolean);
  }

  // As perguntas do estudo. Lista vazia em semana e trecho quer dizer as de sempre: as das
  // reflexões da semana e as do método OIA.
  function perguntasDe(e, sem) {
    if (e.perguntas && e.perguntas.length) return e.perguntas.slice();
    if (e.tipo === 'semana' && sem) return sem.perguntas.map((x) => x.q);
    if (e.tipo === 'trecho') return PERGUNTAS_OIA.slice();
    return [];
  }

  // ---------- o modo encontro, passo a passo ----------
  // Cada cartão, do segundo em diante, abre uma parte nova; o texto logo antes dele vai junto
  // quando termina em dois pontos ("E Paulo acrescenta algo fundamental:").
  function dividir(blocos) {
    const partes = [[]];
    let cartoes = 0;
    for (const b of blocos) {
      let parte = partes[partes.length - 1];
      if (b.t === 'versiculo') {
        if (cartoes) {
          const nova = [];
          const ultimo = parte[parte.length - 1];
          if (ultimo && ultimo.t === 'texto' && /:\s*$/.test(ultimo.texto)) nova.push(parte.pop());
          partes.push(nova);
          parte = nova;
        }
        cartoes++;
      }
      parte.push(b);
    }
    return partes;
  }

  // contexto: conduzo (líder e auxiliar: o último passo abre o registro), visitante (sem a aba
  // Oração), acolhida, adoracao, testemunho, semana e versiculos (como em comoBlocos). Nenhum passo da Palavra leva os 4 Ws, e o
  // "Para guardar" só aparece no último. Orar juntos não tem versículo (decisão do dono, 17/10).
  // combinadoAnterior (o texto do combinado do estudo de antes): a acolhida começa por ele, e a
  // pergunta da acolhida vai para o corpo do passo. O combinado deste estudo vira o passo "Para a
  // semana", logo antes de Orar juntos. Ninguém marca se cumpriu (docs/a-mesa-fase2.md, 4.6).
  function passos(e, contexto) {
    const c = contexto || {};
    const lista = [
      c.combinadoAnterior
        ? { tipo: 'acolhida', etiqueta: 'Acolhida', frase: lembrarCombinado(c.combinadoAnterior), pergunta: c.acolhida || '' }
        : { tipo: 'acolhida', etiqueta: 'Acolhida', frase: c.acolhida || '' },
      { tipo: 'adoracao', etiqueta: 'Adoração', frase: c.adoracao || '' },
    ];
    const todos = comoBlocos(e, c.semana, c.versiculos);
    const guardar = todos.filter((b) => b.t === 'guardar');
    const blocos = todos.filter((b) => b.t !== 'guardar');
    const nome = titulo(e);
    const primeiro = blocos.find((b) => b.t === 'versiculo');
    const abrir = primeiro ? capituloDe(primeiro.ref) : null;
    const segmentos = [];
    let atual = { tipo: 'inicio', blocos: [] };
    for (const b of blocos) {
      if (b.t === 'topico' || b.t === 'conclusao') {
        segmentos.push(atual);
        atual = { tipo: b.t, topico: b, blocos: [] };
      } else atual.blocos.push(b);
    }
    segmentos.push(atual);
    const comTopicos = segmentos.some((s) => s.tipo === 'topico');
    segmentos.forEach((s, k) => {
      if (s.tipo === 'inicio' && comTopicos) {
        lista.push({ tipo: 'palavra', etiqueta: 'Abertura', titulo: nome, abrir, blocos: s.blocos });
        return;
      }
      if (s.tipo === 'inicio' && !s.blocos.length && segmentos.length > 1) return;
      const partes = dividir(s.blocos);
      partes.forEach((parte, i) => {
        const varias = partes.length > 1;
        let etiqueta = 'A Palavra' + (varias ? ', ' + (i + 1) + ' de ' + partes.length : '');
        if (s.tipo !== 'inicio') etiqueta = (s.tipo === 'topico' ? 'Tópico ' + s.topico.n : 'Conclusão') + (varias ? ', parte ' + (i + 1) + ' de ' + partes.length : '');
        lista.push({
          tipo: 'palavra', etiqueta,
          titulo: s.tipo === 'topico' ? s.topico.texto : s.tipo === 'conclusao' || i === 0 ? nome : '',
          abrir: s.tipo === 'inicio' && i === 0 && k === 0 ? abrir : null,
          blocos: parte,
        });
      });
    });
    const qs = perguntasDe(e, c.semana);
    qs.forEach((q, i) => lista.push({ tipo: 'pergunta', etiqueta: 'Para conversar' + (qs.length > 1 ? ', ' + (i + 1) + ' de ' + qs.length : ''), frase: q }));
    if (e.combinado) lista.push({ tipo: 'combinado', etiqueta: 'Para a semana', frase: e.combinado });
    lista.push({ tipo: 'orar', etiqueta: 'Orar juntos', frase: ORAR, convite: !c.visitante });
    lista.push({ tipo: 'testemunho', etiqueta: 'Testemunho', frase: c.testemunho || '' });
    lista.push({ tipo: 'fechar', etiqueta: 'Fechar o encontro', frase: guardar.length ? guardar[guardar.length - 1].texto : '', registrar: !!c.conduzo });
    return lista;
  }

  // ---------- o texto para o grupo do WhatsApp (sempre o estudo inteiro) ----------
  // O texto logo antes ou logo depois do cartão já traz a mesma referência ("Em Lucas 11:24-26,
  // Jesus..."): o "Leiam:" sairia repetido. Capítulo citado ("Efésios 6") não conta.
  function citaAoLado(blocos, i) {
    const b = blocos[i];
    const mesma = (x) => !!x && x.t === 'texto' && CC.refsNoTexto(semAsteriscos(x.texto)).some((r) => r.maiuscula && !r.inteiro && [b.ref, b.escrito].includes(escrever(r)));
    return mesma(blocos[i - 1]) || mesma(blocos[i + 1]);
  }
  // contexto: data ("quinta, 22/10" ou ''), principal ({ texto, abreviatura }: o primeiro cartão
  // por extenso, vindo da Bíblia na hora; sem rede, só a referência), endereco e semana.
  function textoParaGrupo(e, contexto) {
    const c = contexto || {};
    const saida = ['*' + (titulo(e) || 'Estudo do encontro') + '*'];
    if (c.data) saida.push('Para o encontro de ' + c.data);
    saida.push('');
    const blocos = comoBlocos(e, c.semana, c.versiculos);
    const iPrincipal = blocos.findIndex((b) => b.t === 'versiculo');
    // colar: 'sempre' depois do título de um tópico ou da conclusão; 'lista' depois de um texto
    // que termina em dois pontos (cola só na lista com seta, no "Leiam:" e nos dias)
    let colar = '';
    let branco = false;
    const por = (linhas, tipo, principal) => {
      const junto = !principal && !branco && (colar === 'sempre' || (colar === 'lista' && /^(seta|leiam|dias)$/.test(tipo)));
      if (saida[saida.length - 1] !== '' && !junto) saida.push('');
      saida.push(...linhas);
      branco = !!principal;
    };
    blocos.forEach((b, i) => {
      if (b.t === 'versiculo') {
        // a leitura da semana começa como na aba: cada um conta o que mais marcou
        if (i === iPrincipal && e.tipo === 'semana') { por(['*Para começar*', COMECAR_SEMANA], 'texto'); colar = ''; }
        if (i === iPrincipal) {
          const p = c.principal || {};
          por(['*Leiam juntos:* ' + b.ref + (p.abreviatura ? ' (' + p.abreviatura + ')' : '')].concat(p.texto ? [ABRE + p.texto + FECHA] : []), 'leiam', true);
        } else if (!citaAoLado(blocos, i)) por(['Leiam: ' + (b.escrito || b.ref)], 'leiam');
        else return;
        colar = '';
        return;
      }
      if (b.t === 'topico') { por(['*' + b.n + '. ' + b.texto + '*'], 'topico'); colar = 'sempre'; return; }
      if (b.t === 'conclusao') { por(['*Conclusão*'], 'conclusao'); colar = 'sempre'; return; }
      if (b.t === 'texto') { por([b.texto], 'texto'); colar = /:\s*$/.test(b.texto) ? 'lista' : ''; return; }
      if (b.t === 'seta') por(b.itens.map(([item, sentido]) => (b.destaque ? '*' + item + SETA + sentido + '*' : item + SETA + sentido)), 'seta');
      // a frase que já vem entre aspas não ganha outras
      else if (b.t === 'citacao') por(['> ' + (/^[\u201c"\u00ab\u2018]/.test(b.texto) ? b.texto : ABRE + b.texto + FECHA) + (b.autor ? ' (' + b.autor + ')' : '')], 'citacao');
      else if (b.t === 'guardar') por(['*Para guardar:* ' + b.texto], 'guardar');
      else if (b.t === 'dias') por(b.dias.map((d) => 'Dia ' + d.n + ': ' + d.passagem), 'dias');
      colar = '';
    });
    const qs = perguntasDe(e, c.semana);
    if (qs.length) saida.push('', '*Para conversar*', ...qs.map((q, i) => (i + 1) + '. ' + q));
    if (e.combinado) saida.push('', '*Combinado para a semana:* ' + e.combinado);
    // semana e trecho fecham com a oração, como na aba (o estudo inteiro vai para o grupo)
    const oracao = e.tipo === 'semana' && c.semana ? c.semana.oracao : e.tipo === 'trecho' ? [ORAR_TRECHO] : [];
    if (oracao.length) saida.push('', '*Para orar juntos*', ...oracao);
    saida.push('', 'Para ler cada versículo, abram a Bíblia nas referências acima.');
    if (c.endereco) saida.push('Conheça o app: ' + c.endereco);
    return saida.join('\n');
  }

  // ---------- "No plano": em que dia do plano cada capítulo do estudo é lido ----------
  // Até 2 linhas: primeiro os capítulos com mais cartões e, no empate, o que aparece antes.
  function noPlano(refs, plano) {
    const caps = [];
    for (const ref of refs || []) {
      const r = lerR(ref);
      if (!r) continue;
      const chave = r.livro + ' ' + r.cap;
      const c = caps.find((x) => x.chave === chave);
      if (c) c.n++;
      else caps.push({ chave, livro: r.livro, cap: r.cap, n: 1, ordem: caps.length });
    }
    caps.sort((a, b) => b.n - a.n || a.ordem - b.ordem);
    const saida = [];
    for (const c of caps) {
      if (saida.length >= 2) break;
      const d = (plano || []).find((x) => (x.trechos || []).some((t) => t.livro === c.livro && c.cap >= t.de && c.cap <= t.ate));
      if (d && !saida.some((s) => s.numero === d.numero)) saida.push({ numero: d.numero, capitulo: c.chave, passagem: passagem(d) });
    }
    return saida;
  }

  // ---------- as perguntas para escolher (passo 3 do preparo) ----------
  // A parábola cujo trecho cruza algum cartão (só a primeira).
  const parabolaDoEstudo = (refs, itens) => (itens || []).find((it) => (refs || []).some((r) => cruza(r, it.ref))) || null;
  // contexto: plano, reflexaoEscrita(n), refs (os cartões), semana, parabola ({ titulo, ref,
  // perguntas }, já lida do arquivo dela) e doTexto (as perguntas da seção "Perguntas" do texto).
  // Devolve [{ de, titulo, subtitulo, perguntas, marcadas }]. Marcadas de saída: todas as do texto,
  // a primeira do primeiro grupo de reflexão e a de aplicação do OIA (as da semana, todas).
  function gruposDePerguntas(e, contexto) {
    const c = contexto || {};
    const grupos = [];
    const refs = c.refs || e.refs || [];
    const doTexto = c.doTexto || (e.tipo === 'blocos' ? e.perguntas || [] : []);
    if (doTexto.length) grupos.push({ de: 'texto', titulo: 'Do seu texto', subtitulo: '', perguntas: doTexto.slice(), marcadas: doTexto.slice(0, 6) });
    if (e.tipo === 'semana' && c.semana) {
      const qs = c.semana.perguntas.map((x) => x.q);
      grupos.push({ de: 'semana', titulo: 'Da leitura da semana', subtitulo: 'Dias ' + c.semana.de + ' a ' + c.semana.ate + ' do plano', perguntas: qs, marcadas: qs.slice() });
    } else {
      const total = (c.plano || []).length;
      const dias = [];
      for (const ref of refs) {
        for (let n = 1; n <= total && dias.length < 2; n++) {
          const r = c.reflexaoEscrita(n);
          if (r && r.ref && (r.perguntas || []).length && !dias.includes(n) && cruza(ref, r.ref)) dias.push(n);
        }
        if (dias.length >= 2) break;
      }
      if (!dias.length) {
        const d = noPlano(refs, c.plano)[0];
        const r = d && c.reflexaoEscrita(d.numero);
        if (r && (r.perguntas || []).length) dias.push(d.numero);
      }
      dias.forEach((n, i) => {
        const r = c.reflexaoEscrita(n);
        grupos.push({ de: 'reflexao', titulo: 'Da reflexão do dia ' + n, subtitulo: [r.titulo, r.ref].filter(Boolean).join(PONTO), perguntas: r.perguntas.slice(), marcadas: i === 0 ? r.perguntas.slice(0, 1) : [] });
      });
      const pa = c.parabola;
      if (pa && (pa.perguntas || []).length) {
        const r = lerR(pa.ref);
        grupos.push({ de: 'parabola', titulo: 'Da parábola', subtitulo: [pa.titulo, r ? escrever(r) : pa.ref].filter(Boolean).join(PONTO), perguntas: pa.perguntas.slice(), marcadas: [] });
      }
    }
    grupos.push({ de: 'oia', titulo: 'Do método OIA', subtitulo: 'Observação, interpretação e aplicação', perguntas: PERGUNTAS_OIA.slice(), marcadas: e.tipo === 'semana' ? [] : [PERGUNTAS_OIA[2]] });
    return grupos;
  }

  // ---------- Fase 2: guardar (docs/a-mesa-fase2.md, 5.2) ----------
  // "Na semana passada combinamos: “Ligar para alguém que faltou.” Como foi?" O combinado vai
  // entre aspas, como foi escrito: a maiúscula dele, no meio da frase, fica certa. O ponto só entra
  // quando ele não termina em ponto, exclamação ou interrogação.
  const comPonto = (t) => { const x = String(t || '').trim(); return x + (/[.!?]$/.test(x) ? '' : '.'); };
  const entreAspas = (t) => ABRE + comPonto(t) + FECHA;
  const lembrarCombinado = (texto) => 'Na semana passada combinamos: ' + entreAspas(texto) + ' Como foi?';

  // Os capítulos do estudo em poucas letras, na ordem em que aparecem e sem repetir: "Ef 6, Lc
  // 11, 1Pe 5". Até 3, e depois " e mais N".
  function refsCurtas(refs) {
    const caps = [];
    for (const ref of refs || []) {
      const r = lerR(ref);
      if (!r) continue;
      const livro = (CC.LIVROS || []).find((l) => l[0] === r.livro);
      const curto = (livro ? livro[2] : r.livro) + ' ' + r.cap;
      if (!caps.includes(curto)) caps.push(curto);
    }
    return caps.slice(0, 3).join(', ') + (caps.length > 3 ? ' e mais ' + (caps.length - 3) : '');
  }

  const ddmm = (iso) => String(iso || '').slice(8, 10) + '/' + String(iso || '').slice(5, 7);
  // A data de uma linha de Estudos anteriores: a do encontro em que o estudo foi usado ou, sem
  // encontro ligado, a do preparo.
  const dataDaLista = (item) => (item.dataDe === 'encontro' ? 'Encontro de ' : 'Preparado em ') + ddmm(item.data);

  // O estudo no papel (Imprimir): HTML puro, tudo escapado, tinta preta em papel branco.
  // contexto: celula (o nome), linha ("Encontro de quinta, 22/10 · preparado por Marcos"), textos
  // (ref -> o texto da Bíblia do app, já pedido), sigla (a abreviatura da tradução), credito (as
  // linhas do crédito da tradução, sem link), anterior (só Palavra, Para conversar e Combinado),
  // acolhida, adoracao, testemunho, combinadoAnterior (o texto), noPlano ([{ numero, capitulo }]),
  // palavraDe ("Palavra de Marcos", na leitura da semana e no trecho), semana e versiculos (como
  // em comoBlocos). Nunca vão: anotação, presença, pedido de oração.
  function paraImprimir(e, contexto) {
    const c = contexto || {};
    const textoDe = (ref) => (c.textos && typeof c.textos.get === 'function' ? c.textos.get(ref) : (c.textos || {})[ref]) || '';
    const parte = (nome, corpo) => (corpo ? '<section class="imp-parte"><h2>' + esc(nome) + '</h2>' + corpo + '</section>' : '');
    const p = (t) => (t ? '<p>' + negrito(t) + '</p>' : '');
    const cartao = (b) => '<figure class="imp-cartao"><blockquote>' + esc(textoDe(b.ref)) + '</blockquote><figcaption>' + esc(b.ref) + (c.sigla ? PONTO + esc(c.sigla) : '') + '</figcaption></figure>';
    const bloco = (b) => {
      if (b.t === 'texto') return p(b.texto);
      if (b.t === 'topico') return '<h3><span class="n">' + esc(b.n) + '.</span> ' + negrito(b.texto) + '</h3>';
      if (b.t === 'conclusao') return '<h3>Conclusão</h3>';
      if (b.t === 'versiculo') return cartao(b);
      if (b.t === 'seta') return '<ul class="imp-seta">' + (b.itens || []).map(([item, sentido]) => '<li><b>' + negrito(item) + '</b>' + esc(SETA) + negrito(sentido) + '</li>').join('') + '</ul>';
      if (b.t === 'citacao') return '<blockquote class="imp-citacao">' + negrito(b.texto) + (b.autor ? '<cite>' + esc(b.autor) + '</cite>' : '') + '</blockquote>';
      if (b.t === 'guardar') return '<div class="imp-guardar"><span>Para guardar</span><p>' + negrito(b.texto) + '</p></div>';
      if (b.t === 'dias') return '<ul class="imp-dias">' + b.dias.map((d) => '<li>Dia ' + esc(d.n) + ': ' + esc(d.passagem) + '</li>').join('') + '</ul>';
      return '';
    };
    const nome = titulo(e) || 'Estudo do encontro';
    const legado = e.tipo === 'semana' || e.tipo === 'trecho';
    const palavra = (legado && e.texto && c.palavraDe ? '<p class="imp-dica">' + esc(c.palavraDe) + '</p>' : '') + comoBlocos(e, c.semana, c.versiculos).map(bloco).join('')
      + (e.tipo === 'semana' && !c.semana ? '<p class="imp-dica">' + esc(SEMANA_SEM_DIAS) + '</p>' : '');
    const qs = perguntasDe(e, c.semana);
    const oracao = e.tipo === 'semana' && c.semana ? c.semana.oracao : e.tipo === 'trecho' ? [ORAR_TRECHO] : [];
    const plano = (c.noPlano || []).map((d) => d.capitulo + ' é o dia ' + d.numero + ' do plano').join(PONTO);
    const acolhida = (c.combinadoAnterior ? '<p class="imp-lembrar"><b>Na semana passada combinamos:</b> ' + esc(entreAspas(c.combinadoAnterior)) + ' Como foi?</p>' : '') + p(c.acolhida);
    return '<header class="imp-cabeca">' + esc([c.celula, c.linha].filter(Boolean).join(PONTO)) + '</header>'
      + '<h1 class="imp-titulo">' + negrito(nome) + '</h1>'
      + (plano ? '<p class="imp-plano">' + esc(plano) + '</p>' : '')
      + (c.anterior ? '' : parte('Acolhida', acolhida) + parte('Adoração', p(c.adoracao)))
      + parte('Palavra', palavra)
      + parte('Para conversar', qs.length ? '<ol class="imp-perguntas">' + qs.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ol>' : '')
      + parte('Combinado para a semana', p(e.combinado))
      + parte('Para orar juntos', oracao.map(p).join(''))
      + (c.anterior ? '' : parte('Testemunho', p(c.testemunho)))
      + ((c.credito || []).length ? '<footer class="imp-pe">' + c.credito.map((l) => '<p>' + esc(l) + '</p>').join('') + '</footer>' : '');
  }

  // ---------- o HTML de cada parte ----------
  // opcoes: cartao(bloco) devolve o cartão do versículo (quem chama já tem o texto da Bíblia);
  // semConclusao (a prévia já diz "Conclusão" na etiqueta da parte); semEtiqueta (Para guardar).
  function blocoEmHtml(b, opcoes) {
    const o = opcoes || {};
    const ico = CC.ico('avancar');
    if (b.t === 'texto') return '<p>' + negrito(b.texto) + '</p>';
    if (b.t === 'topico') return '<h3 class="mesa-t2"><span class="n">' + esc(b.n) + '</span>' + negrito(b.texto) + '</h3>';
    if (b.t === 'conclusao') return o.semConclusao ? '' : '<h3 class="mesa-t2">Conclusão</h3>';
    if (b.t === 'versiculo') return o.cartao ? o.cartao(b) : '';
    if (b.t === 'seta') {
      return '<ul class="mesa-seta' + (b.destaque ? ' destaque' : '') + '">' + (b.itens || []).map(([item, sentido]) => (b.destaque
        ? '<li><b>' + negrito(item) + '</b>' + ico + '<span>' + negrito(sentido) + '</span></li>'
        : '<li><b>' + negrito(item) + '</b><span>' + ico + negrito(sentido) + '</span></li>')).join('') + '</ul>';
    }
    if (b.t === 'citacao') return '<figure class="mesa-citacao"><blockquote>' + negrito(b.texto) + '</blockquote>' + (b.autor ? '<figcaption>' + esc(b.autor) + '</figcaption>' : '') + '</figure>';
    if (b.t === 'guardar') return '<div class="mesa-guardar">' + (o.semEtiqueta ? '' : '<span class="etiqueta">Para guardar</span>') + '<p>' + negrito(b.texto) + '</p></div>';
    if (b.t === 'dias') return '<ul class="roteiro-dias">' + b.dias.map((d) => '<li><span>Dia ' + esc(d.n) + '</span>' + esc(d.passagem) + (d.titulo ? '<small>' + esc(d.titulo) + '</small>' : '') + '</li>').join('') + '</ul>';
    return '';
  }

  CC.estudoRegras = {
    PERGUNTAS_OIA, PERGUNTAS_ACOLHIDA, SUGESTAO_ADORACAO, SUGESTAO_TESTEMUNHO, COMECAR_SEMANA, ORAR_TRECHO, SEMANA_SEM_DIAS, sugestaoAcolhida,
    cruza, cartaoDe, cortaTrecho, capituloDe, semana, titulo, comoBlocos, perguntasDe, dividir, passos, textoParaGrupo,
    noPlano, parabolaDoEstudo, gruposDePerguntas, blocoEmHtml, negrito,
    lembrarCombinado, refsCurtas, dataDaLista, paraImprimir,
  };
})(window.CC);
