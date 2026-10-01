// Confere a inteligência (inteligencia.mjs, docs/inteligencia.md): as regras puras do painel
// de quem conduz a célula (chama, frequência, funil, ofensiva perdida, atenção com gatilhos) e
// do painel da igreja (ranking das células, frutos do mês, check-in, adoção), a cópia achatada
// das datas de leitura (leitura_dias) e, com servidor, quem vê o quê: o líder vê só a própria
// célula (com nomes), o membro comum não vê painel nenhum, só o admin vê a igreja (sem nome de
// pessoa) e abre qualquer célula; o que alguém escreveu e o check-in de uma pessoa nunca saem.
// Uso: node ferramentas/teste-inteligencia.mjs
import { spawn } from 'node:child_process';
import { rmSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8351;
const PASTA = join(tmpdir(), 'cc-inteligencia');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};
const somaDias = (texto, n) => { const d = new Date(texto + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dias = (desde, n) => Array.from({ length: n }, (_, i) => somaDias(desde, i));

const I = await import(pathToFileURL(join(AQUI, 'inteligencia.mjs')).href);
const B = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);

// As mesmas regras do navegador (a conta da ofensiva), carregadas como o servidor carrega.
function carregarRegras() {
  const D = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'conteudo.json'), 'utf8'));
  const contexto = createContext({
    window: { DADOS: D }, console, Date, Math, JSON, Object, Set, Map, Number, String, Array, Boolean, Intl,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    document: { documentElement: { dataset: {} }, querySelector: () => null },
    fetch: () => Promise.reject(new Error('sem rede')), setTimeout, clearTimeout, location: { protocol: 'file:' }, navigator: {}, addEventListener: () => {},
  });
  for (const f of ['01-nucleo.js', '02-estado.js', '02b-jogo.js']) runInContext(readFileSync(join(AQUI, 'src', 'app', f), 'utf8'), contexto, { filename: f });
  return contexto.window.CC;
}
const REGRAS = carregarRegras();

