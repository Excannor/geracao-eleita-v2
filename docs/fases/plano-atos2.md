# GE (Geração Eleita) a serviço de Atos 2: células, discipulado e não crentes

Análise estratégica feita a pedido do dono em 25/09/2026. Os textos bíblicos citados foram copiados da NBV e da Bíblia Livre que o app já usa. As referências estão no fim de cada seção.

> **Decisões do dono depois da análise (25/09):**
> - **Ficam como estão:** os troféus, a ofensiva e as conquistas do Semeador (níveis e nomes). As recomendações de mexer nisso (3.2, itens 1 e 2, e a condição 2 do resumo) **não serão aplicadas**.
> - **O resto se aplica,** em fases. Cada fase é **terminada e publicada** antes de começar a próxima (seção 8).
> - **Execução:** eu (Opus) especifico e reviso cada fase, e crio agentes com skills especializadas para cada frente, garantindo as regras da seção 8.2.

---

## 0. Ponto de partida: o que o GE já tem hoje

Antes de propor, o inventário. Muita coisa do pedido já existe e precisa ser **ajustada, não reinventada**.

| Área | Já existe no app | Onde |
|---|---|---|
| Leitura | Plano de 365 dias em 12 unidades; reflexão com 2 ou 3 perguntas e um começo de oração; leitor com duas traduções | `03-trilha.js`, `04-licao.js`, `04c-reflexao.js` |
| Palavra pessoal | Marcar versículos, nota privada, "Meus versículos", Bíblia inteira | `04e-versiculos.js`, `04d-biblia.js` |
| Célula | Link no WhatsApp (até 20 pessoas), recado do líder, dia do encontro, estudo escolhido pelo líder (leitura da semana, trecho com OIA ou texto dele), quem leu hoje, tirar membro | `08b-propositos.js`, `contas.mjs` |
| Comunhão | Amigos, Feed, toques, propósitos em dupla ou grupo (plano, livro ou oração) | `08-amigos.js`, `propositos.mjs` |
| Novos convertidos | "Primeiros passos": 12 temas da Trilha do Recém-Batizado | `05-licoes.js`, pasta 01 do Explorar |
| Estudo | Explorar com mais de 500 textos (pessoas, lugares, livros, temas) | `06-explorar.js` |
| Crescimento | Convite com atribuição (Trilha do Semeador, níveis 1 a 50 pessoas) | `semeador.mjs` |
| Gamificação | Ofensiva com escudos, XP de leitura, lição e prática, missões diárias, conquistas, troféus, baús; grupo com "meta do dia" | `02b-jogo.js`, `01c-arte.js` |

**Lacunas que o pedido revela:**
- não existe caminho para quem não crê (tudo começa em Gênesis 1 e na "Segurança da salvação");
- não há registro do encontro (presença e visitantes);
- não há relação discipulador e discípulo;
- não há pedidos de oração nem multiplicação de células;
- o cadastro aceita qualquer idade e não pede consentimento específico para dado religioso.

---

## 1. Fundamento bíblico

### Os textos (NBV)
- **Atos 2.42-47:** "E todos continuavam firmes no ensino dos apóstolos, na comunhão, no partir do pão e nas orações. [...] Todos os dias eles adoravam juntos no templo, reuniam-se nas casas para o partir do pão e participavam das suas refeições com grande alegria e gratidão, louvando a Deus. Todo o povo tinha simpatia por eles, e cada dia o Senhor acrescentava à igreja todos os que estavam sendo salvos."
- **Atos 5.42:** "E todos os dias, no templo e de casa em casa, continuavam a ensinar e pregar que Jesus é o Cristo."
- **2 Timóteo 2.2** (Bíblia Livre): "o que de mim ouviste [...] confia-o a pessoas fiéis, que sejam competentes para ensinar também a outros."
- **Mateus 28.19-20:** "façam discípulos [...] batizando-os [...] e ensinando esses novos discípulos a obedecerem a todas as ordens que eu lhes dei. [...] Eu estarei sempre com vocês."
- **Contexto de Atos 2:** cada um ouve "na própria língua" (v. 6-11); as perguntas do povo, "Que quer dizer isto?" (v. 12) e "Que devemos fazer?" (v. 37); a resposta de Pedro, "para os que estão longe" (v. 39); e quem creu "se uniu" aos seguidores (v. 41).

### Princípios que o app deve respeitar

| # | Princípio | Base | O que significa no produto |
|---|---|---|---|
| P1 | **Perseverança, não pico** | "continuavam firmes" (v. 42), "todos os dias" (v. 46; 5.42) | Hábito diário sim, mas medido em constância ao longo de meses, e não em sequência perfeita |
| P2 | **Os quatro juntos** | ensino, comunhão, partir do pão, orações (v. 42) | O app não pode ficar só no "ensino". Precisa servir aos quatro, e reconhecer que dois deles (**partir do pão** e boa parte da **comunhão**) são presenciais |
| P3 | **Templo e casas** | v. 46; 5.42 | O app serve à igreja reunida e às casas (célula). Ele **não é** um terceiro lugar que substitui os dois |
| P4 | **Koinonia é partilha real** | "tudo em comum", "repartiam com os que tinham necessidade" (v. 44-45) | Espaço para necessidades concretas e cuidado mútuo, e não só para progresso de leitura |
| P5 | **Alegria e simplicidade** | "grande alegria e gratidão" (v. 46) | Tom leve, sem cobrança, culpa ou comparação |
| P6 | **Testemunho que atrai** | "o povo tinha simpatia por eles" (v. 47) | A comunidade é a apologética. O não crente precisa ver gente, não só conteúdo |
| P7 | **Quem acrescenta é o Senhor** | v. 47 | **Nenhum placar de conversões**. Medimos fidelidade (acompanhamento, presença, discipulado), nunca "almas" |
| P8 | **Língua do ouvinte** | v. 6-11 | Linguagem acessível para quem não tem base bíblica |
| P9 | **Perguntas primeiro** | v. 12 e 37 | Começar pelas perguntas reais da pessoa |
| P10 | **Discipulado em gerações** | 2Tm 2.2: Paulo, Timóteo, "pessoas fiéis", "outros" | O sucesso é o discípulo que discipula. O app deve tornar visível e simples essa cadeia |
| P11 | **Obediência, não só informação** | "ensinando [...] a obedecerem" (Mt 28.20) | Toda leitura termina num passo concreto, e não só num "lido" |

