# Revisão de polimento de design — Geração Eleita

**Data:** 28/09/2026 · **Escopo:** acabamento visual (espaçamento, linhas, sombras, raios, tipografia, cor, barra, contraste). Não é revisão de texto nem de fluxo.
**Critério principal (do dono):** "visual polido, não algo bruto gerado por IA" — acabamento de app feito à mão: contido, com ritmo, hierarquia clara e poucos recursos bem usados. A seção 0 lista o que hoje entrega o ar de interface genérica; as seções 1 a 3 são o remédio em CSS.
**Material:** 25 telas a 390 px no claro (todas), 16 telas no escuro, 13 telas a 320 px; `src/estilo.css` (3053 linhas) e a montagem em `src/app/*.js`. Regiões duvidosas foram recortadas e ampliadas (pílulas de livro, cartões de troféu, barra inferior, caixas de Configurações, pé da lição) e os pares de cor foram medidos com a fórmula WCAG.
**Nenhum arquivo do app foi alterado.** Todo seletor citado existe no `estilo.css` (linha indicada quando ajuda).

## Veredito

> ⚠️ **Base sólida, acabamento desigual.** A linguagem (cápsula, contorno fino, um acento só, cartão off-white) está certa e bem documentada no próprio CSS. O que falta é a mesma peça ser desenhada do mesmo jeito em todas as telas: o relevo 3D sobreviveu em um terço dos cartões, três telas-hero têm três acabamentos, as divisórias de lista somem em metade das caixas por um acidente de especificidade, e há ~15 versões do rótulo em caixa-alta e 60 tamanhos de fonte.

**Acessibilidade (WCAG 2.1 AA, avaliação visual):** *riscos a corrigir*, nenhum bloqueador. Texto principal e secundário passam com folga (5,1–8,8:1 no claro; 6,4–8,8:1 no escuro). Os problemas são pontuais: botão desabilitado com 1,4:1, botão branco do hero no escuro com 2,5–3,4:1, contornos de campo e interruptor abaixo de 3:1, rótulo da barra a 9,6 px.

Heurísticas mais tocadas: **H4 Consistência** (o relevo, os raios, as divisórias, os heróis), **H8 Estética e minimalismo** (linhas duplicadas, bolinhas com anel errado, campo de busca sem borda), **H1 Visibilidade de estado** (interruptor desligado e botão desabilitado ilegíveis).

---

## 0. Sinais de "feito por IA" e a correção de cada um

Do mais forte para o mais fraco. Cada item diz onde se vê e o que muda no CSS; quando a correção já está detalhada adiante, aponta a seção.

### S1. Tudo encaixotado com a mesma moldura de 2 px — sem hierarquia de contêiner (o sinal mais forte)

**Onde.** Perfil (`15-perfil-b-390-claro.png`: caixa da Coleção, dois cartões, cartão do Semeador, caixa de atalhos — cinco molduras iguais em sequência), Configurações (seis caixas com rótulo), Desafios (quatro cartões + caixa + cartão + cartão), Painel (quatro cartões + quatro caixas), Explorar (dois cartões + oito na grade). O contorno de caixa, o contorno de cartão e a divisória de lista têm o mesmo peso (2 px `--borda`), então agrupador, cartão e linha viram a mesma coisa e a tela parece um wireframe preenchido. O próprio cabeçalho do CSS pede "poucos cartões, contornos finos".

**Correção: três níveis de moldura.** Forte (2 px) só para o cartão de ação da tela; fraca (1 px) para agrupador de lista e cartão de grade; nenhuma para aviso suave (`--acento-fraco`) e conteúdo corrido (estatísticas, texto de nota, cabeçalho de tela).

```css
:root { --moldura: 1px; --moldura-forte: 2px; }
/* agrupador e grade: fraca */
.cartao, .caixa-lista, .lista-atalhos, .caixa-config, .lista-missoes, .bloco-secao, .trofeu,
.painel-cartao, .colecao-atalhos a, .item-livro, .item, .linha-amigo, .cartao-proposito,
.cartao-semeador, .cartao-caderno, .nivel-semeador, .dsf-item, .entrada-propositos { border-width: var(--moldura); }
/* cartão de ação: forte */
.leitura-hoje, .passagem, .cartao-push, .apoiar-pix, .dsf-card { border-width: var(--moldura-forte); }
```

Risco baixo: no escuro a moldura de 1 px em `#2b2b2b` continua visível (é a mesma cor de hoje, só mais fina); conferir em `21-config-390-escuro.png` e `17-trofeus-390-escuro.png`. Junto com 1.1 (relevo) e 1.3 (divisórias de 1 px), é o que mais muda a sensação de "gerado".

### S2. Tudo em negrito, muita caixa-alta

**Onde.** Não existe texto leve no app: corpo 600, apoio 700, nome 800, número 900 (83 regras com 800, 38 com 900). A hierarquia vira só cor (preto × cinza). Caixa-alta em botão, aba, olho de cartão, contador de seção ("39 LIVROS", "0 DE 4", "0 DE 12"), rótulo de grupo (Configurações tem oito), balão, selo, chip e meta ("UNIDADE 2 · ADIANTE"). Somado ao Oswald 700 dos títulos, a página grita — e é exatamente a cara de template.

**Correção.** (a) Apoio e meta em 600; 900 só em número grande. (b) Caixa-alta só onde é rótulo de peça (olho `.etiqueta`) ou ação (botão, aba); contador e rótulo de grupo em caixa normal.

```css
.passo-dica, .dica-campo, .descricao-conquista, .cartao-pratica .sub, .item-licao .textos > span,
.trofeu span, .folha p, .linha-config .valor, .visao-item small, .bloco-secao span,
.quem-amigo .arroba, .cabeca-push p, .item .resumo { font-weight: 600; }
.grupo-config h2.etiqueta { text-transform: none; letter-spacing: 0; font-size: 0.88rem; font-weight: 800; }
/* contadores: ver 1.6 (caixa normal, 0,85rem) */
```

Risco baixo. Nunito 600 em `--tinta-fraca` continua com 5,1–6:1.

### S3. Coluna de botões de 50 px para ações secundárias

**Onde.** Juntos: "CONVIDAR PARA LER JUNTO" (contorno, largura total) logo abaixo da roda de amigos, que já tem o "+ Convidar". Célula (`09-celula-390-claro.png`): contorno de largura total e dois planos de largura total — três botões grandes para ações de apoio. Discipulado: "ENCONTRO DA SEMANA" (contorno) e "ENCERRAR" (destrutivo) do mesmo tamanho, mais "CONVIDAR ALGUÉM" de largura total. Apoiar: dois de 50 px. História: "COPIAR MINHA HISTÓRIA" de largura total. Lição: quatro botões de 46 px em dois cartões (a 320 px viram uma coluna). App feito à mão tem **um** primário por tela; o resto é botão pequeno ou link.

**Correção.** `.botao.pequeno` (40 px, largura automática) já existe: é só usá-lo nos contornos secundários citados (montagem em JS: `convidar-largo`, "Mandar o link da célula", "Convidar alguém", "Copiar minha história", "Mostrar QR code"). E os planos deixam de ocupar a largura toda:

