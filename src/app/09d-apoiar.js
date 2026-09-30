// Apoiar o app: doação opcional pelo Pix, a partir do Mais. Sem meta, sem lista de quem
// doou, sem selo e sem lembrete: doar não pode virar cobrança nem comparação.
(function () {
  const PIX = {
    chave: '009f5d33-a220-4a2a-ac28-47df02fed6a9',
    nome: 'MARCOS E DE S BARBOSA',
    cidade: 'BETIM',
    // abreviado no código (o padrão limita a 25 letras) e na tela
    exibido: 'Marcos E. de S. Barbosa',
  };
  const VALORES = [5, 10, 20];

  // Código "copia e cola" do Pix (padrão EMV do Banco Central), com o valor já preenchido.
  const campo = (id, valor) => id + String(valor.length).padStart(2, '0') + valor;
  function crc16(texto) {
    let crc = 0xffff;
    for (let i = 0; i < texto.length; i++) {
      crc ^= texto.charCodeAt(i) << 8;
      for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  CC.codigoPix = function (valor) {
    const corpo = campo('00', '01') + campo('01', '11')
      + campo('26', campo('00', 'br.gov.bcb.pix') + campo('01', PIX.chave))
      + campo('52', '0000') + campo('53', '986')
      + (valor ? campo('54', valor.toFixed(2)) : '')
      + campo('58', 'BR') + campo('59', PIX.nome) + campo('60', PIX.cidade)
      + campo('62', campo('05', '***'))
      + '6304';
    return corpo + crc16(corpo);
  };

  const reais = (v) => 'R$ ' + (Number.isInteger(v) ? v : v.toFixed(2).replace('.', ','));

  function qrPix(codigo) {
    try {
      const q = qrcode(0, 'M');
      q.addData(codigo);
      q.make();
      return '<div class="qr-convite" role="img" aria-label="QR Code do Pix">' + q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) + '</div>';
    } catch (e) {
      return '';
    }
  }

  CC.vistaApoiar = function (raiz) {
    let valor = 10;
    // .folha-perfil: só apresentação, a folha do alto (25-perfil.css); o título longo desce
    // para baixo do voltar (.titulo-frase).
    raiz.innerHTML = '<div class="folha-perfil titulo-frase">' + CC.botaoVoltar('Voltar')
      + '<h1>Ajude a manter o app</h1>'
      + '<p>O Geração Eleita é gratuito, sem anúncios, e não vende seus dados. Quem mantém são voluntários da igreja.</p>'
      + '<p class="passo-dica">Doar é opcional. O app continua completo para todo mundo, doando ou não.</p></div>'
      + CC.tituloSecao('Para onde vai')
      + '<div class="caixa-lista apoiar-lista">'
      + ['Domínio, servidor e energia', 'Cópia de segurança dos dados', 'Estudo bíblico para escrever os textos',
        'Revisão de cada texto na Bíblia', 'Melhorias e funções novas'].map((t) => '<div class="apoiar-item">' + CC.esc(t) + '</div>').join('')
      + '</div>'
      + '<p class="passo-dica">Por trás de cada lição há horas de estudo, revisão e programação. A sua doação ajuda a manter esse tempo.</p>'
      + CC.tituloSecao('Doar pelo Pix')
      + '<div class="apoiar-pix">'
      + '<div class="apoiar-valores" role="radiogroup" aria-label="Valor">'
      + VALORES.map((v) => '<button class="apoiar-valor" role="radio" data-valor="' + v + '">' + reais(v) + '</button>').join('')
      + '<button class="apoiar-valor" role="radio" data-valor="0">Outro</button></div>'
      + '<div class="acoes"><button class="botao" data-copiar-pix>Copiar código Pix</button>'
      + '<button class="botao contorno pequeno" data-qr-pix>Mostrar QR Code</button></div>'
      + '<p class="passo-dica pequena">Quem recebe: ' + CC.esc(PIX.exibido) + '. Com "Outro", você escolhe o valor no app do banco.</p>'
      + '</div>'
      + '<p class="aviso-apoiar">Se você tem menos de 18 anos, converse com seus pais ou responsáveis antes de doar.</p>';

    const marcar = () => raiz.querySelectorAll('[data-valor]').forEach((b) => {
      const sel = Number(b.dataset.valor) === valor;
      b.classList.toggle('sel', sel);
      b.setAttribute('aria-checked', String(sel));
    });
    marcar();
    raiz.querySelectorAll('[data-valor]').forEach((b) => {
      b.onclick = () => { valor = Number(b.dataset.valor); marcar(); CC.vibrar('leve'); };
    });

    const rotulo = () => (valor ? 'de ' + reais(valor) + ' ' : '');
    raiz.querySelector('[data-copiar-pix]').onclick = async () => {
      const codigo = CC.codigoPix(valor);
      if (!(await CC.copiar(codigo))) { CC.avisar('Não consegui copiar'); return; }
      CC.folha('<h3>Obrigado de coração</h3>'
        + '<p>O código Pix ' + rotulo() + 'foi copiado. Abra o app do seu banco, escolha "Pix copia e cola" e cole.</p>'
        + '<p class="passo-dica">"Cada um deve resolver por si mesmo quanto vai dar. Não forcem ninguém a dar mais do que realmente deseja, pois Deus ama os que dão com alegria." <span class="ref-frase">2\u00a0Coríntios 9.7</span></p>'
        + '<div class="acoes"><button class="botao" data-fechar>Voltar ao app</button></div>', { rotulo: 'Obrigado', classe: 'folha-conta', ligar: (folha, fechar) => { folha.querySelector('[data-fechar]').onclick = fechar; } });
    };
    raiz.querySelector('[data-qr-pix]').onclick = () => {
      CC.folha('<h3>Pix ' + (valor ? reais(valor) : '') + '</h3>' + qrPix(CC.codigoPix(valor))
        + '<p class="passo-dica pequena qr-legenda">Aponte a câmera do app do banco, em outro celular, para o código.</p>'
        + '<div class="acoes"><button class="botao contorno" data-fechar>Fechar</button></div>', { rotulo: 'QR Code do Pix', classe: 'folha-conta', ligar: (folha, fechar) => { folha.querySelector('[data-fechar]').onclick = fechar; } });
    };
  };
})();
