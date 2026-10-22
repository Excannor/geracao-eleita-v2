/* Cartas do baú: a regra (docs/cartas.md). O sorteio por pessoa, as fontes que dão carta, o
   livro-caixa contra repetição, os marcos da Glória e o resumo do álbum. Tudo puro sobre o
   estado, para o teste.mjs exercitar sem tela, mais a ponte com o app no fim (CC.cartasEmDia).
   Peça sob demanda pequena, pedida depois da abertura do app (CC.acertarCartas, 02b-jogo.js) e
   pelo baú: o index.html leva só o esqueleto do catálogo (window.CARTAS_INDICE: álbum, id e
   raridade). Sem a peça, o baú abre com o versículo e a carta chega na próxima vez que ela
   carregar (o mesmo caminho dos baús abertos antes das cartas). Títulos, textos e telas estão na
   peça "album"; a fusão entre aparelhos e a forma (fundirCartas, limparCartas) em 02-estado.js,
   que o servidor também roda. */
(function (CC) {
  'use strict';

  const R = {};
  const RARIDADE = { l: 'linho', b: 'bronze', p: 'prata', o: 'ouro', g: 'gloria' };
  const ALTA = (r) => r === 'prata' || r === 'ouro';
  const MAX_SECA = 5;

  // ---------- catálogo (esqueleto) ----------
  // Os 4 álbuns do sorteio (R.albuns) e os conjuntos especiais (R.especiais: Semeadores e
  // Boas-vindas), que ficam fora do sorteio e das garantias.
  let todos = null;
  let mapa = null;
  const lerIndice = () => {
    if (!todos) {
      todos = (window.CARTAS_INDICE || []).map((a) => ({
        id: a.id, nome: a.nome, especial: !!a.especial,
        cartas: String(a.c || '').split(' ').filter(Boolean).map((x) => { const [id, r] = x.split(':'); return { id, raridade: RARIDADE[r] }; }),
      }));
      mapa = new Map();
      for (const a of todos) for (const c of a.cartas) mapa.set(c.id, { ...c, album: a.id, especial: a.especial });
    }
    return todos;
  };
  R.albuns = () => lerIndice().filter((a) => !a.especial);
  R.especiais = () => lerIndice().filter((a) => a.especial);
  const porId = () => { lerIndice(); return mapa; };
  R.carta = (id) => porId().get(id) || null;

  // ---------- semente e sorteio ----------
  // FNV-1a do @ da conta com o álbum: a mesma ordem em todo aparelho.
  R.semente = (dono, album) => {
    let h = 2166136261;
    const t = String(dono || '') + '|' + album;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  };
  // mulberry32
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
  const embaralhar = (lista, r) => {
    const x = lista.slice();
    for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
    return x;
  };

  // A ordem de um álbum: blocos de 3, 3, 3 e 4 embaralhados, cada um com exatamente uma Prata ou o
  // Ouro, e as Linho e Bronze nos espaços. i: a posição do álbum (o primeiro começa por uma Prata:
  // é a primeira carta da vida). sobra: quantas Linho ou Bronze o álbum anterior deixou no fim; a
  // primeira Prata ou Ouro deste vem cedo o bastante para nunca passar de 5 seguidas sem uma.
  R.ordemDoAlbum = (dono, i, sobra = 0) => {
    const a = R.albuns()[i];
    if (!a) return [];
    const r = R.aleatorio(R.semente(dono, a.id));
    const tamanhos = embaralhar([3, 3, 3, 4], r);
    const altas = embaralhar(a.cartas.filter((c) => ALTA(c.raridade)), r);
    const baixas = embaralhar(a.cartas.filter((c) => !ALTA(c.raridade)), r);
    const blocos = tamanhos.map((t) => embaralhar(baixas.splice(0, t - 1).concat(altas.shift()), r));
    const altaEm = (b) => b.findIndex((c) => ALTA(c.raridade));
    if (i === 0) {
      // a primeira carta da vida é uma Prata, no começo do primeiro bloco
      if (blocos[0][altaEm(blocos[0])].raridade !== 'prata') {
        const outro = blocos.findIndex((b, k) => k > 0 && b[altaEm(b)].raridade === 'prata');
        const x = altaEm(blocos[0]);
        const y = altaEm(blocos[outro]);
        [blocos[0][x], blocos[outro][y]] = [blocos[outro][y], blocos[0][x]];
      }
      const x = altaEm(blocos[0]);
      [blocos[0][0], blocos[0][x]] = [blocos[0][x], blocos[0][0]];
    } else {
      const x = altaEm(blocos[0]);
      const limite = MAX_SECA - Math.min(MAX_SECA, sobra);
      if (x > limite) [blocos[0][limite], blocos[0][x]] = [blocos[0][x], blocos[0][limite]];
    }
    return blocos.flat().map((c) => c.id);
  };

  // A ordem da vida inteira: os álbuns em sequência.
  R.ordem = (dono) => {
    const saida = [];
    let sobra = 0;
    R.albuns().forEach((a, i) => {
      const ids = R.ordemDoAlbum(dono, i, sobra);
      saida.push(...ids);
      const ultimaAlta = ids.map((id) => ALTA(R.carta(id).raridade)).lastIndexOf(true);
      sobra = ids.length - 1 - ultimaAlta;
    });
    return saida;
  };

  // ---------- a coleção ----------
  // E.cartas = { recebidas: { id: { em, fonte } }, eventos: { chave: { em, carta } | { em, gloria } },
  // glorias: { chave: { em, carta, escolhidaEm } } }.
  R.vazio = () => ({ recebidas: {}, eventos: {}, glorias: {} });
  const copia = (c) => ({ recebidas: { ...((c || {}).recebidas || {}) }, eventos: { ...((c || {}).eventos || {}) }, glorias: { ...((c || {}).glorias || {}) } });
  const completo = (a, cartas) => a.cartas.every((c) => cartas.recebidas[c.id]);

  // A primeira carta que falta, no primeiro álbum incompleto, na ordem sorteada da pessoa.
  R.proxima = (cartas, dono) => {
    const c = copia(cartas);
    const lista = R.albuns();
    let sobra = 0;
    for (let i = 0; i < lista.length; i++) {
      const ids = R.ordemDoAlbum(dono, i, sobra);
      if (!completo(lista[i], c)) return ids.find((id) => !c.recebidas[id]) || null;
      sobra = ids.length - 1 - ids.map((id) => ALTA(R.carta(id).raridade)).lastIndexOf(true);
    }
    return null;
  };

  // ---------- fontes ----------
  // Cada fonte: ativa (ligada), premio ('carta' ou 'gloria') e, quando sai do próprio estado,
  // detectar(e, ctx) → chaves alcançadas. A chave paga uma vez só (E.cartas.eventos). As
  // desligadas esperam a aprovação do dono (docs/cartas.md, seção 3): ligar é trocar ativa.
  const D = () => (window.DADOS || CC.D || {});
  R.FONTES = {
    bau: { ativa: true, premio: 'carta' },
    album: { ativa: true, premio: 'gloria' },
    unidade: { ativa: true, premio: 'gloria',
      detectar: (e) => (D().unidades || []).filter((u) => CC.unidadeCompletaEm && CC.unidadeCompletaEm(u.numero, e)).map((u) => 'unidade:' + u.numero) },
    dias: { ativa: true, premio: 'gloria',
      detectar: (e) => [100, 365].filter((n) => (e.lidos || []).length >= n).map((n) => 'dias:' + n) },
    conhecer: { ativa: true, premio: 'carta',
      detectar: (e) => (Object.keys(e.conhecidos || {}).length >= 14 ? ['conhecer:14'] : []) },
    passos: { ativa: true, premio: 'carta',
      detectar: (e) => ((D().licoes || []).length && (e.licoes || []).length >= D().licoes.length ? ['passos:todos'] : []) },
    desafio: { ativa: true, premio: 'carta',
      detectar: (e) => (CC.DESAFIOS || []).filter((d) => CC.situacaoDesafio(d, e).concluido).map((d) => 'desafio:' + d.id) },
    parabolas: { ativa: true, premio: 'carta',
      detectar: (e) => [7, 14, 21, 28].filter((n) => Object.keys(e.parabolasLidas || {}).length >= n).map((n) => 'parabolas:' + n) },
    pratica: { ativa: true, premio: 'carta',
      detectar: (e) => Object.entries(e.pratica || {}).filter(([, p]) => p.total > 0 && p.melhor >= p.total).map(([u]) => 'pratica:' + u) },
    proposito: { ativa: true, premio: 'carta',
      detectar: (e) => ((e.maiorProposito || 0) >= 7 ? ['proposito:7'] : []) },
    // conferidas pelo servidor (/api/quem leva cartasConvite; /api/estado tira o que não confere)
    // conferidas pelo servidor: /api/quem leva cartasServidor.chaves, e /api/estado tira a chave
    // destas fontes que ele não reconhece (CC.conferirCartasDoServidor, 02-estado.js)
    celula: { ativa: true, premio: 'carta', servidor: true, detectar: (e, ctx) => doServidor(ctx, /^celula:primeiro$/) },
    discipulado: { ativa: true, premio: 'carta', servidor: true, detectar: (e, ctx) => doServidor(ctx, /^discipulado:primeiro$/) },
    // os amigos que vieram pelo seu convite (contas novas com a primeira lição): as cartas de
    // Semeadores, uma por limiar alcançado (1, 5, 15, 40 e 100 amigos), fora do sorteio
    convite: { ativa: true, premio: 'especial', servidor: true, detectar: (e, ctx) => doServidor(ctx, /^convite:tier:[1-5]$/),
      carta: (chave) => ((R.especiais().find((a) => a.id === 'semeadores') || { cartas: [] }).cartas[Number(chave.split(':')[2]) - 1] || {}).id },
    // quem chegou por um convite: a carta de Boas-vindas, uma vez
    convidado: { ativa: true, premio: 'especial', servidor: true, detectar: (e, ctx) => doServidor(ctx, /^convidado$/),
      carta: () => ((R.especiais().find((a) => a.id === 'boas-vindas') || { cartas: [] }).cartas[0] || {}).id },
  };
  const doServidor = (ctx, padrao) => ((((ctx || {}).quem || {}).cartasServidor || {}).chaves || []).filter((k) => padrao.test(k));
  const fonteDe = (chave) => String(chave).split(':')[0];

  // Paga a fonte: a próxima carta (ou, com tudo completo, uma Glória para escolher), ou a Glória
  // do prêmio. A mesma chave nunca paga duas vezes. Devolve o estado novo das cartas e o que houve.
  R.receber = (cartas, fonte, chave, { dono = '', em = Date.now(), carta: gloriaEm = null } = {}) => {
    const c = copia(cartas);
    const f = R.FONTES[fonte];
    if (!f || !f.ativa || !chave || fonteDe(chave) !== fonte) return { cartas: c, resultado: null };
    if (c.eventos[chave]) return { cartas: c, resultado: { repetido: true, ...c.eventos[chave] } };
    if (f.premio === 'especial') {
      const id = f.carta(chave);
      if (!id) return { cartas: c, resultado: null };
      if (!c.recebidas[id]) c.recebidas[id] = { em, fonte: chave };
      c.eventos[chave] = { em, carta: id };
      const a = R.especiais().find((x) => x.id === R.carta(id).album);
      return { cartas: c, resultado: { carta: id, nova: true, especial: true, album: a.id, tem: a.cartas.filter((x) => c.recebidas[x.id]).length, total: a.cartas.length } };
    }
    if (f.premio === 'gloria') {
      const vai = gloriaEm && c.recebidas[gloriaEm] && !R.comGloria(c).has(gloriaEm) ? gloriaEm : '';
      c.glorias[chave] = { em, carta: vai, escolhidaEm: vai ? em : 0 };
      c.eventos[chave] = { em, gloria: 1 };
      return { cartas: c, resultado: { gloria: true, carta: c.glorias[chave].carta } };
    }
    const id = R.proxima(c, dono);
    if (!id) {
      c.glorias[chave] = { em, carta: '', escolhidaEm: 0 };
      c.eventos[chave] = { em, gloria: 1 };
      return { cartas: c, resultado: { gloria: true, carta: '' } };
    }
    c.recebidas[id] = { em, fonte: chave };
    c.eventos[chave] = { em, carta: id };
    const a = R.albuns().find((x) => x.id === R.carta(id).album);
    const resultado = { carta: id, nova: true, album: a.id, tem: a.cartas.filter((x) => c.recebidas[x.id]).length, total: a.cartas.length };
    if (completo(a, c)) {
      // álbum completo: o Ouro dele ganha a Glória
      const ouro = a.cartas.find((x) => x.raridade === 'ouro').id;
      const r = R.receber(c, 'album', 'album:' + a.id, { dono, em, carta: ouro });
      resultado.completou = a.id;
      return { cartas: r.cartas, resultado };
    }
    return { cartas: c, resultado };
  };

  // ---------- resumo e Glória ----------
  R.comGloria = (cartas) => new Set(Object.values((cartas || {}).glorias || {}).map((g) => g.carta).filter(Boolean));
  R.resumo = (cartas) => {
    const c = copia(cartas);
    const gloria = R.comGloria(c);
    const lista = R.albuns().map((a) => {
      const faltam = { linho: 0, bronze: 0, prata: 0, ouro: 0 };
      for (const x of a.cartas) if (!c.recebidas[x.id]) faltam[x.raridade]++;
      const tem = a.cartas.filter((x) => c.recebidas[x.id]).length;
      return { id: a.id, nome: a.nome, tem, total: a.cartas.length, faltam, completo: tem === a.cartas.length };
    });
    const ativo = lista.find((a) => !a.completo) || null;
    return {
      albuns: lista, ativo: ativo ? ativo.id : '',
      especiais: R.especiais().map((a) => ({ id: a.id, nome: a.nome, tem: a.cartas.filter((x) => c.recebidas[x.id]).length, total: a.cartas.length })),
      tem: lista.reduce((s, a) => s + a.tem, 0), total: lista.reduce((s, a) => s + a.total, 0),
      pendentes: Object.entries(c.glorias).filter(([, g]) => !g.carta).map(([k]) => k).sort(),
      gloria,
    };
  };
  // Põe a Glória pendente mais antiga na carta escolhida: só carta recebida e ainda sem Glória.
  R.escolherGloria = (cartas, id, em = Date.now()) => {
    const c = copia(cartas);
    const [chave] = Object.entries(c.glorias).filter(([, g]) => !g.carta).sort((x, y) => (x[1].em - y[1].em) || (x[0] < y[0] ? -1 : 1))[0] || [];
    if (!chave || !c.recebidas[id] || !R.carta(id) || R.carta(id).raridade === 'gloria' || R.comGloria(c).has(id)) return null;
    c.glorias[chave] = { ...c.glorias[chave], carta: id, escolhidaEm: em };
    return c;
  };

  // ---------- em dia ----------
  // A chave do baú leva a geração do "Zerar" (zeradoEm): depois de zerar, ler de novo e abrir o
  // mesmo baú paga a próxima carta que falta.
  R.chaveDoBau = (numero, e) => 'bau:dia:' + numero + ((e || {}).zeradoEm ? '@' + e.zeradoEm : '');
  // Paga o que está pendente, na ordem: os baús abertos sem carta (do dia menor para o maior), as
  // fontes que saem do estado ou do servidor e, por fim, a Glória dos álbuns completos. Devolve o
  // estado novo das cartas e a lista do que foi pago agora.
  R.emDia = (e, { dono = '', em = Date.now(), quem = null } = {}) => {
    let c = copia(e.cartas);
    const novos = [];
    const pagar = (fonte, chave, extra) => {
      const r = R.receber(c, fonte, chave, { dono, em, ...extra });
      c = r.cartas;
      if (r.resultado && !r.resultado.repetido) novos.push({ fonte, chave, ...r.resultado });
    };
    Object.keys(e.bausAbertos || {}).map((k) => Number(String(k).replace('dia:', ''))).filter((n) => n > 0).sort((x, y) => x - y)
      .forEach((n) => pagar('bau', R.chaveDoBau(n, e)));
    for (const [fonte, f] of Object.entries(R.FONTES)) {
      if (!f.ativa || !f.detectar) continue;
      let chaves = [];
      try { chaves = f.detectar(e, { quem }); } catch (erro) { chaves = []; }
      for (const chave of chaves) if (!c.eventos[chave]) pagar(fonte, chave);
    }
    for (const a of R.albuns()) {
      if (c.eventos['album:' + a.id] || !completo(a, c)) continue;
      pagar('album', 'album:' + a.id, { carta: a.cartas.find((x) => x.raridade === 'ouro').id });
    }
    return { cartas: c, novos };
  };

  // ---------- ponte com o app ----------
  // Paga o pendente e grava. As cartas que não vêm do baú (marcos, convite, célula...) aparecem
  // numa revelação quando nada está aberto na tela; senão, e para os baús antigos, um aviso curto.
  // A tela do baú pede { calado: true }: ela mesma revela a carta do baú dela.
  CC.cartasEmDia = ({ calado = false } = {}) => {
    const E = CC.estado();
    const r = R.emDia(E, { dono: E.dono || '', em: Date.now(), quem: CC.quem || null });
    if (!r.novos.length) return r;
    CC.gravar('cartas', r.cartas);
    if (calado) return r;
    const cartas = r.novos.filter((x) => x.carta && x.fonte !== 'bau' && x.fonte !== 'album');
    const calmo = !document.querySelector('.tela-cheia, .cortina, .licao:not(.saindo)');
    if (cartas.length && calmo && CC.pedirCartas) {
      CC.pedirCartas().then(() => CC.album.revelarNovas(cartas), () => CC.avisar('Carta nova no seu álbum.'));
      return r;
    }
    const n = r.novos.filter((x) => x.carta).length;
    if (n) CC.avisar(n === 1 ? 'Carta nova no seu álbum.' : n + ' cartas novas no seu álbum.');
    else if (r.novos.some((x) => x.gloria && !x.carta)) CC.avisar('Um acabamento Glória para escolher no álbum.');
    return r;
  };

  CC.cartasRegras = R;
})(window.CC);
