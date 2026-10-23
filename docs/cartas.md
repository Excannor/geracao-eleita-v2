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
- Cada álbum tem uma **capa**, a carta-tema: Heróis da fé, "Multidão de testemunhas" (Hebreus 12.1,
  com a palavra da NBV; o id `nuvem-testemunhas` fica);
  Lugares, Jerusalém; Objetos, a Arca da Aliança; Milagres, o túmulo vazio. A capa sai em todas as
  versões, como as outras. Jesus e Deus não são carta.
- `conteudo/cartas/indice.json`: `{ albuns: [{ id, nome, lancadoEm, capa, especial? }], cartas: [...] }`.
  Cada carta: `id` (minúsculas e hífen, estável para sempre: é ele que fica no estado de quem
  recebeu), `album`, `numero` (1 a 13), `titulo`, `referencia` ("Livro cap.vers", o formato de
  `CC.lerRef`), `voceSabia` (uma linha, fato conferível na referência), `link` (rota de mapa,
  atlas ou parábola), `lancada` (seção "Lançamento aos poucos") e `rascunho: true` até a revisão.
  Os desenhos vão pelo id da carta (`CC.cartas.temArte(id)`).
- Conjuntos especiais (`especial: true`), fora do sorteio e das proteções, com raridade fixa por
  carta: **Semeadores** (5 cartas por amigos que vieram pelo convite, seção 3) e **Boas-vindas**
  (1 carta Linho para quem chegou por um convite).
- O build confere tudo (`validarCatalogo`) e para se algo estiver errado: álbuns de 13, datas de
  lançamento válidas e em ordem, capa do próprio álbum, ids únicos, raridade só nos especiais,
  referência que existe na NBV do repositório, link com destino publicado, sem travessão, e carta
  lançada só com desenho na peça de arte.
  No `index.html` vai só o esqueleto do sorteio (`window.CARTAS_INDICE`, cerca de 1,2 KB); o
  catálogo inteiro entra na peça `album`.
- Carta sem desenho na coleção (não deveria acontecer, porque só a lançada sai, mas o estado vem do
  aparelho): a miniatura vira a silhueta da raridade (sem texto), e a carta grande cai numa carta
  de texto (moldura da raridade, título, "Você sabia?", referência, verso com a marca).

### Lançamento aos poucos (dono, 22/10)

O app vai ao ar com a arte que existe; as outras cartas são desenhadas e revisadas depois.

- Só entra no sorteio a carta com `lancada: true`. O build confere que toda carta lançada tem
  desenho na peça de arte (`desenhosDaArte`: as chaves de `DESENHOS` em `cartas.js`). Hoje são 6:
  Davi e a funda, O poço de Jacó, O azeite da viúva, A Arca da Aliança, O túmulo vazio e O mar
  aberto.
- No esqueleto do `index.html`, a carta não lançada leva um "~" antes do id.
- O sorteio, as proteções, o viés para carta nova e as repetidas valem sobre as lançadas. O álbum
  mostra a não lançada como silhueta, sem texto nenhum sobre data. Um álbum só fica completo com
  as 13 lançadas e na coleção.
- Quando um desenho chega, ele fica na peça de arte sem lançar até o dono aprovar a carta; trocar
  `lancada` para `true` põe a carta no sorteio, e o viés para carta nova a traz logo para quem já
  tem as outras.
- Semeadores e Boas-vindas sem desenho: o limiar alcançado fica anotado no livro-caixa
  (`{ pendente: 1 }`) e paga a carta quando ela for lançada (`R.pagarPendentes`), sem se perder.
- "O que pode vir" diz quantas cartas podem sair hoje ("Hoje podem sair 6 das 52 cartas.").

