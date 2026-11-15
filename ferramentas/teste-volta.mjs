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
// R2.2, o primeiro dia: numa conta nova nada cobre o Início antes de ler; o primeiro Dia lido festeja
// no alto ("Seu primeiro dia com a Palavra!"), nada abre por cima dele, e o primeiro pedido (instalar)
// só vem depois do "Voltar à trilha"; o dia 2 não repete a festa.
// R2.3, pular a festa: a veterana (7 dias com a Palavra) vê "Mostrar a comemoração completa" no pé do
// Dia lido; desligada, o dia seguinte abre sem faíscas, confete, frase sorteada nem animação, com tudo
// o que informa; ligada de novo, a festa volta. Quem ainda não é veterano não vê a preferência.
// R2.2b, o dia 0: a conta nova vê "Comece aqui: No começo" antes do "Ler hoje"; a tela do dia 0 traz o
// dia 1 do Conhecer Jesus; a regra de leitura vale; lido, festeja o primeiro dia (chama em 1, nada
// por cima, o pedido só depois), sem dia do plano lido (no aparelho e no servidor); o dia 1 depois não
// repete a festa; quem já leu o dia 1 não vê o dia 0.
// R2.4, integridade do progresso: a primeira abertura depois de entrar sem alcançar o servidor não
// perde a leitura; a rede que volta com o app aberto manda o que ficou; fechar logo depois de marcar
// não deixa a leitura para trás; sair sem rede avisa antes de perder; e o celular novo traz tudo.
// Uso: node ferramentas/teste-volta.mjs   (PORTA=<n> troca a porta; CHROME=<caminho>;
// CAPTURAS=<pasta> guarda as capturas, uma subpasta por parte: R2.1, R2.2...; PARTES=R2.1,R2.2 escolhe as partes)
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
// PARTES=R2.1,R2.2 roda só essas partes (todas, sem a variável)
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
async function conta(usuario, nome, { celula = '', lidos = [], data = atras(1), datas = null } = {}) {
  const r = await pedir('/api/criar-conta', { usuario, nome, senha: 'senha-' + usuario, email: usuario + '@teste.com', nascimento: '2008-04-05', consentimento: true,
    fuso: Intl.DateTimeFormat().resolvedOptions().timeZone, ...(celula ? { celula } : {}) });
  if (!r.ok) throw new Error('não criou a conta: ' + r.status + ' ' + await r.text());
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  if (lidos.length) {
    const estado = { atualizadoEm: Date.now(), dia: Math.max(...lidos) + 1, lidos, marcadoEm: Object.fromEntries(lidos.map((n, i) => [n, datas ? datas[i] : data])), apelido: nome };
    const p = await pedir('/api/estado', estado, cookie, 'PUT');
    if (!p.ok) throw new Error('não gravou o estado: ' + p.status);
  }
  return cookie;
}
const estadoDe = async (cookie) => (await pedir('/api/estado', null, cookie)).json();
// os dias com a Palavra de um estado vindo do servidor (as datas da chama, sem repetir)
const CC_DIAS = (e) => new Set([...Object.values(e.marcadoEm || {}), ...Object.values(e.licoesEm || {}), ...Object.values(e.conhecidos || {}), ...(e.diaZero ? [e.diaZero] : []), ...(e.diasComPalavra || [])].filter(Boolean)).size;

