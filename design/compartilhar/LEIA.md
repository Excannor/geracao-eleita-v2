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

## Rodada 9 (`rodada9/`): nações no padrão dos posts da marca e a chama do relógio

- **nacoes**: o dono pediu "mais a cara dele", no padrão dos posts da Geração Eleita (o de
  tiras sálvia): preto de papel amassado com vincos, papel cinza rasgado nos cantos com a
  fibra branca na borda, pinceladas secas sálvia e branca, a foto do dono como recorte de
  papel rasgado colado com fita (a 1,3 vez, a foto é pequena), JESUS PARA / AS NAÇÕES em
  Permanent Marker preto em duas tiras sálvia desencontradas, a cruz e a coroa brancas à
  mão e o risco de pincel branco embaixo. Duas variantes: a foto centrada com as tiras
  embaixo (a foto encostava no "dias de ofensiva" e a cruz ficava espremida) e a foto à
  direita com a cruz ao lado e as tiras saindo da esquerda sobre o pé dela (escolhida).
- **relogio**: a chama cheia com halo parecia emoji. Três variantes de chama em contorno
  amarelo no traço do relógio: três línguas com uma gota por dentro (a gota ainda lembrava
  emoji), duas línguas com um risco por dentro, e três línguas com o risco (escolhida),
  menor e mais perto do relógio. A frase voltou a ter `arte: 'relogio'`.

Retorno do dono:
- **relogio**: a chama sai de vez. Das duas posições (o relógio maior cortado pela esquerda,
  que encostava no "dias de ofensiva", e o relógio inteiro no meio), ficou o do meio.
- **nacoes**: a foto dos jovens com a bandeira deixa de ser recorte colado e vira o fundo de
  toda a área do meio, do topo ao pé, atrás dos papéis rasgados dos cantos: P&B, escurecida
  pela metade, com vinheta e grão e um desfoque leve de propósito (ampliada 2,4 vezes). Das
  duas variantes, a foto cobrindo a altura toda (3,5 vezes) cortava a bandeira e borrava
  demais; a foto na largura deixava a bandeira clara no alto, mas apagava no preto embaixo.
  Ficou a foto na largura com o pé continuado em espelho, mais borrado, sob o escuro.

## Revisão das artes no padrão da landing (`revisao-landing/`)

O dono achou repetidas as artes feitas "no padrão da landing": quase preto, Oswald creme
centrado, a última linha em amarelo com o risco de marcador, o desenho no meio e a mesma
moldura. Na folha de contato (`folha-todas.png`, com as quatro da rodada 12 da outra frente)
nove delas empatavam em quatro ou cinco eixos da skill artes-story. Cada uma ganhou fundo,
composição, letra e fechamento próprios; a ideia, as fotos e o texto continuam os mesmos
(`antes-depois.png`):
- **avivados:** pôster amarelo cheio, a foto do culto multiplicada (o claro some no amarelo),
  AVIVADOS gigante em tinta à esquerda e "até que Ele venha" à mão. Fecha na inversão.
- **naotemas:** papel de jornal com a foto da cruz impressa e rasgada embaixo, NÃO TEMAS em
  Literata preta e "eu sou teu Deus" numa fita sálvia.
- **rei:** sálvia cheia, o rapaz da landing em estêncil à direita, JESUS gigante na largura
  com a coroa à mão no J, "is my" à mão e KING vazado com sombra.
- **relogio:** o relógio ocupa a arte e a frase mora dentro do mostrador (sem o V, VI e
  VII); a única luz é o brilho amarelo no XII, a meia-noite.
- **toco:** papel claro, a frase à esquerda em Literata (o meio em itálico) e "ainda se
  renovará." escrito à mão; o toco em tinta sangrando pelas laterais, o broto amarelo.
- **influenciam:** a foto do dono cobre o story todo, com o facho amarelo; a frase à direita,
  no escuro do pé, INFLUENCIAM no maior tamanho.
- **diferenca:** o cartão de respostas: as bolinhas impressas sangrando pelas bordas, uma só
  pintada de amarelo e circulada à caneta, e a frase à mão. O pictograma de gente saiu
  (figura humana desenhada é proibida).
