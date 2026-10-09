// Célula num Chrome sem interface: toda frase que pede uma ação tem o botão que leva até onde ela
// se faz (o mesmo critério dos Desafios). Confere, com contas criadas pela API num servidor próprio:
//   C1 "Ore hoje por": "Orei" (anota no diário e some) e "Mandar uma mensagem" (WhatsApp pronto)
//   C2 o check-in de Corpo, Mente e Espírito de um membro SEM discipulador: botão na aba Hoje,
//      aceito pelo servidor e somado no Painel (só a soma); "Lembrar a célula" para quem conduz
//   C3 "Registrar o encontro" no Painel vazio, e a folha com a data do encontro em destaque (C12)
//   C4 "Pedir para a célula marcar" no Painel e "Marcar minha caminhada" na aba Hoje
//   C5 "Ler agora" na meta da célula
//   C6 "Ler a leitura da semana" no Estudo vazio de quem não conduz
//   C7 o recado com dia e hora (validado no servidor) e o .ics de "Pôr na agenda" no horário certo
//   C8 a C10 o cartão do próximo encontro, a contagem da célula e "Tirar da célula" em vermelho
//   D1 e D2 as caixas de marcar de Minha caminhada e "Marcar o encontro com <nome>"
// Uso: CHROME=<chrome> node ferramentas/teste-celula-botoes.mjs   (PORTA=<porta> para trocar a 8376)
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA_NAV = await portaLivre();
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8376;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pastaEstado = process.env.PASTA_ESTADO || mkdtempSync(join(tmpdir(), 'cc-celula-botoes-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_TESTE: '1' },
  stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-celula-botoes-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil,
  '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });

const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 80; i++) { try { await fetch(base + 'api/existe-conta'); break; } catch { await dormir(150); } }

// ---------- a API ----------
const pedir = async (rota, corpo, cookie) => {
  const r = await fetch(base + rota, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0], dado: await r.json().catch(() => ({})) };
};
const criar = async (usuario, extra = {}) => (await pedir('api/criar-conta', {
  usuario, senha: 'senha123', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true, ...extra,
})).cookie;
const celulaDe = async (cookie, id) => ((await pedir('api/propositos', null, cookie)).dado.propositos || []).find((p) => p.id === id);

const lider = await criar('lider');
const criada = (await pedir('api/celula', { acao: 'criar', titulo: 'Célula de quinta' }, lider)).dado;
const ID = criada.proposito.id;
const token = new URL((await pedir('api/celula', { acao: 'link', id: ID }, lider)).dado.link).searchParams.get('celula');
const ana = await criar('ana', { celula: token });
const bia = await criar('bia', { celula: token });
await pedir('api/celula', { acao: 'encontro', id: ID, dia: 3 }, lider);

// ---------- o navegador ----------
async function alvo() {
  for (let i = 0; i < 60; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:' + PORTA_NAV + '/json/list')).json();
      const p = l.find((x) => x.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch { /* subindo */ }
    await dormir(250);
  }
  throw new Error('sem navegador');
}
const ws = new WebSocket(await alvo());
let seq = 0;
const pend = new Map();
const evs = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); } else if (m.method) evs.push(m);
});
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const esperar = async (expr, ms = 8000) => {
  for (let t = 0; t < ms; t += 150) {
    if (await av(expr)) return true;
    await dormir(150);
  }
  return false;
};
const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
const alto = (sel) => av('(() => { const el = ' + q(sel) + '; return !!el && el.getBoundingClientRect().height >= 44; })()');
const clicar = (sel) => av('(() => { const el = ' + q(sel) + '; if (!el) return false; el.click(); return true; })()');

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Network.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
// O navegador no fuso das contas (o padrão do servidor é São Paulo). Com a máquina em UTC, das
// 21h às 24h de Brasília o app já estava no dia seguinte e o servidor ainda no de hoje: o
// "Orei" e o check-in iam para dias diferentes e o teste falhava só à noite.
await cmd('Emulation.setTimezoneOverride', { timezoneId: 'America/Sao_Paulo' });
// sem a abertura, sem o convite de notificações e sem o tutorial de instalar por cima da tela;
// o .ics de "Pôr na agenda" fica guardado em window.__ics em vez de baixar
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}"
  + ';(function(){const o=URL.createObjectURL.bind(URL);URL.createObjectURL=function(b){if(b&&b.type&&b.type.indexOf("calendar")>-1)b.text().then(function(t){window.__ics=t});return o(b)}})();' });

