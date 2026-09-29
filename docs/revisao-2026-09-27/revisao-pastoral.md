# Revisão pastoral e teológica (27/09/2026)

Estado: CONCLUÍDA. Parte A editada e commitada (a929c32). Parte B só proposta, abaixo.

## A) Feito em conteudo/conhecer.json e conteudo/perguntas-honestas.json

Toda citação conferida na NBV (teste-conhecer) e toda paráfrase impressa com node.

- conhecer, dia 5 (conversa): "Deus, obrigado por quem me trouxe até aqui…" -> "Deus, eu te agradeço por quem me trouxe até aqui…" (gênero)
- conhecer, oração do "E agora?": "Obrigado porque Jesus morreu" -> "Eu te agradeço porque Jesus morreu" (gênero)
- conhecer, passo 3: "se já foi batizado quando criança, converse com quem te convidou" -> "se você recebeu o batismo quando criança, converse com quem te convidou ou com alguém da igreja" (gênero, e quem chegou sem convite)
- conhecer, dias 12 e 14: acrescentado "ou a alguém que segue Jesus e em quem você confia" / "ou a alguém da igreja" (o botão de conversar só existe para quem foi convidado)
- perguntas, sofrimento: fechamento de segurança -> "ou se passar pela sua cabeça se machucar ... Fale hoje com um adulto de confiança ou ligue 188 (CVV), de graça e a qualquer hora. Se alguém estiver te machucando, ligue 100 (Disque 100), também de graça."
- perguntas, sofrimento: João 9 com as duas opções da pergunta ("por causa de um pecado dele ou dos pais"), para o "Nem uma coisa nem outra" fazer sentido
- perguntas, jesus-existiu: "Os evangelhos foram escritos para você tirar a sua própria conclusão" (não é o que João 20.31 diz) -> citação de João 20.31 da NBV + "Leia e tire a sua própria conclusão."
- perguntas, ser-perfeito: título "Preciso ser perfeito pra seguir Jesus?" -> "Preciso ter uma vida perfeita pra seguir Jesus?"; resumo "quem sabe que não é" -> "quem sabe que precisa dele" (gênero; o id ficou)
- perguntas, igreja-falhas: frase nova depois do 1º parágrafo sobre abuso na igreja (adulto de confiança, Disque 100), porque o texto termina chamando de volta para um encontro
- perguntas, depois-da-morte: parágrafo final com adulto de confiança e CVV 188 (luto ou pensamento de morrer)

## B) Propostas (não aplicadas). Ordenadas por gravidade.

### ERRO

1. notificacoes.mjs, lembreteManha e lembreteMeio: as 8 citações são da ARA/ARC, não da NBV (o próprio teste-reflexoes.mjs lista "aquietai" e "as misericórdias do senhor" como outra tradução; a ARA também não tem licença para o app).
   - Atual: '"As misericórdias do Senhor renovam-se a cada manhã" (Lm 3.22-23). Comece o dia na Palavra.'
     Proposto: 'A misericórdia do Senhor "se renova a cada manhã" (Lm 3.23). Comece o dia na Palavra.'  (título: 'A misericórdia se renova 🌅')
   - Atual: ['De manhã, Senhor ☀️', '"De manhã fazes ouvir a minha voz" (Sl 5.3). A leitura de hoje te espera.']
     Proposto: ['De manhã ☀️', '"De manhã faço a minha oração e fico esperando a sua resposta" (Sl 5.3). A leitura de hoje te espera.']
   - Atual: '"Buscai primeiro o Reino de Deus" (Mt 6.33). Uns minutos e o dia começa diferente.'
     Proposto: '"Coloquem, pois, em primeiro lugar o Reino de Deus" (Mt 6.33). Uns minutos e o dia começa diferente.'
   - Atual: '"Ensina-me a fazer a tua vontade" (Sl 143.10). Bora abrir a lição de hoje?'
     Proposto: '"Ensine-me a fazer a sua vontade" (Sl 143.10). Bora abrir a lição de hoje?'
   - Atual: '"Aquietai-vos e sabei que eu sou Deus" (Sl 46.10). Dez minutos bastam.'
     Proposto: '"Fiquem quietos e saibam, de uma vez por todas, que eu sou Deus!" (Sl 46.10). Dez minutos bastam.'
   - Atual: '"Nem só de pão viverá o homem" (Mt 4.4). A leitura de hoje é rapidinha.'
     Proposto: '"Não é só de pão que vive o homem" (Mt 4.4). A leitura de hoje é rapidinha.'
   - Atual: '"Vinde a mim, todos os que estais cansados" (Mt 11.28). Abre a Palavra um instante.'
     Proposto: '"Venham a mim, todos vocês que estão cansados" (Mt 11.28). Abre a Palavra um instante.'
   - Atual: '"A tua palavra é doce ao meu paladar" (Sl 119.103). Dá uma parada e lê.'
     Proposto: '"As suas palavras são doces, mais doces do que o mel" (Sl 119.103). Dá uma parada e lê.'

