---
name: analise-retencao
description: Diagnostica por que pessoas novas abandonam o Geração Eleita V2 nos primeiros dias e monta o plano de correção. Traz as hipóteses típicas (muro antes do valor, leitura maior que o prometido, sem compromisso nem lembrete, ofensiva que pune o iniciante, iPhone sem push, falta de convite social), onde cada uma se mede no código (partida em 10-roteador.js, lição em 04-licao.js, ofensiva e escudos em 02-estado.js, missões em 02b-jogo.js, lembretes em notificacoes.mjs, instalar em 07c-instalar.js), as métricas agregadas do painel (painel.mjs e inteligencia.mjs: retorno, funil, retenção por turma, adoção), como acrescentar um funil sem nomes, o formato do diagnóstico em docs/ e os princípios de correção. Use quando perguntarem sobre retenção, abandono, churn, onboarding, "D1/D7", "por que param", ou antes de mexer em lembretes, ofensiva, tutorial de instalar, convite de notificações ou convite de amigos.
---

# Análise de retenção nos primeiros dias

A pergunta é sempre a mesma: **o que acontece entre o cadastro e o sétimo dia que faz a pessoa
não voltar?** A resposta boa tem três partes: a evidência (medida no app, não suposta), a causa
ordenada por impacto, e um plano que respeite o jeito do produto ("Não é placar", no README:
sem culpa, sem cobrança, nada de madrugada, nada de spam).

## 1. Antes de diagnosticar: meça

1. Rode a skill `jornada-usuario` nos dois caminhos (`plano` e `conhecer`), 1 dia e 7 dias, e uma
   rodada com `PULAR=2,3`. Os números dela (toques, campos, interrupções, palavras, promessa × leitura
   real, o que o app faz quando a pessoa volta) são a evidência da metade das hipóteses abaixo.
2. Leia `docs/inteligencia.md` (o que o painel já mede e por quê não há eventos por tela) e, se
   houver dados reais do painel com você, anote `retorno`, `funil`, `turmas` e `adocao` de hoje.
3. Anote o commit (`git rev-parse --short HEAD`) e a data: todo número do diagnóstico leva os dois.

## 2. As hipóteses, onde cada uma vive no código e como medir

