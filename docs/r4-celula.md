# R4: Ler junto na célula

Fase R4 do roadmap de melhorias (`Roadmap de melhorias do GE.md`), com as recomendações 11, 12 e 15
do estudo do YouVersion. Três partes, uma de cada vez, cada uma com o seu commit:

- **R4.1 Conversa do dia da célula (adiada pelo dono em 16/11):** uma pergunta por dia de leitura, respostas curtas, só entre os
  membros, moderada por quem conduz.
- **R4.2 Lista de oração da célula:** o pedido de oração que já existe (Fase 4, `cuidado.mjs`) ganha
  "Estou orando" com contagem, atualizações do autor e a lista "Respondidas".
- **R4.3 Convite por QR code no encontro:** quem conduz mostra um código que vale por poucas horas, e
  quem aponta a câmera cai no fluxo do link da célula que já existe.

Este documento vai do macro ao micro: o que vale (0), quem vê e quem escreve (1), limites (2),
moderação (3), retenção (4), cuidados com menores (5), notificações (6), política de privacidade e
termos (7), banco (8), API (9), telas (10), testes (11) e o que fica de fora (12). Nenhum código
muda nesta etapa (R4.0).

**Decisões do dono sobre esta especificação (16/11):**

1. **A Conversa do dia (R4.1) está adiada.** O desenho dela fica neste documento, marcado como
   adiado, para quando o dono decidir retomar. Nada dela é implementado agora: sem tabela, sem rota,
   sem tela, sem mudança na política. A ordem passa a ser R4.2 e depois R4.3.
2. **Aviso de perigo:** sim, quem conduz é avisado na hora pelo `denunciaPerigo` que já existe. Na
   lista de oração isso já funciona assim e continua.
3. **QR do encontro:** a entrada pelo QR **não conta** para Semeadores (D13 decidida).
4. **Consentimento:** sem a conversa, a frase "o que eu escrevo" continua correta e não muda.
   `CONSENTIMENTO_VERSAO` fica em 3. Só a política muda, na versão 8, se a R4.2 mudar o que alguém
   vê.

Com a conversa adiada, as migrações mudam de número: a lista de oração é a **v27**, o QR é a
**v28**, e a conversa recebe a próxima versão livre quando voltar (seção 8).

## 0. O que vale e as decisões

**Do que já existe e continua valendo:**

