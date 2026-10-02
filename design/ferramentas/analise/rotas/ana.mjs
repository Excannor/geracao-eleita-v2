// Conta ana (membro da célula do marcos: barra com Célula): Feed, propósitos, célula e o
// pedido de oração da célula (precisa de CELULA=<id>).
import { CELULA, expandir } from './comum.mjs';
const rotas = [
  { nome: 'feed', hash: '#/novidades' },
  { nome: 'propositos', hash: '#/novidades/propositos' },
  { nome: 'celula', hash: '#/celula', espera: 2500 },
  { nome: 'c-oracao', hash: '#/novidades/celula/' + CELULA + '/oracao', espera: 2500, precisaCelula: true },
  { nome: 'inicio', hash: '#/', segs: 2 },
];
export const trabalhos = expandir(rotas);
