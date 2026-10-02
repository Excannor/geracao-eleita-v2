// A jornada de uma pessoa nova no Geração Eleita, medida de ponta a ponta: o cadastro de
// verdade em entrar.html (3 passos), a primeira abertura do app com tudo o que aparece antes
// da leitura (abertura, tutorial de instalar, convite de notificações, avisos do dia), a
// trilha, a lição do dia 1 até o resumo (ou o dia 1 do Conhecer Jesus até "Terminei o dia");
// e depois os dias 2..N, com o relógio do servidor E do navegador adiantados juntos
// (design/ferramentas/analise/relogio.mjs), como se a pessoa voltasse a cada manhã.
//
// Conta toques (cliques), campos digitados, interrupções (folhas que abriram sem a pessoa
// pedir), palavras nas telas até o primeiro texto bíblico, tempo, erros de console e de rede,
// e tira uma captura por passo. Sai um relatório em Markdown e em JSON.
//
// Uso (a partir da raiz do repositório, depois de `node build.mjs`):
//   CHROME=<chrome> node design/ferramentas/analise/jornada.mjs <plano|conhecer> [dias]
//     dias       quantos dias simular (padrão 1; o dia 1 é o do cadastro; até 8 fica rápido)
//   SAIDA        pasta de saída (padrão capturas/analise/jornada/<caminho>-<data-hora>/, que o
//                git ignora): relatorio.md, relatorio.json, dNN-pNN-<passo>.png, servidor/ (dados
//                do servidor de teste), perfil/ (o perfil do Chrome, reaproveitado entre os dias)
//   PORTA        porta do servidor de teste (padrão: uma livre)
//   TEMA         claro (padrão) ou escuro
//   PULAR        dias em que a pessoa NÃO abre o app (PULAR=3 ou PULAR=3,4,5): mostra o escudo
//                cobrindo um dia e a chama apagando (folha "Ainda tem brasa")
//   NOME, USUARIO, SENHA   quem se cadastra (padrão Joana / joana / senha-da-joana)
//   LARGURA, ALTURA        janela (padrão 390 x 844)
//
// O servidor de teste sobe sozinho (porta livre, pasta própria): não precisa de nenhum outro.
// Não toque em `node build.mjs` enquanto ele roda: o servidor serve o dist/ desta pasta.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { abrir, dormir, esperar as esperarAte, AQUI, RAIZ } from './cdp.mjs';
import { codigoDoDesvio, DIA_MS } from './relogio.mjs';

const { portaLivre } = await import(pathToFileURL(join(RAIZ, 'ferramentas', 'navegador.mjs')).href);

const CAMINHO = process.argv[2];
const DIAS = Math.max(1, Number(process.argv[3] || 1));
if (!['plano', 'conhecer'].includes(CAMINHO)) {
  console.log('uso: CHROME=<chrome> node design/ferramentas/analise/jornada.mjs <plano|conhecer> [dias]');
  process.exit(1);
}
if (!existsSync(join(RAIZ, 'dist', 'index.html'))) { console.log('rode `node build.mjs` antes: o servidor de teste serve o dist/'); process.exit(1); }

const agoraRotulo = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); };
const SAIDA = process.env.SAIDA || join(RAIZ, 'capturas', 'analise', 'jornada', CAMINHO + '-' + agoraRotulo());
const DADOS = join(SAIDA, 'servidor');
const PERFIL = join(SAIDA, 'perfil');
mkdirSync(DADOS, { recursive: true });
mkdirSync(PERFIL, { recursive: true });
const LOG = join(SAIDA, 'servidor.log');
const PORTA = Number(process.env.PORTA) || await portaLivre();
const BASE = 'http://localhost:' + PORTA + '/';
const TEMA = process.env.TEMA === 'escuro' ? 'escuro' : 'claro';
const LARGURA = Number(process.env.LARGURA) || 390;
const ALTURA = Number(process.env.ALTURA) || 844;
const PULAR = new Set(String(process.env.PULAR || '').split(',').map((s) => Number(s.trim())).filter(Boolean));
const NOME = process.env.NOME || 'Joana';
const USUARIO = process.env.USUARIO || 'joana';
const SENHA = process.env.SENHA || 'senha-da-joana';
const PALAVRAS_POR_MINUTO = 200; // leitura silenciosa de adulto, para estimar o tempo real da passagem

