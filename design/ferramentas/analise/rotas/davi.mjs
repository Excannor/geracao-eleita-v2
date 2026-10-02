// Conta davi (conduzido pelo marcos no discipulado: barra com Discipulado).
import { expandir } from './comum.mjs';
const rotas = [
  { nome: 'feed', hash: '#/novidades' },
  { nome: 'discipulado', hash: '#/discipulado' },
  { nome: 'perfil-disc', hash: '#/perfil/discipulado' },
  { nome: 'inicio', hash: '#/', segs: 2 },
];
export const trabalhos = expandir(rotas);
