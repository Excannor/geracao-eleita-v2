// O baú e as cartas (docs/cartas.md) num Chrome sem interface, com conta criada pela API num
// servidor próprio, contra a peça de arte de verdade (src/sob-demanda/cartas.js):
//   - abrir o baú: a arte faz a abertura inteira (CC.cartas.revelar) e mostra a carta com
//     "Nova! Você tem 1 de 13 em <álbum>"; a primeira da vida é Prata; Compartilhar carta,
//     e Continuar; "Ler a história" leva à referência na Bíblia;
//   - compartilhar manda um PNG 1080x1920 (o papel de parede saiu do fim do baú, 23/10);
//   - só saem as cartas lançadas (com desenho);
//   - Perfil tem a entrada Cartas; o álbum mostra as recebidas e as silhuetas, sem texto nas
//     miniaturas, com as versões e as repetidas; a carta grande abre, vira e troca de versão; uma
//     carta sem desenho cai na carta de texto;
//   - "O que pode vir" mostra as duas tabelas (comum e marco), as proteções e os números da pessoa;
//   - outra fonte (a prática sem erro) e os marcos (100 dias, unidades) revelam a carta deles;
//     as legendas de repetida e de versão nova; a estante de Troféus;
//   - sem as peças das cartas, o baú abre com o versículo, e a carta chega depois.
// Com SAIDA=<pasta>, guarda as capturas (390 px, claro e escuro, e o álbum largo).
// Uso: CHROME=<chrome> [SAIDA=<pasta>] node ferramentas/teste-bau.mjs   (PORTA=<porta> para trocar a 8396)
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerCatalogo, esqueletoDoCatalogo, desenhosDaArte } from './cartas-catalogo.mjs';
import { carregarRegras } from './simular-cartas.mjs';

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

// O catálogo de hoje (o que está lançado muda a cada liberação): as cartas do sorteio, as lançadas,
// uma sem desenho, e a primeira carta da conta "leitora0", tirada pela regra de verdade (o sorteio é
// determinístico: a semente é a conta e o baú; a primeira da vida é Prata).
const CAT = lerCatalogo(AQUI);
const ESPECIAIS = new Set(CAT.albuns.filter((a) => a.especial).map((a) => a.id));
const DO_SORTEIO = CAT.cartas.filter((c) => !ESPECIAIS.has(c.album));
const LANCADAS = DO_SORTEIO.filter((c) => c.lancada).map((c) => c.id);
const TOTAL = DO_SORTEIO.length;
const DESENHOS = desenhosDaArte(AQUI);
const SEM_DESENHO = DO_SORTEIO.find((c) => !c.lancada && !DESENHOS.has(c.id)).id;
const REGRA = carregarRegras(esqueletoDoCatalogo(CAT));
const hojeAqui = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const sorteio1 = REGRA.receber(REGRA.vazio(), 'bau', 'bau:dia:7', { dono: 'leitora0', em: 1, hoje: hojeAqui }).resultado;
const PRIMEIRA = CAT.cartas.find((c) => c.id === sorteio1.carta);
const ALBUM1 = CAT.albuns.find((a) => a.id === PRIMEIRA.album);
const [, LIVRO1, CAP1] = /^(.*\S) (\d+)\./.exec(PRIMEIRA.referencia);

