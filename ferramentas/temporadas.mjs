// As temporadas do plano (fase R3): o ano em 36 trechos de 7 a 16 dias, 3 em cada unidade.
// São só uma camada de nomes por cima de plano[]: um intervalo de/ate, como as unidades.
// Nenhum dia, nenhuma leitura e nenhum texto da Bíblia muda.
//
// O texto mora aqui, e não só em conteudo.json, porque o importador do vault refaz o
// conteudo.json do zero: ele chama aplicarAjustes, que chama aplicarTemporadas, e as
// temporadas voltam iguais. O que sai do plano (o que se lê, a unidade, a cor) é calculado,
// para não divergir do plano se ele mudar.
//
// Tom dos textos (pedido do dono, 15/11/2026): nomes curtos, como um líder de célula diria;
// abertura e chegada numa frase só, factual e calma, dizendo o que se lê e onde a pessoa está
// na história. Sem exagero, sem travessão, sem "jornada", sem exclamação.
//
// Uso:
//   node ferramentas/temporadas.mjs              grava temporadas[] em conteudo/conteudo.json
//   node ferramentas/temporadas.mjs --tabela X   escreve a tabela em Markdown no arquivo X
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEXTOS = [
  // ---------- unidade 1 ----------
  { de: 1, ate: 10, titulo: 'Gênesis 1 a 25',
    abertura: 'Nesta temporada você lê de Gênesis 1 a 25, da criação à história de Abraão, e Mateus 1 a 7.',
    chegada: 'Você terminou Gênesis 1 a 25. A próxima temporada segue com Jacó e José.',
    selo: 'Luz da criação', simbolo: 'um raio de luz sobre uma linha de horizonte (Gn 1.3)' },
  { de: 11, ate: 20, titulo: 'Jacó e José',
    abertura: 'Nesta temporada você lê o fim de Gênesis, com a história de Jacó e de José, e Mateus 8 a 14.',
    chegada: 'Você terminou Gênesis. A próxima temporada segue com Moisés e a saída do Egito.',
    selo: 'Copo de prata', simbolo: 'o copo de prata no saco de trigo (Gn 44)' },
  { de: 21, ate: 31, titulo: 'A saída do Egito',
    abertura: 'Nesta temporada você lê Êxodo 2 a 29, do nascimento de Moisés à lei no monte Sinai, e Mateus 15 a 22.',
    chegada: 'Você terminou Êxodo 2 a 29 e a unidade 1. A próxima temporada segue com o tabernáculo e o fim de Mateus.',
    selo: 'Sarça', simbolo: 'um arbusto com uma chama que não o queima (Êx 3)' },
  // ---------- unidade 2 ----------
  { de: 32, ate: 39, titulo: 'O tabernáculo',
    abertura: 'Nesta temporada você lê do fim do Êxodo a Levítico 9, sobre o tabernáculo, e o fim de Mateus, com a morte e a ressurreição de Jesus.',
    chegada: 'Você terminou o Êxodo e o Evangelho de Mateus. A próxima temporada segue com o resto de Levítico.',
    selo: 'Véu rasgado', simbolo: 'uma cortina aberta de cima a baixo (Mt 27.51)' },
  { de: 40, ate: 46, titulo: 'Levítico',
    abertura: 'Nesta temporada você lê Levítico 10 a 27, as leis sobre a vida do povo diante de Deus, e Marcos 1 a 5.',
    chegada: 'Você terminou Levítico. A próxima temporada segue com o povo no deserto, em Números.',
    selo: 'Chifre do jubileu', simbolo: 'um chifre de carneiro usado como trombeta (Lv 25)' },
  { de: 47, ate: 59, titulo: 'O povo no deserto',
    abertura: 'Nesta temporada você lê Números 1 a 33, os anos do povo no deserto, e Marcos 6 a 14.',
    chegada: 'Você terminou Números 1 a 33 e a unidade 2. A próxima temporada segue com Deuteronômio, o último livro de Moisés.',
    selo: 'Cacho de uvas', simbolo: 'o cacho carregado numa vara por dois espias (Nm 13)' },
  // ---------- unidade 3 ----------
  { de: 60, ate: 74, titulo: 'Deuteronômio',
    abertura: 'Nesta temporada você lê o fim de Números e Deuteronômio, a despedida de Moisés, com o fim de Marcos e Lucas 1 a 9.',
    chegada: 'Você terminou Deuteronômio e o Evangelho de Marcos. A próxima temporada segue com Josué e a entrada em Canaã.',
    selo: 'Dois caminhos', simbolo: 'uma encruzilhada com uma seta (Dt 30.19)' },
  { de: 75, ate: 83, titulo: 'Josué',
    abertura: 'Nesta temporada você lê o livro de Josué, a entrada do povo em Canaã, e Lucas 10 a 15.',
    chegada: 'Você terminou Josué. A próxima temporada segue com o tempo dos juízes.',
    selo: 'Monte de Calebe', simbolo: 'um monte com uma bandeira no alto (Js 14)' },
  { de: 84, ate: 90, titulo: 'Os juízes',
    abertura: 'Nesta temporada você lê Juízes 1 a 18, de Débora e Gideão até Sansão, e Lucas 16 a 20.',
    chegada: 'Você terminou Juízes 1 a 18 e a unidade 3. A próxima temporada segue com Rute e o começo de 1 Samuel.',
    selo: 'Favo de mel', simbolo: 'um favo de mel (Jz 14)' },
  // ---------- unidade 4 ----------
  { de: 91, ate: 99, titulo: 'Rute e Samuel',
    abertura: 'Nesta temporada você lê o fim de Juízes, Rute e 1 Samuel 1 a 16, até a escolha de Davi, com o fim de Lucas e João 1 a 3.',
    chegada: 'Você terminou Juízes, Rute e o Evangelho de Lucas. A próxima temporada segue com a história de Davi.',
    selo: 'Pedra de Ebenézer', simbolo: 'uma pedra de pé com uma marca (1Sm 7.12)' },
  { de: 100, ate: 110, titulo: 'A história de Davi',
    abertura: 'Nesta temporada você lê de 1 Samuel 17 a 2 Samuel 13, a vida de Davi desde Golias, e João 4 a 10.',
    chegada: 'Você terminou 1 Samuel e metade de 2 Samuel. A próxima temporada segue com o fim do reinado de Davi e com Salomão.',
    selo: 'Mesa do rei', simbolo: 'uma cadeira puxada diante de uma mesa (2Sm 9)' },
  { de: 111, ate: 120, titulo: 'Salomão',
    abertura: 'Nesta temporada você lê o fim de 2 Samuel e 1 Reis 1 a 14, de Salomão à divisão do reino, e João 11 a 17.',
    chegada: 'Você terminou 2 Samuel e a unidade 4. A próxima temporada segue com os profetas Elias e Eliseu.',
    selo: 'Coração que escuta', simbolo: 'um coração com uma pequena onda de som (1Rs 3.9)' },
  // ---------- unidade 5 ----------
  { de: 121, ate: 133, titulo: 'Elias e Eliseu',
    abertura: 'Nesta temporada você lê o fim de 1 Reis e 2 Reis, de Elias até o exílio na Babilônia, com o fim de João e Atos 1 a 6.',
    chegada: 'Você terminou 1 e 2 Reis e o Evangelho de João. A próxima temporada segue com 1 Crônicas.',
    selo: 'Brisa suave', simbolo: 'três linhas curvas de vento leve (1Rs 19.12)' },
  { de: 134, ate: 144, titulo: '1 Crônicas',
    abertura: 'Nesta temporada você lê 1 Crônicas, das listas de famílias ao reinado de Davi, e Atos 7 a 14.',
    chegada: 'Você terminou 1 Crônicas. A próxima temporada segue com 2 Crônicas e o templo de Salomão.',
    selo: 'Árvore de família', simbolo: 'uma árvore cujos galhos terminam em pontinhos (1Cr 1 a 9)' },
  { de: 145, ate: 151, titulo: 'O templo de Salomão',
    abertura: 'Nesta temporada você lê 2 Crônicas 1 a 17, da construção do templo aos primeiros reis de Judá, e Atos 15 a 19.',
    chegada: 'Você terminou 2 Crônicas 1 a 17 e a unidade 5. A próxima temporada segue com os outros reis de Judá.',
    selo: 'Nuvem no templo', simbolo: 'uma nuvem sobre o telhado de uma casa (2Cr 5.14)' },
  // ---------- unidade 6 ----------
  { de: 152, ate: 158, titulo: 'Os reis de Judá',
    abertura: 'Nesta temporada você lê 2 Crônicas 18 a 35, os reis de Judá até Josias, e Atos 20 a 24.',
    chegada: 'Você terminou 2 Crônicas 18 a 35. A próxima temporada segue com o exílio e a volta para Jerusalém.',
    selo: 'Livro achado no templo', simbolo: 'um rolo aberto (2Cr 34.14)' },
  { de: 159, ate: 171, titulo: 'A volta do exílio',
    abertura: 'Nesta temporada você lê o fim de 2 Crônicas, Esdras, Neemias e Ester, a volta para Jerusalém, com o fim de Atos e Romanos 1 a 5.',
    chegada: 'Você terminou Esdras, Neemias e o livro de Atos. A próxima temporada segue com o fim de Ester e o livro de Jó.',
    selo: 'Colher de pedreiro', simbolo: 'uma colher de pedreiro sobre um muro (Ne 4)' },
  { de: 172, ate: 181, titulo: 'Jó 1 a 25',
    abertura: 'Nesta temporada você lê Jó 1 a 25, as perdas de Jó e a conversa com os amigos, e Romanos 6 a 12.',
    chegada: 'Você terminou Jó 1 a 25 e a unidade 6. A próxima temporada segue com o fim de Jó, quando Deus responde.',
    selo: 'Mãos abertas', simbolo: 'duas mãos abertas para cima (Jó 1.21)' },
  // ---------- unidade 7 ----------
  { de: 182, ate: 188, titulo: 'Jó 26 a 42',
    abertura: 'Nesta temporada você lê Jó 26 a 42, até a resposta de Deus, e o fim de Romanos.',
    chegada: 'Você terminou Jó e a carta aos Romanos. A próxima temporada começa o livro dos Salmos.',
    selo: 'Redemoinho', simbolo: 'um redemoinho de vento (Jó 38.1)' },
  { de: 189, ate: 204, titulo: 'Salmos 1 a 41',
    abertura: 'Nesta temporada você lê Salmos 1 a 41, quase todos atribuídos a Davi, e 1 Coríntios 2 a 12.',
    chegada: 'Você terminou Salmos 1 a 41, o primeiro dos cinco livros dos Salmos. A próxima temporada segue com Salmos 42 a 62.',
    selo: 'Cajado do pastor', simbolo: 'um cajado curvo (Sl 23)' },
  { de: 205, ate: 212, titulo: 'Salmos 42 a 62',
    abertura: 'Nesta temporada você lê Salmos 42 a 62 e o fim de 1 Coríntios, com o capítulo 13, sobre o amor.',
    chegada: 'Você terminou Salmos 42 a 62 e a unidade 7. A próxima temporada segue com Salmos 63 a 90.',
    selo: 'Corça na fonte', simbolo: 'uma corça bebendo água (Sl 42.1)' },
  // ---------- unidade 8 ----------
  { de: 213, ate: 223, titulo: 'Salmos 63 a 90',
    abertura: 'Nesta temporada você lê Salmos 63 a 90, até a oração de Moisés no salmo 90, e 2 Coríntios 3 a 10.',
    chegada: 'Você terminou Salmos 63 a 90. A próxima temporada segue com Salmos 91 a 118.',
    selo: 'Ampulheta', simbolo: 'uma ampulheta com a areia caindo (Sl 90.12)' },
  { de: 224, ate: 234, titulo: 'Salmos 91 a 118',
    abertura: 'Nesta temporada você lê Salmos 91 a 118, o fim de 2 Coríntios e quase toda a carta aos Gálatas.',
    chegada: 'Você terminou Salmos 91 a 118 e 2 Coríntios. A próxima temporada segue com o salmo 119 e os cânticos de subida.',
    selo: 'Rosa dos ventos', simbolo: 'uma rosa dos ventos com leste e oeste marcados (Sl 103.12)' },
  { de: 235, ate: 243, titulo: 'Salmos 119 a 140',
    abertura: 'Nesta temporada você lê Salmos 119 a 140, com os cânticos que o povo cantava a caminho de Jerusalém, e Efésios 1 a 5.',
    chegada: 'Você terminou Salmos 119 a 140 e a unidade 8. A próxima temporada segue com o fim dos Salmos e com Provérbios.',
    selo: 'Lamparina', simbolo: 'uma lamparina de barro diante de um degrau (Sl 119.105)' },
  // ---------- unidade 9 ----------
  { de: 244, ate: 259, titulo: 'Provérbios',
    abertura: 'Nesta temporada você lê o fim dos Salmos e o livro de Provérbios, com Filipenses e Colossenses.',
    chegada: 'Você terminou os Salmos e Provérbios. A próxima temporada segue com Eclesiastes e Cânticos.',
    selo: 'Coração com escudo', simbolo: 'um coração protegido por um pequeno escudo (Pv 4.23)' },
  { de: 260, ate: 266, titulo: 'Eclesiastes e Cânticos',
    abertura: 'Nesta temporada você lê Eclesiastes e quase todo o livro de Cânticos, com 1 e 2 Tessalonicenses.',
    chegada: 'Você terminou Eclesiastes. A próxima temporada termina Cânticos e começa o profeta Isaías.',
    selo: 'Relógio de sol', simbolo: 'um relógio de sol com a sombra marcando uma hora (Ec 3.1)' },
  { de: 267, ate: 273, titulo: 'Isaías 1 a 16',
    abertura: 'Nesta temporada você lê o fim de Cânticos e Isaías 1 a 16, com a visão do trono no capítulo 6, e 1 Timóteo 1 a 4.',
    chegada: 'Você terminou Isaías 1 a 16 e a unidade 9. A próxima temporada segue com Isaías 17 a 39.',
    selo: 'Brasa do altar', simbolo: 'uma brasa segura por uma tenaz (Is 6.6)' },
  // ---------- unidade 10 ----------
  { de: 274, ate: 282, titulo: 'Isaías 17 a 39',
    abertura: 'Nesta temporada você lê Isaías 17 a 39, até o cerco de Jerusalém no tempo do rei Ezequias, e as cartas a Timóteo.',
    chegada: 'Você terminou Isaías 17 a 39 e as cartas a Timóteo. A próxima temporada segue com Isaías 40 a 64.',
    selo: 'Lago calmo', simbolo: 'um lago com uma única linha de água parada (Is 26.3)' },
  { de: 283, ate: 292, titulo: 'Isaías 40 a 64',
    abertura: 'Nesta temporada você lê Isaías 40 a 64, as promessas de consolo para o povo, com Tito, Filemom e Hebreus 1 a 4.',
    chegada: 'Você terminou Isaías 40 a 64. A próxima temporada termina Isaías e começa o profeta Jeremias.',
    selo: 'Asas de águia', simbolo: 'uma águia de asas abertas (Is 40.31)' },
  { de: 293, ate: 304, titulo: 'Jeremias 1 a 29',
    abertura: 'Nesta temporada você lê o fim de Isaías e Jeremias 1 a 29, desde o chamado do profeta, e Hebreus 5 a 13.',
    chegada: 'Você terminou Isaías, a carta aos Hebreus e a unidade 10. A próxima temporada segue com o fim de Jeremias.',
    selo: 'Ramo de amendoeira', simbolo: 'um ramo florido de amendoeira (Jr 1.11)' },
  // ---------- unidade 11 ----------
  { de: 305, ate: 315, titulo: 'Jeremias e Lamentações',
    abertura: 'Nesta temporada você lê Jeremias 30 a 52 e Lamentações, até a queda de Jerusalém, com Tiago e 1 Pedro 1 e 2.',
    chegada: 'Você terminou Jeremias e Lamentações. A próxima temporada começa o profeta Ezequiel.',
    selo: 'Jarro de barro', simbolo: 'um jarro de barro com um rolo dentro (Jr 32.14)' },
  { de: 316, ate: 325, titulo: 'Ezequiel 1 a 25',
    abertura: 'Nesta temporada você lê Ezequiel 1 a 25, as visões do profeta no exílio, com o fim das cartas de Pedro.',
    chegada: 'Você terminou Ezequiel 1 a 25 e as cartas de Pedro. A próxima temporada segue com Ezequiel 26 a 48.',
    selo: 'Torre de vigia', simbolo: 'uma torre estreita com uma janela acesa (Ez 3.17)' },
  { de: 326, ate: 334, titulo: 'Ezequiel 26 a 48',
    abertura: 'Nesta temporada você lê Ezequiel 26 a 48, com os ossos secos e o rio que sai do templo, e o fim das cartas de João e Judas.',
    chegada: 'Você terminou Ezequiel e a unidade 11. A próxima temporada segue com Daniel e Oseias.',
    selo: 'Rio com árvores', simbolo: 'um rio que se alarga com árvores nas margens (Ez 47)' },
  // ---------- unidade 12 ----------
  { de: 335, ate: 344, titulo: 'Daniel e Oseias',
    abertura: 'Nesta temporada você lê Daniel, na corte da Babilônia, e o profeta Oseias, com Apocalipse 1 a 7.',
    chegada: 'Você terminou Daniel e Oseias. A próxima temporada segue com os profetas de Joel a Habacuque.',
    selo: 'Porta no vale', simbolo: 'uma porta aberta no fundo de um vale (Os 2.15)' },
  { de: 345, ate: 356, titulo: 'Joel a Habacuque',
    abertura: 'Nesta temporada você lê os profetas de Joel a Habacuque, entre eles Amós e Jonas, com Apocalipse 8 a 16.',
    chegada: 'Você terminou os profetas de Joel a Habacuque. A última temporada segue com Sofonias e o fim do Apocalipse.',
    selo: 'Fio de prumo', simbolo: 'um fio de prumo ao lado de um muro (Am 7.7-8)' },
  { de: 357, ate: 365, titulo: 'Sofonias a Malaquias',
    abertura: 'Nesta temporada você lê os últimos profetas, de Sofonias a Malaquias, e o fim do Apocalipse.',
    chegada: 'Você terminou a última temporada, com Malaquias e o fim do Apocalipse, e chegou ao dia 365 do plano.',
    selo: 'Sol com asas', simbolo: 'um sol com asas (Ml 4.2)' },
];

