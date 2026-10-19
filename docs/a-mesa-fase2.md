# À Mesa, Fase 2: plano de implementação

Plano para programar a Fase 2 do estudo da célula ("À Mesa"): guardar. Parte da proposta (`estudo-pdf/final.md`, seção "Guardar" e itens 7, 8, 9, 11 e 12, mais a impressão e as gírias), da crítica (`estudo-pdf/critica.md`), das decisões do dono de 17/10, do plano da Fase 1 (`docs/a-mesa-fase1.md`) e do código de `redesenho-novo` no commit 336d46d (a Fase 1 publicada). Os números de linha citados são desse commit.

## 0. O que vale e o que fica de fora

**Decisões do dono que este plano aplica:**

1. Só o **líder** prepara, muda ou tira o estudo, e só ele tem "Usar como base", porque usar como base cria um estudo novo. O auxiliar vê o estudo como membro e continua com a aba Painel e o registro de presença.
2. **Estudos anteriores:** todos os membros **atuais** leem, inclusive quem entrou depois. O visitante vê só o estudo atual.
3. A célula nascida de uma **multiplicação** lê os estudos da célula mãe, só para leitura.
4. Quando o líder apaga a conta, os estudos ficam na célula com o @ de quem preparou (já é assim desde a Fase 1).
5. O histórico guarda título, Palavra, perguntas e combinado. **Não** guarda Acolhida nem Testemunho, que podem ter nomes de pessoas.
6. Quantas pessoas vieram a um encontro: só quem conduz (líder e auxiliar), como a presença de hoje.

**Regras do produto que valem em todo passo:**

- O texto bíblico só vem de `conteudo/biblias` pela referência. Nunca é guardado, digitado, mudado ou gerado, nem no combinado, nem na mensagem para quem faltou, nem na impressão.
- A anotação pessoal no estudo é uma nota como as outras (`E.notas`, cifrada pelo `cofre.mjs` em `notas.*.texto`, `notas.*.titulo` e `notas.*.tags`). Nenhuma rota nova lê o texto dela.
- Sem placar: nada de "N de M leram", de pontos ou conquista por anotar, nem de marcar se cumpriu o combinado.
- Pedido de oração nunca aparece na tela do encontro, nem na impressão.
- O app nunca manda mensagem sozinho para quem faltou: ele prepara o texto, e quem conduz decide se manda, pelo próprio WhatsApp.
- Voz cordial, sem gíria e sem travessão. O cartão de voz mora em `.claude/skills/mapa-do-livro/voz.md` (não existe `docs/voz.md`); a família 5.9 (gíria) e a 6.11 (travessão) valem para a tela.
- Paleta C, claro e escuro, 390 e 360 px, toque de 44 px ou mais, letra de 12 px ou mais, contraste AA.

**Decisões de arquitetura que este plano toma** (cada uma com o porquê; as marcadas com "conferir" vão para o dono na revisão final):

| # | Decisão | Por quê |
|---|---|---|
| A1 | "Quem conduz" é `podeConduzir` (`contas.mjs:408-413`): o líder e o auxiliar ativos, sem aprovação pendente. Ver quantas pessoas vieram, trocar o estudo do registro e ver "Quem não veio" é de quem conduz. "Usar como base" é só de `euPreparoEstudo`. | É a mesma regra que já decide quem registra a presença (`celulaDeQuemConduz`, `contas.mjs:1329-1336`). Trocar o estudo do registro não muda estudo nenhum: só diz qual foi usado. Se só o líder trocasse, o registro do auxiliar sairia errado. |
| A2 | A filha lê os estudos da mãe **preparados até o dia da multiplicação** (o atual daquele dia incluído). Os que a mãe prepara depois, não. Conferir. | É a história que as duas células viveram juntas, e a crítica (item 6) pede isso para ajudar o novo líder. O que a mãe prepara depois é de outro grupo. Só um nível: a neta lê a filha, não a avó. |
| A3 | Na leitura de um estudo da mãe não há "Usar como base", nem para o líder da filha, nem a presença. | "Só para leitura" (decisão 3). E "Usar como base" poria o texto do líder da mãe no nome do líder da filha. |
| A4 | Qualquer pessoa que lê o estudo escreve a própria anotação nele, o visitante inclusive (no atual). | A nota é só da pessoa, e ela fica em Minhas anotações mesmo quando o estudo deixa de estar aberto para ela. |
| A5 | O estudo **novo** (linha nova em `celula_estudos`) começa com Acolhida, Adoração e Testemunho vazios, que viram as sugestões da semana, a não ser que o pedido traga os campos. Mudar o mesmo estudo mantém os três. Conferir. | Hoje o Testemunho que o líder escreveu para a semana passada, às vezes com nomes, continua na aba da semana seguinte, à vista de visitantes. É a mesma razão da decisão 5. |
| A6 | "Na semana passada combinamos" só aparece quando o estudo anterior foi usado num encontro de até 10 dias antes de hoje. | Depois de uma semana sem encontro, "semana passada" seria falso. |
| A7 | O registro de um app antigo (sem o campo `estudo`) liga o estudo que valia no fim daquele dia. O app novo manda sempre a escolha. | O service worker ainda serve o app antigo por um tempo, e sem isso o histórico perderia esses encontros. |
| A8 | Na lista, a data é a do encontro mais recente em que o estudo foi usado. Sem encontro ligado, é a data em que foi preparado, e a linha diz "Preparado em". | A proposta liga o estudo à data do encontro. Os registros de antes da v20 não têm a ligação, e inventar a data seria pior. |
| A9 | "Mandar no grupo" e "Modo encontro" só no estudo atual. "Imprimir" no atual e nos anteriores. | O texto do grupo diz "Para o encontro de quinta". Mandar um estudo velho confundiria o grupo. |
| A10 | O número de pessoas aparece só ao abrir um estudo anterior, nunca na lista. | Uma coluna de números semana a semana vira placar. O Painel já mostra a frequência a quem conduz. |
| A11 | "Quem não veio" não lista visitantes nem quem registrou, e quem entrou na célula depois da data também não. | É a mesma regra de "Precisam de atenção" (`servidor.mjs:885-895`): visitante não é cobrado. |
| A12 | O combinado passa pelo mesmo leitor de citações da palavra do líder (`contas.mjs:1470-1472`). | Um versículo colado no combinado ficaria guardado em outra tradução. |
| A13 | Gírias: todas as telas do app (`src/app` e peças). As frases das notificações (`notificacoes.mjs`, com emoji e voz própria) ficam fora e vão listadas ao dono (seção 6). | As notificações têm teste próprio de tamanho e variedade e uma voz decidida em outra fase. Mudar sem o dono seria decidir por ele. |

**Fica de fora da Fase 2:** modelos e "Salvar como modelo" (Fase 3), apoio para a passagem (Fase 3), guardar para usar sem internet (Fase 3), estudo da igreja (saiu do plano), "o que as células estudaram" no painel da administração, trecho que atravessa capítulos no leitor de marcas.

---

## 1. Modelo de dados

### 1.1 Esquema v20 (`db.mjs`, depois da v19 em `db.mjs:262-284`)

A versão atual é a 19. A v20 só acrescenta (`db.mjs:33`):

```sql
-- v20: o estudo da célula guarda (À Mesa, Fase 2, docs/a-mesa-fase2.md). O combinado para a
-- semana mora no estudo e vai para o histórico com o título, a Palavra e as perguntas (Acolhida,
-- Adoração e Testemunho continuam em propositos e não vão). Cada encontro registrado guarda qual
-- estudo foi usado: o id de celula_estudos, '-' para um estudo de fora do app, ou '' quando não
-- se sabe (os registros de antes da v20 e a semana sem encontro).
ALTER TABLE celula_estudos ADD COLUMN combinado TEXT NOT NULL DEFAULT '';
ALTER TABLE celula_encontros ADD COLUMN estudo TEXT NOT NULL DEFAULT '';
```

Por que assim:

- **Sem índice novo.** A lista de anteriores filtra `proposito` e ordena por `criado_em`, que é o índice da v19. Os encontros vivem em memória (`p.encontros`), e achar os de um estudo é um laço em JS.
- **Sem preencher os encontros antigos.** Antes da v20 só havia estudos legados (`l<id>`) e os da Fase 1, publicada em 18/10. Deduzir o estudo de cada encontro antigo pelo período é palpite; fica `''`, e a lista mostra "Preparado em".
- **Sem coluna `estado` em `celula_estudos`.** O "atual" já é `propositos.estudo_id`, e o "anterior" é `atual_ate != ''`. O "usado" é calculado (seção 2.2).
- **`'-'` e não um id.** "Outro estudo, fora do app" precisa se distinguir de "não se sabe": o `-` não conta como uso de estudo nenhum, e o `''` cai na regra antiga da Fase 1.

### 1.2 Em memória e a armadilha do `INSERT OR REPLACE`

- `p.encontros[i]` ganha `estudo: '' | '<id>' | '-'`.
- **Obrigatório:** `paraLinhas` (`contas.mjs:242-245`) grava `estudo: e.estudo || ''` e `deLinhas` (`contas.mjs:340-343`) lê `estudo: l.estudo || ''`. Sem a coluna na linha em memória, a primeira gravação depois da carga zeraria o estudo de todos os encontros: é a mesma armadilha do `estudo_id` da Fase 1 (`docs/aprendizados.md`, 2026-10-17 · banco). O `teste-db` confere relendo o banco.
- `celula_estudos.combinado` é lido e gravado direto, como o resto da tabela (`contas.mjs:1415-1420`). `estudoDaLinha` (`estudos.mjs:148`) passa a ler `combinado: l.combinado || ''`.

### 1.3 Apagar a conta, sair da célula, multiplicar, teto de 200

- **Apagar a conta** (`Contas.apagar`, `contas.mjs:721`, com o comentário dos estudos em `:750`; `apagarPessoaDoBanco`, `db.mjs:412-463`): nada novo. Os estudos ficam com o @ (Fase 1). A coluna `celula_encontros.estudo` não é dado da pessoa. As anotações dela no estudo moram em `estados` e saem com a conta.
- **Sair da célula:** a pessoa perde a lista e a leitura dos anteriores na hora (não é mais membro ativo). A anotação dela continua em Minhas anotações, e o caminho até o estudo mostra o estado "não está aberto para você" (seção 4.11).
- **Multiplicação** (`contas.mjs:1576-1613`): nada novo no banco. A filha já guarda `mae` e `multiplicadaEm` (v10). A leitura dos estudos da mãe sai da regra da seção 2.1.
- **Teto de 200 por célula** (`estudos.mjs:25`, `contas.mjs:1510-1511`): ao sair o estudo mais antigo, um encontro ainda pode apontar para ele. A leitura trata o id que não existe mais como `''`.

---

## 2. As regras (funções puras em `estudos.mjs`)

Todas sem banco e sem relógio. `contas.mjs` monta a entrada e chama. O `teste.mjs` as exercita direto.

### 2.1 Quem lê qual estudo

```js
// e: o estudo (estudoDaLinha), p: a célula por onde a pessoa chega, eu: o @.
// corte: 'AAAA-MM-DD', o dia da multiplicação de p (p.multiplicadaEm), quando p tem mãe.
// diaDe(iso): o dia local de um instante, no fuso do líder da célula do estudo.
export function acessoAoEstudo(e, p, { eu, papel, ativo, conduz, lidera, corte = '', diaDe }) -> {
  ler: boolean,          // pode abrir
  codigo: 0 | 403 | 404, // por que não (0 quando pode)
  atual: boolean,        // é o estudo atual de p
  daMae: boolean,        // é um estudo da célula mãe, só leitura
  presenca: boolean,     // vê quantas pessoas vieram (quem conduz p, e só estudo de p)
  usarComoBase: boolean, // vê "Usar como base" e recebe a fonte (só o líder, só anterior de p)
}
```

1. Sem `ativo` (convidado, quem saiu, de fora, administrador que não é da célula): `404`.
2. `e.proposito === p.id`:
   - `e.id === p.estudoId`: `ler` para todos, o visitante inclusive.
   - qualquer outro (anterior): `ler` se `papel !== 'visitante'`; senão `403`.
   - `presenca = conduz`; `usarComoBase = lidera && !atual`.
3. `e.proposito === p.mae` e `diaDe(e.criadoEm) <= corte`: `ler` se `papel !== 'visitante'` (senão `403`), com `daMae: true`, `presenca: false` e `usarComoBase: false`.
4. Qualquer outro caso: `404`.

`lidera` é a regra de `celulaDeQuemPrepara` (`contas.mjs:1395-1402`): quem criou a célula, ativo, sem aprovação pendente.

### 2.2 Estudo usado, agora com a ligação

`estudoUsado` (`estudos.mjs:135-146`) ganha `id`:

```js
export function estudoUsado({ id, criadoEm, nasceu, hoje, encontro = -1, encontros = [] })
```

Para cada encontro registrado (que não seja "não houve encontro"):

- `x.estudo === id`: **usado**.
- `x.estudo` com outro valor (outro id ou `'-'`): não conta para este estudo.
- `x.estudo === ''`: a regra da Fase 1 (`x.em > criadoEm && x.data >= nasceu && x.data <= hoje`).

A regra do dia da semana fica igual. Assim, registrar na segunda o encontro de quinta com o estudo antigo não marca o novo como usado (é o risco da crítica, seção 4).

