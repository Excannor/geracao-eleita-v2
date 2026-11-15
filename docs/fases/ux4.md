# UX4: o que ficou parcial nas fases de UX

Fase curta de correções de UX, depois das fases 1 a 3 da avaliação de usabilidade (achados em
A, B e C) e das fases R1 e R2. Um item por vez, cada um com o seu commit e os seus testes:
UX4.1 esconder o próprio "leu hoje", UX4.2 as três métricas do topo da célula, UX4.3 a data da
parte 2 do estudo dividido, UX4.4 Conquistas e Troféus numa tela, UX4.5 lembretes que mostram a
verdade (C11), UX4.6 o ponto vermelho do Discipulado dentro de "Mais", UX4.7 o painel da igreja e
o "reacender a chama", UX4.8 as duas falhas antigas do teste-conta.

## UX4.1 · Esconder o próprio "leu hoje"

**Como era.** Depois da Fase 1 (B4, commit df74e1d), a visitante via só a conta ("5 de 7 pessoas
leram hoje"), e quem é membro lia "Quem é membro da célula vê quem já leu hoje, o seu também.
Visitantes veem só o número." Mas não havia como tirar o próprio "leu hoje" da lista. E o
servidor ainda mandava ao membro o "leu hoje" de quem é visitante (a tela só não mostrava).

**A escolha.** Na aba Pessoas da célula, logo abaixo daquela frase, o interruptor "Mostrar na
célula se eu li hoje", com a dica "Quem conduz a célula sempre vê, para cuidar de você." Vem
ligado (a regra de antes). Desligado, a frase vira "O seu "leu hoje" fica só com você e com quem
conduz a célula." e o aviso diz "Pronto: só quem conduz a célula vê se você leu hoje". A escolha é
da conta (`conta.leituraOculta`, no extra da conta, sem migração) e vale para todas as células da
pessoa. A visitante não vê o interruptor: o "leu hoje" dela já não vai para ninguém além de quem
conduz.

**O líder.** Quem conduz (o líder, mesmo à espera da aprovação da liderança, e o auxiliar) e o
administrador continuam vendo o "leu hoje" de todos. Decisão tomada com o interruptor "Quem conduz
a minha célula vê" da Fase 1 em mente: lá a escolha protege a etapa de Minha caminhada (decisão de
fé, batismo), que não é necessária para cuidar; aqui o "leu hoje" é o que alimenta a chama da
célula, o "precisa de atenção" e o toque em quem falta, e a política já dizia que quem conduz vê se
a pessoa está lendo. Esconder também do líder desligaria o cuidado sem ele saber; por isso a dica
diz com todas as letras que quem conduz sempre vê.

**No servidor** (`retratoDoProposito`, `servidor.mjs`). Para quem não conduz uma célula, sai do
retrato o `fezHoje`/`extraHoje` (vira `null`/`false`) de: todos os outros, se quem pede é
visitante (como antes); quem é visitante; quem desligou o interruptor. Esse retrato leva a conta
pronta: `leramHoje` e `pessoasHoje` só de quem mostra (e da própria pessoa), e `naoMostram`.
`minhaLeituraOculta` diz à pessoa como está o interruptor. A ação nova é
`api/celula {acao: 'leituraOculta', sim}`; só `sim === true` esconde.

**Na tela** (`08b-propositos.js`). A aba Pessoas usa a conta pronta sempre que ela vem: "4 de 6
pessoas leram hoje. 1 pessoa prefere não mostrar." O cabeçalho da célula usa a mesma conta. Quem
não mostra não entra em "Dar um toque em quem falta" (só entra quem tem `fezHoje === false`), e a
folha de um propósito nunca escreve "Ainda não leu hoje" para quem veio sem o dado.

**Política de privacidade.** Versão 7 (15 de novembro de 2026): o resumo, a linha "Se leu hoje" do
quadro de quem vê e o histórico.

