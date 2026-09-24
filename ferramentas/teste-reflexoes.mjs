// Confere as reflexões do dia: formato, perguntas, estilo e se a referência do versículo existe
// de verdade no texto bíblico que o app traz.
// Uso: node ferramentas/teste-reflexoes.mjs [unidade]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aplicarReflexoes } from './reflexoes.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const dados = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'conteudo.json'), 'utf8'));
const biblia = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'nbv.json'), 'utf8'));

const so = process.argv[2] ? Number(process.argv[2]) : 0;
const unidadeDoDia = (n) => (dados.unidades.find((u) => n >= u.de && n <= u.ate) || {}).numero || 0;

let falhas = 0;
const falhar = (dia, msg) => { console.log('  FALHA  dia ' + dia + ': ' + msg); falhas++; };

const ROTULOS = ['Sobre Deus', 'Sobre nós', 'Para hoje'];
const PROIBIDOS = [
  [/[—–]/, 'travessão'],
  [/\bnão (é|são|foi|era) apenas\b/i, '"não é apenas"'],
  [/\bnão apenas\b/i, '"não apenas... mas"'],
  [/\bem suma\b|\bem última análise\b/i, '"em suma"'],
  [/\bvale (ressaltar|destacar)\b/i, '"vale ressaltar"'],
  [/\bé (importante|fundamental|crucial) (notar|destacar|lembrar)\b/i, '"é importante notar"'],
  [/\bjornada\b|\bmergulh(ar|e)\b|\bdesvend(ar|a)\b|\bno cerne\b|\btapeçaria\b/i, 'palavra típica de texto de IA'],
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'emoji'],
];

// Palavras da regra 2 do filtro. \b não enxerga letra acentuada, então a fronteira é feita
// com \p{L}.
const palavra = (raiz) => new RegExp('(?<!\\p{L})' + raiz + '(?!\\p{L})', 'iu');
const SENSIVEIS = [
  ['graça', 'graça'], ['just[oa]s?', 'justo'], ['justiça', 'justiça'], ['sant[oa]s?', 'santo'],
  ['carne', 'carne'], ['mundo', 'mundo'], ['leis?', 'lei'], ['temor', 'temor'], ['fé', 'fé'],
  ['glória', 'glória'], ['bênçãos?', 'bênção'], ['salvação|salv[oa]s?', 'salvação'], ['sangue', 'sangue'],
  ['aliança', 'aliança'], ['espírito', 'espírito'], ['coração', 'coração'], ['promessas?', 'promessa'],
  ['perdão', 'perdão'], ['sacrifícios?', 'sacrifício'], ['ofertas?', 'oferta'], ['servos?', 'servo'],
].map(([raiz, nome]) => [palavra(raiz), nome]);
const revisar = [];
const conferir = [];

