// Servidor: serve dist/, guarda o progresso de cada conta em dados/ e cuida de
// amizades, convites, toques e denúncias.
// Uso: node servidor.mjs [porta]
import { createServer } from 'node:http';
import { readFile, writeFile, rename, stat, mkdir, readdir, unlink } from 'node:fs/promises';
import { readFileSync, readdirSync, existsSync, writeFileSync, unlinkSync, statfsSync } from 'node:fs';
import { join, dirname, extname, normalize, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { createHmac, createHash, randomBytes } from 'node:crypto';
import { createContext, runInContext } from 'node:vm';
import {
  Contas, arquivoDoEstado, seloDaConta, limparNome, iguais, hojeNoFuso, fusoValido, somaDias,
  datasFeitas, diasDeProposito, resumoDeAmigo, MOTIVOS_DENUNCIA, podeConduzir,
} from './contas.mjs';
import { Novidades, MARCOS_PROPOSITO, DE_DUPLA, DE_GRUPO } from './novidades.mjs';
import { NIVEIS_SEMEADOR, trilhaDoSemeador } from './semeador.mjs';
import { TIPOS as TIPOS_DE_PROPOSITO, LIMITE_GRUPO, LIMITE_CELULA, quemPrecisaDeAtencao, limiteDo, datasDoTipo, diasJuntos, extraNoDia, pontosDoDia, sequenciaDoGrupo } from './propositos.mjs';
import { diasLidosNaSemana, resumoParaDiscipulador } from './discipulado.mjs';
import { MOTIVOS_DENUNCIA_PEDIDO, MOTIVO_PERIGO, pedidoVisivelPara, gestosParaAutor, jaOrouHoje, jaAjudou, membroDeVerdade } from './cuidado.mjs';
import { DESAFIOS_GRUPO, TIPOS_GRUPO, progressoNoGrupo, diaDoGrupo, fimDoDesafio, desafioVisivel } from './desafios-grupo.mjs';
import {
  abrirBanco, arquivoDoBanco, lerMeta, gravarMeta, transacao, lerEstadoDoBanco, gravarEstadoNoBanco,
  backupDoDia, fazerBackup, apagarPessoaDosBackups, guardarLegado, cifrarBackupsAbertos,
} from './db.mjs';
import {
  Notificacoes, chavesDoServidor, inscricaoValida, enviarPush, decidir, montarMensagem, primeiroNome, emSilencio,
  MAX_TOQUES_RECEBIDOS_DIA,
} from './notificacoes.mjs';
import { montarPainel } from './painel.mjs';
import { configDoEmail, enviarEmail } from './email.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, 'dist');
const PORTA = Number(process.argv[2]) || 8080;
// CAMINHO_ESTADO permite testar sem encostar no progresso real de ninguém.
const ESTADO = process.env.CAMINHO_ESTADO || join(AQUI, 'dados', 'estado.json');
// A pasta de dados: o banco (caminho.db), os backups e as chaves moram aqui.
const PASTA_DADOS = dirname(ESTADO);
// Só as ferramentas de teste sobem o servidor aberto, sem conta nenhuma.
const ABERTO_PARA_TESTE = process.env.CAMINHO_ABERTO === '1';

// A chave do progresso de cada conta na tabela estados: o @ dela. O servidor aberto das
// ferramentas de teste, sem conta, usa "caminho".
const arquivoDe = (usuario) => limparNome(usuario) || 'caminho';
// O progresso (com a foto) pode passar de 1 MB; nenhum outro pedido chega perto de 64 KB.
const LIMITE_ESTADO = 4 * 1024 * 1024;
const LIMITE = 64 * 1024;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

// ---------- as regras do aplicativo, as mesmas do navegador ----------
// A fusão entre aparelhos e a conta da ofensiva com escudos moram em 02-estado.js.
// O servidor carrega o mesmo arquivo, para os dois lados nunca discordarem.
// O plano do conteúdo: os propósitos de livro precisam saber por onde cada dia passa.
let PLANO_DO_CONTEUDO = [];
function carregarRegras() {
  const D = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'conteudo.json'), 'utf8'));
  PLANO_DO_CONTEUDO = D.plano;
  const contexto = createContext({
    window: { DADOS: D }, console, Date, Math, JSON, Object, Set, Map, Number, String, Array, Boolean, Intl,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    document: { documentElement: { dataset: {} }, querySelector: () => null },
    fetch: () => Promise.reject(new Error('sem rede no servidor')),
    setTimeout, clearTimeout, location: { protocol: 'file:' }, navigator: {}, addEventListener: () => {},
  });
  for (const f of ['01-nucleo.js', '02-estado.js', '02b-jogo.js']) {
    runInContext(readFileSync(join(AQUI, 'src', 'app', f), 'utf8'), contexto, { filename: f });
  }
  return contexto.window.CC;
}
const REGRAS = carregarRegras();
const TODOS_LIVROS = [...new Set(PLANO_DO_CONTEUDO.flatMap((d) => d.livros))];

// ---------- cabeçalhos de segurança ----------
// O app é uma página só, com os scripts dentro do HTML. A CSP libera exatamente esses
// scripts (pelo hash de cada um, calculado aqui a partir do dist/) e nada de fora: um texto
// malicioso que escapasse para a tela não roda, e nada sai do app para outro endereço.
function hashesDosScripts() {
  const hashes = new Set();
  for (const pagina of ['index.html', 'entrar.html', 'privacidade.html', 'termos.html']) {
    let html = '';
    try { html = readFileSync(join(RAIZ, pagina), 'utf8'); } catch { continue; }
    for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      // O navegador troca \r\n por \n antes de calcular o hash (o HTML chega assim do Windows).
      if (m[1].trim()) hashes.add("'sha256-" + createHash('sha256').update(m[1].replace(/\r\n?/g, '\n'), 'utf8').digest('base64') + "'");
    }
  }
  return [...hashes].join(' ');
}
// As fontes que o build tira do index.html (fonte-<nome>.<resumo>.woff2): públicas, porque
// a tela de entrada também as usa.
const FONTE_COM_RESUMO = /^\/fonte-[a-z-]+\.[0-9a-f]{10}\.woff2$/;
const CSP = [
  "default-src 'self'",
  "script-src 'self' " + hashesDosScripts(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

function protecoes(req, res) {
  res.setHeader('content-security-policy', CSP);
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'same-origin');
  res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('cross-origin-opener-policy', 'same-origin');
  if ((req.headers['x-forwarded-proto'] || '') === 'https') res.setHeader('strict-transport-security', 'max-age=15552000');
}

// Pedido que muda alguma coisa e vem de outra página é recusado. O cookie já é SameSite=Lax;
// isto é a segunda tranca, para o dia em que um navegador tratar o cookie diferente.
function origemAceita(req) {
  const origem = req.headers.origin;
  if (origem === undefined) return true;
  try { return new URL(origem).host === req.headers.host; } catch { return false; }
}

// O que o progresso leva para os amigos: o nome curto e a foto. A foto só pode ser a que o
// próprio app gera (uma imagem embutida); um endereço de fora serviria para rastrear quem
// abre o Juntos ou a célula.
const FOTO_VALIDA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
function limparPerfilDoEstado(e) {
  e.apelido = String(e.apelido || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 20);
  if (!(typeof e.foto === 'string' && e.foto.length <= 400 * 1024 && FOTO_VALIDA.test(e.foto))) e.foto = '';
  const u = e.ultimaBiblia;
  e.ultimaBiblia = u && typeof u.livro === 'string' && TODOS_LIVROS.includes(u.livro) && Number.isInteger(u.cap) && u.cap >= 1 && u.cap <= 150
    ? { livro: u.livro, cap: u.cap, em: Number(u.em) || 0 } : null;
  return e;
}

// O progresso nasce no celular (o app funciona sem rede) e o servidor não refaz as contas.
// Mas não aceita o que não pode ter acontecido, porque a ofensiva, as conquistas e o que vai
// para o Feed saem dele:
//   - data no futuro (além de amanhã, pela diferença de fuso) vira hoje;
//   - leitura nova com mais de 7 dias de atraso conta como hoje: quem ficou uma semana sem
//     rede sincroniza normal; quem inventa um ano de leitura de uma vez não ganha um ano de ofensiva;
//   - data já gravada não é trocada por uma mais antiga que isso;
//   - contadores sobem no máximo um tanto por sincronização.
const DIAS_DE_ATRASO = 7;
const SUBIDA_MAXIMA = { acertosTotal: 500, missoesTotal: 30, maiorProposito: 30 };
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;
function conferirProgresso(atual, junto, hoje) {
  const limite = somaDias(hoje, -DIAS_DE_ATRASO);
  const amanha = somaDias(hoje, 1);
  for (const campo of ['marcadoEm', 'licoesEm', 'conhecidos']) {
    const antes = (atual && atual[campo]) || {};
    const mapa = { ...(junto[campo] || {}) };
    for (const [k, d] of Object.entries(mapa)) {
      // O Conhecer Jesus só tem 14 dias: chave fora disso não pode ter vindo de verdade.
      if (campo === 'conhecidos' && !(Number.isInteger(Number(k)) && Number(k) >= 1 && Number(k) <= 14)) { delete mapa[k]; continue; }
      if (d === antes[k]) continue;
      if (typeof d !== 'string' || !DATA_VALIDA.test(d)) { if (antes[k]) mapa[k] = antes[k]; else delete mapa[k]; continue; }
      if (d > amanha || d < limite) mapa[k] = antes[k] || hoje;
    }
    junto[campo] = mapa;
  }
  for (const [campo, maximo] of Object.entries(SUBIDA_MAXIMA)) {
    const antes = Number((atual && atual[campo]) || 0);
    const agora = Number(junto[campo] || 0);
    junto[campo] = Number.isFinite(agora) ? Math.max(antes, Math.min(agora, antes + maximo)) : antes;
  }
  // O XP da versão antiga só entra na primeira vez que o progresso chega ao servidor.
  if (atual) junto.xpLegado = atual.xpLegado === undefined ? null : atual.xpLegado;
  return junto;
}

const json = (res, codigo, dados) => {
  const corpo = Buffer.from(JSON.stringify(dados), 'utf8');
  res.writeHead(codigo, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': corpo.length,
    'cache-control': 'no-store',
  });
  res.end(corpo);
};

// ---------- progresso ----------
// Mora na tabela estados do banco. A fusão entre aparelhos continua na rota /api/estado.
async function lerEstado(chave) {
  try { return lerEstadoDoBanco(DB, chave); } catch { return null; }
}

async function gravarEstado(dados, chave) {
  gravarEstadoNoBanco(DB, chave, dados);
}

// Apaga o progresso de uma conta e as cópias dele: a linha no banco, a pessoa em cada
// backup, e o que sobrou da época dos arquivos (cópias diárias e a pasta de legado).
async function apagarProgressoDe(usuario) {
  const chave = arquivoDe(usuario);
  DB.prepare('DELETE FROM estados WHERE usuario = ?').run(chave);
  apagarPessoaDosBackups(join(PASTA_DADOS, 'backup'), chave);
  limparLegadoDe(chave);
}

// Os JSON da época dos arquivos que ainda existem (cópias .bak.json na pasta de dados e o
// que a migração guardou em json-legado-*): quem apaga a conta sai deles também.
function limparLegadoDe(chave) {
  const base = basename(ESTADO).replace(/\.json$/, '');
  const prefixo = chave === 'caminho' ? base : base + '-' + chave;
  const pastas = [PASTA_DADOS, ...readdirSync(PASTA_DADOS).filter((n) => n.startsWith('json-legado-')).map((n) => join(PASTA_DADOS, n))];
  for (const pasta of pastas) {
    for (const n of readdirSync(pasta)) {
      if (!n.endsWith('.json')) continue;
      const caminho = join(pasta, n);
      if (n === prefixo + '.json' || (n.startsWith(prefixo + '.') && n.endsWith('.bak.json'))) { unlinkSync(caminho); continue; }
      if (/^(contas|novidades|notificacoes)[.-]/.test(n)) tirarDoJsonLegado(caminho, chave);
    }
  }
}

function tirarDoJsonLegado(caminho, u) {
  let d;
  try { d = JSON.parse(readFileSync(caminho, 'utf8')); } catch { return; }
  if (!d || typeof d !== 'object') return;
  const semEle = (lista) => (Array.isArray(lista) ? lista.filter((x) => x !== u) : lista);
  if (d.contas) {
    delete d.contas[u];
    for (const c of Object.values(d.contas)) if (Array.isArray(c.segue)) c.segue = semEle(c.segue);
    for (const k of Object.keys(d.amizades || {})) if (k.split('|').includes(u)) delete d.amizades[k];
    for (const campo of ['bloqueios', 'silenciados']) {
      if (!d[campo]) continue;
      delete d[campo][u];
      for (const k of Object.keys(d[campo])) d[campo][k] = semEle(d[campo][k]);
    }
    for (const k of Object.keys(d.toques || {})) if (k.split('>').includes(u)) delete d.toques[k];
  }
  if (Array.isArray(d.eventos)) {
    d.eventos = d.eventos.filter((e) => e.autor !== u && (e.dados || {}).com !== u).map((e) => ({ ...e, reacoes: semEle(e.reacoes || []) }));
    d.ligados = semEle(d.ligados || []);
    d.perguntados = semEle(d.perguntados || []);
  }
  if (d.inscricoes) {
    delete d.inscricoes[u];
    if (d.preferencias) delete d.preferencias[u];
    if (d.historico) delete d.historico[u];
  }
  writeFileSync(caminho, JSON.stringify(d), 'utf8');
}

