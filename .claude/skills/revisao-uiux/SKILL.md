---
name: revisao-uiux
description: Revisa a interface do Geração Eleita V2 em cinco frentes (caixas, alinhamento, texto, cor e toque) com as ferramentas de design/ferramentas/analise: a varredura de rotas com o verificador no DOM (rev.mjs + checar-uiux.js e os catálogos em rotas/), a medida do que fica sob a barra de abas (fundo.mjs), a extração dos textos literais e dos compostos em tempo de execução (strings.mjs, textos-tela.mjs) e o contraste das fichas da paleta (contraste-v2.mjs), com os critérios (WCAG AA 4,5:1 e 3:1, alvo de 44px, nada sob a barra, concordância, um nome só para cada coisa) e o que pode ou não mudar no visual aprovado. Use depois de qualquer mudança visual ou de texto, antes de publicar, e quando pedirem "revisa a UI", "tá cortando", "alinhamento", "contraste", "concordância", "um nome só" ou "acessibilidade".
---

# Revisão de UI/UX

Cinco frentes, uma de cada vez, cada uma com a ferramenta que mede e o critério que decide. O
método vem das rodadas que já entraram no histórico (`git log --grep="Revisão, rodada"`): medir no
DOM em todas as rotas, nos dois temas e em duas larguras, corrigir por frente, e entregar um commit
por frente com os números no texto.

## 1. O que pode e o que não pode mudar

Pode:
- CSS das camadas `src/estilo-v2/21-trilha.css` a `26-avulsas.css` (uma por grupo de telas) e, para
  peças compartilhadas, `01-base.css`. Cada camada tem orçamento: o `index.html` tem teto de 1 MB e
  o build imprime a folga.
- Classes e estrutura do HTML gerado, desde que os seletores que o JS e os testes usam continuem
  existindo (`grep -rn "<classe>" src/app ferramentas/teste-*.mjs` antes de tirar uma classe).
- Textos só para ficarem certos (concordância, acento, um nome por coisa, maiúscula e ponto nos
  avisos), nunca para mudar o sentido ou o tom.

Não pode:
- A paleta C em `src/estilo-v2/00-tokens.css` (aprovada pelo dono; cor nova só com ele) e cor
  literal que valha só num tema: tudo por ficha `var(--...)`.
- O carimbo em pincel: `.selo-lema`, `.selo-linha`, `.selo-com-cruz`, `.selo-cruz`, `.selo-ref` (entrada
  e folha da ofensiva) e as fichas `--selo-bloco`/`--selo-texto`. Nenhuma regra nova pode mirar
  essas classes; o contraste baixo dele e da arte de João 14.6 na entrada é de propósito.
- Lógica, conteúdo, `data-*`, handlers, fluxos, `src/estilo.css` (congelado), `src/index.html`,
  `src/fontes.css` (Manrope, Literata, Permanent Marker e Oswald), as decisões do dono em
  `design/guia-visual.md` (folha do topo, cartões sálvia, trilha, barra em duas ilhas).
- Nada de emoji, degradê decorativo, sombra em cartão, borda cinza em volta de cartão, caixa-alta
  forçada, fonte abaixo de 12px, lamparina.

## 2. Preparar

```sh
cd <raiz do repositório>
export CHROME=<executável do Chrome>      # nesta máquina, um .sh que chama o chromium com --no-sandbox
node build.mjs                            # confira a folga até 1 MB na última linha
S=/tmp/revisao && mkdir -p $S/estado      # qualquer pasta fora do repositório
CAMINHO_ESTADO=$S/estado/estado.json CAMINHO_ADMIN=marcos nohup node servidor.mjs 8686 > $S/estado/servidor.log 2>&1 &
echo $! > $S/estado/servidor.pid
for i in $(seq 1 40); do curl -sf http://127.0.0.1:8686/api/existe-conta > /dev/null && break; sleep 0.3; done
BASE=http://localhost:8686/ SAIDA=$S/estado node design/ferramentas/semear.mjs      # só numa pasta vazia
# o id da Célula Esperança, para as rotas #/novidades/celula/<id>
export CELULA=$(curl -s -H "cookie: $(cat $S/estado/cookie-marcos.txt)" http://localhost:8686/api/propositos \
  | node -e "let s='';process.stdin.on('data',(d)=>s+=d).on('end',()=>{const c=(JSON.parse(s).propositos||[]).find((p)=>p.celula&&p.criadoPor==='marcos');console.log(c?c.id:'')})")
```

