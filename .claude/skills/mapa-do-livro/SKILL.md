---
name: mapa-do-livro
description: Padrão do "Mapa do livro" do Geração Eleita V2, o mapa mental que abre cada um dos 66 livros da Bíblia no app. Diz como escrever o conteúdo (mapa mental textual com raiz, ramos, ramificações e conexões, ancorado no texto bíblico, sem vícios de IA), como desenhar as ilustrações (traço próprio em SVG, revisado em tamanho grande antes de entrar) e como montar a tela (setas curvas pontilhadas como a trilha, nomes no pincel). Use ao escrever, revisar ou ilustrar o mapa de qualquer livro, ao mexer nas telas do mapa e quando pedirem "mapa do livro", "mapa mental", "ilustração do livro" ou "introdução do livro".
---

# Mapa do livro

Antes de começar, leia `docs/aprendizados.md`. Ao terminar cada mapa, registre lá o que deu errado
ou o que dá para fazer melhor, e passe para esta skill o que virar regra.

O mapa é uma página por livro e mora **no Explorar** (o cartão "Mapas dos livros"). **A Bíblia do app
não muda**: a leitura livre da Bíblia (`#/biblia`, `04d-biblia.js`, `conteudo/biblias`) fica
como está, sem botão, sem cartão e sem dado novo (regra do dono, 2026-10-02). Referência visual: `design/mapas/mock-isaias.dc.html` (a tela
inteira de Isaías) e `design/mapas/ilustracoes-isaias.html` (os desenhos aprovados).

A ideia veio das Bíblias com mapas mentais da Editora Vida (mapas de Philippe Azevedo). O formato
de "mapa no começo de cada livro" é livre para usar. **O texto, a divisão escrita e as artes deles
não**: tudo no app é escrito e desenhado por nós.

## 1. Como escrever (regra do dono, 2026-10-02)

Papel: especialista em síntese de informações e design instrucional. A tarefa é desmontar o livro
bíblico e transformá-lo num mapa mental textual completo e que prenda a leitura.

**Estilo e linguagem**
1. **Zero vícios de IA.** Proibido: "mergulhar", "crucial", "fundamental", "uma verdadeira
   dança", "em resumo", "vale ressaltar", "uma teia", "jornada", "multifacetado". Também nada
   que soe do mesmo jeito ("vamos explorar", "é importante notar", "no fim das contas").
2. **Pontuação limpa.** Nada de travessão (—). Vírgula, dois-pontos e frases curtas.
3. **Sem repetição.** Vocabulário variado. Itens e parágrafos não começam com a mesma estrutura.
4. **Tom cativante e acessível.** Um comunicador brilhante explicando algo fascinante para gente
   atenta. Nada robótico ou acadêmico engessado.

**Fidelidade (anti-alucinação)**
1. **Ancoragem total.** Só o que está no texto do livro. Nada de datas, números, nomes ou fatos
   que o livro não traga. Toda ramificação leva a referência (`Is 6.1-4`).
2. **Interpretação lógica.** Pode agrupar, ligar pontos e usar analogias simples, mas a premissa é
   sempre a do texto.
