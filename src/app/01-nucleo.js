/* Núcleo: ícones, texto, datas e as peças de interface que todas as telas usam. */
window.CC = window.CC || {};
(function (CC) {
  'use strict';

  CC.D = window.DADOS;

  // ---------- texto ----------
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  CC.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
  CC.semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  CC.plural = (n, um, muitos) => n + ' ' + (n === 1 ? um : muitos);
  CC.semPrefixo = (nome) => String(nome || '').replace(/^\d+\s*-\s*/, '');

  // ---------- datas ----------
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  CC.hojeIso = () => iso(new Date());

  // O app começa depois que o conteúdo chega, e a página pode já ter terminado de carregar:
  // aí o "load" não vem mais, e quem esperava por ele roda na hora.
  // Quem rola: no iPhone com o app instalado é a .aplicativo (ver html.app-ios no estilo.css),
  // em todo o resto é a página. Voltar ao topo e guardar a posição passam por aqui.
  const areaRolavel = () => {
    const el = document.documentElement.classList.contains('app-ios') && document.querySelector('.aplicativo');
    return el && getComputedStyle(el).overflowY === 'auto' ? el : null;
  };
  CC.rolagemY = () => { const el = areaRolavel(); return el ? el.scrollTop : scrollY; };
  CC.rolarPara = (y) => { const el = areaRolavel(); if (el) el.scrollTop = y; else scrollTo(0, y); };

  // Referência de versículo, num lugar só: "João 3.16" ou "1 João 4.7-8". O trecho vai até
  // MAX_TRECHO versículos seguidos do mesmo capítulo. Roda também no servidor.
  CC.MAX_TRECHO = 10;
  CC.lerRef = (ref) => {
    const m = /^(.+?) (\d{1,3})\.(\d{1,3})(?:-(\d{1,3}))?$/.exec(String(ref || '').trim());
    if (!m) return null;
    const de = Number(m[3]);
    const ate = Number(m[4] || m[3]);
    if (!(de >= 1) || ate < de || ate - de + 1 > CC.MAX_TRECHO) return null;
    return { livro: m[1], cap: Number(m[2]), de, ate };
  };
  CC.escreverRef = (livro, cap, de, ate) => livro + ' ' + cap + '.' + de + (ate && ate !== de ? '-' + ate : '');
  CC.hrefDoVerso = (ref) => {
    const r = CC.lerRef(ref);
    return r ? '#/biblia/' + encodeURIComponent(r.livro) + '/' + r.cap : '#/biblia';
  };

  // No app instalado no iPhone a raiz nunca rola, mas o iOS rola a raiz sozinho para mostrar um
  // campo acima do teclado (e o scrollIntoView da folha ajuda). Com overflow:hidden ninguém
  // desfaz isso com o dedo: fechado o teclado, a tela inteira ficava deslocada para cima, com a
  // barra de abas no meio e fundo vazio embaixo. Sem campo em foco, a raiz volta para o zero.
  CC.endireitarRaiz = () => {
    if (!areaRolavel()) return;
    const foco = document.activeElement;
    if (foco && /^(INPUT|TEXTAREA|SELECT)$/.test(foco.tagName)) return;
    const raiz = document.scrollingElement || document.documentElement;
    if (raiz.scrollTop || scrollY) { raiz.scrollTop = 0; scrollTo(0, 0); }
  };
  addEventListener('focusout', () => setTimeout(CC.endireitarRaiz, 120));
  if (window.visualViewport) visualViewport.addEventListener('resize', () => setTimeout(CC.endireitarRaiz, 120));

  CC.quandoCarregar = (fn) => (document.readyState === 'complete' ? setTimeout(fn, 0) : addEventListener('load', fn));
  CC.somaDias = (texto, n) => {
    const d = new Date(texto + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return iso(d);
  };
  CC.DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  CC.diaDaSemana = (texto) => CC.DIAS_CURTOS[new Date(texto + 'T12:00:00').getDay()];

  // ---------- ícones ----------
  // Traçado aberto, 2.2 de espessura: é o que dá o ar de aplicativo e não de documento.
  const PREENCHIDOS = { chama: 1, coroa: 1, estrela: 1, raio: 1 };
  const P = {
    trilha: '<path d="M1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6z"/><path d="M8 2v16"/><path d="M16 6v16"/>',
    bandeira: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    bussola: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
    pessoa: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    pessoas: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    livro: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    marcador: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    elo: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    camadas: '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    alfinete: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    aperto: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    casa: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    balao: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    folha: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    caneta: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    lupa: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    cadeado: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    certo: '<path d="M20 6 9 17l-5-5"/>',
    fechar: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    voltar: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    avancar: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    baixo: '<path d="m6 9 6 6 6-6"/>',
    lua: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    sol: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="m4.2 4.2 1.4 1.4"/><path d="m18.4 18.4 1.4 1.4"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="m4.2 19.8 1.4-1.4"/><path d="m18.4 5.6 1.4-1.4"/>',
    alvo: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    medalha: '<circle cx="12" cy="8" r="7"/><path d="M8.2 13.9 7 23l5-3 5 3-1.2-9.1"/>',
    trofeu: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4v1a4 4 0 0 0 4 4"/><path d="M17 5h3v1a4 4 0 0 1-4 4"/><path d="M12 14v4"/><path d="M9 21h6"/><path d="M10 18h4v3h-4z"/>',
    baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    lixeira: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    cruz: '<path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6z"/>',
    compartilhar: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
    imagem: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    bloquear: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    'mais-sinal': '<path d="M12 5v14"/><path d="M5 12h14"/>',
    mais: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    sino: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 7 2.6h.1A1.7 1.7 0 0 0 9 1V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 2.6a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V7a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    // preenchidos
    // chama e raio vêm do Bootstrap Icons (MIT), que desenha o fogo com o miolo vazado
    chama: '<path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16zm0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15z"/>',
    raio: '<path d="M13 2 3 14h8l-1 8 10-12h-8z"/>',
    coroa: '<path d="M5 19h14l1.3-10.4-4.9 3.4L12 4.6 8.6 12 3.7 8.6z"/>',
    estrela: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/>',
  };

  const CAIXAS = { chama: '0 0 16 16' };

  CC.ico = (nome, extra) => {
    const d = P[nome];
    if (!d) return '';
    const preenchido = nome in PREENCHIDOS;
    const pintura = preenchido
      ? 'fill="currentColor"'
      : 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
    return '<svg viewBox="' + (CAIXAS[nome] || '0 0 24 24') + '" ' + pintura + ' aria-hidden="true"'
      + (extra ? ' ' + extra : '') + '>' + d + '</svg>';
  };

  // ---------- ícones da barra de navegação ----------
  // Preenchidos, ao contrário dos de traço usados no resto do aplicativo. São desenhados
  // em dois tons (a e b): antes eram duas cores, hoje são a mesma cor em duas opacidades.
  // Os dois precisam ser diferentes — várias destas formas são chapas sobrepostas, e com
  // um tom só viram uma mancha sólida (foi o que aconteceu com a bússola e o alvo).
  const ICONES_ABA = {
    // mapa dobrado em três painéis
    trilha: (a, b) => '<path d="M5 13l13-6v30l-13 6z" fill="' + b + '"/>'
      + '<path d="M18 7l12 6v30l-12-6z" fill="' + a + '"/>'
      + '<path d="M30 13l13-6v30l-13 6z" fill="' + b + '"/>'
      + '<path d="M18 7l12 6v30l-12-6z" fill="' + a + '"/>',
    // bandeira fincada
    bandeira: (a, b) => '<rect x="9" y="6" width="6" height="37" rx="3" fill="' + b + '"/>'
      + '<path d="M15 9c7-4 15 4 23 0v17c-8 4-16-4-23 0z" fill="' + a + '"/>',
    // alvo de três anéis
    alvo: (a, b) => '<circle cx="24" cy="24" r="18" fill="' + a + '"/>'
      + '<circle cx="24" cy="24" r="12" fill="' + b + '"/>'
      + '<circle cx="24" cy="24" r="5" fill="' + a + '"/>',
    // bússola com a agulha. Sem o disco interno: ele existia para a agulha branca ter um
    // fundo colorido atrás. Em tom único, disco e agulha viravam a mesma mancha.
    bussola: (a, b) => '<circle cx="24" cy="24" r="18" fill="' + b + '"/>'
      + '<path d="M31 17l-4 11-11 4 4-11z" fill="' + a + '"/>',
    // pessoa de frente
    pessoa: (a, b) => '<circle cx="24" cy="16" r="8" fill="' + a + '"/>'
      + '<path d="M24 27c-8 0-14 5-14 12 0 2 1 3 3 3h22c2 0 3-1 3-3 0-7-6-12-14-12z" fill="' + b + '"/>',
    // baú fechado, das missões
    bau: (a, b) => '<rect x="6" y="20" width="36" height="22" rx="5" fill="' + b + '"/>'
      + '<path d="M6 20c0-7 5-12 12-12h12c7 0 12 5 12 12v4H6z" fill="' + a + '"/>'
      + '<rect x="6" y="22" width="36" height="5" fill="' + b + '" opacity=".55"/>'
      + '<rect x="19" y="18" width="10" height="13" rx="3" fill="' + b + '"/><circle cx="24" cy="24" r="2" fill="' + a + '"/>',
    // balão de conversa com um coração, das novidades
    novidades: (a, b) => '<path d="M8 8h32a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H22l-9 7v-7H8a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" fill="' + a + '"/>'
      + '<path d="M24 30s-9-5-9-11a4.6 4.6 0 0 1 9-1.6A4.6 4.6 0 0 1 33 19c0 6-9 11-9 11z" fill="' + b + '"/>'
      + '<path d="M40 8a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4h-6c5-8 5-20 0-28z" fill="' + b + '" opacity=".35"/>',
    // livro aberto, dos dias lidos
    livro: (a, b) => '<path d="M4 10c7-3 14-3 20 1v30c-6-4-13-4-20-1z" fill="' + a + '"/>'
      + '<path d="M44 10c-7-3-14-3-20 1v30c6-4 13-4 20-1z" fill="' + b + '"/>',
    // fogo, o mesmo da ofensiva (a lamparina de barro saiu do app)
    chama: (a, b) => '<path d="M24 4c3 7 12 12 12 22 0 9-6 16-12 16s-12-7-12-16c0-6 3-10 6-13 0 5 2 8 5 9-2-7-1-13 1-18z" fill="' + a + '"/>'
      + '<path d="M24 24c2 4 6 7 6 11 0 4-3 7-6 7s-6-3-6-7c0-4 4-7 6-11z" fill="' + b + '"/>',
    // brasa apagada: só a fumaça subindo
    'chama-apagada': () => '<path d="M24 42c-6-5 4-9-1-15-4-5 3-9 0-15" fill="none" stroke="#9aa7b0" stroke-width="3" stroke-linecap="round" opacity=".7"/>'
      + '<path d="M16 44h16" stroke="#9aa7b0" stroke-width="3" stroke-linecap="round"/>',
    escudo: (a, b) => '<path d="M24 4 40 10v12c0 11-7 19-16 22C15 41 8 33 8 22V10z" fill="' + a + '"/>'
      + '<path d="M24 4v40C15 41 8 33 8 22V10z" fill="' + b + '" opacity=".5"/>',
    sino: (a, b) => '<path d="M24 5c-8 0-13 6-13 14v8l-4 7h34l-4-7v-8c0-8-5-14-13-14z" fill="' + a + '"/>'
      + '<path d="M19 38a5 5 0 0 0 10 0z" fill="' + b + '"/>',
    // marcador de página, dos versículos guardados
    marcador: (a, b) => '<path d="M11 4h26c1.7 0 3 1.3 3 3v37l-16-10-16 10V7c0-1.7 1.3-3 3-3z" fill="' + a + '"/>'
      + '<path d="M11 4h13v30L8 44V7c0-1.7 1.3-3 3-3z" fill="' + b + '"/>',
    // lápis, da história escrita pela pessoa
    caneta: (a, b) => '<path d="M33 5l10 10-24 24-10 1 1-10z" fill="' + a + '"/>'
      + '<path d="M29 9l10 10-4 4-10-10z" fill="' + b + '"/>'
      + '<rect x="6" y="42" width="36" height="3" rx="1.5" fill="' + b + '"/>',
    // duas pessoas lado a lado
    amigos: (a, b) => '<circle cx="17" cy="17" r="7" fill="' + a + '"/>'
      + '<path d="M17 27c-7 0-12 4-12 10 0 2 1 3 3 3h18c2 0 3-1 3-3 0-6-5-10-12-10z" fill="' + b + '"/>'
      + '<circle cx="33" cy="15" r="6" fill="' + b + '"/>'
      + '<path d="M33 24c-2 0-4 .4-5.5 1.2 3 2.4 4.5 6 4.5 10.3 0 1.3-.2 2.4-.6 3.5H41c2 0 3-1 3-3 0-7-5-12-11-12z" fill="' + a + '"/>',
    // casa da célula: telhado e porta em destaque, corpo no tom fraco. Desenho do mock
    // aprovado (mock-hibrida.mjs), reaproveitado tal e qual.
    casa: (a, b) => '<path d="M24 5 3 23h6v19c0 1.7 1.3 3 3 3h24c1.7 0 3-1.3 3-3V23h6z" fill="' + b + '"/>'
      + '<path d="M24 5 3 23h6l15-12.5L39 23h6z" fill="' + a + '"/>'
      + '<path d="M19 45V32c0-1.7 1.3-3 3-3h4c1.7 0 3 1.3 3 3v13z" fill="' + a + '"/>',
    // dupla do discipulado: duas cabeças e os dois corpos, uma pessoa acompanhando a outra.
    // Mesmo desenho do mock aprovado (mock-hibrida.mjs), reaproveitado tal e qual.
    dupla: (a, b) => '<circle cx="15" cy="9" r="6" fill="' + a + '"/>'
      + '<circle cx="33" cy="9" r="6" fill="' + b + '"/>'
      + '<path d="M26 19h14c2 0 3 1.3 3 3v23h-6V32h-3v13h-8z" fill="' + b + '"/>'
      + '<path d="M8 16h13c1.7 0 3 1.3 3 3v26h-6V32h-3v13H6V19c0-1.7.8-3 2-3z" fill="' + a + '"/>'
      + '<path d="M21 16h19c2.8 0 4.5 1.8 4.5 4.2V27h-5v-5.5H21z" fill="' + a + '"/>',
  };

  // Os ícones herdam a cor de quem os contém (currentColor) em vez de trazerem a sua: é o
  // CSS que diz se aquele ícone está numa aba ativa, numa apagada ou dentro de um cartão.
  // Antes cada um tinha cor própria e a barra virava um arco-íris, que briga com uma logo
  // preta e branca. A chama é a única exceção: fogo é fogo, e a cor dela conta uma coisa
  // que o cinza não conta — fica fixa nos dois temas, como o resto da arte de fogo.
  const HERDA = ['currentColor', 'color-mix(in srgb, currentColor 45%, transparent)'];
  const CORES_ABA = {
    trilha: HERDA,
    bandeira: HERDA,
    alvo: HERDA,
    bussola: HERDA,
    pessoa: HERDA,
    amigos: HERDA,
    marcador: HERDA,
    caneta: HERDA,
    bau: HERDA,
    novidades: HERDA,
    livro: HERDA,
    chama: ['#e23d1b', '#ff9d1c'],
    'chama-apagada': HERDA,
    escudo: HERDA,
    sino: HERDA,
    casa: HERDA,
    dupla: HERDA,
  };

  CC.icoAba = (nome) => {
    const desenho = ICONES_ABA[nome];
    if (!desenho) return CC.ico(nome);
    const [a, b] = CORES_ABA[nome] || ['#888', '#555'];
    return '<svg viewBox="0 0 48 48" class="ico-aba" aria-hidden="true">' + desenho(a, b) + '</svg>';
  };

  // ---------- o símbolo da logo (Geração Eleita) ----------
  // O "GE" na chama, um traço só, cor herdada (currentColor): a marca da igreja,
  // no lugar de onde a cruz ficava e no alto da tela de abertura.
  const CAMINHO_SIMBOLO = 'M13144 22941 c-157 -111 -405 -342 -531 -496 -69 -85 -243 -353 -281 -434 -19 -42 -43 -87 -53 -101 -9 -14 -39 -88 -67 -165 -63 -178 -70 -201 -81 -256 -5 -24 -18 -80 -30 -123 -38 -142 -45 -472 -16 -656 53 -326 279 -836 568 -1285 32 -49 100 -154 150 -232 51 -79 119 -182 151 -230 489 -725 668 -1125 740 -1658 32 -241 -63 -625 -222 -893 -352 -593 -497 -921 -578 -1312 -22 -103 -25 -433 -5 -550 52 -312 209 -642 410 -865 144 -159 218 -292 255 -455 20 -90 32 -365 19 -435 -16 -88 -4 -95 63 -33 75 69 130 156 192 305 125 300 216 421 442 590 84 63 193 116 325 158 425 134 507 169 657 277 77 55 179 102 291 133 103 28 397 33 397 6 0 -5 -46 -28 -102 -52 -117 -49 -229 -120 -282 -179 -58 -64 -43 -78 56 -52 99 26 429 22 564 -6 528 -112 919 -371 1198 -792 121 -184 133 -204 145 -241 5 -19 28 -88 51 -154 69 -204 84 -353 54 -552 -32 -219 -108 -362 -270 -508 -332 -301 -426 -446 -515 -795 -22 -89 -32 -261 -15 -270 6 -3 37 33 70 79 149 211 400 374 630 411 276 44 641 332 851 670 144 233 190 345 280 685 98 371 115 845 45 1265 -5 30 -14 89 -20 130 -118 760 -419 1407 -861 1853 -126 126 -135 117 -66 -65 197 -512 257 -906 189 -1238 -57 -278 -223 -504 -386 -526 -133 -19 -218 41 -247 174 -19 90 46 278 98 284 61 7 160 211 183 379 29 210 -25 447 -148 639 -45 72 -184 240 -292 355 -48 51 -109 121 -135 156 -27 35 -61 78 -75 95 -35 41 -103 182 -137 285 -26 80 -28 94 -28 269 1 226 23 310 131 482 35 56 61 105 58 110 -15 24 -214 -75 -317 -159 -234 -191 -402 -647 -384 -1043 19 -415 222 -798 532 -1007 117 -79 165 -151 165 -249 0 -73 -40 -118 -114 -129 -50 -8 -64 -4 -226 65 -339 143 -597 201 -920 208 -412 8 -725 -56 -1049 -213 -196 -96 -350 -207 -574 -416 -72 -68 -132 -117 -139 -113 -7 5 -9 34 -5 88 15 216 124 545 242 734 135 217 213 337 251 385 102 131 299 482 339 605 25 79 37 55 30 -62 -8 -125 -37 -286 -70 -389 -37 -115 -30 -126 37 -54 115 124 275 423 352 656 146 445 158 896 40 1424 -45 204 -176 615 -223 702 -12 22 -21 44 -21 48 0 5 -15 41 -34 80 -19 40 -45 99 -59 133 -14 33 -49 99 -78 145 -28 46 -60 105 -70 131 -10 26 -32 67 -50 90 -17 24 -37 58 -44 76 -8 18 -54 91 -102 163 -98 145 -128 191 -171 264 -16 28 -54 77 -83 111 -30 33 -81 95 -114 139 -78 102 -246 294 -465 530 -231 249 -251 276 -516 685 -43 65 -167 375 -193 480 -132 540 -49 1087 251 1643 72 133 67 142 -38 68z M13346 21468 c-8 -46 8 -210 29 -308 38 -175 209 -555 331 -735 37 -55 98 -158 137 -230 81 -153 102 -179 121 -152 28 36 49 179 44 289 -11 220 -108 410 -364 713 -62 74 -180 265 -230 371 -48 105 -58 113 -68 52z M11586 20638 c-72 -110 -115 -397 -85 -564 30 -169 146 -441 175 -411 3 3 10 35 15 72 5 38 23 107 40 154 73 206 72 242 -6 396 -46 90 -79 194 -90 280 -9 75 -14 95 -25 95 -5 0 -16 -10 -24 -22z M10060 20455 c0 -8 23 -55 51 -105 182 -321 290 -674 306 -1005 10 -202 10 -202 -6 -285 -7 -36 -19 -108 -26 -162 -9 -57 -28 -130 -48 -180 -19 -45 -44 -116 -56 -156 -33 -109 -73 -187 -288 -565 -287 -502 -396 -790 -444 -1171 -22 -184 12 -480 80 -686 72 -215 225 -452 376 -580 160 -136 196 -272 94 -362 -53 -48 -96 -50 -228 -11 -89 26 -99 32 -175 102 -283 260 -474 678 -502 1099 -10 149 -27 148 -94 -7 -88 -204 -109 -372 -76 -622 47 -348 299 -649 700 -835 192 -88 412 -142 611 -149 83 -2 117 -8 169 -29 111 -45 121 -32 51 58 -52 68 -55 84 -19 117 54 49 80 132 101 319 5 39 13 65 20 65 6 0 37 -40 68 -90 135 -215 220 -310 390 -438 149 -112 280 -224 366 -313 164 -172 319 -485 374 -756 41 -205 41 -205 -109 -72 -245 216 -829 609 -1206 811 -319 171 -596 273 -875 323 -60 11 -135 24 -165 30 -182 35 -554 35 -728 0 -209 -42 -253 -55 -382 -114 -380 -174 -683 -487 -903 -934 -290 -586 -351 -1305 -147 -1727 48 -98 118 -190 265 -345 129 -137 235 -362 285 -604 33 -160 25 -184 -31 -93 -80 131 -230 296 -351 387 -122 92 -138 82 -94 -59 40 -126 83 -301 96 -391 43 -308 77 -483 130 -670 57 -200 55 -206 -43 -127 -240 192 -288 233 -310 266 -13 20 -67 81 -119 137 -53 56 -108 123 -123 150 -15 27 -36 62 -47 77 -89 129 -255 521 -288 682 -5 22 -18 78 -30 125 -44 182 -70 537 -40 555 6 3 51 -31 101 -77 136 -125 141 -121 80 67 -44 136 -96 254 -135 304 -14 19 -26 43 -26 53 0 37 -30 88 -134 227 -132 177 -145 203 -220 426 -34 99 -65 180 -71 180 -16 0 -71 -266 -94 -455 -138 -1113 42 -1917 558 -2489 212 -235 371 -347 761 -536 339 -164 490 -262 643 -418 100 -102 195 -222 184 -233 -3 -3 -48 24 -101 60 -163 111 -163 97 -11 -191 137 -257 270 -461 400 -614 138 -159 125 -169 -66 -53 -354 216 -573 402 -687 584 -22 36 -74 135 -116 221 -68 140 -83 164 -146 227 -75 75 -223 182 -252 182 -75 0 103 -548 260 -800 246 -396 702 -866 1210 -1248 314 -236 570 -421 645 -467 18 -10 68 -46 113 -80 44 -33 122 -89 173 -125 225 -159 398 -296 570 -452 72 -65 97 -74 87 -31 -13 52 -174 316 -237 389 -27 31 -60 77 -73 102 -13 26 -47 76 -76 112 -29 36 -71 92 -93 125 -74 109 -126 167 -376 420 -378 382 -376 378 -113 271 176 -71 244 -93 416 -131 108 -23 176 -33 381 -51 120 -11 413 31 525 76 253 100 271 111 434 255 176 155 252 262 374 529 120 263 158 445 171 827 10 259 13 277 42 229 30 -48 41 -33 65 86 34 166 96 343 179 509 164 328 360 536 758 804 166 113 326 274 432 434 77 117 84 86 19 -81 -83 -213 -139 -298 -355 -538 l-126 -141 -7 -169 c-3 -93 -9 -300 -12 -459 l-6 -291 40 -79 c116 -232 172 -501 159 -775 -14 -292 -68 -475 -217 -740 l-48 -85 -6 -250 c-4 -137 -14 -342 -22 -455 -23 -311 -53 -1001 -54 -1236 0 -121 2 -143 16 -148 16 -6 105 30 249 99 39 19 95 43 125 55 30 12 87 38 125 59 39 21 82 41 97 45 15 3 54 22 87 41 80 47 144 74 215 91 33 8 75 23 95 34 20 10 88 39 151 64 63 24 142 57 175 72 33 14 116 46 185 69 136 47 421 152 485 179 22 10 70 26 107 36 84 23 97 11 42 -38 -21 -19 -77 -72 -124 -117 -47 -45 -95 -86 -108 -90 -21 -6 -160 -106 -302 -217 -241 -188 -667 -597 -836 -803 -55 -66 -127 -151 -162 -190 -74 -82 -116 -160 -107 -198 6 -22 1 -29 -35 -52 -22 -14 -83 -64 -135 -111 -52 -47 -99 -83 -104 -80 -5 3 -12 32 -16 63 -35 297 -118 475 -324 693 -302 320 -599 1006 -603 1394 -4 369 160 781 433 1091 243 276 385 693 349 1028 -17 158 -74 350 -134 449 -49 82 -56 76 -56 -49 -1 -189 -44 -356 -136 -531 -100 -189 -142 -243 -378 -483 -428 -438 -587 -698 -672 -1099 -26 -119 -27 -494 -2 -590 9 -36 22 -92 29 -125 26 -136 135 -397 255 -616 35 -64 64 -119 64 -123 0 -25 -123 54 -225 145 -38 34 -87 75 -108 90 -49 36 -172 177 -182 209 -4 14 -18 41 -30 61 -51 80 -96 184 -130 296 -38 130 -44 225 -25 383 22 175 23 210 10 210 -21 0 -93 -86 -144 -173 -27 -45 -64 -105 -82 -133 -84 -132 -124 -381 -93 -574 14 -88 71 -257 116 -342 48 -91 319 -348 368 -348 6 0 24 -14 41 -31 32 -34 217 -177 286 -221 44 -29 109 -76 219 -163 35 -27 174 -132 309 -233 410 -306 525 -411 680 -616 41 -55 80 -101 87 -103 6 -2 38 35 69 84 83 124 232 309 362 446 61 64 114 128 118 141 4 15 17 29 35 35 16 6 55 34 87 63 31 30 88 80 127 113 83 72 450 401 553 496 51 48 76 79 83 104 9 32 86 132 158 206 15 14 72 56 128 92 56 37 104 71 108 77 14 22 185 148 331 244 32 21 70 49 84 62 29 26 129 94 139 94 4 0 38 23 76 50 38 27 75 50 81 50 6 0 46 25 90 56 43 31 108 75 144 97 154 94 461 323 610 456 125 111 404 395 442 449 16 23 33 42 38 42 5 0 26 25 46 56 21 31 65 86 99 124 64 69 222 298 311 450 153 261 318 709 331 903 7 95 0 96 -65 15 -114 -142 -453 -467 -597 -573 -44 -32 -123 -97 -175 -143 -95 -85 -171 -140 -424 -309 -136 -91 -188 -114 -167 -75 5 10 17 25 26 32 48 40 117 132 107 142 -30 30 -1017 -296 -1467 -483 -27 -12 -97 -39 -155 -60 -58 -22 -127 -49 -153 -60 -79 -33 -81 -30 -73 129 4 75 12 295 17 487 16 527 20 584 43 601 11 8 63 30 115 50 53 20 134 52 181 71 47 19 164 64 260 99 96 36 209 77 250 93 95 35 491 161 680 216 80 23 224 65 320 93 96 28 212 60 258 72 45 12 86 27 90 34 8 12 13 1259 5 1289 -8 32 -121 13 -312 -54 -47 -17 -114 -37 -149 -44 -73 -16 -426 -131 -551 -180 -47 -18 -138 -50 -201 -70 -115 -38 -258 -92 -510 -192 -362 -145 -390 -155 -406 -142 -17 14 -13 417 7 734 12 200 8 187 82 218 34 14 145 61 247 103 102 42 219 89 260 104 41 15 143 52 225 82 206 77 854 288 985 322 30 7 84 24 120 36 36 12 101 30 145 41 44 11 136 37 205 59 69 21 159 46 200 54 47 10 81 23 91 35 23 28 22 1193 -1 1215 -8 8 -53 29 -99 46 -82 32 -84 32 -140 17 -31 -8 -117 -30 -191 -50 -409 -106 -732 -203 -868 -261 -43 -18 -102 -41 -132 -51 -30 -10 -85 -33 -122 -51 -37 -19 -76 -34 -87 -34 -26 0 -184 -56 -245 -87 -27 -14 -83 -38 -125 -53 -171 -64 -218 -83 -285 -114 -147 -69 -212 -96 -261 -106 -27 -6 -119 -42 -203 -81 -84 -38 -155 -69 -157 -69 -29 0 -711 -357 -767 -401 -70 -55 -72 -41 -22 121 68 220 67 213 61 375 -6 195 -27 253 -170 475 -55 85 -413 400 -455 400 -18 0 -15 -14 38 -159 93 -258 115 -637 53 -921 -83 -384 -251 -767 -565 -1291 -184 -305 -219 -376 -316 -639 -59 -160 -72 -136 -52 90 11 124 30 211 94 445 9 33 50 132 91 221 41 88 75 170 75 182 0 27 -29 46 -100 66 -30 8 -93 29 -140 45 -47 17 -94 31 -105 31 -10 0 -76 18 -145 39 -187 59 -599 162 -723 181 -29 4 -97 17 -152 29 -264 56 -354 73 -530 101 -285 47 -310 48 -326 19 -10 -19 -13 -171 -13 -703 l-1 -680 30 -17 c20 -12 73 -21 158 -29 71 -6 222 -26 335 -45 269 -44 247 -18 238 -285 -3 -113 -10 -353 -15 -535 -14 -477 -35 -561 -175 -693 -103 -97 -203 -118 -439 -92 -246 27 -541 170 -664 323 -131 161 -226 383 -253 589 -20 152 -53 839 -66 1383 -4 154 -8 321 -9 370 -5 184 -5 1026 1 1195 7 248 27 400 63 490 89 219 223 349 417 405 139 40 418 43 589 6 400 -85 634 -268 736 -576 22 -67 23 -86 27 -423 l3 -353 30 -18 c17 -10 58 -24 92 -31 90 -17 595 -147 642 -164 22 -8 47 -15 57 -16 9 0 72 -16 140 -36 67 -20 152 -44 188 -54 36 -10 110 -34 164 -54 119 -44 138 -44 147 4 23 117 30 248 29 578 0 199 2 362 5 362 3 0 16 -18 30 -40 51 -81 65 -52 55 116 -12 177 -22 214 -92 332 -70 118 -71 125 -87 372 -24 362 -108 785 -206 1040 -86 222 -218 496 -318 660 -226 368 -369 666 -423 876 -90 356 -60 637 126 1169 183 525 214 970 99 1425 -33 132 -162 430 -244 565 -215 355 -488 645 -890 943 -172 128 -225 158 -225 127z M15577 19838 c-182 -227 -287 -513 -287 -780 0 -259 29 -358 210 -733 119 -245 171 -379 205 -527 66 -291 58 -532 -26 -786 -30 -91 -17 -95 77 -24 286 216 454 547 454 891 0 163 -59 377 -140 509 -98 161 -187 305 -248 401 -132 211 -183 356 -212 609 -12 101 -12 129 4 255 30 240 30 227 13 227 -9 0 -31 -19 -50 -42z M9056 18938 c-2 -13 -13 -73 -24 -134 -32 -177 -95 -307 -231 -471 -100 -121 -192 -285 -237 -423 -26 -79 -28 -96 -28 -255 -1 -188 14 -268 73 -383 56 -109 80 -117 81 -27 1 118 80 356 167 499 20 33 69 95 107 137 94 101 169 229 209 354 43 136 47 381 8 505 -52 168 -112 263 -125 198z M12470 18907 c0 -13 9 -59 21 -103 68 -258 85 -563 45 -774 -29 -148 -60 -242 -176 -530 -157 -393 -205 -626 -205 -1010 0 -281 4 -313 66 -565 68 -270 276 -726 320 -699 5 3 9 74 9 159 0 171 30 379 76 535 32 105 178 494 232 615 50 113 125 373 154 530 28 154 30 458 4 635 -51 359 -197 761 -371 1020 -126 188 -175 240 -175 187z M7950 17035 c0 -14 9 -67 21 -118 18 -79 20 -114 16 -247 -5 -154 -5 -157 -56 -310 -53 -163 -70 -194 -193 -358 -86 -114 -209 -230 -411 -390 -89 -70 -193 -157 -232 -193 -38 -36 -97 -87 -129 -115 -61 -50 -154 -158 -192 -221 -12 -20 -33 -45 -47 -57 -22 -18 -96 -132 -163 -251 -105 -186 -152 -536 -108 -796 34 -198 144 -432 304 -643 151 -200 153 -200 144 -6 -16 340 86 759 242 996 19 28 34 55 34 60 0 31 154 211 272 318 44 40 247 179 305 209 17 9 52 35 78 57 25 22 50 40 55 40 8 0 94 67 188 146 63 53 144 158 192 249 23 44 48 87 55 95 74 87 164 445 151 603 -28 323 -169 632 -391 855 -105 105 -135 122 -135 77z M15833 16452 c-195 -118 -310 -287 -384 -565 -81 -306 -116 -363 -394 -645 -210 -212 -243 -252 -213 -252 36 1 445 142 500 173 237 134 391 377 404 640 12 237 57 435 138 595 54 108 48 114 -51 54z M18830 11818 c-5 -13 -21 -54 -36 -93 -108 -283 -269 -498 -474 -635 -113 -75 -166 -126 -205 -197 -65 -119 -145 -203 -287 -304 l-97 -69 -150 0 c-168 0 -208 -9 -297 -70 -139 -95 -252 -236 -317 -395 -94 -229 -87 -251 37 -123 112 116 206 183 334 238 53 23 118 52 143 65 30 16 50 20 60 14 39 -25 165 5 308 72 57 27 106 47 109 44 3 -3 -41 -73 -97 -157 -232 -346 -300 -592 -301 -1095 0 -144 24 -131 90 50 118 320 209 462 475 738 265 274 396 467 486 714 17 44 36 94 43 110 37 81 126 372 141 460 9 55 21 116 25 135 10 40 38 323 41 415 2 87 0 105 -11 105 -6 0 -15 -10 -20 -22z';
  CC.icoLogo = (extra) => '<svg viewBox="569 169 1357 1936" class="ico-logo" aria-hidden="true"' + (extra ? ' ' + extra : '') + '>'
    + '<g transform="translate(0,2508) scale(.1,-.1)" fill="currentColor"><path d="' + CAMINHO_SIMBOLO + '"/></g></svg>';

  // ---------- toque que se sente ----------
  // Vibração curta no celular, para o dedo receber resposta junto com o olho. É um vocabulário
  // pequeno de propósito: vibração demais irrita e gasta bateria. O padrão é em milissegundos,
  // alternando vibra e pausa. No iPhone o navegador ignora e nada acontece, o que está certo:
  // é enfeite, nunca a única resposta a um toque.
  const TOQUES = {
    leve: [8],          // marcar, escolher, trocar de aba
    certo: [12],        // acertou, guardou, concluiu um passo
    errado: [18, 60, 18], // errou no quiz
    conquista: [12, 45, 12, 45, 22], // dia lido, baú aberto, conquista, marco
  };
  // "prefers-reduced-motion" é sobre animação visual (coisas deslizando, girando), não sobre
  // o motor de vibração: são preferências diferentes, e várias combinações de aparelho e
  // navegador respondem "reduce" aí por padrão, o que apagaria a vibração para quase todo
  // mundo sem ninguém ter pedido. Por isso o único jeito de desligar é o interruptor, não o
  // sistema.
  const podeVibrar = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  CC.vibrar = (tipo = 'leve') => {
    // Preferência do aparelho, como o tema: não entra no progresso nem viaja entre celulares.
    let desligado = false;
    try { desligado = localStorage.getItem('cc.semVibrar') === '1'; } catch (e) { /* segue */ }
    if (!podeVibrar || desligado) return;
    try { navigator.vibrate(TOQUES[tipo] || TOQUES.leve); } catch (e) { /* segue sem vibrar */ }
  };

  // ---------- avisos e folhas ----------
  let avisoAtual;
  CC.avisar = (texto) => {
    clearTimeout(avisoAtual);
    let el = document.getElementById('aviso-flutuante');
    if (!el) {
      el = document.createElement('div');
      el.id = 'aviso-flutuante';
      el.className = 'aviso-flutuante';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = texto;
    avisoAtual = setTimeout(() => el.remove(), 2600);
  };

  // Substitui o confirm() do navegador, que num aplicativo instalado parece um erro.
  CC.confirmar = ({ titulo, texto, acao, perigo }) => new Promise((resolver) => {
    const cortina = document.createElement('div');
    cortina.className = 'cortina';
    cortina.innerHTML = '<div class="folha" role="dialog" aria-modal="true">'
      + '<h2>' + CC.esc(titulo) + '</h2>'
      + (texto ? '<p>' + CC.esc(texto) + '</p>' : '')
      + '<div class="acoes">'
      + '<button class="botao' + (perigo ? ' vermelho' : '') + '" data-sim>' + CC.esc(acao || 'Confirmar') + '</button>'
      + '<button class="botao plano" data-nao>Cancelar</button>'
      + '</div></div>';
    const fechar = (v) => { cortina.remove(); resolver(v); };
    cortina.querySelector('[data-sim]').onclick = () => fechar(true);
    cortina.querySelector('[data-nao]').onclick = () => fechar(false);
    cortina.onclick = (ev) => { if (ev.target === cortina) fechar(false); };
    document.body.appendChild(cortina);
    cortina.querySelector('[data-sim]').focus();
  });

  // Folha que sobe de baixo: o cartão de detalhe do aplicativo. Recebe o HTML de
  // dentro e uma função para ligar os botões, com o fechar já pronto.
  // O foco entra na folha e volta ao botão que a abriu: sem isso, quem usa leitor de
  // tela fica perdido no fundo da página.
  // Puxar a folha para baixo para fechar. A alcinha no topo já prometia isso, mas não
  // havia nada por trás dela: só dava para fechar tocando fora, e num celular a pessoa
  // tenta arrastar primeiro. O gesto só começa com o conteúdo rolado no topo, senão
  // brigaria com a rolagem da própria folha. Passar de 90px fecha; menos que isso volta.
  const LIMITE_FECHAR = 90;
  function arrastarParaFechar(folha, fechar) {
    let y0 = 0;
    let dy = 0;
    let avaliando = false;
    let ativo = false;

    // Eventos de toque, e não de ponteiro: a folha tem rolagem própria, e ao primeiro
    // movimento o navegador assume o gesto como rolagem e dispara pointercancel — o
    // arraste morria antes de começar. Com touchmove não passivo dá para chamar
    // preventDefault e tomar o gesto de volta, mas só quando é mesmo para baixo.
    folha.addEventListener('touchstart', (ev) => {
      if (ev.touches.length !== 1 || folha.scrollTop > 0) { avaliando = false; return; }
      y0 = ev.touches[0].clientY;
      dy = 0;
      avaliando = true;
      ativo = false;
    }, { passive: true });

    folha.addEventListener('touchmove', (ev) => {
      if (!avaliando) return;
      dy = ev.touches[0].clientY - y0;
      if (!ativo) {
        // Para cima é rolagem do conteúdo: solta o gesto e não volta a pegá-lo até o
        // próximo toque. Para baixo, assume depois de uns pixels, para um toque simples
        // num botão de dentro continuar sendo um toque.
        if (dy < -4) { avaliando = false; return; }
        if (dy <= 8) return;
        ativo = true;
        folha.style.transition = 'none';
      }
      if (dy < 0) dy = 0;
      ev.preventDefault();
      folha.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: false });

    const soltar = () => {
      if (!avaliando) return;
      avaliando = false;
      if (!ativo) return;
      ativo = false;
      folha.style.transition = 'transform .22s var(--suave)';
      folha.style.transform = '';
      if (dy > LIMITE_FECHAR) fechar();
    };
    folha.addEventListener('touchend', soltar);
    folha.addEventListener('touchcancel', soltar);
  }

  CC.folha = (interno, opcoes = {}) => {
    const origem = document.activeElement;
    const cortina = document.createElement('div');
    cortina.className = 'cortina';
    cortina.innerHTML = '<div class="folha ' + (opcoes.classe || '') + '" role="dialog" '
      + 'aria-modal="true" tabindex="-1"' + (opcoes.rotulo ? ' aria-label="' + CC.esc(opcoes.rotulo) + '"' : '')
      + (opcoes.rolavel ? ' style="max-height:86vh;overflow-y:auto"' : '')
      + '>' + interno + '</div>';
    const folha = cortina.firstChild;
    // No iPhone o teclado cobre a tela sem mexer no que é "fixed": a cortina acompanha a área
    // que sobra visível (visualViewport), e a folha, presa no fim dela, sobe junto com o teclado.
    const vv = window.visualViewport;
    const acompanharTeclado = () => {
      cortina.style.top = vv.offsetTop + 'px';
      cortina.style.height = vv.height + 'px';
      cortina.style.bottom = 'auto';
    };
    if (vv) { vv.addEventListener('resize', acompanharTeclado); vv.addEventListener('scroll', acompanharTeclado); }
    const fechar = () => {
      if (vv) { vv.removeEventListener('resize', acompanharTeclado); vv.removeEventListener('scroll', acompanharTeclado); }
      cortina.remove();
      if (origem && origem.focus && document.body.contains(origem)) origem.focus();
      setTimeout(CC.endireitarRaiz, 120);
    };
    if (!opcoes.presa) cortina.onclick = (ev) => { if (ev.target === cortina) fechar(); };
    if (opcoes.presa) cortina.dataset.presa = '1';
    if (!opcoes.presa) arrastarParaFechar(folha, fechar);
    document.body.appendChild(cortina);
    if (opcoes.ligar) opcoes.ligar(folha, fechar);
    // No celular, abrir a folha não abre o teclado: ele cobria o texto antes de a pessoa ler.
    // O teclado aparece quando ela toca no campo, e o campo rola para o meio da folha.
    const toque = matchMedia('(pointer: coarse)').matches;
    const primeiro = folha.querySelector(toque ? 'button, a[href]' : 'input, textarea, button, a[href]');
    (toque ? folha : (primeiro || folha)).focus({ preventScroll: true });
    folha.addEventListener('focusin', (ev) => {
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
      setTimeout(() => ev.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
    });
    return { folha, fechar };
  };

  // Pedido ao servidor com a mensagem de erro dele, pronta para a tela.
  CC.api = (rota, corpo, metodo) => fetch(rota, {
    method: metodo || (corpo ? 'POST' : 'GET'),
    cache: 'no-store',
    headers: corpo ? { 'content-type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  }).then(async (r) => {
    const dado = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(dado.erro || (r.status === 401 ? 'Entre de novo.' : 'Não deu certo agora.'));
      e.status = r.status;
      throw e;
    }
    return dado;
  });

  // Compartilhar pelo menu do celular; sem ele, copia o texto com o link.
  CC.compartilhar = async (texto, url) => {
    if (navigator.share) {
      try {
        await navigator.share({ text: texto, url });
        return 'compartilhado';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelado';
      }
    }
    return (await CC.copiar(texto + ' ' + url)) ? 'copiado' : 'falhou';
  };

  CC.copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let certo = false;
      try { certo = document.execCommand('copy'); } catch (e2) { certo = false; }
      ta.remove();
      return certo;
    }
  };

  // ---------- peças reutilizadas ----------
  CC.barra = (fracao, classe) =>
    '<div class="barra' + (classe ? ' ' + classe : '') + '"><i style="width:'
    + Math.max(0, Math.min(100, fracao * 100)).toFixed(2) + '%"></i></div>';

  CC.tituloSecao = (texto, nota) =>
    '<div class="titulo-secao"><h2>' + CC.esc(texto) + '</h2>'
    + (nota ? '<span>' + CC.esc(nota) + '</span>' : '') + '</div>';

  CC.botaoVoltar = (rotulo) =>
    '<button class="voltar" data-voltar>' + CC.ico('voltar') + CC.esc(rotulo || 'Voltar') + '</button>';
})(window.CC);
