# Caminho com Cristo

Aplicativo de leitura bíblica: o plano de 365 dias virou uma **trilha** de nós, com
**ofensiva** de dias seguidos e uma chama que cresce: a mecânica do Duolingo aplicada à
leitura da Bíblia. O material de consulta (546 notas: livros, pessoas, eventos, lugares, versículos,
temas e conexões) continua ali, mas agora como apoio de uma tela, não como o centro. O texto
bíblico também está dentro, em duas traduções de licença livre, e abre na própria lição do dia.

Não depende do Obsidian. O conteúdo está congelado em `conteudo/conteudo.json`, dentro do
projeto.

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
netsh advfirewall firewall add rule name="Caminho 8080" dir=in action=allow protocol=TCP localport=8080
```

Para usar outra porta: `node servidor.mjs 3000`.

## As cinco telas

**Trilha**: os 365 dias como nós de um caminho, agrupados em 12 unidades, uma por mês do
plano. No alto fica uma folha clara com a saudação e dois cartões: a **leitura de hoje**
(quantas das partes do dia já foram marcadas; tocar abre a lição) e a **ofensiva** (tocar abre
a folha da chama), e embaixo deles quem já leu hoje entre os seus amigos. A estrada fica em
fundo escuro, nos dois temas: ao lado de cada nó vão o dia e a passagem, e ao lado do nó de
hoje, um cartão com o que falta ler e o botão de seguir. A linha que liga os nós é contínua
até hoje e pontilhada depois. Cada unidade traz no título os livros que percorre
(*Gênesis a Êxodo · Mateus*), e no fim um troféu que só abre quando todos os dias dela foram
lidos. Unidades fechadas ficam recolhidas, para não ter que rolar 365 nós até o dia de hoje.

Cada nó conta o que houve naquele dia: visto para o dia lido, caneta onde você escreveu o
registro e um livro no dia que fecha um livro da Bíblia (o rótulo ao lado diz qual). O dia
atual é o nó verde-limão, com um anel que se enche conforme você marca as passagens; os dias
que ainda não chegaram ficam com cadeado. A cada sete dias há um baú na estrada.

À beira da estrada ficam o jumentinho, que caminha junto do dia atual, e o personagem
bíblico da unidade: colorido onde você já passou, em silhueta mais adiante. As doze lições
de primeiros passos ficam no começo da trilha, antes do dia 1.

**Desafios**: os desafios do dia, o quadro do mês e o quiz de memorização (**Praticar**). O
quiz mostra o versículo e pede a referência, ou o contrário, alternando para não decorar a
posição da resposta; são oito perguntas por rodada, com estrelas e XP no fim. As doze
unidades abrem desde o começo: decorar um versículo antes de chegar ao livro não atrapalha.
Praticar também aparece no fim de cada unidade da trilha. Nesta tela ficam ainda a barra de
**Lendo junto na semana**, somando o que a dupla leu, e o quadro de peças do mês.

**Juntos**: em **Hoje**, cada amigo num cartão, com o selo de quem já leu e o botão de
encorajar quem ainda não leu; ali ficam também os pedidos de amizade, os propósitos e o
convite. Em **Mural**, os versículos que os amigos guardaram e os marcos deles: ofensiva,
livros terminados e conquistas.

**Explorar**: todo o material de consulta, com busca em texto integral que alcança também o
que você escreveu.

**Perfil**: no alto, a foto, o nome e três números (ofensiva, dias lidos e livros); embaixo,
em fundo escuro, a previsão de quando você termina a Bíblia no seu ritmo, a estante com um
traço por livro (lido, em andamento, por ler), quem lê junto com você, as conquistas, os
troféus e o botão de baixar tudo o que você escreveu.

Cada tela abre com o próprio título no meio e botões redondos ao lado. A ofensiva fica no
cartão da Trilha e no Perfil: tocar nela abre a folha com o estágio da chama, o recorde e
quanto falta para o próximo estágio.
## O dia como uma lição

Tocar num nó abre a tela cheia, com barra de progresso no topo, e passa por:

1. **Leitura**: as passagens do dia, uma por trilha (Antigo e Novo Testamento). Tocar em
   cada uma marca como lida; marcar as duas conta o dia e acende a ofensiva. Abaixo de cada
   passagem, **Ler o texto aqui** abre os capítulos no próprio aplicativo. Se você parar no
   meio, o aplicativo lembra o que já foi marcado e o anel do dia na trilha fica pela metade.
2. **Apoio**: o que o material tem sobre os livros de hoje: versículos daqueles capítulos,
   conexões, pessoas, eventos, lugares e temas. Abrir uma nota aqui não tira você do passo:
   ela sobe numa folha por cima.
3. **Para levar com você**: logo depois da leitura, sem nenhuma tela de festa no meio. Um
   versículo para guardar, uma pergunta para pensar e a mesma coisa virada em oração, um
   passo de cada vez. Dá para pular, e dá para abrir **Escrever sobre hoje**, onde ficam o
   método OIA completo e a oração.
4. **Resumo**: uma tela só, com a lamparina e os dias de ofensiva, a semana, e a lista do que
   mudou hoje: estágio novo da chama, marco, conquista, livro terminado, unidade fechada,
   peça do quadro, baú pronto e desafios do dia. Mostra também quem leu hoje junto com você,
   com um botão para encorajar quem ainda não leu, e o quanto do plano já foi.

A leitura é para todo dia. Escrever, não: o aplicativo diz isso e não penaliza quem só lê.
O XP não aparece aqui: ele é um número para a própria pessoa, no Perfil.
## O texto bíblico

Duas traduções vêm com o aplicativo:

| Tradução | Licença | Como é |
|---|---|---|
| **Nova Bíblia Viva** (Biblica Open, 2007), a padrão | CC BY-SA 4.0 | português de hoje, fácil de ler |
| **Bíblia Livre** (BLIVRE, 2018) | CC BY 4.0 Brasil | a Almeida de 1819 atualizada, mais clássica |

A NVI, que o plano usava como referência, não entra: é da Biblica, e a licença dela só
permite citar até 500 versículos sem pedido formal. A Nova Bíblia Viva é da mesma editora e é a
mais próxima dela no jeito de ler.

**Ler o texto aqui** abre uma tela por cima da lição, com um versículo por linha. Os arquivos
do eBible.org não trazem parágrafos nem títulos de seção, e o aplicativo não os inventa. No
topo ficam a troca de tradução e o botão **Aa**, que alterna três tamanhos de letra; as duas
escolhas valem para o aparelho, como o tema. No pé, **Terminei a leitura** marca a passagem
e, se a outra trilha do dia ainda falta, abre a seguinte. O cartão da passagem continua
marcando sozinho, para quem lê na Bíblia de papel.

Cada tradução é um arquivo em `dist/`, com um resumo do texto no nome
(`biblia-nbv.8b19576793.json`), e não vai dentro do `index.html`: são uns 4 MB cada, e o
aparelho baixaria tudo de novo a cada atualização do aplicativo. O build grava também a versão
`.gz`, e o servidor a entrega a quem aceita, o que leva a Nova Bíblia Viva de 4,5 MB a 1,4 MB.
O service worker guarda as bíblias num cache próprio, que sobrevive às atualizações. A
tradução escolhida é baixada em segundo plano alguns segundos depois de abrir o aplicativo, para
que a leitura funcione depois sem rede.

As duas licenças pedem crédito à vista. Ele aparece no fim de cada leitura e, reunido, em
**Perfil › Textos bíblicos**. A Nova Bíblia Viva só pode ser distribuída sem mudança no texto:
o importador não toca em nenhuma palavra, nem nos colchetes da Bíblia Livre, que são da própria
tradução e marcam palavras acrescentadas.

Para atualizar o texto, baixe os arquivos "um versículo por linha" do eBible.org, junte os dois
`.txt` numa pasta e rode:

```
curl -LO https://ebible.org/Scriptures/poronbv_vpl.zip
curl -LO https://ebible.org/Scriptures/porbr2018_vpl.zip
node ferramentas/importar-biblias.mjs <pasta com poronbv_vpl.txt e porbr2018_vpl.txt>
node build.mjs
```

## Pontuação

| O que | Quanto |
|---|---|
| marcar o dia como lido | 10 XP |
| escrever o registro do dia | 5 XP |
| concluir uma lição | 20 XP |
| acertar uma pergunta na prática | 3 XP |

O XP não é guardado: é calculado do que foi feito, então dois aparelhos nunca discordam sobre
o total. Ele não aparece na leitura nem no Perfil: é um número interno, que move as
conquistas e a prática. A meta diária de XP saiu, porque a medida que importa é ter lido o
dia.

A **ofensiva** conta datas de calendário, não dias do plano: ler dois dias do plano de uma
vez conta um dia de ofensiva. Ler ontem e hoje conta dois. Ficar dois dias sem ler zera a
ofensiva. O recorde fica, e o plano continua exatamente de onde parou.

Um dia esquecido não derruba tudo: uma vez por mês o aplicativo cobre sozinho um único dia
em branco, e mostra um escudo no lugar da chama naquele dia. Serve para quem esqueceu, não
para quem parou: ele só cobre o dia de ontem, e só se havia uma sequência viva antes dele.

## Contas e amigos

Enquanto não existe nenhuma conta, o servidor fica aberto: é o modo de quem roda só dentro
de casa. A primeira pessoa que abrir cria a dela pela própria tela de entrada, e a partir
daí o servidor passa a pedir entrada de todo mundo.

Cada conta tem o seu progresso, a sua foto e o seu nome. Contas e progresso ficam no banco
(`dados/caminho.db`, veja **Banco de dados**). A senha **não** é guardada: fica só o
resultado de scrypt sobre ela, com sal próprio por conta. Quem abrir o banco não descobre a
senha de ninguém.

O nome de usuário aceita letras, números, ponto, hífen e sublinhado, de 2 a 30 caracteres.
A senha precisa de 6 ou mais.

Amigos não têm limite. O link de convite vale por 30 dias e serve para quantas pessoas a
pessoa quiser chamar, até ela cancelar os convites; um mesmo link aceita no máximo 30 pessoas
por hora. Quem cria a conta pelo link já entra como amigo de quem convidou e fica anotado como
trazido por ela. Essa pessoa passa a contar na Trilha do Semeador de quem convidou quando
conclui a primeira lição, e deixa de contar se apagar a conta.

### Propósitos

Amizade é a conexão; propósito é o compromisso de ler, ou orar, junto. Toda amizade já nasce
com um propósito de leitura do plano em dupla (as amizades que existiam antes viraram esse
propósito, contando desde o dia do aceite, e ninguém perdeu dias). Além dele, em
**Feed › Propósitos** dá para criar quantos quiser, com três tipos:

- **Plano:** conta os dias seguidos em que todos fazem a lição do plano. O escudo congela a
  contagem, como sempre.
- **Livro:** um livro ou um testamento. O plano passa pelo Novo Testamento só em parte dos dias,
  então conta os dias em que vocês leram juntos um trecho dele, seguidos ou não.
- **Oração:** conta os dias seguidos em que todos tocam em "Orei" no fim da lição. Só a data
  sai da conta; a oração escrita continua só da pessoa, e o escudo não vale.

Com a mesma pessoa pode haver vários propósitos, desde que o tipo ou a leitura mudem. Com 3 a 5
pessoas o propósito vira **grupo**, e conta pela meta coletiva do dia: a meta é o número de
membros, cada um soma 1 ponto pelo que o propósito pede e mais 1 se praticou ou abriu uma nota
de estudo naquele dia (no máximo 2), e quem fez mais cobre quem faltou. A sequência do grupo são
os dias de meta batida. Dia que fecha batido fica anotado no banco, porque o diário do aparelho
guarda só 70 dias.

Quem é chamado aceita ou recusa; o grupo aceita novos membros até 5, só quem criou encerra, e
os outros podem sair. Desfazer a amizade encerra as duplas entre as duas pessoas; bloquear tira
quem bloqueou dos grupos em que os dois estavam. A resposta dos propósitos diz só quem já fez
hoje, nunca o que alguém escreveu ou orou. Depois das 18h, se falta até 2 pontos, quem ainda
não fez recebe um recado do grupo, no máximo um por dia por grupo.

### Trilha do Semeador

Um cartão em destaque no Perfil mostra quantas pessoas alguém trouxe para o caminho. Conta só
quem criou a conta pelo link de convite dessa pessoa e já concluiu a primeira lição; quem já
tinha conta, quem só abriu o app e quem apagou a conta não contam. O número é calculado no
servidor (`semeadorDe` em `contas.mjs`, níveis em `semeador.mjs`) e vem em `/api/quem`:
nada que o aparelho grava no progresso muda esse número.

| Nível | Nome | Pessoas | Arte |
|---|---|---|---|
| 1 | Semente Lançada | 1 | broto verde |
| 2 | Pequeno Rebanho | 5 | troféu de bronze com ovelha |
| 3 | Pescador de Homens | 10 | troféu de prata com rede |
| 4 | Multiplicador | 25 | troféu de ouro com pães e peixes |
| 5 | Igreja Viva | 50+ | igreja com gente em volta |

Tocar no cartão abre os cinco níveis, cada um com o seu texto. Subir de nível celebra em tela
cheia uma vez por aparelho e vira marco no Feed, uma vez por nível, para quem mostra os marcos
aos amigos; o nível já anunciado fica guardado na conta para o marco não voltar quando a
novidade vence.

Em **Perfil › Amigos** dá para procurar alguém e passar a acompanhar. Seguir é de mão única,
como acompanhar de longe: não precisa de convite nem de resposta. Do outro lado aparece
quem passou a te seguir, com um botão de seguir de volta.

O que um amigo vê de você são só os números: dias seguidos, XP, quanto do plano você andou,
se leu hoje, sua foto e seu nome. **Registros, orações e anotações nunca saem da sua conta.**
Isso não depende do que a tela mostra: o servidor monta a resposta de amigos a partir de um
resumo público (`resumoPublico` em `contas.mjs`) que não tem esses campos.

### Cuidar da própria conta

Em **Perfil › Sua conta**:

- **Trocar a senha** pede a senha atual mesmo com a sessão aberta, para que quem pegou o
  aparelho destravado não possa trancar o dono do lado de fora. Ao trocar, **todos os
  outros aparelhos caem** e precisam entrar de novo; só o aparelho que fez a troca segue
  aberto. Isso funciona porque a assinatura da sessão leva um selo da senha em vigor, que
  não viaja no cookie: muda a senha, muda o selo, e todo crachá emitido antes morre.
- **Apagar minha conta** pergunta duas vezes, pede a senha, e leva junto o progresso, os
  registros, as orações e as cópias diárias do servidor. Não há desfazer, e quem seguia a
  pessoa deixa de vê-la na lista de amigos.

### Aparelho compartilhado

O progresso mora também no `localStorage` do navegador, e ele fica lá depois que a pessoa
sai. Para que a próxima a entrar não herde o que era da anterior, o estado local guarda o
nome do dono: quando o servidor diz que quem entrou é outra pessoa, o que estava guardado
é descartado antes de qualquer fusão. Sair do aplicativo também limpa o local na hora.

Quem vinha da lista antiga em `CAMINHO_USUARIOS` no `.env` é trazido para o arquivo de
contas na primeira subida, com o progresso intacto. Depois disso a variável pode sair do
`.env`: o arquivo é a verdade.

## Onde o seu progresso mora

Em dois lugares: no `localStorage` do navegador de cada aparelho e, quando `servidor.mjs`
está rodando, na tabela `estados` do banco. Os dois são **fundidos**, nunca substituídos: uma
marcação feita no celular e outra no computador sobrevivem às duas. A única operação que
apaga é **Zerar progresso**, e ela apaga em todos os aparelhos.

O servidor faz um backup do banco inteiro por dia, em `dados/backup/caminho-AAAA-MM-DD.db`,
e guarda os 14 mais novos.

Em **Perfil**, em **Baixar tudo o que escrevi**, sai um arquivo Markdown com os registros e as
anotações. Vale fazer isso de vez em quando: é a única cópia que não depende deste
computador.

Quem já usava a versão anterior não perde nada: o aplicativo lê o `localStorage` antigo na
primeira abertura, e aceita o nome antigo do campo de lições.

## Banco de dados

Tudo o que o servidor guarda mora num arquivo só, `dados/caminho.db`, com o SQLite que já
vem no Node (`node:sqlite`, nenhuma dependência nova). O banco roda em modo WAL, testado na
pasta `dados/` montada do Windows dentro do Docker.

- **Tabelas:** contas, amizades, bloqueios, silenciados, convites usados, convites aceitos
  (quem trouxe quem), toques e denúncias; propósitos, os membros de cada um e os dias em que
  cada grupo bateu a meta;
  novidades e reações; inscrições, preferências e histórico das notificações; o progresso de
  cada conta (`estados`); e metadados. O esquema tem versão (`schema_versao`): cada mudança
  futura entra como uma versão nova, nunca editando uma que já foi para o ar.
- **Como os módulos gravam:** `Contas`, `Novidades` e `Notificacoes` seguem a mesma regra de
  antes, sobre o mesmo objeto em memória. A cada gravação, só as linhas que mudaram vão para o
  banco, numa transação: ou a mudança entra inteira, ou nada. O banco é síncrono, e por isso
  duas gravações de progresso ao mesmo tempo nunca se atropelam.
- **Migração dos JSON:** na primeira subida com banco, cada módulo importa o seu arquivo antigo
  (`contas.json`, `novidades.json`, `notificacoes.json`, `estado*.json`), marca a importação
  nos metadados e move o arquivo para `dados/json-legado-AAAA-MM-DD/`. Se algo falhar, nada é
  marcado nem movido, e a próxima subida tenta de novo. JSON ilegível impede a subida: seguir
  sem ele apagaria dados de alguém. As cópias `.bak.json` antigas ficam onde estavam.
- **Backups:** um por dia (`dados/backup/caminho-AAAA-MM-DD.db`), feito pelo próprio SQLite
  (`VACUUM INTO`), consistente mesmo com o servidor gravando. Ficam os 14 mais novos, e cada um
  abre sozinho em qualquer visualizador de SQLite.
- **Apagar a conta:** a pessoa sai do banco, de cada backup guardado, das cópias `.bak.json` e
  dos JSON na pasta de legado.
- **O caminho de volta:** `node ferramentas/exportar-sqlite-para-json.mjs dados saida` regenera
  os JSON a partir de uma cópia do banco, sem tocar em `dados/`. Para voltar a uma versão sem
  banco, pare o servidor, ponha os JSON da saída em `dados/` e suba a imagem antiga.
- **Chaves:** `dados/sessao.chave` e `dados/push.chave` continuam como arquivos.

## Ambientes: PRD e HML

- **PRD:** a pasta `Caminho com Cristo - App`, porta 8080, túnel fixo `https://ccc.off-sec.net`.
  É o que as pessoas usam.
