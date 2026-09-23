// Verificação do conteúdo congelado, do arquivo gerado, das regras de progresso e das
// contas, amizades e propósitos.
// Uso: node teste.mjs
import { readFileSync, existsSync, statSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import { tmpdir } from 'node:os';
import { createHmac } from 'node:crypto';
import { fecharBanco, arquivoDoBanco } from './db.mjs';
import {
  Contas, diasDeProposito, resumoDeAmigo, somaDias, nascimentoValido,
} from './contas.mjs';
import { AJUSTES, notaOculta } from './ferramentas/ajustes-conteudo.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
let falhas = 0;
let contagem = 0;
const checar = (cond, msg) => {
  contagem++;
  if (!cond) { falhas++; console.log('  FALHA  ' + msg); }
};
const secao = (t) => console.log('\n  ' + t);

// =========================================================================
secao('conteúdo congelado');
// =========================================================================
const D = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'conteudo.json'), 'utf8'));

checar(D.plano.length === 365, 'o plano tem 365 dias');
checar(D.plano.every((d, i) => d.numero === i + 1), 'os dias estão em ordem, de 1 a 365');
checar(D.unidades.length === 12, 'há 12 unidades');
checar(D.unidades[0].de === 1 && D.unidades[D.unidades.length - 1].ate === 365, 'as unidades cobrem do dia 1 ao 365');
checar(D.unidades.every((u, i) => i === 0 || u.de === D.unidades[i - 1].ate + 1),
  'as unidades cobrem os dias sem buraco nem sobreposição');
checar(D.licoes.length === 12 && D.licoes.every((id) => D.notas[id]), 'os 12 primeiros passos apontam para notas que existem');
checar(Object.keys(D.notas).length > 500, 'as notas do material vieram inteiras');
checar(D.plano.every((d) => d.antigo || d.novo), 'todo dia tem ao menos uma passagem');

