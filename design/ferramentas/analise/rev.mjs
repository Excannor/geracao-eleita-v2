// Varredura de UI/UX: abre cada trabalho (rota × largura × tema) de um catálogo, rola a tela
// em segmentos tirando capturas e roda checar-uiux.js no DOM de cada segmento. Sai um
// relatório por catálogo com o que o verificador achou (concordância, sinais de escrita,
// botões sem nome, imagens sem alt, campos sem rótulo, reticências, texto cortado, contraste
// abaixo de 4,5:1 (3:1 em texto grande), bordas e ícones abaixo de 3:1, alvos menores que
// 44px, controles colados, conteúdo debaixo da barra de abas e estados vazios sem ação).
//
// Uso (a partir da raiz do repositório, com o servidor de teste de pé e semeado):
//   CHROME=<chrome> BASE=http://localhost:8680/ COOKIE="$(cat <pasta>/cookie-marcos.txt)" \
//     node design/ferramentas/analise/rev.mjs rotas/marcos-a.mjs [prefixo] [filtro-regex]
//
//   catálogo  um arquivo que exporta `trabalhos` (veja rotas/*.mjs e rotas/comum.mjs); nome
//             relativo à pasta rotas/ ou caminho de arquivo
//   prefixo   começo do nome das capturas e do relatório (padrão "rev-")
//   filtro    regex sobre "nome-largura-tema" para rodar só parte do catálogo
//   SAIDA     pasta de saída (padrão capturas/analise/revisao, ignorada pelo git);
//             capturas em SAIDA/fotos/<prefixo><nome>-<w>-<tema>[-segmento].png e o
//             relatório em SAIDA/rel/<prefixo>relatorio.json
//   SEGS=0    só mede, sem capturas
//   PRE       JS que roda uma vez depois de abrir o app (ex.: fixar um estado)
//   CELULA    id da célula para as rotas #/novidades/celula/<id> (veja rotas/comum.mjs)
//   SO        regex sobre o nome da rota, aplicada dentro de rotas/comum.mjs expandir()
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { abrir, dormir, AQUI, RAIZ } from './cdp.mjs';

const [, , arqTrab, prefixo = 'rev-', filtro = ''] = process.argv;
if (!arqTrab) { console.log('diga o catálogo: node design/ferramentas/analise/rev.mjs rotas/rute.mjs [prefixo] [filtro]'); process.exit(1); }
const SAIDA = process.env.SAIDA || join(RAIZ, 'capturas', 'analise', 'revisao');
const FOTOS = join(SAIDA, 'fotos');
const REL = join(SAIDA, 'rel');
mkdirSync(FOTOS, { recursive: true });
mkdirSync(REL, { recursive: true });

const candidatos = [arqTrab, join(AQUI, arqTrab), join(AQUI, 'rotas', arqTrab)].map((c) => (isAbsolute(c) ? c : join(process.cwd(), c)));
const arquivo = candidatos.find((c) => existsSync(c));
if (!arquivo) { console.log('catálogo não encontrado: ' + arqTrab); process.exit(1); }
let { trabalhos } = await import(pathToFileURL(arquivo).href);
if (filtro) trabalhos = trabalhos.filter((t) => new RegExp(filtro).test(t.nome + '-' + t.w + '-' + (t.tema || '')));
if (!trabalhos.length) { console.log('nenhum trabalho no catálogo (filtro?)'); process.exit(1); }

const CHECAR = readFileSync(join(AQUI, 'checar-uiux.js'), 'utf8');
const BASE = (process.env.BASE || 'http://localhost:8680/').replace(/\/?$/, '/');
const SEGS = process.env.SEGS === undefined ? 1 : Number(process.env.SEGS);

const { cmd, av, fechar } = await abrir({ cookie: process.env.COOKIE || '', base: BASE });
await cmd('Page.navigate', { url: BASE });
await dormir(1500);
if (process.env.PRE) await av(process.env.PRE);

