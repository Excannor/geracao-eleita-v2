// Relógio deslocado, para simular "amanhã" sem esperar: o servidor de teste sobe com
//
//   RELOGIO_DIAS=3 node --import ./design/ferramentas/analise/relogio.mjs servidor.mjs 8680
//
// e todo `new Date()` / `Date.now()` do processo passa a responder 3 dias à frente. É assim
// que o "hoje" das leituras (contas.mjs hojeNoFuso, a régua dos 7 dias de atraso em
// servidor.mjs conferirProgresso, as datas gravadas em leitura_dias) anda junto com o do
// navegador. A variável CAMINHO_RELOGIO do servidor NÃO serve para isso: ela só vale com
// CAMINHO_PUSH_TESTE=1 e só move o relógio dos avisos sociais (agoraDoServidor).
//
// O mesmo deslocamento vai para a página: `codigoDoDesvio(ms)` devolve o JS que
// jornada.mjs injeta antes de cada documento (Page.addScriptToEvaluateOnNewDocument), e
// CC.hojeIso() (src/app/01-nucleo.js: iso(new Date())) passa a dar o dia simulado.
//
// Só para ferramentas de teste. Em produção ninguém carrega este arquivo.

export const DIA_MS = 24 * 60 * 60 * 1000;

// JS autônomo, igual nos dois lados: a classe estende o Date de verdade, então
// Intl.DateTimeFormat, getTimezoneOffset, toISOString e JSON continuam funcionando.
export const codigoDoDesvio = (ms) => '(() => { const desvio = ' + Number(ms || 0) + '; if (!desvio) return;'
  + ' const Real = Date;'
  + ' class Deslocado extends Real { constructor(...a) { if (a.length === 0) super(Real.now() + desvio); else super(...a); } static now() { return Real.now() + desvio; } }'
  + " Object.defineProperty(Deslocado, 'name', { value: 'Date' });"
  + ' globalThis.Date = Deslocado; })();';

const dias = Number(process.env.RELOGIO_DIAS || 0);
if (dias) {
  // eslint-disable-next-line no-new-func
  new Function(codigoDoDesvio(dias * DIA_MS))();
  if (process.env.RELOGIO_AVISAR) console.error('relógio deslocado em ' + dias + ' dia(s): hoje é ' + new Date().toISOString());
}