```css
.botao.plano { width: auto; min-height: 44px; padding: 8px 14px; font-size: 0.95rem; justify-self: center; }
.pe-duplo-plano { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 20px; }
.pe-duplo-plano .botao.contorno { width: auto; padding: 10px 18px; font-size: 0.95rem; }
.acoes .botao.pequeno { justify-self: center; }
```

Risco médio (toca Juntos, Célula, Discipulado, Conta, Desafios): rodar as capturas de novo. Alternativa segura: só adicionar `pequeno` nos lugares listados e deixar `.botao.plano` como está.

### S4. Lavagem teal-pálida em tudo que é "vazio"

**Onde.** Barra vazia, estrela vazia, interruptor desligado, botão desabilitado, trilho de progresso: tudo `--trilho` (`#cfdedd`). Conquistas, Desafios e Praticar ficam com dez faixas teal-pálidas que não dizem nada (`16-conquistas-390-claro.png`, `06-praticar-390-claro.png`); a Célula tem uma barra solta no meio da tela. É a marca registrada de paleta aplicada por script: a cor de "ainda não" igual à cor de "hoje".

**Correção.** Teal só na trilha (nó travado, trilho da estrada) e no que é "hoje". Vazio dentro de cartão em neutro, num token só:

```css
:root { --trilho-neutro: var(--borda); --progresso-trilho: var(--trilho-neutro); }   /* .barra e .barra-missao já leem --progresso-trilho */
.leitor-progresso, .painel-trilho, .barra-comece { background: var(--trilho-neutro); }
.estrelas i, .estrelas-fim i { color: var(--trilho-neutro); }
/* interruptor desligado e botão desabilitado: ver 1.7 e 1.5 */
```

Risco baixo. Troféu e medalha não ganhos continuam em `--trilho`: é arte aprovada. `--borda` funciona nos dois temas (`#d9d9d9` / `#2b2b2b`); `--fundo-2` não serviria porque some no escuro (1,03:1).

### S5. Ícones de estilos diferentes lado a lado

**Onde.** Barra: ilustração colorida (Trilha), glifos cheios cinza (Juntos, Célula), dois tons (Discipulado), disco com pontos (Mais). Perfil "Visão geral": chama de arte apagada ao lado de três ícones de linha de pesos diferentes (o mapa parece maior que o livro). Desafios: ícone de linha em azulejo e baú de madeira ilustrado na mesma linha.

**Correção.** Os ícones aprovados ficam; o CSS iguala a caixa e o traço, e a arte (chama, baú) só aparece como recompensa/estado, nunca como ícone de lista.

```css
.visao-item > svg { width: 24px; height: 24px; stroke-width: 2; }
.visao-item > .ico-chama { width: 28px; height: 28px; }
```

Na barra a caixa já é igual (`.aba .ico-aba`, 24–28 px); o que falta é o viewBox do ícone de Discipulado ter a mesma margem interna dos outros — ajuste no SVG, não no CSS. Risco nenhum. O disco do Mais: ver 1.8.

### S6. Espaçamentos "quase iguais" e raios diferentes na mesma família

**Onde.** 10/12/13/14/16/18/20/22/24/26/28 px convivendo: Trilha com 12, 14 e 16 entre os três primeiros blocos; Perfil com títulos a 20 e a 28; 22 + 12 = 34 px antes de "Meus conteúdos"; `gap: 13px` na faixa da unidade. Raios 20/22/26 lado a lado e azulejos com 12, 14 e 20. **Correção:** escala 4·8·12·16·24·32 (seção 3.1) e três raios por família (1.4).

### S7. Falta de alinhamento ótico

**Onde.** "21 dias" centrado verticalmente contra um bloco de duas linhas (`.dsf-item`); o retrato "G" flutuando no meio de quatro linhas de texto (`.linha-amigo`, Discipulado); a seta do Praticar centrada contra títulos de duas linhas; o chevron de "Comece por aqui" num disco; o bloco "0 dias seguidos" da Célula sem baseline com o h1; a bandeira de "Novo na fé" no meio das duas linhas a 320 px.

**Correção.** Elemento de apoio alinha pela primeira linha do texto, não pelo centro do bloco:

```css
.dsf-n { align-self: flex-start; margin-top: 2px; }
.linha-amigo .retrato-amigo { align-self: flex-start; }
.cartao-pratica > svg { align-self: flex-start; margin-top: 14px; }
.leitura-hoje .novo-na-fe { align-items: flex-start; }
.leitura-hoje .novo-na-fe svg { margin-top: 3px; }
```

Ajustar 2–4 px a olho até a seta/número bater com a primeira linha. Risco nenhum.

### S8. Sinal duplicado na mesma linha

**Onde.** Praticar: olho + título + meta + três estrelas + seta (cinco elementos por linha); Desafios: barra + "0 / 1" + baú. **Correção:** quando a linha inteira é botão, a seta sobra (a grade do Explorar já não tem): `.lista-pratica.caixa-lista .cartao-pratica > svg { display: none; }`. O baú é a recompensa: fica.

### S9. Estados vazios crus e restos de montagem

**Onde.** Propósitos (um botão e nada), Meus versículos (texto e nada), Painel (caixa de 150 px vazia), a pílula vazia da História, quatro bolinhas vermelhas ao mesmo tempo na barra. É o que mais denuncia "gerado e não revisado". **Correção:** 2.8, 2.18, 2.23, 2.19b (`.selo-status:empty { display: none }`) e 1.8.

### S10. Texto secundário apagado demais — não é o caso

`--tinta-fraca` dá 5,1–6,0:1 no claro e 6,4–6,9:1 no escuro. O problema é o inverso (S2): o secundário é pesado demais, não claro demais. Ponto positivo a manter.

---

## 1. As oito mudanças de maior impacto (sistêmicas)

Ordenadas por impacto visual × baixo risco. As quatro primeiras mudam a cara do app inteiro; as quatro seguintes são correções de acabamento e contraste.

### 1.1 Relevo 3D: uma regra só (estático = chapado · pressionável = relevo · flutuante = sombra)

**Problema.** O CSS diz "botões chapados, cápsula" (`.botao`, l. ~560), mas o relevo antigo (`border-bottom-width: 4px` ou `box-shadow: 0 4px 0`) ficou num subconjunto aleatório de peças. Na mesma tela convivem cartão chapado e cartão com relevo:

- Trilha (`01-trilha-390-claro.png`): o balão de boas-vindas `.fala-bento` é chapado; o cartão `.leitura-hoje` logo abaixo tem 4 px de relevo.
- Explorar (`11-explorar-b-390-claro.png`): "Comece por aqui" (`.cartao`) chapado; a grade `.bloco-secao` com relevo.
- Desafios (`05-desafios-b-390-claro.png`): `.lista-missoes` chapada; `.cartao-praticar` logo abaixo com relevo.
- Heróis: `.cabeca-pratica` e `.cabeca-passos` com relevo; `.cabeca-missoes` sem.
- Primeiros passos (`13-passos-390-claro.png`): os números `.item-licao .num` são bolinhas com relevo dentro de uma lista chapada.
- No escuro o relevo vira uma faixa cinza/verde mais clara embaixo do cartão (`06-praticar-390-escuro.png`, `13-passos-390-escuro.png`), o efeito oposto do que uma sombra faria.

