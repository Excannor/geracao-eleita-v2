# À Mesa, Fase 1: plano de implementação

Plano para programar a Fase 1 da ferramenta de estudo da célula ("À Mesa"), a partir da proposta, da crítica, do inventário, do estudo do dono ("Batalha espiritual, vigilância e Armadura de Deus"), do mock aprovado em 17/10 e do código de `redesenho-novo` (71d2996). Os números de linha citados são desse commit.

## 0. O que vale e o que fica de fora

**Decisões do dono (17/10) que este plano aplica:**

1. Só o **líder** da célula prepara, muda ou tira o estudo. O auxiliar não: ele vê o estudo como membro e continua com a aba Painel e o registro de presença ("o auxiliar pode continuar" como está no mock).
2. Tradução: NBV para todos, com a opção de o líder trocar o estudo inteiro para a Bíblia Livre.
3. Mandar no grupo manda **sempre o estudo completo**, formatado. Não existe versão curta (o seletor "Versão curta / Estudo inteiro" do mock sai).
4. Os estudos ficam na célula com o @ de quem preparou, mesmo depois que essa pessoa apaga a conta.
5. Orar juntos só convida a orar e a abrir a aba Oração. Não repete versículo do estudo (o cartão de Efésios 6.18 do passo 13 do mock sai).
6. A Fase 1 já grava cada estudo numa tabela própria, pronto para o histórico da Fase 2. A lista de estudos anteriores e o "Combinado para a semana" **não** entram agora.

**Regras do produto que valem em todo passo:** o texto bíblico só vem de `conteudo/biblias` pela referência, palavra por palavra, nunca digitado, colado, mudado ou gerado; anotações pessoais continuam cifradas; nada de placar, "N de M leram" ou pontos por preparar e ler; pedido de oração nunca na tela do encontro; voz cordial, sem gíria e sem travessão no texto do app (o cartão de voz mora em `.claude/skills/mapa-do-livro/voz.md`; não existe `docs/voz.md`); paleta C, claro e escuro, 390 e 360 px, toque de 44 px ou mais, contraste AA.

**Fica de fora da Fase 1:** histórico e "Usar como base", combinado da semana, ligação estudo e encontro no registro, anotação pessoal no estudo, impressão, "para quem faltou" com o título do estudo, modelos, apoio para a passagem, guardar sem internet. Também fica de fora pôr a seta "→" na Manrope embutida: a fonte original não está no repositório. No campo de texto e no WhatsApp a seta sai na fonte do sistema. Nas telas de leitura ela é o ícone `avancar`, como no mock.

**Duas correções de texto antigo que entram porque o texto aparece no fluxo novo** (revisão do mock, item 18): a acolhida "O que te fez rir nos últimos dias?" vira "O que fez você rir nos últimos dias?" e o testemunho vira "Quem vocês querem convidar para o próximo encontro? Orem juntos por essas pessoas, pelo nome." As gírias de `08b:547`, `:986` e `:987` ("Bora", "tempão") ficam para a Fase 2, como está na proposta, porque não aparecem neste fluxo.

---

## 1. Modelo de dados

### 1.1 Esquema v19 (`db.mjs`, acrescentado depois da v18 em `db.mjs:261`)

A versão atual do esquema é a 18 (`ESQUEMA.length`). A v19 só acrescenta, como manda `db.mjs:33`.

```sql
-- v19: os estudos da célula (À Mesa). Cada estudo preparado é uma linha; o estudo atual da
-- célula é o que propositos.estudo_id aponta. Um estudo novo não apaga o anterior: ele fica
-- aqui para o histórico (Fase 2). O texto bíblico nunca é guardado: só as referências.
CREATE TABLE celula_estudos (
  id TEXT PRIMARY KEY,
  proposito TEXT NOT NULL,                 -- a célula (propositos.id)
  tipo TEXT NOT NULL,                      -- 'blocos' | 'semana' | 'trecho' | 'livre' (só legado)
  titulo TEXT NOT NULL DEFAULT '',
  ref TEXT NOT NULL DEFAULT '',            -- trecho: "Romanos 8.28-30" ou "Romanos 8"
  plano_ate INTEGER NOT NULL DEFAULT 0,    -- semana: último dia do plano coberto, congelado ao salvar (0 no legado)
  fonte TEXT NOT NULL DEFAULT '',          -- o texto do líder, com as citações trocadas pela referência
  blocos TEXT NOT NULL DEFAULT '[]',       -- JSON: as partes, tiradas da fonte pelo leitor de marcas
  refs TEXT NOT NULL DEFAULT '[]',         -- JSON: as referências dos cartões, na ordem
  perguntas TEXT NOT NULL DEFAULT '[]',    -- JSON: as perguntas escolhidas (0 a 6)
  traducao TEXT NOT NULL DEFAULT 'nbv',    -- 'nbv' | 'blivre', o estudo inteiro
  criado_por TEXT NOT NULL DEFAULT '',     -- @ de quem preparou ('' no legado: não se sabe quem foi)
  criado_em TEXT NOT NULL,
  editado_em TEXT NOT NULL DEFAULT '',
  atual_ate TEXT NOT NULL DEFAULT ''       -- quando deixou de ser o estudo atual ('' enquanto é)
);
CREATE INDEX celula_estudos_proposito ON celula_estudos (proposito, criado_em);
ALTER TABLE propositos ADD COLUMN estudo_id TEXT NOT NULL DEFAULT '';
-- o estudo que cada célula tinha (semana, trecho ou livre) vira a primeira linha dela
INSERT INTO celula_estudos (id, proposito, tipo, ref, fonte, criado_por, criado_em)
  SELECT 'l' || id, id, estudo_tipo, estudo_ref, estudo_texto, '',
         CASE WHEN estudo_em != '' THEN estudo_em ELSE criado_em END
  FROM propositos WHERE celula = 1 AND estudo_tipo != '';
UPDATE propositos SET estudo_id = 'l' || id WHERE celula = 1 AND estudo_tipo != '';
```

Por que assim:

- **`proposito`, e não `celula`**: é o nome que `celula_encontros` e `celula_presencas` já usam para o id da célula.
- **`fonte` e `blocos` juntos**: a fonte é o que o líder escreveu (sem as citações de outra tradução), e é ela que volta ao campo quando ele toca em "Mudar o estudo" (e, na Fase 2, em "Usar como base"). Os blocos são derivados e servem para desenhar sem rodar o leitor de marcas em quem só lê.
- **`atual_ate`** custa uma coluna e deixa a Fase 2 montar "Estudos anteriores" por período sem adivinhar.
- **Sem `combinado` e sem `estado`**: entram na Fase 2, numa v20, junto com a coluna `estudo` em `celula_encontros`.
- **`criado_por = ''` no legado**: hoje o auxiliar também prepara (`contas.mjs:1354`), então não dá para dizer quem fez. A tela não mostra "preparado por" nesses casos, em vez de atribuir errado.

### 1.2 Como o estudo atual aponta para a tabela

- `propositos.estudo_id` é o ponteiro. Na memória de `Contas` vira `p.estudoId`.
- `p.estudo` (o objeto antigo) **sai** da memória: `deLinhas` (`contas.mjs:309`) deixa de montá-lo e `paraLinhas` (`contas.mjs:220-221`) deixa de gravar `estudo_tipo`, `estudo_ref`, `estudo_texto` e `estudo_em`.
  - As quatro colunas continuam no esquema (não se apaga coluna) e ficam vazias na primeira gravação de cada linha.
  - **Obrigatório:** `paraLinhas` grava `estudo_id: p.estudoId || ''`. O `sincronizar` (`db.mjs:355-388`) faz `INSERT OR REPLACE` só com as colunas da linha em memória; sem `estudo_id` na linha, a primeira gravação zeraria o ponteiro de todas as células.
- `estudoAcolhida`, `estudoAdoracao` e `estudoTestemunho` continuam em `propositos` (`contas.mjs:222`). Não vão para `celula_estudos`: costumam trazer nomes de pessoas e não devem entrar no histórico.
- A tabela nova é lida e gravada direto, fora de `this.dados`, como o check-in (`contas.mjs:640-679`): `this.db.prepare(...)`. O retrato da célula busca o estudo atual por chave primária.
- **JSON legado** (`ferramentas/json-legado-sintetico.mjs:215` e `:225`, importado por `teste-banco.mjs`): uma conta antiga importada do `contas.json` traz `p.estudo`. Na carga, um passo `migrarEstudoLegado(p)` faz o mesmo que o SQL da v19 (linha `'l' + id`, `p.estudoId`) e apaga `p.estudo`.
- **Multiplicação** (`contas.mjs:1439-1460`): a filha nasce com `estudoId: ''`. A mãe continua com o dela.
- **Apagar a conta** (decisão 4): `Contas.apagar` (`contas.mjs:681`) e `apagarPessoaDoBanco` (`db.mjs:412-463`) **não** apagam `celula_estudos`. Fica um comentário no lugar explicando por quê, ao lado do de `celula_encontros`. Os modelos pessoais (Fase 3) ainda não existem.

### 1.3 Tetos (`estudos.mjs`, módulo novo do servidor)

| Constante | Valor | Por quê |
|---|---|---|
| `ESTUDO_MAX` | 10.000 caracteres na fonte limpa | Substitui o 3.000 de `contas.mjs:52`. O estudo do dono tem uns 2.900 sem as citações da NVI. Medido na fonte limpa, porque a citação trocada não fica guardada. |
| `TITULO_MAX` | 120 | Cabe na linha do histórico. |
| `TEXTO_BLOCO_MAX` | 1.500 por parte de texto | Um parágrafo longo, não um capítulo colado. |
| `BLOCOS_MAX` | 80 | O estudo do dono já tem 32 partes; o teto de 30 da proposta não cabia. |
| `CARTOES_MAX` | 15 versículos | O do dono tem 6. |
| `PARES_MAX` | 12 linhas por lista com seta | |
| `PERGUNTAS_MAX` / `PERGUNTA_MAX` | 6 / 300 caracteres | O mesmo teto dos 4 Ws (`CAMPO_4W_MAX`). |
| `TRADUCOES` | `['nbv', 'blivre']` | `teste.mjs` confere que bate com as siglas de `window.BIBLIAS`. |

