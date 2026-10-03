# Aprendizados

Regra do dono (2026-10-02): **aprender com os erros**. Sempre que um erro aparecer, ou quando
der para fazer algo melhor, registre aqui na hora: o que aconteceu, por que, e a regra que evita
repetir. Antes de começar qualquer trabalho no app, leia esta página e a skill da área. Quando um
aprendizado virar regra de uma área, copie a regra para a skill dela (`.claude/skills/*`) e deixe
aqui a linha com a data.

Formato: `AAAA-MM-DD · área · o que aconteceu → regra`.

Regra do dono (2026-10-03): **máxima eficiência**, sempre pesando velocidade, qualidade e
economia de tokens, e **evoluir enquanto o app é construído**. Na prática: não reler o que já
está bom; escrever certo uma vez (reler na hora) em vez de escrever e consertar; um revisor por
mapa que corrige direto, nunca ida e volta; agente de texto lê o cartão (`voz.md`), não a skill
inteira; captura de tela só quando muda desenho ou tela; trabalho independente em paralelo (de 3
em 3); e quem acha um jeito mais barato ou melhor de fazer registra aqui e muda a skill na hora,
sem esperar pedido. O coordenador é coautor: propõe, não só executa.

## Mapa do livro

- 2026-10-02 · mapa · O primeiro mock foi montado só pelo print, sem pesquisar como a Bíblia de
  referência funciona → pesquisar a referência antes de desenhar uma função nova inspirada em algo
  de fora.
- 2026-10-02 · mapa · O primeiro mock saiu sem ilustração, e o dono disse que ela é necessária →
  o mapa sempre tem desenho: um principal por ramo e um em "[Livro] e Cristo".
- 2026-10-02 · ilustração · O serafim com a tenaz virou um borrão; a coroa e as uvas pareciam
  emoji → traço de pena com hachura, objeto concreto do texto e, se não ficar claro, trocar o
  objeto por um mais simples.
- 2026-10-02 · ilustração · Folha em cima das uvas, alça dentro do cântaro, orelha torta, linhas
  cruzando a janela → renderizar cada desenho a 280px ou mais e conferir peça por peça antes de
  usar (regra do dono: revisar sempre os detalhes de ilustrações e setas).
- 2026-10-02 · tela · O texto das conexões cruzava a linha pontilhada → a área da conexão tem
  150px, a curva desce primeiro e o texto fica no canto livre; conferir a tela renderizada.
- 2026-10-02 · tela · Na grade de 3 colunas, "Tessalonicenses" quebrava no meio da palavra → 2
  colunas e tamanho da fonte pelo comprimento do nome.
- 2026-10-02 · conteúdo · Entraram datas em a.C., "60 anos de ministério" e Qumran, que não estão
  no texto → só o que o livro diz; fora dele, só o significado do nome e as citações do NT.
- 2026-10-02 · conteúdo · O mapa falava do Servo sem dizer que é Jesus → quando o NT liga a
  passagem a Jesus, o ramo diz que é Jesus, com a referência do NT.
- 2026-10-02 · canvas · Um publish foi recusado porque o `canvas.json` tinha mudado do lado de lá
  → ler o índice publicado logo antes de mandar mudança de layout.

- 2026-10-02 · mapa · O mock punha o mapa no cartão do dia e no leitor; o dono esclareceu que os
  mapas vão para o Explorar e a Bíblia do app não muda → mapa só no Explorar.
