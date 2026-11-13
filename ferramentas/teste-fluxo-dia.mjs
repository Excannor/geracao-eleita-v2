// O caminho do dia num Chrome sem interface (avaliação de UX, A1 a A3, e o caminho curto aprovado
// pelo dono): da Trilha ao "Dia lido" em até 4 toques e 4 telas (Trilha, passagem 1, passagem 2,
// Dia lido). Confere também a regra de ler de verdade (o botão do leitor só destrava no fim do
// texto e com o tempo mínimo; o clique do teclado e do leitor de tela basta o tempo), o "Li na
// minha Bíblia" (conta para a chama, sem baú), o baú da semana que não abre com dias de papel e
// mostra os dias que faltam, o contexto recolhível que fica lembrado, o fundo inerte, a revisão
// que não muda a data, o texto que não abre (o papel vem à frente) e o "menos movimento".
// Os toques são de verdade (Input.dispatchMouseEvent, detail 1), não el.click().
// Uso: node ferramentas/teste-fluxo-dia.mjs   (PORTA=<n> troca a porta; CHROME=<caminho>)
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || await portaLivre();
const DEPURACAO = await portaLivre();
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pasta = mkdtempSync(join(tmpdir(), 'cc-fluxo-dia-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json') }, stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const perfil = mkdtempSync(join(tmpdir(), 'cc-fluxo-dia-nav-'));
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

