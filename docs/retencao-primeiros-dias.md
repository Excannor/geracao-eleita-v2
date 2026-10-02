# Retenção nos primeiros dias: por que a pessoa para antes do dia 3

Diagnóstico de 02/10/2026, medido no commit `b11eed8` (o app é o mesmo de `3b66c59`). Não há dado
de produção aqui: a evidência é a jornada medida no app construído, nos dois caminhos, e a leitura
do conteúdo dos primeiros dias (Primeiros passos, Conhecer Jesus e a Unidade 1). O que foi
implementado a partir disto está no histórico (`git log --grep="Primeiros dias"`), um commit por
correção; o que ficou como recomendação está na seção 8, em lista para marcar.

## 1. Resumo

- **O que mais custa:** a pessoa só vê a Bíblia depois de 9 toques e 5 campos, atravessando duas
  folhas que o app põe na frente dela antes de qualquer valor (Instalar no celular e Notificações);
  e quando enfim chega ao texto, chega sem contexto nenhum e cai, no dia 1, numa lista de 17
  versículos de nomes (Mateus 1).
- **O que mais ajuda:** o que já existe depois da leitura é bom (a reflexão escrita tem voz e
  detalhe, o resumo celebra a chama) e o Conhecer Jesus já faz antes de ler o que o plano não faz
  (diz o que vem, quanto tempo leva, o que reparar).
- **O que fazer primeiro:** tirar as folhas de antes da leitura (o lugar delas é depois do primeiro
  "Até amanhã"); pôr contexto, gancho e guia de leitura antes do texto; e fechar o dia com o
  "amanhã" e com gente (um amigo), em vez de uma frase sorteada. E medir: o painel não diz onde a
  pessoa nova para.

## 2. Como foi medido

```sh
node build.mjs
CHROME=.../chrome.sh PORTA=8690 SAIDA=.../scratchpad/retencao/antes-plano-7        node design/ferramentas/analise/jornada.mjs plano 7
CHROME=.../chrome.sh PORTA=8691 SAIDA=.../scratchpad/retencao/antes-conhecer-2     node design/ferramentas/analise/jornada.mjs conhecer 2
CHROME=.../chrome.sh PORTA=8692 PULAR=2,3 SAIDA=.../scratchpad/retencao/antes-plano-pular23 node design/ferramentas/analise/jornada.mjs plano 4
```

As capturas (uma por passo, 390×844, tema claro) e os relatórios ficam fora do git, em
`/tmp/claude-0/-home-user-geracao-eleita/f83429da-2006-5b51-8495-2381601c862d/scratchpad/retencao/`
(`antes-plano-7/`, `antes-conhecer-2/`, `antes-plano-pular23/`, cada uma com `relatorio.md`). As
capturas "depois" de cada correção ficam na mesma pasta, em `depois-*/`.

### A referência de hoje (antes de qualquer mudança)

| Caminho | Dia | Até o texto bíblico | Até concluir | Interrupções antes do texto | Palavras até o texto | O que leu |
|---|---|---|---|---|---|---|
| plano | 1 | 9 toques + 5 campos | 12 toques + 5 campos | 2: Instalar no celular (`d01-p13`), Notificações (`d01-p14`) | 620 | Gn 1-3 (1896) + Mt 1 (584) = 2480 palavras, uns 12 min |
| plano | 2 | 2 toques | 4 toques | 0 | 453 | Gn 4-5, 1021 palavras, 5 min |
| plano | 3 | 2 toques | 5 toques | 0 | 462 | Gn 6-8 + Mt 2, 2118 palavras, 11 min |
| plano | 4 a 6 | 2 toques | 4 a 5 toques | 0 | ~450 | 7, 10 e 5 min |
| plano | 7 | 2 toques | 5 toques | 0 | 455 | Gn 16-18 + Mt 5, 2871 palavras, 14 min (o maior da semana) |
| plano | some nos dias 2 e 3, volta no 4 | 2 toques | 4 toques | 1: "Ainda tem brasa" (Reavivar hoje) | 76 | ofensiva 1, recorde 1, `zerouEm` 2026-10-03 |
| conhecer | 1 | 10 toques + 5 campos | 12 toques + 5 campos | as mesmas 2 | 315 | "No começo", 787 palavras, 4 min (o app diz 6) |
| conhecer | 2 | 2 toques | 4 toques | 0 | 184 | "O que deu errado", 685 palavras, 3 min |