// O que o app mostra fala com o leitor: sem travessão, sem citar o arquivo de notas e sem
// link para páginas de bastidor.
{
  const { notaOculta } = await import('./ferramentas/ajustes-conteudo.mjs');
  const visiveis = Object.keys(D.notas).filter((id) => !notaOculta(D, id));
  // A citação do versículo é o texto da tradução, como ela escreve: o travessão dela fica.
  const textoDe = (n) => [n.nome, n.sub, n.resumo, n.destaque, (n.html || '')
    .replace(/<blockquote data-verso="[^"]*">[\s\S]*?<\/blockquote>/, ' ').replace(/<[^>]+>/g, ' ')].join(' ');
  const comTravessao = visiveis.filter((id) => /[—–]/.test(textoDe(D.notas[id])));
  const citamArquivo = visiveis.filter((id) => /\bvault\b|obsidian|\btemplates?\b|frontmatter/i.test(textoDe(D.notas[id])));
  const linkOculto = visiveis.filter((id) => [...(D.notas[id].html || '').matchAll(/data-nota="([^"]+)"/g)].some((m) => notaOculta(D, m[1])));
  checar(!comTravessao.length, 'os textos visíveis não têm travessão' + (comTravessao.length ? ' (' + comTravessao.slice(0, 3).join(', ') + ')' : ''));
  checar(!citamArquivo.length, 'os textos visíveis não citam vault, modelos ou Obsidian' + (citamArquivo.length ? ' (' + citamArquivo.slice(0, 3).join(', ') + ')' : ''));
  checar(!linkOculto.length, 'nenhum texto visível leva a uma página de bastidor' + (linkOculto.length ? ' (' + linkOculto.slice(0, 3).join(', ') + ')' : ''));
  checar(D.unidades.every((u) => !/[—–]/.test(u.titulo)), 'os títulos das unidades não têm travessão');
}

const LIVROS = new Set();
for (const d of D.plano) for (const l of d.livros) LIVROS.add(l);
checar(LIVROS.size === 66, 'o plano percorre os 66 livros (' + LIVROS.size + ')');
checar([...LIVROS].every((l) => D.notas['03 - Livros da Bíblia/' + l]), 'todo livro do plano tem ficha no material');

let linksQuebrados = 0;
let backlinksSoltos = 0;
for (const [id, n] of Object.entries(D.notas)) {
  for (const alvo of n.links) if (!D.notas[alvo]) linksQuebrados++;
  for (const origem of n.backlinks || []) {
    if (!D.notas[origem] || !D.notas[origem].links.includes(id)) backlinksSoltos++;
  }
}
checar(linksQuebrados === 0, 'nenhum link aponta para nota inexistente (' + linksQuebrados + ')');
checar(backlinksSoltos === 0, 'todo backlink tem o link correspondente (' + backlinksSoltos + ')');

let versiculosForaDoTrecho = 0;
for (const d of D.plano) {
  for (const id of d.rel.versiculos) {
    const m = /^08 - Versículos\/(.+?) (\d+)\./.exec(id);
    if (!m) continue;
    if (!d.trechos.some((t) => t.livro === m[1] && Number(m[2]) >= t.de && Number(m[2]) <= t.ate)) versiculosForaDoTrecho++;
  }
}
checar(versiculosForaDoTrecho === 0, 'nenhum versículo sugerido cai fora dos capítulos do dia (' + versiculosForaDoTrecho + ')');

// Textos escritos para um adulto casado e já batizado não voltam numa importação. O que se
// cobra é o texto antigo ter sumido, não o novo estar palavra por palavra: a reescrita do
// Explorar passa por cima destas notas e muda a frase de lugar, o que é legítimo.
checar(AJUSTES.every(([id, de]) => D.notas[id] && !D.notas[id].html.includes(de)),
  'os textos para adulto casado saíram das notas');
const EXEMPLOS_DE_ADULTO = ['minha esposa quando ela contar', 'checar o saldo', 'meu marido quando ele contar'];
const comExemploDeAdulto = Object.entries(D.notas)
  .filter(([id, n]) => !notaOculta(D, id) && EXEMPLOS_DE_ADULTO.some((t) => n.html.includes(t)))
  .map(([id]) => id);
checar(comExemploDeAdulto.length === 0, 'nenhuma nota visível fala com adulto casado (' + comExemploDeAdulto.join(', ') + ')');

// =========================================================================
secao('arquivo gerado');
// =========================================================================
const dist = (f) => join(AQUI, 'dist', f);
checar(existsSync(dist('index.html')), 'dist/index.html existe');
const html = readFileSync(dist('index.html'), 'utf8');
for (const marcador of ['/*APP*/', '/*ESTILO*/', '/*DADOS*/', '/*FONTES*/', '/*ICONE*/']) {
  checar(!html.includes(marcador), 'o marcador ' + marcador + ' foi substituído');
}
checar(html.includes('window.DADOS=') && html.includes('@font-face') && html.includes('window.CC'), 'dados, fonte e app estão embutidos');
// Três blocos: o tema (uma linha, para a abertura já nascer no tema escolhido), os dados e o app.
checar(html.split('<script').length - 1 === 3, 'há exatamente três blocos de script: tema da abertura, dados e aplicativo');
checar(!html.includes('coluna-lado'), 'a coluna de resumo das telas largas saiu');

const codigo = ['index.html', 'estilo.css']
  .map((f) => readFileSync(join(AQUI, 'src', f), 'utf8'))
  .concat(readdirSync(join(AQUI, 'src', 'app')).map((f) => readFileSync(join(AQUI, 'src', 'app', f), 'utf8')))
  .concat([readFileSync(join(AQUI, 'build.mjs'), 'utf8')])
  .join('\n');
checar(!/obsidian/i.test(codigo) && !/vault/i.test(codigo), 'o código do aplicativo não conhece o Obsidian');
checar(codigo.includes("'conteudo', 'conteudo.json'"), 'o build lê o conteúdo congelado');
checar(!/Eu carrego o resto|companheiro|esposa/.test(codigo), 'o código não traz as falas e exemplos que saíram');
checar(!/XP_REGISTRO|api\/seguir|METAS/.test(codigo), 'XP por registro, seguir e meta de XP saíram do aplicativo');

let wikilinks = 0;
for (const n of Object.values(D.notas)) wikilinks += (n.html.match(/\[\[[^\]]*\]\]/g) || []).length;
checar(wikilinks === 0, 'nenhum wikilink ficou sem virar link (' + wikilinks + ')');
checar(statSync(dist('index.html')).size < 8 * 1024 * 1024, 'o arquivo cabe em 8 MB');

for (const f of ['manifest.webmanifest', 'sw.js', 'icone-192.png', 'icone-512.png', 'icone-mascara-512.png', 'apple-touch-icon.png', 'icone-48.png', 'entrar.html', 'privacidade.html']) {
  checar(existsSync(dist(f)), 'dist/' + f + ' existe');
}
const entrar = readFileSync(dist('entrar.html'), 'utf8');
const semMarcador = (texto) => !/\/\*(FONTES|SIMBOLO|USUARIO)\*\//.test(texto);
checar(semMarcador(entrar) && entrar.includes('type="date"') && entrar.includes('api/criar-conta'), 'a entrada tem o cadastro com data de nascimento');
checar(semMarcador(readFileSync(dist('privacidade.html'), 'utf8')), 'a página de privacidade foi montada');
checar(/rel="apple-touch-icon" href="apple-touch-icon\.png\?v=\w+"/.test(entrar) && entrar.includes('rel="manifest"')
  && /rel="icon" href="data:image\/png;base64,/.test(entrar), 'a entrada declara ícone e manifesto: é dela que se adiciona à tela de início');
const paginaApp = readFileSync(dist('index.html'), 'utf8');
checar(/rel="apple-touch-icon" href="apple-touch-icon\.png\?v=\w+"/.test(paginaApp) && !/\/\*(ICONE|VERSAO_ICONES|ABERTURA)\*\//.test(paginaApp),
  'o aplicativo aponta o ícone da tela de início do iPhone');
const manifesto = JSON.parse(readFileSync(dist('manifest.webmanifest'), 'utf8'));
checar(manifesto.display === 'standalone' && manifesto.icons.length === 4, 'o manifesto pede janela própria e declara os ícones');
const sw = readFileSync(dist('sw.js'), 'utf8');
checar(sw.includes("url.pathname.includes('/api/')"), 'o service worker não guarda o estado em cache');
const versaoDaPagina = (html.match(/<meta name="versao-app" content="([0-9a-f]{12})">/) || [])[1];
checar(!!versaoDaPagina && sw.includes("'caminho-" + versaoDaPagina + "'"), 'a página sabe a própria versão, a mesma do service worker');
checar(sw.includes("cache: 'reload'"), 'na troca de versão, o service worker baixa os arquivos por cima do cache');

// =========================================================================
secao('texto bíblico');
// =========================================================================
for (const sigla of ['nbv', 'blivre']) {
  const arquivo = join(AQUI, 'conteudo', 'biblias', sigla + '.json');
  checar(existsSync(arquivo), sigla + ': a tradução está no conteúdo');
  if (!existsSync(arquivo)) continue;
  const b = JSON.parse(readFileSync(arquivo, 'utf8'));
  checar(Object.keys(b.livros).length === 66 && [...LIVROS].every((l) => b.livros[l]), sigla + ': os 66 livros, pelos nomes do plano');
  let semTexto = 0;
  for (const d of D.plano) for (const t of d.trechos) for (let c = t.de; c <= t.ate; c++) {
    if (!((b.livros[t.livro] || [])[c - 1] || []).some(Boolean)) semTexto++;
  }
  checar(semTexto === 0, sigla + ': todo capítulo do plano tem texto (' + semTexto + ' sem)');
  checar(b.credito && b.credito.length > 0 && b.licenca && b.licencaUrl, sigla + ': traz o crédito e a licença');
}
const inicioBiblias = html.indexOf('window.BIBLIAS=');
const listaBiblias = inicioBiblias > -1
  ? JSON.parse(html.slice(inicioBiblias + 'window.BIBLIAS='.length, html.indexOf(';</script>', inicioBiblias))) : [];
checar(listaBiblias.length === 2 && listaBiblias[0].sigla === 'nbv', 'as duas traduções vão no aplicativo, com a NBV primeiro');
checar(listaBiblias.every((b) => existsSync(dist(b.arquivo)) && existsSync(dist(b.arquivo + '.gz'))), 'cada tradução tem arquivo e versão comprimida');
checar(sw.includes("'caminho-biblias'"), 'o service worker guarda as bíblias num cache próprio');

// =========================================================================
secao('regras de progresso');
// =========================================================================
const contexto = createContext({
  window: { DADOS: D }, console, Date, Math, JSON, Object, Set, Map, Number, String, Array, Boolean, Intl,
  fetch: () => Promise.reject(new Error('sem servidor no teste')),
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: { documentElement: { dataset: {} }, querySelector: () => null },
  setTimeout, clearTimeout, Blob: class {}, URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  addEventListener: () => {}, location: { protocol: 'file:' }, navigator: {},
});
for (const f of ['01-nucleo.js', '02-estado.js', '04b-leitor.js', '04c-reflexao.js']) {
  runInContext(readFileSync(join(AQUI, 'src', 'app', f), 'utf8'), contexto, { filename: f });
}
const CC = contexto.window.CC;

// --- guardar, pensar, orar ---
{
  const nbv = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'nbv.json'), 'utf8'));
  const blivre = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'blivre.json'), 'utf8'));
  const existe = (b, ref) => {
    const m = /^(.+?) (\d+)\.(\d+)(?:-(\d+))?$/.exec(ref);
    const cap = m && ((b.livros[m[1]] || [])[Number(m[2]) - 1] || []);
    const de = m && Number(m[3]);
    const ate = m && Number(m[4] || m[3]);
    return !!m && ate - de <= 2 && cap.slice(de - 1, ate).length === ate - de + 1 && cap.slice(de - 1, ate).every(Boolean);
  };
  const semReflexao = [];
  const foraDaLeitura = [];
  const semTexto = [];
  for (const d of D.plano) {
    const r = CC.reflexaoDoDia(d.numero);
    if (!r.ref && !r.nota) { semReflexao.push(d.numero); continue; }
    // 2 ou 3 perguntas: as reflexões revistas têm a quantidade que o texto pede
    if (r.perguntas.length < 2 || r.perguntas.length > 3 || r.oracao.length !== 3) semReflexao.push(d.numero);
    if (!r.ref) continue;
    const m = /^(.+?) (\d+)\./.exec(r.ref);
    if (!d.trechos.some((t) => t.livro === m[1] && Number(m[2]) >= t.de && Number(m[2]) <= t.ate)) foraDaLeitura.push(d.numero);
    if (!existe(nbv, r.ref) || !existe(blivre, r.ref)) semTexto.push(d.numero);
  }
  checar(!semReflexao.length, 'os 365 dias têm versículo ou nota, 2 ou 3 perguntas e três começos de oração' + (semReflexao.length ? ' (' + semReflexao.join(', ') + ')' : ''));
  checar(!foraDaLeitura.length, 'o versículo para guardar está dentro da leitura do dia' + (foraDaLeitura.length ? ' (' + foraDaLeitura.join(', ') + ')' : ''));
  checar(!semTexto.length, 'todo versículo para guardar existe nas duas traduções' + (semTexto.length ? ' (' + semTexto.join(', ') + ')' : ''));

  // As notas de versículo do Explorar citavam a NVI, que não tem licença para o app: o texto
  // tem de vir das Bíblias do app, uma versão por tradução.
  const versiculos = Object.values(D.notas).filter((n) => n.pasta === '08 - Versículos' && /^.+ \d+\.\d+(-\d+)?$/.test(n.nome));
  const foraDasBiblias = versiculos.filter((n) => !n.versos || !n.versos.nbv || !n.versos.blivre
    || n.texto !== n.versos.nbv || !n.html.includes('<blockquote data-verso='));
  checar(versiculos.length > 100 && !foraDasBiblias.length, 'as notas de versículo do Explorar trazem o texto da NBV e da Bíblia Livre, e não o da NVI'
    + (foraDasBiblias.length ? ' (' + foraDasBiblias.slice(0, 5).map((n) => n.nome).join(', ') + ')' : ''));
  const livros = Object.values(D.notas).filter((n) => n.pasta === '03 - Livros da Bíblia' && /<h2>Versículo-chave<\/h2>/.test(n.html));
  const chaveForaDasBiblias = livros.filter((n) => !n.versos || !n.versos.nbv || !n.versos.blivre || !/<h2>Versículo-chave<\/h2>\s*<blockquote data-verso=/.test(n.html));
  checar(livros.length === 66 && !chaveForaDasBiblias.length, 'o versículo-chave dos 66 livros vem da NBV e da Bíblia Livre'
    + (chaveForaDasBiblias.length ? ' (' + chaveForaDasBiblias.slice(0, 5).map((n) => n.nome).join(', ') + ')' : ''));
}
const dias = (ini, n) => Array.from({ length: n }, (_, i) => somaDias(ini, i));

