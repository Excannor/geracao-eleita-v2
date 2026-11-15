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
R4.0 especificação, R4.1 conversa do dia, R4.2 lista de oração, R4.3 convite por QR code.

## R4.0 · Especificação

**O que é.** `docs/r4-celula.md`, sem código. Cobre quem vê e quem escreve, limites, moderação,
retenção, cuidados com menores, notificações, mudanças na política e nos termos, as migrações v27 a
v29, a API, as telas e os testes de cada item.

**O que já existia e foi aproveitado.**
- A lista de oração não começa do zero: o pedido de oração e de ajuda da Fase 4 (`cuidado.mjs`,
  tabelas da v9, aba Oração) já tem destino "Toda a célula" ou "Só quem conduz", denúncia com 2
  denúncias escondendo e o aviso de perigo. A R4.2 troca "Orei por você" por "Estou orando" com
  contagem e acrescenta atualizações e "Respondidas".
- O QR code também já existe: a folha "Link da célula" desenha o link de 30 dias com a peça
  `qrcode`. A R4.3 acrescenta o código do encontro, com validade de 4 horas e só para quem conduz.
- O dia da célula (`diaDaCelula`, R2.1) e as reflexões do dia no servidor (`APP.reflexoes`, 365
  dias) dão a pergunta da conversa sem depender do app.

**Decisões para o dono conferir** (seção 0 da especificação):
- D2: a pergunta é a primeira do Pensar, e quem conduz pode trocar pela outra antes da primeira
  resposta.
- D7: a resposta tirada por quem conduz fica guardada, sem aparecer, até a limpeza de 30 dias.
- D13: quem entra pelo QR do encontro não conta para os limiares de Semeadores de quem mostrou o
  código; a legenda do QR é João 1.46 ("Venha e veja"), sem prêmio.
- Seção 6: a denúncia de perigo na conversa usa o tipo `denunciaPerigo` que já existe, com outro
  texto e outro endereço.
- Seção 7: política na versão 8 com aviso no app e sem novo "sim"; a frase "nunca o que eu escrevo"
  do consentimento.

**Testes.** Nenhum código mudou. Build e `teste.mjs` rodados para registrar a base: 1653 checagens,
todas passaram; folga do index de 63,2 KB.