| Função | Teste |
|---|---|
| `validarCatalogo(cat, raiz)`, `desenhosDaArte(raiz)` | teste.mjs: o catálogo confere; acusa id repetido, contagem errada, lançamento fora de ordem, raridade fixa em carta de álbum e carta lançada sem desenho; toda lançada tem desenho (o desenho pronto pode esperar a aprovação); as capas pedidas; tudo rascunho |
| lançamento aos poucos | teste.mjs: carta não lançada nunca sai (340 sorteios comuns e de marco); nenhum álbum completa sem as 13 lançadas; lançar uma carta põe ela no sorteio e o viés a traz logo; limiar de Semeadores sem desenho fica anotado e paga quando a carta é lançada; na fusão, o evento pago vence o anotado |
| `esqueletoDoCatalogo(cat)` | teste.mjs: o esqueleto do index.html é o do catálogo; os textos e a regra não estão no index |
| `R.albuns(hoje)`, `R.especiais()`, `R.carta(id)` | teste.mjs: 4 álbuns de 13 e os especiais com raridade fixa |
| `paraArte(id, raridade)`, `temArte(carta)` (album.js) | teste-bau: só saem as lançadas, pela arte; carta sem desenho na coleção vira silhueta e carta de texto, sem erro |

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

- `carta`: um sorteio comum (seção 4);
- `marco`: um sorteio de marco, com chance maior de Ouro e de Glória (seção 11);
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
| `album` | completar um álbum (as 13 lançadas, em qualquer versão) | `album:<id>` | sorteio de marco | 1 por álbum | fim de uma coleção |
| `unidade` | completar uma unidade da Trilha | `unidade:<n>` | sorteio de marco | até 12 | fim de uma etapa da leitura |
| `dias` | 100 e 365 dias do plano lidos, acumulados | `dias:100`, `dias:365` | sorteio de marco | 2 | constância, sem exigir dias seguidos |

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
100, nada. Enquanto a carta do limiar não tem desenho, o limiar fica anotado como alcançado (a tela
de Semeadores mostra "5 amigos · alcançado") e a carta vem quando for lançada.

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
conta (arquivo aberto direto, servidor de teste aberto), a semente usa `''`. Só as cartas
lançadas saem (seção 1).

**Sorteio comum** (baús e as outras fontes; público em "O que pode vir"):

| Raridade | Chance | Comparação |
|---|---|---|
| Linho | 49% | |
| Bronze | 30% | |
| Prata | 15% | perto de um Épico ou um "Double Rare" por pacote |
| Ouro | 5% | perto de um Lendário por pacote |
| Glória | 1% | o "god pack" daqui |

**Sorteio de marco** (álbum completo, fim de unidade, 100 e 365 dias de leitura; um sorteio a mais,
nunca Linho nem Bronze):

| Raridade | Chance |
|---|---|
| Prata | 40% |
| Ouro | 35% |
| Glória | 25% |

**Proteções**:

- a primeira carta da vida é uma Prata;
- depois de 5 sorteios sem Prata ou melhor, o seguinte é Prata ou melhor (Prata e Ouro na proporção
  de sempre, a Glória continua em 1%);
- a partir do 12º sorteio sem Ouro, a chance de Ouro sobe 5 pontos por sorteio (10%, 15%... 45%
  no 19º), e o 20º é Ouro, também quando ele é um marco; as outras raridades encolhem na mesma
  proporção, menos a Glória;
- a Glória conta como "Prata ou melhor", mas não zera a conta do Ouro; no sorteio comum não há
  garantia de Glória;
- no marco, cada marco sem Glória dá 15 pontos a ela no marco seguinte (25, 40, 55, 70...),
  tirados primeiro da Prata e depois do Ouro; volta aos 25 quando sai uma Glória;
- o viés para carta nova faz o papel da proteção contra repetida.

**A carta**: dos álbuns lançados, só as cartas lançadas, com viés para a que a pessoa ainda não tem:

- uma carta que falta no **álbum atual** (o primeiro com carta lançada que falta, na ordem de
  lançamento) pesa 20;
- uma que falta nos outros álbuns pesa 5;
- uma que a pessoa já tem pesa 1, ou 2 se ainda não tem a versão sorteada.

Escolha entre "álbum atual" e "todos os álbuns": a simulação mostrou que, só com todos, os quatro
álbuns enchem juntos e completam todos no fim do ano (nenhum troféu antes). Só com o álbum atual,
as repetidas sobem, porque elas caem nas poucas cartas do começo. O misto (20, 5 e 1) completa um
álbum por vez, com troféu e marco ao longo do ano, e ainda deixa os outros álbuns aparecerem.

