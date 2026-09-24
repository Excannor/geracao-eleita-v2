# Relatório de melhorias

Base: as 31 telas fotografadas nos dois temas ([`fluxo.html`](fluxo.html)), a revisão do código,
as 10 heurísticas de usabilidade de Nielsen e o que fazem os apps de referência do mesmo
espaço: YouVersion (Bíblia e planos), Duolingo (hábito diário) e Hallow (oração e comunidade).
Data: 24/09/2026.

## Resumo

O app está bem resolvido no que mais importa: o caminho diário (Trilha → lição → reflexão →
celebração) é claro, curto e segue um modelo que o público já conhece. Ele funciona sem
internet, respeita a privacidade e tem regras de fidelidade bíblica e de tom que os apps de
mercado não têm.

Os pontos fracos estão menos nas telas e mais em volta delas:
1. **Operação:** o app roda num computador de casa, sem aviso quando cai.
2. **Bíblia livre:** está simples demais perto do que o público está acostumado.
3. **Perfil:** acumulou coisas demais.
4. **Conteúdo embutido:** o app inteiro é baixado de novo a cada atualização.

## O que já foi corrigido nesta rodada

| Onde | O que era | Como ficou |
|---|---|---|
| Explorar | "Pra ir além na leitura de hoje" mostrava Abel, Adão e Caim num dia que lê Gênesis 32-33 (as 8 primeiras pessoas do livro, em ordem alfabética) | Mostra as notas que citam os capítulos do dia: Jacó, Siquém |
| Notificações | Tocar em aviso de propósito, meta do grupo ou entrada na célula abria "Página não encontrada" | Abre Juntos ou Propósitos |
| Desafios | O cartão do Praticar tinha um círculo preto no lugar do ícone | Alvo vermelho, igual ao do desafio |
| Explorar | Ícones de Versículos e Alianças quase invisíveis no tema claro | Cores com contraste |
| Conquistas | Conquista não ganha dizia "NÍVEL 1"; a ganha em amarelo tinha estrela branca sobre fundo claro | Sem faixa até ganhar; desenho escuro sobre fundo claro |
| Textos | "1 dias seguidos", "faltam 1 para", data 2026-09-11 | "1 dia seguido", "falta 1", 11/09/2026 |
| Barra de abas | O botão central da Bíblia chamava mais atenção que a aba atual | Traço sob o nome da aba atual |
| Código | 11 funções mortas, 50 regras de CSS e 3 animações que sobraram do redesenho, 1 teste desatualizado | Removidos e corrigido |

## Prioridade alta

### 1. O servidor não pode depender de alguém perceber que ele caiu
**Hoje:**
- O app roda no Docker de um computador de casa.
- Na falta de energia de 24/09 ele ficou fora do ar sem que ninguém fosse avisado.
- Os lembretes daquela manhã não saíram. Hoje o app já manda o aviso atrasado quando volta, mas só se alguém ligar o computador.

**Proposta, da mais simples à mais completa:**
1. **Monitor externo gratuito** (UptimeRobot, Healthchecks.io ou o Health Check da Cloudflare) chamando `/api/versao` a cada 5 minutos e mandando e-mail ou Telegram quando falhar.
2. **Religar sozinho:**
   - o Docker Desktop configurado para iniciar com o Windows;
   - o Windows voltando sozinho depois da queda de energia (opção na BIOS "Restore on AC power loss").
   - Os containers já têm `restart: unless-stopped`.
3. **Cópia dos backups fora do computador.** Eles já saem cifrados, então dá para mandar a pasta `dados/backup` para o Google Drive. Hoje, se o disco morrer, vão junto o banco e os 14 backups.
4. **A médio prazo, uma VPS pequena** (a partir de uns US$ 5/mês). O app não tem dependências e já roda em Docker; a mudança é copiar a pasta `dados/` e o `.env`.

### 2. Definir qual ambiente é o de produção
**Hoje:**
- O "DEV" (ge.off-sec.net) é o que está no ar e tem pessoas de verdade usando, como a milla.
- O "PRD" e o "HML" estão parados desde 23/09.
- Um teste feito no DEV acontece com essas pessoas.