Tamanho real dos dias da Unidade 1 (palavras da NBV, a 200 por minuto; o app promete pelo
`CC.minutosDoDia`, 4 min por capítulo arredondado a 5): dia 1 = 2362 (12 min, promete 15); dia 2 =
962 (5, promete 10); dia 3 = 2000 (10, promete 15); dia 4 = 1365 (7, promete 10); dia 5 = 1928
(10, promete 15); dia 6 = 1007 (5, promete 10); dia 7 = 2753 (14, promete 15). A promessa fecha em
todos. Os pesados da unidade vêm depois: dias 11 (3153), 12 (3745), 18 (3389), 25 (3541) e 31
(3503), todos acima de 15 min.

## 3. Causas, por impacto

Ordem = impacto × certeza, não esforço. "Quem atinge" é a pessoa nova no plano, salvo quando dito.

| # | Causa | Evidência | Quem atinge | Impacto | Esforço | Correção |
|---|---|---|---|---|---|---|
| 1 | **Muro antes do valor.** Depois de 3 passos de cadastro (nome, nascimento, e-mail, @, senha, consentimento) o app abre com o tutorial de instalar e, logo atrás, o convite de notificações, antes de uma linha da Bíblia. Quem diz "Agora não" fica 7 dias sem convite (justo os dias em que mais se abandona); no iPhone sem o app instalado o convite nem existe. | 9 toques + 5 campos e 2 folhas até o texto (`antes-plano-7/d01-p13`, `d01-p14`, `d01-p15`); `10-roteador.js` partida mostra o tutorial e remove `cc.instalar`, e por isso o código que já existia em `04-licao.js telaResumo` para fazer isso depois da primeira leitura nunca roda | todos | alto | baixo (o código do "depois" já existe) | tutorial e convite só depois do primeiro "Até amanhã" (plano) ou do primeiro "Terminei o dia" (Conhecer); convite de notificações nunca antes da primeira leitura |
| 2 | **Texto sem contexto nem gancho, e a genealogia no dia 1.** A lição diz só "Leitura de hoje. Leia aqui ou na sua Bíblia e marque ao terminar": não diz quem escreveu, para quem, onde estamos na história nem por que Gênesis e Mateus andam juntos. Mateus 1 abre com 17 versículos de nomes (333 das 527 palavras do capítulo) sem um aviso do que é aquilo. As fichas dos livros existem no Explorar, a 3 toques dali, e nunca são oferecidas. | `d01-p17` (a lição), `d01-p22` (Mateus 1 no leitor); a reflexão escrita só aparece depois de concluir (`d01-p27`); seção 4 abaixo | todos; mais quem nunca leu a Bíblia | alto | médio (conteúdo novo, curto, para os dias 1 a 7 e os trechos difíceis da unidade) | cartão "Onde estamos" antes de ler (mapa da história + 2 ou 3 frases + "enquanto lê, procure"), guia de leitura nos trechos de lista com salto para a parte que importa; o plano de leitura não muda |
| 3 | **O dia termina sem amanhã, sem hora e sem ninguém.** O resumo mostra a chama, uma frase sorteada do carimbo ("Firmes no propósito, constantes na oração e inabaláveis na fé", "Marcados pela diferença"), "Desafios do dia: 1 de 3" e "Até amanhã, Joana!". Nada diz o que vem amanhã, quanto tempo leva, nem chama alguém. O dia 2, o que mais decide, não tem marco nenhum (o 3 tem a conquista "Chama acesa", o 7 tem baú, meta e estágio). | `d01-p32`, `d02-p15`, `d03-p18`; `04-licao.js telaResumo`; zero passos sociais nos 7 dias medidos | todos | alto | baixo | cartão "Amanhã" (passagem, minutos e o título-gancho da reflexão do dia seguinte), um destaque próprio no dia 2, e "Chamar alguém para ler junto" para quem ainda não tem amigo |
| 4 | **Ninguém mede onde a pessoa nova para.** O painel tem retorno D1/D7/D30, funil por dias lidos e turmas por semana, mas não separa "abriu a lição", "terminou a leitura", "marcou lido" e "voltou no dia 2" nos primeiros 7 dias de conta. Sem isso, a frase do dono ("não passa de 2 dias") não tem número. | `painel.mjs montarPainel` (`retorno`, `funil`, `turmas`); `contas.mjs anotarAcesso` já guarda a data em que a conta abriu o app | o dono | alto (para decidir) | médio | funil dos primeiros dias no painel, só contagens: criaram, abriram a lição no dia 1, terminaram uma leitura no app, marcaram lido, abriram e leram em cada um dos dias 2 a 7, leram 3 ou mais dos 7 |
| 5 | **Ofensiva que pune o iniciante.** Dois dias sem abrir na primeira semana zeram a chama (recorde 1) e a volta começa pela folha "Ainda tem brasa". O tom é bom; a matemática (`02-estado.js simularOfensiva`: 1 escudo, cobre só buracos do tamanho dos escudos) é a mesma para o dia 2 e o dia 200. | `antes-plano-pular23`: dia 4 abre com a folha, ofensiva 1, `zerouEm` 2026-10-03 (`d04-p01`, `d04-p02`) | quem falha cedo | médio | médio (regra compartilhada com o servidor e documentada no README) | recomendação: um escudo a mais na primeira semana de conta (ver seção 8) |
| 6 | **Sem lembrete no dia 2.** O "volta" (`notificacoes.mjs DIAS_DE_VOLTA`) começa no 3º dia sem ler; o lembrete diário só chega a quem aceitou push, e a causa 1 faz quase ninguém aceitar no dia 1. | `teste-notificacoes-regras.mjs`; jornada: `Notification.permission: default` ao fim de todos os dias | quem não ligou push | médio | baixo a médio | a causa 1 já muda o momento do pedido; recomendação: "Amanhã, a que horas?" no fim do dia 1 e lembrete do 2º dia para conta nova |
| 7 | **Primeiros passos densos e pouco visíveis.** 12 lições de 635 a 877 palavras, sem tempo estimado na lista e sem interação no meio; o atalho "Novo na fé? Comece pelos Primeiros passos" some depois de 3 dias lidos. | `conteudo.json` (`D.licoes`), `05-licoes.js`, `03-trilha.js folhaDoTopo` (`novo`) | quem acabou de se converter | médio | baixo (minutos na lista) a médio (resumo em uma frase) | minutos estimados na lista; recomendação: uma frase de abertura por lição e uma pergunta de um toque no fim |

