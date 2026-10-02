# Retenção nos primeiros dias: por que a pessoa para antes do dia 3

Diagnóstico de 02/10/2026, medido no commit `b11eed8` (o app é o mesmo de `3b66c59`). Não há dado
de produção aqui: a evidência é a jornada medida no app construído, nos dois caminhos, e a leitura
do conteúdo dos primeiros dias (Primeiros passos, Conhecer Jesus e a Unidade 1). O que foi
implementado a partir disto está no histórico (`git log --grep="Primeiros dias"`), um commit por
correção; o que ficou como recomendação está na seção 8, em lista para marcar.

**Estado em 02/10/2026, fim do dia.** Oito commits a partir deste diagnóstico, nesta ordem:
`da986ce` (este documento), `b5e562a` (nada entre a conta criada e o texto bíblico), `81b2c54`
("Onde estamos", contexto dos dias 1 a 7 e guias de leitura), `75a0bec` (o resumo diz o que vem
amanhã, festeja o segundo dia e chama um amigo), `081dca3` (minutos nos Primeiros passos),
`040028a` (o funil dos primeiros dias no painel), `3d06c94` (o Conhecer Jesus com o mapa e o
contexto dos 14 dias) e `6b99121` (os dias 8 a 31 da Unidade 1). O que ficou para o dono decidir
está na seção 8, com o porquê.

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

### Depois das correções (a mesma jornada, em `depois-*/relatorio.md`)

| Caminho | Dia | Até o texto bíblico | Interrupções antes do texto | Folhas depois do dia feito | Palavras até o texto | Rodada |
|---|---|---|---|---|---|---|
| plano | 1 | 7 toques + 5 campos (era 9 + 5) | 0 (eram 2) | 2 (Instalar no celular, Notificações) | 530 (era 620) | `depois-a-plano-2`, depois de `b5e562a` |
| plano | 1 | 7 toques + 5 campos | 0 | 2 | 625 (as 95 a mais são "Onde estamos": contexto, não tela de app) | `depois-c-plano-2`, depois de `75a0bec` |
| plano | 2 | 2 toques | 0 | 0 | 539 (era 453; o cartão "Amanhã" e o "Onde estamos" do dia 2) | `depois-c-plano-2` |
| conhecer | 1 | 8 toques + 5 campos (era 10 + 5) | 0 (eram 2) | 2 | 306 (era 315 antes de tudo; 225 depois de `b5e562a`; os 81 a mais são o "Onde estamos") | `depois-f-conhecer-2`, depois de `3d06c94` |
| conhecer | 2 | 2 toques | 0 | 0 | 277 (era 184) | `depois-f-conhecer-2` |

Zero erros de console em todas as rodadas; a ofensiva e os escudos fecham iguais aos de antes.
As capturas de cada correção (antes e depois, tema claro e escuro) ficam na mesma pasta:
`antes-d-passos.png`/`depois-d-passos.png` (minutos nos Primeiros passos),
`antes-e-painel-funil.png`/`depois-e-painel-funil.png` (o funil no painel),
`antes-f-conhecer-dia1.png`/`depois-f-conhecer-dia1.png` (o Conhecer com o mapa) e
`antes-g-dia12.png`/`depois-g-dia12.png`, `depois-g-dia10-leitor.png` (os dias 8 a 31 e os guias).

## 3. Causas, por impacto

Ordem = impacto × certeza, não esforço. "Quem atinge" é a pessoa nova no plano, salvo quando dito.
Estado de cada causa em 02/10/2026: 1 feita (`b5e562a`); 2 feita (`81b2c54`, `6b99121` e, no
Conhecer, `3d06c94`); 3 feita (`75a0bec`); 4 feita (`040028a`); 5 recomendação (muda uma regra
que vale no aparelho e no servidor: seção 8); 6 em parte (o convite de push mudou de lugar com a
causa 1; o lembrete do 2º dia e a hora ao fim do dia 1 são decisão do dono); 7 em parte (os
minutos entraram com `081dca3`; a pergunta de um toque e o convite da trilha são decisão).

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

