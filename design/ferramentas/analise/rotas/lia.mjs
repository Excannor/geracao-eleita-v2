// Conta lia (caminho Conhecer Jesus, dia 3): início, os 14 dias, um dia antes e depois de
// ler, perguntas honestas, "seguir" e a folha de conversar com quem acompanha.
import { expandir } from './comum.mjs';
const esperar = 'await new Promise((r) => setTimeout(r, 700));';
const quem = 'CC.quem.acompanhadoPor = { usuario: "marcos", nome: "Marcos Silva" }; CC.redesenhar();';
const rotas = [
  { nome: 'lia-inicio', hash: '#/' },
  { nome: 'lia-quem', hash: '#/', acao: '(() => { ' + quem + ' return "ok"; })()' },
  { nome: 'conhecer', hash: '#/conhecer' },
  { nome: 'dia1', hash: '#/conhecer', rolar: '.licao-palco', acao: '(async () => { location.hash = "#/conhecer/1"; ' + esperar + ' return "ok"; })()' },
  { nome: 'dia1-lido', hash: '#/conhecer', rolar: '.licao-palco', acao: '(async () => { location.hash = "#/conhecer/1"; ' + esperar + ' document.querySelector("[data-ler]").click(); await new Promise((r) => setTimeout(r, 1500)); CC.fecharLeitor(); return "ok"; })()', esperaAcao: 1200 },
  { nome: 'perguntas', hash: '#/perguntas' },
  { nome: 'pergunta', hash: '#/perguntas/sofrimento' },
  { nome: 'pergunta-quem', hash: '#/perguntas/ser-perfeito', segs: 3, acao: '(() => { ' + quem + ' return "ok"; })()' },
  { nome: 'seguir', hash: '#/seguir' },
  { nome: 'seguir-quem', hash: '#/seguir', acao: '(() => { ' + quem + ' return "ok"; })()' },
  { nome: 'f-conversar', hash: '#/perguntas/duvidas', rolar: '.folha', acao: '(async () => { ' + quem + ' ' + esperar + ' document.querySelector("[data-conversar]").click(); return "ok"; })()' },
];
export const trabalhos = expandir(rotas);
