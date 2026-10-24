// O estudo da célula (À Mesa, Fase 1) num Chrome sem interface, com contas criadas pela API num
// servidor próprio: o líder cola o estudo do dono (ferramentas/estudo-exemplo.txt, com o resumo em
// negrito, como vem do Word), confere a prévia, escolhe as perguntas e salva; o auxiliar e a Ana
// (membro) leem sem o botão de preparar, e o servidor recusa o estudo deles; "Mandar no grupo" leva
// o estudo inteiro; o modo encontro anda pelos 15 passos e o último abre o registro de quem veio.
// Tudo a 390 e 360 px, claro e escuro, sem rolagem lateral, toque de 44 px e letra de 12 px ou mais.
// docs/a-mesa-fase1.md, seção 6.5. Os textos bíblicos esperados saem de conteudo/biblias, nunca
// digitados aqui.
// Uso: CHROME=<chrome> node ferramentas/teste-estudo-celula.mjs
//   PORTA=<porta do servidor> (8393), PORTAS=<faixa> para o Chrome, FOTOS=<pasta> guarda as capturas
//   com os nomes dos quadros do mock (mesa-mock/*.png).
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from '../db.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA_NAV = await portaLivre();
const PORTA = Number(process.env.PORTA) || 8393;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FOTOS = process.env.FOTOS || '';
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// ---------- os textos esperados, da Bíblia do app ----------
const NBV = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'nbv.json'), 'utf8'));
const BLIVRE = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'blivre.json'), 'utf8'));
// como CC.textoDoVersiculo (04b-leitor.js): os versículos juntos, sem o cabeçalho acróstico da Bíblia Livre
const textoDe = (biblia, ref) => {
  const m = /^(.+?) (\d+)\.(\d+)(?:-(\d+))?$/.exec(ref);
  return (biblia.livros[m[1]][Number(m[2]) - 1] || []).slice(Number(m[3]) - 1, Number(m[4] || m[3])).filter(Boolean).join(' ').replace(/^\[[^\]]*\]\s*:?\s*/, '');
};
const CARTOES = ['Efésios 6.12', 'Lucas 11.24-26', '1 Pedro 5.8', 'Efésios 6.13-17', 'Efésios 6.18', 'Efésios 6.10'];
const SEM_LUCAS = CARTOES.filter((r) => !r.startsWith('Lucas'));
const LINHAS_DONO = readFileSync(join(AQUI, 'ferramentas', 'estudo-exemplo.txt'), 'utf8').replace(/\s+$/, '').split('\n');
const RESUMO = [31, 32, 33, 34, 35, 36];
const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// o que o Word põe na área de transferência: um parágrafo por linha, o resumo em negrito
const HTML_WORD = '<html><body><!--StartFragment-->' + LINHAS_DONO.map((l, i) => '<p class="MsoNormal">' + (RESUMO.includes(i) ? '<b><span>' + escHtml(l) + '</span></b>' : '<span>' + escHtml(l) + '</span>') + '</p>').join('\n') + '<!--EndFragment--></body></html>';
const REFLEXAO_244 = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'conteudo.json'), 'utf8')).reflexoes['244'][0];
const OIA_APLICACAO = 'O que muda na minha semana? Uma atitude concreta, com dia e hora.';
const ACOLHIDA = 'O que fez você rir nos últimos dias?';
const PEDIDO = 'Peço oração pela cirurgia da minha avó na sexta';

// ---------- o servidor e o navegador ----------
const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-estudo-celula-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_TESTE: '1' },
  stdio: 'ignore',
});
const perfil = mkdtempSync(join(tmpdir(), 'cc-estudo-celula-nav-'));
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
const aux = await criar('aux', 'Paulo', { celula: token });
const ana = await criar('ana', 'Ana', { celula: token });
const vera = await criar('vera', 'Vera');
await pedir('api/celula', { acao: 'entrar', token, visitante: true }, vera);
ok((await pedir('api/celula', { acao: 'auxiliar', id: ID, usuario: 'aux', sim: true }, lider)).status === 200, 'o Paulo é auxiliar da célula');
await pedir('api/celula', { acao: 'encontro', id: ID, dia: 4 }, lider);
ok((await pedir('api/cuidado', { acao: 'criar', celula: ID, tipo: 'oracao', destino: 'celula', texto: PEDIDO, dias: 7 }, ana)).status === 200, 'a Ana deixou um pedido de oração na célula');

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
const av = async (e) => {
  const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) console.log('  (erro na expressão: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text || '').slice(0, 200) + ')');
  return r.result?.value;
};
// Uma função de verdade, rodada na página com os argumentos (serializados em JSON).
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
// O app troca espaços por espaços que não quebram ("Efésios 6", "Tópico 4") e põe um "word joiner"
// depois do hífen ("24-26"): o texto lido da tela volta ao comum antes de comparar.
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
// a janela sem interface não tem foco: sem isto, focar o campo não dispara "focus" (a barra de marcas)
await cmd('Emulation.setFocusEmulationEnabled', { enabled: true });
await cmd('Page.bringToFront');
await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
// sem a abertura, sem o convite de notificações e sem o tutorial de instalar por cima da tela
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });

// Entra como uma conta (cookie novo, armazenamento limpo) e abre a rota.
async function como(cookie, rota) {
  await cmd('Page.navigate', { url: base + 'privacidade.html' });
  await esperar('document.readyState === "complete"');
  await av('localStorage.clear(); sessionStorage.clear(); true');
  await cmd('Network.clearBrowserCookies');
  const [nome, ...resto] = cookie.split('=');
  await cmd('Network.setCookie', { name: nome, value: resto.join('='), url: base });
  await cmd('Page.navigate', { url: base + rota });
  await esperar('!!window.CC && !!document.querySelector("#conteudo") && !!document.querySelector(".folha-juntos, .painel-celula")', 15000);
}
const rota = (aba) => '#/novidades/celula/' + ID + (aba ? '/' + aba : '');
const abrir = async (r, pronto) => { await av('location.hash = ' + JSON.stringify(r)); return esperar(pronto, 15000); };
const tema = (escuro) => av('CC.guardarTema(' + (escuro ? 'true' : 'false') + '); true');