- **HML:** a pasta `Caminho com Cristo - App HML`, porta 8081, túnel rápido da Cloudflare (o
  endereço muda a cada reinício: `docker compose logs tunel`). Os dados são uma cópia dos de
  produção, sem as chaves de sessão e de push, que o HML gera próprias.

Mudança nova nasce e é testada no HML; o PRD só recebe o que foi aprovado ali. Ao copiar dados
do PRD para o HML de novo, deixe de fora `sessao.chave`, `push.chave` e as inscrições de push,
senão o HML poderia mandar notificação para o celular de alguém.

## Notificações

Web Push de verdade, sem dependência: o servidor assina (VAPID, RFC 8292) e criptografa
(RFC 8291) cada aviso com o `crypto` do Node, e o serviço de push do Google ou da Apple só
repassa bytes que não consegue ler. A chave fica em `dados/push.chave`; os aparelhos, as
preferências e o histórico, nas tabelas `push_*` do banco. No iPhone, só funciona com o app instalado na
tela de início.

| Gatilho | Quando | Condição |
| --- | --- | --- |
| Lembrete da leitura | no horário escolhido (padrão 19h) | ainda não leu hoje |
| Ofensiva em risco | 21h | 2 ou mais dias seguidos, sem leitura, e 1h30 depois do lembrete |
| Escudo usado | manhã (9h às 12h) | o escudo cobriu ontem |
| Sumiu | 3º, 7º e 14º dia sem ler | depois disso, silêncio até voltar |
| Toque ("Notificar") | na hora | quem toca já leu, quem recebe não |
| Pedido de amizade e convite aceito | na hora | só quando é novo |

