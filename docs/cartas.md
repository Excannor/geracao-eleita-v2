# Cartas e álbuns: o sistema de ponta a ponta

Especificação do que dá, guarda e mostra as cartas colecionáveis. A arte das cartas (desenho,
moldura, brilho, verso, a animação do baú) mora na peça `src/sob-demanda/cartas.js` e tem
especificação própria em `scratchpad/cartas-raridade.md` e no plano do dono; aqui fica o sistema
em volta dela. Decisões do dono que valem para tudo:

- oração e escrita nunca dão prêmio;
- não há placar nem comparação entre pessoas (nem raridade dos amigos);
- faltar um dia não gera culpa, e nada expira;
- nada é pago, não há moeda, as chances são públicas ("O que pode vir");
- nada premia spam (convidar muita gente, postar muito);
- evento de grupo não revela quem participou ou não.

Cada seção diz o que acontece, as funções que fazem isso e o teste que confere cada uma.
`teste.mjs` é a seção "cartas e álbuns" (unitário, sem navegador); `teste-bau` é
`ferramentas/teste-bau.mjs` (Chrome sem interface, com servidor próprio).

## 1. Catálogo e álbuns

- 4 álbuns de 13 cartas, nesta ordem: Heróis da fé, Lugares, Objetos, Milagres. Um álbum ativo
  por vez: o primeiro que não está completo.
- Por álbum: 5 Linho, 4 Bronze, 3 Prata, 1 Ouro. A Glória não está no catálogo: é um acabamento
  que uma carta recebida ganha (seção 11).
- Ouro de cada álbum: Heróis da fé, "Nuvem de testemunhas" (Hebreus 12.1); Lugares, Jerusalém;
  Objetos, a Arca da Aliança; Milagres, o túmulo vazio. Jesus e Deus não são carta.
- Arquivo: `conteudo/cartas/indice.json`, `{ albuns: [{ id, nome }], cartas: [...] }`. Cada carta:
  `id` (minúsculas e hífen, estável para sempre: é ele que fica no estado de quem recebeu),
  `album` (id do álbum), `numero` (1 a 13, a ordem no álbum), `titulo`, `raridade`
  (`linho|bronze|prata|ouro`), `referencia` ("Livro cap.vers", o formato de `CC.lerRef`),
  `voceSabia` (uma linha, fato conferível na referência), `link` (rota de mapa, atlas ou
  parábola, opcional), `desenho` (chave do desenho na peça de arte; sem ela, o próprio id) e
  `rascunho: true` enquanto o texto não passou pela revisão.
- O build lê o arquivo, confere a forma (13 por álbum, a contagem de raridades, ids únicos,
  referência legível) e reparte:
  - no `index.html`, só o esqueleto do sorteio (`window.CARTAS_INDICE`: álbum, id e raridade,
    cerca de 1 KB);
  - o catálogo inteiro vai na peça sob demanda `album` (seção 16).
- Carta sem desenho ainda: o álbum mostra a miniatura em silhueta da raridade, e a revelação e a
  carta grande caem numa carta de texto (moldura da raridade, título, "Você sabia?",
  referência). A arte chega depois, pelo `desenho`/id, sem mudar nada aqui.

| Função | Onde | Teste |
|---|---|---|
| `validarCatalogo(cat)` | `ferramentas/cartas-catalogo.mjs` (build e teste usam) | teste.mjs: 4×13, contagens, Ouros pedidos, ids únicos, referência existe na NBV |
| `esqueletoDoCatalogo(cat)` | idem | teste.mjs: o esqueleto do index.html bate com o catálogo |
| `CC.cartasRegras.albuns()` | `src/app/02c-cartas.js` | teste.mjs: lê o esqueleto |
| `CC.album.carta(id, cartas)` (adaptador para a arte) | `src/sob-demanda/album.js` | teste-bau: a carta revelada tem título e referência do catálogo |
| `temArte(carta)` | idem | teste-bau: carta sem desenho vira carta de texto, sem erro |

## 2. Fontes de cartas (o modelo genérico)

