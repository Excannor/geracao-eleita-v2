// Percorre o redesenho num Chrome sem interface: cadastro em três passos, a trilha com o
// balão do dia, a lição com a celebração em passos, convite e propósito dos amigos,
// toque em tela cheia, Feed, Missões, perfil com conquistas e troféus, configurações
// e a conta antiga que completa o cadastro. Confere também que conta nova não herda
// progresso sem dono deixado no aparelho.
// Uso: node ferramentas/teste-redesenho.mjs
import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Contas } from '../contas.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8212;
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou respondia no lugar.
const DEPURACAO = await portaLivre();
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// Uma conta da versão anterior, sem e-mail e sem data de nascimento.
const pasta = mkdtempSync(join(tmpdir(), 'cc-redesenho-'));
const arquivoContas = join(pasta, 'contas.json');
// A conta nasce num rascunho à parte, só para ter uma senha de verdade. O arquivo antigo vai
// para a pasta do teste, onde ainda não há banco: o servidor importa ao subir.
const rascunho = mkdtempSync(join(tmpdir(), 'cc-redesenho-rascunho-'));
const contaCriada = await (await new Contas(join(rascunho, 'contas.json')).carregar())
  .criar({ usuario: 'velho', senha: 'senha-velha', nome: 'Velho' }, { exigirPerfil: false });
const contaVelha = { ...contaCriada, segue: [] };
delete contaVelha.seloConvite;
writeFileSync(arquivoContas, JSON.stringify({ versao: 1, contas: { velho: contaVelha } }));

const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(pasta, 'estado.json') }, stdio: ['ignore', 'ignore', 'pipe'],
});
let erroServidor = '';
servidor.stderr.on('data', (d) => { erroServidor += d; });
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const api = async (rota, corpo, cookie) => {
  const r = await fetch(base + rota, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0], dado: await r.json().catch(() => ({})) };
};
const criarConta = (usuario, nome) => api('/api/criar-conta', {
  usuario, nome, senha: 'senha-' + usuario, email: usuario + '@teste.com', nascimento: '2003-04-05',
});

const perfil = mkdtempSync(join(tmpdir(), 'cc-redesenho-nav-'));
const nav = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + DEPURACAO, '--user-data-dir=' + perfil, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });

async function alvo() {
  for (let i = 0; i < 60; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:' + DEPURACAO + '/json/list')).json();
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
const eventos = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id); }
  else if (m.method) eventos.push(m);
});
await new Promise((r) => ws.addEventListener('open', r));
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const av = async (e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const esperar = async (expr, ms = 8000) => {
  for (let t = 0; t < ms; t += 150) { if (await av(expr)) return true; await dormir(150); }
  return false;
};
const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
const existe = (sel) => '!!' + q(sel);
const clicar = (sel) => av('(() => { const el = ' + q(sel) + '; if (el) el.click(); return !!el; })()');
const preencher = (sel, valor) => av('(() => { const el = ' + q(sel) + '; el.value = '
  + JSON.stringify(valor) + '; el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()');
const irPara = (hash) => av('location.hash = ' + JSON.stringify(hash));

mkdirSync(join(AQUI, 'capturas'), { recursive: true });
const foto = async (nome) => {
  const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
  if (data) writeFileSync(join(AQUI, 'capturas', 'redesenho-' + nome + '.png'), Buffer.from(data, 'base64'));
};

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
if (process.env.TEMA === 'claro') await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
else await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });

console.log('\n  Redesenho, de ponta a ponta\n');

// ---------- privacidade pública ----------
const privacidade = await fetch(base + '/privacidade.html');
ok(privacidade.status === 200 && (await privacidade.text()).includes('Quem vê o quê'), 'a página de privacidade abre sem entrar');

// ---------- cadastro em três passos ----------
await cmd('Page.navigate', { url: base + '/' });
ok(await esperar(existe('#tela-boas') + ' && !' + q('#tela-boas') + '.hidden'), 'quem não entrou vê as boas-vindas');
// progresso sem dono, da versão sem contas, esquecido neste aparelho
await av('localStorage.setItem("cc.app.estado", JSON.stringify({ atualizadoEm: 1, lidos: [1, 2, 3], '
  + 'marcadoEm: { 1: "2026-08-27", 2: "2026-08-27", 3: "2026-08-27" }, licoes: [], oia: {}, anotacoes: {}, licoesEm: {} })), true');
