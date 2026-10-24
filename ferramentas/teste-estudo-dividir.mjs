// O estudo comprido em dois encontros e a impressão inteira, num Chrome sem interface, com contas
// criadas pela API num servidor próprio. O líder cola um estudo de 101 partes
// (ferramentas/estudo-longo.txt): o passo 2 mostra "Este estudo rende 2 encontros" e o botão
// "Dividir em 2 encontros", no lugar do aviso das 80 partes; a prévia mostra os dois encontros; o
// "Desfazer a divisão" volta o texto inteiro; dividido, a parte 1 é salva como o estudo da célula e
// a parte 2 fica guardada para o próximo encontro. Depois de um encontro registrado, "Preparar o
// próximo" abre a parte 2 pronta, e ela é salva como o estudo seguinte (a parte 1 vai para Estudos
// anteriores). Por fim, "Imprimir" no app instalado do iPhone (html.app-ios): o PDF tem todas as
// folhas, com a marca d'água em cada uma, e o tema escuro não vaza para o papel.
// As telas a 390 e 360 px, claro e escuro, sem rolagem lateral, toque de 44 px e letra de 12 px.
// Os textos bíblicos esperados saem de conteudo/biblias, nunca digitados aqui.
// Uso: CHROME=<chrome> node ferramentas/teste-estudo-dividir.mjs
//   PORTA=<porta do servidor> (8395), PORTAS=<faixa> para o Chrome, FOTOS=<pasta> guarda as capturas
//   e o PDF, RAPIDO=1 pula as medidas nos quatro tamanhos e temas.
import { spawn } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA_NAV = await portaLivre();
const PORTA = Number(process.env.PORTA) || 8395;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FOTOS = process.env.FOTOS || '';
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const NBV = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'nbv.json'), 'utf8'));
// como CC.textoDoVersiculo (04b-leitor.js): os versículos juntos
const textoDe = (ref) => {
  const m = /^(.+?) (\d+)\.(\d+)(?:-(\d+))?$/.exec(ref);
  return (NBV.livros[m[1]][Number(m[2]) - 1] || []).slice(Number(m[3]) - 1, Number(m[4] || m[3])).filter(Boolean).join(' ');
};
const LONGO = readFileSync(join(AQUI, 'ferramentas', 'estudo-longo.txt'), 'utf8').replace(/\s+$/, '');
const LINHAS = LONGO.split('\n');
const TITULO = 'O fruto do Espírito no dia a dia';
const T5 = LINHAS.findIndex((l) => l.startsWith('5. '));
// as duas partes esperadas: o título com "(parte N)" e as linhas do texto, cortadas no tópico 5
const PARTE_1 = [TITULO + ' (parte 1)'].concat(LINHAS.slice(1, T5)).join('\n');
const PARTE_2 = [TITULO + ' (parte 2)'].concat(LINHAS.slice(T5)).join('\n');
const MSG_PARTES = 'O estudo passou de 80 partes. Divida em dois encontros.';
const hojeEm = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const HOJE = hojeEm();

// ---------- o servidor e o navegador ----------
const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-estudo-dividir-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_TESTE: '1' },
  stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-estudo-dividir-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
const base = 'http://127.0.0.1:' + PORTA + '/';
let encerrado = false;
async function encerrar() {
  if (encerrado) return;
  encerrado = true;
  try { fecharArvore(nav, perfil); } catch { /* ok */ }
  try { servidor.kill(); } catch { /* ok */ }
  await dormir(400);
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
  try { rmSync(pastaEstado, { recursive: true, force: true }); } catch { /* ok */ }
}
process.on('uncaughtException', async (e) => { console.log('  FALHA ' + (e && e.stack || e)); await encerrar(); process.exit(1); });
process.on('unhandledRejection', async (e) => { console.log('  FALHA ' + (e && e.stack || e)); await encerrar(); process.exit(1); });
for (let i = 0; i < 80; i++) { try { await fetch(base + 'api/existe-conta'); break; } catch { await dormir(150); } }

