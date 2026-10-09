// Minhas anotações num Chrome sem interface, de ponta a ponta: escolher um versículo, escrever a
// nota no editor (rascunho, versículo ligado, tag), ver a etiqueta no leitor e o cartão em Minhas
// anotações; oração respondida; busca e filtro; fixar; apagar e recuperar; as rotas antigas; a
// folha "Como guardamos suas anotações"; e que a nota chega ao servidor.
// Uso: node ferramentas/teste-anotacoes.mjs   (CHROME, PORTA e PORTAS como nos outros testes)
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || await portaLivre();
const DEPURACAO = await portaLivre();
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok    ' : '  FALHA ') + msg); if (!cond) falhas++; };

const pasta = mkdtempSync(join(tmpdir(), 'cc-anotacoes-'));
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json') }, stdio: ['ignore', 'ignore', 'pipe'],
});
let erroServidor = '';
servidor.stderr.on('data', (d) => { erroServidor += d; });
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }
const r = await fetch(base + '/api/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ usuario: 'lia', nome: 'Lia', senha: 'senha-lia', email: 'lia@teste.com', nascimento: '2004-04-05', consentimento: true }) });
const cookie = (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie')]).map((c) => c.split(';')[0]);

const perfil = mkdtempSync(join(tmpdir(), 'cc-anotacoes-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + DEPURACAO,
  '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
let alvo;
for (let i = 0; i < 60 && !alvo; i++) {
  try { alvo = (await (await fetch('http://127.0.0.1:' + DEPURACAO + '/json/list')).json()).find((x) => x.type === 'page'); } catch { /* subindo */ }
  if (!alvo) await dormir(250);
}
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
let seq = 0;
const pend = new Map();
const excecoes = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') excecoes.push(m.params.exceptionDetails?.exception?.description || 'exceção');
});
await new Promise((res) => ws.addEventListener('open', res));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const esperar = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 150) { if (await av(expr)) return true; await dormir(150); } return false; };
const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
const existe = (sel) => '!!' + q(sel);
const clicar = (sel) => av('(() => { const el = ' + q(sel) + '; if (el) el.click(); return !!el; })()');
const preencher = (sel, valor) => av('(() => { const el = ' + q(sel) + '; el.value = ' + JSON.stringify(valor)
  + '; el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()');
const texto = () => av('document.body.innerText');
const fecharFolhas = () => av('document.querySelectorAll(".cortina").forEach((c) => c.remove()), true');

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Network.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
for (const c of cookie) { const [nome, valor] = c.split('='); await cmd('Network.setCookie', { name: nome, value: valor, url: base + '/' }); }
await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('cc.aviso.push','nunca');localStorage.removeItem('cc.instalar')}catch(e){}" });
await cmd('Page.navigate', { url: base + '/' });
ok(await esperar('!!(window.CC && CC.quem && CC.notas)', 15000), 'o app abre com a conta');

console.log('\n  Minhas anotações\n');

// ---------- a barra do versículo ----------
await av('location.hash = "#/biblia/" + encodeURIComponent("João") + "/3"');
ok(await esperar(existe('.leitor-verso[data-v="3:16"]'), 15000), 'a Bíblia abre em João 3');
await clicar('.leitor-verso[data-v="3:16"]');
ok(await esperar(existe('.acoes-verso [data-nota-verso]')), 'escolher João 3.16 mostra a barra');
ok(await av(q('.acoes-verso [data-nota-verso]') + '.textContent.trim() === "Escrever nota"'), '"Escrever nota" é a ação principal da barra');
ok(await av('document.querySelectorAll(".acoes-verso [data-fechar-verso], .acoes-verso .tirar-marca").length === 1 && ' + existe('.acoes-verso .cor-marca.sem-cor')),
  'um X só (fechar); "sem cor" é uma bolinha junto das cores');
const pequenos = await av('[...document.querySelectorAll(".acoes-verso button")].filter((b) => { const x = b.getBoundingClientRect(); return x.height < 43.5 || x.width < 43.5; }).map((b) => b.className + " " + Math.round(b.getBoundingClientRect().width) + "x" + Math.round(b.getBoundingClientRect().height))');
ok(!pequenos.length, 'todo botão da barra tem 44px ou mais' + (pequenos.length ? ' (' + pequenos.join('; ') + ')' : ''));
ok(await av('!/Coleção/.test(' + q('.acoes-verso') + '.innerText)'), 'nada de "Coleção" na barra (fica para a segunda rodada)');