// --- ofensiva e escudos ---
let s = CC.simularOfensiva(dias('2026-03-01', 3), '2026-03-03');
checar(s.atual === 3 && s.recorde === 3, 'três dias seguidos contam três');
s = CC.simularOfensiva(dias('2026-03-01', 2), '2026-03-03');
checar(s.atual === 2, 'a ofensiva sobrevive ao dia de hoje ainda não lido');
s = CC.simularOfensiva(['2026-03-01', '2026-03-02', '2026-03-04'], '2026-03-04');
checar(s.atual === 3 && s.protegidos.join() === '2026-03-03', 'um dia em branco gasta o escudo e a ofensiva segue');
s = CC.simularOfensiva(['2026-03-01', '2026-03-02', '2026-03-05'], '2026-03-05');
checar(s.atual === 1 && !s.protegidos.length && s.escudos === 1, 'buraco maior que os escudos zera sem gastar escudo');
s = CC.simularOfensiva([...dias('2026-03-01', 7), '2026-03-10'], '2026-03-10');
checar(s.atual === 8 && s.protegidos.length === 2, 'sete dias seguidos rendem um escudo a mais, no máximo dois');
s = CC.simularOfensiva(dias('2026-03-01', 3), '2026-03-06');
checar(s.atual === 0 && s.recorde === 3 && s.zerouEm, 'sem ler e sem escudos bastantes, zera e o recorde fica');
s = CC.simularOfensiva([...dias('2026-03-01', 3), ...dias('2026-03-10', 3)], '2026-03-12');
checar(s.recomeco, 'três dias depois de zerar contam como recomeço');
s = CC.simularOfensiva(['2026-02-27', '2026-02-28', '2026-03-03'], '2026-03-03');
checar(s.atual === 3 && s.protegidos.length === 2, 'o escudo do mês novo entra antes de cobrir o buraco');
s = CC.sequencia({ 1: '2026-03-01', 2: '2026-03-01', 3: '2026-03-02' }, '2026-03-02');
checar(s.atual === 2, 'ler dois dias do plano de uma vez não infla a ofensiva');

