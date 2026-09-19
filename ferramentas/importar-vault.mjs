// Importa o conteúdo do vault Obsidian UMA VEZ e congela em conteudo/conteudo.json.
// Depois disto o aplicativo não depende mais do Obsidian: o build lê o JSON.
// Uso: node ferramentas/importar-vault.mjs [caminho-do-vault]
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerVault, lerPlano, LIVROS_CANONICOS } from './vault.mjs';
import { renderizar, textoSimples } from './markdown.mjs';
import { aplicarAjustes } from './ajustes-conteudo.mjs';
import { montarCartao } from './cartao.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const VAULT = process.argv[2] || 'C:\\Users\\Admin\\Documents\\Caminho com Cristo';

const SECOES = [
  ['01 - Trilha do Recém-Batizado', 'Primeiros passos', 'Doze lições para o primeiro ano, na ordem'],
  ['05 - Hermenêutica', 'Como ler a Bíblia', 'Método, contexto e cuidado com o texto'],
  ['15 - Fios Bíblicos', 'Conexões', 'Imagens e promessas que reaparecem ao longo da Bíblia'],
  ['03 - Livros da Bíblia', 'Livros', 'Ficha de cada um dos 66 livros'],
  ['08 - Versículos', 'Versículos', 'Notas curtas, ligadas entre si no tempo'],
  ['06 - Estudos Temáticos', 'Temas', 'Um assunto seguido do Antigo ao Novo Testamento'],
  ['11 - Pessoas', 'Pessoas', 'Quem é quem, e o que cada história revela sobre Deus'],
  ['12 - Eventos', 'Eventos', 'A cronologia encadeada, de Criação a Consumação'],
  ['13 - Lugares', 'Lugares', 'Geografia que muda a leitura'],
  ['14 - Alianças', 'Alianças', 'Sob qual aliança um texto foi dito, e a quem'],
  ['00 - Início', 'Sobre', 'O panorama e o guia de uso'],
  ['02 - Plano de Leitura', 'O plano', 'A Bíblia inteira em 365 dias'],
  ['04 - Diário de Leitura', 'Diário', 'O registro do dia a dia'],
  ['07 - Reflexões', 'Reflexões', 'Notas pessoais'],
  ['09 - Oração', 'Oração', 'Pedidos, respostas, gratidão'],
  ['10 - Igreja', 'Igreja', 'Sermões e estudos em grupo'],
  ['98 - Templates', 'Modelos', 'Roteiros de anotação'],
];

const ORDEM_FILTRO = ['Antigo', 'Novo', 'Marco', 'Episódio', 'Primórdios', 'Patriarcas', 'Êxodo',
  'Conquista', 'Juízes', 'Monarquia', 'Exílio', 'Pós-exílio', 'Evangelhos', 'Igreja primitiva'];

// O frontmatter do vault foi escrito sem acento em alguns tipos, e esse texto vai
// para a tela. Corrigir aqui, na importação, evita espalhar remendo pelo aplicativo.
const ACENTOS = {
  Hermeneutica: 'Hermenêutica',
  Indice: 'Índice',
  Versiculo: 'Versículo',
  Biblia: 'Bíblia',
  Aliancas: 'Alianças',
  Conexao: 'Conexão',
  Tematico: 'Temático',
};
const acentuar = (texto) => String(texto || '').replace(
  /\b(Hermeneutica|Indice|Versiculo|Biblia|Aliancas|Conexao|Tematico)\b/g,
  (m) => ACENTOS[m]);

const semAcento = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

console.log('lendo vault:', VAULT);
const { notas, resolver } = lerVault(VAULT);
console.log('  notas:', notas.length);

const saida = {};
const backlinks = new Map();