Para não virar chatice: no máximo 2 automáticas por dia, nada entre 22h30 e 7h, nada depois
de ler, no máximo 3 toques por dia para quem recebe (eles se substituem no celular), e um
toque por amigo por dia para quem manda. Tudo liga e desliga em Configurações › Notificações.
As mensagens e as regras moram em `notificacoes.mjs`; `ferramentas/teste-notificacoes-regras.mjs`
confere a criptografia contra o vetor da RFC e as regras hora a hora, e
`ferramentas/teste-notificacoes.mjs` passa por um serviço de push falso de ponta a ponta.

## Rodar com Docker

```
docker compose up --build -d
```

Abra `http://localhost:8080`. Pelo celular, use o IP do Windows (`ipconfig`), não o IP que
aparece no log do container, que é a rede interna do Docker.

O `docker-compose.yml` monta só a pasta `dados/`, onde ficam o banco, os backups e as chaves.
O conteúdo vai dentro da imagem, e o build roda na construção dela: o container sobe sem
precisar de vault nem de Node no Windows.

## Atualizar o conteúdo

O conteúdo é uma fotografia do material no dia da importação. Para trazer alterações feitas
no vault Obsidian:

```
node ferramentas/importar-vault.mjs
node build.mjs
```

O importador lê o vault em `C:\Users\Admin\Documents\Caminho com Cristo` (ou o caminho que
você passar como argumento) e reescreve `conteudo/conteudo.json`. É o **único** ponto do
projeto que conhece o Obsidian, e ele só roda quando você manda. Se o vault sumir, o
aplicativo continua funcionando com o conteúdo que já tem.