- **vivoporele:** o story partido: JESUS MORREU POR MIM em Literata creme no preto e AGORA EU
  VIVO POR ELE em tinta no amarelo rasgado, com a cruz na emenda.
- **testemunho:** o céu do amanhecer clareando até o horizonte, o banco vazio em silhueta
  diante do sol amarelo, a frase à mão e PRA CONTAR. numa fita creme.
O fechamento amarelo com risco não aparece mais em nenhuma arte. Para gerar:
`DIAS=7 MODELOS=avivados,naotemas,rei,relogio,toco,influenciam,diferenca,vivoporele,testemunho node design/compartilhar/gerar.mjs <pasta> modelos`.

## Rodada 12 (`rodada12/`)

Mais quatro frases que já existiam ganharam modelo próprio, no padrão da landing (o preto com
grão, Oswald creme com a última linha em amarelo e o risco, os desenhos à mão em sálvia, o
amarelo como a única cor quente), sem figura humana, prédio, coroa ou foto:
- **virgula** (Onde o mundo vê um fim, Deus escreve um novo começo cheio de esperança): só
  tipografia. O FIM enorme e quase apagado, com a borracha passando por cima, e o ponto final
  dele em pincel amarelo, que ganhou a cauda e virou vírgula: a frase continua em DEUS
  ESCREVE UM, NOVO COMEÇO grande e CHEIO DE ESPERANÇA. em amarelo com o risco.
- **semente** (A sua oração de hoje está construindo o milagre de amanhã. Continue firme): o
  corte da terra visto de lado, à mão em sálvia (a superfície, o pontilhado, as camadas e as
  pedrinhas, apagando para os lados e para baixo). A semente, um feijão deitado, solta as
  raízes para baixo e o broto sobe em S até furar a superfície com as duas primeiras folhas;
  acima dele, o ponto de luz amarelo. A frase em cima, O MILAGRE DE AMANHÃ. em amarelo com o
  risco, e CONTINUE FIRME no rótulo sálvia embaixo da terra.
- **caminho** (O propósito de Deus para a sua vida é maior do que qualquer obstáculo no seu
  caminho): o caminho à mão em sálvia, em perspectiva, sai largo do pé do desenho, desvia de
  uma pedra grande (quinas, arestas e o pontilhado da sombra) e estreita até o horizonte,
  onde a meta é a bandeirinha amarela. A frase embaixo, NO SEU CAMINHO. em amarelo com o
  risco. A primeira pedra, lisa e em cúpula, parecia um túnel; a de quinas lê como pedra.
- **brasas** (Somos remanescentes): um campo de brasas apagadas, carvões cinza-escuros com a
  cinza clara salpicada e a sombra que os assenta no chão, em perspectiva (as de trás menores
  e mais juntas), e no meio delas oito ainda acesas, em amarelo com a borda laranja suave, a
  crosta de cinza por cima e o brilho baixo pegando nas vizinhas. Nada de chama: são pontos de
  brasa. Em cima, SOMOS em creme e REMANESCENTES. em amarelo com o risco. Na primeira versão
  as brasas, claras e com a beira riscada, pareciam pedrinhas; escurecidas, leem como carvão.
`MODELOS=virgula,semente,caminho,brasas node design/compartilhar/gerar.mjs <pasta> modelos` gera os quatro.

## Rodada 13 (`rodada13/`)

Quatro frases da ofensiva que não tinham arte ganharam modelo próprio, cada uma num fundo,
composição, letra e fecho diferentes entre si e das 37 publicadas (`folha-todas.png`, com as 41).
Nenhuma fecha com a palavra amarela sublinhada; sem figura humana, prédio, coroa ou foto:
- **chegada** (Perseverando até o fim): a pista de atletismo vista de cima, em sálvia cheia.
  PERSEVERANDO gigante e de pé dentro da primeira raia, lido de baixo para cima até a faixa
  quadriculada da chegada; ATÉ O FIM pintado no chão das outras raias, os números 2, 3 e 4 e a
  largada escalonada embaixo. Oswald em tinta de pista gasta. Fecha na chegada quadriculada.