// Entra como uma conta (cookie novo, armazenamento limpo) e abre a rota.
async function como(cookie, rota) {
  await cmd('Page.navigate', { url: base + 'privacidade.html' });
  await esperar('document.readyState === "complete"');
  await av('localStorage.clear(); sessionStorage.clear(); true');
  const [nome, ...resto] = cookie.split('=');
  await cmd('Network.setCookie', { name: nome, value: resto.join('='), url: base });
  await cmd('Page.navigate', { url: base + rota });
  await esperar('!!window.CC && !!document.querySelector("#conteudo")');
}
const abrir = async (rota, pronto) => {
  await av('location.hash = ' + JSON.stringify(rota));
  return esperar(pronto);
};
const rotaCelula = (aba) => '#/novidades/celula/' + ID + (aba ? '/' + aba : '');

console.log('\n  Célula: cada frase que pede uma ação tem o botão\n');

// ---------- C2 no servidor: o check-in de quem não tem discipulador ----------
const semDisc = (await pedir('api/discipulado', null, bia)).dado;
ok(!semDisc.meuDiscipulador, 'a Bia está na célula e não tem discipulador');
const rBia = await pedir('api/discipulado', { acao: 'checkin', corpo: 2, mente: 1, espirito: 3 }, bia);
ok(rBia.status === 200 && rBia.dado.checkin && rBia.dado.checkin.mente === 1, 'o servidor aceita o check-in de um membro da célula sem discipulador');
ok((await pedir('api/discipulado', { acao: 'checkin', corpo: 4, mente: 1, espirito: 3 }, bia)).status === 400, 'nível fora de 1 a 3 é recusado');

// ---------- o líder: aba Hoje (C1, C8, C9) ----------
await como(lider, rotaCelula());
ok(await esperar(q('.painel-celula .lista-ore-hoje')), 'C1: quem conduz vê "Ore hoje por" na aba Hoje');
const linhasOre = await av('[...document.querySelectorAll("[data-ore-hoje]")].map((l) => l.dataset.oreHoje).sort().join(",")');
ok(linhasOre === 'ana,bia', 'C1: uma linha por pessoa do rodízio (' + linhasOre + ')');
ok(await av('[...document.querySelectorAll("[data-ore-hoje]")].every((l) => l.querySelector("[data-orei]") && l.querySelector("a.botao-whatsapp[href^=\\"https://wa.me/?text=\\"]")) && [...document.querySelectorAll("[data-ore-hoje] [data-orei], [data-ore-hoje] .botao-whatsapp")].every((b) => b.getBoundingClientRect().height >= 44)'),
  'C1: cada linha tem "Orei" e "Mandar uma mensagem", com 44px de toque');
ok(await av('decodeURIComponent(' + q('[data-mensagem-oracao="ana"]') + '.href).includes("Oi, ana! Hoje eu orei por você.")'), 'C1: a mensagem do WhatsApp já vem pronta com o nome');
await clicar('[data-orei="ana"]');
ok(await esperar('!document.querySelector("[data-ore-hoje=\\"ana\\"]") && !!CC.diaDoDiario()["orei_ana"]'), 'C1: "Orei" anota orei_ana no diário de hoje e a linha some');
await av('CC.redesenhar(); true');
// redesenhar busca a célula de novo no servidor: com a máquina carregada passa de 8 s
ok(await esperar('!!document.querySelector("[data-ore-hoje=\\"bia\\"]") && !document.querySelector("[data-ore-hoje=\\"ana\\"]")', 20000), 'C1: redesenhada, a linha de quem já recebeu oração continua fora até amanhã');
ok(await av('!!' + q('.cabeca-celula .cartao-encontro') + ' && /Próximo encontro/.test(' + q('.cartao-encontro') + '.textContent) && /^(Hoje|Quarta, \\d+\\/\\d+)$/.test(' + q('.cartao-encontro .textos > span') + '.textContent)'),
  'C8: o cartão "Próximo encontro" no alto, com o dia marcado (quarta)');
ok(await av('!/Encontro às|encontro às/.test(' + q('#conteudo') + '.textContent)'), 'C8: a linha repetida "Encontro às quartas-feiras" saiu');
ok(await av('/com a célula inteira lendo/.test(' + q('.cabeca-celula .dias-cartao small') + '.textContent)'), 'C9: a contagem diz "com a célula inteira lendo"');

