# R2: Quem atrasou volta sem culpa

Objetivo: atraso não vira abandono. Vem do roadmap de melhorias (fase R2) e das recomendações 3,
4, 7 e 14 do estudo do YouVersion. Tom de todos os textos: gentil, curto, sem culpa ("Perder um dia
não é perder a Palavra").

A fase é feita em partes, uma de cada vez, cada uma com o seu commit e os seus testes:
R2.1 ficar em dia em dois caminhos, R2.2 primeiro dia de 5 minutos, R2.3 Dia lido com opção de
pular a festa, R2.4 integridade do progresso.

## R2.1 · Ficar em dia em dois caminhos

**Como era.** O plano não tem calendário: o dia em que a pessoa está é o escolhido (o último
aberto), se ainda não foi lido, ou o primeiro não lido (`CC.diaAtual`). Quem parava uma semana
voltava exatamente de onde parou, sempre, e ficava atrás da célula para o resto do ano. Não havia
"dia da célula" no app: o mais perto disso era a semana do roteiro "A leitura da semana", que sai do
que o líder já leu (`semanaDoLider`, em `regras-app.mjs`).

**O dia da célula.** `diaDaCelula(estadoDoLider, hoje)` (`regras-app.mjs`): o maior dia do plano
lido pelo líder, se ele o leu hoje (no fuso dele); senão, o seguinte; 0 quando o líder ainda não
leu nada. É o mesmo critério da semana do roteiro: quem conduz o encontro é o líder. O retrato da
célula (`api/propositos`, `celulaNoRetrato`) leva `diaDaCelula` para todos da célula; quem só foi
convidado recebe 0. No app, `CC.diaDaCelula()` (`03-trilha.js`) fica com o maior entre as células
da pessoa.

**Quem vê o convite.** Quem está 2 dias ou mais atrás do dia da célula (`CC.volta.ATRASO_MINIMO`):
um dia atrás é normal (o líder leu de manhã). Quem não tem célula, o líder (que é o dia da célula)
e quem está em dia não veem nada, e a peça nem é pedida. Sem célula, o plano não tem calendário:
"No meu ritmo" já é o que acontece (ver "O que ficou de fora").

**Os dois caminhos.** No Início, logo abaixo do "Ler hoje", o cartão "Ficar em dia com a célula ·
Ela está no dia 40. Perder um dia não é perder a Palavra." Tocar abre a folha "Ficar em dia":
- **Com a célula** (vem marcado, com o selo "Recomendado"): "Vá para o dia 40, o que a sua célula
  está lendo. Os dias 31 a 39 ficam pendentes: sem cobrança, para ler quando quiser."
- **No meu ritmo**: "Continue do dia 31, de onde você parou."
- Embaixo: "Um dia pendente só conta como lido depois que você o lê. A chama segue os dias em que
  você lê, qualquer que seja o dia do plano." Botões "Continuar" e "Agora não".

"Com a célula" grava `pulouPara` (o dia para onde a pessoa pulou) e `dia`, e avisa "Pronto: você
está no dia 40, com a sua célula." "No meu ritmo" não muda nada no progresso; o convite sai do Início
por 7 dias neste aparelho (`cc.volta.ritmo`, "dono:até"), para não virar cobrança diária. "Agora
não" só fecha a folha: o cartão continua no Início.

**Os pendentes.** São os dias do plano antes de `pulouPara` que ainda não foram lidos. Não são
guardados: saem do estado, iguais em todo aparelho (`CC.volta.pendentes`). Aparecem:
- no Início, numa linha discreta abaixo do "Ler hoje": "9 dias pendentes · sem pressa";
- numa folha com a lista (dia, passagem e minutos), que abre o dia tocado: "Os dias que ficaram
  para trás quando você foi ler com a célula. Sem pressa e sem cobrança: leia quando quiser.";
- na Trilha, nos nós desses dias: contorno tracejado em sálvia, sem cadeado nem cor de alerta, e
  "pendente" no rótulo para o leitor de tela.

Um pendente se lê como qualquer dia (no app ou "Li na minha Bíblia") e sai da lista. Ler um
pendente acende a chama de hoje (é uma leitura), mas a leitura de hoje do Início continua sendo o
dia da célula: `diaLidoHoje` (`03-trilha.js`) não conta um pendente. No Dia lido de um pendente, o
"Amanhã" vira "Hoje, com a célula (dia 40): ..." enquanto o dia da célula não for lido hoje.

**O dia em que a pessoa está.** A conta saiu de `03-trilha.js` para `02-estado.js`
(`CC.diaDoPlano(estado)`; `CC.diaAtual` a chama): o escolhido, se ainda não foi lido e não é de antes
do pulo; senão o primeiro não lido a partir de `pulouPara`; lido tudo dali para a frente, sobram os
pendentes. Sem pulo, é a regra de antes. O servidor tem o espelho em `leituraDoDia`
(`notificacoes.mjs`): o lembrete fala do dia da célula, e não de um pendente.

**Sem recompensa por pular.** Pular só muda o dia em que a pessoa está. Nada vai para `lidos`,
`marcadoEm` ou `origens`, então:
- **baú**: continua pedindo o dia do baú lido e 5 dos 7 dias lidos no app; o baú de uma semana
  pulada fica fechado até a semana ser lida de verdade;
- **cartas**: unidade e "dias" contam só dias lidos no app; nada é pago pelo pulo;
- **chama, dias com a Palavra, semanas completas**: saem das datas, que o pulo não toca;
- **servidor** (`conferirProgresso`): nada novo a conferir, porque `pulouPara` não dá nada.
  `normalizarEstado` guarda só um dia inteiro do plano (2 a 365), senão 0.

**Entre aparelhos.** `pulouPara` se funde pelo maior (`fundir`): um aparelho antigo, que não pulou,
não traz a pessoa de volta. Fica no `PROGRESSO_DA_TRILHA`: o "Zerar" recomeça do dia 1, sem pulo,
também quando chega de outro aparelho. Outro aparelho sem nada guardado abre no dia da célula, com os
mesmos pendentes.

**Onde mora o código.** Para a folga do index.html (piso de 60 KB), tudo o que é tela fica na peça
nova `src/sob-demanda/volta.js` (e `volta.css`): o cartão, a linha, as duas folhas e a marca nos
nós. No index ficam `CC.diaDoPlano` e `pulouPara` (`02-estado.js`), `CC.diaDaCelula`, o pedido da
peça depois de desenhar a Trilha e o filtro de `diaLidoHoje` (`03-trilha.js`). A Trilha pede a peça
só quando a pessoa está atrás da célula ou já pulou alguma vez. Custo no index: 0,6 KB (folga de
61,0 para 60,4 KB).

**Privacidade.** Segundo ajuste da versão 6 (15 de novembro de 2026): os membros da célula,
visitantes inclusive, veem em que dia do plano o líder está (só o número). Antes isso só aparecia
de forma indireta, no intervalo de dias do roteiro "A leitura da semana". O dia do pulo fica com o
progresso.

**Testes.** `teste.mjs`: o dia do plano sem pulo (como antes), com pulo, com um pendente aberto, lido
o dia da célula, lido tudo; pular não muda lidos, datas, dias com a Palavra nem semanas completas,
não abre baú nem paga carta; os pendentes; quem vê o convite; fusão pelo maior, normalização e Zerar;
o servidor e o app dizem o mesmo dia (`leituraDoDia`); `diaDaCelula`; a peça nova fora do index.
`ferramentas/teste-volta.mjs` (claro e escuro): o servidor manda o dia da célula, o cartão no Início,
a folha com "Com a célula" marcado, o pulo (no aparelho e no servidor, sem nada lido e sem carta de
leitura), a linha e a folha dos pendentes, os nós marcados, um pendente lido no papel (a lista
diminui, a pessoa segue no dia 40, o Dia lido diz "Hoje, com a célula"), outro aparelho, "No meu
ritmo" (sem pulo e sem convite na abertura seguinte), e ninguém vê o convite sem célula nem sendo o
líder.

**O que ficou de fora.**
- Sem célula, não há "atraso": o plano não tem data de início nem calendário. "No meu ritmo" é o
  que já acontece; quem volta depois de uma falta continua vendo a folha "Ainda tem brasa" (R1).
- Desfazer o pulo: não há botão. Os pendentes ficam abertos para ler a qualquer hora, e o "Zerar"
  recomeça tudo.
- A medida do roadmap ("atrasados que voltam a ler em 7 dias") não entrou no painel.

## Antes da R2.2 · Folga do index.html

Com a R2.1 a folga do index.html tinha caído para 60,4 KB (piso de 60). Num commit à parte, o quiz
do Praticar (`09-praticar.js`, 9,8 KB) virou a peça `src/sob-demanda/praticar.js`; no index ficou a
casca (`CC.vistaPraticar` com `CC.cascaDaPeca`, e `CC.fecharPratica`). O Praticar abria sem rede
mesmo nunca aberto (o `teste-offline` abre o quiz sem rede), e as peças só são guardadas quando
pedidas: para não mudar isso, o service worker guarda esta peça já na instalação
(`PECAS_DE_ANTEMAO` no `build.mjs`, `DE_ANTEMAO` no `sw.js`; só entra o que vem como script). A
folga foi para 69,9 KB. Com rede, na primeira abertura do Praticar, o título e o esqueleto aparecem
por um instante enquanto a peça chega.

## R2.2 · Primeiro dia de 5 minutos

**Como era (auditado numa conta nova, com a marca `cc.instalar` da página de entrada).** Nada cobre
o Início antes da primeira leitura: o tutorial de instalar e o convite das notificações já vinham
só depois do primeiro "Voltar à trilha" (`CC.depoisDoPrimeiroDia`, desde a correção de retenção de
02/10), e o convite das notificações nunca aparece antes de um dia feito. O Dia lido do dia 1 era
igual ao de qualquer dia ("Dia 1 lido", a chama, a semana): nada dizia que era o primeiro.

**O que mudou.** O primeiro Dia lido da vida da pessoa (o primeiro dia do plano lido, sem outra data
com a Palavra antes: quem já fez um primeiro passo ou um dia do Conhecer Jesus noutro dia não ganha esta festa)
ganha, no alto, "Seu primeiro dia com a Palavra! · Foi o começo. Agora é um dia de cada vez, Nina."
Mora na peça `dia-lido.js` (nada no index). Nada abre por cima do Dia lido; os pedidos continuam só
depois do "Voltar à trilha".

**A passagem curta: não feita, para decisão do dono.** O dia 1 do plano é Gênesis 1-3 · Mateus 1
(2.362 palavras, uns 12 minutos). Cinco minutos são umas 1.000 palavras. Não há como encurtar o dia
1 sem mexer no plano de 365 dias, que a correção de retenção lista entre o que não muda, e todo
caminho custa em outro lugar:
- dia 1 = Gênesis 1-2 (6 min) e o resto (Gênesis 3 e Mateus 1) no dia 2, que passa de 5 para 11
  minutos: pesa justo no dia 2, o que mais decide;
- um "dia 0" antes do plano (Gênesis 1, uns 3 minutos), que acende a chama e conta como dia com a
  Palavra, mas não é dia do plano;
- dar o dia 1 por lido com uma parte só: quebra a regra de leitura (fim do texto e 1/3 do tempo).
O guia de leitura do dia 1 já pula a lista de nomes de Mateus 1 para a parte que importa.

**Testes.** `teste.mjs` (a festa na peça, fora do index, e os pedidos só no "Voltar à trilha") e
`ferramentas/teste-volta.mjs` (PARTES=R2.2; claro e escuro): conta nova sem nada por cima do
Início, o leitor do dia 1 direto, a festa no alto sem rolar, nada por cima do Dia lido, o tutorial
de instalar só depois do "Voltar à trilha", e o dia 2 sem a festa.

## R2.3 · Dia lido com opção de pular a festa

**Como era.** Todo Dia lido abria com a festa inteira: faíscas em volta da chama, confete, o número
da chama subindo, a frase sorteada e cada item do que o dia trouxe entrando animado. Só quem pede
menos movimento no sistema ficava sem o confete.

**O que mudou.** Quem já é veterano, com 7 dias com a Palavra ou mais (`CC.VETERANO_FESTA`), vê no pé
do Dia lido, logo acima do "Voltar à trilha", a preferência "Mostrar a comemoração completa ·
Desligada, o Dia lido abre sem confete nem animação.", ligada por padrão. Desligada ("Pronto: daqui
para a frente, o Dia lido abre sem a festa."), o Dia lido abre sóbrio: sem faíscas, confete, número
subindo, frase sorteada nem animação de entrada. Tudo o que informa fica: "Dia N lido", a chama com o
número certo, a semana, o versículo, Pensar e Orar, o que o dia trouxe (semana completa, unidade,
amanhã, desafios), o baú e os amigos. Ligada de novo, a festa volta.

**Decisões.**
- "Pular a festa" é o Dia lido sóbrio, e não pular a tela: o Dia lido também é onde ficam o versículo
  para guardar, Pensar e Orar.
- A preferência fica neste aparelho (`cc.diaLido.festa`, como o tema e os cartões abertos do Dia
  lido), não na conta.
- Ela só aparece e só vale para veteranos: quem está começando sempre tem a festa (inclusive o
  primeiro Dia lido da R2.2), mesmo com a marca no aparelho.
- Fica só no Dia lido, sem entrada nas Configurações: é a preferência discreta que o roadmap pede, e
  não gasta a folga do index.html. Mora na peça `dia-lido.js`.

**Testes.** `teste.mjs` (a preferência e o Dia lido sóbrio na peça, fora do index) e
`ferramentas/teste-volta.mjs` (PARTES=R2.3; claro e escuro): a festa completa por padrão, a
preferência ligada no pé, desligar e o aviso, o dia seguinte sem faíscas, confete, frase e
animação e com o número certo e tudo o que informa, ligar de novo e a festa de volta, e quem
ainda não é veterano sem a preferência e com a festa.
