# Cartas e álbuns: o sistema de ponta a ponta

Especificação do que dá, guarda e mostra as cartas colecionáveis. A arte das cartas (desenho,
moldura, brilho, verso, a animação do baú) mora na peça `src/sob-demanda/cartas.js`, feita em
paralelo; aqui fica o sistema em volta dela. Decisões do dono que valem para tudo:

- oração e escrita nunca dão prêmio;
- não há placar nem comparação entre pessoas (nem raridade dos amigos);
- faltar um dia não gera culpa, e nada expira;
- nada é pago, não há moeda e não há como comprar sorteio; as chances são públicas;
- nada premia spam (mandar convites, postar);
- evento de grupo não revela quem participou ou não.

Cada seção diz o que acontece, as funções que fazem isso e o teste que confere cada uma.
"teste.mjs" é a seção "cartas e álbuns" (unitário, sem navegador) e as partes de contas e do
servidor do cofre; "teste-bau" é `ferramentas/teste-bau.mjs` (Chrome sem interface, servidor
próprio); "simulação" é `ferramentas/simular-cartas.mjs`, que roda a regra de verdade.

Onde mora cada coisa:

| Arquivo | O que tem | Onde roda |
|---|---|---|
| `conteudo/cartas/indice.json` | o catálogo (rascunho) | build |
| `ferramentas/cartas-catalogo.mjs` | conferência do catálogo e esqueleto do sorteio | build e teste |
| `src/app/02-estado.js` | `E.cartas`, `limparCartas`, `fundirCartas` | index.html e servidor |
| `src/app/02b-jogo.js` | `CC.pedirCartas`, `CC.acertarCartas`, `CC.albunsDeCartas`, troféus | index.html |
| `src/app/03-trilha.js` | a tela do baú | index.html |
| `src/app/07-perfil.js` | a entrada no Perfil, `CC.vistaAlbum`, Troféus | index.html |
| `src/sob-demanda/cartas-regras.js` | o sorteio, as fontes, o livro-caixa, a Glória, o resumo, `CC.cartasEmDia` | peça sob demanda |
| `src/sob-demanda/album.js` e `.css` | o catálogo inteiro, o álbum, a carta grande, "O que pode vir", as revelações | peça sob demanda |
| `src/sob-demanda/cartas.js` e `.css` | a arte (outro agente) | peça sob demanda |
| `contas.mjs`, `servidor.mjs` | as fontes que só o servidor confirma | servidor |

## 1. Catálogo e álbuns

- Álbuns de 13 cartas. Os 4 de lançamento, na ordem: Heróis da fé, Lugares, Objetos, Milagres.
- **A raridade não é da carta, é da cópia recebida**: toda carta de álbum existe em Linho, Bronze,
  Prata, Ouro e Glória. A coleção vai se enchendo de versões ao longo dos anos.
- Cada álbum tem uma **capa**, a carta-tema: Heróis da fé, "Nuvem de testemunhas" (Hebreus 12.1);
  Lugares, Jerusalém; Objetos, a Arca da Aliança; Milagres, o túmulo vazio. A capa sai em todas as
  versões, como as outras. Jesus e Deus não são carta.
- `conteudo/cartas/indice.json`: `{ albuns: [{ id, nome, lancadoEm, capa, especial? }], cartas: [...] }`.
  Cada carta: `id` (minúsculas e hífen, estável para sempre: é ele que fica no estado de quem
  recebeu), `album`, `numero` (1 a 13), `titulo`, `referencia` ("Livro cap.vers", o formato de
  `CC.lerRef`), `voceSabia` (uma linha, fato conferível na referência), `link` (rota de mapa,
  atlas ou parábola), `desenho` (a chave do desenho na peça de arte; sem ele, o próprio id) e
  `rascunho: true` até a revisão.
- Conjuntos especiais (`especial: true`), fora do sorteio e das proteções, com raridade fixa por
  carta: **Semeadores** (5 cartas por amigos que vieram pelo convite, seção 3) e **Boas-vindas**
  (1 carta Linho para quem chegou por um convite).
- O build confere tudo (`validarCatalogo`) e para se algo estiver errado: álbuns de 13, datas de
  lançamento válidas e em ordem, capa do próprio álbum, ids únicos, raridade só nos especiais,
  referência que existe na NBV do repositório, link com destino publicado, sem travessão.
  No `index.html` vai só o esqueleto do sorteio (`window.CARTAS_INDICE`, cerca de 1,2 KB); o
  catálogo inteiro entra na peça `album`.
- Carta sem desenho ainda: a miniatura vira a silhueta da raridade (sem texto), e a revelação e a
  carta grande caem numa carta de texto (moldura da raridade, título, "Você sabia?", referência,
  verso com a marca). A arte chega depois pelo `desenho`/id, sem mudar nada aqui.

