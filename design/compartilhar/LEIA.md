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
NBV), porta (porta entreaberta, Apocalipse 3.20 na NBV) e, na segunda leva, mesa (99 não é
100), quemdeusdiz (texto em arcos de digital e o carimbo "Somos Geração Eleita"), comprado
(código de barras com as cruzes), momento (a poltrona vazia), tenda (a tenda do encontro),
diferente (a ovelha branca entre as escuras), custatudo (quem anda sozinho, com os outros borrados) coracao (as brasas embaixo do texto) naovivo (só tipografia em pincel, Gálatas 2.20 como lema), desistir (o texto em cruz), confie (o texto ondulando em fatias), inundados (a água de Ezequiel 47 subindo de letra em letra no AMOR), grandeobra (Neemias 6.3 como lema) e vigiem (Mateus 24.42 na NBV, citado). Na terceira leva, avivados,
naotemas e rei foram refeitos "no padrão da landing page", como o dono pediu: o preto da
landing com grão, a foto da landing em P&B com contraste apagando nas bordas (a mesma de
src/landing/, copiada para src/story-fotos/: o culto, a cruz no monte, o rapaz de costas),
uma cor só na foto (o sol amarelo da cruz; a luz do palco do culto tingida de amarelo),
título em Oswald maiúsculo creme com a palavra final em amarelo e o risco de marcador, o
rótulo da referência em sálvia entre traços, a coroa à mão e a etiqueta "is my" em sálvia.
As fotos vêm com as artes (MODELOS[nome].fotos); sem elas, sai só a tipografia. O
quemdeusdiz ganhou uma digital de verdade atrás do texto (as linhas antigas pareciam ondas
no celular): cristas ovais em volta de um núcleo em espiral, minúcias que bifurcam ou
terminam as cristas, espessura irregular, em cinza fraco. Em todas: chama e dias no topo, a
arte no meio (encolhe por igual para caber entre y 560 e 1480) e só a marca no pé.
O arquivo não entra no index.html: o build o publica à parte (`story-artes.<resumo>.js`), o
app o carrega só na hora de gerar um story desses e o service worker o guarda; sem ele, o
story sai no modelo de sempre.
O "suficiente" usa a foto do dono (src/story-fotos/suficiente.webp: P&B, contraste, um pouco
mais escura, 1080x1920, 113 KB) como fundo inteiro, publicada como
`story-foto-suficiente.<resumo>.webp` e pedida junto com as artes; sem ela, sai a ilustração.
Para gerar: `CHROME=... node design/compartilhar/gerar.mjs <pasta> artes`. O teste de
navegador é `ferramentas/teste-story.mjs`.

## Redesenho do versículo (2026-10-09, `versiculo/` na pasta de capturas)

O dono achou o cartão branco com a bolinha de aspas fraco. Três propostas
(`CHROME=... node design/compartilhar/gerar.mjs <pasta> versiculo`): A, página escura da
landing com as aspas grandes em sálvia, o versículo em Literata à esquerda, a referência em
Oswald amarela e o convite "Leia a Bíblia comigo" em carimbo sálvia; B, a mesma em sálvia
clara; C, cartaz com a referência gigante e o versículo num papel creme.
**Escolhida: A.** O story de versículo também apresenta o app: no feed, o fundo escuro com as
aspas sálvia e a referência amarela chama mais atenção que um fundo claro (a maioria dos
stories de versículo é clara), repete a identidade da landing (preto, sálvia, amarelo,
Oswald, pincel) e o convite com a marca diz o que é e onde achar. O versículo continua o
herói (B perde impacto; em C a referência compete com o texto e o papel aperta os longos).
Regras: o texto vai intacto; se começa no meio da frase (minúscula), reticências na frente,
só na imagem; letra de 128 a 42px conforme o tamanho, e o que não couber para na última
palavra com reticências (a referência diz o trecho inteiro).

### Fundo de cartaz (pedido do dono, mesmo dia; `versiculo2/`)