Onde está hoje (todos conferidos): com `border-bottom-width: 4px` → `.leitura-hoje`, `.bloco-secao`, `.cartao-praticar`, `.cartao-pratica`, `.opcao`, `.pergunta-reflexao`, `.opcao-sistema`, `.botao-reagir`, `.ir-atual`; com `box-shadow: 0 4px 0` → `.cabeca-pratica`, `.cabeca-passos`, `.faixa-unidade.travada`, `.item-licao .num`, `.item-licao.feita .num`, `.lista-licoes.caixa-lista .item-licao.proxima .num`; com `0 2px 0` → `.segmentado button[aria-pressed="true"]`. Sem relevo: `.cartao`, `.fala-bento`, `.caixa-lista`, `.lista-missoes`, `.dsf-card`, `.trofeu`, `.item-livro`, `.cartao-continuar`, `.cabeca-missoes`, `.painel-cartao`, `.apoiar-pix`, `.cartao-semeador`, `.linha-amigo`, `.cartao-proposito`, todos os `.botao`.

**Regra proposta.** Relevo só em peça que se **aperta** e que já abaixa no `:active` (opções de quiz e de reflexão, escolha de sistema, botão de reagir). Peça **estática** é chapada. Peça que **flutua** sobre o conteúdo usa a sombra suave que já existe (`--sombra-flutuante`).

```css
/* estático: chapado */
.leitura-hoje, .bloco-secao, .cartao-praticar, .cartao-pratica { border-bottom-width: 2px; }
.cabeca-pratica, .cabeca-passos, .faixa-unidade.travada { box-shadow: none; }
.item-licao .num, .item-licao.feita .num,
.lista-licoes.caixa-lista .item-licao.proxima .num { box-shadow: none; }
.segmentado button[aria-pressed="true"] { box-shadow: none; }

/* o :active de .cartao-pratica dependia do relevo; vira só o afundar */
.cartao-pratica:active { transform: translateY(1px); border-bottom-width: 2px; margin-bottom: 0; }

/* flutuante: sombra, não relevo */
.ir-atual { border-bottom-width: 2px; box-shadow: var(--sombra-flutuante); }

/* pressionável: ficam como estão (.opcao, .pergunta-reflexao, .opcao-sistema, .botao-reagir) */
```

**Risco.** Baixo: só visual. `.leitura-hoje.feita` já fixa `border-bottom-width: 2px`, fica redundante. Conferir no escuro que `.ir-atual` continua se destacando (a sombra escura já é `rgba(0,0,0,.55)` lá).

### 1.2 Os três heróis com o mesmo acabamento (e o botão branco legível no escuro)

**Problema.** Desafios, Praticar e Primeiros passos abrem com o mesmo tipo de cartão-hero, e cada um tem uma receita:

| Hero | Fundo (claro) | Fundo (escuro) | Relevo | Padding |
|---|---|---|---|---|
| `.cabeca-missoes` (Desafios) | petróleo `--inverso` | petróleo | não | 18 16 18 20 |
| `.cabeca-pratica` (Praticar) | petróleo `--cor` | **verde-claro `#5fbdb9` com texto preto** | sim | 20 12 20 20 |
| `.cabeca-passos` (Passos, `c-roxo`) | **cinza `#4a4a4a`** | **cinza-claro `#c9c9c9` com texto preto** | sim | 20 |

Ver `05-desafios-390-claro.png`, `06-praticar-390-escuro.png` (bloco verde-claro sobre preto) e `13-passos-390-escuro.png` (bloco cinza-claro sobre preto: parece um cartão do tema claro colado). O próprio CSS define a regra "categoria não se diz por cor; faixa de unidade é `--inverso` nos dois temas" (l. 44–48, 795–800) — os heróis é que ficaram para trás.

Dentro deles, `.botao.branco { color: var(--cor-3d, var(--azul-3d)) }` (l. ~611) no escuro herda os tons `-3d` clareados: **`#3d9995` sobre branco = 3,4:1** (Praticar) e **`#a5a5a5` sobre branco = 2,5:1** (Passos), abaixo do mínimo 4,5:1 para texto de botão (visível nos dois escuros citados).

**Proposta.**

```css
.cabeca-missoes, .cabeca-pratica, .cabeca-passos {
  background: var(--inverso);
  color: var(--inverso-tinta);
  box-shadow: none;
  padding: 20px;
  margin-bottom: 8px;
}
.cabeca-missoes h1, .cabeca-pratica h1, .cabeca-passos h1 { color: inherit; }
.botao.branco { background: var(--branco); color: var(--inverso); }   /* 7,8:1 nos dois temas */
```

**Risco.** Baixo. `.cabeca-passos .progresso-passos .barra` já usa branco translúcido, continua legível sobre petróleo. O `c-roxo` no HTML (05-licoes.js) pode ficar; deixa de ter efeito no hero. A linha "próxima" da lista de lições ainda usa a família roxa (ver 2.13).

### 1.3 Linhas: divisórias que sumiram, espessuras e um token

**Problema (bug).** `.caixa-config > * + * { border-top: 2px solid var(--borda) }` (l. 2585) é anulado por `.linha-config { border: 0 }` (l. 2588): mesma especificidade, a de baixo vence. Resultado: **Configurações, Notificações, Discipulado ("Minha caminhada") e Painel** mostram caixas sem nenhuma divisória entre as linhas (recortes ampliados de `21-config-b-390-claro.png` e `10-discipulado-390-claro.png` confirmam), enquanto "Meus conteúdos" no Perfil (`.lista-atalhos`, `15-perfil-b-390-claro.png`) e a lista de missões têm divisórias de 2 px. O mesmo acidente se repete em `.lista-licoes.caixa-lista .item-licao { border: 0 }` (Primeiros passos) e `.lista-pratica.caixa-lista .cartao-pratica { border: 0 }` (Praticar): listas em caixa sem separação nenhuma entre itens.

**Problema (peso).** Onde a divisória existe, ela tem a mesma espessura do contorno do cartão (2 px `--borda`), e cada linha parece um cartão empilhado. O painel do Mais (`25-mais-390-claro.png`) usa 1 px e é a lista que melhor lê no app. Fora isso: `.topo` tem `border-bottom: 2px` e `.navegacao` `border-top: 1px`; `.botao.contorno` usa 1,6 px, `.dsf-dias` 1,5 px, a tabela das notas 1 px.

**Proposta.**

```css
:root { --linha: 1px; }               /* divisória interna; contorno de cartão continua 2px */

/* divisórias, com especificidade que vence o border:0 dos itens */
.caixa-lista > * + *, .lista-atalhos > * + *, .caixa-config > * + *,
.caixa-config > * + .linha-config,
.lista-licoes.caixa-lista .item-licao + .item-licao,
.lista-pratica.caixa-lista .cartao-pratica + .cartao-pratica,
.missao + .missao, .painel-mais a { border-top: var(--linha) solid var(--borda); }
.painel-mais a, .painel-mais a:last-child { border-bottom: 0; }
.item-mural { border-bottom-width: var(--linha); }
.cartao-pessoa { border-bottom-width: var(--linha); }

/* mesma espessura em cima e embaixo da tela */
.topo { border-bottom-width: 1px; }

/* sem frações */
.botao.contorno { border-width: 2px; }
.dsf-dias { border-width: 2px; }
```