| Função | Teste |
|---|---|
| `validarCatalogo(cat, raiz)` | teste.mjs: o catálogo confere; acusa id repetido, contagem errada, lançamento fora de ordem e raridade fixa em carta de álbum; as capas pedidas; tudo rascunho |
| `esqueletoDoCatalogo(cat)` | teste.mjs: o esqueleto do index.html é o do catálogo; os textos e a regra não estão no index |
| `R.albuns(hoje)`, `R.especiais()`, `R.carta(id)` | teste.mjs: 4 álbuns de 13 e os especiais com raridade fixa |
| `paraArte(id, raridade)`, `temArte(carta)` (album.js) | teste-bau: a carta com desenho vem pela arte; a sem desenho vira carta de texto, sem erro |

### Catálogo que cresce

O número de cartas não depende do número de baús: com as outras fontes, um leitor regular recebe
uns 75 sorteios no primeiro ano. Por isso o catálogo cresce:

- qualquer número de álbuns de 13, cada um com `lancadoEm`, na ordem de lançamento;
- um álbum com `lancadoEm` no futuro já pode estar no catálogo: entra no sorteio no dia dele;
- quem já tinha começado recebe, no primeiro sorteio depois do lançamento, uma carta nova do álbum
  novo (`R.cartaDoSorteio`); daí em diante ele é mais um álbum com viés para carta nova;
- nada no estado muda: as cópias de antes ficam como estavam, a fusão e o Zerar valem igual.

Proposta de álbuns futuros (13 cartas cada, a capa entre parênteses; a escrever e revisar):

| Álbum | Capa | Exemplos de cartas |
|---|---|---|
| Parábolas | O bom samaritano (Lucas 10.33-34) | o grão de mostarda, a ovelha perdida, a casa na rocha, os talentos |
| Profetas | A brasa nos lábios de Isaías (Isaías 6.6-7) | Jeremias no poço, Ezequiel e os ossos secos, Jonas em Nínive, Amós e o prumo |
| Mulheres da fé | Débora sob a palmeira (Juízes 4.4-5) | Ana no templo, Abigail, Maria de Betânia, Lídia, Priscila |
| Reis e reinos | O templo de Salomão (1 Reis 6.14) | Saul ungido, Josias e o livro achado, Ezequias e o túnel, Neemias e o muro |
| Criação | A luz (Gênesis 1.3) | o firmamento, os mares, as estrelas, os animais, o descanso do sétimo dia |
| Apóstolos | Pentecostes (Atos 2.3-4) | Pedro na água, Tomé, Paulo em Damasco, João em Patmos, Barnabé |

As cartas novas não podem repetir as de lançamento (a conferência pega id repetido; título e
tema são revisão).

## 2. Fontes de cartas (o modelo genérico)

Toda carta vem de uma **fonte**. Cada fonte tem uma regra (quando dispara), um prêmio e uma **chave
de evento** que só paga uma vez:

- `carta`: um sorteio (seção 4);
- `gloria`: uma versão Glória para escolher (seção 11);
- `especial`: uma carta fixa de um conjunto especial.

O livro-caixa `E.cartas.eventos[chave]` guarda o que cada evento pagou. Ele fica fora do
"Zerar progresso" e se funde por chave entre aparelhos, então o mesmo evento nunca paga duas vezes
e o que ele pagou nunca muda.

- `R.FONTES`: a lista, cada fonte com `ativa`, `premio` e, quando sai do estado ou do servidor,
  `detectar(e, ctx)`. **Todas ligadas** (o dono aprovou a lista da seção 3 em 22/10). Desligar uma
  é trocar `ativa` para `false`.

| Função | Teste |
|---|---|
| `R.receber(cartas, fonte, chave, { dono, em, hoje })` | teste.mjs: paga e guarda o que pagou; a mesma chave não paga de novo e devolve o mesmo resultado; fonte desligada, desconhecida ou chave de outra fonte não paga |
| `R.FONTES` | teste.mjs: a lista aprovada, toda ligada |
| `R.emDia(e, { dono, em, quem, hoje })` | teste.mjs: paga baús antigos e cada fonte alcançada uma vez; rodar de novo não paga nada |

## 3. As fontes (aprovadas pelo dono)