- **ancora** (Firmes no propósito, constantes na oração e inabaláveis na fé): o fundo do mar,
  verde quase preto com fachos de luz. A âncora cheia em sálvia, assentada na areia à direita,
  com o cabo torcido subindo; a frase à esquerda em degraus, FIRMES, CONSTANTES e INABALÁVEIS
  em pincel creme e o resto em Oswald sálvia. Fecha na inversão: NA FÉ em tinta num bloco amarelo.
- **bussola** (Direcionados à santidade, 2 Timóteo 2.22): o amarelo cheio como latão.
  DIRECIONADOS em Literata e o mostrador gravado em tinta, com a cruz no lugar do norte, À
  SANTIDADE pela borda de cima e a agulha parada nela, com dois rastros fracos de quando
  balançava; a referência gravada embaixo. Fecha na própria agulha, sem ênfase na letra.
- **ima** (Atraídos pela Sua presença): limalha de ferro no papel claro, enfileirada e mais
  escura perto do meio, toda apontando para a frase, que fica num vazio com uma luz amarela
  fraca (a presença não aparece, só o que ela atrai). Manrope extra-negrito. Fecha no brilho.
`MODELOS=chegada,ancora,bussola,ima DIAS=7 node design/compartilhar/gerar.mjs <pasta> modelos` gera os quatro.

## Rodada 14 (`rodada14/`)

As últimas quatro frases da ofensiva que não tinham arte ganharam modelo próprio, cada uma num
fundo, composição, letra e fecho diferentes entre si e das 41 publicadas (`folha-todas.png`,
com as 45). Nenhuma fecha com a palavra amarela sublinhada; sem figura humana, prédio, coroa ou foto:
- **ondas** (Conhecer a Deus e fazê-Lo conhecido): a gota amarela cai na água e os anéis abrem
  dela, fortes perto do ponto e cada vez mais largos e fracos, até sair pelas bordas: receber e
  passar adiante. Sálvia cheia, tudo centrado: CONHECER A DEUS em Literata no alto, a gota no
  meio, E FAZÊ-LO espaçado e CONHECIDO em Oswald na largura toda. Sem ênfase na letra: os anéis
  são o fecho. (O eco em contorno de CONHECIDO, na primeira versão, embolava; saiu.)
- **envelope** (Como pregarão, se não forem enviados?, Romanos 10.15): o story é um envelope de
  correio aéreo. Papel claro com a borda listrada de sálvia e tinta, o selo picotado com os
  montes, o caminho que sobe e o sol ("como são belos os pés dos que anunciam boas novas") e o
  valor 10.15, o carimbo redondo do correio com a referência e as ondas de cancelamento, e a
  pergunta à mão em Permanent Marker no lugar do endereço. Fecha no carimbo de borracha
  ENVIADOS?, verde-escuro, torto e falhado. A chama vai à esquerda, o selo à direita.
- **molde** (Geração inconformada): o amarelo cheio com a grade de tinta de borda a borda.
  GERAÇÃO em Oswald, uma letra em cada quadro, certinha; INCON / FORMADA à mão, cada letra maior
  e mais torta que a anterior, e a grade some em volta de cada letra, com um quadro solto caído.
  Fecha na grade quebrada. Diferente da bolinha do cartão de respostas (diferenca) e da ovelha
  branca (diferente): aqui ninguém se destaca no meio dos outros, é a forma que não segura. As
  rachaduras em fio da primeira versão pareciam fios de cabelo e saíram.
- **rasura** (É tudo sobre Ele): a correção à mão. No preto da landing, É TUDO / SOBRE em Oswald
  creme enorme, encostado à esquerda, e na linha de baixo MIM apagado e riscado com força em
  sálvia, com ELE escrito à mão em amarelo ao lado. A frase que se lê é É TUDO SOBRE ELE; o
  MIM riscado é o gancho (sair do centro). Fecha na rasura.
`MODELOS=ondas,envelope,molde,rasura DIAS=7 node design/compartilhar/gerar.mjs <pasta> modelos`
gera os quatro. Para a folha de contato, os 45 saem com `MODELOS=<todos> DIAS=7` e são montados
em dez colunas. Os testes trocaram "Geração inconformada" por "Até que Ele venha" como frase
sem arte.

