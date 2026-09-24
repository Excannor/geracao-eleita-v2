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

const dados = readFileSync(join(AQUI, 'conteudo', 'conteudo.json'), 'utf8');
const conteudo = JSON.parse(dados);
console.log('conteúdo:', conteudo.totalNotas, 'notas ·', conteudo.plano.length, 'dias ·',
  conteudo.unidades.length, 'unidades');

// Os módulos do app são concatenados na ordem do nome do arquivo: 01 antes de 02.
const pastaApp = src('app');
const modulos = readdirSync(pastaApp).filter((f) => f.endsWith('.js')).sort();
const js = modulos.map((f) => '/* ' + f + ' */\n' + readFileSync(join(pastaApp, f), 'utf8')).join('\n');
console.log('módulos:', modulos.join(', '));

const fontes = readFileSync(src('fontes.css'), 'utf8');
const estilo = readFileSync(src('estilo.css'), 'utf8');
const molde = readFileSync(src('index.html'), 'utf8');

mkdirSync(dist(), { recursive: true });

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
  description: 'A Bíblia inteira em um ano, junto com a sua célula: uma leitura por dia, reflexões para quem está começando e grupos de até 5 lendo juntos.',
  lang: 'pt-BR',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#fdfbf5',
  theme_color: '#fdfbf5',
  icons: icones.map(({ tamanho, arquivo, proposito }) => ({
    src: './' + arquivo + '?v=' + versaoIcones,
    sizes: tamanho + 'x' + tamanho,
    type: 'image/png',
    purpose: proposito,
  })),
};
writeFileSync(dist('manifest.webmanifest'), JSON.stringify(manifesto, null, 2), 'utf8');

// ---------- página ----------
const json = dados.replace(/</g, '\\u003c');
const html = molde
  .replace(/\/\*FONTES\*\//g, () => fontes)
  .replace(/\/\*ESTILO\*\//g, () => estilo)
  .replace(/\/\*DADOS\*\//g, () => 'window.DADOS=' + json + ';'
    + 'window.BIBLIAS=' + JSON.stringify(biblias).replace(/</g, '\\u003c') + ';')
  .replace(/\/\*APP\*\//g, () => js)
  .replace(/\/\*ICONE\*\//g, () => iconeEmbutido)
  .replace(/\/\*VERSAO_ICONES\*\//g, () => versaoIcones)
  .replace(/\/\*ABERTURA\*\//g, () => montarAbertura());

// A versão sai do conteúdo da página, com o marcador ainda no lugar, e depois entra nela:
// assim o app compara a versão que está rodando com a que o servidor publicou.
const versao = createHash('sha256').update(html).digest('hex').slice(0, 12);
const paginaFinal = html.replace(/\/\*VERSAO_APP\*\//g, versao);
writeFileSync(dist('index.html'), paginaFinal, 'utf8');
// Comprimida ao lado, como as bíblias: são quase 5 MB, e em gzip cabem em pouco mais de 1.
writeFileSync(dist('index.html.gz'), gzipSync(Buffer.from(paginaFinal, 'utf8'), { level: 9 }));

// ---------- tela de entrada ----------
// Vive fora do index.html porque o servidor a entrega antes de saber quem é a
// pessoa: mandar os 4 MB do aplicativo para quem ainda não entrou seria absurdo.
// A privacidade também é pública: quem recebe um convite pode ler antes de criar conta.
const simboloSvg = montarAbertura()
  .replace(/^[\s\S]*?(<svg)/, '$1').replace(/<\/svg>[\s\S]*$/, '</svg>');
for (const pagina of ['entrar.html', 'privacidade.html']) {
  const html = readFileSync(src(pagina), 'utf8')
    .replace(/\/\*FONTES\*\//g, () => fontes)
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
const ARQUIVOS = ${JSON.stringify(
  ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icone-48.png']
    .concat(icones.map((i) => './' + i.arquivo)))};
const BIBLIAS = ${JSON.stringify(biblias.map((b) => b.arquivo))};

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((nomes) => Promise.all(nomes
      .filter((n) => n !== CACHE && n !== CACHE_BIBLIAS)
      .map((n) => caches.delete(n))))
    // do cache das bíblias sai só o texto que o build deixou de gerar
    .then(() => caches.open(CACHE_BIBLIAS))
    .then((c) => c.keys().then((pedidos) => Promise.all(pedidos
      .filter((p) => !BIBLIAS.includes(new URL(p.url).pathname.split('/').pop()))
      .map((p) => c.delete(p)))))
    .then(() => self.clients.claim()));
});

// O estado nunca vem do cache: é o que sincroniza entre aparelhos.
self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.pathname.includes('/api/')) return;
  if (BIBLIAS.includes(url.pathname.split('/').pop())) {
    // Guardada na primeira vez que é pedida: daí em diante a leitura abre sem rede.
    // Só entra no cache o que é JSON, porque sem sessão o servidor responde com a
    // tela de entrada, e ela não pode ficar guardada no lugar do texto.
    ev.respondWith(caches.open(CACHE_BIBLIAS).then((c) => c.match(ev.request, { ignoreSearch: true })
      .then((achado) => achado || fetch(ev.request).then((r) => {
        if (r.ok && (r.headers.get('content-type') || '').includes('json')) c.put(ev.request, r.clone());
        return r;
      }))));
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
console.log('gerado: dist/index.html (' + mb + ' MB) · manifest · sw ' + versao
  + ' · ' + icones.length + ' ícones · ' + biblias.length + ' bíblias');
