# Filtro das reflexões: regras para escrever e revisar

Vale para tudo nesta pasta (texto, perguntas e começos de oração de cada dia) e para as
perguntas genéricas por gênero em `src/app/04c-reflexao.js`. Quem lê é jovem e pode ter
acabado de se converter: o que está escrito aqui vira a primeira ideia que ele forma de
Deus e da Bíblia.

## Regra central: não deturpar a Bíblia

Nada pode fazer a pessoa entender a Bíblia diferente do que ela diz. Na dúvida entre uma
pergunta bonita e uma fiel, fica a fiel. Na dúvida sobre a fidelidade, a pergunta sai.

## As regras

1. **Só a leitura do dia.** Toda afirmação sobre a passagem tem de estar nos trechos lidos
   naquele dia (`plano[dia-1].trechos` em `conteudo/conteudo.json`). Conferir no texto de
   `conteudo/biblias/nbv.json` antes de afirmar. Nada de outros livros, tradição, números ou
   datas que a leitura não dá (já escaparam: os "quarenta anos" de Moisés, que estão em
   Atos 7; o bezerro de ouro, que é Êx 32, num dia que lia Êx 22-24).

   **Citação é da NBV.** O app abre a Nova Bíblia Viva por padrão, e é ela que o leitor tem
   na frente. Toda frase apresentada como "o texto diz" e toda palavra da passagem repetida
   numa pergunta tem de bater com a NBV (`livros["Livro"][cap-1][vers-1]`). Redação de outra
   tradução não pode ser atribuída ao texto. Erros já cometidos: "Noé achou graça" (a NBV diz
   "agradava ao Senhor com a sua vida", quase o contrário), "Deus proverá" (NBV: "Deus vai
   prover o cordeiro"), "cana rachada" (NBV: "galho que está quebrado"), "casa da escravidão"
   (NBV: "onde você foi um povo escravo"). E conferir números e contagens ("quatro palavras",
   "mais de vinte anos"), que também já saíram errados.

2. **Uma palavra, um sentido.** Palavra com sentido bíblico próprio não pode aparecer com
   outro sentido na mesma reflexão. Caso real: o texto diz que Noé "achou graça aos olhos do
   Senhor" (graça = favor que Deus dá sem ninguém merecer), e a pergunta dizia "o que Deus já
   te deu de graça" (de graça = sem pagar). Palavras que exigem esse cuidado: graça, justo,
   justiça, santo, carne, mundo, lei, temor, fé, glória, bênção, salvação, sangue, aliança,
   espírito, coração, promessa, perdão, sacrifício, oferta, servo. Ou se usa no mesmo sentido
   do texto, ou se troca a palavra.

3. **Sem adivinhar Deus.** Nada de "por que você acha que Deus fez...", quando o texto não diz
   o porquê. Pode perguntar o que a pessoa viveu de parecido com o que Deus fez no texto.

4. **Não ensinar sem querer uma ideia errada sobre Deus.** Ler cada pergunta e perguntar: que
   ideia sobre Deus uma pessoa nova tira daqui? Erros já cometidos: "onde Deus está te
   privando de algo?" (Deus não priva) e "em que momento você pode lembrar que Deus está com
   você?" (ele está sempre). Verdades que nenhuma pergunta pode contrariar: Deus está sempre
   presente; o amor dele não depende do nosso comportamento; salvação é pela graça, não por
   mérito; Deus não é cúmplice do mal.

5. **O que é da história não vira ordem para o leitor.** Separar o que o texto conta do que ele
   manda. Deus pedir Isaque a Abraão não é Deus pedindo filhos hoje; uma promessa feita a
   Abraão ou a Israel não vira promessa pessoal automática. Personagem não é modelo só por
   estar na Bíblia (Jacó engana, os amigos de Jó falam errado sobre Deus, Jó 42.7).

6. **Recém-convertido primeiro.** O amor do Pai vem antes do convite; confronto vira convite,
   nunca acusação. Nada de palavra de igreja sem explicar (ex.: "Betel", "santificação").

7. **Clareza.** Um jovem que nunca leu a Bíblia entende de primeira. Nada de cena abstrata para
   imaginar ("se escrevessem uma linha sobre você...").

8. **Na dúvida, não fazer.** Duas perguntas boas valem mais que três com uma forçada (o formato
   aceita 2 ou 3).

9. **Português falado.** Frases curtas, sem palavra rara ("manqueira"). O `teste-reflexoes.mjs`
   reprova travessão, emoji e os tiques de texto de IA ("jornada", "mergulhar"...).

10. **Oração acompanha as perguntas.** Os três começos de oração conversam com o que foi
    perguntado, não acusam e terminam em "…".

## Como revisar (toda vez, antes de publicar)

1. Para cada dia, abrir a leitura do dia e conferir cada fato citado (regra 1).
2. Ler texto e perguntas juntos procurando palavra repetida com sentido diferente (regra 2).
   O `node ferramentas/teste-reflexoes.mjs` lista em "revisar sentido" as perguntas com as
   palavras da regra 2: cada uma tem de ser olhada por alguém, não é aviso para ignorar.
3. Passar cada pergunta pelas regras 3 a 8.
4. O que for teologicamente delicado vai para o dono antes de publicar.
