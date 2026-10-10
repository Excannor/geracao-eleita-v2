/* Painel > Enviar aviso (#/config/painel/aviso): um aviso pontual do administrador, na hora,
   para ele mesmo (teste) ou para todas as contas. Pedida só quando o administrador abre a
   tela: o build a publica como aviso-tela.<resumo>.js, com o estilo (aviso-tela.css) no lugar
   da marca abaixo; a casca que a carrega mora em src/app/07e-painel.js.
   O servidor confere de novo tudo o que esta tela limita (servidor.mjs, enviarAvisoAdmin):
   só o administrador, título e texto curtos, foto JPEG até 300 KB, destino da lista fechada,
   e um aviso para todos por dia (o segundo pede confirmar de novo).
   A foto é reduzida aqui, no canvas: até 1024 px no lado maior, JPEG com qualidade 0,8,
   descendo até caber em 250 KB. Redesenhar no canvas já deixa de fora o EXIF (local, aparelho).
   JPEG e não WebP: é o que todo aparelho mostra na notificação. */
(function (CC) {
  'use strict';

  const ESTILO = '/*ESTILO_AVISO*/';
  if (!document.querySelector('style[data-aviso-tela]')) {
    const s = document.createElement('style');
    s.dataset.avisoTela = '';
    s.textContent = ESTILO;
    document.head.appendChild(s);
  }

  const DESTINOS = [['nenhum', 'Nenhum'], ['inicio', 'Início'], ['explorar', 'Explorar'], ['parabolas', 'Parábolas'],
    ['biblia', 'Bíblia'], ['celula', 'Célula'], ['desafios', 'Desafios']];
  const LADO = 1024;
  const ALVO = 250 * 1024;

  // Um rascunho por visita: sobrevive aos redesenhos do app enquanto a tela está aberta.
  // modo: 'agora' ou 'agendar' (dia em dd/mm/aaaa e hora em hh:mm, digitados com máscara: o
  // calendário do aparelho no Android é ruim de usar, como no cadastro).
  const RASCUNHO = { titulo: '', texto: '', destino: 'nenhum', publico: 'mim', foto: null, fotoUrl: '', modo: 'agora', dia: '', hora: '' };
  const r = { ...RASCUNHO };
  const mascaraDia = (v) => { const n = v.replace(/\D/g, '').slice(0, 8); return n.slice(0, 2) + (n.length > 2 ? '/' + n.slice(2, 4) : '') + (n.length > 4 ? '/' + n.slice(4) : ''); };
  const mascaraHora = (v) => { const n = v.replace(/\D/g, '').slice(0, 4); return n.slice(0, 2) + (n.length > 2 ? ':' + n.slice(2) : ''); };
  const diaBr = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
  // "dd/mm/aaaa" + "hh:mm" → "AAAA-MM-DDTHH:MM", ou '' se não existe. O servidor confere o
  // resto (no fuso de quem agenda: não no passado, até 30 dias).
  function quandoIso() {
    const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(r.dia);
    const h = /^(\d{2}):(\d{2})$/.exec(r.hora);
    if (!d || !h || +h[1] > 23 || +h[2] > 59) return '';
    const iso = d[3] + '-' + d[2] + '-' + d[1];
    const t = new Date(iso + 'T12:00:00Z');
    return !isNaN(t) && t.toISOString().slice(0, 10) === iso ? iso + 'T' + h[1] + ':' + h[2] : '';
  }
  // "11/10 às 10:00" (ou "11/10/2027 às 10:00" em outro ano)
  const quandoBr = (q) => q.slice(8, 10) + '/' + q.slice(5, 7) + (q.slice(0, 4) !== String(new Date().getFullYear()) ? '/' + q.slice(0, 4) : '') + ' às ' + q.slice(11, 16);
  const ESTADOS = { enviado: 'enviado', cancelado: 'cancelado', perdido: 'perdido', recusado: 'não saiu', falhou: 'não saiu', interrompido: 'interrompido', enviando: 'saindo' };
  let resumo = null;

  const carregarImagem = (arquivo) => new Promise((resolver, falhar) => {
    const img = new Image();
    const url = URL.createObjectURL(arquivo);
    img.onload = () => { URL.revokeObjectURL(url); resolver(img); };
    img.onerror = () => { URL.revokeObjectURL(url); falhar(new Error('imagem')); };
    img.src = url;
  });
  const paraBlob = (canvas, q) => new Promise((resolver) => canvas.toBlob(resolver, 'image/jpeg', q));

  // Reduz até caber: primeiro a qualidade (0,8 → 0,6), depois o tamanho (−20% por vez).
  async function reduzir(arquivo) {
    const img = await carregarImagem(arquivo);
    let lado = LADO;
    let q = 0.8;
    for (;;) {
      const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * escala));
      c.height = Math.max(1, Math.round(img.naturalHeight * escala));
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      const blob = await paraBlob(c, q);
      if (!blob) throw new Error('imagem');
      if (blob.size <= ALVO || lado < 400) return blob;
      if (q > 0.65) q -= 0.1; else lado = Math.round(lado * 0.8);
    }
  }
  const emBase64 = (blob) => new Promise((resolver, falhar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result).replace(/^data:[^,]*,/, ''));
    leitor.onerror = falhar;
    leitor.readAsDataURL(blob);
  });

  const nomeDestino = (id) => (DESTINOS.find((d) => d[0] === id) || DESTINOS[0])[1];
  const conta = (texto, max) => [...texto].length + '/' + max;

  // ---------- a prévia: a notificação no celular e o item no sino ----------
  function previa() {
    const titulo = r.titulo.trim() || 'Título do aviso';
    const texto = r.texto.trim();
    const foto = r.fotoUrl ? '<img src="' + r.fotoUrl + '" alt="">' : '';
    return '<div class="aviso-previa" aria-hidden="true">'
      + '<p class="aviso-previa-rotulo">No celular</p>'
      + '<div class="aviso-notif"><div class="aviso-notif-topo"><img src="./icone-48.png" alt=""><span>Geração Eleita · agora</span></div>'
      + '<b>' + CC.esc(titulo) + '</b>' + (texto ? '<span>' + CC.esc(texto) + '</span>' : '')
      + (foto ? '<div class="aviso-notif-foto">' + foto + '</div>' : '') + '</div>'
      + '<p class="aviso-previa-rotulo">No sino do app</p>'
      + '<div class="caixa-lista lista-avisos"><div class="item-aviso novo"><span class="ico-aviso">' + CC.ico('sino') + '</span>'
      + '<span class="textos-aviso"><b>' + CC.esc(titulo) + '</b>' + (texto ? '<span>' + CC.esc(texto) + '</span>' : '')
      + (foto ? foto.replace('<img', '<img class="foto-aviso"') : '') + '<small>agora</small></span><i class="ponto-novo"></i></div></div>'
      + '<p class="aviso-previa-destino">' + (r.destino === 'nenhum' ? 'Tocar abre o app no Início.' : 'Tocar leva para ' + CC.esc(nomeDestino(r.destino)) + '.') + '</p>'
      + '</div>';
  }

  function alcance() {
    if (!resumo) return '';
    if (r.publico === 'mim') {
      return resumo.eu.push ? 'Chega no seu sino e nos seus aparelhos com notificação ligada (' + resumo.eu.aparelhos + ').'
        : 'Chega no seu sino. Este celular não está com notificações ligadas, então não aparece como notificação.';
    }
    return 'Vai para ' + CC.plural(resumo.pessoas, 'pessoa', 'pessoas') + ': todas veem no sino, e '
      + resumo.comPush + (resumo.comPush === 1 ? ' recebe' : ' recebem') + ' no celular. Quem estiver entre 22h30 e 7h recebe depois das 7h.'
      + (resumo.paraTodosHoje ? ' Já saiu um aviso para todos hoje.' : '');
  }

  const rotuloEnviar = () => (r.modo === 'agendar' ? 'Agendar' : 'Enviar') + (r.publico === 'todos' ? ' para todos' : ' só para mim');
  const opcao = (nome, valor, rotulo, marcado) => '<label class="aviso-opcao"><input type="radio" name="' + nome + '" value="' + valor + '"'
    + (marcado ? ' checked' : '') + '><span>' + rotulo + '</span></label>';

  function desenhar(raiz) {
    const lim = (resumo && resumo.limites) || { titulo: 50, texto: 150 };
    raiz.innerHTML = '<div class="folha-perfil titulo-frase">' + CC.botaoVoltar('Voltar') + '<h1>Enviar aviso</h1>'
      + '<p class="passo-dica">Um aviso pontual, na hora. Mande primeiro só para você, para ver como chega.</p></div>'
      + '<div class="aviso-tela">'
      + '<section class="grupo-config"><h2 class="etiqueta">Mensagem</h2>'
      + '<label class="campo-senha"><span>Título <small data-conta-titulo>' + conta(r.titulo, lim.titulo) + '</small></span>'
      + '<input data-titulo maxlength="' + lim.titulo + '" autocomplete="off" autocapitalize="sentences" value="' + CC.esc(r.titulo) + '" placeholder="Ex.: Culto especial no domingo"></label>'
      + '<label class="campo-senha"><span>Texto <small data-conta-texto>' + conta(r.texto, lim.texto) + '</small></span>'
      + '<textarea data-texto maxlength="' + lim.texto + '" rows="3" autocomplete="off" placeholder="Opcional">' + CC.esc(r.texto) + '</textarea></label>'
      + '<div class="aviso-foto">' + (r.fotoUrl
        ? '<img src="' + r.fotoUrl + '" alt="Foto escolhida"><span>' + Math.round(r.foto.size / 1024) + ' KB</span><button type="button" class="botao plano pequeno" data-tirar-foto>Tirar a foto</button>'
        : '<label class="botao contorno pequeno aviso-escolher">' + CC.ico('imagem') + 'Escolher foto (opcional)<input type="file" accept="image/*" data-foto hidden></label>')
      + '</div></section>'
      + '<section class="grupo-config"><h2 class="etiqueta">Ao tocar, abre</h2><div class="aviso-chips" role="radiogroup" aria-label="Ao tocar, abre">'
      + DESTINOS.map(([id, nome]) => opcao('destino', id, nome, r.destino === id)).join('') + '</div></section>'
      + '<section class="grupo-config"><h2 class="etiqueta">Para quem</h2><div class="aviso-publico" role="radiogroup" aria-label="Para quem">'
      + opcao('publico', 'mim', 'Só para mim (teste)', r.publico === 'mim')
      + opcao('publico', 'todos', 'Todos' + (resumo ? ' (' + resumo.pessoas + ')' : ''), r.publico === 'todos') + '</div>'
      + '<p class="passo-dica pequena" data-alcance>' + CC.esc(alcance()) + '</p></section>'
      + '<section class="grupo-config"><h2 class="etiqueta">Quando</h2><div class="aviso-publico" role="radiogroup" aria-label="Quando">'
      + opcao('modo', 'agora', 'Enviar agora', r.modo === 'agora') + opcao('modo', 'agendar', 'Agendar', r.modo === 'agendar') + '</div>'
      + (r.modo === 'agendar' ? '<div class="aviso-quando"><label class="campo-senha"><span>Dia</span><input data-dia type="text" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" autocomplete="off" value="' + CC.esc(r.dia) + '"></label>'
        + '<label class="campo-senha"><span>Hora</span><input data-hora type="text" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" value="' + CC.esc(r.hora) + '"></label></div>'
        + '<p class="passo-dica pequena">No seu fuso, até ' + ((resumo && resumo.limites && resumo.limites.dias) || 30) + ' dias à frente. Sai na hora marcada pelo mesmo caminho: sino, celular e o silêncio das 22h30 às 7h de cada um.</p>' : '')
      + '</section>'
      + '<section class="grupo-config"><h2 class="etiqueta">Como aparece</h2><div data-previa>' + previa() + '</div></section>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes aviso-acoes"><button class="botao" data-enviar>' + rotuloEnviar() + '</button></div>'
      + (resumo && resumo.agendados && resumo.agendados.length ? '<section class="grupo-config"><h2 class="etiqueta">Agendados</h2><div class="caixa-config">'
        + resumo.agendados.map((a, i) => '<div class="linha-config sem-toque aviso-agendado"><span><b>' + CC.esc(a.titulo) + '</b><small>'
          + CC.esc(quandoBr(a.quando) + ' · ' + (a.publico === 'todos' ? 'para todos' : 'só para mim') + (a.foto ? ' · com foto' : '')) + '</small></span>'
          + '<button type="button" class="botao plano pequeno" data-cancelar="' + i + '">Cancelar</button></div>').join('') + '</div></section>' : '')
      + (resumo && resumo.agendadosAntes && resumo.agendadosAntes.length ? '<section class="grupo-config"><h2 class="etiqueta">Agendamentos anteriores</h2><div class="caixa-config">'
        + resumo.agendadosAntes.map((a) => '<div class="linha-config sem-toque painel-linha2"><span>' + CC.esc(a.titulo) + '</span><small>'
          + CC.esc(quandoBr(a.quando) + ' · ' + (a.publico === 'todos' ? 'para todos' : 'só para mim') + ' · ' + (ESTADOS[a.estado] || a.estado)
            + (a.estado === 'enviado' ? ' (' + CC.plural(a.pessoas, 'pessoa', 'pessoas') + ')' : '') + (a.motivo ? ': ' + a.motivo : '')) + '</small></div>').join('') + '</div></section>' : '')
      + (resumo && resumo.ultimos && resumo.ultimos.length ? '<section class="grupo-config"><h2 class="etiqueta">Últimos enviados</h2><div class="caixa-config">'
        + resumo.ultimos.map((u) => '<div class="linha-config sem-toque painel-linha2"><span>' + CC.esc(u.titulo) + '</span><small>'
          + CC.esc(new Date(u.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          + ' · ' + (u.publico === 'todos' ? 'para todos (' + u.pessoas + ')' : 'só para mim')) + '</small></div>').join('') + '</div></section>' : '')
      + '</div>';
    CC.ligarVoltarDoTopo(raiz);
    raiz.querySelectorAll('[data-voltar]').forEach((b) => { b.onclick = () => { location.hash = '#/config/painel'; }; });
    ligar(raiz);
  }

  function atualizarPrevia(raiz) {
    const lim = (resumo && resumo.limites) || { titulo: 50, texto: 150 };
    raiz.querySelector('[data-previa]').innerHTML = previa();
    raiz.querySelector('[data-conta-titulo]').textContent = conta(r.titulo, lim.titulo);
    raiz.querySelector('[data-conta-texto]').textContent = conta(r.texto, lim.texto);
    raiz.querySelector('[data-alcance]').textContent = alcance();
    raiz.querySelector('[data-enviar]').textContent = rotuloEnviar();
  }

  function ligar(raiz) {
    const erro = raiz.querySelector('.erro-proposito');
    const mostrarErro = (t) => { erro.textContent = t; erro.hidden = !t; };
    raiz.querySelector('[data-titulo]').oninput = (ev) => { r.titulo = ev.target.value; atualizarPrevia(raiz); };
    raiz.querySelector('[data-texto]').oninput = (ev) => { r.texto = ev.target.value; atualizarPrevia(raiz); };
    raiz.querySelectorAll('input[name=destino]').forEach((i) => { i.onchange = () => { r.destino = i.value; atualizarPrevia(raiz); }; });
    raiz.querySelectorAll('input[name=publico]').forEach((i) => { i.onchange = () => { r.publico = i.value; atualizarPrevia(raiz); }; });
    raiz.querySelectorAll('input[name=modo]').forEach((i) => {
      i.onchange = () => {
        r.modo = i.value;
        if (r.modo === 'agendar' && !r.dia && resumo && resumo.hoje) r.dia = diaBr(resumo.hoje);
        desenhar(raiz);
        if (r.modo === 'agendar') raiz.querySelector('[data-hora]').focus({ preventScroll: true });
      };
    });
    const campoDia = raiz.querySelector('[data-dia]');
    if (campoDia) campoDia.oninput = () => { const v = mascaraDia(campoDia.value); if (v !== campoDia.value) campoDia.value = v; r.dia = v; };
    const campoHora = raiz.querySelector('[data-hora]');
    if (campoHora) campoHora.oninput = () => { const v = mascaraHora(campoHora.value); if (v !== campoHora.value) campoHora.value = v; r.hora = v; };
    raiz.querySelectorAll('[data-cancelar]').forEach((b) => {
      b.onclick = async () => {
        const a = resumo.agendados[Number(b.dataset.cancelar)];
        if (!a) return;
        const certo = await CC.confirmar({ titulo: 'Cancelar o aviso agendado?', texto: '"' + a.titulo + '", ' + quandoBr(a.quando) + ', ' + (a.publico === 'todos' ? 'para todos' : 'só para você') + '. Ele não sai mais.', acao: 'Cancelar o aviso', perigo: true });
        if (!certo) return;
        try {
          const resp = await CC.api('api/painel/aviso/cancelar', { id: a.id });
          resumo = resp.resumo || resumo;
          CC.avisar('Pronto: aviso cancelado');
        } catch (e) { CC.avisar(e.message); }
        if (raiz.isConnected) desenhar(raiz);
      };
    });
    const arquivo = raiz.querySelector('[data-foto]');
    if (arquivo) {
      arquivo.onchange = async () => {
        const f = arquivo.files && arquivo.files[0];
        if (!f) return;
        mostrarErro('');
        try {
          r.foto = await reduzir(f);
          r.fotoUrl = URL.createObjectURL(r.foto);
        } catch (e) {
          mostrarErro('Não consegui abrir essa foto. Tente outra (JPEG, PNG ou WebP).');
          return;
        }
        desenhar(raiz);
      };
    }
    const tirar = raiz.querySelector('[data-tirar-foto]');
    if (tirar) tirar.onclick = () => { if (r.fotoUrl) URL.revokeObjectURL(r.fotoUrl); r.foto = null; r.fotoUrl = ''; desenhar(raiz); };

    raiz.querySelector('[data-enviar]').onclick = async () => {
      mostrarErro('');
      if (!r.titulo.trim()) { mostrarErro('Escreva um título.'); return; }
      const quando = r.modo === 'agendar' ? quandoIso() : '';
      if (r.modo === 'agendar' && !quando) { mostrarErro('Confira o dia (dd/mm/aaaa) e a hora (hh:mm).'); return; }
      if (quando && r.publico === 'todos') {
        const certo = await CC.confirmar({
          titulo: 'Agendar para todos?',
          texto: 'Sai em ' + quandoBr(quando) + ' para todas as contas (hoje são ' + (resumo ? resumo.pessoas : 0) + '). Dá para cancelar até lá, na lista de agendados.',
          acao: 'Agendar para todos',
        });
        if (!certo) return;
      } else if (r.publico === 'todos') {
        const certo = await CC.confirmar({
          titulo: 'Mandar para todos?',
          texto: CC.plural(resumo ? resumo.pessoas : 0, 'pessoa recebe', 'pessoas recebem') + ' agora no sino'
            + (resumo && resumo.comPush ? ', e ' + resumo.comPush + ' no celular' : '') + '. Não dá para desfazer.',
          acao: 'Mandar para todos',
        });
        if (!certo) return;
      }
      const corpo = { titulo: r.titulo.trim(), texto: r.texto.trim(), destino: r.destino, publico: r.publico, ...(quando ? { quando } : {}) };
      const botao = raiz.querySelector('[data-enviar]');
      let resposta;
      await CC.ocupado(botao, async () => {
        try {
          if (r.foto) corpo.foto = await emBase64(r.foto);
          try {
            resposta = await CC.api('api/painel/aviso', corpo);
          } catch (e) {
            if (e.status !== 409) throw e;
            const denovo = await CC.confirmar(quando
              ? { titulo: 'Já tem um aviso para todos nesse dia', texto: 'Agendar outro para o mesmo dia? Avisos demais cansam quem recebe.', acao: 'Agendar outro' }
              // o servidor diz se o de hoje já saiu ou se está agendado (e aí os dois saem)
              : /agendado/.test(e.message || '')
                ? { titulo: 'Já tem um aviso para todos agendado hoje', texto: 'Mandar este agora? O agendado também sai na hora dele. Avisos demais cansam quem recebe.', acao: 'Mandar agora' }
                : { titulo: 'Já saiu um aviso para todos hoje', texto: 'Mandar outro hoje mesmo? Avisos demais cansam quem recebe.', acao: 'Mandar outro' });
            if (!denovo) return;
            resposta = await CC.api('api/painel/aviso', { ...corpo, denovo: true });
          }
        } catch (e) { mostrarErro(e.message); }
      });
      if (!resposta) return;
      resumo = resposta.resumo || resumo;
      CC.avisar(resposta.agendado ? 'Agendado para ' + quandoBr(resposta.agendado.quando) : r.publico === 'todos'
        ? 'Enviado para ' + CC.plural(resposta.pessoas, 'pessoa', 'pessoas')
        : (resposta.enviados ? 'Enviado. Confira o celular e o sino' : resposta.adiados ? 'Enviado. No silêncio da noite: o push sai depois das 7h' : 'Enviado. Está no seu sino'));
      if (CC.atualizarPontoDoSino) CC.atualizarPontoDoSino();
      if (r.fotoUrl) URL.revokeObjectURL(r.fotoUrl);
      Object.assign(r, RASCUNHO);
      if (raiz.isConnected) desenhar(raiz);
    };
  }

  CC.telaAviso = async function (raiz) {
    // a primeira vez desenha já com o rascunho, e os números chegam logo depois
    desenhar(raiz);
    try {
      resumo = await CC.api('api/painel/aviso');
    } catch (e) {
      const erro = raiz.querySelector('.erro-proposito');
      if (erro) { erro.textContent = e.message; erro.hidden = false; }
      return;
    }
    if (location.hash === '#/config/painel/aviso') desenhar(raiz);
  };
})(window.CC);
