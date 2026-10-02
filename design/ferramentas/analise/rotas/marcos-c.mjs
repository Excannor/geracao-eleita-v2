// Conta marcos, parte C: a lição (dia 42 com duas passagens, dia 2 com uma), o leitor, a
// barra do versículo, o painel Aa, a Bíblia (lista, busca, livro, capítulo), marcar
// versículos e a nota de um versículo.
import { A, expandir } from './comum.mjs';
const G = encodeURIComponent('Gênesis');
const rotas = [
  { nome: 'licao', hash: '#/dia/42', rolar: '.licao-palco', espera: 2400 },
  { nome: 'licao-uma', hash: '#/dia/2', rolar: '.licao-palco', espera: 2400 },
  { nome: 'licao-meio', hash: '#/dia/42', rolar: '.licao-palco', soTopo: true, espera: 2400, acao: A('q("[data-trilha]").click();'), esperaAcao: 700 },
  { nome: 'leitor', hash: '#/dia/42', rolar: '.leitor .licao-palco', espera: 2400, acao: A('q("[data-ler]").click(); await esp(1500);'), esperaAcao: 900 },
  { nome: 'leitor-verso', hash: '#/dia/42', rolar: '.leitor .licao-palco', soTopo: true, espera: 2400, acao: A('q("[data-ler]").click(); await esp(1500); document.querySelectorAll(".leitor-verso")[1].click();'), esperaAcao: 700 },
  { nome: 'aa', hash: '#/dia/42', soTopo: true, espera: 2400, acao: A('q("[data-ler]").click(); await esp(1000); q("[data-aa]").click();'), esperaAcao: 900 },
  { nome: 'biblia', hash: '#/biblia', segs: 8 },
  { nome: 'biblia-busca', hash: '#/biblia', soTopo: true, acao: A('const c = q("#busca-livro"); c.value = "tess"; c.dispatchEvent(new Event("input"));'), esperaAcao: 500 },
  { nome: 'biblia-vazia', hash: '#/biblia', soTopo: true, acao: A('const c = q("#busca-livro"); c.value = "zzz"; c.dispatchEvent(new Event("input"));'), esperaAcao: 500 },
  { nome: 'genesis', hash: '#/biblia/' + G, segs: 3 },
  { nome: 'salmos', hash: '#/biblia/Salmos', segs: 4 },
  { nome: 'gen1', hash: '#/biblia/' + G + '/1', rolar: '.leitor .licao-palco', segs: 4, espera: 2400 },
  { nome: 'gen1-verso', hash: '#/biblia/' + G + '/1', rolar: '.leitor .licao-palco', soTopo: true, espera: 2400, acao: A('document.querySelectorAll(".leitor-verso")[2].click(); await esp(300); q("[data-cor=\\"2\\"]").click(); await esp(300); document.querySelectorAll(".leitor-verso")[3].click();'), esperaAcao: 700 },
  { nome: 'nota-verso', hash: '#/biblia/' + G + '/1', soTopo: true, espera: 2400, acao: A('document.querySelectorAll(".leitor-verso")[0].click(); await esp(300); q("[data-nota-verso]").click();'), esperaAcao: 1200 },
];
export const trabalhos = expandir(rotas);