Toda carta vem de uma **fonte**. Cada fonte tem uma regra (quando dispara), um prêmio (`carta`:
a próxima do álbum ativo; `gloria`: um acabamento Glória) e uma **chave de evento** que só pode
pagar uma vez. O livro-caixa `E.cartas.eventos[chave]` guarda o que cada evento já deu; ele fica
fora do "Zerar progresso" e se funde por união entre aparelhos, então o mesmo evento nunca paga
duas vezes.

- `CC.cartasRegras.FONTES`: a lista das fontes, cada uma com `ativa`, `premio` e, quando a fonte
  sai do próprio estado, `detectar(e)` → chaves alcançadas.
- Ligadas hoje: `bau` (carta), `album`, `unidade` e `dias` (Glória; seção 11).
- Desligadas até o dono aprovar a proposta da seção 3: `conhecer`, `passos`, `desafio`,
  `parabolas`, `pratica`, `proposito`. O código delas existe e é testado, mas `ativa: false`;
  ligar é trocar `ativa` para `true` (uma linha cada).

| Função | Teste |
|---|---|
| `receber(cartas, fonte, chave, { dono, em })` → `{ cartas, resultado }` | teste.mjs: dá a próxima carta; a mesma chave não paga de novo; fonte desligada não paga; fonte desconhecida não paga |
| `detectados(e)` → `[[fonte, chave]]` das fontes ligadas | teste.mjs: com tudo desligado só saem as fontes ligadas; ligando uma, ela aparece |
| `emDia(e, { dono, em })` | teste.mjs: paga baús antigos e marcos uma vez só; rodar duas vezes não muda nada |

## 3. Proposta de fontes além do baú (a aprovar pelo dono)

Levantamento do app, com o gatilho, o prêmio, a frequência e por que é saudável. Todas pagam a
próxima carta do álbum ativo (não há carta especial por fonte nesta fase) e cada evento paga uma
vez na vida da conta.

| Fonte | Gatilho | Chave | Quanto | Por que é saudável | Situação |
|---|---|---|---|---|---|
| `bau` | abrir o baú do dia N (a cada 7 dias do plano lidos) | `bau:dia:N@<zeradoEm>` | ~52 por ano | já existe; recompensa leitura feita, sem prazo | **ligada** |
| `conhecer` | terminar os 14 dias do Conhecer Jesus | `conhecer:14` | 1 na vida | a primeira carta de quem está começando, no fim de um caminho curto | proposta |
| `passos` | ler os 12 Primeiros passos | `passos:todos` | 1 na vida | fecha o percurso de fundamentos | proposta |
| `desafio` | concluir um desafio de vários dias (Desafios) | `desafio:<id>` | 1 por desafio (4 hoje) | hábito concreto, com pausa e sem perda ao falhar um dia | proposta |
| `parabolas` | 7, 14, 21 e 28 parábolas diferentes lidas no Explorar | `parabolas:<n>` | até 4 na vida | estudo além do plano; conta parábolas distintas, abrir de novo não soma | proposta |
| `pratica` | primeira vez que acerta tudo na prática de uma unidade | `pratica:<unidade>` | até 12 na vida | aprender; repetir a prática não paga de novo e errar não perde nada | proposta |
| `proposito` | chegar a 7 dias num propósito com amigos | `proposito:7` | 1 na vida | comunhão; o número é o seu maior, sem comparar com ninguém | proposta |
| `celula` | primeiro encontro da célula com presença marcada | `celula:primeiro` | 1 na vida | acolhe quem chega; a carta é privada, então não revela quem foi ou faltou | proposta, precisa do servidor (não implementada) |
| `discipulado` | primeiro encontro registrado de discipulado | `discipulado:primeiro` | 1 na vida | valoriza começar o acompanhamento | proposta, precisa do servidor (não implementada) |
| `convite` | alguém criou a conta pelo seu link de convite **e** fez a primeira lição (o mesmo critério da Trilha do Semeador) | `convite:<resumo da conta convidada>` | 1 por pessoa nova, no máximo 5 na vida | trazer alguém para a Palavra; mandar convite não paga nada, só a pessoa que entrou de verdade, e o teto tira o motivo de convidar em massa | proposta (decisão do dono: convite dá carta), conferida pelo servidor |
| `convidado` | a sua conta foi criada pelo convite de alguém e você fez a primeira lição | `convidado` | 1 na vida | boas-vindas a quem chega; uma só, não cresce com nada | proposta, conferida pelo servidor |