// ---------- o líder: Painel (C2, C3, C12, C4) ----------
await abrir(rotaCelula('painel'), '!!' + q('.cartao-saude'));
ok(await esperar(q('[data-lembrar-checkin]')) && await alto('[data-lembrar-checkin]'), 'C2: o Painel tem "Lembrar a célula" (só 1 de 3 fez o check-in)');
ok(await av('decodeURIComponent(' + q('[data-lembrar-checkin]') + '.href).includes("Fazer meu check-in")'), 'C2: o lembrete diz onde fazer o check-in');
const doPainel = await celulaDe(lider, ID);
ok(doPainel.painel.saude.base === 1 && !doPainel.painel.saude.suficiente, 'C2: o check-in da Bia entra na soma do Painel (base 1), sem aparecer sozinho');
ok(await av('!/Média|Baixa|Alta/.test(' + q('.painel-celula') + '.textContent)'), 'C2: nenhum nível de check-in de uma pessoa aparece no Painel');
ok(await av('!!' + q('.cartao-saude [data-registrar-encontro]')) && await alto('.cartao-saude [data-registrar-encontro]'), 'C3: a frequência vazia tem "Registrar o encontro"');
await clicar('.cartao-saude [data-registrar-encontro]');
ok(await esperar('!!document.querySelector(".folha h2") && document.querySelector(".folha h2").textContent === "Quem foi ao encontro?"'), 'C3: o botão abre a folha "Quem foi ao encontro?"');
ok(await av('/o encontro desta semana|Hoje|Ontem/.test(' + q('[data-realce-data]') + '.textContent) && ' + q('[data-outras-datas]') + '.hidden'), 'C12: a data do encontro em destaque, as outras escondidas');
await clicar('[data-outra-data]');
ok(await av('!' + q('[data-outras-datas]') + '.hidden && document.querySelectorAll("[data-outras-datas] [data-data]").length === 8 && ' + q('[data-outra-data]') + '.getAttribute("aria-expanded") === "true"'), 'C12: "Outra data" mostra as 8 datas');
await av('document.querySelectorAll("[data-outras-datas] [data-data]")[2].click(); true');
ok(await esperar('!/encontro desta semana/.test(' + q('[data-realce-data]') + '.textContent) || document.querySelectorAll("[data-outras-datas] [data-data]")[2].dataset.data === CC.hojeIso()'), 'C12: escolher outra data troca o destaque');
await clicar('.folha [data-fechar]');
await esperar('!document.querySelector(".folha")');
ok(await av('!!' + q('[data-pedir-caminhada]')) && await alto('[data-pedir-caminhada]'), 'C4: o Painel tem "Pedir para a célula marcar"');
ok(await av('decodeURIComponent(' + q('[data-pedir-caminhada]') + '.href).includes("Minha caminhada")'), 'C4: o recado diz onde marcar');

// ---------- o líder: Pessoas (C10) ----------
await abrir(rotaCelula('pessoas'), '!!' + q('[data-remover]'));
ok(await av('(() => { const t = document.querySelector("[data-remover=\\"ana\\"]"); return t.textContent === "Tirar da célula" && t.classList.contains("botao-perigo") && getComputedStyle(t).color !== getComputedStyle(document.querySelector("[data-auxiliar=\\"ana\\"]")).color && t.closest(".acoes-pessoa") === document.querySelector("[data-auxiliar=\\"ana\\"]").closest(".acoes-pessoa"); })()'),
  'C10: "Tirar da célula" em vermelho, separado de "Tornar auxiliar"');
await clicar('[data-remover="ana"]');
ok(await esperar('!!document.querySelector(".cortina, .confirmar, [data-confirmar-sim], .folha") '), 'C10: tirar ainda pede confirmação');
await av('(() => { const b = [...document.querySelectorAll(".folha button, .cortina button")].find((x) => /Cancelar|Agora não|Voltar/.test(x.textContent)); if (b) b.click(); return true; })()');
await dormir(400);

