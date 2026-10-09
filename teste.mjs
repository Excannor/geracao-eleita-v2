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
  somaAnos, idadeMinimaOk, hojeNoFuso, FUSO_PADRAO, IDADE_MINIMA,
  menorDeIdade, podeConduzir, aguardandoAprovacao,
} from './contas.mjs';
import { AJUSTES, notaOculta } from './ferramentas/ajustes-conteudo.mjs';
import { montarPainel } from './painel.mjs';

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
  // "Volta para: Home" era a navegação do vault, sem sentido no app.
  const voltaPara = visiveis.filter((id) => /Volta para:/.test(textoDe(D.notas[id])));
  checar(!voltaPara.length, 'nenhum texto visível manda "voltar para" uma página do vault' + (voltaPara.length ? ' (' + voltaPara.slice(0, 3).join(', ') + ')' : ''));
  // O "Comece por aqui" do Explorar aponta para notas que existem e que a pessoa pode abrir.
  const fonteExplorar = readFileSync(join(AQUI, 'src', 'app', '06-explorar.js'), 'utf8');
  const blocoComece = (fonteExplorar.match(/const COMECE = \[([\s\S]*?)\]\.filter/) || [])[1] || '';
  const idsComece = [...blocoComece.matchAll(/\['([^']+)'/g)].map((m) => m[1]).concat(/\[HISTORIA,/.test(blocoComece) ? ['00 - Início/A história bíblica em uma página'] : []);
  checar(idsComece.length === 8 && idsComece.every((id) => D.notas[id] && !notaOculta(D, id)), 'os 8 passos do "Comece por aqui" são notas visíveis (' + idsComece.length + ')');
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
for (const marcador of ['/*APP*/', '/*ESTILO*/', '/*DADOS*/', '/*FONTES*/', '/*ICONE*/', '/*CONTEUDO_ARQUIVO*/']) {
  checar(!html.includes(marcador), 'o marcador ' + marcador + ' foi substituído');
}
checar(html.includes('@font-face') && html.includes('window.CC') && html.includes('window.iniciarApp'), 'fonte e app estão embutidos');
{
  const fontesDaPagina = [...html.matchAll(/url\(\.\/(fonte-[a-z-]+\.[0-9a-f]{10}\.woff2)\)/g)].map((m) => m[1]);
  const swTexto = readFileSync(dist('sw.js'), 'utf8');
  const daInterface = fontesDaPagina.filter((f) => !f.startsWith('fonte-original-'));
  checar(!html.includes('data:font') && daInterface.length === 4 && daInterface.every((f) => existsSync(dist(f)) && swTexto.includes('./' + f)),
    'as 4 fontes saíram do index.html para arquivos próprios, guardados pelo service worker');
  // As do nome original nos mapas (hebraico, grego, grego estendido): só a regra com
  // unicode-range na página; o service worker as guarda quando a tela do mapa as pede.
  const originais = fontesDaPagina.filter((f) => f.startsWith('fonte-original-'));
  const listaMapas = (swTexto.match(/const MAPAS = (\[.*\]);/) || [])[1] || '[]';
  checar(originais.length === 3 && originais.every((f) => existsSync(dist(f)) && JSON.parse(listaMapas).includes(f) && !swTexto.includes("'./" + f + "'") && !swTexto.includes('"./' + f + '"'))
    && /unicode-range:U\+0590-05FF/.test(html),
    'as fontes do hebraico e do grego ficam fora da instalação e entram no cache dos mapas quando usadas');
}
// O conteúdo mora num arquivo à parte, com resumo no nome, e a página só aponta para ele.
const arquivoConteudo = (html.match(/window\.CONTEUDO_ARQUIVO="(conteudo\.[0-9a-f]+\.json)"/) || [])[1];
checar(!!arquivoConteudo && existsSync(dist(arquivoConteudo)) && !html.includes('"plano":'), 'o conteúdo saiu do index.html para ' + arquivoConteudo);
checar(readFileSync(dist('sw.js'), 'utf8').includes('./' + arquivoConteudo), 'o service worker guarda o conteúdo para abrir sem rede');
// Todo módulo local que o servidor carrega (direto ou por outro módulo) precisa estar na linha
// COPY do Dockerfile: sem ele, o container nem sobe depois do deploy.
{
  const copia = (readFileSync(join(AQUI, 'Dockerfile'), 'utf8').match(/^COPY (.*\.mjs.*) \.\/$/m) || [])[1] || '';
  const naImagem = new Set(copia.split(/\s+/));
  const faltam = [];
  const vistos = new Set();
  const visitar = (arquivo) => {
    if (vistos.has(arquivo)) return;
    vistos.add(arquivo);
    if (!naImagem.has(arquivo)) faltam.push(arquivo);
    const fonte = readFileSync(join(AQUI, arquivo), 'utf8');
    for (const m of fonte.matchAll(/from '\.\/([\w-]+\.mjs)'/g)) visitar(m[1]);
  };
  visitar('servidor.mjs');
  checar(faltam.length === 0, 'todo módulo que o servidor carrega está no COPY do Dockerfile' + (faltam.length ? ' (faltam: ' + faltam.join(', ') + ')' : ''));
}
checar(Buffer.byteLength(html) < 1024 * 1024, 'o index.html ficou abaixo de 1 MB (' + Math.round(Buffer.byteLength(html) / 1024) + ' KB)');
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

for (const f of ['manifest.webmanifest', 'sw.js', 'icone-192.png', 'icone-512.png', 'icone-mascara-512.png', 'apple-touch-icon.png', 'icone-48.png', 'entrar.html', 'privacidade.html', 'termos.html']) {
  checar(existsSync(dist(f)), 'dist/' + f + ' existe');
}
const entrar = readFileSync(dist('entrar.html'), 'utf8');
const semMarcador = (texto) => !/\/\*(FONTES|SIMBOLO|USUARIO)\*\//.test(texto);
checar(semMarcador(entrar) && entrar.includes('type="date"') && entrar.includes('api/criar-conta'), 'a entrada tem o cadastro com data de nascimento');
checar(semMarcador(readFileSync(dist('privacidade.html'), 'utf8')), 'a página de privacidade foi montada');
checar(semMarcador(readFileSync(dist('termos.html'), 'utf8')) && readFileSync(dist('termos.html'), 'utf8').includes('Regras de convivência'), 'a página de termos de uso foi montada');
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
secao('mapas dos livros');
// =========================================================================
// Cada mapa (conteudo/mapas/<slug>.json) passa pelo checador: campos, referências na NBV,
// citações, palavras proibidas. O índice diz quais vão ao ar; o build publica só esses, com
// os desenhos embutidos, e o service worker guarda cada um. A Bíblia do app não muda.
{
  const { checarMapa, listarMapas, lerIndice, LIVROS: LIVROS_MAPA, GRUPOS: GRUPOS_MAPA } = await import('./ferramentas/checar-mapa.mjs');
  const slugs = listarMapas();
  checar(slugs.length >= 1, 'há ao menos um mapa escrito em conteudo/mapas (' + slugs.length + ')');
  for (const slug of slugs) {
    const { erros, avisos } = checarMapa(slug, JSON.parse(readFileSync(join(AQUI, 'conteudo', 'mapas', slug + '.json'), 'utf8')));
    checar(erros.length === 0, 'o mapa ' + slug + ' passa no checador' + (erros.length ? ': ' + erros.slice(0, 3).join(' · ') : ''));
    for (const a of avisos) console.log('  aviso  ' + slug + ': ' + a);
  }
  const indice = lerIndice();
  checar(Array.isArray(indice.publicados) && indice.publicados.every((s) => slugs.includes(s)), 'todo mapa publicado no índice existe na pasta');
  const inicioMapas = html.indexOf('window.MAPAS=');
  const listaMapas = inicioMapas > -1 ? JSON.parse(html.slice(inicioMapas + 'window.MAPAS='.length, html.indexOf(';window.BIBLIAS=', inicioMapas))) : null;
  checar(Array.isArray(listaMapas) && listaMapas.length === indice.publicados.length && listaMapas.every((m) => indice.publicados.includes(m.slug)),
    'o aplicativo conhece exatamente os mapas publicados (' + (listaMapas || []).map((m) => m.slug).join(', ') + ')');
  for (const m of listaMapas || []) {
    checar(/^mapa-[a-z0-9-]+\.[0-9a-f]{10}\.json$/.test(m.arquivo) && existsSync(dist(m.arquivo)) && existsSync(dist(m.arquivo + '.gz')),
      'o mapa ' + m.slug + ' saiu para ' + m.arquivo + ', com versão comprimida');
    checar(sw.includes(m.arquivo) && sw.includes("'caminho-mapas'"), 'o service worker guarda o mapa ' + m.slug + ' num cache próprio');
    if (!existsSync(dist(m.arquivo))) continue;
    const publicado = JSON.parse(readFileSync(dist(m.arquivo), 'utf8'));
    const ids = [(publicado.autoria || {}).desenho].concat((publicado.ramos || []).map((r) => r.desenho), (publicado.cristo || {}).desenho).filter(Boolean);
    checar(ids.every((id) => typeof (publicado.desenhos || {})[id] === 'string' && /^<svg/.test(publicado.desenhos[id]) && !/<style|xmlns|<!--/.test(publicado.desenhos[id])),
      'o mapa ' + m.slug + ' leva os ' + ids.length + ' desenhos embutidos, sem o estilo de visualização avulsa');
    checar(!html.includes(JSON.stringify(publicado.raiz.texto).slice(1, 40)), 'o conteúdo do mapa ' + m.slug + ' não entra no index.html');
  }
  // A mesma tabela dos 66 no app e no checador: um nome só para cada coisa.
  const ctx = createContext({ window: { CC: { D: { plano: [] } }, MAPAS: [] }, addEventListener: () => {}, document: {}, setTimeout, clearTimeout, requestAnimationFrame: () => {}, Math, JSON, Map, Set, Number, String, Array, Object });
  runInContext(readFileSync(join(AQUI, 'src', 'app', '06b-mapas.js'), 'utf8'), ctx, { filename: '06b-mapas.js' });
  const tabelaApp = ctx.window.CC.LIVROS_MAPA;
  checar(JSON.stringify(tabelaApp) === JSON.stringify(LIVROS_MAPA) && JSON.stringify(ctx.window.CC.GRUPOS_MAPA) === JSON.stringify(GRUPOS_MAPA),
    'o app e o checador usam a mesma tabela dos 66 livros, grupos e siglas');
  checar(tabelaApp.length === 66 && tabelaApp.every(([nome]) => LIVROS.has(nome)), 'a tabela dos mapas usa os nomes dos livros do plano');
  const servidorTexto = readFileSync(join(AQUI, 'servidor.mjs'), 'utf8');
  checar(servidorTexto.includes('MAPA_COM_RESUMO') && servidorTexto.includes("|| PUBLICO_COM_RESUMO(rota);") && servidorTexto.includes("'cache-control': PUBLICO_COM_RESUMO(rota)"),
    'o servidor entrega os mapas sem sessão e com cache longo, como as fontes');
  // Os mapas moram no Explorar. Desde 04/10/2026 (revisão de fluxo, item 10, aprovado pelo
  // dono) a lista de livros da Bíblia e o fim da lição levam a eles por um link #/mapa/<slug>,
  // só quando o livro tem mapa publicado; o leitor e a trilha continuam sem eles, e nenhuma
  // dessas telas desenha o mapa nem o cartão do Explorar.
  const app = (f) => readFileSync(join(AQUI, 'src', 'app', f), 'utf8');
  const foraDoExplorar = ['04b-leitor.js', '03-trilha.js', '03c-contexto.js']
    .filter((f) => /vistaMapa|#\/mapa|secaoMapas|cartaoMapas|mapaDoLivro/.test(app(f)));
  checar(foraDoExplorar.length === 0, 'o leitor e a trilha não ganharam nada do mapa' + (foraDoExplorar.length ? ' (' + foraDoExplorar.join(', ') + ')' : ''));
  const soLink = ['04d-biblia.js', '04-licao.js'].filter((f) => /vistaMapa|secaoMapas|cartaoMapas/.test(app(f)) || !/CC\.mapaDoLivro/.test(app(f)));
  checar(soLink.length === 0, 'a Bíblia e o fim da lição só levam ao mapa publicado, com um link' + (soLink.length ? ' (' + soLink.join(', ') + ')' : ''));
  const roteador = readFileSync(join(AQUI, 'src', 'app', '10-roteador.js'), 'utf8');
  checar(roteador.includes("mapa: '#/explorar'") && roteador.includes("rota === 'mapa'"), 'a rota #/mapa/<slug> existe e marca o Explorar');
}

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

  // Integridade das Bíblias (conferida em 2026-09-23): 66 livros com os mesmos nomes e na
  // mesma ordem, nenhum versículo vazio, e a única diferença de contagem entre as duas é a
  // versificação da NBV, que divide em dois o último versículo de Juízes 5, 1 Samuel 20 e
  // 3 João (31.105 contra 31.102). Uma importação nova que desalinhe capítulos cai aqui.
  const livrosN = Object.keys(nbv.livros);
  const vazio = (b) => Object.values(b.livros).flat().flat().some((v) => !v || !String(v).trim());
  const diferentes = [];
  for (const l of livrosN) (nbv.livros[l] || []).forEach((cap, i) => {
    if (cap.length !== ((blivre.livros[l] || [])[i] || []).length) diferentes.push(l + ' ' + (i + 1));
  });
  checar(livrosN.length === 66 && JSON.stringify(livrosN) === JSON.stringify(Object.keys(blivre.livros))
    && !vazio(nbv) && !vazio(blivre) && diferentes.join() === 'Juízes 5,1 Samuel 20,3 João 1',
    'as duas Bíblias têm os 66 livros alinhados, sem versículo vazio' + (diferentes.join() === 'Juízes 5,1 Samuel 20,3 João 1' ? '' : ' (capítulos diferentes: ' + diferentes.join(', ') + ')'));

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
// --- a voz humana nos textos de leitura (catálogo .claude/skills/mapa-do-livro/voz.md) ---
// Contexto, procure, guias, Conhecer Jesus e as reflexões já revistas passam pelo mesmo filtro
// dos mapas, fora das citações. Unidade de reflexão só entra em REFLEXOES_NA_VOZ_NOVA depois de
// escrita E revista por outra leitura; daí em diante o teste barra qualquer vício que volte.
{
  const { vozDoTexto } = await import('./ferramentas/checar-mapa.mjs');
  const REFLEXOES_NA_VOZ_NOVA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const achados = [];
  const ver = (onde, t) => { for (const x of vozDoTexto(t)) achados.push(onde + ': ' + x); };
  const PD = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'primeiros-dias.json'), 'utf8'));
  for (const [k, v] of Object.entries(PD.dias)) for (const c of ['titulo', 'sub', 'contexto', 'procure', 'amanha']) if (v[c]) ver('primeiros dias ' + k + ' ' + c, v[c]);
  for (const [k, v] of Object.entries(PD.livros)) ver('primeiros dias, livro ' + k, v);
  for (const [k, v] of Object.entries(PD.guias)) (Array.isArray(v) ? v : [v]).forEach((g) => ver('guia ' + k, g.texto));
  const CJ = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'conhecer.json'), 'utf8'));
  (Array.isArray(CJ.dias) ? CJ.dias : Object.values(CJ.dias)).forEach((d, i) => { for (const c of ['abertura', 'contexto', 'procure', 'repare', 'pergunta']) if (typeof d[c] === 'string') ver('conhecer ' + (i + 1) + ' ' + c, d[c]); });
  for (const u of REFLEXOES_NA_VOZ_NOVA) {
    const R = JSON.parse(readFileSync(join(AQUI, 'ferramentas', 'reflexoes', 'unidade-' + String(u).padStart(2, '0') + '.json'), 'utf8'));
    for (const [dia, lista] of Object.entries(R)) for (const r of lista) [r.titulo, r.texto, ...(r.perguntas || []), ...(r.oracao || [])].forEach((t) => ver('reflexão do dia ' + dia, t));
  }
  // Repetição entre os dias de uma unidade: começo de oração ou de pergunta com as mesmas duas
  // palavras em mais de 20% dos itens vira molde (a Unidade 3 tinha "Hoje eu..." em 15 de 31
  // orações). "Senhor, tu" e "O que você" abaixo disso são o jeito normal de orar e de perguntar.
  for (const u of REFLEXOES_NA_VOZ_NOVA) {
    const R = JSON.parse(readFileSync(join(AQUI, 'ferramentas', 'reflexoes', 'unidade-' + String(u).padStart(2, '0') + '.json'), 'utf8'));
    for (const campo of ['oracao', 'perguntas']) {
      const conta = new Map(); let total = 0;
      for (const lista of Object.values(R)) for (const r of lista) for (const t of r[campo] || []) {
        total++;
        const k = String(t).toLowerCase().replace(/[^a-záéíóúâêôãõç ]/g, '').split(/\s+/).slice(0, 2).join(' ');
        conta.set(k, (conta.get(k) || 0) + 1);
      }
      for (const [k, n] of conta) if (n > Math.max(4, total * 0.2)) achados.push('unidade ' + u + ': ' + n + ' começos de ' + campo + ' com "' + k + '"');
    }
  }
  checar(achados.length === 0, 'os textos de leitura passam no catálogo de voz' + (achados.length ? ' (' + achados.length + '): ' + achados.slice(0, 4).join(' · ') : ''));
}

