# Inteligência: métricas e painéis de quem lidera (Módulo 5)

Dois perfis de liderança, duas perguntas diferentes:

| Perfil | Pergunta | Onde aparece | Vê |
|---|---|---|---|
| **Líder (ou auxiliar) de célula** | quem precisa de ajuda e como vai a saúde do pequeno grupo | na célula dele (aba Hoje, antes de "Precisam de atenção", e aba Pessoas) | só a própria célula; nomes só na lista de atenção, que já existia; nunca o que alguém escreveu ou orou |
| **Administrador / pastor** (`CAMINHO_ADMIN`) | a estratégia de Atos 2 está funcionando na igreja inteira? | no Painel do administrador (Perfil › Administração), no alto | só agregados; nome de célula sim, nome de pessoa nunca; abaixo de 5 pessoas, "menos de 5" |

Código: regras puras em `inteligencia.mjs` (testadas sem servidor), esquema v14 em `db.mjs`, os pedidos em
`servidor.mjs`, as telas em `src/app/08b-propositos.js` (célula) e `src/app/07e-painel.js` (painel), o
estilo em `src/estilo-v2/24-juntos.css` e `25-perfil.css`. Teste: `node ferramentas/teste-inteligencia.mjs`.

## 1. Como as peças se encaixam

```
celular ──GET /api/propositos──▶ servidor.mjs: retratoDoProposito ──▶ celulaNoRetrato
          (a célula de sempre)      │  (lê o progresso dos até 20 membros, como já fazia)
                                    └▶ painelDaCelula + atencaoComGatilhos   [inteligencia.mjs]
celular ──GET /api/painel/celula?id=X──▶ o mesmo painel, para quem conduz (403 para membro comum)

celular ──GET /api/painel/igreja──▶ servidor.mjs: painelDaIgreja (cache de 5 min)
                                     ├▶ leitura_dias (tabela v14) e as views leituras_por_dia, celula_frequencia
                                     ├▶ checkins (índice por data, v14)
                                     └▶ contas e propósitos já em memória (Contas)   [inteligencia.mjs]
```

O dono citou "views ou RPCs no Supabase". Aqui não há Supabase: o banco é o SQLite do Node
(`node:sqlite`, um arquivo só) e o servidor é `node:http`. A tradução é direta:

- **view do Postgres → `CREATE VIEW` no SQLite** (v14 em `db.mjs`): `leituras_por_dia` e
  `celula_frequencia` são as consultas prontas que o servidor usa; o Postgres aceitaria o mesmo SQL
  (só o `INSERT OR IGNORE` vira `ON CONFLICT DO NOTHING`).
- **RPC (função chamada pelo cliente) → endpoint `/api/...`**: `GET /api/painel/celula` e
  `GET /api/painel/igreja`. A autorização, que no Supabase seria RLS por papel, aqui é a mesma de
  sempre: `podeConduzir(p, eu)` para a célula e `ehAdmin(eu)` para a igreja, antes de qualquer conta.
- **tabela desnormalizada alimentada por trigger → `leitura_dias` alimentada no `PUT /api/estado`**:
  o lugar por onde todo progresso passa. No Postgres isso seria um trigger na tabela `estados`
  (`jsonb_each` nos campos `marcadoEm`, `licoesEm` e `conhecidos`); num Supabase com materialized
  view, `REFRESH MATERIALIZED VIEW CONCURRENTLY` por cron faria o papel do cache de 5 minutos.

## 2. Modelagem do banco (esquema v14)

O progresso de cada pessoa é um JSON na tabela `estados` (lições, datas, anotações, foto). Contar
"quem leu hoje" ou a chama de todas as células exigiria abrir o JSON de todo mundo a cada pedido:
com 500 contas são 500 `JSON.parse` de uns 10 a 40 KB cada (a foto mora lá), vários segundos no Pi.
O painel antigo já faz isso uma vez por minuto; a inteligência não entra nessa conta.

