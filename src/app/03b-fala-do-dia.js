/* A frase do balão do dia na trilha. Era a fala do mascote Bento; o desenho dele e os
   personagens saíram do app, e ficou só o texto, que continua útil: diz o que ler hoje,
   conta quando um amigo já leu, e anima quem voltou sem cobrar. */
(function (CC) {
  'use strict';

  // ---------- a frase do dia ----------
  // Frases curtas, no tom de quem caminha junto. Nada que cobre ou culpe quem parou, e
  // a frase nunca fala em nome de Deus.
  const FALAS = {
    primeiroDia: [
      'Seu primeiro dia é {passagem}: a primeira página da Bíblia e a primeira do Novo Testamento, juntas de propósito. Uns {min} minutos. Bora?',
    ],
    comecando: [
      'Hoje tem {passagem}. Vamos?',
      'Um capítulo de cada vez. Bora começar?',
      'Seu passo de hoje: {passagem}.',
    ],
    emDia: [
      'Lição de hoje feita! Mais um dia guardado.',
      'Mandou bem hoje. Até amanhã!',
      'Passo dado é passo que não se perde.',
    ],
    ofensiva: [
      '{n} dias de ofensiva! A leitura está virando hábito.',
      '{n} dias de estrada. Olha até onde chegamos!',
    ],
    voltando: [
      'Que bom te ver! Vamos recomeçar hoje?',
      'A estrada esperou por você. O plano continua de onde parou.',
    ],
    quaseLa: [
      'Faltam poucos dias para fechar esta unidade. Bora?',
    ],
  };

  const sorteio = (lista, semente) => lista[semente % lista.length];

  // A frase muda por dia, não a cada toque: um balão que tagarela cansa. Quando um
  // amigo já leu e você ainda não, é isso que ele conta.
  CC.falaDoDia = function (amigos) {
    const seq = CC.sequencia();
    const lidos = CC.ler('lidos', []).length;
    const hoje = CC.hojeIso();
    const semente = Number(hoje.slice(8, 10)) + Number(hoje.slice(5, 7));
    const atual = CC.diaAtual();
    const passagem = CC.passagemDe(CC.D.plano[atual - 1]).replace(' · ', ' e ');
    const trocar = (t) => t.replace('{passagem}', passagem).replace('{n}', seq.atual).replace('{min}', CC.minutosDoDia(CC.D.plano[atual - 1]));

    if (!lidos) return trocar(FALAS.primeiroDia[0]);
    const leuAmigo = ((amigos && amigos.amigos) || []).find((a) => a.leuHoje);
    if (!seq.feitoHoje && leuAmigo) return leuAmigo.nome + ' já leu hoje. Que tal ler também?';
    if (!seq.feitoHoje && seq.atual === 0) return trocar(sorteio(FALAS.voltando, semente));

    const u = CC.unidadeDoDia(atual);
    const p = CC.progressoUnidade(u);
    if (!seq.feitoHoje && p.total - p.feitos <= 3 && p.feitos > 0) return trocar(sorteio(FALAS.quaseLa, semente));

    if (seq.feitoHoje) return trocar(sorteio(seq.atual >= 3 ? FALAS.ofensiva : FALAS.emDia, semente));
    return trocar(sorteio(FALAS.comecando, semente));
  };
})(window.CC);
