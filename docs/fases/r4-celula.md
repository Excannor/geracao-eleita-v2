# R4: Ler junto na célula

Objetivo: a célula ler junto dentro do app, sem virar rede social. Vem do roadmap de melhorias
(fase R4) e das recomendações 11, 12 e 15 do estudo do YouVersion. A especificação completa está em
`docs/r4-celula.md`.

Tom de todos os textos (pedido do dono): sem hipérbole e sem cara de texto gerado. Frases curtas,
factuais e calmas. Nada de "jornada", "mergulhe", "poderoso", "incrível", travessão, exclamação em
série ou tríade retórica.

Decisões do dono que valem para a fase inteira: participam só os membros da célula (visitantes ficam
de fora da conversa e da lista de oração) e quem conduz modera (líder e auxiliar).

A fase é feita em partes, uma de cada vez, cada uma com o seu commit e os seus testes:
R4.0 especificação, R4.1 conversa do dia (adiada pelo dono), R4.2 lista de oração, R4.3 convite
por QR code.

## R4.0 · Especificação

**O que é.** `docs/r4-celula.md`, sem código. Cobre quem vê e quem escreve, limites, moderação,
retenção, cuidados com menores, notificações, mudanças na política e nos termos, as migrações
(hoje v27 e v28, com a conversa adiada), a API, as telas e os testes de cada item.

**O que já existia e foi aproveitado.**
- A lista de oração não começa do zero: o pedido de oração e de ajuda da Fase 4 (`cuidado.mjs`,
  tabelas da v9, aba Oração) já tem destino "Toda a célula" ou "Só quem conduz", denúncia com 2
  denúncias escondendo e o aviso de perigo. A R4.2 troca "Orei por você" por "Estou orando" com
  contagem e acrescenta atualizações e "Respondidas".
- O QR code também já existe: a folha "Link da célula" desenha o link de 30 dias com a peça
  `qrcode`. A R4.3 acrescenta o código do encontro, com validade de 4 horas e só para quem conduz.
- O dia da célula (`diaDaCelula`, R2.1) e as reflexões do dia no servidor (`APP.reflexoes`, 365
  dias) dão a pergunta da conversa sem depender do app.

**Decisões do dono (16/11), registradas no topo da especificação:**
- A Conversa do dia (R4.1) está adiada. O desenho fica no documento, marcado como adiado.
- Denúncia de perigo: quem conduz é avisado na hora pelo `denunciaPerigo` que já existe (na lista
  de oração isso já é assim).
- QR do encontro: não conta para Semeadores.
- Consentimento: não muda. A política sobe para a versão 8 só no que a R4.2 e a R4.3 mudarem.
- Com a conversa adiada, a lista de oração é a migração v27 e o QR a v28.

**Testes.** Nenhum código mudou. Build e `teste.mjs` rodados para registrar a base: 1653 checagens,
todas passaram; folga do index de 63,2 KB.

## R4.1 · Conversa do dia

Adiada pelo dono em 16/11. O desenho continua em `docs/r4-celula.md`, marcado como adiado. Nada
dela foi implementado.

## R4.2 · Lista de oração da célula

**O que mudou para quem usa.** A aba Oração da célula, que já existia (Fase 4):
- "Orei por você" (uma vez por dia, com o autor vendo os nomes) virou **"Estou orando"**: um gesto
  por pessoa, que se desfaz tocando de novo ("Você está orando"). Todos que veem o pedido veem só
  "3 pessoas estão orando". Ninguém vê quem, nem o autor.
- O autor escreve **atualizações** (até 5 por pedido, 200 caracteres, 3 por dia), mostradas da mais
  nova para a mais antiga, com a data. Ele apaga cada uma. O texto do pedido continua sem edição.
- "Deus respondeu" abre uma folha com o campo opcional "Como Deus respondeu" (vira a última
  atualização). A oração respondida sai dos pedidos e vai para **"Respondidas"**, vista por quem já
  via o pedido, até o vencimento que ele já tinha. O pedido de ajuda resolvido ("Já resolvi") some
  da lista dos outros, como antes.