| # | Hipótese | O que o código faz hoje | Como medir | Medido em 02/10/2026 (3b66c59) |
|---|---|---|---|---|
| H1 | **Muro antes do valor**: a pessoa precisa atravessar cadastro, tutorial e pedidos antes de ler uma linha da Bíblia | `src/entrar.html`: 3 passos, 5 campos e o consentimento obrigatório. `src/app/10-roteador.js` (`// ---------- partida`): depois da abertura vêm, nesta ordem, o tutorial de instalar (`07c-instalar.js`, por `localStorage cc.instalar` que o cadastro grava), o convite de notificações (`07d-notificacoes.js talvezOferecerNotificacoes`), consentimento, completar cadastro, `avisosDoDia`, check-in, e o convite de notificações de novo. Nada disso espera a primeira leitura | `jornada.mjs`: coluna "Até o texto bíblico" e as interrupções, com as capturas `d01-p13..p15` | 9 toques + 5 campos e 2 folhas (Instalar no celular, Notificações) antes do texto; 620 palavras nas telas até ali. No Conhecer, 10 + 5 |
| H2 | **Leitura maior que o prometido**: a página promete "15 minutos por dia" e "O primeiro dia leva 15 minutos" (`entrar.html`) | `CC.minutosDoDia` em `03-trilha.js`: 4 min por capítulo, arredondado a 5; o Conhecer estima 6 versículos/min (`05b-conhecer.js minutosDoConhecer`) | o comando da seção 3 (palavras da NBV por dia a 200 palavras/min) e a linha "prometeu × leu" do relatório da jornada | a promessa fecha: dia 1 = 2362 palavras (uns 12 min, o app diz 15); dias 2, 4 e 6 ficam em 5 a 7 min; o dia 7 (Gn 16-18 + Mt 5) é o mais pesado da semana, 2753 palavras. O dia 1 é um dos pesados: Gênesis 1-3 inteiro mais Mateus 1 (a genealogia) |
| H3 | **Sem compromisso e sem lembrete**: ninguém pergunta "a que horas você vai ler amanhã?", e o lembrete só existe para quem aceitou push | `notificacoes.mjs decidir()`: no máximo 3 automáticas por dia (9h, 12h e a hora escolhida, padrão 19:00), silêncio 22h30 às 7h, nada depois que a pessoa leu; quem some recebe "volta" a partir do **3º** dia sem ler (`DIAS_DE_VOLTA`: 3 a 7 diário, depois 9, 11, 14, 21, 30). A hora só se escolhe em `#/config/notificacoes`. O convite (`07d`) aparece uma vez; "Agora não" repete uma única vez, 7 dias depois, e nunca mais | painel: "Com notificação ligada" (`notificacao`, a partir de `comPush`) contra o total de contas; `jornada.mjs`: `Notification.permission` ao fim do dia e se o convite apareceu; regras: `node ferramentas/teste-notificacoes-regras.mjs` | no dia 1 o convite chega antes de qualquer leitura, junto com o tutorial; quem diz "Agora não" fica 7 dias sem lembrete nenhum, justo os dias em que mais se abandona |
| H4 | **Ofensiva que pune o iniciante**: a mesma regra de escudo vale para o dia 2 e para o dia 200 | `02-estado.js CC.simularOfensiva`: escudo começa com 1, ganha 1 a cada 7 dias seguidos e 1 a cada mês, guarda no máximo 2; um buraco é coberto inteiro só se houver escudos para todos os dias dele, senão a ofensiva zera (e nenhum escudo é gasto). `10-roteador.js avisosDoDia`: aviso "Seu escudo cobriu ontem", folha "Ainda tem brasa" (sem culpa, com "Reavivar hoje"). `notificacoes.mjs`: aviso "ofensiva em risco" às 21h só com ofensiva ≥ 2 | `jornada.mjs` com `PULAR=2` (um dia: o escudo cobre) e `PULAR=2,3` (dois dias: zera); painel `ofensivas` por faixa; `inteligencia.mjs ofensivaPerdida` (só alerta perdas de 7 dias ou mais: o iniciante que perde 2 dias não aparece para ninguém) | dois dias sem abrir na primeira semana zeram a chama (recorde 1) e a volta já começa pela folha de recomeço; o tom é bom, a matemática não distingue iniciante |
| H5 | **iPhone sem push**: no iOS só há notificação com o app instalado na tela de início | `07d-notificacoes.js`: `suportado()` é falso fora do app instalado no iPhone, então o convite nem aparece; `07c-instalar.js`: o tutorial é pulável na primeira abertura ("Pular por agora") e só volta por Perfil › Instalar no celular | o app não guarda o sistema (privacidade); use "contas sem notificação" como teto, e a jornada para ver que o tutorial vem antes de qualquer valor e é pulado | quem pula o tutorial no iPhone fica sem lembrete nenhum, para sempre, e nada o convida de novo |
| H6 | **Falta de convite social cedo**: ler junto é o que segura (propósito em dupla, célula, toque), mas nada nos primeiros dias chama alguém | `08-amigos.js` (Juntos, `#/novidades`: "convidar" só se a pessoa for lá), `08b-propositos.js` (propósitos e célula: o link da célula vem do líder), `avisosDoDia` só mostra toque de quem já é amigo | painel `origens` (direto, convite, conhecer, célula), propósitos ativos, `turmas` por origem se houver; jornada: nenhum passo social nos dias 1 a 7 | zero convites sociais nos 4 dias medidos; o fim do dia diz "Até amanhã, Joana!" e nada mais |

Hipóteses de segunda ordem, quando as seis não explicam: o app vive numa aba de navegador que
some (sem ícone, sem push, a pessoa precisa lembrar do endereço); o primeiro dia abre com a
genealogia de Mateus 1 depois de três capítulos de Gênesis; a reflexão pede 3 etapas e 4 toques
depois de "Concluir o dia" (há "Pular por hoje", mas discreto); o cadastro pede data de nascimento
e e-mail antes de mostrar qualquer coisa do app.

## 3. O que medir no código (comandos prontos)

