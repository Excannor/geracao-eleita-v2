# À Mesa: Próximos estudos (a fila de estudos da célula)

Pedido do dono, aprovado ("Pode"): o líder deixa prontos os estudos dos próximos encontros, cada um com a data do encontro a que se destina, e depois de cada encontro o próximo entra sozinho na aba Estudo. A fila mora no servidor (aparece em qualquer aparelho) e só quem conduz a célula a vê. O "Dividir em 2 encontros" (seção 17 de `docs/a-mesa-fase2.md`), que guardava a parte 2 só no celular do líder, passa a pôr as partes seguintes direto nessa fila.

Este documento vai do macro ao micro: o que vale (0), os dados (1), as regras puras (2), a API e as permissões (3), a regra da promoção e os casos de borda (4), as telas (5), os textos (6) e os testes (7). Parte do código de `redesenho-novo` em `77ad250`.

## 0. O que vale e o que fica de fora

**Do que já existe e continua valendo:**

- Só o **líder** (`celulaDeQuemPrepara`: quem criou a célula, ativo, sem aprovação pendente) prepara, muda ou tira estudo (decisão do dono de 17/10). Agendar, mudar, reordenar, mudar a data, tirar e usar agora um estudo da fila é preparar: só o líder.
- Os tetos do estudo são os mesmos, conferidos pelo mesmo `validarLeitura` para cada estudo da fila: 80 partes, 15 versículos, 10.000 caracteres (e 1.500 por parte, 12 linhas por lista, 6 perguntas, 200 no combinado).
- Privacidade: o histórico não guarda nomes nem Acolhida e Testemunho; o visitante vê só o estudo atual; os membros veem o atual e os anteriores. Um estudo da fila **não é** estudo atual nem anterior: ninguém fora de quem conduz o vê, nem sabe que existe.
- O texto bíblico só vem de `conteudo/biblias` pela referência; a fila guarda a mesma fonte limpa que o estudo atual guarda.
- Voz cordial, curta, sem culpa, sem gíria e sem travessão. Paleta C, claro e escuro, 390 e 360 px, toque de 44 px, letra de 12 px.

**Decisões deste plano** (as marcadas "conferir" vão para o dono):

| # | Decisão | Por quê |
|---|---|---|
| F1 | A fila são linhas de `celula_estudos` com `agendado_para` (a data do encontro). Nada de tabela nova. | O estudo agendado é um estudo como os outros (tipo, fonte, partes, perguntas, combinado, autor) que ainda não entrou na célula. Ao entrar, ele só deixa de estar agendado: as regras de usado, do dia, do combinado e do histórico seguem sem mudança. |
| F2 | Quem conduz (líder e **auxiliar**) **vê** a fila e abre cada estudo dela. Só o **líder** mexe nela. Conferir. | O pedido diz que a fila aparece "a todo líder, co-líder incluído, pelo modelo de papéis que existir". O modelo que existe é líder e auxiliar, e a decisão de 17/10 diz que o auxiliar não prepara estudo. Ver é conduzir (o auxiliar também conduz o encontro); mexer é preparar. Se o dono quiser o auxiliar mexendo, é trocar `celulaDeQuemPrepara` por `celulaDeQuemConduz` nas ações da fila. |
| F3 | A ordem da fila é a ordem das datas: uma data por estudo, sem repetir. Reordenar troca os estudos de lugar e **as datas ficam onde estavam**. | Uma fonte da verdade só (a data), sem coluna de ordem que possa discordar dela. "Passar para antes" quer dizer "usar num encontro mais cedo". |
| F4 | A promoção é do servidor, avaliada a cada leitura da célula, a cada registro de encontro e a cada mudança na fila. Sem relógio, sem tarefa agendada. | "No começo do dia" vira "na primeira vez que alguém abre a célula naquele dia", e o que cada um vê é sempre o que a regra manda naquele instante, em qualquer aparelho. |
| F5 | A regra da promoção (seção 4): o primeiro da fila entra quando o estudo atual **já teve o encontro dele** (ou não há estudo atual) **e** o primeiro é do próximo encontro. | Depois do encontro, a célula já lê o estudo seguinte, como faria o "Preparar o próximo". E nunca passa por cima de um estudo atual que a célula ainda não viveu. |
| F6 | "Já teve o encontro dele" é mais estrito que o `estudoUsado` de hoje: o dia da semana que passou só conta quando ninguém registrou, naquele dia, "Não houve encontro" ou um encontro com outro estudo. | O `estudoUsado` responde "o líder deve preparar o próximo?", e na dúvida diz que sim. A promoção é automática: na semana sem encontro, ela não pode gastar o estudo da semana. |
| F7 | Ao entrar na célula, o estudo ganha `criado_em` = o instante da promoção, e o instante em que foi escrito fica em `preparado_em`. | Todas as regras de hoje leem `criado_em` como "o instante em que o estudo passou a valer na célula" (o dia em que nasceu, o estudo do dia, o combinado de antes, a ordem do histórico, o corte da filha). Com isso nenhuma delas muda, e um estudo escrito antes da multiplicação e promovido depois não vai para a filha, porque a célula mãe e a filha não o viveram juntas (A2 da Fase 2). |
| F8 | O estudo agendado não leva Acolhida, Adoração e Testemunho. Ao entrar na célula, os três voltam a vazio (as sugestões da semana), como todo estudo novo (A5). | Os três moram na célula, não no estudo, e o Testemunho pode ter nomes. O líder ajusta os três quando o estudo já é o da semana. |
| F9 | Quando o líder sai da célula ou apaga a conta, os estudos que ele deixou na fila saem junto. O atual e os anteriores ficam com o @ (decisão 4 da Fase 2). | A fila é o plano de quem prepara, e a célula nunca recebeu esses estudos. Sem o líder, ninguém poderia mexer nela, e publicar sozinho o texto de quem saiu não cabe. |
| F10 | A fila tem até **12** estudos (uns três meses). Cada gravação na fila usa o mesmo limite de 20 por minuto de `estudo:<@>`. | Planejar três meses já é muito. O teto de 200 estudos por célula não conta nem apaga estudo da fila. |
| F11 | O "Dividir em 2 encontros" guarda as partes no rascunho até "Salvar", e o mesmo pedido que grava a parte 1 grava as seguintes na fila, numa transação só. | Sem metade gravada: ou entra o estudo dividido inteiro, ou nada. "Desfazer a divisão" continua só no rascunho, sem ida ao servidor. |

