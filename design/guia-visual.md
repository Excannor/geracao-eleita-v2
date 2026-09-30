# Guia visual do redesenho (versão 3, vale sobre as anteriores)

App de leitura bíblica: a regra-mãe é **leve aos olhos nos dois temas**. Nada cansativo nem pesado para quem lê 15 minutos por dia. O dono do produto escolheu, como referência do tema claro, um app de casa inteligente muito limpo com acento verde-sálvia; e pediu que o tema escuro siga o mesmo padrão, também suave (grafite, não preto; texto quase branco, não branco puro).

## Referências (descrição fiel; as imagens não estão em disco, exceto a 1)
1. `design/referencia-1.png` (cartão de visita digital): cinza-claro, cartões brancos grandes e arredondados, botão preto em pílula, verde usado com parcimônia, **botão central levantado na barra de abas**.
2. App de condomínio: folha branca no topo com avatar, saudação e botões redondos de ícone; controle segmentado com o ativo em pílula preta; cartões brancos com avatar, selo em pílula com contorno e visto, etiqueta cinza-clara; botão preto largura total com "+"; barra de abas em pílula com botões redondos.
3. **Referência principal do tema claro** (casa inteligente): fundo cinza-claro #ececec; cartões brancos grandes, macios, raio ~32, sem borda nem sombra; títulos pretos em bold e secundário cinza; acento **verde-sálvia dessaturado** (~#c5d88a) só em pontos: botão redondo de play, ponto da barra de progresso, coração; item selecionado com fundo sálvia bem pálido e **listras diagonais sutis**; ícone em círculo sálvia pálido; chips: ativo em pílula preta com texto branco, inativos em pílula branca; botão redondo branco "+"; barra de abas: **pílula preta compacta** com botões redondos escuros e a ativa em **círculo branco com ícone preto e um pontinho sálvia**; topo com avatar redondo à esquerda e botões redondos brancos à direita (sino com ponto vermelho).

## Tokens (um nome, dois valores; nunca cor literal que valha só num tema)
| Token | Claro | Escuro (suave, de leitura) | Uso |
|---|---|---|---|
| fundo | #ececec | #1b1c1a | fundo das telas |
| cartao | #ffffff | #252724 | cartões, folhas, página do leitor |
| campo | #f3f3f3 | #2e302c | campos, pílulas neutras, círculos de ícone neutros |
| contorno | #e2e2e2 | #3a3d37 | só onde precisa (travado, campo, selo) |
| tinta-forte | #151615 | #eef0ea | títulos, números |
| tinta | #2c2d2b | #d9dcd3 | texto corrido e texto bíblico |
| tinta-fraca | #686b66 | #a4a99d | legendas, metadados |
| salvia | #c8da8c | #bfd083 | acento em preenchimento (tinta #151615 por cima, nunca branco) |
| salvia-palido | #eef3de | #2c3324 | realce do item de hoje/selecionado, círculo de ícone de destaque |
| salvia-texto | #5a6b2a | #c9d98f | acento como texto ou ícone sobre fundo/cartão |
| inverso | #151615 | #eef0ea | botão principal, chip ativo, nó lido |
| inverso-tinta | #ffffff | #1b1c1a | texto sobre inverso |
| barra | #151615 | #10110f | pílula da barra de abas |
| barra-botao | #2a2b29 | #2a2c28 | botões redondos inativos da barra (ícone #e6e6e6) |
| chama (arte) / chama-texto | #e23d1b / #b3321a | #ff7a52 / #ff9a7a | só a ofensiva |
| alerta | #c62828 | #ff8a80 | só erro e aviso |
Listras do realce: `repeating-linear-gradient(135deg, transparent 0 10px, rgba(21,22,21,.045) 10px 20px)` no claro; `rgba(255,255,255,.035)` no escuro, por cima do salvia-palido.
Contraste: texto ≥ 4,5:1 (texto bíblico ≥ 7:1), ícone que carrega estado ≥ 3:1. Confira com um script.

## Tipografia
- **Manrope** (400–800) para toda a interface; **Literata** (400/600) só para texto bíblico e referências de passagem no leitor e nas citações. Números com `tabular-nums`. Nada abaixo de 12 px. Sem caixa-alta forçada (exceto onde o carimbo em pincel a usa).
- Leitor: Literata 18–19 px, entrelinha 1,7, coluna de ~65 caracteres; no escuro, texto #d9dcd3 sobre #252724 (nunca branco puro sobre preto).
- Títulos com `text-wrap: balance`, corpo com `text-wrap: pretty`; espaço inseparável entre número e nome de livro ("1 Timóteo", "Marcos 2", "1 Samuel 16.7").

