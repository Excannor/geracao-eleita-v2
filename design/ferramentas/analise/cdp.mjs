// Pequena biblioteca CDP das ferramentas de análise (design/ferramentas/analise/*): abre um
// Chrome sem interface numa porta sorteada, conecta pelo protocolo de depuração e devolve
// `cmd` (um comando CDP), `av` (avaliar JS na página) e `fechar`. Só lê o app; não grava nada
// fora da pasta do perfil, que é apagada no fim (a menos que `perfil` venha de fora).
//
//   CHROME: o executável (padrão "chromium"). Nesta máquina costuma ser um .sh que chama o
//           Chromium com --no-sandbox; no Windows, o chrome.exe.
//
// Uso:
//   import { abrir, dormir, RAIZ } from './cdp.mjs';
//   const { cmd, av, fechar } = await abrir({ cookie, base: 'http://localhost:8680/' });
//   await cmd('Page.navigate', { url: base + '#/' }); await dormir(2000);
//   console.log(await av('location.hash'));
//   fechar();
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ = join(AQUI, '..', '..', '..');
const { portaLivre, fecharArvore } = await import(pathToFileURL(join(RAIZ, 'ferramentas', 'navegador.mjs')).href);
export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// O que silencia o que atrapalha uma captura: o convite de notificações e o tutorial de
// instalar. A jornada do usuário NÃO usa isto: ela quer ver exatamente essas interrupções.
export const SILENCIO = "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar')}catch(e){}";

// abrir({ cookie, base, largura, altura, pre, silenciar, perfil, chrome, escala })
//   cookie    "cc_sessao=..." (o conteúdo de cookie-<conta>.txt do semear.mjs); sem ele, sem conta
//   base      http://localhost:PORTA/ (o cookie vale para esta origem)
//   pre       JS que roda antes de cada documento (Page.addScriptToEvaluateOnNewDocument)
//   silenciar true (padrão) injeta SILENCIO antes do `pre`
//   perfil    pasta de perfil a reaproveitar entre aberturas (localStorage, cookies e o
//             service worker sobrevivem, como no celular de verdade); sem ela, uma temporária
//   escala    deviceScaleFactor (padrão 2 abaixo de 800px de largura, 1 acima)
// Devolve { cmd, av, fechar, ouvir, nav, perfil }. `ouvir(metodo, fn)` recebe eventos CDP
// (ex.: 'Runtime.exceptionThrown'); `fechar()` derruba a árvore do Chrome e apaga o perfil temporário.
export async function abrir({
  cookie = '', base = 'http://localhost:8680/', largura = 390, altura = 844, pre = '', silenciar = true,
  perfil = '', chrome = process.env.CHROME || 'chromium', escala,
} = {}) {
  const PORTA = await portaLivre();
  const temporario = !perfil;
  if (temporario) perfil = mkdtempSync(join(tmpdir(), 'analise-'));
  else if (!existsSync(perfil)) mkdirSync(perfil, { recursive: true });
  const nav = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    '--remote-debugging-port=' + PORTA, '--user-data-dir=' + perfil, '--window-size=' + largura + ',' + altura, 'about:blank'], { stdio: 'ignore' });
  let url; let urlNavegador;
  for (let i = 0; i < 80 && !url; i++) {
    try {
      const lista = await (await fetch('http://127.0.0.1:' + PORTA + '/json/list')).json();
      const pagina = lista.find((x) => x.type === 'page');
      if (pagina) url = pagina.webSocketDebuggerUrl;
      if (pagina) urlNavegador = (await (await fetch('http://127.0.0.1:' + PORTA + '/json/version')).json()).webSocketDebuggerUrl;
    } catch { /* o Chrome ainda está subindo */ }
    if (!url) await dormir(250);
  }
  if (!url) { try { fecharArvore(nav, perfil); } catch { /* ok */ } throw new Error('o Chrome não subiu (CHROME=' + chrome + ')'); }
  const ws = new WebSocket(url);
  let seq = 0;
  const pendentes = new Map();
  const ouvintes = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m.result || m.error || {}); pendentes.delete(m.id); return; }
    if (m.method && ouvintes.has(m.method)) for (const fn of ouvintes.get(m.method)) fn(m.params || {});
  });
  await new Promise((r) => ws.addEventListener('open', r));
  const cmd = (metodo, params = {}) => new Promise((res) => { const id = ++seq; pendentes.set(id, res); ws.send(JSON.stringify({ id, method: metodo, params })); });
  const av = async (expressao) => {
    const r = await cmd('Runtime.evaluate', { expression: expressao, returnByValue: true, awaitPromise: true });
    return r.exceptionDetails ? { erro: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text) } : r.result?.value;
  };
  const ouvir = (metodo, fn) => { if (!ouvintes.has(metodo)) ouvintes.set(metodo, []); ouvintes.get(metodo).push(fn); };
  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Network.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: escala || (largura < 800 ? 2 : 1), mobile: largura < 800 });
  const antes = (silenciar ? SILENCIO + ';' : '') + (pre || '');
  if (antes) await cmd('Page.addScriptToEvaluateOnNewDocument', { source: antes });
  if (cookie) {
    const [nome, ...resto] = cookie.trim().split('=');
    await cmd('Network.setCookie', { name: nome, value: resto.join('='), url: base });
  }
  // Fechar de verdade, não matar: só no encerramento limpo o Chrome grava cookies e
  // localStorage no perfil. Matar o processo perde a sessão de quem acabou de se cadastrar
  // (a jornada reabre o mesmo perfil no dia seguinte, como o celular da pessoa). O kill fica
  // de reserva, para o Chrome que não responde.
  const fechar = async () => {
    try { ws.close(); } catch { /* ok */ }
    let saiu = nav.exitCode !== null;
    if (!saiu && urlNavegador) {
      try {
        const wsNav = new WebSocket(urlNavegador);
        await new Promise((r, falha) => { wsNav.addEventListener('open', r); wsNav.addEventListener('error', falha); });
        wsNav.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
        saiu = await new Promise((r) => { nav.once('exit', () => r(true)); setTimeout(() => r(nav.exitCode !== null), 4000); });
        try { wsNav.close(); } catch { /* ok */ }
      } catch { /* vai de kill */ }
    }
    if (!saiu) try { fecharArvore(nav, perfil); } catch { /* ok */ }
    if (temporario) try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
  };
  return { cmd, av, fechar, ouvir, nav, perfil };
}

// Espera uma expressão JS ficar verdadeira na página (até `ms`); devolve true/false.
export async function esperar(av, expressao, ms = 8000, passo = 150) {
  for (let t = 0; t < ms; t += passo) {
    const v = await av(expressao);
    if (v && !v.erro) return true;
    await dormir(passo);
  }
  return false;
}
