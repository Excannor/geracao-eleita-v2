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
if (revisar.length) {
  console.log('\n  revisar sentido (' + revisar.length + '): palavra de sentido bíblico numa pergunta');
  for (const linha of revisar) console.log('    ' + linha);
}
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  as reflexões estão no formato\n');
process.exit(falhas ? 1 : 0);