| Fonte | Gatilho | Chave | Prêmio | Quanto | Por que é saudável |
|---|---|---|---|---|---|
| `bau` | abrir o baú do dia N (a cada 7 dias do plano lidos) | `bau:dia:N@<zeradoEm>` | sorteio | ~52 por ano | recompensa leitura feita, sem prazo |
| `conhecer` | terminar os 14 dias do Conhecer Jesus | `conhecer:14` | sorteio | 1 na vida | a primeira carta de quem está começando |
| `passos` | ler os 12 Primeiros passos | `passos:todos` | sorteio | 1 na vida | fecha o percurso de fundamentos |
| `desafio` | concluir um desafio de vários dias | `desafio:<id>` | sorteio | 1 por desafio (4 hoje) | hábito concreto, com pausa e sem perda ao falhar um dia |
| `parabolas` | 7, 14, 21 e 28 parábolas diferentes lidas | `parabolas:<n>` | sorteio | até 4 na vida | estudo além do plano; abrir de novo não soma |
| `pratica` | primeira vez que acerta tudo na prática de uma unidade | `pratica:<unidade>` | sorteio | até 12 na vida | aprender; repetir não paga de novo, errar não perde nada |
| `proposito` | chegar a 7 dias num propósito com amigos | `proposito:7` | sorteio | 1 na vida | comunhão; o número é o seu maior, sem comparar |
| `celula` | primeira presença marcada num encontro de célula | `celula:primeiro` | sorteio | 1 na vida | acolhe quem chega; a carta é privada: não revela quem foi ou faltou |
| `discipulado` | primeiro encontro de discipulado registrado | `discipulado:primeiro` | sorteio | 1 na vida | valoriza começar o acompanhamento |
| `convite` | amigos que vieram pelo seu convite: 1, 5, 15, 40 e 100 | `convite:tier:<1 a 5>` | carta fixa de Semeadores | até 5 na vida | trazer alguém para a Palavra; só conta quem entrou de verdade |
| `convidado` | sua conta veio por um convite e você fez a primeira lição | `convidado` | Boas-vindas (Linho) | 1 na vida | boas-vindas a quem chega |
| `album` | completar um álbum (as 13, em qualquer versão) | `album:<id>` | Glória para escolher | 1 por álbum | fim de uma coleção |
| `unidade` | completar uma unidade da Trilha | `unidade:<n>` | Glória para escolher | até 12 | fim de uma etapa da leitura |
| `dias` | 100 e 365 dias do plano lidos, acumulados | `dias:100`, `dias:365` | Glória para escolher | 2 | constância, sem exigir dias seguidos |

**Semeadores**, as cartas do convite, com a raridade fixa de cada limiar (fora do sorteio e das
proteções; o número de amigos mostrado é só o da própria pessoa, o mesmo da Trilha do Semeador):

| Limiar | Amigos | Raridade | Carta (rascunho) | Referência |
|---|---|---|---|---|
| 1 | 1 | Linho | A semente lançada | Mateus 13.3-8 |
| 2 | 5 | Bronze | André chama Pedro | João 1.40-42 |
| 3 | 15 | Prata | Venha e veja (Filipe e Natanael) | João 1.45-46 |
| 4 | 40 | Ouro | A samaritana e a cidade | João 4.28-30 |
| 5 | 100 | Glória | Os campos maduros | João 4.35 |

Os títulos seguem a NBV: "Venha e veja você mesmo" (João 1.46) e "Eles já estão maduros para a
colheita" (João 4.35). A referência da samaritana ficou em João 4.28-30: o formato aceita um
trecho seguido só, e o versículo 39 não entra junto. Quem pula limiares de uma vez (três amigos
entram antes de abrir o app) recebe a carta de cada limiar, uma revelação depois da outra. Além de
100, nada.

Fontes avaliadas e **recusadas**:

- Orei, reflexões, notas, Minha história, check-in de Corpo, Mente e Espírito: oração e escrita
  não dão prêmio.
- Ofensiva (dias seguidos): perder a sequência viraria perder carta, e isso gera culpa. Os marcos
  de 100 e 365 dias contam dias lidos acumulados.
- Desafios do dia (missões): são diários, empurram a voltar todo dia e incluem "Ore junto".
- Mandar convites ou links, pedidos de amizade, amizade aceita entre quem já tinha conta: só conta
  a conta nova que entrou pelo convite e leu.
- Juntos (postar, reagir, tocar num amigo): premiaria postar por postar.
- Abrir mapas, notas e o atlas: é um toque, fácil de repetir sem ler.

### O que o servidor confirma

`celula`, `discipulado`, `convite` e `convidado` dependem de dados que só o servidor tem:

- `Contas.cartasDoServidor(usuario)` → `{ chaves, amigos }`:
  - os limiares de Semeadores alcançados (`semeadorDe`: contas novas pelo link, com a primeira
    lição, que ainda existem);
  - `convidado`, se a conta veio por um convite e fez a primeira lição;
  - `celula:primeiro`, se a pessoa está entre os presentes de algum encontro de célula;
  - `discipulado:primeiro`, se há encontro registrado num discipulado dela.
- `/api/quem` leva isso em `cartasServidor`; a fonte ligada paga cada chave uma vez.
- `/api/estado`, antes de gravar, roda `conferirCartasDoServidor(atual, junto, permitidas)`: um
  evento novo dessas fontes que o servidor não confirma sai, e com ele a cópia. O que já estava
  gravado não é mexido. Um aparelho não consegue inventar convite, célula nem discipulado.

