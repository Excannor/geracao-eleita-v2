# Auditoria técnica da Política de Privacidade

Base: o diagnóstico jurídico de 7/10/2026 (seções 1 a 14 da política e os blocos de
visibilidade, check-in, exportação, compartilhamento, segurança, incidentes, retenção, direitos,
consentimento, denúncias, notificações e mudanças), conferido contra o código desta branch.
O relatório jurídico não auditou código ("Limite da conclusão"); este documento faz essa parte.
Ele não é parecer jurídico: diz o que o app faz, onde, e o que dá para corrigir.

Arquivos lidos: `servidor.mjs`, `db.mjs`, `contas.mjs`, `painel.mjs`, `inteligencia.mjs`,
`notificacoes.mjs`, `relatorio.mjs`, `email.mjs`, `cuidado.mjs`, `discipulado.mjs`,
`novidades.mjs`, `propositos.mjs`, `src/app/*.js` (as telas de conta, check-in, exportação,
consentimento e apoio), `src/entrar.html`, `src/privacidade.html`, `src/termos.html`,
`docker-compose.yml`, `Dockerfile`, `README.md`, `docs/inteligencia.md`.

Documentos irmãos: [`matriz-permissoes.md`](matriz-permissoes.md) (quem vê o quê, tirado do
código), [`inventario-dados.md`](inventario-dados.md) (dado, onde mora, finalidade, acesso e
retenção real) e [`plano.md`](plano.md) (fases e perguntas ao dono).

## Legenda

- **Classificação**: *já atende* · *atende parcialmente* · *não atende* · *depende do dono*
  (só o dono pode dar a informação ou tomar a decisão; o código não resolve sozinho).
- **Prioridade** (a do relatório): *crítica* (resolver antes de liberar a função ou ampliar o
  público adolescente) · *alta* · *clareza* (texto).
- **Esforço** estimado para a correção no app: **P** (até meio dia) · **M** (1 a 2 dias) ·
  **G** (3 dias ou mais). Texto e processo levam "texto" ou "processo".

---

## Os 10 achados mais importantes

| # | O relatório pede | O que o código faz hoje | Onde |
|---|---|---|---|
| 1 | Separar consentimentos (acompanhamento nominal, compartilhamento, check-in) e não ligar revogação a exclusão | Um único checkbox no cadastro cobre tudo; o registro é só `{ versao, em }`, sobrescrito a cada aceite; "Retirar o consentimento é apagar a conta" é o único caminho | `src/entrar.html:724-727`, `contas.mjs:452`, `contas.mjs:472`, `contas.mjs:527-533`, `src/app/07b-conta.js:283-286` |
| 2 | Check-in "sem nome" não pode permitir reidentificação | Na célula, o agregado sai a partir de **3** pessoas, com a **contagem exata** por faixa (`n.baixa`) e janela móvel de 7 dias; o relatório exportado repete as contagens. E o **discipulador vê o check-in individual**, ligado por padrão | `inteligencia.mjs:221-240`, `servidor.mjs:843`, `relatorio.mjs:71`, `relatorio.mjs:206`, `discipulado.mjs:35`, `servidor.mjs:1644-1647` |
| 3 | Delimitar quem é "liderança" e o alcance do acesso nominal | **Qualquer conta com cadastro completo (12 anos ou mais) pode criar uma célula** e virar "líder", com painel nominal dos membros (chama, presença, etapa de fé, alertas). Não há aprovação da igreja, nem como destituir ou transferir o líder | `contas.mjs:1086-1097`, `contas.mjs:339-344`, `servidor.mjs:1314-1327` |
| 4 | Acesso administrativo justificado, registrado e revogável | O admin é uma variável de ambiente (`CAMINHO_ADMIN`, com um @ fixo como padrão); abre qualquer célula com nomes e exporta o relatório nominal de **todas** as células, **sem nenhum registro de acesso**. O único rastro é um `console.log` quando gera link de senha | `servidor.mjs:497-498`, `docker-compose.yml:39`, `servidor.mjs:1282-1312`, `servidor.mjs:1241` |
| 5 | Exportação: campos, finalidade, proteção, prazo, descarte | CSV/HTML com uma linha por pessoa: nome, chama, dias seguidos, etapa de fé, presença e "precisa de atenção", de todas as células. Sem marca de confidencialidade, sem registro, sem filtro | `relatorio.mjs:74-84`, `relatorio.mjs:190-213` |
| 6 | Limite global, silêncio noturno, pausa nas notificações | Lembretes automáticos respeitam silêncio (22h30-7h) e teto de 3/dia. **Toques e cutucadas furam o silêncio noturno e o teto** ("decisão do dono, 01/10"), e o **"silenciar toques" não impede o push**: só esconde da lista | `servidor.mjs:631-639`, `notificacoes.mjs:112-119`, `servidor.mjs:1869-1880`, `servidor.mjs:1963-1976`, `contas.mjs:1424-1430` |
| 7 | Adolescentes: aferição, supervisão, padrões protetivos | Só a data de nascimento autodeclarada (bloqueia menor de 12). Nenhuma regra muda para quem tem 12 a 17 anos; adultos e adolescentes viram amigos, discipuladores e líderes uns dos outros sem restrição; a data de nascimento pode ser trocada a qualquer momento pela API | `contas.mjs:123-127`, `contas.mjs:451`, `src/entrar.html:922`, `contas.mjs:490-505`, `servidor.mjs:1329-1338` |
| 8 | Denúncias com identificação do conteúdo, evidência, decisão e recurso; canal para a equipe | Denúncia de pessoa guarda só `de, contra, motivo, em`, sem tela para ninguém tratar e com descarte silencioso acima de 500. Denúncia de pedido (inclusive "Alguém pode estar em perigo") vai **só para o líder da célula**, que pode ser outro adolescente; "manter" apaga as denúncias; o autor não é avisado da remoção | `db.mjs:58`, `contas.mjs:1685-1693`, `servidor.mjs:1762-1777`, `contas.mjs:1660-1672`, `cuidado.mjs:40` |
| 9 | Exclusão "inclusive dos backups" precisa ser comprovada e completa | A exclusão é real e reescreve os 14 backups cifrados. Mas ficam: as denúncias (com o @), o nome da pessoa nos avisos já entregues a outros (sino), o @ em `registrado_por`/`removido_por`/`criado_por`, os logs do Docker, as cópias exportadas; e o SQLite não usa `secure_delete` | `servidor.mjs:2132-2144`, `servidor.mjs:226-232`, `db.mjs:379-425`, `db.mjs:522-549` |
| 10 | Acompanhamento só com consentimento vigente | Quem ainda não aceitou a versão 2 do texto (que introduziu o painel nominal) **já aparece com nome** no painel do líder e no relatório: o servidor não confere `consentiu()` em lugar nenhum fora de `/api/quem` e `/api/amigos` | `contas.mjs:536-539`, `servidor.mjs:818-846`, `servidor.mjs:1287-1293` |

