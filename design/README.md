# Design do redesenho

Material de referência do redesenho visual do Geração Eleita V2.

- `guia-visual.md`: o estilo aprovado, versão 3 (verde-sálvia suave nos dois temas, escuro de leitura em grafite).
- `brief.md`: o que o app faz, o que não pode mudar e o conteúdo real usado nas telas.
- `telas/`: as maquetes aprovadas de Início (trilha em zigue-zague), Leitura, Desafios, Juntos, Explorar e Perfil, em 390×844. São pranchas do canvas de design do Claude (`.dc.html`); fora do canvas o HTML aparece sem o runtime, então laços e valores dinâmicos não se expandem.
- `referencia-1.png`: uma das imagens de referência enviadas no começo do redesenho.

A implementação fica em `src/` (principalmente `src/estilo.css`, na camada "REDESENHO (v2)").
