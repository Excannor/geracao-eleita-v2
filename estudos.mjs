// O estudo da célula (À Mesa, docs/a-mesa-fase1.md): os tetos, a conferência do que o leitor de
// marcas devolveu e o formato que a tela recebe. Quem grava (só o líder) e onde (a tabela
// celula_estudos) mora em contas.mjs, em salvarEstudo. O leitor de marcas é o mesmo do aparelho
// (src/sob-demanda/estudo-marcas.js): o servidor o carrega no contexto das regras do app e relê a
// fonte por conta própria, sem confiar no que o aparelho mandou já dividido.
//
// O texto bíblico nunca passa por aqui: o estudo guarda só as referências dos cartões, e as
// palavras vêm da Bíblia do app na hora de desenhar.

// A fonte limpa (sem as citações de outra tradução) tem até 10.000 caracteres: o estudo do dono tem
// uns 2.900. Uma parte de texto é um parágrafo, não um capítulo colado.
export const ESTUDO_MAX = 10000;
// O texto como chegou, com as citações de outra tradução ainda dentro: o leitor de marcas não lê
// mais que isto (o dobro), e um pedido maior volta sem passar por ele.
export const ESTUDO_BRUTO_MAX = 2 * ESTUDO_MAX;
export const TITULO_MAX = 120;
export const TEXTO_BLOCO_MAX = 1500;
export const BLOCOS_MAX = 80;
export const CARTOES_MAX = 15;
export const PARES_MAX = 12;
export const PERGUNTAS_MAX = 6;
export const PERGUNTA_MAX = 300;
// Os estudos guardados de uma célula, o atual incluído: uns quatro anos de um por semana. Além
// disso, sai o mais antigo (o histórico da Fase 2 não cresce sem fim).
export const ESTUDOS_POR_CELULA = 200;
// As siglas de window.BIBLIAS (o teste.mjs confere que batem): o estudo inteiro numa tradução só.
export const TRADUCOES = ['nbv', 'blivre'];
// 'livre' é o estudo escrito de antes da v19: continua sendo lido, mas o que se grava agora é 'blocos'.
export const TIPOS_ESTUDO = ['blocos', 'semana', 'trecho'];

// Na voz do app, minúsculas como as outras mensagens do servidor (a tela põe a maiúscula).
export const MENSAGENS = {
  soLider: 'só o líder da célula prepara o estudo',
  tipo: 'escolha como vai ser o estudo',
  vazio: 'escreva o estudo',
  titulo: 'escreva o título na primeira linha, com até 120 caracteres',
  tamanho: 'o estudo tem no máximo 10.000 caracteres',
  parte: 'cada parte do texto tem no máximo 1.500 caracteres',
  partes: 'o estudo passou de 80 partes. Divida em dois encontros',
  cartoes: 'o estudo tem no máximo 15 versículos',
  lista: 'uma lista com seta tem no máximo 12 linhas',
  seta: 'cada linha com seta precisa de um item antes e de um sentido depois',
  perguntas: 'escolha até 6 perguntas',
  pergunta: 'cada pergunta tem no máximo 300 caracteres',
  traducao: 'escolha a NBV ou a Bíblia Livre',
  trecho: 'escolha um livro e um capítulo, como "Romanos 8" ou "João 3.16-18"',
};
// O cartão de um versículo que a Bíblia do app não tem (a prévia mostra o mesmo aviso).
export const semVersiculo = (ref) => 'não achamos ' + ref + ' na Bíblia do app. Confira a referência';

function erro(mensagem, codigo = 400) {
  const e = new Error(mensagem);
  e.publico = true;
  e.codigo = codigo;
  return e;
}

const tamanho = (s) => String(s || '').length;

// As perguntas escolhidas no passo 3: texto de uma linha só, sem repetir, de 0 a 6, cada uma com até
// 300 caracteres. Sem a lista (cliente antigo), não há o que conferir.
export function limparPerguntas(lista) {
  if (lista === undefined || lista === null) return [];
  if (!Array.isArray(lista)) throw erro(MENSAGENS.perguntas);
  const limpas = [...new Set(lista.map((q) => String(q == null ? '' : q).replace(/\s+/g, ' ').trim()).filter(Boolean))];
  if (limpas.length > PERGUNTAS_MAX) throw erro(MENSAGENS.perguntas);
  if (limpas.some((q) => tamanho(q) > PERGUNTA_MAX)) throw erro(MENSAGENS.pergunta);
  return limpas;
}