// O que o texto do app não pode ter (pedido do dono). Vale também para o teste.
export const PALAVRAS_PROIBIDAS = ['jornada', 'mergulh', 'poderos', 'incrível', 'incrivel',
  'transforma', 'épic', 'epic', 'extraordin', 'impactante', 'não é só', 'não é apenas', 'mais do que nunca'];

// "Gênesis 1 a 25; Êxodo 1": os capítulos de cada livro dentro dos dias, na ordem do plano.
function trechosDe(dias, novoTestamento) {
  const livros = new Map();
  for (const d of dias) {
    const nt = new Set((d.novo ? d.novo.split(';') : []).map((s) => s.trim().replace(/\s+\d.*$/, '')));
    for (const t of d.trechos || []) {
      if (nt.has(t.livro) !== novoTestamento) continue;
      const atual = livros.get(t.livro);
      if (!atual) livros.set(t.livro, { de: t.de, ate: t.ate });
      else { atual.de = Math.min(atual.de, t.de); atual.ate = Math.max(atual.ate, t.ate); }
    }
  }
  return [...livros].map(([livro, { de, ate }]) => livro + ' ' + (de === ate ? de : de + (ate === de + 1 ? ' e ' : ' a ') + ate)).join('; ');
}

export function montarTemporadas(dados) {
  return TEXTOS.map((t, i) => {
    const unidade = dados.unidades.find((u) => u.de <= t.de && t.de <= u.ate);
    const dias = dados.plano.filter((d) => d.numero >= t.de && d.numero <= t.ate);
    const livros = [];
    for (const d of dias) for (const l of d.livros || []) if (!livros.includes(l)) livros.push(l);
    const n = t.ate - t.de + 1;
    return {
      numero: i + 1,
      unidade: unidade ? unidade.numero : 0,
      titulo: t.titulo,
      antigo: trechosDe(dias, false),
      novo: trechosDe(dias, true),
      subtitulo: n + ' dias',
      livros,
      de: t.de,
      ate: t.ate,
      cor: unidade ? unidade.cor : '',
      abertura: t.abertura,
      chegada: t.chegada,
      selo: t.selo,
      simbolo: t.simbolo,
    };
  });
}