Observações que mudam frases da política (detalhadas abaixo): a TLS termina na Cloudflare (o
"serviço de rede" vê o tráfego em claro); o e-mail sai por SMTP genérico configurado no `.env`
(o código não menciona Resend); os textos privados ficam em JSON aberto no banco (a restrição é
de permissão, não criptográfica); o IP não é gravado em tabela, mas passa pela Cloudflare e pela
memória do servidor.

---

## Seção 1 · Quem somos

- **Relatório**: identificar quem controla os dados, a igreja, o canal de privacidade e quem
  responde por pedidos e incidentes.
- **Código**: nenhuma identidade de controlador no app. O "administrador" é quem estiver em
  `CAMINHO_ADMIN` (`servidor.mjs:497-498`; padrão fixo em `docker-compose.yml:39`). O suporte
  anunciado é `suporte@geracaoeleita.app` (`src/app/07b-conta.js`, folha Privacidade;
  `src/privacidade.html` §11), mas o app responde em outro domínio (`docker-compose.yml:10`,
  `servidor.mjs:352-354` usa `CAMINHO_ENDERECO`). A tela "Apoiar" mostra um favorecido de Pix
  (`src/app/09d-apoiar.js:4-11`), que pode ou não ser o controlador.
- **Classificação**: *depende do dono*.
- **Correção**: texto com nome/papel/contato do controlador e, se houver, do operador e da igreja
  (pendência); confirmar que a caixa `suporte@` existe e é lida; definir se haverá encarregado.
  No app, só trocar o texto. Nada de inventar razão social.
- **Prioridade/esforço**: crítica · texto + processo.

## Seção 2 · Idade mínima

- **Relatório**: descrever o fluxo etário real e as salvaguardas para menores de 18; o que
  acontece com cadastro abaixo da idade; controles dos responsáveis.
- **Código**:
  - Bloqueio de menor de 12 no navegador (`src/entrar.html:922`) e no servidor
    (`contas.mjs:123-127`, `contas.mjs:451`, `contas.mjs:498`). A data é autodeclarada; a recusa
    não é registrada (nada fica guardado de quem foi barrado). Já atende ao "não coletar
    documento".
  - **Nenhuma regra usa a idade depois do cadastro**: não há conta de adolescente, padrão
    protetivo, nem mudança aos 18 (busca por idade em todo o código: só `IDADE_MINIMA`).
  - `POST /api/perfil` (`servidor.mjs:1329-1338` → `contas.mjs:490-505`) troca e-mail e data de
    nascimento a qualquer momento, sem pedir a senha. A tela só aparece para cadastro incompleto
    (`src/app/07b-conta.js:170-200`), mas a rota aceita sempre. A política diz que isso só se faz
    pelo suporte.
  - Contato adulto-adolescente: amizade por @ exato e aceite (`contas.mjs:674-680`,
    `contas.mjs:682-703`); o link de convite vale 30 dias para quantas pessoas o usarem e cria a
    amizade na hora em que é usado (`contas.mjs:801-830`), então um link repassado em grupo liga
    o convidador a quem ele não conhece; discipulado entre quaisquer amigos
    (`contas.mjs:1450-1471`); qualquer um cria célula (`contas.mjs:1086`). Nenhuma dessas regras
    distingue adulto de adolescente.
  - Não existe fluxo para "esta conta é de uma criança" (denúncia não tem esse motivo:
    `contas.mjs:70-75`).
