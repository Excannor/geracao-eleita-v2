# Brief: nova direção visual para o app Geração Eleita

## O app
- PWA de leitura bíblica em português do Brasil, nome público **Geração Eleita** (1 Pedro 2.9). O código original fica em Excannor/geracao-eleita e não é alterado; este repositório (V2) recebe o redesenho.
- Plano de 365 dias virou uma **trilha** de nós (mecânica do Duolingo aplicada à leitura), agrupada em **12 unidades** (uma por mês).
- **Ofensiva**: dias seguidos de leitura, mostrada no topo com um pequeno ícone de fogo e o número.
- **Desafios**: 3 desafios diários (ex.: "Conclua a lição do dia", "Leia 4 capítulos", "Faça uma rodada no Praticar"), um baú de recompensa, o quiz **Praticar** (memorizar versículos), e um desafio em dupla ("Leiam juntos 4 dias com Ana").
- **Juntos**: amigos, quem já leu hoje, botão "Encorajar", e um **mural** (ex.: "Ana guardou um versículo", botão "Celebrar").
- **Explorar**: 546 notas de consulta: 66 Livros, 85 Pessoas, 45 Eventos, 55 Lugares, 153 Versículos, 48 Temas; busca; "Pra ir além na leitura de hoje" com pílulas de notas do dia.
- **Perfil**: foto/nome, dias de ofensiva, dias lidos (41 de 365), livros terminados (3 de 66), anotações, conquistas e troféus.
- **Leitor**: texto bíblico dentro do app em duas traduções livres, **Nova Bíblia Viva (NBV, CC BY-SA 4.0)** e **Bíblia Livre (BLIVRE, CC BY 4.0)**; marcar versículo, guardar, anotar.
- Público: jovens cristãos brasileiros e também gente nova na fé ("Primeiros passos", 12 lições).
- A logo é um símbolo preto e branco (SVG em currentColor, pode ser tingido) com wordmark condensado.

## O design atual (só para entender a estrutura; NÃO reaproveitar a paleta)
- Cinza puro (#e6e6e6 fundo, cartão #f7f7f7) + um acento **petróleo** (#0f5c5c) + "hoje" em petróleo claro (#5fbdb9); chama vermelho-laranja só na ofensiva; vermelho só para alerta.
- Oswald (condensada, títulos/botões/abas em caixa alta) + Nunito (texto). Cartões com raio 26 e borda 2px, botões em cápsula, nós ovais 70×62, abas em pílula.
- **O usuário pediu liberdade criativa total: NÃO use o cinza nem o petróleo como base.** Fontes também podem mudar.

## O que precisa continuar funcionando (UX, não estética)
- Trilha em zigue-zague de nós com estados: **lido** (visto), **marco de 7 dias** (estrela), **com anotação** (caneta), **fecha um livro** (nó especial com o nome do livro), **hoje** (anel que enche conforme as 2 passagens do dia são marcadas; balão "Começar"), **travado** (cadeado; a linha da trilha fica tracejada no trecho travado).
- Faixa de cada unidade com número grande e nome ("Unidade 2 · 10 de 28 dias", "Êxodo a Números · Mateus a Marcos").
- Cartão "Leitura de hoje" no alto da trilha com as passagens do dia e um botão principal.
- Barra de abas inferior com 5 abas: Trilha, Desafios, Juntos, Explorar, Perfil (nome sempre visível).
- Nenhum estado dito só por cor (WCAG 1.4.1): cada um tem ícone ou forma própria.

## Restrições duras
- **Sem lamparina / lâmpada / candeia em lugar nenhum** (pedido explícito do usuário). Nada de Salmo 119.105.
- Moderno e polido, mas **sem cara de SaaS** (nada de dashboard corporativo, linhas finas cinza, cards brancos com sombra genérica, ícones de linha genéricos por toda parte, checkboxes de app de tarefas) e **sem cara de gerado por IA**. Evitar: creme #F4F1EA + serifa + terracota; quase-preto + um único verde-ácido ou vermelhão; degradê roxo→azul; Inter, Space Grotesk, Roboto, Arial; emoji; glassmorphism; tudo centralizado; mesmo raio e sombra em todo bloco; card com barra de acento lateral; degradês de fundo.
- Tema claro E escuro, ambos pensados (não inversão automática).
- Contraste de texto ≥ 4,5:1 (≥ 3:1 para texto ≥ 24px); alvos de toque ≥ 44px.
- Fontes só do Google Fonts.

## Conteúdo real para usar nas telas
- Dia atual: **42**. Leitura de hoje: **Levítico 15–17 · Marcos 2**, cerca de 15 min. Levítico já marcado, Marcos 2 não (metade do dia lida).
- Unidade 2: "Êxodo a Números · Mateus a Marcos", dias 32–59, 10 de 28 dias lidos.
- Dias vizinhos: 39 Levítico 8–9 · Mateus 28 (fecha Mateus); 40 Levítico 10–12; 41 Levítico 13–14 · Marcos 1; 42 hoje; 43 Levítico 18–19 · Marcos 3; 44 Levítico 20–22; 45 Levítico 23–25 · Marcos 4; 46 Levítico 26–27 · Marcos 5 (fecha Levítico); 47 Números 1–3.
- Marcos 2.1–7 (NBV): 1 Alguns dias depois ele voltou a Cafarnaum, e a notícia da sua chegada espalhou-se depressa pela cidade. 2 Logo a casa onde ele se achava ficou tão cheia que não havia lugar nem junto à porta. E Jesus pregava a palavra a eles. 3 Chegaram quatro homens carregando um paralítico numa esteira. 4 Eles não podiam chegar até Jesus por causa da multidão, e por isso fizeram um buraco no teto por cima de onde estava Jesus, e fizeram descer o homem paralítico na esteira bem na frente dele. 5 Quando Jesus viu a fé tão intensa deles, disse ao paralítico: “Filho, os seus pecados estão perdoados!” 6 Mas alguns dos mestres da lei que estavam sentados ali pensavam no seu íntimo: 7 “Isto é uma blasfêmia! Será que ele acha que é Deus? Quem pode perdoar pecados a não ser Deus?”
- 1 Pedro 2.9 (Bíblia Livre): "Mas vós sois a geração escolhida, o sacerdócio real, a nação santa, o povo adquirido; a fim de que anuncieis as virtudes daquele que vos chamou das trevas para a sua maravilhosa luz."
- Notas do dia 42: Levítico, Marcos, Arão, André, Marcos evangelista, Mateus apóstolo, Batismo de Jesus, Ministério de Jesus, Cafarnaum.
- Exemplos (marcar como exemplo, não dados reais): amigos Ana (23 dias), Davi (8 dias), Rute (ainda não leu hoje); ofensiva do usuário 12 dias; livros terminados: Gênesis, Êxodo, Mateus; lendo Levítico e Marcos.