for (const nota of notas) {
  const links = new Set();
  const resolverLink = (alvo) => {
    const destino = resolver(alvo, nota.pasta);
    if (destino && destino !== nota.id) links.add(destino);
    return destino;
  };
  const html = renderizar(nota.corpo, resolverLink);
  for (const destino of links) {
    if (!backlinks.has(destino)) backlinks.set(destino, new Set());
    backlinks.get(destino).add(nota.id);
  }
  const cartao = montarCartao(nota);
  saida[nota.id] = {
    nome: nota.nome, pasta: nota.pasta, tipo: nota.dados.tipo || '',
    sub: acentuar(cartao.sub), resumo: cartao.resumo, destaque: cartao.destaque, alerta: cartao.alerta,
    chips: cartao.chips, filtro: cartao.filtro, _ordem: cartao.ordem, html,
    t: semAcento(nota.nome + ' ' + textoSimples(nota.corpo)),
    links: [...links],
  };

  // O texto do versículo é a primeira citação do corpo (o bloco "> ..." do vault).
  // Guardá-lo pronto poupa o quiz de parsear HTML no cliente.
  if (nota.pasta === '08 - Versículos') {
    const citacao = /^>\s*(.+)$/m.exec(nota.corpo);
    if (citacao) saida[nota.id].texto = citacao[1].trim();
  }
}

for (const [id, origens] of backlinks) if (saida[id]) saida[id].backlinks = [...origens];
for (const id of Object.keys(saida)) saida[id].backlinks ??= [];

const totalLinks = Object.values(saida).reduce((s, n) => s + n.links.length, 0);

