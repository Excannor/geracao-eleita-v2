// O estudo da célula guarda (À Mesa, Fase 2, docs/a-mesa-fase2.md, seção 9.5), num servidor
// próprio, com contas criadas pela API: o combinado, o estudo ligado a cada encontro (inclusive o
// registro de dias atrás e o do app antigo, sem o campo), quem não veio, a lista e a leitura dos
// estudos anteriores com a permissão de cada papel (líder, auxiliar, membro, visitante, quem
// entrou depois, quem saiu, de fora, o administrador) e a célula filha de uma multiplicação, que
// lê os estudos da mãe até o dia em que nasceu.
//
// Parte A (a API e as permissões) e a parte C pela API (a multiplicação): bloco SERVIDOR. As
// partes B e C no navegador (as telas, a impressão, a anotação), num Chrome sem interface como em
// teste-estudo-celula.mjs: o passo 3 com o combinado, a acolhida lembrada, a lista e a leitura dos
// anteriores para cada papel, a anotação (sem aviso de privacidade), "Usar como base", o modo encontro, o
// registro com o estudo e "Quem não veio", a impressão (A4, sem as barras), a filha e os tamanhos
// (390 e 360 px, claro e escuro). Os textos bíblicos esperados saem de conteudo/biblias.
//
// As datas no passado: os encontros entram sempre pela API (moram na memória do servidor); o dia
// em que cada um entrou na célula e o nascimento das contas voltam 10 dias direto no banco, com o
// servidor parado e religado (a chave da sessão fica na pasta, e os cookies continuam valendo); o
// nascimento de um estudo volta direto em celula_estudos, que o servidor lê do banco a cada vez.
//
// Uso: CHROME=<chrome> node ferramentas/teste-estudo-historico.mjs
//   PORTA=<porta do servidor> (8394), PORTAS=<faixa> para o Chrome, FOTOS=<pasta> guarda as capturas,
//   RAPIDO=1 pula as medidas nos quatro tamanhos e temas.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from '../db.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8394;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// ---------- as datas, no fuso padrão do servidor (as contas não mudam o fuso) ----------
const hojeEm = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const HOJE = hojeEm();
const somaDias = (texto, n) => { const d = new Date(texto + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const DIA_7 = somaDias(HOJE, -7);
const DIA_3 = somaDias(HOJE, -3);
// meio-dia de Brasília de um dia, como instante
const meioDia = (data) => new Date(data + 'T15:00:00.000Z').toISOString();

// ---------- o servidor ----------
const pasta = mkdtempSync(join(tmpdir(), 'cc-estudo-historico-'));
const arquivoDb = join(pasta, 'caminho.db');
let servidor = null;
async function subir() {
  servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
    env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_ADMIN: 'admin' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) { try { await fetch('http://127.0.0.1:' + PORTA + '/api/existe-conta'); return; } catch { await dormir(150); } }
  throw new Error('o servidor não subiu na porta ' + PORTA);
}
async function parar() {
  if (!servidor) return;
  const s = servidor;
  servidor = null;
  if (s.exitCode !== null) return;
  await new Promise((r) => { s.once('exit', r); s.kill(); });
}
let encerrado = false;
async function encerrar() {
  if (encerrado) return;
  encerrado = true;
  try { if (nav) fecharArvore(nav, perfil); } catch { /* ok */ }
  await parar().catch(() => {});
  await dormir(300);
  try { if (perfil) rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
  try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
}
process.on('uncaughtException', async (e) => { console.log('  FALHA ' + (e && e.stack || e)); await encerrar(); process.exit(1); });
process.on('unhandledRejection', async (e) => { console.log('  FALHA ' + (e && e.stack || e)); await encerrar(); process.exit(1); });
// mexer no banco: proposito_membros e contas moram na memória do servidor, e só se mudam com ele
// parado; celula_estudos não, e muda com ele de pé. A espera de 5 s (a mesma do servidor) evita o
// "database is locked" quando ele está gravando no mesmo instante.
const abrirDb = (opcoes) => { const db = opcoes ? new DatabaseSync(arquivoDb, opcoes) : new DatabaseSync(arquivoDb); db.exec('PRAGMA busy_timeout = 5000'); return db; };
const noBanco = (fazer) => { const db = abrirDb(); try { return fazer(db); } finally { db.close(); } };
const lerBanco = (sql, ...x) => { const db = abrirDb({ readOnly: true }); try { return db.prepare(sql).all(...x); } finally { db.close(); } };

// ---------- a API ----------
const base = 'http://127.0.0.1:' + PORTA + '/';
const pedir = async (rota, corpo, cookie) => {
  const r = await fetch(base + rota, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, cookie: (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || '']).map((c) => c.split(';')[0]).find((c) => c.startsWith('cc_sessao=') && c.length > 10) || '', dado: await r.json().catch(() => ({})) };
};
const criar = async (usuario, nome, extra = {}) => (await pedir('api/criar-conta', {
  usuario, senha: 'senha123', nome, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true, ...extra,
})).cookie;
const celulaDe = async (cookie, id) => ((await pedir('api/propositos', null, cookie)).dado.propositos || []).find((p) => p.id === id);
const estudos = (q, cookie) => pedir('api/estudos?' + q, null, cookie);

// O estudo do dono como o líder salva no navegador (teste-estudo-celula.mjs): a sugestão de cartão
// de Lucas 11.24-26, aceita na prévia, vira a linha da referência logo depois do parágrafo. São os
// 6 cartões que a lista resume em "Ef 6, Lc 11, 1Pe 5".
const LINHAS_DONO = readFileSync(join(AQUI, 'ferramentas', 'estudo-exemplo.txt'), 'utf8').replace(/\s+$/, '').split('\n');
LINHAS_DONO.splice(LINHAS_DONO.findIndex((l) => l.startsWith('Em Lucas 11:24')) + 1, 0, 'Lucas 11.24-26');
const DONO = { acao: 'estudo', estudo: 'blocos', fonte: LINHAS_DONO.join('\n'), traducao: 'nbv', perguntas: ['O que mais marcou você?', 'O que muda na sua semana?'] };
const CARTOES = ['Efésios 6.12', 'Lucas 11.24-26', '1 Pedro 5.8', 'Efésios 6.13-17', 'Efésios 6.18', 'Efésios 6.10'];
const PEDIDO = 'Peço oração pela cirurgia da minha avó na sexta';
const TESTEMUNHO = 'Orem pelo Jonas, que está doente.';
const COMBINADO_1 = 'Ligar para alguém que faltou.';
const COMBINADO_2 = 'Orar todo dia por alguém que ainda não conhece Jesus.';

// ---------- o navegador (partes B e C), como em teste-estudo-celula.mjs ----------
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FOTOS = process.env.FOTOS || '';
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const NBV = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'nbv.json'), 'utf8'));
// como CC.textoDoVersiculo (04b-leitor.js): os versículos juntos
const textoDe = (biblia, ref) => {
  const m = /^(.+?) (\d+)\.(\d+)(?:-(\d+))?$/.exec(ref);
  return (biblia.livros[m[1]][Number(m[2]) - 1] || []).slice(Number(m[3]) - 1, Number(m[4] || m[3])).filter(Boolean).join(' ').replace(/^\[[^\]]*\]\s*:?\s*/, '');
};
let nav = null;
let perfil = '';
let ws = null;
let seq = 0;
const pend = new Map();
const evs = [];
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => {
  const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) console.log('  (erro na expressão: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text || '').slice(0, 200) + ')');
  return r.result?.value;
};
const na = (f, ...args) => av('(' + f.toString() + ')(' + args.map((a) => JSON.stringify(a)).join(',') + ')');
const esperar = async (expr, ms = 10000) => {
  for (let t = 0; t < ms; t += 150) {
    if (await av(expr)) return true;
    await dormir(150);
  }
  return false;
};
const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
const existe = (sel) => '!!' + q(sel);
const clicar = (sel) => av('(() => { const el = ' + q(sel) + '; if (!el) return false; el.click(); return true; })()');
// clica no botão (ou link) cujo texto bate com a expressão, dentro de "dentro"
const clicarTexto = (dentro, re) => na((d, fonte) => { const el = [...document.querySelectorAll(d + ' button, ' + d + ' a')].find((b) => new RegExp(fonte).test(b.textContent)); if (!el) return false; el.click(); return true; }, dentro, re);
const comum = (t) => String(t == null ? '' : t).replace(/\u00a0/g, ' ').replace(/\u2060/g, '');
const texto = async (sel) => comum(await av('(' + q(sel) + ' || {}).textContent || ""'));
const larguras = { 390: 844, 360: 740 };
let largura = 390;
const tamanho = async (w, h) => { largura = w; await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h || larguras[w] || 844, deviceScaleFactor: 2, mobile: true }); };
const tema = (escuro) => av('CC.guardarTema(' + (escuro ? 'true' : 'false') + '); true');