function corpoDaRequisicao(req, limite = LIMITE) {
  return new Promise((resolve, reject) => {
    let bruto = '';
    let tamanho = 0;
    req.on('data', (parte) => {
      tamanho += parte.length;
      if (tamanho > limite) { reject(new Error('corpo grande demais')); req.destroy(); return; }
      bruto += parte;
    });
    req.on('end', () => resolve(bruto));
    req.on('error', reject);
  });
}
const lerJson = async (req) => {
  try { return JSON.parse((await corpoDaRequisicao(req)) || '{}') || {}; } catch { return {}; }
};

// ---------- contas e sessão ----------
// Um banco só para tudo: dados/caminho.db. Na primeira subida, cada módulo importa o seu
// JSON antigo e o guarda em json-legado-AAAA-MM-DD/.
const DB = abrirBanco(arquivoDoBanco(PASTA_DADOS));
const CONTAS = await new Contas(join(dirname(ESTADO), 'contas.json')).carregar();
// O mural das novidades mora ao lado das contas.
const NOVIDADES = await new Novidades(join(dirname(ESTADO), 'novidades.json')).carregar();
// Notificações: aparelhos inscritos, preferências e o que já saiu hoje.
const NOTIFICACOES = await new Notificacoes(join(dirname(ESTADO), 'notificacoes.json')).carregar();
const CHAVES_PUSH = await chavesDoServidor(join(dirname(ESTADO), 'push.chave'));

// O progresso que morava em estado*.json entra na tabela uma vez, e os arquivos vão para
// json-legado-*. Arquivo ilegível para a subida: seguir sem ele apagaria o progresso de alguém.
function importarEstadosLegados() {
  if (lerMeta(DB, 'importado:estados') !== null) return;
  const base = basename(ESTADO).replace(/\.json$/, '');
  const achados = (existsSync(PASTA_DADOS) ? readdirSync(PASTA_DADOS) : [])
    .filter((n) => n.endsWith('.json') && !n.endsWith('.bak.json') && (n === base + '.json' || n.startsWith(base + '-')));
  const lidos = achados.map((n) => [
    n === base + '.json' ? 'caminho' : n.slice(base.length + 1, -'.json'.length),
    JSON.parse(readFileSync(join(PASTA_DADOS, n), 'utf8')),
  ]);
  transacao(DB, () => {
    for (const [chave, dados] of lidos) gravarEstadoNoBanco(DB, chave, dados);
    gravarMeta(DB, 'importado:estados', new Date().toISOString());
  });
  for (const n of achados) guardarLegado(join(PASTA_DADOS, n));
  if (achados.length) console.log('  progresso importado para o banco: ' + achados.length + ' arquivo(s)');
}
importarEstadosLegados();
// O serviço de push pede um contato de quem manda: o endereço do app, e não o e-mail de ninguém.
// Endereço que vai nos links de convite e de célula: o oficial (CAMINHO_ENDERECO), mesmo
// quando quem convida usa o app pelo endereço antigo. Sem ele (testes, HML), o da própria visita.
const enderecoPublico = (req) => process.env.CAMINHO_ENDERECO
  || (req.headers['x-forwarded-proto'] || 'http') + '://' + (req.headers.host || 'localhost');
const CONTATO_PUSH = process.env.CAMINHO_ENDERECO || 'https://ge.off-sec.net';
// Só as ferramentas de teste: aceitam um serviço de push em 127.0.0.1 e fixam o relógio.
const PUSH_TESTE = process.env.CAMINHO_PUSH_TESTE === '1';
const agoraDoServidor = () => (PUSH_TESTE && process.env.CAMINHO_RELOGIO ? new Date(process.env.CAMINHO_RELOGIO) : new Date());

const COOKIE = 'cc_sessao';
const DURACAO = 90 * 24 * 60 * 60 * 1000;

// A chave que assina sessões e convites nasce aqui e fica no disco: sorteada a cada
// start, todo reinício derrubaria quem já tinha entrado.
async function chaveDaSessao() {
  const arquivo = join(dirname(ESTADO), 'sessao.chave');
  try {
    return await readFile(arquivo, 'utf8');
  } catch {
    const nova = randomBytes(32).toString('hex');
    await mkdir(dirname(arquivo), { recursive: true });
    await writeFile(arquivo, nova, 'utf8');
    return nova;
  }
}
const CHAVE = await chaveDaSessao();
const assinar = (texto) => createHmac('sha256', CHAVE).update(texto).digest('base64url');

// O crachá é "nome.validade.assinatura". Nome de usuário aceita ponto, e o escape à
// mão evita que "julia.andrade" vire um crachá de quatro partes.
const paraCracha = (usuario) => encodeURIComponent(usuario).split('.').join('%2E');
const firmaDo = (nome, vence, usuario) =>
  assinar(nome + '.' + vence + '.' + seloDaConta(CONTAS.achar(usuario)));

function novoCracha(usuario) {
  const vence = Date.now() + DURACAO;
  const nome = paraCracha(usuario);
  return nome + '.' + vence + '.' + firmaDo(nome, vence, usuario);
}

function donoDoCracha(cracha) {
  if (!cracha) return '';
  const partes = String(cracha).split('.');
  if (partes.length !== 3) return '';
  const [nome, vence, firma] = partes;
  if (!(Number(vence) > Date.now())) return '';
  let usuario;
  try { usuario = decodeURIComponent(nome); } catch { return ''; }
  if (!CONTAS.achar(usuario)) return '';
  if (!iguais(firma, firmaDo(nome, vence, usuario))) return '';
  return usuario;
}

function porCookie(req, res, usuario) {
  const seguro = (req.headers['x-forwarded-proto'] || '') === 'https';
  res.setHeader('set-cookie', COOKIE + '=' + novoCracha(usuario)
    + '; Path=/; Max-Age=' + Math.floor(DURACAO / 1000)
    + '; HttpOnly; SameSite=Lax' + (seguro ? '; Secure' : ''));
}
const limparCookie = (res) =>
  res.setHeader('set-cookie', COOKIE + '=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');

function lerCookie(req, nome) {
  for (const parte of (req.headers.cookie || '').split(';')) {
    const [k, ...resto] = parte.trim().split('=');
    if (k === nome) return resto.join('=');
  }
  return '';
}

// ---------- senha esquecida ----------
// O link de nova senha é "nome.validade.assinatura", como o crachá, mas assinado com outro
// prefixo (um não serve no lugar do outro). A assinatura leva o selo da senha atual: trocada
// a senha, o link morre sozinho, então ele vale uma vez só, sem precisar anotar no banco.
const VALIDADE_LINK_SENHA = 60 * 60 * 1000;
const firmaDoLink = (nome, vence, usuario) =>
  assinar('redefinir.' + nome + '.' + vence + '.' + seloDaConta(CONTAS.achar(usuario)));
function linkDeSenha(usuario) {
  const vence = Date.now() + VALIDADE_LINK_SENHA;
  const nome = paraCracha(usuario);
  return CONTATO_PUSH.replace(/\/$/, '') + '/entrar.html?redefinir=' + nome + '.' + vence + '.' + firmaDoLink(nome, vence, usuario);
}
function donoDoLink(token) {
  const partes = String(token || '').split('.');
  if (partes.length !== 3) return '';
  const [nome, vence, firma] = partes;
  if (!(Number(vence) > Date.now())) return '';
  let usuario;
  try { usuario = decodeURIComponent(nome); } catch { return ''; }
  if (!CONTAS.achar(usuario)) return '';
  return iguais(firma, firmaDoLink(nome, vence, usuario)) ? usuario : '';
}

// Sem e-mail configurado, o pedido fica anotado para o dono ver no painel e mandar o link à
// mão. Guarda só o @ e quando pediu, e some em 7 dias ou quando o link é gerado.
const EMAIL = configDoEmail();
const ADMINS = String(process.env.CAMINHO_ADMIN || '').split(',').map((u) => limparNome(u)).filter(Boolean);
const ehAdmin = (usuario) => ADMINS.includes(usuario);
let cachePainel = null;
// Para o painel: onde estão os backups, o último e o espaço livre. O arquivo .disco-externo
// é deixado na pasta do disco externo; se ele sumir (disco solto, pasta recriada no cartão),
// o painel avisa que os backups voltaram para o cartão do Pi.
function estadoDosBackups() {
  const pasta = join(PASTA_DADOS, 'backup');
  try {
    const cifrados = readdirSync(pasta).filter((f) => /^caminho-\d{4}-\d{2}-\d{2}\.db\.cifrado$/.test(f)).sort();
    let livreGB = null;
    try { const s = statfsSync(pasta); livreGB = Math.round((s.bavail * s.bsize) / 1e8) / 10; } catch { /* sem statfs */ }
    return { quantos: cifrados.length, ultimo: (cifrados.at(-1) || '').slice(8, 18), externo: existsSync(join(pasta, '.disco-externo')), livreGB };
  } catch {
    return { quantos: 0, ultimo: '', externo: false, livreGB: null };
  }
}
function pedidosDeSenha() {
  let lista = [];
  try { lista = JSON.parse(lerMeta(DB, 'pedidos_senha') || '[]'); } catch { /* lista vazia */ }
  const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return lista.filter((p) => p.em > limite && CONTAS.achar(p.usuario));
}
function guardarPedidosDeSenha(lista) { gravarMeta(DB, 'pedidos_senha', JSON.stringify(lista.slice(-50))); }
const ultimoEnvioDeSenha = new Map();
const pedidosDeLinkPorIp = new Map();

const quemFala = (req) => (ABERTO_PARA_TESTE && CONTAS.vazio
  ? 'caminho' : donoDoCracha(lerCookie(req, COOKIE)));

// Tentativas erradas contam numa janela de 15 minutos, por IP e por conta. O IP vem do
// cabeçalho da Cloudflare: pelo túnel, todo pedido chega com o mesmo endereço do container,
// e as senhas erradas de uma pessoa trancariam todo mundo. Como esse cabeçalho pode ser
// forjado por quem fala direto com o servidor, a conta tem o seu próprio limite: dá para
// trocar de IP à vontade, mas não de alvo. A janela não zera com uma espera curta.
const ipDe = (req) => String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress || 'desconhecido');
const JANELA_ERROS = 15 * 60 * 1000;
const MAX_ERROS = { ip: 10, conta: 10, cadastro: 20 };
const marcas = new Map();
const recentes = (chave, janela) => (marcas.get(chave) || []).filter((t) => t > Date.now() - janela);
function marcar(chave, janela) { marcas.set(chave, recentes(chave, janela).concat(Date.now())); }
// Contas de verdade viram o @ delas: entrar pelo e-mail ou pelo @ gasta a mesma cota.
const alvoDe = (login) => {
  const c = CONTAS.achar(login) || CONTAS.acharPorEmail(login);
  return c ? c.usuario : String(login || '').trim().toLowerCase().slice(0, 254);
};
function podeTentar(ip, conta) {
  if (recentes('ip:' + ip, JANELA_ERROS).length >= MAX_ERROS.ip) return false;
  return !conta || recentes('conta:' + conta, JANELA_ERROS).length < MAX_ERROS.conta;
}
function anotarErro(ip, conta) {
  marcar('ip:' + ip, JANELA_ERROS);
  if (conta) marcar('conta:' + conta, JANELA_ERROS);
}
// Uso normal da API por conta: bem acima do que uma pessoa faz, abaixo do que um robô faz.
function dentroDoLimite(chave, max, janela = 60 * 1000) {
  if (recentes(chave, janela).length >= max) return false;
  marcar(chave, janela);
  return true;
}
// A memória das marcas não cresce para sempre.
setInterval(() => {
  for (const chave of marcas.keys()) if (!recentes(chave, JANELA_ERROS).length) marcas.delete(chave);
}, 10 * 60 * 1000).unref();
const MUITAS = { erro: 'muitas tentativas, espere alguns minutos' };

// ---------- o dia de cada um ----------
// A versão publicada, lida do service worker que o build gerou. Rota de API: o Cloudflare
// não guarda, então o app sempre recebe a resposta de agora.
async function versaoPublicada() {
  const sw = await readFile(join(RAIZ, 'sw.js'), 'utf8').catch(() => '');
  return (sw.match(/const CACHE = 'caminho-([0-9a-f]+)'/) || [])[1] || '';
}

const hojeDe = (usuario) => hojeNoFuso((CONTAS.achar(usuario) || {}).fuso);

async function diaDe(usuario, hoje) {
  const estado = await lerEstado(arquivoDe(usuario));
  const feitas = datasFeitas(estado);
  const simulacao = REGRAS.simularOfensiva([...feitas], hoje);
  return { estado, feitas, protegidos: new Set(simulacao.protegidos) };
}

// ---------- notificações ----------
const minutosNoFuso = (fuso, agora = new Date()) => {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: fusoValido(fuso) ? fuso : 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(agora);
  const valor = (tipo) => Number((partes.find((p) => p.type === tipo) || {}).value || 0);
  return valor('hour') * 60 + valor('minute');
};

const nomeDeExibicao = async (usuario) => {
  const c = CONTAS.achar(usuario);
  const estado = c ? await lerEstado(arquivoDe(usuario)) : null;
  return primeiroNome((estado && estado.apelido) || (c && c.nome) || usuario);
};

// Manda para todos os aparelhos da pessoa. O serviço que responde 404 ou 410 avisa que o
// aparelho desinstalou ou revogou a permissão: a inscrição sai da lista.
// Tudo o que sai também fica na caixa do sino (menos o teste e o que já foi guardado por
// quem chamou, como o aviso social).
async function enviarPara(usuario, mensagem, opcoes = {}) {
  if (!opcoes.semCaixa) await NOTIFICACOES.guardarNaCaixa(usuario, opcoes.tipo || mensagem.tag || '', mensagem);
  let enviados = 0;
  for (const inscricao of NOTIFICACOES.inscricoesDe(usuario)) {
    try {
      const status = await enviarPush(inscricao, mensagem, CHAVES_PUSH, CONTATO_PUSH, opcoes);
      if (status === 404 || status === 410) await NOTIFICACOES.esquecerEndpoint(inscricao.endpoint);
      else if (status >= 200 && status < 300) enviados++;
      else console.log('  push ' + status + ' para ' + usuario);
    } catch (e) {
      console.log('  push falhou para ' + usuario + ': ' + e.message);
    }
  }
  return enviados;
}

