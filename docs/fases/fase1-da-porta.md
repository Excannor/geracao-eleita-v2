# Fase 1: "Da porta". Caminho para quem ainda não crê

App: `C:\Users\Admin\Documents\Geracao Eleita - App` (PWA em JS puro; servidor Node 24 `servidor.mjs`; SQLite via `db.mjs`; regras compartilhadas cliente/servidor em `src/app/01-nucleo.js`, `02-estado.js`, `02b-jogo.js`, carregadas no servidor por `runInContext`).
Conteúdo pronto e conferido (NÃO reescreva textos, só use):
- `D:\Temp\User\claude\C--Windows-System32\3da9b60c-8448-4240-a72b-fe209fe9c6ef\scratchpad\conhecer\conhecer.json` (14 dias, perguntas fixas, tela `seguir`, folha `acompanhar`)
- `D:\Temp\User\claude\C--Windows-System32\3da9b60c-8448-4240-a72b-fe209fe9c6ef\scratchpad\conhecer\perguntas-honestas.json` (10 textos)
- verificador: `...\scratchpad\conhecer\conferir.mjs`

Decisão de desenho: NÃO criar tipo novo de propósito. A conta de quem está conhecendo guarda `caminho: 'conhecer'` e `acompanhadoPor: '<usuario de quem convidou>'`. Quem convidou vê a lista de quem acompanha.

## Parte A: dados, servidor, convite (agente 1)

1. **Conteúdo no build.** Copie os dois JSON para `conteudo/conhecer.json` e `conteudo/perguntas-honestas.json`. Em `build.mjs`, antes de gerar o `conteudo.<hash>.json`, junte ao objeto do conteúdo: `conteudo.conhecer = { ...conhecer, perguntas: perguntasHonestas }`. O app lê como `CC.D.conhecer`.
2. **Teste de conteúdo.** Transforme o `conferir.mjs` em `ferramentas/teste-conhecer.mjs`, lendo de `conteudo/`, com saída no padrão dos outros testes (`ok`/`FALHA`, código de saída 1 se falhar).
3. **Estado (`src/app/02-estado.js`).** Campo novo `conhecidos: {}` em `VAZIO()` (número do dia → data ISO `AAAA-MM-DD` em que terminou). Fusão: união por chave, e se os dois lados têm a chave vale a data MENOR. `CC.datasFeitas` passa a incluir as datas de `conhecidos` (a ofensiva conta os dias do Conhecer Jesus). API: `CC.conhecido(n)`, `CC.marcarConhecido(n)` (grava a data de hoje com `CC.hojeIso()` e `CC.gravar`), `CC.conhecidos()` (lista de números).
4. **Servidor, conferência de progresso (`conferirProgresso` em `servidor.mjs`).** Aplicar a `conhecidos` a mesma regra de datas de `marcadoEm` e `licoesEm` (data válida, entre `DIAS_DE_ATRASO` atrás e amanhã). Chaves só de 1 a 14.
5. **Convite com modo (`contas.mjs`).** `gerarConvite(eu, assinar, agora, { modo } = {})`: se `modo === 'conhecer'`, a carga assinada ganha `m: 'conhecer'`. `lerConvite` devolve `modo` (`'conhecer'` ou `''`). Em `usarConvite`: quando `convite.modo === 'conhecer'` e `contaNova` e a conta ainda não tem `caminho`, grave `a.caminho = 'conhecer'` e `a.acompanhadoPor = convite.de`, e NÃO crie a dupla de plano (`garantirDuplaPlano`); a amizade é criada normalmente. Modo adulterado na URL invalida a assinatura (já acontece, porque a carga é assinada; confirme com teste).
6. **Rotas (`servidor.mjs`).**
   - `/api/convites` (a que gera o link): aceitar `{ modo: 'conhecer' }` no corpo e repassar.
   - `/api/criar-conta`: aceitar `caminho: 'conhecer'` vindo do portal (sem convite). Salvar `caminho` só se for `'conhecer'`.
   - Resposta de "quem sou eu" (onde está `perfilCompleto` e `consentimento`): incluir `caminho` e, se houver, `acompanhadoPor: { usuario, nome }`.
   - `POST /api/caminho { caminho: 'plano' | 'conhecer' }`: troca o caminho da própria conta.
   - `POST /api/conhecer/conversar`: só para conta com `acompanhadoPor`. Manda aviso SÓ para `acompanhadoPor` (e, se a pessoa estiver em alguma célula, também para o líder dela, `criadoPor` da célula). Use o mecanismo de push/aviso social que já existe (`avisoSocial` e `notificacoes.mjs`), com um tipo novo `querConversar` e o texto: "{nome} quer conversar com você sobre Jesus.". NUNCA publicar no Feed (`NOVIDADES`). No máximo 1 vez por dia por conta (responda `{ ok: true, ja: true }` na repetição). Responda `{ ok: true }`.
   - `/api/amigos`: incluir `acompanhando: [{ usuario, nome, dia, ultimo, terminou }]`, das contas com `acompanhadoPor === eu` e `caminho === 'conhecer'`: `dia` = quantos dias do Conhecer terminou (do estado dela, `conhecidos`), `ultimo` = data mais recente, `terminou` = `dia >= 14`. Não exponha nada além disso (nada de textos).
