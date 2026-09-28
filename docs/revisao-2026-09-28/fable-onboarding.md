# Revisão do onboarding de quem ainda não crê (28/09/2026, Fable)

Lote: `src/entrar.html` (boas-vindas e cadastro), `conteudo/conhecer.json`, `src/app/05b-conhecer.js`, `conteudo/perguntas-honestas.json`. Lido do começo ao fim como um adolescente de 14 anos, de lar católico ou sem religião, convidado por um amigo. Nada foi publicado nem commitado; as mudanças estão só nos arquivos.

## Correções (6)

`arquivo · onde · antes → depois · motivo`

1. `src/entrar.html` · cadastro, passo 1, rótulo do nome · "Como você quer ser chamado?" → "Como você quer que a gente te chame?" · gênero (uma menina leria "chamada")
2. `src/entrar.html` · cadastro, erro de nome vazio · "Diga como quer ser chamado." → "Diga como quer que a gente te chame." · gênero
3. `src/app/05b-conhecer.js` · pergunta honesta, título das referências · "Leia você mesmo" → "Leia na Bíblia" · gênero ("você mesma")
4. `src/app/05b-conhecer.js` · folha "Converse com {nome}" · "{nome} vai saber que você quer conversar. O que você escreveu fica só com você." → "{nome} vai saber que você quer conversar (e o líder da sua célula, se você tiver uma). O que você escreve no app fica só com você." · o servidor avisa também o líder da célula (`servidor.mjs`, rota `/api/conhecer/conversar`) e a folha só falava de quem convidou; e "escreveu" confundia quem chega pelas Perguntas honestas sem ter escrito nada
5. `conteudo/perguntas-honestas.json` · "Deus existe?", §1 · "e tudo bem fazer ela" → "e tudo bem perguntar" · português ("fazer ela" como objeto)
6. `conteudo/perguntas-honestas.json` · "Deus existe?", §3 · "Paulo disse que Deus fez tudo" → "Paulo, um dos primeiros seguidores de Jesus, disse que Deus fez tudo" · nome sem apresentação para quem vem sem religião (primeira vez que Paulo aparece nesse caminho)

Verificações: `node ferramentas/teste-conhecer.mjs` confere; os dois JSONs passam no `JSON.parse`; `node --check src/app/05b-conhecer.js` ok; `entrar.html` continua CRLF, 567 linhas.

## O que foi conferido e ficou como está

- **Evangelho claro e fiel.** Atos 2.37-39 no dia 13 e no "E agora, o que eu faço?" batem com a NBV ("que devemos fazer?", "abandonar o pecado, voltar-se para Deus e ser batizado", "até para os que estão longe"). A graça vem antes de qualquer cobrança (Efésios 2.8-9 nos passos e em "Preciso ter uma vida perfeita?"). A oração sugerida é apresentada com "Não existe frase mágica. Fale com Deus do seu jeito." Não há pressão de decisão em nenhuma tela: o "Terminei o dia" e o "Se quiser, fale com Deus" são opcionais.
- **Jargão.** Cada termo difícil é explicado onde aparece: pecado (dia 2), Messias (dia 6), discípulos (dia 8), ressurreição (dia 9), batismo e Espírito Santo (dia 13), evangelhos e Novo Testamento (perguntas), graça (perguntas). Só "Paulo" faltava (corrigido).
- **Lar católico.** Nenhum ataque a outra igreja nos quatro arquivos. O passo 3 acolhe quem "recebeu o batismo quando criança" e manda conversar "sem pressa". "Todas as religiões levam a Deus?" afirma João 14.6 sem desprezar ninguém.
- **Batismo.** Aparece como passo de quem creu (Atos 2.41), explicado em uma frase, sem ser pré-requisito nem cobrança. A explicação como símbolo é o item 10 que já está com o dono; não mexi.
- **Nada supõe que a pessoa já crê ou já foi batizada.** O mais perto disso: a caixa de consentimento fala em "informações sobre a minha fé" (categoria legal do dado religioso; mantive) e a linha "peça para alguém te acompanhar na fé no Perfil" vem só depois do "E agora?", onde cabe.
- **Convite do modo conhecer** em `entrar.html`: "{nome} te chamou para conhecer Jesus!" e "Um caminho de 14 dias, sem pressa, pra quem quer conhecer Jesus." A pergunta "Você já segue Jesus?" some e o caminho já vai como "conhecer". Está certo.

## Para o Claude (fluxo)