| Função | Teste |
|---|---|
| `Contas.cartasDoServidor(usuario)` | teste.mjs (contas): convite aceito sem a primeira lição não dá nada; feita a lição, limiar 1 para quem convidou e Boas-vindas para quem veio; os limiares valem em 1, 5, 15, 40 e 100 e nada além; presença e encontro dão a carta a quem esteve |
| `conferirCartasDoServidor(atual, junto, permitidas)` | teste.mjs: um limiar inventado sai com a cópia; o confirmado, o já gravado e o baú ficam |
| fontes do servidor no `emDia` | teste.mjs: só paga o que `/api/quem` confirma, e só chave conhecida; pular limiares paga cada um; nada paga duas vezes |

## 4. O sorteio, as chances e as proteções

Cada fonte de sorteio tira **primeiro a raridade, depois a carta**, com repetidas. O sorteio é
determinístico: a semente é o `@` da conta (`E.dono`) mais a chave do evento (FNV-1a e
mulberry32), então o mesmo evento sobre a mesma coleção sorteia igual em qualquer aparelho. Sem
conta (arquivo aberto direto, servidor de teste aberto), a semente usa `''`.

**Chances por sorteio** (públicas, em "O que pode vir"):

| Raridade | Chance | Comparação |
|---|---|---|
| Linho | 50% | |
| Bronze | 30% | |
| Prata | 15% | perto de um Épico ou um "Double Rare" por pacote |
| Ouro | 5% | perto de um Lendário por pacote |
| Glória | não sai no sorteio | o "god pack" daqui, só por marco |

**Proteções**:

- a primeira carta da vida é uma Prata;
- depois de 5 sorteios sem Prata nem Ouro, o seguinte é Prata ou Ouro (nas proporções 15 para 5);
- a partir do 12º sorteio sem Ouro, a chance de Ouro sobe 5 pontos por sorteio (10%, 15%... 45%
  no 19º), e o 20º é Ouro; as outras raridades encolhem na mesma proporção;
- o viés para carta nova faz o papel da proteção contra repetida.

**A carta**: dos álbuns lançados, com viés para a que a pessoa ainda não tem, em qualquer versão:

- uma carta que falta no **álbum atual** (o primeiro incompleto, na ordem de lançamento) pesa 20;
- uma que falta nos outros álbuns pesa 5;
- uma que a pessoa já tem pesa 1.

Escolha entre "álbum atual" e "todos os álbuns": a simulação mostrou que, só com todos, os quatro
álbuns enchem juntos e completam todos no fim do ano (nenhum troféu antes). Só com o álbum atual,
as repetidas passam de 40%, porque as repetidas caem nas poucas cartas do começo. O misto (20, 5 e
1) completa um álbum por vez, com troféu e Glória ao longo do ano, e ainda deixa os outros
álbuns aparecerem.

### Simulação (ferramentas/simular-cartas.mjs, 300 contas; 8 álbuns, 100 contas)

| Leitor | Sorteios por ano | Linho / Bronze / Prata / Ouro por ano | Entre Ouros (média / pior) | 4 álbuns completos (mediana, de p10 a p90) | Cartas repetidas no 1º ano | Versão repetida no 1º ano |
|---|---|---|---|---|---|---|
| leve | 30 | 13,2 / 7,9 / 6,3 / 2,6 | 10 / 20 | 26,8 meses (24,8 a 30,0) | 6,2% | 2,0% |
| regular | 75 | 33,3 / 20,1 / 14,7 / 6,9 | 10,1 / 20 | 10,7 meses (9,9 a 12,0) | 30,9% | 11,0% |
| intenso | 120 | 53,5 / 32,1 / 23,0 / 11,4 | 10,1 / 20 | 6,7 meses (6,2 a 7,5) | 56,7% | 24,3% |
| regular, 8 álbuns | 75 | 33,3 / 20,1 / 14,6 / 7,0 | 10 / 20 | 23,8 meses (21,8 a 27,0) | 9,2% | 2,8% |

- Em toda conta simulada, a primeira carta foi Prata, nunca houve mais de 5 sorteios seguidos sem
  Prata ou Ouro, e o Ouro veio até o 20º.
- Com as proteções, a taxa real fica em uns 20% de Prata e 9% de Ouro por sorteio (acima dos 15% e
  5% da tabela). "O que pode vir" mostra a tabela e as proteções.
- Leitor regular: as 52 cartas em 10,7 meses, dentro da meta de 10 a 14.
- Repetidas: 30,9% no 1º ano, no limite de cima da meta (20 a 30%). Boa parte delas vem depois que
  o álbum se completa (meses 11 e 12, quando toda carta já é repetida). Mexer só no viés não
  baixou isso: de 10/3 a 30/8 a repetida ficou entre 29 e 33%, e com viés menor o álbum demora mais.
  Por isso o viés ficou como estava (20, 5 e 1). A 60 sorteios por ano, são 13,4 meses e 18% de
  repetidas.
- Versões (carta, raridade): a coleção não termina; com 4 álbuns são 208 versões sorteáveis, que
  se enchem ao longo dos anos (seção "Versões e os anos").

### Referências (contexto para as chances)

