# Mapa das telas do redesenho (v2) e como testar

Base do redesenho sobre a versão nova do app (branch `redesenho-novo`). O guia é
`design/guia-visual.md` (versão 3). Este arquivo diz **quem mexe em quê**, para que seis grupos
redesenhem as telas em paralelo sem conflito, e **como rodar, semear e fotografar** o app.

## O que a base já fez

- `build.mjs`: depois do `src/estilo.css` entram, em ordem alfabética, todos os
  `src/estilo-v2/*.css` (os que terminam em `-avulsas.css` vão só para as páginas avulsas, no
  marcador `<style>/*ESTILO_V2*/</style>`). O CSS sai sem comentários e sem espaços sobrando
  (o que está entre aspas fica intacto). O build imprime o tamanho de cada camada e a **folga até
  1 MB** do `index.html` (o `teste.mjs` reprova acima disso). Um `</style>` escrito dentro de um
  CSS (até em comentário) faz o build parar.
- `src/fontes.css`: Manrope (interface, 400 a 800, só latim, sem hinting), Literata (texto bíblico,
  400 a 600, só latim, sem hinting), Permanent Marker e Oswald (carimbo, arquivos intocados). A
  Nunito saiu: nada do app a usa (ver a nota dos grupos 2 e 6).
- `src/estilo-v2/00-tokens.css`: as fichas do guia nos dois temas (`--v2-fundo`, `--v2-cartao`,
  `--campo`, `--contorno`, `--v2-tinta-forte`, `--v2-tinta`, `--v2-tinta-fraca`, `--salvia`,
  `--salvia-palido`, `--salvia-texto`, `--salvia-tinta`, `--v2-inverso`, `--v2-inverso-tinta`,
  `--barra`, `--barra-botao`, `--barra-icone`, `--barra-ativa`, `--v2-chama`, `--v2-chama-texto`,
  `--alerta`, `--realce`, `--veu`...) e as fichas antigas do `estilo.css` (`--fundo`, `--cartao`,
  `--tinta*`, `--acento`, `--verde`, `--azul`, `--inverso`, `--hoje`, `--vermelho`, `--chama`,
  `--fonte`, `--fonte-destaque`, `--raio*`...) apontadas para elas. Por isso o app inteiro já
  está na paleta nova e em Manrope. Cartões perderam a moldura (`--moldura: 0`).
- `src/estilo-v2/01-base.css`: tipografia, topo (retrato à esquerda, ofensiva em pílula à
  direita), barra de abas em duas ilhas com a Bíblia levantada (e o trilho lateral a partir de
  860px), painel Mais, botões, botão redondo, cartões e listas, cabeçalho de tela, pílulas, chips,
  selos, segmentado, campos, interruptor, barra de progresso, folhas, avisos, estados vazios,
  esqueleto e a folha da ofensiva.
- `01-nucleo.js`: ícones de traço (espessura 2 em todos) e os ícones da barra/Mais/retrato em traço,
  com os mesmos desenhos que o dono escolheu. `02-estado.js` e `index.html`: `theme-color` com o
  fundo novo.
- `ferramentas/teste-escuro-forcado.mjs`: o fundo escuro do app agora é `#1b1c1a`; o do portal
  (`ESCURO_PORTAL`, `#0d0d0d`) continua o de antes até o grupo 6 trocar; o ponto medido saiu de
  cima do retrato do topo.
- `design/ferramentas/`: `semear.mjs` (contas e dados de teste), `foto-conta.mjs` (captura com
  conta, tema, ação e página inteira) e `contraste-v2.mjs` (contraste das fichas novas).

## Regras para todos os grupos

1. Edite **só** os arquivos do seu grupo (tabela abaixo) e o **seu** CSS em `src/estilo-v2/`.
   Ninguém edita `src/estilo.css` (congelado), `00-tokens.css`, `01-base.css`, `build.mjs`,
   `src/index.html`, `src/fontes.css`, os arquivos da base nem os de outro grupo. Precisa de peça
   nova de base? Faça no seu CSS, escopada nas suas telas, e anote no commit.
