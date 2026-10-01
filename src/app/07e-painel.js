/* Painel do app: só o administrador vê (CAMINHO_ADMIN no servidor). A igreja de longe (números
   somados, sem nome de ninguém) e, tocando numa célula, a célula de perto, com o que o líder
   dela vê. E os pedidos de senha esquecida, com o link que o dono manda à mão enquanto não há
   e-mail configurado. */
(function (CC) {
  'use strict';

  const grupo = (titulo, dentro, nota) => '<section class="grupo-config"><h2 class="etiqueta">' + CC.esc(titulo) + '</h2>'
    + '<div class="caixa-config">' + dentro + '</div>'
    + (nota ? '<p class="passo-dica pequena">' + nota + '</p>' : '') + '</section>';
  // Linha em duas partes, para textos longos: o rótulo em cima e o número explicado embaixo,
  // sem cortar a frase.
  const linha2 = (rotulo, texto) => '<div class="linha-config sem-toque painel-linha2"><span>' + CC.esc(rotulo) + '</span>'
    + '<small>' + CC.esc(texto) + '</small></div>';
  const numero = (rotulo, valor) => '<div class="linha-config sem-toque"><span>' + CC.esc(rotulo) + '</span>'
    + '<span class="valor">' + CC.esc(String(valor)) + '</span></div>';
  const porcento = (r) => (r.pct === null ? 'ainda não' : r.pct + '% (' + r.voltaram + ' de ' + r.elegiveis + ')');

  // Barras simples: o maior valor enche a linha. Com número ao lado, a cor nunca é a única informação.
  function barras(faixas) {
    const maior = Math.max(1, ...faixas.map((f) => f.contas));
    return faixas.map((f) => '<div class="linha-config sem-toque painel-barra"><span>' + CC.esc(f.faixa) + '</span>'
      + '<span class="painel-trilho" aria-hidden="true"><i style="width:' + Math.round((f.contas / maior) * 100) + '%"></i></span>'
      + '<span class="valor">' + f.contas + '</span></div>').join('');
  }

  // Colunas (uma por dia ou semana), com o número no topo e o rótulo embaixo.
  function colunas(itens, rotulo) {
    if (!itens.some((x) => x.contas)) return '<p class="passo-dica pequena painel-vazio">Ainda sem dados neste período.</p>';
    const maior = Math.max(1, ...itens.map((x) => x.contas));
    return '<div class="painel-colunas" role="img" aria-label="' + CC.esc(itens.map((x) => rotulo(x) + ': ' + x.contas).join(', ')) + '">'
      + itens.map((x) => '<span class="painel-coluna"><small>' + (x.contas || '') + '</small><i style="--v:' + (x.contas / maior).toFixed(3) + '"></i><em>' + CC.esc(rotulo(x)) + '</em></span>').join('') + '</div>';
  }
  const diaMes = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

  // Um número grande com a comparação da semana anterior (texto, não só cor).
  function cartaoResumo(rotulo, par) {
    const d = par.agora - par.antes;
    const seta = d > 0 ? '▲ ' + d : d < 0 ? '▼ ' + Math.abs(d) : 'igual';
    return '<div class="painel-cartao"><strong>' + par.agora + '</strong><span>' + CC.esc(rotulo) + '</span>'
      + '<small class="' + (d > 0 ? 'sobe' : d < 0 ? 'desce' : '') + '">' + seta + ' <em>vs. semana anterior (' + par.antes + ')</em></small></div>';
  }
  function atualizado(iso) {
    if (!iso) return 'agora';
    const min = Math.floor((Date.now() - Date.parse(iso)) / 60000);
    const hora = new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return min < 1 ? 'agora há pouco, às ' + hora : 'às ' + hora + ' (há ' + min + ' min)';
  }

  const fmt = (v) => (v === null ? 'ainda não' : v + '%');
  const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  // Fase 5, seção 2: células e cuidado, agregados. Sem nome nenhum, e sem contador de gerações.
  function celulasECuidado(c) {
    if (!c) return '';
    return numero('Células ativas', c.celulasAtivas)
      + numero('Registraram encontro nas últimas 4 semanas', c.celulasComEncontro)
      + numero('Frequência média por encontro (4 semanas)', c.frequenciaMedia === null ? 'sem encontros' : c.frequenciaMedia)
      + numero('Visitantes que viraram membros (4 semanas)', c.visitantesViraramMembros)
      + numero('Multiplicações nos últimos 12 meses', c.multiplicacoes)
      + numero('Dias na Palavra (Power of 4, 30 dias)', c.diasNaPalavra.pct === null ? 'sem dado' : c.diasNaPalavra.pct + '% (base ' + c.diasNaPalavra.base + ')')
      + numero('Conhecer Jesus: começaram', c.conhecer.comecaram)
      + numero('Conhecer Jesus: terminaram os 14 dias', c.conhecer.terminaram)
      + numero('Conhecer Jesus: tocaram "Quero conversar"', c.conhecer.quiseramConversar)
      + numero('Discipulado: relações ativas', c.discipulado.ativos)
      + numero('Discipulado: 2ª geração', c.discipulado.segundaGeracao)
      + numero('Cuidado: pedidos de oração ativos', c.cuidado.pedidosAtivos)
      + numero('Cuidado: denúncias abertas', c.cuidado.denunciasAbertas);
  }

  // ---------- a igreja de longe (api/painel/igreja, inteligencia.mjs) ----------
  // Adoção e retenção, a chama das células (cada uma abre a célula de perto), os frutos do mês
  // e o check-in de todos, somado. Sem ninguém pelo nome aqui.
  const ROTULOS_MARCO = { decisao: 'Decidi seguir Jesus', batismo: 'Me batizei', celula: 'Entrei numa célula', discipula: 'Comecei a acompanhar alguém' };
  const ESFERAS = { corpo: 'Corpo', mente: 'Mente', espirito: 'Espírito' };
  const mesNome = (m) => new Date(m + '-15T12:00:00Z').toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  const virgula = (n) => String(n).replace('.', ',');
  function blocosDaIgreja(g) {
    if (!g || !g.adocao) return '';
    const a = g.adocao;
    const adocaoHtml = numero('Abriram o app hoje', a.hoje.abriram + ' de ' + a.contas + (a.hoje.pctAbriram === null ? '' : ' (' + a.hoje.pctAbriram + '%)'))
      + numero('Leram hoje', a.hoje.leram)
      + numero('Por dia, nos 7 dias antes de hoje', virgula(a.media7.abriram) + ' abriram · ' + virgula(a.media7.leram) + ' leram')
      + numero('Ainda leem (contas com 30 dias ou mais)', a.retencao.pct === null ? 'ainda sem base' : a.retencao.pct + '% (' + a.retencao.ativas + ' de ' + a.retencao.base + ')')
      + colunas(a.serie.map((x) => ({ contas: x.abriram, dia: x.dia })), (x) => diaMes(x.dia));
    const celulas = g.chamaDasCelulas || [];
    const chamaHtml = celulas.length
      ? celulas.map((c) => '<a class="linha-config painel-barra painel-celula-linha" href="' + enderecoCelula(c.id) + '"><span>' + CC.esc(c.titulo)
        + '<small>' + CC.plural(c.membros, 'pessoa', 'pessoas') + (c.lider ? ' · ' + CC.esc(c.lider) : '')
        + (c.frequencia === null ? '' : ' · ' + virgula(c.frequencia) + ' por encontro') + '</small></span>'
        + (c.pct === null ? '<span class="valor">sem membros</span>'
          : '<span class="painel-trilho" aria-hidden="true"><i style="width:' + c.pct + '%"></i></span><span class="valor">' + c.pct + '%</span>') + '</a>').join('')
      : '<div class="linha-config sem-toque"><span>Nenhuma célula ativa ainda</span></div>';
    const ev = g.evangelismo;
    const frutosHtml = Object.keys(ROTULOS_MARCO).map((k) => linha2(ROTULOS_MARCO[k], 'Neste mês: ' + ev.deste[k] + ' · em ' + mesNome(ev.anterior) + ': ' + ev.doAnterior[k])).join('');
    const s = g.saude;
    const saudeHtml = s.suficiente
      ? Object.keys(ESFERAS).map((k) => '<div class="linha-config sem-toque painel-barra"><span>' + ESFERAS[k] + ' em baixa</span>'
        + '<span class="painel-trilho" aria-hidden="true"><i style="width:' + s.esferas[k].baixa + '%"></i></span><span class="valor">' + s.esferas[k].baixa + '%</span></div>').join('')
      : '<div class="linha-config sem-toque"><span>Ainda poucos check-ins nesta semana (' + CC.plural(s.base, 'pessoa', 'pessoas') + '; a soma aparece a partir de ' + s.minimo + ')</span></div>';
    return grupo('Adoção e retenção', adocaoHtml,
      'Quem abre o app a cada dia, nos últimos 14 dias. "Ainda leem": das contas com 30 dias ou mais, quantas leram nesta semana.')
      + grupo('Chama das células', chamaHtml,
        'Quanto de cada célula está com a chama acesa hoje (leu hoje ou manteve a sequência). É um retrato do dia para animar os líderes, não um placar. Toque numa célula para vê-la de perto, como o líder dela vê.')
      + grupo('Frutos em ' + mesNome(ev.mes), frutosHtml,
        'Marcos de Minha caminhada com data no mês, pelo que cada pessoa marcou.')
      + grupo('Como a igreja está', saudeHtml,
        'Do último check-in de Corpo, Mente e Espírito de cada pessoa nos últimos 7 dias' + (s.suficiente ? ' (' + s.base + ' pessoas)' : '') + '. Só a soma, sem nomes: o check-in de uma pessoa nunca aparece aqui.')
      // O relatório para levar: o que esta tela mostra (a igreja e cada célula de perto), num
      // arquivo só. CSV para planilha; a página de relatório abre o "Salvar como PDF" do navegador.
      + grupo('Exportar relatório',
        '<div class="painel-exportar"><a class="botao contorno" href="api/painel/relatorio?formato=csv" download>' + CC.ico('baixar') + 'Planilha (CSV)</a>'
        + '<a class="botao contorno" href="api/painel/relatorio?formato=html" target="_blank" rel="noopener">' + CC.ico('compartilhar') + 'Relatório em PDF</a></div>',
        'A igreja de longe e cada célula de perto, como nesta tela. O PDF abre numa página nova com o "Salvar como PDF" do navegador.');
  }

  // ---------- uma célula de perto (api/painel/celula) ----------
  // O administrador abre qualquer célula e vê o que o líder dela vê (08b-propositos.js desenha
  // os mesmos blocos): a chama de cada um, a presença, o check-in somado, a caminhada e quem
  // precisa de atenção. Nunca o que alguém escreveu.
  const enderecoCelula = (id) => '#/config/painel/celula/' + encodeURIComponent(id);
  const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  async function vistaPainelCelula(raiz, id) {
    const cabeca = (titulo, dentro) => '<div class="folha-perfil titulo-frase">' + CC.botaoVoltar('Painel') + '<h1>' + CC.esc(titulo) + '</h1>' + (dentro || '') + '</div>';
    raiz.innerHTML = cabeca('Célula') + CC.esqueleto('cartoes');
    let d;
    try { d = await CC.api('api/painel/celula?id=' + encodeURIComponent(id)); } catch (e) {
      raiz.innerHTML = cabeca('Célula') + CC.estado({ erro: true, titulo: 'Não deu para abrir a célula', texto: e.message, acao: 'Voltar ao painel' });
      const b = raiz.querySelector('[data-acao-estado]');
      if (b) b.onclick = () => { location.hash = '#/config/painel'; };
      return;
    }
    if (location.hash !== enderecoCelula(id)) return;
    const p = { ...d, painel: d, membros: [] };
    raiz.innerHTML = cabeca(d.titulo, '<p class="passo-dica">' + CC.esc((d.lider ? 'Líder: ' + d.lider + ' · ' : '') + CC.plural(d.membros, 'pessoa', 'pessoas')
      + (d.encontro >= 0 ? ' · encontro ' + (d.encontro === 0 || d.encontro === 6 ? 'aos ' + DIAS_SEMANA[d.encontro] + 's' : 'às ' + DIAS_SEMANA[d.encontro] + 's-feiras') : '')
      + ' · em ' + d.referencia.split('-').reverse().join('/')) + '</p>')
      + '<div class="painel-celula-aberta">' + CC.painelDaCelulaHtml(p) + '</div>';
    raiz.querySelectorAll('[data-voltar]').forEach((b) => { b.onclick = () => { location.hash = '#/config/painel'; }; });
  }

  CC.vistaPainel = async function (raiz, arg) {
    if (arg && arg.startsWith('painel/celula/')) return vistaPainelCelula(raiz, arg.slice('painel/celula/'.length));
    // .folha-perfil: só apresentação, a folha do alto (25-perfil.css); o título longo desce
    // para baixo do voltar (.titulo-frase) e os quatro números viram os cartões de destaque.
    const cabeca = (dentro) => '<div class="folha-perfil titulo-frase">' + CC.botaoVoltar('Perfil') + '<h1>Painel do administrador</h1>' + (dentro || '') + '</div>';
    raiz.innerHTML = cabeca() + CC.esqueleto('cartoes');
    let p;
    let igreja = null;
    try {
      // O painel da igreja vem junto; se falhar, o resto do painel aparece mesmo assim.
      [p, igreja] = await Promise.all([CC.api('api/painel'), CC.api('api/painel/igreja').catch(() => null)]);
    } catch (e) {
      raiz.innerHTML = cabeca()
        + CC.estado({ erro: true, titulo: 'Não deu para carregar o painel', texto: e.message, acao: 'Tentar de novo' });
      const b = raiz.querySelector('[data-acao-estado]');
      if (b) b.onclick = () => CC.vistaPainel(raiz);
      return;
    }
    if (location.hash !== '#/config/painel') return;

    const pedidos = p.pedidosDeSenha || [];
    raiz.innerHTML = cabeca('<p class="passo-dica">Só números, sem nomes. Calculado ' + CC.esc(atualizado(p.geradoEm)) + ', em ' + CC.esc(p.hoje.split('-').reverse().join('/')) + '.</p>'
      + (p.detalhe && p.detalhe.resumo ? '<div class="painel-resumo">'
        + cartaoResumo('abriram o app', p.detalhe.resumo.abriram) + cartaoResumo('leram', p.detalhe.resumo.leram)
        + cartaoResumo('contas novas', p.detalhe.resumo.novas)
        + (p.retorno[1] && p.retorno[1].pct !== null ? '<div class="painel-cartao"><strong>' + p.retorno[1].pct + '%' : '<div class="painel-cartao"><strong class="texto">ainda sem dado') + '</strong><span>voltaram depois de 7 dias</span>'
        + '<small><em>' + (p.retorno[1] ? p.retorno[1].voltaram + ' de ' + p.retorno[1].elegiveis + ' contas' : '') + '</em></small></div>'
        + '</div>' : ''))
      + blocosDaIgreja(igreja)
      + grupo('Senha esquecida',
        (pedidos.length
          ? pedidos.map((x) => '<div class="linha-config sem-toque"><span>@' + CC.esc(x.usuario) + ' <small class="valor">' + quando(x.em) + '</small></span>'
            + '<button class="botao plano pequeno" data-link="' + CC.esc(x.usuario) + '">Gerar link</button></div>').join('')
          : '<div class="linha-config sem-toque"><span>Nenhum pedido agora</span></div>')
        + '<div class="linha-config sem-toque painel-outro"><input id="painel-usuario" placeholder="@usuário" autocapitalize="none" spellcheck="false" aria-label="@usuário para gerar link">'
        + '<button class="botao plano pequeno" data-link-outro>Gerar link</button></div>',
        p.emailLigado
          ? 'O e-mail está ligado: quem tem e-mail cadastrado recebe o link sozinho.'
          : 'Sem e-mail configurado. Gere o link e mande pela conversa com a pessoa. Vale 1 hora e só uma vez.')
      + (p.backup ? grupo('Cópias de segurança',
        linha2(p.backup.externo ? 'No disco externo' : 'No cartão do Pi (o disco externo não está sendo usado)',
          p.backup.quantos ? p.backup.quantos + ' cópias diárias cifradas · a última em ' + p.backup.ultimo.split('-').reverse().join('/')
            + (p.backup.livreGB !== null ? ' · ' + String(p.backup.livreGB).replace('.', ',') + ' GB livres' : '') : 'Nenhuma cópia ainda'),
        p.backup.externo ? '' : 'Confira se o pendrive está ligado no Pi e montado em /mnt/externo.') : '')
      + grupo('Contas', numero('Total', p.contas.total) + numero('Novas nos últimos 7 dias', p.contas.novas7)
        + numero('Novas nos últimos 30 dias', p.contas.novas30))
      + grupo('Quem está lendo', numero('Leram hoje', p.ativos.hoje) + numero('Nos últimos 7 dias', p.ativos.dias7)
        + numero('Nos últimos 30 dias', p.ativos.dias30))
      + (p.abriram ? grupo('Quem abriu o app', numero('Hoje', p.abriram.hoje) + numero('Nos últimos 7 dias', p.abriram.dias7)
        + numero('Nos últimos 30 dias', p.abriram.dias30)) : '')
      + (p.detalhe ? grupo('Leituras por dia (últimos 30 dias)', colunas(p.detalhe.porDia, (x) => diaMes(x.dia)),
        'Quantas pessoas leram em cada dia. Média de ' + p.detalhe.mediaDiasLidos + ' dias lidos por quem leu no último mês; maior ofensiva hoje: ' + p.detalhe.maiorOfensiva + ' dias.')
        + grupo('Contas novas por semana', colunas(p.detalhe.novasPorSemana, (x) => diaMes(x.de)))
        + grupo('Funil da leitura', barras(p.detalhe.funil), 'De todas as contas, quantas chegaram a cada marca de dias lidos.')
        + grupo('Ofensivas de agora', barras(p.detalhe.ofensivas))
        + grupo('Dia da semana em que mais se lê', barras(p.detalhe.diasDaSemana), 'Soma das leituras dos últimos 30 dias.')
        + grupo('Uso das funções', barras(p.detalhe.funcoes))
        + (p.detalhe.turmas ? grupo('Retenção por turma', p.detalhe.turmas.filter((t) => t.contas).map((t) => linha2('Cadastro de ' + diaMes(t.de) + ' a ' + diaMes(t.ate) + ' (' + t.contas + (t.contas === 1 ? ' conta)' : ' contas)'),
          t.contas ? 'Leram na 1ª semana: ' + fmt(t.s1) + ' · na 2ª: ' + fmt(t.s2) + ' · na 4ª: ' + fmt(t.s4) : 'Ninguém criou conta nessa semana')).join(''),
          'Em cada turma, a porcentagem que leu pelo menos um dia naquela semana depois de criar a conta.') : '')
        + (p.detalhe.desafios ? grupo('Desafios', p.detalhe.desafios.map((d) => linha2(d.titulo,
          d.comecaram ? d.comecaram + ' começaram · ' + d.venceram + ' venceram · ' + d.seguem + ' seguem · ' + d.pararam + ' pararam'
            + (d.paramNoDia ? ', em geral no dia ' + d.paramNoDia : '') : 'Ninguém começou ainda')).join(''),
          '"Pararam" inclui quem pausou e quem está há uma semana sem vencer nenhum dia.') : '')
        + (p.detalhe.notificacao ? grupo('Notificação e leitura',
          linha2('Com notificação ligada (' + p.detalhe.notificacao.com.contas + ' contas)', 'Em média, ' + (p.detalhe.notificacao.com.media ?? 0) + ' dias lidos nos últimos 30')
          + linha2('Sem notificação (' + p.detalhe.notificacao.sem.contas + ' contas)', 'Em média, ' + (p.detalhe.notificacao.sem.media ?? 0) + ' dias lidos nos últimos 30'),
          'É uma comparação, não prova de causa: quem já lê mais tende a ligar os avisos.') : '')
        + (p.detalhe.origens ? grupo('De onde vêm e quanto ficam', p.detalhe.origens.map((o) => linha2(o.faixa + ' (' + o.contas + (o.contas === 1 ? ' conta)' : ' contas)'),
          o.contas ? o.pct + '% ainda leem (leram nos últimos 30 dias)' : 'Nenhuma conta chegou assim')).join(''),
          'Contas antigas sem origem gravada entram por dedução: convite de amigo, conhecendo Jesus ou cadastro direto.') : '') : '')
      + grupo('Voltaram depois de criar a conta',
        p.retorno.map((r) => numero(r.dias === 1 ? 'Depois de 1 dia' : 'Depois de ' + r.dias + ' dias', porcento(r))).join(''),
        'É a pergunta "o hábito pegou?". Conta quem leu de novo a partir desse dia, entre as contas com idade para isso.')
      + grupo('Onde as pessoas param', barras(p.ondeParam.faixas),
        p.ondeParam.total + ' conta(s) sem ler há 7 dias ou mais, pelo número de dias do plano que chegaram a ler.')
      + grupo('Progresso de todos no plano', barras(p.progresso))
      + grupo('Uso', numero('Começaram os Primeiros Passos', p.primeirosPassos.comecaram)
        + numero('Terminaram os 12 Primeiros Passos', p.primeirosPassos.concluiram)
        + numero('Escreveram sobre algum dia', p.escreveram)
        + numero('Estão em algum propósito', p.propositos.contasEmAlgum)
        + numero('Propósitos ativos (grupos)', p.propositos.ativos + ' (' + p.propositos.grupos + ')')
        + numero('Com notificação ligada', p.comNotificacao))
      + grupo('Células e cuidado', celulasECuidado(p.celulasECuidado),
        'Só números. Com menos de 5 pessoas numa conta, aparece "menos de 5" para não identificar ninguém numa igreja pequena.');

    async function gerar(usuario) {
      if (!usuario) return;
      let r;
      try { r = await CC.api('api/painel/link', { usuario }); } catch (e) { CC.avisar(e.message); return; }
      const texto = 'Oi! Aqui está o link para criar sua senha nova no Geração Eleita (vale por 1 hora): ' + r.link;
      CC.folha('<h2>Link para @' + CC.esc(r.usuario) + '</h2>'
        + '<p class="passo-dica">Mande só para a própria pessoa. Vale por ' + CC.esc(r.validade) + ' e deixa de valer quando ela criar a senha.</p>'
        + '<p class="mensagem-convite"><span>' + CC.esc(r.link) + '</span></p>'
        + '<div class="acoes"><a class="botao" href="https://wa.me/?text=' + encodeURIComponent(texto) + '" target="_blank" rel="noopener">Mandar pelo WhatsApp</a>'
        + '<button class="botao contorno" data-copiar>Copiar link</button></div>',
      {
        rotulo: 'Link de senha nova', classe: 'folha-conta',
        ligar: (folha) => {
          folha.querySelector('[data-copiar]').onclick = async () => {
            try { await navigator.clipboard.writeText(r.link); CC.avisar('Link copiado'); } catch { CC.avisar('Não consegui copiar. Segure o link para copiar.'); }
          };
        },
      });
      CC.vistaPainel(raiz);
    }
    raiz.querySelectorAll('[data-link]').forEach((b) => { b.onclick = () => gerar(b.dataset.link); });
    raiz.querySelector('[data-link-outro]').onclick = () => gerar(raiz.querySelector('#painel-usuario').value.trim().replace(/^@/, '').toLowerCase());
  };
})(window.CC);