```sql
-- v14 (db.mjs, ESQUEMA[13])
CREATE TABLE leitura_dias (usuario TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (usuario, data));
CREATE INDEX leitura_dias_data ON leitura_dias (data);
CREATE INDEX checkins_data ON checkins (data);
CREATE VIEW leituras_por_dia AS
  SELECT data, COUNT(*) AS pessoas FROM leitura_dias GROUP BY data;
CREATE VIEW celula_frequencia AS
  SELECT e.proposito, e.data, e.sem_encontro, e.visitantes,
    (SELECT COUNT(*) FROM celula_presencas p WHERE p.proposito = e.proposito AND p.data = e.data) AS presentes
  FROM celula_encontros e;
```

**`leitura_dias`** é a cópia achatada só das datas em que a pessoa "fez o dia" (lição do plano,
Primeiro passo ou dia do Conhecer Jesus: a mesma `datasFeitas` de `contas.mjs` que a ofensiva usa).
Uma linha por pessoa e dia, sem texto, sem nota, sem qual lição. Tamanho: pessoas × dias lidos
(500 pessoas lendo metade do ano ≈ 90 mil linhas de 20 bytes).

Como fica em dia (tudo em `inteligencia.mjs`):

- `sincronizarLeituraDias(db, usuario, datas)` roda dentro do `PUT /api/estado`, logo depois de
  gravar o progresso fundido: lê as datas que a pessoa tem na tabela (uma consulta pela chave
  primária, no máximo umas centenas de linhas), e grava só a diferença, numa transação. Entra o
  que faltava; sai o que ela não tem mais (zerou o progresso). Sem mudança, não grava nada.
- `preencherLeituraDias(db)` roda uma vez na subida (marca `leitura_dias_preenchida` em
  `metadados`): copia as datas de quem já tinha progresso antes da v14.
- Apagar a conta apaga as linhas (`apagarProgressoDe` no servidor, `apagarPessoaDoBanco` nos backups).

O que **não** ganhou tabela, e por quê: os marcos de Minha caminhada seguem no `extra` da conta
(já em memória, 4 datas por pessoa); os dias em que a conta abriu o app seguem em `acessos` no
mesmo `extra` (90 dias, já anotados por `anotarAcesso`); os encontros e presenças já têm tabela
(v7/v12). Uma tabela diária por célula pré-agregada ficou de fora: a célula tem no máximo 20
pessoas, e o retrato dela já carrega o progresso dessas 20 para o que existia antes.

## 3. Endpoints (as "RPCs")

### `GET /api/propositos` (o retrato da célula) · `GET /api/painel/celula?id=<id>`

Quem conduz (líder ou auxiliar, `podeConduzir`) recebe, no retrato da célula que o app já pedia,
duas chaves a mais; `GET /api/painel/celula?id=` devolve o mesmo objeto sozinho (404 se a célula
não existe ou a pessoa não é dela, 403 se é membro comum). Membro comum e visitante não recebem
nada disto.

```json
{
  "painel": {
    "chama":      { "acesos": 5, "total": 7, "pct": 71 },
    "frequencia": { "encontros": [ { "data": "2026-09-09", "semEncontro": false, "pessoas": 8 },
                                   { "data": "2026-09-16", "semEncontro": true,  "pessoas": null },
                                   { "data": "2026-09-23", "semEncontro": false, "pessoas": 7 },
                                   { "data": "2026-09-30", "semEncontro": false, "pessoas": 9 } ],
                    "diferenca": 2, "tendencia": "subindo" },
    "funil": [ { "etapa": "comecando", "rotulo": "Dando os primeiros passos", "pessoas": 2, "conhecendo": 1, "passosConcluidos": 0 },
               { "etapa": "decidiu",   "rotulo": "Decidiram seguir Jesus",     "pessoas": 2 },
               { "etapa": "batizado",  "rotulo": "Já se batizaram",            "pessoas": 2 },
               { "etapa": "acompanha", "rotulo": "Acompanham alguém na fé",    "pessoas": 1 } ]
  },
  "atencao": [ { "usuario": "bia", "nome": "Bia", "faltou": true,
                 "motivo": "faltou ao último encontro · perdeu uma ofensiva de 40 dias há 3 dias",
                 "gatilhos": [ { "tipo": "faltou",   "texto": "faltou ao último encontro" },
                               { "tipo": "ofensiva", "texto": "perdeu uma ofensiva de 40 dias há 3 dias" } ] } ]
}
```

