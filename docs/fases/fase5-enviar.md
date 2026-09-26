# Fase 5: Enviar e multiplicar (Atos 2.47; 2 Timóteo 2.2)

Objetivo: a célula que cresce vira duas, o pastor enxerga a saúde das células sem ver ninguém pelo nome, e o jovem leva a Palavra para fora do app num cartão bonito.

Regras gerais: as mesmas das fases anteriores. Sem chat. Nada de XP, conquista ou ranking entre células ou pessoas. Nenhuma nota de bastidores e nenhum travessão em texto de tela. Linguagem simples. `grep` antes de criar classe CSS. Comentários em português.

## 1. Multiplicação de célula (`contas.mjs`, `servidor.mjs`, `08b-propositos.js`)
Sem esquema novo se der: a célula filha é uma célula comum com `mae` (id da célula de origem) e `multiplicadaEm` guardados onde a célula já guarda campos opcionais. Se precisar de coluna, esquema v10 com migração e teste.
- Só o líder da célula mãe inicia, na aba Pessoas: "Multiplicar a célula". Precisa ter pelo menos 1 auxiliar ativo. A folha explica: "Quando a célula cresce, ela pode virar duas. Um auxiliar passa a liderar a nova, e vocês escolhem juntos quem vai com ele."
- O líder escolhe o auxiliar que vai liderar a filha, o nome da nova célula e quem vai (membros ativos, visitantes podem ir junto). Confirmação clara.
- Resultado: nova célula com o auxiliar como líder (criador), os escolhidos movidos (saem da mãe e entram na filha na mesma data, sem perder a ofensiva de ninguém; a ofensiva da célula nova começa do zero), o auxiliar deixa de ser auxiliar da mãe.
- As duas células mostram, discreto, no topo da aba Hoje por 30 dias: mãe "Nasceu a {filha} a partir desta célula." / filha "Esta célula nasceu da {mãe}." Nada de contador de gerações nem medalha.
- Avisos pelo `avisoSocial` (nunca no Feed) para quem foi para a nova célula: "Você agora faz parte da {filha}." / "O líder é {nome}.".
- Regras de limite de 20 membros e da meta continuam valendo em cada uma.

## 2. Painel pastoral agregado (`painel.mjs`, `07e-painel.js`)
Mesmo acesso de hoje (só admin, `CAMINHO_ADMIN`). Nova seção "Células e cuidado", só números, nunca nomes nem textos:
- Células ativas (com ao menos um membro ativo) e quantas registraram encontro nas últimas 4 semanas.
- Frequência média por encontro nas últimas 4 semanas (presentes + pessoas sem conta), e quantos visitantes com conta passaram a membro nesse período.
- Multiplicações nos últimos 12 meses.
- "Dias na Palavra": % das contas ativas nos últimos 30 dias que leram em 4 ou mais dos últimos 7 dias (Power of 4). Só no painel, nunca para o usuário.
- Conhecer Jesus: quantos começaram, quantos terminaram os 14 dias, quantos tocaram "Quero conversar".
- Discipulado: relações ativas e quantas pessoas acompanham alguém que também acompanha outra pessoa (2ª geração), só o número.
- Cuidado: pedidos de oração ativos e denúncias abertas, só o número.
- Com menos de 5 pessoas numa conta qualquer, mostrar "menos de 5" em vez do número exato (evita identificar alguém numa igreja pequena).
- Teste em `teste.mjs` ou arquivo próprio: `montarPainel` com dados sintéticos, inclusive o "menos de 5" e a ausência de qualquer nome ou texto na saída.

## 3. Cartão de versículo em imagem (`04e-versiculos.js`)
- Nas ações do versículo marcado (onde já há copiar, Juntos, nota), um botão "Imagem".
- Gera no aparelho, com `<canvas>`, uma imagem 1080 × 1920 (formato de status e stories): fundo da paleta do app (escuro com o creme e o laranja do pôster), o texto do versículo em letra grande que se ajusta ao tamanho (mesma lógica de encolher do carimbo da ofensiva), a referência e a tradução embaixo ("Nova Bíblia Viva" ou a tradução que estiver aberta), e o nome do app pequeno no pé. Até `CC.MAX_TRECHO` versículos.
- Compartilha com `navigator.share({ files })` quando o aparelho aceitar; senão, baixa o arquivo PNG. Mensagens: "Imagem pronta." / "Não consegui gerar a imagem agora.".
- As fontes precisam estar carregadas antes de desenhar (`document.fonts.ready`).
- Nenhum dado sai do aparelho; nada vai para o servidor.
- Respeitar a licença da tradução: incluir o nome da tradução na imagem.

## 4. Testes
- `ferramentas/teste-multiplicar.mjs` (servidor descartável): só o líder, exige auxiliar, move as pessoas escolhidas, o auxiliar vira líder da filha, limites respeitados, avisos fora do Feed, ofensiva pessoal intacta.
- Painel: saída sem nomes, "menos de 5", números certos com dados sintéticos.
- Cartão: função pura de quebra de linhas e tamanho de letra testada em `teste.mjs`; o percurso gera a imagem e confere largura e altura.
- Percurso `...\scratchpad\enviar-percurso.mjs`, capturas `f5-` em 390 claro, 320 claro e 390 escuro.
- Bateria de sempre verde. Não fazer commit, não publicar, não usar ssh.