// O texto da palavra do líder (semana e trecho) e o do estudo escrito: quebras de linha do
// Windows viram \n, e o começo e o fim perdem os espaços.
export const limparFonte = (texto) => String(texto == null ? '' : texto).replace(/\r\n?/g, '\n').replace(/^\s+|\s+$/g, '');

// Só as chaves de cada tipo de parte, nada do que o leitor usa por dentro (a linha .l da fonte).
const CAMPOS = {
  texto: ['texto'], topico: ['n', 'texto'], conclusao: [], versiculo: ['ref', 'escrito'],
  seta: ['itens', 'destaque'], citacao: ['texto', 'autor'], guardar: ['texto'],
};
function parteLimpa(b) {
  const saida = { t: b.t };
  for (const k of CAMPOS[b.t]) if (b[k] !== undefined && b[k] !== '') saida[k] = b[k];
  if (b.t === 'seta') saida.destaque = !!b.destaque;
  return saida;
}

// Confere o que o leitor de marcas devolveu (r = CC.lerEstudo(fonte, ...)) contra os tetos e a
// Bíblia do app. regras: lerRef (01-nucleo.js), livros (os 66), capitulos ({ livro: quantos }) e,
// quando houver, versiculos(livro, cap) com quantos versículos o capítulo tem na tradução do estudo.
// Devolve { titulo, blocos, refs, fonte, perguntas } pronto para gravar.
export function validarLeitura(r, { lerRef, livros = [], capitulos = null, versiculos = null } = {}) {
  const fonte = String((r && r.fonte) || '');
  if (!fonte.trim()) throw erro(MENSAGENS.vazio);
  // o teto antes de tudo: um texto longo demais numa linha só não pode cair em "escreva o estudo"
  if (tamanho(fonte) > ESTUDO_MAX) throw erro(MENSAGENS.tamanho);
  const titulo = String(r.titulo || '').trim();
  if (!titulo || tamanho(titulo) > TITULO_MAX) throw erro(MENSAGENS.titulo);
  if (!r.blocos || !r.blocos.length) throw erro(MENSAGENS.vazio);
  if (r.blocos.length > BLOCOS_MAX) throw erro(MENSAGENS.partes);
  const blocos = [];
  let cartoes = 0;
  for (const b of r.blocos) {
    if (!b || !CAMPOS[b.t]) throw erro(MENSAGENS.vazio);
    const textos = b.t === 'seta' ? (b.itens || []).map((par) => par.join(' ')) : [b.texto || '', b.autor || ''];
    if (textos.some((t) => tamanho(t) > TEXTO_BLOCO_MAX)) throw erro(MENSAGENS.parte);
    if (b.t === 'seta' && (!Array.isArray(b.itens) || !b.itens.length || b.itens.length > PARES_MAX)) throw erro(MENSAGENS.lista);
    if (b.t === 'seta' && b.itens.some((par) => !Array.isArray(par) || par.length !== 2 || par.some((x) => !String(x || '').replace(/\*/g, '').trim()))) throw erro(MENSAGENS.seta);
    if (b.t === 'versiculo') {
      cartoes++;
      const x = lerRef ? lerRef(b.ref) : null;
      if (!x || !livros.includes(x.livro) || (capitulos && !(x.cap <= (capitulos[x.livro] || 0)))) throw erro(semVersiculo(b.ref));
      if (versiculos && x.de > (Number(versiculos(x.livro, x.cap)) || 0)) throw erro(semVersiculo(b.ref));
    }
    blocos.push(parteLimpa(b));
  }
  if (cartoes > CARTOES_MAX) throw erro(MENSAGENS.cartoes);
  // uma linha que começa pela referência de um capítulo que não existe ("Efésios 7:1") fica como
  // texto no leitor, com o aviso: o servidor recusa como a prévia
  const falta = (r.avisos || []).find((a) => a && a.tipo === 'sem-versiculo');
  if (falta) throw erro(semVersiculo(falta.ref));
  const refs = [...new Set(blocos.filter((b) => b.t === 'versiculo').map((b) => b.ref))];
  // as perguntas da seção "Perguntas" do texto, quando o pedido não traz as escolhidas (o app
  // antigo): os mesmos tetos das escolhidas
  return { titulo, blocos, refs, fonte, perguntas: limparPerguntas((r.perguntas || []).slice(0, PERGUNTAS_MAX)) };
}

