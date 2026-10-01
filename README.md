# Geração Eleita

Aplicativo de leitura bíblica para jovens, muitos deles recém-convertidos: o plano de 365
dias virou uma **trilha** de nós, com **ofensiva** de dias seguidos e uma chama que cresce, a
mecânica do Duolingo aplicada à leitura da Bíblia. Nasceu como "Caminho com Cristo" e, em
setembro de 2026, ganhou nome e identidade novos: Geração Eleita, de 1 Pedro 2.9 ("vocês são
geração eleita"). O material de consulta (546 notas: livros, pessoas, eventos, lugares,
versículos, temas e conexões) continua ali, como apoio de uma tela, não como centro. O texto
bíblico está dentro, em duas traduções de licença livre, e a Bíblia inteira pode ser lida à
vontade, fora do plano do dia.

## Posicionamento

**A Bíblia inteira em um ano, junto com a sua célula.** O Geração Eleita não disputa com os
aplicativos de Bíblia genéricos: ele é o aplicativo do discipulado da juventude da igreja.
O que o diferencia: reflexões escritas e revisadas para quem está começando (com um filtro de
fidelidade ao texto), leitura em grupo pequeno de verdade (propósitos de até 5 pessoas, com
meta coletiva do dia), e nada de placar. O crescimento esperado é de igreja em igreja, pelo
líder de jovens que coloca a turma no app, e não pela loja de aplicativos. Essa frase aparece
na tela de boas-vindas, no manifesto, na descrição da página e no texto do convite.

Não depende do Obsidian. O conteúdo está congelado em `conteudo/conteudo.json`, dentro do
projeto.

## Ambientes

Esta pasta é o **Geração Eleita**: porta 8082, túnel fixo `https://ge.off-sec.net`.

O **Caminho com Cristo** é o aplicativo de antes, em outras pastas: PRD em
`Caminho com Cristo - App` (porta 8080, `https://ccc.off-sec.net`) e HML em
`Caminho com Cristo - App HML` (porta 8081, cópia de homologação). Os dois foram desligados
em 23/09/2026 a pedido do dono, com `docker compose stop`: os containers ficaram guardados e
voltam com `docker compose start` na pasta de cada um. Não mexer nessas pastas sem pedido.

## Começar

```
node build.mjs        gera dist/
node servidor.mjs     serve em http://localhost:8080
```

`dist/index.html` é autocontido: CSS, JavaScript, fonte e as 546 notas num arquivo só.
Copie para o celular e ele funciona offline, sem servidor e sem internet. O texto bíblico é a
exceção: ele mora em arquivos ao lado (`dist/biblia-*.json`), e só abre quando o aplicativo é
servido.

## Instalar como aplicativo no celular

Com `node servidor.mjs` rodando, abra o endereço no celular (o servidor imprime os IPs da
rede) e use **Adicionar à tela de início**. Ele instala com ícone próprio, abre sem barra de
navegador e guarda tudo em cache. Daí em diante funciona offline.

Se o celular não abrir a página, quase sempre é o Firewall do Windows. Num PowerShell como
administrador:

```
netsh advfirewall firewall add rule name="Geracao Eleita 8080" dir=in action=allow protocol=TCP localport=8080
```

Para usar outra porta: `node servidor.mjs 3000`.

## Navegação

A barra de baixo tem quatro abas, com um botão quadrado da Bíblia no meio:

- **Trilha** (`#/`)
- **Desafios** (`#/missoes`, antes "Missões")
- **Bíblia** (`#/biblia`), o botão central
- **Juntos** (`#/novidades`)
- **Explorar** (`#/explorar`)

O Perfil saiu da barra: virou a foto redonda no canto do topo, ao lado do fogo da
ofensiva. No computador, em telas a partir de 860px, a barra vira um trilho lateral, com a
marca "Geração Eleita" no alto. Tudo isto mora em `src/app/10-roteador.js` (`ABAS`,
`pintarNavegacao`, `pintarTopo`).

## As telas