// ---------- regras puras: o líder ----------
console.log('\n  Inteligência: a célula (regras puras)\n');
{
  const HOJE = '2026-10-01';
  const t = I.termometro([true, true, false, true]);
  ok(t.acesos === 3 && t.total === 4 && t.pct === 75, 'o termômetro: 3 de 4 com a chama acesa dá 75%');
  ok(I.termometro([]).pct === null && I.termometro([]).total === 0, 'célula sem membro de verdade não tem porcentagem (null), não 0%');

  const sim = (datas) => REGRAS.simularOfensiva(datas, HOJE);
  ok(I.chamaAcesa(sim([HOJE])) && I.chamaAcesa(sim([somaDias(HOJE, -1)])), 'leu hoje ou ontem: chama acesa');
  ok(I.chamaAcesa(sim([somaDias(HOJE, -2)])), 'leu só anteontem: o escudo que todo mundo tem cobre o dia de ontem e a chama segue acesa, como no Início');
  ok(!I.chamaAcesa(sim([somaDias(HOJE, -3)])) && !I.chamaAcesa(sim([])), 'leu só há 3 dias (dois dias em branco, um escudo) ou nunca: chama apagada');
  const comEscudo = sim(dias(somaDias(HOJE, -19), 18)); // 18 dias seguidos até anteontem: ontem fica coberto por um escudo
  ok(I.chamaAcesa(comEscudo) && comEscudo.protegidos.length === 1 && comEscudo.atual === 18, 'o escudo do app cobre o dia em branco: a chama continua acesa, com os 18 dias');

  const f = I.frequencia([
    { data: '2026-09-10', presentes: ['a', 'b', 'c'], visitantes: 2 },
    { data: '2026-10-01', presentes: ['a', 'b', 'c', 'd'], visitantes: 1 },
    { data: '2026-09-17', presentes: ['a', 'b'], visitantes: 0 },
    { data: '2026-09-24', semEncontro: true, presentes: [], visitantes: 0 },
    { data: '2026-09-03', presentes: ['a'], visitantes: 9 }, // há exatamente 28 dias: fora da janela (data > referência-28)
    { data: '2026-06-23', presentes: ['a', 'b', 'c', 'd', 'e', 'f'], visitantes: 0 }, // meses atrás: fora
    { data: '2026-10-08', presentes: ['a', 'b'], visitantes: 0 }, // depois da referência: fora
  ], HOJE);
  ok(f.encontros.length === 4 && f.encontros.map((e) => e.data).join(',') === '2026-09-10,2026-09-17,2026-09-24,2026-10-01', 'os encontros das últimas 4 semanas até a referência, do mais antigo para o mais novo (o de 28 dias atrás e o de junho ficam fora)');
  ok(f.encontros[0].pessoas === 5 && f.encontros[1].pessoas === 2 && f.encontros[3].pessoas === 5, 'pessoas por encontro: presentes com conta mais os sem conta');
  ok(f.encontros[2].semEncontro && f.encontros[2].pessoas === null, 'a semana sem encontro aparece como tal, não como zero');
  ok(f.diferenca === 3 && f.tendencia === 'subindo', 'a tendência compara os dois últimos encontros de verdade (2 -> 5: subindo)');
  const antigo = I.frequencia([{ data: '2026-06-23', presentes: ['a', 'b', 'c', 'd', 'e', 'f'], visitantes: 0 }, { data: '2026-09-15', presentes: ['a', 'b', 'c', 'd'], visitantes: 1 }], HOJE);
  ok(antigo.encontros.length === 1 && antigo.encontros[0].data === '2026-09-15' && antigo.tendencia === null, 'um líder que ficou meses sem registrar: o encontro de junho não vira "encontro anterior" da tendência');
  ok(I.frequencia([{ data: '2026-09-24', presentes: [], visitantes: 0 }], HOJE).tendencia === null, 'com um encontro só não há tendência');
  ok(I.frequencia([], HOJE).encontros.length === 0, 'sem encontro registrado, lista vazia');
  ok(I.JANELA_FREQUENCIA === 28, 'a janela é a mesma da frequência média por célula no painel da igreja (28 dias)');

  const fu = I.funil([
    { marcos: {}, acompanha: 0, caminho: 'conhecer', passos: 0 },
    { marcos: {}, acompanha: 0, caminho: 'plano', passos: 12 },
    { marcos: {}, acompanha: 0, caminho: 'plano', passos: 3 },
    { marcos: { decisao: '2026-09-01' }, acompanha: 0, caminho: 'plano', passos: 12 },
    { marcos: { decisao: '2026-01-01', batismo: '2026-06-01' }, acompanha: 0, caminho: 'plano', passos: 12 },
    { marcos: { batismo: '2020-01-01' }, acompanha: 2, caminho: 'plano', passos: 12 },
    { marcos: { discipula: '2026-03-01' }, acompanha: 0, caminho: 'plano', passos: 5, usuario: 'g', nome: 'Gabi' },
    { marcos: {}, acompanha: 0, caminho: 'plano', passos: 1, usuario: 'h', nome: 'Zé' },
    { marcos: {}, acompanha: 0, caminho: 'plano', passos: 1, usuario: 'i', nome: 'Ana' },
  ]);
  const por = Object.fromEntries(fu.map((x) => [x.etapa, x]));
  ok(fu.map((x) => x.etapa).join(',') === 'comecando,decidiu,batizado,acompanha', 'o funil tem as 4 etapas, na ordem da caminhada');
  ok(por.comecando.pessoas === 5 && por.decidiu.pessoas === 1 && por.batizado.pessoas === 1 && por.acompanha.pessoas === 2, 'cada pessoa entra uma vez, na etapa mais adiante: 5 · 1 · 1 · 2');
  ok(por.acompanha.nomes.map((x) => x.nome).join(',') === 'Gabi' && por.comecando.nomes.map((x) => x.nome).join(',') === 'Ana,Zé' && por.decidiu.nomes.length === 0, 'quem trouxe nome sai em "nomes" da etapa, em ordem alfabética; quem não trouxe conta sem nome');
  ok(por.comecando.conhecendo === 1 && por.comecando.passosConcluidos === 1, 'no começo: 1 ainda conhecendo Jesus e 1 que já fechou os 12 passos');
  ok(fu.reduce((s, x) => s + x.pessoas, 0) === 9, 'a soma do funil é o total de pessoas');
  ok(I.funil([]).every((x) => x.pessoas === 0), 'funil vazio é só zero');

  // ofensiva perdida: 40 dias seguidos até 4 dias atrás, nada depois
  const perdida = dias(somaDias(HOJE, -43), 40);
  const p = I.ofensivaPerdida({ datas: perdida, hoje: HOJE, simulacao: sim(perdida) });
  ok(p && p.dias === 40 && p.em === somaDias(HOJE, -3) && p.haDias === 3 && p.semLerHa === 4 && !p.voltou, 'perdeu uma ofensiva de 40 dias: a quebra é o primeiro dia em branco (há 3 dias) e a última leitura foi há 4');
  // Um histórico antigo com quebra e recomeço (maio) não pode esconder a perda de agora: a flag
  // "recomeco" da simulação nunca volta a falso, por isso a regra varre os dias da janela.
  const comPassado = [...dias('2026-05-01', 10), ...dias('2026-05-20', 6), ...perdida];
  const pp2 = I.ofensivaPerdida({ datas: comPassado, hoje: HOJE, simulacao: sim(comPassado) });
  ok(sim(comPassado).recomeco && pp2 && pp2.dias === 40 && pp2.haDias === 3, 'quebra e recomeço antigos (em maio) não escondem a perda recente de 40 dias');
  // Perdeu 40 dias, leu 1 ou 2 dias soltos e parou de novo: a perda longa continua sendo o gatilho.
  const leuDoisDias = [...dias('2026-08-12', 40), '2026-09-25', '2026-09-26']; // 40 dias até 20/09
  const pd = I.ofensivaPerdida({ datas: leuDoisDias, hoje: HOJE, simulacao: sim(leuDoisDias) });
  ok(pd && pd.dias === 40 && pd.em === '2026-09-21' && pd.haDias === 10 && pd.semLerHa === 5 && !pd.voltou, 'leu 2 dias soltos depois de perder 40 e parou de novo: a perda de 40 dias segue como gatilho, "não lê há 5 dias"');
  const leuUmDia = [...dias('2026-08-12', 40), '2026-09-25'];
  ok((I.ofensivaPerdida({ datas: leuUmDia, hoje: HOJE, simulacao: sim(leuUmDia) }) || {}).dias === 40, 'um dia solto depois da perda também não apaga a perda');
  const recomecouEParou = [...dias('2026-08-12', 40), ...dias('2026-09-22', 5)]; // 1 dia em branco coberto por escudo, 5 dias, parou há 5
  const rp = I.ofensivaPerdida({ datas: recomecouEParou, hoje: HOJE, simulacao: sim(recomecouEParou) });
  ok(rp && rp.dias === 45 && rp.haDias === 4, 'o dia em branco entre as duas corridas foi coberto por escudo: é uma ofensiva só, de 45 dias, perdida há 4');
  // Dois dias em branco com dois escudos guardados não quebram nada (o app cobre); a quebra
  // de verdade pede três dias em branco.
  const coberta = dias(somaDias(HOJE, -43), 40).concat([somaDias(HOJE, -1), HOJE]);
  ok(I.ofensivaPerdida({ datas: coberta, hoje: HOJE, simulacao: sim(coberta) }) === null && sim(coberta).atual === 42, 'dois dias em branco cobertos pelos escudos: a ofensiva segue (42 dias) e não há perda');
  const quaseVoltou = dias(somaDias(HOJE, -45), 40).concat([somaDias(HOJE, -1), HOJE]);
  const pv = I.ofensivaPerdida({ datas: quaseVoltou, hoje: HOJE, simulacao: sim(quaseVoltou) });
  ok(pv && pv.dias === 40 && pv.haDias === 5 && pv.voltou, 'quem leu de novo 2 dias ainda aparece, mas "já voltou a ler"');
  const recomecoAntigoEParou = [...dias(somaDias(HOJE, -60), 20), ...dias(somaDias(HOJE, -9), 4)]; // perda fora da janela, recomeço de 4 dias e parou há 5
  ok(I.ofensivaPerdida({ datas: recomecoAntigoEParou, hoje: HOJE, simulacao: sim(recomecoAntigoEParou) }) === null, 'recomeçou (4 dias) depois de uma perda antiga e parou: a corrida curta não é gatilho e a perda antiga já não é recente');
  const voltou = dias(somaDias(HOJE, -46), 40).concat([somaDias(HOJE, -2), somaDias(HOJE, -1), HOJE]);
  ok(I.ofensivaPerdida({ datas: voltou, hoje: HOJE, simulacao: sim(voltou) }) === null, 'com 3 dias seguidos de novo (recomeço) o gatilho sai');
  const curta = dias(somaDias(HOJE, -8), 5);
  ok(I.ofensivaPerdida({ datas: curta, hoje: HOJE, simulacao: sim(curta) }) === null, 'perder 5 dias (menos de uma semana) não é gatilho');
  const antiga = dias(somaDias(HOJE, -60), 20);
  ok(I.ofensivaPerdida({ datas: antiga, hoje: HOJE, simulacao: sim(antiga) }) === null, 'uma perda de mais de 14 dias atrás já não é recente');
  ok(I.ofensivaPerdida({ datas: [HOJE], hoje: HOJE, simulacao: sim([HOJE]) }) === null && I.ofensivaPerdida({ datas: [], hoje: HOJE, simulacao: null }) === null, 'sem quebra (ou sem simulação) não há perda');
  const comPonte = dias(somaDias(HOJE, -30), 10).concat(dias(somaDias(HOJE, -19), 14)); // 10 dias, 1 em branco coberto pelo escudo, 14 dias, quebra há 5
  const pp = I.ofensivaPerdida({ datas: comPonte, hoje: HOJE, simulacao: sim(comPonte) });
  ok(pp && pp.dias === 24 && pp.haDias === 5, 'o dia coberto pelo escudo serve de ponte: a ofensiva perdida tem os 24 dias lidos');

  // atenção com gatilhos: faltou primeiro, depois quem perdeu a ofensiva, depois quem só está sem ler
  const encontros = [{ data: somaDias(HOJE, -1), presentes: ['ana', 'bia', 'dora', 'edu'], semEncontro: false }, { data: somaDias(HOJE, -8), presentes: ['ana', 'bia', 'caio', 'dora', 'edu'], semEncontro: false }];
  const semLer = (n) => new Set([somaDias(HOJE, -n)]);
  const a = I.atencaoComGatilhos({
    candidatos: [
      { usuario: 'ana', nome: 'Ana', entrouEm: '2026-01-01', datas: new Set([HOJE]), perda: null },
      { usuario: 'bia', nome: 'Bia', entrouEm: '2026-01-01', datas: semLer(3), perda: { dias: 40, em: somaDias(HOJE, -2), haDias: 2, semLerHa: 3, voltou: false } },
      { usuario: 'caio', nome: 'Caio', entrouEm: '2026-01-01', datas: new Set([HOJE]), perda: null },
      { usuario: 'dora', nome: 'Dora', entrouEm: '2026-01-01', datas: semLer(9), perda: { dias: 12, em: somaDias(HOJE, -8), haDias: 8, semLerHa: 9, voltou: false } },
      { usuario: 'edu', nome: 'Edu', entrouEm: '2026-01-01', datas: semLer(6), perda: null },
    ],
    encontros, referencia: HOJE, criadoEm: '2026-01-01',
  });
  ok(a.map((x) => x.usuario).join(',') === 'caio,bia,dora,edu', 'ordem: quem faltou (Caio), quem perdeu a ofensiva (Bia 40, Dora 12), e quem só está sem ler (Edu)');
  ok(a[0].faltou && a[0].gatilhos.length === 1 && a[0].gatilhos[0].tipo === 'faltou', 'Caio: só o gatilho de falta');
  ok(!a[1].faltou && a[1].gatilhos.length === 1 && a[1].gatilhos[0].tipo === 'ofensiva' && a[1].motivo === 'perdeu uma ofensiva de 40 dias e não lê há 3 dias', 'Bia: entrou só pela ofensiva perdida, com o texto pronto (os dias contados desde a última leitura)');
  ok(a[2].gatilhos.map((g) => g.tipo).join(',') === 'semLer,ofensiva' && /^sem ler há 9 dias · perdeu uma ofensiva de 12 dias$/.test(a[2].motivo), 'Dora: sem ler e ofensiva perdida, os dois gatilhos numa pessoa só, e um número só de dias');
  const voltouTexto = I.atencaoComGatilhos({ candidatos: [{ usuario: 'f', nome: 'Fê', entrouEm: '2026-01-01', datas: new Set([HOJE]), perda: { dias: 30, em: somaDias(HOJE, -4), haDias: 4, semLerHa: 1, voltou: true } }], encontros: [], referencia: HOJE, criadoEm: '2026-01-01' });
  ok(voltouTexto.length === 1 && voltouTexto[0].motivo === 'perdeu uma ofensiva de 30 dias, mas já voltou a ler', 'quem já voltou a ler leva isso no texto, sem "não lê há"');
  ok(!a.some((x) => x.usuario === 'ana'), 'Ana leu hoje e foi ao encontro: fora da lista');
  const muitos = I.atencaoComGatilhos({
    candidatos: Array.from({ length: 9 }, (_, i) => ({ usuario: 'u' + i, nome: 'U' + i, entrouEm: '2026-01-01', datas: semLer(10), perda: i < 2 ? { dias: 20, em: somaDias(HOJE, -9), haDias: 9, voltou: false } : null })),
    encontros: [], referencia: HOJE, criadoEm: '2026-01-01',
  });
  ok(muitos.length === 5 && muitos.every((x) => !x.faltou), 'o teto de 5 continua valendo para quem não faltou');
  ok(muitos[0].usuario === 'u0' && muitos[1].usuario === 'u1' && muitos[0].gatilhos.map((g) => g.tipo).join(',') === 'semLer,ofensiva', 'quem tem os dois gatilhos vem antes de quem só está sem ler, com os dois textos, mesmo além do que o teto de "sem ler" deixaria');
  // 5 perdas curtas e recentes mais o Zé, com a perda mais longa e também sem ler: ele não pode
  // sair pelo teto (os gatilhos se juntam antes de ordenar e cortar).
  const ze = I.atencaoComGatilhos({
    candidatos: ['Ana', 'Beto', 'Caio', 'Duda', 'Enzo'].map((n) => ({ usuario: n.toLowerCase(), nome: n, entrouEm: '2026-01-01', datas: semLer(3), perda: { dias: 10, em: somaDias(HOJE, -2), haDias: 2, semLerHa: 3, voltou: false } }))
      .concat([{ usuario: 'ze', nome: 'Zé', entrouEm: '2026-01-01', datas: semLer(9), perda: { dias: 30, em: somaDias(HOJE, -8), haDias: 8, semLerHa: 9, voltou: false } }]),
    encontros: [], referencia: HOJE, criadoEm: '2026-01-01',
  });
  ok(ze.length === 5 && ze[0].usuario === 'ze' && ze[0].motivo === 'sem ler há 9 dias · perdeu uma ofensiva de 30 dias', 'a perda mais longa vem primeiro, mesmo quando a pessoa também está sem ler: o Zé abre a lista e não cai pelo teto');
}

