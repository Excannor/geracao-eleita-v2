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