- Decisão do dono: participam só os **membros** da célula. Visitante (quem entrou marcando "só
  conhecendo") e convidado que ainda não aceitou ficam de fora da conversa e da lista de oração.
  É a mesma regra do pedido de oração hoje (`membroDeVerdade`, `cuidado.mjs`).
- Decisão do dono: **quem conduz modera**: o líder e os auxiliares (`podeConduzir`). Quem tem menos
  de 18 anos só conduz depois da aprovação da liderança (v16); enquanto espera, é membro comum.
- Sem chat: nada de mensagem de uma pessoa para outra, nem resposta a uma resposta. A conversa do
  dia é uma lista de respostas a uma pergunta, que todos os membros leem.
- Nada disto vai para o Juntos (Feed), vale XP, abre baú, dá carta ou entra em ranking.
- Notificações: só os tipos que já existem, com a mesma ativação (seção 6).
- Voz: frases curtas e calmas, sem travessão, sem exclamação, sem aviso de privacidade na tela
  (`docs/voz.md`). Paleta C, claro e escuro, 390 e 360 px, toque de 44 px.
- Folga do index.html (hoje 63,2 KB, piso de 60): as telas novas moram em peças sob demanda.

**Decisões deste plano** (as que dependiam do dono foram decididas em 16/11, no topo):

| # | Decisão | Por quê |
|---|---|---|
| D1 | A conversa é por **dia do plano**, não por data do calendário. O dia aberto é o dia da célula (`diaDaCelula`, R2.1: o dia em que o líder está) e os 6 anteriores. | É "uma pergunta por dia de leitura". A célula já lê pelo dia do líder; quem está um ou dois dias atrás ainda responde. |
| D2 | A pergunta é a **primeira do Pensar** daquele dia (`reflexoes[dia][0].perguntas[0]`). Quem conduz pode trocar pela outra pergunta do Pensar enquanto o dia não tem resposta. Adiada com a R4.1. | Algumas perguntas são pessoais demais para um grupo de adolescentes. Trocar só antes da primeira resposta evita que respostas fiquem soltas de outra pergunta. |
| D3 | A pergunta fica guardada (`conversa_dias.pergunta`) na primeira resposta ou na troca. | Se a reflexão do dia for reescrita, as respostas continuam ao lado da pergunta que as pessoas leram. |
| D4 | Resposta de até **280** caracteres, uma linha (espaços juntados), sem edição. O autor apaga quando quiser. | O mesmo tamanho do pedido de oração. Sem edição, ninguém muda o sentido depois que os outros leram. |
| D5 | Texto com telefone, e-mail, link, @ de rede social ou endereço é **recusado**, com uma mensagem que diz o que tirar. Palavra da lista de bloqueio também. Nada é mascarado em silêncio. Vale para a conversa, o pedido de oração e de ajuda e as atualizações. | Mascarar ("[telefone]") deixa a pessoa sem saber o que aconteceu e ainda publica o resto. Recusar ensina a regra na hora. |
| D6 | Moderação da conversa: quem conduz **oculta** (volta atrás quando quiser) ou **tira** (não volta). Membro **denuncia** para quem conduz. Com 2 denúncias, a resposta fica oculta até quem conduz decidir. Quem conduz também **fecha** a conversa de um dia. Adiada com a R4.1. | O mesmo desenho que o pedido de oração já tem, mais o que faltava para uma conversa: ocultar sem apagar e fechar o dia. |
| D7 | A resposta tirada por quem conduz some para todos na hora, mas o texto fica guardado, sem aparecer, até a limpeza de 30 dias. Resposta apagada pelo autor sai do banco na hora. Adiada com a R4.1. | Num caso de risco a um adolescente, a equipe precisa do texto que foi denunciado. Ninguém o vê pelo app. |
| D8 | As respostas da conversa ficam **30 dias** e são apagadas do banco. | Minimização. A conversa é sobre a leitura daquela semana. |
| D9 | "Estou orando" é **um gesto por pessoa por pedido**, que se desfaz tocando de novo. Todos que veem o pedido veem **só quantos** estão orando. Ninguém vê quem, nem o autor. | Pedido do dono: "com contagem e sem lista de nomes, se isso proteger melhor". Sem nomes, ninguém é cobrado por não ter orado e ninguém compara quem orou. Hoje o autor vê os nomes de quem tocou em "Orei por você": isso sai. |
| D10 | O pedido de oração marcado como respondido vai para **"Respondidas"**, visto por quem já via o pedido, até vencer. O pedido de ajuda resolvido continua sumindo como hoje. | É a parte da recomendação 12 que faltava. "Já resolvi" (carona, mudança) não é oração respondida. |
| D11 | Atualizações: só o autor, até **5** por pedido, **200** caracteres cada. O texto do pedido continua sem edição. | Atualizar ("Fiz a prova hoje") sem mudar o que os outros já leram e oraram. |
| D12 | O QR do encontro é o **link da célula com validade de 4 horas**, gerado só por quem conduz. Quem o lê cai no mesmo `/?celula=<token>` de hoje. | Reaproveita o fluxo de entrada inteiro. A validade curta evita que uma foto do código circule por 30 dias. |
| D13 | Quem cria a conta pelo QR do encontro **não conta para os limiares de Semeadores** de quem mostrou o código. A pessoa nova continua recebendo a carta de Boas-vindas. A tela do QR mostra João 1.46 ("Venha e veja", a carta 3 de Semeadores) como legenda, sem prêmio. Decidida pelo dono (16/11). | Pedido do dono: sem recompensa por volume de convites. Um líder que mostra o código para 40 pessoas num evento ganharia 4 cartas de uma vez. O convite pessoal (link) continua contando como hoje. |
| D14 | A tela da conversa vai para uma peça nova (`conversa`) e a aba Oração sai do index para outra peça (`oracao`). | Devolve folga ao index, que só fica com o cartão de entrada e as rotas. |

---

## 1. Quem vê e quem escreve

### 1.1 Conversa do dia (R4.1, adiada pelo dono)

| Ação | Líder | Auxiliar | Membro | Visitante | Convidado | De fora (outra célula, administrador, quem saiu) |
|---|---|---|---|---|---|---|
| Ler a pergunta e as respostas visíveis | sim | sim | sim | 403 | 403 | 404 |
| Responder | sim | sim | sim | 403 | 403 | 404 |
| Apagar a própria resposta | sim | sim | sim | n/a | n/a | n/a |
| Denunciar uma resposta de outra pessoa | sim | sim | sim | 403 | 403 | 404 |
| Ver as respostas ocultas e as denúncias ("Para rever") | sim | sim | não | 403 | 403 | 404 |
| Ocultar, mostrar de novo, tirar | sim | sim | 403 | 403 | 403 | 404 |
| Fechar e reabrir a conversa de um dia | sim | sim | 403 | 403 | 403 | 404 |
| Trocar a pergunta (dia ainda sem resposta) | sim | sim | 403 | 403 | 403 | 404 |

- 404 é "célula não encontrada": quem é de fora não descobre se a célula tem conversa.
- 403 para o visitante: "a conversa é de quem faz parte da célula". O visitante sabe que a célula
  existe; a tela dele não mostra o cartão da conversa, então ele só vê essa mensagem por um link
  antigo.
- O administrador que abre o painel de uma célula **não** lê a conversa pelo app. A conversa não
  entra no painel, no relatório exportado nem nos alertas de cuidado. O painel da administração
  ganha só números (seção 9.4).
- Quem conduz não pode moderar a própria resposta denunciada (seção 3.3).
- Célula encerrada: 404 para todos. Célula aguardando aprovação do líder (menor): a conversa
  funciona para quem já é membro, e ninguém modera até a aprovação (o líder ainda não conduz).

### 1.2 Lista de oração (R4.2)

As regras de hoje continuam (Fase 4): só membros criam, veem e reagem; o pedido vai para "Toda a
célula" ou "Só quem conduz" (o "privado" do pedido do dono); o de ajuda é sempre para a célula.

| Ação | Autor | Quem conduz | Membro (pedido da célula) | Membro (pedido só para quem conduz) | Visitante | De fora |
|---|---|---|---|---|---|---|
| Ver o pedido, as atualizações e a contagem | sim | sim | sim | não aparece | 403 | 404 |
| "Estou orando" | não (é o dele) | sim | sim | não | 403 | 404 |
| Ver quem está orando | ninguém | ninguém | ninguém | ninguém | ninguém | ninguém |
| Escrever e apagar atualização | sim | 403 | 403 | 403 | 403 | 404 |
| Marcar "Deus respondeu" | sim | 403 | 403 | 403 | 403 | 404 |
| Ver em "Respondidas" | sim | sim | sim | não aparece | 403 | 404 |
| Apagar o pedido | sim | não (tira) | 403 | 403 | 403 | 404 |
| Denunciar | não | sim | sim | não | 403 | 404 |
| Tirar o pedido | n/a | sim | 403 | 403 | 403 | 404 |

Muda em relação a hoje: o autor deixa de ver os nomes de quem orou e de quem pode ajudar ("Posso
ajudar" continua avisando o autor pelo `possoAjudar`, com o nome, porque a ajuda prática se combina
fora do app); quem conduz passa a poder tirar um pedido sem esperar denúncia.

### 1.3 QR do encontro (R4.3)

| Ação | Líder | Auxiliar | Membro | Visitante |
|---|---|---|---|---|
| Mostrar o QR do encontro | sim | sim | não | não |
| Mandar o link da célula (30 dias, já existe) | sim | sim | sim | sim (como hoje) |

Quem lê o código vê o que o link de célula já mostra a quem não tem conta: o nome da célula, quem
chamou e quantas vagas restam. Ninguém de fora vê os membros.

---

## 2. Limites de tamanho e frequência

| O quê | Limite | Onde é conferido | Mensagem |
|---|---|---|---|
| Resposta na conversa | 1 a 280 caracteres, espaços juntados | `conversa.mjs`, `textoValido` | "Escreva a resposta, até 280 caracteres." |
| Respostas por pessoa em um dia da conversa | 3 | `contas.mjs`, `responderNaConversa` | "Você já respondeu 3 vezes neste dia." |
| Respostas por pessoa por dia do calendário, na célula | 10 | idem | "Por hoje chega de respostas. Amanhã tem mais." |
| Respostas num dia da conversa, na célula | 200 | idem | "Esta conversa chegou ao limite de respostas." |
| Ritmo de gravação na conversa | 6 por minuto por pessoa (`conversa:<@>`) | `servidor.mjs`, `dentroDoLimite` | 429, "muitas tentativas, espere um pouco" |
| Denúncia na conversa | 1 por pessoa por resposta; 20 por pessoa por dia | `contas.mjs` | "Você já denunciou esta resposta." |
| Dias abertos para responder | o dia da célula e os 6 anteriores (dia 1 em diante) | `conversa.mjs`, `diaAberto` | "Esta conversa já fechou." |
| Pedido de oração ou de ajuda | 280 ou 200 caracteres; 3 ativos por pessoa por célula (já existe) | `cuidado.mjs` | as de hoje |
| Atualização de pedido | 1 a 200 caracteres; 5 por pedido; 3 por dia por pessoa | `cuidado.mjs`, `contas.mjs` | "Escreva a atualização, até 200 caracteres." / "Este pedido já tem 5 atualizações." |
| Ritmo de gravação no cuidado | 20 por minuto por pessoa (`cuidado:<@>`, em criar, atualizar e respondido) | `servidor.mjs` | 429 |
| "Estou orando" | 1 por pessoa por pedido (liga e desliga) | `contas.mjs` | nenhuma |
| QR do encontro | gerar: 10 por minuto por pessoa; vale 4 horas | `servidor.mjs`, `contas.mjs` | 429 |
| Entrada pelo QR | as de hoje: vagas de membro (20) e teto de 10 visitantes | `entrarNaCelula` | as de hoje |

Contador de caracteres na tela só perto do limite (`CC.pertoDoLimite`), como no resto do app.

---

## 3. Moderação

### 3.1 Conversa: o que cada um pode fazer (R4.1, adiada)

- **Autor:** "Apagar" na própria resposta. Pergunta antes ("Apagar a resposta?"), e a linha sai do
  banco na hora, com as denúncias dela.
- **Membro:** "Denunciar" numa resposta de outra pessoa, com um de três motivos fixos:
  - "É ofensivo";
  - "Expõe alguém" (dado pessoal, vida de outra pessoa);
  - "Alguém pode estar em perigo".
  Quem denuncia nunca é mostrado a ninguém pelo app. Com o motivo de perigo, a folha mostra na hora
  a caixa de ajuda que já existe (`AJUDA_PERIGO_DENUNCIA`).
- **Quem conduz:**
  - **Ocultar:** a resposta some para os membros e fica para o autor com a marca "Oculta por quem
    conduz". "Mostrar de novo" desfaz.
  - **Tirar:** a resposta some para todos, o autor incluído, e não volta. O texto fica guardado sem
    aparecer até a limpeza de 30 dias (D7), com `moderado_por` e `moderado_em`.
  - **Manter** (numa resposta denunciada): limpa as denúncias e ela volta a aparecer.
  - **Fechar a conversa deste dia:** ninguém mais responde naquele dia; o que já está lá continua
    visível. "Reabrir" desfaz.
  - **Trocar a pergunta** (D2), só com o dia sem resposta.

### 3.2 Denúncia e ocultação automática

- 2 denúncias (de qualquer motivo, somadas) deixam a resposta oculta até quem conduz decidir,
  como no pedido de oração (`LIMITE_DENUNCIAS_ESCONDE`).
- Quem conduz vê, no alto da conversa, "Para rever" com cada resposta denunciada: o texto, o nome
  do autor, os motivos e quantas denúncias. Nunca quem denunciou. Com o motivo de perigo, junto vem
  a caixa `AJUDA_PERIGO_CONDUZ` que já existe.
- O motivo "Alguém pode estar em perigo" avisa quem conduz na hora (seção 6), sem esperar a
  segunda denúncia.

### 3.3 Quando quem escreveu é quem conduz

- Resposta denunciada de um auxiliar: o líder e o outro auxiliar decidem; ele não vê o botão na
  própria resposta.
- Resposta denunciada do líder numa célula sem auxiliar: ela fica oculta com 2 denúncias e ninguém
  da célula decide. A denúncia entra também na lista de denúncias de pessoas que a equipe já
  analisa (`Contas.denunciar`, motivo "Resposta na conversa da célula"), sem o nome de quem
  denunciou na tela.

### 3.4 Pedidos de oração (R4.2)

Continua o que existe (denúncia, 2 denúncias escondem, "Manter" e "Tirar"), mais:

- quem conduz pode **tirar** qualquer pedido que vê, sem esperar denúncia ("Tirar este pedido?");
- as atualizações seguem o pedido: tirar o pedido tira as atualizações; não há moderação por
  atualização (o autor apaga a dele; quem conduz tira o pedido inteiro, se for o caso).

---

## 4. Retenção

| Dado | Quanto tempo | O que apaga antes |
|---|---|---|
| Resposta na conversa | 30 dias depois de escrita, em qualquer estado | o autor apaga; a pessoa sai da célula, é tirada, vai para a célula filha numa multiplicação ou apaga a conta |
| Resposta tirada por quem conduz | 30 dias depois de escrita, sem aparecer para ninguém | apagar a conta do autor |
| Denúncia de resposta | sai com a resposta | quem denunciou sai da célula ou apaga a conta (a denúncia dele sai; a resposta fica) |
| Pergunta guardada do dia (`conversa_dias`) | enquanto houver resposta daquele dia; sai na mesma limpeza | a célula é encerrada há 30 dias |
| Pedido de oração ou de ajuda | como hoje: visível até vencer (7 ou 30 dias) e apagado 30 dias depois de vencer | o autor apaga; sai da célula; apaga a conta |
| Pedido em "Respondidas" | visível até a data de vencimento que ele já tinha (hoje ela é encurtada para 7 dias depois da marca; deixa de ser); apagado 30 dias depois dela | idem |
| Atualização de pedido | sai com o pedido | o autor apaga a atualização |
| "Estou orando" | sai com o pedido | a pessoa desfaz, sai da célula ou apaga a conta |
| Marca de "entrou pelo QR do encontro" | enquanto existir a linha do convite (`convites_aceites`), como hoje | apagar a conta de qualquer das duas pessoas |

**A limpeza:** `Contas.limparConversa(hoje)` roda na leitura da conversa (como
`limparPedidosVencidos` roda na leitura dos pedidos) e na rotina diária que já existe. Apaga as
respostas com `em` de mais de 30 dias, as denúncias delas e os dias sem resposta.

**Ao sair da célula** (sair, ser tirado, ir para a filha numa multiplicação): na mesma transação
de hoje (`limparPedidosDaCelula`), as respostas da pessoa naquela célula e as denúncias que ela fez
ali saem. As respostas que ela ocultou ou tirou como quem conduz ficam com `moderado_por` vazio.

**Ao apagar a conta:** `Contas.apagar` e `apagarPessoaDoBanco` (também nas 14 cópias de segurança)
apagam as respostas da pessoa em todas as células, as denúncias que ela fez, as atualizações dos
pedidos dela (já saem com os pedidos), os "Estou orando" dela e limpam o @ dela em `moderado_por`.
Nada da conversa fica com o @ de quem apagou a conta.

**Cópias de segurança:** a limpeza de 30 dias vale para o banco em uso. As cópias diárias guardam
o que havia no dia por 14 dias, então uma resposta pode ficar até 44 dias numa cópia. A política diz
isso (seção 7).

---

## 5. Cuidados com menores

O público é de 12 a 17 anos em boa parte. Além das regras de quem vê:

- **Sem mensagem privada entre membros.** Não existe resposta a uma resposta, menção, "chamar no
  privado" nem lista de quem leu. Cada resposta vai para a célula inteira.
- **Sem foto.** A conversa e a lista de oração aceitam só texto. O retrato ao lado do nome é o de
  perfil que a célula já vê.
- **Sem link clicável.** Todo texto é escapado (`CC.esc`) e mostrado como texto. Nada é
  transformado em link, nem uma referência bíblica. E o link escrito é recusado (D5).
- **Filtro de dados pessoais** (`filtro-texto.mjs`, novo, puro, usado pela conversa e pelo
  cuidado). Recusa, com a mensagem entre aspas:
  - **telefone:** 8 dígitos ou mais, contados depois de tirar espaço, ponto, hífen, parênteses e
    "+" ("Tire o número de telefone antes de enviar.");
  - **e-mail:** algo@algo.algo ("Tire o e-mail antes de enviar.");
  - **link:** `http`, `www.`, `wa.me`, `t.me`, ou palavra seguida de `.com`, `.br`, `.net`,
    `.org`, `.me`, `.io`, `.app`, `.ly`, `.gg`, `.tv`, `.link` ("Tire o link antes de enviar.");
  - **@ de rede social:** "@" seguido de letra ("Tire o @ antes de enviar.");
  - **endereço:** CEP (já cai nos 8 dígitos); "rua", "r.", "avenida", "av.", "travessa",
    "alameda", "praça" seguidos de nome e número; "nº", "número", "apto", "apartamento", "bloco",
    "casa" seguidos de número ("Tire o endereço antes de enviar.").
  - Referências bíblicas não caem no filtro: "João 3.16" e "Salmos 119.105" têm menos de 8 dígitos.
- **Filtro simples de palavras:** uma lista curta de palavrões, ofensas e termos sexuais, em
  `filtro-texto.mjs`. A comparação é por palavra inteira, depois de tirar acentos, passar para
  minúsculas e trocar os números e símbolos mais comuns por letras (0 o, 1 i, 3 e, 4 a, 5 s, 7 t,
  @ a). Mensagem: "Troque essa palavra antes de enviar." (sem repetir a palavra). A lista é revista
  pelo dono antes de R4.1 ir ao ar e nunca aparece na tela.
- **A caixa de ajuda** (CVV 188, Disque 100, 192 e 190) que já existe fica acima do campo de
  resposta em versão curta, como no pedido de oração.
- **Dica de escrita** acima do campo: "Não escreva nome nem detalhe da vida de outra pessoa." (a
  mesma frase do pedido de oração; é conselho, não aviso de privacidade).
- **Sem contador público por pessoa:** a conversa não mostra quantas vezes cada um respondeu, quem
  ainda não respondeu nem quem leu as respostas.
- **Nada de prêmio:** responder, orar e trazer gente pelo QR não dão XP, carta, baú nem selo.

O filtro é simples de propósito e vai errar dos dois lados (deixa passar um número escrito por
extenso; recusa uma frase com oito números). Ele não substitui quem conduz nem a denúncia.

---

## 6. Notificações

Nenhum tipo novo, nenhuma mudança na ativação, nas preferências, no horário de silêncio ou nos
limites diários. O que sai:

| Quando | Tipo que já existe | Para quem | Muda |
|---|---|---|---|
| Pedido de oração só para quem conduz | `pedidoConduz` | quem conduz | nada |
| "Posso ajudar" num pedido de ajuda | `possoAjudar` | o autor | nada |
| Denúncia de perigo num pedido | `denunciaPerigo` | quem conduz | nada |
| Denúncia de perigo numa resposta da conversa | `denunciaPerigo`, com `onde: 'conversa'` | quem conduz | o texto e o endereço: "Uma resposta na conversa da célula precisa de atenção." / "Abra a conversa da célula para ver.", com o toque levando a `#/novidades/celula/<id>/conversa`. Mesmo tipo, mesma preferência, mesma regra de envio. Adiado com a R4.1. |
| Alguém entra na célula pelo QR | o aviso de entrada que já sai pelo link (`avisarEntradaNaCelula`) | como hoje | nada |

Não sai aviso: a cada resposta, a cada pedido para a célula, a cada "Estou orando", a cada
atualização, quando um pedido vai para "Respondidas", quando uma resposta é ocultada ou tirada,
quando um dia é fechado.

Se o dono preferir não mexer nem no texto de `denunciaPerigo`, a alternativa é a denúncia de perigo
da conversa não mandar push: quem conduz a vê em "Para rever" quando abre a célula.

---

## 7. Política de privacidade e termos

A política sobe para a **versão 8**. Como responder, orar e entrar pelo QR são ações da própria
pessoa, e nada passa a ser visto sem que ela escreva, a proposta é **avisar no app e não pedir um
novo "sim"** (seção 15 da política). Decidido pelo dono em 16/11: a política sobe para a versão 8
só no que a R4.2 e a R4.3 mudam; as linhas da conversa ficam para quando ela voltar.

Decidido pelo dono em 16/11: o consentimento não muda. O que segue foi escrito para a conversa e só
volta a valer com ela. O texto do consentimento diz que quem conduz a célula vê como a pessoa
está caminhando, "nunca o que eu escrevo". Na conversa, quem conduz lê o que a pessoa escreve para a
célula, como já lê o pedido de oração. A proposta é manter o texto e deixar claro na política que
"o que eu escrevo" são as reflexões, orações e anotações pessoais. Se o dono quiser mudar a frase,
`CONSENTIMENTO_VERSAO` sobe para 4 e todos concordam de novo.

**Mudanças por seção:**

As linhas abaixo que falam da conversa (seções 2, 3, 4, 5, 6 e 14) ficam adiadas com a R4.1. Na
seção 2, "o app não tem chat" continua verdade e não muda.

- **2. Idade mínima e adolescentes:** "o app não tem chat" passa a "o app não tem conversa privada
  entre pessoas. A conversa do dia da célula é só entre os membros, todos leem todas as respostas,
  ela não aceita foto nem link, e quem conduz a célula modera".
- **3. Dados que coletamos:** entram as respostas na conversa da célula, as atualizações dos pedidos,
  "Estou orando" e, para quem entrou pelo QR do encontro, essa marca no convite.
- **4. Dados sensíveis:** as respostas da conversa entram em "o que você escreve livremente", com a
  frase de evitar nome e detalhe de outras pessoas.
- **5. Para que usamos:** "Conversa do dia da célula: conversar com a célula sobre a leitura." E o
  painel da administração conta células com conversa, sem texto e sem nomes.
- **6. Quem vê o quê**, linhas novas ou trocadas:
  - "Resposta na conversa do dia: os membros da célula e quem conduz, com o seu nome e foto. Os
    visitantes não veem. Quem conduz pode ocultar ou tirar uma resposta. A administração não lê a
    conversa pelo app."
  - "Resposta sua que foi denunciada: quem conduz a célula vê o texto, o seu nome e os motivos (não
    quem denunciou)."
  - "Pedido de oração ou de ajuda: a célula (membros, não visitantes) ou só quem conduz, como você
    escolher, com as atualizações que você escrever. Quantas pessoas estão orando: quem vê o pedido,
    só o número. Ninguém vê quem. Quem pode ajudar: só você vê."
  - "Pedido marcado como respondido: continua para quem já o via, na lista Respondidas, até vencer."