### 2.3 O estudo que valia num dia

```js
// estudos: [{ id, criadoEm, atualAte }] da célula; data: 'AAAA-MM-DD'; diaDe como acima.
// Devolve o id do estudo que valia no fim daquele dia, ou ''.
export function estudoDoDia(estudos, data, diaDe)
```

É o mais novo com `diaDe(criadoEm) <= data` e (`atualAte === ''` ou `diaDe(atualAte) > data`). "No fim do dia" segue a Fase 1: o estudo preparado no dia do encontro é o daquele encontro (`estudos.mjs:127-133`). Serve à escolha já marcada no registro (seção 4.7) e ao registro de um app antigo (A7).

### 2.4 A data na lista

```js
// Devolve { data: 'AAAA-MM-DD', dataDe: 'encontro' | 'preparo' }.
export function dataNoHistorico(e, encontros, diaDe)
```

A data do encontro mais recente com `estudo === e.id` (sem os "não houve encontro"); sem nenhum, `diaDe(e.criadoEm)` com `dataDe: 'preparo'`.

### 2.5 O combinado de antes

```js
// anterior: o estudo da célula que veio logo antes do atual (por criado_em), ou null.
// Devolve { texto, data, estudo } ou null.
export function combinadoDoAnterior({ anterior, encontros, hoje, diaDe, janela = 10 })
```

Sai `null` quando não há anterior, quando ele não tem combinado, ou quando a data dele passou de `janela` dias antes de `hoje` (ou está depois de hoje). A data é a de `dataNoHistorico`, mas com `diaDe(anterior.atualAte)` no lugar da data do preparo quando não há encontro ligado: o estudo deixou de ser o atual porque o seguinte foi preparado, perto do encontro.

### 2.6 O combinado

```js
export const COMBINADO_MAX = 200;
// undefined ou null: "sem o campo" (null). Senão: uma linha só, espaços juntos, até 200.
export function limparCombinado(texto) // -> string | null; lança erro(MENSAGENS.combinado)
```

`MENSAGENS` ganha:

- `combinado: 'o combinado tem no máximo 200 caracteres'`;
- `estudoDoRegistro: 'escolha um estudo desta célula preparado até o dia do encontro'`;
- `soMembros: 'quem está conhecendo a célula vê só o estudo atual'`;
- `naoAberto: 'esse estudo não está aberto para você'`.

### 2.7 O formato que a tela recebe

`estudoNoRetrato` (`estudos.mjs:170-184`) passa a levar `combinado` sempre (`''` quando não tem). Uma função nova monta a linha da lista:

```js
export function itemDoHistorico(e, { data, dataDe, nomeDe }) -> {
  id, tipo, titulo, refs, data, dataDe, criadoPor, criadoPorNome,
}
```

`titulo` passa pela mesma regra da tela (`R.titulo`): no `semana` vai vazio e a tela escreve "A leitura da semana"; no `trecho`, a referência.

---

## 3. API e permissões

### 3.1 Quem pode o quê

| Ação | Líder | Auxiliar | Membro | Visitante | De fora (outra célula, administrador, convidado, quem saiu) | Membro da filha, nos estudos da mãe |
|---|---|---|---|---|---|---|
| Ler o estudo atual (aba, modo encontro, imprimir) | sim | sim | sim | sim | não (sem a célula) | (o atual da filha, sim) |
| Ver o combinado do atual e "Na semana passada combinamos" | sim | sim | sim | sim | não | n/a |
| Preparar, mudar, tirar, escrever o combinado | sim | 403 | 403 | 403 | 403 ou 404 | n/a |
| Lista de anteriores da própria célula | sim | sim | sim | 403 | 404 | n/a |
| Abrir um anterior da própria célula | sim | sim | sim | 403 | 404 | n/a |
| Lista e leitura dos estudos da mãe (até a multiplicação) | sim (líder da filha) | sim | sim | 403 | 404 | sim, só leitura |
| Ver quantas pessoas vieram (num anterior) | sim | sim | não | não | não | não |
| Usar como base | sim (anterior da própria célula) | não | não | não | não | não |
| Registrar presença com o estudo, trocar o estudo do registro | sim | sim | 403 | 403 | 403 ou 404 | n/a |
| Ver "Quem não veio" com a mensagem pronta | sim | sim | não | não | não | n/a |
| Minha anotação neste estudo | sim | sim | sim | sim (no atual) | não | sim |
| Imprimir | sim | sim | sim | sim (o atual) | não | sim |

O 404 vale igual para "não existe" e "não é seu": um id de estudo não confirma que a célula existe.

### 3.2 `POST /api/celula`, ação `estudo` (o que muda)

O pedido da Fase 1 (`docs/a-mesa-fase1.md`, seção 5.3) ganha um campo:

```js
{
  acao: 'estudo', id: '<célula>', estudo: 'blocos' | 'semana' | 'trecho' | '',
  fonte, ref, traducao, perguntas, acolhida, adoracao, testemunho, base,
  combinado: 'Orar todo dia por alguém que ainda não conhece Jesus.'   // novo, opcional
}
```

- **Quem:** igual à Fase 1 (`celulaDeQuemPrepara`, 403 para os outros).
- **`combinado`:**
  - sem o campo, ao **mudar** o mesmo estudo: mantém o que estava;
  - sem o campo num estudo **novo**: `''`;
  - com o campo: `limparCombinado`, depois o leitor de citações (`regras.lerEstudo(combinado, { capitulos, versiculos, semTitulo: true }).fonte`, com as quebras de linha viradas espaço), e o teto conferido de novo;
  - acima de 200: **400** "o combinado tem no máximo 200 caracteres".
- **Acolhida, Adoração e Testemunho num estudo novo (A5):** quando nasce uma linha nova, `p.estudoAcolhida`, `p.estudoAdoracao` e `p.estudoTestemunho` voltam a `''` antes de aplicar os campos que vieram no pedido. Ao mudar a mesma linha e ao tirar o estudo, ficam como estão (Fase 1).
- **Gravar:** o `UPDATE` e o `INSERT` de `contas.mjs:1501-1506` ganham a coluna `combinado`.
- **Resposta:** igual, com `combinado` no estudo.

### 3.3 `POST /api/celula`, ação `registrarEncontro` (o que muda)

```js
{
  acao: 'registrarEncontro', id: '<célula>', data: '2026-10-15',
  presentes: ['ana', 'paulo'], visitantes: 2, semEncontro: false,
  estudo: 'e3f9a1c2b7d4' | '-'     // novo; sem o campo, o servidor escolhe (A7)
}
```

- **Quem:** igual (`celulaDeQuemConduz`).
- **`estudo`:**
  - um id: precisa ser de `celula_estudos` com `proposito === p.id` (a mãe não) e `diaDe(criado_em) <= data`; senão **400** "escolha um estudo desta célula preparado até o dia do encontro";
  - `'-'`: grava `'-'`;
  - sem o campo: `estudoDoDia(estudos da célula, data, diaDe)` (pode dar `''`);
  - com `semEncontro: true`: sempre `''`.
- Regravar a mesma data troca o estudo também (`Object.assign`, `contas.mjs:1542`).
- **`faltaram`** (A11): os membros ativos, menos os visitantes, menos quem registrou, menos quem entrou depois de `data` (`entrouEm > data`) e menos os presentes, em ordem de nome. Vazio com `semEncontro`.
- **Resposta** (antes era `{ ok: true }`):

```js
{
  ok: true,
  encontro: { data: '2026-10-15', estudo: 'e3f9a1c2b7d4' | '-' | '' },
  estudo: { id: 'e3f9a1c2b7d4', tipo: 'blocos', titulo: 'Batalha espiritual, vigilância e Armadura de Deus',
            refs: ['Efésios 6.12', 'Lucas 11.24-26'] } | null,
  faltaram: [ { usuario: 'bia', nome: 'Bia' } ]   // nome: o de exibição (nomeDeExibicao), primeiro nome
}
```

Nenhuma notificação, aviso no sino ou e-mail sai daqui (o teste confere a caixa de quem faltou).

### 3.4 `GET /api/propositos`: o que a célula ganha

Para todos da célula (membro e visitante), menos o convidado (`servidor.mjs:855-857`):

```js
estudo: { /* Fase 1 */, combinado: 'Orar todo dia por alguém que ainda não conhece Jesus.' } | null,
combinadoAnterior: { texto: 'Ligar para alguém que faltou.', data: '2026-10-15', estudo: 'e1a2b3c4d5e6' } | null,
```

`combinadoAnterior` sai `null` sem estudo atual. Anterior é a linha da célula logo antes do atual por `criado_em` (`SELECT ... WHERE proposito = ? AND id != ? AND criado_em < ? ORDER BY criado_em DESC, id DESC LIMIT 1`), com a regra da seção 2.5.

Para membro, auxiliar e líder (o visitante recebe `false` e `null`):

```js
temAnteriores: true,                         // há linha da célula com atual_ate != ''
daMae: { titulo: 'Célula Esperança', ate: '2026-10-10' } | null,   // só na filha, com estudo da mãe até o corte
```

Só para quem conduz, no bloco depois do corte de `servidor.mjs:867`:

```js
registro: {
  // o atual e os 3 anteriores mais novos da própria célula, para a folha de registro
  estudos: [ { id: 'e3f9a1c2b7d4', tipo: 'blocos', titulo: '...', refs: ['Efésios 6.12'], em: '<ISO>', dia: '2026-10-12' } ],
  // hoje e os 7 dias anteriores (no fuso do líder), do mais novo para o mais velho
  dias: [ { data: '2026-10-18', padrao: 'e3f9a1c2b7d4', estudo: null, visitantes: 0, semEncontro: false } ],
},
ultimoEncontro: { data, presentes, visitantes, semEncontro, estudo: { id, tipo, titulo, refs } | null },
```

- `estudos[].dia` é `diaDe(criado_em)`: a folha esconde o estudo preparado depois da data escolhida.
- `dias[].padrao` é `estudoDoDia` daquele dia. `dias[].estudo` é o que o registro daquele dia já tem (`null` sem registro), e `visitantes` vem do registro (hoje a folha só conhecia o do último encontro, `08b:1301`).
- `ultimoEncontro.estudo` serve à mensagem de "Precisam de atenção" (seção 4.8).

Custo: quatro consultas pequenas por célula, todas pelo índice da v19. O histórico não entra no retrato (crítica, item 4).

### 3.5 `GET /api/estudos?celula=<id>[&de=mae][&antes=<cursor>]`: a lista

Rota nova, só com sessão (entra na lista de `servidor.mjs:1767-1771`). Não usa `/api/celula/...` porque `servidor.mjs:1348` já trata todo GET nesse prefixo como link de convite.

- **Quem:** membro ativo de `celula`, não visitante. Visitante: **403** `soMembros`. Os outros: **404** "célula não encontrada".
- `de` ausente: os anteriores da própria célula (`atual_ate != ''`), do mais novo para o mais velho por `criado_em, id`.
- `de=mae`: os estudos da mãe com `diaDe(criado_em) <= multiplicadaEm`. Célula sem mãe: **404**.
- Página de 20. `antes` é `<criado_em>|<id>` do último item da página anterior.
- Os nomes de quem preparou saem de `nomeDeExibicao` com cache no pedido, e o @ quando a conta não existe ou nasceu depois do estudo (a regra de `nomeNaCelula`, `servidor.mjs:835-841`).

```js
{
  estudos: [
    { id: 'e1a2b3c4d5e6', tipo: 'blocos', titulo: 'Batalha espiritual, vigilância e Armadura de Deus',
      refs: ['Efésios 6.12', 'Lucas 11.24-26', '1 Pedro 5.8', 'Efésios 6.13-17', 'Efésios 6.18', 'Efésios 6.10'],
      data: '2026-10-15', dataDe: 'encontro', criadoPor: 'marcos', criadoPorNome: 'Marcos' }
  ],
  mais: false,
  antes: '',                                   // cursor da próxima página ('' quando acabou)
  celula: { titulo: 'Célula Esperança' }       // a célula dos estudos (a mãe, com de=mae)
}
```

A lista não leva blocos, fonte, perguntas, combinado nem presença.

### 3.6 `GET /api/estudos?estudo=<id>[&celula=<id>]`: um estudo

- `celula` ausente: o servidor procura por onde a pessoa lê: a célula do estudo (se for membro ativo) e, senão, a filha dela em que a pessoa é membro ativo. É o caminho de Minhas anotações, que só sabe o id do estudo.
- **Quem:** a regra da seção 2.1. 403 com `soMembros`; 404 com `naoAberto`.
- `id` e `celula` com até 64 caracteres; fora disso, 404.

```js
{
  celula: 'p1a2b3c4d5e6',                      // a célula por onde a pessoa lê (a rota da tela usa esta)
  atual: false,
  daMae: null | { titulo: 'Célula Esperança', ate: '2026-10-10' },
  data: '2026-10-15', dataDe: 'encontro',
  estudo: { /* estudoNoRetrato, com combinado; fonte só com usarComoBase e tipo blocos */ },
  encontros: [ { data: '2026-10-15', pessoas: 9 } ],   // só com presenca; senão []. pessoas = presentes + visitantes sem conta
  usarComoBase: false
}
```

Sem `estudoAcolhida`, `estudoAdoracao` e `estudoTestemunho`: eles são da célula de hoje, não do estudo.

### 3.7 Limites

