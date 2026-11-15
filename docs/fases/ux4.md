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

## UX4.3 · A data da parte 2 de um estudo dividido

**Como era.** Desde os próximos estudos (schema v23, `agendado_para`), a parte 2 de um estudo
dividido (`dividirEmEncontros`) já entrava na fila do servidor com data, no mesmo pedido da parte
1 (`salvarEstudo`, `seguintes`). Mas a tela nunca dizia qual: a prévia falava em "o próximo", a nota
em "ao salvar, a parte 2 entra nos próximos estudos", o passo 3 em "para o encontro seguinte" e o
aviso de salvo em "A parte 2 está nos próximos estudos." (B13 da avaliação: "no passo 3, dizer 'A
parte 2 fica agendada para quarta, 18/11'").

**Agora a data aparece em todos os passos:**
- a prévia "Dividir em 2 encontros": "Encontro 2 · quarta, 25/11" e "Você segue com a parte 1. A
  parte 2 fica para quarta, 25/11, nos próximos estudos.";
- a nota depois de dividir: "Esta é a parte 1; ao salvar, a parte 2 fica para quarta, 25/11, nos
  próximos estudos.";
- o passo 3: "Ao salvar, a célula vê a parte 1 na aba Estudo. A parte 2 fica para quarta, 25/11,
  nos próximos estudos." Agendado (ou mudando um estudo da fila), a linha fica logo abaixo da data
  e acompanha a data escolhida ("Para o encontro de 02/12" → "A parte 2 fica para quarta, 09/12");
- o aviso de salvo: "Estudo salvo. A parte 2 fica para quarta, 25/11, nos próximos estudos.", com
  a data que o servidor gravou.
Com 3 partes ou mais: "as partes 2 a 3 ficam para quarta, 25/11 e quarta, 02/12".

**Como a tela sabe a data antes de salvar.** A mesma conta do servidor, sem adivinhar:
- usada agora: o retrato de quem conduz leva `filaDepoisDoAtual` (`dadosDaFila().depoisDoAtual`,
  `primeiraDataDaFila` com `atualEspera`, exatamente o que `salvarEstudo` usa para a parte 2);
- agendada: o encontro depois da data dela (`R.encontroDepois`, a mesma regra de `estudos.mjs`);
- as seguintes, uma por encontro (`R.datasDasPartes`).
Sem a data (um retrato antigo, a data da fila vazia), a tela volta à frase sem dia. O salvar
devolve `partes: [{ data }]` (`salvarEstudo` → `datasDasPartes`), e é essa a data do aviso.
O código de tela fica nas peças `estudo-preparo` e `estudo-celula` (estudo-regras.js): o
index.html não muda (folga de 67,2 KB). Sem migração: a data já era gravada.

**Testes.** `teste.mjs`: `depoisDoAtual` dá a data da parte 2 antes de salvar e o salvar devolve a
data de cada parte (usado agora e agendado). `teste-estudo-dividir`: a prévia, a nota, o passo 3 e
o aviso de salvo dizem a data.

**O que ficou de fora.** Se a fila mudar em outro aparelho entre a prévia e o salvar, a data dita
antes pode não ser a gravada; o aviso de salvo diz sempre a do servidor.

## UX4.4 · Conquistas e Troféus numa tela só

**Como era.** O Perfil tinha quatro sistemas de prêmio (C12 da avaliação): a seção Coleção, com
três atalhos (Conquistas, Troféus e Cartas), mais o número "conquistas" na Visão geral. Conquistas
e Troféus eram duas telas (`#/perfil/conquistas` e `#/perfil/trofeus`) para a mesma ideia: o que a
pessoa já ganhou lendo.

**Agora.** Uma tela só, "Conquistas" (`CC.vistaConquistas`, `07-perfil.js`), com tudo o que havia
nas duas:
- "Por nível": as conquistas com nível (as mesmas linhas, com barra e nível);
- "Mais conquistas": as conquistas antigas (legado), quando a pessoa tem;
- "Troféus" com a conta geral, e as mesmas estantes de antes, cada uma com nome e conta: A Bíblia
  toda, Unidades do plano, Partes da Bíblia, Desafios e Álbuns de cartas (quando há álbuns).
Nada do que a pessoa ganhou sai: os dados são os mesmos (`CC.conquistasComNivel`,
`CC.conquistasLegado`, `CC.trofeus`), só mudou onde aparecem.

No Perfil, a Coleção fica com dois atalhos, "Conquistas" e "Cartas". O número de "Conquistas" (no
atalho e na Visão geral) passa a contar as conquistas com nível e os troféus ganhos, sobre o total
dos dois ("1 de 48"): é a mesma tela. As Cartas continuam à parte: têm álbum, revelação e regras
próprias.

**O endereço antigo.** `#/perfil/trofeus` (links guardados, o histórico do navegador) abre a mesma
tela, já rolada até "Troféus" (`scroll-margin-top` para não ficar embaixo da folha do alto).

**Testes.** `teste-redesenho`: o Perfil tem um atalho só, "Conquistas", com a conta (a checagem antiga da Coleção passa a esperar 2 atalhos); a tela tem
todas as conquistas e todos os troféus de `CC.trofeus()`; o endereço antigo abre "Conquistas".
`teste-bau`: a estante "Álbuns de cartas" continua lá pelo endereço antigo.

**O que ficou de fora.** O resto do C12 (Configurações, anotações e instalar com vários acessos)
já tinha sido tratado na Fase 3; as Cartas não entram na tela de Conquistas.
