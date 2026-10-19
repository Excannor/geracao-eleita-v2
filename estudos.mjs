// O estudo da célula (À Mesa, docs/a-mesa-fase1.md): os tetos, a conferência do que o leitor de
// marcas devolveu e o formato que a tela recebe. Quem grava (só o líder) e onde (a tabela
// celula_estudos) mora em contas.mjs, em salvarEstudo. O leitor de marcas é o mesmo do aparelho
// (src/sob-demanda/estudo-marcas.js): o servidor o carrega no contexto das regras do app e relê a
// fonte por conta própria, sem confiar no que o aparelho mandou já dividido.
//
// O texto bíblico nunca passa por aqui: o estudo guarda só as referências dos cartões, e as
// palavras vêm da Bíblia do app na hora de desenhar.
//
// Fase 2 (docs/a-mesa-fase2.md, seção 2): o combinado para a semana, quem lê qual estudo (a célula,
// quem entrou depois, o visitante, a filha de uma multiplicação), o estudo ligado a cada encontro
// e a data que a lista de estudos anteriores mostra. Tudo aqui é regra pura, sem banco e sem
// relógio: contas.mjs monta a entrada (com o dia de cada instante no fuso do líder, diaDe) e chama.

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
// O combinado para a semana: uma atitude simples, numa linha só.
export const COMBINADO_MAX = 200;
// "Na semana passada combinamos" só aparece quando o estudo de antes foi usado (ou deixou de ser o
// atual) até 10 dias antes de hoje: depois de uma semana sem encontro, "semana passada" seria falso.
export const JANELA_COMBINADO = 10;
// A lista de estudos anteriores vem em páginas: o histórico nunca entra inteiro no retrato.
export const ESTUDOS_POR_PAGINA = 20;
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
  combinado: 'o combinado tem no máximo 200 caracteres',
  // o combinado não tem prévia: a citação de outra tradução que o leitor não consegue trocar pela
  // referência (as aspas no meio da frase, com a sigla) é recusada, em vez de ficar guardada
  combinadoCitacao: 'no combinado, escreva só a referência do versículo (como Efésios 6.10), sem o texto',
  estudoDoRegistro: 'escolha um estudo desta célula preparado até o dia do encontro',
  soMembros: 'quem está conhecendo a célula vê só o estudo atual',
  naoAberto: 'esse estudo não está aberto para você',
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

