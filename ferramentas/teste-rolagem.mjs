// A rolagem fica no lugar quando a pessoa marca, alterna ou salva alguma coisa dentro de uma
// tela. Relato do dono (09/10): sem a ofensiva do dia, o "Reavivar hoje" abriu a lição; marcar
// a segunda passagem como lida jogava a lição de volta para o topo. Aqui: o caminho do relato,
// o caminho normal pela Trilha, e as outras ações que redesenham uma tela rolável (Explorar,
// Minhas anotações, Parábolas, mapa, Trilha, configurações). Só uma navegação para outra rota
// vai ao topo.
// Uso: node ferramentas/teste-rolagem.mjs   (CHROME, PORTA e PORTAS como nos outros testes)
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8661;
const DEPURACAO = await portaLivre();
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok    ' : '  FALHA ') + msg); if (!cond) falhas++; };
// Tolerância: alguns px de diferença (uma linha que mudou de "Marcar como lido" para "Lido").
const TOLERANCIA = 6;
const perto = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= TOLERANCIA;

const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const somaDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

const pasta = mkdtempSync(join(tmpdir(), 'cc-rolagem-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json') }, stdio: ['ignore', 'ignore', 'pipe'],
});
let erroServidor = '';
servidor.stderr.on('data', (d) => { erroServidor += d; });
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }
const r = await fetch(base + '/api/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ usuario: 'davi', nome: 'Davi', senha: 'senha-davi', email: 'davi@teste.com', nascimento: '2004-04-05', consentimento: true }) });
const cookie = (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie')]).map((c) => c.split(';')[0]);

// A conta do relato: leu os dias 1 a 3 há uma semana e parou. A ofensiva zerou, e a abertura
// oferece "Reavivar hoje" (10-roteador.js, avisosDoDia). O servidor só aceita datas de até 7
// dias atrás (servidor.mjs, conferirProgresso).
const lidos = [1, 2, 3];
const marcadoEm = Object.fromEntries(lidos.map((n) => [n, somaDias(n - 8)]));
await fetch(base + '/api/estado', { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookie.join('; ') },
  body: JSON.stringify({ atualizadoEm: Date.now(), lidos, marcadoEm }) });

// Uma célula conduzida pelo Davi, com gente bastante para a tela rolar.
const pedir = async (rota, corpo, ck) => {
  const resp = await fetch(base + '/' + rota, { method: corpo ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(ck ? { cookie: ck } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  return resp.json().catch(() => ({}));
};
const criada = await pedir('api/celula', { acao: 'criar', titulo: 'Célula de quinta' }, cookie.join('; '));
const ID_CELULA = criada.proposito && criada.proposito.id;
const tokenCelula = new URL((await pedir('api/celula', { acao: 'link', id: ID_CELULA }, cookie.join('; '))).link).searchParams.get('celula');
const cookiesDe = {};
for (const u of ['ana', 'bia', 'caio', 'duda', 'enzo', 'fabi']) {
  const resp = await fetch(base + '/api/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: u, senha: 'senha123', nome: u, email: u + '@teste.com', nascimento: '2000-01-01', consentimento: true, celula: tokenCelula }) });
  cookiesDe[u] = (resp.headers.getSetCookie ? resp.headers.getSetCookie() : [resp.headers.get('set-cookie')]).map((c) => c.split(';')[0]).join('; ');
}
await pedir('api/celula', { acao: 'encontro', id: ID_CELULA, dia: 3 }, cookie.join('; '));
// Pedidos de oração da célula, para a aba Oração rolar. O "Orei" é tocado num do meio: no
// último, o botão vira um selo mais baixo e a página, já no fim, encolhe uns px de verdade.
for (const [u, i] of [['ana', 1], ['bia', 2], ['caio', 3], ['duda', 4], ['enzo', 5], ['fabi', 6], ['ana', 7], ['bia', 8]]) {
  await pedir('api/cuidado', { acao: 'criar', celula: ID_CELULA, tipo: 'oracao', destino: 'celula', texto: 'Pedido ' + i + ': orem pela minha semana, pela prova e pela família.', dias: 7 }, cookiesDe[u]);
}

const perfil = mkdtempSync(join(tmpdir(), 'cc-rolagem-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + DEPURACAO,
  '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
let alvo;
for (let i = 0; i < 60 && !alvo; i++) {
  try { alvo = (await (await fetch('http://127.0.0.1:' + DEPURACAO + '/json/list')).json()).find((x) => x.type === 'page'); } catch { /* subindo */ }
  if (!alvo) await dormir(250);
}
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
let seq = 0;
const pend = new Map();
const excecoes = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') excecoes.push(m.params.exceptionDetails?.exception?.description || 'exceção');
});
await new Promise((res) => ws.addEventListener('open', res));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const esperar = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 150) { if (await av(expr)) return true; await dormir(150); } return false; };
const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
const existe = (sel) => '!!' + q(sel);
const clicar = (sel) => av('(() => { const el = ' + q(sel) + '; if (el) el.click(); return !!el; })()');

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Network.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
// No fuso das contas: com a máquina em UTC, à noite o app e o servidor discordavam do dia.
await cmd('Emulation.setTimezoneOverride', { timezoneId: 'America/Sao_Paulo' });
for (const c of cookie) { const [nome, valor] = c.split('='); await cmd('Network.setCookie', { name: nome, value: valor, url: base + '/' }); }
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar')}catch(e){}" });

// Quem rola: a página (window) ou um palco com overflow próprio (a lição, o leitor).
const ROLAGEM = `((sel) => { const p = sel && document.querySelector(sel); return p ? p.scrollTop : CC.rolagemY(); })`;
const rolagem = (sel) => av(ROLAGEM + '(' + JSON.stringify(sel || null) + ')');
// Rola até o elemento ficar na metade de baixo da tela, como quem desceu até ele com o dedo.
const descerAte = (sel, palco) => av(`(() => {
  const el = ${q(sel)}; if (!el) return null;
  const p = ${palco ? q(palco) : 'null'};
  const r = el.getBoundingClientRect();
  const delta = r.top - innerHeight * 0.6;
  if (p) p.scrollTop += delta; else CC.rolarPara(CC.rolagemY() + delta);
  return p ? p.scrollTop : CC.rolagemY();
})()`);
// Toca no elemento, espera o redesenho assentar e compara a rolagem de antes e de depois.
// Com fundo, a página desce até o fim (o alvo pode estar no alto de uma tela que rola pouco).
const irAoFundo = () => av('CC.rolarPara(CC.rolagemMax()), CC.rolagemY()');
async function conferir(nome, sel, { palco, pronto, espera = 700, minimo = 80, fundo = false } = {}) {
  const antes = fundo ? await irAoFundo() : await descerAte(sel, palco);
  if (antes === null) { ok(false, nome + ': não achei ' + sel); return; }
  if (!(antes >= minimo)) { ok(false, nome + ': a tela não rolou o bastante para medir (' + antes + ')'); return; }
  await clicar(sel);
  if (pronto) await esperar(pronto);
  await dormir(espera);
  const depois = await rolagem(palco);
  ok(perto(antes, depois), nome + ' (rolagem ' + Math.round(antes) + ' → ' + Math.round(depois) + ')');
}

await cmd('Page.navigate', { url: base + '/' });
ok(await esperar('!!(window.CC && CC.quem)', 15000), 'o app abre com a conta');

console.log('\n  A lição pelo "Reavivar hoje" (o relato do dono)\n');
ok(await esperar(existe('.cortina [data-ler]'), 15000), 'sem a ofensiva de hoje, a abertura oferece "Reavivar hoje"');
await clicar('.cortina [data-ler]');
ok(await esperar(existe('.licao-dia [data-trilha="novo"]') + ' && location.hash === "#/dia/4"'), '"Reavivar hoje" abre a lição do dia 4');
await dormir(400);
await conferir('marcar a passagem de baixo como lida não leva a lição ao topo', '.licao-dia [data-trilha="novo"]',
  { palco: '.licao-dia > .licao-palco', pronto: '.licao-dia [data-trilha="novo"][aria-pressed="true"]' });
await conferir('desmarcar também não', '.licao-dia [data-trilha="novo"]',
  { palco: '.licao-dia > .licao-palco', pronto: '.licao-dia [data-trilha="novo"][aria-pressed="false"]' });
await conferir('marcar a de cima, com a lição rolada, não leva ao topo', '.licao-dia [data-trilha="antigo"]',
  { palco: '.licao-dia > .licao-palco', pronto: '.licao-dia [data-trilha="antigo"][aria-pressed="true"]', minimo: 40 });
// Terminar a leitura no leitor marca a passagem por baixo: fechado o leitor, a lição está
// onde a pessoa deixou.
if (await av(existe('.licao-dia [data-ler="novo"]'))) {
  const antesLeitor = await descerAte('.licao-dia [data-ler="novo"]', '.licao-dia > .licao-palco');
  await clicar('.licao-dia [data-ler="novo"]');
  ok(await esperar(existe('.leitor [data-terminei]')), 'o leitor abre a passagem de baixo');
  await dormir(400);
  await clicar('.leitor [data-terminei]');
  await esperar('!' + existe('.leitor:not(.saindo)'));
  await esperar(existe('.licao-dia [data-trilha="novo"][aria-pressed="true"]'));
  await dormir(600);
  const depoisLeitor = await rolagem('.licao-dia > .licao-palco');
  ok(antesLeitor > 40 && perto(antesLeitor, depoisLeitor), '"Terminei a leitura" no leitor marca a passagem sem levar a lição ao topo (rolagem ' + Math.round(antesLeitor) + ' → ' + Math.round(depoisLeitor) + ')');
} else console.log('  --    sem tradução no app, a lição não tem o leitor');
// A sincronização com o servidor também redesenha (02-estado.js): a lição continua onde estava.
const antesSync = await av('(() => { const p = ' + q('.licao-dia > .licao-palco') + '; p.scrollTop = p.scrollHeight; return p.scrollTop; })()');
await av('CC.redesenhar(), true');
await dormir(300);
ok(antesSync > 40 && perto(antesSync, await rolagem('.licao-dia > .licao-palco')), 'um redesenho da mesma rota (a sincronização) não mexe na lição');

console.log('\n  A lição pelo caminho normal (a Trilha)\n');
await av('location.hash = "#/"');
await esperar('!' + existe('.licao:not(.saindo)'));
await dormir(500);
await av('location.hash = "#/dia/5"');
ok(await esperar(existe('.licao-dia [data-trilha="novo"]') + ' && location.hash === "#/dia/5"'), 'a lição do dia 5 abre');
ok(await av('(' + q('.licao-dia > .licao-palco') + '.scrollTop) === 0'), 'uma lição nova abre no topo');
await conferir('marcar a passagem de baixo como lida não leva ao topo', '.licao-dia [data-trilha="novo"]',
  { palco: '.licao-dia > .licao-palco', pronto: '.licao-dia [data-trilha="novo"][aria-pressed="true"]' });
await conferir('marcar a de cima e acender o "Concluir o dia" também não', '.licao-dia [data-trilha="antigo"]',
  { palco: '.licao-dia > .licao-palco', pronto: existe('.licao-dia [data-concluir]:not([disabled])'), minimo: 40 });
await clicar('.licao-dia [data-concluir]');
ok(await esperar(existe('.licao-dia.tela-festa')), '"Concluir o dia" passa à reflexão');
ok(await av(q('.licao-dia > .licao-palco') + '.scrollTop === 0'), 'a reflexão (outra tela da lição) começa no topo');


console.log('\n  O dia do Conhecer Jesus\n');
await av('location.hash = "#/conhecer/1"');
ok(await esperar(existe('.tela-conhecer .licao-palco')), 'o dia 1 do Conhecer Jesus abre');
await dormir(500);
const palcoCj = '.tela-conhecer > .licao-palco';
const cjAntes = await av('(() => { const p = ' + q(palcoCj) + '; p.scrollTop = p.scrollHeight; return p.scrollTop; })()');
await av('CC.redesenhar(), true');
await dormir(400);
const cjDepois = await rolagem(palcoCj);
ok(await av(existe('.tela-conhecer:not(.saindo)')), 'um redesenho (a sincronização) não fecha o dia do Conhecer Jesus');
ok(cjAntes > 40 && perto(cjAntes, cjDepois), 'nem leva o dia ao topo (rolagem ' + Math.round(cjAntes) + ' → ' + Math.round(cjDepois) + ')');
await av('location.hash = "#/praticar"');
await esperar(existe('[data-unidade]'));
await clicar('[data-unidade]');
ok(await esperar(existe('.quiz')), 'a prática começa');
await av('CC.redesenhar(), true');
await dormir(400);
ok(await av(existe('.quiz:not(.saindo)')), 'um redesenho não fecha a prática no meio');
await av('location.hash = "#/"');
await esperar('!' + existe('.licao:not(.saindo)'));

// ---------- a varredura: o que marca, alterna ou salva numa tela que rola ----------
const ir = async (hash, pronto, ms = 10000) => {
  await av('document.querySelectorAll(".cortina").forEach((c) => c.remove()); location.hash = ' + JSON.stringify(hash) + '; true');
  const foi = await esperar(pronto, ms);
  await dormir(500);
  return foi;
};
// Um fluxo com folha no meio: desce até o gatilho, toca, faz o resto e mede a página.
async function conferirFluxo(nome, sel, resto, { espera = 900, minimo = 80, fundo = false } = {}) {
  const antes = fundo ? await irAoFundo() : await descerAte(sel);
  if (antes === null) { ok(false, nome + ': não achei ' + sel); return; }
  if (!(antes >= minimo)) { ok(false, nome + ': a tela não rolou o bastante para medir (' + antes + ')'); return; }
  await clicar(sel);
  await resto();
  await dormir(espera);
  const depois = await rolagem();
  ok(perto(antes, depois), nome + ' (rolagem ' + Math.round(antes) + ' → ' + Math.round(depois) + ')');
}

console.log('\n  Trilha\n');
await ir('#/', existe('.trilha [data-abrir]'));
await conferir('abrir uma unidade fechada na Trilha', '.trilha [data-abrir][aria-expanded="false"]', { espera: 600 });
await conferir('e fechar de novo', '.trilha [data-abrir][aria-expanded="true"]:not([data-abrir="1"])', { espera: 600, minimo: 40 });

console.log('\n  Primeiros passos e Explorar\n');
const licao = await av('CC.D.licoes[0]');
await ir('#/nota/' + encodeURIComponent(licao), existe('#fim-da-licao'));
await descerAte('#fim-da-licao');
await esperar(existe('[data-concluir]:not([hidden])'));
await conferir('"Concluí esta lição" no fim do texto', '[data-concluir]', { pronto: existe('#fim-da-licao .conquista-linha') });
await ir('#/explorar', existe('.cartao-mapas [data-abrir-mapas]'));
if (await av(existe('[data-comece]:not([open])'))) {
  // Abrir e fechar o cartão é do próprio <details>, sem redesenho; o que conta é ele sobreviver a um.
  await clicar('[data-comece] > summary');
  await dormir(300);
  const comeceAntes = await irAoFundo();
  await av('CC.redesenhar(), true');
  await dormir(600);
  ok(await av(existe('[data-comece][open]')) && perto(comeceAntes, await rolagem()),
    'um redesenho deixa o "Comece por aqui" aberto e a página no lugar (' + Math.round(comeceAntes) + ' → ' + Math.round(await rolagem()) + ')');
  await clicar('[data-comece] > summary');
  await dormir(300);
}
await conferir('abrir o cartão dos mapas no Explorar', '.cartao-mapas [data-abrir-mapas]', { espera: 400 });
await conferir('trocar de testamento no cartão dos mapas', '.cartao-mapas [data-testamento][aria-pressed="false"]', { espera: 400 });
// Fechar pelo "Fechar" lá embaixo encolhe o cartão: a página sobe de propósito, para o fim do
// cartão ficar parado na tela (06b-mapas.js, manterNoLugar). Aqui conta onde o cartão fica.
await descerAte('.cartao-mapas [data-fechar-mapas]');
const fimDoCartao = () => av(q('.cartao-mapas') + '.getBoundingClientRect().bottom');
const cartaoAntes = await fimDoCartao();
await clicar('.cartao-mapas [data-fechar-mapas]');
await dormir(400);
const cartaoDepois = await fimDoCartao();
ok(perto(cartaoAntes, cartaoDepois), 'fechar pelo "Fechar" do cartão deixa o fim do cartão parado (' + Math.round(cartaoAntes) + ' → ' + Math.round(cartaoDepois) + ')');

console.log('\n  Minhas anotações\n');
await av(`(() => {
  CC.gravarNota(null, { versos: ['Filipenses 4.6'], tipo: 'oracao', texto: 'Pela prova de quinta' });
  for (let i = 1; i <= 10; i++) CC.gravarNota(null, { versos: ['Salmos ' + (i + 10) + '.1'], tipo: 'nota', texto: 'Nota ' + i + ' para encher a lista.' });
  return true; })()`);
await ir('#/perfil/anotacoes', 'document.querySelectorAll(".cartao-anot").length >= 11');
await conferir('marcar oração como respondida', '[data-responder]', { pronto: '!' + existe('[data-responder]') });
const ultimoCartao = '.cartao-anot:nth-last-child(2) [data-acoes]';
await conferirFluxo('fixar uma nota lá de baixo', ultimoCartao, async () => {
  await esperar(existe('.folha [data-acao="fixar"]'));
  await clicar('.folha [data-acao="fixar"]');
}, { minimo: 40 });
await conferirFluxo('apagar uma nota lá de baixo', ultimoCartao, async () => {
  await esperar(existe('.folha [data-acao="apagar"]'));
  await clicar('.folha [data-acao="apagar"]');
}, { minimo: 40 });

console.log('\n  Desafios\n');
await ir('#/missoes', existe('.folha-desafios'));
await conferir('"Já fiz" num desafio presencial', '[data-missao-presencial]', { minimo: 40 });
await conferirFluxo('começar um desafio longo e vencer o dia (a folha reabre por cima)', '[data-desafio]:last-of-type', async () => {
  await esperar(existe('.folha [data-comecar]'));
  await clicar('.folha [data-comecar]');
  await esperar(existe('.folha [data-vencer]'));
  await clicar('.folha [data-vencer]');
  await esperar('!' + existe('.folha'));
}, { minimo: 40 });

console.log('\n  Célula e Discipulado\n');
await ir('#/novidades/celula/' + ID_CELULA, existe('.painel-celula'), 20000);
await conferir('"Orei" em "Ore hoje por"', '[data-orei]', { minimo: 40 });
if (await av(existe('[data-checkin]'))) {
  await conferirFluxo('check-in de Corpo, Mente e Espírito', '[data-checkin]', async () => {
    await esperar(existe('.folha-checkin'));
    await av('["corpo","mente","espirito"].forEach((k) => document.querySelector(".folha-checkin [data-esfera=\\"" + k + "\\"][data-nivel=\\"2\\"]").click()); true');
    await clicar('.folha-checkin [data-salvar]');
    await esperar('!' + existe('.folha-checkin'));
  }, { espera: 2500, minimo: 40 });
}
await ir('#/novidades/celula/' + ID_CELULA + '/oracao', 'document.querySelectorAll(".painel-celula [data-orei]").length >= 6', 20000);
await av('(() => { const l = document.querySelectorAll(".painel-celula [data-orei]"); l[Math.floor(l.length / 2)].setAttribute("data-alvo-orei", ""); return true; })()');
await conferir('"Orei por você" num pedido do meio da lista', '.painel-celula [data-alvo-orei]', { minimo: 40, espera: 1500,
  pronto: 'document.querySelectorAll(".painel-celula [data-orei]").length < 8 && !' + existe('[data-alvo-orei]') });
if (await ir('#/novidades/celula/' + ID_CELULA + '/painel', existe('.painel-celula [data-registrar-encontro]'), 20000)) {
  await conferirFluxo('registrar o encontro com a presença de cada um (Painel)', '.painel-celula [data-registrar-encontro]', async () => {
    await esperar(existe('.folha .escolha-amigo input'));
    await av('document.querySelectorAll(".folha .escolha-amigo input").forEach((i, n) => { if (n % 2 === 0) i.click(); }); true');
    await clicar('.folha [data-salvar]');
    await esperar('!' + existe('.folha'));
  }, { espera: 2500, minimo: 40, fundo: true });
} else ok(false, 'a aba Painel da célula não abriu');
await ir('#/perfil/discipulado', 'document.querySelectorAll("[data-marco]").length >= 4', 15000);
await conferirFluxo('marcar um passo de Minha caminhada', '[data-marco]', async () => {
  await esperar(existe('.folha [data-salvar]'));
  await clicar('.folha [data-salvar]');
  await esperar('!' + existe('.folha'));
}, { espera: 2500, minimo: 40, fundo: true });

console.log('\n  Parábolas\n');
const slug = await av('[...CC.parabolas.porSlug.keys()][0]');
await ir('#/parabola/' + slug, existe('[data-fim-parabola]'), 15000);
await conferirFluxo('chegar ao fim da parábola (marca como lida)', '[data-fim-parabola]', async () => {
  await esperar('!!(CC.estado().parabolasLidas || {})[' + JSON.stringify(slug) + ']');
}, { espera: 1500 });

console.log('\n  Configurações\n');
await ir('#/config', existe('[data-tema]'));
await conferir('trocar o tema', '[data-tema]:not([aria-pressed="true"])', { minimo: 40, fundo: true });
await conferir('"Mostrar meus marcos no Juntos"', '[data-mural]', { minimo: 40, espera: 2000 });
await ir('#/config/textos', existe('[data-traducao]'));
await conferir('trocar a tradução', '[data-traducao]:not([aria-pressed="true"])', { minimo: 40, fundo: true });

console.log('\n  Um redesenho da mesma rota (a sincronização, a volta do segundo plano) não mexe na página\n');
for (const [rota, pronto] of [
  ['#/', existe('.trilha')],
  ['#/explorar', existe('.cartao-mapas')],
  ['#/missoes', existe('.folha-desafios')],
  ['#/perfil', existe('a[href="#/perfil/anotacoes"]')],
  ['#/perfil/anotacoes', existe('.cartao-anot')],
  ['#/perfil/discipulado', existe('[data-marco]')],
  ['#/novidades', existe('#conteudo h1')],
  ['#/novidades/celula/' + ID_CELULA, existe('.painel-celula .linha-amigo, .painel-celula .recado-lider, .painel-celula')],
  ['#/novidades/celula/' + ID_CELULA + '/pessoas', existe('[data-remover]')],
  ['#/novidades/propositos', existe('.folha-juntos')],
  ['#/parabolas', existe('[data-lista-parabolas] a')],
  ['#/config', existe('[data-tema]')],
  ['#/config/notificacoes', existe('.folha-perfil h1')],
  ['#/biblia', existe('.grade-livros')],
]) {
  if (!await ir(rota, pronto, 15000)) { ok(false, rota + ': a tela não abriu'); continue; }
  await dormir(600);
  const antes = await irAoFundo();
  if (antes < 40) { console.log('  --    ' + rota + ': não rola a 390x844 (' + Math.round(antes) + ')'); continue; }
  await av('CC.redesenhar(), true');
  await dormir(1500);
  const depois = await rolagem();
  ok(perto(antes, depois), 'CC.redesenhar() em ' + rota + ' (rolagem ' + Math.round(antes) + ' → ' + Math.round(depois) + ')');
}

console.log('\n  Navegar para outra tela vai ao topo\n');
await ir('#/perfil', existe('a[href="#/perfil/anotacoes"]'));
await descerAte('a[href="#/perfil/anotacoes"]');
await clicar('a[href="#/perfil/anotacoes"]');
await esperar('location.hash === "#/perfil/anotacoes"');
await dormir(500);
ok((await rolagem()) < 4, 'do Perfil rolado para Minhas anotações, a tela nova abre no topo (' + Math.round(await rolagem()) + ')');
await ir('#/nota/' + encodeURIComponent(await av('CC.D.notas && Object.keys(CC.D.notas).find((id) => /Graça$/.test(id))')), existe('.comece-proximo a.botao'));
await descerAte('.comece-proximo a.botao');
const proxima = await av(q('.comece-proximo a.botao') + '.getAttribute("href")');
await clicar('.comece-proximo a.botao');
await esperar('location.hash === ' + JSON.stringify(proxima));
await dormir(500);
ok((await rolagem()) < 4, 'o "Próximo" no fim de uma nota do Comece por aqui abre a nota seguinte no topo (' + Math.round(await rolagem()) + ')');
await ir('#/config', existe('[data-ir="#/config/notificacoes"]'));
await irAoFundo();
await clicar('[data-ir="#/config/notificacoes"]');
await esperar('location.hash === "#/config/notificacoes"');
await dormir(500);
ok((await rolagem()) < 4, 'das Configurações roladas para Notificações, no topo (' + Math.round(await rolagem()) + ')');

console.log('\n  O que abre por cima devolve a tela de baixo como estava\n');
await ir('#/biblia/' + encodeURIComponent('Salmos'), existe('.grade-capitulos a'), 15000);
const capSel = await av(`(() => {
  const l = [...document.querySelectorAll('.grade-capitulos a')];
  const el = l[100] || l[l.length - 1]; if (!el) return null;
  el.setAttribute('data-alvo-teste', ''); return '[data-alvo-teste]'; })()`);
if (capSel) {
  const gradeAntes = await descerAte(capSel);
  await clicar(capSel);
  await esperar(existe('.leitor-biblia:not(.saindo)'), 15000);
  await dormir(600);
  await clicar('.leitor-biblia [data-fechar-biblia]');
  await esperar('!' + existe('.leitor-biblia:not(.saindo)'));
  await dormir(600);
  const gradeDepois = await rolagem();
  ok(gradeAntes > 80 && perto(gradeAntes, gradeDepois), 'fechar o capítulo devolve a grade de Salmos na mesma altura (' + Math.round(gradeAntes) + ' → ' + Math.round(gradeDepois) + ')');
} else ok(false, 'não achei os capítulos de Salmos');
await ir('#/', existe('.trilha'));
await av('location.hash = "#/dia/5"');
await esperar(existe('.licao-dia'));
await dormir(400);
const trilhaAntes = await rolagem();
await clicar('.licao-dia [data-fechar]');
await esperar('location.hash === "#/" && !' + existe('.licao:not(.saindo)'));
await dormir(900);
ok(Math.abs((await rolagem()) - trilhaAntes) < 400, 'fechar a lição volta à Trilha perto do nó de hoje (' + Math.round(trilhaAntes) + ' → ' + Math.round(await rolagem()) + ')');

ok(excecoes.length === 0, 'nenhuma exceção de JavaScript' + (excecoes[0] ? ': ' + excecoes[0].slice(0, 200) : ''));
if (erroServidor) console.log('\n  erro do servidor:\n' + erroServidor.slice(0, 600));
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  A rolagem fica no lugar\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