// --- XP ---
checar(CC.XP_REGISTRO === undefined, 'escrever não tem valor em XP');
checar(typeof CC.trechosDaTrilha === 'function', 'o leitor separa as trilhas');

// --- fusão entre aparelhos ---
const celular = {
  atualizadoEm: 100, dia: 5, lidos: [1, 2, 3], licoes: ['a'],
  oia: { 1: { o: 'do celular', i: '', a: '', oracao: '' } },
  anotacoes: {}, marcadoEm: { 1: '2026-03-01', 2: '2026-03-02', 3: '2026-03-03' }, licoesEm: {},
  xpLegado: 15, conquistasGanhas: { 'Pé na estrada': '2026-03-01' }, maiorProposito: 3,
};
const computador = {
  atualizadoEm: 50, dia: 2, lidos: [1, 4], licoes: ['b'],
  oia: { 4: { o: 'do computador', i: '', a: '', oracao: '' } },
  anotacoes: { 'nota:x': 'lembrete' }, marcadoEm: { 1: '2026-03-01', 4: '2026-03-04' }, licoesEm: {},
  xpLegado: null, conquistasGanhas: { 'Escriba': '2026-01-01' }, maiorProposito: 7,
};
let f = CC.fundir(celular, computador);
checar(f.lidos.length === 4 && f.licoes.length === 2, 'a fusão não perde leitura nem lição');
checar(f.oia[1].o === 'do celular' && f.oia[4].o === 'do computador', 'a fusão guarda os dois registros escritos');
checar(f.anotacoes['nota:x'] === 'lembrete' && f.dia === 5, 'a fusão guarda anotação antiga e o dia do aparelho mais novo');
checar(f.xpLegado === 15 && f.maiorProposito === 7 && f.conquistasGanhas['Escriba'] && f.conquistasGanhas['Pé na estrada'],
  'a fusão preserva XP antigo, maior propósito e conquistas dos dois lados');