**Fica de fora:** aviso no sino ou push quando um estudo entra na célula; arrastar para reordenar (ficam as setas); Acolhida, Adoração e Testemunho guardados por estudo da fila; anotação pessoal num estudo da fila (ela nasce quando o estudo entra na célula); imprimir um estudo da fila; o auxiliar mexendo na fila (F2).

---

## 1. Modelo de dados

### 1.1 Esquema v23 (`db.mjs`, depois da v22)

```sql
-- v23: os próximos estudos da célula (docs/a-mesa-fila.md). Um estudo agendado é uma linha de
-- celula_estudos com agendado_para = o dia do encontro a que ele se destina ('AAAA-MM-DD'); vazio
-- para o atual e os anteriores. Ao entrar na célula, agendado_para volta a '', criado_em passa a ser
-- o instante em que ele entrou, e preparado_em guarda o instante em que foi escrito.
ALTER TABLE celula_estudos ADD COLUMN agendado_para TEXT NOT NULL DEFAULT '';
ALTER TABLE celula_estudos ADD COLUMN preparado_em TEXT NOT NULL DEFAULT '';
```

Os três estados de uma linha, que nunca se sobrepõem:

| Estado | Como se sabe |
|---|---|
| atual | `id = propositos.estudo_id` |
| anterior | `atual_ate != ''` |
| na fila | `agendado_para != ''` (e então `atual_ate = ''` e não é o atual) |

Por que assim:

- **Sem índice novo.** A fila de uma célula é lida com `WHERE proposito = ? AND agendado_para != '' ORDER BY agendado_para, id`, que usa o prefixo `proposito` do índice da v19 e no máximo 12 linhas.
- **Sem preencher nada.** Toda linha que existe nasce com `agendado_para = ''` (não está na fila) e `preparado_em = ''` (o instante em que foi escrita é o próprio `criado_em`).
- **`criado_em` muda na promoção** (F7). O nome da coluna fica, porque coluna não se apaga, mas o sentido passa a ser "o instante em que o estudo entrou na célula como atual; na fila, o instante em que foi escrito". O comentário da v23 e o de `estudoDaLinha` dizem isso.
- **Fora da foto em memória**, como o resto de `celula_estudos`: lida e gravada direto, sem a armadilha do `INSERT OR REPLACE` (docs/aprendizados.md, 2026-10-17).

### 1.2 O que cada consulta de hoje passa a fazer

| Onde | Muda |
|---|---|
| `estudosLeves` (lista, folha de registro, estudo do dia, mãe) | `AND agendado_para = ''`: a fila nunca entra no histórico, na folha de registro nem no estudo de um dia. |
| `dadosDoEstudo`, o anterior do combinado | `AND agendado_para = ''` |
| teto de 200 em `salvarEstudo` | só conta e só apaga linhas com `agendado_para = ''` |
| `registrarEncontro` com um id | um estudo da fila é recusado (400, `estudoDoRegistro`) |
| `acessoAoEstudo` | o estudo da fila: só quem conduz a própria célula lê; todos os outros recebem 404 (seção 2.1) |
| `estudoDaLinha` | lê `agendadoPara` e `preparadoEm` |
| `Contas.apagar`, `apagarPessoaDoBanco` | apagam as linhas da fila que a pessoa escreveu (F9) |
| `sairDoProposito` | o líder que sai leva a fila da célula (F9) |

---

## 2. As regras (funções puras)

### 2.1 No servidor (`estudos.mjs`), sem banco e sem relógio

```js
export const FILA_MAX = 12;
// O primeiro dia de encontro depois de d: o dia da semana da célula (0 a 6); sem dia marcado
// (encontro -1), d + 7.
export function encontroDepois(d, encontro)
// O limite da promoção: o primeiro encontro depois de hoje. O primeiro da fila só entra se a data
// dele chega até aqui (é do próximo encontro, ou de um que já passou).
export function limiteDaFila({ hoje, encontro })
// A primeira data livre para a fila: o primeiro encontro de hoje em diante que ainda não aconteceu
// (depois do último encontro registrado, "Não houve encontro" incluído); se o estudo atual ainda
// espera o encontro dele, o seguinte. Sem dia marcado: hoje + 7.
export function primeiraDataDaFila({ hoje, encontro, ultimoEncontro, atualEspera })
// A data que um estudo novo na fila recebe sem escolha: o encontro depois do último da fila, ou a
// primeira data livre.
export function proximaDataDaFila(fila, contexto)
// Põe um estudo numa data. Se a data já tem um estudo, ele e os seguintes passam, cada um, para o
// primeiro encontro depois do anterior (a fila empurra); datas que já estão depois ficam.
// Devolve a fila nova, em ordem, [{ id, data }].
export function encaixarNaFila(fila, { id, data }, encontro)
// Reordenar: ordem é a lista dos ids na ordem nova (a mesma lista, sem faltar nem sobrar, senão
// null). As datas ficam nos lugares: o primeiro da ordem nova fica com a data mais cedo.
export function reordenarFila(fila, ordem)
// "Ajustar as datas": a fila inteira, na mesma ordem, nos encontros a partir da primeira data livre.
export function ajustarDatasDaFila(fila, primeira, encontro)
// O estudo atual já teve o encontro dele (F6): um encontro registrado ligado a ele; ou um registro
// sem estudo ligado (de antes da v20) feito depois que ele entrou; ou, desde o dia em que ele entrou
// (sem contar hoje), passou um dia de encontro em que ninguém registrou "Não houve encontro" nem um
// encontro com outro estudo.
export function jaTeveEncontro({ id, criadoEm, nasceu, hoje, encontro, encontros })
// A promoção (seção 4): o primeiro da fila entra agora?
export function devePromover({ atual, cabeca, hoje, encontro, encontros, diaDe }) // -> boolean
// A data de um pedido: 'AAAA-MM-DD', de hoje até um ano à frente. Lança erro(MENSAGENS.dataDaFila).
export function limparDataDaFila(data, hoje)
// O estudo da fila como quem conduz o recebe (no retrato e na leitura).
export function itemDaFila(e, { nomeDe }) // -> { id, tipo, titulo, refs, data, criadoPor, criadoPorNome, editadoEm }
```