// O combinado para a semana. Sem o campo (undefined ou null), null: quem chama decide se mantém o
// que estava. Senão, uma linha só, com os espaços juntos, até 200 caracteres. O leitor de citações
// roda depois, em contas.mjs (salvarEstudo), e o teto é conferido de novo.
export function limparCombinado(texto) {
  if (texto === undefined || texto === null) return null;
  const limpo = String(texto).replace(/\s+/g, ' ').trim();
  if (tamanho(limpo) > COMBINADO_MAX) throw erro(MENSAGENS.combinado);
  return limpo;
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

// O estudo atual já foi usado num encontro? Mudar um estudo usado é preparar o do próximo encontro:
// nasce uma linha nova, e o usado fica para o histórico. Mudar um que ainda não foi usado corrige
// ele mesmo. Usado quando:
//   - um encontro registrado (que não seja "não houve encontro") está ligado a ele (estudo === id),
//     sem olhar a hora do registro;
//   - um encontro sem estudo ligado (estudo === '', os de antes da v20) foi registrado depois que o
//     estudo nasceu, com a data entre o dia em que ele nasceu e hoje (a regra da Fase 1);
//   - desde o dia em que ele nasceu, já passou um dia da semana do encontro (sem contar hoje: o
//     estudo de hoje ainda é o do encontro de hoje).
// Um encontro ligado a outro estudo, ou a um de fora do app ('-'), não conta para este, mesmo
// registrado depois: registrar na segunda o encontro de quinta com o estudo antigo não marca o novo.
//   id: o do estudo; criadoEm: o ISO de quando ele nasceu; nasceu e hoje: 'AAAA-MM-DD' no fuso do
//   líder; encontro: o dia da semana (0 a 6, ou -1); encontros: os registrados ({ data, em,
//   semEncontro, estudo }).
// Sem data que se leia, conta como usado: na dúvida, o estudo antigo fica guardado.
export function estudoUsado({ id = '', criadoEm, nasceu, hoje, encontro = -1, encontros = [] }) {
  if (!nasceu || !hoje || !/^\d{4}-\d{2}-\d{2}$/.test(nasceu)) return true;
  for (const x of encontros || []) {
    if (!x || x.semEncontro) continue;
    const ligado = x.estudo || '';
    if (ligado) {
      if (id && ligado === id) return true;
      continue;
    }
    if (x.em && x.em > criadoEm && x.data >= nasceu && x.data <= hoje) return true;
  }
  if (!Number.isInteger(encontro) || encontro < 0) return false;
  const dia = (iso) => Math.floor(Date.parse(iso + 'T12:00:00Z') / 86400000);
  const de = dia(nasceu);
  const ate = dia(hoje);
  for (let d = de; d < ate && d < de + 7; d++) if (new Date(d * 86400000 + 43200000).getUTCDay() === encontro) return true;
  return false;
}

const ehDia = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
// Dias inteiros de a até b ('AAAA-MM-DD'); negativo quando b vem antes.
const diasEntre = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
// O mais novo primeiro, por criado_em e, no empate, pelo id (a mesma ordem do banco).
const maisNovo = (a, b) => a.criadoEm > b.criadoEm || (a.criadoEm === b.criadoEm && a.id > b.id);

// O estudo que valia no fim de um dia: o mais novo que já tinha nascido naquele dia e que ainda era
// o atual quando o dia acabou. O preparado no dia do encontro é o daquele encontro (o anterior,
// trocado nesse dia, já não vale). Serve à escolha já marcada no registro de presença e ao registro
// de um app antigo, que não manda o estudo.
//   estudos: [{ id, criadoEm, atualAte }] da célula; data: 'AAAA-MM-DD'; diaDe(iso): o dia local
//   daquele instante, no fuso do líder. Devolve o id, ou '' (nenhum estudo valia).
export function estudoDoDia(estudos, data, diaDe) {
  if (!ehDia(data)) return '';
  let melhor = null;
  for (const e of estudos || []) {
    if (!e || !e.id || !e.criadoEm) continue;
    const nasceu = diaDe(e.criadoEm);
    if (!ehDia(nasceu) || nasceu > data) continue;
    if (e.atualAte && !(diaDe(e.atualAte) > data)) continue;
    if (!melhor || maisNovo(e, melhor)) melhor = e;
  }
  return melhor ? melhor.id : '';
}

// A data que a lista de estudos anteriores mostra: a do encontro mais recente em que o estudo foi
// usado ("Encontro de 15/10") ou, sem encontro ligado, a do dia em que foi preparado ("Preparado em
// 12/10"). Os registros de antes da v20 não têm a ligação, e inventar a data seria pior.
export function dataNoHistorico(e, encontros, diaDe) {
  let data = '';
  for (const x of encontros || []) if (x && e && !x.semEncontro && x.estudo === e.id && ehDia(x.data) && x.data > data) data = x.data;
  if (data) return { data, dataDe: 'encontro' };
  return { data: e && e.criadoEm ? diaDe(e.criadoEm) || '' : '', dataDe: 'preparo' };
}

// Os encontros em que o estudo foi usado, do mais novo para o mais velho, com quantas pessoas
// vieram (as que têm conta e as que não têm). Só quem conduz recebe isto, ao abrir um estudo
// anterior: nunca na lista, onde uma coluna de números semana a semana viraria placar.
export function encontrosDoEstudo(e, encontros) {
  if (!e) return [];
  return (encontros || [])
    .filter((x) => x && !x.semEncontro && x.estudo === e.id && ehDia(x.data))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
    .map((x) => ({ data: x.data, pessoas: (x.presentes || []).length + (Number(x.visitantes) || 0) }));
}

// "Na semana passada combinamos: ... Como foi?" O combinado do estudo que veio logo antes do atual,
// quando ele foi usado num encontro até janela dias antes de hoje. Ninguém marca se cumpriu: é só a
// lembrança para abrir a conversa.
// Sem encontro ligado (os registros de antes da v20), vale o dia em que ele deixou de ser o atual
// (o seguinte foi preparado perto do encontro), mas só quando ele conta como usado (estudoUsado,
// até esse dia) e nenhum encontro desde que nasceu foi ligado a outro estudo ou a um de fora do app
// ('-'). Sem isso, um combinado que a célula nunca viveu (o estudo corrigido e trocado antes de
// qualquer encontro, ou a semana feita com outro estudo) abriria a acolhida como se tivesse sido.
//   anterior: o estudo da célula logo antes do atual (por criado_em), ou null; encontros: os da
//   célula; encontro: o dia da semana do encontro (0 a 6, ou -1); hoje: 'AAAA-MM-DD'.
//   Devolve { texto, data, estudo } ou null.
export function combinadoDoAnterior({ anterior, encontros = [], encontro = -1, hoje, diaDe, janela = JANELA_COMBINADO }) {
  if (!anterior || !anterior.combinado || !ehDia(hoje)) return null;
  const ligado = dataNoHistorico(anterior, encontros, diaDe);
  let data = ligado.dataDe === 'encontro' ? ligado.data : '';
  if (!data && anterior.atualAte) {
    const nasceu = diaDe(anterior.criadoEm);
    const saiu = diaDe(anterior.atualAte);
    const deOutro = (encontros || []).some((x) => x && !x.semEncontro && x.estudo && x.estudo !== anterior.id
      && ehDia(x.data) && x.data >= nasceu && x.data <= saiu);
    const usado = estudoUsado({ id: anterior.id, criadoEm: anterior.criadoEm, nasceu, hoje: saiu, encontro, encontros });
    if (usado && !deOutro) data = saiu;
  }
  if (!ehDia(data) || data > hoje || diasEntre(data, hoje) > janela) return null;
  return { texto: anterior.combinado, data, estudo: anterior.id };
}

// O corte da filha de uma multiplicação nos estudos da mãe: o que a mãe preparou e escreveu até a
// multiplicação, o atual daquele momento incluído. Com o instante da multiplicação (corteEm, ISO,
// desde a v21), o estudo precisa ter nascido e sido mudado pela última vez até ele: um estudo que a
// mãe muda depois, mesmo sem uso e na mesma linha, já tem o texto de outro grupo. Sem o instante
// (a filha de antes da v21), vale o dia (corte), no fuso do líder da mãe, para o nascimento e para a
// última mudança.
export function daMaeAteOCorte(e, { corte = '', corteEm = '', diaDe = (iso) => String(iso || '').slice(0, 10) } = {}) {
  if (!e || !e.criadoEm || !ehDia(corte)) return false;
  if (corteEm) return e.criadoEm <= corteEm && (!e.editadoEm || e.editadoEm <= corteEm);
  const nasceu = diaDe(e.criadoEm);
  const mudado = e.editadoEm ? diaDe(e.editadoEm) : '';
  return ehDia(nasceu) && nasceu <= corte && (!mudado || mudado <= corte);
}

// Os encontros da mãe que a filha enxerga num estudo dela: os de até a multiplicação. Os do próprio
// dia contam só quando foram registrados até o instante da multiplicação (sem o instante, contam).
export function encontrosAteOCorte(encontros, { corte = '', corteEm = '' } = {}) {
  if (!ehDia(corte)) return [];
  return (encontros || []).filter((x) => x && ehDia(x.data) && (x.data < corte || (x.data === corte && (!corteEm || !x.em || x.em <= corteEm))));
}

// Quem pode abrir um estudo, e o que vê nele (docs/a-mesa-fase2.md, seção 3.1).
//   e: o estudo (estudoDaLinha); p: a célula por onde a pessoa chega; ativo: ela é membro ativo de
//   p (visitante inclusive); papel: o papel dela em p ('', 'auxiliar' ou 'visitante'); conduz: é
//   quem conduz p (podeConduzir); lidera: é o líder de p que prepara o estudo (celulaDeQuemPrepara);
//   corte e corteEm: o dia e o instante da multiplicação de p, quando p nasceu de outra célula
//   (daMaeAteOCorte); noDono: { entrouEm, saiuEm } da pessoa na célula do estudo (p, ou a mãe),
//   ou null quando ela nunca esteve lá; diaDe(iso): o dia local de um instante, no fuso do líder
//   da célula do estudo.
// Devolve { ler, codigo (0, 403 ou 404), atual, daMae, presenca, usarComoBase }:
//   - quem não é membro ativo (convidado, quem saiu, de fora, o administrador): 404, que vale igual
//     para "não existe" e "não é seu" (um id de estudo não confirma que a célula existe);
//   - o estudo atual de p: todos, o visitante inclusive;
//   - um anterior de p: os membros, quem entrou depois inclusive; o visitante recebe 403;
//   - um estudo da célula mãe preparado e escrito até a multiplicação: os membros da filha, só para
//     leitura (sem presença e sem "Usar como base", nem para o líder da filha); o visitante, 403;
//     o que a mãe preparou ou mudou depois é de outro grupo: 404. Um nível só: a neta não lê a avó.
//   - um estudo guardado antes do histórico existir (antesDoHistorico, marcado na v21: os da Fase 1
//     e os de antes da v19), quando já não é o atual: só quem estava na célula dele enquanto ele era
//     o atual, porque ninguém mais o via quando ele foi escrito (privacidade, seção 15); os outros
//     recebem 404, como se ele não existisse;
//   - presenca (quantas pessoas vieram): quem conduz p, e só nos estudos de p;
//   - usarComoBase (que cria um estudo novo): só o líder, só num anterior de p.
export function acessoAoEstudo(e, p, { papel = '', ativo = false, conduz = false, lidera = false, corte = '', corteEm = '', noDono = null, diaDe = (iso) => String(iso || '').slice(0, 10) } = {}) {
  const nao = (codigo) => ({ ler: false, codigo, atual: false, daMae: false, presenca: false, usarComoBase: false });
  if (!e || !p || !ativo) return nao(404);
  const visitante = papel === 'visitante';
  // quem estava na célula do estudo enquanto ele era o atual (até fim, 'AAAA-MM-DD' ou '')
  const viu = (fim) => {
    const entrou = noDono && noDono.entrouEm;
    const saiu = noDono && noDono.saiuEm;
    const nasceu = diaDe(e.criadoEm);
    return ehDia(entrou) && (!fim || entrou <= fim) && !(ehDia(saiu) && ehDia(nasceu) && saiu < nasceu);
  };
  if (e.proposito === p.id) {
    const atual = !!p.estudoId && e.id === p.estudoId;
    if (!atual && visitante) return nao(403);
    if (!atual && e.antesDoHistorico && !viu(e.atualAte ? diaDe(e.atualAte) : '')) return nao(404);
    return { ler: true, codigo: 0, atual, daMae: false, presenca: !!conduz, usarComoBase: !!lidera && !atual };
  }
  if (p.mae && e.proposito === p.mae && daMaeAteOCorte(e, { corte, corteEm, diaDe })) {
    if (visitante) return nao(403);
    if (e.antesDoHistorico) {
      const saiu = e.atualAte ? diaDe(e.atualAte) : '';
      if (!viu(saiu && saiu < corte ? saiu : corte)) return nao(404);
    }
    return { ler: true, codigo: 0, atual: false, daMae: true, presenca: false, usarComoBase: false };
  }
  return nao(404);
}

// Quem não veio a um encontro, para a mensagem pronta que quem conduz decide se manda (o app não
// avisa ninguém sozinho). A mesma regra de "Precisam de atenção" (propositos.mjs,
// quemPrecisaDeAtencao): os membros ativos, menos os visitantes (visitante não é cobrado), menos
// quem conduz a célula (o líder e o auxiliar, quemConduz), menos quem registrou, menos quem entrou
// na célula no dia do encontro ou depois e menos os presentes. "Não houve encontro" não tem falta de
// ninguém.
//   membros: p.membros; quemConduz: os @ de quem conduz; data: 'AAAA-MM-DD'. Devolve os @, na
//   ordem dos membros.
export function quemFaltou({ membros = [], presentes = [], registradoPor = '', quemConduz = [], data = '', semEncontro = false }) {
  if (semEncontro) return [];
  const fora = new Set([...(presentes || []), ...(quemConduz || []), registradoPor]);
  return (membros || [])
    .filter((m) => m && m.estado === 'ativo' && m.papel !== 'visitante' && !fora.has(m.usuario)
      && !(m.entrouEm && m.entrouEm >= data))
    .map((m) => m.usuario);
}

// O cursor da lista de estudos anteriores: '<criado_em>|<id>' do último item da página anterior.
export const cursorDe = (e) => (e ? e.criadoEm + '|' + e.id : '');
export function lerCursor(texto) {
  const t = String(texto || '');
  if (!t || t.length > 120) return null;
  const i = t.lastIndexOf('|');
  if (i <= 0) return null;
  return { criadoEm: t.slice(0, i), id: t.slice(i + 1) };
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
    combinado: l.combinado || '',
    // guardado antes de o histórico existir (v21): fica para quem o via enquanto era o atual
    antesDoHistorico: !!Number(l.antes_do_historico),
  };
  if (e.tipo === 'trecho' && e.ref) {
    if (!e.titulo) e.titulo = e.ref;
    if (!e.refs.length) e.refs = [e.ref];
  }
  return e;
}