### `GET /api/painel/igreja` (só `CAMINHO_ADMIN`; 403 para o resto)

```json
{
  "hoje": "2026-10-01", "geradoEm": "2026-10-01T20:26:39.684Z",
  "adocao": { "contas": 16,
              "hoje": { "abriram": 16, "leram": 10, "pctAbriram": 100 },
              "media7": { "abriram": 12.1, "leram": 9 },
              "serie": [ { "dia": "2026-09-18", "abriram": 16, "leram": 8 }, "... 14 dias, até hoje" ],
              "retencao": { "base": 13, "ativas": 12, "pct": 92 } },
  "chamaDasCelulas": [ { "id": "p7cb…", "titulo": "Célula Vida", "poucos": false, "membros": 6, "acesos": 5, "pct": 83, "frequencia": 5.7 },
                       { "id": "p3d3…", "titulo": "Célula Nova", "poucos": true, "membros": "menos de 5", "acesos": null, "pct": null, "frequencia": null } ],
  "evangelismo": { "mes": "2026-10", "anterior": "2026-09",
                   "deste":      { "decisao": "menos de 5", "batismo": "menos de 5", "celula": "menos de 5", "discipula": "menos de 5" },
                   "doAnterior": { "decisao": 7, "batismo": "menos de 5", "celula": 12, "discipula": "menos de 5" } },
  "saude": { "base": 9, "suficiente": true,
             "esferas": { "corpo": { "baixa": 11, "media": 44, "alta": 44 }, "mente": { "baixa": 44, "media": 33, "alta": 22 }, "espirito": { "baixa": 11, "media": 44, "alta": 44 } } }
}
```

Cache de 5 minutos por data (`cacheIgreja`): os números não mudam mais rápido que isso, e o Pi
não refaz a conta a cada abertura da tela. `geradoEm` diz de quando é.

## 4. As métricas, uma a uma: regra, consulta e custo

### Líder de célula (`painelDaCelula`, em cima do retrato que já existia)

O retrato da célula (`retratoDoProposito`) já lia o progresso de cada membro para "quem leu hoje"
e para a meta do dia, e já rodava a simulação da ofensiva de cada um (`REGRAS.simularOfensiva`,
o mesmo código do navegador em `src/app/02-estado.js`). A mudança foi guardar a simulação inteira
em vez de só os dias protegidos: tudo abaixo sai dela, **sem nenhuma leitura a mais do banco** e
limitado a 20 pessoas (`LIMITE_CELULA`).

| Métrica | Regra (`inteligencia.mjs`) | De onde vem |
|---|---|---|
| **Termômetro da chama** | `chamaAcesa(simulacao)`: ofensiva de hoje maior que zero (leu hoje, ou ontem com a sequência de pé, inclusive por escudo). `termometro([bool])` → acesos, total, %. | a simulação de cada membro de verdade (ativo, não visitante; quem conduz conta) |
| **Frequência das últimas 4 semanas** | `frequencia(encontros, referencia)`: os 4 últimos encontros registrados até a data de referência, do mais antigo para o mais novo; `pessoas` = presentes com conta + pessoas sem conta; a semana "sem encontro" sai com `pessoas: null` (nunca zero); tendência = último encontro de verdade menos o anterior. | `p.encontros`, já em memória |
| **Funil da caminhada** | `funil(pessoas)`: cada pessoa numa etapa só, a mais adiante: acompanha alguém (marco "discipula" ou discípulo ativo) › batizado (marco "batismo") › decidiu (marco "decisao") › começando (o resto; dentro dela, quantos ainda estão no Conhecer Jesus e quantos já fecharam os 12 Primeiros passos). | `conta.marcos`, `conta.caminho`, `discipulosAtivosDe`, `estado.licoes` |
| **Alerta de risco** | `atencaoComGatilhos`: a lista de `quemPrecisaDeAtencao` (propositos.mjs: faltou ao último ou aos 2 últimos encontros; sem ler há 5 dias ou mais) ganha o gatilho `ofensivaPerdida`: a última quebra da sequência (`zerouEm` da simulação) foi há no máximo 14 dias, a sequência perdida tinha 7 dias ou mais (os dias cobertos por escudo servem de ponte) e a pessoa ainda não recomeçou (3 dias seguidos de novo). Ordem: quem faltou, quem perdeu a ofensiva, quem só está sem ler; o teto de 5 continua para quem não faltou. | a simulação e as datas de cada candidato |