Hipóteses olhadas e descartadas como causa principal: a promessa de tempo (fecha em todos os dias
medidos); erros de console ou de rede (zero em 7 dias); a sessão (cookie e localStorage sobrevivem
aos 7 dias); o cadastro em si (5 campos e o consentimento são o mínimo que o produto decidiu pedir,
e vêm antes de qualquer app mostrar valor; o custo deles é real, mas não muda sem o dono).

## 4. Conteúdo e interesse

O dono perguntou se está genérico demais, se falta um "tchan" e se falta contexto. As três notas
vão de 0 a 5. **Personalidade** é o contrário de genérico (5 = ninguém confundiria com outro app
devocional; 0 = poderia estar em qualquer um). **Tchan** é se há um momento "uau" no dia (um
detalhe surpreendente do texto, uma ligação entre Gênesis e Mateus, uma pergunta que incomoda) e se
ele chega antes de a pessoa desistir. **Contexto** é se, antes de ler, a pessoa sabe quem escreveu,
para quem, quando, onde está na grande história e por que aquelas duas passagens andam juntas.

Olhando a tela inteira do dia (o que a pessoa vê antes, durante e depois de ler), não só o texto
da reflexão.

### 4.1 Dia a dia, dias 1 a 7

| Dia | Leitura | Personalidade | Tchan | Contexto | O que a pessoa vê antes de ler, e o que falta |
|---|---|---|---|---|---|
| 1 | Gn 1-3 · Mt 1 | 2 | 2 (existe, mas só depois de concluir) | 0 | "Leitura de hoje. Leia aqui ou na sua Bíblia e marque ao terminar." Nada sobre o que é Gênesis, o que é Mateus, por que os dois hoje, nem que Mateus 1 é uma lista. O tchan do dia (a promessa de Gn 3.15 e a resposta que começa em Mt 1.1) não é dito em lugar nenhum. |
| 2 | Gn 4-5 | 3 | 3 (reflexão "O pecado está à sua espera") | 0 | Igual ao dia 1, com "Hoje é mais leve: uma leitura só!". Gênesis 5 é outra lista (32 versículos; "morreu" aparece 8 vezes) e ninguém avisa que no meio dela um homem não morre (Gn 5.24). |
| 3 | Gn 6-8 · Mt 2 | 3 | 3 ("Depois, o Senhor fechou a porta", Gn 7.16) | 0 | Nada diz que Mateus 2 é Jesus bebê fugindo de um rei para o Egito, nem que a embarcação tem 150 metros (Gn 6.15). |
| 4 | Gn 9-10 · Mt 3 | 3 | 2 | 0 | Gênesis 10 é a lista dos povos que saíram dos filhos de Noé (32 versículos, 442 palavras) sem aviso. O tchan está em Mateus 3.17: a voz do céu diz "Este é o meu Filho amado" antes de Jesus fazer qualquer coisa nesta leitura. |
| 5 | Gn 11-13 · Mt 4 | 3 | 4 (Babel: "nos tornaremos famosos", Gn 11.4, e Deus a Abrão: "tornarei o seu nome famoso", Gn 12.2) | 0 | Começa a história de Abraão, o ponto de virada do livro, e a tela é a mesma de sempre. Gn 11.10-32 é mais uma lista (319 palavras). |
| 6 | Gn 14-15 | 4 | 4 ("Contar as estrelas") | 0 | Gênesis 14.1-12 é uma guerra de nove reis com nomes impronunciáveis (277 palavras) antes de chegar a Ló. |
| 7 | Gn 16-18 · Mt 5 | 4 | 4 ("O Deus que me vê", Gn 16.13) | 0 | O dia mais pesado da semana (2871 palavras) e o Sermão do Monte, sem uma linha dizendo que Mateus 5 é o discurso mais famoso de Jesus. O baú e a meta de 7 dias chegam no fim: bom. |