## Rodada 15 (`rodada15/`)

As quatro últimas frases da ofensiva sem arte ganharam modelo próprio; agora as 49 frases têm
arte. Cada uma num fundo, composição, letra e fecho diferentes entre si e das 45 publicadas
(`folha-todas.png`, com as 49). Nenhuma fecha com a palavra amarela sublinhada; sem figura
humana, prédio, coroa ou foto, e nenhuma palavra fora da frase (só a referência):
- **aura** (Nele vivemos, nos movemos e existimos, Atos 17.28): no preto da landing, uma luz
  grande e macia de sálvia e amarelo, como as auras com grão dos pôsteres, toma o story e
  envolve a frase inteira: nada fica de fora dela. NELE em Manrope extra-negrito enorme, o resto
  em Manrope, centrado, em tinta. Sem ênfase na letra: a aura é o fecho. (Os riscos de poeira
  dentro da luz, na primeira versão, pareciam fios de cabelo e saíram.)
- **rotina** (Se alguém quiser vir após mim..., Lucas 9.23): a página de caderno pontilhado de
  quem anota a rotina. O começo é o título em Literata itálica; os pedidos viram a lista do dia
  em Manrope, cada quadradinho marcado com uma cruzinha à mão, e "tome diariamente a sua cruz"
  ganha a fileira de sete quadradinhos da semana, todos com a cruz. Fecha com "e siga-me" em
  Permanent Marker e a seta à mão que sai da página. (Os quadradinhos feitos com o traço
  curvo pareciam escudos; viraram quatro riscos retos.)
- **grafico** (O maior fracasso é ter sucesso em coisas que nos afastam de Deus): o gráfico de
  "crescimento" à mão no amarelo cheio. A linha sai de junto de uma cruz pequena, no pé, e sobe
  em degraus até a seta no alto; EM COISAS QUE / NOS AFASTAM corre inclinado em cima dela e DE
  DEUS fica embaixo, ao lado da cruz que ficou para trás. O MAIOR pequeno e FRACASSO gigante, tudo
  em Oswald. Fecha na cruz deixada no começo do gráfico.
- **alvorada** (Até que Ele venha): o mar antes do sol, sem sol. O céu vai do quase preto à
  faixa clara do horizonte, a estrela da manhã brilha sozinha acima e o caminho de luz dela na
  água vem na direção de quem vê. Até que em Literata itálica creme no céu, e ELE VENHA em
  Oswald enorme, em tinta, de pé no horizonte contra a faixa clara. Diferente do relógio
  (ponteiros no preto) e de Avivados (cartaz amarelo com foto). Fecha na estrela. (O reflexo
  das letras na água, na primeira versão, saía em faixas quebradas e saiu.)
`MODELOS=aura,rotina,grafico,alvorada DIAS=7 node design/compartilhar/gerar.mjs <pasta> modelos`
gera os quatro. Como nenhuma frase da lista ficou sem arte, os testes simulam a frase sem arte
tirando a arte de "Até que Ele venha" por um instante (e conferem uma frase fora da lista), e as
imagens do modelo de sempre (`gerar.mjs` no conjunto final, `teste-compartilhar.mjs`) tiram a
arte das frases só enquanto desenham.

## Rodada 16 (`rodada16/`)

Dez frases novas do dono (2026-10-11), cada uma com modelo próprio; agora são 59 frases, todas
com arte. As referências que ele mandou são de terceiros: só a ideia ficou, tudo redesenhado,
sem foto nem logo de ninguém. A primeira versão saiu com cara de ícone chapado (contorno grosso
igual, cor lisa) e o dono só aprovou o avião; as outras nove foram refeitas no nível dele: luz,
sombra, profundidade, textura de impressão e poucos elementos, bem desenhados. Cada uma num
fundo, composição, letra e fecho diferentes das vizinhas e das 49 de antes (`folha-todas.png`,
com as 59, e `resumo.png`, as dez em duas fileiras). Nenhuma fecha com a palavra amarela
sublinhada; sem figura humana, prédio, coroa ou foto:
- **noticia** (O Evangelho não é segredo para ser guardado, é notícia para ser espalhada):
  exemplares do jornal espalhados no concreto, com a sombra de cada folha. O de cima é a
  primeira página: o começo em Literata itálica, É NOTÍCIA de manchete em Oswald, "para ser
  espalhada." embaixo, e a foto em retícula de um amanhecer impressa em duas cores (a luz no
  amarelo). As colunas são cinza, sem palavra. Fecha nos jornais espalhados.