- As rotas GET novas usam o limite geral das rotas com sessão. A gravação do estudo continua com o limite de 20 por minuto (`servidor.mjs:1981`).
- `faltaram` só existe na resposta do registro, para quem conduz.

---

## 4. Telas (390 px, no padrão da Fase 1)

As classes novas levam o prefixo `mesa-`. O CSS fica nas peças, menos o da folha de registro, que é do index (seção 8). Toda medida de toque é de 44 px ou mais, e nenhuma letra fica abaixo de 12 px (13 px nas etiquetas, como `.mesa-lider small`).

### 4.1 Preparo, passo 3: o combinado

Entre a contagem de perguntas (`mesa-conta`) e o cartão "Acolhida, adoração e testemunho" (`estudo-preparo.js:681-683`):

- `<label class="campo-senha mesa-combinado-campo">` com:
  - o rótulo "Combinado para a semana (opcional)";
  - a dica (`small.dica-campo`) "Uma atitude simples para todos viverem até o próximo encontro. A acolhida do próximo encontro começa por ela.";
  - a segunda dica "Evite nomes de pessoas, porque o combinado fica guardado nos estudos anteriores da célula.";
  - `<textarea data-combinado rows="2" maxlength="200">`, com o marcador "Ex.: Orar todo dia por alguém que ainda não conhece Jesus.", crescendo com o texto (`crescer`, como os outros campos).
- A partir de 170 caracteres, embaixo do campo: "Faltam N caracteres para o limite do combinado." Sem contador antes disso (a regra da Fase 1).
- O rascunho guarda `combinado` a cada tecla (`st.combinado`, `v: 1`, sem mudar a versão: rascunho sem o campo vale `''`).
- `salvar` (`estudo-preparo.js:783-813`) manda `combinado: st.combinado.replace(/\s+/g, ' ').trim()` sempre.
- O aviso do fim do passo (`estudo-preparo.js:684`) passa a ser "Ao salvar, todos da célula veem o estudo na aba Estudo, inclusive quem está só conhecendo. Quando você preparar o próximo, este fica em Estudos anteriores para quem faz parte da célula, com o seu nome."
- **Estudo novo (A5):** `estadoInicial` (`estudo-preparo.js:68-93`) começa com `ws: { acolhida: '', adoracao: '', testemunho: '' }` quando `base` é `''`. O cartão mostra as sugestões da semana, e o salvar manda os três. Ao mudar o estudo atual (`base` igual), `ws` continua `null` e vale o que a célula tem.

### 4.2 A aba Estudo, com o estudo atual

A ordem da Fase 1 (`estudo-celula.js:150-164`), com o que entra marcado como novo:

1. A linha do encontro (como hoje).
2. Só o líder: o cartão `mesa-lider`. Com o estudo usado, o texto pequeno passa a "Ele já foi usado num encontro. Quando você preparar o próximo, este fica em Estudos anteriores." e o botão continua "Preparar o próximo".
3. "No plano" (como hoje).
4. **Acolhida** (`secao-w`). Com `combinadoAnterior`, antes da pergunta, um bloco `mesa-combinado` (sálvia pálida, raio de cartão, 14 px por 16 px de respiro): `<p><b>Na semana passada combinamos:</b> Ligar para alguém que faltou. Como foi?</p>`. Embaixo, a pergunta da acolhida, como hoje. Nada para marcar: nem caixa, nem botão.
5. Adoração e Palavra (como hoje).
6. Para conversar (como hoje).
7. **Novo:** `secaoW('Combinado para a semana', '<p>' + esc(combinado) + '</p>')`, só quando há combinado.
8. Testemunho (como hoje).
9. **Novo: Minha anotação neste estudo** (seção 4.9).
10. Os botões: "Mandar no grupo" (`botao`), "Modo encontro" (`botao contorno`) e, **novo**, "Imprimir" (`botao plano`, ícone `folha`).
11. **Novo: Estudos anteriores** (seção 4.3), só para quem não é visitante.

**Sem estudo atual** (`08b:321-331`): o vazio da Fase 1 continua igual. Com `temAnteriores` ou `daMae`, a casca pede a peça e, embaixo do vazio, desenha só a seção "Estudos anteriores". Sem os dois, não pede a peça (como hoje).

### 4.3 Estudos anteriores (a lista)

Embaixo dos botões, separada por `CC.tituloSecao('Estudos anteriores')`, sem número ao lado.

- **Carregar:** `GET /api/estudos?celula=<id>` na primeira vez que a seção aparece. Enquanto isso, `CC.esqueleto('lista')`. Sem resposta: "Não deu para abrir os estudos anteriores agora." e o botão "Tentar de novo" (`botao contorno pequeno`). A lista fica na memória da peça durante a sessão (por célula) e é pedida de novo depois de um "Salvar o estudo".
- **A lista** é um cartão (`mesa-anteriores`, fundo `--cartao`, raio de cartão, como `mesa-plano`). Cada linha é um `<a class="mesa-anterior" href="#/novidades/celula/<id>/estudo/<estudo>">`:
  - grade `44px minmax(0, 1fr) 24px`, altura mínima de 72 px, 10 px por 14 px de respiro e linha fina entre as linhas, como `mesa-dia`;
  - à esquerda, o círculo de 44 px com o ícone `livro`;
  - no meio, de cima para baixo:
    - `small`: "Encontro de 15/10" ou "Preparado em 12/10";
    - `b`: o título, em até duas linhas (`-webkit-line-clamp: 2`), "A leitura da semana" no `semana`;
    - `small`: as referências curtas, "Ef 6, Lc 11, 1Pe 5" (`R.refsCurtas`, seção 5.2);
  - à direita, o ícone `direita`.
- **Mais de 20:** "Ver mais estudos" (`botao contorno pequeno`), que pede a página seguinte e acrescenta embaixo.
- **Vazio:**
  - para o líder: "Quando você preparar o próximo estudo, este fica guardado aqui para a célula reler.";
  - para os outros: "Quando o próximo estudo for preparado, este fica guardado aqui para a célula reler.";
  - em `passo-dica pequena`, só quando há estudo atual.
- **Na filha** (`daMae`), depois da lista da própria célula:
  - `CC.tituloSecao('Da célula de origem')`;
  - `passo-dica pequena`: "Os estudos da Célula Esperança até a multiplicação, em 10/10. Só para leitura." O nome passa por `nomeDaCelula`: o título como está quando começa por "Célula", ou "célula " + título;
  - o botão "Ver os estudos da Célula Esperança" (`botao contorno pequeno`), que pede `de=mae` e desenha a mesma lista no lugar do botão.
- O visitante não vê a seção nem uma frase sobre ela.
- Nenhuma contagem de leitura, de presença ou de anotação aparece na lista.

### 4.4 Ler um estudo anterior

Rota `#/novidades/celula/<id>/estudo/<estudo>`, dentro da aba Estudo (as abas continuam à vista). `CC.vistaCelula` (`08b:121-178`) passa a ler um terceiro pedaço (`const [id, pedida, alvo] = ...split('/')`). Com `alvo` igual ao atual, é a aba de sempre. Senão, a casca pede a peça e chama `CC.estudoCelula.anterior(painel, p, apoio, alvo, aindaAqui)`, que faz `GET /api/estudos?estudo=<alvo>&celula=<id>`.

De cima para baixo:

1. `CC.botaoVoltar('Estudo')`: volta no histórico quando se veio da lista (`CC.anteriorNaPilha()`) e, sem tela anterior, troca para `…/estudo`.
2. A etiqueta (`span.etiqueta`, `--salvia-texto`): "Estudo anterior" ou, da mãe, "Da Célula Esperança · só para leitura".
3. `passo-dica`: "Encontro de quinta, 15/10 · preparado por Marcos". Sem encontro ligado: "Preparado em 12/10 por Marcos". Sem autor (legado): só a data.
4. Só quem conduz (`encontros` com itens): um cartão `mesa-presenca` (grade `44px 1fr`, ícone `pessoas` no círculo sálvia pálido) com uma linha por encontro, até 3: "Vieram 9 pessoas no encontro de 15/10." (`CC.plural`: "Veio 1 pessoa..."). Embaixo, em `small`: "Só quem conduz a célula vê este número."
5. "No plano" (o mesmo da aba; "Você leu em" continua só no aparelho).
6. `secaoW('Palavra', ...)`: o título e os blocos, com os cartões na tradução do estudo, os três pontos e a barra de ações de cada um, como na aba.
7. `secaoW('Para conversar', ...)`, com as perguntas.
8. `secaoW('Combinado para a semana', ...)`, quando houver.
9. Minha anotação neste estudo (seção 4.9).
10. Os botões: "Usar como base" (`botao`, ícone `caneta`, só com `usarComoBase`) e "Imprimir" (`botao contorno`, ícone `folha`).

Não aparecem: Acolhida, Adoração, Testemunho, "Na semana passada combinamos", "Mandar no grupo" e "Modo encontro".

### 4.5 Usar como base

O toque em "Usar como base":

1. Se há rascunho de preparo neste celular (`cc.rascunho.estudo.<célula>`) **ou** o estudo atual ainda não foi usado (`p.estudo && !p.estudo.usado`), uma confirmação só (`CC.confirmar`), com as frases que valem:
   - título: "Usar como base?";
   - texto, com rascunho: "Você tem um estudo começado neste celular. Usar este como base troca o rascunho pelo texto dele.";
   - texto, com o atual sem uso: "O estudo atual ainda não foi usado num encontro. Quando você salvar o novo, o atual sai da aba Estudo e fica em Estudos anteriores.";
   - com os dois, as duas frases juntas;
   - botões: `acao: 'Usar como base'`, `cancelar: 'Cancelar'`. Só `true` segue (o toque fora dá `null`, `docs/aprendizados.md`, 2026-10-17 · tela).
2. Vai para `#/novidades/celula/<id>/preparar/<estudo>`. O roteador passa a esconder a barra também nessa rota: `/^celula\/[^/]+\/preparar(\/[^/]+)?$/` (`10-roteador.js:488`).
3. A peça do preparo pede `GET /api/estudos?estudo=<estudo>&celula=<id>`, que traz a fonte (só para o líder), e monta o rascunho:
   - `base: ''` (o salvar cria um estudo novo) e `deBase: '<estudo>'`;
   - `tipo`, `fonte` (ou `palavra`), `trecho`, `traducao`, as perguntas como `salvas` e o `combinado` do estudo de base;
   - `ws` vazio (A5);
   - `passo: 1`, `opcoes: false` e `modo: 'escrever'`.
4. No alto do passo 1, uma `mesa-nota` (ícone `info`): "Começando do estudo de 15/10. Mude o que quiser antes de salvar."
5. `estadoInicial` guarda o rascunho com `deBase` mesmo quando a base de agora é outra. Sem isso, reabrir `…/preparar` jogaria fora o rascunho (`estudo-preparo.js:75`).

O estudo de base continua como está. O novo nasce com o líder como autor.

### 4.6 Modo encontro

`R.passos` (`estudo-regras.js:170-224`) ganha `combinadoAnterior` no contexto:

- **Acolhida com combinado:** o passo 1 tem `frase: R.lembrarCombinado(texto)` ("Na semana passada combinamos: Ligar para alguém que faltou. Como foi?") e `pergunta: <a pergunta da acolhida>`. O alto da tela mostra a frase grande (`frase-cena mesa-frase`). O corpo mostra um cartão `mesa-convite` com o ícone `balao`, a etiqueta "Pergunta da acolhida" e a pergunta. Sem combinado anterior, o passo é o da Fase 1.
- **Para a semana:** com `estudo.combinado`, um passo `{ tipo: 'combinado', etiqueta: 'Para a semana', frase: combinado }` entra logo antes de "Orar juntos". O corpo: `mesa-convite` com o ícone `balao` e "Combinem juntos. No próximo encontro, a acolhida começa por aqui."
- **Fechar o encontro:** "Registrar quem veio" chama `apoio.registrarEncontro(p, { estudo: e.id })`. A folha abre com este estudo já escolhido.
- O estudo do dono, sem combinado, continua com 15 passos.

### 4.7 Registro de presença com o estudo

A folha "Quem foi ao encontro?" (`08b:1268-1361`, no index) ganha, entre o botão "Outra data" e a lista de pessoas:

```html
<div class="estudo-do-registro">
  <span class="etiqueta">Estudo deste encontro</span>
  <b data-estudo-escolhido>Batalha espiritual, vigilância e Armadura de Deus</b>
  <button type="button" class="botao plano pequeno" data-trocar-estudo aria-expanded="false">Trocar</button>
</div>
<div class="escolha-estudo" role="radiogroup" aria-label="Estudo deste encontro" data-opcoes-estudo hidden>
  <label class="opcao-estudo"><input type="radio" name="estudo-registro" value="e3f9a1c2b7d4">
    <span><b>Batalha espiritual, vigilância e Armadura de Deus</b><small>Preparado em 12/10</small></span></label>
  ...
  <label class="opcao-estudo"><input type="radio" name="estudo-registro" value="-">
    <span><b>Outro estudo, fora do app</b></span></label>
</div>
```