**Proposta:**
- Assumir o ge.off-sec.net como produção (nome, comentários do `docker-compose.yml` e `CAMINHO_AMBIENTE`).
- Criar um ambiente de teste separado, com dados de exemplo gerados pelo `ferramentas/telas.mjs`.

### 3. A frase da tela de entrada
**Hoje:**
- A tela mostra "1 PEDRO 2.9" sobre "Somos a geração que busca à sua face e te adora". A frase não é o texto de 1 Pedro 2.9 (que fala em "geração eleita"): lembra o Salmo 24.6.
- O app tem a regra de nunca atribuir ao texto o que ele não diz.
- "Busca à sua face" não leva crase, e a frase mistura "sua" com "te".

**Proposta:** decidir entre duas opções. Uma é tirar a referência de cima do lema. A outra é trocar o lema pelo texto da NBV de 1 Pedro 2.9, ou citar o Salmo com a redação da NBV. É uma decisão de marca, então fica com você.

### 4. Bíblia: continuar de onde parou
**Hoje:** a aba central abre sempre a lista dos 66 livros. Quem lia João 3 ontem precisa tocar em "João" e depois no "3".

**Mercado:** o YouVersion abre no último capítulo lido e mostra destaques, anotações e áudio no próprio leitor.

**Proposta, por ordem de valor:**
1. um cartão "Continuar: João 3" no topo da lista;
2. marcar nos botões os livros já lidos (o app já sabe isso: o Perfil mostra "Livros");
3. busca por palavra no texto (as duas Bíblias já estão no aparelho, então a busca funciona sem internet).

## Prioridade média

### 5. Perfil mais curto e com uma função só
**Hoje:** é a tela mais longa do app. Mistura Semeador, visão geral, amigos (repete o Juntos), anotações, coleção, versículos, livros, Primeiros passos, instalar e o apoio do CVV. As Configurações ficam num ícone pequeno no canto.

**Proposta:** o Perfil fica com "quem sou e o que já fiz", nesta ordem:
1. retrato e nome;
2. visão geral;
3. coleção (conquistas e troféus);
4. um grupo "Meus conteúdos": anotações, versículos e livros;
5. no fim, "Configurações" como linha com texto, além do ícone.

"Lendo junto" sai, porque é o Juntos. O apoio do CVV fica, porque é cuidado.

### 6. Célula como tela
Numa célula de 20 pessoas, a folha que sobe fica longa demais. O desenho da célula com abas (Hoje, Estudo, Pessoas) e o estudo montado pelo líder está pronto e em espera: é o próximo passo natural do Juntos.

### 7. Destacar e anotar versículos no leitor
**Mercado:** no YouVersion, destacar, marcar e anotar são os gestos mais usados, e o feed mostra o que os amigos destacam.

**Proposta:** tocar num versículo abre "Destacar · Guardar · Copiar · Mostrar aos amigos". O "Mostrar aos amigos" já existe na reflexão e passaria a valer em toda a Bíblia.

### 8. Cadastro: combinar o horário de leitura
**Hoje:** o lembrete nasce às 19h, e a pessoa só muda nas configurações.

**Mercado:** no Duolingo o combinado do hábito (a meta e a hora) faz parte do primeiro uso, antes mesmo da conta, e quem chega a 7 dias seguidos tem 3,6 vezes mais chance de ir até o fim.

**Proposta:** um passo a mais no cadastro, "Qual o melhor horário para você ler?", com 3 opções (manhã, almoço, noite). Pedir a permissão de notificação logo depois da primeira leitura, como já acontece.

### 9. Conteúdo fora do `index.html`
**Hoje:**
- O plano, as reflexões e as notas vão dentro do `index.html`: 4,9 MB, ou 1,1 MB comprimido.
- Qualquer mudança de código muda a versão e faz todo mundo baixar tudo de novo.
- Num celular simples, abrir o app leva cerca de 1 segundo só para interpretar o conteúdo (medido com o processador 4 vezes mais lento).

**Proposta:** o conteúdo (4,3 MB) vira um arquivo à parte com resumo no nome, do mesmo jeito que as Bíblias já fazem. Atualizar o código passa a baixar uns 275 KB comprimidos em vez de 1,1 MB, e o conteúdo só é baixado quando muda.