`acessoAoEstudo` ganha, antes de tudo, o estudo da fila:

- `e.agendadoPara` e `e.proposito === p.id` e `ativo` e `conduz`: `ler`, com `fila: true`, `atual: false`, `presenca: false`, `usarComoBase: false`;
- qualquer outro caso com `e.agendadoPara`: **404**, nunca 403 (a visitante, o membro, a filha de uma multiplicação e quem é de fora não descobrem que o estudo existe).

`MENSAGENS` ganha:

- `filaCheia: 'a fila tem no máximo 12 estudos'`;
- `dataDaFila: 'escolha uma data de hoje até um ano para a frente'`;
- `foraDaFila: 'esse estudo já não está nos próximos estudos'`;
- `filaMudou: 'os próximos estudos mudaram em outro aparelho. Veja como ficaram'`;
- `estudoMudou: 'esse estudo mudou em outro aparelho. Abra de novo para ver a versão salva'`;
- `confirmarUsar: 'o estudo atual ainda não foi usado num encontro'`.

### 2.2 No cliente (`CC.estudoRegras`, `estudo-regras.js`), sem tela

- `dataCurta(iso)`: "qui 30/10".
- `dataLonga(iso)`: "quinta, 30/10".
- `linhaDoProximo(fila)`: "Próximo: Batalha espiritual · qui 30/10", ou '' com a fila vazia.
- `quandoNaFila(item, hoje)`: "Para quinta, 30/10" ou, com a data já passada, "Para quinta, 23/10 · a data já passou".
- `moverNaFila(ids, i, passo)`: a lista nova com o item i trocado de lugar com o vizinho (passo -1 ou +1), ou null nas pontas.
- `datasPedemAjuste(fila, { hoje, encontro })`: alguma data já passou, ou (com dia marcado) caiu fora do dia do encontro.
- `escolhaDoPreparo({ temAtual, atualUsado, editando, novo })`: 'agora', 'agendar' ou '' (sem escolha). Com estudo atual e preparando um estudo novo: 'agendar' quando o atual ainda espera o encontro dele ou quando o caminho foi "Agendar um estudo" (`…/preparar/novo`); senão 'agora'. Em "Usar como base", 'agora' (a confirmação de lá já disse que o atual sai). Sem estudo atual, ou mudando o atual ou um da fila: ''.
- `partesDoCelular(guardado)`: as partes que a versão anterior guardou neste celular (`cc.estudo.proximos.<célula>`), no formato do pedido `filaPartes` ([{ fonte, traducao }]), na ordem.

---

## 3. API e permissões

### 3.1 Quem pode o quê

| Ação | Líder | Auxiliar | Membro | Visitante | De fora (outra célula, administrador, convidado, quem saiu) |
|---|---|---|---|---|---|
| Ver a fila (`fila` no retrato) | sim | sim | não (sem o campo) | não (sem o campo) | não (sem a célula) |
| Abrir um estudo da fila (`GET /api/estudos?estudo=`) | sim, com a fonte | sim, sem a fonte | 404 | 404 | 404 |
| Agendar um estudo (`estudo` com `agendar`) | sim | 403 | 403 | 403 | 403 ou 404 |
| Mudar um estudo da fila (`estudo` com `base` dele) | sim | 403 | 403 | 403 | 403 ou 404 |
| Mudar a data (`filaData`) | sim | 403 | 403 | 403 | 403 ou 404 |
| Reordenar (`filaOrdem`) | sim | 403 | 403 | 403 | 403 ou 404 |
| Ajustar as datas (`filaAjustar`) | sim | 403 | 403 | 403 | 403 ou 404 |
| Tirar da fila (`filaTirar`) | sim | 403 | 403 | 403 | 403 ou 404 |
| Usar agora (`filaUsar`) | sim | 403 | 403 | 403 | 403 ou 404 |
| Pôr na fila as partes do celular (`filaPartes`) | sim | 403 | 403 | 403 | 403 ou 404 |
| Promoção automática | o servidor, para todos: quem lê a célula vê o estudo novo como atual | | | | |

403 é o de `celulaDeQuemPrepara` ("só o líder da célula prepara o estudo", ou o da aprovação pendente); 404 é "célula não encontrada". O líder de outra célula, o administrador que abre a célula pelo painel e o convidado que ainda não aceitou não recebem a fila.

### 3.2 Listar: `GET /api/propositos`

Só para quem conduz (`euConduzo`), no bloco que já é só deles:

```js
fila: [ { id: 'e7a1…', tipo: 'blocos', titulo: 'O fruto do Espírito no dia a dia (parte 2)', refs: ['Gálatas 5.22-23'],
          data: '2026-10-29', criadoPor: 'marcos', criadoPorNome: 'Marcos', editadoEm: '' } ],
filaProxima: '2026-11-05',   // a data que um estudo novo na fila recebe sem escolha
filaPrimeira: '2026-10-29',  // a primeira data livre (a de "Ajustar as datas")
filaLimite: '2026-10-29',    // o limite da promoção (sem estudo atual, o primeiro da fila com data até aqui entra)
```

Antes de montar a célula, o retrato chama `Contas.promoverDaFila(p)` (seção 4).

### 3.3 Abrir um: `GET /api/estudos?estudo=<id>&celula=<id>`

Para o estudo da fila, com a regra da seção 2.1:

```js
{ celula, atual: false, fila: true, agendado: { data: '2026-10-29' }, data: '2026-10-29', dataDe: 'agendado',
  estudo: { /* estudoNoRetrato; a fonte só para o líder */ }, encontros: [], usarComoBase: false }
```

### 3.4 Agendar e mudar: `POST /api/celula`, ação `estudo`

O pedido de sempre (Fase 1 e 2) ganha quatro campos, todos opcionais:

```js
{ acao: 'estudo', id, estudo: 'blocos' | 'semana' | 'trecho', fonte, ref, traducao, perguntas, combinado, base,
  agendar: true,              // novo: o estudo vai para a fila, em vez de entrar na célula
  data: '2026-11-05',         // novo: a data na fila (sem ela, filaProxima); vale com agendar e ao mudar um da fila
  baseEm: '<editadoEm>',      // novo: ao mudar um da fila, a versão que o rascunho começou (409 se mudou)
  seguintes: ['<fonte da parte 2>', '<fonte da parte 3>'] }   // novo: as partes seguintes de um estudo dividido
```

- **`agendar: true`:** nasce uma linha com `agendado_para`; o estudo atual, o ponteiro da célula e Acolhida, Adoração e Testemunho não mudam (os três do pedido são ignorados). A data passa por `limparDataDaFila` e por `encaixarNaFila`. Com a fila cheia: 400 `filaCheia`.
- **`base` igual a um estudo da fila desta célula:** a mesma linha é atualizada e continua na fila; com `data`, ela muda de lugar como em `filaData`. Com `baseEm` diferente do `editado_em` da linha: **409** `estudoMudou`. Uma `base` que já saiu da fila (foi promovida ou tirada) dá **409** `foraDaFila`, e nada é gravado: o rascunho fica no celular.
- **Sem `agendar` e sem base da fila:** como hoje (entra na célula; o atual vai para o histórico, ou é corrigido se ainda não foi usado).
- **`seguintes`:** cada fonte passa pelo mesmo leitor e pelo mesmo `validarLeitura` (com a mesma tradução e sem perguntas escolhidas: as do texto, se houver). Elas entram na fila logo depois do estudo do pedido: depois da data dele, quando ele é agendado ou é da fila; depois do encontro do estudo atual, quando ele entra na célula agora. Os que estavam na fila a partir dali são empurrados (`encaixarNaFila`). Até 11 (`FILA_MAX - 1`), e a fila inteira até 12. Uma parte recusada recusa o pedido inteiro, com a mensagem dela precedida de "na parte N: " (a tela põe a maiúscula).
- **Resposta:** `{ estudo, agendado: { data } | null, fila: [...] }` (a fila só para o líder, já no formato do retrato).

### 3.5 As ações da fila: `POST /api/celula`

| Ação | Corpo | O que faz | Erros |
|---|---|---|---|
| `filaData` | `{ id, estudo, data }` | põe o estudo na data (`encaixarNaFila`) | 400 data; 404 `foraDaFila` |
| `filaOrdem` | `{ id, ordem: [ids] }` | troca a ordem; as datas ficam nos lugares | 409 `filaMudou` se a lista não é a fila de agora |
| `filaAjustar` | `{ id }` | a fila inteira a partir de `filaPrimeira`, um encontro por estudo | nenhum (fila vazia: nada muda) |
| `filaTirar` | `{ id, estudo }` | apaga a linha (a célula nunca a recebeu) | 404 `foraDaFila` |
| `filaUsar` | `{ id, estudo, confirmar }` | o estudo entra na célula agora, como numa promoção | 404 `foraDaFila`; **409** `confirmarUsar` com `{ precisaConfirmar: true }` quando o atual ainda não foi usado num encontro e `confirmar` não é `true` |
| `filaPartes` | `{ id, partes: [{ fonte, traducao }] }` | põe na fila as partes que a versão anterior guardou no celular, logo depois do encontro do estudo atual, empurrando o resto | 400 da parte ("Parte 2: …"); 400 `filaCheia` |

Toda ação responde `{ fila: [...], promovido: { id, titulo } | null }`, depois de rodar a promoção.

### 3.6 O registro de encontro

`registrarEncontro` roda a promoção depois de gravar e a resposta ganha `promovido: { id, tipo, titulo, refs } | null`. A folha avisa "Encontro registrado. O próximo estudo já está na aba Estudo." quando houve promoção.

---

## 4. A promoção

### 4.1 A regra

O **primeiro da fila** (a data mais cedo) passa a ser o estudo da célula quando as duas coisas valem:

1. **O estudo atual já teve o encontro dele**, ou a célula está sem estudo atual. "Já teve" (`jaTeveEncontro`, F6) é:
   - um encontro registrado ligado a ele (a folha "Quem foi ao encontro?" com ele escolhido); ou
   - um registro sem estudo ligado, de um app antigo, feito depois que ele entrou (a regra da Fase 1); ou
   - desde o dia em que ele entrou (sem contar hoje), passou o dia do encontro da célula e ninguém registrou, para aquele dia, "Não houve encontro nesta semana" nem um encontro com outro estudo (o "Outro estudo, fora do app" incluído). É o caso de quem esqueceu de registrar.
2. **O primeiro da fila é do próximo encontro:** a data dele vai até o primeiro dia de encontro depois de hoje (`limiteDaFila`). Sem dia de encontro marcado, até hoje + 7. Uma data que já passou também serve.

Ela é conferida a cada leitura da célula (`GET /api/propositos`), a cada registro de encontro e a cada mudança na fila ou no estudo atual. Entra **um** estudo por vez: o que acabou de entrar ainda não teve o encontro dele.

**Na prática, numa célula de quinta:** o estudo B está na fila para 30/10, e o atual A é de 23/10.

- Quinta, 23/10, 21h: o líder registra o encontro com A. B entra na hora e quem abre a célula já vê B. A vai para Estudos anteriores.
- Se ninguém registrou: na sexta, 24/10, na primeira vez que alguém abre a célula, a quinta já passou sem "Não houve encontro", e B entra.
- Se o líder registrou "Não houve encontro" em 23/10: A não teve o encontro dele, e B espera. O líder vê, na fila, "Para quinta, 30/10" e, quando a data passar, "a data já passou", com "Ajustar as datas".

