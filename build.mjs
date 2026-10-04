// Monta o aplicativo em dist/: um index.html autocontido (funciona offline, num arquivo só)
// e, ao lado, o que o torna instalável quando servido: manifesto, ícones e service worker.
// Uso: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { copyFileSync } from 'node:fs';
import { montarAbertura } from './ferramentas/abertura.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const src = (...p) => join(AQUI, 'src', ...p);
const dist = (...p) => join(AQUI, 'dist', ...p);

let dados = readFileSync(join(AQUI, 'conteudo', 'conteudo.json'), 'utf8');
const conteudo = JSON.parse(dados);
console.log('conteúdo:', conteudo.totalNotas, 'notas ·', conteudo.plano.length, 'dias ·',
  conteudo.unidades.length, 'unidades');

// O Conhecer Jesus (14 dias) e as perguntas honestas nascem em arquivos à parte, prontos e
// revisados por fora: aqui só entram debaixo de uma chave nova, para o app ler tudo como
// CC.D.conhecer. "dados" é regravado porque é ele, e não "conteudo", que vira o hash e o
// arquivo publicado logo abaixo.
const conhecer = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'conhecer.json'), 'utf8'));
const perguntasHonestas = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'perguntas-honestas.json'), 'utf8'));
conteudo.conhecer = { ...conhecer, perguntas: perguntasHonestas };
// O que a pessoa vê antes de ler nos primeiros dias (o mapa da história, o contexto do dia, o
// "procure", o gancho de amanhã e os guias dos trechos de lista): CC.D.primeirosDias.
conteudo.primeirosDias = JSON.parse(readFileSync(join(AQUI, 'conteudo', 'primeiros-dias.json'), 'utf8'));
// As palavras de cada trecho na NBV, a tradução padrão: é daí que sai a estimativa de tempo
// honesta de cada dia (CC.minutosDoDia, a 200 palavras por minuto). "Cerca de 10 min" no dia 2,
// que tem 5, fazia o segundo dia parecer tão pesado quanto o primeiro.
{
  const arquivoNbv = join(AQUI, 'conteudo', 'biblias', 'nbv.json');
  const livros = existsSync(arquivoNbv) ? JSON.parse(readFileSync(arquivoNbv, 'utf8')).livros : null;
  if (livros) {
    for (const d of conteudo.plano) {
      for (const t of d.trechos || []) {
        let n = 0;
        for (let c = t.de; c <= t.ate; c++) for (const v of (livros[t.livro] || [])[c - 1] || []) n += String(v).split(/\s+/).filter(Boolean).length;
        t.palavras = n;
      }
    }
    // O Conhecer Jesus vai por versículo (cap, de, ate): a mesma conta, só dos versículos do trecho.
    for (const d of conteudo.conhecer.dias) {
      for (const t of d.trechos || []) {
        let n = 0;
        for (const v of ((livros[t.livro] || [])[t.cap - 1] || []).slice(t.de - 1, t.ate)) n += String(v).split(/\s+/).filter(Boolean).length;
        t.palavras = n;
      }
    }
  }
}
dados = JSON.stringify(conteudo);
console.log('conhecer jesus:', conteudo.conhecer.dias.length, 'dias ·', conteudo.conhecer.perguntas.length, 'perguntas honestas');
console.log('primeiros dias:', Object.keys(conteudo.primeirosDias.dias).length, 'dias com contexto ·', Object.keys(conteudo.primeirosDias.guias).length, 'guias de leitura');