## Verificação

```
node teste.mjs                       checagens sobre o conteúdo, o arquivo gerado e as regras
node ferramentas/teste-db.mjs        o alicerce do banco: gravação só do que mudou, transação, backups
node ferramentas/teste-banco.mjs     migra uma cópia dos dados reais e confere conta a conta
node ferramentas/teste-convites.mjs  convite multiuso, atribuição, teto por hora e cancelamento
node ferramentas/teste-propositos-regras.mjs  tipos, dias juntos e meta coletiva, sem servidor
node ferramentas/teste-propositos.mjs         duplas, grupos, sair, encerrar e privacidade pela API
node ferramentas/teste-semeador.mjs  os cinco níveis, quem conta e quem não conta, marco no Feed
node ferramentas/inspecionar.mjs     usa o app de verdade num Chrome sem interface, e fotografa
node ferramentas/responsivo.mjs      12 tamanhos de tela x 8 telas, procurando o que quebra
node ferramentas/contraste.mjs       mede o contraste das cores nos dois temas
node ferramentas/teste-pratica.mjs   joga uma rodada inteira do quiz
node ferramentas/teste-unidades.mjs  confere que as 12 unidades abrem e guardam resultado
node ferramentas/teste-leitor.mjs    abre o texto, troca tradução e letra, marca pelo leitor, lê sem rede
node ferramentas/teste-redesenho.mjs  o redesenho de ponta a ponta: contas, Feed, Desafios e Perfil
node ferramentas/teste-conta-gerir.mjs trocar a senha, apagar a conta e derrubar os outros aparelhos
node ferramentas/teste-troca-pessoa.mjs aparelho compartilhado: uma conta não herda o que era da outra
node ferramentas/teste-notificacoes.mjs Web Push de ponta a ponta, do registro ao envio
node ferramentas/teste-notificacoes-regras.mjs  quando avisar e o que dizer, sem servidor
node ferramentas/teste-offline.mjs    abre, lê e escreve sem rede, e confere que nada se perde
node ferramentas/teste-instalar.mjs   o tutorial de pôr o app na tela de início
node ferramentas/teste-escuro-forcado.mjs  o escuro forçado do Android não pode inverter o desenho
node ferramentas/teste-atualizacao.mjs o app se atualiza mesmo quando abre do cache
node ferramentas/textos.mjs          imprime o texto que a pessoa lê, tela por tela
node ferramentas/foto.mjs 390 900 saida.png '#/'   fotografa uma rota
```

