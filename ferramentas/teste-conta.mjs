// Criar conta, entrar, sair e redefinir a senha de ponta a ponta, no Chrome emulando um
// Android (toque, 360x800 e 412x915) e um iPhone, do zero, sem sessão: cada campo e cada erro
// do cadastro (vazio, data, 12 anos, e-mail ruim e repetido, @ ruim e repetido, senha curta,
// consentimento), com o teclado aberto (a mensagem tem de aparecer perto do campo), os dois
// caminhos ("Sim" vai para a trilha, "Estou conhecendo" para o Conhecer Jesus) até o fim do
// primeiro dia (tutorial de instalar e convite de notificações), recarregar no meio, trocar de
// caminho, sair e entrar de novo, senha errada; e a senha esquecida pelo e-mail (um servidor
// SMTP falso recebe a mensagem e o teste segue o link), com pré-visualizador abrindo o link
// antes da pessoa, @ com ponto, link usado duas vezes e link vencido.
// Uso: CHROME=<chrome> node ferramentas/teste-conta.mjs
//      FOTOS=<pasta> grava uma captura por passo (ex.: FOTOS=design/conta-android)
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:tls';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { portaLivre } from './navegador.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { abrir, dormir } = await import(pathToFileURL(join(AQUI, 'design', 'ferramentas', 'analise', 'cdp.mjs')).href);
// SO=iphone,senha roda só esses blocos (ja-conheco, nao-conheco, iphone, senha, vencido).
const SO = process.env.SO ? process.env.SO.split(',') : null;
const roda = (b) => !SO || SO.includes(b);
const FOTOS = process.env.FOTOS ? resolve(process.env.FOTOS) : '';

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// ---------- servidor de e-mail falso (SMTP com TLS direto, como o de verdade na porta 465) ----------
// O certificado sai do openssl na hora; sem openssl, a parte do e-mail é pulada (avisa).
const pasta = mkdtempSync(join(tmpdir(), 'cc-conta-'));
const cartas = [];
let smtp = null;
let certificado = '';
try {
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(pasta, 'smtp.key'), '-out', join(pasta, 'smtp.crt'),
    '-days', '2', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' });
  certificado = join(pasta, 'smtp.crt');
  smtp = createServer({ key: readFileSync(join(pasta, 'smtp.key')), cert: readFileSync(certificado) }, (s) => {
    let dados = false; let texto = ''; let buffer = ''; let auth = 0;
    s.write('220 falso\r\n');
    s.on('data', (pedaco) => {
      buffer += pedaco.toString('utf8');
      if (dados) {
        const fim = buffer.indexOf('\r\n.\r\n');
        if (fim < 0) return;
        texto = buffer.slice(0, fim); buffer = buffer.slice(fim + 5); dados = false;
        cartas.push(texto);
        s.write('250 ok\r\n');
      }
      let i;
      while (!dados && (i = buffer.indexOf('\r\n')) >= 0) {
        const linha = buffer.slice(0, i); buffer = buffer.slice(i + 2);
        if (/^EHLO/i.test(linha)) s.write('250 ok\r\n');
        else if (/^AUTH LOGIN/i.test(linha)) { auth = 1; s.write('334 VXNlcm5hbWU6\r\n'); }
        else if (auth === 1) { auth = 2; s.write('334 UGFzc3dvcmQ6\r\n'); }
        else if (auth === 2) { auth = 3; s.write('235 ok\r\n'); }
        else if (/^MAIL|^RCPT/i.test(linha)) s.write('250 ok\r\n');
        else if (/^DATA/i.test(linha)) { s.write('354 manda\r\n'); dados = true; }
        else if (/^QUIT/i.test(linha)) s.end('221 tchau\r\n');
        else s.write('500 ?\r\n');
      }
    });
    s.on('error', () => {});
  });
  await new Promise((r) => smtp.listen(0, '127.0.0.1', r));
} catch {
  console.log('  (sem openssl: a parte do e-mail fica de fora; o link sai pelo painel do dono)');
}
// Lê o link de uma carta: o corpo vem em base64, depois da linha em branco.
const linkDaCarta = (carta) => {
  const corpo = Buffer.from(carta.split('\r\n\r\n').slice(1).join('').replace(/\s/g, ''), 'base64').toString('utf8');
  return (corpo.match(/https?:\/\/\S+redefinir=\S+/) || [''])[0];
};

// ---------- servidor do app ----------
async function subir(extra = {}) {
  const porta = await portaLivre();
  const base = 'http://127.0.0.1:' + porta + '/';
  const proc = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(porta)], {
    env: { ...process.env, CAMINHO_ESTADO: join(mkdtempSync(join(pasta, 'estado-')), 'estado.json'), CAMINHO_TESTE: '1',
      CAMINHO_ADMIN: 'dono', CAMINHO_ENDERECO: base.replace(/\/$/, ''), CAMINHO_SMTP_HOST: '', ...extra },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base + 'api/existe-conta')).ok) break; } catch { /* subindo */ } await dormir(150); }
  const api = (rota, corpo, cookie) => fetch(base + rota, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', origin: base.replace(/\/$/, ''), ...(cookie ? { cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  // O dono e uma conta antiga, para "e-mail repetido" e "@ repetido".
  const r = await api('api/criar-conta', { nome: 'Dono', nascimento: '1990-01-01', email: 'dono@exemplo.com', usuario: 'dono', senha: 'senha-do-dono-1', consentimento: true });
  const dono = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map((l) => l.split(';')[0]).find((l) => l.startsWith('cc_sessao='));
  return { base, proc, api, dono };
}

