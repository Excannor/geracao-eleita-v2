(() => {
  const raiz = document.documentElement; const W = raiz.clientWidth; const H = innerHeight;
  const R = { W, H, textos: [], concord: [], semNome: [], imgSemAlt: [], semRotulo: [], reticencias: [], cortado: [], contraste: [], bordas: [], icones: [], alvo: [], colados: [], atras: [], vazios: [], sinal: [] };
  const nome = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; const c = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || ''; if (c.trim()) s += '.' + c.trim().split(/\s+/).slice(0, 3).join('.'); return s; };
  const cam = (el) => { const p = el.parentElement; return (p && p !== document.body ? nome(p) + ' > ' : '') + nome(el); };
  const txt = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70);
  const csC = new Map(); const cs = (el) => { let v = csC.get(el); if (!v) { v = getComputedStyle(el); csC.set(el, v); } return v; };
  const escondido = (el) => { for (let p = el; p && p !== raiz; p = p.parentElement) { const c = cs(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return true; if (c.clipPath && c.clipPath.includes('inset(50%')) return true; if (c.clip && /rect\(0/.test(c.clip)) return true; } return false; };
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && !escondido(el); };
  const naTela = (r) => r.bottom > 0 && r.top < H;
  const parseCor = (s) => { const m = (s || '').match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const mist = (a, b) => ({ r: a.r * a.a + b.r * (1 - a.a), g: a.g * a.a + b.g * (1 - a.a), b: a.b * a.a + b.b * (1 - a.a), a: 1 });
  const razao = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const fundoDe = (el, pularProprio) => {
    const pilha = [];
    for (let p = pularProprio ? el.parentElement : el; p; p = p.parentElement) {
      const c = cs(p);
      if (c.backgroundImage && c.backgroundImage.includes('gradient')) return null;
      const bg = parseCor(c.backgroundColor);
      if (bg && bg.a > 0) { pilha.push(bg); if (bg.a >= 1) break; }
    }
    let cor = parseCor(cs(document.body).backgroundColor); if (!cor || !cor.a) cor = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = pilha.length - 1; i >= 0; i--) cor = mist(pilha[i], cor);
    return cor;
  };
  const opac = (el) => { let o = 1; for (let p = el; p; p = p.parentElement) o *= +cs(p).opacity; return o; };
  const SVG = ['svg', 'path', 'circle', 'line', 'rect', 'g', 'polyline', 'polygon', 'ellipse', 'defs', 'use', 'symbol', 'mask', 'clipPath', 'linearGradient', 'radialGradient', 'stop', 'text', 'tspan'];
  const todos = [...document.querySelectorAll('body *')].filter((el) => !['SCRIPT', 'STYLE'].includes(el.tagName) && !SVG.includes(el.tagName) && vis(el));
  const INTER = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=switch], [role=radio], [role=checkbox], [tabindex="0"]';
  const nomeAcessivel = (el) => (el.getAttribute('aria-label') || '').trim() || (el.getAttribute('aria-labelledby') && (document.getElementById(el.getAttribute('aria-labelledby')) || {}).textContent || '').trim() || (el.getAttribute('title') || '').trim() || [...el.querySelectorAll('img[alt]')].map((i) => i.alt).join(' ').trim() || [...el.querySelectorAll('svg title')].map((t) => t.textContent).join(' ').trim() || (el.innerText || '').trim();
  const SEMACENTO = /(^|[\s(“"'])(nao|voce|voces|ja|ate|tambem|so|esta|estao|sera|serao|facil|dificil|comeca|comecar|proximo|proxima|ultimo|ultima|licao|biblia|celula|oracao|versiculo|historia|codigo|numero|ninguem|alguem|porem|apos|atraves|coracao|graca|ola|amem)([\s,.!?:;)”"']|$)/i;
  const vistosTxt = new Set();
  const interativos = todos.filter((el) => el.matches(INTER));
  const rects = new Map(); const rect = (el) => { let r = rects.get(el); if (!r) { r = el.getBoundingClientRect(); rects.set(el, r); } return r; };
  for (const el of todos) {
    const r = rect(el); const c = cs(el);
    const naBarra = !!el.closest('.navegacao');
    const textoProprio = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    if (textoProprio) {
      // texto para leitura e sinais de escrita
      const t = textoProprio;
      if (!vistosTxt.has(t)) { vistosTxt.add(t); R.textos.push(t); }
      if (/\b1 (dias|pessoas|vezes|amigos|livros|semanas|minutos|horas|capítulos|versículos|lições|passos|cópias|contas|células|pedidos|encontros|toques|notas|perguntas)\b/.test(t) || /\b(0|[2-9]|\d{2,}) (dia|pessoa|vez|amigo|livro|semana|minuto|hora|capítulo|versículo|lição|passo|cópia|conta|célula|pedido|encontro|toque|nota|pergunta)\b(?![\s-]*(de|do|da|em|no|na|por|a|seguid))/.test(t)) R.concord.push(cam(el) + ' "' + t.slice(0, 70) + '"');
      if (/  |\s[,.!?;:]|\.\.\.|\(s\)|\bvc\b|\bpq\b/.test(t) && !/\d\.\.\./.test(t)) R.sinal.push(cam(el) + ' "' + t.slice(0, 70) + '"');
      if (SEMACENTO.test(t) && !/@|https?:/.test(t)) R.sinal.push('acento? ' + cam(el) + ' "' + t.slice(0, 70) + '"');
      // cortes
      const clipX = el.scrollWidth > el.clientWidth + 1 && c.overflowX !== 'visible';
      const clipY = el.scrollHeight > el.clientHeight + 2 && c.overflowY !== 'visible' && !/(auto|scroll)/.test(c.overflowY);
      if ((clipX || clipY) && (c.textOverflow === 'ellipsis' || (c.webkitLineClamp && c.webkitLineClamp !== 'none'))) R.reticencias.push(cam(el) + ' "' + txt(el) + '"');
      else if (clipX || clipY) R.cortado.push(cam(el) + ' ' + el.scrollWidth + 'x' + el.scrollHeight + '>' + el.clientWidth + 'x' + el.clientHeight + ' "' + txt(el) + '"');
      // contraste do texto
      const tc = parseCor(c.color); const bg = fundoDe(el);
      if (tc && bg && naTela(r)) {
        const t2 = mist({ ...tc, a: opac(el) * tc.a }, bg); const ratio = razao(t2, bg);
        const fs = parseFloat(c.fontSize); const grande = fs >= 24 || (fs >= 18.66 && +c.fontWeight >= 700);
        const desab = el.closest('[disabled], [aria-disabled=true]');
        if (ratio < (grande ? 3 : 4.5) && !desab) R.contraste.push(cam(el) + ' ' + ratio.toFixed(2) + ' ' + hex(t2) + '/' + hex(bg) + ' ' + fs + 'px "' + txt(el).slice(0, 40) + '"');
      }
    }
    if (el.tagName === 'IMG' && !el.hasAttribute('alt')) R.imgSemAlt.push(cam(el) + ' ' + (el.getAttribute('src') || '').slice(0, 40));
    // bordas de controles e ícones sozinhos
    const interativo = el.matches(INTER);
    if (interativo && naTela(r)) {
      if (!nomeAcessivel(el) && !el.matches('input, select, textarea')) R.semNome.push(cam(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      if (el.matches('input:not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]), select, textarea')) {
        const rot = (el.id && document.querySelector('label[for="' + el.id + '"]')) || el.closest('label') || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
        if (!rot) R.semRotulo.push(cam(el) + (el.placeholder ? ' (só placeholder "' + el.placeholder + '")' : ''));
      }
      const bg = fundoDe(el); const prop = parseCor(c.backgroundColor); const bw = parseFloat(c.borderTopWidth);
      const fundoPai = fundoDe(el, true);
      if (bw > 0 && fundoPai && c.borderTopStyle !== 'none' && el.matches('input, select, textarea, .botao.contorno, .segmentado button, .opcao, .opcao-traducao, .opcao-sistema, .opcao-caminho, .apoiar-valor, .cor-marca, .filtro, .chip, .pilula')) {
        const bc = parseCor(c.borderTopColor);
        if (bc && bc.a > 0) { const b2 = mist({ ...bc, a: bc.a * opac(el) }, fundoPai); const rz = razao(b2, fundoPai); const rzInt = prop && prop.a > 0 && bg ? razao(b2, bg) : 9; if (rz < 3 && (!prop || prop.a < 0.05 || razao(bg, fundoPai) < 3) && !el.closest('[disabled], [aria-disabled=true]')) R.bordas.push(cam(el) + ' borda ' + rz.toFixed(2) + ' ' + hex(b2) + '/' + hex(fundoPai) + ' "' + txt(el).slice(0, 30) + '"'); }
      } else if (fundoPai && (!prop || prop.a < 0.05) && !(el.innerText || '').trim() && el.querySelector('svg')) {
        // ícone sozinho sem fundo: a cor do ícone contra o fundo
        const tc = parseCor(c.color); if (tc) { const t2 = mist({ ...tc, a: tc.a * opac(el) }, fundoPai); const rz = razao(t2, fundoPai); if (rz < 3 && !el.closest('[disabled], [aria-disabled=true]')) R.icones.push(cam(el) + ' ícone ' + rz.toFixed(2) + ' ' + hex(t2) + '/' + hex(fundoPai) + ' ' + (el.getAttribute('aria-label') || '')); }
      } else if (fundoPai && prop && prop.a > 0.05 && bg && !(el.innerText || '').trim() && el.querySelector('svg')) {
        const tc = parseCor(c.color); if (tc) { const t2 = mist({ ...tc, a: tc.a * opac(el) }, bg); const rz = razao(t2, bg); if (rz < 3 && !el.closest('[disabled], [aria-disabled=true]')) R.icones.push(cam(el) + ' ícone ' + rz.toFixed(2) + ' ' + hex(t2) + '/' + hex(bg) + ' ' + (el.getAttribute('aria-label') || '')); }
      }
      // alvo
      const inlineTexto = c.display === 'inline' && el.closest('p, li, small, h1, h2, h3, figcaption');
      if (!inlineTexto && !el.matches('input[type=checkbox], input[type=radio]')) {
        // área efetiva: o próprio ou um pai interativo/label que o envolve
        let ww = r.width, hh = r.height; const lab = el.closest('label'); if (lab && el.matches('input, select')) { const lr = rect(lab); ww = Math.max(ww, lr.width); hh = Math.max(hh, lr.height); }
        if (hh < 43.5 || ww < 43.5) R.alvo.push(cam(el) + ' ' + Math.round(ww) + 'x' + Math.round(hh) + ' "' + (txt(el) || el.getAttribute('aria-label') || '').slice(0, 24) + '"');
      }
      // colados: outro interativo a menos de 6px, sem ser pai/filho
      const emCima = (x) => { const q = rect(x); const h = document.elementFromPoint(Math.min(W - 1, Math.max(0, q.left + q.width / 2)), Math.min(H - 1, Math.max(0, q.top + q.height / 2))); return h && (x === h || x.contains(h) || h.contains(x)); };
      if (!naBarra && naTela(r) && emCima(el)) for (const o of interativos) {
        if (o === el || o.contains(el) || el.contains(o) || o.closest('.navegacao')) continue;
        const q = rect(o); if (!naTela(q) || !emCima(o)) continue;
        if (Math.min(r.right, q.right) > Math.max(r.left, q.left) && Math.min(r.bottom, q.bottom) > Math.max(r.top, q.top)) continue; // sobrepostos: outro assunto
        if (r.width > W * 0.7 && q.width > W * 0.7) continue; // linhas de lista empilhadas
        const dx = Math.max(0, Math.max(r.left, q.left) - Math.min(r.right, q.right)); const dy = Math.max(0, Math.max(r.top, q.top) - Math.min(r.bottom, q.bottom));
        const sobrepX = Math.min(r.right, q.right) - Math.max(r.left, q.left) > 8; const sobrepY = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 8;
        if ((dx < 6 && sobrepY && dy === 0) || (dy < 6 && sobrepX && dx === 0)) { const k = [nome(el), nome(o)].sort().join(' ~ '); if (!R.colados.some((s) => s.startsWith(k))) R.colados.push(k + ' ' + (dx || dy).toFixed(0) + 'px "' + txt(el).slice(0, 16) + '"/"' + txt(o).slice(0, 16) + '"'); }
      }
    }
  }
  // estados vazios: elementos .estado/.vazio/.sem-* ou textos "Nenhum/Ainda não" sem ação logo abaixo
  for (const el of todos) {
    const t = txt(el);
    if (el.matches('.estado:not(.quem .estado), .vazio, [class*="vazio"], [class*="estado-"]') || (/^(Nenhum|Nenhuma|Ninguém|Ainda não|Ainda sem|Nada por aqui)/.test(t) && el.children.length <= 1 && t.length < 90)) {
      const bloco = el.closest('section, .cartao, .bloco, div') || el;
      const acao = bloco.querySelector('button, a[href]') || (el.nextElementSibling && el.nextElementSibling.matches('button, a[href], p'));
      const k = cam(el) + ' "' + t.slice(0, 60) + '"' + (acao ? '' : ' [SEM AÇÃO/ORIENTAÇÃO]');
      if (!R.vazios.includes(k)) R.vazios.push(k);
    }
  }
  // atrás da barra de abas (com a página rolada até o fim)
  const barra = document.querySelector('.navegacao');
  if (barra && vis(barra)) { const b = barra.getBoundingClientRect(); if (b.top > H / 2) { const conteudo = document.querySelector('.conteudo'); for (const el of (conteudo ? [...conteudo.querySelectorAll('*')] : []).filter((el) => !SVG.includes(el.tagName) && vis(el) && cs(el).position !== 'fixed' && (el.children.length === 0 || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())))) { const r = el.getBoundingClientRect(); if (r.bottom > b.top - 8 && r.top < H && r.top < b.top) R.atras.push(nome(el) + ' fundo ' + Math.round(r.bottom) + ' barra ' + Math.round(b.top) + ' "' + txt(el).slice(0, 24) + '"'); } } }
  const uniq = (a) => [...new Set(a)];
  for (const k of Object.keys(R)) if (Array.isArray(R[k]) && k !== 'textos') R[k] = uniq(R[k]).slice(0, 60);
  return R;
})()
