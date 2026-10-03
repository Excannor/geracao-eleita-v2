# Cartão de voz do mapa do livro

Para quem só escreve ou revisa texto de mapa (`conteudo/mapas/<slug>.json`). É um resumo da seção 1
da `SKILL.md`; quem mexe em desenho ou tela lê a skill inteira. Antes de escrever, rode
`node ferramentas/rever-mapa.mjs <slug>` e deixe a folha ao lado: ela põe o texto da NBV de cada
referência junto de cada item.

## A voz

Alguém da célula contando o livro para um amigo que nunca o leu, numa mesa de café. O amigo precisa
sair querendo abrir o livro. Pergunta de controle, em cada parágrafo: eu falaria isso assim, em voz
alta, para o meu amigo? Se não, está errado, mesmo que cada palavra seja permitida.

## Os 15 vícios (todos barrados)

1. **Coisa agindo como gente.** O que ninguém diz falando: "o relato tem pressa", "a linha
   anunciou", "o texto se volta", "serve de título", "a narrativa ganha ritmo", "o capítulo
   revela". Quem age é Jesus, Moisés, o povo, Deus, o autor. O que a gente diz, pode: "Marcos
   começa com", "o livro termina com Jesus voltando para o céu", "Gênesis conta". O teste é a
   boca, não a gramática (dono, 03/10: "A última coisa que Marcos conta é Jesus sendo levado" é
   escrita contorcida; "O livro termina com ele voltando para o céu" é gente falando).
2. **Conectivo de redação.** "Daí em diante", "Ao lado dela", "A partir daí", "Em seguida", "Nesse
   ponto", "Por sua vez", "Dito isso", "Dessa forma", "Portanto". Quem fala diz "Depois", "E então",
   "No caminho", "Ali", ou só começa a frase seguinte.
3. **Lista de verbos comprimida.** "Ensina, cura, enfrenta os líderes e sobe a Jerusalém". Três
   verbos seguidos com o mesmo sujeito é resumo de prova: escolhe o que importa ou vira cena.
4. **Palavra de resumo escolar.** "Enfrenta", "confronta", "culmina", "retrata", "aborda",
   "evidencia", "destaca", "estabelece", "ressalta", "centurião", "trajetória", "episódio",
   "contexto", "dinâmica". Troca pela palavra que a gente diz: "bate de frente", "termina",
   "conta", "soldado romano", "caminho", "história".
5. **Tese no começo.** Parágrafo que abre com a frase que o resume e depois prova. Abre pela cena
   ("Quatro homens abrem um buraco no teto.").