- **Classificação**: *atende parcialmente* (o mínimo de 12 é aplicado) / *não atende* (resto).
- **Correção** (produto): marcar a conta como adolescente pela data (sem novo dado); padrões
  mais protetivos para 12-17 (check-in do discipulador desligado, sem criar célula, toques
  dentro do silêncio, discipulador só com aprovação da liderança ou de responsável, a decidir);
  travar a data de nascimento depois do cadastro (troca só pelo suporte, com registro); exigir
  senha para trocar e-mail; motivo de denúncia "parece ter menos de 12 anos" com bloqueio
  preventivo e revisão; arquitetura pronta para vínculo de responsável (art. 24 do ECA Digital,
  a depender do parecer). Supervisão parental: *depende do dono* e do parecer.
- **Prioridade/esforço**: crítica · M (padrões e travas) + G (vínculo de responsável, se exigido).

## Seção 3 · Dados que coletamos

- **Relatório**: incluir registros técnicos (IP, data/hora, cookies, sessão, logs, eventos de
  consentimento, acessos de líderes); conferir se o nascimento completo é necessário; separar
  senha de resumo; metadados da foto; dados recebidos de terceiros.
- **Código** (detalhe em `inventario-dados.md`):
  - **IP**: não vai para tabela nenhuma. Fica só em memória para limitar tentativas
    (`servidor.mjs:532-561`, `servidor.mjs:1109-1114`), lido do cabeçalho da Cloudflare. Passa
    pela Cloudflare (túnel) e aparece nos logs dela, fora do controle do código.
  - **Cookies**: `cc_sessao` (HttpOnly, SameSite=Lax, 90 dias, assinado) e `cc_logado` (marca
    sem segredo, legível por script) (`servidor.mjs:360`, `servidor.mjs:408-428`). Há também
    `localStorage` e o cache do service worker com o progresso no aparelho.
  - **Logs**: `console.log/error` com @ em falhas de push (`servidor.mjs:611-614`), na geração de
    link de senha pelo painel (`servidor.mjs:1241`) e método+caminho em erros
    (`servidor.mjs:2183`). O Docker guarda isso sem rotação configurada
    (`docker-compose.yml`, sem `logging:`).
  - **Não declarados na política**: fuso horário (`contas.mjs:464`, `servidor.mjs:1340`); origem
    da conta (`contas.mjs:864-870`); quem convidou e quem acompanha (`contas.mjs:810-815`,
    `contas.mjs:854-861`); registro de consentimento (`contas.mjs:472`); pedidos de conversa
    (`contas.mjs:884-889`); presença lançada pelo líder (`contas.mjs:1287-1302`); caixa do sino
    com até 60 avisos (`notificacoes.mjs:392`); histórico de envio de push; check-in guardado
    180 dias (`contas.mjs:346`); cópia das datas de leitura (`db.mjs:214`); desafios pessoais
    ("21 dias sem redes", "sem celular na cama", etc., `painel.mjs:224`); marca-texto, último
    capítulo aberto, datas do "Orei" (`src/app/02-estado.js:12-51`); denúncias.
  - **Foto**: refeita pelo próprio app num canvas JPEG (`src/app/02-estado.js:501`), o que
    descarta EXIF; o servidor só aceita `data:image/...` até 400 KB (`servidor.mjs:158-167`).
    Já atende quanto a metadados.
  - **Senha**: só o resumo scrypt com sal por conta (`contas.mjs:22-24`, `contas.mjs:129-132`).
  - **Nascimento completo**: usado só para o corte de 12 anos (e, se vier, para a regra de
    adolescente). Ano e mês bastariam para o corte com folga de um mês; *depende do dono*.
- **Classificação**: *atende parcialmente*.
- **Correção**: texto (inventário completo, sem inventar o que não existe); produto: rotação de
  logs e tirar @ dos logs de rotina (P); registro de consentimento como evento (ver Seção 12).
- **Prioridade/esforço**: alta · texto + P.

## Seção 4 · Dados sobre a sua fé (sensíveis)

- **Relatório**: renomear para dados sensíveis; separar consentimentos por finalidade; aceite
  genérico não basta; check-in e textos livres podem ter saúde e terceiros.
- **Código**: um único checkbox (`src/entrar.html:724-727`), validado no servidor
  (`contas.mjs:452`). O mesmo texto na folha de reaceite (`src/app/07b-conta.js:219-222`).
  Termos e política são aceitos por uma frase sob o botão, sem marcação própria
  (`src/entrar.html:733`). O texto não fala de check-in, discipulador, convidador, nem de
  exportação para relatório. Os textos livres (`oia`, `anotacoes`, `historia`) e os pedidos de
  oração (até 280 caracteres, `cuidado.mjs:25`) podem conter saúde e dados de terceiros.
- **Classificação**: *não atende* (granularidade) / *atende parcialmente* (destaque: o checkbox é
  visível e obrigatório).
