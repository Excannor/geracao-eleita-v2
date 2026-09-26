# Fase 4: Cuidado mútuo (Atos 2.42 e 2.44-45)

Objetivo: dar lugar às "orações" e ao "repartiam com os que tinham necessidade" dentro da célula, sem virar rede social. O pedido é do autor; os outros só respondem com um gesto sem texto. A conversa, quando houver, acontece fora do app (pessoalmente ou no WhatsApp).

Regras gerais (valem para tudo):
- **Sem chat e sem resposta em texto entre usuários.** Texto livre só do autor do pedido. Os outros têm só "Orei por você" ou "Posso ajudar".
- Nada vai para o Feed. Nada de XP, conquista, troféu ou contagem pública.
- Visitante não vê nem cria pedido: pedido de oração é dado sensível, e ele ainda não é membro.
- Nenhuma nota de bastidores e nenhum travessão em texto de tela. Linguagem simples.
- Dar `grep` antes de criar classe CSS. Comentários em português explicando o porquê.
- **Minimização:** o pedido vence (7 ou 30 dias) e some; 30 dias depois de vencer é apagado do banco com as reações e denúncias.

## 1. Dados (esquema v9 em `db.mjs`)
```
CREATE TABLE pedidos (
  id TEXT PRIMARY KEY, celula TEXT NOT NULL, autor TEXT NOT NULL,
  tipo TEXT NOT NULL,                 -- 'oracao' | 'necessidade'
  destino TEXT NOT NULL,              -- 'celula' | 'conduz' (líder e auxiliar); necessidade é sempre 'celula'
  texto TEXT NOT NULL,                -- até 280 caracteres (oração) ou 200 (necessidade)
  criado_em TEXT NOT NULL, vence_em TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'ativo', -- 'ativo' | 'respondido' | 'removido'
  removido_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX pedidos_celula ON pedidos (celula);
CREATE TABLE pedido_gestos (pedido TEXT NOT NULL, usuario TEXT NOT NULL, gesto TEXT NOT NULL, data TEXT NOT NULL,
  PRIMARY KEY (pedido, usuario, gesto, data));   -- 'orei' (uma vez por dia) | 'ajudo' (uma vez só)
CREATE TABLE pedido_denuncias (pedido TEXT NOT NULL, usuario TEXT NOT NULL, motivo TEXT NOT NULL, em TEXT NOT NULL,
  PRIMARY KEY (pedido, usuario));
```
Apagar conta remove os pedidos da pessoa, os gestos e as denúncias dela. Sair ou ser tirado da célula remove os pedidos dela naquela célula.

## 2. Regras (`cuidado.mjs` novo, funções puras testadas sem servidor; operações em `contas.mjs`)
- Só membro ativo que não é visitante cria, vê e reage.
- Até 3 pedidos ativos por pessoa em cada célula.
- Quem vê: `destino 'celula'` = todos os membros ativos (não visitantes); `destino 'conduz'` = o autor, o líder e os auxiliares.
- O autor pode: marcar "Deus respondeu" (estado 'respondido', some da lista dos outros e fica 7 dias na dele), apagar, e não pode editar o texto (evita mudar o sentido depois de outros terem orado).
- "Orei por você": uma vez por dia por pessoa. O autor vê quem orou e quando ("Ana e Lucas oraram por você · última vez em 26/09"). Os outros veem só "Você orou hoje".
- "Posso ajudar" (só em necessidade): uma vez por pessoa. O autor recebe aviso e vê o nome; a combinação é fora do app.
- Denúncia: qualquer pessoa que vê o pedido pode denunciar, com motivo fixo: "É ofensivo", "Não é um pedido", "Alguém pode estar em perigo". Com 2 denúncias o pedido fica escondido até quem conduz decidir. Quem conduz vê as denúncias e pode "Manter" ou "Tirar" (estado 'removido', `removido_por`). Quem denuncia não é identificado para o autor.
- "Alguém pode estar em perigo": além de ir para quem conduz, mostra na hora, para quem denunciou, a caixa de ajuda (texto da seção 5).