2. O carimbo em pincel é intocável: `.selo-lema`, `.selo-linha`, `.selo-com-cruz`, `.selo-cruz`,
   `.selo-ref` (entrada e folha da ofensiva). Nenhuma regra pode mirar essas classes nem as fichas
   que a folha da ofensiva fixa para ele.
3. Não mude lógica, conteúdo (textos), `data-*`, handlers nem fluxos. Pode mudar classes e a
   estrutura do HTML gerado pelas suas telas, desde que os seletores que o JS e os testes usam
   continuem existindo (procure o nome em `ferramentas/teste-*.mjs` antes de tirar uma classe).
4. Cores só por fichas (`var(--...)`), nunca um literal que valha só num tema. Sem emoji, sem
   degradê decorativo, sem sombra em cartão, sem borda cinza em volta de cartão, nada abaixo de
   12px, alvos de toque de 44px ou mais, sem caixa-alta forçada.
5. **Orçamento**: o `index.html` tem teto de 1 MB. Com a base, sobram uns 48 KB para as cinco
   camadas do app: cada grupo tem **até 8 KB** depois de minificado (o build mostra o tamanho de
   cada camada). Prefira reaproveitar as peças da base a reescrever.
6. Especificidade: as camadas entram na ordem `estilo.css` → `00` → `01` → `21`...`26`. A mesma
   especificidade ganha quem vem depois; regras do `estilo.css` com mais classes (por exemplo
   `.navegacao.cheia .aba:not(.aba-central) .rotulo-aba`) só perdem para um seletor tão forte.
   Telas largas: o `estilo.css` tem um `@media (min-width: 860px)` no meio do arquivo; se a sua
   regra de celular estragar o computador, ponha-a em `@media (max-width: 859px)`.
7. Commits com `git -c user.name="Excannor" -c user.email="marcos.estevaobs@gmail.com" commit -F <arquivo>`,
   mensagem em português terminando nas duas linhas de coautoria da sessão.

## Peças da base (use nas suas telas)

| Peça | Classe / ficha |
|---|---|
| Cartão branco, raio 28, sem borda nem sombra | `.cartao` (ou fundo `var(--cartao)` + `border-radius: var(--raio-cartao)`) |
| Lista num cartão só, com divisória fina | `.caixa-lista`, `.lista-atalhos`, `.caixa-config`, `.atalho`, `.linha-config` |
| Botão principal (pílula preta/clara) | `.botao`; acento sálvia: `.botao.cor` / `.botao.azul`; secundário: `.botao.contorno`; texto: `.botao.plano`; `.pequeno` (44px) |
| Botão redondo de ícone (48px) | `.botao-redondo` (branco), `.botao-redondo.salvia`, `.botao-redondo.inverso`; `.botao-icone` já é redondo |
| Cabeçalho de tela | `CC.botaoVoltar()` + `<h1>` logo depois já ficam na mesma linha, título centralizado. Com ações à direita: `<div class="cabeca-centro">[voltar ou <span class="vao">] <h1> [<div class="acoes-cabeca">]</div>`; subtítulo: `.subtitulo-tela` |
| Título de seção | `CC.tituloSecao()` (`.titulo-secao`) |
| Realce do item de hoje/selecionado | `.realce` ou `background: var(--realce)` |
| Círculo de ícone | sálvia pálido: `background: var(--salvia-palido); color: var(--salvia-texto)`; neutro: `var(--campo)` |
| Pílulas, chips, selos | `.pilula` (`[aria-pressed=true]` ou `.ativa` = escura), `.chip`, `.selo-status` (com o visto) |
| Controle segmentado | `.segmentado` (ativo em pílula escura) |
| Campos e interruptor | `.campo`, `.campo-senha`, `.busca-caixa`, `.seletor-config`; `.interruptor` dentro de `[role=switch]` |
| Estados | `CC.estado({icone, titulo, texto, acao})`, `.vazio`, `CC.esqueleto(forma)` |
| Avisos | `CC.avisar()`, `.aviso-cadeado`, `.estado-linha` |
| Letras | `var(--fonte)` (Manrope) e `var(--fonte-biblia)` (Literata, só texto bíblico e referências no leitor e nas citações) |
| Números | o corpo já é `tabular-nums` |