**Risco.** Baixo. Se 1 px parecer fraco demais no claro (`#d9d9d9` sobre `#f7f7f7` = 1,3:1), a alternativa é manter 2 px e clarear só a divisória: `border-top-color: color-mix(in srgb, var(--borda) 55%, var(--cartao))`. Não misturar as duas.

### 1.4 Raios de canto: três tokens, uma família por token

**Problema.** Existem `--raio-p` 14, `--raio` 20, `--raio-g` 26 e cápsula, mas também 12, 16, 22, 24 e 30 px literais, e a mesma família usa tokens diferentes:

- Trilha: `.fala-bento` (20) em cima de `.leitura-hoje` (26) — o recorte ampliado mostra os dois cantos diferentes lado a lado.
- Desafios: `.dsf-card` 22 ao lado de `.cartao` 26; `.dsf-item` 16.
- Discipulado: `.linha-amigo` 20 abaixo de `.caixa-config` 26.
- Perfil: `.colecao-atalhos a` 20 abaixo de `.caixa-lista` 26. Troféus: `.trofeu` 20.
- Azulejos de ícone (44 px): `.painel-mais .q` 12, o resto 14; `.cartao-pratica .marca` 20 num quadrado de 50; `.icone-secao` 26 num quadrado de 56 (vira bolha).
- Apoiar: `.apoiar-valor`, `.aviso-apoiar` 12. Painel: `.painel-outro input` 12. Folha: `.folha` 24 (o Mais usa 26).

**Regra proposta.** `--raio-g` (26) = cartão de largura total e folhas; `--raio` (20) = bloco interno e peça média (aviso, textarea, cartão-versículo, cartão pequeno de grade); `--raio-p` (14) = azulejo de ícone até 56 px, input, botão-ícone, balão; cápsula = botão, pílula, selo. Interno = externo − padding (26 − 16 ≈ 10–14, por isso `--raio-p` dentro de cartão).

```css
.fala-bento, .dsf-card, .linha-amigo { border-radius: var(--raio-g); }
.folha { border-radius: var(--raio-g) var(--raio-g) 0 0; }
.dsf-item, .dsf-stats, .dsf-estudo, p.selo-status, .qr-convite { border-radius: var(--raio); }
.aviso-apoiar { border-radius: var(--raio); }
.painel-mais .q, .apoiar-valor, .dsf-base, .painel-outro input,
.icone-secao, .cartao-pratica .marca { border-radius: var(--raio-p); }
.arte-livro { border-radius: var(--raio-g); }
.aba.aba-central { border-radius: var(--raio); }   /* já é 20px; só passa a usar o token */
```

**Risco.** Muito baixo. `.trofeu` e `.colecao-atalhos a` (cartões pequenos de grade) podem ficar em `--raio`: é a família "peça média".

### 1.5 Botão desabilitado ilegível

**Problema.** `.botao[disabled]` (l. ~592) define `background: var(--trilho); color: var(--tinta-fraca)`, mas `.botao.cor`, `.botao.azul` e `.botao.vermelho` vêm depois com a mesma especificidade e forçam `color: var(--sobre-cor)`. O pé da lição (`02-licao-390-claro.png`, `-escuro`, `-320`) mostra "FALTA MARCAR GÊNESIS 1-3 E MATEUS 1" em **branco sobre `#cfdedd` = 1,4:1** no claro e **preto sobre `#17393a` = 1,6:1** no escuro. A WCAG isenta controle inativo, mas aqui o botão carrega a instrução do que falta fazer, então precisa ler.

```css
.botao[disabled], .botao.cor[disabled], .botao.azul[disabled],
.botao.vermelho[disabled], .botao.branco[disabled] {
  background: var(--trilho);
  color: var(--tinta-fraca);     /* 4,6:1 claro · 4,4:1 escuro */
  border-color: transparent;
}
```

**Risco.** Nenhum. Se quiser 4,5:1 cravado no escuro, usar `color: var(--tinta)` só em `:root[data-tema="escuro"] .botao[disabled]`.

### 1.6 Rótulo em caixa-alta: uma definição só (e os contadores de seção)

**Problema.** O "olho" em caixa-alta (LEITURA DE HOJE · DIA 1, ANTIGO TESTAMENTO, UNIDADE 1 · ATUAL, COMECE POR AQUI, APARÊNCIA…) tem uma receita por tela: `.etiqueta` 0,72rem/800/0,08em; `.leitura-hoje .etiqueta` 0,74/900/0,06; `.passagem .rot` 0,72/800/0,08; `.cartao-pratica .rot` 0,72/800/0,07; `.faixa-unidade .rot` 0,75/800/0,06; `.cartao-continuar small` 0,78/800/0,06; `.corpo-semeador small` 0,74/900/0,06; `.leitor-titulo .rot` 0,72/800/0,08; `.grupo-config h2.etiqueta` 0,75; `.campo-senha span` e `.rotulo-escolha` 0,8/800/0,06; `.etiqueta-celula` 0,78/900/0,06; `.item .sub` 0,74/800/0,05; `.dsf-selo` 0,68/900/0,08; `.dsf-stats small` 0,66/800/0,06; `.pergunta-reflexao .rotulo-pergunta` 0,72/900/0,06; `.premio .cabeca` 0,72/900/0,06. Dezessete variações de uma peça só; a olho a diferença aparece como "um pouco mais gordo aqui, mais espaçado ali".

Os contadores ao lado do h2 também variam: `.titulo-secao span` é caixa-alta 0,8rem ("39 LIVROS", "0 DE 4"), `.contagem-amigos` é normal 0,85 ("1 amigo", "0 propósitos"), `.titulo-bloco span` normal 0,85 ("5 horas"), e "1" no Discipulado vem pelo `.titulo-secao`.

```css
:root { --rotulo-tam: 0.74rem; --rotulo-peso: 800; --rotulo-esp: 0.07em; }
.etiqueta, .leitura-hoje .etiqueta, .passagem .rot, .cartao-pratica .rot, .faixa-unidade .rot,
.cartao-continuar small, .corpo-semeador small, .leitor-titulo .rot, .grupo-config h2.etiqueta,
.campo-senha span, .rotulo-escolha, .etiqueta-celula, .item .sub, .dsf-selo, .dsf-stats small,
.pergunta-reflexao .rotulo-pergunta, .premio .cabeca {
  font-size: var(--rotulo-tam); font-weight: var(--rotulo-peso);
  letter-spacing: var(--rotulo-esp); text-transform: uppercase; line-height: 1.2;
}
/* contador ao lado do título de seção: uma cara só, sem caixa-alta */
.titulo-secao span, .titulo-secao a, .contagem-amigos, .titulo-bloco span {
  font-size: 0.85rem; font-weight: 800; color: var(--tinta-fraca);
  text-transform: none; letter-spacing: 0;
}
```