```sh
# palavras e minutos reais de cada dia do plano (NBV), contra o que o app promete
node -e "
const fs=require('fs');const D=JSON.parse(fs.readFileSync('conteudo/conteudo.json','utf8'));const B=JSON.parse(fs.readFileSync('conteudo/biblias/nbv.json','utf8')).livros;
const pal=(t)=>{let n=0;for(let k=t.de;k<=t.ate;k++)for(const v of (B[t.livro][k-1]||[]))n+=String(v).split(/\s+/).filter(Boolean).length;return n;};
for(const d of D.plano.slice(0,14)){const n=d.trechos.reduce((s,t)=>s+pal(t),0);const c=d.trechos.reduce((s,t)=>s+t.ate-t.de+1,0);
console.log('dia',d.numero,[d.antigo,d.novo].filter(Boolean).join(' · '),'·',n,'palavras ·',Math.round(n/200),'min · app diz',Math.max(5,Math.round(c*4/5)*5));}"

# as regras de lembrete, hora a hora, sem servidor
node ferramentas/teste-notificacoes-regras.mjs

# a ofensiva com um calendário qualquer, na própria página (servidor de teste de pé, conta aberta):
# as datas são o que a pessoa leu e "hoje" é a referência; troque e veja em quantos dias sem ler a chama apaga
CHROME=$CHROME BASE=http://localhost:8685/ COOKIE="$(cat /tmp/painel/cookie-rute.txt)" \
  ACAO="JSON.stringify(CC.simularOfensiva(new Set(['2026-10-02','2026-10-05']), '2026-10-06'))" \
  node design/ferramentas/foto-conta.mjs 390 844 /tmp/painel/ofensiva.png '#/'
# imprime "acao: {atual, recorde, escudos, protegidos, zerouEm, ...}"
```

Onde cada regra mora (procure pelo nome, não por linha):

- `src/app/10-roteador.js`: `partida` (a ordem do que aparece), `avisosDoDia`, `CC.aberturaSaiu`.
- `src/app/07c-instalar.js`: `CC.tutorialInstalar({ contaNova })`, `sistemaProvavel()`, `CC.rodandoComoApp()`.
- `src/app/07d-notificacoes.js`: `CC.talvezOferecerNotificacoes` (as condições e a marca `cc.aviso.push`), `CC.ativarNotificacoes`.
- `src/app/04-licao.js`: `telaLeitura` (Ler aqui, Marcar como lido, Concluir o dia), `iniciarCelebracao`, `ETAPAS` da reflexão, `telaResumo` ("Até amanhã, Nome!").
- `src/app/03-trilha.js`: `CC.minutosDoDia`, a folha do topo com os dois cartões e o balão.
- `src/app/02-estado.js`: `CC.datasFeitas`, `CC.simularOfensiva`, `CC.sequencia`.
- `src/app/02b-jogo.js`: missões do dia, baús (dia 7, 14...), conquistas; `CC.diaDoDiario` (o que a pessoa fez em cada dia).
- `notificacoes.mjs`: `decidir`, `DIAS_DE_VOLTA`, `SILENCIO`, `PREFERENCIAS_PADRAO`, os textos em `T`.
- `servidor.mjs`: `conferirProgresso` (a régua dos 7 dias), `avisoSocial`, `rodadaDeLembretes`.
- `contas.mjs`: `anotarAcesso` (o dia em que a conta abriu o app: só a data, 90 dias; é o único sinal de "abriu sem ler").

## 4. As métricas agregadas que já existem

Painel do administrador (`CAMINHO_ADMIN`), em `#/config/painel` (`src/app/07e-painel.js`):

- `painel.mjs montarPainel()`:
  - `retorno` (`MARCOS_DE_RETORNO` = 1, 7, 30): das contas com idade para isso, quantas leram de
    novo N dias ou mais depois de criadas. É o D1/D7/D30 do produto ("o hábito pegou?").
  - `funil`: Criaram a conta → Leram 1 dia → 7 → 30 → 90 (por dias lidos no total).
  - `turmas`: 6 turmas semanais pela semana do cadastro; `s1`, `s2`, `s4` = % que leu na 1ª, 2ª e 4ª
    semana depois do cadastro (só quando a semana já fechou). É a retenção por coorte.
  - `porDia` (30 dias: quantas contas leram e quantas abriram o app), `resumo` (esta semana contra a
    anterior: abriram, leram, novas), `novasPorSemana`, `ofensivas` por faixa, `parados` por faixa
    de dias lidos (quem não lê há 7 dias ou mais), `origens` (direto, convite, Conhecer, célula),
    `notificacao` ("Com notificação ligada"), `desafios`.
- `inteligencia.mjs`:
  - `adocao()`: abriram e leram hoje, média dos 7 dias fechados, `retencao` simples (contas com 30
    dias ou mais que leram nos últimos 7).
  - `funil()` da caminhada (primeiros passos, decidiu, batizado, acompanha alguém), `ofensivaPerdida()`
    (o gatilho do cuidado: perda de 7 dias ou mais, nos últimos 14, sem recomeço de 3 dias).
  - A igreja de longe nunca tem nomes; o líder vê nomes só da própria célula (`docs/inteligencia.md`).