O pedido de 64 KB (`servidor.mjs:56`) comporta 10.000 caracteres, as perguntas e os 4 Ws com folga.

### 1.4 Compatibilidade com os tipos já gravados

| Tipo | Origem | Como aparece |
|---|---|---|
| `livre` | legado (v19) | `fonte` é o texto antigo, desenhado em parágrafos, como hoje. Ao "Mudar o estudo", o texto vai para o campo novo e, salvo, vira `blocos`. |
| `semana` | legado e novo | Roteiro da leitura da semana. No legado, `plano_ate = 0` e o roteiro segue o líder (`semanaAte` de hoje, `servidor.mjs:803-805`). No novo, `plano_ate` fica congelado no dia em que salvou. `fonte` é a palavra opcional do líder. |
| `trecho` | legado e novo | Um cartão do trecho e as perguntas. Aceita agora sigla, dois pontos, travessão e capítulo inteiro. `fonte` é a palavra opcional. |
| `blocos` | novo | O estudo com marcas. Um cliente antigo que ainda mande `livre` é tratado como `blocos`, com `texto` no lugar de `fonte`. |

`perguntas` vazia em `semana` e `trecho` legados quer dizer "as perguntas de sempre": as das reflexões da semana e as do OIA, respectivamente (`08b:1376`, `08b:1345-1349`).

---

## 2. O texto-fonte e o leitor de marcas

### 2.1 Onde mora

- **`src/sob-demanda/estudo-marcas.js`**: função pura `CC.lerEstudo(texto, opcoes)`, sem DOM.
  - O build a junta à peça do preparo (seção 5).
  - O servidor a carrega no mesmo contexto das regras (`servidor.mjs:81-97`, depois de `01-nucleo.js`, `02-estado.js` e `02b-jogo.js`). Assim, o servidor relê a fonte e tira as citações por conta própria.
  - O `teste.mjs` a carrega no contexto de `teste.mjs:356-366`.
  - Toda letra especial no fonte do leitor (travessão, meia-risca, aspas curvas, seta, ®) vai escrita como escape (`\u2014`, `\u2013`, `\u201c`, `\u2192`, `\u00ae`). Assim, uma varredura simples por travessão nos textos do app não acusa o leitor.
- **`src/app/01-nucleo.js`**: a tabela dos 66 livros e o leitor de uma referência, porque o servidor, o leitor de marcas e o editor de notas (`04e:154-159`) usam os mesmos.
  - `CC.LIVROS`: a tabela de `06b-mapas.js:21-37` (nome, grupo, sigla) muda para cá. `06b` fica com `CC.LIVROS_MAPA = CC.LIVROS`, e `03-trilha.js:93-106` monta `ABREVIATURAS` a partir dela. Isso tira uma cópia de 1 KB do index.
  - `CC.lerRefLivre(texto, capitulos)` lê uma referência inteira e devolve `{ livro, cap, de, ate, inteiro }` ou `null`.
  - `CC.regexRef()` devolve uma expressão nova (com `g`) para achar referências no meio de um texto.

### 2.2 Referências aceitas

- **Livro:**
  - nome completo, com ou sem acento;
  - sigla da tabela (`Ef`, `Lc`, `1Pe`, `1 Pe`, `Jo`);
  - livro com número escrito colado ou separado (`1 Pedro`, `1Pedro`);
  - apelidos: `Salmo` → Salmos; `Cantares` e `Cântico dos Cânticos` → Cânticos.
- **Capítulo e versículos:**
  - `6:12`, `6.12` e `6,12`;
  - trecho com `-`, `–` ou `—`, com ou sem espaço (`24–26`, `24 - 26`);
  - capítulo inteiro (`Efésios 6`).
- **Contra falso positivo:**
  - no meio de um texto, o livro precisa começar com maiúscula;
  - a sigla só vale com capítulo **e** versículo ("Os 3 primeiros" não é Oseias 3);
  - o capítulo precisa existir. A lista `capitulos` sai do plano: para cada livro, o maior `ate` dos `trechos`. O cliente monta a lista com `CC.D.plano` e o servidor com `PLANO_DO_CONTEUDO`.
- **Não aceito na Fase 1:** trecho que atravessa capítulos (`Efésios 5.21-6.9`) e listas com vírgula (`João 3.16, 18`). Nos dois, só a primeira parte vira referência, e o resto fica como texto.
- **Saída normalizada:** `CC.escreverRef` (`01-nucleo.js:72`): "Efésios 6.12", "Lucas 11.24-26", e o capítulo inteiro como "Efésios 6".

### 2.3 Entrada e saída (interface fixa)

`CC.lerEstudo(texto, { capitulos, semCartao = [] })` recebe:

- `texto`: o campo inteiro;
- `capitulos`: `{ livro: número de capítulos }`;
- `semCartao`: as sugestões que o líder recusou (só no cliente).

Devolve:

```js
{
  titulo: 'Batalha espiritual, vigilância e Armadura de Deus',
  blocos: [ /* Bloco[], cada um com .l = [linhaInicial, linhaFinal] da fonte limpa (só na leitura) */ ],
  refs: ['Efésios 6.12', '1 Pedro 5.8', 'Efésios 6.13-17', 'Efésios 6.18', 'Efésios 6.10'],
  perguntas: [],            // vindas de uma seção "Perguntas" ou "Para conversar" do texto
  fonte: '...',             // o texto com cada citação trocada pela referência: é o que se grava
  trocas: [{ bloco: 1, ref: 'Efésios 6.12', de: 'NVI' }, { bloco: 11, ref: '1 Pedro 5.8', de: '' }, ...],
  sugestoes: [{ bloco: 6, ref: 'Lucas 11.24-26' }],
  avisos: [{ tipo: 'capitulo' | 'longo' | 'lista-longa' | 'perguntas-demais', bloco, ref, mostra }]
}
```

**Tipos de bloco (o que é gravado e o que o cliente desenha):**

| Bloco | Forma |
|---|---|
| Texto | `{ t: 'texto', texto }`. Aceita `*negrito*`; `**x**` vira `*x*`. |
| Tópico | `{ t: 'topico', n: 1, texto: 'Principados, potestades e dominadores' }` |
| Conclusão | `{ t: 'conclusao' }`. O rótulo é sempre "Conclusão". |
| Versículo | `{ t: 'versiculo', ref: 'Efésios 6.1-10', escrito: 'Efésios 6' }`. `ref` tem até 10 versículos; `escrito` só aparece quando o líder escreveu outra coisa (capítulo inteiro ou trecho longo). |
| Lista com seta | `{ t: 'seta', itens: [['Jejum', 'consagração.'], ...], destaque: true }` |
| Frase de alguém | `{ t: 'citacao', texto, autor }` |
| Para guardar | `{ t: 'guardar', texto }` |

O servidor tira `.l` antes de gravar; o resto vai como veio.

### 2.4 Regras, linha a linha

Cada linha não vazia vira uma parte: o Word cola um parágrafo por linha, e o mock mostra um parágrafo por linha. Linhas em branco só separam.

**Antes das regras, a linha é limpa:**

- `\r\n` vira `\n`, e o espaço inseparável vira espaço;
- saem os caracteres invisíveis;
- sai a marca de lista do começo (`•`, `▪`, `` do Word);
- sai o "n " ou "nn " que o PDF deixa antes de uma referência, de "Conclusão" ou de "Estudo:" (`texto.txt:3`, `:4`, `:23`).

**Depois, a primeira regra que servir decide o que a linha é:**

1. **Título:** a primeira linha não vazia.
   - Sai "Estudo:" ou "Tema:" do começo (com ou sem asteriscos).
   - Se a primeira linha já é tópico, versículo ou outra marca, o estudo fica sem título, e a validação pede um.
2. **Tópico:** `1.` ou `1)` no começo, com até 140 caracteres.
3. **Conclusão:** "Conclusão" ou "Para concluir" sozinho, com ou sem dois pontos e asteriscos.
   - O que vier depois dos dois pontos, na mesma linha, vira um texto logo abaixo.
4. **Perguntas:** a linha "Perguntas", "Para conversar" ou "Perguntas para conversar" abre uma seção.
   - As linhas seguintes, até a próxima marca ou o fim, vão para `perguntas`, sem o número ou o marcador do começo.
   - Não viram blocos.
   - Da sétima em diante, cada uma entra num aviso `perguntas-demais`.
5. **Para guardar:** "Para guardar:" no começo (com ou sem asteriscos) vira `guardar` com o resto da linha.
   - Sem a marca não há frase para guardar: o líder põe a marca pela barra (mock, quadro 5).
6. **Frase de alguém:** `>` no começo.
   - Se o autor (depois de `—`, `–` ou `-`) é uma referência, a linha vira **versículo**, com troca.
   - Senão, vira `citacao`, com o texto sem as aspas de fora e o autor.
7. **Lista com seta:** a linha tem `→`, `->`, `=>` ou `®` (o que o PDF põe no lugar da seta).
   - Item é o que vem antes da seta; significado, o que vem depois.
   - Linhas seguidas formam uma lista só.
   - `destaque` vale quando **todas** as linhas estão em negrito (`*Jejum → consagração.*`), como no resumo colado do Word.
   - Linha com duas setas ou mais (cópia do PDF, `texto.txt:21` e `:24`):
     - ela é cortada na pontuação seguida de maiúscula que fica entre um significado e o item seguinte;
     - no último significado, uma pontuação **grudada** numa maiúscula ("a Palavra de Deus.E Paulo acrescenta…") corta de novo, e o resto vira um texto depois da lista;
     - se não der para cortar, a linha inteira é um par só.
   - Uma 13ª linha seguida abre outra lista e gera o aviso `lista-longa`.