**Risco.** Baixo. `.faixa-unidade .rot` fica 1 px menor que hoje; a 320 px ele já quebra em duas linhas (ver 2.1), então junto vai `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.

### 1.7 Contorno de controle: campo de busca, campos de texto, interruptor desligado

**Problema (medido).** Campo de busca (`.busca-caixa input`): fundo `--fundo-2 #dbdbdb` + borda `--borda #d9d9d9` sobre a página `#e6e6e6` = **1,11:1**; é uma mancha cinza sem contorno (`03-biblia-lista-390-claro.png`, `11-explorar-390-claro.png`). Mesma receita em `.campo textarea` (Minha história: três lajes cinza, `19-historia-390-claro.png`), `.busca-exata input`, `.campo-senha input/textarea/select`, `.seletor-config` (19:00), `.painel-outro input` (esse com fundo `--fundo` sobre cartão, some de vez). Interruptor desligado (`.interruptor`): trilho `--trilho` sobre cartão = **1,29:1**, botão branco sobre o trilho = **1,39:1**; os três "off" do Discipulado quase não existem (`10-discipulado-390-claro.png`). WCAG 1.4.11 pede 3:1 para o contorno de componente.

**Proposta.** Um token para "contorno que precisa ler" e outro para o trilho desligado:

```css
:root {
  --borda-controle: color-mix(in srgb, var(--tinta-fraca) 75%, var(--fundo));   /* ≈ #838383, ~3:1 sobre o fundo */
  --interruptor-off: color-mix(in srgb, var(--tinta-fraca) 70%, var(--cartao)); /* ≈ #8d8d8d, 3,1:1; botão branco 3,3:1 */
}
.busca-caixa input, .busca-exata input, .campo textarea,
.campo-senha input, .campo-senha textarea, .campo-senha select,
.seletor-config, .painel-outro input {
  background: var(--cartao);
  border-color: var(--borda-controle);
}
.interruptor { background: var(--interruptor-off); }
[aria-checked="true"] .interruptor { background: var(--verde); }   /* já existe; só para deixar claro que o "on" não muda */
```

No escuro o `color-mix` com `--tinta-fraca #9a9a9a` dá ≈ `#727272`/`#7a7a7a`, ~3,5:1 sobre `#171717`, sem precisar de regra extra.

**Risco.** Médio-baixo: é a mudança mais visível desta lista (os campos passam a ter borda de verdade). Se o dono preferir manter o visual "macio", o mínimo é trocar o fundo dos campos para `var(--cartao)` (passam a pertencer à família dos cartões) e deixar o interruptor; mas aí o 3:1 não fecha.

### 1.8 Barra inferior: anel da bolinha, tamanho do rótulo, disco do Mais

**Problema.** No recorte ampliado (`01-trilha-390-claro.png`, faixa da barra) a bolinha vermelha `.ponto-aba` tem um anel cinza: a borda é `2px solid var(--fundo)` (`#e6e6e6`), mas a barra é `--cartao` (`#f7f7f7`). No escuro (`01-trilha-390-escuro.png`) o anel é preto sobre `#171717`. O disco do Mais (`.mais-ico`, fundo `--fundo-2`) tem 1,3:1 no claro e **1,03:1 no escuro** (some, sobram três pontos soltos). Com Célula e Discipulado na barra (`.navegacao.cheia`), o rótulo cai para `clamp(0.56rem … 0.6rem)` = **9–9,6 px**; "DISCIPULADO" é o menor texto do app.

```css
.aba .ponto-aba { border-color: var(--cartao); }      /* .contador .ponto no topo continua --fundo, que é o fundo do topo */
.mais-ico { box-shadow: inset 0 0 0 2px var(--borda); } /* o disco passa a ter contorno nos dois temas */
.navegacao.cheia .aba:not(.aba-central) .rotulo-aba {
  font-size: clamp(0.62rem, calc(0.62rem + 0.04rem * var(--cresce)), 0.66rem);  /* ≥ 10px */
  letter-spacing: 0;
}
```

**Risco.** Baixo. A 320 px "DISCIPULADO" a 10 px em Oswald mede ~55 px e a ilha direita dá ~59 px por aba; conferir que não encosta em "MAIS". Os ícones aprovados ficam; só vale notar que o de Discipulado (duas pessoas, 28 px) parece maior que o balão do Juntos porque o viewBox tem menos margem, coisa de SVG, não de CSS.

---

## 2. Ajustes pontuais por tela

Formato: tela → problema → correção. Itens já cobertos na seção 1 aparecem só como referência.