- **7. Quem são essas pessoas:** "Quem não tem conta" ganha "o QR do encontro mostra o mesmo que o
  link de célula e vale por 4 horas".
- **11. Guarda:**
  - nova linha "Conversa do dia da célula: 30 dias depois de escrita. Sai antes se você apagar a
    resposta, sair da célula ou apagar a conta. Uma resposta tirada por quem conduz deixa de aparecer
    na hora e é apagada no mesmo prazo. As cópias de segurança guardam o que havia por mais 14 dias.";
  - a linha do pedido ganha "Respondidas" e as atualizações;
  - "Apagar a conta" passa a citar as respostas na conversa e as atualizações dos pedidos.
- **14. Amizades, avisos e denúncias:** "Denunciar uma resposta na conversa da célula", com as mesmas
  regras do pedido (2 denúncias ocultam, perigo avisa na hora, quem conduz decide, quem denunciou não
  aparece) e o caso do líder sem auxiliar (seção 3.3).
- **15. Histórico:** "Versão 8, <data>. A conversa do dia da célula, a lista de oração com 'Estou
  orando' (só a contagem, sem nomes), atualizações e Respondidas, e o QR do encontro (seções 2, 3,
  4, 5, 6, 7, 11 e 14). Menos gente vê: o autor de um pedido deixa de ver quem orou."