// ---------------------------------------------------------------- servidor de teste
async function subirServidor(desvioDias) {
  const env = { ...process.env, CAMINHO_ESTADO: join(DADOS, 'estado.json'), RELOGIO_DIAS: String(desvioDias) };
  delete env.CAMINHO_ABERTO; delete env.CAMINHO_ADMIN; delete env.CAMINHO_PUSH_TESTE; delete env.CAMINHO_RELOGIO;
  const proc = spawn(process.execPath, ['--import', pathToFileURL(join(AQUI, 'relogio.mjs')).href, join(RAIZ, 'servidor.mjs'), String(PORTA)], { env, stdio: ['ignore', 'ignore', 'pipe'] });
  proc.stderr.on('data', (d) => appendFileSync(LOG, d));
  let subiu = false;
  for (let i = 0; i < 100 && !subiu; i++) {
    try { await fetch(BASE + 'api/existe-conta'); subiu = true; } catch { await dormir(150); }
  }
  if (!subiu) throw new Error('o servidor não subiu na porta ' + PORTA + ' (veja ' + LOG + ')');
  return proc;
}
const derrubar = (proc) => new Promise((r) => { if (!proc || proc.exitCode !== null) { r(); return; } proc.once('exit', r); proc.kill(); setTimeout(r, 3000); });

// ---------------------------------------------------------------- o que a página mostra
const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
const existe = (sel) => '(() => { const el = ' + q(sel) + '; if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()';
const RETRATO = `(() => {
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const limpo = (s) => String(s || '').trim().replace(/\\s+/g, ' ');
  const palavrasDe = (el) => limpo(el && el.innerText).split(' ').filter(Boolean).length;
  const camadas = [...document.querySelectorAll('#abertura, .cortina > .folha, .licao, .leitor, .tela-cheia')].filter(vis).map((el) => ({
    tipo: el.id ? '#' + el.id : '.' + limpo(el.className).split(' ').slice(0, 2).join('.'),
    rotulo: el.getAttribute('aria-label') || '',
    titulo: limpo((el.querySelector('h1, h2, .fala-bento') || {}).innerText).slice(0, 90),
    palavras: palavrasDe(el),
    botoes: [...el.querySelectorAll('button, a.botao, a.cartao-destaque')].filter(vis).map((b) => limpo(b.innerText || b.getAttribute('aria-label')).slice(0, 32)).filter(Boolean).slice(0, 8),
  }));
  const aviso = document.getElementById('aviso-flutuante');
  const tela = document.querySelector('.conteudo');
  return { url: location.pathname + location.search + location.hash, camadas, palavrasPagina: palavrasDe(document.body),
    palavrasTela: palavrasDe(tela || document.body), aviso: vis(aviso) ? limpo(aviso.innerText) : '', titulo: document.title,
    h1: limpo((document.querySelector('.conteudo h1, main h1, h1') || {}).innerText).slice(0, 80) };
})()`;
// Dispensa a folha de cima com a opção mais branda ("Pular por agora", "Agora não", "Fechar").
const DISPENSAR = `(() => { const f = [...document.querySelectorAll('.cortina > .folha')].pop(); if (!f) return null;
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  for (const s of ['[data-pular]', '[data-nao]', '[data-fechar]', '[data-fechar2]', '.botao.plano']) { const b = [...f.querySelectorAll(s)].find(vis); if (b) { const t = (b.innerText || '').trim(); b.click(); return t || s; } }
  const c = f.parentNode; if (c && !c.dataset.presa) { c.click(); return 'toque fora da folha'; }
  return null; })()`;
const RESUMO = `(() => { const e = CC.estado(); const s = CC.sequencia(); return { hoje: CC.hojeIso(), ofensiva: s.atual, escudos: s.escudos, feitoHoje: s.feitoHoje, protegidos: s.protegidos, zerouEm: s.zerouEm,
  diasLidos: (e.lidos || []).length, conhecidos: Object.keys(e.conhecidos || {}).length, marcadoEm: e.marcadoEm || {}, conhecidosEm: e.conhecidos || {},
  notificacao: typeof Notification === 'undefined' ? 'sem API' : Notification.permission, comoApp: CC.rodandoComoApp ? CC.rodandoComoApp() : null,
  caminho: CC.quem && CC.quem.caminho }; })()`;

// ---------------------------------------------------------------- a sessão de um dia
let cmd; let av; let fecharNavegador;
const relatorio = { caminho: CAMINHO, dias: [], base: BASE, tema: TEMA, largura: LARGURA, altura: ALTURA, usuario: USUARIO, geradoEm: new Date().toISOString() };
let D; // o dia corrente do relatório
let marcaTempo = 0;
let numeroFoto = 0;