1. **Trilha** (`01-trilha-*`) — (a) `.fala-bento` e `.leitura-hoje` com raio e relevo diferentes → 1.1 e 1.4. (b) Três margens diferentes entre os três primeiros blocos (12 / 14 / 16 px) → `.leitura-hoje { margin-bottom: 12px }`, `.faixa-unidade { margin: 12px 0 8px }`. (c) A 320 px o olho da faixa quebra ("UNIDADE 1 · 0 DE 31 / DIAS") → `.faixa-unidade .rot { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }`. (d) A 320 px o link "Novo na fé?" quebra em duas linhas e a bandeira fica no meio → `.leitura-hoje .novo-na-fe { align-items: flex-start } .leitura-hoje .novo-na-fe svg { margin-top: 3px }`. (e) `.ir-atual` → sombra flutuante (1.1).
2. **Lição do dia** (`02-licao-*`) — (a) Botão do pé ilegível → 1.5. (b) A barra de progresso do topo tem 16 px (`.barra`) enquanto a do leitor da Bíblia tem 4 px (`.leitor-progresso`); para o mesmo lugar, 8–10 px → `.licao-topo .barra { height: 10px }` (é o que `.barra.fina` já faz). (c) A 320 px os dois botões empilham bem; nada a fazer.
3. **Bíblia, lista** (`03-biblia-lista-*`) — (a) Campo de busca sem contorno → 1.7. (b) `.grade-livros { gap: 8px }` contra 12 px do resto → `gap: 12px` (ou 10 se ficar longo demais). As pílulas de livro estão certas: só borda 2 px, sem relevo (confirmado no recorte).
4. **Bíblia, leitor** (`04-biblia-leitor-*`) — Tela mais bem acabada do app. Único detalhe: `.leitor-cabeca { border-bottom: 2px }` mais o trilho do progresso logo abaixo formam duas linhas; `.leitor-cabeca { border-bottom: 0 }` deixa o trilho separar sozinho.
5. **Desafios** (`05-desafios-*`) — (a) Hero → 1.2. (b) O azulejo da missão "Faça uma rodada no Praticar" (`.icone-missao.c-vermelho`) e o `.cartao-praticar .icone-praticar` são **vermelhos**, e o CSS reserva vermelho para aviso ("nunca identidade", l. 90) → `.cartao-praticar .icone-praticar { background: var(--verde-fraco); color: var(--verde) }` e trocar `cor: 'vermelho'` por `cor: 'verde'` nas missões `pratica` e `acertos` (`src/app/02b-jogo.js`, linhas 73–74). As conquistas "Chama acesa" e "Memória" (linhas 218 e 229) também levam `vermelho`; só aparece quando ganhas, mas vale a mesma regra. (c) `.dsf-acao` é um botão fora da família (Nunito 900, 11 px de padding) → dar a ele a classe `botao` ou copiar `font-family: var(--fonte-destaque); text-transform: uppercase; letter-spacing: .03em; min-height: 50px`. (d) `.dsf-card` 22 px, `.dsf-item` 16 px, `.dsf-dias` 1,5 px → 1.3 e 1.4. (e) `.titulo-bloco span` ("5 horas") → 1.6.
6. **Praticar** (`06-praticar-*`) — (a) Hero e botão branco → 1.2. (b) Lista em caixa sem divisória → 1.3. (c) Estrelas vazias em `--trilho` (1,3:1) viram três borrões → `.estrelas i { color: var(--borda-3d) }` no claro já ajuda pouco; melhor `color: color-mix(in srgb, var(--tinta-fraca) 35%, var(--cartao))` (≈ 1,9:1, é decorativo, mas deixa de parecer sujeira). (d) A 320 px a seta de 22 px + gap 14 aperta o título → `.lista-pratica.caixa-lista .cartao-pratica { gap: 12px }` e `> svg { width: 20px; height: 20px }`.
7. **Juntos** (`07-juntos-*`) — (a) O coração de "Propósitos" (`.entrada-propositos > svg:first-child`, 28 px solto) é o único ícone de lista sem azulejo → `width: 44px; height: 44px; padding: 10px; border-radius: var(--raio-p); background: var(--verde-fraco)`. (b) O texto do feed (`.corpo-mural p`) é 1,08rem, maior que qualquer corpo do app → `font-size: 1rem`. (c) `.item-mural` divisória 2 px → 1.3. (d) `.botao-reagir` mantém o relevo: é pressionável.
8. **Propósitos** (`08-propositos-*`) — Sem nada abaixo do botão: a tela parece quebrada. Usar o padrão `.vazio-amigos` (ícone + frase) que já existe no Discipulado. É montagem em JS, mas o CSS está pronto.
9. **Célula** (`09-celula-*`) — (a) Vão de ~50 px entre "Marque o dia do encontro…" e "Precisam de atenção": `.passo-dica { margin-bottom: 18px }` + `gap: 4px` do `.painel-celula` + `.titulo-secao { margin-top: 28px }`, e em grid as margens não colapsam → `.painel-celula > .passo-dica { margin-bottom: 0 }` (o título já traz os 28). (b) A 320 px "ESCREVER UM RECADO" quebra em duas linhas no `.pe-duplo-plano` → `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))` (a 320 empilha, a 390 continua em duas colunas). (c) `.etiqueta-celula` → 1.6.
10. **Discipulado** (`10-discipulado-*`) — (a) Caixa sem divisórias → 1.3. (b) Interruptores desligados → 1.7. (c) "ENCONTRO DA SEMANA" quebra em duas linhas mesmo a 390 (o cartão tira 24 px de cada lado) → `.linha-amigo .pe-duplo-plano { grid-template-columns: 1fr }` (empilha dentro de cartão). (d) `.linha-amigo` 20 px abaixo de `.caixa-config` 26 px → 1.4. (e) Contador "1" → 1.6.
11. **Explorar** (`11-explorar-*`) — (a) Relevo na grade → 1.1. (b) `.icone-secao` raio 26 → 1.4. (c) `.seta-comece` é o único chevron num disco cinza (`--fundo-2`, 1,3:1) → `width: 44px; height: 44px; background: none; color: var(--tinta)` (vira um `.botao-icone`). (d) `.grade-secoes { gap: 10px }` → 12 px, igual à margem entre cartões. (e) Alturas de barra de progresso: `.barra-comece` 8, `.barra.fina` 10, `.barra-missao` 14, `.barra` 16, `.leitor-progresso` 4 → escala da seção 3.
12. **Nota do Explorar** (`12-nota-*`) — A tabela "Onde ler" é a única peça de canto reto do app, com bordas de 1 px em cada célula → `.rolagem-tabela { border: 2px solid var(--borda); border-radius: var(--raio-p); overflow: hidden } .nota-corpo table { margin: 0 } .nota-corpo th, .nota-corpo td { border: 0; border-bottom: 1px solid var(--borda) } .nota-corpo td + td, .nota-corpo th + th { border-left: 1px solid var(--borda) } .nota-corpo tr:last-child td { border-bottom: 0 }`. O h2 em petróleo é bom para leitura longa: manter.
13. **Primeiros passos** (`13-passos-*`) — (a) Hero cinza → 1.2. (b) Bolinhas com relevo e lista sem divisória → 1.1 e 1.3. (c) A linha "próxima" usa a família roxa (`--roxo-fraco` de fundo, `--roxo` na bolinha), que no escuro vira cinza-claro → `.lista-licoes.caixa-lista .item-licao.proxima { background: var(--acento-fraco) }`, `.lista-licoes.caixa-lista .item-licao.proxima .num { background: var(--inverso); color: var(--inverso-tinta) }`, `.lista-licoes.caixa-lista .item-licao .marca-proxima { color: var(--acento) }`.
14. **Lição dos passos** (`14-licao-passos-*`) — Bom. `.nota-corpo` a 1,05rem e `.leitor-texto` a 1,12rem fazem o mesmo trabalho (leitura longa); um tamanho só (1,1rem) para os dois.
15. **Perfil** (`15-perfil-*`) — (a) A linha sob o retrato (`.cartao-pessoa`, 2 px de ponta a ponta) → 1 px (1.3). (b) Na "Visão geral" a chama tem 34 px e os outros ícones 26 px → `.visao-item > .ico-chama { width: 28px; height: 28px }`. (c) A 320 px "dias de ofensiva" e "livros terminados" quebram → `.visao-item small { font-size: 0.78rem }` ou `.visao-geral { gap: 4px 8px }`. (d) `.titulo-perfil { margin: 20px 0 12px }` contra `.titulo-secao` 28 px na mesma tela → um valor só (seção 3). (e) `.colecao-atalhos a` 20 px e `.lista-atalhos { margin-top: 22px }` (34 px entre o título e a lista) → raio 1.4 e `margin-top: 0`.
16. **Conquistas** (`16-conquistas-*`) — A medalha `.arte-medalha.sem-nivel .escudo` com relevo de 6 px em `--borda-3d` é arte de troféu: fica. Só as barras vazias em `--trilho` (1,3:1) deixam a tela lavada; se incomodar, `--progresso-trilho: var(--fundo-2)` no claro (fica neutra) — decisão de identidade, não obrigatória.
17. **Troféus** (`17-trofeus-*`) — `.trofeu` 20 px (1.4), `.estante { gap: 10px }` → 12, contador "0 DE 4" (1.6). Grade em duas colunas a 320 px funciona bem.
18. **Meus versículos** (`18-versiculos-*`) — Sem estado vazio (só a introdução, e o resto da tela em branco) → padrão `.vazio-amigos` (ícone de marcador + frase), como em 2.8.
19. **Minha história com Deus** (`19-historia-*`) — (a) Três textareas sem contorno → 1.7. (b) Uma pílula cinza vazia aparece logo abaixo da introdução: é o `<span class="selo-status" id="salvo-historia" role="status">` (`src/app/07-perfil.js:390`) renderizado antes de ter texto → `.selo-status:empty { display: none }` (o `role="status"` continua funcionando quando o texto entra). (c) Contador "0 de 600 caracteres" colado no campo → `.dica-campo { margin-top: 6px }`.
20. **Livros da Bíblia** (`20-livros-*`) — O "0/20" das pílulas usa `.conta-livro { opacity: .65 }` sobre `--tinta`: ≈ 3,9:1, abaixo de 4,5 → `opacity: 1; color: var(--tinta-fraca)` (6:1).
21. **Configurações** (`21-config-*`) — (a) Caixas sem divisória → 1.3. (b) A 320 px "Seu caminho" quebra porque `.linha-config .valor { max-width: 55% }` empurra o rótulo → `.linha-config > span:first-child { flex: 1 1 auto; min-width: 45% } .linha-config .valor { max-width: 50% }`. (c) Interruptor → 1.7. (d) `.grupo-config h2.etiqueta` → 1.6.
22. **Notificações** (`22-notificacoes-*`) — (a) Caixa "O que chega" sem divisória → 1.3. (b) `.seletor-config` (19:00) sem contorno → 1.7. (c) `.marca-push` 42 px → 44, como os outros azulejos.
23. **Painel do administrador** (`23-painel-*`) — (a) Tamanhos em px (`.painel-cartao strong` 28px, `strong.texto` 19px, `small` 12.5px, `.painel-linha2 small` 14px) → 1.75rem / 1.2rem / 0.78rem / 0.88rem. (b) `.painel-outro input` com fundo `--fundo` sobre cartão (some) → 1.7. (c) A caixa "Leituras por dia" fica 150 px vazia sem dado → frase de vazio (`.vazio`) quando não há colunas.
24. **Apoiar** (`24-apoiar-*`) — (a) `.apoiar-valor` 12 px/15px e `.aviso-apoiar` 12 px/14px → `--raio-p` e `--raio`, 0,95rem e 0,88rem. (b) "Quem recebe: …" colado no botão "MOSTRAR QR CODE" → `.apoiar-pix .passo-dica { margin-top: 10px }`. (c) Divisórias da lista → 1.3.
25. **Painel "Mais"** (`25-mais-*`) — É a referência de lista do app (1 px, azulejo, título + linha de apoio). Só `.painel-mais .q` 12 px → 14 (1.4) e 40 px → 44, como os outros azulejos.