**Em resumo:** antes de ler, o plano é genérico (nota 2 em personalidade na tela da lição, 0 em
contexto, 0 em tchan); depois de ler, é bom (a reflexão escrita sobe para 3 a 4 em personalidade e
tchan). O problema é a ordem: o melhor do dia chega depois do esforço, e a pessoa que para no meio
de Mateus 1 nunca chega lá.

### 4.2 Trechos que soam genéricos, e a versão com personalidade

Textos reais do app hoje, com a troca proposta (as trocas de tela foram implementadas; as de
notificação ficaram como recomendação).

| Onde | Hoje | Proposta |
|---|---|---|
| Lição, cabeça (`04-licao.js telaLeitura`) | "Leitura de hoje" / "Leia aqui ou na sua Bíblia e marque ao terminar." | O cartão "Onde estamos" logo abaixo, com o mapa e o texto do dia: no dia 1, "Hoje você lê a primeira página da Bíblia e a primeira do Novo Testamento. Não é coincidência: Gênesis abre uma promessa (3.15) e Mateus começa a responder (1.1)." |
| Balão do dia 1 (`03b-fala-do-dia.js`) | "Seu primeiro dia é Gênesis 1-3 e Mateus 1. Leva de 10 a 20 minutos. Bora?" | "Seu primeiro dia: a primeira página da Bíblia e a primeira do Novo Testamento, de propósito juntas. Uns 12 minutos. Bora?" |
| Resumo do dia (`telaResumo`) | Frase sorteada do carimbo ("Firmes no propósito, constantes na oração e inabaláveis na fé") | A frase fica (é a identidade do app), mas ganha em cima o cartão "Amanhã: Dia 2, Gênesis 4-5, uns 5 min. O pecado está à sua espera." |
| Resumo, botão | "Até amanhã, Joana!" | Fica. O que muda é o que vem antes dele: amanhã, o marco do dia 2, e "Chamar alguém para ler junto" quando não há amigo. |
| Lembrete sem ofensiva (`notificacoes.mjs T.lembreteSemOfensiva`) | "Bora começar? Um dia de cada vez. A leitura de hoje tá te esperando." | Recomendação: carregar o gancho do dia: "Hoje: O pecado está à sua espera (Gênesis 4-5, 5 min)". O servidor já tem o plano. |
| Leitor, Mateus 1 (`04b-leitor.js`) | O capítulo começa direto em "Estes são os antepassados de Jesus Cristo" e seguem 17 versículos de nomes | Uma nota de guia antes do capítulo: "Os versículos 1 a 17 são a certidão de nascimento de Jesus: 42 gerações. Leia rápido, repare só nas quatro mulheres (Tamar, Raabe, Rute e a viúva de Urias) e pule para o 18, onde a história começa." Com o botão "Ir ao versículo 18". |

