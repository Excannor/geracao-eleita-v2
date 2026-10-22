/* Cartas do baú: a regra (docs/cartas.md). O sorteio, as fontes que dão carta, o livro-caixa de
   eventos (cada evento paga uma vez e o que ele pagou nunca muda) e o resumo do álbum. Tudo puro
   sobre o estado, para o teste.mjs exercitar sem tela, mais a ponte com o app no fim
   (CC.cartasEmDia). Peça sob demanda pequena, pedida depois da abertura do app
   (CC.acertarCartas, 02b-jogo.js) e pelo baú: o index.html leva só o esqueleto do catálogo
   (window.CARTAS_INDICE). Sem a peça, o baú abre com o versículo e a carta chega na próxima vez
   que ela carregar (o mesmo caminho dos baús abertos antes das cartas). Títulos, textos e telas
   estão na peça "album"; a fusão entre aparelhos e a forma (fundirCartas, limparCartas) em
   02-estado.js, que o servidor também roda.

   O modelo (dono, 22/10): cada evento sorteia uma raridade e depois uma carta, com repetidas. A
   Glória também é sorte: 1% no sorteio comum, e bem mais no sorteio de marco (álbum completo, fim
   de unidade, 100 e 365 dias de leitura). A coleção é derivada do livro-caixa: cada evento que
   pagou uma carta é uma cópia, com id próprio (a chave do evento), origem e data, o que deixa
   trocas possíveis no futuro. Só entram no sorteio as cartas lançadas (com desenho). */