const ordenado = (e) => e.lidos.slice().sort((a, b) => a - b).join();
checar(ordenado(CC.fundir(celular, computador)) === ordenado(CC.fundir(computador, celular)), 'a fusão dá o mesmo resultado nos dois sentidos');
const zerado = { atualizadoEm: 200, zeradoEm: 200, dia: 1, lidos: [], licoes: [], oia: {}, anotacoes: {}, marcadoEm: {}, licoesEm: {} };
checar(CC.fundir(celular, zerado).lidos.length === 0, 'um zeramento mais novo apaga o que veio antes');
checar(CC.fundir(zerado, { ...celular, atualizadoEm: 300 }).lidos.length === 3, 'o que foi feito depois do zeramento sobrevive');
const antigo = CC.normalizarEstado({ atualizadoEm: 1, lidos: [7], trilha: ['z'], meta: 20, protegidos: ['2026-01-01'] });
checar(antigo.licoes[0] === 'z' && antigo.meta === undefined && antigo.protegidos === undefined, 'estado antigo é lido sem meta nem protetor guardado');

// --- trilhas do leitor ---
let trilhaErrada = 0;
for (const d of D.plano) {
  const at = CC.trechosDaTrilha(d, 'antigo');
  const nt = CC.trechosDaTrilha(d, 'novo');
  if (at.length + nt.length !== d.trechos.length) trilhaErrada++;
  if (at.some((t) => !d.antigo.includes(t.livro)) || nt.some((t) => !d.novo.includes(t.livro))) trilhaErrada++;
}
checar(trilhaErrada === 0, 'o leitor separa cada dia nas trilhas do Antigo e do Novo Testamento (' + trilhaErrada + ')');