**Termos de uso** (`src/termos.html`):

- seção 4 (convivência): na conversa da célula e nos pedidos não se escreve telefone, endereço,
  e-mail, link ou @ de rede social, nem detalhe da vida de outra pessoa;
- seção 7 (denúncias): a resposta na conversa segue as mesmas regras do pedido.

As mudanças entram no mesmo commit do item que as torna verdade: a conversa no R4.1, a oração no
R4.2, o QR no R4.3. A versão 8 nasce no R4.1 e ganha "ajuste" nos seguintes.

---

## 8. Banco

Uma migração por item. Com a conversa adiada (16/11), a ordem é: **v27** a lista de oração (8.2),
**v28** o QR do encontro (8.3) e a conversa na próxima versão livre quando voltar (8.1). Cada uma
funciona num banco antigo (o `teste-db` sobe de um banco v8 e
de um v26) e usa `IF NOT EXISTS` nas tabelas novas, como a v25 e a v26.

### 8.1 A conversa (R4.1, adiada; ganha a próxima versão livre quando voltar)

```sql
-- vNN: a conversa do dia da célula (docs/r4-celula.md). Uma pergunta por dia do plano, respostas
-- curtas dos membros. Fora da foto em memória, como celula_estudos: lida e gravada direto.
-- conversa_dias guarda a pergunta que as pessoas leram e se quem conduz fechou o dia.
CREATE TABLE IF NOT EXISTS conversa_dias (
  celula TEXT NOT NULL, dia INTEGER NOT NULL,
  pergunta TEXT NOT NULL,                 -- o texto, congelado na primeira resposta ou na troca
  indice INTEGER NOT NULL DEFAULT 0,      -- qual pergunta do Pensar (0 ou 1)
  fechada INTEGER NOT NULL DEFAULT 0, fechada_por TEXT NOT NULL DEFAULT '',
  em TEXT NOT NULL,
  PRIMARY KEY (celula, dia)
);
CREATE TABLE IF NOT EXISTS conversa_respostas (
  id TEXT PRIMARY KEY, celula TEXT NOT NULL, dia INTEGER NOT NULL, autor TEXT NOT NULL,
  texto TEXT NOT NULL,                    -- até 280 caracteres, já filtrado
  em TEXT NOT NULL,                       -- instante ISO; a limpeza de 30 dias conta daqui
  data TEXT NOT NULL,                     -- 'AAAA-MM-DD' no fuso do autor (limite de 10 por dia)
  estado TEXT NOT NULL DEFAULT 'visivel', -- 'visivel' | 'oculta' | 'tirada'
  moderado_por TEXT NOT NULL DEFAULT '', moderado_em TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS conversa_respostas_celula ON conversa_respostas (celula, dia, em);
CREATE INDEX IF NOT EXISTS conversa_respostas_autor ON conversa_respostas (autor);
CREATE INDEX IF NOT EXISTS conversa_respostas_em ON conversa_respostas (em);
CREATE TABLE IF NOT EXISTS conversa_denuncias (
  resposta TEXT NOT NULL, usuario TEXT NOT NULL, motivo TEXT NOT NULL, em TEXT NOT NULL,
  PRIMARY KEY (resposta, usuario)
);
```