- Quem conduz **tira** um pedido de outra pessoa sem esperar denúncia.
- Pedido e atualização com telefone, e-mail, link, @ de rede social, endereço ou palavra da lista
  são **recusados**, com a frase do que tirar ("Tire o número de telefone antes de enviar.").
- A denúncia de perigo continua avisando quem conduz na hora pelo `denunciaPerigo` que já existe.
  Nenhuma notificação nova.

**Servidor.**
- `filtro-texto.mjs` (novo, puro): `conferirTexto` e `MENSAGEM_DO_FILTRO`. Telefone é 8 dígitos ou
  mais num trecho de dígitos, espaço, ponto, hífen, parênteses e "+" (a barra separa: datas passam);
  CEP com hífen conta como endereço; a lista de palavras é comparada por palavra inteira, sem
  acento, com números trocados por letras e letras repetidas juntadas. Referências bíblicas passam.
- `cuidado.mjs`: `estaOrando`, `quantosOrando`, `atualizacaoValida` e os limites; a oração
  respondida continua visível para quem a via.
- `contas.mjs`: `orarPorPedido(…, sim)`, `atualizarPedido`, `apagarAtualizacao`, `tirarPedido`,
  `marcarRespondido(…, texto)` (guarda `respondidoEm`; só o pedido de ajuda encurta o vencimento).
  `pedidoVisivel` passou a respeitar o destino: o membro não age pelo id num pedido só para quem
  conduz. `paraLinhas` e `deLinhas` levam `respondido_em` e as atualizações.
- `servidor.mjs`, `/api/cuidado`: o item leva `orando`, `euOro`, `atualizacoes`, `respondidoEm`; a
  resposta ganha `respondidas`; ao autor, de quem reagiu, só os nomes de "Posso ajudar". Ações novas
  `orando`, `atualizar`, `apagarAtualizacao`, `tirar`; `orei` (o app de antes) vira `orando` ligado.
  Limite de 20 gravações de texto por minuto. Quem não é da célula recebe 404; o visitante, 403.
- `db.mjs`, **v27**: `pedidos.respondido_em` (deduzida do vencimento encurtado nos respondidos de
  antes), os `orei` viram um `orando` por pessoa, e a tabela `pedido_atualizacoes`.
  `apagarPessoaDoBanco` leva as atualizações dos pedidos da pessoa.
- `painel.mjs`: "orações respondidas em 30 dias", só o número.

**Tela.** A aba Oração saiu do index para a peça `oracao` (`src/sob-demanda/oracao.js` e `.css`),
pedida quando a aba abre; `08b-propositos.js` ficou com a casca. Folga do index: 63,2 → 74,9 KB.

**Política e termos.** Política na versão 8 (19/11): o quadro de quem vê (contagem sem nomes,
Respondidas, atualizações), a guarda, o "Tirar" de quem conduz e o filtro. O consentimento não
mudou. Termos: a regra de não escrever telefone, e-mail, link, @, endereço ou a vida de outra pessoa
num pedido, e o "Tirar" de quem conduz.

**Testes.** `teste.mjs` ganhou a seção "lista de oração da célula" (filtro, regras, contas com o
banco relido) e a peça `oracao`. `ferramentas/teste-r4.mjs` (novo) confere a segurança no servidor e
a aba nos dois temas. `teste-cuidado`, `teste-db` e `teste-rolagem` foram atualizados para o
comportamento novo. Capturas em `r4-capturas/R4.2/`.

Resultados (19/11): `teste.mjs` 1683 checagens, todas passaram; `teste-r4` 98 ok; teste-navegacao,
teste-barra-abas, teste-redesenho, teste-sob-demanda, teste-offline, teste-volta, teste-celula,
teste-celula-botoes, teste-conta, teste-conta-gerir, teste-db, teste-cuidado e teste-rolagem sem
falha.