**Trilha**: os 365 dias como nós de um caminho, agrupados em 12 unidades, uma por mês do
plano. No alto fica o cartão **Leitura de hoje**, com a passagem do dia e quem já leu hoje
entre os amigos. Cada unidade traz no título os livros que percorre e, no fim, um troféu que
só abre quando todos os dias dela foram lidos. Unidades fechadas ficam recolhidas.

Cada nó conta o que houve naquele dia: visto verde para o dia lido, estrela a cada sete dias,
caneta onde você escreveu o registro e um nó dourado no dia que fecha um livro da Bíblia. O
dia atual mostra um anel que se enche conforme você marca as passagens; os que ainda não
chegaram ficam com cadeado. As doze lições de primeiros passos ficam no começo da trilha,
antes do dia 1.

**Desafios**: os desafios do dia e o quiz de memorização (**Praticar**), oito perguntas por
rodada, versículo ou referência, alternando para não decorar a posição da resposta. Praticar
também aparece no fim de cada unidade da trilha. Nesta tela fica ainda a barra de **Lendo
junto na semana**, que conta os dias em que a dupla leu.

**Bíblia**: a Bíblia inteira, livre, fora da trilha do dia. Lista dos 66 livros, grade de
capítulos e leitor em tela cheia, com troca de tradução e tamanho de letra. Só leitura: sem
busca, sem marcar como lida, sem XP. É uma cópia enxuta do leitor da lição, porque aquele
carrega junto o progresso do dia. Código em `src/app/04d-biblia.js`.

**Juntos**: o Feed dos amigos, os pedidos de amizade, os propósitos, a célula e o convite.
Aparecem ali os versículos que os amigos guardaram e os marcos deles: ofensiva, livros
terminados e conquistas.

**Célula** (o "junto com a sua célula" do posicionamento): **Criar uma célula**, em Juntos ou
em Propósitos, cria um grupo de leitura do plano só com quem criou. Dali sai um link
(`/?celula=...`) para mandar no grupo do WhatsApp: quem abre entra direto, com conta nova ou
com a que já tem, e vira amigo de quem mandou o link (pelo mesmo caminho do convite, então
bloqueio vale e conta nova conta para o Semeador). Qualquer membro manda o link; a célula para
em 5 pessoas; o link vale 30 dias e cai junto quando a pessoa cancela os convites. Regras em
`contas.mjs` (`criarCelula`, `gerarLinkCelula`, `entrarNaCelula`), rota `/api/celula`, teste
em `ferramentas/teste-celula.mjs`.

**Explorar**: todo o material de consulta, com busca em texto integral que alcança também o
que você escreveu.

No topo, em todas as telas, fica o fogo com os dias de ofensiva e, ao lado, a foto de
perfil. Tocar no fogo abre a folha com o estágio da chama, o recorde e quanto falta para
o próximo estágio.

## O dia como uma lição

Tocar num nó abre a tela cheia, com barra de progresso no topo, e passa por:

1. **Leitura**: as passagens do dia, uma por trilha (Antigo e Novo Testamento). Marcar as
   duas conta o dia e acende a ofensiva. **Ler o texto aqui** abre os capítulos no próprio
   aplicativo. Parar no meio não perde nada: o aplicativo lembra o que já foi marcado.
2. **Apoio**: o que o material tem sobre os livros de hoje (versículos, conexões, pessoas,
   eventos, lugares, temas), numa folha por cima, sem tirar você do passo.
3. **Para levar com você**: logo depois da leitura, sem tela de festa no meio. Um versículo
   para guardar, uma pergunta e a mesma coisa virada em oração. Dá para pular, e dá para abrir
   **Escrever sobre hoje**, onde ficam o método OIA completo e a oração.
4. **Resumo**: o fogo e os dias de ofensiva, a semana, e o que mudou hoje: estágio novo
   da chama, marco, conquista, livro terminado, unidade fechada, baú pronto e
   desafios do dia. Mostra quem leu hoje junto com você, com um botão para encorajar quem
   ainda não leu.

A leitura é para todo dia. Escrever, não: o aplicativo diz isso e não penaliza quem só lê.

## Reflexões do dia