- 2026-10-02 · conteúdo · Cinco citações do mock de Isaías vinham de memória (Almeida/NVI) e não
  batiam com a NBV ("eis-me aqui", "a semente santa é o seu toco", "foi contado com os
  transgressores", "Um ramo surgirá do tronco de Jessé", "rápido para o saque") → toda citação
  entre aspas vem da NBV da referência do item; `ferramentas/checar-mapa.mjs` barra o que não bate
  (regra na skill).
- 2026-10-02 · desenho · Traço escuro sobre papel branco some no tema escuro → cinco classes de
  traço (.k .h .p .s .e) com as cores por variável do tema, nenhuma cor literal dentro do SVG; no
  cartão escuro "[Livro] e Cristo" o desenho fica sobre um disco de papel claro (regra na skill).
- 2026-10-02 · tela · A altura da conexão era medida logo depois de desenhar, antes de a Literata
  chegar: medida com a letra de reserva, saía mais curta, e a curva atravessou a última linha de
  um texto de seis linhas → medir de novo no quadro seguinte e em `document.fonts.ready`; o
  teste de navegador confere que nenhum ponto da curva cai no retângulo do texto (regra na skill).
- 2026-10-02 · tela · Voltar de um mapa levava ao alto do Explorar, longe da grade (o roteador
  rola para o topo a cada troca de rota) → vindo de um mapa, o Explorar reabre na grade.
- 2026-10-02 · build · `window.MAPAS` entrou depois de `window.BIBLIAS` e quebrou o teste.mjs e
  o teste-leitor, que leem a lista de bíblias até `;</script>` → dado novo no bloco de dados
  entra antes do BIBLIAS, e quem lê um dado do bloco para no próximo `;window.`.
- 2026-10-02 · teste · Comparar texto da tela sem tirar o espaço inseparável e o juntor que
  `CC.inseparavel` e `nb()` põem ("Isaías 1", "6.1-4") deu quatro falhas falsas → nos testes de
  navegador, normalizar ` ` e `⁠` antes de comparar texto.
- 2026-10-02 · revisão · A captura da página inteira (11.800px) reduzida numa imagem só esconde
  qualquer defeito de seta ou desenho → recortar em pedaços de 1500px e olhar um a um (regra na
  skill).
- 2026-10-02 · desenho · Gênesis: a escada de "Gênesis e Cristo" ia de borda a borda e, sobre o
  disco claro do cartão escuro, a linha do chão e a pedra saíram cortadas pelo círculo. O tronco
  de Isaías (já publicado) tem o mesmo defeito nas raízes → o desenho de "[Livro] e Cristo" cabe
  num círculo de raio 54 em volta de (60,60); conferir com `ferramentas/ver-desenhos.mjs`, que
  mostra o desenho também sobre o disco (regra na skill). O tronco de Isaías fica para corrigir.
- 2026-10-02 · desenho · A túnica de José saiu com cara de camiseta, e o disco sálvia atrás da
  nuvem da escada vazava por baixo dela → roupa se reconhece pelo traço que a define (manga
  comprida, barra até os pés); forma escondida atrás de outra tem de ficar toda escondida ou
  aparecer de propósito (o sol espiando por cima da nuvem).
- 2026-10-02 · conteúdo · "o homem... encarregado de cuidar do resto" em Gn 1.26-28, que diz
  "dominem": o verbo veio de Gn 2.15. E o choro de José estava em 45.2 com a referência 45.3-8 →
  a paráfrase usa o verbo do versículo citado, e a referência cobre todo fato da frase.
- 2026-10-02 · conteúdo · Tirei "(isto é, Jerusalém)" do meio da citação de Gn 14.18 sem marcar,
  e o checador barrou → palavra cortada no meio de citação vira reticências ("rei de Salém...
  sacerdote").
- 2026-10-02 · tela · "odiá-lo" quebrou no hífen ("odiá-" / "lo") e o subtítulo do ramo 4 deixou
  "povos" sozinho na linha → fim de frase sem pronome com hífen; subtítulo do ramo com até uns 30
  caracteres, para caber numa linha ao lado do desenho a 390px (regra na skill).
- 2026-10-02 · teste · O teste-mapas supunha que o livro do dia 1 do plano não tinha mapa; com
  Gênesis publicado o cartão do Explorar passou a ser "Mapa de Gênesis" e duas checagens caíram.
  E a geometria (curvas fora do texto, desenhos, setas, largura) só era conferida em Isaías → o
  teste confere os dois casos do cartão e passa por todo mapa do índice a 390 e 360px.
- 2026-10-02 · tela · O nome original no significado saía sempre com `dir="rtl"`, certo para o
  hebraico e errado para o grego dos mapas do NT → `dir` pela língua.
- 2026-10-02 · publicação · Para ver um mapa novo na tela é preciso pô-lo no índice, que é também
  o que o publica → o mapa entra no índice para a revisão em tela, e quem revisa decide se ele
  fica antes do commit (o índice diz o que vai ao ar).
- 2026-10-02 · revisão · A revisão de Gênesis achou fatos fora da referência do item: "quase
  cego" (27.1) em 27.15-23, "Fugindo" sem 27.41-45, "No monte Moriá" (22.2) em 22.7-13, "Velha
  demais" (18.11) em 21.1-6, "Sem filhos" (15.2-3) em 15.5-6, "acusação falsa" fora de 39.19-23,
  "Judá, que sugeriu vender José" (37.26) em 44.18-34, "chega do campo" onde a NBV diz "em casa",
  e "sai levando só uma promessa" quando 12.5 conta que Abrão levou Ló e todos os bens → conferir
  cada adjetivo e cada circunstância contra o trecho exato da referência, não só o fato principal
  (o checador só vê citações entre aspas; o resto é leitura humana, versículo por versículo).
- 2026-10-02 · conteúdo · Gênesis saiu sem a mudança de nome Abrão/Abraão e a aliança (Gn 17), sem
  o reencontro de Jacó e Esaú (Gn 33) e sem a descida de Jacó ao Egito (Gn 46): o mapa passava de
  "Abrão creu" para "Abraão intercede" sem explicar, e o ramo de José parava no capítulo 45 →
  exaustividade: listar os capítulos de cada ramo e conferir que todo marco narrativo (troca de
  nome, aliança, reencontro, mudança de terra, morte do protagonista) aparece num galho, numa
  conexão ou numa curiosidade; juntar dois galhos de um mesmo capítulo para abrir espaço.
- 2026-10-02 · conteúdo · A curiosidade de Gn 32.32 repetia a autoria (o "até hoje" da mesma
  referência), e as curiosidades não seguiam a ordem do livro (Gn 16 depois de Gn 6 trocado) →
  cada referência aparece uma vez no mapa; curiosidades na ordem dos capítulos.
- 2026-10-02 · desenho · Na revisão ampliada: o cabo da fruta não tocava o galho nem a fruta (3
  unidades de folga em cada ponta), os pés da panela começavam abaixo do bojo, soltos, e a tenda
  tinha dois riscos saindo para baixo do chão, sem função → calcular o ponto de encontro na curva
  (não chutar a coordenada) e apagar todo traço que não representa nada.
- 2026-10-02 · tela · Subtítulo do ramo 1 com 36 caracteres ("Deus fala, e o mundo passa a
  existir") passou da regra dos 30 que tinha acabado de entrar na skill → contar os caracteres do
  `sub` antes de entregar (o checador podia avisar).
- 2026-10-02 · captura · A captura do mapa saiu escurecida, com a folha "Antes de continuar" por
  cima, porque a conta de teste ainda não tinha dado o consentimento da versão nova; e o cookie da
  pasta errada abriu a página de entrada → usar o cookie da pasta de estado do servidor que está no
  ar e, se a folha aparecer, mandar `POST api/consentimento` com esse cookie antes de capturar.
- 2026-10-02 · desenho · Mateus: o barco escondia o fundo do casco atrás de um retângulo de papel
  (`.p`) sob a onda. No `ver-desenhos` (fundo branco) não aparecia; na tela, sobre o fundo cinza da
  página, virou uma caixa branca atrás do desenho → papel só dentro de um contorno do objeto; para
  pôr o casco na água, o fundo do casco é a própria curva da onda (pontos tirados da curva). Olhar
  o desenho também na tela de verdade, não só na folha do `ver-desenhos` (regra na skill).
- 2026-10-02 · tela · As conexões de Mateus saíram com até 247 caracteres (Gênesis: até 166), e a
  curva do ramo 3 cruzou o texto a 360px no `teste-mapas` → conexão até uns 180 caracteres; o teste
  de navegador a 360px é o que pega isso (regra na skill).
- 2026-10-02 · conteúdo · O `grep` da skill acusou "plateia" por causa de "teia" (o checador já usa
  `\bteia\b`) → o grep da skill passou a usar `\b` em "teia" e "dança" (regra na skill).
- 2026-10-02 · conteúdo · Na leitura versículo por versículo, ainda antes da tela, saíram fatos fora
  da referência do item: "jejum" em Mt 6.1-9 (o jejum é 6.16-18), "Na ceia da Páscoa" em 26.26-28 (a
  Páscoa é 26.17-20), "as trinta moedas" em 27.3-8 (o número é de 27.9), "Nazaré" com a ref 13.57 (a
  cidade é 13.54) e "abre os braços", que nenhum versículo diz → a regra da paráfrase fiel vale; a
  conferência é por item, lendo o trecho exato, e figura de linguagem que parece fato sai.
- 2026-10-02 · conteúdo · Ao trocar "as trinta moedas" por "o dinheiro", o pronome da frase seguinte
  ficou "pô-las", sem concordância, e só a captura mostrou → depois de mexer num substantivo, reler
  a frase inteira e a seguinte.
- 2026-10-02 · desenho · O primeiro túmulo de "Mateus e Cristo" parecia um iglu: cúpula lisa e
  hachuras em arco → rocha se reconhece pelo contorno irregular e por rachaduras retas e curtas.
- 2026-10-02 · conteúdo · Num evangelho, "[Livro] e Cristo" não tinha modelo: Gênesis e Isaías
  ligam o AT ao NT → no NT, os pares vão da profecia que o próprio livro cita (`at`, texto da NBV do
  AT) ao trecho do livro que a cumpre (`nt`); o destaque `jesus` usa a referência do próprio livro
  quando o texto identifica a figura (Mt 13.37) ou outro livro do NT (At 4.10-11) (regra na skill).
- 2026-10-02 · captura · Com Mateus no índice, as capturas do Explorar em `design/mapas/capturas/`
  (feitas com Gênesis e Isaías) ficam desatualizadas: Mateus deixa de ser "em breve" → quem decidir
  publicar o mapa refaz `explorar-390-*` junto.
- 2026-10-02 · revisão · A revisão adversarial de Mateus ainda achou fatos fora do trecho ou
  trocados: "o corpo roubado" (28.13) com a ref 28.15, José que "pensa em" romper o noivado (a NBV
  diz "decidiu"), a frase "Venham comigo..." posta na boca de Jesus para os "dois pares de irmãos"
  (foi dita a Pedro e André), "sábios do Oriente" em 2.9-16 (o Oriente dos sábios é 2.1), "saem
  dali", "Pedro tenta impedir", "afunda" (começou a afundar), "estrangeiro" (a NBV diz "estranho"),
  "Arrependido" (remorso), Pedro "falando a todo o povo" em At 4.10 (falava aos líderes), "trinta
  moedas" (são "peças de prata") e "O semeador é Jesus" quando Mt 13.37 diz "o agricultor" →
  conferir cada verbo e cada substantivo contra a NBV, inclusive no destaque `jesus` e no "procure".
- 2026-10-02 · conteúdo · A conexão do ramo 4 dizia "Logo depois, Herodes manda decapitar João",
  mas Mt 14.3-12 é um flashback: João já tinha morrido quando Herodes ouve falar de Jesus → "logo
  depois", "então" e "a partir daí" só quando o livro narra em sequência; relato retrospectivo
  ("Pois Herodes tinha mandado...") se conta como passado (regra na skill).
- 2026-10-02 · conteúdo · A raiz dizia que "o livro abre com um nome, Emanuel", mas o livro abre
  com a lista de antepassados (Mt 1.1); Emanuel é 1.23 → "abre com" e "fecha com" só com o
  primeiro e o último versículo de verdade.
- 2026-10-02 · conteúdo · O chamado de Mateus (9.9) aparecia na autoria e num galho, e 4.17 na
  raiz e na conexão → a autoria fica com a lista dos Doze (10.3) e a raiz com a Grande Comissão
  (28.19-20), que antes não aparecia em lugar nenhum.
- 2026-10-02 · conteúdo · Exaustividade: os capítulos 15, 19 e 22 de Mateus não apareciam em
  nenhum item, e o ramo 5 (14 a 20) pulava dois deles → listar os 28 (ou N) capítulos e marcar
  onde cada um aparece (galho, conexão, curiosidade, autoria); o que faltar entra numa curiosidade
  (a cananeia, o camelo e a agulha, a moeda de César) (regra na skill).
- 2026-10-02 · conteúdo · O subtítulo do ramo 4 ("O Reino contado em histórias") só valia para três
  dos seis galhos (os outros são a dúvida de João e a recusa das cidades) → o subtítulo resume o
  ramo inteiro, não o galho mais bonito.
- 2026-10-02 · estilo · "No barco, as ondas começam a inundar o barco"; "homens!”. Logo" e "sou?”.
  Pedro" (ponto depois de exclamação ou interrogação que fecha a citação); e "boas-novas" quebrou
  no hífen ("boas-" / "novas") a 390px → nada de palavra repetida na mesma frase, nenhum ponto
  depois de "!”" ou "?”", e palavra com hífen nos galhos só se não houver outra (regra na skill).
- 2026-10-02 · desenho · O lírio tinha as duas folhas em sálvia (a regra é uma área só), e o sol
  do túmulo era um disco sálvia solto que parecia uma bola → conferir a contagem de áreas `.s`;
  sol se reconhece pelos raios curtos (oito traços de hachura em volta).
- 2026-10-02 · conteúdo · A conexão do ramo 4, reescrita na revisão, saiu com 187 caracteres →
  medir de novo toda conexão que mudar (até uns 180).
- 2026-10-02 · captura · A página inteira de Mateus (10.575px) a 2x travou o `foto-conta` (a
  imagem passaria de 21.000px) sem erro nenhum, e um `pgrep -f` com o padrão dentro do próprio
  comando matou o shell de novo → `foto-conta` ganhou `ESCALA` (use 1.5 em página com mais de uns
  10.000px) e todo comando de captura vai com `timeout`; processo se mata pelo PID que `ps` mostra,
  nunca por padrão de texto (regra na skill).
- 2026-10-02 · tela · O dono viu no iPhone as setas "tortas e quebradas": a cúbica tinha o
  primeiro ponto de controle quase no fundo (alt - 10) e o segundo lá em cima, então a linha
  descia reta e dobrava num cotovelo perto do fim; e a ponta era um "v" fixo para baixo, que não
  seguia a direção em que a curva chegava → S simétrico (pontos de controle a 55% da altura, um em
  cada ponta, saindo e chegando na vertical), ponta desenhada na tangente do fim com o bico no fim
  da linha, passo do pontilhado acertado pelo comprimento da curva; o `teste-mapas` mede tudo isso
  a 390, 375 e 360px (regra na skill).
- 2026-10-02 · conteúdo · As conexões chegaram a 166 (Gênesis) e 178 caracteres (Mateus), dentro
  dos "uns 180" da skill, e mesmo assim davam seis linhas a 390px numa coluna estreita: a área da
  curva ficava alta e o mapa, comprido. A regra de 180 tinha saído de um defeito (a curva cruzando
  o texto), não do que fica bom de ler → conexão é uma frase de ligação com até 150 caracteres
  (3 a 4 linhas a 390px); o `checar-mapa` barra o que passar e o `teste-mapas` confere as 4
  linhas na tela (regra na skill). Medido na tela, 150 caracteres ainda davam 5 a 6 linhas na
  coluna de 52%: a coluna da conexão passou a 64% e as conexões de Gênesis, Mateus e uma de
  Isaías ficaram entre 69 e 127 caracteres, conferidas de novo na NBV (sem repetir palavra na
  frase: "Herodes, que mandou matar João, pensa que Jesus é João" repetia "João").
- 2026-10-02 · tela · O cartão dos mapas no alto do Explorar levava ao mapa de hoje ou rolava a
  página até a grade dos 66 no fim; o dono não quis o pulo e teve medo de a página ficar poluída
  → um cartão só, que abre e fecha no lugar (botão com `aria-expanded`), lembra o estado e mostra
  um testamento por vez; a seção do fim saiu. Abrir e fechar mede a cabeça (ou o fim do cartão,
  no "Fechar") antes e depois e compensa a diferença, para nada na tela pular (regra na skill).
- 2026-10-02 · tela · Dentro do cartão a célula da grade ficou mais estreita, e "1
  Tessalonicenses" a 15px passou da borda a 360px; "Antigo Testamento" quebrou em duas linhas no
  segmentado → nomes com mais de 12 letras a 14px, segmentado a 13px abaixo de 375px; o
  `teste-mapas` confere os dois testamentos a 360px (largura dentro da célula, uma linha só).
- 2026-10-02 · desenho · Êxodo: a água da rocha (Êx 17.6) precisou de quatro tentativas: um retângulo
  sálvia reto parecia uma régua, três traços saindo de um ponto pareciam raízes, e um jorro
  descendo pela frente da rocha parecia uma bandeira fincada no chão; bolinhas de papel como
  gotas viraram botões → água se reconhece pelo arco: sai de lado, da borda da rocha, curva e cai
  numa poça, com traços de respingo; nada de gota em círculo. E o cesto de Moisés, aberto e com o
  fundo sálvia, parecia uma tigela de sopa até ganhar o menino enrolado no pano lá dentro (regra
  da água na skill).
- 2026-10-02 · conteúdo · Êxodo tem 40 capítulos e, com seis ramos, os do Tabernáculo (25 a 31 e
  35 a 40) ficavam sem galho → um galho pode citar um bloco de capítulos quando o fato é o bloco
  ("Êx 25–27", o modelo das peças), e vários versículos do mesmo capítulo vão numa referência só
  ("Êx 28.12, 29, 36-38"; "Êx 32.1-4, 19, 31-32") para caber o capítulo inteiro num galho.
- 2026-10-02 · teste · O `teste-mapas` usava Êxodo, fixo, como "livro sem mapa" e caiu quando
  Êxodo ganhou o seu → o teste escolhe o primeiro livro do cânon fora do índice; nada de livro
  fixo em teste que depende de quais mapas já saíram.
- 2026-10-02 · tela · As conexões de Êxodo tinham de 122 a 138 caracteres e deram 5 linhas a
  390px (as de Gênesis, com até 127, davam 4): referência entre parênteses e palavra longa pesam
  mais que a contagem → mirar em até uns 115 caracteres e conferir as linhas no `teste-mapas`.
  E "à beira-mar" quebrou no hífen numa conexão ("beira-" / "mar"): a regra do hífen vale também
  para conexão e curiosidade, não só para galho ("perto do mar", "No meio da noite") (regra na
  skill).
- 2026-10-02 · conteúdo · Na releitura contra a NBV: "No deserto de Sim" com a ref 16.3-18 (o nome
  é de 16.1), "setenta líderes" em 24.9 (lá são "setenta oficiais"), "pavimento de safira" (a NBV
  diz "pavimento de pedras de safira") e uma curiosidade que trazia um fato de 8.19 sob a ref
  31.18 → a releitura item por item acha o que o checador não acha; fato de outro versículo vai
  com a referência dele entre parênteses.
- 2026-10-02 · conteúdo · Na revisão de Êxodo, depois do escritor: "manda tirar a palha dos tijolos"
  (Êx 5.7 diz que o povo passa a juntar a palha, não que ela sai do tijolo); a fenda da rocha
  contada como fato ("Deus o põe numa fenda") quando Êx 33.21-23 é promessa; "Jetro" num item
  com ref 18.13-25 (o nome está em 18.1; ali é "o sogro de Moisés"); "Na oferta do
  recenseamento" com ref 30.15 (a palavra está em 30.12); e os capítulos 35, 37 e 39 sem lugar
  no mapa → promessa e ordem se contam como promessa e ordem, nome próprio só se está no trecho
  citado, e a lista de capítulos se confere de verdade, um por um, antes de entregar (regra na
  skill).
- 2026-10-02 · desenho · A água da rocha de Êxodo, na quarta versão, ainda entrava no meio de uma
  poça pequena e parecia um cano verde enfiado num bueiro → o jorro cai sobre a borda de cima de
  uma poça larga, com respingos dos dois lados e uma ondinha dentro; nada de jorro entrando no
  centro da elipse (regra da água na skill).
- 2026-10-02 · painel · Levítico: mesmo com a regra registrada logo acima, o primeiro update do
  painel saiu com a hora de cabeça ("16:20" quando eram 16:12) → rodar `TZ=America/Sao_Paulo date`
  no mesmo passo em que se lê o documento do painel, antes de montar o update; ler a regra não basta.
- 2026-10-02 · conteúdo · Levítico: os versículos mais fortes (16.16, 16.30, 19.18, 12.8) eram
  disputados pela raiz, pelas conexões, pelos galhos e pelos pares, e a regra "cada referência uma
  vez" obrigou a refazer três trechos → antes de escrever, montar a tabela dos versículos-chave e
  decidir onde cada um mora (raiz, galho, conexão, par, curiosidade); o resto se escreve em volta.
- 2026-10-02 · conteúdo · Na releitura de Levítico, antes do checador: "roupas simples de linho"
  (16.4 não diz "simples"), "Deus garante" sobre 26.42, que é promessa com condição ("se
  confessarem", 26.40-41), "quem a comesse perdia tudo" em 7.18 (quem perde é quem ofereceu),
  "frutos guardados" em 19.23 (a NBV diz "não comam") e a ordem de 8.33-35 contada como fato →
  promessa condicional leva o "se" junto; quem sofre a consequência é quem o versículo diz (regra
  na skill).
- 2026-10-02 · conteúdo · No texto de "[Livro] e Cristo" o checador só confere as aspas contra a
  `ref` do Antigo Testamento; uma citação do NT entre aspas ali reprova → no cartão, o NT entra em
  paráfrase com a referência entre parênteses (Mt 27.51, Hb 10.19-20); aspas do NT só no destaque
  `jesus`, que tem `refs` próprias (regra na skill).
- 2026-10-02 · estilo · Uma curiosidade abria com a citação “Levantem-se...” (19.32): o hífen está
  na própria NBV e quebraria a linha a 390px → quando o hífen vem da citação, troca-se a citação
  por paráfrase ("ficar de pé diante das pessoas idosas").
- 2026-10-02 · tela · O título "Santos no dia a dia" (19 letras no pincel) quebrou em duas linhas
  ao lado da balança a 390px; "O Dia do Perdão" e "Festas e jubileu" (15 e 16) couberam → título
  de ramo com até uns 16 caracteres; mais que isso, conferir na captura (regra na skill).
- 2026-10-02 · desenho · Levítico, na revisão ampliada: os raios da barbatana do peixe passavam do
  contorno; a barbatana de baixo parecia um balde pendurado; o bode tinha cascos em "T" (pés de
  mesa), orelha que parecia prato, barbicha que parecia presa e a duna sálvia fechada por uma reta
  (virou uma laje) → raio de barbatana sai da base e para a 60% do caminho até o bico (fica dentro
  de qualquer contorno convexo); pescoço e cabeça num `path` aberto com `.p`, que o papel fecha por
  dentro do corpo e esconde a junção sem traço sobrando; casco é um trapézio cheio (`.e`) assentado
  na curva do chão; preenchimento de chão fecha por uma curva rasa, não por uma reta (regra na
  skill). Peça que não ajuda a ler o objeto (a barbatana de baixo) sai.
- 2026-10-02 · servidor · Ao começar Levítico havia um `servidor.mjs 8110` vivo nesta pasta, de uma
  sessão anterior, servindo um build velho (hashes da CSP de antes) → quem termina uma rodada mata
  o próprio servidor pelo PID; quem chega não usa servidor que não subiu, sobe o seu numa porta
  própria.
- 2026-10-02 · conteúdo · Revisão de Levítico, versículo por versículo na NBV, depois do checador
  passar: "um dia de purificação" com Lv 16.33 (o versículo fala da cerimônia, o "dia" é de 16.30);
  "Canaã, para onde está indo" (18.3 diz "para onde estou levando vocês": o sujeito é o Senhor);
  "natural da terra" (19.34 diz "naturais do povo de Israel"); "derrama o sangue na terra e o
  cobre com terra" (palavra repetida na frase) → o checador só pega aspas e palavras proibidas;
  sujeito, verbo e substantivo da paráfrase se conferem lendo o versículo inteiro, item por item.
- 2026-10-02 · conteúdo · Levítico: os destaques `jesus` dos ramos 2 e 4 abriam igual ("O sumo
  sacerdote que...") e o do ramo 2 exagerava Hb 7.27 ("não precisa oferecer nada", quando o texto
  diz que ele não oferece sacrifícios diários pelos próprios pecados) → os destaques de um mesmo
  mapa abrem de jeitos diferentes (o checador só compara itens vizinhos da mesma lista) e não
  dizem mais que o versículo do NT (regra na skill).
- 2026-10-02 · conteúdo · Marcos: antes de escrever, montei a tabela dos versículos-chave (1.1,
  10.45, 15.39 e 16.20 na raiz; 14.61-62 no destaque `jesus`; 15.34 e 15.27-28 nos pares) e a lista
  das faixas de cada item; com isso nenhuma referência caiu em dois lugares e não precisei refazer
  trecho nenhum, ao contrário de Levítico → a tabela vale a pena também em livro curto.
- 2026-10-02 · conteúdo · Na releitura de Marcos versículo por versículo, depois do checador passar:
  "Herodes acha" (6.16 diz que ele "dizia"), "os outros o prendem" (14.46: "a multidão"), "passa
  quarenta dias no deserto" sem o Espírito que o leva (1.12), "os familiares vêm buscar Jesus"
  (3.21: "vieram tentar levá-lo"), "palavras estrangeiras" (o livro só traduz; chamar de
  estrangeiras é dedução) → a regra da paráfrase fiel pega até sujeito e verbo auxiliar; a
  releitura item por item continua obrigatória mesmo com o checador verde.
- 2026-10-02 · estilo · Marcos: o destaque `jesus` citava 1Pe 2.7 com "tornou-se" dentro das aspas, e
  o `grep` da skill não procura hífen → a lista de antes de entregar ganhou um `grep` de palavra com
  hífen (regra na skill).
- 2026-10-02 · tela · Marcos: conexões de 113 a 118 caracteres com duas referências e uma citação
  longa ("Que vocês não sejam encontrados dormindo") deram 5 linhas a 390px no `teste-mapas`, e três
  delas 5 linhas a 360px → com duas referências entre parênteses, mirar em uns 100 caracteres;
  citação longa na conexão vira palavra solta entre aspas ("Vigiem") (regra na skill).
- 2026-10-02 · captura · A captura da página inteira a 360px saiu cortada no meio das curiosidades,
  sem erro: o `foto-conta` para em 12.000px de CSS e Marcos tem uns 12.300 a 360px → o
  `foto-conta` passou a avisar quando corta e a dizer o `rolar` para pegar o resto; o fim da página
  se captura sem `CHEIA`, com `rolar` (regra na skill).
- 2026-10-02 · desenho · Marcos: a pomba de lado parecia uma lesma com uma orelha (a asa de trás
  aparecia como um triângulo solto) e a água sálvia, uma salsicha; a cruz num montinho sálvia
  parecia túmulo; a moeda em pé tinha a base em cima da borda da moeda deitada → pomba que desce se
  desenha de frente, cabeça para baixo, asas abertas e cauda em leque (simétrica, lê na hora); a
  cruz fica no alto de um monte largo, com o caminho subindo, não num montinho; peça apoiada em
  outra tem o ponto de apoio calculado dentro da face de cima (elipse), não chutado (regra na
  skill).
- 2026-10-02 · revisão · Marcos, na revisão adversarial (versículo por versículo na NBV, depois do
  escritor e do checador verdes): "região de Tiro" (7.24 diz "Tiro e Sidom"); "dar o pão aos
  cachorrinhos" (7.27: "tirar o pão... e jogá-lo"); "Em Jerusalém, o povo saúda" (11.10 é ainda na
  estrada, 11.11 é que entra na cidade); "o mesmo salmo" no destaque de 1Pe 2.7 (nem Marcos nem
  Pedro dizem que é salmo: é nome de fora); "um cego vê primeiro árvores andando" (8.24: vê homens
  que parecem árvores); "Jesus solta outro forte grito" num galho que não traz o primeiro grito
  (15.34 ficou nos pares); "Quem narra conversa com quem lê" na autoria (13.14 está dentro da fala
  de Jesus; dizer que é o narrador é dedução) → palavra de lugar ("em Jerusalém"), de gênero ("salmo")
  e de retomada ("outro", "de novo") também se confere no versículo; "outro" sem o primeiro no
  mesmo item vira "um" (regra na skill).
- 2026-10-02 · exaustividade · Marcos tinha deixado fora a troca de nome de Simão para Pedro (3.16),
  o sepultamento (15.43-46) e Jesus levado aos céus (16.19), embora a skill peça toda troca de nome
  e o fim do livro; a raiz dizia que "o livro fecha" com 16.20 sem o 16.19 → viraram duas
  curiosidades e a raiz passou a citar 16.19-20. Ao listar os marcos, incluir também sepultamento e
  subida aos céus (regra na skill).
- 2026-10-02 · desenho · Marcos, revisão: a água sálvia da pomba continuava uma salsicha (faixa
  fechada nas pontas), o caminho da cruz em duas linhas paralelas parecia rachadura e, no cesto,
  os pães tinham a base reta na altura da borda (pareciam colados numa tampa) e o peixe flutuava
  acima da borda da frente → rio em ondas de traço, sem área sálvia; caminho com as beiras se
  abrindo para baixo; o que está dentro de um cesto ou de uma vasilha desce até abaixo da borda
  da frente, que o cobre (regra na skill).
- 2026-10-02 · tela · Marcos: a conexão do ramo 3 com 115 caracteres deu 4 linhas a 390px e 5 a
  360px, e o `teste-mapas` só conta as linhas a 390 → depois de mexer numa conexão, olhar também a
  captura de 360px; a frase saiu com 99 caracteres.
- 2026-10-02 · captura · Juntar a captura da página inteira (que para em 12.000px) com o resto
  capturado com `rolar` duplica a barra de baixo, que fica fixa no fim da janela grande → o resto
  se cola a partir de uns 150px abaixo do topo dele, cobrindo a barra da primeira captura.
- 2026-10-02 · conteúdo · Números, na releitura item por item depois do checador verde: "Moisés se
  queixa" onde Nm 11.11 diz "perguntou"; "ciúmes" no título de um ramo cujo ciúme (11.29) mora numa
  curiosidade; "vinte anos ou mais" onde 14.29 diz "mais de vinte"; "menos Calebe e Josué" ligado a
  "morrerá" quando 14.30 os exclui de entrar na terra; nome de lugar (Hor, 20.27), nome de pessoa
  (Seom, 21.23), número (seis, 35.13) e o pagamento do resgate (3.49) fora da referência; quem tem
  medo em 22.3 é Moabe, não o rei; a jumenta que "se desvia três vezes" (sai do caminho, se
  espreme no muro e se deita); e leis contadas como costume ("Cada israelita usava pingentes")
  → além do verbo, conferir quem faz, quantas vezes e se é ordem ou fato; a folha de releitura que
  põe cada item ao lado do texto da referência virou `ferramentas/rever-mapa.mjs` (regra na skill).
- 2026-10-02 · tela · Números: o título "O povo abençoado" (16 caracteres) cabia numa linha a 390px
  e quebrou em duas a 360px ao lado da jumenta: letras largas (ç, ã, maiúsculas do pincel) pesam
  mais que a contagem → o título do ramo se confere na captura de 360px, não só na de 390; virou
  "Povo abençoado" (regra na skill).
- 2026-10-02 · teste · Números: o `teste-mapas` passou a contar as linhas do nome de cada ramo
  (caixas do texto) a 390, 375 e 360px. Na primeira rodada, quatro mapas já publicados reprovaram:
  "A promessa a Abraão" (Gênesis), "Escravos no Egito", "A sarça e o chamado", "O mar e o deserto"
  e "A morada de Deus" (Êxodo), "O Santo no trono", "Juízo sobre as nações" e "Consolo e o Servo"
  (Isaías), "Sermão do monte", "Sementes do Reino" e "O Rei em Jerusalém" (Mateus) quebram em duas
  linhas, alguns só a 375 e 360px, mesmo com 15 ou 16 caracteres → ficaram numa lista de exceções
  do teste (aviso, não reprovação), para quem revisa cada mapa trocar o nome; nome novo que quebrar
  reprova. A regra dos 16 caracteres é um ponto de partida, a medida é a tela de 360px.
- 2026-10-02 · desenho · Números, na revisão ampliada: a folha do cacho de Escol caiu de novo por cima
  das uvas de cima e o talo parava antes da primeira uva; na vara de Arão, flores feitas de
  círculos pareciam frutinhas e galhos curvos pareciam ganchos; a serpente ganhou uma trave em T
  que o texto não tem (Nm 21.8 diz "poste") e o pescoço se embolou com ela; na jumenta, a
  focinheira terminava solta, longe da argola, e a rédea saía colada na linha da garganta,
  formando uma cunha cheia → folha de cacho vai ao lado do talo, nunca sobre as uvas; flor se
  desenha com pétalas (cinco elipses em volta de um miolo cheio) na ponta de galho reto; peça
  que o versículo não traz sai do desenho; correia de arreio fecha na argola, e linha que sai de
  um ponto do contorno abre ângulo largo com ele. Um zoom a 520px achou defeitos que a folha de
  280px escondia → o `ver-desenhos` ganhou `TAMANHO=520` (regra na skill).
- 2026-10-02 · desenho · Parte sálvia com contorno `.k` dentro de outra peça (o miolo da orelha)
  desenha uma orelha dentro da outra → área de cor interna vai só com `.s`, sem traço.
- 2026-10-02 · desenho · Animal em busto (a jumenta) com o pescoço fechado por uma reta parece
  estátua cortada → o papel `.p` fecha por baixo sem traço e o contorno `.k` fica aberto.
- 2026-10-02 · conteúdo · Números, na revisão adversarial (depois da releitura do escritor e do
  checador verde), ainda havia: "só Calebe e Josué entrarão na terra" (14.30 exclui só os de mais
  de vinte anos; os filhos entram, 14.31); "Seom, rei dos amorreus" e "o grupo de Coré" com o
  título e o nome fora da referência da conexão (21.21; 16.1-2); "a palavra que sai da boca de
  Balaão" onde 23.5 diz que o Senhor a põe ali; "Moisés revela" com Moisés fora da referência
  (31.15); "longe do Tabernáculo" onde 11.26 diz só que não foram; "o primeiro nome da lista é
  Calebe" quando Eleazar e Josué vêm antes (34.17); "até sete no último" numa festa que tem oitavo
  dia (29.35); três curiosidades de lei ainda no imperfeito de costume ("entrava", "servia",
  "carregavam"); e o "procure" dizendo que "queixa" se repete do capítulo 11 em diante, quando a
  contagem na NBV dá só os capítulos 11, 14, 16, 17 e 21 → "só", "primeiro", "último" e "do
  capítulo X em diante" se conferem lendo também os versículos vizinhos e contando no livro
  (regra na skill); curiosidade de lei se escreve no presente da ordem ("a lei manda", "quem faz
  o voto não come").
- 2026-10-02 · desenho · Números, na revisão: a jumenta ainda tinha a rédea saindo do pescoço e
  terminando no ar, fora do desenho, e a correia da face parando 4 unidades abaixo do contorno
  da cabeça (ponta solta a 520px) → correia termina num contorno (ponto tirado da curva), e
  linha que não chega a nada sai do desenho.
- 2026-10-02 · conteúdo · Deuteronômio, na releitura com o `rever-mapa` (checador já verde): o destaque
  `jesus` dizia que as três respostas de Jesus ao Diabo foram "no deserto", mas a segunda é no templo
  e a terceira num monte (Mt 4.5, 8); a raiz dizia "antes da travessia" com refs que só põem o povo
  a leste do Jordão; o "procure" dizia que "a frase volta" quando ela volta com variações ("Lembre-se
  de que", "Não esqueçam nunca de que") → circunstância de lugar vale também para o texto do NT; e
  frase que se repete com variação se descreve como "a lembrança volta, quase com as mesmas
  palavras", depois de conferir cada ocorrência na NBV.
- 2026-10-02 · estilo · O português impessoal traz hífen sem pedir licença: "vende-se, leva-se e
  compra-se", "passaram-se trinta e oito anos", e a citação “Não posso levá-los sozinho” → o `grep`
  de hífen da skill pega; a troca é pôr sujeito ("o povo pode vender... levar... comprar"), outro
  verbo ("foram trinta e oito anos") ou paráfrase da citação.
- 2026-10-02 · desenho · Deuteronômio: no cesto da colheita, as duas espigas lado a lado encostavam os
  grãos de dentro e embolavam com as uvas; o talo do cacho saía do vão entre duas uvas e ficava solto;
  no monte Nebo, a terra sálvia fechada por uma reta vertical na direita parecia um bloco (e, antes,
  com a palmeira, uma ilha) → espigas vizinhas se abrem em V, com as espigas acima das frutas; talo
  sai do alto de uma uva (ponto tirado do círculo); terra distante desce até o chão numa curva.
- 2026-10-02 · tela · Deuteronômio no índice: o `teste-mapas` reprovou duas coisas que só aparecem com o
  mapa no ar. O nome "Deuteronômio" (12 letras, 17px) passou da célula pronta do Explorar a 360px,
  porque a célula pronta tem a seta à direita e a "em breve" não; e o título "Justiça e cuidado"
  (17 caracteres) quebrou em duas linhas a 375px, mas não a 360 nem a 390 (a coluna muda de largura
  entre os tamanhos) → nomes de 12 letras a 15px (a 14px ficava miúdo ao lado dos vizinhos); o
  ramo virou "Justiça diária". O título se confere nos três tamanhos do teste, não só a 360.
- 2026-10-02 · tela · O rótulo "DEUTERONÔMIO E CRISTO" quebrou a 360px deixando o "E" pendurado no fim
  da primeira linha → o rótulo do cartão escuro ganhou `text-wrap: balance` ("DEUTERONÔMIO / E
  CRISTO"); vale para todo livro de nome longo.
- 2026-10-02 · conteúdo · Revisão adversarial de Deuteronômio (checador e `teste-mapas` já verdes): fato no
  versículo vizinho em duas curiosidades ("no sétimo ano" está em Dt 15.12, não em 15.16-17; "Páscoa"
  está em 16.1-2, não em 16.3); "encerra" com Dt 33.27, mas a bênção vai até 33.29; "o texto marca o
  dia" sem dia em Dt 31.24; "conversar com os filhos" juntava duas ordens de Dt 6.7 (ensinar aos
  filhos; conversar em casa e no caminho); "cortadas" nas tábuas de Dt 10.3, onde a NBV diz
  "preparei"; lei do rei no presente de fato ("não junta") → "não pode juntar"; "profeta" duas vezes
  na mesma frase; e dois pares de itens seguidos abrindo igual ("Na colheita" / "Nas vendas"; "Na
  desobediência" / "Nas planícies") → verbo de fim ("encerra", "fecha") só com o último versículo do
  trecho; todo dado de tempo, festa ou lugar de uma curiosidade se procura nos versículos vizinhos e a
  referência se amplia; "Na X" / "Nas Y" conta como a mesma abertura.
- 2026-10-02 · desenho · Deuteronômio na revisão: a cruz grande num monte raso de "Deuteronômio e Cristo"
  parecia sepultura (a regra já existia e escapou); o monte Nebo, com palmeira e ondas, virava ilha na
  praia, depois moita (terra alta e estreita) e, com três tracinhos de campo, um rosto na tela pequena;
  no cesto, a espiga da esquerda passava por trás das uvas → a cruz encolheu e o monte subiu (pés a 50
  do centro, dentro do disco); a terra do Nebo virou colinas baixas e largas com o rio descendo pelo
  vale, sem tracinhos; o cesto ficou com uma espiga só. Tracinho solto dentro de área lisa se confere
  no tamanho da tela (96px): três traços curtos viram olhos e boca.
- 2026-10-02 · conteúdo · Lucas tem 24 capítulos e a viagem para Jerusalém (9.51 a 19.27) ocupa quase
  metade: com o teto de 6 ramos, a Galileia (6 a 9.50) virou um ramo só e vários milagres foram para
  as curiosidades → em livro longo, montar primeiro a tabela de capítulos por ramo e decidir o que vai
  para curiosidade antes de escrever galho; a fala de Lc 24.44 ("Lei de Moisés, Profetas e Salmos")
  deu a moldura natural para os pares de "[Livro] e Cristo".
- 2026-10-02 · conteúdo · Lucas, na releitura com o `rever-mapa` (checador já verde): "Aos 12 anos"
  com a ref Lc 2.49 (o número está em 2.42); "Nazaré" num galho de 4.22-30, quando o nome está em 4.16,
  que o par de Is 61 já usava; "Maria canta" onde a NBV diz "Maria disse"; "querem pedir fogo" onde
  9.54 é pergunta ("podemos pedir?"); "queriam dar o nome" onde 1.59 diz "julgavam"; "Deus se apresenta"
  na sarça, quando em 20.37 é Moisés quem fala de Deus assim; "a primeira pregação, em Nazaré" (4.15
  já conta o ensino nas sinagogas antes) → número e idade se conferem como nome e lugar; quando outro
  item já usa o versículo do nome do lugar, o galho escreve em volta ("na sinagoga da cidade dele",
  4.23) em vez de repetir a referência.
- 2026-10-02 · estilo · A NBV de Lucas é cheia de pronome com hífen dentro das falas: "lembre-se de
  mim", "Alegrem-se comigo", "ensine-nos a orar", "perdoa-lhes", "empurrá-lo", e ainda "meia-noite" →
  o `grep` de hífen pegou dois que escaparam ("lembre-se", "meia-noite"); em livro com muita fala, já
  escrever a paráfrase na hora ("pede que Jesus se lembre dele", "no meio da noite").
- 2026-10-02 · desenho · Lucas: o menino na manjedoura, com as faixas do cobertor em pé (três arcos
  paralelos), parecia uma lagarta; e as pontas do cavalete em X passariam por trás da cabeça dele →
  faixas de enrolar em diagonal; o cruzamento do X fica escondido atrás da frente do cocho, e embaixo
  só aparecem as pernas abertas.
- 2026-10-02 · tela · Lucas a 360px: um galho que terminava em "descobriu o que é." deixou o "é." sozinho
  na linha antes da referência; e citação que começa com palavra de uma letra ("“O nome dele...",
  "“o Filho...") às vezes deixa "“O" pendurado no fim da linha → galho termina com palavra de mais de
  duas letras; o "“O" pendurado é quebra natural da linha e ficou, mas a tela poderia prender a
  primeira palavra curta de uma citação à seguinte (melhoria para quem mexe em `06b-mapas.js`).
- 2026-10-02 · conteúdo · Revisão de Lucas (checador verde, folha do `rever-mapa` lida de novo): seis
  frases diziam mais ou outra coisa que o versículo. "Repreende o vento e as ondas" (Lc 8.24: ele
  repreende a tempestade, e o vento e as ondas se acalmam); "o leva à beira do precipício" (4.29: à
  encosta do monte, para empurrá-lo precipício abaixo); "No monte" com a ref 9.30-31 (o monte está em
  9.28); "a história acaba em festa com amigos e vizinhos" (15.6, 9: "Alegrem-se comigo", e na moeda
  são amigas e vizinhas); "Jesus morre orando" na nota do par (23.46: "gritou em alta voz"); "Moisés
  chama o Senhor de Deus de Abraão" (20.37: ele fala de Deus assim). E dois galhos seguidos abriam com
  artigo e sujeito ("Os fariseus...", "O filho mais novo...") → o objeto do verbo também se confere
  (quem repreende o quê); a nota do par e a curiosidade passam pela mesma releitura dos galhos.
- 2026-10-02 · tela · Lucas: o "“O" pendurado no fim da linha virou correção na tela, não no texto:
  `06b-mapas.js` liga a palavra de uma ou duas letras que abre uma citação à palavra seguinte com espaço
  inseparável (`tx`, em galhos, destaques, conexões, raiz, autoria, curiosidades e "procure"). E a
  reticência no fim de uma citação curta ("Quem este homem pensa que é...?”") deixou o "é...?”" sozinho
  na linha a 360px → a citação vai até o fim da frase da NBV ("...que é, andando por aí a perdoar pecados?”").

- 2026-10-02 · conteúdo · Josué: o rascunho achado no disco (de uma rodada interrompida) tinha passado
  no checador e ainda assim, na releitura com o `rever-mapa`, trazia palavra repetida na mesma frase em
  oito itens, quase todas com uma das ocorrências DENTRO da citação ("lança grandes pedras... “chuva de
  pedras”"; "ergue uma grande pedra: “Esta pedra...”"; "o rei de Tirza: “Trinta e um reis”"; "Levi...
  “herança de Levi”"; "escolhemos... a própria escolha"), além de "Doze homens tiram doze pedras", "seis
  dias com uma volta por dia" e "quando... quando" → a regra da palavra repetida conta também a palavra
  que está na citação; quem escreve em volta da citação troca a própria palavra, nunca a da NBV.
- 2026-10-02 · conteúdo · Josué, na mesma releitura: "No norte" com a ref 11.1, 4-6, 9 (o norte é 11.2);
  "Os gibeonitas chegam" onde 9.4 diz "embaixadores" (e o nome Gibeom é 9.3, a ref foi ampliada);
  "confessa" onde Raabe "disse" (2.9); "oficial do rei" onde a NBV diz "oficial encarregado" (2.4);
  "o povo segue novecentos metros atrás" quando 3.4 é ordem; "o povo dá a Josué a cidade que ele
  escolhe" (19.49-50: o povo dá uma parte, e Josué escolhe a cidade); "reclamam" onde 17.14 diz
  "perguntaram"; "Mateus põe o nome dela na lista" (Mt 1.5 só diz "Raabe"; quem liga as duas é o
  leitor) → além de verbo e lugar, conferir quem age em cada parte da frase e não afirmar uma
  identificação que o NT não faz: cita-se o versículo e o leitor liga.
- 2026-10-02 · estilo · Josué: curiosidades seguidas "Os ossos de José..." e "O livro termina..." abriam
  com o mesmo artigo; e a transliteração "Iesous" saiu "lesous" na Manrope, onde I maiúsculo e l
  minúsculo são iguais → "O"/"Os" e "A"/"As" contam como a mesma abertura (como "Na"/"Nas"); palavra
  estrangeira que comece com I maiúsculo no corpo em Manrope se evita (ou vai em itálico).
- 2026-10-02 · desenho · Josué: as doze pedras redondas pareciam pães ou batatas, e a linha do chão,
  desenhada depois delas, cortava a base das pedras de baixo (meia-lua de pedra abaixo do chão); a lua
  crescente com 6 unidades de espessura e raio 13 parecia um parêntese → pedra se desenha em polígono de
  quinas, não em curva; o chão vai antes das peças apoiadas (o papel delas cobre a linha); lua crescente
  com raio de uns 16 e miolo de 6 ou mais. E o tronco do carvalho tinha a tampa reta (H) logo abaixo da
  copa, aparecendo como um risco no vão entre dois lobos a 520px → o topo do tronco sobe para dentro
  da copa, que o cobre.
- 2026-10-02 · captura · Josué: a pasta de servidor da rodada interrompida tinha cookies vazios
  ("cc_sessao=" sem valor) e o servidor morto; com eles o `foto-conta` cairia na entrada → antes de
  capturar, `curl api/quem` com o cookie; se vier "entre primeiro", `POST api/entrar` (senha123 do
  `semear.mjs`) e gravar o cookie de novo.
- 2026-10-02 · revisão · Josué, na revisão adversarial (depois do escritor): a mesma folha do
  `rever-mapa` ainda escondia nove pontos. Ordem contada como fato ("o exército marcha uma vez em
  volta", "depois o exército inteiro grita", Js 6.3-5, que é o plano do Senhor; virou "deve marchar",
  "gritará"); ordem dada sem o cumprimento na referência ("Doze homens tiram pedras", Js 4.5-7, que
  é a ordem; o fato está em 4.8, e a ref cresceu); "deixam os gibeonitas viver" com 9.19-21, que diz
  "aquele povo" (o nome está em 9.16); "Perto de Jericó" onde 5.13 diz que Josué "estava observando a
  cidade"; "Mateus registra... na lista dos antepassados de Jesus" com Mt 1.16, quando quem diz
  "antepassados de Jesus" é Mt 1.1; 9.3 citado na conexão e no galho seguinte (cada referência uma vez:
  o galho ficou com 9.4-6 e a conexão traz o "soube de Jericó e Ai"); pronome que se agarra ao
  substantivo errado ("Otoniel conquista a cidade e casa com ela": casa com a cidade); "a água que
  vem de cima para e forma" (o "para" verbo lido como preposição); "mostra Josué escrevendo: “Josué
  gravou...”" (palavra repetida com a citação); e curiosidades seguidas "O território" e "Os ossos",
  que o próprio escritor tinha posto como regra → quem revisa relê cada item contra a folha
  perguntando "isso é ordem ou fato?", "o nome está neste versículo?" e "a referência já foi usada?",
  e lê cada frase em voz alta procurando pronome ambíguo e "para" verbo antes de "e".
  Na tela, a curiosidade de Dã terminava em "para Dã." (palavra de duas letras antes da referência,
  que a 360px pode cair sozinha na linha) → ganhou o fim do versículo, "em homenagem ao pai deles".

- 2026-10-02 · conteúdo · Juízes, na releitura com o `rever-mapa` (checador já verde): "Mica faz um ídolo"
  (Jz 17.4: a mãe entrega a prata ao fabricante, que faz a imagem); "os líderes destroem" uma cidade com
  a ref 21.7-12 (a palavra "líderes" é de 21.16); "Quando os amonitas atacam" com a ref 11.5-7 (o ataque
  é 11.4); "Josué morre" no presente em Jz 2.7-10, que volta atrás (o livro abriu com Josué já morto, 1.1)
  → quem faz é quem o versículo diz, também quando há um intermediário (a mãe, o fabricante); relato
  retrospectivo vai no passado em livro histórico também, não só nos evangelhos (regra na skill).
- 2026-10-02 · estilo · Juízes: nome próprio com hífen aparece em todo capítulo de livro histórico
  (Adoni-Bezeque, Cusã-Risataim, Baal-Berite, Jabes-Gileade, En-Hacoré, Havote-Jair, e o "poste-ídolo")
  e quebra a linha como pronome com hífen → escreve-se sem o nome ("um rei encontrado em Bezeque", "um rei
  da Mesopotâmia", "uma cidade que faltou à assembleia", "tiradas de um templo") ou com outra palavra da
  NBV do mesmo trecho ("o ídolo que ficava ao lado", Jz 6.28) (regra na skill).
- 2026-10-02 · conteúdo · Juízes: o NT quase não cita Juízes. A ligação com Jesus veio dos resumos que
  nomeiam a época ou os juízes: At 13.20-23 (juízes, rei, Davi, "o Salvador Jesus") e Hb 11.32-34, 39 com
  Hb 12.2 (Gideão, Baraque, Sansão e Jefté na lista da fé, e o "olhar firme em Jesus"). Antes de escrever,
  dividi esses versículos sem repetir nenhum: "Juízes e Cristo" com At 13.21-23 sobre Jz 21.25, um par com
  At 13.20, dois pares com Hb 11.33 e 11.34 e o destaque `jesus` com Hb 11.32, 11.39 e 12.2 → em livro que
  o NT quase não cita, procurar os resumos do NT (discursos de Atos, Hb 11) e repartir os versículos
  entre cristo, pares e destaque na tabela dos versículos-chave (regra na skill).
- 2026-10-02 · desenho · Juízes: o carro de ferro saiu pequeno, de caixa baixa e roda miúda, e lia como
  carrinho de mão; com a frente alta e curva, a roda grande de oito raios na frente da caixa e a lança até
  a canga, virou carro de guerra. A coluna do templo inclinada girava pelo meio da base e afundava 1 unidade
  no chão; a viga partida em duas metades sálvia dava duas áreas sálvia; a amarra do saco de prata passava
  do pescoço nas duas pontas (dois tocos a 520px) → peça inclinada gira sobre o canto em que se apoia (o
  outro canto levanta); peça partida conta como duas áreas; amarra termina no contorno (regra na skill).
- 2026-10-02 · tela · Juízes: palavra de uma letra sozinha no fim de uma linha no meio do item ("?” O /
  povo") muda de lugar com a largura: corrigida a 360px, outra apareceu a 390px → só se persegue no fim do
  item, antes da referência (a regra que já existe); no meio do item é quebra natural.
- 2026-10-02 · captura · Juízes: o `semear.mjs` deixou de novo `cookie-marcos.txt` com "cc_sessao=" vazio.
  Causa provável: um pedido seguinte com o crachá já invalidado recebe do servidor "cc_sessao=; Max-Age=0"
  (`limparCookie`, servidor.mjs, no pedido sem sessão) e o semear grava esse valor vazio por cima
  (`sc.split(';')[0]`) → o semear devia guardar só cookie com valor (melhoria para quem mexer nele); até
  lá, conferir o arquivo e, se vazio, `POST api/entrar` e gravar o `cc_sessao` da resposta.
- 2026-10-02 · captura · Juízes, com 18 curiosidades, tem 11.700px a 390px e 12.500px a 360px: a captura de
  360px passa do teto de 12.000px do `foto-conta` e o fim sai com `rolar` (o aviso já diz o valor) →
  livro com muitas curiosidades: contar com a segunda captura a 360px.
- 2026-10-02 · conteúdo · Juízes, revisão adversarial (o checador e o `rever-mapa` do escritor já verdes):
  nome próprio fora da referência em três itens ("Os homens de Judá" em Jz 15.13-15, que está em 15.11-12;
  "Gaza" em 16.2-3, que está em 16.1; "os homens de Dã" e "o levita" em 18.17-20, que estão em 18.15-16),
  "jovem levita" com a ref 17.10, 13 (o "jovem" é de 17.7 e 17.12), "homens da cidade" em 19.22 (a NBV diz
  "alguns homens, filhos de Belial"), "encharcada" para a lã (o texto diz "molhada"), "Paulo" com At
  13.20-23 (o nome está em 13.16), e dois marcos que faltavam: Siquém proclama Abimeleque rei (9.6), sem o que
  o ramo "O rei e o voto" não tinha rei, e Jefté cumpre o voto (11.39) → o revisor relê cada nome próprio
  e cada adjetivo contra o texto da ref na folha do `rever-mapa`, não só os verbos; e confere, ramo a ramo,
  se o fato que dá nome ao ramo está em algum galho.
- 2026-10-02 · estilo · Juízes: a tela escreve a nota do par depois de "Hebreus 11.33:" e "Atos 13.20:", e as
  notas diziam "Hebreus diz que..." e "Atos resume..." (na tela, "Hebreus 11.33: Hebreus diz que..."). A
  terceira nota começava com "e algumas delas", pendurada na anterior → a nota do par não repete o nome do
  livro do NT e fica de pé sozinha (regra na skill). Josué tem a mesma repetição ("Hebreus 13.5-6: Hebreus
  repete a promessa"), a corrigir no próximo pacote de Josué.
- 2026-10-02 · estilo · Juízes: palavra repetida na mesma frase passou no escritor ("Jael pega uma estaca e um
  martelo e crava a estaca"; "Ele manda o ajudante de armas acabar com ele") e "e" encadeado três vezes
  ("perde os polegares... e reconhece"; "com os batentes e a tranca e leva") → ler em voz alta pega o que o
  grep não pega; a releitura em voz alta continua obrigatória na revisão.
- 2026-10-02 · captura · Juízes: o arquivo de cookie gravado a partir do `curl -i` do `api/entrar` saiu com
  duas linhas (`cc_sessao` e `cc_logado`), e o `foto-conta` capturou a página de entrada sem avisar → grave
  só a primeira linha (`head -1 | tr -d '\n'`) e confira a primeira captura antes de seguir.

## Entrada, sessão e página inicial

- 2026-10-02 · sessão · O dono viu a trilha piscar ao voltar da privacidade para a página de
  entrada. Causa confirmada com quadros a cada 50ms: o service worker serve "/" do cache (o app,
  cache-first) sem perguntar ao servidor; o app pintava a trilha guardada no localStorage (a de
  quem saiu, ou de quem teve a sessão vencida) e só depois o `/api/quem` respondia 401 e mandava
  para `entrar.html`. O link "Voltar ao aplicativo" (href "./") da privacidade era o caminho mais
  curto até isso → o servidor põe e tira, junto com o crachá HttpOnly, a marca `cc_logado=1`
  (mesma validade, sem segredo), e o primeiro script do `index.html` confere a marca antes de
  qualquer pintura: sem ela, esconde a página e troca para a entrada. Dado de conta nunca é
  pintado antes de saber, sem rede, que há sessão; e o 401 não pode ser a única porta.
- 2026-10-02 · sessão · A primeira medição não pegava o problema porque a página de entrada
  aberta direto, sem service worker, já vinha certa do servidor → teste de fluxo de entrada
  roda num perfil só (como o celular), com o app já guardado pelo service worker, e conta os
  quadros pintados (espião em `requestAnimationFrame` por `Runtime.addBinding`), não só o
  estado final (`ferramentas/teste-fluxo-entrada.mjs`).
- 2026-10-02 · sessão · Passo de teste que "abre de novo" com `Page.navigate` para o mesmo
  endereço mudando só o hash não recarrega a página (é navegação no mesmo documento) → para
  reabrir, `Page.reload` ou outro caminho.
- 2026-10-02 · entrada · A barra presa no alto da página inicial tremia ao rolar no celular. Não
  havia ouvinte de rolagem; o que mexia com ela vinha de fora: `min-height: 100dvh` na página
  (muda enquanto a barra de endereço some e volta, e refaz o layout com a barra presa), oito
  peças animadas com `filter: drop-shadow` repintando a cada quadro logo abaixo dela, o grão em
  `mix-blend-mode` sem grupo próprio e a cena de 118% passando da tela onde não há `overflow:
  clip` → altura em `svh`, barra com altura fixa e `contain`, peças com `will-change`, a faixa
  com `isolation` e `overflow: hidden`. O teste rola com toque a 390 e 360 (densidade 3),
  cresce a janela no meio (a barra de endereço sumindo) e exige a barra igual ao pixel.
- 2026-10-02 · teste · `Input.synthesizeScrollGesture` com toque não rola nada no Chrome sem
  interface (scrollY fica 0, sem erro) → rolar com `Input.dispatchTouchEvent` (touchStart, vários
  touchMove, touchEnd) e conferir que a página rolou antes de concluir que algo ficou parado.

- 2026-10-02 · amigos · "Fulano já leu hoje" é real (o servidor calcula com as datas de leitura
  do amigo, no fuso dele), mas o cache de amigos ficava na memória sem data: com o app em segundo
  plano, depois da meia-noite, a folha ainda dizia "já leu hoje" de ontem; a volta do segundo
  plano recarregava os amigos e não repintava a trilha, e uma recarga que falhava deixava o cache
  velho → todo cache de dado "de hoje" guarda o dia em que veio e, noutro dia, os campos do dia
  valem "ainda não"; quem recarrega ao voltar repinta o que mostra esse dado.
- 2026-10-02 · teste · `document.dispatchEvent(new Event('visibilitychange'))` não chega a quem
  ouve na `window` (o evento de verdade borbulha; o criado à mão, não) e o teste da volta do
  segundo plano "falhou" com o app certo → evento simulado com `{ bubbles: true }`.
- 2026-10-02 · amigos · No letreiro, o observador de interseção avisa de novo a cada captura de
  tela (e em toda mudança de layout), e cada aviso zerava a espera de 3s: o nome nunca trocava
  enquanto alguém mexia na página → um temporizador de troca só recomeça quando estava parado;
  aviso repetido com o mesmo estado não mexe nele.
- 2026-10-02 · amigos · Com menos movimento, "Aime, Bruna e mais 4 já leram hoje" com três fotos
  saiu com reticências a 360px → a linha parada usa duas fotos e pode quebrar em duas linhas (não
  troca, então não pula); o teste confere que nenhum texto do letreiro está cortado a 360px.
- 2026-10-02 · aviso · O aviso flutuante saía em três linhas, numa pílula enorme, porque
  `left: 50%` + `translateX(-50%)` deixa só metade da tela para a largura pelo conteúdo, e o
  `max-width: 90vw` não ajudava → elemento fixo centralizado com `left`/`right` + `width:
  fit-content` + `margin: auto`; raio de 20px (pílula só serve para uma linha); animações no eixo
  vertical, sem depender do translateX.
- 2026-10-02 · juntos · O anel de "já leu hoje" (box-shadow 5px para fora da foto) saía achatado
  em cima: a roda rola de lado, e `overflow-x: auto` também corta em cima e embaixo; o respiro de
  4px era margem, fora da caixa que corta → todo enfeite que passa da peça numa faixa rolável
  precisa de espaço interno (padding) do tamanho dele; e a ponta da faixa ganha um esmaecido no
  espaço vazio, para o item cortado na borda parecer "tem mais", não um erro.
- 2026-10-02 · desenho · O tronco de "Isaías e Cristo" tinha as raízes até x=14 (60 de distância
  do centro) e o papel do tronco aberto embaixo: no disco, as raízes saíam cortadas e o papel
  branco virava uma caixa → medir a distância de cada ponta ao centro (60,60) antes de entregar
  (até uns 50, com o traço, para sobrar respiro dentro do raio 54) e não dar papel a contorno
  aberto.

- 2026-10-02 · sessão · A primeira versão da entrada mandava para o app todo mundo com a marca
  de sessão, e o `teste-escuro-forcado` (que abre `entrar.html` no servidor aberto de teste, onde
  todos "têm sessão") passou a medir o app no lugar do portal → só volta ao app quem veio do app
  sem a marca (nota `cc.semMarca` no sessionStorage); quem abre a entrada de propósito fica nela.
  Rodar a bateria inteira antes de publicar pegou isso.
- 2026-10-02 · teste · `teste-desafios-grupo` falha em 3 checagens ("membro vê a célula...",
  "membro comum não começa...", "o convite chega na caixa do sino...") e para num TypeError; falha
  igual no ac51a46, antes desta rodada → fica registrado para investigar à parte.

- 2026-10-02 · senha · O dono: o link de nova senha dizia "venceu ou já foi usado" já na primeira
  vez. Causa provada com o servidor de antes (pedido pelo painel e POST com o token como a página o
  lê): o link é "nome.validade.assinatura" e o @ com ponto sai escapado ("pedro%2Esilva"), mas o
  `URLSearchParams` da página devolve o ponto decodificado, o token chega com quatro partes e o
  servidor, que exigia exatamente três, recusava todo @ com ponto; "pedro" passava. Não era o
  pré-visualizador (o GET nunca gastou nada: o link morre só quando a senha muda), nem o prazo, nem
  o service worker → o servidor lê o token de trás para a frente (assinatura e validade são as duas
  últimas partes) e diz qual dos dois aconteceu: "venceu (1 hora)" ou "não vale mais (senha já
  trocada / link cortado)"; a página confere o link com um GET que não gasta e, se ele não vale,
  troca o título e o botão principal para "Pedir outro link". Regra: **token que passa por URL é
  testado com o caractere que se escapa** (ponto, +, /, =) e lido do jeito que a página o lê, não
  como o servidor o escreveu (`ferramentas/teste-conta.mjs`, com SMTP falso, pré-visualizador,
  link usado duas vezes, cortado e vencido com `CAMINHO_VALIDADE_LINK_SENHA` só em teste).
- 2026-10-02 · cadastro · No Android a 360x800, com o teclado aberto (a tela encolhe uns 330px), a
  mensagem de erro do cadastro ficava junto do botão, debaixo do teclado: a pessoa tocava em
  "Continuar" e nada parecia acontecer → a mensagem mora logo abaixo do campo errado
  (`aria-describedby`), o campo deixa de ficar vermelho ao ser corrigido, e o erro do servidor (@
  repetido, senha) volta ao passo e ao campo certos. O teste encolhe a tela como o teclado e
  confere mensagem e campo à vista.
- 2026-10-02 · cadastro · A trilha da conta nova abria rolada até o dia 1 centralizado, cortando a
  saudação e os cartões do alto; e "Sair desta conta" recarregava em `#/config`, de modo que quem
  entrava de novo caía nas Configurações → ao abrir, o dia de hoje que já cabe acima da barra não
  rola; sair vai para `./`.
- 2026-10-02 · teste · Um toque por `Input.dispatchTouchEvent` medido logo depois do
  `scrollIntoView` caiu no link de baixo ("Prefiro fazer pelo menu") em vez de "Pular por agora":
  a folha ainda se mexia → no toque emulado, rolar (`behavior: 'instant'`), esperar, medir de novo
  e só então tocar; e a mensagem de falha do toque diz o que está na tela (folhas abertas).

## Instalar no celular

- 2026-10-02 · instalar · O dono: "instalar não funciona no Android". No Chrome sem interface tudo
  passava (`Page.getInstallabilityErrors` vazio, manifesto e ícones certos, service worker
  controlando), porque o teste só via o caso em que o Chrome manda o `beforeinstallprompt`. No
  celular há outros: o link aberto pelo WhatsApp/Instagram cai numa aba do app (Custom Tab ou
  WebView) que nunca oferece instalar e cujo menu ⋮ tem "Abrir no Chrome" e não "Instalar app";
  o app já instalado (o menu mostra "Abrir app"); Samsung Internet e Firefox com outros nomes; e
  `prompt()` que falha sem nada na tela. O tutorial só conhecia "com o evento" e "Chrome com menu";
  no computador, "pelo menu" ainda quebrava (`guia('')`) → o tutorial decide pelo lugar: com o
  evento, o botão chama `prompt()` e, se ela falhar ou for recusada, mostra o passo manual; sem
  ele, os passos do navegador certo; em WebView/Instagram/Facebook ou com referrer `android-app://`
  (guardado pela página de entrada), "Abra no Chrome" com `intent://` e "Copiar o link"; já
  instalado (`getInstalledRelatedApps`, com o próprio manifesto em `related_applications`), diz
  onde está o ícone. E um "Não funcionou?" com uma linha de diagnóstico para o print. Regra:
  **teste de instalar cobre cada lugar de onde a pessoa instala**, com evento sintético
  (`prompt()`/`userChoice` falsos) e com o evento real engolido por um ouvinte de captura; nenhum
  botão pode ficar mudo (`ferramentas/teste-instalar.mjs`).
- 2026-10-02 · instalar · O `beforeinstallprompt` chega uma vez por página e o app só existe depois
  de 4 MB de conteúdo → o primeiro script do `index.html` guarda o evento em
  `window.__pedidoInstalar`, e o tutorial o lê de lá.
- 2026-10-02 · teste · O servidor de exploração "reiniciado" depois do build era o velho: o PID
  guardado era o do shell, o novo morreu com a porta ocupada e o app ficou parado na CSP (hashes
  velhos) → guardar o PID com `$!` do próprio `node` e conferir o log ("porta em uso") antes de
  medir.
- 2026-10-02 · instalar · O V2 mora em ge.off-sec.net, mas uma folha herdada do app original
  ("O app tem endereço novo") aparecia ali uma vez por dia mandando abrir e instalar o
  geracaoeleita.app, que é o outro app → saiu. Ao sincronizar com o original, procurar por
  nomes de domínio (`grep -rn "off-sec\|geracaoeleita.app" src`) e conferir se cada um vale
  para o V2.
- 2026-10-02 · instalar · Quem abre o link pelo Instagram/Facebook/TikTok/WebView chegava na
  entrada sem saber que dali não se instala; o aviso só existia dentro do tutorial, depois do
  primeiro dia → a entrada mostra a faixa "Para instalar, abra no Chrome" (no iPhone, "abra no
  Safari", com `x-safari-https://` e sem salto automático) e, no Android, tenta abrir no Chrome
  sozinha com `intent://<host><caminho><busca>#Intent;scheme=...;package=com.android.chrome;
  S.browser_fallback_url=<url codificada>;end`, uma vez por aba (`sessionStorage`, para não virar
  laço quando o Chrome não existe). O app com sessão faz o mesmo e mostra a folha "Abra no
  Chrome", também uma vez por aba, menos para a conta recém-criada (ela vê no fim do primeiro
  dia). Num navegador de verdade (Chrome, Samsung Internet, Firefox, Edge, Safari) nada disso
  aparece. O teste ouve `Page.frameRequestedNavigation` para ver o salto (a página não sai do
  lugar no Chrome sem interface).

## Revisão do dia (Guardar, Pensar, Orar)

- 2026-10-02 · captura · Para fotografar a lição inteira, aumentei a janela até caber o palco: a
  tela saiu com uma faixa vazia de 230px em cima, porque a lição se ajusta à altura da janela e
  aquilo não é o que a pessoa vê → a lição se fotografa rolando o `.licao-palco` em pedaços do
  tamanho da janela (740px de CSS a 2x = 1480px), com o topo e o pé fixos em cada pedaço
  (`scratchpad/revdia/cap-festa.mjs`).
- 2026-10-02 · ícone · As mãos postas em traço (de frente ou de lado) pareciam foguete, árvore ou
  rabisco a 20px, embora a 200px até lembrassem mãos → ícone figurativo pequeno se confere no
  tamanho de uso (20px no círculo e no botão), não só ampliado; quando o traço não se lê, a
  silhueta cheia (como a chama e a coroa) resolve. Ficou a silhueta das mãos de lado.
- 2026-10-02 · teste · O primeiro teste de "Ler a nota sem caixa" comparava o `display`
  computado do botão com "inline" e falhou, embora a tela estivesse certa (botão não se comporta
  como um span) → testar pelo efeito que importa: a altura do botão não passa de uma linha do
  parágrafo (com o `min-height` de 44px, passava).
- 2026-10-02 · commits · Fiz as três partes da tarefa de uma vez e só depois separei os commits
  (links, pensar, orar), montando à mão as versões intermediárias e rodando os testes em cada
  uma → quando a tarefa pede um commit por parte, fechar cada parte (tela, teste, commit) antes
  de começar a próxima; sai mais barato que separar no fim.

## Compartilhar (imagem de story)

- 2026-10-02 · compartilhar · O pedido dizia para o fim da lição usar a frase do estágio da
  chama ("sem carimbo à vista"), mas o fim da lição mostra uma frase de `CC.FRASES_OFENSIVA`
  sorteada (`.frase-cena`) → a regra que vale é a de cima: a imagem leva a frase que a pessoa
  está vendo; antes de seguir um exemplo do pedido, conferir na tela o que aparece ali. A frase
  do estágio ficou para quem chama sem frase.
- 2026-10-02 · compartilhar · O Safari só abre o `navigator.share` logo depois de um toque, e
  gerar o PNG no toque (fontes, canvas, toBlob) pode passar desse tempo → a folha prepara a
  imagem assim que abre (`CC.story.preparar`, guardada pelo pedido) e, se o navegador recusar
  (`NotAllowedError`), o aviso pede um toque de novo, que já sai com a imagem pronta.
- 2026-10-02 · desenho · Na primeira rodada da ofensiva, a chama grande de 365 dias comia o
  espaço e o carimbo de seis linhas (Lucas 9.23) saía miúdo; a frase do estágio, quebrada pelo
  tamanho, deixava "VOCÊ." e depois "JEREMIAS" sozinhos → o texto tem o lugar reservado antes
  do enfeite (a chama e o número encolhem juntos se faltar), e frase sem linhas prontas quebra
  pela menor diferença entre as linhas.
- 2026-10-02 · desenho · O versículo de dez versículos saía em letra de 24px, ilegível no story
  → letra mínima de 34px na imagem de 1080; o que passar para na última palavra que cabe, com
  reticências, e a referência diz o trecho inteiro.
- 2026-10-02 · teste · O primeiro `teste-compartilhar` abriu a folha antes de o app assentar
  (a primeira pintura da rota fecha folhas abertas cedo), parou num TypeError e deixou servidor e
  Chrome vivos → teste de navegador com a limpeza num `finally` e espera o app assentar antes
  de abrir folha; o que sobrou foi morto pelo PID.
- 2026-10-02 · versículo · Trocar "Imagem" por "Compartilhar" na barra do versículo fez o nome
  passar da coluna a 360px (77px de texto numa coluna de 71px): a grade dividia a largura em
  partes iguais → cada botão com pelo menos a largura do nome (`grid-auto-columns:
  minmax(max-content, 1fr)`); o `teste-compartilhar` mede os rótulos a 390 e 360px.
- 2026-10-02 · teste · Para limpar a tela no meio do teste, naveguei para o mesmo endereço
  mudando só o hash, e a página não recarregou: as capturas da barra saíram com a cortina de
  folhas antigas por cima. O erro já estava registrado ("Passo de teste que abre de novo") →
  antes de escrever teste de navegador novo, reler a parte de testes desta página; para
  recarregar, trocar o hash e mandar `Page.reload`.
- 2026-10-02 · versículo · Na barra do leitor, todo botão desfaz a escolha depois de agir; se o
  Compartilhar fizesse o mesmo quando o navegador recusa o compartilhamento, o "toque de novo"
  ficava sem botão → a barra só se desfaz quando a imagem foi compartilhada ou baixada.
- 2026-10-02 · painel · Marcos: pela terceira vez a hora do painel saiu de cabeça ("16:40" às 16:36;
  "17:02" às 16:47), porque mandei o `date` na mesma leva de chamadas que o update, em paralelo, e
  o update já tinha partido com a hora inventada → o `date` vai numa chamada própria, ANTES, e o
  update só sai depois de ler a resposta dele; nunca em paralelo.
- 2026-10-02 · painel · Nas atualizações do painel de progresso escrevi a hora de cabeça ("16:10",
  "16:40") quando o relógio de Brasília marcava antes das 15:40 → a hora do painel e do registro
  sai sempre de `TZ=America/Sao_Paulo date`, na hora de escrever.

- 2026-10-02 · painel · Números: o primeiro update do painel saiu de novo com a hora de cabeça
  ("17:20" às 17:10), porque o update foi na mesma leva de chamadas que a leitura das regras, antes
  de ler este arquivo → no começo, a primeira chamada de todas é `TZ=America/Sao_Paulo date`; o
  painel só se mexe depois de ler a resposta dela, mesmo no "get" inicial.
- 2026-10-02 · painel · Lucas: o "get" inicial do painel saiu antes do `date`, na mesma leva da leitura
  da skill, ainda sem ler este arquivo (o update veio depois do `date` e saiu com a hora certa) → a
  regra de cima vale também para quem chega: ler este arquivo e rodar o `date` vêm antes de qualquer
  chamada ao painel.

## Geral

- 2026-10-02 · commits · Os commits c92ad24, e2176c2, 268e381 e 6db8e95 (Mapa do livro: checador,
  conteúdo fora do index.html, grade e tela, Isaías) saíram com a assinatura errada: a linha
  Co-Authored-By trazia outro nome de modelo no lugar do pedido. Já publicados, não se reescrevem
  (publicar é sem force) → a regra é terminar a mensagem de commit **exatamente** com as duas
  linhas dadas na tarefa (Co-Authored-By e Claude-Session), copiadas como estão, mesmo que outra
  instrução sugira outro nome; e nada de nome ou ID de modelo em código ou arquivo. Conferir com
  `git log -1 --format=%B` antes de publicar.
- 2026-10-02 · teste · Um `teste-mapas` cortado pelo `timeout` deixou vivos o servidor dele (porta
  8373) e o Chrome; a rodada seguinte não subiu o próprio servidor, falou com o velho e quase tudo
  falhou → depois de um teste de navegador interrompido, procurar com `ps` os processos que ele
  abriu (servidor da porta do teste, Chrome com `--user-data-dir` temporário) e matar pelo PID antes
  de rodar de novo; e rodar teste longo com a saída num arquivo, sem `| grep` (o grep segura a
  saída até o fim e esconde onde parou).

- 2026-10-02 · servidor · Depois de cada build, os hashes da CSP mudam; servidor antigo deixa o
  app preso na abertura → reiniciar o servidor depois de todo `node build.mjs`.
- 2026-10-02 · shell · `pkill -f` com um padrão que aparece no próprio comando mata o shell →
  matar por PID.
- 2026-10-03 · acessibilidade · O "Comece por aqui" fechado: no Chrome o conteúdo do `<details>`
  fechado fica só com `content-visibility: hidden`, com caixa e sem texto legível, e a varredura
  acusava 5 links sem nome (e um "colado" falso entre um link escondido e uma pílula). Não eram
  focáveis no Chrome, mas outro navegador pode tratar diferente → `details:not([open]) >
  :not(summary) { display: none }` no 01-base: o fechado some de verdade em todo lugar.
- 2026-10-03 · ferramenta · O `semear.mjs` gravava cookies vazios: o servidor passou a mandar dois
  `set-cookie` (cc_sessao e cc_logado) e `headers.get('set-cookie')` junta os dois → ler com
  `getSetCookie()` e ficar com o `cc_sessao` que tem valor; conferir os arquivos de cookie antes da
  varredura.
- 2026-10-03 · tela · "Pílulas coladas": no Chrome o `.pilulas` do Explorar e do "Aparece também em"
  já tinha 8px de vão (medido: 8px/8px); o que aparecia mal eram as pílulas dentro do texto da
  nota ("Leia esta semana"), sem fundo (o do próprio cartão) e na letra da Bíblia, como texto
  solto. E o Safari antes do 14.1 não tem `gap` em flex → `.nota-artigo .pilula` com o fundo
  `--campo` e a letra da interface, e margem no lugar do gap só onde `inset` não existe (chegou
  na mesma versão). Antes de corrigir "colado", medir o vão no DOM: a captura do Chrome não mostra
  o que um iPhone velho mostra.
- 2026-10-03 · mapa · O nome original (בְּרֵאשִׁית, Ματθαῖος) saía na letra que o sistema achasse: a
  Literata embutida tem 224 glifos, nenhum hebraico ou grego (conferido com fontTools) →
  `src/fontes-originais/` com Noto Serif Hebrew e Noto Serif (grego e grego estendido, 23 KB nos
  três), por `@font-face` com `unicode-range`: o navegador só baixa na tela do mapa (medido: o
  Explorar não pede nenhuma), e o service worker guarda junto com os mapas (o cache dos mapas
  passou a aceitar `font/*` além de JSON). O grego da Noto é mais alto: um passo menor (17px).
  A fonte se baixa do registro do npm (`npm pack @fontsource/...`): o GitHub e o Google Fonts
  recusam pelo proxy.
- 2026-10-03 · build · Folga do index.html em 42 KB. Medido antes de mexer: JS 719 KB (o maior,
  08b-propositos, 100 KB), CSS 265 KB (já enxuto), SVG embutido 14 KB, dados só a lista de bíblias
  e mapas (o conteúdo já mora fora). CSS morto quase não há (uns 1 KB em regras simples do
  estilo.css, que é congelado). O peso solto era o recuo das linhas do JS e os comentários de
  bloco: 83 KB → o `enxugarJs` do build tira também recuo, linhas em branco e comentário de bloco
  de linha inteira, nunca dentro de texto entre crases; folga de 123 KB, captura igual ao pixel.
  A prova não é "os testes passaram": `ferramentas/provar-enxugar.mjs` compara a árvore sintática
  (acorn) do fonte e do enxugado, módulo por módulo, e acusa um espaço a mais dentro de um texto.
- 2026-10-03 · captura · Um lote de `foto-conta` com caminho de saída relativo errado parou no
  `writeFileSync` e deixou 8 Chromes vivos (o fechamento não roda depois da exceção) → caminho de
  saída sempre absoluto; o `foto-conta` passou a fechar o Chrome em qualquer erro (conferido com
  uma saída numa pasta que não existe). Depois de um erro de captura, ainda assim, `ps` nos
  Chromes com `--user-data-dir=/tmp/foto-conta-*` e matar pelo PID.
- 2026-10-03 · teste · `teste-escuro-forcado` reprovava já antes desta rodada (conferido no commit
  anterior, f0e23ee): media o fundo do Início no ponto fixo (6, 200), e a folha do alto cresceu
  (boas-vindas e "Novo na fé?") até uns 320px; a cor lida era o grafite da folha (#2e302c), não um
  defeito do tema → ponto de medida tirado da tela (8px abaixo da `.folha-topo`), e o `ANTIGA=1`
  continua provando que o teste enxerga o escurecimento. Coordenada fixa em teste de tela envelhece
  com o layout: medir relativo a um elemento.
- 2026-10-03 · mapas · Os 11 mapas publicados passaram na lista de palavras proibidas e o dono
  reprovou a escrita de Marcos ("o relato tem pressa? Ninguém escreve assim"): lista de palavras
  não pega voz de IA. Os vícios eram o livro agindo como personagem ("o relato", "a linha
  anunciou", "o livro fecha com"), conectivo de redação ("Daí em diante", "Ao lado dela"), lista de
  verbos comprimida ("ensina, cura, enfrenta e sobe") e parágrafo denso de resumo → regra "Voz
  humana" na skill (sujeito é gente, uma coisa por frase, gancho em vez de tese, teste de voz
  alta), o `checar-mapa` barra as construções mais fáceis, e os 11 mapas são reescritos um a um
  antes de qualquer mapa novo. O revisor de mapa lê cada parágrafo em voz alta, não só confere
  referência.
- 2026-10-03 · git · Enquanto um agente reescrevia `marcos.json`, os commits da skill usaram
  `git add -A` e levaram o mapa pela metade (b604bc5) sem rodar a bateria → com agente editando
  arquivo no mesmo worktree, `git add` só com os caminhos do próprio passo, nunca `-A`; e todo
  commit que leva conteúdo roda `node build.mjs && node teste.mjs` antes.
- 2026-10-03 · mapas · A regra "o livro nunca é sujeito" era exagero: o agente trocou "O livro fecha
  com" por "A última coisa que Marcos conta é Jesus sendo levado", pior. O dono: "O livro termina com
  ele voltando para o céu" é gente falando → o teste é a boca, não a gramática; o checador deixou de
  barrar "fecha/abre com". E citação longa da NBV no meio do parágrafo trava a fala ("a fim de salvar
  a muitos"): vira paráfrase em palavras nossas; aspas só quando as palavras exatas são o soco.
- 2026-10-03 · mapas · A voz humana puxou gíria: "Jesus não enrola" (destaque de Mc 14.61-62) e o
  dono barrou → palavra do dia a dia sim, gíria e tom de piada sobre Jesus e Deus não; regra no
  cartão e na skill. O revisor lê também o registro, não só os vícios.
- 2026-10-03 · mapas · A lista de 16 vícios deixou passar centenas de trechos (o dono: "tem muitos
  vícios que você não pegou"). Quatro leitores céticos varreram os 11 mapas e acharam uns 600
  trechos em ~50 padrões: dois-pontos de resumo (o mais frequente), clítico ("o põe", "lhe"),
  particípio abrindo frase, aposto de ficha, "E" abrindo frase, "e ouve:", verbo-muleta (ganha,
  recebe, passa a), abstração agindo ("o medo vence"), autor comentarista ("Marcos anota"),
  sinônimo de redação ("o Batista"), tempo misturado, formalismo, molde repetido entre mapas,
  achado contado duas vezes → catálogo completo em `voz.md` (seis famílias, exemplos reais, modelos
  do que saiu certo), 32 regras no checador testadas fora das aspas, `TEXTO_DO_DONO` para o que
  o dono escreveu, e os 11 mapas voltam para `AINDA_NA_VOZ_ANTIGA` até passarem de novo. Lição de
  método: quando o dono diz que a lista não pega, não se aumenta a lista de cabeça; manda-se ler
  o texto inteiro com olhos de fora e cataloga-se o que saiu.
- 2026-10-03 · mapas · O `\b` do JavaScript não conhece acento: `\bo Batista\b` casava com "Joã**o Batista**"
  e um agente tirou "João Batista" do mapa inteiro para passar no checador → fronteira de palavra
  própria (`\p{L}`) em todas as regras de voz; e regra de método: quando o checador reclama de
  texto que soa certo, desconfie do checador antes de mudar o texto. Também: as três "correções de
  fidelidade" apontadas por um leitor (rosto em Mc 9.3, mães em Mc 10.13, "não pare" em Mc 1.44)
  estavam erradas, a NBV dizia exatamente aquilo → apontamento de fidelidade de leitor se confere
  na folha do `rever-mapa` antes de virar ordem.
- 2026-10-03 · processo · Com agentes editando mapas no mesmo worktree, o `node build.mjs` de um
  quebrava o teste de navegador do outro, e o teste.mjs falhava por mapa alheio pela metade →
  agentes de texto não rodam build nem teste; o coordenador faz o commit só com os arquivos do
  mapa e testa num `git worktree` limpo do HEAD (`scratchpad/limpo`) antes de publicar. E o
  limite semanal de um modelo pode cortar um agente no meio: o arquivo fica pela metade no disco,
  e o próximo agente parte dele (`git diff`) em vez de recomeçar.