// O estudo como a tela recebe, em GET /api/propositos, em GET /api/estudos e na resposta de quem
// salvou. Vai para todos da célula, visitantes inclusive. A fonte do estudo escrito só vai para
// quem prepara: é ela que volta ao campo em "Mudar o estudo" e em "Usar como base", e quem só lê
// recebe as partes já divididas. Em semana, trecho e no escrito de antes da v19 (livre), a fonte é
// a palavra do líder e vai como "texto". O combinado vai sempre ('' quando não tem).
// nomeDe(@, criadoEm) dá o nome de exibição de quem preparou (ou o @, se a conta não existe mais,
// ou se a conta com esse @ nasceu depois do estudo). comFonte (o padrão é souQuemPrepara): a
// leitura de um estudo anterior pelo líder, que leva a fonte para "Usar como base" sem o "usado".
export function estudoNoRetrato(e, { souQuemPrepara = false, comFonte = souQuemPrepara, nomeDe = (u) => '@' + u, usado = false } = {}) {
  if (!e) return null;
  const saida = {
    id: e.id, tipo: e.tipo, titulo: e.titulo, ref: e.ref, planoAte: e.planoAte,
    blocos: e.blocos, refs: e.refs, perguntas: e.perguntas, traducao: e.traducao, combinado: e.combinado || '',
    criadoPor: e.criadoPor, criadoPorNome: e.criadoPor ? nomeDe(e.criadoPor, e.criadoEm) : '',
    em: e.criadoEm, editadoEm: e.editadoEm,
  };
  if (e.tipo !== 'blocos') saida.texto = e.fonte;
  else if (comFonte) saida.fonte = e.fonte;
  // só quem prepara precisa saber se o estudo já foi usado: a tela dele troca "Mudar o estudo"
  // por "Preparar o próximo"
  if (souQuemPrepara) saida.usado = !!usado;
  return saida;
}

