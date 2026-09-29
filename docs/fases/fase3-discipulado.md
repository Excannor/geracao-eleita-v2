# Fase 3: Discipulado (Mateus 28.19-20; 2 Timóteo 2.2)

Objetivo: dar forma à relação de discipulado 1 a 1, sem vigilância e sem placar. O discipulador acompanha; o discípulo decide o que mostrar. Base na pesquisa: ter um mentor é um dos fatores mais fortes de fé duradoura (Barna); o sucesso é o discípulo que discipula (2 Tm 2.2).

Regras gerais (valem para tudo): sem chat e sem resposta entre usuários (texto livre só do autor, e aqui quase não há texto livre); sem XP, conquista ou troféu novo; nenhuma nota de bastidores; nenhum travessão em texto de tela; linguagem simples; `grep` antes de criar classe CSS; comentários em português explicando o porquê; seguir o estilo do código. O discipulador NUNCA vê textos escritos, reflexões, anotações nem orações do discípulo.

## 1. Dados (esquema v8 em `db.mjs`)
```
CREATE TABLE discipulados (
  id TEXT PRIMARY KEY, discipulador TEXT NOT NULL, discipulo TEXT NOT NULL,
  estado TEXT NOT NULL,              -- 'convidado' | 'ativo' | 'encerrado'
  pediu TEXT NOT NULL,               -- quem fez o convite (pode ser qualquer um dos dois)
  criado_em TEXT NOT NULL, aceito_em TEXT NOT NULL DEFAULT '', encerrado_em TEXT NOT NULL DEFAULT '',
  mostrar TEXT NOT NULL DEFAULT '{}' -- o que o discípulo mostra: {"passos":bool,"semana":bool,"marcos":bool}
);
CREATE INDEX discipulados_discipulador ON discipulados (discipulador);
CREATE INDEX discipulados_discipulo ON discipulados (discipulo);
CREATE TABLE discipulado_encontros (discipulado TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (discipulado, data));
```
Marcos pessoais ficam na conta (campo `marcos` no JSON `extra`, sem coluna): `{ decisao: 'AAAA-MM-DD', batismo: '...', celula: '...', discipula: '...' }`, cada um opcional.
Apagar conta remove os discipulados da pessoa (dos dois lados) e os encontros deles.

## 2. Regras (`contas.mjs` + novo `discipulado.mjs` com funções puras, testadas sem servidor)
- Só entre amigos (relação 'amigos' em `contas.mjs`). Qualquer um dos dois pode convidar, dizendo o papel: "Quero te acompanhar na fé" (eu serei o discipulador) ou "Quero que você me acompanhe" (eu serei o discípulo). O outro aceita ou recusa.
- Uma pessoa tem no máximo 1 discipulador ativo; um discipulador tem no máximo 12 discípulos ativos.
- Ao aceitar, o discípulo escolhe o que mostrar (padrão: `passos` e `semana` ligados, `marcos` desligado) e pode mudar quando quiser.
- Qualquer um dos dois encerra (sem aviso ao outro além de a relação sumir da tela).
- O discipulador vê, conforme `mostrar`: `passos` = quantos dos 12 Primeiros passos o discípulo concluiu; `semana` = em quantos dias dos últimos 7 o discípulo leu (Power of 4: o discipulador vê se chegou a 4); `marcos` = os marcos com data. Nunca texto.
- Encontro 1 a 1: qualquer um dos dois marca "nos encontramos" numa data (hoje ou até 7 dias atrás); guarda só a data.
- Cadeia de 2 Tm 2.2: se o discípulo tem, ele mesmo, discípulos ativos e mostra `marcos`, o discipulador vê "acompanha N pessoa(s)", só o número, sem nomes.
- Marco `discipula` é preenchido sozinho quando a pessoa passa a ter o primeiro discípulo ativo (a pessoa pode apagar).