2. src/app/01c-arte.js, CC.FRASES_OFENSIVA, Jó 14.7-9: fora de contexto. Jó diz que a árvore tem esperança e o homem NÃO ("Mas o homem, quando morre, não volta a viver", 14.10). A frase usa o lamento como promessa, e a redação não é da NBV nem da Bíblia Livre.
   - Atual: { linhas: ['Há esperança', 'para a árvore que,', 'se for cortada,', 'ainda se renovará'], ref: 'Jó 14.7-9' }
   - Proposto: { linhas: ['O grande amor', 'de Deus', 'nunca termina.', 'Ela se renova', 'a cada manhã'], ref: 'Lamentações 3.22-23' }
     (NBV: 3.22 "O grande amor de Deus nunca termina." 3.23 "Ela se renova a cada manhã" — "ela" é a misericórdia; se soar solto, usar só ['O grande amor', 'de Deus', 'nunca termina'], ref 'Lamentações 3.22')

3. src/app/01c-arte.js, CC.FRASES_OFENSIVA, Lucas 9.23: redação de NVI/ARA misturada, não está em nenhuma Bíblia do app.
   - Atual: ['Se alguém quiser', 'vir após mim,', 'negue a si mesmo,', 'tome diariamente', 'a sua cruz', 'e siga-me'], ref: 'Lucas 9.23'
   - Proposto (NBV): ['Aquele que quiser', 'me seguir,', 'deve pôr de lado', 'seus próprios desejos', 'e carregar sua cruz', 'cada dia'], ref: 'Lucas 9.23'
     ou (Bíblia Livre): ['Se alguém quer', 'vir após mim,', 'negue-se a si mesmo,', 'tome cada dia', 'sua cruz,', 'e siga-me'], ref: 'Lucas 9.23 (Bíblia Livre)'

4. src/app/01c-arte.js, CC.FRASES_OFENSIVA: promessa que a Bíblia não faz (oração como "construção" de milagre; o CLAUDE.md veta "provocar milagres").
   - Atual: ['A sua oração', 'de hoje está', 'construindo', 'o milagre de amanhã.', 'Continue firme']
   - Proposto: ['Ele ouve', 'com atenção', 'todos os pedidos', 'de socorro'], ref: 'Salmos 34.15'  (NBV: "ele ouve com atenção todos os pedidos de socorro")

5. src/app/08c-discipulado.js, folhaEncontroDaSemana: encontro a sós, semanal, de adolescente (12+) com quem o acompanha, sem nenhuma orientação de proteção.
   - Atual: 'Uma conversa de meia hora, pessoalmente ou por chamada. Sem pressa e sem prova.'
   - Proposto: 'Uma conversa de meia hora, pessoalmente ou por chamada. Sem pressa e sem prova. Se um de vocês é menor de idade, encontrem-se num lugar aberto ou com outras pessoas por perto, e com os responsáveis sabendo.'

6. src/privacidade.html, "Em poucas palavras" e seção 7: dizem que orações ninguém vê, mas o pedido de oração/ajuda é lido pela célula (ou por quem conduz), com os nomes de quem orou; e faltam o que o Discipulado, o Conhecer Jesus e a célula mostram.
   - Atual (resumo): 'O que você escreve (registros, orações e anotações) é só seu. Nem seus amigos veem.'
   - Proposto: 'O que você escreve (registros, orações e anotações) é só seu. Nem seus amigos veem. A exceção é o pedido de oração ou de ajuda que você mesmo manda para a sua célula.'
   - Atual (seção 7, fim): 'Ninguém vê suas anotações, reflexões, notas de versículo ou orações.'
   - Proposto: 'Ninguém vê suas anotações, reflexões, notas de versículo, orações nem a sua "Minha história com Deus". Um pedido de oração ou de ajuda que você manda na célula é lido pela célula inteira ou só por quem conduz, como você escolher, até vencer ou ser apagado. Quem te acompanha no Discipulado vê só o que você deixar ligado. No Conhecer Jesus, quem te convidou vê em que dia você está, e "Quero conversar" avisa essa pessoa e o líder da sua célula, sem mandar nada do que você escreveu.'