- **chamada** (Jesus está chamando você): o celular deitado na mesa escura, tocando; a tela é
  a única luz e clareia a mesa, e o contorno repetido dos lados é a vibração. Na tela, Jesus
  grande e os dois botões, recusar em cinza e aceitar em sálvia (nada de vermelho e verde).
  **Palavras fora da frase: "recusar" e "aceitar"**, pequenas, parte da tela. Fecha na luz.
- **planos** (Meus planos. Os planos de Deus.): o aviãozinho de papel amarelo, pequeno, no céu
  nublado, e a sombra borrada de um avião de linha enorme na mesma direção. "Meus planos." em
  Permanent Marker junto do aviãozinho, "Os planos de Deus." em Literata junto da sombra.
  Fecha na sombra. (Aprovado pelo dono como está.)
- **casa** (Não importa o que você fez, apenas volte para casa! O Pai te espera de braços
  abertos): a noite e, lá na frente, uma porta aberta com a luz acesa; o facho deita no chão de
  tábuas até quem vê, com a poeira brilhando. NÃO IMPORTA O QUE VOCÊ FEZ, em Manrope espaçada,
  "Apenas volte para casa!" em Literata creme, e o bilhete à mão dentro da luz. A casa não
  aparece, só a luz (diferente da porta entreaberta no papel claro). O cartaz da primeira versão
  (com os carimbos VOCÊ É FILHO AMADO e VOCÊ É HERDEIRO) saiu: nenhuma palavra fora da frase.
  Sem referência (lembra Lucas 15, mas não é citação). Fecha na luz.
- **salva** (Jesus salva): as duas palavras incham até encher um círculo, como as letras dos
  adesivos dos anos 70: Manrope engordada, esticada num quadrado e levada ao disco ponto a ponto
  (o mapa elíptico do quadrado no círculo), impressa em tinta no papel amarelo, com a marca leve
  da prensa. Em volta, anéis finos à mão, cada vez mais largos e mais fracos, que somem antes da
  chama e da marca. Diferente dos recortes de Jesus vive. Fecha nas ondas.
- **salluz** (Sal e luz do mundo, Mateus 5.13-14): a lâmpada que é saleiro, deitada de lado no
  gesto de quem salga, no papel creme, com a luz dela no papel e a sombra macia. A frase é o
  próprio desenho do vidro: SAL, E LUZ DO e MUNDO em Oswald, de pé, inchando com a curva até
  encher a bola (o mesmo mapa do quadrado no círculo de Jesus salva, com a linha do meio mais
  estreita para não espremer nas bordas), com a curva e os reflexos do vidro por cima. A rosca
  virou a tampa de metal furada, e o sal cai dela grão por grão. **Sobreposição com luz** (Luz
  do mundo, a lâmpada em traço laranja no marrom): aqui o fundo é claro, a letra é o vidro e o
  sal é o gancho. A referência é de lema e aparece pequena no canto. Na primeira versão a lâmpada
  ficava em pé no escuro com a frase colada dentro; o dono pediu a lâmpada de lado e a letra
  integrada, como na referência. Fecha no sal caindo.
- **controle** (Jesus está no controle): a estampa de camiseta na malha grafite mesclada (o dono
  pediu cinza, menos sálvia e amarelo), com a trama e as dobras passando por cima: o controle em
  serigrafia amarela com o traço de pincel creme, mais grosso no lado da sombra, a sombra em
  retícula vazada (o pano aparece nos pontos), botões só de bolinha (nenhum símbolo de console)
  e a tinta rachada de lavar. JESUS e CONTROLE em Manrope creme, "está no" à mão em amarelo.
  Fecha no próprio controle.