- Hearthstone (números divulgados pela Blizzard), por pacote: Épico em 1 de cada 5 (21%),
  Lendário em 1 de cada 20 (5%); Épico garantido até o 10º pacote, Lendário até o 40º, com a
  chance subindo; o primeiro Lendário vem nos 10 primeiros pacotes; proteção contra Lendário
  repetido.
- Pokémon TCG Escarlate e Violeta (estimativas da comunidade), por pacote: Double Rare em 1 de 7,
  Ultra Rare em 1 de 15, Special Illustration Rare em 1 de 32; todo pacote tem um Raro ou melhor.
- Pokémon TCG Pocket: as camadas mais altas bem abaixo de 1% por espaço, mais o "god pack" de 0,05%.
- O baú daqui é como um pacote, mas dá uma carta só, e a pessoa abre uns 75 por ano, não centenas:
  por isso as chances por sorteio ficam no nível de "por pacote", e as proteções, mais curtas.

| Função | Teste |
|---|---|
| `R.semente(dono, chave)`, `R.aleatorio(semente)` | teste.mjs: mesma conta e evento, mesma semente; muda com a conta e com o evento |
| `R.raridade(cartas, r)`, `R.chanceDeOuro(semOuro)` | teste.mjs: 40.000 sorteios dão 50/30/15/5% (±1); o Ouro sobe de 5 em 5 a partir do 12º e o 20º é Ouro; depois de 5 sem Prata ou Ouro só sai Prata ou Ouro; o primeiro da vida é Prata |
| `R.cartaDoSorteio(cartas, r, hoje)` | teste.mjs: nos 13 primeiros sorteios, 98% de cartas novas e o álbum atual mais que os outros juntos; álbum lançado depois dá a carta seguinte |
| `R.sortear(cartas, dono, chave, hoje)` | teste.mjs: o mesmo evento sobre o mesmo estado sorteia igual |
| `simular(...)` | teste.mjs: leitor regular completa em 9,5 a 14 meses com 18 a 33% de repetidas; proteções nunca falham; 8 álbuns também completam |

### Versões e os anos

- A unidade colecionável é a versão (carta, raridade). Com 4 álbuns: 52 cartas, 208 versões
  sorteáveis (Linho, Bronze, Prata e Ouro) e 52 Glórias, escolhidas por marco.
- No primeiro ano, o viés enche a base (as 52 cartas em alguma versão). Depois, os sorteios
  continuam e as versões e as repetidas vão se juntando: a Prata e o Ouro de cada carta são o que
  falta nos anos seguintes.
- Recomeçar a Trilha (ou "Zerar progresso") guarda tudo: os baús voltam fechados e pagam sorteios
  novos (seção 7).
- Cada álbum mostra "13 de 13 cartas" (a base, em qualquer versão) e, à parte,
  "Coleção: 21 de 52 versões".

## 5. Estado e sincronização entre aparelhos

`E.cartas = { eventos, glorias }`:

- `eventos[chave] = { em, carta, raridade }` quando o evento pagou uma carta, ou `{ em, gloria: 1 }`
  quando deu uma Glória para escolher;
- `glorias[chave] = { em, carta, escolhidaEm }`: a Glória, com `carta` vazia enquanto a pessoa não
  escolhe.

A coleção é derivada do livro-caixa (`R.copias`, `R.tem`): **cada evento que pagou uma carta é uma
cópia**, com id próprio (a chave do evento), origem (a fonte) e data; a Glória escolhida também é
uma cópia (a versão Glória da carta). O número de repetidas sai da contagem. Isso deixa trocas
possíveis no futuro (seção 19): uma cópia tem identidade.

Fusão (`fundirCartas`, em `02-estado.js`, a mesma no servidor): união por chave, em que vale o
registro mais antigo de cada chave. Assim nada é contado duas vezes (o mesmo baú aberto em dois
aparelhos é uma chave só) e nenhuma cópia se perde. Na Glória vale a escolha mais antiga; duas
Glórias na mesma carta deixam a mais nova para escolher de novo. `limparCartas` confere a forma de
tudo que chega: chaves num alfabeto curto, carta e raridade conhecidas, números, no máximo 2.000
eventos. O servidor roda as duas em `/api/estado` (normalizar, depois fundir), então um aparelho
com a versão antiga, que manda o estado sem `cartas`, não as apaga.

| Função | Teste |
|---|---|
| `limparCartas(x)` | teste.mjs: chave inválida, carta ou raridade estranha e campos a mais saem; teto de 2.000 |
| `fundirCartas(a, b)` | teste.mjs: mesmo resultado nos dois sentidos; o baú do dia 14 nos dois aparelhos conta uma vez; fundir de novo não duplica; Glória duplicada volta a escolher |
| `R.copias`, `R.tem` | teste.mjs: três eventos de uma carta dão Bronze ×2 e Ouro ×1, uma repetida, cópias com id, origem e data |
| `fundir` (02-estado) leva `cartas` | teste.mjs: na fusão com um aparelho que zerou, as cartas dos dois lados ficam; aparelho antigo sem cartas não as apaga |
| `/api/estado` | teste.mjs (servidor do cofre) e teste-bau: as cartas gravam e voltam |