Fichas de medida: `--raio-cartao` (28), `--raio-folha` (32), `--raio-campo` (18), `--botao-redondo`
(48), `--alt-topo` (64), `--alt-barra` (108 no celular, 0 no computador: use em botões flutuantes
e no respiro do fim da tela).

## Os grupos

Arquivos da **base** (só a base edita): `build.mjs`, `src/index.html`, `src/fontes.css`,
`src/estilo.css` (congelado), `src/estilo-v2/00-tokens.css`, `src/estilo-v2/01-base.css`,
`src/app/00-qrcode.js`, `01-nucleo.js`, `01c-arte.js`, `02-estado.js`, `02b-jogo.js`
(só lógica), `10-roteador.js` (topo, barra, painel Mais, folha da ofensiva, avisos da abertura),
`ferramentas/*` e `design/*`.

| # | Chave | Grupo | Arquivos JS (exclusivos) | CSS | Rotas e estados |
|---|---|---|---|---|---|
| 1 | trilha | Trilha e Conhecer Jesus | `03-trilha.js`, `03b-fala-do-dia.js`, `05-licoes.js`, `05b-conhecer.js` | `21-trilha.css` | `#/` (rute, marcos), balão do dia (tocar `.no.atual`), folha da unidade (`[data-guia]`), baú (`.no-bau`), botão flutuante `.ir-atual`; `#/passos` (= `#/licoes`); Conhecer Jesus com a conta **lia**: `#/` e `#/conhecer`, `#/conhecer/1` (dia, tela cheia), `#/perguntas`, `#/perguntas/<id>`, `#/seguir` |
| 2 | leitura | Lição, leitor, reflexão, Bíblia e versículos | `04-licao.js`, `04b-leitor.js`, `04c-reflexao.js`, `04d-biblia.js`, `04e-versiculos.js` | `22-leitura.css` | `#/dia/42` (lição do dia, marcos), leitor (na lição, `[data-ler]`), fim da lição e reflexão (marcar as passagens e `[data-concluir]`), `#/biblia`, `#/biblia/Gênesis`, `#/biblia/Gênesis/1` (leitor da Bíblia), barra do versículo (tocar num versículo), cartão do versículo e a imagem para compartilhar |
| 3 | desafios | Desafios e Praticar | `09-praticar.js`, `09b-missoes.js`, `09c-desafios.js` | `23-desafios.css` | `#/missoes` (rute: Desafios na barra; marcos: pelo Mais), folha de um desafio de vários dias (entrar num desafio), `#/praticar` (quiz: pergunta, acerto, erro, fim da rodada) |
| 4 | juntos | Juntos, propósitos, célula e discipulado | `08-amigos.js`, `08b-propositos.js`, `08c-discipulado.js` | `24-juntos.css` | `#/novidades` (rute, marcos, ana), folha do amigo (`[data-amigo]`), convite (`[data-convidar]`), toque, `#/novidades/propositos`, novo propósito, `#/novidades/bloqueados`, `#/celula` (marcos, ana), `#/novidades/celula/<id>` (o id sai de `GET api/propositos`), modo encontro, `#/discipulado` (marcos conduz, davi é conduzido), `#/perfil/discipulado`, folha "acompanhar na fé" |
| 5 | perfil | Perfil, conta, notificações, instalar, painel, Explorar e Apoiar | `06-explorar.js`, `07-perfil.js`, `07b-conta.js`, `07c-instalar.js`, `07d-notificacoes.js`, `07e-painel.js`, `09d-apoiar.js` | `25-perfil.css` | `#/perfil`, `#/perfil/conquistas`, `/trofeus`, `/versiculos`, `/escritos`, `/livros`, `/historia`; `#/config`, `#/config/textos`, `#/config/notificacoes`, `#/config/painel` (marcos é admin); folhas: instalar, completar cadastro, consentimento, privacidade, trocar senha, apagar conta; `#/explorar`, `#/secao/11%20-%20Pessoas`, `#/nota/11%20-%20Pessoas%2FDavi`, `#/busca/davi`; `#/apoiar` |
| 6 | avulsas | Entrada, privacidade e termos | `src/entrar.html`, `src/privacidade.html`, `src/termos.html` (e a constante `ESCURO_PORTAL` de `ferramentas/teste-escuro-forcado.mjs`) | `26-avulsas.css` | `entrar.html` (boas-vindas, cadastro em 3 passos, entrar, senha esquecida, sem sessão), `privacidade.html`, `termos.html` |

