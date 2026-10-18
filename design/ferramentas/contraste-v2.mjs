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
// O realce (--realce) é a sálvia pálida com listras de --listra (rgba) por cima: a listra mais
// escura, composta sobre a sálvia pálida, vira a ficha --realce-listra, para medir o texto que
// fica sobre o realce (a opção marcada e a data do encontro na folha de registro).
function listra(seletor) {
  const i = css.indexOf(seletor + ' {');
  const corpo = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
  const m = /--listra:\s*rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/.exec(corpo);
  return m ? { rgb: [m[1], m[2], m[3]].map(Number), a: Number(m[4]) } : null;
}
function sobre(cor, base) {
  const b = [1, 3, 5].map((k) => parseInt(base.slice(k, k + 2), 16));
  return '#' + b.map((v, k) => Math.round(cor.rgb[k] * cor.a + v * (1 - cor.a)).toString(16).padStart(2, '0')).join('');
}
for (const [tema, seletor] of [[claro, ':root'], [escuro, ':root[data-tema="escuro"]']]) {
  const l = listra(seletor) || listra(':root');
  if (l && tema['--salvia-palido']) tema['--realce-listra'] = sobre(l, tema['--salvia-palido']);
}

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
  ['--barra-icone', '--barra', 4.5, 'ícone inativo da barra (sobre a cápsula)'],
  ['--folha-tinta', '--folha', 4.5, 'texto da folha do alto'],
  ['--folha-tinta-fraca', '--folha', 4.5, 'legenda da folha do alto'],
  ['--no-lido-tinta', '--no-lido', 3, 'visto do dia lido'],
  ['--barra-ativa-tinta', '--barra-ativa', 4.5, 'ícone da aba ativa'],
  ['--barra-rotulo', '--barra', 4.5, 'nome da aba sobre a ilha'],
  ['--v2-chama-texto', '--v2-cartao', 4.5, 'número da ofensiva no cartão'],
  ['--v2-chama-texto', '--v2-fundo', 4.5, 'número da ofensiva no fundo'],
  ['--alerta', '--v2-cartao', 4.5, 'erro no cartão'],
  ['--alerta', '--v2-fundo', 4.5, 'erro no fundo'],
  ['--v2-tinta-fraca', '--campo', 3, 'bolinha do interruptor desligado'],
  ['--salvia-tinta', '--salvia', 3, 'bolinha do interruptor ligado'],
  // À Mesa, o estudo da célula (docs/a-mesa-fase1.md, 6.5): os pares novos das peças estudo-celula
  // e estudo-preparo. O "Para guardar" fica na folha no claro e na sálvia pálida no escuro.
  ['--v2-tinta-fraca', '--v2-cartao', 4.5, 'linha de origem do cartão na prévia do estudo'],
  ['--salvia-texto', '--v2-cartao', 4.5, 'etiqueta "Sugestão do app" na prévia'],
  ['--folha-tinta', '--salvia-palido', 4.5, '"Para guardar" do estudo no escuro'],
  ['--folha-tinta-fraca', '--salvia-palido', 4.5, 'etiqueta "Para guardar" do estudo no escuro'],
  ['--v2-tinta-forte', '--salvia-palido', 4.5, 'selo "Encontro hoje · preparar o estudo"'],
  ['--v2-tinta-forte', '--v2-cartao', 4.5, 'convite de Orar juntos no modo encontro'],
  ['--salvia-tinta', '--folha-destaque', 4.5, 'botão "Abrir ... na Bíblia" no alto do passo do encontro'],
  ['--v2-tinta-fraca', '--v2-cartao', 3, 'círculo vazio da escolha no passo 1 do preparo'],
  // À Mesa, Fase 2 (docs/a-mesa-fase2.md, 9.5): o combinado lembrado, a lista, a leitura de um
  // anterior, a folha de registro e "Quem não veio"
  ['--v2-tinta-forte', '--salvia-palido', 4.5, '"Na semana passada combinamos" na Acolhida'],
  ['--v2-tinta-fraca', '--v2-cartao', 4.5, 'data e referências na lista de Estudos anteriores'],
  ['--salvia-texto', '--v2-fundo', 4.5, 'etiqueta "Estudo anterior" na leitura'],
  ['--v2-tinta-forte', '--campo', 4.5, 'título do estudo na folha de registro'],
  ['--v2-tinta-fraca', '--campo', 4.5, '"Preparado em" na escolha do estudo do registro'],
  ['--v2-tinta-fraca', '--v2-cartao', 4.5, '"Só quem conduz a célula vê este número."'],
  ['--salvia-texto', '--salvia-palido', 4.5, 'ícone de pessoas no cartão da presença'],
  // a revisão da Fase 2: o texto sobre a listra mais escura do realce (a opção marcada do estudo
  // do registro e "o encontro desta semana"); a tinta fraca dava 4,36:1 ali
  ['--v2-tinta', '--realce-listra', 4.5, '"Preparado em" e "o encontro desta semana" sobre o realce'],
  ['--v2-tinta-forte', '--realce-listra', 4.5, 'título do estudo e nome marcado sobre o realce'],
];

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