**Testes.** `teste-celula` (servidor): por padrão o membro vê; o membro nunca recebe o "leu hoje"
do visitante; só `true` esconde; escondido, o membro e a visitante recebem `null` e a conta sem
ela (`naoMostram` 1); ela mesma, o líder e o auxiliar continuam vendo; ligado de novo, volta.
`teste-celula-botoes` (navegador): o interruptor, ligado, com 44 px; a dica de quem conduz; a frase
que muda; o servidor depois do toque; a outra pessoa lendo "1 pessoa prefere não mostrar.".
`teste.mjs`: a política na versão 7 com a linha nova.

**O que ficou de fora.**
- A barra da meta do dia (pontos) e o "dias com a célula inteira lendo" continuam contando quem não
  mostra, sem nome: a meta é do grupo. Numa célula muito pequena, quem soma os pontos pode deduzir.
- Os amigos continuam vendo o "leu hoje" pela amizade (Amigos, Trilha, Dia lido): a escolha é da
  célula. Para tirar dos amigos, seria outra escolha, na amizade.

## UX4.2 · As três métricas do topo da célula

**Como era.** O líder via três números que mediam coisas diferentes sem dizer o quê (B11 da
avaliação). A Fase 1 tinha tirado o 0 do alto e explicado o ponto e a chama, mas só em parte:
- no alto, "N dias com a célula inteira lendo" assim que houvesse um dia batido. O número é a
  sequência de dias com a **meta** batida, e a meta pode ser batida sem todos lerem (o extra de
  um cobre a falta de outro). O rótulo prometia algo que o número não mede;
- na aba Hoje, a barra "3 de 5 pontos hoje", sem dizer de qual meta;
- no Painel, "60%" grande, com "3 pessoas de 5 com a chama acesa hoje (a sequência de leitura não
  parou)" e os nomes com um número solto entre parênteses ("Ana (4)").

**Agora, um número para cada pergunta, com o nome dele:**
- **Quantos leram hoje** (o número principal). O alto da célula mostra sempre "3 de 5 leram hoje",
  o mesmo da aba Pessoas, também depois do primeiro dia batido. Quando há dias seguidos com a meta
  batida, eles vêm embaixo, com o nome certo: "Meta da célula batida: 4 dias seguidos" ("4 dias"
  no propósito de livro, em que os dias se somam).
- **A meta da célula hoje.** A barra diz "Meta da célula: 3 de 5 pontos hoje" ou "Meta da célula
  de hoje batida!". Embaixo: "A meta é um ponto por pessoa. Cada leitura de hoje vale 1 ponto, e o
  extra do dia vale mais 1: quem faz o extra ajuda a cobrir quem não leu." Fora da célula, a barra
  dos grupos não muda.
- **A chama acesa** (Painel, só quem conduz e o administrador). "3 de 5 / com a chama acesa (60%)",
  na mesma forma do "leram hoje", e a linha "Chama acesa: a sequência de leitura da pessoa não
  parou (leu hoje ou ontem, ou um escudo guardou o dia). Entre parênteses, os dias seguidos." Os
  nomes ficam "Ana (4 dias)".

Decisão: trocar a métrica do alto (e não só o rótulo) porque "quantos leram hoje" é o que o líder
conta ao grupo e é o mesmo número da aba Pessoas; a sequência da meta continua lá, com um nome
que não promete "a célula inteira". A porcentagem da chama não some: vai para o lado, porque o
painel da igreja compara células por ela.

Tudo em `08b-propositos.js` (`contagem`, `barraDoGrupo`, `cartaoSaude`, `quemEstaComo`); nada muda
no servidor. Custo no index.html: 0,4 KB (folga de 67,2 KB).

**Testes.** `teste-celula-botoes`: o alto em "de N leram hoje" e sem "célula inteira lendo"; a
barra "Meta da célula" com a linha do ponto; o Painel em "N de M" com "(P%)" e a linha do que é
chama acesa. A linha "Meta da célula batida: 1 dia seguido" aparece na captura 4 (uma célula em
que todos leram hoje).

**O que ficou de fora.** O painel da igreja e o relatório continuam com a porcentagem da chama por
célula (é a comparação entre células, e o texto de ajuda de lá já diz o que é).