Os 365 dias têm uma reflexão escrita de verdade, guardada em
`ferramentas/reflexoes/unidade-NN.json` (uma por unidade), com 2 ou 3 perguntas sem rótulo,
mais três começos de oração. As perguntas genéricas por gênero do texto (carta, narrativa,
lei...), em `src/app/04c-reflexao.js`, ficaram só como reserva. Quem
lê pode ter acabado de se converter, então há um filtro de fidelidade e estilo para tudo o
que se escreve nessa pasta, em `ferramentas/reflexoes/CLAUDE.md`, e um teste automático que
confere cada citação contra o texto bíblico de verdade:

```
node ferramentas/teste-reflexoes.mjs [unidade]
```

## Senha esquecida

Na tela de entrar, **Esqueci minha senha** pede o @ ou o e-mail. A resposta é a mesma exista
ou não a conta, para a tela não entregar quem tem cadastro. Sem serviço de e-mail, o pedido
fica anotado no **Painel do app**, e o dono gera ali um link de senha nova para mandar pelo
WhatsApp. O link vale 1 hora e uma vez só: ele é assinado com o selo da senha atual, então
morre sozinho quando a senha muda, e a troca derruba as sessões antigas. Para o link ir sozinho
por e-mail, basta configurar um SMTP (uma conta Gmail com senha de app serve): veja o topo de
`email.mjs` e as variáveis `CAMINHO_SMTP_*` no `docker-compose.yml`.

## Painel do app

Em **Configurações → Painel do app**, visível só para quem está em `CAMINHO_ADMIN`
(`docker-compose.yml`). Só contagens, sem nome de ninguém: contas novas, quem leu hoje, na
semana e no mês, quantos voltaram 1, 7 e 30 dias depois de criar a conta, onde as pessoas param
no plano, Primeiros Passos, escrita, propósitos e notificações. A conta vem de `painel.mjs`
(função pura, testada em `ferramentas/teste-senha-painel.mjs`).

No alto do mesmo painel fica a **inteligência da igreja** (`inteligencia.mjs`, `GET /api/painel/igreja`):
adoção e retenção, a chama das células (quanto de cada uma está com a chama acesa hoje, sem
placar), os frutos do mês (marcos de Minha caminhada) e o check-in de todos em porcentagem. E quem
conduz uma célula vê, na própria célula, o termômetro da chama, a frequência dos últimos encontros,
o funil da caminhada e "Precisam de atenção" com gatilhos (inclusive quem perdeu uma ofensiva
longa). Modelagem, endpoints e decisões de privacidade em [`docs/inteligencia.md`](docs/inteligencia.md).

## Não é placar

O XP existe só por dentro: ele move as conquistas e não aparece em tela nenhuma, nem no
topo, nem na trilha, nem em Desafios ou no Perfil (`src/app/02-estado.js`, `07-perfil.js`).

| O que | Quanto |
|---|---|
| marcar o dia como lido | 10 XP |
| concluir uma lição | 20 XP |
| acertar uma pergunta na prática | 3 XP |

Escrever o registro do dia não soma XP: essa pontuação existia antes e ficou congelada para
quem já tinha (`xpLegado`), mas não cresce mais. O XP é calculado do que foi feito, então dois
aparelhos nunca discordam do total. A meta diária de XP saiu, porque a medida que importa é
ter lido o dia.

A **ofensiva** conta datas de calendário, não dias do plano: ler dois dias do plano de uma
vez conta um dia de ofensiva. Ler ontem e hoje conta dois. Ficar dois dias sem ler zera a
ofensiva. O recorde fica, e o plano continua exatamente de onde parou. A chama é fogo de
verdade, e cresce por estágios (`ESTAGIOS` em `src/app/01c-arte.js`): cada estágio tem uma
frase, uma referência bíblica e um carimbo de pincel próprio, que aparece na folha da
ofensiva. Um dia esquecido não derruba tudo: uma vez por mês o aplicativo cobre sozinho um
único dia em branco, e mostra um escudo no lugar da chama naquele dia. Serve para quem
esqueceu, não para quem parou: ele só cobre o dia de ontem, e só se havia uma sequência viva
antes dele.