**Referências da seção 1:** texto bíblico da NBV (Biblica Open, CC BY-SA 4.0) e da Bíblia Livre (CC BY 4.0), no próprio app. Comentário sobre o v. 42: [BibleRef, Atos 2.42](https://www.bibleref.com/Acts/2/Acts-2-42.html). Estrutura da pregação de Pedro (*kerygma*): [C. H. Dodd resumido (PostBarthian)](https://postbarthian.com/2018/09/12/how-to-preach-a-sermon-like-the-apostles-featuring-c-h-dodd/).

---

## 2. Pesquisa de referências

### 2.1 Modelos de igreja em células
- **Ralph Neighbour, os 4 Ws (Welcome, Worship, Word, Witness):**
  - *Acolhida:* quebra-gelo para conectar quem chega;
  - *Adoração:* o foco sai de nós e vai para Deus;
  - *Palavra:* da compreensão à aplicação;
  - *Testemunho:* o grupo se apoia para viver e testemunhar no mundo, e planeja alcançar outros.

  Joel Comiskey usa a mesma ordem como padrão de reunião. É neutro em relação a denominação e casa bem com o "antes, durante e depois" pedido.
- **G12 (César Castellanos):** a "Escada do Sucesso" tem **ganhar, consolidar, discipular, enviar**. É útil como mapa de processo, porque mostra o caminho do não crente até o líder. Mas o modelo é **controverso** no meio evangélico brasileiro, pela forte hierarquia, pela ênfase em números e por práticas como os "Encontros". Recomendo usar a **ideia do processo** sem a marca nem a estrutura dos 12.
- **Comiskey, *Home Cell Group Explosion*:** pesquisa com líderes em oito países. A multiplicação **não** se correlacionou com personalidade, dons, escolaridade ou gênero. Correlacionou com a **vida de oração do líder, com orar diariamente pelos membros**, o fator mais consistente, e também com o número de **visitantes**, de **auxiliares** (líderes em treinamento), de **visitas** e com ter **meta de multiplicação**.

  **Implicação:** o app ajuda mais o líder se apoiar oração pelos membros, visitantes e auxiliares, do que se der mais estatística de leitura.

### 2.2 Discipulado de não crentes: Estudo Bíblico por Descoberta (DBS)
- O grupo lê uma história e responde perguntas simples: o que o texto mostra sobre Deus, sobre as pessoas, o que vou obedecer, com quem vou compartilhar.
- Há um **facilitador, não um professor**. A facilitação passa para os participantes em poucas semanas.
- Obedecer e compartilhar entram **antes da conversão**, porque o discipulado começa antes da decisão.
- A sequência clássica é **"da Criação a Cristo"**, com 27 a 30 passagens, de Gênesis 1 a Lucas 24.
- É um método reprodutível e casa com P9, P10 e P11.

### 2.3 Engajamento bíblico: o "Power of 4" (Center for Bible Engagement)
- **A pesquisa:** mais de 40 mil pessoas, de 8 a 80 anos. "Engajar" é **ler, refletir e responder**, e não só ler.
- **O limiar:** engajar-se 1 a 2 vezes por semana teve efeito quase nulo, 3 vezes um efeito pequeno, e a partir de **4 vezes por semana** os efeitos saltam.
- **Os números citados:**
  - 57% menos chance de se embriagar;
  - 61% menos de consumir pornografia;
  - 228% mais de compartilhar a fé;
  - 231% mais de discipular alguém.
- **Cuidado:** é **correlação**, não causa. Quem já tem fé mais madura lê mais. Mesmo assim, a pesquisa dá uma **métrica de saúde melhor que a ofensiva**: "dias com leitura por semana, com meta de 4".

### 2.4 Recursos comunitários em apps: YouVersion "Planos com Amigos"
- Um plano feito junto: cada um **vê o progresso dos outros** e há um **espaço de conversa por dia**, privado ao grupo.
- A YouVersion não publica taxas de conclusão comparando com quem lê sozinho. Não encontrei dado público, e **não vou inventar número**.
- **O GE já tem o equivalente**, pelo propósito em grupo e pela célula. O que falta é a conversa sobre o dia, e ela tem custo alto de moderação com adolescentes (ver 3.3).

### 2.5 Riscos da gamificação na formação espiritual
- **Teoria da Autodeterminação:** a motivação duradoura vem de **autonomia, competência e vínculo**. A gamificação pode apoiar ou minar esses três.
- **Efeito de superjustificação:** recompensas externas numa atividade com valor em si **reduzem** a motivação interna, e o engajamento cai abaixo do inicial quando a recompensa some. Na fé, o risco é ler "pela chama" e não por Deus.
- **Sequências (streaks):** exploram a **aversão à perda**. Um dia perdido parece fracasso total, o que gera ansiedade, sobretudo em adolescentes. O próprio Duolingo descobriu que **facilitar manter a sequência** (congelamentos) aumentou a retenção. O GE já tem escudos, o que acerta nisso.
- **Comparação:** rankings e "quem fez mais" geram vergonha em quem fica para trás. Na igreja, onde o mais fraco é justamente quem mais precisa de cuidado, isso vai na direção contrária.

### 2.6 Brasil
- **Censo 2022 (IBGE, divulgado em junho de 2025):**
  - católicos caíram de 65,1% para 56,7%;
  - evangélicos subiram de 21,6% para 26,9% (47,4 milhões);
  - sem religião foram de 7,9% para 9,3%;
  - **40,3% dos sem religião têm de 15 a 29 anos**;
  - entre 10 e 14 anos, 52% são católicos, 31,6% evangélicos e 12,5% sem religião.
- **Implicação:** o amigo que o jovem da igreja vai convidar muitas vezes vem de **lar católico** ou **sem religião**. O tom precisa ser sem ataque a outras igrejas.
- **EUA, com a ressalva de ser outro país:**
  - Barna: a leitura semanal da Bíblia na Geração Z adulta subiu de 30% para 49% entre 2024 e 2025;
  - Barna: mais da metade dos adolescentes **não cristãos** quer aprender sobre Jesus;
  - Barna: 51% dos que deixaram a fé o fizeram por causa da "política da igreja";
  - o relatório "Quiet Revival", da Bible Society, sugere volta dos jovens à igreja no Reino Unido, mas a amostra foi criticada.
- **O que o não cristão valoriza na conversa:** que o cristão **conte a própria história e pergunte pela dele**, e que haja coerência de vida (Barna). O fator mais forte de fé duradoura é ter **um mentor**.

### 2.7 Evangelismo relacional
- **Alpha:** refeição, conversa e pequeno grupo, onde "nenhuma pergunta é boba". Funciona porque **o membro convida alguém com quem já tem confiança**.
- **"Pertencer antes de crer":** para a geração atual, a fé chega mais como caminhada em comunidade do que como evento isolado.

**Referências da seção 2:**
- Células: [4 Ws (Home Groups)](https://homegroups.org.uk/series/the-4-ws/); [Ordem da reunião nos 4 Ws (Joel Comiskey Group)](https://jcgresources.com/en/resources/small_group_basics/en_lessons_sample/); [Avaliação da estrutura de igreja em células (Peter Koh)](http://disciplewalk.com/files/Peter_Koh_The_Cell_Group_Church_Structure_an_Evaluation.pdf).
- G12: [Escada do Sucesso (Editora G12)](https://editorag12.com/site/produto/a-escada-do-sucesso/); [G12, o modelo controverso (Gospel Mais)](https://noticias.gospelmais.com/g12-conheca-saiba-modelo-igrejas-evagelicas-23849.html).
- Comiskey: [Questionário de fatores de multiplicação](https://jcgresources.com/en/resources/phd_tutorials/en_prp_multstats/); [Tempo diário do líder com Jesus](https://joelcomiskeygroup.com/en/resources/cell_basics/en_leader_spendingtime/).
- DBS: [método DBS (International Project)](https://internationalproject.org/discovery-bible-study-method/); [DBS para não cristãos](https://internationalproject.org/discovery-bible-study/); [lista "Da Criação a Cristo"](https://www.contagiousdisciplemaking.com/post/discovery-bible-study-creation-to-christ-scripture-list).
- Power of 4: [Scientific Evidence for the Power of 4 (PDF)](https://bttbfiles.com/web/docs/cbe/Scientific_Evidence_for_the_Power_of_4.pdf); [Back to the Bible, 2004 a 2023](https://www.backtothebible.org/post/the-evolution-of-bible-engagement-a-research-journey-2004-2023); [K-LOVE, números citados](https://www.klove.com/resources/christian-living/the-power-of-4-the-secret-to-weekly-transformation-7108).
- YouVersion: [Anúncio dos Planos com Amigos](https://blog.youversion.com/2017/11/youversion-bible-app-announcing-plans-with-friends-2017/); [Planos com Amigos (Life.Church)](https://open.life.church/resources/3488-plans-with-friends).
- Gamificação: [Gamificação pela Teoria da Autodeterminação (ICE)](https://icenet.blog/2025/06/17/align-the-game-to-your-aim-considering-gamification-through-the-lens-of-self-determination-theory/); [Meta-análise sobre motivação intrínseca (Springer, 2023)](https://link.springer.com/article/10.1007/s11423-023-10337-7); [Mau uso da gamificação em app de idiomas (arXiv)](https://arxiv.org/pdf/2203.16175); [Sequências e aversão à perda em crianças](https://screenwiseapp.com/guides/duolingo-streaks-and-anxiety-in-kids); [Sequências sem vergonha (UX Magazine)](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame).
- Brasil: [Agência Brasil, Censo 2022](https://agenciabrasil.ebc.com.br/geral/noticia/2025-06/evangelicos-crescem-e-representam-mais-de-um-quarto-da-populacao); [ISER, primeiro olhar sobre o Censo 2022](https://iser.org.br/en/noticia/um-brasil-mais-plural-um-primeiro-olhar-sobre-os-dados-de-religiao-do-censo-2022/).
- EUA: [Barna, leitura bíblica](https://www.barna.com/trends/bible-reading-trends/); [Barna, adolescentes e Jesus](https://www.barna.com/research/teens-and-jesus/); [Barna, conversas com não cristãos](https://www.barna.com/research/conversations-non-christians/); [Quiet Revival e críticas](https://www.andybannister.net/the-quiet-revival-are-young-adults-leading-a-church-resurgence-in-england-and-wales/).
- Evangelismo relacional: [Alpha (Wikipedia)](https://en.wikipedia.org/wiki/Alpha_course); ["Belonging before believing" (TGC)](https://www.thegospelcoalition.org/blogs/trevin-wax/belonging-before-believing/).

---

## 3. Análise crítica: onde o app ajuda e onde atrapalha

### 3.1 Onde ajuda de verdade
- **Constância na Palavra entre os encontros** (P1, Power of 4): é o ponto forte do GE. A leitura diária, com reflexão e oração, é exatamente "ler, refletir, responder".
- **O "antes" e o "depois" da célula:** recado, dia do encontro, estudo preparado e o link para entrar. Tira atrito do líder, que em geral é um jovem voluntário.
- **A porta de entrada relacional:** o convite de um amigo já cria amizade e dupla. É a forma que a pesquisa mostra funcionar (Alpha, Barna).
- **Continuidade do novo convertido:** a trilha dos "Primeiros passos" existe. Falta uma pessoa acompanhando.

### 3.2 Onde pode atrapalhar, com honestidade
1. **Fé como pontuação.** O GE já tem XP, missões, conquistas, troféus, baús, ofensiva, níveis do Semeador e, no grupo, "meta do dia" com "quem fez mais cobre quem faltou". É muita camada extrínseca para uma prática que deve ser intrínseca (superjustificação). Os acertos atuais precisam ficar: orar e escrever não valem pontos, há escudos, não há ranking. **Recomendação:** congelar a gamificação (nada novo de pontos), mudar o destaque da ofensiva para "dias na Palavra nesta semana" (meta de 4) e **nunca** gamificar evangelismo nem discipulado.
2. **Os níveis do Semeador** ("Pescador de Homens" com 10 pessoas, "Igreja Viva" com 50) tocam em P7: contar pessoas como troféu. Hoje contam contas criadas, não conversões, o que é menos grave. **Recomendação:** manter o reconhecimento, trocar a linguagem para gratidão ("pessoas que chegaram pelo seu convite") e tirar a escada de níveis. Isso depende de você e do pastor.
3. **O líder vendo "quem leu hoje" e "3 de 42 leituras possíveis".** Ajuda a cuidar, mas pode virar **vigilância e vergonha** em adolescentes. **Recomendação:** mostrar ao líder **quem precisa de atenção** ("sem ler há 5 dias"), para um contato pessoal, em vez de percentuais diários. E deixar o membro escolher se o líder vê a leitura dele.
4. **Substituir o encontro presencial.** O risco maior seria criar chat, vídeo ou "célula online" no app. Atos 2.46 é casa e mesa. **Recomendação:** durante o encontro, o app só mostra o roteiro, sem notificação nem feed. O app existe para levar à casa, não para ser a casa.
5. **Dados de oração expostos.** Um pedido de oração é quase sempre dado sensível (saúde, família, pecado), e com adolescentes pode envolver abuso ou risco. **Recomendação:** pedidos com prazo de validade, visíveis só para quem o autor escolher (líder ou célula), sem Feed, sem busca, sem exportar para o líder. E um texto claro sobre o que fazer em caso de risco (o app já mostra o CVV 188).
6. **A dependência de uma pessoa e de uma máquina.** Hoje o GE roda num Raspberry Pi, com backup manual, mantido por um voluntário. Se o app virar ferramenta oficial de células, isso é risco de continuidade.

### 3.3 Ideias que **não** fazem sentido (e por quê)
- **Chat dentro do app:** o WhatsApp já é o lugar da conversa no Brasil, e um chat próprio com menores exige moderação, denúncia e registro, com risco jurídico (ECA Digital). **Não fazer.** O app gera a mensagem pronta e manda para o WhatsApp, como já faz com o estudo.
- **Ranking entre membros ou entre células:** contradiz P5 e P7 e a pesquisa sobre comparação. **Não fazer.**
- **Contador de "decisões por Jesus" ou de batismos como meta:** contradiz P7. Registrar o batismo como **marco da pessoa** (ela mesma ou o discipulador) faz sentido. **Não** como número de desempenho do líder.
- **Transmissão de culto ou "igreja online" no app:** fora do foco. O YouTube da igreja já resolve.
- **Pontos por evangelizar:** transforma o outro em meio. **Não fazer.**

**Referências da seção 3:** as mesmas das seções 2.5 e 2.7. [ECA Digital (Machado Meyer)](https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/direito-digital/estatuto-digital-da-crianca-e-do-adolescente-lei-n-15-211-2025-entra-em-vigor-em-17-de-marco-de-2026).

---

## 4. Funcionalidades por público

Legenda: ✅ já existe e só ganha ajuste · 🆕 novo. Cada item traz o princípio ou a pesquisa por trás.

### 4.1 Líder de célula
| Funcionalidade | Detalhe | Por quê |
|---|---|---|
| ✅ Recado, dia do encontro, estudo, link | Já existe | Tira atrito do "antes" |
| 🆕 **Roteiro 4 Ws** | O estudo que já existe ganha as quatro partes: Acolhida (uma pergunta quebra-gelo pronta), Adoração (uma sugestão de louvor, ou o líder escreve), Palavra (o estudo atual, com OIA ou DBS) e Testemunho (quem vamos convidar e um alvo de oração). Um toque manda tudo para o WhatsApp | Neighbour e Comiskey; P2 |
| 🆕 **Modo encontro** | Tela única e simples com o roteiro, sem notificações nem Feed, letra grande | P3: o app serve ao encontro, não compete com ele |
| 🆕 **Registro do encontro (depois)** | Em 30 segundos: quem foi, quantos visitantes, se houve pedido de oração para acompanhar. Nada de nota ou texto pessoal. **É a base de todas as métricas de transformação** | Comiskey (visitantes); métricas da seção 5 |
| 🆕 **Lista de oração do líder** | Todo dia o app lembra o líder de orar por 2 ou 3 membros, em rodízio, com o nome e um lembrete de contato. Sem registrar o que ele orou | Comiskey: oração diária pelos membros é o fator nº 1 de multiplicação |
| 🆕 **Quem precisa de atenção** | Substitui os percentuais diários: "Lucas não aparece há 2 encontros", "Bia está sem ler há 6 dias". Com um botão para mandar mensagem pessoal | Cuidado (P4) sem vigilância (3.2.3) |
| 🆕 **Auxiliar (líder em treinamento)** | O líder indica um auxiliar, que pode conduzir o roteiro e vê o que o líder vê | Comiskey (auxiliares); 2Tm 2.2 |
| 🆕 **Visitante** | A pessoa entra pelo link como "visitante" (leitura leve, sem ofensiva nem metas) e depois pode virar membro | P6; "pertencer antes de crer" |

### 4.2 Membro
| Funcionalidade | Detalhe | Por quê |
|---|---|---|
| ✅ Leitura diária, reflexão, oração, versículos | Já existe | Power of 4; P1 |
| 🆕 **"Dias na Palavra nesta semana" (meta de 4)** | Vira a medida principal na tela da ofensiva. A sequência continua, mas em segundo plano | Power of 4; reduz a aversão à perda |
| 🆕 **Pedido de oração** | Para a célula ou só para o líder, com validade (7 ou 30 dias). Os outros veem "orei por você" (só a data). Nada no Feed | P2 (orações), P4; cuidado com dado sensível |
| 🆕 **Necessidade prática** | "Preciso de ajuda com…" (carona, material de escola, mudança), visível só para a célula | P4: "repartiam com os que tinham necessidade" |
| 🆕 **Convidar para o encontro** | Mensagem pronta para o WhatsApp com o dia (o endereço fica com o líder, não no app) | Alpha; Comiskey (visitantes) |
| 🆕 **"Minha história com Deus"** | Um guia privado em três partes (antes, como conheci Jesus, hoje) para o jovem saber contar a própria história | Barna: não cristãos valorizam ouvir a história e ser perguntados |

### 4.3 Discipulador
| Funcionalidade | Detalhe | Por quê |
|---|---|---|
| ✅ Trilha dos Primeiros passos | Já existe (12 temas) | Base de conteúdo |
| 🆕 **Relação discipulador e discípulo** | Os dois aceitam o vínculo (convite dos dois lados). O discipulador vê **o que o discípulo escolher mostrar**: passos concluídos, dias na Palavra na semana. Nunca vê os textos escritos nem as orações | Barna (mentor); Mt 28.19-20; privacidade |
| 🆕 **Encontro semanal 1 a 1** | Roteiro curto: "Como você está?", o passo da semana, uma pergunta de obediência ("O que você fez com o que leu?"), oração. Sem registro de conteúdo, só a data | P11 (obediência); DBS |
| 🆕 **Marcos da caminhada** | A própria pessoa marca: decisão, batismo, entrou numa célula, começou a discipular alguém | P10: o marco que mais importa é "discipulou alguém" |
| 🆕 **Cadeia de 2 Timóteo 2.2** | O discipulador vê que seu discípulo começou a discipular outra pessoa, sem nomes além do primeiro nível | P10; mostra gerações sem virar pirâmide |

### 4.4 Não crente (o público definido: amigos dos jovens)
| Funcionalidade | Detalhe | Por quê |
|---|---|---|
| 🆕 **Convite "para quem está conhecendo Jesus"** | O jovem escolhe esse tipo de convite. O modo vai dentro do link assinado, e a conta nova já cai no caminho certo | Alpha (confiança existente) |
| 🆕 **Caminho "Conhecer Jesus" (14 dias)** | Passagens curtas "da Criação a Cristo" terminando em Atos 2 (Gênesis 1 e 3, Isaías 53, Lucas 2, 5 e 15, João 3, 4 e 11, Marcos 4, Lucas 23 e 24, Atos 2). Perguntas do DBS em linguagem simples | DBS; P8, P9 |
| 🆕 **Ler junto com quem convidou** | Quem convidou vê "dia 5 de 14" e recebe uma folha "Como acompanhar": pergunte o que achou, conte sua história, não pressione | Barna (mentor e escuta) |
| 🆕 **Perguntas honestas** | Cerca de 10 textos curtos: Deus existe? Por que o sofrimento? Jesus existiu? Dá para confiar na Bíblia? E outros | Alpha ("nenhuma pergunta é boba"); P9 |
| 🆕 **"Quero seguir Jesus"** | Explica a resposta de Atos 2.37-39 em palavras simples. O botão "Quero conversar com alguém" avisa só quem convidou e o líder da célula. Depois vêm os Primeiros passos e o convite para a célula como visitante | P7 (sem placar), v. 41 ("se uniu") |

**Referências da seção 4:** as das seções 2.1 a 2.7.

---

## 5. Roadmap

O esforço está em dias de trabalho de desenvolvimento no ritmo atual, com o conteúdo escrito por mim. Aprovação pastoral e testes com jovens reais contam à parte.

### MVP: "da porta à mesa" (cerca de 4 a 6 semanas)
O objetivo é fechar o caminho **amigo não crente → Conhecer Jesus → encontro da célula**, e ter o dado mínimo para medir.

| Item | Público | Prioridade | Esforço | Depende de |
|---|---|---|---|---|
| Consentimento LGPD para dado religioso e idade mínima de 12 anos | todos | **Alta, pré-requisito** | 1 a 2 dias, mais revisão jurídica | Decidir quem é o controlador (seção 6) |
| Convite "conhecendo Jesus" e caminho `conhecer` | não crente | Alta | 3 dias | — |
| Conteúdo Conhecer Jesus (14 dias) e Perguntas honestas (10 textos) | não crente | Alta | 5 a 7 dias de escrita | Aprovação do pastor |
| Tela do Conhecer Jesus, com o leitor aceitando trechos por versículo | não crente | Alta | 3 dias | Conteúdo |
| "Quero seguir Jesus" com aviso privado | não crente | Alta | 2 dias | Convite |
| Visitante na célula | líder e não crente | Alta | 2 a 3 dias | — |
| Registro do encontro (presença e visitantes) | líder | Alta | 2 a 3 dias | — |
| "Dias na Palavra nesta semana" em destaque | membro | Média | 1 dia | — |

**Métricas de sucesso do MVP:**
- não crentes que **terminam** o Conhecer Jesus (mais de 50% dos que começam);
- desses, quantos **vão a um encontro** em até 30 dias;
- visitantes que **voltam** para o 2º encontro;
- quantos apertam "quero conversar" e **recebem contato** em até 48h (medida de cuidado, não de conversão).

### V2: "discipulado e cuidado" (cerca de 6 a 8 semanas depois)
| Item | Público | Esforço | Depende de |
|---|---|---|---|
| Discipulador e discípulo, com o encontro semanal 1 a 1 | discipulador | 5 dias | Consentimento; modelo da igreja (seção 6) |
| Marcos da caminhada | discipulador e membro | 2 dias | Relação de discipulado |
| Roteiro 4 Ws e modo encontro | líder | 4 dias | Estudo atual |
| Lista de oração do líder e "quem precisa de atenção" | líder | 3 dias | Registro do encontro |
| Pedido de oração e necessidade prática, com validade | membro | 4 dias | Consentimento; política de moderação |
| Mudar a linguagem do Semeador e os percentuais do líder | todos | 1 a 2 dias | Decisão do pastor |

**Métricas da V2:**
- % de membros com **4 ou mais dias na Palavra por semana**;
- **frequência média** na célula (pelo registro do encontro);
- novos convertidos com **discipulador** em até 2 semanas;
- discípulos que completam os Primeiros passos.

### V3: "enviar e multiplicar" (depois de 3 a 6 meses de uso real)
| Item | Público | Esforço | Depende de |
|---|---|---|---|
| Auxiliar e multiplicação de célula (célula mãe e filha) | líder | 4 a 5 dias | Auxiliar e registro de encontros com histórico |
| Cadeia de 2 Timóteo 2.2 | discipulador | 3 dias | Relação de discipulado |
| Painel pastoral **agregado e sem nomes** (células, frequência, visitantes, multiplicações) | pastor | 3 dias | Tudo acima |
| "Minha história com Deus" e cartão de versículo para o status | membro | 3 dias | — |

**Métricas da V3:**
- **células multiplicadas por ano**;
- **discípulos que discipulam** (2ª geração);
- líderes novos saídos de auxiliares.

### Métricas que **não** vamos perseguir (anti-métricas)
Minutos no app, ofensiva máxima, XP total, "decisões" contadas. E vigiar os sinais ruins: gente que para de usar logo depois de perder a ofensiva, e notificações desativadas.

**Referências da seção 5:** o Power of 4 dá a meta de "4 ou mais dias por semana"; Comiskey dá visitantes, auxiliares e multiplicação como indicadores.

---

## 6. Riscos, privacidade, LGPD e perguntas antes de começar

### Riscos e cuidados
- **Dado sensível (LGPD, art. 11):** convicção religiosa e filiação a organização religiosa são dados sensíveis. Participar de uma célula, marcar oração, fazer pedido de oração e registrar batismo são dados sensíveis. Isso exige **consentimento específico e destacado para cada finalidade**, ou outra base do art. 11. A política de privacidade atual (`src/privacidade.html`) é boa (sem venda, sem rastreadores, exclusão completa), mas **não traz esse consentimento específico**.
- **Crianças e adolescentes:**
  - LGPD, art. 14: dados de menores de 12 anos pedem consentimento de pai ou mãe. Hoje o cadastro aceita qualquer idade;
  - o **ECA Digital** (Lei 15.211/2025, em vigor desde 17/03/2026) vale para serviços com acesso provável de adolescentes: pede ferramentas de supervisão para os pais e, nas redes sociais, **conta vinculada a um responsável para menores de 16**. O GE tem funções sociais (amigos, Feed, toques). **Precisa de parecer jurídico** antes de crescer.
- **Evangelizar adolescentes de outras famílias:** além da lei, há a questão pastoral. O caminho Conhecer Jesus deve ser algo que **a família possa ver sem constrangimento**, com um convite para os pais conhecerem.
- **Minimização:**
  - pedidos de oração expiram;
  - o líder nunca vê textos pessoais;
  - o registro do encontro guarda presença, não conteúdo;
  - o painel pastoral só mostra dados agregados.
- **Moderação:** qualquer texto que outras pessoas leem (pedido de oração, necessidade) precisa de denúncia e remoção, e o líder deve ter um caminho para situações de risco.
- **Continuidade técnica:** backup automático fora do Pi e um segundo administrador, se o app virar ferramenta oficial.
- **Teológicos:** tom sem política e sem ataque a outras tradições (P5, dados do Censo); conteúdo para não crentes aprovado pelo pastor; nenhuma fórmula mágica de conversão.

### Perguntas que você precisa responder antes de começar
1. **A igreja adota o GE oficialmente?** Se sim, a igreja é a **controladora** dos dados pela LGPD e precisa de um encarregado (DPO). Se não, o controlador é você, pessoa física.
2. **Qual é o modelo de célula da igreja?** 4 Ws, G12, MDA ou próprio? O roteiro e a escada de processo precisam falar a língua da igreja.
3. **Quem discipula quem hoje?** Existe discipulado 1 a 1 formal? Ou o discipulador é o próprio líder da célula?
4. **Os líderes vão registrar presença** depois de cada encontro? Sem isso não há métrica de transformação.
5. **Quem vê as métricas?** Só o pastor, os supervisores, o líder? Sempre agregado ou com nomes?
6. **Idade mínima e pais:** vamos aceitar menores de 12 com autorização dos pais, ou fixar 12 anos? Como atender ao ECA Digital para menores de 16?
7. **Gamificação atual:** o pastor concorda em tirar os níveis do Semeador e tirar o destaque da ofensiva em favor dos "4 dias por semana"?
8. **Pedidos de oração:** a igreja quer? Quem modera? O que o líder faz se aparecer um relato de abuso ou risco?
9. **Batismo:** é registrado no app (pela pessoa) ou fica só na secretaria da igreja?
10. **Recursos:** há alguém além de você para manter o app e para revisar conteúdo e dados?

**Referências da seção 6:**
- LGPD, art. 11: [Serpro, dados sensíveis](https://www.serpro.gov.br/lgpd/menu/protecao-de-dados/dados-sensiveis-lgpd); [ConJur, adequação de igrejas à LGPD](https://www.conjur.com.br/2021-mar-15/opiniao-adequacao-igrejas-instituicoes-religiosas-lgpd/).
- LGPD, art. 14: [ANPD, enunciado sobre crianças e adolescentes](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes).
- ECA Digital: [Machado Meyer](https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/direito-digital/estatuto-digital-da-crianca-e-do-adolescente-lei-n-15-211-2025-entra-em-vigor-em-17-de-marco-de-2026); [Data Privacy Brasil](https://www.dataprivacybr.org/eca-digital-entra-em-vigor-o-que-a-lei-preve-e-o-que-ainda-falta-regulamentar/).

---

## 7. Resumo de uma página (para decidir)

**A pergunta:** vale expandir o GE de "app de leitura" para ferramenta do modelo de Atos 2, servindo células, discipulado e não crentes?

**Resposta curta: sim, com três condições.**

**Por que faz sentido**
- O GE já tem **metade do caminho** pronto: leitura diária com reflexão e oração, célula com link, recado e estudo, convite que cria amizade e trilha para novos convertidos.
- A pesquisa aponta que **o que transforma** é o engajamento com a Palavra 4 ou mais dias por semana (Power of 4), **ler com alguém** (mentor, Barna) e o **convite de quem já é amigo** (Alpha). Tudo isso o GE pode fazer bem.
- O público existe: no Brasil, 40% de quem se diz sem religião tem de 15 a 29 anos.
- O que falta é concreto e cabe em fases: um caminho para quem não crê, o registro do encontro, a relação de discipulado e o cuidado com a oração.

**As três condições**
1. **O app serve à casa, não substitui a casa** (Atos 2.46). Nada de chat, vídeo ou "célula online". O WhatsApp e a mesa continuam sendo o lugar da conversa.
2. **Fé não vira placar** (Atos 2.47: "o Senhor acrescentava"). Nada novo de pontos. Tirar os níveis do Semeador. Trocar o destaque da ofensiva por "4 dias na Palavra por semana". Nunca contar conversões.
3. **Privacidade antes de crescer.** Convicção religiosa é dado sensível (LGPD, art. 11), há adolescentes (art. 14 e ECA Digital) e pedidos de oração são delicados. Antes do MVP: consentimento específico, idade mínima, definir o controlador e ter um parecer jurídico.

**O que fazer, em ordem**
- **MVP (4 a 6 semanas):** da porta à mesa. Convite "conhecendo Jesus", caminho Conhecer Jesus em 14 dias (método DBS), perguntas honestas, "Quero seguir Jesus" ligado a uma pessoa, visitante na célula e registro do encontro. **Mede:** quem termina o caminho, quem vai a um encontro, quem volta.
- **V2 (6 a 8 semanas):** discipulado e cuidado. Discipulador e discípulo, roteiro 4 Ws, lista de oração do líder, pedidos de oração com validade. **Mede:** 4 ou mais dias na Palavra, frequência na célula, novos convertidos com discipulador.
- **V3 (depois de 3 a 6 meses):** enviar e multiplicar. Auxiliar, célula mãe e filha, cadeia de 2 Timóteo 2.2, painel pastoral sem nomes. **Mede:** células multiplicadas e discípulos que discipulam.

**Riscos principais:** vigilância e vergonha entre adolescentes; dados sensíveis expostos; dependência de um voluntário e de um servidor caseiro; o modelo G12 como marca, que é controverso (usar a ideia do processo, não a estrutura).

**Antes de começar, responder:** a igreja adota oficialmente? (define o controlador pela LGPD); qual é o modelo de célula; os líderes vão registrar presença; quem vê as métricas; e a política de idade e de pais.

**Próximo passo sugerido:** levar este resumo ao pastor junto com a apresentação já feita. Com o "sim" dele e as respostas às perguntas da seção 6, começo o MVP pelo conteúdo (Conhecer Jesus e Perguntas honestas, para ele aprovar) e pelo consentimento LGPD.

---

## 8. Execução aprovada: seis fases, cada uma publicada antes da próxima

A seção 5 foi a proposta. O que vale para a execução é esta seção, com as decisões do dono: troféus, ofensiva e Semeador intocados; sem "dias na Palavra" no lugar da ofensiva (a medida dos 4 dias por semana aparece só no painel pastoral, agregada).

### 8.1 As fases
Cada fase termina com: bateria de testes verde, capturas conferidas, commit, backup dos dados do Pi, `publicar.ps1`, site HTTP 200 e memória atualizada. Esquema do banco novo só com backup antes (como nos esquemas v5 e v6).

| Fase | Entrega (publicada ao final) | Arquivos principais | Esforço |
|---|---|---|---|
| **0. Base de privacidade** | Consentimento específico e destacado para dado religioso (LGPD, art. 11) no cadastro, e aceite único para as 14 contas que já existem; idade mínima de 12 anos; política de privacidade atualizada (dados sensíveis, menores, o que o líder vê) | `contas.mjs` (`nascimentoValido`, `criar`), `servidor.mjs`, `src/entrar.html`, `src/privacidade.html`, `src/app/07b-conta.js` | 1 a 2 dias |
| **1. Da porta: não crentes** | Convite "para quem está conhecendo Jesus" (modo dentro do token assinado); caminho `conhecer` (14 dias, DBS, trecho por versículo no leitor); Perguntas honestas (cerca de 10 textos no Explorar); "Quero seguir Jesus" com aviso privado a quem convidou e ao líder; cartão "dia X de 14" e folha "Como acompanhar" para quem convidou | `08-amigos.js`, `contas.mjs`, `propositos.mjs` (tipo `conhecer`), `04b-leitor.js` (`vde`/`vate`), novo `src/app/05b-conhecer.js`, `conteudo/conhecer.json`, `ferramentas/ajustes-conteudo.mjs`, `06-explorar.js`, `02-estado.js` (`E.conhecidos`) | 6 a 8 dias |
| **2. À mesa: célula** | Visitante na célula (entra pelo link sem virar membro pleno); registro do encontro em 30 segundos (presença e visitantes, sem conteúdo); roteiro 4 Ws no estudo (acolhida, adoração, Palavra, testemunho) e modo encontro; convite para o encontro pelo WhatsApp; "quem precisa de atenção" no lugar dos percentuais diários do líder; lista diária de oração do líder; auxiliar | `08b-propositos.js`, `contas.mjs` (célula v7), `servidor.mjs`, `notificacoes.mjs` | 6 a 8 dias |
| **3. Discipulado** | Vínculo discipulador e discípulo aceito pelos dois; o discípulo escolhe o que mostrar (nunca textos nem orações); roteiro semanal 1 a 1 (só a data fica guardada); marcos que a própria pessoa registra (decisão, batismo, entrou numa célula, começou a discipular); cadeia de 2 Timóteo 2.2 (só o primeiro nível tem nome) | novo `discipulado.mjs`, `contas.mjs`, `servidor.mjs`, novo `src/app/08c-discipulado.js`, `07-perfil.js` | 5 a 7 dias |
| **4. Cuidado mútuo** | Pedido de oração (para a célula ou só para o líder, validade de 7 ou 30 dias, "orei por você" só com a data, fora do Feed); necessidade prática visível só à célula; denúncia e remoção pelo líder; caminho claro para situações de risco (CVV 188 e o líder); "Minha história com Deus" (guia privado) | `08b-propositos.js`, `servidor.mjs`, `contas.mjs`, `07-perfil.js` | 4 a 5 dias |
| **5. Enviar e multiplicar** | Multiplicação de célula (mãe e filha, a partir do auxiliar); painel pastoral agregado e sem nomes (células, frequência, visitantes, multiplicações, % com 4 ou mais dias na Palavra); cartão de versículo em imagem para status e stories | `07e-painel.js`, `painel.mjs`, `08b-propositos.js`, `04e-versiculos.js` | 4 a 5 dias |

**Conteúdo para não crentes (Fase 1):** eu escrevo, com o critério das reflexões (nada genérico nem especulativo, texto bíblico copiado da NBV). Como cada fase precisa ser publicada, o conteúdo sai no ar ao fim da Fase 1 e vai junto uma página de revisão para o dono e o pastor. Os ajustes que eles pedirem entram como correção imediata. É a mudança em relação à escolha anterior, de aprovar antes de publicar.

### 8.2 Como cada fase é feita: agentes e regras
**Papéis:**
- **Eu (Opus, esforço máximo):** escrevo a especificação da fase, escrevo o conteúdo delicado (o dono pediu que o Opus escreva o conteúdo sensível), reviso todo o diff, rodo a bateria completa, decido o que publicar e publico.
- **Agente de implementação** (tipo `general-purpose`, modelo `sonnet`): escreve o código da fase a partir da especificação, na árvore principal, uma frente por vez para não haver conflito em arquivo. Roda `node build.mjs`, `node teste.mjs` e os testes da fase.
- **Agente de revisão bíblica** (skills `theologian` e `disciple`): revisa o conteúdo das Fases 1, 3 e 4 quanto a fidelidade ao texto, contexto, tom sem jargão e sem especulação.
- **Agente de texto** (skill `copy-editing`): revisa os textos de interface (sem nota de bastidores, sem jargão, frases curtas).
- **Agente de UX e acessibilidade** (skills `ux-heuristics-review` e `accessibility`): revisa as capturas de 320 e 390 px, nos temas claro e escuro, de cada tela nova.
- **Agente de testes de navegador** (`general-purpose`, `sonnet`): escreve o percurso de ponta a ponta da fase no scratchpad, no padrão de `versiculos.mjs` e `celula.mjs`, com toque emulado e cenário criado pela API num servidor local descartável.

**Regras que eu verifico antes de publicar cada fase** (vêm das decisões e das memórias deste projeto):
1. **Nenhuma nota de bastidores nas telas** (regra do dono de 25/09).
2. **Nenhum texto bíblico de memória:** todo trecho é copiado da NBV do app, e as referências são conferidas nas duas Bíblias por teste.
3. **Não gamificar evangelismo, discipulado, oração nem decisão.** Troféus, ofensiva e Semeador ficam como estão, e nada novo de pontos.
4. **O líder e o discipulador nunca veem textos pessoais,** orações nem notas. Dado sensível só com consentimento (Fase 0).
5. **Antes de criar uma classe CSS, dar `grep` no nome** (a lição da `.bolinha`).
6. **Bateria completa verde:** `teste.mjs`, `teste-propositos-regras.mjs`, `teste-celula.mjs`, `teste-convites.mjs`, `contraste.mjs`, `inspecionar.mjs` a 320 e 390 px, `teste-redesenho.mjs`, `teste-escuro-forcado.mjs` e o percurso novo da fase. O `responsivo.mjs` só pode mostrar a falha antiga "a lição não abriu".
7. **Capturas conferidas por mim,** não só pelo agente (relatório de agente se confere contra o código).
8. **Publicação:** backup de `~/geracao-eleita/dados` no Pi, depois `publicar.ps1` (que já recria o túnel), depois HTTP 200 e confirmação da versão dentro do container. Nunca religar o túnel do PC.
9. **Nada no Caminho com Cristo (PRD/HML antigos)** nem no túnel do PC.
10. **Relatório ao dono no fim de cada fase:** o que entrou, capturas, decisões tomadas sozinho e o que ficou pendente.

### 8.3 Pendências que não travam as fases, mas precisam de resposta
Das perguntas da seção 6, as que afetam o código foram resolvidas com o padrão mais seguro, que o dono pode mudar depois:
- **Controlador de dados:** o texto da política diz "mantido por membros da igreja", sem nomear a igreja, até o dono definir.
- **Idade mínima:** 12 anos. Menores de 16 continuam sem conta vinculada aos pais. Isso **precisa de parecer jurídico** pelo ECA Digital e fica registrado no relatório da Fase 0.
- **Batismo:** registrado pela própria pessoa, como marco pessoal. Não aparece para ninguém além de quem ela escolher.
- **Métricas pastorais:** sempre agregadas, sem nomes.
- **Pedidos de oração:** só na célula ou só para o líder, com validade. O líder é o moderador.