Para ver tudo isso cheio num servidor de teste:

```sh
mkdir -p /tmp/painel && CAMINHO_ESTADO=/tmp/painel/estado.json CAMINHO_ADMIN=marcos nohup node servidor.mjs 8685 > /tmp/painel/servidor.log 2>&1 &
echo $! > /tmp/painel/servidor.pid
BASE=http://localhost:8685/ SAIDA=/tmp/painel node design/ferramentas/semear.mjs
BASE=http://localhost:8685/ SAIDA=/tmp/painel node design/ferramentas/semear-inteligencia.mjs api
kill "$(cat /tmp/painel/servidor.pid)"; sleep 1            # a etapa "banco" escreve direto no SQLite
SAIDA=/tmp/painel DADOS=/tmp/painel node design/ferramentas/semear-inteligencia.mjs banco
CAMINHO_ESTADO=/tmp/painel/estado.json CAMINHO_ADMIN=marcos nohup node servidor.mjs 8685 > /tmp/painel/servidor.log 2>&1 &
echo $! > /tmp/painel/servidor.pid
curl -s -H "cookie: $(cat /tmp/painel/cookie-marcos.txt)" http://localhost:8685/api/painel | head -c 600
CHROME=$CHROME BASE=http://localhost:8685/ COOKIE="$(cat /tmp/painel/cookie-marcos.txt)" CHEIA=1 \
  node design/ferramentas/foto-conta.mjs 390 844 /tmp/painel/painel.png '#/config/painel'
```

A etapa "banco" existe porque a API recusa leitura com mais de 7 dias de atraso e o servidor só
relê as tabelas da célula na subida: histórico longo entra com o servidor parado.

## 5. Acrescentar um funil sem nomes

O lugar é o `funil` de `painel.mjs montarPainel()`: uma lista de `{ faixa, contas }` calculada a
partir do que cada pessoa tem (`datas`, `acessos`, `criadaEm`, `origem`, `comPush`), sem nome e sem
texto. Etapas que faltam hoje e cabem no mesmo molde:

```js
// painel.mjs, dentro de montarPainel(), depois do funil atual
const noDia = (p, n) => p.datas.some((d) => d === somaDias(p.criadaEm, n));
const abriuNoDia = (p, n) => p.acessos.has(somaDias(p.criadaEm, n));
const funilDosPrimeirosDias = [
  { faixa: 'Criaram a conta', contas: pessoas.length },
  { faixa: 'Leram no dia do cadastro', contas: pessoas.filter((p) => noDia(p, 0)).length },
  { faixa: 'Abriram no dia seguinte', contas: pessoas.filter((p) => abriuNoDia(p, 1)).length },
  { faixa: 'Leram no dia seguinte', contas: pessoas.filter((p) => noDia(p, 1)).length },
  { faixa: 'Leram em 3 dos 7 primeiros', contas: pessoas.filter((p) => [0, 1, 2, 3, 4, 5, 6].filter((n) => noDia(p, n)).length >= 3).length },
  { faixa: 'Com notificação ligada', contas: pessoas.filter((p) => comAviso.has(p.usuario)).length },
];
```

Regras para não quebrar o combinado de privacidade: só contagens e percentuais; nada por pessoa
na igreja de longe; se precisar de um sinal novo (por exemplo "instalou na tela de início"),
grave na conta só uma data, como `acessos` faz em `contas.mjs anotarAcesso`, nunca o que a pessoa
escreveu nem o aparelho dela; mostre a etapa em `07e-painel.js` ao lado do funil que já existe; e
cubra com um `checar(...)` na seção `painel pastoral agregado` de `teste.mjs`, que já chama
`montarPainel` com contas inventadas.

## 6. O diagnóstico: formato

Arquivo `docs/retencao-<AAAA-MM-DD>.md` (os docs anteriores em `docs/revisao-*` são o modelo de
tom: direto, em português de conversa, com "nada disto foi publicado" quando for o caso).

1. **Resumo** em três linhas: o que mais custa, o que mais ajuda, o que fazer primeiro.
2. **Como foi medido**: comando, commit, data; links para a pasta da jornada e para as capturas
   citadas (as capturas não vão para o git: diga o caminho).
