# R4: Ler junto na célula

Objetivo: a célula ler junto dentro do app, sem virar rede social. Vem do roadmap de melhorias
(fase R4) e das recomendações 11, 12 e 15 do estudo do YouVersion. A especificação completa está em
`docs/r4-celula.md`.

Tom de todos os textos (pedido do dono): sem hipérbole e sem cara de texto gerado. Frases curtas,
factuais e calmas. Nada de "jornada", "mergulhe", "poderoso", "incrível", travessão, exclamação em
série ou tríade retórica.

Decisões do dono que valem para a fase inteira: participam só os membros da célula (visitantes ficam
de fora da conversa e da lista de oração) e quem conduz modera (líder e auxiliar).

A fase é feita em partes, uma de cada vez, cada uma com o seu commit e os seus testes:
R4.0 especificação, R4.1 conversa do dia (adiada pelo dono), R4.2 lista de oração, R4.3 convite
por QR code.

## R4.0 · Especificação

**O que é.** `docs/r4-celula.md`, sem código. Cobre quem vê e quem escreve, limites, moderação,
retenção, cuidados com menores, notificações, mudanças na política e nos termos, as migrações
(hoje v27 e v28, com a conversa adiada), a API, as telas e os testes de cada item.

**O que já existia e foi aproveitado.**
- A lista de oração não começa do zero: o pedido de oração e de ajuda da Fase 4 (`cuidado.mjs`,
  tabelas da v9, aba Oração) já tem destino "Toda a célula" ou "Só quem conduz", denúncia com 2
  denúncias escondendo e o aviso de perigo. A R4.2 troca "Orei por você" por "Estou orando" com
  contagem e acrescenta atualizações e "Respondidas".
- O QR code também já existe: a folha "Link da célula" desenha o link de 30 dias com a peça
  `qrcode`. A R4.3 acrescenta o código do encontro, com validade de 4 horas e só para quem conduz.
- O dia da célula (`diaDaCelula`, R2.1) e as reflexões do dia no servidor (`APP.reflexoes`, 365
  dias) dão a pergunta da conversa sem depender do app.

**Decisões do dono (16/11), registradas no topo da especificação:**
- A Conversa do dia (R4.1) está adiada. O desenho fica no documento, marcado como adiado.
- Denúncia de perigo: quem conduz é avisado na hora pelo `denunciaPerigo` que já existe (na lista
  de oração isso já é assim).
- QR do encontro: não conta para Semeadores.
- Consentimento: não muda. A política sobe para a versão 8 só no que a R4.2 e a R4.3 mudarem.
- Com a conversa adiada, a lista de oração é a migração v27 e o QR a v28.

**Testes.** Nenhum código mudou. Build e `teste.mjs` rodados para registrar a base: 1653 checagens,
todas passaram; folga do index de 63,2 KB.