- `estudo-do-registro`: grade `1fr auto`, a etiqueta em cima, ocupando as duas colunas, fundo `--campo`, raio de 20 px, 12 px por 16 px de respiro. O título vai em até duas linhas, e o "Trocar" tem 44 px.
- `opcao-estudo`: como `escolha-amigo` (`24-juntos.css:139-140`), altura mínima de 56 px, com `--realce` quando marcada.
- **Opções:** `p.registro.estudos` com `dia <= data escolhida`, do mais novo para o mais velho, e por último "Outro estudo, fora do app". Ao trocar a data, a lista se refaz.
- **Já escolhido**, nesta ordem:
  1. o `estudo` que veio de `apoio.registrarEncontro(p, { estudo })` (o modo encontro), se foi preparado até a data;
  2. o `estudo` do registro que aquele dia já tem (`p.registro.dias[].estudo`, `'-'` incluído);
  3. o `padrao` do dia;
  4. o estudo atual, se foi preparado até a data;
  5. "Outro estudo, fora do app".
- Trocar a data refaz a escolha, a não ser que a pessoa já tenha tocado numa opção.
- Sem nenhum estudo na célula (`p.registro.estudos` vazio), o bloco não aparece e o pedido vai sem o campo.
- "Não houve encontro nesta semana" manda `semEncontro: true` sem `estudo`.
- O `visitantes` de cada data passa a vir de `p.registro.dias` (antes, só o do último encontro).
- **Depois de "Salvar":**
  1. a folha fecha e avisa "Encontro registrado", como hoje;
  2. com `faltaram` não vazio, a casca pede a peça e abre "Quem não veio" (seção 4.8); sem a peça (sem rede), fica só o aviso;
  3. `recarregar()`, como hoje.

### 4.8 Quem não veio (a mensagem pronta)

`CC.estudoCelula.paraQuemFaltou(p, { data, faltaram, estudo })`, uma folha (`CC.folha`, `rolavel: true`, `classe: 'folha-faltou'`):

1. `h2`: "Quem não veio".
2. `passo-dica`: "O app não avisa ninguém. Se quiser, mande uma mensagem para cada pessoa pelo seu WhatsApp."
3. A prévia (`mesa-zap-moldura`, igual à de "Mandar no grupo"), com a etiqueta "A mensagem, com o nome de cada um" e a mensagem do primeiro da lista.
4. A lista (`lista-pedidos`), uma linha por pessoa (`linha-amigo`, 64 px): o retrato, o nome e dois botões:
   - "Mandar no WhatsApp" (`a.botao-whatsapp`, `href="https://wa.me/?text=..."`, `target="_blank"`), como em "Precisam de atenção" (`08b:992-993`);
   - "Copiar" (`botao plano pequeno`), com `CC.copiar` e o aviso "Mensagem copiada. É só colar na conversa.".
5. "Fechar" (`botao plano`).

A mensagem sai de `CC.recadoFaltou` (no index, seção 5.3). `quando` é "de hoje", "de ontem" ou "de quinta" (o dia da semana em minúsculas), pela data do registro.

**"Precisam de atenção"** (`08b:981-999`): a mensagem de quem faltou passa a usar o mesmo `CC.recadoFaltou`, com `estudo: p.ultimoEncontro.estudo` e sem `quando` ("no encontro da Célula Esperança", como hoje).

### 4.9 Minha anotação neste estudo

O bloco de sempre (`CC.notasDoContexto`, `07g-anotacoes.js:294-308`), com o contexto do estudo:

```html
<div data-notas-contexto="estudo:e3f9a1c2b7d4" data-tipo-nota="nota"
     data-titulo-notas="Minha anotação neste estudo" data-botao-notas="Escrever minha anotação"
     data-titulo-nota="Batalha espiritual, vigilância e Armadura de Deus"></div>
```

- `notasDoContexto` aceita três atributos novos, opcionais:
  - `data-titulo-notas`, o título da seção (o padrão continua "Suas anotações");
  - `data-botao-notas`, o texto do botão (o padrão continua "Escrever nota"); com uma nota já escrita, o botão vira "Escrever outra anotação";
  - `data-titulo-nota`, o título que a nota nova já traz.
- O título que a nota nova já traz é o título do estudo, cortado na última palavra inteira que cabe em 60 caracteres (`CC.MAX_TITULO_NOTA`). Ele é cifrado como o texto (`notas.*.titulo`) e a pessoa pode mudar.
- `abrirEditor` (`04e-versiculos.js:163`) aceita `titulo` no começo da nota nova. A nota nasce sem versículo (`versos: []`).
- Embaixo vai `CC.avisoPrivado()`: "Só você vê. Guardado com criptografia." e "Saiba mais" (`04e-versiculos.js:313-314`).
- O bloco entra no estudo atual e nos anteriores. Não entra no modo encontro nem na impressão.
- **O contexto `estudo:<id>`:**
  - `02-estado.js:147`: `CONTEXTO = /^(nota|secao|conhecer|parabola|estudo):/`. O `limparNota` roda também no servidor (`REGRAS.normalizarEstado`), e é isso que deixa o contexto passar pela sincronização;
  - `06-explorar.js:52-58`: `nomeDoContexto('estudo:<id>')` é "Estudo da célula". `hrefDoContexto` já dá `#/estudo/<id>`;
  - `10-roteador.js`: a rota `estudo` chama `CC.abrirEstudoSolto(conteudo, arg)` (`08b`). Ela pede `GET /api/estudos?estudo=<id>`: com resposta, troca para `#/novidades/celula/<celula>/estudo/<id>` (ou `…/estudo`, se for o atual); sem, mostra o estado da seção 4.11.
- **Nunca vale conquista** (`02b-jogo.js:248-251`): a conta do "Caderno de notas" passa a ignorar a nota com contexto `estudo:`, mesmo com versículo ligado à mão. Ela também não entra no diário do dia (`CC.anotarDiario`), como nenhuma nota escrita entra hoje.
- **Some com a conta:** a nota mora em `estados`, que `apagarPessoaDoBanco` já apaga.
- Em Minhas anotações, a nota aparece em "Notas", com o título dela e o chip "Estudo da célula", que leva a `#/estudo/<id>`.

### 4.10 Imprimir

`CC.estudoCelula.imprimir(p, estudo, { anterior })`:

1. Pede os textos dos cartões (`textosDe`) na tradução do estudo. Se faltar o texto de algum: "Sem conexão, o texto dos versículos não veio. Tente imprimir de novo com internet." Não imprime cartão vazio.
2. Monta `R.paraImprimir(estudo, contexto)` (HTML puro, seção 5.2) dentro de `<div class="mesa-impressao" aria-hidden="true">`, ligado direto no `<body>`. Um `.mesa-impressao` anterior sai antes.
3. Põe a classe `imprimindo-estudo` no `<body>` e chama `window.print()`. No `afterprint`, tira a classe. O bloco fica escondido na tela e sai na próxima troca de endereço ou na próxima impressão (há navegador de celular que dispara o `afterprint` antes de a impressão terminar).
4. Sem `window.print`: "Este aparelho não abriu a impressão. Abra o app no navegador do celular ou do computador e tente de novo."

**O que vai no papel:**

- **Cabeça:** "Célula Esperança · Encontro de quinta, 22/10 · preparado por Marcos", em 9 pt, cinza escuro. No anterior, com a data do encontro ou "Preparado em 12/10".
- **Título:** em 20 pt, peso 800.
- **Estudo atual:** Acolhida (com "Na semana passada combinamos", se houver), Adoração, Palavra, Para conversar (numeradas), Combinado para a semana e Testemunho, nessa ordem, como na aba.
- **Estudo anterior:** só Palavra, Para conversar e Combinado.
- **Partes:** cada parte com a etiqueta em 9 pt maiúscula e espaçada; tópicos com o número; listas com seta (`→` da fonte do sistema); "Para guardar" com fio de 1,5 pt à esquerda.
- **Cartões:** caixa com fio de 1 pt cinza, raio de 6 pt, a referência e a abreviatura da tradução embaixo, `break-inside: avoid`.
- **"No plano":** uma linha só, "Efésios 6 é o dia 244 do plano", sem "Você leu em".
- **Pé:** o crédito da tradução (`CC.creditoBiblia`, só o texto, sem o link).
- **Não vai:** botões, os três pontos, a barra de abas, a anotação pessoal, "Estudos anteriores", a presença e pedido de oração nenhum.

**CSS de impressão** (na peça `estudo-celula.css`):

```css
.mesa-impressao { display: none; }
@media print {
  @page { size: A4; margin: 16mm 15mm 18mm; }
  body.imprimindo-estudo { background: #fff !important; }
  body.imprimindo-estudo > :not(.mesa-impressao) { display: none !important; }
  body.imprimindo-estudo .mesa-impressao { display: block; color: #111; background: #fff; font: 500 11pt/1.5 Manrope, system-ui, sans-serif; }
  .mesa-impressao h1, .mesa-impressao h2, .mesa-impressao h3 { break-after: avoid; color: #000; }
  .mesa-impressao .imp-cartao, .mesa-impressao .imp-guardar, .mesa-impressao li { break-inside: avoid; }
}
```

A impressão não usa as fichas do tema: é tinta preta sobre papel branco nos dois temas, para sair igual com o celular no escuro.

### 4.11 Estados vazios e de erro

| Onde | Situação | Texto | Ação |
|---|---|---|---|
| Lista | sem anteriores, com estudo atual | (seção 4.3, líder ou outros) | nenhuma |
| Lista | sem rede | "Não deu para abrir os estudos anteriores agora." | "Tentar de novo" |
| Leitura | 404 (`naoAberto`), quem saiu da célula, estudo que saiu pelo teto | "Este estudo não está aberto para você. Se você escreveu uma anotação nele, ela continua em Minhas anotações." | "Minhas anotações" (`#/perfil/anotacoes`) |
| Leitura | 403 (`soMembros`), visitante | "Os estudos anteriores ficam para quem faz parte da célula. O estudo atual está na aba Estudo." | "Ver o estudo atual" |
| Leitura | sem a peça ou sem rede | `CC.estadoSemPeca('Não deu para abrir o estudo')`, como na Fase 1 | "Tentar de novo" |
| Imprimir | sem o texto de um cartão | "Sem conexão, o texto dos versículos não veio. Tente imprimir de novo com internet." | (aviso) |
| Imprimir | sem `window.print` | "Este aparelho não abriu a impressão. Abra o app no navegador do celular ou do computador e tente de novo." | (aviso) |
| Registro | estudo inválido (400) | "Escolha um estudo desta célula preparado até o dia do encontro." (a tela põe a maiúscula) | (na folha) |
| Preparo | combinado longo (400) | "O combinado tem no máximo 200 caracteres." | (no passo 3) |
| Usar como base | sem a fonte (sem rede) | "Não deu para abrir este estudo agora. Tente de novo." | volta à leitura |

---

## 5. Textos exatos e funções do cliente

### 5.1 Os textos novos

| Onde | Texto |
|---|---|
| Passo 3, rótulo | Combinado para a semana (opcional) |
| Passo 3, dica 1 | Uma atitude simples para todos viverem até o próximo encontro. A acolhida do próximo encontro começa por ela. |
| Passo 3, dica 2 | Evite nomes de pessoas, porque o combinado fica guardado nos estudos anteriores da célula. |
| Passo 3, marcador | Ex.: Orar todo dia por alguém que ainda não conhece Jesus. |
| Passo 3, perto do teto | Faltam N caracteres para o limite do combinado. |
| Passo 3, aviso de salvar | Ao salvar, todos da célula veem o estudo na aba Estudo, inclusive quem está só conhecendo. Quando você preparar o próximo, este fica em Estudos anteriores para quem faz parte da célula, com o seu nome. |
| Aba, Acolhida | **Na semana passada combinamos:** {combinado}. Como foi? (o ponto só entra quando o combinado não termina em `.`, `!` ou `?`) |
| Aba e impressão, seção | Combinado para a semana |
| Cartão do líder, usado | Ele já foi usado num encontro. Quando você preparar o próximo, este fica em Estudos anteriores. |
| Botão | Imprimir |
| Seção | Estudos anteriores |
| Linha da lista | Encontro de 15/10 / Preparado em 12/10 |
| Botão da lista | Ver mais estudos |
| Lista vazia, líder | Quando você preparar o próximo estudo, este fica guardado aqui para a célula reler. |
| Lista vazia, outros | Quando o próximo estudo for preparado, este fica guardado aqui para a célula reler. |
| Filha, seção | Da célula de origem |
| Filha, dica | Os estudos da {Célula Esperança} até a multiplicação, em {10/10}. Só para leitura. |
| Filha, botão | Ver os estudos da {Célula Esperança} |
| Leitura, etiqueta | Estudo anterior / Da {Célula Esperança} · só para leitura |
| Leitura, linha | Encontro de quinta, 15/10 · preparado por Marcos / Preparado em 12/10 por Marcos |
| Leitura, presença | Vieram 9 pessoas no encontro de 15/10. / Veio 1 pessoa no encontro de 15/10. |
| Leitura, presença, nota | Só quem conduz a célula vê este número. |
| Botão | Usar como base |
| Confirmação | Usar como base? (seção 4.5) |
| Preparo, nota | Começando do estudo de 15/10. Mude o que quiser antes de salvar. |
| Modo encontro, cartão | Pergunta da acolhida |
| Modo encontro, etiqueta | Para a semana |
| Modo encontro, cartão | Combinem juntos. No próximo encontro, a acolhida começa por aqui. |
| Registro, etiqueta | Estudo deste encontro |
| Registro, botão | Trocar |
| Registro, opção | Outro estudo, fora do app |
| Quem não veio, título | Quem não veio |
| Quem não veio, dica | O app não avisa ninguém. Se quiser, mande uma mensagem para cada pessoa pelo seu WhatsApp. |
| Quem não veio, prévia | A mensagem, com o nome de cada um |
| Quem não veio, botões | Mandar no WhatsApp / Copiar / Fechar |
| Quem não veio, aviso | Mensagem copiada. É só colar na conversa. |
| Anotação, seção | Minha anotação neste estudo |
| Anotação, botão | Escrever minha anotação / Escrever outra anotação |
| Anotação, aviso | Só você vê. Guardado com criptografia. Saiba mais (o de sempre) |
| Minhas anotações, chip | Estudo da célula |