try {
  const ws = new WebSocket(await alvo());
  let seq = 0;
  const pend = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); } });
  await new Promise((r) => ws.addEventListener('open', r));
  const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
  const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  const esperar = async (expr, ms = 10000) => { for (let t = 0; t < ms; t += 120) { if (await av(expr)) return true; await dormir(120); } return false; };
  const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
  const existe = (sel) => '!!' + q(sel);
  let toques = 0;
  const telas = [];
  // um toque de verdade no meio do elemento
  const tocar = async (sel) => {
    const c = await av('(() => { const el = ' + q(sel) + '; if (!el) return null; el.scrollIntoView({ block: "nearest" }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()');
    if (!c) return false;
    for (const type of ['mousePressed', 'mouseReleased']) await cmd('Input.dispatchMouseEvent', { type, x: c.x, y: c.y, button: 'left', clickCount: 1 });
    toques++;
    return true;
  };
  const tela = async () => av('document.querySelector(".licao-dia:not(.saindo) .dia-lido") ? "dia lido" : document.querySelector(".leitor:not(.saindo)") ? "leitor: " + document.querySelector(".leitor-titulo b").textContent'
    + ' : document.querySelector(".licao-dia:not(.saindo)") ? "lição" : document.querySelector("[data-ler-hoje], [data-rever-dia]") ? "trilha" : "?"');
  const anotarTela = async () => { const t = await tela(); if (telas[telas.length - 1] !== t) telas.push(t); };
  const rolarAteOFim = () => av('(() => { const p = document.querySelector(".leitor .licao-palco"); p.scrollTop = p.scrollHeight; p.dispatchEvent(new Event("scroll")); return 1; })()');

  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cmd('Network.enable');
  const conta = await fetch(base + '/api/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: 'joana', nome: 'Joana', senha: 'senha-joana', email: 'joana@teste.com', nascimento: '2008-04-05', consentimento: true }) });
  const [nome, valor] = (conta.headers.get('set-cookie') || '').split(';')[0].split('=');
  await cmd('Network.setCookie', { name: nome, value: valor, url: base });
  await cmd('Network.setCookie', { name: 'cc_logado', value: '1', url: base });

  // ---------- 1. o texto que não abre: "Li na minha Bíblia" vem à frente ----------
  await cmd('Network.setBypassServiceWorker', { bypass: true });
  await cmd('Network.setBlockedURLs', { urls: ['*biblia-*'] });
  await cmd('Page.navigate', { url: base + '/#/' });
  ok(await esperar(existe('[data-ler-hoje]'), 20000), 'a Trilha abre com um botão só para a leitura de hoje, "Ler hoje"');
  ok(!(await av(existe('.cartao-no-hoje button'))) && (await av(q('[data-ler-hoje]') + '.textContent')).includes('cerca de'), 'o cartão do nó de hoje é só informação; o botão diz a passagem e o tempo');
  // a abertura sai e as folhas da partida (consentimento, avisos) ficam de fora deste teste
  await esperar('!document.getElementById("abertura")', 15000);
  await dormir(400);
  await av('document.querySelectorAll(".cortina").forEach((c) => c.remove()); 1');
  await tocar('[data-ler-hoje]');
  ok(await esperar(existe('.leitor [data-papel-leitor]'), 10000), 'sem o texto, o leitor oferece "Li na minha Bíblia" em destaque');
  ok(await av('!' + q('.leitor [data-terminei]') + '.classList.contains("enchendo")'), 'e o botão de baixo só volta (não enche à toa)');
  await av(q('.leitor [data-fechar-leitor]') + '.click(); 1');
  await esperar('!document.querySelector(".leitor:not(.saindo)")');
  await cmd('Network.setBlockedURLs', { urls: [] });
  await cmd('Network.setBypassServiceWorker', { bypass: false });

  // ---------- 2. o caminho do dia: Trilha → passagem 1 → passagem 2 → Dia lido ----------
  await cmd('Page.navigate', { url: base + '/#/' });
  await cmd('Page.reload', { ignoreCache: true });
  ok(await esperar(existe('[data-ler-hoje]'), 20000), 'de volta à Trilha');
  await dormir(1500);
  // a abertura sai e as folhas da partida (consentimento, avisos) ficam de fora deste teste
  await esperar('!document.getElementById("abertura")', 15000);
  await dormir(400);
  await av('document.querySelectorAll(".cortina").forEach((c) => c.remove()); 1');
  // um terço do tempo estimado, encurtado para o teste (o mesmo cálculo, numa escala menor)
  await av('CC.FRACAO_MINIMA_DE_LEITURA = 0.002; 1');
  toques = 0;
  await anotarTela();
  await tocar('[data-ler-hoje]');
  ok(await esperar(existe('.leitor .leitor-verso'), 10000), 'toque 1: "Ler hoje" abre o leitor direto na primeira passagem');
  await anotarTela();
  ok(await av('!!document.querySelector(".leitor .contexto-leitor[open] .onde-estamos")'), 'o contexto do dia (Onde estamos, Enquanto lê, procure) está no alto da primeira passagem');
  ok(await av('!!document.querySelector(".leitor [data-papel-discreto]")'), '"Li na minha Bíblia" discreto logo abaixo do contexto');
  ok(await av('[...document.body.children].filter((x) => x.tagName !== "SCRIPT" && !x.classList.contains("leitor")).every((x) => x.inert)'),
    'o leitor deixa inerte o que está atrás dele (a Trilha, as abas e a lição)');
  ok(await av('document.querySelector(".leitor").contains(document.activeElement)'), 'o foco entra no leitor');
  ok(await av(q('.leitor [data-terminei]') + '.getAttribute("aria-disabled") === "true"'), '"Terminei" começa indisponível');
  await tocar('.leitor [data-terminei]');
  await dormir(400);
  ok((await tela()).startsWith('leitor: Gênesis'), 'tocar antes do fim do texto não faz nada (sem bronca)');
  toques--; // o toque de conferência acima não é do caminho
  ok(await av('/%/.test(' + q('.leitor [data-terminei]') + '.style.getPropertyValue("--enchido"))'), 'o botão vai se enchendo');
  // o contexto recolhido fica lembrado
  await av(q('.leitor .contexto-leitor') + '.open = false; 1');
  await dormir(200);
  await rolarAteOFim();
  ok(await esperar('!' + q('.leitor [data-terminei]') + '.classList.contains("enchendo")', 15000), 'no fim do texto, com o tempo, o botão fica pronto');
  await tocar('.leitor [data-terminei]');
  ok(await esperar('(document.querySelector(".leitor-titulo b") || {}).textContent === "Mateus\u00a01"', 6000), 'toque 2: "Terminei, ler Mateus 1" passa para a segunda passagem');
  await anotarTela();
  ok(await av('!document.querySelector(".leitor .contexto-leitor")'), 'o contexto fica só na primeira passagem');
  // teclado e leitor de tela: basta o tempo (o clique deles tem detail 0), sem rolar
  ok(await esperar(q('.leitor [data-terminei]') + '.getAttribute("aria-disabled") === null', 15000), 'com o tempo cumprido, o leitor de tela já ouve o botão disponível');
  ok(await av(q('.leitor [data-terminei]') + '.classList.contains("enchendo")'), '…enquanto, na tela, ele ainda enche até o fim do texto');
  await av(q('.leitor [data-terminei]') + '.click(); 1');
  await dormir(600); // o leitor sai com a animação dele
  toques++;
  ok(await esperar(existe('.dia-lido'), 10000), 'toque 3: a última passagem conclui o dia e abre "Dia lido" direto');
  await anotarTela();
  ok(await av('/Dia 1 lido/.test(document.querySelector(".dia-lido h1").textContent)'), 'a tela diz "Dia 1 lido", com a chama');
  ok(await av('JSON.stringify(CC.ler("lidos")) === "[1]" && CC.origemDoDia(1) === "app"'), 'o dia 1 conta, com a origem "app"');
  ok(await esperar(existe('.dia-lido .cartao-versiculo .acoes-verso'), 8000), 'o versículo para guardar, com cor, nota e Escrever');
  ok(await av('!!document.querySelector(".dia-lido details[data-cartao=pensar]") && !!document.querySelector(".dia-lido details[data-cartao=orar]") && !document.querySelector(".passos-reflexao")'),
    'Pensar e Orar são dois cartões opcionais, sem os três passos');
  await av('(() => { const d = document.querySelector("details[data-cartao=orar]"); d.open = true; const t = document.querySelector("[data-oracao-inline]"); t.value = "Obrigado, Senhor"; t.dispatchEvent(new Event("input")); return 1; })()');
  ok(await av('CC.registro(1).oracao === "Obrigado, Senhor"'), 'a oração escrita no cartão Orar fica no registro do dia, como antes');
  ok(await av('document.querySelectorAll(".licao-dia .licao-pe button").length === 1'), 'um botão só no pé: "Voltar à trilha"');
  await tocar('.licao-dia [data-voltar-trilha]');
  const voltou = await esperar(existe('[data-rever-dia="1"]'), 8000);
  ok(voltou, 'toque 4: de volta à Trilha, com "Dia 1 lido"');
  await anotarTela();
  ok(toques <= 4, 'da Trilha ao "Dia lido" e de volta: ' + toques + ' toques (no máximo 4)');
  ok(telas.length <= 5 && telas.join(' > ').replace(/[\u00a0\u2060]/g, (c) => (c === '\u00a0' ? ' ' : '')) === 'trilha > leitor: Gênesis 1-3 > leitor: Mateus 1 > dia lido > trilha', 'telas: ' + telas.join(' > '));
  ok(await av('!document.querySelector(".no.atual .face svg") || !document.querySelector(".no.atual").innerHTML.includes("M12 2l")'), 'lido o dia, o nó seguinte descansa');
  ok(await av('/Amanhã · Dia 2/.test((document.querySelector(".cartao-no-hoje") || {}).textContent || "")'), 'o cartão do nó seguinte diz "Amanhã · Dia 2"');

  // ---------- 3. a revisão não muda a data; o contexto fica recolhido ----------
  await av('(() => { CC.estado().marcadoEm[1] = "2026-01-02"; return 1; })()');
  await av('CC.abrirLicao(1); 1');
  ok(await esperar(existe('.licao-dia [data-ler="antigo"]')), 'a lição de um dia lido abre para revisar, com os cartões das passagens');
  ok(await av('!document.querySelector(".licao-dia [data-trilha]") && !/Marcar como lido|Desmarcar/.test(document.querySelector(".licao-dia").textContent)'), 'sem "Marcar como lido" e sem desmarcar');
  await tocar('.licao-dia [data-ler="antigo"]');
  ok(await esperar(existe('.leitor .contexto-leitor:not([open])')), 'o contexto que a pessoa recolheu continua recolhido');
  await av(q('.leitor [data-fechar-leitor]') + '.click(); 1');
  await dormir(400);
  ok(await av('CC.estado().marcadoEm[1] === "2026-01-02"'), 'revisar não muda a data do dia lido');
  await av('location.hash = "#/"; 1');
  await esperar(existe('[data-rever-dia]'));

  // ---------- 4. "Li na minha Bíblia": conta, e a tela do dia lido vem sem baú ----------
  await av('CC.abrirLicao(7); 1');
  ok(await esperar(existe('.licao-dia [data-papel]')), 'a lição de um dia não lido tem "Li na minha Bíblia" discreto');
  ok(await av('/Leia as duas passagens e conclua o dia\\./.test(document.querySelector(".licao-dia .passo-dica").textContent) || !!document.querySelector(".licao-dia .cabeca-licao .passo-dica")'), 'a dica diz o que fazer');
  await tocar('.licao-dia [data-papel]');
  ok(await esperar(existe('.folha-papel [data-papel-sim]')), 'a folha curta pergunta se leu na Bíblia');
  await dormir(500); // a folha termina de subir
  ok(await av('/O dia conta para a sua chama\\. O baú da semana abre com as leituras feitas aqui\\./.test(document.querySelector(".folha-papel").textContent)'), 'e explica o que conta e o que não conta');
  await av('CC.marcarLido(2, "papel"); CC.marcarLido(3, "papel"); CC.marcarLido(4, "app"); CC.marcarLido(5, "app"); CC.marcarLido(6, "app"); 1');
  await tocar('.folha-papel [data-papel-sim]');
  ok(await esperar(existe('.dia-lido')), '"Sim, li" leva direto à tela do dia lido');
  ok(await av('CC.origemDoDia(7) === "papel" && CC.leu(7)'), 'o dia conta, com a origem "papel"');
  ok(await av('!document.querySelector(".dia-lido .bau-do-dia")'), 'sem baú depois de "Li na minha Bíblia"');
  ok(await av('!CC.bauLiberado(7)'), 'com 3 dias de papel na semana, o baú do dia 7 não abre');
  await av(q('.licao-dia [data-voltar-trilha]') + '.click(); 1');
  await esperar(existe('[data-bau="7"]'));
  await dormir(600);
  await tocar('[data-bau="7"]');
  ok(await esperar(existe('.pop-bau [data-ir-dia]')), 'o baú travado diz o que falta, com um atalho para cada dia');
  await dormir(400); // o balão termina de abrir
  ok(await av('/Leia os dias 1 a 7 aqui no app para abrir\\./.test(document.querySelector(".pop-bau").textContent) && [...document.querySelectorAll(".pop-bau [data-ir-dia]")].map((b) => b.dataset.irDia).join() === "2,3,7"'),
    '"Leia os dias 1 a 7 aqui no app para abrir", e os dias 2, 3 e 7');
  ok(await av('document.querySelector(".pop-bau").contains(document.activeElement)'), 'o foco entra no balão');
  await tocar('.pop-bau [data-ir-dia="2"]');
  ok(await esperar('location.hash === "#/dia/2" && !!document.querySelector(".licao-dia")'), 'o atalho abre o dia 2');
  await av('location.hash = "#/"; 1');

  // ---------- 5. menos movimento: o botão parece desligado e depois pronto, sem enchimento ----------
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await av('CC.FRACAO_MINIMA_DE_LEITURA = 1 / 3; CC.lerHoje(8); 1');
  ok(await esperar(existe('.leitor [data-terminei].enchendo')), 'o leitor do dia 8 abre');
  ok(await av('!/gradient/.test(getComputedStyle(' + q('.leitor [data-terminei]') + ').backgroundImage)'), 'com menos movimento, o botão não enche: fica desligado até ficar pronto');
  await cmd('Emulation.setEmulatedMedia', { features: [] });
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
