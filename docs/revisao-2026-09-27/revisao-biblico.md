# Revisão bíblica do Explorar (Livros, Versículos, Hermenêutica, Alianças, Início)

Ferramentas nesta pasta: rb/v.mjs (NBV/BLivre; b: e s:regex@Livro), rb/dump.mjs (fonte -> texto),
rb/troca2.mjs (mesma string na fonte e no conteudo.json, 1 ocorrência em cada; lista em .mjs).
Depois de cada lote: node ferramentas/ajustes-conteudo.mjs (atualiza busca, confere desatualizadas),
build + teste + teste-explorar, commit só da fonte e do conteudo.json.

## Andamento
- [x] 03 Livros da Bíblia (66 lidas + índice sem conteúdo bíblico; 36 corrigidas, 68 trocas)
- [x] 08 Versículos (153 lidas + índice; 82 corrigidas, 130 trocas)
- [x] 05 Hermenêutica, 14 Alianças, 00 Início (20 lidas; 15 corrigidas, 37 trocas) + 2 ajustes tardios em Versículos (Mt 7.1 "tábua"; Gn 9.13 lembrete)

## Correções

### 03 Livros da Bíblia
- 1 João: "todo espírito que confessa que Jesus Cristo veio em carne" (ARA) -> NBV 1 Jo 4.2; "pratica o pecado é do diabo" -> NBV 3.8
- 1 Samuel: Saul rejeitado "pela aparência" -> por desobedecer (1 Sm 13.14; 15.23); "Samuel, o último juiz" -> "juiz de Israel" (8.1: os filhos foram juízes)
- 2 Samuel: "reinado sobre todo o Israel unido" -> primeiro só Judá (2 Sm 5.5)
- 2 Tessalonicenses: motivo inventado ("achando que Cristo voltaria") -> 3.11; "homem da rebeldia" -> "rebelião" (2.3)
- 2 e 3 João: autor "se identifica como 'o presbítero'" (nenhuma Bíblia do app; a NBV traz "João, o ancião") -> "no original, se chama só de 'o ancião'"
- 3 João: "Cristo não é citado muitas vezes" -> o nome nem aparece; "por causa do Nome" (v. 7); "a carta mais pessoal do NT" -> "bem pessoal"
- 2 Coríntios: "a carta em que Paulo mais fala de si" -> "uma das cartas"
- 2 Crônicas: "habitou entre nós" -> "morou aqui na terra entre nós" (Jo 1.14)
- Ageu: "parada havia quase quinze anos" -> "fazia anos"; "promessa sobre o Messias" (2.20-23) -> "promessa a Zorobabel"; "considerar os caminhos" -> "em como vocês têm agido" (Ag 1.7)
- Colossenses: "a imagem do Deus invisível" -> "a semelhança perfeita" (Cl 1.15)
- Daniel: "Ancião de Dias" -> "ancião"; "semelhante a um filho do homem" (Dn 7.13)
- Deuteronômio: Dt 18.15 pela NBV
- Eclesiastes: "tudo é vaidade" -> "tudo é ilusão"
- Ester: Mardoqueu -> Mordecai (grafia da NBV)
- Êxodo: "nosso Cordeiro pascal" -> "foi sacrificado por nós" (1 Co 5.7)
- Pentateuco (5 livros): data "séc. XV-XIII a.C." -> "(tradicional)", como a autoria
- Gênesis: "Gênesis foi escrito pra Israel recém-saído do Egito" -> "Pela tradição"; Gn 3.15 "descendência" -> "o descendente"; "É o primeiro anúncio" -> "os cristãos leem aqui"; "todas as nações" -> "todos os povos" (12.3)
- Habacuque: "o justo viverá pela fé (Hc 2:4)" -> NBV "O justo, porém, confia em mim e viverá", e a forma de Paulo com Gl 3.11
- Hebreus: destinatários judeus perseguidos dados como fato -> "parece" (Hb 10.32-34); "desde cedo... Apolo" (Apolo é sugestão bem posterior) -> separado
- Jeremias: "cumprida no sangue de Jesus (Hb 8)" -> Hb 8.6-12 aplica a Jesus
- Jó: "deseja um mediador (9.33)" -> NBV "não há um juiz"
- João: "Verbo" -> "Palavra" (NBV Jo 1.14); sinóticos antes -> "provavelmente"; "sete sinais e sete 'Eu sou'" (contagem de estudiosos) -> sem número; Jo 20.31 pela NBV
- Joel: "sobre toda carne" -> "sobre todos os povos" (Jl 2.28)
- Jonas: "Nínive, capital da Assíria" (anacronismo) -> "a grande cidade" (Jn 1.2); "preconceito nacionalista" -> o motivo que o texto dá (4.2)
- Judas: "Cristo tem poder pra guardar 'sem queda'" -> o louvor é "ao único Deus, que nos salva por meio de Jesus Cristo", "de escorregar e cair" (Jd 24-25)
- Juízes: "Sem um rei fiel" -> "Sem rei em Israel" (Jz 21.25)
- Lamentações: "grande é a tua fidelidade" -> "sua" (Lm 3.23)
- Lucas: "Lucas era médico" como fato -> "Pela tradição" (Cl 4.14); Teófilo "provavelmente" gentio
- Malaquias: "antes de séculos sem profetas" -> "sem novos livros de profetas"
- Marcos: "em resgate por muitos" -> NBV "a fim de salvar a muitos" (Mc 10.45; resumo e texto); autoria "(tradicionalmente)"; "No manuscrito mais antigo" -> "Nos manuscritos"
- Números: "Uma geração inteira" -> com exceção de Josué e Calebe (Nm 14.30); "era curado" -> "escapava com vida" (21.8-9)
- Provérbios: "outros sábios" (22.17; 24.23); "copiados por Ezequias" -> "pelos secretários do rei Ezequias" (25.1)
- Romanos: "de Corinto" -> "provavelmente"; "mais organizada do que em qualquer outra" -> "bem organizada"
- Rute: "estrangeira sem direitos em Israel" (ela colhe pelo direito de Lv 19.10) -> "vinda de Moabe"
- Salmos: "O Salmo 22 descreve a crucificação" -> Jesus o repete na cruz e os evangelhos ligam (Mt 27.46)
- Sofonias: "pouco antes das reformas" -> "provavelmente antes"; "cantará" (não está na NBV) -> "com gritos de alegria" (Sf 3.17)