const relatorio = {};
let n = 0;
for (const t of trabalhos) {
  const W = t.w; const H = t.h || (W >= 800 ? 900 : 800);
  const tema = t.tema || 'claro';
  const id = prefixo + t.nome + '-' + W + '-' + tema;
  await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W < 800 ? 2 : 1, mobile: W < 800 });
  await av("localStorage.setItem('cc.tema', " + JSON.stringify(JSON.stringify(tema === 'escuro')) + ')');
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'escuro' ? 'dark' : 'light' }] });
  // ?r= muda a cada rota: o navegador recarrega mesmo quando só o hash muda
  const url = t.url ? t.url.replace(/^BASE\//, BASE) : BASE + '?r=' + (++n) + (t.hash || '#/');
  await cmd('Page.navigate', { url });
  await dormir(t.espera || 1800);
  if (t.acao) { const r = await av(t.acao); if (r && r.erro) console.log('  acao erro', id, r.erro); await dormir(t.esperaAcao || 900); }
  const scroller = t.rolar ? 'document.querySelector(' + JSON.stringify(t.rolar) + ')' : 'document.scrollingElement';
  const [sh, ch] = (await av('(() => { const s = ' + scroller + '; return s ? [s.scrollHeight, s.clientHeight] : [0, 0]; })()')) || [0, 0];
  const passo = Math.max(200, ch - 180);
  const posicoes = [0];
  if (!t.soTopo) for (let y = passo; y < sh - ch + passo; y += passo) posicoes.push(Math.min(y, sh - ch));
  const maxSeg = t.segs || 7;
  let pos = [...new Set(posicoes)];
  if (pos.length > maxSeg) pos = [...pos.slice(0, maxSeg - 1), pos[pos.length - 1]];
  const checks = [];
  for (let i = 0; i < pos.length; i++) {
    if (!t.soTopo) await av('(() => { const s = ' + scroller + '; if (s) s.scrollTop = ' + pos[i] + '; })()');
    await dormir(i === 0 ? 250 : 450);
    if (SEGS) {
      const foto = await cmd('Page.captureScreenshot', { format: 'png' });
      if (foto.data) writeFileSync(join(FOTOS, id + (pos.length > 1 ? '-' + i : '') + '.png'), Buffer.from(foto.data, 'base64'));
    }
    checks.push(await av(CHECAR));
  }
  const junta = {};
  for (const c of checks) {
    if (!c || c.erro) { console.log('  checar erro', id, c && c.erro); continue; }
    for (const [k, v] of Object.entries(c)) {
      if (Array.isArray(v)) junta[k] = [...new Set([...(junta[k] || []), ...v])];
      else junta[k] = junta[k] || v;
    }
  }
  // "atrás da barra" só vale com a página rolada até o fim: o último segmento
  junta.atras = checks.length ? ((checks[checks.length - 1] || {}).atras || []) : [];
  relatorio[id] = { hash: t.hash || t.url, segs: pos.length, sh, ...junta };
  const linhas = [];
  for (const k of ['concord', 'sinal', 'semNome', 'imgSemAlt', 'semRotulo', 'reticencias', 'cortado', 'contraste', 'bordas', 'icones', 'alvo', 'colados', 'atras', 'vazios']) {
    if (junta[k] && junta[k].length) linhas.push(k + ': ' + junta[k].join(' | '));
  }
  console.log('\n## ' + id + ' (' + (t.hash || t.url) + ') segs=' + pos.length + ' sh=' + sh + '\n  ' + (linhas.join('\n  ') || 'limpo'));
}
const arqRel = join(REL, prefixo + 'relatorio.json');
writeFileSync(arqRel, JSON.stringify(relatorio, null, 1));
console.log('\nrelatório: ' + arqRel + '\ncapturas: ' + FOTOS);
await fechar();
process.exit(0);
