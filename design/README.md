# Design do redesenho

Material de referência do redesenho visual do Geração Eleita V2.

- `guia-visual.md`: o estilo aprovado, versão 3 (verde-sálvia suave nos dois temas, escuro de leitura em grafite).
- `brief.md`: o que o app faz, o que não pode mudar e o conteúdo real usado nas telas.
- `telas/`: as maquetes aprovadas de Início (trilha em zigue-zague), Leitura, Desafios, Juntos, Explorar e Perfil, em 390×844. São pranchas do canvas de design do Claude (`.dc.html`); fora do canvas o HTML aparece sem o runtime, então laços e valores dinâmicos não se expandem.
- `referencia-1.png`: uma das imagens de referência enviadas no começo do redesenho.
- `mapa-telas.md`: quem mexe em quê, e como rodar, semear e fotografar o app.
- `ferramentas/`: `semear.mjs` e `semear-inteligencia.mjs` (contas e dados de teste), `foto-conta.mjs`
  (captura com conta), `contraste-v2.mjs` (contraste das fichas) e `analise/` (as ferramentas das
  análises de produto: a jornada de uma pessoa nova, a varredura de UI/UX, a extração de textos, o
  relógio deslocado). Os métodos que as usam estão em `.claude/skills/` (`jornada-usuario`,
  `analise-retencao`, `revisao-uiux`).

A implementação fica em `src/` (`src/estilo-v2/*.css` por cima do `src/estilo.css`, congelado).
