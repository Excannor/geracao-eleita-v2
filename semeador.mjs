// Trilha do Semeador: quantas pessoas alguém trouxe para o caminho. Conta só quem criou a conta
// pelo link dessa pessoa e já concluiu a primeira lição (contas.mjs, semeadorDe). A conta é do
// servidor: o progresso gravado pelo aparelho nunca muda esse número.

export const NIVEIS_SEMEADOR = [
  { nivel: 1, nome: 'Semente Lançada', meta: 1, arte: 'broto', texto: 'Você trouxe sua primeira companhia para o caminho.' },
  { nivel: 2, nome: 'Pequeno Rebanho', meta: 5, arte: 'bronze', texto: 'Um pequeno grupo começa a se formar ao seu redor.' },
  { nivel: 3, nome: 'Pescador de Homens', meta: 10, arte: 'prata', texto: 'Sua rede está cheia! O caminho está cada vez mais acompanhado.' },
  { nivel: 4, nome: 'Multiplicador', meta: 25, arte: 'ouro', texto: 'A Palavra está se espalhando rápido através do seu chamado.' },
  { nivel: 5, nome: 'Igreja Viva', meta: 50, arte: 'igreja', texto: 'Uma verdadeira congregação caminha e cresce graças a você.' },
];

export function trilhaDoSemeador(pessoas) {
  const n = Math.max(0, Math.floor(Number(pessoas) || 0));
  const atual = NIVEIS_SEMEADOR.filter((x) => n >= x.meta).pop() || null;
  const proximo = NIVEIS_SEMEADOR.find((x) => n < x.meta) || null;
  return {
    pessoas: n,
    nivel: atual ? atual.nivel : 0,
    nome: atual ? atual.nome : '',
    proximo: proximo ? { nivel: proximo.nivel, nome: proximo.nome, meta: proximo.meta, faltam: proximo.meta - n } : null,
  };
}