---

## 3. Escala única

### 3.1 Espaçamento — 4 · 8 · 12 · 16 · 24 · 32

```css
:root { --e1: 4px; --e2: 8px; --e3: 12px; --e4: 16px; --e5: 24px; --e6: 32px; }
```

| Papel | Valor | Hoje (exemplos) → escala |
|---|---|---|
| Ícone ↔ texto, micro | 4 | `gap: 2px` (×10), `3px` (×5), `1px` → 4 · `gap: 5px`, `6px` (×22) → 4 ou 8 |
| Dentro de uma peça | 8 | `gap: 10px` (×50) → 8 ou 12 · `margin-top: 6px` (×10) → 8 |
| Entre itens de lista, entre cartões, título → conteúdo | 12 | `.cartao margin-bottom 14` · `.leitura-hoje 14` · `.grade-secoes gap 10` · `.estante gap 10` · `.grade-livros gap 8` · `.lista-atalhos margin-top 22` → 12 |
| Padding de cartão, margem lateral da página | 16 | `.conteudo 16` ✓ · `padding: 14px` (×12), `12px 14px` (×17), `14px 16px` (×8) → 16 (ou 12 16 em linhas de lista) |
| Hero, folhas, separação de blocos | 24 | `.grupo-config margin-top 20` · `.bloco-missoes 24` ✓ · `.grade-livros margin-bottom 22` · `.lista-versiculos 22` · `.folha padding 26 20` → 24 |
| Entre seções (acima do h2) | 32 | `.titulo-secao margin 28px 0 12px` → `32px 0 12px` · `.titulo-perfil 20 0 12` → igual ao `.titulo-secao` |

Regra de ritmo: **32 acima do título de seção, 12 abaixo, 12 entre cartões, 16 dentro**. Em contêiner `display: grid` as margens não colapsam: zerar o `margin-bottom` do último filho antes de um `.titulo-secao` (caso da Célula, 2.9).

### 3.2 Raios — 14 · 20 · 26 · cápsula

| Token | Família | Literais a mapear |
|---|---|---|
| `--raio-p` 14 | azulejo de ícone (≤ 56 px), input, botão-ícone, balão, `.leitor-verso` | 12 (×5) → 14 |
| `--raio` 20 | bloco interno, aviso, textarea, cartão-versículo, cartão pequeno de grade (`.trofeu`, `.colecao-atalhos a`, `.item`) | 16 (×5) → 20 |
| `--raio-g` 26 | cartão de largura total, caixa de lista, hero, folha, painel do Mais, barra inferior | 22, 24, 30 → 26 |
| `--raio-capsula` 999 | botão, pílula, selo, trilho de progresso, interruptor | ✓ |
| 50 % | retrato, nó, bolinha | ✓ |
| 3–8 | só micro (chip de código, colunas do gráfico, ponta de barra) | manter 6 e 8; 3 e 4 → 4 |

### 3.3 Linhas

| Papel | Espessura · cor |
|---|---|
| Contorno de cartão, caixa, pílula, azulejo | 2 px `--borda` |
| Divisória interna de lista | 1 px `--borda` (`--linha`) |
| Contorno de controle que precisa ler (input, busca, interruptor off) | 2 px `--borda-controle` (~3:1) |
| Botão de contorno | 2 px `--tinta-forte` (hoje 1,6) |
| Topo e barra inferior | 1 px `--borda` (hoje 2 e 1) |
| Foco | 3 px `--azul` (já existe) |
| Fio de destaque lateral (`.pensamento-dia`, `.recado-lider`, `.dsf-base`) | 4 px `--acento` ✓ |

### 3.4 Sombras e profundidade

| Nível | Uso | Valor |
|---|---|---|
| 0 — chapado | cartões, listas, heróis, azulejos, botões | nenhum |
| 1 — anel de estado | hoje, selecionado, foco, ganho | `box-shadow: 0 0 0 N px cor` (já usado: `.no.travado`, `.no-marco`, `.perfil-topo.selecionado`, `.cor-marca[aria-pressed]`) |
| 2 — relevo (aperta) | `.opcao`, `.pergunta-reflexao`, `.opcao-sistema`, `.botao-reagir` | `border-bottom-width: 4px` + `:active` que abaixa |
| 3 — flutua | `.pop-no`, `.aviso-flutuante`, `.ir-atual`, `.painel-mais` | `--sombra-flutuante` (`0 10px 30px rgba(30,25,15,.12)` claro · `rgba(0,0,0,.55)` escuro) |
| 4 — brilho | só `.aba.aba-central` (exceção pedida pelo dono) | `0 4px 14px color-mix(--inverso 35%)` |
| Arte | medalha, escudo, livro (`inset 0 -6px 0`) | fica: é desenho de troféu |