// =========================================================================
secao('contas, amizades e propósito');
// =========================================================================
const pasta = mkdtempSync(join(tmpdir(), 'cc-teste-contas-'));
const arquivoContas = join(pasta, 'contas.json');
writeFileSync(arquivoContas, JSON.stringify({ versao: 1, contas: {
  ana: { usuario: 'ana', nome: 'Ana', sal: 'x', senha: 'y', criadaEm: '2026-01-01', segue: ['bia', 'caio'] },
  bia: { usuario: 'bia', nome: 'Bia', sal: 'x', senha: 'y', criadaEm: '2026-01-01', segue: ['ana'] },
  caio: { usuario: 'caio', nome: 'Caio', sal: 'x', senha: 'y', criadaEm: '2026-01-01', segue: [] },
} }));
const contas = await new Contas(arquivoContas).carregar();
checar(existsSync(join(pasta, 'contas.v1.bak.json')), 'a migração guarda cópia do arquivo antigo');
checar(contas.relacao('ana', 'bia') === 'amigos', 'quem se seguia dos dois lados vira amizade');
checar(contas.relacao('ana', 'caio') === 'enviado' && contas.relacao('caio', 'ana') === 'recebido', 'quem seguia sozinho vira pedido pendente');
checar(contas.lista().every((c) => !c.segue && c.seloConvite && c.fuso), 'contas migradas ganham selo de convite e fuso');

checar(!nascimentoValido('2999-01-01') && nascimentoValido('2004-02-29') && !nascimentoValido('2003-02-29'), 'data de nascimento é validada de verdade');
let erro = '';
try { await contas.criar({ usuario: 'dora', senha: '123456', nome: 'Dora' }); } catch (e) { erro = e.message; }
checar(/e-mail/.test(erro), 'cadastro sem e-mail é recusado');
await contas.criar({ usuario: 'dora', senha: '123456', nome: 'Dora', email: 'Dora@X.com', nascimento: '2001-02-03' });
checar(!!(await contas.conferir('dora@x.com', '123456')), 'entra com o e-mail, sem diferenciar maiúsculas');
for (const u of ['ana', 'bia', 'caio']) await contas.completarPerfil(u, { email: u + '@x.com', nascimento: '2000-01-01' });
checar(contas.procurar('dora', 'an') === null && contas.procurar('dora', 'ana').usuario === 'ana', 'a busca só acha pelo @ exato');

await contas.bloquear('dora', 'caio');
checar(contas.procurar('caio', 'dora') === null && await contas.pedir('caio', 'dora', '2026-03-01') === 'enviado'
  && !contas.amizade('caio', 'dora'), 'bloqueio é silencioso e não cria nada');

const assinar = (t) => createHmac('sha256', 'teste').update(t).digest('base64url');
const convite = contas.gerarConvite('dora', assinar);
await contas.usarConvite('bia', convite.token, assinar, '2026-03-02');
checar(contas.relacao('bia', 'dora') === 'amigos', 'aceitar um convite cria o propósito');
await contas.usarConvite('ana', convite.token, assinar, '2026-03-02');
checar(contas.relacao('ana', 'dora') === 'amigos', 'o mesmo link de convite vale para mais de uma pessoa');
checar(contas.lerConvite(convite.token, assinar, Date.now() + 31 * 24 * 60 * 60 * 1000) === null, 'o convite vence em 30 dias');
checar(contas.dados.convitesAceites.length === 2 && contas.dados.convitesAceites.every((x) => x.de === 'dora' && !x.contaNova),
  'cada aceite fica anotado; quem já tinha conta não conta como pessoa trazida');