### Simulação

`ferramentas/simular-cartas.mjs`, a regra de verdade, com o catálogo inteiro lançado (o plano de
longo prazo; hoje são 6 cartas). 300 contas com 4 álbuns e 100 com 8, ao longo de 3 e 5 anos.
"Marcos" são as unidades e os 100 e 365 dias (os álbuns completos entram por si).

| Leitor | Sorteios comuns + marcos por ano | Cartas no 1º ano | Linho / Bronze / Prata / Ouro / Glória no 1º ano | Glórias por ano (anos 1, 2, 3) | Entre Ouros (média / pior) | 4 álbuns completos (mediana, p10 a p90) | Cartas repetidas no 1º ano | Versão repetida no 1º ano |
|---|---|---|---|---|---|---|---|---|
| leve | 30 + 6 | 36,4 | 14,0 / 8,6 / 6,9 / 4,2 / 2,7 | 2,7 / 3,6 / 3,0 | 7,7 / 20 | 25,2 meses (22,4 a 29,6) | 11,5% | 1,9% |
| regular | 75 + 14 | 92,9 | 35,1 / 21,9 / 16,7 / 11,6 / 7,6 | 7,6 / 6,3 / 6,3 | 8,1 / 20 | 10,2 meses (9,0 a 11,8) | 44,1% | 9,2% |
| intenso | 120 + 14 | 138,0 | 54,6 / 33,5 / 25,8 / 16,2 / 8,0 | 8,0 / 6,4 / 6,7 | 8,6 / 20 | 6,8 meses (5,9 a 7,9) | 62,3% | 17,8% |
| regular, 8 álbuns | 75 + 14 | 90,0 | 34,8 / 21,9 / 15,9 / 11,1 / 6,3 | 6,3 / 8,5 / 6,6 | 8,0 / 20 | 23,7 meses (21,0 a 27,0) | 17,6% | 2,7% |
| leve, 8 álbuns | 30 + 6 | 36,0 | 14,1 / 8,6 / 6,6 / 4,3 / 2,5 | 2,5 / 2,8 / 3,1 | 7,9 / 20 | 58,8 meses | 4,9% | 0,6% |

- Em todas as contas simuladas: a primeira carta foi Prata, o mesmo evento sorteou igual, nunca
  houve mais de 5 sorteios seguidos sem Prata ou melhor, o Ouro veio até o 20º, o marco nunca deu
  Linho nem Bronze, e a Glória no sorteio comum ficou em 0,93 a 1,01%.
- Leitor regular: as 52 cartas em 10,2 meses (mediana), dentro da meta de 10 a 14.
- Repetidas: no leitor regular são 44% das cartas do 1º ano, acima da meta de 20 a 30%. O motivo é o
  volume: com os marcos, são uns 93 sorteios no ano para 52 cartas, e depois de completar (mês 10)
  toda carta é repetida de alguma versão. Mexer só no viés não muda isso (de 8/3 a 30/8 a repetida
  ficou entre 44 e 46%; com viés menor, o álbum demora mais). Repetida da mesma versão (carta e
  raridade iguais) fica em 9%. Ficou o viés 20, 5 e 1 (2 para versão que falta). Com 8 álbuns, a
  repetida cai para 18%: o catálogo que cresce é o que resolve.
- Com 6 cartas lançadas hoje, as repetidas são muito mais comuns até os desenhos chegarem: o viés
  para carta nova traz cada carta lançada logo, e depois vêm as versões.

### Referências (contexto para as chances)

- Hearthstone (números divulgados pela Blizzard), por pacote: Épico em 1 de cada 5 (21%),
  Lendário em 1 de cada 20 (5%); Épico garantido até o 10º pacote, Lendário até o 40º, com a
  chance subindo; o primeiro Lendário vem nos 10 primeiros pacotes; proteção contra Lendário
  repetido.
- Pokémon TCG Escarlate e Violeta (estimativas da comunidade), por pacote: Double Rare em 1 de 7,
  Ultra Rare em 1 de 15, Special Illustration Rare em 1 de 32; todo pacote tem um Raro ou melhor.