**Depois das correções** (commit "Primeiros dias: onde estamos, o contexto e o guia de leitura antes
do texto"): a tela de antes de ler dos dias 1 a 7 fica em personalidade 4 (título próprio, "O
começo de tudo", "O Deus que me vê"), tchan 3 (o "Enquanto lê, procure" adianta o detalhe que a
reflexão paga depois) e contexto 4 (mapa + quem escreveu + por que as duas passagens). O que a
reflexão faz depois de ler não mudou.

### 4.1b Dias 8 a 31 (a unidade inteira)

Os dias 8 a 31 foram lidos inteiros na NBV (`scratchpad/retencao/nbv/dia-NN.txt`, um arquivo por
dia) e receberam as três notas da tela de antes de ler, como ela estava depois do commit do mapa
(título "Leitura de hoje" e o mapa sem texto): personalidade 2, tchan 0 e contexto 1 em todos,
menos o dia 20, que já tinha o contexto de "Começa Êxodo" (4). O tchan de cada dia abaixo foi
achado no texto, com a referência, e virou o "Enquanto lê, procure" e o gancho de "amanhã"; o
título com personalidade e o contexto entraram em `conteudo/primeiros-dias.json` (commit
"Primeiros dias: os dias 8 a 31 da Unidade 1 com título, contexto e o que procurar"). Minutos a
200 palavras por minuto, a mesma régua de `CC.minutosDoDia`.