8. **Versículo:** a linha, já sem marca e sem negrito, é uma destas:
   1. **Começa por uma referência.** Depois dela pode vir:
      - nada;
      - dois pontos, travessão ou meia-risca e uma citação entre aspas (`“…”` ou `"…"`), com ou sem `(SIGLA)` no fim;
      - uma citação colada (`Efésios 6:18 “Orem…”`);
      - um resto curto, sem aspas, de até 40 caracteres (`Efésios 6:13–17 apresenta:`).

      Com citação: o cartão entra **no lugar** da linha, e conta uma troca.

      Com resto curto: o cartão entra **antes** da linha, e a linha fica como texto (é assim no mock: cartão de Efésios 6.13-17, depois "Efésios 6:13–17 apresenta:", depois a lista).
   2. **Citação entre aspas seguida da referência**, com ou sem parênteses (`“Fortaleça-se…” (Efésios 6:10)`): troca.
   3. **Só a referência entre parênteses:** cartão, sem troca.

   Em qualquer forma, com citação ou sem:
   - `(NVI)`, `(ARA)`, `(ACF)` e outras siglas de tradução vão para `trocas[].de`;
   - sem sigla, `de` fica `''`;
   - a referência escrita sozinha numa linha, com livro em minúscula, também vale;
   - no meio de um texto, só com maiúscula.
9. **Texto:** todo o resto.
   - Cada referência **com versículo** no meio de um texto, que ainda não é cartão em parte nenhuma do estudo e não está em `semCartao`, vira `sugestoes`.
   - Capítulo inteiro no meio do texto ("de Efésios 6 não é…") não vira sugestão.

**Cartão de capítulo inteiro ou de trecho longo:**

- mostra os 10 primeiros versículos (`CC.MAX_TRECHO`);
- guarda `escrito`;
- gera o aviso `capitulo` ou `longo`, com `mostra`.

A prévia diz: "Mostramos os 10 primeiros versículos de Efésios 6. Para o capítulo inteiro, use Abrir na Bíblia, ou divida em dois cartões."

**A fonte limpa** troca cada linha com citação pela referência normalizada sozinha. Por exemplo, `Efésios 6:12 — “A nossa luta…” (NVI)` vira `Efésios 6.12`, e `> “Estejam alertas e vigiem.” — 1 Pedro 5:8` vira `1 Pedro 5.8`. Ler a fonte limpa de novo dá os mesmos blocos e nenhuma troca: é isso que deixa o servidor confiar só na fonte.

### 2.5 Casos de teste (`teste.mjs`, seção nova "leitor de marcas do estudo")

O texto do dono vai para o repositório como `ferramentas/estudo-exemplo.txt`, igual a `mesa-mock/_fonte/estudo-colado.txt` (42 linhas). É o texto como o dono o escreveu, com as citações da NVI, e serve só aos testes. `teste.mjs` lê o arquivo e acrescenta "Para guardar: " na última linha, como o líder faria pela barra.

**A. O estudo do dono** (texto colado e marca na última linha):

1. O título é "Batalha espiritual, vigilância e Armadura de Deus", sem "Estudo:".
2. São 5 tópicos com `n` de 1 a 5, os textos do mock e uma `conclusao`.
3. Os blocos vêm nesta ordem de tipos: texto, versículo (Ef 6.12), tópico 1, texto, texto, tópico 2, texto, texto, texto, tópico 3, texto, versículo (1Pe 5.8), texto, texto, tópico 4, texto, versículo (Ef 6.13-17), texto ("Efésios 6:13–17 apresenta:"), seta (6 pares), texto, versículo (Ef 6.18), tópico 5, texto ×4, seta (6 pares), conclusão, texto, versículo (Ef 6.10), texto, guardar.
4. `refs` = Ef 6.12, 1Pe 5.8, Ef 6.13-17, Ef 6.18 e Ef 6.10.
5. Há 4 trocas, e só a de Ef 6.12 tem `de: 'NVI'`. O quinto cartão (Ef 6.13-17) é "só a referência".
6. A única sugestão é Lucas 11.24-26, no bloco do segundo parágrafo do Tópico 2. Ef 6.12, citado no Tópico 1, não vira sugestão, porque já é cartão. "Efésios 6", na conclusão, também não.
7. A lista da armadura tem `destaque: false`. O resumo do Tópico 5 colado sem asteriscos também; com os asteriscos que o Word manda, `destaque: true`.
8. `guardar` traz "Não basta limpar a casa. É preciso permitir que Deus habite nela."
9. A fonte limpa não contém "A nossa luta", "Estejam alertas e vigiem.”", "Orem no Espírito" nem "Fortaleça-se". Ela tem uns 2.900 caracteres (menos de 3.000).
10. Ler a fonte limpa de novo dá os mesmos blocos e `trocas: []`.
11. Com `semCartao: ['Lucas 11.24-26']`, a sugestão some.
12. Com uma linha "Lucas 11.24-26" logo depois do parágrafo (o que "Mostrar o cartão" faz), os cartões passam a 6, e a ordem de `refs` põe Lucas em segundo.

**B. O texto copiado do PDF** (`estudo-pdf/texto.txt`, sem os rótulos `[F1 …]`, usado só no teste):

13. Os prefixos "nn Estudo:", "n Efésios 6:12" e "n Conclusão" são entendidos.
14. A linha com seis "®" do resumo vira uma lista de 6 pares.
15. A linha da armadura vira 6 pares, e "E Paulo acrescenta algo fundamental:" vira um texto depois da lista.

**C. Referências** (`CC.lerRefLivre` e a forma no começo da linha):

16. "Efésios 6:12", "Ef 6.12", "Ef 6:12", "efésios 6,12" (sozinha na linha) e "Efésios 6.12" dão todas "Efésios 6.12".
17. "Lucas 11:24–26", "Lc 11.24-26" e "Lucas 11.24 - 26" dão "Lucas 11.24-26".
18. "1 Pedro 5:8", "1Pe 5.8", "1 Pe 5.8" e "1Pedro 5.8" dão "1 Pedro 5.8".
19. "Efésios 6" vira o cartão "Efésios 6.1-10", com `escrito: 'Efésios 6'` e o aviso `capitulo`.
20. "Ef 6.10-20" vira o cartão "Efésios 6.10-19", com o aviso `longo`.
21. "Salmo 23.1" dá Salmos 23.1, e "Cantares 2.4" dá Cânticos 2.4.
22. Estes não são referência:
    - "Os 3 primeiros dias" (sigla sem versículo);
    - "os números 3 e 4" (minúscula no meio do texto);
    - "Efésios 99.1" (o capítulo não existe);
    - "João 3.18-16" (trecho de trás para frente).
23. "Efésios 5.21-6.9" vira o cartão Efésios 5.21, e o resto fica como texto.

**D. As outras marcas:**

24. `> Quem não vigia, cai. — Spurgeon` vira `citacao` com o autor "Spurgeon".
25. `-> ` e `=> ` também fazem lista com seta.
26. "Perguntas:" seguida de "1. …" e "2. …" põe as duas em `perguntas`. Com 8 perguntas, ficam 6 e um aviso.
27. "Conclusão: Deus é fiel." vira a conclusão e um texto "Deus é fiel."
28. "**Para guardar:** Fiquem firmes." vira `guardar` com "Fiquem firmes.", e `**negrito**` no texto vira `*negrito*`.
29. Texto vazio ou só com espaços dá `titulo: ''` e `blocos: []`.

---

## 3. Telas e fluxo (seguindo o mock aprovado)

Os textos, as classes (`mesa-*`) e a estrutura de cada tela saem de `mesa-mock/_fonte/gerar.mjs` (é a fonte de verdade das frases) e de `mesa.css`. O CSS do mock é de demonstração: os andaimes (teclado falso, cursor desenhado, `.mesa-campo-texto`, que no app vira um `<textarea>` de verdade) não vêm para o app.

### 3.1 Quem vê o quê

O retrato ganha `euPreparoEstudo`, calculado no servidor: `p.criadoPor === eu` e sem aprovação pendente de líder. A tela decide por ele, **nunca** por `euConduzo`. Isso troca `08b:294`, `:296`, `:298`, `:309` e `:1407`.

| Quem | Preparar, Mudar e Tirar | Aba Estudo | Modo encontro, último passo | Aba Painel |
|---|---|---|---|---|
| Líder | sim | com o cartão "Você preparou este estudo" | Registrar quem veio | sim |
| Auxiliar | não (403 no servidor) | como membro | Registrar quem veio | sim |
| Membro | não | sim | "O estudo fica na aba Estudo para você reler durante a semana." | não |
| Visitante | não | sim (o aviso no passo 3 diz isso ao líder) | igual ao membro, e Orar juntos sem falar da aba Oração (que ele não tem) | não |

### 3.2 Preparar: tela própria em 3 passos

- **Rota:** `#/novidades/celula/<id>/preparar`.
  - `CC.vistaCelula` reconhece `preparar` como a "aba" pedida.
  - Sem `euPreparoEstudo`, troca o endereço para `…/estudo`.
  - O roteador põe a classe `sem-barra` no `<body>` enquanto a rota termina em `/preparar` (`rotear`, `10-roteador.js:480`). Uma regra em `01-base.css` esconde a barra de abas.
  - A cabeça é a do mock (`cabecaPasso`): voltar, título, as três barrinhas e "Passo N de 3 · nome".
- **Rascunho no aparelho:**
  - Chave `cc.rascunho.estudo.<idDaCelula>`, gravada a cada mudança, sempre dentro de try/catch.
  - Guarda `{ v: 1, base, tipo, passo, fonte, ref, traducao, perguntas: [{ texto, de, marcada }], recusadas, ws: { acolhida, adoracao, testemunho }, em }`.
  - Ao abrir, um rascunho com `base` igual ao estudo atual (ou vazio, sem estudo) continua de onde parou. Um rascunho de outro estudo é descartado (o estudo mudou em outro aparelho).
  - O rascunho se apaga ao salvar, ao tirar o estudo e ao sair da conta, junto com o estado local (`02-estado.js:806`).