await foto('1-boas-vindas');
await clicar('[data-ir="cadastro"]');
await esperar('!' + q('#tela-cadastro') + '.hidden');
await clicar('#botao-cadastro');
ok(await esperar(q('#erro-cadastro') + '.textContent.length > 0'), 'o passo 1 pede o nome antes de seguir');
await preencher('#nome', 'Ana');
await preencher('#nascimento', '2004-05-06');
await clicar('#botao-cadastro');
ok(await esperar('!' + q('[data-passo="2"]') + '.hidden'), 'nome e data de nascimento levam ao e-mail');
await preencher('#email', 'ana@teste.com');
await clicar('#botao-cadastro');
ok(await esperar('!' + q('[data-passo="3"]') + '.hidden'), 'o e-mail leva ao acesso');
await preencher('#usuario', 'ana.teste');
await preencher('#senha-nova', 'senha-da-ana');
await clicar('[data-mostrar="senha-nova"]');
ok(await av(q('#senha-nova') + '.type === "text"'), 'o botão Mostrar revela a senha');
await foto('2-cadastro-acesso');
await clicar('#botao-cadastro');
ok(await esperar(existe('.no.atual'), 12000), 'criar a conta abre o aplicativo');
ok(await esperar('CC.quem && CC.quem.perfilCompleto === true'), 'a conta nova já nasce com o cadastro completo');
ok(await av('CC.ler("lidos", []).length === 0 && CC.sequencia().atual === 0'),
  'a conta nova começa zerada, sem herdar progresso sem dono do aparelho');

// ---------- trilha ----------
ok(await esperar(existe('.leitura-hoje [data-abrir-dia]') + ' && ' + existe('.fala-bento.apresenta')),
  'a conta nova vê a leitura de hoje no alto da trilha, e o Bento se apresenta');
ok(await av('document.querySelectorAll(".navegacao .aba").length === 5 && ' + existe('.aba[aria-current=page]')
  + ' && getComputedStyle(' + q('.aba .rotulo-aba') + ').position !== "absolute"'),
  'cinco abas com o nome à vista, e a atual marcada para leitor de tela');
ok(await av('!' + existe('.topo .contador.lidos') + ' && !' + existe('.topo .contador.escudos') + ' && !' + existe('.topo .sino')),
  'o topo mostra só o fogo: sem dias lidos, escudos ou sino');
ok(await av('!' + existe('.contador.xp') + ' && ' + existe('.contador.ofensiva')), 'o topo mostra a ofensiva e não o XP');
ok(await av('document.querySelectorAll(".no-bau").length >= 4'), 'a trilha tem um baú a cada sete dias');
await dormir(500);
await foto('3-trilha');
await clicar('.no.atual');
ok(await esperar(existe('.pop-no .fala-bento') + ' && /primeiro dia/i.test(' + q('.pop-no .fala-bento') + '.innerText)'),
  'tocar no dia de hoje abre o balão, com o Bento explicando o primeiro dia');
await foto('3b-balao');

// ---------- a lição e a celebração ----------
await clicar('.pop-no [data-comecar]');
ok(await esperar(existe('.licao [data-trilha]')), 'o balão abre a lição com as passagens');
await av('document.querySelectorAll("[data-trilha]").forEach((b) => b.click())');
ok(await esperar('!' + q('[data-concluir]') + '.disabled'), 'marcar as passagens libera "Concluir o dia"');
await clicar('[data-concluir]');
ok(await esperar(existe('.licao.tela-festa .retorno-lido')) && await av('CC.leu(1)'),
  'concluir leva direto à reflexão, e o dia já está contado');
ok(await av('!' + existe('.licao [data-seguir]')), 'nenhuma tela de festa entre a leitura e a Palavra');
await dormir(1200);
await foto('4-reflexao');
ok(await esperar(existe('.cartao-versiculo'), 6000), 'o fim mostra um versículo do trecho, na tradução escolhida');
await foto('4c-versiculo');
ok(await av('!' + existe('[data-etapa-bloco="pensar"]:not([hidden])')), 'pensar e orar começam fechados');
await clicar('[data-avancar]');
// 2 ou 3: as reflexões revistas têm a quantidade de perguntas que o texto pede
ok(await esperar(existe('[data-etapa-bloco="pensar"]:not([hidden])') + ' && [2, 3].includes(document.querySelectorAll(".pergunta-reflexao").length)'),
  '"Pensar sobre isso" abre as perguntas do dia');