| Dia | Leitura (palavras · min) | O tchan achado no texto | O que entrou antes de ler |
|---|---|---|---|
| 8 | Gn 19-20 · Mt 6 (2129 · 11) | Os anjos tiram Ló à força "porque o Senhor teve misericórdia deles" (Gn 19.16); "seu Pai sabe exatamente o que vocês precisam, até mesmo antes que vocês peçam" (Mt 6.8) | "Fogo em Sodoma, e a oração que Jesus ensinou"; o aviso de que o fim do capítulo 19 é duro |
| 9 | Gn 21-23 (1543 · 8) | "Deus me fez rir" (Gn 21.6); dois "Aqui estou!" (Gn 22.1 e 22.11); "O Senhor Proverá" (Gn 22.14) | "O riso de Sara e o monte de Abraão"; o aviso de ler o capítulo 22 até o fim, porque o texto resolve (regra do desfecho de `ferramentas/reflexoes/CLAUDE.md`) |
| 10 | Gn 24-25 · Mt 7 (2777 · 14) | O servo "observava em silêncio" (Gn 24.21); Gênesis 24 é o capítulo mais longo do livro (67 versículos) e a história é contada duas vezes; "ensinava como alguém que tinha grande autoridade" (Mt 7.29) | "A noiva do poço e a casa na rocha"; guia novo para Gn 25.1-18 (salto para o 19, onde começam os gêmeos) |
| 11 | Gn 26-28 · Mt 8 (3153 · 16) | A pedra de travesseiro (Gn 28.11) e "Certamente o Senhor está neste lugar e eu não sabia!" (Gn 28.16); Jesus toca o leproso antes de falar (Mt 8.3) | "A bênção roubada e a escada no sonho"; o aviso de leitura longa (vale dividir) |
| 12 | Gn 29-31 · Mt 9 (3745 · 19, a mais longa da unidade) | Sete anos que "pareceram poucos dias" (Gn 29.20); os nomes dos filhos de Lia como frases inteiras; Jesus "ficou com pena delas" (Mt 9.36) | "O enganador enganado"; o aviso da leitura mais longa |
| 13 | Gn 32-33 (1200 · 6) | "Não mereço nenhuma das suas bondades" (Gn 32.10); inclinou-se sete vezes (Gn 33.3); "Vi Deus face a face, e continuo vivo!" (Gn 32.30) | "A luta de uma noite inteira" |
| 14 | Gn 34-36 · Mt 10 (2894 · 14) | "ao Deus que me ouviu no dia da minha angústia" (Gn 35.3); "os próprios cabelos da cabeça de vocês estão todos contados" (Mt 10.30) | "De volta a Betel"; o aviso do capítulo duro (Diná); o guia de Gn 36 já existia |
| 15 | Gn 37-38 · Mt 11 (2293 · 11) | Perez e Zerá, os gêmeos do fim de Gn 38, estão em Mt 1.3, lido no dia 1; os irmãos "já não conseguiam falar amigavelmente com ele" (Gn 37.4); "Venham a mim, todos vocês que estão cansados" (Mt 11.28) | "O sonhador no poço" |
| 16 | Gn 39-41 (2331 · 12) | "o Senhor estava com José" quatro vezes (Gn 39.2, 3, 21 e 23); o copeiro "não se lembrou de José" (Gn 40.23) | "Da cadeia ao palácio"; o "procure" manda contar as quatro vezes |
| 17 | Gn 42-43 · Mt 12 (2858 · 14) | José sai para chorar escondido duas vezes (Gn 42.24 e 43.30); "quanto mais vale uma pessoa do que uma ovelha!" (Mt 12.12) | "Os irmãos diante de José" |
| 18 | Gn 44-46 · Mt 13 (3389 · 17) | "Eu sou José, o irmão que vocês venderam ao Egito!" (Gn 45.4); "não foram vocês que me mandaram para cá, mas sim Deus" (Gn 45.8); o homem vende tudo "na sua alegria" (Mt 13.44) | "Eu sou José"; o guia de Gn 46.8-27 já existia |
| 19 | Gn 47-48 · Mt 14 (2129 · 11) | Jacó "cruzando os braços" (Gn 48.14) e "Eu sei, meu filho, eu sei" (Gn 48.19); Pedro "olhou em volta e sentiu a força do vento" (Mt 14.30) | "Braços cruzados e um passo sobre a água" |
| 20 | Gn 49-50; Êx 1 (1748 · 9) | "vocês planejaram o mal contra mim, mas Deus tornou o mal em bem" (Gn 50.20); "um novo rei que não conhecia José" (Êx 1.8) | Já tinha ("Começa Êxodo") |
| 21 | Êx 2-3 · Mt 15 (2026 · 10) | "tenho visto", "tenho ouvido", "Conheço bem" (Êx 3.7); "Eu Sou o que Sou" (Êx 3.14); "sua fé é grande" (Mt 15.28) | "O cesto no rio e a sarça que não queima" |
| 22 | Êx 4-6 · Mt 16 (2646 · 13) | "O que você tem na mão?" (Êx 4.2); "Mande outro no meu lugar!" (Êx 4.13); "E vocês, quem vocês dizem que eu sou?" (Mt 16.15) | "Mande outro no meu lugar"; o guia de Êx 6.14-27 já existia |
| 23 | Êx 7-9 (2423 · 12) | "Isso é o dedo de Deus!" (Êx 8.19); Gósen sem moscas (Êx 8.22); "Finalmente vejo que pequei" (Êx 9.27) e a volta atrás (Êx 9.34) | "As pragas começam"; o aviso de reparar no ciclo do faraó |
| 24 | Êx 10-11 · Mt 17 (1696 · 8) | "onde os israelitas moravam não faltou luz" (Êx 10.23); "não viram mais ninguém a não ser Jesus" (Mt 17.8) | "Escuridão no Egito, luz no monte" |
| 25 | Êx 12-14 · Mt 18 (3541 · 18) | A pergunta dos filhos e a resposta pronta (Êx 12.26-27); "Por que você está clamando a mim? Mande o povo de Israel marchar!" (Êx 14.15); "setenta vezes sete" (Mt 18.22) | "A noite da Páscoa e o mar que se abre"; o aviso da leitura mais longa da semana |
| 26 | Êx 15-16 · Mt 19 (2184 · 11) | Miriã dança (Êx 15.20); o maná guardado "criou bichos" (Êx 16.20); "para Deus, tudo é possível" (Mt 19.26) | "A canção, a sede e o pão do céu" |
| 27 | Êx 17-19 (1633 · 8) | "O Senhor está conosco ou não?" (Êx 17.7); Arão e Hur sustentando as mãos (Êx 17.12); "sobre asas de águias" (Êx 19.4) | "Chegada ao Sinai" |
| 28 | Êx 20-21 · Mt 20 (2051 · 10) | "Eu sou o Senhor, seu Deus. Eu tirei você do Egito" antes de qualquer "não" (Êx 20.2); "não veio para ser servido, mas para servir" (Mt 20.28) | "Antes da ordem, a apresentação"; o aviso de que as leis de Êx 21 são de um povo antigo, não ordem para hoje |
| 29 | Êx 22-24 · Mt 21 (2974 · 15) | "porque sou misericordioso" (Êx 22.27); "Não esqueça que você foi estrangeiro no Egito" (Êx 22.21); os setenta "viram a Deus! E ali comeram e beberam" (Êx 24.11) | "A aliança selada e a entrada em Jerusalém" |
| 30 | Êx 25-26 (1455 · 7) | "para que eu possa morar no meio deles" (Êx 25.8); a oferta "de todo aquele que quiser ofertar de coração" (Êx 25.2) | "A planta da tenda"; guia novo para Êx 26 |
| 31 | Êx 27-29 · Mt 22 (3503 · 18) | Os nomes das tribos nos ombros e sobre o coração de Arão (Êx 28.12 e 28.29); "Toda a Lei e os Profetas dependem desses dois mandamentos" (Mt 22.40) | "O fim da primeira unidade"; guias novos para Êx 28 e 29 |