Notas por grupo:

- **1 · trilha**: estrada em zigue-zague sobre o fundo, nós como no guia (lido `--inverso`, hoje
  `--salvia` com anel, travado `--cartao` com contorno, fecha-livro escuro com ícone sálvia), "Dia N"
  e passagem ao lado; o cartão de hoje com `--realce`; o balão não pode cobrir o cartão de hoje; o
  `.ir-atual` não pode cobrir o último cartão (use `--alt-barra`).
- **2 · leitura**: Literata 18 a 19px, entrelinha 1,7, ~65 caracteres, texto `--tinta` sobre
  `--cartao`. A imagem do versículo (canvas em `04e-versiculos.js`) ainda pede `Nunito`, que saiu
  do app: troque por `Manrope` (a Oswald continua embutida). Espaço inseparável entre número e
  livro nas referências.
- **3 · desafios**: o herói `.cabeca-missoes`/`.cabeca-pratica` hoje é uma chapa escura grande:
  vire cartão com número em bold e botão redondo sálvia. Estrelas vazias visíveis.
- **4 · juntos**: é o maior grupo (`08b-propositos.js` tem 1.600 linhas); "0 dias juntos" e
  selos com 12px ou mais; nada de "com / Ana" quebrado.
- **5 · perfil**: `.cabeca-passos` é do grupo 1; aqui ficam medalhas/troféus (a arte vem de
  `01c-arte.js`, da base: estilize pelo CSS), o nome editável no Perfil e o painel.
- **6 · avulsas**: as páginas avulsas **não** carregam `estilo.css`, `00-tokens.css` nem
  `01-base.css`; têm fichas próprias (`--fundo`, `--forte`, `--fraca`, `--verde`, `--inverso`...).
  O `26-avulsas.css` entra depois do estilo de dentro da página, pelo marcador; copie os valores do
  guia para essas fichas nos dois temas (`@media (prefers-color-scheme: dark)` +
  `:root[data-tema=...]`). O corpo pede `Nunito`, que saiu do `fontes.css`: troque por `Manrope`.
  O carimbo usa `--selo-bloco`/`--selo-texto`: não mexa. Ao trocar o fundo escuro do portal para
  `#1b1c1a`, atualize `ESCURO_PORTAL` em `ferramentas/teste-escuro-forcado.mjs`.

## Como testar nesta versão

Tudo a partir da raiz da worktree. O Chrome desta máquina:
`export CHROME=/tmp/claude-0/-home-user-geracao-eleita/f83429da-2006-5b51-8495-2381601c862d/scratchpad/chrome.sh`

### Build e testes

```
node build.mjs
node teste.mjs                                   # 183 checagens, sem navegador
CHROME=... node ferramentas/teste-<nome>.mjs      # os de navegador sobem servidor próprio em porta livre
node design/ferramentas/contraste-v2.mjs          # contraste das fichas novas nos dois temas
```

Não rode `node build.mjs` enquanto um teste de navegador estiver rodando na mesma pasta: eles
servem o `dist/` dela. Situação nesta máquina (na base e também no commit anterior, sem o
redesenho):

- `ferramentas/teste-banco.mjs` sai com 1: "sem dados JSON para ensaiar" (precisa dos dados reais).
- `ferramentas/teste-instalar.mjs` tem 12 falhas também antes do redesenho (ambiente sem instalação de PWA).
- `ferramentas/teste-pratica.mjs` e `ferramentas/teste-unidades.mjs` têm o caminho do Chrome do
  Windows escrito no código: rode uma cópia temporária dentro de `ferramentas/` com
  `sed "s#spawn('C:/Program Files/Google/Chrome/Application/chrome.exe'#spawn(process.env.CHROME#" ferramentas/teste-pratica.mjs > ferramentas/_tmp-pratica.mjs`
  e apague a cópia depois (não comite).