// Captura com o nome do quadro do mock. inteira: a página toda (ou a tela cheia, ou a folha);
// comAviso: deixa o aviso flutuante (o "Estudo salvo" do quadro 9), que nas outras some antes.
async function foto(nome, inteira, comAviso) {
  if (!FOTOS) return;
  await dormir(350);
  if (!comAviso) await av('document.getElementById("aviso-flutuante")?.remove(); true');
  let h = larguras[largura];
  if (inteira) {
    h = await na(() => {
      const tela = document.querySelector('.tela-cheia');
      if (tela) return Math.ceil(tela.querySelector('.tela-cheia-palco').scrollHeight + tela.querySelector('.tela-cheia-pe').offsetHeight);
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

// Quando algo falha: o endereço, o passo, o que está aberto por cima e uma captura (com FOTOS).
async function diagnostico(nome) {
  const d = await na(() => ({ hash: location.hash, passo: (document.querySelector('.mesa-passo') || {}).textContent || '', cortinas: document.querySelectorAll('.cortina').length,
    telas: document.querySelectorAll('.tela-cheia').length, aviso: (document.getElementById('aviso-flutuante') || {}).textContent || '', erro: (document.querySelector('[data-erro]') || {}).textContent || '' }));
  console.log('    (diagnóstico ' + nome + ': ' + JSON.stringify(d) + ')');
  if (FOTOS) { const r = await cmd('Page.captureScreenshot', { format: 'png' }); if (r.data) writeFileSync(join(FOTOS, 'diag-' + nome + '.png'), Buffer.from(r.data, 'base64')); }
}

// Medidas de tela: sem rolagem lateral, todo botão e link visível com 44 px ou mais na menor medida
// e nenhuma letra abaixo de 12 px (dentro do conteúdo, da folha, da tela cheia e da barra de marcas).
async function medidas(rotulo) {
  const m = await na(() => {
    const raizes = [...document.querySelectorAll('.tela-cheia, .cortina .folha')];
    if (!raizes.length) raizes.push(document.querySelector('#conteudo'));
    const barra = document.querySelector('.mesa-barra-marcas:not([hidden])');
    if (barra) raizes.push(barra);
    const visivel = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const pequenos = [];
    const letras = [];
    for (const raiz of raizes) {
      for (const el of raiz.querySelectorAll('button, a[href], select, textarea, input:not([type="checkbox"]), [role="radio"], .mesa-pergunta label')) {
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
async function emTodosOsTamanhos(rotulo, preparar) {
  if (process.env.RAPIDO) return;
  for (const w of [390, 360]) {
    for (const escuro of [false, true]) {
      await tamanho(w);
      await tema(escuro);
      if (preparar) await preparar();
      await dormir(250);
      await medidas(rotulo + ' a ' + w + ' px, ' + (escuro ? 'escuro' : 'claro'));
    }
  }
  await tamanho(390);
  await tema(false);
}

console.log('\n  O estudo da célula (À Mesa)\n');

// ---------- 1. A aba Estudo vazia ----------
await como(lider, rota('estudo'));
ok(await esperar(existe('.painel-celula [data-preparar]')), '1. o líder vê "Preparar o estudo" na aba vazia');
await foto('00a-sem-estudo-lider');
for (const [cookie, nome] of [[aux, 'o auxiliar'], [ana, 'a Ana']]) {
  await como(cookie, rota('estudo'));
  ok(await esperar(existe('.painel-celula [data-leitura-semana]')) && await av('!' + q('[data-preparar]')),
    '1. ' + nome + ' não tem "Preparar", e tem "Ler a leitura da semana"');
  if (cookie === aux) {
    ok(await av(existe('[data-aba="painel"]')), '1. o auxiliar continua com a aba Painel');
    await foto('00b-sem-estudo-auxiliar');
  }
}
await como(aux, rota('preparar'));
ok(await esperar('/\\/estudo$/.test(location.hash)'), '1. o auxiliar que abre o endereço do preparo volta para a aba Estudo');

// ---------- 2. Abrir o preparo ----------
await como(lider, rota('estudo'));
await esperar(existe('[data-preparar]'));
await clicar('[data-preparar]');
ok(await esperar('/\\/preparar$/.test(location.hash) && !!document.querySelector(".mesa-preparo [data-fonte]")', 15000), '2. "Preparar" leva a …/preparar');
ok(await av('document.body.classList.contains("sem-barra") && getComputedStyle(document.querySelector(".navegacao")).display === "none"'), '2. a barra de abas some no preparo');
ok(/Passo 1 de 3/.test(await texto('.mesa-passo')), '2. aparece "Passo 1 de 3"');
await foto('01a-preparar-escolher');
await emTodosOsTamanhos('passo 1 vazio');

// ---------- 3. Colar do Word ----------
await na((html, plano) => {
  const campo = document.querySelector('[data-fonte]');
  campo.focus();
  const dt = new DataTransfer();
  dt.setData('text/html', html);
  dt.setData('text/plain', plano);
  campo.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  return true;
}, HTML_WORD, LINHAS_DONO.join('\n'));
await dormir(300);
const colado = await av(q('[data-fonte]') + '.value');
const linhasColadas = colado.split('\n');
ok(linhasColadas.length === 42 && RESUMO.every((i) => linhasColadas[i] === '*' + LINHAS_DONO[i] + '*') && linhasColadas.filter((l, i) => !RESUMO.includes(i)).every((l, i) => l === LINHAS_DONO.filter((x, k) => !RESUMO.includes(k))[i]),
  '3. colado do Word: as 42 linhas, e as 6 do resumo em asteriscos');
ok(/Estudo colado/.test(await texto('.mesa-escolhido')) && await av('!' + q('.mesa-opcoes')), '3. a escolha recolhe em "Estudo colado · Trocar"');
{
  // o marcador que o Word desenha na lista (Symbol, Courier e Wingdings, no span mso-list:Ignore)
  // e o texto que vem num <pre> ou num white-space: pre-wrap
  const colagens = await na(() => {
    const t = CC.estudoPreparo.textoDoHtml;
    const item = (fonte, marca, texto) => '<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1"><!--[if !supportLists]--><span style="font-family:' + fonte + ';mso-list:Ignore">' + marca
      + '<span style="font:7.0pt &quot;Times New Roman&quot;">&nbsp;&nbsp;&nbsp;</span></span><!--[endif]-->' + texto + '</p>';
    return {
      word: t(item('Symbol', '\u00b7', 'Efésios 6:12') + item('&quot;Courier New&quot;', 'o', 'Um subitem') + item('Wingdings', 'n', 'Cinturão da verdade \u2192 viver na verdade.')),
      pre: t('<pre>Estudo: Teste\nEfésios 6:12\n1. Um tópico</pre>'),
      prewrap: t('<div><span style="white-space: pre-wrap">Estudo: Teste\nEfésios 6:12</span></div>'),
      comum: t('<p>Uma linha\nque quebra no HTML</p>'),
    };
  });
  ok(colagens.word === 'Efésios 6:12\nUm subitem\nCinturão da verdade \u2192 viver na verdade.', '3. colar uma lista do Word deixa o marcador (Symbol, Courier, Wingdings) de fora (' + JSON.stringify(colagens.word) + ')');
  ok(colagens.pre === 'Estudo: Teste\nEfésios 6:12\n1. Um tópico' && colagens.prewrap === 'Estudo: Teste\nEfésios 6:12' && colagens.comum === 'Uma linha que quebra no HTML',
    '3. dentro de <pre> e de white-space: pre-wrap, cada quebra continua sendo uma linha; fora deles, não');
}

// ---------- 4. A barra de marcas ----------
await na(() => { document.querySelector('[data-fonte]').blur(); document.querySelector('[data-fonte]').focus(); return true; });
ok(await esperar('!' + q('.mesa-barra-marcas') + '.hidden', 3000) || (await diagnostico('barra'), false), '4. com o campo em foco, a barra de marcas aparece');
ok(await av(q('.mesa-barra-marcas') + '.getAttribute("role") === "toolbar" && [...document.querySelectorAll(".mesa-marca")].every((b) => b.getAttribute("aria-label").length > 10)'), '4. a barra é uma toolbar, e cada marca diz o que escreve');
await na(() => { const c = document.querySelector('[data-fonte]'); c.focus(); c.setSelectionRange(c.value.length, c.value.length); return true; });
await clicar('[data-marca="guardar"]');
const comGuardar = (await av(q('[data-fonte]') + '.value')).split('\n');
ok(comGuardar[41] === 'Para guardar: ' + LINHAS_DONO[41] && comGuardar.length === 42, '4. "Para guardar" escreve "Para guardar: " no começo da última linha');
await na(() => { const c = document.querySelector('[data-fonte]'); c.focus(); c.setSelectionRange(c.value.length, c.value.length); window.scrollTo(0, document.documentElement.scrollHeight); return true; });
await foto('01c-preparar-marcas');
await medidas('a barra de marcas a 390 px');
await na(() => { document.activeElement.blur(); window.scrollTo(0, 0); return true; });
await dormir(300);
ok(await av(q('.mesa-barra-marcas') + '.hidden'), '4. sem o foco, a barra some');
await foto('01b-preparar-colado', true);
await emTodosOsTamanhos('passo 1 com o texto colado');

// ---------- 5. Rascunho e saída ----------
await cmd('Page.reload');
ok(await esperar('!!document.querySelector("[data-fonte]") && document.querySelector("[data-fonte]").value.split("\\n").length === 42', 15000), '5. recarregar a página mantém o texto (rascunho no celular)');
await clicar('.mesa-cabeca [data-voltar]');
ok(await esperar('/\\/estudo$/.test(location.hash) && !!document.querySelector("[data-preparar]") && !document.body.classList.contains("sem-barra")') && !(await av('!!document.querySelector(".cortina")')),
  '5. o voltar do topo sai direto para a aba Estudo, com a barra de abas, sem perguntar (o rascunho já está guardado)');
ok(await av('!!localStorage.getItem("cc.rascunho.estudo.' + ID + '")'), '5. o rascunho fica no celular');
await clicar('[data-preparar]');
ok(await esperar('!!document.querySelector("[data-fonte]") && document.querySelector("[data-fonte]").value.startsWith("Estudo: Batalha")', 15000), '5. de volta ao preparo, o texto continua lá');

// ---------- 6. Passo 2: Confira as partes ----------
await clicar('[data-ver]');
const cartoesNaTela = () => na(() => [...document.querySelectorAll('.mesa-parte .cartao-versiculo')].filter((f) => !f.closest('.mesa-sugestao'))
  .map((f) => ({ ref: f.dataset.ref, texto: (f.querySelector('blockquote') || {}).textContent || '', origem: ((f.closest('.mesa-com-origem') || {}).querySelector ? f.closest('.mesa-com-origem').querySelector('.mesa-origem').textContent : '') })))
  .then((l) => (l || []).map((c) => ({ ref: c.ref, texto: c.texto, origem: comum(c.origem) })));
ok(await esperar('document.querySelectorAll(".mesa-parte .mesa-com-origem .cartao-versiculo blockquote").length === 5', 20000) && /Passo 2 de 3/.test(await texto('.mesa-passo')), '6. o passo 2 mostra os 5 cartões');
ok(/4 citações/.test(await texto('.mesa-aviso')), '6. o aviso diz que 4 citações foram trocadas');
let cartoes = await cartoesNaTela();
ok(JSON.stringify(cartoes.map((c) => c.ref)) === JSON.stringify(SEM_LUCAS) && cartoes.every((c) => c.texto === textoDe(NBV, c.ref)), '6. os 5 cartões têm o texto da NBV, palavra por palavra (nbv.json)');
const origemDe = (ref) => (cartoes.find((c) => c.ref === ref) || {}).origem || '';
ok(/citação da NVI\. Agora na NBV\./.test(origemDe('Efésios 6.12')) && /citação de outra tradução\. Agora na NBV\./.test(origemDe('1 Pedro 5.8'))
  && /só a referência\. Agora com o texto da NBV\./.test(origemDe('Efésios 6.13-17')) && /citação de outra tradução/.test(origemDe('Efésios 6.10')),
  '6. a linha de origem de cada cartão diz o que havia no texto');
ok(await av('document.querySelectorAll(".mesa-sugestao").length === 1 && /Lucas.11\\.24-26/.test(' + q('.mesa-sugestao') + '.textContent.replace(/\\u2060/g, "")) && !document.querySelector(".mesa-sugestao [aria-pressed=true]")'), '6. a sugestão de Lucas 11.24-26 espera a escolha, sem nada escolhido');
await foto('02-previa', true);
await tema(true);
await foto('escuro-02-previa', true);
await tema(false);
await clicar('[data-mostrar]');
ok(await esperar('document.querySelectorAll(".mesa-parte .mesa-com-origem .cartao-versiculo blockquote").length === 6 && !document.querySelector(".mesa-sugestao")', 15000), '6. "Mostrar o cartão" leva a 6 cartões');
cartoes = await cartoesNaTela();
ok(JSON.stringify(cartoes.map((c) => c.ref)) === JSON.stringify(CARTOES) && cartoes.every((c) => c.texto === textoDe(NBV, c.ref)) && /só a referência/.test(origemDe('Lucas 11.24-26')),
  '6. Lucas entra como segundo cartão, com o texto da NBV');
ok(/os 6 cartões mudam juntos/.test(await texto('.mesa-bloco')), '6. a frase da tradução conta os 6 cartões de verdade');
await clicar('[data-traducao="blivre"]');
ok(await esperar('document.querySelector("[data-traducao=\\"blivre\\"]")?.getAttribute("aria-pressed") === "true" && document.querySelectorAll(".mesa-parte .cartao-versiculo blockquote").length === 6', 20000), '6. a Bíblia Livre troca a tradução do estudo');
cartoes = await cartoesNaTela();
ok(cartoes.length === 6 && cartoes.every((c) => c.texto === textoDe(BLIVRE, c.ref)) && cartoes.every((c) => /Agora na Bíblia Livre|texto da Bíblia Livre/.test(c.origem)), '6. os 6 cartões trocam para o texto de blivre.json');
await clicar('[data-traducao="nbv"]');
ok(await esperar('document.querySelector("[data-traducao=\\"nbv\\"]")?.getAttribute("aria-pressed") === "true" && document.querySelectorAll(".mesa-parte .cartao-versiculo blockquote").length === 6', 15000), '6. e "NBV" volta');
cartoes = await cartoesNaTela();
ok(cartoes.every((c) => c.texto === textoDe(NBV, c.ref)), '6. de volta à NBV, palavra por palavra');

// ---------- 7. "Mudar" no Título ----------
await clicar('[data-mudar-parte="0"]');
ok(await esperar('!!document.querySelector(".cortina [data-trecho]")') && (await av(q('.cortina [data-trecho]') + '.value')) === LINHAS_DONO[0], '7. "Mudar" no Título abre a linha do título');
await av(q('.cortina [data-trecho]') + '.value = "Estudo: Vigilância e Armadura de Deus"; true');
await av('document.querySelector(".cortina").click(); true');
await dormir(300);
ok(await av('!!document.querySelector(".cortina [data-trecho]") && document.querySelector(".cortina [data-trecho]").value === "Estudo: Vigilância e Armadura de Deus"'), '7. tocar fora da folha "Mudar" não fecha nem perde o que foi escrito');
await clicar('.cortina [data-pronto]');
await esperar('!document.querySelector(".cortina")');
ok(await esperar('/Vigilância e Armadura de Deus/.test(document.querySelector(".mesa-parte .mesa-t1")?.textContent || "")', 15000)
  && JSON.parse(await av('localStorage.getItem("cc.rascunho.estudo.' + ID + '")')).fonte.split('\n')[0] === 'Estudo: Vigilância e Armadura de Deus', '7. o título muda, e o rascunho acompanha');
await clicar('[data-mudar-parte="0"]');
await esperar('!!document.querySelector(".cortina [data-trecho]")');
await av(q('.cortina [data-trecho]') + '.value = ' + JSON.stringify(LINHAS_DONO[0]) + '; true');
await clicar('.cortina [data-pronto]');
await esperar('!document.querySelector(".cortina")');
await esperar('/Batalha espiritual, vigilância/.test(document.querySelector(".mesa-parte .mesa-t1")?.textContent || "")', 15000);
await emTodosOsTamanhos('passo 2');

// ---------- 8. Passo 3: Para conversar ----------
await clicar('[data-continuar]');
ok(await esperar('document.querySelectorAll(".mesa-grupo").length >= 2', 15000), '8. o passo 3 abre');
const grupos = (await av('[...document.querySelectorAll(".mesa-grupo > header b")].map((b) => b.textContent)')).map(comum);
ok(JSON.stringify(grupos) === JSON.stringify(['Da reflexão do dia 244', 'Do método OIA']), '8. os grupos são "Da reflexão do dia 244" e "Do método OIA" (' + grupos.join(', ') + ')');
const marcadas = async () => (await av('[...document.querySelectorAll(".mesa-pergunta.marcada .texto")].map((t) => t.textContent)')).map(comum);
ok(JSON.stringify(await marcadas()) === JSON.stringify([REFLEXAO_244.perguntas[0], OIA_APLICACAO]), '8. vêm marcadas a primeira da reflexão e a de aplicação do OIA');
// "Mudar" numa pergunta: edita no lugar, e "Desfazer" volta
await na(() => { document.querySelectorAll('[data-mudar-q]')[1].click(); return true; });
ok(await esperar(existe('.mesa-pergunta.editando [data-texto-q]')), '8. "Mudar" abre a pergunta para editar, com "Pronto" e "Desfazer"');
await foto('03-conversar', true);
await av(q('[data-texto-q]') + '.value = "Outra pergunta"; true');
await clicar('[data-desfazer-q]');
ok(await esperar('!document.querySelector(".mesa-pergunta.editando") && document.querySelectorAll(".mesa-pergunta .texto")[1].textContent === ' + JSON.stringify(REFLEXAO_244.perguntas[1])), '8. "Desfazer" devolve o texto da reflexão');
// marca até 6 (com 2 perguntas novas) e tenta a 7ª
for (const t of ['Pergunta nova um?', 'Pergunta nova dois?']) {
  await av(q('[data-nova]') + '.value = ' + JSON.stringify(t) + '; true');
  await clicar('[data-por]');
  await esperar('[...document.querySelectorAll(".mesa-pergunta .texto")].some((x) => x.textContent === ' + JSON.stringify(t) + ')');
}
ok((await marcadas()).length === 4 && /4 perguntas escolhidas/.test(await texto('[data-conta]')), '8. "Pôr na lista" acrescenta a pergunta, já marcada');
const desmarcadas = async () => av('[...document.querySelectorAll(".mesa-pergunta:not(.marcada) input")].map((i) => i.id)');
for (const id of (await desmarcadas()).slice(0, 2)) await clicar('#' + id);
ok((await marcadas()).length === 6, '8. seis marcadas');
const setima = (await desmarcadas())[0];
await clicar('#' + setima);
ok((await marcadas()).length === 6 && await av('!document.getElementById(' + JSON.stringify(setima) + ').checked') && /até 6/.test(await texto('#aviso-flutuante')), '8. a 7ª é recusada, com "Escolha até 6 perguntas."');
// volta às duas de saída: desmarca as outras
for (const t of await marcadas()) {
  if (t === REFLEXAO_244.perguntas[0] || t === OIA_APLICACAO) continue;
  await na((x) => { const l = [...document.querySelectorAll('.mesa-pergunta.marcada')].find((m) => m.querySelector('.texto').textContent === x); l.querySelector('input').click(); return true; }, t);
}
ok(JSON.stringify(await marcadas()) === JSON.stringify([REFLEXAO_244.perguntas[0], OIA_APLICACAO]) && /2 perguntas escolhidas/.test(await texto('[data-conta]')), '8. de volta às 2 escolhidas');
// os 4 Ws
await clicar('[data-mudar-ws]');
ok(await esperar(existe('.cortina [data-w="acolhida"]')), '8. "Mudar" nos 4 Ws abre os três campos');
await av(q('.cortina [data-w="acolhida"]') + '.value = ' + JSON.stringify(ACOLHIDA) + '; true');
await clicar('.cortina [data-pronto]');
ok(await esperar('!document.querySelector(".cortina") && /' + ACOLHIDA.replace(/\?/g, '\\?') + '/.test(document.querySelector(".mesa-ws dd").textContent)') || (await diagnostico('ws'), false), '8. a acolhida nova aparece no cartão');
ok(await av('(() => { const nota = [...document.querySelectorAll(".mesa-nota")].find((n) => /Ao salvar, a célula vê o estudo na aba Estudo\./.test(n.textContent)); const salvar = document.querySelector("[data-salvar]"); return !!nota && !!(nota.compareDocumentPosition(salvar) & Node.DOCUMENT_POSITION_FOLLOWING); })()'),
  '8. "Ao salvar, a célula vê o estudo na aba Estudo." vem antes de "Salvar o estudo"');
await emTodosOsTamanhos('passo 3');

// ---------- 9. Salvar ----------
await na(() => { window.__fetch = window.fetch; window.fetch = (u, o) => (/api\/celula/.test(String(u)) ? Promise.reject(new TypeError('Failed to fetch')) : window.__fetch(u, o)); return true; });
await clicar('[data-salvar]');
ok(await esperar('/Sem conexão\. Tente de novo\./.test(document.querySelector("[data-erro]")?.textContent || "")') && /\/preparar$/.test(await av('location.hash')),
  '9. sem internet, salvar diz "Sem conexão. Tente de novo." (e não "Failed to fetch")');
await na(() => { window.fetch = window.__fetch; return true; });
await clicar('[data-salvar]');
ok(await esperar('/\\/estudo$/.test(location.hash) && !!document.querySelector(".mesa-lider")', 20000), '9. salvar volta à aba Estudo, com o cartão do líder');
ok(/Estudo salvo/.test(await texto('#aviso-flutuante')) && !/fica guardado/.test(await texto('#aviso-flutuante')) && /Você preparou este estudo/.test(await texto('.mesa-lider')), '9. com o aviso "Estudo salvo" e "Você preparou este estudo"');
await foto('04a-estudo-lider', false, true);
const salvo = (await celulaDe(lider, ID)).estudo;
ok(salvo && salvo.tipo === 'blocos' && JSON.stringify(salvo.refs) === JSON.stringify(CARTOES) && salvo.traducao === 'nbv' && JSON.stringify(salvo.perguntas) === JSON.stringify([REFLEXAO_244.perguntas[0], OIA_APLICACAO]),
  '9. o servidor guardou os 6 cartões, a NBV e as 2 perguntas');
ok(!/A nossa luta/.test(salvo.fonte) && salvo.blocos.filter((b) => b.t === 'seta')[1].destaque === true, '9. a fonte gravada não traz a citação da NVI, e o resumo ficou em destaque');
ok((await celulaDe(lider, ID)).estudoAcolhida === ACOLHIDA, '9. a acolhida mudada foi gravada');
for (const [cookie, nome] of [[aux, 'o auxiliar'], [ana, 'a Ana']]) {
  const r = await pedir('api/celula', { acao: 'estudo', id: ID, estudo: 'blocos', fonte: LINHAS_DONO.join('\n'), base: salvo.id }, cookie);
  ok(r.status === 403, '9. ' + nome + ' recebe 403 se tentar salvar o estudo');
}

// ---------- 10. A aba da Ana ----------
await como(ana, rota('estudo'));
ok(await esperar('document.querySelectorAll(".painel-celula .mesa-estudo .cartao-versiculo blockquote").length === 6', 20000), '10. a Ana vê o estudo com os 6 cartões');
ok(/preparado por Marcos/.test(await texto('.painel-celula > .passo-dica')) && await av('!' + q('.mesa-lider') + ' && !' + q('[data-mudar]')), '10. "preparado por Marcos", sem o cartão do líder');
const dias = (await av('[...document.querySelectorAll(".mesa-dia")].map((a) => a.getAttribute("href") + " " + a.querySelector("b").textContent)')).map(comum);
ok(JSON.stringify(dias) === JSON.stringify(['#/dia/244 Efésios 6 é o dia 244', '#/dia/77 Lucas 11 é o dia 77']), '10. "No plano" com os dias 244 e 77');
ok(await av('!document.querySelector(".mesa-dia .leu")'), '10. sem ter lido, nada de "Você leu em"');
await av('CC.marcarLido(244, true); true');
await abrir(rota('hoje'), existe('.painel-celula'));
await abrir(rota('estudo'), existe('.mesa-dia'));
ok(await esperar('/^Você leu em \\d{2}\\/\\d{2}$/.test(document.querySelector(".mesa-dia .leu")?.textContent || "")'), '10. depois de ler o dia 244, "Você leu em" aparece no aparelho dela, sem "só você vê"');
ok(await av('!/\\d+ de \\d+/.test(document.querySelector(".painel-celula").textContent)'), '10. nenhuma contagem "N de M" na aba');
await na(() => { window.__copiado = null; CC.copiar = async (t) => { window.__copiado = t; return true; }; return true; });
await na(() => { document.querySelectorAll('.painel-celula .mesa-mais')[1].click(); return true; });
ok(await esperar('document.querySelectorAll(".painel-celula .cartao-versiculo")[1].querySelector(".acoes-verso.no-cartao") !== null && document.querySelectorAll(".acoes-verso.no-cartao").length === 1'), '10. os três pontos do segundo cartão abrem a barra dele, e só dele');
ok(await av('document.querySelectorAll(".painel-celula .mesa-mais")[1].getAttribute("aria-expanded") === "true" && document.querySelectorAll(".painel-celula .mesa-mais")[1].getAttribute("aria-label") === "Ações de Lucas 11.24-26"'), '10. o botão diz "Ações de Lucas 11.24-26" e fica expandido');
await na(() => { document.querySelectorAll('.painel-celula .cartao-versiculo')[1].querySelector('[data-copiar-verso]').click(); return true; });
ok(await esperar('window.__copiado !== null'), '10. "Copiar" responde');
ok((await av('window.__copiado')) === '\u201c' + textoDe(NBV, 'Lucas 11.24-26') + '\u201d Lucas 11.24-26 (NBV)', '10. "Copiar" copia o texto desse cartão, com a tradução do estudo');
await na(() => { document.querySelectorAll('.painel-celula .mesa-mais')[1].click(); return true; });
await dormir(200);
await foto('04b-estudo-membro', true);
await emTodosOsTamanhos('a aba Estudo da Ana');

// ---------- 11. Mandar no grupo ----------
await na(() => { window.__compartilhado = null; CC.compartilhar = async (t) => { window.__compartilhado = t; return 'compartilhado'; }; return true; });
await clicar('[data-compartilhar]');
ok(await esperar(existe('.cortina .mesa-zap')), '11. "Mandar no grupo" abre a prévia');
ok(await av('!/Versão curta|Estudo inteiro/.test(document.querySelector(".cortina .folha").textContent)'), '11. sem "Versão curta": vai sempre o estudo inteiro');
for (const w of [390, 360]) {
  await tamanho(w);
  await dormir(300);
  const pe = await na(() => {
    const folha = document.querySelector('.cortina .folha');
    folha.scrollTop = 0;
    const f = folha.getBoundingClientRect();
    const b = folha.querySelector('[data-mandar]').getBoundingClientRect();
    // e nada do texto rola por baixo da barra: o que está no pé da folha é a própria barra
    const pe = document.elementFromPoint(f.left + f.width / 2, f.bottom - 3);
    return { altura: folha.scrollHeight, visivel: Math.round(f.height), dentro: b.top >= f.top && b.bottom <= f.bottom && b.bottom <= innerHeight, rente: !!(pe && pe.closest('.acoes')) };
  });
  ok(pe.dentro && pe.rente && pe.altura > pe.visivel, '11. a ' + w + ' px, "Mandar" fica à vista no pé da folha desde o começo, sem texto por baixo (prévia de ' + pe.altura + ' px numa folha de ' + pe.visivel + ')');
}
await tamanho(390);
const dataDoEncontro = await na(() => {
  const nomes = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  for (let i = 0; i < 7; i++) { const d = CC.somaDias(CC.hojeIso(), i); if (new Date(d + 'T12:00:00').getDay() === 4) return 'quinta, ' + d.slice(8, 10) + '/' + d.slice(5, 7); }
  return nomes[0];
});
const esperado = readFileSync(join(AQUI, 'ferramentas', 'estudo-exemplo-grupo.txt'), 'utf8')
  .replace('{{DATA}}', dataDoEncontro).replace('{{NBV Efésios 6.12}}', textoDe(NBV, 'Efésios 6.12')).replace('{{ENDERECO}}', base.replace(/\/$/, ''));
await foto('05b-whatsapp-tela');
await foto('05-whatsapp', true);
await medidas('a folha "Mandar no grupo" a 390 px');
await clicar('.cortina [data-mandar]');
ok(await esperar('window.__compartilhado !== null'), '11. "Mandar" chama o compartilhar do celular');
const mandado = await av('window.__compartilhado');
ok(mandado === esperado, '11. o texto mandado é o estudo inteiro, formatado como no mock (ferramentas/estudo-exemplo-grupo.txt)');
if (mandado !== esperado) {
  const a = String(mandado).split('\n');
  const b = esperado.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { console.log('    linha ' + (i + 1) + ':\n      veio     ' + JSON.stringify(a[i]) + '\n      esperado ' + JSON.stringify(b[i])); break; }
}
await clicar('.cortina [data-fechar]');
await esperar('!document.querySelector(".cortina")');

// ---------- 12. O modo encontro da Ana ----------
const ETIQUETAS = ['Acolhida', 'Adoração', 'Abertura', 'Tópico 1', 'Tópico 2', 'Tópico 3', 'Tópico 4, parte 1 de 2', 'Tópico 4, parte 2 de 2', 'Tópico 5', 'Conclusão',
  'Para conversar, 1 de 2', 'Para conversar, 2 de 2', 'Orar juntos', 'Testemunho', 'Fechar o encontro'];
const etiqueta = () => texto('.tela-cheia .mesa-topo .etiqueta');
const passo = () => texto('.tela-cheia [data-indice]');
const proximo = async () => { const antes = await passo(); await clicar('.tela-cheia [data-proximo]'); await esperar('document.querySelector(".tela-cheia [data-indice]")?.textContent !== ' + JSON.stringify(antes)); };
async function percorrer(guardar) {
  const vistos = [];
  for (let i = 0; i < 15; i++) {
    vistos.push({ etiqueta: await etiqueta(), indice: await passo(), texto: await texto('.tela-cheia .tela-cheia-palco'), cartoes: await av('document.querySelectorAll(".tela-cheia .cartao-versiculo").length') });
    if (guardar) await guardar(i + 1);
    if (i < 14) await proximo();
  }
  return vistos;
}
await clicar('[data-modo-encontro]');
ok(await esperar(existe('.tela-cheia .mesa-topo'), 15000), '12. o modo encontro abre');
const vistos = await percorrer(async (n) => {
  if (n === 3) {
    await foto('06a-encontro-3', true);
    await tema(true);
    await dormir(500);
    // no escuro, "Abrir Efésios 6 na Bíblia" precisa parecer botão: fundo diferente do da folha do alto
    const cores = await na(() => { const b = document.querySelector('.tela-cheia .mesa-abrir'); return { botao: getComputedStyle(b).backgroundColor, folha: getComputedStyle(b.closest('.mesa-topo')).backgroundColor, tinta: getComputedStyle(b).color }; });
    ok(cores.botao !== cores.folha && cores.botao !== cores.tinta, '12. no escuro, "Abrir Efésios 6 na Bíblia" tem fundo próprio, diferente do da folha (' + cores.botao + ' sobre ' + cores.folha + ')');
    await foto('escuro-06a-encontro-3');
    await tema(false);
  }
  if (n === 7) { await foto('06b-encontro-7'); await tema(true); await foto('escuro-06b-encontro-7', true); await tema(false); }
  if (n === 11) await foto('06c-encontro-11');
  if (n === 13) await foto('06d-encontro-13', true);
  if ([3, 7, 13].includes(n)) await emTodosOsTamanhos('o passo ' + n + ' do encontro');
});
ok(JSON.stringify(vistos.map((v) => v.etiqueta)) === JSON.stringify(ETIQUETAS) && vistos[14].indice === '15 de 15', '12. 15 passos, com as etiquetas do mock');
ok(vistos.every((v) => !v.texto.includes(PEDIDO)), '12. o pedido de oração da Ana não aparece em passo nenhum');
ok(vistos[12].cartoes === 0 && /Os pedidos estão na aba Oração\./.test(vistos[12].texto), '12. Orar juntos convida para a aba Oração, sem versículo');
ok(vistos[7].texto.includes('Tópico 4, parte 2 de 2') && /^Tópico 4, parte 2 de 2A Armadura de DeusE Paulo acrescenta algo fundamental:/.test(vistos[7].texto), '12. "Tópico 4, parte 2 de 2" começa por "E Paulo acrescenta algo fundamental:"');
ok(vistos.slice(2, 10).every((v) => !v.texto.includes(ACOLHIDA) && !v.texto.includes('Escolham juntos uma música')) && vistos.filter((v) => v.texto.includes('Não basta limpar a casa')).length === 1 && vistos[14].texto.includes('Não basta limpar a casa'),
  '12. a Palavra não repete os 4 Ws, e "Para guardar" só aparece no último passo');
ok(!/reler durante a semana/.test(vistos[14].texto) && await av('!' + q('.tela-cheia [data-registrar]')), '12. o último passo da Ana: sem explicar onde o estudo fica e sem "Registrar quem veio"');
ok(await av('!' + q('.tela-cheia [data-proximo]') + '.hidden === false && !' + q('.tela-cheia [data-concluir]') + '.hidden && ' + q('.tela-cheia [data-fechar]') + '.hidden'), '12. no último passo, "Concluir" no lugar de "Próximo", e sem "Sair do modo encontro"');
await clicar('.tela-cheia [data-concluir]');
ok(await esperar('!document.querySelector(".tela-cheia")'), '12. "Concluir" sai do modo encontro');
await clicar('[data-modo-encontro]');
await esperar(existe('.tela-cheia .mesa-topo'), 15000);
await proximo();
await proximo();
ok((await etiqueta()) === 'Abertura' && /Abrir Efésios.6 na Bíblia/.test(await texto('.tela-cheia .mesa-abrir')), '12. no passo 3, "Abrir Efésios 6 na Bíblia" logo abaixo do título');
await clicar('.tela-cheia .mesa-abrir');
ok(await esperar('!document.querySelector(".tela-cheia") && decodeURIComponent(location.hash) === "#/biblia/Efésios/6"', 8000), '12. "Abrir Efésios 6 na Bíblia" fecha a tela cheia e abre a Bíblia');
await abrir(rota('estudo'), existe('[data-modo-encontro]'));
await esperar('document.querySelectorAll(".painel-celula .mesa-estudo .cartao-versiculo").length === 6', 15000);
await clicar('[data-modo-encontro]');
ok(await esperar('document.querySelector(".tela-cheia [data-indice]")?.textContent === "3 de 15"', 15000), '12. reabrir o modo encontro volta ao passo 3');
await clicar('.tela-cheia [data-fechar]');
await esperar('!document.querySelector(".tela-cheia")');

// ---------- 13. O modo encontro do auxiliar ----------
await como(aux, rota('estudo'));
await esperar('document.querySelectorAll(".painel-celula .mesa-estudo .cartao-versiculo").length === 6', 20000);
ok(await av('!' + q('.mesa-lider') + ' && !' + q('[data-mudar]')), '13. o auxiliar lê o estudo como membro, sem "Mudar o estudo"');
await clicar('[data-modo-encontro]');
await esperar(existe('.tela-cheia .mesa-topo'), 15000);
for (let i = 0; i < 14; i++) await proximo();
ok((await passo()) === '15 de 15' && await av(existe('.tela-cheia [data-registrar]')), '13. no último passo, o auxiliar tem "Registrar quem veio"');
await como(lider, rota('estudo'));
await esperar('document.querySelectorAll(".painel-celula .mesa-estudo .cartao-versiculo").length === 6', 20000);
await clicar('[data-modo-encontro]');
await esperar(existe('.tela-cheia .mesa-topo'), 15000);
for (let i = 0; i < 14; i++) await proximo();
await foto('06e-encontro-15');
await emTodosOsTamanhos('o último passo do encontro');
await clicar('.tela-cheia [data-registrar]');
// (desde as cartas do baú, concluir o encontro pode abrir a tela cheia da carta nova por cima: o que
// sai é a tela cheia do modo encontro, a que tem .mesa-topo)
ok(await esperar('!document.querySelector(".tela-cheia .mesa-topo") && /Quem foi ao encontro\\?/.test(document.querySelector(".cortina .folha h2")?.textContent || "")'), '13. "Registrar quem veio" fecha a tela cheia e abre "Quem foi ao encontro?"');
await clicar('.cortina [data-fechar]');

// ---------- 14. A visitante ----------
await como(vera, rota('estudo'));
ok(await esperar('document.querySelectorAll(".painel-celula .mesa-estudo .cartao-versiculo").length === 6', 20000), '14. a Vera, que está só conhecendo, vê o estudo');
ok(await av('!document.querySelector(".mesa-dia .leu")'), '14. no aparelho dela, nada de "Você leu em"');
await clicar('[data-modo-encontro]');
await esperar(existe('.tela-cheia .mesa-topo'), 15000);
for (let i = 0; i < 12; i++) await proximo();
ok((await etiqueta()) === 'Orar juntos' && !/aba Oração/.test(await texto('.tela-cheia .tela-cheia-palco')), '14. em Orar juntos, a Vera não ouve falar da aba Oração (ela não tem)');
await clicar('.tela-cheia [data-fechar]');

// ---------- 15 e 16. "Encontro hoje" e tirar o estudo ----------
const hoje = await av('new Date(CC.hojeIso() + "T12:00:00").getDay()');
await pedir('api/celula', { acao: 'encontro', id: ID, dia: hoje }, lider);
await como(ana, rota());
ok(await esperar('/Encontro hoje · veja o estudo/.test(document.querySelector(".painel-celula")?.textContent || "")', 15000), '15. com estudo, a Ana vê "Encontro hoje · veja o estudo"');
await como(lider, rota('estudo'));
await esperar(existe('[data-mudar]'), 15000);
// um rascunho da mesma base, mas de antes de uma gravação feita em outro aparelho, não volta
await av('localStorage.setItem("cc.rascunho.estudo.' + ID + '", JSON.stringify({ v: 1, base: ' + JSON.stringify(salvo.id) + ', baseEm: "2000-01-01T00:00:00.000Z", tipo: "blocos", passo: 1, fonte: "RASCUNHO VELHO", palavra: "", trecho: { livro: "Gênesis", cap: "1", vers: "" }, traducao: "nbv", opcoes: false, modo: "escrever", recusadas: [], perguntas: null, salvas: null, ws: null })); true');
await clicar('[data-mudar]');
ok(await esperar('/\\/preparar$/.test(location.hash) && !!document.querySelector("[data-tirar]")', 15000), '16. "Mudar o estudo" abre o preparo com "Tirar o estudo"');
ok(!(await av(q('[data-fonte]') + '.value')).includes('RASCUNHO VELHO'), '16. o rascunho de antes de uma gravação em outro aparelho não volta: o preparo começa da versão salva');
ok((await av(q('[data-fonte]') + '.value')).includes('Efésios 6.12') && !(await av(q('[data-fonte]') + '.value')).includes('A nossa luta'), '16. o campo traz a fonte gravada, sem a citação da NVI');
await clicar('[data-tirar]');
ok(await esperar('/Tirar o estudo\\?/.test(document.querySelector(".cortina h2")?.textContent || "")'), '16. tirar pede confirmação');
await clicar('.cortina [data-sim]');
ok(await esperar('/\\/estudo$/.test(location.hash) && !!document.querySelector("[data-preparar]")', 15000), '16. a aba volta a ficar vazia');
{
  const db = new DatabaseSync(join(pastaEstado, 'caminho.db'), { readOnly: true });
  try { ok(db.prepare('SELECT count(*) n FROM celula_estudos WHERE proposito = ?').get(ID).n >= 1, '16. a linha do estudo continua no banco'); } finally { db.close(); }
}
await abrir(rota(), existe('.painel-celula'));
ok(await esperar('/Encontro hoje · preparar o estudo/.test(document.querySelector(".painel-celula")?.textContent || "")'), '15. sem estudo, o líder vê "Encontro hoje · preparar o estudo"');
await clicar('[data-ir-preparar]');
ok(await esperar('/\\/preparar$/.test(location.hash)', 8000), '15. e o selo leva ao preparo');
await como(ana, rota());
await esperar(existe('.painel-celula'), 15000);
await dormir(800);
ok(await av('!/Encontro hoje/.test(document.querySelector(".painel-celula").textContent)'), '15. sem estudo, a Ana não vê selo nenhum');

// ---------- 17. O estudo usado num encontro: preparar o próximo ----------
{
  const r = await pedir('api/celula', { acao: 'estudo', id: ID, estudo: 'blocos', fonte: 'Estudo: Vigiar e orar\nEfésios 6:18\nOrem em todo tempo.', base: '' }, lider);
  ok(r.status === 200 && r.dado.estudo && r.dado.estudo.usado === false, '17. o líder salva outro estudo, ainda não usado');
  const hojeIso = await av('CC.hojeIso()');
  ok((await pedir('api/celula', { acao: 'registrarEncontro', id: ID, data: hojeIso, presentes: ['ana'], visitantes: 0 }, lider)).status === 200, '17. e registra o encontro de hoje');
  await como(lider, rota('estudo'));
  ok(await esperar('/Preparar o próximo/.test(document.querySelector(".mesa-lider [data-mudar]")?.textContent || "") && /já foi usado num encontro/.test(document.querySelector(".mesa-lider")?.textContent || "")', 15000),
    '17. o cartão do líder diz que o estudo já foi usado e oferece "Preparar o próximo"');
  await clicar('.mesa-lider [data-mudar]');
  ok(await esperar('/\\/preparar$/.test(location.hash) && !!document.querySelector("[data-fonte]") && document.querySelector("[data-fonte]").value === ""', 15000),
    '17. "Preparar o próximo" abre o preparo em branco (o usado fica guardado na célula)');
}

// ---------- 17b. Um trecho de capítulo curto, a leitura da semana e as perguntas de sempre ----------
{
  // (o preparo em branco do 17 está aberto)
  await clicar('[data-tipo="trecho"]');
  await esperar(existe('[data-livro]'));
  await na(() => { const l = document.querySelector('[data-livro]'); l.value = 'Salmos'; l.dispatchEvent(new Event('change')); const c = document.querySelector('[data-cap]'); c.value = '117'; c.dispatchEvent(new Event('input')); return true; });
  await clicar('[data-ver]');
  ok(await esperar('document.querySelector(".mesa-parte .cartao-versiculo")?.dataset.ref === "Salmos 117.1-2"', 15000) && !/10 primeiros/.test(await texto('.mesa-preparo')),
    '17b. o trecho de Salmos 117 mostra o capítulo inteiro (117.1-2), sem o aviso dos 10 primeiros');
  await clicar('[data-traducao="blivre"]');
  await esperar('document.querySelector("[data-traducao=\\"blivre\\"]")?.getAttribute("aria-pressed") === "true"', 15000);
  await clicar('[data-voltar-texto]');
  await esperar(existe('[data-tipo="semana"]'));
  await clicar('[data-tipo="semana"]');
  await clicar('[data-ver]');
  ok(await esperar('!!document.querySelector(".mesa-parte .cartao-versiculo")', 15000) && await av('document.querySelector(".mesa-parte .cartao-versiculo").dataset.sigla === "nbv"'),
    '17b. a prévia da leitura da semana fica na NBV, como o servidor grava, mesmo com a Bíblia Livre escolhida antes');
  // o estudo da semana de antes (perguntas vazias = as de sempre): "Mudar" abre o passo 3 com as de sempre marcadas
  const r = await pedir('api/celula', { acao: 'estudo', id: ID, estudo: 'semana', fonte: '', perguntas: [], base: '' }, lider);
  ok(r.status === 200 && r.dado.estudo.perguntas.length === 0, '17b. o líder salva a leitura da semana sem escolher perguntas');
  await av('localStorage.removeItem("cc.rascunho.estudo.' + ID + '"); true');
  await como(lider, rota('estudo'));
  await esperar(existe('.mesa-lider [data-mudar]'), 15000);
  await clicar('.mesa-lider [data-mudar]');
  await esperar(existe('[data-ver]'), 15000);
  await clicar('[data-ver]');
  await esperar(existe('[data-continuar]:not([disabled])'), 15000);
  await clicar('[data-continuar]');
  ok(await esperar('document.querySelectorAll(".mesa-pergunta.marcada").length > 0', 15000) && !/Nenhuma pergunta escolhida/.test(await texto('[data-conta]')),
    '17b. "Mudar" na leitura da semana sem perguntas escolhidas abre o passo 3 com as de sempre marcadas');
}

// ---------- 18. sem exceções ----------
const erros = evs.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || 'exceção');
ok(erros.length === 0, 'nenhuma exceção de JavaScript' + (erros[0] ? ': ' + erros[0].slice(0, 200) : ''));

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o estudo da célula funciona do preparo ao encontro\n');
await encerrar();
process.exit(falhas ? 1 : 0);