Fontes avaliadas e **recusadas**:

- Orei, reflexões, notas, Minha história, check-in de Corpo, Mente e Espírito: oração e escrita
  não dão prêmio.
- Ofensiva (dias seguidos): perder a sequência viraria perder carta, o que gera culpa. Os marcos
  de 100 e 365 dias contam dias lidos acumulados, não seguidos.
- Desafios do dia (missões): diários, empurram a voltar todo dia e incluem "Ore junto".
- Mandar convites, links ou pedidos de amizade, e amizade aceita entre quem já tinha conta: só a
  conta nova que entrou pelo convite e leu conta (fonte `convite`, acima).
- Juntos (postar, reagir, tocar num amigo): premiaria postar por postar.
- Abrir mapas, notas e o atlas: é um toque, fácil de repetir sem ler.

### Convite: como o servidor confere

O servidor já anota cada aceite de convite (`convitesAceites` em contas.mjs: `de`, `para`,
`contaNova`, `ativadoEm`; `semeadorDe` conta quem veio). Daí:

- `Contas.cartasDeConvite(usuario)` → `{ chaves, convidado }`: as chaves das contas novas que
  vieram pelo convite desta pessoa e já fizeram a primeira lição (contas que ainda existem), na
  ordem em que chegaram, até 5; cada chave é `convite:` + 12 letras de um resumo (sha-256) de quem
  convidou e de quem veio, então o estado não guarda o @ de ninguém. `convidado` diz se esta conta
  veio por um convite e já fez a primeira lição.
- `/api/quem` leva isso em `cartasConvite`; a fonte `convite` (ou `convidado`), ligada, paga cada
  chave uma vez.
- `/api/estado` confere toda chave `convite:*` e `convidado` **nova** (que não estava no estado
  guardado): se não está em `cartasDeConvite`, o evento e a carta que ele deu saem antes de gravar
  (`CC.cartasRegras.conferirFontesDoServidor`). Um aparelho não consegue inventar convite.
- Ninguém vê quantas pessoas outra pessoa trouxe nem quantas cartas ela tem: não há lista nem
  contagem comparada. O número da Trilha do Semeador continua só da própria pessoa.

| Função | Teste |
|---|---|
| `Contas.cartasDeConvite(usuario)` | teste.mjs (contas): só conta nova pelo link e com a primeira lição; teto de 5; conta apagada sai; `convidado` para quem veio |
| `conferirFontesDoServidor(atual, junto, permitidas)` | teste.mjs: chave de convite inventada sai com a carta; a permitida fica; a que já estava guardada não é mexida |
| `/api/estado` usa a conferência | teste.mjs (servidor do cofre): PUT com convite inventado grava sem ele |

## 4. O sorteio e as garantias

- Semente: o `@` da conta (`E.dono`, o mesmo em todo aparelho) mais o id do álbum, por FNV-1a, e
  um gerador mulberry32. Sem conta (arquivo aberto direto, servidor de teste aberto), a semente
  usa `''`: o sorteio continua determinístico.
- Ordem de cada álbum, feita uma vez a partir da semente: os tamanhos de bloco 3, 3, 3 e 4
  embaralhados; as 3 Pratas e o Ouro embaralhados, um por bloco; as 9 Linho e Bronze embaralhadas
  nos espaços; cada bloco embaralhado por dentro. Daí:
  - cada bloco tem exatamente uma Prata ou o Ouro;
  - nunca mais de 5 cartas seguidas sem Prata ou Ouro, dentro do álbum e na passagem de um álbum
    para o outro (a ordem do álbum seguinte puxa a primeira Prata ou Ouro para perto quando o
    anterior terminou com Linho e Bronze);
  - o Ouro chega até a 13ª carta do álbum.
- Primeira carta da vida: o primeiro álbum começa sempre por uma Prata.
- Cada fonte de carta recebe a **primeira carta que falta** no primeiro álbum incompleto, na ordem
  sorteada. Por isso nunca há repetida, nem depois da fusão entre aparelhos ou do Zerar.