- A oculta por denúncia não é um estado: é `estado = 'visivel'` com 2 denúncias ou mais, como no
  pedido (`escondidoPorDenuncia`). "Manter" apaga as denúncias.
- `apagarPessoaDoBanco` ganha: `conversa_denuncias` (as da pessoa e as das respostas dela),
  `conversa_respostas WHERE autor = ?`, `UPDATE conversa_respostas SET moderado_por = '' WHERE
  moderado_por = ?` e `UPDATE conversa_dias SET fechada_por = '' WHERE fechada_por = ?`. Cada passo
  só roda se a tabela existir (backup antigo).

### 8.2 v27 (R4.2): a lista de oração

```sql
-- v27: a lista de oração da célula (docs/r4-celula.md, R4.2). O pedido respondido guarda quando
-- foi respondido e passa a ficar em "Respondidas" até vencer. "Estou orando" é o gesto 'orando',
-- um por pessoa por pedido, em pedido_gestos; os 'orei' de antes viram 'orando' (um por pessoa).
-- As atualizações do autor ficam em tabela própria, na ordem em que foram escritas.
ALTER TABLE pedidos ADD COLUMN respondido_em TEXT NOT NULL DEFAULT '';
UPDATE pedidos SET respondido_em = date(vence_em, '-7 days') WHERE estado = 'respondido';
INSERT OR IGNORE INTO pedido_gestos (pedido, usuario, gesto, data)
  SELECT pedido, usuario, 'orando', MIN(data) FROM pedido_gestos WHERE gesto = 'orei' GROUP BY pedido, usuario;
DELETE FROM pedido_gestos WHERE gesto = 'orei';
CREATE TABLE IF NOT EXISTS pedido_atualizacoes (
  pedido TEXT NOT NULL, ordem INTEGER NOT NULL, texto TEXT NOT NULL, em TEXT NOT NULL,
  PRIMARY KEY (pedido, ordem)
);
```

- Os pedidos vivem na foto em memória: `paraLinhas` e `deLinhas` de `contas.mjs` precisam levar
  `respondido_em` e as atualizações, senão a primeira gravação por outro motivo zera a coluna
  (`docs/aprendizados.md`, 2026-10-17 e 2026-10-18). O `teste.mjs` relê o banco depois de gravar
  outra coisa.
- O respondido de antes da v27 tinha o vencimento encurtado para 7 dias depois da marca: a
  `respondido_em` dele é deduzida daí, e ele fica em "Respondidas" até esse vencimento.
- `apagarPessoaDoBanco` ganha `pedido_atualizacoes` dos pedidos da pessoa (antes de apagar os
  pedidos).

### 8.3 v28 (R4.3): o QR do encontro

```sql
-- v28: quem entrou pelo QR do encontro (docs/r4-celula.md, R4.3). A conta nova continua sendo
-- "convidada" (carta de Boas-vindas), mas não conta para os limiares de Semeadores de quem mostrou
-- o código (D13).
CREATE TABLE IF NOT EXISTS convites_encontro (de TEXT NOT NULL, para TEXT NOT NULL, PRIMARY KEY (de, para));
```

- Feito (R4.3): tabela própria com a chave de `convites_aceites`, e não coluna nela. Como a v25, a
  migração precisa valer num banco antigo de ensaio que não tem `convites_aceites` (o `teste-db`
  quebrou com o `ALTER TABLE`).
- `convitesAceites` vive na foto em memória: `paraLinhas` grava `convites_encontro` a partir do
  campo `encontro` de cada aceite, e `deLinhas` o lê de volta.
- `semeadorDe` passa a contar só `contaNova && ativadoEm && !encontro`.
- O token do QR é o do link da célula com um campo a mais na carga (`q: 1`) e `v` de 4 horas,
  assinado do mesmo jeito. Nada guardado no banco para o token.

---

## 9. API

As rotas de leitura ficam fora de `/api/celula/`, porque todo GET nesse prefixo é lido como link
de convite (`docs/aprendizados.md`, 2026-10-18).