- Pokémon TCG Pocket: as camadas mais altas bem abaixo de 1% por espaço, mais o "god pack" de 0,05%.
- O baú daqui é como um pacote, mas dá uma carta só, e a pessoa abre uns 75 por ano, não centenas:
  por isso as chances por sorteio ficam no nível de "por pacote", e as proteções, mais curtas. O
  primeiro sorteio em Prata faz o papel do primeiro Lendário garantido; o viés para carta nova, o da
  proteção contra repetida; a Glória, o do "god pack".

| Função | Teste |
|---|---|
| `R.semente(dono, chave)`, `R.aleatorio(semente)` | teste.mjs: mesma conta e evento, mesma semente; muda com a conta e com o evento |
| `R.raridade(cartas, r)`, `R.chanceDeOuro(semOuro)` | teste.mjs: 60.000 sorteios dão 49/30/15/5/1%; a Glória fica em 1% com ou sem proteção ativa; o Ouro sobe de 5 em 5 a partir do 12º e o 20º é Ouro; depois de 5 sem Prata ou melhor só sai Prata ou melhor; a Glória não zera a conta do Ouro; o primeiro da vida é Prata |
| `R.raridadeDeMarco`, `R.chancesDeMarco`, `R.marcosSemGloria` | teste.mjs: 40/35/25%; nunca Linho nem Bronze; +15 por marco sem Glória, tirados da Prata e depois do Ouro; zera quando sai Glória |
| `R.cartaDoSorteio(cartas, r, hoje, raridade)` | teste.mjs: nos 13 primeiros sorteios, mais de 90% de cartas novas e o álbum atual mais que os outros juntos; só lançadas; álbum lançado depois dá a carta seguinte |
| `R.sortear(cartas, dono, chave, hoje, marco)` | teste.mjs: o mesmo evento sobre o mesmo estado sorteia igual |
| `simular(...)` | teste.mjs: leitor regular completa em 9 a 14 meses; proteções nunca falham; marco sem Linho nem Bronze; Glória comum perto de 1%; 8 álbuns também completam |

### Versões e os anos

- A unidade colecionável é a versão (carta, raridade). Com 4 álbuns: 52 cartas e 260 versões
  (Linho, Bronze, Prata, Ouro e Glória).
- No primeiro ano, o viés enche a base (as 52 cartas em alguma versão). Depois, os sorteios
  continuam, e as versões e as repetidas vão se juntando: Ouro e Glória de cada carta são o que
  falta nos anos seguintes.
- Recomeçar a Trilha (ou "Zerar progresso") guarda tudo: os baús voltam fechados e pagam sorteios
  novos (seção 7).
- Cada álbum mostra "13 de 13 cartas" (a base, em qualquer versão) e, à parte,
  "Coleção: 21 de 65 versões".

## 5. Estado e sincronização entre aparelhos

`E.cartas = { eventos }`, o livro-caixa:

- `eventos[chave] = { em, carta, raridade }` quando o evento pagou uma carta;
- `eventos[chave] = { em, pendente: 1 }` quando o evento foi alcançado mas a carta dele (especial)
  ainda não tem desenho; vira carta quando ela for lançada.

A coleção é derivada do livro-caixa (`R.copias`, `R.tem`): **cada evento que pagou uma carta é uma
cópia**, com id próprio (a chave do evento), origem (a fonte) e data. O número de repetidas sai da
contagem. Isso deixa trocas possíveis no futuro (seção 19): uma cópia tem identidade.

Fusão (`fundirCartas`, em `02-estado.js`, a mesma no servidor): união por chave, em que vale o
registro mais antigo de cada chave, e o evento que já pagou a carta vence o que ainda esperava.
Assim nada é contado duas vezes (o mesmo baú aberto em dois aparelhos é uma chave só), nenhuma
cópia se perde, e o resultado de cada evento fica para sempre. `limparCartas` confere a forma de
tudo que chega: chaves num alfabeto curto, carta e raridade conhecidas, números, no máximo 2.000
eventos. O servidor roda as duas em `/api/estado` (normalizar, depois fundir), então um aparelho
com a versão antiga, que manda o estado sem `cartas`, não as apaga.