O texto do WhatsApp (`recadoDeCuidado`, `08b-propositos.js`) segue o primeiro gatilho; para a
ofensiva perdida é um convite para recomeçar, sem cobrança.

### Administrador (`painelDaIgreja`)

| Métrica | Consulta | Custo e por que não pesa |
|---|---|---|
| **Adoção (DAU)** | `abriram`: `conta.acessos` (um dia por linha, 90 dias, já em memória); `leram`: `SELECT data, pessoas FROM leituras_por_dia WHERE data > ? AND data <= ?` (14 dias) | a view agrupa pelo índice `leitura_dias_data`; a janela de 14 dias devolve 14 linhas |
| **Retenção simples** | das contas com 30 dias ou mais (`criadaEm`), quantas estão em `SELECT DISTINCT usuario FROM leitura_dias WHERE data > hoje-7 AND data <= hoje` | uma varredura do índice por data, 7 dias |
| **Chama das células (ranking)** | `SELECT usuario, data FROM leitura_dias WHERE data >= hoje-120` → um `Set` de datas por pessoa → `REGRAS.simularOfensiva` por membro de verdade de cada célula ativa → `rankingDaChama` | só as linhas da janela (500 pessoas × até 120 dias, na prática bem menos), uma consulta só, e a mesma regra de ofensiva do app, não uma aproximação nova. A janela de 120 dias só poderia mudar um escudo guardado há mais de 4 meses; para o retrato de uma pessoa vale o painel do líder, que usa o histórico inteiro |
| **Frequência média por célula** | `SELECT proposito, AVG(presentes + visitantes) FROM celula_frequencia WHERE sem_encontro = 0 AND data > hoje-28 AND data <= hoje GROUP BY proposito` | encontros são poucos (uma linha por célula por semana) |
| **Evangelismo (frutos do mês)** | `evangelismoDoMes(contas, hoje)`: marcos de Minha caminhada (`decisao`, `batismo`, `celula`, `discipula`) com data no mês e no anterior | em memória, 4 datas por conta |
| **Saúde global (check-in)** | `SELECT usuario, data, corpo, mente, espirito FROM checkins WHERE data > hoje-7 AND data <= hoje` → vale o último de cada pessoa → % em baixa, média e alta por esfera | índice `checkins_data`; no máximo uma linha por pessoa por dia |

Tudo isso roda uma vez a cada 5 minutos, por `hoje`. O painel antigo (`painel.mjs`) continua como
estava, com o cache de 1 minuto dele; a tela pede os dois em paralelo e mostra o resto mesmo se a
parte nova falhar.

## 5. Privacidade e LGPD: o que decidimos

Dado de fé é sensível (LGPD, art. 11). As regras, na ordem em que valem:

1. **Admin nunca vê pessoa por pessoa.** O painel da igreja sai sem nome, @, e-mail ou texto
   (o teste confere com uma varredura do JSON). Célula tem nome; pessoa não.
2. **"Menos de 5"** (`MINIMO_PARA_MOSTRAR` de `painel.mjs`, a mesma regra do painel que já
   existia) em todo número que conta pessoas numa condição: marcos do mês, membros de uma célula
   no ranking e a base do check-in. Uma célula com menos de 5 membros aparece no ranking, mas
   "sem número": "1 de 2 com a chama acesa" apontaria para alguém. O check-in com menos de 5
   pessoas não mostra porcentagem nenhuma: 60% de 3 pessoas é quase um nome.