As contas (senha `senha123`): **marcos** (dia 42, líder da célula, conduz o davi, admin: barra
cheia), **ana** (membro da célula), **davi** (discipulado), **rute** (só amiga: barra padrão com
Desafios) e **lia** (Conhecer Jesus). Para o painel da igreja cheio, some `semear-inteligencia.mjs`
(etapa `api` com o servidor de pé, etapa `banco` com ele parado, e suba de novo).

Para parar: `kill "$(cat $S/estado/servidor.pid)"` (se não cair em 2 s, `kill -9`). Nunca `pkill -f`
com um padrão que apareça na sua própria linha de comando. Depois de cada `node build.mjs` que mude
JS, reinicie o servidor: a CSP libera os scripts pelo hash calculado na subida, e sem reiniciar a
página fica parada na abertura. Não rode o build enquanto uma varredura estiver rodando.

## 3. As cinco frentes

Todas as medidas saem da varredura, que abre cada trabalho (rota × largura × tema), rola em
segmentos, fotografa e roda `checar-uiux.js` no DOM de cada segmento:

```sh
# por conta: o catálogo em design/ferramentas/analise/rotas/<conta>.mjs e o cookie da conta
R="CHROME=$CHROME BASE=http://localhost:8686/ SAIDA=$S/rev"
env $R                                        node design/ferramentas/analise/rev.mjs rotas/avulsas.mjs av-
env $R COOKIE="$(cat $S/estado/cookie-lia.txt)"    node design/ferramentas/analise/rev.mjs rotas/lia.mjs lia-
env $R COOKIE="$(cat $S/estado/cookie-rute.txt)"   node design/ferramentas/analise/rev.mjs rotas/rute.mjs rute-
env $R COOKIE="$(cat $S/estado/cookie-ana.txt)"    node design/ferramentas/analise/rev.mjs rotas/ana.mjs ana-
env $R COOKIE="$(cat $S/estado/cookie-davi.txt)"   node design/ferramentas/analise/rev.mjs rotas/davi.mjs davi-
for c in a b c d; do env $R COOKIE="$(cat $S/estado/cookie-marcos.txt)" node design/ferramentas/analise/rev.mjs rotas/marcos-$c.mjs m$c-; done
# só parte de um catálogo: o terceiro argumento é uma regex sobre "nome-largura-tema"
env $R COOKIE="$(cat $S/estado/cookie-rute.txt)" node design/ferramentas/analise/rev.mjs rotas/rute.mjs rute- 'inicio-390|balao'
# SEGS=0 mede sem fotografar; SO=<regex> filtra pelo nome da rota ainda no catálogo
```

Saída: `SAIDA/fotos/<prefixo><nome>-<largura>-<tema>[-segmento].png` e
`SAIDA/rel/<prefixo>relatorio.json` (um objeto por trabalho com as listas abaixo e `textos`, tudo o
que estava escrito). O catálogo `marcos-d.mjs` conclui os dias 43 a 48 de verdade (festa, pensar,
orar, escrever, fundo, resumo): semeie de novo para repetir. As rotas de célula precisam de
`CELULA`; sem ela são puladas com aviso.

### Caixas (o que corta, sobra ou vaza)

- Listas do relatório: `cortado` (texto maior que a caixa sem reticências), `reticencias` (corte com
  `text-overflow`/`line-clamp`: nome de pessoa, título ou referência cortados são defeito), `colados`
  (dois controles a menos de 6px), `atras` (conteúdo que termina debaixo da barra de abas com a
  página rolada até o fim), `vazios` (estado vazio sem ação nem orientação).
