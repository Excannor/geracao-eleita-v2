// Reflexões do dia, escritas sobre a passagem daquele dia. Antes as perguntas e os começos
// de oração vinham do gênero do texto: todo dia de narrativa recebia as mesmas três perguntas,
// e a reflexão soava vazia. Aqui cada dia tem a sua, tirada do que acontece na leitura.
//
// Cada arquivo em ferramentas/reflexoes/ guarda um pedaço do plano, por número de dia:
//
//   { "5": [{ "titulo": "...", "texto": "...",
//             "perguntas": ["...", "..."],
//             "oracao": ["...", "...", "..."] }] }
//
// As perguntas vão sem rótulo e na quantidade que o texto pede (2 ou 3). O molde antigo
// de três vagas fixas, "Sobre Deus / Sobre nós / Para hoje", obrigava uma pergunta sobre
// algum atributo de Deus mesmo quando a passagem não pedia, e daí saíam as genéricas.
//
// A lista por dia existe para a rotatividade que vem depois: mais de uma reflexão por dia,
// mostrando outra a cada volta. Enquanto houver só uma, é ela que aparece sempre.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PASTA = join(dirname(fileURLToPath(import.meta.url)), 'reflexoes');

export function aplicarReflexoes(dados) {
  const reflexoes = {};
  let dias = 0, total = 0;
  const problemas = [];
  if (!existsSync(PASTA)) { dados.reflexoes = reflexoes; return { dias, total, problemas }; }
  for (const arquivo of readdirSync(PASTA).filter((f) => f.endsWith('.json')).sort()) {
    const grupo = JSON.parse(readFileSync(join(PASTA, arquivo), 'utf8'));
    for (const [chave, lista] of Object.entries(grupo)) {
      const numero = Number(chave);
      if (!Number.isInteger(numero) || numero < 1 || numero > dados.plano.length) {
        problemas.push(arquivo + ': dia ' + chave + ' não existe no plano');
        continue;
      }
      if (reflexoes[numero]) { problemas.push('dia ' + numero + ' aparece em mais de um arquivo'); continue; }
      const boas = (Array.isArray(lista) ? lista : [lista]).filter((r) => r && r.texto && Array.isArray(r.perguntas) && r.perguntas.length);
      for (const r of boas) {
        const n = r.perguntas.length;
        if (n < 2 || n > 3) problemas.push('dia ' + numero + ': ' + n + ' pergunta(s), o esperado é 2 ou 3');
      }
      if (!boas.length) { problemas.push('dia ' + numero + ': nenhuma reflexão completa'); continue; }
      reflexoes[numero] = boas;
      dias++;
      total += boas.length;
    }
  }
  dados.reflexoes = reflexoes;
  return { dias, total, problemas };
}