### 4.3 O tchan de cada dia (o que existe e o que foi criado)

Todos conferidos na NBV da leitura do dia (`conteudo/biblias/nbv.json`); nada de citação de memória.

- **Dia 1.** A primeira pergunta que Deus faz a alguém nesta leitura é "Onde você está?" (Gn 3.9),
  a um homem escondido. E a ligação dos dois livros: em Gn 3.15 Deus promete que "o descendente da
  mulher esmagará a sua cabeça"; Mateus abre com "os antepassados de Jesus Cristo, filho de Davi,
  filho de Abraão" (Mt 1.1), ou seja, com a linhagem desse descendente. A genealogia tem quatro
  mulheres (Tamar, Raabe, Rute e "a viúva de Urias", Mt 1.3, 1.5, 1.6), nenhuma com história
  arrumada. Pergunta para levar: se Deus pergunta "onde você está?" a quem se esconde, onde você
  está hoje?
- **Dia 2.** Gênesis 5 repete "e morreu" oito vezes; um só não morre: "Enoque sempre andou com Deus
  e um dia desapareceu, porque Deus o levou" (Gn 5.24). E antes do crime, Deus avisa Caim: "o
  pecado está à sua espera" (Gn 4.7); a reflexão já usa isso.
- **Dia 3.** A embarcação tem 150 metros (Gn 6.15), e quem fecha a porta é o Senhor (Gn 7.16). Em
  Mateus 2, um rei manda matar crianças e o Filho de Deus foge para o Egito como refugiado (Mt
  2.13-15): o Egito volta à história, e vai voltar de novo quando o plano chegar em Êxodo.
- **Dia 4.** O arco-íris é um sinal para Deus se lembrar ("então me lembrarei da minha aliança",
  Gn 9.15), não para nós. E a voz do céu, "Este é o meu Filho amado, em quem tenho grande alegria"
  (Mt 3.17), vem antes de Jesus fazer qualquer coisa nesta leitura.
- **Dia 5.** Em Babel as pessoas dizem "Assim nos tornaremos famosos" (Gn 11.4); dois capítulos
  depois, Deus diz a Abrão: "tornarei o seu nome famoso" (Gn 12.2). O nome que a gente tenta fazer
  e o nome que Deus dá. No deserto, Jesus responde cada tentação com "As Escrituras nos dizem"
  (Mt 4.4), o contrário do "É verdade que Deus disse" (Gn 3.1) lido no dia 1.
- **Dia 6.** Abrão conta a Deus a dor de estar sem filhos, e Deus o leva para fora da tenda: "Olhe
  para o céu e conte as estrelas, se puder" (Gn 15.5). A reflexão já tem.
- **Dia 7.** Uma escrava egípcia fugindo é quem dá um nome a Deus nesta leitura: "O Deus que me
  vê" (Gn 16.13). Sara ri (Gn 18.12) e Deus pergunta: "Por acaso existe alguma coisa difícil demais
  para o Senhor?" (Gn 18.14). E "Vocês são a luz do mundo" (Mt 5.14) é a frase do estágio de 30
  dias da chama: a pessoa lê hoje o que vai ganhar daqui a três semanas.

### 4.4 Contexto antes de ler: a proposta implementada

Curto e visual, sem muro de texto:

1. **O mapa da história**, uma faixa com nove paradas (Criação, Queda, Promessa, Povo, Reino,
   Exílio, Jesus, Igreja, Nova criação), com a parada de cada leitura do dia acesa. Deriva do livro
   e do capítulo (Gênesis 1-2 é Criação, 3-11 é Queda, 12-50 é Promessa; Êxodo a Deuteronômio é
   Povo; Mateus é Jesus) e por isso vale para os 365 dias sem escrever nada. É a mesma divisão da
   nota "A história bíblica em uma página" do Explorar.