### 10. Tom da celebração
"Deus está acendendo a sua chama. Volte amanhã para não faltar lenha." A segunda frase puxa para a cobrança que as regras de tom do app evitam.

**Proposta:** algo como "Amanhã tem mais", que mantém o convite. Vale também a revisão de tom das reflexões, que está em espera.

### 11. Juntos
- **Botão repetido:** "Convidar" aparece duas vezes seguidas (na roda de amigos e no botão largo). Fica só o da roda, ou só o botão.
- **Pedido no meio do feed:** "Mostrar seus marcos aos amigos?" empurra o conteúdo. Pode virar uma linha discreta no topo do feed, ou aparecer só na primeira vez que a pessoa ganha um marco.

## Prioridade baixa

### 12. Ouvir a leitura
**Mercado:** YouVersion e Hallow entregam a leitura em áudio, e muita gente jovem prefere ouvir no ônibus.

**Proposta:** antes de licenciar áudio, usar a voz do próprio celular (Web Speech API). É gratuita e já funciona no Android e no iPhone. Precisa confirmar se a licença da NBV permite leitura sintetizada.

### 13. Plano que se ajusta quando a pessoa atrasa
**Hoje:** há escudos, que seguram a ofensiva.

**Mercado:** o YouVersion reprograma o plano quando a pessoa perde dias.

**Proposta:** depois de uma semana parada, oferecer "Continuar de onde parei" (como hoje) ou "Pular para o dia de hoje e ler o que perdi quando der". Isso evita que a pessoa desista por se sentir atrasada.

### 14. Engenharia
- **Um comando só para publicar:** `build → testes → docker compose up → restart do túnel`. Hoje são passos soltos, e o `restart tunel-fixo` é fácil de esquecer.
- **Túnel que não fica órfão:** o túnel fixo aponta para `http://caminho:8080` na rede do compose, em vez de `network_mode: service:caminho`. Recriar o container do app deixa de derrubar o túnel.
- **Saber quando algo quebra no celular de alguém:** o app manda os erros de JavaScript para uma rota do servidor, que guarda os últimos no painel.
- **Sincronização mais leve:** o app envia o progresso inteiro (com a foto, ~30 KB) a cada mudança. Enviar a foto só quando ela muda já corta quase todo o volume.
- **Acessibilidade:**
  - rodar uma auditoria WCAG nas folhas (foco preso dentro da folha, anúncio para leitor de tela);
  - conferir se todos os alvos de toque têm pelo menos 44 px.

## Pontos fortes para manter

- **Fidelidade bíblica como regra testada:** citações conferidas na NBV e uma trava automática nas reflexões. Nenhum app de mercado analisado faz isso.
- **Privacidade por padrão:**
  - ninguém vê o que o outro escreveu ou orou;
  - o líder vê só o número da célula, nunca quem faltou;
  - o feed é opcional.
- **Gamificação sem culpa:** escudos, oração fora de placar e avisos que ficam mais espaçados quando a pessoa some, em vez de mais insistentes.
- **Funciona sem internet** e se atualiza sozinho.
- **Segurança revisada:** CSP, limites por conta, backups cifrados e container sem root.

## Fontes

- YouVersion: [Review 2026 (Bible in a Year)](https://www.bibleinyear.com/blog/youversion-bible-app), [Google Play](https://play.google.com/store/apps/details?id=com.sirma.mobile.bible.android&hl=en_US), [faith.tools](https://faith.tools/app/3-youversion-bible-app)
- Duolingo: [Streaks e retenção (Deconstructor of Fun)](https://duolingo.deconstructoroffun.com/mechanics/streaks), [Como a ofensiva cria hábito (blog Duolingo)](https://blog.duolingo.com/how-duolingo-streak-builds-habit), [Lembretes (Digia)](https://www.digia.tech/post/duolingo-habit-forming-reminders-retention-architecture/)
- Hallow: [Recursos](https://hallow.com/features/), [Wikipedia](https://en.wikipedia.org/wiki/Hallow_(app))
- Retomada de quem parou: [SEM Nexus](https://semnexus.com/app-reactivation-campaigns-timing-triggers-channel-mix), [Countly](https://countly.com/blog/how-to-use-push-notifications-to-bring-lapsed-players-back-to-your-game)