- A barra, direto: `fundo.mjs` rola cada rota até o fim em 360 e 390 e diz o pior elemento sob a
  barra (`pior`) e o tamanho de cada aba (`abas`, todas com 44px ou mais):
  ```sh
  CHROME=$CHROME BASE=http://localhost:8686/ COOKIE="$(cat $S/estado/cookie-marcos.txt)" \
    node design/ferramentas/analise/fundo.mjs '#/' '#/passos' '#/missoes' '#/novidades' '#/celula' '#/discipulado' '#/perfil' '#/explorar' '#/config'
  ```
  Respiro do fim da tela: `--alt-barra` (108 no celular, 0 no computador), também nos botões flutuantes.
- Quebras já vistas (não deixe voltar): "1 / Timóteo", "com / Ana", "Versículos / guardados", nome de
  unidade com palavra sozinha (`text-wrap: balance` nos títulos, `pretty` no corpo, espaço inseparável
  entre número e livro), balão da trilha cobrindo o cartão de hoje, `.ir-atual` cobrindo o último cartão.

### Alinhamento (o que está fora da grade)

- Olhe as capturas de `SAIDA/fotos` lado a lado por rota: 360 e 390, claro e escuro. O que se compara:
  margem lateral igual à do Início (a referência é a tela Início da conta rute, `rute-inicio-390-claro-0.png`),
  números de cartões vizinhos na mesma linha de base, ícone e rótulo centrados no mesmo eixo, título
  centralizado quando há botão de voltar, botões redondos de 48px alinhados pelo centro.
- Para medir em vez de olhar: `av()` de `cdp.mjs` com `getBoundingClientRect()` dos dois elementos a
  comparar, num script de três linhas (veja `fundo.mjs` como molde); anote a diferença em px no commit.
- A 1280px o trilho lateral substitui a barra (`@media (min-width: 860px)` em `src/estilo.css`): um
  trabalho com `w: 1280` no catálogo confere o computador.

### Texto (o que está escrito e como)

```sh
node design/ferramentas/analise/strings.mjs > $S/strings.txt       # os literais dos fontes, "arquivo:linha<TAB>texto"
node design/ferramentas/analise/textos-tela.mjs $S/strings.txt $S/rev/rel > $S/textos-runtime.txt   # só o que nasce em tempo de execução
TUDO=1 node design/ferramentas/analise/textos-tela.mjs $S/strings.txt $S/rev/rel > $S/textos-todos.txt
```

- Listas do relatório: `concord` ("1 dias", "2 pessoa": o regex pega plural e singular trocados em
  textos compostos) e `sinal` (espaço duplo, espaço antes de pontuação, "...", "(s)", "vc", "pq" e
  "acento?" para palavras comuns sem acento).
- Critérios: concordância de número e gênero em textos montados com variáveis (`CC.plural`);
  **um nome só para cada coisa** (a aba é "Juntos", o feed dentro dela é "Novidades"; "Desafios" é a
  aba e "Missões" são as do dia; "Trilha", "Primeiros passos", "Conhecer Jesus", "Célula",
  "Discipulado", "Explorar", "Praticar"): procure o mesmo conceito com dois nomes em `textos-todos.txt`;
  maiúscula e ponto nos avisos de erro; sem travessão (o `teste.mjs` reprova travessão no conteúdo e
  o guia estende a regra à interface), sem emoji na interface, sem "vc"; português de conversa,
  sem jargão de igreja sem explicação; frases dirigidas ao leitor sem marcar gênero ("cansado" →
  "o que me cansa"), como nas revisões de `docs/revisao-2026-09-29`.
- Onde os textos moram: `src/app/*.js` (os literais), `src/entrar.html`, `privacidade.html`,
  `termos.html`; os textos dos lembretes em `notificacoes.mjs` (`T`); o conteúdo do plano e das notas
  em `conteudo/` (é revisão de conteúdo, outra frente: `ferramentas/reflexoes/`).

