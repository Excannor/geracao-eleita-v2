// Confere as regras dos propósitos sem servidor: tipos e alvos com os livros reais do plano,
// o que conta como feito em cada tipo, dias juntos numa dupla, a meta coletiva do grupo e a
// sequência.
// Uso: node ferramentas/teste-propositos-regras.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = await import(pathToFileURL(join(AQUI, 'propositos.mjs')).href);
const { diasDeProposito } = await import(pathToFileURL(join(AQUI, 'contas.mjs')).href);
const PLANO = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'conteudo.json'), 'utf8')).plano;
const LIVROS = [...new Set(PLANO.flatMap((d) => d.livros))];

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};
const dias = (desde, n) => Array.from({ length: n }, (_, i) => { const d = new Date(desde + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });

console.log('\n  Propósitos: regras\n');

// ---------- tipos e alvos ----------
ok(R.NOVO_TESTAMENTO.length === 27 && R.NOVO_TESTAMENTO.every((l) => LIVROS.includes(l)), 'os 27 livros do Novo Testamento estão escritos igual ao plano');
ok(R.livrosDoAlvo('at', LIVROS).size === 39 && !R.livrosDoAlvo('at', LIVROS).has('Mateus'), 'o Antigo Testamento são os outros 39');
ok(R.alvoValido('plano', '', LIVROS) && R.alvoValido('oracao', '', LIVROS) && R.alvoValido('livro', 'nt', LIVROS) && R.alvoValido('livro', 'Rute', LIVROS),
  'alvos válidos: plano, oração, Novo Testamento, um livro');
ok(!R.alvoValido('livro', 'Livro Inventado', LIVROS) && !R.alvoValido('plano', 'nt', LIVROS) && !R.alvoValido('festa', '', LIVROS) && !R.alvoValido('constructor', '', LIVROS),
  'alvo inventado, alvo no tipo errado e tipo que não existe são recusados');
ok(R.rotuloDoProposito('livro', 'nt') === 'Novo Testamento' && R.rotuloDoProposito('livro', 'Rute') === 'Rute' && R.rotuloDoProposito('oracao', '') === 'Oração',
  'cada propósito ganha um nome que se entende');

// ---------- o que conta como feito ----------
const diaComNt = PLANO.find((d) => d.novo);
const diaSemNt = PLANO.find((d) => !d.novo);
const estado = {
  marcadoEm: { [diaComNt.numero]: '2026-03-01', [diaSemNt.numero]: '2026-03-02' },
  licoesEm: { passo1: '2026-03-03' },
  oradoEm: { '2026-03-01': 1, '2026-03-05': 1 },
  oia: { [diaComNt.numero]: { oracao: 'texto que é só meu' } },
  diario: { '2026-03-01': { praticas: 1 }, '2026-03-02': { notas: 2 }, '2026-03-03': { leitor: 1 } },
};
const plano = R.datasDoTipo('plano', '', estado, PLANO);
ok(plano.has('2026-03-01') && plano.has('2026-03-02') && plano.has('2026-03-03') && plano.size === 3, 'plano: vale a lição do dia e os primeiros passos');
const nt = R.datasDoTipo('livro', 'nt', estado, PLANO);
ok(nt.has('2026-03-01') && !nt.has('2026-03-02'), 'Novo Testamento: vale o dia do plano que passa por ele, e não o que não passa (dia ' + diaSemNt.numero + ')');
const oracao = R.datasDoTipo('oracao', '', estado, PLANO);
ok(oracao.size === 2 && oracao.has('2026-03-05'), 'oração: vale o dia do "Orei"');
ok(![...oracao, ...plano, ...nt].some((d) => /texto/.test(d)), 'as regras só enxergam datas, nunca o que foi escrito');
ok(R.extraNoDia(estado, '2026-03-01') === 1 && R.extraNoDia(estado, '2026-03-02') === 1 && R.extraNoDia(estado, '2026-03-03') === 0 && R.extraNoDia(estado, '2026-03-09') === 0,
  'extra do grupo: praticar ou abrir uma nota vale; só ler no leitor não é extra');

// ---------- dupla ----------
const s = (lista) => new Set(lista);
const cenarios = [
  [dias('2026-03-01', 5), dias('2026-03-01', 5), [], [], '2026-03-01', '2026-03-05'],
  [dias('2026-03-01', 5), dias('2026-03-01', 4), [], [], '2026-03-01', '2026-03-05'],
  [dias('2026-03-01', 5), ['2026-03-01', '2026-03-02', '2026-03-04', '2026-03-05'], [], ['2026-03-03'], '2026-03-01', '2026-03-05'],
  [dias('2026-03-01', 5), ['2026-03-01', '2026-03-02', '2026-03-04', '2026-03-05'], [], [], '2026-03-01', '2026-03-05'],
  [dias('2026-03-01', 5), dias('2026-03-01', 5), [], [], '2026-03-04', '2026-03-05'],
];
const iguais = cenarios.every(([a, b, pa, pb, desde, hoje]) => R.diasJuntos({ tipo: 'plano', datasA: s(a), datasB: s(b), protegidosA: s(pa), protegidosB: s(pb), desde, hoje })
  === diasDeProposito({ feitas: s(a), protegidos: s(pa) }, { feitas: s(b), protegidos: s(pb) }, desde, hoje));
ok(iguais, 'dupla de plano conta exatamente como o propósito de antes (5 cenários, com escudo)');
ok(R.diasJuntos({ tipo: 'oracao', datasA: s(dias('2026-03-01', 5)), datasB: s(['2026-03-01', '2026-03-02', '2026-03-04', '2026-03-05']), protegidosB: s(['2026-03-03']), desde: '2026-03-01', hoje: '2026-03-05' }) === 2,
  'na oração o escudo não vale: um dia sem orar recomeça a contagem');
ok(R.diasJuntos({ tipo: 'livro', datasA: s(['2026-03-01', '2026-03-03', '2026-03-09']), datasB: s(['2026-03-01', '2026-03-03', '2026-03-04', '2026-03-09']), desde: '2026-03-02', hoje: '2026-03-10' }) === 2,
  'num livro, conta os dias lidos juntos desde o começo, sem precisar ser seguido');

// ---------- grupo: meta coletiva ----------
const p = (lista) => lista.map(([feito, extra]) => ({ feito, extra }));
ok(R.pontosDoDia(p([[1, 0], [1, 0], [1, 0], [0, 1], [0, 1]])).batida, '5 pessoas: 3 leem e 2 só praticam, e o grupo bate a meta');
const nao = R.pontosDoDia(p([[1, 0], [1, 0], [0, 0], [0, 0], [0, 0]]));
ok(!nao.batida && nao.faltam === 3, '5 pessoas: 2 leem e ninguém faz extra, faltam 3');
ok(R.pontosDoDia(p([[1, 1], [1, 0], [0, 0]])).batida, '3 pessoas: quem leu e praticou cobre quem faltou');
ok(R.pontosDoDia(p([[1, 1], [0, 0], [0, 0]])).pontos === 2, 'ninguém soma mais de 2 pontos sozinho');
ok(!R.pontosDoDia([]).batida, 'grupo sem membros no dia não bate meta');

const batidos = new Set(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-06']);
ok(R.sequenciaDoGrupo({ tipo: 'plano', batidaEm: (d) => batidos.has(d), desde: '2026-03-01', hoje: '2026-03-05' }) === 3, 'grupo: hoje ainda aberto conta os dias batidos seguidos até ontem');
ok(R.sequenciaDoGrupo({ tipo: 'plano', batidaEm: (d) => batidos.has(d), desde: '2026-03-01', hoje: '2026-03-06' }) === 1, 'um dia sem meta recomeça a sequência do grupo');
ok(R.sequenciaDoGrupo({ tipo: 'livro', batidaEm: (d) => batidos.has(d), desde: '2026-03-01', hoje: '2026-03-06' }) === 4, 'grupo de livro soma os dias batidos, seguidos ou não');
ok(R.sequenciaDoGrupo({ tipo: 'plano', batidaEm: () => true, desde: '2026-03-04', hoje: '2026-03-06' }) === 3, 'a sequência não conta antes de o grupo existir');

// ---------- célula: quem precisa de atenção ----------
{
  const A = (candidatos, encontros, referencia = '2026-03-20') => R.quemPrecisaDeAtencao({ candidatos, encontros, referencia });
  const enc = [{ data: '2026-03-12', presentes: ['bia'] }, { data: '2026-03-19', presentes: ['bia'] }];
  const leu = (...d) => new Set(d);
  const r1 = A([{ usuario: 'ana', nome: 'Ana', entrouEm: '2026-03-01', datas: leu('2026-03-19') },
    { usuario: 'bia', nome: 'Bia', entrouEm: '2026-03-01', datas: leu('2026-03-19') }], enc);
  ok(r1.length === 1 && r1[0].usuario === 'ana' && r1[0].motivo === 'faltou aos 2 últimos encontros', 'quem faltou aos 2 últimos encontros aparece, com o motivo');
  const rc = A([{ usuario: 'caio', nome: 'Caio', entrouEm: '2026-03-15', datas: leu('2026-03-19') }], enc);
  ok(rc.length === 1 && rc[0].motivo === 'faltou ao último encontro',
    'quem entrou depois do penúltimo encontro só responde pelo último');
  ok(!A([{ usuario: 'ana', nome: 'Ana', entrouEm: '2026-03-01', datas: leu() }], [enc[1]], '2026-03-04').length,
    'encontro depois da data de referência não conta; e 3 dias sem ler ainda não pede atenção');
  const r3 = A([{ usuario: 'ana', nome: 'Ana', entrouEm: '2026-03-01', datas: leu('2026-03-19') }], [enc[1]]);
  ok(r3.length === 1 && r3[0].motivo === 'faltou ao último encontro', 'quem não foi marcado no último encontro aparece');
  const r5 = A([{ usuario: 'eva', nome: 'Eva', entrouEm: '2026-03-19', datas: leu('2026-03-19') }], [enc[1]]);
  ok(!r5.length, 'quem entrou no dia do encontro não conta como falta');
  const feriado = [{ data: '2026-03-12', presentes: ['bia'] }, { data: '2026-03-19', presentes: [], semEncontro: true }];
  const rf = A([{ usuario: 'ana', nome: 'Ana', entrouEm: '2026-03-01', datas: leu('2026-03-19') }], feriado);
  ok(rf.length === 1 && rf[0].motivo === 'faltou ao último encontro', 'semana sem encontro não conta: vale o encontro de antes');
  ok(!A([{ usuario: 'bia', nome: 'Bia', entrouEm: '2026-03-01', datas: leu('2026-03-19') }], feriado).length,
    'quem foi ao último encontro de verdade não aparece por causa da semana sem encontro');
  const faltosos = Array.from({ length: 8 }, (_, i) => ({ usuario: 'f' + i, nome: 'Falta ' + i, entrouEm: '2026-03-01', datas: leu('2026-03-19') }));
  ok(A(faltosos, enc).length === 8, 'quem faltou entra sempre, sem o teto da lista');
  const r4 = A([{ usuario: 'davi', nome: 'Davi', entrouEm: '2026-03-01', datas: leu('2026-03-10') }], []);
  ok(r4.length === 1 && r4[0].motivo === 'sem ler há 10 dias', 'sem ler há 5 dias ou mais aparece com a contagem certa');
  const muitos = Array.from({ length: 8 }, (_, i) => ({ usuario: 'u' + i, nome: 'Pessoa ' + i, entrouEm: '2026-03-01', datas: leu() }));
  ok(A(muitos, []).length === R.LIMITE_ATENCAO, 'a lista mostra no máximo ' + R.LIMITE_ATENCAO + ' pessoas');
}

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  as regras dos propósitos estão certas\n');
process.exit(falhas ? 1 : 0);