// ---------- C7: o recado com dia e hora ----------
// a próxima quinta, de 3 a 9 dias para a frente (sempre no futuro, em qualquer fuso)
const hojeUtc = new Date();
let quinta = null;
for (let i = 3; i <= 9; i++) { const d = new Date(Date.UTC(hojeUtc.getUTCFullYear(), hojeUtc.getUTCMonth(), hojeUtc.getUTCDate() + i)); if (d.getUTCDay() === 4) { quinta = d; break; } }
const isoQuinta = quinta.toISOString().slice(0, 10);
ok((await pedir('api/celula', { acao: 'recado', id: ID, texto: 'Na casa da Ana', quando: isoQuinta + 'T25:00' }, lider)).status === 400, 'C7: o servidor recusa hora que não existe');
ok((await pedir('api/celula', { acao: 'recado', id: ID, texto: 'Na casa da Ana', quando: '2020-01-02T20:00' }, lider)).status === 400, 'C7: o servidor recusa dia que já passou');
ok((await pedir('api/celula', { acao: 'recado', id: ID, texto: 'Oi', quando: isoQuinta + 'T20:00' }, ana)).status !== 200, 'C7: quem não conduz não escreve recado');
// o líder escreve pela folha, escolhendo dia e hora
await abrir(rotaCelula(), '!!' + q('[data-recado]'));
await clicar('[data-recado]');
await esperar('!!' + q('.folha [data-quando-dia]'));
await av('(() => { const f = document.querySelector(".folha"); f.querySelector("[data-texto]").value = "Na casa da Ana. Tragam a Bíblia!"; f.querySelector("[data-quando-dia]").value = ' + JSON.stringify(isoQuinta) + '; return true; })()');
await clicar('.folha [data-salvar]');
ok(await esperar('/hora do encontro também/.test(' + q('.folha .erro-proposito') + '.textContent)'), 'C7: dia sem hora pede a hora');
await av(q('.folha [data-quando-hora]') + '.value = "20:00"; true');
await clicar('.folha [data-salvar]');
ok(await esperar('!document.querySelector(".folha")'), 'C7: com dia e hora, o recado é publicado');
const comQuando = await celulaDe(ana, ID);
ok(comQuando.recadoQuando === isoQuinta + 'T20:00', 'C7: o servidor guarda recadoQuando (' + comQuando.recadoQuando + ')');

// ---------- a Ana (membro, sem discipulador): aba Hoje (C7, C8, C2, C4, C5) ----------
await como(ana, rotaCelula());
ok(await esperar(q('[data-agenda]')), 'C7: o recado com dia e hora mostra "Pôr na agenda" para a célula');
const rotulo = await av(q('[data-agenda]') + '.textContent');
ok(/^Pôr na agenda · qui, \d+\/\d+, 20h$/.test(rotulo) && await alto('[data-agenda]'), 'C7: o botão diz o dia e a hora (' + rotulo + ')');
ok(await av('/^Quinta, \\d+\\/\\d+, às 20h$/.test(' + q('.cartao-encontro .textos > span') + '.textContent)'), 'C8: o próximo encontro segue o dia e a hora do recado, não o dia da semana marcado');
await clicar('[data-agenda]');
ok(await esperar('typeof window.__ics === "string"'), 'C7: tocar gera o .ics');
const ics = String(await av('window.__ics'));
const compacto = isoQuinta.replace(/-/g, '');
ok(ics.includes('\r\nDTSTART:' + compacto + 'T200000\r\n') && ics.includes('\r\nDTEND:' + compacto + 'T220000\r\n'), 'C7: o .ics começa às 20h do dia escolhido, na hora local, e dura 2 horas');
ok(/BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT1H\r\n/.test(ics), 'C7: o .ics tem o lembrete 1 hora antes');
ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0') && ics.includes('SUMMARY:Encontro da Célula de quinta') && ics.includes('DESCRIPTION:Na casa da Ana. Tragam a Bíblia!') && ics.trim().endsWith('END:VCALENDAR'), 'C7: o .ics é um calendário válido com o nome da célula e o recado');

ok(await av('!!' + q('[data-checkin]')) && await alto('[data-checkin]'), 'C2: um membro sem discipulador tem "Fazer meu check-in" na aba Hoje');
await clicar('[data-checkin]');
ok(await esperar('!!' + q('.folha-checkin')), 'C2: o botão abre a folha do check-in');
ok(await av('/só a soma aparece para quem conduz/.test(' + q('.folha-checkin') + '.textContent)'), 'C2: a folha diz que só a soma aparece');
await av('["corpo","mente","espirito"].forEach((k) => document.querySelector(".folha-checkin [data-esfera=\\"" + k + "\\"][data-nivel=\\"2\\"]").click()); true');
await clicar('.folha-checkin [data-salvar]');
ok(await esperar('!document.querySelector(".folha-checkin")'), 'C2: "Pronto" fecha a folha');
const checkinAna = (await pedir('api/discipulado', null, ana)).dado.meuCheckin;
ok(checkinAna && checkinAna.corpo === 2 && checkinAna.mente === 2, 'C2: o servidor aceitou o check-in da Ana, que não tem discipulador');
ok(await esperar('!document.querySelector("[data-checkin]")'), 'C2: feito o check-in de hoje, o botão some');
ok((await celulaDe(lider, ID)).painel.saude.base === 2, 'C2: o Painel soma os dois check-ins');