### 3.5 Tipografia — 8 tamanhos, 4 pesos

| Passo | rem | Papel | Hoje (mapear) |
|---|---|---|---|
| 1 | 0,72 | rótulo caixa-alta, chip | 0,6–0,75 (×29), .68, .66, .7, .74, .75 |
| 2 | 0,8 | apoio, contador, legenda | 0,78, 0,82, 0,84 |
| 3 | 0,88 | secundário, dica, meta | 0,85, 0,86, 0,9, 0,92 |
| 4 | 1 | corpo, linha de lista, botão pequeno | 0,95, 0,98, 1,02, 1,03 |
| 5 | 1,12 | leitura longa, título de item, botão | 1,05, 1,08, 1,1, 1,15 |
| 6 | 1,25 | h3, destaque, número de estatística | 1,18, 1,2, 1,3, 1,35 |
| 7 | 1,4 | h2 (Oswald) | 1,5, 1,6 |
| 8 | 1,85 | h1 (Oswald) | 1,9, 2 |
| grande | 2,8 / 5,6 | número da ofensiva, capítulo | ✓ |

Valores em px (`12.5px`, `14px`, `15px`, `16px`, `19px`, `28px` no Painel e no Apoiar) → rem. Pesos: **600** corpo · **700** apoio e rótulo · **800** nome/título de item · **900** só número de destaque (ofensiva, estatística, capítulo). Hoje há 83 usos de 800 e 38 de 900; boa parte do 900 em texto pequeno pode descer para 800 sem perder hierarquia. Entrelinha: 1,5 corpo, 1,72 leitura, 1,2 títulos — já está assim, manter.

### 3.6 Barras de progresso — 4 · 8 · 14

| Altura | Uso | Hoje |
|---|---|---|
| 4 | rolagem do leitor (`.leitor-progresso`) | ✓ |
| 8 | dentro de cartão e lista (`.barra-comece`, `.dsf-barra`, `.painel-trilho`, `.linha-conquista .barra-missao`, `.corpo-semeador .barra-missao`, `.barra.fina`, `.licao-topo .barra`) | 8, 8, 10, 12, 12, 10, 16 |
| 14 | destaque (`.barra`, `.barra-missao`, `.semana-ofensiva .trilho` 46 é arte) | 16, 14 |

### 3.7 Azulejo de ícone — 44 px, `--raio-p`, `--verde-fraco`/`--verde`

`.icone-missao` 44 ✓ · `.bloco-secao .icone` 44 ✓ · `.cartao-continuar .icone-continuar` 44 ✓ · `.marca-push` 42 → 44 · `.painel-mais .q` 40 → 44 · `.passagem .marca-trilha` 48 → 44 · `.cartao-praticar .icone-praticar` 48 → 44 · `.cartao-pratica .marca` 50 → 44 · `.icone-secao` 56 (cabeçalho, pode ficar maior) · `.entrada-propositos svg` sem azulejo → azulejo. Estado travado/adiante: `--fundo-2`/`--tinta-fraca` (já é assim em `.cartao-pratica.adiante`).

---

## 4. O que já está bom (não mexer)

- **A arquitetura de cor.** Um acento só, "cor diz estado, nunca categoria", `--inverso` igual nos dois temas, vermelho reservado a aviso, `color-scheme: only light` com a explicação do Android. Os comentários do `:root` são a melhor documentação de design do projeto; as propostas acima só cobram o que eles prometem.
- **Contraste de texto.** `--tinta-fraca` dá 5,1–6,0:1 no claro e 6,4–6,9:1 no escuro; acento 6,2:1 / 8,8:1; branco sobre petróleo 7,8:1; tinta do "hoje" 8,5:1; cadeado travado 3,95:1 (ícone, passa). Links sublinhados, `:focus-visible` de 3 px, `prefers-reduced-motion` respeitado.
- **A Trilha.** Nós, anel do dia, faixa sticky da unidade com número grande, balão "COMEÇAR", baú, troféu de fim de unidade: coerente nos dois temas e legível no cinza. Fica como está.
- **A família de botões.** Cápsula de 50 px, Oswald caixa-alta, primário/contorno/plano/branco: lê como uma família só. Áreas de toque de 44 px em tudo que é pequeno (`.contador`, `.botao-icone`, `.perfil-topo`, `.voltar`, `.titulo-secao a`, `.link-nota`, `.novo-na-fe`).
- **O leitor da Bíblia.** Coluna de 36em, 1,12rem/1,72, número do versículo em acento, cabeçalho do capítulo com o fio, navegação de capítulos no pé. A tela mais acabada do app; serve de régua para as notas do Explorar.
- **O painel do Mais.** Divisória de 1 px, azulejo de 40 px, título + linha de apoio, raio da folha igual ao da barra. É o modelo de lista que a seção 1.3 espalha para o resto.
- **A barra inferior.** Bíblia central cheia, indicador de aba ativa (traço de 18×3), a régua `--cresce` que encolhe tudo junto a 320 px, rótulos sempre visíveis. Só os três detalhes de 1.8.
- **Blocos suaves sem borda** (`.aviso-cadeado`, `.pedido-mural`, o "Mostrar seus marcos aos amigos?", `.aviso-apoiar`): fundo `--acento-fraco`, sem contorno, raio 20. É um bom segundo nível de cartão; manter como está e usar para todo aviso/prompt.
- **Tema escuro.** Preto de verdade com cartão um degrau acima, bordas `#2b2b2b` visíveis mas discretas, acento que clareia sozinho. Depois de 1.2 (heróis) e 1.7 (controles) não precisa de mais nada específico.
- **Explorar.** Grade de dois cartões com azulejo, título e linha de apoio; a tabela e o relevo são os únicos deslizes.

---

## Prioridade sugerida

1. **Correções sem risco, hoje:** 1.5 (botão desabilitado), 1.3 (divisórias que sumiram + `--linha`), 1.8 (anel da bolinha, rótulo de 10 px), S9 (pílula vazia, estados vazios), 2.20 (contador das pílulas de livro), S7 (alinhamento).
2. **O passe que tira o ar de "gerado", uma tarde:** S1 (três níveis de moldura) + 1.1 (relevo) + S4 (vazio neutro) + S2 (pesos e caixa-alta) + 1.6 (rótulos) + 1.4 (raios) + 1.2 (heróis). Fazer junto e comparar as capturas de antes e depois.
3. **Decisão do dono:** S3 (botões secundários menores: muda a montagem em JS), 1.7 (contorno de campos e interruptor: muda o visual "macio" para fechar o 3:1) e a escala de espaçamento da seção 3.1 (mecânica, mas toca dezenas de regras).

O que precisa de verificação além das capturas: ordem de foco e nomes acessíveis dos botões-ícone (`.seta-comece`, `.botao-icone.letra`, `.lapis`), anúncio do estado do interruptor (`role="switch"` já está) e leitura do botão desabilitado por leitor de tela.