// Aviso social (toque, pedido, convite aceito): sai na hora, mas respeita a escolha da
// pessoa, o silêncio da noite e, nos toques, o teto do dia de quem recebe.
async function avisoSocial(para, tipo, dados) {
  const conta = CONTAS.achar(para);
  if (!conta) return false;
  const agora = agoraDoServidor();
  // A interação vai para a caixa do sino sempre, mesmo sem aparelho inscrito, com o aviso
  // desligado ou na hora do silêncio: só o push é que respeita essas escolhas.
  {
    const dataCaixa = hojeNoFuso(conta.fuso, agora);
    const paraCaixa = montarMensagem(tipo, tipo === 'toque' ? { ...dados, outros: 0 } : dados, { usuario: para, data: dataCaixa, nome: await nomeDeExibicao(para) });
    await NOTIFICACOES.guardarNaCaixa(para, tipo, paraCaixa);
  }
  if (!NOTIFICACOES.inscricoesDe(para).length) return false;
  // Decisão do dono (01/10): todo toque vira notificação no celular de quem recebe, sem a
  // chave "avisos de amigos", sem o silêncio da noite e sem o teto de toques recebidos no
  // dia. Os outros avisos sociais continuam respeitando essas escolhas.
  // As cutucadas com tema (café, oração, treino) são toques também: seguem a mesma regra.
  const toque = tipo === 'toque' || tipo.startsWith('cutucada');
  if (!toque && !NOTIFICACOES.preferencias(para).amigos) return false;
  if (!toque && emSilencio(minutosNoFuso(conta.fuso, agora))) return false;
  const data = hojeNoFuso(conta.fuso, agora);
  if (toque) dados = { ...dados, outros: NOTIFICACOES.toquesHoje(para, data) };
  const mensagem = montarMensagem(tipo, dados, { usuario: para, data, nome: await nomeDeExibicao(para) });
  if (!(await enviarPara(para, mensagem, { semCaixa: true }))) return false;
  await NOTIFICACOES.anotar(para, tipo, data, 0);
  return true;
}
const CUTUCADAS = new Set();
const semEsperar = (promessa) => { promessa.catch((e) => console.log('  aviso não saiu: ' + e.message)); };

// A rodada dos lembretes: cada pessoa com aparelho inscrito é olhada no próprio fuso. As
// regras (horário, teto do dia, silêncio, quem sumiu) moram em decidir(), testadas hora a hora.
// ---------- Trilha do Semeador ----------
// O nível de quem convidou. Nível novo vira marco no mural uma vez só: o nível já anunciado
// fica na conta, porque a novidade vence em 30 dias e não pode voltar a aparecer.
async function marcoDoSemeador(usuario) {
  const trilha = trilhaDoSemeador(CONTAS.semeadorDe(usuario));
  const conta = CONTAS.achar(usuario);
  if (conta && trilha.nivel > (Number(conta.semeadorNivel) || 0)) {
    await CONTAS.anotarNivelSemeador(conta.usuario, trilha.nivel);
    await NOVIDADES.publicar(conta.usuario, 'semeador', { nivel: trilha.nivel, nome: trilha.nome }, 'semeador:' + trilha.nivel);
  }
  return { ...trilha, niveis: NIVEIS_SEMEADOR };
}

// Quem entrou na célula: a amizade nova com quem mandou o link vira novidade, como num
// convite, e quem mandou recebe o mesmo aviso de "entrou no propósito".
async function avisarEntradaNaCelula(eu, r, hoje) {
  if (r.amizadeNova) await NOVIDADES.publicar(eu, 'novoProposito', { com: r.de }, 'novo:' + [eu, r.de].sort().join('|') + ':' + hoje);
  semEsperar(avisoSocial(r.de, 'propositoAceito', { amigo: await nomeDeExibicao(eu), titulo: r.proposito.titulo, id: r.proposito.id, celula: true }));
}

// ---------- propósitos ----------
// O retrato de um propósito hoje, como o app mostra: quem já fez, os pontos do grupo e os dias
// juntos. Leva só se cada um fez, nunca o que alguém escreveu ou orou.
async function retratoDoProposito(p, eu) {
  const hojeEu = hojeDe(eu);
  const info = new Map();
  for (const m of p.membros) {
    const c = CONTAS.achar(m.usuario);
    if (!c) continue;
    const hojeDele = hojeNoFuso(c.fuso);
    const referencia = hojeDele < hojeEu ? hojeDele : hojeEu;
    const dia = await diaDe(m.usuario, referencia);
    info.set(m.usuario, { conta: c, estado: dia.estado, protegidos: dia.protegidos, datas: datasDoTipo(p.tipo, p.alvo, dia.estado, PLANO_DO_CONTEUDO), referencia });
  }
  const referencia = [...info.values()].reduce((menor, x) => (x.referencia < menor ? x.referencia : menor), hojeEu);
  // Visitante (só está conhecendo a célula) fica fora da meta do dia e de "quem leu": não é
  // membro de verdade ainda, então não pode pesar a favor nem contra o grupo.
  const ativos = p.membros.filter((m) => m.estado === 'ativo' && info.has(m.usuario) && m.papel !== 'visitante');
  let dias = 0;
  let hoje = null;
  if (!p.grupo) {
    const [x, y] = ativos.map((m) => info.get(m.usuario));
    if (x && y) {
      dias = diasJuntos({ tipo: p.tipo, datasA: x.datas, datasB: y.datas, protegidosA: x.protegidos, protegidosB: y.protegidos, desde: p.criadoEm, hoje: referencia });
    }
  } else {
    // Conta como membro do dia quem já tinha entrado, ainda não tinha saído e não é visitante.
    const noDia = (data) => pontosDoDia(p.membros
      .filter((m) => info.has(m.usuario) && m.estado !== 'convidado' && m.papel !== 'visitante' && m.entrouEm && m.entrouEm <= data && (!m.saiuEm || m.saiuEm > data))
      .map((m) => { const x = info.get(m.usuario); return { feito: x.datas.has(data), extra: extraNoDia(x.estado, data) }; }));
    // Dia fechado e batido fica anotado; hoje ainda pode mudar, então é sempre recalculado.
    const guardados = new Set(p.diasBatidos || []);
    const novos = [];
    const batidaEm = (d) => {
      if (guardados.has(d)) return true;
      const batida = noDia(d).batida;
      if (batida && d < referencia) novos.push(d);
      return batida;
    };
    hoje = noDia(referencia);
    dias = sequenciaDoGrupo({ tipo: p.tipo, batidaEm, desde: p.criadoEm, hoje: referencia });
    if (novos.length) await CONTAS.anotarDiasBatidos(p.id, novos);
  }
  const membros = p.membros.filter((m) => m.estado !== 'saiu' && info.has(m.usuario)).map((m) => {
    const x = info.get(m.usuario);
    return {
      usuario: m.usuario, nome: (x.estado && x.estado.apelido) || x.conta.nome || m.usuario, foto: (x.estado && x.estado.foto) || '',
      estado: m.estado, papel: m.papel || '', fezHoje: m.estado === 'ativo' && x.datas.has(referencia),
      extraHoje: p.grupo && m.estado === 'ativo' ? extraNoDia(x.estado, referencia) === 1 : false,
    };
  });
  const minha = p.membros.find((m) => m.usuario === eu) || {};
  return {
    id: p.id, tipo: p.tipo, alvo: p.alvo, titulo: p.titulo, grupo: p.grupo, celula: !!p.celula, limite: limiteDo(p),
    criadoPor: p.criadoPor, criadoEm: p.criadoEm,
    dias, hoje, membros, euConvidado: minha.estado === 'convidado', convidadoPor: minha.convidadoPor || '',
    ...(p.celula ? celulaNoRetrato(p, eu, info, ativos, referencia) : {}),
  };
}

// Dias inteiros entre duas datas ISO (a antes de ou igual a b).
const diasEntre = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
// Quantos dias de encontro registrado entram na conta de "encontrosRegistrados".
const JANELA_ENCONTROS = 60;
// No máximo esta quantidade de pessoas no bloco "precisam de atenção".
// A partir de quantos dias sem ler alguém entra em "precisa de atenção".

// O que só a célula tem: o dia do encontro, o recado, a semana que o roteiro cobre (os 7 dias
// do plano até onde o líder já leu: é ele quem conduz o encontro) e o roteiro 4 Ws. O resto
// (semana do grupo, quem precisa de atenção, o registro dos encontros) é só de quem conduz
// (líder ou auxiliar): membro comum nunca vê lista de presença nem "quem sumiu".
// Por 30 dias depois da multiplicação, as duas células mostram um aviso discreto no topo da
// aba Hoje: a mãe não ganha coluna nenhuma para isso (quem é filha de quem se descobre
// olhando quem tem "mae" apontando para ela), a filha guarda "mae" e "multiplicadaEm" direto.
const JANELA_MULTIPLICACAO = 30;
function bannerMultiplicacao(p, referencia) {
  const dentroDaJanela = (data) => !!data && diasEntre(data, referencia) >= 0 && diasEntre(data, referencia) <= JANELA_MULTIPLICACAO;
  let nasceuDe = null;
  if (p.mae && dentroDaJanela(p.multiplicadaEm)) {
    const maeProposito = CONTAS.proposito(p.mae);
    if (maeProposito) nasceuDe = { titulo: maeProposito.titulo };
  }
  let multiplicouPara = null;
  const filhaRecente = Object.values(CONTAS.dados.propositos || {}).find((x) => x.mae === p.id && dentroDaJanela(x.multiplicadaEm));
  if (filhaRecente) multiplicouPara = { titulo: filhaRecente.titulo };
  return { nasceuDe, multiplicouPara };
}

function celulaNoRetrato(p, eu, info, ativos, referencia) {
  const lider = info.get(p.criadoPor);
  const lidos = ((lider && lider.estado && lider.estado.lidos) || []).map(Number).filter((n) => n >= 1 && n <= PLANO_DO_CONTEUDO.length);
  const semanaAte = Math.max(7, lidos.length ? Math.max(...lidos) : 0);
  const conduzo = podeConduzir(p, eu);
  const extra = {
    encontro: Number.isInteger(p.encontro) ? p.encontro : -1, recado: p.recado || '', recadoEm: p.recadoEm || '', semanaAte,
    estudo: p.estudo || null,
    estudoAcolhida: p.estudoAcolhida || '', estudoAdoracao: p.estudoAdoracao || '', estudoTestemunho: p.estudoTestemunho || '',
    euConduzo: conduzo,
    ...bannerMultiplicacao(p, referencia),
  };
  if (!conduzo) return extra;
  const semana = new Set(Array.from({ length: 7 }, (_, i) => somaDias(referencia, -i)));
  let leram = 0;
  let leituras = 0;
  for (const m of ativos) {
    const n = [...info.get(m.usuario).datas].filter((d) => semana.has(d)).length;
    if (n) leram++;
    leituras += n;
  }

  // Os dois últimos encontros registrados, do mais novo para o mais velho.
  const encontros = (p.encontros || []).slice().sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  const ultimo = encontros[0] || null;
  const nomeDe = (u) => { const x = info.get(u); return (x && ((x.estado && x.estado.apelido) || x.conta.nome)) || u; };

  // Quem precisa de atenção: nunca quem conduz, nunca visitante (já fora de "ativos"). A regra
  // mora em propositos.mjs, onde os testes a exercitam sem servidor.
  const atencao = quemPrecisaDeAtencao({
    candidatos: ativos.filter((m) => !podeConduzir(p, m.usuario))
      .map((m) => ({ usuario: m.usuario, nome: nomeDe(m.usuario), entrouEm: m.entrouEm, datas: info.get(m.usuario).datas })),
    encontros, referencia, criadoEm: p.criadoEm,
  });

  const limiteJanela = somaDias(referencia, -JANELA_ENCONTROS);
  return {
    ...extra,
    semanaLider: { pessoas: ativos.length, leram, leituras, possiveis: ativos.length * 7 },
    atencao,
    ultimoEncontro: ultimo ? { data: ultimo.data, presentes: ultimo.presentes.length, visitantes: ultimo.visitantes, semEncontro: !!ultimo.semEncontro } : null,
    encontrosRegistrados: encontros.filter((e) => !e.semEncontro && e.data >= limiteJanela && e.data <= referencia).length,
  };
}