O que ficou de fora de propósito: nada de número ou data que a leitura não dá (as "dez pragas"
viram "as sete primeiras pragas" no dia 23, porque a conta das dez não está nos capítulos 7 a 9),
nada de tradição de pregação (o "monte Sinai = Horebe" ficou de fora no dia 27), e os dias
pesados ganharam o aviso "vale ler em dois tempos" em vez de uma divisão da leitura (decisão do
dono, seção 8).

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
2. **Duas ou três frases do dia**, escritas primeiro para os dias 1 a 7 e para a primeira vez de
   cada livro da Unidade 1, e depois para os dias 8 a 31 (seção 4.1b): quem escreveu (como a ficha
   do livro diz: "pela tradição, Moisés", "Mateus, um dos doze"), para quem, e o que ligar. Fora
   da Unidade 1, o cartão fica só com o mapa e, no primeiro dia de cada livro com ficha, a
   apresentação do livro.
3. **"Enquanto lê, procure"**: uma coisa só para achar no texto (a frase que se repete, o único que
   não morre, as quatro mulheres). Vira a pergunta de um toque que o dia já tem na etapa Pensar.
4. **Guia de leitura dentro do leitor**, só nos trechos de lista e de planta (Mt 1.1-17, Gn 5, Gn
   10, Gn 11.10-32, Gn 14.1-12, Gn 25.1-18, Gn 36, Gn 46.8-27, Êx 6.14-27, Êx 25, 26, 28 e 29): o
   que é, como ler (rápido), o que não perder, e um botão para pular ao versículo em que a
   história recomeça.