- **Correção** (produto): consentimentos separados, cada um com texto, versão e evento próprio:
  (a) guardar dados de fé para o serviço funcionar; (b) acompanhamento nominal pela liderança
  da célula; (c) check-in (e, separado, mostrar ao discipulador); (d) marcos no Juntos (já é
  interruptor). Recusa de (b) ou (c) não impede usar o app. Texto: seção "Dados pessoais
  sensíveis" e aviso de "não escreva dados de outras pessoas" no campo de pedido.
- **Prioridade/esforço**: crítica · G (2 a 4 dias com telas e testes).

## Seção 5 · Como usamos

- **Relatório**: finalidade e base legal por grupo de dados; critérios reais dos alertas, erros
  possíveis, revisão; não imputar ao check-in o que ele não faz.
- **Código**: os alertas ("precisam de atenção") usam só: falta no último ou nos dois últimos
  encontros, 5+ dias sem ler e perda recente de ofensiva de 7+ dias, até 5 pessoas além de quem
  faltou (`propositos.mjs:126-155`, `inteligencia.mjs:107-179`). **Confirmado: o check-in não
  entra nos alertas** (`docs/inteligencia.md` §6). É indicador descritivo para uma pessoa
  agir; não há decisão automática com efeito sobre o titular.
- **Classificação**: *atende parcialmente* (o comportamento é limitado; o texto não o explica).
- **Correção**: texto com os critérios exatos, que podem errar (presença não lançada, leitura
  fora do app) e que é o líder quem decide o que fazer. Base legal por finalidade: *depende do
  dono* e do parecer.
- **Prioridade/esforço**: alta · texto.

## Resumo inicial ("Em poucas palavras")

- **Código**: "Usamos seus dados só para o app funcionar" convive com o painel nominal e o
  relatório exportado (`servidor.mjs:1282-1327`). "Não há ferramentas de rastreamento": verdade
  quanto a analytics e anúncios (CSP fecha `connect-src` em `'self'`, `servidor.mjs:121-134`,
  sem scripts de terceiros), mas há o registro diário de acesso (`contas.mjs:873-880`) e o
  diário de uso que alimenta o painel do dono (`painel.mjs:168-197`).
- **Classificação**: *não atende* (texto).
- **Correção**: "não há rastreamento publicitário nem de terceiros"; listar as finalidades de
  acompanhamento e relatório.
- **Prioridade/esforço**: crítica (é o que todo mundo lê) · texto.

## Seções 6 e 7 · Quem vê o quê

- **Relatório**: matriz com todos os perfis, campos, condições e duração; distinguir oração
  privada de pedido compartilhado; "não exibido" de "inacessível à equipe".
- **Código**: a matriz real está em `matriz-permissoes.md`. Divergências com a política:
  - membros da mesma célula ou propósito (inclusive **visitante**) veem nome, foto, `@` e "leu
    hoje" de todos (`servidor.mjs:717-723`), e no desafio de grupo veem o progresso de cada um
    (`servidor.mjs:1903-1929`). A tabela não tem essa coluna;
  - o discipulador vê o **check-in individual** (padrão ligado) além de passos e semana
    (`servidor.mjs:1630-1647`, `discipulado.mjs:35`); a tabela diz "check-in: só somado";
  - o convidador do Conhecer Jesus vê o dia em que a pessoa está e a data do "quero conversar"
    (`servidor.mjs:1433-1446`);
  - quem conduz vê, de pedidos denunciados, o texto, o autor e os motivos
    (`servidor.mjs:1724-1729`);
  - público sem conta: o link de célula mostra o nome de quem convidou, o nome da célula e
    quantas pessoas há (`servidor.mjs:1033-1038`); o de convite mostra nome e @
    (`servidor.mjs:1022-1029`);
  - o admin pode **gerar link de nova senha de qualquer conta** (`servidor.mjs:1234-1242`), o que
    dá acesso técnico a tudo o que a pessoa escreveu;
  - quem mantém o servidor lê o banco inteiro, incluindo os textos em JSON aberto na tabela
    `estados` (`db.mjs:70`, `servidor.mjs:1363-1386`). A restrição é de interface e permissão,
    não criptográfica (os backups, sim, são cifrados: `db.mjs:452-457`).
- **Classificação**: *não atende* (a tabela da política está incompleta e em um ponto errada).
- **Correção**: reconstruir a tabela a partir de `matriz-permissoes.md`; produto: limitar o
  link de senha do admin (ver Segurança) e registrar seu uso.
- **Prioridade/esforço**: crítica · texto + P.

## Acesso nominal da liderança

- **Relatório**: agregado como padrão do admin; acesso individual só com função justificada;
  registrar consultas; revogar quem sai da função; testar separação entre células e igrejas.
- **Código**:
  - Separação entre células: correta. `GET /api/painel/celula` só para quem conduz ou admin
    (`servidor.mjs:1314-1327`); o retrato só leva `painel`/`atencao` para quem conduz
    (`servidor.mjs:774`); há teste (`docs/inteligencia.md` §5 item 1). Separação entre igrejas:
    **não existe o conceito de igreja** no banco; uma instalação = um conjunto de contas.
  - Quem é líder: quem criou a célula (`contas.mjs:1086-1097`, `contas.mjs:339-344`). Não há
    aprovação, cadastro de liderança, nem como o admin destituir ou transferir o líder.
  - Revogação: auxiliar perde o papel na hora em que sai ou é desmarcado (`podeConduzir` é
    calculado a cada pedido). O líder que sai da célula continua `criadoPor`: perde o painel
    (exige membro ativo, `servidor.mjs:1318`), mas `celulaDoLider` e `celulaDeQuemConduz` não
    conferem se ele ainda é membro ativo (`contas.mjs:1178-1196`), então ainda registra
    presença, remove gente e marca auxiliar.
  - Admin: abre qualquer célula com nomes (`servidor.mjs:1317-1320`), sem registro.
