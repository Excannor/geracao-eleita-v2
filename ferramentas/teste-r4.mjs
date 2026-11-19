// A fase R4, "Ler junto na célula" (docs/r4-celula.md, docs/fases/r4-celula.md), num servidor
// descartável e num Chrome sem interface, a 390x844, nos temas claro e escuro. Cresce a cada item.
// R4.2, a lista de oração da célula:
// - segurança no servidor: o visitante não lê nem escreve; quem é de outra célula não lê (404);
//   o membro não age pelo id num pedido só para quem conduz; texto com telefone, e-mail, link, @
//   ou endereço é recusado e nada é gravado; ninguém recebe o nome de quem está orando;
// - "Estou orando" um por pessoa, que se desfaz; atualizações só do autor; Respondidas para quem
//   via o pedido; quem conduz tira sem denúncia; o app antigo ("orei") continua funcionando;
// - a aba Oração (peça "oracao"): a contagem sem nomes, as atualizações, Respondidas, "Estou
//   orando" que liga e desliga, o erro do filtro na folha, o "Tirar" de quem conduz, o texto
//   escapado e nada passando da largura da tela.
// Uso: node ferramentas/teste-r4.mjs   (PORTA=<n>; CHROME=<caminho>; CAPTURAS=<pasta>; PARTES=R4.2)
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
const PARTES = (process.env.PARTES || '').split(',').filter(Boolean);
const quer = (parte) => !PARTES.length || PARTES.includes(parte);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pasta = mkdtempSync(join(tmpdir(), 'cc-r4-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json'), CAMINHO_TESTE: '1' }, stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const perfil = mkdtempSync(join(tmpdir(), 'cc-r4-nav-'));
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

const pedir = async (rota, corpo, cookie) => {
  const r = await fetch(base + rota, {
    method: corpo ? 'POST' : 'GET',
    headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  // sempre lê o corpo: uma resposta não consumida pode prender a conexão
  return { status: r.status, dado: await r.json().catch(() => ({})) };
};
async function conta(usuario, nome, { celula = '', visitante = false, nascimento = '2009-04-05' } = {}) {
  const r = await fetch(base + '/api/criar-conta', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario, nome, senha: 'senha-' + usuario, email: usuario + '@teste.com', nascimento, consentimento: true,
      fuso: Intl.DateTimeFormat().resolvedOptions().timeZone, ...(celula ? { celula, celulaVisitante: visitante } : {}) }),
  });
  if (!r.ok) throw new Error('não criou a conta: ' + r.status + ' ' + await r.text());
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const cuidado = (corpo, cookie) => pedir('/api/cuidado', corpo, cookie);
const lista = (celula, cookie) => pedir('/api/cuidado?celula=' + encodeURIComponent(celula), null, cookie);