Fatos usados e de onde vêm: autoria e datas das fichas dos livros em `conteudo.json` ("03 - Livros
da Bíblia/Gênesis", ".../Mateus", ".../Êxodo": Gênesis e Êxodo "Moisés (tradicionalmente)", Mateus
"Mateus, o apóstolo (tradicionalmente)", "c. 60-70 d.C.", para "uma comunidade cristã de origem
majoritariamente judaica"); o arco da história da nota "A história bíblica em uma página"; o texto
bíblico sempre da NBV. Nada de número, data ou tradição de pregação fora disso.

### 4.5 Primeiros passos (12 lições)

Lidas inteiras, duas vezes (a segunda em `scratchpad/retencao/licoes/NN.txt`, o texto da nota sem
HTML: 769, 688, 869, 820, 632, 648, 651, 702, 652, 757, 809 e 826 palavras, 3 a 4 minutos cada a
200 por minuto). As três notas, lição a lição, com o trecho que as sustenta:

| # | Lição (palavras · min) | Pers. | Tchan | Ctx. | O que sustenta a nota |
|---|---|---|---|---|---|
| 1 | Segurança da salvação (769 · 4) | 4 | 3 | 4 | "Pensa assim: se você não conquistou a salvação com esforço, também não é o seu esforço que vai mantê-la de pé"; abre com "será que tenho a salvação mesmo? E se eu errar de novo?" e paga em "Quem segura a ovelha é o pastor" e "O verbo está no presente", 400 palavras depois; "Esta lição vem primeiro porque quase tudo depende dela", e manda quem ainda está conhecendo para a lição 2 |
| 2 | Quem é Jesus (688 · 3) | 4 | 4 | 4 | "ou ele estava enganado, ou estava enganando, ou é quem disse ser"; a pergunta de Mateus 16.15 abre e fecha ("Daqui a um ano, responda de novo e compare"); "A certeza da lição anterior só faz sentido se estiver apoiada em alguém capaz de sustentar esse peso" |
| 3 | O batismo (869 · 4, a mais longa) | 4 | 3 | 5 | "tem gente que sai da água pensando na roupa molhada"; o criminoso ao lado de Jesus "ouviu a promessa do paraíso sem ter passado pela água"; serve a quem já passou, a quem pensa, a quem foi batizado bebê, a quem tem menos de 18, com o botão "Quero conversar sobre o batismo" |
| 4 | A Bíblia (820 · 4) | 3 | 3 | 4 | A mais "aula" das doze (cânone, cópias, traduções); a voz aparece em "Pergunta honesta: não existe nenhum original escrito pela mão de Moisés, de Mateus ou de Paulo"; "66 livros, uns quarenta autores, três línguas, mais de mil anos" contando "uma história só"; "Todo dia, aqui no app, você lê um pedaço da Bíblia. Então vale entender que livro é esse" |
| 5 | Oração (632 · 3, a mais curta) | 5 | 4 | 4 | "Um simples 'não sei nem o que pedir, mas o Senhor sabe' já é oração"; "Orar sempre importa mais do que orar muito"; Romanos 8.26 e "Deus responde como Pai"; "as duas andam juntas: na Bíblia Deus fala com você, na oração você fala com ele" |
| 6 | O Espírito Santo (648 · 3) | 4 | 4 | 4 | "Uma energia não fica triste. Uma pessoa fica."; "Se hoje você tem interesse por Jesus, isso também é obra dele"; "Falta apresentar quem está por trás das duas" |
| 7 | Igreja e comunhão (651 · 3) | 4 | 3 | 4 | "Ninguém pratica um 'uns aos outros' sozinho no quarto"; "Quem entra esperando pessoas prontas se decepciona rápido"; o aviso sobre abuso ("conte a um adulto de confiança"); "Agora o foco se abre" |
| 8 | Pecado, arrependimento e perdão (702 · 4) | 5 | 4 | 4 | "Você vai errar de novo. Todo cristão erra."; "A mesma promessa cobre a primeira queda e a vigésima"; culpa × vergonha ("Culpa é perceber que você fez algo errado. Vergonha é sentir que você é algo errado"); "A primeira lição já tocou nesse assunto" |
| 9 | Minha identidade em Cristo (652 · 3) | 4 | 4 | 4 | "Ninguém precisa bater ponto pra continuar sendo da família"; "refém de curtida, elogio e crítica"; as três bases falsas (desempenho, opinião, passado) "sobem e descem, e por isso nunca dão descanso" |
| 10 | Tentação e batalha espiritual (757 · 4) | 4 | 4 | 4 | "Viver apavorado só porque uma tentação apareceu confunde as coisas, e brincar com ela também"; "Se ser tentado já fosse pecado, Jesus teria pecado"; manda procurar psicólogo ou médico quando a raiz pede |
| 11 | Tempo, dinheiro e talentos (809 · 4) | 4 | 3 | 4 | "pra louça em casa"; "incluindo o tempo de tela"; "O sinal de alerta aparece quando a oferta vira promessa de lucro"; é a mais "lista" das doze (cinco blocos) |
| 12 | Testemunho e missão (826 · 4) | 4 | 4 | 5 | "dizer 'não sei responder isso, mas vou pesquisar e te falo' é uma resposta honesta"; "Pense em três a cinco pessoas próximas e ore por elas... é o passo que mais gente pula"; liga a luz de Mateus 5.14 ao fogo da ofensiva do app; "Esta é a última lição porque depende de todas as outras" |

**Em resumo: personalidade 4,2, tchan 3,6, contexto 4,2.** Não são genéricas: têm voz, admitem
onde os cristãos discordam (salvação, dons, dízimo, batismo), explicam cada palavra de igreja e
terminam com "Pra anotar" e as leituras da semana. O tchan é bom mas chega no fim: cada lição abre
com uma pergunta que pega e paga 400 a 700 palavras depois, sem nada no meio. O contexto é o ponto
forte: toda lição diz por que vem naquela ordem.

**O que falta, como produto:** a lista (`05-licoes.js`) mostrava nome e resumo, sem tempo;
dentro da nota não há progresso nem pausa; o único convite na trilha ("Novo na fé? Comece pelos
Primeiros passos", `03-trilha.js`: só enquanto há menos de 3 dias lidos e alguma lição por ler)
some depois de 3 dias lidos. Feito: os minutos na lista e no cartão da próxima (`081dca3`).
Recomendação (seção 8): uma pergunta de um toque no fim de cada lição; o convite da trilha
enquanto a lição 1 não foi lida, mesmo depois de 3 dias; para quem vem do Conhecer, começar pela
lição 2 (a própria lição 1 diz isso no terceiro parágrafo, mas o app não oferece).

### 4.6 Conhecer Jesus (dias 1 e 2 medidos; os 14 lidos)

- **Personalidade: 4.** Títulos que puxam ("O que deu errado", "O pai que corre", "Jesus chorou"),
  "Repare" com detalhe concreto, pergunta que vai para a vida, conversa com Deus em frase para
  completar.
- **Tchan: 3.** Está no "Repare", que vem depois de ler; antes só a abertura, que no dia 1 é fraca
  ("A Bíblia começa com Deus fazendo tudo o que existe. Leia devagar, como quem ouve uma história
  pela primeira vez.") e no dia 2 já é boa ("o ser humano diz não a Deus e resolve decidir sozinho
  o que é bom e o que é mau").
- **Contexto: 2.** A tela diz o que vem e quanto tempo leva (`antes-conhecer-2/d01-p17`), que é o
  que o plano não fazia; não diz quem escreveu nem onde está na história, e nos dias 3 (Isaías 53)
  e 4 (Lucas 2) isso faria diferença ("escrito uns 700 anos antes de Jesus" é afirmação que precisa
  de fonte; a ficha de Isaías do Explorar tem a data).
- O tutorial de instalar e o convite de push aparecem antes do dia 1 também aqui (as mesmas 2
  interrupções): a correção da causa 1 vale para os dois caminhos.

**Feito (`3d06c94`):** cada um dos 14 dias abre com a mesma placa "Onde estamos na história" da
lição (mapa com a parada acesa, contexto com os fatos das fichas dos livros, "Enquanto lê,
procure"), em `conteudo/conhecer.json` e conferido por `teste-conhecer.mjs`. Dia a dia, as três
notas da tela de antes de ler, antes → depois (o "Repare" e a pergunta, que vêm depois de ler, não
mudaram):

| Dia | Título (livro) | Pers. | Tchan antes → depois | Ctx. antes → depois | O que entrou antes de ler |
|---|---|---|---|---|---|
| 1 | No começo (Gn 1-2.3) | 4 | 1 → 3 | 2 → 4 | Gênesis quer dizer começo; Moisés pela tradição, para um povo recém-saído do Egito; procure: quem foi criado "à imagem de Deus" (1.27) e o sétimo dia (2.2) |
| 2 | O que deu errado (Gn 3) | 4 | 2 → 3 | 2 → 4 | A promessa no meio do castigo (3.15), que o resto da Bíblia acompanha; procure: a serpente começa com uma pergunta (3.1) |
| 3 | Uma promessa (Is 53) | 4 | 2 → 3 | 1 → 4 | Isaías, profeta de Judá, séculos VIII e VII a.C. pela ficha (antes a abertura dizia "muito antes de Jesus" sem fonte); procure: com o que o texto compara todos nós (53.6) |
| 4 | Deus chega perto (Lc 2.1-20) | 4 | 2 → 3 | 2 → 4 | Lucas, médico que viajava com Paulo pela tradição, escreveu para Teófilo; o censo; procure: a primeira coisa que o anjo diz (2.10) e o sinal (2.12) |
| 5 | Quem te carrega (Lc 5.17-26) | 5 | 2 → 3 | 1 → 3 | Galileia, começo do ministério; "mestres da lei" explicados; procure: "Que é mais fácil dizer" (5.23) |
| 6 | Conhecido por inteiro (Jo 4.1-26) | 4 | 2 → 3 | 2 → 4 | João, um dos doze pela tradição, e o objetivo do livro; Samaria no caminho; procure: a hora do dia (4.6) e quem pede água a quem (4.7) |
| 7 | O pai que corre (Lc 15.11-32) | 5 | 2 → 4 | 1 → 3 | "Parábola" explicada; só em Lucas pela ficha; procure: o pai corre para um filho (15.20) e sai para insistir com o outro (15.28) |
| 8 | Na tempestade (Mc 4.35-41) | 4 | 2 → 3 | 1 → 4 | Marcos, ligado à pregação de Pedro, o evangelho mais curto, para cristãos perseguidos; procure: a almofada (4.38) |
| 9 | Jesus chorou (Jo 11.1-44) | 5 | 2 → 4 | 2 → 4 | Betânia a 3 km de Jerusalém (11.18) e a tentativa de apedrejar (11.8); procure: os dois dias de espera (11.6) e "adormeceu" (11.11) |
| 10 | A cruz (Lc 23.32-49) | 4 | 2 → 3 | 2 → 4 | Última semana, Caveira (23.33); procure: o letreiro (23.38) e a escuridão ao meio-dia (23.44-45) |
| 11 | Ele está vivo (Lc 24) | 4 | 2 → 3 | 2 → 4 | Terceiro dia; Lucas investigou e dá os nomes; procure: os nomes das mulheres (24.10) e "tolice" (24.11) |
| 12 | Nascer de novo (Jo 3.1-21) | 4 | 2 → 3 | 2 → 4 | Nicodemos "uma autoridade religiosa entre os judeus" (3.1); 3.16 é o versículo-chave da ficha; procure: a serpente no deserto (3.14) |
| 13 | E agora? (At 2.22-41) | 4 | 2 → 3 | 2 → 4 | Atos, segundo volume de Lucas; o mesmo Pedro do dia 11; procure: quantos se uniram naquele dia (2.41) |
| 14 | Uma família (At 2.42-47) | 4 | 2 → 3 | 2 → 4 | "Igreja, aqui, não é um prédio"; procure: as quatro coisas em que continuavam firmes (2.42) e onde se reuniam (2.46) |

Medido na jornada do Conhecer depois disso (`depois-f-conhecer-2`): 8 toques + 5 campos até o
texto, 0 interrupções, 0 erros; as palavras até o texto sobem de 225 para 306 no dia 1 e de 184
para 277 no dia 2, todas de contexto. Capturas: `antes-f-conhecer-dia1.png`,
`depois-f-conhecer-dia1.png`, `depois-f-conhecer-dia1-escuro.png`, `depois-f-conhecer-dia2.png`.

## 5. Plano, em rodadas

**Rodada 1 (barato, seguro, reversível; feita, um commit por item):**

1. `b5e562a`: tutorial de instalar e convite de notificações só depois do primeiro dia feito
   (plano e Conhecer); o convite de notificações nunca antes da primeira leitura. Métrica:
   interrupções antes do texto no dia 1, de 2 para 0; toques até o texto, de 9 para 7 (plano) e
   de 10 para 8 (Conhecer). O `jornada.mjs` passa a contar as folhas que aparecem depois do dia
   feito.
2. `81b2c54` (dias 1 a 7) e `6b99121` (dias 8 a 31): "Onde estamos" na lição (mapa + contexto +
   "procure"), guia de leitura com salto nos trechos de lista, balão do dia 1 com personalidade.
   Métrica: palavras até o texto sobem de 530 para 625 (são palavras de contexto, não de tela de
   app); no painel, "abriram a lição no dia 1 → terminaram uma leitura".
3. `75a0bec`: resumo com "Amanhã" (passagem, minutos de verdade e o gancho do dia seguinte),
   "Você voltou!" no segundo dia seguido e "Chamar alguém para ler junto" para quem não tem amigo.
   Métrica: "leram no dia 2" no funil; `origens` (convite) no painel.
4. `081dca3`: minutos estimados na lista dos Primeiros passos e no cartão da próxima lição.
5. `3d06c94`: a mesma placa "Onde estamos" nos 14 dias do Conhecer Jesus.

**Rodada 2 (regras; para o dono decidir, seção 8):** escudo do iniciante; lembrete do 2º dia para
conta nova; "Amanhã, a que horas?" ao fim do dia 1; lembrete com o gancho do dia. Nenhum item desta
rodada foi feito, de propósito: cada um muda uma regra que a pessoa sente (quantos dias a chama
aguenta, quando o app manda mensagem) e o README documenta como promessa.

**Rodada 3 (dado novo; feita em `040028a`):** o funil dos primeiros dias no painel, com o sinal
"abriu a lição" anotado no diário do dia (só um contador por data, como `leitor` e `notas` já
são). Contas de antes de 02/10/2026 contam "abriram a lição" pela leitura marcada.

## 6. O que não muda

O tom sem cobrança e sem culpa ("Não é placar"); nada por nome na igreja de longe; nada de
madrugada; o consentimento antes de qualquer dado de fé; o plano de leitura (`conteudo/`); as
reflexões existentes (ganham camadas, não reescrita); a paleta C e o carimbo em pincel; o cadastro
em 3 passos.

## 7. Como vamos saber

- A jornada de novo, nos dois caminhos, com a mesma tabela da seção 2 (o relatório `depois-*`).
- No painel (`#/config/painel`, grupo "Os primeiros dias de quem chega", desde `040028a`): no dia
  do cadastro, quantas contas criaram, abriram a lição, terminaram uma leitura no app e marcaram o
  dia como lido; em cada um dos dias 2 a 7, quantas abriram o app e quantas leram, entre as contas
  que já completaram aquele dia; e quantas leram 3 ou mais dos 7 primeiros. Só contagens e
  percentuais, sem nome. É a resposta direta à frase do dono: a partir de agora, a cada semana,
  "criaram → leram no dia 1 → voltaram no dia 2 → leram no dia 2 → leram 3 ou mais dos 7".
- `retorno` D1 e D7 e `turmas` s1 nas próximas semanas, antes contra depois. O que mudou entrou
  em 02/10/2026: a turma que se cadastrar a partir de 03/10 é a primeira a chegar inteira pelo
  caminho novo.

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
  enquanto a lição 1 não foi lida (hoje, `03-trilha.js`: só com menos de 3 dias lidos); para quem
  vem do Conhecer, começar pela lição 2.
- [x] **Conhecer Jesus:** o mapa da história também no dia do Conhecer (feito em `3d06c94`, com o
  contexto e o "procure" dos 14 dias).
- [ ] **Dias pesados da Unidade 1** (11, 12, 18, 25, 31, todos acima de 3100 palavras): dividir a
  leitura em duas sessões ("Ler a metade agora") sem mudar o plano, ou aceitar e avisar. Por
  enquanto, avisa: o contexto desses dias diz "uns 19 minutos: vale dividir", e o gancho de
  "amanhã" no resumo do dia anterior já diz o tempo.

Por que estes ficaram como recomendação e não como commit: todos mudam uma regra que a pessoa
sente ou uma promessa que o README faz (a chama, os lembretes, a hora da mensagem), ou mudam o
fluxo de uma tela que o dono aprovou (o convite da trilha, a ordem das lições). O que foi feito
sem perguntar é o que acrescenta camadas sem tirar nada: ordem das folhas, contexto antes de ler,
o que vem amanhã, minutos, e uma medida nova no painel.