| Função | Teste |
|---|---|
| `limparCartas(x)` | teste.mjs: chave inválida, carta ou raridade estranha e campos a mais saem; o alcançado fica; teto de 2.000 |
| `fundirCartas(a, b)` | teste.mjs: mesmo resultado nos dois sentidos; o baú do dia 14 nos dois aparelhos conta uma vez; fundir de novo não duplica; o evento pago vence o anotado |
| `R.copias`, `R.tem` | teste.mjs: três eventos de uma carta dão Bronze ×2 e Ouro ×1, uma repetida, cópias com id, origem e data |
| `fundir` (02-estado) leva `cartas` | teste.mjs: na fusão com um aparelho que zerou, as cartas dos dois lados ficam; aparelho antigo sem cartas não as apaga |
| `/api/estado` | teste.mjs (servidor do cofre): as cartas gravam e voltam, a de convite não confirmada não entra, o aparelho sem cartas não as apaga |

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

Um fluxo só, um baú só, um toque (decisão do dono, 22/10).

- **No baú**: a tela pede as três peças (regra, arte e álbum) assim que abre. Com elas prontas
  antes do toque, a tela prevê a carta do baú (`CC.cartasRegras.emDia` num estado com o baú
  aberto; o sorteio é determinístico) e troca o baú da Trilha pelo baú da arte, no mesmo lugar:
  `CC.album.bauDaRevelacao(el, palco, { previsto, chave, ref, fechar, guardar, titulo })`, que
  chama `CC.cartas.revelar(alvo, carta, { raridade, legenda, abrir: 'toque', largura, aoLer })`.
  Na tela fica um elemento de baú só, com "Um baú na estrada!" abaixo do "Pular".
- **O toque** (ou "Pular" antes dele) guarda o baú uma vez: `CC.abrirBau`, a vibração e
  `CC.cartasEmDia`, que paga a carta. Se a carta paga não for a prevista (outro aparelho pagou
  antes, por exemplo), a revelação recomeça já aberta com a carta paga (`revelarNoBau`). A arte
  faz o resto sem troca de tela: a tampa abre com a luz na cor da raridade, a carta sobe, vira e
  brilha. "Pular" vai direto ao fim.
- **O fim** mostra só a carta, grande (do tamanho que sobra na tela), sem baú: a origem quando há
  ("Marco: 100 dias de leitura"), a legenda, "Ler a história" e "Virar"; embaixo, só agora,
  "Compartilhar carta" (só com desenho), "Salvar papel de parede" e "Continuar". Durante a
  abertura não há botões embaixo. Cabe sem rolar em 390×844 e 360×740, claro e escuro.
- A legenda:
  - carta nova: "**Nova!** Você tem 9 de 13 em Objetos";
  - versão nova de uma carta que a pessoa já tem: "Nova versão Prata de Davi e a funda";
  - repetida: "Repetida: agora você tem 2 de Davi e a funda (Bronze)".
- "Ler a história" (o `aoLer` da arte) abre a referência da carta na Bíblia e fecha a tela.
- O que o baú pagou junto vem em seguida, na mesma tela, uma revelação depois da outra: o sorteio
  de marco do álbum que ele completou ("Álbum completo! Ganhou um sorteio de marco."), um marco de
  unidade, uma carta de outra fonte.
- A cena usa as fichas do tema do app (claro e escuro); não há palco escuro à parte.
- **Peças ainda não prontas no toque**: o baú da Trilha balança enquanto espera, até 2,5 s, e a
  revelação segue já aberta.
- **Sem as peças** (sem rede na primeira vez): a tela de sempre, com o confete e o versículo, e
  "A carta deste baú vai para o seu álbum." A carta chega quando a regra carregar (seção 6).
- **Outras fontes e marcos**: quando `CC.cartasEmDia` paga carta de outra fonte e nada está aberto
  na tela, `CC.album.revelarNovas` mostra uma revelação depois da outra, com a origem acima da
  legenda ("Primeiros passos completos", "Amigos que chegaram pelo seu convite") e, no marco,
  "Marco: 100 dias de leitura", "Marco: unidade 3 completa", "Marco: Objetos completo". Com algo
  aberto, e para os baús antigos, um aviso curto: "Carta nova no seu álbum." ou "3 cartas novas no
  seu álbum."