async function abrirNavegador() {
  const PORTA_NAV = await portaLivre();
  perfil = mkdtempSync(join(tmpdir(), 'cc-historico-nav-'));
  nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
  let alvo = '';
  for (let i = 0; i < 60 && !alvo; i++) {
    try { const l = await (await fetch('http://127.0.0.1:' + PORTA_NAV + '/json/list')).json(); const pg = l.find((x) => x.type === 'page'); if (pg) alvo = pg.webSocketDebuggerUrl; } catch { /* subindo */ }
    if (!alvo) await dormir(250);
  }
  if (!alvo) throw new Error('sem navegador');
  ws = new WebSocket(alvo);
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); } else if (m.method) evs.push(m);
  });
  await new Promise((r) => ws.addEventListener('open', r));
  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Network.enable');
  await tamanho(390);
  await cmd('Emulation.setTimezoneOverride', { timezoneId: 'America/Sao_Paulo' });
  await cmd('Emulation.setFocusEmulationEnabled', { enabled: true });
  await cmd('Page.bringToFront');
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });
}
// Entra como uma conta (cookie novo; "limpar" apaga também o que o aparelho guardou) e abre a rota.
async function como(cookie, rotaApp, limpar = true) {
  await cmd('Page.navigate', { url: base + 'privacidade.html' });
  await esperar('document.readyState === "complete"');
  if (limpar) await av('localStorage.clear(); sessionStorage.clear(); true');
  await cmd('Network.clearBrowserCookies');
  const [nome, ...resto] = cookie.split('=');
  await cmd('Network.setCookie', { name: nome, value: resto.join('='), url: base });
  await cmd('Page.navigate', { url: base + rotaApp });
  await esperar('!!window.CC && !!CC.quem && !!document.querySelector("#conteudo") && !!document.querySelector(".folha-juntos, .painel-celula, .vazio-amigos")', 15000);
}
const abrir = async (r, pronto) => { await av('location.hash = ' + JSON.stringify(r)); return esperar(pronto, 15000); };
async function foto(nome, inteira) {
  if (!FOTOS) return;
  await dormir(400);
  await av('document.getElementById("aviso-flutuante")?.remove(); true');
  if (inteira) {
    const h = await na(() => {
      const tela = document.querySelector('.tela-cheia');
      if (tela) return Math.ceil(tela.querySelector('.tela-cheia-palco').scrollHeight + tela.querySelector('.tela-cheia-pe').offsetHeight);
      const folha = [...document.querySelectorAll('.cortina .folha')].pop();
      if (folha) { folha.style.maxHeight = 'none'; folha.style.overflow = 'visible'; return Math.ceil(folha.scrollHeight + 96); }
      return Math.ceil(document.documentElement.scrollHeight);
    });
    await tamanho(largura, Math.max(h, larguras[largura]));
    await dormir(500);
  }
  const r = await cmd('Page.captureScreenshot', { format: 'png', fromSurface: true });
  if (r.data) writeFileSync(join(FOTOS, nome + '.png'), Buffer.from(r.data, 'base64'));
  if (inteira) { await tamanho(largura); await dormir(250); }
}
// A folha de impressão como sai no papel, para conferir a olho: a captura de tela não usa a mídia
// "print", então as regras do @media print da peça valem na tela por um instante, na largura de
// uma A4 (794 px a 96 dpi) e com as margens da página (16 e 15 mm).
async function fotoDoPapel(nome) {
  if (!FOTOS) return;
  await cmd('Emulation.setEmulatedMedia', { media: '' });
  await na(() => {
    const css = document.querySelector('style[data-estudo-celula]').textContent;
    const ini = css.indexOf('{', css.indexOf('@media print'));
    let n = 0;
    let fim = ini;
    for (; fim < css.length; fim++) { if (css[fim] === '{') n++; else if (css[fim] === '}' && --n === 0) break; }
    const s = document.createElement('style');
    s.id = 'papel-na-tela';
    s.textContent = css.slice(ini + 1, fim).replace(/@page\s*\{[^}]*\}/, '') + ' body.imprimindo-estudo .mesa-impressao { padding: 60px 57px; }';
    document.head.appendChild(s);
    // a classe sai junto com o bloco, mas a foto do anterior pode vir depois de uma troca de tela
    document.body.classList.add('imprimindo-estudo');
    return true;
  });
  await cmd('Emulation.setDeviceMetricsOverride', { width: 794, height: 1123, deviceScaleFactor: 1, mobile: false });
  await dormir(300);
  const h = await av('Math.ceil(document.querySelector(".mesa-impressao").getBoundingClientRect().height)');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 794, height: Math.max(1123, h), deviceScaleFactor: 1, mobile: false });
  await dormir(400);
  const r = await cmd('Page.captureScreenshot', { format: 'png', fromSurface: true });
  if (r.data) writeFileSync(join(FOTOS, nome + '.png'), Buffer.from(r.data, 'base64'));
  await av('document.getElementById("papel-na-tela")?.remove(); document.body.classList.remove("imprimindo-estudo"); true');
  await tamanho(largura);
}
// a mesma captura a 360 px (as abas de quem conduz, "Quem não veio" e o vazio da filha mudaram nessa largura)
async function foto360(nome) {
  if (!FOTOS) return;
  await tamanho(360);
  // o campo do combinado cresce com o texto: na largura nova, ele mede de novo
  await av('document.querySelectorAll("[data-combinado]").forEach((c) => c.dispatchEvent(new Event("input", { bubbles: true }))); true');
  await dormir(300);
  await foto('360-' + nome, true);
  await tamanho(390);
}
async function diagnostico(nome) {
  const ex = evs.filter((e) => e.method === 'Runtime.exceptionThrown').slice(-3).map((e) => (e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || '').slice(0, 300));
  if (ex.length) console.log('    (exceções: ' + JSON.stringify(ex) + ')');
  const d = await na(() => ({ hash: location.hash, cortinas: document.querySelectorAll('.cortina').length, aviso: (document.getElementById('aviso-flutuante') || {}).textContent || '',
    painel: ((document.querySelector('.painel-celula') || document.querySelector('#conteudo') || {}).textContent || '').slice(0, 300) }));
  console.log('    (diagnóstico ' + nome + ': ' + JSON.stringify(d) + ')');
  if (FOTOS) { const r = await cmd('Page.captureScreenshot', { format: 'png' }); if (r.data) writeFileSync(join(FOTOS, 'diag-' + nome + '.png'), Buffer.from(r.data, 'base64')); }
}
// Sem rolagem lateral, todo botão e link visível com 44 px ou mais na menor medida e nenhuma letra
// abaixo de 12 px (no conteúdo, na folha aberta e na tela cheia).
async function medidas(rotulo) {
  const m = await na(() => {
    const raizes = [...document.querySelectorAll('.tela-cheia, .cortina .folha')];
    if (!raizes.length) raizes.push(document.querySelector('#conteudo'));
    const visivel = (el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 2 && r.height > 2 && st.visibility !== 'hidden' && st.display !== 'none'; };
    const pequenos = [];
    const letras = [];
    for (const raiz of raizes) {
      for (const el of raiz.querySelectorAll('button, a[href], select, textarea, input:not([type="checkbox"]):not([type="radio"]), [role="radio"], .opcao-estudo')) {
        if (!visivel(el) || el.closest('.acoes-verso')) continue;
        const r = el.getBoundingClientRect();
        if (Math.min(r.width, r.height) < 43.5) pequenos.push((el.textContent.trim() || el.getAttribute('aria-label') || el.className).slice(0, 40) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
      const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
      for (let n = andar.nextNode(); n; n = andar.nextNode()) {
        if (!n.nodeValue.trim() || !n.parentElement || !visivel(n.parentElement)) continue;
        const f = parseFloat(getComputedStyle(n.parentElement).fontSize);
        // (o nome escrito no voltar redondo tem letra 0 de propósito: só o leitor de tela o lê)
        if (f > 0 && f < 11.95) letras.push(n.nodeValue.trim().slice(0, 30) + ' ' + f);
      }
    }
    // as abas da célula: o texto e o ponto do estudo cabem dentro de cada pílula (a 360 px, com
    // cinco abas, o ponto do "Estudo" chegou a sair dela)
    const vazam = [...document.querySelectorAll('.abas-celula button')].filter(visivel).filter((b) => {
      const r = b.getBoundingClientRect();
      const ponto = b.querySelector('.ponto-estudo');
      const p = ponto ? ponto.getBoundingClientRect() : null;
      return b.scrollWidth > b.clientWidth + 1 || (p && (p.left < r.left - 0.5 || p.right > r.right + 0.5));
    }).map((b) => b.textContent.trim() + ' ' + b.scrollWidth + '>' + b.clientWidth);
    return { lateral: document.documentElement.scrollWidth - innerWidth, pequenos: [...new Set(pequenos)], letras: [...new Set(letras)], vazam };
  });
  const certo = m.lateral <= 0 && !m.pequenos.length && !m.letras.length && !m.vazam.length;
  ok(certo, rotulo + ': sem rolagem lateral, toque de 44 px, letra de 12 px e nada vazando das abas'
    + (certo ? '' : ' (lateral ' + m.lateral + ', pequenos: ' + m.pequenos.slice(0, 4).join(' | ') + ', letras: ' + m.letras.slice(0, 4).join(' | ') + ', vazam: ' + m.vazam.join(' | ') + ')'));
}
async function emTodosOsTamanhos(rotulo, preparar) {
  if (process.env.RAPIDO) return;
  for (const w of [390, 360]) {
    for (const escuro of [false, true]) {
      await tamanho(w);
      await tema(escuro);
      if (preparar) await preparar();
      await dormir(300);
      await medidas(rotulo + ' a ' + w + ' px, ' + (escuro ? 'escuro' : 'claro'));
    }
  }
  await tamanho(390);
  await tema(false);
}

try {
  await subir();
  // ---------- a célula: Marcos (líder), Paulo (auxiliar), Ana e Bia (membros), Vera (visitante) ----------
  const lider = await criar('lider', 'Marcos');
  const ID = (await pedir('api/celula', { acao: 'criar', titulo: 'Célula Esperança' }, lider)).dado.proposito.id;
  const token = new URL((await pedir('api/celula', { acao: 'link', id: ID }, lider)).dado.link).searchParams.get('celula');
  const aux = await criar('aux', 'Paulo', { celula: token });
  const ana = await criar('ana', 'Ana', { celula: token });
  const bia = await criar('bia', 'Bia', { celula: token });
  const vera = await criar('vera', 'Vera');
  await pedir('api/celula', { acao: 'entrar', token, visitante: true }, vera);
  const outro = await criar('outro', 'Otto');
  const OUTRA = (await pedir('api/celula', { acao: 'criar', titulo: 'Outra' }, outro)).dado.proposito.id;
  const admin = await criar('admin', 'Admin');
  ok((await pedir('api/celula', { acao: 'auxiliar', id: ID, usuario: 'aux', sim: true }, lider)).status === 200, 'o Paulo é auxiliar da célula');
  // o dia do encontro é o de hoje: "o encontro desta semana" da folha é hoje, em qualquer dia em que o teste rodar
  await pedir('api/celula', { acao: 'encontro', id: ID, dia: new Date(HOJE + 'T12:00:00Z').getUTCDay() }, lider);
  ok((await pedir('api/cuidado', { acao: 'criar', celula: ID, tipo: 'oracao', destino: 'celula', texto: PEDIDO, dias: 7 }, ana)).status === 200, 'a Ana deixou um pedido de oração na célula');

  // todos estão na célula (e têm conta) desde 10 dias atrás
  await parar();
  const DIA_10 = somaDias(HOJE, -10);
  noBanco((db) => {
    db.prepare('UPDATE proposito_membros SET entrou_em = ? WHERE proposito = ?').run(DIA_10, ID);
    db.prepare('UPDATE propositos SET criado_em = ? WHERE id = ?').run(DIA_10, ID);
    db.prepare('UPDATE contas SET criada_em = ?').run(DIA_10);
  });
  await subir();
  ok((await celulaDe(ana, ID)).membros.length === 5, 'o servidor religado continua com a sessão de cada um e a célula inteira');

  console.log('\n  Parte A: a API e as permissões\n');
  // 1. S1, com o combinado e um testemunho com nome; nasceu 8 dias atrás
  const s1 = (await pedir('api/celula', { ...DONO, id: ID, combinado: COMBINADO_1, testemunho: TESTEMUNHO }, lider)).dado.estudo;
  ok(s1 && s1.combinado === COMBINADO_1 && JSON.stringify(s1.refs) === JSON.stringify(CARTOES), 'S1: o líder salva o estudo do dono com o combinado');
  const S1 = s1.id;
  noBanco((db) => db.prepare('UPDATE celula_estudos SET criado_em = ? WHERE id = ?').run(meioDia(somaDias(HOJE, -8)), S1));
  // o sino de todos da célula, contado antes e depois de cada registro
  const caixa = () => lerBanco("SELECT count(*) n FROM push_caixa WHERE usuario IN ('lider', 'aux', 'ana', 'bia', 'vera', 'caio')")[0].n;
  let caixaAntes = caixa();

  // 2. o encontro de 7 dias atrás, registrado pelo Paulo sem o campo "estudo" (o app antigo)
  const reg7 = await pedir('api/celula', { acao: 'registrarEncontro', id: ID, data: DIA_7, presentes: ['aux', 'ana', 'vera'], visitantes: 2 }, aux);
  ok(reg7.status === 200 && reg7.dado.encontro.estudo === S1 && reg7.dado.estudo.id === S1, 'o registro de 7 dias atrás, sem o campo, fica ligado a S1 (o estudo que valia naquele dia)');
  ok(JSON.stringify(reg7.dado.faltaram) === JSON.stringify([{ usuario: 'bia', nome: 'Bia' }]),
    'quem não veio: a Bia, sem a Vera (visitante), sem o Paulo (que registrou) e sem o Marcos (quem conduz, como em "Precisam de atenção")');
  await dormir(300);
  ok(caixa() === caixaAntes, 'o registro não põe nada no sino de ninguém (nem de quem faltou)');

  // 3. S2, o próximo, com outro combinado e sem os 4 Ws
  const s2 = (await pedir('api/celula', { acao: 'estudo', id: ID, estudo: 'trecho', ref: 'Romanos 8.28-30', fonte: 'Tudo coopera para o bem.', base: S1, combinado: COMBINADO_2 }, lider)).dado.estudo;
  const S2 = s2 && s2.id;
  ok(S2 && S2 !== S1 && lerBanco('SELECT atual_ate FROM celula_estudos WHERE id = ?', S1)[0].atual_ate !== '', 'S2 nasce numa linha nova, e S1 ganha atual_ate');
  ok((await celulaDe(ana, ID)).estudoTestemunho === '' && !JSON.stringify(await celulaDe(vera, ID)).includes('Orem pelo Jonas'),
    'o testemunho de S1, com o nome, não passou para S2');

  // 4. a lista
  for (const [quem, cookie] of [['o líder', lider], ['o Paulo', aux], ['a Ana', ana]]) {
    const r = await estudos('celula=' + ID, cookie);
    ok(r.status === 200 && r.dado.estudos.length === 1 && r.dado.estudos[0].id === S1 && r.dado.estudos[0].dataDe === 'encontro' && r.dado.estudos[0].data === DIA_7
      && r.dado.estudos[0].criadoPorNome === 'Marcos', quem + ' recebe S1 na lista, com a data do encontro e o nome de quem preparou');
  }
  ok((await estudos('celula=' + ID, vera)).status === 403, 'a Vera (visitante) recebe 403 na lista');
  ok((await estudos('celula=' + ID, outro)).status === 404 && (await estudos('celula=' + ID, admin)).status === 404, 'o líder de outra célula e o administrador recebem 404');

  // 5. um estudo
  const ler = async (cookie, id = S1, extra = '') => estudos('estudo=' + id + extra, cookie);
  const doPaulo = await ler(aux);
  ok(doPaulo.status === 200 && JSON.stringify(doPaulo.dado.encontros) === JSON.stringify([{ data: DIA_7, pessoas: 5 }]) && doPaulo.dado.usarComoBase === false,
    'o Paulo (auxiliar) vê que vieram 5 pessoas, e não tem "Usar como base"');
  const doLider = await ler(lider);
  ok(doLider.dado.usarComoBase === true && doLider.dado.estudo.fonte && !doLider.dado.estudo.fonte.includes('A nossa luta'), 'o líder tem "Usar como base" e a fonte limpa, sem o texto da NVI');
  const daAna = await ler(ana);
  ok(daAna.dado.encontros.length === 0 && !('fonte' in daAna.dado.estudo)
    && JSON.stringify(daAna.dado.estudo.blocos.filter((b) => b.t === 'versiculo').map((b) => b.ref)) === JSON.stringify(CARTOES), 'a Ana lê S1, com os 6 cartões, sem a presença e sem a fonte');
  ok(![doPaulo, doLider, daAna].some((r) => /Orem pelo Jonas|estudoAcolhida|estudoTestemunho|cirurgia/.test(JSON.stringify(r.dado))), 'nenhuma leitura leva o testemunho, a acolhida ou um pedido de oração');
  ok((await ler(vera)).status === 403 && (await ler(outro)).status === 404 && (await ler(admin)).status === 404, 'a Vera recebe 403 em S1; de fora e o administrador, 404');

  // 6. quem entrou depois
  const caio = await criar('caio', 'Caio', { celula: token });
  ok((await estudos('celula=' + ID, caio)).dado.estudos.length === 1 && (await ler(caio)).status === 200, 'o Caio entra depois de S2 e lê S1');
  // o Caio entrou ontem: quem entra no próprio dia do encontro não faltou a ele
  await parar();
  noBanco((db) => db.prepare("UPDATE proposito_membros SET entrou_em = ? WHERE proposito = ? AND usuario = 'caio'").run(somaDias(HOJE, -1), ID));
  await subir();

  // 7. o combinado de antes, para quem faz parte da célula (a visitante vê só o estudo atual)
  for (const [quem, cookie] of [['a Ana', ana], ['o líder', lider]]) {
    const c = await celulaDe(cookie, ID);
    ok(JSON.stringify(c.combinadoAnterior) === JSON.stringify({ texto: COMBINADO_1, data: DIA_7, estudo: S1 }), quem + ' recebe "Na semana passada combinamos", com a data de 7 dias atrás');
  }
  ok((await celulaDe(vera, ID)).combinadoAnterior === null, 'a Vera (visitante) não recebe o combinado de antes: ele é do estudo anterior');
  ok((await celulaDe(ana, ID)).temAnteriores === true && (await celulaDe(vera, ID)).temAnteriores === false, 'só quem faz parte da célula fica sabendo que há anteriores');

  // 8. o encontro de 3 dias atrás, registrado pelo líder sem o campo
  caixaAntes = caixa();
  const reg3 = await pedir('api/celula', { acao: 'registrarEncontro', id: ID, data: DIA_3, presentes: ['lider', 'ana'], visitantes: 0 }, lider);
  ok(reg3.dado.encontro.estudo === S1, 'o registro de 3 dias atrás, sem o campo, também fica ligado a S1');
  ok(JSON.stringify(reg3.dado.faltaram.map((x) => x.usuario)) === '["bia"]' && !reg3.dado.faltaram.some((x) => x.usuario === 'caio'),
    'quem não veio não traz o Caio, que entrou depois daquela data, nem o Paulo, que conduz');
  ok((await celulaDe(lider, ID)).estudo.usado === false, 'S2 continua sem uso: o líder ainda vê "Mudar o estudo"');
  ok(JSON.stringify((await ler(aux)).dado.encontros) === JSON.stringify([{ data: DIA_3, pessoas: 2 }, { data: DIA_7, pessoas: 5 }])
    && (await estudos('celula=' + ID, ana)).dado.estudos[0].data === DIA_3, 'a leitura de S1 pelo Paulo passa a ter os dois encontros, e a lista mostra a data de 3 dias atrás');
  const folha = (await celulaDe(aux, ID)).registro;
  ok(folha && folha.dias.find((d) => d.data === DIA_3).estudo === S1 && folha.dias.find((d) => d.data === HOJE).padrao === S2 && folha.estudos.map((e) => e.id).join() === [S2, S1].join(),
    'a folha de registro do Paulo traz o estudo de cada dia e os dois estudos para escolher');
  await dormir(300);
  ok(caixa() === caixaAntes, 'nem o segundo registro: nada chegou ao sino de quem faltou');

  // 9. quem sai
  ok((await pedir('api/propositos', { acao: 'sair', id: ID }, bia)).status === 200 && (await ler(bia)).status === 404 && (await estudos('celula=' + ID, bia)).status === 404,
    'a Bia sai da célula e recebe 404 em S1 e na lista');

  // ---------- partes B e C no navegador (bloco CLIENTE, C6) ----------
  console.log('\n  Parte B: as telas, na célula mãe\n');
  await abrirNavegador();
  const rota = (resto) => '#/novidades/celula/' + ID + (resto ? '/' + resto : '');
  const ddmm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
  const CARTOES_S1 = (sel) => na((s) => [...document.querySelectorAll(s)].map((f) => ({ ref: f.dataset.ref, texto: (f.querySelector('blockquote') || {}).textContent || '' })), sel);
  // o combinado vai entre aspas, como foi escrito (a maiúscula no meio da frase fica certa)
  const ACOLHIDA_LEMBRADA = 'Na semana passada combinamos: \u201c' + COMBINADO_1 + '\u201d Como foi?';

  // 10. o passo 3 do líder: o combinado de S2, o aviso perto do teto, o rascunho e a frase nova
  await como(lider, rota('estudo'));
  ok(await esperar(existe('.mesa-lider [data-mudar]'), 20000) && /Mudar o estudo/.test(await texto('.mesa-lider [data-mudar]')), '10. o líder vê "Mudar o estudo" em S2 (ainda sem uso)');
  await clicar('.mesa-lider [data-mudar]');
  await esperar(existe('[data-ver]'), 15000);
  await clicar('[data-ver]');
  await esperar(existe('[data-continuar]:not([disabled])'), 15000);
  await clicar('[data-continuar]');
  ok(await esperar(existe('[data-combinado]'), 15000) && (await av(q('[data-combinado]') + '.value')) === COMBINADO_2, '10. no passo 3, o campo do combinado traz o de S2');
  ok(/Combinado para a semana \(opcional\)/.test(await texto('.mesa-combinado-campo')) && /Evite nomes de pessoas/.test(await texto('.mesa-combinado-campo')), '10. o rótulo e as dicas do combinado');
  ok(await av(q('[data-limite-combinado]') + '.hidden'), '10. sem aviso de teto com poucos caracteres');
  const CENTO_E_SETENTA = ('Visitar alguém da célula que está doente e levar uma palavra de ânimo, orando junto com a família, '.repeat(2)).slice(0, 170);
  await na((t) => { const c = document.querySelector('[data-combinado]'); c.value = t; c.dispatchEvent(new Event('input', { bubbles: true })); return true; }, CENTO_E_SETENTA);
  ok(await esperar('!' + q('[data-limite-combinado]') + '.hidden') && (await texto('[data-limite-combinado]')) === 'Faltam 30 caracteres para o limite do combinado.', '10. com 170 caracteres: "Faltam 30 caracteres para o limite do combinado."');
  ok(/Ao salvar, a célula vê o estudo na aba Estudo\./.test(await av('document.querySelector(".mesa-preparo").textContent')),
    '10. o aviso de salvar, curto: "Ao salvar, a célula vê o estudo na aba Estudo."');
  ok(await av('!!document.querySelector(".mesa-combinado-campo [data-limite-combinado]")'), '10. o aviso perto do teto fica dentro do cartão do combinado, logo abaixo do campo');
  await foto('01-passo3-combinado', true);
  await foto360('01-passo3-combinado');
  await emTodosOsTamanhos('o passo 3 com o combinado');
  await cmd('Page.reload');
  ok(await esperar('!!document.querySelector("[data-combinado]") && document.querySelector("[data-combinado]").value === ' + JSON.stringify(CENTO_E_SETENTA), 20000), '10. recarregar mantém o combinado (o rascunho)');
  await clicar('.mesa-cabeca [data-voltar]');
  await esperar(existe('[data-voltar-partes]') + ' || ' + existe('[data-continuar]'));
  // volta ao passo 1 e sai sem salvar: o rascunho fica
  for (let i = 0; i < 3 && !(await av(existe('.cortina [data-nao]'))); i++) { await clicar('.mesa-cabeca [data-voltar]'); await dormir(400); }
  await clicar('.cortina [data-nao]');
  ok(await esperar('/\\/estudo$/.test(location.hash)', 10000) && await av('!!localStorage.getItem("cc.rascunho.estudo.' + ID + '")'), '10. "Sair" sai sem salvar, e o rascunho fica');
  // o rascunho é do celular do líder: as outras contas entram neste mesmo navegador com o
  // armazenamento limpo, e ele volta no item 15
  const RASCUNHO_LIDER = await av('localStorage.getItem("cc.rascunho.estudo.' + ID + '")');
  ok((await celulaDe(lider, ID)).estudo.combinado === COMBINADO_2, '10. no servidor, S2 continua com o combinado de antes');

  // 11. a aba da Ana (S2): a acolhida lembrada, sem nada para marcar, e o combinado de S2
  await como(ana, rota('estudo'));
  ok(await esperar(existe('.mesa-combinado'), 20000), '11. a Ana abre a aba Estudo');
  ok(comum(await texto('.secao-w .mesa-combinado')).replace(/\s+/g, ' ') === ACOLHIDA_LEMBRADA && await av('document.querySelector(".mesa-combinado").closest(".secao-w").querySelector(".etiqueta").textContent === "Acolhida"'),
    '11. a Acolhida começa por "' + ACOLHIDA_LEMBRADA + '"');
  ok(await av('!document.querySelector(".mesa-combinado input, .mesa-combinado button, .mesa-combinado [role=checkbox]")'), '11. no combinado lembrado não há caixa de marcar nem botão');
  // S2 é um trecho: o combinado entra no roteiro, logo antes da oração (a ordem do modo encontro e do texto do grupo)
  ok(await av('(() => { const itens = [...document.querySelectorAll(".painel-celula .roteiro > li > b")].map((b) => b.textContent); const li = [...document.querySelectorAll(".painel-celula .roteiro > li")].find((x) => x.querySelector("b")?.textContent === "Combinado para a semana");'
    + ' return !!li && li.textContent.includes(' + JSON.stringify(COMBINADO_2) + ') && itens.indexOf("Combinado para a semana") === itens.indexOf("Para orar juntos") - 1; })()'),
  '11. "Combinado para a semana" mostra o combinado de S2, logo antes de "Para orar juntos"');
  ok(await av('!/\\d+ de \\d+/.test(document.querySelector(".painel-celula").textContent)'), '11. nenhuma contagem "N de M" na aba');
  ok(await av('!/Orem pelo Jonas/.test(document.querySelector(".painel-celula").textContent)'), '11. o testemunho de S1 (com o nome) não aparece em S2');
  ok(/Minhas anotações neste estudo/.test(await texto('.mesa-anotacao')) && !/Só você vê|criptografia/.test(await texto('.mesa-anotacao')), '11. "Minhas anotações neste estudo", sem aviso de privacidade');
  // a anotação fica depois dos botões: não aparece entre o conteúdo e "Mandar no grupo" (nem acima de "Modo encontro", na tela que se mostra no encontro)
  ok(await av('!!(document.querySelector(".painel-celula > .acoes").compareDocumentPosition(document.querySelector(".mesa-anotacao")) & Node.DOCUMENT_POSITION_FOLLOWING)'),
    '11. o bloco da anotação vem depois dos botões da aba');
  ok(await av('[...document.querySelectorAll(".painel-celula .acoes .botao")].map((b) => b.textContent.trim()).join("|") === "Mandar no grupo|Modo encontro|Imprimir"'), '11. os botões: Mandar no grupo, Modo encontro e Imprimir');
  await foto('02-aba-membro', true);
  await foto360('02-aba-membro');
  await tema(true);
  await foto('escuro-02-aba-membro', true);
  await tema(false);

  // 12. os estudos anteriores da Ana
  ok(await esperar(existe('.mesa-anterior'), 15000), '12. a seção "Estudos anteriores" aparece com a lista');
  const linhaS1 = await na(() => { const a = document.querySelector('.mesa-anterior'); return { href: a.getAttribute('href'), smalls: [...a.querySelectorAll('small')].map((x) => x.textContent), titulo: a.querySelector('b').textContent }; });
  ok(linhaS1.href.endsWith('/estudo/' + S1) && comum(linhaS1.smalls[0]) === 'Encontro de ' + ddmm(DIA_3) && comum(linhaS1.smalls[1]) === 'Ef 6, Lc 11, 1Pe 5' && /Batalha espiritual/.test(linhaS1.titulo),
    '12. a linha de S1: "Encontro de ' + ddmm(DIA_3) + '", o título e "Ef 6, Lc 11, 1Pe 5" (' + JSON.stringify(linhaS1.smalls.map(comum)) + ')');
  ok(await av('!/Vieram|pessoas|\\d+ de \\d+/.test(document.querySelector(".mesa-secao-anteriores").textContent)'), '12. a lista não conta pessoas nem leituras');
  await emTodosOsTamanhos('a aba Estudo da Ana, com a lista');
  await clicar('.mesa-anterior');
  ok(await esperar('location.hash.endsWith("/estudo/' + S1 + '") && document.querySelectorAll(".painel-celula .mesa-estudo .cartao-versiculo blockquote").length === 6', 20000), '12. tocar abre a leitura de S1, com os 6 cartões');
  const cartoesS1 = await CARTOES_S1('.painel-celula .mesa-estudo .cartao-versiculo');
  ok(JSON.stringify(cartoesS1.map((c) => c.ref)) === JSON.stringify(CARTOES) && cartoesS1.every((c) => comum(c.texto) === textoDe(NBV, c.ref)), '12. os 6 cartões têm o texto da NBV, palavra por palavra (nbv.json)');
  const leituraAna = await av('document.querySelector(".painel-celula").textContent');
  ok(!/Orem pelo Jonas|Vieram|Usar como base|Na semana passada/.test(leituraAna) && !/Acolhida|Adoração|Testemunho/.test(await av('[...document.querySelectorAll(".painel-celula .secao-w > .etiqueta")].map((e) => e.textContent).join("|")')),
    '12. a leitura não tem o testemunho, a acolhida, "Vieram" nem "Usar como base"');
  ok(/Estudo anterior/.test(await texto('.mesa-cabeca-anterior .etiqueta')) && new RegExp('Encontro de .+, ' + ddmm(DIA_3) + ' · preparado por Marcos').test(comum(await texto('.mesa-cabeca-anterior .passo-dica'))),
    '12. "Estudo anterior" e "Encontro de <dia>, ' + ddmm(DIA_3) + ' · preparado por Marcos"');
  ok(await av('!' + q('.navegacao') + ' || getComputedStyle(' + q('.navegacao') + ').display !== "none"') && await av('!!document.querySelector(\'[data-aba="estudo"][aria-selected="true"]\')'), '12. as abas da célula continuam à vista, com "Estudo" escolhida');
  await foto('03-leitura-membro', true);
  await emTodosOsTamanhos('a leitura de S1 pela Ana');

  // 13. a anotação da Ana em S1
  const NOTA_ANA = 'Minha casa precisa de vigilância: anotei para mim, ninguém mais lê isto 7731.';
  const notasAntes = await av('(CC.conquistasComNivel(CC.estado(), CC.hojeIso()).find((c) => c.id === "notas") || {}).valor');
  await clicar('.mesa-anotacao [data-escrever-contexto]');
  ok(await esperar(existe('.folha-editor #campo-nota')), '13. "Escrever minha anotação" abre o editor');
  ok((await av(q('#campo-titulo-nota') + '.value')) === 'Batalha espiritual, vigilância e Armadura de Deus' && /Estudo da célula/.test(await texto('.folha-editor .chips-nota')),
    '13. a nota nova já traz o título do estudo e o lugar "Estudo da célula"');
  await na((t) => { const c = document.querySelector('#campo-nota'); c.value = t; c.dispatchEvent(new Event('input', { bubbles: true })); return true; }, NOTA_ANA);
  await clicar('.folha-editor [data-guardar]');
  ok(await esperar('!document.querySelector(".folha-editor") && CC.notas().some((n) => n.contexto === "estudo:' + S1 + '")'), '13. guardar cria a nota ligada ao estudo');
  ok(await esperar('/Escrever outra anotação/.test(document.querySelector(".mesa-anotacao").textContent) && document.querySelector(".mesa-anotacao").textContent.includes(' + JSON.stringify(NOTA_ANA) + ')'), '13. a nota aparece no estudo, e o botão vira "Escrever outra anotação"');
  await foto('04-anotacao', true);
  await av('CC.salvarNoServidor()');
  await dormir(600);
  await abrir(rota('estudo'), existe('.mesa-anterior'));
  await clicar('.mesa-anterior');
  ok(await esperar('location.hash.endsWith("/estudo/' + S1 + '") && (document.querySelector(".mesa-anotacao") || {}).textContent?.includes(' + JSON.stringify(NOTA_ANA) + ')', 15000), '13. ao reabrir S1, a anotação continua lá');
  await abrir('#/perfil/anotacoes', existe('.cartao-anot'));
  const chip = await na((id) => { const a = [...document.querySelectorAll('.cartao-anot a.chip-contexto')].find((x) => x.getAttribute('href') === '#/estudo/' + id); return a ? a.textContent.trim() : ''; }, S1);
  ok(chip === 'Estudo da célula', '13. em Minhas anotações, a nota tem o chip "Estudo da célula" para #/estudo/S1');
  await na((id) => { document.querySelector('.cartao-anot a.chip-contexto[href="#/estudo/' + id + '"]').click(); return true; }, S1);
  ok(await esperar('location.hash === ' + JSON.stringify(rota('estudo/' + S1)) + ' && !!document.querySelector(".mesa-cabeca-anterior")', 15000), '13. o chip leva de volta a S1 (por #/estudo/S1), na aba Estudo da célula');
  // ligar um versículo à nota não muda a conquista
  await na((id) => { const n = CC.notas().find((x) => x.contexto === 'estudo:' + id); CC.gravarNota(n.id, { ...n, versos: ['Efésios 6.12'] }); return true; }, S1);
  ok((await av('(CC.conquistasComNivel(CC.estado(), CC.hojeIso()).find((c) => c.id === "notas") || {}).valor')) === notasAntes, '13. a conquista "Caderno de notas" não muda, nem com um versículo ligado à nota');
  await av('CC.salvarNoServidor()');
  await dormir(800);
  const estadoAna = await (await fetch(base + 'api/estado', { headers: { cookie: ana } })).json();
  ok(Object.values(estadoAna.notas || {}).some((n) => n.contexto === 'estudo:' + S1 && n.texto === NOTA_ANA), '13. a nota chega ao servidor com o lugar "estudo:' + S1 + '"');
  const bruto = Buffer.concat(readdirSync(pasta).filter((f) => f.startsWith('caminho.db')).map((f) => readFileSync(join(pasta, f))));
  ok(bruto.length > 0 && !bruto.includes('ninguém mais lê isto 7731'), '13. no banco (com o WAL), o texto da anotação não aparece em claro');

  // 14. a leitura do Paulo (auxiliar): quantas pessoas vieram
  await como(aux, rota('estudo/' + S1));
  ok(await esperar(existe('.mesa-presenca'), 20000), '14. o Paulo abre S1 e vê o cartão da presença');
  const presenca = comum(await texto('.mesa-presenca'));
  ok(presenca.includes('Vieram 2 pessoas no encontro de ' + ddmm(DIA_3) + '.') && presenca.includes('Vieram 5 pessoas no encontro de ' + ddmm(DIA_7) + '.') && !/Só quem conduz/.test(presenca),
    '14. "Vieram 2 pessoas no encontro de ' + ddmm(DIA_3) + '." e "Vieram 5 pessoas no encontro de ' + ddmm(DIA_7) + '.", sem aviso de quem vê');
  ok(await av('!/Usar como base/.test(document.querySelector(".painel-celula").textContent)'), '14. o auxiliar não tem "Usar como base"');
  await foto('05-leitura-quem-conduz', true);
  await foto360('05-leitura-quem-conduz');
  await tema(true);
  await foto('escuro-05-leitura-quem-conduz', true);
  await tema(false);
  await emTodosOsTamanhos('a leitura de S1 por quem conduz');

  // 15. Usar como base (líder): a confirmação, o preparo a partir de S1 e o rascunho
  await como(lider, rota('estudo/' + S1));
  await av('localStorage.setItem("cc.rascunho.estudo.' + ID + '", ' + JSON.stringify(RASCUNHO_LIDER) + '); true');
  ok(await esperar(existe('[data-usar-base]'), 20000), '15. o líder tem "Usar como base" em S1');
  await clicar('[data-usar-base]');
  ok(await esperar('/Usar como base\\?/.test(document.querySelector(".cortina h2")?.textContent || "")'), '15. "Usar como base?" pede confirmação');
  const conf = comum(await texto('.cortina .folha'));
  ok(conf.includes('Você já começou um estudo neste celular. Se continuar, esse rascunho dá lugar ao estudo de ' + ddmm(DIA_3) + '.') && conf.includes('O estudo atual ainda não foi usado num encontro.'),
    '15. a confirmação tem as duas frases: o rascunho (que dá lugar ao estudo de ' + ddmm(DIA_3) + ') e o atual sem uso');
  await foto('06-usar-como-base-confirmar');
  await av('document.querySelector(".cortina").click(); true');
  ok(await esperar('!document.querySelector(".cortina")') && /\/estudo\//.test(await av('location.hash')), '15. tocar fora fica na leitura');
  await clicar('[data-usar-base]');
  await esperar(existe('.cortina [data-sim]'));
  await clicar('.cortina [data-sim]');
  ok(await esperar('location.hash.endsWith("/preparar/' + S1 + '") && !!document.querySelector("[data-fonte]")', 20000) || (await diagnostico('usar-como-base'), false), '15. "Usar como base" leva a …/preparar/S1');
  ok(await av('document.body.classList.contains("sem-barra")') && /Começando do estudo de/.test(await texto('.mesa-de-base')), '15. sem a barra de abas, com "Começando do estudo de …"');
  ok((await av(q('[data-fonte]') + '.value')).startsWith('Estudo: Batalha espiritual') && !(await av(q('[data-fonte]') + '.value')).includes('A nossa luta'), '15. o campo traz o texto de S1 (sem a citação da NVI)');
  await foto('07-preparo-de-base');
  await clicar('[data-ver]');
  await esperar(existe('[data-continuar]:not([disabled])'), 20000);
  await clicar('[data-continuar]');
  ok(await esperar(existe('[data-combinado]'), 15000) && (await av(q('[data-combinado]') + '.value')) === COMBINADO_1, '15. o passo 3 traz o combinado de S1');
  const ws4 = await av('[...document.querySelectorAll(".mesa-ws dd")].map((d) => d.textContent)');
  ok(ws4[2] === 'Quem vocês querem convidar para o próximo encontro? Orem juntos por essas pessoas, pelo nome.' && !ws4.join(' ').includes('Jonas'), '15. a Acolhida e o Testemunho são as sugestões da semana (o testemunho de S1 não volta)');
  // "Mudar o estudo" (…/preparar) com um rascunho de base no celular: a tela pergunta, e não abre
  // o rascunho calada (salvar um rascunho de base cria um estudo novo)
  await abrir(rota('preparar'), '/Continuar o rascunho\\?/.test(document.querySelector(".cortina h2")?.textContent || "")');
  ok((/a partir do estudo de/.test(comum(await texto('.cortina .folha'))) && await av('!document.querySelector("[data-fonte], [data-combinado]")')) || (await diagnostico('continuar-rascunho'), false),
    '15. …/preparar com um rascunho de base pergunta "Continuar o rascunho?" antes de abrir qualquer coisa');
  await clicar('.cortina [data-sim]');
  ok(await esperar('location.hash.endsWith("/preparar/' + S1 + '") && !!document.querySelector("[data-combinado], [data-fonte], [data-continuar]")', 20000)
    && await av('JSON.parse(localStorage.getItem("cc.rascunho.estudo.' + ID + '")).deBase === "' + S1 + '"'), '15. "Continuar o rascunho" volta ao endereço dele, com o rascunho');
  // (a pergunta de antes ainda pode estar fechando: a próxima espera não pode achar ela)
  await esperar('!document.querySelector(".cortina")');
  await abrir(rota('preparar'), '/Continuar o rascunho\\?/.test(document.querySelector(".cortina h2")?.textContent || "")');
  await clicar('.cortina [data-nao]');
  ok(await esperar('!!document.querySelector("[data-tipo=\\"trecho\\"][aria-pressed=\\"true\\"]") && !document.querySelector(".mesa-de-base")', 20000)
    && await av('!localStorage.getItem("cc.rascunho.estudo.' + ID + '") || !JSON.parse(localStorage.getItem("cc.rascunho.estudo.' + ID + '")).deBase')
    || (await diagnostico('deixar-de-lado'), false),
  '15. "Deixar de lado" tira o rascunho de base e abre "Mudar o estudo" com S2 (o trecho)');
  await esperar('!document.querySelector(".cortina")');
  for (let i = 0; i < 4 && !(await av(existe('.cortina [data-nao]'))); i++) { await clicar('.mesa-cabeca [data-voltar]'); await dormir(400); }
  await clicar('.cortina [data-nao]');
  ok(await esperar('/\\/estudo$/.test(location.hash)', 10000) && (await celulaDe(lider, ID)).estudo.id === S2, '15. "Sair" sai sem salvar: S2 continua o atual');

  // 16. o modo encontro do líder (S2): a acolhida com o combinado e "Para a semana"
  await abrir(rota('estudo'), existe('[data-modo-encontro]'));
  await esperar(existe('.mesa-combinado'), 15000);
  await clicar('[data-modo-encontro]');
  ok(await esperar(existe('.tela-cheia .mesa-topo'), 15000), '16. o modo encontro abre');
  ok(comum(await texto('.tela-cheia .mesa-frase')) === ACOLHIDA_LEMBRADA && /Pergunta da acolhida/.test(await texto('.tela-cheia .mesa-corpo-encontro')), '16. o passo 1 tem a frase do combinado e o cartão "Pergunta da acolhida"');
  await foto('08-encontro-acolhida', true);
  const etiquetas = [];
  for (let i = 0; i < 30; i++) {
    etiquetas.push(await texto('.tela-cheia .mesa-topo .etiqueta'));
    if (await av(existe('.tela-cheia [data-registrar]'))) break;
    const antes = await texto('.tela-cheia [data-indice]');
    await clicar('.tela-cheia [data-proximo]');
    await esperar('document.querySelector(".tela-cheia [data-indice]")?.textContent !== ' + JSON.stringify(antes));
    if ((await texto('.tela-cheia .mesa-topo .etiqueta')) === 'Para a semana') await foto('09-encontro-para-a-semana');
  }
  const iSemana = etiquetas.indexOf('Para a semana');
  ok(iSemana > 0 && etiquetas[iSemana + 1] === 'Orar juntos', '16. "Para a semana" vem antes de "Orar juntos" (' + etiquetas.join(', ') + ')');
  await clicar('.tela-cheia [data-registrar]');
  ok(await esperar('!document.querySelector(".tela-cheia") && /Quem foi ao encontro\\?/.test(document.querySelector(".cortina .folha h2")?.textContent || "")'), '16. "Registrar quem veio" abre a folha');
  ok(/Hoje/.test(await texto('.cortina [data-realce-data]')) && /Estudo deste encontro/.test(await texto('.cortina .estudo-do-registro')) && (await texto('.cortina [data-estudo-escolhido]')) === 'Romanos 8.28-30',
    '16. com a data de hoje, "Estudo deste encontro" e S2 (Romanos 8.28-30)');

  // 17. o registro e "Quem não veio"
  await na(() => { document.querySelectorAll('.cortina .escolha-amigo input').forEach((i) => { i.checked = ['lider', 'aux'].includes(i.value); }); return true; });
  await clicar('.cortina [data-trocar-estudo]');
  ok(await esperar('!document.querySelector(".cortina [data-opcoes-estudo]").hidden'), '17. "Trocar" mostra os estudos');
  await foto('10-registro-trocar', true);
  await emTodosOsTamanhos('a folha de registro com "Trocar" aberto');
  await clicar('.cortina [data-trocar-estudo]');
  await na(() => { window.__pedidos = []; window.__fetch0 = window.fetch; window.fetch = (u, o) => { window.__pedidos.push(String(u) + ' ' + ((o && o.body) || '')); return window.__fetch0(u, o); }; window.__copiado = null; CC.copiar = async (t) => { window.__copiado = t; return true; }; return true; });
  const caixaAntesB = caixa();
  await clicar('.cortina [data-salvar]');
  ok(await esperar('/Quem não veio/.test([...document.querySelectorAll(".cortina .folha h2")].pop()?.textContent || "")', 15000) || (await diagnostico('quem-nao-veio'), false), '17. salvar abre "Quem não veio"');
  const nomesFaltou = await av('[...document.querySelectorAll(".folha-faltou .quem-amigo b")].map((b) => b.textContent)');
  ok(JSON.stringify(nomesFaltou) === '["Ana","Caio"]', '17. com a Ana e o Caio (' + JSON.stringify(nomesFaltou) + ')');
  const esperadoAna = 'Oi, Ana! Sentimos sua falta no encontro de hoje. Estudamos Romanos 8.28-30. O estudo está na aba Estudo da célula, no app, se você quiser ler. Está tudo bem com você? Posso orar por alguma coisa?';
  ok((await av(q('.folha-faltou [data-zap-faltou="ana"]') + '.getAttribute("href")')) === 'https://wa.me/?text=' + encodeURIComponent(esperadoAna), '17. o WhatsApp da Ana leva a mensagem pronta, com "de hoje" e o estudo');
  ok(/Se quiser, mande uma mensagem para cada pessoa pelo seu WhatsApp\./.test(await texto('.folha-faltou')) && !/O app não avisa ninguém/.test(await texto('.folha-faltou')) && comum(await texto('.folha-faltou .mesa-zap')) === esperadoAna, '17. "Se quiser, mande uma mensagem" (sem "O app não avisa ninguém") e a prévia com a mensagem da primeira pessoa');
  await foto('11-quem-nao-veio', true);
  await foto360('11-quem-nao-veio');
  await tema(true);
  await foto('escuro-11-quem-nao-veio', true);
  await tema(false);
  await emTodosOsTamanhos('"Quem não veio"');
  await clicar('.folha-faltou [data-copiar-faltou="1"]');
  ok(await esperar('window.__copiado !== null') && (await av('window.__copiado')).startsWith('Oi, Caio! Sentimos sua falta no encontro de hoje.'), '17. "Copiar" copia a mensagem do Caio');
  const pedidos = await av('window.__pedidos');
  // o que foi ao servidor com corpo: só o registro (e a sincronização do próprio estado); o resto é leitura
  const comCorpo = pedidos.filter((x) => / \{/.test(x));
  ok(pedidos.filter((x) => /registrarEncontro/.test(x)).length === 1 && comCorpo.every((x) => /"acao":"registrarEncontro"/.test(x) || /^api\/estado /.test(x))
    && !pedidos.some((x) => /api\/(cuidado|toque|notifica|avisos)/.test(x) && / \{/.test(x)),
    '17. o app só registrou o encontro: nenhum pedido manda mensagem a ninguém (' + pedidos.map((x) => x.split(' ')[0]).join(', ') + ')');
  await dormir(400);
  ok(caixa() === caixaAntesB, '17. o sino da Ana e o do Caio continuam sem nada novo');
  const regHoje = lerBanco('SELECT estudo FROM celula_encontros WHERE proposito = ? AND data = ?', ID, HOJE)[0];
  ok(regHoje && regHoje.estudo === S2, '17. o encontro de hoje fica ligado a S2 no banco');
  await clicar('.folha-faltou [data-fechar]');
  await esperar('!document.querySelector(".folha-faltou")');

  // 18. o registro de dias atrás: o estudo que aquele dia já tem, e "Outro estudo, fora do app"
  await abrir(rota(), existe('.painel-celula'));
  await esperar(existe('[data-corrigir-encontro], [data-registrar-encontro]'), 15000);
  await clicar('[data-corrigir-encontro], [data-registrar-encontro]');
  await esperar(existe('.cortina [data-outra-data]'));
  await clicar('.cortina [data-outra-data]');
  await clicar('.cortina [data-data="' + DIA_3 + '"]');
  ok(await esperar('document.querySelector(".cortina [data-estudo-escolhido]")?.textContent.startsWith("Batalha espiritual")'), '18. "Outra data" para 3 dias atrás marca S1, o estudo que o registro daquele dia já tem');
  await clicar('.cortina [data-trocar-estudo]');
  const opcoesDia3 = await av('[...document.querySelectorAll(".cortina .opcao-estudo input")].map((i) => i.value)');
  ok(!opcoesDia3.includes(S2) && opcoesDia3.includes(S1) && opcoesDia3.includes('-'), '18. "Trocar" não mostra S2, preparado depois daquela data');
  await clicar('.cortina .opcao-estudo input[value="-"]');
  ok((await texto('.cortina [data-estudo-escolhido]')) === 'Outro estudo, fora do app', '18. "Outro estudo, fora do app" fica escolhido');
  await na(() => { document.querySelectorAll('.cortina .escolha-amigo input').forEach((i) => { i.checked = ['lider', 'ana'].includes(i.value); }); return true; });
  await clicar('.cortina [data-salvar]');
  await esperar('/Quem não veio/.test([...document.querySelectorAll(".cortina .folha h2")].pop()?.textContent || "") || !document.querySelector(".cortina")', 15000);
  await dormir(500);
  ok(lerBanco('SELECT estudo FROM celula_encontros WHERE proposito = ? AND data = ?', ID, DIA_3)[0].estudo === '-', '18. o banco guarda "-" no encontro de 3 dias atrás');
  await av('document.querySelectorAll(".cortina").forEach((c) => c.remove()); true');

  // 19. a visitante
  await como(vera, rota('estudo'));
  ok(await esperar(existe('.painel-celula [data-modo-encontro]'), 20000) && await av('!document.querySelector(".mesa-combinado") && !document.querySelector(".mesa-secao-anteriores") && !/Estudos anteriores|Na semana passada/.test(document.querySelector(".painel-celula").textContent)'),
    '19. a Vera vê o estudo atual, sem o combinado de antes e sem "Estudos anteriores"');
  await abrir(rota('estudo/' + S1), '/Os estudos anteriores ficam para quem faz parte da célula/.test(document.querySelector(".painel-celula")?.textContent || "")');
  ok(/Os estudos anteriores ficam para quem faz parte da célula\./.test(await texto('.painel-celula')) && /Ver o estudo atual/.test(await texto('.painel-celula')), '19. num anterior, "Os estudos anteriores ficam para quem faz parte da célula." e "Ver o estudo atual"');
  await clicarTexto('.painel-celula', 'Ver o estudo atual');
  ok(await esperar('/\\/estudo$/.test(location.hash) && !!document.querySelector(".painel-celula [data-modo-encontro]")', 15000), '19. "Ver o estudo atual" volta à aba');

  // 20. quem saiu
  await como(bia, '#/estudo/' + S1);
  ok(await esperar('/Este estudo não está aberto para você\\./.test(document.querySelector("#conteudo")?.textContent || "")', 20000) && /Minhas anotações/.test(await texto('#conteudo')),
    '20. a Bia, que saiu, vê "Este estudo não está aberto para você." e "Minhas anotações"');
  await foto('12-nao-aberto');

  // 21. imprimir o atual (líder, S2), com window.print trocado por um espião
  await como(lider, rota('estudo'));
  await esperar(existe('[data-imprimir]'), 20000);
  await na(() => { window.__impresso = 0; window.print = () => { window.__impresso++; }; return true; });
  await clicar('[data-imprimir]');
  ok(await esperar('window.__impresso === 1 && !!document.querySelector("body > .mesa-impressao")', 15000), '21. "Imprimir" monta a folha e chama a impressão');
  const imp = await na(() => { const el = document.querySelector('.mesa-impressao'); return { texto: el.textContent, cartoes: [...el.querySelectorAll('.imp-cartao blockquote')].map((b) => b.textContent), titulo: (el.querySelector('.imp-titulo') || {}).textContent }; });
  ok(imp.titulo === 'Romanos 8.28-30' && imp.cartoes.length === 1 && imp.cartoes[0] === textoDe(NBV, 'Romanos 8.28-30'), '21. a impressão tem o título e o cartão igual a nbv.json');
  ok(imp.texto.includes(COMBINADO_2) && imp.texto.includes('Na semana passada combinamos:') && imp.texto.includes('O que o texto diz?') && /Nova Bíblia Viva|NBV|Biblica/.test(imp.texto),
    '21. com as perguntas, o combinado, a acolhida lembrada e o crédito da NBV');
  ok(!/Minhas? anota|Só você vê|cirurgia|Vieram/.test(imp.texto), '21. sem a anotação, sem "Só você vê", sem a presença e sem o pedido de oração da Ana');
  await tema(true);
  await cmd('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await dormir(300);
  // (o que está dentro de um bloco escondido não tem caixa: getClientRects() vem vazio)
  const noPapel = await na(() => ({
    nav: getComputedStyle(document.querySelector('#navegacao')).display, folha: document.querySelector('.folha-juntos').getClientRects().length ? 'visível' : 'none',
    app: getComputedStyle(document.querySelector('.aplicativo')).display,
    fundo: getComputedStyle(document.body).backgroundColor, tinta: getComputedStyle(document.querySelector('.mesa-impressao')).color, bloco: getComputedStyle(document.querySelector('.mesa-impressao')).display,
  }));
  ok(noPapel.nav === 'none' && noPapel.folha === 'none' && noPapel.app === 'none' && noPapel.bloco === 'block', '21. no papel, sem a barra de abas e sem a folha do alto, só o estudo (' + JSON.stringify(noPapel) + ')');
  ok(noPapel.fundo === 'rgb(255, 255, 255)' && noPapel.tinta === 'rgb(17, 17, 17)', '21. no tema escuro, o papel continua branco com tinta escura (' + noPapel.fundo + ', ' + noPapel.tinta + ')');
  const pdf = await cmd('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
  const pdfTexto = Buffer.from(pdf.data || '', 'base64').toString('latin1');
  const caixaPdf = (/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/.exec(pdfTexto) || []).slice(1).map(Number);
  ok(caixaPdf.length === 2 && Math.abs(caixaPdf[0] - 595.3) < 1.5 && Math.abs(caixaPdf[1] - 841.9) < 1.5, '21. o PDF sai em A4, 595 x 842 pontos (' + caixaPdf.join(' x ') + ')');
  if (FOTOS) writeFileSync(join(FOTOS, '13-impressao-atual.pdf'), Buffer.from(pdf.data || '', 'base64'));
  // o afterprint, que há navegador de celular que dispara antes de imprimir, não desfaz a folha:
  // a classe sai junto com o bloco, na troca de tela
  await av('dispatchEvent(new Event("afterprint")); true');
  ok(await av('document.body.classList.contains("imprimindo-estudo") && !!document.querySelector("body > .mesa-impressao") && getComputedStyle(document.querySelector(".aplicativo")).display === "none"'),
    '21. depois do afterprint, a folha e a classe continuam: o papel não volta a ser o app');
  await fotoDoPapel('13-impressao-atual-escuro');
  await cmd('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await tema(false);
  await av('location.hash = ' + JSON.stringify(rota()));
  ok(await esperar('!document.querySelector(".mesa-impressao") && !document.body.classList.contains("imprimindo-estudo")'), '21. trocar de tela tira a folha da impressão e a classe');

  // 22. imprimir um anterior (Ana, S1): só a Palavra, as perguntas e o combinado
  await como(ana, rota('estudo/' + S1), false);
  await esperar(existe('.mesa-cabeca-anterior [data-voltar], [data-imprimir]'), 20000);
  await na(() => { window.__impresso = 0; window.print = () => { window.__impresso++; }; return true; });
  await clicar('[data-imprimir]');
  ok(await esperar('window.__impresso === 1', 15000), '22. a Ana imprime S1');
  const impAnt = await av('document.querySelector(".mesa-impressao").innerHTML');
  ok(!/<h2>(Acolhida|Adoração|Testemunho)<\/h2>|Na semana passada|Orem pelo Jonas/.test(impAnt) && /<h2>Palavra<\/h2>/.test(impAnt) && impAnt.includes(COMBINADO_1)
    && (impAnt.match(/imp-cartao/g) || []).length === 6, '22. a impressão de S1 não tem Acolhida, Adoração nem Testemunho; tem os 6 cartões e o combinado');
  await cmd('Emulation.setEmulatedMedia', { media: 'print' });
  const pdfAnt = await cmd('Page.printToPDF', { preferCSSPageSize: true });
  if (FOTOS) writeFileSync(join(FOTOS, '14-impressao-anterior.pdf'), Buffer.from(pdfAnt.data || '', 'base64'));
  await fotoDoPapel('14-impressao-anterior');
  await cmd('Emulation.setEmulatedMedia', { media: '' });

  // 23. gírias na tela: "Precisam de atenção" e as mensagens prontas
  await como(lider, rota());
  await esperar('/Precisam de atenção/.test(document.querySelector(".painel-celula")?.textContent || "")', 20000);
  const atencao = await av('document.querySelector(".painel-celula").textContent + [...document.querySelectorAll(".painel-celula a[href^=\'https://wa.me\']")].map((a) => decodeURIComponent(a.getAttribute("href"))).join(" ")');
  ok(!/\b(Bora|bora|tempão|sumid[oa])\b/.test(atencao), '23. "Precisam de atenção" e as mensagens prontas sem "Bora", "tempão" nem "sumido"');

  console.log('\n  Parte C: a multiplicação, pela API\n');
  const mult = await pedir('api/celula', { acao: 'multiplicar', id: ID, auxiliar: 'aux', titulo: 'Célula Nova', pessoas: ['ana'] }, lider);
  const FILHA = mult.dado.id;
  ok(mult.status === 200 && FILHA, 'o líder multiplica a célula, com o Paulo liderando a nova e a Ana indo junto');
  // S3: o que a mãe prepara depois do corte (amanhã) não é da história das duas
  noBanco((db) => db.prepare("INSERT INTO celula_estudos (id, proposito, tipo, titulo, ref, refs, fonte, criado_por, criado_em) VALUES ('e3depois', ?, 'trecho', 'João 3.16', 'João 3.16', '[\"João 3.16\"]', '', 'lider', ?)")
    .run(ID, meioDia(somaDias(HOJE, 1))));
  const filhaDaAna = await celulaDe(ana, FILHA);
  ok(JSON.stringify(filhaDaAna.daMae) === JSON.stringify({ titulo: 'Célula Esperança', ate: HOJE }) && filhaDaAna.temAnteriores === false, 'a Ana, na filha, recebe daMae, com o dia da multiplicação');
  const daMae = await estudos('celula=' + FILHA + '&de=mae', ana);
  ok(daMae.status === 200 && daMae.dado.estudos.map((e) => e.id).join() === [S2, S1].join() && daMae.dado.celula.titulo === 'Célula Esperança',
    'com de=mae, a Ana recebe S2 e S1, sem S3');
  ok((await ler(ana)).dado.celula === FILHA && (await ler(ana)).dado.daMae.titulo === 'Célula Esperança', 'a Ana pede S1 sem a célula e recebe a leitura pela filha');
  ok((await ler(ana, S1, '&celula=' + ID)).status === 404 && (await ler(ana, 'e3depois')).status === 404, 'pela mãe, de onde saiu, 404; e S3, 404');
  const doNovoLider = await ler(aux, S1, '&celula=' + FILHA);
  ok(doNovoLider.status === 200 && doNovoLider.dado.usarComoBase === false && doNovoLider.dado.encontros.length === 0 && !('fonte' in doNovoLider.dado.estudo),
    'o Paulo, líder da filha, abre S1 sem "Usar como base", sem a presença e sem a fonte');
  ok((await pedir('api/celula', { acao: 'registrarEncontro', id: FILHA, data: HOJE, presentes: ['aux'], visitantes: 0, estudo: S1 }, aux)).status === 400,
    'o registro da filha não aceita um estudo da mãe');
  // ---------- parte C no navegador: a filha ----------
  // 25. a Ana na filha: os estudos da célula de origem, só para leitura
  const rotaFilha = (resto) => '#/novidades/celula/' + FILHA + (resto ? '/' + resto : '');
  await como(ana, rotaFilha('estudo'));
  ok(await esperar('/Da célula de origem/.test(document.querySelector(".painel-celula")?.textContent || "")', 20000) && /Ver os estudos da Célula Esperança/.test(await texto('.painel-celula')),
    '25. a Ana, na filha, vê "Da célula de origem" e "Ver os estudos da Célula Esperança"');
  ok(/Os estudos da Célula Esperança até a multiplicação, em \d{2}\/\d{2}\. Só para leitura\./.test(comum(await texto('.mesa-secao-anteriores'))), '25. "Os estudos da Célula Esperança até a multiplicação, em dd/mm. Só para leitura."');
  await clicar('[data-ver-mae]');
  ok(await esperar('document.querySelectorAll("[data-lista-mae] .mesa-anterior").length === 2', 15000), '25. a lista da célula de origem tem S1 e S2');
  const hrefsMae = await av('[...document.querySelectorAll("[data-lista-mae] .mesa-anterior")].map((a) => a.getAttribute("href"))');
  ok(hrefsMae[0].endsWith('/estudo/' + S2) && hrefsMae[1].endsWith('/estudo/' + S1) && hrefsMae.every((h) => h.includes(FILHA)), '25. as linhas abrem pela filha, S2 e depois S1');
  await foto('15-filha-origem', true);
  await foto360('15-filha-origem');
  await emTodosOsTamanhos('a lista da célula de origem');
  await clicar('[data-lista-mae] .mesa-anterior:last-child');
  ok(await esperar('/Da Célula Esperança · só para leitura/.test(document.querySelector(".mesa-cabeca-anterior")?.textContent || "")', 20000), '25. a leitura diz "Da Célula Esperança · só para leitura"');
  ok(await av('!/Usar como base|Vieram/.test(document.querySelector(".painel-celula").textContent)') && await av('document.querySelectorAll(".painel-celula .cartao-versiculo").length === 6'), '25. sem "Usar como base" e sem a presença, com os 6 cartões');
  // 26. o Paulo, líder da filha
  await como(aux, rotaFilha('estudo/' + S1));
  ok(await esperar(existe('.mesa-cabeca-anterior'), 20000) && await av('!/Usar como base|Vieram/.test(document.querySelector(".painel-celula").textContent)'), '26. o Paulo, líder da filha, lê S1 sem "Usar como base" e sem "Vieram"');

  // 28. sem exceções de JavaScript em nenhuma tela
  const erros = evs.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || 'exceção');
  ok(erros.length === 0, '28. nenhuma exceção de JavaScript' + (erros[0] ? ': ' + erros[0].slice(0, 300) : ''));
} finally {
  await encerrar();
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