## Formas e peças
- Cartões raio 28–32, sem borda e sem sombra (o cartão se separa do fundo pela cor). Botões, campos, chips, selos em pílula. Botões de ícone redondos de 48–52 px. Alvos de toque ≥ 44 px.
- Botão principal: pílula `inverso` com texto `inverso-tinta` (preto/branco no claro, claro/escuro no escuro), altura 52–56. Secundário: pílula `cartao` ou contorno.
- Cabeçalho das telas: título centralizado, botão redondo de voltar à esquerda quando houver, botões redondos de ação à direita. Perfil pelo retrato redondo do topo (como já é no app).
- Barra de abas: a do app atual é em **duas ilhas com a Bíblia levantada no meio**. Mantenha essa estrutura e a lógica (abas variam conforme célula/discipulado; Mais abre painel), no visual da referência 3: ilhas em pílula `barra`, botões redondos `barra-botao`, ativa em círculo claro (#ffffff no claro, #eef0ea no escuro) com ícone escuro e pontinho `salvia`; a Bíblia no meio como botão redondo levantado maior, em `salvia` com ícone escuro (como o botão central da referência 1). Ícones de traço consistentes (espessura única).
- Trilha: estrada em zigue-zague sobre o fundo (sem zona preta fixa), nós redondos: lido `inverso` com ícone `inverso-tinta`; hoje `salvia` com ícone escuro e anel de progresso; travado `cartao` com contorno e cadeado `tinta-fraca`; fecha-livro escuro com ícone sálvia; rótulo "Dia N" e a passagem ao lado de cada nó; linha contínua até hoje e pontilhada depois; o cartão de hoje ao lado do nó, com realce sálvia pálido listrado.
- Cartões de destaque (ex.: leituras de hoje, ofensiva): cartão `cartao` com número em bold e botão redondo `salvia` com ícone escuro. Nada de chapa de cor forte grande.

## Regras que não podem ser quebradas
- **Carimbo em pincel é padrão do app e fica idêntico**: na entrada (`.selo-lema`, `.selo-linha`, `.selo-com-cruz`, `.selo-cruz`, `.selo-ref` em src/entrar.html) e na folha da ofensiva (o selo de pincel com a frase por estágio que o original ganhou em f5a33ea). Mesma fonte (Permanent Marker), blocos, cores, deslocamentos. Só o entorno segue o visual novo; nenhuma regra nova pode atingir essas classes.
- Não mudar lógica, conteúdo, data-atributos, handlers nem fluxos. Os testes do repositório têm de continuar passando.
- Sem lamparina nova, emoji, degradê decorativo, sombra em cartão, borda cinza em volta de cartão.

## Defeitos já conhecidos da primeira versão (evitar de novo)
Quebras: nome de unidade com palavra sozinha; "1 / Timóteo"; "com / Ana"; "Marcar como lido" em 2 linhas; "Versículos / guardados"; "(1 / Samuel 16.7)". Caixas: rótulo passando por baixo de ícone; números de cartões vizinhos desalinhados; reticências cortando nome; folha da ofensiva abrindo rolada para o fim (use preventScroll no foco); balão da trilha cobrindo o cartão de hoje; botão flutuante cobrindo o último cartão. Alvos < 44 px em "Continuar", pílulas e filtros, link Privacidade. Fonte < 12 px ("NÍVEL", "0 dias juntos", troféus). Texto da chama em arte sobre branco (usar chama-texto). Estrelas vazias invisíveis. Interruptor desligado sem contraste. Estados vazios sem cuidado. Introduções ora à esquerda ora no centro.

## Ferramentas
- Build: `node build.mjs`; testes: `node teste.mjs` e os de navegador em `ferramentas/` (exporte `CHROME=/tmp/claude-0/-home-user-geracao-eleita/f83429da-2006-5b51-8495-2381601c862d/scratchpad/chrome.sh`).
- Servidor de teste: `CAMINHO_ABERTO=1 CAMINHO_ESTADO=<pasta própria>/estado.json nohup node servidor.mjs <porta própria> &` a partir da sua pasta de trabalho, depois do build (confira no servidor.mjs se as variáveis continuam as mesmas).
- Capturas: `CHROME=... node ferramentas/foto.mjs <largura> <altura> <saida.png> '<#/rota>' <urlBase> [rolar] [tema]`.
- Varredura automática de defeitos (vazamento, corte, reticências, quebra, palavra sozinha, fonte < 12, alvo < 44, contraste, fundo atrás da barra): `/tmp/claude-0/-home-user-geracao-eleita/f83429da-2006-5b51-8495-2381601c862d/scratchpad/rev/rev.mjs` com listas de trabalhos no formato de `rev/trab.mjs` (use `BASE=http://localhost:<porta>/`). Leia o código antes de usar.
- Referências do primeiro redesenho, para reaproveitar peças: `git show be99484:src/estilo.css` (camada "REDESENHO (v2)"), `git show be99484:src/fontes.css` (Manrope e Literata embutidas), `git show be99484:src/app/<arquivo>` e as maquetes em `design/telas/`.

## Decisão do dono sobre o Início (30/09, vale sobre o resto deste guia)
O Início/Trilha fica com o layout da primeira versão, que o dono aprovou ("estava bem melhor"), só trocando o verde neon pelo sálvia:
- folha BRANCA no topo com cantos inferiores arredondados: retrato redondo (leva ao Perfil), "Olá, Nome!", "Dia N de 365 do plano", dois botões redondos cinza-claros (mensagens/Juntos e sino) com ponto de novidade;
- dois cartões de destaque lado a lado, em **sálvia** (#c8da8c) com tinta #151615: "N de 2 · leituras hoje" e "N dias · seguidos", cada um com botão redondo preto (seta/visto e a chama);
- abaixo, a trilha num bloco ESCURO suave (#1b1c1a) nos dois temas: faixa da unidade com o número em círculo escuro e algarismos sálvia, nós lidos brancos com ícone escuro, hoje em sálvia com anel, travados escuros com contorno e cadeado cinza, rótulo "Dia N" e passagens ao lado, linha branca até hoje e pontilhada depois;
- a barra de abas continua na estrutura nova (ilhas com a Bíblia no meio), que combina com o bloco escuro.
Referência visual exata: a tela Início do commit be99484 (git show be99484:src/app/03-trilha.js e a camada REDESENHO de be99484:src/estilo.css), com #dff74a trocado por sálvia.

## Decisão do dono sobre TODAS as telas (30/09, vale sobre o resto deste guia)
Todas as telas seguem o estilo da primeira versão do redesenho (commit be99484), que o dono aprovou, trocando o verde neon (#dff74a) pelo sálvia (#c8da8c, tinta #151615 por cima):
- topo em folha BRANCA com cantos inferiores arredondados (título ou saudação, botões redondos cinza-claros) e o conteúdo principal em blocos ESCUROS suaves (#1b1c1a com cartões #252724), como o Início, o Perfil e os Desafios de be99484;
- cartões de destaque (números, atalhos como Praticar e "A história da Bíblia") em sálvia com botão redondo preto;
- nas telas de conteúdo longo (leitor, lição, Bíblia, notas) a página de leitura continua clara e confortável, como no leitor de be99484;
- tema escuro: mesmo layout, a folha do topo vira #252724 e o resto fica no grafite suave.
Referências exatas: as capturas da primeira versão em /tmp/claude-0/-home-user-geracao-eleita/f83429da-2006-5b51-8495-2381601c862d/scratchpad/app/final-*.png e o código de be99484 (git show be99484:src/estilo.css, camada REDESENHO; git show be99484:src/app/<arquivo>). Telas que não existiam na primeira versão (Bíblia inteira, versículos, célula, discipulado, painel, apoiar, Conhecer Jesus, Mais) seguem o mesmo padrão.

## Ajuste do dono (30/09): o claro é claro e o escuro é escuro (vale sobre as duas decisões acima)
O layout da primeira versão fica (folha do topo com saudação e botões redondos, cartões de destaque em sálvia, trilha com nós, rótulos e cartão de hoje), mas as cores de cada tema ficam coerentes com o tema:
- **Tema claro:** o corpo (trilha e conteúdo) em fundo CLARO suave (#ececec, cartões #ffffff), igual ao tema novo; a FOLHA DO TOPO invertida, em grafite (ex.: #252724, texto #eef0ea, botões redondos #33352f), com os cartões sálvia por cima. Nós lidos pretos (#151615) com ícone branco, hoje em sálvia com anel, travados brancos com contorno e cadeado cinza, linha escura até hoje e pontilhada depois.
- **Tema escuro:** o corpo em grafite suave (#1b1c1a, cartões #252724); a folha do topo em grafite um pouco mais claro (ex.: #2e302c) para se destacar sem virar um bloco branco; nós lidos em #eef0ea com ícone escuro, hoje em sálvia.
- Nada de bloco preto no tema claro nem bloco branco no tema escuro. Valores finais escolhidos por contraste (texto ≥ 4,5:1, ícones de estado ≥ 3:1) e registrados na tabela de tokens.
