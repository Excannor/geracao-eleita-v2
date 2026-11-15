# R3: O ano em temporadas

Objetivo: linhas de chegada curtas dentro do plano de 1 ano. Vem do roadmap de melhorias (fase
R3) e das recomendações 9, 10, 16 e 20 do estudo do YouVersion. A base é a "Proposta de temporadas
R3", aprovada pelo dono: 36 temporadas, 3 por unidade, cobrindo os dias 1 a 365.

Tom de todos os textos (pedido do dono): sem hipérbole e sem cara de texto gerado. Nomes curtos,
como um líder de célula diria ("Gênesis 1 a 25", "Jacó e José", "Os juízes"). Frases calmas e
factuais, dizendo o que se lê e onde a pessoa está na história. Nada de "jornada", "mergulhe",
"poderoso", "incrível", "transformador", travessão, exclamação, tríade retórica, "não é só X, é Y"
ou metáfora forçada.

A fase é feita em partes, uma de cada vez, cada uma com o seu commit e os seus testes:
R3.0 textos, R3.1 temporadas na Trilha, R3.2 selos com barra de progresso, R3.3 calendário
sazonal no Juntos, R3.4 retrospectiva de dezembro.

## R3.0 · Textos

**O que mudou da proposta.** O recorte (os dias de cada temporada) ficou igual ao da proposta. Os
nomes, as frases e os nomes dos selos foram reescritos no tom pedido:
- **nomes:** o livro, o trecho ou o bloco da história ("Gênesis 1 a 25", "A saída do Egito",
  "Salmos 42 a 62", "Joel a Habacuque"). Saíram os títulos de efeito ("Profetas de fogo", "Santo,
  santo, santo", "Fiéis em terra estranha");
- **abertura:** uma frase, sempre começando por "Nesta temporada você lê", com o trecho do Antigo
  Testamento, um marco da história e o trecho do Novo Testamento;
- **chegada:** "Você terminou X." e, quando há, "A próxima temporada segue com Y." Na última de cada
  unidade, "e a unidade N", para casar com o troféu que aparece no mesmo dia. A da temporada 36
  diz que a pessoa chegou ao dia 365 do plano (e não "leu o plano inteiro", que nem sempre é verdade
  para quem pulou dias);
- **selos:** o nome do objeto desenhado ("Copo de prata", "Favo de mel", "Ramo de amendoeira"). Os
  símbolos são os da proposta, que já tinham sido cruzados com as 58 cartas do álbum para não
  repetir nenhum objeto. Saíram nomes como "Paz perfeita", "Sol da justiça" e "Porta da esperança",
  trocados por "Lago calmo", "Sol com asas" e "Porta no vale".

**Onde mora.** `ferramentas/temporadas.mjs` guarda os textos (`TEXTOS`: de, ate, título, abertura,
chegada, selo, símbolo) e monta `temporadas[]`, gravado em `conteudo/conteudo.json` no formato de
`unidades[]`:

```
{ numero, unidade, titulo, antigo, novo, subtitulo, livros, de, ate, cor,
  abertura, chegada, selo, simbolo }
```

`antigo`, `novo`, `livros`, `unidade`, `cor` e `subtitulo` ("10 dias") saem do próprio plano, para
não divergir dele. O importador do vault refaz o `conteudo.json` do zero; por isso `aplicarAjustes`
(`ferramentas/ajustes-conteudo.mjs`) chama `aplicarTemporadas`, como já fazia com as reflexões, e as
temporadas voltam iguais numa nova importação.

- `node ferramentas/temporadas.mjs` grava `temporadas[]` no `conteudo.json` (e só isso: o resto do
  arquivo sai byte a byte igual);
- `node ferramentas/temporadas.mjs --tabela <arquivo>` escreve a tabela em Markdown para conferência.
  O formato é o da proposta, então o `verificar.py` da proposta lê a tabela final também.

O `conteudo.json` não vai no `index.html` (é um arquivo próprio, com resumo no nome), então a folga
do index não muda (66,0 KB).

**Testes (teste.mjs, "conteúdo congelado").** 22 checagens novas:
- 36 temporadas, numeradas em ordem, cobrindo de 1 a 365 sem buraco nem sobreposição;
- de 7 a 21 dias cada (hoje de 7 a 16); nenhuma cruza unidade; 3 por unidade; a última de cada
  unidade termina no dia do troféu; a cor é a da unidade;
- o `temporadas[]` gravado é exatamente o que `ferramentas/temporadas.mjs` gera (quem mudar o texto
  num lugar só é avisado);
- todos os campos preenchidos; nomes e selos sem repetição e com até 24 caracteres; nenhum selo com
  o nome de uma carta do álbum;
- o tom: toda abertura começa por "Nesta temporada você lê" e é uma frase só; toda chegada começa por
  "Você terminou" e tem no máximo duas frases; até 140 caracteres; sem travessão, sem exclamação e
  sem as palavras de exagero de `PALAVRAS_PROIBIDAS`.

## R3.1 · Temporadas na Trilha

**A conta** (`02b-jogo.js`, no index, que o servidor também carrega): `CC.temporadaDoDia(n)`,
`CC.progressoTemporada(t, e)` (dias lidos dentro da temporada) e `CC.temporadaCompletaEm(numero,
e)`. A temporada fecha quando **todos** os dias dela estão em `lidos`, como a unidade
(`CC.unidadeCompletaEm`). Por isso:
- **pular não fecha temporada** (R2.1): o pulo para a célula não põe nada em `lidos`, e os
  pendentes que caem numa temporada continuam faltando nela;
- ler o último pendente que faltava fecha a temporada, com a chegada, como qualquer dia;
- "Li na minha Bíblia" vale, como vale para a unidade (o selo não é carta: não pede leitura no app);
- **o dia 0** (R2.2b) não é dia do plano: não conta em nenhuma temporada.

**O cartão na Trilha** (peça nova `src/sob-demanda/temporadas.js` e `temporadas.css`). Logo abaixo do
"Ler hoje" e da chama, na folha do alto:
- o selo pequeno (com o número da temporada, enchendo conforme a leitura), "Temporada 2 de 36", o
  nome, a barra e "faltam 8 dias" ("falta 1 dia" no singular);
- com pendentes dentro da temporada, "faltam 8 dias · 3 pendentes": eles contam no "faltam", porque a
  temporada só fecha com eles, mas a palavra é a mesma da R2.1, sem cor de alerta;
- **a abertura ao entrar:** enquanto nenhum dia da temporada foi lido, a frase de abertura vem dentro
  do cartão. Lido o primeiro dia, ela sai. Não precisa de marca guardada: vale igual em todo
  aparelho, e quem pula para o meio de uma temporada nova também a vê;
- quem nunca leu nada vê o dia 0 e nenhum cartão (uma temporada a zero ao lado do "Comece aqui"
  seria um segundo convite). Lido o dia 0 ou o dia 1, o cartão aparece.

Tocar no cartão abre a folha da temporada: a abertura, os dias ("11 a 20 do plano, 10 dias"), o
trecho do Antigo e do Novo Testamento, a barra com "4 de 10 dias lidos, faltam 6 dias.", a explicação
dos pendentes quando há ("3 desses dias estão pendentes. A temporada fecha quando todos forem lidos,
sem pressa."), "Selo ao terminar: Copo de prata" (ou "Selo conquistado") e "Depois: temporada 3, A
saída do Egito.".

O cartão mostra a temporada do dia em que a pessoa está (`CC.diaAtual`). Quem pulou e seguiu adiante
vê a temporada nova; a de trás espera os pendentes, sem selo, e os pendentes continuam na linha da
R2.1.

**A chegada ao fechar** (Dia lido, peça `dia-lido.js`). `fotoDeAntes` (`04-licao.js`) guarda se a
temporada do dia já estava fechada; se a leitura a fechou, a celebração leva a temporada e o Dia
lido mostra o item "Temporada concluída: Jacó e José", com a frase de chegada e "Selo em Conquistas:
Copo de prata". Na última temporada de uma unidade, vem antes do troféu da unidade, e a frase já
diz "e a unidade N".

**Sem repetir o livro** (ajuste depois da R3.1). Quando a leitura fecha a temporada e também
termina um livro, os dois não vêm em itens separados ("Você terminou Gênesis!" e, logo abaixo,
"Você terminou Gênesis." na chegada). Fica um item só, o da temporada: o livro que a frase de
chegada já cita não aparece de novo, e o que ela não cita vem numa linha, "Livro terminado: Judas"
(na temporada 33, que fecha Ezequiel e Judas). Sem temporada fechada, o item do livro continua como
era. `teste-temporadas` confere os dois casos (Gênesis no dia 20; Ezequiel e Judas no dia 334).

**O selo em Conquistas** (tela única da UX4.4). `CC.trofeus()` ganha `temporadas`: um selo por
temporada (`tipo: 'temporada'`, título = nome do selo, `sub` = nome da temporada). A tela tem a
estante "Temporadas", logo depois de "Unidades do plano", com os 36 selos: cada um com o nome do
selo, o da temporada embaixo e "Conquistado" ou "3 de 10". O número de "Conquistas" no Perfil
passa a contar os selos também. A arte é uma forma nova do troféu (`selo` em `01c-arte.js`: medalha
com duas fitas e o número da temporada no meio), na mesma regra de cor e de enchimento dos troféus.

**Sem rede.** O cartão fica na Trilha, que abre sem rede: a peça das temporadas é guardada pelo
service worker já na instalação (`PECAS_DE_ANTEMAO`), como a do Praticar.

**Folga do index.html:** de 66,0 KB para 63,9 KB (a conta, o selo, a estante, o pedido da peça e a
variável `window.TEMPORADAS`). O resto (6,7 KB) está na peça.

**Testes.**
- `teste.mjs`: a peça sai em arquivo próprio, fora do index e guardada de antemão (6 checagens
  da lista de peças e a do `DE_ANTEMAO`); a conta das temporadas (7 checagens): o dia diz a
  temporada, fecha só com todos os dias, o progresso, o pulo não fecha a temporada 4 e ler 40 a 46
  fecha a 5, ler os pendentes fecha a 4, o dia 0 não conta, os troféus têm os 36 selos.
- `ferramentas/teste-temporadas.mjs` (novo, 34 checagens por tema, claro e escuro): o cartão no meio
  da temporada, a abertura ao entrar, a folha, "falta 1 dia", a chegada no Dia lido, a temporada
  seguinte já com a abertura, a estante em Conquistas, os pendentes (o cartão, a folha, a temporada
  que não fecha), o último pendente que fecha, o dia 0 sem cartão e depois com a temporada 1.
- `teste-redesenho`: a conta dos troféus da tela única inclui os selos (e, na R3.2, a conta das
  conquistas não pega as linhas de "Perto de fechar").

## R3.2 · Selos com barra de progresso

**O que é.** A recomendação 16 do estudo: mostrar o quanto falta, em dias, para fechar alguma coisa
("faltam 3 dias para fechar Gênesis"). Em Conquistas (a tela única da UX4.4), no alto, antes de "Por
nível", a seção **"Perto de fechar"**, com as mesmas linhas das conquistas (arte, nome, conta e
barra):
- **a temporada** em que a pessoa está, com o selo dela: "Temporada 2: Jacó e José", "2/10",
  "faltam 8 dias para fechar a temporada" (com pendentes dentro dela: ", 3 deles pendentes");
- **os livros começados** e ainda não terminados, no máximo 3, do que falta menos ao que falta mais:
  "Gênesis", "12/20", "faltam 8 dias para fechar Gênesis". A conta é a de "Meu progresso nos livros"
  (`CC.progressoDoLivro`: os dias do plano que passam pelo livro). Terminado, o livro sai da lista;
- **a semana completa** (R1.2: 5 dias com a Palavra, de segunda a domingo): "1/5", "faltam 4 dias
  para completar esta semana". Quando os dias que ainda restam na semana não bastam, o texto não
  cobra o impossível: "1 dia com a Palavra nesta semana. Na segunda começa uma semana nova." Completa,
  "Esta semana já está completa. São 3 semanas completas." ("É a sua primeira." na primeira).

Só o que está em andamento: nenhuma lista do que falta no ano. Quem nunca leu nada não vê a seção.
"Falta 1 dia" no singular, como na Trilha.

**Onde mora.** A seção sai da peça das temporadas (`pertoDeFechar` e `conquistas` em
`temporadas.js`, que já é guardada na instalação); a tela de Conquistas (`07-perfil.js`) só guarda
o lugar (`data-perto-de-fechar`) e pede a peça. Folga do index.html: 63,8 KB.

**Testes.** `teste-temporadas`, parte R3.2 (13 checagens por tema): a seção no alto, antes de "Por
nível"; a temporada com "faltam 8 dias para fechar a temporada"; os livros em ordem, com o texto e a
largura da barra conferidos contra `CC.progressoDoLivro`; Gênesis 12 de 20; a semana nos dois textos
(conforme o dia da semana em que o teste roda) e completa; Gênesis sai quando termina, e a temporada
passa para a 3; sem leitura, sem seção.

## R3.3 · Calendário sazonal no Juntos

**O que é.** Cinco momentos do ano, cada um com uma meta coletiva da célula numa barra só
(recomendação 10). Nenhum cria leitura nova, sequência nova ou ranking: cada um conta, dentro das
datas, os dias do **próprio plano** que cada pessoa leu (a data em que marcou cada dia, no fuso dela;
pendentes e "Li na minha Bíblia" valem). A chama e os dias com a Palavra continuam os únicos
contadores da pessoa.

| Momento | Datas | Como conta | Meta | Selo da célula |
|---|---|---|---|---|
| Comece o ano | 1º a 31 de janeiro | soma: cada pessoa conta até 10 dias lidos | 10 × pessoas | Pegada |
| 21 dias | fevereiro inteiro (28 ou 29) | um dia conta quando metade da célula leu um dia do plano nele | 21 dias | Três elos |
| Semana Santa | Domingo de Ramos à Páscoa (8 dias) | igual a fevereiro | os 8 dias | Ramo de palmeira |
| Mês da Bíblia | setembro | quem fechou uma temporada com o último dia dela marcado no mês | metade da célula | Bíblia aberta |
| 30 dias | novembro | soma: cada pessoa conta até 30 dias lidos | 30 × pessoas | Folha de calendário |

- O teto por pessoa nas somas faz a meta ser de todos: uma pessoa que leu muito não enche a barra
  sozinha, e quem leu pouco não aparece em lugar nenhum.
- A Páscoa sai do cálculo gregoriano (`pascoa(ano)`: 28/3/2027, 16/4/2028).
- O momento aparece uma semana antes ("Começa em 21 de março", só o convite, sem barra), corre nas
  datas e fica 5 dias depois do fim com o resultado: "A célula chegou à meta. Selo da célula:
  Pegada." ou, sem culpa, "O mês terminou com 180 de 240 dias lidos.". Fora disso, nada aparece.
- Quem conta: os membros ativos da célula, o líder inclusive, sem visitante (a mesma regra da meta
  do dia da célula).

**Privacidade.** O servidor (`momentoDaCelula`, em `desafios-grupo.mjs`, com as outras regras de
grupo) calcula a partir das datas de leitura que já guarda e manda para a célula só números somados:
`{ id, titulo, tipo, texto, selo, inicio, fim, fase, diaDaJanela, diasDaJanela, pessoas, total, meta,
chegou }`. Nenhum nome, nenhum @, nenhum número de uma pessoa. Quem só foi convidado não recebe.
Todos da célula veem, visitantes inclusive (só números). Nada novo é guardado, então não há
migração. `privacidade.html`: linha nova no quadro de quem vê e "Ajuste da versão 7" no histórico.

**Na tela** (peça das temporadas, `calendario`). No Juntos, no alto, "Calendário da célula", um
cartão por célula que tem momento: o período e o dia ("1º a 30 de novembro · dia 15 de 30 · Célula
Videira"), o nome, a frase do momento, a barra, a conta ("55 de 120 dias lidos", "7 de 21 dias", "2
de 4 pessoas terminaram uma temporada") e uma nota curta ("Dias pendentes lidos nestas datas também
contam."). O `08-amigos.js` só guarda o lugar e pede a peça quando alguma célula tem momento.

**O que não entrou.** O cartão "A Páscoa no seu plano" da proposta (os dias dos Evangelhos com a
semana de Jesus, como leitura livre) e o versículo da semana de setembro: os dois pedem uma leitura
fora do dia do plano, e o pedido desta fase era só contar o próprio plano. O selo da célula aparece
no cartão enquanto o momento está à vista; não fica guardado numa estante da célula (isso pediria
guardar dado novo).

**Testes.**
- `teste.mjs` (12 checagens): a Páscoa de 2026 a 2029; a Semana Santa de 8 dias e fevereiro de 28 ou
  29; o momento de cada data (antes, durante, depois, nada em maio); os textos sem exagero; novembro
  soma com teto por pessoa e sem contar outubro nem o futuro; data de dia não lido não conta;
  fevereiro conta o dia com metade da célula; setembro conta quem fechou temporada no mês; antes e
  depois; o resultado só tem números (a lista exata das chaves); fora dos momentos, nada; a política
  de privacidade conta o calendário.
- `teste-temporadas`, parte R3.3: o servidor, com as datas deslocadas para 15 de novembro de 2026
  (`CAMINHO_DESLOCAR_CALENDARIO`, só com `CAMINHO_TESTE=1`: o servidor só aceita leituras com até 7
  dias de atraso, então o teste não tem como gravar datas de outro mês), manda à célula 55 de 120,
  sem nome de ninguém; o Juntos mostra o cartão e a barra; os outros quatro momentos e as fases antes
  e depois na mesma tela; sem célula, nada.

## R3.4 · Retrospectiva de dezembro

**O que é.** A recomendação 20: no fim do ano, "Seu ano na Palavra" e "O ano da célula", cada um com
uma imagem para story. Tela única, `#/perfil/retrospectiva` (peça nova `retrospectiva.js` e `.css`;
a casca fica em `07-perfil.js`).

**A época.** De 1º de dezembro a 7 de janeiro (em janeiro, o ano que acabou): `anoDaRetrospectiva`,
a mesma regra no servidor (`desafios-grupo.mjs`) e no app. Nessa época:
- na Trilha, logo abaixo do cartão da temporada, a entrada "Seu ano na Palavra 2026 · Os seus
  números do ano. Só você vê." (peça das temporadas);
- no Juntos, no alto, para cada célula, "O ano da célula em 2026 · Os números da célula no ano,
  somados, sem nomes."
Fora da época, as entradas somem, e a tela (aberta pelo endereço) mostra o ano de agora, "até hoje".

**Seu ano na Palavra: só a própria pessoa vê.** Contado no aparelho (`meuAno`), só do estado dela;
nada vai ao servidor. Os números (sem os que dão zero): dias com a Palavra no ano (as mesmas datas
da chama e do R1.1), dias do plano lidos no ano, capítulos, livros terminados no ano (todos os dias
do livro lidos, o último deles marcado no ano), temporadas concluídas no ano (a mesma regra) e
semanas completas (R1.2). Embaixo, o mês com mais dias com a Palavra e a lista dos livros
terminados, na ordem da Bíblia. Sem leitura no ano: "Em 2026 ainda não há leitura marcada. O plano
continua de onde você está."

**O ano da célula: só números somados.** O servidor (`anoDaCelula`, com os membros ativos de hoje,
sem visitante) manda `{ ano, pessoas, diasLidos, capitulos, temporadas, encontros, metas, momentos }`:
dias do plano lidos no ano somando todos, capítulos, temporadas concluídas, encontros registrados
no ano e metas do calendário sazonal batidas (R3.3). Nenhum nome, nenhum número de uma pessoa.
**Com menos de 3 pessoas**, a célula recebe só `{ ano, pessoas, poucos: true }` e a tela diz: "O
ano da célula aparece quando ela tem 3 pessoas ou mais, para que ninguém seja reconhecido pelos
números." (o mesmo cuidado do check-in somado, que pede 3 respostas). As metas do calendário só
aparecem quando alguma foi batida: "0 de 5" seria cobrança. Nada novo é guardado (sem migração).
`privacidade.html`: duas linhas no quadro de quem vê e o "Segundo ajuste da versão 7".

**As imagens para story** (1080×1920, desenhadas no aparelho com as peças de `01d-story.js`, e
compartilhadas por `CC.compartilharImagem`): o fundo grafite das imagens do app, "Meu ano na
Palavra" (ou "O ano da célula" com o nome dela), o ano grande em sálvia, até 4 números e a marca.
Só sai se a pessoa tocar em "Imagem para o story".

**Limites conhecidos.** O ano da célula usa os membros de hoje: quem saiu no meio do ano não entra
na soma, e quem entrou traz o ano inteiro dele. A peça da retrospectiva não é guardada de antemão:
aberta uma vez, o service worker a guarda; antes disso, sem rede, a casca mostra "Tentar de novo".

**Testes.**
- `teste.mjs`: a peça (6 checagens da lista), a política (1) e 8 da regra: a época; menos de 3
  pessoas sem números; a soma do ano (dias, capítulos, temporadas e encontros só do ano e até hoje);
  só números (a lista exata das chaves); as metas do calendário; o ano da pessoa com um estado
  montado (11 dias com a Palavra, 20 dias do plano, 2 semanas completas, março, Gênesis, temporadas
  1 e 2); a mesma época no app; os textos sem exagero e sem zeros.
- `ferramentas/teste-retrospectiva.mjs` (novo, 20 checagens por tema): o servidor, deslocado para
  15 de dezembro de 2026, manda à célula 65 dias e 6 temporadas sem nomes; a de 2 pessoas, só o
  aviso; a entrada no Juntos; o ano da Ana só com os números dela; o ano da célula somado; as duas
  imagens geradas no aparelho e o botão; a entrada da Trilha em dezembro, que some fora dele.
