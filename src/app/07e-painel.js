/* Painel do app: só o dono vê (CAMINHO_ADMIN no servidor). Números agregados, sem nome de
   ninguém, para saber se o app funciona: quem volta, onde as pessoas param. E os pedidos de
   senha esquecida, com o link que o dono manda à mão enquanto não há e-mail configurado. */
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
      + itens.map((x) => '<span class="painel-coluna"><small>' + (x.contas || '') + '</small><i style="height:' + Math.round((x.contas / maior) * 100) + '%"></i><em>' + CC.esc(rotulo(x)) + '</em></span>').join('') + '</div>';
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

  CC.vistaPainel = async function (raiz) {
    raiz.innerHTML = CC.botaoVoltar('Perfil') + '<h1>Painel do administrador</h1><div class="vazio">Carregando…</div>';
    let p;
    try {
      p = await CC.api('api/painel');
    } catch (e) {
      raiz.innerHTML = CC.botaoVoltar('Perfil') + '<h1>Painel do administrador</h1><div class="vazio">' + CC.esc(e.message) + '</div>';
      return;
    }
    if (location.hash !== '#/config/painel') return;

    const pedidos = p.pedidosDeSenha || [];
    raiz.innerHTML = CC.botaoVoltar('Perfil')
      + '<h1>Painel do administrador</h1>'
      + '<p class="passo-dica">Só números, sem nomes. Calculado ' + CC.esc(atualizado(p.geradoEm)) + ', em ' + CC.esc(p.hoje.split('-').reverse().join('/')) + '.</p>'
      + (p.detalhe && p.detalhe.resumo ? '<div class="painel-resumo">'
        + cartaoResumo('abriram o app', p.detalhe.resumo.abriram) + cartaoResumo('leram', p.detalhe.resumo.leram)
        + cartaoResumo('contas novas', p.detalhe.resumo.novas)
        + (p.retorno[1] && p.retorno[1].pct !== null ? '<div class="painel-cartao"><strong>' + p.retorno[1].pct + '%' : '<div class="painel-cartao"><strong class="texto">ainda sem dado') + '</strong><span>voltaram depois de 7 dias</span>'
        + '<small><em>' + (p.retorno[1] ? p.retorno[1].voltaram + ' de ' + p.retorno[1].elegiveis + ' contas' : '') + '</em></small></div>'
        + '</div>' : '')
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
        rotulo: 'Link de senha nova',
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