2. **Duas ou três frases do dia**, escritas para os dias 1 a 7 (e para a primeira vez de cada
   livro da Unidade 1): quem escreveu (como a ficha do livro diz: "pela tradição, Moisés", "Mateus,
   um dos doze"), para quem, e o que ligar.
3. **"Enquanto lê, procure"**: uma coisa só para achar no texto (a frase que se repete, o único que
   não morre, as quatro mulheres). Vira a pergunta de um toque que o dia já tem na etapa Pensar.
4. **Guia de leitura dentro do leitor**, só nos trechos de lista (Mt 1.1-17, Gn 5, Gn 10, Gn
   11.10-32, Gn 14.1-12, Gn 36, Gn 46.8-27, Êx 6.14-27): o que é, como ler (rápido), o que não
   perder, e um botão para pular ao versículo em que a história recomeça.

Fatos usados e de onde vêm: autoria e datas das fichas dos livros em `conteudo.json` ("03 - Livros
da Bíblia/Gênesis", ".../Mateus", ".../Êxodo": Gênesis e Êxodo "Moisés (tradicionalmente)", Mateus
"Mateus, o apóstolo (tradicionalmente)", "c. 60-70 d.C.", para "uma comunidade cristã de origem
majoritariamente judaica"); o arco da história da nota "A história bíblica em uma página"; o texto
bíblico sempre da NBV. Nada de número, data ou tradição de pregação fora disso.

### 4.5 Primeiros passos (12 lições)

Lidas inteiras (777, 698, 877, 825, 635, 651, 654, 705, 656, 760, 812 e 831 palavras).

- **Personalidade: 4.** Não são genéricas: têm voz ("Pensa assim: se você não conquistou a salvação
  com esforço, também não é o seu esforço que vai mantê-la de pé", "Uma energia não fica triste.
  Uma pessoa fica."), admitem onde os cristãos discordam, explicam cada palavra de igreja e terminam
  com "Pra anotar" e as leituras da semana.
- **Tchan: 3.** Cada uma abre com uma pergunta que pega ("será que tenho a salvação mesmo? E se eu
  errar de novo?"; "e vocês, quem dizem que eu sou?"), mas o pagamento vem 700 palavras depois, sem
  nada no meio. Lição 1 fala com quem já crê ("Se você colocou sua confiança em Jesus"), o que a
  própria lição reconhece no terceiro parágrafo; para quem chega pelo Conhecer, a lição 2 seria o
  começo natural, e o app não oferece isso.
- **Contexto: 4.** Cada lição diz por que vem naquela ordem ("Esta lição vem primeiro porque quase
  tudo depende dela"; "A lição anterior falou de pecado e perdão. Esta fala de quem você passa a
  ser").
- **O que falta, como produto:** a lista (`05-licoes.js`) mostra nome e resumo, sem tempo (uma
  lição de 877 palavras são uns 5 minutos); dentro da nota não há progresso nem pausa; o único
  convite na trilha ("Novo na fé? Comece pelos Primeiros passos") some depois de 3 dias lidos.
  Implementado: os minutos na lista. Recomendação: uma pergunta de um toque no fim de cada lição e
  o convite da trilha enquanto a lição 1 não foi lida, mesmo depois de 3 dias.

### 4.6 Conhecer Jesus (dias 1 e 2 medidos; os 14 lidos)

- **Personalidade: 4.** Títulos que puxam ("O que deu errado", "O pai que corre", "Jesus chorou"),
  "Repare" com detalhe concreto, pergunta que vai para a vida, conversa com Deus em frase para
  completar.
- **Tchan: 3.** Está no "Repare", que vem depois de ler; antes só a abertura, que no dia 1 é fraca
  ("A Bíblia começa com Deus fazendo tudo o que existe. Leia devagar, como quem ouve uma história
  pela primeira vez.") e no dia 2 já é boa ("o ser humano diz não a Deus e resolve decidir sozinho
  o que é bom e o que é mau").
- **Contexto: 3.** A tela diz o que vem e quanto tempo leva (`antes-conhecer-2/d01-p17`), que é o
  que o plano não faz; não diz quem escreveu nem onde está na história, e nos dias 3 (Isaías 53) e
  4 (Lucas 2) isso faria diferença ("escrito uns 700 anos antes de Jesus" é afirmação que precisa
  de fonte; a ficha de Isaías do Explorar tem a data). Recomendação: o mesmo mapa da história no
  dia do Conhecer.
- O tutorial de instalar e o convite de push aparecem antes do dia 1 também aqui (as mesmas 2
  interrupções): a correção da causa 1 vale para os dois caminhos.

## 5. Plano, em rodadas

**Rodada 1 (barato, seguro, reversível; feita neste diagnóstico, um commit por item):**

1. Tutorial de instalar e convite de notificações só depois do primeiro dia feito (plano e
   Conhecer); o convite de notificações nunca antes da primeira leitura. Métrica: interrupções
   antes do texto no dia 1, de 2 para 0; toques até o texto, de 9 para 7 (plano) e de 10 para 8
   (Conhecer). O `jornada.mjs` passa a contar as folhas que aparecem depois do dia feito.
2. "Onde estamos" na lição (mapa + contexto + "procure"), guia de leitura com salto nos trechos de
   lista, balão do dia 1 com personalidade. Métrica: palavras até o texto sobem (são palavras de
   contexto, não de tela de app); no painel, "abriram a lição no dia 1 → terminaram uma leitura".
3. Resumo com "Amanhã" (passagem, minutos e o título da reflexão do dia seguinte), marco do dia 2
   e "Chamar alguém para ler junto" para quem não tem amigo. Métrica: "leram no dia 2" no funil;
   `origens` (convite) no painel.
4. Minutos estimados na lista dos Primeiros passos.

**Rodada 2 (regras; para o dono decidir, seção 8):** escudo do iniciante; lembrete do 2º dia para
conta nova; "Amanhã, a que horas?" ao fim do dia 1; lembrete com o gancho do dia.

**Rodada 3 (dado novo; feita):** o funil dos primeiros dias no painel, com o sinal "abriu a lição"
anotado no diário do dia (só um contador por data, como `leitor` e `notas` já são).

## 6. O que não muda

O tom sem cobrança e sem culpa ("Não é placar"); nada por nome na igreja de longe; nada de
madrugada; o consentimento antes de qualquer dado de fé; o plano de leitura (`conteudo/`); as
reflexões existentes (ganham camadas, não reescrita); a paleta C e o carimbo em pincel; o cadastro
em 3 passos.

## 7. Como vamos saber

- A jornada de novo, nos dois caminhos, com a mesma tabela da seção 2 (o relatório `depois-*`).
- No painel, o funil novo: a partir de agora, a cada semana, "criaram → leram no dia 1 → voltaram no
  dia 2 → leram no dia 2 → leram 3 ou mais dos 7 primeiros". É a resposta direta à frase do dono.
- `retorno` D1 e D7 e `turmas` s1 nas próximas semanas, antes contra depois.

## 8. Decisões para o dono

- [ ] **Escudo do iniciante.** Na primeira semana de conta, um buraco de até 2 dias é coberto
  (hoje: 1 escudo, buraco de 2 dias zera a chama e o recorde fica em 1). Muda `CC.simularOfensiva`
  (vale no aparelho e no servidor, que carregam o mesmo arquivo) e o README ("uma vez por mês o
  aplicativo cobre sozinho um único dia em branco").
- [ ] **Lembrete do 2º dia.** Para conta com menos de 7 dias, o "volta" começa no 2º dia sem ler
  (hoje começa no 3º, `DIAS_DE_VOLTA`). Só alcança quem ligou push.
- [ ] **"Amanhã, a que horas?"** no fim do dia 1, gravando a hora do lembrete sem passar por
  Configurações ("Até amanhã às 19h, Joana!").
- [ ] **Lembrete com o gancho do dia** ("Hoje: O pecado está à sua espera, Gênesis 4-5, 5 min") em
  vez das frases fixas de `T.lembreteSemOfensiva`.
- [ ] **Primeiros passos:** uma pergunta de um toque no fim de cada lição; o convite da trilha fica
  enquanto a lição 1 não foi lida; para quem vem do Conhecer, começar pela lição 2.
- [ ] **Conhecer Jesus:** o mapa da história também no dia do Conhecer.
- [ ] **Dias pesados da Unidade 1** (11, 12, 18, 25, 31, todos acima de 3100 palavras): dividir a
  leitura em duas sessões ("Ler a metade agora") sem mudar o plano, ou aceitar e avisar.
