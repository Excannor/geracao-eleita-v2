/* O leitor de marcas do estudo da célula (À Mesa). Lê o texto que o líder escreveu ou colou e
   devolve as partes (título, tópicos, versículos, listas com seta, frase de alguém, "Para
   guardar"), as referências dos cartões, as perguntas de uma seção "Perguntas" e o texto-fonte
   limpo: cada linha que citava o versículo de outra tradução vira só a referência. O texto
   bíblico nunca sai daqui: o cartão leva a referência, e as palavras vêm da Bíblia do app na hora
   de desenhar.
   Função pura, sem DOM. Roda na prévia do preparo (peça estudo-preparo) e no servidor, que relê
   a fonte por conta própria e grava só a versão limpa (servidor.mjs, carregarRegras). Usa
   CC.refsNoTexto, CC.lerRefLivre, CC.escreverRef e CC.MAX_TRECHO, de 01-nucleo.js.
   As letras especiais (travessão, meia-risca, aspas curvas, seta, o R do PDF) vão escritas como escape:
   a varredura de travessão nos textos do app não acusa o leitor. */
(function (CC) {
  'use strict';

  const TOPICO_MAX = 140;
  const RESTO_CURTO = 40;
  // Uma linha maior que isto é texto, sem procurar marca nenhuma: uma parte tem até 1.500
  // caracteres (estudos.mjs recusa a maior), e assim nenhuma expressão roda sobre uma linha enorme.
  const LINHA_MAX = 3000;
  const PARES_MAX = 12;
  const PERGUNTAS_MAX = 6;

  // ---------- a linha, antes das regras ----------
  const INVISIVEIS = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2060\ufeff]/g;
  // a bolinha do Word (inclusive a da fonte Symbol, na área de uso privado) e o hífen de lista
  const MARCA_LISTA = /^(?:[\u2022\u2023\u2043\u2219\u25a0\u25a1\u25aa\u25ab\u25cf\u25e6\uf076\uf0a7\uf0b7\uf0d8\uf0fc]|[-\u2013](?= ))\s*/;
  // o "n " ou "nn " que a cópia do PDF deixa no lugar do marcador, antes de uma referência, de
  // "Conclusão" ou de "Estudo:"
  const PREFIXO_PDF = /^n{1,2} (?=\S)/;
  const DEPOIS_DO_PREFIXO = /^\**\s*(?:conclus[aã]o|para concluir|estudo\s*:|tema\s*:)/i;

  function limpar(bruta, capitulos) {
    // Todo espaço (o comum, o inseparável, o tab e os outros que o \s conhece, como o U+1680)
    // vira um espaço só: nenhuma expressão daqui encontra uma fila de espaços para desmontar.
    let l = String(bruta).replace(INVISIVEIS, '').replace(/\s+/g, ' ').trim();
    l = l.replace(MARCA_LISTA, '');
    if (PREFIXO_PDF.test(l)) {
      const resto = l.replace(PREFIXO_PDF, '');
      const ref = CC.refsNoTexto(resto, capitulos)[0];
      if (DEPOIS_DO_PREFIXO.test(resto) || (ref && ref.inicio === 0)) l = resto;
    }
    return l;
  }

  // **negrito** do Markdown vira *negrito*, o do WhatsApp e o do app
  const negrito = (s) => String(s).replace(/\*\*(.+?)\*\*/g, '*$1*');
  const semAsteriscos = (s) => String(s).replace(/\*+/g, '').replace(/ {2,}/g, ' ').trim();
  const inteiraEmNegrito = (s) => /^(\*{1,2})[^*\s][^*]*\1$/.test(s);
  const tirarNegritoDeFora = (s) => s.replace(/^\*{1,2}/, '').replace(/\*{1,2}$/, '').trim();
  const tirarAspas = (s) => String(s).trim().replace(/^[\u201c"\u00ab]\s*([\s\S]*?)\s*[\u201d"\u00bb]([.,;!?]?)$/, '$1$2').trim();

  // ---------- as marcas ----------
  const TOPICO = /^\**\s*(\d{1,2})[.)]\s+(.+)$/;
  const CONCLUSAO = /^\**\s*(?:conclus[aã]o|para concluir)\s*\**\s*(?::\s*\**\s*([\s\S]*?))?\s*\**\s*$/i;
  const PERGUNTAS = /^\**\s*(?:perguntas(?: para conversar)?|para conversar)\s*\**\s*(?::\s*\**\s*([\s\S]*?))?\s*\**\s*$/i;
  const GUARDAR = /^\**\s*para guardar\s*\**\s*:\s*\**\s*([\s\S]+)$/i;
  const FRASE = /^>\s*([\s\S]*)$/;
  const SETA = /\u2192|->|=>|\u00ae/;
  const SETAS = /\s*(?:\u2192|->|=>|\u00ae)\s*/;
  const MARCA_PERGUNTA = /^(?:\d{1,2}[.)]|[a-z][.)]|[-\u2013\u2022*])\s*/i;
  // a citação depois da referência: dois pontos, travessão ou meia-risca (ou nada) e o texto entre
  // aspas até as últimas aspas da linha; o que sobra depois delas (CAUDA) é só pontuação e a sigla
  // da tradução ("(NVI)"). Em duas expressões, sem espaços opcionais encadeados: a de cima anda a
  // linha uma vez, e a cauda é curta.
  const CITACAO = /^(?:[:\u2014\u2013-] ?)?[\u201c"\u00ab]([\s\S]*)[\u201d"\u00bb]([^\u201d"\u00bb]*)$/u;
  const CAUDA = /^ ?[.,;]? ?(?:\( ?(\p{Lu}[\p{L}\d]{1,7}) ?\))? ?\.?$/u;
  const citacao = (resto) => {
    const c = CITACAO.exec(resto);
    const cauda = c && c[2].length <= 40 ? CAUDA.exec(c[2]) : null;
    return cauda ? { texto: c[1], de: cauda[1] || '' } : null;
  };
  const SO_SIGLA = /^[.:;,]?\s*(?:\(\s*\p{Lu}[\p{L}\d]{1,7}\s*\))?\s*[.:;,]?$/u;
  // o texto entre aspas e, depois, a referência: entre parênteses, ou depois de um travessão
  const ASPAS_E_REF = /^[\u201c"\u00ab]([\s\S]+)[\u201d"\u00bb]\s*[.,;]?\s*(?:[\u2014\u2013-]\s*)?([\s\S]+)$/u;

  // "1 Pedro 5:8", "Efésios 6:12 (NVI)", "(Efésios 6:10)", "Efésios 6.12, NVI": a referência e a sigla
  function refComSigla(texto, capitulos) {
    let t = String(texto || '').trim().replace(/\.$/, '').trim();
    const par = /^\(\s*([\s\S]+?)\s*\)$/.exec(t);
    if (par) t = par[1];
    let sigla = '';
    const m = /^([\s\S]+?)(?:\s*\(\s*(\p{Lu}[\p{L}\d]{1,7})\s*\)|\s*,\s*(\p{Lu}[\p{L}\d]{1,7})|\s+(\p{Lu}{2,6}))$/u.exec(t);
    let r = CC.lerRefLivre(t, capitulos);
    if (!r && m) {
      r = CC.lerRefLivre(m[1], capitulos);
      sigla = m[2] || m[3] || m[4] || '';
    }
    return r ? { r, sigla } : null;
  }

  // A linha é um versículo? { r, troca, de, antes } ou null.
  //   troca: a linha citava o texto (de: a sigla da tradução, ou '');
  //   antes: o cartão entra antes da linha, que fica como texto ("Efésios 6:13-17 apresenta:").
  function versiculoDaLinha(linha, capitulos) {
    const s = semAsteriscos(linha);
    const par = /^\(\s*([^()]+?)\s*\)\.?$/.exec(s);
    if (par) {
      const x = refComSigla(par[1], capitulos);
      if (x) return { r: x.r, troca: false, de: '', antes: false };
    }
    const a = CC.refsNoTexto(s, capitulos)[0];
    if (a && a.inicio === 0) {
      const resto = s.slice(a.fim).trim();
      if (!resto || SO_SIGLA.test(resto)) return { r: a, troca: false, de: '', antes: false };
      if (!a.maiuscula) return null;
      const c = citacao(resto);
      if (c) return { r: a, troca: true, de: c.de, antes: false };
      if (!a.inteiro && resto.length <= RESTO_CURTO && !/[\u201c\u201d"\u00ab\u00bb]/.test(resto)) return { r: a, troca: false, de: '', antes: true };
      return null;
    }
    const q = ASPAS_E_REF.exec(s);
    if (q) {
      const x = refComSigla(q[2], capitulos);
      if (x) return { r: x.r, troca: true, de: x.sigla, antes: false };
    }
    return null;
  }

  // "> (aspas) Estejam alertas e vigiem. (aspas) (travessão) 1 Pedro 5:8" é versículo; com um nome no
  // lugar da referência ("Spurgeon"), é frase de alguém.
  function fraseDaLinha(interno, capitulos) {
    const s = interno.trim();
    const q = ASPAS_E_REF.exec(semAsteriscos(s));
    if (q) {
      const x = refComSigla(q[2], capitulos);
      if (x) return { versiculo: { r: x.r, troca: true, de: x.sigla, antes: false } };
    }
    const corte = /^([\s\S]*\S)\s*(?:[\u2014\u2013]|\s-)\s*([^\u2014\u2013]+)$/.exec(s);
    if (corte) {
      const x = refComSigla(corte[2], capitulos);
      if (x) return { versiculo: { r: x.r, troca: true, de: x.sigla, antes: false } };
      return { texto: negrito(tirarAspas(corte[1])), autor: semAsteriscos(corte[2]) };
    }
    return { texto: negrito(tirarAspas(s)), autor: '' };
  }

  // Os pares de uma linha com seta. Com duas setas ou mais (a cópia do PDF põe a lista inteira numa
  // linha), corta na pontuação seguida de maiúscula entre um significado e o item seguinte; no
  // último significado, a pontuação grudada numa maiúscula ("de Deus.E Paulo") corta de novo, e o
  // resto vira um texto depois da lista. Sem onde cortar, a linha inteira é um par só.
  function paresDaLinha(s) {
    const partes = s.split(SETAS).map((x) => x.trim());
    if (partes.length === 2) return { pares: [[partes[0], partes[1]]], resto: '' };
    const pares = [];
    let item = partes[0];
    for (let j = 1; j < partes.length - 1; j++) {
      const m = /^([\s\S]*[.;!?])\s*(\p{Lu}[\s\S]*)$/u.exec(partes[j]);
      if (!m) return { pares: [[partes[0], partes.slice(1).join(' \u2192 ')]], resto: '' };
      pares.push([item, m[1].trim()]);
      item = m[2].trim();
    }
    let ultimo = partes[partes.length - 1];
    let resto = '';
    const g = /^([\s\S]*?[.;!?])(\p{Lu}[\s\S]*)$/u.exec(ultimo);
    if (g) { ultimo = g[1]; resto = g[2].trim(); }
    pares.push([item, ultimo.trim()]);
    return { pares, resto };
  }

  // ---------- o leitor ----------
  // opcoes: capitulos ({ livro: quantos }), versiculos ((livro, cap) => quantos versículos o
  // capítulo tem na Bíblia do app; sem ele, o capítulo inteiro mostra 10) e semCartao (as
  // sugestões que o líder recusou).
  CC.lerEstudo = function (texto, opcoes) {
    const o = opcoes || {};
    const capitulos = o.capitulos || null;
    const versiculos = typeof o.versiculos === 'function' ? o.versiculos : null;
    const semCartao = new Set((o.semCartao || []).map(String));
    const MAX = CC.MAX_TRECHO;
    const fonte = String(texto == null ? '' : texto).replace(/\r\n?|[\u2028\u2029]/g, '\n')
      .replace(/^(?:[ \t\u00a0]*\n)+/, '').replace(/\s+$/, '').split('\n');
    const saida = fonte.slice();
    const blocos = [];
    const trocas = [];
    const avisos = [];
    const perguntas = [];
    const sobrando = [];
    const refs = [];
    const chavesDeCartao = new Set();
    let titulo = '';
    let linhaTitulo = -1;
    let primeira = true;
    let emPerguntas = false;
    let lista = null;

    const por = (b, i) => { b.l = [i, i]; blocos.push(b); return blocos.length - 1; };
    // destaque: todas as linhas da lista em negrito (o resumo colado do Word). Numa lista
    // misturada, a linha em negrito volta a ter os asteriscos, item e significado.
    const fecharLista = () => {
      if (!lista) return;
      lista.destaque = lista.linhas > 0 && lista.emNegrito === lista.linhas;
      if (!lista.destaque) lista.itens = lista.itens.map((par, k) => (lista.negritos[k] ? par.map((x) => (x ? '*' + x + '*' : x)) : par));
      delete lista.linhas; delete lista.emNegrito; delete lista.negritos;
      lista = null;
    };
    // O cartão de uma referência: até MAX versículos; o capítulo inteiro e o trecho longo mostram
    // os primeiros e guardam o que o líder escreveu.
    const cartao = (v, i) => {
      const r = v.r;
      const escrito = CC.escreverRef(r.livro, r.cap, r.de, r.ate);
      const total = versiculos ? Number(versiculos(r.livro, r.cap)) || 0 : 0;
      const de = r.de || 1;
      let ate = r.inteiro ? de + MAX - 1 : r.ate;
      let aviso = r.inteiro ? 'capitulo' : '';
      if (!r.inteiro && ate - de + 1 > MAX) { ate = de + MAX - 1; aviso = 'longo'; }
      if (total && ate > total) { ate = Math.max(de, total); if (r.inteiro) aviso = ''; }
      const ref = CC.escreverRef(r.livro, r.cap, de, ate);
      const b = { t: 'versiculo', ref };
      if (ref !== escrito) b.escrito = escrito;
      const n = por(b, i);
      if (aviso) avisos.push({ tipo: aviso, bloco: n, ref: escrito, mostra: ref });
      if (total && de > total) avisos.push({ tipo: 'sem-versiculo', bloco: n, ref });
      if (v.troca) {
        trocas.push({ bloco: n, ref, de: v.de || '' });
        saida[i] = escrito;
      }
      chavesDeCartao.add(escrito);
      if (!refs.includes(ref)) refs.push(ref);
      return n;
    };
    const textoDe = (s, i) => por({ t: 'texto', texto: negrito(s) }, i);

    for (let i = 0; i < fonte.length; i++) {
      const linha = limpar(fonte[i], capitulos);
      if (!linha) continue;
      if (linha.length > LINHA_MAX) { fecharLista(); emPerguntas = false; primeira = false; textoDe(linha, i); continue; }
      const topico = TOPICO.exec(linha);
      const textoDoTopico = topico ? semAsteriscos(topico[2]) : '';
      const ehTopico = !!topico && textoDoTopico.length > 0 && textoDoTopico.length <= TOPICO_MAX;
      const conclusao = CONCLUSAO.exec(linha);
      const cabecaPerguntas = PERGUNTAS.exec(linha);
      const guardar = GUARDAR.exec(linha);
      const frase = FRASE.exec(linha);
      const seta = !conclusao && !cabecaPerguntas && !guardar && !frase && SETA.test(linha);

      // a seção de perguntas: as linhas até a próxima marca, sem o número do começo
      if (emPerguntas) {
        const v = !conclusao && !guardar && !frase && !seta && !cabecaPerguntas && versiculoDaLinha(linha, capitulos);
        if (!conclusao && !guardar && !frase && !seta && !cabecaPerguntas && !(v && !v.antes)) {
          const q = negrito(linha.replace(MARCA_PERGUNTA, '').trim());
          if (q) (perguntas.length < PERGUNTAS_MAX ? perguntas : sobrando).push(q);
          continue;
        }
        emPerguntas = false;
      }
      if (!seta || ehTopico) fecharLista();

      // 1. o título: a primeira linha, sem "Estudo:" ou "Tema:", se ela não for outra marca
      if (primeira) {
        primeira = false;
        const outraMarca = ehTopico || conclusao || cabecaPerguntas || guardar || frase || seta || versiculoDaLinha(linha, capitulos);
        if (!outraMarca) {
          titulo = semAsteriscos(linha.replace(/^\**\s*(?:estudo|tema)\s*\**\s*:\s*/i, ''));
          linhaTitulo = i;
          continue;
        }
      }
      // 2. tópico
      if (ehTopico) { por({ t: 'topico', n: Number(topico[1]), texto: textoDoTopico }, i); continue; }
      // 3. conclusão (o que vem depois dos dois pontos vira um texto logo abaixo)
      if (conclusao) {
        por({ t: 'conclusao' }, i);
        const resto = (conclusao[1] || '').trim();
        if (resto) textoDe(resto, i);
        continue;
      }
      // 4. a seção de perguntas
      if (cabecaPerguntas) {
        emPerguntas = true;
        const q = negrito((cabecaPerguntas[1] || '').replace(MARCA_PERGUNTA, '').trim());
        if (q) perguntas.push(q);
        continue;
      }
      // 5. para guardar
      if (guardar) {
        const t = guardar[1].trim();
        por({ t: 'guardar', texto: negrito(inteiraEmNegrito(t) ? tirarNegritoDeFora(t) : t) }, i);
        continue;
      }
      // 6. frase de alguém (ou versículo, quando quem disse é uma referência)
      if (frase) {
        const f = fraseDaLinha(frase[1], capitulos);
        if (f.versiculo) cartao(f.versiculo, i);
        else if (f.texto) por({ t: 'citacao', texto: f.texto, autor: f.autor }, i);
        continue;
      }
      // 7. lista com seta (linhas seguidas formam uma lista só, de até PARES_MAX linhas)
      if (seta) {
        const bold = inteiraEmNegrito(linha);
        const { pares, resto } = paresDaLinha(bold ? tirarNegritoDeFora(linha) : linha);
        let contou = false;
        for (const [item, sentido] of pares) {
          if (lista && lista.itens.length >= PARES_MAX) {
            fecharLista();
            avisos.push({ tipo: 'lista-longa', bloco: blocos.length });
          }
          if (!lista) { lista = { t: 'seta', itens: [], destaque: false, linhas: 0, emNegrito: 0, negritos: [] }; por(lista, i); contou = false; }
          if (!contou) { lista.linhas++; if (bold) lista.emNegrito++; contou = true; }
          lista.itens.push([negrito(item), negrito(sentido)]);
          lista.negritos.push(bold);
          lista.l[1] = i;
        }
        if (resto) { fecharLista(); textoDe(resto, i); }
        continue;
      }
      // 8. versículo
      const v = versiculoDaLinha(linha, capitulos);
      if (v) {
        cartao(v, i);
        if (v.antes) textoDe(linha, i);
        continue;
      }
      // 9. texto
      textoDe(linha, i);
    }
    fecharLista();
    if (sobrando.length) avisos.push({ tipo: 'perguntas-demais', perguntas: sobrando });

    // Uma referência com versículo no meio de um texto, que ainda não é cartão e que o líder não
    // recusou, vira sugestão de cartão. Capítulo inteiro no meio do texto não vira.
    const sugestoes = [];
    const sugeridas = new Set();
    blocos.forEach((b, n) => {
      if (b.t !== 'texto') return;
      for (const r of CC.refsNoTexto(semAsteriscos(b.texto), capitulos)) {
        if (!r.maiuscula || r.inteiro) continue;
        const ref = CC.escreverRef(r.livro, r.cap, r.de, r.ate);
        if (chavesDeCartao.has(ref) || semCartao.has(ref) || sugeridas.has(ref)) continue;
        sugeridas.add(ref);
        sugestoes.push({ bloco: n, ref });
      }
    });

    return { titulo, linhaTitulo, blocos, refs, perguntas, fonte: saida.join('\n'), trocas, sugestoes, avisos };
  };
})(window.CC);
