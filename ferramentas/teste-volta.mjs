// Quem atrasou volta sem culpa (R2, docs/fases/r2-volta-sem-culpa.md) num Chrome sem interface, a
// 390x844, nos temas claro e escuro.
// R2.1, "Ficar em dia" em dois caminhos: o líder da célula leu até o dia 40 hoje; a Ana, da célula,
// parou no dia 30. O Início mostra "Ficar em dia com a célula"; a folha traz os dois caminhos, com
// "Com a célula" marcado. Com a célula: a Ana vai para o dia 40, os dias 31 a 39 viram pendentes
// (a linha no Início, a folha com a lista e a marca nos nós), nada é marcado como lido (nem no
// servidor), ler um pendente no papel o tira da lista sem tirar a Ana do dia 40, o Dia lido diz que
// hoje, com a célula, é o dia 40, e outro aparelho (sem nada guardado) abre igual. No meu ritmo: o
// Bruno segue do dia 31, e o convite não volta por 7 dias. Quem não tem célula e o líder não veem
// o convite.
// Uso: node ferramentas/teste-volta.mjs   (PORTA=<n> troca a porta; CHROME=<caminho>;
// CAPTURAS=<pasta> guarda as capturas, uma subpasta por parte: R2.1...)
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

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const atras = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return iso(d); };
const ate = (n) => Array.from({ length: n }, (_, i) => i + 1);