- **Confirmação ao sair:** o voltar do topo e "Cancelar" chamam `CC.confirmar({ titulo: 'Sair do preparo?', texto: 'O rascunho fica guardado neste celular. Quando voltar, você continua de onde parou.', acao: 'Continuar preparando', cancelar: 'Sair' })`. Responder `false` sai para `…/estudo`. O voltar do sistema (troca de endereço) sai sem perguntar e não perde nada, porque o rascunho já está gravado.

**Passo 1, O estudo** (mock, quadros 3 a 6):

- **O jeito de estudar:** um seletor "Leitura da semana / Um trecho / Eu escrevo", como hoje.
- **Leitura da semana:** a frase de hoje (`08b:1558-1559`) e a palavra opcional do líder.
- **Um trecho:**
  - Livro, Capítulo e Versículos, como hoje (`08b:1560-1564`).
  - O campo de versículos aceita "16-18", "16–18" e vazio (capítulo inteiro).
  - Abaixo, a palavra opcional.
- **Eu escrevo:**
  - Duas opções: "Colar um estudo pronto" e "Escrever aqui".
  - Depois de colar, as opções recolhem na linha "Estudo colado · Trocar".
  - O campo é um `<textarea>` comum, com a legenda do mock (`legendaCampo`) e o botão "Ver as partes".
- **Colar do Word:** no `paste`, se houver `text/html`, o texto é montado com `DOMParser`, sem executar nada.
  - Bloco (`p`, `div`, `li`, `br`, `h1` a `h6`, `tr`) vira quebra de linha.
  - Negrito (`b`, `strong`, `font-weight` de 600 ou mais) vira `*…*`, sem espaço dentro dos asteriscos.
  - O resto vira texto.
  - O resultado entra no cursor com `setRangeText`. Colagem só de texto segue o normal.
- **Barra de marcas** (quadro 5):
  - Só aparece com o campo em foco e fica presa logo acima do teclado. Ela acompanha `visualViewport`, como `CC.folha` (`01-nucleo.js:550-557`).
  - Tem 4 botões de 44 px em 2 linhas, cada um escrevendo o sinal no texto:
    - "1. Tópico" escreve "N. " no começo da linha, com o próximo número;
    - "Seta" escreve " → " onde está o cursor;
    - "> Frase de alguém" escreve "> " no começo da linha;
    - "Para guardar" escreve "Para guardar: " no começo da linha.
  - O texto de ajuda é "Toque numa linha do texto e escolha o que ela é."
  - A barra é `role="toolbar"`, e cada botão tem um nome que diz o que escreve.
- **Perto do teto:** sem contador. A partir de 9.000 caracteres aparece "Faltam N caracteres para o limite do estudo".
- **Tirar o estudo:** só quando já existe um estudo. É o botão plano vermelho "Tirar o estudo", com o `CC.confirmar` de hoje (`08b:1619-1622`).

**Passo 2, Confira as partes** (quadro 7 e escuro):

- **Para blocos:** roda `CC.lerEstudo(fonte, { capitulos, semCartao: recusadas })` a cada mudança.
  - **Aviso de troca:** quando há trocas, "Trocamos o texto citado pelo da Bíblia do app", com a contagem. "Ver a primeira troca" rola até o primeiro cartão trocado.
  - **Tradução do estudo:** o seletor NBV / Bíblia Livre e as duas frases do mock.
    - Ao trocar, todos os cartões da prévia são pintados de novo na tradução escolhida.
    - O número de cartões na frase ("os 6 cartões") é o de verdade.
  - **"O app encontrou":** a contagem de cada tipo de parte.
  - **As partes:** Título, Introdução, Tópico N, Conclusão e Para guardar, cada uma com "Mudar".
    - "Mudar" abre uma folha com as linhas da fonte daquela parte (`l` dos blocos). Ao terminar, troca essas linhas na fonte e lê tudo de novo.
  - **Linha de origem** embaixo de cada cartão (`mesa-origem`):
    - "No seu texto: citação da NVI. Agora na NBV." (com a sigla de `de`);
    - "No seu texto: citação de outra tradução. Agora na NBV.";
    - "No seu texto: só a referência. Agora com o texto da NBV."
  - **Sugestão** (`mesa-sugestao`): contorno tracejado, "Sugestão do app", o cartão e os botões "Mostrar o cartão" e "Não mostrar", nenhum já escolhido.
    - "Mostrar o cartão" põe a linha da referência logo depois do parágrafo na fonte.
    - "Não mostrar" põe a referência em `recusadas`.
    - Sugestão sem resposta não vira cartão.
  - **Avisos** de capítulo inteiro e de trecho longo, embaixo do cartão.
  - **Cartão sem texto na Bíblia do app** (um versículo que não existe): o aviso "Não achamos Efésios 6.99 na Bíblia do app. Confira a referência.", e "Continuar" fica desligado enquanto houver um assim.
  - **Validação local**, com as mesmas mensagens do servidor (seção 5.3): título, tetos.
- **Semana e trecho:** o passo mostra o roteiro montado (os dias, ou o cartão do trecho) e o seletor de tradução (só no trecho, que tem cartão).
- **Botões:** "Continuar" e "Voltar ao texto".

**Passo 3, Para conversar** (quadro 8):

- **Os grupos de perguntas** saem de `CC.estudoRegras.gruposDePerguntas` (seção 5.4):
  1. "Do seu texto": as perguntas da seção "Perguntas" do estudo, já marcadas.
  2. "Da reflexão do dia N" (até 2 grupos): a reflexão escrita (`CC.reflexaoEscrita`) cuja `ref` cruza algum cartão. Mesmo livro e capítulo, com versículos que se cruzam; capítulo inteiro cruza tudo.
     - No estudo do dono, só a do dia 244 (Ef 6.10-11) cruza (com Ef 6.10). A do dia 77 é Lucas 11.1 e a do 318 é 1 Pedro 5.7, que não cruzam. Por isso o mock mostra um grupo só.
     - Se nenhuma cruza, entra a do dia do capítulo com mais cartões.
  3. "Da parábola …" (no máximo 1): quando um cartão cruza a `ref` de um item de `window.PARABOLAS.itens`.
     - As perguntas vêm do arquivo da parábola (`item.arquivo`), pedido na hora. Sem rede, o grupo não aparece.
  4. "Do método OIA": as 3 de `PERGUNTAS_OIA`.
  5. Na semana: a primeira pergunta dos dias 1, 3, 5 e 7 (`08b:1376`).
- **Marcadas de saída:** a primeira do primeiro grupo de reflexão, a de aplicação do OIA e todas as "do seu texto".
- **Teto:** até 6 marcadas. A sétima não marca e avisa "Escolha até 6 perguntas."
- **Cada pergunta** é uma caixa de marcar com rótulo e o botão "Mudar" ao lado, fora do rótulo. "Mudar" abre a edição no lugar, com "Pronto" e "Desfazer".
- **"Escreva a sua pergunta" e "Pôr na lista":** a pergunta nova entra marcada.
- **"2 perguntas escolhidas · até 6".**
- **O cartão "Acolhida, adoração e testemunho"**, com "Mudar": três campos de até 300 caracteres, com as sugestões já corrigidas.
- **O aviso** "Ao salvar, todos da célula veem o estudo na aba Estudo, inclusive quem está só conhecendo."
- **Botões:** "Salvar o estudo" e "Voltar às partes".
- **Ao salvar:**
  - manda o pedido da seção 5.3;
  - apaga o rascunho;
  - recarrega os propósitos;
  - troca o endereço para `…/estudo`;
  - avisa "Estudo salvo. Ele fica guardado na célula."

### 3.3 A aba Estudo (líder e membro)

Mock, quadros 9 e 10. Ordem:

1. **A linha do encontro:** "Para o encontro de quinta, 22/10 · preparado por Marcos" (ou "por você").
   - A data é a de `cartaoProximoEncontro` (`08b:1073-1090`), que vira `proximoEncontro(p)` e passa a devolver também a data ISO.
   - Sem dia marcado, a primeira parte não aparece.
   - Sem `criadoPor` (legado), não aparece "preparado por".
2. **Só o líder:** o cartão `mesa-lider` com "Você preparou este estudo", "Só o líder pode mudar o estudo." e "Mudar o estudo", que abre `…/preparar` com a fonte atual.
   - Se o estudo é legado, o título do cartão é "O estudo desta célula".
3. **"No plano"** (`mesa-plano`), em `blocos` e `trecho`:
   - Até 2 linhas, uma por capítulo citado: primeiro os capítulos com mais cartões e, no empate, a ordem em que aparecem.
   - Cada linha mostra "Efésios 6 é o dia 244", "Salmos 141-143 e Efésios 6", e leva a `#/dia/244`.
   - Embaixo, **só no aparelho da pessoa e só se ela leu:** "Você leu em 01/09 · só você vê".
     - A data sai de `marcadoEm`, pelo `CC.lidoEm(n)` novo em `02-estado.js`.
     - Nada disso vai ao servidor, e não há contagem de ninguém.
   - No estudo do dono, com o cartão de Lucas: dias 244 e 77. Sem ele: 244 e 318.
4. **Acolhida, Adoração, Palavra, Para conversar e Testemunho** (`secao-w`).
   - Na Palavra vão o título (`mesa-t1`) e os blocos desenhados: tópico com o número no círculo, lista com seta e ícone, Para guardar em sálvia pálido (no escuro, `--salvia-palido` com contorno sálvia), frase de alguém e cartões.
   - Para conversar é uma lista numerada.
   - A seção "Para conversar" só aparece com perguntas.
5. **Os botões** "Mandar no grupo" e "Modo encontro".

**Cartões de versículo na aba:**

- O texto é o da tradução do estudo, com o rótulo dela no `figcaption`.
- A barra de ações não aparece de saída. Cada cartão tem os três pontos (`mesa-mais`, `aria-label="Ações de Efésios 6.12"`, `aria-expanded`).
- Tocar nos três pontos abre, logo abaixo daquele cartão, a barra de sempre (`CC.versiculos.acoesDoCartao` e `ligarCartao`), com marcar, nota, Juntos, copiar e story. Um cartão aberto por vez.
- **Todos** os cartões ficam ligados: é a correção de `04-licao.js:679-682` (seção 4).

