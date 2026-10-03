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

**Voz humana (regra do dono, 2026-10-03).** Os primeiros 11 mapas passaram na lista de palavras
proibidas e ainda assim saíram com cara de IA ("o relato tem pressa", em Marcos: "ninguém escreve
assim"). Lista de palavras não mata vício de linguagem; só leitura e reescrita matam. O que segue
é o guia completo: quem escreve aplica enquanto escreve, e quem revisa relê cada parágrafo contra
ele. O `checar-mapa` pega só a sobra mais grosseira (uma rede, não a revisão).

**A voz.** Alguém da célula contando o livro para um amigo que nunca o leu, numa mesa de café, e
o amigo precisa sair querendo abrir o livro. Não é professor dando aula, não é resumo de prova, não
é texto de contracapa. Pergunta de controle em cada parágrafo: eu falaria isso assim, em voz alta,
para o meu amigo? Se não, está errado, mesmo que cada palavra seja permitida.

**Os vícios, um a um (todos barrados):**

1. **Coisa agindo como gente.** O livro, o relato, o texto, a narrativa, a cena, a linha, o
   capítulo, a seção, o versículo nunca fazem nada: não "tem pressa", não "anuncia", não "se
   volta", não "mostra", não "fecha com", não "abre com", não "serve de título", não "ganha
   ritmo", não "revela", não "aponta", não "retoma", não "ecoa". Quem age é Jesus, Moisés, o
   povo, Deus, o leitor e o autor como pessoa: "Marcos começa dizendo", "a última coisa que Lucas
   conta", "Moisés repete".
2. **Conectivo de redação.** "Daí em diante", "Ao lado dela", "A partir daí", "Em seguida",
   "Nesse ponto", "Nesse sentido", "Por sua vez", "Dito isso", "Assim", "Dessa forma", "Portanto",
   "Logo depois disso", "Ao mesmo tempo", "Enquanto isso" no começo de frase para costurar
   parágrafo. Quem fala diz "Depois", "E então", "No caminho", "Ali", "Naquela noite", ou
   simplesmente começa a frase seguinte.
3. **Lista de verbos comprimida.** "Ensina, cura, enfrenta os líderes e sobe a Jerusalém",
   "cria, chama, separa e promete". Ou escolhe o que importa, ou vira cena em frases curtas.
   Três verbos seguidos com o mesmo sujeito já é resumo de prova.
4. **Palavra de resumo escolar.** "Enfrenta", "confronta", "culmina", "retrata", "aborda",
   "evidencia", "destaca", "apresenta", "estabelece", "demonstra", "ressalta", "constitui",
   "configura", "centurião", "trajetória", "episódio", "contexto", "dinâmica", "elemento". Troca
   pela palavra que a gente diz: "bate de frente", "termina", "conta", "mostra", "soldado romano",
   "caminho", "história", "aquela noite".
5. **Tese no começo.** Parágrafo que abre com a frase que o resume ("Marcos é o evangelho da
   ação", "Este ramo mostra a autoridade de Jesus") e depois prova. O amigo quer a cena, não o
   tema: abre pelo que surpreende ("Quatro homens abrem um buraco no teto.").
6. **Fecho de efeito.** Última frase que amarra tudo com moral ou síntese ("E é assim que...",
   "Tudo converge para...", "Aqui está o coração do livro"). O parágrafo termina na última coisa
   que aconteceu ou no que a pessoa disse.
7. **Par que soa igual.** Dois galhos seguidos com a mesma cadência ("No rio... / No mar..."),
   dois destaques que abrem com o mesmo "O X que..." , dois parágrafos com a mesma música de
   frase longa, dois-pontos, citação. Varia o tamanho das frases: uma de quatro palavras depois de
   uma de vinte.
8. **Frase que não cabe na boca.** Mais de umas 25 palavras, ou com dois apostos e um parêntese
   no meio. Quebra em duas. Oração intercalada entre vírgulas ("Jesus, depois de orar no monte,
   desce") vira ordem direta ("Jesus ora no monte. Depois desce.").
9. **Nominalização.** "A chegada de Jesus a Jerusalém provoca", "a rejeição dos líderes", "a
   confirmação da mensagem". Volta para o verbo: "Jesus chega a Jerusalém e", "os líderes
   rejeitam", "o Senhor confirma".
10. **Voz passiva sem motivo.** "É confirmado", "são enviados", "é entregue" quando se sabe quem
    fez: "Deus confirma", "Jesus envia os doze", "Judas entrega".
11. **Adjetivo de contracapa.** "Impactante", "marcante", "profundo", "poderoso", "surpreendente",
    "intenso", "belíssimo", "emblemático", "icônico". Nada de qualificar a cena; a cena se
    qualifica sozinha. Se o fato é surpreendente, conte o fato e deixe o amigo se espantar.
12. **Pergunta retórica de apresentação.** "Quem é este homem?", "O que faz um livro ser...?"
    como abertura de parágrafo. Só se a pergunta está no próprio texto bíblico, entre aspas.
13. **Metalinguagem.** "Neste ramo", "como vimos", "a seguir", "o leitor perceberá", "repare
    como", "note que". O mapa não fala de si mesmo.
14. **Explicação por cima do texto.** "Isso significa que", "ou seja", "em outras palavras", "o
    que mostra que". Se a frase precisa de tradução, escreve-se logo a tradução.
15. **Cantilena de três.** Trio de adjetivos ou substantivos por ritmo ("poder, autoridade e
    compaixão"). Um ou dois bastam; três é vício de IA.

**Como escrever para não cair.** Primeiro conte o ramo em voz alta (literalmente, ou digitando
como se falasse), sem olhar a versão anterior, só com a folha do `rever-mapa` ao lado. Depois
conserte a fidelidade (nomes, números, citações da NBV exatas, referências). Nunca ao contrário:
quem parte do texto antigo e "humaniza" mantém a estrutura de resumo. Palavras do dia a dia,
frases curtas, cena antes de ideia, e um só "achado" por parágrafo (a coisa que faz o amigo
levantar a sobrancelha). Cada campo é escrito e relido em voz alta na hora, corrigido ali, e
pronto: não se escreve o mapa inteiro para voltar revisando depois (regra do dono, 03/10: escrever
certo uma vez custa menos que escrever e consertar).

**Como revisar.** Quem revisa lê cada campo de texto (raiz, apoio, galhos, conexões, destaques,
"[Livro] e Cristo" e notas, estrutura, curiosidades, procure, autoria, significado) em voz alta,
um por um, com a lista dos 15 vícios ao lado, e anota o número do vício e o trecho. Um vício em
qualquer campo devolve o mapa. A revisão de voz é separada da revisão de fidelidade: as duas são
obrigatórias, e nenhuma substitui a outra. A passada de voz de outro agente é curta: só os campos
novos contra a lista, sem reler a Bíblia (fidelidade é do `rever-mapa` e do checador). Captura de
tela só quando muda desenho ou tela; para texto, o `teste-mapas` já mede as linhas a 390px.

Antes (Marcos, reprovado):

> Marcos abre com uma linha que serve de título: “Aqui começa a boa notícia de Jesus Cristo, o
> Filho de Deus”. Daí em diante, o relato tem pressa: Jesus ensina, cura, enfrenta os líderes e
> sobe a Jerusalém, onde morre numa cruz. Ao lado dela, um centurião romano diz o que a primeira
> linha anunciou: “Verdadeiramente, este homem era o Filho de Deus!”

Vícios 1 ("o relato tem pressa", "a linha anunciou", "abre com", "serve de título"), 2 ("Daí em
diante", "Ao lado dela"), 3 ("ensina, cura, enfrenta e sobe"), 4 ("enfrenta", "centurião").

Depois (aprovado pelo dono):

> Marcos vai direto ao ponto. Na primeira frase ele já diz quem é Jesus: o Filho de Deus. Depois,
> tudo acontece rápido: Jesus cura, ensina, bate de frente com os líderes religiosos e vai para
> Jerusalém, onde é crucificado. E é ali, vendo Jesus morrer, que um soldado romano diz a mesma
> coisa que o livro disse no começo: “Verdadeiramente, este homem era o Filho de Deus!”

O `checar-mapa` barra as sobras mais fáceis (lista `VOZ`: "o relato", "a narrativa", "daí em
diante", "serve de título", "fecha/encerra/abre com", "o texto se volta", "culmina", "por sua vez",
"nesse sentido") e, para os 11 mapas de antes da regra, só cobra depois que cada um sai da lista
`AINDA_NA_VOZ_ANTIGA`. Passar no checador não quer dizer nada sobre a voz: a leitura em voz alta é
a revisão.

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
   Vale para número e idade ("Aos 12 anos" é Lc 2.42, não 2.49) e, quando outro item já usa o
   versículo com o nome do lugar, o galho escreve em volta ("na sinagoga da cidade dele", Lc 4.23,
   porque Nazaré está em 4.16, do par de Is 61) em vez de repetir a referência.
   Vale para nome próprio ("Jetro" não está em Êx 18.13-25, só "o sogro de Moisés") e para o
   tempo do verbo: promessa ou ordem de Deus se conta como promessa ("Deus promete pôr Moisés
   numa fenda da rocha", Êx 33.22), não como fato que já aconteceu. Promessa com condição leva o
   "se" junto ("Se o povo espalhado confessar o pecado, Deus promete...", Lv 26.40-42), e quem
   sofre a consequência é quem o versículo diz (em Lv 7.18 perde a oferta quem a apresentou), e quem
   faz também, mesmo com intermediário (Jz 17.4: a mãe de Mica entrega a prata ao fabricante, que faz
   a imagem; "Mica faz um ídolo" estava errado).
   Palavra de lugar, de gênero e de retomada também, inclusive no texto do NT (em Mt 4, só a
   primeira resposta ao Diabo é "no deserto"; as outras são no templo e num monte): "em Jerusalém" quando o versículo ainda é na
   estrada (Mc 11.10), "o salmo" quando o texto só diz "Escrituras", "outro grito" num item que não
   traz o primeiro (vira "um grito").
   Palavra de recorte também: "só", "o primeiro", "o último", "do capítulo X em diante" se
   conferem nos versículos vizinhos e contando no livro ("só Calebe e Josué entrarão" esquecia
   os filhos de Nm 14.31; o "último dia" de Nm 29.32 não era o último, há o oitavo em 29.35).
   Lei em curiosidade fica no presente da ordem ("a lei manda", "quem faz o voto não come"),
   nunca no imperfeito de costume ("servia", "entrava").
   Verbo de fim ("a última coisa que Moisés diz") só com o último versículo do trecho (Dt 33.27 não
   fecha a bênção, que vai até 33.29). Dado de tempo, festa ou lugar de uma curiosidade ("no sétimo ano", "da
   Páscoa") se procura nos versículos vizinhos, e a referência se amplia para incluí-lo (Dt 15.12;
   16.2). Lei também nos galhos fica como ordem: "o rei não pode juntar", não "não junta".
5. **Ordem do relato.** "Logo depois", "então" e "a partir daí" só quando o livro narra em
   sequência; um relato retrospectivo (Mt 14.3-12, a morte de João; Jz 2.6-9, a morte de Josué, que o
   livro já deu em 1.1) se conta no passado. "Marcos começa
   dizendo" e "a última cena" só com o primeiro e o último versículo de verdade (e nunca "o livro
   abre/fecha com": regra da voz humana).
6. **Marcos completos.** Toda troca de nome, aliança, reencontro, mudança de terra, morte,
   sepultamento e subida aos céus de protagonista aparece em algum galho, conexão ou curiosidade (Gênesis tinha perdido Gn 17, 33
   e 46). Liste os capítulos do livro e marque onde cada um aparece (galho, conexão, curiosidade,
   autoria): Mateus tinha deixado de fora os capítulos 15, 19 e 22 e a Grande Comissão (28.19-20).
   Em livro longo (Lucas, 24 capítulos, com a viagem de 9.51 a 19.27), a tabela de capítulos por
   ramo vem antes de tudo: com o teto de 6 ramos, decida já o que vira curiosidade.
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
O `original` sai na fonte de `src/fontes-originais` (Noto Serif Hebrew e Noto Serif, blocos inteiros
do hebraico e do grego, baixada só pela tela do mapa): o `checar-mapa` barra letra fora desses blocos.

**Livro que o NT quase não cita** (Juízes, 02/10): a ligação vem dos resumos do NT que nomeiam a
época ou as pessoas do livro, como os discursos de Atos (At 13.20-23: juízes, rei, Davi, "o Salvador
Jesus") e a lista da fé (Hb 11.32-34, 39, com Hb 12.2). Na tabela dos versículos-chave, esses
versículos se repartem entre o texto de "[Livro] e Cristo", os pares e o destaque `jesus`, sem
nenhum repetido; o par diz só o que o versículo do NT diz (Hb 11.34 fala dos que "fizeram exércitos
inteiros recuar e fugir", sem nomear Gideão).

**Estrutura**
- **A raiz:** a ideia central em um parágrafo direto (mais uma frase de apoio, se precisar).
- **Ramos:** de 4 a 6 pilares, cada um com nome curto e forte e uma linha de subtítulo (até uns
  30 caracteres, para caber numa linha ao lado do desenho a 390px) que resuma o ramo inteiro,
  não só um galho. O nome no pincel cabe numa linha com até uns 16 caracteres ("Santos no dia a
  dia", com 19, quebrou; virou "Vida santa"); confira a 390, 375 e 360px, porque "O povo abençoado", com 16,
  cabia a 390 e quebrou a 360 (virou "Povo abençoado"), e "Justiça e cuidado", com 17, só quebrou
  a 375 (virou "Justiça diária"). Nada de pronome com hífen no
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
**Enquanto lê, procure** (uma palavra ou expressão que se repete no livro; se ela volta com variações, o texto diz "quase com
as mesmas palavras", conferido em cada ocorrência na NBV). No topo da tela, o
grupo (Profetas maiores...), o nome, "Livro N de 66" e o número de capítulos.

Antes de entregar o texto:
- `grep -n -i -E "—|mergulh|crucial|fundamental|\bdança\b|em resumo|vale ressaltar|\bteia\b|jornada|multifacet"` não acha nada
  (com `\b`: sem ele, "plateia" acusa "teia");
- cada referência foi conferida na Bíblia do app (`conteudo/biblias`), lendo a folha de
  `node ferramentas/rever-mapa.mjs <slug>`, que põe cada item ao lado do texto da NBV das
  referências dele: sujeito, verbo, número, lugar, quantas vezes e se é ordem ou fato;
- nenhum item começa igual ao anterior ("Na colheita" e "Nas vendas", "O livro" e "Os ossos" contam
  como a mesma abertura), e nenhuma palavra se repete na mesma frase ("No barco, as ondas inundam o
  barco"; "um profeta... na boca desse profeta"), contando também a palavra que está dentro da
  citação ("ergue uma grande pedra: “Esta pedra...”", Josué): troca-se a palavra de fora, nunca a da NBV;
- nenhuma palavra com hífen sobrando no texto (`grep -o -E '[[:alpha:]]+-[[:alpha:]]+' <mapa>.json`
  e tirar da lista só os ids de desenho; em Marcos, "tornou-se" de 1Pe 2.7 escapou dentro de aspas;
  em Deuteronômio, o impessoal "vende-se", "passaram-se" e a citação "levá-los": troca-se por sujeito
  ("o povo pode vender"), outro verbo ou paráfrase; em Lucas, as falas da NBV trazem "lembre-se",
  "Alegrem-se", "perdoa-lhes", e "meia-noite" vira "no meio da noite"; nos livros históricos, o nome
  próprio com hífen (Adoni-Bezeque, Cusã-Risataim, Jabes-Gileade, "poste-ídolo") sai: "um rei
  encontrado em Bezeque", "um rei da Mesopotâmia", "uma cidade que faltou à assembleia", "o ídolo");
- nenhum galho termina com palavra de uma ou duas letras antes da referência ("Maria descobriu o
  que é." deixou o "é." sozinho na linha a 360px), nem com citação cortada em reticências logo depois
  dela ("pensa que é...?”": a citação vai até o fim da frase); a palavra curta que abre uma citação
  (“O nome...) a tela já prende à seguinte (`tx` em `06b-mapas.js`);
- em cada item, três perguntas contra a folha do `rever-mapa`: é ordem ou fato (o plano de Js 6.3-5
  fica em "deve marchar", "gritará"; "Doze homens tiram pedras" pede o 4.8, onde a ordem é cumprida)?
  o nome próprio está nesta referência ("os gibeonitas" não está em Js 9.19-21)? a referência já foi
  usada em outro item (conexão e galho seguinte disputavam Js 9.3)? E lida em voz alta, nenhuma frase
  deixa pronome agarrar o substantivo errado ("conquista a cidade e casa com ela") nem o verbo "para"
  colado num "e" ("a água para e forma": vira "para de repente");
- o verbo se confere com o sujeito e com o objeto: em Lc 8.24 Jesus repreende a tempestade, e o vento
  e as ondas se acalmam; a nota dos pares e as curiosidades passam pela mesma releitura dos galhos;
- nenhum ponto depois de "!”" ou "?”" (`grep -n '[!?]”\.'`), e palavra com hífen (nos galhos,
  nas conexões e nas curiosidades) só se não houver outra ("boas-novas" e "beira-mar" quebraram
  no hífen a 390px; "perto do mar", "No meio da noite"); quando o hífen está na própria citação
  da NBV (“Levantem-se...”), a citação vira paráfrase;
- no texto de "[Livro] e Cristo", aspas só para o versículo da `ref` (o checador confere contra
  ela); o Novo Testamento entra em paráfrase com a referência entre parênteses;
- toda conexão que mudou foi medida de novo (até 150 caracteres; o checador barra).
- a nota de cada par fica de pé sozinha e não repete o nome do livro do NT: a tela já escreve
  "Hebreus 11.33:" antes dela ("Hebreus 11.33: Hebreus diz que..." saiu em Juízes); também não começa com
  "e" pendurado na nota anterior;
- cada nome próprio, número e adjetivo do item está no texto da própria referência (Juízes: "os homens
  de Judá" e "Gaza" estavam no versículo anterior; "jovem levita" em outro; "Paulo" em At 13.16, fora da
  ref), e o fato que dá nome ao ramo está em algum galho ("O rei e o voto" não dizia que Abimeleque foi
  proclamado rei, Jz 9.6);

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
- folha de cacho fica ao lado do talo, nunca sobre as uvas, e o talo encosta na primeira uva; flor
  se desenha com pétalas (cinco elipses em volta de um miolo cheio) na ponta de um galho reto:
  círculos viram frutinhas e galho curvo vira gancho (a vara de Números). Correia de arreio fecha
  na argola e a outra ponta morre num contorno (ponto tirado da curva; rédea que sai do desenho
  e acaba no ar é ponta solta), e linha que sai de um ponto do contorno abre ângulo largo com ele (senão vira cunha
  cheia). Área sálvia dentro de outra peça vai só com `.s`, sem traço (com `.k`, vira uma orelha
  dentro da outra). Animal em busto fica com o pescoço aberto embaixo: o papel fecha sem traço.
  Nada que o versículo não traga: a serpente de Nm 21.8 está num "poste", sem trave.
  Espigas vizinhas se abrem em V, com as espigas acima das frutas (lado a lado, os grãos de dentro
  se encostam); talo de cacho sai do alto de uma uva, nunca do vão entre duas; terra vista de longe
  desce até o chão numa curva (fechada por reta vertical vira bloco, e com uma palmeira, ilha), e
  fica baixa e larga, com o rio descendo pelo vale (alta e estreita vira moita; rio em ondas
  horizontais vira mar). Tracinho solto numa área lisa se confere no tamanho da tela (96px): três
  traços curtos viram olhos e boca de um rosto (o Nebo de Deuteronômio).
  Bebê enrolado leva as dobras do cobertor em diagonal (faixas em pé, paralelas, viram lagarta), e o
  cavalete em X da manjedoura tem o cruzamento escondido atrás da frente do cocho, sem pontas
  passando por trás do que está dentro (a manjedoura de Lucas).
  Pedra se desenha em polígono de quinas (redonda vira pão ou batata), e o chão sob peças apoiadas
  vai antes delas no SVG, para o papel delas cobrir a linha (as doze pedras de Josué); peça inclinada
  gira sobre o canto em que se apoia, para não afundar no chão (a coluna do templo de Juízes), e peça
  partida em duas conta como duas áreas na regra da sálvia (a viga); carro de guerra se lê pela frente
  alta e curva, a roda grande de raios na frente da caixa e a lança até a canga (baixo e de roda
  pequena, vira carrinho de mão); lua crescente
  com raio de uns 16 e miolo de 6 ou mais (fina e pequena, vira parêntese); topo de tronco fica
  dentro da copa, sem tampa reta à mostra no vão entre os lobos.
- papel (`.p`) só dentro de um contorno do objeto: um retângulo de papel para esconder parte de
  uma peça vira caixa branca sobre o fundo cinza da página (o barco de Mateus). Para pôr o casco
  dentro da água, o fundo do casco é a própria curva da onda (pontos tirados da curva).
- confira as três linhas do `ver-desenhos` e também o desenho na tela de verdade: o fundo da
  folha do `ver-desenhos` é branco como o papel e esconde esse defeito.
`CHROME=... node ferramentas/ver-desenhos.mjs <saida.png> <id...>` mostra cada desenho a 280px no
claro, no escuro e sobre o disco; olhe a imagem com Read. Depois rode de novo com `TAMANHO=520`,
um ou dois desenhos por vez: ponta solta, cunha e peça sobreposta só aparecem nesse tamanho.
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
  nunca quebra no meio da palavra (fonte de 20, 17, 15 ou 14px conforme o tamanho do nome; "Deuteronômio", com 12 letras, passou da célula pronta a 17px).
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
  ramos, desenhos, setas, curvas fora do texto, largura e o nome de cada ramo numa linha só a 390,
  375 e 360px (os nomes antigos que já quebravam ficam numa lista de exceções, como aviso). As capturas de referência ficam em
  `design/mapas/capturas/` (Explorar com o cartão fechado e aberto e cada mapa inteiro, claro e
  escuro, a 390px; o "antes" de um pacote de ajustes vai numa subpasta, como `antes-pacote/`).

Para um mapa novo: escrever o JSON, desenhar os SVGs e revisá-los ampliados (seção 2), rodar o
checador, subir o servidor e olhar a tela inteira nos dois temas (seção 2, revisão), pôr o slug
no índice e só então publicar. Cada mapa novo passa por revisão de alguém da igreja antes de ir
ao ar.
