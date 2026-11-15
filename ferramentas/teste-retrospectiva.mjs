// A retrospectiva de dezembro (R3.4, docs/fases/r3-temporadas.md) num Chrome sem interface, a
// 390x844, nos temas claro e escuro. O servidor conta como se hoje fosse 15 de dezembro de 2026
// (CAMINHO_DESLOCAR_CALENDARIO, só com CAMINHO_TESTE=1).
// - a célula Videira (o líder e 3 membros) recebe o ano da célula só com números somados (65 dias
//   do plano, 6 temporadas), sem nome de ninguém;
// - a Ana abre "Seu ano na Palavra": os números dela (40 dias do plano, Gênesis, Êxodo e Mateus terminados,
//   4 temporadas), contados no aparelho, e não os dos outros; a imagem para story sai do aparelho;
// - a mesma tela traz "O ano da célula", com os números somados e a imagem para story;
// - a célula de 2 pessoas não mostra números, só o aviso;
// - o Juntos tem a entrada do ano da célula; a Trilha, em dezembro, a entrada "Seu ano na Palavra".
// Uso: node ferramentas/teste-retrospectiva.mjs   (PORTA=<n>; CHROME=<caminho>; CAPTURAS=<pasta>)
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

// quantos dias faltam (ou sobram) de hoje até 15/12/2026, no fuso desta máquina (o mesmo das contas)
const DESLOCAR = Math.round((Date.parse('2026-12-15T12:00:00Z') - Date.parse(atras(0) + 'T12:00:00Z')) / 864e5);
const pasta = mkdtempSync(join(tmpdir(), 'cc-retrospectiva-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  // o calendário e a retrospectiva contam como se hoje fosse 15 de dezembro de 2026 (só com CAMINHO_TESTE=1):
  // o servidor desloca o "hoje" e as datas de leitura pelos mesmos dias
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_DESLOCAR_CALENDARIO: String(DESLOCAR) }, stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const perfil = mkdtempSync(join(tmpdir(), 'cc-retrospectiva-nav-'));
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

  // a imagem para story, gerada no aparelho, salva como PNG (1080x1920) na pasta das capturas
  const salvarStory = async (expr, nome) => {
    const b64 = await av('(async () => { await CC.story.prepararFontes(); const c = CC.story.tela(); CC.retrospectiva.desenharAno(c.getContext("2d"), ' + expr + '); return c.toDataURL("image/png").split(",")[1]; })()');
    if (!CAPTURAS || !b64) return !!b64;
    mkdirSync(join(CAPTURAS, 'R3.4'), { recursive: true });
    writeFileSync(join(CAPTURAS, 'R3.4', nome + '.png'), Buffer.from(b64, 'base64'));
    return true;
  };

  for (const tema of ['claro', 'escuro']) {
    await temaDe(tema);
    console.log('\n  R3.4 · Retrospectiva de dezembro (15 de dezembro de 2026)\n');
    const t = tema[0];
    // as datas são de dias atrás: o servidor as leva para antes de 15 de dezembro
    const liderC = await conta('lu' + t, 'Lucas', { lidos: ate(20), data: atras(1) });
    const criada = await (await pedir('/api/celula', { acao: 'criar', titulo: 'Célula Videira' }, liderC)).json();
    const { link } = await (await pedir('/api/celula', { acao: 'link', id: criada.proposito.id }, liderC)).json();
    const token = new URL(link).searchParams.get('celula');
    const anaC = await conta('an' + t, 'Ana', { celula: token, lidos: ate(40), data: atras(5) });
    await conta('bru' + t, 'Bruno', { celula: token, lidos: ate(5), data: atras(6) });
    await conta('car' + t, 'Carla', { celula: token });
    const daAna = ((await (await pedir('/api/propositos', null, anaC)).json()).propositos || []).find((p) => p.id === criada.proposito.id);
    const ano = daAna && daAna.anoDaCelula;
    ok(ano && ano.ano === 2026 && ano.pessoas === 4 && ano.diasLidos === 65 && ano.temporadas === 6 && ano.encontros === 0,
      'o servidor manda à Ana o ano da célula, somado: 20 + 40 + 5 + 0 = 65 dias do plano, 2 + 4 = 6 temporadas (' + JSON.stringify(ano) + ')');
    ok(ano && !/"usuario"|@|Ana|Bruno|Carla|Lucas/.test(JSON.stringify(ano)), 'o ano da célula não leva nome nem @ de ninguém');
    // a célula de 2 pessoas
    const dudaC = await conta('du' + t, 'Duda', { lidos: ate(10), data: atras(2) });
    const nova = await (await pedir('/api/celula', { acao: 'criar', titulo: 'Célula Nova' }, dudaC)).json();
    const link2 = (await (await pedir('/api/celula', { acao: 'link', id: nova.proposito.id }, dudaC)).json()).link;
    const eliC = await conta('el' + t, 'Eli', { celula: new URL(link2).searchParams.get('celula'), lidos: ate(8), data: atras(2) });
    const doEli = ((await (await pedir('/api/propositos', null, eliC)).json()).propositos || []).find((p) => p.id === nova.proposito.id);
    ok(doEli && doEli.anoDaCelula && doEli.anoDaCelula.poucos && doEli.anoDaCelula.diasLidos === undefined, 'com 2 pessoas, a célula não recebe números (' + JSON.stringify(doEli && doEli.anoDaCelula) + ')');

    // ---------- a Ana: o ano dela e o da célula ----------
    await entrar(anaC);
    ok(await noInicio(), 'a Ana abre o app');
    await av('location.hash = "#/novidades"; 1');
    ok(await esperar(q('[data-entrada-ano-celula]'), 12000), 'o Juntos tem a entrada "O ano da célula"');
    ok(/O ano da célula em 2026/.test(await texto('[data-entrada-ano-celula]')), 'a entrada diz o ano');
    await av('document.querySelector("[data-calendario]").scrollIntoView({ block: "start" }); scrollBy(0, -90); 1');
    await capturar('r3.4-juntos-entrada-' + tema);
    await av(q('[data-entrada-ano-celula]') + '.click(); 1');
    ok(await esperar(q('[data-meu-ano]'), 12000), 'a entrada abre a retrospectiva');
    const meu = (await texto('[data-meu-ano]')).replace(/ /g, ' ');
    ok(/40dias do plano lidos/.test(meu) && /1dia com a Palavra/.test(meu) && /3livros terminados/.test(meu) && /4temporadas concluídas/.test(meu) && /Livros terminados: Gênesis, Êxodo, Mateus\./.test(meu) && semExagero(meu),
      'o ano da Ana: só os números dela (40 dias do plano, 1 dia com a Palavra, 4 temporadas; Gênesis, Êxodo e Mateus, na ordem da Bíblia) (' + meu.slice(0, 200) + ')');
    ok(/Só você vê esta parte/.test(await texto('.folha-perfil')), 'a tela diz que só a pessoa vê o ano dela');
    const cel = (await texto('[data-ano-celula]')).replace(/ /g, ' ');
    ok(/O ano da célula/.test(cel) && /Célula Videira/.test(cel) && /65dias do plano lidos, somando todos/.test(cel) && /6temporadas concluídas/.test(cel) && /4 pessoas contam hoje/.test(cel)
      && !/Bruno|Carla|Lucas/.test(cel) && !/encontro/.test(cel) && !/metas do calendário/.test(cel) && semExagero(cel),
    'o ano da célula: os números somados, sem nomes, sem zeros (' + cel + ')');
    ok(await av('document.documentElement.scrollWidth <= 390'), 'nada passa da largura da tela');
    await capturar('r3.4-retrospectiva-' + tema, true);
    await av('document.querySelector("[data-ano-celula]").scrollIntoView({ block: "start" }); scrollBy(0, -90); 1');
    await capturar('r3.4-retrospectiva-celula-' + tema);
    // as imagens para story: geradas no aparelho
    ok(await salvarStory('{ titulo: "Meu ano na Palavra", ano: 2026, linhas: CC.retrospectiva.linhasMinhas(CC.retrospectiva.meuAno(2026)) }', 'r3.4-story-meu-ano'), 'a imagem "Meu ano na Palavra" sai do aparelho');
    ok(await salvarStory('{ titulo: "O ano da célula", sub: "Célula Videira", ano: 2026, linhas: CC.retrospectiva.linhasDaCelula(' + JSON.stringify(ano) + ') }', 'r3.4-story-ano-da-celula'), 'a imagem "O ano da célula" também');
    await av('window.__aviso = ""; const a = CC.avisar; CC.avisar = (t) => { window.__aviso = t; a(t); }; 1');
    await av(q('[data-story-meu]') + '.click(); 1');
    ok(await esperar('/Imagem baixada|Toque de novo/.test(window.__aviso)', 10000), 'o botão "Imagem para o story" gera a imagem (' + await av('window.__aviso') + ')');

    // ---------- dezembro na Trilha ----------
    await av('location.hash = "#/"; 1');
    await esperar(q('.folha-topo [data-temporada]'), 10000);
    await av('CC.__hoje = CC.hojeIso; CC.hojeIso = () => "2026-12-15"; CC.redesenhar(); 1');
    ok(await esperar(q('.folha-topo [data-entrada-retrospectiva="2026"]'), 8000), 'em dezembro, a Trilha tem a entrada "Seu ano na Palavra 2026", logo abaixo da temporada');
    ok(/Seu ano na Palavra 2026/.test(await texto('[data-entrada-retrospectiva]')) && /Só você vê\./.test(await texto('[data-entrada-retrospectiva]')), 'a entrada diz que só a pessoa vê');
    await capturar('r3.4-trilha-entrada-' + tema, true);
    await av('CC.hojeIso = CC.__hoje; CC.redesenhar(); 1');
    ok(await esperar('!' + q('[data-entrada-retrospectiva]'), 8000), 'fora de dezembro, a entrada some');

    // ---------- a célula de 2 pessoas ----------
    await entrar(eliC);
    ok(await noInicio(), 'o Eli abre o app');
    await av('location.hash = "#/perfil/retrospectiva"; 1');
    ok(await esperar(q('[data-ano-celula]'), 12000), 'a retrospectiva do Eli abre');
    const pouco = await texto('[data-ano-celula]');
    ok(/aparece quando ela tem 3 pessoas ou mais/.test(pouco) && !/\d+dias/.test(pouco), 'com 2 pessoas, só o aviso, sem números (' + pouco + ')');
    await capturar('r3.4-retrospectiva-poucos-' + tema, true);
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