## 6. Baús abertos antes das cartas

Na abertura do app, na volta do segundo plano e a cada troca de tela (no máximo a cada 3 s,
`CC.acertarCartas`), a regra carrega e `CC.cartasEmDia` paga o que está pendente: cada baú de
`E.bausAbertos` sem evento no livro-caixa, do dia menor para o maior. O versículo guardado do baú
não muda.

| Teste |
|---|
| teste.mjs: baú antigo ganha a carta (a primeira em Prata) e o versículo não muda; de novo, nada é pago |
| teste-bau: com as peças bloqueadas, o baú abre com o versículo; quando a regra carrega, a carta chega |

## 7. Zerar progresso e recomeçar a Trilha

As cartas ficam: `cartas` não está em `PROGRESSO_DA_TRILHA`. A Trilha volta com os baús fechados; a
chave do baú leva a geração do zeramento (`@<zeradoEm>`), então reabrir o baú do dia 7 depois de
ler de novo paga **um sorteio novo**; as cópias de antes ficam como estavam. As outras fontes e os
marcos não têm geração: o Zerar não os faz pagar de novo.

| Teste |
|---|
| teste.mjs: zerar e reabrir o baú do dia 7 paga um sorteio novo e mantém as cópias; refazer as mesmas coisas não paga as outras fontes de novo; zerar mantém as cartas na fusão |

## 8. Revelação

- **No baú**: tocar no baú guarda o versículo (`CC.abrirBau`, como antes). A tela pede as três
  peças (regra, arte e álbum) assim que abre; chegando em até 2,5 s, `CC.cartasEmDia` paga o baú e
  `CC.album.revelarNoBau` mostra a carta pela arte, com uma função só:
  `CC.cartas.revelar(alvo, carta, { raridade, nova, progresso })`. Embaixo:
  - carta nova: "**Nova!** Você tem 9 de 13 em Objetos";
  - versão nova de uma carta que a pessoa já tem: "**Nova versão Prata** de Davi e a funda";
  - repetida: "Repetida: agora você tem 2 de Davi e a funda (Bronze)";
  - álbum completo: "Álbum completo! Escolha uma carta para a versão Glória." e "Escolher a Glória";
  - "Compartilhar carta" (só com desenho), "Salvar papel de parede" e "Continuar".
- **Sem as peças** (sem rede na primeira vez): a tela de sempre, com o confete e o versículo, e
  "A carta deste baú vai para o seu álbum." A carta chega quando a regra carregar (seção 6).
