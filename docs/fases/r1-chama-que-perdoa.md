# R1: A chama que perdoa

Objetivo: ninguém desistir por perder a sequência. Vem do roadmap de melhorias (fase R1) e das
recomendações 1, 2 e 5 do estudo do YouVersion. Tom de todos os textos: gentil, curto, sem culpa
("Perder um dia não é perder a Palavra").

A fase é feita em partes, uma de cada vez, cada uma com o seu commit e os seus testes:
R1.1 dias com a Palavra, R1.2 semanas completas, R1.3 escudo automático, R1.4 reacender a chama,
R1.5 um toque por dia por amigo.

## R1.1 · Dias com a Palavra

Um contador que nunca zera, ao lado da chama: "N dias com a Palavra".

**O que conta.** Cada data do calendário em que houve leitura: dia do plano lido no app ou marcado
como "Li na minha Bíblia", primeiro passo lido até o fim ou dia do Conhecer Jesus. São as mesmas
datas que acendem a chama (`CC.datasFeitas`). Ler três dias do plano na mesma data conta um dia: o
número é de dias com a Palavra, não de dias do plano (esse continua no Perfil, "dias do plano").
A Bíblia livre, fora do plano, não conta, como não conta para a chama.

**Nunca cai.** Falta não mexe nele. O "Zerar progresso" também não: antes de apagar a trilha, as
datas lidas vão para `diasComPalavra` (uma lista de datas ISO, fora do `PROGRESSO_DA_TRILHA`). O
total é `CC.diasComAPalavra()`: a união dessas datas com as de agora, sem repetir.

**Entre aparelhos e no servidor.** `diasComPalavra` se funde por união (`fundir`), e
`normalizarEstado` guarda só datas ISO válidas, sem repetir, em ordem. O servidor aplica a mesma
regra das outras datas (`conferirProgresso`, em `servidor.mjs`): uma data guardada que ele nunca
viu (nem lida, nem guardada antes) só entra se estiver dentro da janela de 7 dias de atraso.
Assim ninguém inventa anos de leitura com um pedido forjado. O número é só da pessoa: não vai
para amigos, célula, discipulado nem painel.

**Onde aparece.**
- Início, cartão da chama: com a chama acesa, numa linha menor embaixo ("12 dias com a Palavra"),
  só quando passa da sequência de agora; com a chama apagada, o cartão inteiro vira "12 dias com
  a Palavra", no lugar do zero (antes mostrava o recorde).
- Folha da chama: uma linha abaixo do recorde, "Dias com a Palavra · No app ou na sua Bíblia.
  Nunca volta a zero." Com a chama em zero, o número grande da folha é este, e a linha some.
- Folha de volta ("Ainda tem brasa", a que abre depois de uma falta): o número em destaque é este,
  com "Perder um dia não é perder a Palavra".
- Dia lido: uma linha discreta abaixo da chama, quando o total passa da sequência (quem voltou).
- Exportação ("Baixar o que escrevi"): uma linha no progresso.

A pílula da chama no topo das outras abas ficou como estava: com o número a mais, ela não cabia
ao lado do sino a 320px.

No Perfil (depois da R1.2), "dias com a Palavra" fica ao lado de "dias de ofensiva", na Visão geral.

**Privacidade.** Ajuste da versão 6 da política (15 de novembro de 2026): o "Zerar progresso"
passa a guardar as datas de leitura, só a data.

**Testes.** `teste.mjs` (contagem, papel, mesma data, fusão, normalização, Zerar no aparelho e no
servidor, data inventada recusada) e `ferramentas/teste-chama.mjs` (folha de volta, cartão do
Início, folha da chama, Dia lido, Zerar e outro aparelho, nos temas claro e escuro).

## R1.2 · Semanas completas

Um segundo número que só cresce: quantas semanas tiveram 5 dias ou mais com a Palavra.

**Qual semana conta.** A do calendário, de **segunda a domingo**, pela data local do aparelho, e
chamada pela data da segunda-feira (`CC.segundaDaSemana`). É a convenção que o app já usa no baú
semanal "Lendo junto na semana" (aba Desafios, `09b-missoes.js`, "até domingo") e na conquista
"Semanas na Palavra" (`02b-jogo.js`, que passou a usar a mesma função). Cinco dias seguidos que
atravessam o domingo (quinta a segunda) não completam nenhuma das duas semanas. O baú da trilha,
que é de 7 dias do plano e não de semana do calendário, fica de fora dessa conta.

