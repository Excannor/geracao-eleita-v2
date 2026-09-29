// Envio de e-mail por SMTP com TLS direto (porta 465), sem dependência npm. Desligado até
// alguém configurar: sem CAMINHO_SMTP_HOST, o app não tenta mandar nada, e a recuperação de
// senha segue pelo painel do dono (link gerado lá e mandado à mão).
//
// Com uma conta Gmail: ative a verificação em duas etapas, crie uma "senha de app" e ponha no
// .env desta pasta (que o git ignora):
//   CAMINHO_SMTP_HOST=smtp.gmail.com
//   CAMINHO_SMTP_USUARIO=conta@gmail.com
//   CAMINHO_SMTP_SENHA=<senha de app, 16 letras>
//   CAMINHO_SMTP_DE=Geração Eleita <conta@gmail.com>     (opcional)
import { connect } from 'node:tls';

export function configDoEmail(env = process.env) {
  const host = String(env.CAMINHO_SMTP_HOST || '').trim();
  if (!host) return null;
  const usuario = String(env.CAMINHO_SMTP_USUARIO || '').trim();
  return {
    host,
    porta: Number(env.CAMINHO_SMTP_PORTA) || 465,
    usuario,
    senha: String(env.CAMINHO_SMTP_SENHA || ''),
    de: String(env.CAMINHO_SMTP_DE || '').trim() || 'Geração Eleita <' + usuario + '>',
  };
}

const b64 = (t) => Buffer.from(String(t), 'utf8').toString('base64');
const enderecoDe = (t) => (String(t).match(/<([^>]+)>/) || [, String(t)])[1].trim();
// Cabeçalho com acento vai codificado (RFC 2047); o nome de quem manda também.
const cabecalho = (t) => (/^[\x20-\x7e]*$/.test(t) ? t : '=?UTF-8?B?' + b64(t) + '?=');
const remetente = (t) => {
  const m = String(t).match(/^(.*?)\s*<([^>]+)>$/);
  return m ? cabecalho(m[1].trim()) + ' <' + m[2] + '>' : t;
};

export function montarMensagem({ de, para, assunto, texto }) {
  const corpo = b64(texto).replace(/.{1,76}/g, '$&\r\n');
  return [
    'From: ' + remetente(de),
    'To: ' + para,
    'Subject: ' + cabecalho(assunto),
    'Date: ' + new Date().toUTCString(),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    corpo,
  ].join('\r\n');
}

export function enviarEmail(config, { para, assunto, texto }, { tempo = 20000 } = {}) {
  return new Promise((resolver, rejeitar) => {
    const s = connect({ host: config.host, port: config.porta, servername: config.host });
    let buffer = '';
    let esperando = null;
    const falhar = (e) => { s.destroy(); rejeitar(e instanceof Error ? e : new Error(String(e))); };
    const relogio = setTimeout(() => falhar(new Error('o servidor de e-mail não respondeu')), tempo);
    s.setEncoding('utf8');
    s.on('error', falhar);
    s.on('data', (pedaco) => {
      buffer += pedaco;
      // Resposta completa: a última linha tem "NNN " (espaço), e não "NNN-" (continua).
      const linhas = buffer.split('\r\n').filter(Boolean);
      const ultima = linhas.at(-1) || '';
      if (!buffer.endsWith('\r\n') || !/^\d{3} /.test(ultima)) return;
      buffer = '';
      if (esperando) { const f = esperando; esperando = null; f(Number(ultima.slice(0, 3)), linhas.join(' | ')); }
    });
    const resposta = () => new Promise((r) => { esperando = (codigo, texto) => r({ codigo, texto }); });
    const passo = async (comando, espera) => {
      const vem = resposta();
      if (comando !== null) s.write(comando + '\r\n');
      const { codigo, texto } = await vem;
      if (codigo !== espera) throw new Error('SMTP recusou (' + (comando || 'conexão').split(' ')[0] + '): ' + texto);
    };
    (async () => {
      await passo(null, 220);
      await passo('EHLO geracao-eleita', 250);
      await passo('AUTH LOGIN', 334);
      await passo(b64(config.usuario), 334);
      await passo(b64(config.senha), 235);
      await passo('MAIL FROM:<' + enderecoDe(config.de) + '>', 250);
      await passo('RCPT TO:<' + para + '>', 250);
      await passo('DATA', 354);
      await passo(montarMensagem({ de: config.de, para, assunto, texto }) + '\r\n.', 250);
      s.write('QUIT\r\n');
      s.end();
      clearTimeout(relogio);
      resolver(true);
    })().catch((e) => { clearTimeout(relogio); falhar(e); });
  });
}