### 9.1 R4.1 (adiada): `GET /api/conversa?celula=<id>[&dia=<n>]`

Sem `dia`, o dia da célula. Com `dia`, um dos 7 abertos ou um anterior que ainda tenha resposta.

```js
{
  celula: 'p…', dia: 40, diaDaCelula: 40,
  pergunta: 'Que ideia sobre Deus...', indice: 0, podeTrocar: false,   // podeTrocar: quem conduz, dia sem resposta
  aberta: true,            // dia na janela e não fechado
  fechada: false,
  respostas: [             // as visíveis para quem pede, da mais antiga para a mais nova; até 100, com "mais"
    { id: 'c…', autor: { usuario: 'ana', nome: 'Ana' }, texto: '…', em: '2026-11-20T21:04:00Z',
      minha: false, oculta: false /* só o autor e quem conduz recebem true */ },
  ],
  mais: false,
  minhasHoje: 1,           // quantas o pedinte já escreveu neste dia da conversa (para o "3 de 3")
  dias: [ { dia: 39, respostas: 4 }, { dia: 38, respostas: 2 } ],   // os outros dias abertos com resposta
  motivos: ['É ofensivo', 'Expõe alguém', 'Alguém pode estar em perigo'],
  revisar: [ /* só quem conduz */ { id, dia, texto, autor, motivos: [...], total, perigo: true } ],
}
```

O que cada um recebe de uma resposta:

- `estado 'tirada'`: ninguém recebe.
- `estado 'oculta'` ou 2 denúncias ou mais: o autor (com `oculta: true`) e quem conduz (com
  `oculta: true` e, se denunciada, também em `revisar`).
- Os outros membros recebem só as visíveis, sem `oculta`.
- Nunca vai quem denunciou.

Erros: 404 célula não encontrada (não existe, encerrada ou a pessoa não está nela); 403 visitante ou
convidado; 400 dia fora do que existe; 404 dia sem pergunta (`diaDaCelula` 0: o líder ainda não leu
nada).

### 9.2 R4.1 (adiada): `POST /api/conversa`

| Ação | Corpo | O que faz | Erros |
|---|---|---|---|
| `responder` | `{ celula, dia, texto }` | grava a resposta; na primeira do dia, guarda a pergunta | 400 texto (tamanho ou filtro, com a mensagem da seção 5); 409 dia fechado ou fora da janela; 409 limites da seção 2; 403/404 |
| `apagar` | `{ id }` | o autor apaga a dele | 404 se não é dele |
| `denunciar` | `{ id, motivo }` | uma vez por pessoa; perigo avisa quem conduz | 400 motivo; 400 a própria; 404 |
| `ocultar` | `{ id, sim }` | quem conduz oculta ou mostra de novo | 403; 404 |
| `tirar` | `{ id }` | quem conduz tira de vez | 403; 404 |
| `manter` | `{ id }` | quem conduz limpa as denúncias | 403; 404 |
| `fechar` | `{ celula, dia, sim }` | quem conduz fecha ou reabre o dia | 403; 404 |
| `pergunta` | `{ celula, dia, indice }` | quem conduz troca a pergunta (0 ou 1) | 403; 409 o dia já tem resposta |

Toda ação responde `{ ok: true }`; a tela pede o GET de novo. Quem conduz não modera a própria
resposta (403, "outra pessoa que conduz decide sobre a sua resposta").

**Regras puras** em `conversa.mjs` (novo, sem banco e sem relógio, testadas em `teste.mjs`):

```js
export const TEXTO_MAX = 280;
export const POR_DIA_DA_CONVERSA = 3;
export const POR_DIA_NA_CELULA = 10;
export const TETO_DO_DIA = 200;
export const DIAS_ABERTOS = 7;
export const DIAS_GUARDADA = 30;
export const MOTIVOS = ['É ofensivo', 'Expõe alguém', 'Alguém pode estar em perigo'];
export function diaAberto(dia, diaDaCelula)                    // dia entre diaDaCelula - 6 e diaDaCelula, e >= 1
export function perguntaDoDia(reflexoes, dia, indice = 0)      // { pergunta, indice, total } ou null
export function respostaVisivelPara(r, { usuario, conduz })     // 'nao' | 'normal' | 'oculta'
export function venceu(r, agora)                                // em + 30 dias
```

E `filtro-texto.mjs` (novo, puro): `conferirTexto(texto) -> '' | 'telefone' | 'email' | 'link' |
'arroba' | 'endereco' | 'palavra'` e `MENSAGEM_DO_FILTRO`.

### 9.3 R4.2: `/api/cuidado`

O GET muda o item do pedido:

```js
{ id, autor: { usuario, nome }, tipo, destino, texto, criadoEm, venceEm, meu,
  orando: 3,              // novo: quantos estão orando, para todos que veem; sem nomes
  euOro: true,            // novo: se quem pede está orando
  atualizacoes: [ { ordem: 1, texto: 'Fiz a prova hoje.', em: '2026-11-18' } ],   // novo, da mais nova para a mais antiga
  respondido: false, respondidoEm: '',  // agora vai para todos que veem o pedido
  ajudei,                 // como hoje
  gestos? }               // só no meu, e só os 'ajudo' (sem os de oração)
```

A resposta ganha `respondidas: [...]` (os pedidos de oração com `estado 'respondido'` visíveis,
mesmo formato) separada de `pedidos` (os ativos).

POST, ações novas e trocadas:

| Ação | Corpo | O que faz |
|---|---|---|
| `orando` | `{ id, sim }` | liga ou desliga "Estou orando" (substitui `orei`; `orei` continua aceito pelo app antigo e vira `orando` com `sim: true`) |
| `atualizar` | `{ id, texto }` | o autor acrescenta uma atualização (filtro da seção 5) |
| `apagarAtualizacao` | `{ id, ordem }` | o autor apaga uma atualização |
| `respondido` | `{ id, texto? }` | como hoje, mais: grava `respondido_em`, não encurta o vencimento e, com `texto`, grava junto uma atualização ("Como Deus respondeu") |
| `tirar` | `{ id }` | quem conduz tira o pedido sem denúncia (estado `removido`, `removido_por`) |
| `criar` | como hoje | passa pelo filtro da seção 5 |

`pedidoVisivelPara` muda uma linha: o respondido deixa de sumir para os outros.

### 9.4 Painel da administração (R4.2; os números da conversa ficam com a R4.1)

`painel.mjs`, bloco "Células e cuidado", só números: células com resposta na conversa nos últimos 7
dias; respostas nos últimos 7 dias; respostas com denúncia aberta; pedidos de oração respondidos nos
últimos 30 dias. Nenhum texto, nenhum nome. É o "Medir" do roadmap.

### 9.5 R4.3: o QR do encontro

`POST /api/celula`, ação nova:

```js
{ acao: 'qrEncontro', id }  ->  { link: 'https://…/?celula=<token>', venceEm: '2026-11-20T23:30:00Z' }
```

- `Contas.gerarQrEncontro(eu, id, assinar, agora)`: `celulaDeQuemConduz` (líder e auxiliar ativos,
  aprovados), célula sem aprovação pendente do líder, carga `{ p, d, v: agora + 4h, q: 1 }`.