### Cor (contraste e paleta)

```sh
node design/ferramentas/contraste-v2.mjs      # as fichas de 00-tokens.css, par a par, nos dois temas
```

- Listas do relatório: `contraste` (texto abaixo de 4,5:1, ou 3:1 em texto grande: 24px, ou 18,66px em
  negrito), `bordas` (contorno de campo, pílula, segmentado ou chip abaixo de 3:1 contra o fundo),
  `icones` (ícone sozinho, sem fundo próprio, abaixo de 3:1).
- Critérios: WCAG AA, 4,5:1 para texto e 3:1 para texto grande, ícones e contornos que carregam
  estado; texto bíblico 7:1 no leitor; nenhum estado dito só por cor (ícone ou forma junto); só fichas
  da paleta C, e `grep -rn "#[0-9a-f]\{6\}" src/estilo-v2/2*.css` tem de devolver só o que já foi
  aceito (hoje nada além dos tokens).
- Falsos positivos conhecidos: o carimbo em pincel (`.selo-lema > .selo-linha`, 1,3:1 no escuro) e a
  arte de João 14.6 na entrada são de propósito; texto em cima de imagem ou degradê sai como `null` e
  não é medido; o que está desabilitado não conta.

### Toque (alvos e resposta ao dedo)

- Listas do relatório: `alvo` (controle menor que 44px em qualquer lado, fora os inline dentro de
  parágrafo), `colados`, `semNome` (botão sem nome acessível), `imgSemAlt`, `semRotulo` (campo só com
  placeholder).
- Critérios: alvo de 44px ou mais (`.pequeno` já tem 44; as abas da barra, 44 a 360px), `:active`
  em tudo que se toca (linha de lista, atalho, cartão, botão redondo), confirmação antes de qualquer
  ação sem volta (apagar nota, recado, estudo, conta: `CC.confirmar`), `preventScroll` ao focar
  dentro de folha, nada que só funcione com hover.

## 4. Ler o relatório e separar o ruído

Cada entrada traz o caminho do elemento (`pai > tag#id.classe`), o número medido e o começo do texto.
Antes de corrigir, abra a captura do segmento e confirme. Ruídos que já conhecemos:

- `atras` só vale com a página rolada até o fim: em trabalhos `soTopo` (balão, Mais, quiz) o que
  aparece ali é a rolagem parada no topo, não defeito.
- `vazios` pega `.estado-dupla` ("Ana já leu hoje"), que não é estado vazio; e textos "Nenhum..."
  logo acima de um botão em outro bloco.
- `contraste` do carimbo em pincel e da arte da entrada (de propósito).
- `concord` em "1 de 2 leituras" não dispara; se disparar em "0 dias juntos", é defeito mesmo.
- `sinal` "acento?" em nomes próprios, siglas e seletores que escaparam do filtro de `strings.mjs`.
- `alvo` em `input[type=checkbox]` dentro de `label` já soma a área do rótulo.

## 5. Larguras, temas e o que conferir sempre

360 e 390 de largura (320 só para a barra de abas), claro e escuro, e 1280 para o trilho lateral.
Em toda rodada: Início das contas rute, marcos e lia; a lição e o leitor; Juntos; Perfil e
Configurações; a entrada sem conta. O resto conforme o que mudou (a tabela de grupos em
`design/mapa-telas.md` diz que arquivo desenha cada rota).

## 6. Entregar

1. **Um commit por frente**, no padrão do histórico: `Revisão, rodada N (frente): o que mudou`, com
   os números medidos no corpo ("as abas tinham 42px a 360px; agora 44"; "contraste 2,7:1 → 7:1").
   Nunca junte frentes num commit só.
