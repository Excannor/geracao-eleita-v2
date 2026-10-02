---
name: mapa-do-livro
description: Padrão do "Mapa do livro" do Geração Eleita V2, o mapa mental que abre cada um dos 66 livros da Bíblia no app. Diz como escrever o conteúdo (mapa mental textual com raiz, ramos, ramificações e conexões, ancorado no texto bíblico, sem vícios de IA), como desenhar as ilustrações (traço próprio em SVG, revisado em tamanho grande antes de entrar) e como montar a tela (setas curvas pontilhadas como a trilha, nomes no pincel). Use ao escrever, revisar ou ilustrar o mapa de qualquer livro, ao mexer nas telas do mapa e quando pedirem "mapa do livro", "mapa mental", "ilustração do livro" ou "introdução do livro".
---

# Mapa do livro

O mapa é uma página por livro, aberta no dia em que o livro começa no plano, no leitor (botão
Mapa) e no Explorar (os 66 mapas). Referência visual: `design/mapas/mock-isaias.dc.html` (a tela
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

Fora do próprio livro só entram, e marcados como tal: o **significado do nome** (é tradução, não
fato novo) e a seção **"[Livro] e Cristo"**, com as citações do Novo Testamento (livro, capítulo e
versículo, para conferir). Datas em a.C., achados arqueológicos e opiniões de comentaristas ficam
fora.

**Estrutura**
- **A raiz:** a ideia central em um parágrafo direto (mais uma frase de apoio, se precisar).
- **Ramos:** de 4 a 6 pilares, cada um com nome curto e forte e uma linha de subtítulo.
- **Ramificações:** de 3 a 6 por ramo, cada uma com a referência no fim.
- **Conexões:** entre um ramo e o seguinte, uma frase que mostra o raciocínio do autor bíblico
  (de preferência ligando dois versículos do próprio livro, como o toco de Is 6.13 que vira o
  rebento de Is 11.1).

Depois dos ramos vêm, nesta ordem, as seções fixas: **Significado do nome**, **Autoria e
época** (só o que o livro diz), **[Livro] e Cristo**, **Estrutura do livro** (partes com
capítulos e o "você está aqui"), **Curiosidades do texto** (só fatos que estão no livro) e
**Enquanto lê, procure** (uma palavra ou expressão que se repete no livro). No topo da tela, o
grupo (Profetas maiores...), o nome, "Livro N de 66" e o número de capítulos.

Antes de entregar o texto:
- `grep -n -i -E "—|mergulh|crucial|fundamental|dança|em resumo|vale ressaltar|teia|jornada|multifacet"` não acha nada;
- cada referência foi conferida na Bíblia do app (`conteudo/biblias`);
- nenhum item começa igual ao anterior.

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
- dá para dizer o que é sem legenda.
Depois, renderize a tela inteira a 390px e confira cada seta: a ponta aponta para o bloco certo,
a curva não cruza texto, a conexão escrita não encosta na linha pontilhada.

Para renderizar sem o runtime do canvas, troque a linha do `support.js` por `@font-face` com as
fontes de `dist/` e use `CHROME=... --headless --screenshot` (como em `design/mapas/`).

## 3. Como montar a tela

- **Nomes no pincel:** nome do livro, nomes dos ramos e títulos grandes em Permanent Marker (como
  "Isaías" no topo). Rótulos de seção em Manrope 800, maiúsculas, espaçadas, com um ícone de
  traço de 20px na frente ("SIGNIFICADO DO NOME"). Corpo em Manrope; a raiz e os versículos em
  Literata.
- **Setas curvas pontilhadas, como a trilha:** os blocos não ficam empilhados como cartões. Eles
  alternam de lado, e cada passagem tem uma curva pontilhada (`stroke-dasharray: 0.1 7`, ponta
  redonda, 2.4px) que termina numa ponta de seta em cima do próximo bloco. A conexão entre ramos
  fica em Literata itálico, no espaço livre acima da curva.
- **Cartão só onde ele é necessário:** a raiz (borda tracejada), "[Livro] e Cristo" (escuro) e
  "Enquanto lê, procure" (sálvia pálida). O resto fica direto no fundo da página.
- **Referências** como marca-texto sálvia (`<mark>`), no fim de cada item.
- **Grade dos 66 no Explorar:** duas colunas; o nome nunca quebra no meio da palavra (fonte de
  20, 17 ou 15px conforme o tamanho do nome).
- Paleta C e as regras de `design/guia-visual.md` continuam valendo; a chama (`--v2-chama`) não
  entra no mapa.

## 4. Onde o conteúdo vai morar

Os 66 mapas não cabem no `index.html` (limite de 1 MB). Ficam num arquivo à parte, carregado só
quando o mapa abre e guardado pelo service worker para uso offline. Cada livro deve ter: nome,
grupo, número, capítulos, significado, autoria (com referência), raiz, ramos (título, subtítulo,
desenho, ramificações com referência, conexão), Cristo (pares AT → NT), estrutura (título, de,
até), curiosidades (com referência) e "procure".

Cada mapa novo passa por revisão de alguém da igreja antes de ir ao ar.