### 5.2 Funções puras novas em `CC.estudoRegras` (`estudo-regras.js`)

- `refsCurtas(refs)`: os capítulos na ordem em que aparecem, sem repetir, com a sigla de `CC.LIVROS`. Até 3 e depois " e mais N". `['Efésios 6.12', 'Lucas 11.24-26', '1 Pedro 5.8', 'Efésios 6.13-17', 'Efésios 6.18', 'Efésios 6.10']` dá "Ef 6, Lc 11, 1Pe 5".
- `lembrarCombinado(texto)`: "Na semana passada combinamos: " + texto + (ponto final se o texto não termina em `.`, `!` ou `?`) + " Como foi?".
- `passos(e, { ..., combinadoAnterior })`: seção 4.6.
- `textoParaGrupo(e, contexto)`: com combinado, depois das perguntas, uma linha em branco e `*Combinado para a semana:* {combinado}`. Sem combinado, o texto é o da Fase 1, igual a `ferramentas/estudo-exemplo-grupo.txt`.
- `paraImprimir(e, { celula, linha, textos, sigla, credito, anterior, acolhida, adoracao, testemunho, combinadoAnterior, noPlano })`: o HTML da seção 4.10, escapado por `CC.esc` e com o mesmo `negrito` de `blocoEmHtml`.
- `dataDaLista(item)`: "Encontro de 15/10" ou "Preparado em 12/10".

### 5.3 A mensagem para quem faltou (`CC.recadoFaltou`, no index, em `08b`)

```js
CC.recadoFaltou({ nome, celula, quando, estudo })
// nome: o primeiro nome; celula: o título da célula; quando: 'de hoje' | 'de ontem' | 'de quinta' | '';
// estudo: { tipo, titulo, refs } ou null
```

- **Abertura:** "Oi, {nome}! Sentimos sua falta no encontro {quando}." Sem `quando`: "...no encontro da {Célula Esperança}." (a regra de `08b:1003`).
- **Com estudo `blocos`:** " Estudamos “{título}”, em {Efésios 6}. O estudo está na aba Estudo da célula, no app, se você quiser ler." O capítulo é o primeiro de `refs`; sem refs, sai ", em {…}".
- **Com estudo `semana`:** " Estudamos a leitura da semana do plano. O estudo está na aba Estudo da célula, no app, se você quiser ler."
- **Com estudo `trecho`:** " Estudamos {Romanos 8.28-30}. O estudo está na aba Estudo da célula, no app, se você quiser ler."
- **Fecho, sempre:** " Está tudo bem com você? Posso orar por alguma coisa?"

Exemplo inteiro:

> Oi, Bia! Sentimos sua falta no encontro de quinta. Estudamos “Batalha espiritual, vigilância e Armadura de Deus”, em Efésios 6. O estudo está na aba Estudo da célula, no app, se você quiser ler. Está tudo bem com você? Posso orar por alguma coisa?

---

## 6. Gírias

### 6.1 O que muda (Fase 2)

| Arquivo e linha | Hoje | Passa a ser |
|---|---|---|
| `08b-propositos.js:569` (aceitar propósito) | Bora juntos! | Propósito aceito. Boa leitura juntos! |
| `08b-propositos.js:996` (atenção vazia) | Ninguém sumido por aqui. | Ninguém precisa de atenção agora. |
| `08b-propositos.js:1006` (ofensiva) | Oi, {nome}! Vi que sua sequência de leitura deu uma pausa depois de um tempão firme. Tudo bem por aí? Bora recomeçar juntos? | Oi, {nome}! Vi que a sua sequência de leitura parou, depois de tantos dias seguidos. Está tudo bem por aí? Se quiser, recomeçamos juntos. |
| `08b-propositos.js:1007` (dias sem ler) | Oi, {nome}! Passando para saber como você está. Bora voltar a ler junto com a gente? | Oi, {nome}! Passando para saber como você está. Que tal voltar a ler junto com a gente? |
| `08b-propositos.js:1005` (faltou) | (sem gíria) | `CC.recadoFaltou` (seção 5.3) |
| `03-trilha.js:349` (saudação sem nome) | Olá! Bora ler? | Olá! Vamos ler? |
| `03b-fala-do-dia.js:12` | ... Uns {min} minutos. Bora? | ... Uns {min} minutos. Vamos? |
| `03b-fala-do-dia.js:16` | Um capítulo de cada vez. Bora começar? | Um capítulo de cada vez. Vamos começar? |
| `03b-fala-do-dia.js:33` | Faltam poucos dias para fechar esta unidade. Bora? | Faltam poucos dias para fechar esta unidade. Vamos? |
| `08-amigos.js:63` (`FALA_TOQUE`) | Bora ler hoje? | Vamos ler hoje? |
| `estudo-regras.js:20` (acolhida) | Quem é uma pessoa que te ajudou recentemente? | Quem ajudou você nos últimos dias? |
| `estudo-regras.js:21` (acolhida) | Qual comida te lembra a sua casa? | Qual comida lembra a sua casa? |

As duas últimas não são gíria. É o pronome oblíquo misturado com "você", o mesmo acerto da Fase 1 em "O que fez você rir" (`docs/a-mesa-fase1.md`, seção 0), nas sugestões da mesma lista.

O `teste.mjs` ganha uma trava: nenhum literal de `src/app/*.js` e `src/sob-demanda/*.js` com `\b(Bora|bora|tempão|sumid[oa])\b`.

### 6.2 O que fica para o dono

`notificacoes.mjs` tem "Bora" em dez frases (`:236`, `:273`, `:321`, `:392`, `:397`, `:404`, `:408`, `:414`, `:421`, `:426`), com emoji, numa voz própria das notificações e com teste de variedade e tamanho (`teste.mjs:1862-1900`). Elas não mudam na Fase 2. A lista vai ao dono com a pergunta: as notificações seguem o cartão de voz da tela (sem gíria e sem emoji) ou continuam com a voz delas? "PRA CONTAR." (`01e-story-artes.js:3387`) é frase do dono numa arte e também não muda.

---

## 7. Privacidade (`src/privacidade.html`, no bloco SERVIDOR)

A versão 4 cobre o estudo atual, o autor e a guarda. Ela **não** cobre:

- quem lê os estudos anteriores (quem entrou depois, a filha);
- o estudo ligado ao encontro;
- o lugar da anotação, que fica sem cifra;
- a mensagem para quem faltou;
- o combinado.

O histórico da política (`:271`) também não tem a entrada da versão 4. As mudanças:

1. **Quem vê o quê** (seção 6, `:161`), a linha "O estudo da célula" passa a: "Todos da célula, inclusive visitantes, com o nome de quem preparou. Os estudos anteriores, só quem faz parte da célula hoje, inclusive quem entrou depois. Na célula que nasceu de uma multiplicação, os membros dela também leem os estudos da célula de origem até a data da multiplicação. Só o líder prepara, muda ou tira o estudo."
2. **Presença** (seção 6, `:156`): "Quem conduz a sua célula e a administração. Junto com a presença fica qual estudo foi usado no encontro."
3. **Alertas de cuidado** (seção 5, `:143`), uma frase no fim: "Depois de registrar um encontro, quem conduz vê quem não veio e pode mandar uma mensagem pronta pelo WhatsApp do próprio celular. O app não manda nada sozinho."
4. **Segurança** (seção 9, `:202`), depois da primeira frase: "O lugar de cada anotação (o versículo, a página do Explorar, o dia do Conhecer Jesus ou o estudo da célula) fica sem criptografia, para o app mostrar a anotação no lugar certo. O texto, o título e as tags ficam criptografados." É o item 3 da crítica.
5. **Por quanto tempo** (seção 11, `:225`): "Enquanto a célula existir, até os 200 mais recentes. Um estudo novo não apaga o anterior. Acolhida, adoração e testemunho não ficam guardados nos estudos anteriores."
6. **Apagar a conta** (seção 11, `:234`): "...o que você escreveu só para você (reflexões, orações e anotações, inclusive as dos estudos da célula)...".
7. **O que fica depois da exclusão** (seção 11, `:235`): "os estudos que você preparou para a célula, com as perguntas e o combinado da semana, com o seu @".
8. **Versão** (`:61`): "Versão 5 · atualizada em 18 de outubro de 2026" (o coordenador ajusta a data na publicação).
9. **Histórico** (`:271`), duas entradas no alto:
   - "**Versão 5, 18 de outubro de 2026.** Os estudos anteriores da célula: quem lê, a célula que nasceu de uma multiplicação, o estudo ligado a cada encontro, a mensagem para quem faltou e o lugar da anotação no estudo (seções 5, 6, 9 e 11)."
   - "**Versão 4, 18 de outubro de 2026.** O estudo da célula: quem vê, quanto tempo fica e o que fica depois da exclusão (seções 6 e 11)."

`CONSENTIMENTO_VERSAO` (`contas.mjs:81`) continua 3: o texto do consentimento não muda. A seção 15 da política promete avisar no app quando a mudança amplia o que alguém vê. O aviso aos líderes é a frase nova do passo 3 (seção 4.1). Um aviso no sino para os líderes já com estudos guardados fica para o coordenador decidir na publicação (seção 11).

---

## 8. Onde fica cada código

### 8.1 Index e peças

A folga do `dist/index.html` hoje é de **77 KB**, e o piso é **60 KB** (`teste.mjs:152-154`). O que é grande fica nas peças. No index entra só o que outras telas usam ou o que abre antes da peça:

| Arquivo (index) | O que entra | Peso |
|---|---|---|
| `08b-propositos.js` | o estudo na folha de registro e a escolha já marcada; `CC.recadoFaltou`; a chamada a `paraQuemFaltou` depois do registro; o vazio com anteriores; o terceiro pedaço da rota; `CC.abrirEstudoSolto`; `apoio.registrarEncontro(p, opcoes)`; as gírias | ~3,0 KB |
| `24-juntos.css` | `.estudo-do-registro`, `.escolha-estudo`, `.opcao-estudo` | ~0,4 KB |
| `10-roteador.js` | a rota `estudo` e a expressão do `sem-barra` | ~0,1 KB |
| `02-estado.js`, `02b-jogo.js`, `06-explorar.js` | `estudo:` no `CONTEXTO`, a conquista sem a nota do estudo, o nome do contexto | ~0,2 KB |
| `07g-anotacoes.js`, `04e-versiculos.js` | os três atributos de `notasDoContexto` e o `titulo` de `abrirEditor` | ~0,3 KB |
| `03-trilha.js`, `03b-fala-do-dia.js`, `08-amigos.js` | gírias | 0 |

Ao todo, uns 4 KB: a folga fica perto de **73 KB**.

**Peça `estudo-celula`** (`estudo-regras.js` + `estudo-celula.js` + `estudo-celula.css`), uns 12 KB a mais:

- as regras da seção 5.2;
- a aba com o combinado, a anotação, "Imprimir" e a lista;
- a leitura do anterior, "Usar como base" (a confirmação e a ida ao preparo), "Quem não veio", a impressão e o modo encontro com o combinado;
- o CSS: `mesa-combinado`, `mesa-anteriores`, `mesa-anterior`, `mesa-presenca`, `folha-faltou`, `mesa-impressao` e o `@media print`.

**Peça `estudo-preparo`** (`estudo-marcas.js` + `estudo-preparo.js` + `estudo-preparo.css`), uns 1,5 KB a mais: o campo do combinado, `ws` vazio no estudo novo e o rascunho a partir de uma base (`deBase`).

A marca da peça `estudo-celula` no `teste.mjs` (`textoParaGrupo`) continua. Entra uma segunda, `mesa-anteriores`, que não pode aparecer no index.

### 8.2 Servidor

- **`estudos.mjs`:** as funções da seção 2, `COMBINADO_MAX` e as mensagens novas.
- **`contas.mjs`:**
  - `paraLinhas` e `deLinhas` com `estudo` (seção 1.2);
  - `salvarEstudo` com o combinado e os 4 Ws do estudo novo (seção 3.2);
  - `registrarEncontro` com `estudo` e `faltaram` (seção 3.3), que passa a devolver `{ p, registro, faltaram }`;
  - `estudoJaUsado` com o `id` (seção 2.2);
  - três leitores diretos da tabela:
    - `estudosDaCelula(id, { de, antes, limite })`, a lista;
    - `estudoParaLer(eu, estudoId, celulaId)`, que resolve a célula e o acesso;
    - `dadosDoEstudo(p, hoje)`, com `combinadoAnterior`, `temAnteriores`, `daMae` e `registro`.