## 3. API (`servidor.mjs`)
- `GET /api/cuidado?celula=ID` → `{ pedidos: [{id, autor:{usuario,nome}, tipo, destino, texto, criadoEm, venceEm, meu, oreiHoje, ajudei, gestos? (só no meu: [{usuario,nome,gesto,data}])}], denuncias? (só para quem conduz: [{pedido, texto, autor, motivos:[...], total}]) }`.
- `POST /api/cuidado` com ações: `criar {celula, tipo, destino, texto, dias: 7|30}`, `orei {id}`, `ajudo {id}`, `respondido {id}`, `apagar {id}`, `denunciar {id, motivo}`, `decidir {id, manter: bool}`.
- Avisos (push, pelo `avisoSocial`; NUNCA no Feed):
  - `pedidoConduz` para líder e auxiliares quando alguém cria um pedido só para eles: "{nome} deixou um pedido de oração para você." / "Abra a célula para ver.";
  - `possoAjudar` ao autor: "{nome} pode ajudar com o que você pediu." / "Combinem pessoalmente ou no WhatsApp.";
  - `denunciaPerigo` para quem conduz, só no motivo de perigo: "Um pedido da célula precisa da sua atenção." / "Abra a célula para ver.".
  - Nada de aviso para a célula inteira a cada pedido novo.
- Limpeza: na rotina diária que já existe (ou na leitura), apagar pedidos vencidos há mais de 30 dias, com gestos e denúncias.

## 4. Telas
- **Célula, aba nova "Oração"** (entre Estudo e Pessoas; conferir se 4 abas cabem a 320 px, senão encurtar rótulos):
  - Botão "Pedir oração" e "Pedir ajuda" (folha: texto com contador, "Para quem?" = "Toda a célula" / "Só quem conduz" (só na oração), "Por quanto tempo?" = "7 dias" / "30 dias").
  - Acima do campo de texto, sempre: a caixa de ajuda da seção 5, em versão curta.
  - Lista dos pedidos ativos, os meus primeiro, cada um com nome, texto, "vence em DD/MM", e os botões "Orei por você" / "Posso ajudar". No meu: quem orou, "Deus respondeu", "Apagar".
  - Menu discreto "Denunciar" em cada pedido que não é meu.
  - Quem conduz vê no topo "Pedidos para rever" quando houver denúncia, com "Manter" / "Tirar".
  - Estado vazio: "Nenhum pedido agora. Quando alguém pedir oração, aparece aqui."
- **Perfil → "Minha história com Deus"** (rota `#/perfil/historia`), guia privado:
  - Introdução: "Contar o que Deus fez na sua vida é um jeito simples de falar de Jesus. Escreva só para você. Ninguém vê o que está aqui."
  - Três campos (até 600 caracteres cada), com as perguntas-guia:
    1. "Antes: como era a sua vida? O que você buscava?"
    2. "O encontro: como você conheceu Jesus? Quem estava por perto?"
    3. "Hoje: o que mudou? Conte uma coisa concreta."
  - Dica abaixo: "Use palavras suas, sem termos de igreja. Três minutos de conversa bastam." Botão "Copiar minha história" (a pessoa manda para quem quiser).
  - Guardar no estado da pessoa (`E.historia = {antes, encontro, hoje, em}`), fundido entre aparelhos pelo `em` mais recente (em `fundir`, `02-estado.js`). Nunca vai para API de amigos, célula, discipulado nem painel.

## 5. Caixa de ajuda (texto fixo)
"Se você ou alguém está em perigo, se machucando ou pensando em se machucar, não espere: fale agora com um adulto de confiança ou ligue 188 (CVV), a qualquer hora. Em emergência, 192 ou 190."
Versão curta, acima do campo de pedido: "Em perigo ou pensando em se machucar? Ligue 188 (CVV) ou fale com um adulto de confiança agora."
Para quem conduz, junto da denúncia de perigo: "Procure a pessoa hoje e avise o pastor ou um responsável da igreja. Em emergência, 192 ou 190. Não tente resolver sozinho."

## 6. Testes
- `ferramentas/teste-cuidado.mjs` (novo, servidor descartável no padrão de `teste-celula.mjs`): visitante não vê nem cria; destino 'conduz' invisível para membro comum; limite de 3; "orei" uma vez por dia; autor vê os gestos e os outros não; "ajudo" uma vez; respondido e apagar; denúncia anônima para o autor; 2 denúncias escondem; decidir manter/tirar só por quem conduz; avisos nunca no Feed; sair da célula e apagar conta limpam; limpeza de vencidos.
- Regras puras de `cuidado.mjs` em arquivo próprio ou em `teste.mjs`.
- `fundir` da `historia` em `teste.mjs`.
- Migração v8 → v9 em `ferramentas/teste-db.mjs`.
- Percurso de navegador `...\scratchpad\cuidado-percurso.mjs` (molde `celula2-percurso.mjs`), capturas `f4-` em 390 claro, 320 claro e 390 escuro.
- Bateria de sempre verde. Não fazer commit, não publicar, não usar ssh.
