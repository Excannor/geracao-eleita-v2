# Aprendizados

Regra do dono (2026-10-02): **aprender com os erros**. Sempre que um erro aparecer, ou quando
der para fazer algo melhor, registre aqui na hora: o que aconteceu, por que, e a regra que evita
repetir. Antes de começar qualquer trabalho no app, leia esta página e a skill da área. Quando um
aprendizado virar regra de uma área, copie a regra para a skill dela (`.claude/skills/*`) e deixe
aqui a linha com a data.

Formato: `AAAA-MM-DD · área · o que aconteceu → regra`.

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
