// Conta rute (dia 31, só amiga: barra padrão com Desafios): a trilha inteira, o balão do dia
// em várias posições, a folha da unidade e da ofensiva, o baú, Passos, o painel Mais, Desafios e Feed.
import { clic, expandir } from './comum.mjs';
const esperar = 'await new Promise((r) => setTimeout(r, 700));';
const rotas = [
  { nome: 'inicio', hash: '#/', segs: 6, acao: 'scrollTo(0,0);"ok"' },
  { nome: 'inicio-hoje', hash: '#/', soTopo: true, acao: '(() => { CC.rolarAteAtual(false); return "ok"; })()' },
  { nome: 'balao', hash: '#/', soTopo: true, acao: '(() => { const n = document.querySelector(".no.atual"); scrollTo(0, n.getBoundingClientRect().top + scrollY - 380); n.click(); return "ok"; })()' },
  { nome: 'balao-baixo', hash: '#/', soTopo: true, acao: '(() => { const n = document.querySelector(".no.atual"); scrollTo(0, n.getBoundingClientRect().top + scrollY - (innerHeight - 200)); n.click(); return "ok"; })()' },
  { nome: 'balao-lido', hash: '#/', soTopo: true, acao: '(() => { const n = document.querySelector(".no.feito[data-dia=\\"12\\"]"); scrollTo(0, n.getBoundingClientRect().top + scrollY - 380); n.click(); return "ok"; })()' },
  { nome: 'balao-adiante', hash: '#/', soTopo: true, acao: '(async () => { document.querySelector("[data-abrir=\\"2\\"]").click(); ' + esperar + ' const n = document.querySelector(".no.travado[data-dia=\\"40\\"]"); scrollTo(0, n.getBoundingClientRect().top + scrollY - 380); n.click(); return "ok"; })()' },
  { nome: 'balao-bau', hash: '#/', soTopo: true, acao: '(async () => { document.querySelector("[data-abrir=\\"2\\"]").click(); ' + esperar + ' const n = document.querySelector(".no-bau.travado"); scrollTo(0, n.getBoundingClientRect().top + scrollY - 380); n.click(); return "ok"; })()' },
  { nome: 'f-unidade', hash: '#/', rolar: '.folha', acao: clic('[data-guia]') },
  { nome: 'f-ofensiva', hash: '#/', rolar: '.folha', acao: clic('.folha-topo [data-ofensiva]'), esperaAcao: 1200 },
  { nome: 'bau', hash: '#/', soTopo: true, acao: 'CC.telaBau(35); "ok"' },
  { nome: 'bau-aberto', hash: '#/', soTopo: true, acao: '(async () => { CC.telaBau(35); await new Promise((r) => setTimeout(r, 500)); document.querySelector("[data-abrir-bau]").click(); return "ok"; })()', esperaAcao: 3200 },
  { nome: 'ir-atual', hash: '#/', acao: '(() => { scrollTo(0, document.scrollingElement.scrollHeight); return "ok"; })()', soTopo: true },
  { nome: 'passos', hash: '#/passos' },
  { nome: 'passos-ofensiva', hash: '#/passos', rolar: '.folha', acao: clic('.topo [data-ofensiva]'), esperaAcao: 1200 },
  { nome: 'mais', hash: '#/passos', soTopo: true, acao: clic('[data-abrir-mais]') },
  { nome: 'missoes', hash: '#/missoes' },
  { nome: 'feed', hash: '#/novidades' },
];
export const trabalhos = expandir(rotas);