// Os módulos do app são concatenados na ordem do nome do arquivo: 01 antes de 02.
const pastaApp = src('app');
const modulos = readdirSync(pastaApp).filter((f) => f.endsWith('.js')).sort();
// O que é só para quem lê o fonte sai do app entregue (o index.html tem teto de 1 MB):
// - os comentários de linha inteira ("// ...", uns 80 KB) e os de bloco que começam numa
//   linha e terminam no fim de outra ("/* ... */"), a documentação do código;
// - o recuo do começo de cada linha e as linhas em branco: fora de um texto,
//   espaço no começo da linha não muda nada em JavaScript (a quebra de linha, que conta para
//   a inserção automática de ponto e vírgula, fica).
// Nada dentro de um texto entre crases de várias linhas muda (lá o recuo e a linha em branco
// são texto): a contagem de crases das linhas de código diz quando se está dentro de um, e
// um módulo que termine "dentro" de um texto para o build (a contagem se perdeu). Nenhuma
// linha do app termina em "\" (texto continuado na linha seguinte): o build confere.
// Os comentários de bloco, o recuo e as linhas em branco somavam 83 KB (o JS foi de 719 para
// 636 KB em 03/10/2026, e a folga do index.html de 42 para 123 KB, sem mudar o que a pessoa
// vê). A equivalência se prova com ferramentas/provar-enxugar.mjs (o acorn monta a árvore
// sintática do fonte e do enxugado e as compara; rode ao mexer aqui); a CSP não muda de regra, porque os hashes saem do index.html na subida.
const enxugarJs = (codigo, arquivo) => {
  let dentroDeCrases = false;
  let dentroDeBloco = false;
  const saida = [];
  for (const linha of codigo.split('\n')) {
    if (dentroDeBloco) {
      if (/\*\/\s*$/.test(linha)) dentroDeBloco = false;
      else if (linha.includes('*/')) throw new Error(arquivo + ': comentário de bloco que termina no meio de uma linha');
      continue;
    }
    if (!dentroDeCrases) {
      if (/^\s*\/\//.test(linha) || /^\s*$/.test(linha)) continue;
      if (/^\s*\/\*/.test(linha)) {
        const fim = linha.indexOf('*/', linha.indexOf('/*') + 2);
        if (fim < 0) { dentroDeBloco = true; continue; }
        if (/^\s*$/.test(linha.slice(fim + 2))) continue;
      }
      if (/\\$/.test(linha)) throw new Error(arquivo + ': linha que termina em "\\" (o enxugamento do build não a trata)');
    }
    saida.push(dentroDeCrases ? linha : linha.replace(/^\s+/, ''));
    if ((linha.match(/`/g) || []).length % 2) dentroDeCrases = !dentroDeCrases;
  }
  if (dentroDeCrases || dentroDeBloco) throw new Error(arquivo + ': a contagem de crases ou de comentários se perdeu no enxugamento');
  return saida.join('\n');
};
const js = modulos.map((f) => '/* ' + f + ' */\n' + enxugarJs(readFileSync(join(pastaApp, f), 'utf8'), f)).join('\n');
console.log('módulos:', modulos.join(', '));

// As fontes vêm embutidas em src/fontes.css, mas saem do index.html para arquivos próprios
// (fonte-<nome>.<resumo>.woff2), uns 140 KB a menos na página que tem teto de 1 MB. O resumo
// no nome faz o arquivo só mudar quando a fonte muda: o servidor o entrega com cache longo,
// e o service worker o guarda para o app abrir sem rede.
const arquivosFontes = [];
const fontes = readFileSync(src('fontes.css'), 'utf8')
  .replace(/font-family:\s*'([^']+)'([\s\S]*?)url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/g, (_, familia, meio, b64) => {
    const bin = Buffer.from(b64, 'base64');
    const arquivo = 'fonte-' + familia.toLowerCase().replace(/\s+/g, '-') + '.'
      + createHash('sha256').update(bin).digest('hex').slice(0, 10) + '.woff2';
    arquivosFontes.push({ arquivo, bin, familia });
    return "font-family: '" + familia + "'" + meio + 'url(./' + arquivo + ')';
  });
// As fontes do nome original nos mapas (hebraico e grego, src/fontes-originais/) não vão
// para a página nem para a lista que o service worker baixa na instalação: só a regra
// @font-face, com unicode-range, entra no estilo. O navegador baixa o arquivo quando um texto
// usa a letra (a tela do mapa), e o service worker o guarda nessa hora, como os mapas.
const pastaOriginais = src('fontes-originais');
const fontesOriginais = [];
const fontesOriginaisCss = readFileSync(join(pastaOriginais, 'originais.css'), 'utf8')
  .replace(/url\(\.\/([a-z-]+)\.woff2\)/g, (_, nome) => {
    const bin = readFileSync(join(pastaOriginais, nome + '.woff2'));
    const arquivo = 'fonte-original-' + nome + '.' + createHash('sha256').update(bin).digest('hex').slice(0, 10) + '.woff2';
    fontesOriginais.push({ arquivo, bin });
    return 'url(./' + arquivo + ')';
  });
if (/data:font/.test(fontes)) throw new Error('src/fontes.css tem fonte em formato que o build não separa: use woff2');
// Os comentários do estilo.css são a documentação de design: ficam no fonte e saem do
// app entregue (economizam uns 30 KB do index.html, que tem teto de 1 MB). O espaço em
// volta de chaves, dois-pontos, ponto e vírgula e vírgulas sai também (mais uns 20 KB),
// sem encostar no que está entre aspas (content, url("data:..."), nomes de fonte).
const enxugarCss = (css) => css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(/("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/)
  .map((trecho, i) => (i % 2 ? trecho : trecho
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/([{;]\s*[-a-z]+):\s+/g, '$1:')
    .replace(/;}/g, '}')))
  .join('')
  .trim();
// Depois do estilo.css entram, em ordem alfabética, as camadas do redesenho em
// src/estilo-v2/ (00-tokens, 01-base, uma por grupo de telas). As que terminam em
// "-avulsas.css" são das páginas avulsas (entrada, privacidade, termos) e ficam fora do app.
const pastaEstiloV2 = src('estilo-v2');
const camadasV2 = (existsSync(pastaEstiloV2) ? readdirSync(pastaEstiloV2) : [])
  .filter((f) => f.endsWith('.css')).sort();
const lerCamada = (f) => readFileSync(join(pastaEstiloV2, f), 'utf8');
const estilo = enxugarCss([readFileSync(src('estilo.css'), 'utf8')]
  .concat(camadasV2.filter((f) => !f.endsWith('-avulsas.css')).map(lerCamada)).join('\n'));
// As páginas avulsas não carregam o estilo.css (têm o próprio, dentro delas): recebem só a
// camada delas, no marcador /*ESTILO_V2*/, depois do estilo de dentro da página.
const estiloAvulsas = enxugarCss(camadasV2.filter((f) => f.endsWith('-avulsas.css')).map(lerCamada).join('\n'));
// Um "</style>" escrito dentro do CSS (até num comentário) fecharia o bloco no meio da página.
if (/<\/style/i.test(estilo + estiloAvulsas)) throw new Error('um arquivo de estilo tem "</style>" dentro: tire do texto');
const kb = (texto) => (Buffer.byteLength(texto) / 1024).toFixed(1) + ' KB';
console.log('estilo: estilo.css ' + kb(enxugarCss(readFileSync(src('estilo.css'), 'utf8'))) + ' · '
  + camadasV2.map((f) => f + ' ' + kb(enxugarCss(lerCamada(f)))).join(' · '));
const molde = readFileSync(src('index.html'), 'utf8');

mkdirSync(dist(), { recursive: true });
for (const velho of readdirSync(dist()).filter((f) => /^fonte-.*\.woff2$/.test(f))) rmSync(dist(velho));
for (const f of arquivosFontes.concat(fontesOriginais)) writeFileSync(dist(f.arquivo), f.bin);
// A fonte do texto (Manrope) é pedida junto com a página, para o texto não piscar trocando de letra.
const preloadFontes = arquivosFontes.filter((f) => f.familia === 'Manrope')
  .map((f) => '<link rel="preload" href="./' + f.arquivo + '" as="font" type="font/woff2" crossorigin>').join('');

// ---------- bíblias ----------
// Cada tradução vai num arquivo próprio ao lado do index.html, e não dentro dele: são
// uns 4 MB cada, e embuti-las faria o aparelho baixar tudo de novo a cada atualização
// do aplicativo. O nome leva um resumo do texto, então só muda quando o texto muda.
// A versão .gz sai junto: o servidor a entrega a quem aceita, e 4 MB viram pouco mais de 1.
const ORDEM_BIBLIAS = ['nbv', 'blivre'];
const posicao = (sigla) => (ORDEM_BIBLIAS.includes(sigla) ? ORDEM_BIBLIAS.indexOf(sigla) : 99);
const pastaBiblias = join(AQUI, 'conteudo', 'biblias');
for (const velho of readdirSync(dist()).filter((f) => f.startsWith('biblia-'))) rmSync(dist(velho));
const biblias = (existsSync(pastaBiblias) ? readdirSync(pastaBiblias) : [])
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const bruto = readFileSync(join(pastaBiblias, f));
    // só a descrição vai para o app; o texto fica no arquivo
    const { livros, versiculos, ...descricao } = JSON.parse(bruto.toString('utf8'));
    const resumo = createHash('sha256').update(bruto).digest('hex').slice(0, 10);
    const arquivo = 'biblia-' + descricao.sigla + '.' + resumo + '.json';
    writeFileSync(dist(arquivo), bruto);
    writeFileSync(dist(arquivo + '.gz'), gzipSync(bruto, { level: 9 }));
    return { ...descricao, arquivo };
  })
  .sort((a, b) => posicao(a.sigla) - posicao(b.sigla));
console.log('bíblias:', biblias.map((b) => b.abreviatura).join(', ') || 'nenhuma');

// ---------- mapas dos livros ----------
// Um arquivo por livro publicado (conteudo/mapas/indice.json diz quais vão ao ar), com os
// desenhos (conteudo/mapas/desenhos/<id>.svg) embutidos e o resumo no nome, como as bíblias:
// o index.html só leva a lista (window.MAPAS), e o service worker guarda cada mapa quando
// ele é aberto. Os 66 mapas não caberiam no index.html (teto de 1 MB). O <style> e os
// comentários de cada SVG servem só para vê-lo sozinho e saem aqui: na tela, as classes de
// traço (.k .h .p .s .e) vêm do 27-mapas.css, que segue o tema claro e o escuro.
const pastaMapas = join(AQUI, 'conteudo', 'mapas');
for (const velho of readdirSync(dist()).filter((f) => /^mapa-.*\.json(\.gz)?$/.test(f))) rmSync(dist(velho));
const lerDesenho = (id) => {
  const arquivo = join(pastaMapas, 'desenhos', id + '.svg');
  if (!/^[a-z0-9-]+$/.test(id) || !existsSync(arquivo)) throw new Error('falta o desenho conteudo/mapas/desenhos/' + id + '.svg');
  return readFileSync(arquivo, 'utf8').replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+xmlns="[^"]*"/, '').replace(/\n\s*/g, '').trim();
};
const indiceMapas = existsSync(join(pastaMapas, 'indice.json'))
  ? JSON.parse(readFileSync(join(pastaMapas, 'indice.json'), 'utf8')) : { publicados: [] };
const mapas = (indiceMapas.publicados || []).map((slug) => {
  const arquivoFonte = join(pastaMapas, slug + '.json');
  if (!/^[a-z0-9-]+$/.test(slug) || !existsSync(arquivoFonte)) throw new Error('conteudo/mapas/indice.json publica "' + slug + '", mas falta conteudo/mapas/' + slug + '.json');
  const mapa = JSON.parse(readFileSync(arquivoFonte, 'utf8'));
  const ids = new Set([(mapa.autoria || {}).desenho].concat((mapa.ramos || []).map((r) => r.desenho), (mapa.cristo || {}).desenho).filter(Boolean));
  mapa.desenhos = Object.fromEntries([...ids].map((id) => [id, lerDesenho(id)]));
  const texto = JSON.stringify(mapa);
  const arquivo = 'mapa-' + slug + '.' + createHash('sha256').update(texto).digest('hex').slice(0, 10) + '.json';
  writeFileSync(dist(arquivo), texto, 'utf8');
  writeFileSync(dist(arquivo + '.gz'), gzipSync(Buffer.from(texto, 'utf8'), { level: 9 }));
  return { slug, nome: mapa.nome, grupo: mapa.grupo, numero: mapa.numero, capitulos: mapa.capitulos, arquivo };
});
console.log('mapas dos livros:', mapas.map((m) => m.nome).join(', ') || 'nenhum');

// ---------- ícones ----------
// Vêm prontos de src/icones/, gerados da arte em arte/icone-app.png por
// ferramentas/icones.ps1. Reduzir um PNG exige decodificá-lo, e o build roda no Docker
// sem dependência nenhuma: aqui os ícones só são copiados. A arte é só do ícone da
// tela de início e do favicon; dentro do app a marca aparece como o símbolo GE.
const iconesProntos = readdirSync(src('icones')).filter((f) => f.endsWith('.png')).sort();
for (const f of iconesProntos) copyFileSync(src('icones', f), dist(f));

// Duas famílias no manifesto: a normal, com cantos transparentes, e a "mascara", de
// fundo cheio e desenho dentro da zona segura que o Android recorta.
const icones = [192, 512].flatMap((tamanho) => [
  { arquivo: 'icone-' + tamanho + '.png', tamanho, proposito: 'any' },
  { arquivo: 'icone-mascara-' + tamanho + '.png', tamanho, proposito: 'maskable' },
]);
for (const f of icones.map((i) => i.arquivo).concat('apple-touch-icon.png', 'icone-48.png')) {
  if (!iconesProntos.includes(f)) throw new Error('falta src/icones/' + f + ': rode ferramentas/icones.ps1');
}

// A versão entra no endereço de cada ícone. O Cloudflare guarda PNG em cache por horas
// e o iPhone guarda o ícone da tela de início: com o mesmo endereço, a arte nova
// demoraria a aparecer para quem já tinha visitado.
const hashIcones = createHash('sha256');
for (const f of iconesProntos) hashIcones.update(readFileSync(src('icones', f)));
const versaoIcones = hashIcones.digest('hex').slice(0, 10);

// O favicon vai embutido: é pequeno e funciona até com o index.html aberto como arquivo.
const iconeEmbutido = 'data:image/png;base64,' + readFileSync(src('icones', 'icone-48.png')).toString('base64');

// ---------- manifesto ----------
const manifesto = {
  name: 'Geração Eleita',
  short_name: 'Geração Eleita',
  description: 'A Bíblia inteira em um ano, com os amigos e a sua célula: uma leitura por dia e reflexões para quem está começando.',
  lang: 'pt-BR',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  // A tela de abertura do Android pinta este fundo com o ícone no meio: o mesmo preto do
  // ícone (#0b0b0b), para a abertura ser igual ao app instalado. O creme era da paleta antiga.
  background_color: '#0b0b0b',
  theme_color: '#0b0b0b',
  // O próprio app como "aplicativo relacionado": no Android, o Chrome responde por
  // navigator.getInstalledRelatedApps() se ele já está instalado, e o tutorial deixa de
  // mandar procurar "Instalar app" num menu que só mostra "Abrir app" (07c-instalar.js).
  related_applications: [{ platform: 'webapp', url: './manifest.webmanifest' }],
  icons: icones.map(({ tamanho, arquivo, proposito }) => ({
    src: './' + arquivo + '?v=' + versaoIcones,
    sizes: tamanho + 'x' + tamanho,
    type: 'image/png',
    purpose: proposito,
  })),
};
writeFileSync(dist('manifest.webmanifest'), JSON.stringify(manifesto, null, 2), 'utf8');

// ---------- conteúdo ----------
// O plano, as reflexões e as notas (4 MB) moram num arquivo à parte, com um resumo no nome,
// como as bíblias. Dentro do index.html, qualquer mudança de código fazia todo mundo baixar
// o conteúdo de novo; separado, ele só é baixado quando muda de verdade.
for (const velho of readdirSync(dist()).filter((f) => /^conteudo\.[0-9a-f]+\.json(\.gz)?$/.test(f))) rmSync(dist(velho));
const resumoConteudo = createHash('sha256').update(dados).digest('hex').slice(0, 10);
const arquivoConteudo = 'conteudo.' + resumoConteudo + '.json';
writeFileSync(dist(arquivoConteudo), dados, 'utf8');
writeFileSync(dist(arquivoConteudo + '.gz'), gzipSync(Buffer.from(dados, 'utf8'), { level: 9 }));

// ---------- página ----------
// O app roda só depois que o conteúdo chega: o código inteiro vira a função iniciarApp,
// chamada pelo carregador logo abaixo dela.
const carregador = `(function () {
  function falhou() {
    var a = document.getElementById('abertura');
    if (!a) return;
    a.classList.add('falhou');
    // sem onclick no HTML: a CSP não deixa rodar código escrito dentro da marcação
    a.insertAdjacentHTML('beforeend', '<p class="abertura-erro">Não consegui carregar o conteúdo agora.<br><button type="button">Tentar de novo</button></p>');
    a.querySelector('.abertura-erro button').addEventListener('click', function () { location.reload(); });
  }
  fetch(window.CONTEUDO_ARQUIVO)
    .then(function (r) { if (!r.ok || (r.headers.get('content-type') || '').indexOf('json') < 0) throw new Error('conteúdo'); return r.json(); })
    .then(function (d) { window.DADOS = d; window.iniciarApp(); })
    .catch(falhou);
})();`;
const html = molde
  .replace('<style>/*FONTES*/</style>', () => preloadFontes + '<style>/*FONTES*/</style>')
  .replace(/\/\*FONTES\*\//g, () => fontes + enxugarCss(fontesOriginaisCss))
  .replace(/\/\*ESTILO\*\//g, () => estilo)
  .replace(/\/\*CONTEUDO_ARQUIVO\*\//g, () => arquivoConteudo)
  // window.BIBLIAS fica por último: os testes leem a lista de traduções até o ";</script>".
  .replace(/\/\*DADOS\*\//g, () => 'window.CONTEUDO_ARQUIVO=' + JSON.stringify(arquivoConteudo) + ';'
    + 'window.MAPAS=' + JSON.stringify(mapas).replace(/</g, '\\u003c') + ';'
    + 'window.BIBLIAS=' + JSON.stringify(biblias).replace(/</g, '\\u003c') + ';')
  // O cartão dos mapas no Explorar leva um desenho só (o rolo com a pena): ele entra no código
  // no lugar da marca '@@DESENHO:<id>@@', sem o <style>, como nos mapas.
  .replace(/\/\*APP\*\//g, () => 'window.iniciarApp = function () {\n' + js.replace(/'@@DESENHO:([a-z0-9-]+)@@'/g, (_, id) => JSON.stringify(lerDesenho(id))) + '\n};\n' + carregador)
  .replace(/\/\*ICONE\*\//g, () => iconeEmbutido)
  .replace(/\/\*VERSAO_ICONES\*\//g, () => versaoIcones)
  .replace(/\/\*ABERTURA\*\//g, () => montarAbertura());

// A versão sai do conteúdo da página, com o marcador ainda no lugar, e depois entra nela:
// assim o app compara a versão que está rodando com a que o servidor publicou.
// O conteúdo entra na conta: mudou só o texto de uma reflexão, muda a versão também.
const versao = createHash('sha256').update(html).update(resumoConteudo).digest('hex').slice(0, 12);
const paginaFinal = html.replace(/\/\*VERSAO_APP\*\//g, versao);
writeFileSync(dist('index.html'), paginaFinal, 'utf8');
// Comprimida ao lado, como as bíblias e o conteúdo.
writeFileSync(dist('index.html.gz'), gzipSync(Buffer.from(paginaFinal, 'utf8'), { level: 9 }));

// ---------- tela de entrada ----------
// Vive fora do index.html porque o servidor a entrega antes de saber quem é a
// pessoa: mandar os 4 MB do aplicativo para quem ainda não entrou seria absurdo.
// A privacidade e os termos também são públicos: quem recebe um convite pode ler antes de criar conta.
const simboloSvg = montarAbertura()
  .replace(/^[\s\S]*?(<svg)/, '$1').replace(/<\/svg>[\s\S]*$/, '</svg>');
for (const pagina of ['entrar.html', 'privacidade.html', 'termos.html']) {
  const html = readFileSync(src(pagina), 'utf8')
    .replace(/\/\*FONTES\*\//g, () => fontes)
    .replace(/\/\*ESTILO_V2\*\//g, () => estiloAvulsas)
    .replace(/\/\*SIMBOLO\*\//g, () => simboloSvg)
    .replace(/\/\*ICONE\*\//g, () => iconeEmbutido)
    .replace(/\/\*VERSAO_ICONES\*\//g, () => versaoIcones);
  writeFileSync(dist(pagina), html, 'utf8');
}

// ---------- service worker ----------
// A versão vem do conteúdo: mudou o app, muda o cache, sem precisar lembrar de subir número.
// A mesma versão da página: mudou o app, muda o cache, sem precisar lembrar de subir número.
const sw = `// Gerado por build.mjs. Não editar à mão.
const CACHE = 'caminho-${versao}';
// As bíblias têm cache próprio, que sobrevive às atualizações do aplicativo: o nome de
// cada arquivo só muda quando o texto muda, e baixar 4 MB a cada versão seria desperdício.
const CACHE_BIBLIAS = 'caminho-biblias';
// Os mapas dos livros também têm cache próprio: um arquivo por livro, com resumo no nome,
// guardado quando o mapa é aberto pela primeira vez.
const CACHE_MAPAS = 'caminho-mapas';
const ARQUIVOS = ${JSON.stringify(
  ['./', './index.html', './' + arquivoConteudo, './manifest.webmanifest', './apple-touch-icon.png', './icone-48.png']
    .concat(icones.map((i) => './' + i.arquivo), arquivosFontes.map((f) => './' + f.arquivo)))};
// As páginas avulsas vêm primeiro da rede e só do cache sem rede: o app guardado, aberto sem
// sessão, vai para a página de entrada, e ela precisa abrir também longe do Wi-Fi.
const AVULSAS = ['entrar.html', 'privacidade.html', 'termos.html'];
const BIBLIAS = ${JSON.stringify(biblias.map((b) => b.arquivo))};
// As fontes do nome original (fonte-original-*) vão no cache dos mapas: só a tela do mapa as usa.
const MAPAS = ${JSON.stringify(mapas.map((m) => m.arquivo).concat(fontesOriginais.map((f) => f.arquivo)))};
const GUARDADOS = [[CACHE_BIBLIAS, BIBLIAS], [CACHE_MAPAS, MAPAS]];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(ARQUIVOS.concat(AVULSAS.map((a) => './' + a)).map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((nomes) => Promise.all(nomes
      .filter((n) => n !== CACHE && !GUARDADOS.some(([nome]) => nome === n))
      .map((n) => caches.delete(n))))
    // dos caches das bíblias e dos mapas sai só o que o build deixou de gerar
    .then(() => Promise.all(GUARDADOS.map(([nome, lista]) => caches.open(nome)
      .then((c) => c.keys().then((pedidos) => Promise.all(pedidos
        .filter((p) => !lista.includes(new URL(p.url).pathname.split('/').pop()))
        .map((p) => c.delete(p))))))))
    .then(() => self.clients.claim()));
});

// O estado nunca vem do cache: é o que sincroniza entre aparelhos.
self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.pathname.includes('/api/')) return;
  const guardado = GUARDADOS.find(([, lista]) => lista.includes(url.pathname.split('/').pop()));
  if (guardado) {
    // Guardada na primeira vez que é pedida: daí em diante a leitura abre sem rede.
    // Só entra no cache o que é JSON (ou fonte), porque sem sessão o servidor responde com a
    // tela de entrada, e ela não pode ficar guardada no lugar do texto.
    ev.respondWith(caches.open(guardado[0]).then((c) => c.match(ev.request, { ignoreSearch: true })
      .then((achado) => achado || fetch(ev.request).then((r) => {
        if (r.ok && /json|font/.test(r.headers.get('content-type') || '')) c.put(ev.request, r.clone());
        return r;
      }))));
    return;
  }
  if (AVULSAS.includes(url.pathname.split('/').pop())) {
    ev.respondWith(fetch(ev.request).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(new Request(url.pathname), copia)); }
      return r;
    }).catch(() => caches.match(ev.request, { ignoreSearch: true }).then((achado) => achado || Response.error())));
    return;
  }
  ev.respondWith(
    caches.match(ev.request, { ignoreSearch: true })
      .then((achado) => achado || fetch(ev.request))
  );
});