const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
};

// Um celular: o Chrome com o userAgent, a tela e o toque; um perfil só do começo ao fim, como
// o aparelho da pessoa (service worker, localStorage e cookies sobrevivem a recarregar).
// O Chrome sem interface manda o beforeinstallprompt até com o userAgent do iPhone, coisa que o
// Safari nunca faz: no iPhone, um ouvinte de captura o engole antes do app.
const SEM_AVISO_DE_INSTALAR = "addEventListener('beforeinstallprompt', (e) => e.stopImmediatePropagation(), true);";
async function celular({ base, ua, largura, altura, cenario }) {
  const c = await abrir({ base, largura, altura, silenciar: false, escala: 2, pre: /iPhone/.test(ua) ? SEM_AVISO_DE_INSTALAR : '' });
  const excecoes = [];
  c.ouvir('Runtime.exceptionThrown', (p) => excecoes.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
  await c.cmd('Emulation.setUserAgentOverride', { userAgent: ua });
  await c.cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const tela = (alt) => c.cmd('Emulation.setDeviceMetricsOverride', { width: largura, height: alt, deviceScaleFactor: 2, mobile: true });
  let n = 0;
  const foto = async (nome) => {
    if (!FOTOS) return;
    await dormir(700); // a folha termina de subir e a tela de trocar
    const r = await c.cmd('Page.captureScreenshot', { format: 'jpeg', quality: 78 });
    const dir = join(FOTOS, cenario);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, String(++n).padStart(2, '0') + '-' + nome + '.jpg'), Buffer.from(r.data, 'base64'));
  };
  const ate = async (expr, ms = 12000) => { for (let t = 0; t < ms; t += 150) { const v = await c.av(expr); if (v && !v.erro) return true; await dormir(150); } return false; };
  // Toque de verdade (touchStart/touchEnd) no centro do elemento, depois de trazê-lo à tela.
  const tocar = async (sel) => {
    const p = await c.av(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((x) => x.offsetParent || x.getClientRects().length).pop(); if (!e) return null;
      e.scrollIntoView({ block: 'center', behavior: 'instant' }); return 1; })()`);
    // Mede depois de rolar: numa folha com rolagem suave, o ponto medido na hora era o de antes
    // da rolagem, e o toque caía no botão de baixo.
    await dormir(200);
    const q = p && !p.erro ? await c.av(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((x) => x.offsetParent || x.getClientRects().length).pop(); if (!e) return null;
      const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`) : p;
    if (!p || p.erro || !q || q.erro) {
      const onde = await c.av('location.hash + " | cortinas " + [...document.querySelectorAll(".cortina")].map((x) => x.className + ":" + x.innerText.slice(0, 120)).join(" / ") + " | " + document.body.innerText.replace(/\\s+/g, " ").slice(0, 160)');
      ok(false, cenario + ': achar ' + sel + ' para tocar (' + JSON.stringify(onde) + ')');
      return false;
    }
    await c.cmd('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q[0], y: q[1] }] });
    await c.cmd('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await dormir(350);
    return true;
  };
  // Digitar como o teclado do celular: foca, apaga o que tinha e insere o texto.
  const digitar = async (sel, texto) => {
    await c.av(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.focus(); e.select && e.select(); })()`);
    await c.cmd('Input.insertText', { text: texto });
    await dormir(100);
  };
  const enter = async () => {
    await c.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await c.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await dormir(350);
  };
  const data = (valor) => c.av(`(() => { const e = document.getElementById('nascimento'); e.value = '${valor}'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return 1; })()`);
  const erroCadastro = () => c.av('document.getElementById("erro-cadastro").textContent');
  // A mensagem de erro e o campo marcado aparecem juntos na parte da tela que sobra acima do teclado.
  const erroAVista = () => c.av(`(() => { const p = document.getElementById('erro-cadastro').getBoundingClientRect(); const f = document.activeElement.getBoundingClientRect();
    return p.height > 0 && p.top >= 0 && p.bottom <= innerHeight && f.top >= 0 && f.bottom <= innerHeight; })()`);
  const appPronto = () => ate('!!(window.CC && document.querySelector(".aba")) && !document.querySelector("#abertura:not(.saindo)")', 20000);
  return { ...c, excecoes, tela, foto, tocar, digitar, enter, data, erroCadastro, erroAVista, appPronto, ate };
}

// O primeiro dia, do jeito de cada caminho, até a trilha (ou a lista do Conhecer Jesus).
async function primeiroDiaPlano(t) {
  await t.tocar('.cartao-salvia[data-abrir-dia]');
  ok(await t.ate('!!document.querySelector(".licao [data-trilha]")'), 'plano: o cartão de hoje abre a lição do dia 1');
  await t.foto('licao-dia-1');
  await t.av('document.querySelectorAll(".licao [data-trilha]").forEach((b) => b.click()); 1');
  await t.ate('!document.querySelector(".licao [data-concluir]").disabled');
  await t.tocar('.licao [data-concluir]');
  await t.ate('!!document.querySelector(".licao.tela-festa [data-pular]")');
  await t.foto('fim-da-licao');
  await t.tocar('.licao.tela-festa [data-pular]');
  await t.ate('!!document.querySelector(".licao.tela-resumo [data-voltar-trilha]")');
  await t.tocar('.licao.tela-resumo [data-voltar-trilha]');
}
async function primeiroDiaConhecer(t) {
  await t.tocar('.tela-conhecer-lista .cartao-destaque');
  ok(await t.ate('!!document.querySelector(".tela-conhecer [data-ler]")'), 'conhecer: "Começar" abre o dia 1 do Conhecer Jesus');
  await t.foto('conhecer-dia-1');
  await t.tocar('.tela-conhecer [data-ler]');
  ok(await t.ate('!!(CC.leitorAberto && CC.leitorAberto())'), 'conhecer: "Ler" abre o texto bíblico');
  await dormir(800);
  await t.foto('conhecer-leitura');
  await t.av('CC.fecharLeitor(); 1');
  ok(await t.ate('!!document.querySelector(".tela-conhecer [data-terminar]")'), 'conhecer: depois de ler, "Terminei o dia"');
  await t.foto('conhecer-depois-de-ler');
  await t.tocar('.tela-conhecer [data-terminar]');
  // o fim do dia mostra o resumo primeiro; o tutorial de instalar vem depois de "Até amanhã"
  ok(await t.ate('!!document.querySelector(".tela-conhecer [data-ate-amanha]")'), 'conhecer: "Terminei o dia" mostra o resumo com "Até amanhã"');
  ok(!(await t.av('!!document.querySelector(".folha-instalar")')), 'conhecer: nenhuma folha por cima do resumo do dia');
  await t.foto('conhecer-resumo');
  await t.tocar('.tela-conhecer [data-ate-amanha]');
}
// Depois do primeiro dia: o tutorial de instalar (conta nova) e depois o convite de notificações.
async function depoisDoPrimeiroDia(t, nome) {
  ok(await t.ate('!!document.querySelector(".folha-instalar")', 6000), nome + ': no fim do primeiro dia, o tutorial de instalar');
  ok(/Primeiro dia feito/.test(await t.av('document.querySelector(".folha-instalar").innerText')), nome + ': o tutorial fala do primeiro dia feito (não mais "Conta criada")');
  await t.foto('instalar-depois-do-dia-1');
  await t.tocar('.folha-instalar [data-pular]');
  const temPush = await t.av('"Notification" in window && Notification.permission === "default"');
  if (temPush) {
    ok(await t.ate('/toque na hora da leitura/.test(document.body.innerText) && !!document.querySelector(".cortina [data-nao]")', 5000), nome + ': depois de pular, o convite de notificações');
    await t.foto('convite-notificacoes');
    await t.tocar('.cortina [data-nao]');
  }
  await t.ate('!document.querySelector(".cortina")', 3000);
}
async function sairPelaConfig(t, nome) {
  // O que estiver aberto na frente (o convite de notificações de quem entra num aparelho novo) fecha com "Agora não".
  await dormir(1500);
  for (let i = 0; i < 3 && await t.av('!!document.querySelector(".cortina [data-nao]")'); i++) { await t.tocar('.cortina [data-nao]'); await dormir(400); }
  await t.av('location.hash = "#/config"; 1');
  await t.ate('!!document.querySelector("[data-sair]")');
  await t.tocar('[data-sair]');
  await t.ate('!!document.querySelector(".cortina [data-sim]")');
  await t.tocar('.cortina [data-sim]');
  ok(await t.ate('!!document.querySelector("#tela-boas:not([hidden]), #tela-entrar:not([hidden])") && !document.cookie.includes("cc_logado=1")', 12000), nome + ': "Sair desta conta" volta para a página de entrada, sem a marca de sessão');
}
async function entrar(t, nome, login, senha, { errada = '' } = {}) {
  await t.tocar('#tela-boas:not([hidden]) [data-ir="entrar"]');
  await t.ate('!document.getElementById("tela-entrar").hidden');
  if (errada) {
    await t.digitar('#login', login);
    await t.digitar('#senha-entrar', errada);
    await t.tocar('#botao-entrar');
    ok(await t.ate('document.getElementById("erro-entrar").textContent === "Usuário ou senha não conferem."', 5000), nome + ': senha errada diz "Usuário ou senha não conferem." e não entra');
    await t.foto('senha-errada');
  }
  await t.digitar('#login', login);
  await t.digitar('#senha-entrar', senha);
  await t.tocar('#botao-entrar');
  ok(await t.appPronto(), nome + ': com a senha certa, entra no app');
  await dormir(1200);
}

try {
  const S = await subir(smtp ? { CAMINHO_SMTP_HOST: '127.0.0.1', CAMINHO_SMTP_PORTA: String(smtp.address().port),
    CAMINHO_SMTP_USUARIO: 'robo@exemplo.com', CAMINHO_SMTP_SENHA: 'x', NODE_EXTRA_CA_CERTS: certificado } : {});

  // ================= Android 360x800, "Sim" (já conheço Jesus): cada erro do cadastro =================
  if (roda('ja-conheco')) {
  console.log('\n  Android 360x800: criar conta com "Sim" (já conheço Jesus)\n');
  {
    const nome = 'ja-conheco';
    const t = await celular({ base: S.base, ua: UA.android, largura: 360, altura: 800, cenario: 'ja-conheco' });
    try {
      await t.cmd('Page.navigate', { url: S.base });
      ok(await t.ate('!document.getElementById("tela-boas").hidden'), nome + ': sem sessão, "/" mostra a página de entrada');
      await dormir(1500);
      await t.foto('pagina-de-entrada');
      const campos = await t.av(`[...document.querySelectorAll('#form-cadastro input')].map((i) => [i.id, i.type, i.getAttribute('autocomplete'), parseFloat(getComputedStyle(i).fontSize)])`);
      ok(campos.every(([, , , fonte]) => fonte >= 16), nome + ': todo campo tem letra de 16px ou mais (o Chrome/Safari não dá zoom ao focar)');
      const tipo = Object.fromEntries(campos.map(([id, tipo, auto]) => [id, tipo + '/' + auto]));
      ok(tipo.nome === 'text/given-name' && tipo.nascimento === 'date/bday' && tipo.email === 'email/email' && tipo.usuario === 'text/username' && tipo['senha-nova'] === 'password/new-password',
        nome + ': tipos e autocomplete certos (nome, data, e-mail, @, senha nova)');
      await t.tocar('#botao-comecar');
      ok(await t.ate('document.getElementById("passo-rotulo").textContent === "Passo 1 de 3" && document.activeElement.id === "nome"'), nome + ': "Começar agora" abre o passo 1 com o cursor no nome');
      await t.foto('passo-1');

      // Com o teclado aberto (a tela encolhe 330px), o Enter do teclado tenta seguir.
      await t.tela(470);
      await t.enter();
      ok(await t.erroCadastro() === 'Diga como quer que a gente te chame.' && await t.av('document.getElementById("nome").getAttribute("aria-invalid") === "true"'),
        nome + ': nome vazio: "Diga como quer que a gente te chame." e o campo marcado');
      ok(await t.erroAVista(), nome + ': com o teclado aberto, a mensagem aparece logo abaixo do campo, à vista');
      await t.foto('erro-nome-vazio-com-teclado');
      await t.digitar('#nome', 'Pedro');
      ok(await t.av('!document.getElementById("nome").hasAttribute("aria-invalid") && document.getElementById("erro-cadastro").textContent === ""'), nome + ': ao digitar, o campo deixa de estar marcado');
      await t.tela(800);
      await t.tocar('#botao-cadastro');
      ok(await t.erroCadastro() === 'Confira a data de nascimento.', nome + ': sem data: "Confira a data de nascimento."');
      await t.foto('erro-data-vazia');
      await t.data('2020-03-03');
      await t.tocar('#botao-cadastro');
      ok(await t.erroCadastro() === 'O Geração Eleita é para quem tem 12 anos ou mais.', nome + ': menos de 12 anos: recusado com a regra dita');
      await t.foto('erro-menor-de-12');
      await t.data('2001-07-15');
      ok(await t.av('document.querySelector(\'[data-caminho="plano"]\').getAttribute("aria-pressed") === "true"'), nome + ': "Sim" já vem escolhido');
      await t.tocar('#botao-cadastro');
      ok(await t.ate('document.getElementById("passo-rotulo").textContent === "Passo 2 de 3" && document.activeElement.id === "email"'), nome + ': passo 2, cursor no e-mail');
      await t.foto('passo-2');
      await t.tela(470);
      await t.digitar('#email', 'pedro@');
      await t.enter();
      ok(await t.erroCadastro() === 'Esse e-mail não parece certo.' && await t.erroAVista(), nome + ': e-mail ruim: "Esse e-mail não parece certo.", à vista com o teclado');
      await t.foto('erro-email-invalido-com-teclado');
      await t.tela(800);
      await t.digitar('#email', 'dono@exemplo.com');
      await t.tocar('#botao-cadastro');
      ok(await t.ate('document.getElementById("passo-rotulo").textContent === "Passo 3 de 3"'), nome + ': passo 3');
      await t.foto('passo-3');
      await t.tocar('#botao-cadastro');
      ok(/^O @ aceita/.test(await t.erroCadastro()), nome + ': @ vazio: a regra do @');
      await t.digitar('#usuario', 'Pedro Silva');
      await t.tocar('#botao-cadastro');
      ok(/^O @ aceita/.test(await t.erroCadastro()) && await t.av('document.getElementById("usuario").getAttribute("aria-invalid") === "true"'), nome + ': @ com espaço: a regra do @ e o campo marcado');
      await t.foto('erro-usuario-invalido');
      await t.digitar('#usuario', 'pedro.silva');
      await t.digitar('#senha-nova', '1234');
      await t.tocar('#botao-cadastro');
      ok(await t.erroCadastro() === 'A senha precisa de 8 caracteres ou mais.', nome + ': senha curta: "A senha precisa de 8 caracteres ou mais."');
      await t.foto('erro-senha-curta');
      await t.digitar('#senha-nova', 'leitura-diaria-7');
      await t.tocar('#botao-cadastro');
      ok(/^Marque que concorda/.test(await t.erroCadastro()), nome + ': sem o consentimento, não cria a conta');
      await t.foto('erro-sem-consentimento');
      await t.tocar('#consentimento-cadastro');
      ok(await t.av('document.getElementById("erro-cadastro").textContent === ""'), nome + ': marcar o consentimento tira o aviso');
      await t.tocar('#botao-cadastro');
      ok(await t.ate('document.getElementById("passo-rotulo").textContent === "Passo 2 de 3" && document.getElementById("erro-cadastro").textContent === "Este e-mail já tem conta."'),
        nome + ': e-mail repetido: volta ao passo 2 com "Este e-mail já tem conta."');
      await t.foto('erro-email-repetido');
      await t.digitar('#email', 'pedro@exemplo.com');
      await t.tocar('#botao-cadastro');
      ok(await t.av('document.getElementById("usuario").value === "pedro.silva" && document.getElementById("consentimento-cadastro").checked'), nome + ': o passo 3 guardou o @ e o consentimento');
      await t.digitar('#usuario', 'dono');
      await t.tocar('#botao-cadastro');
      ok(await t.ate('document.getElementById("erro-cadastro").textContent === "Esse @ já existe." && document.getElementById("usuario").getAttribute("aria-invalid") === "true"'),
        nome + ': @ repetido: "Esse @ já existe." no campo do @');
      await t.foto('erro-usuario-repetido');
      await t.digitar('#usuario', 'pedro.silva');
      await t.tocar('#botao-cadastro');
      ok(await t.appPronto(), nome + ': "Criar minha conta" entra no app');
      await dormir(1500);
      const primeira = await t.av(`({ trilha: !!document.querySelector('.cartao-salvia[data-abrir-dia]'), conhecer: !!document.querySelector('.tela-conhecer-lista'),
        folhas: document.querySelectorAll('.cortina').length, y: CC.rolagemY(), hoje: (document.querySelector('.no.atual') || {}).getBoundingClientRect ? Math.round(document.querySelector('.no.atual').getBoundingClientRect().bottom) : -1 })`);
      ok(primeira.trilha && !primeira.conhecer && primeira.folhas === 0, nome + ': primeira tela: a trilha do plano, sem nada do Conhecer Jesus e sem folha na frente');
      ok(primeira.y === 0 && primeira.hoje > 0 && primeira.hoje < 800 - 108, nome + ': abre no alto, com a saudação, e o dia 1 à vista acima da barra (antes rolava e cortava os cartões)');
      await t.foto('primeira-tela');
      await t.cmd('Page.reload');
      ok(await t.appPronto() && await t.ate('!!document.querySelector(".cartao-salvia[data-abrir-dia]")'), nome + ': recarregar mantém a conta e a trilha');
      await dormir(800);
      await primeiroDiaPlano(t);
      await depoisDoPrimeiroDia(t, nome);
      await t.av('location.hash = "#/config"; 1');
      ok(await t.ate('/Plano da Bíblia em um ano/.test((document.querySelector("[data-caminho]") || {}).textContent || "")'), nome + ': Configurações › Seu caminho: Plano da Bíblia em um ano');
      await t.foto('config-caminho');
      await sairPelaConfig(t, nome);
      await t.foto('saiu');
      await entrar(t, nome, 'pedro.silva', 'leitura-diaria-7', { errada: 'leitura-diaria-8' });
      ok(await t.ate('!!document.querySelector(".cartao-salvia[data-abrir-dia]") && !document.querySelector(".tela-conhecer-lista")'), nome + ': entrou de novo na trilha do plano');
      await t.foto('entrou-de-novo');
    } finally {
      ok(t.excecoes.length === 0, nome + ': nenhuma exceção' + (t.excecoes[0] ? ': ' + t.excecoes[0] : ''));
      await t.fechar();
    }
  }
  }

  // ================= Android 412x915, "Estou conhecendo": o caminho Conhecer Jesus =================
  if (roda('nao-conheco')) {
  console.log('\n  Android 412x915: criar conta com "Estou conhecendo"\n');
  {
    const nome = 'nao-conheco';
    const t = await celular({ base: S.base, ua: UA.android, largura: 412, altura: 915, cenario: 'nao-conheco' });
    try {
      await t.cmd('Page.navigate', { url: S.base });
      await t.ate('!document.getElementById("tela-boas").hidden');
      await t.tocar('#botao-comecar');
      await t.digitar('#nome', 'Joana');
      await t.data('2003-02-20');
      await t.tocar('[data-caminho="conhecer"]');
      ok(await t.av('document.querySelector(\'[data-caminho="conhecer"]\').getAttribute("aria-pressed") === "true" && document.querySelector(\'[data-caminho="plano"]\').getAttribute("aria-pressed") === "false"'),
        nome + ': "Estou conhecendo" fica escolhido');
      await t.foto('passo-1-estou-conhecendo');
      await t.tocar('#botao-cadastro');
      await t.digitar('#email', 'joana@exemplo.com');
      // Recarregar no meio do cadastro: a página volta ao começo, inteira, sem erro.
      await t.cmd('Page.reload');
      ok(await t.ate('!document.getElementById("tela-boas").hidden'), nome + ': recarregar no meio do cadastro volta à página de entrada, sem quebrar');
      await t.foto('recarregou-no-meio');
      await t.tocar('#botao-comecar');
      await t.digitar('#nome', 'Joana');
      await t.data('2003-02-20');
      await t.tocar('[data-caminho="conhecer"]');
      await t.tocar('#botao-cadastro');
      await t.digitar('#email', 'joana@exemplo.com');
      await t.tocar('#botao-cadastro');
      await t.digitar('#usuario', 'joana');
      await t.digitar('#senha-nova', 'conhecendo-123');
      await t.tocar('#consentimento-cadastro');
      await t.foto('passo-3-pronto');
      await t.tocar('#botao-cadastro');
      ok(await t.appPronto(), nome + ': conta criada, entra no app');
      await dormir(1500);
      const primeira = await t.av(`({ conhecer: !!document.querySelector('.tela-conhecer-lista'), trilha: !!document.querySelector('.cartao-salvia[data-abrir-dia]'),
        passos: /Primeiros passos/.test(document.getElementById('conteudo').innerText), folhas: document.querySelectorAll('.cortina').length, caminho: CC.quem.caminho })`);
      ok(primeira.conhecer && !primeira.trilha && !primeira.passos && primeira.folhas === 0 && primeira.caminho === 'conhecer',
        nome + ': primeira tela: Conhecer Jesus (os 14 dias), sem a trilha do plano nem os Primeiros passos');
      await t.foto('primeira-tela');
      await t.cmd('Page.reload');
      ok(await t.appPronto() && await t.ate('!!document.querySelector(".tela-conhecer-lista")'), nome + ': recarregar mantém o Conhecer Jesus');
      await dormir(800);
      await primeiroDiaConhecer(t);
      await depoisDoPrimeiroDia(t, nome);
      await t.av('location.hash = "#/"; 1');
      ok(await t.ate('/1 de 14/.test(document.body.innerText) && !!document.querySelector(".tela-conhecer-lista")'), nome + ': a lista mostra 1 de 14 feito');
      await t.foto('lista-depois-do-dia-1');
      // Trocar de caminho (a pessoa escolheu errado): Configurações › Seu caminho.
      await t.av('location.hash = "#/config"; 1');
      ok(await t.ate('/Conhecer Jesus/.test((document.querySelector("[data-caminho]") || {}).textContent || "")'), nome + ': Configurações › Seu caminho: Conhecer Jesus');
      await t.tocar('[data-caminho]');
      await t.ate('!!document.querySelector(\'.cortina [data-caminho-opcao="plano"]\')');
      await t.foto('trocar-caminho');
      await t.tocar('.cortina [data-caminho-opcao="plano"]');
      await t.av('location.hash = "#/"; 1');
      ok(await t.ate('!!document.querySelector(".cartao-salvia[data-abrir-dia]") && !document.querySelector(".tela-conhecer-lista")'), nome + ': trocou para o plano: a trilha aparece e o Conhecer Jesus sai');
      await t.foto('trocou-para-o-plano');
      await t.av('location.hash = "#/config"; 1');
      await t.ate('!!document.querySelector("[data-caminho]")');
      await t.tocar('[data-caminho]');
      await t.ate('!!document.querySelector(\'.cortina [data-caminho-opcao="conhecer"]\')');
      await t.tocar('.cortina [data-caminho-opcao="conhecer"]');
      await t.av('location.hash = "#/"; 1');
      ok(await t.ate('!!document.querySelector(".tela-conhecer-lista") && /1 de 14/.test(document.body.innerText)'), nome + ': voltou ao Conhecer Jesus, com o dia 1 ainda feito');
      await sairPelaConfig(t, nome);
      await entrar(t, nome, 'joana@exemplo.com', 'conhecendo-123', { errada: 'conhecendo-124' });
      ok(await t.ate('!!document.querySelector(".tela-conhecer-lista") && !document.querySelector(".cartao-salvia[data-abrir-dia]")'), nome + ': entrou de novo (pelo e-mail) no Conhecer Jesus');
      await t.foto('entrou-de-novo');
    } finally {
      ok(t.excecoes.length === 0, nome + ': nenhuma exceção' + (t.excecoes[0] ? ': ' + t.excecoes[0] : ''));
      await t.fechar();
    }
  }
  }

  // ================= iPhone 390x844: criar, sair, entrar =================
  if (roda('iphone')) {
  console.log('\n  iPhone 390x844\n');
  {
    const nome = 'iphone';
    const t = await celular({ base: S.base, ua: UA.iphone, largura: 390, altura: 844, cenario: 'iphone' });
    try {
      await t.cmd('Page.navigate', { url: S.base });
      await t.ate('!document.getElementById("tela-boas").hidden');
      await t.tocar('#botao-comecar');
      await t.tocar('#botao-cadastro');
      ok(await t.erroCadastro() === 'Diga como quer que a gente te chame.', nome + ': campo vazio avisa');
      await t.digitar('#nome', 'Rute');
      await t.data('1999-11-30');
      await t.tocar('#botao-cadastro');
      await t.digitar('#email', 'rute@exemplo.com');
      await t.tocar('#botao-cadastro');
      await t.digitar('#usuario', 'rute');
      await t.digitar('#senha-nova', 'rute-le-a-biblia');
      await t.tocar('#consentimento-cadastro');
      await t.tocar('#botao-cadastro');
      ok(await t.appPronto() && await t.ate('!!document.querySelector(".cartao-salvia[data-abrir-dia]")'), nome + ': conta criada, a trilha do plano');
      await dormir(1200);
      await t.foto('primeira-tela');
      await primeiroDiaPlano(t);
      ok(await t.ate('!!document.querySelector(".folha-instalar")', 6000) && /Compartilhar/.test(await t.av('document.querySelector(".folha-instalar").innerText')),
        nome + ': no fim do primeiro dia, o tutorial com os passos do iPhone (Compartilhar)');
      await t.foto('instalar-iphone');
      await t.tocar('.folha-instalar [data-pular]');
      await t.ate('!document.querySelector(".folha-instalar")');
      await sairPelaConfig(t, nome);
      await entrar(t, nome, 'rute', 'rute-le-a-biblia', { errada: 'rute-nao-le' });
      await t.foto('entrou-de-novo');
    } finally {
      ok(t.excecoes.length === 0, nome + ': nenhuma exceção' + (t.excecoes[0] ? ': ' + t.excecoes[0] : ''));
      await t.fechar();
    }
  }
  }

  // ================= Senha esquecida, pelo e-mail =================
  if (roda('senha')) {
  console.log('\n  Redefinir a senha\n');
  {
    const nome = 'senha';
    const t = await celular({ base: S.base, ua: UA.android, largura: 360, altura: 800, cenario: 'redefinir-senha' });
    try {
      await t.cmd('Page.navigate', { url: S.base });
      await t.ate('!document.getElementById("tela-boas").hidden');
      await t.tocar('#tela-boas:not([hidden]) [data-ir="entrar"]');
      await t.tocar('#tela-entrar [data-ir="esqueci"]');
      await t.tocar('#botao-esqueci');
      ok(await t.av('document.getElementById("erro-esqueci").textContent') === 'Diga o seu @usuário ou e-mail.', nome + ': pedir sem dizer a conta avisa');
      await t.digitar('#login-esqueci', 'pedro.silva');
      await t.tocar('#botao-esqueci');
      ok(await t.ate('!document.getElementById("pronto-esqueci").hidden'), nome + ': o pedido responde na tela');
      const disse = await t.av('document.getElementById("pronto-esqueci").textContent');
      await t.foto('pedido-feito');
      let link = '';
      if (smtp) {
        ok(/link chega em alguns minutos/.test(disse), nome + ': com e-mail ligado, diz que o link chega por e-mail');
        for (let i = 0; i < 40 && !cartas.length; i++) await dormir(150);
        ok(cartas.length === 1, nome + ': o servidor mandou o e-mail (SMTP)');
        link = cartas.length ? linkDaCarta(cartas[0]) : '';
      } else {
        const r = await S.api('api/painel/link', { usuario: 'pedro.silva' }, S.dono);
        link = (await r.json()).link || '';
      }
      ok(link.startsWith(S.base + 'entrar.html?redefinir=pedro%2Esilva.'), nome + ': o link aponta para este endereço, com o @ de ponto escapado (' + link.slice(0, 70) + '...)');
      // O pré-visualizador (WhatsApp, Gmail, antivírus) abre o link antes da pessoa.
      const previa = await fetch(link, { headers: { 'user-agent': 'WhatsApp/2.24 A' } });
      ok(previa.ok, nome + ': o pré-visualizador abre o link (GET) antes da pessoa');
      const token = new URL(link).searchParams.get('redefinir');
      ok((await (await S.api('api/redefinir-senha?token=' + encodeURIComponent(token))).json()).usuario === 'pedro.silva', nome + ': conferir o link (GET) não o gasta');
      // A pessoa abre o link no celular, num navegador sem sessão.
      await t.cmd('Page.navigate', { url: link });
      ok(await t.ate('!document.getElementById("tela-redefinir").hidden && /@pedro\\.silva/.test(document.getElementById("conta-redefinir").textContent)'),
        nome + ': o link abre "Crie uma senha nova" para a conta @pedro.silva (antes: "venceu ou já foi usado" para todo @ com ponto)');
      await t.foto('link-aberto');
      await t.digitar('#senha-redefinir', 'curta');
      await t.tocar('#botao-redefinir');
      ok(await t.av('document.getElementById("erro-redefinir").textContent') === 'A senha precisa de 8 caracteres ou mais.', nome + ': senha nova curta é recusada');
      await t.foto('erro-senha-nova-curta');
      await t.digitar('#senha-redefinir', 'senha-nova-do-pedro');
      await t.tocar('#botao-redefinir');
      ok(await t.appPronto(), nome + ': "Salvar e entrar" troca a senha e entra no app');
      await dormir(1000);
      await t.foto('entrou-com-a-senha-nova');
      ok((await S.api('api/entrar', { login: 'pedro.silva', senha: 'leitura-diaria-7' })).status === 401, nome + ': a senha antiga não entra mais');
      ok((await S.api('api/entrar', { login: 'pedro@exemplo.com', senha: 'senha-nova-do-pedro' })).status === 200, nome + ': a senha nova entra');
      // O mesmo link de novo: já usado.
      await sairPelaConfig(t, nome);
      await t.cmd('Page.navigate', { url: link });
      ok(await t.ate('!document.getElementById("link-ruim").hidden && /não vale mais/.test(document.getElementById("link-ruim").textContent)'), nome + ': o mesmo link de novo: "esse link não vale mais", já ao abrir');
      ok(await t.av('document.getElementById("botao-redefinir").hidden && !document.getElementById("outro-link").hidden && document.getElementById("outro-link").classList.contains("botao")'),
        nome + ': sem campo de senha, e o botão principal é "Pedir outro link"');
      ok(await t.av('document.querySelector("#tela-redefinir h1").textContent') === 'Este link não serve mais', nome + ': o título deixa de prometer "Crie uma senha nova"');
      await t.foto('link-ja-usado');
      await t.tocar('#outro-link');
      ok(await t.ate('!document.getElementById("tela-esqueci").hidden'), nome + ': "Pedir outro link" leva ao pedido');
      // Link adulterado (copiado pela metade).
      await t.cmd('Page.navigate', { url: link.slice(0, -6) });
      ok(await t.ate('!document.getElementById("link-ruim").hidden'), nome + ': link cortado também avisa logo ao abrir');
    } finally {
      ok(t.excecoes.length === 0, nome + ': nenhuma exceção' + (t.excecoes[0] ? ': ' + t.excecoes[0] : ''));
      await t.fechar();
    }
  }
  }
  try { S.proc.kill(); } catch { /* ok */ }

  // ================= Link vencido de verdade (validade curta só no teste) e sem e-mail =================
  if (roda('vencido')) {
    const nome = 'link vencido';
    const V = await subir({ CAMINHO_VALIDADE_LINK_SENHA: '1500' });
    const t = await celular({ base: V.base, ua: UA.android, largura: 360, altura: 800, cenario: 'redefinir-senha-vencido' });
    try {
      await V.api('api/criar-conta', { nome: 'Lia', nascimento: '2000-01-01', email: 'lia@exemplo.com', usuario: 'lia', senha: 'senha-da-lia-1', consentimento: true });
      const pedido = await (await V.api('api/esqueci-senha', { login: 'lia' })).json();
      ok(pedido.porEmail === false, nome + ': sem e-mail configurado, o pedido vai para o painel do dono');
      const { link } = await (await V.api('api/painel/link', { usuario: 'lia' }, V.dono)).json();
      await dormir(2000);
      await t.cmd('Page.navigate', { url: link });
      ok(await t.ate('!document.getElementById("link-ruim").hidden && /venceu/.test(document.getElementById("link-ruim").textContent) && /1 hora/.test(document.getElementById("link-ruim").textContent)'),
        nome + ': passou da validade: "esse link venceu: ele vale por 1 hora. Peça outro", já ao abrir');
      await t.foto('link-vencido');
      ok((await V.api('api/redefinir-senha', { token: new URL(link).searchParams.get('redefinir'), senha: 'outra-senha-boa' })).status === 410, nome + ': e o servidor recusa trocar com ele');
      await t.cmd('Page.navigate', { url: V.base + 'entrar.html' });
      await t.ate('!document.getElementById("tela-boas").hidden');
      await t.tocar('#tela-boas:not([hidden]) [data-ir="entrar"]');
      await t.tocar('#tela-entrar [data-ir="esqueci"]');
      await t.digitar('#login-esqueci', 'lia@exemplo.com');
      await t.tocar('#botao-esqueci');
      ok(await t.ate('/Pedido anotado/.test(document.getElementById("pronto-esqueci").textContent)'), nome + ': sem e-mail, a tela diz que quem cuida do app manda o link');
      await t.foto('pedido-sem-email');
    } finally {
      ok(t.excecoes.length === 0, nome + ': nenhuma exceção' + (t.excecoes[0] ? ': ' + t.excecoes[0] : ''));
      await t.fechar();
      try { V.proc.kill(); } catch { /* ok */ }
    }
  }
} finally {
  try { if (smtp) smtp.close(); } catch { /* ok */ }
  await dormir(300);
  try { rmSync(pasta, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  criar conta, entrar e redefinir a senha funcionam\n');
process.exit(falhas ? 1 : 0);