- **plano** (Deus tem um plano para você): DEUS gigante, deitado, impresso em tipografia no
  papel de algodão (a borda clara de onde o papel afundou), com as linhas de construção finas
  do desenho das letras em volta, como projeto; "tem um plano para você." escondido na barriga
  do D. Diferente de confie (a faixa ondulando) e das só tipográficas. Fecha no texto escondido.
- **meu** (Que haja Deus em tudo o que for meu): o cartão sálvia quase vazio, a frase pequena em
  Oswald no alto, e uma etiqueta de papel creme amarrada no barbante que desce do alto, com a
  sombra no papel e só uma cruz carimbada: a etiqueta diz de quem é. Fecha na etiqueta.
- **cubo** (Peça a Deus. Confie em Deus. Agradeça a Deus.): o adesivo de vinil de um cubo
  isométrico na capa amarela de um caderno, uma frase em cada face (em Oswald creme, deitada na
  face por uma transformação do canvas), com a borda de corte, a espessura, a sombra, o brilho
  do vinil e uma ponta descolando. Fecha na ponta descolada.
`MODELOS=noticia,chamada,planos,casa,salva,salluz,controle,plano,meu,cubo DIAS=7 node design/compartilhar/gerar.mjs <pasta> modelos`
gera as dez. A folha de contato junta as 59 em dez colunas. Os testes passaram a contar 59.

## Rodada 17 (`rodada17/`)

Oito frases novas do dono (2026-10-11), cada uma com modelo próprio. **Três estão paradas
por ora, a pedido do dono: heroi (Jesus, meu super-herói), queimar (Deixa queimar) e altar
(Levítico 6.13).** Saíram de `CC.FRASES_OFENSIVA`, mas os modelos continuam em
`01e-story-artes.js`, sem uso, para poderem voltar (os PNGs delas ficam nesta pasta). Agora são
64 frases, todas com arte; `folha-todas.png` tem as 64 e `resumo.png` as cinco que ficaram.
As referências são de terceiros: só a ideia ficou, tudo redesenhado, sem foto nem logo de
ninguém (a exceção é impossivel, que usa a estampa do próprio dono; em "caminho, verdade e vida" o dono pediu para seguir a referência de
perto). No nível de planos e alvorada: luz, sombra, textura e poucos elementos. Cada uma num
fundo, composição, letra e fecho diferentes das vizinhas e das 59 de antes (`folha-todas.png`
e `resumo.png`). Nenhuma fecha com a palavra amarela
sublinhada:
- **heroi** (Jesus, meu super-herói): refeita como a referência, a pedido do dono. Jesus de
  costas, em pé, no papel claro com grão, com a capa vermelha comprida até o chão: por cima dela
  só o cabelo comprido e os ombros, sem rosto. A capa é pintada pixel a pixel (o perfil desce do
  pescoço, arredonda no ombro e cai abrindo até arrastar no chão; as pregas nascem embaixo das
  omoplatas e abrem até a barra, com a crista estreita e o vale largo; a luz vem da esquerda e o
  rastro do pincel corre com a prega). O cabelo sai do redemoinho, contorna o crânio e cai em
  mechas. Embaixo, o chão é uma pincelada de tinta de pincel seco, com as cerdas falhando nas
  pontas e os respingos. JESUS enorme em Oswald pesada gasta e MEU SUPER-HERÓI pequeno e
  espaçado. **Duas exceções pedidas pelo dono, só nesta arte: a figura humana de costas (como em
  impossivel) e o vermelho da capa** (a identidade da referência; o amarelo continua sendo a
  única cor quente nas outras). A primeira versão (a capa amarela vazia no gancho) saiu.
  Fecha na capa no chão de tinta.
- **vida** (Jesus, caminho, verdade e vida, João 14.6): como a referência, as quatro palavras
  empilhadas em letra psicodélica dos anos 70, ondulando e inchando (Oswald engordada, esticada
  em faixas e deformada ponto a ponto), em tinta no papel creme, com a sombra deslocada em
  amarelo. Da mesma família de deformação de Jesus salva (o dono aceitou), mas empilhada,
  ondulada e com sombra. Lema com a referência. Fecha na sombra.
