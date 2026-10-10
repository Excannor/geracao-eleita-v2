# Plano de adequação

Três fases. A fase 1 é só código e não depende de informação do dono; a fase 2 é o texto da
política, que já pode ser escrito com as pendências marcadas; a fase 3 são processos, que
dependem de quem vai responder por eles. No fim, as perguntas que o dono precisa responder
(as "Condições para concluir a revisão" do relatório, em forma de perguntas objetivas).

Fundamento técnico de cada item: [`auditoria.md`](auditoria.md). Esforço: **P** até meio dia,
**M** 1 a 2 dias, **G** 3 dias ou mais (com testes).

Recomendação do próprio relatório, que este plano segue: se o app já está em uso, **corrigir já
as três exposições** (exportação nominal ampla, check-in agregado reidentificável e
compartilhamento de adolescentes sem salvaguarda), sem esperar a reformulação completa. Por isso
os itens 1.1 a 1.4 vêm primeiro e são pequenos.

---

## Andamento (09/10/2026)

Feito nesta rodada (branch `ag-conta`), com as respostas do dono de 09/10 (abaixo, em
"Respostas do dono"):

| Item | O que foi feito | Onde | Falta |
|---|---|---|---|
| 1.9 / 1.12 (parte) | **Data de nascimento travada** depois do cadastro: o servidor recusa qualquer troca (nem com senha); nas Configurações aparece só para leitura com "Para corrigir, fale com o suporte". **Trocar e-mail pede a senha atual** (com o limite de tentativas do login) e ganhou a folha "Trocar o e-mail". | `contas.mjs` (`completarPerfil`, `trocaEmail`, `NASCIMENTO_TRAVADO`), `servidor.mjs` (`/api/perfil`), `src/app/07b-conta.js`; testes em `teste.mjs` e `ferramentas/teste-idade.mjs` | registrar a correção feita pelo suporte (hoje é edição manual no banco) |
| 1.8 / 1.9 (parte) | **Menor de 18 só lidera ou auxilia célula com aprovação** do administrador (`CAMINHO_ADMIN`): célula criada, auxiliar marcado ou líder de célula multiplicada com menos de 18 fica "aguardando aprovação"; enquanto isso não conduz (sem painel nominal, atenção, presença, pedidos reservados, avisos de "quero conversar"), e a célula não gera link nem chama amigos. Células antigas de menores passam a aguardar ao abrir o banco. Painel do admin: "Liderança aguardando aprovação" com Aprovar/Recusar (recusar o líder encerra a célula; o auxiliar só perde o papel). Tabela `liderancas` (esquema v16) guarda quem decidiu e quando; sai com a conta e dos backups. Aviso ao menor: "Sua célula está aguardando aprovação da liderança". | `contas.mjs` (`menorDeIdade`, `aprovacaoQueFalta`, `aguardandoAprovacao`, `podeConduzir`, `decidirLideranca`, `liderancasPendentes`, `pedirAprovacoesQueFaltam`), `db.mjs` (v16), `servidor.mjs` (`/api/painel/liderancas`), `src/app/08b-propositos.js`, `src/app/07e-painel.js`; testes em `teste.mjs` e `ferramentas/teste-idade.mjs` | aprovação de líder adulto (o dono respondeu só sobre menores); destituir/transferir líder; `celulaDoLider` exigir membro ativo; aviso por push quando a decisão sai |
| Fase 2 | **Política reescrita (versão 3)** a partir do código e desta auditoria: dados sensíveis, finalidade por grupo de dados, matriz de quem vê o quê (amigo, membro, quem conduz, discipulador, convidador, admin, equipe técnica, público), Cloudflare (TLS termina nela), e-mail pela Hostinger, push com metadados, textos criptografados em repouso, IP não gravado, retenções reais, backups e o que fica depois da exclusão, direitos e canal, 12 a 17 anos, incidentes, denúncias como são hoje, mudanças e histórico. Termos ajustados onde contradiziam. | `src/privacidade.html`, `src/termos.html`, `src/estilo-v2/26-avulsas.css` | itens marcados como pendência abaixo |
| 1.15 (parte) | Versão e data no topo da política, seção "Histórico"; **consentimento sobe para a versão 3** (o texto passa a citar check-in e Discipulado). Quem já tinha conta vê a folha "Antes de continuar" de novo (fluxo que já existia, `10-roteador.js`); `teste-idade.mjs` confere pela API que a versão anterior volta a pedir o "sim" e que o "Concordo" grava a nova. | `contas.mjs` (`CONSENTIMENTO_VERSAO = 3`), `src/entrar.html`, `src/app/07b-conta.js` | aviso no app quando só o texto muda sem novo consentimento; gate do servidor por consentimento vigente (1.4) |

