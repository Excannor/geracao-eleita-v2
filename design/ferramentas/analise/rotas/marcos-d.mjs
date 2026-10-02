// Conta marcos, parte D: o fim da lição em cada tela (festa/guardar, pensar, orar,
// escrever, ir mais fundo, resumo). Cada trabalho conclui um dia diferente (43, 44, ...)
// para a celebração ser de verdade; semeie de novo se quiser repetir.
import { A, expandir } from './comum.mjs';
const CONC = 'document.querySelectorAll("[data-trilha]").forEach((b) => b.click()); await esp(300); q("[data-concluir]").click(); await esp(1500);';
let dia = 43;
const rotas = [
  { nome: 'festa', rolar: '.licao-palco', espera: 2400, acao: A(CONC), esperaAcao: 2500 },
  { nome: 'pensar', rolar: '.licao-palco', espera: 2400, acao: A(CONC + 'q("[data-avancar]").click(); await esp(700); q("[data-pergunta]").click();'), esperaAcao: 1200 },
  { nome: 'orar', rolar: '.licao-palco', espera: 2400, acao: A(CONC + 'q("[data-avancar]").click(); await esp(600); q("[data-avancar]").click(); await esp(600); q("[data-orei]").click();'), esperaAcao: 1200 },
  { nome: 'escrever', rolar: '.licao-palco', espera: 2400, acao: A(CONC + 'q("[data-escrever]").click(); await esp(400); q("[data-modo=oia]").click();'), esperaAcao: 1000 },
  { nome: 'fundo', rolar: '.licao-palco', espera: 2400, acao: A(CONC + 'q("[data-fundo]").click();'), esperaAcao: 1000 },
  { nome: 'resumo', rolar: '.licao-palco', espera: 2400, acao: A(CONC + 'q("[data-avancar]").click(); await esp(500); q("[data-avancar]").click(); await esp(500); q("[data-avancar]").click();'), esperaAcao: 3000 },
];
export const trabalhos = expandir(rotas).map((t) => ({ ...t, hash: '#/dia/' + (dia++) }));
