// A chama que perdoa (R1, docs/fases/r1-chama-que-perdoa.md) num Chrome sem interface, a 390x844.
// R1.1, "dias com a Palavra": o total da vida (app e papel) aparece em destaque na folha de volta
// depois de uma falta (no lugar de qualquer zero), no cartão da chama do Início e na folha da
// chama; ler hoje soma, ler no papel na mesma data não conta duas vezes, e o "Zerar" não o apaga
// (nem no aparelho, nem no servidor).
// Uso: node ferramentas/teste-chama.mjs   (PORTA=<n> troca a porta; CHROME=<caminho>;
// CAPTURAS=<pasta> guarda as capturas, nos temas claro e escuro)
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
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// as datas do aparelho (o app conta pelo dia local)
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const atras = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return iso(d); };

const pasta = mkdtempSync(join(tmpdir(), 'cc-chama-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json') }, stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const perfil = mkdtempSync(join(tmpdir(), 'cc-chama-nav-'));
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

// Uma conta com 4 dias seguidos (6 dias do plano, dois deles no papel) que acabaram há 4 dias: três
// dias em branco passam do escudo, a chama apagou e a falta está dentro da janela da folha de
// volta. O servidor só aceita leitura com até 7 dias de atraso (servidor.mjs, conferirProgresso).
async function contaComFalta(usuario) {
  const r = await fetch(base + '/api/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario, nome: 'Joana', senha: 'senha-' + usuario, email: usuario + '@teste.com', nascimento: '2008-04-05', consentimento: true }) });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  if (!r.ok) throw new Error('não criou a conta: ' + r.status + ' ' + await r.text());
  const marcadoEm = {};
  for (let n = 1; n <= 4; n++) marcadoEm[n] = atras(8 - n);
  marcadoEm[5] = marcadoEm[6] = atras(4);
  const estado = { atualizadoEm: Date.now(), dia: 7, lidos: [1, 2, 3, 4, 5, 6], marcadoEm, origens: { 5: 'papel', 6: 'papel' }, apelido: 'Joana' };
  const p = await fetch(base + '/api/estado', { method: 'PUT', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(estado) });
  if (!p.ok) throw new Error('não gravou o estado: ' + p.status);
  return cookie;
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
  const texto = (sel) => av('(' + q(sel) + ' || {}).textContent || ""');
  const fecharFolhas = () => av('document.querySelectorAll(".cortina").forEach((c) => c.remove()); 1');
  const capturar = async (nome) => {
    if (!CAPTURAS) return;
    await dormir(700);
    // o Início rola até o nó de hoje: a captura do cartão da chama é do alto da tela
    if (nome.includes('inicio')) { await av('(CC.rolarPara ? CC.rolarPara(0) : scrollTo(0, 0)), 1'); await dormir(400); }
    const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(CAPTURAS, nome + '.png'), Buffer.from(data, 'base64'));
  };
  if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cmd('Network.enable');

  for (const tema of ['claro', 'escuro']) {
    console.log('\n  tema ' + tema);
    await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'escuro' ? 'dark' : 'light' }] });
    const cookie = await contaComFalta('joana' + tema);
    const [nome, valor] = cookie.split('=');
    await cmd('Network.clearBrowserCookies');
    await cmd('Network.setCookie', { name: nome, value: valor, url: base });
    await cmd('Network.setCookie', { name: 'cc_logado', value: '1', url: base });
    // about:blank antes: navegar para o mesmo endereço com # não recarrega a página
    await cmd('Page.navigate', { url: 'about:blank' });
    await dormir(300);
    await cmd('Page.navigate', { url: base + '/#/' });

    // ---------- a folha de volta, depois da falta ----------
    ok(await esperar(q('.recomeco .vida-grande'), 20000), 'depois da falta, a folha de volta abre com os dias com a Palavra em destaque');
    ok((await texto('.recomeco .vida-grande b')) === '4' && /dias com a Palavra/.test(await texto('.recomeco .vida-grande')),
      'o destaque é "4 dias com a Palavra" (datas lidas no app e no papel; dois dias do plano na mesma data contam um)');
    ok(/Perder um dia não é perder a Palavra/.test(await texto('.recomeco')), 'o texto é gentil: "Perder um dia não é perder a Palavra"');
    ok(!/(^|\D)0 dias?\b/.test(await texto('.recomeco')), 'nenhum "0 dias" na folha de volta');
    await capturar('r1.1-volta-' + tema);
    await fecharFolhas();

    // ---------- o cartão da chama no Início ----------
    ok(await esperar(q('.folha-topo .cartao-salvia[data-dias-palavra="4"]')), 'com a chama apagada, o cartão do Início mostra os dias com a Palavra');
    const cartao = await texto('.folha-topo .cartao-salvia[data-ofensiva]');
    ok(/4 dias/.test(cartao) && /com a Palavra/.test(cartao) && !/(^|\D)0 dias?/.test(cartao), 'o cartão diz "4 dias com a Palavra", sem zero');
    await capturar('r1.1-inicio-apagada-' + tema);

    // ---------- a folha da chama ----------
    await av(q('.folha-topo .cartao-salvia[data-ofensiva]') + '.click(); 1');
    ok(await esperar(q('.folha-ofensiva .chama-grande[data-dias-palavra="4"]')), 'com a chama em zero, o número grande da folha é o dos dias com a Palavra');
    ok(!(await av('!!' + q('.folha-ofensiva .linha-vida'))), 'e a linha de baixo não repete o número');
    await capturar('r1.1-folha-apagada-' + tema);
    await fecharFolhas();

    // ---------- ler hoje soma um dia; o papel na mesma data não conta duas vezes ----------
    await av('CC.marcarLido(7); CC.redesenhar(); 1');
    ok(await esperar(q('.folha-topo .vida-salvia[data-dias-palavra="5"]')), 'lido hoje, a chama acende e o total sobe para 5, numa linha menor no cartão');
    ok(/1 dia/.test(await texto('.folha-topo .cartao-salvia[data-ofensiva] b')) && (await texto('.folha-topo .vida-salvia')) === '5 dias com a Palavra',
      'o cartão diz "1 dia de chama acesa" e "5 dias com a Palavra"');
    await capturar('r1.1-inicio-acesa-' + tema);
    await av(q('.folha-topo .cartao-salvia[data-ofensiva]') + '.click(); 1');
    ok(await esperar(q('.folha-ofensiva .linha-vida[data-dias-palavra="5"]')), 'na folha da chama, "Dias com a Palavra: 5 dias" vem logo abaixo do recorde');
    ok(/Nunca volta a zero/.test(await texto('.folha-ofensiva .linha-vida')), 'com a explicação curta: no app ou na sua Bíblia, nunca volta a zero');
    await av('document.querySelector(".folha-ofensiva .linha-vida").scrollIntoView({ block: "center" }); 1');
    await capturar('r1.1-folha-acesa-' + tema);
    await fecharFolhas();

    // ---------- a tela do Dia lido de quem voltou ----------
    await av('CC.abrirLicao(7); 1');
    await esperar(q('.licao [data-concluir]'), 15000);
    await av(q('.licao [data-concluir]') + '.click(); 1');
    ok(await esperar(q('.dia-lido .linha-vida-dia[data-dias-palavra="5"]'), 15000) && (await texto('.dia-lido .linha-vida-dia')) === '5 dias com a Palavra',
      'no Dia lido de quem voltou, "5 dias com a Palavra" vem logo abaixo da chama');
    await capturar('r1.1-dia-lido-' + tema);
    await av('location.hash = "#/"; 1');
    await esperar('!document.querySelector(".licao:not(.saindo)")');
  }

  await av('CC.marcarLido(8, "papel"); 1');
  ok(await av('CC.diasComAPalavra() === 5 && CC.origemDoDia(8) === "papel"'), 'um dia de papel na mesma data de hoje não conta duas vezes');

  // ---------- o "Zerar" não apaga, nem no servidor ----------
  await av('CC.zerarProgresso(); CC.salvarNoServidor().then(() => 1)');
  ok(await av('CC.ler("lidos", []).length === 0 && CC.sequencia().atual === 0 && CC.diasComAPalavra() === 5'), 'depois de zerar a trilha, os 5 dias com a Palavra continuam');
  const noServidor = await av('fetch("api/estado", { cache: "no-store" }).then((r) => r.json()).then((e) => (e.diasComPalavra || []).length)');
  ok(noServidor === 5, 'o servidor guardou as 5 datas (' + noServidor + ')');
  await av('localStorage.clear(); 1');
  await cmd('Page.reload', { ignoreCache: true });
  ok(await esperar(q('.folha-topo .cartao-salvia[data-dias-palavra="5"]'), 20000), 'outro aparelho (sem nada guardado) recebe os 5 dias do servidor');
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