| Função | Teste |
|---|---|
| `semente(dono, album)` | teste.mjs: mesma conta dá a mesma semente; contas diferentes, ordens diferentes |
| `ordemDoAlbum(dono, i, sobra)` | teste.mjs (200 contas): 13 ids sem repetir; blocos com uma Prata ou Ouro; a primeira do álbum 1 é Prata |
| `ordem(dono)` | teste.mjs (200 contas): 52 ids; nunca mais de 5 seguidas sem Prata ou Ouro, inclusive na troca de álbum |
| `proxima(cartas, dono)` | teste.mjs: a primeira que falta; null com tudo completo |

## 5. Estado e sincronização entre aparelhos

`E.cartas = { recebidas, eventos, glorias }`:

- `recebidas[idCarta] = { em, fonte }`: a coleção (`em` em milissegundos; `fonte` é a chave do
  evento que deu a carta);
- `eventos[chave] = { em, carta }` ou `{ em, gloria: 1 }`: o livro-caixa contra repetição;
- `glorias[chave] = { em, carta, escolhidaEm }`: os acabamentos Glória (`carta` vazia enquanto a
  pessoa não escolhe).

Fusão (`fundirCartas`, em `02-estado.js`, a mesma no servidor): união das três tabelas; na mesma
chave fica a mais antiga (a carta recebida primeiro não muda); numa Glória, vale a escolha mais
antiga, e duas Glórias na mesma carta (escolhidas em aparelhos diferentes) deixam a mais nova
para escolher de novo. `limparCartas` confere a forma de tudo que chega (ids e chaves num
alfabeto curto, números, no máximo 400 entradas por tabela); o que não confere sai. O servidor
roda as duas funções em `/api/estado` (normalizar, depois fundir), então um aparelho com a versão
antiga, que não conhece `cartas` e manda o estado sem elas, não as apaga no servidor.

| Função | Teste |
|---|---|
| `limparCartas(x)` | teste.mjs: lixo, tipos errados e excesso saem; o válido fica |
| `fundirCartas(a, b)` | teste.mjs: união; a carta recebida não muda; mesma resposta nos dois sentidos; Glória duplicada volta a escolher |
| `fundir` (02-estado) leva `cartas` | teste.mjs: a fusão de dois estados mantém as cartas dos dois |
| servidor `/api/estado` | teste.mjs (servidor do cofre): grava cartas, um aparelho antigo grava sem elas, as cartas continuam |

## 6. Baús abertos antes das cartas

Na abertura do app (`CC.cartasEmDia`, depois de sincronizar, e também na volta do segundo plano),
cada baú de `E.bausAbertos` sem evento no livro-caixa recebe a carta, do dia menor para o maior.
O versículo guardado do baú não muda (é `bausAbertos[...].ref`, que não é tocado).

| Função | Teste |
|---|---|
| `emDia` (parte dos baús) | teste.mjs: baú antigo ganha carta e mantém o versículo; rodar de novo não dá outra |

## 7. Zerar progresso

As cartas ficam: `cartas` não está em `PROGRESSO_DA_TRILHA`. A Trilha volta a mostrar os baús
fechados; a chave do baú leva a geração do zeramento (`@<zeradoEm>`), então reabrir o baú do dia 7
depois de ler de novo dá **a próxima carta que falta**, nunca uma repetida. As outras fontes e os
marcos não têm geração: o Zerar não os faz pagar de novo.

| Teste |
|---|
| teste.mjs: zerar mantém as cartas; reabrir o baú dá carta nova, diferente das que já tinha; marcos não pagam de novo |
| teste.mjs: na fusão com um aparelho zerado, as cartas dos dois lados ficam |

## 8. Revelação no baú

- Tocar no baú: `CC.abrirBau` guarda o baú (versículo, como antes) e paga a fonte `bau` na hora,
  sem rede e sem a peça. A carta já é da pessoa antes de qualquer animação.