7. src/app/04-licao.js, FRASES_FOGO: culpa para quem parou e ideia de que quem não lê todo dia "apaga" na fé.
   - Atual: 'O que separa quem permanece aceso de quem apaga no meio do caminho é a lenha de cada dia.'
   - Proposto: 'Não precisa ser muito. Um pouco de lenha a cada dia mantém o fogo aceso.'

### CONFUSO

8. semeador.mjs (níveis; fora da lista, só leitura), nível 5: dá ao usuário o crédito que Atos 2.47 e P7 dão ao Senhor. O nome e o nível ficam.
   - Atual: 'Uma verdadeira congregação caminha e cresce graças a você.'
   - Proposto: 'Uma congregação inteira caminha junto. Quem faz crescer é Deus (1 Coríntios 3.7).'
   (Nível 4, melhoria: 'A Palavra está se espalhando rápido através do seu chamado.' -> 'A Palavra está se espalhando, e você faz parte disso.')

9. src/app/07-perfil.js, cartaoSemeador: "pessoas trazidas" põe a pessoa como quem traz; a folha já diz melhor "chegaram pelo seu convite".
   - Atual: CC.plural(s.pessoas, 'pessoa trazida', 'pessoas trazidas')
   - Proposto: CC.plural(s.pessoas, 'pessoa pelo seu convite', 'pessoas pelo seu convite')

10. src/app/07-perfil.js, "Minha história com Deus": quem cresceu na igreja (muitos com 12 anos) não tem um "antes" nítido e pode achar que a história não vale.
   - Atual: 'Contar o que Deus fez na sua vida é um jeito simples de falar de Jesus. '
   - Proposto: 'Contar o que Deus fez na sua vida é um jeito simples de falar de Jesus. Se você cresceu na igreja, conte quando a fé passou a ser sua. '

11. src/app/01c-arte.js, CC.FRASES_OFENSIVA, 2 Timóteo 2.22: a referência sugere citação, mas a NBV de 2.22 não fala em santidade ("aproxime-se de qualquer coisa que o leve a querer fazer o bem").
   - Atual: { linhas: ['Direcionados', 'à santidade'], ref: '2 Timóteo 2.22' }
   - Proposto: { linhas: ['Direcionados', 'à santidade'], ref: '1 Pedro 1.15' }  (NBV: "sejam santos em tudo quanto fizerem")

12. src/app/08b-propositos.js, AJUDA_PERIGO_DENUNCIA: "192 ou 190" sem dizer o que é; falta canal para abuso.
   - Atual: '... ligue 188 (CVV), a qualquer hora. Em emergência, 192 ou 190.'
   - Proposto: '... ligue 188 (CVV), a qualquer hora. Se for abuso ou violência, ligue 100. Em emergência, 192 (SAMU) ou 190 (Polícia).'

13. notificacoes.mjs, ofensiva: alarme e urgência (aversão à perda) com adolescente; o tom dos "volta" já é o certo.
   - Atual: ['Ei, a ofensiva! 🚨', '{n} dias acesos. Bora salvar o de hoje?']
     Proposto: ['{n} dias acesos 🔥', 'Ainda dá para ler hoje, com calma.']
   - Atual: ['Última chamada do dia ⏰', 'Uma leitura rapidinha garante os seus {n} dias seguidos.']
     Proposto: ['Um minutinho antes de dormir? 🌙', 'A leitura de hoje é curta e mantém os seus {n} dias.']

### MELHORIA

14. src/app/08b-propositos.js, folhaPedido: o adolescente pode expor a si ou a outros para até 20 pessoas. Uma dica abaixo do campo (sem mudar layout: um <p class="passo-dica pequena"> como o contador):
   - Proposto: 'Toda a célula lê. Não escreva nome nem detalhe da vida de outra pessoa. Se for algo mais pessoal, escolha "Só quem conduz".' (no pedido de ajuda: 'Toda a célula lê. Não escreva endereço nem detalhe da vida de outra pessoa.')

15. src/app/08b-propositos.js, PERGUNTAS_ACOLHIDA (gênero):
   - Atual: 'Conte uma coisa pequena pela qual você é grato hoje.'
   - Proposto: 'Conte uma coisa pequena pela qual você quer agradecer hoje.'

16. src/app/03b-fala-do-dia.js, amigo que já leu (comparação):
   - Atual: leuAmigo.nome + ' já leu hoje. Sua vez!'
   - Proposto: leuAmigo.nome + ' já leu hoje. Que tal ler também?'

