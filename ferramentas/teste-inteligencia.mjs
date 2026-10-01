// Confere a inteligência (inteligencia.mjs, docs/inteligencia.md): as regras puras do painel
// de quem conduz a célula (chama, frequência, funil, ofensiva perdida, atenção com gatilhos) e
// do painel da igreja (ranking das células, frutos do mês, check-in, adoção), a cópia achatada
// das datas de leitura (leitura_dias) e, com servidor, quem vê o quê: o líder vê só a própria
// célula, o membro comum não vê painel nenhum, só o admin vê a igreja, e nenhum nome sai dela.
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
    { data: '2026-09-03', presentes: ['a', 'b', 'c'], visitantes: 2 },
    { data: '2026-09-24', presentes: ['a', 'b', 'c', 'd'], visitantes: 1 },
    { data: '2026-09-10', presentes: ['a', 'b'], visitantes: 0 },
    { data: '2026-09-17', semEncontro: true, presentes: [], visitantes: 0 },
    { data: '2026-08-27', presentes: ['a'], visitantes: 9 },
    { data: '2026-10-08', presentes: ['a', 'b'], visitantes: 0 }, // depois da referência: fora
  ], HOJE);
  ok(f.encontros.length === 4 && f.encontros.map((e) => e.data).join(',') === '2026-09-03,2026-09-10,2026-09-17,2026-09-24', 'os 4 últimos encontros até a referência, do mais antigo para o mais novo');
  ok(f.encontros[0].pessoas === 5 && f.encontros[1].pessoas === 2 && f.encontros[3].pessoas === 5, 'pessoas por encontro: presentes com conta mais os sem conta');
  ok(f.encontros[2].semEncontro && f.encontros[2].pessoas === null, 'a semana sem encontro aparece como tal, não como zero');
  ok(f.diferenca === 3 && f.tendencia === 'subindo', 'a tendência compara os dois últimos encontros de verdade (2 -> 5: subindo)');
  ok(I.frequencia([{ data: '2026-09-24', presentes: [], visitantes: 0 }], HOJE).tendencia === null, 'com um encontro só não há tendência');
  ok(I.frequencia([], HOJE).encontros.length === 0, 'sem encontro registrado, lista vazia');

  const fu = I.funil([
    { marcos: {}, acompanha: 0, caminho: 'conhecer', passos: 0 },
    { marcos: {}, acompanha: 0, caminho: 'plano', passos: 12 },
    { marcos: {}, acompanha: 0, caminho: 'plano', passos: 3 },
    { marcos: { decisao: '2026-09-01' }, acompanha: 0, caminho: 'plano', passos: 12 },
    { marcos: { decisao: '2026-01-01', batismo: '2026-06-01' }, acompanha: 0, caminho: 'plano', passos: 12 },
    { marcos: { batismo: '2020-01-01' }, acompanha: 2, caminho: 'plano', passos: 12 },
    { marcos: { discipula: '2026-03-01' }, acompanha: 0, caminho: 'plano', passos: 5 },
  ]);
  const por = Object.fromEntries(fu.map((x) => [x.etapa, x]));
  ok(fu.map((x) => x.etapa).join(',') === 'comecando,decidiu,batizado,acompanha', 'o funil tem as 4 etapas, na ordem da caminhada');
  ok(por.comecando.pessoas === 3 && por.decidiu.pessoas === 1 && por.batizado.pessoas === 1 && por.acompanha.pessoas === 2, 'cada pessoa entra uma vez, na etapa mais adiante: 3 · 1 · 1 · 2');
  ok(por.comecando.conhecendo === 1 && por.comecando.passosConcluidos === 1, 'no começo: 1 ainda conhecendo Jesus e 1 que já fechou os 12 passos');
  ok(fu.reduce((s, x) => s + x.pessoas, 0) === 7, 'a soma do funil é o total de pessoas');
  ok(I.funil([]).every((x) => x.pessoas === 0), 'funil vazio é só zero');

  // ofensiva perdida: 40 dias seguidos até 4 dias atrás, nada depois
  const perdida = dias(somaDias(HOJE, -43), 40);
  const p = I.ofensivaPerdida({ datas: perdida, hoje: HOJE, simulacao: sim(perdida) });
  ok(p && p.dias === 40 && p.em === somaDias(HOJE, -3) && p.haDias === 3 && !p.voltou, 'perdeu uma ofensiva de 40 dias há 3 dias (a quebra é o primeiro dia em branco)');
  // Dois dias em branco com dois escudos guardados não quebram nada (o app cobre); a quebra
  // de verdade pede três dias em branco.
  const coberta = dias(somaDias(HOJE, -43), 40).concat([somaDias(HOJE, -1), HOJE]);
  ok(I.ofensivaPerdida({ datas: coberta, hoje: HOJE, simulacao: sim(coberta) }) === null && sim(coberta).atual === 42, 'dois dias em branco cobertos pelos escudos: a ofensiva segue (42 dias) e não há perda');
  const quaseVoltou = dias(somaDias(HOJE, -45), 40).concat([somaDias(HOJE, -1), HOJE]);
  const pv = I.ofensivaPerdida({ datas: quaseVoltou, hoje: HOJE, simulacao: sim(quaseVoltou) });
  ok(pv && pv.dias === 40 && pv.haDias === 5 && pv.voltou, 'quem leu de novo 2 dias ainda aparece, mas "já voltou a ler"');
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
      { usuario: 'bia', nome: 'Bia', entrouEm: '2026-01-01', datas: semLer(3), perda: { dias: 40, em: somaDias(HOJE, -2), haDias: 2, voltou: false } },
      { usuario: 'caio', nome: 'Caio', entrouEm: '2026-01-01', datas: new Set([HOJE]), perda: null },
      { usuario: 'dora', nome: 'Dora', entrouEm: '2026-01-01', datas: semLer(9), perda: { dias: 12, em: somaDias(HOJE, -8), haDias: 8, voltou: false } },
      { usuario: 'edu', nome: 'Edu', entrouEm: '2026-01-01', datas: semLer(6), perda: null },
    ],
    encontros, referencia: HOJE, criadoEm: '2026-01-01',
  });
  ok(a.map((x) => x.usuario).join(',') === 'caio,bia,dora,edu', 'ordem: quem faltou (Caio), quem perdeu a ofensiva (Bia), e quem está sem ler (Dora, Edu)');
  ok(a[0].faltou && a[0].gatilhos.length === 1 && a[0].gatilhos[0].tipo === 'faltou', 'Caio: só o gatilho de falta');
  ok(!a[1].faltou && a[1].gatilhos.length === 1 && a[1].gatilhos[0].tipo === 'ofensiva' && a[1].motivo === 'perdeu uma ofensiva de 40 dias há 2 dias', 'Bia: entrou só pela ofensiva perdida, com o texto pronto');
  ok(a[2].gatilhos.map((g) => g.tipo).join(',') === 'semLer,ofensiva' && /sem ler há 9 dias · perdeu uma ofensiva de 12 dias há 8 dias/.test(a[2].motivo), 'Dora: sem ler e ofensiva perdida, os dois gatilhos numa pessoa só');
  ok(!a.some((x) => x.usuario === 'ana'), 'Ana leu hoje e foi ao encontro: fora da lista');
  const muitos = I.atencaoComGatilhos({
    candidatos: Array.from({ length: 9 }, (_, i) => ({ usuario: 'u' + i, nome: 'U' + i, entrouEm: '2026-01-01', datas: semLer(10), perda: i < 2 ? { dias: 20, em: somaDias(HOJE, -9), haDias: 9, voltou: false } : null })),
    encontros: [], referencia: HOJE, criadoEm: '2026-01-01',
  });
  ok(muitos.length === 5 && muitos.every((x) => !x.faltou), 'o teto de 5 continua valendo para quem não faltou');
}

