// Notificações: Web Push de verdade, sem dependência nenhuma.
//
// Três partes:
//   1. o envio: assinatura VAPID (RFC 8292) e o conteúdo criptografado (RFC 8291), com o
//      crypto que já vem no Node. O serviço de push do Google, da Apple ou da Mozilla só
//      repassa bytes que não consegue ler;
//   2. as regras de quando avisar, numa função pura que os testes exercitam hora a hora;
//   3. o banco de mensagens, em linguagem de gente, sem culpa e sem cobrança.
//
// O combinado para não virar chatice: no máximo 3 automáticas por dia (manhã, meio-dia e
// noite), silêncio das 22h30 às 7h, nada depois que a pessoa leu, e quem sumiu recebe
// avisos leves, diários no começo e cada vez mais espaçados. Toque de amigo tem teto próprio.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  createECDH, createHmac, createCipheriv, createPrivateKey, generateKeyPairSync, randomBytes, sign, createHash,
} from 'node:crypto';
import { abrirModulo, concluirImportacao, lerTabela, sincronizar } from './db.mjs';

// ---------------------------------------------------------------- envio
const hmac = (chave, dado) => createHmac('sha256', chave).update(dado).digest();
const b64 = (x) => Buffer.from(x).toString('base64url');

export function gerarChaves() {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const privada = privateKey.export({ format: 'jwk' });
  const publica = Buffer.concat([Buffer.from([4]), Buffer.from(privada.x, 'base64url'), Buffer.from(privada.y, 'base64url')]);
  return { publica: publica.toString('base64url'), privada };
}

// O cabeçalho que prova ao serviço de push que é este servidor quem manda. `contato` é
// um endereço https do app: a Apple exige um, e ele não expõe o e-mail de ninguém.
export function autorizacaoVapid(endpoint, chaves, contato, agora = Date.now()) {
  const cabecalho = b64(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const corpo = b64(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(agora / 1000) + 12 * 3600, sub: contato }));
  const dado = cabecalho + '.' + corpo;
  const assinatura = sign('sha256', Buffer.from(dado), {
    key: createPrivateKey({ key: chaves.privada, format: 'jwk' }), dsaEncoding: 'ieee-p1363',
  });
  return 'vapid t=' + dado + '.' + assinatura.toString('base64url') + ', k=' + chaves.publica;
}

// RFC 8291 com o formato aes128gcm da RFC 8188, num único registro. `teste` fixa o sal e
// a chave do servidor, só para conferir contra o vetor da RFC.
export function criptografar(conteudo, p256dh, auth, teste = {}) {
  const ua = Buffer.from(p256dh, 'base64url');
  const segredo = Buffer.from(auth, 'base64url');
  const ecdh = createECDH('prime256v1');
  if (teste.privadaServidor) ecdh.setPrivateKey(Buffer.from(teste.privadaServidor, 'base64url'));
  else ecdh.generateKeys();
  const doServidor = ecdh.getPublicKey();
  const sal = teste.sal ? Buffer.from(teste.sal, 'base64url') : randomBytes(16);

  const prkChave = hmac(segredo, ecdh.computeSecret(ua));
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), ua, doServidor]);
  const ikm = hmac(prkChave, Buffer.concat([info, Buffer.from([1])]));
  const prk = hmac(sal, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);

  const cifra = createCipheriv('aes-128-gcm', cek, nonce);
  const cifrado = Buffer.concat([cifra.update(Buffer.concat([Buffer.from(conteudo), Buffer.from([2])])), cifra.final(), cifra.getAuthTag()]);
  const tamanhoRegistro = Buffer.alloc(4);
  tamanhoRegistro.writeUInt32BE(4096);
  return Buffer.concat([sal, tamanhoRegistro, Buffer.from([doServidor.length]), doServidor, cifrado]);
}

// Só serviços de push conhecidos. Sem esta lista, qualquer conta poderia cadastrar um
// "endpoint" apontando para dentro da rede de casa e fazer o servidor bater lá.
const SERVICOS = [/^fcm\.googleapis\.com$/, /\.push\.apple\.com$/, /^updates\.push\.services\.mozilla\.com$/,
  /^push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/, /^android\.googleapis\.com$/];

