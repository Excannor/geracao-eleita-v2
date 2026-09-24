// Fotografa todas as telas do app num Chrome sem interface, no tamanho de um celular, com uma
// conta de exemplo que já tem progresso, amigos, célula com recado e propósito. Serve para
// revisar o design e para a documentação de arquitetura (docs/arquitetura/telas/).
// Uso: node ferramentas/telas.mjs [pasta-de-saída] [claro|escuro|ambos]
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { portaLivre, fecharArvore } from './navegador.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = resolve(process.argv[2] || join(AQUI, 'capturas', 'telas'));
const TEMAS = (process.argv[3] || 'ambos') === 'ambos' ? ['claro', 'escuro'] : [process.argv[3]];
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA = await portaLivre();
const DEPURACAO = await portaLivre();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(SAIDA, { recursive: true });

const pasta = mkdtempSync(join(tmpdir(), 'cc-telas-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json'), CAMINHO_TESTE: '1' }, stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const api = async (rota, corpo, cookie, metodo) => {
  const r = await fetch(base + rota, {
    method: metodo || (corpo ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { cookie: (r.headers.get('set-cookie') || '').split(';')[0], dado: await r.json().catch(() => ({})) };
};
const criar = (usuario, nome, extra = {}) => api('/api/criar-conta', {
  usuario, nome, senha: 'senha-' + usuario, email: usuario + '@exemplo.com', nascimento: '2003-04-05', ...extra,
});

// ---------- a conta de exemplo ----------
const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dia = (n) => new Date(Date.parse(hoje + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const progresso = (dias, extra = {}) => {
  const lidos = [];
  const marcadoEm = {};
  for (let i = 0; i < dias; i++) { lidos.push(i + 1); marcadoEm[i + 1] = dia(-(dias - 1 - i) + (i >= dias - 5 ? 0 : 0)); }
  return { atualizadoEm: Date.now(), dia: dias + 1, lidos, marcadoEm, licoes: ['0', '1'], licoesEm: {}, acertosTotal: 40, missoesTotal: 12, ...extra };
};
const lider = await criar('marcos', 'Marcos');
await api('/api/estado', progresso(6), lider.cookie, 'PUT');
const celula = (await api('/api/celula', { acao: 'criar', titulo: 'Célula de quinta' }, lider.cookie)).dado.proposito;
const token = new URL((await api('/api/celula', { acao: 'link', id: celula.id }, lider.cookie)).dado.link).searchParams.get('celula');
await api('/api/celula', { acao: 'encontro', id: celula.id, dia: new Date().getDay() }, lider.cookie);
await api('/api/celula', { acao: 'recado', id: celula.id, texto: 'Hoje às 20h na casa da Ana! Tragam a Bíblia e um amigo.' }, lider.cookie);
await api('/api/celula', { acao: 'estudo', id: celula.id, estudo: 'semana', texto: 'Vamos conversar sobre confiar em Deus quando não vemos o resultado.' }, lider.cookie);
const ana = await criar('ana', 'Ana', { celula: token });
await api('/api/estado', progresso(12, { apelido: 'Ana' }), ana.cookie, 'PUT');
for (const n of ['Bia', 'Caio', 'Duda']) {
  const c = await criar(n.toLowerCase(), n, { celula: token });
  await api('/api/estado', progresso(3 + n.length), c.cookie, 'PUT');
}
// amizade e propósito em dupla com a Bia
const bia = await api('/api/entrar', { login: 'bia', senha: 'senha-bia' });
const convite = (await api('/api/convites', {}, ana.cookie)).dado.link;
await api('/api/convites/aceitar', { token: new URL(convite).searchParams.get('convite') }, bia.cookie);
await api('/api/novidades/preferencia', { ligado: true }, bia.cookie);
await api('/api/novidades', { tipo: 'versiculo', dados: { ref: 'Salmos 23.1' } }, bia.cookie);

// ---------- o navegador ----------
const perfil = mkdtempSync(join(tmpdir(), 'cc-telas-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + DEPURACAO, '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });
let wsu;
for (let i = 0; i < 60 && !wsu; i++) {
  try { wsu = (await (await fetch('http://127.0.0.1:' + DEPURACAO + '/json/list')).json()).find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch { /* subindo */ }
  if (!wsu) await dormir(250);
}
const ws = new WebSocket(wsu);
let seq = 0;
const pend = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); } });
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await cmd('Page.enable');
await cmd('Network.enable');
const LARGURA = 390;
// ESCALA=1 para a documentação (imagens leves); 2 para revisar detalhe de desenho.
const ESCALA = Number(process.env.ESCALA) || 2;
const tela = (altura = 844) => cmd('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: altura, deviceScaleFactor: ESCALA, mobile: true });
await tela();

let tema = 'claro';
const indice = [];
async function foto(nome, titulo, { cheia = true } = {}) {
  await dormir(500);
  if (cheia) {
    const h = await av('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, (document.querySelector(".folha") || {}).scrollHeight || 0)');
    await tela(Math.min(Math.max(h || 844, 844), 3200));
    await dormir(250);
  }
  const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SAIDA, tema + '-' + nome + '.png'), Buffer.from(data, 'base64'));
  if (cheia) await tela();
  if (tema === TEMAS[0]) indice.push({ nome, titulo });
}
const fecharFolhas = () => av('document.querySelectorAll(".cortina").forEach((c) => c.remove())');
const ir = async (hash, espera = 1500) => { await fecharFolhas(); await av('location.hash = ' + JSON.stringify(hash)); await dormir(espera); };

for (tema of TEMAS) {
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'escuro' ? 'dark' : 'light' }] });
  // ---------- fora da conta ----------
  await cmd('Network.clearBrowserCookies');
  await cmd('Page.navigate', { url: base + '/' });
  await dormir(1800);
  await av('localStorage.clear()');
  await cmd('Page.navigate', { url: base + '/' });
  await dormir(1800);
  await foto('01-boas-vindas', 'Boas-vindas (sem conta)');
  await av('document.querySelector("[data-ir=\\"cadastro\\"]")?.click()');
  await foto('02-cadastro', 'Cadastro, passo 1');
  await av('document.querySelector("[data-ir=\\"entrar\\"]")?.click()');
  await foto('03-entrar', 'Entrar');

  // ---------- dentro, como a Ana ----------
  const [nome, valor] = ana.cookie.split('=');
  await cmd('Network.setCookie', { name: nome, value: valor, url: base });
  // Endereço diferente do anterior: só trocar o # não recarregaria a página de entrada.
  await cmd('Page.navigate', { url: base + '/?conta=' + Date.now() + '#/' });
  await dormir(3000);
  await fecharFolhas();
  await av('location.hash = "#/"');
  await dormir(1500);
  await foto('10-trilha', 'Trilha (início)');
  await av('document.querySelector(".no.atual")?.click()');
  await dormir(900);
  await foto('11-trilha-pop', 'Trilha com o balão do dia', { cheia: false });
  await av('document.querySelector("[data-ofensiva]")?.click()');
  await dormir(900);
  await foto('14-ofensiva', 'Folha da ofensiva (toque na chama)', { cheia: false });
  await fecharFolhas();
  await ir('#/dia/13', 2500);
  await foto('12-licao-leitura', 'Lição do dia: leitura');
  // a lição inteira: marcar como lido, concluir, as três etapas da reflexão e a celebração
  await av('document.querySelector("[data-trilha]")?.click()');
  await dormir(600);
  await av('document.querySelector("[data-concluir]")?.click()');
  await dormir(1500);
  await foto('15-licao-guardar', 'Lição: reflexão, guardar o versículo');
  await av('document.querySelector("[data-avancar]")?.click()');
  await dormir(1000);
  await foto('16-licao-pensar', 'Lição: reflexão, pensar');
  await av('document.querySelector("[data-avancar]")?.click()');
  await dormir(1000);
  await foto('17-licao-orar', 'Lição: reflexão, orar');
  await av('document.querySelector("[data-avancar]")?.click()');
  await dormir(2500);
  await foto('18-licao-celebracao', 'Lição: celebração do dia', { cheia: false });
  await ir('#/passos');
  await foto('13-primeiros-passos', 'Primeiros passos');
  await ir('#/missoes');
  await foto('20-desafios', 'Desafios');
  await ir('#/praticar');
  await foto('21-praticar', 'Praticar');
  await ir('#/biblia', 2500);
  await foto('30-biblia', 'Bíblia');
  await ir('#/biblia/' + encodeURIComponent('João') + '/3', 3500);
  await foto('31-biblia-leitor', 'Bíblia: lendo um capítulo', { cheia: false });
  await ir('#/explorar');
  await foto('40-explorar', 'Explorar');
  const secao = await av('(document.querySelector(".bloco-secao") || {}).getAttribute?.("href")');
  if (secao) { await ir(secao); await foto('41-explorar-secao', 'Explorar: uma seção'); }
  const nota = await av('(document.querySelector("a[href^=\\"#/nota/\\"]") || {}).getAttribute?.("href")');
  if (nota) { await ir(nota); await foto('42-explorar-nota', 'Explorar: uma nota'); }
  await ir('#/novidades', 2500);
  await foto('50-juntos', 'Juntos (feed, célula, amigos)');
  await av('document.querySelector("[data-celula]")?.click()');
  await dormir(900);
  await foto('51-celula', 'Célula (folha)', { cheia: false });
  await ir('#/novidades/propositos', 2000);
  await foto('52-propositos', 'Propósitos');
  await ir('#/perfil', 2000);
  await foto('60-perfil', 'Perfil');
  for (const [sub, titulo] of [['conquistas', 'Conquistas'], ['trofeus', 'Troféus'], ['livros', 'Livros'], ['versiculos', 'Versículos guardados'], ['escritos', 'Minhas anotações']]) {
    await ir('#/perfil/' + sub);
    await foto('6' + (['conquistas', 'trofeus', 'livros', 'versiculos', 'escritos'].indexOf(sub) + 1) + '-perfil-' + sub, 'Perfil: ' + titulo);
  }
  await ir('#/config');
  await foto('70-configuracoes', 'Configurações');
  await ir('#/config/notificacoes');
  await foto('71-notificacoes', 'Configurações: notificações');
  await ir('#/config/textos');
  await foto('72-textos', 'Configurações: textos bíblicos');
}

writeFileSync(join(SAIDA, 'indice.json'), JSON.stringify(indice, null, 2));
console.log('telas: ' + indice.length + ' × ' + TEMAS.length + ' tema(s) em ' + SAIDA);
ws.close();
fecharArvore(nav, perfil);
servidor.kill();
process.exit(0);
