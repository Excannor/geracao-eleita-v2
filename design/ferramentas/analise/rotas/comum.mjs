// Peças comuns dos catálogos de rotas da varredura (rev.mjs). Cada catálogo exporta
// `trabalhos`: [{ nome, hash | url, w, h, tema, acao, espera, esperaAcao, rolar, soTopo, segs }].
//   hash      rota do app (#/...); url: página inteira (as avulsas: "BASE/entrar.html")
//   acao      JS que roda depois de abrir (abrir uma folha, clicar num nó); use clic()/A()/f()
//   rolar     seletor do elemento que rola, quando não é a página (".folha", ".licao-palco")
//   soTopo    só o primeiro segmento; segs: teto de segmentos (padrão 7)
// Variáveis: SO (regex sobre o nome, para rodar parte do catálogo); CELULA (id da célula
// para as rotas #/novidades/celula/<id>: pegue em GET api/propositos com o cookie do líder,
// o propósito com `celula` e `criadoPor` = "marcos").
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const CELULA = process.env.CELULA || '';
export const clic = (sel) => '(() => { const el = document.querySelector(' + JSON.stringify(sel) + '); if (!el) return "sem " + ' + JSON.stringify(sel) + '; el.click(); return "ok"; })()';
export const A = (corpo) => '(async () => { const q = (s) => document.querySelector(s); const esp = (ms) => new Promise((r) => setTimeout(r, ms)); ' + corpo + ' return "ok"; })()';
export const f = (js) => 'void(' + js + ');"ok"';
// O quiz do Praticar em cada estado: pergunta, marcado, acerto, erro, texto, textoerro, fim.
export const quiz = (modo) => "window.__MODO='" + modo + "';" + readFileSync(join(AQUI, 'quiz.js'), 'utf8');
export function expandir(rotas, { larguras = [360, 390], temas = ['claro', 'escuro'] } = {}) {
  const so = process.env.SO ? new RegExp(process.env.SO) : null;
  const out = [];
  for (const r of rotas) {
    if (so && !so.test(r.nome)) continue;
    if (r.precisaCelula && !CELULA) { console.log('  (pulando ' + r.nome + ': diga CELULA=<id da célula>)'); continue; }
    for (const w of larguras) for (const tema of temas) out.push({ ...r, w, tema, h: w === 360 ? 740 : 844 });
  }
  return out;
}
