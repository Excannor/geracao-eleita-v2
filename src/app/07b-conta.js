/* Configurações e conta: aparência, leitura, privacidade, seus dados e o que mexe em
   quem você é dentro do aplicativo. Também o cadastro que faltava nas contas antigas. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const dataBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

  const linha = (rotulo, valor, atributos, classe) => '<button class="linha-config' + (classe ? ' ' + classe : '') + '" ' + (atributos || '') + '>'
    + '<span>' + CC.esc(rotulo) + '</span>' + (valor ? '<span class="valor">' + CC.esc(valor) + '</span>' : '')
    + CC.ico('avancar') + '</button>';
  const grupo = (titulo, dentro) => '<section class="grupo-config"><h2 class="etiqueta">' + CC.esc(titulo) + '</h2>'
    + '<div class="caixa-config">' + dentro + '</div></section>';

  CC.vistaConfig = function (raiz) {
    const quem = CC.quem || {};
    const tema = CC.temaGuardado();
    const traducao = CC.traducao();

    raiz.innerHTML = CC.botaoVoltar('Perfil')
      + '<h1>Configurações</h1>'
      + grupo('Aparência', '<div class="linha-config sem-toque"><span>Tema</span>'
        + '<div class="segmentado" role="group" aria-label="Tema">'
        + [['Sistema', null], ['Claro', false], ['Escuro', true]].map(([rot, v]) =>
          '<button data-tema="' + JSON.stringify(v) + '" aria-pressed="' + (tema === v) + '">' + rot + '</button>').join('')
        + '</div></div>')
      + grupo('Leitura', linha('Tradução e créditos', traducao ? traducao.abreviatura : '', 'data-ir="#/config/textos"'))
      + grupo('Notificações', linha('Lembretes e avisos', CC.resumoNotificacoes(), 'data-ir="#/config/notificacoes"'))
      + grupo('Privacidade', (quem.comSenha
        ? '<button class="linha-config" data-mural role="switch" aria-checked="' + !!(CC.novidadesEmCache() || {}).ligado + '">'
          + '<span>Mostrar meus marcos no Feed</span><span class="interruptor" aria-hidden="true"><i></i></span></button>'
        : '')
        + linha('Pessoas bloqueadas', '', 'data-ir="#/amigos/bloqueados"')
        + '<a class="linha-config" href="privacidade.html"><span>Privacidade</span>' + CC.ico('avancar') + '</a>')
      + grupo('Seus dados', linha('Baixar o que escrevi', '', 'data-exportar')
        + linha('Zerar progresso', '', 'data-zerar', 'perigo'))
      + (quem.comSenha
        ? grupo('Conta', '<div class="linha-config sem-toque"><span>@usuário</span><span class="valor">@' + CC.esc(quem.usuario) + '</span></div>'
          + '<div class="linha-config sem-toque"><span>E-mail</span><span class="valor">' + CC.esc(quem.email || 'falta completar') + '</span></div>'
          + '<div class="linha-config sem-toque"><span>Nascimento</span><span class="valor">' + CC.esc(dataBr(quem.nascimento) || 'falta completar') + '</span></div>'
          + (quem.perfilCompleto ? '' : linha('Completar cadastro', '', 'data-completar'))
          + linha('Trocar a senha', '', 'data-senha')
          + linha('Sair dos outros aparelhos', '', 'data-sair-outros')
          + linha('Sair desta conta', '', 'data-sair')
          + linha('Apagar a conta', '', 'data-apagar', 'perigo'))
        : '')
      + (quem.admin ? grupo('Administração', linha('Painel do app', '', 'data-ir="#/config/painel"')) : '')
      + '<p class="passo-dica pequena" style="text-align:center;margin-top:20px">Conteúdo de ' + D.importadoEm
      + ' · ' + (CC.servidorVivo() ? 'progresso sincronizado entre seus aparelhos' : 'progresso salvo neste aparelho') + '</p>';

    raiz.querySelectorAll('[data-ir]').forEach((el) => { el.onclick = () => { location.hash = el.dataset.ir; }; });
    raiz.querySelectorAll('[data-tema]').forEach((b) => {
      b.onclick = () => { CC.guardarTema(JSON.parse(b.dataset.tema)); CC.redesenhar(); };
    });
    raiz.querySelector('[data-exportar]').onclick = () => { CC.baixarExportacao(); CC.avisar('Arquivo gerado'); };
    raiz.querySelector('[data-zerar]').onclick = async () => {
      const certo = await CC.confirmar({
        titulo: 'Zerar todo o progresso?',
        texto: 'Apaga leituras, ofensiva, registros e anotações em todos os aparelhos. O material de leitura não é tocado.',
        acao: 'Apagar tudo',
        perigo: true,
      });
      if (!certo) return;
      CC.zerarProgresso();
      CC.avisar('Progresso zerado');
      CC.redesenhar();
    };
    const ligar = (sel, fn) => { const el = raiz.querySelector(sel); if (el) el.onclick = fn; };
    ligar('[data-mural]', async () => {
      const agora = !((CC.novidadesEmCache() || {}).ligado);
      try {
        await CC.preferirNovidades(agora);
        CC.avisar(agora ? 'Seus amigos vão ver seus marcos' : 'Seus marcos saíram do Feed');
      } catch (e) { CC.avisar(e.message); }
      await CC.carregarNovidades();
      CC.redesenhar();
    });
    ligar('[data-completar]', () => CC.completarCadastro(quem));
    ligar('[data-senha]', () => CC.trocarSenha());
    ligar('[data-apagar]', () => CC.apagarConta(quem.usuario));
    ligar('[data-sair-outros]', async () => {
      const certo = await CC.confirmar({
        titulo: 'Sair dos outros aparelhos?',
        texto: 'Todo celular ou computador onde a sua conta está aberta sai dela. Este aparelho continua dentro.',
        acao: 'Sair dos outros',
      });
      if (!certo) return;
      try { await CC.api('api/sair-dos-outros', {}); CC.avisar('Pronto: só este aparelho continua dentro'); } catch (e) { CC.avisar(e.message); }
    });
    ligar('[data-sair]', async () => {
      const certo = await CC.confirmar({
        titulo: 'Sair da conta?',
        texto: 'O que você escreveu continua guardado no servidor. É só entrar de novo.',
        acao: 'Sair',
      });
      if (!certo) return;
      await fetch('api/sair', { method: 'POST' }).catch(() => {});
      CC.zerarLocal();
      location.reload();
    });
  };

  // ---------- textos bíblicos ----------
  // As licenças das traduções pedem o crédito à vista; ele aparece também no fim de cada leitura.
  CC.vistaTextos = function (raiz) {
    const biblias = CC.biblias();
    const atual = CC.traducao();
    raiz.innerHTML = CC.botaoVoltar('Configurações')
      + '<h1>Textos bíblicos</h1>'
      + (atual
        ? '<div class="opcoes-traducao">' + biblias.map((b) => '<button class="opcao-traducao" data-traducao="'
          + CC.esc(b.sigla) + '" aria-pressed="' + (b.sigla === atual.sigla) + '"><b>'
          + CC.esc(b.nome.replace(/Biblica® Open |™/g, '')) + '</b><span>' + CC.esc(b.resumo) + '</span></button>').join('')
          + '</div><p class="passo-dica">A escolha vale para este aparelho.</p>'
          + biblias.map((b) => '<div class="credito-biblia"><b>' + CC.esc(b.nome) + '</b>'
            + b.credito.map((l) => '<p>' + CC.esc(l) + '</p>').join('')
            + '<p><a href="' + CC.esc(b.licencaUrl) + '" target="_blank" rel="noopener">Licença ' + CC.esc(b.licenca) + '</a></p></div>').join('')
        : '<div class="vazio">Este aplicativo foi gerado sem traduções.</div>');
    raiz.querySelectorAll('[data-traducao]').forEach((el) => {
      el.onclick = () => { CC.escolherTraducao(el.dataset.traducao); CC.redesenhar(); };
    });
  };

  // ---------- completar cadastro ----------
  // Contas antigas entram sem e-mail e sem data de nascimento. A leitura continua
  // liberada, mas amigos e convites esperam até completar.
  CC.completarCadastro = function (quem, depois) {
    return new Promise((resolver) => {
      CC.folha('<p class="fala-bento pequena">Oi' + (quem.nome ? ', ' + CC.esc(quem.nome) : '')
        + '! Faltam só dois detalhes.</p>'
        + '<p class="passo-dica">Seu progresso está guardado.</p>'
        + '<label class="campo-senha"><span>E-mail</span><input type="email" id="cad-email" autocomplete="email" value="' + CC.esc(quem.email || '') + '"></label>'
        + '<label class="campo-senha"><span>Data de nascimento</span><input type="date" id="cad-nasc" value="' + CC.esc(quem.nascimento || '') + '"></label>'
        + '<p class="recado-senha" id="recado" role="alert"></p>'
        + '<div class="acoes"><button class="botao" data-salvar>Salvar e continuar</button>'
        + '<button class="botao plano" data-depois>Agora não</button></div>',
      {
        rotulo: 'Completar cadastro',
        presa: true,
        ligar: (folha, fechar) => {
          const recado = folha.querySelector('#recado');
          const botao = folha.querySelector('[data-salvar]');
          folha.querySelector('[data-depois]').onclick = () => { fechar(); resolver(false); };
          botao.onclick = async () => {
            recado.textContent = '';
            botao.disabled = true;
            try {
              await CC.api('api/perfil', {
                email: folha.querySelector('#cad-email').value,
                nascimento: folha.querySelector('#cad-nasc').value,
              });
              if (CC.quem) {
                CC.quem.perfilCompleto = true;
                CC.quem.email = folha.querySelector('#cad-email').value.trim().toLowerCase();
                CC.quem.nascimento = folha.querySelector('#cad-nasc').value;
              }
              fechar();
              CC.avisar('Cadastro completo!');
              if (CC.carregarAmigos) CC.carregarAmigos().then(() => CC.redesenhar());
              resolver(true);
              if (depois) depois();
            } catch (e) {
              botao.disabled = false;
              recado.textContent = e.message;
            }
          };
        },
      });
    });
  };

  // ---------- trocar a senha ----------
  const campo = (id, rotulo, dica) =>
    '<label class="campo-senha"><span>' + CC.esc(rotulo) + '</span>'
    + '<input type="password" id="' + id + '" autocomplete="' + (dica || 'off') + '"></label>';

  CC.trocarSenha = function () {
    CC.folha('<h3>Trocar a senha</h3>'
      + '<p class="passo-dica">Os outros aparelhos onde você entrou vão pedir a senha de novo. Este aqui continua aberto.</p>'
      + campo('senha-atual', 'Senha atual', 'current-password')
      + campo('senha-nova', 'Senha nova', 'new-password')
      + campo('senha-repete', 'Repita a senha nova', 'new-password')
      + '<p class="recado-senha" id="recado" role="alert"></p>'
      + '<div class="acoes"><button class="botao" data-trocar>Trocar a senha</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Trocar a senha',
      ligar: (folha, fechar) => {
        const recado = folha.querySelector('#recado');
        const botao = folha.querySelector('[data-trocar]');
        folha.querySelector('[data-fechar]').onclick = fechar;
        const dizer = (t) => { recado.textContent = t; };
        botao.onclick = async () => {
          const nova = folha.querySelector('#senha-nova').value;
          dizer('');
          if (nova.length < 8) { dizer('A senha nova precisa de 8 caracteres ou mais.'); return; }
          if (nova !== folha.querySelector('#senha-repete').value) { dizer('As duas senhas novas não são iguais.'); return; }
          botao.disabled = true;
          try {
            await CC.api('api/trocar-senha', { atual: folha.querySelector('#senha-atual').value, nova });
            fechar();
            CC.avisar('Senha trocada');
          } catch (e) {
            botao.disabled = false;
            dizer(e.message);
          }
        };
      },
    });
  };

  // ---------- apagar a conta ----------
  CC.apagarConta = async function (usuario) {
    const certo = await CC.confirmar({
      titulo: 'Apagar a sua conta?',
      texto: 'Some tudo: progresso, ofensiva, propósitos, registros e orações, junto com as cópias do servidor. '
        + 'Não há como desfazer. Se quiser ficar com o que escreveu, baixe antes.',
      acao: 'Quero apagar',
      perigo: true,
    });
    if (!certo) return;
    CC.folha('<h3>Apagar a conta de @' + CC.esc(usuario) + '</h3>'
      + '<p class="passo-dica">Digite a sua senha para confirmar.</p>'
      + campo('senha-apaga', 'Sua senha', 'current-password')
      + '<p class="recado-senha" id="recado" role="alert"></p>'
      + '<div class="acoes"><button class="botao vermelho" data-apagar>Apagar para sempre</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Apagar a conta',
      ligar: (folha, fechar) => {
        const recado = folha.querySelector('#recado');
        const botao = folha.querySelector('[data-apagar]');
        folha.querySelector('[data-fechar]').onclick = fechar;
        botao.onclick = async () => {
          recado.textContent = '';
          botao.disabled = true;
          try {
            await CC.api('api/apagar-conta', { senha: folha.querySelector('#senha-apaga').value });
            CC.zerarLocal();
            location.reload();
          } catch (e) {
            botao.disabled = false;
            recado.textContent = e.message;
          }
        };
      },
    });
  };
})(window.CC);