## Personagens, mascote e cartas

Os personagens bíblicos, o mascote Bento, as cartas de personagem, o quadro do mês e o desenho
da lamparina saíram da tela no rebrand e, em setembro de 2026, também do código (continuam no
histórico do git, se um redesenho futuro quiser partir deles). Da fala do Bento ficou só o
texto do balão do dia na trilha, em `src/app/03b-fala-do-dia.js`. O baú hoje revela um
versículo.

## O texto bíblico

Duas traduções vêm com o aplicativo:

| Tradução | Licença | Como é |
|---|---|---|
| **Nova Bíblia Viva** (Biblica Open, 2007), a padrão | CC BY-SA 4.0 | português de hoje, fácil de ler |
| **Bíblia Livre** (BLIVRE, 2018) | CC BY 4.0 Brasil | a Almeida de 1819 atualizada, mais clássica |

A NVI, que o plano usava como referência, não entra: é da Biblica, e a licença dela só
permite citar até 500 versículos sem pedido formal. A Nova Bíblia Viva é da mesma editora e é
a mais próxima dela no jeito de ler. As reflexões do dia citam sempre a NBV, por ser a
tradução padrão.

**Ler o texto aqui** abre uma tela por cima da lição, com um versículo por linha, sem
parágrafos nem títulos de seção inventados. No topo ficam a troca de tradução e o botão
**Aa**, com quatro tamanhos de letra; as escolhas valem para o aparelho. No pé, **Terminei a
leitura** marca a passagem e abre a seguinte, se houver. A tela de Bíblia livre usa o mesmo
leitor, sem a marcação de lida.

Cada tradução é um arquivo à parte em `dist/` (uns 4 MB cada), não dentro do `index.html`,
para o aparelho não baixar tudo de novo a cada atualização. O service worker guarda as
bíblias num cache próprio, baixado em segundo plano depois de abrir o app, para que a
leitura funcione sem rede depois. As duas licenças pedem crédito à vista, no fim de cada
leitura e em **Perfil › Textos bíblicos**; o importador não toca em nenhuma palavra do texto.

Para atualizar o texto, baixe os arquivos "um versículo por linha" do eBible.org, junte os
dois `.txt` numa pasta e rode:

```
curl -LO https://ebible.org/Scriptures/poronbv_vpl.zip
curl -LO https://ebible.org/Scriptures/porbr2018_vpl.zip
node ferramentas/importar-biblias.mjs <pasta com poronbv_vpl.txt e porbr2018_vpl.txt>
node build.mjs
```

## Contas e amigos

Enquanto não existe nenhuma conta, o servidor fica aberto: é o modo de quem roda só dentro
de casa. A primeira pessoa que abrir cria a dela pela própria tela de entrada, e a partir
daí o servidor passa a pedir entrada de todo mundo.

Cada conta tem o seu progresso, a sua foto e o seu nome. Contas e progresso ficam no banco
(`dados/caminho.db`, veja **Banco de dados**). A senha **não** é guardada: fica só o
resultado de scrypt sobre ela, com sal próprio por conta. O nome de usuário aceita letras,
números, ponto, hífen e sublinhado, de 2 a 30 caracteres; a senha precisa de 6 ou mais.

Amigos não têm limite. O link de convite vale por 30 dias e serve para quantas pessoas a
pessoa quiser chamar, até ela cancelar os convites; um mesmo link aceita no máximo 30 pessoas
por hora. Quem cria a conta pelo link já entra como amigo de quem convidou e fica anotado como
trazido por ela. Essa pessoa passa a contar na Trilha do Semeador de quem convidou quando
conclui a primeira lição, e deixa de contar se apagar a conta.

### Propósitos

Amizade é a conexão; propósito é o compromisso de ler, ou orar, junto. Toda amizade já nasce
com um propósito de leitura do plano em dupla. Além dele, em **Juntos › Propósitos** dá para
criar quantos quiser, com três tipos: **Plano** (dias seguidos em que todos fazem a lição),
**Livro** (um livro ou testamento, os dias em que vocês leram juntos um trecho dele, seguidos
ou não) e **Oração** (dias seguidos em que todos tocam em "Orei"; a oração escrita continua só
da pessoa).

