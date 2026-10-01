// O relatório da igreja que o administrador exporta (Painel › Exportar relatório): o que ele já
// vê no app, num arquivo só. Duas saídas, feitas aqui como funções puras (o teste as exercita
// sem servidor) e servidas por GET /api/painel/relatorio?formato=csv|html em servidor.mjs:
//   - CSV com ";" e BOM UTF-8, que o Excel e o Planilhas em pt-BR abrem com os acentos certos;
//   - uma página HTML de relatório, A4 retrato, com a identidade do app e @media print, que abre
//     o diálogo de impressão sozinha ("Salvar como PDF"). Sem biblioteca: o PDF é o do navegador.
// Entra o painel da igreja (inteligencia.mjs) e o detalhe de cada célula que o admin tem direito
// de ver (o mesmo de GET /api/painel/celula). Nunca o que alguém escreveu, nunca o check-in de
// uma pessoa: só o somado. Ver docs/inteligencia.md §5 e §8.
import { ETAPAS_FUNIL, ESFERAS } from './inteligencia.mjs';

const ROTULOS_MARCO = { decisao: 'Decidiram seguir Jesus', batismo: 'Se batizaram', celula: 'Entraram numa célula', discipula: 'Começaram a acompanhar alguém' };
const ROTULOS_ESFERA = { corpo: 'Corpo', mente: 'Mente', espirito: 'Espírito' };
const ddmm = (iso) => String(iso).slice(8, 10) + '/' + String(iso).slice(5, 7);
const ddmmaaaa = (iso) => String(iso).split('-').reverse().join('/');
const mesNome = (m) => new Date(m + '-15T12:00:00Z').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
// Números com vírgula, como o Excel em pt-BR espera; vazio quando não há número.
const num = (v) => (v === null || v === undefined ? '' : String(v).replace('.', ','));
const pctTexto = (v) => (v === null || v === undefined ? '' : v + '%');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const nomeDoArquivo = (hoje, formato) => 'relatorio-geracao-eleita-' + hoje + '.' + (formato === 'html' ? 'html' : 'csv');