// ---------- notificações ----------
// O servidor manda o texto criptografado; aqui ele vira a notificação do sistema.
self.addEventListener('push', (ev) => {
  let d = {};
  try { d = ev.data ? ev.data.json() : {}; } catch (e) { d = { corpo: ev.data ? ev.data.text() : '' }; }
  ev.waitUntil(self.registration.showNotification(d.titulo || 'Geração Eleita', {
    body: d.corpo || '',
    icon: './icone-192.png',
    tag: d.tag || 'caminho',
    renotify: Boolean(d.tag),
    data: { url: d.url || './' },
  }));
});

// Tocar na notificação abre o app no lugar certo, reaproveitando a janela que estiver aberta.
self.addEventListener('notificationclick', (ev) => {
  ev.notification.close();
  const alvo = new URL((ev.notification.data && ev.notification.data.url) || './', self.registration.scope).href;
  ev.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
    const aberta = janelas.find((j) => j.url.startsWith(self.registration.scope));
    if (!aberta) return self.clients.openWindow(alvo);
    return aberta.focus().then((j) => (j && j.navigate ? j.navigate(alvo) : j)).catch(() => self.clients.openWindow(alvo));
  }));
});
`;
writeFileSync(dist('sw.js'), sw, 'utf8');

const mb = (Buffer.byteLength(html) / 1048576).toFixed(2);
// O teste.mjs exige o index.html abaixo de 1 MB: quanto ainda cabe (as camadas de estilo contam).
const folga = ((1024 * 1024 - Buffer.byteLength(paginaFinal)) / 1024).toFixed(1);
console.log('gerado: dist/index.html (' + mb + ' MB, folga de ' + folga + ' KB até 1 MB) · manifest · sw ' + versao
  + ' · ' + icones.length + ' ícones · ' + biblias.length + ' bíblias · ' + mapas.length + ' mapas');
