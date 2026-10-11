// A arte do alto da folha do desafio (campo `arte` em CC.DESAFIOS, 09c-desafios.js): a tela de
// "sem internet" em pixels. Abre cada desafio na aba Desafios, a 390px, no claro e no escuro:
//   - "21 dias sem redes sociais" e "7 dias sem celular na cama" têm a arte no alto da folha,
//     com o desenho (SVG role="img" com nome), o título, o "Tente:" e as três sugestões em texto;
//   - os outros desafios abrem sem arte;
//   - o desenho fica em escala inteira (4px por pixel) e na cor da letra fraca do tema.
// Uso: CHROME=<chrome> node ferramentas/teste-desafio-arte.mjs
//   PORTA=<n> troca a porta do servidor (8381); FOTOS=<pasta> guarda as capturas das folhas.
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA_NAV = await portaLivre();
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8381;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FOTOS = process.env.FOTOS || '';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-desafio-arte-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_TESTE: '1' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA + '/';
for (let i = 0; i < 80; i++) { try { await fetch(base + 'api/existe-conta'); break; } catch { await dormir(150); } }
const perfil = mkdtempSync(join(tmpdir(), 'cc-desafio-arte-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });

const fim = () => {
  fecharArvore(nav, perfil);
  try { servidor.kill(); } catch { /* já saiu */ }
  setTimeout(() => {
    for (const p of [perfil, pastaEstado]) { try { rmSync(p, { recursive: true, force: true }); } catch { /* ok */ } }
    console.log(falhas ? '\n  ' + falhas + ' falha(s)' : '\n  a arte aparece nos dois desafios, e só neles');
    process.exit(falhas ? 1 : 0);
  }, 600);
};

try {
  const r = await fetch(base + 'api/criar-conta', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: 'rute', senha: 'senha123', nome: 'Rute', email: 'rute@teste.com', nascimento: '2000-01-01', consentimento: true }),
  });
  const cookie = (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || ''])
    .map((l) => l.split(';')[0]).find((l) => /^cc_sessao=./.test(l)) || '';
  ok(!!cookie, 'a conta nasce com sessão');

  let ws = null;
  for (let i = 0; i < 60 && !ws; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:' + PORTA_NAV + '/json/list')).json();
      const p = l.find((x) => x.type === 'page');
      if (p) ws = new WebSocket(p.webSocketDebuggerUrl);
    } catch { /* subindo */ }
    if (!ws) await dormir(250);
  }
  let seq = 0;
  const pend = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
  });
  await new Promise((res) => ws.addEventListener('open', res));
  const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
  const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  const esperar = async (expr, ms = 8000) => {
    for (let t = 0; t < ms; t += 150) { if (await av(expr)) return true; await dormir(150); }
    return false;
  };

  await cmd('Page.enable');
  await cmd('Network.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });
  await cmd('Page.navigate', { url: base + 'privacidade.html' });
  await esperar('document.readyState === "complete"');
  const [nome, ...resto] = cookie.split('=');
  await cmd('Network.setCookie', { name: nome, value: resto.join('='), url: base });
  await cmd('Page.navigate', { url: base + '#/missoes' });
  ok(await esperar('!!window.CC && document.querySelectorAll("#desafios-longos [data-desafio]").length >= 3', 15000), 'a aba Desafios lista os desafios de consagração');

  const ARTE = {
    'sem-redes-21': { arte: 'offline', titulo: 'SEM INTERNET', tente: ['Largar seu celular', 'Se conectar com Deus', 'Desfrutar'] },
    'celular-cama-7': { arte: 'dormir', titulo: 'CELULAR DORMINDO', tente: ['Deixar o celular longe da cama', 'Conversar com Deus antes de dormir', 'Descansar'] },
  };
  const fechar = () => av('document.querySelectorAll(".cortina").forEach((c) => c.remove()); true');
  const abrir = async (id) => {
    await fechar();
    await av('document.querySelector("#desafios-longos [data-desafio=\\"' + id + '\\"]").click(); true');
    return esperar('!!document.querySelector(".folha.folha-desafio h2")');
  };
  const ler = () => av(`(() => {
    const f = document.querySelector('.folha.folha-desafio');
    const a = f && f.querySelector('.dsf-arte');
    if (!a) return { tem: false };
    const s = a.querySelector('svg');
    const r = s.getBoundingClientRect();
    return {
      tem: true, arte: a.dataset.arte, primeiro: f.firstElementChild === a,
      papel: s.getAttribute('role'), nome: s.getAttribute('aria-label') || '', nitido: s.getAttribute('shape-rendering'),
      largura: r.width, altura: r.height, cor: getComputedStyle(s).color,
      fraca: getComputedStyle(document.documentElement).getPropertyValue('--v2-tinta-fraca').trim(),
      titulo: a.querySelector('.dsf-arte-titulo')?.textContent, tente: a.querySelector('.dsf-arte-tente')?.textContent,
      itens: [...a.querySelectorAll('li')].map((li) => li.textContent),
    };
  })()`);
  const hex = (rgb) => '#' + (rgb.match(/\d+/g) || []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');

  for (const escuro of [false, true]) {
    const tema = escuro ? 'escuro' : 'claro';
    await av('CC.aplicarTema(' + escuro + '); true');
    for (const [id, esperado] of Object.entries(ARTE)) {
      ok(await abrir(id), tema + ': abre a folha de ' + id);
      const v = await ler();
      ok(v.tem && v.arte === esperado.arte && v.primeiro, tema + ': ' + id + ' tem a arte "' + esperado.arte + '" no alto da folha');
      ok(v.papel === 'img' && /pixels/.test(v.nome) && v.nitido === 'crispEdges', tema + ': o desenho é uma imagem com nome (' + v.nome + ')');
      ok(v.titulo === esperado.titulo && v.tente === 'Tente:' && JSON.stringify(v.itens) === JSON.stringify(esperado.tente),
        tema + ': título, "Tente:" e as três sugestões em texto (' + v.titulo + ' · ' + (v.itens || []).join(' / ') + ')');
      ok(v.largura === 288 && v.altura === 100, tema + ': 72 x 25 pixels a 4px cada, sem borrar (' + v.largura + ' x ' + v.altura + ')');
      ok(hex(v.cor || '') === v.fraca, tema + ': o desenho na cor da letra fraca do tema (' + hex(v.cor || '') + ')');
      if (FOTOS) {
        mkdirSync(FOTOS, { recursive: true });
        await dormir(500);
        const foto = await cmd('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(FOTOS, id + '-390-' + tema + '.png'), Buffer.from(foto.data, 'base64'));
      }
    }
    for (const id of await av('CC.DESAFIOS.filter((d) => !d.arte).map((d) => d.id)')) {
      ok(await abrir(id) && !(await ler()).tem, tema + ': ' + id + ' abre sem arte');
    }
  }
  await fechar();
} catch (e) {
  ok(false, 'erro: ' + e.message);
}
fim();