### 08 Versículos
- Tempos errados em "Onde mais aparece": Gn 3.15 -> 12.3 "c. 700 anos" (pelas genealogias são uns 2000) -> sem número; Gn 3.15 -> Is 53 "c. 1300"; Gn 6.5 <-> 9.13 "cerca de 1 ano" (o texto não dá); Êx 12 -> Lv 17 "c. 5 anos" -> cerca de um ano, no Sinai; Êx 33 -> Js 1 "c. 50" -> c. 40; Êx 20 "c. 550 anos" depois da promessa -> Gl 3.17 (430); Gn 28 -> Gn 12 "c. 100" -> mais de um século; 1 Sm 16 -> 2 Sm 7 "c. 20" -> décadas; Sl 19 -> Gn 1 "1000 anos depois" -> séculos antes; Js 24 <-> Jz 21 "300 anos" (Jz 20.28 tem Fineias vivo); Fp 4 <-> Mt 6.33 "c. 20" -> 30; datas que dependem de autoria debatida (Is 40-55, Eclesiastes, Salmos 119/130 sem título) -> sem número
- Referência errada: Gn 15.6 "citado em Rm 3.23" -> é Rm 4.3; Hc 2.4 "citado em Rm 1.16" -> 1.17; Joel 2.28 "citado em At 2.38" -> 2.16-21; Êx 12 "Cordeiro pascal em 1 Co 15" -> 1 Co 5.7; Êx 3.14 "Eu sou em Jo 8.31-32" -> 8.58; Jr 1.5 "Sl 139.23-24 fala da formação" -> 139.13; Sl 23 "pastor em Jo 14.6" -> 10.11; Gn 22 / Jo 1.14 cordeiro -> Jo 1.29; Lv 17 / Hb 4.12 sacrifícios -> Hb 9-10
- Redação de outra tradução: "segundo a carne" (2 Co 5.16), "toda a casa de Israel" (Ez 37.11), "obras da carne" (Gl 5.19), "uma só carne" (Gn 2.24), "vale da sombra da morte" (Sl 23.4), "das profundezas" (Sl 130.1), "que faremos?" (At 2.37), "mansidão" (1 Pe 3.15), "misericórdia" (Os 6.6), "espinho na carne" (2 Co 12.7), "vaidade" (Ec), "suave sussurro" (1 Rs 19.12), "em resgate" (Mc 10.45: NBV "a fim de salvar", resgate só com a Bíblia Livre), "circuncisão do coração" (Dt 30.6: a NBV diz "coração fiel"; citada a Bíblia Livre), "Deus Forte" (Is 9.6), "o tudo" (Fp 4.13), "canta" (Sf 3.17), "segundo as Escrituras" duas vezes (1 Co 15.3-4: NBV "de acordo com" e "segundo")
- Evangelho misturado: Mt 22.37 "o Senhor é um só" é da versão de Marcos (12.29)
- Detalhe fora do texto: Elias "procura Deus no vento" (1 Rs 19); Nm 6 "primeiro ano depois do Sinai" (é no Sinai, 2º ano); Js 24 "com um altar"; Ne 8 motivo do choro; Mt 11.28 exigências dos líderes (é Mt 23.4); At 17.10 "expulsos" (saíram às pressas); At 4.12 "sob ameaça" (as ameaças vêm depois); Gn 50.15 "pânico... certeza" (NBV "é possível"); Gn 50.20 "a família inteira" (NBV "muitas pessoas"); Is 6 "Deus o purifica" (é um serafim); Sl 34 título NBV "Abimeleque" (Aquis está em 1 Sm 21); Jó 1 "o acusador" (NBV "Satanás") e "não sabe nada" (conclusão do silêncio); Rm 8.28 "Deus trabalha" (NBV e BLivre: as coisas contribuem); Is 40-43 "povo que ainda vai viver o exílio" (Is 40.2 fala do sofrimento acabado)
- Tradição de pregação: Sl 103 "leste e oeste nunca se encontram, norte e sul são pontos fixos"; Sl 121 "santuários de outros deuses nos montes"; Sl 46.10 e 1 Rs 19 "Deus se mostra na quietude"; Gn 3.15 "é o primeiro anúncio" -> "os cristãos leem aqui"
- Absolutos: Gn 22 "primeira vez que a Bíblia mostra alguém morrendo no lugar de outro"; Êx 34 "citado dezenas de vezes"; Êx 33 "uma das poucas vezes em que Moisés recebe o que pediu"; Nm 6 "a bênção mais repetida"; Is 53 "antes de existir crucificação"
- Rm 8.1: a nota citava a NVI e dizia que a frase final é acréscimo de copistas com conclusão doutrinária; a Bíblia Livre do app traz a frase -> explicação neutra (está em parte das cópias, não nas mais antigas; aparece no v. 4)

