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