// ---------- regras puras: o administrador ----------
console.log('\n  Inteligência: a igreja (regras puras)\n');
{
  const HOJE = '2026-10-01';
  const r = I.rankingDaChama([
    { id: 'c1', titulo: 'Célula Esperança', lider: 'Marcos', acesos: [true, true, false, true, true, true], frequencia: 8.75 },
    { id: 'c2', titulo: 'Célula Vida', lider: 'Rute', acesos: [true, false, false, false, false], frequencia: null },
    { id: 'c3', titulo: 'Célula Nova', lider: 'Davi', acesos: [true, true, false], frequencia: 3 },
    { id: 'c4', titulo: 'Célula Luz', acesos: [true, true, true, true, true, true, true, true, true, true], frequencia: 12 },
  ]);
  ok(r.map((x) => x.id).join(',') === 'c4,c1,c3,c2', 'as células saem da maior porcentagem para a menor');
  ok(r[1].pct === 83 && r[1].acesos === 5 && r[1].membros === 6 && r[1].frequencia === 8.8 && r[1].lider === 'Marcos', 'cada célula leva porcentagem, acesos, membros, o nome do líder e a frequência média arredondada');
  ok(r[2].pct === 67 && r[2].acesos === 2 && r[2].membros === 3 && r[2].frequencia === 3, 'a célula pequena sai com os números exatos (decisão do dono: o admin abre qualquer célula de perto)');

  const contas = [
    { usuario: 'a', marcos: { decisao: '2026-09-28' } }, { usuario: 'b', marcos: { decisao: '2026-09-02', batismo: '2026-09-30' } },
    { usuario: 'c', marcos: { decisao: '2026-08-20' } }, { usuario: 'd', marcos: {} }, { usuario: 'e' },
    ...Array.from({ length: 6 }, (_, i) => ({ usuario: 'n' + i, marcos: { celula: '2026-09-1' + i } })),
  ];
  const ev = I.evangelismoDoMes(contas, '2026-09-15');
  ok(ev.mes === '2026-09' && ev.anterior === '2026-08', 'o mês e o anterior saem da data de hoje');
  ok(ev.deste.decisao === 2 && ev.deste.batismo === 1 && ev.deste.celula === 6 && ev.deste.discipula === 0, 'os marcos do mês saem exatos: 2 decisões, 1 batismo, 6 entradas em célula');
  ok(ev.doAnterior.decisao === 1 && ev.doAnterior.celula === 0, 'o mês anterior também');
  ok(I.evangelismoDoMes([], '2026-01-10').anterior === '2025-12', 'janeiro olha para dezembro do ano anterior');

  const ck = (u, data, c, m, e) => ({ usuario: u, data, corpo: c, mente: m, espirito: e });
  const poucos = I.saudeDosCheckins([ck('a', HOJE, 1, 1, 1), ck('b', HOJE, 3, 3, 3), ck('c', HOJE, 2, 1, 3), ck('d', HOJE, 1, 1, 2)]);
  ok(!poucos.suficiente && poucos.esferas === null && poucos.base === 4 && poucos.minimo === 5, 'na igreja, com 4 pessoas não sai esfera nenhuma: só a base e o mínimo');
  const daCelula = I.saudeDosCheckins([ck('a', HOJE, 1, 1, 1), ck('b', HOJE, 3, 3, 3), ck('c', HOJE, 2, 1, 3)], { minimo: I.MINIMO_CHECKIN_CELULA });
  ok(I.MINIMO_CHECKIN_CELULA === 3 && daCelula.suficiente && daCelula.base === 3 && daCelula.esferas.mente.n.baixa === 2 && daCelula.esferas.mente.baixa === 67, 'na célula, a soma sai a partir de 3 pessoas, com a contagem (2 de 3 com a mente em baixa) e a porcentagem');
  ok(!I.saudeDosCheckins([ck('a', HOJE, 1, 1, 1), ck('b', HOJE, 3, 3, 3)], { minimo: I.MINIMO_CHECKIN_CELULA }).suficiente, 'com 2 pessoas na célula, nada: "1 de 2 em baixa" seria quase um nome');
  const s = I.saudeDosCheckins([
    ck('a', somaDias(HOJE, -3), 1, 1, 1), ck('a', HOJE, 3, 3, 3), // o último da Ana vale, não o primeiro
    ck('b', HOJE, 3, 1, 3), ck('c', HOJE, 2, 1, 3), ck('d', HOJE, 1, 1, 2), ck('e', HOJE, 2, 2, 2),
  ]);
  ok(s.suficiente && s.base === 5, 'com 5 pessoas a saúde sai, com a base');
  ok(s.esferas.mente.baixa === 60 && s.esferas.corpo.baixa === 20 && s.esferas.espirito.alta === 60 && s.esferas.mente.n.baixa === 3, 'mente baixa em 60% (3 de 5), corpo baixo em 20%, espírito alto em 60% (vale o último check-in de cada um)');
  ok(!JSON.stringify(s).includes('"usuario"'), 'a saúde da igreja não leva quem respondeu');

  const contasUso = [
    { usuario: 'a', criadaEm: '2026-01-01', acessos: [somaDias(HOJE, -1), HOJE] },
    { usuario: 'b', criadaEm: '2026-01-01', acessos: [HOJE] },
    { usuario: 'c', criadaEm: '2026-09-20', acessos: [HOJE] }, // conta nova: fora da retenção
    { usuario: 'd', criadaEm: '2026-01-01', acessos: [] },
  ];
  const leramPorDia = new Map([[HOJE, 2], [somaDias(HOJE, -1), 1]]);
  const ad = I.adocao({ contas: contasUso, leramPorDia, leramNaSemana: new Set(['a', 'c']), hoje: HOJE });
  ok(ad.contas === 4 && ad.hoje.abriram === 3 && ad.hoje.leram === 2 && ad.hoje.pctAbriram === 75, 'hoje: 3 de 4 abriram (75%), 2 leram');
  ok(ad.serie.length === 14 && ad.serie[13].dia === HOJE && ad.serie[12].abriram === 1 && ad.serie[12].leram === 1 && ad.serie[0].abriram === 0, 'a série tem 14 dias, do mais antigo para hoje');
  ok(ad.media7.abriram === 0.1 && ad.media7.leram === 0.1, 'a média dos 7 dias fechados (de -7 a ontem, sem o hoje parcial), com uma casa');
  const cheios = Array.from({ length: 10 }, (_, i) => ({ usuario: 'p' + i, criadaEm: '2026-01-01', acessos: dias(somaDias(HOJE, -7), 7) })); // 10 pessoas em cada dia fechado, ninguém ainda hoje
  const manha = I.adocao({ contas: cheios, leramPorDia: new Map(dias(somaDias(HOJE, -7), 7).map((d) => [d, 10])), leramNaSemana: new Set(), hoje: HOJE });
  ok(manha.media7.abriram === 10 && manha.media7.leram === 10 && manha.hoje.abriram === 0, 'de manhã cedo, com o dia de hoje ainda vazio, a média dos 7 dias não cai (10 por dia)');
  ok(ad.retencao.base === 3 && ad.retencao.ativas === 1 && ad.retencao.pct === 33, 'retenção: das 3 contas com 30 dias ou mais, 1 leu nesta semana (33%)');
}