Com a mesma pessoa pode haver vários propósitos, desde que o tipo ou a leitura mudem. Com 3 a
5 pessoas o propósito vira **grupo**, e conta pela meta coletiva do dia: a meta é o número de
membros, cada um soma 1 ponto pelo que o propósito pede e mais 1 se praticou ou abriu uma nota
de estudo naquele dia (no máximo 2), e quem fez mais cobre quem faltou.

Quem é chamado aceita ou recusa; o grupo aceita novos membros até 5, só quem criou encerra, e
os outros podem sair. A resposta dos propósitos diz só quem já fez hoje, nunca o que alguém
escreveu ou orou.

### Trilha do Semeador

Um cartão em destaque no Perfil mostra quantas pessoas alguém trouxe para o caminho. Conta só
quem criou a conta pelo link de convite dessa pessoa e já concluiu a primeira lição; quem já
tinha conta, quem só abriu o app e quem apagou a conta não contam. O número é calculado no
servidor (`semeadorDe` em `contas.mjs`, níveis em `semeador.mjs`) e vem em `/api/quem`: nada
que o aparelho grava no progresso muda esse número.

| Nível | Nome | Pessoas | Arte |
|---|---|---|---|
| 1 | Semente Lançada | 1 | broto verde |
| 2 | Pequeno Rebanho | 5 | troféu de bronze com ovelha |
| 3 | Pescador de Homens | 10 | troféu de prata com rede |
| 4 | Multiplicador | 25 | troféu de ouro com pães e peixes |
| 5 | Igreja Viva | 50+ | igreja com gente em volta |

Tocar no cartão abre os cinco níveis, cada um com o seu texto. Subir de nível celebra em tela
cheia uma vez por aparelho e vira marco no Feed, uma vez por nível.

Em **Perfil › Amigos** dá para procurar alguém e passar a acompanhar, de mão única, sem
convite nem resposta. O que um amigo vê de você são só os números: dias seguidos, quanto do
plano você andou, se leu hoje, sua foto e seu nome. **Registros, orações e anotações nunca
saem da sua conta** (`resumoPublico` em `contas.mjs`).

### Cuidar da própria conta

Em **Perfil › Sua conta**:

- **Trocar a senha** pede a senha atual mesmo com a sessão aberta. Ao trocar, **todos os
  outros aparelhos caem** e precisam entrar de novo; só o aparelho que fez a troca segue
  aberto.
- **Apagar minha conta** pergunta duas vezes, pede a senha, e leva junto o progresso, os
  registros, as orações e as cópias diárias do servidor. Não há desfazer.

## Onde o seu progresso mora

Em dois lugares: no `localStorage` de cada aparelho e, quando `servidor.mjs` está rodando, na
tabela `estados` do banco. Os dois são **fundidos**, nunca substituídos: uma marcação feita
no celular e outra no computador sobrevivem às duas. A única operação que apaga é **Zerar
progresso**, e ela apaga em todos os aparelhos. Em **Perfil › Baixar tudo o que escrevi**,
sai um arquivo Markdown com os registros e as anotações.

## Banco de dados

Tudo o que o servidor guarda mora num arquivo só, `dados/caminho.db`, com o SQLite que já
vem no Node (`node:sqlite`, nenhuma dependência nova). Roda em modo WAL.

- **Tabelas:** contas, amizades, bloqueios, silenciados, convites; propósitos, seus membros e
  os dias em que cada grupo bateu a meta; novidades e reações; inscrições, preferências e
  histórico das notificações; o progresso de cada conta (`estados`); a cópia achatada das datas
  de leitura (`leitura_dias`, com as views do painel; ver `docs/inteligencia.md`); metadados. O
  esquema tem versão (`schema_versao`).
- **Gravação:** `Contas`, `Novidades` e `Notificacoes` gravam sobre o mesmo objeto em
  memória; a cada gravação, só as linhas que mudaram vão para o banco, numa transação.
