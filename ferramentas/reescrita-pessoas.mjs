// Pessoas: as notas da seção reescritas para jovens. O que muda é o texto das seções;
// as ligações do fim da nota continuam as do arquivo original, com o título "Pra ir além".
import { semAcento, esc, blocosHtml, textoPlano, acertarLinks } from './texto-app.mjs';
import { PESSOAS_A } from './pessoas-a.mjs';
import { PESSOAS_B } from './pessoas-b.mjs';
import { PESSOAS_C } from './pessoas-c.mjs';

const PASTA = '11 - Pessoas/';
export const PESSOAS = { ...PESSOAS_A, ...PESSOAS_B, ...PESSOAS_C };

export function aplicarPessoas(dados) {
  const faltando = [];
  let trocadas = 0;
  for (const [nome, p] of Object.entries(PESSOAS)) {
    const id = PASTA + nome;
    const n = dados.notas[id];
    if (!n) { faltando.push(id); continue; }
    const fim = n.html.match(/<h2>(?:Conexões|Pra ir além)<\/h2>\s*(<p>[\s\S]*?<\/p>)/);
    const partes = [
      '<h1>' + esc(n.nome) + '</h1>',
      '<h2>Quem foi</h2>', blocosHtml(p.quem),
      '<h2>Onde ler</h2>', blocosHtml(p.onde),
      '<h2>' + esc(p.tituloDeus || 'O que aprendemos sobre Deus') + '</h2>', blocosHtml(p.deus),
    ];
    if (p.erros) partes.push('<h2>O que a Bíblia não esconde</h2>', blocosHtml(p.erros));
    if (fim) partes.push('<h2>Pra ir além</h2>', fim[1]);
    n.html = partes.join('\n');
    n.sub = p.sub;
    n.resumo = p.resumo;
    n.t = semAcento(n.nome + ' ' + textoPlano(n.html));
    for (const alvo of acertarLinks(dados, id)) faltando.push(id + ' -> ' + alvo);
    trocadas++;
  }
  const semReescrita = Object.keys(dados.notas)
    .filter((id) => id.startsWith(PASTA) && id !== PASTA + '11 - Pessoas' && !PESSOAS[id.slice(PASTA.length)]);
  return { trocadas, faltando, semReescrita };
}