**O que é um dia.** Os mesmos dias com a Palavra da R1.1: cada data com leitura no app, no papel,
primeiro passo ou Conhecer Jesus; duas leituras na mesma data contam um dia. Como as datas nunca
saem (nem no "Zerar", que as guarda em `diasComPalavra`), o número só cresce. A semana de agora
conta no dia em que chega a 5, sem esperar o domingo. A régua mora em `CC.DIAS_DA_SEMANA_COMPLETA`
(5). A conquista "Semanas na Palavra" continua com a régua dela, de 4 dias: é outra coisa (níveis
de 4 a 52 semanas) e mudar a régua tiraria nível de quem já ganhou.

**Funções.** `CC.semanasCompletas(estado)` e `CC.diasNaSemana(estado, hoje)`, em `02-estado.js`.
Nada novo é guardado: o número sai das datas, igual no aparelho e no servidor.

**Onde aparece.**
- Folha da chama: "Semanas completas", com "Esta semana: 3 de 5 dias." ou "Esta semana já está
  completa!".
- Perfil, Visão geral: "dias com a Palavra" e "semanas completas" ao lado de "dias de ofensiva";
  os três abrem a folha da chama.
- Dia lido: no dia em que a semana chega a 5, "Semana completa!" com "Já são N semanas
  completas." (a primeira: "Sua primeira: 5 dias com a Palavra nesta semana.").
- Exportação: na linha dos dias com a Palavra.

**Testes.** `teste.mjs` (a semana de segunda a domingo, 4 e 5 dias, a semana atravessada, 7 e 14
dias, papel e mesma data, primeiro passo, falta depois, datas do Zerar) e
`ferramentas/teste-chama.mjs` (com o "hoje" do app numa sexta: folha, Perfil, o 5º dia no papel
com a festa no Dia lido, a folha depois e a leitura repetida no mesmo dia).

## R1.3 · Escudo usado sozinho

**Como era.** Conferido antes de mudar: o escudo já era usado sem a pessoa fazer nada. A ofensiva
é recontada do começo a cada abertura (`CC.simularOfensiva`, em `02-estado.js`, a mesma conta no
aparelho e no servidor): um buraco de dias em branco é coberto inteiro se houver escudos para
todos eles; se não houver, a chama zera e nenhum escudo é gasto à toa. Começa com 1, ganha 1 a
cada mês e 1 a cada 7 dias seguidos, guarda no máximo 2. O escudo do iniciante (seção 8 de
`docs/retencao-primeiros-dias.md`) cobre uma vez, na primeira semana contada do primeiro dia lido,
um buraco de até 2 dias, sem gastar os de sempre. Hoje nunca é buraco. O servidor manda de manhã
a notificação "Seu escudo cuidou de ontem" (`notificacoes.mjs`, que ficou como estava). O que
faltava era o aviso no app: era um recado de rodapé, só quando o dia coberto era ontem e sem
dizer quantos escudos restavam nem distinguir o do iniciante.

**O que mudou.** Só o aviso, na próxima abertura:
- `CC.escudoParaAvisar(seq, hoje, ultimoAvisado)` (`02-estado.js`) devolve os dias cobertos dos
  últimos 3 dias que este aparelho ainda não avisou, e se foi o escudo do iniciante. Com a chama
  apagada não devolve nada (aí fala a folha de volta). A marca `cc.aviso.escudo` guarda
  `dono:último dia avisado`, no mesmo formato de antes.
- A folha (peça sob demanda `src/sob-demanda/chama.js`, para a folga do index.html): "Um escudo
  cuidou da sua chama" / "Ontem ficou em branco, e o app usou um escudo por você. A chama segue
  acesa: N dias seguidos." / "Ainda resta 1 escudo." Dois dias: "Seus escudos cuidaram da chama".
  Iniciante: "O escudo do iniciante cuidou da chama ... ele cobriu sem gastar os seus escudos."
  Sem escudo sobrando: "O próximo escudo chega com 7 dias seguidos ou no mês que vem." Botões
  "Ler hoje" e "Agora não" (ou "Que bom!", se já leu hoje). Sem a peça (sem rede na primeira
  vez), um recado curto.
- Enquanto a peça chega, a partida não abre outra folha por cima (`avisosDoDia` devolve
  'esperando').
- Folha da chama: "Se um dia ficar em branco, o app usa um sozinho."

**Entre aparelhos.** O gasto do escudo sai das datas, então é o mesmo em todo aparelho e no
servidor. O aviso é de cada aparelho: quem abre outro aparelho até 3 dias depois também é avisado.

**Testes.** `teste.mjs` (1 dia, dia já avisado, outro aparelho, mais de 3 dias, dois escudos,
iniciante, chama apagada) e `ferramentas/teste-chama.mjs` (o aviso na abertura nos dois temas,
uma vez só, nada por cima, a folha da chama, e o escudo do iniciante).