async function rodadaDeLembretes(agora = new Date()) {
  const saiu = [];
  for (const usuario of NOTIFICACOES.comInscricao()) {
    const conta = CONTAS.achar(usuario);
    if (!conta) continue;
    const data = hojeNoFuso(conta.fuso, agora);
    const minutos = minutosNoFuso(conta.fuso, agora);
    if (emSilencio(minutos)) continue;
    const { feitas, protegidos } = await diaDe(usuario, data);
    const ontem = somaDias(data, -1);
    let ofensiva = 0;
    for (let d = ontem; (feitas.has(d) || protegidos.has(d)) && ofensiva < 5000; d = somaDias(d, -1)) ofensiva++;
    const decisao = decidir({
      agora: { data, minutos },
      pref: NOTIFICACOES.preferencias(usuario),
      historico: NOTIFICACOES.historico(usuario),
      leitura: {
        leuHoje: feitas.has(data),
        ofensiva,
        ultimaLeitura: [...feitas].filter((d) => d <= data).sort().pop() || null,
        escudoOntem: protegidos.has(ontem) && !feitas.has(ontem),
        criadaEm: conta.criadaEm,
      },
    });
    if (!decisao) continue;
    // Anota antes de mandar: se o serviço demorar, a rodada seguinte não repete o aviso.
    await NOTIFICACOES.anotar(usuario, decisao.tipo, data, minutos);
    const mensagem = montarMensagem(decisao.tipo, decisao.dados, { usuario, data, nome: await nomeDeExibicao(usuario) });
    await enviarPara(usuario, mensagem, { ttl: 3 * 3600 });
    saiu.push({ usuario, tipo: decisao.tipo, titulo: mensagem.titulo });
  }

  // Meta do grupo: depois das 18h, se falta pouco (até 2 pontos), quem ainda não fez recebe um
  // recado, no máximo um por dia por grupo, dentro da escolha "Amigos" e do silêncio da noite.
  // Quando a meta é batida, todos os ativos recebem a boa notícia, também uma vez por dia.
  // Grupo de oração não entra: oração não tem meta nem cobrança.
  for (const p of CONTAS.propositosAtivos().filter((x) => x.grupo && x.tipo !== 'oracao')) {
    const retrato = await retratoDoProposito(p, p.criadoPor);
    if (!retrato.hoje) continue;
    // Meta de grupo precisa de grupo: com uma pessoa só (a célula que acabou de nascer), ler
    // o próprio dia não vira "o grupo bateu a meta" nem cobrança de ninguém.
    if (retrato.membros.filter((m) => m.estado === 'ativo').length < 2) continue;
    if (retrato.hoje.batida) {
      for (const m of retrato.membros) {
        if (m.estado !== 'ativo' || !NOTIFICACOES.inscricoesDe(m.usuario).length || !NOTIFICACOES.preferencias(m.usuario).amigos) continue;
        const conta = CONTAS.achar(m.usuario);
        const data = hojeNoFuso(conta.fuso, agora);
        const minutos = minutosNoFuso(conta.fuso, agora);
        if (emSilencio(minutos)) continue;
        const chave = 'grupoBatida:' + p.id;
        if (NOTIFICACOES.historico(m.usuario)[chave] === data) continue;
        await NOTIFICACOES.anotar(m.usuario, chave, data, minutos);
        const mensagem = montarMensagem('metaBatida', { titulo: p.titulo, id: p.id, celula: !!p.celula }, { usuario: m.usuario, data, nome: m.nome });
        await enviarPara(m.usuario, mensagem, { ttl: 3 * 3600 });
        saiu.push({ usuario: m.usuario, tipo: 'metaBatida', titulo: mensagem.titulo });
      }
      continue;
    }
    if (retrato.hoje.faltam > 2) continue;
    for (const m of retrato.membros) {
      // Visitante não entra na meta do grupo, então também não recebe a cobrança dela.
      if (m.estado !== 'ativo' || m.papel === 'visitante' || m.fezHoje || !NOTIFICACOES.inscricoesDe(m.usuario).length || !NOTIFICACOES.preferencias(m.usuario).amigos) continue;
      const conta = CONTAS.achar(m.usuario);
      const data = hojeNoFuso(conta.fuso, agora);
      const minutos = minutosNoFuso(conta.fuso, agora);
      if (emSilencio(minutos) || minutos < 18 * 60) continue;
      const chave = 'grupo:' + p.id;
      if (NOTIFICACOES.historico(m.usuario)[chave] === data) continue;
      await NOTIFICACOES.anotar(m.usuario, chave, data, minutos);
      const mensagem = montarMensagem('metaDoGrupo', { faltam: retrato.hoje.faltam, titulo: p.titulo, id: p.id, celula: !!p.celula }, { usuario: m.usuario, data, nome: m.nome });
      await enviarPara(m.usuario, mensagem, { ttl: 3 * 3600 });
      saiu.push({ usuario: m.usuario, tipo: 'metaDoGrupo', titulo: mensagem.titulo });
    }
  }
  return saiu;
}