ok(await av('!!' + q('[data-marcar-caminhada]') + ' && ' + q('[data-marcar-caminhada]') + '.getAttribute("href") === "#/perfil/discipulado"') && await alto('[data-marcar-caminhada]'), 'C4: quem ainda não marcou nada tem "Marcar minha caminhada"');
ok(await av('!!' + q('[data-ler-agora]') + ' && ' + q('[data-ler-agora]') + '.getAttribute("href") === "#/"') && await alto('[data-ler-agora]'), 'C5: a meta não foi batida e a Ana ainda não leu: "Ler agora" leva à lição do dia');
await clicar('[data-ler-agora]');
ok(await esperar('location.hash === "#/" && !!document.querySelector(".no, .trilha")'), 'C5: "Ler agora" abre a Trilha');
await abrir(rotaCelula(), '!!' + q('[data-marcar-caminhada]'));
await clicar('[data-marcar-caminhada]');
ok(await esperar('location.hash === "#/perfil/discipulado" && document.querySelectorAll("[data-marco][role=checkbox]").length === 4'), 'C4/D1: o atalho abre Minha caminhada, com 4 caixas de marcar');
await clicar('[data-marco="batismo"]');
ok(await esperar('!!' + q('.folha [data-quando]')), 'D1: tocar na caixa abre "Quando foi?"');
await clicar('.folha [data-salvar]');
ok(await esperar('document.querySelector("[data-marco=\\"batismo\\"]").getAttribute("aria-checked") === "true" && /^Em \\d{2}\\/\\d{2}\\/\\d{4}$/.test(document.querySelector("[data-marco=\\"batismo\\"] small").textContent)'), 'D1: marcado, a caixa fica cheia e mostra a data');
await abrir(rotaCelula(), '!!' + q('.painel-celula .recado-lider'));
ok(await av('!document.querySelector("[data-marcar-caminhada]")'), 'C4: depois de marcar, o atalho sai da aba Hoje');

// ---------- a Ana: Estudo vazio (C6) ----------
await abrir(rotaCelula('estudo'), '!!' + q('.painel-celula .vazio-amigos'));
const leitura = await av(q('[data-leitura-semana]') + '?.getAttribute("href")');
ok(/^#\/dia\/\d+$/.test(leitura || '') && await alto('[data-leitura-semana]'), 'C6: quem não conduz tem "Ler a leitura da semana" (' + leitura + ')');
await clicar('[data-leitura-semana]');
ok(await esperar('location.hash === ' + JSON.stringify(leitura) + ' && !!document.querySelector(".licao")'), 'C6: o botão abre a lição da semana da célula');

// ---------- D2: o discipulador sem encontro marcado ----------
await pedir('api/discipulado', { acao: 'convidar', usuario: 'bia', papel: 'discipulador' }, lider);
const pedido = ((await pedir('api/discipulado', null, bia)).dado.pedidos || [])[0];
await pedir('api/discipulado', { acao: 'aceitar', id: pedido.id, mostrar: { passos: true } }, bia);
await como(lider, '#/discipulado');
ok(await esperar('!!document.querySelector("[data-encontro]")'), 'D2: quem acompanha vê o cartão da Bia');
ok(await av(q('[data-encontro]') + '.textContent === "Marcar o encontro com bia"'), 'D2: sem encontro marcado, o botão diz "Marcar o encontro com bia"');

const erros = evs.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.exception?.description || 'exceção');
ok(erros.length === 0, 'nenhuma exceção de JavaScript' + (erros[0] ? ': ' + erros[0].slice(0, 120) : ''));

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  cada frase da célula leva aonde a ação se faz\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
if (!process.env.PASTA_ESTADO) { try { rmSync(pastaEstado, { recursive: true, force: true }); } catch { /* ok */ } }
process.exit(falhas ? 1 : 0);