- **queimar** (Deixa queimar): o coração foi redesenhado do zero (o dono achou o primeiro
  "muito ruim"). Agora é anatômico de verdade: o átrio direito com a aurícula dobrando por cima,
  os dois ventrículos separados pelo sulco (o direito na frente, o esquerdo até a ponta), a
  aurícula esquerda, a veia cava superior, a aorta com o arco e os três ramos, o tronco pulmonar
  na frente dela abrindo para o ramo esquerdo embaixo do arco, as veias pulmonares atrás e as
  coronárias tortuosas na superfície. Cada parte tem o próprio volume (a normal sai de máscaras
  borradas da forma) e é gravada com linhas que contornam o volume (paralelos de elipsoide
  recortados na forma), que engrossam na sombra, com o cruzado só no escuro, o pontilhado na
  passagem, as sombras que os vasos e as aurículas jogam no músculo e o contorno mais grosso do
  lado da sombra. Os vasos têm anéis de corte e a boca cortada. As chamas viraram flash de
  tatuagem: uma silhueta só de fogo atrás do coração, com as línguas em S e a ponta em gancho,
  o contorno grosso de tinta, a camada amarela mais clara e o miolo quase branco dentro, os
  traços finos que sobem por dentro e um fogo baixo na frente lambendo a ponta. "deixa queimar"
  à mão embaixo. Fecha nas chamas.
- **graca** (Foi Tua graça que me salvou, Efésios 2.8): GRAÇA quatro vezes em Literata sálvia
  no escuro e, por cima do meio, o mesmo coração novo, mas claro no escuro, mais deitado (girado
  para o outro lado) e sem chamas, apertado pela coroa de espinhos: três ramos grossos torcidos
  uns nos outros, cada pedaço com o tom que muda conforme o ramo rola, desenhados em ordem de
  profundidade; a volta de trás passa atrás do coração e a da frente na frente, jogando sombra
  nele, com os espinhos compridos e curvos para todo lado. "Foi Tua" e "que me salvou" em
  Literata itálica. **A repetição de GRAÇA é a da referência** (a palavra está na frase). Lema
  com a referência. Fecha no coração.
- **impossivel** (Deus do impossível, Lucas 1.37): **a arte é a estampa do próprio dono** (a
  camiseta que ele desenhou e liberou para o app): Jesus de costas, de túnica branca e manto
  vermelho, a coroa em traço acima da cabeça, andando nas pedras com o IM se esfarelando na mão,
  e POSSÍVEL gasto embaixo. A estampa foi recortada da foto da camiseta
  (`src/story-fotos/impossivel.webp`, 920 px de largura, fundo transparente): o bege do tecido
  saiu por uma curva de cor do tecido ajustada pelo claro e escuro das dobras, o que está preso
  dentro dos contornos (a túnica, as pedras) ficou, e os miolos de tecido das letras (o O, o P,
  o IM) saíram. A linha de referência da estampa, ilegível, ficou fora do recorte. No story, a
  estampa vai grande no papel bege quente (perto da cor da camiseta), com "Deus do" em Literata
  itálica no vão à esquerda, acima do IM (lê-se "Deus do IMPOSSÍVEL"), e LUCAS 1.37 limpo entre
  fios embaixo. As cores da estampa ficam, inclusive o vermelho do manto (exceção do dono). Sem
  a foto, sai a ilustração de antes (a figura em aquarela levando o IM). Fecha no IM se
  esfarelando.
- **olhos** (Fogo em teus olhos fez eu me apaixonar): a frase mudou a pedido do dono (em
  01c-arte.js: 'Fogo em', 'teus olhos', 'fez eu me', 'apaixonar.', sem referência) e o
  versículo citado embaixo saiu. FOGO e OLHOS enormes em Oswald creme no preto, "EM TEUS" na
  etiqueta, e dentro dos dois O de OLHOS um ponto de fogo (a gota de luz branca, o halo amarelo
  e o risco de brilho), sem olho desenhado. O fecho em Literata itálica: "fez eu me" pequeno e
  "apaixonar." grande, alinhados à esquerda. Fecha nos pontos de fogo.