**Legado:**

- `livre` sai em parágrafos.
- `semana` e `trecho` usam o roteiro de hoje (`08b:1503-1517`), com o "Leiam juntos" e as perguntas guardadas (ou as de sempre, se a lista está vazia).

**O que não aparece na aba:** nenhuma contagem de leitura, como "N de M", nem quem leu.

### 3.4 Mandar no grupo (o estudo completo)

A folha do mock (quadro 11), **sem** o seletor de versão:

- o título "Mandar no grupo";
- "Assim o estudo chega no WhatsApp. O texto se entende sozinho, mesmo para quem não tem o app.";
- a prévia (`mesa-zap`), com os asteriscos esmaecidos;
- "No WhatsApp, o que fica entre asteriscos aparece em negrito.";
- os botões "Mandar" (`CC.compartilhar(texto, '')`), "Copiar o texto" (`CC.copiar`) e "Fechar".

O texto sai de `CC.estudoRegras.textoParaGrupo` e é **exatamente** o de `mesa-mock/_fonte/texto-zap-inteiro.txt`, com duas diferenças: o endereço é `location.origin` e o texto de Ef 6.12 vem da Bíblia. Regras:

- **O começo:**
  - `*Título*`;
  - "Para o encontro de quinta, 22/10" (só com data);
  - uma linha em branco.
- **O primeiro cartão do estudo:**
  - `*Leiam juntos:* Efésios 6.12 (NBV)`, com a abreviatura da tradução do estudo;
  - na linha seguinte, o texto entre “ ”, que vem da Bíblia na hora;
  - sem rede, só a primeira linha.
- **Os outros cartões:**
  - `Leiam: 1 Pedro 5.8`;
  - a linha some quando o texto logo antes ou logo depois do cartão já traz **a mesma** referência (Lucas 11.24-26 e Efésios 6.13-17 no estudo do dono);
  - capítulo citado não conta como a mesma referência (Efésios 6 na conclusão não tira o "Leiam: Efésios 6.10").
- **Cada tipo de bloco:**

  | Bloco | Sai assim |
  |---|---|
  | Tópico | `*1. Principados…*` |
  | Conclusão | `*Conclusão*` |
  | Lista com seta | `Item → significado` |
  | Lista com destaque | `*Item → significado*` |
  | Frase de alguém | `> “texto” (autor)` |
  | Para guardar | `*Para guardar:* frase` |

- **Linhas em branco:**
  - uma linha em branco entre os blocos;
  - nenhuma depois do título de um tópico ou da conclusão;
  - nenhuma entre um texto que termina em ":" e a lista com seta ou o "Leiam:" logo depois;
  - o "Leiam juntos" tem sempre linha em branco antes e depois.
- **O fim:**
  - `*Para conversar*` e as perguntas numeradas;
  - uma linha em branco;
  - "Para ler cada versículo, abram a Bíblia nas referências acima.";
  - "Conheça o app: <endereço>".
- **O que não entra:** Acolhida, Adoração e Testemunho, como no mock.
- **No legado** (semana, trecho, livre): o mesmo formato, a partir de `comoBlocos` (seção 5.4).

### 3.5 Modo encontro passo a passo

`CC.estudoRegras.passos(estudo, contexto)` devolve a lista. A tela é `CC.telaCheia` com `fecharAoNavegar: true` (seção 4).

| # | Etiqueta | O que mostra |
|---|---|---|
| 1 | Acolhida | A pergunta (a do líder ou a sugestão da semana) em `frase-cena`. |
| 2 | Adoração | O texto. |
| 3 | Abertura | O título (`mesa-titulo-cena`) e "Abrir Efésios 6 na Bíblia", logo abaixo, levando ao capítulo do primeiro cartão do estudo. Depois, os blocos antes do primeiro tópico. |
| 4… | Tópico N | O título do tópico e os blocos até o próximo tópico ou a conclusão, **sem** o "Para guardar". Se o tópico tem mais de um cartão, cada cartão a partir do segundo abre uma parte nova ("Tópico 4, parte 1 de 2"), e o texto logo antes dele vai junto quando termina em ":". |
| … | Conclusão | Os blocos da conclusão, sem o "Para guardar". |
| … | Para conversar, k de n | Uma pergunta por passo, em letra grande. Sem pergunta, não há passo. |
| … | Orar juntos | "Orem uns pelos outros, a partir do que conversaram." e o convite `mesa-convite`: "Os pedidos de oração ficam na aba Oração da célula, no celular de cada um. Eles não aparecem nesta tela." **Sem versículo.** O visitante vê só a primeira frase. |
| … | Testemunho | O texto. |
| último | Fechar o encontro | A última frase "Para guardar", se houver. Quem conduz (líder e auxiliar) vê `mesa-registrar`: "Quem veio hoje?", o texto e "Registrar quem veio", que fecha a tela cheia e abre `folhaRegistrarEncontro(p)` (`08b:1243`). Os outros veem "O estudo fica na aba Estudo para você reler durante a semana." O botão "Próximo" vira "Concluir", e "Sair do modo encontro" some. |

- **Estudo sem tópicos:** o corpo se divide pelos cartões, com a mesma regra, em "A Palavra, k de n". Sem cartões, é um passo "A Palavra".
- **Estudo do dono** (com o cartão de Lucas e 2 perguntas): são **15 passos**, com as etiquetas do mock.
- **Legado:**
  - semana: "A Palavra" traz o "Leiam juntos" e a lista dos dias;
  - trecho: o cartão;
  - livre: os parágrafos, divididos pelos cartões;
  - depois vêm Para conversar, Orar juntos, Testemunho e Fechar o encontro.
- **Detalhes de tela, como no mock:**
  - o degradê acima da barra quando o texto continua (`mesa-pe::before`);
  - "3 de 15" no meio da barra;
  - os cartões ligados em cada passo.
- **Retomar:** reabrir o modo encontro do mesmo estudo na mesma sessão volta ao passo em que estava. A variável fica em memória, sem gravar nada.

---

## 4. Correções que entram junto

| Defeito | Onde está | Correção |
|---|---|---|
| A Palavra repete o estudo inteiro no modo encontro | `08b:1448` e `:1455`: o passo "Palavra" recebe o `html` inteiro de `montarEstudo`, com Acolhida, Adoração e Testemunho | Os passos saem de `passos()`, e nenhum passo da Palavra leva os 4 Ws. |
| "Abrir na Bíblia" não sai da tela cheia | `10-roteador.js:712` e `:719-720`: a tela cheia só fecha com Esc | Em `01c-arte.js:466-485`, `CC.telaCheia` ganha a opção `fecharAoNavegar`, que fecha no primeiro `hashchange` e tira o ouvinte. O modo encontro a usa. O botão de voltar do celular também fecha o modo encontro. |
| "Encontro hoje · veja o estudo" sem estudo | `08b:100` (cartão) e `08b:221` (aba Hoje) | O selo só aparece com `p.estudo`. Sem estudo, no dia do encontro, quem prepara vê "Encontro hoje · preparar o estudo", que leva a `…/preparar`. Os outros não veem selo. |
| "preparado por" mostra sempre o líder | `08b:802` e `:1528` (`nomeDoLider`) | Vem de `estudo.criadoPor` e `estudo.criadoPorNome`, que o servidor resolve com o nome de exibição; se a conta não existe mais, vem o @. Fica "você" quando é a própria pessoa e nada no legado. |
| `CC.ligarCartaoVersiculo` liga só o primeiro cartão | `04-licao.js:679-682` e `04e:479-480` (`querySelector`) | `CC.cartaoVersiculo` passa a escrever `data-ref` na `<figure>`. `CC.ligarCartaoVersiculo(raiz, ref, opcoes)` liga **cada** `.cartao-versiculo` de `raiz` com a referência e o texto dele (o `ref` passado vale só para um cartão sem `data-ref`), e `ligarCartao` (`04e`) procura a barra dentro da própria figura. Quem chama hoje, com um cartão só, continua igual. |
| `CC.confirmar` sem nome para o 2º botão | `01-nucleo.js:466-483` | Opção nova `cancelar`, o texto do segundo botão (o padrão é "Cancelar"). Com texto próprio, o botão vira `botao contorno`, como no quadro "Sair do preparo?" do mock; o "Cancelar" padrão continua `botao plano`. |

Junto vão as duas mudanças de texto da seção 0 e, nos cartões:

- `CC.textoDoVersiculo(ref, sigla)` (`04b-leitor.js:71`) aceita a tradução do estudo; sem `sigla`, vale a da pessoa, como hoje;
- `CC.cartaoVersiculo(ref, texto, { sigla })` mostra a abreviatura dessa tradução (`04-licao.js:671-674`).

---

## 5. Onde fica cada código, API e privacidade

### 5.1 O que fica no index e o que vai para peças sob demanda

A folga do `dist/index.html` hoje é de **67.471 B** (981.105 B medidos). O piso é **61.440 B** (60 KB). Por isso, o estudo inteiro sai do index para duas peças, no padrão de `docs/aprendizados.md` ("Folga do index.html", 2026-10-11).

**No index (`src/app`) fica só a casca:**

- **`08b-propositos.js`:**
  - `preencherEstudo` vira casca: esqueleto, depois `CC.pedirPeca(window.ESTUDO_CELULA, () => !!CC.estudoCelula)`, depois `CC.estudoCelula.aba(painel, p, apoio)`; se falhar, `CC.estadoSemPeca`.
  - `CC.modoEncontro(p)` também vira casca.
  - `CC.estudoDoEncontro(p)` passa a só abrir `…/estudo`. Hoje é uma folha que repete a aba (`08b:1405-1435`) e só é chamada pelo botão `data-roteiro`, em `08b:634`.
  - A rota `…/preparar` pede as duas peças.
  - O selo "Encontro hoje" e `euPreparoEstudo`.
  - `CC.apoioCelula = { registrarEncontro, recarregar, endereco, proximoEncontro, leituraDaSemana }`, para as peças.
  - **Saem do index:** `folhaPrepararEstudo` (5,1 KB enxuto), `montarEstudo` (2,9 KB), `CC.modoEncontro` (2,0 KB), `CC.estudoDoEncontro` (1,6 KB), `estudoEmTexto` (1,2 KB) e `semanaDoEstudo` com as constantes do roteiro (1,7 KB). Somam uns 14,5 KB.
