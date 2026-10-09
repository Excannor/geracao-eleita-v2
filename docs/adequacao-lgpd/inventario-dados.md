# Inventário de dados (como o código guarda hoje)

Banco: um arquivo SQLite (`dados/caminho.db`, `db.mjs:268-269`), modo WAL, sem `secure_delete`
(`db.mjs:256`). Backups: um por dia, os 14 mais novos, cifrados com AES-256-GCM
(`db.mjs:428-518`, `servidor.mjs:2216-2228`). Hospedagem: Raspberry Pi com Docker
(`README.md:24-28`); acesso pela internet só pelo túnel da Cloudflare (`docker-compose.yml`).

Colunas: **Dado** · **Onde** (tabela/campo ou local) · **Finalidade real** · **Quem acessa** (além
do titular e de quem mantém o servidor, que lê tudo) · **Retenção real no código**.
"Conta" = enquanto a conta existir, apagado com ela (inclusive dos backups) salvo nota.

## Cadastro e conta

| Dado | Onde | Finalidade | Quem acessa | Retenção |
|---|---|---|---|---|
| @usuário | `contas.usuario` (`db.mjs:37-48`) | login, busca exata, links | amigos, grupos, células, quem recebe convite | conta; **fica em denúncias, `registrado_por`, `removido_por`, `criado_por` de grupos que continuam, `convidadoPor`/`acompanhadoPor` de terceiros e logs** |
| Nome (até 20 caracteres) | `contas.nome` e `estados.dados.apelido` | exibição | amigos, grupos, células, discipulador, admin (painéis) | conta; **fica nos avisos do sino já entregues a outras pessoas** (`push_caixa`) |
| E-mail | `contas.email` | login, link de nova senha | ninguém pela interface; provedor SMTP no envio | conta |
| Data de nascimento completa | `contas.nascimento` | corte de 12 anos (`contas.mjs:123-127`) | ninguém pela interface | conta (alterável pela API sem senha, `contas.mjs:490-505`) |
| Resumo da senha (scrypt) e sal | `contas.senha`, `contas.sal` | autenticação | ninguém | conta |
| Fuso horário | `contas.fuso` (`contas.mjs:464`, `servidor.mjs:1340-1346`) | "hoje" de cada um, horário dos avisos | ninguém | conta |
| Data de criação | `contas.criada_em` | retenção e funil no painel do dono | admin (agregado) | conta |
| Selo de convite, selo de sessão | `contas.selo_convite`, `extra.sessao` | invalidar links e sessões | ninguém | conta |
| Consentimento (`versao`, `em`) | `contas.extra.consentimento` (`contas.mjs:472`, `contas.mjs:527-533`) | prova do aceite do texto sobre fé | titular (data na folha Privacidade) | conta; **sobrescrito a cada aceite, sem histórico** |
| Dias em que abriu o app (só data) | `contas.extra.acessos` (`contas.mjs:873-880`) | contagem de uso no painel do dono | admin (agregado) | **90 dias** |
| Origem da conta (convite, célula, conhecer, direto) | `contas.extra.origem` (`contas.mjs:864-870`) | painel do dono | admin (agregado) | conta |
| Quem convidou / quem acompanha no Conhecer | `contas.extra.convidadoPor`, `acompanhadoPor` | Trilha do Semeador, acompanhamento | convidador | conta (o @ fica na conta do outro se o convidador apagar a dele) |
| Caminho (plano ou conhecer) | `contas.extra.caminho` | qual trilha mostrar, funil | líder (funil), admin | conta |
| Marcos de Minha caminhada (decisão, batismo, célula, acompanha) com data | `contas.extra.marcos` (`contas.mjs:1539-1557`) | funil do líder, frutos do mês, discipulador | líder e auxiliar (etapa, com nome), admin (célula e contagem do mês), discipulador se ligado | conta; a pessoa pode apagar cada marco |
| Pedidos de conversa (tipo, data, quem foi avisado, quem marcou "já conversamos") | `contas.extra.pedidosConversa` (`contas.mjs:884-913`) | avisar convidador, líder, discipulador | os avisados | aparece por 30 dias; **o registro fica na conta** |
| Datas de "quero conversar" e "batismo" | `contas.extra.conversouEm`, `batismoConversaEm` | limitar a um pedido por dia | convidador (data) | conta |
| Nível da Trilha do Semeador | `contas.extra.semeadorNivel` | marco no mural | amigos (mural) | conta |

## Progresso e o que a pessoa escreve