- **Outras fontes**: quando `CC.cartasEmDia` paga carta de outra fonte e nada está aberto na tela,
  `CC.album.revelarNovas` mostra uma revelação depois da outra (o título diz a origem: "Primeiros
  passos completos", "Amigos que chegaram pelo seu convite"...). Com algo aberto, e para os baús
  antigos, um aviso curto: "Carta nova no seu álbum." ou "3 cartas novas no seu álbum."

| Função | Teste |
|---|---|
| `CC.pedirCartas()` | teste-bau: a arte e o álbum não vêm no index.html; na Trilha não são pedidos |
| `CC.album.revelarNoBau(el, palco, { chave, ref, fechar })` | teste-bau: abrir o baú revela a carta pela arte, "Nova! Você tem 1 de 13 em Heróis da fé", Prata, os três botões com 44 px |
| carta de texto | teste-bau: a segunda carta, sem desenho, vira carta de texto; "2 de 13"; sem Compartilhar carta |
| `legenda(x)` | teste-bau (nova); a repetida e a versão nova saem da mesma função |
| `CC.album.revelarNovas(lista)` | coberta pelo `emDia` em teste.mjs; a tela é a mesma da revelação do baú |

## 9. Álbum, carta grande e "O que pode vir"

- Rota `#/perfil/album` (casca `CC.vistaAlbum` no index; a tela vem da peça `album`). Entrada no
  Perfil, na Coleção, ao lado de Conquistas e Troféus: "Cartas", "9 de 52".
- No topo: quantas cartas de quantas e quantas repetidas; "O que pode vir"; o álbum atual.
- Para cada álbum lançado: nome, "9 de 13 cartas", "Coleção: 21 de 52 versões" (e quantas Glórias),
  e a grade das 13. A recebida aparece na **melhor versão** (Glória, Ouro, Prata, Bronze, Linho),
  com 5 bolinhas embaixo (as versões que a pessoa tem) e "×2" quando há mais de uma cópia daquela
  versão. A que falta é silhueta, fora do leitor de tela. Nenhum texto nas miniaturas; o rótulo
  acessível diz título, versões e repetidas.
- Semeadores, à parte: os 5 limiares em silhueta, com "1 amigo", "5 amigos"... embaixo, e quantos
  amigos chegaram pelo convite da própria pessoa. Boas-vindas aparece só para quem recebeu.
- Tocar numa recebida abre a carta grande: inclina com o dedo, vira para o verso com a marca GE
  (toque, arraste ou "Virar"), a troca entre as versões que a pessoa tem (as que faltam em
  silhueta, com ×N nas repetidas), título, "Você sabia?", a referência com link para a Bíblia, o
  link para o mapa ou a parábola e "Compartilhar".
- "O que pode vir": as chances de cada raridade, as proteções e os números da pessoa (álbum atual,
  sorteios desde o último Ouro e desde a última Prata ou Ouro).
- Glória para escolher: no topo do álbum, "Uma versão Glória para escolher" e "Escolher"; a tela de
  escolha mostra as cartas que a pessoa tem sem Glória; confirmar abre a carta na versão Glória.

| Função | Teste |
|---|---|
| `R.resumo(cartas, hoje)` | teste.mjs: álbum atual, cartas, versões, repetidas, Glórias pendentes, sorteios desde Ouro e desde Prata |
| `CC.album.tela(raiz)` | teste-bau: 2 desenhadas e 11 silhuetas sem texto; "2 de 13 cartas" e "Coleção: 3 de 52 versões"; bolinhas, ×2 e rótulo; Semeadores com os 5 limiares; cabe no computador sem rolagem de lado |
| `CC.album.abrirCarta(id, raridade)` | teste-bau: a melhor versão aberta, ×2, silhuetas das que faltam; troca para Bronze; Virar mostra o verso; Compartilhar e link da Bíblia |
| `CC.album.oQuePodeVir()` | teste-bau: as chances, as proteções e os números da pessoa; nada de "não repete" |
| `CC.album.escolherGloria()` | teste-bau: o álbum oferece a escolha, mostra as cartas que a pessoa tem, confirmar põe a Glória e abre a carta nela |

## 10. Compartilhar e papel de parede

- "Compartilhar carta" e "Compartilhar": `CC.cartas.storyDaCarta(carta)` (1080×1920) pelo caminho de
  sempre (`CC.compartilharImagem`, 01d-story.js): a folha do sistema ou o download com aviso. Só
  para carta com desenho.
- "Salvar papel de parede" (na revelação do baú): `CC.cartas.papelDeParede({ ref, texto })`,
  1080×2340, com o versículo da semana na tradução escolhida, palavra por palavra
  (`CC.textoDoVersiculo`).
- As imagens ficam prontas antes do toque (o Safari recusa o compartilhar longe dele).

| Teste |
|---|
| teste-bau: Compartilhar carta manda um PNG 1080×1920 com o título e a versão; Salvar papel de parede manda um PNG 1080×2340 |

## 11. Troféus e Glória

- Álbum completo (as 13, em qualquer versão): um troféu na estante (`CC.trofeus().albuns`, seção
  "Álbuns de cartas" em Troféus) e uma versão Glória para escolher.
- A Glória **nunca sai no sorteio**. Os marcos dão a versão Glória de uma carta que a pessoa
  **escolhe** entre as que tem sem Glória: álbum completo, fim de cada unidade da Trilha, 100 e 365
  dias do plano lidos (acumulados). Se a pessoa não escolhe, a Glória espera, sem prazo.
- Carta de Semeadores e de Boas-vindas não recebe Glória (a de 100 amigos já nasce Glória).

| Função | Teste |
|---|---|
| `CC.trofeus` com `albuns`, `CC.albunsDeCartas` | teste-bau: a entrada do Perfil conta as cartas; o troféu aparece em Troféus |
| fonte `album` | teste.mjs: a carta que falta completa o álbum, que fica completo e dá uma Glória para escolher |
| `R.podeGloria`, `R.escolherGloria(cartas, id, em)` | teste.mjs: a pessoa escolhe, e a versão Glória entra como cópia; sem pendente, nada; não repete Glória na mesma carta; Semeadores não recebe |
| fontes `unidade`, `dias` | teste.mjs: dão Glória para escolher, sem carta, uma vez |

## 12. Sem rede

O sorteio e a coleção são locais: a regra paga sem rede, e a fusão leva para o servidor depois. As
peças (`cartas-regras`, `cartas`, `album`) ficam no cache "caminho-telas" na primeira vez. Sem elas
e sem rede, o baú cai na reserva (seção 8) e o álbum mostra "Não consegui abrir o álbum" ou "Sem
conexão" com "Tentar de novo" (`CC.estadoSemPeca`). As fontes do servidor (convite, célula,
discipulado) esperam a próxima vez que `/api/quem` responder.

## 13. Contas sem entrada

Em produção não há app sem conta. O arquivo aberto direto e o servidor aberto das ferramentas de
teste não têm `E.dono`: a semente usa `''` e as fontes do servidor não pagam. Quem entra depois numa
conta começa do estado da conta (02-estado.js já descarta o progresso sem dono), então nenhuma
carta passa de uma pessoa para outra.

