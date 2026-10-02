# Ferramentas das análises de produto

Scripts de leitura do app (nada aqui grava no repositório nem nos dados de ninguém): sobem um
Chrome sem interface, falam com um servidor de teste e escrevem em uma pasta de saída. Os métodos
que os usam, com o passo a passo e as armadilhas, estão em `.claude/skills/`:

| Skill | Pergunta | Ferramentas |
|---|---|---|
| `jornada-usuario` | quantos toques, folhas e palavras até o primeiro valor, no dia 1 e nos dias seguintes? | `jornada.mjs`, `relogio.mjs` |
| `analise-retencao` | por que a pessoa some nos primeiros dias, e o que medir no código e no painel? | `jornada.mjs` e as métricas de `painel.mjs`/`inteligencia.mjs` |
| `revisao-uiux` | o que está cortado, ilegível, pequeno demais, mal escrito ou fora da paleta? | `rev.mjs` + `checar-uiux.js` + `rotas/`, `fundo.mjs`, `strings.mjs`, `textos-tela.mjs`, `../contraste-v2.mjs` |

Peças comuns: `cdp.mjs` (abre o Chrome pela porta de depuração e o fecha direito, para o perfil
guardar cookie e localStorage) e `relogio.mjs` (o relógio deslocado em dias, no servidor via
`node --import` e na página via `codigoDoDesvio`).

Tudo roda a partir da raiz do repositório, com `CHROME=<executável do Chrome>` e depois de
`node build.mjs`. As saídas vão para `SAIDA=` ou para `capturas/analise/`, que o git ignora.
