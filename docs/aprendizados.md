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

## Geral

- 2026-10-02 · servidor · Depois de cada build, os hashes da CSP mudam; servidor antigo deixa o
  app preso na abertura → reiniciar o servidor depois de todo `node build.mjs`.
- 2026-10-02 · shell · `pkill -f` com um padrão que aparece no próprio comando mata o shell →
  matar por PID.