`teste.mjs` confere que o plano cobre os 66 livros, que todo link e backlink fecha, que
nenhum versículo sugerido cai fora dos capítulos do dia, que as duas traduções têm texto para
todo capítulo do plano e trazem o crédito que a licença pede, que o arquivo gerado não tem
marcador nem referência ao vault, e exercita as regras de ofensiva e de fusão entre
aparelhos.

`inspecionar.mjs` percorre as telas e a lição inteira, marca a leitura, escreve no registro,
confere que chegou ao servidor, mede estouro horizontal e alvos de toque pequenos, e salva
as capturas em `capturas/`.

`contraste.mjs` mede os pares de cor contra a régua da WCAG: 4,5 para texto comum, 3 para
texto grande e para a parte que identifica um controle. Serve para nenhuma mudança de
paleta apagar o texto sem ninguém notar.

Ao rodar no Docker, confira o que o container serve contra o que você acabou de gerar:

```
curl -s http://localhost:8081/api/versao
```

A versão que o container responde tem de ser a mesma que o `node build.mjs` acabou de
gerar. Se não for, o build dentro da imagem falhou e o container está servindo a versão
anterior. (8081 é o HML; o PRD responde na 8080.)

Os testes que usam o Chrome abrem o navegador por `ferramentas/navegador.mjs`: a porta de
depuração é sorteada a cada rodada, e o fechamento leva a árvore de processos e o que sobrar
com a pasta do perfil daquela rodada. Com porta fixa, no Windows, sobrava Chrome de uma rodada
e a seguinte se conectava a ele, com o armazenamento local de antes: os testes falhavam em
coisas que no app estavam certas.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `conteudo/conteudo.json` | o material congelado: notas, plano, unidades, lições |
| `conteudo/biblias/nbv.json`, `blivre.json` | o texto das duas traduções, com crédito e licença |
| `build.mjs` | junta conteúdo, estilo e código em `dist/`; gera ícones, manifesto, service worker e os arquivos das bíblias |
| `servidor.mjs` | serve `dist/` (com gzip quando há `.gz` ao lado), as rotas da API, os backups e a rodada das notificações |
| `db.mjs` | o banco: esquema com versão, gravação só do que mudou, importação dos JSON, backups e limpeza de quem apaga a conta |
| `src/index.html` | o molde, com os marcadores que o build substitui |
| `src/estilo.css` | a linguagem visual: cores, botões com aresta, nós da trilha |
| `src/fontes.css` | Manrope, Literata, Oswald e Permanent Marker embutidas em base64 (licenças SIL OFL 1.1 e Apache 2.0) |
| `src/app/01-nucleo.js` | ícones, texto, datas, avisos e peças de interface |
| `src/app/02-estado.js` | progresso, fusão entre aparelhos, ofensiva, XP, conquistas |
| `src/app/01c-arte.js` | a lamparina que cresce com a ofensiva, os troféus, o baú e as medalhas, em SVG |
| `src/app/02b-jogo.js` | as dez conquistas com nível, os desafios do dia e o quadro do mês |
| `src/app/03-trilha.js` | a trilha de nós e as unidades |
| `src/app/04-licao.js` | o dia em passos, do "leia" ao troféu |
| `src/app/04b-leitor.js` | o texto bíblico por cima da lição: tradução, letra, marcar ao terminar |
| `src/app/04c-reflexao.js` | o versículo para guardar, a pergunta e a oração de cada dia |
| `src/app/05-licoes.js` | primeiros passos |
| `src/app/06-explorar.js` | seções, notas, anotações e busca |
| `src/app/07-perfil.js` | ofensiva, números, conquistas, exportação |
| `src/app/07c-instalar.js` | tutorial de pôr o app na tela de início (iPhone e Android); abre ao criar a conta e fica no Perfil |
| `src/app/07b-conta.js` | trocar a senha e apagar a conta |
| `src/app/07d-notificacoes.js` | pedir a permissão, registrar o aparelho e as preferências de aviso |
| `src/app/08-amigos.js` | procurar, seguir e ver os números de quem caminha junto |
| `src/app/08b-propositos.js` | a tela de Propósitos: convites, duplas, grupos com a barra do dia, criar e notificar |
| `src/app/09-praticar.js` | o quiz de memorização de versículos |
| `src/app/09b-missoes.js` | a tela de Desafios: desafios do dia, quadro do mês e a semana da dupla |
| `src/app/10-roteador.js` | rotas, barra do topo, navegação e partida |
| `src/app/01b-mascote.js` | o jumentinho e os 22 personagens bíblicos, em SVG |
| `contas.mjs` | contas, senhas em resumo scrypt, amizade, propósitos e o resumo público |
| `propositos.mjs` | as regras puras dos propósitos: tipos, o que conta como feito, dias juntos e meta do grupo |
| `semeador.mjs` | os cinco níveis da Trilha do Semeador e quanto falta para o próximo |
| `novidades.mjs` | o mural de marcos dos amigos |
| `notificacoes.mjs` | Web Push (VAPID e criptografia), as regras de quando avisar e as mensagens |
| `ferramentas/ajustes-conteudo.mjs` | aplica no material tudo o que o app precisa mudar: ajustes, limpeza e as reescritas |
| `ferramentas/reescrita-pessoas.mjs`, `reescrita-explorar.mjs` | o texto reescrito para jovens, por nota, com a origem carimbada |
| `ferramentas/primeiros-passos.mjs` | as doze lições de primeiros passos |
| `ferramentas/exportar-sqlite-para-json.mjs` | regenera os JSON antigos a partir do banco: o caminho de volta |
| `ferramentas/navegador.mjs` | porta livre e fechamento completo do Chrome para as ferramentas de teste |
| `ferramentas/importar-vault.mjs` | o único arquivo que lê o vault Obsidian |
| `ferramentas/importar-biblias.mjs` | converte os arquivos do eBible.org em `conteudo/biblias/` |
| `ferramentas/icones.ps1` | gera o ícone da tela de início e o favicon em `src/icones/` a partir de `arte/icone-app.png`; rodar no Windows quando a arte mudar |
| `ferramentas/abertura.mjs` | monta a tela de abertura com o mesmo desenho do mascote |
| `widget/caminho-widget.js` | widget de tela de início para iPhone, via Scriptable |
| `arte/PROMPT-PERSONAGENS.md` | como gerar novos personagens e o que o SVG precisa respeitar |