| Dado | Onde | Finalidade | Quem acessa | Retenção |
|---|---|---|---|---|
| Progresso inteiro (dias lidos, lições, prática, conquistas, XP, diário de uso, baús) | `estados.dados` (JSON, `db.mjs:70`; gravado em `servidor.mjs`, rota `/api/estado`) | sincronizar aparelhos, ofensiva, propósitos, painéis | partes derivadas: amigos (leu hoje), células, líder, admin | conta; também no `localStorage` do aparelho; "zerar progresso" apaga só o andamento da trilha (`CC.PROGRESSO_DA_TRILHA`: leituras, primeiros passos, Conhecer Jesus, ofensiva, XP, conquistas, baús, desafios do dia, prática) |
| Reflexões (`oia`), anotações e notas de versículo, "Minha história com Deus" (e as notas novas, `notas.*.texto`/`.tags`, quando existirem) | `estados.dados.oia`, `.anotacoes`, `.historia` | guardar para a pessoa | ninguém pela interface; **cifrados no banco desde 2026-10-09** (AES-256-GCM campo a campo, `cofre.mjs`, chave `CAMINHO_CHAVE_NOTAS` do `.env`); em claro só no `/api/estado` do próprio dono; quem mantém o servidor e tem o `.env` ainda consegue abrir | conta; "zerar progresso" **não** apaga (só recomeça a trilha) |
| Datas do "Orei" | `estados.dados.oradoEm` | propósito de oração | membros do propósito (fez hoje) | conta |
| Marca-texto, último capítulo aberto | `estados.dados.marcas`, `.ultimaBiblia` | continuar a leitura | ninguém | conta |
| Desafios pessoais (ex.: "21 dias sem redes sociais", "7 dias sem celular na cama") | `estados.dados.desafios` | o próprio desafio, painel do dono | admin (contagens), grupo do desafio coletivo | conta |
| Foto de perfil (JPEG refeito no aparelho, sem EXIF) | `estados.dados.foto` (`src/app/02-estado.js:501`, `servidor.mjs:158-167`) | exibição | amigos, grupos, células | conta; "zerar progresso" não apaga |
| Datas de leitura (cópia achatada) | `leitura_dias` (`db.mjs:214`) | painel da igreja | admin (agregado) | conta (apagado com a conta, `servidor.mjs:228`) |

## Relações e grupos

| Dado | Onde | Finalidade | Quem acessa | Retenção |
|---|---|---|---|---|
| Amizades (estado, quem pediu, datas) | `amizades` | Juntos, toques | os dois | até desfazer ou apagar a conta |
| Bloqueios, silenciados | `bloqueios`, `silenciados` | proteção | só quem bloqueou/silenciou | até desfazer ou apagar a conta |
| Toques (de, para, dia) | `toques` | limite de 1 por dia | os dois | sobrescrito no dia seguinte; apagado com a conta |
| Convites aceitos (quem trouxe quem, quando, se ativou) | `convites_aceites` | Trilha do Semeador | convidador (contagem) | conta de qualquer dos dois |
| Propósitos e grupos (título, tipo, criador, datas) | `propositos`, `proposito_membros`, `proposito_dias` | leitura em grupo | membros | grupo fica depois que a pessoa sai; dupla some com a conta |
| Células: recado, dia e hora do encontro, estudo | `propositos.*` (`db.mjs:105-117`, `db.mjs:227`) | conduzir o encontro | membros | enquanto a célula existir |
| Papel na célula (membro, auxiliar, visitante), entrada, saída, virou membro | `proposito_membros` | permissões, painel | membros (papel), líder | enquanto a célula existir; **saída fica registrada** |
| Encontros registrados (data, visitantes sem conta, quem registrou, quando) | `celula_encontros` | frequência | líder, auxiliar, admin | enquanto a célula existir; **`registrado_por` fica mesmo se a conta for apagada** |
| Presença de cada pessoa em cada encontro (lançada pelo líder) | `celula_presencas` | frequência, "faltou" | líder, auxiliar, admin; relatório | enquanto a célula existir; a pessoa sai ao apagar a conta |
| Discipulado (quem, estado, o que mostrar, encontros) | `discipulados`, `discipulado_encontros` | acompanhamento 1 a 1 | os dois | encerrado fica guardado; some ao apagar a conta |
| Desafio de grupo (qual, início, quem abriu) | `desafios_grupo` | desafio coletivo | o grupo | sem prazo; some se quem abriu apagar a conta |

## Check-in e cuidado

| Dado | Onde | Finalidade | Quem acessa | Retenção |
|---|---|---|---|---|
| Check-in Corpo/Mente/Espírito (1 a 3) por dia | `checkins` (`db.mjs:190`, `contas.mjs:556-566`) | discipulador, agregado da célula e da igreja | **discipulador: o último da semana (padrão ligado)**; líder, auxiliar e admin: somado (célula 3+, igreja 5+) | **180 dias** (`contas.mjs:346`) |
| Pedido de oração ou de ajuda (texto até 280/200, destino, vencimento, estado) | `pedidos` (`db.mjs:150-159`; **em claro**: não é privado, a célula ou quem conduz lê; fora do cofre das anotações) | cuidado mútuo | célula ou só quem conduz | vence em 7 ou 30 dias; **apagado 30 dias depois de vencer** (`cuidado.mjs:46`); some ao sair da célula ou apagar a conta |
| Gestos ("orei", "posso ajudar") | `pedido_gestos` | mostrar ao autor | autor | junto com o pedido |
| Denúncias de pedido (quem, motivo, quando) | `pedido_denuncias` | esconder e decidir | líder e auxiliar (motivo e total, não quem) | junto com o pedido; **"manter" apaga as denúncias** |
| Quem removeu um pedido | `pedidos.removido_por` | registro da decisão | ninguém pela interface | até o pedido ser apagado |
| Denúncias de pessoa (de, contra, motivo, quando) | `denuncias` (`db.mjs:58`) | "ficam para o dono do servidor" | **ninguém pela interface** | **sem prazo; só as 500 mais novas** (`contas.mjs:1691`); **não apagadas com a conta** |