| Função | Teste |
|---|---|
| `CC.pedirCartas()` | teste-bau: a arte e o álbum não vêm no index.html; na Trilha não são pedidos |
| `CC.album.bauDaRevelacao(el, palco, { previsto, chave, ref, fechar, guardar, titulo })` | teste-bau: um elemento de baú antes do toque, um durante a abertura e nenhum no fim; botões embaixo só no fim; o fim cabe em 390×844 e 360×740, claro e escuro; "Nova! Você tem 1 de 13 em Heróis da fé", Prata; "Ler a história" abre 1 Samuel 17 e fecha a tela; capturas do fluxo inteiro (fechado, abrindo, carta de costas, de frente, fim) |
| "Pular" antes do toque | teste-bau: o baú é guardado, a carta é paga e a tela vai ao fim |
| `CC.album.revelarNoBau(el, palco, { chave, ref, fechar, outros })` | caminho de reserva (peças chegando depois do toque, ou carta paga diferente da prevista); sem teste de navegador próprio, a legenda e o fim são os mesmos de `bauDaRevelacao` |
| `legenda(x)` | teste-bau: nova, repetida ("Repetida: agora você tem 3 de Davi e a funda (Prata)") e versão nova ("Nova versão Ouro de Davi e a funda") |
| `CC.album.revelarNovas(lista)` | teste-bau: a prática sem erro revela a carta com a origem; os marcos de 100 dias e das 3 unidades, cada um com Prata, Ouro ou Glória e "Marco: ..." |
| reserva sem peças | teste-bau: o versículo e o aviso; quando a regra carrega, a carta chega |

## 9. Álbum, carta grande e "O que pode vir"

- Rota `#/perfil/album` (casca `CC.vistaAlbum` no index; a tela vem da peça `album`). Entrada no
  Perfil, na Coleção, ao lado de Conquistas e Troféus: "Cartas", "9 de 52".
- No topo: quantas cartas de quantas e quantas repetidas; "O que pode vir"; o álbum atual.
- Para cada álbum lançado: nome, "9 de 13 cartas", "Coleção: 21 de 65 versões" e a grade das 13. A
  recebida aparece na **melhor versão** (Glória, Ouro, Prata, Bronze, Linho), com 5 bolinhas
  embaixo (as versões que a pessoa tem) e "×2" quando há mais de uma cópia daquela versão. A que
  falta, e a ainda não lançada, é silhueta, fora do leitor de tela. Nenhum texto nas miniaturas; o
  rótulo acessível diz título, versões e repetidas.
- Semeadores, à parte: os 5 limiares em silhueta, com "1 amigo", "5 amigos"... embaixo ("· alcançado"
  quando a carta ainda espera o desenho), e quantos amigos chegaram pelo convite da própria pessoa.
  Boas-vindas aparece só para quem recebeu.
- Tocar numa recebida abre a carta grande: inclina com o dedo, vira para o verso com a marca GE
  (toque, arraste ou "Virar"), a troca entre as versões que a pessoa tem (as que faltam em
  silhueta, com ×N nas repetidas), título, "Você sabia?", a referência com link para a Bíblia, o
  link para o mapa ou a parábola e "Compartilhar".
- "O que pode vir": a tabela do sorteio comum e a do marco, as proteções, quantas cartas podem
  sair hoje e os números da pessoa (álbum atual, sorteios desde o último Ouro e desde a última
  Prata ou melhor, a chance de Glória no próximo marco).