async function abrirApp(desvioDias) {
  const erros = [];
  const nav = await abrir({ base: BASE, pre: codigoDoDesvio(desvioDias * DIA_MS), silenciar: false, perfil: PERFIL, largura: LARGURA, altura: ALTURA });
  ({ cmd, av } = nav);
  fecharNavegador = nav.fechar;
  await cmd('Log.enable');
  nav.ouvir('Runtime.exceptionThrown', (p) => erros.push({ tipo: 'exceção', texto: String((p.exceptionDetails.exception && p.exceptionDetails.exception.description) || p.exceptionDetails.text).split('\n')[0].slice(0, 200) }));
  nav.ouvir('Runtime.consoleAPICalled', (p) => { if (p.type === 'error' || p.type === 'warning') erros.push({ tipo: 'console.' + p.type, texto: (p.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 200) }); });
  // navigator.vibrate reclama no Chrome sem interface porque o clique sintético não conta como
  // gesto da pessoa: ruído do ambiente, não do app.
  nav.ouvir('Log.entryAdded', (p) => { if (p.entry && p.entry.level === 'error' && !/navigator\.vibrate/.test(p.entry.text)) erros.push({ tipo: 'log', texto: (p.entry.text + ' ' + (p.entry.url || '')).slice(0, 200) }); });
  nav.ouvir('Network.responseReceived', (p) => { if (p.response && p.response.status >= 400) erros.push({ tipo: 'rede ' + p.response.status, texto: p.response.url.replace(BASE, '/').slice(0, 160) }); });
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: TEMA === 'escuro' ? 'dark' : 'light' }] });
  // No Chrome sem interface a permissão de notificação já nasce negada e o convite nem aparece;
  // pedimos "perguntar", como num celular de verdade. Se o Chrome não deixar, o relatório
  // mostra Notification.permission e a regra fica anotada (07d-notificacoes.js).
  try { await cmd('Browser.setPermission', { permission: { name: 'notifications' }, setting: 'prompt', origin: BASE.replace(/\/$/, '') }); } catch { /* sem domínio Browser nesta sessão */ }
  return erros;
}

function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }

async function registrar(nome, extra = {}) {
  const retrato = (await av(RETRATO)) || {};
  const agora = Date.now();
  const ms = marcaTempo ? agora - marcaTempo : 0;
  marcaTempo = agora;
  const n = D.passos.length + 1;
  const foto = 'd' + String(D.dia).padStart(2, '0') + '-p' + String(n).padStart(2, '0') + '-' + slug(nome) + '.png';
  const shot = await cmd('Page.captureScreenshot', { format: 'png' });
  if (shot.data) writeFileSync(join(SAIDA, foto), Buffer.from(shot.data, 'base64'));
  numeroFoto++;
  const topo = retrato.camadas && retrato.camadas.length ? retrato.camadas[retrato.camadas.length - 1] : null;
  const passo = {
    n, nome, toque: !!extra.toque, campo: !!extra.campo, interrupcao: !!extra.interrupcao, rolagem: !!extra.rolagem,
    url: retrato.url, tela: topo ? (topo.rotulo || topo.titulo || topo.tipo) : (retrato.h1 || retrato.titulo),
    camadas: (retrato.camadas || []).map((c) => c.rotulo || c.titulo || c.tipo),
    palavras: topo ? topo.palavras : retrato.palavrasTela, botoes: topo ? topo.botoes : [], aviso: retrato.aviso || '', ms, foto,
    ...(extra.dados ? { dados: extra.dados } : {}),
  };
  D.passos.push(passo);
  if (extra.toque) D.toques++;
  if (extra.campo) D.campos++;
  if (extra.interrupcao) {
    // a folha que interrompeu (passada em dados.interrupcao), não a camada que ficou depois de dispensá-la
    const f = (extra.dados && extra.dados.interrupcao) || topo || {};
    D.interrupcoes.push({ passo: n, tela: f.rotulo || f.titulo || f.tipo || passo.tela, titulo: f.titulo || '', palavras: f.palavras || 0, botoes: f.botoes || [], dispensada: extra.dispensada || '' });
  }
  console.log('  ' + String(n).padStart(2) + '. ' + nome + (extra.toque ? ' [toque]' : '') + (extra.campo ? ' [digitou]' : '') + '  (' + (passo.tela || '') + ', ' + passo.palavras + ' palavras)');
  return passo;
}
async function toque(sel, nome, { espera = 600, dados } = {}) {
  const feito = await av('(() => { const el = ' + q(sel) + '; if (!el) return false; el.click(); return true; })()');
  if (!feito) throw new Error('não achei para tocar: ' + sel + ' (' + nome + ')');
  await dormir(espera);
  return registrar(nome, { toque: true, dados });
}
async function digitar(sel, valor, nome) {
  const feito = await av('(() => { const el = ' + q(sel) + '; if (!el) return false; el.focus(); el.value = ' + JSON.stringify(valor) + '; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return true; })()');
  if (!feito) throw new Error('não achei o campo: ' + sel);
  return registrar(nome, { campo: true });
}
const esperarApp = () => esperarAte(av, 'window.CC && CC.estado && CC.quem && !document.getElementById("abertura")', 15000);

