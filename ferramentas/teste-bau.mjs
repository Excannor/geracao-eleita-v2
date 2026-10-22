// O baú e as cartas (docs/cartas.md) num Chrome sem interface, com conta criada pela API num
// servidor próprio:
//   - abrir o baú: a carta aparece pela arte, com "Nova! Você tem 1 de 13 em Heróis da fé", e os
//     botões Compartilhar carta, Salvar papel de parede e Continuar; a primeira da vida é Prata;
//   - compartilhar manda um PNG 1080x1920; o papel de parede, um PNG 1080x2340;
//   - o segundo baú dá uma carta ainda sem desenho: a carta de texto entra no lugar, sem erro;
//   - Perfil tem a entrada Cartas; o álbum mostra as recebidas e as silhuetas, sem texto nas
//     miniaturas, com as versões e as repetidas; a carta grande abre, vira e troca de versão;
//   - "O que pode vir" mostra as chances, as proteções e os números da pessoa;
//   - a versão Glória: o álbum oferece a escolha, e a carta ganha a versão;
//   - sem as peças das cartas, o baú abre com o versículo, e a carta chega depois.
// Com SAIDA=<pasta>, guarda as capturas (390 px, claro e escuro, e o álbum largo).
// Uso: CHROME=<chrome> [SAIDA=<pasta>] node ferramentas/teste-bau.mjs   (PORTA=<porta> para trocar a 8396)
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA_NAV = await portaLivre();
const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8396;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SAIDA = process.env.SAIDA || '';
if (SAIDA) mkdirSync(SAIDA, { recursive: true });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const pastaEstado = mkdtempSync(join(tmpdir(), 'cc-bau-'));
const base = 'http://127.0.0.1:' + PORTA + '/';
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pastaEstado, 'estado.json'), CAMINHO_TESTE: '1' },
  stdio: 'ignore',
});
for (let i = 0; i < 80; i++) { try { await fetch(base + 'api/existe-conta'); break; } catch { await dormir(150); } }
const perfil = mkdtempSync(join(tmpdir(), 'cc-bau-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + PORTA_NAV, '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });

// A conta: "leitora9" tira, pela semente dela, Davi e a funda (com desenho) no primeiro baú e uma
// carta ainda sem desenho no segundo (ferramentas/simular-cartas.mjs dá para conferir).
const criar = async (usuario) => {
  const r = await fetch(base + 'api/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario, senha: 'senha123', nome: 'Leitora', email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true }) });
  return (r.headers.get('set-cookie') || '').split(';')[0];
};
const cookie = await criar('leitora9');

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
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
});
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const esperar = async (expr, ms = 10000) => {
  for (let t = 0; t < ms; t += 150) {
    if (await av(expr)) return true;
    await dormir(150);
  }
  return false;
};
const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
const texto = (sel) => av('(' + q(sel) + ' || {}).textContent || ""');
let largura = 390;
async function capturar(nome, tema) {
  if (!SAIDA) return;
  await av('CC.guardarTema(' + (tema === 'escuro') + ')');
  await av('(() => { const a = document.getElementById("aviso-flutuante"); if (a) a.remove(); return true; })()');
  await dormir(500);
  const foto = await cmd('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SAIDA, nome + '-' + largura + '-' + tema + '.png'), Buffer.from(foto.data, 'base64'));
}
const nosDoisTemas = async (nome) => { for (const t of ['claro', 'escuro']) await capturar(nome, t); await av('CC.guardarTema(false)'); };
const fecharTudo = () => av('document.querySelectorAll(".tela-cheia, .cortina").forEach((e) => e.remove()); true');

// A folha de compartilhar do sistema, simulada (como em teste-compartilhar.mjs).
const SIMULAR = `window.__compartilhado = null;
navigator.canShare = (d) => !!d && Array.isArray(d.files) && d.files.every((f) => f instanceof File);
navigator.share = async (d) => { window.__compartilhado = d; };
window.__png = async (arquivo) => { const img = await createImageBitmap(arquivo); return { w: img.width, h: img.height, nome: arquivo.name, tipo: arquivo.type }; };
true`;

console.log('\n  O baú e as cartas\n');
try {
  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar');sessionStorage.setItem('cc.abertura','1')}catch(e){}" });
  await cmd('Page.navigate', { url: base + 'privacidade.html' });
  await esperar('document.readyState === "complete"');
  const [nomeCookie, ...resto] = cookie.split('=');
  await cmd('Network.setCookie', { name: nomeCookie, value: resto.join('='), url: base });
  await cmd('Page.navigate', { url: base + '#/' });
  ok(await esperar('!!(window.CC && CC.telaBau && CC.estado().dono === "leitora9")', 20000), 'o app abre com a conta');
  await dormir(1500);
  ok(await av('typeof CC.cartas === "undefined" && typeof CC.album === "undefined" && /^cartas-regras\\.[0-9a-f]{10}\\.js$/.test(window.CARTAS_REGRAS) && /^album\\.[0-9a-f]{10}\\.js$/.test(window.ALBUM_CARTAS)'),
    'a arte e o álbum não vêm no index.html, só o nome dos arquivos');

  // ---------- o primeiro baú ----------
  await av('(() => { for (let n = 1; n <= 14; n++) CC.marcarLido(n, true); return true; })()');
  await av('CC.telaBau(7)');
  ok(await esperar('!!' + q('[data-abrir-bau]')), 'a tela do baú abre');
  await av(SIMULAR);
  await av(q('[data-abrir-bau]') + '.click()');
  ok(await esperar('!!' + q('.album-revela .carta-viva'), 8000), 'abrir o baú revela a carta pela arte');
  ok(await esperar('/Nova! Você tem 1 de 13 em Heróis da fé/.test(' + q('.album-legenda') + '.textContent)'), 'a legenda diz "Nova! Você tem 1 de 13 em Heróis da fé" (' + await texto('.album-legenda') + ')');
  const ev = await av('JSON.stringify(CC.estado().cartas.eventos["bau:dia:7"])');
  ok(/"carta":"davi-funda"/.test(ev) && /"raridade":"prata"/.test(ev), 'a carta fica no estado: Davi e a funda, em Prata, a primeira da vida (' + ev + ')');
  ok(await av('!!CC.estado().bausAbertos["dia:7"].ref'), 'o baú guarda o versículo da semana, como antes');
  const botoes = await av('[...document.querySelectorAll(".tela-cheia-pe .botao")].map((b) => b.textContent.trim())');
  ok(JSON.stringify(botoes) === JSON.stringify(['Compartilhar carta', 'Salvar papel de parede', 'Continuar']), 'os botões: Compartilhar carta, Salvar papel de parede e Continuar (' + botoes + ')');
  ok(await av('[...document.querySelectorAll(".tela-cheia-pe .botao")].every((b) => b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().right <= innerWidth)'), 'os botões têm 44 px ou mais e cabem na tela');
  await dormir(1600);
  await nosDoisTemas('01-bau-revelado');
  await av('document.querySelector("[data-compartilhar-carta]").click()');
  ok(await esperar('!!window.__compartilhado', 12000), 'Compartilhar carta abre a folha do sistema');
  const story = await av('(async () => { const d = window.__compartilhado; return { ...(await __png(d.files[0])), texto: d.text }; })()');
  ok(story && story.w === 1080 && story.h === 1920 && story.tipo === 'image/png' && /Davi e a funda/.test(story.texto), 'vai o story da carta, PNG 1080x1920 (' + JSON.stringify(story) + ')');
  await av(SIMULAR);
  await av('document.querySelector("[data-papel-de-parede]").click()');
  ok(await esperar('!!window.__compartilhado', 12000), 'Salvar papel de parede abre a folha do sistema');
  const papel = await av('(async () => __png(window.__compartilhado.files[0]))()');
  ok(papel && papel.w === 1080 && papel.h === 2340, 'vai o papel de parede, PNG 1080x2340 (' + JSON.stringify(papel) + ')');
  await av('document.querySelector("[data-continuar]").click()');
  ok(await esperar('!document.querySelector(".tela-bau")'), 'Continuar fecha a tela do baú');

  // ---------- o segundo baú: carta ainda sem desenho ----------
  await av('CC.telaBau(14)');
  await esperar('!!' + q('[data-abrir-bau]'));
  await av(q('[data-abrir-bau]') + '.click()');
  ok(await esperar('!!' + q('.album-revela .carta-texto'), 8000), 'carta sem desenho: a carta de texto entra no lugar');
  ok(await esperar('/Nova! Você tem 2 de 13 em Heróis da fé/.test(' + q('.album-legenda') + '.textContent)') && await av('!document.querySelector("[data-compartilhar-carta]") && !!document.querySelector("[data-papel-de-parede]")'),
    'a legenda conta 2 de 13; sem desenho não há Compartilhar carta, e o papel de parede continua');
  await dormir(800);
  await nosDoisTemas('02-bau-carta-de-texto');
  await av('document.querySelector("[data-continuar]").click()');

  // ---------- uma repetida e o Perfil ----------
  await av(`(() => { const c = CC.estado().cartas; c.eventos["bau:dia:901"] = { em: Date.now(), carta: "davi-funda", raridade: "prata" };
    c.eventos["bau:dia:902"] = { em: Date.now() + 1, carta: "davi-funda", raridade: "bronze" }; CC.gravar("cartas", c); return true; })()`);
  await av('location.hash = "#/perfil"');
  ok(await esperar('!!' + q('[data-album-cartas]')), 'o Perfil tem a entrada Cartas, ao lado de Conquistas e Troféus');
  ok(/Cartas\s*2 de 52/.test(await texto('[data-album-cartas]')), 'a entrada diz quantas cartas de 52 (' + (await texto('[data-album-cartas]')).trim() + ')');
  await av(q('[data-album-cartas]') + '.scrollIntoView({ block: "center" })');
  await nosDoisTemas('03-perfil-entrada');

  // ---------- o álbum ----------
  await av(q('[data-album-cartas]') + '.click()');
  ok(await esperar('!!' + q('.album-grade .album-carta'), 15000), 'o álbum abre');
  const grade = await av(`(() => { const s = document.querySelector('[data-album="herois"]');
    return { cartas: s.querySelectorAll('.album-carta').length, vagas: s.querySelectorAll('.album-vaga').length, texto: [...s.querySelectorAll('.album-grade')].map((g) => g.innerText.replace(/×\\d+/g, '').trim()).join(''),
      titulo: s.querySelector('.titulo-secao').textContent, versoes: s.querySelector('.album-versoes').textContent }; })()`);
  ok(grade.cartas === 2 && grade.vagas === 11 && !grade.texto, 'Heróis da fé: 2 desenhadas e 11 silhuetas, sem texto nas miniaturas (' + JSON.stringify(grade) + ')');
  ok(/2 de 13 cartas/.test(grade.titulo) && /Coleção: 3 de 52 versões/.test(grade.versoes), 'o álbum diz "2 de 13 cartas" e "Coleção: 3 de 52 versões"');
  const davi = await av(`(() => { const b = document.querySelector('[data-carta="davi-funda"]'); return { rotulo: b.getAttribute('aria-label'), pips: [...b.querySelectorAll('.album-pips i.tem')].map((i) => i.className),
    copias: (b.querySelector('.album-copias') || {}).textContent || '' }; })()`);
  ok(/Versões: Bronze, Prata/.test(davi.rotulo) && /Repetidas: 2 de Prata/.test(davi.rotulo) && davi.pips.length === 2 && davi.copias === '×2',
    'a miniatura mostra as versões (bolinhas), as cópias da versão à mostra (×2) e diz tudo no rótulo (' + davi.rotulo + ')');
  ok(await av('document.querySelectorAll("[data-album=semeadores] .album-limiar").length === 5 && /100 amigos/.test(document.querySelector("[data-album=semeadores]").textContent)'),
    'Semeadores aparece à parte, com os 5 limiares em silhueta (de 1 a 100 amigos)');
  await nosDoisTemas('04-album');

  // ---------- a carta grande ----------
  await av(q('[data-carta="davi-funda"]') + '.click()');
  ok(await esperar('!!' + q('.tela-carta .carta-grande .carta-viva')), 'tocar na carta abre a carta grande');
  const versoes = await av('[...document.querySelectorAll(".carta-versoes .carta-versao")].map((v) => v.textContent.trim() + (v.getAttribute("aria-pressed") === "true" ? "*" : "") + (v.classList.contains("falta") ? "?" : ""))');
  ok(JSON.stringify(versoes) === JSON.stringify(['Linho?', 'Bronze', 'Prata×2*', 'Ouro?', 'Glória?']), 'as versões: a melhor aberta, as repetidas com ×2 e as que faltam em silhueta (' + versoes + ')');
  await av(q('[data-versao="bronze"]') + '.click()');
  ok(await esperar(q('.tela-carta .carta-viva') + '?.dataset.raridade === "bronze"'), 'trocar de versão mostra a carta em Bronze');
  await av(q('.tela-carta .cv-botao-virar') + '.click()');
  ok(await esperar(q('.tela-carta .carta-viva') + '?.classList.contains("mostra-verso")', 4000), 'o botão Virar mostra o verso com a marca');
  ok(await av('!!document.querySelector(".tela-carta [data-compartilhar-carta]:not([hidden])") && /1 Samuel 17/.test(document.querySelector(".carta-links").textContent)'), 'a carta grande tem Compartilhar e o link para a Bíblia');
  await av(q('.tela-carta .cv-botao-virar') + '.click()');
  await dormir(900);
  await nosDoisTemas('05-carta-grande');
  await fecharTudo();

  // ---------- O que pode vir ----------
  await av(q('[data-pode-vir]') + '.click()');
  ok(await esperar('!!' + q('.folha-pode-vir')), '"O que pode vir" abre');
  const pode = await texto('.folha-pode-vir');
  ok(/Linho\s*50%/.test(pode) && /Bronze\s*30%/.test(pode) && /Prata\s*15%/.test(pode) && /Ouro\s*5%/.test(pode) && /Glória\s*não sai no sorteio/.test(pode), 'mostra as chances de cada raridade');
  ok(/No máximo 5 seguidas sem Prata ou Ouro/.test(pode) && /20º é Ouro/.test(pode) && /Desde o último Ouro: 4 sorteios/.test(pode) && /Heróis da fé, 2 de 13/.test(pode),
    'mostra as proteções e os números da pessoa');
  ok(!/nunca repete|não repete/i.test(pode), 'não promete que as cartas não se repetem');
  await nosDoisTemas('06-o-que-pode-vir');
  await fecharTudo();

  // ---------- a versão Glória ----------
  await av('(() => { const c = CC.estado().cartas; c.eventos["dias:100"] = { em: Date.now(), gloria: 1 }; c.glorias["dias:100"] = { em: Date.now(), carta: "", escolhidaEm: 0 }; CC.gravar("cartas", c); CC.redesenhar(); return true; })()');
  ok(await esperar('!!' + q('.album-gloria [data-escolher]')), 'com uma Glória pendente, o álbum oferece a escolha');
  await av(q('.album-gloria [data-escolher]') + '.click()');
  ok(await esperar('document.querySelectorAll(".tela-escolha [data-glorificar]").length === 2'), 'a escolha mostra as cartas que a pessoa tem');
  await nosDoisTemas('07-escolher-gloria');
  await av(q('[data-glorificar="noe-arca"], [data-glorificar]') + '.click()');
  await esperar('!!' + q('.cortina [data-sim]'));
  await av(q('.cortina [data-sim]') + '.click()');
  ok(await esperar('Object.values(CC.estado().cartas.glorias).some((g) => g.carta)'), 'confirmar põe a versão Glória na carta escolhida');
  ok(await esperar(q('.tela-carta [data-versao="gloria"]') + '?.getAttribute("aria-pressed") === "true"'), 'e a carta abre na versão Glória');
  await fecharTudo();

  // ---------- desktop ----------
  largura = 1280;
  await cmd('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await av('CC.redesenhar()');
  await esperar('!!' + q('.album-grade .album-carta'));
  ok(await av('document.documentElement.scrollWidth <= innerWidth + 1'), 'no computador o álbum cabe sem rolagem de lado');
  await capturar('08-album', 'claro');
  await av('CC.guardarTema(false)');
  largura = 390;
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  // ---------- sem as peças: o versículo, e a carta depois ----------
  await av('(() => { for (let n = 15; n <= 21; n++) CC.marcarLido(n, true); return true; })()');
  // na Trilha (o álbum aberto pediria as peças de novo)
  await av('location.hash = "#/"; window.__antes = 1');
  await dormir(300);
  await cmd('Page.reload');
  await esperar('!window.__antes && !!(window.CC && CC.telaBau && CC.estado().dono === "leitora9")', 20000);
  await dormir(1200);
  ok(await av('typeof CC.cartas === "undefined" && typeof CC.album === "undefined"'), 'na Trilha, a arte e o álbum não foram pedidos');
  await av('window.__regras = window.CARTAS_REGRAS; window.CARTAS = "sem-arte.js"; window.ALBUM_CARTAS = "sem-album.js"; window.CARTAS_REGRAS = "sem-regra.js"; true');
  const chave = await av('"bau:dia:21" + (CC.estado().zeradoEm ? "@" + CC.estado().zeradoEm : "")');
  await av('CC.telaBau(21)');
  await esperar('!!' + q('[data-abrir-bau]'));
  await av(q('[data-abrir-bau]') + '.click()');
  const reserva = await esperar('!!' + q('.tela-bau .versiculo-do-bau'), 8000);
  ok(reserva && /vai para o seu álbum/.test(await texto('.tela-bau')), 'sem as peças, o baú abre com o versículo e avisa que a carta vai para o álbum');
  ok(await av('!!CC.estado().bausAbertos["dia:21"]'), 'o baú fica aberto');
  await av('document.querySelector("[data-guardar]").click(); window.CARTAS_REGRAS = window.__regras; true');
  await dormir(3200);
  await av('CC.acertarCartas()');
  ok(await esperar('!!CC.estado().cartas.eventos[' + JSON.stringify(chave) + ']', 8000), 'quando a regra carrega, a carta do baú chega ao estado');
} catch (e) {
  falhas++;
  console.log('  FALHA o teste parou: ' + (e && e.message));
} finally {
  console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  tudo certo\n');
  ws.close();
  fecharArvore(nav, perfil);
  try { servidor.kill(); } catch { /* já saiu */ }
}
await dormir(400);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* o Chrome ainda soltando a pasta */ }
try { rmSync(pastaEstado, { recursive: true, force: true }); } catch { /* idem */ }
process.exit(falhas ? 1 : 0);