17. src/app/04-licao.js, fim da lição: "Volte amanhã" em duas frases soa como cobrança.
   - Atual: 'Deus está acendendo a sua chama. Volte amanhã para não faltar lenha.'
     Proposto: 'Deus está acendendo a sua chama. Amanhã tem mais lenha esperando.'
   - Atual: 'Seu fogo acendeu! O que mantém a chama é a lenha de cada dia. Volte amanhã!'
     Proposto: 'Seu fogo acendeu! O que mantém a chama é a lenha de cada dia. Até amanhã!'

18. notificacoes.mjs, toques: comparação com o grupo.
   - Atual: ['{amigo} e mais {outros} te deram um toque 👊', 'A galera já leu. Bora você também?']
   - Proposto: ['{amigo} e mais {outros} te deram um toque 👊', 'A galera lembrou de você. A leitura de hoje tá aqui.']

19. src/app/01c-arte.js, CC.FRASES_OFENSIVA, Atos 17.28: quase NBV. Atual ['Nele vivemos,', 'nos movemos', 'e existimos'] -> proposto ['Nele nós vivemos,', 'e nos movemos,', 'e existimos'] (NBV literal).

20. src/privacidade.html, seção 2: uma linha para os pais.
   - Atual: 'O app é para quem tem 12 anos ou mais. Se você é adolescente, converse com seus pais ou responsáveis sobre o uso do app.'
   - Proposto: 'O app é para quem tem 12 anos ou mais. Se você é adolescente, converse com seus pais ou responsáveis sobre o uso do app. Pais e responsáveis: o app não tem chat nem busca por nome, e ninguém fora dos amigos aceitos e da célula vê o seu filho ou a sua filha. Para tirar dúvidas ou pedir a exclusão da conta, fale com a liderança da igreja.'
   (confirmar com o dono que "não tem chat" continua verdade)

Revisto e sem proposta: nomes de conquistas e troféus (02b-jogo.js: Chama acesa, Todo dia na Palavra, Página a página, Estante, Alicerce, Memória, Lado a lado, Dia após dia, Versículos guardados, Explorador; coleções por divisão dos livros), SUGESTAO_ADORACAO, SUGESTAO_TESTEMUNHO, caixa do CVV em folhaPedido, texto da denúncia, marcos de "Minha caminhada", perguntas do Encontro da semana, restante de notificacoes.mjs (volta*, querConversar, discipulado, cuidado).

## Para o dono decidir

- Batismo explicado como símbolo ("passar pela água para mostrar a todos que agora a pessoa segue Jesus", conhecer.json dia 13 e passo 3). É a visão batista/pentecostal; Atos 2.38 liga batismo a "perdão dos seus pecados", e luteranos, católicos e reformados o veem como sacramento. O texto já manda quem foi batizado criança conversar com calma. Manter, ou trocar por algo neutro: "ser batizado, um passo com água em que a pessoa se une publicamente aos seguidores de Jesus".
- Frases de ofensiva sem referência com tom escatológico ("Prepara-te, Ele vem", eco de Amós 4.12, que é aviso de juízo a Israel; "Até que Ele venha") e slogans ("Somos remanescentes", "Geração inconformada", "Marcados pela diferença"): parecem lemas do ministério; não mexi. Se forem lemas, ok; se não, "Prepara-te" pode assustar quem chega.
- Pronomes de Deus com maiúscula ("Ele", "Sua", "fazê-Lo") só nas frases da ofensiva; o resto do app usa minúscula. Padronizar?
- "Pescador de Homens" (Semeador nível 3) é a frase de Mt 4.19 (NBV "pescadores de homens"); as meninas também chegam lá. Manter por ser citação?
- Pedido de oração só termina em "Deus respondeu" ou "Apagar". Para quem perdeu alguém por quem pediu oração, falta um fim como "Não preciso mais". (Mexe em lógica: data-fim é comparado com 'Já resolvi'.)
- Privacidade e LGPD: dado religioso (sensível, art. 11) de adolescentes de 12 a 15 anos com consentimento só do próprio adolescente. Pelo Código Civil, menor de 16 é absolutamente incapaz; vale ouvir alguém da área jurídica sobre pedir ciência ou consentimento de um responsável.
- Termos: "quem conduz" (célula, pedido de oração) convive com "líder" e "auxiliar", nomes oficiais. Ver se é de propósito.

## Testes
node build.mjs && node teste.mjs: 181 checagens, todas passaram. node ferramentas/teste-conhecer.mjs: confere.