## 14. Acessibilidade e menos movimento

- Miniaturas recebidas são botões com título, versões e repetidas no rótulo; as silhuetas ficam
  fora do leitor de tela, e o cabeçalho do álbum diz "9 de 13 cartas".
- A raridade sempre com nome e ícone, nunca só cor (versões da carta grande, "O que pode vir",
  carta de texto). Botões com 44 px.
- Com `prefers-reduced-motion`, a arte não balança nem gira (a carta aparece já virada, brilho
  parado), a carta de texto entra sem animação, a legenda aparece na hora e a virada é troca.

## 15. Política de privacidade

`src/privacidade.html`: "cartas e álbuns" entra no progresso guardado (seção 3) e no que fica ao
zerar (seção 11), com "Ajuste da versão 5, 22 de outubro de 2026" no histórico. teste.mjs confere.

## 16. Limites, abuso e a lei

- **Nada é pago.** Não há moeda, não há loja e não há como comprar sorteio, nem com dinheiro nem
  com nada que se compre. As cartas vêm só da leitura e das fontes da seção 3.
- **As chances são públicas**: "O que pode vir" mostra a chance de cada raridade, as proteções e os
  números da própria pessoa. Isso importa por causa do ECA Digital (art. 20, sobre caixas de
  recompensa para crianças e adolescentes): aqui não há compra, e as chances estão à vista.
- Sem FOMO: nada expira, não há "quase ganhou", não há placar nem raridade dos amigos.
- Cada evento paga uma vez (livro-caixa). Repetir uma ação não dá carta.
- Zerar e ler de novo reabre os baús com sorteios novos; isso exige reler, que é o próprio hábito.
- O estado nasce no aparelho, como o resto do progresso: quem mexe no próprio arquivo pode se dar
  cartas, mas não há placar, troca nem comparação, então não ganha nada sobre ninguém. O servidor
  limita forma e tamanho (`limparCartas`) e confere as fontes que só ele sabe (seção 3).

## 17. Tamanho

- `index.html`: a fusão e a forma (02-estado.js), os pedidos e a contagem por álbum (02b-jogo.js),
  a tela do baú, a entrada do Perfil, a casca do álbum e o esqueleto do catálogo. A folga do
  index.html continua acima de 60 KB (teste.mjs): 67,7 KB.
- Peças: `cartas-regras` (a regra, cerca de 11 KB), `album` (catálogo, telas e estilo) e `cartas`
  (a arte), pedidas só quando servem.

## 18. Testes

- `node teste.mjs`, seção "cartas e álbuns", mais as partes de contas e do servidor do cofre:
  catálogo, chances (40.000 sorteios), proteções, primeira Prata, viés para carta nova, repetidas
  contadas pelo livro-caixa, resultado estável por evento, fusão sem duplicar, Zerar, fontes do
  estado e do servidor, Semeadores fora do sorteio, álbum novo no dia do lançamento, e a simulação
  com as metas (regular: 9,5 a 14 meses, 18 a 33% de repetidas; 8 álbuns completam).
- `ferramentas/teste-bau.mjs`: abrir o baú, a carta aparecer, compartilhar, papel de parede, carta
  sem desenho, a entrada no Perfil, o álbum, a carta grande e as versões, "O que pode vir", a
  escolha da Glória, o álbum no computador e a reserva sem as peças.
- `ferramentas/simular-cartas.mjs`: o relatório da seção 4 (leve, regular e intenso; 4 e 8 álbuns).
- A bateria de sempre (`scratchpad/testar-tudo.sh`), mais `teste-bau`, `teste-story` e
  `teste-compartilhar`.

## 19. Trocas (futuro, fora desta fase)

O estado já deixa a troca possível: cada cópia tem id (a chave do evento), origem e data. Uma troca
precisaria, no mínimo:

- consentimento das duas pessoas, na hora, carta por carta;
- nada de dinheiro, moeda ou valor: troca de cópia por cópia, sem mercado nem preço;
- proteção de menores: troca só entre amigos aceitos, aprovação de quem responde por quem tem de
  12 a 17 anos (como já é na liderança), e nada com quem a pessoa não conhece;
- limites contra abuso: poucas trocas por semana, desfazer em pouco tempo, denúncia e bloqueio
  (os de `contas.mjs`), e o servidor como dono da troca (a cópia sai de um livro-caixa e entra no
  outro, conferida, e não pelo aparelho);
- revisão do ECA Digital e da política de privacidade antes de ligar.

## 20. Fora desta fase

- Trocas (seção 19).
- Cor de destaque e moldura destraváveis (fase 2 do plano).
- Os desenhos das cartas e das 5 de Semeadores (peça de arte, em paralelo), e a revisão pastoral dos
  textos do catálogo (marcados `rascunho`).
- Os álbuns futuros (proposta na seção 1).
- Som.