await clicar('[data-pergunta="0"]');
ok(await av(q('[data-pergunta="0"]') + '.getAttribute("aria-pressed") === "true"'), 'a pessoa escolhe uma pergunta');
await clicar('[data-avancar]');
ok(await esperar(existe('[data-etapa-bloco="orar"]:not([hidden])') + ' && document.querySelectorAll(".oracao-guia li").length === 3'),
  '"Transformar em oração" mostra três começos de oração');
await dormir(900);
await foto('4d-orar');
await clicar('[data-orei]');
ok(await esperar(existe('.amem:not([hidden])')) && await av('CC.xpTotal() === 10'), '"Orei" responde com amém e não vale XP');
await clicar('[data-orar-escrevendo]');
// Comparado com a oração do próprio dia, não com um texto fixo: cada dia tem a sua desde
// que as reflexões deixaram de ser as mesmas para todo texto do mesmo gênero.
ok(await esperar(existe('#campo-oracao') + ' && ' + q('#campo-oracao') + '.placeholder === CC.reflexaoDoDia(1).oracao.join("\\n")'),
  'escrever a oração abre com os começos de frase do dia');
await clicar('[data-pronto]');
ok(await esperar(existe('[data-etapa-bloco="orar"]:not([hidden])')), 'ao voltar, a etapa de orar continua aberta');
await clicar('[data-orar-escrevendo]');
ok(await esperar(existe('#campo-oracao')), 'escrever abre na oração');
await preencher('#campo-oracao', 'oração de teste');
ok(await av('CC.temRegistro(1) && CC.xpTotal() === 10'), 'a oração fica guardada e não vale XP');
await clicar('[data-pronto]');
await esperar(existe('[data-avancar]'));
await clicar('[data-avancar]');
ok(await esperar(existe('.licao.tela-resumo .resumo-dia')), 'terminar de orar leva a uma tela só de resumo do dia');
ok(await av('!/XP/.test(' + q('.resumo-dia') + '.innerText)'), 'o resumo não mostra XP');
await dormir(900);
await foto('4e-resumo');
await clicar('[data-voltar-trilha]');
await esperar('!' + existe('.licao'));
// conta nova: o tutorial de instalar vem agora, depois da primeira leitura
ok(await esperar(existe('.cortina'), 4000), 'depois da primeira leitura, a conta nova vê o tutorial de instalar');
await av('document.querySelectorAll(".cortina").forEach((c) => c.remove()), true');

// ---------- convite e propósito ----------
const bruno = await criarConta('bruno', 'Bruno');
const conviteAna = await av('CC.api("api/convites", {}).then((d) => d.link)');
ok(/\?convite=/.test(conviteAna || ''), 'a Ana gera um link de convite');
const tokenAna = new URL(conviteAna).searchParams.get('convite');
ok((await api('/api/convites/' + tokenAna)).dado.nome === 'Ana', 'quem abre o link vê quem convidou');
ok((await api('/api/convites/aceitar', { token: tokenAna }, bruno.cookie)).status === 200, 'o Bruno aceita o convite');
await irPara('#/amigos');
ok(await esperar('document.querySelectorAll(".amigo-roda").length === 1 && /Bruno/.test(' + q('.amigo-roda') + '.innerText)'),
  'O Feed mostra o propósito com o Bruno na roda de amigos');
await clicar('[data-amigo="bruno"]');
ok(await esperar(existe('.cortina [data-toque]')), 'a Ana leu e o Bruno não: a folha do amigo oferece "Notificar"');
await clicar('.cortina [data-toque]');
await esperar(existe('.tela-toque [data-enviar-toque]'));
await dormir(700);
await foto('5a-toque');
await clicar('.tela-toque [data-enviar-toque]');
ok(await esperar('/notificado/i.test(' + q('.tela-toque') + '.innerText)'), 'o toque é enviado na tela cheia (botão vira Notificado)');
ok(((await api('/api/amigos', null, bruno.cookie)).dado.toques || []).some((t) => t.usuario === 'ana.teste'), 'o Bruno recebe o toque');
await clicar('.tela-toque [data-fechar-tela]');
await dormir(300);