const criar = async (usuario) => {
  const r = await fetch(base + 'api/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario, senha: 'senha123', nome: 'Leitora', email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true }) });
  return (r.headers.get('set-cookie') || '').split(';')[0];
};
const cookie = await criar('leitora0');

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
console.log('  (' + LANCADAS.length + ' de ' + TOTAL + ' cartas lançadas; a primeira da leitora0: ' + PRIMEIRA.id + ', em ' + sorteio1.raridade + ')\n');
// a legenda da revelação, na tela do fim
const legenda = (tela) => '((document.querySelector("' + tela + ' .album-fim .album-legenda") || {}).textContent || "")';
// os baús na tela: o da Trilha (.bau-grande) e o da revelação da arte (.rv-bau)
const baus = (tela) => 'document.querySelectorAll("' + tela + ' .bau-grande, ' + tela + ' .rv-bau").length';
// o fim cabe sem rolar: a tela não rola, e a carta, a legenda e os botões estão inteiros na tela
const cabe = (tela) => `(() => { const t = document.querySelector("${tela}"); const p = t.querySelector(".tela-cheia-palco");
  const dentro = (el) => { const r = el.getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1; };
  return p.scrollHeight <= p.clientHeight + 1 && [...t.querySelectorAll(".album-fim .carta-viva, .album-fim .carta-texto, .album-fim .album-legenda, .album-fim [data-ler], .tela-cheia-pe .botao")].every(dentro); })()`;
// tocar no baú: o da revelação, quando as peças já chegaram, ou o da Trilha
const tocarBau = () => av('(() => { const b = document.querySelector(".tela-bau .rv-bau") || document.querySelector(".tela-bau [data-abrir-bau]"); b.click(); return true; })()');
const terminar = (tela) => av('(() => { const b = document.querySelector("' + tela + ' .rv-pular"); if (b) b.click(); return true; })()');
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
  ok(await esperar('!!(window.CC && CC.telaBau && CC.estado().dono === "leitora0")', 20000), 'o app abre com a conta');
  await dormir(1500);
  ok(await av('typeof CC.cartas === "undefined" && typeof CC.album === "undefined" && /^cartas-regras\\.[0-9a-f]{10}\\.js$/.test(window.CARTAS_REGRAS) && /^album\\.[0-9a-f]{10}\\.js$/.test(window.ALBUM_CARTAS)'),
    'a arte e o álbum não vêm no index.html, só o nome dos arquivos');

  // ---------- o primeiro baú ----------
  await av('(() => { for (let n = 1; n <= 14; n++) CC.marcarLido(n, true); return true; })()');
  await av('CC.telaBau(7)');
  ok(await esperar('!!' + q('[data-abrir-bau]')), 'a tela do baú abre');
  await esperar('!!window.CC.album && !!window.CC.cartas', 8000);
  await av(SIMULAR);
  ok(await esperar('!!document.querySelector(".tela-bau .rv-bau")', 8000) && await av(baus('.tela-bau') + ' === 1 && !document.querySelector(".tela-bau .bau-grande")'),
    'com as peças prontas, o baú da tela já é o da revelação: um baú só, antes do toque');
  ok(await av('!CC.estado().bausAbertos["dia:7"] && !CC.estado().cartas.eventos["bau:dia:7"]'), 'antes do toque nada é guardado');
  await tocarBau();
  ok(await esperar('!!' + q('.tela-bau .rv .carta-viva'), 8000), 'o toque passa a abertura para a arte (CC.cartas.revelar), no mesmo lugar');
  const durante = [];
  for (let i = 0; i < 12 && await av('!!document.querySelector(".tela-bau .rv") && document.querySelector(".tela-bau .rv").dataset.fase !== "fim"'); i++) {
    durante.push(await av('[' + baus('.tela-bau') + ', document.querySelector(".tela-bau .rv").dataset.fase, !!document.querySelector(".tela-bau .tela-cheia-pe:not([hidden])")]'));
    await dormir(350);
  }
  ok(durante.length >= 3 && durante.every(([n, , pe]) => n === 1 && !pe), 'durante a abertura há um baú só, e os botões do fim não aparecem (' + durante.map((d) => d[1]).join(',') + ')');
  ok(await av('!!document.querySelector(".tela-bau .rv-pular")'), 'durante a abertura o único controle é "Pular"');
  ok(await esperar('!!' + q('.tela-bau .album-fim .carta-viva'), 15000), 'a revelação chega ao fim e a tela passa à carta grande');
  ok(await av(baus('.tela-bau') + ' === 0 && !document.querySelector(".tela-bau .rv")'), 'no fim não sobra baú nenhum, só a carta');
  const novaNo1 = 'Nova! Você tem 1 de 13 em ' + ALBUM1.nome;
  ok(await esperar(JSON.stringify(novaNo1) + ' === ' + legenda('.tela-bau') + '.trim()'), 'a legenda diz "' + novaNo1 + '" (' + await av(legenda('.tela-bau')) + ')');
  const ev = await av('JSON.stringify(CC.estado().cartas.eventos["bau:dia:7"])');
  ok(sorteio1.raridade === 'prata' && JSON.parse(ev).carta === PRIMEIRA.id && JSON.parse(ev).raridade === 'prata' && await av('document.querySelector(".tela-bau .album-fim .carta-viva").dataset.raridade === "prata"'),
    'a carta fica no estado e aparece na raridade dela: ' + PRIMEIRA.titulo + ' (a do sorteio da conta), em Prata, a primeira da vida (' + ev + ')');
  ok(await esperar(cabe('.tela-bau'), 3000), 'o fim cabe na tela sem rolar (390x844)');
  ok(await av('!!CC.estado().bausAbertos["dia:7"].ref'), 'o baú guarda o versículo da semana, como antes');
  const botoes = await av('[...document.querySelectorAll(".tela-cheia-pe .botao")].map((b) => b.textContent.trim())');
  ok(JSON.stringify(botoes) === JSON.stringify(['Compartilhar carta', 'Continuar']), 'os botões: Compartilhar carta e Continuar, sem o papel de parede (' + botoes + ')');
  ok(await av('[...document.querySelectorAll(".tela-cheia-pe .botao")].every((b) => b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().right <= innerWidth)'), 'os botões têm 44 px ou mais e cabem na tela');
  ok(/Ler a história/.test(await texto('.tela-bau [data-ler]')), 'o fim tem "Ler a história"');
  await av('document.querySelector("[data-compartilhar-carta]").click()');
  ok(await esperar('!!window.__compartilhado', 12000), 'Compartilhar carta abre a folha do sistema');
  const story = await av('(async () => { const d = window.__compartilhado; return { ...(await __png(d.files[0])), texto: d.text }; })()');
  ok(story && story.w === 1080 && story.h === 1920 && story.tipo === 'image/png' && story.texto.includes(PRIMEIRA.titulo + ' (Prata)'), 'vai o story da carta, PNG 1080x1920 (' + JSON.stringify(story) + ')');
  // o brilho da raridade vai assado no story: a carta do story (800 px, em 140, 400) contra a
  // mesma carta desenhada sem brilho; no Ouro a moldura muda, no Linho (fosco) só o grão; o papel
  // do texto fica igual nos dois; e a mesma carta sai sempre igual
  const assado = await av(`(() => {
    const C = CC.cartas;
    const base = { id: 'davi-funda', album: 'Heróis da fé', numero: 10, total: 13, titulo: 'Davi e a funda', sabia: 'Davi apanhou cinco pedras.', ref: '1 Samuel 17.40' };
    const medir = (rar) => {
      const carta = { ...base, raridade: rar };
      const s = C.storyDaCarta(carta).getContext('2d');
      const plana = C.desenharCarta(carta, { largura: 800 }).getContext('2d');
      const dif = (x, y, w, h) => {
        const a = s.getImageData(140 + x, 400 + y, w, h).data;
        const b = plana.getImageData(x, y, w, h).data;
        let t = 0;
        for (let i = 0; i < a.length; i += 4) t += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        return Math.round((t / (a.length / 4) / 3) * 10) / 10;
      };
      return { moldura: dif(6, 300, 32, 400), papel: dif(120, 790, 420, 130) };
    };
    const igual = C.storyDaCarta({ ...base, raridade: 'ouro' }).toDataURL() === C.storyDaCarta({ ...base, raridade: 'ouro' }).toDataURL();
    return { ouro: medir('ouro'), linho: medir('linho'), igual };
  })()`);
  ok(assado && assado.ouro.moldura > 8 && assado.ouro.moldura > 3 * assado.linho.moldura && assado.ouro.papel < 4 && assado.linho.papel < 4 && assado.igual,
    'o story leva o brilho da raridade: a moldura do Ouro muda, a do Linho (fosco) não, o texto fica limpo e a imagem é sempre a mesma (' + JSON.stringify(assado) + ')');
  await av('document.querySelector(".tela-bau [data-ler]").click()');
  const hashLer = '#/biblia/' + encodeURIComponent(LIVRO1) + '/' + CAP1;
  ok(await esperar('(location.hash === ' + JSON.stringify(hashLer) + ' || location.hash.startsWith(' + JSON.stringify(hashLer + '/') + ')) && !document.querySelector(".tela-bau")'),
    '"Ler a história" abre ' + LIVRO1 + ' ' + CAP1 + ' na Bíblia e fecha a tela do baú (' + await av('location.hash') + ')');
  await av('location.hash = "#/"');
  await dormir(600);

  // ---------- o segundo baú: outra carta lançada ----------
  await av('CC.telaBau(14)');
  await esperar('!!document.querySelector(".tela-bau .rv-bau")');
  await tocarBau();
  ok(await esperar('!!' + q('.tela-bau .rv .carta-viva'), 8000), 'o segundo baú também revela pela arte');
  ok(await av(baus('.tela-bau') + ' === 1'), 'e com um baú só');
  const ev2 = await av('JSON.stringify(CC.estado().cartas.eventos["bau:dia:14"])');
  const SEGUNDA = JSON.parse(ev2 || '{}');
  ok(LANCADAS.includes(SEGUNDA.carta) && SEGUNDA.carta !== PRIMEIRA.id, 'sai outra carta, e só das lançadas (' + ev2 + ')');
  await terminar('.tela-bau');
  ok(await esperar('/Nova! Você tem 1 de 13 em/.test(' + legenda('.tela-bau') + ')') && await av(baus('.tela-bau') + ' === 0'), '"Pular" vai direto ao fim, sem baú (' + await av(legenda('.tela-bau')) + ')');
  await av('document.querySelector("[data-continuar]").click()');
  ok(await esperar('!document.querySelector(".tela-bau")'), 'Continuar fecha a tela do baú');

  // ---------- repetidas, uma carta sem desenho e o Perfil ----------
  // a primeira carta ganha mais uma Prata e uma Bronze; uma carta sem desenho entra em Linho
  await av(`(() => { const c = CC.estado().cartas; c.eventos["bau:dia:901"] = { em: Date.now(), carta: "${PRIMEIRA.id}", raridade: "prata", visto: Date.now() };
    c.eventos["bau:dia:902"] = { em: Date.now() + 1, carta: "${PRIMEIRA.id}", raridade: "bronze", visto: Date.now() };
    c.eventos["bau:dia:903"] = { em: Date.now() + 2, carta: "${SEM_DESENHO}", raridade: "linho", visto: Date.now() }; CC.gravar("cartas", c); return true; })()`);
  // o que a pessoa tem agora, carta por carta e versão por versão
  const temAgora = {};
  for (const [id, rar] of [[PRIMEIRA.id, 'prata'], [SEGUNDA.carta, SEGUNDA.raridade], [PRIMEIRA.id, 'prata'], [PRIMEIRA.id, 'bronze'], [SEM_DESENHO, 'linho']]) {
    temAgora[id] = temAgora[id] || {};
    temAgora[id][rar] = (temAgora[id][rar] || 0) + 1;
  }
  const doAlbum1 = Object.keys(temAgora).filter((id) => CAT.cartas.find((c) => c.id === id).album === ALBUM1.id);
  const versoesNo1 = doAlbum1.reduce((n, id) => n + Object.keys(temAgora[id]).length, 0);
  await av('location.hash = "#/perfil"');
  ok(await esperar('!!' + q('[data-album-cartas]')), 'o Perfil tem a entrada Cartas, ao lado de Conquistas e Troféus');
  ok(new RegExp('Cartas\\s*' + Object.keys(temAgora).length + ' de ' + TOTAL).test(await texto('[data-album-cartas]')),
    'a entrada diz quantas cartas de ' + TOTAL + ' (' + (await texto('[data-album-cartas]')).trim() + ')');
  await av(q('[data-album-cartas]') + '.scrollIntoView({ block: "center" })');
  await nosDoisTemas('02-perfil-entrada');

  // ---------- o álbum ----------
  await av(q('[data-album-cartas]') + '.click()');
  ok(await esperar('!!' + q('.album-grade .album-carta'), 15000), 'o álbum abre');
  const grade = await av(`(() => { const s = document.querySelector('[data-album="${ALBUM1.id}"]');
    return { cartas: s.querySelectorAll('.album-carta').length, vagas: s.querySelectorAll('.album-vaga').length, texto: [...s.querySelectorAll('.album-grade')].map((g) => g.innerText.replace(/×\\d+/g, '').trim()).join(''),
      titulo: s.querySelector('.titulo-secao').textContent, versoes: s.querySelector('.album-versoes').textContent }; })()`);
  ok(grade.cartas === doAlbum1.length && grade.vagas === 13 - doAlbum1.length && !grade.texto,
    ALBUM1.nome + ': as recebidas (' + doAlbum1.join(', ') + ') e as silhuetas, sem texto nas miniaturas (' + JSON.stringify(grade) + ')');
  ok(new RegExp(doAlbum1.length + ' de 13 cartas').test(grade.titulo) && new RegExp('Coleção: ' + versoesNo1 + ' de 65 versões').test(grade.versoes),
    'o álbum diz "' + doAlbum1.length + ' de 13 cartas" e "Coleção: ' + versoesNo1 + ' de 65 versões"');
  const mini = await av(`(() => { const b = document.querySelector('[data-carta="${PRIMEIRA.id}"]'); return { rotulo: b.getAttribute('aria-label'), pips: [...b.querySelectorAll('.album-pips i.tem')].map((i) => i.className),
    copias: (b.querySelector('.album-copias') || {}).textContent || '', canvas: !!b.querySelector('canvas') }; })()`);
  ok(/Versões: Bronze, Prata/.test(mini.rotulo) && /Repetidas: 2 de Prata/.test(mini.rotulo) && mini.pips.length === 2 && mini.copias === '×2' && mini.canvas,
    'a miniatura desenhada mostra as versões (bolinhas), as cópias da versão à mostra (×2) e diz tudo no rótulo (' + mini.rotulo + ')');
  ok(await av('!!document.querySelector("[data-carta=' + SEM_DESENHO + '] .album-sem-arte")'), 'carta sem desenho aparece em silhueta da raridade');
  ok(await av('document.querySelectorAll("[data-album=semeadores] .album-limiar").length === 5 && /100 amigos/.test(document.querySelector("[data-album=semeadores]").textContent)'),
    'Semeadores aparece à parte, com os 5 limiares em silhueta (de 1 a 100 amigos)');
  await nosDoisTemas('03-album');

  // ---------- a carta grande ----------
  await av(q('[data-carta="' + PRIMEIRA.id + '"]') + '.click()');
  ok(await esperar('!!' + q('.tela-carta .carta-grande .carta-viva')), 'tocar na carta abre a carta grande');
  const versoes = await av('[...document.querySelectorAll(".carta-versoes .carta-versao")].map((v) => v.textContent.trim() + (v.getAttribute("aria-pressed") === "true" ? "*" : "") + (v.classList.contains("falta") ? "?" : ""))');
  ok(JSON.stringify(versoes) === JSON.stringify(['Linho?', 'Bronze', 'Prata×2*', 'Ouro?', 'Glória?']), 'as versões: a melhor aberta, as repetidas com ×2 e as que faltam em silhueta (' + versoes + ')');
  await av(q('[data-versao="bronze"]') + '.click()');
  ok(await esperar(q('.tela-carta .carta-viva') + '?.dataset.raridade === "bronze"'), 'trocar de versão mostra a carta em Bronze');
  await av(q('.tela-carta .cv-botao-virar') + '.click()');
  ok(await esperar(q('.tela-carta .carta-viva') + '?.classList.contains("mostra-verso")', 4000), 'o botão Virar mostra o verso com a marca');
  ok(await av('!!document.querySelector(".tela-carta [data-compartilhar-carta]:not([hidden])") && document.querySelector(".carta-links").textContent.includes(' + JSON.stringify(LIVRO1 + ' ' + CAP1) + ')'), 'a carta grande tem Compartilhar e o link para a Bíblia');
  await av(q('.tela-carta .cv-botao-virar') + '.click()');
  await dormir(900);
  await nosDoisTemas('04-carta-grande');
  await fecharTudo();
  await av(q('[data-carta="' + SEM_DESENHO + '"]') + '.click()');
  ok(await esperar('!!' + q('.tela-carta .carta-texto')) && await av('!!document.querySelector(".tela-carta [data-compartilhar-carta][hidden]")'), 'a carta sem desenho abre como carta de texto, sem Compartilhar');
  await fecharTudo();

  // ---------- O que pode vir ----------
  await av(q('[data-pode-vir]') + '.click()');
  ok(await esperar('!!' + q('.folha-pode-vir')), '"O que pode vir" abre');
  const comum = await texto('.folha-pode-vir [data-tabela="comum"]');
  const marco = await texto('.folha-pode-vir [data-tabela="marco"]');
  const pode = await texto('.folha-pode-vir');
  // os números da pessoa pela regra, a partir do livro-caixa dela
  const semOuro = REGRA.resumo(JSON.parse(await av('JSON.stringify(CC.estado().cartas)'))).semOuro;
  const hojeSaem = LANCADAS.length < TOTAL ? 'Hoje podem sair ' + LANCADAS.length + ' das ' + TOTAL + ' cartas' : '';
  ok(/Linho\s*49%/.test(comum) && /Bronze\s*30%/.test(comum) && /Prata\s*15%/.test(comum) && /Ouro\s*5%/.test(comum) && /Glória\s*1%/.test(comum), 'mostra as chances do sorteio comum (' + comum.replace(/\s+/g, ' ') + ')');
  ok(/Prata\s*40%/.test(marco) && /Ouro\s*35%/.test(marco) && /Glória\s*25%/.test(marco) && !/Linho|Bronze/.test(marco), 'e as do sorteio de marco, sem Linho nem Bronze (' + marco.replace(/\s+/g, ' ') + ')');
  ok(/No máximo 5 seguidas sem Prata ou melhor/.test(pode) && /20º é Ouro/.test(pode) && /sobe 15 pontos/.test(pode)
    && (hojeSaem ? pode.includes(hojeSaem) : !/Hoje podem sair/.test(pode)) && pode.includes('Desde o último Ouro: ' + semOuro + (semOuro === 1 ? ' sorteio' : ' sorteios')),
    'mostra as proteções, quantas cartas podem sair hoje e os números da pessoa (' + (hojeSaem || 'todas lançadas') + '; ' + semOuro + ' desde o último Ouro)');
  ok(!/nunca repete|não repete/i.test(pode), 'não promete que as cartas não se repetem');
  await nosDoisTemas('05-o-que-pode-vir');
  await fecharTudo();

  // ---------- outra fonte: a prática sem erro revela uma carta ----------
  await av('location.hash = "#/"');
  await dormir(3300);
  await av('CC.gravar("pratica", { 1: { melhor: 10, total: 10, feitoEm: CC.hojeIso(), vezes: 1 } }); CC.acertarCartas(); true');
  ok(await esperar('!!document.querySelector(".tela-carta-nova .rv")', 10000), 'a prática sem erro (outra fonte) revela uma carta pela arte');
  await terminar('.tela-carta-nova');
  ok(await esperar('/Prática sem nenhum erro/.test((document.querySelector(".tela-carta-nova .album-origem") || {}).textContent || "")'), 'e o fim diz a origem: "Prática sem nenhum erro"');
  ok(await esperar('/Nova!|Nova versão|Repetida/.test(' + legenda('.tela-carta-nova') + ')') && !!(await av('CC.estado().cartas.eventos["pratica:1"]')), 'com a legenda, e o evento fica no livro-caixa');
  await av('document.querySelector(".tela-carta-nova [data-continuar]").click()');
  ok(await esperar('!document.querySelector(".tela-carta-nova")'), 'Continuar fecha');
  // as legendas de repetida e de versão nova, uma revelação depois da outra
  await av(`CC.album.revelarNovas([{ fonte: 'desafio', chave: 'desafio:x', carta: 'davi-funda', raridade: 'prata', nova: false, versaoNova: false, copias: 3, tem: 1, total: 13 },
    { fonte: 'passos', chave: 'passos:todos', carta: 'davi-funda', raridade: 'ouro', nova: false, versaoNova: true, copias: 1, tem: 1, total: 13 }]); true`);
  ok(await esperar('/Repetida: agora você tem 3 de Davi e a funda \\(Prata\\)/.test(' + legenda('.tela-carta-nova') + ')'), 'repetida: "Repetida: agora você tem 3 de Davi e a funda (Prata)"');
  await terminar('.tela-carta-nova');
  await dormir(600);
  await nosDoisTemas('06-repetida');
  await av('document.querySelector(".tela-carta-nova [data-continuar]").click()');
  await terminar('.tela-carta-nova');
  ok(await esperar('/Nova versão Ouro de Davi e a funda/.test(' + legenda('.tela-carta-nova') + ') && /Primeiros passos completos/.test(document.querySelector(".tela-carta-nova .album-origem").textContent)'),
    'a seguinte: "Nova versão Ouro de Davi e a funda", com a origem dela');
  await av('document.querySelector(".tela-carta-nova [data-continuar]").click()');
  ok(await esperar('!document.querySelector(".tela-carta-nova")'), 'no fim da fila, Continuar fecha');

  // ---------- os marcos: 100 dias e as unidades ----------
  await dormir(3300);
  await av('(() => { for (let n = 1; n <= 100; n++) CC.marcarLido(n, true); CC.acertarCartas(); return true; })()');
  ok(await esperar('!!document.querySelector(".tela-carta-nova .rv")', 10000), 'chegar aos 100 dias e completar unidades revela os sorteios de marco');
  const marcos = [];
  for (let i = 0; i < 6 && await av('!!document.querySelector(".tela-carta-nova")'); i++) {
    await esperar('!!document.querySelector(".tela-carta-nova .rv, .tela-carta-nova .album-fim")');
    await terminar('.tela-carta-nova');
    await esperar('!!document.querySelector(".tela-carta-nova .album-fim")');
    marcos.push(await av('document.querySelector(".tela-carta-nova .album-origem").textContent + " · " + document.querySelector(".tela-carta-nova .album-fim .carta-viva, .tela-carta-nova .album-fim .carta-texto").dataset.raridade'));
    if (i === 0) { await dormir(600); await nosDoisTemas('07-marco'); }
    await av('document.querySelector(".tela-carta-nova [data-continuar]").click()');
    // espera a tela fechar ou a próxima revelação montar (400 ms às vezes pegava a tela ainda saindo)
    await esperar('!document.querySelector(".tela-carta-nova") || !!document.querySelector(".tela-carta-nova .rv")', 3000);
  }
  // só os marcos contam aqui; outra carta da fila (sem origem de marco) pode vir junto e não é erro
  const deMarco = marcos.filter((m) => /^Marco: /.test(m));
  ok(deMarco.length === 4 && deMarco.some((m) => /Marco: 100 dias de leitura/.test(m)) && deMarco.filter((m) => /Marco: unidade \d completa/.test(m)).length === 3
    && deMarco.every((m) => / · (prata|ouro|gloria)$/.test(m)), 'os quatro marcos (3 unidades e 100 dias), cada um revelado com Prata, Ouro ou Glória (' + marcos.join('; ') + ')');

  // ---------- troféus ----------
  await av('location.hash = "#/perfil/trofeus"');
  ok(await esperar('/Álbuns de cartas/.test(document.body.textContent) && /Heróis da fé/.test(document.body.textContent)'), 'Troféus tem a estante "Álbuns de cartas"');
  await av('location.hash = "#/perfil/album"');
  await esperar('!!' + q('.album-grade .album-carta'));

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

  await av('location.hash = "#/"');
  await dormir(500);
  // ---------- "Pular" antes de tocar no baú: o baú é guardado do mesmo jeito ----------
  await av('CC.telaBau(56)');
  await esperar('!!document.querySelector(".tela-bau .rv-bau")');
  ok(/Um baú na estrada!/.test(await texto('.tela-bau .album-titulo-bau')), 'fechado, o título "Um baú na estrada!" aparece por cima do baú');
  await terminar('.tela-bau');
  ok(await esperar('!!' + q('.tela-bau .album-fim .carta-viva')) && await av('!!CC.estado().bausAbertos["dia:56"] && !!CC.estado().cartas.eventos["bau:dia:56"]'),
    '"Pular" antes do toque vai ao fim e guarda o baú e a carta');
  ok(await av('document.querySelector(".tela-bau .album-fim .carta-viva").dataset.raridade === CC.estado().cartas.eventos["bau:dia:56"].raridade'), 'e a carta mostrada é a que foi paga');
  await av('document.querySelector(".tela-bau [data-continuar]").click()');
  await esperar('!document.querySelector(".tela-bau")');

  // ---------- o fluxo do baú inteiro, em 390x844 e 360x740, claro e escuro ----------
  // Em câmera lenta (CC.cartas._escalaTempo), para ver cada momento: fechado, abrindo, a carta de
  // costas, de frente e o fim com os botões. Baús 28 a 49: o baú abre pelo número, sem leitura.
  await av('location.hash = "#/"');
  await dormir(500);
  let numero = 21;
  for (const [w, h] of [[390, 844], [360, 740]]) {
    await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    for (const tema of ['claro', 'escuro']) {
      numero += 7;
      await av('CC.guardarTema(' + (tema === 'escuro') + '); document.querySelectorAll(".tela-cheia, .cortina").forEach((e) => e.remove()); CC.cartas._escalaTempo(2); true');
      const foto = async (n, nome) => {
        if (!SAIDA) return;
        const f = await cmd('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(SAIDA, '09-fluxo-' + w + 'x' + h + '-' + tema + '-' + n + '-' + nome + '.png'), Buffer.from(f.data, 'base64'));
      };
      await av('CC.telaBau(' + numero + ')');
      await esperar('!!document.querySelector(".tela-bau .rv-bau")');
      await dormir(700);
      ok(await av(baus('.tela-bau') + ' === 1'), w + 'x' + h + ' ' + tema + ': fechado, um baú só');
      await foto(1, 'fechado');
      await tocarBau();
      const vistos = [];
      for (const [fase, n, nome] of [['abre', 2, 'abrindo'], ['espera', 3, 'carta-de-costas'], ['brilha', 4, 'carta-de-frente']]) {
        if (await esperar('(document.querySelector(".tela-bau .rv") || {}).dataset?.fase === "' + fase + '"', 15000)) {
          vistos.push(fase + ':' + await av(baus('.tela-bau')));
          await dormir(fase === 'abre' ? 150 : 500);
          await foto(n, nome);
        }
      }
      ok(vistos.length === 3 && vistos.every((v) => v.endsWith(':1')), w + 'x' + h + ' ' + tema + ': abrindo, de costas e de frente, sempre com um baú só (' + vistos.join(' ') + ')');
      ok(await esperar('!!' + q('.tela-bau .album-fim .carta-viva'), 15000) && await av(baus('.tela-bau') + ' === 0'), w + 'x' + h + ' ' + tema + ': o fim mostra só a carta, sem baú');
      await dormir(700);
      ok(await av(cabe('.tela-bau')), w + 'x' + h + ' ' + tema + ': a carta, a legenda, "Ler a história" e os três botões cabem sem rolar');
      await foto(5, 'fim');
      await av('CC.cartas._escalaTempo(1); document.querySelector(".tela-bau [data-continuar]").click()');
      await esperar('!document.querySelector(".tela-bau")');
    }
  }
  await av('CC.guardarTema(false)');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  // ---------- sem as peças: o versículo, e a carta depois ----------
  await av('(() => { for (let n = 101; n <= 105; n++) CC.marcarLido(n, true); return true; })()');
  // na Trilha (o álbum aberto pediria as peças de novo)
  await av('location.hash = "#/"; window.__antes = 1');
  await dormir(300);
  await cmd('Page.reload');
  await esperar('!window.__antes && !!(window.CC && CC.telaBau && CC.estado().dono === "leitora0")', 20000);
  await dormir(1200);
  ok(await av('typeof CC.cartas === "undefined" && typeof CC.album === "undefined"'), 'na Trilha, a arte e o álbum não foram pedidos');
  await av('window.__pecas = [window.CARTAS_REGRAS, window.CARTAS, window.ALBUM_CARTAS]; window.CARTAS = "sem-arte.js"; window.ALBUM_CARTAS = "sem-album.js"; window.CARTAS_REGRAS = "sem-regra.js"; true');
  const chave = await av('"bau:dia:21" + (CC.estado().zeradoEm ? "@" + CC.estado().zeradoEm : "")');
  await av('CC.telaBau(21)');
  await esperar('!!' + q('[data-abrir-bau]'));
  await av(q('[data-abrir-bau]') + '.click()');
  const reserva = await esperar('!!' + q('.tela-bau .versiculo-do-bau'), 8000);
  ok(reserva && /sai quando ele abrir com internet/.test(await texto('.tela-bau')), 'sem as peças, o baú abre com o versículo e avisa que a carta sai quando ele abrir com internet');
  ok(await av('!!CC.estado().bausAbertos["dia:21"] && !CC.bauAberto(21)'), 'o versículo fica guardado, e o baú segue pronto na Trilha até a carta ser vista');
  await av('document.querySelector("[data-guardar]").click(); [window.CARTAS_REGRAS, window.CARTAS, window.ALBUM_CARTAS] = window.__pecas; true');
  await dormir(3200);
  await av('CC.acertarCartas(true)');
  await dormir(1500);
  ok(await av('!CC.estado().cartas.eventos[' + JSON.stringify(chave) + '] && !CC.bauAberto(21)'),
    'quando a regra carrega, a carta do baú não é paga calada: o baú do dia 21 continua para abrir');
  await av('CC.telaBau(21)');
  await esperar('!!document.querySelector(".tela-bau .rv-bau")', 8000);
  await tocarBau();
  await terminar('.tela-bau');
  ok(await esperar('!!' + q('.tela-bau .album-fim .carta-viva'), 8000) && await av('!!(CC.estado().cartas.eventos[' + JSON.stringify(chave) + '] || {}).visto && CC.bauAberto(21)'),
    'o toque no baú pronto revela e paga a carta; aí ele conta como aberto');
  await av('document.querySelector(".tela-bau [data-continuar]").click()');
  await esperar('!document.querySelector(".tela-bau")');

  // ---------- baús abertos antes das cartas (a conta como o servidor a tem desde antes delas) ----------
  // Três baús abertos e nenhuma carta: voltam prontos na Trilha, com o "Abrir"; nada é pago calado;
  // tocar num deles faz a revelação e paga; depois de recarregar, ele fica aberto e os outros, prontos.
  const hojeLocal = await av('CC.hojeIso()');
  const cookie2 = await criar('antigo0');
  const lidos21 = Array.from({ length: 21 }, (_, i) => i + 1);
  const antigo = { dono: 'antigo0', atualizadoEm: Date.now() - 86400000, dia: 22, lidos: lidos21, marcadoEm: Object.fromEntries(lidos21.map((n) => [n, hojeLocal])),
    bausAbertos: { 'dia:7': { em: '2026-10-01' }, 'dia:14': { em: '2026-10-08' }, 'dia:21': { em: '2026-10-15' } } };
  ok((await fetch(base + 'api/estado', { method: 'PUT', headers: { 'content-type': 'application/json', cookie: cookie2 }, body: JSON.stringify(antigo) })).ok,
    'a conta antiga: 21 dias lidos e os baús 7, 14 e 21 abertos antes das cartas');
  await cmd('Page.navigate', { url: base + 'privacidade.html' });
  await esperar('document.readyState === "complete"');
  await av('localStorage.clear(); true');
  const [nome2, ...resto2] = cookie2.split('=');
  await cmd('Network.setCookie', { name: nome2, value: resto2.join('='), url: base });
  await cmd('Page.navigate', { url: base + '#/' });
  ok(await esperar('!!(window.CC && CC.estado().dono === "antigo0" && CC.estado().bausAbertos["dia:21"])', 20000), 'o app abre com a conta antiga');
  const prontos = '[...document.querySelectorAll(".no-bau.pronto")].map((b) => b.dataset.bau).join()';
  await esperar(prontos + ' === "7,14,21"', 8000);
  await dormir(3500);
  ok(await av(prontos + ' === "7,14,21" && document.querySelectorAll(".balao-bau").length === 3 && !document.querySelector(".no-bau.aberto")'),
    'na Trilha, os três baús antigos estão prontos, com três balões "Abrir" (' + await av(prontos) + ')');
  ok(await av('!Object.keys(CC.estado().cartas.eventos).length && !document.querySelector(".tela-cheia")'), 'nenhuma carta foi paga calada na abertura do app');
  ok(await av('(document.querySelector("[aria-current=step]") || {}).dataset?.dia === "22" && scrollY > 0'), 'a Trilha rola até o dia de hoje, como sempre');
  await av('document.querySelector(".no-bau.pronto[data-bau=\\"14\\"]").click()');
  ok(await esperar('!!document.querySelector(".tela-bau .rv-bau")', 8000) && await av(baus('.tela-bau') + ' === 1'), 'tocar no baú 14 da Trilha abre a tela dele, com um baú só');
  await tocarBau();
  ok(await esperar('!!' + q('.tela-bau .rv .carta-viva'), 8000), 'o toque faz a revelação');
  await terminar('.tela-bau');
  ok(await esperar('!!' + q('.tela-bau .album-fim .carta-viva'), 8000) && /Nova! Você tem 1 de 13 em/.test(await av(legenda('.tela-bau'))), 'e a carta aparece: "' + await av(legenda('.tela-bau')) + '"');
  ok(await av('Object.keys(CC.estado().cartas.eventos).join() === "bau:dia:14" && !!CC.estado().cartas.eventos["bau:dia:14"].visto'), 'pagou a carta do baú 14, uma só, já vista');
  await av('document.querySelector(".tela-bau [data-continuar]").click()');
  await esperar('!document.querySelector(".tela-bau")');
  await dormir(2500);
  await cmd('Page.reload');
  await esperar('!!(window.CC && CC.estado().dono === "antigo0" && !!document.querySelector(".no-bau"))', 20000);
  await dormir(3500);
  ok(await av(prontos + ' === "7,21" && [...document.querySelectorAll(".no-bau.aberto")].map((b) => b.dataset.bau).join() === "14" && document.querySelectorAll(".balao-bau").length === 2'),
    'depois de recarregar, o baú 14 fica aberto e o 7 e o 21 seguem prontos');
  const doServidor = await (await fetch(base + 'api/estado', { headers: { cookie: cookie2 } })).json();
  ok(Object.keys(doServidor.cartas.eventos).join() === 'bau:dia:14' && doServidor.cartas.eventos['bau:dia:14'].visto > 0, 'no servidor, a carta do baú 14 e a marca de vista, e nada mais');
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
