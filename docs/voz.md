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
- Conselho sobre a vida de outra pessoa ("Não escreva nome nem detalhe da vida de outra pessoa"),
  que protege quem não está escrevendo.

Pergunta de controle: a frase existe para a pessoa fazer alguma coisa, ou só para tranquilizar
sobre quem vê? Se é só para tranquilizar, sai.

## Sem cara de amador (dono, 19/10)

Da auditoria de textos de 19/10. Cada frase da tela tem de fazer a pessoa agir ou entender o que
ela não veria sozinha. O resto sai.

- **O app não fala de si em terceira pessoa.** Nada de "o app separa as partes", "o app monta o
  roteiro", "Sugestão do app", "Seu nome no app", "Nos textos do app". Diga o que acontece:
  "O roteiro vem da leitura dos dias 8 a 14", "Sugestão", "Seu nome".
- **Não explicar o óbvio.** O botão já diz o que faz: sem "Toque no baú para abrir", "Toque para
  rever", "Toque num mapa para ver", "abra um desafio e toque em Fazer junto", nem a dica que
  repete o placeholder do campo.
- **Não justificar decisões.** Fica a instrução, sai o porquê: "Evite nomes de pessoas.", não
  "Evite nomes de pessoas, porque o combinado fica guardado...". Nada de "nada de madrugada, nada
  de spam", "para você saber por onde cuidar", "assim cada um lê as mesmas palavras".
- **Não prometer tempo.** Sem "em 10 segundos", "Três toques e pronto", "uns 2 minutos", "de 10 a
  20 minutos". O tempo de leitura do dia, como informação no cartão, pode ficar.
- **"(opcional)" só quando inevitável.** O campo sem marca é opcional; o obrigatório se mostra
  pela mensagem de erro ao salvar. Contador de caracteres só perto do limite (`CC.pertoDoLimite`,
  80% do teto), como o aviso de limite do preparo do estudo.
- **Rascunho, "Pronto!" e "É só colar".** O rascunho se guarda sozinho e não precisa de aviso nem
  de pergunta ao sair. O aviso curto diz o fato: "Link copiado", "Aviso cancelado", "Desafio
  pausado".
- **Erros sem termo técnico, numa voz só.** Nada de "servidor", "rota", "método", "ação
  desconhecida" ou "Failed to fetch" na tela. O erro do servidor passa por `CC.frase` (no
  `CC.api`): maiúscula, ponto final, e o técnico vira "Não deu certo agora. Tente de novo.". Sem
  rede: "Sem conexão. Tente de novo." (ou, num estado vazio, "Sem conexão" / "Conecte-se para
  abrir."). As falhas das telas falam em primeira pessoa: "Não consegui abrir o mapa", nunca
  "Não deu para...".
- **"para", não "pra"**, e o mesmo slogan uma vez só por página.

O que não sai, mesmo parecendo explicação: segurança e crise (CVV 188, Disque 100, 190 e 192,
orientação para menores), consentimento e sua retirada, confirmação de ação que apaga ou manda
para todos, o aviso da cópia das anotações, a proteção de terceiros no pedido de oração, os passos
de instalação e de notificação do iPhone, o Pix, prazos e regras que mudam a decisão (link de 1
hora, caixa de spam, lixeira de N dias, convite de 30 dias, aprovação de menores, escudos), erros
de validação úteis, créditos e licenças, e as notas do painel do administrador. As notificações
push têm o tom delas ("Bora"), que o dono quis manter.
