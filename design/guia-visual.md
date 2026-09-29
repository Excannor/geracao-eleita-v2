# Guia visual do redesenho (aprovado)

A tela inicial `design/telas/R1Trilha.dc.html` foi a primeira aprovada e é o modelo das demais: tokens, fonte, barra de abas e jeito de desenhar. As referências visuais que o usuário mandou estão descritas abaixo (a primeira também está em `design/referencia-1.png`; abra e olhe).

## As referências do usuário
1. **Cartão de visita digital (images/1.png)**: fundo cinza muito claro, cartões brancos grandes e bem arredondados, texto preto em sans bold, botão preto em pílula largura total ("Get started"), verde-limão usado com parcimônia (toggle, botão "Upgrade now", botão central da barra), ícones de linha finos, botões redondos de ícone.
2. **App de condomínio (3 telas)**:
   - Início: folha BRANCA no topo com cantos inferiores arredondados (avatar redondo + "Hello, Chris" + subtítulo cinza; dois botões redondos cinza-claro com ícone de linha, um com ponto vermelho de notificação; busca em pílula cinza-clara; dois cartões LIMA lado a lado com número grande em bold, legenda e um botão redondo PRETO com seta ">" à direita). Abaixo, fundo PRETO com: fileira de "chips" escuros (círculo cinza-escuro com ícone + rótulo branco), título de seção branco ("Announcements") com "View all" cinza à direita, cartão cinza-escuro com título branco, etiqueta em contorno ("2h ago"), texto cinza-claro e botão BRANCO em pílula com seta ("Read More →").
   - Community / Gate Updates: fundo cinza-claro; no topo um botão redondo BRANCO de voltar à esquerda e o título centralizado em bold; busca em pílula branca; **controle segmentado**: trilho branco em pílula, opção ativa em pílula PRETA com texto LIMA, as outras em texto preto; cartões brancos grandes com avatar redondo, nome em bold, subtítulo cinza, **selo de status em pílula com contorno cinza e ícone de visto** ("Approved", "Pending"), **etiqueta cinza-clara em pílula** ("Plumber", "Guest"), horário com ícone; botão PRETO em pílula largura total com ícone "+" e texto em LIMA ("Add Visitor", "Create Post"); cartão de post com ações em pílulas cinza-claras (curtir 25, comentar 10) e botão redondo de compartilhar; cartão de destaque com título grande e botão preto com texto lima ("Pre-Approve Entry").
   - Barra de abas: pílula flutuante com 5 botões REDONDOS de ícone, sem rótulo visível; o ativo é um círculo PRETO com ícone LIMA.

## Tokens (hex literais, como no modelo)
- Telas claras: fundo `#efefef`; cartão/folha `#ffffff`; campo e pílula neutra `#f2f2f2`; texto forte `#111111`; texto `#2a2a2a`; texto fraco `#6b6b6b` (≥4,5:1 no branco e no #efefef); contorno de selo `#dcdcdc`.
- Telas escuras / blocos escuros: fundo `#0c0c0c`; cartão escuro `#1c1c1c`; círculo escuro `#222222`/`#2a2a2a`; texto `#ffffff`; texto fraco `#9d9d9d`; contorno `#3a3a3a`.
- Lima: `#dff74a` (sempre com texto `#111111` por cima, ou como texto sobre preto; NUNCA texto lima sobre branco ou cinza-claro, não tem contraste).
- Preto de ação: `#111111` (botões) e `#000000` (aba ativa).
- Notificação: `#ff4d3d`. Chama da ofensiva: `#ff6a2b` + `#ffc53d` (o desenho de fogo do modelo; nunca lamparina).
- Barra de abas: pílula `#262626`, círculos `#363636` com ícone `#e8e8e8`, ativo `#000000` com ícone `#dff74a`. A MESMA barra em todas as telas (inclusive as claras), posição `left:20px; right:20px; bottom:20px; height:76px; border-radius:38px`, copiada do modelo; só muda qual círculo é o ativo (e o `aria-current="page"`).

## Tipografia
- Uma família só: **Manrope** (500, 600, 700, 800), link igual ao do modelo. Números com `font-variant-numeric: tabular-nums`.
- Título de tela centralizado: 20px / 700 / `letter-spacing:-0.01em`. Título de seção: 20–22px / 600–700. Nome em cartão: 16–17px / 700. Corpo: 15–16px / 500, entrelinha 1.5. Legenda/metadado: 12–13px / 500–600 em texto fraco. Botão: 16px / 600–700. Nada abaixo de 12px.
- Exceção única: o TEXTO BÍBLICO do leitor pode usar **Literata** (400, 18–19px, entrelinha 1.65) para leitura longa; adicione `family=Literata:ital,wght@0,400;0,600;1,400` ao mesmo link. Números de versículo em Manrope 700 12px.

## Formas e acabamento
- Raios: cartões 24–30px; folha do topo `0 0 36px 36px`; botões, campos, selos e etiquetas em pílula (999px); botões de ícone são círculos de 52px (claros `#f2f2f2` ou brancos `#ffffff` sobre o cinza); cartões lima 26px.
- Nenhuma borda cinza em volta dos cartões: o cartão branco se separa do fundo cinza pela cor. Sombra só na barra de abas quando estiver sobre fundo claro (`0 10px 30px rgba(17,17,17,.12)`), nunca em cartões.
- Espaço: margem lateral 16px; 12–16px entre blocos; padding de cartão 18–20px.
- Ícones: de linha, traço 1.6–1.9, pontas arredondadas, 22–24px, desenhados como SVG inline (copie os do modelo quando existirem: perfil, mensagens, sino, trilha, desafios/troféu, juntos, explorar/bússola, seta, visto, caneta, cadeado, estrela, fogo).
- Botão principal: pílula preta `#111111`, altura 56–60px, texto lima `#dff74a` 16px/700 com ícone (ex.: "+" ou seta). Botão secundário sobre escuro: pílula branca com texto preto. Botão de voltar: círculo branco 52px com seta de linha.
- Controle segmentado: trilho branco em pílula com padding 6px; opção ativa pílula preta com texto lima; inativas texto `#2a2a2a`.
- Selo de status: pílula com contorno 1.5px `#dcdcdc`, ícone de visto em círculo, texto 14px/600 (ex.: "Já leu hoje", "Ainda não").
- Etiqueta: pílula `#f2f2f2`, texto 13px/600 (ex.: "Pessoa", "Lugar", "15 min").
- Prefira o padrão de TOPO das telas internas da referência: botão de voltar redondo à esquerda (só onde fizer sentido) e título centralizado; nas telas de aba (Desafios, Juntos, Explorar, Perfil) use título centralizado com botões redondos de ação ao lado, sem voltar.
- Nada de degradê decorativo, emoji, sombras em cartões, bordas cinza finas, ícones coloridos aleatórios, lamparina.

## As maquetes
As telas aprovadas estão em `design/telas/` (`R1Trilha`, `R1Leitura`, `R1Desafios`, `R1Juntos`, `R1Explorar`, `R1Perfil`), no formato de prancha do canvas de design (`.dc.html`, 390×844). Elas abrem no canvas do Claude; fora dele, o HTML mostra a marcação sem o runtime do canvas (laços `sc-for` e valores `{{…}}` não se expandem). A implementação real fica em `src/`.

## Conteúdo real
Está em `design/brief.md` (dia 42, Levítico 15–17 lido e Marcos 2 por ler, Marcos 2.1–7 NBV, 1 Pedro 2.9 Bíblia Livre, desafios, contagens do Explorar, exemplos Ana/Davi/Rute). Frases curtas e diretas em português do Brasil.
