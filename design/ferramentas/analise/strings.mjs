// Frente "texto", parte 1: extrai os textos literais (com letras, 2 ou mais palavras) dos
// fontes do app (src/app/*.js, entrar.html, privacidade.html, termos.html, index.html) para
// revisão de escrita: concordância, acento, um nome só por coisa, tom. Uma linha por texto,
// "arquivo:linha<TAB>texto", sem repetir. Comentários de linha (//) ficam de fora.
//
// Uso:  node design/ferramentas/analise/strings.mjs > <pasta>/strings.txt
// A saída é a entrada de textos-tela.mjs (que separa o que só nasce em tempo de execução).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './cdp.mjs';

const SRC = join(RAIZ, 'src');
const arquivos = readdirSync(join(SRC, 'app')).filter((f) => f.endsWith('.js')).sort().map((f) => join('app', f))
  .concat(['entrar.html', 'privacidade.html', 'termos.html', 'index.html']);
const vistos = new Set();
for (const a of arquivos) {
  const src = readFileSync(join(SRC, a), 'utf8');
  src.split('\n').forEach((l, i) => {
    if (/^\s*\/\//.test(l)) return;
    const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
    let m;
    while ((m = re.exec(l))) {
      let t = m[1] ?? m[2] ?? m[3];
      t = t.replace(/<[^>]+>/g, ' ').replace(/\$\{[^}]*\}/g, '§').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (!/[a-záéíóúâêôãõç]/i.test(t)) continue;
      if (t.split(' ').filter((w) => /[a-záéíóúâêôãõçA-Z]/.test(w)).length < 2) continue;
      if (/^[\w\-.# >:,\[\]=()]+$/.test(t) && !/ [a-z]{3,} [a-z]{3,}/.test(t)) continue; // seletores CSS
      if (vistos.has(t)) continue;
      vistos.add(t);
      console.log(a.replace(/^app[\\/]/, '') + ':' + (i + 1) + '\t' + t);
    }
  });
}
