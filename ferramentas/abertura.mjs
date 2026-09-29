// Gera a tela de abertura a partir da logo (arte/logo-simbolo.svg): o "GE" na chama,
// um traço só, sem cor fixa (currentColor), para o CSS decidir a tinta em cada tema.
// Roda dentro do build, para o splash nunca ficar desencontrado da logo do app.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

export function montarAbertura() {
  const svg = readFileSync(join(RAIZ, 'arte', 'logo-simbolo.svg'), 'utf8').trim();

  return '<div class="abertura" id="abertura">'
    + '<div class="abertura-simbolo">' + svg + '</div>'
    + '<div class="abertura-marca">Geração <em>Eleita</em></div>'
    + '<div class="abertura-barra"><i></i></div>'
    + '</div>';
}