Feito em paralelo por outra frente (descrito na política, não nesta branch): anotações e textos
privados criptografados no servidor (proteção em repouso, chave do servidor) e "Zerar progresso"
que recomeça só a trilha, mantendo foto e anotações. **Conferir antes de publicar a política**
que a lista de campos cifrados é a mesma que a política cita (reflexões, orações, anotações,
notas de versículo e "Minha história com Deus").

### Pendências que ainda dependem do dono

1. **Controlador e igreja**: "não tem ainda". A política diz que o projeto está em
   desenvolvimento e que a identificação sai antes do lançamento. Antes de lançar: nome e papel do
   controlador (pessoa física, grupo ou igreja), igreja parceira e acordo entre os dois, e se haverá
   encarregado.
2. **E-mail**: o domínio usa a **Hostinger** (MX `mx1/mx2.hostinger.com`, SPF
   `include:_spf.mail.hostinger.com`; DNS na Cloudflare), e o dono confirmou que o provedor é o
   mesmo que vendeu o domínio. Falta confirmar que o SMTP do `.env` de produção é o da Hostinger,
   o país dos servidores de e-mail e os termos aceitos.
3. **Hospedagem**: onde fica o servidor (o Pi), quem tem acesso físico e por SSH, onde ficam a
   cópia da chave dos backups e eventuais cópias fora do Pi (a política diz só "servidor próprio do
   projeto").
4. **Transferência internacional** (Cloudflare e Hostinger): mecanismo do art. 33 a validar no
   parecer.
5. **Base legal por finalidade**: a política usa consentimento para os dados sensíveis; as demais
   bases (execução do serviço, legítimo interesse para segurança) ficam para o parecer.
6. **Prazo de resposta ao titular**: a política promete até 15 dias; confirmar quem responde o
   `suporte@` e como se registra o pedido.
7. **Denúncias de pessoa**: prazo de guarda (hoje sem prazo, as 500 mais recentes, e ficam depois
   da exclusão), quem analisa, aviso ao autor quando um pedido é tirado (item 1.10).
8. **Logs do servidor**: prazo de rotação (hoje sem rotação; a política diz que podem conter o @).
9. **Relatório exportado**: hoje ninguém recebe (app em desenvolvimento). Se passar a ser enviado,
   definir quem recebe, para quê, onde fica e quando é apagado, e atualizar a política antes.
10. **Toques e cutucadas**: a política descreve o comportamento atual (chegam à noite, silenciar
    não para o push). A pergunta 25 continua aberta; quando o item 1.5 entrar, ajustar a seção 14.
11. **Retirar consentimento sem apagar a conta** (item 1.7) e **"Baixar meus dados" completo**
    (1.13): a política descreve o que existe hoje (retirar partes pelos interruptores; o
    consentimento inteiro só apagando a conta; cópia completa pelo suporte).

---

## Fase 1 · Correções no app que não dependem do dono

### Primeiro bloco: conter as exposições (cerca de 2 dias)

| # | Correção | Resolve | Esforço |
|---|---|---|---|
| 1.1 | **Relatório exportado só agregado por padrão**: tirar o bloco "Pessoas", os nomes da chama, do funil, da presença e da atenção, e as contagens de check-in. Versão nominal por célula, opcional, com motivo obrigatório, registro (1.6) e rodapé "gerado por @x em data · confidencial · descartar em N dias" (N configurável, padrão a definir pelo dono). | Exportação | P |
| 1.2 | **Check-in agregado mais protegido**: mínimo de 5 respostas na célula (hoje 3), só faixas em % arredondadas a 10 sem `n`, esfera suprimida se alguma faixa tiver 1 pessoa, `base` como "poucos" abaixo do mínimo, janela semanal fechada (segunda a domingo) no lugar da janela móvel; igreja com mínimo 10. Testes para "1 pessoa muda e o painel não denuncia". | Check-in | P |
| 1.3 | **Check-in ao discipulador desligado por padrão** (`MOSTRAR_PADRAO.checkin = false`) para vínculos novos e migração que desliga nos antigos até o discípulo ligar de novo, com o texto do que o discipulador vê. | Check-in, adolescentes | P |
| 1.4 | **Gate de consentimento no servidor**: quem não tem o consentimento vigente (`consentiu()`) não aparece com nome no painel da célula nem no relatório (entra só nas contagens, ou fica fora). | Consentimento, mudanças | P |
| 1.5 | **Notificações**: (a) respeitar `silenciados` e bloqueios no push e no sino de toques e cutucadas (hoje a política promete e o código não faz); (b) toques e cutucadas dentro do silêncio noturno (22h30-7h, o mesmo dos lembretes); (c) teto de toques recebidos por dia (3, constante que já existe) e agregação ("3 amigos te chamaram"); (d) limite global de avisos sociais por dia (sugestão: 6); (e) "Pausar avisos" por 1, 3 ou 7 dias; (f) avisos de "volta" param depois de 90 dias sem abrir. | Notificações/gamificação | M |

### Segundo bloco: governança de acesso e consentimento (cerca de 1 semana)

| # | Correção | Resolve | Esforço |
|---|---|---|---|
| 1.6 | **Trilha de acesso administrativo**: tabela `auditoria (quem, acao, alvo, motivo, em)` para abrir painel de célula como admin, exportar relatório, gerar link de senha, ver pedidos de senha, decidir pedido denunciado, registrar presença. Leitura pelo admin no painel; retenção configurável (padrão proposto 12 meses, a confirmar). Abrir célula de outro líder exige motivo. | Acesso nominal, segurança | M |
| 1.7 | **Consentimentos separados e revogáveis**, cada um com texto, versão e evento: (a) guardar dados de fé para o serviço (essencial); (b) acompanhamento nominal pela liderança da célula; (c) check-in (guardar e somar); (d) check-in visível ao discipulador; (e) marcos no Juntos (já existe). Tabela `consentimentos (usuario, finalidade, versao, texto_hash, aceito, em, origem)` só de inserção (histórico). Revogar (b) tira a pessoa do painel nominal e do relatório; revogar (c) apaga os check-ins e esconde o botão; nenhuma revogação apaga a conta. Tela "Privacidade" com os interruptores. Cadastro com (a) obrigatório e (b)-(d) opcionais, sem pré-marcação. | Seções 4 e 12 | G |
| 1.8 | *(parte feita em 09/10: menor de 18 aguarda aprovação; ver Andamento)* **Quem pode ser líder**: célula nova nasce "aguardando aprovação" da liderança (admin) antes de ter painel nominal; admin pode destituir e transferir o líder; `celulaDoLider`/`celulaDeQuemConduz` passam a exigir membro ativo. Regra de idade para liderar fica configurável (o dono decide; enquanto isso, menor de 18 não cria célula). | Acesso nominal, adolescentes | M |
| 1.9 | *(parte feita em 09/10: nascimento travado e liderança com aprovação; ver Andamento)* **Salvaguardas para 12-17 anos** (sem coletar dado novo, pela data já guardada): sem criar célula; discipulado com adulto só se o adolescente aceitar e com check-in desligado; toques e avisos sempre no silêncio noturno; data de nascimento travada depois do cadastro (troca só pelo suporte, registrada); motivo de denúncia "parece ter menos de 12 anos" com suspensão preventiva até revisão; ao completar 18, aviso das novas opções. Deixar o modelo pronto para vínculo com responsável (art. 24 do ECA Digital) sem ativá-lo até o parecer. | Seção 2 | M |
| 1.10 | **Denúncias completas**: denúncia de pessoa e de pedido com id do conteúdo, cópia da evidência no momento, estado (aberta, em análise, decidida), decisão, quem decidiu, quando, aviso ao autor quando o conteúdo sai e pedido de revisão. Fila no painel do admin. "Alguém pode estar em perigo" avisa o líder **e** a equipe responsável. Sem descarte silencioso aos 500. Retenção definida (ver perguntas). Bloqueio continua silencioso e separado. | Seção 13 | M a G |
| 1.11 | **Exclusão mais completa**: tirar o nome da pessoa dos avisos já entregues a outros (`push_caixa`); trocar o @ por "conta apagada" em `registrado_por`, `removido_por`, `convidadoPor`/`acompanhadoPor` de terceiros e `criado_por` de grupos que continuam; `PRAGMA secure_delete = ON`; denúncias pseudonimizadas e com prazo (não "para sempre"); registro mínimo do pedido de exclusão (hash do @ e data) como prova. | Seção 10 | M |
| 1.12 | *(parte feita em 09/10: senha para trocar e-mail; nascimento não muda mais)* **Segurança**: senha para trocar e-mail e nascimento (`/api/perfil` depois do cadastro); link de senha pelo admin só com motivo, registrado (1.6) e com aviso ao e-mail do titular; rotação de logs no compose (`logging: max-size/max-file`) e tirar o @ dos logs de rotina; versão fixa da imagem `cloudflared`; aviso no painel quando a chave do backup estiver dentro de `dados/`. | Seção 9 | P |
| 1.13 | **"Baixar meus dados" completo** (JSON pelo servidor): conta, consentimentos, progresso, textos, marcos, check-ins, amizades, células e papéis, presenças, pedidos, discipulados, caixa do sino. Mantém o "Baixar o que escrevi" em Markdown. | Seção 11 | M |
| 1.14 | **Tela "Quem vê meus dados"** gerada das relações reais da pessoa (amigos, células e quem conduz, discipulador, convidador, admin), usando a mesma regra do servidor. | Seções 6, 7 e 11 | M |
| 1.15 | *(parte feita em 09/10: versão, histórico e consentimento v3)* **Versão da política**: número de versão na página, aviso no app quando mudar, página com o histórico; mudança que amplia acesso sobe a versão do consentimento afetado (com o gate de 1.4). | Seção 14 | P |
| 1.16 | **Retenção revista no código**: check-in 180 → 90 dias (o histórico de 180 não tem uso hoje); caixa do sino com prazo (ex.: 90 dias); pedidos de conversa apagados 30 dias depois de feitos. Valores finais confirmados pelo dono. | Seção 10 | P |

Ordem sugerida: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 (a), (b), (c) → 1.12 → 1.6 → 1.8 → 1.9 → 1.7 →
1.10 → 1.11 → 1.13 → 1.14 → 1.15 → 1.16. Os cinco primeiros cabem num mesmo PR pequeno.

---

## Fase 2 · Texto da política corrigido

*Feita em 09/10/2026 (política versão 3). As pendências que sobraram estão em "Andamento".*

Reescrever `src/privacidade.html` (e os trechos irmãos em `src/termos.html`, `src/entrar.html` e
`src/app/07b-conta.js`) **depois** do primeiro bloco da fase 1, para o texto descrever o app
corrigido. Onde faltar informação do dono, o texto leva `[PENDÊNCIA: ...]` visível na revisão e
não vai ao ar com ela.

| Seção | Mudança |
|---|---|
| Resumo | Finalidades concretas (serviço, acompanhamento pela liderança da célula, relatório agregado da igreja); "sem rastreamento publicitário nem de terceiros"; exclusão "da conta e dos backups, com as exceções da seção 10". |
| 1. Quem somos | `[PENDÊNCIA: controlador, contato, igreja, papel de cada um, encarregado ou canal]`. |
| 2. Idade | Fluxo real: data autodeclarada, corte de 12, salvaguardas da conta de 12-17 (fase 1.9), o que acontece com conta de criança, `[PENDÊNCIA: supervisão de responsável]`. |
| 3. Dados | Inventário completo de `inventario-dados.md`, inclusive cookies, IP (que não guardamos, mas a Cloudflare recebe), logs, fuso, origem, consentimentos, caixa do sino, presença lançada pelo líder, denúncias. |
| 4. Dados sensíveis | Renomear; listar o que revela fé e o que pode revelar saúde (check-in, textos livres); cada consentimento separado e o que acontece se recusar. |
| 5. Como usamos | Uma linha por finalidade com o dado e `[PENDÊNCIA: base legal, a validar no parecer]`; critérios exatos dos alertas e que podem errar. |
| 6 e 7. Quem vê | Tabela de `matriz-permissoes.md` com colunas para amigo, membro de grupo/célula, quem conduz, discipulador, convidador, administração e equipe técnica; separar oração privada de pedido compartilhado; dizer que a restrição aos textos é de permissão (a equipe técnica tem acesso ao servidor para manutenção, com registro). |
| 8. Compartilhamento | Lista real: Cloudflare (rede; TLS termina lá), `[PENDÊNCIA: provedor de e-mail efetivo]`, serviços de push (conteúdo cifrado, metadados passam), hospedagem própria `[PENDÊNCIA: onde]`; relação com a igreja `[PENDÊNCIA]`; transferência internacional `[PENDÊNCIA: mecanismo]`. |
| 9. Segurança | Medidas sem promessa absoluta; trilha de acesso; o que fazemos em incidente. |
| 10. Guarda | Tabela de prazos reais; o que fica depois da exclusão e por quanto tempo; backups de 14 dias reescritos na exclusão; relatórios exportados com prazo de descarte. |
| 11. Controles | Todos os direitos, como pedir, prazo de resposta `[PENDÊNCIA: canal]`; "Baixar meus dados". |
| 12. Consentimento | Retirar cada consentimento sem apagar a conta, e a consequência de cada um. |
| 13. Interações | Denúncia (o que é registrado, quem analisa, aviso ao autor, revisão); bloqueio; toques com limites e silêncio; pausa. |
| 14. Mudanças | Versão, aviso prévio, histórico, novo consentimento quando amplia acesso. |
| Ajuda | Manter CVV, Disque 100, 192, 190; "o suporte não é atendimento de emergência nem clínico". |

Esforço: 1 a 2 dias de texto, mais a revisão jurídica.

---

## Fase 3 · Processos (dependem de quem responde)

1. **Incidentes**: quem é avisado, em quanto tempo, como se avalia o risco, modelo de
   comunicação à ANPD e aos titulares conforme a Resolução ANPD nº 15/2024 (prazos a confirmar no
   parecer), registro de todo incidente (mesmo os não comunicados). Ensaiar uma vez por ano.
   Apoio técnico já disponível: backups cifrados, "sair dos outros aparelhos", troca de chave de
   sessão invalida todas as sessões.
2. **Pedidos do titular**: canal (o `suporte@` só se for lido de fato), verificação proporcional
   (pedido feito de dentro da conta logada, ou resposta ao e-mail cadastrado), prazo, modelo de
   resposta, registro do pedido e da resposta; representante legal de adolescente.
3. **Backups**: teste de restauração mensal registrado; evidência de exclusão (apagar conta de
   teste, conferir os 14 backups, guardar o resultado); onde fica a cópia da chave e quem tem;
   regra para não guardar `restaurado.db` fora da pasta.
4. **Liderança**: quem aprova líder, como se tira o acesso de quem deixa a função, revisão
   trimestral da lista de líderes e admins.
5. **Relatórios exportados**: quem pode pedir, para quê, onde guardar, quando apagar; registro
   de quem recebeu.
6. **Denúncias**: quem forma a equipe que analisa, prazo de análise, quando acionar Conselho
   Tutelar/polícia, preservação de evidência do art. 27 do ECA Digital.
7. **Revisão periódica**: matriz de permissões e inventário revistos a cada mudança de função.

---

## Perguntas ao dono

Respostas curtas bastam. Cada uma destrava um ponto marcado como *depende do dono*.

### Respostas do dono (09/10/2026)

- Perguntas 1 a 4 (controlador, igreja, acordo): **"não tem ainda"** / **"ainda não tem"**.
  A política não inventa nenhum dos dois.
- Pergunta 5: `suporte@geracaoeleita.app` **existe e é lido**.
- Pergunta 8 e 11: **menor de 18 pode liderar célula, mas só com aprovação** (feito). Sobre
  adultos e discipuladores menores não houve resposta.
- Pergunta 13: o relatório exportado **não é enviado a ninguém hoje** (app em desenvolvimento).
- Pergunta 15: o provedor de e-mail é **o mesmo que vendeu o domínio**; pelo DNS, a Hostinger.
- Pedido do dono: **atualizar a política e, principalmente, impedir a troca da idade depois do
  cadastro** (feito).
- Continuam abertas: 6, 7, 9, 10, 12, 14, 16 a 26.

### Responsáveis

1. Quem é o controlador dos dados: você como pessoa física, um grupo de pessoas, a igreja
   (com CNPJ) ou outra organização? Nome e contato que podem aparecer na política.
2. Qual igreja (ou quais igrejas) usa o app? Há mais de uma, ou planos de ter?
3. Existe algum acordo (mesmo informal) entre quem mantém o app e a igreja? Quem decide para que
   os dados são usados: você, a liderança da igreja ou os dois?
4. Quem responde por pedidos de titulares e por incidentes? Haverá encarregado (DPO) nomeado?
5. O e-mail `suporte@geracaoeleita.app` existe e é lido? Por quem? O app roda em outro domínio:
   qual é o endereço oficial?
6. O favorecido do Pix na tela "Apoiar" é o mesmo controlador?

### Público e adolescentes

7. Quantas contas de 12 a 17 anos existem hoje (só o número)?
8. Quer que menores de 18 possam liderar célula ou ser discipuladores? E auxiliares?
9. A igreja quer (ou aceita) um vínculo de pai/mãe/responsável na conta do adolescente, se o
   parecer exigir?
10. Basta o ano (ou mês e ano) de nascimento, ou a data completa tem outro uso?

### Liderança e relatórios

11. Quem deve poder ser líder de célula: qualquer pessoa ou só quem a liderança aprovar?
12. Quem são os administradores hoje e por quê? Precisam ver cada célula com nomes, ou o
    agregado basta com acesso nominal só quando houver motivo?
13. Quem recebe o relatório exportado, para quê, onde ele fica guardado e em quanto tempo deve ser
    apagado? Pode mandar um exemplo do uso real (sem dados reais)?
14. O check-in de Corpo, Mente e Espírito precisa aparecer para a célula, ou pode ficar só com o
    discipulador (com consentimento) e no agregado da igreja?

### Fornecedores e infraestrutura

15. Qual provedor de e-mail está configurado no `.env` de produção (Resend, Gmail, outro)? Em que
    país? Há contrato ou termos aceitos?
16. O Raspberry Pi fica onde (casa de quem, igreja)? Quem tem acesso físico e por SSH?
17. Os backups vão para um disco externo? Há alguma cópia fora do Pi (nuvem, outro computador)?
    Onde está a cópia da chave dos backups?
18. A conta da Cloudflare é de quem? Há outros serviços (domínio, DNS, GitHub com dados) que
    recebem dados de pessoas?

### Retenção e denúncias

19. Por quanto tempo guardar denúncias de pessoa depois de decididas? E quando a conta
    denunciada ou a denunciante é apagada?
20. Quem analisa denúncias hoje? Alguém já analisou alguma (a tabela não tem tela)?
21. Prazos que você aceita para: check-in (hoje 180 dias), caixa do sino (hoje sem prazo), trilha
    de acesso administrativo (proposta 12 meses), relatórios exportados.

### Evidências que o relatório pede

22. Pode gravar (ou autorizar que eu prepare com dados fictícios) as telas de cadastro, aceite,
    consentimentos, privacidade, compartilhamento, denúncia e exclusão, e o comportamento padrão
    de uma conta de 13 anos?
23. Posso preparar a demonstração com contas fictícias de: criança cadastrada indevidamente,
    troca de célula, saída, destituição de líder, alteração de idade e passagem aos 18? (Hoje
    várias dessas situações não têm tratamento; ver a tabela no fim de `auditoria.md`.)
24. Houve algum incidente de segurança, vazamento ou acesso indevido até hoje?

### Decisão anterior que precisa ser revista

25. Em 01/10 você decidiu que todo toque vira notificação, sem o silêncio da noite e sem teto.
    O relatório aponta risco de uso compulsivo para adolescentes. Posso voltar a aplicar o
    silêncio noturno e o teto de 3 toques por dia (item 1.5)?
26. Em `docs/inteligencia.md` §5 ficou decidido que líder e admin veem nomes. Mantém essa
    decisão com consentimento separado (item 1.7) e trilha (item 1.6), ou prefere o admin só no
    agregado?
