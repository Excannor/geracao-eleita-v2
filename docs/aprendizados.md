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

## Geral

- 2026-10-02 · servidor · Depois de cada build, os hashes da CSP mudam; servidor antigo deixa o
  app preso na abertura → reiniciar o servidor depois de todo `node build.mjs`.
- 2026-10-02 · shell · `pkill -f` com um padrão que aparece no próprio comando mata o shell →
  matar por PID.
