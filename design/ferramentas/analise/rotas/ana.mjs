// Conta ana (membro da célula do marcos: barra com Célula): Feed, propósitos, célula e o
// Hoje e Estudo vistos por quem não conduz, e o pedido de oração da célula (precisa de CELULA=<id>).
import { clic, CELULA, expandir } from './comum.mjs';
const rotas = [
  { nome: 'feed', hash: '#/novidades' },
  { nome: 'propositos', hash: '#/novidades/propositos' },
  { nome: 'celula', hash: '#/celula', espera: 2500 },
  { nome: 'c-id', hash: '#/novidades/celula/' + CELULA, espera: 2500, precisaCelula: true },
  { nome: 'f-checkin', hash: '#/novidades/celula/' + CELULA, acao: clic('[data-checkin]'), rolar: '.folha', precisaCelula: true },
  { nome: 'c-estudo', hash: '#/novidades/celula/' + CELULA + '/estudo', espera: 2500, precisaCelula: true },
  { nome: 'c-oracao', hash: '#/novidades/celula/' + CELULA + '/oracao', espera: 2500, precisaCelula: true },
  { nome: 'inicio', hash: '#/', segs: 2 },
];
export const trabalhos = expandir(rotas);