// convite aberto pelo link, dentro do aplicativo
const carla = await criarConta('carla', 'Carla');
const conviteCarla = (await api('/api/convites', {}, carla.cookie)).dado.link;
await cmd('Page.navigate', { url: base + '/?convite=' + new URL(conviteCarla).searchParams.get('convite') + '#/' });
ok(await esperar(existe('.cortina [data-aceitar]') + ' && /Carla te chamou/.test(' + q('.folha') + '.innerText)', 12000),
  'abrir o link de convite mostra quem chamou e o que cada um vê');
await foto('6-aceitar-convite');
await clicar('.cortina [data-aceitar]');
ok(await esperar('CC.amigosEmCache() && CC.amigosEmCache().amigos.length === 2'), 'aceitar pela tela cria o segundo propósito');
ok(await esperar(existe('.tela-proposito')), 'um propósito novo abre a tela de comemoração');
await dormir(900);
await foto('6b-novo-proposito');
await av('document.querySelectorAll(".tela-cheia").forEach((t) => t.remove()), true');
ok(await av('!location.search.includes("convite")'), 'o convite sai do endereço depois de usado');

// pedido pelo @ exato
const dani = await criarConta('dani', 'Dani');
ok((await api('/api/procurar?q=ana', null, dani.cookie)).dado.achado === null, 'a busca por parte do @ não acha ninguém');
ok((await api('/api/amizade', { acao: 'pedir', usuario: 'ana.teste' }, dani.cookie)).status === 200, 'a Dani pede pelo @ exato');
await irPara('#/');
await dormir(300);
await irPara('#/amigos');
ok(await esperar(existe('[data-aceitar="dani"]')), 'o pedido aparece em Pedidos');
await clicar('[data-aceitar="dani"]');
ok(await esperar('document.querySelectorAll(".amigo-roda").length === 3'), 'aceitar o pedido cria o terceiro propósito');
await av('document.querySelectorAll(".tela-cheia").forEach((t) => t.remove()), true');

// bloquear
await clicar('[data-amigo="dani"]');
await esperar(existe('.cortina [data-bloquear]'));
await clicar('.cortina [data-bloquear]');
await esperar(existe('.cortina [data-sim]'));
await clicar('.cortina [data-sim]');
ok(await esperar('document.querySelectorAll(".amigo-roda").length === 2'), 'bloquear tira a pessoa da roda');
await irPara('#/amigos/bloqueados');
ok(await esperar(existe('[data-desbloquear="dani"]')), 'quem foi bloqueado aparece em Pessoas bloqueadas');
ok((await api('/api/procurar?q=ana.teste', null, dani.cookie)).dado.achado === null, 'quem foi bloqueado não acha mais quem bloqueou');

// ---------- novidades ----------
await irPara('#/novidades');
ok(await esperar(existe('[data-mural-ligar]')), 'O Feed pergunta antes de mostrar os marcos aos amigos');
await clicar('[data-mural-ligar]');
ok(await esperar('CC.novidadesEmCache() && CC.novidadesEmCache().ligado === true'), 'a Ana escolhe mostrar os marcos');
ok(await av('CC.compartilharVersiculo("Gênesis 1.1")'), 'a Ana mostra um versículo aos amigos');
const muralBruno = (await api('/api/novidades', null, bruno.cookie)).dado;
const eventoVersiculo = (muralBruno.eventos || []).find((e) => e.tipo === 'versiculo' && e.autor.usuario === 'ana.teste');
ok(!!eventoVersiculo, 'o Bruno vê o versículo da Ana no Feed');
ok(!(muralBruno.eventos || []).some((e) => e.tipo === 'novoProposito' && e.autor.usuario !== 'bruno' && (e.dados || {}).com !== 'bruno'),
  'o propósito novo de outra dupla não aparece para o Bruno');
ok((await api('/api/novidades', { tipo: 'ofensiva', dados: { dias: 30 } }, bruno.cookie)).status === 409,
  'o servidor recusa um marco que o progresso não confirma');
ok((await api('/api/novidades/reagir', { id: eventoVersiculo && eventoVersiculo.id }, bruno.cookie)).dado.total === 1, 'o Bruno celebra a novidade');
await irPara('#/');
await dormir(300);
await irPara('#/novidades');
ok(await esperar(existe('.mural [data-celebrar]') + ' && /Bruno/.test(' + q('.mural') + '.innerText)'), 'a Ana vê quem celebrou');
await dormir(600);
await foto('5-novidades');