3. **Causas por impacto**: uma tabela com `#`, causa, evidência (número + arquivo e função + captura),
   quem atinge (todos, só iPhone, só quem pulou o tutorial...), impacto estimado, esforço, correção
   proposta. Ordene pelo produto impacto × certeza, não pelo esforço.
4. **Plano em rodadas**: rodada 1 só com o que é barato, seguro e reversível (ordem de telas,
   textos, uma pergunta a mais); rodada 2 com regras (escudo do iniciante, dia de volta); rodada 3
   com o que pede dado novo. Cada item com a métrica que deve mexer e o número de hoje.
5. **O que não muda**: o tom sem cobrança, nada por nome na igreja, nada de madrugada, o consentimento
   antes de qualquer dado de fé, o carimbo e a paleta aprovados.
6. **Como vamos saber**: a jornada antes e depois (mesma tabela), `retorno` D1/D7 e `turmas` s1 nas
   próximas semanas.
7. Decisões que mudam o fluxo ficam em lista `- [ ]` para o dono marcar, como em
   `docs/revisao-2026-09-29/reflexoes-checklist-dias-1-181.md`.

## 7. Princípios de correção, traduzidos para este app

- **Primeira vitória rápida**: nada entre a conta criada e o texto bíblico. Hoje o tutorial de
  instalar e o convite de notificações vêm antes da leitura; o lugar deles é depois do primeiro
  "Concluir o dia" (ou no dia 2), quando a pessoa já sentiu o valor. O cadastro pode pedir só o
  essencial primeiro e o resto depois (há `CC.completarCadastro` para contas incompletas).
- **Compromisso pequeno**: ao fim do dia 1, uma pergunta só: "Amanhã, a que horas?", gravando a
  hora do lembrete (`PREFERENCIAS_PADRAO.hora`) sem passar por Configurações. "Até amanhã, Joana!"
  vira "Até amanhã às 19h, Joana!". Mostre o tamanho real do dia seguinte ("Gênesis 4-5, uns 5 min").
- **Lembrete na hora certa**: o "volta" começa no 3º dia sem ler; para quem tem menos de uma semana
  de conta, o dia 2 é o que decide. E lembrete não é só push: o app pode abrir já no dia de hoje,
  com o balão aberto, sem tela antes.
- **Perdão ao iniciante**: um escudo a mais (ou um buraco de 2 dias coberto) na primeira semana;
  recorde que não some; "Ainda tem brasa" já está no tom certo, mantenha. A regra vive só em
  `CC.simularOfensiva`, e o servidor usa o mesmo arquivo: mudança ali conta igual nos dois lados
  (`teste.mjs` cobre a simulação; rode).
- **Social cedo**: ao fim do dia 1 ou 2, "Chama alguém para ler junto" com o convite que já existe
  em Juntos (`[data-convidar]`), e o link da célula quando a pessoa veio por ela. Um toque de amigo
  no dia 2 vale mais que três lembretes.
- **O que não fazer**: contadores de culpa, "você perdeu", notificação à noite, pedir avaliação,
  esconder o "Pular"; nada que contrarie o README ("Não é placar") e o cabeçalho de `notificacoes.mjs`.

## 8. Validar uma correção

1. `node build.mjs` e reinicie qualquer servidor de teste (a CSP é calculada na subida).
2. `node teste.mjs` (regras de progresso, ofensiva, painel) e, conforme o que mudou:
   `ferramentas/teste-notificacoes-regras.mjs`, `teste-notificacoes.mjs` (push de ponta a ponta,
   portas 8213 e 8214), `teste-propositos-regras.mjs`, `teste-redesenho.mjs` (cadastro, trilha,
   lição), `teste-instalar.mjs` (tutorial), `teste-app-ios.mjs`. Rode com `CHROME=<chrome>`.
3. A jornada de novo, nos dois caminhos, e a tabela "antes × depois" no doc.
4. Textos novos: português de conversa, sem travessão (o `teste.mjs` reprova travessão no conteúdo),
   sem emoji, sem cobrança; passe pela skill `revisao-uiux` (frente "texto").

## 9. Conteúdo e interesse (as três notas)

Barreira removida não segura ninguém se o dia não interessa. Além das hipóteses da seção 2, o
diagnóstico julga o CONTEÚDO dos primeiros dias como produto, com três notas de 0 a 5, dia a dia
(dias 1 a 7 do plano, os dois primeiros do Conhecer Jesus e os Primeiros passos), olhando a tela
inteira (o que a pessoa vê antes, durante e depois de ler), e não só o texto da reflexão:

- **Personalidade** (o contrário de genérico): o texto poderia estar em qualquer app devocional?
  Cite o trecho real (`04-licao.js telaLeitura`: "Leitura de hoje. Leia aqui ou na sua Bíblia e
  marque ao terminar"; `03b-fala-do-dia.js FALAS`; a frase sorteada de `CC.FRASES_OFENSIVA` no
  resumo; `notificacoes.mjs T`) e escreva a versão com personalidade ao lado.
- **Tchan**: o momento "uau" do dia (um detalhe do texto, uma ligação entre as duas passagens, uma
  pergunta que incomoda) e EM QUE PONTO ele chega. No plano, o melhor do dia (a reflexão escrita,
  `ferramentas/reflexoes/unidade-NN.json`) só aparece depois de "Concluir o dia"; quem para no meio
  da leitura nunca o vê. Procure o tchan na NBV da leitura (`conteudo/biblias/nbv.json`), nunca de
  memória, e sob as regras de `ferramentas/reflexoes/CLAUDE.md` (só a leitura do dia, citação da
  NBV, sem absoluto sem prova, sem tradição de pregação).
- **Contexto**: antes de ler, a pessoa sabe quem escreveu, para quem, quando, onde está na grande
  história (criação → queda → promessa → povo → reino → exílio → espera → Jesus → igreja → nova
  criação, a divisão da nota "00 - Início/A história bíblica em uma página") e por que as duas
  passagens andam juntas? Os fatos de autoria e data vêm das fichas "03 - Livros da Bíblia/<livro>"
  em `conteudo.json` (sempre com "pela tradição" quando a ficha diz "tradicionalmente").

Onde o conteúdo dos primeiros dias mora: `conteudo/conteudo.json` (`plano`, `licoes` e as notas que
elas abrem, `reflexoes`), `conteudo/conhecer.json`, `conteudo/perguntas-honestas.json`,
`conteudo/primeiros-dias.json` (o contexto, o "procure", o "amanhã" e os guias de leitura dos
trechos de lista; `src/app/03c-contexto.js` desenha), `ferramentas/reflexoes/unidade-01.json`
(os 31 dias da Unidade 1, com título, texto, perguntas e oração). Medidas que ajudam: palavras de
cada trecho (o comando da seção 3), quantos versículos são lista (Mateus 1.1-17 tem 333 das 527
palavras do capítulo; Gênesis 5 repete "morreu" 8 vezes), tamanho de cada Primeiro passo
(`txt(n.html).split(' ').length`: 635 a 877 palavras).

O diagnóstico ganha uma seção própria, "Conteúdo e interesse", com a tabela das três notas por
dia, os trechos genéricos com a versão proposta, o tchan de cada dia (criado quando não há) e a
proposta de contexto. Modelo: `docs/retencao-primeiros-dias.md`, seção 4.

## 10. Armadilhas conhecidas

- Servidor de teste: `CAMINHO_ESTADO=<pasta>/estado.json [CAMINHO_ADMIN=marcos] node servidor.mjs <porta>`,
  sempre com o PID guardado (`echo $! > servidor.pid`) e morto por ele; se não cair em 2 s, `kill -9`.
  Nunca `pkill -f` com um padrão da sua própria linha de comando.
- Portas: 8680 a 8689 costumam estar livres; os testes usam 8212 a 8214 e 8350 a 8351.
- Dados semeados valem para o dia em que foram semeados: noutro dia, apague a pasta e semeie de novo,
  senão a ofensiva de todo mundo zera e o painel mente.
- `CAMINHO_RELOGIO` não move o "hoje" das leituras (só os avisos sociais, com `CAMINHO_PUSH_TESTE=1`);
  para simular dias use `design/ferramentas/analise/relogio.mjs` (veja a skill `jornada-usuario`).
- `node build.mjs` nunca durante um teste de navegador na mesma pasta.
- O que aparece na partida ganha do que aparece depois: até 02/10/2026 `10-roteador.js` mostrava o
  tutorial de instalar na primeira abertura e apagava `cc.instalar`, e o código de `04-licao.js
  telaResumo` que faria isso depois da primeira leitura nunca rodava. Quando duas telas disputam a
  mesma marca, confira na jornada qual delas de fato aparece (e onde), não só no código.
- Os números do painel com dados semeados são de brinquedo: servem para ver as telas e conferir
  fórmulas, não para concluir nada sobre pessoas.