// ---------- o editor ----------
await clicar('.acoes-verso [data-nota-verso]');
ok(await esperar(existe('.folha-editor #campo-nota')), 'o editor abre em folha alta');
ok(await av('/Nova nota/.test(' + q('.folha-editor') + '.innerText) && ' + existe('.folha-editor [data-tipo="oracao"]') + ' && ' + existe('.folha-editor [data-mais="versos"]')
  + ' && !/Coleção/.test(' + q('.folha-editor') + '.innerText)'), 'o editor tem tipo, ligar versículo, e nada de Coleção');
ok(await av('/O que diz\\? · O que significa\\? · Como vivo isso\\?/.test(' + q('.folha-editor') + '.innerText)'), 'as perguntas de ajuda aparecem');
ok(await av(q('[data-como-guardamos]') + '.innerText.includes("Só você vê. Guardado com criptografia.") && !/ninguém/i.test(' + q('.folha-editor') + '.innerText)'
  + ' && ' + q('[data-como-guardamos]') + '.getBoundingClientRect().height >= 44'), 'a linha do cadeado diz "Só você vê. Guardado com criptografia." e é tocável (44px)');
await clicar('[data-como-guardamos]');
ok(await esperar('[...document.querySelectorAll(".folha")].some((f) => /Como guardamos suas anotações/.test(f.innerText) && f.querySelector("a[href=\'privacidade.html\']"))'),
  'a folha "Como guardamos suas anotações" abre, com a política de privacidade');
await av('[...document.querySelectorAll(".folha [data-fechar]")].pop().click()');
ok(await esperar('![...document.querySelectorAll(".folha")].some((f) => /Como guardamos/.test(f.innerText)) && ' + existe('.folha-editor')), 'e fecha, voltando ao editor');
await preencher('#campo-nota', 'Deus amou primeiro. Ainda pecadores.');
ok(await av('JSON.parse(localStorage.getItem("cc.rascunho.nota")).texto === "Deus amou primeiro. Ainda pecadores."'), 'o rascunho fica guardado a cada tecla');
await clicar('.folha-editor [data-mais="versos"]');
await av(q('[data-form="versos"] input') + '.value = "romanos 5:8"; ' + q('[data-form="versos"]') + '.requestSubmit(); true');
ok(await esperar('/Romanos\\s5\\.8/.test(' + q('[data-chips="versos"]') + '.innerText)'), 'ligar versículo: "romanos 5:8" vira Romanos 5.8');
await clicar('.folha-editor [data-mais="tags"]');
await av(q('[data-form="tags"] input') + '.value = "#graça"; ' + q('[data-form="tags"]') + '.requestSubmit(); true');
ok(await esperar('/#graça/.test(' + q('[data-chips="tags"]') + '.innerText) && !/##/.test(' + q('[data-chips="tags"]') + '.innerText)'), 'a tag entra sem o # repetido');
await clicar('.folha-editor [data-guardar]');
ok(await esperar('!' + existe('.folha-editor') + ' && CC.notas().length === 1'), 'guardar fecha o editor e cria a nota');
const nota = await av('CC.notas()[0]');
ok(nota.versos.join() === 'João 3.16,Romanos 5.8' && nota.tags.join() === 'graça' && nota.tipo === 'nota' && !(await av('localStorage.getItem("cc.rascunho.nota")')),
  'a nota guarda os versículos, a tag e o tipo, e o rascunho sai');
ok(await esperar(existe('.dica-privada [data-ver]')), 'na primeira nota, uma dica leve (não bloqueia) leva à folha de privacidade');
await clicar('.dica-privada [data-dispensar]');
ok(await esperar('!' + existe('.dica-privada')), 'a dica se dispensa com um toque');

// ---------- a marca no leitor ----------
ok(await esperar(existe('.leitor-verso[data-v="3:16"] .etiqueta-nota[data-n="1"]')), 'o leitor mostra a etiqueta (caneta e número) no versículo');
await clicar('.leitor-verso[data-v="3:16"] .etiqueta-nota');
ok(await esperar('[...document.querySelectorAll(".folha")].some((f) => /Ainda pecadores/.test(f.innerText))'), 'tocar na etiqueta abre a prévia da nota');
await fecharFolhas();
if (await av('!' + existe('.acoes-verso:not([hidden]) [data-nota-verso]'))) await clicar('.leitor-verso[data-v="3:16"]');
ok(await esperar(existe('.acoes-verso [data-previa-nota]') + ' && ' + q('.acoes-verso [data-nota-verso]') + '.textContent.includes("outra")'),
  'com nota, a barra mostra a prévia e "Escrever outra nota"');

