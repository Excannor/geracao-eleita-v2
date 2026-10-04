// Conta marcos, parte A (barra cheia, admin): início, Passos, Mais, Desafios e Praticar com o
// quiz em cada estado, Feed e suas folhas, propósitos, bloqueados, célula (precisa de
// CELULA=<id>), modo encontro, discipulado.
import { clic, quiz, CELULA, expandir } from './comum.mjs';
const folha = (id) => '(async()=>{document.querySelector("[data-desafio=' + id + ']").click();await new Promise(r=>setTimeout(r,600));return "ok"})()';
const C = CELULA;
const rotas = [
  { nome: 'm-inicio', hash: '#/', segs: 4, acao: 'scrollTo(0,0);"ok"' },
  { nome: 'm-passos', hash: '#/passos' },
  { nome: 'm-mais', hash: '#/', soTopo: true, acao: clic('[data-abrir-mais]') },
  { nome: 'missoes', hash: '#/missoes' },
  { nome: 'praticar', hash: '#/praticar' },
  { nome: 'f-novo', hash: '#/missoes', rolar: '.folha', acao: folha('sem-redes-21'), esperaAcao: 900 },
  { nome: 'f-ativo', hash: '#/missoes', rolar: '.folha', acao: folha('gratidao-14'), esperaAcao: 900 },
  { nome: 'q-pergunta', hash: '#/praticar', soTopo: true, acao: quiz('marcado'), esperaAcao: 600 },
  { nome: 'q-acerto', hash: '#/praticar', soTopo: true, acao: quiz('acerto'), esperaAcao: 900 },
  { nome: 'q-erro', hash: '#/praticar', soTopo: true, acao: quiz('erro'), esperaAcao: 900 },
  { nome: 'q-texto', hash: '#/praticar', soTopo: true, acao: quiz('textoerro'), esperaAcao: 900 },
  { nome: 'q-fim', hash: '#/praticar', soTopo: true, acao: quiz('fim'), esperaAcao: 900 },
  { nome: 'feed', hash: '#/novidades' },
  { nome: 'f-amigo', hash: '#/novidades', rolar: '.folha', acao: clic('[data-amigo]') },
  { nome: 'f-convite', hash: '#/novidades', rolar: '.folha', acao: clic('.convidar-largo') },
  { nome: 'f-convite2', hash: '#/novidades', acao: '(async()=>{document.querySelector("[data-convidar]").click();await new Promise(r=>setTimeout(r,700));document.querySelector("[data-modo=plano]").click();return "ok"})()', esperaAcao: 1500, rolar: '.folha' },
  { nome: 't-toque', hash: '#/novidades', soTopo: true, acao: "CC.telaToque({usuario:'rute',nome:'Rute',dias:3});'ok'" },
  { nome: 't-toque-rec', hash: '#/novidades', rolar: '.folha', acao: "CC.folhaToque({usuario:'ana',nome:'Ana'});'ok'" },
  { nome: 't-novo-prop', hash: '#/novidades', soTopo: true, acao: "CC.telaNovoProposito({usuario:'ana',nome:'Ana'});'ok'" },
  { nome: 'f-acompanhar', hash: '#/novidades', rolar: '.folha', acao: "CC.folhaAcompanharNaFe({usuario:'lia',nome:'Lia Souza'});'ok'" },
  { nome: 'propositos', hash: '#/novidades/propositos' },
  { nome: 'f-novo-prop', hash: '#/novidades/propositos', acao: clic('[data-novo-proposito]'), rolar: '.folha' },
  { nome: 'f-proposito', hash: '#/novidades/propositos', acao: clic('[data-proposito]'), rolar: '.folha' },
  { nome: 'bloqueados', hash: '#/novidades/bloqueados' },
  { nome: 'celula', hash: '#/celula', espera: 2500 },
  { nome: 'c-id', hash: '#/novidades/celula/' + C, espera: 2500, precisaCelula: true },
  { nome: 'c-estudo', hash: '#/novidades/celula/' + C + '/estudo', espera: 2500, precisaCelula: true },
  { nome: 'c-oracao', hash: '#/novidades/celula/' + C + '/oracao', espera: 2500, precisaCelula: true },
  { nome: 'c-pessoas', hash: '#/novidades/celula/' + C + '/pessoas', precisaCelula: true },
  { nome: 'c-painel', hash: '#/novidades/celula/' + C + '/painel', espera: 2500, precisaCelula: true },
  { nome: 't-encontro', hash: '#/novidades/celula/' + C + '/estudo', espera: 2500, soTopo: true, acao: clic('[data-modo-encontro]'), precisaCelula: true },
  { nome: 'f-registrar', hash: '#/novidades/celula/' + C, acao: clic('[data-registrar-encontro]'), rolar: '.folha', precisaCelula: true },
  { nome: 'f-recado', hash: '#/novidades/celula/' + C, acao: clic('[data-recado]'), rolar: '.folha', precisaCelula: true },
  { nome: 'f-pedir', hash: '#/novidades/celula/' + C + '/oracao', espera: 2500, acao: clic('[data-pedir=oracao]'), rolar: '.folha', precisaCelula: true },
  { nome: 'discipulado', hash: '#/discipulado' },
  { nome: 'f-encontro-sem', hash: '#/discipulado', acao: clic('[data-encontro]'), rolar: '.folha' },
  { nome: 'perfil-disc', hash: '#/perfil/discipulado' },
];
export const trabalhos = expandir(rotas);
