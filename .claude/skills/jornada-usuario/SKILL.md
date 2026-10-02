---
name: jornada-usuario
description: Percorre o Geração Eleita V2 como uma pessoa nova e mede a jornada, com cadastro de verdade em src/entrar.html nos dois caminhos (plano da Bíblia em um ano e Conhecer Jesus), contando toques, campos digitados, interrupções (folhas que abrem sem a pessoa pedir), palavras nas telas e tempo até o primeiro valor (o texto bíblico na tela) e até concluir o dia; depois simula os dias 2 a 7 com o relógio do servidor e do navegador adiantados, com capturas por passo e um relatório. Use quando for avaliar o onboarding ou os primeiros dias, quando mudar entrar.html, a partida do app (10-roteador.js), o tutorial de instalar, o convite de notificações, a lição (04-licao.js), a trilha ou o Conhecer Jesus, e para produzir evidência "antes e depois" de qualquer mudança de retenção.
---

# Jornada do usuário

Uma pessoa nova chega pela página de boas-vindas, cria a conta, cai no app e precisa chegar ao
texto bíblico. Esta skill mede esse caminho de verdade, no app construído, sem atalhos: cada
botão que a pessoa toca, cada campo que digita, cada folha que o app põe na frente dela, quantas
palavras ela teve de atravessar e o que o app faz quando ela volta (ou não volta) nos dias seguintes.

O script faz tudo sozinho: sobe um servidor de teste numa pasta própria, abre um Chrome sem
interface, cadastra, lê, e no dia seguinte reabre o mesmo perfil do Chrome (cookie e localStorage
guardados, como o celular da pessoa) com o relógio adiantado.

## 1. O que sai

Em `SAIDA/` (padrão `capturas/analise/jornada/<caminho>-<data-hora>/`, que o git ignora):

- `relatorio.md`: a tabela-resumo por dia (toques e campos até o texto bíblico e até concluir, interrupções,
  palavras até o texto, tempo, ofensiva e escudos ao fim, erros) e, por dia, o que o app prometeu
  ("cerca de N min") contra o que a pessoa leu (palavras e minutos a 200 palavras/min), as
  interrupções com os botões que ofereciam, o passo a passo com a tela, as camadas abertas, as
  palavras e a captura de cada passo, o estado ao fim (o "hoje" do app, ofensiva, escudos, dias
  cobertos, `Notification.permission`, instalado como app) e o que o servidor guardou (as datas
  de `marcadoEm` ou `conhecidos`, para provar que o dia simulado foi aceito);
- `relatorio.json`: o mesmo, para comparar rodadas;
- `dNN-pNN-<passo>.png`: uma captura por passo (390×844, tema claro por padrão);
- `cookie.txt` (a sessão da conta criada, para consultar a API à mão), `servidor/` (os dados do
  servidor de teste), `perfil/` (o perfil do Chrome) e `servidor.log`.

## 2. Antes de começar

```sh
cd <raiz do repositório>            # sempre a raiz; os caminhos são relativos a ela
node build.mjs                      # o servidor de teste serve o dist/ desta pasta
export CHROME=<executável do Chrome>   # nesta máquina: um .sh que chama o chromium com --no-sandbox
```

Regras da casa que valem aqui:

- Nunca rode `node build.mjs` enquanto a jornada (ou qualquer teste de navegador) estiver rodando
  na mesma pasta: eles servem o `dist/` dela, e a CSP do servidor é calculada na subida.
- O script sorteia uma porta livre; para fixar, `PORTA=8680` (as portas 8680 a 8689 costumam
  estar livres; os testes do repositório usam 8212 a 8214 e 8350 a 8351).
- Ele mata o próprio servidor pelo PID. Nunca use `pkill -f` com um padrão que apareça na sua
  própria linha de comando: você mata a sua sessão junto.

## 3. Rodar

```sh
# o dia 1 do plano (cadastro + primeira lição): uns 40 s
CHROME=$CHROME node design/ferramentas/analise/jornada.mjs plano 1

# o dia 1 do Conhecer Jesus
CHROME=$CHROME node design/ferramentas/analise/jornada.mjs conhecer 1

# a primeira semana inteira (uns 20 s por dia; o servidor e o Chrome sobem de novo a cada dia)
CHROME=$CHROME node design/ferramentas/analise/jornada.mjs plano 7

# a pessoa some nos dias 2 e 3 e volta no dia 4: o escudo não cobre dois dias e a chama apaga
CHROME=$CHROME PULAR=2,3 node design/ferramentas/analise/jornada.mjs plano 4

# some um dia só (o escudo cobre) e volta
CHROME=$CHROME PULAR=2 node design/ferramentas/analise/jornada.mjs plano 3

# tema escuro, pasta de saída escolhida, outra pessoa
CHROME=$CHROME TEMA=escuro SAIDA=/caminho/da/rodada NOME=Pedro USUARIO=pedro node design/ferramentas/analise/jornada.mjs plano 2
```