// rascunho que sobrevive a fechar
await clicar('.acoes-verso [data-nota-verso]');
await esperar(existe('.folha-editor #campo-nota'));
await preencher('#campo-nota', 'Rascunho que não pode sumir');
await clicar('.folha-editor [data-cancelar]');
await dormir(400);
await clicar('.acoes-verso [data-nota-verso]');
ok(await esperar(q('#campo-nota') + ' && ' + q('#campo-nota') + '.value === "Rascunho que não pode sumir"'), 'fechar sem guardar não perde o rascunho');
await av('localStorage.removeItem("cc.rascunho.nota"); true');
await fecharFolhas();

// ---------- Minhas anotações ----------
await av(`(() => {
  const o = CC.gravarNota(null, { versos: ['Filipenses 4.6'], tipo: 'oracao', texto: 'Pela prova de quinta' });
  CC.gravarNota(null, { versos: ['Gênesis 12.1', 'Hebreus 11.8'], tipo: 'estudo', texto: 'Quem foi Abraão?\\nSaiu sem saber.', tags: ['fé'] });
  CC.marcar(['Salmos 23:1'], 2);
  return o; })()`);
await av('location.hash = "#/perfil/anotacoes"');
ok(await esperar('/Minhas anotações/.test(' + q('h1') + '.innerText) && document.querySelectorAll(".cartao-anot").length === 4', 10000), 'Minhas anotações mostra nota, oração, estudo e marcado');
ok(await av('/Ainda pecadores/.test(document.body.innerText)'), 'a nota escrita no leitor aparece em Minhas anotações');
await clicar('[data-tipo="oracao"]');
ok(await esperar('document.querySelectorAll(".cartao-anot").length === 1 && ' + existe('[data-responder]')), 'o filtro Orações mostra só a oração, com "Marcar como respondida"');
await clicar('[data-responder]');
ok(await esperar('/Respondida/.test(' + q('.cartao-anot') + '.innerText) && !' + existe('[data-responder]') + ' && CC.notas().find((n) => n.tipo === "oracao").respondidaEm > 0'),
  'marcar como respondida guarda a data e o cartão diz "Respondida"');
await clicar('[data-tipo="tudo"]');
await preencher('#busca-anot', 'abraao');
ok(await esperar('document.querySelectorAll(".cartao-anot").length === 1 && /Quem foi Abraão/.test(' + q('.cartao-anot') + '.innerText)'), 'a busca acha o texto, sem acento');
await preencher('#busca-anot', 'zzzz');
ok(await esperar(existe('[data-limpar]') + ' && !' + existe('.cartao-anot')), 'busca sem resultado diz que não achou e oferece tirar os filtros');
await clicar('[data-limpar]');
ok(await esperar('document.querySelectorAll(".cartao-anot").length === 4'), 'tirar os filtros volta tudo');
await clicar('[data-menu="livro"]');
await esperar(existe('.opcoes-filtro [data-valor="AT"]'));
await clicar('.opcoes-filtro [data-valor="AT"]');
ok(await esperar(existe('[data-tirar="livro"]') + ' && document.querySelectorAll(".cartao-anot").length === 2'), 'o filtro de livro (Antigo Testamento) aparece aplicado e filtra');
await clicar('[data-tirar="livro"]');
await clicar('[data-menu="ordem"]');
await esperar(existe('.opcoes-filtro [data-valor="biblica"]'));
await clicar('.opcoes-filtro [data-valor="biblica"]');
ok(await esperar('/Gênesis/.test(' + q('.lista-anot .titulo-secao') + '.innerText)'), 'a ordem bíblica agrupa por livro, começando em Gênesis');
ok(await av('[...document.querySelectorAll(".pilulas-anot .filtro, .mais-anot")].every((b) => b.getBoundingClientRect().height >= 43.5)'), 'pílulas, filtros e o "mais" têm 44px');