2. Antes de cada commit: `node build.mjs` (folga até 1 MB), `node teste.mjs`, `node design/ferramentas/contraste-v2.mjs`
   e os testes de navegador das telas tocadas, com `CHROME=<chrome>`: `teste-redesenho.mjs` (cadastro,
   trilha, lição, Feed, Missões, perfil, configurações), `teste-celula.mjs`, `teste-discipulado.mjs`,
   `teste-inteligencia.mjs` (painéis), `teste-instalar.mjs`, `teste-app-ios.mjs`, `teste-escuro-forcado.mjs`
   (os fundos do tema escuro: `#1b1c1a` no app, `ESCURO_PORTAL` nas avulsas), `teste-pratica.mjs`,
   `teste-unidades.mjs`, `teste-leitor.mjs`, `teste-offline.mjs`. A bateria inteira passa hoje; mantenha.
3. **Antes e depois**: a mesma varredura com `SAIDA=$S/antes` e `SAIDA=$S/depois` (mesmos prefixos);
   as capturas ficam fora do git (`capturas/` é ignorada); cite o caminho e os nomes dos arquivos.
   Um `diff` dos dois `relatorio.json` mostra o que sumiu e o que apareceu.
4. Quando a rodada for grande, um resumo em `docs/revisao-<AAAA-MM-DD>/` no tom dos anteriores:
   o que foi medido, o que mudou por frente, o que ficou de fora e por quê, e as decisões para o dono
   em lista `- [ ]`.

## 7. Armadilhas conhecidas

- Especificidade: as camadas entram na ordem `estilo.css` → `00` → `01` → `21`...`26`; uma regra do
  `estilo.css` com mais classes só perde para um seletor tão forte; para o celular, `@media (max-width: 859px)`.
- Um `</style>` dentro de um CSS (até em comentário) para o build.
- As folhas rolam dentro de `.folha` (`rolar: '.folha'` no catálogo) e a lição dentro de
  `.licao-palco`: sem isso a varredura mede só o topo.
- `?r=<n>` na URL de cada trabalho força a recarga quando só o hash muda; sem ele a tela anterior
  contamina a medida.
- Dados semeados valem para o dia da semeadura: noutro dia, apague a pasta e semeie de novo.
- Chrome sem interface: `foto-conta.mjs` e `cdp.mjs` silenciam o convite de notificações e o
  tutorial de instalar por padrão; para ver essas folhas use `jornada-usuario`.

## 8. Padrões de interação já decididos (revisão do dia, 02/10)

- **Ação do dia e navegação não se misturam.** Nada de links sublinhados soltos entre o conteúdo e
  o botão principal. O que é ação sobre o conteúdo mora na peça dele (escrever fica no cartão do
  versículo, no lugar de "Nota", e se chama "Escrever" ou "Escrever mais" em todo lugar); o que
  leva a outra tela é uma linha de navegação com ícone, nome, contagem e seta (›), alvo de 44px
  ou mais ("Ir mais fundo · 38 notas ›"); o que leva a outro dia só aparece no fim ("Ler o dia N",
  no pé da última etapa).
- **Link dentro de parágrafo é `.link-inline`** (inline, sem caixa, `line-height: inherit`): o
  `.link-nota` tem `min-height: 44px` e `inline-flex`, e dentro de um parágrafo desce a linha.
- **Escolha parece escolha.** Botão com `aria-pressed` que a pessoa escolhe tem indicador (o
  círculo à esquerda, cheio quando escolhido) e borda/fundo sálvia no escolhido; o que não se
  escolhe não pode ter a mesma cara (frases de oração viram linhas de texto, sem cartão).
- **Etapa vencida encolhe para um lembrete** (o que a pessoa escolheu), com um botão
  `aria-expanded` para abrir de novo.
- **Ícone figurativo se confere no tamanho de uso** (20px no círculo e no botão), não só
  ampliado; se o traço não se lê pequeno, silhueta cheia (como chama, coroa e as mãos de orar).
- **A lição se fotografa rolando o `.licao-palco`** em pedaços do tamanho da janela; aumentar a
  janela até caber tudo muda o layout (faixa vazia em cima) e não é o que a pessoa vê.