6. **Fecho de efeito.** Última frase com moral ou síntese ("E é assim que...", "Tudo converge
   para..."). O parágrafo termina na última coisa que aconteceu ou que alguém disse.
7. **Par que soa igual.** Dois itens seguidos com a mesma cadência ou a mesma abertura. Varia o
   tamanho: uma frase de quatro palavras depois de uma de vinte.
8. **Frase que não cabe na boca.** Mais de umas 25 palavras, ou oração intercalada entre vírgulas.
   Quebra em duas, ordem direta.
9. **Nominalização.** "A chegada de Jesus provoca", "a rejeição dos líderes". Volta para o verbo:
   "Jesus chega e", "os líderes rejeitam".
10. **Passiva sem motivo.** "São enviados", "é entregue" quando se sabe quem fez.
11. **Adjetivo de contracapa.** "Impactante", "marcante", "profundo", "poderoso", "intenso",
    "emblemático". A cena se qualifica sozinha.
12. **Pergunta retórica de apresentação.** Só se a pergunta está no texto bíblico, entre aspas.
13. **Metalinguagem.** "Neste ramo", "como vimos", "repare como", "note que".
14. **Explicação por cima.** "Isso significa que", "ou seja", "em outras palavras". Escreve-se logo
    a tradução.
15. **Cantilena de três.** "Poder, autoridade e compaixão". Um ou dois bastam.

Também proibidos (lista antiga): travessão (—), "mergulhar", "crucial", "fundamental", "dança",
"em resumo", "vale ressaltar", "teia", "jornada", "multifacetado", "vamos explorar", "é importante
notar", "no fim das contas", emoji.

## O que faz querer abrir o livro

- **Um achado por ramo**: uma frase que o amigo repetiria no almoço ("Jesus dorme na popa, com a
  cabeça numa almofada, no meio da tempestade"). Se o ramo não tem, procure nos versículos até achar.
- **A raiz é um convite de umas 4 frases**, não um resumo. Primeira: o que faz esse livro ser
  diferente dos outros 65. Última: o que Jesus (ou o autor) diz que está fazendo ali.
- **A conexão é uma ponte falada**: a palavra que o fim de um ramo e o começo do outro compartilham
  ("Jairo ouve “apenas creia”; em Nazaré, ninguém crê"). Até 100 caracteres de preferência, teto 150.
- **Ritmo**: curta depois de longa.
- **Citação só quando as palavras exatas são o soco.** "Verdadeiramente, este homem era o Filho
  de Deus!" fica entre aspas. "não está aqui para ser servido, mas para servir os outros e dar a
  sua vida a fim de salvar a muitos" trava a fala: vira "não para ser servido, mas para servir e
  dar a vida por muita gente", sem aspas, com a referência garantindo a fidelidade. Citação longa
  (mais de umas 12 palavras) no meio de um parágrafo é paráfrase; galho pode guardar uma fala
  curta de Jesus. Quando citar, é texto exato da NBV.
- **Humano não é gíria.** Palavra do dia a dia, sim ("bate de frente", "muita gente"); gíria, tom
  de piada ou de esperteza sobre Jesus, Deus ou o texto, não ("Jesus não enrola" saiu em Marcos,
  dono, 03/10: "Jesus não enrola?"; virou "Jesus responde na hora"). É alguém da célula falando
  de quem ele adora: direto, com respeito.
- **Humano não é inventivo.** A voz puxa cor ("dramático", "a multidão em choque"); espanto só do
  que o texto traz.

## Fidelidade (não muda com a voz)

- Cada fato, nome, número, lugar, adjetivo e tempo de verbo está no texto da própria referência do
  item (confira na folha do `rever-mapa`). Ordem de Deus se conta como ordem ou promessa, não como
  fato. Lei fica no presente da ordem ("a lei manda").
- Citação entre aspas é texto exato da NBV; palavra tirada do meio vira reticências; citação com
  hífen vira paráfrase. Nenhuma palavra com hífen fora de citação (`grep -o -E
  '[[:alpha:]]+-[[:alpha:]]+' <mapa>.json`, ignorando os ids de desenho).
- Nenhum ponto depois de "!”" ou "?”". Nenhum galho termina com palavra de 1 ou 2 letras antes da
  referência. Nenhum item começa igual ao anterior; nenhuma palavra se repete na mesma frase.
- Fora do livro só entram o significado do nome, "[Livro] e Cristo" e o destaque `jesus`, sempre com
  referência do Novo Testamento. A nota de um par não repete o nome do livro do NT.
- Cada referência aparece uma vez no mapa; não troque `ref` a não ser para cobrir um fato novo.

## Como trabalhar

- **Escritor**: lê cada campo pela lista. Se passa, não toca (boa parte dos galhos já é cena
  concreta). Se não, conta o trecho em voz alta sem olhar a versão antiga, com a folha ao lado,
  escreve, relê na hora e corrige ali. Não escreve o mapa inteiro para revisar depois. Confere só as
  referências do campo que mexeu. Tira o slug de `AINDA_NA_VOZ_ANTIGA` em `ferramentas/checar-mapa.mjs`
  e roda `node ferramentas/checar-mapa.mjs <slug>` até ok, depois `node build.mjs && node teste.mjs`.
- **Revisor** (um por mapa, nunca por trecho): lê cada campo uma vez com a lista ao lado e corrige
  direto no JSON, conferindo a fidelidade do trecho mexido na folha. Não devolve o mapa nem escreve
  relatório; devolve só a lista do que mudou. Roda o checador e os testes de novo.
- Sem captura de tela para texto: o `teste-mapas` mede as linhas a 390px. Nenhum nome de modelo de
  IA em arquivo nenhum.
