// Primeiros passos: as doze lições reescritas para jovens, sem supor que a pessoa já foi
// batizada. O texto do arquivo de notas continua lá; o que o app mostra vem daqui.
//
// Formato de cada lição: blocos separados por linha em branco. "## " abre um subtítulo,
// [[id da nota|texto]] vira link, **assim** vira negrito e quebra de linha simples dentro
// do bloco vira <br>.

const T = '01 - Trilha do Recém-Batizado/';

export const LICOES = {
  [T + '01 - Segurança da Salvação']: {
    nome: '01 - Segurança da salvação',
    resumo: 'Dá pra ter certeza de que você pertence a Deus? A Bíblia diz que sim, e mostra onde essa certeza se apoia.',
    texto: `
Se você colocou sua confiança em Jesus, cedo ou tarde vai bater a pergunta: será que tenho a salvação mesmo? E se eu errar de novo? E se um dia eu esfriar?

Esta lição vem primeiro porque quase tudo depende dela. Quem vive tentando garantir o próprio lugar diante de Deus gasta energia com medo e sobra pouco pra crescer.

Se você ainda está conhecendo Jesus e não sabe bem no que acredita, pode ler do mesmo jeito. A lição 2 conversa sobre quem ele é e pode ser um bom próximo passo.

## De onde vem a dúvida

Quase sempre a dúvida nasce de olhar pra si mesmo. A pessoa mede o próprio dia, vê que falhou e conclui que Deus deve estar decepcionado. Por trás disso existe uma ideia errada: a de que a salvação depende do seu desempenho.

## O que sustenta a salvação

Efésios 2.8-9 diz que somos salvos pela graça, por meio da fé, e que isso vem de Deus como presente. Ninguém ganhou por merecer, e por isso ninguém tem do que se gabar.

Pensa assim: se você não conquistou a salvação com esforço, também não é o seu esforço que vai mantê-la de pé. [[11 - Pessoas/Paulo|Paulo]] pergunta aos cristãos da Galácia (Gálatas 3.3) por que achavam que, depois de começar a vida com Deus sem nenhum mérito, iam ficar mais fortes na fé tentando cumprir regras por conta própria.

Jesus usa uma imagem bonita em João 10.28-29. Ele dá vida eterna às suas ovelhas, e ninguém consegue arrancá-las da mão do Pai. Quem segura a ovelha é o pastor.

E Romanos 8.1 afirma que agora já não existe condenação pra quem está em Cristo Jesus. O verbo está no presente. Vale no dia em que você acorda de bom humor e no dia em que acorda mal.

Ver [[06 - Estudos Temáticos/Graça|Graça]], [[06 - Estudos Temáticos/Justificação|Justificação]] e [[08 - Versículos/Efésios 2.8-9|Efésios 2.8-9]].

## Um ponto em que cristãos pensam diferente

É bom saber disso cedo. Algumas igrejas ensinam que quem foi salvo de verdade nunca perde a salvação, e leem João 10 e Romanos 8 nessa direção. Outras levam muito a sério os alertas contra abandonar a fé, como os de Hebreus 6 e 10, e entendem que alguém pode se afastar de vez. Nos dois lados há gente que ama a Bíblia e estuda com cuidado.

O que os dois lados afirmam juntos é o que esta lição quer deixar firme: a certeza do cristão se apoia na obra de Cristo e na fidelidade de Deus, e nunca no quanto você foi bem essa semana.

## Duas confusões comuns

A primeira é misturar **sentimento e posição**. O que você sente hoje muda com o sono, com uma briga em casa, com uma nota ruim na prova. Sua posição diante de Deus foi garantida por Jesus e continua a mesma quando o humor cai.

A segunda é misturar **luta e derrota**. Em Romanos 7, Paulo descreve a briga de fazer o que ele mesmo não queria fazer. Essa luta é sinal de vida. Quem não se importa com Deus costuma pecar sem briga nenhuma por dentro. Se o pecado te incomoda, algo novo já está acontecendo aí.

## Certeza e mudança andam juntas

Ter segurança da salvação não dá licença pra viver de qualquer jeito. A Bíblia sempre coloca a certeza e a mudança de vida lado a lado, e a primeira carta de João faz isso do começo ao fim.

A diferença está no motivo. Quem obedece pra ser aceito vive com medo e nunca sabe se já fez o bastante. Quem obedece porque já foi aceito obedece com gratidão, e quando cai consegue levantar. Ver [[05 - Hermenêutica/Da interpretação à aplicação|Da interpretação à aplicação]].

## Quando a dúvida voltar

Ela vai voltar em algum momento. Nessa hora, procurar dentro de você uma emoção mais forte não resolve. O caminho é olhar de novo pra fora, pro que Jesus fez na cruz e na ressurreição. Isso aconteceu na história e continua valendo, seja qual for o seu dia.

João escreveu sua primeira carta justamente pra isso. Em 1 João 5.13 ele diz que escreveu pra que quem crê no nome do Filho de Deus saiba que tem a vida eterna. Deus quer que você saiba, com calma.

## Pra anotar

No campo Suas anotações, no fim desta página, escreva com suas palavras o que você pensava sobre salvação antes desta lição e o que ficou diferente. Coloque a data. No dia em que a dúvida apertar, volte aqui e leia.

## Leia esta semana

Efésios 2.1-10 · Romanos 8.1-4 e 8.31-39 · João 10.22-30 · 1 João 5.11-13

## Pra ir além

Próxima lição: [[${T}02 - Quem é Jesus|Quem é Jesus]]
Temas: [[06 - Estudos Temáticos/Graça|Graça]] · [[06 - Estudos Temáticos/Fé|Fé]] · [[06 - Estudos Temáticos/Justificação|Justificação]] · [[06 - Estudos Temáticos/Perdão|Perdão]]
Alianças: [[14 - Alianças/Nova aliança|Nova aliança]]
`,
  },

  [T + '02 - Quem é Jesus']: {
    resumo: 'Jesus perguntou aos amigos: e vocês, quem dizem que eu sou? A fé cristã inteira depende dessa resposta.',
    texto: `
Em Mateus 16.15, Jesus fez uma pergunta direta aos amigos mais próximos: e vocês, quem dizem que eu sou? A fé cristã inteira depende da resposta. A certeza da lição anterior só faz sentido se estiver apoiada em alguém capaz de sustentar esse peso.

## Respostas pela metade

Quase ninguém diz que Jesus nunca existiu. A maioria das pessoas fala bem dele: foi um homem bom, um grande mestre, um exemplo de amor. Parece elogio, só que deixa o principal de fora.

Um bom mestre humano não diria que perdoa pecados cometidos contra outras pessoas. Não aceitaria ser adorado. Não diria que já existia antes de [[11 - Pessoas/Abraão|Abraão]] (João 8.58). Jesus disse e fez tudo isso. Então sobram poucas saídas: ou ele estava enganado, ou estava enganando, ou é quem disse ser.

## O que a Bíblia afirma sobre ele

João 1.1 e 1.14 dizem que no princípio já existia a Palavra, que a Palavra era Deus, e que ela se tornou gente e morou entre nós. Colossenses 1.15-20 diz que tudo foi criado por meio dele e que tudo se mantém nele. Hebreus 1.3 diz que ele mostra com exatidão quem Deus é.

Ao mesmo tempo, os Evangelhos mostram alguém que sentiu fome, cansaço e tristeza. Jesus chorou no túmulo de um amigo e passou por uma angústia enorme no [[13 - Lugares/Getsêmani|Getsêmani]].

A fé cristã afirma as duas coisas juntas: Jesus é totalmente Deus e totalmente humano, sem que uma apague a outra. É difícil de explicar, e a igreja levou alguns séculos pra colocar em palavras precisas o que os textos já mostravam.

## Por que as duas coisas importam

Se Jesus não fosse humano de verdade, não poderia nos representar. Hebreus 2.17 diz que ele precisou se tornar semelhante a nós em tudo.

Se ele não fosse Deus de verdade, a cruz seria mais uma injustiça da história, a morte de um homem bom sem alcance pra mais ninguém. Quem ele é dá peso ao que ele fez.

E se ele não fosse as duas coisas, não haveria ponte entre nós e Deus. 1 Timóteo 2.5 diz que existe um só mediador entre Deus e a humanidade: Jesus Cristo, que também é homem.

## O que ele fez

Jesus viveu uma vida de obediência completa, coisa que nenhum de nós conseguiu. Morreu carregando uma condenação que era nossa. Em Marcos 10.45 ele mesmo diz que veio pra servir e dar a vida pra salvar muitos.

E ressuscitou. Paulo diz em 1 Coríntios 15.14-17 que tudo depende disso: se Cristo não ressuscitou, a fé de vocês é inútil e vocês ainda estão sob condenação dos seus pecados.

Ver [[12 - Eventos/Crucificação|Crucificação]], [[12 - Eventos/Ressurreição|Ressurreição]] e [[15 - Fios Bíblicos/Fio do servo sofredor|Fio do servo sofredor]].

## Ele estava no plano desde o começo

Jesus nunca foi plano B. A promessa aparece logo em Gênesis 3.15, depois da [[12 - Eventos/Queda|Queda]], e atravessa toda a história de Israel até o nascimento em [[13 - Lugares/Belém|Belém]]. Ver [[15 - Fios Bíblicos/Fio da semente prometida|Fio da semente prometida]].

Depois de ressuscitar, Jesus caminhou com dois discípulos e, começando por Moisés e todos os profetas, explicou o que as Escrituras diziam sobre ele (Lucas 24.27). Por isso vale ler o Antigo Testamento procurando por ele.

## O que muda na prática

Se Jesus é quem a Bíblia diz, ele deixa de ser uma opção entre várias ou um conselheiro que você consulta quando convém. O que ele ensina tem autoridade sobre o que você pensa e sobre como você vive, inclusive nos pontos em que você discorda dele.

E tem o outro lado. Se Deus se fez gente e passou por cansaço, rejeição e dor, nada do que você enfrenta é estranho pra ele. Hebreus 4.15 diz que ele entende as nossas fraquezas e tem compaixão de nós.

## Pra anotar

Em Suas anotações, no fim desta página, responda à pergunta de Mateus 16.15 com as suas palavras, sem copiar frase pronta. Coloque a data. Daqui a um ano, responda de novo e compare.

## Leia esta semana

João 1.1-18 · Marcos 8.27-38 · Colossenses 1.15-23 · Hebreus 1.1-4 e 2.14-18 · Filipenses 2.5-11

## Pra ir além

Próxima lição: [[${T}03 - O batismo|O batismo]]
Pessoas: [[11 - Pessoas/Jesus Cristo|Jesus Cristo]]
Temas: [[06 - Estudos Temáticos/Messias|Messias]] · [[06 - Estudos Temáticos/Redenção|Redenção]] · [[06 - Estudos Temáticos/Graça|Graça]]
Conexões: [[15 - Fios Bíblicos/Fio da semente prometida|Fio da semente prometida]] · [[15 - Fios Bíblicos/Fio do servo sofredor|Fio do servo sofredor]] · [[15 - Fios Bíblicos/Fio do rei prometido|Fio do rei prometido]]
`,
  },

  [T + '03 - O batismo']: {
    resumo: 'O que o batismo significa, pra quem já passou pelo batismo e pra quem ainda está pensando nesse passo.',
    texto: `
Talvez você já tenha passado pelo batismo. Talvez esteja pensando nisso, ou ainda nem saiba se quer. Esta lição serve pra todo mundo: mostra o que a Bíblia diz sobre o batismo e por que Jesus pediu que ele fizesse parte da vida de quem o segue.

Muita gente é batizada sabendo que é importante, mas sem entender direito o que está sendo declarado ali. Vale entender antes, ou entender de novo.

## O que o batismo significa

Romanos 6.3-4 dá o sentido principal. Quem é batizado em Cristo é unido à morte dele, como se fosse sepultado com ele, pra que, assim como Jesus ressuscitou, também viva uma vida nova.

A imagem é de enterro e ressurreição. Descer na água mostra a vida antiga ficando pra trás. Sair da água mostra a vida nova começando. Por isso muitas igrejas batizam por imersão, que deixa essa imagem bem visível.

O batismo também é uma declaração pública. Ele mostra pras pessoas algo que Deus fez por dentro e marca a entrada na família da fé. No Novo Testamento, quem cria em Jesus era batizado logo, como em Atos 2.41 e Atos 8.36-38.

## O que salva

A Bíblia coloca a salvação na graça de Deus, recebida pela fé (Efésios 2.8-9). O homem crucificado ao lado de Jesus ouviu a promessa do paraíso sem ter passado pela água (Lucas 23.43).

Por isso o batismo não tem nada de mágico, e ninguém sai da água pronto. Ele marca um começo diante de outras pessoas. Mesmo assim, foi Jesus quem mandou batizar (Mateus 28.19), e quem segue Jesus obedece a ele também nisso.

## O que acontece com quem crê

A Bíblia descreve algumas coisas que passam a ser verdade pra quem confia em Jesus. O batismo aponta pra elas, e elas valem independentemente do que a pessoa sentiu no dia.

Os pecados são perdoados: Colossenses 2.13-14 fala de uma dívida cancelada e pregada na cruz. A pessoa é adotada: João 1.12 diz que quem recebe Jesus ganha o direito de ser filho de Deus. Recebe o Espírito Santo, que Efésios 1.13-14 chama de selo e garantia. E passa a fazer parte de um corpo, a igreja (1 Coríntios 12.13).

Ver [[${T}09 - Minha identidade em Cristo|Minha identidade em Cristo]] e [[14 - Alianças/Nova aliança|Nova aliança]].

## Se você já passou pelo batismo e não sentiu nada

Isso acontece mais do que parece. Tem gente que chora muito e tem gente que sai da água pensando na roupa molhada. A diferença entre essas experiências não muda nada no que Deus fez.

O batismo é um sinal, e um sinal aponta pra um fato. O fato continua de pé, forte ou fraca que tenha sido a emoção. Ver [[${T}01 - Segurança da Salvação|Segurança da salvação]].

## Se você ainda não passou pelo batismo

Não precisa ter pressa nem medo. Se você crê em Jesus e quer segui-lo, o batismo é o passo que ele mesmo pediu. Converse com alguém mais experiente na fé: quem te convidou pro app, o líder da célula ou o pastor da igreja que você frequenta. Conte o que você entende e pergunte o que ainda não está claro. Muitas igrejas têm um tempo de preparo antes, justamente pra isso.

Se você ainda tem dúvidas sobre a própria fé, tudo bem também. Continue lendo, orando e fazendo perguntas. O batismo faz mais sentido quando você sabe a que está dizendo sim.

## Onde os cristãos pensam diferente

Igrejas diferentes batizam de jeitos diferentes, e é bom saber disso pra não estranhar. Algumas batizam por imersão, outras derramando ou aspergindo água. Algumas batizam só quem já professa a fé, outras batizam também os filhos pequenos de famílias cristãs. E cada tradição dá um peso um pouco diferente ao que acontece no batismo.

Se você recebeu o batismo quando era bebê e agora está entendendo a fé, converse com a liderança da igreja que você frequenta agora sobre como ela entende isso, sem pressa.

Essas diferenças são antigas e sérias. Mesmo assim, quase todos concordam no principal: Jesus mandou batizar, o batismo aponta pra união com a morte e a ressurreição dele, e a salvação vem pela graça, por meio da fé. Ver [[05 - Hermenêutica/Analogia da fé|Analogia da fé]], sobre separar o essencial do secundário.

## E depois?

A ordem de Jesus em Mateus 28.19-20 continua depois do batismo: ensinando a obedecer a tudo o que ele mandou. Seguir Jesus envolve aprender a vida toda.

Na prática, isso passa por três coisas: ler a Bíblia com constância, como na leitura do dia aqui na Trilha; orar, assunto da lição [[${T}05 - Oração|Oração]]; e fazer parte de verdade de uma igreja local, assunto da lição [[${T}07 - Igreja e comunhão|Igreja e comunhão]].

## Pra anotar

Se você já passou pelo batismo, escreva em Suas anotações, no fim desta página, como foi: a data, quem estava lá, o que você entendia na hora e o que entende agora. Se ainda não passou, anote as perguntas que você quer levar pra conversar com alguém mais experiente na fé.

## Leia esta semana

Romanos 6.1-14 · Mateus 28.16-20 · Atos 2.36-41 · Colossenses 2.6-15

## Pra ir além

Próxima lição: [[${T}04 - A Bíblia|A Bíblia]]
Acontecimentos: [[12 - Eventos/Crucificação|Crucificação]] · [[12 - Eventos/Ressurreição|Ressurreição]] · [[12 - Eventos/Pentecostes|Pentecostes]]
Temas: [[06 - Estudos Temáticos/Igreja|Igreja]] · [[06 - Estudos Temáticos/Perdão|Perdão]] · [[06 - Estudos Temáticos/Redenção|Redenção]]
Alianças: [[14 - Alianças/Nova aliança|Nova aliança]]
`,
  },

  [T + '04 - A Bíblia']: {
    resumo: 'Como a Bíblia foi escrita, como chegou até nós e por que dá pra confiar no que você lê todo dia.',
    texto: `
Todo dia, aqui no app, você lê um pedaço da Bíblia. Então vale entender que livro é esse, como ele chegou até você e por que dá pra confiar nele. Isso evita dois tropeços comuns no começo: tratar a Bíblia como amuleto, ou largar tudo na primeira pergunta difícil sobre a origem dela.

## Muitos livros, uma só história

A Bíblia reúne 66 livros, escritos por uns quarenta autores, em três línguas, ao longo de mais de mil anos. Tem poesia, lei, história, cartas, profecia, provérbios e visões. Mesmo com tanta variedade, os livros contam uma história só: Deus cria o mundo, o pecado estraga tudo, Deus promete um resgate, esse resgate chega em Jesus, e a história caminha pra um final em que tudo é restaurado.

Essa unidade, costurada por tanta gente em tantos séculos, chama atenção. E a própria Bíblia ajuda a entender a Bíblia: um texto claro ilumina outro mais difícil. Ver [[05 - Hermenêutica/Analogia da fé|Analogia da fé]].

## Quem decidiu quais livros entram

A lista dos livros reconhecidos como Escritura se chama cânone. Circula por aí a ideia de que, séculos depois, um concílio escolheu alguns livros por interesse e jogou os outros fora. A história mostra outro caminho.

Os judeus já tratavam os livros do Antigo Testamento como Palavra de Deus muito antes de Jesus, e o próprio Jesus cita esses livros assim. Com o Novo Testamento, as igrejas dos primeiros séculos foram reconhecendo os textos ligados aos apóstolos, fiéis ao ensino que já tinham recebido e lidos nas reuniões das igrejas em muitos lugares. Quando os concílios trataram do assunto, confirmaram por escrito uma lista que as igrejas já usavam.

Uma curiosidade: as Bíblias católicas e ortodoxas trazem alguns livros a mais no Antigo Testamento. As Bíblias evangélicas seguem a lista dos livros hebraicos.

## Cópias e mais cópias

Pergunta honesta: não existe nenhum original escrito pela mão de Moisés, de Mateus ou de Paulo. O que temos são cópias, feitas à mão ao longo de séculos. Isso é verdade e ninguém precisa esconder.

E isso compromete o texto? A evidência diz que não. Existem milhares de manuscritos do Novo Testamento em grego, muito mais do que de qualquer outro livro da Antiguidade. Comparando uns com os outros, dá pra ver onde um copista errou. A grande maioria das diferenças é pequena: ordem de palavras, grafia, uma linha repetida por cansaço.

Algumas poucas diferenças são maiores, e muitas Bíblias avisam em nota, como no final de Marcos 16 e na história da mulher pega em adultério, em João 8. Nenhuma delas muda uma doutrina central da fé. Existe uma área de estudo só pra isso, a crítica textual, e o resultado desse trabalho dá bons motivos pra confiar no texto que temos.

## Por que existem tantas traduções

A Bíblia foi escrita em hebraico, aramaico e grego. Toda Bíblia em português é tradução, e cada tradução busca um equilíbrio entre seguir de perto as palavras do original e ser fácil de entender hoje.

Aqui no app você pode ler em duas: a NBV, com português do dia a dia, e a Bíblia Livre, que fica mais perto da letra do original. Comparar as duas num trecho difícil costuma ajudar, porque cada uma mostra um lado do texto. A confiança na Bíblia depende da mensagem ter sido preservada, e ela foi. Nenhuma tradução precisa ser perfeita palavra por palavra pra isso.

## Por que confiar

Confiar na Bíblia não pede que você desligue a cabeça. Há descobertas históricas e arqueológicas que confirmam muito do cenário que ela descreve, profecias registradas antes de se cumprirem e uma coerência que impressiona num livro tão longo.

A confiança também vem de outro lugar. Paulo escreveu a Timóteo que toda a Escritura é inspirada por Deus e serve pra ensinar, corrigir e preparar a pessoa pra fazer o bem (2 Timóteo 3.16-17). A Bíblia vem de Deus e trabalha em quem a lê. Quem lê com constância e honestidade percebe isso acontecendo, e essa experiência também conta.

## Como ler

Abrir a Bíblia numa página qualquer pra decidir alguma coisa com pressa costuma dar errado. Ela pede leitura com calma, prestando atenção no que o autor quis dizer pros primeiros leitores antes de perguntar o que isso diz pra você hoje.

Um jeito simples de fazer isso tem três passos: observar o que o texto diz, interpretar o que ele queria dizer e aplicar na sua vida. Pra aprender com calma, comece por [[05 - Hermenêutica/Método Indutivo (OIA)|Método Indutivo (OIA)]].

## Pra anotar

Em Suas anotações, no fim desta página, escreva o que você já sabia sobre como a Bíblia chegou até nós e o que foi novidade. Se ficou alguma dúvida sobre cópias ou traduções, anote também. É normal a dúvida voltar, e ter isso escrito ajuda a conversar com alguém mais experiente na fé.

## Leia esta semana

2 Timóteo 3.14-17 · Salmo 119.89-105 · Lucas 24.25-27 · João 17.17

## Pra ir além

Próxima lição: [[${T}05 - Oração|Oração]]
Temas: [[06 - Estudos Temáticos/Fé|Fé]] · [[06 - Estudos Temáticos/Sabedoria|Sabedoria]]
Pra ler melhor: [[05 - Hermenêutica/Método Indutivo (OIA)|Método Indutivo (OIA)]]
`,
  },

  [T + '05 - Oração']: {
    resumo: 'Orar é conversar com Deus. Como começar, o que fazer quando faltam palavras e quando a resposta não vem.',
    texto: `
Na lição anterior o assunto foi a Bíblia. Agora é a oração, e as duas andam juntas: na Bíblia Deus fala com você, na oração você fala com ele. Sem oração, a fé vira estudo de um livro antigo. Sem a Bíblia, a oração corre o risco de virar conversa com um Deus que a gente mesmo inventou.

## O que é orar

Orar é conversar com Deus sabendo que ele está presente e quer ouvir. Ninguém precisa de palavras bonitas ou de um tom de voz especial. Em Mateus 6.5-7, Jesus critica quem ora pra ser visto e quem repete um monte de palavras achando que assim vai ser mais ouvido.

Deus já sabe do que você precisa antes de você pedir (Mateus 6.8). A oração serve pra você estar com ele, confiar nele e abrir o coração pra ele.

## O Pai Nosso como roteiro

Logo depois, Jesus ensina uma oração curta, em Mateus 6.9-13. Ela começa olhando pra Deus: que o nome dele seja santificado, que o reino dele venha, que a vontade dele seja feita. Depois vêm os pedidos: o pão de cada dia, o perdão das nossas ofensas, assim como perdoamos quem nos ofendeu, e proteção contra a tentação e o mal.

Repare na ordem: primeiro Deus, depois as nossas necessidades. E repare no tamanho. Nada na Bíblia diz que uma oração precisa ser longa pra valer.

Dá pra orar o Pai Nosso palavra por palavra, pensando no que está dizendo. E dá pra usar a mesma sequência com suas palavras: louvar a Deus, pedir que a vontade dele aconteça, pedir o que você precisa hoje, pedir perdão e perdoar, pedir proteção.

## Quando você não sabe o que dizer

Vai ter dia em que você senta pra orar e nada sai, ou só sai um nó na garganta. Romanos 8.26 fala disso: a gente não sabe orar como deveria, e o próprio Espírito Santo intercede por nós com gemidos que nenhuma palavra consegue expressar.

Você não precisa acertar as palavras pra sua oração contar. Um simples "não sei nem o que pedir, mas o Senhor sabe" já é oração.

## Quando a resposta não vem

Uma hora você vai pedir alguma coisa com fé sincera e a resposta não vai vir do jeito que você queria, ou simplesmente não vai vir. Isso não prova que sua fé é fraca nem que existe um pecado escondido. Às vezes vale olhar pro próprio coração, porque Tiago 4.3 fala de pedir com a motivação errada. Mas nem sempre o problema está aí.

Paulo pediu três vezes que Deus tirasse um sofrimento da vida dele, que ele chama de espinho. Deus respondeu que a graça dele bastava e que o poder dele se mostra na fraqueza (2 Coríntios 12.7-9). Deus responde como Pai, que enxerga o que a gente não vê. Isso muda o que você espera da oração, e ela continua valendo muito.

## Criando o hábito sem culpa

Quem tenta criar uma rotina de oração corre o risco de transformar tudo em mais uma obrigação, que gera culpa quando falha. Comece pequeno: poucos minutos, num horário fixo, sem cobrar de você um sentimento específico. Orar sempre importa mais do que orar muito.

Aqui no app, depois de cada leitura, a etapa Orar ajuda a começar, e o que você escreve ali fica guardado só pra você. Voltar depois de algumas semanas e ver o que você pediu, e o que Deus fez com isso, costuma ensinar muito.

## Pra anotar

Em Suas anotações, no fim desta página, escreva como tem sido orar até agora: o que trava, o que ajuda e um pedido que você quer acompanhar nas próximas semanas.

## Leia esta semana

Mateus 6.5-15 · Romanos 8.26-27 · 2 Coríntios 12.7-10 · Salmo 62.5-8

## Pra ir além

Próxima lição: [[${T}06 - O Espírito Santo|O Espírito Santo]]
Temas: [[06 - Estudos Temáticos/Fé|Fé]] · [[06 - Estudos Temáticos/Adoração|Adoração]] · [[06 - Estudos Temáticos/Sabedoria|Sabedoria]]
`,
  },

  [T + '06 - O Espírito Santo']: {
    resumo: 'Quem é o Espírito Santo, o que ele faz em quem crê e como ele ajuda você a ler a Bíblia e a orar.',
    texto: `
Nas duas últimas lições o assunto foi a Bíblia e a oração. Falta apresentar quem está por trás das duas: o Espírito Santo. É ele quem ajuda a entender o que você lê e quem sustenta por dentro a sua conversa com Deus.

## Uma pessoa

Muita gente imagina o Espírito Santo como uma energia, uma força ou uma sensação que aparece em certos momentos. A Bíblia fala dele como pessoa. Ele fala (Atos 13.2), ensina (João 14.26), intercede (Romanos 8.26) e pode ficar triste (Efésios 4.30). Uma energia não fica triste. Uma pessoa fica.

Jesus o chama de outro Consolador (João 14.16), alguém que ficaria com os discípulos como ele mesmo tinha ficado. A fé cristã confessa o Espírito como a terceira pessoa da Trindade, Deus assim como o Pai e o Filho.

## O que ele faz em quem crê

O Espírito dá vida nova a quem estava longe de Deus (Tito 3.5; João 3.5-6). Jesus chamou isso de nascer de novo.

Ele também é um selo (Efésios 1.13-14). Naquele tempo, o selo mostrava a quem uma coisa pertencia e garantia que o combinado seria cumprido. O Espírito em você é a garantia de que Deus vai completar o que prometeu.

E ele produz fruto: amor, alegria, paz, paciência, retidão, bondade, fidelidade, mansidão e domínio próprio (Gálatas 5.22-23). Fruto cresce na árvore aos poucos. Você participa, cuidando da sua vida com Deus, e quem faz crescer é o Espírito.

## Dons

Além do fruto, que todo cristão é chamado a ter, o Espírito dá dons diferentes a cada pessoa, pro bem de toda a igreja (1 Coríntios 12.7-11). Uma pessoa ensina bem, outra cuida, outra serve, outra encoraja.

Aqui cristãos sérios pensam diferente. Algumas igrejas entendem que dons como profecia, cura e línguas continuam hoje do mesmo jeito que no livro de Atos. Outras entendem que esses dons tiveram um papel especial no começo da igreja e depois cessaram, ou hoje funcionam de outro modo. Esta lição não escolhe um lado. Todas essas igrejas afirmam que o Espírito continua agindo na vida de quem crê e na igreja.

## Ele convence

Jesus disse que o Espírito convenceria o mundo do pecado, da justiça e do julgamento (João 16.8). Antes de alguém chegar a Jesus, o Espírito já está trabalhando e mostrando a necessidade de Deus. Se hoje você tem interesse por Jesus, isso também é obra dele.

## O Espírito e a leitura da Bíblia

O mesmo Espírito que inspirou quem escreveu a Bíblia ajuda quem lê hoje. Isso não quer dizer que cada pessoa recebe um significado particular pro texto. O caminho continua sendo observar, interpretar e aplicar, como na lição sobre a Bíblia. O que o Espírito faz é abrir o entendimento e dar vontade de obedecer.

Paulo diz em 1 Coríntios 2.14 que quem não tem o Espírito acha loucura as coisas de Deus e não consegue entendê-las. Por isso faz sentido orar antes de ler, pedindo entendimento. É reconhecer quem ensina de verdade.

## Na prática

Não existe técnica pra sentir mais o Espírito. A Bíblia fala de outro jeito: não abafar o Espírito (1 Tessalonicenses 5.19), não entristecê-lo com uma vida que vai contra quem ele é (Efésios 4.30) e viver guiado por ele (Gálatas 5.16).

Isso tem mais a ver com escolhas de todo dia do que com uma experiência de um momento. Pra quem crê, a presença dele já está garantida. O que muda é o quanto a gente vive de acordo com essa presença.

## Pra anotar

Em Suas anotações, no fim desta página, escreva o que você pensava sobre o Espírito Santo antes desta lição. Depois escolha um fruto de Gálatas 5.22-23 que você quer ver crescendo em você nos próximos meses, e peça isso a Deus.

## Leia esta semana

João 14.15-27 · Gálatas 5.16-25 · Efésios 1.13-14 · 1 Coríntios 12.4-11

## Pra ir além

Próxima lição: [[${T}07 - Igreja e comunhão|Igreja e comunhão]]
Temas: [[06 - Estudos Temáticos/Espírito Santo|Espírito Santo]] · [[06 - Estudos Temáticos/Santidade|Santidade]] · [[06 - Estudos Temáticos/Fé|Fé]]
`,
  },

  [T + '07 - Igreja e comunhão']: {
    resumo: 'A fé em Jesus foi feita pra ser vivida junto com outras pessoas. O que é a igreja, o que esperar dela e como lidar com decepções.',
    texto: `
Até aqui as lições falaram muito da sua relação com Deus: salvação, Jesus, batismo, Bíblia, oração e Espírito Santo. Agora o foco se abre, porque a fé cristã foi pensada pra ser vivida junto com outras pessoas. Deus usa gente pra formar gente, e o nome disso é igreja.

## O que é a igreja

No Novo Testamento, a palavra igreja fala de pessoas. O prédio, a organização e o culto de domingo fazem parte, mas a palavra aponta pra comunidade de quem foi resgatado por Jesus e se reúne em volta dele.

Paulo chama essa comunidade de corpo de Cristo. Jesus é a cabeça e cada pessoa é um membro, com uma função (1 Coríntios 12.12-27). Um corpo não funciona com as partes separadas, e uma mão sozinha, longe do corpo, não sobrevive. Por isso a Bíblia não imagina alguém que ama Jesus e dispensa a igreja.

## Por que a fé não funciona sozinha

Hebreus 10.24-25 pede que os cristãos não deixem de se reunir, como alguns já estavam fazendo, e que se encorajem uns aos outros. Já naquela época tinha gente se afastando, e o texto trata isso como um risco sério.

Boa parte do que a Bíblia pede só dá pra fazer com outras pessoas por perto: amar uns aos outros, servir uns aos outros, perdoar uns aos outros, carregar o peso uns dos outros. Ninguém pratica um "uns aos outros" sozinho no quarto. Na igreja, a fé que começou como convicção pessoal vira convivência.

## O que esperar

É saudável esperar de uma igreja ensino fiel à Bíblia, cuidado, espaço pra servir e amizades de verdade. Perfeição ela não vai ter. A igreja é feita de gente resgatada que ainda está em processo, e isso inclui os líderes.

Vai ter decisão com a qual você não concorda, gente cansada, conflito mal resolvido, alguém que magoa sem querer. Quem entra esperando pessoas prontas se decepciona rápido. Quem entra sabendo que todo mundo ali ainda está sob o cuidado de Deus, inclusive você, consegue ficar.

## Quando alguém da igreja te decepciona

Quando a decepção vier, sumir em silêncio ou expor a pessoa em público costuma piorar tudo. Jesus orienta procurar a pessoa e conversar a sós primeiro (Mateus 18.15). É desconfortável, por isso muita gente evita, mas é o caminho que dá chance real de reconciliação.

Efésios 4.2 pede humildade, gentileza e paciência, com tolerância uns pelos outros por causa do amor. Conviver envolve atrito, e dá pra passar por ele sem desfazer a amizade a cada ferida.

Isso nunca significa aceitar tudo calado. Abuso, manipulação ou qualquer tipo de violência precisam ser levados a sério. Se algo assim acontecer, conte a um adulto de confiança, dentro ou fora da igreja, e procure ajuda.

## Batismo e ceia

Duas práticas marcam a vida da igreja desde o começo. O batismo acontece uma vez e é o sinal público de união com Jesus na morte e na ressurreição dele (Romanos 6.3-4). A ceia do Senhor se repete: o pão e o cálice lembram o corpo de Jesus entregue e o sangue dele derramado, e a igreja celebra junta até ele voltar (1 Coríntios 11.23-26).

As igrejas entendem de formas um pouco diferentes o que acontece na ceia, e cada uma tem seu jeito de celebrar. Todas concordam que ela é celebrada em comunidade e aponta pra Jesus. Se você ainda não participa, pergunte na igreja que você frequenta como ela entende a ceia e quem pode participar.

## Pra anotar

Em Suas anotações, no fim desta página, escreva como está sua relação com uma igreja local. Se você já faz parte de uma, o que te ajuda e o que te incomoda. Se ainda não faz, o que está te impedindo de procurar.

## Leia esta semana

1 Coríntios 12.12-27 · Hebreus 10.19-25 · Efésios 4.1-16 · Atos 2.42-47

## Pra ir além

Próxima lição: [[${T}08 - Pecado, arrependimento e perdão|Pecado, arrependimento e perdão]]
Temas: [[06 - Estudos Temáticos/Igreja|Igreja]] · [[06 - Estudos Temáticos/Amor de Deus|Amor de Deus]] · [[06 - Estudos Temáticos/Reino de Deus|Reino de Deus]]
`,
  },

  [T + '08 - Pecado, arrependimento e perdão']: {
    resumo: 'O que fazer quando você erra de novo: o que é pecado, como se arrepender e por que o perdão de Deus alcança até a queda repetida.',
    texto: `
Você vai errar de novo. Todo cristão erra. O jeito como você lida com isso mostra muito do que você entendeu sobre Jesus. A primeira lição já tocou nesse assunto, e agora é hora de olhar pra ele de frente.

## O que é pecado

É fácil pensar em pecado como uma lista de coisas proibidas. A Bíblia vai mais fundo. Pecado é tudo o que se afasta do caráter e da vontade de Deus, em pensamento, palavra, atitude ou omissão. Romanos 3.23 diz que todos pecaram e estão longe da glória de Deus.

Uma das palavras que a Bíblia usa pra pecado, na língua original, tem a ideia de errar o alvo. Deus criou você pra refletir quem ele é, e o pecado desvia disso. Por isso orgulho escondido, indiferença com quem sofre e amor colocado no lugar errado também são pecado, tanto quanto as coisas que todo mundo vê.

Entender isso evita dois enganos: achar que pecado é só o que está na lista, ou achar que está tudo bem porque você não faz as coisas mais óbvias dela.

## Culpa e vergonha

Culpa é perceber que você fez algo errado. Vergonha é sentir que você é algo errado. A culpa aponta pra uma ação e pode ser resolvida com perdão. A vergonha ataca a pessoa inteira e paralisa, porque parece que não tem conserto.

O evangelho, a boa notícia do que Jesus fez, cuida das duas. A culpa real é perdoada. E a vergonha perde força, porque em Cristo o seu pior momento deixa de definir quem você é, assunto da próxima lição. Quem confunde as duas costuma cair no desespero, achando que não tem jeito, ou tenta abafar a vergonha sem nunca tratar a culpa de verdade.

## Arrependimento de verdade

Arrependimento bíblico vai além de ficar mal por ter sido pego. Em 2 Coríntios 7.10, Paulo fala de dois tipos de tristeza. A tristeza segundo Deus leva ao arrependimento e à salvação. A tristeza do mundo leva à morte.

A diferença está pra onde a tristeza olha. A tristeza segundo Deus se volta pra ele e muda a direção da vida. A tristeza do mundo fica olhando pra si mesma e termina em autopunição ou em negação, sem sair do lugar.

Arrependimento tem três partes: admitir o erro sem desculpa, mudar de direção de fato e voltar a confiar em Deus em vez de afundar. E ele acontece muitas vezes, a vida inteira.

## Quando o mesmo pecado volta

1 João 1.9 traz uma promessa central: se confessarmos os nossos pecados, Deus é fiel e justo pra perdoar os nossos pecados e nos limpar de toda maldade. Repare no que o texto deixa de fora. Ele não coloca limite de tentativas nem exige garantia de que você nunca mais vai falhar. Ele pede confissão sincera.

Isso vale também pro pecado que insiste em voltar. A mesma promessa cobre a primeira queda e a vigésima.

Ao mesmo tempo, graça e descuido não combinam. Em Romanos 6.1-2, Paulo pergunta se devemos continuar pecando pra que a graça aumente, e responde: de jeito nenhum.

O caminho é confessar logo, sem enrolar e sem drama, pedir ajuda concreta a alguém maduro na fé quando o padrão não sai sozinho, e seguir em frente.

## Nem desespero, nem descaso

Quem cai no desespero, na prática, acha que o próprio pecado é maior do que a cruz. Quem cai no descaso, na prática, acha que o próprio pecado é pequeno demais pra importar. Os dois erram na mesma coisa, de lados opostos: diminuem o que Jesus fez.

Levar o pecado a sério e levar o perdão a sério andam juntos. É o perdão que permite olhar pro próprio pecado sem se destruir.

## Pra anotar

Em Suas anotações, no fim desta página, pense num pecado que costuma voltar na sua vida. Dê o nome dele com honestidade, escreva o que costuma levar à queda e um passo concreto pra, da próxima vez, confessar logo e pedir ajuda. Se preferir, use só uma palavra que você entenda.

## Leia esta semana

Romanos 3.21-26 · 2 Coríntios 7.8-11 · 1 João 1.5 a 2.2 · Salmo 51

## Pra ir além

Próxima lição: [[${T}09 - Minha identidade em Cristo|Minha identidade em Cristo]]
Temas: [[06 - Estudos Temáticos/Pecado|Pecado]] · [[06 - Estudos Temáticos/Arrependimento|Arrependimento]] · [[06 - Estudos Temáticos/Perdão|Perdão]] · [[06 - Estudos Temáticos/Graça|Graça]]
`,
  },

  [T + '09 - Minha identidade em Cristo']: {
    resumo: 'Quem você passa a ser quando recebe o perdão de Deus: da família de Deus, com a sentença de justo, nova criação e morada do Espírito.',
    texto: `
A lição anterior falou de pecado e perdão. Esta fala de quem você passa a ser quando recebe esse perdão. Parece um assunto mais leve, mas é base pra tudo: o que você acredita sobre quem você é define como você reage quando cai, quando sofre rejeição, quando fracassa.

## Adoção na família de Deus

Efésios 1.5 diz que o plano de Deus sempre foi nos adotar na família dele, por meio de Jesus Cristo. No mundo romano, a adoção era um ato legal e definitivo. O adotado passava a ter os mesmos direitos de um filho de sangue, inclusive a herança.

Romanos 8.15 completa: você não recebeu um espírito que te faz viver com medo, como escravo. Recebeu o Espírito que te faz filho ou filha, e por isso pode chamar Deus de Aba, Pai. Você chega perto de Deus como alguém que já tem lugar na casa. Ninguém precisa bater ponto pra continuar sendo da família.

## A sentença de justo

Justificação é uma palavra de tribunal e quer dizer ser declarado justo. Romanos 5.1 diz que, justificados pela fé, temos paz com Deus por meio de Jesus.

Essa sentença já foi dada. Ela se apoia na justiça de Cristo colocada na sua conta, e o seu histórico fica fora dessa conta. É a mesma verdade da primeira lição vista de outro ângulo: a segurança responde onde você está, a identidade responde quem você é. Ver [[${T}01 - Segurança da Salvação|Segurança da salvação]].

## Nova criação

2 Coríntios 5.17 diz que, quando alguém está em Cristo, se torna uma pessoa totalmente nova por dentro: as coisas antigas já passaram e começou uma nova vida. A luta contra o pecado continua, como a lição anterior mostrou, mas algo mudou por dentro. A sua pior versão e o seu passado deixam de definir quem você é.

Colossenses 3.1-3 usa outra imagem: sua vida agora está escondida em Cristo e em Deus. O centro de quem você é passou a estar nele.

## Morada do Espírito

O Espírito Santo mora em quem crê (1 Coríntios 6.19). Sua identidade vai além de um título dado de longe, porque Deus está presente em você. E Romanos 8.16 diz que o próprio Espírito confirma, junto com o seu espírito, que você é filho ou filha de Deus.

## Onde a gente costuma apoiar quem é

Muita gente constrói a própria identidade em cima de três coisas, quase sempre sem perceber.

Uma é o desempenho: notas, conquistas, seguidores, aparência. Quem vive assim está sempre sendo avaliado e trata cada erro como ameaça.

Outra é a opinião dos outros. Quem vive assim entrega o próprio valor pra quem estiver por perto e fica refém de curtida, elogio e crítica.

A terceira é o passado. Quem vive assim carrega uma versão antiga de si como se fosse definitiva e não consegue acreditar que mudou.

As três têm o mesmo problema: sobem e descem, e por isso nunca dão descanso. A identidade em Cristo foi dada por Deus, e ninguém consegue tirar, rever ou dar nota pra ela.

## Viver a partir disso

Existe diferença entre viver tentando provar quem você é e viver a partir de algo que já foi dado. O primeiro jeito gera ansiedade disfarçada de esforço espiritual. O segundo gera obediência que nasce da gratidão, porque não sobra nada pra provar.

O esforço e a disciplina continuam. O que muda é o motivo por trás deles, como a primeira lição já tinha mostrado.

## Pra anotar

Em Suas anotações, no fim desta página, escreva em que você tem apoiado quem você é: desempenho, opinião dos outros ou passado. Depois escreva como seria, amanhã, lembrar que você é filho ou filha de Deus, que já recebeu a sentença de justo e que é nova criação.

## Leia esta semana

Efésios 1.3-14 · Romanos 8.14-17 · 2 Coríntios 5.17-21 · Colossenses 3.1-4

## Pra ir além

Próxima lição: [[${T}10 - Tentação e batalha espiritual|Tentação e batalha espiritual]]
Temas: [[06 - Estudos Temáticos/Graça|Graça]] · [[06 - Estudos Temáticos/Justificação|Justificação]] · [[06 - Estudos Temáticos/Redenção|Redenção]]
Ver também: [[${T}01 - Segurança da Salvação|Segurança da salvação]]
`,
  },

  [T + '10 - Tentação e batalha espiritual']: {
    resumo: 'Como a tentação funciona, por que ser tentado é diferente de pecar e o que a Bíblia chama de batalha espiritual.',
    texto: `
Com a identidade firmada em Cristo, dá pra olhar com calma pra um assunto que a lição sobre pecado só começou: como a tentação funciona e o que a Bíblia chama de batalha espiritual. Tem gente que trata esse tema com exagero e tem gente que trata com descuido. Aqui a ideia é olhar com os pés no chão.

## Como a tentação funciona

Tiago 1.14-15 descreve o processo. Cada pessoa é tentada quando é atraída e seduzida pelo próprio desejo. Esse desejo, quando é alimentado, gera o pecado. E o pecado, quando cresce, gera morte.

É uma sequência: atração, desejo alimentado, decisão, ação, consequência. Saber disso já ajuda, porque mostra que existe espaço entre a primeira atração e a queda. Dá pra interromper no meio.

Tiago também mostra que a tentação encontra apoio em desejos que já existem dentro da gente. Por isso conhecer o próprio coração faz parte de resistir.

## Ser tentado e pecar são coisas diferentes

Muita gente carrega culpa sem necessidade aqui. Hebreus 4.15 diz que Jesus foi tentado em tudo, como nós, mas sem pecado. Se ser tentado já fosse pecado, Jesus teria pecado, e o texto diz que não.

O pecado começa quando a pessoa aceita e alimenta a tentação. Um pensamento errado que aparece é tentação. Ficar remoendo, imaginando e planejando já é dizer sim. Jesus fala disso em Mateus 5.28, sobre olhar alguém com desejo no coração. Viver apavorado só porque uma tentação apareceu confunde as coisas, e brincar com ela também.

## Uma promessa pra hora difícil

1 Coríntios 10.13 diz que as tentações que você enfrenta são as mesmas que os outros enfrentam. Deus não vai deixar a tentação ficar tão forte que você não consiga enfrentar, e ele dá forças pra suportar. A Bíblia Livre diz que, junto com a tentação, ele "também dará a saída".

Três coisas aqui. O que você enfrenta é comum, outras pessoas passam por isso. Existe um limite, e quem garante é Deus. E sempre existe uma saída, mesmo quando você ainda não viu. A promessa não dispensa o esforço de resistir, mas derruba a mentira de que você enfrenta, sem ninguém do lado, um teste que ninguém nunca enfrentou.

## A armadura de Deus no contexto

Efésios 6.10-18 fala da armadura de Deus e muitas vezes é lido sozinho, como um manual de guerra espiritual. Olha o que vem antes: Paulo passou os capítulos anteriores falando de unidade na igreja, de casamento, de pais e filhos, de trabalho. A armadura aparece como proteção pra viver essas relações do dia a dia com integridade.

O texto diz que a nossa luta não é contra carne e sangue. Ou seja, ela não se vence atacando pessoas. As peças da armadura são a verdade, a justiça, a paz, a fé, a salvação e a Palavra de Deus. Todas falam de caráter e do evangelho, e nenhuma é fórmula ou ritual.

## Nem tudo é ataque espiritual

Aqui é preciso cuidado, porque o exagero machuca gente. A batalha espiritual é real, e a Bíblia fala de um inimigo que quer enganar e destruir (1 Pedro 5.8). Só que nem todo pecado repetido, todo cansaço ou toda briga em casa é ataque direto do diabo.

Muita coisa que parece batalha espiritual é hábito antigo, ferida que nunca foi cuidada, ansiedade, falta de sono ou consequência de escolhas. Jogar tudo na conta de um inimigo espiritual pode virar desculpa pra não cuidar da raiz do problema. Às vezes essa raiz pede ajuda de alguém maduro da igreja, e às vezes de um profissional de saúde, como um psicólogo ou um médico. Buscar essa ajuda também é cuidar da vida que Deus te deu.

## Como resistir na prática

Resistir começa antes da tentação chegar. Conheça seus pontos fracos, fuja das situações que costumam levar à queda e guarde na memória alguma verdade da Bíblia pra responder ao que a tentação promete.

Quando Jesus foi tentado no deserto, respondeu cada vez com a Escritura (Mateus 4.1-11). Ele conhecia a Palavra o bastante pra lembrar dela sob pressão. E contar pra alguém de confiança o que você está enfrentando tira muito da força que a tentação tem no escondido.

## Pra anotar

Em Suas anotações, no fim desta página, pense numa tentação que costuma voltar. Escreva o que costuma disparar, em que momento dá pra interromper e um versículo que você quer decorar pra essa hora.

## Leia esta semana

Tiago 1.12-15 · Hebreus 4.14-16 · 1 Coríntios 10.6-13 · Efésios 6.10-18

## Pra ir além

Próxima lição: [[${T}11 - Mordomia|Tempo, dinheiro e talentos]]
Temas: [[06 - Estudos Temáticos/Pecado|Pecado]] · [[06 - Estudos Temáticos/Santidade|Santidade]] · [[06 - Estudos Temáticos/Sofrimento|Sofrimento]]
`,
  },

  [T + '11 - Mordomia']: {
    nome: '11 - Tempo, dinheiro e talentos',
    resumo: 'Seu tempo, seu dinheiro, seu corpo e seus talentos foram confiados por Deus. Como cuidar bem disso no dia a dia.',
    texto: `
Depois de falar de tentação, a lição volta pro dia a dia: o que fazer com o tempo, o dinheiro, o corpo e os talentos que você tem. A Bíblia tem uma palavra antiga pra isso, mordomia. A ideia é simples de entender e desafiadora de viver: tudo isso foi confiado a você por Deus.

## Quem cuida e quem é dono

Mordomo, na Bíblia, é quem cuida dos bens de outra pessoa. O Salmo 24.1 dá a base: a terra e tudo o que existe nela pertencem ao Senhor. Isso inclui o dinheiro que você recebe, as horas do seu dia, o seu corpo e aquilo que você sabe fazer bem.

Você usa essas coisas e toma decisões sobre elas, e o dono continua sendo Deus. Em Mateus 25.14-30, Jesus conta a história de servos que receberam valores diferentes pra administrar. Cada um foi avaliado pelo cuidado com o que recebeu. A pergunta muda de "quanto disso é meu?" pra "como estou cuidando do que Deus me confiou?".

## Tempo

Todo mundo tem as mesmas 24 horas, e é fácil deixar elas escorrerem. O Salmo 90.12 pede que Deus nos ensine a contar os nossos dias, pra que o coração fique sábio. Efésios 5.15-16 pede atenção ao jeito de viver, aproveitando bem o tempo.

Nenhum dos dois textos elogia agenda lotada. Eles pedem intenção. De vez em quando, olhe pra sua semana, incluindo o tempo de tela, e pergunte se ela mostra o que você diz que é mais importante: Deus, as pessoas, os estudos, o descanso.

## Corpo e trabalho

1 Coríntios 6.19-20 diz que o seu corpo é morada do Espírito Santo, que Deus comprou você por um preço alto e que você deve glorificar a Deus com o corpo. Isso alcança muita coisa: sono, alimentação, saúde, sexualidade e o jeito como você trata o próprio corpo e o dos outros.

Sobre trabalho, Colossenses 3.23 orienta fazer tudo de coração, como quem trabalha pro Senhor. Isso vale pro estágio, pro emprego, pra prova da escola ou da faculdade e pra louça em casa. Na Bíblia, um trabalho comum feito com integridade honra a Deus tanto quanto uma função na igreja.

## Talentos

Cada pessoa recebeu habilidades diferentes: música, cuidado com gente, organização, desenho, facilidade com números ou com palavras. 1 Pedro 4.10 pede que cada um use o dom que recebeu pra servir os outros, como quem administra bem a graça de Deus. Descobrir o que você faz bem e colocar isso a serviço de alguém também é mordomia.

## Dinheiro e generosidade

2 Coríntios 8 e 9 são os capítulos do Novo Testamento que mais falam sobre doar. Paulo estava juntando uma oferta pros cristãos pobres de Jerusalém. Ele elogia as igrejas da Macedônia, que deram até além do que podiam, por vontade própria (2 Coríntios 8.3). E resume em 9.7: cada um deve resolver por si quanto vai dar, sem ninguém ser forçado, porque Deus ama os que dão com alegria.

No Novo Testamento, a generosidade nasce da gratidão. Ela é voluntária, alegre e proporcional ao que a pessoa recebe. Mesmo quem ganha pouco, ou ainda depende dos pais, já pode começar a praticar.

## E o dízimo?

Aqui cristãos comprometidos com a Bíblia pensam diferente. Alguns entendem que o dízimo, a entrega de dez por cento que aparece no Antigo Testamento, continua valendo como padrão pra hoje. Outros entendem que ele fazia parte da lei dada a Israel e aponta pra um princípio maior de generosidade, sem uma porcentagem fixa. Esta lição não decide isso por você. Converse com sua igreja sobre como ela entende o assunto.

Seja qual for a posição, o Novo Testamento deixa clara a direção: dar com generosidade, por vontade própria, com alegria e de acordo com o que você recebe, como parte de uma igreja local.

## Um alerta

Existe um ensino que circula em algumas igrejas e na internet, a teologia da prosperidade. Ele diz que fé forte ou ofertas grandes funcionam como investimento, e que Deus devolve em dinheiro, saúde e sucesso. Esse ensino vira a mordomia de cabeça pra baixo: Deus passa a ser um meio pra conseguir coisas, quando ele é o dono a quem a gente serve.

A generosidade bíblica responde com gratidão a quem deu tudo primeiro (2 Coríntios 8.9), sem esperar retorno calculado. Falar de oferta é normal numa igreja. O sinal de alerta aparece quando a oferta vira promessa de lucro.

## Pra anotar

Em Suas anotações, no fim desta página, escolha uma área entre tempo, dinheiro, corpo e talentos em que você sente que tem cuidado mal do que Deus te confiou. Escreva um passo concreto pra começar a mudar nas próximas semanas.

## Leia esta semana

Salmo 24.1-6 · Mateus 25.14-30 · 2 Coríntios 8.1-15 · 2 Coríntios 9.6-15

## Pra ir além

Próxima lição: [[${T}12 - Testemunho e missão|Testemunho e missão]]
Temas: [[06 - Estudos Temáticos/Dinheiro e posses|Dinheiro e posses]] · [[06 - Estudos Temáticos/Sabedoria|Sabedoria]] · [[06 - Estudos Temáticos/Justiça|Justiça]] · [[06 - Estudos Temáticos/Amor de Deus|Amor de Deus]]
`,
  },

  [T + '12 - Testemunho e missão']: {
    resumo: 'Como falar da sua fé com naturalidade, sem vergonha e sem arrogância, começando pelas pessoas que já estão perto de você.',
    texto: `
Esta é a última lição porque depende de todas as outras. Quem tenta falar da fé sem ter entendido a salvação, a Bíblia e a igreja costuma ficar sem graça ou soar arrogante, e as duas coisas afastam as pessoas.

## Por que contar

Se a fé cristã fosse só um jeito de melhorar a própria vida, guardar pra si seria uma escolha pessoal. Ela anuncia uma notícia: Jesus morreu e ressuscitou, isso aconteceu na história e diz respeito a todo mundo. Boa notícia guardada perde o sentido.

Tem também uma promessa antiga. Deus disse a [[11 - Pessoas/Abraão|Abraão]] que todos os povos da terra seriam abençoados por meio dele (Gênesis 12.3). Essa promessa atravessa a Bíblia até a multidão de todas as nações em Apocalipse 7.9. Ver [[15 - Fios Bíblicos/Fio das nações|Fio das nações]] e [[06 - Estudos Temáticos/Missão|Missão]].

## O que atrapalha

Testemunho não tem nada a ver com técnica de venda, com ganhar discussão ou com decorar um roteiro pra abordar desconhecidos. Às vezes uma conversa com alguém que você nem conhece faz sentido, mas esse está longe de ser o único jeito.

Testemunhar também não depende de convencer. Em Atos 17, Paulo fala em Atenas e o resultado é misturado: alguns zombam, outros dizem que querem ouvir mais depois, e alguns creem. O texto trata isso como normal.

## O que é testemunhar

Testemunha é quem conta o que viu e viveu. Você não precisa ser especialista pra contar o que Jesus fez na sua vida. E dizer "não sei responder isso, mas vou pesquisar e te falo" é uma resposta honesta.

1 Pedro 3.15 mostra o jeito. Na Bíblia Livre, o texto pede prontidão pra responder com mansidão e respeito a quem pedir a razão da esperança que temos. Repare em três detalhes. O texto espera que alguém pergunte, ou seja, a vida do cristão desperta curiosidade. Fala de razão, então vale entender no que você crê. E define o tom: mansidão e respeito, sem agressividade e sem ar de superior.

## O que costuma abrir a conversa

Muitas vezes a conversa começa com o jeito como você lida com um problema, com dinheiro, com a liderança num grupo, com o próprio erro.

Em Mateus 5.14-16, Jesus diz que somos a luz do mundo e que a nossa luz deve brilhar diante das pessoas, pra que vejam o bem que fazemos e louvem o Pai. É a mesma imagem do fogo que acompanha a sua ofensiva aqui no app. Primeiro as pessoas veem, depois perguntam.

As palavras continuam necessárias. Uma vida diferente sem explicação nenhuma faz as pessoas admirarem você, e Deus fica de fora. As duas coisas andam juntas.

## Conversando com quem pensa diferente

Três hábitos evitam a maioria dos desastres.

Pergunte antes de responder. Muita objeção que parece intelectual tem uma história por trás. Às vezes, atrás de um "não acredito em Deus" existe uma decepção com uma igreja ou uma perda que doeu. Responder o argumento sem ouvir a história erra o alvo.

Admita o que você não sabe. Ninguém tem resposta pronta pra todo sofrimento, pra todo texto difícil do Antigo Testamento ou pra tudo o que já foi feito em nome do cristianismo. Fingir que tem acaba com a sua credibilidade mais rápido do que qualquer objeção.

Não defenda o indefensável. Quando alguém aponta uma hipocrisia real na igreja, concordar é mais honesto e ajuda mais do que arrumar desculpa.

## Sua parte e a parte de Deus

Em 1 Coríntios 3.6-7, Paulo diz que ele plantou, Apolo regou, mas quem fez crescer foi Deus.

Isso tira um peso das costas. Sua parte é ser fiel: viver com integridade, estar disponível e falar quando surgir a chance. A resposta da outra pessoa fica entre ela e Deus. Essa divisão protege de dois erros: a culpa por quem ainda não creu e a pressão pra forçar alguém a tomar uma decisão.

## Comece por perto

Missão às vezes parece coisa de outro país. Ela também acontece onde você já está: na escola, na faculdade, no trabalho, em casa, com os amigos que te conheceram antes e agora.

Pense em três a cinco pessoas próximas e ore por elas com frequência. Parece simples, e é o passo que mais gente pula.

## Pra anotar

Em Suas anotações, no fim desta página, escreva o nome dessas pessoas. Depois escreva sua história em três partes: como era antes, o que aconteceu e o que mudou. Se você cresceu na igreja, conte como a fé foi ficando sua. Use palavras normais, do jeito que você contaria pra um amigo, e leia em voz alta. Ter isso organizado na cabeça deixa a conversa muito mais natural quando ela aparecer.

## Leia esta semana

1 Pedro 3.13-17 · Atos 17.16-34 · Mateus 5.13-16 · Colossenses 4.2-6 · Romanos 10.9-15

## Pra ir além

Você chegou ao fim dos Primeiros passos. Continue com a leitura do dia na Trilha e explore as Conexões no Explorar, os fios que atravessam a Bíblia.
Temas: [[06 - Estudos Temáticos/Missão|Missão]] · [[06 - Estudos Temáticos/Esperança|Esperança]] · [[06 - Estudos Temáticos/Igreja|Igreja]]
Conexões: [[15 - Fios Bíblicos/Fio das nações|Fio das nações]]
Acontecimentos: [[12 - Eventos/Pentecostes|Pentecostes]] · [[12 - Eventos/Missão aos gentios|Missão aos gentios]]
`,
  },
};

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const semNumero = (nome) => nome.replace(/^\d+\s*-\s*/, '');

