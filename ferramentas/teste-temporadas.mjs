// As temporadas do plano (R3, docs/fases/r3-temporadas.md) num Chrome sem interface, a 390x844,
// nos temas claro e escuro.
// R3.1, as temporadas na Trilha:
// - quem leu os dias 1 a 12 vê, logo abaixo do "Ler hoje" e da chama, "Temporada 2 de 36 · Jacó e
//   José", a barra e "faltam 8 dias", sem a frase de abertura (a temporada já começou);
// - quem acabou de fechar a temporada 1 (dias 1 a 10) vê a 2 com a frase de abertura; o cartão abre
//   a folha da temporada (a abertura, os dias, o que se lê, quantos faltam e o selo);
// - quem pulou para a célula no dia 35 vê a temporada 4 com os pendentes contados ("3 pendentes"),
//   a folha explica que a temporada fecha quando todos forem lidos; lidos os dias 35 a 39, o cartão
//   segue para a temporada 5 e o selo 4 não vem;
// - ler o último dia de uma temporada (no papel) mostra no Dia lido "Temporada concluída", a frase
//   de chegada e o selo, que aparece ganho em Conquistas, na estante "Temporadas" (36 selos);
// - quando a temporada fecha um livro, ele vai no mesmo item, sem repetir o nome: o que a chegada já
//   diz some, e o resto vem em "Livro terminado: Judas";
// - ler o último pendente que faltava fecha a temporada do mesmo jeito;
// - quem nunca leu nada vê o dia 0 e nenhum cartão de temporada; lido o dia 0, a temporada 1 aparece
//   com a abertura.
// R3.2, perto de fechar: em Conquistas, no alto, a temporada ("faltam 8 dias para fechar a temporada"),
// os livros começados ("faltam 8 dias para fechar Gênesis", do que falta menos ao que falta mais) e a
// semana ("faltam 4 dias para completar esta semana"), cada um com a barra; um livro terminado sai.
// R3.3, calendário sazonal: com o servidor contando como se fosse 15 de novembro de 2026, a célula
// (o líder e 3 membros) recebe o momento de novembro só com números somados (55 de 120 dias lidos),
// sem nome de ninguém; o Juntos mostra o cartão com as datas, a meta e a barra; sem célula, nada.
// Uso: node ferramentas/teste-temporadas.mjs   (PORTA=<n> troca a porta; CHROME=<caminho>;
// CAPTURAS=<pasta> guarda as capturas, uma subpasta por parte: R3.1...; PARTES=R3.1 escolhe as partes)
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || await portaLivre();
const DEPURACAO = await portaLivre();
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CAPTURAS = process.env.CAPTURAS || '';
// PARTES=R3.1 roda só essas partes (todas, sem a variável)
const PARTES = (process.env.PARTES || '').split(',').filter(Boolean);
const quer = (parte) => !PARTES.length || PARTES.includes(parte);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const atras = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return iso(d); };
const ate = (n) => Array.from({ length: n }, (_, i) => i + 1);