**Ao entrar** (`Contas.promoverDaFila`, numa transação): o atual ganha `atual_ate` = agora; o primeiro da fila ganha `agendado_para = ''`, `preparado_em` = o `criado_em` de antes e `criado_em` = agora; `propositos.estudo_id` aponta para ele; Acolhida, Adoração e Testemunho voltam a vazio (F8). Nenhuma notificação sai daqui.

**Nunca por cima de um estudo que a célula não viveu sem o líder confirmar:** a regra automática só passa por cima de um atual que já teve o encontro. Fora dela, só duas ações do líder trocam o atual:

- **"Usar agora"** num estudo da fila: com o atual ainda sem uso, o servidor pede confirmação (409 `precisaConfirmar`) e a tela pergunta "Usar agora?".
- **"Tirar o estudo"** com a fila cheia de um estudo do próximo encontro: a confirmação de sempre ganha a frase "O próximo da fila, “B”, passa a ser o estudo da célula." Tirado o atual, a célula fica sem estudo, e a regra põe B.

### 4.2 Casos de borda

| Caso | O que acontece |
|---|---|
| **Encontro sem estudo** (registrado com "Outro estudo, fora do app") | O atual não teve o encontro dele (o dia foi de outro estudo), e a fila espera. O atual continua para o próximo encontro, como já era. Encontro registrado numa célula sem estudo atual: a regra vale pela condição 1 ("sem estudo atual"). |
| **Semana pulada** ("Não houve encontro nesta semana") | O dia não conta como encontro do atual, e nada entra. As datas da fila não andam sozinhas: a que passar aparece com "a data já passou" e o botão "Ajustar as datas" (que põe a fila inteira nos próximos encontros, na mesma ordem). Se ninguém ajustar, a fila segue na ordem: o primeiro entra no encontro seguinte do atual. |
| **Estudo atual apagado** ("Tirar o estudo") | A célula fica sem estudo; se o primeiro da fila é do próximo encontro, ele entra logo (a confirmação de "Tirar" avisa). Se não é, a aba mostra o vazio de sempre e, para quem conduz, a fila embaixo. |
| **Dois aparelhos do líder ao mesmo tempo** | Reordenar manda a fila inteira e recebe 409 `filaMudou` se ela mudou (um estudo entrou, saiu ou foi promovido); a tela recarrega e avisa. Mudar o texto de um estudo da fila manda `baseEm` e recebe 409 `estudoMudou`; o rascunho fica no celular. Tirar ou usar um estudo que já saiu dá 404 `foraDaFila`. A data é a última gravada. O auxiliar só lê. |
| **Estudo da fila com data passada** | Não se escolhe data passada (400). Uma data passa a ser passada só com o tempo: o estudo continua na ordem, entra na próxima promoção e aparece com "a data já passou" até lá. |
| **O dia do encontro muda** | As datas da fila ficam como estão (são do líder). A regra usa o dia novo para o limite, e cada estudo novo na fila já nasce no dia novo. "Ajustar as datas" aparece quando alguma data cai fora do dia novo. |
| **O líder sai ou apaga a conta** | A fila dele sai junto (F9). O atual e os anteriores ficam com o @. Sem líder ativo, ninguém mais prepara (já era assim). |
| **O auxiliar sai ou deixa de ser auxiliar** | Deixa de ver a fila na hora. |
| **Multiplicação** | A fila é da célula mãe e fica nela. A filha não vê a fila da mãe (404) nem o estudo que a mãe promover depois da multiplicação (F7). |
| **Célula encerrada** | A fila fica guardada e nada mais entra (a promoção só roda em célula aberta). |
| **Encontro registrado dias depois** (na segunda, o encontro de quinta, com A) | A é ligado ao encontro de quinta e, se B ainda estava na fila, B entra. Se B já tinha entrado na sexta, o registro só liga A. |
| **O estudo da fila escolhido no registro** | Não aparece na folha e o servidor recusa o id (400): ele ainda não era o estudo da célula. |
| **Teto de 200** | Só conta e só apaga estudos fora da fila. |

---

## 5. Telas (390 px, no padrão da Fase 1 e 2)

As classes novas levam o prefixo `mesa-`, e o CSS fica na peça `estudo-celula.css` (o index tem 66,5 KB de folga e só ganha as poucas linhas da folha de registro e do vazio).

### 5.1 A aba Estudo, para o líder

1. **Cartão do líder** (`mesa-lider`): com a fila, uma linha a mais, "Próximo: <título> · qui 30/10" (`small.mesa-fila`, no lugar da linha "A parte 2 de 2 já está guardada…").
2. **Migração** (seção 5.5), quando este celular ainda guarda partes.
3. O estudo, os botões e as anotações (como hoje).
4. **Próximos estudos** (`CC.tituloSecao('Próximos estudos', 'N')`), antes de "Estudos anteriores": a linha do tempo da célula, do que vem ao que passou.
   - Um cartão (`mesa-proximos`, como `mesa-anteriores`), uma linha por estudo (`mesa-proximo`, grade `44px minmax(0, 1fr) 44px`, altura mínima de 96 px):
     - à esquerda, o selo da data (`mesa-data`, círculo de 44 px sálvia pálido): "qui" em cima, "30/10" embaixo;
     - no meio, um link para ler o estudo (`…/estudo/<id>`): `small` "Para quinta, 30/10" (ou "… · a data já passou"), `b` o título (quebra em quantas linhas precisar), `small` as referências curtas;
     - à direita, as setas empilhadas (só com 2 ou mais estudos): "Passar “T” para antes" e "Passar “T” para depois", 44 x 44 cada, a ponta sem vizinho desligada.
   - Embaixo: "Agendar um estudo" (`botao contorno pequeno`, ícone `mais-sinal`) para `…/preparar/novo`.
   - Com datas fora do lugar: a dica "Alguma data não bate com os próximos encontros." e "Ajustar as datas" (`botao plano pequeno`).
   - **Fila vazia** (com estudo atual): a dica "Deixe prontos os estudos dos próximos encontros. Depois de cada encontro, o próximo entra sozinho na aba Estudo." e "Agendar um estudo".