function linha(texto) {
  return esc(texto)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, id, rotulo) => {
      const alvo = id.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      return '<a class="link-nota" href="#/nota/' + encodeURIComponent(alvo) + '" data-nota="' + esc(alvo) + '">' + rotulo + '</a>';
    });
}

export function montarHtml(nome, texto) {
  const blocos = texto.trim().split(/\n\s*\n/);
  return '<h1>' + esc(semNumero(nome)) + '</h1>\n' + blocos.map((b) => {
    const t = b.trim();
    if (t.startsWith('## ')) return '<h2>' + linha(t.slice(3)) + '</h2>';
    return '<p>' + t.split('\n').map(linha).join('<br>') + '</p>';
  }).join('\n');
}

const textoPlano = (html) => html.replace(/<[^>]+>/g, ' ')
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

// Troca o texto das lições no conteúdo e acerta links, busca e "aparece também em".
export function aplicarPrimeirosPassos(dados) {
  const faltando = [];
  let trocadas = 0;
  for (const [id, licao] of Object.entries(LICOES)) {
    const n = dados.notas[id];
    if (!n) { faltando.push(id); continue; }
    if (licao.nome) n.nome = licao.nome;
    n.sub = 'Primeiros passos';
    n.resumo = licao.resumo;
    n.html = montarHtml(n.nome, licao.texto);
    n.t = semAcento(n.nome + ' ' + textoPlano(n.html));

    const novos = [...new Set([...n.html.matchAll(/data-nota="([^"]+)"/g)].map((m) => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')))];
    for (const alvo of novos) if (!dados.notas[alvo]) faltando.push(id + ' -> ' + alvo);
    if (Array.isArray(n.links)) {
      for (const antigo of n.links) {
        const a = dados.notas[antigo];
        if (a && Array.isArray(a.backlinks) && !novos.includes(antigo)) a.backlinks = a.backlinks.filter((b) => b !== id);
      }
      n.links = novos;
    }
    for (const alvo of novos) {
      const a = dados.notas[alvo];
      if (a && Array.isArray(a.backlinks) && !a.backlinks.includes(id)) a.backlinks.push(id);
    }
    trocadas++;
  }
  return { trocadas, faltando };
}