- **Classificação**: *não atende* (padrão nominal, sem trilha, sem governança de quem é líder).
- **Correção** (produto): papel de líder concedido pela liderança (admin aprova a célula ou o
  líder); destituir/transferir; conferir membro ativo em `celulaDoLider`; trilha de acesso
  (quem abriu qual painel, quando); admin vê agregado e abre célula nominal só registrando
  motivo. Política de quem pode ser líder (idade, função na igreja): *depende do dono*.
- **Prioridade/esforço**: crítica · M (trilha + motivo + checagem) + M (aprovação de liderança).

## Check-in sem nome

- **Relatório**: "somado, sem nome" não é anonimização; suprimir grupos pequenos, reduzir
  detalhe temporal, impedir reidentificação por comparação.
- **Código**:
  - Igreja: mínimo 5 pessoas (`painel.mjs:10`, `inteligencia.mjs:224-231`). Célula: mínimo **3**
    (`inteligencia.mjs:221`, `servidor.mjs:843`).
  - Sai a porcentagem **e a contagem exata** por faixa (`inteligencia.mjs:235-237`); o `base`
    (quantos fizeram) sai mesmo abaixo do mínimo (`inteligencia.mjs:231`).
  - Janela móvel de 7 dias com o último check-in de cada um (`inteligencia.mjs:214`,
    `servidor.mjs:843`): abrir o painel em dias seguidos mostra a variação de 1 pessoa.
  - O líder sabe quem está na célula e quem acabou de entrar; com 3 a 5 pessoas e a contagem
    exata, "1 de 3 com a mente em baixa" é praticamente um nome.
  - O relatório exportado leva as contagens por célula (`relatorio.mjs:71`, `relatorio.mjs:206`).
  - O discipulador vê o check-in individual, ligado por padrão (`discipulado.mjs:35-39`); a tela
    avisa ("vê só isto", `src/app/08c-discipulado.js:86-89`), mas o padrão é opt-out para dado
    de saúde.
- **Classificação**: *não atende*.
- **Correção** (produto): célula com mínimo maior (sugestão: 5 que responderam), só faixas
  arredondadas sem `n`, suprimir a esfera quando alguma faixa tiver menos de 2 pessoas, janela
  semanal fechada (segunda a domingo) em vez de móvel, `base` só como "poucos" abaixo do mínimo;
  tirar contagens do relatório; check-in ao discipulador desligado por padrão e com
  consentimento próprio. Avaliar tirar o check-in da célula até haver parecer.
- **Prioridade/esforço**: crítica · P (limiares e campos) + P (padrão do discipulador).

## Exportação

- **Relatório**: campos autorizados, responsáveis, finalidade, proteção, prazo e descarte; a
  exclusão deve alcançar fluxos com a igreja sem prometer apagar cópia remota.
- **Código**: `GET /api/painel/relatorio?formato=csv|html` (`servidor.mjs:1282-1312`), só admin.
  Conteúdo: painel da igreja + para cada célula ativa, nomes por chama, presença por encontro,
  funil com nomes, atenção com motivos, check-in com contagens (`relatorio.mjs:34-84`,
  `relatorio.mjs:190-213`). Bloco "Pessoas" tem uma linha por pessoa (`relatorio.mjs:74-84`).
  Sem registro de quem exportou, sem marca d'água, sem prazo de descarte.
- **Classificação**: *não atende*.
- **Correção** (produto): relatório padrão só agregado (sem bloco "Pessoas" nem nomes);
  nominal por célula, opcional, com motivo e registro; rodapé com "gerado por @x em data,
  confidencial, descartar em N dias" (N *depende do dono*). Processo: quem recebe, onde guarda,
  quando apaga.
- **Prioridade/esforço**: crítica · P a M.

## Seção 8 · Compartilhamento e fornecedores

- **Relatório**: transparência do destinatário real (igreja); inventário de fornecedores e
  países; Resend; validar a promessa de aviso criptografado.
