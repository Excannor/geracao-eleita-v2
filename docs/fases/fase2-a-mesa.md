# Fase 2: "À mesa". A célula antes, durante e depois do encontro

App: `C:\Users\Admin\Documents\Geracao Eleita - App`. Célula hoje: `propositos` com `celula=1` (esquema v6 em `db.mjs`: `encontro`, `recado`, `estudo_*`), membros em `proposito_membros`; regras em `contas.mjs` (`criarCelula`, `entrarNaCelula`, `definirEncontro`, `definirRecado`, `definirEstudo`, `removerDaCelula`, por volta das linhas 800-930); rota `/api/celula` em `servidor.mjs` (ações `criar`, `link`, `entrar`, `encontro`, `recado`, `estudo`, `remover`); tela em `src/app/08b-propositos.js` (`CC.vistaCelula`, abas Hoje/Estudo/Pessoas, `topoDaCelula`, `abaHoje`, `abaPessoas`, `folhaPrepararEstudo`, `montarEstudo`, `estudoEmTexto`, `folhaLinkCelula`, `CC.abrirLinkCelula`). Teste: `ferramentas/teste-celula.mjs`.

Regras gerais: sem chat nem resposta entre usuários (texto livre só do autor; reações sem texto); sem XP/conquista/troféu novos; nenhuma nota de bastidores; nenhum travessão em texto de tela; linguagem simples; `grep` no nome antes de criar classe CSS; comentários em português explicando o porquê; seguir o estilo do código.

## 1. Esquema v7 (`db.mjs`, uma migração nova no fim de `ESQUEMA`)
```
ALTER TABLE proposito_membros ADD COLUMN papel TEXT NOT NULL DEFAULT '';   -- '' membro, 'auxiliar', 'visitante'
ALTER TABLE propositos ADD COLUMN estudo_acolhida TEXT NOT NULL DEFAULT '';
ALTER TABLE propositos ADD COLUMN estudo_adoracao TEXT NOT NULL DEFAULT '';
ALTER TABLE propositos ADD COLUMN estudo_testemunho TEXT NOT NULL DEFAULT '';
CREATE TABLE celula_encontros (proposito TEXT NOT NULL, data TEXT NOT NULL, visitantes INTEGER NOT NULL DEFAULT 0,
  registrado_por TEXT NOT NULL, em TEXT NOT NULL, PRIMARY KEY (proposito, data));
CREATE TABLE celula_presencas (proposito TEXT NOT NULL, data TEXT NOT NULL, usuario TEXT NOT NULL,
  PRIMARY KEY (proposito, data, usuario));
```
Mapeie os campos novos no vai e volta entre o objeto em memória e as linhas (siga exatamente como as colunas da v6 foram mapeadas em `contas.mjs`). Apagar conta (`apagar`/`apagarDe`) remove também as presenças da pessoa. Encerrar a célula não apaga o histórico de encontros.

## 2. Papéis: auxiliar e visitante (`contas.mjs` + `/api/celula`)
- Função `podeConduzir(p, usuario)`: líder (`criadoPor`) ou membro ativo com `papel === 'auxiliar'`.
- Ação `auxiliar { id, usuario, sim }`: só o líder; no máximo 2 auxiliares; o alvo precisa ser membro ativo (não visitante).
- Quem conduz (líder ou auxiliar) pode: recado, dia do encontro, estudo, registrar encontro, ver "quem precisa de atenção" e a lista de oração. Só o líder pode tirar membro, marcar auxiliar e encerrar.
- **Visitante:** ação `entrar { token, visitante: true }` e, na conta nova pelo link, `/api/criar-conta` com `celula` + `celulaVisitante: true`: entra com `papel = 'visitante'`. Visitante NÃO conta na meta do dia nem em "quem leu" (fica fora de `ativos()` para a meta e para os pontos), NÃO recebe "notificar quem falta", não conta no limite de 20 (limite próprio de 10 visitantes). Ação `tornarMembro { id }`: o próprio visitante vira membro (`papel = ''`), respeitando o limite de 20.
- A resposta de `/api/propositos` para uma célula inclui `papel` em cada membro e `euConduzo` (booleano).

## 3. Registro do encontro
- Ação `registrarEncontro { id, data, presentes: [usuarios], visitantes: N }`: só quem conduz; `data` = hoje ou um dos 7 dias anteriores; `presentes` só membros/visitantes da célula; `visitantes` 0 a 30 (pessoas sem conta). Regrava se já houver registro na data.
- Na resposta de `/api/propositos`, para quem conduz: `ultimoEncontro: { data, presentes: N, visitantes: N }` e `encontrosRegistrados` (quantos nos últimos 60 dias). Membros comuns NÃO recebem a lista de presença de ninguém.
- Tela (aba Hoje, só quem conduz): no dia do encontro e até 7 dias depois, se o encontro daquela data ainda não foi registrado, botão "Registrar o encontro". Folha: título "Quem foi ao encontro?", a data (com opção de trocar entre os últimos 7 dias), lista de pessoas com marcação (membros e visitantes, líder já marcado), contador "Pessoas sem conta que vieram" com − e +, botão "Salvar". Depois de salvo: "Encontro de DD/MM registrado · N pessoas" com "Corrigir".