- **`01-nucleo.js`:** `CC.LIVROS`, `CC.lerRefLivre`, `CC.regexRef` e a opção `cancelar` de `CC.confirmar`.
- **`06b-mapas.js` e `03-trilha.js`:** a tabela dos livros vem de `CC.LIVROS`, o que dá 1 KB a menos.
- **`01c-arte.js`:** `fecharAoNavegar`.
- **`02-estado.js`:** `CC.lidoEm(n)`.
- **`04-licao.js`, `04b-leitor.js` e `04e-versiculos.js`:** as correções dos cartões e da tradução. `lerRefDigitada` passa a usar `CC.lerRefLivre` e continua exigindo versículo, porque a nota precisa dele.
- **`10-roteador.js`:** a classe `sem-barra`.
- **`estilo-v2/01-base.css`:** a regra da `sem-barra`.

O resto do CSS do estudo vai nas peças.

**Peça `estudo-celula`** (`window.ESTUDO_CELULA`): `src/sob-demanda/estudo-regras.js` + `estudo-celula.js` + `estudo-celula.css`.

- `estudo-regras.js` é puro, sem DOM ao carregar, e o `teste.mjs` o roda no vm. Leva:
  - as constantes que saem de `08b`: OIA, as perguntas de acolhida corrigidas e as sugestões de adoração e testemunho corrigidas;
  - `semana()`, `comoBlocos()`, `passos()`, `textoParaGrupo()`, `noPlano()`, `gruposDePerguntas()`, `cruza()` e `blocoEmHtml()`.
- `estudo-celula.js` leva a aba, o modo encontro e a folha "Mandar no grupo".
- `estudo-celula.css` leva o CSS de leitura e do encontro do mock: `mesa-estudo`, `mesa-t1`, `mesa-t2`, `mesa-seta`, `mesa-guardar`, `mesa-lider`, `mesa-plano`, `mesa-dia`, `mesa-mais`, `mesa-zap`, `mesa-topo`, `mesa-corpo-encontro`, `mesa-convite`, `mesa-registrar` e `mesa-pe`.
- O estilo entra uma vez só, por `style[data-estudo-celula]`, como em `mapa-tela.js:10-16`.

**Peça `estudo-preparo`** (`window.ESTUDO_PREPARO`): `src/sob-demanda/estudo-marcas.js` + `estudo-preparo.js` + `estudo-preparo.css`.

- Depende da `estudo-celula`, porque a prévia desenha as partes com `blocoEmHtml`. A casca pede as duas.
- Leva o editor, a barra de marcas, o colar do Word, o rascunho, a prévia, as sugestões, as perguntas e o CSS do preparo (`mesa-passos`, `mesa-opcao`, `mesa-escolhido`, `mesa-legenda`, `mesa-barra-marcas`, `mesa-marca`, `mesa-aviso`, `mesa-bloco`, `mesa-parte`, `mesa-com-origem`, `mesa-origem`, `mesa-sugestao`, `mesa-grupo`, `mesa-pergunta`, `mesa-escrever`, `mesa-ws` e `mesa-nota`).

**Build (`build.mjs:373-389`):**

- Uma peça pode juntar vários arquivos: `PARTES_PECA = { 'estudo-celula': ['estudo-regras.js', 'estudo-celula.js'], 'estudo-preparo': ['estudo-marcas.js', 'estudo-preparo.js'] }`. O padrão continua `[nome + '.js']`.
- As duas entram em `NOMES_PECAS`, em `window.*` (`build.mjs:481-484`) e no cache `caminho-telas` do service worker (`TELAS`).

**Folga esperada:** sai uns 14,5 KB e entram uns 2,5 KB de casca e correções, então a folga fica perto de **78 KB**. O `teste.mjs` passa a exigir `Buffer.byteLength(html) <= 1024 * 1024 - 60 * 1024`.

### 5.2 Servidor

- **`estudos.mjs` (novo, no `COPY` do Dockerfile, que o `teste.mjs:139-149` confere):**
  - os tetos da seção 1.3;
  - `limparPerguntas(lista)`;
  - `validarLeitura(r, { livros, capitulos })`, que confere o que o leitor devolveu;
  - `estudoDaLinha(linha)`;
  - `estudoNoRetrato(estudo, { eu, souQuemPrepara, nomeDe })`.
- **`contas.mjs`:**
  - `salvarEstudo(eu, id, entrada, { lerEstudo, livros, capitulos, planoAte, refSemana }, agora)` substitui `definirEstudo` (`contas.mjs:1353-1386`);
  - `estudo(id)` lê uma linha;
  - a carga legada (`migrarEstudoLegado`);
  - `p.estudoId` em `paraLinhas` e `deLinhas`.
- **`servidor.mjs`:**
  - carrega `estudo-marcas.js` em `carregarRegras` (`servidor.mjs:81-97`);
  - monta `CAPITULOS` a partir do plano;
  - em `celulaNoRetrato` (`servidor.mjs:800-818`), troca `estudo: p.estudo` por `estudo: estudoNoRetrato(CONTAS.estudo(p.estudoId), …)` e acrescenta `euPreparoEstudo`, ainda no bloco que vai para todos (membro e visitante incluídos), antes do corte de `:818`;
  - a ação `estudo` de `/api/celula` (`servidor.mjs:1926`) chama `salvarEstudo`, com `planoAte` calculado como `semanaAte` (função extraída de `:803-805`).

### 5.3 API (interface fixa entre os dois blocos)

**`POST /api/celula`, ação `estudo`, só para o líder:**

```js
{
  acao: 'estudo', id: '<célula>',
  estudo: 'blocos' | 'semana' | 'trecho' | '' ,   // '' tira o estudo; sem o campo, grava só os 4 Ws
  fonte: '<texto do estudo>',                       // blocos; em semana e trecho, a palavra opcional
  ref: 'Romanos 8.28-30',                           // trecho
  traducao: 'nbv' | 'blivre',
  perguntas: ['...'],                               // 0 a 6
  acolhida: '...', adoracao: '...', testemunho: '...', // opcionais, como hoje
  base: '<id do estudo que está sendo mudado>'      // '' para um estudo novo
}
```

**Compatibilidade:** `texto` é aceito no lugar de `fonte`, e `livre` no lugar de `blocos`. É o cliente antigo, ainda no cache do service worker.

**Regras:**

- **Quem:** `celulaDoLider` (`contas.mjs:1272-1279`). O auxiliar, o membro, o visitante, o líder de outra célula e o administrador recebem **403**, com "só o líder da célula prepara o estudo". O líder menor de idade que ainda espera aprovação recebe o 403 de `AGUARDANDO_APROVACAO`.
- **Sem o campo `estudo`:** grava só os 4 Ws e não mexe no estudo. Hoje, `definirEstudo` sem tipo apagava o estudo (`contas.mjs:1366-1383`).
- **`estudo: ''`:** grava `atual_ate` no estudo atual e zera `p.estudoId`. A linha fica.
- **`blocos`:**
  - o servidor roda `lerEstudo(fonte, { capitulos })` e grava a `fonte` **limpa** que o leitor devolve, nunca a recebida;
  - aplica os tetos à fonte limpa e aos blocos;
  - confere cada cartão com `CC.lerRef` e com a lista de livros;
  - tira `.l` dos blocos.
- **`trecho`:**
  - `ref` passa por `lerRefLivre`, que aceita capítulo inteiro;
  - a mensagem de hoje continua para o que não for referência (`contas.mjs:1376`);
  - `titulo` e `refs` saem da `ref`.
- **`semana`:** `plano_ate` vem do servidor (o `semanaAte` do líder), e `refs` traz a referência-chave da semana, a reflexão do 4º dia (`08b:1374`), calculada com `REFLEXOES_DO_CONTEUDO`.
- **Gravar:**
  - `base` igual ao estudo atual **atualiza** a linha (`editado_em`; `criado_por` passa a ser o líder só se estava vazio, no legado);
  - qualquer outro caso **insere** uma linha nova (`id = 'e' + 12 hexadecimais`) e grava `atual_ate` na anterior;
  - depois, `p.estudoId` e `await this.salvar()`.
  - Uma linha órfã, se o `salvar` falhar depois do `INSERT`, não aparece em lugar nenhum e não faz mal.
- **Mensagens de 400**, na voz do app, minúsculas como as de hoje:
  - "escolha como vai ser o estudo";
  - "escreva o estudo";
  - "escreva o título na primeira linha, com até 120 caracteres";
  - "o estudo tem no máximo 10.000 caracteres";
  - "cada parte do texto tem no máximo 1.500 caracteres";
  - "o estudo passou de 80 partes. Divida em dois encontros";
  - "o estudo tem no máximo 15 versículos";
  - "uma lista com seta tem no máximo 12 linhas";
  - "escolha até 6 perguntas";
  - "cada pergunta tem no máximo 300 caracteres";
  - "escolha a NBV ou a Bíblia Livre".
- **Resposta:** `{ ok: true, estudo: <Estudo> | null }`.

**`GET /api/propositos`.** Cada célula ganha `euPreparoEstudo: boolean` e `estudo: Estudo | null`:

```js
{
  id: 'e3f9a1c2b7d4', tipo: 'blocos', titulo: '...', ref: '', planoAte: 0,
  blocos: [ /* seção 2.3, sem .l */ ], refs: ['Efésios 6.12', ...],
  perguntas: ['...'], traducao: 'nbv',
  criadoPor: 'marcos', criadoPorNome: 'Marcos', em: '<ISO>', editadoEm: '<ISO ou vazio>',
  texto: '...',   // só em semana, trecho e livre: a palavra do líder (a fonte)
  fonte: '...'    // só em blocos, e só para quem prepara (o líder)
}
```