// --- os primeiros dias: o contexto antes de ler (conteudo/primeiros-dias.json) ---
// O mesmo cuidado das reflexões: toda citação entre aspas existe na NBV da leitura do dia, nada
// de travessão nem emoji, e cada guia aponta para um capítulo e versículos que existem.
{
  const P = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'primeiros-dias.json'), 'utf8'));
  const nbv = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', 'nbv.json'), 'utf8')).livros;
  const normalizar = (t) => String(t).normalize('NFC').toLowerCase().replace(/[“”"'‘’«».,;:!?()[\]…—–-]/g, ' ').replace(/\s+/g, ' ').trim();
  const leituraDe = (n) => normalizar(D.plano[n - 1].trechos.map((t) => (nbv[t.livro] || []).slice(t.de - 1, t.ate).map((c) => c.join(' ')).join(' ')).join(' '));
  const campos = (d) => ['titulo', 'sub', 'contexto', 'procure', 'amanha'].map((k) => d[k] || '');
  const textos = [...Object.values(P.dias).flatMap(campos), ...Object.values(P.guias).map((g) => g.texto), ...Object.values(P.livros), ...P.paradas.map((p) => p.nome)];
  checar(P.paradas.length === 10 && P.paradas.every((p) => p.id && p.nome), 'o mapa da história tem as dez paradas, com nome');
  checar([1, 2, 3, 4, 5, 6, 7].every((n) => P.dias[n] && campos(P.dias[n]).every(Boolean)), 'os dias 1 a 7 têm título, subtítulo, contexto, "procure" e o gancho de amanhã');
  checar(!textos.some((t) => /[—–]/.test(t)), 'os textos dos primeiros dias não têm travessão');
  checar(!textos.some((t) => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)), 'os textos dos primeiros dias não têm emoji');
  checar(!textos.some((t) => /\bjornada\b|\bmergulh(ar|e)\b|\bdesvend(ar|a)\b/i.test(t)), 'os textos dos primeiros dias não têm os tiques de texto de IA');
  const foraDaNbv = [];
  for (const [n, d] of Object.entries(P.dias)) {
    if (!D.plano[n - 1]) { foraDaNbv.push('dia ' + n + ' não existe no plano'); continue; }
    const L = leituraDe(Number(n));
    for (const k of ['titulo', 'sub', 'contexto', 'procure']) {
      for (const m of String(d[k] || '').matchAll(/“([^”]+)”/g)) if (!L.includes(normalizar(m[1]))) foraDaNbv.push('dia ' + n + ' (' + k + '): ' + m[1]);
    }
  }
  checar(!foraDaNbv.length, 'toda citação do contexto está, palavra por palavra, na NBV da leitura do dia' + (foraDaNbv.length ? ' (' + foraDaNbv.join('; ') + ')' : ''));
  const guiasRuins = Object.entries(P.guias).filter(([chave, g]) => {
    const m = /^(.+) (\d+)$/.exec(chave);
    const cap = m && (nbv[m[1]] || [])[Number(m[2]) - 1];
    if (!cap) return true;
    if (!(g.de >= 1 && g.ate >= g.de && g.ate <= cap.length && g.texto)) return true;
    if (!g.salto) return false;
    const s = /^(\d+):(\d+)$/.exec(String(g.salto));
    const capSalto = s && (nbv[m[1]] || [])[Number(s[1]) - 1];
    return !(capSalto && Number(s[2]) >= 1 && Number(s[2]) <= capSalto.length);
  }).map(([chave]) => chave);
  checar(Object.keys(P.guias).length >= 5 && !guiasRuins.length, 'cada guia de leitura aponta para um capítulo, versículos e salto que existem na NBV' + (guiasRuins.length ? ' (' + guiasRuins.join(', ') + ')' : ''));
  checar(html.includes('"primeirosDias"') || readFileSync(dist(arquivoConteudo), 'utf8').includes('"primeirosDias"'), 'o conteúdo publicado leva os primeiros dias');
  // O checador inteiro do "Onde estamos" (ferramentas/checar-contexto.mjs, menos de um segundo): os
  // cinco campos de cada dia escrito, o gancho de amanhã contra a NBV do dia seguinte, as
  // referências dentro da leitura, o tamanho de cada campo e os guias.
  const { spawnSync } = await import('node:child_process');
  const cc = spawnSync(process.execPath, [join(AQUI, 'ferramentas', 'checar-contexto.mjs')], { encoding: 'utf8' });
  checar(cc.status === 0, 'o "Onde estamos" de cada dia passa no checar-contexto' + (cc.status ? ' (' + (cc.stdout.match(/FALHA.*$/gm) || []).slice(0, 3).join(' · ') + ')' : ''));
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
// "Zerar progresso" recomeça só a trilha: foto, nome, o que foi escrito e marcado ficam
{
  CC.carregarLocal();
  CC.guardarFoto('data:image/jpeg;base64,FOTO');
  CC.guardarApelido('Ana');
  CC.gravarAnotacao('verso:João 3.16', 'minha nota');
  CC.gravarRegistro(1, { o: 'reflexão', i: '', a: '', oracao: 'oração' });
  CC.gravarHistoria('antes', 'encontro', 'hoje');
  CC.marcar(['João 3:16'], 2);
  CC.marcarLido(1, true);
  CC.marcarLicao('a', true);
  CC.marcarConhecido(1);
  CC.marcarOrei();
  CC.gravar('bausAbertos', { 7: { em: '2026-03-01' } });
  CC.gravar('conquistasGanhas', { 'nivel:x:1': '2026-03-01' });
  CC.gravar('desafios', { semRedes: { inicio: '2026-03-01', dias: ['2026-03-01'], ativo: true, em: 1 } });
  const antes = JSON.parse(JSON.stringify(CC.estado()));
  CC.zerarProgresso();
  const z = CC.estado();
  checar(!z.lidos.length && !z.licoes.length && !Object.keys(z.conhecidos).length && !Object.keys(z.marcadoEm).length
    && !Object.keys(z.bausAbertos).length && !Object.keys(z.conquistasGanhas).length && z.xpLegado === 0 && z.zeradoEm > 0,
  'zerar apaga leituras, primeiros passos, Conhecer Jesus, ofensiva, baús, conquistas e XP');
  checar(z.foto === antes.foto && z.apelido === 'Ana' && z.anotacoes['verso:João 3.16'] === 'minha nota' && z.oia[1].oracao === 'oração'
    && z.historia.antes === 'antes' && z.marcas['João 3:16'].cor === 2 && Object.keys(z.oradoEm).length === 1 && z.desafios.semRedes.ativo,
  'zerar mantém foto, nome, anotações, reflexões, Minha história, marca-texto, orações marcadas e desafios');
  // outro aparelho, que ainda não sabia do zeramento, sincroniza depois: não traz a trilha de
  // volta, mas o que ele tinha escrito continua
  const outro = { ...antes, atualizadoEm: z.zeradoEm - 10, anotacoes: { ...antes.anotacoes, 'nota:y': 'escrita no outro' }, foto: antes.foto };
  for (const [x, y] of [[z, outro], [outro, z]]) {
    const f2 = CC.fundir(x, y);
    checar(!f2.lidos.length && !Object.keys(f2.marcadoEm).length && f2.foto === antes.foto && f2.anotacoes['nota:y'] === 'escrita no outro'
      && f2.notas['v:João 3.16'].texto === 'minha nota' && !f2.notas['v:João 3.16'].apagadaEm && f2.oia[1].o === 'reflexão',
    'na fusão com um aparelho atrasado, a trilha fica zerada e foto e anotações dos dois lados ficam');
  }
  // um zeramento da versão anterior (que mandava tudo vazio) não apaga mais o que foi escrito
  const zeradoAntigo = { atualizadoEm: z.zeradoEm + 5, zeradoEm: z.zeradoEm + 5, dia: 1, lidos: [], licoes: [], oia: {}, anotacoes: {}, marcadoEm: {}, licoesEm: {}, foto: '' };
  const f3 = CC.fundir(antes, zeradoAntigo);
  checar(!f3.lidos.length && f3.foto === antes.foto && f3.notas['v:João 3.16'].texto === 'minha nota' && !f3.notas['v:João 3.16'].apagadaEm, 'zeramento vindo de aparelho antigo também só zera a trilha');
  CC.carregarLocal();
}
const antigo = CC.normalizarEstado({ atualizadoEm: 1, lidos: [7], trilha: ['z'], meta: 20, protegidos: ['2026-01-01'] });
checar(antigo.licoes[0] === 'z' && antigo.meta === undefined && antigo.protegidos === undefined, 'estado antigo é lido sem meta nem protetor guardado');

// --- conhecer jesus: fusão de "conhecidos" e ofensiva ---
{
  const c1 = CC.fundir({ conhecidos: { 1: '2026-03-05', 2: '2026-03-06' } }, { conhecidos: { 2: '2026-03-01', 3: '2026-03-07' } }).conhecidos;
  checar(c1['1'] === '2026-03-05' && c1['2'] === '2026-03-01' && c1['3'] === '2026-03-07',
    'conhecidos: união por dia, e no mesmo dia vale a data mais antiga (quando a pessoa terminou de verdade)');
  const datas = CC.datasFeitas({ marcadoEm: { 1: '2026-03-01' }, licoesEm: {}, conhecidos: { 1: '2026-03-02', 2: '2026-03-03' } });
  checar(datas.has('2026-03-02') && datas.has('2026-03-03') && datas.size === 3, 'datasFeitas conta também os dias do Conhecer Jesus');
}

// --- versículos: referência, marca-texto e notas (04e-versiculos.js) ---
for (const f of ['02b-jogo.js', '04e-versiculos.js', '06-explorar.js']) {
  runInContext(readFileSync(join(AQUI, 'src', 'app', f), 'utf8'), contexto, { filename: f });
}
{
  const r = CC.lerRef('1 João 4.7-8');
  checar(r && r.livro === '1 João' && r.cap === 4 && r.de === 7 && r.ate === 8 && CC.lerRef('Salmos 23.1').livro === 'Salmos',
    'a referência lê livro com número, Salmos e trecho');
  checar(!CC.lerRef('João 3.16-30') && !CC.lerRef('João 3.18-16') && !CC.lerRef('João 3') && CC.escreverRef('João', 3, 16, 18) === 'João 3.16-18',
    'trecho acima de 10 versículos, invertido ou sem versículo não vale; escrever devolve o mesmo formato');
  checar(CC.conferirNovidade('versiculo', { ref: 'João 3.16-18' }, null, '2026-03-01') && !CC.conferirNovidade('versiculo', { ref: 'João 3.1-36' }, null, '2026-03-01')
    && !CC.conferirNovidade('versiculo', { ref: 'Livro Nenhum 1.1' }, null, '2026-03-01'),
    'o Juntos aceita trecho de até 10 versículos de um livro que existe');

  const agora = Date.now();
  const a = { atualizadoEm: 10, marcas: { 'João 3:16': { cor: 2, em: agora - 1000 }, 'João 3:17': { cor: 1, em: agora - 5000 } } };
  const b = { atualizadoEm: 20, marcas: { 'João 3:16': { cor: 0, em: agora - 500 }, 'João 3:17': { cor: 3, em: agora - 9000 },
    'Rute 1:16': { cor: 0, em: agora - 100 * 864e5 }, 'Rute 1:17': { cor: 4, em: agora - 100 * 864e5 } } };
  const m = CC.fundir(a, b).marcas;
  checar(m['João 3:16'].cor === 0 && m['João 3:17'].cor === 1, 'marca-texto: vale a mudança mais recente, e apagar num aparelho não volta pelo outro');
  checar(!m['Rute 1:16'] && m['Rute 1:17'].cor === 4, 'marca apagada há mais de 90 dias some; marca antiga de verdade fica');
  checar(JSON.stringify(CC.fundir(a, b).marcas) === JSON.stringify(CC.fundir(b, a).marcas), 'a fusão das marcas dá o mesmo nos dois sentidos');

  // --- minha história com Deus: fusão pelo "em" mais recente, sem misturar campos ---
  const h1 = { antes: 'era perdido', encontro: 'numa célula', hoje: 'tenho paz', em: 1000 };
  const h2 = { antes: 'outra versão', encontro: 'outro jeito', hoje: 'outra coisa', em: 2000 };
  checar(CC.fundir({ historia: h1 }, { historia: h2 }).historia === h2, 'a história mais recente (maior "em") vence inteira, sem misturar campos');
  checar(CC.fundir({ historia: h2 }, { historia: h1 }).historia === h2, 'a fusão da história dá o mesmo resultado nos dois sentidos');
  checar(CC.fundir({ historia: h1 }, { historia: null }).historia === h1, 'sem história no outro lado, a que existe se mantém');
  checar(CC.fundir({}, {}).historia === undefined || CC.fundir({}, {}).historia === null, 'sem história nos dois lados, continua vazia');

  const E = CC.estado();
  E.marcas = { 'João 3:16': { cor: 2, em: 3 }, 'João 3:17': { cor: 2, em: 4 }, 'João 3:18': { cor: 1, em: 5 }, 'João 3:19': { cor: 0, em: 6 } };
  E.anotacoes = { 'nota:x': 'outra' };
  E.notas = CC.migrarNotas({ atualizadoEm: 1000, anotacoes: { 'verso:João 3.16-18': 'Deus amou primeiro.', 'verso:Rute 1.16': '  ' } }).notas;
  const marcados = CC.versiculos.marcados();
  checar(marcados.length === 2 && marcados.some((t) => t.ref === 'João 3.16-17' && t.cor === 2) && marcados.some((t) => t.ref === 'João 3.18' && t.cor === 1),
    'os marcados juntam versículos seguidos da mesma cor num trecho e ignoram marca apagada');
  checar(CC.notas().length === 1 && CC.notas()[0].versos[0] === 'João 3.16-18', 'nota vazia do formato antigo não vira nota');
  const an = CC.minhasAnotacoes();
  checar(!an.porNota.some((n) => /verso/.test(n.titulo + n.chave)) && an.porNota.some((n) => n.chave === 'nota:x'),
    'as anotações do Explorar continuam à parte, sem as notas de versículo');
  checar(CC.meusTextos().some((t) => t.texto === 'Deus amou primeiro.' && t.href === '#/perfil/anotacoes'), 'a busca do Explorar acha o texto das notas');
  const id = CC.gravarNota(null, { versos: ['Salmos 23.1'], tipo: 'oracao', texto: 'Pela prova', tags: ['paz'], cor: 2 });
  CC.responderOracao(id, true);
  CC.fixarNota(id, true);
  const exp = CC.montarExportacao();
  checar(exp.includes('## Notas nos versículos') && exp.includes('### João 3.16-18') && !exp.includes('verso:'), 'o arquivo baixado leva as notas de versículo com a referência como título');
  checar(exp.includes('## Orações') && /respondida em \d{4}-\d\d-\d\d/.test(exp) && exp.includes('#paz') && exp.includes('fixada')
    && exp.includes('## Versículos marcados') && /João 3\.16-17 \(verde/.test(exp), 'o arquivo leva orações (respondida, tags, fixada) e os versículos marcados com a cor e a data');
  E.marcas = {};
  E.anotacoes = {};
  E.notas = {};
}

// --- notas: modelo, migração, fusão por nota e lixeira (02-estado.js) ---
{
  const E = CC.estado();
  E.notas = {};
  const vazio = { atualizadoEm: 1, notas: {} };
  // migração: as chaves "verso:" viram notas com id fixo, sem perder nada
  const antigo = CC.normalizarEstado({ atualizadoEm: 5000, anotacoes: { 'verso:João 3.16': 'Deus amou', 'verso:Rute 1.16': 'Teu povo', 'nota:x': 'fica', 'verso:Jó 1.1': ' ' } });
  const nj = antigo.notas['v:João 3.16'];
  checar(nj && nj.texto === 'Deus amou' && nj.tipo === 'nota' && nj.versos[0] === 'João 3.16' && nj.criadaEm === 5000 && nj.editadaEm === 5000 && !nj.apagadaEm
    && antigo.notas['v:Rute 1.16'].texto === 'Teu povo' && Object.keys(antigo.notas).length === 2, 'migração: cada nota antiga com texto vira uma nota, com a data do estado');
  checar(antigo.anotacoes['nota:x'] === 'fica' && !Object.keys(antigo.anotacoes).some((k) => k.startsWith('verso:')), 'migração: as anotações do Explorar ficam e as chaves "verso:" saem');
  const deNovo = CC.normalizarEstado(antigo);
  checar(JSON.stringify(deNovo.notas) === JSON.stringify(antigo.notas), 'migração: migrar de novo não muda nada');
  // um aparelho velho, que ainda manda o formato antigo, cai na mesma nota (mesmo id)
  const velho = { atualizadoEm: 4000, anotacoes: { 'verso:João 3.16': 'Deus amou' } };
  const f1 = CC.fundir(antigo, velho);
  checar(Object.keys(f1.notas).length === 2 && f1.notas['v:João 3.16'].texto === 'Deus amou', 'migração: o aparelho velho e o novo dão a mesma nota, sem duplicar');
  // fusão por nota: vence a editada por último, cada uma por si
  const n = (texto, editadaEm, extra) => ({ versos: ['João 3.16'], tipo: 'nota', texto, tags: [], cor: 0, fixada: false, respondidaEm: 0, criadaEm: 1, editadaEm, apagadaEm: 0, ...extra });
  const agora = Date.now();
  const cel = { atualizadoEm: agora, notas: { a: n('a do celular, nova', agora - 10), b: n('b do celular, velha', agora - 900) } };
  const pc = { atualizadoEm: agora - 5000, notas: { a: n('a do pc, velha', agora - 800), b: n('b do pc, nova', agora - 20), c: n('só no pc', agora - 30) } };
  const f2 = CC.fundir(cel, pc);
  checar(f2.notas.a.texto === 'a do celular, nova' && f2.notas.b.texto === 'b do pc, nova' && f2.notas.c.texto === 'só no pc',
    'fusão por nota: cada nota fica com a edição mais recente, mesmo vindo do estado mais velho');
  checar(JSON.stringify(f2.notas) === JSON.stringify(CC.fundir(pc, cel).notas), 'fusão por nota: dá o mesmo nos dois sentidos');
  // apagar é marca, não texto vazio: o outro aparelho não traz de volta
  const apagada = { atualizadoEm: agora - 9000, notas: { a: n('a do celular, nova', agora - 5, { apagadaEm: agora - 5 }) } };
  const f3 = CC.fundir(cel, apagada);
  checar(f3.notas.a.apagadaEm && f3.notas.a.texto === 'a do celular, nova', 'apagar: a marca de apagada vence a cópia viva e o texto fica para recuperar');
  const velhaApagada = { notas: { a: n('x', agora - 31 * 864e5, { apagadaEm: agora - 31 * 864e5 }), z: n('y', agora - 91 * 864e5, { apagadaEm: agora - 91 * 864e5 }) } };
  const f4 = CC.fundir(vazio, velhaApagada);
  checar(f4.notas.a && f4.notas.a.texto === '' && f4.notas.a.versos.length === 0 && !f4.notas.z,
    'lixeira: depois de 30 dias o texto some e fica só a lápide; depois de 90 a lápide também');
  checar(CC.fundir(f4, { notas: { a: n('voltou?', agora - 40 * 864e5) } }).notas.a.texto === '', 'lixeira: a lápide impede um aparelho velho de trazer a nota de volta');
  // as funções do app
  const id = CC.gravarNota(null, { versos: ['João 3.16-17', 'Romanos 5.8'], tipo: 'estudo', texto: '  Deus amou primeiro  ', tags: ['graça', 'graça'.repeat(20)], cor: 1 });
  const g = CC.nota(id);
  checar(g.texto === 'Deus amou primeiro' && g.versos.length === 2 && g.tipo === 'estudo' && g.cor === 1 && g.tags[1].length === 30 && g.criadaEm > 0 && g.editadaEm >= g.criadaEm,
    'gravar: nota nova com vários versículos, tipo, cor, tags (cortadas em 30) e datas');
  const antes = g.editadaEm;
  CC.gravarNota(id, { texto: 'editada' });
  checar(CC.nota(id).texto === 'editada' && CC.nota(id).editadaEm > antes && CC.nota(id).criadaEm === g.criadaEm && CC.nota(id).versos.length === 2, 'editar: muda o texto, avança editadaEm e guarda o resto');
  checar(CC.fixarNota(id, true) && CC.nota(id).fixada, 'fixar: a nota vai para o topo');
  for (let i = 0; i < 5; i++) CC.fixarNota(CC.gravarNota(null, { texto: 'f' + i }), true);
  checar(CC.notas().filter((x) => x.fixada).length === CC.MAX_FIXADAS && !CC.fixarNota(CC.gravarNota(null, { texto: 'mais uma' }), true), 'fixar: no máximo 5 fixadas');
  const o = CC.gravarNota(null, { tipo: 'oracao', texto: 'pela prova' });
  CC.responderOracao(o, true);
  checar(CC.nota(o).respondidaEm > 0, 'oração: marcar como respondida guarda a data');
  CC.responderOracao(o, false);
  checar(!CC.nota(o).respondidaEm, 'oração: dá para desmarcar');
  CC.apagarNota(id);
  checar(!CC.notas().some((x) => x.id === id) && CC.notasApagadas().some((x) => x.id === id) && !CC.nota(id).fixada, 'apagar: sai da lista, vai para Apagadas e deixa de ser fixada');
  CC.recuperarNota(id);
  checar(CC.notas().some((x) => x.id === id) && !CC.notasApagadas().length, 'recuperar: volta para a lista');
  CC.apagarNota(id);
  CC.apagarNotaDeVez(id);
  checar(!CC.notasApagadas().length && CC.nota(id).apagadaEm && CC.nota(id).texto === '', 'apagar de vez: fica só a lápide, sem texto');
  // limpeza do que vem de fora
  const sujo = CC.normalizarEstado({ atualizadoEm: 1, notas: { q: { versos: ['x'.repeat(80), 'João 1.1', 3], tipo: 'hack', texto: 5, tags: [1, 'ok'], cor: 9 }, r: null } });
  checar(sujo.notas.q.tipo === 'nota' && sujo.notas.q.versos.length === 1 && sujo.notas.q.texto === '' && sujo.notas.q.tags.join() === 'ok' && sujo.notas.q.cor === 0 && !('r' in sujo.notas),
    'o que chega de fora é limpo: tipo, versículos, texto, tags e cor');
  checar(CC.normalizarEstado({ atualizadoEm: 1, notas: { q: { texto: 'enc:AAA', tags: 'enc:BBB' } } }).notas.q.tags === 'enc:BBB', 'tags cifradas no servidor (texto) passam sem ser estragadas');
  // apagar todas, sem apagar a conta
  CC.marcar(['João 3:16'], 2);
  CC.gravarRegistro(3, { o: 'obs', i: '', a: '', oracao: '' });
  CC.gravarAnotacao('nota:x', 'explorar');
  CC.apagarTodasAnotacoes();
  checar(!CC.notas().length && !CC.notasApagadas().length && !CC.marcas().length && !CC.temRegistro(3) && !CC.anotacao('nota:x') && CC.estado().lidos,
    'apagar todas: notas, marcas, reflexões e anotações somem; o resto do progresso fica');
  // a conquista conta notas em versículo, sem ler o texto
  const conta = CC.CONQUISTAS.find((c) => c.id === 'notas').valor;
  checar(conta({ notas: { a: n('x', 1), b: n('y', 1, { apagadaEm: 2 }), c: { ...n('z', 1), versos: [] } }, anotacoes: { 'verso:Jó 1.1': 'velha' } }) === 2,
    'a conquista do caderno conta as notas vivas em versículo (e as do formato antigo)');
  E.notas = {}; E.marcas = {}; E.oia = {}; E.anotacoes = {};
}

// --- frases do carimbo da ofensiva (01c-arte.js) ---
runInContext(readFileSync(join(AQUI, 'src', 'app', '01c-arte.js'), 'utf8'), contexto, { filename: '01c-arte.js' });
{
  const frases = CC.FRASES_OFENSIVA;
  const biblias = ['nbv', 'blivre'].map((s) => JSON.parse(readFileSync(join(AQUI, 'conteudo', 'biblias', s + '.json'), 'utf8')));
  const longas = frases.filter((f) => (!f.linhas.length && !f.arte) || f.linhas.length > 6 || f.linhas.some((l) => l.length > 20));
  const refsRuins = frases.filter((f) => f.ref && (() => {
    const r = CC.lerRef(f.ref);
    return !r || biblias.some((b) => ((b.livros[r.livro] || [])[r.cap - 1] || []).slice(r.de - 1, r.ate).filter(Boolean).length !== r.ate - r.de + 1);
  })());
  checar(frases.length === 37 && !longas.length, 'as 37 frases da ofensiva cabem no carimbo (até 6 linhas de até 20 letras)'
    + (longas.length ? ' (' + longas.map((f) => f.linhas[0]).join(', ') + ')' : ''));
  checar(!refsRuins.length, 'toda frase da ofensiva com referência aponta para versículos que existem nas duas Bíblias'
    + (refsRuins.length ? ' (' + refsRuins.map((f) => f.ref).join(', ') + ')' : ''));
  let repetiu = false;
  let antes = null;
  for (let i = 0; i < 400; i++) { const f = CC.fraseDaOfensiva(); if (f === antes) repetiu = true; antes = f; }
  checar(!repetiu, 'o sorteio da ofensiva nunca repete a frase da vez anterior');
  let semTexto = false;
  for (let i = 0; i < 400; i++) if (!CC.fraseDaOfensiva({ comTexto: true }).linhas.length) semTexto = true;
  checar(!semTexto, 'o fim da lição (comTexto) nunca sorteia a frase que é só arte');
}

// --- imagem de story (01d-story.js): nomes, texto junto e a frase do estágio no carimbo ---
runInContext(readFileSync(join(AQUI, 'src', 'app', '01d-story.js'), 'utf8'), contexto, { filename: '01d-story.js' });
{
  const S = CC.story;
  checar(S.L === 1080 && S.A === 1920 && S.SEGURA === 250, 'a imagem de story tem 1080x1920 e área segura de 250px em cima e embaixo');
  checar(S.nomeDoArquivo({ tipo: 'ofensiva', dias: 16 }) === 'geracao-eleita-ofensiva-16-dias.png'
    && S.nomeDoArquivo({ tipo: 'ofensiva', dias: 1 }) === 'geracao-eleita-ofensiva-1-dia.png',
  'o arquivo da ofensiva se chama geracao-eleita-ofensiva-N-dias.png (1 dia no singular)');
  checar(S.nomeDoArquivo({ tipo: 'versiculo', ref: '1 Coríntios 13.4-7' }) === 'geracao-eleita-1-corintios-13-4-7.png',
    'o arquivo do versículo leva a referência sem acento (' + S.nomeDoArquivo({ tipo: 'versiculo', ref: '1 Coríntios 13.4-7' }) + ')');
  checar(/16 dias.*geracaoeleita\.app/.test(S.textoDe({ tipo: 'ofensiva', dias: 16 })) && /^João 3\.16 \(NBV\).*geracaoeleita\.app/.test(S.textoDe({ tipo: 'versiculo', ref: 'João 3.16', traducao: 'NBV' })),
    'o texto que vai junto com a imagem tem a contagem ou a referência e o endereço do app');
  // A frase do estágio (sem linhas prontas) quebrada como o carimbo: nenhuma palavra perdida,
  // linhas parecidas, nenhuma palavra sozinha numa ponta.
  const ruins = CC.ESTAGIOS_CHAMA.filter((e) => {
    const linhas = S.linhasDoCarimbo(e.frase);
    const tam = linhas.map((l) => l.length);
    return linhas.join(' ') !== e.frase.split(/\s+/).join(' ') || Math.max(...tam) > 28
      || (linhas.length > 1 && (linhas[0].split(' ').length < 2 || linhas[linhas.length - 1].split(' ').length < 2));
  });
  checar(!ruins.length, 'a frase de cada estágio da chama quebra em linhas de carimbo equilibradas, sem palavra sozinha'
    + (ruins.length ? ' (' + ruins.map((e) => S.linhasDoCarimbo(e.frase).join(' / ')).join('; ') + ')' : ''));
}

// --- modelos de story das frases com arte própria (01e-story-artes.js) ---
runInContext(readFileSync(join(AQUI, 'src', 'app', '01e-story-artes.js'), 'utf8'), contexto, { filename: '01e-story-artes.js' });
{
  const S = CC.story;
  const comArte = CC.FRASES_OFENSIVA.filter((f) => f.arte);
  const sem = comArte.filter((f) => typeof S.artes[f.arte] !== 'function' || S.arteDaFrase({ linhas: f.linhas, ref: f.ref || '' }) !== f.arte);
  checar(comArte.length === 16 && !sem.length, 'as 16 frases com arte têm modelo de story e o pedido da folha chega a ele'
    + (sem.length ? ' (' + sem.map((f) => f.arte).join(', ') + ')' : ''));
  checar(S.arteDaFrase({ linhas: ['Geração', 'inconformada'], ref: '' }) === null && S.arteDaFrase({ linhas: ['Luz do', 'mundo'], ref: 'Mateus 5.14' }) === 'luz',
    'frase sem arte usa o modelo de sempre; "Luz do mundo" usa o da lâmpada');
}

// --- quebra de linhas e tamanho de letra do cartão de versículo (01c-arte.js) ---
{
  // Régua sintética: cada letra "pesa" o mesmo tanto (0.56 do tamanho da fonte), como uma
  // fonte monoespaçada. Não precisa ser exata: só precisa crescer com o tamanho da fonte e
  // com o comprimento do texto, do jeito que um medidor de canvas de verdade se comporta.
  const medir = (t, f) => t.length * f * 0.56;

  const curto = CC.ajustarTextoCartao('Deus é amor', { larguraMax: 900, alturaMax: 1200, fonteMax: 90, medir });
  checar(curto.linhas.length === 1 && curto.tamanho === 90, 'texto curto cabe numa linha só, no tamanho máximo (' + curto.linhas.length + ' linha(s), ' + curto.tamanho + 'px)');

  const versiculo = 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna';
  const medio = CC.ajustarTextoCartao(versiculo, { larguraMax: 900, alturaMax: 1200, fonteMax: 90, medir });
  checar(medio.linhas.length > 1, 'um versículo mais longo quebra em várias linhas (' + medio.linhas.length + ')');
  checar(medio.linhas.every((l) => medir(l, medio.tamanho) <= 900 + 0.01), 'nenhuma linha passa da largura máxima, no tamanho escolhido');
  checar(medio.linhas.length * medio.tamanho * 1.25 <= 1200 + 0.01, 'o bloco inteiro cabe na altura máxima');

  // Trecho bem mais longo, numa caixa pequena: a letra tem que encolher bem mais que no caso médio.
  const longo = 'Palavras '.repeat(80).trim();
  const pequeno = CC.ajustarTextoCartao(longo, { larguraMax: 700, alturaMax: 500, fonteMax: 90, medir });
  checar(pequeno.tamanho < medio.tamanho, 'um trecho bem mais longo, numa caixa menor, encolhe mais que o do caso médio (' + pequeno.tamanho.toFixed(1) + ' < ' + medio.tamanho.toFixed(1) + ')');
  checar(pequeno.tamanho >= 90 * 0.35 - 0.01, 'a letra nunca encolhe além do tamanho mínimo (35% do máximo)');
  checar(pequeno.linhas.join(' ') === longo, 'quebrar em linhas não perde nem repete nenhuma palavra');

  checar(CC.ajustarTextoCartao('', { larguraMax: 900, alturaMax: 1200, fonteMax: 90, medir }).linhas.length === 0, 'texto vazio não gera linha nenhuma');
}

// --- trilhas do leitor ---
let trilhaErrada = 0;
for (const d of D.plano) {
  const at = CC.trechosDaTrilha(d, 'antigo');
  const nt = CC.trechosDaTrilha(d, 'novo');
  if (at.length + nt.length !== d.trechos.length) trilhaErrada++;
  if (at.some((t) => !d.antigo.includes(t.livro)) || nt.some((t) => !d.novo.includes(t.livro))) trilhaErrada++;
}
checar(trilhaErrada === 0, 'o leitor separa cada dia nas trilhas do Antigo e do Novo Testamento (' + trilhaErrada + ')');

// --- célula: rodízio de "ore hoje por" (08b-propositos.js) ---
runInContext(readFileSync(join(AQUI, 'src', 'app', '08-amigos.js'), 'utf8'), contexto, { filename: '08-amigos.js' });
runInContext(readFileSync(join(AQUI, 'src', 'app', '08b-propositos.js'), 'utf8'), contexto, { filename: '08b-propositos.js' });
{
  const gente = [{ usuario: 'ana', nome: 'Ana' }, { usuario: 'bia', nome: 'Bia' }, { usuario: 'caio', nome: 'Caio' },
    { usuario: 'davi', nome: 'Davi' }, { usuario: 'eva', nome: 'Eva' }];
  const alfabetica = gente.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const r1 = CC.oreHojePor(gente, '2026-01-01', gente.length);
  checar(r1.length === 2, 'célula de até 12 membros: o rodízio sugere 2 nomes');
  const r2 = CC.oreHojePor(gente, '2026-01-01', 13);
  checar(r2.length === 3, 'célula com mais de 12 membros: o rodízio sugere 3 nomes');
  // Dia do ano 1 (2026-01-01), quantidade 2, total 5: índice inicial (1 * 2) % 5 = 2.
  checar(r1[0].usuario === alfabetica[2].usuario && r1[1].usuario === alfabetica[3].usuario,
    'o índice inicial é (dia do ano × quantidade) % total, em ordem alfabética');
  const outroDia = CC.oreHojePor(gente, '2026-03-01', gente.length);
  checar(JSON.stringify(outroDia) !== JSON.stringify(r1), 'dias diferentes tendem a sugerir gente diferente');
  const mesmoDiaDeNovo = CC.oreHojePor(gente, '2026-01-01', gente.length);
  checar(JSON.stringify(mesmoDiaDeNovo) === JSON.stringify(r1), 'o mesmo dia sempre devolve a mesma sugestão (determinístico, nada gravado)');
  checar(CC.oreHojePor([], '2026-01-01', 0).length === 0, 'sem candidatos, não há o que sugerir');
  checar(CC.oreHojePor([{ usuario: 'so', nome: 'Só' }], '2026-01-01', 1).length === 1, 'com um candidato só, a sugestão é ele mesmo');
}

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

// ---------- idade mínima (LGPD art. 14) e consentimento sobre dado de fé (LGPD art. 11) ----------
checar(somaAnos('2024-02-29', -1) === '2023-02-28', 'somaAnos joga 29 de fevereiro para 28 num ano sem esse dia');
checar(idadeMinimaOk('2000-01-01', '2012-01-01') && !idadeMinimaOk('2000-01-02', '2012-01-01'),
  'idadeMinimaOk compara direitinho o dia do aniversário');

const hojeTeste = hojeNoFuso(FUSO_PADRAO);
const nasc11anos = somaAnos(hojeTeste, -(IDADE_MINIMA - 1));
const nasc12anos = somaAnos(hojeTeste, -IDADE_MINIMA);

let erroIdade = '';
try {
  await contas.criar({ usuario: 'crianca', senha: '12345678', nome: 'Crianca', email: 'crianca@x.com', nascimento: nasc11anos, consentimento: true });
} catch (e) { erroIdade = e.message; }
checar(erroIdade === 'o Geração Eleita é para quem tem 12 anos ou mais', 'com 11 anos, o cadastro é recusado pela idade');
await contas.criar({ usuario: 'douze', senha: '12345678', nome: 'Doze', email: 'doze@x.com', nascimento: nasc12anos, consentimento: true });
checar(!!contas.achar('douze'), 'com exatamente 12 anos completados hoje, o cadastro passa');

let erroConsentimento = '';
try {
  await contas.criar({ usuario: 'semsim', senha: '12345678', nome: 'SemSim', email: 'semsim@x.com', nascimento: nasc12anos });
} catch (e) { erroConsentimento = e.message; }
checar(erroConsentimento === 'para criar a conta, é preciso concordar com o uso dos dados sobre a sua fé', 'sem marcar o consentimento, o cadastro é recusado');
const comSim = await contas.criar({ usuario: 'comsim', senha: '12345678', nome: 'ComSim', email: 'comsim@x.com', nascimento: nasc12anos, consentimento: true });
checar(contas.consentiu(comSim), 'com o consentimento marcado, a conta nasce com consentiu() verdadeiro');

const antiga = await contas.criar({ usuario: 'antiga', senha: '12345678' }, { exigirPerfil: false });
checar(!contas.consentiu(antiga), 'conta importada sem exigirPerfil nasce sem consentimento');
await contas.registrarConsentimento('antiga');
checar(contas.consentiu(contas.achar('antiga')), 'registrarConsentimento liga o consentimento numa conta antiga');

await contas.salvar();
const contasRecarregadas = await new Contas(arquivoContas).carregar();
checar(contasRecarregadas.consentiu(contasRecarregadas.achar('comsim')) && contasRecarregadas.consentiu(contasRecarregadas.achar('antiga')),
  'o consentimento sobrevive a salvar e recarregar do banco');

let erro = '';
try { await contas.criar({ usuario: 'dora', senha: '12345678', nome: 'Dora' }); } catch (e) { erro = e.message; }
checar(/e-mail/.test(erro), 'cadastro sem e-mail é recusado');
await contas.criar({ usuario: 'dora', senha: '12345678', nome: 'Dora', email: 'Dora@X.com', nascimento: '2001-02-03', consentimento: true });
checar(!!(await contas.conferir('dora@x.com', '12345678')), 'entra com o e-mail, sem diferenciar maiúsculas');
for (const u of ['ana', 'bia', 'caio']) await contas.completarPerfil(u, { email: u + '@x.com', nascimento: '2000-01-01' });

// ---------- data de nascimento travada e e-mail só com a senha ----------
{
  const tentar = async (f) => { try { await f(); return ''; } catch (e) { return e.message + '|' + e.codigo; } };
  checar(/não muda depois do cadastro.*suporte\|403/.test(await tentar(() => contas.completarPerfil('dora', { nascimento: '1990-05-05' }))),
    'depois do cadastro, a data de nascimento não muda (403, "fale com o suporte")');
  checar(await tentar(() => contas.completarPerfil('dora', { nascimento: '2001-02-03', email: 'dora@x.com' })) === ''
    && contas.achar('dora').nascimento === '2001-02-03', 'mandar a mesma data e o mesmo e-mail de novo é aceito sem senha');
  checar(/não muda depois do cadastro/.test(await tentar(() => contas.completarPerfil('dora', { nascimento: nasc12anos }, { senhaConferida: true }))),
    'nem com a senha conferida a data muda (trocar para menor de idade também é recusado)');
  checar(contas.achar('dora').nascimento === '2001-02-03', 'a data gravada continua a do cadastro');
  checar(contas.trocaEmail('dora', 'outra@x.com') && !contas.trocaEmail('dora', 'DORA@x.com') && !contas.trocaEmail('dora', ''),
    'trocaEmail só é verdadeiro quando o e-mail novo é outro');
  checar(/senha atual\|403/.test(await tentar(() => contas.completarPerfil('dora', { email: 'outra@x.com' }))),
    'trocar o e-mail sem a senha conferida é recusado');
  checar(contas.achar('dora').email === 'dora@x.com', 'o e-mail continua o antigo');
  await contas.completarPerfil('dora', { email: 'outra@x.com' }, { senhaConferida: true });
  checar(contas.achar('dora').email === 'outra@x.com' && contas.achar('dora').nascimento === '2001-02-03',
    'com a senha conferida, o e-mail troca e o nascimento fica');
  await contas.completarPerfil('dora', { email: 'dora@x.com' }, { senhaConferida: true });
  const semNasc = await contas.criar({ usuario: 'semnasc', senha: '12345678', email: 'semnasc@x.com' }, { exigirPerfil: false });
  checar(!semNasc.nascimento, 'conta antiga pode não ter nascimento');
  checar(/12 anos/.test(await tentar(() => contas.completarPerfil('semnasc', { nascimento: nasc11anos }))), 'completar com menos de 12 anos é recusado');
  await contas.completarPerfil('semnasc', { nascimento: '1999-09-09' });
  checar(contas.achar('semnasc').nascimento === '1999-09-09' && contas.achar('semnasc').email === 'semnasc@x.com',
    'quem não tinha a data completa uma vez, sem senha, e o e-mail que já tinha fica');
  checar(/não muda depois do cadastro/.test(await tentar(() => contas.completarPerfil('semnasc', { nascimento: '1998-08-08' }))),
    'completada uma vez, a data também trava');
  await contas.apagar('semnasc');
}
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
  await contas.criar({ usuario: u, senha: '12345678', nome: u, email: u + '@x.com', nascimento: '2000-01-01', consentimento: true });
  await contas.pedir(u, 'ana', '2026-03-01');
  await contas.aceitar('ana', u, '2026-03-01');
}
checar(contas.ativasDe('ana') === 8, 'amigos sem limite: a Ana passa de 5 (' + contas.ativasDe('ana') + ')');

const conviteDaAna = contas.gerarConvite('ana', assinar);
await contas.criar({ usuario: 'novo1', senha: '12345678', nome: 'Novo', email: 'novo1@x.com', nascimento: '2000-01-01', consentimento: true });
await contas.usarConvite('novo1', conviteDaAna.token, assinar, '2026-03-03', Date.now(), { contaNova: true });
checar(contas.achar('novo1').convidadoPor === 'ana' && contas.semeadorDe('ana') === 0,
  'quem cria a conta pelo link fica anotado, mas só conta depois da primeira lição');
await contas.ativarConvidado('novo1');
checar(contas.semeadorDe('ana') === 1, 'feita a primeira lição, a pessoa conta para quem convidou');
await contas.apagar('novo1');
checar(contas.semeadorDe('ana') === 0, 'conta apagada deixa de contar');

// ---------- conhecer jesus: convite com modo ----------
const conviteConhecer = contas.gerarConvite('ana', assinar, Date.now(), { modo: 'conhecer' });
checar(contas.lerConvite(conviteConhecer.token, assinar).modo === 'conhecer' && contas.lerConvite(convite.token, assinar).modo === '',
  'lerConvite devolve o modo do convite; o convite comum não tem modo');
await contas.criar({ usuario: 'novo2', senha: '12345678', nome: 'Novo2', email: 'novo2@x.com', nascimento: '2000-01-01', consentimento: true });
await contas.usarConvite('novo2', conviteConhecer.token, assinar, '2026-03-04', Date.now(), { contaNova: true });
checar(contas.achar('novo2').caminho === 'conhecer' && contas.achar('novo2').acompanhadoPor === 'ana',
  'o convite "conhecer" põe a conta nova nos 14 dias e anota quem convidou');
checar(!contas.duplaPlano('novo2', 'ana'), 'quem entra pelo convite "conhecer" não ganha a dupla de leitura do plano');
checar(contas.relacao('novo2', 'ana') === 'amigos', 'mesmo sem dupla, a amizade nasce normal');
{
  const [carga, firma] = conviteConhecer.token.split('.');
  const dado = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8'));
  const cargaAdulterada = Buffer.from(JSON.stringify({ ...dado, m: '' })).toString('base64url');
  checar(contas.lerConvite(cargaAdulterada + '.' + firma, assinar) === null, 'trocar o modo na carga do convite invalida a assinatura');
}

checar(await contas.tocar('bia', 'dora', { hoje: '2026-03-02', euLeu: true, eleLeu: false }) === 'enviado'
  && await contas.tocar('bia', 'dora', { hoje: '2026-03-02', euLeu: true, eleLeu: false }) === 'ja', 'um toque por amigo por dia');
await contas.silenciar('dora', 'bia', true);
checar(!contas.toquesRecebidos('dora', '2026-03-02').includes('bia'), 'silenciar esconde os toques');
await contas.apagar('bia');
checar(!Object.keys(contas.dados.amizades).some((k) => k.includes('bia')), 'apagar a conta leva as amizades junto');

// ---------- menor de 18 só lidera ou auxilia célula com aprovação da liderança ----------
{
  const tentar = async (f) => { try { await f(); return ''; } catch (e) { return e.message + '|' + e.codigo; } };
  checar(menorDeIdade(somaAnos(hojeTeste, -17), hojeTeste) && !menorDeIdade(somaAnos(hojeTeste, -18), hojeTeste) && !menorDeIdade('', hojeTeste),
    'menorDeIdade: 17 anos é menor; 18 completados hoje, não; sem data, não decide');
  await contas.criar({ usuario: 'adulto', senha: '12345678', nome: 'Adulto', email: 'adulto@x.com', nascimento: '1990-01-01', consentimento: true });
  await contas.criar({ usuario: 'teen', senha: '12345678', nome: 'Teen', email: 'teen@x.com', nascimento: somaAnos(hojeTeste, -15), consentimento: true });
  const deAdulto = await contas.criarCelula('adulto', { titulo: 'Adultos' }, hojeTeste);
  checar(!deAdulto.aprovacoes.length && podeConduzir(deAdulto, 'adulto') && contas.gerarLinkCelula('adulto', deAdulto.id, assinar).token,
    'quem tem 18 ou mais cria a célula normal: conduz e manda o link');
  const deTeen = await contas.criarCelula('teen', { titulo: 'Jovens' }, hojeTeste);
  checar(deTeen.aprovacoes.length === 1 && deTeen.aprovacoes[0].estado === 'pendente' && deTeen.aprovacoes[0].papel === 'lider',
    'menor de 18 cria a célula aguardando aprovação');
  checar(!podeConduzir(deTeen, 'teen') && aguardandoAprovacao(deTeen, 'teen') === 'lider', 'enquanto espera, o menor não conduz (sem painel com nomes)');
  checar(/aguardando aprovação da liderança\|403/.test(await tentar(() => contas.gerarLinkCelula('teen', deTeen.id, assinar))), 'célula aguardando não gera link');
  checar(/aguardando aprovação da liderança\|403/.test(await tentar(() => contas.registrarEncontro('teen', deTeen.id, { data: hojeTeste, presentes: [] }, hojeTeste))),
    'nem registra presença');
  checar(contas.liderancasPendentes(hojeTeste).some((x) => x.proposito === deTeen.id && x.usuario === 'teen' && x.idade === 15),
    'o pedido aparece para o administrador, com a idade');
  await contas.decidirLideranca('dono', { proposito: deTeen.id, usuario: 'teen', papel: 'lider', aprovar: true }, hojeTeste);
  const aprov = contas.proposito(deTeen.id).aprovacoes[0];
  checar(aprov.estado === 'aprovada' && aprov.decididoPor === 'dono' && /^\d{4}-\d{2}-\d{2}T/.test(aprov.decididoEm),
    'aprovar registra quem aprovou e quando');
  checar(podeConduzir(contas.proposito(deTeen.id), 'teen') && contas.gerarLinkCelula('teen', deTeen.id, assinar).token, 'aprovado, o menor conduz e manda o link');
  checar(/não está mais pendente\|404/.test(await tentar(() => contas.decidirLideranca('dono', { proposito: deTeen.id, usuario: 'teen', papel: 'lider', aprovar: false }))),
    'um pedido decidido não se decide de novo');
  // auxiliar menor
  await contas.criar({ usuario: 'teen2', senha: '12345678', nome: 'Teen2', email: 'teen2@x.com', nascimento: somaAnos(hojeTeste, -16), consentimento: true });
  await contas.entrarNaCelula('teen2', contas.gerarLinkCelula('adulto', deAdulto.id, assinar).token, assinar, hojeTeste);
  await contas.definirAuxiliar('adulto', deAdulto.id, 'teen2', true);
  checar(aguardandoAprovacao(contas.proposito(deAdulto.id), 'teen2') === 'auxiliar' && !podeConduzir(contas.proposito(deAdulto.id), 'teen2'),
    'menor marcado como auxiliar espera a aprovação');
  await contas.decidirLideranca('dono', { proposito: deAdulto.id, usuario: 'teen2', papel: 'auxiliar', aprovar: false }, hojeTeste);
  const m2 = contas.proposito(deAdulto.id).membros.find((m) => m.usuario === 'teen2');
  checar(m2.estado === 'ativo' && m2.papel === '' && !contas.proposito(deAdulto.id).encerradoEm, 'recusar o auxiliar só tira o papel; a célula segue');
  await contas.definirAuxiliar('adulto', deAdulto.id, 'teen2', true);
  await contas.decidirLideranca('dono', { proposito: deAdulto.id, usuario: 'teen2', papel: 'auxiliar', aprovar: true }, hojeTeste);
  checar(podeConduzir(contas.proposito(deAdulto.id), 'teen2'), 'marcado de novo e aprovado, o auxiliar menor conduz');
  // recusar o líder encerra
  const outra = await contas.criarCelula('teen2', { titulo: 'Outra' }, hojeTeste);
  await contas.decidirLideranca('dono', { proposito: outra.id, usuario: 'teen2', papel: 'lider', aprovar: false }, hojeTeste);
  checar(!!contas.proposito(outra.id).encerradoEm && contas.proposito(outra.id).aprovacoes[0].estado === 'recusada', 'recusar o líder encerra a célula');
  // sobrevive ao banco
  await contas.salvar();
  const rec = await new Contas(arquivoContas).carregar();
  checar(rec.proposito(deTeen.id).aprovacoes[0].decididoPor === 'dono' && podeConduzir(rec.proposito(deAdulto.id), 'teen2'),
    'as aprovações sobrevivem a salvar e recarregar do banco');
  // célula antiga de menor, sem registro: passa a esperar ao abrir o banco
  delete rec.proposito(deTeen.id).aprovacoes;
  rec.proposito(deTeen.id).aprovacoes = [];
  await rec.salvar();
  const rec2 = await new Contas(arquivoContas).carregar();
  checar(aguardandoAprovacao(rec2.proposito(deTeen.id), 'teen') === 'lider', 'célula de menor criada antes da regra passa a aguardar aprovação');
  for (const u of ['adulto', 'teen', 'teen2']) await contas.apagar(u);
}

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

// =========================================================================
secao('painel pastoral agregado (Fase 5, seção 2)');
// =========================================================================
{
  const HOJE = '2026-04-01';
  // Uma igreja pequena de propósito: menos de 5 em quase tudo, para o "menos de 5" aparecer.
  const contasPainel = [
    { usuario: 'lider1', criadaEm: '2026-01-01', conversouEm: '' },
    { usuario: 'joao1', criadaEm: '2026-01-01', conversouEm: '' },
    { usuario: 'maria1', criadaEm: '2026-01-01', conversouEm: '2026-03-20' },
    { usuario: 'pedro1', criadaEm: '2026-01-01', conversouEm: '' },
  ];
  const setDatas = (lista) => Object.fromEntries(lista.map((d, i) => [String(i + 1), d]));
  const estadosPainel = {
    // lidos em 5 dos últimos 7 (Power of 4: entra).
    lider1: { lidos: [1, 2, 3, 4, 5], marcadoEm: setDatas(dias('2026-03-26', 5)) },
    // só 2 dos últimos 7 (não entra no Power of 4).
    joao1: { lidos: [1, 2], marcadoEm: setDatas(['2026-03-30', '2026-03-31']) },
    // conheceu os 14 dias inteiros.
    maria1: { lidos: [1], marcadoEm: { 1: '2026-03-15' }, conhecidos: setDatas(Array.from({ length: 14 }, () => '2026-03-15')) },
    // começou a conhecer, mas não terminou.
    pedro1: { lidos: [], marcadoEm: {}, conhecidos: { 1: '2026-03-10', 2: '2026-03-11' } },
  };
  const celulaPainel = {
    id: 'pc1', celula: true, encerradoEm: '', tipo: 'plano',
    mae: '', multiplicadaEm: '',
    membros: [
      { usuario: 'lider1', estado: 'ativo', papel: '', tornouMembroEm: '' },
      { usuario: 'joao1', estado: 'ativo', papel: '', tornouMembroEm: '2026-03-25' }, // virou membro há 7 dias
      { usuario: 'maria1', estado: 'ativo', papel: 'visitante', tornouMembroEm: '' },
    ],
    encontros: [
      { data: '2026-03-28', presentes: ['lider1', 'joao1'], visitantes: 3 },
      { data: '2026-01-14', presentes: ['lider1'], visitantes: 0 }, // fora das últimas 4 semanas (mais de 28 dias atrás)
    ],
  };
  const filhaPainel = {
    id: 'pc2', celula: true, encerradoEm: '', tipo: 'plano',
    mae: 'pc1', multiplicadaEm: '2026-03-20',
    membros: [{ usuario: 'pedro1', estado: 'ativo', papel: '', tornouMembroEm: '' }],
    encontros: [],
  };
  const pedidosPainel = [
    { tipo: 'oracao', estado: 'ativo', venceEm: '2026-04-10', denuncias: [] },
    { tipo: 'oracao', estado: 'removido', venceEm: '2026-04-10', denuncias: [] },
    { tipo: 'necessidade', estado: 'ativo', venceEm: '2026-04-10', denuncias: [] },
    { tipo: 'oracao', estado: 'ativo', venceEm: '2026-04-10', denuncias: [{ usuario: 'a', motivo: 'x' }, { usuario: 'b', motivo: 'y' }] },
  ];
  const discipuladosPainel = [
    { discipulador: 'lider1', discipulo: 'joao1', estado: 'ativo' },
    { discipulador: 'joao1', discipulo: 'maria1', estado: 'ativo' }, // joao1 é discípulo e discipulador: 2ª geração
    { discipulador: 'pedro1', discipulo: 'maria1', estado: 'encerrado' },
  ];

  const painel = montarPainel({
    contas: contasPainel, estados: estadosPainel, propositos: [celulaPainel, filhaPainel],
    comPush: [], hoje: HOJE, pedidos: pedidosPainel, discipulados: discipuladosPainel,
  });
  const c = painel.celulasECuidado;

  checar(c.celulasAtivas === 2, 'as duas células (mãe e filha) contam como ativas: ' + c.celulasAtivas);
  checar(c.celulasComEncontro === 1, 'só a célula mãe registrou encontro nas últimas 4 semanas: ' + c.celulasComEncontro);
  checar(c.frequenciaMedia === 5, 'frequência média do único encontro recente (2 presentes + 3 visitantes): ' + c.frequenciaMedia);
  checar(c.visitantesViraramMembros === 'menos de 5', 'com 1 pessoa (joao1), aparece "menos de 5": ' + c.visitantesViraramMembros);
  checar(c.multiplicacoes === 1, 'uma multiplicação nos últimos 12 meses: ' + c.multiplicacoes);
  checar(c.diasNaPalavra.pct === 25, 'só lider1 bate o Power of 4 entre as 4 contas ativas nos últimos 30 dias: ' + c.diasNaPalavra.pct);
  checar(c.diasNaPalavra.base === 'menos de 5', 'a base do Power of 4 também é mascarada quando pequena: ' + c.diasNaPalavra.base);
  checar(c.conhecer.comecaram === 'menos de 5' && c.conhecer.terminaram === 'menos de 5' && c.conhecer.quiseramConversar === 'menos de 5',
    'conhecer Jesus: começaram (maria1, pedro1), terminaram (maria1) e quiseram conversar (maria1) aparecem mascarados');
  checar(c.discipulado.ativos === 'menos de 5' && c.discipulado.segundaGeracao === 'menos de 5',
    '2 relações ativas e 1 de 2ª geração (joao1), mascarados por serem poucos');
  checar(c.cuidado.pedidosAtivos === 'menos de 5' && c.cuidado.denunciasAbertas === 'menos de 5',
    '2 pedidos de oração ativos e 1 denúncia aberta (2 denúncias no mesmo pedido), mascarados');

  const semNomeOuTexto = !/lider1|joao1|maria1|pedro1|@/.test(JSON.stringify(c));
  checar(semNomeOuTexto, 'a saída do painel não leva nenhum nome, @ ou texto de ninguém');

  // Com uma igreja "grande" (5 ou mais em cada conta), o número exato aparece.
  const muitos = Array.from({ length: 6 }, (_, i) => 'gente' + i);
  const contasGrandes = muitos.map((u) => ({ usuario: u, criadaEm: '2026-01-01', conversouEm: '' }));
  const estadosGrandes = Object.fromEntries(muitos.map((u) => [u, {}]));
  const celulaGrande = {
    id: 'pg1', celula: true, encerradoEm: '', tipo: 'plano', mae: '', multiplicadaEm: '',
    membros: muitos.map((u) => ({ usuario: u, estado: 'ativo', papel: '', tornouMembroEm: '2026-03-25' })),
    encontros: [],
  };
  const painelGrande = montarPainel({
    contas: contasGrandes, estados: estadosGrandes, propositos: [celulaGrande], comPush: [], hoje: HOJE, pedidos: [], discipulados: [],
  });
  checar(painelGrande.celulasECuidado.visitantesViraramMembros === 6, 'com 6 pessoas (5 ou mais), o painel mostra o número exato: ' + painelGrande.celulasECuidado.visitantesViraramMembros);

  // --- os primeiros dias de quem chega: só contagens, por idade da conta ---
  {
    const HOJE2 = '2026-04-10';
    const contasNovas = [
      { usuario: 'nova1', criadaEm: '2026-04-01', acessos: ['2026-04-01', '2026-04-02', '2026-04-04'] }, // leu nos dias 1 e 2; abriu no 4 sem ler
      { usuario: 'nova2', criadaEm: '2026-04-01', acessos: ['2026-04-01'] }, // abriu a lição no dia 1 e não terminou
      { usuario: 'nova3', criadaEm: '2026-04-05', acessos: ['2026-04-05', '2026-04-06'] }, // leu 3 dias seguidos; conta antiga sem diário
      { usuario: 'hoje1', criadaEm: HOJE2, acessos: [HOJE2] }, // criada hoje: ainda sem idade para nada
    ];
    const estadosNovos = {
      nova1: { lidos: [1, 2], marcadoEm: { 1: '2026-04-01', 2: '2026-04-02' }, diario: { '2026-04-01': { abriu: 1, leitor: 2 }, '2026-04-02': { abriu: 1, leitor: 1 } } },
      nova2: { lidos: [], marcadoEm: {}, diario: { '2026-04-01': { abriu: 1 } } },
      nova3: { lidos: [1, 2, 3], marcadoEm: { 1: '2026-04-05', 2: '2026-04-06', 3: '2026-04-07' } },
      hoje1: { lidos: [1], marcadoEm: { 1: HOJE2 }, diario: { [HOJE2]: { abriu: 1 } } },
    };
    const f = montarPainel({ contas: contasNovas, estados: estadosNovos, hoje: HOJE2 }).detalhe.primeirosDias;
    checar(f.dia1[0].contas === 3 && f.dia1[0].base === 3, 'criaram a conta há 1 dia ou mais: 3 (a de hoje fica de fora)');
    checar(f.dia1[1].contas === 3, 'abriram a lição no dia do cadastro: 3 (sem diário, conta pela leitura marcada)');
    checar(f.dia1[2].contas === 1, 'terminaram uma leitura no app no dia do cadastro: só uma');
    checar(f.dia1[3].contas === 2 && f.dia1[3].pct === 67, 'marcaram o dia como lido no dia do cadastro: 2 de 3 (67%)');
    const dia = (n) => f.dias.find((d) => d.dia === n);
    checar(dia(2).base === 3 && dia(2).abriram === 2 && dia(2).leram === 2, 'dia 2: 3 contas com idade, 2 abriram e 2 leram');
    checar(dia(4).base === 3 && dia(4).abriram === 1 && dia(4).leram === 0, 'dia 4: uma abriu o app sem ler');
    checar(dia(7).base === 2 && dia(7).abriram === 0 && dia(7).leram === 0, 'dia 7: só as contas com 7 dias completos entram');
    checar(f.semana.base === 2 && f.semana.contas === 0, 'leram 3 ou mais dos 7 primeiros dias: nenhuma das duas com idade');
    checar(!/nova1|nova2|nova3|hoje1|@/.test(JSON.stringify(f)), 'o funil dos primeiros dias não leva nome nenhum');
  }
}

// =========================================================================
secao('cofre das anotações (cofre.mjs e servidor)');
// =========================================================================
{
  const { chavesDasNotas, selarEstado, abrirEstado, migrarEstadosCifrados, ehCifrado, CAMPOS_CIFRADOS } = await import('./cofre.mjs');
  const { DatabaseSync, abrirBanco } = await import('./db.mjs');
  const { spawn } = await import('node:child_process');
  const { createServer } = await import('node:net');
  const { randomBytes } = await import('node:crypto');

  // --- a chave ---
  const lanca = (f) => { try { f(); return false; } catch { return true; } };
  checar(lanca(() => chavesDasNotas({ NODE_ENV: 'production' })), 'produção sem CAMINHO_CHAVE_NOTAS não sobe');
  checar(lanca(() => chavesDasNotas({ CAMINHO_CHAVE_NOTAS: 'curta' })), 'chave que não tem 64 hexadecimais é recusada');
  const K = chavesDasNotas({ CAMINHO_TESTE: '1' });
  checar(K.teste && K.atual.length === 32, 'em teste, sem a variável, vale a chave de teste');
  const hex1 = randomBytes(32).toString('hex');
  const hex2 = randomBytes(32).toString('hex');
  const K1 = chavesDasNotas({ NODE_ENV: 'production', CAMINHO_CHAVE_NOTAS: hex1 });
  checar(!K1.teste && K1.impressao !== K.impressao, 'produção com a chave sobe, com outra chave que a de teste');
  checar(CAMPOS_CIFRADOS.includes('notas.*.texto') && CAMPOS_CIFRADOS.includes('notas.*.tags'), 'a lista dos campos já cobre o modelo novo de notas');

  // --- selar e abrir ---
  const claro = {
    lidos: [1], marcadoEm: { 1: '2026-03-01' },
    oia: { 1: { o: 'SEGREDO-OIA', i: '', a: '', oracao: 'SEGREDO-ORACAO' }, 2: { o: '', i: '', a: '', oracao: '' } },
    anotacoes: { 'verso:João 3.16': 'SEGREDO-VERSO', 'nota:x': 'SEGREDO-NOTA', 'nota:vazia': '' },
    historia: { antes: 'SEGREDO-ANTES', encontro: '', hoje: 'SEGREDO-HOJE', em: 5 },
    notas: { n1: { tipo: 'oracao', texto: 'SEGREDO-NOTA-NOVA', tags: ['SEGREDO-TAG'], versos: ['João 3:16'] } },
    marcas: { 'João 3:16': { cor: 2, em: 1 } }, foto: 'data:image/jpeg;base64,AAAA',
  };
  const selado = selarEstado(claro, 'ana', K);
  const texto = JSON.stringify(selado);
  checar(!/SEGREDO/.test(texto), 'selado, nenhum texto privado fica em claro');
  checar(ehCifrado(selado.oia[1].o) && selado.oia[2].o === '' && selado.anotacoes['nota:vazia'] === '' && selado.historia.encontro === '',
    'cada texto vira { v, k, iv, tag, dado } e o vazio continua vazio');
  checar(selado.historia.em === 5 && selado.foto === claro.foto && selado.marcas['João 3:16'].cor === 2 && Object.keys(selado.anotacoes).length === 3,
    'a forma do progresso não muda: chaves, datas, marcas e foto ficam como estavam');
  checar(JSON.stringify(abrirEstado(selado, 'ana', K)) === JSON.stringify(claro), 'o dono abre e lê exatamente o que escreveu (também listas)');
  checar(JSON.stringify(selarEstado(selado, 'ana', K)) === texto, 'selar o que já está selado com a chave atual não muda nada');
  const outraVez = selarEstado(claro, 'ana', K);
  checar(outraVez.oia[1].o.iv !== selado.oia[1].o.iv && outraVez.oia[1].o.dado !== selado.oia[1].o.dado, 'cada gravação usa um IV novo');
  checar(lanca(() => abrirEstado(selado, 'bia', K)), 'o texto copiado para a linha de outra pessoa não abre');
  checar(lanca(() => abrirEstado(selado, 'ana', K1)), 'com outra chave não abre');
  const adulterado = JSON.parse(texto);
  const bytes = Buffer.from(adulterado.anotacoes['nota:x'].dado, 'base64');
  bytes[0] ^= 1;
  adulterado.anotacoes['nota:x'].dado = bytes.toString('base64');
  checar(lanca(() => abrirEstado(adulterado, 'ana', K)), 'dado adulterado é recusado');
  const semTag = JSON.parse(texto);
  semTag.historia.antes.tag = Buffer.alloc(16).toString('base64');
  checar(lanca(() => abrirEstado(semTag, 'ana', K)), 'prova (tag) trocada é recusada');

  // os sinais agregados não precisam decifrar
  const contasP = [{ usuario: 'ana', criadaEm: '2026-01-01' }];
  const p1 = montarPainel({ contas: contasP, estados: { ana: claro }, hoje: '2026-03-02' });
  const p2 = montarPainel({ contas: contasP, estados: { ana: selado }, hoje: '2026-03-02' });
  checar(JSON.stringify(p1) === JSON.stringify(p2), 'o painel agregado (escreveu, marcou, história) dá o mesmo com os textos cifrados');
  const conquistaVerso = (e) => (CC.conquistasComNivel(e, '2026-03-02').find((c) => c.id === 'notas') || {}).valor;
  // a nota antiga ("verso:") migra para o modelo novo: conta junto com a nota nova (n1), cifrada ou não
  checar(conquistaVerso(CC.normalizarEstado(selado)) === 2 && conquistaVerso(CC.normalizarEstado(claro)) === 2, 'a conquista das notas em versículos conta igual sem decifrar');
  const migradoSelado = CC.normalizarEstado(selado);
  checar(ehCifrado(migradoSelado.notas['v:João 3.16'].texto) && ehCifrado(migradoSelado.notas.n1.texto) && ehCifrado(migradoSelado.notas.n1.tags)
    && JSON.stringify(abrirEstado(migradoSelado, 'ana', K).notas['v:João 3.16'].texto) === '"SEGREDO-VERSO"',
  'migrar o estado cifrado (sem abrir) não estraga o envelope: a nota antiga muda de lugar e o dono a abre');

  // --- migração e rotação, direto no banco ---
  const pastaM = mkdtempSync(join(tmpdir(), 'cc-cofre-'));
  const dbM = abrirBanco(join(pastaM, 'caminho.db'));
  dbM.prepare('INSERT INTO estados (usuario, dados, atualizado_em) VALUES (?, ?, ?)').run('ana', JSON.stringify(claro), 'x');
  dbM.prepare('INSERT INTO estados (usuario, dados, atualizado_em) VALUES (?, ?, ?)').run('leo', JSON.stringify({ lidos: [2] }), 'x');
  const m1 = migrarEstadosCifrados(dbM, K1);
  const linha = () => dbM.prepare("SELECT dados FROM estados WHERE usuario = 'ana'").get().dados;
  checar(m1.cifrados === 1 && !/SEGREDO/.test(linha()), 'migração: a conta antiga tem os textos cifrados (e só ela é regravada)');
  checar(migrarEstadosCifrados(dbM, K1).cifrados === 0, 'migração idempotente: a segunda vez não muda nada');
  checar(JSON.stringify(abrirEstado(JSON.parse(linha()), 'ana', K1)) === JSON.stringify(claro), 'depois da migração o dono lê tudo de volta');
  const K2 = chavesDasNotas({ CAMINHO_CHAVE_NOTAS: hex2, CAMINHO_CHAVE_NOTAS_ANTERIOR: hex1 });
  const m2 = migrarEstadosCifrados(dbM, K2);
  checar(m2.cifrados === 1 && JSON.parse(linha()).oia[1].o.k === K2.impressao, 'rotação: com a chave nova e a anterior, tudo é recifrado com a nova');
  checar(JSON.stringify(abrirEstado(JSON.parse(linha()), 'ana', chavesDasNotas({ CAMINHO_CHAVE_NOTAS: hex2 }))) === JSON.stringify(claro),
    'rotação: depois dela a chave antiga pode sair');
  fecharBanco(join(pastaM, 'caminho.db'));
  rmSync(pastaM, { recursive: true, force: true });

  // --- o servidor de verdade ---
  const livre = (p) => new Promise((r) => { const s = createServer().once('error', () => r(false)).listen(p, '127.0.0.1', () => s.close(() => r(true))); });
  let PORTA = 0;
  for (let p = 8801; p <= 8809 && !PORTA; p++) if (await livre(p)) PORTA = p;
  const pastaS = mkdtempSync(join(tmpdir(), 'cc-cofre-srv-'));
  const base = 'http://127.0.0.1:' + PORTA;
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  let saida = '';
  const subir = (amb = {}) => {
    const s = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
      env: { ...process.env, CAMINHO_ESTADO: join(pastaS, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_ADMIN: 'chefe', CAMINHO_CHAVE_NOTAS: hex1, ...amb },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    s.stdout.on('data', (d) => { saida += d; });
    s.stderr.on('data', (d) => { saida += d; });
    return s;
  };
  const no = async () => { for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/existe-conta'); return true; } catch { await dormir(100); } } return false; };
  const parar = async (s) => { s.kill(); for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/existe-conta'); await dormir(100); } catch { return; } } };
  const pedir = (rota, corpo, cookie, metodo) => fetch(base + rota, {
    method: metodo || (corpo ? 'POST' : 'GET'),
    headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const criar = async (usuario) => {
    const r = await pedir('/api/criar-conta', { usuario, senha: 'senha-' + usuario, nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true });
    return (r.headers.get('set-cookie') || '').split(';')[0];
  };
  const arquivoDb = join(pastaS, 'caminho.db');
  const bancoBruto = () => ['', '-wal'].map((x) => (existsSync(arquivoDb + x) ? readFileSync(arquivoDb + x).toString('latin1') : '')).join('');
  const naLinha = (u, mexer) => {
    const b = new DatabaseSync(arquivoDb);
    try {
      const l = b.prepare('SELECT dados FROM estados WHERE usuario = ?').get(u);
      if (mexer) b.prepare("INSERT OR REPLACE INTO estados (usuario, dados, atualizado_em) VALUES (?, ?, 'x')").run(u, JSON.stringify(mexer(l ? JSON.parse(l.dados) : null)));
      return l && JSON.parse(l.dados);
    } finally { b.close(); }
  };

  let srv = null;
  try {
    checar(PORTA > 0, 'há uma porta livre entre 8801 e 8809 para o servidor do teste');
    // sem a chave em produção, o servidor recusa subir
    srv = subir({ NODE_ENV: 'production', CAMINHO_TESTE: '', CAMINHO_CHAVE_NOTAS: '' });
    const codigo = await new Promise((r) => { srv.once('exit', r); setTimeout(() => r('ainda vivo'), 8000); });
    checar(codigo === 1 && /CAMINHO_CHAVE_NOTAS/.test(saida), 'servidor em produção sem a chave para na subida e diz o que falta');
    if (codigo === 'ainda vivo') await parar(srv);

    srv = subir();
    checar(await no(), 'o servidor sobe com a chave');
    const ana = await criar('ana.cofre');
    const bia = await criar('bia.cofre');
    const chefe = await criar('chefe');
    const meu = { ...CC.normalizarEstado({}), atualizadoEm: Date.now(), lidos: [1], marcadoEm: { 1: hojeNoFuso(FUSO_PADRAO) },
      oia: { 1: { o: 'SEGREDO-OIA-ANA', i: '', a: '', oracao: 'SEGREDO-ORACAO-ANA' } },
      anotacoes: { 'verso:João 3.16': 'SEGREDO-VERSO-ANA', 'nota:x': 'SEGREDO-NOTA-ANA' },
      historia: { antes: 'SEGREDO-HISTORIA-ANA', encontro: '', hoje: '', em: Date.now() } };
    checar((await pedir('/api/estado', meu, ana, 'PUT')).status === 200, 'o dono grava as anotações');
    checar(!/SEGREDO/.test(bancoBruto()), 'o arquivo do banco (com o WAL) não tem o texto em claro');
    const lido = await (await pedir('/api/estado', null, ana)).json();
    checar(lido.oia[1].oracao === 'SEGREDO-ORACAO-ANA' && lido.notas['v:João 3.16'].texto === 'SEGREDO-VERSO-ANA' && lido.anotacoes['nota:x'] === 'SEGREDO-NOTA-ANA'
      && !lido.anotacoes['verso:João 3.16'] && lido.historia.antes === 'SEGREDO-HISTORIA-ANA',
      'o dono lê de volta, em claro, pelo /api/estado');
    const outro = await (await pedir('/api/estado', null, bia)).text();
    checar(!/SEGREDO/.test(outro), 'outra pessoa não obtém o texto');
    const painel = await pedir('/api/painel', null, chefe);
    checar(painel.status === 200 && !/SEGREDO/.test(await painel.text()), 'o admin vê o painel, sem texto nenhum');
    // a fusão entre aparelhos continua: outro aparelho manda só uma anotação nova
    const outroAparelho = { ...CC.normalizarEstado({}), atualizadoEm: Date.now() + 1000, anotacoes: { 'nota:y': 'SEGREDO-NOVA' } };
    await pedir('/api/estado', outroAparelho, ana, 'PUT');
    const fundido = await (await pedir('/api/estado', null, ana)).json();
    checar(fundido.anotacoes['nota:x'] === 'SEGREDO-NOTA-ANA' && fundido.anotacoes['nota:y'] === 'SEGREDO-NOVA' && fundido.oia[1].o === 'SEGREDO-OIA-ANA',
      'a fusão entre aparelhos junta o cifrado guardado com o que chega');
    const ivAntes = naLinha('ana.cofre').anotacoes['nota:x'].iv;
    await pedir('/api/estado', { ...outroAparelho, atualizadoEm: Date.now() + 2000, anotacoes: { 'nota:x': 'SEGREDO-EDITADA' } }, ana, 'PUT');
    checar(naLinha('ana.cofre').anotacoes['nota:x'].iv !== ivAntes, 'o texto editado é gravado com IV novo');

    // "Zerar progresso" pelo servidor: a trilha recomeça, foto e anotações ficam
    const FOTO = 'data:image/jpeg;base64,QUJD';
    await pedir('/api/estado', { ...fundido, atualizadoEm: Date.now() + 3000, foto: FOTO, acertosTotal: 40 }, ana, 'PUT');
    const cheio = await (await pedir('/api/estado', null, ana)).json();
    const agoraZ = Date.now() + 4000;
    const zeradoSrv = { ...cheio, atualizadoEm: agoraZ, zeradoEm: agoraZ };
    for (const campo of CC.PROGRESSO_DA_TRILHA) zeradoSrv[campo] = { ...CC.normalizarEstado({}), xpLegado: 0 }[campo];
    checar(cheio.lidos.length === 1 && cheio.acertosTotal === 40 && (await pedir('/api/estado', zeradoSrv, ana, 'PUT')).status === 200, 'o dono zera a trilha');
    const depoisZ = await (await pedir('/api/estado', null, ana)).json();
    checar(!depoisZ.lidos.length && !Object.keys(depoisZ.marcadoEm).length && depoisZ.acertosTotal === 0 && depoisZ.xpLegado === 0,
      'no servidor, zerar recomeça leituras, ofensiva e contadores');
    checar(depoisZ.foto === FOTO && depoisZ.anotacoes['nota:y'] === 'SEGREDO-NOVA' && depoisZ.oia[1].o === 'SEGREDO-OIA-ANA' && depoisZ.historia.antes === 'SEGREDO-HISTORIA-ANA',
      'no servidor, zerar mantém a foto, as anotações, as reflexões e a Minha história');
    checar(!/SEGREDO/.test(bancoBruto()), 'e o que ficou continua cifrado no banco');

    // migração: uma conta de antes do cofre, com texto em claro no banco
    naLinha('bia.cofre', () => ({ ...meu, oia: { 1: { o: 'SEGREDO-ANTIGO-BIA', i: '', a: '', oracao: '' } } }));
    checar(/SEGREDO-ANTIGO-BIA/.test(JSON.stringify(naLinha('bia.cofre'))), 'a conta antiga está em claro antes de reiniciar');
    await parar(srv);
    saida = '';
    srv = subir();
    checar(await no(), 'o servidor sobe de novo');
    checar(!/SEGREDO-ANTIGO-BIA/.test(JSON.stringify(naLinha('bia.cofre'))) && /anotações cifradas no banco: 1/.test(saida), 'na subida a conta antiga é cifrada');
    checar(!/SEGREDO-ANTIGO-BIA/.test(bancoBruto()), 'e o texto em claro não sobra no arquivo do banco nem no WAL');
    checar((await (await pedir('/api/estado', null, bia)).json()).oia[1].o === 'SEGREDO-ANTIGO-BIA', 'e a dona continua lendo o que escreveu');

    // dado adulterado: nada é servido nem gravado por cima
    naLinha('ana.cofre', (e) => { const b = Buffer.from(e.oia[1].o.dado, 'base64'); b[0] ^= 1; e.oia[1].o.dado = b.toString('base64'); return e; });
    const r1 = await pedir('/api/estado', null, ana);
    checar(r1.status === 500 && !/SEGREDO/.test(await r1.text()), 'com o dado adulterado o servidor recusa servir');
    const antesPut = JSON.stringify(naLinha('ana.cofre'));
    const r2 = await pedir('/api/estado', meu, ana, 'PUT');
    checar(r2.status === 500 && JSON.stringify(naLinha('ana.cofre')) === antesPut, 'e não grava nada por cima do que não abriu');

    // apagar a conta leva o progresso cifrado junto
    const apagou = await pedir('/api/apagar-conta', { senha: 'senha-bia.cofre' }, bia);
    checar(apagou.status === 200 && !naLinha('bia.cofre'), 'apagar a conta continua apagando o progresso');
  } finally {
    if (srv) await parar(srv);
    rmSync(pastaS, { recursive: true, force: true });
  }
}

console.log('\n  ' + contagem + ' checagens' + (falhas ? ' · ' + falhas + ' FALHA(S)\n' : ' · todas passaram\n'));
process.exit(falhas ? 1 : 0);