// ---------- rotas ----------
const servidor = createServer(async (req, res) => {
  try {
    protecoes(req, res);
    const url = new URL(req.url, 'http://x');
    const rota = decodeURIComponent(url.pathname);
    const ip = ipDe(req);
    const post = req.method === 'POST';
    const mudaAlgo = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (mudaAlgo && rota.startsWith('/api/') && !origemAceita(req)) { json(res, 403, { erro: 'pedido de outra origem' }); return; }

    // ---------- públicas ----------
    if (rota === '/api/existe-conta') { json(res, 200, { existe: !CONTAS.vazio }); return; }
    if (rota === '/api/versao') { json(res, 200, { versao: await versaoPublicada() }); return; }

    // Só nas ferramentas de teste: um backup agora, para conferir que apagar a conta limpa os backups.
    if ((PUSH_TESTE || process.env.CAMINHO_TESTE === '1') && rota === '/api/teste/backup' && post) {
      json(res, 200, { arquivo: basename(fazerBackup(DB, join(PASTA_DADOS, 'backup', 'caminho-teste-' + Date.now() + '.db.cifrado'))) });
      return;
    }

    // Só nas ferramentas de teste: roda os lembretes num horário escolhido.
    if (PUSH_TESTE && rota === '/api/notificacoes/rodada' && post) {
      const { agora } = await lerJson(req);
      json(res, 200, { saiu: await rodadaDeLembretes(new Date(agora || Date.now())) });
      return;
    }

    if (rota.startsWith('/api/convites/') && req.method === 'GET') {
      const convite = CONTAS.lerConvite(rota.slice('/api/convites/'.length), assinar);
      if (!convite) { json(res, 410, { erro: 'esse convite venceu ou foi cancelado' }); return; }
      // O portal usa "modo" para não perguntar "você já segue Jesus?" de quem já chega
      // pelo link do Conhecer Jesus: a resposta já está decidida pelo convite.
      json(res, 200, { usuario: convite.de, nome: convite.nome, modo: convite.modo || '' });
      return;
    }

    // Quem abre o link da célula ainda sem conta vê só o nome da célula, quem chamou e quantas
    // vagas restam. Os nomes de quem já está dentro ficam para depois de entrar.
    if (rota.startsWith('/api/celula/') && req.method === 'GET') {
      const link = CONTAS.lerLinkCelula(rota.slice('/api/celula/'.length), assinar);
      if (!link) { json(res, 410, { erro: 'esse link de célula venceu ou foi cancelado' }); return; }
      json(res, 200, { usuario: link.de, nome: link.nome, titulo: link.titulo, pessoas: link.pessoas, limite: link.limite, vagas: link.vagas });
      return;
    }

    if (rota === '/api/criar-conta') {
      if (!post) { json(res, 405, { erro: 'método não suportado' }); return; }
      if (recentes('cadastro:' + ip, JANELA_ERROS).length >= MAX_ERROS.cadastro) { json(res, 429, MUITAS); return; }
      try {
        const pedido = await lerJson(req);
        const criada = await CONTAS.criar(pedido);
        porCookie(req, res, criada.usuario);
        // Conta criada pelo link de um convite: a amizade nasce junto, e quem convidou fica
        // anotado para a Trilha do Semeador. Convite vencido ou cancelado não impede a conta.
        let convidadoPor = '';
        if (pedido.convite) {
          try {
            const hoje = hojeDe(criada.usuario);
            const usado = await CONTAS.usarConvite(criada.usuario, String(pedido.convite), assinar, hoje, Date.now(), { contaNova: true });
            // Marcou "Estou conhecendo" vindo do convite de um amigo: esse amigo acompanha.
            if (pedido.caminho === 'conhecer' && usado.de) await CONTAS.acompanharNoConhecer(criada.usuario, usado.de);
            if (!usado.ja) {
              convidadoPor = usado.de;
              await NOVIDADES.publicar(criada.usuario, 'novoProposito', { com: usado.de }, 'novo:' + [criada.usuario, usado.de].sort().join('|') + ':' + hoje);
              semEsperar(avisoSocial(usado.de, 'aceito', { amigo: primeiroNome(criada.nome), amigoUsuario: criada.usuario }));
            }
          } catch { /* segue sem o convite */ }
        }
        // Sem convite, o próprio portal deixa marcar "estou conhecendo" no cadastro. Só
        // "conhecer" é aceito aqui: o plano é o padrão de quem não diz nada.
        if (!pedido.convite && pedido.caminho === 'conhecer') {
          try { await CONTAS.definirCaminho(criada.usuario, 'conhecer'); } catch { /* segue no plano */ }
        }
        // Conta criada pelo link de uma célula: entra direto no grupo. Célula cheia ou link
        // vencido não impedem a conta; o app avisa depois, ao abrir.
        let celula = '';
        const marcarOrigem = (origem) => CONTAS.marcarOrigem(criada.usuario, origem).catch(() => {});
        if (pedido.celula) {
          try {
            const hoje = hojeDe(criada.usuario);
            const r = await CONTAS.entrarNaCelula(criada.usuario, String(pedido.celula), assinar, hoje, Date.now(), { contaNova: true, visitante: !!pedido.celulaVisitante });
            celula = r.proposito.titulo;
            // Marcou "Estou conhecendo" vindo do link da célula: quem mandou o link acompanha.
            if (pedido.caminho === 'conhecer' && r.de) await CONTAS.acompanharNoConhecer(criada.usuario, r.de);
            await marcarOrigem('celula');
            await avisarEntradaNaCelula(criada.usuario, r, hoje);
          } catch { /* segue sem a célula */ }
        }
        json(res, 200, { ok: true, usuario: criada.usuario, convidadoPor, celula });
      } catch (e) {
        marcar('cadastro:' + ip, JANELA_ERROS);
        json(res, e.codigo || 400, { erro: e.publico ? e.message : 'não consegui criar a conta' });
      }
      return;
    }

    if (rota === '/api/entrar') {
      if (!post) { json(res, 405, { erro: 'método não suportado' }); return; }
      const { login, usuario, senha } = await lerJson(req);
      const alvo = alvoDe(login || usuario);
      if (!podeTentar(ip, alvo)) { json(res, 429, MUITAS); return; }
      const conta = await CONTAS.conferir(login || usuario, senha);
      if (!conta) { anotarErro(ip, alvo); json(res, 401, { erro: 'usuário ou senha não conferem' }); return; }
      marcas.delete('conta:' + conta.usuario);
      porCookie(req, res, conta.usuario);
      json(res, 200, { ok: true, usuario: conta.usuario });
      return;
    }

    if (rota === '/api/sair') { limparCookie(res); json(res, 200, { ok: true }); return; }

    // A resposta é a mesma exista ou não a conta: a tela não pode servir para descobrir
    // quais e-mails têm cadastro. Limite próprio (5 pedidos por IP a cada 15 minutos), para
    // pedir link não trancar o login de quem está do mesmo lado.
    if (rota === '/api/esqueci-senha') {
      if (!post) { json(res, 405, { erro: 'método não suportado' }); return; }
      const janela = (pedidosDeLinkPorIp.get(ip) || []).filter((t) => t > Date.now() - 15 * 60 * 1000);
      if (janela.length >= 5) { json(res, 429, { erro: 'muitas tentativas, espere um pouco' }); return; }
      pedidosDeLinkPorIp.set(ip, janela.concat(Date.now()));
      const { login } = await lerJson(req);
      const conta = CONTAS.achar(login) || CONTAS.acharPorEmail(login);
      const recente = conta && Date.now() - (ultimoEnvioDeSenha.get(conta.usuario) || 0) < 5 * 60 * 1000;
      if (conta && !recente) {
        ultimoEnvioDeSenha.set(conta.usuario, Date.now());
        // Sem e-mail, ou quando ele não sai (domínio ainda sem verificar, chave trocada,
        // serviço fora do ar), o pedido vai para o painel do dono, que gera o link à mão.
        const paraOPainel = () => guardarPedidosDeSenha(pedidosDeSenha().filter((p) => p.usuario !== conta.usuario)
          .concat({ usuario: conta.usuario, em: Date.now() }));
        if (EMAIL && conta.email) {
          enviarEmail(EMAIL, {
            para: conta.email,
            assunto: 'Sua nova senha no Geração Eleita',
            texto: 'Olá, ' + primeiroNome(conta.nome) + '!\n\nRecebemos um pedido para criar uma nova senha para @' + conta.usuario
              + '. Abra o link abaixo em até 1 hora:\n\n' + linkDeSenha(conta.usuario)
              + '\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.\n\nGeração Eleita',
          }).catch((e) => {
            console.log('  e-mail de senha não saiu, pedido vai para o painel: ' + e.message);
            paraOPainel();
          });
        } else {
          paraOPainel();
        }
      }
      json(res, 200, { ok: true, porEmail: !!EMAIL });
      return;
    }

    if (rota === '/api/redefinir-senha') {
      if (!post) { json(res, 405, { erro: 'método não suportado' }); return; }
      if (!podeTentar(ip)) { json(res, 429, MUITAS); return; }
      const { token, senha } = await lerJson(req);
      const usuario = donoDoLink(token);
      if (!usuario) { anotarErro(ip); json(res, 410, { erro: 'esse link venceu ou já foi usado. Peça outro' }); return; }
      try {
        await CONTAS.trocarSenha(usuario, senha);
      } catch (e) {
        json(res, 400, { erro: e.publico ? e.message : 'não consegui trocar a senha' });
        return;
      }
      guardarPedidosDeSenha(pedidosDeSenha().filter((p) => p.usuario !== usuario));
      porCookie(req, res, usuario);
      json(res, 200, { ok: true, usuario });
      return;
    }

    // Versões antigas do aplicativo em cache ainda chamam estas rotas.
    if (rota === '/api/seguir' || rota === '/api/parar-de-seguir') {
      json(res, 410, { erro: 'atualize o aplicativo' });
      return;
    }

    // ---------- porteiro ----------
    const eu = quemFala(req);
    if (!eu) {
      if (rota.startsWith('/api/')) { json(res, 401, { erro: 'entre primeiro' }); return; }
      const livre = rota === '/entrar.html' || rota === '/privacidade.html' || rota === '/termos.html'
        || rota.endsWith('.png') || rota === '/manifest.webmanifest' || rota === '/favicon.ico'
        || FONTE_COM_RESUMO.test(rota);
      if (!livre) {
        const pagina = await readFile(join(RAIZ, 'entrar.html')).catch(() => null);
        if (!pagina) { res.writeHead(503).end('rode "node build.mjs" antes de servir'); return; }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': pagina.length, 'cache-control': 'no-store' });
        res.end(req.method === 'HEAD' ? undefined : pagina);
        return;
      }
    }

    if (eu && rota.startsWith('/api/')) await CONTAS.anotarAcesso(eu, hojeDe(eu)).catch(() => {});

    // Mais de 120 mudanças por minuto, ou 30 buscas de @, não é gente usando o app.
    if (rota.startsWith('/api/') && mudaAlgo && !dentroDoLimite('api:' + eu, 120)) { json(res, 429, MUITAS); return; }
    if (rota === '/api/procurar' && !dentroDoLimite('procurar:' + eu, 30)) { json(res, 429, MUITAS); return; }

    const conta = CONTAS.achar(eu);
    const exigir = (condicao, codigo, erro) => { if (!condicao) { json(res, codigo, { erro }); return false; } return true; };

    if (rota === '/api/quem') {
      const semeador = conta ? await marcoDoSemeador(eu) : null;
      // Quem acompanha (só o @ e o nome: nunca o que a pessoa escreveu) só aparece para
      // quem está mesmo no caminho de conhecer Jesus e tem alguém marcado.
      const quemAcompanha = conta && conta.acompanhadoPor ? CONTAS.achar(conta.acompanhadoPor) : null;
      json(res, 200, {
        usuario: eu,
        nome: conta ? conta.nome : eu,
        email: conta ? conta.email : '',
        nascimento: conta ? conta.nascimento : '',
        perfilCompleto: conta ? CONTAS.perfilCompleto(conta) : false,
        consentimento: conta ? CONTAS.consentiu(conta) : false,
        consentimentoEm: (conta && conta.consentimento && conta.consentimento.em) || '',
        comSenha: !!conta,
        semeador,
        admin: ehAdmin(eu),
        caminho: (conta && conta.caminho) || 'plano',
        ...(quemAcompanha ? { acompanhadoPor: { usuario: quemAcompanha.usuario, nome: quemAcompanha.nome } } : {}),
      });
      return;
    }

    // ---------- painel do dono ----------
    if (rota === '/api/painel' || rota === '/api/painel/link') {
      if (!exigir(conta && ehAdmin(eu), 403, 'só o dono do app vê o painel')) return;
      if (rota === '/api/painel/link') {
        if (!exigir(post, 405, 'método não suportado')) return;
        const { usuario } = await lerJson(req);
        const alvo = CONTAS.achar(usuario);
        if (!exigir(alvo, 404, 'conta não encontrada')) return;
        guardarPedidosDeSenha(pedidosDeSenha().filter((p) => p.usuario !== alvo.usuario));
        // Fica no registro do servidor: quem gerou, para quem e quando.
        console.log('  painel: @' + eu + ' gerou link de nova senha para @' + alvo.usuario + ' em ' + new Date().toISOString());
        json(res, 200, { link: linkDeSenha(alvo.usuario), usuario: alvo.usuario, validade: '1 hora' });
        return;
      }
      // Um minuto de cache nos números (reler todos os estados pesa no Pi); os pedidos de senha
      // e o e-mail são lidos na hora, porque mudam quando o dono gera um link.
      if (!cachePainel || Date.now() - cachePainel.em >= 60000) {
        const estados = {};
        await Promise.all(CONTAS.lista().map(async (c) => { estados[c.usuario] = (await lerEstado(arquivoDe(c.usuario))) || {}; }));
        cachePainel = {
          em: Date.now(),
          painel: montarPainel({
            contas: CONTAS.lista(),
            estados,
            propositos: Object.values(CONTAS.dados.propositos || {}),
            comPush: NOTIFICACOES.comInscricao(),
            hoje: hojeDe(eu),
            pedidos: Object.values(CONTAS.dados.pedidos || {}),
            discipulados: Object.values(CONTAS.dados.discipulados || {}),
          }),
        };
      }
      const painel = {
        ...cachePainel.painel,
        geradoEm: new Date(cachePainel.em).toISOString(),
        pedidosDeSenha: pedidosDeSenha().map((p) => ({ usuario: p.usuario, em: new Date(p.em).toISOString() })),
        emailLigado: !!EMAIL,
        backup: estadoDosBackups(),
      };
      json(res, 200, painel);
      return;
    }

    if (rota === '/api/perfil') {
      if (!exigir(post && conta, 405, 'método não suportado')) return;
      try {
        await CONTAS.completarPerfil(eu, await lerJson(req));
        json(res, 200, { ok: true });
      } catch (e) {
        json(res, e.codigo || 400, { erro: e.publico ? e.message : 'não consegui salvar' });
      }
      return;
    }

    if (rota === '/api/fuso') {
      if (!exigir(post && conta, 405, 'método não suportado')) return;
      const { fuso } = await lerJson(req);
      if (fusoValido(fuso)) await CONTAS.atualizarFuso(eu, fuso);
      json(res, 200, { ok: true });
      return;
    }

    // Troca o próprio caminho: "plano" (a Bíblia em um ano) ou "conhecer" (os 14 dias).
    if (rota === '/api/caminho') {
      if (!exigir(post && conta, 405, 'método não suportado')) return;
      try {
        await CONTAS.definirCaminho(eu, (await lerJson(req)).caminho);
        json(res, 200, { ok: true });
      } catch (e) {
        json(res, e.codigo || 400, { erro: e.publico ? e.message : 'não consegui trocar o caminho' });
      }
      return;
    }

    // ---------- estado ----------
    // Fundido também aqui: um aparelho que grava antes de sincronizar não pode apagar
    // o que outro marcou. A ofensiva dos amigos depende dessas datas.
    if (rota === '/api/estado') {
      const arquivo = arquivoDe(eu);
      if (req.method === 'GET') { json(res, 200, (await lerEstado(arquivo)) || { vazio: true }); return; }
      if (req.method === 'PUT' || post) {
        try {
          const novo = REGRAS.normalizarEstado(JSON.parse(await corpoDaRequisicao(req, LIMITE_ESTADO)));
          if (!novo) throw new Error('formato inválido');
          const atual = REGRAS.normalizarEstado(await lerEstado(arquivo));
          const junto = atual ? REGRAS.fundir(atual, novo) : novo;
          if (novo.dono) junto.dono = novo.dono;
          await gravarEstado(limparPerfilDoEstado(conferirProgresso(atual, junto, hojeDe(eu))), arquivo);
          // A primeira lição de quem veio por um convite conta para quem convidou.
          if (conta && conta.convidadoPor && datasFeitas(junto).size && await CONTAS.ativarConvidado(eu)) await marcoDoSemeador(conta.convidadoPor);
          json(res, 200, { ok: true });
        } catch (e) {
          json(res, 400, { erro: e.message });
        }
        return;
      }
      json(res, 405, { erro: 'método não suportado' });
      return;
    }

    // ---------- amigos ----------
    if (rota.startsWith('/api/') && ['/api/amigos', '/api/procurar', '/api/amizade', '/api/convites',
      '/api/convites/aceitar', '/api/convites/cancelar', '/api/toques', '/api/cutucar', '/api/denuncias',
      '/api/novidades', '/api/novidades/reagir', '/api/novidades/preferencia', '/api/propositos',
      '/api/discipulado', '/api/cuidado'].includes(rota)) {
      if (!conta) { json(res, 403, { erro: 'entre com uma conta' }); return; }
    }

    if (rota === '/api/amigos') {
      const completo = CONTAS.perfilCompleto(conta);
      const hojeEu = hojeDe(eu);
      const listas = CONTAS.listas(eu);
      const meu = await diaDe(eu, hojeEu);
      const nomeDe = (u) => ({ usuario: u, nome: (CONTAS.achar(u) || {}).nome || u });

      const amigos = [];
      for (const { usuario, aceitaEm } of listas.amigos) {
        const outra = CONTAS.achar(usuario);
        const hojeEle = hojeNoFuso(outra.fuso);
        const referencia = hojeEle < hojeEu ? hojeEle : hojeEu;
        const dele = await diaDe(usuario, referencia);
        const euRef = referencia === hojeEu ? meu : await diaDe(eu, referencia);
        // A contagem da amizade é a do propósito de leitura em dupla que nasce com ela.
        const dupla = CONTAS.duplaPlano(eu, usuario);
        const dias = diasDeProposito(euRef, dele, dupla ? dupla.criadoEm : aceitaEm, referencia);
        // A missão da semana: dias, desde segunda, em que os dois fizeram a lição.
        const segunda = somaDias(referencia, -((new Date(referencia + 'T12:00:00Z').getUTCDay() + 6) % 7));
        let juntos = 0;
        for (let d = segunda; d <= referencia; d = somaDias(d, 1)) if (euRef.feitas.has(d) && dele.feitas.has(d)) juntos++;
        amigos.push({
          ...resumoDeAmigo(outra, dele.estado, hojeEle),
          dias,
          semana: { desde: segunda, dias: juntos },
          toqueEnviado: CONTAS.toqueEnviado(eu, usuario, hojeEu),
        });
        // Marco de propósito vira novidade só da dupla, uma vez por marco.
        if (MARCOS_PROPOSITO.includes(dias)) {
          const [a, b] = [eu, usuario].sort();
          await NOVIDADES.publicar(a, 'proposito', { com: b, dias }, 'proposito:' + a + '|' + b + ':' + dias + ':' + aceitaEm);
        }
      }
      amigos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      // Quem esta pessoa acompanha no Conhecer Jesus: só o número de dias terminados e a
      // data mais recente, nunca o que a outra pessoa escreveu.
      const acompanhando = [];
      for (const c of CONTAS.lista()) {
        if (c.acompanhadoPor !== eu || c.caminho !== 'conhecer') continue;
        const conhecidos = ((await lerEstado(arquivoDe(c.usuario))) || {}).conhecidos || {};
        const datas = Object.values(conhecidos).filter(Boolean).sort();
        const dia = datas.length;
        // "pediuConversa" (a data de "Quero conversar") liga o botão de convidar para o
        // acompanhamento na fé (Fase 3), sem expor o que a pessoa escreveu.
        acompanhando.push({
          usuario: c.usuario, nome: c.nome, dia, ultimo: datas[datas.length - 1] || '', terminou: dia >= 14,
          pediuConversa: c.conversouEm || '',
        });
      }
      acompanhando.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      json(res, 200, {
        perfilCompleto: completo,
        consentimento: CONTAS.consentiu(conta),
        motivos: MOTIVOS_DENUNCIA,
        eu: { ...resumoDeAmigo(conta, meu.estado, hojeEu) },
        amigos,
        recebidos: listas.recebidos.map(nomeDe),
        enviados: listas.enviados.map(nomeDe),
        bloqueados: listas.bloqueados.map(nomeDe),
        toques: CONTAS.toquesRecebidos(eu, hojeEu).map(nomeDe),
        convitesProposito: CONTAS.propositosDe(eu).filter((p) => p.membros.some((m) => m.usuario === eu && m.estado === 'convidado')).length,
        acompanhando,
        pedidosConversa: await Promise.all(CONTAS.pedidosConversaPara(eu, hojeEu).map(async (p) => ({ ...p, nome: await nomeDeExibicao(p.usuario) }))),
      });
      return;
    }

    if (rota === '/api/procurar') {
      json(res, 200, { achado: CONTAS.procurar(eu, url.searchParams.get('q') || '') });
      return;
    }

    const acao = async (fazer) => {
      if (!post) { json(res, 405, { erro: 'método não suportado' }); return; }
      try {
        const resposta = await fazer(await lerJson(req));
        json(res, 200, { ok: true, ...(resposta || {}) });
      } catch (e) {
        json(res, e.codigo || 400, { erro: e.publico ? e.message : 'não deu certo agora' });
      }
    };

    // O "Concordo" da folha de consentimento sobre dado de fé (LGPD art. 11).
    if (rota === '/api/consentimento') {
      if (!exigir(conta, 403, 'entre com uma conta')) return;
      await acao(async () => { await CONTAS.registrarConsentimento(eu); return {}; });
      return;
    }

    if (rota === '/api/amizade') {
      await acao(async ({ acao: qual, usuario }) => {
        const outro = limparNome(usuario);
        const hoje = hojeDe(eu);
        const referencia = (() => {
          const o = CONTAS.achar(outro);
          const h = o ? hojeNoFuso(o.fuso) : hoje;
          return h < hoje ? h : hoje;
        })();
        if (qual === 'pedir') {
          const antes = CONTAS.relacao(eu, outro);
          const relacao = await CONTAS.pedir(eu, outro, referencia);
          // Só o pedido novo avisa; pedir de novo, ou pedir a quem bloqueou, não dispara nada.
          if (antes === 'nenhuma' && relacao === 'enviado' && !CONTAS.algumBloqueio(eu, outro)) {
            semEsperar(avisoSocial(outro, 'pedido', { amigo: await nomeDeExibicao(eu), amigoUsuario: eu }));
          }
          if (antes === 'recebido' && relacao === 'amigos') semEsperar(avisoSocial(outro, 'aceito', { amigo: await nomeDeExibicao(eu), amigoUsuario: eu }));
          return { relacao };
        }
        if (qual === 'aceitar') {
          await CONTAS.aceitar(eu, outro, referencia);
          await NOVIDADES.publicar(eu, 'novoProposito', { com: outro }, 'novo:' + [eu, outro].sort().join('|') + ':' + referencia);
          semEsperar(avisoSocial(outro, 'aceito', { amigo: await nomeDeExibicao(eu), amigoUsuario: eu }));
          return {};
        }
        if (qual === 'recusar') { await CONTAS.recusar(eu, outro); return {}; }
        if (qual === 'cancelar') { await CONTAS.cancelar(eu, outro); return {}; }
        if (qual === 'desfazer') { await CONTAS.desfazer(eu, outro); return {}; }
        if (qual === 'bloquear') { await CONTAS.bloquear(eu, outro); return {}; }
        if (qual === 'desbloquear') { await CONTAS.desbloquear(eu, outro); return {}; }
        if (qual === 'silenciar' || qual === 'ouvir') { await CONTAS.silenciar(eu, outro, qual === 'silenciar'); return {}; }
        const e = new Error('ação desconhecida'); e.publico = true; throw e;
      });
      return;
    }

    // ---------- propósitos ----------
    if (rota === '/api/propositos' && req.method === 'GET') {
      const lista = [];
      for (const p of CONTAS.propositosDe(eu)) {
        const retrato = await retratoDoProposito(p, eu);
        lista.push(retrato);
        // Marco de grupo vira novidade só de quem está nele, uma vez por marco.
        if (p.grupo && MARCOS_PROPOSITO.includes(retrato.dias)) {
          const membros = retrato.membros.filter((m) => m.estado === 'ativo').map((m) => m.usuario);
          await NOVIDADES.publicar(p.criadoPor, 'propositoGrupo', { id: p.id, titulo: p.titulo, dias: retrato.dias, membros }, 'grupo:' + p.id + ':' + retrato.dias);
        }
      }
      lista.sort((a, b) => (b.euConvidado - a.euConvidado) || (b.dias - a.dias) || a.titulo.localeCompare(b.titulo, 'pt-BR'));
      json(res, 200, { propositos: lista, tipos: TIPOS_DE_PROPOSITO, limiteGrupo: LIMITE_GRUPO, limiteCelula: LIMITE_CELULA, livros: TODOS_LIVROS });
      return;
    }

    if (rota === '/api/propositos') {
      await acao(async ({ acao: qual, id, tipo, alvo, titulo, com, usuario }) => {
        const hoje = hojeDe(eu);
        if (qual === 'criar') {
          const p = await CONTAS.criarProposito(eu, { tipo, alvo, titulo, com }, hoje, TODOS_LIVROS);
          const nome = await nomeDeExibicao(eu);
          for (const m of p.membros) {
            if (m.estado === 'convidado') semEsperar(avisoSocial(m.usuario, 'propositoConvite', { amigo: nome, titulo: p.titulo, id: p.id }));
          }
          return { proposito: await retratoDoProposito(p, eu) };
        }
        if (qual === 'aceitar' || qual === 'recusar') {
          const p = await CONTAS.responderProposito(eu, id, qual === 'aceitar', hoje);
          // Quem chamou fica sabendo que a pessoa entrou (recusa não avisa ninguém).
          if (qual === 'aceitar') {
            const m = p.membros.find((x) => x.usuario === eu);
            const quem = (m && m.convidadoPor) || p.criadoPor;
            if (quem && quem !== eu) semEsperar(avisoSocial(quem, 'propositoAceito', { amigo: await nomeDeExibicao(eu), titulo: p.titulo, id: p.id }));
          }
          return {};
        }
        if (qual === 'convidar') {
          const p = await CONTAS.convidarParaProposito(eu, id, usuario);
          semEsperar(avisoSocial(limparNome(usuario), 'propositoConvite', { amigo: await nomeDeExibicao(eu), titulo: p.titulo, id: p.id }));
          return {};
        }
        if (qual === 'sair') { await CONTAS.sairDoProposito(eu, id, hoje); return {}; }
        if (qual === 'encerrar') { await CONTAS.encerrarProposito(eu, id, hoje); return {}; }
        throw Object.assign(new Error('ação desconhecida'), { publico: true });
      });
      return;
    }

    if (rota === '/api/celula') {
      await acao(async ({
        acao: qual, id, titulo, token, dia, texto, usuario, estudo, ref, acolhida, adoracao, testemunho,
        visitante, sim, data, presentes, visitantes, semEncontro, auxiliar, pessoas,
      }) => {
        const hoje = hojeDe(eu);
        if (qual === 'criar') {
          const p = await CONTAS.criarCelula(eu, { titulo }, hoje);
          return { proposito: await retratoDoProposito(p, eu) };
        }
        if (qual === 'link') {
          const gerado = CONTAS.gerarLinkCelula(eu, id, assinar);
          const origem = enderecoPublico(req);
          return { link: origem + '/?celula=' + gerado.token, venceEm: gerado.venceEm };
        }
        if (qual === 'entrar') {
          const r = await CONTAS.entrarNaCelula(eu, String(token || ''), assinar, hoje, Date.now(), { visitante: !!visitante });
          if (!r.ja) await avisarEntradaNaCelula(eu, r, hoje);
          return { ja: !!r.ja, id: r.proposito.id, titulo: r.proposito.titulo, papel: r.papel || '' };
        }
        if (qual === 'tornarMembro') { await CONTAS.tornarMembro(eu, id, hoje); return {}; }
        if (qual === 'auxiliar') { await CONTAS.definirAuxiliar(eu, id, usuario, !!sim); return {}; }
        if (qual === 'encontro') { await CONTAS.definirEncontro(eu, id, dia); return {}; }
        if (qual === 'recado') { await CONTAS.definirRecado(eu, id, texto); return {}; }
        if (qual === 'estudo') { await CONTAS.definirEstudo(eu, id, { tipo: estudo, ref, texto, acolhida, adoracao, testemunho }, TODOS_LIVROS); return {}; }
        if (qual === 'registrarEncontro') { await CONTAS.registrarEncontro(eu, id, { data, presentes, visitantes, semEncontro }, hoje); return {}; }
        if (qual === 'remover') { await CONTAS.removerDaCelula(eu, id, usuario, hoje); return {}; }
        if (qual === 'multiplicar') {
          const r = await CONTAS.multiplicarCelula(eu, id, { auxiliar, titulo, pessoas }, hoje);
          const nomeNovoLider = await nomeDeExibicao(r.filha.criadoPor);
          for (const alvo of r.movidos) {
            semEsperar(avisoSocial(alvo, 'celulaMultiplicada', { filha: r.filha.titulo, novoLider: nomeNovoLider, id: r.filha.id }));
          }
          return { id: r.filha.id, titulo: r.filha.titulo };
        }
        throw Object.assign(new Error('ação desconhecida'), { publico: true });
      });
      return;
    }

    // ---------- discipulado ----------
    // O último encontro de uma relação: a data mais recente, ou vazio se ainda não houve.
    const ultimoEncontroDiscipulado = (x) => (x.encontros.length ? x.encontros[x.encontros.length - 1] : '');

    if (rota === '/api/discipulado' && req.method === 'GET') {
      let meuDiscipulador = null;
      const meuAtivo = CONTAS.meuDiscipuladorAtivo(eu);
      if (meuAtivo) {
        const outro = CONTAS.achar(meuAtivo.discipulador);
        if (outro) {
          meuDiscipulador = {
            id: meuAtivo.id, usuario: outro.usuario, nome: outro.nome, desde: meuAtivo.aceitoEm,
            mostrar: meuAtivo.mostrar, ultimoEncontro: ultimoEncontroDiscipulado(meuAtivo),
          };
        }
      }

      // O que cada discípulo mostra: nunca o que a pessoa escreveu, só números e datas.
      const meusDiscipulos = [];
      for (const x of CONTAS.discipulosAtivosDe(eu)) {
        const outro = CONTAS.achar(x.discipulo);
        if (!outro) continue;
        const estado = await lerEstado(arquivoDe(x.discipulo));
        const referencia = hojeNoFuso(outro.fuso);
        // São 12 Primeiros passos: o teto evita número estranho se a lista trouxer repetição.
        const passos = Math.min(12, new Set((estado && estado.licoes) || []).size);
        const semana = diasLidosNaSemana(datasFeitas(estado), referencia);
        const acompanha = CONTAS.discipulosAtivosDe(x.discipulo).length;
        meusDiscipulos.push({
          id: x.id, usuario: outro.usuario, nome: outro.nome, desde: x.aceitoEm, ultimoEncontro: ultimoEncontroDiscipulado(x),
          // O último check-in, se for desta semana: um estado de dias atrás já não diz nada.
          ...resumoParaDiscipulador({ mostrar: x.mostrar, passos, semana, marcos: outro.marcos, acompanha,
            checkin: ((c) => (c && c.data >= somaDias(referencia, -6) ? c : null))(CONTAS.ultimoCheckin(x.discipulo)) }),
        });
      }
      meusDiscipulos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      // Convites recebidos: "de" é quem pediu, e o papel é o que "de" escolheu para si mesmo
      // ("quero te acompanhar" = de vira discipulador; "quero que você me acompanhe" = discípulo).
      const pedidos = [];
      for (const x of CONTAS.discipuladosDe(eu)) {
        if (x.estado !== 'convidado' || x.pediu === eu) continue;
        const de = CONTAS.achar(x.pediu);
        if (!de) continue;
        pedidos.push({ id: x.id, de: { usuario: de.usuario, nome: de.nome }, papel: x.pediu === x.discipulador ? 'discipulador' : 'discipulo' });
      }

      // Resumo leve para a barra de abas: existe algum vínculo, ativo ou só convidado, de
      // qualquer lado (inclusive um convite que eu mandei e ainda não foi aceito, que não
      // aparece em nenhuma das listas acima).
      const algumVinculo = CONTAS.discipuladosDe(eu).some((x) => x.estado === 'ativo' || x.estado === 'convidado');
      const meuCheckin = CONTAS.ultimoCheckin(eu);
      json(res, 200, { meuDiscipulador, meusDiscipulos, pedidos, marcos: conta.marcos || {}, algumVinculo, meuCheckin });
      return;
    }

    if (rota === '/api/discipulado') {
      await acao(async ({ acao: qual, id, usuario, papel, mostrar, data, chave, corpo, mente, espirito }) => {
        const hoje = hojeDe(eu);
        if (qual === 'checkin') return { checkin: await CONTAS.registrarCheckin(eu, hoje, { corpo, mente, espirito }) };
        if (qual === 'convidar') {
          const outro = limparNome(usuario);
          const x = await CONTAS.convidarDiscipulado(eu, outro, papel, hoje);
          semEsperar(avisoSocial(outro, 'discipuladoConvite', { amigo: await nomeDeExibicao(eu), amigoUsuario: eu }));
          return { id: x.id };
        }
        if (qual === 'aceitar') {
          const x = await CONTAS.aceitarDiscipulado(eu, id, mostrar, hoje);
          semEsperar(avisoSocial(x.pediu, 'discipuladoAceito', { amigo: await nomeDeExibicao(eu), amigoUsuario: eu }));
          return {};
        }
        if (qual === 'recusar') { await CONTAS.recusarDiscipulado(eu, id); return {}; }
        if (qual === 'mostrar') { await CONTAS.definirMostrarDiscipulado(eu, id, mostrar); return {}; }
        if (qual === 'encontro') { await CONTAS.registrarEncontroDiscipulado(eu, id, data, hoje); return {}; }
        if (qual === 'encerrar') { await CONTAS.encerrarDiscipulado(eu, id, hoje); return {}; }
        if (qual === 'marco') { const marcos = await CONTAS.definirMarco(eu, chave, data); return { marcos }; }
        throw Object.assign(new Error('ação desconhecida'), { publico: true });
      });
      return;
    }

    // ---------- cuidado mútuo (Atos 2.42; 2.44-45) ----------
    // Sem chat: o pedido é do autor, os outros só reagem com um gesto sem texto. Nunca vai
    // para o Feed, nunca vale XP, e visitante (só está conhecendo) não vê nem cria.
    if (rota === '/api/cuidado' && req.method === 'GET') {
      const celulaId = url.searchParams.get('celula') || '';
      const p = CONTAS.proposito(celulaId);
      if (!p || p.encerradoEm || !p.celula) { json(res, 404, { erro: 'célula não encontrada' }); return; }
      if (!CONTAS.membroDeCuidado(p, eu)) { json(res, 403, { erro: 'só quem participa da célula vê os pedidos' }); return; }
      const hoje = hojeDe(eu);
      await CONTAS.limparPedidosVencidos(hoje);
      const conduz = podeConduzir(p, eu);
      const todos = CONTAS.pedidosDaCelula(p.id);
      const nomeDe = (u) => { const c = CONTAS.achar(u); return (c && c.nome) || u; };
      const pedidos = [];
      for (const r of todos) {
        if (!pedidoVisivelPara(r, { usuario: eu, hoje, conduz })) continue;
        const meu = r.autor === eu;
        const item = {
          id: r.id, autor: { usuario: r.autor, nome: nomeDe(r.autor) }, tipo: r.tipo, destino: r.destino,
          texto: r.texto, criadoEm: r.criadoEm, venceEm: r.venceEm, meu,
          oreiHoje: jaOrouHoje(r, eu, hoje), ajudei: jaAjudou(r, eu),
        };
        // Só o autor vê o próprio pedido depois de "Deus respondeu": ele precisa saber que já marcou.
        if (meu) item.respondido = r.estado === 'respondido';
        if (meu) item.gestos = gestosParaAutor(r).map((g) => ({ usuario: g.usuario, nome: nomeDe(g.usuario), gesto: g.gesto, data: g.data }));
        pedidos.push(item);
      }
      pedidos.sort((a, b) => (b.meu - a.meu) || b.criadoEm.localeCompare(a.criadoEm));
      const resposta = { pedidos, motivos: MOTIVOS_DENUNCIA_PEDIDO };
      if (conduz) {
        resposta.denuncias = todos.filter((r) => r.estado !== 'removido' && r.denuncias.length > 0).map((r) => ({
          pedido: r.id, texto: r.texto, autor: nomeDe(r.autor),
          motivos: [...new Set(r.denuncias.map((n) => n.motivo))], total: r.denuncias.length,
        }));
      }
      json(res, 200, resposta);
      return;
    }

    if (rota === '/api/cuidado') {
      await acao(async ({ acao: qual, id, celula, tipo, destino, texto, dias, motivo, manter }) => {
        const hoje = hojeDe(eu);
        if (qual === 'criar') {
          const r = await CONTAS.criarPedido(eu, { celula, tipo, destino, texto, dias }, hoje);
          // Só quem conduz é avisado, e só quando o pedido é reservado para eles: a célula
          // inteira nunca recebe push a cada pedido novo.
          if (r.destino === 'conduz') {
            const p = CONTAS.proposito(celula);
            if (p) {
              const nome = await nomeDeExibicao(eu);
              const alvos = new Set([p.criadoPor]);
              for (const m of p.membros) if (m.estado === 'ativo' && m.papel === 'auxiliar') alvos.add(m.usuario);
              alvos.delete(eu);
              // "celula" vai junto para o toque na notificação abrir direto na aba Oração.
              for (const alvo of alvos) semEsperar(avisoSocial(alvo, 'pedidoConduz', { amigo: nome, celula: p.id }));
            }
          }
          return { id: r.id };
        }
        const r = CONTAS.pedido(id);
        if (!r) { const e = new Error('pedido não encontrado'); e.publico = true; e.codigo = 404; throw e; }
        if (qual === 'orei') { await CONTAS.orarPorPedido(eu, id, hoje); return {}; }
        if (qual === 'ajudo') {
          // Só avisa na primeira vez: chamar de novo (idempotente) não pode reenviar o push.
          const jaTinhaAjudado = jaAjudou(r, eu);
          await CONTAS.ajudarPedido(eu, id, hoje);
          if (!jaTinhaAjudado) semEsperar(avisoSocial(r.autor, 'possoAjudar', { amigo: await nomeDeExibicao(eu), celula: r.celula }));
          return {};
        }
        if (qual === 'respondido') { await CONTAS.marcarRespondido(eu, id, hoje); return {}; }
        if (qual === 'apagar') { await CONTAS.apagarPedido(eu, id); return {}; }
        if (qual === 'denunciar') {
          // Idem: denunciar de novo (a mesma pessoa só denuncia uma vez) não reenvia o aviso.
          const jaTinhaDenunciado = r.denuncias.some((n) => n.usuario === eu);
          await CONTAS.denunciarPedido(eu, id, motivo);
          // "Alguém pode estar em perigo" avisa quem conduz na hora, sem esperar a segunda denúncia.
          if (motivo === MOTIVO_PERIGO && !jaTinhaDenunciado) {
            const p = CONTAS.proposito(r.celula);
            if (p) {
              const alvos = new Set([p.criadoPor]);
              for (const m of p.membros) if (m.estado === 'ativo' && m.papel === 'auxiliar') alvos.add(m.usuario);
              for (const alvo of alvos) semEsperar(avisoSocial(alvo, 'denunciaPerigo', { celula: p.id }));
            }
          }
          return {};
        }
        if (qual === 'decidir') { await CONTAS.decidirPedido(eu, id, !!manter); return {}; }
        throw Object.assign(new Error('ação desconhecida'), { publico: true });
      });
      return;
    }

    if (rota === '/api/convites') {
      await acao(async ({ modo } = {}) => {
        const { token, venceEm } = CONTAS.gerarConvite(eu, assinar, Date.now(), { modo });
        const origem = enderecoPublico(req);
        return { link: origem + '/?convite=' + token, venceEm };
      });
      return;
    }

    if (rota === '/api/convites/aceitar') {
      await acao(async ({ token }) => {
        const dono = (CONTAS.lerConvite(token, assinar) || {}).de;
        const h = dono ? hojeDe(dono) : hojeDe(eu);
        const referencia = h < hojeDe(eu) ? h : hojeDe(eu);
        const usado = await CONTAS.usarConvite(eu, token, assinar, referencia);
        if (!usado.ja) await NOVIDADES.publicar(eu, 'novoProposito', { com: usado.de }, 'novo:' + [eu, usado.de].sort().join('|') + ':' + referencia);
        if (!usado.ja) semEsperar(avisoSocial(usado.de, 'aceito', { amigo: await nomeDeExibicao(eu), amigoUsuario: eu }));
        return usado;
      });
      return;
    }

    if (rota === '/api/convites/cancelar') {
      await acao(async () => { await CONTAS.cancelarConvites(eu); return {}; });
      return;
    }

    // "Quero conversar com alguém", do Conhecer Jesus: avisa só quem convidou e, se
    // houver, o líder da célula da pessoa. Nunca vai para o Feed, e no máximo uma vez
    // por dia (a segunda chamada do mesmo dia só confirma, sem mandar de novo).
    if (rota === '/api/conhecer/conversar') {
      await acao(async () => {
        const r = await CONTAS.pedirConversa(eu, hojeDe(eu));
        if (r.ja) return { ja: true };
        const nome = await nomeDeExibicao(eu);
        const destinos = new Set([r.de]);
        for (const p of CONTAS.propositosDe(eu)) if (p.celula && p.criadoPor) destinos.add(p.criadoPor);
        await CONTAS.registrarPedidoConversa(eu, 'conhecer', [...destinos], hojeDe(eu));
        for (const destino of destinos) semEsperar(avisoSocial(destino, 'querConversar', { nome, deUsuario: eu }));
        return {};
      });
      return;
    }

    // "Já conversamos": tira o pedido da lista de quem tocou (os outros avisados decidem por si).
    if (rota === '/api/conversa/feita') {
      await acao(async ({ usuario, tipo }) => {
        await CONTAS.marcarConversaFeita(eu, String(usuario || ''), String(tipo || ''), hojeDe(eu));
        return {};
      });
      return;
    }

    // "Quero conversar sobre o batismo", da lição 3 dos Primeiros passos: avisa quem acompanha a
    // pessoa no app (quem convidou, o líder das células em que ela está e quem faz discipulado
    // com ela). Só o aviso, nunca o que ela escreveu. A resposta diz quem recebeu e quem não
    // pôde receber agora (sem notificação ligada ou fora do horário), para ela procurar pessoalmente.
    if (rota === '/api/batismo/conversar') {
      await acao(async () => {
        const conta = CONTAS.achar(eu);
        const destinos = new Set([conta.acompanhadoPor, conta.convidadoPor].filter(Boolean));
        for (const p of CONTAS.propositosDe(eu)) {
          if (p.celula && p.criadoPor && p.membros.some((m) => m.usuario === eu && m.estado === 'ativo')) destinos.add(p.criadoPor);
        }
        for (const x of Object.values(CONTAS.dados.discipulados || {})) if (x.estado === 'ativo' && x.discipulo === eu) destinos.add(x.discipulador);
        destinos.delete(eu);
        for (const d of [...destinos]) if (!CONTAS.achar(d) || CONTAS.algumBloqueio(eu, d)) destinos.delete(d);
        if (!destinos.size) return { ninguem: true };
        if (conta.batismoConversaEm === hojeDe(eu)) return { ja: true };
        await CONTAS.anotarConversaBatismo(eu, hojeDe(eu));
        await CONTAS.registrarPedidoConversa(eu, 'batismo', [...destinos], hojeDe(eu));
        const nome = await nomeDeExibicao(eu);
        const avisados = [];
        const noApp = [];
        for (const d of destinos) {
          const saiu = await avisoSocial(d, 'querBatismo', { nome, deUsuario: eu }).catch(() => false);
          (saiu ? avisados : noApp).push(await nomeDeExibicao(d));
        }
        return { avisados, noApp };
      });
      return;
    }

    if (rota === '/api/toques') {
      await acao(async ({ para }) => {
        const outro = CONTAS.achar(para);
        const hojeEu = hojeDe(eu);
        const euLeu = (await diaDe(eu, hojeEu)).feitas.has(hojeEu);
        const eleLeu = outro ? (await diaDe(outro.usuario, hojeNoFuso(outro.fuso))).feitas.has(hojeNoFuso(outro.fuso)) : false;
        const resultado = await CONTAS.tocar(eu, para, { hoje: hojeEu, euLeu, eleLeu });
        // Todo toque aceito vira notificação, inclusive o segundo do mesmo dia ("ja").
        if (resultado === 'enviado' || resultado === 'ja') semEsperar(avisoSocial(outro.usuario, 'toque', { amigo: await nomeDeExibicao(eu) }));
        return { resultado };
      });
      return;
    }

    // ---------- desafio de consagração em grupo (desafios-grupo.mjs) ----------
    // Os grupos em que a pessoa pode fazer um desafio junto: as células de que participa de
    // verdade (visitante fica de fora) e os discipulados ativos, dos dois lados. Na célula só
    // quem conduz começa; na dupla, qualquer um dos dois.
    const gruposDeDesafio = async () => {
      const grupos = [];
      for (const p of CONTAS.propositosDe(eu)) {
        if (!p.celula || p.encerradoEm || !membroDeVerdade(p.membros.find((m) => m.usuario === eu))) continue;
        grupos.push({ tipo: 'celula', grupo: p.id, nome: p.titulo, podeIniciar: podeConduzir(p, eu),
          membros: p.membros.filter(membroDeVerdade).map((m) => m.usuario) });
      }
      for (const x of CONTAS.discipuladosDe(eu)) {
        if (x.estado !== 'ativo') continue;
        const outro = x.discipulador === eu ? x.discipulo : x.discipulador;
        grupos.push({ tipo: 'discipulado', grupo: x.id, nome: 'Você e ' + await nomeDeExibicao(outro), podeIniciar: true,
          membros: [x.discipulador, x.discipulo] });
      }
      return grupos;
    };

    if (rota === '/api/desafios-grupo' && req.method === 'GET') {
      const hoje = hojeDe(eu);
      const grupos = [];
      for (const g of await gruposDeDesafio()) {
        const aberto = CONTAS.desafiosDoGrupo(g.tipo, g.grupo).find((x) => desafioVisivel(x, hoje)) || null;
        let desafio = null;
        if (aberto) {
          const membros = [];
          for (const u of g.membros) {
            const c = CONTAS.achar(u);
            if (!c) continue;
            const estado = (await lerEstado(arquivoDe(u))) || {};
            const p = progressoNoGrupo({ desafio: aberto.desafio, inicio: aberto.inicio, hoje: hojeNoFuso(c.fuso), registro: (estado.desafios || {})[aberto.desafio] });
            membros.push({ usuario: u, nome: estado.apelido || c.nome || u, foto: estado.foto || '', eu: u === eu, ...p });
          }
          // Quem já entrou primeiro (e, entre eles, quem venceu mais dias); quem não entrou, no fim.
          membros.sort((a, b) => (b.entrou - a.entrou) || (b.vencidos - a.vencidos) || a.nome.localeCompare(b.nome, 'pt-BR'));
          desafio = {
            id: aberto.id, desafio: aberto.desafio, titulo: DESAFIOS_GRUPO[aberto.desafio].titulo, dias: DESAFIOS_GRUPO[aberto.desafio].dias,
            inicio: aberto.inicio, fim: fimDoDesafio(aberto.inicio, aberto.desafio), dia: diaDoGrupo(aberto.inicio, aberto.desafio, hoje),
            criadoPor: aberto.criadoPor, podeEncerrar: g.podeIniciar || aberto.criadoPor === eu, membros,
          };
        }
        grupos.push({ tipo: g.tipo, grupo: g.grupo, nome: g.nome, podeIniciar: g.podeIniciar, pessoas: g.membros.length, desafio });
      }
      json(res, 200, { grupos });
      return;
    }

    if (rota === '/api/desafios-grupo') {
      await acao(async ({ acao: qual, tipo, grupo, desafio, id }) => {
        const hoje = hojeDe(eu);
        const g = (await gruposDeDesafio()).find((x) => x.tipo === tipo && x.grupo === String(grupo || ''));
        if (!TIPOS_GRUPO.includes(tipo) || !g) throw Object.assign(new Error('grupo não encontrado'), { publico: true, codigo: 404 });
        const abertos = CONTAS.desafiosDoGrupo(g.tipo, g.grupo).filter((x) => desafioVisivel(x, hoje));
        if (qual === 'iniciar') {
          if (!g.podeIniciar) throw Object.assign(new Error('na célula, quem começa o desafio é quem conduz'), { publico: true, codigo: 403 });
          if (!DESAFIOS_GRUPO[desafio]) throw Object.assign(new Error('desafio desconhecido'), { publico: true });
          if (abertos.length) throw Object.assign(new Error('o grupo já está num desafio: encerre antes de começar outro'), { publico: true, codigo: 409 });
          const novo = await CONTAS.iniciarDesafioDoGrupo({ tipo: g.tipo, grupo: g.grupo, desafio, inicio: hoje, criadoPor: eu });
          const quem = await nomeDeExibicao(eu);
          for (const u of g.membros) {
            if (u !== eu) semEsperar(avisoSocial(u, 'desafioGrupo', { amigo: quem, amigoUsuario: eu, titulo: DESAFIOS_GRUPO[desafio].titulo, grupo: g.tipo === 'celula' ? g.nome : '' }));
          }
          return { id: novo };
        }
        if (qual === 'encerrar') {
          const x = abertos.find((a) => a.id === String(id || ''));
          if (!x) throw Object.assign(new Error('desafio não encontrado'), { publico: true, codigo: 404 });
          if (!g.podeIniciar && x.criadoPor !== eu) throw Object.assign(new Error('só quem conduz encerra o desafio da célula'), { publico: true, codigo: 403 });
          await CONTAS.encerrarDesafioDoGrupo(x.id, hoje);
          return {};
        }
        throw Object.assign(new Error('ação desconhecida'), { publico: true });
      });
      return;
    }

    // Cutucada com tema: café, oração ou treino, para um amigo. Uma de cada tema por dia
    // para a mesma pessoa (a conta fica em memória: reiniciar o servidor só libera de novo).
    if (rota === '/api/cutucar') {
      await acao(async ({ para, tema }) => {
        const TEMAS = { cafe: 'cutucadaCafe', oracao: 'cutucadaOracao', treino: 'cutucadaTreino' };
        if (!TEMAS[tema]) throw Object.assign(new Error('escolha café, oração ou treino'), { publico: true });
        const outro = CONTAS.achar(String(para || ''));
        if (!outro || CONTAS.relacao(eu, outro.usuario) !== 'amigos') throw Object.assign(new Error('só dá para chamar um amigo'), { publico: true, codigo: 403 });
        const chave = eu + '>' + outro.usuario + '>' + tema + '>' + hojeDe(eu);
        if (CUTUCADAS.has(chave)) return { resultado: 'ja' };
        CUTUCADAS.add(chave);
        if (CUTUCADAS.size > 20000) CUTUCADAS.clear();
        semEsperar(avisoSocial(outro.usuario, TEMAS[tema], { amigo: await nomeDeExibicao(eu), amigoUsuario: eu }));
        return { resultado: 'enviado' };
      });
      return;
    }

    if (rota === '/api/denuncias') {
      await acao(async ({ usuario, motivo }) => { await CONTAS.denunciar(eu, usuario, motivo); return {}; });
      return;
    }

    // ---------- novidades ----------
    // O mural: marcos que o servidor confere no progresso de quem publica, e as reações.
    const amigosDe = (u) => new Set(CONTAS.listas(u).amigos.map((a) => a.usuario));

    if (rota === '/api/novidades' && req.method === 'GET') {
      const amigos = amigosDe(eu);
      const pessoas = new Map();
      const pessoa = async (u) => {
        if (!u) return null;
        if (!pessoas.has(u)) {
          const c = CONTAS.achar(u);
          const estado = c ? await lerEstado(arquivoDe(u)) : null;
          pessoas.set(u, c ? { usuario: c.usuario, nome: (estado && estado.apelido) || c.nome || c.usuario, foto: (estado && estado.foto) || '' } : null);
        }
        return pessoas.get(u);
      };
      const eventos = [];
      for (const ev of NOVIDADES.mural(eu, amigos)) {
        const outro = ev.autor === eu ? (ev.dados || {}).com : ev.autor;
        // novidade de dupla com quem deixou de ser amigo some do mural
        if (DE_DUPLA.has(ev.tipo) && !amigos.has(outro)) continue;
        const autor = await pessoa(ev.autor);
        if (!autor) continue;
        const quem = [];
        for (const u of ev.reacoes) {
          if (u !== eu && !amigos.has(u)) continue;
          const p = await pessoa(u);
          if (p) quem.push(u === eu ? 'você' : p.nome);
        }
        eventos.push({
          id: ev.id, tipo: ev.tipo, dados: ev.dados, em: ev.em, autor,
          com: (ev.dados || {}).com ? await pessoa(ev.dados.com) : null,
          total: ev.reacoes.length, euReagi: ev.reacoes.includes(eu), quem,
        });
      }
      json(res, 200, { ligado: NOVIDADES.compartilha(eu), perguntado: NOVIDADES.perguntou(eu), eventos });
      return;
    }

    if (rota === '/api/novidades') {
      await acao(async ({ tipo, dados }) => {
        const d = dados || {};
        const limpos = {
          ofensiva: () => ({ dias: Number(d.dias) }),
          conquista: () => ({ id: String(d.id || '').slice(0, 20), nivel: Number(d.nivel) }),
          livro: () => ({ livro: String(d.livro || '').slice(0, 30) }),
          unidade: () => ({ numero: Number(d.numero) }),
          versiculo: () => ({ ref: String(d.ref || '').slice(0, 40) }),
        }[tipo];
        if (!limpos) { const e = new Error('tipo de novidade desconhecido'); e.publico = true; throw e; }
        const estado = REGRAS.normalizarEstado(await lerEstado(arquivoDe(eu)));
        const chave = REGRAS.conferirNovidade(tipo, limpos(), estado, hojeDe(eu));
        if (!chave) { const e = new Error('o progresso não confirma essa novidade'); e.publico = true; e.codigo = 409; throw e; }
        return { publicado: !!(await NOVIDADES.publicar(eu, tipo, limpos(), chave)) };
      });
      return;
    }

    if (rota === '/api/novidades/reagir') {
      await acao(async ({ id }) => NOVIDADES.reagir(eu, String(id || ''), amigosDe(eu)));
      return;
    }

    if (rota === '/api/novidades/preferencia') {
      await acao(async ({ ligado }) => { await NOVIDADES.preferir(eu, !!ligado); return {}; });
      return;
    }

    // ---------- conta ----------
    if (rota === '/api/trocar-senha') {
      if (!exigir(post && conta, 405, 'método não suportado')) return;
      if (!podeTentar(ip, eu)) { json(res, 429, MUITAS); return; }
      const { atual, nova } = await lerJson(req);
      if (!await CONTAS.conferir(eu, atual)) { anotarErro(ip, eu); json(res, 401, { erro: 'a senha atual não confere' }); return; }
      if (String(nova || '') === String(atual || '')) { json(res, 400, { erro: 'a senha nova é igual à atual' }); return; }
      try {
        await CONTAS.trocarSenha(eu, nova);
      } catch (e) {
        json(res, 400, { erro: e.publico ? e.message : 'não consegui trocar a senha' });
        return;
      }
      porCookie(req, res, eu);
      json(res, 200, { ok: true });
      return;
    }

    // Sair dos outros aparelhos: todo crachá antigo deixa de valer; este aparelho ganha um novo.
    if (rota === '/api/sair-dos-outros') {
      if (!exigir(post && conta, 405, 'método não suportado')) return;
      await CONTAS.renovarSessao(eu);
      porCookie(req, res, eu);
      json(res, 200, { ok: true });
      return;
    }

    // ---------- notificações ----------
    // A caixa do sino: os avisos que saíram para a pessoa (push e interações), mais novos antes.
    if (rota === '/api/avisos' && req.method === 'GET') {
      if (!exigir(conta, 403, 'entre com uma conta')) return;
      json(res, 200, { avisos: NOTIFICACOES.caixaDe(eu), naoLidos: NOTIFICACOES.naoLidos(eu) });
      return;
    }
    if (rota === '/api/avisos/lidos') {
      if (!exigir(conta, 403, 'entre com uma conta')) return;
      await acao(async () => { await NOTIFICACOES.marcarLidos(eu); return {}; });
      return;
    }

    if (rota === '/api/notificacoes' && req.method === 'GET') {
      json(res, 200, {
        chave: CHAVES_PUSH.publica,
        preferencias: NOTIFICACOES.preferencias(eu),
        aparelhos: NOTIFICACOES.inscricoesDe(eu).map((i) => i.endpoint),
      });
      return;
    }

    if (rota === '/api/notificacoes/inscrever') {
      await acao(async ({ inscricao }) => {
        const valida = inscricaoValida(inscricao, { permitirLocal: PUSH_TESTE });
        if (!valida) throw Object.assign(new Error('esse aparelho não aceita notificações daqui'), { publico: true });
        await NOTIFICACOES.inscrever(eu, valida);
        return { aparelhos: NOTIFICACOES.inscricoesDe(eu).length };
      });
      return;
    }

    if (rota === '/api/notificacoes/cancelar') {
      await acao(async ({ endpoint }) => { await NOTIFICACOES.cancelar(eu, String(endpoint || '')); return {}; });
      return;
    }

    if (rota === '/api/notificacoes/preferencias') {
      await acao(async (novas) => ({ preferencias: await NOTIFICACOES.definirPreferencias(eu, novas || {}) }));
      return;
    }

    if (rota === '/api/notificacoes/testar') {
      await acao(async () => {
        const mensagem = montarMensagem('teste', {}, { usuario: eu, data: hojeDe(eu) });
        const enviados = await enviarPara(eu, mensagem, { ttl: 600, urgencia: 'high', semCaixa: true });
        if (!enviados) throw Object.assign(new Error('nenhum aparelho recebeu. Ative de novo neste celular'), { publico: true });
        return { enviados };
      });
      return;
    }

    if (rota === '/api/apagar-conta') {
      if (!exigir(post && conta, 405, 'método não suportado')) return;
      if (!podeTentar(ip, eu)) { json(res, 429, MUITAS); return; }
      const { senha } = await lerJson(req);
      if (!await CONTAS.conferir(eu, senha)) { anotarErro(ip, eu); json(res, 401, { erro: 'a senha não confere' }); return; }
      await CONTAS.apagar(eu);
      await NOVIDADES.apagarDe(eu);
      await NOTIFICACOES.apagarDe(eu);
      await apagarProgressoDe(eu);
      limparCookie(res);
      json(res, 200, { ok: true });
      return;
    }

    if (rota.startsWith('/api/')) { json(res, 404, { erro: 'rota desconhecida' }); return; }

    // ---------- arquivos ----------
    // O navegador pede /favicon.ico sozinho, em qualquer página. Sem isto a resposta era
    // a tela de entrada inteira, 120 KB de HTML no lugar de um ícone.
    const pedido = rota === '/' ? 'index.html' : rota === '/favicon.ico' ? 'icone-48.png' : rota;
    let alvo = normalize(join(RAIZ, pedido));
    // RAIZ + separador: só startsWith(RAIZ) deixaria passar uma pasta vizinha como "dist-velho".
    if (alvo !== RAIZ && !alvo.startsWith(RAIZ + sep)) { res.writeHead(403).end('acesso negado'); return; }
    let info = await stat(alvo).catch(() => null);
    if (info && info.isDirectory()) {
      alvo = join(alvo, 'index.html');
      info = await stat(alvo).catch(() => null);
    }
    if (!info) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('não encontrado: rode "node build.mjs" antes de servir');
      return;
    }
    // Quando o build deixou uma versão .gz ao lado (as bíblias), ela vai no lugar do
    // original para quem aceita: no celular longe de casa, 4 MB pesam.
    const aceitaGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    // Um .gz mais velho que o original é sobra de outra versão: vale o original.
    const infoGz = aceitaGzip ? await stat(alvo + '.gz').catch(() => null) : null;
    const comprimido = infoGz && infoGz.mtimeMs >= info.mtimeMs ? await readFile(alvo + '.gz').catch(() => null) : null;
    const corpo = comprimido || await readFile(alvo);
    res.writeHead(200, {
      'content-type': TIPOS[extname(alvo).toLowerCase()] || 'application/octet-stream',
      'content-length': corpo.length,
      // a fonte tem o resumo no nome: o mesmo endereço é sempre o mesmo arquivo
      'cache-control': FONTE_COM_RESUMO.test(rota) ? 'public, max-age=31536000, immutable' : 'no-cache',
      vary: 'accept-encoding',
      ...(comprimido ? { 'content-encoding': 'gzip' } : {}),
    });
    res.end(req.method === 'HEAD' ? undefined : corpo);
  } catch (erro) {
    // O detalhe fica no registro do servidor; quem pediu recebe só que deu errado.
    console.error('  erro em ' + req.method + ' ' + String(req.url).split('?')[0] + ': ' + (erro && erro.stack || erro));
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('erro no servidor');
  }
});