O código de saída é 1 quando algum dia parou no meio (`erroFatal` no relatório): a captura do
último passo mostra onde.

## 4. Ler o relatório

- **Até o texto bíblico** é o primeiro valor: a Bíblia aberta na tela. Tudo antes disso é custo
  (cadastro, folhas, trilha). **Até concluir o dia** inclui a reflexão (Guardar, Pensar, Orar) e o
  resumo.
- **Interrupções** são as folhas (`.cortina > .folha`) que apareceram sem a pessoa pedir. O script
  dispensa cada uma com a opção mais branda ("Pular por agora", "Agora não", "Fechar") e conta o
  toque. A folha "Ainda tem brasa" (ofensiva zerada) é a exceção: tem um caminho positivo,
  "Reavivar hoje", que já leva à lição, e é esse que ele toma.
- **Palavras até o texto** soma as palavras das telas distintas que a pessoa atravessou (o que
  estava escrito, não o que ela leu de fato). Compare com o que o texto bíblico tem.
- **O que o app prometeu × leu de fato**: a lição diz "cerca de N min" (`CC.minutosDoDia` em
  `src/app/03-trilha.js`: desde 02/10/2026, as palavras do trecho na NBV, que o build grava em
  `trechos[i].palavras`, a 200 por minuto; antes eram 4 min por capítulo arredondado a 5, e o dia 2
  prometia 10 tendo 5; no Conhecer, 6 versículos por minuto em `05b-conhecer.js`). O relatório conta
  as palavras do leitor e estima a 200 palavras/min: promessa e leitura devem bater.
- **Erros** são exceções, `console.error`, entradas de erro do log e respostas 4xx/5xx. O aviso do
  `navigator.vibrate` (clique sintético não é gesto da pessoa) já sai filtrado: é do ambiente.

### Referência medida em 02/10/2026

Guarde para comparar: uma mudança no onboarding tem de mexer nestes números. "Folhas depois do
dia feito" são as que o app abre depois do primeiro "Até amanhã" (ou do "Terminei o dia" do
Conhecer): vêm depois do valor, e por isso contam à parte das interrupções.

Antes das correções dos primeiros dias (commit `3b66c59`):

| Caminho | Dia | Até o texto bíblico | Até concluir | Interrupções | Palavras até o texto |
|---|---|---|---|---|---|
| plano | 1 | 9 toques + 5 campos | 12 toques + 5 campos | 2: "Instalar no celular" (Pular por agora), "Notificações" (Agora não) | 620 |
| plano | 2 em diante | 2 toques | 4 toques | 0 | ~450 |
| plano | volta depois de 2 dias sem ler | 2 toques | 4 toques | 1: "Ainda tem brasa" (Reavivar hoje) | 76 |
| conhecer | 1 | 10 toques + 5 campos | 12 toques + 5 campos | as mesmas 2 | 315 |
| conhecer | 2 | 2 toques | 4 toques | 0 | 184 |

Depois de mover o tutorial de instalar e o convite de notificações para depois do primeiro dia
feito (commit "Primeiros dias: nada entre a conta criada e o texto bíblico"):

| Caminho | Dia | Até o texto bíblico | Até concluir | Interrupções | Folhas depois do dia feito | Palavras até o texto |
|---|---|---|---|---|---|---|
| plano | 1 | 7 toques + 5 campos | 10 toques + 5 campos | 0 | 2: "Instalar no celular", "Notificações" | 530 |
| plano | 2 | 2 toques | 4 toques | 0 | 0 | 453 |
| conhecer | 1 | 8 toques + 5 campos | 10 toques + 5 campos | 0 | as mesmas 2 | 225 |
| conhecer | 2 | 2 toques | 4 toques | 0 | 0 | 184 |

Dia 1 do plano: Gênesis 1-3 + Mateus 1, 2480 palavras no leitor (uns 12 min); o app prometia
"cerca de 10 min" + "cerca de 5 min" e agora promete 9 + 3. O custo está antes dela.

## 5. O mapa da jornada (para andar à mão ou estender o script)

O que aparece, na ordem, e quem decide:

1. **Boas-vindas** `src/entrar.html` `#tela-boas`: "Começar agora" (`#botao-comecar`), "Já tenho
   conta". Com `?convite=` ou `?celula=` na URL o texto muda e pode aparecer "Entrar na célula" /
   "Só quero conhecer".
2. **Cadastro em 3 passos** `#form-cadastro`: `[data-passo=1]` nome (`#nome`), nascimento
   (`#nascimento`, 12 anos no mínimo) e "Você já segue Jesus?" (`[data-caminho=plano|conhecer]`,
   "Sim" já vem marcado; some quando a pessoa chega por convite do Conhecer); `[data-passo=2]`
   e-mail; `[data-passo=3]` `#usuario`, `#senha-nova` e o consentimento obrigatório
   (`#consentimento-cadastro`, texto da LGPD art. 11). `POST api/criar-conta` → marca
   `localStorage cc.instalar=1` → `location.replace('./')`.
3. **Partida do app** `src/app/10-roteador.js` (procure `// ---------- partida`): abertura
   (`#abertura`, fica até o app estar pronto; `sessionStorage cc.abertura` evita repetir na mesma
   sessão) → **convite de notificações** (`07d-notificacoes.js CC.talvezOferecerNotificacoes`: só
   com `Notification.permission === 'default'`, conta com senha, nunca antes da primeira leitura
   (`CC.datasFeitas` vazio devolve sem perguntar), e nunca duas vezes: "Agora não" guarda a hora e
   pergunta de novo uma vez, 7 dias depois; no iPhone só com o app instalado) → consentimento, se faltar
   (`CC.pedirConsentimento`) → aviso de endereço novo (só em ge.off-sec.net) → link de célula ou
   convite da URL → completar cadastro (contas antigas) → `avisosDoDia()`: escudo que cobriu ontem
   (aviso flutuante), ofensiva zerada nos últimos 14 dias (folha "Ainda tem brasa", `[data-ler]`
   Reavivar hoje / `[data-fechar]` Agora não), toque de amigo (`CC.folhaToque`) → check-in do
   discípulo → o convite de notificações de novo, se nada mais estiver aberto.
4. **Trilha** `03-trilha.js`: a folha do topo com os cartões "N de 2 leituras hoje"
   (`.cartao-salvia[data-abrir-dia]`, 1 toque até a lição) e "N dias seguidos" (`[data-ofensiva]`);
   os nós (`.no.atual` abre o balão com `[data-abrir-dia]` "Começar", 2 toques).
   Conta do Conhecer Jesus: `#/` vira `CC.vistaConhecer` com o cartão "Começar/Continuar: <título>"
   (`a.cartao-destaque[href^="#/conhecer/"]`).
5. **Lição** `04-licao.js` (`.licao.tela-leitura`, `role=dialog` com `aria-label="Dia N"`): a
   cabeça com o título do dia (`conteudo/primeiros-dias.json`, dias 1 a 7 e 20; nos outros,
   "Leitura de hoje"), a placa "Onde estamos" (`.onde-estamos`, `03c-contexto.js`: o mapa da
   história em pílulas com as paradas do dia acesas, o contexto e o "Enquanto lê, procure"), e cada
   passagem tem "Ler aqui" (`[data-ler]`, abre o leitor `04b-leitor.js` `.leitor` com
   `[data-terminei]`: "Terminei! Ler Mateus 1" encadeia a segunda passagem; nos capítulos de lista
   o leitor abre com o guia `.leitor-guia` e o botão `[data-saltar]`, como em Mateus 1) e "Marcar como lido"
   (`[data-trilha]`, para quem lê na Bíblia de papel); "Concluir o dia" (`[data-concluir]`) conta a
   leitura e abre a reflexão (`tela-festa`: Guardar → `[data-avancar]` → Pensar, `[data-pergunta]`
   → Orar, `[data-orei]` → `tela-resumo` → `[data-voltar-trilha]` "Até amanhã, Nome!"). "Pular por
   hoje" (`[data-pular]`) encurta. **Depois do primeiro "Até amanhã" da conta nova**
   (`CC.depoisDoPrimeiroDia`, em `07c-instalar.js`): o tutorial de instalar (se `cc.instalar`, a
   marca que o cadastro grava) e, fechado ele, o convite de notificações. O script dispensa os dois
   e os conta como "folhas depois do dia feito".