// ---------------------------------------------------------------- dia 1: o cadastro
async function cadastrar() {
  await cmd('Page.navigate', { url: BASE + 'entrar.html' });
  await esperarAte(av, existe('#tela-boas'), 8000);
  await dormir(800);
  await registrar('Abriu o app pela primeira vez: boas-vindas (entrar.html)');
  await toque('#botao-comecar', 'Tocou em "Começar agora"');
  await digitar('#nome', NOME, 'Digitou o nome');
  await digitar('#nascimento', '2004-05-10', 'Digitou a data de nascimento');
  if (CAMINHO === 'conhecer') await toque('[data-caminho="conhecer"]', 'Respondeu "Estou conhecendo" em "Você já segue Jesus?"');
  else await registrar('Deixou "Sim" em "Você já segue Jesus?" (já vem marcado)');
  await toque('#botao-cadastro', 'Tocou em "Continuar" (passo 1 de 3)');
  await esperarAte(av, existe('[data-passo="2"]'), 4000);
  await digitar('#email', USUARIO + '@exemplo.com', 'Digitou o e-mail');
  await toque('#botao-cadastro', 'Tocou em "Continuar" (passo 2 de 3)');
  await esperarAte(av, existe('[data-passo="3"]'), 4000);
  await digitar('#usuario', USUARIO, 'Digitou o @usuário');
  await digitar('#senha-nova', SENHA, 'Digitou a senha');
  await toque('#consentimento-cadastro', 'Marcou o consentimento (texto da LGPD)');
  await toque('#botao-cadastro', 'Tocou em "Continuar" (passo 3 de 3): a conta é criada', { espera: 1500 });
  if (!(await esperarApp())) throw new Error('o app não abriu depois do cadastro (veja a captura)');
  // a sessão de quem acabou de se cadastrar: guardada para os dias seguintes (e para quem quiser
  // consultar a API desta conta à mão: cookie em SAIDA/cookie.txt)
  const cookies = await cmd('Network.getCookies', { urls: [BASE] });
  const sessao = ((cookies && cookies.cookies) || []).find((c) => c.name === 'cc_sessao');
  if (sessao) { relatorio.cookie = sessao.name + '=' + sessao.value; writeFileSync(join(SAIDA, 'cookie.txt'), relatorio.cookie); }
  await dormir(900);
  await registrar('O app abriu: a abertura saiu e a primeira tela apareceu');
}

async function voltar() {
  // O perfil do Chrome guarda o cookie quando o Chrome fecha direito (cdp.mjs); por segurança,
  // o cookie do dia 1 é reposto, como o celular que continua logado.
  if (relatorio.cookie) {
    const [nome, ...resto] = relatorio.cookie.split('=');
    await cmd('Network.setCookie', { name: nome, value: resto.join('='), url: BASE });
  }
  await cmd('Page.navigate', { url: BASE });
  if (!(await esperarApp())) {
    const onde = await av('location.pathname');
    throw new Error('o app não abriu ao voltar' + (/entrar/.test(onde || '') ? ': caiu em entrar.html (sessão perdida)' : ''));
  }
  await dormir(1200);
  await registrar('Abriu o app de novo (dia ' + D.dia + ', ' + D.data + ')');
}

// Tudo o que se põe na frente da pessoa antes de ela pedir algo. Cada folha é dispensada com a
// opção mais branda e conta como interrupção e como toque. A folha "Ainda tem brasa"
// (ofensiva zerada) tem um caminho positivo, "Reavivar hoje", que já leva à lição: esse é tomado.
// Com { depois: true }, são as folhas que o app abre depois do dia feito (o tutorial de instalar
// e o convite de notificações da conta nova, desde 02/10/2026): contam à parte, porque vêm
// depois do valor, não antes dele.
async function interrupcoes({ depois = false } = {}) {
  for (let i = 0; i < 6; i++) {
    await dormir(depois && !i ? 1500 : 900);
    const r = await av(RETRATO);
    const folha = (r.camadas || []).filter((c) => c.tipo.startsWith('.folha')).pop();
    if (!folha) break;
    if (depois) {
      const como = await av(DISPENSAR);
      await dormir(500);
      await registrar('Folha depois do dia feito: ' + (folha.rotulo || folha.titulo) + (folha.titulo && folha.titulo !== folha.rotulo ? ' ("' + folha.titulo + '")' : '') + '. Dispensada com "' + como + '"', { toque: true, dados: { folha } });
      D.depois.push({ passo: D.passos.length, tela: folha.rotulo || folha.titulo, titulo: folha.titulo || '', palavras: folha.palavras || 0, botoes: folha.botoes || [], dispensada: como || '' });
      continue;
    }
    if (/Recomeçar/.test(folha.rotulo) && (await av(existe('.cortina [data-ler]')))) {
      await toque('.cortina [data-ler]', 'Interrupção: "' + folha.titulo + '" (ofensiva zerou). Tocou em "Reavivar hoje"', { dados: { interrupcao: folha } });
      D.interrupcoes.push({ passo: D.passos.length, tela: folha.rotulo, titulo: folha.titulo, palavras: folha.palavras, botoes: folha.botoes, dispensada: 'Reavivar hoje (leva à lição)' });
      return;
    }
    const como = await av(DISPENSAR);
    await dormir(500);
    await registrar('Interrupção: ' + (folha.rotulo || folha.titulo) + (folha.titulo && folha.titulo !== folha.rotulo ? ' ("' + folha.titulo + '")' : '') + '. Dispensada com "' + como + '"', { toque: true, interrupcao: true, dispensada: como, dados: { interrupcao: folha } });
  }
}