5. Estudos anteriores (como hoje).

**Sem estudo atual:** o vazio de sempre e, com a fila não vazia, a seção "Próximos estudos" embaixo (sem a dica da fila vazia: o caminho ali é "Preparar o estudo").

### 5.2 A aba Estudo, para o auxiliar, o membro e o visitante

- **Auxiliar:** a mesma seção, só com a fila não vazia, sem setas e sem botões, e a dica "Só o líder muda os próximos estudos." Cada linha abre o estudo para ler.
- **Membro e visitante:** nada muda. Nenhuma frase sobre a fila.

### 5.3 Ler um estudo da fila (`…/estudo/<id>`)

A mesma tela de um anterior (`CC.estudoCelula.anterior`), com:

- etiqueta "Próximo estudo"; linha "Para o encontro de quinta, 30/10 · preparado por você";
- Palavra, Para conversar e Combinado (sem Acolhida, Adoração, Testemunho, presença, anotação e imprimir);
- só para o líder, os botões: "Mudar o estudo" (`botao`, ícone `caneta`, para `…/preparar/<id>`), "Mudar a data" (`botao contorno`, ícone `calendario`), "Usar agora" (`botao contorno`) e "Tirar dos próximos" (`botao plano perigo`).
- "Mudar a data" abre uma folha: "Mudar a data", a dica "O dia do encontro em que este estudo vai ser usado. Se ele já tiver um estudo, esse e os seguintes passam para os encontros seguintes.", um `input type="date"` (mínimo hoje) e "Salvar a data" / "Cancelar".
- "Usar agora" com o atual ainda sem uso pergunta "Usar agora?" ("O estudo atual ainda não foi usado num encontro. Se você usar “T” agora, o atual vai para Estudos anteriores."); sem isso, entra direto. Depois, a aba com o aviso "Pronto: “T” está na aba Estudo".
- "Tirar dos próximos" pergunta "Tirar dos próximos?" ("“T” sai da lista e não vai para a célula.", `perigo`).
- Um estudo que já entrou na célula (o endereço guardado de antes) troca para a aba; um que saiu da fila mostra o "não está aberto" de sempre.

### 5.4 O preparo

- **Rotas:** `…/preparar` (o de sempre: muda o atual sem uso, ou prepara o próximo depois do encontro), `…/preparar/novo` (um estudo novo para a fila, de "Agendar um estudo") e `…/preparar/<id>` (com o id de um anterior é "Usar como base", como hoje; com o id de um estudo da fila é mudar esse estudo). A rota não muda no roteador: o terceiro pedaço já existe.
- **Rascunhos:** o de sempre continua em `cc.rascunho.estudo.<célula>`; o do estudo novo para a fila em `cc.rascunho.fila.<célula>.novo`; o de um estudo da fila em `cc.rascunho.fila.<célula>.<id>`. Um não apaga o outro.
- **Passo 1, mudando um da fila:** a nota "Agendado para quinta, 30/10. Ele entra na aba Estudo depois do encontro anterior." No lugar de "Tirar o estudo", "Tirar dos próximos".
- **Passo 3, "Quando usar"** (`escolhaDoPreparo` diz se aparece e qual vem marcada), antes da nota de salvar:
  - o grupo `mesa-quando` com duas opções (`role="radio"`, como `mesa-opcao`): "Usar agora" ("Entra na aba Estudo hoje.") e "Agendar" ("Entra na aba Estudo depois do encontro anterior.");
  - com "Agendar", o campo "Para o encontro de" (`input type="date"`, mínimo hoje, já com `filaProxima`);
  - o botão principal diz "Salvar o estudo" ou "Agendar o estudo";
  - "Usar agora" com o atual ainda sem uso (só pelo caminho de "Agendar um estudo") pergunta antes, com a frase de "Usar agora?".
- **Passo 3, mudando um da fila:** o campo "Para o encontro de" com a data dele, o botão "Salvar o estudo", e o cartão "Acolhida, adoração e testemunho" dá lugar à dica "Acolhida, adoração e testemunho você escolhe quando ele for o estudo da semana." (F8).
- **Dividir em 2 encontros:**
  - a prévia diz "Você segue com a parte 1. A parte 2 entra nos próximos estudos, no encontro seguinte." (com mais partes: "As outras entram nos próximos estudos, uma em cada encontro seguinte.");
  - depois de dividir, a nota: "Estudo dividido em 2 encontros. Esta é a parte 1; ao salvar, a parte 2 entra nos próximos estudos." (com mais partes: "as partes 2 a N entram"), com "Desfazer a divisão";
  - as partes ficam no rascunho (`st.divisao.partes`) e vão em `seguintes` no "Salvar";
  - o aviso depois de salvar: "Estudo salvo. A parte 2 está nos próximos estudos." (ou "As outras partes estão nos próximos estudos.").
- **Toasts:** "Estudo agendado para quinta, 30/10"; com partes, "Estudo agendado. A parte 2 está nos próximos estudos.".

### 5.5 A migração das partes guardadas no celular

A versão anterior guardava as partes em `cc.estudo.proximos.<célula>`. Na aba Estudo, para o líder, enquanto houver parte guardada, logo abaixo do cartão do líder:

- um cartão `mesa-migrar` (ícone `calendario`, fundo sálvia pálido): "A parte 2 de “T” está guardada só neste celular." (com mais partes: "As partes 2 a N de “T” estão guardadas só neste celular.");
- "Pôr nos próximos estudos" (`botao pequeno`): manda `filaPartes`, apaga a chave do celular e redesenha, com o aviso "Pronto: a parte 2 está nos próximos estudos";
- "Descartar" (`botao plano pequeno perigo`): pergunta "Descartar a parte 2?" ("O texto da parte 2 de “T” sai deste celular.") e apaga a chave.
- Com erro do servidor (uma parte recusada), o cartão fica e mostra a mensagem. Sem rede, "Sem conexão. Tente de novo." O auxiliar e os outros nunca veem o cartão.