// ---------- a cópia achatada das datas ----------
console.log('\n  Inteligência: leitura_dias\n');
{
  const pasta = mkdtempSync(join(tmpdir(), 'cc-intel-db-'));
  const db = B.abrirBanco(B.arquivoDoBanco(pasta));
  ok(B.versaoDoEsquema() === 14, 'o esquema está na v14');
  const objetos = db.prepare("SELECT name, type FROM sqlite_master WHERE name IN ('leitura_dias', 'leituras_por_dia', 'celula_frequencia', 'leitura_dias_data', 'checkins_data')").all();
  ok(objetos.length === 5 && objetos.filter((o) => o.type === 'view').length === 2 && objetos.filter((o) => o.type === 'index').length === 2, 'a tabela, as duas views e os dois índices da v14 existem');
  ok(/WITHOUT ROWID/.test(db.prepare("SELECT sql FROM sqlite_master WHERE name = 'leitura_dias'").get().sql) && !db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'sqlite_autoindex_leitura_dias%'").get(), 'leitura_dias é WITHOUT ROWID: a chave primária é a própria tabela, sem autoindex por trás');
  ok(/COVERING INDEX leitura_dias_data/.test(db.prepare('EXPLAIN QUERY PLAN SELECT DISTINCT usuario FROM leitura_dias WHERE data > ? AND data <= ?').all('2026-09-24', '2026-10-01').map((l) => l.detail).join(' ')), 'a consulta por janela de datas é coberta pelo índice (não volta à tabela)');

  B.gravarEstadoNoBanco(db, 'ana', { lidos: [1, 2, 3], marcadoEm: { 1: '2026-09-01', 2: '2026-09-02', 3: '2026-09-02' }, licoesEm: { x: '2026-09-05' }, conhecidos: { 1: '2026-09-07' }, oia: { 1: { o: 'segredo' } } });
  B.gravarEstadoNoBanco(db, 'bia', { lidos: [1], marcadoEm: { 1: '2026-09-02' } });
  const preenchidas = I.preencherLeituraDias(db);
  ok(preenchidas === 5, 'a primeira subida copia as datas de quem já tinha progresso (4 da Ana, sem repetir o dia, e 1 da Bia)');
  ok(I.preencherLeituraDias(db) === 0, 'a segunda subida não copia de novo');
  const porDia = I.leiturasPorDia(db, '2026-08-31', '2026-09-30');
  ok(porDia.get('2026-09-02') === 2 && porDia.get('2026-09-01') === 1 && porDia.get('2026-09-05') === 1 && !porDia.has('2026-09-03'), 'a view leituras_por_dia conta pessoas por dia');
  ok([...I.quemLeuEntre(db, '2026-09-04', '2026-09-10')].join(',') === 'ana', 'quem leu na janela');
  ok(I.datasDesde(db, '2026-09-02').get('ana').size === 3 && I.datasDesde(db, '2026-09-02').get('bia').size === 1, 'as datas de cada um desde uma data');
  ok([...I.datasDesde(db, '2026-09-02').get('ana')].sort().join(',') === '2026-09-02,2026-09-05,2026-09-07' && !I.datasDesde(db, '2026-09-08').has('ana'), 'uma linha por pessoa (group_concat) dá exatamente as datas da janela, e quem não leu na janela fica fora');
  const mudou = I.sincronizarLeituraDias(db, 'ana', new Set(['2026-09-01', '2026-09-20']));
  ok(mudou === 4 && db.prepare('SELECT COUNT(*) AS n FROM leitura_dias WHERE usuario = ?').get('ana').n === 2, 'sincronizar regrava: entra o que faltava, sai o que a pessoa não tem mais');
  ok(I.sincronizarLeituraDias(db, 'ana', ['2026-09-01', '2026-09-20', 'lixo']) === 0, 'sem mudança não grava nada, e data inválida é ignorada');
  ok(!JSON.stringify(db.prepare('SELECT * FROM leitura_dias').all()).includes('segredo'), 'na tabela só há datas, nunca o que a pessoa escreveu');

  db.prepare('INSERT INTO celula_encontros (proposito, data, visitantes, registrado_por, em, sem_encontro) VALUES (?, ?, ?, ?, ?, ?)').run('p1', '2026-09-20', 2, 'ana', 'x', 0);
  db.prepare('INSERT INTO celula_encontros (proposito, data, visitantes, registrado_por, em, sem_encontro) VALUES (?, ?, ?, ?, ?, ?)').run('p1', '2026-09-27', 0, 'ana', 'x', 1);
  db.prepare('INSERT INTO celula_encontros (proposito, data, visitantes, registrado_por, em, sem_encontro) VALUES (?, ?, ?, ?, ?, ?)').run('p1', '2026-09-13', 0, 'ana', 'x', 0);
  for (const u of ['ana', 'bia', 'caio']) db.prepare('INSERT INTO celula_presencas (proposito, data, usuario) VALUES (?, ?, ?)').run('p1', '2026-09-20', u);
  db.prepare('INSERT INTO celula_presencas (proposito, data, usuario) VALUES (?, ?, ?)').run('p1', '2026-09-13', 'ana');
  const freq = I.frequenciaMediaPorCelula(db, '2026-09-03', '2026-10-01');
  ok(freq.get('p1') === 3, 'a view celula_frequencia: média de (3 + 2) e (1 + 0), sem a semana sem encontro, dá 3');
  db.prepare('INSERT INTO checkins (usuario, data, corpo, mente, espirito, em) VALUES (?, ?, ?, ?, ?, ?)').run('ana', '2026-09-30', 1, 2, 3, 'x');
  ok(I.checkinsEntre(db, '2026-09-24', '2026-10-01').length === 1 && I.checkinsEntre(db, '2026-09-30', '2026-10-01').length === 0, 'os check-ins da janela (de, ate]');
  ok(I.checkinsDe(db, ['ana', 'bia'], '2026-09-24', '2026-10-01').length === 1 && I.checkinsDe(db, ['bia'], '2026-09-24', '2026-10-01').length === 0 && I.checkinsDe(db, [], '2026-09-24', '2026-10-01').length === 0, 'os check-ins só de algumas pessoas (os membros de uma célula)');

  B.apagarPessoaDoBanco(db, 'ana');
  ok(db.prepare('SELECT COUNT(*) AS n FROM leitura_dias WHERE usuario = ?').get('ana').n === 0 && db.prepare('SELECT COUNT(*) AS n FROM checkins').get().n === 0, 'apagar a pessoa do banco leva as datas e os check-ins dela');
  B.fecharBanco(B.arquivoDoBanco(pasta));
  rmSync(pasta, { recursive: true, force: true });
}

// ---------- com servidor: quem vê o quê ----------
try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_ADMIN: 'pastor' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const pedir = (rota, corpo, cookie, metodo) => fetch(base + rota, {
  method: metodo || (corpo ? 'POST' : 'GET'),
  headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const dados = async (r) => r.json().catch(() => ({}));
const biscoito = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const criar = async (usuario, extra = {}) => {
  const r = await pedir('/api/criar-conta', { usuario, senha: 'senha123', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true, fuso: 'UTC', ...extra });
  return { u: usuario, cookie: biscoito(r), corpo: await dados(r) };
};
const HOJE = new Date().toISOString().slice(0, 10); // as contas do teste ficam em UTC
// O servidor recusa, pela API, leitura com mais de 7 dias de atraso (quem inventa um ano de
// leitura não ganha um ano de ofensiva). Para montar um histórico longo, o teste grava o
// progresso direto no banco, como o progresso de verdade já gravado estaria, e copia as datas.
const progressoDireto = (usuario, datas) => {
  const db = B.abrirBanco(B.arquivoDoBanco(PASTA));
  const marcadoEm = Object.fromEntries(datas.map((d, i) => [String(i + 1), d]));
  B.gravarEstadoNoBanco(db, usuario, { lidos: datas.map((_, i) => i + 1), marcadoEm, licoes: [], licoesEm: {} });
  I.sincronizarLeituraDias(db, usuario, datas);
  B.fecharBanco(B.arquivoDoBanco(PASTA));
};
const celulaDe = async (cookie, id) => ((await dados(await pedir('/api/propositos', null, cookie))).propositos || []).find((p) => p.id === id);

try {
  console.log('\n  Com servidor: a célula de quem conduz\n');
  const lider = await criar('lider');
  const criada = await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Célula de quinta' }, lider.cookie));
  const id = criada.proposito.id;
  const { link } = await dados(await pedir('/api/celula', { acao: 'link', id }, lider.cookie));
  const token = new URL(link).searchParams.get('celula');
  const ana = await criar('ana', { celula: token });
  const bia = await criar('bia', { celula: token });
  const caio = await criar('caio', { celula: token });
  const dora = await criar('dora', { celula: token });
  const eva = await criar('eva');
  await pedir('/api/celula', { acao: 'entrar', token, visitante: true }, eva.cookie);
  const fora = await criar('fora');
  const pastor = await criar('pastor'); // o administrador, que não é da célula
  const outra = await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Célula do Fora' }, fora.cookie)); // o fora é líder de outra célula

  // o progresso de cada um: hoje (líder, Dora, Eva), ontem (Ana), 40 dias até 4 dias atrás (Bia), parado há 9 dias (Caio)
  progressoDireto('lider', [somaDias(HOJE, -1), HOJE]);
  progressoDireto('ana', [somaDias(HOJE, -2), somaDias(HOJE, -1)]);
  progressoDireto('bia', dias(somaDias(HOJE, -43), 40));
  progressoDireto('caio', [somaDias(HOJE, -10), somaDias(HOJE, -9)]);
  progressoDireto('dora', [HOJE]);
  progressoDireto('eva', [HOJE]);
  progressoDireto('pastor', [HOJE]);
  // os marcos: Ana decidiu seguir Jesus neste mês, Bia já se batizou, o líder acompanha alguém
  await pedir('/api/discipulado', { acao: 'marco', chave: 'decisao', data: HOJE }, ana.cookie);
  await pedir('/api/discipulado', { acao: 'marco', chave: 'batismo', data: '2024-05-05' }, bia.cookie);
  await pedir('/api/discipulado', { acao: 'marco', chave: 'discipula', data: '2025-01-10' }, lider.cookie);
  // dois encontros e uma semana sem encontro
  await pedir('/api/celula', { acao: 'registrarEncontro', id, data: somaDias(HOJE, -6), presentes: ['lider', 'ana', 'bia', 'caio'], visitantes: 0 }, lider.cookie);
  await pedir('/api/celula', { acao: 'registrarEncontro', id, data: somaDias(HOJE, -3), semEncontro: true }, lider.cookie);
  await pedir('/api/celula', { acao: 'registrarEncontro', id, data: HOJE, presentes: ['lider', 'ana', 'bia', 'dora', 'eva'], visitantes: 1 }, lider.cookie);

  const doLider = await celulaDe(lider.cookie, id);
  ok(doLider && doLider.euConduzo && doLider.painel, 'quem conduz recebe o painel da célula no retrato de sempre (sem pedido a mais)');
  const pc = doLider.painel;
  ok(pc.chama.total === 5 && pc.chama.acesos === 3 && pc.chama.pct === 60, 'a chama da célula: 3 de 5 membros de verdade (60%); a visitante não entra');
  ok(pc.chama.pessoas.map((x) => x.usuario + (x.acesa ? '+' : '-')).join(',') === 'ana+,lider+,dora+,bia-,caio-' && pc.chama.pessoas[0].dias === 2 && !pc.chama.pessoas.some((x) => x.usuario === 'eva'), 'quem conduz vê quem está com a chama acesa (com os dias seguidos, as maiores primeiro) e apagada, pelo nome; a visitante fica fora');
  const presencaDe = (u) => pc.frequencia.presencas.find((x) => x.usuario === u);
  // Todos entraram na célula hoje: os encontros de antes não contam para ninguém (null), só o de hoje.
  ok(pc.frequencia.presencas.length === 6 && presencaDe('eva').papel === 'visitante' && presencaDe('caio').encontros.join(',') === ',,false' && presencaDe('dora').encontros.join(',') === ',,true' && presencaDe('eva').encontros[2] === true,
    'a presença de cada um nos encontros da janela (a visitante inclusive): antes de entrar na célula é null, Caio faltou hoje e Dora foi');
  ok(pc.frequencia.encontros.length === 3 && pc.frequencia.encontros[0].pessoas === 4 && pc.frequencia.encontros[1].semEncontro && pc.frequencia.encontros[1].pessoas === null && pc.frequencia.encontros[2].pessoas === 6,
    'a frequência: 4 pessoas, semana sem encontro, 6 pessoas (5 com conta, inclusive a visitante, mais 1 sem conta)');
  ok(pc.frequencia.tendencia === 'subindo' && pc.frequencia.diferenca === 2, 'tendência: 2 a mais que o encontro anterior');
  const funilPor = Object.fromEntries(pc.funil.map((x) => [x.etapa, x.pessoas]));
  ok(funilPor.comecando === 2 && funilPor.decidiu === 1 && funilPor.batizado === 1 && funilPor.acompanha === 1, 'o funil: 2 começando (Caio, Dora), 1 decidiu (Ana), 1 batizada (Bia), 1 acompanha (o líder)');
  ok(pc.funil.find((x) => x.etapa === 'comecando').nomes.map((x) => x.nome).join(',') === 'caio,dora' && pc.funil.find((x) => x.etapa === 'batizado').nomes[0].usuario === 'bia', 'cada etapa do funil leva os nomes de quem está nela');
  ok(pc.saude && !pc.saude.suficiente && pc.saude.base === 0 && pc.saude.minimo === 3, 'o check-in da célula somado: sem check-in ainda, só a base e o mínimo');
  // Todos entraram na célula hoje: quem chega no dia não "faltou" ao encontro de hoje (regra de
  // propositos.mjs), então aqui só valem os gatilhos de leitura.
  const porUsuario = Object.fromEntries(doLider.atencao.map((x) => [x.usuario, x]));
  ok(doLider.atencao.map((x) => x.usuario).join(',') === 'bia,caio', 'precisam de atenção: Bia (perdeu a ofensiva) antes de Caio (só sem ler)');
  ok(porUsuario.caio.gatilhos[0].tipo === 'semLer' && !porUsuario.caio.faltou && /sem ler há 9 dias/.test(porUsuario.caio.motivo), 'Caio está sem ler há 9 dias');
  ok(porUsuario.bia.gatilhos.length === 1 && porUsuario.bia.gatilhos[0].tipo === 'ofensiva' && porUsuario.bia.motivo === 'perdeu uma ofensiva de 40 dias e não lê há 4 dias', 'Bia foi ao encontro e leu há 4 dias, mas perdeu uma ofensiva de 40 dias: é o gatilho, com os dias desde a última leitura');
  ok(!('eva' in porUsuario), 'a visitante nunca entra em "precisam de atenção"');

  const daAna = await celulaDe(ana.cookie, id);
  ok(daAna && !daAna.euConduzo && !('painel' in daAna) && !('atencao' in daAna) && !('semanaLider' in daAna), 'membro comum não recebe painel, atenção nem a semana do líder');
  const textoAna = JSON.stringify(daAna);
  ok(!/acesa|presencas|funil|saude|perdeu uma ofensiva|sem ler há/.test(textoAna), 'nada do painel (chama de cada um, presenças, funil, check-in, alertas) vaza no retrato do membro comum');
  const daEva = await celulaDe(eva.cookie, id);
  ok(daEva && !('painel' in daEva) && !/presencas|funil/.test(JSON.stringify(daEva)), 'nem no da visitante');
  const rotaPainel = '/api/painel/celula?id=' + encodeURIComponent(id);
  const direto = await pedir(rotaPainel, null, lider.cookie);
  const dp = await dados(direto);
  ok(direto.status === 200 && dp.chama.pct === 60 && dp.funil.length === 4 && dp.atencao.length === 2 && dp.id === id, 'GET /api/painel/celula?id devolve o mesmo painel para quem conduz');
  ok((await pedir(rotaPainel, null, ana.cookie)).status === 403, 'membro comum: 403 no painel da célula');
  ok((await pedir(rotaPainel, null, eva.cookie)).status === 403, 'visitante: 403');
  ok((await pedir(rotaPainel, null, fora.cookie)).status === 404, 'líder de outra célula: 404 (a célula nem existe para ele)');
  ok((await pedir('/api/painel/celula?id=inventada', null, lider.cookie)).status === 404, 'célula inventada: 404');
  ok((await pedir('/api/painel/celula?id=' + encodeURIComponent(outra.proposito.id), null, lider.cookie)).status === 404, 'o líder não abre a célula do outro');
  // O administrador abre qualquer célula, com o mesmo detalhe que o líder dela vê.
  const doPastor = await pedir(rotaPainel, null, pastor.cookie);
  const dpa = await dados(doPastor);
  ok(doPastor.status === 200 && dpa.titulo === 'Célula de quinta' && dpa.lider === 'lider' && dpa.membros === 6 && dpa.chama.pct === 60 && dpa.chama.pessoas.length === 5 && dpa.funil[2].nomes[0].usuario === 'bia' && dpa.atencao.length === 2 && dpa.frequencia.presencas.length === 6,
    'o admin, que não é da célula, recebe o painel inteiro dela: líder, membros, chama com nomes, funil com nomes, presenças e atenção');
  ok((await pedir('/api/painel/celula?id=' + encodeURIComponent(outra.proposito.id), null, pastor.cookie)).status === 200, 'e abre a outra célula também');
  ok(!/segredo|"oia"|reflex/.test(JSON.stringify(dpa) + JSON.stringify(dp)), 'nada do que alguém escreveu sai no painel da célula (nem para o admin)');

  console.log('\n  Com servidor: o painel da igreja\n');
  for (const [quem, c, m, e] of [[lider, 3, 1, 3], [ana, 2, 1, 2], [bia, 1, 1, 1], [caio, 3, 2, 3], [dora, 2, 2, 2]]) {
    await pedir('/api/discipulado', { acao: 'checkin', corpo: c, mente: m, espirito: e }, quem.cookie);
  }
  const dpSaude = await dados(await pedir(rotaPainel, null, lider.cookie));
  ok(dpSaude.saude.suficiente && dpSaude.saude.base === 5 && dpSaude.saude.esferas.mente.n.baixa === 3 && !JSON.stringify(dpSaude.saude).includes('usuario'), 'o check-in da célula sai somado para quem conduz (3 de 5 com a mente em baixa), nunca por pessoa');
  ok((await pedir('/api/painel/igreja', null, ana.cookie)).status === 403, 'quem não é admin: 403 no painel da igreja');
  ok((await pedir('/api/painel/igreja', null, lider.cookie)).status === 403, 'nem o líder de célula');
  ok((await pedir('/api/painel/igreja', null, fora.cookie)).status === 403, 'nem quem está fora da célula');
  const r = await pedir('/api/painel/igreja', null, pastor.cookie);
  const ig = await dados(r);
  ok(r.status === 200 && ig.hoje === HOJE && ig.geradoEm, 'o admin recebe o painel da igreja, com a data e a hora da conta');
  ok(ig.adocao.contas === 8 && ig.adocao.hoje.abriram === 8 && ig.adocao.hoje.leram === 4, 'adoção: 8 contas, todas abriram hoje, 4 leram hoje (líder, Dora, Eva, pastor)');
  ok(ig.adocao.serie.length === 14 && ig.adocao.serie[13].dia === HOJE && ig.adocao.serie[12].leram === 2, 'a série de 14 dias: ontem leram 2 (líder e Ana)');
  ok(ig.adocao.retencao.base === 0 && ig.adocao.retencao.pct === null, 'retenção ainda sem base: ninguém tem 30 dias de conta');
  ok(ig.chamaDasCelulas.length === 2 && ig.chamaDasCelulas[0].titulo === 'Célula de quinta' && ig.chamaDasCelulas[0].pct === 60 && ig.chamaDasCelulas[0].membros === 5 && ig.chamaDasCelulas[0].frequencia === 5 && ig.chamaDasCelulas[0].lider === 'lider',
    'a chama das células: a célula com 60% (3 de 5), o nome do líder e frequência média 5 nos últimos encontros');
  ok(ig.chamaDasCelulas[1].titulo === 'Célula do Fora' && ig.chamaDasCelulas[1].membros === 1 && ig.chamaDasCelulas[1].pct === 0, 'a célula de 1 pessoa sai com o número exato');
  ok(ig.evangelismo.mes === HOJE.slice(0, 7) && ig.evangelismo.deste.decisao === 1 && ig.evangelismo.deste.batismo === 0, 'frutos do mês: 1 decisão neste mês, exata');
  ok(ig.saude.suficiente && ig.saude.base === 5 && ig.saude.esferas.mente.baixa === 60 && ig.saude.esferas.corpo.baixa === 20, 'saúde: 5 check-ins bastam; 60% com a mente baixa, 20% com o corpo baixo');
  // O painel antigo, na mesma tela: a semana "sem encontro" não vira encontro com zero pessoas.
  const antigoPainel = await dados(await pedir('/api/painel', null, pastor.cookie));
  ok(antigoPainel.celulasECuidado && antigoPainel.celulasECuidado.frequenciaMedia === 5 && antigoPainel.celulasECuidado.celulasComEncontro === 1, 'a frequência média do painel antigo ignora a semana sem encontro: (4 + 6) / 2 = 5, e a célula conta como "registrou encontro"');
  const textoIgreja = JSON.stringify(ig);
  ok(!/"(ana|bia|caio|dora|eva)"|@|usuario|teste\.com|"pessoas":\[|presencas|nomes/.test(textoIgreja), 'o painel da igreja não leva nome de membro, @, e-mail nem usuário de ninguém (só o nome do líder de cada célula)');
  ok(!/corpo":1|"oia"|segredo/.test(textoIgreja), 'nem o check-in de uma pessoa nem o que alguém escreveu');

  // a cópia das datas acompanha a sincronização pela API
  await pedir('/api/estado', { atualizadoEm: Date.now(), lidos: [1, 2], marcadoEm: { 1: somaDias(HOJE, -10), 2: somaDias(HOJE, -9) }, licoesEm: { 'x': HOJE } }, caio.cookie);
  const db = B.abrirBanco(B.arquivoDoBanco(PASTA));
  const deCaio = db.prepare('SELECT data FROM leitura_dias WHERE usuario = ? ORDER BY data').all('caio').map((l) => l.data);
  B.fecharBanco(B.arquivoDoBanco(PASTA));
  ok(deCaio.join(',') === [somaDias(HOJE, -10), somaDias(HOJE, -9), HOJE].join(','), 'PUT /api/estado atualiza leitura_dias (a lição de hoje entrou)');
  console.log('\n  Com servidor: o relatório exportado\n');
  ok((await pedir('/api/painel/relatorio?formato=csv', null, lider.cookie)).status === 403 && (await pedir('/api/painel/relatorio?formato=html', null, ana.cookie)).status === 403, 'quem não é admin não exporta: 403 nas duas saídas');
  const rc = await pedir('/api/painel/relatorio?formato=csv', null, pastor.cookie);
  const bytesCsv = new Uint8Array(await rc.arrayBuffer()); // .text() tiraria o BOM
  const csv = new TextDecoder('utf-8').decode(bytesCsv);
  ok(rc.status === 200 && /^text\/csv/.test(rc.headers.get('content-type')) && rc.headers.get('content-disposition') === 'attachment; filename="relatorio-geracao-eleita-' + HOJE + '.csv"', 'o admin baixa o CSV com o nome do dia');
  ok(bytesCsv[0] === 0xef && bytesCsv[1] === 0xbb && bytesCsv[2] === 0xbf && csv.includes('Relatório da igreja;Geração Eleita') && csv.includes('Célula de quinta'), 'BOM UTF-8 no começo (EF BB BF) e acentos certos (Relatório, Geração, Célula)');
  const linhasCsv = csv.split('\r\n');
  ok(linhasCsv.includes('Igreja;Indicador;Valor') && linhasCsv.includes('Igreja;Contas;8') && linhasCsv.includes('Por dia;Dia;Abriram o app;Leram') && linhasCsv.some((l) => /^Frutos;Marco de Minha caminhada;[a-zç]+ de \d{4};[a-zç]+ de \d{4}$/.test(l)) && linhasCsv.includes('Check-in;Esfera;Em baixa (%);Média (%);Alta (%);Pessoas'), 'os blocos Igreja, Por dia, Frutos e Check-in, com os cabeçalhos esperados');
  const cabCelulas = linhasCsv.find((l) => l.startsWith('Células;Célula;'));
  ok(cabCelulas && cabCelulas.startsWith('Células;Célula;Líder;Pessoas;Chama acesa;Chama (%);Frequência média (4 semanas);Dando os primeiros passos;Decidiram seguir Jesus;Já se batizaram;Acompanham alguém na fé;Check-in: pessoas;Corpo em baixa'), 'o bloco das células tem as colunas esperadas');
  // Caio acabou de ler hoje (o PUT acima): a chama da célula está em 4 de 5.
  ok(linhasCsv.includes('Células;Célula de quinta;lider;6;4;80;5;2;1;1;1;5;1;3;1'), 'a linha da célula: líder, 6 pessoas, 4 acesos (80%), 5 por encontro, funil 2·1·1·1 e o check-in somado (5 pessoas; 1, 3 e 1 em baixa)');
  const linhaBia = linhasCsv.find((l) => l.startsWith('Pessoas;Célula de quinta;bia;'));
  ok(linhaBia && /^Pessoas;Célula de quinta;bia;apagada;0;Já se batizaram;.*presente;perdeu uma ofensiva de 40 dias e não lê há 4 dias$/.test(linhaBia), 'uma linha por pessoa: chama, dias, etapa, presença e o alerta');
  ok(!/segredo|"oia"|corpo"/.test(csv) && linhasCsv.filter((l) => l.startsWith('Pessoas;')).every((l) => l.split(';').length === 8), 'nada do que alguém escreveu no CSV, e a linha de cada pessoa não leva check-in (só as 8 colunas)');
  const rh = await pedir('/api/painel/relatorio?formato=html', null, pastor.cookie);
  const html = await rh.text();
  ok(rh.status === 200 && /^text\/html/.test(rh.headers.get('content-type')) && rh.headers.get('content-disposition') === 'inline; filename="relatorio-geracao-eleita-' + HOJE + '.html"', 'o admin abre a página do relatório (PDF pelo navegador)');
  ok(html.includes('<h1>Relatório da igreja</h1>') && html.includes('Célula de quinta') && html.includes('@page { size: A4 portrait') && html.includes('window.print()') && /<svg/.test(html) && /url\(\/fonte-manrope\./.test(html), 'a página tem o título, a célula, A4, a chamada de impressão, o símbolo e a fonte do app');
  const cspRel = rh.headers.get('content-security-policy') || '';
  ok(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/.test(cspRel) && !/onclick=/.test(html), 'o script da página entra na CSP pelo hash, sem onclick inline');
  ok(!/segredo|"oia"/.test(html), 'nem na página sai o que alguém escreveu');
  const igDepois = await dados(await pedir('/api/painel/igreja', null, pastor.cookie));
  ok(igDepois.adocao.hoje.leram === 4 && igDepois.geradoEm === ig.geradoEm, 'o painel da igreja fica em cache por uns minutos: a mesma geração');
  const aoMesmoTempo = await Promise.all([1, 2, 3].map(() => pedir('/api/painel/igreja', null, pastor.cookie).then(dados)));
  ok(aoMesmoTempo.every((x) => x.geradoEm === ig.geradoEm && x.adocao.contas === 8), 'três pedidos ao mesmo tempo recebem o mesmo painel, sem refazer a conta');
} finally {
  servidor.kill();
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
