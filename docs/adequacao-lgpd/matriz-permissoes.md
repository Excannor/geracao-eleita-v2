# Matriz de permissões real (tirada do código)

O que cada perfil recebe do servidor hoje, nesta branch. "Vê" quer dizer que o dado chega ao
aparelho dessa pessoa por alguma rota da API (ou ao arquivo exportado), não só que aparece numa
tela. Referências em `arquivo:linha`.

## Perfis

| Perfil | Como alguém vira esse perfil | Onde no código |
|---|---|---|
| Titular | a própria conta | — |
| Público sem conta | qualquer pessoa com um link de convite ou de célula | `servidor.mjs:1022-1038` |
| Amigo | pedido aceito, ou convite por link (a amizade nasce quando o convidado usa o link) | `contas.mjs:682-703`, `contas.mjs:801-830` |
| Membro de propósito/grupo | aceitou convite para o propósito | `contas.mjs:1024-1084` |
| Membro de célula | entrou pelo link da célula | `contas.mjs:1125-1156` |
| Visitante de célula | entrou pelo link marcando "só conhecendo" | `contas.mjs:1132-1140` |
| Líder | **quem criou a célula** (qualquer conta com cadastro completo, 12+) | `contas.mjs:1086-1097`, `contas.mjs:339-344` |
| Auxiliar | membro ativo marcado pelo líder (até 2) | `contas.mjs:1222-1245` |
| Discipulador | amigo que convidou ou foi convidado e o discípulo aceitou | `contas.mjs:1450-1493` |
| Convidador / acompanhante (Conhecer Jesus) | quem mandou o convite "conhecer" ou o link da célula a quem marcou "estou conhecendo" | `contas.mjs:810-826`, `contas.mjs:854-861` |
| Administrador | o @ listado em `CAMINHO_ADMIN` (padrão fixo no compose) | `servidor.mjs:497-498`, `docker-compose.yml:39` |
| Quem mantém o servidor | acesso ao Raspberry Pi / pasta `dados/` | `docker-compose.yml:30-34` |

## Matriz

Legenda: **sim** · **não** · *condição* · "—" não se aplica.