- A tela pede as duas peças (`cartas` e `album`) assim que abre. Se chegarem em até 2,5 s:
  - `CC.album.revelarNoBau(...)` chama a arte por uma função só,
    `CC.cartas.revelar(alvo, carta, { raridade, nova, progresso })` (o balanço, a tampa, a luz na
    cor da raridade e a carta que sobe e vira são da peça de arte);
  - embaixo: "**Nova!** Você tem 9 de 13 em Objetos", o título e a referência; "Compartilhar
    carta", "Salvar papel de parede" e "Continuar";
  - álbum completo: "Álbum completo!" e o Ouro do álbum com o acabamento Glória; o troféu entra na
    estante;
  - tudo completo: o baú dá um acabamento Glória para escolher, com "Escolher a carta".
- Sem as peças (sem rede na primeira vez): a tela de sempre, com o confete e o versículo, e a linha
  "A carta deste baú já está no seu álbum." com o link.

| Função | Teste |
|---|---|
| `CC.abrirBau` (02b) paga a carta | teste.mjs: abrir dá carta e o evento; abrir de novo não dá outra |
| `CC.pedirCartas()` | teste-bau: as duas peças só são pedidas quando a tela do baú ou o álbum abre |
| `CC.album.revelarNoBau` | teste-bau: abre o baú, a carta aparece, "Nova!" com "N de 13" certo, os três botões |
| reserva sem peça | teste-bau: com a peça bloqueada, o versículo aparece e a carta está no estado |

## 9. Álbum, carta grande e "O que pode vir"

- Rota `#/perfil/album` (casca `CC.vistaAlbum` no index; a tela vem da peça `album`). Entrada no
  Perfil, na Coleção, ao lado de Conquistas e Troféus ("Cartas", "9 de 52").
- Para cada álbum: nome, "9 de 13", barra, e a grade das 13 miniaturas na ordem do álbum. A
  recebida aparece desenhada (`CC.cartas.miniatura`); a que falta, em silhueta. Nenhum texto nas
  miniaturas. O álbum ativo vem primeiro, aberto.
- Tocar numa recebida abre a carta grande (`CC.cartas.cartaViva`): inclina com o dedo, vira para
  o verso com a marca GE (toque, arraste ou o botão "Virar"), título, "Você sabia?", referência
  com link para a Bíblia, link para o mapa ou a parábola quando houver, e "Compartilhar". A
  silhueta não é botão.
- "O que pode vir" (botão no álbum ativo): "Faltam 4 cartas em Objetos" e a contagem por raridade
  (2 Linho, 1 Bronze, 1 Prata). Embaixo, as regras em uma linha cada: cada carta vem uma vez só;
  a cada 3 ou 4 baús vem uma Prata ou o Ouro; a Glória não sai no baú.
- Glória para escolher: no topo do álbum, "Um acabamento Glória para escolher" e "Escolher"; as
  recebidas sem Glória viram escolha, com confirmação.

| Função | Teste |
|---|---|
| `resumo(cartas)` | teste.mjs: tem, falta por raridade, álbum ativo, completos, Glórias pendentes |
| `CC.album.tela(raiz)` | teste-bau: a carta do baú está no álbum; silhuetas sem texto; 13 por álbum |
| `CC.album.abrirCarta(id)` | teste-bau: a carta grande abre, vira e tem Compartilhar |
| `CC.album.oQuePodeVir()` | teste-bau: as contagens batem com o estado |
| `escolherGloria(cartas, id, em)` | teste.mjs: aplica na carta recebida; recusa carta que não tem ou que já é Glória; sem Glória pendente, nada |

## 10. Compartilhar e papel de parede

- "Compartilhar carta": `CC.cartas.storyDaCarta(carta)` (1080×1920) pelo caminho de sempre
  (`CC.compartilharImagem`, 01d-story.js): a folha do sistema ou o download com aviso. Só para
  carta com desenho.
- "Salvar papel de parede" (só na tela do baú): `CC.cartas.papelDeParede({ ref, texto })`,
  1080×2340, com o versículo da semana na tradução escolhida, palavra por palavra
  (`CC.textoDoVersiculo`).
- As imagens ficam prontas antes do toque (o Safari recusa o compartilhar longe dele).

| Teste |
|---|
| teste-bau: Compartilhar manda um PNG 1080×1920; Salvar papel de parede manda um PNG 1080×2340 |

## 11. Troféus e Glória