// ---------- regras puras: o administrador ----------
console.log('\n  Inteligência: a igreja (regras puras)\n');
{
  const HOJE = '2026-10-01';
  const r = I.rankingDaChama([
    { id: 'c1', titulo: 'Célula Esperança', acesos: [true, true, false, true, true, true], frequencia: 8.75 },
    { id: 'c2', titulo: 'Célula Vida', acesos: [true, false, false, false, false], frequencia: null },
    { id: 'c3', titulo: 'Célula Nova', acesos: [true, true, true], frequencia: 3 },
    { id: 'c4', titulo: 'Célula Luz', acesos: [true, true, true, true, true, true, true, true, true, true], frequencia: 12 },
  ]);
  ok(r.map((x) => x.id).join(',') === 'c4,c1,c2,c3', 'as células saem da maior porcentagem para a menor; a pequena vai para o fim');
  ok(r[1].pct === 83 && r[1].acesos === 5 && r[1].membros === 6 && r[1].frequencia === 8.8, 'cada célula leva porcentagem, acesos, membros e a frequência média arredondada');
  ok(r[3].poucos && r[3].pct === null && r[3].acesos === null && r[3].membros === 'menos de 5', 'com menos de 5 membros não sai número nenhum: só "menos de 5"');
  ok(!JSON.stringify(r).includes('total'), 'o total cru não vaza na saída da célula pequena');

  const contas = [
    { usuario: 'a', marcos: { decisao: '2026-09-28' } }, { usuario: 'b', marcos: { decisao: '2026-09-02', batismo: '2026-09-30' } },
    { usuario: 'c', marcos: { decisao: '2026-08-20' } }, { usuario: 'd', marcos: {} }, { usuario: 'e' },
    ...Array.from({ length: 6 }, (_, i) => ({ usuario: 'n' + i, marcos: { celula: '2026-09-1' + i } })),
  ];
  const ev = I.evangelismoDoMes(contas, '2026-09-15');
  ok(ev.mes === '2026-09' && ev.anterior === '2026-08', 'o mês e o anterior saem da data de hoje');
  ok(ev.deste.decisao === 'menos de 5' && ev.deste.batismo === 'menos de 5' && ev.deste.celula === 6 && ev.deste.discipula === 'menos de 5', 'os marcos do mês contam pessoas: 2 decisões e 1 batismo ficam "menos de 5", 6 entradas em célula saem exatas');
  ok(ev.doAnterior.decisao === 'menos de 5', 'o mês anterior também passa pela máscara');
  ok(I.evangelismoDoMes([], '2026-01-10').anterior === '2025-12', 'janeiro olha para dezembro do ano anterior');

  const ck = (u, data, c, m, e) => ({ usuario: u, data, corpo: c, mente: m, espirito: e });
  const poucos = I.saudeDosCheckins([ck('a', HOJE, 1, 1, 1), ck('b', HOJE, 3, 3, 3), ck('c', HOJE, 2, 1, 3), ck('d', HOJE, 1, 1, 2)]);
  ok(!poucos.suficiente && poucos.esferas === null && poucos.base === 'menos de 5', 'com 4 pessoas nada sai: nem porcentagem nem base exata');
  const s = I.saudeDosCheckins([
    ck('a', somaDias(HOJE, -3), 1, 1, 1), ck('a', HOJE, 3, 3, 3), // o último da Ana vale, não o primeiro
    ck('b', HOJE, 3, 1, 3), ck('c', HOJE, 2, 1, 3), ck('d', HOJE, 1, 1, 2), ck('e', HOJE, 2, 2, 2),
  ]);
  ok(s.suficiente && s.base === 5, 'com 5 pessoas a saúde sai, com a base');
  ok(s.esferas.mente.baixa === 60 && s.esferas.corpo.baixa === 20 && s.esferas.espirito.alta === 60, 'mente baixa em 60%, corpo baixo em 20%, espírito alto em 60% (vale o último check-in de cada um)');
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
  ok(ad.media7.abriram === 0.6 && ad.media7.leram === 0.4, 'a média dos últimos 7 dias, com uma casa');
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

  B.gravarEstadoNoBanco(db, 'ana', { lidos: [1, 2, 3], marcadoEm: { 1: '2026-09-01', 2: '2026-09-02', 3: '2026-09-02' }, licoesEm: { x: '2026-09-05' }, conhecidos: { 1: '2026-09-07' }, oia: { 1: { o: 'segredo' } } });
  B.gravarEstadoNoBanco(db, 'bia', { lidos: [1], marcadoEm: { 1: '2026-09-02' } });
  const preenchidas = I.preencherLeituraDias(db);
  ok(preenchidas === 5, 'a primeira subida copia as datas de quem já tinha progresso (4 da Ana, sem repetir o dia, e 1 da Bia)');
  ok(I.preencherLeituraDias(db) === 0, 'a segunda subida não copia de novo');
  const porDia = I.leiturasPorDia(db, '2026-08-31', '2026-09-30');
  ok(porDia.get('2026-09-02') === 2 && porDia.get('2026-09-01') === 1 && porDia.get('2026-09-05') === 1 && !porDia.has('2026-09-03'), 'a view leituras_por_dia conta pessoas por dia');
  ok([...I.quemLeuEntre(db, '2026-09-04', '2026-09-10')].join(',') === 'ana', 'quem leu na janela');
  ok(I.datasDesde(db, '2026-09-02').get('ana').size === 3 && I.datasDesde(db, '2026-09-02').get('bia').size === 1, 'as datas de cada um desde uma data');
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

  B.apagarPessoaDoBanco(db, 'ana');
  ok(db.prepare('SELECT COUNT(*) AS n FROM leitura_dias WHERE usuario = ?').get('ana').n === 0 && db.prepare('SELECT COUNT(*) AS n FROM checkins').get().n === 0, 'apagar a pessoa do banco leva as datas e os check-ins dela');
  B.fecharBanco(B.arquivoDoBanco(pasta));
  rmSync(pasta, { recursive: true, force: true });
}