- **`servidor.mjs`:**
  - `celulaNoRetrato` com os campos da seção 3.4;
  - a rota `GET /api/estudos` (seções 3.5 e 3.6), na lista das rotas com sessão;
  - a ação `registrarEncontro` com `estudo` e a resposta nova;
  - `diaDe` pelo fuso do líder da célula do estudo (`hojeNoFuso(fuso, new Date(iso))`, como `estudoJaUsado`, `contas.mjs:1405-1413`).
- **`db.mjs`:** a v20.
- **`Dockerfile`:** nada novo (`estudos.mjs` já está no `COPY`).

---

## 9. Testes

### 9.1 Testes de hoje que mexem no que muda

| Teste | O que muda |
|---|---|
| `teste.mjs:1697-1708` (`estudoUsado`) | Os casos da Fase 1 continuam (registros com `estudo: ''`). Entram os casos com ligação (9.2, item 3). |
| `teste.mjs`, "peças sob demanda" (`:325-375`) | A marca `mesa-anteriores` fora do index. A folga de 60 KB continua. |
| `teste.mjs`, "regras do estudo" | `passos` do estudo do dono continua com 15 passos. `textoParaGrupo` sem combinado continua igual a `estudo-exemplo-grupo.txt`. |
| `ferramentas/teste-celula.mjs` (`registrarEncontro`) | A resposta passa de `{ ok: true }` a `{ ok, encontro, estudo, faltaram }`. Quem confere `status === 200` não muda. |
| `ferramentas/teste-inteligencia.mjs` | Registra encontros. Só regressão: a frequência não muda. |
| `ferramentas/teste-estudo-celula.mjs` | Só regressão. O passo 13 (o auxiliar abre o registro) passa a ver o bloco "Estudo deste encontro". |
| `ferramentas/teste-db.mjs` | Migrar até a v20. Conferir "tem a v20", nunca "é a v20" (`docs/aprendizados.md`, 2026-10-04). |
| `ferramentas/teste-anotacoes.mjs` | Regressão das notas com contexto (Explorar, Conhecer, parábola). |
| `ferramentas/teste-celula-botoes.mjs` | A mensagem de "Precisam de atenção" (ofensiva e dias sem ler) com o texto novo, se o teste a conferir. |
| `design/ferramentas/semear.mjs` | Passa a semear um estudo anterior com combinado, ligado a um encontro de 7 dias atrás, para a revisão de telas ver a lista, a leitura e a Acolhida com o combinado. |

### 9.2 Unidade (`teste.mjs`)

Na seção "estudos da célula no servidor", com `Contas` num banco temporário, como hoje:

1. **`limparCombinado`:**
   - espaços e quebras viram um espaço;
   - 200 passa, e 201 dá 400 com a mensagem;
   - `undefined` dá `null`, e `''` dá `''`.
2. **O combinado no `salvarEstudo`:**
   - grava e volta em `estudo.combinado`;
   - mudar o mesmo estudo sem o campo mantém;
   - um estudo novo sem o campo fica `''`;
   - uma citação colada (`Efésios 6:10 “Fortaleça-se no Senhor” (NVI)`) vira "Efésios 6.10" e não guarda "Fortaleça-se".
3. **`estudoUsado` com `id`:**
   - um encontro com `estudo === id` marca usado, sem olhar a hora do registro;
   - um encontro com outro id ou `'-'` não conta, mesmo registrado depois;
   - `''` segue os casos da Fase 1.
4. **`estudoDoDia`:** com A (nasceu em 01/10, atual até 08/10 às 23h), B (de 08/10 às 23h até 15/10 às 10h) e C (15/10 às 10h, atual):
   - 07/10 dá A, 08/10 dá B e 15/10 dá C;
   - 30/09 dá `''`;
   - o fuso entra pelo `diaDe` (São Paulo contra Lisboa no limite da meia-noite).
5. **`acessoAoEstudo`, a tabela inteira:**
   - os papéis: líder, auxiliar, membro, visitante, quem saiu, convidado, administrador de fora, membro da filha, visitante da filha;
   - os estudos: atual, anterior, da mãe antes do corte, da mãe depois do corte, de outra célula;
   - em cada caso, `ler`, `codigo`, `presenca` e `usarComoBase` esperados;
   - o líder da filha nunca tem `usarComoBase` nem `presenca` num estudo da mãe.
6. **`combinadoDoAnterior`:**
   - com encontro ligado há 7 dias, mostra;
   - há 11 dias, `null`;
   - sem combinado, `null`;
   - sem encontro ligado e com `atual_ate` de 3 dias atrás, mostra, com essa data.
7. **`dataNoHistorico`:**
   - com dois encontros ligados, pega o mais novo;
   - ignora "não houve encontro";
   - sem nenhum, a data do preparo com `dataDe: 'preparo'`.
8. **Os 4 Ws do estudo novo (A5):**
   - salvar um estudo novo sem os campos zera os três;
   - com os campos, grava os que vieram;
   - mudar o mesmo estudo não mexe.
9. **`registrarEncontro` com estudo:**
   - um id da célula grava;
   - um id de outra célula, ou da mãe, dá 400;
   - um estudo preparado depois da data dá 400;
   - `'-'` grava;
   - sem o campo, grava o `estudoDoDia`;
   - `semEncontro` grava `''`;
   - regravar a mesma data troca.
10. **`faltaram`:**
    - não tem visitante, quem registrou, quem entrou depois da data nem os presentes;
    - vem vazio com `semEncontro`;
    - nenhuma linha nova em `push_caixa` depois do registro.
11. **O registro de dias atrás:** registrar o encontro de 7 dias atrás com o estudo antigo deixa o atual com `usado: false` (o cartão do líder continua "Mudar o estudo").
12. **`estudosDaCelula`:**
    - só linhas com `atual_ate`, do mais novo para o mais velho;
    - página de 20 com cursor (25 linhas dão 20, depois 5, e `mais: false`);
    - `de: 'mae'` traz só até o corte, e numa célula sem mãe dá 404.
13. **`estudoParaLer`:**
    - sem `celula`, acha a célula do estudo e, senão, a filha;
    - quem saiu da célula recebe 404;
    - o visitante, num anterior, 403.
14. **Apagar a conta do líder:** a lista mostra `criadoPorNome: '@lider'`, e os encontros continuam ligados.
15. **v20 em memória:** carregar um banco com `celula_encontros.estudo = 'e1'`, gravar outra coisa qualquer e reler mantém `'e1'`. É a armadilha da seção 1.2.

Na seção "regras do estudo" (`estudo-regras.js` no vm):

16. **`refsCurtas`:**
    - o estudo do dono dá "Ef 6, Lc 11, 1Pe 5";
    - cinco capítulos dão os três primeiros e " e mais 2";
    - lista vazia dá `''`.
17. **`lembrarCombinado`:**
    - "Ligar para alguém" ganha o ponto;
    - "Ligar para alguém." não fica com dois pontos;
    - "Quem vamos visitar?" fica com a interrogação.
18. **`passos` com `combinadoAnterior`:**
    - o passo 1 tem a frase lembrada e a `pergunta` da acolhida;
    - com `estudo.combinado`, "Para a semana" fica logo antes de "Orar juntos";
    - o estudo do dono sem combinado continua com 15 passos e as mesmas etiquetas.
19. **`textoParaGrupo` com combinado:**
    - a linha `*Combinado para a semana:* ...` vem depois das perguntas, com uma linha em branco antes;
    - sem combinado, igual a `estudo-exemplo-grupo.txt`.
20. **`paraImprimir`:**
    - tem o título, cada cartão com o texto passado, as perguntas numeradas, o combinado e o crédito;
    - com `anterior: true`, não tem a acolhida, a adoração, o testemunho nem "Na semana passada";
    - `<script>` sai escapado;
    - não tem travessão nem meia-risca.

Com `08b` no vm (`teste.mjs:1136-1138`):

21. **`CC.recadoFaltou`:** as quatro formas (blocos, semana, trecho, sem estudo), com e sem `quando`, iguais aos textos da seção 5.3.
22. **`recadoDeCuidado`:** a ofensiva e os dias sem ler com o texto novo.

Notas e conquista:

23. `limparNota` mantém `contexto: 'estudo:e3f9a1c2b7d4'` no aparelho e no servidor (`REGRAS.normalizarEstado`). Com `parabola:` e os outros, como antes.
24. A conquista "Caderno de notas" não conta uma nota com contexto `estudo:`, mesmo com um versículo ligado. A nota comum com versículo continua contando.
25. A trava de gírias da seção 6.1.
26. **`privacidade.html`:**
    - "Versão 5" no alto;
    - as entradas da versão 4 e da 5 no histórico;
    - a frase do lugar da anotação;
    - "Estudos anteriores" no quadro de quem vê.

### 9.3 Banco (`ferramentas/teste-db.mjs`)

- Do banco v6 (`:172-194`) até a v20: as colunas `celula_estudos.combinado` e `celula_encontros.estudo` existem, e os encontros antigos ficam com `estudo = ''`.
- Os esquemas montados à mão (`:257-265`, `:326-328`, `:371-373`) continuam migrando.
- `apagarPessoaDoBanco` não mexe em `celula_encontros.estudo` nem em `celula_estudos`.

### 9.4 HTTP (`ferramentas/teste-celula.mjs`)

Ao lado de `:116-188`:

- `registrarEncontro`:
  - a resposta traz `faltaram` com a Ana quando ela não veio, e sem o visitante;
  - com o estudo de outra célula, 400;
  - sem o campo, o encontro fica ligado ao estudo atual.
- O combinado de 201 caracteres dá 400.
- O estudo novo zera os 4 Ws.

### 9.5 Navegador (novo `ferramentas/teste-estudo-historico.mjs`)

**Montagem:** como em `teste-estudo-celula.mjs:12-90`, com estas diferenças:

- a porta é `Number(process.env.PORTA) || 8394`; no ambiente de agentes, `PORTA=99xx` e `PORTAS=9900-9960`;
- `CAMINHO_ADMIN=admin` no ambiente do servidor;
- as contas (pela API):
  - `lider` (Marcos), `aux` (Paulo, auxiliar), `ana` e `bia` (membros) e `vera` (visitante);
  - `outro`, líder de outra célula, e `admin`;
- o dia do encontro é o dia da semana de hoje: assim "o encontro desta semana" da folha de registro é hoje, em qualquer dia em que o teste rodar;
- a Ana deixa um pedido de oração na célula (`api/cuidado`), como no teste da Fase 1;
- as datas no passado entram direto no banco, só em `celula_estudos`, que o servidor lê direto (`contas.mjs:1415-1420`). Os encontros entram sempre pela API, porque moram na memória do servidor.

**Parte A, a API e as permissões:**

1. **S1:** o líder salva o estudo do dono com o combinado "Ligar para alguém que faltou." e o testemunho "Orem pelo Jonas, que está doente.". Depois, o teste muda direto no banco o `criado_em` de S1 para 8 dias atrás.
2. **O encontro de 7 dias atrás:** o Paulo o registra sem mandar o campo `estudo`, com presentes Paulo, Ana e Vera e 2 pessoas sem conta.
   - O registro fica ligado a S1 (o estudo que valia naquele dia).
   - `faltaram` traz a Bia e o Marcos, em ordem de nome, sem a Vera (visitante) e sem o Paulo (que registrou).
3. **S2:** o líder salva o próximo com o combinado "Orar todo dia por alguém que ainda não conhece Jesus." e sem os 4 Ws.
   - Nasce uma linha nova, e S1 ganha `atual_ate`.
   - O retrato tem `estudoTestemunho: ''`: o testemunho de S1 não passou para S2 (A5).
4. **A lista** (`GET /api/estudos?celula=`):
   - o líder, o Paulo e a Ana recebem S1 com `dataDe: 'encontro'`;
   - a Vera recebe 403; o `outro` e o `admin`, 404.
5. **Um estudo** (`GET /api/estudos?estudo=S1`):
   - o Paulo recebe `encontros: [{ pessoas: 5 }]` e `usarComoBase: false`;
   - o líder recebe `usarComoBase: true` e a `fonte`, sem "A nossa luta";
   - a Ana recebe `encontros: []` e nenhuma `fonte`;
   - nenhuma resposta tem "Orem pelo Jonas" nem `estudoAcolhida`.
6. **Quem entrou depois:** o Caio entra pelo link depois de S2 e lê S1.
7. **`combinadoAnterior`:** o retrato de todos (a Vera incluída) traz "Ligar para alguém que faltou." com a data de 7 dias atrás.
8. **O encontro de 3 dias atrás:** o líder o registra sem o campo, com presentes ele e a Ana.
   - O registro fica ligado a S1.
   - `faltaram` não traz o Caio, que entrou depois daquela data.
   - S2 continua `usado: false`.
   - A leitura de S1 pelo Paulo passa a ter dois encontros, e a lista mostra a data de 3 dias atrás.
9. **Sair:** a Bia sai da célula e recebe 404 em S1.

**Parte B, o navegador, na célula mãe** (cada item vira um `ok`):

10. **Passo 3 do líder:** "Mudar o estudo" de S2, até o passo 3.
    - O campo do combinado traz o de S2.
    - Com 170 caracteres, aparece "Faltam 30 caracteres para o limite do combinado.".
    - Recarregar mantém o texto (o rascunho).
    - O aviso de salvar tem a frase nova.
    - "Sair" sai sem salvar, e o rascunho fica.