7. **Testes.** `teste.mjs`: fusão de `conhecidos` (menor data vence, união), `datasFeitas` inclui `conhecidos`. `ferramentas/teste-convites.mjs`: convite `conhecer` cria conta com `caminho` e `acompanhadoPor`, sem dupla de plano; `lerConvite` devolve `modo`; mexer na carga invalida. Um teste da rota `conversar` (só avisa quem convidou, 1 por dia, nada no Feed): pode ir em `teste-convites.mjs`.

## Parte B: telas (agente 2, depois da Parte A)

Padrões do app: `CC.folha`, `CC.api`, `CC.avisar`, `CC.esc`, `CC.ico`, `CC.botaoVoltar`, `CC.tituloSecao`; rotas em `src/app/10-roteador.js` (`partesDaRota`, `rotear`). Estilos em `src/estilo.css` (tokens `--acento`, `--cartao`, `--borda`, `--tinta`...). Modelo de tela de lista: `src/app/05-licoes.js` (Primeiros passos). Leitor: `src/app/04b-leitor.js` (`CC.abrirLeitor`, `textoDe`/`CC.htmlDoTrecho`). Versículos: `src/app/04e-versiculos.js` (as ações de versículo precisam funcionar no leitor do Conhecer também).

1. **Leitor com trecho por versículo.** `textoDe(biblia, trechos)` aceita, além de `{livro, de, ate}` (capítulos), a forma `{livro, cap, de, ate}` = versículos `de..ate` do capítulo `cap`. Os `data-v` continuam `cap:vers`. Abrir o leitor para um dia do Conhecer: título "Dia N · <titulo>", botão principal "Terminei a leitura" que fecha o leitor e volta ao dia.
2. **Novo módulo `src/app/05b-conhecer.js`.**
   - `#/conhecer`: título "Conhecer Jesus", subtítulo do JSON, lista dos 14 dias (número, título, referência curta, feito ✓). Próximo dia destacado. No fim, cartão "Perguntas honestas" (vai para `#/perguntas`) e link "E agora, o que eu faço?" (vai para `#/seguir`).
   - `#/conhecer/N`: tela do dia em folha cheia no padrão da lição (`04-licao.js`). Mostra `abertura`; botão "Ler" (abre o leitor com os trechos); depois da leitura: `repare`, `pergunta` em destaque, as 4 `perguntasFixas` (recolhidas em "Mais perguntas para pensar"), `conversa` como começo de oração ("Se quiser, fale com Deus:") e um campo opcional "Escrever sobre isso" que salva em `CC.gravarAnotacao('conhecer:' + N, texto)` (privado). Botão "Terminei o dia" → `CC.marcarConhecido(N)`. Nos dias 13 e 14, depois de terminar, botão "E agora, o que eu faço?" (`#/seguir`). No dia 14 terminado, também "Continuar lendo a Bíblia" (POST `/api/caminho {caminho:'plano'}` e vai para `#/`).
   - `#/perguntas`: lista das 10 perguntas honestas; `#/perguntas/<id>`: o texto (parágrafos), "Leia você mesmo" com as referências como links que abrem a Bíblia (`#/biblia/<livro>/<cap>`) e, se a conta tem `acompanhadoPor`, "Converse com {nome}" (abre a folha de conversar).
   - `#/seguir`: a tela `seguir` do JSON (abertura, 3 passos, a oração sugerida em destaque discreto, botão "Quero conversar com alguém" → POST `/api/conhecer/conversar` → mostra `conversarFeito`; se a conta não tem `acompanhadoPor`, no lugar do botão: "Converse com um amigo que segue Jesus ou procure uma igreja perto de você."), e botão "Começar os Primeiros passos" (`#/passos`).