try {
  const ws = new WebSocket(await alvo());
  let seq = 0;
  const pend = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
  });
  await new Promise((r) => ws.addEventListener('open', r));
  const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
  const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  const esperar = async (expr, ms = 10000) => { for (let t = 0; t < ms; t += 120) { if (await av(expr)) return true; await dormir(120); } return false; };
  const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
  const texto = (sel) => av('(' + q(sel) + ' || {}).innerText || ""');
  const fecharFolhas = () => av('document.querySelectorAll(".cortina, .tela-cheia").forEach((c) => c.remove()); 1');
  const capturar = async (nome, alto = false) => {
    if (!CAPTURAS) return;
    await dormir(700);
    if (alto) { await av('scrollTo(0, 0), 1'); await dormir(400); }
    const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
    const pastaDaParte = join(CAPTURAS, nome.split('-')[0].toUpperCase());
    mkdirSync(pastaDaParte, { recursive: true });
    writeFileSync(join(pastaDaParte, nome + '.png'), Buffer.from(data, 'base64'));
  };
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cmd('Network.enable');
  await cmd('Page.enable');
  const temaDe = async (nome) => {
    console.log('\n  tema ' + nome);
    await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: nome === 'escuro' ? 'dark' : 'light' }] });
  };
  const entrar = async (cookie) => {
    const [nome, valor] = cookie.split('=');
    await cmd('Page.navigate', { url: base + '/entrar.html' });
    await dormir(300);
    await av('localStorage.clear(); sessionStorage.clear(); 1');
    await cmd('Network.clearBrowserCookies');
    await cmd('Network.setCookie', { name: nome, value: valor, url: base });
    await cmd('Network.setCookie', { name: 'cc_logado', value: '1', url: base });
    await cmd('Page.navigate', { url: 'about:blank' });
    await dormir(300);
    await cmd('Page.navigate', { url: base + '/#/' });
    const pronto = await esperar(q('.folha-topo') + ' && CC.quem', 20000);
    await dormir(2500);
    await fecharFolhas();
    await dormir(300);
    await fecharFolhas();
    return pronto;
  };
  // o tom pedido pelo dono, em tudo o que a tela mostra
  const semExagero = (t) => !/[—–!]|jornada|mergulh|poderos|incrível/i.test(t);

  if (quer('R4.2')) {
    for (const tema of ['claro', 'escuro']) {
      await temaDe(tema);
      const t = tema[0];
      console.log('\n  R4.2 · Lista de oração da célula: o servidor\n');
      // o líder é adulto (o menor de 18 só lidera com aprovação); os membros têm 17 anos
      const lider = await conta('lu' + t, 'Lucas', { nascimento: '1990-01-01' });
      const ID = (await pedir('/api/celula', { acao: 'criar', titulo: 'Célula Videira' }, lider)).dado.proposito.id;
      const token = new URL((await pedir('/api/celula', { acao: 'link', id: ID }, lider)).dado.link).searchParams.get('celula');
      const ana = await conta('an' + t, 'Ana', { celula: token });
      const bruno = await conta('br' + t, 'Bruno', { celula: token });
      const carla = await conta('ca' + t, 'Carla', { celula: token });
      const visita = await conta('vi' + t, 'Vitor', { celula: token, visitante: true });
      const fora = await conta('fo' + t, 'Fábio', { nascimento: '1990-01-01' });
      await pedir('/api/celula', { acao: 'criar', titulo: 'Outra célula' }, fora);

      // ---------- segurança ----------
      ok((await lista(ID, visita)).status === 403, 'o visitante não lê a lista de oração (403)');
      ok((await cuidado({ acao: 'criar', celula: ID, tipo: 'oracao', destino: 'celula', texto: 'quero orar', dias: 7 }, visita)).status === 403, 'o visitante não cria pedido (403)');
      ok((await lista(ID, fora)).status === 404, 'quem é de outra célula não lê a lista (404, não descobre que ela existe)');
      ok((await cuidado({ acao: 'criar', celula: ID, tipo: 'oracao', destino: 'celula', texto: 'quero orar', dias: 7 }, fora)).status === 404, 'quem é de outra célula não cria pedido (404)');
      const barrados = [['me liga 11 98765-4321', 'telefone'], ['escreve para ana@gmail.com', 'e-mail'], ['olha www.site.com.br', 'link'],
        ['me segue @ana_b', '@'], ['moro na Rua das Flores, 120', 'endereço']];
      for (const [texto, rotulo] of barrados) {
        const r = await cuidado({ acao: 'criar', celula: ID, tipo: 'oracao', destino: 'celula', texto, dias: 7 }, ana);
        ok(r.status === 400 && /antes de enviar/.test(r.dado.erro), 'pedido com ' + rotulo + ' é recusado (' + r.status + ', ' + r.dado.erro + ')');
      }
      ok(!(await lista(ID, ana)).dado.pedidos.length, 'nada do que foi recusado ficou gravado');

      const prova = (await cuidado({ acao: 'criar', celula: ID, tipo: 'oracao', destino: 'celula', texto: 'Pela prova de matemática de sexta. <b>Estou</b> nervosa.', dias: 30 }, ana)).dado.id;
      const reservado = (await cuidado({ acao: 'criar', celula: ID, tipo: 'oracao', destino: 'conduz', texto: 'Uma conversa difícil em casa', dias: 7 }, ana)).dado.id;
      const avo = (await cuidado({ acao: 'criar', celula: ID, tipo: 'oracao', destino: 'celula', texto: 'Pela saúde da minha avó', dias: 30 }, bruno)).dado.id;
      const carona = (await cuidado({ acao: 'criar', celula: ID, tipo: 'necessidade', destino: 'celula', texto: 'Carona para o encontro de quinta', dias: 7 }, bruno)).dado.id;
      const emprego = (await cuidado({ acao: 'criar', celula: ID, tipo: 'oracao', destino: 'celula', texto: 'Pelo emprego do meu pai', dias: 30 }, carla)).dado.id;
      ok(prova && reservado && avo && carona && emprego, 'os membros criam os pedidos');

      ok((await cuidado({ acao: 'orando', id: reservado, sim: true }, bruno)).status === 404, 'o membro não ora pelo id num pedido só para quem conduz (404)');
      ok((await cuidado({ acao: 'denunciar', id: reservado, motivo: 'É ofensivo' }, bruno)).status === 404, 'nem denuncia esse pedido pelo id');
      ok((await cuidado({ acao: 'orando', id: prova, sim: true }, visita)).status === 404, 'o visitante não ora pelo id (404)');
      ok((await cuidado({ acao: 'orando', id: prova, sim: true }, fora)).status === 404, 'quem é de fora não ora pelo id (404)');

      await cuidado({ acao: 'orando', id: prova, sim: true }, bruno);
      await cuidado({ acao: 'orando', id: prova, sim: true }, bruno);
      await cuidado({ acao: 'orei', id: prova }, carla);
      await cuidado({ acao: 'orando', id: prova, sim: true }, lider);
      await cuidado({ acao: 'orando', id: prova, sim: false }, lider);
      await cuidado({ acao: 'orando', id: avo, sim: true }, carla);
      await cuidado({ acao: 'orando', id: reservado, sim: true }, lider);
      const daAna = (await lista(ID, ana)).dado;
      const pProva = daAna.pedidos.find((x) => x.id === prova);
      ok(pProva && pProva.orando === 2, 'a Ana vê 2 pessoas orando pelo pedido dela (o mesmo duas vezes conta uma; desfazer tira)');
      ok(!/Bruno|Carla|br[ce]|ca[ce]/.test(JSON.stringify(daAna.pedidos.map((x) => ({ orando: x.orando, gestos: x.gestos })))), 'ninguém recebe quem está orando, nem a autora');
      const doBruno = (await lista(ID, bruno)).dado;
      ok(doBruno.pedidos.find((x) => x.id === prova).euOro === true && !doBruno.pedidos.some((x) => x.id === reservado), 'o Bruno vê que está orando, e não vê o pedido só para quem conduz');

      ok((await cuidado({ acao: 'atualizar', id: prova, texto: 'Estudei o fim de semana' }, bruno)).status === 403, 'só a autora atualiza o pedido (403 para os outros)');
      ok((await cuidado({ acao: 'atualizar', id: prova, texto: 'veja https://x.com' }, ana)).status === 400, 'a atualização com link é recusada');
      ok((await cuidado({ acao: 'atualizar', id: prova, texto: 'Estudei o fim de semana inteiro.' }, ana)).status === 200, 'a Ana escreve uma atualização');
      await cuidado({ acao: 'atualizar', id: prova, texto: 'A prova mudou para segunda.' }, ana);
      ok((await cuidado({ acao: 'respondido', id: emprego, texto: 'Ele começou no emprego novo hoje.' }, carla)).status === 200, 'a Carla marca "Deus respondeu" com como foi');
      const daAna2 = (await lista(ID, ana)).dado;
      ok(daAna2.pedidos.find((x) => x.id === prova).atualizacoes.map((u) => u.texto).join('|') === 'A prova mudou para segunda.|Estudei o fim de semana inteiro.', 'as atualizações vêm da mais nova para a mais antiga');
      ok(!daAna2.pedidos.some((x) => x.id === emprego) && daAna2.respondidas.some((x) => x.id === emprego && x.respondidoEm && x.atualizacoes[0].texto === 'Ele começou no emprego novo hoje.'),
        'o pedido respondido sai dos pedidos e vai para Respondidas, para quem o via');
      ok((await cuidado({ acao: 'orando', id: emprego, sim: true }, ana)).status === 409, 'não se ora mais por uma oração respondida (409)');

      ok((await cuidado({ acao: 'tirar', id: avo }, ana)).status === 403, 'a membro não tira o pedido de outra pessoa (403)');
      const tirarAntes = await cuidado({ acao: 'criar', celula: ID, tipo: 'oracao', destino: 'celula', texto: 'Um pedido para tirar', dias: 7 }, carla);
      ok((await cuidado({ acao: 'tirar', id: tirarAntes.dado.id }, lider)).status === 200 && !(await lista(ID, carla)).dado.pedidos.some((x) => x.id === tirarAntes.dado.id),
        'quem conduz tira um pedido sem esperar denúncia, e ele some até para a autora');
      const feed = JSON.stringify((await pedir('/api/novidades', null, bruno)).dado);
      ok(!/matemática|avó|emprego|orando/.test(feed), 'nada da lista de oração vai para o Juntos');

      // ---------- a tela ----------
      console.log('\n  R4.2 · a aba Oração\n');
      ok(await entrar(ana), 'a Ana abre o app');
      await av('location.hash = "#/novidades/celula/' + ID + '/oracao"; 1');
      ok(await esperar(q('.oracao-aba [data-lista-pedidos]'), 15000), 'a aba Oração abre pela peça');
      ok(await av('!!window.CC.oracaoCelula && [...document.scripts].some((s) => /\\/oracao\\.[0-9a-f]{10}\\.js$/.test(s.src))'), 'a tela vem da peça "oracao", pedida quando a aba abre');
      const cartaoProva = '[data-pedido="' + prova + '"]';
      const tProva = await texto(cartaoProva);
      ok(/2 pessoas estão orando/.test(tProva) && !/Bruno|Carla/.test(tProva), 'o pedido da Ana mostra "2 pessoas estão orando", sem nomes (' + tProva.replace(/\n/g, ' / ') + ')');
      ok(/A prova mudou para segunda\./.test(tProva) && /Estudei o fim de semana inteiro\./.test(tProva) && await av('!!' + q(cartaoProva + ' [data-atualizar]')), 'as atualizações aparecem, e a Ana pode atualizar');
      ok(await av('!document.querySelector(".oracao-aba b b") && /<b>Estou<\\/b>/.test(' + q(cartaoProva) + '.innerText)'), 'o texto do pedido aparece escapado, sem virar HTML');
      ok(/Respondidas/.test(await texto('.oracao-aba')) && /Deus respondeu em/.test(await texto('[data-pedido="' + emprego + '"]')) && /Ele começou no emprego novo hoje\./.test(await texto('[data-pedido="' + emprego + '"]')),
        'a lista Respondidas mostra o pedido da Carla com a data e como foi');
      ok(!await av('!!' + q('[data-pedido="' + emprego + '"] [data-orando]')), 'em Respondidas não há "Estou orando"');
      ok(semExagero(await texto('.oracao-aba')), 'a aba não tem exclamação, travessão nem exagero');
      ok(await av('document.documentElement.scrollWidth <= 390'), 'nada passa da largura da tela');
      ok(await av('[...document.querySelectorAll(".oracao-aba button")].filter((b) => b.offsetParent).every((b) => b.getBoundingClientRect().height >= 40)'), 'os botões da aba têm altura de toque');
      await capturar('r4.2-aba-oracao-' + tema, true);
      await av(q('[data-respondidas]') + '.scrollIntoView({ block: "start" }); scrollBy(0, -120); 1');
      await capturar('r4.2-respondidas-' + tema);

      // "Estou orando" no pedido do Bruno: liga e desliga
      const botaoAvo = '[data-pedido="' + avo + '"] [data-orando]';
      ok(/1 pessoa está orando/.test(await texto('[data-pedido="' + avo + '"]')) && /^Estou orando$/.test((await texto(botaoAvo)).trim()), 'o pedido do Bruno: 1 pessoa orando e o botão "Estou orando"');
      await av(q(botaoAvo) + '.click(); 1');
      ok(await esperar('/Você está orando/.test((' + q(botaoAvo) + ' || {}).textContent || "") && ' + q(botaoAvo) + '.getAttribute("aria-pressed") === "true"', 8000)
        && /2 pessoas estão orando/.test(await texto('[data-pedido="' + avo + '"]')), 'tocar em "Estou orando" liga, e a contagem sobe para 2');
      await av(q('[data-pedido="' + avo + '"]') + '.scrollIntoView({ block: "center" }); 1');
      await capturar('r4.2-estou-orando-' + tema);
      await av(q(botaoAvo) + '.click(); 1');
      ok(await esperar('/^Estou orando$/.test(((' + q(botaoAvo) + ' || {}).textContent || "").trim())', 8000), 'tocar de novo desfaz');

      // a folha "Atualizar o pedido"
      await av(q(cartaoProva + ' [data-atualizar]') + '.click(); 1');
      ok(await esperar(q('.folha [data-texto]'), 6000) && /Atualizar o pedido/.test(await texto('.folha')), 'a folha "Atualizar o pedido" abre com o texto do pedido');
      await capturar('r4.2-atualizar-' + tema);
      await fecharFolhas();

      // o erro do filtro na folha de pedido
      await av(q('[data-pedir="oracao"]') + '.click(); 1');
      await esperar(q('.folha [data-texto]'), 6000);
      await av('const c = ' + q('.folha [data-texto]') + '; c.value = "Orem por mim, meu número é 11 98765-4321"; c.dispatchEvent(new Event("input")); ' + q('.folha [data-enviar]') + '.click(); 1');
      ok(await esperar('/Tire o número de telefone antes de enviar\\./.test((' + q('.folha .erro-proposito') + ' || {}).textContent || "")', 8000), 'o pedido com telefone mostra na folha "Tire o número de telefone antes de enviar."');
      await capturar('r4.2-filtro-' + tema);
      await fecharFolhas();

      // quem conduz: o "Tirar" em cada pedido de outra pessoa
      ok(await entrar(lider), 'o Lucas (líder) abre o app');
      await av('location.hash = "#/novidades/celula/' + ID + '/oracao"; 1');
      ok(await esperar(q('.oracao-aba [data-lista-pedidos]'), 15000), 'a aba Oração abre para quem conduz');
      ok(await av('!!' + q('[data-pedido="' + avo + '"] [data-tirar-direto]')) && /só quem conduz/.test(await texto('[data-pedido="' + reservado + '"]')), 'quem conduz vê "Tirar" e o pedido só para quem conduz');
      await capturar('r4.2-quem-conduz-' + tema, true);
      // o visitante não tem a aba
      ok(await entrar(visita), 'o Vitor (visitante) abre o app');
      await av('location.hash = "#/novidades/celula/' + ID + '/oracao"; 1');
      ok(await esperar(q('.abas-celula'), 15000) && await av('!' + q('.abas-celula [data-aba="oracao"]') + ' && !' + q('.oracao-aba')), 'o visitante não tem a aba Oração, nem por link');
    }
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
