// "Fulano já leu hoje" na folha do alto da trilha, num Chrome sem interface: o letreiro que
// troca os nomes dos amigos que já leram (0, 1, 2 e 6 amigos), a altura fixa, a ordem, o texto
// fixo para o leitor de tela, o modo com menos movimento, as pausas (tocar e segurar, linha
// fora da tela, aba oculta), o toque que abre o Juntos, os dois temas a 360px; e o "já leu
// hoje" que não pode sobreviver à meia-noite num app deixado em segundo plano. No fim, o aviso
// flutuante e a roda de amigos do Juntos (detalhes de UI da mesma rodada).
// Uso: CHROME=<chrome> node ferramentas/teste-letreiro.mjs [pasta-das-capturas]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { portaLivre } from './navegador.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { abrir, dormir } = await import(pathToFileURL(join(AQUI, 'design', 'ferramentas', 'analise', 'cdp.mjs')).href);
const PORTA = await portaLivre();
const BASE = 'http://127.0.0.1:' + PORTA + '/';
const FOTOS = process.argv[2] || '';
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const DIA = 24 * 60 * 60 * 1000;

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-letreiro-estado-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json') }, stdio: 'ignore',
});
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE + 'api/versao')).ok) break; } catch { /* subindo */ }
  await dormir(200);
}