- **reino** (Venha o seu reino., Mateus 6.10): o selo em relevo seco no cartão sálvia, com a
  borda serrilhada da prensa, a volta de contas e o anel com a continuação da NBV ("Que a sua
  vontade seja feita aqui na terra, como é feita no céu.") e MATEUS 6.10 entre pontos; no meio,
  VENHA O / SEU REINO. em Literata, rebaixado e com tinta. Diferente de Jesus salva no
  material (papel em relevo, não tinta no amarelo) e na letra (serifa, não a inchada). Fecha nas
  contas.
- **altar** (Levítico 6.13, o versículo inteiro na NBV): refeita (o dono achou a caixa de
  tijolos e a chama de contornos fracas). Um altar antigo de pedras lavradas à mão, de três
  quartos: a frente em fiadas de blocos desencontrados, cada um com a sua altura e o seu tom, o
  lado recuando na sombra, o tampo de laje e os quatro chifres de pedra. A textura é um ruído
  suave multiplicado na pedra, com as rachaduras e as marcas do cinzel; a luz amarela do fogo
  bate nas quinas de cima e some para baixo. Em cima, a lenha em brasa e o fogo vivo: quatro
  camadas de línguas diferentes (nenhuma é cópia encolhida da outra), da âmbar macia ao miolo
  quase branco, com as linhas de gravura por dentro, o brilho no escuro, as línguas soltas e as
  fagulhas. A frase em hierarquia: "O fogo do altar / deverá ser mantido" em Literata itálica,
  CONTINUAMENTE ACESO; grande em Oswald amarela e "não deve ser apagado." pequena embaixo.
  Fecha na chama.
Os três de fogo não se repetem: o coração em gravura de tinta no papel com as chamas de
tatuagem (queimar), os pontos de luz dentro da letra no preto (olhos) e o fogo vivo pintado
sobre a pedra (altar). **Sobreposição:** queimar e graca usam o mesmo coração anatômico, mas em
pose, tratamento e companhia diferentes (em pé, tinta no papel, nas chamas; deitado, claro no
escuro, apertado pela coroa); ambos lembram coracao (as brasas embaixo do texto) só no tema.
`MODELOS=heroi,vida,queimar,graca,impossivel,olhos,reino,altar DIAS=7 node design/compartilhar/gerar.mjs <pasta> modelos`
gera as oito. A folha de contato junta as 67 em dez colunas. Os testes passaram a contar 67.

## Rodada 18 (`rodada18/`)

Referências novas do dono (2026-10-15), agora entregues uma arte por vez. Só a ideia de cada
referência; tudo redesenhado em canvas, sem foto nem logo de ninguém.
- **raso** (O raso já não nos satisfaz, lema com Ezequiel 47.3-5): vista de dentro da água. A
  superfície clara em cima com a rede de luz da onda (cáusticas feitas pixel a pixel numa tela
  pequena e esticada), os fachos de sol descendo e sumindo, partículas em suspensão e bolhas. A
  frase afunda e engorda com a profundidade: "O raso" pequeno em Literata itálica escura no
  claro, JÁ NÃO NOS em Oswald média e SATISFAZ enorme no escuro. Na direita, a régua de
  profundidade com as marcas do versículo (TORNOZELOS, JOELHOS, CINTURA, A NADO); A NADO em
  amarelo, na altura do SATISFAZ. Fundo novo na coleção (a água em degradê do claro ao quase
  preto). **A água é azul a pedido do dono** ("no tom da água igual o primeiro", a referência
  69): água-marinha na superfície, azul-petróleo no meio e azul quase preto no fundo, com os
  fachos e a rede de luz em ciano; exceção à paleta só nesta arte. A primeira versão, verde
  sálvia, saiu. Contraste AA medido no fundo de cada linha (JÁ NÃO NOS 5,1; o resto acima de 7), texto à esquerda, sem palavra sublinhada. Diferente de inundados (a água dentro das
  letras de AMOR no preto). Fecha na marca amarela da régua.
`MODELOS=raso DIAS=7 node design/compartilhar/gerar.mjs <pasta> modelos`. Os testes contam 64.