try {
  const ws = new WebSocket(await alvo());
  let seq = 0;
  const pend = new Map();
  // R2.4: as rotas da API que a página não alcança agora (o servidor "fora do ar" só para ela)
  let bloqueadas = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
    if (m.method === 'Fetch.requestPaused') {
      const corta = bloqueadas && bloqueadas.test(m.params.request.url);
      ws.send(JSON.stringify({ id: 900000 + Math.floor(Math.random() * 90000), method: corta ? 'Fetch.failRequest' : 'Fetch.continueRequest',
        params: corta ? { requestId: m.params.requestId, errorReason: 'InternetDisconnected' } : { requestId: m.params.requestId } }));
    }
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
    if (!quer('R2.1')) break;
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

  // ---------- R2.2: o primeiro dia ----------
  // Uma conta nova (como a página de entrada deixa: cc.instalar) abre o app e lê o dia 1. Tudo o
  // que cobre a tela (folhas e telas cheias) é anotado, do começo ao fim, para saber o que vem antes
  // e o que vem depois do primeiro Dia lido.
  const vigiar = () => av('(() => { window.__cobriu = []; const anotar = () => { for (const el of document.querySelectorAll(".cortina .folha, .tela-cheia")) {'
    + ' const nome = el.getAttribute("aria-label") || el.className; if (!window.__cobriu.includes(nome)) window.__cobriu.push(nome); } };'
    + ' anotar(); new MutationObserver(anotar).observe(document.body, { childList: true, subtree: true }); return 1; })()');
  for (const tema of ['claro', 'escuro']) {
    if (!quer('R2.2')) break;
    await temaDe(tema);
    console.log('\n  R2.2 · O primeiro dia\n');
    const t = tema[0];
    const novaC = await conta('nova' + t, 'Nina');
    await cmd('Page.navigate', { url: base + '/entrar.html' });
    await dormir(300);
    await av('localStorage.clear(); sessionStorage.clear(); localStorage.setItem("cc.instalar", "1"); 1');
    await entrar(novaC, { limpar: false });
    await esperar(q('.folha-topo'), 20000);
    await vigiar();
    await dormir(4000);
    ok(await av('window.__cobriu.length === 0'), 'conta nova: nada cobre o Início antes da primeira leitura (' + await av('JSON.stringify(window.__cobriu)') + ')');
    await capturar('r2.2-inicio-conta-nova-' + tema, true);
    await av('CC.lerHoje(CC.diaAtual()); 1');
    ok(await esperar(q('.leitor [data-papel-discreto]'), 10000), 'o leitor do dia 1 abre direto');
    await av(q('.leitor [data-papel-discreto]') + '.click(); 1');
    await esperar(q('[data-papel-sim]'));
    await av(q('[data-papel-sim]') + '.click(); 1');
    ok(await esperar(q('.dia-lido [data-primeiro-dia]'), 10000), 'o primeiro Dia lido abre com a festa do primeiro dia');
    const festa = await texto('.dia-lido [data-primeiro-dia]');
    ok(/Seu primeiro dia com a Palavra!/.test(festa) && /um dia de cada vez, Nina\./.test(festa), 'com "Seu primeiro dia com a Palavra!" (' + festa + ')');
    ok(await av('document.querySelector(".dia-lido [data-primeiro-dia]").getBoundingClientRect().bottom < innerHeight'), 'a festa fica no alto, sem rolar');
    await esperar('!document.querySelector(".cortina")', 3000);
    await vigiar();
    await dormir(3000);
    ok(await av('window.__cobriu.length === 0'), 'nada abre por cima do Dia lido: nem conta, nem instalar, nem notificações (' + await av('JSON.stringify(window.__cobriu)') + ')');
    await capturar('r2.2-dia-lido-' + tema);
    await av(q('[data-voltar-trilha]') + '.click(); 1');
    await vigiar();
    ok(await esperar('window.__cobriu.includes("Instalar no celular")', 5000), 'só depois do "Voltar à trilha" vem o primeiro pedido (instalar no celular)');
    await fecharFolhas();
    // o dia seguinte do plano, lido depois, não festeja como o primeiro
    await av('CC.lerHoje(2); 1');
    await esperar(q('.leitor [data-papel-discreto]'), 10000);
    await av(q('.leitor [data-papel-discreto]') + '.click(); 1');
    await esperar(q('[data-papel-sim]'));
    await av(q('[data-papel-sim]') + '.click(); 1');
    ok(await esperar(q('.dia-lido'), 10000) && !(await av(q('.dia-lido [data-primeiro-dia]'))), 'o dia 2 não repete a festa do primeiro dia');
    await av('location.hash = "#/"; 1');
    await fecharFolhas();
  }

  // ---------- R2.3: pular a festa ----------
  // Lê o dia N no papel e espera o Dia lido.
  const lerNoPapel = async (n) => {
    await av('location.hash = "#/"; 1');
    await esperar('!document.querySelector(".licao:not(.saindo)")', 4000);
    await av('CC.lerHoje(' + n + '); 1');
    await esperar(q('.leitor [data-papel-discreto]'), 10000);
    await av(q('.leitor [data-papel-discreto]') + '.click(); 1');
    await esperar(q('[data-papel-sim]'));
    await av(q('[data-papel-sim]') + '.click(); 1');
    // o Dia lido deste dia (o do dia anterior pode ainda estar saindo da tela)
    return esperar('[...document.querySelectorAll(".licao:not(.saindo) .dia-lido h1")].some((h) => h.textContent === "Dia ' + n + ' lido") && ' + q('[data-voltar-trilha]'), 10000);
  };
  const animacao = (sel) => av('(() => { const el = document.querySelector(' + JSON.stringify(sel) + '); return el ? getComputedStyle(el).animationName : "sem"; })()');
  for (const tema of ['claro', 'escuro']) {
    if (!quer('R2.3')) break;
    await temaDe(tema);
    console.log('\n  R2.3 · Pular a festa\n');
    const t = tema[0];
    // a Vera leu os dias 1 a 7, um por dia, na última semana: 7 dias com a Palavra (veterana)
    const veraC = await conta('vera' + t, 'Vera', { lidos: ate(7), datas: ate(7).map((n) => atras(8 - n)) });
    await entrar(veraC);
    ok(await noInicio(), 'a Vera abre o Início');
    ok(await lerNoPapel(8), 'a Vera lê o dia 8: o Dia lido abre');
    ok(!(await av(q('.dia-lido[data-festa-curta]'))) && await av('!!document.querySelector(".dia-lido .faiscas") && !!document.querySelector(".dia-lido .frase-cena")'),
      'por padrão, a comemoração é completa (faíscas e a frase do dia)');
    ok(await av(q('.dia-lido [data-festa-completa][aria-checked="true"]') + ' !== null') && /Mostrar a comemoração completa/.test(await texto('.dia-lido [data-festa-completa]')),
      'a veterana vê, no pé, "Mostrar a comemoração completa", ligada');
    await av(q('.dia-lido [data-festa-completa]') + '.scrollIntoView({ block: "center" }); 1');
    await capturar('r2.3-preferencia-ligada-' + tema);
    await av(q('.dia-lido [data-festa-completa]') + '.click(); 1');
    ok(await av(q('.dia-lido [data-festa-completa]') + '.getAttribute("aria-checked") === "false" && localStorage.getItem("cc.diaLido.festa") === "curta"'),
      'tocar desliga a preferência (guardada no aparelho)');
    ok(await esperar('/sem a festa/.test(document.body.textContent)', 3000), 'e o app confirma: "daqui para a frente, o Dia lido abre sem a festa"');
    await capturar('r2.3-preferencia-desligada-' + tema);
    ok(await lerNoPapel(9), 'a Vera lê o dia 9');
    ok(await av(q('.dia-lido[data-festa-curta]') + ' !== null'), 'o Dia lido abre sem a festa');
    await dormir(200);
    ok(await av('!document.querySelector(".dia-lido .faiscas") && !document.querySelector(".dia-lido .frase-cena") && !document.querySelector(".confete")'),
      'sem faíscas, sem confete, sem a frase sorteada');
    ok(await av('document.querySelector(".dia-lido .numero-ofensiva").textContent === String(CC.sequencia().atual) && !document.querySelector(".numero-ofensiva.subindo")'),
      'o número da chama já aparece certo, sem subir');
    ok((await animacao('.dia-lido .chama-palco .ico-chama')) === 'none' && (await animacao('.dia-lido .destaque-dia')) === 'none', 'nada entra animado (a chama e o que o dia trouxe)');
    ok(await av('!!document.querySelector(".dia-lido .semana-ofensiva") && !!document.querySelector(".dia-lido .destaques") && !!document.querySelector(".dia-lido [data-cartao=pensar]") && /Dia 9 lido/.test(document.querySelector(".dia-lido h1").textContent)'),
      'o que informa fica: "Dia 9 lido", a chama, a semana, o que o dia trouxe, Pensar e Orar');
    await capturar('r2.3-dia-lido-sem-festa-' + tema);
    await av(q('.dia-lido [data-festa-completa]') + '.click(); 1');
    ok(await av('localStorage.getItem("cc.diaLido.festa") === null'), 'ligar de novo volta ao padrão');
    // o Dia lido do dia 9 pode continuar no documento por baixo: confere o do dia 10 (o último)
    ok(await lerNoPapel(10) && await av('(() => { const d = [...document.querySelectorAll(".dia-lido")].pop(); return /Dia 10 lido/.test(d.querySelector("h1").textContent) && !d.matches("[data-festa-curta]") && !!d.querySelector(".faiscas"); })()'),
      'e o dia 10 tem a comemoração completa');
    await av('location.hash = "#/"; 1');
    // quem ainda não é veterano não vê a preferência, e a festa é sempre completa
    const novoC = await conta('novo' + t, 'Davi', { lidos: [1], data: atras(1) });
    await entrar(novoC);
    ok(await noInicio(), 'o Davi (1 dia com a Palavra) abre o Início');
    await av('localStorage.setItem("cc.diaLido.festa", "curta"); 1');
    ok(await lerNoPapel(2), 'o Davi lê o dia 2');
    ok(!(await av(q('.dia-lido [data-festa-completa]'))) && !(await av(q('.dia-lido[data-festa-curta]'))) && await av('!!document.querySelector(".dia-lido .faiscas")'),
      'quem ainda não é veterano não vê a preferência, e a festa é completa (mesmo com a marca no aparelho)');
    await av('localStorage.removeItem("cc.diaLido.festa"); location.hash = "#/"; 1');
  }

  // ---------- R2.2b: o dia 0 ----------
  for (const tema of ['claro', 'escuro']) {
    if (!quer('R2.2b')) break;
    await temaDe(tema);
    console.log('\n  R2.2b · O dia 0\n');
    const t = tema[0];
    const zeroC = await conta('zero' + t, 'Lia');
    await cmd('Page.navigate', { url: base + '/entrar.html' });
    await dormir(300);
    await av('localStorage.clear(); sessionStorage.clear(); localStorage.setItem("cc.instalar", "1"); 1');
    await entrar(zeroC, { limpar: false });
    await esperar(q('.folha-topo'), 20000);
    ok(await esperar(q('.folha-topo [data-dia-zero]'), 10000), 'conta nova: o Início mostra o dia 0');
    const cartao = await texto('.folha-topo [data-dia-zero]');
    ok(/Comece aqui: No começo/.test(cartao) && /Gênesis\s1\.1-31\se\sGênesis\s2\.1-3, uns 4 minutos, antes do dia 1/.test(cartao), 'o convite diz o trecho e o tempo (' + cartao + ')');
    ok(await av('document.querySelector(".folha-topo [data-dia-zero]").nextElementSibling === document.querySelector(".folha-topo .ler-hoje") && document.querySelector(".folha-topo [data-ler-hoje]").dataset.lerHoje === "1"'),
      'vem antes do "Ler hoje", que continua no dia 1 do plano');
    await dormir(2500);
    await fecharFolhas();
    await capturar('r2.2b-inicio-' + tema, true);
    await av(q('[data-dia-zero]') + '.click(); 1');
    ok(await esperar(q('.tela-dia-zero [data-ler-zero]')), 'tocar abre o dia 0');
    ok(/Antes do dia 1 · uns 4 minutos/.test(await texto('.tela-dia-zero .dia-zero')) && /No começo/.test(await texto('.tela-dia-zero h1')) && await av('!!document.querySelector(".tela-dia-zero .onde-estamos, .tela-dia-zero [class*=onde]")'),
      'com o título, a abertura e o "Onde estamos" do dia 1 do Conhecer Jesus');
    await av('document.querySelector(".tela-dia-zero .tela-cheia-palco").scrollTop = 0; 1');
    await capturar('r2.2b-antes-' + tema);
    await av(q('.tela-dia-zero [data-ler-zero]') + '.click(); 1');
    ok(await esperar(q('.leitor .leitor-verso'), 10000), 'o leitor abre com o texto');
    await av(q('.leitor [data-terminei]') + '.click(); 1');
    await dormir(300);
    ok(await av('!CC.ler("diaZero") && !!document.querySelector(".leitor:not(.saindo)")'), 'a regra de leitura vale: "Terminei a leitura" logo de cara não conta');
    // o fim do texto e um terço do tempo (o gancho de teste do leitor, o mesmo do teste-fluxo-dia)
    await av('CC.portaoDoLeitor().concluir(); 1');
    await av(q('.leitor [data-terminei]') + '.click(); 1');
    ok(await esperar(q('.tela-dia-zero [data-dia-zero-feito]'), 8000), 'lido até o fim e com o tempo, "Terminei a leitura" conta o dia 0');
    const festa = await texto('.tela-dia-zero [data-dia-zero-feito]');
    ok(/Seu primeiro dia com a Palavra!/.test(festa) && /A chama acendeu: 1 dia\./.test(festa) && /um dia de cada vez, Lia\./.test(festa), 'a festa do primeiro dia (' + festa + ')');
    ok(/Amanhã: Dia 1 do plano/.test(await texto('.tela-dia-zero [data-amanha-zero]')), 'e o que vem amanhã: o dia 1 do plano');
    ok(await av('CC.ler("diaZero") === CC.hojeIso() && !CC.ler("lidos").length && CC.sequencia().atual === 1 && CC.diasComAPalavra() === 1 && CC.diaAtual() === 1'),
      'no aparelho: o dia 0 com a data de hoje, nenhum dia do plano lido, a chama em 1, 1 dia com a Palavra, e o plano no dia 1');
    await vigiar();
    await dormir(2500);
    // a própria tela do dia 0 é uma tela cheia: conta tudo o que não é ela
    ok(await av('window.__cobriu.filter((n) => !/^Dia 0/.test(n)).length === 0'), 'nada abre por cima da festa (' + await av('JSON.stringify(window.__cobriu)') + ')');
    await capturar('r2.2b-festa-' + tema);
    await av(q('.tela-dia-zero [data-voltar-zero]') + '.click(); 1');
    ok(await esperar('window.__cobriu.includes("Instalar no celular")', 5000), 'só depois do "Voltar à trilha" vem o primeiro pedido');
    await fecharFolhas();
    ok(await esperar('!' + q('.folha-topo [data-dia-zero]'), 5000) && await esperar(q('.folha-topo [data-ler-hoje="1"]')), 'no Início, o dia 0 sai e a leitura de hoje é o dia 1');
    await av('CC.salvarNoServidor()');
    await dormir(400);
    const noServidor = await estadoDe(zeroC);
    ok(noServidor.diaZero === await av('CC.hojeIso()') && !(noServidor.lidos || []).length, 'no servidor: o dia 0 com a data de hoje, nenhum dia do plano');
    // o dia 1, lido no mesmo dia, não repete a festa do primeiro dia
    await av('CC.lerHoje(1); 1');
    await esperar(q('.leitor [data-papel-discreto]'), 10000);
    await av(q('.leitor [data-papel-discreto]') + '.click(); 1');
    await esperar(q('[data-papel-sim]'));
    await av(q('[data-papel-sim]') + '.click(); 1');
    ok(await esperar(q('.dia-lido'), 10000) && !(await av(q('.dia-lido [data-primeiro-dia]'))), 'o dia 1 depois do dia 0 não repete a festa do primeiro dia');
    await av('location.hash = "#/"; 1');
    // quem já leu o dia 1 (ou tem qualquer data com a Palavra) não vê o dia 0
    const jaC = await conta('ja' + t, 'Rui', { lidos: [1] });
    await entrar(jaC);
    ok(await noInicio(), 'quem já leu o dia 1 abre o Início');
    await dormir(800);
    ok(!(await av(q('.folha-topo [data-dia-zero]'))), 'e não vê o dia 0');
  }

  // ---------- R2.4: integridade do progresso ----------
  const bloquear = async (re) => { bloqueadas = re; await cmd('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] }); };
  const desbloquear = async () => { bloqueadas = null; await cmd('Fetch.disable'); };
  const semRede = (sim) => cmd('Network.emulateNetworkConditions', { offline: sim, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const lidosNoServidor = async (cookie) => ((await estadoDe(cookie)).lidos || []).slice().sort((a, b) => a - b).join();
  // entra pela página de entrada, como quem acabou de pegar um celular novo (nada guardado)
  const entrarPeloFormulario = async (usuario) => {
    await cmd('Network.clearBrowserCookies');
    await cmd('Page.navigate', { url: base + '/entrar.html' });
    await esperar(q('#form-entrar'), 10000);
    await av('localStorage.clear(); sessionStorage.clear(); 1');
    await av('document.getElementById("login").value = ' + JSON.stringify(usuario) + '; document.getElementById("senha-entrar").value = ' + JSON.stringify('senha-' + usuario)
      + '; document.getElementById("form-entrar").requestSubmit(); 1');
  };
  for (const tema of ['claro', 'escuro']) {
    if (!quer('R2.4')) break;
    await temaDe(tema);
    console.log('\n  R2.4 · Integridade do progresso\n');
    const t = tema[0];

    // 1. a primeira abertura depois de entrar, sem alcançar o servidor: o que se lê fica
    const filaC = await conta('fila' + t, 'Fia');
    await bloquear(/\/api\/(quem|estado)/);
    await entrarPeloFormulario('fila' + t);
    ok(await esperar(q('.folha-topo') + ' && typeof CC !== "undefined"', 20000), 'entra e o app abre sem alcançar o servidor');
    await dormir(1500);
    await av('CC.marcarLido(1, "papel"); 1');
    ok(await av('CC.leu(1)'), 'lê o dia 1 sem servidor');
    await desbloquear();
    await abrir();
    ok(await esperar(q('.folha-topo') + ' && CC.quem', 20000), 'o servidor volta e o app abre de novo');
    await dormir(1500);
    ok(await av('CC.leu(1)'), 'o dia lido sem servidor continua lá (antes, a primeira sincronização o apagava)');
    await av('CC.salvarNoServidor()');
    await dormir(500);
    ok((await lidosNoServidor(filaC)) === '1', 'e chega ao servidor');

    // 2. a rede volta com o app aberto: a leitura vai sem esperar a próxima abertura
    await fecharFolhas();
    await semRede(true);
    await dormir(300);
    await av('CC.marcarLido(2, "papel"); 1');
    await dormir(1200);
    ok((await lidosNoServidor(filaC)) === '1', 'sem rede, o dia 2 fica no aparelho');
    await semRede(false);
    ok(await esperar('true', 10) && await (async () => { for (let i = 0; i < 40; i++) { if ((await lidosNoServidor(filaC)) === '1,2') return true; await dormir(250); } return false; })(),
      'a rede volta e o dia 2 chega ao servidor sozinho, com o app aberto');

    // 3. fechar o app logo depois de marcar: a leitura não fica para trás
    await av('CC.marcarLido(3, "papel"); 1');
    await cmd('Page.navigate', { url: 'about:blank' });
    let chegou = false;
    for (let i = 0; i < 20 && !chegou; i++) { chegou = (await lidosNoServidor(filaC)) === '1,2,3'; if (!chegou) await dormir(250); }
    ok(chegou, 'fechar o app logo depois de marcar não deixa a leitura para trás');

    // 4. sair da conta sem rede: o app avisa antes de perder o que não chegou ao servidor
    await abrir();
    ok(await esperar(q('.folha-topo') + ' && CC.quem', 20000), 'abre de novo');
    await dormir(1200);
    await fecharFolhas();
    await semRede(true);
    await dormir(300);
    await av('CC.marcarLido(4, "papel"); 1');
    await av('location.hash = "#/config"; 1');
    ok(await esperar(q('[data-sair]'), 8000), 'as Configurações abrem');
    await av(q('[data-sair]') + '.click(); 1');
    ok(await esperar('/ainda não chegou ao servidor/.test(document.body.textContent)', 6000), 'sem rede, sair avisa que o que foi lido ainda não chegou ao servidor');
    await dormir(600);
    ok(await av('document.querySelectorAll(".cortina:not(.saindo)").length === 1 && document.querySelector(".cortina:not(.saindo) h2").textContent === "Sem conexão agora" && /Sair mesmo assim/.test(document.querySelector(".cortina:not(.saindo)").textContent)'),
      'numa folha só, que fica na tela: "Sem conexão agora", com "Sair mesmo assim" e "Cancelar"');
    await capturar('r2.4-sair-sem-rede-' + tema);
    await av('[...document.querySelectorAll(".cortina [data-nao]")].pop().click(); 1');
    await dormir(600);
    ok(await av('CC.leu(4) && location.hash === "#/config"'), '"Cancelar" fica na conta, com o dia 4 no aparelho');
    await semRede(false);
    let quatro = false;
    for (let i = 0; i < 40 && !quatro; i++) { quatro = (await lidosNoServidor(filaC)) === '1,2,3,4'; if (!quatro) await dormir(250); }
    ok(quatro, 'com a rede de volta, o dia 4 chega ao servidor');
    // com rede, sair manda antes e não pergunta nada
    await av('CC.marcarLido(5, "papel"); 1');
    await av(q('[data-sair]') + '.click(); 1');
    await esperar(q('.cortina [data-sim]'));
    await av(q('.cortina [data-sim]') + '.click(); 1');
    ok(await esperar('location.pathname.endsWith("entrar.html")', 10000), 'com rede, sair vai direto para a entrada');
    ok((await lidosNoServidor(filaC)) === '1,2,3,4,5', 'e o dia 5, marcado logo antes, chegou ao servidor');

    // 5. celular novo: entrar traz o progresso de volta sozinho
    const antes = await estadoDe(filaC);
    await entrarPeloFormulario('fila' + t);
    ok(await esperar(q('.folha-topo') + ' && CC.quem', 20000), 'no celular novo, entrar abre o app');
    // os cinco dias foram lidos hoje: o alto mostra o dia 5 lido, e o plano segue no dia 6
    ok(await esperar(q('.folha-topo [data-rever-dia="5"]'), 10000) && await av('CC.ler("lidos").length === 5 && CC.diaAtual() === 6 && CC.diasComAPalavra() === ' + CC_DIAS(antes) + ' && CC.sequencia().atual === 1'),
      'o progresso volta sozinho: os 5 dias lidos, o plano no dia 6, a chama e os dias com a Palavra');
    await dormir(2500);
    await fecharFolhas();
    await capturar('r2.4-celular-novo-' + tema, true);
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