Não abra `src/index.html` direto: é só o molde, com os marcadores `/*FONTES*/`, `/*ESTILO*/`,
`/*DADOS*/`, `/*APP*/`, `/*ICONE*/`, `/*ABERTURA*/` e `/*MASCOTE*/`.

## Design

Mecânica e forma inspiradas no Duolingo: trilha serpenteada, botões que afundam ao toque,
faixa de unidade grudada no topo, ofensiva com chama, tela de conclusão com o que se ganhou
e movimento em toda transição.

O visual é o do redesenho (as telas aprovadas estão em `design/telas/`, com o guia em
`design/guia-visual.md`): fundo cinza-claro, cartões brancos grandes e bem arredondados, sem
contorno nem sombra, botões em pílula e botões redondos de ícone. O preto é a cor da ação
(pílula preta com texto verde-limão) e o verde-limão aparece só em destaques, sempre com texto
preto em cima. A Trilha e o Perfil têm uma folha clara no alto e o resto em fundo escuro.
Uma fonte só, a Manrope; o texto bíblico usa a Literata, e o carimbo do lema na entrada
continua na Permanent Marker.

Todos os pares de cor passam na régua da WCAG nos dois temas, medidos por
`ferramentas/contraste.mjs`. No tema escuro as cores são luminosas demais para texto branco
por cima, então ali a tinta sobre as cores cheias é escura: é a variável `--sobre-cor` que
decide isso, uma vez, para o aplicativo inteiro.

