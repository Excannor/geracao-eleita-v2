# Prompt para gerar os personagens no GPT

Cole o texto abaixo. Peça **um personagem por vez** (a qualidade cai quando se pede
vários de uma vez), e me devolva o SVG que vier. Eu adapto e encaixo no aplicativo.

---

## O prompt

> Você é um ilustrador de SVG. Desenhe **[NOME DO PERSONAGEM]**, personagem bíblico,
> no estilo de mascote de aplicativo (tipo Duolingo): simpático, colorido, chapado.
>
> **Formato obrigatório**
> - Um único `<svg>` com `viewBox="0 0 200 250"`, fundo transparente, sem `width`/`height`.
> - Apenas `<path>`, `<circle>`, `<ellipse>`, `<rect>`, `<g>` e `<polygon>`.
> - Cores em `fill` direto no elemento (hexadecimal). **Sem** `<defs>`, `<style>`,
>   `<image>`, `<text>`, `<filter>`, `<clipPath>`, gradientes ou classes CSS.
> - Nada de fontes externas, links ou base64.
> - Saída: só o código SVG, sem explicação.
>
> **Proporção (importante)**
> - Estilo chibi: a cabeça ocupa cerca de 40% da altura total.
> - Cabeça: círculo de raio ~38, centro perto de (100, 62).
> - Corpo compacto entre y=96 e y=200. Pernas curtas terminando por volta de y=232.
> - Uma elipse de sombra no chão em (100, 240), preta com `opacity=".18"`.
> - A figura deve tocar o chão do viewBox e ficar centrada na horizontal.
>
> **Acabamento**
> - Cores chapadas, com 2 ou 3 tons por peça (base, sombra e às vezes luz). Sem
>   contorno preto em volta das formas.
> - A luz vem de cima e da esquerda: o lado direito da figura é o mais escuro.
> - Rosto expressivo: olhos grandes (raio ~9) brancos com pupila escura e um brilho
>   branco pequeno, sobrancelhas, boca sorrindo, bochechas rosadas translúcidas.
> - Roupas de época: túnica comprida, manto sobre os ombros, faixa na cintura,
>   sandálias. Com dobras marcadas por linhas de tom mais escuro.
>
> **Este personagem**
> - Pose: **[POSE]**
> - Deve segurar ou ter ao lado: **[OBJETO]**
> - Cor predominante da túnica: **[COR]**

---

## O que pedir para cada um

| Personagem | Pose | Objeto | Cor da túnica |
|---|---|---|---|
| Noé | martelo erguido, sorrindo | martelo de carpinteiro; uma pomba no ombro | verde-oliva |
| Moisés | braço direito erguido | as duas tábuas da lei ao lado | vermelho-terra |
| Josué | soprando, braço erguido | trombeta de chifre (shofar) | azul |
| Davi | tocando, os dois braços à frente | harpa apoiada no chão | roxo |
| Salomão | sentado em trono, sereno | coroa na cabeça, cetro | dourado |
| Ester | mãos juntas à frente, digna | diadema, manto real | rosa-vinho |
| Jó | apoiado no cajado, olhar sereno | cajado comprido | cinza-terroso |
| Paulo | escrevendo, curvado | rolo de pergaminho e pena | verde-azulado |
| Isaías | apontando para o alto | brasa incandescente numa tenaz | azul-índigo |
| Jeremias | cabisbaixo, mão no rosto | pergaminho enrolado; uma lágrima | cinza-azulado |
| Ezequiel | braços abertos para cima | roda dentro de roda, dourada | roxo-escuro |
| Daniel | em pé, calmo, mãos à frente | um leão deitado a seus pés | azul-petróleo |
| João | segurando livro aberto | livro aberto; ilha ao fundo | branco-acinzentado |
| Abraão | olhando para cima | céu estrelado atrás | marrom-areia |
| Sara | sorriso surpreso, mão na boca | nenhum | bege |
| José | braços cruzados | túnica listrada colorida | multicolorida |
| Rute | colhendo, curvada | feixe de trigo | verde-claro |
| Samuel | mão em concha no ouvido | lamparina acesa | branco |
| Elias | manto ao vento, braço erguido | fogo do céu; corvo | marrom |
| Jonas | encolhido, assustado | peixe grande atrás | azul-claro |
| Maria | mãos no colo, serena | nenhum | azul-celeste |
| Pedro | segurando rede, robusto | rede de pesca; chaves | marrom-avermelhado |

Os treze primeiros já existem no aplicativo, um por unidade. Os demais entram como
variação: dá para pôr mais de um personagem por unidade, em pontos diferentes da trilha.

---

## Quando me mandar

Cole o SVG que o GPT devolver, com o nome do personagem. Eu:

1. Confiro se não tem nada proibido (gradiente, filtro, fonte externa).
2. Ajusto a proporção e o alinhamento ao chão, se vier fora do padrão.
3. Encaixo em `src/app/01b-mascote.js` e distribuo pelas unidades.
4. Verifico o peso: o arquivo do aplicativo é único, então cada personagem precisa
   ficar abaixo de uns 4 KB de SVG. Se vier muito detalhado, eu simplifico os paths.