- **Código / infraestrutura**:
  - **Hospedagem**: um Raspberry Pi com Docker (`README.md:24-28`), dados em `./dados`
    (`docker-compose.yml:30-34`). Local físico e responsável: *depende do dono*.
  - **Rede**: túnel da Cloudflare (`docker-compose.yml:50-76`, imagem `cloudflare/cloudflared:latest`).
    O HTTPS termina na Cloudflare: o tráfego chega ao container em HTTP (`servidor.mjs:144`
    decide HSTS por `x-forwarded-proto`). Ou seja, a Cloudflare processa em claro tudo o que
    passa, incluindo senhas e textos, e vê o IP. É fornecedor com transferência internacional.
  - **E-mail**: SMTP genérico (`email.mjs:1-24`), ligado só se `CAMINHO_SMTP_HOST` estiver no
    `.env` (`docker-compose.yml:40-45`). O código não cita Resend; o exemplo é Gmail. Sem SMTP,
    o pedido de senha vai para o painel do dono, que manda o link "à mão" (`servidor.mjs:494-496`,
    `servidor.mjs:1121-1135`): o canal desse envio não está descrito.
  - **Push**: Google (FCM), Apple, Mozilla e Microsoft (`notificacoes.mjs:70-71`). O conteúdo
    vai cifrado de ponta a ponta entre servidor e navegador (RFC 8291, `notificacoes.mjs:1-6`,
    `notificacoes.mjs:89-108`); o serviço de push vê metadados (endpoint, hora, tamanho, IP do
    aparelho), não o texto. A frase da política está certa quanto ao conteúdo; deve dizer que
    metadados passam.
  - **Sem** analytics, fontes ou scripts de terceiros (CSP, `servidor.mjs:121-134`).
  - Igreja: o relatório exportado sai do app para "a liderança da igreja" (política §5); se a
    igreja é outro agente, isso é compartilhamento: *depende do dono*.
- **Classificação**: *atende parcialmente* (poucos fornecedores, nenhum de publicidade) / *depende
  do dono* (quem é o provedor de e-mail, países, contratos).
- **Correção**: texto com a lista real (Cloudflare, provedor de SMTP efetivo, serviços de push,
  hospedagem própria) e o papel da igreja; fixar a versão da imagem do `cloudflared` (P).
- **Prioridade/esforço**: alta · texto + P.

## Seção 9 · Segurança

- **Relatório**: sem garantias categóricas; conferir autenticação administrativa, segregação,
  backups, sessões, permissões, logs de acesso, arquivos exportados.
- **Código** (o que existe):
  - scrypt N=16384 com sal (`contas.mjs:22-24`), comparação em tempo constante
    (`contas.mjs:136-141`), mínimo de 8 caracteres (`contas.mjs:28`).
  - Sessão assinada HMAC, 90 dias, HttpOnly + SameSite=Lax + Secure atrás de HTTPS
    (`servidor.mjs:360-438`); trocar senha ou "sair dos outros aparelhos" invalida as demais
    (`contas.mjs:542-550`, `servidor.mjs:2071-2078`).
  - Limite de tentativas por IP e por conta (`servidor.mjs:528-561`), CSRF por origem
    (`servidor.mjs:150-156`), CSP restrita e cabeçalhos (`servidor.mjs:121-147`), servidor sem
    root (`Dockerfile:20-23`), backups AES-256-GCM (`db.mjs:428-470`).
- **Lacunas**:
  - admin sem segundo fator e definido por variável; pode gerar link de senha de qualquer conta
    (`servidor.mjs:1234-1242`), registrado só no log do container;
  - `/api/perfil` troca e-mail sem senha (`contas.mjs:490-505`): quem roubar a sessão troca o
    e-mail e depois a senha;
  - nenhuma trilha de acesso administrativo nem de exportação;
  - textos privados em JSON aberto no banco (restrição só de permissão);
  - logs sem rotação; `cloudflared:latest` sem versão fixa;
  - chave do backup no `.env` ou em `dados/backup.chave` (`db.mjs:440-449`): se ficar na pasta de
    dados, o backup cifrado não protege contra quem leva a pasta inteira.
- **Classificação**: *atende parcialmente*.
- **Correção**: texto sem "não é possível" absoluto; produto: senha para trocar e-mail (P),
  trilha de acesso (M), link de senha pelo admin só com motivo e registro e aviso por e-mail ao
  titular (P), rotação de logs (P), versão fixa do `cloudflared` (P). 2FA do admin (M) fica como
  recomendação.
- **Prioridade/esforço**: alta · P a M.

## Incidentes de segurança

- **Relatório**: compromisso de resposta e comunicação; fluxo interno conforme a Resolução ANPD
  nº 15/2024.
- **Código**: nada (sem plano, sem contato, sem registro de incidentes).
- **Classificação**: *não atende* / *depende do dono* (responsáveis).
- **Correção**: processo (ver `plano.md`, fase 3) e um parágrafo na política.
- **Prioridade/esforço**: alta · processo + texto.

## Seção 10 · Guarda e exclusão

- **Relatório**: retenção por categoria; marco que "deixa de aparecer" é apagado ou ocultado;
  provar a exclusão em backup; impedir retorno após restauração; cópias exportadas; não trocar a
  promessa absoluta por exceção ilimitada.