// ---------- a API ----------
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

const lider = await criar('lider', 'Marcos');
const ID = (await pedir('api/celula', { acao: 'criar', titulo: 'Célula Esperança' }, lider)).dado.proposito.id;
const token = new URL((await pedir('api/celula', { acao: 'link', id: ID }, lider)).dado.link).searchParams.get('celula');
await criar('ana', 'Ana', { celula: token });

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
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
});
await new Promise((r) => ws.addEventListener('open', r));
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
const comum = (t) => String(t == null ? '' : t).replace(/\u00a0/g, ' ').replace(/\u2060/g, '');
const texto = async (sel) => comum(await av('(' + q(sel) + ' || {}).textContent || ""'));
const larguras = { 390: 844, 360: 740 };
let largura = 390;
const tamanho = async (w, h) => { largura = w; await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h || larguras[w] || 844, deviceScaleFactor: 2, mobile: true }); };

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Network.enable');
await tamanho(390);
await cmd('Emulation.setTimezoneOverride', { timezoneId: 'America/Sao_Paulo' });
await cmd('Emulation.setFocusEmulationEnabled', { enabled: true });
await cmd('Page.bringToFront');
await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });

// Entra como uma conta e abre a rota. limpar: armazenamento limpo (a fila das partes mora nele).
async function como(cookie, rota, limpar = true, busca = '') {
  await cmd('Page.navigate', { url: base + 'privacidade.html' });
  await esperar('document.readyState === "complete"');
  if (limpar) await av('localStorage.clear(); sessionStorage.clear(); true');
  await cmd('Network.clearBrowserCookies');
  const [nome, ...resto] = cookie.split('=');
  await cmd('Network.setCookie', { name: nome, value: resto.join('='), url: base });
  await cmd('Page.navigate', { url: base + busca + rota });
  await esperar('!!window.CC && !!document.querySelector("#conteudo") && !!document.querySelector(".folha-juntos, .painel-celula")', 15000);
}
const rota = (aba) => '#/novidades/celula/' + ID + (aba ? '/' + aba : '');
const tema = (escuro) => av('CC.guardarTema(' + (escuro ? 'true' : 'false') + '); true');
const fila = () => av('JSON.parse(localStorage.getItem("cc.estudo.proximos.' + ID + '") || "null")');

async function foto(nome, inteira) {
  if (!FOTOS) return;
  await dormir(350);
  await av('document.getElementById("aviso-flutuante")?.remove(); true');
  if (inteira) {
    const h = await na(() => {
      const folha = document.querySelector('.cortina .folha');
      if (folha) { folha.style.maxHeight = 'none'; folha.style.overflow = 'visible'; return Math.ceil(folha.scrollHeight + 96); }
      return Math.ceil(document.documentElement.scrollHeight);
    });
    await tamanho(largura, Math.max(h, larguras[largura]));
    await dormir(400);
  }
  const r = await cmd('Page.captureScreenshot', { format: 'png', fromSurface: true });
  if (r.data) writeFileSync(join(FOTOS, nome + '.png'), Buffer.from(r.data, 'base64'));
  if (inteira) { await tamanho(largura); await dormir(200); }
}
async function diagnostico(nome) {
  const d = await na(() => ({ hash: location.hash, passo: (document.querySelector('.mesa-passo') || {}).textContent || '', cortinas: document.querySelectorAll('.cortina').length,
    aviso: (document.getElementById('aviso-flutuante') || {}).textContent || '', erro: (document.querySelector('[data-erro]') || {}).textContent || '' }));
  console.log('    (diagnóstico ' + nome + ': ' + JSON.stringify(d) + ')');
}

