// Mede o contraste das fichas do redesenho (src/estilo-v2/00-tokens.css) nos dois temas.
// Régua do guia: texto >= 4,5 (texto bíblico >= 7), ícone ou contorno que carrega estado >= 3.
// Uso: node design/ferramentas/contraste-v2.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = readFileSync(join(RAIZ, 'src', 'estilo-v2', '00-tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function bloco(seletor) {
  const i = css.indexOf(seletor + ' {');
  const corpo = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
  const mapa = {};
  for (const m of corpo.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) mapa['--' + m[1]] = m[2];
  return mapa;
}
const claro = bloco(':root');
const escuro = { ...claro, ...bloco(':root[data-tema="escuro"]') };

const canal = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luz = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
};
const razao = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const PARES = [
  ['--v2-tinta-forte', '--v2-fundo', 4.5, 'títulos sobre o fundo'],
  ['--v2-tinta', '--v2-fundo', 4.5, 'texto sobre o fundo'],
  ['--v2-tinta-fraca', '--v2-fundo', 4.5, 'legenda sobre o fundo'],
  ['--v2-tinta', '--v2-cartao', 7, 'texto bíblico no cartão/leitor'],
  ['--v2-tinta-fraca', '--v2-cartao', 4.5, 'legenda no cartão'],
  ['--v2-tinta-fraca', '--campo', 4.5, 'legenda/placeholder no campo'],
  ['--v2-tinta-forte', '--campo', 4.5, 'texto no campo e na pílula neutra'],
  ['--salvia-texto', '--v2-fundo', 4.5, 'acento como texto sobre o fundo'],
  ['--salvia-texto', '--v2-cartao', 4.5, 'acento como texto no cartão'],
  ['--salvia-texto', '--salvia-palido', 4.5, 'ícone/texto no círculo sálvia pálido'],
  ['--salvia-tinta', '--salvia', 4.5, 'tinta sobre a sálvia'],
  ['--v2-tinta', '--salvia-palido', 4.5, 'texto no realce sálvia pálido'],
  ['--v2-inverso-tinta', '--v2-inverso', 4.5, 'botão principal'],
  ['--barra-icone', '--barra-botao', 4.5, 'ícone inativo da barra'],
  ['--barra-ativa-tinta', '--barra-ativa', 4.5, 'ícone da aba ativa'],
  ['--barra-rotulo', '--barra', 4.5, 'nome da aba sobre a ilha'],
  ['--v2-chama-texto', '--v2-cartao', 4.5, 'número da ofensiva no cartão'],
  ['--v2-chama-texto', '--v2-fundo', 4.5, 'número da ofensiva no fundo'],
  ['--alerta', '--v2-cartao', 4.5, 'erro no cartão'],
  ['--alerta', '--v2-fundo', 4.5, 'erro no fundo'],
  ['--v2-tinta-fraca', '--campo', 3, 'bolinha do interruptor desligado'],
  ['--salvia-tinta', '--salvia', 3, 'bolinha do interruptor ligado'],
];
// a barra de rótulos mora no 01-base.css
claro['--barra-rotulo'] = escuro['--barra-rotulo'] = '#b7bbb1';

let falhas = 0;
for (const [nome, tema] of [['claro', claro], ['escuro', escuro]]) {
  console.log('\n  tema ' + nome);
  for (const [a, b, min, onde] of PARES) {
    if (!tema[a] || !tema[b]) { console.log('  ?     ' + a + ' / ' + b + ' (sem valor)'); continue; }
    const r = razao(tema[a], tema[b]);
    const ok = r >= min;
    if (!ok) falhas++;
    console.log((ok ? '  ok    ' : '  FALHA ') + r.toFixed(2).padStart(5) + ' >= ' + min + '  ' + onde + '  (' + tema[a] + ' / ' + tema[b] + ')');
  }
}
console.log(falhas ? '\n  ' + falhas + ' par(es) abaixo da régua\n' : '\n  todos os pares passam\n');
process.exit(falhas ? 1 : 0);