// ---------- com servidor: quem vê o quê ----------
try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_ADMIN: 'lider' },
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

  // o progresso de cada um: hoje (líder, Dora, Eva), ontem (Ana), 40 dias até 4 dias atrás (Bia), parado há 9 dias (Caio)
  progressoDireto('lider', [somaDias(HOJE, -1), HOJE]);
  progressoDireto('ana', [somaDias(HOJE, -2), somaDias(HOJE, -1)]);
  progressoDireto('bia', dias(somaDias(HOJE, -43), 40));
  progressoDireto('caio', [somaDias(HOJE, -10), somaDias(HOJE, -9)]);
  progressoDireto('dora', [HOJE]);
  progressoDireto('eva', [HOJE]);
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
  ok(pc.frequencia.encontros.length === 3 && pc.frequencia.encontros[0].pessoas === 4 && pc.frequencia.encontros[1].semEncontro && pc.frequencia.encontros[1].pessoas === null && pc.frequencia.encontros[2].pessoas === 6,
    'a frequência: 4 pessoas, semana sem encontro, 6 pessoas (5 com conta, inclusive a visitante, mais 1 sem conta)');
  ok(pc.frequencia.tendencia === 'subindo' && pc.frequencia.diferenca === 2, 'tendência: 2 a mais que o encontro anterior');
  const funilPor = Object.fromEntries(pc.funil.map((x) => [x.etapa, x.pessoas]));
  ok(funilPor.comecando === 2 && funilPor.decidiu === 1 && funilPor.batizado === 1 && funilPor.acompanha === 1, 'o funil: 2 começando (Caio, Dora), 1 decidiu (Ana), 1 batizada (Bia), 1 acompanha (o líder)');
  // Todos entraram na célula hoje: quem chega no dia não "faltou" ao encontro de hoje (regra de
  // propositos.mjs), então aqui só valem os gatilhos de leitura.
  const porUsuario = Object.fromEntries(doLider.atencao.map((x) => [x.usuario, x]));
  ok(doLider.atencao.map((x) => x.usuario).join(',') === 'bia,caio', 'precisam de atenção: Bia (perdeu a ofensiva) antes de Caio (só sem ler)');
  ok(porUsuario.caio.gatilhos[0].tipo === 'semLer' && !porUsuario.caio.faltou && /sem ler há 9 dias/.test(porUsuario.caio.motivo), 'Caio está sem ler há 9 dias');
  ok(porUsuario.bia.gatilhos.length === 1 && porUsuario.bia.gatilhos[0].tipo === 'ofensiva' && /perdeu uma ofensiva de 40 dias há 3 dias/.test(porUsuario.bia.motivo), 'Bia foi ao encontro e leu há 4 dias, mas perdeu uma ofensiva de 40 dias: é o gatilho');
  ok(!('eva' in porUsuario), 'a visitante nunca entra em "precisam de atenção"');

  const daAna = await celulaDe(ana.cookie, id);
  ok(daAna && !daAna.euConduzo && !('painel' in daAna) && !('atencao' in daAna) && !('semanaLider' in daAna), 'membro comum não recebe painel, atenção nem a semana do líder');
  const rotaPainel = '/api/painel/celula?id=' + encodeURIComponent(id);
  const direto = await pedir(rotaPainel, null, lider.cookie);
  const dp = await dados(direto);
  ok(direto.status === 200 && dp.chama.pct === 60 && dp.funil.length === 4 && dp.atencao.length === 2 && dp.id === id, 'GET /api/painel/celula?id devolve o mesmo painel para quem conduz');
  ok((await pedir(rotaPainel, null, ana.cookie)).status === 403, 'membro comum: 403 no painel da célula');
  ok((await pedir(rotaPainel, null, fora.cookie)).status === 404, 'quem não é da célula: 404');
  ok((await pedir('/api/painel/celula?id=inventada', null, lider.cookie)).status === 404, 'célula inventada: 404');

  console.log('\n  Com servidor: o painel da igreja\n');
  for (const [quem, c, m, e] of [[lider, 3, 1, 3], [ana, 2, 1, 2], [bia, 1, 1, 1], [caio, 3, 2, 3], [dora, 2, 2, 2]]) {
    await pedir('/api/discipulado', { acao: 'checkin', corpo: c, mente: m, espirito: e }, quem.cookie);
  }
  ok((await pedir('/api/painel/igreja', null, ana.cookie)).status === 403, 'quem não é admin: 403 no painel da igreja');
  ok((await pedir('/api/painel/igreja', null, fora.cookie)).status === 403, 'nem quem está fora da célula');
  const r = await pedir('/api/painel/igreja', null, lider.cookie);
  const ig = await dados(r);
  ok(r.status === 200 && ig.hoje === HOJE && ig.geradoEm, 'o admin recebe o painel da igreja, com a data e a hora da conta');
  ok(ig.adocao.contas === 7 && ig.adocao.hoje.abriram === 7 && ig.adocao.hoje.leram === 3, 'adoção: 7 contas, todas abriram hoje, 3 leram hoje (líder, Dora, Eva)');
  ok(ig.adocao.serie.length === 14 && ig.adocao.serie[13].dia === HOJE && ig.adocao.serie[12].leram === 2, 'a série de 14 dias: ontem leram 2 (líder e Ana)');
  ok(ig.adocao.retencao.base === 0 && ig.adocao.retencao.pct === null, 'retenção ainda sem base: ninguém tem 30 dias de conta');
  ok(ig.chamaDasCelulas.length === 1 && ig.chamaDasCelulas[0].titulo === 'Célula de quinta' && ig.chamaDasCelulas[0].pct === 60 && ig.chamaDasCelulas[0].membros === 5 && ig.chamaDasCelulas[0].frequencia === 5,
    'a chama das células: a célula com 60% (3 de 5) e frequência média 5 nos últimos encontros');
  ok(ig.evangelismo.mes === HOJE.slice(0, 7) && ig.evangelismo.deste.decisao === 'menos de 5' && ig.evangelismo.deste.batismo === 'menos de 5', 'frutos do mês: 1 decisão vira "menos de 5"');
  ok(ig.saude.suficiente && ig.saude.base === 5 && ig.saude.esferas.mente.baixa === 60 && ig.saude.esferas.corpo.baixa === 20, 'saúde: 5 check-ins bastam; 60% com a mente baixa, 20% com o corpo baixo');
  const textoIgreja = JSON.stringify(ig);
  ok(!/"(lider|ana|bia|caio|dora|eva|fora)"|@|usuario|teste\.com/.test(textoIgreja), 'o painel da igreja não leva nome, @, e-mail nem usuário de ninguém');
  ok(!/corpo":1|"oia"|segredo/.test(textoIgreja), 'nem o check-in de uma pessoa nem o que alguém escreveu');

  // a cópia das datas acompanha a sincronização pela API
  await pedir('/api/estado', { atualizadoEm: Date.now(), lidos: [1, 2], marcadoEm: { 1: somaDias(HOJE, -10), 2: somaDias(HOJE, -9) }, licoesEm: { 'x': HOJE } }, caio.cookie);
  const db = B.abrirBanco(B.arquivoDoBanco(PASTA));
  const deCaio = db.prepare('SELECT data FROM leitura_dias WHERE usuario = ? ORDER BY data').all('caio').map((l) => l.data);
  B.fecharBanco(B.arquivoDoBanco(PASTA));
  ok(deCaio.join(',') === [somaDias(HOJE, -10), somaDias(HOJE, -9), HOJE].join(','), 'PUT /api/estado atualiza leitura_dias (a lição de hoje entrou)');
  const igDepois = await dados(await pedir('/api/painel/igreja', null, lider.cookie));
  ok(igDepois.adocao.hoje.leram === 3 && igDepois.geradoEm === ig.geradoEm, 'o painel da igreja fica em cache por uns minutos: a mesma geração');
} finally {
  servidor.kill();
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
