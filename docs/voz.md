# Voz dos textos de tela

O jeito de escrever de todo o app (mapas, contexto do dia, lições, reflexões e textos de tela) está
no catálogo `.claude/skills/mapa-do-livro/voz.md`. Aqui ficam as regras que valem só para a
interface: botões, dicas, folhas, confirmações, avisos e as mensagens prontas de WhatsApp.

## Sem aviso de privacidade na interface (dono, 19/10)

"Esses comentários explicativos você pode tirar. Todos os lugares você avisa que ninguém vê,
nenhum app profissional fica colocando esses avisos."

**Não colocar avisos de privacidade na interface** ("só você vê", "ninguém vê", "ninguém mais vê",
"só a soma", "nunca o de cada um", "o seu nunca aparece sozinho", "sem nomes", "guardado com
criptografia", "o que você escreve fica só com você", "nunca o que você escreve", "o app não avisa
ninguém", "ninguém é avisado", "só quem conduz vê isto").
Isso fica na política de privacidade (`src/privacidade.html`), que a pessoa aceita no cadastro e
acha em Configurações › Privacidade. A regra de quem vê o quê não muda: muda só o texto que ficava
repetindo a regra.

O que continua na tela, porque não é aviso:

- A política de privacidade, os termos e o texto do consentimento ("Antes de continuar"), que é
  jurídico e tem de dizer quem vê o quê.
- Erro ou recusa que a pessoa precisa entender ("esse estudo não está aberto para você", "só quem
  conduz a célula pode fazer isso").
- Escolha de quem vê, quando escolher é a função da tela: "Toda a célula / Só quem conduz" no
  pedido de oração, "Mostrar meus marcos no Juntos", "O que você quer mostrar?" no Discipulado,
  "só para você (teste)" no aviso do administrador.
- O efeito de uma ação, quando é o que a ação faz: "Seus amigos vão ver no Juntos", "Seus amigos
  deixam de ver", "Ninguém mais vê o pedido" ao apagar um pedido.
- O aviso de salvar do preparo do estudo ("Ao salvar, todos da célula veem o estudo [...] Se você
  apagar a conta, fica o seu @."): é o aviso à vista que deixa a regra nova do histórico valer para
  o estudo que nasce com ele (`docs/aprendizados.md`, 2026-10-18). Só sai se o dono decidir.
- Conselho sobre a vida de outra pessoa ("Não escreva nome nem detalhe da vida de outra pessoa"),
  que protege quem não está escrevendo.

Pergunta de controle: a frase existe para a pessoa fazer alguma coisa, ou só para tranquilizar
sobre quem vê? Se é só para tranquilizar, sai.