// ---------- CSV ----------
// Blocos um embaixo do outro, cada um com o próprio cabeçalho; a primeira coluna diz o bloco.
// Campo com ";", aspas ou quebra de linha vai entre aspas (aspas dobradas dentro).
export const campoCsv = (v) => {
  const t = v === null || v === undefined ? '' : String(v);
  return /[;"\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
const linha = (...campos) => campos.map(campoCsv).join(';');
export const BOM = '﻿';

// igreja: o painel de GET /api/painel/igreja; celulas: [{ titulo, lider, membros, chama, frequencia, funil, saude, atencao }]
export function csvDoRelatorio({ igreja, celulas, geradoEm }) {
  const a = igreja.adocao;
  const L = [];
  L.push(linha('Relatório da igreja', 'Geração Eleita', 'dia', ddmmaaaa(igreja.hoje), 'gerado em', new Date(geradoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })));
  L.push('');
  L.push(linha('Igreja', 'Indicador', 'Valor'));
  L.push(linha('Igreja', 'Contas', a.contas));
  L.push(linha('Igreja', 'Abriram o app hoje', a.hoje.abriram));
  L.push(linha('Igreja', 'Abriram o app hoje (%)', num(a.hoje.pctAbriram)));
  L.push(linha('Igreja', 'Leram hoje', a.hoje.leram));
  L.push(linha('Igreja', 'Abriram por dia (7 dias antes de hoje)', num(a.media7.abriram)));
  L.push(linha('Igreja', 'Leram por dia (7 dias antes de hoje)', num(a.media7.leram)));
  L.push(linha('Igreja', 'Ainda leem (contas com 30 dias ou mais, %)', num(a.retencao.pct)));
  L.push(linha('Igreja', 'Ainda leem (quantas de quantas)', a.retencao.ativas + ' de ' + a.retencao.base));
  L.push(linha('Igreja', 'Células ativas', (igreja.chamaDasCelulas || []).length));
  L.push('');
  L.push(linha('Por dia', 'Dia', 'Abriram o app', 'Leram'));
  for (const d of a.serie) L.push(linha('Por dia', ddmmaaaa(d.dia), d.abriram, d.leram));
  L.push('');
  const ev = igreja.evangelismo;
  L.push(linha('Frutos', 'Marco de Minha caminhada', mesNome(ev.mes), mesNome(ev.anterior)));
  for (const k of Object.keys(ROTULOS_MARCO)) L.push(linha('Frutos', ROTULOS_MARCO[k], ev.deste[k], ev.doAnterior[k]));
  L.push('');
  const s = igreja.saude;
  L.push(linha('Check-in', 'Esfera', 'Em baixa (%)', 'Média (%)', 'Alta (%)', 'Pessoas'));
  for (const k of ESFERAS) {
    const e = s.suficiente ? s.esferas[k] : null;
    L.push(linha('Check-in', ROTULOS_ESFERA[k], e ? num(e.baixa) : 'poucos', e ? num(e.media) : 'poucos', e ? num(e.alta) : 'poucos', s.base));
  }
  L.push('');
  L.push(linha('Células', 'Célula', 'Líder', 'Pessoas', 'Chama acesa', 'Chama (%)', 'Frequência média (4 semanas)', ...ETAPAS_FUNIL.map(([, r]) => r), 'Check-in: pessoas', ...ESFERAS.map((k) => ROTULOS_ESFERA[k] + ' em baixa')));
  for (const c of celulas) {
    const por = Object.fromEntries((c.funil || []).map((x) => [x.etapa, x.pessoas]));
    const freq = c.frequencia && c.frequencia.encontros.filter((e) => !e.semEncontro);
    const media = freq && freq.length ? Math.round((freq.reduce((t, e) => t + e.pessoas, 0) / freq.length) * 10) / 10 : null;
    L.push(linha('Células', c.titulo, c.lider, c.membros, c.chama.acesos, num(c.chama.pct), num(media), ...ETAPAS_FUNIL.map(([k]) => por[k] ?? 0),
      c.saude ? c.saude.base : '', ...ESFERAS.map((k) => (c.saude && c.saude.suficiente ? c.saude.esferas[k].n.baixa : 'poucos'))));
  }
  L.push('');
  L.push(linha('Pessoas', 'Célula', 'Pessoa', 'Chama', 'Dias seguidos', 'Etapa', 'Presença nas últimas semanas', 'Precisa de atenção'));
  for (const c of celulas) {
    const etapaDe = new Map();
    for (const e of c.funil || []) for (const n of e.nomes || []) etapaDe.set(n.usuario, e.rotulo);
    const atencaoDe = new Map((c.atencao || []).map((x) => [x.usuario, x.motivo]));
    const presencaDe = new Map(((c.frequencia && c.frequencia.presencas) || []).map((x) => [x.usuario, x]));
    const datas = ((c.frequencia && c.frequencia.encontros) || []).map((e) => ddmm(e.data));
    for (const p of (c.chama && c.chama.pessoas) || []) {
      const pr = presencaDe.get(p.usuario);
      const presenca = pr ? pr.encontros.map((v, i) => datas[i] + ' ' + (v === null ? '·' : v ? 'presente' : 'faltou')).join(' | ') : '';
      L.push(linha('Pessoas', c.titulo, p.nome, p.acesa ? 'acesa' : 'apagada', p.dias, etapaDe.get(p.usuario) || '', presenca, atencaoDe.get(p.usuario) || ''));
    }
  }
  return BOM + L.join('\r\n') + '\r\n';
}

// ---------- a página para imprimir / salvar em PDF ----------
// Só tema claro (papel), paleta C do app (sálvia, grafite, cartões), Manrope. Cada seção é um
// cartão que não quebra no meio da página; a tabela das células repete o cabeçalho.
const CSS = `
  @page { size: A4 portrait; margin: 14mm 12mm; }
  :root { --salvia: #c8da8c; --salvia-palido: #eef3de; --salvia-texto: #5a6b2a; --grafite: #151615; --tinta: #3c3c3c; --fraca: #6b6b6b;
    --cartao: #f5f5f3; --borda: #e2e2de; --fundo: #ffffff; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--fundo); color: var(--tinta); }
  body { font-family: 'Manrope', ui-sans-serif, system-ui, 'Segoe UI', Roboto, sans-serif; font-size: 10.5pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  main { max-width: 186mm; margin: 0 auto; padding: 10mm 6mm 14mm; }
  .cabeca { display: flex; align-items: center; gap: 14px; padding-bottom: 12px; border-bottom: 2px solid var(--salvia); }
  .cabeca svg { width: 34px; height: auto; flex: 0 0 auto; color: var(--grafite); }
  .cabeca .marca { font-size: 9pt; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--salvia-texto); }
  .cabeca h1 { margin: 0; font-size: 20pt; font-weight: 800; letter-spacing: -.02em; line-height: 1.1; color: var(--grafite); }
  .cabeca .periodo { margin-left: auto; text-align: right; font-size: 9pt; color: var(--fraca); line-height: 1.4; }
  .imprimir { position: fixed; top: 12px; right: 12px; padding: 10px 16px; border: 0; border-radius: 999px; background: var(--grafite); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
  h2 { margin: 0 0 10px; font-size: 12pt; font-weight: 800; color: var(--grafite); letter-spacing: -.01em; }
  h3 { margin: 0 0 6px; font-size: 10.5pt; font-weight: 800; color: var(--grafite); }
  section, .cartao { break-inside: avoid; page-break-inside: avoid; }
  section { margin-top: 16px; }
  .cartao { padding: 14px 16px; border-radius: 14px; background: var(--cartao); }
  .numeros { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
  .numero { padding: 10px 12px; border-radius: 12px; background: var(--salvia-palido); }
  .numero b { display: block; font-size: 18pt; font-weight: 800; line-height: 1.1; color: var(--grafite); letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .numero span { display: block; margin-top: 2px; font-size: 8.5pt; font-weight: 600; color: var(--salvia-texto); }
  .colunas { display: flex; align-items: flex-end; gap: 4px; height: 70px; padding-top: 14px; }
  .coluna { flex: 1 1 0; display: grid; grid-template-rows: auto 1fr auto; justify-items: center; height: 100%; min-width: 0; }
  .coluna small { font-size: 7.5pt; font-weight: 800; color: var(--grafite); font-variant-numeric: tabular-nums; }
  .coluna i { align-self: end; display: block; width: 100%; max-width: 26px; min-height: 2px; border-radius: 4px 4px 0 0; background: var(--grafite); }
  .coluna em { font-style: normal; font-size: 7pt; color: var(--fraca); font-variant-numeric: tabular-nums; }
  .nota { margin: 8px 0 0; font-size: 8.5pt; color: var(--fraca); }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  thead { display: table-header-group; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--borda); vertical-align: middle; }
  th { font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--salvia-texto); }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .barra { display: inline-block; width: 60px; height: 8px; margin-right: 6px; border-radius: 999px; background: #e4e6dc; vertical-align: middle; overflow: hidden; }
  .barra i { display: block; height: 100%; border-radius: 999px; background: var(--grafite); }
  .barra.salvia i { background: var(--salvia-texto); }
  .lista { margin: 0; padding: 0; list-style: none; }
  .lista li { padding: 3px 0; border-bottom: 1px solid var(--borda); }
  .lista li:last-child { border-bottom: 0; }
  .lista b { color: var(--grafite); }
  .lista small { color: var(--fraca); }
  .duas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .nomes { font-size: 9.5pt; } .nomes b { color: var(--grafite); }
  .presenca th, .presenca td { padding: 4px 6px; } .presenca td.m { text-align: center; font-weight: 800; }
  .presenca td.sim { color: var(--salvia-texto); } .presenca td.nao { color: #b3261e; } .presenca td.nulo { color: var(--fraca); }
  .rodape { margin-top: 18px; padding-top: 8px; border-top: 1px solid var(--borda); font-size: 8pt; color: var(--fraca); }
  @media screen { body { background: #e9eae4; } main { background: var(--fundo); margin: 16px auto; box-shadow: 0 8px 30px rgba(0,0,0,.08); } }
  @media print { .imprimir { display: none; } main { margin: 0; padding: 0; max-width: none; box-shadow: none; } }
`;

function secaoAdocao(a) {
  const maior = Math.max(1, ...a.serie.map((d) => d.abriram));
  return '<section><h2>Adoção e retenção</h2><div class="cartao">'
    + '<div class="numeros">'
    + '<div class="numero"><b>' + a.contas + '</b><span>contas</span></div>'
    + '<div class="numero"><b>' + a.hoje.abriram + '</b><span>abriram o app hoje' + (a.hoje.pctAbriram === null ? '' : ' (' + a.hoje.pctAbriram + '%)') + '</span></div>'
    + '<div class="numero"><b>' + a.hoje.leram + '</b><span>leram hoje</span></div>'
    + '<div class="numero"><b>' + (a.retencao.pct === null ? '–' : a.retencao.pct + '%') + '</b><span>ainda leem (' + a.retencao.ativas + ' de ' + a.retencao.base + ' contas com 30 dias ou mais)</span></div>'
    + '</div>'
    + '<h3>Quem abriu o app, por dia (14 dias)</h3>'
    + '<div class="colunas">' + a.serie.map((d) => '<span class="coluna"><small>' + (d.abriram || '') + '</small><i style="height:' + Math.round((d.abriram / maior) * 100) + '%"></i><em>' + ddmm(d.dia) + '</em></span>').join('') + '</div>'
    + '<p class="nota">Por dia, nos 7 dias antes de hoje: ' + num(a.media7.abriram) + ' abriram e ' + num(a.media7.leram) + ' leram.</p>'
    + '</div></section>';
}

function secaoFrutos(ev) {
  return '<section><h2>Frutos em ' + esc(mesNome(ev.mes)) + '</h2><div class="cartao"><table><thead><tr><th>Marco de Minha caminhada</th><th class="n">' + esc(mesNome(ev.mes)) + '</th><th class="n">' + esc(mesNome(ev.anterior)) + '</th></tr></thead><tbody>'
    + Object.keys(ROTULOS_MARCO).map((k) => '<tr><td>' + ROTULOS_MARCO[k] + '</td><td class="n">' + ev.deste[k] + '</td><td class="n">' + ev.doAnterior[k] + '</td></tr>').join('')
    + '</tbody></table><p class="nota">Pelo que cada pessoa marcou em Minha caminhada, com data no mês.</p></div></section>';
}

function secaoSaude(s, titulo, nota) {
  const corpo = s.suficiente
    ? '<table><thead><tr><th>Esfera</th><th>Em baixa</th><th class="n">Média</th><th class="n">Alta</th></tr></thead><tbody>'
      + ESFERAS.map((k) => { const e = s.esferas[k]; return '<tr><td>' + ROTULOS_ESFERA[k] + '</td><td><span class="barra"><i style="width:' + e.baixa + '%"></i></span>' + e.baixa + '% (' + e.n.baixa + ')</td><td class="n">' + e.media + '%</td><td class="n">' + e.alta + '%</td></tr>'; }).join('')
      + '</tbody></table>'
    : '<p>Ainda poucos check-ins nesta semana (' + s.base + '; a soma aparece a partir de ' + s.minimo + ').</p>';
  return '<section><h2>' + esc(titulo) + '</h2><div class="cartao">' + corpo + '<p class="nota">' + esc(nota) + '</p></div></section>';
}

function secaoCelulas(celulas) {
  return '<section><h2>As células</h2><div class="cartao"><table><thead><tr><th>Célula</th><th>Líder</th><th class="n">Pessoas</th><th>Chama acesa</th><th class="n">Por encontro</th>'
    + ETAPAS_FUNIL.map(([, r]) => '<th class="n">' + esc(r) + '</th>').join('') + '</tr></thead><tbody>'
    + celulas.map((c) => {
      const por = Object.fromEntries((c.funil || []).map((x) => [x.etapa, x.pessoas]));
      const reais = ((c.frequencia && c.frequencia.encontros) || []).filter((e) => !e.semEncontro);
      const media = reais.length ? Math.round((reais.reduce((t, e) => t + e.pessoas, 0) / reais.length) * 10) / 10 : null;
      return '<tr><td><b>' + esc(c.titulo) + '</b></td><td>' + esc(c.lider) + '</td><td class="n">' + c.membros + '</td>'
        + '<td>' + (c.chama.pct === null ? '–' : '<span class="barra salvia"><i style="width:' + c.chama.pct + '%"></i></span>' + c.chama.pct + '% (' + c.chama.acesos + ' de ' + c.chama.total + ')') + '</td>'
        + '<td class="n">' + (media === null ? '–' : num(media)) + '</td>' + ETAPAS_FUNIL.map(([k]) => '<td class="n">' + (por[k] ?? 0) + '</td>').join('') + '</tr>';
    }).join('')
    + '</tbody></table><p class="nota">Chama acesa: leu hoje ou manteve a sequência. Por encontro: média de pessoas nos encontros das últimas 4 semanas. As quatro últimas colunas são a caminhada: cada pessoa na etapa mais adiante que marcou.</p></div></section>';
}

function detalheDaCelula(c) {
  const pessoas = (c.chama && c.chama.pessoas) || [];
  const acesas = pessoas.filter((p) => p.acesa).map((p) => esc(p.nome) + (p.dias ? ' (' + p.dias + ')' : ''));
  const apagadas = pessoas.filter((p) => !p.acesa).map((p) => esc(p.nome));
  const enc = (c.frequencia && c.frequencia.encontros) || [];
  const presencas = (c.frequencia && c.frequencia.presencas) || [];
  const grade = enc.length && presencas.length
    ? '<h3>Presença nas últimas 4 semanas</h3><table class="presenca"><thead><tr><th>Pessoa</th>' + enc.map((e) => '<th class="n">' + ddmm(e.data) + (e.semEncontro ? '<br>sem encontro' : '') + '</th>').join('') + '</tr></thead><tbody>'
      + presencas.map((p) => '<tr><td>' + esc(p.nome) + (p.papel === 'visitante' ? ' <small>(visitante)</small>' : '') + '</td>' + p.encontros.map((v) => (v === null ? '<td class="m nulo">·</td>' : v ? '<td class="m sim">✓</td>' : '<td class="m nao">–</td>')).join('') + '</tr>').join('')
      + '</tbody></table>'
    : '<p class="nota">Nenhum encontro registrado nas últimas 4 semanas.</p>';
  const funil = (c.funil || []).map((e) => '<li><b>' + esc(e.rotulo) + ':</b> ' + e.pessoas + (e.nomes && e.nomes.length ? ' <small>(' + e.nomes.map((n) => esc(n.nome)).join(', ') + ')</small>' : '') + '</li>').join('');
  const atencao = (c.atencao || []).length
    ? '<ul class="lista">' + c.atencao.map((x) => '<li><b>' + esc(x.nome) + '</b> <small>' + esc(x.motivo) + '</small></li>').join('') + '</ul>'
    : '<p class="nota">Ninguém sumido por aqui.</p>';
  const s = c.saude;
  const checkin = s && s.suficiente
    ? '<ul class="lista">' + ESFERAS.map((k) => '<li><b>' + ROTULOS_ESFERA[k] + ' em baixa:</b> ' + s.esferas[k].n.baixa + ' de ' + s.base + '</li>').join('') + '</ul>'
    : '<p class="nota">' + (s && s.base ? s.base + ' check-in(s) nesta semana; a soma aparece a partir de ' + s.minimo + '.' : 'Nenhum check-in nesta semana.') + '</p>';
  return '<section class="cartao"><h2>' + esc(c.titulo) + '</h2>'
    + '<p class="nomes">Líder: <b>' + esc(c.lider) + '</b> · ' + c.membros + ' pessoas · chama acesa em <b>' + (c.chama.pct === null ? '–' : c.chama.pct + '%') + '</b> (' + c.chama.acesos + ' de ' + c.chama.total + ')</p>'
    + '<p class="nomes">' + (acesas.length ? '<b>Acesa:</b> ' + acesas.join(', ') : '') + (acesas.length && apagadas.length ? '<br>' : '') + (apagadas.length ? '<b>Apagada:</b> ' + apagadas.join(', ') : '') + '</p>'
    + grade
    + '<div class="duas"><div><h3>Caminhada</h3><ul class="lista">' + funil + '</ul></div>'
    + '<div><h3>Precisam de atenção</h3>' + atencao + '<h3 style="margin-top:10px">Check-in da célula (somado)</h3>' + checkin + '</div></div>'
    + '</section>';
}

// O único script da página, exportado para o servidor pôr o hash dele na CSP (que libera só os
// scripts do app, por hash). Abre o diálogo de impressão sozinho depois que a fonte carregou; o
// botão fica para quando o navegador bloqueia a chamada automática.
export const SCRIPT_RELATORIO = 'var abrir = function () { try { window.print(); } catch (e) {} };'
  + 'document.querySelector(".imprimir").addEventListener("click", abrir);'
  + 'addEventListener("load", function () { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(abrir, 300); }); });';

// simbolo: o SVG do símbolo GE (arte/logo-simbolo.svg); fonteManrope: o caminho do woff2 que o
// build publicou (ou vazio, caindo na fonte do sistema).
export function htmlDoRelatorio({ igreja, celulas, geradoEm, simbolo = '', fonteManrope = '' }) {
  const a = igreja.adocao;
  const periodo = 'Dia ' + ddmmaaaa(igreja.hoje) + ' · adoção dos últimos 14 dias · células nas últimas 4 semanas · frutos de ' + mesNome(igreja.evangelismo.mes);
  const fonte = fonteManrope ? "@font-face { font-family: 'Manrope'; font-weight: 200 800; font-display: swap; src: url(" + esc(fonteManrope) + ") format('woff2'); }" : '';
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<meta name="robots" content="noindex"><title>Relatório da igreja · Geração Eleita</title><style>' + fonte + CSS + '</style></head><body>'
    + '<button class="imprimir" type="button">Salvar como PDF</button>'
    + '<main>'
    + '<header class="cabeca">' + simbolo + '<div><div class="marca">Geração Eleita</div><h1>Relatório da igreja</h1></div>'
    + '<div class="periodo">' + esc(periodo) + '<br>Gerado em ' + esc(new Date(geradoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })) + '</div></header>'
    + secaoAdocao(a)
    + secaoFrutos(igreja.evangelismo)
    + secaoSaude(igreja.saude, 'Como a igreja está', 'Do último check-in de Corpo, Mente e Espírito de cada pessoa nos últimos 7 dias' + (igreja.saude.suficiente ? ' (' + igreja.saude.base + ' pessoas)' : '') + '. Só a soma: o check-in de uma pessoa nunca aparece.')
    + secaoCelulas(celulas)
    + (celulas.length ? '<section><h2>Cada célula de perto</h2></section>' + celulas.map(detalheDaCelula).join('') : '')
    + '<p class="rodape">Relatório do administrador do Geração Eleita, só para a liderança da igreja. Traz o que a política de privacidade descreve para quem conduz as células e para a administração: nunca o que alguém escreveu, e o check-in só somado.</p>'
    + '</main>'
    + '<script>' + SCRIPT_RELATORIO + '</script>'
    + '</body></html>';
}
