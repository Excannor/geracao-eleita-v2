// Mede o contraste dos pares de cor que o aplicativo usa, nos dois temas.
// A régua é a WCAG 2.1: 4.5 para texto comum, 3.0 para texto grande e para
// a borda de um controle. Quem lê a Bíblia no ônibus, com sol na tela, agradece.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(AQUI, 'src', 'estilo.css'), 'utf8');

// lê as variáveis de cada tema direto do arquivo de estilo
function variaveis(seletor) {
  const bloco = css.slice(css.indexOf(seletor));
  const corpo = bloco.slice(bloco.indexOf('{') + 1, bloco.indexOf('}'));
  const mapa = {};
  for (const m of corpo.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g)) mapa['--' + m[1]] = m[2];
  return mapa;
}

const claro = variaveis(':root {');
const escuro = variaveis(':root[data-tema="escuro"]');

const canal = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
function luz(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}
const contraste = (a, b) => {
  const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// par de cor, o mínimo exigido e onde ele aparece
const PARES = [
  ['--tinta', '--fundo', 4.5, 'texto comum sobre o fundo'],
  ['--tinta-forte', '--fundo', 4.5, 'títulos sobre o fundo'],
  ['--tinta-fraca', '--fundo', 4.5, 'texto de apoio sobre o fundo'],
  ['--tinta', '--cartao', 4.5, 'texto dentro do cartão'],
  ['--tinta-fraca', '--cartao', 4.5, 'texto de apoio no cartão'],
  // nó e peça fechados mostram ícone, não texto: WCAG 1.4.11 pede 3:1
  ['--tinta-travada', '--trilho', 3, 'ícone de nó ou peça ainda fechada'],
  ['--tinta-travada', '--fundo', 3, 'estrela vazia sobre o fundo'],
  ['--chama-texto', '--fundo', 4.5, 'número da ofensiva no topo'],
  ['--azul', '--fundo', 4.5, 'link sobre o fundo'],
  ['--azul', '--cartao', 4.5, 'link dentro do cartão'],
  // no tema escuro o próprio CSS troca estes tons pelo tom vivo, então o par
  // medido muda junto: é o que a tela mostra, não o que a variável se chama
  [['--verde-3d', '--verde'], '--verde-fraco', 4.5, 'texto de acerto'],
  [['--vermelho-3d', '--vermelho'], '--vermelho-fraco', 4.5, 'texto de erro'],
  [['--amarelo-3d', '--amarelo'], '--amarelo-fraco', 4.5, 'texto de conquista'],
  ['--chama', '--fundo', 3, 'chama da ofensiva'],
];

// Estes não entram na conta de falhas. A WCAG 1.4.11 pede 3:1 para a parte que
// identifica um controle, e aqui a identificação vem de outro lugar: o cartão tem
// fundo próprio, distinto do fundo da tela, e o nó da trilha tem a aresta escura
// embaixo. A borda e o preenchimento são acabamento. Ficam medidos à vista mesmo
// assim, para ninguém escurecer o fundo sem perceber que apagou o desenho.
const ACABAMENTO = [
  ['--borda', '--fundo', 'borda do cartão contra o fundo'],
  ['--inverso', '--fundo', 'nó concluído contra o fundo'],
  ['--acento', '--fundo', 'nó de hoje contra o fundo'],
];

// A tinta que o tema usa por cima das cores cheias dos botões, faixas e placas. A régua era
// 3:1, a de texto grande, e deixava passar os rótulos pequenos das placas e da faixa da
// unidade. Agora é 4,5:1. A chama não entra: é arte, não fundo de texto.
const SOBRE_COR = ['--verde', '--azul', '--roxo', '--vermelho', '--turquesa'];
// O amarelo leva tinta escura própria (--sobre em .c-amarelo), nos dois temas.
const SOBRE_AMARELO = '#1c1812';
// Cores fixas fora dos tokens, iguais nos dois temas, com texto branco por cima. O
// cabeçalho de Desafios morava aqui com um degradê roxo escrito na mão; virou --inverso
// junto com o resto, então saiu daqui e passou a ser medido pelos tokens.
const FIXOS = [];

let falhas = 0;
for (const [nome, tema] of [['CLARO', claro], ['ESCURO', escuro]]) {
  console.log('\n  tema ' + nome);
  for (const [chaveA, b, minimo, onde] of PARES) {
    const a = Array.isArray(chaveA) ? chaveA[nome === 'ESCURO' ? 1 : 0] : chaveA;
    if (!tema[a] || !tema[b]) { console.log('    ?      ' + a + ' ou ' + b + ' não existe'); continue; }
    const r = contraste(tema[a], tema[b]);
    const passa = r >= minimo;
    if (!passa) falhas++;
    console.log('    ' + (passa ? 'ok  ' : 'BAIXO') + '  ' + r.toFixed(2).padStart(5)
      + ' (mín ' + minimo + ')  ' + onde);
  }
  for (const [a, b, onde] of ACABAMENTO) {
    if (!tema[a] || !tema[b]) continue;
    console.log('    –     ' + contraste(tema[a], tema[b]).toFixed(2).padStart(5)
      + ' (acabamento)  ' + onde);
  }
  for (const c of SOBRE_COR) {
    if (!tema[c]) continue;
    const r = contraste(tema['--sobre-cor'] || '#ffffff', tema[c]);
    const passa = r >= 4.5;
    if (!passa) falhas++;
    console.log('    ' + (passa ? 'ok  ' : 'BAIXO') + '  ' + r.toFixed(2).padStart(5)
      + ' (mín 4.5)  tinta sobre ' + c.replace('--', ''));
  }
  {
    const r = contraste(SOBRE_AMARELO, tema['--amarelo']);
    if (r < 4.5) falhas++;
    console.log('    ' + (r >= 4.5 ? 'ok  ' : 'BAIXO') + '  ' + r.toFixed(2).padStart(5) + ' (mín 4.5)  tinta escura sobre amarelo');
  }
  for (const [cor, onde] of FIXOS) {
    const r = contraste('#ffffff', cor);
    if (r < 4.5) falhas++;
    console.log('    ' + (r >= 4.5 ? 'ok  ' : 'BAIXO') + '  ' + r.toFixed(2).padStart(5) + ' (mín 4.5)  branco no ' + onde);
  }
}

console.log(falhas ? '\n  ' + falhas + ' par(es) abaixo do mínimo\n'
  : '\n  todos os pares passam na régua\n');
process.exit(falhas ? 1 : 0);