O caminho antigo ("Preparar o próximo" abrindo a parte guardada) sai do preparo.

### 5.6 A folha de registro (index)

Só o aviso depois de salvar: "Encontro registrado. O próximo estudo já está na aba Estudo." quando a resposta traz `promovido`.

---

## 6. Textos exatos

| Onde | Texto |
|---|---|
| Seção | Próximos estudos |
| Cartão do líder | Próximo: {título} · qui 30/10 |
| Linha | Para quinta, 30/10 / Para quinta, 23/10 · a data já passou |
| Setas | Passar “{título}” para antes / Passar “{título}” para depois |
| Botão | Agendar um estudo |
| Fila vazia | Deixe prontos os estudos dos próximos encontros. Depois de cada encontro, o próximo entra sozinho na aba Estudo. |
| Datas fora do lugar | Alguma data não bate com os próximos encontros. / Ajustar as datas |
| Aviso de ajustar | Pronto: as datas seguem os próximos encontros |
| Auxiliar | Só o líder muda os próximos estudos. |
| Leitura, etiqueta | Próximo estudo |
| Leitura, linha | Para o encontro de quinta, 30/10 · preparado por {quem} |
| Leitura, botões | Mudar o estudo / Mudar a data / Usar agora / Tirar dos próximos |
| Folha da data | Mudar a data / O dia do encontro em que este estudo vai ser usado. Se ele já tiver um estudo, esse e os seguintes passam para os encontros seguintes. / Salvar a data / Cancelar |
| Aviso da data | Data mudada para quinta, 06/11 |
| Usar agora? | O estudo atual ainda não foi usado num encontro. Se você usar “{título}” agora, o atual vai para Estudos anteriores. |
| Aviso de usar | Pronto: “{título}” está na aba Estudo |
| Tirar dos próximos? | “{título}” sai da lista e não vai para a célula. / Tirar |
| Aviso de tirar | Estudo tirado dos próximos |
| Tirar o estudo (com fila) | A célula volta a ver que o estudo ainda não foi preparado. → O próximo da fila, “{título}”, passa a ser o estudo da célula. |
| Preparo, nota | Agendado para quinta, 30/10. Ele entra na aba Estudo depois do encontro anterior. |
| Preparo, quando | Quando usar / Usar agora / Entra na aba Estudo hoje. / Agendar / Entra na aba Estudo depois do encontro anterior. / Para o encontro de |
| Preparo, botões | Salvar o estudo / Agendar o estudo |
| Preparo, 4 Ws | Acolhida, adoração e testemunho você escolhe quando ele for o estudo da semana. |
| Aviso de agendar | Estudo agendado para quinta, 30/10 |
| Dividir, prévia | Você segue com a parte 1. A parte 2 entra nos próximos estudos, no encontro seguinte. / … As outras entram nos próximos estudos, uma em cada encontro seguinte. |
| Dividir, nota | Estudo dividido em 2 encontros. Esta é a parte 1; ao salvar, a parte 2 entra nos próximos estudos. |
| Dividir, aviso | Estudo salvo. A parte 2 está nos próximos estudos. |
| Migração | A parte 2 de “{título}” está guardada só neste celular. / Pôr nos próximos estudos / Descartar |
| Migração, aviso | Pronto: a parte 2 está nos próximos estudos |
| Registro, aviso | Encontro registrado. O próximo estudo já está na aba Estudo. |
| Erros (a tela põe a maiúscula e o ponto) | as mensagens de `MENSAGENS` (seção 2.1) |

---

## 7. Testes

### 7.1 Unidade (`teste.mjs`)

- **Regras do servidor** (`estudos.mjs`): `encontroDepois` (quinta → quinta seguinte; sem dia, +7); `limiteDaFila`; `primeiraDataDaFila` (com o atual esperando, sem atual, com o encontro de hoje já registrado, com "Não houve encontro" registrado); `proximaDataDaFila`; `encaixarNaFila` (data livre; data ocupada empurra; data depois fica); `reordenarFila` (as datas ficam, a lista errada dá null); `ajustarDatasDaFila`; `jaTeveEncontro` contra `estudoUsado` (o dia com "Não houve encontro" e o com "Outro estudo" não contam; o encontro ligado conta); `devePromover` (os casos da seção 4.2); `limparDataDaFila`; `acessoAoEstudo` com estudo da fila (líder e auxiliar leem, membro, visitante, filha e de fora recebem 404).
- **Regras do cliente** (`estudo-regras.js`): `dataCurta`, `dataLonga`, `linhaDoProximo`, `quandoNaFila`, `moverNaFila`, `datasPedemAjuste`, `escolhaDoPreparo`, `partesDoCelular`.
- **Contas** (`Contas.salvarEstudo` e as ações da fila, com as datas como parâmetro): agendar dois estudos (datas 29/10 e 5/11), reordenar, mudar a data com empurrão, a fila cheia, o 409 da versão, o auxiliar, o membro e a visitante recebendo 403; a promoção pelo registro, pelo dia que passou, a semana sem encontro que segura, o "Outro estudo" que segura, o "Usar agora" que pede confirmação, "Tirar o estudo" que deixa o primeiro entrar; `criado_em`, `preparado_em` e `atual_ate` depois da promoção; a fila fora da lista de anteriores, da folha de registro e do estudo do dia; o líder que sai e a conta apagada levando a fila; `seguintes` com o estudo dividido; os tetos recusando uma parte.

### 7.2 Banco (`ferramentas/teste-db.mjs`)

A migração v23 acrescenta as duas colunas, vazias para o que já existia, e `apagarPessoaDoBanco` apaga só as linhas da fila da pessoa.

