# Imagem de story (compartilhar a ofensiva e o versículo)

O código final mora em `src/app/01d-story.js`. Aqui ficam as variantes e o porquê da escolha.
Para gerar de novo: `CHROME=... node design/compartilhar/gerar.mjs <pasta> variantes` (as três
de cada) ou `... <pasta> final` (a escolhida com a frase mais curta e a mais longa, 1, 7, 16,
100 e 365 dias, a frase do estágio, e versículos curto, médio, longo e de dez versículos).
O contorno vermelho nas folhas de comparação marca a área segura (sem os 250px de cima e de
baixo, onde o Instagram põe a barra do perfil e a caixa de resposta).

## Rodada 1: três composições de cada (`rodada1/`)

Ofensiva:
- **A, folha sálvia:** a cara do Início, mas a chama perde força no fundo claro, o carimbo
  fica pequeno e a metade de baixo sobra vazia.
- **B, grafite com brilho (escolhida):** uma coisa em destaque, o fogo aceso com o número
  embaixo, lido em um segundo; o fundo escuro se destaca entre os stories, e o carimbo usa
  as chapas claras do tema escuro do app (a mesma folha da ofensiva no escuro).
- **C, carimbo herói com cartão:** parece um pedaço de tela do app; o número e o carimbo
  disputam a atenção.

Versículo:
- **A, folha sálvia com cartão branco (escolhida):** é o cartão de versículo do app sobre a
  folha do alto (paleta C), com as aspas no botão redondo preto: tem a cara do app e é o
  formato que os apps de leitura usam para compartilhar (cartão sobre cor, marca no pé).
- **B, grafite com aspas sálvia:** bonito, mas igual a mil modelos de versículo.
- **C, página de leitura alinhada à esquerda:** a letra maior, mas o creme fica genérico e a
  composição perde o centro no story.

## Refino (`rodada2/`, `rodada3/`, `escolhida/`)

1. Rodada 2: as escolhidas ocupando a área segura inteira, número de 300px, rótulo do
   estágio da chama em sálvia, marca logo acima da faixa de baixo. Defeitos: a frase de seis
   linhas (Lucas 9.23) ficava miúda com 365 dias (a chama grande comia o espaço) e a frase do
   estágio quebrava com "VOCÊ." sozinho.
2. Rodada 3: o carimbo tem o lugar garantido (até 440px de altura) e a chama e o número
   encolhem juntos se faltar espaço; a frase do estágio passou a ser quebrada em linhas
   equilibradas. Defeitos: "JEREMIAS" sozinho na primeira linha; "Jesus chorou." pequeno no
   cartão; dez versículos em letra de 24px, ilegível no story.
3. Final: quebra pela menor diferença entre as linhas (sem viúva em nenhuma ponta); o
   versículo vai de 92px (curto) a 34px (o mínimo legível no celular) e, se um trecho de dez
   versículos não couber, para na última palavra que cabe, com reticências (a referência diz o
   trecho inteiro).

## Frases com arte própria (`src/app/01e-story-artes.js`)

Algumas frases da ofensiva (as que têm `arte` em `CC.FRASES_OFENSIVA`) vieram de artes que o
dono mandou e ganharam um modelo próprio, redesenhado em canvas (nada de imagem embutida):
envergonho (só tipografia), luz (lâmpada), ninguem (globo com ovelhas), oleiro (só
tipografia), procurado (cartaz com a ovelha 100, sem frase), suficiente (bandeira e
multidão, ilustração própria a partir de uma foto), praticantes (livro aberto, Tiago 1.22 na
NBV) e porta (porta entreaberta, Apocalipse 3.20 na NBV). Em todas: chama e dias no topo, a
arte no meio (encolhe por igual para caber entre y 560 e 1480) e só a marca no pé.
Para gerar: `CHROME=... node design/compartilhar/gerar.mjs <pasta> artes`. O teste de
navegador é `ferramentas/teste-story.mjs`.