const secoes = SECOES.map(([pasta, rotulo, descricao]) => {
  const todos = Object.keys(saida).filter((id) => saida[id].pasta === pasta);
  const ehIndice = (id) => {
    const n = saida[id].nome;
    return n === pasta || n.startsWith('00 - ') || saida[id].tipo === 'indice';
  };
  const indice = todos.find(ehIndice) || null;
  const ids = todos.filter((id) => !ehIndice(id));
  ids.sort((a, b) => {
    const oa = saida[a]._ordem, ob = saida[b]._ordem;
    if (oa && ob) { for (let i = 0; i < oa.length; i++) if (oa[i] !== ob[i]) return oa[i] - ob[i]; return 0; }
    if (oa) return -1;
    if (ob) return 1;
    return saida[a].nome.localeCompare(saida[b].nome, 'pt-BR');
  });
  const filtros = [];
  for (const id of ids) { const f = saida[id].filtro; if (f && !filtros.includes(f)) filtros.push(f); }
  filtros.sort((a, b) => {
    const ia = ORDEM_FILTRO.indexOf(a), ib = ORDEM_FILTRO.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return { pasta, rotulo, descricao, ids, indice, filtros: filtros.length > 1 ? filtros : [] };
}).filter((s) => s.ids.length || s.indice);

for (const id of Object.keys(saida)) delete saida[id]._ordem;

const plano = lerPlano(notas);
console.log('  dias no plano:', plano.length);

const idDoLivro = (livro) =>
  (saida['03 - Livros da Bíblia/' + livro] ? '03 - Livros da Bíblia/' + livro : null);

function relacionadosDoDia(dia) {
  const livrosIds = dia.livros.map(idDoLivro).filter(Boolean);
  const conjunto = new Set(livrosIds);
  const balde = { versiculos: [], conexoes: [], pessoas: [], eventos: [], lugares: [], temas: [] };
  for (const [id, nota] of Object.entries(saida)) {
    if (nota.pasta === '08 - Versículos') {
      const ref = /^(.+?)\s+(\d+)\./.exec(nota.nome);
      if (ref) {
        const cap = Number(ref[2]);
        const dentro = (dia.trechos || []).some((x) => x.livro === ref[1] && cap >= x.de && cap <= x.ate);
        if (dentro) balde.versiculos.push({ id, forca: 100 });
      }
      continue;
    }
    const forca = nota.links.filter((l) => conjunto.has(l)).length;
    if (!forca) continue;
    const item = { id, forca };
    if (nota.pasta === '15 - Fios Bíblicos') balde.conexoes.push(item);
    else if (nota.pasta === '11 - Pessoas') balde.pessoas.push(item);
    else if (nota.pasta === '12 - Eventos') balde.eventos.push(item);
    else if (nota.pasta === '13 - Lugares') balde.lugares.push(item);
    else if (nota.pasta === '06 - Estudos Temáticos') balde.temas.push(item);
  }
  for (const k of Object.keys(balde)) {
    balde[k] = balde[k].sort((a, b) => b.forca - a.forca).slice(0, 8).map((x) => x.id);
  }
  return { livros: livrosIds, ...balde };
}

const planoFinal = plano.map((d) => ({ ...d, rel: relacionadosDoDia(d) }));

// ---------- unidades: o agrupamento que a trilha desenha na tela ----------
// Uma unidade por mês do plano. O título vem dos livros que ela de fato percorre,
// porque "Mês 7" não diz nada a quem abre o aplicativo.
const POR_MES = new Map();
for (const d of planoFinal) {
  if (!POR_MES.has(d.mes)) POR_MES.set(d.mes, []);
  POR_MES.get(d.mes).push(d);
}
const CORES = ['verde', 'azul', 'roxo', 'vermelho', 'amarelo', 'turquesa'];
const unidades = [...POR_MES.keys()].sort((a, b) => a - b).map((mes, i) => {
  const dias = POR_MES.get(mes);
  const livros = [];
  for (const d of dias) for (const l of d.livros) if (!livros.includes(l)) livros.push(l);
  const ordenados = livros.slice().sort(
    (a, b) => LIVROS_CANONICOS.indexOf(a) - LIVROS_CANONICOS.indexOf(b));
  // O plano lê as duas trilhas em paralelo, então "Gênesis a Mateus" mentiria: o mês não
  // percorre tudo o que há entre os dois. O título mostra cada trilha no seu intervalo.
  const trecho = (lista) => (!lista.length ? ''
    : lista.length === 1 ? lista[0] : lista[0] + '–' + lista[lista.length - 1]);
  const antigo = trecho(ordenados.filter((l) => LIVROS_CANONICOS.indexOf(l) < 39));
  const novo = trecho(ordenados.filter((l) => LIVROS_CANONICOS.indexOf(l) >= 39));
  // Versículos da unidade: os que têm texto e pertencem a um dos livros percorridos.
  // São a matéria-prima do quiz de memorização.
  const versiculos = Object.keys(saida)
    .filter((id) => saida[id].pasta === '08 - Versículos' && saida[id].texto)
    .filter((id) => {
      const ref = /^08 - Versículos\/(.+?)\s+\d/.exec(id);
      return ref && ordenados.includes(ref[1]);
    });
  return {
    numero: i + 1,
    mes,
    titulo: [antigo, novo].filter(Boolean).join(' · '),
    antigo,
    novo,
    subtitulo: (livros.length === 1 ? '1 livro' : livros.length + ' livros') + ' · ' + dias.length + ' dias',
    livros: ordenados,
    de: dias[0].numero,
    ate: dias[dias.length - 1].numero,
    cor: CORES[i % CORES.length],
    versiculos,
  };
});

const DADOS = {
  importadoEm: new Date().toISOString().slice(0, 10),
  totalNotas: notas.length,
  totalLinks,
  notas: saida,
  secoes,
  plano: planoFinal,
  unidades,
  licoes: (secoes.find((s) => s.pasta === '01 - Trilha do Recém-Batizado')?.ids || [])
    .filter((id) => !saida[id].nome.startsWith('00 -')),
  home: '00 - Início/Home',
};

// O material do vault foi escrito para um adulto; o aplicativo é para jovens.
const ajustes = aplicarAjustes(DADOS);
console.log('  ajustes para o público:', ajustes.aplicados,
  ajustes.pendentes.length ? '· conferir: ' + ajustes.pendentes.join(', ') : '');

mkdirSync(join(AQUI, 'conteudo'), { recursive: true });
const destino = join(AQUI, 'conteudo', 'conteudo.json');
const json = JSON.stringify(DADOS);
writeFileSync(destino, json, 'utf8');
console.log('  unidades:', unidades.length);
console.log('gerado:', destino, '(' + (Buffer.byteLength(json) / 1048576).toFixed(2) + ' MB)');
