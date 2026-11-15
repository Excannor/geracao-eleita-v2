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

**Privacidade.** Ajuste da versão 6 da política (15 de novembro de 2026): o "Zerar progresso"
passa a guardar as datas de leitura, só a data.

**Testes.** `teste.mjs` (contagem, papel, mesma data, fusão, normalização, Zerar no aparelho e no
servidor, data inventada recusada) e `ferramentas/teste-chama.mjs` (folha de volta, cartão do
Início, folha da chama, Dia lido, Zerar e outro aparelho, nos temas claro e escuro).