// ---------------------------------------------------------------- a leitura do dia
async function lerNoLeitor(rotuloTerminar) {
  let voltas = 0;
  while (voltas++ < 4 && (await esperarAte(av, existe('.leitor .leitor-texto'), 4000))) {
    await esperarAte(av, '((' + q('.leitor-texto') + ' || {}).innerText || "").length > 200', 6000);
    const info = await av('(() => { const t = document.querySelector(".leitor-texto"); const ref = ((document.querySelector(".leitor-titulo b") || {}).innerText || "").trim(); const palavras = ((t && t.innerText) || "").split(/\\s+/).filter(Boolean).length; const b = document.querySelector(".leitor [data-terminei]"); return { ref, palavras, botao: b ? b.innerText.trim() : "" }; })()');
    // limite: o passo que abriu o leitor já mostra o texto; as palavras "até o texto" vão até antes dele
    if (!D.marcos.leitura) D.marcos.leitura = { passo: D.passos.length + 1, limite: D.passos.length, toques: D.toques, campos: D.campos };
    D.leituras.push({ ref: info.ref, palavras: info.palavras, minutosEstimados: Math.round((info.palavras / PALAVRAS_POR_MINUTO) * 10) / 10 });
    await registrar('Texto bíblico na tela: ' + info.ref + ' (' + info.palavras + ' palavras, uns ' + Math.round(info.palavras / PALAVRAS_POR_MINUTO) + ' min de leitura)', { dados: info });
    await av('(() => { const p = document.querySelector(".leitor .licao-palco"); if (p) p.scrollTop = p.scrollHeight; return true; })()');
    await dormir(500);
    await registrar('Rolou até o fim de ' + info.ref, { rolagem: true });
    await toque('.leitor [data-terminei]', 'Tocou em "' + (info.botao || rotuloTerminar) + '"', { espera: 900 });
  }
}

async function lerDiaPlano() {
  if (!(await av(existe('.licao.tela-leitura')))) {
    if (await av(existe('.cartao-salvia[data-abrir-dia]'))) {
      await toque('.cartao-salvia[data-abrir-dia]', 'Tocou no cartão "leituras hoje" da folha do topo');
    } else {
      await toque('.no.atual', 'Tocou no nó de hoje na trilha (abre o balão)');
      await toque('[data-abrir-dia]', 'Tocou em "Começar" no balão');
    }
  }
  if (!(await esperarAte(av, existe('.licao.tela-leitura'), 6000))) throw new Error('a lição não abriu');
  await dormir(400);
  const cabeca = await av('(() => ({ dia: (document.querySelector(".licao .etiqueta") || {}).innerText, passagens: [...document.querySelectorAll(".licao .passagem")].map((p) => ({ ref: (p.querySelector(".ref") || {}).innerText, tempo: (p.querySelector(".tempo") || {}).innerText })) }))()');
  D.prometido = cabeca.passagens;
  await registrar('A lição abriu: ' + (cabeca.dia || '') + ' · ' + cabeca.passagens.map((p) => p.ref + ' (' + p.tempo + ')').join(' e '), { dados: cabeca });
  if (await av(existe('.licao .passagem:not(.feita) [data-ler]'))) {
    await toque('.licao .passagem:not(.feita) [data-ler]', 'Tocou em "Ler aqui" na primeira passagem', { espera: 1200 });
    await lerNoLeitor('Terminei a leitura');
  } else {
    // sem tradução escolhida no app: a pessoa lê na Bíblia dela e só marca
    while (await av(existe('.licao [data-trilha][aria-pressed="false"]'))) await toque('.licao [data-trilha][aria-pressed="false"]', 'Tocou em "Marcar como lido"');
  }
  if (!(await esperarAte(av, existe('.licao [data-concluir]:not([disabled])'), 5000))) throw new Error('"Concluir o dia" não ficou disponível');
  await toque('.licao [data-concluir]', 'Tocou em "Concluir o dia"', { espera: 1500 });
  if (await esperarAte(av, existe('.licao.tela-festa'), 6000)) {
    D.marcos.dia = { passo: D.passos.length, toques: D.toques, campos: D.campos };
    await registrar('O dia contou: a reflexão abre em "Guardar" (versículo do dia)');
  }
  for (const etapa of ['Pensar', 'Orar']) {
    const rotulo = await av('((' + q('.licao [data-avancar]') + ' || {}).innerText || "").trim()');
    await toque('.licao [data-avancar]', 'Tocou em "' + (rotulo || etapa) + '"', { espera: 800 });
    if (etapa === 'Pensar' && (await av(existe('.licao [data-pergunta]')))) await toque('.licao [data-pergunta]', 'Escolheu uma pergunta para pensar');
    if (etapa === 'Orar' && (await av(existe('.licao [data-orei]')))) await toque('.licao [data-orei]', 'Tocou em "Orei"');
  }
  const ultimo = await av('((' + q('.licao [data-avancar]') + ' || {}).innerText || "").trim()');
  await toque('.licao [data-avancar]', 'Tocou em "' + (ultimo || 'Concluir') + '"', { espera: 1500 });
  if (await esperarAte(av, existe('.licao.tela-resumo'), 6000)) await registrar('Resumo do dia (chama, semana, destaques)');
  if (await av(existe('.licao [data-voltar-trilha]'))) await toque('.licao [data-voltar-trilha]', 'Tocou em "' + (await av('(' + q('.licao [data-voltar-trilha]') + ').innerText.trim()')) + '"', { espera: 1200 });
  else if (await av(existe('.licao [data-fechar]'))) await toque('.licao [data-fechar]', 'Fechou a lição (X)', { espera: 1000 });
  await esperarAte(av, '!' + existe('.licao'), 5000);
  await registrar('De volta à trilha, com o dia feito');
}