// fixar e apagar pelo "mais"
const idEstudo = await av('CC.notas().find((n) => n.tipo === "estudo").id');
const cartao = (id) => '.cartao-anot[data-item="n:' + id + '"]';
await clicar(cartao(idEstudo) + ' [data-acoes]');
await esperar(existe('[data-acao="fixar"]'));
await clicar('[data-acao="fixar"]');
ok(await esperar('/Fixadas/.test(' + q('.lista-anot .titulo-secao') + '.innerText) && ' + existe(cartao(idEstudo) + '.fixada')), 'fixar põe a nota em Fixadas, no topo');
await clicar(cartao(idEstudo) + ' [data-acoes]');
await esperar(existe('[data-acao="apagar"]'));
await clicar('[data-acao="apagar"]');
ok(await esperar('!' + existe(cartao(idEstudo)) + ' && ' + existe('[data-apagadas]')), 'apagar tira o cartão e aparece "Apagadas"');
await clicar('[data-apagadas]');
await esperar(existe('[data-recuperar]'));
ok(await av('/30 dias/.test([...document.querySelectorAll(".folha")].pop().innerText)'), 'Apagadas avisa que guarda por 30 dias');
await clicar('[data-recuperar]');
ok(await esperar(existe(cartao(idEstudo)) + ' && !' + existe('[data-apagadas]')), 'recuperar traz a nota de volta');

// exportar avisa que o arquivo é uma cópia fora do app
await clicar('[data-exportar]');
ok(await esperar('[...document.querySelectorAll(".folha")].some((f) => /fora do app/.test(f.innerText))'), 'baixar avisa antes que o arquivo fica fora do app');
await clicar('.cortina [data-nao]');
await dormir(300);

// ---------- rotas antigas e portas de entrada ----------
await av('location.hash = "#/perfil/versiculos"');
ok(await esperar('location.hash === "#/perfil/anotacoes" && /Minhas anotações/.test(' + q('h1') + '.innerText)'), '#/perfil/versiculos abre Minhas anotações');
await av('location.hash = "#/perfil"');
await esperar(existe('.lista-atalhos'));
await av('location.hash = "#/perfil/escritos"');
ok(await esperar('location.hash === "#/perfil/anotacoes" && /Minhas anotações/.test(' + q('h1') + '.innerText)'), '#/perfil/escritos abre Minhas anotações');
await av('location.hash = "#/perfil"');
ok(await esperar(existe('.lista-atalhos a[href="#/perfil/anotacoes"]') + ' && !' + existe('a[href="#/perfil/versiculos"]') + ' && !' + existe('a[href="#/perfil/escritos"]')),
  'o Perfil tem um atalho só, para Minhas anotações');
await clicar('[data-abrir-mais]');
ok(await esperar(existe('.painel-mais a[href="#/perfil/anotacoes"]')), 'o Mais leva a Minhas anotações');
await clicar('.painel-mais a[href="#/perfil/anotacoes"]');
await esperar('location.hash === "#/perfil/anotacoes"');
await av('location.hash = "#/biblia"');
ok(await esperar(existe('.folha-biblia a.atalho-anotacoes[href="#/perfil/anotacoes"][aria-label]'), 10000), 'o topo da Bíblia tem o caderno que leva a Minhas anotações');

// ---------- o servidor recebe as notas ----------
await av('CC.salvarNoServidor()');
const doServidor = await (await fetch(base + '/api/estado', { headers: { cookie: cookie.join('; ') } })).json();
ok(Object.values(doServidor.notas || {}).some((n) => n.texto === 'Deus amou primeiro. Ainda pecadores.' && n.versos[1] === 'Romanos 5.8'), 'a nota chega ao servidor, na conta da pessoa');

// ---------- apagar todas, sem apagar a conta ----------
await av('location.hash = "#/perfil/anotacoes"');
await esperar(existe('[data-apagar-todas]'));
await clicar('[data-apagar-todas]');
await esperar(existe('.cortina [data-sim]'));
await clicar('.cortina [data-sim]');
ok(await esperar(existe('.vazio-anot') + ' && !CC.notas().length && !CC.marcas().length && !!CC.quem'), 'apagar todas as anotações limpa tudo e a conta continua');
ok(await av('/Seu caderno com Deus começa aqui/.test(document.body.innerText) && ' + existe('.vazio-anot a[href^="#/dia/"]')), 'o estado vazio ensina os 3 passos e leva à leitura de hoje');

ok(excecoes.length === 0, 'nenhuma exceção de JavaScript' + (excecoes[0] ? ': ' + excecoes[0].slice(0, 200) : ''));
if (erroServidor) console.log('\n  erro do servidor:\n' + erroServidor.slice(0, 600));
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  Minhas anotações funciona de ponta a ponta\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