### 05 Hermenêutica, 14 Alianças, 00 Início
- Erros comuns: "cinco pedras ... 2 Sm 21.22 registra que Golias tinha parentes" (a própria ligação é pregação) -> tirado
- Os quatro contextos: Pv 21.9 "canto do terraço" só na Bíblia Livre (NBV "barraco"); Laodiceia água morna/colírio -> "segundo estudiosos"; Rm 8.26 "como convém" -> NBV "não sabemos como orar"
- OIA: "mas Deus" (Ef 2.4) e "portanto" (2.11) não estão na NBV -> NBV + Bíblia Livre
- Tipologia: 1 Co 10.4 "e essa rocha era Cristo" (ARA) -> NBV; Tg 2.25 elogia o que Raabe fez, não a fé; coberturas do tabernáculo erradas ("pele de bode", "peixe-boi") -> Êx 26 na NBV
- Como ler profecia: Is 11.6 "lobo e cordeiro pastando" (é Is 65.25) -> "lobo e ovelha vivendo juntos"; Is 2.4 "espadas" -> "armas"; Is 7.16 pela NBV
- Por que interpretar: "Não julgueis" -> "Não julguem"; "cinco versículos depois" -> quatro (Mt 7.5)
- Gêneros: "quase quarenta por cento da Bíblia" (sem base) -> "uma parte enorme"
- Aliança com Abraão: "todas as famílias da terra" (ARA) -> "todos os povos"; "Deus assume os dois lados... a conta é dele" como fato -> "muitos estudiosos leem"
- Aliança com Davi: "vara de homens" -> "castigo de homens" (2 Sm 7.14); "os profetas seguem falando do tronco de Jessé" (Is 11 é antes da queda) -> "já falavam"; Ap 19.16 não fala de Davi -> Ap 5.5 e 22.16; Lc 1.32-33 "as mesmas palavras" -> "retoma a promessa"
- Aliança com Noé: "o arco existe pra Deus lembrar, e não pra gente" (conclusão do silêncio; 9.12 diz "sinal entre mim e vocês") -> Gn 9.15-16
- Nova aliança: "Jerusalém caindo na frente dele" -> "nos anos em que cai"; "sem intermediário" -> Jr 31.34 NBV; "todo judeu ali conhecia Jeremias 31" -> tirado; "não precisa de intermediário humano" (soava como ataque a outras igrejas, como ontem em Templo) -> Hb 10.19
- Início: "quarenta autores e mil e quinhentos anos" -> "cerca de quarenta" e "mais de mil" (igual ao resumo); "quatrocentos anos sob domínio estrangeiro" -> "séculos, quase sempre sob domínio estrangeiro"; "fichas trazem o campo de aliança" (não existe) -> contexto histórico