(function (CC) {
  'use strict';

  const R = {};
  const RARIDADE = { l: 'linho', b: 'bronze', p: 'prata', o: 'ouro', g: 'gloria' };
  R.VERSOES = ['linho', 'bronze', 'prata', 'ouro', 'gloria'];
  // As chances por sorteio (públicas, em "O que pode vir"), no nível de "por pacote" dos jogos de
  // cartas, porque cada evento dá uma carta só (docs/cartas.md, seção 4).
  R.PESOS = { linho: 49, bronze: 30, prata: 15, ouro: 5, gloria: 1 };
  // O sorteio de marco: nunca Linho nem Bronze. A cada marco sem Glória, ela ganha 15 pontos
  // (tirados primeiro da Prata, depois do Ouro); volta aos 25 quando sai uma Glória.
  R.PESOS_MARCO = { prata: 40, ouro: 35, gloria: 25 };
  R.MARCO_PASSO = 15;
  // Proteções do sorteio comum: depois de 5 sem Prata ou melhor, vem Prata ou melhor; a partir do
  // 12º sem Ouro, a chance dele sobe 5 pontos por sorteio (10%, 15%...) e o 20º é Ouro. A Glória
  // conta como "Prata ou melhor", mas não zera a conta do Ouro.
  R.MAX_SEM_ALTA = 5;
  R.OURO_SOBE_EM = 12;
  R.OURO_PASSO = 5;
  R.OURO_ATE = 20;
  // O viés para carta nova: no álbum atual (o primeiro com carta lançada que falta, na ordem de
  // lançamento), uma carta que a pessoa ainda não tem pesa 20; nos outros álbuns, 5; uma que ela
  // já tem, 1 (2 se falta a ela a versão sorteada).
  R.PESO_NOVA_ATUAL = 20;
  R.PESO_NOVA_OUTRO = 5;
  R.PESO_TEM = 1;
  R.PESO_VERSAO_NOVA = 2;
  const ALTA = (r) => r === 'prata' || r === 'ouro' || r === 'gloria';

  // ---------- catálogo (esqueleto) ----------
  // Os álbuns do sorteio (R.albuns), na ordem de lançamento, e os conjuntos especiais
  // (R.especiais: Semeadores e Boas-vindas), fora do sorteio e das proteções. O catálogo cresce:
  // um álbum com lancadoEm no futuro só entra no sorteio a partir daquele dia, e dentro de um
  // álbum só a carta lançada (com desenho) pode sair; a outra é silhueta até chegar.
  let fonte = null;
  let todos = [];
  let mapa = new Map();
  const lerIndice = () => {
    if (fonte !== window.CARTAS_INDICE) {
      fonte = window.CARTAS_INDICE;
      todos = (fonte || []).map((a) => ({
        id: a.id, nome: a.nome, especial: !!a.especial, lancadoEm: a.lancadoEm || '', capa: a.capa || '',
        // "~": carta ainda não lançada (sem desenho): fica no catálogo, fora do sorteio
        cartas: String(a.c || '').split(' ').filter(Boolean).map((x) => {
          const [id, r] = x.replace(/^~/, '').split(':');
          return { id, raridade: RARIDADE[r] || '', lancada: x[0] !== '~' };
        }),
      }));
      mapa = new Map();
      for (const a of todos) for (const c of a.cartas) mapa.set(c.id, { ...c, album: a.id, especial: a.especial });
    }
    return todos;
  };
  R.albuns = (hoje) => lerIndice().filter((a) => !a.especial && (!hoje || a.lancadoEm <= hoje));
  R.especiais = () => lerIndice().filter((a) => a.especial);
  R.carta = (id) => { lerIndice(); return mapa.get(id) || null; };

  // ---------- semente ----------
  // FNV-1a do @ da conta com a chave do evento, e mulberry32: o mesmo evento sorteia igual em
  // todo aparelho com a mesma coleção.
  R.semente = (dono, chave) => {
    let h = 2166136261;
    const t = String(dono || '') + '|' + chave;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  };
  R.aleatorio = (semente) => {
    let a = semente >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const escolherPeso = (itens, peso, r) => {
    const total = itens.reduce((s, x) => s + peso(x), 0);
    let x = r() * total;
    for (const it of itens) { x -= peso(it); if (x < 0) return it; }
    return itens[itens.length - 1];
  };

  // ---------- a coleção ----------
  // E.cartas = { eventos: { chave: { em, carta, raridade } | { em, pendente: 1 } } }.
  R.vazio = () => ({ eventos: {} });
  const copia = (c) => ({ eventos: { ...((c || {}).eventos || {}) } });
  const ordemDoTempo = (x, y) => (x.em - y.em) || (x.chave < y.chave ? -1 : x.chave > y.chave ? 1 : 0);
  const fonteDe = (chave) => String(chave).split(':')[0];
  // Todas as cópias: [{ id (a chave do evento), carta, raridade, em, fonte }], da mais antiga para
  // a mais nova.
  R.copias = (cartas) => Object.entries(copia(cartas).eventos).filter(([, ev]) => ev.carta)
    .map(([chave, ev]) => ({ id: chave, chave, carta: ev.carta, raridade: ev.raridade, em: ev.em, fonte: fonteDe(chave) })).sort(ordemDoTempo);
  // { carta: { linho: n, ... } }
  R.tem = (cartas) => {
    const t = {};
    for (const x of R.copias(cartas)) { const v = (t[x.carta] ||= {}); v[x.raridade] = (v[x.raridade] || 0) + 1; }
    return t;
  };
  const MARCOS = new Set(['album', 'unidade', 'dias']);
  // Os sorteios (as cartas dos álbuns, sem os especiais), para as proteções.
  const sorteios = (cartas) => R.copias(cartas).filter((x) => R.carta(x.carta) && !R.carta(x.carta).especial);
  // Completo: as 13 lançadas e na coleção, em qualquer versão.
  const completo = (a, tem) => a.cartas.every((x) => x.lancada && tem[x.id]);
  const faltaLancada = (a, tem) => a.cartas.some((x) => x.lancada && !tem[x.id]);
  const desde = (h, teste) => { let n = 0; for (let i = h.length - 1; i >= 0 && !teste(h[i]); i--) n++; return n; };

  // ---------- a raridade ----------
  R.chanceDeOuro = (semOuro) => {
    const n = semOuro + 1;
    if (n >= R.OURO_ATE) return 100;
    return n >= R.OURO_SOBE_EM ? R.PESOS.ouro + R.OURO_PASSO * (n - R.OURO_SOBE_EM + 1) : R.PESOS.ouro;
  };
  // Sorteio comum: a primeira carta da vida é uma Prata; depois, as chances de R.PESOS, com o
  // Ouro subindo (o 20º é Ouro) e Prata ou melhor depois de 5 sem.
  R.raridade = (cartas, r) => {
    const h = sorteios(cartas);
    if (!h.length) return { raridade: 'prata', protecao: 'primeira' };
    const semAlta = desde(h, (x) => ALTA(x.raridade));
    const semOuro = desde(h, (x) => x.raridade === 'ouro');
    const ouro = R.chanceDeOuro(semOuro);
    if (ouro >= 100) return { raridade: 'ouro', protecao: 'ouro' };
    const P = R.PESOS;
    const resto = (100 - ouro - P.gloria) / (100 - P.ouro - P.gloria);
    // com a proteção, Prata ou Ouro na proporção de sempre; a Glória continua em 1%
    const pesos = semAlta >= R.MAX_SEM_ALTA ? { prata: (100 - P.gloria) * P.prata / (P.prata + ouro), ouro: (100 - P.gloria) * ouro / (P.prata + ouro), gloria: P.gloria }
      : { linho: P.linho * resto, bronze: P.bronze * resto, prata: P.prata * resto, ouro, gloria: P.gloria };
    const raridade = escolherPeso(Object.keys(pesos), (x) => pesos[x], r);
    return { raridade, protecao: semAlta >= R.MAX_SEM_ALTA ? 'alta' : ouro > P.ouro && raridade === 'ouro' ? 'ouro' : '' };
  };
  // Sorteio de marco: Prata, Ouro ou Glória; a Glória sobe 15 pontos a cada marco sem ela.
  R.chancesDeMarco = (marcosSemGloria) => {
    const g = Math.min(100, R.PESOS_MARCO.gloria + R.MARCO_PASSO * marcosSemGloria);
    let tirar = g - R.PESOS_MARCO.gloria;
    const prata = Math.max(0, R.PESOS_MARCO.prata - tirar);
    tirar -= R.PESOS_MARCO.prata - prata;
    const ouro = Math.max(0, R.PESOS_MARCO.ouro - tirar);
    return { prata, ouro, gloria: g };
  };
  R.marcosSemGloria = (cartas) => {
    const h = sorteios(cartas);
    let n = 0;
    for (let i = h.length - 1; i >= 0 && h[i].raridade !== 'gloria'; i--) if (MARCOS.has(h[i].fonte)) n++;
    return n;
  };
  R.raridadeDeMarco = (cartas, r) => {
    // o 20º sorteio sem Ouro é Ouro também quando ele é um marco
    const h = sorteios(cartas);
    if (h.length && R.chanceDeOuro(desde(h, (x) => x.raridade === 'ouro')) >= 100) return { raridade: 'ouro', protecao: 'ouro' };
    const pesos = R.chancesDeMarco(R.marcosSemGloria(cartas));
    return { raridade: escolherPeso(Object.keys(pesos).filter((k) => pesos[k] > 0), (x) => pesos[x], r), protecao: 'marco' };
  };

  // ---------- a carta ----------
  // Dos álbuns lançados, só as cartas lançadas, com viés para a que a pessoa ainda não tem (mais no
  // álbum atual) e, entre as que tem, para a que não tem na versão sorteada. Álbum lançado depois
  // que a pessoa começou e de que ela ainda não tem nenhuma carta: o sorteio seguinte sai dele.
  const dia = (ms) => new Date(ms).toISOString().slice(0, 10);
  R.cartaDoSorteio = (cartas, r, hoje, raridade) => {
    const albuns = R.albuns(hoje);
    const tem = R.tem(cartas);
    const primeira = sorteios(cartas)[0];
    const novo = hoje && primeira && albuns.find((a) => a.lancadoEm > dia(primeira.em) && !a.cartas.some((x) => tem[x.id]) && a.cartas.some((x) => x.lancada));
    const atual = novo || albuns.find((a) => faltaLancada(a, tem));
    const lista = (novo ? [novo] : albuns).flatMap((a) => a.cartas.filter((x) => x.lancada).map((x) => ({ id: x.id, album: a.id })));
    if (!lista.length) return null;
    const peso = (x) => (tem[x.id] ? (raridade && !tem[x.id][raridade] ? R.PESO_VERSAO_NOVA : R.PESO_TEM)
      : atual && x.album === atual.id ? R.PESO_NOVA_ATUAL : R.PESO_NOVA_OUTRO);
    return escolherPeso(lista, peso, r).id;
  };
  R.sortear = (cartas, dono, chave, hoje, marco) => {
    const r = R.aleatorio(R.semente(dono, chave));
    const rar = marco ? R.raridadeDeMarco(cartas, r) : R.raridade(cartas, r);
    const id = R.cartaDoSorteio(cartas, r, hoje, rar.raridade);
    return id ? { carta: id, raridade: rar.raridade, protecao: rar.protecao } : null;
  };

  // ---------- fontes ----------
  // Cada fonte: ativa, premio ('carta': sorteio comum; 'marco': sorteio de marco; 'especial': uma
  // carta fixa de um conjunto especial) e, quando sai do próprio estado ou do servidor,
  // detectar(e, ctx) → chaves alcançadas. Todas aprovadas pelo dono (seção 3).
  const D = () => (window.DADOS || CC.D || {});
  const doServidor = (ctx, padrao) => ((((ctx || {}).quem || {}).cartasServidor || {}).chaves || []).filter((k) => padrao.test(k));
  const especial = (album, n) => ((R.especiais().find((a) => a.id === album) || { cartas: [] }).cartas[n] || null);
  R.FONTES = {
    bau: { ativa: true, premio: 'carta' },
    album: { ativa: true, premio: 'marco' },
    unidade: { ativa: true, premio: 'marco',
      detectar: (e) => (D().unidades || []).filter((u) => CC.unidadeCompletaEm && CC.unidadeCompletaEm(u.numero, e)).map((u) => 'unidade:' + u.numero) },
    dias: { ativa: true, premio: 'marco', detectar: (e) => [100, 365].filter((n) => (e.lidos || []).length >= n).map((n) => 'dias:' + n) },
    conhecer: { ativa: true, premio: 'carta', detectar: (e) => (Object.keys(e.conhecidos || {}).length >= 14 ? ['conhecer:14'] : []) },
    passos: { ativa: true, premio: 'carta',
      detectar: (e) => ((D().licoes || []).length && (e.licoes || []).length >= D().licoes.length ? ['passos:todos'] : []) },
    desafio: { ativa: true, premio: 'carta',
      detectar: (e) => (CC.DESAFIOS || []).filter((d) => CC.situacaoDesafio(d, e).concluido).map((d) => 'desafio:' + d.id) },
    parabolas: { ativa: true, premio: 'carta',
      detectar: (e) => [7, 14, 21, 28].filter((n) => Object.keys(e.parabolasLidas || {}).length >= n).map((n) => 'parabolas:' + n) },
    pratica: { ativa: true, premio: 'carta',
      detectar: (e) => Object.entries(e.pratica || {}).filter(([, p]) => p.total > 0 && p.melhor >= p.total).map(([u]) => 'pratica:' + u) },
    proposito: { ativa: true, premio: 'carta', detectar: (e) => ((e.maiorProposito || 0) >= 7 ? ['proposito:7'] : []) },
    // conferidas pelo servidor: /api/quem leva cartasServidor.chaves, e /api/estado tira a chave
    // destas fontes que ele não confirma (conferirCartasDoServidor, contas.mjs)
    celula: { ativa: true, premio: 'carta', servidor: true, detectar: (e, ctx) => doServidor(ctx, /^celula:primeiro$/) },
    discipulado: { ativa: true, premio: 'carta', servidor: true, detectar: (e, ctx) => doServidor(ctx, /^discipulado:primeiro$/) },
    // Semeadores: os amigos que vieram pelo seu convite (conta nova e primeira lição), uma carta
    // por limiar alcançado (1, 5, 15, 40 e 100 amigos), com a raridade fixa de cada uma
    convite: { ativa: true, premio: 'especial', servidor: true, detectar: (e, ctx) => doServidor(ctx, /^convite:tier:[1-5]$/),
      carta: (chave) => especial('semeadores', Number(chave.split(':')[2]) - 1) },
    // quem chegou por um convite: a carta de Boas-vindas, uma vez
    convidado: { ativa: true, premio: 'especial', servidor: true, detectar: (e, ctx) => doServidor(ctx, /^convidado$/),
      carta: () => especial('boas-vindas', 0) },
  };

  // Paga a fonte. A mesma chave nunca paga duas vezes, e o que ela pagou fica para sempre.
  // Devolve o estado novo das cartas e o que houve (a carta, a raridade, se é nova, se a versão é
  // nova, quantas cópias daquela versão a pessoa tem agora, o álbum e se ele completou).
  R.receber = (cartas, fonte, chave, { dono = '', em = Date.now(), hoje = '' } = {}) => {
    const c = copia(cartas);
    const f = R.FONTES[fonte];
    if (!f || !f.ativa || !chave || fonteDe(chave) !== fonte) return { cartas: c, resultado: null };
    if (c.eventos[chave]) return { cartas: c, resultado: { repetido: true, ...c.eventos[chave] } };
    let sorteio;
    if (f.premio === 'especial') {
      const x = f.carta(chave);
      if (!x) return { cartas: c, resultado: null };
      // carta especial ainda sem desenho: o evento fica anotado como alcançado, e a carta vem
      // quando for lançada (R.pagarPendentes), sem se perder
      if (!x.lancada) { c.eventos[chave] = { em, pendente: 1 }; return { cartas: c, resultado: { pendente: true } }; }
      sorteio = { carta: x.id, raridade: x.raridade, protecao: '' };
    } else sorteio = R.sortear(c, dono, chave, hoje, f.premio === 'marco');
    if (!sorteio) return { cartas: c, resultado: null };
    const antes = R.tem(c);
    c.eventos[chave] = { em, carta: sorteio.carta, raridade: sorteio.raridade };
    const tem = R.tem(c);
    const info = R.carta(sorteio.carta);
    const a = lerIndice().find((x) => x.id === info.album);
    const resultado = { ...sorteio, chave, marco: f.premio === 'marco', nova: !antes[sorteio.carta], versaoNova: !(antes[sorteio.carta] || {})[sorteio.raridade],
      copias: tem[sorteio.carta][sorteio.raridade], album: a.id, especial: a.especial,
      tem: a.cartas.filter((x) => tem[x.id]).length, total: a.cartas.length };
    if (!a.especial && !completo(a, antes) && completo(a, tem)) {
      // álbum completo: um troféu (CC.trofeus) e um sorteio de marco
      resultado.completou = a.id;
      const m = R.receber(c, 'album', 'album:' + a.id, { dono, em: em + 1, hoje });
      return { cartas: m.cartas, resultado, extra: m.resultado ? [{ fonte: 'album', ...m.resultado }] : [] };
    }
    return { cartas: c, resultado };
  };

  // Os eventos anotados como alcançados (carta especial sem desenho) pagam a carta quando ela é
  // lançada: a mesma chave, agora com a carta.
  R.pagarPendentes = (cartas, em = Date.now()) => {
    let c = copia(cartas);
    const pagos = [];
    for (const [chave, ev] of Object.entries(c.eventos).sort()) {
      const f = R.FONTES[fonteDe(chave)];
      const x = ev.pendente && f && f.ativa && f.premio === 'especial' && f.carta(chave);
      if (!x || !x.lancada) continue;
      const sem = { ...c.eventos };
      delete sem[chave];
      const r = R.receber({ eventos: sem }, fonteDe(chave), chave, { em });
      if (r.resultado && r.resultado.carta) { c = r.cartas; pagos.push({ fonte: fonteDe(chave), ...r.resultado }); }
    }
    return { cartas: c, pagos };
  };

  // ---------- resumo ----------
  R.resumo = (cartas, hoje) => {
    const tem = R.tem(cartas);
    const albuns = R.albuns(hoje);
    const atual = albuns.find((a) => faltaLancada(a, tem));
    const lista = albuns.map((a) => ({
      id: a.id, nome: a.nome, capa: a.capa, total: a.cartas.length, lancadas: a.cartas.filter((x) => x.lancada).length,
      tem: a.cartas.filter((x) => tem[x.id]).length,
      versoes: a.cartas.reduce((s, x) => s + R.VERSOES.filter((v) => (tem[x.id] || {})[v]).length, 0),
      totalVersoes: a.cartas.length * R.VERSOES.length,
      completo: completo(a, tem),
    }));
    const h = sorteios(cartas);
    return {
      albuns: lista, atual: atual ? atual.id : '',
      especiais: R.especiais().map((a) => ({ id: a.id, nome: a.nome, tem: a.cartas.filter((x) => tem[x.id]).length, total: a.cartas.length })),
      cartas: lista.reduce((s, a) => s + a.tem, 0), totalCartas: lista.reduce((s, a) => s + a.total, 0), lancadas: lista.reduce((s, a) => s + a.lancadas, 0),
      alcancados: Object.entries(copia(cartas).eventos).filter(([, ev]) => ev.pendente).map(([k]) => k).sort(),
      copias: R.copias(cartas).length,
      repetidas: Object.values(tem).reduce((s, v) => s + Object.values(v).reduce((t, n) => t + n - 1, 0), 0),
      // as proteções, com os números da própria pessoa
      sorteios: h.length, semAlta: desde(h, (x) => ALTA(x.raridade)), semOuro: desde(h, (x) => x.raridade === 'ouro'),
      marcosSemGloria: R.marcosSemGloria(cartas),
      tem,
    };
  };

  // ---------- em dia ----------
  // A chave do baú leva a geração do "Zerar" (zeradoEm): depois de zerar, ler de novo e abrir o
  // mesmo baú paga um novo sorteio.
  R.chaveDoBau = (numero, e) => 'bau:dia:' + numero + ((e || {}).zeradoEm ? '@' + e.zeradoEm : '');
  // Paga o que está pendente, na ordem: as cartas especiais que foram lançadas, os baús abertos
  // sem carta (do dia menor para o maior), as fontes que saem do estado ou do servidor e o marco
  // dos álbuns que ficaram completos (numa fusão, por exemplo). Devolve o estado novo das cartas e
  // a lista do que foi pago agora.
  R.emDia = (e, { dono = '', em = Date.now(), quem = null, hoje = '' } = {}) => {
    let c = copia(e.cartas);
    const pend = R.pagarPendentes(c, em);
    c = pend.cartas;
    const novos = pend.pagos.slice();
    let t = em;
    const pagar = (fonte, chave) => {
      const r = R.receber(c, fonte, chave, { dono, em: t++, hoje });
      c = r.cartas;
      if (r.resultado && !r.resultado.repetido) novos.push({ fonte, chave, ...r.resultado });
      for (const x of r.extra || []) { novos.push(x); t++; }
    };
    Object.keys(e.bausAbertos || {}).map((k) => Number(String(k).replace('dia:', ''))).filter((n) => n > 0).sort((x, y) => x - y)
      .forEach((n) => pagar('bau', R.chaveDoBau(n, e)));
    for (const [fonte, f] of Object.entries(R.FONTES)) {
      if (!f.ativa || !f.detectar) continue;
      let chaves = [];
      try { chaves = f.detectar(e, { quem }); } catch (erro) { chaves = []; }
      for (const chave of chaves) if (!c.eventos[chave]) pagar(fonte, chave);
    }
    const tem = R.tem(c);
    for (const a of R.albuns(hoje)) if (!c.eventos['album:' + a.id] && completo(a, tem)) pagar('album', 'album:' + a.id);
    return { cartas: c, novos };
  };

  // ---------- ponte com o app ----------
  // Paga o pendente e grava. As cartas que não vêm do baú (marcos, convite, célula...) aparecem
  // numa revelação quando nada está aberto na tela; senão, e para os baús antigos, um aviso curto.
  // A tela do baú pede { calado: true }: ela mesma revela a carta do baú dela (e o marco junto).
  CC.cartasEmDia = ({ calado = false } = {}) => {
    const E = CC.estado();
    const r = R.emDia(E, { dono: E.dono || '', em: Date.now(), quem: CC.quem || null, hoje: CC.hojeIso() });
    if (!r.novos.length) return r;
    CC.gravar('cartas', r.cartas);
    if (calado) return r;
    const cartas = r.novos.filter((x) => x.carta && x.fonte !== 'bau');
    const calmo = !document.querySelector('.tela-cheia, .cortina, .licao:not(.saindo)');
    if (cartas.length && calmo && CC.pedirCartas) {
      CC.pedirCartas().then(() => CC.album.revelarNovas(cartas), () => CC.avisar('Carta nova no seu álbum.'));
      return r;
    }
    const n = r.novos.filter((x) => x.carta).length;
    if (n) CC.avisar(n === 1 ? 'Carta nova no seu álbum.' : n + ' cartas novas no seu álbum.');
    return r;
  };

  CC.cartasRegras = R;
})(window.CC);