3. **Exaustividade.** Completo e detalhado; não cortar o que importa para ficar curto.
4. **Paráfrase fiel.** O verbo e o fato vêm do versículo da referência ("dominem" em Gn 1.28,
   não "cuidar", que é de Gn 2.15), e a referência cobre todo fato da frase. Palavra tirada do
   meio de uma citação vira reticências.
   Vale também para o destaque `jesus`, a nota dos pares e o "Enquanto lê, procure" (Mt 13.37
   diz "o agricultor", não "o semeador"; Mt 27.9 diz "peças de prata", não "moedas").
   Vale também para adjetivo e circunstância ("quase cego", "fugindo", "no monte Moriá",
   "velha demais"): se não está no trecho citado, ou amplia a referência ou sai da frase.
   Vale para nome próprio ("Jetro" não está em Êx 18.13-25, só "o sogro de Moisés") e para o
   tempo do verbo: promessa ou ordem de Deus se conta como promessa ("Deus promete pôr Moisés
   numa fenda da rocha", Êx 33.22), não como fato que já aconteceu. Promessa com condição leva o
   "se" junto ("Se o povo espalhado confessar o pecado, Deus promete...", Lv 26.40-42), e quem
   sofre a consequência é quem o versículo diz (em Lv 7.18 perde a oferta quem a apresentou).
   Palavra de lugar, de gênero e de retomada também: "em Jerusalém" quando o versículo ainda é na
   estrada (Mc 11.10), "o salmo" quando o texto só diz "Escrituras", "outro grito" num item que não
   traz o primeiro (vira "um grito").
5. **Ordem do relato.** "Logo depois", "então" e "a partir daí" só quando o livro narra em
   sequência; um relato retrospectivo (Mt 14.3-12, a morte de João) se conta no passado. "O livro
   abre com" e "fecha com" só com o primeiro e o último versículo de verdade.
6. **Marcos completos.** Toda troca de nome, aliança, reencontro, mudança de terra, morte,
   sepultamento e subida aos céus de protagonista aparece em algum galho, conexão ou curiosidade (Gênesis tinha perdido Gn 17, 33
   e 46). Liste os capítulos do livro e marque onde cada um aparece (galho, conexão, curiosidade,
   autoria): Mateus tinha deixado de fora os capítulos 15, 19 e 22 e a Grande Comissão (28.19-20).
   Cada referência aparece uma vez no mapa; curiosidades seguem a ordem dos capítulos. Antes de
   escrever, monte a tabela dos versículos-chave e decida onde cada um mora (raiz, galho,
   conexão, par, curiosidade): em Levítico, 16.16, 16.30, 19.18 e 12.8 eram disputados.

Fora do próprio livro só entram, e marcados como tal: o **significado do nome** (é tradução, não
fato novo), a seção **"[Livro] e Cristo"**, com as citações do Novo Testamento (livro, capítulo e
versículo, para conferir), e **o nome de Jesus dentro do ramo** quando o Novo Testamento liga a
passagem a ele. O mapa é para quem lê com fé em Cristo, então diz com todas as letras: "Esse
Servo é Jesus" (At 8.32-35; Lc 22.37), num destaque escuro no fim do ramo, com as referências do
NT que provam a ligação. Sem a referência do NT, não se faz a ligação. Os destaques de um mesmo mapa abrem de jeitos
diferentes (em Levítico, dois começavam com "O sumo sacerdote que...") e não dizem mais que o
versículo do NT (Hb 7.27 fala de sacrifícios diários, não de "nada"). Datas em a.C., achados arqueológicos e opiniões de comentaristas ficam
fora.

**Livros do Novo Testamento** (Mateus, 02/10): o livro inteiro já fala de Jesus, então
"[Livro] e Cristo" mostra como o próprio livro lê o Antigo Testamento: cada par leva em `at` a
profecia que o livro cita (texto da NBV do AT) e em `nt` o trecho do livro que a cumpre
(`Mq 5.2` → `Mt 2.1-6`). O destaque `jesus` vai onde o texto identifica uma figura com Jesus,
com referência do próprio livro ("O Filho do Homem é o agricultor", Mt 13.37) ou de outro livro
do NT (a pedra rejeitada, At 4.10-11). O significado do nome é grego (`"lingua": "grego"`).

**Estrutura**
- **A raiz:** a ideia central em um parágrafo direto (mais uma frase de apoio, se precisar).
- **Ramos:** de 4 a 6 pilares, cada um com nome curto e forte e uma linha de subtítulo (até uns
  30 caracteres, para caber numa linha ao lado do desenho a 390px) que resuma o ramo inteiro,
  não só um galho. O nome no pincel cabe numa linha com até uns 16 caracteres ("Santos no dia a
  dia", com 19, quebrou; virou "Vida santa"). Nada de pronome com hífen no
  fim de frase ("odiá-lo"): a linha quebra no hífen.
- **Ramificações:** de 3 a 6 por ramo, cada uma com a referência no fim.
- **Conexões:** entre um ramo e o seguinte, uma frase que mostra o raciocínio do autor bíblico
  (de preferência ligando dois versículos do próprio livro, como o toco de Is 6.13 que vira o
  rebento de Is 11.1). **No máximo 150 caracteres e 4 linhas a 390px** (regra do dono, 02/10):
  uma frase de ligação, não um resumo. Na prática, mire em até uns 115 caracteres: com aspas,
  duas referências entre parênteses e palavras longas, as de 122 a 138 de Êxodo deram 5 linhas.
  Com duas referências e uma citação longa, mire em uns 100: em Marcos, 113 caracteres deram 5
  linhas; a citação longa vira uma palavra entre aspas ("“Vigiem”, pede Jesus").
  Confira as linhas no `teste-mapas` (que conta a 390px) e na captura de 360px, não só a contagem. Conexão longa empurra o cruzamento do S para
  baixo e a área fica alta demais (a de 247 do ramo 3 de Mateus chegou a fazer a curva cruzar o
  texto a 360px). O `checar-mapa` barra o que passar de 150.

Depois dos ramos vêm, nesta ordem, as seções fixas: **Significado do nome**, **Autoria e
época** (só o que o livro diz), **[Livro] e Cristo**, **Estrutura do livro** (partes com
capítulos e o "você está aqui"), **Curiosidades do texto** (só fatos que estão no livro) e
**Enquanto lê, procure** (uma palavra ou expressão que se repete no livro). No topo da tela, o
grupo (Profetas maiores...), o nome, "Livro N de 66" e o número de capítulos.

Antes de entregar o texto:
- `grep -n -i -E "—|mergulh|crucial|fundamental|\bdança\b|em resumo|vale ressaltar|\bteia\b|jornada|multifacet"` não acha nada
  (com `\b`: sem ele, "plateia" acusa "teia");
- cada referência foi conferida na Bíblia do app (`conteudo/biblias`);
- nenhum item começa igual ao anterior, e nenhuma palavra se repete na mesma frase ("No barco,
  as ondas inundam o barco");
- nenhuma palavra com hífen sobrando no texto (`grep -o -E '[[:alpha:]]+-[[:alpha:]]+' <mapa>.json`
  e tirar da lista só os ids de desenho; em Marcos, "tornou-se" de 1Pe 2.7 escapou dentro de aspas);
- nenhum ponto depois de "!”" ou "?”" (`grep -n '[!?]”\.'`), e palavra com hífen (nos galhos,
  nas conexões e nas curiosidades) só se não houver outra ("boas-novas" e "beira-mar" quebraram
  no hífen a 390px; "perto do mar", "No meio da noite"); quando o hífen está na própria citação
  da NBV (“Levantem-se...”), a citação vira paráfrase;
- no texto de "[Livro] e Cristo", aspas só para o versículo da `ref` (o checador confere contra
  ela); o Novo Testamento entra em paráfrase com a referência entre parênteses;
- toda conexão que mudou foi medida de novo (até 150 caracteres; o checador barra).

## 2. Como desenhar

**Estilo:** traço de pena, como gravura simples. Tinta `#151615` (2px nos contornos, 1px com
opacidade .7 nas hachuras), preenchimento branco e **no máximo uma área em sálvia `#c8da8c`** por
desenho. Nada de emoji, nada de formas chapadas coloridas, nada copiado de outra Bíblia. Caixa
`viewBox="0 0 120 120"`, mostrada a 96 ou 112px.

**Escolha do desenho:** um objeto concreto que está no texto do ramo (o altar de Is 6.6, a vinha
de Is 5, a muralha de Is 36, o cordeiro de Is 53.7, o cântaro de Is 55.1, o toco que brota de
Is 11.1). Se o objeto não fica claro num desenho simples, **troca o objeto**; um desenho bom de
uma coisa mais simples vale mais que um desenho estranho da coisa certa.

**Revisão obrigatória (regra do dono):** toda ilustração e toda seta é revisada nos detalhes antes de
entrar. Renderize ampliado (280px ou mais) e confira:
- nada torto, solto, cortado pela borda ou sobrando para fora do contorno;
- nenhuma peça sobreposta a outra sem querer (folha em cima das uvas, alça dentro do corpo);
- partes ligadas onde deveriam estar (cabeça no corpo, cacho no ramo, pena tocando o rolo);
- dá para dizer o que é sem legenda;
- o desenho de "[Livro] e Cristo" fica sobre um disco: tudo cabe num círculo de raio 54 em volta
  de (60,60), senão a borda corta (a escada de Gênesis cortou o chão e a pedra). Meça: a
  distância de cada ponta ao centro, somando o traço, fica em uns 50 para sobrar respiro (as
  raízes do tronco de Isaías iam a 60 e saíam cortadas; corrigido em 02/10).
- encaixes calculados, não chutados: cabo que toca o galho e a fruta, pé que nasce no bojo da
  panela (ponto tirado da curva); traço que não representa nada sai.
- raios de barbatana (ou de leque) saem da base e param a uns 60% do caminho até o bico, para
  ficar dentro do contorno; pescoço e cabeça de animal num `path` aberto com `.p` (o papel fecha
  por dentro do corpo e esconde a junção sem traço sobrando); casco é um trapézio cheio (`.e`)
  assentado na curva do chão, nunca um "T"; preenchimento de chão fecha por uma curva rasa, não
  por uma reta (o peixe e o bode de Levítico).
- água se reconhece pelo arco: sai de lado, da borda da rocha ou do jarro, curva e cai numa poça,
  com traços curtos de respingo. Faixa reta vira régua, traços saindo de um ponto viram raízes,
  e gota em círculo vira botão (a rocha de Êxodo precisou de cinco tentativas). O jorro cai sobre
  a borda de cima de uma poça larga, não no centro dela: entrando no meio da elipse, vira cano
  enfiado num bueiro.
- ave que desce (a pomba de Mc 1.10) se desenha de frente: cabeça para baixo, asas abertas para os
  lados com a borda de trás em penas, cauda em leque no alto. De lado, a asa de trás vira orelha e
  o corpo, lesma. Cruz fica no alto de um monte largo, com o caminho subindo; num montinho, vira
  túmulo; o caminho tem as beiras se abrindo para baixo (em paralelo vira rachadura). Rio sob
  outra peça vai em ondas de traço: faixa sálvia fechada nas pontas vira salsicha. O que está
  dentro de um cesto ou vasilha desce até abaixo da borda da frente, que o cobre (base reta na
  altura da borda parece tampa). Peça apoiada em outra (a moeda em pé sobre a deitada) tem a base calculada dentro da
  face de cima, não em cima da borda.
- papel (`.p`) só dentro de um contorno do objeto: um retângulo de papel para esconder parte de
  uma peça vira caixa branca sobre o fundo cinza da página (o barco de Mateus). Para pôr o casco
  dentro da água, o fundo do casco é a própria curva da onda (pontos tirados da curva).
- confira as três linhas do `ver-desenhos` e também o desenho na tela de verdade: o fundo da
  folha do `ver-desenhos` é branco como o papel e esconde esse defeito.
`CHROME=... node ferramentas/ver-desenhos.mjs <saida.png> <id...>` mostra cada desenho a 280px no
claro, no escuro e sobre o disco; olhe a imagem com Read.
Depois, renderize a tela inteira a 390px e confira cada seta: a ponta aponta para o bloco certo,
a curva não cruza texto, a conexão escrita não encosta na linha pontilhada. Confira nos dois
temas: no escuro o desenho vira traço claro sobre papel grafite (as classes de traço seguem o
tema; nunca cor literal dentro do SVG).

Para renderizar sem o runtime do canvas, troque a linha do `support.js` por `@font-face` com as
fontes de `dist/` e use `CHROME=... --headless --screenshot` (como em `design/mapas/`). Com o
app no ar (cookie da pasta de estado desse servidor; se a folha de consentimento aparecer, mande
`POST api/consentimento` com o cookie antes), a tela de verdade sai com `CHEIA=1 node design/ferramentas/foto-conta.mjs 390 844
<saida.png> '#/mapa/<slug>' 0 <claro|escuro>` (página inteira; com mais de uns 10.000px de
altura, passe `ESCALA=1.5`, porque a 2x o Chrome trava sem erro, e rode sempre com `timeout`;
a página inteira para em 12.000px e o `foto-conta` avisa quando corta: o resto sai sem `CHEIA`,
com o `rolar` que o aviso indica); recorte em pedaços de 1500px
para olhar peça por peça, porque a página inteira reduzida esconde defeito.

## 3. Como montar a tela

- **Nomes no pincel:** nome do livro, nomes dos ramos e títulos grandes em Permanent Marker (como
  "Isaías" no topo). Rótulos de seção em Manrope 800, maiúsculas, espaçadas, com um ícone de
  traço de 20px na frente ("SIGNIFICADO DO NOME"). Corpo em Manrope; a raiz e os versículos em
  Literata.
- **Setas curvas pontilhadas, como a trilha:** os blocos não ficam empilhados como cartões. Eles
  alternam de lado, e cada passagem tem uma curva pontilhada (pontos de 2.4px, ponta redonda,
  passo de uns 7px acertado pelo comprimento da curva para o último ponto cair no bico) que
  termina numa ponta de seta em cima do próximo bloco.
  A curva é **um S simétrico** (regra do dono, 02/10): sai vertical do bloco de cima, cruza com a
  mesma curvatura dos dois lados e chega vertical em cima do bloco de baixo, com os pontos de
  controle a 55% da altura, um em cada ponta. Ponto de controle perto do fundo faz a linha
  descer reta e dobrar num cotovelo perto do fim ("torta e quebrada" no iPhone). A **ponta segue
  a tangente** no fim da curva, com o bico exatamente no fim da linha: nada de "v" fixo para
  baixo. Entre blocos, a altura cresce com a distância de um lado ao outro (64 a 110px), para o
  S não deitar.
  A conexão entre ramos fica em Literata itálico, no canto que a curva deixa livre (64% da
  coluna, até 4 linhas a 390px, conferido no `teste-mapas`): a área tem a menor altura em que nenhum ponto do S cai no texto (com 10px de folga),
  medida de novo quando as fontes terminam de carregar, porque medida com a letra de reserva ela
  saía curta. O `teste-mapas` confere a 390, 375 e 360px que cada seta é um S simétrico, que
  sai e chega na vertical e que a ponta está no fim e na tangente.
- **Cartão só onde ele é necessário:** a raiz (borda tracejada), "[Livro] e Cristo" (escuro) e
  "Enquanto lê, procure" (sálvia pálida). O resto fica direto no fundo da página.
- **Referências** como marca-texto sálvia (`<mark>`), no fim de cada item.
- **O cartão "Mapas dos livros" no Explorar** (aprovado pelo dono, 02/10): um cartão só, logo
  depois de "Pra ir além na leitura de hoje", no sálvia da folha do alto (grafite no escuro), com
  o rolo com a pena, o título no pincel, "N de 66 prontos" com barra e o atalho "Mapa de hoje:
  <Livro>" quando o livro do dia tem mapa. Ele **abre e fecha no lugar** (botão com
  `aria-expanded`), lembra o estado e o testamento enquanto a pessoa anda pelo app e **nunca rola
  a página sozinho**: o cartão antigo levava a uma seção no fim do Explorar, e o dono não quis o
  pulo nem a página poluída. Aberto: Antigo/Novo Testamento (começa no do livro de hoje), a grade
  de duas colunas só daquele testamento, os prontos primeiro e os "em breve" depois, mais
  apagados (só contorno), e um "Fechar" no fim, que fecha sem o resto da página pular. O nome
  nunca quebra no meio da palavra (fonte de 20, 17 ou 14px conforme o tamanho do nome).
- **A ficha e o mapa ligados:** a ficha do livro (Explorar > Livros) ganha "Ver o mapa" logo
  abaixo do nome quando o mapa existe, e o mapa termina com "Ver a ficha do livro". Um nome só
  para cada coisa (ficha, mapa), sem outra lista dos 66.
- Paleta C e as regras de `design/guia-visual.md` continuam valendo; a chama (`--v2-chama`) não
  entra no mapa.

## 4. Onde o conteúdo mora (o formato final, 02/10)

Os 66 mapas não cabem no `index.html` (teto de 1 MB): cada um vive num arquivo próprio, que só
desce quando o mapa abre e fica guardado pelo service worker para abrir sem rede.

- **Conteúdo:** `conteudo/mapas/<slug>.json`, um por livro. O slug é o nome do livro sem acento,
  minúsculo, com hífen no lugar do espaço (`isaias`, `1-samuel`, `genesis`: `CC.slugDoLivro`).
  Campos: `nome` (como a NBV escreve), `grupo` (um dos nove da grade), `numero` (posição no
  cânon), `capitulos`, `significado {lingua, original, transliteracao, traducao, texto}`,
  `autoria {texto, apoio?, refs[], desenho?}`, `raiz {texto, apoio?, refs[]}`,
  `ramos[4-6] {titulo, sub, desenho, galhos[3-6] {texto, ref}, jesus? {texto, refs[]}, conexao?}`,
  `cristo {texto, ref, desenho, pares[] {at, texto, nt, nota?}}`, `estrutura[] {titulo, de, ate}`
  (cobre o livro inteiro, sem buraco), `curiosidades[] {texto, ref}` e `procure {texto, ref?}`.
  O exemplo completo é `conteudo/mapas/isaias.json`.
- **Referências:** sempre com a sigla da tabela dos 66 (`Is 6.1-4`; `Is 13–23` com meia-risca
  entre capítulos; `Is 65.17, 25`; `At 8.32-35`). Dentro de um texto corrido (a conexão), entre
  parênteses: "(Is 6.13)". O destaque `jesus` só com referência do Novo Testamento.
- **Citações:** toda citação entre aspas bate, palavra por palavra, com a NBV da referência do
  item (`conteudo/biblias/nbv.json`), porque é a NBV que a pessoa abre no app. O mock de Isaías
  tinha cinco de memória (Almeida/NVI) que não batiam; o checador barra isso.
- **Desenhos:** `conteudo/mapas/desenhos/<id>.svg`, reutilizáveis entre livros,
  `viewBox="0 0 120 120"`, só com as cinco classes de traço (`.k` contorno, `.h` hachura, `.p`
  papel, `.s` sálvia, `.e` cheio) e um `<style>` para vê-los sozinhos. Nada de cor literal nas
  formas: as cores vêm do `27-mapas.css` e seguem o tema (traço claro sobre papel grafite no
  escuro; no cartão escuro "[Livro] e Cristo", o desenho fica sobre um disco de papel claro).
  O build tira o `<style>` e embute no JSON publicado só os desenhos que o mapa usa.
- **Publicação:** `conteudo/mapas/indice.json` lista os `publicados`. O build (`build.mjs`)
  gera `dist/mapa-<slug>.<resumo>.json` (+ `.gz`) só para esses, injeta a lista em
  `window.MAPAS` (antes de `window.BIBLIAS`: os testes leem a lista de bíblias até o fim do
  bloco) e manda o service worker guardá-los no cache `caminho-mapas`. O servidor entrega
  `mapa-*.json` sem sessão e com cache longo, como as fontes. Um mapa escrito mas ainda não
  revisado por alguém da igreja fica fora do índice e aparece na grade como "em breve".
- **Tela:** `src/app/06b-mapas.js` (a tabela dos 66 com grupo e sigla, o cartão do Explorar
  com a grade por testamento, o link da ficha, a rota `#/mapa/<slug>`, as setas calculadas na largura real da coluna,
  a conexão cuja altura cresce com o texto, o "você está aqui" pelo progresso do plano) e
  `src/estilo-v2/27-mapas.css`. A rota conta como Explorar no roteador; voltar de um mapa
  aberto pelo cartão reabre o Explorar no mesmo ponto, com o cartão como estava. O desenho do
  cartão (`pena-e-rolo`) entra no código pelo build, no lugar da marca `'@@DESENHO:<id>@@'`.
- **Conferência:** `node ferramentas/checar-mapa.mjs <slug|--todos>` (campos, referências na
  NBV, citações, palavras proibidas, travessão, itens consecutivos começando igual, conexão até
  150 caracteres) roda também
  dentro do `node teste.mjs`. `CHROME=... node ferramentas/teste-mapas.mjs` abre tudo no
  navegador: o cartão (abre e fecha no lugar, testamentos, ordem, 44px, 360px), a ficha, o mapa, setas e desenhos, nenhuma curva cruzando o texto da conexão, 390 e
  360px, os dois temas, a Bíblia igual, sem rede; e passa por todo mapa do índice conferindo
  ramos, desenhos, setas, curvas fora do texto e largura a 390 e 360px. As capturas de referência ficam em
  `design/mapas/capturas/` (Explorar com o cartão fechado e aberto e cada mapa inteiro, claro e
  escuro, a 390px; o "antes" de um pacote de ajustes vai numa subpasta, como `antes-pacote/`).

Para um mapa novo: escrever o JSON, desenhar os SVGs e revisá-los ampliados (seção 2), rodar o
checador, subir o servidor e olhar a tela inteira nos dois temas (seção 2, revisão), pôr o slug
no índice e só então publicar. Cada mapa novo passa por revisão de alguém da igreja antes de ir
ao ar.