export function inscricaoValida(inscricao, { permitirLocal = false } = {}) {
  const i = inscricao || {};
  const chaves = i.keys || {};
  if (typeof i.endpoint !== 'string' || i.endpoint.length > 1000) return null;
  let url;
  try { url = new URL(i.endpoint); } catch { return null; }
  const local = permitirLocal && url.protocol === 'http:' && url.hostname === '127.0.0.1';
  if (!local && (url.protocol !== 'https:' || !SERVICOS.some((r) => r.test(url.hostname)))) return null;
  try {
    const p = Buffer.from(String(chaves.p256dh || ''), 'base64url');
    const a = Buffer.from(String(chaves.auth || ''), 'base64url');
    if (p.length !== 65 || p[0] !== 4 || a.length !== 16) return null;
  } catch { return null; }
  return { endpoint: i.endpoint, p256dh: chaves.p256dh, auth: chaves.auth };
}

export async function enviarPush(inscricao, mensagem, chaves, contato, opcoes = {}) {
  const corpo = criptografar(JSON.stringify(mensagem), inscricao.p256dh, inscricao.auth);
  const cabecalhos = {
    authorization: autorizacaoVapid(inscricao.endpoint, chaves, contato),
    'content-encoding': 'aes128gcm',
    'content-type': 'application/octet-stream',
    ttl: String(opcoes.ttl || 12 * 3600),
    urgency: opcoes.urgencia || 'normal',
  };
  // O tópico faz o serviço de push trocar o aviso ainda não entregue pelo mais novo.
  if (mensagem.tag) cabecalhos.topic = createHash('sha256').update(mensagem.tag).digest('base64url').slice(0, 32);
  const resposta = await (opcoes.fetch || fetch)(inscricao.endpoint, { method: 'POST', headers: cabecalhos, body: corpo });
  // Inscrição feita com a chave de outro servidor (a Apple responde 400 VapidPkHashMismatch)
  // nunca vai receber nada daqui: conta como aparelho que saiu (410), e o app pede de novo.
  // No Chrome/Android o mesmo caso vem como 403 "does not correspond to the sender".
  if (resposta.status === 400 || resposta.status === 403) {
    const motivo = await resposta.text().catch(() => '');
    if (/VapidPkHashMismatch|does not correspond/i.test(motivo)) return 410;
  }
  return resposta.status;
}

// ---------------------------------------------------------------- regras
export const SILENCIO = { inicio: 22 * 60 + 30, fim: 7 * 60 };
export const MAX_AUTOMATICAS_DIA = 3;
// Três chamadas por dia: manhã, meio-dia e noite. A da noite respeita a hora escolhida nas
// configurações; as duas primeiras são fixas. Todas param no instante em que a pessoa lê,
// então três é o teto de quem passou o dia inteiro sem abrir, e não a rotina de quem usa.
export const LEMBRETE_MANHA = 9 * 60;
export const LEMBRETE_MEIO = 12 * 60;
export const MAX_TOQUES_RECEBIDOS_DIA = 3;
// Quem sumiu: diário na primeira semana, depois cada vez mais espaçado, sem nunca parar de
// vez. É o que os apps de hábito fazem (a volta é mais provável entre o 3º e o 14º dia e
// cai muito depois de 30), sem o tom de cobrança que alguns usam quando a pessoa some.
//   3 a 7: todo dia · 9, 11, 14: dia sim, dia não · 21 e 30: semanal
//   até 90: a cada 15 dias · depois: a cada 30
export const DIAS_DE_VOLTA = [3, 4, 5, 6, 7, 9, 11, 14, 21, 30];
export const diaDeVolta = (n) => DIAS_DE_VOLTA.includes(n) || (n > 30 && n <= 90 && (n - 30) % 15 === 0) || (n > 90 && (n - 90) % 30 === 0);
export const HORA_OFENSIVA = 21 * 60;
// Distância mínima entre dois avisos automáticos do mesmo dia.
export const ESPACO_ENTRE_AVISOS = 90;
export const PREFERENCIAS_PADRAO = { lembrete: true, hora: '19:00', ofensiva: true, amigos: true };
const MARCOS = [7, 14, 30, 50, 100, 150, 200, 250, 300, 365];