1. **"Estou conhecendo" sem convite do modo conhecer não liga ninguém à pessoa.** `contas.mjs` (linhas 749-750) só define `acompanhadoPor` quando `convite.modo === 'conhecer'`. Quem cria conta por convite comum ("te chamou para ler a Bíblia junto"), por link de célula ou sem link e marca "Estou conhecendo" fica nos 14 dias sem o botão "Quero conversar com alguém", sem "Converse com {nome}" nas perguntas e sem aparecer no bloco "Conhecendo Jesus" do Juntos de quem convidou. Na tela "E agora?" ela lê "Converse com um amigo que segue Jesus ou procure uma igreja perto de você", mesmo tendo no app o amigo que a convidou. Ver Sugestão 2.
2. **No `#/seguir` o "Quero conversar com alguém" dispara na hora**, sem dizer antes quem será avisado; nas Perguntas honestas a mesma ação passa por uma folha de confirmação. Um adolescente pode esperar que abra um chat. Ver Sugestão 1.
3. **Depois do "E agora?" a pessoa continua no caminho "conhecer".** A Trilha segue mostrando os 14 dias e "Ver o plano da Bíblia em um ano"; o "Continuar lendo a Bíblia" só existe no rodapé do dia 14. Quem chega ao "E agora?" pelo dia 13 e começa os Primeiros passos não vê o ciclo se fechar. Não fica perdida (Primeiros passos está no Perfil e na Trilha), mas o app não marca a passagem. Ver Sugestão 4.
4. **"Célula" nunca é explicada nesse caminho.** `conhecer.json` diz "encontro nas casas" (dia 14 e "Como acompanhar"), enquanto o app, quem convidou e a folha de conversar dizem "célula". Ver Sugestão 3.
5. **"Só quero conhecer" com dois sentidos.** No link de célula, o botão é sobre conhecer a célula (visitante), e o mesmo rótulo está em `08b-propositos.js` (linha 1267). Na mesma tela o convite pode ser "para conhecer Jesus". Não mudei porque o rótulo precisa ficar igual nos dois arquivos; se for mudar, "Só quero conhecer a célula" nos dois.
6. **Fora do lote, para quem cuida deles:** `contas.mjs` linha 423, erro do servidor "diga como quer ser chamado" (gênero; a tela mostra essa mensagem, e `entrar.html` usa a regex `/chamado/` para voltar ao passo 1, então os dois mudam juntos). `notificacoes.mjs`, "querConversar": "do jeito que vocês costumam falar" vai também ao líder da célula, que talvez nem conheça a pessoa.

## Para o dono (doutrina)

- **Item 10 da revisão de 27/09** (batismo como símbolo, dia 13 e passo 3) segue como está. Registro só que, lido como adolescente de lar católico, o passo 3 já acolhe bem quem foi batizado criança. No dia 13, o resumo "E promete perdão e o Espírito Santo" é fiel ao conjunto de Atos 2.38, mas a ligação "ser batizado... para o perdão dos seus pecados" da NBV fica escondida; decida junto com o item 10.
- **Falta a pergunta honesta que um adolescente de lar católico mais faz:** "Fui batizado quando criança" ou "Cresci em outra igreja. Preciso mudar?". Hoje o assunto está numa frase do passo 3. Uma 11ª pergunta é conteúdo em que igrejas discordam e precisa da sua palavra; `teste-conhecer.mjs` espera exatamente 10 perguntas e teria de ser ajustado.

## Sugestões de implementação (não implementadas)

1. **Confirmar antes de "Quero conversar com alguém" no `#/seguir`.** O que: chamar a mesma `abrirFolhaConversar(nome)` das Perguntas honestas, com a linha que diz quem é avisado e que nada do que a pessoa escreveu é enviado. Por que: o botão dispara sem aviso e o adolescente pode esperar um chat; a confirmação tira a surpresa e reforça a privacidade. Esforço: pequeno (umas 10 linhas em `05b-conhecer.js`, sem servidor).
2. **"Estou conhecendo" liga a pessoa a quem convidou, em qualquer convite.** O que: em `contas.mjs`, conta nova que vem por convite (de qualquer modo) e escolhe o caminho "conhecer" no cadastro recebe `acompanhadoPor = convite.de`, com o mesmo aviso "{nome} vê em que dia você está". Por que: fecha o buraco 1: o amigo passa a ver o dia, a receber o "Quero conversar" e a ter "Como acompanhar" e "Acompanhar na fé" no Juntos. Esforço: pequeno a médio (`contas.mjs` + `teste-convites.mjs`; as telas já existem).
3. **Ponte "encontro nas casas" → célula, com convite de visitante.** O que: no dia 14 e no `#/seguir`, um cartão "Conhecer a célula de {nome}" quando quem convidou está numa célula com vaga, usando o link `?celula=` que já existe (modo visitante), mais uma linha "(na igreja, esse grupo se chama célula)". Por que: hoje a pessoa é mandada perguntar "quando é o próximo encontro nas casas", sem ligação com a aba Célula nem com o convite que já existe. Esforço: médio (o servidor expõe a célula de quem convidou junto de `acompanhadoPor`; o 05b mostra o cartão).
4. **Marco privado "Decidi seguir Jesus" a partir do "E agora?".** O que: um botão opcional "Quero marcar este dia" que grava a data no marco `decisao` de "Minha caminhada" (`08c-discipulado.js` já tem esse marco), sem pontos, sem Feed, sem avisar ninguém; em seguida, oferecer trocar o caminho para o plano + Primeiros passos. Por que: dá um "depois" concreto ao momento mais importante do app e fecha o buraco 3, sem pressão (é opcional) e sem gamificar decisão. Esforço: médio (05b + rota de marcos existente; conferir se o próprio usuário pode definir esse marco).
5. **Cadastro: escolher o caminho em vez de declarar a fé.** O que: trocar "Você já segue Jesus? Sim / Estou conhecendo" por "Por onde você quer começar? Ler a Bíblia em um ano / Conhecer Jesus em 14 dias", os mesmos nomes que a tela de conta (`07b-conta.js`) já usa. Por que: um adolescente de lar católico responde "sim" com sinceridade e cai no plano pesado (10 a 20 min por dia), quando os 14 dias seriam a porta certa; a pergunta de identidade também constrange quem ainda não sabe responder. Esforço: pequeno (rótulos em `entrar.html`; a lógica `data-caminho` fica igual). Opcional: nenhuma opção pré-marcada.

## Números

- Textos revisados: cerca de 280 (95 no `conhecer.json`, 83 nas Perguntas honestas, uns 30 no `05b-conhecer.js` e uns 70 nas telas de boas-vindas, entrada e cadastro do `entrar.html`).
- Citações conferidas na NBV: 67 entre aspas (36 no Conhecer Jesus, 31 nas Perguntas honestas), mais as paráfrases com referência, em 62 consultas ao `nbv.mjs`. Nenhuma fora da NBV.