// O estudo atual já foi usado num encontro? Sim quando um encontro foi registrado depois que o
// estudo nasceu (e não era "não houve encontro"), ou quando, desde o dia em que ele nasceu, já
// passou um dia da semana do encontro (sem contar hoje: o estudo de hoje ainda é o do encontro de
// hoje). Mudar um estudo usado é preparar o do próximo encontro: nasce uma linha nova, e o usado
// fica para o histórico (Fase 2). Mudar um que ainda não foi usado corrige ele mesmo.
//   criadoEm: o ISO de quando o estudo nasceu; nasceu e hoje: 'AAAA-MM-DD' no fuso do líder;
//   encontro: o dia da semana (0 a 6, ou -1); encontros: os registrados ({ data, em, semEncontro }).
// Sem data que se leia, conta como usado: na dúvida, o estudo antigo fica guardado.
export function estudoUsado({ criadoEm, nasceu, hoje, encontro = -1, encontros = [] }) {
  if (!nasceu || !hoje || !/^\d{4}-\d{2}-\d{2}$/.test(nasceu)) return true;
  if ((encontros || []).some((x) => x && !x.semEncontro && x.em && x.em > criadoEm && x.data >= nasceu && x.data <= hoje)) return true;
  if (!Number.isInteger(encontro) || encontro < 0) return false;
  const dia = (iso) => Math.floor(Date.parse(iso + 'T12:00:00Z') / 86400000);
  const de = dia(nasceu);
  const ate = dia(hoje);
  for (let d = de; d < ate && d < de + 7; d++) if (new Date(d * 86400000 + 43200000).getUTCDay() === encontro) return true;
  return false;
}

// A linha do banco como o servidor trabalha com ela. O trecho de antes da v19 não tinha título nem
// referências gravados: saem da própria referência.
export function estudoDaLinha(l) {
  if (!l) return null;
  const lista = (texto) => { try { const v = JSON.parse(texto || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  const e = {
    id: l.id, proposito: l.proposito, tipo: l.tipo, titulo: l.titulo || '', ref: l.ref || '', planoAte: Number(l.plano_ate) || 0,
    fonte: l.fonte || '', blocos: lista(l.blocos), refs: lista(l.refs), perguntas: lista(l.perguntas),
    traducao: TRADUCOES.includes(l.traducao) ? l.traducao : 'nbv',
    criadoPor: l.criado_por || '', criadoEm: l.criado_em || '', editadoEm: l.editado_em || '', atualAte: l.atual_ate || '',
  };
  if (e.tipo === 'trecho' && e.ref) {
    if (!e.titulo) e.titulo = e.ref;
    if (!e.refs.length) e.refs = [e.ref];
  }
  return e;
}

// O estudo como a tela recebe, em GET /api/propositos e na resposta de quem salvou. Vai para todos
// da célula, visitantes inclusive. A fonte do estudo escrito só vai para quem prepara: é ela que
// volta ao campo em "Mudar o estudo", e quem só lê recebe as partes já divididas. Em semana, trecho
// e no escrito de antes da v19 (livre), a fonte é a palavra do líder e vai como "texto".
// nomeDe(@, criadoEm) dá o nome de exibição de quem preparou (ou o @, se a conta não existe mais,
// ou se a conta com esse @ nasceu depois do estudo).
export function estudoNoRetrato(e, { souQuemPrepara = false, nomeDe = (u) => '@' + u, usado = false } = {}) {
  if (!e) return null;
  const saida = {
    id: e.id, tipo: e.tipo, titulo: e.titulo, ref: e.ref, planoAte: e.planoAte,
    blocos: e.blocos, refs: e.refs, perguntas: e.perguntas, traducao: e.traducao,
    criadoPor: e.criadoPor, criadoPorNome: e.criadoPor ? nomeDe(e.criadoPor, e.criadoEm) : '',
    em: e.criadoEm, editadoEm: e.editadoEm,
  };
  if (e.tipo !== 'blocos') saida.texto = e.fonte;
  else if (souQuemPrepara) saida.fonte = e.fonte;
  // só quem prepara precisa saber se o estudo já foi usado: a tela dele troca "Mudar o estudo"
  // por "Preparar o próximo"
  if (souQuemPrepara) saida.usado = !!usado;
  return saida;
}