// ---------- missões ----------
await irPara('#/missoes');
ok(await esperar('document.querySelectorAll(".bloco-missoes .missao").length >= 3'), 'Missões mostra os desafios do dia');
ok(await av(q('.lista-missoes .missao') + '.classList.contains("feita")'), 'a lição de hoje já conta como missão feita');
await dormir(600);
await foto('5b-missoes');

// ---------- perfil e configurações ----------
await irPara('#/perfil');
ok(await esperar('document.querySelectorAll(".selo-conquista").length === 3 && document.querySelectorAll(".colecao-atalhos a").length === 2 && document.querySelectorAll(".visao-geral .visao-item").length === 4'),
  'o perfil mostra a visão geral, conquistas com nível e a coleção');
ok(await av('/188/.test(' + q('.linha-ajuda') + '.innerText) && !/XP/.test(' + q('.conteudo') + '.innerText)'),
  'o perfil tem a linha do CVV e não mostra XP');
await dormir(400);
await foto('7-perfil');
await irPara('#/perfil/conquistas');
ok(await esperar('document.querySelectorAll(".linha-conquista").length === 10'), 'as dez conquistas aparecem com o nível');
await irPara('#/perfil/escritos');
ok(await esperar('/oração de teste/.test(document.body.innerText)'), 'Meus escritos reúne o que foi escrito');
await irPara('#/config');
ok(await esperar('document.querySelectorAll(".grupo-config").length >= 5 && ' + existe('[data-mural][aria-checked="true"]')),
  'as configurações têm os grupos e a chave dos marcos no Feed');
ok(await av('/ana@teste.com/.test(document.body.innerText) && /06\\/05\\/2004/.test(document.body.innerText)'),
  'a conta mostra o e-mail e a data de nascimento só para a própria pessoa');
await foto('8-config');
await irPara('#/config/textos');
ok(await esperar('document.querySelectorAll(".credito-biblia").length === 2'), 'os créditos das traduções estão em Textos bíblicos');
await irPara('#/passos');
ok(await esperar('document.querySelectorAll(".item-licao").length === 12 && !' + existe('.item-licao button')),
  'Primeiros passos lista as 12 lições sem marcar por toque');

// ---------- conta antiga ----------
await av('fetch("api/sair", { method: "POST" }).then(() => { CC.zerarLocal(); return true; })');
await cmd('Page.navigate', { url: base + '/' });
await esperar(existe('#tela-boas'));
await clicar('[data-ir="entrar"]');
await preencher('#login', 'velho');
await preencher('#senha-entrar', 'senha-velha');
await clicar('#botao-entrar');
ok(await esperar(existe('.cortina #cad-email'), 12000), 'a conta antiga entra e é convidada a completar o cadastro');
await foto('9-completar-cadastro');
await preencher('#cad-email', 'velho@teste.com');
await preencher('#cad-nasc', '1999-09-09');
await clicar('.cortina [data-salvar]');
ok(await esperar('CC.quem && CC.quem.perfilCompleto === true'), 'completar o cadastro libera os amigos');
const { DatabaseSync } = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);
const bancoRedesenho = new DatabaseSync(join(pasta, 'caminho.db'));
const velhoNoBanco = bancoRedesenho.prepare("SELECT email FROM contas WHERE usuario = 'velho'").get();
const versaoContas = (bancoRedesenho.prepare("SELECT valor FROM metadados WHERE chave = 'contas_versao'").get() || {}).valor;
bancoRedesenho.close();
ok(versaoContas === '2' && !!velhoNoBanco && velhoNoBanco.email === 'velho@teste.com' && !existsSync(arquivoContas),
  'a conta antiga foi migrada do JSON para o banco e completada');

const excecoes = eventos.filter((e) => e.method === 'Runtime.exceptionThrown')
  .map((e) => e.params.exceptionDetails?.exception?.description || 'exceção');
ok(excecoes.length === 0, 'nenhuma exceção de JavaScript' + (excecoes[0] ? ': ' + excecoes[0].slice(0, 200) : ''));
if (erroServidor) console.log('\n  erro do servidor:\n' + erroServidor.slice(0, 600));

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  o redesenho funciona de ponta a ponta\n');
try { fecharArvore(nav, perfil); } catch { /* ok */ }
try { servidor.kill(); } catch { /* ok */ }
await dormir(300);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ok */ }
try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
process.exit(falhas ? 1 : 0);
