/* Configurações e conta: aparência, leitura, privacidade, seus dados e o que mexe em
   quem você é dentro do aplicativo. Também o cadastro que faltava nas contas antigas. */
(function (CC) {
  'use strict';

  const D = CC.D;
  const dataBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  // Data digitada (dd/mm/aaaa) no lugar do calendário do aparelho, que no Android obriga a
  // voltar ano por ano. As barras entram sozinhas; dataIso devolve '' se a data não existe.
  // A data vai em campos (dia, mês, ano): a barra, o traço ou o ponto digitado fecha o campo,
  // e dia ou mês de um dígito ganham o zero ("1/3/2000" vira 01/03/2000). Sem separador, o
  // campo fecha ao completar. (O mesmo em src/entrar.html.)
  const mascaraData = (v) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const campos = [];
    const limites = [2, 2, 4];
    let atual = '';
    let barraNoFim = false;
    for (const c of v) {
      if (campos.length >= 3) break;
      if (c >= '0' && c <= '9') {
        atual += c;
        barraNoFim = false;
        if (atual.length === limites[campos.length]) { campos.push(atual); atual = ''; }
      } else if (/[/.\-\s]/.test(c)) {
        if (atual) { campos.push(campos.length < 2 ? atual.padStart(2, '0') : atual); atual = ''; }
        barraNoFim = true;
      }
    }
    if (atual && campos.length < 3) campos.push(atual);
    return campos.join('/') + (barraNoFim && campos.length && campos.length < 3 ? '/' : '');
  };
  // Remascara só com o cursor no fim; editando no meio, o texto e o cursor ficam como estão e
  // a máscara volta ao sair do campo (antes, apagar o 5 de 15/03/2000 dava 10/32/000).
  const mascararCampo = (campo, sempre) => {
    const v = campo.value;
    const fim = campo.selectionStart === null || (campo.selectionStart === v.length && campo.selectionEnd === v.length);
    if (!sempre && !fim) return;
    const novo = mascaraData(v);
    if (novo !== v) campo.value = novo;
  };
  const dataIso = (bruto) => {
    const v = mascaraData(String(bruto || '').trim());
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) || /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
    if (!m) return '';
    const iso = m[1].length === 4 ? m[1] + '-' + m[2] + '-' + m[3] : m[3] + '-' + m[2] + '-' + m[1];
    const d = new Date(iso + 'T12:00:00Z');
    return !isNaN(d) && d.toISOString().slice(0, 10) === iso && iso >= '1900-01-01' ? iso : '';
  };

  const linha = (rotulo, valor, atributos, classe) => '<button class="linha-config' + (classe ? ' ' + classe : '') + '" ' + (atributos || '') + '>'
    + '<span>' + CC.esc(rotulo) + '</span>' + (valor ? '<span class="valor">' + CC.esc(valor) + '</span>' : '')
    + CC.ico('avancar') + '</button>';
  const grupo = (titulo, dentro) => '<section class="grupo-config"><h2 class="etiqueta">' + CC.esc(titulo) + '</h2>'
    + '<div class="caixa-config">' + dentro + '</div></section>';

  // A data de nascimento não muda depois do cadastro (o servidor recusa): aparece só para
  // leitura, com o caminho para corrigir um erro de digitação.
  const SUPORTE = 'suporte@geracaoeleita.app';
  const dicaNascimento = '<span class="dica-linha">Para corrigir, fale com o <a href="mailto:' + SUPORTE + '">suporte</a></span>';
  const linhaNascimento = (nascimento) => (nascimento
    ? '<div class="linha-config sem-toque so-leitura" data-nascimento><span>Nascimento</span><span class="valor">' + CC.esc(dataBr(nascimento)) + '</span>' + dicaNascimento + '</div>'
    : '<div class="linha-config sem-toque"><span>Nascimento</span><span class="valor">falta completar</span></div>');

  CC.vistaConfig = function (raiz) {
    const quem = CC.quem || {};
    const tema = CC.temaGuardado();
    const traducao = CC.traducao();

    // .folha-perfil: só apresentação, a folha do alto das telas deste grupo (25-perfil.css).
    raiz.innerHTML = '<div class="folha-perfil">' + CC.botaoVoltar('Perfil')
      + '<h1>Configurações</h1></div>'
      + grupo('Aparência', '<div class="linha-config sem-toque"><span>Tema</span>'
        + '<div class="segmentado" role="group" aria-label="Tema">'
        + [['Sistema', null], ['Claro', false], ['Escuro', true]].map(([rot, v]) =>
          '<button data-tema="' + JSON.stringify(v) + '" aria-pressed="' + (tema === v) + '">' + rot + '</button>').join('')
        + '</div></div>')
      + grupo('Leitura', linha('Tradução e créditos', traducao ? traducao.abreviatura : '', 'data-ir="#/config/textos"'))
      + grupo('Seu caminho', linha('Seu caminho',
        quem.caminho === 'conhecer' ? 'Conhecer Jesus' : 'Plano da Bíblia em um ano', 'data-caminho'))
      + grupo('Notificações', linha('Lembretes e avisos', CC.resumoNotificacoes(), 'data-ir="#/config/notificacoes"'))
      + grupo('Privacidade', (quem.comSenha
        ? '<button class="linha-config" data-mural role="switch" aria-checked="' + !!(CC.novidadesEmCache() || {}).ligado + '">'
          + '<span>Mostrar meus marcos no Juntos</span><span class="interruptor" aria-hidden="true"><i></i></span></button>'
        : '')
        + linha('Pessoas bloqueadas', '', 'data-ir="#/amigos/bloqueados"')
        + linha('Privacidade', '', 'data-privacidade')
        + linha('Termos de Uso', '', 'data-termos'))
      + grupo('Seus dados', linha('Baixar o que escrevi', '', 'data-exportar')
        + linha('Zerar progresso', '', 'data-zerar', 'perigo'))
      + (quem.comSenha
        ? grupo('Conta', '<div class="linha-config sem-toque"><span>@usuário</span><span class="valor">@' + CC.esc(quem.usuario) + '</span></div>'
          + (quem.email ? linha('E-mail', quem.email, 'data-email')
            : '<div class="linha-config sem-toque"><span>E-mail</span><span class="valor">falta completar</span></div>')
          + linhaNascimento(quem.nascimento)
          + (quem.perfilCompleto ? '' : linha('Completar cadastro', '', 'data-completar'))
          + linha('Trocar a senha', '', 'data-senha')
          + linha('Sair dos outros aparelhos', '', 'data-sair-outros')
          + linha('Sair desta conta', '', 'data-sair')
          + linha('Apagar a conta', '', 'data-apagar', 'perigo'))
        : '');

    raiz.querySelectorAll('[data-ir]').forEach((el) => { el.onclick = () => { location.hash = el.dataset.ir; }; });
    raiz.querySelectorAll('[data-tema]').forEach((b) => {
      b.onclick = () => { CC.guardarTema(JSON.parse(b.dataset.tema)); CC.redesenhar(); };
    });
    raiz.querySelector('[data-exportar]').onclick = () => CC.exportarComAviso();
    raiz.querySelector('[data-zerar]').onclick = async () => {
      const certo = await CC.confirmar({
        titulo: 'Recomeçar a trilha do zero?',
        texto: 'Apaga, em todos os aparelhos, as leituras marcadas do plano, os primeiros passos, os dias do Conhecer Jesus, a ofensiva, o XP, as conquistas, os baús, os desafios do dia e a prática. '
          + 'Ficam sua foto e seu nome, as reflexões, anotações e notas, as marcações nos versículos, a Minha história com Deus, os desafios de vários dias, os amigos e a célula.',
        acao: 'Zerar a trilha',
        perigo: true,
      });
      if (!certo) return;
      CC.zerarProgresso();
      CC.avisar('Trilha recomeçada');
      CC.redesenhar();
    };
    const ligar = (sel, fn) => { const el = raiz.querySelector(sel); if (el) el.onclick = fn; };
    ligar('[data-mural]', async () => {
      const agora = !((CC.novidadesEmCache() || {}).ligado);
      try {
        await CC.preferirNovidades(agora);
        CC.avisar(agora ? 'Seus amigos vão ver seus marcos' : 'Seus marcos saíram do Juntos');
      } catch (e) { CC.avisar(e.message); }
      await CC.carregarNovidades();
      CC.redesenhar();
    });
    ligar('[data-privacidade]', () => CC.abrirPrivacidade(quem));
    ligar('[data-termos]', () => window.open('termos.html', '_blank', 'noopener'));
    ligar('[data-caminho]', () => folhaSeuCaminho(quem));
    ligar('[data-completar]', () => CC.completarCadastro(quem));
    ligar('[data-senha]', () => CC.trocarSenha());
    ligar('[data-email]', () => trocarEmail(quem));
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
      // Sem o #/config: quem entra de novo (ou outra pessoa no mesmo aparelho) começa pela
      // trilha, e não nas Configurações de onde a outra saiu.
      location.replace('./');
    });
  };

  // ---------- seu caminho ----------
  // Troca entre o plano da Bíblia em um ano e o Conhecer Jesus, os dois únicos caminhos que
  // a conta pode seguir. Quem termina o Conhecer Jesus já vê esta troca oferecida lá mesmo;
  // aqui é para quem muda de ideia a qualquer momento.
  function folhaSeuCaminho(quem) {
    const atual = quem.caminho === 'conhecer' ? 'conhecer' : 'plano';
    CC.folha('<h2>Seu caminho</h2>'
      + '<div class="acoes">'
      + '<button class="botao ' + (atual === 'plano' ? 'azul' : 'contorno') + '" data-caminho-opcao="plano">Plano da Bíblia em um ano</button>'
      + '<button class="botao ' + (atual === 'conhecer' ? 'azul' : 'contorno') + '" data-caminho-opcao="conhecer">Conhecer Jesus</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button>'
      + '</div>',
    {
      rotulo: 'Seu caminho', classe: 'folha-conta',
      ligar: (folha, fechar) => {
        folha.querySelector('[data-fechar]').onclick = fechar;
        folha.querySelectorAll('[data-caminho-opcao]').forEach((b) => {
          b.onclick = async () => {
            const novo = b.dataset.caminhoOpcao;
            if (novo === atual) { fechar(); return; }
            b.disabled = true;
            try {
              await CC.api('api/caminho', { caminho: novo });
              if (CC.quem) CC.quem.caminho = novo;
              fechar();
              CC.redesenhar();
            } catch (e) {
              b.disabled = false;
              CC.avisar(e.message);
            }
          };
        });
      },
    });
  }

  // ---------- textos bíblicos ----------
  // As licenças das traduções pedem o crédito à vista; ele aparece também no fim de cada leitura.
  CC.vistaTextos = function (raiz) {
    const biblias = CC.biblias();
    const atual = CC.traducao();
    raiz.innerHTML = '<div class="folha-perfil">' + CC.botaoVoltar('Configurações')
      + '<h1>Textos bíblicos</h1></div>'
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
        + (quem.email
          ? '<div class="campo-senha so-leitura"><span>E-mail</span><b id="cad-email-fixo">' + CC.esc(quem.email) + '</b></div>'
          : '<label class="campo-senha"><span>E-mail</span><input type="email" id="cad-email" autocomplete="email"></label>')
        + (quem.nascimento
          ? '<div class="campo-senha so-leitura" data-nascimento><span>Data de nascimento</span><b>' + CC.esc(dataBr(quem.nascimento)) + '</b>' + dicaNascimento + '</div>'
          : '<label class="campo-senha"><span>Data de nascimento</span><input type="text" id="cad-nasc" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" autocomplete="bday"></label>')
        + '<p class="recado-senha" id="recado" role="alert"></p>'
        + '<div class="acoes"><button class="botao" data-salvar>Salvar e continuar</button>'
        + '<button class="botao plano" data-depois>Agora não</button></div>',
      {
        rotulo: 'Completar cadastro', classe: 'folha-conta',
        presa: true,
        ligar: (folha, fechar) => {
          const recado = folha.querySelector('#recado');
          const botao = folha.querySelector('[data-salvar]');
          const nasc = folha.querySelector('#cad-nasc');
          if (nasc) {
            nasc.oninput = () => mascararCampo(nasc, false);
            nasc.onchange = () => mascararCampo(nasc, true);
          }
          folha.querySelector('[data-depois]').onclick = () => { fechar(); resolver(false); };
          botao.onclick = async () => {
            recado.textContent = '';
            botao.disabled = true;
            try {
              const campoEmail = folha.querySelector('#cad-email');
              const campoNasc = folha.querySelector('#cad-nasc');
              const email = campoEmail ? campoEmail.value.trim().toLowerCase() : quem.email;
              const nascimento = campoNasc ? dataIso(campoNasc.value) : quem.nascimento;
              if (campoNasc && !nascimento) throw new Error('Confira a data de nascimento (dd/mm/aaaa).');
              await CC.api('api/perfil', { email, nascimento });
              if (CC.quem) {
                CC.quem.perfilCompleto = true;
                CC.quem.email = email;
                CC.quem.nascimento = nascimento;
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

  // ---------- trocar o e-mail ----------
  // Pede a senha atual: com a sessão de outra pessoa nas mãos, trocar o e-mail e depois pedir
  // nova senha tomaria a conta.
  function trocarEmail(quem) {
    CC.folha('<h3>Trocar o e-mail</h3>'
      + '<p class="passo-dica">Hoje: ' + CC.esc(quem.email || '') + '</p>'
      + '<label class="campo-senha"><span>Novo e-mail</span><input type="email" id="novo-email" autocomplete="email"></label>'
      + campo('email-senha', 'Sua senha atual', 'current-password')
      + '<p class="recado-senha" id="recado" role="alert"></p>'
      + '<div class="acoes"><button class="botao" data-salvar>Trocar o e-mail</button>'
      + '<button class="botao plano" data-fechar>Cancelar</button></div>',
    {
      rotulo: 'Trocar o e-mail', classe: 'folha-conta',
      ligar: (folha, fechar) => {
        const recado = folha.querySelector('#recado');
        const botao = folha.querySelector('[data-salvar]');
        folha.querySelector('[data-fechar]').onclick = fechar;
        botao.onclick = async () => {
          recado.textContent = '';
          const email = folha.querySelector('#novo-email').value.trim().toLowerCase();
          const senhaAtual = folha.querySelector('#email-senha').value;
          if (!email) { recado.textContent = 'Escreva o novo e-mail.'; return; }
          if (!senhaAtual) { recado.textContent = 'Digite a sua senha atual.'; return; }
          botao.disabled = true;
          try {
            await CC.api('api/perfil', { email, senhaAtual });
            if (CC.quem) CC.quem.email = email;
            fechar();
            CC.avisar('E-mail trocado');
            CC.redesenhar();
          } catch (e) {
            botao.disabled = false;
            recado.textContent = e.message;
          }
        };
      },
    });
  }

  // ---------- consentimento sobre dado de fé (LGPD art. 11) ----------
  // O mesmo texto do portal de entrada (src/entrar.html): leitura, anotação e participação
  // em grupo de leitura e oração são dado sensível, e pedem um "sim" claro, não escondido
  // em letra miúda.
  // Versão 3 do texto (CONSENTIMENTO_VERSAO em contas.mjs): quem já tinha conta vê a folha de novo.
  const TEXTO_CONSENTIMENTO = 'Concordo que o Geração Eleita guarde minhas leituras, anotações, check-ins e a minha '
    + 'participação em grupos de leitura e oração. São informações sobre a minha fé. Só eu decido o que '
    + 'meus amigos e quem me acompanha no Discipulado veem; quem conduz a minha célula e a administração da igreja veem como estou caminhando '
    + '(leitura, presença, etapa de Minha caminhada) e o check-in só somado com o dos outros, nunca o que eu escrevo.';
  const LINK_PRIVACIDADE = '<a href="privacidade.html" target="_blank" rel="noopener">Ler a política de privacidade</a>';

  // Folha presa (sem fechar tocando fora) que a abertura do app mostra antes de tudo para
  // quem tem conta e ainda não concordou. Só depois dela o convite, a célula e o cadastro
  // seguem o caminho de sempre.
  CC.pedirConsentimento = function () {
    return new Promise((resolver) => {
      CC.folha('', {
        rotulo: 'Seus dados', classe: 'folha-conta',
        presa: true,
        ligar: (folha, fechar) => {
          const telaConcordar = () => {
            folha.innerHTML = '<h3>Antes de continuar</h3>'
              + '<p class="passo-dica">' + CC.esc(TEXTO_CONSENTIMENTO) + '</p>'
              + '<p>' + LINK_PRIVACIDADE + '</p>'
              + '<p class="recado-senha" id="recado" role="alert"></p>'
              + '<div class="acoes"><button class="botao" data-concordar>Concordo</button>'
              + '<button class="botao plano" data-nao-concordo>Não concordo</button></div>';
            const recado = folha.querySelector('#recado');
            const botao = folha.querySelector('[data-concordar]');
            botao.onclick = async () => {
              recado.textContent = '';
              botao.disabled = true;
              try {
                await CC.api('api/consentimento', {});
                if (CC.quem) CC.quem.consentimento = true;
                fechar();
                resolver(true);
              } catch (e) {
                botao.disabled = false;
                recado.textContent = e.message;
              }
            };
            folha.querySelector('[data-nao-concordo]').onclick = telaRecusar;
          };
          const telaRecusar = () => {
            folha.innerHTML = '<h3>Antes de continuar</h3>'
              + '<p class="passo-dica">Sem esse consentimento, não dá para guardar sua leitura na conta. '
              + 'Você pode apagar a conta e tudo o que ela guarda.</p>'
              + '<div class="acoes"><button class="botao vermelho" data-apagar>Apagar minha conta</button>'
              + '<button class="botao plano" data-voltar>Voltar</button></div>';
            folha.querySelector('[data-apagar]').onclick = () => { fechar(); location.hash = '#/config'; };
            folha.querySelector('[data-voltar]').onclick = telaConcordar;
          };
          telaConcordar();
        },
      });
    });
  };

  // Item "Privacidade" das Configurações: quando concordou, um jeito de rever a política e
  // de saber que retirar o consentimento é apagar a conta (não dá para guardar leitura de
  // fé sem concordar, e não dá para "meio guardar").
  CC.abrirPrivacidade = function (quem) {
    const dataConsentimento = quem && quem.comSenha && quem.consentimentoEm ? dataBr(String(quem.consentimentoEm).slice(0, 10)) : '';
    CC.folha('<h3>Privacidade</h3>' + (dataConsentimento ? '<p class="passo-dica">Você concordou em ' + CC.esc(dataConsentimento) + '.</p>' : '')
      + '<p>' + LINK_PRIVACIDADE + '</p>'
      + '<p><a href="termos.html" target="_blank" rel="noopener">Ler os Termos de Uso</a></p>'
      + '<p class="passo-dica">Dúvidas ou problemas: <a href="mailto:suporte@geracaoeleita.app">suporte@geracaoeleita.app</a></p>'
      + (quem && quem.comSenha
        ? '<h3>Retirar o consentimento</h3>'
          + '<p class="passo-dica">O app só guarda leitura, anotação e participação em grupo com o seu consentimento. '
          + 'Dá para retirar partes sem apagar a conta (marcos no Juntos, o que o Discipulado vê, sair de uma célula). '
          + 'Retirar o consentimento inteiro é apagar a conta, como explica a política.</p>'
          + '<div class="acoes"><button class="botao plano perigo" data-apagar>Apagar a conta</button></div>'
        : ''),
    {
      rotulo: 'Privacidade', classe: 'folha-conta',
      ligar: (folha, fechar) => {
        const apagar = folha.querySelector('[data-apagar]');
        if (apagar) apagar.onclick = () => { fechar(); CC.apagarConta(quem.usuario); };
      },
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
      rotulo: 'Trocar a senha', classe: 'folha-conta',
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
      rotulo: 'Apagar a conta', classe: 'folha-conta',
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