## 3. API (`servidor.mjs`)
- `GET /api/discipulado` → `{ meuDiscipulador: {usuario,nome,desde,mostrar,ultimoEncontro} | null, meusDiscipulos: [{usuario,nome,desde,ultimoEncontro, passos?, semana?, marcos?, acompanha?}], pedidos: [{id,de:{usuario,nome},papel}], marcos }`.
- `POST /api/discipulado` com ações: `convidar {usuario, papel: 'discipulador'|'discipulo'}`, `aceitar {id, mostrar}`, `recusar {id}`, `mostrar {id, mostrar}`, `encontro {id, data}`, `encerrar {id}`, `marco {chave, data|''}`.
- Avisos (push, pelo `avisoSocial` que já existe; NUNCA no Feed): `discipuladoConvite` ("{nome} quer caminhar com você na fé." / corpo: "Abra o app para ver o convite.") e `discipuladoAceito` ("{nome} aceitou caminhar com você na fé.").
- Limites e erros com mensagens simples ("essa pessoa já tem alguém acompanhando", "você já acompanha 12 pessoas").

## 4. Telas
- **Perfil → "Discipulado"** (novo atalho na lista "Meus conteúdos" ou seção própria, no padrão do Perfil), rota `#/perfil/discipulado`:
  - "Quem me acompanha": nome, desde quando, último encontro, "O que eu mostro" (3 interruptores: "Os Primeiros passos que concluí", "Em quantos dias li nesta semana", "Minha caminhada"), "Marcar que nos encontramos", "Encerrar".
  - "Quem eu acompanho": cada pessoa com o que ela mostra ("4 de 12 primeiros passos", "leu em 5 dos últimos 7 dias", marcos, "acompanha 1 pessoa"), último encontro, botão "Encontro da semana" (folha com o roteiro do item 5) e "Encerrar".
  - Pedidos recebidos, com "Aceitar" (abre a escolha do que mostrar) e "Agora não".
  - Botão "Convidar alguém" (lista de amigos + escolha do papel).
- **Perfil → "Minha caminhada"** (dentro da mesma tela, em cima): os 4 marcos com data opcional e botão para marcar/desmarcar: "Decidi seguir Jesus", "Fui batizado", "Entrei numa célula", "Comecei a acompanhar alguém na fé". Privados; aparecem para o discipulador só se `marcos` estiver ligado.
- **Integração com a Fase 1:** no bloco "Conhecendo Jesus" do Juntos, quando a pessoa terminou os 14 dias ou apertou "Quero conversar" (a API de amigos pode expor `pediuConversa: data` em `acompanhando`), aparece "Acompanhar na fé", que abre o convite de discipulado já com o papel "discipulador". Na tela "E agora, o que eu faço?", depois de "Quero conversar", uma linha: "Quando quiser, peça para alguém te acompanhar na fé no Perfil."

## 5. Roteiro do encontro da semana (texto fixo, escrito para o app)
Título: "Encontro da semana". Introdução: "Uma conversa de meia hora, pessoalmente ou por chamada. Sem pressa e sem prova."
1. "Como você está, de verdade?"
2. "O que você leu nesta semana que ficou com você?"
3. "O que você fez com o que leu? Tem algo que quer colocar em prática nesta semana?"
4. "Pelo que podemos orar juntos?"
Fecho: "Terminem orando um pelo outro." Botão: "Marcar que nos encontramos".
Base: Mateus 28.20 ("ensinando esses novos discípulos a obedecerem"); Estudo por Descoberta (a pergunta de obediência).

## 6. Testes
- `ferramentas/teste-discipulado.mjs` (novo, servidor descartável no padrão de `teste-celula.mjs`): convite só entre amigos; os dois papéis; limites (1 discipulador, 12 discípulos); `mostrar` controla exatamente o que vai para o discipulador; nenhum texto do discípulo aparece na resposta; encontro guarda só a data; encerrar; marco `discipula` automático; cadeia (número sem nomes); apagar conta limpa tudo; avisos nunca no Feed.
- Regras puras de `discipulado.mjs` em `teste.mjs` ou arquivo próprio.
- Migração v7 → v8 em `ferramentas/teste-db.mjs`.
- Percurso de navegador `...\scratchpad\discipulado-percurso.mjs` (padrão de `celula.mjs`): convite, aceite com escolha do que mostrar, o discipulador vê só o permitido, encontro da semana, marcos, encerrar. Capturas `f3-` em 390 claro, 320 claro e 390 escuro.
- Bateria de sempre verde. Não fazer commit, não publicar, não usar ssh.