6. **Conhecer Jesus** `05b-conhecer.js` (`.licao.tela-conhecer`): "O que você vai ler" com "uns N
   minutos" e, desde 02/10/2026, a placa "Onde estamos na história" (`.onde-estamos`, o mesmo
   cartão da lição: mapa, contexto e "Enquanto lê, procure", com `contexto` e `procure` de cada dia
   em `conteudo/conhecer.json`) → `[data-ler]` → leitor → "Terminei a leitura" fecha o leitor → "Repare", a pergunta, a
   conversa → `[data-terminar]` "Terminei o dia" (é o que conta para a ofensiva; na conta nova,
   dispara o mesmo `CC.depoisDoPrimeiroDia`) → `[data-fechar]`.

## 6. Simular dias à mão (fora do script)

Quando quiser olhar uma tela específica num "dia 5" com `design/ferramentas/foto-conta.mjs`:

```sh
# o servidor com o relógio 4 dias à frente (dia 5), pasta e porta próprias, PID guardado
mkdir -p /tmp/dia5 && RELOGIO_DIAS=4 CAMINHO_ESTADO=/tmp/dia5/estado.json \
  nohup node --import ./design/ferramentas/analise/relogio.mjs servidor.mjs 8684 > /tmp/dia5/servidor.log 2>&1 &
echo $! > /tmp/dia5/servidor.pid

# o mesmo deslocamento na página (PRE roda antes do app): CC.hojeIso() passa a dar o dia 5
PRE="$(node -e "import('./design/ferramentas/analise/relogio.mjs').then((m) => console.log(m.codigoDoDesvio(4 * m.DIA_MS)))")"
CHROME=$CHROME BASE=http://localhost:8684/ COOKIE="$(cat /tmp/dia5/cookie-rute.txt)" PRE="$PRE" ABERTURA=1 \
  node design/ferramentas/foto-conta.mjs 390 844 /tmp/dia5/inicio.png '#/' 0 claro

kill "$(cat /tmp/dia5/servidor.pid)"
```

`foto-conta.mjs` silencia o convite de notificações e o tutorial de instalar (`cc.aviso.push=nunca`,
remove `cc.instalar`) e pula a abertura; `ABERTURA=1` mostra a abertura inteira, e para ver as
interrupções use `jornada.mjs`, que não silencia nada.

Dois atalhos que pouparam tempo nas capturas "antes e depois" de 02/10/2026:

- **A lição de um dia ainda não lido** (título do dia, "Onde estamos", o "procure") só aparece
  para quem não leu aquele dia; as contas semeadas já leram. Num servidor limpo, crie uma conta
  por `curl -c jar.txt -H 'content-type: application/json' -d '{"nome":"Foto","nascimento":"2004-05-10","email":"foto@exemplo.com","usuario":"foto","senha":"senha123","fuso":"UTC","consentimento":true}' http://localhost:8696/api/criar-conta`,
  pegue o cookie `cc_sessao` do jar e abra `#/dia/12` direto: a lição abre em qualquer dia,
  sem precisar ler os anteriores.
- **`ACAO` aceita uma IIFE `async`** (o `av()` espera a promessa): dá para clicar em "Ler aqui",
  esperar o leitor montar e rolar até um elemento numa captura só, por exemplo
  `(async()=>{document.querySelector('[data-ler="antigo"]').click();await new Promise(r=>setTimeout(r,2500));const g=[...document.querySelectorAll('.leitor-guia')].find(x=>/Quetura/.test(x.textContent));g.scrollIntoView({block:'start'});return 'ok';})()`.
  Para o "antes", um `git archive HEAD | tar -x -C <pasta>` e `node build.mjs` nessa pasta
  servem o app de antes sem mexer no worktree.

Por que não `CAMINHO_RELOGIO`: ela só vale com `CAMINHO_PUSH_TESTE=1` e só move o relógio dos
avisos sociais (`agoraDoServidor` em `servidor.mjs`); o "hoje" das leituras vem de
`hojeNoFuso(conta.fuso)` em `contas.mjs`, que usa `new Date()`. O `relogio.mjs` troca o `Date` do
processo inteiro antes de o servidor carregar, e por isso a régua dos 7 dias
(`conferirProgresso`, `DIAS_DE_ATRASO = 7`) aceita as datas do dia simulado.

## 7. Armadilhas conhecidas deste repositório

- **CSP e reinício**: o servidor libera os scripts pelo hash calculado na subida. Depois de um
  `node build.mjs` que mude JS, reinicie o servidor (pelo PID), senão a página fica parada na abertura.
  A jornada sobe o próprio servidor a cada dia, então basta não rodar o build no meio.