- **Backups:** um por dia (`dados/backup/caminho-AAAA-MM-DD.db.cifrado`, via `VACUUM INTO`),
  ficam os 14 mais novos. Cada um é cifrado (AES-256-GCM) com a chave `CAMINHO_BACKUP_CHAVE`
  do `.env`; sem ela, com `dados/backup.chave`. **Guarde uma cópia da chave fora do
  computador: sem ela nenhum backup abre.** Para restaurar:
  `node ferramentas/backup.mjs abrir dados/backup/caminho-AAAA-MM-DD.db.cifrado restaurado.db`.
  `node ferramentas/exportar-sqlite-para-json.mjs dados saida` regenera os JSON a partir de
  uma cópia do banco, o caminho de volta.
- **Chaves:** `dados/sessao.chave` e `dados/push.chave` continuam como arquivos.

## Notificações

Web Push de verdade, sem dependência: o servidor assina (VAPID, RFC 8292) e criptografa
(RFC 8291) cada aviso com o `crypto` do Node, e o serviço de push do Google ou da Apple só
repassa bytes que não consegue ler. A chave fica em `dados/push.chave`; os aparelhos, as
preferências e o histórico, nas tabelas `push_*` do banco. No iPhone, só funciona com o app
instalado na tela de início. As mensagens moram em `notificacoes.mjs` (lista `T` e
`montarMensagem`); a rodada e os avisos entre amigos, em `servidor.mjs` (`avisoSocial`).

| Gatilho | Quando | Condição |
| --- | --- | --- |
| Lembrete da leitura | no horário escolhido (padrão 19h) | ainda não leu hoje |
| Ofensiva em risco | 21h | 2+ dias seguidos, sem leitura hoje |
| Escudo usado | manhã (9h às 12h) | o escudo cobriu ontem |
| Sumiu (3+ dias sem ler) | no horário escolhido: todo dia do 3º ao 7º; 9º, 11º, 14º; 21º, 30º; de 15 em 15 até 90; depois todo mês | um aviso só no dia, do "de onde parou" ao "sentimos sua falta" |
| Toque ("Notificar") | na hora | quem toca já leu, quem recebe não |
| Pedido de amizade / convite aceito | na hora | só quando é novo |
| Convite de propósito | na hora | alguém te chamou para um propósito |
| Alguém entrou no propósito | na hora | um convite seu foi aceito |
| Meta do grupo quase batida | depois das 18h | falta até 2 pontos para a meta do dia |
| Meta do grupo batida | na hora | o grupo fechou a meta do dia |

Para não virar chatice: no máximo 2 automáticas por dia, nada entre 22h30 e 7h (silêncio da
noite), nada depois de ler, no máximo 3 toques por dia para quem recebe, e um toque por amigo
por dia para quem manda. Os avisos entre amigos (toque, pedido, propósito, meta do grupo) só
saem para quem mantém ligada a preferência "Amigos", em Configurações › Notificações.

```
node ferramentas/teste-notificacoes-regras.mjs   a criptografia contra o vetor da RFC e as regras hora a hora
node ferramentas/teste-notificacoes.mjs          um serviço de push falso, de ponta a ponta
```

## Identidade visual

**Redesenho em andamento (branch `redesenho-novo`)**: verde-sálvia suave, o mesmo desenho nos dois
temas, escuro de leitura em grafite, **Manrope** na interface e **Literata** no texto bíblico. O guia
é `design/guia-visual.md`; as fichas e peças de base ficam em `src/estilo-v2/` (entram depois do
`estilo.css`, que ficou congelado), e `design/mapa-telas.md` divide as telas por grupo e explica
como testar. O texto abaixo descreve a identidade anterior, que o redesenho substitui.

Cinza neutro, preto e branco, sem tempero: a logo é preto e branco, e qualquer matiz no papel
brigaria com ela. Um acento só, petróleo (`#0f5c5c` no tema claro, `#5fbdb9` no escuro), que
quer dizer **agora**: o dia de hoje, a barra que está correndo, o link que leva adiante. A
chama da ofensiva é fogo de verdade, não um ícone genérico. Cor diz estado, nunca categoria:
as seis cores que antes marcavam cada unidade hoje apontam quase todas para o acento ou para
a escala de cinza (`src/estilo.css`, `:root`). Tipografia: **Oswald** nos títulos e na
navegação, **Nunito** no texto corrido, **Permanent Marker** só no carimbo do lema da
ofensiva. Todos os pares de cor passam na régua da WCAG nos dois temas, medidos por
`ferramentas/contraste.mjs`.

