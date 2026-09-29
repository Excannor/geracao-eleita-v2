# Sugestões de design (28/09/2026, Fable)

**Escopo:** só design das telas que já existem: layout e hierarquia, movimento e microinterações, estados (vazio, carregando, erro, ocupado), ícones e ilustração, tipografia, tema escuro, feedback das ações e consistência. Nada de função nova, fluxo de produto ou conteúdo.
**O que fica de fora:** tudo o que já está no `ux-polimento.md` (lote 1 publicado e lote 2 em aplicação, linhas 3055 a 3257 do `estilo.css`): moldura em três níveis, relevo só no que se aperta, divisórias, raios, pesos, rótulos em caixa-alta, heróis, campos, barra de baixo, escala de espaçamento e os ajustes por tela da seção 2. Onde uma sugestão daqui encosta numa dessas, digo o que ela acrescenta.
**Material:** as 25 capturas de `ux-depois/` a 390 px (todas as claras e 10 escuras), `src/estilo.css` (3257 linhas, com os dois lotes), `src/app/*.js` e `src/fontes.css`. Os pares de cor citados foram calculados pela fórmula da WCAG 2.1 a partir dos tokens do `:root`.
**Método:** as 10 heurísticas de usabilidade (H1 a H10) e a revisão de acessibilidade WCAG 2.1 A e AA, aplicadas às capturas e ao código que as monta.
**Identidade mantida:** cores, logo, Nunito e Oswald, os ícones aprovados da barra e das listas, a estrada da Trilha com os nós, o baú, a chama e os troféus por tipo. Nenhuma sugestão troca isso; várias o fazem render mais.
**Nenhum arquivo do app foi alterado.** Toda linha citada existe no arquivo indicado.

## Veredito

> ⚠️ **As peças já são de app feito à mão; o que ainda entrega "montagem" é o que acontece entre elas.**

A linguagem (cápsula, um acento só, cartão off-white, Oswald nos títulos, arte do fogo e do baú) está certa, e os dois lotes de polimento cuidaram do acabamento estático. O que um designer nota agora está no **comportamento**:

1. **Tudo entra animado e some de repente.** Folha, painel do Mais, lição, leitor, balão do nó e o aviso flutuante têm animação de entrada e nenhuma de saída (só a tela cheia e a abertura saem direito). É a diferença mais barata entre "site" e "app".
2. **A estrada da Trilha não existe.** O ícone da aba desenha uma estrada com faixa pontilhada, o comentário do `:root` (linha 142) promete "a linha da trilha muda de contínua para tracejada no trecho travado", e a tela mostra nós soltos no cinza. A identidade promete uma estrada que a tela não cumpre.
3. **Os estados não formam uma família.** Carregando é "quatro barrinhas de texto" em toda tela (até onde vai chegar uma roda de retratos); vazio tem duas classes (`.vazio` e `.vazio-amigos`); erro empresta de três lugares, inclusive da caixa teal que na paleta quer dizer "agora", não "falhou"; esperar a rede tem a mesma cara de "desligado".
4. **O escuro tem um controle invisível.** O segmentado (Hoje · Estudo · Oração · Pessoas; Sistema · Claro · Escuro) pinta a aba escolhida *mais escura* que o trilho: 1,03:1.
5. **Os números pulam.** "0 dias" vira "10 dias" e empurra a chama; contadores, versículos e placares sem `tabular-nums`.

Acessibilidade (WCAG 2.1 AA, avaliação visual): *riscos a corrigir*, nenhum bloqueador novo além dos que o polimento já lista. Os deste relatório: o segmentado no escuro (1.4.11), alvos de 34 e 42 px no leitor e no Feed (2.5.5, recomendação), rótulos de 8 px no Painel (legibilidade), e o botão "ocupado" com a mesma cara de "indisponível" (1.3.1 e 4.1.3: estado que precisa ser percebido e anunciado).

Legenda de esforço: **P** até uma hora · **M** meia a uma tarde · **G** mais de um dia. A ordem é impacto visual sobre esforço.

---

## As sugestões

### 1. Tema escuro: a aba escolhida do segmentado some, e os retratos ganham um anel preto

**Onde.** `09-celula-390-escuro.png` (Hoje · Estudo · Oração · Pessoas: "Hoje" é uma mancha um fio mais escura que o trilho), `21-config-390-escuro.png` (Sistema · Claro · Escuro), a folha "Aa" do leitor (Um por linha · Texto corrido; Tema), a folha "Novo propósito" (Plano · Livro · Oração), "Preparar o estudo" e "Pedir oração". Retratos: `10-discipulado` e `09-celula` (aba Pessoas) no escuro, e todo `.linha-amigo`.

**Hoje.** `.segmentado { background: var(--fundo-2) }` (linha 765) e `.segmentado button[aria-pressed="true"] { background: var(--cartao) }` (767). No claro isso é #dbdbdb com pílula #f7f7f7 (1,29:1, a pílula é mais clara e "sobe"). No escuro é #1a1a1a com pílula #171717: **1,03:1, e a pílula desce**. O lote 1 tirou o `box-shadow: 0 2px 0 var(--borda)` da pílula (3084), que era o último sinal. Sobra a cor do texto (branco 800 contra #9a9a9a 800) para dizer qual aba está ativa. Retratos: `.retrato-amigo { border: 2px solid var(--fundo) }` (1636) faz sentido sobre a página, mas dentro de um cartão #171717 o anel é #0d0d0d: um halo preto em volta de cada rosto. O app já resolve isso para pilhas e mini (`border-color: var(--cartao)`, linhas 1651 e 1718); falta generalizar.