export const emSilencio = (minutos) => minutos >= SILENCIO.inicio || minutos < SILENCIO.fim;
const paraMinutos = (hora) => { const [h, m] = String(hora).split(':').map(Number); return h * 60 + (m || 0); };
const somarDias = (data, n) => new Date(Date.parse(data + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const diasEntre = (de, ate) => Math.round((Date.parse(ate + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 864e5);

export function horaValida(hora) {
  if (!/^\d{2}:\d{2}$/.test(String(hora))) return false;
  const m = paraMinutos(hora);
  return m % 30 === 0 && m >= SILENCIO.fim && m <= 22 * 60;
}

// Decide a próxima notificação automática para uma pessoa, ou nenhuma.
//   agora:     { data: 'AAAA-MM-DD', minutos } no fuso da pessoa
//   pref:      preferências (PREFERENCIAS_PADRAO)
//   historico: o que já saiu hoje e nos últimos dias
//   leitura:   { leuHoje, ofensiva (dias seguidos até ontem), ultimaLeitura, escudoOntem, criadaEm }
export function decidir({ agora, pref, historico = {}, leitura }) {
  const { data, minutos } = agora;
  const h = historico.data === data ? historico : { data, automaticas: 0 };
  if (emSilencio(minutos)) return null;
  if ((h.automaticas || 0) >= MAX_AUTOMATICAS_DIA) return null;
  if (leitura.leuHoje) return null;

  // Escudo de ontem: um recado de manhã, antes do lembrete.
  if (leitura.escudoOntem && historico.escudo !== data && minutos >= 9 * 60 && minutos < 12 * 60) {
    return { tipo: 'escudo', dados: { ofensiva: leitura.ofensiva } };
  }

  const hora = paraMinutos(pref.hora || PREFERENCIAS_PADRAO.hora);
  const referencia = leitura.ultimaLeitura || leitura.criadaEm || data;
  const semLer = diasEntre(referencia, data);

  // Quem sumiu recebe no máximo um aviso no dia, no horário escolhido, nos dias de diaDeVolta.
  // Servidor fora no dia marcado: o aviso sai no dia seguinte, uma vez; atraso maior espera o
  // próximo dia da lista, sem acumular.
  if (semLer >= DIAS_DE_VOLTA[0]) {
    if (!pref.lembrete || minutos < hora || historico.volta === data) return null;
    let etapa = semLer;
    while (etapa > DIAS_DE_VOLTA[0] && !diaDeVolta(etapa)) etapa--;
    const devidoEm = somarDias(referencia, etapa);
    if (semLer - etapa > 1 || (historico.volta && historico.volta >= devidoEm)) return null;
    return { tipo: 'volta', dados: { dias: etapa } };
  }

  // Os três horários do dia. "enviadoAte" é o minuto do último lembrete de hoje: só sai o
  // horário que já passou e que é mais tarde que o último enviado, então cada um sai uma
  // vez só e nenhum atropela o outro quando a rodada roda de hora em hora.
  if (pref.lembrete) {
    // Um lembrete que saiu atrasado (o servidor esteve desligado no horário) cobre também os
    // horários da hora e meia seguinte: volta do servidor às 11h50 manda o da manhã e pula o do
    // meio-dia, em vez de mandar os dois colados. Cada volta manda um aviso só, o do período.
    const enviadoAte = historico.lembrete === data ? (historico.lembreteMinutos || 0) + ESPACO_ENTRE_AVISOS - 1 : -1;
    // O recado do escudo já é a mensagem da manhã. Sem isto, quem usou escudo recebia o
    // escudo e o lembrete das 9h em seguida, dois avisos colados no mesmo intervalo.
    const inicio = historico.escudo === data ? Math.max(enviadoAte, LEMBRETE_MANHA) : enviadoAte;
    const horarios = [...new Set([LEMBRETE_MANHA, LEMBRETE_MEIO, hora])].sort((a, b) => b - a);
    const slot = horarios.find((m) => minutos >= m && m > inicio);
    if (slot !== undefined) {
      return { tipo: 'lembrete', dados: { ofensiva: leitura.ofensiva, slot } };
    }
  }

  // A ofensiva em risco sai à noite, e nunca colada no lembrete.
  const lembreteRecente = historico.lembrete === data && minutos - (historico.lembreteMinutos || 0) < ESPACO_ENTRE_AVISOS;
  if (pref.ofensiva && leitura.ofensiva >= 2 && minutos >= HORA_OFENSIVA && historico.ofensiva !== data && !lembreteRecente) {
    return { tipo: 'ofensiva', dados: { ofensiva: leitura.ofensiva } };
  }
  return null;
}

// ---------------------------------------------------------------- mensagens
// Variações por tipo, escolhidas pelo dia: a mesma pessoa não lê a mesma frase dois
// dias seguidos, e ninguém recebe "você falhou".
const T = {
  lembreteComOfensiva: [
    ['🔥 {n} dias seguidos!', 'Bora fazer o dia {n1}? A lição de hoje já tá pronta.'],
    ['Pausa pro café com a Palavra ☕', 'Uns 15 minutinhos e a sua chama de {n} dias segue acesa.'],
    ['Ei, {nome}! 👋', 'A leitura de hoje já está separada. Bora manter os {n} dias?'],
    ['Seu momento do dia chegou 📖', '{n} dias de caminho. Hoje é o dia {n1}!'],
  ],
  lembreteSemOfensiva: [
    ['Bora começar? 🌱', 'Um dia de cada vez. A leitura de hoje tá te esperando.'],
    ['Hoje é um bom dia pra abrir a Palavra 📖', 'Uns minutinhos, uma leitura e pronto.'],
    ['Ei, {nome}! 👋', 'A lição de hoje é rapidinha. Bora?'],
    ['Pausa boa pro seu dia ✨', 'Respira, abre o app e lê com calma.'],
  ],
  lembreteMarco: [
    ['Falta 1 dia pra {marco} 🏆', 'Lê hoje e a sua ofensiva chega em {marco} dias seguidos!'],
    ['Quase lá! 🎯', 'Mais uma leitura e você bate {marco} dias. Bora?'],
  ],
  lembreteDomingo: [
    ['Domingo com a Palavra ☀️', 'Começa a semana leve: a leitura de hoje tá pronta.'],
    ['Bom domingo, {nome}! 🙌', 'Que tal fechar a semana com a lição de hoje?'],
  ],
  // Os recados de manhã e de meio-dia carregam Escritura de verdade, com a referência à
  // vista. O app não inventa profecia nem fala em nome de Deus: quando quer animar, cita
  // o texto e deixa quem lê conferir de onde veio.
  lembreteManha: [
    ['As misericórdias se renovam 🌅', '"As misericórdias do Senhor renovam-se a cada manhã" (Lm 3.22-23). Comece o dia na Palavra.'],
    ['De manhã, Senhor ☀️', '"De manhã fazes ouvir a minha voz" (Sl 5.3). A leitura de hoje te espera.'],
    ['Primeiro o Reino 📖', '"Buscai primeiro o Reino de Deus" (Mt 6.33). Uns minutos e o dia começa diferente.'],
    ['Bom dia, {nome}! 🌤️', '"Ensina-me a fazer a tua vontade" (Sl 143.10). Bora abrir a lição de hoje?'],
  ],
  lembreteMeio: [
    ['Uma pausa no meio do dia ☕', '"Aquietai-vos e sabei que eu sou Deus" (Sl 46.10). Dez minutos bastam.'],
    ['Fome de quê? 🍞', '"Nem só de pão viverá o homem" (Mt 4.4). A leitura de hoje é rapidinha.'],
    ['Respira fundo 🌿', '"Vinde a mim, todos os que estais cansados" (Mt 11.28). Abre a Palavra um instante.'],
    ['No meio do corre 🕊️', '"A tua palavra é doce ao meu paladar" (Sl 119.103). Dá uma parada e lê.'],
  ],
  ofensiva: [
    ['Sua chama de {n} dias tá pedindo lenha 🔥', 'Ainda dá tempo! Faz a lição antes da meia-noite.'],
    ['Última chamada do dia ⏰', 'Uma leitura rapidinha garante os seus {n} dias seguidos.'],
    ['Ei, a ofensiva! 🚨', '{n} dias acesos. Bora salvar o de hoje?'],
  ],
  escudo: [
    ['Seu escudo segurou a onda 🛡️', 'Ontem ficou coberto e a ofensiva seguiu em {n}. Hoje é com você!'],
    ['Escudo em ação 🛡️', 'A sua chama sobreviveu a ontem. Bora não precisar dele hoje?'],
  ],
  volta3: [['Saudade de você por aqui 👀', 'Seu progresso tá guardadinho. Bora retomar com a leitura de hoje?']],
  volta7: [['O caminho continua aberto 🛤️', 'Sem pressão: é só abrir e seguir de onde parou.']],
  volta14: [['Passando só pra lembrar 💛', 'Quando quiser voltar, está tudo guardado do jeito que você deixou.']],
  // Do 4º ao 6º dia: "de onde parou", um convite leve, nunca contagem de dias perdidos.
  voltaDiario: [
    ['A leitura de hoje tá aqui 📖', 'Sem cobrança: abre quando der e lê com calma.'],
    ['Um minutinho com a Palavra? 🌿', 'Seu progresso tá guardado. Dá pra seguir de onde parou.'],
    ['Oi, {nome} 👋', 'A lição de hoje é curtinha. Que tal hoje?'],
    ['Recomeçar é sempre possível 🌱', 'É só abrir o app e seguir do ponto em que você parou.'],
  ],
  // 9º e 11º dia: o que espera por ela, e que voltar não pede correr atrás do atraso.
  voltaValor: [
    ['Uma leitura curtinha muda o dia ✨', 'Dá pra voltar com uma lição só. Sem correr atrás do atraso.'],
    ['Sua próxima leitura tá separada 📖', 'Ela continua ali, do ponto em que você parou.'],
    ['Dez minutos com a Palavra 🌿', 'Não precisa recuperar nada. É só a leitura de hoje.'],
  ],
  // Do 21º dia em diante, espaçado: saudade e porta aberta.
  voltaSaudade: [
    ['Sentimos sua falta 💛', 'Quando quiser voltar, a leitura continua de onde você parou.'],
    ['Faz um tempinho, {nome} 👋', 'Sem pressa e sem cobrança: o app tá aqui quando você quiser.'],
    ['A porta continua aberta 🚪', 'Um dia de cada vez. Dá pra recomeçar hoje, com uma leitura só.'],
    ['Oi, a gente lembrou de você 🌱', 'Tá tudo guardado do jeito que você deixou. Volta quando quiser.'],
  ],
  toque: [
    ['{amigo} te deu um toque 👊', 'Bora ler hoje? A lição tá esperando vocês dois.'],
    ['{amigo} tá te chamando pra ler 📣', 'Faz a lição de hoje e a contagem de vocês sobe.'],
  ],
  toques: [['{amigo} e mais {outros} te deram um toque 👊', 'A galera já leu. Bora você também?']],
  pedido: [['{amigo} quer ler a Bíblia com você 🙌', 'Abre o app pra aceitar e começar o propósito de vocês.']],
  aceito: [['{amigo} topou ler junto 🤝', 'Começou o propósito de vocês. Cada dia que os dois leem conta!']],
  teste: [['Tudo certo por aqui ✅', 'É assim que os lembretes do Geração Eleita vão chegar.']],
  propositoConvite: [
    ['{amigo} te chamou para um propósito 🤝', '{titulo}. Abre o app pra ver e aceitar.'],
  ],
  metaDoGrupo: [
    ['Faltam {faltam} pro grupo bater a meta 🎯', '{titulo}: bora fechar o dia juntos?'],
    ['O grupo tá quase lá 🙌', 'Falta pouco em {titulo}. A sua lição ajuda a bater a meta!'],
  ],
  // O corpo não diz "leem": o propósito pode ser de oração.
  propositoAceito: [['{amigo} entrou no propósito 🙌', '{titulo}: agora vocês estão juntos nessa.']],
  // "Quero conversar com alguém", do Conhecer Jesus: só quem convidou (e o líder da célula
  // dela, se houver) recebe, e nunca o que a pessoa escreveu. Assunto sério, sem emoji.
  querConversar: [['{nome} quer conversar com você sobre Jesus.', 'Chame essa pessoa para uma conversa, do jeito que vocês costumam falar.']],
  metaBatida: [
    ['O grupo bateu a meta de hoje 🎉', '{titulo}: vocês chegaram lá juntos.'],
    ['Meta do grupo batida 🙌', 'Deu certo em {titulo}. Obrigado por estar junto!'],
  ],
  // Discipulado (Mateus 28.19-20; 2 Tm 2.2): assunto sério, sem emoji, como querConversar.
  discipuladoConvite: [['{amigo} quer caminhar com você na fé.', 'Abra o app para ver o convite.']],
  discipuladoAceito: [['{amigo} aceitou caminhar com você na fé.', 'Combinem juntos o primeiro encontro da semana.']],
  // Cuidado mútuo (Atos 2.42; 2.44-45): assunto sério, sem emoji, sem detalhe do pedido.
  pedidoConduz: [['{amigo} deixou um pedido de oração para você.', 'Abra a célula para ver.']],
  possoAjudar: [['{amigo} pode ajudar com o que você pediu.', 'Combinem pessoalmente ou no WhatsApp.']],
  denunciaPerigo: [['Um pedido da célula precisa da sua atenção.', 'Abra a célula para ver.']],
};
export const TEXTOS = T;

const semente = (texto) => createHash('sha256').update(texto).digest().readUInt32BE(0);
const preencher = (s, d) => s.replace(/\{(\w+)\}/g, (_, k) => (d[k] === undefined || d[k] === '' ? '' : String(d[k])))
  .replace(/\s+([!?.,])/g, '$1').replace(/,\s*!/g, '!').replace(/\s{2,}/g, ' ').trim();

// Monta a notificação pronta: título, corpo, tag (quem tem a mesma tag se substitui no
// celular) e para onde o toque na notificação leva.
export function montarMensagem(tipo, dados = {}, { usuario = '', data = '', nome = '' } = {}) {
  const d = { ...dados, nome: primeiroNome(nome) };
  let lista = T[tipo];
  let url = './#/';
  let tag = tipo;
  if (tipo === 'lembrete') {
    const n = dados.ofensiva || 0;
    const marco = MARCOS.find((m) => m === n + 1);
    const domingo = data && new Date(data + 'T12:00:00Z').getUTCDay() === 0;
    // O horário manda no tom: de manhã e ao meio-dia é convite com Escritura; à noite
    // entra o repertório de sempre, que fala da ofensiva e do marco por vir.
    const cedo = dados.slot !== undefined && dados.slot <= LEMBRETE_MEIO;
    if (cedo) lista = dados.slot <= LEMBRETE_MANHA ? T.lembreteManha : T.lembreteMeio;
    else lista = marco ? T.lembreteMarco : (n >= 1 ? T.lembreteComOfensiva : (domingo ? T.lembreteDomingo : T.lembreteSemOfensiva));
    Object.assign(d, { n, n1: n + 1, marco });
    tag = 'lembrete';
  }
  if (tipo === 'ofensiva' || tipo === 'escudo') { d.n = dados.ofensiva || 0; tag = 'lembrete'; }
  if (tipo === 'volta') {
    const n = Number(dados.dias) || 0;
    lista = T['volta' + n] || (n < 7 ? T.voltaDiario : n < 14 ? T.voltaValor : T.voltaSaudade);
    tag = 'lembrete';
  }
  if (tipo === 'toque') {
    if ((dados.outros || 0) > 0) lista = T.toques;
    tag = 'toque';
  }
  if (tipo === 'pedido' || tipo === 'aceito') { url = './#/amigos'; tag = tipo + ':' + (dados.amigoUsuario || ''); }
  if (tipo === 'querConversar') { url = './#/amigos'; tag = 'querConversar:' + (dados.deUsuario || ''); }
  // A célula mora no Juntos; duplas e grupos, em Juntos > Propósitos.
  const telaDoProposito = dados.celula ? './#/novidades' : './#/novidades/propositos';
  if (tipo === 'propositoConvite' || tipo === 'propositoAceito') { url = telaDoProposito; tag = 'proposito:' + (dados.id || ''); }
  // A meta batida usa a mesma tag do "falta pouco": no celular, a boa notícia substitui o recado.
  if (tipo === 'metaDoGrupo' || tipo === 'metaBatida') { url = telaDoProposito; tag = 'grupo:' + (dados.id || ''); }
  // Discipulado mora no Perfil, nunca no Feed: o toque na notificação leva direto para lá.
  if (tipo === 'discipuladoConvite' || tipo === 'discipuladoAceito') { url = './#/perfil/discipulado'; tag = tipo + ':' + (dados.amigoUsuario || ''); }
  // Cuidado mútuo mora na célula (aba Oração), nunca no Feed: com o id da célula, o toque na
  // notificação leva direto para lá; sem ele (aviso antigo, ainda na fila), cai no Juntos.
  if (tipo === 'pedidoConduz' || tipo === 'possoAjudar' || tipo === 'denunciaPerigo') {
    url = dados.celula ? './#/novidades/celula/' + encodeURIComponent(dados.celula) + '/oracao' : './#/novidades';
    tag = tipo;
  }
  if (!lista) throw new Error('tipo de notificação desconhecido: ' + tipo);
  const [titulo, corpo] = lista[semente(usuario + '|' + data + '|' + tipo) % lista.length];
  return { titulo: preencher(titulo, d), corpo: preencher(corpo, d), tag, url };
}

export const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';

// ---------------------------------------------------------------- guarda
// No banco (push_inscricoes, push_preferencias, push_historico): um aparelho por linha,
// as preferências e o histórico do que já saiu, para as regras de limite sobreviverem a um
// reinício. O notificacoes.json antigo é importado uma vez.
export class Notificacoes {
  constructor(arquivo) {
    this.arquivo = arquivo;
    this.dados = { versao: 1, inscricoes: {}, preferencias: {}, historico: {} };
  }

  async carregar() {
    const { db, legado } = abrirModulo(this.arquivo, 'notificacoes');
    this.db = db;
    const t = this.lerTabelas();
    if (legado) {
      this.dados = { versao: 1, inscricoes: {}, preferencias: {}, historico: {}, ...legado };
      await this.salvar();
      concluirImportacao(db, 'notificacoes', this.arquivo);
      return this;
    }
    const d = { versao: 1, inscricoes: {}, preferencias: {}, historico: {} };
    for (const l of t.inscricoes) {
      (d.inscricoes[l.usuario] || (d.inscricoes[l.usuario] = [])).push({ endpoint: l.endpoint, p256dh: l.p256dh, auth: l.auth, criadaEm: l.criada_em });
    }
    for (const l of t.preferencias) d.preferencias[l.usuario] = JSON.parse(l.dados);
    for (const l of t.historico) d.historico[l.usuario] = JSON.parse(l.dados);
    this.dados = d;
    return this;
  }

  lerTabelas() {
    return {
      inscricoes: lerTabela(this.db, 'push_inscricoes', ['endpoint'], 'usuario, ordem'),
      preferencias: lerTabela(this.db, 'push_preferencias', ['usuario']),
      historico: lerTabela(this.db, 'push_historico', ['usuario']),
    };
  }

  async salvar() {
    if (!this.db) { this.db = abrirModulo(this.arquivo, 'notificacoes').db; this.lerTabelas(); }
    const d = this.dados;
    sincronizar(this.db, [
      { tabela: 'push_inscricoes', chaves: ['endpoint'], linhas: Object.entries(d.inscricoes).flatMap(([usuario, lista]) => (lista || []).map((i, ordem) => ({
        endpoint: i.endpoint, usuario, p256dh: i.p256dh, auth: i.auth, criada_em: i.criadaEm || '', ordem,
      }))) },
      { tabela: 'push_preferencias', chaves: ['usuario'], linhas: Object.entries(d.preferencias).map(([usuario, p]) => ({ usuario, dados: JSON.stringify(p) })) },
      { tabela: 'push_historico', chaves: ['usuario'], linhas: Object.entries(d.historico).map(([usuario, h]) => ({ usuario, dados: JSON.stringify(h) })) },
    ]);
  }

  inscricoesDe(usuario) { return this.dados.inscricoes[usuario] || []; }
  comInscricao() { return Object.keys(this.dados.inscricoes).filter((u) => this.inscricoesDe(u).length); }
  preferencias(usuario) { return { ...PREFERENCIAS_PADRAO, ...(this.dados.preferencias[usuario] || {}) }; }

  async inscrever(usuario, inscricao) {
    // o mesmo aparelho pode ter trocado de conta: a inscrição passa a ser só de quem entrou
    for (const u of Object.keys(this.dados.inscricoes)) {
      this.dados.inscricoes[u] = this.inscricoesDe(u).filter((i) => i.endpoint !== inscricao.endpoint);
    }
    const lista = this.inscricoesDe(usuario);
    lista.push({ ...inscricao, criadaEm: new Date().toISOString() });
    this.dados.inscricoes[usuario] = lista.slice(-10);
    await this.salvar();
  }

  async cancelar(usuario, endpoint) {
    this.dados.inscricoes[usuario] = this.inscricoesDe(usuario).filter((i) => i.endpoint !== endpoint);
    await this.salvar();
  }

  async esquecerEndpoint(endpoint) {
    for (const u of Object.keys(this.dados.inscricoes)) {
      this.dados.inscricoes[u] = this.inscricoesDe(u).filter((i) => i.endpoint !== endpoint);
    }
    await this.salvar();
  }

  async definirPreferencias(usuario, novas) {
    const atual = this.preferencias(usuario);
    const p = {};
    for (const k of ['lembrete', 'ofensiva', 'amigos']) p[k] = typeof novas[k] === 'boolean' ? novas[k] : atual[k];
    p.hora = horaValida(novas.hora) ? novas.hora : atual.hora;
    this.dados.preferencias[usuario] = p;
    await this.salvar();
    return p;
  }

  historico(usuario) { return this.dados.historico[usuario] || {}; }

  // Anota o que saiu. Automáticas contam para o teto do dia; toques têm contagem própria.
  async anotar(usuario, tipo, data, minutos) {
    const antigo = this.historico(usuario);
    const h = antigo.data === data ? { ...antigo } : { ...antigo, data, automaticas: 0, toques: 0 };
    if (['lembrete', 'ofensiva', 'escudo', 'volta'].includes(tipo)) {
      h.automaticas = (h.automaticas || 0) + 1;
      h[tipo] = data;
      if (tipo === 'lembrete') h.lembreteMinutos = minutos;
    }
    if (tipo === 'toque') h.toques = (h.toques || 0) + 1;
    // o recado de meta e a comemoração de cada grupo saem no máximo uma vez por dia. A
    // comemoração ("grupoBatida:") ficava de fora deste teste: nunca era anotada e saía de
    // novo a cada rodada de lembretes, uma por minuto.
    if (tipo.startsWith('grupo:') || tipo.startsWith('grupoBatida:')) h[tipo] = data;
    this.dados.historico[usuario] = h;
    await this.salvar();
    return h;
  }

  toquesHoje(usuario, data) {
    const h = this.historico(usuario);
    return h.data === data ? (h.toques || 0) : 0;
  }

  async apagarDe(usuario) {
    delete this.dados.inscricoes[usuario];
    delete this.dados.preferencias[usuario];
    delete this.dados.historico[usuario];
    await this.salvar();
  }
}

export async function chavesDoServidor(arquivo) {
  try {
    return JSON.parse(await readFile(arquivo, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    const chaves = gerarChaves();
    await mkdir(dirname(arquivo), { recursive: true });
    await writeFile(arquivo, JSON.stringify(chaves), 'utf8');
    return chaves;
  }
}
