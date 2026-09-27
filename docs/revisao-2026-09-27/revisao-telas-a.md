# Revisão telas-a — concluída

Todos os 16 arquivos lidos por inteiro, texto de tela por texto de tela, contra
regras-revisao-textos.md.

## Mudanças feitas
- 03-trilha.js, linha 161: "Bem-vindo! Vamos caminhar..." -> "Que bom ter você
  aqui! Vamos caminhar..." (regra 5, gênero neutro; o app não sabe o gênero de
  quem usa). Commit feito.

Nada mais precisou de correção nos outros 15 arquivos: sem travessão em tela,
sem nota de bastidor, sem padrão de texto de IA, termos batendo com a lista
oficial, sem erro de ortografia/concordância encontrado.

## Para o dono decidir
(nada)

## Inconsistências de termos/estilo fora dos meus arquivos
- 08b-propositos.js linha 1279: `'Bem-vindo à ' + comoCelula(r.titulo) + '!'`
  — mesmo problema de gênero que corrigi em 03-trilha.js, mas esse arquivo não
  é meu (fica com quem revisa 08*).

## Testes
- `node build.mjs && node teste.mjs`: 181 checagens, todas passaram.
- `node ferramentas/teste-leitor.mjs`: todas passaram.
- `node ferramentas/teste-pratica.mjs`: "tudo certo".
- `node ferramentas/inspecionar.mjs 320` e `390`: "tudo certo" nas duas larguras.

## Commits
- 3bcdbbf "revisao textos: troca 'Bem-vindo' por saudacao neutra na trilha"
  (só src/app/03-trilha.js)