| Dado | Amigo | Membro de propósito/célula (inclui visitante) | Líder e auxiliar (da própria célula) | Discipulador | Convidador (Conhecer) | Admin | Mantém o servidor | Público sem conta |
|---|---|---|---|---|---|---|---|---|
| Nome (apelido) e foto | sim (`contas.mjs:1738-1745`) | sim (`servidor.mjs:717-723`) | sim | sim (só nome, `servidor.mjs:1642`) | sim (só nome) | sim, em painéis de célula e relatório | sim | nome de quem convidou e título da célula (`servidor.mjs:1022-1038`) |
| @usuário | sim | sim | sim | sim | sim | sim | sim | @ de quem convidou |
| Leu hoje | sim | sim (`fezHoje`) | sim | não (vê "dias na semana") | não | sim | sim | não |
| Ponto extra do dia no grupo | não | *grupo*: sim (`extraHoje`) | sim | não | não | sim | sim | não |
| Dias de propósito em dupla / semana juntos | sim, só da dupla (`servidor.mjs:1408-1423`) | — | — | — | — | não | sim | não |
| Chama acesa/apagada e dias seguidos | não | não | sim, com nome (`servidor.mjs:828-833`) | não | não | sim, qualquer célula (`servidor.mjs:1314-1327`) e no relatório | sim | não |
| "Precisam de atenção" (faltou, dias sem ler, perdeu ofensiva) | não | não | sim, com nome e motivo (`servidor.mjs:792-801`) | não | não | sim (painel e relatório) | sim | não |
| Presença em cada encontro (4 semanas) | não | não | sim, com nome (`servidor.mjs:822-826`) | não | não | sim | sim | não |
| Etapa de Minha caminhada (funil) | não | não | sim, com nome (`servidor.mjs:835-842`) | *se o discípulo ligar "marcos"* (padrão desligado), com datas | não | sim | sim | não |
| Primeiros passos (quantos de 12) | não | não | não (entra só no funil "começando") | *se ligado* (padrão ligado) | não | não | sim | não |
| Dias lidos na semana | não | não | não (só "leram na semana" somado) | *se ligado* (padrão ligado) | não | não | sim | não |
| Dia do Conhecer Jesus e data do "quero conversar" | não | não | não | não | sim (`servidor.mjs:1433-1446`) | não | sim | não |
| Pedido de conversa (Conhecer/batismo): nome e data | não | não | *se avisado* (o líder das células da pessoa), até 30 dias ou "já conversamos" | *se avisado* (batismo) | sim | não | sim | não |
| Check-in individual (corpo, mente, espírito) | não | não | **não** | ***sim, o último da semana, ligado por padrão*** (`discipulado.mjs:35`, `servidor.mjs:1644-1647`) | não | não | sim (180 dias) | não |
| Check-in somado da célula | não | não | sim, a partir de 3 pessoas, % e contagem (`inteligencia.mjs:221-240`) | — | — | sim, por célula e da igreja (5+) | sim | não |
| Pedido de oração destino "célula" | não | sim, membros de verdade (visitante não) (`cuidado.mjs:58-79`) | sim | não | não | **não** (nenhuma rota de admin) | sim | não |
| Pedido de oração destino "quem conduz" | não | não | sim | não | não | não | sim | não |
| Quem orou / quem pode ajudar (gestos) | não | não | não | não | não | não | sim | não (só o autor vê, `servidor.mjs:1718`) |
| Pedido denunciado: texto, autor, motivos, total | não | não | sim (`servidor.mjs:1724-1729`) | não | não | só a contagem (`painel.mjs:110`) | sim | não |
| Quem denunciou um pedido | não | não | não | não | não | não | sim | não |
| Denúncia de pessoa (de, contra, motivo) | não | não | não | não | não | **não há tela** | sim | não |
| Progresso no desafio de grupo | não | *membros de verdade da célula*: sim (`servidor.mjs:1903-1929`) | sim | *dupla de discipulado*: sim | não | não | sim | não |
| Marcos no Juntos (ofensiva, livros, conquistas, versículos) | *se a pessoa ligar* | não | não | não | não | não | sim (30 dias) | não |
| Reações no Juntos | só nomes de amigos em comum | — | — | — | — | não | sim | não |
| Pontos (XP) | não | não | não | não | não | não | sim | não |
| Reflexões, anotações, notas de versículo, "Minha história com Deus" | não | não | não | não | não | não pela interface; **pode gerar link de senha da conta** (`servidor.mjs:1234-1242`) | **sim, JSON aberto** (`db.mjs:70`) | não |
| E-mail e data de nascimento | não | não | não | não | não | não | sim | não |
| Pedidos de nova senha (@ e data) | não | não | não | não | não | sim (`servidor.mjs:1266`) | sim | não |
| Números do app sem nome (uso, retenção, funil) | não | não | não | não | não | sim (`painel.mjs`) | sim | não |
| Relatório exportado (CSV/PDF) com nomes de todas as células | não | não | não | não | não | sim (`servidor.mjs:1282-1312`) | — | não |

## O que cada papel pode fazer sobre outra pessoa

| Ação | Quem pode | Onde |
|---|---|---|
| Registrar presença/falta de membros | líder e auxiliar (inclusive líder que já saiu, pois `celulaDeQuemConduz` não confere membro ativo) | `contas.mjs:1189-1196`, `contas.mjs:1287-1302` |
| Remover membro, marcar auxiliar, multiplicar célula | líder (também o que já saiu) | `contas.mjs:1178-1184`, `contas.mjs:1313-1331`, `contas.mjs:1333` |
| Manter ou tirar pedido denunciado | líder e auxiliar | `contas.mjs:1660-1672` |
| Abrir qualquer célula com nomes; exportar relatório nominal | admin | `servidor.mjs:1282-1327` |
| Gerar link de nova senha de qualquer conta | admin | `servidor.mjs:1234-1242` |
| Mandar toque | amigo que já leu, para quem não leu (1/dia por amigo, 5/dia no total) | `contas.mjs:1404-1420` |
| Mandar cutucada (café, oração, treino) | amigo (1 por tema por dia) | `servidor.mjs:1963-1976` |
| Começar desafio de grupo (avisa todos) | quem conduz a célula; qualquer um da dupla de discipulado | `servidor.mjs:1932-1953` |

## Ausências que importam

- Não existe o conceito de **igreja** nem de várias igrejas: uma instalação é um único conjunto
  de contas, e o admin vê todas as células dela.
- Não existe **trilha de acesso**: nenhuma das leituras acima é registrada.
- Não existe regra por **idade** depois do cadastro: a matriz é a mesma para 12 e para 40 anos.
- O servidor **não confere o consentimento vigente** antes de mostrar alguém num painel.