// quantos dias faltam (ou sobram) de hoje até 15/11/2026, no fuso desta máquina (o mesmo das contas)
const DESLOCAR = Math.round((Date.parse('2026-11-15T12:00:00Z') - Date.parse(atras(0) + 'T12:00:00Z')) / 864e5);
const pasta = mkdtempSync(join(tmpdir(), 'cc-temporadas-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  // R3.3: o calendário da célula conta como se hoje fosse 15 de novembro de 2026 (só com CAMINHO_TESTE=1):
  // o servidor desloca o "hoje" e as datas de leitura pelos mesmos dias
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_DESLOCAR_CALENDARIO: String(DESLOCAR) }, stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const perfil = mkdtempSync(join(tmpdir(), 'cc-temporadas-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + DEPURACAO,
  '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });

async function alvo() {
  for (let i = 0; i < 80; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:' + DEPURACAO + '/json/list')).json();
      const p = l.find((x) => x.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch { /* subindo */ }
    await dormir(250);
  }
  throw new Error('sem navegador');
}

const pedir = (rota, corpo, cookie, metodo) => fetch(base + rota, {
  method: metodo || (corpo ? 'POST' : 'GET'),
  headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
// Uma conta (com o fuso do navegador do teste: o "hoje" do servidor é o do fuso da conta) e, se
// vier, o progresso: os dias lidos, todos na data dada.
async function conta(usuario, nome, { celula = '', lidos = [], data = atras(1), datas = null, extra = {} } = {}) {
  const r = await pedir('/api/criar-conta', { usuario, nome, senha: 'senha-' + usuario, email: usuario + '@teste.com', nascimento: '2008-04-05', consentimento: true,
    fuso: Intl.DateTimeFormat().resolvedOptions().timeZone, ...(celula ? { celula } : {}) });
  if (!r.ok) throw new Error('não criou a conta: ' + r.status + ' ' + await r.text());
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  if (lidos.length) {
    const estado = { atualizadoEm: Date.now(), dia: Math.max(...lidos) + 1, lidos, marcadoEm: Object.fromEntries(lidos.map((n, i) => [n, datas ? datas[i] : data])), apelido: nome, ...extra };
    const p = await pedir('/api/estado', estado, cookie, 'PUT');
    if (!p.ok) throw new Error('não gravou o estado: ' + p.status);
  }
  return cookie;
}
const estadoDe = async (cookie) => (await pedir('/api/estado', null, cookie)).json();
try {
  const ws = new WebSocket(await alvo());
  let seq = 0;
  const pend = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
  });
  await new Promise((r) => ws.addEventListener('open', r));
  const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
  const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  const esperar = async (expr, ms = 10000) => { for (let t = 0; t < ms; t += 120) { if (await av(expr)) return true; await dormir(120); } return false; };
  const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
  const texto = (sel) => av('(' + q(sel) + ' || {}).textContent || ""');
  const fecharFolhas = () => av('document.querySelectorAll(".cortina, .tela-cheia").forEach((c) => c.remove()); 1');
  const capturar = async (nome, alto = false) => {
    if (!CAPTURAS) return;
    await dormir(700);
    if (alto) { await av('(CC.rolarPara ? CC.rolarPara(0) : scrollTo(0, 0)), 1'); await dormir(400); }
    const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
    const pastaDaParte = join(CAPTURAS, nome.split('-')[0].toUpperCase());
    mkdirSync(pastaDaParte, { recursive: true });
    writeFileSync(join(pastaDaParte, nome + '.png'), Buffer.from(data, 'base64'));
  };
  if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cmd('Network.enable');
  await cmd('Page.enable');

  const temaDe = async (nome) => {
    console.log('\n  tema ' + nome);
    await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: nome === 'escuro' ? 'dark' : 'light' }] });
  };
  const abrir = async () => {
    await cmd('Page.navigate', { url: 'about:blank' });
    await dormir(300);
    await cmd('Page.navigate', { url: base + '/#/' });
  };
  const entrar = async (cookie) => {
    const [nome, valor] = cookie.split('=');
    // um aparelho sem nada guardado: o progresso vem só do servidor
    await cmd('Page.navigate', { url: base + '/entrar.html' });
    await dormir(300);
    await av('localStorage.clear(); sessionStorage.clear(); 1');
    await cmd('Network.clearBrowserCookies');
    await cmd('Network.setCookie', { name: nome, value: valor, url: base });
    await cmd('Network.setCookie', { name: 'cc_logado', value: '1', url: base });
    await abrir();
  };
  // A partida abre folhas (o convite das notificações); o que se testa aqui é o Início por baixo.
  const noInicio = async () => {
    const pronto = await esperar(q('.folha-topo') + ' && CC.quem', 20000);
    await dormir(2500);
    await fecharFolhas();
    await dormir(300);
    await fecharFolhas();
    return pronto;
  };
  // Lê o dia N no papel e espera o Dia lido dele.
  const lerNoPapel = async (n) => {
    await av('location.hash = "#/"; 1');
    await esperar('!document.querySelector(".licao:not(.saindo)")', 4000);
    await av('CC.lerHoje(' + n + '); 1');
    await esperar(q('.leitor [data-papel-discreto]'), 10000);
    await av(q('.leitor [data-papel-discreto]') + '.click(); 1');
    await esperar(q('[data-papel-sim]'));
    await av(q('[data-papel-sim]') + '.click(); 1');
    return esperar('[...document.querySelectorAll(".licao:not(.saindo) .dia-lido h1")].some((h) => h.textContent === "Dia ' + n + ' lido") && ' + q('[data-voltar-trilha]'), 10000);
  };
  const voltarAoInicio = async () => {
    await av('location.hash = "#/"; 1');
    await esperar('!document.querySelector(".licao:not(.saindo)")', 6000);
    await fecharFolhas();
  };
  const cartao = '.folha-topo [data-temporada]';
  // o tom pedido pelo dono, em tudo o que a temporada põe na tela
  const semExagero = (t) => !/[—–!]|jornada|mergulh|poderos|incrível|transforma/i.test(t);

  for (const tema of ['claro', 'escuro']) {
    if (!quer('R3.1')) break;
    await temaDe(tema);
    console.log('\n  R3.1 · Temporadas na Trilha\n');
    const t = tema[0];

    // ---------- no meio de uma temporada ----------
    const anaC = await conta('ana' + t, 'Ana', { lidos: ate(12) });
    await entrar(anaC);
    ok(await noInicio(), 'a Ana (dias 1 a 12 lidos) abre o Início');
    ok(await esperar(q(cartao + '[data-temporada="2"]'), 10000), 'o Início mostra a temporada 2, a dela');
    const c2 = await texto(cartao);
    ok(/Temporada 2 de 36/.test(c2) && /Jacó e José/.test(c2) && /faltam 8 dias/.test(c2) && semExagero(c2), 'o cartão traz o número, o nome e "faltam 8 dias" (' + c2 + ')');
    ok(!(await av('!!' + q('[data-abertura-temporada]'))), 'com a temporada já começada, a frase de abertura não aparece');
    ok(await av('document.querySelector(".folha-topo .cartoes-hoje").nextElementSibling === document.querySelector("[data-temporada]")'), 'o cartão vem logo abaixo do "Ler hoje" e da chama');
    ok(await av('(() => { const i = document.querySelector("[data-temporada] .barra-temporada i"); return Math.abs(parseFloat(i.style.width) - 20) < 0.5; })()'), 'a barra está em 2 de 10 (20%)');
    ok(await av('document.documentElement.scrollWidth <= 390'), 'nada passa da largura da tela');
    await capturar('r3.1-inicio-no-meio-' + tema, true);

    // ---------- entrando numa temporada ----------
    const brunoC = await conta('bruno' + t, 'Bruno', { lidos: ate(10) });
    await entrar(brunoC);
    ok(await noInicio(), 'o Bruno (fechou a temporada 1) abre o Início');
    ok(await esperar(q(cartao + '[data-temporada="2"]'), 10000) && /faltam 10 dias/.test(await texto(cartao)), 'o Bruno está na temporada 2, com os 10 dias por ler');
    const ab = await texto('[data-abertura-temporada]');
    ok(ab === 'Nesta temporada você lê o fim de Gênesis, com a história de Jacó e de José, e Mateus 8 a 14.', 'ao entrar, a frase de abertura aparece no cartão (' + ab + ')');
    await capturar('r3.1-inicio-entrando-' + tema, true);
    await av(q(cartao) + '.click(); 1');
    ok(await esperar(q('.cortina [data-folha-temporada="2"]')), 'tocar no cartão abre a folha da temporada');
    const f2 = (await texto('.cortina [data-folha-temporada]')).replace(/ /g, ' ');
    ok(/Temporada 2 de 36 · Unidade 1/.test(f2) && /11 a 20 do plano, 10 dias/.test(f2) && /Gênesis 26 a 50; Êxodo 1/.test(f2)
      && /0 de 10 dias lidos, faltam 10 dias\./.test(f2) && /Selo ao terminar: Copo de prata/.test(f2) && /Depois: temporada 3, A saída do Egito\./.test(f2) && semExagero(f2),
    'a folha traz a abertura, os dias, o que se lê, quantos faltam, o selo e a próxima (' + f2.replace(/\s+/g, ' ').slice(0, 160) + '...)');
    await capturar('r3.1-folha-temporada-' + tema);
    await fecharFolhas();

    // ---------- a chegada: o último dia da temporada ----------
    const caioC = await conta('caio' + t, 'Caio', { lidos: ate(19) });
    await entrar(caioC);
    ok(await noInicio(), 'o Caio (dias 1 a 19) abre o Início');
    ok(await esperar(q(cartao + '[data-temporada="2"]'), 10000) && /falta 1 dia/.test(await texto(cartao)), 'falta 1 dia para fechar a temporada 2 (singular)');
    ok(await lerNoPapel(20), 'o Caio lê o dia 20 no papel e o Dia lido abre');
    ok(await esperar(q('.dia-lido .destaque-dia.temporada'), 6000), 'o Dia lido mostra a temporada concluída');
    const ch = await texto('.dia-lido .destaque-dia.temporada');
    ok(/Temporada concluída: Jacó e José/.test(ch) && /Você terminou Gênesis\. A próxima temporada segue com Moisés e a saída do Egito\./.test(ch) && /Selo em Conquistas: Copo de prata/.test(ch) && semExagero(ch),
      'com a frase de chegada e o selo (' + ch + ')');
    ok(!(await av('!!' + q('.dia-lido .destaque-dia.livro'))) && !/Livro terminado/.test(ch),
      'o livro que a temporada fecha não vem num item à parte: a chegada já diz "Você terminou Gênesis."');
    await av('document.querySelector(".dia-lido .destaque-dia.temporada").scrollIntoView({ block: "center" }); 1');
    await capturar('r3.1-dia-lido-chegada-' + tema);
    await voltarAoInicio();
    ok(await esperar(q(cartao + '[data-temporada="3"]'), 8000) && await av('!!' + q('[data-abertura-temporada]')), 'de volta ao Início, a temporada 3 já aparece, com a abertura');
    // o selo em Conquistas
    await av('location.hash = "#/perfil/conquistas"; 1');
    ok(await esperar('document.querySelector("h1")?.textContent === "Conquistas" && !!document.querySelector(".estante .trofeu")', 8000), 'Conquistas abre');
    const estante = await av('(() => { const e = [...document.querySelectorAll(".etiqueta-estante")].find((x) => /^Temporadas/.test(x.textContent)); const l = e && e.nextElementSibling; return e ? { rot: e.textContent, n: l.querySelectorAll(".trofeu").length, ganhos: [...l.querySelectorAll(".trofeu.ganho b")].map((b) => b.textContent) } : null; })()');
    ok(estante && estante.rot === 'Temporadas 2 de 36' && estante.n === 36 && estante.ganhos.join('|') === 'Luz da criaçãoGênesis 1 a 25|Copo de prataJacó e José',
      'a estante "Temporadas" tem os 36 selos, com os dois do Caio ganhos (' + JSON.stringify(estante) + ')');
    ok(await av('(() => { const t = CC.trofeus(); return document.querySelectorAll(".estante .trofeu").length === t.testamentos.length + t.unidades.length + t.temporadas.length + t.colecoes.length + t.desafios.length + t.albuns.length; })()'),
      'Conquistas tem todos os troféus de CC.trofeus(), os selos das temporadas também');
    await av('[...document.querySelectorAll(".etiqueta-estante")].find((x) => /^Temporadas/.test(x.textContent)).scrollIntoView({ block: "start" }); scrollBy(0, -140); 1');
    await capturar('r3.1-conquistas-selos-' + tema);

    // a temporada 33 fecha Ezequiel (a chegada diz) e Judas (a chegada não diz): um item só
    const gabiC = await conta('gabi' + t, 'Gabi', { lidos: ate(333) });
    await entrar(gabiC);
    ok(await noInicio(), 'a Gabi (dias 1 a 333) abre o Início');
    ok(await lerNoPapel(334), 'a Gabi lê o dia 334 no papel');
    ok(await esperar(q('.dia-lido .destaque-dia.temporada'), 6000), 'o Dia lido mostra a temporada 33 concluída');
    const ch33 = await texto('.dia-lido .destaque-dia.temporada');
    ok(/Você terminou Ezequiel e a unidade 11\./.test(ch33) && /Livro terminado: Judas/.test(ch33) && !/terminado: .*Ezequiel/.test(ch33) && !(await av('!!' + q('.dia-lido .destaque-dia.livro'))),
      'Ezequiel e Judas ficam no item da temporada, sem repetir o nome (' + ch33 + ')');
    await av('document.querySelector(".dia-lido .destaque-dia.temporada").scrollIntoView({ block: "center" }); 1');
    await capturar('r3.1-dia-lido-livro-junto-' + tema);
    await voltarAoInicio();

    // ---------- ficar em dia: pular não fecha temporada ----------
    const daniC = await conta('dani' + t, 'Dani', { lidos: ate(30), extra: { dia: 35, pulouPara: 35 } });
    await entrar(daniC);
    ok(await noInicio(), 'a Dani (leu até o 30 e pulou para o 35, com a célula) abre o Início');
    ok(await esperar(q(cartao + '[data-temporada="4"]'), 10000), 'a Dani está na temporada 4 (dias 32 a 39)');
    const c4 = await texto(cartao);
    ok(/faltam 8 dias · 3 pendentes/.test(c4), 'os dias 32 a 34, pendentes, contam no "faltam" e aparecem como pendentes (' + c4 + ')');
    await capturar('r3.1-inicio-pendentes-' + tema, true);
    await av(q(cartao) + '.click(); 1');
    ok(await esperar(q('.cortina [data-pendentes-temporada="3"]')), 'a folha explica os pendentes');
    ok(/3 desses dias estão pendentes\. A temporada fecha quando todos forem lidos, sem pressa\./.test(await texto('.cortina [data-pendentes-temporada]')), 'sem cobrança: a temporada fecha quando todos forem lidos');
    await capturar('r3.1-folha-pendentes-' + tema);
    await fecharFolhas();
    // os dias 35 a 39 lidos (a temporada fica só com os pendentes): não fecha
    ok(await av('CC.gravar("lidos", [...CC.ler("lidos"), 35, 36, 37, 38, 39]); CC.redesenhar(); !CC.temporadaCompletaEm(4)'), 'lidos os dias 35 a 39, a temporada 4 ainda não fecha (faltam os pendentes)');
    // a Dani segue para o dia 40: o cartão mostra a temporada 5, e a 4 fica à espera dos pendentes, sem selo
    ok(await esperar(q(cartao + '[data-temporada="5"]') + ' && /faltam 7 dias/.test(' + q(cartao) + '.textContent)', 8000) && await av('!CC.trofeus().temporadas[3].ganho'),
      'o cartão segue para a temporada 5 com a Dani, e o selo 4 não vem (' + await texto(cartao) + ')');
    await av('CC.gravar("lidos", [...CC.ler("lidos"), 32, 33]); 1');
    ok(await lerNoPapel(34), 'a Dani lê o último pendente (34) no papel');
    ok(await esperar(q('.dia-lido .destaque-dia.temporada'), 6000) && /Temporada concluída: O tabernáculo/.test(await texto('.dia-lido .destaque-dia.temporada')), 'ler o último pendente fecha a temporada 4, com a chegada');
    await voltarAoInicio();

    // ---------- o dia 0 ----------
    const eloC = await conta('elo' + t, 'Elo');
    await entrar(eloC);
    ok(await noInicio(), 'a Elo (nunca leu nada) abre o Início');
    ok(await esperar(q('.folha-topo [data-dia-zero]'), 10000), 'ela vê o dia 0');
    await dormir(800);
    ok(!(await av('!!' + q(cartao))), 'e nenhum cartão de temporada antes da primeira leitura');
    await av('CC.gravar("diaZero", CC.hojeIso()); CC.redesenhar(); 1');
    ok(await esperar(q(cartao + '[data-temporada="1"]'), 8000) && await av('!!' + q('[data-abertura-temporada]')), 'lido o dia 0, a temporada 1 aparece com a abertura');
    await capturar('r3.1-inicio-depois-do-dia-zero-' + tema, true);
  }

  for (const tema of ['claro', 'escuro']) {
    if (!quer('R3.2')) break;
    await temaDe(tema);
    console.log('\n  R3.2 · Perto de fechar, em Conquistas\n');
    const t = tema[0];
    const perto = '[data-perto-de-fechar]';
    // a Iara leu os dias 1 a 12 hoje: temporada 2, Gênesis e Mateus começados, 1 dia nesta semana
    const iaraC = await conta('iara' + t, 'Iara', { lidos: ate(12), data: atras(0) });
    await entrar(iaraC);
    ok(await noInicio(), 'a Iara (dias 1 a 12, lidos hoje) abre o app');
    await av('location.hash = "#/perfil/conquistas"; 1');
    ok(await esperar(q(perto + ' .linha-perto'), 10000), 'Conquistas abre com a seção "Perto de fechar"');
    ok(await av('document.querySelector("' + perto + ' h2").textContent === "Perto de fechar" && document.querySelector("' + perto + '").nextElementSibling.textContent.startsWith("Por nível")'),
      'a seção vem no alto, antes de "Por nível"');
    const tp = await texto(perto + ' [data-perto-temporada="2"]');
    ok(/Temporada 2: Jacó e José/.test(tp) && /2\/10/.test(tp) && /faltam 8 dias para fechar a temporada/.test(tp) && semExagero(tp), 'a temporada, com a barra e "faltam 8 dias para fechar a temporada" (' + tp + ')');
    const livros = await av('[...document.querySelectorAll("' + perto + ' [data-perto-livro]")].map((l) => { const p = CC.progressoDoLivro(l.dataset.pertoLivro); return { l: l.dataset.pertoLivro, faltam: p.total - p.lidos, txt: l.textContent, largura: parseFloat(l.querySelector(".barra-missao i").style.width), esperado: p.lidos / p.total * 100 }; })');
    ok(livros.length >= 1 && livros.length <= 3 && livros.every((x) => x.faltam > 0 && x.txt.includes((x.faltam === 1 ? 'falta 1 dia' : 'faltam ' + x.faltam + ' dias') + ' para fechar ' + x.l) && Math.abs(x.largura - x.esperado) < 0.2)
      && livros.every((x, i) => i === 0 || livros[i - 1].faltam <= x.faltam),
    'os livros começados, do que falta menos ao que falta mais, com "faltam N dias para fechar <livro>" e a barra certa (' + livros.map((x) => x.l + ': ' + x.faltam).join(', ') + ')');
    ok(livros.some((x) => x.l === 'Gênesis' && x.faltam === 8), 'Gênesis: faltam 8 dias para fechar (12 de 20)');
    const sem = await texto(perto + ' [data-perto-semana]');
    // de segunda a quarta ainda dá para completar; de quinta em diante, com 1 dia só, não
    const restam = await av('7 - Math.round((Date.parse(CC.hojeIso()) - Date.parse(CC.segundaDaSemana(CC.hojeIso()))) / 864e5) - 1');
    ok(/Semana completa/.test(sem) && /1\/5/.test(sem) && semExagero(sem) && (1 + restam >= 5 ? /faltam 4 dias para completar esta semana/.test(sem)
      : /1 dia com a Palavra nesta semana\. Na segunda começa uma semana nova\./.test(sem)),
    'a semana: 1 de 5 dias, com "faltam 4 dias para completar esta semana" ou, sem tempo para completar, "Na segunda começa uma semana nova." (' + sem + ')');
    ok(await av('document.documentElement.scrollWidth <= 390'), 'nada passa da largura da tela');
    await capturar('r3.2-perto-de-fechar-' + tema, true);
    // a semana completa (5 dias com a Palavra nesta semana) muda o texto, sem barra a mais
    await av('CC.__dias = CC.diasNaSemana; CC.diasNaSemana = () => 5; CC.redesenhar(); 1');
    ok(await esperar('/Esta semana já está completa\./.test((' + q(perto + ' [data-perto-semana="5"]') + ' || {}).textContent || "")', 8000), 'com 5 dias, "Esta semana já está completa."');
    await av('CC.diasNaSemana = CC.__dias; 1');
    // um livro terminado sai da lista; a temporada fechada também
    await av('CC.gravar("lidos", [...new Set([...CC.ler("lidos"), ...Array.from({ length: 8 }, (_, i) => 13 + i)])]); CC.redesenhar(); 1');
    ok(await esperar('!!' + q(perto + ' [data-perto-temporada="3"]') + ' && !' + q(perto + ' [data-perto-livro="Gênesis"]'), 8000),
      'lidos os dias 13 a 20, Gênesis sai da lista e a temporada é a 3');
    // quem nunca leu nada não vê a seção
    const joaoC = await conta('joao' + t, 'João');
    await entrar(joaoC);
    ok(await noInicio(), 'o João (nunca leu) abre o app');
    await av('location.hash = "#/perfil/conquistas"; 1');
    ok(await esperar('document.querySelector("h1")?.textContent === "Conquistas"', 8000), 'Conquistas abre');
    await dormir(1500);
    ok(await av('!document.querySelector("' + perto + ' .linha-perto") && !document.querySelector("' + perto + ' h2")'), 'sem leitura nenhuma, a seção não aparece');
  }

  for (const tema of ['claro', 'escuro']) {
    if (!quer('R3.3')) break;
    await temaDe(tema);
    console.log('\n  R3.3 · Calendário sazonal no Juntos (15 de novembro de 2026)\n');
    const t = tema[0];
    // o líder e três membros: cada um com os dias do plano lidos em datas de novembro ou de outubro
    // (as datas são de dias atrás, contados de hoje: o servidor as leva para antes de 15 de novembro)
    const liderC = await conta('lu' + t, 'Lucas', { lidos: ate(20), data: atras(1) });
    const criada = await (await pedir('/api/celula', { acao: 'criar', titulo: 'Célula Videira' }, liderC)).json();
    const id = criada.proposito.id;
    const { link } = await (await pedir('/api/celula', { acao: 'link', id }, liderC)).json();
    const token = new URL(link).searchParams.get('celula');
    const anaC = await conta('an' + t, 'Ana', { celula: token, lidos: ate(40), data: atras(5) });
    await conta('bru' + t, 'Bruno', { celula: token, lidos: ate(5), data: atras(6) });
    await conta('car' + t, 'Carla', { celula: token });
    const daAna = ((await (await pedir('/api/propositos', null, anaC)).json()).propositos || []).find((p) => p.id === id);
    const cal = daAna && daAna.calendario;
    ok(cal && cal.id === 'novembro' && cal.fase === 'durante' && cal.pessoas === 4 && cal.meta === 120 && cal.total === 55 && cal.diaDaJanela === 15,
      'o servidor manda à Ana o momento de novembro, somado: 30 (de 40) + 5 + 0 (Carla não leu) + 20 = 55 de 120 (' + JSON.stringify(cal) + ')');
    ok(cal && !/"usuario"|@|Ana|Bruno|Carla|Lucas|"(an|bru|car|lu)[ce]"/.test(JSON.stringify(cal)), 'o momento não leva nome nem @ de ninguém');
    await entrar(anaC);
    ok(await noInicio(), 'a Ana abre o app');
    await av('location.hash = "#/novidades"; 1');
    ok(await esperar(q('[data-calendario] [data-calendario-momento="novembro"]'), 12000), 'o Juntos mostra o calendário da célula, no alto');
    const c = (await texto('[data-calendario-momento="novembro"]')).replace(/\u00a0/g, ' ');
    ok(/1º a 30 de novembro · dia 15 de 30 · Célula Videira/.test(c) && /30 dias/.test(c) && /Em novembro, cada um lê o próprio plano\. A meta da célula é de 30 dias lidos por pessoa\./.test(c)
      && /55 de 120 dias lidos/.test(c) && /Dias pendentes lidos nestas datas também contam\./.test(c) && !/Cada um segue/.test(c) && semExagero(c),
    'o cartão traz as datas, o nome, a meta e a barra somada (' + c + ')');
    ok(await av('(() => { const i = document.querySelector("[data-calendario-momento] .barra-temporada i"); return Math.abs(parseFloat(i.style.width) - 55 / 120 * 100) < 0.2; })()'), 'a barra está em 55 de 120');
    ok(await av('!document.querySelector("[data-calendario-momento] .retrato-amigo, [data-calendario-momento] [data-amigo]") && !/Bruno|Carla|Lucas/.test(document.querySelector("[data-calendario]").textContent)'),
      'sem lista de quem leu, sem ranking: nenhum nome no cartão');
    ok(await av('document.documentElement.scrollWidth <= 390'), 'nada passa da largura da tela');
    await av('document.querySelector("[data-calendario]").scrollIntoView({ block: "start" }); scrollBy(0, -90); 1');
    await capturar('r3.3-juntos-calendario-' + tema);
    // os outros momentos, na mesma tela (os textos vêm de desafios-grupo.mjs, os números são de exemplo)
    const { MOMENTOS, janelaDoMomento } = await import('../desafios-grupo.mjs');
    const exemplo = (id, ano, extra) => { const m = MOMENTOS.find((x) => x.id === id); return { id, titulo: m.titulo, tipo: m.tipo, texto: m.texto, selo: m.selo, ...janelaDoMomento(id, ano), pessoas: 8, ...extra }; };
    const casos = [
      ['janeiro', exemplo('janeiro', 2027, { fase: 'durante', diaDaJanela: 20, diasDaJanela: 31, total: 80, meta: 80, chegou: true }), /1º a 31 de janeiro · dia 20 de 31/, /80 de 80 dias lidos/, /A célula chegou à meta\. Selo da célula: Pegada\./],
      ['fevereiro', exemplo('fevereiro', 2027, { fase: 'durante', diaDaJanela: 10, diasDaJanela: 28, total: 7, meta: 21, chegou: false }), /1º a 28 de fevereiro · dia 10 de 28/, /7 de 21 dias/, /Vale qualquer dia do plano, inclusive um pendente\./],
      ['semana-santa', exemplo('semana-santa', 2027, { fase: 'antes', diaDaJanela: 0, diasDaJanela: 8, total: 0, meta: 8, chegou: false }), /Começa em 21 de março/, /Do Domingo de Ramos à Páscoa/, /^(?![\s\S]*de 8 dias)/],
      ['setembro', exemplo('setembro', 2027, { fase: 'durante', diaDaJanela: 12, diasDaJanela: 30, total: 2, meta: 4, chegou: false }), /1º a 30 de setembro · dia 12 de 30/, /2 de 4 pessoas terminaram uma temporada/, /Vale qualquer temporada/],
      ['novembro', exemplo('novembro', 2026, { fase: 'depois', diaDaJanela: 0, diasDaJanela: 30, total: 180, meta: 240, chegou: false }), /1º a 30 de novembro · terminou/, /O mês terminou com 180 de 240 dias lidos\./, /Dias pendentes/],
    ];
    for (const [id, cal2, ...esperado] of casos) {
      await av('(() => { const c = CC.minhasCelulas()[0]; CC.__celulas = CC.__celulas || CC.minhasCelulas; CC.minhasCelulas = () => [{ ...c, calendario: ' + JSON.stringify(cal2) + ' }];'
        + ' const l = document.querySelector("[data-calendario]"); l.innerHTML = ""; CC.temporadas.calendario(document); return 1; })()');
      const tx = (await texto('[data-calendario-momento="' + id + '"]')).replace(/\u00a0/g, ' ');
      ok(esperado.every((r) => r.test(tx)) && semExagero(tx), 'o momento ' + id + ' (' + tx + ')');
      await av('document.querySelector("[data-calendario]").scrollIntoView({ block: "start" }); scrollBy(0, -90); 1');
      await capturar('r3.3-momento-' + id + '-' + tema);
    }
    await av('CC.minhasCelulas = CC.__celulas; 1');
    // quem não tem célula não vê o calendário
    const soloC = await conta('so' + t, 'Sol', { lidos: ate(5), data: '2026-11-05' });
    await entrar(soloC);
    ok(await noInicio(), 'a Sol (sem célula) abre o app');
    await av('location.hash = "#/novidades"; 1');
    ok(await esperar('document.querySelector("h1")?.textContent === "Juntos"', 8000), 'o Juntos abre');
    await dormir(1500);
    ok(!(await av('!!document.querySelector("[data-calendario-momento]")')), 'sem célula, não há calendário');
  }
} catch (e) {
  falhas++;
  console.log('  FALHA ' + (e && e.stack || e));
} finally {
  fecharArvore(nav, perfil);
  servidor.kill();
  await dormir(300);
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* fica */ }
  try { rmSync(pasta, { recursive: true, force: true }); } catch { /* fica */ }
}
console.log(falhas ? '\n' + falhas + ' falha(s)' : '\ntudo certo');
process.exit(falhas ? 1 : 0);