Em telas a partir de 860px a barra inferior vira um trilho lateral. Todas as animações
respeitam `prefers-reduced-motion`. Isto é um aplicativo pessoal: não usa o nome, o logotipo
nem qualquer marca de denominação alguma.

## Rodar com Docker

```
docker compose up -d --build && docker compose restart tunel-fixo
```

O segundo comando é obrigatório. O túnel fixo (`tunel-fixo`) usa
`network_mode: "service:caminho"`: ele empresta a pilha de rede do container principal em vez
de ter a sua própria. Recriar o container `caminho` (o que `up --build` faz) destrói essa
pilha, e o túnel fica órfão, no ar mas sem servir nada, até ser reiniciado.

Abra `http://localhost:8082`. O `docker-compose.yml` monta só a pasta `dados/`, onde ficam o
banco, os backups e as chaves; o conteúdo vai dentro da imagem, construído junto com ela.

## Atualizar o conteúdo

O conteúdo é uma fotografia do material no dia da importação. Para trazer alterações feitas
no vault Obsidian:

```
node ferramentas/importar-vault.mjs
node build.mjs
```

O importador lê o vault e reescreve `conteudo/conteudo.json`. É o **único** ponto do projeto
que conhece o Obsidian, e ele só roda quando você manda. Se o vault sumir, o aplicativo
continua funcionando com o conteúdo que já tem.

## Verificação

```
node teste.mjs                        checagens sobre o conteúdo, o arquivo gerado e as regras
node ferramentas/teste-db.mjs         o alicerce do banco: gravação só do que mudou, transação, backups
node ferramentas/teste-banco.mjs      migra uma cópia dos dados reais e confere conta a conta
node ferramentas/teste-convites.mjs   convite multiuso, atribuição, teto por hora e cancelamento
node ferramentas/teste-propositos-regras.mjs  tipos, dias juntos e meta coletiva, sem servidor
node ferramentas/teste-propositos.mjs         duplas, grupos, sair, encerrar e privacidade pela API
node ferramentas/teste-semeador.mjs   os cinco níveis, quem conta e quem não conta, marco no Feed
node ferramentas/teste-reflexoes.mjs  cada citação das reflexões contra o texto bíblico de verdade
node ferramentas/inspecionar.mjs      usa o app de verdade num Chrome sem interface, e fotografa
node ferramentas/responsivo.mjs       12 tamanhos de tela x 8 telas, procurando o que quebra
node ferramentas/contraste.mjs        mede o contraste das cores nos dois temas
node ferramentas/teste-pratica.mjs    joga uma rodada inteira do quiz
node ferramentas/teste-unidades.mjs   confere que as 12 unidades abrem e guardam resultado
node ferramentas/teste-leitor.mjs     abre o texto, troca tradução e letra, marca pelo leitor, lê sem rede
node ferramentas/teste-redesenho.mjs  o redesenho de ponta a ponta: contas, Feed, Desafios e Perfil
node ferramentas/teste-conta-gerir.mjs   trocar a senha, apagar a conta e derrubar os outros aparelhos
node ferramentas/teste-troca-pessoa.mjs  aparelho compartilhado: uma conta não herda o que era da outra
node ferramentas/teste-notificacoes.mjs        Web Push de ponta a ponta, do registro ao envio
node ferramentas/teste-notificacoes-regras.mjs quando avisar e o que dizer, sem servidor
node ferramentas/teste-offline.mjs    abre, lê e escreve sem rede, e confere que nada se perde
node ferramentas/teste-instalar.mjs   o tutorial de pôr o app na tela de início
node ferramentas/teste-foto.mjs       a foto de perfil: escolher, reduzir, sincronizar
node ferramentas/teste-escuro-forcado.mjs  o escuro forçado do Android não pode inverter o desenho
node ferramentas/teste-atualizacao.mjs     o app se atualiza mesmo quando abre do cache
node ferramentas/teste-inteligencia.mjs    os painéis do líder e da igreja: regras, leitura_dias e quem vê o quê
node ferramentas/textos.mjs           imprime o texto que a pessoa lê, tela por tela
node ferramentas/foto.mjs 390 900 saida.png '#/'   fotografa uma rota
```