- Todos os outros `ferramentas/teste-*.mjs` e o `contraste.mjs` passam.

### Servidor de teste com dados

O `servidor.mjs` lê: a porta no primeiro argumento; `CAMINHO_ESTADO` (arquivo de estado; o banco
`caminho.db`, os backups e as chaves ficam na mesma pasta); `CAMINHO_ABERTO=1` (sem conta nenhuma,
entra direto como "caminho", sem amigos); `CAMINHO_ADMIN=<usuário>` (quem vê o Painel);
`CAMINHO_ENDERECO`, `CAMINHO_PUSH_TESTE`, `CAMINHO_RELOGIO`, `CAMINHO_TESTE` (só testes).

**A CSP do servidor libera os scripts pelo hash calculado quando ele sobe**: depois de cada
`node build.mjs` que mude JS, **reinicie o servidor**, senão a página fica parada na abertura.

Cada grupo usa porta e pasta próprias (sugestão: trilha 8101, leitura 8102, desafios 8103,
juntos 8104, perfil 8105, avulsas 8106; pasta `scratchpad/estado-<chave>/`):

```
S=/tmp/claude-0/-home-user-geracao-eleita/f83429da-2006-5b51-8495-2381601c862d/scratchpad
mkdir -p $S/estado-trilha
node build.mjs
CAMINHO_ESTADO=$S/estado-trilha/estado.json CAMINHO_ADMIN=marcos nohup node servidor.mjs 8101 > $S/estado-trilha/servidor.log 2>&1 &
BASE=http://localhost:8101/ SAIDA=$S/estado-trilha node design/ferramentas/semear.mjs   # só na pasta vazia
```

O `semear.mjs` cria cinco contas (senha `senha123`) e grava `cookie-<conta>.txt` na pasta:
**marcos** (dia 42, amigos, líder da célula "Célula Esperança", conduz o davi no discipulado,
propósito com a ana, admin do painel: barra cheia), **ana** (membro da célula: barra com Célula),
**davi** (discipulado: barra com Discipulado), **rute** (só amiga: barra padrão com Desafios) e
**lia** (caminho Conhecer Jesus). As datas saem do dia em que roda: noutro dia, apague a pasta e
semeie de novo para a ofensiva não zerar.

### Capturas

```
CHROME=$CHROME BASE=http://localhost:8101/ COOKIE="$(cat $S/estado-trilha/cookie-marcos.txt)" \
  node design/ferramentas/foto-conta.mjs 390 844 saida.png '#/' 0 claro      # ou escuro
```

Argumentos: largura, altura, arquivo, rota, rolagem (px), tema. Variáveis: `ACAO` (JS depois de
abrir, por exemplo `ACAO="document.querySelector('[data-ofensiva]').click()"`), `PRE` (JS antes
do app), `ESPERA` (ms, padrão 2600), `CHEIA=1` (a página inteira). As páginas avulsas: rota
`entrar.html`, sem `COOKIE`. O `ferramentas/foto.mjs` do repositório também funciona, mas sem
conta (`CAMINHO_ABERTO=1`): `CHROME=... node ferramentas/foto.mjs 390 844 saida.png '#/' http://localhost:8101/ 0 escuro`.

Varredura automática de defeitos: `scratchpad/rev/rev.mjs` (listas no formato de `rev/trab.mjs`,
`BASE=http://localhost:<porta>/`, `COOKIE=...`). Ele importa o `navegador.mjs` de outra pasta e
grava em `scratchpad/app/`: use uma cópia sua com o import trocado para
`<worktree>/ferramentas/navegador.mjs` e um prefixo próprio.

Confira sempre os dois temas, 360 e 390 de largura (e 320 na barra), e 1280 para o trilho lateral.