3. **Quem abriu e quem leu saem sem máscara**: são contas de uso do app, não de fé, e o painel
   já as mostrava assim.
4. **O líder vê só a própria célula**, e só quem conduz (`podeConduzir`): membro comum não recebe
   `painel` nem `atencao`, e `GET /api/painel/celula` responde 403. Os três blocos do líder são
   contagens; os nomes continuam só em "Precisam de atenção", que já existia, agora com o motivo
   mais rico. Nenhum gatilho usa o check-in (é do discípulo para o discipulador, não para a
   célula) nem o que a pessoa escreveu.
5. **Visitante não entra em conta nenhuma** (`membroDeVerdade`): nem na chama, nem no funil, nem
   na atenção. Entra na frequência só como presença no encontro, que o líder registrou.
6. **O funil é autodeclarado**: conta o que cada um marcou em Minha caminhada. O discípulo escolhe
   mostrar ou não os marcos ao discipulador (`mostrar.marcos`); na célula eles entram só como
   número da etapa, nunca com o nome, e a tela diz isso ("só números, para você saber por onde
   cuidar"). Se um dia a igreja preferir, o interruptor pode passar a valer também aqui.
7. **`leitura_dias` guarda só datas**: nenhuma lição, nota ou texto. Apagar a conta apaga as
   linhas, inclusive nos backups cifrados.
8. **Tom**: o ranking das células é uma porcentagem do dia, sem pódio, e a nota da tela diz que é
   para animar, não um placar. Nada de placar entre pessoas em lugar nenhum.

## 6. O que ficou de fora do MVP

- **Pré-agregado diário por célula** (uma tabela `celula_dia`): a célula tem 20 pessoas no máximo
  e o retrato dela já carrega essas 20; só faria sentido se o painel do líder virasse histórico
  (a chama semana a semana). Fica para quando houver pedido.
- **Check-in como gatilho do líder**: o check-in é da relação de discipulado; levar "mente baixa"
  para a célula mudaria o que a pessoa aceitou ao responder.
- **"Preparando-se para o batismo" por pedido de conversa**: quem toca "Quero conversar sobre o
  batismo" já aparece, com nome, para quem conduz (os pedidos de conversa do Juntos). Somar isso
  ao funil repetiria o que a tela já mostra; a etapa "decidiram seguir Jesus" cobre o momento.
- **Retenção por turma e D1/D7/D30** já existem no painel antigo; a inteligência acrescentou só a
  retenção simples ("ainda leem") para não duplicar.
- **Ranking por mais de uma medida** (frequência, cuidado): a frequência média já aparece ao lado;
  uma nota composta viraria placar.
- **Série histórica da chama das células** e **comparação mês a mês** fora dos frutos: pedem a
  tabela pré-agregada acima.
- **Postgres/Supabase**: não há migração; a seção 1 diz como ficaria.

## 7. Testes

`node ferramentas/teste-inteligencia.mjs` (servidor na porta 8351): as regras puras (chama com e
sem escudo, frequência com semana sem encontro e tendência, funil, ofensiva perdida com ponte de
escudo e recomeço, atenção com gatilhos e teto, ranking com "menos de 5", frutos do mês, saúde com
base mínima, adoção e retenção), a tabela `leitura_dias` (preenchimento na subida, sincronização
que entra e sai, views, apagar pessoa) e, com servidor, quem vê o quê e a ausência de nomes na
saída da igreja. Os testes que já existiam (`teste.mjs`, `teste-db`, `teste-celula`,
`teste-discipulado`, `teste-senha-painel`, `teste-propositos-regras`, `teste-desafios-grupo`)
continuam passando.

Para ver as telas cheias: `design/ferramentas/semear.mjs` e depois
`design/ferramentas/semear-inteligencia.mjs` (duas etapas, o cabeçalho do arquivo explica), com o
servidor subido com `CAMINHO_ADMIN=marcos`.