function enderecosDaRede() {
  const saida = [];
  for (const [nome, lista] of Object.entries(networkInterfaces())) {
    for (const i of lista || []) if (i.family === 'IPv4' && !i.internal) saida.push([nome, i.address]);
  }
  return saida;
}

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log('\n  Geração Eleita\n');
  console.log('  neste computador:   http://localhost:' + PORTA);
  const redes = enderecosDaRede();
  if (redes.length) {
    console.log('\n  na mesma rede Wi-Fi:');
    for (const [nome, ip] of redes) console.log(`    http://${ip}:${PORTA}   (${nome})`);
  }
  console.log('\n  contas: ' + CONTAS.lista().length + (ABERTO_PARA_TESTE ? ' · modo aberto de teste' : ''));
  console.log('  Ctrl+C para parar.\n');
});

// Uma rodada de lembretes por minuto. unref: o relógio não segura o processo aberto sozinho.
if (!PUSH_TESTE) {
  setInterval(() => rodadaDeLembretes().catch((e) => console.log('  rodada de lembretes: ' + e.message)), 60 * 1000).unref();
}

// Backup do dia (dados/backup/caminho-AAAA-MM-DD.db, ficam os 14 mais novos): na subida e a
// cada hora. Substitui as cópias .bak.json de cada progresso.
const backupSeDer = () => {
  try {
    const cifrados = cifrarBackupsAbertos(join(PASTA_DADOS, 'backup'));
    if (cifrados) console.log('  backups antigos cifrados: ' + cifrados);
    const feito = backupDoDia(DB, join(PASTA_DADOS, 'backup'), hojeNoFuso(''), Number(process.env.CAMINHO_BACKUP_MANTER) || 14);
    if (feito) console.log('  backup do dia: ' + basename(feito));
  } catch (e) {
    console.log('  backup falhou: ' + e.message);
  }
};
backupSeDer();
setInterval(backupSeDer, 60 * 60 * 1000).unref();

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n  a porta ${PORTA} já está em uso. Tente: node servidor.mjs ${PORTA + 1}\n`);
    process.exit(1);
  }
  throw e;
});