checar(contas.lerConvite(convite.token.slice(0, -3) + 'abc', assinar) === null, 'convite adulterado é recusado');

for (const u of ['e1', 'e2', 'e3', 'e4', 'e5', 'e6']) {
  await contas.criar({ usuario: u, senha: '123456', nome: u, email: u + '@x.com', nascimento: '2000-01-01' });
  await contas.pedir(u, 'ana', '2026-03-01');
  await contas.aceitar('ana', u, '2026-03-01');
}
checar(contas.ativasDe('ana') === 8, 'amigos sem limite: a Ana passa de 5 (' + contas.ativasDe('ana') + ')');

const conviteDaAna = contas.gerarConvite('ana', assinar);
await contas.criar({ usuario: 'novo1', senha: '123456', nome: 'Novo', email: 'novo1@x.com', nascimento: '2000-01-01' });
await contas.usarConvite('novo1', conviteDaAna.token, assinar, '2026-03-03', Date.now(), { contaNova: true });
checar(contas.achar('novo1').convidadoPor === 'ana' && contas.semeadorDe('ana') === 0,
  'quem cria a conta pelo link fica anotado, mas só conta depois da primeira lição');
await contas.ativarConvidado('novo1');
checar(contas.semeadorDe('ana') === 1, 'feita a primeira lição, a pessoa conta para quem convidou');
await contas.apagar('novo1');
checar(contas.semeadorDe('ana') === 0, 'conta apagada deixa de contar');

checar(await contas.tocar('bia', 'dora', { hoje: '2026-03-02', euLeu: true, eleLeu: false }) === 'enviado'
  && await contas.tocar('bia', 'dora', { hoje: '2026-03-02', euLeu: true, eleLeu: false }) === 'ja', 'um toque por amigo por dia');
await contas.silenciar('dora', 'bia', true);
checar(!contas.toquesRecebidos('dora', '2026-03-02').includes('bia'), 'silenciar esconde os toques');
await contas.apagar('bia');
checar(!Object.keys(contas.dados.amizades).some((k) => k.includes('bia')), 'apagar a conta leva as amizades junto');

const resumo = resumoDeAmigo({ usuario: 'x', nome: 'X', email: 'x@x.com', nascimento: '2000-01-01' },
  { marcadoEm: { 1: '2026-03-02' }, oia: { 1: { oracao: 'segredo' } }, lidos: [1] }, '2026-03-02');
checar(resumo.leuHoje && !/segredo|x@x\.com|2000-01-01|xp/.test(JSON.stringify(resumo)), 'o que um amigo vê não leva escritos, e-mail, nascimento nem XP');

const p = (lista, protegidos = []) => ({ feitas: new Set(lista), protegidos: new Set(protegidos) });
checar(diasDeProposito(p(dias('2026-03-01', 5)), p(dias('2026-03-01', 5)), '2026-03-01', '2026-03-05') === 5, 'cinco dias juntos contam cinco');
checar(diasDeProposito(p(dias('2026-03-01', 5)), p(dias('2026-03-01', 4)), '2026-03-01', '2026-03-05') === 4, 'hoje só conta quando os dois leram');
checar(diasDeProposito(p(dias('2026-03-01', 5)), p(['2026-03-01', '2026-03-02', '2026-03-04', '2026-03-05'], ['2026-03-03']),
  '2026-03-01', '2026-03-05') === 4, 'escudo de um dos dois congela a contagem sem quebrar');
checar(diasDeProposito(p(dias('2026-03-01', 5)), p(['2026-03-01', '2026-03-02', '2026-03-04', '2026-03-05']),
  '2026-03-01', '2026-03-05') === 2, 'um dia sem os dois recomeça a contagem');
checar(diasDeProposito(p(dias('2026-03-01', 5)), p(dias('2026-03-01', 5)), '2026-03-04', '2026-03-05') === 2, 'o propósito conta só desde o aceite');
// No Windows, arquivo aberto não se apaga: o banco da pasta temporária fecha antes.
fecharBanco(arquivoDoBanco(pasta));
rmSync(pasta, { recursive: true, force: true });

console.log('\n  ' + contagem + ' checagens' + (falhas ? ' · ' + falhas + ' FALHA(S)\n' : ' · todas passaram\n'));
process.exit(falhas ? 1 : 0);