Os membros recebem os blocos, mas não a fonte. Isso deixa o retrato mais leve e não espalha um texto que só o líder edita. `estudoAcolhida`, `estudoAdoracao`, `estudoTestemunho` e `semanaAte` continuam como hoje. A Fase 1 não ganha rota de histórico.

### 5.4 Funções puras do cliente (o que `teste.mjs` exercita)

Em `CC.estudoRegras`:

- `passos(estudo, { conduzo, visitante, acolhida, adoracao, testemunho, semana })`: devolve `[{ tipo, etiqueta, titulo?, frase?, blocos?, abrir? }]`.
- `textoParaGrupo(estudo, { data, principal: { ref, texto, sigla }, endereco, semana })`: devolve o texto.
- `noPlano(refs, plano)`: devolve `[{ numero, capitulo, passagem }]`, no máximo 2.
- `gruposDePerguntas(estudo, { plano, reflexaoEscrita, parabolas })`: devolve `[{ de, titulo, subtitulo, perguntas, marcadas }]`.
- `comoBlocos(estudo, semana)`: converte semana, trecho e livre em blocos para a tela, o encontro e o WhatsApp. Usa um tipo `dias`, só do cliente, para a lista da semana; ele nunca é gravado.
- `blocoEmHtml(bloco, { cartao })`: escapa tudo com `CC.esc`, e só depois `*x*` vira `<b>x</b>`. Nenhuma outra marca vira HTML.

### 5.5 Privacidade (`src/privacidade.html`, no bloco SERVIDOR)

1. **No quadro de quem vê o quê**, depois de `privacidade.html:161`: `<tr><td>O estudo da célula</td><td>Todos da célula, inclusive visitantes, com o nome de quem preparou. Só o líder prepara, muda ou tira o estudo.</td></tr>`.
2. **No quadro de quanto tempo fica**, ao lado de `:223`: `<tr><td>Estudos da célula</td><td>Enquanto a célula existir. Um estudo novo não apaga o anterior.</td></tr>`. É a verdade desde a Fase 1, mesmo sem a lista na tela.
3. **Em "O que fica depois da exclusão"** (`:233`): acrescentar "os estudos que você preparou para a célula, com o seu @". E, em `:232`, deixar claro que "o que você escreveu" é o que é só seu (reflexões, orações, anotações). É o conflito apontado na crítica, item 1.
4. **A linha da versão** (`:61`) passa para "Versão 4 · atualizada em <data da publicação>". `CONSENTIMENTO_VERSAO` não muda, porque o texto do consentimento sobre dado de fé é o mesmo.

---

## 6. Testes

### 6.1 Testes de hoje que mexem no estudo

| Teste | O que faz hoje | O que muda |
|---|---|---|
| `ferramentas/teste-celula.mjs:116-134` | trecho, livre, semana, 403 de quem não é líder e "tirar" | `livre` vira `blocos`; "tirar" deixa a linha no banco; o membro recebe blocos e não recebe a fonte. |
| `ferramentas/teste-celula.mjs:156-188` | os 4 Ws e o auxiliar que conduz (`:170-173`) | Gravar os 4 Ws sem o campo `estudo` não mexe no estudo. O auxiliar recebe **403** ao gravar estudo e ao gravar os 4 Ws, mas continua com 200 em recado e em `registrarEncontro`. |
| `ferramentas/teste-celula-botoes.mjs:9` e `:251-252` (C6) | "Ler a leitura da semana" no Estudo vazio de quem não conduz | Continua igual, agora desenhado pela peça. Entra o mesmo para o **auxiliar**. |
| `ferramentas/telas.mjs:55` e `:183-185` | semeia um estudo `semana` com texto e tira a foto da aba | Continua funcionando. Entra uma segunda célula com o estudo do dono (`blocos`) e as fotos do preparo, da prévia e do modo encontro. |
| `ferramentas/teste-db.mjs:172-194` (banco v6) e os esquemas montados à mão em `:257-265`, `:326-328` e `:371-373` | migrações antigas com as colunas `estudo_*` | Precisam continuar migrando até a v19. |
| `ferramentas/teste-banco.mjs` com `json-legado-sintetico.mjs:215` e `:225` | importa um `contas.json` antigo com `estudo` | O estudo importado tem de virar linha `l<id>`. |
| `teste.mjs:150` | teto de 1 MiB | Ganha a exigência da folga. |
| `teste.mjs:247-252` | a tabela dos 66 vem de `06b` | Carrega `01-nucleo.js` antes. |
| `teste.mjs:318-350` | a lista de peças | Ganha as duas novas. |
| `teste.mjs:885-886` | `08b` carregado no vm | Precisa continuar carregando sem DOM. |
| `ferramentas/teste-redesenho.mjs` | não toca no estudo (conferido) | Só roda como regressão. |
| `design/ferramentas/semear.mjs` | não semeia estudo | Passa a semear o estudo do dono na célula do marcos, para a revisão de telas (`.claude/skills/revisao-uiux`). |

### 6.2 Unidade (`teste.mjs`)

- **"referências e leitor de marcas do estudo":** os 29 casos da seção 2.5, com o leitor rodando no mesmo contexto do servidor (`01-nucleo`, `02-estado`, `02b-jogo` e `estudo-marcas`).
- **"regras do estudo"** (`estudo-regras.js` no vm, com stubs de `document`):
  1. `passos()` do estudo do dono, com Lucas e 2 perguntas:
     - as 15 etiquetas na ordem do mock;
     - nenhum passo da Palavra contém o texto da acolhida, da adoração ou do testemunho;
     - "Orar juntos" não tem bloco `versiculo`;
     - "Para guardar" só no último passo;
     - "Tópico 4, parte 2 de 2" começa por "E Paulo acrescenta algo fundamental:";
     - com `conduzo: false`, o último passo não tem registro;
     - com `visitante: true`, Orar juntos não fala da aba Oração.
  2. `textoParaGrupo()`:
     - fica igual a `ferramentas/estudo-exemplo-grupo.txt`, a cópia de `texto-zap-inteiro.txt` com a marca `{{NBV Efésios 6.12}}` no lugar do versículo, preenchida pelo teste a partir de `nbv.json`, e com o endereço `{{ENDERECO}}`;
     - nenhum texto bíblico fica digitado no teste;
     - sem data, a segunda linha some;
     - sem o texto do versículo, sai só "*Leiam juntos:* Efésios 6.12 (NBV)";
     - com a Bíblia Livre, "(BLivre)".
  3. `noPlano()`: com Lucas, dá os dias 244 e 77; sem Lucas, 244 e 318; para "Romanos 8", o dia que lê Romanos 8.
  4. `gruposDePerguntas()`:
     - no estudo do dono, a reflexão do dia 244 (2 perguntas) e o OIA, com 2 marcadas;
     - num trecho "Lucas 11", a reflexão do dia 77, a parábola "O amigo à meia-noite", com as 2 perguntas lidas de `conteudo/parabolas/amigo-meia-noite.json`, e o OIA.
  5. `blocoEmHtml()`: `<script>` e `*<b>*` saem escapados; `*negrito*` vira `<b>`; nada mais vira marca.
  6. Nos textos do app de `estudo-regras.js`, `estudo-celula.js` e `estudo-preparo.js`, sem as linhas de expressão regular, não há travessão nem meia-risca.
- **"estudos no servidor"** (`estudos.mjs` e `Contas` com banco temporário, como na seção "contas, amizades e propósito"):
  - os tetos e as mensagens;
  - `salvarEstudo` do líder grava, e o do auxiliar dá 403;
  - um estudo novo insere uma linha e grava `atual_ate` na anterior;
  - `base` igual atualiza a mesma linha;
  - "tirar" mantém a linha;
  - sem o campo `estudo`, os 4 Ws mudam e o estudo fica;
  - a fonte gravada não tem as citações da NVI;
  - `Contas.apagar` do líder deixa as linhas, e `criadoPorNome` vira `@lider`.
- **"peças sob demanda":**
  - `estudo-celula` (marca `textoParaGrupo`) e `estudo-preparo` (marca `mesa-barra-marcas`) saem em arquivo próprio, com `.gz`, ficam no cache `caminho-telas` e não aparecem no index;
  - a folga do index é de 60 KB ou mais.

### 6.3 Banco (`ferramentas/teste-db.mjs`)

- No banco v6 (`:172-194`), uma segunda célula `p2` com `estudo_tipo = 'livre'` e texto. Depois de migrar:
  - existe a linha `lp2` com `tipo = 'livre'`, a `fonte` igual e `criado_por = ''`;
  - `propositos.estudo_id = 'lp2'`;
  - `p1`, sem estudo, fica com `estudo_id = ''`.
- O índice `celula_estudos_proposito` existe.
- `apagarPessoaDoBanco` **não** apaga `celula_estudos` de quem preparou.
- Uma gravação depois da carga não zera `estudo_id`: é a armadilha do `INSERT OR REPLACE`.

### 6.4 HTTP (`ferramentas/teste-celula.mjs`)

Além dos ajustes de 6.1:

- O líder salva o estudo do dono (`ferramentas/estudo-exemplo.txt` com a marca de "Para guardar") e recebe o estudo com 5 cartões e 4 trocas.
- O membro recebe `blocos` e não recebe `fonte`; o líder recebe `fonte`, e ela não traz "A nossa luta".
- O visitante recebe o estudo.
- Recebem 403: o auxiliar, a Ana e o visitante.
- Recebem 400:
  - o estudo de 10.001 caracteres (texto puro);
  - 7 perguntas;
  - a tradução "nvi";
  - o estudo sem título.
- `euPreparoEstudo` é `true` só para o líder.
- Um segundo estudo deixa duas linhas na tabela, conferido abrindo `caminho.db` só para leitura.

### 6.5 Navegador (novo `ferramentas/teste-estudo-celula.mjs`)

**Montagem:** porta `Number(process.env.PORTA) || 8393`; no ambiente de agentes, rode com `PORTA=99xx` e `PORTAS=9900-9960`. Um Chrome por rodada (`navegador.mjs`), fechado por `fecharArvore`. Contas criadas pela API: líder, auxiliar, Ana (membro) e Vera (visitante). A célula com dia de encontro.