- **7 dias de atraso**: `PUT /api/estado` recusa leitura com data anterior a 7 dias atrás e data
  além de amanhã (vira "hoje"). Dados semeados (`design/ferramentas/semear.mjs`) terminam ontem ou
  hoje por isso; históricos longos entram pelo banco com o servidor parado
  (`semear-inteligencia.mjs banco`). Para a jornada isso não pesa: servidor e navegador andam juntos.
- **Sessão e perfil**: o cookie `cc_sessao` (Max-Age de 90 dias) e o localStorage só vão para o
  disco quando o Chrome fecha direito (`Browser.close`, em `cdp.mjs`). Matar o processo perde a
  sessão e os "já avisei" (`cc.aviso.push`, `cc.aviso.escudo`...), e o dia seguinte cai em
  `entrar.html` com 401 em tudo. Se isso aparecer no relatório, é o fechamento, não o app.
- **Chrome sem interface**: `Notification.permission` nasce negada; o script pede "perguntar" via
  CDP para o convite aparecer. `CC.rodandoComoApp()` é falso (sem ícone instalado), como num
  navegador de verdade. O service worker fica no perfil entre os dias: um build novo no meio da
  rodada confunde a atualização.
- **Conta repetida**: cada rodada cria o servidor numa pasta nova dentro de `SAIDA`, então `joana`
  nunca colide; reaproveitando `SAIDA` o cadastro falha com "já existe".
- **Tempo**: o cadastro e a primeira lição levam uns 40 s; cada dia seguinte, uns 20 s. Sete dias,
  uns 3 min. Rode em segundo plano quando for mais que isso.
- Nada aqui toca em dados reais: só a pasta `SAIDA/servidor`.

## 8. O que entregar

1. A pasta da rodada (`SAIDA`) com `relatorio.md` e as capturas. As capturas não vão para o git
   (`capturas/` é ignorada): cite o caminho delas na resposta.
2. Na resposta, a tabela-resumo do relatório, lado a lado com a referência da seção 4 quando for
   "antes e depois", e os três ou quatro achados que importam (uma interrupção a mais, um passo a
   mais, um erro de console, uma promessa que não fecha).
3. Quando o pedido for um diagnóstico, escreva `docs/jornada-<AAAA-MM-DD>.md` com: como foi medido
   (comando, commit, data), a tabela, as interrupções com o texto que a pessoa leu, o passo a passo
   só dos trechos com problema (número do passo + nome da captura) e as propostas. Decisões que
   mudam o fluxo ficam como lista `- [ ]` para o dono marcar, como em
   `docs/revisao-2026-09-29/reflexoes-checklist-dias-1-181.md`. Para o "por quê" e o plano, siga a
   skill `analise-retencao`.

## 9. Estender o script

`jornada.mjs` é um só arquivo com funções curtas: `cadastrar()`, `voltar()`, `interrupcoes()`,
`lerDiaPlano()`, `lerDiaConhecer()`, `fimDoDia()`. Para uma variante (chegar por `?convite=<token>`
ou `?celula=<token>`, uma conta antiga sem perfil completo, "Marcar como lido" em vez de "Ler aqui",
"Pular por hoje" na reflexão), copie a função, troque os seletores da seção 5 e registre cada ação
com `toque(sel, nome)`, `digitar(sel, valor, nome)` ou `registrar(nome)`. Mantenha o padrão de
contar o toque mais brando nas interrupções, para os números continuarem comparáveis.

## 10. Sessão e página de entrada (regra do dono, 02/10)

- **Quem não tem sessão nunca vê nada do app.** O service worker serve "/" do cache sem passar
  pelo servidor; por isso o servidor põe e tira, junto com o crachá HttpOnly, a marca
  `cc_logado=1` (mesma validade, sem segredo), e o primeiro script do `index.html` confere a
  marca antes de pintar. Ferramenta que põe só o `cc_sessao` no navegador funciona: a primeira
  resposta do servidor devolve a marca. Para simular sessão vencida, apague os dois cookies;
  crachá derrubado (marca ainda lá) cai no 401 e o servidor limpa os dois.
- Mexeu em entrada, sessão, service worker ou páginas avulsas: rode
  `CHROME=... node ferramentas/teste-fluxo-entrada.mjs` (um perfil só, como o celular, com espião
  de quadros: conta se algum quadro do app foi pintado sem sessão).
- Evento simulado de volta do segundo plano: `new Event('visibilitychange', { bubbles: true })`
  (o app ouve na `window`); sem `bubbles`, nada acontece e o teste mente.