// As regras que o teste também confere: devolve a lista de problemas (vazia quando está tudo certo).
export function conferirTemporadas(temporadas, dados) {
  const problemas = [];
  let esperado = 1;
  for (const t of temporadas) {
    const n = t.ate - t.de + 1;
    if (t.de !== esperado) problemas.push('temporada ' + t.numero + ' começa no dia ' + t.de + ', esperado ' + esperado);
    if (n < 7 || n > 21) problemas.push('temporada ' + t.numero + ' tem ' + n + ' dias (de 7 a 21)');
    const u = dados.unidades.find((x) => x.numero === t.unidade);
    if (!u || t.de < u.de || t.ate > u.ate) problemas.push('temporada ' + t.numero + ' cruza a unidade');
    esperado = t.ate + 1;
  }
  if (esperado !== dados.plano.length + 1) problemas.push('as temporadas terminam no dia ' + (esperado - 1));
  return problemas;
}

export function aplicarTemporadas(dados) {
  dados.temporadas = montarTemporadas(dados);
  return { total: dados.temporadas.length, problemas: conferirTemporadas(dados.temporadas, dados) };
}

export function tabelaMarkdown(temporadas) {
  const tam = temporadas.map((t) => t.ate - t.de + 1);
  const linhas = [
    '# Temporadas R3 (texto final)',
    '',
    '*Gerado de `ferramentas/temporadas.mjs` (`node ferramentas/temporadas.mjs --tabela <arquivo>`). ' +
      'É o mesmo texto gravado em `conteudo/conteudo.json`, em `temporadas[]`. O que se lê (AT e NT) ' +
      'sai do próprio plano.*',
    '',
    '## 1. Resumo',
    '',
    '- ' + temporadas.length + ' temporadas, 3 por unidade, cobrindo os dias 1 a 365 sem buraco nem sobreposição.',
    '- Menor: ' + Math.min(...tam) + ' dias. Maior: ' + Math.max(...tam) + ' dias. Média: ' +
      (tam.reduce((a, b) => a + b, 0) / tam.length).toFixed(1).replace('.', ',') + ' dias.',
    '- Nenhuma cruza unidade: a última de cada unidade termina no dia do troféu.',
    '',
    '## 2. Tabela das temporadas',
    '',
    '| nº | Temporada | Dias | Qtd. | Unidade | Antigo Testamento | Novo Testamento | Selo |',
    '|---|---|---|---|---|---|---|---|',
    ...temporadas.map((t) => '| ' + [t.numero, t.titulo, t.de + '-' + t.ate, t.ate - t.de + 1, t.unidade,
      t.antigo, t.novo || '(nenhum)', t.selo].join(' | ') + ' |'),
    '',
    '## 3. Frases de abertura e de chegada',
    '',
  ];
  for (const t of temporadas) {
    linhas.push('**' + t.numero + '. ' + t.titulo + '** (dias ' + t.de + ' a ' + t.ate + ', unidade ' + t.unidade + ')');
    linhas.push('- Abertura: ' + t.abertura);
    linhas.push('- Chegada: ' + t.chegada);
    linhas.push('');
  }
  linhas.push('## 4. Selos', '', '| nº | Temporada | Selo | Símbolo |', '|---|---|---|---|');
  for (const t of temporadas) linhas.push('| ' + [t.numero, t.titulo, t.selo, t.simbolo].join(' | ') + ' |');
  linhas.push('');
  return linhas.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arquivo = join(dirname(fileURLToPath(import.meta.url)), '..', 'conteudo', 'conteudo.json');
  const dados = JSON.parse(readFileSync(arquivo, 'utf8'));
  const { total, problemas } = aplicarTemporadas(dados);
  if (problemas.length) { console.error('problemas:\n' + problemas.join('\n')); process.exit(1); }
  const iTabela = process.argv.indexOf('--tabela');
  if (iTabela > 0) {
    writeFileSync(process.argv[iTabela + 1], tabelaMarkdown(dados.temporadas) + '\n', 'utf8');
    console.log('tabela:', process.argv[iTabela + 1]);
  } else {
    writeFileSync(arquivo, JSON.stringify(dados), 'utf8');
    console.log('temporadas gravadas:', total);
  }
}