**Prova** (cada item vira um `ok`):

1. **Aba Estudo vazia:**
   - o líder vê "Preparar o estudo";
   - o auxiliar e a Ana não veem, mas veem "Ler a leitura da semana";
   - o auxiliar tem a aba Painel.
2. **Abrir o preparo:** "Preparar" leva a `…/preparar`, a barra de abas some e aparece "Passo 1 de 3".
3. **Colar:** um `paste` sintético com `text/html` (o resumo em `<b>`) deixa os asteriscos nas 6 linhas do resumo.
4. **Barra de marcas:** com o foco na última linha, "Para guardar" põe "Para guardar: " no começo dela.
5. **Rascunho e saída:**
   - recarregar a página mantém o texto;
   - o voltar do topo abre "Sair do preparo?", com "Continuar preparando" e "Sair";
   - "Sair" volta à aba, e o rascunho fica.
6. **Passo 2:**
   - o aviso fala de 4 citações;
   - os 5 cartões têm o `blockquote` **igual** ao de `nbv.json`;
   - as linhas de origem estão certas;
   - "Mostrar o cartão" de Lucas leva a 6 cartões;
   - "Bíblia Livre" troca os 6 textos para os de `blivre.json`, e "NBV" volta.
7. **"Mudar" no Título:** muda o título, e a fonte do rascunho acompanha.
8. **Passo 3:**
   - aparecem "Da reflexão do dia 244" e "Do método OIA", com 2 marcadas;
   - marcar a 7ª é recusado;
   - "Pôr na lista" acrescenta uma pergunta;
   - "Mudar" nos 4 Ws grava;
   - o aviso do visitante está antes de "Salvar o estudo".
9. **Salvar:**
   - volta a `…/estudo`, com o aviso "Estudo salvo. Ele fica guardado na célula." e o cartão "Você preparou este estudo";
   - pela API, o auxiliar recebe 403 e a Ana também.
10. **A aba da Ana:**
    - "preparado por <líder>";
    - "No plano" com 2 linhas;
    - "Você leu em" só quando o dia 244 está em `marcadoEm` no aparelho dela, e com outra conta não aparece;
    - nenhum texto como `\d+ de \d+` na aba;
    - os três pontos do **segundo** cartão abrem a barra **dele**, e "Copiar" copia o texto **desse** cartão, com um espião em `CC.copiar`.
11. **Mandar no grupo:**
    - não há "Versão curta";
    - o texto passado a `CC.compartilhar` é igual ao esperado da seção 6.2.
12. **Modo encontro da Ana:**
    - 15 passos, com as etiquetas certas;
    - no passo 3, "Abrir Efésios 6 na Bíblia" fecha a tela cheia (nenhuma `.tela-cheia` sobra) e vai para `#/biblia/Efésios/6`;
    - reabrir volta ao passo 3;
    - o texto de um pedido de oração que a Ana criou antes não aparece em passo nenhum;
    - Orar juntos não tem cartão;
    - o último passo mostra "O estudo fica na aba Estudo…", sem "Registrar quem veio".
13. **Modo encontro do auxiliar:** o último passo tem "Registrar quem veio", que abre "Quem foi ao encontro?".
14. **Visitante:**
    - vê a aba Estudo com o estudo;
    - em Orar juntos, nada de "aba Oração".
15. **"Encontro hoje"** (encontro marcado para hoje):
    - com estudo, a Ana vê "Encontro hoje · veja o estudo";
    - depois de o líder tirar o estudo, a Ana não vê selo, e o líder vê "Encontro hoje · preparar o estudo".
16. **Tirar o estudo:** a confirmação aparece, a aba fica vazia e a linha continua no banco.
17. **Tamanhos e temas** (360 e 390 px, claro e escuro), no passo 1, no passo 2, no passo 3, na aba, na folha do grupo e em 3 passos do encontro:
    - sem rolagem lateral;
    - todo botão e todo link visível com 44 px ou mais na menor medida;
    - nenhuma letra abaixo de 12 px.
18. **Fim da rodada:** o servidor e o Chrome encerrados por PID, e as pastas temporárias apagadas.

**Contraste:** os pares novos entram em `ferramentas/contraste.mjs`:

- a tinta fraca da linha de origem sobre o campo;
- a etiqueta "Sugestão do app";
- "Para guardar" no escuro (`--salvia-palido` com contorno);
- o selo "Encontro hoje · preparar o estudo";
- o convite de Orar juntos.

**Bateria antes de cada commit grande:** `node build.mjs`, `node teste.mjs`, `teste-db`, `teste-banco`, `teste-celula`, `teste-celula-botoes`, `teste-estudo-celula`, `teste-redesenho`, `teste-sob-demanda` e `teste-multiplicar`. Depois de todo build, reiniciar o servidor de teste, porque a CSP muda.

---

## 7. Dois blocos de trabalho

O contrato entre os dois blocos é o da seção 2.3 (saída do leitor), o da seção 5.3 (pedido e JSON do estudo) e o da seção 5.4 (funções do cliente). Cada arquivo tem um dono só. Onde os dois mexem no mesmo arquivo, as partes estão listadas e não se cruzam.

### Bloco SERVIDOR (dados, API, permissões e leitor de marcas), uns 2 dias

| Ordem | Arquivos | Entrega |
|---|---|---|
| S1 | `src/app/01-nucleo.js` (só `CC.LIVROS`, `CC.lerRefLivre` e `CC.regexRef`), `06b-mapas.js` e `03-trilha.js` (só a tabela) e `teste.mjs` (casos 16 a 23 da seção 2.5 e `:247-252`) | Livros e referências num lugar só. |
| S2 | `src/sob-demanda/estudo-marcas.js`, `ferramentas/estudo-exemplo.txt` e `teste.mjs` (casos 1 a 15 e 24 a 29 da seção 2.5) | O leitor de marcas, puro e testado. |
| S3 | `db.mjs` (v19 e o comentário em `apagarPessoaDoBanco`), `contas.mjs` (`estudoId`, `migrarEstudoLegado` e `salvarEstudo`), `estudos.mjs`, `Dockerfile`, `teste-db.mjs`, `teste-banco.mjs` e `teste.mjs` ("estudos no servidor") | A tabela, a migração e as regras. |
| S4 | `servidor.mjs` (regras, `CAPITULOS`, retrato e ação) e `ferramentas/teste-celula.mjs` | A API e as permissões, com 403 para o auxiliar. |
| S5 | `src/privacidade.html` | As linhas da seção 5.5. |

A ordem de entrega vale pelo valor para o outro bloco: S2 e S4 destravam o cliente.

### Bloco CLIENTE (telas), uns 4 dias

| Ordem | Arquivos | Entrega |
|---|---|---|
| C1 | `01-nucleo.js` (só `CC.confirmar`), `01c-arte.js`, `02-estado.js`, `04-licao.js`, `04b-leitor.js` e `04e-versiculos.js` | As correções da seção 4 que não dependem do servidor. |
| C2 | `build.mjs` (`PARTES_PECA` e as duas peças), `src/sob-demanda/estudo-regras.js` e `teste.mjs` ("regras do estudo", "peças sob demanda" e folga) | As regras puras e as peças. |
| C3 | `src/sob-demanda/estudo-celula.js` e `.css`, e `08b-propositos.js` (casca, selo, `apoioCelula`, retirada do código antigo) | A aba, o modo encontro e "Mandar no grupo". |
| C4 | `src/sob-demanda/estudo-preparo.js` e `.css`, `10-roteador.js` e `estilo-v2/01-base.css` | O preparo em 3 passos. |
| C5 | `ferramentas/teste-estudo-celula.mjs`, `teste-celula-botoes.mjs`, `telas.mjs`, `contraste.mjs` e `design/ferramentas/semear.mjs` | A prova no navegador. |

**Para não esperar o servidor:**

- C1 e C2 começam já.
- C3 trabalha com o JSON do estudo do dono escrito à mão a partir da seção 2.5, igual ao que S2 vai produzir: o `teste.mjs` de S2 confere essa igualdade.
- C4 precisa de S2. O `salvar` real precisa de S4.

### Fecho dos dois blocos

1. **Juntar:** os dois blocos em `redesenho-novo`, com a bateria inteira verde.
2. **Revisar:**
   - capturas a 390 e a 360 px, claro e escuro, com a varredura `rev.mjs`;
   - comparação com os PNGs do mock (o seletor de versão e o cartão de Orar juntos saem, como decidido);
   - leitura das frases pelo cartão de voz.
3. **Registrar o aprendido:** uma entrada em `docs/aprendizados.md`, na seção "Peças sob demanda", sobre o estudo inteiro fora do index e o porquê de `estudo_id` precisar estar em `paraLinhas`.

**Commits:** em português, explicando o porquê, um por entrega (S1 a S5, C1 a C5), sem imagens.

---

## 8. Riscos e pontos que ficam para conferir

- **Leitor de marcas e texto real:** o estudo do dono é um só. A prévia com "Mudar" em cada parte é a rede de segurança. Vale pedir ao dono um segundo estudo de verdade para a revisão final.
- **A tradução fixa custa download:** quem usa a NBV e abre um estudo em Bíblia Livre baixa a BLivre, uns 1,45 MB, uma vez (crítica, item 5).
- **Retrato maior:** o estudo de 10.000 caracteres vai a cada `/api/propositos` de todo membro, uns 12 KB. Se pesar no Raspberry Pi, a Fase 2 passa o estudo para uma rota própria com cache por `editadoEm`.
- **Duas abas do líder:** dois aparelhos salvando ao mesmo tempo fazem o segundo virar estudo novo, e não sobrescrevem um ao outro. Fica assim na Fase 1.
- **Sem rede na primeira vez:** as peças entram no cache na primeira abertura. Quem nunca abriu a aba Estudo e chega ao encontro sem rede também não teria o `/api/propositos`. É o mesmo comportamento de hoje.
