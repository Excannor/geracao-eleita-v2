// Explorar reescrito para jovens: Livros da Bíblia, Temas, Versículos, Eventos, Lugares, Fios,
// Como ler a Bíblia, Alianças e Início. Cada arquivo em ferramentas/explorar/ guarda, por nota,
// o texto novo e a "origem": o resumo do html que foi reescrito. Se a nota mudar no material
// de origem, a origem deixa de bater e a reescrita não é aplicada por cima do conteúdo novo;
// a nota aparece em "desatualizadas" para ser reescrita de novo.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { semAcento, textoPlano } from './texto-app.mjs';
import { semCitacao } from './versiculos-explorar.mjs';

const PASTA = join(dirname(fileURLToPath(import.meta.url)), 'explorar');
const resumoDe = (html) => createHash('sha1').update(html).digest('hex').slice(0, 16);

export function aplicarExplorar(dados) {
  let trocadas = 0;
  const desatualizadas = [];
  const faltando = [];
  if (!existsSync(PASTA)) return { trocadas, desatualizadas, faltando };
  for (const arquivo of readdirSync(PASTA).filter((f) => f.endsWith('.json')).sort()) {
    const grupo = JSON.parse(readFileSync(join(PASTA, arquivo), 'utf8'));
    for (const [id, nova] of Object.entries(grupo)) {
      const n = dados.notas[id];
      if (!n) { faltando.push(id); continue; }
      if (resumoDe(n.html) !== nova.origem) {
        // já aplicada numa rodada anterior: o html atual é o próprio texto novo
        // a citação do versículo é trocada depois pelo texto das Bíblias do app
        // (versiculos-explorar.mjs), então não conta como diferença
        if (semCitacao(n.html) !== semCitacao(nova.html)) desatualizadas.push(id);
        // a busca acompanha o texto que está na nota (correções feitas direto no html)
        n.t = semAcento(n.nome + ' ' + textoPlano(n.html));
        continue;
      }
      n.html = nova.html;
      if (nova.resumo) n.resumo = nova.resumo;
      n.t = semAcento(n.nome + ' ' + textoPlano(n.html));
      trocadas++;
    }
  }
  return { trocadas, desatualizadas, faltando };
}