- `lerLinkCelula` devolve também `encontro: true` quando `q === 1`. Nada muda para o app antigo.
- `entrarNaCelula` passa `encontro` para `usarConvite`, que grava `encontro: 1` na linha nova de
  `convites_aceites` (D13). A amizade com quem mostrou o código nasce como no link, porque é o
  fluxo que já existe.
- `GET /api/celula/<token>` responde como hoje, com `encontro: true` a mais (a tela de entrada pode
  dizer "no encontro").

---

## 10. Telas

Peças sob demanda novas: `conversa` (R4.1) e `oracao` (R4.2), em `NOMES_PECAS`, com o CSS dentro
(`CC.cascaDaPeca`). O QR do encontro mora em `celula-conduz.js` (peça `estudo-celula`, já pedida
pelas folhas de quem conduz) e usa `CC.qr` (peça `qrcode`). No index ficam o cartão de entrada da
conversa, as rotas e a troca da aba Oração por uma casca que pede a peça.

### 10.1 R4.1: a conversa (adiada pelo dono)

**Rotas:** `#/novidades/celula/<id>/conversa` (o dia da célula) e `…/conversa/<dia>`. Tela própria,
sem as abas, com "Voltar" para a aba Hoje (como o preparo do estudo). Visitante e convidado que
chegam por link antigo voltam para a aba Hoje.

**Entrada 1, aba Hoje** (membros e quem conduz), depois da barra do grupo:

- cartão `conversa-hoje`: etiqueta "Conversa do dia", a linha "Dia 40" e a pergunta (até 3 linhas,
  o resto com reticências), e embaixo "4 respostas" ou "Ninguém respondeu ainda";
- o cartão inteiro leva à conversa;
- sem dia da célula (o líder ainda não leu nada): o cartão não aparece.

**Entrada 2, Dia lido** (`dia-lido.js`): quando o dia lido é um dia aberto da conversa de uma célula
da pessoa, uma linha discreta depois do cartão Pensar, "Responder na célula", que leva a
`…/conversa/<dia>`.

**A tela:**

1. Cabeça: "Conversa do dia", "Dia 40 · Gênesis 30-31" (a passagem do dia), a pergunta em destaque
   (`pergunta-escolhida`, o mesmo estilo de "Para pensar").
2. Para quem conduz, se houver: "Para rever" (`CC.tituloSecao('Para rever', 'N')`), um cartão por
   resposta denunciada: nome, texto, "2 denúncias · É ofensivo", a caixa de ajuda quando é perigo, e
   "Manter" / "Ocultar" / "Tirar".
3. As respostas, da mais antiga para a mais nova (`conversa-resposta`): retrato de 32 px, nome
   curto, hora ("hoje, 20:14", "ontem, 21:30", "18/11, 19:02"), o texto. A minha com fundo sálvia
   pálido. A oculta (para o autor e quem conduz) com a marca "Oculta por quem conduz" e opacidade
   menor. Cada uma tem um botão discreto de 44 px com o ícone `mais` que abre uma folha curta:
   - na minha: "Apagar";
   - na de outra pessoa: "Denunciar";
   - para quem conduz, na de outra pessoa: "Ocultar" (ou "Mostrar de novo"), "Tirar", "Denunciar"
     não aparece.
4. Vazio: "Ninguém respondeu ainda."
5. O campo (fixo embaixo, como o pé das telas de lição):
   - a caixa de ajuda curta, a dica "Não escreva nome nem detalhe da vida de outra pessoa.";
   - `textarea` de 3 linhas, `maxlength` 280, placeholder "Sua resposta";
   - "Responder" (`botao`), desligado com o campo vazio;
   - erro do servidor em `erro-proposito` (por exemplo "Tire o número de telefone antes de enviar.");
   - com 3 respostas no dia, o campo dá lugar a "Você já respondeu 3 vezes neste dia.";
   - dia fechado: "Esta conversa foi fechada." no lugar do campo; fora da janela: "Esta conversa já
     fechou.".
6. Para quem conduz, no pé da tela: "Fechar a conversa deste dia" (ou "Reabrir") e, no dia sem
   resposta, "Trocar a pergunta" (alterna entre as duas do Pensar).
7. "Dias anteriores": os outros dias abertos com resposta, "Dia 39 · 4 respostas".

**Confirmações:**

- "Apagar a resposta?" / "Ela sai da conversa." / "Apagar" (perigo).
- "Tirar esta resposta?" / "Ela sai da conversa para todos, também para quem escreveu." / "Tirar"
  (perigo).
- "Fechar a conversa do dia 40?" / "Ninguém mais responde neste dia." / "Fechar".
- Denúncia: a folha do pedido, com os três motivos da conversa; perigo mostra a caixa de ajuda.

**Avisos (toast):** "Resposta enviada", "Resposta apagada", "Denúncia enviada. Obrigado por
avisar.", "Resposta oculta", "Resposta tirada", "Conversa fechada", "Conversa reaberta",
"Pergunta trocada".

Sem atualização automática: a tela pede de novo ao abrir, ao voltar para ela e depois de cada ação.

### 10.2 R4.2: a aba Oração

A aba continua entre Estudo e Pessoas, sem visitantes. A tela sai do index para a peça `oracao`
(o index fica com a casca que pede a peça e o esqueleto).