| Função | Teste |
|---|---|
| `R.resumo(cartas, hoje)` | teste.mjs: álbum atual, cartas, lançadas, versões, repetidas, alcançados, sorteios desde Ouro e desde Prata, marcos sem Glória |
| `CC.album.tela(raiz)` | teste-bau: as recebidas e as silhuetas sem texto; "2 de 13 cartas" e "Coleção: 3 de 65 versões"; bolinhas, ×2 e rótulo; carta sem desenho em silhueta; Semeadores com os 5 limiares; cabe no computador sem rolagem de lado |
| `CC.album.abrirCarta(id, raridade)` | teste-bau: a melhor versão aberta, ×2, silhuetas das que faltam; troca para Bronze; Virar mostra o verso; Compartilhar e link da Bíblia; sem desenho, carta de texto sem Compartilhar |
| `CC.album.oQuePodeVir()` | teste-bau: as duas tabelas (49/30/15/5/1 e 40/35/25), as proteções, "Hoje podem sair 6 das 52 cartas" e os números da pessoa; nada de "não repete" |

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

## 11. Troféus, marcos e Glória

- Álbum completo (as 13 lançadas e na coleção, em qualquer versão): um troféu na estante
  (`CC.trofeus().albuns`, seção "Álbuns de cartas" em Troféus) e um sorteio de marco.
- A Glória é sorte (dono, 22/10): 1% no sorteio comum e, nos marcos, um sorteio a mais com
  Glória 25% (subindo 15 pontos a cada marco sem ela), Ouro 35% e Prata 40%. A carta é escolhida
  como em qualquer sorteio (lançadas, viés para carta nova e para a versão que falta).
- Marcos: álbum completo, fim de cada unidade da Trilha, 100 e 365 dias do plano lidos
  (acumulados). Cada um paga uma vez na vida.
- A carta de 100 amigos de Semeadores é Glória por ser de limiar fixo, não sorteio.

| Função | Teste |
|---|---|
| `CC.trofeus` com `albuns`, `CC.albunsDeCartas` | teste-bau: a entrada do Perfil conta as cartas; a estante "Álbuns de cartas" em Troféus |
| fonte `album` | teste.mjs: a carta que falta completa o álbum, que fica completo e paga um sorteio de marco junto; o marco que completa outro álbum traz o marco dele também |
| fontes `unidade`, `dias` | teste.mjs: pagam um sorteio de marco, com Prata ou melhor, uma vez; teste-bau: "Marco: 100 dias de leitura" e as unidades revelados |

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
- **As chances são públicas**: "O que pode vir" mostra a chance de cada raridade no sorteio comum e
  no de marco, as proteções e os números da própria pessoa. Isso importa por causa do ECA Digital (art. 20, sobre caixas de
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
  index.html continua acima de 60 KB (teste.mjs): 67,3 KB.
- Peças: `cartas-regras` (a regra, cerca de 14 KB), `album` (catálogo, telas e estilo, cerca de
  42 KB) e `cartas` (a arte, cerca de 150 KB), pedidas só quando servem.

## 18. Testes

- `node teste.mjs`, seção "cartas e álbuns", mais as partes de contas e do servidor do cofre:
  catálogo e lançadas com desenho, chances do comum (60.000 sorteios) e do marco, Glória a 1% no
  comum, proteções, primeira Prata, viés para carta nova, só lançadas saem, pendentes de
  Semeadores, repetidas contadas pelo livro-caixa, resultado estável por evento, fusão sem
  duplicar, Zerar, fontes do estado e do servidor, Semeadores fora do sorteio, álbum novo no dia do
  lançamento, e a simulação (regular: 9 a 14 meses; proteções nunca falham; 8 álbuns completam).
- `ferramentas/teste-bau.mjs`, contra a peça de arte de verdade: abrir o baú (um baú só no fluxo,
  nenhum no fim, o fim cabe em 390×844 e 360×740), "Pular" antes do toque, a carta aparecer, "Ler a história", compartilhar, papel de parede, só lançadas, a entrada no
  Perfil, o álbum, a carta grande e as versões, a carta sem desenho, "O que pode vir" com as duas
  tabelas, outra fonte e os marcos revelados, repetida e versão nova, Troféus, o álbum no
  computador e a reserva sem as peças.
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
- Os desenhos das outras 46 cartas, das 5 de Semeadores e da de Boas-vindas (peça de arte, em
  paralelo; entram por `lancada`), e a revisão pastoral dos textos do catálogo (marcados
  `rascunho`).
- Os álbuns futuros (proposta na seção 1).
- Som.