### 7.3 HTTP e navegador (novo `ferramentas/teste-estudo-fila.mjs`)

- **Parte A, a API** (servidor próprio, contas pela API): a matriz da seção 3.1 inteira (líder, auxiliar, membro, visitante, líder de outra célula), o retrato com e sem `fila`, a leitura de um estudo da fila (404 para quem não conduz), a resposta do registro com `promovido`, e nada da fila em `GET /api/estudos?celula=`.
- **Parte B, o líder no navegador:** agenda 2 estudos por "Agendar um estudo" (um com a data escolhida), vê "Próximo: …" no cartão e a lista em ordem, troca a ordem pelas setas (as datas ficam), muda a data de um, registra o encontro pela folha e vê o primeiro da fila na aba, o de antes em Estudos anteriores e o aviso do registro.
- **Parte C, o membro:** a aba sem a seção nem a linha "Próximo", e o endereço de um estudo da fila com o "não está aberto".
- **Parte D, a migração:** um celular com a parte guardada mostra o cartão, "Pôr nos próximos estudos" a põe na fila do servidor e o cartão some.
- Medidas a 390 e 360 px, claro e escuro (sem rolagem lateral, toque de 44 px, letra de 12 px), e capturas com `FOTOS`.

### 7.4 O que muda nos testes de hoje

- `ferramentas/teste-estudo-dividir.mjs`: a parte 2 não vai mais para o celular. Depois de dividir, o rascunho guarda as partes; salva a parte 1, a parte 2 está na fila do servidor com a data do encontro seguinte, e o cartão do líder diz "Próximo: … (parte 2) · …"; registrado o encontro, a parte 2 entra sozinha na aba e a parte 1 vai para Estudos anteriores.
- `ferramentas/teste-estudo-celula.mjs`, `teste-estudo-historico.mjs`, `teste-celula.mjs` e `teste-celula-botoes.mjs` continuam como estão e precisam passar.

### 7.5 Para rodar

```sh
node build.mjs
TMPDIR=/dev/shm PORTAS=8981-8989 node teste.mjs
node ferramentas/teste-db.mjs
for t in estudo-celula estudo-dividir estudo-historico estudo-fila celula celula-botoes; do
  TMPDIR=/dev/shm CHROME=<chrome> PORTA=8990 PORTAS=8991-8995 node ferramentas/teste-$t.mjs
done
```

---

## 8. Riscos e pontos para conferir

- **F2, o auxiliar só vê.** Se o dono quiser o auxiliar mexendo na fila, é uma troca de função nas ações (seção 3.1) e de `euPreparoEstudo` por `euConduzo` na tela.
- **A promoção no dia seguinte ao encontro sem registro.** Numa célula que não registra encontros, o próximo entra no dia seguinte ao dia do encontro (o mesmo momento em que o botão do líder vira "Preparar o próximo"). Se a célula se reuniu num dia diferente do marcado, o estudo pode entrar antes do encontro. O líder evita registrando o encontro ou marcando o dia certo.
- **A semana pulada não empurra as datas sozinha.** Empurrar sem perguntar mexeria no plano do líder sem ele ver; "Ajustar as datas" faz isso num toque.
- **Política de privacidade:** a fila é texto do líder guardado no servidor, visto só por quem conduz até entrar na célula, e apagado quando o líder sai ou apaga a conta. Proposta para o dono, no quadro de quem vê: "Os próximos estudos que o líder agenda ficam visíveis só para quem conduz a célula até entrarem na aba Estudo, e saem se o líder sair da célula ou apagar a conta." O texto da política não muda sem ele.

---

## 9. O que foi entregue (25/10)

Os commits `b874ded` (banco v23 e as regras puras do servidor), `941c82f` (as contas: agendar, mexer e promover), `172b0af` (a API), `2faffaa` (as regras puras da tela), `8957a42` (a aba Estudo), `2b95148` (o preparo), `7b1daf7` e `9059e73` (os testes no navegador) e `8605581` (os acertos da rodada de testes), depois do plano em `d7404de`. O que ficou diferente do plano ou não estava escrito nele:

- **As datas na tela** levam o zero, como o resto das listas do estudo ("Encontro de 05/11"): "qui 05/11", "Para quinta, 05/11".
- **A primeira data livre** conta o encontro do estudo atual mesmo quando ele foi registrado hoje: com o encontro de hoje já registrado, o estudo seguinte é do encontro da semana que vem, e uma parte do celular posta na fila depois disso vai para o encontro depois do do novo atual (ele ainda espera o dele).
- **Sem dia de encontro marcado**, a fila anda de 7 em 7 dias a partir de hoje + 7, e o limite da promoção é hoje + 7. O `teste-estudo-dividir.mjs` roda assim (a célula dele não marca o dia).
- **"Usar como base"** vem com "Usar agora" marcado, mesmo com o atual sem uso: a confirmação de "Usar como base" já disse que o atual vai para Estudos anteriores, e o passo 3 não pergunta de novo.
- **O rascunho do estudo novo para a fila** tem "Descartar o rascunho" no passo 1 (o de sempre tem "Tirar o estudo").
- **`Contas.promoverEstudo`** é o nome da troca do atual pelo da fila (o `entrarNaCelula` que já existia é o da entrada de alguém pelo link).
- **`salvarEstudo`** devolve também `agendado` e `promovido`; quem já o chamava (o servidor e `ferramentas/colocar-estudo.mjs`) continua recebendo o estudo gravado em `estudo`.
- **A folha de registro** não mudou além do aviso: ela já só mostra os estudos de `registro.estudos`, que não contam a fila.
- **Capturas** (`FOTOS`) do `teste-estudo-fila.mjs`: a aba com a fila, agendar com a data, depois de reordenar, a leitura de um estudo da fila, a aba depois do encontro, a do membro e o cartão da parte do celular, a 390 px, claro e escuro; o `teste-estudo-dividir.mjs` guarda a parte 2 nos próximos estudos.

Ficam para o dono: F2 (o auxiliar só vê a fila) e a linha da política de privacidade (seção 8).