**O que muda.** Uma superfície "levantada" é sempre mais clara que o trilho, nos dois temas; no escuro, um anel fino de 1 px em `--borda-controle` (token do lote 1, ≈ 3:1 sobre #111) garante o contorno que a WCAG 1.4.11 pede. O anel do retrato passa a ser da cor da superfície onde ele está.

**Como.** CSS, `src/estilo.css`, junto dos tokens do polimento:

```css
:root { --segmento-trilho: var(--fundo-2); --segmento-sel: var(--cartao); --segmento-anel: transparent; }
:root[data-tema="escuro"] { --segmento-trilho: #111111; --segmento-sel: #2c2c2c; --segmento-anel: var(--borda-controle); }
.segmentado { background: var(--segmento-trilho); }
.segmentado button[aria-pressed="true"] { background: var(--segmento-sel); box-shadow: inset 0 0 0 1px var(--segmento-anel); }
/* o anel do retrato é da superfície em que ele está */
.linha-amigo .retrato-amigo, .cabeca-amigo .retrato-amigo, .escolha-amigo .retrato-amigo,
.cartao-proposito .retrato-amigo, .cabeca-mural .retrato-amigo { border-color: var(--cartao); }
```

(`.cabeca-mural` está sobre a página, não sobre cartão: se preferir, tire da lista. Os outros quatro estão sempre dentro de cartão.)

**Esforço.** P. **Risco.** Nenhum; rodar `node ferramentas/contraste.mjs` (acrescentar o par `--segmento-sel`/`--segmento-trilho`) e `teste-escuro-forcado.mjs`.

### 2. Tudo o que entra animado sai animado: folha, painel do Mais, lição, leitor, balão do nó, aviso

**Onde.** Toda folha (ofensiva, convite, "Aa", unidade, confirmações), `25-mais-390-*.png`, o X da `02-licao`, o X do `04-biblia-leitor`, o balão do nó na `01-trilha`, o aviso "Copiado" em qualquer tela.

**Hoje.** Entradas: `.folha` com `folha-sobe .32s` (2024), `.painel-mais` com `folha-sobe .28s` (540), `.licao` e `.leitor` com `abrir-licao` (1118, 2468), `.pop-no` com `abrir-pop` (1060), `.aviso-flutuante` com `aviso-sobe` (1998). Saídas: `el.remove()` seco em `CC.folha` e `CC.confirmar` (`01-nucleo.js` 313 e 396-401), `CC.avisar` (299), `fecharPainelMais` e as duas remoções diretas (`10-roteador.js` 189, 227, 304), `CC.fecharLicao` (`04-licao.js` 24-29), `CC.fecharLeitor` (`04b-leitor.js` 111-115), `CC.fecharLeituraBiblia` (`04d-biblia.js` 210-215), `fecharPop` (`03-trilha.js` 261-264). Só `.tela-cheia.saindo` (1535, `01c-arte.js` 346-350) e `.abertura.saindo` fazem certo. Um painel que sobe suave e desaparece num quadro é o que mais denuncia página em vez de aplicativo; a saída de 180 ms é mais curta que a entrada de propósito (o app responde rápido ao "fechar").

**O que muda.** Um helper só, usado nos sete lugares, e uma animação de saída por peça: a folha desce e some, o painel do Mais desce, a lição e o leitor afundam 18 px e somem, o balão do nó encolhe, o aviso desce. Com `prefers-reduced-motion` nada anima (a regra global da linha 2721 já zera a duração).

**Como.** JS em `src/app/01-nucleo.js` (junto de `CC.folha`):

```js
// Tira uma peça da tela com a animação de saída dela. Idempotente: chamar duas vezes não
// remove duas vezes, e com "menos movimento" sai no ato.
CC.sair = (el, ms = 180) => new Promise((fim) => {
  if (!el || !el.isConnected) { fim(); return; }
  if (el.classList.contains('saindo')) { fim(); return; }
  if (CC.semMovimento()) { el.remove(); fim(); return; }
  el.classList.add('saindo');
  setTimeout(() => { el.remove(); fim(); }, ms);
});
```

Nos chamadores: `cortina.remove()` vira `CC.sair(cortina)` (a devolução do foco e o `resolver()` continuam imediatos); `fecharPainelMais` chama `CC.sair` no véu e no painel; `CC.fecharLicao`, `CC.fecharLeitor`, `CC.fecharLeituraBiblia` e `fecharPop` idem. Cuidado com a lição: `rotear()` chama `CC.fecharLicao()` a cada troca de rota e `desenhar()` reaproveita `document.querySelector('.licao')`; trocar por `querySelector('.licao:not(.saindo)')` para uma reabertura em menos de 180 ms não pegar o nó que está sumindo. E no arraste da folha (`arrastarParaFechar`, 330-376): ao passar dos 90 px, não zerar o `transform` antes de fechar; gravar `folha.style.setProperty('--dy', dy + 'px')` para a saída começar de onde o dedo largou.

CSS, `src/estilo.css`:

```css
@keyframes sumir { to { opacity: 0; } }
@keyframes folha-desce { from { transform: translateY(var(--dy, 0px)); } to { transform: translateY(28%); opacity: 0; } }
@keyframes fechar-tela { to { opacity: 0; transform: translateY(18px) scale(.985); } }
.cortina.saindo { animation: sumir .18s ease forwards; pointer-events: none; }
.cortina.saindo .folha { animation: folha-desce .2s var(--suave) forwards; }
.veu-mais.saindo { animation: sumir .18s ease forwards; }
.painel-mais.saindo { animation: folha-desce .2s var(--suave) forwards; }
.licao.saindo, .leitor.saindo { animation: fechar-tela .18s ease forwards; pointer-events: none; }
.pop-no.saindo { animation: abrir-pop .14s ease reverse forwards; }
.aviso-flutuante.saindo { animation: aviso-sobe .2s ease reverse forwards; }
```

**Esforço.** M (helper de 8 linhas, 7 chamadores, 12 linhas de CSS). **Risco.** Baixo a médio: é a única sugestão que toca a lição; rodar `teste-redesenho.mjs`, `teste-leitor.mjs` e `inspecionar.mjs 390` (o `Escape` do roteador procura `.cortina` e `.tela-cheia`: durante os 180 ms ele ainda acha a peça saindo, e isso é inofensivo).

### 3. A estrada da Trilha, desenhada de verdade

**Onde.** `01-trilha-390-claro.png` e `01-trilha-b-390-claro.png` (e escuro): nós, baú e troféu flutuam no cinza, sem nada os ligando; o ícone da aba (`ICONES_ABA.trilha`, `01-nucleo.js` 155-158) mostra uma estrada em curva com faixa pontilhada, marcador no começo e bandeira no fim.

**Hoje.** `.nos` empilha `.no-linha` deslocados por `--x` (`03-trilha.js` 52: `deslocamento(passo)`, amplitude 70 px). Não existe nenhum traço entre um nó e o próximo (nenhum `::before` em `.no-linha`, nenhum `dashed` fora de convite e vaga). O comentário do `:root` descreve uma linha contínua que vira tracejada no trecho travado e serve de sinal não dependente de cor; ela não está no CSS. O ux-polimento pediu para não mexer nos nós, no anel e na faixa: nada disso muda aqui; a estrada passa **por baixo**.

**O que muda.** Atrás dos nós de cada unidade aberta, um caminho suave (curvas entre os centros) em duas partes: a **percorrida**, contínua em `--inverso`, até o último dia lido; a **adiante**, pontilhada em `--trilho`, com o mesmo pontilhado da faixa do ícone. Fina (8 a 10 px), sem sombra, sem cor nova. Baú e troféu ficam sobre a estrada. Isso também dá o sinal de "travado" sem depender da cor, que é o que o comentário prometia.

**Como.** JS, `src/app/03-trilha.js`, chamado no fim de `CC.vistaTrilha` e num `resize` com atraso:

```js
// A estrada por baixo dos nós: medida na tela, porque cada linha tem altura própria
// (balão, baú, troféu). Um SVG por unidade aberta, atrás de tudo, sem toque.
function desenharEstrada(raiz) {
  raiz.querySelectorAll('.nos').forEach((nos) => {
    nos.querySelectorAll('.estrada').forEach((s) => s.remove());
    const caixa = nos.getBoundingClientRect();
    const pontos = [...nos.querySelectorAll('.no, .no-bau, .no-marco')].map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - caixa.left, y: r.top + r.height / 2 - caixa.top,
        feito: el.matches('.no.feito, .no-bau.aberto, .no-marco.ganho') };
    });
    if (pontos.length < 2) return;
    const curva = (a, b) => 'C' + a.x + ' ' + (a.y + (b.y - a.y) / 2) + ' ' + b.x + ' ' + (a.y + (b.y - a.y) / 2) + ' ' + b.x + ' ' + b.y;
    const trecho = (lista) => 'M' + lista[0].x + ' ' + lista[0].y + lista.slice(1).map((p, i) => curva(lista[i], p)).join('');
    const ultimoFeito = pontos.reduce((k, p, i) => (p.feito ? i : k), -1);
    const feita = ultimoFeito > 0 ? trecho(pontos.slice(0, ultimoFeito + 1)) : '';
    const adiante = trecho(pontos.slice(Math.max(0, ultimoFeito)));
    nos.insertAdjacentHTML('afterbegin', '<svg class="estrada" width="' + caixa.width + '" height="' + caixa.height + '" aria-hidden="true">'
      + '<path class="adiante" d="' + adiante + '"/>' + (feita ? '<path class="feita" d="' + feita + '"/>' : '') + '</svg>');
  });
}
```

CSS:

```css
.nos { position: relative; }
.nos .estrada { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.no-linha { position: relative; z-index: 1; }              /* o :has(.pop-no) com z-index 35 continua valendo */
.estrada path { fill: none; stroke-width: 9; stroke-linecap: round; stroke-linejoin: round; }
.estrada .adiante { stroke: var(--trilho); stroke-dasharray: 0.1 16; }
.estrada .feita { stroke: var(--inverso); }
```

**Esforço.** M (uns 40 linhas de JS e 8 de CSS, mais as capturas). **Risco.** Médio, porque é identidade: conferir a 320 e 390 nos dois temas que a estrada não compete com o nó de hoje (o anel `--hoje` continua sendo o ponto mais forte), e que o troféu de fim de unidade fica bem em cima da linha. Se o dono entender que "estrada" é só o nome, basta não aplicar; nada mais depende disto.

### 4. Números que não pulam: `tabular-nums` onde o número muda

**Onde.** Topo de todas as telas ("0 dias" vira "10 dias" e a chama anda para a esquerda), `05-desafios` ("21 dias", "0 / 1"), `16-conquistas` ("0/3", "2/5"), `17-trofeus` ("0 de 31"), `04-biblia-leitor` (os números dos versículos), Praticar ("1/8"), a folha da ofensiva ("7" → "10"), o resumo do dia (o número que conta com `CC.contar`), `19-historia` ("0 de 600 caracteres"), `23-painel`, a Célula ("0 de 1 pontos hoje").

**Hoje.** `font-variant-numeric: tabular-nums` está em três lugares (838, 1336, 2970). A Nunito é variável e tem algarismos tabulares (`fontes.css` 4-6). O número da ofensiva do resumo (`.numero-ofensiva`, 1262) cresce de 9 para 10 no meio da animação e a linha inteira se recentra a cada quadro.

**Como.** CSS, uma regra:

```css
.contador.ofensiva span, .chama-grande b, .numero-ofensiva, .quiz-contador, .leitor-verso sup,
.titulo-conquista span, .trofeu span, .dsf-stats b, .dsf-dias, .dias-cartao, .dias-dupla b,
.painel-cartao strong, .painel-barra .valor, .painel-coluna small, .dica-campo, .passo-dica[data-conta],
.rotulo-no, .faixa-unidade .rot, .contagem-amigos, .titulo-secao span, .conta-livro, .amigo-roda small,
.lendo-junto-linha, .linha-recorde b, .visao-item b { font-variant-numeric: tabular-nums; }
.numero-ofensiva { min-width: 2ch; text-align: center; }
.contador.ofensiva span { min-width: 1.2ch; text-align: right; }
```

(Os contadores de caracteres das folhas de recado, estudo e pedido são `p.passo-dica` marcados com `data-conta`, `data-conta-acolhida`, `data-conta-adoracao` e `data-conta-testemunho`: os quatro atributos precisam entrar na lista, um seletor cada.)

**Esforço.** P. **Risco.** Nenhum.

### 5. Tipografia fina: títulos equilibrados, parágrafos sem palavra órfã, hifenização em português

**Onde.** `12-nota` ("Do começo ao fim da Bíblia" e o corpo), `14-licao-passos`, `11-explorar` (as linhas de apoio de três linhas dos quadros), `22-notificacoes` ("Receba um toque na hora certa"), `13-passos` (o parágrafo do hero), `01-trilha` (a bolha de boas-vindas), a `.passo-dica` sob cada h1, `15-perfil` ("Sua primeira lição acende tudo isso!").

**Hoje.** `text-wrap: balance` só em `.cena h1` e `.frase-cena` (1250-1251); nenhuma hifenização; o `<html lang="pt-BR">` já está (index.html 2). Nunito a 1,05 rem em 358 px de coluna dá 8 a 9 palavras por linha, e quase todo parágrafo de duas linhas termina com uma palavra sozinha.

**Como.** CSS, melhoria progressiva (Chrome 117+, Safari 17.5+; quem não entende ignora):

```css
h1, h2, h3, .passagem-hoje, .dsf-nome, .cabeca-comece b, .bloco-secao b, .titulo-conquista b,
.cabeca-push b, .corpo-missao b, .item-licao .textos b { text-wrap: balance; }
p, .passo-dica, .bloco-secao span, .descricao-conquista, .item-licao .textos > span, .nota-corpo p,
.nota-corpo li, .leitor-verso, .cartao-versiculo blockquote, .pensamento-dia p, .item .resumo { text-wrap: pretty; }
.nota-corpo, .leitor-texto, .passo-dica, .item .resumo { -webkit-hyphens: auto; hyphens: auto; }
/* hífen em título condensado ou botão em caixa-alta parece quebrado */
h1, h2, h3, .botao, .rotulo-aba, .etiqueta, .balao, .faixa-unidade { -webkit-hyphens: manual; hyphens: manual; }
.leitor-texto { hanging-punctuation: first; }   /* a aspa de abertura dos versículos sai da margem (Safari) */
```

**Esforço.** P. **Risco.** Nenhum; olhar as capturas `-b` das notas a 320 depois.

### 6. Bíblia: o cartão "Leitura de hoje" em segundo plano

**Onde.** `03-biblia-lista-390-claro.png` e escuro.

**Hoje.** `.cartao-continuar { background: var(--inverso); color: var(--inverso-tinta) }` (2354): um bloco petróleo cheio logo abaixo do h1, com o mesmo peso do botão da Bíblia na barra (também petróleo cheio) 600 px abaixo, e do "COMEÇAR" da Trilha. Duas massas de nível 1 na mesma tela, numa aba onde a pessoa veio *escolher*, não ser empurrada. O próprio polimento (seção 4) elege os blocos suaves em `--acento-fraco` como "bom segundo nível de cartão".

**O que muda.** O cartão desce para o nível 2: fundo `--acento-fraco`, título em `--tinta-forte`, o olho e a seta em `--acento`, o azulejo do ícone em `--verde-fraco`/`--verde` como os outros azulejos do app. Continua sendo a primeira coisa que o olho pega (posição e azulejo), sem brigar com a barra.

**Como.** CSS:

```css
.cartao-continuar { background: var(--acento-fraco); color: var(--tinta-forte); }
.cartao-continuar small { color: var(--acento); opacity: 1; }
.cartao-continuar .icone-continuar { background: var(--verde-fraco); color: var(--verde); }
:root[data-tema="escuro"] .cartao-continuar .icone-continuar { background: color-mix(in srgb, var(--verde) 18%, transparent); }
.cartao-continuar > svg:last-child { color: var(--acento); }
.cartao-continuar:hover { filter: none; background: color-mix(in srgb, var(--acento) 12%, var(--acento-fraco)); }
```

Contraste: `--acento` sobre `--acento-fraco` = 6,6:1 no claro; no escuro `--acento` #5fbdb9 sobre #123230 fica acima de 7:1.

**Esforço.** P. **Risco.** Baixo; é decisão de hierarquia, fácil de reverter.

### 7. Trilha: dois "Começar" na mesma dobra, e nós travados que dizem qual dia são

**Onde.** `01-trilha-390-claro.png`: o botão do cartão diz COMEÇAR e, 90 px abaixo, o balão do nó diz COMEÇAR. `01-trilha-b-390-claro.png`: dez cadeados iguais em sequência.

**Hoje.** `03-trilha.js` 82 (`'<span class="balao">' + (feito ? 'Revisar' : 'Começar')`) e 166 (o botão "Começar" do cartão). O balão tem `pointer-events: none` (982): é rótulo, não botão, mas usa o verbo do botão. Nos nós travados `iconeDoDia` devolve `'cadeado'` para todos (56-62): a unidade aberta vira uma coluna de 30 cadeados, e a pessoa só descobre "que dia é este" tocando (o pop diz "Dia N de 365"). H6, reconhecimento em vez de lembrança: na estrada, a placa é o número.

**O que muda.** (a) O balão diz o **estado**, não a ação: "Hoje" (ou "Revisar", que já é estado). O verbo fica só no botão. (b) Os nós travados mostram o **número do dia** em Nunito 900 na `--tinta-travada`; o cadeado fica só no primeiro nó depois de hoje (a fronteira, dita uma vez) e no pop de qualquer nó adiante, que já explica "Este dia vem mais adiante, mas pode ler agora se quiser". O tom `--trilho` continua dizendo "travado", o check e a estrela continuam dizendo "lido" e "hoje": nenhum estado passa a depender só de cor.

**Como.** JS, `03-trilha.js`:

```js
function iconeDoDia(numero, feito, atual) {
  if (FECHA_LIVRO.has(numero) && (feito || atual)) return 'livro';
  if (feito && CC.temRegistro(numero)) return 'caneta';
  if (feito) return 'certo';
  if (atual) return 'estrela';
  // o primeiro dia depois de hoje leva o cadeado; os outros mostram o número
  return numero === CC.diaAtual() + 1 ? 'cadeado' : '';
}
// em no(): '<span class="face">' + (icone ? CC.ico(icone) : '<b>' + numero + '</b>') + '</span>'
// e o balão: (feito ? 'Revisar' : 'Hoje')
```

CSS: `.no.travado .face b { font: 900 .95rem/1 var(--fonte); font-variant-numeric: tabular-nums; color: var(--tinta-travada); }`.

**Esforço.** P a M. **Risco.** Médio: o cadeado em todos os nós foi escolha ("para não parecer que tocar abre", 03-trilha.js 60). O pop já cuida de quem toca; se o dono preferir os cadeados, aplicar só (a). O `inspecionar.mjs` (112) só confere que `.balao` existe.

### 8. Uma família só para vazio e erro: azulejo, título, linha de apoio e ação

**Onde.** `08-propositos` (nada embaixo do botão até os dados chegarem), `18-versiculos` (na captura, um parágrafo à esquerda e o resto em branco; o código de hoje já monta `.vazio-amigos`), `23-painel` (erro em texto solto), Explorar com busca de uma letra ("Digite pelo menos duas letras" num `.vazio`), Bíblia sem rede (`.vazio` sem "Tentar de novo"), Juntos sem servidor (uma caixa **teal** dizendo "Não consegui falar com o servidor agora", `08-amigos.js` 636 e `08b-propositos.js` 493), leitor sem rede (`.leitor-aviso`, o único com ícone, texto e botão de tentar de novo).

**Hoje.** Duas famílias de vazio: `.vazio` (668: texto centrado, 48 px de respiro, sem ícone; 12 usos) e `.vazio-amigos` (1847: glifo de 40 px em `--tinta-travada`, parágrafo, botão opcional; 11 usos). Três de erro: `.aviso-cadeado` (732, fundo `--azul-fraco`), `.vazio` e `.leitor-aviso` (2557). A caixa teal é, na paleta do app, "agora, ação, dica" (é o mesmo bloco do "Mostrar seus marcos aos amigos?" e do "Leia hoje para acender"); usada para "falhou", vira dica. O polimento (S9, 2.8, 2.18, 2.23) manda aplicar `.vazio-amigos` em três telas; esta sugestão é o componente, para os 23 lugares falarem a mesma língua.

**O que muda.** Um `.estado` só: ícone dentro de um azulejo de 56 px (`--raio-p`, `--verde-fraco`/`--verde`, como `.icone-secao` e `.painel-mais .q`), título curto em Nunito 800, linha de apoio em `--tinta-fraca` 600 até 300 px, ação opcional em botão pequeno de contorno. A variante `.erro` troca o azulejo para neutro (`--fundo-2`/`--tinta-fraca`): "não consegui" não é aviso vermelho (o vermelho fica para o que a pessoa fez errado, `.recado-senha`) nem dica teal. Os nomes antigos viram apelidos da mesma regra, então nenhum HTML quebra.

**Como.** CSS:

```css
.estado, .vazio, .vazio-amigos, .leitor-aviso { display: grid; justify-items: center; gap: 6px; padding: 32px 16px; text-align: center; color: var(--tinta-fraca); font-weight: 600; }
.estado-ico { display: grid; place-items: center; width: 56px; height: 56px; margin-bottom: 4px; border-radius: var(--raio-p); background: var(--verde-fraco); color: var(--verde); }
.estado-ico svg { width: 26px; height: 26px; }
.estado > b { color: var(--tinta-forte); font-size: 1rem; }
.estado > p { margin: 0; max-width: 300px; }
.estado .botao { width: auto; margin-top: 8px; }
.estado.erro .estado-ico { background: var(--fundo-2); color: var(--tinta-fraca); }
```

JS, `01-nucleo.js`: `CC.estado = ({ icone = 'info', titulo, texto, acao, erro }) => '<div class="estado' + (erro ? ' erro' : '') + '"><span class="estado-ico">' + CC.ico(icone) + '</span>' + (titulo ? '<b>' + CC.esc(titulo) + '</b>' : '') + '<p>' + CC.esc(texto) + '</p>' + (acao ? '<button class="botao contorno pequeno" data-acao-estado>' + CC.esc(acao) + '</button>' : '') + '</div>'`; `CC.vazio(raiz, mensagem)` (`06-explorar.js` 556) passa a montar por ele. Os três erros ganham "Tentar de novo": `erroDeCarga` (`04d-biblia.js` 39, chamando `listar` de novo), o `aviso` do Juntos (`08-amigos.js` 573 e 702: uma linha `.estado.erro.linha` acima do conteúdo guardado, "Mostrando o que estava guardado"), e o Painel (`07e-painel.js` 76).

**Esforço.** M. **Risco.** Baixo (apelidos mantêm o que existe). Não repete S9: S9 são os lugares; isto é a peça.

### 9. Carregando com a forma do que vai chegar, e um jeito só de dizer "carregando"

**Onde.** `07-juntos` antes dos dados, `09-celula`, `10-discipulado`, `22-notificacoes`, `03-biblia-lista`, `08-propositos`, e o `23-painel`, que escreve "Carregando…" em texto (`07e-painel.js` 71).

**Hoje.** `.leitor-esqueleto` (769-772) são quatro barras de 14 px de "texto", usadas em 10 lugares de 8 arquivos, inclusive onde vai chegar uma roda de retratos de 58 px e cartões de 90 px. Quando os dados chegam, a tela "salta" de forma: quatro linhas viram uma roda, um botão largo, um cartão e um feed. O Painel usa outra coisa. Esqueleto bom é o que já tem o desenho da tela; o pulso de opacidade (`@keyframes esqueleto`) está certo e fica: nada de brilho varrendo, que é o esqueleto de template.

**Como.** CSS:

```css
.esqueleto { display: grid; gap: 12px; padding: 8px 0; }
.esqueleto i { display: block; border-radius: var(--raio-p); background: var(--fundo-2); animation: esqueleto 1.4s ease-in-out infinite; }
.esqueleto .texto { height: 14px; } .esqueleto .texto:nth-child(2n) { width: 82%; }
.esqueleto .cartao { height: 92px; border-radius: var(--raio-g); }
.esqueleto .linha { display: grid; grid-template-columns: 46px 1fr; gap: 12px; align-items: center; }
.esqueleto .linha::before { content: ''; width: 46px; height: 46px; border-radius: 50%; background: var(--fundo-2); animation: esqueleto 1.4s ease-in-out infinite; }
.esqueleto .roda { display: flex; gap: 14px; } .esqueleto .roda i { width: 58px; height: 58px; border-radius: 50%; }
.esqueleto .pilulas { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } .esqueleto .pilulas i { height: 52px; border-radius: var(--raio); }
.leitor-esqueleto { /* apelido de .esqueleto com .texto */ }
```

JS, `01-nucleo.js`: `CC.esqueleto = (forma) => …` com cinco receitas: `texto` (leitor, nota, versículo da festa), `lista` (Discipulado, Notificações, pedidos), `cartoes` (Propósitos, Painel), `juntos` (roda + cartão + duas linhas), `biblia` (duas linhas + 8 pílulas). Trocar nos 10 pontos (`04-licao.js` 300, `04b-leitor.js` 230, `04d-biblia.js` 28, `07d-notificacoes.js` 101, `08-amigos.js` 593, `08b-propositos.js` 121, 145, 177, 495, `08c-discipulado.js` 394, `09b-missoes.js` 32) e o "Carregando…" do Painel. O contêiner recebe `aria-busy="true"` enquanto o esqueleto está lá e as barras `aria-hidden`.

**Esforço.** M. **Risco.** Baixo.

### 10. Botão ocupado: esperar a rede não é a mesma coisa que estar desligado

**Onde.** Todo botão que fala com o servidor: "Notificar", "Aceitar", "Orei por você", "Convidar", "Salvar o estudo", "Registrar o encontro", "Ativar notificações", "Vencer o dia de hoje", "Copiar código Pix": 39 `disabled = true` em 10 arquivos (14 só no `08b-propositos.js`).

**Hoje.** O botão vira `[disabled]` na hora do toque: cinza `--trilho-neutro` com texto `--tinta-fraca`, a **mesma** cara do "FALTA MARCAR…" da lição, que quer dizer "ainda não pode". Num Raspberry Pi atrás de túnel, 1 a 3 segundos de botão cinza parecem botão quebrado, e a pessoa toca em outra coisa. O estado "estou fazendo" não existe visualmente (H1) nem para leitor de tela (4.1.3).

**O que muda.** `.botao.ocupado`: mantém a própria cor, o ícone dá lugar a um anel de 16 px girando, o rótulo fica, `pointer-events: none`, `aria-busy="true"`. Com "menos movimento" o anel para (a regra global já faz isso) e continua sendo um anel, o que basta.

**Como.** CSS:

```css
@keyframes girar { to { transform: rotate(360deg); } }
.botao.ocupado { pointer-events: none; filter: none; transform: none; }
.botao.ocupado > svg { display: none; }
.botao.ocupado::before { content: ''; width: 16px; height: 16px; flex: 0 0 auto; border: 2.5px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: girar .8s linear infinite; }
/* ocupado vence o cinza de [disabled] */
.botao.ocupado[disabled] { background: var(--b); color: var(--inverso-tinta); }
.botao.cor.ocupado[disabled], .botao.azul.ocupado[disabled], .botao.vermelho.ocupado[disabled] { color: var(--sobre-cor); }
.botao.contorno.ocupado[disabled] { background: transparent; color: var(--tinta-forte); border-color: var(--tinta-forte); }
.botao.plano.ocupado[disabled] { background: none; color: var(--tinta-fraca); }
```

JS, `01-nucleo.js`:

```js
// Marca o botão como ocupado enquanto a tarefa roda; devolve o que a tarefa devolver.
CC.ocupado = async (botao, tarefa) => {
  botao.classList.add('ocupado'); botao.setAttribute('aria-busy', 'true'); botao.disabled = true;
  try { return await tarefa(); }
  finally { if (botao.isConnected) { botao.classList.remove('ocupado'); botao.removeAttribute('aria-busy'); botao.disabled = false; } }
};
```

Trocar primeiro nos 8 mais visíveis (convite, aceitar amizade, notificar, orei, salvar estudo, registrar encontro, ativar notificações, trocar caminho); os outros vão entrando.

**Esforço.** M. **Risco.** Baixo; onde o botão troca de texto no fim ("Notificado"), o `finally` roda antes e não atrapalha.

### 11. A lição do dia: o pé que instrui e o topo que orienta

**Onde.** `02-licao-390-claro.png` e escuro: dois cartões, 500 px de vazio, e a única instrução da tela dentro de uma cápsula desabilitada em caixa-alta: "FALTA MARCAR GÊNESIS 1-3 E MATEUS 1". No topo, uma barra de 10 px sem nome.

**Hoje.** `04-licao.js` 194: `botao(todas ? 'Concluir o dia' : 'Falta marcar ' + …, 'data-concluir', todas)`; a barra do topo enche "metade na leitura, metade na reflexão" (103-110), lógica que ninguém lê na tela. O lote 1 (1.5) corrigiu o contraste do botão; a forma continua errada: a frase que a pessoa mais precisa ler está no lugar que menos se lê (H1, H6), com 30 letras em Oswald caixa-alta a 1,05 rem, para um público a partir de 12 anos. E a lição tem quatro partes (ler, guardar, pensar, orar) que só aparecem na segunda tela, como chips (`.passos-reflexao`, 1462).

**O que muda.** Mesmo fluxo, outra forma. (1) O pé vira **linha de apoio + botão de rótulo fixo**: "Falta marcar Gênesis 1-3 e Mateus 1" em caixa normal, `role="status"`, e embaixo "Concluir o dia", desabilitado até marcar tudo (a frase muda para "Tudo marcado. Pode concluir."). (2) O topo troca a barra anônima pelos **mesmos chips** da reflexão, agora com quatro passos (Ler · Guardar · Pensar · Orar) e o ativo em `aria-current="step"`: a pessoa vê desde o primeiro toque que a lição tem partes, e as duas telas contam a mesma história. A barra e a conta de "fração" saem.

**Como.** JS, `04-licao.js`, em `telaLeitura`:

```js
topo: chipsDaLicao('ler'),
pe: '<p class="passo-dica pe-dica" role="status">' + (todas ? 'Tudo marcado. Pode concluir o dia.' : 'Falta marcar ' + faltam.map(([, , r]) => r).join(' e ')) + '</p>'
  + botao('Concluir o dia', 'data-concluir', todas),
```

com `chipsDaLicao = (ativa) => '<ol class="passos-reflexao topo-passos" aria-label="Partes da lição">' + [['ler','Ler'],['guardar','Guardar'],['pensar','Pensar'],['orar','Orar']].map(([k, r], i, a) => '<li' + (i <= a.findIndex(([x]) => x === ativa) ? ' class="ativa"' : '') + (k === ativa ? ' aria-current="step"' : '') + '>' + r + '</li>').join('') + '</ol>'`; em `telaFesta` a lista passa a ter os quatro itens com "Ler" já ativo. CSS: `.licao-topo .topo-passos { flex: 1; margin: 0; justify-content: flex-start; flex-wrap: nowrap; overflow: hidden; }`, `.licao-pe .pe-dica { margin: 0 0 4px; text-align: center; font-size: .88rem; }`, e a 320 px `.topo-passos li { padding: 4px 8px 4px 4px; font-size: .74rem; }`.

**Esforço.** M. **Risco.** Baixo a médio: é a tela mais usada; rodar `teste-leitor.mjs`, `teste-redesenho.mjs` e refazer as capturas 02 a 320 e 390. Nenhum teste procura `.licao-topo .barra`.

### 12. O aviso flutuante: ícone de certo ou de erro e duração pelo tamanho

**Onde.** 131 chamadas de `CC.avisar` ("Copiado", "Guardado", "Notificado!", "Não consegui copiar", os `e.message` do servidor).

**Hoje.** `CC.avisar` (`01-nucleo.js` 288-300): texto só, 2,6 s fixos para "Copiado" e para "Não consegui compartilhar. Toque em 'Copiar link' e cole na conversa."; uma segunda chamada troca o texto no meio, sem sinal. Sucesso e falha têm a mesma cara. A saída seca está na sugestão 2.

**Como.** JS:

```js
CC.avisar = (texto, { tipo } = {}) => {            // tipo: 'certo' | 'erro' | nada
  clearTimeout(avisoAtual);
  let el = document.getElementById('aviso-flutuante');
  const novo = !el;
  if (novo) { el = document.createElement('div'); el.id = 'aviso-flutuante'; el.className = 'aviso-flutuante'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = (tipo ? '<i class="aviso-ico">' + CC.ico(tipo === 'erro' ? 'info' : 'certo') + '</i>' : '') + CC.esc(texto);
  if (!novo) { el.classList.remove('bate'); void el.offsetWidth; el.classList.add('bate'); }   // um aviso trocou o outro: bate de leve
  avisoAtual = setTimeout(() => CC.sair(el, 200), Math.min(4200, 1800 + texto.length * 45));
};
```

CSS: `.aviso-flutuante { display: inline-flex; align-items: center; gap: 8px; } .aviso-ico svg { width: 18px; height: 18px; } .aviso-flutuante.bate { animation: bater .3s ease; }`. Começar marcando `tipo` nas 15 chamadas mais comuns ("Copiado", "Guardado", "Nota guardada", "Notificado", os "Não consegui…").

**Esforço.** P. **Risco.** Nenhum.

### 13. Perfil: o nome é editável e ninguém sabe

**Onde.** `15-perfil-390-claro.png`: "Ana" parece texto; o lápis está só no retrato.

**Hoje.** `#apelido` é um `<input class="campo-apelido">` transparente (1915-1928) que só ganha contorno no `:hover`, e no celular não há hover. O único sinal de edição da tela é o `.lapis` sobre a foto, que diz "trocar a foto". Uma pessoa de 12 anos nunca descobre que toca no nome para mudá-lo (H6).

**Como.** JS, `07-perfil.js` 136-141: dentro de `.quem`, depois do input, `'<span class="editar-nome" aria-hidden="true">' + CC.ico('caneta') + '</span>'`. CSS:

```css
.cartao-pessoa .quem { position: relative; }
.campo-apelido { padding-right: 34px; border-bottom: 2px dashed var(--borda); border-radius: var(--raio-p) var(--raio-p) 0 0; }
.campo-apelido:focus { border-bottom-style: solid; }
.editar-nome { position: absolute; right: 10px; top: 12px; width: 16px; height: 16px; color: var(--tinta-fraca); pointer-events: none; }
.editar-nome svg { width: 16px; height: 16px; }
.campo-apelido:focus + .editar-nome { display: none; }
```

**Esforço.** P. **Risco.** Nenhum.

### 14. Célula, aba Hoje: a meta e o encontro em blocos, não soltos na página

**Onde.** `09-celula-390-claro.png` e escuro.

**Hoje.** Depois do segmentado, a aba é uma sequência solta: uma frase (`passo-dica`), um h2 "Precisam de atenção" com uma linha, uma barra de progresso **sem título** com "0 de 1 pontos hoje" flutuando (`barraDoGrupo`, `08b-propositos.js` 55-60, dentro de `abaHoje`, 204-223), um botão de contorno centrado e dois botões planos. Nada diz o que a barra mede (H6), e o registro do encontro (`blocoEncontro`, 826-837) aparece como um botão avulso quando há dia marcado. O polimento (2.9) fechou o vão; a hierarquia ficou por fazer.

**O que muda.** Dois blocos suaves de nível 2 (`--acento-fraco`, sem contorno, raio 20, o mesmo bloco que o polimento manda usar para aviso): **Meta de hoje** (olho + barra + "0 de 1 pontos") e **Encontro** (olho + "às quintas" ou "sem dia marcado" + o botão de registrar ou o selo "registrado · N pessoas" + "Corrigir"). "Precisam de atenção" continua como seção; o vazio dela vira a versão pequena do `.estado` (sugestão 8), em uma linha.

**Como.** JS, em `abaHoje`:

```js
+ (p.hoje ? '<div class="bloco-celula"><span class="etiqueta">Meta de hoje</span>' + barraDoGrupo(p.hoje) + '</div>' : '')
+ (conduzo ? '<div class="bloco-celula"><span class="etiqueta">Encontro</span><p>' + (p.encontro >= 0 ? 'Encontro ' + nomeDoEncontro(p.encontro) : 'Sem dia marcado ainda') + '</p>' + blocoEncontro(p) + '</div>' : '')
```

(e a `passo-dica` do topo sobre o dia do encontro sai, porque o bloco já diz). CSS: `.bloco-celula { display: grid; gap: 6px; margin: 4px 0; padding: 12px 14px; border-radius: var(--raio); background: var(--acento-fraco); } .bloco-celula > p { margin: 0; color: var(--tinta-forte); font-weight: 700; } .bloco-celula .barra-missao { margin-top: 22px; } .bloco-celula .botao { width: auto; justify-self: start; }`.

**Esforço.** M. **Risco.** Baixo; conferir a 320 e no escuro (`--acento-fraco` #123230 com `--tinta-forte`). `teste-celula.mjs` não olha esta montagem.

### 15. Juntos: o pedido "Mostrar seus marcos" como linha, não como caixa

**Onde.** `07-juntos-390-claro.png` e escuro.

**Hoje.** `.pedido-mural` (1803) é uma caixa teal de 290 px de altura com ícone de 28 px, título, parágrafo e dois botões, entre a entrada de Propósitos e o feed: é a peça mais alta da tela, para uma pergunta secundária que aparece uma vez (`!m.ligado && !m.perguntado`). O relatório de arquitetura (item 11) já a apontou como "empurra o conteúdo".

**O que muda.** A mesma pergunta em **uma linha**: ícone 20 px, "Mostrar seus marcos aos amigos?" e dois botões pequenos planos na mesma linha (a 320 px eles descem para a linha de baixo). Metade da altura, mesma cor de nível 2.

**Como.** CSS: `.pedido-mural { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 12px 0 4px; padding: 10px 14px; } .pedido-mural > svg { width: 20px; height: 20px; } .pedido-mural p { display: none; } .pedido-mural b { flex: 1; font-size: .95rem; } .pedido-mural .pe-duplo-plano { display: flex; gap: 4px; margin-left: auto; }`. O parágrafo explicativo ("Ofensiva, livros terminados, conquistas e os versículos…") pode ir para o `aria-label` do botão "Mostrar" ou para a folha de confirmação que já existe em `CC.compartilharVersiculo` (144-149).

**Esforço.** P. **Risco.** Nenhum.

---

## Ganhos rápidos (menos de uma hora cada)

1. **A roda de amigos com um amigo só.** `.roda-amigos { justify-content: space-between }` (1657) põe "Gui" na ponta esquerda e "+ Convidar" na direita com 220 px de nada no meio (`07-juntos-390-claro.png`). Trocar por `justify-content: flex-start; gap: 14px`: a vaga fica ao lado do último amigo, e com muitos amigos nada muda. Uma linha.
2. **O coração do Feed só bate uma vez por sessão.** `08-amigos.js` 670 adiciona `pulando` e nunca tira; a segunda reação da mesma pessoa não anima. Antes de adicionar: `el.addEventListener('animationend', () => el.classList.remove('pulando'), { once: true })`. Duas linhas.
3. **Animação de entrada só onde algo acontece.** `.bloco-secao { animation: entrar-cartao }` (2290) faz a grade do Explorar "chegar voando" a cada visita, e `.amigo-roda, .vaga { animation: pop }` (1679) faz os retratos pularem a cada abertura do Juntos, enquanto o comentário da linha 2631 diz que "a tela aparece pronta". Movimento marca mudança (baú aberto, amigo novo), não renderização. Tirar as duas; manter as que marcam passo (`.opcao`, `.destaque-dia`, `.cena`, `.acoes-verso`).
4. **Alvos de 44 px que faltam.** `.botao-reagir` tem 42 px (1826); `.cor-marca` tem 34 px com 10 px entre as quatro cores (2525-2529): são os menores controles do app, no leitor, com o dedo. `.botao-reagir { min-height: 44px }`; `.cor-marca { position: relative; width: 36px; height: 36px } .cor-marca::after { content: ''; position: absolute; inset: -6px }` (área de toque invisível de 48 px); `.segmentado button, .seletor-config { min-height: 44px }`.
5. **Painel: rótulos de 8 px.** `.painel-coluna em { font-size: .52rem }` (3027) é 8,3 px em pé, e `small` .6 rem é 9,6 px: ninguém lê, nem o dono. `.painel-coluna em { font-size: .68rem; writing-mode: horizontal-tb; transform: none; height: auto; }` mostrando só um rótulo a cada cinco colunas (`.painel-coluna:not(:nth-child(5n+1)) em { visibility: hidden }`) e `small { font-size: .7rem }`.

Opcional, se o dono quiser: **toque nas abas** com resposta física. `.aba .ico-aba` tem `transition: transform .2s var(--mola)` (462) que nada usa desde que o "zoom" da seleção saiu. Um estado de **pressão** (só enquanto o dedo está em cima) é outra coisa: `.aba:active .ico-aba { transform: scale(.9) }` volta com a mola ao soltar, como o `.botao:active { scale(.97) }` já faz. Não anima na seleção. Se o dono não gostar, é uma linha para tirar.

---

## O que evitar: o que daria cara de template ou de IA

Tudo aqui é coisa que aparece em app de Bíblia de loja ou em interface gerada, e que neste app quebraria a linguagem que já existe.

1. **Uma quarta fonte.** Nunito, Oswald e Permanent Marker (só no carimbo) já são o limite. Nada de serifa "espiritual" para o texto bíblico, nem script para versículos.
2. **Gradiente em botão, cartão ou fundo de tela.** O único gradiente do app é o número do fogo (`.numero-ofensiva`) e os cartões de versículo, que vão do acento fraco ao fundo. Gradientes roxo-azul, "aurora" e vidro fosco (`backdrop-filter`) são a assinatura da interface gerada.
3. **Sombra em todo cartão.** A regra do polimento (chapado, relevo só no que se aperta, sombra só no que flutua) é o que dá o ar de feito à mão. Elevação em tudo vira Material de 2016.
4. **Brilho varrendo os esqueletos.** O pulso de opacidade que existe é o certo. O "shimmer" diagonal é o carregamento de dashboard gerado.
5. **Confete e faísca em toda ação.** Hoje o confete só sai no resumo do dia, no baú e nos marcos: ele vale porque é raro. Nada de estrelinha no "Copiado".
6. **Animações infinitas competindo.** A chama já tremula sem parar e o balão do nó flutua; o baú só balança quando está pronto e o troféu só quando ganho. Manter esse orçamento: uma coisa viva por tela, e sempre a que diz "agora".
7. **Ilustrações de banco (gente sem rosto, roxo, "undraw") e emoji como ícone.** A arte do app é o fogo, o baú, a taça, a Bíblia, o calendário e a bandeira, desenhados em SVG (`01c-arte.js`). Estado vazio ganha azulejo com ícone do próprio conjunto, não uma ilustração de outro mundo.
8. **Emoji, "✨" e "🙏" em texto de tela.** Nenhum ícone do app é emoji; o "✓" do "Hoje vencido ✓" (`09c-desafios.js` 175, 218) é a única exceção que vale trocar por `CC.ico('certo')`.
9. **Cores por categoria.** Cada seção com sua cor é a primeira coisa que um gerador faz e a primeira que o app tirou de propósito ("cor diz estado, nunca categoria"). Os troféus por tipo se diferenciam pela forma, não pela cor.
10. **Anéis de progresso e placares por toda parte.** O anel só existe no nó de hoje. Progresso de leitura é barra; ofensiva é a chama; e os nomes das conquistas já dizem o que falta.
11. **Tour com balões na primeira abertura ("toque aqui para…").** O app aposta em rótulos visíveis na barra e em uma ação por tela. Tutorial de balões é o que se faz quando a tela não se explica.
12. **Caixa-alta em parágrafo, letter-spacing em minúscula, títulos com "!" e "🔥".** Oswald caixa-alta fica onde está (botão, aba, olho). Texto corrido é Nunito em caixa normal.
13. **Escuro por inversão (grafite azulado, contornos brilhantes, "glow" em botão).** O preto de verdade com cartão um degrau acima e o acento clareando sozinho já é a escolha certa; o único brilho é o do botão da Bíblia, pedido do dono.
14. **Cards dentro de cards e badge em tudo.** A moldura em três níveis do polimento existe para isso: agrupador fraco, cartão de ação forte, aviso sem borda.
15. **Texto genérico de estado vazio ("Nada por aqui ainda", "Oops!").** Os vazios do app dizem o que a tela faz e como começar ("Enquanto lê, toque num versículo para marcar…"). Manter esse tom quando a família da sugestão 8 for aplicada.

---

## Como conferir

- Cor: `node ferramentas/contraste.mjs` (acrescentar os pares novos: `--segmento-sel`/`--segmento-trilho` nos dois temas e `--acento`/`--acento-fraco`).
- Layout: `node ferramentas/inspecionar.mjs 320` e `390`, `node ferramentas/teste-redesenho.mjs`, `node ferramentas/teste-escuro-forcado.mjs`, e as capturas de novo com `ferramentas/telas.mjs` para comparar com as de `ux-depois/`.
- Lição e leitor (sugestões 2 e 11): `node ferramentas/teste-leitor.mjs`.
- Movimento: testar uma vez com "Reduzir movimento" ligado no sistema; tudo o que este relatório propõe deve aparecer parado e no lugar.