`teste.mjs` confere que o plano cobre os 66 livros, que todo link e backlink fecha, que as
duas traduções têm texto para todo capítulo do plano e trazem o crédito que a licença pede,
e exercita as regras de ofensiva e de fusão entre aparelhos. `inspecionar.mjs` percorre as
telas e a lição inteira num Chrome sem interface, marca a leitura, escreve no registro e
salva capturas em `capturas/`. `contraste.mjs` mede os pares de cor contra a régua da WCAG:
4,5 para texto comum, 3 para texto grande e para a parte que identifica um controle.

Ao rodar no Docker, confira o que o container serve contra o que você acabou de gerar:

```
curl -s http://localhost:8082/api/versao
```

Se a versão não bater com o que `node build.mjs` acabou de gerar, o build dentro da imagem
falhou e o container está servindo a versão anterior.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `conteudo/conteudo.json` | o material congelado: notas, plano, unidades, lições |
| `conteudo/biblias/nbv.json`, `blivre.json` | o texto das duas traduções, com crédito e licença |
| `build.mjs` | junta conteúdo, estilo e código em `dist/`; gera ícones, manifesto, service worker e os arquivos das bíblias |
| `servidor.mjs` | serve `dist/`, as rotas da API, os backups e a rodada das notificações |
| `db.mjs` | o banco: esquema com versão, gravação só do que mudou, importação, backups |
| `src/estilo.css` | a linguagem visual: cores, botões com aresta, nós da trilha |
| `src/app/02-estado.js` | progresso, fusão entre aparelhos, ofensiva, XP, conquistas |
| `src/app/01c-arte.js` | os estágios do fogo da ofensiva, os troféus, o baú e as medalhas, em SVG |
| `src/app/02b-jogo.js` | as conquistas com nível, os desafios do dia e os baús |
| `src/app/03-trilha.js` | a trilha de nós, as unidades e o baú |
| `src/app/04-licao.js` | o dia em passos, do "leia" ao troféu |
| `src/app/04c-reflexao.js` | o versículo para guardar, a pergunta e a oração de cada dia |
| `src/app/04d-biblia.js` | a Bíblia livre, fora da trilha: lista dos livros, capítulos e leitor |
| `src/app/06-explorar.js` | seções, notas, anotações e busca |
| `src/app/07-perfil.js` | visão geral, conquistas, exportação |
| `src/app/08-amigos.js`, `08b-propositos.js` | amigos, duplas, grupos e a célula, a barra do dia |
| `src/app/09b-missoes.js` | a tela de Desafios: desafios do dia e a semana da dupla |
| `src/app/10-roteador.js` | rotas, topo, navegação e partida |
| `contas.mjs` | contas, senhas em resumo scrypt, amizade, propósitos e o resumo público |
| `propositos.mjs` | as regras puras dos propósitos: tipos, dias juntos e meta do grupo |
| `semeador.mjs` | os cinco níveis da Trilha do Semeador e quanto falta para o próximo |
| `notificacoes.mjs` | Web Push (VAPID e criptografia), as regras de quando avisar e as mensagens |
| `ferramentas/reflexoes/` | as reflexões escritas dos 365 dias, e o filtro de fidelidade (`CLAUDE.md`) |
| `ferramentas/importar-vault.mjs` | o único arquivo que lê o vault Obsidian |

Não abra `src/index.html` direto: é só o molde, com os marcadores `/*FONTES*/`, `/*ESTILO*/`,
`/*DADOS*/`, `/*APP*/`, `/*ICONE*/` e `/*ABERTURA*/` que o build substitui.
