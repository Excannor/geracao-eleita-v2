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
  const MARCA_LISTA = /^(?:[\u00b7\u2022\u2023\u2043\u2219\u25a0\u25a1\u25aa\u25ab\u25cf\u25e6\uf076\uf0a7\uf0b7\uf0d8\uf0fc]|[-\u2013](?= ))\s*/;
  // No texto puro que o Word copia, o marcador da lista vem seguido de um tab: o ponto da fonte
  // Symbol, o "o" da Courier, o "§" e o "n" da Wingdings. Só com o tab dá para saber que não é texto.
  const MARCA_LISTA_TAB = /^[ \u00a0]*[\u00b7\u2022o\u00a7n\uf0a7\uf0b7\uf0d8\uf0fc]\t/;
  // o "n " ou "nn " que a cópia do PDF deixa no lugar do marcador, antes de uma referência, de
  // "Conclusão" ou de "Estudo:"
  const PREFIXO_PDF = /^n{1,2} (?=\S)/;
  const DEPOIS_DO_PREFIXO = /^\**\s*(?:conclus[aã]o|para concluir|estudo\s*:|tema\s*:)/i;

  function limpar(bruta, capitulos) {
    // Todo espaço (o comum, o inseparável, o tab e os outros que o \s conhece, como o U+1680)
    // vira um espaço só: nenhuma expressão daqui encontra uma fila de espaços para desmontar.
    let l = String(bruta).replace(INVISIVEIS, '').replace(MARCA_LISTA_TAB, '').replace(/\s+/g, ' ').trim();
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
  const tirarAspas = (s) => String(s).trim().replace(/^[\u201c"\u00ab\u2018]\s*([\s\S]*?)\s*[\u201d"\u00bb\u2019]([.,;!?]?)$/, '$1$2').trim();

  // ---------- as marcas ----------
  const TOPICO = /^\**\s*(\d{1,2})[.)]\s+(.+)$/;
  const CONCLUSAO = /^\**\s*(?:conclus[aã]o|para concluir)\s*\**\s*(?::\s*\**\s*([\s\S]*?))?\s*\**\s*$/i;
  const PERGUNTAS = /^\**\s*(?:perguntas(?: para conversar)?|para conversar)\s*\**\s*(?::\s*\**\s*([\s\S]*?))?\s*\**\s*$/i;
  const GUARDAR = /^\**\s*para guardar\s*\**\s*:\s*\**\s*([\s\S]+)$/i;
  const FRASE = /^>\s*([\s\S]*)$/;
  const SETA = /\u2192|->|=>|\u00ae/;
  const SETAS = /\s*(?:\u2192|->|=>|\u00ae)\s*/;
  const MARCA_PERGUNTA = /^(?:\d{1,2}[.)]|[a-z][.)]|[-\u2013\u2022*])\s*/i;
  // "Leiam juntos:" e "Leiam:" antes da referência: é como o texto do grupo traz cada cartão
  const LEIAM = /^(?:leiam?|leitura)(?: juntos)? ?: ?/i;
  // as linhas que o próprio app escreve no texto do grupo, quando o líder o cola de volta aqui
  const RODAPE = /^(?:Para ler cada versículo, abram a Bíblia nas referências acima\.|Conheça o app: \S+)$/;
  const LINHA_DO_ENCONTRO = /^Para o encontro de [\p{L}-]+, \d{2}\/\d{2}$/u;

  // ---------- as citações de outra tradução ----------
  // As aspas de abrir e de fechar: curvas, retas, angulares e simples.
  const ABRE = '\u201c"\u00ab\u2018\'';
  const FECHA = '\u201d"\u00bb\u2019\'';
  const TEM_ASPAS = /[\u201c\u201d"\u00ab\u00bb\u2018\u2019]/;
  const SEPARADOR = /^[:\u2014\u2013-] ?/;
  // A sigla de uma tradução (NVI, ARA, NTLH, A21) ou o nome dela por extenso (Nova Versão
  // Internacional, Almeida Revista e Atualizada).
  const SIGLA = /^\p{Lu}[\p{Lu}\d]{1,5}$/u;
  const VERSAO = /^(?:nova|almeida|b[ií]blia|tradu[cç][aã]o|vers[aã]o|king james)(?: [\p{L}\d]+){0,6}$/iu;
  const ehSigla = (s) => SIGLA.test(s) || VERSAO.test(s);
  // As siglas conhecidas que, no meio de um texto, entregam uma citação ("... nas regiões celestiais (NVI)").
  const SIGLA_NO_TEXTO = /\((?:NVI|NVT|NAA|ARA|ARC|ACF|NTLH|NBV|KJV|KJA|A21|TB|BJ)\)/;
  const escritoDe = (r) => CC.escreverRef(r.livro, r.cap, r.de, r.ate);

  // O que sobra depois das aspas (ou antes delas): nada além de pontuação, ou a sigla, entre
  // parênteses ou solta, com ou sem travessão antes ("(NVI)", "NVI", "(meia-risca) NVI"). Devolve a sigla, ''
  // quando não há sigla, ou null quando sobra outra coisa.
  function siglaSolta(resto) {
    let s = String(resto || '').replace(/^[ .,;:\u2014\u2013-]+/, '').replace(/[ .,;:]+$/, '');
    if (!s) return '';
    const par = /^\( ?([^()]+?) ?\)$/.exec(s);
    if (par) s = par[1];
    return ehSigla(s) ? s : null;
  }

  // A linha inteira é uma citação entre aspas (com dois pontos ou travessão antes, e a sigla
  // depois, ou não): { texto, de }, ou null. As aspas de fechar são as últimas da linha.
  function soCitacao(s) {
    const t = String(s || '').replace(SEPARADOR, '');
    if (t.length < 3 || ABRE.indexOf(t[0]) < 0) return null;
    let fim = t.length - 1;
    while (fim > 0 && FECHA.indexOf(t[fim]) < 0) fim--;
    if (fim < 2) return null;
    const de = siglaSolta(t.slice(fim + 1));
    return de === null ? null : { texto: t.slice(1, fim).trim(), de };
  }

  // o texto entre aspas e, depois, a referência: entre parênteses, ou depois de um travessão
  const ASPAS_E_REF = /^[\u201c"\u00ab\u2018']([\s\S]+)[\u201d"\u00bb\u2019'] ?[.,;]? ?(?:[\u2014\u2013-] ?)?([\s\S]+)$/u;

  // "1 Pedro 5:8", "Efésios 6:12 (NVI)", "(Efésios 6:10)", "Efésios 6.12, NVI", "Ef 6.12 NVI": a
  // referência e a sigla. Uma referência com sigla é curta: o texto longo nem é lido.
  function refComSigla(texto, capitulos) {
    let t = String(texto || '').trim().replace(/\.$/, '').trim();
    if (t.length > 80) return null;
    const par = /^\( ?([\s\S]+?) ?\)$/.exec(t);
    if (par) t = par[1];
    const r = CC.lerRefLivre(t, capitulos);
    if (r) return { r, sigla: '' };
    const m = /^([\s\S]+?)(?: ?\( ?([^()]+?) ?\)| ?, ?([^,()]+)| ([\p{Lu}\d]{2,6}))$/u.exec(t);
    const sigla = m ? m[2] || m[3] || m[4] || '' : '';
    const x = m && ehSigla(sigla) ? CC.lerRefLivre(m[1], capitulos) : null;
    return x ? { r: x, sigla } : null;
  }

  // A linha é um versículo? { r, troca, de, antes, aviso } ou null.
  //   troca: a linha citava o texto (de: a sigla da tradução, ou '');
  //   antes: o cartão entra antes da linha, que fica como texto ("Efésios 6:13-17 apresenta:");
  //   aviso: com antes, a linha parece trazer o texto do versículo, e a prévia avisa o líder.
  function versiculoDaLinha(linha, capitulos) {
    const s = semAsteriscos(linha).replace(LEIAM, '');
    const par = /^\( ?([^()]+?) ?\)\.?$/.exec(s);
    if (par) {
      const x = refComSigla(par[1], capitulos);
      if (x) return { r: x.r, troca: false, de: x.sigla, antes: false };
    }
    const a = CC.refsNoTexto(s, capitulos)[0];
    if (a && a.inicio === 0) {
      let resto = s.slice(a.fim).trim();
      const so = siglaSolta(resto);
      if (so !== null) return { r: a, troca: false, de: so, antes: false };
      if (!a.maiuscula) return null;
      // a sigla antes das aspas: "Efésios 6:12 (NVI) (aspas)...", "Efésios 6:12 NVI (travessão) (aspas)..."
      let de = '';
      const pre = /^,? ?(?:\( ?([^()]{2,40}?) ?\)|([\p{Lu}\d]{2,6})(?=[ :\u2014\u2013-]))/u.exec(resto);
      if (pre && ehSigla(pre[1] || pre[2])) { de = pre[1] || pre[2]; resto = resto.slice(pre[0].length).trim(); }
      const c = soCitacao(resto);
      if (c) return { r: a, troca: true, de: c.de || de, antes: false };
      // sem aspas: dois pontos ou travessão, o texto, e a sigla no fim. É a citação também.
      const separado = SEPARADOR.test(resto);
      const fim = / ?(?:\( ?([^()]{2,40}?) ?\)|[\u2014\u2013-] ?([\p{Lu}\d]{2,6}))\.?$/u.exec(resto);
      if ((separado || de) && fim && ehSigla(fim[1] || fim[2])) return { r: a, troca: true, de: fim[1] || fim[2], antes: false };
      if (a.inteiro) return null;
      const aspas = TEM_ASPAS.test(resto);
      if (resto.length <= RESTO_CURTO && !aspas && !de) return { r: a, troca: false, de: '', antes: true };
      // aspas no resto, ou dois pontos e um texto longo: pode ser o versículo de outra tradução, ou
      // a palavra do líder. O cartão entra antes, a linha fica, e a prévia pergunta.
      if (aspas || separado || de) return { r: a, troca: false, de: '', antes: true, aviso: true };
      return null;
    }
    const q = ASPAS_E_REF.exec(s);
    if (q) {
      const x = refComSigla(q[2], capitulos);
      if (x) return { r: x.r, troca: true, de: x.sigla, antes: false };
    }
    return null;
  }

  // A frase entre aspas e quem disse depois delas: "(aspas) Quem tem Deus tem tudo. (aspas) (Spurgeon)"
  // ou com o nome solto depois das aspas. { texto, autor } ou null.
  function aspasEAutor(s) {
    if (ABRE.indexOf(s[0]) < 0) return null;
    let fim = s.length - 1;
    while (fim > 0 && FECHA.indexOf(s[fim]) < 0) fim--;
    if (fim < 2) return null;
    let autor = s.slice(fim + 1).replace(/^[ .,;]+/, '').trim();
    const par = /^\( ?([^()]+?) ?\)\.?$/.exec(autor);
    if (par) autor = par[1];
    if (!autor || autor.length > 60 || TEM_ASPAS.test(autor)) return null;
    return { texto: s.slice(1, fim).trim(), autor };
  }

  // "> (aspas) Estejam alertas e vigiem. (aspas) (travessão) 1 Pedro 5:8" é versículo; com um nome no
  // lugar da referência ("Spurgeon"), é frase de alguém. Com a sigla de uma tradução no lugar do
  // nome, é um versículo sem a referência: fica como veio, e a prévia avisa (aviso).
  function fraseDaLinha(interno, capitulos) {
    const s = interno.trim();
    const q = ASPAS_E_REF.exec(semAsteriscos(s));
    if (q) {
      const x = refComSigla(q[2], capitulos);
      if (x) return { versiculo: { r: x.r, troca: true, de: x.sigla, antes: false } };
    }
    const v = versiculoDaLinha(s, capitulos);
    if (v && !v.antes) return { versiculo: v };
    const corte = /^([\s\S]*\S) ?(?:[\u2014\u2013]| -) ?([^\u2014\u2013]+)$/.exec(s);
    if (corte) {
      const x = refComSigla(corte[2], capitulos);
      if (x) return { versiculo: { r: x.r, troca: true, de: x.sigla, antes: false } };
      const autor = semAsteriscos(corte[2]);
      return { texto: negrito(tirarAspas(corte[1])), autor: ehSigla(autor) ? '' : autor, aviso: ehSigla(autor) };
    }
    const c = aspasEAutor(s);
    if (c) return { texto: negrito(c.texto), autor: ehSigla(c.autor) ? '' : semAsteriscos(c.autor), aviso: ehSigla(c.autor) };
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
  // capítulo tem na Bíblia do app; sem ele, o capítulo inteiro mostra 10), semCartao (as
  // sugestões que o líder recusou) e semTitulo (a palavra do líder na leitura da semana e no
  // trecho: não tem título, e a primeira linha é texto como as outras).
  CC.lerEstudo = function (texto, opcoes) {
    const o = opcoes || {};
    const capitulos = o.capitulos || null;
    const versiculos = typeof o.versiculos === 'function' ? o.versiculos : null;
    const semCartao = new Set((o.semCartao || []).map(String));
    const MAX = CC.MAX_TRECHO;
    const fonte = String(texto == null ? '' : texto).replace(/\r\n?|[\u2028\u2029]/g, '\n')
      .replace(/^(?:[ \t\u00a0]*\n)+/, '').replace(/\s+$/, '').split('\n');
    // a fonte limpa, linha a linha: a linha com a citação vira a referência, e a linha que era só a
    // citação (logo antes ou logo depois do cartão) sai (null)
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
    let primeira = !o.semTitulo;
    let emPerguntas = false;
    let perguntasMarcadas = true;
    let lista = null;
    // o cartão da linha anterior (a citação logo abaixo dele é a troca dele) e a citação da linha
    // anterior (que é a troca do cartão desta)
    let ultimoCartao = null;
    let trocaAntes = null;

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
    const avisar = (n, ref) => {
      if (!avisos.some((a) => a.tipo === 'citacao' && a.bloco === n)) avisos.push(ref ? { tipo: 'citacao', bloco: n, ref } : { tipo: 'citacao', bloco: n });
    };
    // O cartão de uma referência: até MAX versículos; o capítulo inteiro e o trecho longo mostram
    // os primeiros e guardam o que o líder escreveu. limpa: o que fica na fonte limpa no lugar da
    // linha que citava o texto (a referência sozinha, se nada for dito).
    const cartao = (v, i, limpa) => {
      const r = v.r;
      const escrito = escritoDe(r);
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
      const pendente = trocaAntes;
      trocaAntes = null;
      if (v.troca || pendente) {
        trocas.push({ bloco: n, ref, de: (pendente && pendente.de) || v.de || '' });
        if (v.troca) saida[i] = limpa === undefined ? escrito : limpa;
        if (pendente) b.l[0] = pendente.i;
      }
      chavesDeCartao.add(escrito);
      if (!refs.includes(ref)) refs.push(ref);
      ultimoCartao = { n, de: v.de || '' };
      return n;
    };
    const textoDe = (s, i) => por({ t: 'texto', texto: negrito(s) }, i);
    // a próxima linha não vazia, e se ela é só uma referência (o cartão sem citação)
    const proxima = (i) => {
      for (let j = i + 1; j < fonte.length; j++) { const l = limpar(fonte[j], capitulos); if (l) return l.length > LINHA_MAX ? '' : l; }
      return '';
    };
    const refSozinha = (l) => {
      if (!l || TOPICO.test(l) || FRASE.test(l)) return false;
      const v = versiculoDaLinha(l, capitulos);
      return !!v && !v.troca && !v.antes;
    };

    for (let i = 0; i < fonte.length; i++) {
      const linha = limpar(fonte[i], capitulos);
      if (!linha) continue;
      const anterior = ultimoCartao;
      ultimoCartao = null;
      if (linha.length > LINHA_MAX) { fecharLista(); emPerguntas = false; primeira = false; textoDe(linha, i); continue; }
      if (RODAPE.test(linha) || (titulo && !blocos.length && LINHA_DO_ENCONTRO.test(linha))) { saida[i] = null; continue; }
      const topico = TOPICO.exec(linha);
      const textoDoTopico = topico ? semAsteriscos(topico[2]) : '';
      // "1. Efésios 6:10 (aspas) Fortaleça-se... (aspas) (NVI)": o tópico fica com a referência, e o cartão vem logo abaixo
      const noTopico = textoDoTopico ? versiculoDaLinha(textoDoTopico, capitulos) : null;
      const topicoCitado = noTopico && noTopico.troca ? noTopico : null;
      const ehTopico = !!topico && textoDoTopico.length > 0 && (textoDoTopico.length <= TOPICO_MAX || !!topicoCitado);
      const conclusao = CONCLUSAO.exec(linha);
      const cabecaPerguntas = PERGUNTAS.exec(linha);
      const guardar = GUARDAR.exec(linha);
      const frase = FRASE.exec(linha);
      let seta = !conclusao && !cabecaPerguntas && !guardar && !frase && SETA.test(linha);
      // a seta sem um dos lados ("item ->", "-> sentido") não é lista: fica como texto
      const negritoNaSeta = seta && inteiraEmNegrito(linha);
      const setaLida = seta ? paresDaLinha(negritoNaSeta ? tirarNegritoDeFora(linha) : linha) : null;
      if (setaLida && setaLida.pares.some(([item, sentido]) => !semAsteriscos(item) || !semAsteriscos(sentido))) seta = false;

      // a seção de perguntas: as linhas até a próxima marca, sem o número do começo. Se as
      // perguntas vieram numeradas, a primeira linha sem número também fecha a seção.
      if (emPerguntas) {
        const marcada = MARCA_PERGUNTA.test(linha);
        const v = !conclusao && !guardar && !frase && !seta && !cabecaPerguntas && versiculoDaLinha(linha, capitulos);
        const fechou = conclusao || guardar || frase || seta || cabecaPerguntas || (v && !v.antes) || (!marcada && perguntasMarcadas && (perguntas.length + sobrando.length) > 0);
        if (!fechou) {
          const q = negrito(linha.replace(MARCA_PERGUNTA, '').trim());
          if (q) (perguntas.length < PERGUNTAS_MAX ? perguntas : sobrando).push(q);
          perguntasMarcadas = perguntasMarcadas && marcada;
          continue;
        }
        emPerguntas = false;
      }

      // A citação entre aspas numa linha só, logo depois do cartão (a referência numa linha, o
      // texto na outra), é a troca desse cartão e sai da fonte limpa. Pode seguir por mais linhas.
      const citacao = soCitacao(semAsteriscos(linha).replace(/^> ?/, ''));
      if (citacao && anterior) {
        if (!trocas.some((t) => t.bloco === anterior.n)) trocas.push({ bloco: anterior.n, ref: blocos[anterior.n].ref, de: citacao.de || anterior.de || '' });
        blocos[anterior.n].l[1] = i;
        saida[i] = null;
        ultimoCartao = anterior;
        continue;
      }
      // ... e logo antes da linha que tem só a referência
      if (citacao && refSozinha(proxima(i))) {
        fecharLista();
        trocaAntes = { de: citacao.de, i };
        saida[i] = null;
        continue;
      }
      if (!seta || ehTopico) fecharLista();

      // 1. o título: a primeira linha, sem "Estudo:" ou "Tema:", se ela não for outra marca. A
      // referência com um resto curto ("João 3:16 (meia-risca) O amor de Deus") também é título.
      if (primeira) {
        primeira = false;
        const v1 = !ehTopico && !conclusao && !cabecaPerguntas && !guardar && !frase && !seta && versiculoDaLinha(linha, capitulos);
        const outraMarca = ehTopico || conclusao || cabecaPerguntas || guardar || frase || seta || (v1 && !(v1.antes && !v1.aviso));
        if (!outraMarca) {
          titulo = semAsteriscos(linha.replace(/^\**\s*(?:estudo|tema)\s*\**\s*:\s*/i, ''));
          linhaTitulo = i;
          continue;
        }
      }
      // 2. tópico (o que cita um versículo fica com a referência, e o cartão entra logo abaixo)
      if (ehTopico) {
        if (topicoCitado) {
          const escrito = escritoDe(topicoCitado.r);
          por({ t: 'topico', n: Number(topico[1]), texto: escrito }, i);
          cartao(topicoCitado, i, topico[1] + '. ' + escrito + '\n' + escrito);
        } else {
          const n = por({ t: 'topico', n: Number(topico[1]), texto: textoDoTopico }, i);
          if (noTopico && noTopico.aviso) avisar(n, escritoDe(noTopico.r));
        }
        continue;
      }
      // 3. conclusão (o que vem depois dos dois pontos vira um texto logo abaixo, ou o cartão, se
      // for a citação de um versículo)
      if (conclusao) {
        por({ t: 'conclusao' }, i);
        const resto = (conclusao[1] || '').trim();
        if (resto) {
          const v = versiculoDaLinha(resto, capitulos);
          if (v && v.troca) cartao(v, i, 'Conclusão\n' + escritoDe(v.r));
          else {
            const n = textoDe(resto, i);
            if (v && v.aviso) avisar(n, escritoDe(v.r));
          }
        }
        continue;
      }
      // 4. a seção de perguntas
      if (cabecaPerguntas) {
        emPerguntas = true;
        const dentro = (cabecaPerguntas[1] || '').trim();
        perguntasMarcadas = !dentro || MARCA_PERGUNTA.test(dentro);
        const q = negrito(dentro.replace(MARCA_PERGUNTA, '').trim());
        if (q) perguntas.push(q);
        continue;
      }
      // 5. para guardar (a citação de um versículo vira o cartão, e a frase para guardar fica com a referência)
      if (guardar) {
        const t = guardar[1].trim();
        const v = versiculoDaLinha(t, capitulos);
        if (v && v.troca) {
          const escrito = escritoDe(v.r);
          cartao(v, i, escrito + '\nPara guardar: ' + escrito);
          por({ t: 'guardar', texto: escrito }, i);
          ultimoCartao = null;
        } else {
          const n = por({ t: 'guardar', texto: negrito(inteiraEmNegrito(t) ? tirarNegritoDeFora(t) : t) }, i);
          if (v && v.aviso) avisar(n, escritoDe(v.r));
        }
        continue;
      }
      // 6. frase de alguém (ou versículo, quando quem disse é uma referência)
      if (frase) {
        const f = fraseDaLinha(frase[1], capitulos);
        if (f.versiculo) cartao(f.versiculo, i);
        else if (f.texto) {
          const n = por({ t: 'citacao', texto: f.texto, autor: f.autor || '' }, i);
          if (f.aviso) avisar(n, '');
        }
        continue;
      }
      // 7. lista com seta (linhas seguidas formam uma lista só, de até PARES_MAX linhas)
      if (seta) {
        const { pares, resto } = setaLida;
        let contou = false;
        for (const [item, sentido] of pares) {
          if (lista && lista.itens.length >= PARES_MAX) {
            fecharLista();
            avisos.push({ tipo: 'lista-longa', bloco: blocos.length });
          }
          if (!lista) { lista = { t: 'seta', itens: [], destaque: false, linhas: 0, emNegrito: 0, negritos: [] }; por(lista, i); contou = false; }
          if (!contou) { lista.linhas++; if (negritoNaSeta) lista.emNegrito++; contou = true; }
          lista.itens.push([negrito(item), negrito(sentido)]);
          lista.negritos.push(negritoNaSeta);
          lista.l[1] = i;
        }
        if (resto) { fecharLista(); textoDe(resto, i); }
        continue;
      }
      // 8. versículo
      const v = versiculoDaLinha(linha, capitulos);
      if (v) {
        cartao(v, i);
        if (v.antes) {
          const n = textoDe(linha, i);
          if (v.aviso) avisar(n, escritoDe(v.r));
          ultimoCartao = null;
        }
        continue;
      }
      // 9. texto. A linha que começa por uma referência de capítulo que não existe ("Efésios 7:1")
      // é erro de digitação: a prévia avisa, em vez de deixar o cartão sumir calado.
      const n = textoDe(linha, i);
      const solta = semAsteriscos(linha).replace(LEIAM, '');
      const errada = capitulos ? CC.refsNoTexto(solta)[0] : null;
      if (errada && errada.inicio === 0 && (!errada.inteiro || errada.fim === solta.length) && !(errada.cap <= (capitulos[errada.livro] || 0))) {
        avisos.push({ tipo: 'sem-versiculo', bloco: n, ref: escritoDe(errada) });
      } else if (citacao && citacao.de) avisar(n, '');
    }
    fecharLista();
    if (sobrando.length) avisos.push({ tipo: 'perguntas-demais', perguntas: sobrando });

    // A sigla de uma tradução entre parênteses no meio de um texto entrega a citação que ficou.
    blocos.forEach((b, n) => {
      if (/^(?:texto|topico|guardar|citacao)$/.test(b.t) && SIGLA_NO_TEXTO.test(b.texto + ' (' + (b.autor || '') + ')')) avisar(n, '');
    });

    // Uma referência com versículo no meio de um texto, que ainda não é cartão e que o líder não
    // recusou, vira sugestão de cartão. Capítulo inteiro no meio do texto não vira.
    const sugestoes = [];
    const sugeridas = new Set();
    blocos.forEach((b, n) => {
      if (b.t !== 'texto') return;
      for (const r of CC.refsNoTexto(semAsteriscos(b.texto), capitulos)) {
        if (!r.maiuscula || r.inteiro) continue;
        const ref = escritoDe(r);
        if (chavesDeCartao.has(ref) || semCartao.has(ref) || sugeridas.has(ref)) continue;
        sugeridas.add(ref);
        sugestoes.push({ bloco: n, ref });
      }
    });

    return { titulo, linhaTitulo, blocos, refs, perguntas, fonte: saida.filter((l) => l !== null).join('\n'), trocas, sugestoes, avisos };
  };
})(window.CC);