async function lerDiaConhecer() {
  if (!(await av(existe('.licao.tela-conhecer')))) {
    if (await av(existe('a.cartao-destaque[href^="#/conhecer/"]'))) {
      const texto = await av('(' + q('a.cartao-destaque[href^="#/conhecer/"]') + ').innerText.trim()');
      await toque('a.cartao-destaque[href^="#/conhecer/"]', 'Tocou em "' + texto + '"', { espera: 1200 });
    } else {
      await av('location.hash = "#/conhecer"'); await dormir(1200);
      await registrar('Foi para a lista dos 14 dias (#/conhecer)');
      await toque('a.cartao-destaque[href^="#/conhecer/"], a[href^="#/conhecer/"]', 'Tocou no dia a abrir', { espera: 1200 });
    }
  }
  if (!(await esperarAte(av, existe('.licao.tela-conhecer'), 6000))) throw new Error('o dia do Conhecer Jesus não abriu');
  await dormir(400);
  const cabeca = await av('(() => ({ dia: (document.querySelector(".licao .etiqueta") || {}).innerText, titulo: (document.querySelector(".licao h1") || {}).innerText, passagem: (document.querySelector(".licao .passagem-hoje") || {}).innerText, tempo: (document.querySelector(".licao .leitura-hoje .tempo") || {}).innerText }))()');
  D.prometido = [{ ref: cabeca.passagem, tempo: cabeca.tempo }];
  await registrar('O dia abriu: ' + (cabeca.dia || '') + ' · "' + (cabeca.titulo || '') + '" · ' + (cabeca.passagem || '') + ' (' + (cabeca.tempo || '') + ')', { dados: cabeca });
  await toque('.licao.tela-conhecer [data-ler]', 'Tocou em "Ler"', { espera: 1200 });
  await lerNoLeitor('Terminei a leitura');
  await esperarAte(av, '!' + existe('.leitor'), 4000);
  await registrar('De volta ao dia: "Repare", a pergunta e a conversa com Deus');
  await toque('.licao.tela-conhecer [data-terminar]', 'Tocou em "Terminei o dia"', { espera: 1000 });
  D.marcos.dia = { passo: D.passos.length, toques: D.toques, campos: D.campos };
  await registrar('Dia concluído (conta para a ofensiva)');
  await toque('.licao.tela-conhecer [data-fechar]', 'Fechou o dia (X): volta à lista dos 14 dias', { espera: 1000 });
}

async function fimDoDia(erros) {
  const resumo = await av(RESUMO);
  // o que o servidor guardou: confirma que as datas do dia simulado foram aceitas (régua dos 7 dias)
  const servidor = await av('fetch("api/estado", { cache: "no-store" }).then((r) => r.json()).then((e) => ({ marcadoEm: e.marcadoEm || {}, conhecidos: e.conhecidos || {} })).catch((e) => ({ erro: String(e) }))');
  D.fim = { ...resumo, servidor };
  const vistos = new Set();
  D.erros = erros.filter((e) => { const k = e.tipo + e.texto; if (vistos.has(k)) return false; vistos.add(k); return true; });
  D.tempoMs = D.passos.reduce((s, p) => s + p.ms, 0);
  console.log('  fim do dia ' + D.dia + ': ofensiva ' + resumo.ofensiva + ', escudos ' + resumo.escudos + ', ' + D.toques + ' toques, ' + D.interrupcoes.length + ' interrupções, ' + D.depois.length + ' folhas depois do dia, ' + D.erros.length + ' erros');
}