11. **Aba da Ana (S2):**
    - a Acolhida começa por "Na semana passada combinamos: Ligar para alguém que faltou. Como foi?";
    - não há caixa de marcar nem botão dentro de `.mesa-combinado`;
    - "Combinado para a semana" mostra o combinado de S2;
    - não há texto com `\d+ de \d+`.
12. **Estudos anteriores da Ana:**
    - a linha de S1 tem "Encontro de dd/mm" (3 dias atrás), o título e "Ef 6, Lc 11, 1Pe 5";
    - tocar abre a leitura, com os 6 cartões iguais a `nbv.json`;
    - a leitura não tem "Orem pelo Jonas", a Acolhida de hoje, "Vieram" nem "Usar como base".
13. **Anotação da Ana em S1:**
    - "Minha anotação neste estudo" e "Só você vê" aparecem;
    - a nota guardada já traz o título do estudo e continua lá ao reabrir S1;
    - Minhas anotações mostra a nota com o chip "Estudo da célula", que leva de volta a S1 (por `#/estudo/S1`);
    - o valor da conquista "notas" não muda, nem depois de ligar um versículo à nota;
    - o banco (`caminho.db*`, o WAL incluído) não tem o texto da nota em claro.
14. **Leitura do Paulo:** as duas linhas, "Vieram 2 pessoas no encontro de dd/mm." e "Vieram 5 pessoas no encontro de dd/mm.", e "Só quem conduz a célula vê este número.".
15. **Usar como base (líder):**
    - a confirmação tem as duas frases: o rascunho do item 10 e o atual sem uso;
    - "Usar como base" leva a `…/preparar/S1`, sem a barra de abas, com a nota "Começando do estudo de";
    - o campo tem o texto de S1, o passo 3 traz o combinado de S1, e a Acolhida e o Testemunho estão nas sugestões;
    - reabrir `…/preparar` mantém este rascunho;
    - "Sair" sai sem salvar (S2 continua o atual).
16. **Modo encontro (líder, S2):**
    - o passo 1 tem a frase do combinado e o cartão "Pergunta da acolhida";
    - "Para a semana" vem antes de "Orar juntos";
    - "Registrar quem veio" abre a folha com a data de hoje, "Estudo deste encontro" e o título de S2.
17. **Registro e "Quem não veio":**
    - com a Ana desmarcada, salvar abre "Quem não veio" com a Ana e o Caio;
    - o `href` do WhatsApp da Ana é `https://wa.me/?text=` mais o texto da seção 5.3 com "de hoje" e o título de S2;
    - um espião em `fetch` vê só o `registrarEncontro` e o `api/propositos` depois do registro;
    - a caixa do sino da Ana e a do Caio não ganham nada (lidas no banco);
    - "Copiar" chama `CC.copiar` com o texto.
18. **Registro de dias atrás:**
    - "Outra data" para 3 dias atrás marca S1, o estudo que o registro daquele dia já tem;
    - "Trocar" mostra as opções sem S2, preparado depois daquela data;
    - "Outro estudo, fora do app" grava `'-'` (lido no banco).
19. **Visitante (Vera):**
    - a aba não tem "Estudos anteriores";
    - `#/novidades/celula/<id>/estudo/S1` mostra "Os estudos anteriores ficam para quem faz parte da célula." e "Ver o estudo atual".
20. **Quem saiu (Bia):** `#/estudo/S1` mostra "Este estudo não está aberto para você." e o botão "Minhas anotações".
21. **Imprimir (líder, S2), com `window.print` trocado por um espião:**
    - o espião é chamado;
    - `.mesa-impressao` tem o título, os cartões iguais a `nbv.json`, as perguntas, o combinado e o crédito da NBV;
    - não tem "Minha anotação", "Só você vê" nem o texto de um pedido de oração que a Ana deixou na célula;
    - com `Emulation.setEmulatedMedia({ media: 'print' })` e o tema escuro, `#navegacao` e `.folha-juntos` ficam com `display: none`, e a impressão tem fundo branco e tinta escura;
    - `Page.printToPDF({ preferCSSPageSize: true })` sai com página A4 (`/MediaBox [0 0 595` no PDF).
22. **Impressão de S1 (Ana):** sem Acolhida, Adoração e Testemunho.
23. **Gírias na tela:** "Precisam de atenção" e o toast de aceitar um propósito não têm "Bora", "tempão" nem "sumido".

**Parte C, a multiplicação:**

24. **Pela API:**
    - o líder multiplica, com o Paulo como novo líder e a Ana;
    - o teste põe direto na tabela S3, um estudo da mãe com `criado_em` de amanhã (o que a mãe prepara depois do corte);
    - a Ana, na filha, recebe `daMae` e, com `de=mae`, S1 e S2, sem S3;
    - a Ana pede S1 sem `celula` e recebe `celula` igual à filha;
    - a Ana pede S1 com `celula` igual à mãe e recebe 404, porque saiu de lá;
    - o Paulo, líder da filha, abre S1 com `usarComoBase: false` e `encontros: []`.
25. **No navegador da Ana:**
    - aparecem "Da célula de origem" e "Ver os estudos da Célula Esperança";
    - a lista tem S1 e S2;
    - a leitura tem "Da Célula Esperança · só para leitura" e não tem "Usar como base".
26. **No navegador do Paulo:** a leitura de S1 não tem "Usar como base" nem "Vieram".

**Fim:**

27. **Tamanhos e temas** (360 e 390 px, claro e escuro):
    - nas telas: o passo 3 com o combinado, a aba com a Acolhida lembrada, a lista, a leitura do anterior (de membro e de quem conduz), a folha de registro com "Trocar" aberto, "Quem não veio", a anotação e a lista da célula de origem;
    - em cada uma: sem rolagem lateral, todo botão e todo link visível com 44 px ou mais na menor medida, nenhuma letra abaixo de 12 px.
28. **Encerrar:** o servidor e o Chrome por PID (`fecharArvore`, `servidor.kill()`), e as pastas temporárias apagadas.

**Contraste** (`design/ferramentas/contraste-v2.mjs`, ao lado de `:54-61`):

- `--tinta-forte` sobre `--salvia-palido`: o combinado lembrado, nos dois temas;
- `--tinta-fraca` sobre `--v2-cartao`: a data e as referências da lista;
- `--salvia-texto` sobre o fundo da aba: a etiqueta "Estudo anterior";
- `--tinta-forte` sobre `--campo`: o título do estudo na folha de registro;
- `--tinta-fraca` sobre `--v2-cartao`: a nota "Só quem conduz a célula vê este número.".

**Bateria antes de cada commit grande:**

- `node build.mjs` e `node teste.mjs`;
- `teste-db`, `teste-banco`, `teste-celula`, `teste-celula-botoes`, `teste-estudo-celula`, `teste-estudo-historico`, `teste-anotacoes`, `teste-inteligencia`, `teste-multiplicar`, `teste-redesenho` e `teste-sob-demanda`.

Depois de todo build, o servidor de teste sobe de novo (a CSP muda). No ambiente de agentes, as portas vão de 9900 a 9960, e os processos se matam por PID.

---

## 10. Dois blocos de trabalho

O contrato entre os blocos é o JSON das seções 3.2 a 3.6, mais as funções puras das seções 2 e 5.2. Cada arquivo tem um dono só; onde os dois mexem no mesmo arquivo, as partes estão listadas e não se cruzam.

### Bloco SERVIDOR (dados, regras, API, permissões e política), uns 1,5 dia

| Ordem | Arquivos | Entrega |
|---|---|---|
| S1 | `db.mjs` (v20), `contas.mjs` (`paraLinhas` e `deLinhas` com `estudo`), `ferramentas/teste-db.mjs` | O esquema e a armadilha do `INSERT OR REPLACE` coberta. |
| S2 | `estudos.mjs` (seção 2), `teste.mjs` (itens 1, 3 a 7) | As regras puras. |
| S3 | `contas.mjs` (`salvarEstudo`, `registrarEncontro`, `estudoJaUsado`, `estudosDaCelula`, `estudoParaLer`, `dadosDoEstudo`), `teste.mjs` (itens 2, 8 a 15) | Gravar e ler, com as permissões. |
| S4 | `servidor.mjs` (retrato, `GET /api/estudos`, a resposta do registro), `ferramentas/teste-celula.mjs` (seção 9.4) e a parte A de `ferramentas/teste-estudo-historico.mjs` | A API. |
| S5 | `src/privacidade.html` (seção 7), `teste.mjs` (item 26) | A versão 5. |

S2 e S4 destravam o cliente.

### Bloco CLIENTE (telas), uns 2,5 dias

| Ordem | Arquivos | Entrega |
|---|---|---|
| C1 | `02-estado.js` (só o `CONTEXTO`), `02b-jogo.js` (só a conquista), `06-explorar.js` (só o nome do contexto), `07g-anotacoes.js` (só `notasDoContexto`), `04e-versiculos.js` (só o `titulo` de `abrirEditor`), as gírias de `03-trilha.js`, `03b-fala-do-dia.js` e `08-amigos.js`, `teste.mjs` (itens 23 a 25) | O que não depende do servidor. |
| C2 | `src/sob-demanda/estudo-regras.js` (seção 5.2 e as duas acolhidas), `teste.mjs` (itens 16 a 20 e a marca `mesa-anteriores`) | As regras puras do cliente. |
| C3 | `08b-propositos.js` (seção 8.1, as gírias da célula e `CC.recadoFaltou`), `10-roteador.js`, `estilo-v2/24-juntos.css`, `teste.mjs` (itens 21 e 22) | A casca, o registro com o estudo e as rotas. |
| C4 | `src/sob-demanda/estudo-celula.js` e `.css` | A aba nova, a lista, a leitura, "Quem não veio", a impressão e o modo encontro. |
| C5 | `src/sob-demanda/estudo-preparo.js` e `.css` | O combinado, o estudo novo com os 4 Ws vazios e "Usar como base". |
| C6 | as partes B e C de `ferramentas/teste-estudo-historico.mjs`, `design/ferramentas/contraste-v2.mjs`, `design/ferramentas/semear.mjs` e os ajustes de `teste-estudo-celula.mjs` e `teste-celula-botoes.mjs` | A prova no navegador. |

**Para não esperar o servidor:**

- C1 e C2 começam já.
- C3 e C4 trabalham com o JSON das seções 3.4 a 3.6 escrito à mão. O `teste-estudo-historico` da parte A confere que o servidor devolve essa mesma forma.
- C5 precisa só do `GET /api/estudos?estudo=` (S4) para "Usar como base". O campo do combinado não precisa de nada.

### Fecho

1. **Juntar:** os dois blocos em `redesenho-novo`, com a bateria inteira verde e a folga de 60 KB ou mais.
2. **Revisar:**
   - as capturas a 390 e 360 px, claro e escuro, com `design/ferramentas/analise/rev.mjs` sobre a semeadura nova;
   - um PDF de cada impressão (atual e anterior), conferido a olho;
   - as frases lidas pelo cartão de voz.
3. **Registrar o aprendido:** uma entrada em `docs/aprendizados.md` sobre a coluna `estudo` em `paraLinhas` (a segunda vez da mesma armadilha), a rota `/api/estudos` fora do prefixo do link de convite e o que a impressão exigiu no celular.

**Commits:** em português, explicando o porquê, um por entrega (S1 a S5, C1 a C6), sem imagens, terminando só com a linha `Claude-Session`.

---

## 11. Riscos e pontos para conferir

- **Para o dono decidir:**
  - A2: a filha lê os estudos da mãe só até a multiplicação;
  - A5: o estudo novo começa com os 4 Ws vazios;
  - as notificações com "Bora" (seção 6.2);
  - um aviso no sino aos líderes que já têm estudos guardados, já que a lista passa a mostrá-los a quem entrou depois (política, seção 15).
- **A impressão no celular:** o Chrome do Android abre a prévia e salva em PDF. O Safari do iPhone imprime pelo `window.print`, mas o app instalado na tela de início precisa de prova num aparelho de verdade. O teste sem interface só prova a página A4 e o que some.
- **O fuso no registro:** os 8 dias de `registro.dias` são do fuso do líder, e a folha usa o dia do aparelho de quem registra. Num auxiliar em outro fuso, um dia pode não casar: a escolha cai no estudo atual, e a pessoa vê e troca.
- **O app antigo no cache do service worker:**
  - ele registra sem o campo `estudo` e o servidor escolhe (A7);
  - ele não conhece o contexto `estudo:`, e a limpeza dele tira o contexto da nota. O servidor, já novo, mantém a versão dele quando o `editadaEm` é igual (`fundirNotas`, `02-estado.js:203`). O risco fica no aparelho que edita a nota antes de atualizar o app;
  - a janela é curta, porque o app se atualiza na abertura seguinte.
- **"Na semana passada":** a janela de 10 dias é uma escolha. Uma célula que se encontra a cada 15 dias nunca vê o combinado lembrado. Se o dono quiser, a frase vira "No último encontro combinamos: … Como foi?" e a janela some.
- **O teto de 200:** o encontro que aponta para um estudo que saiu pelo teto mostra o estudo como `''`. Com um estudo por semana, são uns quatro anos.
- **A contagem de pessoas** soma os presentes com conta e os sem conta do registro. Se o registro for regravado, o número é o da última gravação.
- **O retrato** cresce uns 1,5 KB por célula para quem conduz (os 8 dias e os 4 estudos). O histórico fica na rota própria, com páginas, como pede a crítica.