// A NBV é a tradução que o app abre por padrão: é o texto que o leitor tem na frente.
const normalizar = (s) => String(s).normalize('NFC').toLowerCase()
  .replace(/[“”"'‘’«».,;:!?()[\]…—–-]/g, ' ').replace(/\s+/g, ' ').trim();
const CARTAS_DE_PAULO = /^(Romanos|[12] Coríntios|Gálatas|Efésios|Filipenses|Colossenses|[12] Tessalonicenses|[12] Timóteo|Tito|Filemom)$/;
const CIDADE_DA_CARTA = { Romanos: 'Roma', 'Coríntios': 'Corinto', 'Gálatas': 'Galácia', 'Efésios': 'Éfeso',
  Filipenses: 'Filipos', Colossenses: 'Colossos', Tessalonicenses: 'Tessalônica' };
const LIVRO_E_CAPITULO = new RegExp('(?<!\\p{L})(' + Object.keys(biblia.livros).map((l) => l.toLowerCase()).join('|') + ') \\d+', 'gu');
const leituraNbv = (plano) => plano.trechos.map((t) => {
  const caps = biblia.livros[t.livro] || [];
  return caps.slice(t.de - 1, t.ate).map((c) => c.join(' ')).join(' ');
}).join(' ');
// Expressões conferidas como redação de outra tradução (ARA/ACF), já usadas por engano.
const OUTRA_TRADUCAO = ['proverá', 'achou graça', 'cana rachada', 'mecha que fumega', 'casa da escravidão',
  'casa da servidão', 'creditado como justiça', 'imputado como justiça', 'aquietai', 'esconde de novo', 'escondeu de novo', 'pesado de boca', 'pesado de língua', 'estarei com a tua boca', 'fazer três tendas', 'três tendas', 'lento para se irar', 'lento para se irritar', 'tardio em irar', 'convosco todos os dias', 'com vocês todos os dias', 'atire a primeira pedra', 'nada me faltará', 'nada me faltara', 'sombra da morte', 'verdes pastos', 'refrigera a minha alma', 'águas tranquilas', 'por que me desamparaste', 'céus proclamam a glória', 'este é o dia que o senhor fez', 'o fruto do espírito é', 'tudo posso naquele', 'tudo posso em cristo', 'as misericórdias do senhor', 'renovam-se cada manhã', 'não por força nem por violência', 'o justo viverá pela fé', 'ainda que a figueira não floresça', 'rasgai o vosso coração', 'prisioneiros da esperança'].map(normalizar);
// Palavras com maiúscula que não são nome de alguém da leitura (nomes de Deus, termos gerais).
// Os nomes dos livros também passam: citar "Êxodo" ou "Marcos" é falar da própria leitura.
const NOMES_LIVRES = new Set(['Deus', 'Senhor', 'Jesus', 'Cristo', 'Pai', 'Filho', 'Espírito', 'Santo', 'Bíblia',
  'Escritura', 'Escrituras', 'Reino', 'Lei', 'Palavra', 'Altíssimo', 'Soberano', 'Messias', 'Mestre', 'Salvador', 'Criador', 'Salmo', 'Pregador', 'Antigo', 'Novo', 'Testamento',
  ...Object.keys(biblia.livros).flatMap((l) => l.split(' ')).filter((p) => /^\p{Lu}/u.test(p))]);
// Todas as palavras que a NBV escreve em minúscula em algum lugar: servem para separar palavra
// comum de nome próprio no começo da frase.
const MINUSCULAS_DA_NBV = new Set();
for (const caps of Object.values(biblia.livros)) for (const cap of caps) for (const v of cap) {
  for (const p of String(v).match(/\p{Ll}[\p{L}-]*/gu) || []) MINUSCULAS_DA_NBV.add(p);
}
// Palavras comuns que abrem frase de reflexão e podem não estar na leitura.
const PALAVRAS_DE_INICIO = new Set(['Como', 'Quando', 'Que', 'Qual', 'Quem', 'Onde', 'Tem', 'Você', 'Em', 'No', 'Na',
  'Nos', 'Nas', 'Depois', 'Antes', 'Mesmo', 'Mas', 'Só', 'Repare', 'Até', 'Ali', 'Aqui', 'Então', 'Hoje', 'Por',
  'Para', 'Se', 'Ele', 'Ela', 'Eles', 'Elas', 'Isso', 'Esse', 'Essa', 'Este', 'Esta', 'Foi', 'Era', 'Existe',
  'Deus', 'Nada', 'Ninguém', 'Tudo', 'Todo', 'Toda', 'Dois', 'Duas', 'Três', 'Cinco', 'Dez', 'Doze', 'Poucos',
  'Logo', 'Agora', 'Sem', 'Com', 'Uma', 'Um', 'Os', 'As', 'O', 'A', 'Às', 'Ao', 'Aos', 'Do', 'Da', 'De', 'E', 'Ou']);
const ABSOLUTA =/(?<!\p{L})(o primeiro|a primeira|os primeiros|o único|a única|os únicos|a Bíblia inteira|toda a Bíblia|nunca mais|em toda a história|mais que qualquer)(?!\p{L})/giu;
const NUMERO =/(?<!\p{L})(\d+|três|quatro|cinco|seis|sete|oito|nove|dez|doze|catorze|quinze|vinte|trinta|quarenta|cinquenta|cem|cento|mil)(?!\p{L})/gu;

// O versículo existe? A referência é conferida contra o texto que o app traz.
function versiculoExiste(ref) {
  const m = /^(.+?)\s(\d+)\.(\d+)(?:-(\d+))?$/.exec(String(ref || ''));
  if (!m) return 'referência fora do formato "Livro 1.2" ou "Livro 1.2-3"';
  const [, livro, capTxt, deTxt, ateTxt] = m;
  const caps = biblia.livros[livro];
  if (!caps) return 'livro "' + livro + '" não existe na Bíblia do app';
  const cap = caps[Number(capTxt) - 1];
  if (!cap) return livro + ' não tem capítulo ' + capTxt;
  // O capítulo é uma lista começando em zero, então o versículo 1 mora na posição 0.
  for (let v = Number(deTxt); v <= Number(ateTxt || deTxt); v++) {
    if (!cap[v - 1]) return livro + ' ' + capTxt + ' não tem o versículo ' + v;
  }
  return '';
}

aplicarReflexoes(dados);
const reflexoes = dados.reflexoes || {};
const dias = Object.keys(reflexoes).map(Number).sort((a, b) => a - b)
  .filter((n) => !so || unidadeDoDia(n) === so);

console.log('\n  Reflexões do dia' + (so ? ' · unidade ' + so : '') + '\n');

for (const dia of dias) {
  const plano = dados.plano[dia - 1];
  for (const r of reflexoes[dia]) {
    if (!r.titulo) falhar(dia, 'falta o título');
    if (!r.texto || r.texto.split(/[.!?]\s/).length < 3) falhar(dia, 'o texto precisa de ao menos três frases');
    // Formato novo: 2 ou 3 perguntas, só o texto, sem rótulo. O antigo (três pares com
    // rótulo fixo) ainda é aceito nas unidades que não foram revistas.
    const novo = Array.isArray(r.perguntas) && r.perguntas.every((p) => typeof p === 'string');
    if (!Array.isArray(r.perguntas)) falhar(dia, 'faltam as perguntas');
    else if (novo) {
      if (r.perguntas.length < 2 || r.perguntas.length > 3) falhar(dia, 'precisa de 2 ou 3 perguntas, tem ' + r.perguntas.length);
      r.perguntas.forEach((per, i) => {
        if (!per.trim().endsWith('?')) falhar(dia, 'a pergunta ' + (i + 1) + ' não termina com interrogação');
      });
    } else if (r.perguntas.length !== 3) falhar(dia, 'precisa de três perguntas');
    else r.perguntas.forEach(([rot, per], i) => {
      if (rot !== ROTULOS[i]) falhar(dia, 'o rótulo ' + (i + 1) + ' devia ser "' + ROTULOS[i] + '" e é "' + rot + '"');
      if (!per || !per.trim().endsWith('?')) falhar(dia, 'a pergunta "' + rot + '" não termina com interrogação');
    });
    if (!Array.isArray(r.oracao) || r.oracao.length !== 3) falhar(dia, 'precisa de três começos de oração');
    else for (const o of r.oracao) if (!/…$|\.\.\.$/.test(o.trim())) falhar(dia, 'o começo de oração "' + o.slice(0, 30) + '" devia terminar em reticências');

    const erro = versiculoExiste(r.ref);
    // O cartão de "versículo para guardar" mostra no máximo três versículos (teste.mjs).
    const faixa = /\.(\d+)-(\d+)$/.exec(r.ref || '');
    if (faixa && Number(faixa[2]) - Number(faixa[1]) > 2) falhar(dia, r.ref + ' tem mais de três versículos para guardar');
    if (erro) falhar(dia, erro);
    else {
      // Não basta ser do mesmo livro: o capítulo tem de estar entre os lidos naquele dia,
      // senão a reflexão fala de um trecho que a pessoa não leu.
      const [, livro, capTxt] = /^(.+?)\s(\d+)\./.exec(r.ref);
      const cap = Number(capTxt);
      const dentro = plano.trechos.some((t) => t.livro === livro && cap >= t.de && cap <= t.ate);
      if (!dentro) {
        falhar(dia, r.ref + ' não está na leitura do dia ('
          + plano.trechos.map((t) => t.livro + ' ' + t.de + (t.ate > t.de ? '-' + t.ate : '')).join(' · ') + ')');
      }
    }

    // Regra 1 do filtro, feita por máquina porque de memória a redação sai de outra tradução
    // sem ninguém perceber ("Deus proverá", "achou graça"). Toda citação entre aspas tem de
    // existir, palavra por palavra, na NBV da leitura do dia; expressão típica de outra
    // tradução só passa se estiver nela.
    const lidoCru = leituraNbv(plano);
    const lido = normalizar(lidoCru);
    const escrito = [r.texto, ...r.perguntas.map((p) => (typeof p === 'string' ? p : p[1]))].join(' ');
    for (const m of escrito.matchAll(/["“]([^"”]+)["”]/g)) {
      const citado = normalizar(m[1]);
      if (citado.length >= 12 && !lido.includes(citado)) falhar(dia, 'citação que não está na NBV da leitura do dia: "' + m[1] + '"');
    }
    // Regra 4 do filtro: Deus está sempre presente. Pergunta que pede para a pessoa apontar onde
    // Deus não está ensina o contrário (dia 16: "em que lugar ruim você acha que Deus não está?").
    for (const p of r.perguntas.map((p) => (typeof p === 'string' ? p : p[1]))) {
      if (/(ach\w*|sent\w*|pens\w*) que (Deus|o Senhor|Jesus|ele) não (está|estava|esteve)/i.test(p) && !/e ele estava/i.test(p))
        falhar(dia, 'pergunta supõe um lugar sem Deus: "' + p + '"');
    }
    for (const expr of OUTRA_TRADUCAO) {
      if (normalizar(escrito).includes(expr) && !lido.includes(expr)) falhar(dia, 'redação de outra tradução, a NBV da leitura não diz "' + expr + '"');
    }
    // Nome próprio que a leitura do dia não tem vai para conferência: a NBV escreve "Hagar", e a
    // reflexão dizia "Agar". Palavra com maiúscula no meio da frase que não aparece no texto
    // lido é nome de outra tradução, de outro dia ou erro de digitação.
    const frases = escrito.split(/(?<=[.!?:"])\s+/);
    for (const f of frases) {
      const frase = f.replace(/^["“(]+/, '');
      for (const m of frase.matchAll(/(?<!\p{L})(\p{Lu}[\p{Ll}]+)(?!\p{L})/gu)) {
        const nome = m[1];
        // Palavra inteira: "Dina" não pode passar só porque a leitura tem "Dinabá" (a NBV escreve "Diná").
        if (NOMES_LIVRES.has(nome) || new RegExp('(?<!\\p{L})' + nome + '(?!\\p{L})', 'u').test(lidoCru)) continue;
        // No começo da frase, a maiúscula é da frase: palavra que a NBV usa em minúscula em algum
        // lugar é palavra comum ("Sai", "Dorme"), não nome. "Agar" nunca aparece em minúscula.
        if (m.index === 0 && (PALAVRAS_DE_INICIO.has(nome) || MINUSCULAS_DA_NBV.has(nome.toLowerCase()))) continue;
        // O autor da carta é nome certo mesmo quando o capítulo do dia não o escreve (Romanos 2).
        if (nome === 'Paulo' && plano.livros.some((l) => CARTAS_DE_PAULO.test(l))) continue;
        // A cidade para onde a carta foi mandada também: "Corinto" num dia de 1 Coríntios.
        if (plano.livros.some((l) => CIDADE_DA_CARTA[l.replace(/^[12] /, '')] === nome)) continue;
        conferir.push('dia ' + dia + ' · nome "' + nome + '" não aparece na leitura');
      }
    }
    // Afirmação absoluta vai para conferência: "o primeiro castigo da Bíblia" (Gn 3 vem antes)
    // e "a única pessoa na Bíblia inteira que..." já saíram errados.
    for (const m of escrito.matchAll(ABSOLUTA)) conferir.push('dia ' + dia + ' · afirmação absoluta: "' + m[0] + '"');

    // Número citado que a leitura não tem vai para conferência: "quarenta anos" (Atos 7),
    // "quatro palavras" (eram seis) e "mais de vinte anos" (conta nossa) já saíram errados.
    const semCapitulo = normalizar(escrito).replace(/\b(capítulos?|versículos?|dia|salmos?) \d+(?: (?:e|a) \d+)?/g, ' ')
      // "Isaías 12", "Cânticos 3": nome do livro com o capítulo, não é contagem.
      .replace(LIVRO_E_CAPITULO, ' ')
      // "1 Samuel", "2 Reis": o número faz parte do nome do livro, não é contagem.
      .replace(/(?<!\p{L})[123] (samuel|reis|crônicas|coríntios|tessalonicenses|timóteo|pedro|joão)(?!\p{L})/gu, ' ');
    for (const n of new Set(semCapitulo.match(NUMERO) || [])) {
      if (!lido.match(new RegExp('(?<!\\p{L})' + n + '(?!\\p{L})', 'u'))) conferir.push('dia ' + dia + ' · "' + n + '" não aparece na leitura');
    }

    // Regra 2 do filtro (ferramentas/reflexoes/CLAUDE.md): palavra de sentido bíblico próprio
    // numa pergunta vai para revisão humana, e com mais cuidado se também está no texto,
    // onde pode estar em outro sentido (o caso real: "achou graça" no texto e "de graça"
    // na pergunta). Não reprova: só avisa, porque só lendo dá para saber o sentido.
    for (const per of r.perguntas.map((p) => (typeof p === 'string' ? p : p[1]))) {
      for (const [re, nome] of SENSIVEIS) {
        if (!re.test(per)) continue;
        revisar.push('dia ' + dia + ' · ' + nome + (re.test(r.texto) ? ' (também no texto)' : '') + ' · ' + per);
      }
    }

    const tudo = [r.titulo, r.texto, ...r.perguntas.map((p) => (typeof p === 'string' ? p : p[1])), ...(r.oracao || [])].join(' ');
    for (const [re, nome] of PROIBIDOS) if (re.test(tudo)) falhar(dia, 'proibido: ' + nome);
  }
}

const porUnidade = {};
for (const n of Object.keys(reflexoes).map(Number)) {
  const u = unidadeDoDia(n);
  porUnidade[u] = (porUnidade[u] || 0) + 1;
}
console.log('  escritas: ' + Object.keys(reflexoes).length + ' de ' + dados.plano.length + ' dias');
for (const u of dados.unidades) {
  const tem = porUnidade[u.numero] || 0;
  const total = u.ate - u.de + 1;
  if (tem) console.log('    unidade ' + String(u.numero).padStart(2) + ': ' + tem + ' de ' + total + (tem === total ? ' · completa' : ''));
}
if (conferir.length) {
  console.log('\n  conferir número (' + conferir.length + '): citado na reflexão e ausente da leitura do dia');
  for (const linha of conferir) console.log('    ' + linha);
}
if (revisar.length) {
  console.log('\n  revisar sentido (' + revisar.length + '): palavra de sentido bíblico numa pergunta');
  for (const linha of revisar) console.log('    ' + linha);
}
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  as reflexões estão no formato\n');
process.exit(falhas ? 1 : 0);