// O título como a lista mostra: na leitura da semana vai vazio (a tela escreve "A leitura da
// semana", R.titulo); no trecho, a referência.
const tituloDaLista = (e) => (e.tipo === 'semana' ? '' : e.tipo === 'trecho' ? e.titulo || e.ref || '' : e.titulo || '');

// Uma linha da lista de estudos anteriores: só o que a linha mostra. Nada de blocos, fonte,
// perguntas, combinado ou presença (a leitura de um estudo traz o resto, pela própria rota).
export function itemDoHistorico(e, { data = '', dataDe = 'preparo', nomeDe = (u) => '@' + u } = {}) {
  return {
    id: e.id, tipo: e.tipo, titulo: tituloDaLista(e), refs: e.refs, data, dataDe,
    criadoPor: e.criadoPor, criadoPorNome: e.criadoPor ? nomeDe(e.criadoPor, e.criadoEm) : '',
  };
}

// O estudo em poucas palavras, para a mensagem a quem faltou (a resposta do registro e o último
// encontro de "Precisam de atenção"): o tipo, o título como a lista mostra e as referências.
export function resumoDoEstudo(e) {
  return e ? { id: e.id, tipo: e.tipo, titulo: tituloDaLista(e), refs: e.refs } : null;
}

// O estudo como a folha de registro de presença precisa dele: o que mostrar na escolha e o dia em
// que foi preparado (a folha esconde o estudo preparado depois da data escolhida).
export function estudoDoRegistro(e, diaDe) {
  if (!e) return null;
  return { id: e.id, tipo: e.tipo, titulo: tituloDaLista(e), refs: e.refs, em: e.criadoEm, dia: e.criadoEm ? diaDe(e.criadoEm) || '' : '' };
}