---

## 12. O que o bloco SERVIDOR entregou (18/10)

Os commits `84df4ea` (S1, v20), `88ac87f` (S2, regras puras), `5254d33` (S3, contas), `b2879ad` (S4, API), `7e990d9` (S5, privacidade) e `2818842` (um acerto do S3). O JSON é o das seções 3.2 a 3.6, com estes pontos que o cliente precisa saber:

- **Combinado com citação.** Além do teto de 200 (400, "o combinado tem no máximo 200 caracteres"), o servidor recusa a citação que o leitor de marcas não troca pela referência (aspas no meio da frase com "(NVI)"): 400, "no combinado, escreva só a referência do versículo (como Efésios 6.10), sem o texto". O combinado não tem prévia, e guardar o texto de outra tradução quebraria a regra do texto bíblico. A citação na linha inteira continua virando só a referência. O passo 3 mostra essa mensagem como a do teto.
- **`registro.dias`** parte do dia de quem pede (`hojeDe(eu)`), que é a mesma faixa que `registrarEncontro` aceita. O dia de cada estudo (`padrao`, `estudos[].dia`) continua no fuso do líder.
- **`registro.estudos`** são os 4 mais novos da célula e, além deles, qualquer estudo que seja o `padrao` de um dos 8 dias ou que já esteja ligado ao registro de um deles. Assim a escolha já marcada sempre está na lista. Cada um vem como `{ id, tipo, titulo, refs, em, dia }`, com o título da regra da lista (vazio na leitura da semana).
- **A resposta do registro** traz `estudo` como `{ id, tipo, titulo, refs }` (o mesmo título da lista) ou `null` (sem estudo, ou `'-'`). `faltaram` vem em ordem do nome de exibição (o apelido ou o primeiro nome). `ultimoEncontro.estudo` tem a mesma forma.
- **`GET /api/estudos`**: 401 sem sessão, 405 para o que não é GET, 404 para id de estudo ou de célula com mais de 64 letras. A leitura do estudo atual (`atual: true`) não leva a fonte nem para o líder: a aba já tem.
- **`estudoNoRetrato`** ganhou a opção `comFonte` (a leitura de um anterior pelo líder leva a fonte sem o `usado`) e leva `combinado` sempre.
- **Funções novas em `estudos.mjs`**, além das da seção 2: `quemFaltou`, `encontrosDoEstudo`, `resumoDoEstudo`, `estudoDoRegistro`, `cursorDe` e `lerCursor`. Em `contas.mjs`: `diaNaCelula`, `estudosLeves`, `acessoDe`, `estudoParaLer`, `estudosAnteriores`, `estudosDaMae` e `dadosDoEstudo`.
- **A anotação no estudo** não precisa de nada novo no servidor: `notas.*.texto`, `notas.*.titulo` e `notas.*.tags` já são cifrados pelo `cofre.mjs`. Mas o servidor roda o mesmo `limparNota` de `02-estado.js` (`REGRAS.normalizarEstado`): enquanto `CONTEXTO` não aceitar `estudo:` (C1), a nota perde o contexto na sincronização.
- **A privacidade** ganhou "a parábola" na lista dos lugares de uma anotação, que também guarda o contexto sem cifra.
- **`ferramentas/teste-estudo-historico.mjs`** tem a parte A e a multiplicação pela API (38 verificações). As partes B e C no navegador entram no lugar marcado no arquivo. O S1 dele já tem os 6 cartões (a linha de Lucas 11.24-26 entra depois do parágrafo, como a sugestão aceita na prévia), e o servidor é religado uma vez para as entradas na célula e as contas voltarem 10 dias.

Ficam para o dono as quatro decisões da seção 11 (A2, A5, as notificações com "Bora" e o aviso no sino).

---

## 13. O que o bloco CLIENTE entregou (18/10)

Os commits `18374e3` (C1, a anotação com lugar próprio e as gírias), `824b8dd` (C2, as regras puras), `c46cba9` (C3, a casca), `51ca4e7` (C4, a peça `estudo-celula`), `dd2cef0` (C5, o preparo) e `7992401` (C6, a prova no navegador). A folga do `dist/index.html` foi de 77,0 para **70,1 KB** (o piso é 60). O que mudou em relação às seções 4 a 9:

- **O título na lista e na folha de registro quebra em quantas linhas precisar**, sem `-webkit-line-clamp`: a revisão de UI trata título cortado com reticências como defeito.
- **"Quem não veio", o `quando`:** até 6 dias atrás, o dia da semana ("de quinta"); com 7, o mesmo dia da semana de hoje, a data ("de 11/10"), para não parecer o encontro de hoje. "Copiar" é `botao contorno pequeno`, ao lado do WhatsApp.
- **`#/estudo/<id>` mora na peça** (`CC.estudoCelula.solto`): a casca só pede a peça. Foram 0,9 KB a menos no index.
- **"Escrever minha anotação" é botão secundário** na aba e na leitura: o principal da aba continua "Mandar no grupo".
- **Na impressão, "preparado por você" vira o nome** de quem preparou: a folha é lida por outras pessoas.
- **A confirmação de "Usar como base"** usa o "Cancelar" de sempre (plano); só `true` segue.
- **A visitante que chega a um anterior por `#/estudo/<id>`** recebe "Ver o estudo atual" para `#/celula`: o 403 não diz de que célula ela é.
- **O estudo anterior é tela própria para a rolagem** (`telaDe`, `10-roteador.js`): abre no alto, e o voltar devolve a lista na altura em que estava.
- **As abas da célula a 360 px:** com cinco abas (quem conduz) e o ponto do estudo, "Hoje" ficava com 39 px de largura desde a Fase 1. A 374 px ou menos, as abas têm menos respiro e 44 px de largura mínima.
- **A lista da célula de origem** continua aberta nos redesenhos da sessão (a sincronização redesenhava a seção e o toque em "Ver os estudos" se perdia).
- **A semeadura** (`design/ferramentas/semear.mjs`) liga o estudo anterior ao encontro de hoje, não ao de 7 dias atrás: pela API, o encontro só pode ser de um dia em que o estudo já existia.
- **`teste-estudo-historico`, partes B e C:** 156 verificações com as medidas (128 com `RAPIDO=1`). A prova de que nada manda mensagem olha os pedidos com corpo (só o registro e a sincronização do próprio estado) e a caixa do sino no banco; as leituras de depois do registro (`api/propositos`, `api/estudos`) são o redesenho. As capturas da impressão aplicam as regras do `@media print` na tela, porque a captura de tela não usa a mídia emulada; o PDF em A4 é conferido pelo `MediaBox`.

Ficam para o dono as quatro decisões da seção 11 e as frases com "Bora" das notificações (seção 6.2).

---

## 14. O que a revisão mudou (18/10)

Três revisões leram o diff de `336d46d` a `ab51e4c` (correção, segurança e privacidade, produto e visual). Os achados procedentes foram corrigidos em commits pequenos, de `8cbc634` a `581ed82`. O que muda em relação às seções 0 a 13:

**No servidor**

- **Quem não veio (A11, 3.3).** A regra passa a ser de fato a de "Precisam de atenção": fica fora também quem entrou na célula no próprio dia do encontro (`entrouEm >= data`) e quem conduz (o líder e o auxiliar). Antes, quem entrou no dia recebia "Sentimos sua falta no encontro de hoje", e o líder aparecia quando o auxiliar registrava.
- **O combinado de antes (A6, 2.5, 3.4).** Sem encontro ligado, o dia em que o anterior deixou de ser o atual só vale quando ele conta como usado (`estudoUsado` até esse dia) e nenhum encontro desde que nasceu foi ligado a outro estudo ou a `'-'`. E `combinadoAnterior` vai só para os membros, como `temAnteriores` e `daMae`: o visitante vê a acolhida com a pergunta do dia.
- **A filha e o corte (A2, 2.1).** Banco **v21**: `propositos.multiplicada_instante` (ISO), gravado com o dia. A filha lê o estudo da mãe que nasceu e foi mudado pela última vez até esse instante (`daMaeAteOCorte`); o que a mãe mudou depois, mesmo sem uso e na mesma linha, sai da filha (404 e fora da lista), porque o texto daquele momento não existe mais. Sem o instante (filha de antes da v21), vale o dia, para o nascimento e para a última mudança. Os encontros da mãe que a filha vê param na multiplicação (`encontrosAteOCorte`; os do mesmo dia, só registrados antes dela). A lista da mãe usa a mesma regra da leitura, estudo a estudo.
- **Os estudos de antes do histórico (seção 7, política seção 15).** Banco **v22**: `celula_estudos.antes_do_historico`, marcado em toda linha que já existia na migração (os da Fase 1 e os de antes da v19). Quando deixa de ser o atual, um estudo marcado fica só para quem estava na célula dele enquanto ele era o atual (na filha, quem estava na mãe nesse tempo); para os outros, 404 e fora da lista. Assim a v5 não amplia o que já estava guardado, e a política não precisa do aviso no sino para valer. A regra do dono (quem entrou depois lê os anteriores) vale para todo estudo preparado com o aviso novo do passo 3 à vista.
- **Política (v5, ainda não publicada).** O quadro de quem vê ganhou "Os estudos guardados antes desta versão ficam só para quem já fazia parte da célula quando eles eram o estudo atual" e "preparados até a multiplicação, como estavam naquele momento"; o histórico da v5 diz o mesmo em poucas palavras.

**Nas telas**

- **Usar como base (4.5).** O rascunho de base só abre no endereço dele (`…/preparar/<estudo>`). Em `…/preparar`, a tela pergunta "Continuar o rascunho?" ("Deixar de lado" apaga o rascunho e abre "Mudar o estudo"); o rascunho de base tem "Descartar o rascunho". A confirmação de "Usar como base" diz: "Você já começou um estudo neste celular. Se continuar, esse rascunho dá lugar ao estudo de 15/10." A casca redesenha o preparo quando a base do endereço muda, e não redesenha o preparo que ainda está abrindo (a pergunta na tela).
- **Passo 3 (4.1).** O aviso do teto fica dentro do cartão do combinado. O aviso de salvar: "Quando você preparar o próximo, este fica em Estudos anteriores para quem faz parte da célula e para as células que nascerem dela, com o seu nome. Se você apagar a conta, fica o seu @."
- **Minhas anotações neste estudo (4.9).** O título vai ao plural; o bloco fica depois dos botões, antes de "Estudos anteriores", na aba e na leitura; no estudo, o cartão mostra três linhas da anotação.
- **O combinado (5.1, 5.2).** `lembrarCombinado` põe o combinado entre aspas: "Na semana passada combinamos: “Ligar para alguém que faltou.” Como foi?". A ordem é uma só (a do modo encontro e do texto do grupo): o combinado e depois a oração. Na impressão, "Combinado para a semana" vem antes de "Para orar juntos"; na aba e na leitura da semana e do trecho, ele entra no roteiro, logo antes da oração. No modo encontro, a frase com mais de 120 caracteres desce para 1,25rem (o combinado de 191 caracteres cabe acima do rodapé a 360 x 740).
- **A leitura da semana antiga.** Num anterior (e na impressão dele), a semana só se monta com o `planoAte` guardado. Sem ele (as linhas `l<id>` da v19), a tela e o papel dizem "Os dias do plano que a célula leu naquela semana não ficaram guardados.", sem pôr a semana de hoje.
- **As listas da peça.** A chave da lista e da leitura leva a versão do retrato (o estudo atual, a última mudança e, para quem conduz, o último encontro); "Tirar o estudo" e "Não houve encontro" chamam `esquecer`.
- **Imprimir (4.10).** A classe `imprimindo-estudo` sai junto com a folha, na troca de endereço ou na próxima impressão, nunca no `afterprint`.
- **Textos e visual.** A presença com vários encontros diz "estes números", sem negrito nas linhas; no trecho, a lista não repete a referência; as abas a 374 px ou menos têm colunas `auto`; a legenda sobre o realce listrado usa a tinta (`--realce-listra` no `contraste-v2`); a linha marcada do registro usa o contorno de sempre; o "Copiar" ocupa a linha quando desce; o vazio da filha sem estudo perde o respiro de baixo.
- **Teste.** As gravações em `celula_estudos` com o servidor de pé esperam o banco (`busy_timeout`), e o teste mede o que vaza das abas e guarda capturas também a 360 px (prefixo `360-`).

**Descartado depois de conferir:** só a sugestão de levar o CSS de `.estudo-do-registro` e `.opcao-estudo` para a peça, para guardar folga: a folha de registro é da casca e abre pela aba Hoje sem a peça, e ficaria sem estilo. A folga está em 69,7 KB (o piso é 60). Ficaram como estão, de propósito: os títulos dos estudos na folha de registro de quem conduz (só títulos, e a escolha já marcada precisa estar na lista, mesmo de um estudo de antes do histórico); e o `crescer` dos campos de texto, que mede na digitação e não numa troca de largura (é de todos os campos do preparo, desde a Fase 1).

**Para o dono decidir:** A2 (a filha lê os da mãe só até a multiplicação), A5 (o estudo novo começa com os 4 Ws vazios) e as notificações com "Bora" continuam. O aviso no sino aos líderes com estudos guardados deixou de ser preciso para a política valer (v22); fica a pergunta se o dono quer abrir os estudos antigos a quem entrou depois, e aí, sim, com o aviso antes.
