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

   **Nomes como a NBV escreve.** Nome de pessoa ou lugar tem a grafia da NBV: ela escreve
   "Hagar" e "Coré", e as reflexões diziam "Agar" e "Corá". O teste lista em "conferir" todo
   nome que a leitura do dia não tem.

   **Nada de afirmação absoluta sem conferir.** "O primeiro", "o único", "a Bíblia inteira",
   "a única vez" pedem prova na própria leitura. Já saíram errados: "o primeiro castigo da
   Bíblia" (Adão e Eva são castigados antes, Gn 3), "a única pessoa na Bíblia inteira que dá
   nome a Deus", "a única vez na Bíblia em que alguém proíbe o povo de ofertar". Na dúvida,
   tira-se o absoluto: "dessa vez" no lugar de "pela primeira vez".

   **Não concluir do silêncio.** O texto não dizer que alguém orou não prova que ele não orou.
   Já saíram "Ló não pergunta nada a Deus" e "Deus não cobrou uma explicação de Arão". Afirma-se
   o que o texto conta, não o que ele deixa de contar.

   **Quem fez o quê, exatamente.** Ao recontar, manter quem age e quem recebe como no texto:
   em Gn 19.16 são "os anjos" que puxam Ló (não "os homens"), e a misericórdia é "deles" (a
   família), não só "dele".

   **Sequência como no texto.** Não resumir dizendo "a primeira coisa que ele fez foi...":
   em Gn 24 o servo primeiro dá as joias e pergunta de quem a moça é filha, e só depois se curva
   e adora. Recontar na ordem do texto ou sem ordem nenhuma.

   **Nem tradição de pregação, nem outro evangelho.** Explicação que circula em pregação não
   é texto: "cada praga atingia um deus do Egito" saiu numa reflexão de Êx 7-9, e a leitura
   não diz isso. Detalhe de um evangelho também não entra na leitura de outro: "Pedro, sem
   saber o que dizer" é de Marcos 9.6, e o dia lia Mateus 17. Ao recontar, conferir também a
   primeira reação da pessoa: Moisés responde "Eis-me aqui!" antes do "quem sou eu?".

   **Sentimento e tempo na medida do texto.** Não aumentar o que o texto diz: em Gn 50.15 os
   irmãos acham "possível" que José se vingue, e a reflexão dizia que eles "têm certeza"; em
   Mt 14 a NBV diz que "lutavam contra o mar agitado" e que Jesus veio "já de madrugada", e a
   reflexão dizia "havia horas" e "a noite toda". Medo, certeza, duração e intensidade ficam
   no tamanho que o texto dá.

   **Não adiantar outros dias.** Nada de "isso vai custar caro" apontando para uma leitura que
   ainda vai vir, nem citar história de outro dia como se estivesse nesta (a torre de Babel é
   Gn 11, e não cabe no dia que lê Gn 9-10).

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

   **Passagem que pode assustar ou confundir conta o desfecho que o próprio texto dá.** Em Gn 22,
   contar que Deus pediu Isaque sem dizer que o Anjo mandou parar deixa um recém-convertido com a
   ideia de um Deus que pede filhos. O texto resolve, e a reflexão tem de mostrar a resolução.
   Vale para juízo, violência e castigo: se o texto traz misericórdia junto, ela entra.

   **Não fechar o que o texto deixa aberto.** "Lia para de pedir o amor do marido" era verdade
   no quarto filho, mas no mesmo dia de leitura (Gn 30) ela volta a esperar isso. Descrever o
   momento, não transformar em mudança definitiva.

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

## Regras de escrita (a voz)

**Ordem de prioridade, sem exceção:** fidelidade à Bíblia > clareza > acolhimento > estilo.
Se uma frase bonita arrisca qualquer uma das três primeiras, ela sai.

Referência de tom indicada pelo dono: os devocionais de **Deive Leonardo**, "Oi Deus, Sou Eu
de Novo!" (365 dias, conversa diária com Deus "sem cobranças, sem culpa, sem perfeição") e
"Um Mês Sem Errar" (31 dias, "uma leitura por dia, sem enrolação", um passo prático por
dia). É referência de TOM, não de conteúdo: não copiar frases, bordões nem títulos dele.

**Voz.** Um amigo mais velho na fé conversando, não um professor dando aula nem um pregador
no púlpito. Fala com "você", frases curtas, palavras do dia a dia de um jovem brasileiro.

**Sem enrolação.** O texto tem de 4 a 6 frases. Cada frase faz um trabalho; nada de
introdução ("Hoje vamos ver..."), resumo no fim ou moral da história repetida.