## Para o dono decidir
- 05 Hermenêutica/Como ler profecia: Isaías 7.14 é apresentado com "cumprimento imediato" no séc. VIII a.C., "com uma criança de verdade nascida naquele tempo", e depois em Cristo. É uma leitura conhecida, mas muitas igrejas leem o versículo como profecia só do nascimento virginal de Jesus. O texto afirma isso como fato; decidir se vira "uma leitura comum entre estudiosos".
- 05 Hermenêutica/Como ler profecia: diz que "Esta nota não decide isso por você", mas logo depois afirma que "uma fera com dez chifres fala de poder político que oprime, e não de alguém que só quem vive séculos depois conseguiria identificar" (Daniel 7.24 fala de dez reis). Isso toma partido contra a leitura futurista. Sugestão: tirar a segunda metade da frase.
- 14 Alianças/Aliança do Sinai e 05 Gêneros: a divisão em leis morais, civis e cerimoniais é da tradição reformada; em Gêneros há a ressalva "mesmo que o próprio texto não separe", no Sinai não. Igrejas divergem (sábado, dízimo). Sugestão: repetir a ressalva no Sinai.
- 00 Início: "A Bíblia tem sessenta e seis livros". Leitores de lar católico conhecem uma Bíblia com 73. Não mexi.
- 08 Versículos/Jeremias 1.5, "Cuidado com o uso errado": diz que o versículo não entra "em debates sobre o começo da vida" e que "o que está em jogo é chamado e missão, e não biologia". Muitas igrejas evangélicas usam o texto na defesa da vida desde a concepção; o assunto divide. Não mexi.
- 08 Versículos/Joel 2.28, "Cuidado com o uso errado": liga o cumprimento ao Pentecostes e diz que não é "promessa solta pra ser cobrada a qualquer momento". Igrejas pentecostais leem Atos 2.39 ("para todos os que estão longe") como promessa que continua. Tema que divide; não mexi.
- 08 Versículos/Apocalipse 3.20: afirma que o versículo não é convite a quem não é cristão, só a uma igreja morna. É a leitura do contexto, mas o uso evangelístico é muito comum nas igrejas; decidir se o tom fica ("Quase sempre esse versículo aparece solto").
- 08 Versículos/2 Crônicas 7.14 e Ageu (Livros): continuam dizendo que o texto é de Israel sob a aliança do Sinai e não vale "automaticamente" para países de hoje. Está correto pelo contexto; só aviso que é tema político sensível.
- 03 Livros/Cânticos, resumo e "Do que o livro fala": o amor do casal "mostra um pouco de como é o amor dele (de Deus)". O livro não cita Deus (CLAUDE.md das reflexões). É leitura teológica comum, não texto; decidir se fica.
- 03 Livros/Eclesiastes: a ficha diz "Tradicionalmente Salomão", e a NBV escreve em Ec 1.1 "Palavra do Pregador Salomão" (o nome não está no original). Não mexi.