## Notificações

| Dado | Onde | Finalidade | Quem acessa | Retenção |
|---|---|---|---|---|
| Inscrição de push (endpoint, chaves) | `push_inscricoes` | entregar avisos | serviço de push do aparelho (Google, Apple, Mozilla, Microsoft) | até o aparelho revogar (404/410), cancelar ou apagar a conta; até 10 por conta |
| Preferências (lembrete, hora, ofensiva, amigos) | `push_preferencias` | regras de envio | ninguém | conta |
| Histórico do que saiu hoje | `push_historico` | tetos e espaçamento | ninguém | sobrescrito a cada dia |
| Caixa do sino (título, texto, link, lido) | `push_caixa` (`db.mjs:180`) | ver avisos depois | titular | **60 mais recentes, sem prazo**; o texto leva o nome de quem tocou, pediu, convidou |

## Mural (Juntos)

| Dado | Onde | Finalidade | Quem acessa | Retenção |
|---|---|---|---|---|
| Marcos publicados (ofensiva, livro, conquista, versículo, propósito, semeador) | `novidades_eventos` | mural dos amigos | amigos, se a pessoa ligou | **apagados após 30 dias** (`novidades.mjs:11`, `novidades.mjs:78-88`), até 80 por autor |
| Reações | `novidades_reacoes` | mural | amigos | junto com o evento |
| Se compartilha / se já foi perguntado | `novidades_pessoas` | escolha do mural | ninguém | conta |

## Dados técnicos

| Dado | Onde | Finalidade | Quem acessa | Retenção |
|---|---|---|---|---|
| Cookie `cc_sessao` (@, validade, assinatura) | navegador (`servidor.mjs:360`, `servidor.mjs:423-428`) | sessão | — | **90 dias** |
| Cookie `cc_logado=1` | navegador (`servidor.mjs:408-416`) | saber, antes de pintar, se há sessão | scripts da página | mesma validade da sessão |
| Progresso, preferências, cache | `localStorage` e cache do service worker | funcionar offline | — | até limpar o aparelho ou sair |
| IP | só em memória (`servidor.mjs:532-561`, `servidor.mjs:1109-1114`) | limitar tentativas de login, cadastro e pedido de senha | ninguém | janela de 15 minutos (a lista de pedidos de senha por IP não é podada); **passa e fica nos registros da Cloudflare** (fora do código) |
| Passagem de sessão (token de 3 min) | memória (`servidor.mjs:1200-1207`) | levar a sessão do navegador do WhatsApp/Instagram para o Chrome | — | 3 minutos |
| Pedidos de nova senha sem e-mail (@, quando) | `metadados.pedidos_senha` (`servidor.mjs:514-520`) | o dono mandar o link à mão | admin | **7 dias** ou até gerar o link |
| Logs do servidor | saída do container (Docker) | diagnóstico | quem mantém o servidor | **sem rotação configurada**; contêm @ em falhas de push (`servidor.mjs:611-614`), na geração de link de senha pelo admin (`servidor.mjs:1241`) e método+caminho em erros (`servidor.mjs:2183`) |
| Chaves (sessão, push, backup, anotações) | `dados/*.chave`, `.env` (`CAMINHO_CHAVE_NOTAS` só no `.env`; sem ela, em produção, o servidor não sobe) | assinar e cifrar | quem mantém o servidor | permanentes; a das anotações troca com `CAMINHO_CHAVE_NOTAS_ANTERIOR` |
| JSON legados da época dos arquivos | `dados/json-legado-*` | migração | quem mantém o servidor | indefinido; a pessoa é tirada deles ao apagar a conta (`servidor.mjs:236-301`) |

## Fora do app (cópias que o código não alcança)

| Cópia | Origem | Controle no código |
|---|---|---|
| Relatório CSV/PDF com nomes | `GET /api/painel/relatorio` (`servidor.mjs:1282-1312`) | nenhum (sem registro, sem prazo) |
| Link de senha mandado à mão | painel do dono (`servidor.mjs:1234-1242`) | só o log |
| Arquivo "Baixar o que escrevi" | gerado no aparelho (`src/app/02-estado.js:571-626`) | do titular |
| Tráfego e IP | Cloudflare (TLS termina lá) | nenhum |
| E-mail de nova senha | provedor SMTP do `.env` (`email.mjs`) | nenhum |
| Metadados de push | Google, Apple, Mozilla, Microsoft | conteúdo cifrado (`notificacoes.mjs:1-6`) |
