// Revisão dos desenhos do mapa do livro, ampliados: cada desenho a 280px em três linhas, no traço
// do tema claro (tinta escura sobre papel branco), no do escuro (traço claro sobre papel grafite)
// e sobre o disco de papel do cartão escuro "[Livro] e Cristo", onde tudo o que passa do círculo
// some cortado. Olhe a imagem com calma, peça por peça (skill mapa-do-livro, seção 2).
// Uso: CHROME=<chrome> node ferramentas/ver-desenhos.mjs <saida.png> <id> [id...]
//   TAMANHO=520 amplia cada desenho (padrão 280): a 520px aparecem pontas soltas, cunhas e
//   sobreposições que a 280px passam (Números, 02/10). Com TAMANHO grande, um ou dois ids por vez.
//   ex.: node ferramentas/ver-desenhos.mjs /tmp/desenhos.png escada arca tunica
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const [saida, ...ids] = process.argv.slice(2);
if (!saida || !ids.length) { console.log('Uso: CHROME=<chrome> node ferramentas/ver-desenhos.mjs <saida.png> <id> [id...]'); process.exit(2); }
const CHROME = process.env.CHROME || 'chromium';
const T = Math.max(120, Number(process.env.TAMANHO) || 280);

const svg = (id) => readFileSync(join(AQUI, 'conteudo', 'mapas', 'desenhos', id + '.svg'), 'utf8')
  .replace(/<style>[\s\S]*?<\/style>/, '').replace(/<svg /, '<svg width="' + T + '" height="' + T + '" ');
// as mesmas cores de 27-mapas.css: --v2-tinta-forte, --v2-cartao, --v2-tinta e --salvia de cada tema
const traco = (classe, tinta, papel, cheio, salvia) => `.${classe} .k{fill:none;stroke:${tinta};stroke-width:2;stroke-linecap:round;stroke-linejoin:round}`
  + `.${classe} .h{fill:none;stroke:${tinta};stroke-width:1;stroke-linecap:round;opacity:.7}.${classe} .p{fill:${papel}}.${classe} .e{fill:${cheio}}.${classe} .s{fill:${salvia}}`;
const html = `<!doctype html><html><body style="margin:0;background:#8a8a8a"><style>
.linha{display:flex;gap:12px;padding:6px 12px}.linha>div{width:${T}px;height:${T}px;flex:none}
.claro>div{background:#fff}.escuro>div{background:#252724}
.disco{background:#1b1c1a}.disco>div{background:#f4f5f0;border-radius:50%;overflow:hidden}
${traco('claro', '#151615', '#fff', '#2c2d2b', '#c8da8c')}${traco('escuro', '#eef0ea', '#252724', '#d9dcd3', '#bfd083')}${traco('disco', '#151615', '#fff', '#2c2d2b', '#c8da8c')}
</style>${['claro', 'escuro', 'disco'].map((t) => `<div class="linha ${t}">${ids.map((id) => '<div>' + svg(id) + '</div>').join('')}</div>`).join('')}</body></html>`;

const pasta = mkdtempSync(join(tmpdir(), 'ver-desenhos-'));
writeFileSync(join(pasta, 'folha.html'), html);
// a janela do Chrome sem interface come uns 90px na altura; sobra margem embaixo
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--user-data-dir=' + join(pasta, 'perfil'),
  '--screenshot=' + resolve(saida), '--window-size=' + (ids.length * (T + 12) + 24) + ',' + (3 * (T + 12) + 140), 'file://' + join(pasta, 'folha.html')], { stdio: 'ignore' });
rmSync(pasta, { recursive: true, force: true });
console.log(saida + ' · ' + ids.join(', ') + ' (claro, escuro e sobre o disco de "[Livro] e Cristo")');
