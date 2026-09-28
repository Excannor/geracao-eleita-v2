# Revisão final: Livros da Bíblia (28/09/2026)

Arquivo: `ferramentas/explorar/livros.json` (LF; aplicado por script Node com troca exata de 11 trechos, o resto ficou idêntico; JSON válido).

## Correções

- livros.json · Esdras · versículo-chave "A boa mão do nosso Deus estava sobre nós. (Esdras 8:18)" → NBV de Esdras 7:9 "(...) pois a boa mão do seu Deus estava sobre ele." · Na NBV, Ed 8.18 é "E Deus foi bom! Ele nos mandou (...) Serebias (...)". Como o build troca o blockquote pelo texto NBV da referência, o app ia mostrar como versículo-chave a frase sobre Serebias. Ed 7.9 é o único versículo da NBV com "a boa mão do seu Deus".
- livros.json · Esdras · Jesus, "Deus conosco" → Jesus, chamado Emanuel, que significa "Deus está conosco" (Mt 1:23) · NBV Mt 1.23.
- livros.json · Ageu · o próprio Cristo, "Deus conosco", ensina (...) (Jo 2:19-21) → o próprio Cristo, o Emanuel, "Deus está conosco" (Mt 1:23), ensina (...) · A citação não é da NBV e estava presa a Jo 2, que não tem essa frase.
- livros.json · Isaías · "Ele fala do nascimento de uma virgem (Is 7:14)" → "Ele fala da virgem que ficaria grávida e daria à luz um filho (Is 7:14)" · Do jeito que estava, parecia que quem nascia era a virgem (NBV Is 7.14).
- livros.json · Malaquias · divisão "Infidelidade no casamento e nos dízimos (2:10-3:15) / Promessa do mensageiro e do Dia do Senhor (3:16-4:6)" → "Infidelidade no casamento, o mensageiro que vem e os dízimos (2:10-3:15) / O Dia do Senhor e o envio do profeta Elias (3:16-4:6)" · O mensageiro está em Ml 3.1, fora do trecho que levava o nome dele. Elias está em Ml 4.5 (NBV).
- livros.json · 2 Samuel · divisão "Davi, rei sobre Israel (1-10)" → "Davi, rei de Judá e depois de todo o Israel (1-10)" · 2 Sm 5.5. É o mesmo ajuste que a revisão anterior fez no texto corrido, mas a divisão tinha ficado sem ele.
- livros.json · Efésios · divisão "A armadura de Deus (6:10-24)" → "A armadura de Deus e despedida (6:10-24)" · Os v. 21-24 são as saudações finais.
- livros.json · Daniel · "Nos evangelhos, Filho do homem" → "Filho do Homem" · Nos evangelhos a NBV escreve com H maiúsculo, igual à nota de Lucas.
- livros.json · Salmos · data "entre c. XV e V a.C." → "mais ou menos entre os séc. XV e V a.C." · Faltava a palavra "séc.".
- livros.json · Êxodo · "uma pergunta importante pros primeiros leitores. Como Deus cumpre..." → "...leitores: como Deus cumpre..." · Pontuação.
- livros.json · Juízes · "Aí cai num ciclo" → "Aí o povo cai num ciclo" · Faltava o sujeito da frase.

## Conferência das correções da revisão anterior
Todas as citações que a revisão de 27/09 pôs na NBV continuam batendo palavra por palavra: 1 Jo 4.2 e 3.8, 2 Ts 2.3, 2 e 3 João ("o ancião", "por causa do Nome"), Cl 1.15-19, Dn 7.13, Dt 18.15, Ec ("tudo é ilusão"), Gn 12.3, Hc 2.4 e Gl 3.11, Jó 9.33, Jo 1.14 e 20.31, Jl 2.28, Jd 24, Jz 21.25, Lm 3.23, Mc 10.45, Pv 25.1, Sf 3.17, Ag 1.7, 1 Co 5.7 e Nm 21.8-9. Mordecai, Josué e Calebe (Nm 14.30) também estão certos.

Versículos-chave: o texto de todos os 66 vem da NVI na fonte, mas o build (`ferramentas/versiculos-explorar.mjs`) troca pelo texto NBV da referência. Por isso só conferi se a referência, lida na NBV, diz o que a nota quer. Só Esdras falhava.

Capítulos: os 66 livros batem com a contagem da NBV. A ordem dos livros e as faixas das divisões foram conferidas; fora as três corrigidas acima, estão coerentes.

## Para o dono
- **Autoria sem ressalva, fora do padrão do próprio arquivo.** 1 e 2 Timóteo, Tito e 2 Pedro trazem "(autoria apostólica debatida por parte dos estudiosos)". Efésios, Colossenses, 2 Tessalonicenses (Paulo) e 1 Pedro (Pedro) aparecem como fato, e essas autorias também são debatidas. Você decide se põe a mesma ressalva ou se deixa.
- **Datas cedo dos evangelhos e de Tiago:** Mateus c. 60-70, Marcos c. 55-65, Lucas c. 60-62 e Tiago c. 45-49. É uma posição conservadora. Muitos estudiosos datam os evangelhos depois de 70. Aparecem como "data aproximada", sem ressalva.
- **Hebreus:** a nota diz que "a igreja reconheceu [o livro] como parte da Bíblia bem cedo". No Ocidente, Hebreus foi questionado até o séc. IV. Dá para suavizar para "a igreja acabou reconhecendo".
- **Filemom:** "Onésimo era um escravo que tinha fugido" aparece como fato. A carta não diz isso com essas palavras (v. 15 fala em "separado por algum tempo"). É a leitura tradicional.
- Continuam valendo os itens já com você: Cânticos "amor de Deus" (17) e Eclesiastes/Salomão.

## Números
- Notas revisadas: 66 (html e resumo).
- Citações conferidas na NBV: 77 citações entre aspas no texto corrido (51 conferidas por script com a referência e 26 à mão) e 66 referências de versículo-chave. Também conferi 12 afirmações do tipo "o texto diz" (Jó 9.33, Nm 14.30, Hb 4.8-10, Ml 3-4, 2 Rs 25.27, Mt 12.39-40, a fórmula de cumprimento em Mateus, "logo" em Marcos, "Cristo" em Tiago etc.).
