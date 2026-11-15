// A chama que perdoa (R1, docs/fases/r1-chama-que-perdoa.md) num Chrome sem interface, a 390x844.
// R1.1, "dias com a Palavra": o total da vida (app e papel) aparece em destaque na folha de volta
// depois de uma falta (no lugar de qualquer zero), no cartão da chama do Início e na folha da
// chama; ler hoje soma, ler no papel na mesma data não conta duas vezes, e o "Zerar" não o apaga
// (nem no aparelho, nem no servidor).
// R1.2, semanas completas: com o "hoje" do app numa sexta-feira e três semanas de 5 dias atrás, a
// folha da chama diz "3" e "Esta semana: 4 de 5 dias", o Perfil mostra os dois números que nunca
// caem ao lado da ofensiva, e ler o 5º dia da semana (no papel) festeja a semana completa no Dia lido.
// R1.3, escudo usado sozinho: quem faltou ontem e tem escudo abre o app com a chama acesa e um aviso
// gentil (uma vez só), sem fazer nada; o escudo do iniciante avisa como tal.
// Uso: node ferramentas/teste-chama.mjs   (PORTA=<n> troca a porta; CHROME=<caminho>;
// CAPTURAS=<pasta> guarda as capturas, nos temas claro e escuro, uma subpasta por parte: R1.1, R1.2...)
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
async function contaComFalta(usuario, semEstado, marcadoEm) {
  const r = await fetch(base + '/api/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario, nome: 'Joana', senha: 'senha-' + usuario, email: usuario + '@teste.com', nascimento: '2008-04-05', consentimento: true }) });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  if (!r.ok) throw new Error('não criou a conta: ' + r.status + ' ' + await r.text());
  if (semEstado) return cookie;
  if (!marcadoEm) {
    marcadoEm = {};
    for (let n = 1; n <= 4; n++) marcadoEm[n] = atras(8 - n);
    marcadoEm[5] = marcadoEm[6] = atras(4);
  }
  const lidos = Object.keys(marcadoEm).map(Number);
  const estado = { atualizadoEm: Date.now(), dia: lidos.length + 1, lidos, marcadoEm, origens: { 5: 'papel', 6: 'papel' }, apelido: 'Joana' };
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
    // cada parte da fase na sua pasta: r1.2-folha-claro vai para CAPTURAS/R1.2/
    const pastaDaParte = join(CAPTURAS, nome.split('-')[0].toUpperCase());
    mkdirSync(pastaDaParte, { recursive: true });
    writeFileSync(join(pastaDaParte, nome + '.png'), Buffer.from(data, 'base64'));
  };
  if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cmd('Network.enable');

  const temaDe = async (nome) => {
    console.log('\n  tema ' + nome);
    await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: nome === 'escuro' ? 'dark' : 'light' }] });
  };
  const entrar = async (cookie) => {
    const [nome, valor] = cookie.split('=');
    await cmd('Network.clearBrowserCookies');
    await cmd('Network.setCookie', { name: nome, value: valor, url: base });
    await cmd('Network.setCookie', { name: 'cc_logado', value: '1', url: base });
    // about:blank antes: navegar para o mesmo endereço com # não recarrega a página
    await cmd('Page.navigate', { url: 'about:blank' });
    await dormir(300);
    await cmd('Page.navigate', { url: base + '/#/' });
  };

  for (const tema of ['claro', 'escuro']) {
    await temaDe(tema);
    await entrar(await contaComFalta('joana' + tema));

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
    ok(!(await av('!!' + q('.folha-ofensiva .linha-vida[data-dias-palavra]'))), 'e a linha de baixo não repete o número');
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

  // ---------- R1.2: semanas completas ----------
  // O "hoje" do app vira a sexta 13/11/2026; as leituras ficam nas semanas de 19/10, 26/10 e 2/11
  // (5 dias cada, de segunda a sexta) e de segunda a quinta desta semana (4 dias).
  const HOJE = '2026-11-13';
  const SEMANAS = ['2026-10-19', '2026-10-26', '2026-11-02'];
  const seMarca = [];
  for (const seg of SEMANAS) for (let i = 0; i < 5; i++) seMarca.push(new Date(Date.parse(seg + 'T12:00:00Z') + i * 864e5).toISOString().slice(0, 10));
  for (let i = 0; i < 4; i++) seMarca.push(new Date(Date.parse('2026-11-09T12:00:00Z') + i * 864e5).toISOString().slice(0, 10));
  const marcado = Object.fromEntries(seMarca.map((d, i) => [i + 1, d]));
  for (const tema of ['claro', 'escuro']) {
    await temaDe(tema);
    await entrar(await contaComFalta('semana' + tema, true));
    ok(await esperar(q('.folha-topo'), 20000), 'conta nova abre o Início');
    await esperar('!document.getElementById("abertura")', 15000);
    await dormir(600);
    await fecharFolhas();
    await av('CC.hojeIso = () => ' + JSON.stringify(HOJE) + '; CC.gravar("marcadoEm", ' + JSON.stringify(marcado) + '); CC.gravar("lidos", ' + JSON.stringify(Object.keys(marcado).map(Number)) + '); CC.gravar("dia", 20); CC.redesenhar(); 1');
    ok(await av('CC.semanasCompletas() === 3 && CC.diasNaSemana() === 4 && CC.diasComAPalavra() === 19'), 'três semanas de 5 dias e 4 dias nesta semana: 3 semanas completas, 19 dias com a Palavra');
    await av('CC.folhaOfensiva(); 1');
    ok(await esperar(q('.folha-ofensiva .linha-vida[data-semanas-completas="3"]')), 'a folha da chama mostra "Semanas completas: 3"');
    ok(/Esta semana: 4 de 5 dias\./.test(await texto('.folha-ofensiva [data-semanas-completas]')), 'com a semana de agora: "Esta semana: 4 de 5 dias."');
    await av('document.querySelector(".folha-ofensiva [data-semanas-completas]").scrollIntoView({ block: "center" }); 1');
    await capturar('r1.2-folha-' + tema);
    await fecharFolhas();

    // o Perfil: os números que nunca caem ao lado da ofensiva
    await av('location.hash = "#/perfil"; 1');
    ok(await esperar(q('.visao-item[data-semanas-completas="3"]')) && await av('!!' + q('.visao-item[data-dias-palavra="19"]')), 'o Perfil mostra 19 dias com a Palavra e 3 semanas completas ao lado da ofensiva');
    ok(/3semanas completas/.test((await texto('.visao-item[data-semanas-completas]')).replace(/\s+/g, '')
      .replace('semanascompletas', 'semanas completas')), 'com o rótulo "semanas completas"');
    await av('(CC.rolarPara ? CC.rolarPara(document.querySelector(".visao-geral").getBoundingClientRect().top + scrollY - 120) : 0), 1');
    await capturar('r1.2-perfil-' + tema);
    await av(q('.visao-item[data-semanas-completas]') + '.click(); 1');
    ok(await esperar(q('.folha-ofensiva')), 'tocar no número abre a folha da chama');
    await fecharFolhas();

    // o 5º dia da semana, lido no papel, festeja a semana completa
    await av('location.hash = "#/"; 1');
    await esperar(q('.folha-topo'));
    await av('CC.lerHoje(20); 1');
    ok(await esperar(q('.leitor [data-papel-discreto]'), 10000), 'o leitor do dia 20 abre');
    await av(q('.leitor [data-papel-discreto]') + '.click(); 1');
    ok(await esperar(q('[data-papel-sim]')), '"Li na minha Bíblia" pede a confirmação');
    await av(q('[data-papel-sim]') + '.click(); 1');
    ok(await esperar(q('.dia-lido [data-semana-completa]'), 10000), 'o Dia lido festeja a semana completa');
    const festa = await texto('.dia-lido .destaque-dia:has([data-semana-completa])');
    ok(/Semana completa!/.test(festa) && /Já são 4 semanas completas\./.test(festa), 'com "Semana completa!" e "Já são 4 semanas completas." (' + festa + ')');
    await av('document.querySelector(".dia-lido [data-semana-completa]").scrollIntoView({ block: "center" }); 1');
    await capturar('r1.2-dia-lido-' + tema);
    // o círculo de "Amanhã" (e o de "Você voltou!", com a mesma regra) no tamanho cheio, 48px:
    // a regra antiga ".arte-destaque > span" o encolhia a 45%. Cada linha do resumo entra com a
    // animação "pop" (de scale(.5) a 1, com atraso): medida no meio dela, a caixa dá 24px. Espera a
    // entrada da linha terminar antes de medir o tamanho que fica na tela.
    const amanha = await av('(async () => { const el = document.querySelector(".dia-lido .arte-destaque > .arte-amanha"); if (!el) return 0; el.scrollIntoView({ block: "center" });'
      + ' await Promise.all(el.closest(".destaque-dia").getAnimations().map((a) => a.finished)); return Math.round(el.getBoundingClientRect().width); })()');
    ok(amanha >= 46, 'o ícone de "Amanhã" no Dia lido tem o tamanho cheio (' + amanha + 'px)');
    await capturar('icone-dia-lido-' + tema);
    await av('location.hash = "#/"; 1');
    await esperar('!document.querySelector(".licao:not(.saindo)")');
    await av('CC.folhaOfensiva(); 1');
    ok(await esperar(q('.folha-ofensiva .linha-vida[data-semanas-completas="4"]')) && /Esta semana já está completa!/.test(await texto('.folha-ofensiva [data-semanas-completas]')),
      'depois, a folha diz 4 semanas e "Esta semana já está completa!"');
    await fecharFolhas();
    await av('CC.marcarLido(21); 1');
    ok(await av('CC.semanasCompletas() === 4 && CC.diasNaSemana() === 5'), 'ler de novo no mesmo dia não conta outra semana');
  }

  // ---------- R1.3: o escudo usado sozinho ----------
  // 11 dias seguidos até anteontem, ontem em branco, hoje ainda não lido. O servidor só aceita
  // leitura com até 7 dias de atraso: as datas mais velhas entram pelo aparelho (CC.gravar), que
  // fica com a data mais antiga na fusão, e a abertura seguinte é a de verdade.
  const voltarAoApp = async () => {
    await cmd('Page.navigate', { url: 'about:blank' });
    await dormir(300);
    await cmd('Page.navigate', { url: base + '/#/' });
  };
  const onzeDias = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i + 1, atras(12 - i)]));
  for (const tema of ['claro', 'escuro']) {
    await temaDe(tema);
    await entrar(await contaComFalta('escudo' + tema, true));
    ok(await esperar(q('.folha-topo'), 20000), 'conta nova abre o Início');
    await esperar('!document.getElementById("abertura")', 15000);
    await dormir(600);
    await fecharFolhas();
    await av('CC.gravar("marcadoEm", ' + JSON.stringify(onzeDias) + '); CC.gravar("lidos", ' + JSON.stringify(Object.keys(onzeDias).map(Number)) + '); CC.gravar("dia", 12); CC.salvarNoServidor().then(() => 1)');
    await voltarAoApp();
    ok(await esperar(q('[data-escudo-usado="1"]'), 20000), 'faltou ontem e tinha escudo: na abertura, o aviso do escudo, sem a pessoa fazer nada');
    const aviso = await texto('[data-escudo-usado]');
    ok(/Um escudo cuidou da sua chama/.test(aviso) && /Ontem ficou em branco, e o app usou um escudo por você\./.test(aviso) && /A chama segue acesa: 11 dias seguidos\./.test(aviso),
      'o aviso é gentil: "Ontem ficou em branco, e o app usou um escudo por você. A chama segue acesa: 11 dias seguidos."');
    ok(/Ainda resta 1 escudo\./.test(aviso) && await av('!!document.querySelector(".folha [data-ler]") && !!document.querySelector(".folha [data-fechar]")'), 'diz quantos escudos restam e oferece "Ler hoje" ou "Agora não"');
    ok(await av('CC.sequencia().atual === 11 && CC.sequencia().protegidos.includes(' + JSON.stringify(atras(1)) + ')'), 'a chama segue com 11 dias, e ontem está coberto');
    await dormir(1500);
    const cortinas = await av('[...document.querySelectorAll(".cortina .folha")].map((f) => f.getAttribute("aria-label") || f.className).join(" + ")');
    // o convite de notificações da partida (10-roteador.js, antes dos avisos do dia) pode estar por
    // baixo, como já ficava com a folha de volta; por cima do aviso não abre nada
    ok(cortinas.split(' + ').pop() === 'Escudo usado', 'nenhuma outra folha abre por cima do aviso (' + cortinas + ')');
    await capturar('r1.3-escudo-' + tema);
    await av(q('.folha [data-fechar]') + '.click(); 1');
    await voltarAoApp();
    await esperar(q('.folha-topo'), 20000);
    await dormir(2500);
    ok(!(await av('!!' + q('[data-escudo-usado]'))), 'o aviso aparece uma vez só');
    await fecharFolhas();
    await av('CC.folhaOfensiva(); 1');
    ok(await esperar(q('.folha-ofensiva .bolinha.escudo')) && /o app usa um sozinho/.test(await texto('.folha-ofensiva .linha-escudos')),
      'na folha da chama, ontem tem o escudo, e o texto diz que o app usa um sozinho');
    await capturar('r1.3-folha-' + tema);
    await fecharFolhas();
  }

  // o escudo do iniciante: leu 3 dias na primeira semana e faltou 2
  await temaDe('claro');
  await entrar(await contaComFalta('iniciante', false, { 1: atras(5), 2: atras(4), 3: atras(3) }));
  ok(await esperar(q('[data-escudo-usado="2"]'), 20000), 'na primeira semana, dois dias em branco: o escudo do iniciante cobre e avisa');
  const doIniciante = await texto('[data-escudo-usado]');
  ok(/O escudo do iniciante cuidou da chama/.test(doIniciante) && /Dois dias ficaram em branco, e ele cobriu sem gastar os seus escudos\./.test(doIniciante)
    && /3 dias seguidos/.test(doIniciante) && /Ainda resta 1 escudo\./.test(doIniciante), 'com o texto do escudo do iniciante (' + doIniciante.replace(/\s+/g, ' ') + ')');
  await capturar('r1.3-iniciante-claro');
  await fecharFolhas();
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
