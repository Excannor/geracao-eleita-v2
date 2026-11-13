/* As folhas de quem conduz a célula, que abrem por um botão: "Quem foi ao encontro?", "Dia do
   encontro", "Recado para a célula", "Multiplicar a célula" e a prévia de "Dar um toque" em quem
   falta. Saíram do index.html para devolver a folga dele (docs/aprendizados.md, "Folga do
   index.html"): o build as junta na peça estudo-celula, e 08b-propositos.js as pede com
   pedirEstudo antes de abrir. O que elas usam da célula chega em A (apoioConduz, 08b). */
(function (CC) {
  'use strict';
  CC.celulaConduz = function (A) {
  const { recarregar, retrato, nomeCurto, euUsuario, TITULO_GRUPO_MAX, quandoValendo, DIAS_ENCONTRO, DIA_LONGO, nomeDoEncontro, dataDoEncontro, ddmm, tituloDoEstudo } = A;
  const NENHUM_ESTUDO = 'Outro estudo, fora do app';
  // A mensagem do servidor com a maiúscula e o ponto da tela.
  const comoFrase = (m) => CC.frase(m);

  // Antes de mandar o toque para várias pessoas, a folha mostra para quem vai e o que chega (B15).
  function folhaToqueEmQuemFalta(faltam) {
    if (!faltam.length) return;
    const meu = String((CC.quem && CC.quem.nome) || 'Você').split(' ')[0];
    CC.folha('<h2>Dar um toque</h2>'
      + '<p class="passo-dica">Cada pessoa recebe um aviso no celular, no máximo um por dia. O texto muda a cada vez. Por exemplo:</p>'
      + '<div class="recado-lider previa-toque"><p><b>' + CC.esc(meu) + ' lembrou de você</b></p><p class="passo-dica">Um toque de amizade pra ler a Bíblia hoje. Responde lendo, se der.</p></div>'
      + '<div class="lista-pedidos">' + faltam.map((m) => '<div class="linha-amigo">' + retrato(m) + '<div class="quem-amigo"><b>' + CC.esc(nomeCurto(m)) + '</b></div></div>').join('') + '</div>'
      + '<div class="acoes"><button class="botao" data-enviar-toques>' + CC.ico('sino') + (faltam.length === 1 ? 'Dar um toque em ' + CC.esc(nomeCurto(faltam[0])) : 'Enviar para ' + faltam.length + ' pessoas') + '</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Dar um toque',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const enviar = folha.querySelector('[data-enviar-toques]');
        enviar.onclick = async () => {
          enviar.disabled = true;
          const r = await Promise.allSettled(faltam.map((m) => CC.api('api/toques', { para: m.usuario })));
          const foram = r.filter((x) => x.status === 'fulfilled').length;
          fechar();
          CC.avisar(foram ? (foram === 1 ? 'Toque enviado' : 'Toques enviados para ' + foram + ' pessoas') : 'Hoje você já deu um toque em quem falta', { tipo: foram ? 'certo' : undefined });
          recarregar();
        };
      },
    });
  }

  // ---------- multiplicar a célula (Atos 2.47; 2 Timóteo 2.2) ----------
  // Só o líder vê o botão (já garantido em abaPessoas). Ele escolhe o auxiliar que vai
  // liderar a nova célula, o nome dela e quem vai junto (membros ativos; visitante também
  // pode ir). O auxiliar escolhido sempre vai, então não aparece de novo na lista de "quem vai".
  function folhaMultiplicar(p) {
    const gente = p.membros.filter((m) => m.estado === 'ativo' && m.usuario !== p.criadoPor);
    const auxiliares = gente.filter((m) => m.papel === 'auxiliar');
    CC.folha('<h2>Multiplicar a célula</h2>'
      + '<p class="passo-dica">Quando a célula cresce, ela pode virar duas. Um auxiliar passa a liderar a nova, e vocês escolhem juntos quem vai para lá.</p>'
      + '<label class="campo-senha"><span>Quem vai liderar a nova célula</span><select data-auxiliar>'
      + auxiliares.map((m) => '<option value="' + CC.esc(m.usuario) + '">' + CC.esc(m.nome) + '</option>').join('') + '</select></label>'
      + '<label class="campo-senha"><span>Nome da nova célula ' + CC.contagem('', TITULO_GRUPO_MAX) + '</span><input data-titulo maxlength="' + TITULO_GRUPO_MAX + '" placeholder="Ex.: Célula de quinta" autocomplete="off" autocapitalize="sentences" enterkeyhint="done"></label>'
      + '<p class="etiqueta">Quem mais vai para a nova célula</p>'
      + '<div class="escolha-amigos" data-lista-pessoas>' + gente.filter((m) => m.papel !== 'auxiliar' || auxiliares.length > 1).map((m) => '<label class="linha-amigo escolha-amigo">'
        + '<input type="checkbox" value="' + CC.esc(m.usuario) + '" data-pessoa-multiplicar' + (m.papel === 'auxiliar' ? ' data-outro-auxiliar' : '') + '>' + retrato(m)
        + '<span class="quem-amigo"><b>' + CC.esc(nomeCurto(m)) + (m.papel === 'visitante' ? ' <small class="selo-lider">visitante</small>' : '') + '</b></span></label>').join('') + '</div>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao" data-confirmar-multiplicar>Multiplicar</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Multiplicar a célula',
      rolavel: true,
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const erro = folha.querySelector('.erro-proposito');
        const botao = folha.querySelector('[data-confirmar-multiplicar]');
        // Marcar a pessoa que virou "quem vai liderar" desmarca ela da lista de "quem mais vai":
        // o auxiliar escolhido sempre vai, então não faz sentido escolher ele duas vezes.
        const selecionaAuxiliar = folha.querySelector('[data-auxiliar]');
        const atualizarOutroAuxiliar = () => {
          folha.querySelectorAll('[data-outro-auxiliar]').forEach((c) => {
            const linha = c.closest('.escolha-amigo');
            const escondido = c.value === selecionaAuxiliar.value;
            if (linha) linha.hidden = escondido;
            if (escondido) c.checked = false;
          });
        };
        if (selecionaAuxiliar) { selecionaAuxiliar.onchange = atualizarOutroAuxiliar; atualizarOutroAuxiliar(); }
        botao.onclick = async () => {
          const auxiliar = selecionaAuxiliar ? selecionaAuxiliar.value : '';
          const titulo = folha.querySelector('[data-titulo]').value.trim();
          const pessoas = [...folha.querySelectorAll('[data-pessoa-multiplicar]:checked')].map((c) => c.value);
          erro.hidden = true;
          if (!auxiliar) { erro.textContent = 'A célula precisa de um auxiliar ativo para poder multiplicar.'; erro.hidden = false; return; }
          if (!titulo) { erro.textContent = 'Diga o nome da nova célula.'; erro.hidden = false; return; }
          const nomeAux = (auxiliares.find((m) => m.usuario === auxiliar) || {}).nome || '@' + auxiliar;
          if (!await CC.confirmar({
            titulo: 'Multiplicar a célula?',
            texto: nomeAux + ' passa a liderar a nova célula "' + titulo + '", com ' + CC.plural(pessoas.length + 1, 'pessoa', 'pessoas') + ' (incluindo ' + nomeAux + ').',
            acao: 'Multiplicar',
          })) return;
          botao.disabled = true;
          try {
            await CC.api('api/celula', { acao: 'multiplicar', id: p.id, auxiliar, titulo, pessoas });
            CC.avisar('Célula multiplicada!');
            fechar();
            recarregar();
          } catch (e) {
            botao.disabled = false;
            erro.textContent = e.message;
            erro.hidden = false;
          }
        };
      },
    });
  }

  function folhaRecado(p) {
    const max = 280;
    const quandoAtual = quandoValendo(p) ? p.recadoQuando : '';
    CC.folha('<h2>Recado para a célula</h2>'
      + '<p class="passo-dica">Aparece no alto da célula para todos: um lembrete do encontro, um pedido de oração, uma palavra de ânimo.</p>'
      + '<label class="campo-senha"><span>Recado</span><textarea data-texto name="recado-da-celula" maxlength="' + max + '" rows="4" autocomplete="off">' + CC.esc(p.recado || '') + '</textarea></label>'
      + '<p class="passo-dica pequena" data-conta></p>'
      // Dia e hora à parte (opcionais): é o que deixa a célula pôr o encontro na agenda.
      + '<div class="campos-quando"><label class="campo-senha"><span>Dia do encontro</span><input type="date" data-quando-dia min="' + CC.hojeIso() + '" value="' + CC.esc(quandoAtual.slice(0, 10)) + '"></label>'
      + '<label class="campo-senha"><span>Hora</span><input type="time" data-quando-hora step="900" value="' + CC.esc(quandoAtual.slice(11, 16)) + '"></label></div>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao" data-salvar>Publicar recado</button>'
      + (p.recado ? '<button class="botao plano perigo" data-apagar>Apagar o recado</button>' : '')
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Recado para a célula',
      ligar: (folha, fechar) => {
        const campo = folha.querySelector('[data-texto]');
        const conta = () => { folha.querySelector('[data-conta]').textContent = CC.pertoDoLimite(campo.value.length, max) ? campo.value.length + ' de ' + max + ' caracteres' : ''; };
        campo.oninput = conta;
        conta();
        folha.querySelector('[data-fechar]').onclick = fechar;
        const erro = folha.querySelector('.erro-proposito');
        const enviar = async (texto, quando = '') => {
          try {
            await CC.api('api/celula', { acao: 'recado', id: p.id, texto, quando });
            fechar();
            CC.avisar(texto ? 'Recado publicado' : 'Recado apagado');
            recarregar();
          } catch (e) {
            erro.textContent = e.message;
            erro.hidden = false;
          }
        };
        folha.querySelector('[data-salvar]').onclick = () => {
          const dia = folha.querySelector('[data-quando-dia]').value;
          const hora = folha.querySelector('[data-quando-hora]').value;
          erro.hidden = true;
          if (dia && !hora) { erro.textContent = 'Escolha a hora do encontro também.'; erro.hidden = false; return; }
          if (hora && !dia) { erro.textContent = 'Escolha o dia do encontro também.'; erro.hidden = false; return; }
          if (dia && dia < CC.hojeIso()) { erro.textContent = 'Escolha um dia de hoje em diante.'; erro.hidden = false; return; }
          enviar(campo.value, dia && hora ? dia + 'T' + hora.slice(0, 5) : '');
        };
        const apagar = folha.querySelector('[data-apagar]');
        if (apagar) apagar.onclick = async () => {
          if (!await CC.confirmar({ titulo: 'Apagar o recado?', texto: 'Ele some do alto da célula para todo mundo.', acao: 'Apagar', perigo: true })) return;
          enviar('');
        };
      },
    });
  }

  // O dia da semana, a hora e o lugar do encontro (B12): o dia escolhido fica marcado e "Salvar"
  // grava os três juntos.
  function folhaEncontro(p, depois) {
    let dia = p.encontro >= 0 ? p.encontro : -1;
    CC.folha('<h2>Dia do encontro</h2>'
      + '<div class="escolha-dia" role="group" aria-label="Dia da semana">' + DIAS_ENCONTRO.map((d, i) => '<button type="button" class="botao ' + (dia === i ? 'azul' : 'contorno') + ' pequeno" data-dia="' + i + '" aria-pressed="' + (dia === i) + '">'
        + d.charAt(0).toUpperCase() + d.slice(1) + '</button>').join('') + '</div>'
      + '<div class="campos-quando"><label class="campo-senha"><span>Hora (opcional)</span><input type="time" data-hora-encontro step="900" value="' + CC.esc(p.encontroHora || '') + '"></label></div>'
      + '<label class="campo-senha"><span>Lugar (opcional)</span><input type="text" data-lugar-encontro maxlength="80" autocomplete="off" placeholder="Ex.: Casa da Ana" value="' + CC.esc(p.encontroLugar || '') + '"></label>'
      + '<p class="passo-dica pequena">Todos da célula veem o dia, a hora e o lugar, inclusive visitantes.</p>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      + '<div class="acoes"><button class="botao" data-salvar-encontro' + (dia >= 0 ? '' : ' disabled') + '>Salvar</button>'
      + (p.encontro >= 0 ? '<button class="botao plano" data-sem-dia>Sem dia marcado</button>' : '')
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Dia do encontro',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        const salvar = folha.querySelector('[data-salvar-encontro]');
        folha.querySelectorAll('[data-dia]').forEach((b) => {
          b.onclick = () => {
            dia = Number(b.dataset.dia);
            folha.querySelectorAll('[data-dia]').forEach((x) => {
              const sel = x === b;
              x.classList.toggle('azul', sel);
              x.classList.toggle('contorno', !sel);
              x.setAttribute('aria-pressed', String(sel));
            });
            salvar.disabled = false;
          };
        });
        const gravar = async (d) => {
          const corpo = { acao: 'encontro', id: p.id, dia: d };
          if (d >= 0) Object.assign(corpo, { hora: folha.querySelector('[data-hora-encontro]').value || '', lugar: folha.querySelector('[data-lugar-encontro]').value || '' });
          try {
            await CC.api('api/celula', corpo);
            fechar();
            CC.avisar(d >= 0 ? 'Encontro ' + nomeDoEncontro(d) : 'Dia do encontro tirado', { tipo: 'certo' });
            if (depois) depois();
            recarregar();
          } catch (e) {
            const erro = folha.querySelector('.erro-proposito');
            erro.textContent = comoFrase(e.message);
            erro.hidden = false;
          }
        };
        salvar.onclick = () => { if (dia >= 0) gravar(dia); };
        const semDia = folha.querySelector('[data-sem-dia]');
        if (semDia) semDia.onclick = () => gravar(-1);
      },
    });
  }

  // Últimos 8 dias (hoje e os 7 anteriores): a folha deixa trocar entre eles.
  function opcoesDataEncontro(hoje) {
    return Array.from({ length: 8 }, (_, i) => CC.somaDias(hoje, -i));
  }

  // opcoes.estudo: o estudo que o modo encontro acabou de usar.
  function folhaRegistrarEncontro(p, opcoes = {}) {
    const hoje = CC.hojeIso();
    const alvo = dataDoEncontro(p, hoje) || hoje;
    const reg = p.registro || null;
    const estudosReg = ((reg && reg.estudos) || []).slice().sort((a, b) => (a.em < b.em ? 1 : a.em > b.em ? -1 : 0));
    const diaDoReg = (d) => ((reg && reg.dias) || []).find((x) => x.data === d) || null;
    // os estudos preparados até a data (o preparado depois não foi usado nela)
    const estudosAte = (d) => estudosReg.filter((e) => !e.dia || e.dia <= d);
    const vale = (x, d) => x === '-' || estudosAte(d).some((e) => e.id === x);
    const escolhaDe = (d) => {
      const r = diaDoReg(d);
      const ordem = [d === alvo ? opcoes.estudo : '', r && r.estudo, r && r.padrao, p.estudo && p.estudo.id];
      return ordem.find((x) => x && vale(x, d)) || '-';
    };
    const visitantesDe = (d) => { const r = diaDoReg(d); return r ? Number(r.visitantes) || 0 : (p.ultimoEncontro && p.ultimoEncontro.data === d ? p.ultimoEncontro.visitantes : 0); };
    const nomeDoEscolhido = (x) => { const e = estudosReg.find((y) => y.id === x); return e ? tituloDoEstudo(e) : NENHUM_ESTUDO; };
    const opcoesEstudo = (d, escolhido) => estudosAte(d).map((e) => '<label class="opcao-estudo"><input type="radio" name="estudo-registro" value="' + CC.esc(e.id) + '"' + (e.id === escolhido ? ' checked' : '') + '>'
      + '<span><b>' + CC.esc(tituloDoEstudo(e)) + '</b>' + (e.dia ? '<small>Preparado em ' + ddmm(e.dia) + '</small>' : '') + '</span></label>').join('')
      + '<label class="opcao-estudo"><input type="radio" name="estudo-registro" value="-"' + (escolhido === '-' ? ' checked' : '') + '><span><b>' + NENHUM_ESTUDO + '</b></span></label>';
    const datas = opcoesDataEncontro(hoje);
    // quem conduz primeiro (líder, depois auxiliares), depois os membros e, no fim, os visitantes (B8)
    const peso = (m) => (m.usuario === p.criadoPor ? 0 : m.papel === 'auxiliar' ? 1 : m.papel === 'visitante' ? 3 : 2);
    const gente = p.membros.filter((m) => m.estado === 'ativo')
      .sort((a, b) => peso(a) - peso(b) || String(nomeCurto(a)).localeCompare(String(nomeCurto(b)), 'pt-BR'));
    const rotuloData = (d) => (d === hoje ? 'Hoje' : d === CC.somaDias(hoje, -1) ? 'Ontem' : ddmm(d));
    // A data em destaque é a do encontro desta semana; as outras ficam atrás de "Outra data".
    const doEncontro = dataDoEncontro(p, hoje);
    const nomeData = (d) => (d === hoje ? 'Hoje' : d === CC.somaDias(hoje, -1) ? 'Ontem' : DIA_LONGO[new Date(d + 'T12:00:00').getDay()])
      + ', ' + Number(d.slice(8, 10)) + '/' + Number(d.slice(5, 7));
    const realce = (d) => '<b>' + nomeData(d) + '</b>' + (d === doEncontro ? ' <span>· o encontro desta semana</span>' : '');
    CC.folha('<h2>Quem foi ao encontro?</h2>'
      + '<div class="data-encontro-realce realce" data-realce-data>' + realce(alvo) + '</div>'
      + '<button type="button" class="botao contorno pequeno" data-outra-data aria-expanded="false">' + CC.ico('calendario') + 'Outra data</button>'
      + '<div class="escolha-dia" role="group" aria-label="Dia do encontro" data-outras-datas hidden>' + datas.map((d) => '<button type="button" class="botao '
        + (d === alvo ? 'azul' : 'contorno') + ' pequeno" data-data="' + d + '" aria-pressed="' + (d === alvo) + '">' + rotuloData(d) + '</button>').join('') + '</div>'
      // sem nenhum estudo na célula, o bloco não aparece e o registro vai sem o campo
      + (estudosReg.length ? '<div class="estudo-do-registro"><span class="etiqueta">Estudo deste encontro</span><b data-estudo-escolhido></b>'
        + '<button type="button" class="botao plano pequeno" data-trocar-estudo aria-expanded="false">Trocar</button></div>'
        + '<div class="escolha-estudo" role="radiogroup" aria-label="Estudo deste encontro" data-opcoes-estudo hidden></div>' : '')
      + '<div class="presenca-topo"><span class="etiqueta">Quem veio</span><button type="button" class="botao contorno pequeno" data-todos-vieram>' + CC.ico('certo') + 'Todos vieram</button></div>'
      + '<div class="escolha-amigos">' + gente.map((m) => '<label class="linha-amigo escolha-amigo">'
        + '<input type="checkbox" value="' + CC.esc(m.usuario) + '"' + (m.usuario === euUsuario() ? ' checked' : '') + '>' + retrato(m)
        + '<span class="quem-amigo"><b>' + CC.esc(nomeCurto(m)) + (m.usuario === p.criadoPor ? ' <small class="selo-lider">líder</small>' : m.papel === 'auxiliar' ? ' <small class="selo-lider">auxiliar</small>'
          : m.papel === 'visitante' ? ' <small class="selo-lider">visitante</small>' : '') + '</b></span></label>').join('') + '</div>'
      + '<div class="conta-visitantes"><span>Pessoas sem conta que vieram</span><div class="conta-visitantes-controles">'
      + '<button type="button" class="botao-icone" data-visitantes-menos aria-label="Diminuir">−</button>'
      + '<b data-visitantes-valor>0</b>'
      + '<button type="button" class="botao-icone" data-visitantes-mais aria-label="Aumentar">+</button></div></div>'
      + '<p class="erro-proposito" role="alert" hidden></p>'
      // uma rolagem só (a da folha), com o "Salvar" preso embaixo enquanto a lista passa (B8)
      + '<div class="presenca-pe"><button class="botao" data-salvar>Salvar</button></div>'
      + '<div class="acoes">'
      // Feriado ou imprevisto: a semana fica registrada sem encontro e ninguém conta como falta.
      + '<button class="botao contorno" data-sem-encontro>Não houve encontro nesta semana</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Quem foi ao encontro',
      classe: 'folha-presenca',
      rolavel: true,
      ligar: (folha, fechar) => {
        let dataEscolhida = alvo;
        let n = visitantesDe(alvo);
        const valor = folha.querySelector('[data-visitantes-valor]');
        valor.textContent = n;
        // "Salvar · 6 pessoas": quem foi marcado mais as pessoas sem conta
        const caixas = [...folha.querySelectorAll('.escolha-amigo input')];
        const salvarBotao = folha.querySelector('[data-salvar]');
        const todos = folha.querySelector('[data-todos-vieram]');
        const contar = () => {
          const marcados = caixas.filter((i) => i.checked).length;
          const total = marcados + n;
          salvarBotao.textContent = total ? 'Salvar · ' + CC.plural(total, 'pessoa', 'pessoas') : 'Salvar';
          todos.innerHTML = marcados === caixas.length ? 'Desmarcar todos' : CC.ico('certo') + 'Todos vieram';
        };
        caixas.forEach((i) => i.addEventListener('change', contar));
        todos.onclick = () => {
          const marcar = caixas.some((i) => !i.checked);
          caixas.forEach((i) => { i.checked = marcar; });
          contar();
        };
        // o estudo escolhido: refeito ao trocar a data, a não ser que a pessoa já tenha escolhido
        let estudoEscolhido = escolhaDe(alvo);
        let escolheuEstudo = false;
        const caixaEstudos = folha.querySelector('[data-opcoes-estudo]');
        const trocar = folha.querySelector('[data-trocar-estudo]');
        const pintarEstudo = () => {
          if (!caixaEstudos) return;
          folha.querySelector('[data-estudo-escolhido]').textContent = nomeDoEscolhido(estudoEscolhido);
          caixaEstudos.innerHTML = opcoesEstudo(dataEscolhida, estudoEscolhido);
          caixaEstudos.querySelectorAll('input').forEach((i) => {
            i.onchange = () => { estudoEscolhido = i.value; escolheuEstudo = true; folha.querySelector('[data-estudo-escolhido]').textContent = nomeDoEscolhido(estudoEscolhido); };
          });
        };
        pintarEstudo();
        if (trocar) trocar.onclick = () => {
          const abrir = caixaEstudos.hidden;
          caixaEstudos.hidden = !abrir;
          trocar.setAttribute('aria-expanded', String(abrir));
        };
        const outra = folha.querySelector('[data-outra-data]');
        const outras = folha.querySelector('[data-outras-datas]');
        outra.onclick = () => {
          const abrir = outras.hidden;
          outras.hidden = !abrir;
          outra.setAttribute('aria-expanded', String(abrir));
        };
        folha.querySelectorAll('[data-data]').forEach((b) => {
          b.onclick = () => {
            dataEscolhida = b.dataset.data;
            folha.querySelector('[data-realce-data]').innerHTML = realce(dataEscolhida);
            folha.querySelectorAll('[data-data]').forEach((x) => {
              const sel = x === b;
              x.classList.toggle('azul', sel);
              x.classList.toggle('contorno', !sel);
              x.setAttribute('aria-pressed', String(sel));
            });
            n = visitantesDe(dataEscolhida);
            valor.textContent = n; contar();
            if (!escolheuEstudo || !vale(estudoEscolhido, dataEscolhida)) estudoEscolhido = escolhaDe(dataEscolhida);
            pintarEstudo();
          };
        });
        folha.querySelector('[data-visitantes-menos]').onclick = () => { n = Math.max(0, n - 1); valor.textContent = n; contar(); };
        folha.querySelector('[data-visitantes-mais]').onclick = () => { n = Math.min(30, n + 1); valor.textContent = n; contar(); };
        contar();
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelector('[data-sem-encontro]').onclick = async () => {
          const botao = folha.querySelector('[data-sem-encontro]');
          botao.disabled = true;
          try {
            await CC.api('api/celula', { acao: 'registrarEncontro', id: p.id, data: dataEscolhida, semEncontro: true, presentes: [], visitantes: 0 });
            fechar();
            CC.avisar('Semana registrada sem encontro');
            // a lista e a leitura dos anteriores mudam (a data e a presença daquele dia)
            if (CC.estudoCelula && CC.estudoCelula.esquecer) CC.estudoCelula.esquecer(p.id);
            recarregar();
          } catch (e) {
            botao.disabled = false;
            const erro = folha.querySelector('.erro-proposito');
            erro.textContent = e.message || 'Não deu certo agora. Tente de novo.';
            erro.hidden = false;
          }
        };
        folha.querySelector('[data-salvar]').onclick = async () => {
          const botao = folha.querySelector('[data-salvar]');
          botao.disabled = true;
          const presentes = [...folha.querySelectorAll('.escolha-amigo input:checked')].map((i) => i.value);
          let r;
          try {
            r = await CC.api('api/celula', Object.assign({ acao: 'registrarEncontro', id: p.id, data: dataEscolhida, presentes, visitantes: n }, caixaEstudos ? { estudo: estudoEscolhido } : {}));
          } catch (e) {
            botao.disabled = false;
            const erro = folha.querySelector('.erro-proposito');
            erro.textContent = comoFrase(e.message);
            erro.hidden = false;
            return;
          }
          fechar();
          // depois do encontro, o próximo da fila entra na célula (docs/a-mesa-fila.md, 3.6)
          // o de hoje só põe o próximo amanhã: registrar no começo do encontro não troca o estudo
          CC.avisar(r && r.promovido ? 'Presença salva. O próximo estudo já está na aba Estudo.'
            : r && r.amanha ? 'Presença salva. Amanhã, o próximo estudo entra na aba Estudo.' : 'Presença salva', { tipo: 'certo' });
          if (CC.estudoCelula && CC.estudoCelula.esquecer) CC.estudoCelula.esquecer(p.id);
          // quem não veio, com a mensagem pronta: quem conduz decide se manda (o app não avisa ninguém)
          const faltaram = (r && r.faltaram) || [];
          if (faltaram.length) CC.estudoCelula.paraQuemFaltou(p, { data: dataEscolhida, faltaram, estudo: r.estudo || null });
          recarregar();
        };
      },
    });
  }

  return { toque: folhaToqueEmQuemFalta, multiplicar: folhaMultiplicar, recado: folhaRecado, encontro: folhaEncontro, registrar: folhaRegistrarEncontro };
  };
})(window.CC);