// ---------------------------------------------------------------- os dias
const hojeMais = (n) => { const d = new Date(Date.now() + n * DIA_MS); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
console.log('\n  Jornada ' + CAMINHO + ', ' + DIAS + ' dia(s), conta @' + USUARIO + ' · ' + BASE + ' · saída em ' + SAIDA + '\n');
for (let dia = 1; dia <= DIAS; dia++) {
  const desvio = dia - 1;
  D = { dia, data: hojeMais(desvio), passos: [], toques: 0, campos: 0, interrupcoes: [], depois: [], leituras: [], marcos: {}, erros: [], prometido: [] };
  relatorio.dias.push(D);
  if (PULAR.has(dia)) { D.pulado = true; console.log('  dia ' + dia + ' (' + D.data + '): não abriu o app'); continue; }
  console.log('  dia ' + dia + ' (' + D.data + ')');
  let servidor = null; let erros = [];
  try {
    servidor = await subirServidor(desvio);
    try { rmSync(join(PERFIL, 'SingletonLock'), { force: true }); } catch { /* ok */ }
    erros = await abrirApp(desvio);
    marcaTempo = 0;
    if (dia === 1) await cadastrar(); else await voltar();
    await interrupcoes();
    if (CAMINHO === 'plano') await lerDiaPlano(); else await lerDiaConhecer();
    await interrupcoes({ depois: true });
    await fimDoDia(erros);
  } catch (e) {
    D.erroFatal = e.message;
    console.log('  ERRO no dia ' + dia + ': ' + e.message);
    try { await registrar('ERRO: ' + e.message); await fimDoDia(erros); } catch { /* sem página */ }
  } finally {
    try { if (fecharNavegador) await fecharNavegador(); } catch { /* ok */ }
    await derrubar(servidor);
    await dormir(400);
  }
}

// ---------------------------------------------------------------- o relatório
const palavrasAte = (d, passoLimite) => {
  const vistos = new Set(); let soma = 0;
  for (const p of d.passos) { if (passoLimite && p.n >= passoLimite) break; const k = p.url + '|' + p.tela; if (vistos.has(k)) continue; vistos.add(k); soma += p.palavras || 0; }
  return soma;
};
const seg = (ms) => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
const L = [];
L.push('# Jornada do usuário: ' + (CAMINHO === 'plano' ? 'plano da Bíblia em um ano' : 'Conhecer Jesus') + ', ' + DIAS + ' dia(s)');
L.push('');
L.push('Conta @' + USUARIO + ' criada de verdade em entrar.html · ' + LARGURA + '×' + ALTURA + ', tema ' + TEMA + ' · servidor de teste em ' + BASE + ' com o relógio adiantado por dia (relogio.mjs) · gerado em ' + relatorio.geradoEm.slice(0, 16).replace('T', ' ') + '.');
L.push('');
L.push('Toques = cliques em botões, links, nós e caixas; campos = o que a pessoa digitou. "Até o texto bíblico" é o primeiro valor: o momento em que a Bíblia aparece na tela. Palavras = o que estava escrito nas telas distintas até ali (inclui o texto que ela precisou passar, não o que leu de fato).');
L.push('');
L.push('## Resumo');
L.push('');
L.push('| Dia | Data | Até o texto bíblico | Até concluir o dia | Interrupções | Folhas depois do dia feito | Palavras até o texto | Tempo da automação | Ofensiva · escudos ao fim | Erros |');
L.push('|---|---|---|---|---|---|---|---|---|---|');
for (const d of relatorio.dias) {
  if (d.pulado) { L.push('| ' + d.dia + ' | ' + d.data + ' | não abriu o app | | | | | | | |'); continue; }
  const m1 = d.marcos.leitura; const m2 = d.marcos.dia;
  L.push('| ' + d.dia + ' | ' + d.data + ' | ' + (m1 ? m1.toques + ' toques' + (m1.campos ? ' + ' + m1.campos + ' campos' : '') + ' (passo ' + m1.passo + ')' : 'não chegou') + ' | '
    + (m2 ? m2.toques + ' toques' + (m2.campos ? ' + ' + m2.campos + ' campos' : '') + ' (passo ' + m2.passo + ')' : 'não chegou') + ' | '
    + d.interrupcoes.length + (d.interrupcoes.length ? ' (' + d.interrupcoes.map((i) => i.tela).join(', ') + ')' : '') + ' | '
    + (d.depois || []).length + ((d.depois || []).length ? ' (' + d.depois.map((i) => i.tela).join(', ') + ')' : '') + ' | '
    + (m1 ? palavrasAte(d, m1.limite) : palavrasAte(d)) + ' | ' + seg(d.tempoMs || 0) + ' | '
    + (d.fim ? d.fim.ofensiva + ' · ' + d.fim.escudos : '?') + ' | ' + d.erros.length + (d.erroFatal ? ' + parou' : '') + ' |');
}
L.push('');
for (const d of relatorio.dias) {
  L.push('## Dia ' + d.dia + ' (' + d.data + ')' + (d.pulado ? ': não abriu o app' : ''));
  L.push('');
  if (d.pulado) { L.push('Dia pulado de propósito (PULAR): veja no dia seguinte o que o app faz ao voltar.'); L.push(''); continue; }
  if (d.erroFatal) { L.push('**A automação parou:** ' + d.erroFatal + '. Os passos abaixo vão até aí.'); L.push(''); }
  if (d.prometido && d.prometido.length) L.push('**O que o app prometeu:** ' + d.prometido.map((p) => (p.ref || '?') + ' (' + (p.tempo || 'sem tempo') + ')').join(' e ') + '.');
  if (d.leituras.length) L.push('**O que a pessoa leu de fato:** ' + d.leituras.map((l) => l.ref + ': ' + l.palavras + ' palavras, uns ' + l.minutosEstimados + ' min a ' + PALAVRAS_POR_MINUTO + ' palavras/min').join('; ') + '. Total: ' + d.leituras.reduce((s, l) => s + l.palavras, 0) + ' palavras, uns ' + Math.round(d.leituras.reduce((s, l) => s + l.palavras, 0) / PALAVRAS_POR_MINUTO) + ' min.');
  if (d.marcos.leitura) L.push('**Primeiro texto bíblico:** passo ' + d.marcos.leitura.passo + ', depois de ' + d.marcos.leitura.toques + ' toques e ' + d.marcos.leitura.campos + ' campos, com ' + palavrasAte(d, d.marcos.leitura.limite) + ' palavras nas telas até ali.');
  if (d.marcos.dia) L.push('**Dia concluído:** passo ' + d.marcos.dia.passo + ', ' + d.marcos.dia.toques + ' toques e ' + d.marcos.dia.campos + ' campos no total.');
  if (d.interrupcoes.length) {
    L.push('');
    L.push('**Interrupções (' + d.interrupcoes.length + '):**');
    for (const i of d.interrupcoes) L.push('- passo ' + i.passo + ': ' + i.tela + (i.titulo ? ' ("' + i.titulo + '")' : '') + ', ' + i.palavras + ' palavras, botões: ' + (i.botoes || []).join(' · ') + '. Dispensada com "' + i.dispensada + '".');
  } else L.push('**Interrupções:** nenhuma.');
  if ((d.depois || []).length) {
    L.push('**Folhas depois do dia feito (' + d.depois.length + '):**');
    for (const i of d.depois) L.push('- passo ' + i.passo + ': ' + i.tela + (i.titulo ? ' ("' + i.titulo + '")' : '') + ', ' + i.palavras + ' palavras, botões: ' + (i.botoes || []).join(' · ') + '. Dispensada com "' + i.dispensada + '".');
  }
  L.push('');
  L.push('| # | Passo | Tela | Camadas abertas | Palavras | Aviso | ms | Captura |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const p of d.passos) L.push('| ' + p.n + ' | ' + p.nome.replace(/\|/g, '/') + (p.toque ? ' **[toque]**' : '') + (p.campo ? ' [campo]' : '') + (p.rolagem ? ' [rolagem]' : '') + ' | ' + (p.tela || '') + ' | ' + (p.camadas || []).join(' > ') + ' | ' + p.palavras + ' | ' + (p.aviso || '') + ' | ' + p.ms + ' | ' + p.foto + ' |');
  L.push('');
  if (d.fim) {
    L.push('**Ao fim do dia:** hoje (no app) ' + d.fim.hoje + ' · ofensiva ' + d.fim.ofensiva + ' · escudos ' + d.fim.escudos + (d.fim.protegidos && d.fim.protegidos.length ? ' · dias cobertos por escudo: ' + d.fim.protegidos.join(', ') : '') + (d.fim.zerouEm ? ' · zerou em ' + d.fim.zerouEm : '') + ' · dias lidos ' + d.fim.diasLidos + ' · dias do Conhecer ' + d.fim.conhecidos + ' · Notification.permission: ' + d.fim.notificacao + ' · instalado como app: ' + d.fim.comoApp + '.');
    const srv = d.fim.servidor || {};
    const datas = Object.entries(CAMINHO === 'plano' ? (srv.marcadoEm || {}) : (srv.conhecidos || {})).map(([k, v]) => k + ': ' + v).join(', ');
    L.push('**O servidor guardou:** ' + (srv.erro ? srv.erro : (datas || 'nada ainda')) + '.');
  }
  if (d.erros.length) {
    L.push('');
    L.push('**Erros de console e de rede (' + d.erros.length + '):**');
    for (const e of d.erros) L.push('- ' + e.tipo + ': ' + e.texto.replace(/\n/g, ' '));
  }
  L.push('');
}
L.push('Capturas e este relatório: ' + SAIDA);
writeFileSync(join(SAIDA, 'relatorio.md'), L.join('\n') + '\n');
writeFileSync(join(SAIDA, 'relatorio.json'), JSON.stringify(relatorio, null, 1));
console.log('\n  relatório: ' + join(SAIDA, 'relatorio.md') + '\n  ' + numeroFoto + ' capturas em ' + SAIDA + '\n');
process.exit(relatorio.dias.some((d) => d.erroFatal) ? 1 : 0);