3. **Trilha (início).** Se `CC.quem.caminho === 'conhecer'`, a aba Trilha (`#/`) mostra o Conhecer Jesus (a mesma lista de `#/conhecer`) no lugar do plano anual, com um link discreto no fim: "Ver o plano da Bíblia em um ano" (POST `/api/caminho {caminho:'plano'}`).
4. **Explorar.** No topo do Explorar (`06-explorar.js`), para quem está no caminho `conhecer`, o cartão "Comece por aqui" vira "Perguntas honestas" (`#/perguntas`). Para os demais, um cartão "Perguntas honestas" entra numa posição discreta (depois dos atuais), porque serve também para quem quer conversar com amigos.
5. **Convite (`08-amigos.js`, `CC.convidar`).** Antes de gerar o link, perguntar "Para quem é o convite?" com dois botões: "Alguém que já segue Jesus" (fluxo atual) e "Alguém que está conhecendo Jesus" (POST `/api/convites {modo:'conhecer'}`; texto para compartilhar: "Tô lendo a Bíblia num app e tem um caminho de 14 dias pra quem quer conhecer Jesus, sem pressão. Quer ver? "). Guarde a escolha de texto no mesmo `CC.compartilhar`.
6. **Juntos: quem você acompanha.** Se `/api/amigos` trouxer `acompanhando` não vazio, um bloco "Conhecendo Jesus" no Juntos: por pessoa, "{nome} · dia X de 14" (ou "terminou os 14 dias"), botão de toque (o toque de amigo que já existe) e link "Como acompanhar" (folha com `acompanhar.itens` do JSON; título "Como acompanhar {primeiro nome}").
7. **Portal (`src/entrar.html`).** No cadastro sem convite, pergunta "Você já segue Jesus?" com "Sim" e "Estou conhecendo" (não obrigatória; padrão "Sim"). "Estou conhecendo" envia `caminho: 'conhecer'`. Com link de convite `conhecer`, não perguntar.
8. **Configurações (`07b-conta.js`).** Item "Seu caminho": "Conhecer Jesus" ou "Plano da Bíblia em um ano", com troca (POST `/api/caminho`).
9. **Percurso de navegador** (scratchpad, no padrão de `...\scratchpad\celula.mjs`, com `Emulation.setTouchEmulationEnabled`): jovem gera convite "conhecendo"; conta nova entra pelo link e cai no Conhecer Jesus; faz o dia 1 (lê, escreve, termina) e a chama acende; abre uma pergunta honesta; vai em "E agora?" e aperta "Quero conversar"; o jovem vê "dia 1 de 14" no Juntos e recebe o aviso; nada aparece no Feed. Capturas 320 e 390, claro e escuro, de: lista do Conhecer, dia (antes e depois de ler), pergunta honesta, "E agora?", bloco do Juntos, escolha do convite.

## Regras (obrigatórias nas duas partes)
- Nenhuma nota de bastidores na tela. Nenhum travessão em texto de tela. Linguagem acessível.
- Não gamificar: nada de XP, conquista ou troféu novo pelo Conhecer, pela decisão ou pela conversa. Os dias contam só para a ofensiva (já existe).
- Quem convidou nunca vê textos escritos, só o número do dia.
- Antes de criar uma classe CSS: `grep -n "nome" src/estilo.css` (já houve colisão com `.bolinha`).
- Siga o estilo do código ao redor e os comentários em português explicando o porquê.
- Rode ao final: `node build.mjs`, `node teste.mjs`, `node ferramentas/teste-conhecer.mjs`, `node ferramentas/teste-convites.mjs`, `node ferramentas/teste-celula.mjs`, `node ferramentas/teste-propositos-regras.mjs`, `node ferramentas/inspecionar.mjs 390`, `node ferramentas/contraste.mjs`, `node ferramentas/teste-redesenho.mjs`. Tudo verde.
- Não faça commit, não publique, não use ssh.