// Sem rolagem lateral, todo botão com 44 px na menor medida e nenhuma letra abaixo de 12 px.
async function medidas(rotulo) {
  const m = await na(() => {
    const raizes = [...document.querySelectorAll('.cortina .folha')];
    if (!raizes.length) raizes.push(document.querySelector('#conteudo'));
    const visivel = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const pequenos = [];
    const letras = [];
    for (const raiz of raizes) {
      for (const el of raiz.querySelectorAll('button, a[href], select, textarea, input:not([type="checkbox"]), [role="radio"]')) {
        if (!visivel(el) || el.closest('.acoes-verso')) continue;
        const r = el.getBoundingClientRect();
        if (Math.min(r.width, r.height) < 43.5) pequenos.push((el.textContent.trim() || el.getAttribute('aria-label') || el.className).slice(0, 40) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
      const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
      for (let n = andar.nextNode(); n; n = andar.nextNode()) {
        if (!n.nodeValue.trim() || !n.parentElement || !visivel(n.parentElement)) continue;
        const f = parseFloat(getComputedStyle(n.parentElement).fontSize);
        if (f < 11.95) letras.push(n.nodeValue.trim().slice(0, 30) + ' ' + f);
      }
    }
    return { lateral: document.documentElement.scrollWidth - innerWidth, pequenos: [...new Set(pequenos)], letras: [...new Set(letras)] };
  });
  const tudoCerto = m.lateral <= 0 && !m.pequenos.length && !m.letras.length;
  ok(tudoCerto, rotulo + ': sem rolagem lateral, toque de 44 px e letra de 12 px'
    + (tudoCerto ? '' : ' (lateral ' + m.lateral + ', pequenos: ' + m.pequenos.slice(0, 4).join(' | ') + ', letras: ' + m.letras.slice(0, 4).join(' | ') + ')'));
}
async function emTodosOsTamanhos(rotulo) {
  if (process.env.RAPIDO) return;
  for (const w of [390, 360]) {
    for (const escuro of [false, true]) {
      await tamanho(w);
      await tema(escuro);
      await dormir(250);
      await medidas(rotulo + ' a ' + w + ' px, ' + (escuro ? 'escuro' : 'claro'));
    }
  }
  await tamanho(390);
  await tema(false);
}

console.log('\n  O estudo comprido em dois encontros\n');

// ---------- 1. o aviso com o botão de dividir ----------
await como(lider, rota('preparar'));
ok(await esperar(existe('[data-fonte]'), 15000), '1. o líder abre o preparo');
await na((t) => { const c = document.querySelector('[data-fonte]'); c.value = t; c.dispatchEvent(new Event('input', { bubbles: true })); return true; }, LONGO);
await clicar('[data-ver]');
ok(await esperar(existe('[data-aviso-dividir]'), 15000), '1. o estudo de 101 partes mostra o aviso de dividir no passo 2');
const aviso = await texto('[data-aviso-dividir]');
ok(aviso.includes('Este estudo rende 2 encontros') && aviso.includes('Ele tem 101 partes, e cada encontro leva até 80.') && aviso.includes('A parte 2 começa no Tópico 5: Amabilidade e bondade: o jeito de tratar, perto do meio.'),
  '1. o aviso diz quantas partes, o teto e onde começa a parte 2 (' + aviso + ')');
ok(await texto('[data-dividir]') === 'Dividir em 2 encontros', '1. o botão principal: "Dividir em 2 encontros"');
ok(!(await texto('[data-erro]')).includes(MSG_PARTES) && await av(q('[data-continuar]') + '.disabled === true'), '1. o aviso das 80 partes sai (o botão resolve), e Continuar segue desligado');
await emTodosOsTamanhos('1. o aviso de dividir');
await foto('01-aviso-dividir-390-claro');
await tema(true);
await foto('02-aviso-dividir-390-escuro');
await tema(false);

// ---------- 2. a prévia e o desfazer ----------
await clicar('[data-dividir]');
ok(await esperar(existe('.cortina .folha [data-confirmar-divisao]')), '2. "Dividir em 2 encontros" abre a prévia');
const previa = await na(() => [...document.querySelectorAll('.cortina .mesa-encontro-dividido')].map((s) => s.textContent.replace(/\u00a0/g, ' ')));
ok(previa.length === 2 && previa[0].includes(TITULO + ' (parte 1)') && previa[0].includes('Do começo do estudo') && previa[0].includes('50 partes') && previa[0].includes('7 versículos')
  && previa[1].includes(TITULO + ' (parte 2)') && previa[1].includes('Começa no Tópico 5') && previa[1].includes('51 partes') && previa[1].includes('8 versículos'),
'2. a prévia mostra os dois encontros: título, onde começa, partes e versículos (' + previa.join(' / ') + ')');
ok(await fila() === null, '2. a prévia ainda não muda nada');
await emTodosOsTamanhos('2. a prévia da divisão');
await foto('03-previa-divisao-390-claro', true);
await clicar('.cortina [data-confirmar-divisao]');
ok(await esperar(existe('.mesa-dividido') + ' && !' + existe('[data-aviso-dividir]'), 15000), '2. "Dividir": o passo 2 mostra a parte 1, sem o aviso');
const f1 = await fila();
ok(f1 && f1.total === 2 && f1.partes.length === 1 && f1.partes[0].k === 2 && f1.partes[0].fonte === PARTE_2, '2. a parte 2 fica guardada, inteira, para o próximo encontro');
ok(await av('JSON.parse(localStorage.getItem("cc.rascunho.estudo.' + ID + '")).fonte') === PARTE_1 && await av(q('[data-continuar]') + '.disabled === false'),
  '2. o rascunho agora é a parte 1, e Continuar liga');
ok((await texto('.mesa-dividido')).includes('Estudo dividido em 2 encontros. Esta é a parte 1; a parte 2 fica guardada para o próximo encontro.'), '2. a nota diz o que aconteceu');
await emTodosOsTamanhos('2. depois de dividir');
await foto('04-depois-de-dividir-390-claro', true);
await tema(true);
await foto('05-depois-de-dividir-390-escuro');
await tema(false);
await clicar('[data-desfazer-divisao]');
ok(await esperar(existe('[data-aviso-dividir]'), 15000) && await fila() === null && await av('JSON.parse(localStorage.getItem("cc.rascunho.estudo.' + ID + '")).fonte') === LONGO,
  '2. "Desfazer a divisão": o texto inteiro volta, e a fila fica vazia');
await clicar('[data-dividir]');
await esperar(existe('.cortina [data-confirmar-divisao]'));
await clicar('.cortina [data-confirmar-divisao]');
ok(await esperar(existe('.mesa-dividido'), 15000), '2. dividido de novo');

// ---------- 3. a parte 1 é o estudo da célula ----------
await clicar('[data-continuar]');
ok(await esperar(existe('[data-salvar]'), 15000), '3. o passo 3 abre');
await clicar('[data-salvar]');
ok(await esperar('/\\/estudo$/.test(location.hash) && !!document.querySelector("[data-imprimir]")', 20000), '3. "Salvar o estudo" volta para a aba');
let cel = await celulaDe(lider, ID);
const S1 = cel.estudo.id;
ok(cel.estudo.titulo === TITULO + ' (parte 1)' && cel.estudo.blocos.length === 50 && cel.estudo.refs.length === 7, '3. o servidor guardou a parte 1: 50 partes e 7 cartões (' + cel.estudo.titulo + ')');
ok(await esperar(existe('.mesa-lider .mesa-fila'), 10000) && (await texto('.mesa-lider .mesa-fila')) === 'A parte 2 de 2 já está guardada para o próximo encontro.', '3. o cartão do líder lembra que a parte 2 está guardada');
await emTodosOsTamanhos('3. a aba com a parte 1');
await foto('06-aba-parte-1-390-claro');

// ---------- 4. depois do encontro, a parte 2 abre pronta ----------
ok((await pedir('api/celula', { acao: 'registrarEncontro', id: ID, data: HOJE, presentes: ['lider', 'ana'], visitantes: 0, estudo: S1 }, lider)).status === 200, '4. o encontro de hoje fica registrado com a parte 1');
await como(lider, rota('estudo'), false);
ok(await esperar('/Preparar o próximo/.test(' + q('.mesa-lider [data-mudar]') + '?.textContent || "")', 20000), '4. com a parte 1 usada, o botão é "Preparar o próximo"');
await clicar('.mesa-lider [data-mudar]');
ok(await esperar(existe('[data-fonte]') + ' && ' + existe('.mesa-da-fila'), 15000), '4. "Preparar o próximo" abre o preparo com a nota da parte 2');
ok((await texto('.mesa-da-fila')) === 'Parte 2 de 2 de \u201c' + TITULO + '\u201d. Mude o que quiser antes de salvar.' && await av(q('[data-fonte]') + '.value') === PARTE_2,
  '4. o campo já traz a parte 2, inteira');
ok(await existe('[data-descartar-parte]') ? (await texto('[data-descartar-parte]')) === 'Descartar a parte 2' : false, '4. dá para descartar a parte 2, se o líder quiser outro estudo');
await emTodosOsTamanhos('4. o preparo da parte 2');
await foto('07-preparar-parte-2-390-claro');
await clicar('[data-ver]');
ok(await esperar(existe('[data-continuar]') + ' && !' + existe('[data-aviso-dividir]'), 15000) && await av(q('[data-continuar]') + '.disabled === false'), '4. a parte 2 cabe num encontro: sem aviso, Continuar ligado');
await clicar('[data-continuar]');
await esperar(existe('[data-salvar]'), 15000);
await clicar('[data-salvar]');
ok(await esperar('/\\/estudo$/.test(location.hash) && !!document.querySelector("[data-imprimir]")', 20000), '4. a parte 2 salva');
cel = await celulaDe(lider, ID);
ok(cel.estudo.id !== S1 && cel.estudo.titulo === TITULO + ' (parte 2)' && cel.estudo.blocos.length === 51 && cel.estudo.refs.length === 8, '4. o servidor guardou a parte 2 como o estudo seguinte: 51 partes e 8 cartões');
ok(await fila() === null && !(await av(existe('.mesa-lider .mesa-fila'))), '4. a fila fica vazia, e o cartão do líder não fala mais dela');
const anteriores = await pedir('api/estudos?celula=' + encodeURIComponent(ID), null, lider);
ok((anteriores.dado.estudos || []).some((x) => x.id === S1 && x.titulo === TITULO + ' (parte 1)'), '4. a parte 1 está em Estudos anteriores');

// ---------- 5. Imprimir: todas as folhas, com a marca d'água ----------
console.log('\n  A impressão inteira\n');
// o app instalado no iPhone (html.app-ios, a página presa em 100% de altura): era onde o papel
// saía só com a primeira folha
await como(lider, rota('estudo'), false, '?app-ios');
ok(await esperar(existe('[data-imprimir]'), 20000) && await av('document.documentElement.classList.contains("app-ios")'), '5. a aba abre como no app instalado do iPhone');
await tema(true);
await na(() => { window.__impresso = 0; window.print = () => { window.__impresso++; }; return true; });
await clicar('[data-imprimir]');
ok(await esperar('window.__impresso === 1 && !!document.querySelector("body > .mesa-impressao")', 15000), '5. "Imprimir" monta a folha e chama a impressão');
const folha = await na(() => {
  const el = document.querySelector('.mesa-impressao');
  const img = el.querySelector('.imp-marca img');
  return { texto: el.textContent.replace(/\u00a0/g, ' '), cartoes: [...el.querySelectorAll('.imp-cartao blockquote')].map((b) => b.textContent), marca: !!img && img.complete && img.naturalWidth > 0,
    css: document.querySelector('style[data-estudo-celula]').textContent };
});
const semMarcas = (t) => t.replace(/\*/g, '').replace(/^\d+\. /, '');
const textos = cel.estudo.blocos.filter((b) => b.t === 'texto' || b.t === 'topico' || b.t === 'guardar').map((b) => semMarcas(b.texto));
ok(textos.every((t) => folha.texto.includes(t)), '5. a folha tem todos os ' + textos.length + ' textos, tópicos e o "Para guardar" da parte 2');
ok(folha.cartoes.length === 8 && cel.estudo.refs.every((r, i) => folha.cartoes[i] === textoDe(r)), '5. e os 8 cartões, iguais a nbv.json');
ok(folha.marca && folha.css.includes('geracaoeleita.app'), '5. com a marca d\'água (a imagem do símbolo, carregada) e a linha do app no pé');
await cmd('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await dormir(300);
const papel = await na(() => {
  const html = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  const marca = getComputedStyle(document.querySelector('.mesa-impressao .imp-marca'));
  return { altura: html.height === 'auto' || parseFloat(html.height) > innerHeight, overflow: html.overflowY + '/' + body.overflowY, corpo: body.display,
    fundo: body.backgroundColor, esquema: html.colorScheme, posicao: marca.position, opacidade: Number(marca.opacity), pagina: getComputedStyle(document.querySelector('.mesa-impressao')).page };
});
ok(papel.overflow === 'visible/visible' && papel.corpo === 'block', '5. no papel, a página do app instalado não fica presa: overflow visível, sem flex (' + JSON.stringify(papel) + ')');
ok(papel.fundo === 'rgb(255, 255, 255)' && /light/.test(papel.esquema) && !/dark/.test(papel.esquema), '5. no tema escuro, o papel é branco e o esquema de cor, claro');
ok(papel.posicao === 'fixed' && papel.opacidade > 0 && papel.opacidade <= 0.1 && papel.pagina === 'estudo', '5. a marca d\'água é fixa (repete em cada folha) e bem clara (opacidade ' + papel.opacidade + ')');
// quantas folhas o estudo precisa: a altura da folha na largura útil da A4 (180 mm) dividida pela
// altura útil (263 mm), a 96 dpi
await cmd('Emulation.setDeviceMetricsOverride', { width: 680, height: 994, deviceScaleFactor: 1, mobile: false });
await dormir(300);
const altura = await av('document.querySelector(".mesa-impressao").getBoundingClientRect().height');
const precisa = Math.ceil(altura / 994);
const pdf = await cmd('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
const bytes = Buffer.from(pdf.data || '', 'base64');
const bruto = bytes.toString('latin1');
const folhas = (bruto.match(/\/Type\s*\/Page(?!s)/g) || []).length;
ok(precisa >= 2 && folhas >= precisa, '5. o PDF tem todas as folhas: ' + folhas + ' (o estudo precisa de ' + precisa + ')');
// o fundo preto do tema escuro nas margens: nenhum retângulo preto pintado nas páginas
const fluxos = [...bruto.matchAll(/stream\r?\n/g)].map((m) => {
  const ini = m.index + m[0].length;
  const fim = bruto.indexOf('endstream', ini);
  try { return inflateSync(bytes.subarray(ini, fim)).toString('latin1'); } catch { return ''; }
});
// (o fundo escuro aparece como "r g b rg" escuro e um retângulo do tamanho da folha, "0 0 794 1123 re f")
const fundoEscuro = (f) => [...f.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) rg\s+(?:[^\n]*\n){0,3}?[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+) re\s+f/g)]
  .some((m) => [m[1], m[2], m[3]].every((c) => Number(c) < 0.5) && Number(m[4]) > 300 && Number(m[5]) > 300);
ok(fluxos.length > 0 && !fluxos.some(fundoEscuro), '5. nenhum fundo escuro do tamanho da folha no PDF (o tema escuro não vaza para as margens)');
if (FOTOS) writeFileSync(join(FOTOS, '08-impressao.pdf'), bytes);
await tamanho(390);
await cmd('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await tema(false);

await encerrar();
console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'tudo certo') + '\n');
process.exit(falhas ? 1 : 0);