A composição A ficou sobre o fundo da arte da marca: preto texturizado com poeira, papel
cinza rasgado no canto de cima e no pé, fitas translúcidas e pinceladas sálvia só nas margens
(nada atrás do texto), a logo com "Geração Eleita" no alto à esquerda e, no pé, o convite em
carimbo sálvia entre a cruz e a coroa à mão, o endereço e as montanhas em P&B. As montanhas
foram tiradas da própria arte (src/story-fotos/montanhas.webp, 45 KB, sem o ícone de som do
print) e vêm com as artes sob demanda; o fundo todo mora em 01e-story-artes.js. Sem as artes,
o versículo sai na página lisa (a A original). `gerar.mjs <pasta> versiculo2` gera os casos.

## Rodada 7 (`rodada7/`)

Dois ajustes pedidos pelo dono, a partir das capturas do celular dele (o antes em `resumo.png`):
- **rei:** a coroa saiu da cabeça do rapaz (parecia que ele era o rei) e foi para o canto de
  cima do J, inclinada, coroando o nome JESUS. A foto deslizou para a direita e ficou mais
  apagada, para não disputar com o texto.
- **inundados:** a figura ajoelhada no O parecia uma mancha. Agora a água do rio de
  Ezequiel 47 sobe dentro das letras, de letra em letra: tornozelo no A, joelho no M,
  cintura no O e nado no R, em azul-esverdeado com a onda clara na linha d'água.

## Rodada 8 (`rodada8/`)

Três frases que já existiam ganharam modelo próprio, no padrão da landing (fundo quase preto
com grão, Oswald creme com a última linha em amarelo e o risco, rótulo sálvia entre traços):
- **nacoes** (Jesus para as nações): a foto do dono, as mãos sobre a bandeira do Brasil
  (src/story-fotos/nacoes.webp: P&B, contraste, 486x547, 25 KB, sob demanda como as outras).
  A foto é pequena, então vai a uns 1,8 vez, com a bandeira acima do título e as bordas
  apagando. Sem referência: Mateus 28.19 e Salmos 96.3 na NBV não dizem isso palavra por palavra.
- **relogio** (Prepara-te, Ele vem; a frase ganhou a referência 1 Tessalonicenses 4.16-17): a
  partir da arte que o dono mandou, o relógio antigo de algarismos romanos à mão em sálvia,
  cortado pela borda esquerda, com os ponteiros a três minutos da meia-noite, e a chama
  amarela com o halo ao lado, a única cor quente. Os algarismos ficam todos de pé (o VI
  virado parecia IΛ no celular).
- **toco** (Jó 14.7-9): o toco cortado com os anéis no corte, a casca e as raízes à mão em
  sálvia, e o broto de folhas cheias saindo da beira. A frase longa vira hierarquia: HÁ
  ESPERANÇA grande, o meio menor e AINDA SE RENOVARÁ em amarelo com o risco.
`MODELOS=nacoes,relogio,toco node design/compartilhar/gerar.mjs <pasta> modelos` gera os três.

## Rodada 9 (`rodada9/`): nações no padrão dos posts da marca

- **nacoes**: o dono pediu "mais a cara dele", no padrão dos posts da Geração Eleita (o de
  tiras sálvia): preto de papel amassado com vincos, papel cinza rasgado nos cantos com a
  fibra branca na borda, pinceladas secas sálvia e branca, a foto do dono como recorte de
  papel rasgado colado com fita (a 1,3 vez, a foto é pequena), JESUS PARA / AS NAÇÕES em
  Permanent Marker preto em duas tiras sálvia desencontradas, a cruz e a coroa brancas à
  mão e o risco de pincel branco embaixo. Duas variantes: a foto centrada com as tiras
  embaixo (a foto encostava no "dias de ofensiva" e a cruz ficava espremida) e a foto à
  direita com a cruz ao lado e as tiras saindo da esquerda sobre o pé dela (escolhida).