- **Código** (detalhe em `inventario-dados.md`):
  - Exclusão: `POST /api/apagar-conta` pede senha e apaga conta, amizades, propósitos de dupla,
    discipulados, pedidos, check-ins, desafios, notificações, mural, progresso, `leitura_dias`,
    **e a pessoa de cada backup cifrado**, reescrevendo-os (`servidor.mjs:2132-2144`,
    `servidor.mjs:226-232`, `db.mjs:379-425`, `db.mjs:522-549`), e dos JSON legados
    (`servidor.mjs:236-301`). Há teste (`/api/teste/backup`, `servidor.mjs:1010-1013`).
  - Como todos os backups são limpos, restaurar um deles não traz a pessoa de volta. Cópias
    feitas fora da pasta `backup` (por exemplo um `restaurado.db` gerado com
    `ferramentas/backup.mjs`) não são limpas.
  - **Fica depois da exclusão**: denúncias de/contra a pessoa (`db.mjs:377-378`,
    `contas.mjs:595-645` não as toca); avisos no sino de outras pessoas com o nome dela
    (`push_caixa`, até 60 por pessoa); `registrado_por` de encontros, `removido_por` de pedidos,
    `criado_por` de grupos e células que continuam; `convidadoPor`/`acompanhadoPor` em contas de
    terceiros; logs do Docker; logs da Cloudflare; relatórios exportados.
  - SQLite sem `PRAGMA secure_delete` (`db.mjs:256`): páginas apagadas podem ficar no arquivo
    até serem reaproveitadas. Os backups (`VACUUM INTO`) saem compactados.
  - "Marcos no Juntos deixam de aparecer em 30 dias": são **apagados** na limpeza do mural
    (`novidades.mjs:11`, `novidades.mjs:78-88`), não só ocultados.
  - Retenções reais: acessos 90 dias (`contas.mjs:873-880`); check-in 180 dias
    (`contas.mjs:346`, `contas.mjs:564`); pedidos apagados 30 dias depois de vencer
    (`cuidado.mjs:46`, `contas.mjs:1674-1683`); pedido de senha 7 dias (`servidor.mjs:514-519`);
    denúncia de pessoa: indefinido, até as 500 mais novas (`contas.mjs:1691`); backups 14
    (`servidor.mjs:2220`); o resto, enquanto a conta existir.
