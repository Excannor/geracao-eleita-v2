// Confere o conteúdo do Conhecer Jesus (conteudo/conhecer.json e conteudo/perguntas-honestas.json,
// os mesmos arquivos que o build junta a conteudo.conhecer): cada referência bíblica existe nas
// duas traduções do app, cada citação entre aspas bate com a NBV do versículo citado logo depois,
// e nada de travessão ou tique de IA sobrou no texto. Adaptado de quem revisou este conteúdo
// (o script original ficou em scratchpad/conhecer/conferir.mjs, lendo de fora do app).
// Uso: node ferramentas/teste-conhecer.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const nbv = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'nbv.json'), 'utf8')).livros;
const bl = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'blivre.json'), 'utf8')).livros;
const C = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'conhecer.json'), 'utf8'));
const P = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'perguntas-honestas.json'), 'utf8'));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

console.log('\n  Conteúdo do Conhecer Jesus\n');

const PROIBIDOS = [
  [/[—–]/, 'travessão'], [/\bnão (é|são|foi|era) apenas\b/i, '"não é apenas"'], [/\bnão apenas\b/i, '"não apenas"'],
  [/\bem suma\b/i, '"em suma"'], [/\bvale (ressaltar|destacar)\b/i, '"vale ressaltar"'],
  [/\bjornada\b|\bmergulh(ar|e)\b|\bdesvend(ar|a)\b|\bno cerne\b|\btapeçaria\b/i, 'tique de IA'],
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'emoji'],
];
const norm = (s) => String(s).normalize('NFC').replace(/[“”"]/g, '"').replace(/[‘’]/g, "'").toLowerCase();
// "Gênesis 1.31", "Lucas 5.24-25", "Gênesis 3.12-13", "Gênesis 3" (capítulo inteiro)
const REF = /((?:[123] )?[A-ZÁÉÍÓÚÂÊÔ][a-zà-ú]+(?: [a-zà-ú]+)?) (\d+)(?:\.(\d+)(?:-(\d+))?)?/g;
function versos(livro, cap, de, ate) {
  for (const b of [nbv, bl]) {
    const c = (b[livro] || [])[cap - 1];
    if (!c) return null;
    if (de && (!c[de - 1] || (ate && !c[ate - 1]))) return null;
  }
  const c = nbv[livro][cap - 1];
  const a = de || 1; const z = ate || de || c.length;
  const out = [];
  for (let v = a; v <= z; v++) out.push(c[v - 1]);
  return out.join(' ');
}

// Citações sem referência logo depois (ex.: "E Deus ficou satisfeito" no dia 1) são
// conferidas mais abaixo, contra os trechos do próprio dia.
const semReferenciaLogoDepois = [];
const problemas = [];
function conferirTexto(onde, s) {
  for (const [re, nome] of PROIBIDOS) if (re.test(s)) problemas.push(onde + ': ' + nome + ' em "' + s.slice(0, 80) + '"');
  for (const m of s.matchAll(REF)) {
    const [, livro, cap, de, ate] = m;
    if (!nbv[livro]) continue; // não é livro (ex.: "Messias é o salvador")
    if (versos(livro, +cap, de && +de, ate && +ate) === null) problemas.push(onde + ': referência não existe: ' + m[0]);
  }
  for (const q of s.matchAll(/"([^"]{4,})"/g)) {
    const depois = s.slice(q.index + q[0].length);
    const r = /\(((?:[123] )?[A-ZÁÉÍÓÚÂÊÔ][a-zà-ú]+(?: [a-zà-ú]+)?) (\d+)\.(\d+)(?:-(\d+))?\)/.exec(depois);
    const alvo = r && nbv[r[1]] ? versos(r[1], +r[2], +r[3], r[4] && +r[4]) : null;
    if (!r || !nbv[(r || [])[1]]) { semReferenciaLogoDepois.push({ onde, dia: /^dia (\d+)/.exec(onde), texto: q[1] }); continue; }
    const texto = norm(alvo || '');
    const citacao = norm(q[1]).replace(/[.!?,;:]+$/, '');
    if (!alvo || !texto.includes(citacao)) problemas.push(onde + ': citação não bate com a NBV de ' + r[0] + ': "' + q[1] + '"');
  }
}

C.perguntasFixas.forEach((t, i) => conferirTexto('fixa ' + (i + 1), t));
for (const d of C.dias) {
  for (const t of d.trechos) if (versos(t.livro, t.cap, t.de, t.ate) === null) problemas.push('dia ' + d.numero + ': trecho não existe: ' + JSON.stringify(t));
  for (const k of ['titulo', 'abertura', 'repare', 'pergunta', 'conversa']) conferirTexto('dia ' + d.numero + ' ' + k, d[k]);
  if (!d.conversa.endsWith('…')) problemas.push('dia ' + d.numero + ': a conversa deve terminar em "…"');
}
for (const [k, v] of Object.entries(C.seguir)) {
  if (typeof v === 'string') conferirTexto('seguir ' + k, v);
  else v.forEach((p, i) => { conferirTexto('seguir passo ' + (i + 1), p.titulo); conferirTexto('seguir passo ' + (i + 1), p.texto); });
}
C.acompanhar.itens.forEach((t, i) => conferirTexto('acompanhar ' + (i + 1), t));
for (const p of P) {
  conferirTexto(p.id + ' titulo', p.titulo); conferirTexto(p.id + ' resumo', p.resumo);
  p.paragrafos.forEach((t, i) => conferirTexto(p.id + ' §' + (i + 1), t));
  for (const r of p.leia) conferirTexto(p.id + ' leia', r);
}
// As citações sem referência logo depois: batem com os trechos do próprio dia?
for (const { onde, dia, texto } of semReferenciaLogoDepois) {
  if (!dia) continue; // fora de um dia (ex.: perguntas honestas): já teria uma referência
  const d = C.dias.find((x) => x.numero === +dia[1]);
  const todos = norm(d.trechos.map((t) => versos(t.livro, t.cap, t.de, t.ate)).join(' '));
  if (!todos.includes(norm(texto).replace(/[.!?,;:]+$/, ''))) problemas.push(onde + ': citação "' + texto + '" sem referência e fora do trecho do dia');
}

for (const msg of problemas) console.log('  FALHA  ' + msg);
ok(C.dias.length === 14, 'os 14 dias do Conhecer Jesus estão todos aqui');
ok(P.length === 10, 'as 10 perguntas honestas estão todas aqui');
ok(problemas.length === 0, 'nenhuma referência quebrada, citação fora da NBV, travessão, tique de IA ou emoji'
  + (problemas.length ? ' (' + problemas.length + ')' : ''));

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o conteúdo do Conhecer Jesus confere\n');
process.exit(falhas ? 1 : 0);