Tema claro e escuro seguem o sistema, e as Configurações mudam quando você quiser. A barra
de abas é uma pílula escura flutuante com cinco botões redondos; a aba ativa é preta com o
ícone em verde-limão. Em telas a partir de 860px ela vira um trilho lateral, escuro nos dois
temas.

Os ícones são de traço fino, desenhados em SVG, os mesmos na barra e no conteúdo. A chama e o
raio vêm do
[Bootstrap Icons](https://icons.getbootstrap.com) (MIT).

O mascote é um jumentinho de carga, o animal que levou Jesus a Jerusalém, com alforjes onde
guarda o progresso. Ele e os vinte e dois personagens bíblicos são SVG desenhado à mão, sem imagem
externa: o aplicativo continua sendo um arquivo só. Quem quiser trocá-los por desenhos
melhores encontra o passo a passo em `arte/PROMPT-PERSONAGENS.md`.

Quem pediu menos movimento no sistema recebe a interface parada: todas as animações
respeitam `prefers-reduced-motion`.

Trocar de aba faz a tela entrar pelo lado de onde a pessoa veio: da direita quando anda para
frente na barra, da esquerda quando volta. Dentro da mesma aba, abrir uma nota ou uma seção
faz a tela subir. São 220ms: acima disso a navegação começa a parecer lenta em vez de fluida.

O celular também responde ao toque, com um vocabulário pequeno de vibrações (`CC.vibrar`):
um toque leve ao marcar e ao trocar de aba, um toque seco ao acertar no quiz, um tremor duplo
ao errar, e três batidas ao concluir o dia ou abrir o baú. Vibração demais irrita e gasta
bateria, então não há mais que isso. Quem pediu menos movimento no sistema não recebe nenhuma,
e o iPhone ignora a chamada, por isso ela nunca é a única resposta a um toque.

Isto é um aplicativo pessoal. Não usa o nome, o logotipo nem qualquer marca de denominação
alguma.