- **Classificação**: *atende parcialmente* (a exclusão de backup é real; a promessa "todas as
  cópias" não cobre o que fica listado acima).
- **Correção**: produto (P a M): tirar o nome dos avisos de terceiros, trocar @ por marcador em
  `registrado_por`/`removido_por`, decidir a regra das denúncias (manter pseudonimizado por prazo
  definido, em vez de "para sempre" ou "até 500"), `secure_delete`, rotação de logs. Texto: prazo
  real por categoria e as exceções com prazo. Prazo das denúncias e das evidências do art. 27 do
  ECA Digital: *depende do dono* e do parecer.
- **Prioridade/esforço**: crítica · M.

## Seção 11 · Seus controles (direitos do titular)

- **Relatório**: acesso, confirmação, correção, portabilidade, informação sobre
  compartilhamento, revogação, oposição; canal verificável e gratuito.
- **Código**:
  - "Baixar o que escrevi" gera um Markdown só com progresso, registros e anotações
    (`src/app/02-estado.js:571-616`); não leva dados de conta, marcos, check-ins, amizades,
    células, presenças, consentimento, nem a "Minha história com Deus" (não aparece no
    `montarExportacao`). Roda no aparelho, a partir do estado local.
  - Corrigir: nome e foto no app; e-mail e nascimento pela política só via suporte (mas a API
    aceita, ver Seção 2).
  - Não há canal de pedido no app (só o `mailto:`), nem registro de pedidos.
- **Classificação**: *atende parcialmente*.
- **Correção**: exportação completa em JSON pelo servidor ("Baixar meus dados", M); tela "Meus
  dados" listando quem vê o quê com base nas relações reais da pessoa (M); processo de pedidos
  (fase 3).
- **Prioridade/esforço**: alta · M.

## Seção 12 · Como retirar o consentimento

- **Relatório**: retirar autorização de check-in ou compartilhamento não deve apagar a conta.
- **Código**: único caminho é apagar (`src/app/07b-conta.js:283-286`; recusa na folha de
  reaceite também leva a apagar, `src/app/07b-conta.js:258-266`). Mas já existem interruptores que
  são revogações de fato: marcos no Juntos (`novidades.mjs:90`), o que o discípulo mostra
  (`contas.mjs:1504-1512`), sair da célula (`contas.mjs:1368-1380`), encerrar discipulado. O
  registro de consentimento é sobrescrito (`contas.mjs:527-533`), sem histórico nem revogação.
- **Classificação**: *não atende*.
- **Correção**: consentimentos separados e revogáveis (ver Seção 4), com evento de aceite e de
  revogação (data, versão, texto); revogar acompanhamento nominal tira a pessoa do painel e do
  relatório; revogar check-in apaga os check-ins guardados e esconde o botão.
- **Prioridade/esforço**: crítica · G (junto com a Seção 4).

## Seção 13 · Amizades, toques e denúncias

- **Relatório**: avaliar contato adulto-adolescente; denúncia com identificador, evidência,
  decisão e recurso; separar denúncia, bloqueio e notificação formal; não prometer silêncio
  absoluto quando a lei exige comunicar o autor; risco de pressão por sequência e toques.
- **Código**:
  - Bloqueio: silencioso, desfaz amizade, duplas e grupos em comum (`contas.mjs:725-738`).
  - Denúncia de pessoa: 4 motivos (`contas.mjs:70-75`), guarda `de, contra, motivo, em`
    (`db.mjs:58`, `contas.mjs:1685-1693`); nenhum identificador de conteúdo, evidência, decisão,
    recurso; nenhuma tela para tratar; descarte acima de 500.
  - Denúncia de pedido: 3 motivos (`cuidado.mjs:37`); 2 denúncias escondem o pedido
    (`cuidado.mjs:44`); "Alguém pode estar em perigo" avisa **só líder e auxiliares**
    (`servidor.mjs:1766-1778`); quem conduz decide "manter" (apaga as denúncias) ou "tirar"
    (guarda `removido_por`), sem motivo, sem aviso ao autor, sem recurso
    (`contas.mjs:1660-1672`); tudo some 30 dias depois do vencimento (`cuidado.mjs:46`).
  - O painel do dono só mostra a contagem de pedidos com denúncia (`painel.mjs:110`).
  - Toques: 1 por amigo por dia, até 5 enviados por dia (`contas.mjs:1404-1420`). **Recebidos sem
    teto**, fora do silêncio noturno (`servidor.mjs:631-639`); `MAX_TOQUES_RECEBIDOS_DIA = 3` é
    importado mas não usado para toques. Cutucadas (café, oração, treino): 1 por tema por amigo
    por dia, contado só em memória (`servidor.mjs:1963-1976`): até 3 por amigo por dia, sem
    teto global.
  - "Silenciar toques" só filtra a lista (`contas.mjs:1424-1430`); o push e o sino continuam
    (`servidor.mjs:619-651`, nenhuma checagem de `silenciou`). **A política promete o contrário.**
  - Gamificação: ofensiva, chama, escudo, "ofensiva em risco" às 21h, avisos de volta que nunca
    param (a cada 30 dias depois de 90, `notificacoes.mjs:120-126`), meta de grupo que cobra
    quem não leu depois das 18h (`servidor.mjs:956-971`). Há opções de desligar lembrete,
    ofensiva e avisos de amigos (`notificacoes.mjs:130`), não há pausa geral.
- **Classificação**: *não atende* (denúncias, silenciar, toques sem teto) / *atende parcialmente*
  (bloqueio, aceite de amizade).
- **Correção** (produto): denúncia com id do conteúdo, cópia da evidência, estado, decisão,
  decisor, data, aviso ao autor e recurso; "perigo" também para a equipe responsável (não só o
  líder); fila de denúncias no painel do admin; respeitar silenciados e bloqueados no push;
  toques e cutucadas dentro do silêncio noturno e com teto diário recebido (3, que já existe);
  "pausar notificações" por X dias; avisos de volta param depois de N tentativas. Quem forma a
  equipe que analisa: *depende do dono*.
- **Prioridade/esforço**: crítica · P (silenciar, teto, silêncio) + M (denúncias completas).

## Seção 14 · Mudanças nesta política

- **Relatório**: aviso acessível, histórico de versões, comunicação prévia; novo consentimento
  antes do novo tratamento.
- **Código**: só a data no topo (`src/privacidade.html`). O consentimento tem versão
  (`contas.mjs:69`) e o app pede de novo quando ela sobe (`src/app/10-roteador.js:672`), mas
  **o servidor não espera o novo "sim"**: o painel nominal já inclui quem não aceitou
  (achado 10).
- **Classificação**: *atende parcialmente*.
- **Correção**: versão da política no rodapé e aviso no app quando mudar; página de histórico;
  gate no servidor por consentimento vigente (P).
- **Prioridade/esforço**: alta · P + texto.

## Contatos de ajuda (CVV, Disque 100, emergência)

- **Código**: só texto na política e nos termos; não há monitoramento contínuo.
- **Classificação**: *já atende* (preservar); falta dizer que o suporte não é atendimento de
  emergência nem clínico.
- **Prioridade/esforço**: clareza · texto.

## Demonstrações pedidas pelo relatório ("Condições para concluir")

| Situação | Comportamento atual no código |
|---|---|
| Criança cadastrada indevidamente | Não detectável; nenhum motivo de denúncia para isso; nenhum fluxo de bloqueio ou exclusão pela equipe. |
| Troca de célula | Sair (`contas.mjs:1368`) apaga os pedidos da pessoa naquela célula; a presença antiga continua na célula antiga, visível ao líder dela nas 4 semanas da janela. |
| Saída da igreja | Não existe "igreja"; equivale a sair da célula ou apagar a conta. |
| Destituição de líder | Não existe. Auxiliar perde o papel na hora. O líder que sai mantém ações de líder (`contas.mjs:1178-1184`). |
| Alteração de idade | Possível pela API a qualquer momento, sem senha e sem registro (`contas.mjs:490-505`). |
| Passagem à maioridade | Nada muda (não há regra por idade). |
| Exclusão e restauração de backup | Exclusão reescreve os 14 backups; restaurar não traz a pessoa de volta. Há teste automatizado; falta evidência registrada em produção. |
| Registro de consentimento | `{ versao, em }` na conta; sem histórico, sem texto, sem revogação. |
| Trilha de acesso administrativo | Não existe. |
| Resposta a incidentes / pedidos do titular | Não existe processo. |