const pasta = mkdtempSync(join(tmpdir(), 'cc-volta-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json') }, stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const perfil = mkdtempSync(join(tmpdir(), 'cc-volta-nav-'));
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
async function conta(usuario, nome, { celula = '', lidos = [], data = atras(1) } = {}) {
  const r = await pedir('/api/criar-conta', { usuario, nome, senha: 'senha-' + usuario, email: usuario + '@teste.com', nascimento: '2008-04-05', consentimento: true,
    fuso: Intl.DateTimeFormat().resolvedOptions().timeZone, ...(celula ? { celula } : {}) });
  if (!r.ok) throw new Error('não criou a conta: ' + r.status + ' ' + await r.text());
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  if (lidos.length) {
    const estado = { atualizadoEm: Date.now(), dia: Math.max(...lidos) + 1, lidos, marcadoEm: Object.fromEntries(lidos.map((n) => [n, data])), apelido: nome };
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
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); } });
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
  const entrar = async (cookie, { limpar = true } = {}) => {
    const [nome, valor] = cookie.split('=');
    if (limpar) {
      // um aparelho sem nada guardado: o progresso vem só do servidor
      await cmd('Page.navigate', { url: base + '/entrar.html' });
      await dormir(300);
      await av('localStorage.clear(); sessionStorage.clear(); 1');
    }
    await cmd('Network.clearBrowserCookies');
    await cmd('Network.setCookie', { name: nome, value: valor, url: base });
    await cmd('Network.setCookie', { name: 'cc_logado', value: '1', url: base });
    await abrir();
  };
  // A partida abre folhas (o convite das notificações); o que se testa aqui é o Início por baixo.
  const noInicio = async () => {
    const pronto = await esperar(q('.folha-topo') + ' && CC.quem && CC.minhasCelulas', 20000);
    // a carta de Boas-vindas (quem entrou pelo link) e o convite das notificações chegam depois
    await dormir(2500);
    await fecharFolhas();
    await dormir(300);
    await fecharFolhas();
    return pronto;
  };

  for (const tema of ['claro', 'escuro']) {
    await temaDe(tema);
    console.log('\n  R2.1 · Ficar em dia com a célula\n');
    // o líder leu até o dia 40, hoje: a célula está no dia 40
    const t = tema[0];
    const liderC = await conta('lider' + t, 'Lucas', { lidos: ate(40), data: atras(0) });
    const criada = await (await pedir('/api/celula', { acao: 'criar', titulo: 'Célula Videira' }, liderC)).json();
    const id = criada.proposito.id;
    const { link } = await (await pedir('/api/celula', { acao: 'link', id }, liderC)).json();
    const token = new URL(link).searchParams.get('celula');
    // a Ana e o Bruno, da célula, pararam no dia 30 (ontem); a Carla, sem célula, também
    const anaC = await conta('ana' + t, 'Ana', { celula: token, lidos: ate(30) });
    const brunoC = await conta('bruno' + t, 'Bruno', { celula: token, lidos: ate(30) });
    const carlaC = await conta('carla' + t, 'Carla', { lidos: ate(30) });
    const daAna = ((await (await pedir('/api/propositos', null, anaC)).json()).propositos || []).find((p) => p.id === id);
    ok(daAna && daAna.diaDaCelula === 40, 'o servidor diz à Ana que a célula está no dia 40 (' + (daAna && daAna.diaDaCelula) + ')');

    // ---------- a Ana: com a célula ----------
    await entrar(anaC);
    ok(await noInicio(), 'a Ana abre o Início');
    ok(await esperar(q('.folha-topo [data-ficar-em-dia="40"]'), 10000), 'o Início mostra "Ficar em dia com a célula", com a célula no dia 40');
    const cartao = await texto('.folha-topo [data-ficar-em-dia]');
    ok(/Ficar em dia com a célula/.test(cartao) && /dia 40/.test(cartao) && /Perder um dia não é perder a Palavra\./.test(cartao), 'o cartão é sem culpa (' + cartao + ')');
    ok(await av('document.querySelector(".folha-topo .ler-hoje").nextElementSibling === document.querySelector("[data-ficar-em-dia]")'), 'o cartão vem logo abaixo do "Ler hoje"');
    ok((await av(q('.folha-topo [data-ler-hoje]') + '.dataset.lerHoje')) === '31', 'antes de escolher, a leitura de hoje continua no dia 31');
    await capturar('r2.1-inicio-atrasada-' + tema, true);

    await av(q('[data-ficar-em-dia]') + '.click(); 1');
    ok(await esperar(q('.cortina [data-ficar-em-dia-folha]')), 'tocar no cartão abre a folha "Ficar em dia"');
    ok(await av(q('.cortina input[value="celula"]') + '.checked && !' + q('.cortina input[value="ritmo"]') + '.checked'), '"Com a célula" vem marcado: é o padrão para quem tem célula');
    const folha = await texto('.cortina [data-ficar-em-dia-folha]');
    ok(/Perder um dia não é perder a Palavra\./.test(folha) && /Vá para o dia 40/.test(folha) && /Os dias 30 a 39|Os dias 31 a 39/.test(folha) && /Continue do dia 31/.test(folha),
      'a folha explica os dois caminhos (' + folha.replace(/\s+/g, ' ').slice(0, 220) + ')');
    ok(/Os dias 31 a 39 ficam pendentes/.test(folha), 'os dias 31 a 39 ficam pendentes');
    await capturar('r2.1-folha-caminhos-' + tema);
    await av(q('.cortina [data-seguir]') + '.click(); 1');
    ok(await esperar(q('.folha-topo [data-ler-hoje="40"]'), 8000), 'com a célula: a leitura de hoje vira o dia 40');
    ok(await esperar(q('.folha-topo [data-pendentes="9"]')), 'a linha dos pendentes diz 9 dias');
    ok(!(await av(q('.folha-topo [data-ficar-em-dia]'))), 'o cartão "Ficar em dia" sai');
    ok(await av('CC.ler("lidos").length === 30 && CC.datasFeitas().size === 1 && CC.ler("pulouPara") === 40'), 'no aparelho, nada foi marcado como lido: 30 dias, uma data, pulo no 40');
    await av('CC.salvarNoServidor()');
    await dormir(400);
    const noServidor = await estadoDe(anaC);
    ok(noServidor.pulouPara === 40 && noServidor.lidos.length === 30 && Object.keys(noServidor.marcadoEm || {}).length === 30 && !Object.keys(noServidor.cartas?.eventos || {}).some((k) => /^(bau|unidade|dias):/.test(k)),
      'no servidor também: o pulo no 40, os mesmos 30 dias lidos, nenhuma carta de leitura (' + JSON.stringify({ pulouPara: noServidor.pulouPara, lidos: (noServidor.lidos || []).length, cartas: Object.keys(noServidor.cartas?.eventos || {}) }) + ')');
    ok(/Dia 40 de 365/.test(await texto('.folha-topo .textos-saudacao')), 'o alto diz "Dia 40 de 365 do plano"');
    await capturar('r2.1-inicio-com-celula-' + tema, true);

    // os nós pendentes na Trilha
    const nos = await av('[...document.querySelectorAll(".no.pendente")].map((b) => b.dataset.dia).join()');
    const esperados = await av('[...document.querySelectorAll(".no[data-dia]")].map((b) => +b.dataset.dia).filter((n) => n >= 31 && n <= 39).join()');
    ok(nos && nos === esperados && /pendente$/.test(await av(q('.no.pendente') + '.getAttribute("aria-label")')), 'os nós dos dias pendentes ficam marcados na Trilha, e o leitor de tela ouve "pendente" (' + nos + ')');
    ok(await av(q('.no[data-dia="40"]') + '.classList.contains("atual")'), 'o nó de hoje é o dia 40');
    await av('(() => { const n = document.querySelector(".no.pendente"); if (n) CC.rolarPara(n.getBoundingClientRect().top + scrollY - 300); })(), 1');
    await capturar('r2.1-trilha-pendentes-' + tema);

    // a lista dos pendentes
    await av('CC.rolarPara(0), 1');
    await av(q('.folha-topo [data-pendentes]') + '.click(); 1');
    ok(await esperar(q('.cortina [data-pendentes-folha="9"]')), 'a linha abre a folha dos pendentes');
    ok((await av('document.querySelectorAll(".cortina [data-ler-pendente]").length')) === 9 && (await av(q('.cortina [data-ler-pendente]') + '.dataset.lerPendente')) === '31'
      && /Sem pressa e sem cobrança/.test(await texto('.cortina [data-pendentes-folha]')), 'a folha lista os 9 dias, do 31 ao 39, sem cobrança');
    await capturar('r2.1-folha-pendentes-' + tema);
    await av(q('.cortina [data-ler-pendente="31"]') + '.click(); 1');
    ok(await esperar('location.hash === "#/dia/31"', 8000), 'tocar num pendente abre o dia 31');
    // lê o pendente no papel
    await av('CC.lerHoje(31); 1');
    ok(await esperar(q('.leitor [data-papel-discreto]'), 10000), 'o leitor do dia 31 abre');
    await av(q('.leitor [data-papel-discreto]') + '.click(); 1');
    ok(await esperar(q('[data-papel-sim]')), '"Li na minha Bíblia" pede a confirmação');
    await av(q('[data-papel-sim]') + '.click(); 1');
    ok(await esperar(q('.dia-lido .destaque-dia.amanha'), 10000), 'o Dia lido do pendente abre');
    const seguinte = await texto('.dia-lido .destaque-dia.amanha');
    ok(/Hoje, com a célula \(dia 40\)/.test(seguinte), 'o que vem a seguir é o dia 40, hoje, com a célula (' + seguinte + ')');
    await av('document.querySelector(".dia-lido .destaque-dia.amanha").scrollIntoView({ block: "center" }); 1');
    await capturar('r2.1-dia-lido-pendente-' + tema);
    await av('location.hash = "#/"; 1');
    await esperar('!document.querySelector(".licao:not(.saindo)")');
    ok(await esperar(q('.folha-topo [data-pendentes="8"]'), 8000), 'lido o 31, sobram 8 pendentes');
    ok(await av('CC.diaAtual() === 40 && CC.leu(31) && CC.origemDoDia(31) === "papel"'), 'a Ana continua no dia 40, com o 31 lido no papel');
    ok(await esperar(q('.folha-topo [data-ler-hoje="40"]')) && await av('CC.sequencia().feitoHoje'), 'o pendente acende a chama de hoje, e a leitura de hoje continua sendo o dia 40 da célula');
    await capturar('r2.1-inicio-depois-do-pendente-' + tema, true);

    // outro aparelho: sem nada guardado, o pulo e os pendentes vêm do servidor
    await av('CC.salvarNoServidor()');
    await dormir(400);
    await entrar(anaC);
    ok(await noInicio(), 'a Ana abre o app em outro aparelho');
    ok(await esperar(q('.folha-topo [data-ler-hoje="40"]'), 10000) && await esperar(q('.folha-topo [data-pendentes="8"]')),
      'no outro aparelho, a Ana está no dia 40 e tem os mesmos 8 pendentes (' + await av('JSON.stringify({ dia: CC.diaAtual(), pulou: CC.ler("pulouPara"), lidos: CC.ler("lidos").length, pend: (document.querySelector("[data-pendentes]") || {}).textContent })') + ')');

    // ---------- o Bruno: no meu ritmo ----------
    await entrar(brunoC);
    ok(await noInicio(), 'o Bruno abre o Início');
    ok(await esperar(q('.folha-topo [data-ficar-em-dia="40"]'), 10000), 'o Bruno também vê o convite');
    await av(q('[data-ficar-em-dia]') + '.click(); 1');
    await esperar(q('.cortina [data-ficar-em-dia-folha]'));
    await av(q('.cortina input[value="ritmo"]') + '.click(); 1');
    await capturar('r2.1-folha-meu-ritmo-' + tema);
    await av(q('.cortina [data-seguir]') + '.click(); 1');
    ok(await esperar('!' + q('.folha-topo [data-ficar-em-dia]'), 8000), 'no meu ritmo: o convite sai do Início');
    ok(await av('CC.diaAtual() === 31 && !CC.ler("pulouPara")') && !(await av(q('.folha-topo [data-pendentes]'))), 'o Bruno segue do dia 31, sem pendentes');
    await capturar('r2.1-inicio-meu-ritmo-' + tema, true);
    await entrar(brunoC, { limpar: false });
    ok(await noInicio(), 'o Bruno abre o app de novo');
    await dormir(800);
    ok(!(await av(q('.folha-topo [data-ficar-em-dia]'))), 'o convite não volta na abertura seguinte (vale por 7 dias)');

    // ---------- quem não vê ----------
    await entrar(carlaC);
    ok(await noInicio(), 'a Carla, sem célula, abre o Início');
    await dormir(800);
    ok(!(await av(q('.folha-topo [data-ficar-em-dia]'))) && !(await av('!!CC.volta')), 'sem célula, nada de convite (e a peça nem é pedida)');
    await entrar(liderC);
    ok(await noInicio(), 'o líder abre o Início');
    await dormir(800);
    ok(!(await av(q('.folha-topo [data-ficar-em-dia]'))), 'o líder, que é o dia da célula, não vê o convite');
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