1. Para quem conduz, "Pedidos para rever" (como hoje).
2. "Pedir oração" e "Pedir ajuda" (como hoje).
3. **Pedidos**, os meus primeiro. Cada cartão:
   - nome (ou "Você"), o rótulo ("Pedido de oração", "Pedido de oração · só quem conduz", "Pedido de
     ajuda"), o texto, "Vence em 28/11";
   - as atualizações, da mais nova para a mais antiga, cada uma com a data ("20/11 · Fiz a prova
     hoje."), até 2 abertas e "Ver mais 3";
   - a linha da contagem, só com 1 ou mais: "1 pessoa está orando" / "3 pessoas estão orando"
     (`selo-status`), para todos que veem o pedido;
   - no pedido de outra pessoa: "Estou orando" (`botao pequeno`); ligado, ele vira "Você está
     orando" com o ícone `certo` e `aria-pressed="true"`, e um toque desfaz. No de ajuda, "Posso
     ajudar" como hoje. "Denunciar" discreto embaixo;
   - no meu: "Atualizar" (`botao contorno pequeno`), "Deus respondeu" (ou "Já resolvi" no de ajuda) e
     "Apagar" (`botao plano perigo pequeno`). Quem pode ajudar continua aparecendo para mim pelo nome;
     quem está orando, só pela contagem;
   - para quem conduz, no pedido de outra pessoa: "Tirar" (`botao plano perigo pequeno`).
4. **Respondidas** (`CC.tituloSecao('Respondidas', 'N')`), só com pedidos ali: o mesmo cartão, sem os
   botões de orar, com "Deus respondeu em 22/11" e a atualização de resposta em destaque, se houver.
   O meu tem só "Apagar".
5. Vazio: "Nenhum pedido agora. Quando alguém pedir oração, aparece aqui." (como hoje).

**Folha "Atualizar o pedido":** o texto do pedido em cinza, `textarea` de 200, dica "Conte o que
mudou.", "Salvar" / "Cancelar". Com 5 atualizações, o botão "Atualizar" some.

**"Deus respondeu":** a confirmação ganha um campo opcional "Como Deus respondeu" (200), e o texto da
confirmação passa a "O pedido vai para Respondidas." O aviso depois de marcar passa de "Que
alegria!" para "Pedido em Respondidas".

### 10.3 R4.3: o QR do encontro

**Entrada:** para quem conduz, na aba Hoje, no dia do encontro e no dia seguinte, ao lado de
"Mandar o link da célula": "Mostrar o QR do encontro" (`botao contorno pequeno`, com um ícone `qr`
novo no conjunto de `01-nucleo.js`, que hoje não tem um). Fora desses dias, o mesmo botão fica na
folha "Mais" de quem conduz.

**A tela** (rota `#/novidades/celula/<id>/qr`, sem abas, fundo branco também no tema escuro, para a
câmera ler):

- "Entre na <nome da célula>";
- o código grande (a largura da tela menos 32 px, até 360 px), com `CC.qr`;
- "Aponte a câmera do celular para o código.";
- "Vale até 23:30." (a hora local do vencimento);
- a legenda de João 1.46, com o texto tirado de `conteudo/biblias` (NBV, nunca digitado) e a
  referência embaixo;
- "Gerar outro código" (`botao plano pequeno`) quando faltar menos de 30 minutos ou depois de
  vencer; com o código vencido, ele aparece apagado com "Este código venceu.";
- "Fechar".
- A tela pede para a tela do celular não apagar (`navigator.wakeLock`, quando existir) e solta ao
  sair.
- Sem rede ao abrir: "Sem conexão. Tente de novo." O último código válido fica na memória da tela, e
  não no aparelho.

**Quem lê o código:** a câmera abre `/?celula=<token>` e cai no fluxo de hoje (entrar ou só conhecer,
criar conta ou entrar). Com `encontro: true`, a frase de abertura diz "<Nome> chamou você para a
<célula>, no encontro de hoje." Código vencido: a mensagem de hoje ("esse link de célula venceu ou
foi cancelado"), com "Peça a quem conduz para mostrar o código de novo."

---

## 11. Testes

Em cada item: `node build.mjs`, `TMPDIR=/dev/shm PORTAS=8981-8989 node teste.mjs` e os de navegador
de sempre (teste-navegacao, teste-barra-abas, teste-redesenho, teste-sob-demanda, teste-offline,
teste-volta, teste-celula, teste-celula-botoes, teste-conta), um por vez. teste-db nos três (todos
têm migração). teste-conta-gerir nos três (apagar a conta muda em todos). teste-fluxo-dia no R4.1
(a linha no Dia lido). Capturas em `r4-capturas/R4.N/`, 390 x 844, claro e escuro.

**`teste.mjs`:**

- `filtro-texto.mjs`: telefone com espaço, ponto, hífen, parênteses e +55; CEP; e-mail; `http`,
  `www.`, `wa.me`, `insta.com/x`; @ de rede social; "Rua das Flores, 120", "apto 302"; palavra da
  lista com acento, maiúscula e número no lugar de letra; passam "João 3.16", "Salmos 119.105",
  "2026", "Gálatas 5.22-23", "às 19h30", "7 dias".
- `conversa.mjs`: janela de 7 dias, dia 1 a 6 da célula, pergunta do dia (string e par
  `[rótulo, pergunta]`), visibilidade por estado e denúncia, vencimento de 30 dias.
- `cuidado.mjs`: respondido visível para os outros, contagem de "orando" sem nomes.
- Banco: relê a coluna `respondido_em`, as atualizações e `convites_aceites.encontro` depois de
  gravar a conta por outro motivo (a armadilha do `INSERT OR REPLACE`).
- `semeadorDe` não conta a entrada pelo QR; `convidado` continua valendo para ela.

**`ferramentas/teste-r4.mjs`** (novo, servidor descartável no padrão de `teste-celula.mjs`), crescendo
a cada item. Segurança no servidor, em todos:

- visitante não lê nem escreve (403) na conversa e no cuidado;
- membro de outra célula não lê (404) a conversa nem o pedido;
- convidado que não aceitou e quem saiu: 403 ou 404;
- texto com telefone, link, e-mail, @ ou endereço é recusado (400), na conversa, no pedido e na
  atualização, e nada é gravado;
- o texto volta escapado (um `<script>` volta como texto) e nenhum campo da resposta traz HTML.

R4.1: responder, os três limites, o teto do dia, a janela de 7 dias, dia fechado, trocar a pergunta
só antes da primeira resposta, apagar a própria, denunciar uma vez, 2 denúncias ocultam, perigo
avisa quem conduz (pela caixa do sino), ocultar e mostrar, tirar (some até para o autor), manter,
quem conduz não modera a própria, membro não modera (403), sair da célula e multiplicação apagam as
respostas, apagar a conta apaga e limpa `moderado_por`, limpeza de 30 dias, nenhum aviso a cada
resposta, nada no Juntos.

R4.2: "Estou orando" liga e desliga e conta um por pessoa, ninguém recebe nomes de quem ora, o autor
não ora pelo próprio, atualização só do autor (403 para os outros), 5 por pedido, Respondidas para
quem via o pedido e não para quem não via (pedido só para quem conduz), o app antigo mandando `orei`,
quem conduz tira sem denúncia, migração dos `orei` antigos.

R4.3: só quem conduz gera o QR (403 para membro e visitante), o token vence em 4 horas (relógio
falso), o link de 30 dias continua, entrar pelo QR como membro e como visitante, conta nova pelo QR
não sobe o Semeador de quem mostrou e recebe "convidado", `cancelar meus convites` também vence o
QR.

**Navegador:** `teste-r4.mjs` também abre as telas a 390 px, claro e escuro: o cartão da conversa na
aba Hoje para membro e não para visitante, a conversa com respostas, oculta e "Para rever", o erro do
filtro na tela, a aba Oração com contagem, atualizações e Respondidas, a tela do QR com o código
desenhado e a hora do vencimento.

**`teste-db`:** sobe um banco v8 e um v26 até a v27 e a v28; confere tabelas, índices, colunas e a
conversão dos `orei`; `apagarPessoaDoBanco` num backup v26 (sem as tabelas novas) não falha.

**`teste-sob-demanda`:** as peças `conversa` e `oracao` fora do index; a folga do index continua acima
de 60 KB.

---

## 12. O que fica de fora

- Notificação nova de qualquer tipo (resposta, pedido para a célula, atualização, respondida).
- Reação a uma resposta (curtir, "amém") e contagem de quem leu.
- Responder a uma resposta, mencionar alguém, mensagem privada.
- Foto, áudio, link, figurinha.
- Editar uma resposta ou o texto de um pedido.
- A administração lendo a conversa pelo app ou no relatório exportado.
- Uma tela da equipe para as denúncias (continua no servidor, como hoje).
- Silenciar uma pessoa só na conversa (quem conduz pode tirar a pessoa da célula, como hoje).
- Presença marcada pelo QR.
- QR que entra numa célula sem passar pela escolha de membro ou visitante.
- Carta, selo ou contagem nova por convidar pelo QR.
- Pedido de ajuda em "Respondidas".
- Conversa para célula sem dia da célula (líder que ainda não leu nada).
