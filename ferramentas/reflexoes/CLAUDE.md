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
   saber o que dizer" é de Marcos 9.6, e o dia lia Mateus 17. Simbolismo de pregação também não: "sangue na orelha, na mão e no pé =
   o que ele ouve, faz e por onde anda" (Lv 8) é leitura de sermão, não do texto; e "sumo
   sacerdote" não é como a NBV chama Arão ali. Ao recontar, conferir também a
   primeira reação da pessoa: Moisés responde "Eis-me aqui!" antes do "quem sou eu?".

   **Achados da 2ª passada (U1-U2), para não repetir:** conclusão tirada do silêncio ("ninguém
   perguntou nada aos gigantes", "paradas em que nada aconteceu", "Deus não tira as serpentes");
   adiantar o próximo dia (Josué discordando dos espias só aparece em Nm 14, não no 13);
   texto de outro livro puxado para dentro (Nicodemos e a serpente é João 3; "ninguém era
   obrigado a fazer voto" é de Deuteronômio); lei com alcance maior do que o texto dá ("o
   resultado é sempre o mesmo" quando só vale para lepra confirmada; "contem a comunidade toda"
   quando a contagem é dos homens de vinte anos para cima); palavra de sentido espiritual usada
   para outra coisa ("salvação" para quem sobreviveu à picada); motivo psicológico dado a
   personagem ("tinha acabado de enterrar a irmã quando explodiu").

   **Quem está falando.** Nem toda fala dentro da Bíblia é ensino de Deus. Em Jó, os amigos
   (Elifaz, Bildade, Zofar) falam muito sobre Deus e o próprio livro diz depois que eles não
   falaram o que é certo; nunca usar fala deles como verdade para o leitor, nem como âncora.
   O mesmo vale para reis, falsos profetas e acusadores: o que o comandante assírio gritou contra Jerusalém não é "Deus disse".
   Nas reflexões já escritas: o anjo, o profeta ou Jesus falando é Deus falando; o rei ou o
   povo falando é só o que eles disseram.
   Eliú (Jó 32-37) segue a mesma regra: fala coisas bonitas sobre Deus e, no mesmo discurso,
   repete a acusação dos amigos ("está recebendo o merecido castigo"). Quando o dia inteiro é
   fala dele (Jó 36-37), a reflexão diz no texto que é Eliú falando e trabalha o discernimento
   (conferir o que se ouve sobre Deus), sem apresentar a fala dele como palavra de Deus.

   **Ordem dada para aquele povo, naquele momento.** Esdras 9-10 (os homens mandam embora as
   esposas estrangeiras e os filhos) e textos parecidos não viram aplicação para o leitor.
   Muitos recém-convertidos são casados com quem não crê, e a leitura de hoje não pode soar
   como "separe-se". Nesses dias, ancorar em outro trecho da leitura e não fazer pergunta sobre
   o casamento do leitor. Vale também para as guerras de conquista e as ordens de destruição.

   **Promessa de proteção não é promessa de vida sem sofrimento.** Salmos como o 91 ("nenhum
   mal o atingirá") e o 37.25 ("nunca vi o justo abandonado, nem seus filhos mendigar o pão")
   ferem quem está sofrendo ou é pobre se virarem garantia. Ancorar no que a própria promessa
   admite ("quando estiver em dificuldades, eu estarei ao seu lado", 91.15) e, se houver no
   dia, mostrar quem sofreu confiando (Paulo em 2 Co 11). Nos salmos de lamento, não apressar o
   consolo: o Salmo 88 termina na escuridão, e a reflexão diz isso.
   Versículo famoso fora do contexto: Jeremias 29.11 ("planos de bem") foi dito a exilados
   que iam esperar setenta anos na Babilônia, e não é promessa de solução rápida. A reflexão
   conta o contexto (a carta, a espera, orar pela cidade) antes da promessa.

   **Códigos domésticos** (esposas e maridos, escravos e senhores: Efésios 5-6, Colossenses
   3-4, Tito 2, 1 Pedro 2.18-3.7) não viram âncora nem pergunta sobre o casamento ou o trabalho
   do leitor. A NBV chega a dizer "se fizerem o bem e suportarem os açoites"; para quem vive
   violência em casa, uma pergunta sobre "sujeitar-se" soa como mandar suportar. Nesses dias,
   ancorar em outro trecho (1 Pe 3.8-9, 3.15; Ef 4.32; Cl 3.12-14).

   **Tradição de pregação que o texto não diz.** Isaías 14.12-15 ("estrela da manhã") e
   Ezequiel 28.12-19 ("querubim da guarda") são ditos, no próprio texto, ao rei da Babilônia e
   ao rei de Tiro. Ler neles a queda de Satanás é interpretação de tradição, não o que está
   escrito; a reflexão fala de quem o texto nomeia (o orgulho do rei) e não ensina a outra
   leitura como fato. Ezequiel 16 e 23 (imagens sexuais explícitas) nunca viram âncora.

   **Visões do fim (Daniel 7-12, Ezequiel 38-39, Apocalipse).** Nada de datas, de contar
   semanas ou anos para chegar a um calendário, nem de dizer quem são hoje a besta, o
   anticristo, Gogue ou a "marca" (país, líder, tecnologia). Essas leituras dividem igrejas e
   assustam quem está chegando. A reflexão fica no que o texto diz com clareza: Deus reina,
   o Cordeiro vence, os fiéis são guardados, Deus enxugará as lágrimas. Nas cartas às igrejas
   (Ap 2-3), a pergunta é sobre a vida do leitor, não sobre "qual era da história" é cada uma.

   **Dinheiro e bênção.** Malaquias 3.8-12 ("roubar a Deus", "janelas do céu") e textos
   parecidos não viram âncora nem pergunta sobre o quanto o leitor dá, e nunca prometem retorno
   financeiro. Quem está chegando é alvo fácil de cobrança e de teologia da prosperidade.
   A reflexão pode falar de generosidade e de dar a Deus o melhor (Ml 1.8), sem número, sem
   troca e sem culpa.
   Provérbios são conselhos de sabedoria, não garantias: "sua vida será prolongada", "seus
   celeiros ficarão cheios" (Pv 3) não viram promessa de saúde ou dinheiro para quem obedece.
   Âncora em conselho (confiar, cuidar do coração, falar com cuidado), não em recompensa.
   Os capítulos sobre a "mulher imoral" (Pv 5-7) não viram âncora nem pergunta sobre a vida
   sexual do leitor; se aparecerem, uma frase sóbria sobre fidelidade basta.
   Eclesiastes é a busca de alguém "debaixo do sol": frases como "os mortos são mais felizes
   que os vivos" (4.2) ou "o homem não tem vantagem sobre o animal" (3.19) são o caminho da
   busca, não ensino para o leitor. Âncora no que o próprio livro apresenta como conclusão ou
   observação sóbria (3.11, 4.9-10, 12.13) e, se preciso, dizer no texto que nem tudo o que o
   Pregador diz no meio da busca é o ponto final.
   Cânticos é uma canção de amor entre a amada e o amado; Deus não é citado nos capítulos. Não
   dizer "Deus diz" nem ler o texto como alegoria (Cristo e a igreja é tradição de pregação).
   Com pudor: âncora em frases como "o meu amado é meu, e eu sou dele" ou "não despertem o
   amor antes do tempo"; nada de imagens do corpo, nem pergunta sobre a vida íntima do leitor.
   Salmos que pedem destruição dos inimigos (58, 69.22-28, 83, 109, 137) não viram âncora nem
   pergunta sobre o leitor desejar o mal de alguém.

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

## Explorar (as 546 notas)

As regras de fidelidade valem também para o Explorar, com três pontos próprios:

1. **O texto bíblico vem das Bíblias do app.** O material de origem citava a NVI 2023, que
   não tem licença para o aplicativo. O blockquote das notas de versículo é preenchido por
   `ferramentas/versiculos-explorar.mjs` com a NBV e a Bíblia Livre, e o app mostra a
   tradução escolhida (`CC.textoDaNota`). Nunca colar texto da NVI ou da ARA numa nota.
2. **Paráfrase com referência segue a NBV.** Quando a nota diz "João 1.9 diz que...", o que
   vem depois tem de ser o que a NBV diz, porque é o que o leitor encontra ao abrir. Achados
   na Trilha: "amabilidade" (NVI) onde a NBV diz "retidão" (Gl 5.22), "templo" onde diz
   "morada" (1 Co 6.19), "resgate" onde diz "salvar" (Mc 10.45). Citação entre aspas: copiar
   da NBV, sempre imprimindo o versículo com `node` antes de escrever. Até na correção a
   memória trai: ao trocar João 4.14, saiu "uma fonte perene dentro dela", que não está em
   tradução nenhuma; a checagem pegou.
   Quando o comentário depende da palavra literal ("circuncidará", "resgatei", "expiar",
   "habitou"), a citação pode vir da Bíblia Livre, que também é do app, com "(na Bíblia
   Livre)" depois.
3. **Onde mexer.** Cada pasta tem a sua fonte: Trilha em `primeiros-passos.mjs`, Pessoas em
   `pessoas-a/b/c.mjs` (as duas são aplicadas de novo a cada rodada), o resto em
   `ferramentas/explorar/*.json`. Nesse último, a nota já aplicada no `conteudo.json` só
   continua em dia se as duas cópias mudarem juntas (a fonte e o `conteudo.json`); mudar só
   a fonte faz a nota aparecer como "desatualizada".

Checagem: `node ferramentas/teste-explorar.mjs [pasta]` confere que toda referência existe
(livro de um capítulo só aceita "Judas 24"; faixa entre capítulos, "Gênesis 29.31-30.24") e
lista as citações entre aspas que não estão na NBV nem na Bíblia Livre, para conferir uma a
uma: nem toda é erro, muitas são frases do autor ou falas de exemplo.