// ---------- as contas ----------
const cookies = {};
async function api(quem, rota, corpo, metodo) {
  const r = await fetch(BASE + rota, {
    method: metodo || (corpo ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', cookie: cookies[quem] || '' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const sc = r.headers.get('set-cookie');
  if (sc && sc.startsWith('cc_sessao=')) cookies[quem] = sc.split(';')[0];
  return r.json().catch(() => ({}));
}
const hoje = new Date().toISOString().slice(0, 10);
const leu = (dono) => ({ dono, atualizadoEm: Date.now(), dia: 2, lidos: [1], licoes: [], marcadoEm: { 1: hoje }, licoesEm: {} });
const criar = (usuario, nome) => api(usuario, 'api/criar-conta', {
  nome, nascimento: '2001-04-04', email: usuario + '@exemplo.com', usuario, senha: 'senha-do-teste', fuso: 'UTC', consentimento: true, caminho: 'plano',
});
const LERAM = [['sheyla', 'Sheyla'], ['samara', 'Samara'], ['aime', 'Aime'], ['bruna', 'Bruna'], ['carla', 'Carla'], ['debora', 'Débora']];
for (const [u, n] of LERAM) { await criar(u, n); await api(u, 'api/estado', leu(u), 'PUT'); }
await criar('nao', 'Noemi');
const VISTOS = { v0: ['nao'], v1: ['sheyla', 'nao'], v2: ['sheyla', 'samara'], v6: LERAM.map(([u]) => u) };
for (const [v, lista] of Object.entries(VISTOS)) {
  await criar(v, 'Joana');
  for (const u of lista) {
    await api(v, 'api/amizade', { acao: 'pedir', usuario: u });
    await api(u, 'api/amizade', { acao: 'aceitar', usuario: v });
  }
}

// O relógio da página pode andar no meio do teste (window.__desvio, em ms): é assim que o app
// "deixado aberto" passa da meia-noite.
const RELOGIO = "(() => { globalThis.__desvio = 0; const Real = Date; class D extends Real { constructor(...a) { if (a.length === 0) super(Real.now() + globalThis.__desvio); else super(...a); } static now() { return Real.now() + globalThis.__desvio; } } Object.defineProperty(D, 'name', { value: 'Date' }); globalThis.Date = D; })();"
  + "try{sessionStorage.setItem('cc.abertura','1');localStorage.setItem('cc.aviso.push','nunca')}catch(e){}";

async function abrirComo(quem, { tema = 'claro', menos = false } = {}) {
  const s = await abrir({ base: BASE, largura: 360, altura: 780, pre: RELOGIO + "try{localStorage.setItem('cc.tema'," + JSON.stringify(JSON.stringify(tema === 'escuro')) + ')}catch(e){}' });
  await s.cmd('Emulation.setTimezoneOverride', { timezoneId: 'UTC' });
  if (menos) await s.cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const [n, ...v] = cookies[quem].split('=');
  await s.cmd('Network.setCookie', { name: n, value: v.join('='), url: BASE });
  await s.cmd('Page.navigate', { url: BASE + '#/' });
  for (let i = 0; i < 60; i++) { if (await s.av('!!document.querySelector(".folha-topo") && !!(CC.amigosEmCache && CC.amigosEmCache())')) break; await dormir(200); }
  // a folha de consentimento e os convites de partida, se vierem, saem da frente
  await dormir(900);
  await s.av('document.querySelectorAll(".cortina").forEach((c) => c.remove())');
  return s;
}
const estado = (av) => av(`(() => {
  const el = document.querySelector('[data-quem-leu]');
  if (!el) return null;
  const vis = (x) => x && getComputedStyle(x).display !== 'none';
  const ativo = el.querySelector('.letreiro-item.ativo');
  const r = el.getBoundingClientRect();
  return { href: el.getAttribute('href'), varios: el.classList.contains('varios'), leitor: el.querySelector('.so-leitor').textContent,
    itens: [...el.querySelectorAll('.letreiro-item .letreiro-texto')].map((i) => i.textContent), ativo: ativo ? ativo.querySelector('.letreiro-texto').textContent : '',
    janela: vis(el.querySelector('.letreiro-janela')), parado: vis(el.querySelector('.letreiro-parado')) ? el.querySelector('.letreiro-parado .letreiro-texto').textContent : '',
    ariaHiddenJanela: (el.querySelector('.letreiro-janela') || {}).getAttribute?.('aria-hidden'), live: !!el.querySelector('[aria-live]') || el.hasAttribute('aria-live'),
    cortado: [...el.querySelectorAll('.letreiro-texto')].some((t) => getComputedStyle(t.parentElement).display !== 'none' && t.offsetParent && t.scrollWidth > t.clientWidth + 1),
    altura: r.height, topo: r.top + scrollY, folha: document.querySelector('.folha-topo').getBoundingClientRect().height,
    cartoes: document.querySelector('.cartoes-hoje').getBoundingClientRect().top + scrollY };
})()`);
async function foto(s, nome) {
  if (!FOTOS) return;
  const r = await s.av('(() => { const f = document.querySelector(".folha-topo").getBoundingClientRect(); return { x: 0, y: f.top + scrollY, width: innerWidth, height: f.height }; })()');
  const f = await s.cmd('Page.captureScreenshot', { format: 'png', clip: { ...r, scale: 2 } });
  writeFileSync(join(FOTOS, nome + '.png'), Buffer.from(f.data, 'base64'));
}

console.log('\n  Quem já leu hoje (o letreiro)\n');

// ---------- 0 amigos que leram ----------
let s = await abrirComo('v0');
ok((await estado(s.av)) === null, '0 amigos que leram: a linha não aparece');
await s.fechar();

// ---------- 1 amigo ----------
s = await abrirComo('v1');
let e = await estado(s.av);
ok(e && !e.varios && e.itens.length === 1 && e.ativo === 'Sheyla já leu hoje', '1 amigo: "Sheyla já leu hoje", parado (' + (e && e.ativo) + ')');
ok(e && e.leitor === 'Sheyla já leu hoje. Abrir o Juntos', '1 amigo: o leitor de tela lê "' + (e && e.leitor) + '"');
ok(e && !e.cortado, '1 amigo: o texto cabe inteiro a 360px');
ok(e && e.href === '#/novidades' && e.altura >= 44, '1 amigo: a linha é um link para o Juntos, com 44px para o dedo (' + (e && e.altura) + 'px)');
await dormir(3600);
ok((await estado(s.av)).ativo === 'Sheyla já leu hoje', '1 amigo: depois de 3,6s continua parado');
await foto(s, 'letreiro-1-claro');
await s.fechar();

// ---------- 2 amigos, claro e escuro ----------
for (const tema of ['claro', 'escuro']) {
  s = await abrirComo('v2', { tema });
  const ordem = ((await s.av('CC.amigosEmCache().amigos.filter((a) => a.leuHoje).map((a) => a.nome)')) || []).map((n) => n.split(' ')[0] + ' já leu hoje');
  e = await estado(s.av);
  ok(e && e.varios && JSON.stringify(e.itens) === JSON.stringify(ordem), tema + ', 2 amigos: um item por amigo, na ordem da lista (' + (e && e.itens.join(' / ')) + ')');
  const nomes2 = ordem.map((t) => t.split(' ')[0]);
  ok(e && e.leitor === nomes2.join(' e ') + ' já leram hoje. Abrir o Juntos' && e.ariaHiddenJanela === 'true' && !e.live, tema + ', 2 amigos: texto fixo para o leitor ("' + (e && e.leitor) + '"), sem anúncio a cada troca');
  // acha o instante de uma troca (a cada 40ms), e a partir dele mede a próxima: antes, durante
  // o deslize e depois, com uma captura em cada ponto
  const ativo = () => s.av('(document.querySelector("[data-quem-leu] .letreiro-item.ativo .letreiro-texto") || {}).textContent');
  const primeiro = await ativo();
  let t0 = Date.now();
  while ((await ativo()) === primeiro && Date.now() - t0 < 4000) await dormir(40);
  t0 = Date.now();
  const quadros = [];
  for (const alvo of [2800, 3060, 3180, 3330, 3700, 6150]) {
    await dormir(Math.max(0, alvo - (Date.now() - t0)));
    quadros.push(await estado(s.av));
    await foto(s, 'letreiro-2-' + tema + '-' + String(alvo).padStart(4, '0') + 'ms');
  }
  const a = quadros.map((q) => q.ativo.split(' ')[0]);
  ok(a[0] !== a[4] && a[4] !== a[5] && a[0] === a[5], tema + ', 2 amigos: troca de 3 em 3s e volta ao primeiro (' + a.join(' → ') + ')');
  ok(quadros.every((q) => q.altura === e.altura && q.folha === e.folha && q.cartoes === e.cartoes && q.topo === e.topo), tema + ', 2 amigos: nada muda de tamanho nem de lugar durante a troca');
  await s.fechar();
}

// ---------- 6 amigos ----------
s = await abrirComo('v6');
e = await estado(s.av);
const nomes6 = ((await s.av('CC.amigosEmCache().amigos.filter((a) => a.leuHoje).map((a) => a.nome)')) || []).map((n) => n.split(' ')[0]);
ok(e && e.itens.length === 6 && e.leitor === nomes6.slice(0, 5).join(', ') + ' e ' + nomes6[5] + ' já leram hoje. Abrir o Juntos', '6 amigos: o leitor lê todos, na ordem da lista ("' + (e && e.leitor) + '")');
const vistos = [e.ativo];
for (let i = 0; i < 6; i++) { await dormir(3050); vistos.push((await estado(s.av)).ativo); }
ok(new Set(vistos).size === 6 && vistos[6] === vistos[0], '6 amigos: passa por todos e recomeça (' + vistos.map((v) => v.split(' ')[0]).join(' → ') + ')');
ok(!(await estado(s.av)).cortado, '6 amigos: nenhum nome cortado a 360px');
await foto(s, 'letreiro-6-claro');
// segurar a linha pausa
await s.av('document.querySelector("[data-quem-leu]").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))');
let antes = (await estado(s.av)).ativo;
await dormir(4000);
ok((await estado(s.av)).ativo === antes, '6 amigos: segurando a linha, ela não troca');
await s.av('document.querySelector("[data-quem-leu]").dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))');
await dormir(3300);
ok((await estado(s.av)).ativo !== antes, '6 amigos: ao soltar, volta a trocar');
// fora da tela pausa
await s.av('scrollTo(0, 2500)');
await dormir(400);
antes = (await estado(s.av)).ativo;
await dormir(4000);
ok((await estado(s.av)).ativo === antes, '6 amigos: com a linha fora da tela, não troca');
await s.av('scrollTo(0, 0)');
await dormir(3500);
ok((await estado(s.av)).ativo !== antes, '6 amigos: de volta à tela, troca de novo');
// aba oculta pausa
await s.av('Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange", { bubbles: true }))');
antes = (await estado(s.av)).ativo;
await dormir(4000);
ok((await estado(s.av)).ativo === antes, '6 amigos: com a aba oculta, não troca');
await s.av('delete document.visibilityState');
// tocar abre o Juntos
await s.av('document.querySelector("[data-quem-leu]").click()');
await dormir(800);
ok((await s.av('location.hash')) === '#/novidades', 'tocar na linha abre o Juntos');
await s.fechar();

s = await abrirComo('v6', { tema: 'escuro' });
await foto(s, 'letreiro-6-escuro');
await s.fechar();

// ---------- menos movimento ----------
s = await abrirComo('v6', { menos: true });
e = await estado(s.av);
ok(e && !e.janela && e.parado === nomes6.slice(0, 2).join(', ') + ' e mais 4 já leram hoje', 'menos movimento: parado, "' + (e && e.parado) + '"');
ok(e && !e.cortado, 'menos movimento: o texto cabe inteiro a 360px, sem reticências');
await dormir(3600);
const depois = await estado(s.av);
ok(depois.ativo === e.ativo && depois.parado === e.parado, 'menos movimento: não troca');
await foto(s, 'letreiro-6-menos-movimento');
await s.fechar();

// ---------- meia-noite com o app em segundo plano ----------
s = await abrirComo('v2');
ok(!!(await estado(s.av)), 'meia-noite: antes, a linha aparece');
// o relógio passa da meia-noite, a volta do segundo plano não alcança o servidor
const ateAmanha = new Date(hoje + 'T00:00:00Z').getTime() + DIA + 60 * 1000 - Date.now();
await s.av('globalThis.__desvio = ' + ateAmanha);
await s.cmd('Network.setBlockedURLs', { urls: ['*api/amigos*'] });
await s.av('document.dispatchEvent(new Event("visibilitychange", { bubbles: true }))');
await dormir(1500);
ok((await s.av('CC.hojeIso()')) > hoje, 'meia-noite: o app já está no dia seguinte (' + (await s.av('CC.hojeIso()')) + ')');
ok((await estado(s.av)) === null, 'meia-noite: sem conseguir recarregar, o "já leu hoje" de ontem sai da folha');
ok((await s.av('CC.amigosEmCache().amigos.every((a) => !a.leuHoje)')), 'meia-noite: o cache de ontem não diz que ninguém leu hoje');
await s.fechar();

// ---------- a volta do segundo plano repinta a folha ----------
s = await abrirComo('v1');
ok((await estado(s.av)).itens.length === 1, 'segundo plano: antes, só a Sheyla');
await api('nao', 'api/estado', leu('nao'), 'PUT');
await s.av('document.dispatchEvent(new Event("visibilitychange", { bubbles: true }))');
await dormir(1800);
e = await estado(s.av);
ok(e && e.itens.length === 2 && e.varios && /Noemi/.test(e.leitor), 'segundo plano: a Noemi leu enquanto isso, e a folha mostra (' + (e && e.leitor) + ')');
// nada novo do amigo: só nome, foto e se leu hoje
const campos = await s.av('Object.keys(CC.amigosEmCache().amigos[0]).sort().join(",")');
ok(!/hora|lidoEm|marcadoEm|lidos/.test(campos), 'o amigo continua sem hora de leitura nem lista de leituras (' + campos + ')');
await s.fechar();

// ---------- detalhes de UI da mesma rodada (02/10) ----------
// O aviso flutuante: largura útil, até duas linhas a 360px, raio que serve para duas linhas,
// acima da barra de abas. A roda de amigos do Juntos: o anel de "já leu hoje" inteiro dentro
// da faixa que rola, e o último item inteiro no fim da rolagem.
for (const largura of [360, 390]) {
  s = await abrirComo('v6');
  await s.cmd('Emulation.setDeviceMetricsOverride', { width: largura, height: 780, deviceScaleFactor: 2, mobile: true });
  await s.av('location.hash = "#/mapa/genesis"');
  await dormir(1500);
  const av = await s.av(`(() => { CC.avisar('Seu escudo cobriu ontem. A ofensiva segue em 16!'); const a = document.getElementById('aviso-flutuante');
    const r = a.getBoundingClientRect(); const nav = document.querySelector('.navegacao'); const lh = parseFloat(getComputedStyle(a.querySelector('span')).lineHeight);
    return { l: r.left, w: r.width, linhas: Math.round(a.querySelector('span').getBoundingClientRect().height / lh), raio: getComputedStyle(a).borderTopLeftRadius,
      acima: !nav || r.bottom <= nav.getBoundingClientRect().top + 1 }; })()`);
  ok(av.w > largura * 0.75 && av.linhas <= 2 && av.raio === '20px' && av.acima && Math.abs(av.l - (largura - av.w - av.l)) < 1,
    largura + 'px: aviso do escudo centrado, ' + Math.round(av.w) + 'px de largura, ' + av.linhas + ' linha(s), raio ' + av.raio + ', acima da barra');
  await s.av('location.hash = "#/novidades"');
  await dormir(2000);
  const roda = await s.av(`(() => { const r = document.querySelector('.roda-amigos'); const caixa = r.getBoundingClientRect();
    const aneis = [...r.querySelectorAll('.amigo-roda.leu .retrato-amigo')].map((x) => x.getBoundingClientRect().top - 5);
    r.scrollLeft = r.scrollWidth; const ultimo = r.lastElementChild.getBoundingClientRect();
    return { anel: Math.min(...aneis) >= caixa.top, ultimo: ultimo.right <= caixa.right - 20 }; })()`);
  ok(roda.anel, largura + 'px: o anel de "já leu hoje" cabe inteiro na roda de amigos');
  ok(roda.ultimo, largura + 'px: no fim da rolagem, o último item da roda aparece inteiro, com respiro');
  await s.fechar();
}

servidor.kill();
rmSync(pastaEstado, { recursive: true, force: true });
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  tudo certo\n');
process.exit(falhas ? 1 : 0);