## 4. Quem precisa de atenção (no lugar do parágrafo `semana-lider`)
- Só para quem conduz. Calculado no servidor em `/api/propositos` como `atencao: [{ usuario, nome, motivo }]`, até 5 pessoas, membros ativos (não visitantes, não quem conduz):
  - `"faltou aos 2 últimos encontros"` quando há pelo menos 2 encontros registrados e a pessoa não esteve nos 2 últimos;
  - `"sem ler há N dias"` quando N ≥ 5 (a partir das datas feitas do estado da pessoa; se nunca leu desde que entrou, conta desde a entrada).
- Tela: bloco "Precisam de atenção" com cada pessoa e o motivo, e o botão "Dar um toque" quando forem amigos (o toque que já existe). Se a lista estiver vazia, mostrar "Ninguém sumido por aqui." Remova o parágrafo antigo de "leituras possíveis".

## 5. Lista de oração de quem conduz
- Na aba Hoje, só para quem conduz: "Ore hoje por" + 2 nomes (3 se a célula tem mais de 12 membros), em rodízio diário determinístico: membros ativos (sem quem conduz) em ordem alfabética, começando no índice `(número do dia do ano × quantidade) % total`. Nada é gravado, nada é notificado.

## 6. Roteiro 4 Ws no estudo
- `folhaPrepararEstudo` ganha três campos opcionais (máximo 300 caracteres cada), acima e abaixo do estudo atual:
  - "Acolhida" (rótulo auxiliar: "uma pergunta para começar a conversa");
  - "Adoração" (rótulo auxiliar: "uma música ou um momento de louvor");
  - "Testemunho" (rótulo auxiliar: "quem vamos convidar e pelo que vamos orar").
  O estudo que já existe é a "Palavra". Ação `estudo` passa a aceitar `acolhida`, `adoracao`, `testemunho`.
- `montarEstudo` e `estudoEmTexto` mostram o roteiro na ordem **Acolhida → Adoração → Palavra (o estudo atual) → Testemunho**. Campo vazio usa a sugestão padrão:
  - Acolhida: uma pergunta da lista abaixo, escolhida pelo número da semana do ano (a mesma para toda a célula na semana).
  - Adoração: "Escolham juntos uma música de louvor para começar."
  - Testemunho: "Quem você quer convidar para o próximo encontro? Orem juntos por essas pessoas, pelo nome."
- Perguntas de acolhida (use exatamente estas):
  1. "Qual foi a melhor parte da sua semana?"
  2. "O que te fez rir nos últimos dias?"
  3. "Se você pudesse passar um dia em qualquer lugar, onde seria?"
  4. "Qual música não sai da sua cabeça esta semana?"
  5. "Conte uma coisa pequena pela qual você é grato hoje."
  6. "Qual foi a parte mais difícil da sua semana?"
  7. "Quem é uma pessoa que te ajudou recentemente?"
  8. "Qual comida te lembra a sua casa?"

## 7. Modo encontro
- Na aba Estudo, para todos: botão "Modo encontro". Abre tela cheia (use o padrão de tela cheia do app, ex.: `CC.telaCheia`), letra grande, uma parte do roteiro por vez (Acolhida, Adoração, Palavra, Testemunho) com "Anterior"/"Próximo" e indicador "2 de 4", botão fechar. Na Palavra, o texto bíblico com as ações de versículo que já existem.

## 8. Convidar para o encontro
- Na aba Hoje, para membros ativos, quando há dia de encontro: botão "Convidar para o encontro". Compartilha (use `CC.compartilhar`) o texto: "Quer ir comigo no encontro da minha célula? É {nome do encontro, ex.: às quintas-feiras}. Me chama que eu te passo o endereço." e o link da célula (o mesmo de "Mandar o link"). Quem abrir o link vê a folha da célula com dois botões: "Entrar na célula" e "Só quero conhecer" (visitante).

## 9. Testes
- `ferramentas/teste-celula.mjs`: auxiliar (limite 2, permissões, não pode tirar membro); visitante (entra, fora da meta e dos pontos, não recebe toque de "quem falta", vira membro); registrar encontro (só quem conduz, data até 7 dias, regravar, membro comum não vê presenças); atenção (faltou 2 encontros; sem ler 5+ dias; no máximo 5; nunca inclui quem conduz); rodízio de oração determinístico; roteiro com e sem os campos novos; a migração v7 num banco v6 existente (teste em `ferramentas/teste-banco.mjs` ou `teste-db.mjs`, no padrão das migrações anteriores).
- Percurso de navegador no scratchpad (padrão de `...\scratchpad\celula.mjs`, contas com `consentimento: true`): líder marca auxiliar; visitante entra por "Só quero conhecer"; registrar encontro; "Precisam de atenção"; "Ore hoje por"; preparar estudo com os 4 campos; modo encontro (4 partes); convidar para o encontro. Capturas 320 e 390, claro e escuro.
- Rodar e deixar verde: `node build.mjs`, `node teste.mjs`, `node ferramentas/teste-celula.mjs`, `node ferramentas/teste-propositos-regras.mjs`, `node ferramentas/teste-propositos.mjs`, `node ferramentas/teste-convites.mjs`, `node ferramentas/teste-banco.mjs`, `node ferramentas/teste-redesenho.mjs`, `node ferramentas/inspecionar.mjs 390`, `node ferramentas/contraste.mjs`.
- Não fazer commit, não publicar, não usar ssh.