**O texto, em três movimentos:**
1. o que acontece na leitura, contado com um detalhe concreto (um gesto, uma frase dita,
   um objeto), como quem conta uma história, não como quem resume um capítulo;
2. o detalhe que passa despercebido numa leitura rápida, o "repare que..." da passagem;
3. o que aquilo mostra do coração de Deus, dito com encorajamento, sem sermão.

**Perguntas.** Levam a pessoa a olhar para a própria vida e a conversar com Deus sobre isso.
Pelo menos uma tem um passo possível HOJE, pequeno e concreto ("Um Mês Sem Errar"): uma
conversa, um perdão, um agradecimento, uma pausa. Nunca uma tarefa que gere culpa se não
for feita.

**Oração.** Começos de frase de uma conversa sincera, do jeito que a pessoa falaria com Deus
no quarto: curtos, em primeira pessoa, sem linguagem de púlpito ("Senhor, eu te louvo e te
bendigo porque..." não).

**Tom.** Esperança e recomeço antes de exigência. Confronto existe, mas vem com a porta
aberta: o erro é nomeado e em seguida vem o que Deus faz com quem erra.

**Evitar:**
- culpa e perfeccionismo: "você deveria", "você falhou", "está na hora de parar de...";
- jargão e clichê de igreja sem explicar: "tremendo", "ministrar", "unção", "romper", "no
  mover", "profetizar sobre a sua vida";
- autoajuda sem Deus: o centro é o que Deus faz, não "você é capaz", "acredite em você";
- promessa que a Bíblia não faz: sucesso, dinheiro, cura garantida, "Deus vai te dar o que
  você quer";
- exagero emocional ("a coisa mais linda que você vai ler hoje") e sensacionalismo;
- tratar o leitor como se já fosse maduro na fé, ou como criança.

**Teste final de cada reflexão:** um jovem que acabou de se converter, lendo sozinho no
celular antes de dormir, termina a leitura (1) entendendo o que aconteceu na passagem,
(2) sentindo que Deus está do lado dele, e (3) com uma coisa pequena para conversar com
Deus ou fazer amanhã?

## Por que existe checagem automática

Quem escreve com IA cita de memória, e a memória mistura traduções (ARA, ACF, NVI, NTLH)
sem perceber: saiu "Deus proverá", "achou graça" e "cana rachada" em reflexões que diziam
citar o texto. Ler a regra não impede o erro. Por isso as regras que dá para conferir por
máquina estão no `ferramentas/teste-reflexoes.mjs`, e publicar exige que ele passe:

- **reprova** citação entre aspas (12+ caracteres) que não exista, palavra por palavra, na
  NBV da leitura do dia;
- **reprova** expressão típica de outra tradução (lista `OUTRA_TRADUCAO`) que a NBV da leitura
  não tenha. Cada erro novo desse tipo entra na lista;
- **lista para conferir** todo número citado que não aparece na leitura. Contagem que o
  próprio texto dá (cinco filhas, doze espiões, 7 + 7 anos) pode ficar; número trazido de
  fora (os "quarenta anos" que vêm de Atos 7) sai;
- **lista para conferir** nome próprio que não aparece na leitura do dia (a palavra no começo da
  frase só entra se nunca aparece em minúscula na NBV, para não confundir verbo com nome);
- **lista para conferir** afirmação absoluta (lista `ABSOLUTA`);
- **lista para revisar** pergunta com palavra de sentido bíblico próprio (regra 2).

**As travas também erram.** A de nomes deixou passar "Dina" (a NBV escreve "Diná") porque
procurava pedaço de texto e achou "Dinabá". Comparação de nome e de citação é sempre por palavra
inteira. Quando a revisão humana acha algo que uma trava deveria ter pegado, corrige-se a trava.

**Regra de manutenção (pedido do dono):** todo tipo de erro novo encontrado numa revisão vira
uma regra neste arquivo e, quando der para pegar por máquina, uma trava no teste.

Nunca escrever citação de cabeça: copiar do `conteudo/biblias/nbv.json`.

## Como revisar (toda vez, antes de publicar)

1. Para cada dia, abrir a leitura do dia e conferir cada fato citado (regra 1).
2. Ler texto e perguntas juntos procurando palavra repetida com sentido diferente (regra 2).
   O `node ferramentas/teste-reflexoes.mjs` lista em "revisar sentido" as perguntas com as
   palavras da regra 2: cada uma tem de ser olhada por alguém, não é aviso para ignorar.
3. Passar cada pergunta pelas regras 3 a 8.
4. O que for teologicamente delicado vai para o dono antes de publicar.
