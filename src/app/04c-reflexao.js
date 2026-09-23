/* Guardar, pensar, orar: o que vem depois da leitura. Cada dia tem um versículo para
   guardar, escolhido dentro da própria leitura e de preferência mostrando quem Deus é.
   Nos poucos dias em que nenhum versículo sozinho ajuda (genealogia, fala dos amigos de
   Jó, poesia de amor), entra uma nota curta de contexto. As perguntas e os começos de
   oração seguem o tipo de texto. Nada disso é doutrina: são sugestões para a pessoa
   pensar e orar do jeito dela, e não valem pontos. */
(function (CC) {
  'use strict';

  const D = CC.D;

  // dia do plano, versículo para guardar
  const ESCOLHIDOS = `
1 Gênesis 1.27
2 Gênesis 5.24
3 Gênesis 6.8
4 Mateus 3.17
5 Mateus 4.4
6 Gênesis 15.6
7 Mateus 5.16
8 Mateus 6.33
9 Gênesis 22.8
10 Mateus 7.11
11 Gênesis 28.15
12 Mateus 9.36
13 Gênesis 32.10
14 Mateus 10.30-31
15 Mateus 11.28-30
16 Gênesis 39.2
17 Mateus 12.20
18 Mateus 13.44
19 Mateus 14.27
20 Gênesis 50.20
21 Êxodo 3.14
22 Mateus 16.16
24 Mateus 17.5
25 Êxodo 14.13
26 Êxodo 15.2
27 Êxodo 19.4
28 Êxodo 20.2-3
29 Mateus 21.9
30 Êxodo 25.8
31 Mateus 22.37-39
32 Mateus 23.37
33 Êxodo 33.14
35 Mateus 25.40
36 Mateus 26.39
38 Mateus 27.54
39 Mateus 28.19-20
40 Levítico 11.45
41 Marcos 1.41
42 Marcos 2.17
43 Levítico 19.18
44 Levítico 20.26
45 Marcos 4.39
46 Levítico 26.12
48 Marcos 6.31
49 Números 6.24-26
50 Marcos 8.29
51 Números 11.23
52 Marcos 9.24
53 Marcos 10.45
54 Números 20.16
55 Números 23.19
56 Marcos 12.30
57 Marcos 13.31
58 Números 30.2
59 Marcos 14.36
60 Marcos 15.39
61 Deuteronômio 1.31
62 Marcos 16.6
63 Deuteronômio 6.4-5
64 Deuteronômio 8.3
65 Deuteronômio 11.18
66 Lucas 3.22
67 Lucas 4.18
68 Deuteronômio 20.4
69 Lucas 5.32
70 Lucas 6.36
71 Lucas 7.50
72 Deuteronômio 30.6
73 Deuteronômio 31.6
74 Josué 1.9
75 Josué 3.5
76 Lucas 10.41-42
77 Lucas 11.13
78 Lucas 12.32
79 Josué 14.8
80 Lucas 13.19
81 Lucas 14.11
82 Josué 21.45
83 Lucas 15.20
84 Lucas 16.10
85 Lucas 17.15
86 Juízes 6.12
87 Lucas 18.13
88 Lucas 19.10
89 Juízes 15.19
90 Lucas 20.38
91 Lucas 21.28
92 Rute 1.16
93 Rute 4.14
94 1 Samuel 3.10
95 Lucas 24.32
96 1 Samuel 7.12
97 João 1.14
98 1 Samuel 12.24
99 1 Samuel 16.7
100 1 Samuel 17.47
101 João 4.14
102 João 5.24
103 1 Samuel 25.32
104 João 6.35
105 João 7.37
106 João 8.12
107 2 Samuel 5.10
108 João 9.25
109 João 10.11
110 2 Samuel 12.13
111 João 11.25
112 João 12.46
114 2 Samuel 22.31
115 João 14.27
116 João 15.5
117 1 Reis 6.13
118 João 16.33
119 João 17.17
121 1 Reis 17.16
122 João 19.30
123 João 20.31
124 2 Reis 2.9
125 João 21.17
126 Atos 1.8
128 Atos 2.42
129 Atos 3.19
130 Atos 4.12
131 2 Reis 19.15
132 Atos 5.29
133 Atos 6.4
135 Atos 7.60
136 Atos 8.35
137 Atos 9.15
138 1 Crônicas 12.18
139 1 Crônicas 16.11
140 1 Crônicas 17.20
141 1 Crônicas 21.13
142 Atos 12.5
143 Atos 13.47
144 1 Crônicas 29.14
145 2 Crônicas 1.10
146 Atos 15.11
147 Atos 16.31
148 2 Crônicas 9.8
149 Atos 17.11
150 2 Crônicas 15.2
151 2 Crônicas 16.9
152 2 Crônicas 20.12
153 Atos 20.35
154 Atos 21.14
155 2 Crônicas 26.5
156 2 Crônicas 30.9
157 2 Crônicas 33.12-13
158 Atos 24.16
159 Esdras 1.5
160 Esdras 3.11
161 Esdras 7.10
162 Esdras 9.9
163 Atos 27.25
164 Neemias 4.14
165 Romanos 1.16
166 Neemias 8.10
167 Romanos 2.4
168 Romanos 3.23-24
169 Ester 4.14
170 Romanos 4.21
171 Romanos 5.8
172 Romanos 6.4
174 Romanos 7.24-25
175 Romanos 8.38-39
176 Jó 12.10
178 Romanos 10.17
179 Jó 19.25
181 Romanos 12.2
182 Romanos 13.10
183 Jó 28.28
184 Romanos 14.8
185 Romanos 15.13
186 Jó 37.14
187 Jó 38.4
188 Jó 42.5
189 Salmos 1.1-2
190 Salmos 4.8
191 Salmos 8.3-4
192 Salmos 9.10
193 Salmos 13.5
194 Salmos 16.11
195 Salmos 18.2
196 Salmos 19.14
197 Salmos 23.4
198 Salmos 25.4-5
199 Salmos 27.14
200 Salmos 30.5
201 Salmos 34.18
202 Salmos 36.7
203 Salmos 37.5
204 Salmos 40.3
205 Salmos 42.11
206 Salmos 46.10
207 Salmos 49.15
208 Salmos 51.10
209 Salmos 54.4
210 Salmos 55.22
211 Salmos 57.10
212 Salmos 62.8
213 Salmos 63.3
214 Salmos 66.20
215 2 Coríntios 4.7
216 2 Coríntios 5.17
217 Salmos 73.25-26
218 Salmos 77.11
219 Salmos 78.4
220 2 Coríntios 8.9
221 Salmos 84.11
222 Salmos 86.11
223 Salmos 90.12
224 Salmos 91.1-2
225 Salmos 95.6
226 2 Coríntios 12.9
227 Salmos 100.5
228 Salmos 102.27
229 Salmos 103.11-12
230 Gálatas 2.20
231 Gálatas 3.26
232 Salmos 112.7
233 Gálatas 4.6-7
234 Gálatas 5.22-23
235 Salmos 119.105
236 Salmos 121.2
237 Efésios 1.7
238 Efésios 2.8-9
239 Salmos 130.3-4
240 Efésios 3.20
241 Efésios 4.32
242 Salmos 138.8
243 Salmos 139.14
244 Efésios 6.10
245 Filipenses 1.6
246 Salmos 147.3
247 Filipenses 2.13
248 Provérbios 3.5-6
249 Provérbios 4.23
250 Filipenses 4.6-7
251 Provérbios 9.10
252 Colossenses 2.6-7
253 Provérbios 16.9
254 Colossenses 3.1-2
255 Colossenses 4.2
256 Provérbios 23.26
257 1 Tessalonicenses 1.3
258 Provérbios 27.17
259 Provérbios 30.5
260 Eclesiastes 3.11
261 Eclesiastes 4.9-10
262 1 Tessalonicenses 5.16-18
264 Eclesiastes 12.1
265 2 Tessalonicenses 2.16-17
267 Isaías 1.18
268 1 Timóteo 1.15
269 Isaías 6.8
270 Isaías 7.14
271 Isaías 9.6
272 1 Timóteo 4.12
273 Isaías 14.27
274 Isaías 17.7
275 1 Timóteo 6.6
276 2 Timóteo 1.7
277 Isaías 26.3
278 2 Timóteo 2.13
279 2 Timóteo 3.16-17
280 Isaías 33.2
281 Isaías 35.4
282 Isaías 38.17
283 Isaías 41.10
284 Isaías 43.1-2
285 Tito 3.5
286 Isaías 49.15
287 Isaías 50.4
288 Isaías 53.5
289 Isaías 55.11
290 Hebreus 3.13
291 Isaías 60.1
292 Hebreus 4.16
293 Jeremias 1.7-8
294 Jeremias 2.13
295 Hebreus 6.19
296 Hebreus 7.25
297 Hebreus 8.12
298 Jeremias 13.11
299 Jeremias 15.16
300 Jeremias 17.7-8
301 Jeremias 20.9
302 Hebreus 11.1
303 Hebreus 12.1-2
304 Jeremias 29.13
305 Jeremias 31.3
306 Tiago 1.5
307 Tiago 2.17
308 Jeremias 39.18
309 Tiago 3.17
310 Tiago 4.8
311 Tiago 5.16
313 1 Pedro 1.3
314 1 Pedro 2.9
315 Lamentações 3.22-23
316 1 Pedro 3.15
317 1 Pedro 4.10
318 1 Pedro 5.7
319 Ezequiel 10.4
320 2 Pedro 1.19
321 2 Pedro 2.9
322 Ezequiel 18.32
323 2 Pedro 3.9
324 1 João 1.9
325 1 João 2.1
327 1 João 3.1
328 1 João 4.19
329 Ezequiel 34.16
330 Ezequiel 36.26
331 2 João 1.6
332 Ezequiel 43.2
333 3 João 1.4
334 Judas 1.24
335 Daniel 3.17-18
336 Daniel 4.37
337 Daniel 6.10
338 Apocalipse 3.20
339 Daniel 12.3
340 Apocalipse 4.11
341 Oseias 6.3
343 Oseias 11.4
344 Oseias 14.4
345 Joel 2.13
346 Joel 3.16
348 Amós 5.4
349 Amós 9.14
350 Jonas 2.7
351 Jonas 4.2
352 Miqueias 2.13
353 Miqueias 5.2
354 Miqueias 7.18
355 Apocalipse 15.3
356 Habacuque 3.17-18
357 Sofonias 3.17
358 Ageu 2.4
359 Zacarias 2.10
360 Zacarias 4.6
361 Apocalipse 19.6
362 Zacarias 9.9
363 Apocalipse 21.5
364 Zacarias 14.9
365 Apocalipse 22.20
`;

  // Dias em que um versículo solto confundiria mais do que ajudaria.
  const NOTAS = {
    23: 'As pragas mostram o Senhor enfrentando os deuses do Egito e um faraó que endurece o coração. O que Deus quer é ser conhecido e libertar o seu povo.',
    34: 'O povo constrói o Tabernáculo com ofertas dadas de boa vontade e com talentos que o próprio Espírito de Deus deu. Deus usa as habilidades de cada um para preparar o lugar da sua presença.',
    37: 'Os sacrifícios de Levítico mostram que o pecado custa caro e que é Deus quem abre um caminho de perdão. A carta aos Hebreus vai dizer que tudo isso apontava para Jesus.',
    47: 'Números começa organizando o povo ao redor do Tabernáculo: Deus no centro do acampamento, e cada tribo com o seu lugar e o seu nome.',
    177: 'Jó leva a Deus perguntas duras e continua falando com ele, mesmo sem entender o que está vivendo. A fé também aparece assim: insistindo em buscar a Deus no meio da dor.',
    263: 'Eclesiastes olha a vida sem maquiagem: tudo passa, e ninguém controla o futuro. Por isso ensina a receber cada dia como presente de Deus e a viver com sabedoria o tempo que temos.',
    312: 'Jeremias anuncia o julgamento de Deus sobre as nações vizinhas de Israel. No meio disso aparece o cuidado de Deus com órfãos e viúvas: nem no juízo ele esquece os mais frágeis.',
    326: 'Ezequiel anuncia a queda de Tiro, uma cidade rica que se achava dona de si. O texto expõe o orgulho que tenta ocupar o lugar de Deus e termina prometendo segurança ao povo de Deus.',
    347: 'Amós denuncia um povo que mantinha a religião em dia e explorava os pobres. Deus não aceita culto de quem fecha os olhos para a injustiça, e mesmo assim continua chamando o povo de volta.',
    113: 'Depois da revolta de Absalão, Davi volta ao trono no meio de feridas de família e de guerra. A história não esconde o preço do pecado, mas mostra Deus mantendo a promessa que fez a Davi.',
    120: 'Jeroboão recebeu um reino e trocou a adoração ao Senhor por ídolos que ele mesmo inventou. O texto convida a perguntar o que tenta ocupar o lugar de Deus no coração.',
    127: 'Jeú acaba com a família do rei Acabe, como Deus tinha anunciado, mas não segue o Senhor de todo o coração. Fazer a coisa certa sem entregar o coração a Deus ainda não é ser fiel.',
    134: 'Hoje a leitura é uma lista de nomes. Parece pouco, mas mostra que Deus acompanha famílias e gerações inteiras: nenhum nome some da história que chega até Jesus.',
    173: 'Jó 3 é um lamento sem enfeite. A Bíblia deixa espaço para a dor ser dita a Deus, e o próprio Deus vai responder a Jó no fim do livro.',
    180: 'Nos capítulos de hoje falam os amigos de Jó. No fim do livro, Deus diz que eles não falaram o que era certo sobre ele. Ler Jó ensina a não tirar conclusões rápidas sobre o sofrimento de ninguém.',
    266: 'Cânticos celebra o amor entre um homem e uma mulher como presente de Deus, com beleza, desejo e compromisso.',
    342: 'Oseias e o Apocalipse de hoje falam do julgamento de Deus. São textos difíceis de propósito: mostram que Deus leva o mal a sério. E o livro de Oseias termina com Deus chamando o seu povo de volta.',
  };

  const MAPA = new Map(ESCOLHIDOS.trim().split('\n').map((linha) => {
    const m = /^(\d+) (.+)$/.exec(linha.trim());
    return [Number(m[1]), m[2]];
  }));
  CC.versiculosEscolhidos = () => MAPA;
  CC.notasDeReflexao = () => NOTAS;

  // ---------- o tipo de texto ----------
  const CARTAS = ['Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 'Colossenses',
    '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom', 'Hebreus', 'Tiago',
    '1 Pedro', '2 Pedro', '1 João', '2 João', '3 João', 'Judas'];
  const PROFETAS = ['Isaías', 'Jeremias', 'Ezequiel', 'Oseias', 'Joel', 'Amós', 'Obadias', 'Miqueias', 'Naum',
    'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias'];

  CC.generoDe = (livro, cap) => {
    if (['Mateus', 'Marcos', 'Lucas', 'João'].includes(livro)) return 'evangelho';
    if (CARTAS.includes(livro)) return 'carta';
    if (livro === 'Apocalipse' || (livro === 'Daniel' && cap >= 7)) return 'apocalipse';
    if (PROFETAS.includes(livro)) return 'profecia';
    if (['Salmos', 'Cânticos', 'Lamentações'].includes(livro)) return 'poesia';
    if (['Jó', 'Provérbios', 'Eclesiastes'].includes(livro)) return 'sabedoria';
    if (livro === 'Levítico' || livro === 'Deuteronômio') return 'lei';
    if (livro === 'Êxodo' && ((cap >= 20 && cap <= 31) || cap >= 35)) return 'lei';
    if (livro === 'Números' && [5, 6, 15, 18, 19, 28, 29, 30].includes(cap)) return 'lei';
    return 'narrativa';
  };

  // As perguntas dos dias sem reflexão escrita. Valem para qualquer trecho daquele tipo de
  // texto, inclusive os difíceis (os amigos de Jó, que falam errado sobre Deus; profecias de
  // juízo; as histórias violentas de Juízes), então não podem afirmar nada sobre a passagem:
  // partem do que a pessoa leu e do que chamou a atenção dela. Nada de pergunta de aula ("por
  // que o povo precisava ouvir isso naquele tempo?"), que quem acabou de se converter não sabe
  // responder. Regras de escrita e de fidelidade: ferramentas/reflexoes/CLAUDE.md.
  CC.GENEROS = {
    narrativa: {
      nome: 'uma história',
      perguntas: [
        'Na leitura de hoje, o que Deus fez ou disse que chamou a sua atenção?',
        'Tem alguém nessa história que passou por algo parecido com o que você vive agora? O que você quer conversar com Deus sobre isso?',
      ],
      oracao: ['Senhor, na leitura de hoje eu vi…', 'Eu me identifiquei com… porque…', 'Me ajuda hoje a…'],
    },
    lei: {
      nome: 'instruções de Deus ao seu povo',
      perguntas: [
        'Que instrução da leitura de hoje mostra algo que importa para Deus?',
        'Como você pode amar a Deus ou alguém perto de você hoje, de um jeito prático?',
      ],
      oracao: ['Senhor, eu vi que tu te importas com…', 'Obrigado porque Jesus cumpriu o que eu não consigo…', 'Me ensina a amar a ti e ao próximo em…'],
    },
    poesia: {
      nome: 'poesia e oração',
      perguntas: [
        'Qual verso de hoje mais falou com você? Por quê?',
        'Que frase daqui você pode transformar numa oração sua hoje?',
      ],
      oracao: ['Senhor, tu és…', 'Hoje o meu coração está…', 'Por isso eu te peço…'],
    },
    sabedoria: {
      nome: 'sabedoria',
      perguntas: [
        'Qual frase do texto de hoje mais mexeu com você? Por quê?',
        'Em que situação desta semana você precisa da sabedoria de Deus?',
      ],
      oracao: ['Senhor, eu preciso da tua sabedoria em…', 'Hoje eu percebi que…', 'Me ajuda a escolher bem quando…'],
    },
    profecia: {
      nome: 'profecia',
      perguntas: [
        'No meio das palavras duras ou das promessas de hoje, o que você percebe que Deus quer do povo dele?',
        'Tem alguma área da sua vida em que Deus está te chamando de volta para perto dele?',
      ],
      oracao: ['Senhor, tu cumpres o que prometes…', 'Me perdoa quando eu…', 'Eu quero voltar para perto de ti em…'],
    },
    evangelho: {
      nome: 'a vida de Jesus',
      perguntas: [
        'O que Jesus fez ou disse na leitura de hoje que mais chamou a sua atenção?',
        'Se você estivesse ali, perto de Jesus, o que você gostaria de dizer ou pedir para ele?',
      ],
      oracao: ['Jesus, eu vi que tu…', 'Se eu estivesse ali, eu te diria…', 'Me ajuda hoje a te seguir em…'],
    },
    carta: {
      nome: 'uma carta para a igreja',
      perguntas: [
        'Que frase da carta de hoje você quer guardar no coração? Por quê?',
        'Que conselho dessa carta você pode colocar em prática esta semana?',
      ],
      oracao: ['Pai, obrigado porque em Jesus…', 'Hoje eu entendi que…', 'Me ajuda a viver isso em…'],
    },
    apocalipse: {
      nome: 'visões do fim da história',
      perguntas: [
        'Que imagem ou frase da leitura de hoje mostra que Deus está no controle?',
        'Que medo seu você quer entregar a Deus hoje?',
      ],
      oracao: ['Senhor, tu reinas sobre…', 'Eu entrego a ti o medo de…', 'Vem, Senhor Jesus, e…'],
    },
  };

  // A reflexão escrita para aquele dia, sobre o que acontece na leitura. A lista por dia é o
  // lugar da rotatividade que vem depois; enquanto houver uma só, é sempre ela.
  CC.reflexaoEscrita = (numero) => {
    const lista = (D.reflexoes || {})[numero] || (D.reflexoes || {})[String(numero)];
    return Array.isArray(lista) && lista.length ? lista[0] : null;
  };

  CC.reflexaoDoDia = (numero) => {
    const dia = D.plano[numero - 1];
    // O versículo do dia é o da reflexão escrita, quando ela traz um: o que a pessoa guarda,
    // o contexto que ela lê e as perguntas que ela responde falam todos da mesma passagem.
    const escritaRef = (CC.reflexaoEscrita(numero) || {}).ref;
    const ref = escritaRef || MAPA.get(numero) || null;
    const nota = NOTAS[numero] || '';
    const m = ref && /^(.+?) (\d+)\./.exec(ref);
    const livro = m ? m[1] : dia.trechos[0].livro;
    const cap = m ? Number(m[2]) : dia.trechos[0].de;
    const trecho = dia.trechos.find((t) => t.livro === livro && cap >= t.de && cap <= t.ate) || dia.trechos[0];
    const genero = CC.generoDe(livro, cap);
    const g = CC.GENEROS[genero];
    const idNota = '08 - Versículos/' + ref;
    // O que foi escrito para este dia manda. O gênero só cobre o dia que ainda não tem
    // reflexão própria, e some quando todos tiverem.
    const escrita = CC.reflexaoEscrita(numero);
    return {
      ref,
      nota,
      genero,
      nomeGenero: g.nome,
      passagem: trecho.livro + ' ' + trecho.de + (trecho.ate > trecho.de ? '-' + trecho.ate : ''),
      idNota: ref && D.notas[idNota] ? idNota : '',
      contexto: ref && D.notas[idNota] ? D.notas[idNota].resumo : '',
      titulo: escrita ? escrita.titulo : '',
      pensamento: escrita ? escrita.texto : '',
      // a reflexão fala de um trecho do dia, que nem sempre é o do versículo guardado
      passagemPensada: escrita && escrita.passagem ? escrita.passagem : '',
      perguntas: escrita ? escrita.perguntas : g.perguntas,
      oracao: escrita && escrita.oracao && escrita.oracao.length ? escrita.oracao : g.oracao,
    };
  };
})(window.CC);