- Álbum completo: um troféu "Álbum <nome>" na estante (`CC.trofeus().albuns`, seção "Álbuns de
  cartas" em Troféus) e a Glória automática no Ouro daquele álbum (fonte `album`).
- Marcos que dão um acabamento Glória para escolher: fim de cada unidade da Trilha (`unidade:N`),
  100 e 365 dias do plano lidos, acumulados (`dias:100`, `dias:365`).
- Tudo completo: cada baú dá um acabamento Glória para escolher.
- A Glória fica na carta (`raridade: 'gloria'` para a arte) e não volta a ser Linho.

| Função | Teste |
|---|---|
| `CC.trofeus` (02b) com `albuns` | teste.mjs: o troféu aparece ganho com o álbum completo |
| fontes `album`, `unidade`, `dias` | teste.mjs: álbum completo dá Glória no Ouro; unidade completa e 100 dias dão Glória para escolher, uma vez |
| baú com tudo completo | teste.mjs: dá Glória para escolher, sem carta |

## 12. Sem rede

O sorteio e a coleção são locais: o baú paga a carta sem rede, e a fusão leva para o servidor
depois. As peças (`cartas`, `album`) ficam no cache "caminho-telas" na primeira vez; sem elas e
sem rede, o baú cai na reserva (seção 8) e o álbum mostra o recado com "Tentar de novo"
(`CC.estadoSemPeca`).

## 13. Contas sem entrada

Em produção não há app sem conta. O arquivo aberto direto e o servidor aberto das ferramentas
de teste não têm `E.dono`: a semente usa `''`. Quem entra depois numa conta começa do estado da
conta (02-estado.js já descarta o progresso sem dono), então nenhuma carta passa de uma pessoa
para outra.

## 14. Acessibilidade e menos movimento

Miniaturas recebidas são botões com o nome e a raridade; as silhuetas ficam fora do leitor de
tela, e o cabeçalho do álbum diz "9 de 13". Raridade sempre com nome e ícone, nunca só cor.
Botões com 44 px. Com `prefers-reduced-motion`, a peça de arte não balança nem gira (a carta
aparece já virada, brilho parado), e o álbum não anima.

## 15. Política de privacidade

`src/privacidade.html`: "cartas e álbuns" entra no progresso guardado (seção 3) e no que fica ao
zerar (seção 11); ajuste da versão 5 no histórico. teste.mjs confere.

## 16. Limites e abuso

- Cada evento paga uma vez (livro-caixa). Repetir uma ação não dá carta.
- Zerar e ler de novo reabre os baús, com carta nova; isso exige reler, é o próprio hábito, e o
  total é limitado pelo catálogo (52), depois só Glória.
- O estado nasce no aparelho, como o resto do progresso: quem mexe no próprio arquivo pode se dar
  cartas, mas não há placar, troca nem comparação, então não ganha nada sobre ninguém. O servidor
  só limita forma e tamanho (`limparCartas`).

## 17. Tamanho

- `index.html`: a regra (02c-cartas.js), a casca da rota, o atalho do Perfil e o esqueleto do
  catálogo. Teto: a folga do index.html continua acima de 60 KB (teste.mjs).
- Peça `album` (catálogo inteiro, telas do álbum e da revelação, estilo) e peça `cartas` (arte),
  pedidas só no baú e no álbum.

## 18. Testes

- `node teste.mjs`, seção "cartas e álbuns": tudo das seções 1 a 11 marcado teste.mjs.
- `ferramentas/teste-bau.mjs`: abrir o baú, a carta aparecer, estar no álbum, abrir a carta
  grande, "O que pode vir", compartilhar e papel de parede, e a reserva sem peça.
- A bateria de sempre (`scratchpad/testar-tudo.sh`), mais `teste-sob-demanda`.

## 19. Fora desta fase

- Cor de destaque e moldura destraváveis (fase 2 do plano).
- As fontes propostas da seção 3 ficam desligadas até a aprovação; `celula` e `discipulado`
  precisam de trabalho no servidor.
- Cartas especiais por fonte, troca entre pessoas, som.
- Os desenhos das cartas (peça de arte, em paralelo) e a revisão pastoral dos textos do catálogo
  (marcados `rascunho`).
