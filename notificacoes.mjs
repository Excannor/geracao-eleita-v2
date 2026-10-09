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
// Variações por tipo. O tom é o de um amigo que lembra, nunca o de quem cobra: convite,
// curiosidade sobre a leitura do dia, carinho, humor leve e, de vez em quando, um versículo
// curto com a referência à vista (texto da NBV, palavra por palavra). Nada de culpa, ameaça,
// "você vai perder" nem pressão pela sequência: quem para um dia não é punida por isso, e o
// app diz isso com todas as letras. No máximo um emoji por aviso, e nem todo aviso tem.
// Título até 40 caracteres e corpo até 110, para caber na tela bloqueada. O teste.mjs confere
// tudo isso, as palavras proibidas e as citações contra conteudo/biblias/nbv.json.
//
// Marcadores: {nome} (primeiro nome de quem recebe), {amigo}, {outros}, {titulo}, {quem},
// {nDias} ("1 dia", "12 dias": os dias seguidos até ontem), {marco}, {faltamTexto} ("uma
// leitura", "duas leituras"), {filha}, {novoLider}, e os da leitura em que a pessoa está, que o servidor
// manda nos avisos automáticos: {leitura} ("Gênesis 1-3 · Mateus 1") e {tema} (o título da
// reflexão do dia). Frase com marcador que veio vazio fica de fora naquele envio.
const T = {
  // À noite, na hora escolhida, para quem já vem lendo.
  lembreteComOfensiva: [
    ['{nDias} de leitura 🔥', 'Que caminho bonito, {nome}. A leitura de hoje já está separada.'],
    ['Spoiler da leitura de hoje 👀', 'Dá uma espiada quando puder. A reflexão de hoje se chama “{tema}”'],
    ['A Bíblia já está na página certa', 'Hoje é {leitura}. É só chegar.'],
    ['Toc, toc 📖', 'É a leitura de hoje. Pode entrar quando quiser.'],
    ['São {nDias} com a Palavra', 'Hoje tem mais um pedaço da história, {nome}. No seu ritmo.'],
    ['Pausa pra Palavra ☕', 'Pega um café ou uma água. A leitura de hoje é {leitura}.'],
    ['Próxima parada', 'Hoje é {leitura}. Quando der, a gente segue.'],
    ['Hora do seu momento com a Palavra', 'Sem pressa. Abre, lê com calma e conversa com Deus sobre o que leu.'],
    ['Tem história boa hoje', 'Quando der, abre a leitura. A reflexão de hoje é “{tema}”'],
    ['Seu marcador está no lugar', 'Você parou no ponto certinho. A próxima leitura é {leitura}.'],
    ['{nDias} e contando ✨', 'Valeu por estar aqui, {nome}. A leitura de hoje te espera sem correria.'],
    ['A leitura de hoje chegou 📬', 'A entrega de hoje é {leitura}. Pode abrir quando quiser.'],
    ['Uma leitura, uma conversa com Deus', 'É só isso que o dia de hoje pede. Do seu jeito, na sua hora.'],
  ],
  // À noite, para quem ainda não tem dias seguidos (ou está começando).
  lembreteSemOfensiva: [
    ['Bora começar? 🌱', 'Um dia de cada vez. A leitura de hoje é {leitura}.'],
    ['Oi, {nome} 👋', 'A leitura de hoje está separada. Abre quando der, sem pressa.'],
    ['Hoje é um bom dia pra abrir a Bíblia', 'Uns minutinhos, uma leitura e uma conversa com Deus.'],
    ['Curiosidade do dia 👀', 'Dá pra descobrir hoje por que a reflexão se chama “{tema}”'],
    ['Seu cantinho de leitura está pronto', 'Hoje é {leitura}. Pode chegar do jeito que estiver.'],
    ['Uma página por vez', 'Ninguém lê a Bíblia inteira de uma vez. Hoje é só {leitura}.'],
    ['Começo bom não tem hora', 'Se hoje for o dia, a leitura está aqui te esperando, {nome}.'],
    ['Chegou sua leitura 📖', 'Lê com calma e fica com a parte que tocar você. Hoje é {leitura}.'],
    ['Que tal agora?', 'Abrir o app é rapidinho. A leitura de hoje vem no seu ritmo.'],
    ['Um tempinho só seu', 'Deixa o barulho de lado uns minutos. Hoje é {leitura}.'],
    ['Bíblia, café e silêncio ☕', 'Combinação que nunca dá errado. A leitura de hoje já está separada.'],
    ['Psiu, {nome}', 'Tem uma leitura nova te esperando. Sem cobrança, só convite.'],
    ['A história continua hoje', 'Todo dia tem um pedaço novo. O de hoje é {leitura}.'],
  ],
  // À noite, quando a leitura de hoje fecha um marco (7, 14, 30... dias). Comemora, não cobra.
  lembreteMarco: [
    ['Quase {marco} dias 🏆', 'Com a leitura de hoje, você chega a {marco} dias. Bonito de ver.'],
    ['Rumo aos {marco} dias', 'A leitura de hoje marca {marco} dias com a Palavra. Quando der, abre.'],
    ['{marco} dias à vista', 'Mais uma leitura e você chega lá, {nome}. No seu tempo.'],
    ['Um marco bonito chegando ✨', 'Hoje pode ser o dia {marco} da sua caminhada. A leitura já está separada.'],
    ['Olha quem está quase em {marco}', 'Falta só a leitura de hoje. Sem pressa, ela espera você.'],
  ],
  // À noite, no domingo, para quem ainda não tem dias seguidos.
  lembreteDomingo: [
    ['Domingo com a Palavra ☀️', 'Fecha a semana leve. A leitura de hoje é {leitura}.'],
    ['Bom domingo, {nome}', 'Depois do almoço ou da soneca, a leitura de hoje está aqui.'],
    ['Domingo pede calma', 'Que tal uma leitura sem pressa? Hoje é {leitura}.'],
    ['Um dia preparado 🌤️', '"Este dia foi especialmente preparado pelo Senhor" (Sl 118.24). Que tal ler com calma?'],
    ['Semana nova vem aí', 'Começa com a leitura de hoje? Ela está separada pra você.'],
  ],
  // Os recados de manhã e de meio-dia carregam Escritura de verdade, com a referência à
  // vista. O app não inventa profecia nem fala em nome de Deus: quando quer animar, cita
  // o texto e deixa quem lê conferir de onde veio.
  lembreteManha: [
    ['A misericórdia se renova 🌅', 'A misericórdia do Senhor "se renova a cada manhã" (Lm 3.23). Comece o dia na Palavra.'],
    ['De manhã ☀️', '"De manhã faço a minha oração e fico esperando a sua resposta" (Sl 5.3). A leitura de hoje te espera.'],
    ['Primeiro o Reino 📖', '"Coloquem, pois, em primeiro lugar o Reino de Deus" (Mt 6.33). Uns minutos e o dia começa diferente.'],
    ['Bom dia, {nome}! 🌤️', '"Ensine-me a fazer a sua vontade" (Sl 143.10). Bora abrir a leitura de hoje?'],
    ['Bom dia com luz 💡', '"A sua palavra é uma lâmpada que ilumina o caminho por onde eu ando" (Sl 119.105).'],
    ['Antes do dia acelerar', 'Jesus se levantou antes do amanhecer para orar (Mc 1.35). Que tal um momento com a leitura?'],
    ['Um pedido pra manhã', '"Mostre-me o seu amor fiel já pela manhã" (Sl 143.8). A leitura de hoje está separada.'],
    ['Primeiro passo do dia', '"Senhor, mostre-me quais são os seus caminhos" (Sl 25.4). A leitura de hoje te espera.'],
    ['Café e Salmo ☕', '"Encha a nossa vida com o seu amor fiel, desde a manhã" (Sl 90.14). Bom dia, {nome}.'],
    ['Começando o dia', '"Deixe nas mãos do Senhor tudo o que você for fazer" (Sl 37.5). Inclusive a correria de hoje.'],
    ['Prove e veja', '"Provem e vejam que o Senhor é bom" (Sl 34.8). A leitura de hoje é um bom lugar pra começar.'],
    ['Caminhos da vida 🌄', '"O Senhor me mostrará os caminhos da vida" (Sl 16.11). Abre a leitura quando der.'],
    ['Manhã nova', '"De manhã ele nos devolve a alegria" (Sl 30.5). Bom dia! A leitura de hoje está separada.'],
  ],
  lembreteMeio: [
    ['Uma pausa no meio do dia ☕', '"Fiquem quietos e saibam, de uma vez por todas, que eu sou Deus!" (Sl 46.10). Uns minutos bastam.'],
    ['Fome de quê? 🍞', '"Não é só de pão que vive o homem" (Mt 4.4). Que tal a leitura de hoje?'],
    ['Respira fundo 🌿', '"Venham a mim, todos vocês que estão cansados" (Mt 11.28). Abre a Palavra um instante.'],
    ['No meio do corre 🕊️', '"As suas palavras são doces, mais doces do que o mel" (Sl 119.103). Dá uma parada e lê.'],
    ['Um respiro no meio do dia', 'Jesus disse aos discípulos: “Vamos sair por um instante do meio do povo, para descansar” (Mc 6.31).'],
    ['Meio do dia, meio do caminho', '"nele eu confio e fico tranquilo" (Sl 62.1). Uma pausa com a leitura de hoje?'],
    ['Lanche pra alma', '"Como eu amo a sua lei! Durante todo o dia medito nela" (Sl 119.97). Que tal uns minutos agora?'],
    ['No meio da correria', 'Jesus disse a Marta: “Há realmente apenas uma coisa necessária” (Lc 10.42). Senta um pouco com a leitura?'],
    ['Recarregando ⚡', '"A alegria do Senhor é a força de vocês" (Ne 8.10). Uns minutos com a leitura de hoje?'],
    ['Paradinha estratégica', '"Abra os meus olhos para que eu possa ver as coisas maravilhosas que há na sua lei" (Sl 119.18).'],
    ['Meio-dia em paz', '"O Senhor guardará em perfeita paz todos os que confiam nele" (Is 26.3). Respira e lê um pouco.'],
    ['Palavras que aquecem 🔥', 'Em Emaús: "Não estava queimando o nosso coração quando ele nos falava" (Lc 24.32).'],
    ['Uma conversa no almoço', '"De dia e de noite ele medita nessa lei" (Sl 1.2). Que tal um pedacinho agora?'],
  ],
  // "Ofensiva": às 21h, só para quem pediu esse aviso nas configurações. Celebra os dias e
  // convida para a leitura, sem dizer que algo se perde. Várias dizem com todas as letras
  // que, se não der, tudo bem.
  ofensiva: [
    ['Antes de dormir 🌙', '"Posso me deitar tranquilo e dormir em paz" (Sl 3.5). Uma leitura antes de deitar?'],
    ['Boa noite, {nome}', 'Se der tempo hoje, a leitura está aqui. Se não der, tudo bem também.'],
    ['{nDias} com a Palavra ✨', 'Que bonito ver isso. Se der, a leitura de hoje fecha o dia com calma.'],
    ['Leitura de travesseiro', 'Hoje é {leitura}. Dá pra ler no sofá, na cama, onde for.'],
    ['A noite está calma por aqui', 'Se quiser fechar o dia com a Palavra, a leitura de hoje é {leitura}.'],
    ['Fim de dia, começo de conversa', 'Uns minutos de leitura e uma oração simples. Do jeito que você estiver.'],
    ['Chá, pijama e Bíblia? 🍵', 'Se o dia deixar, a leitura de hoje está aqui. Se não, amanhã ela continua no lugar.'],
    ['A chama de {nDias} diz boa noite 🔥', 'Ela só passou pra lembrar da leitura de hoje. Sem pressão, viu?'],
    ['Dia longo?', 'A leitura de hoje pode ser seu jeito de desacelerar. Abre só se fizer bem.'],
    ['Última parada do dia', 'Antes de desligar, que tal a reflexão de hoje? Ela se chama “{tema}”'],
    ['Um versículo pra dormir', '"Quando vou dormir, meu coração está em perfeita paz" (Sl 4.8). A leitura de hoje está aqui.'],
    ['{nome}, o dia rendeu?', 'Sobrou um tempinho? A leitura de hoje é {leitura}. Se não, descansa.'],
    ['Modo noturno ligado 🌙', 'Luz baixa, celular no silencioso e uma leitura sem pressa. Topa?'],
  ],
  escudo: [
    ['Seu escudo cuidou de ontem 🛡️', 'Os seus {nDias} continuam aí. Hoje a leitura está separada, quando der.'],
    ['Ontem ficou protegido', 'O escudo segurou os seus {nDias}. Respira, hoje é um dia novo.'],
    ['Escudo em ação 🛡️', 'Ontem passou e os seus {nDias} seguem firmes. A leitura de hoje te espera.'],
    ['Ontem teve escudo', 'Tudo certo com os seus {nDias}, {nome}. Bora com calma hoje?'],
  ],
  // Quem sumiu: convite leve, nunca contagem de dias parados nem "sentimos sua falta".
  // 3º dia sem ler.
  volta3: [
    ['Ei, {nome} 👋', 'Faz uns dias que a gente não se vê. Sua leitura está guardadinha no mesmo lugar.'],
    ['Seu marcador continua no lugar', 'É só abrir e seguir de onde parou. Sem correr atrás de nada.'],
    ['Passando pra dar um oi', 'A próxima leitura é {leitura}. Quando quiser, ela está aqui.'],
    ['Tudo bem por aí?', 'Às vezes a semana aperta. Quando der, a leitura continua de onde você parou.'],
  ],
  // 7º dia.
  volta7: [
    ['O caminho continua aberto 🛤️', 'Sem pressão. É só abrir e seguir de onde parou.'],
    ['Uma semana passa rápido', 'A gente guardou tudo do jeito que você deixou. Volta quando quiser.'],
    ['Sua próxima leitura', 'É {leitura}. Ela fica esperando o tempo que for preciso.'],
    ['Recomeçar é simples', 'Uma leitura só, no seu ritmo. Tudo continua guardado.'],
  ],
  // 14º dia.
  volta14: [
    ['Passando só pra lembrar 💛', 'Quando quiser voltar, está tudo guardado do jeito que você deixou.'],
    ['A porta está aberta', 'Não precisa recuperar nada. Uma leitura e pronto, você já voltou.'],
    ['Oi de longe, {nome}', 'Se tiver um tempinho hoje, a leitura continua em {leitura}.'],
    ['Sem atraso nenhum', 'Aqui não tem dívida de leitura. Dá pra seguir de onde parou, quando quiser.'],
  ],
  // Do 4º ao 6º dia: "de onde parou", um convite leve.
  voltaDiario: [
    ['A leitura de hoje está aqui 📖', 'Sem cobrança. Abre quando der e lê com calma.'],
    ['Um minutinho com a Palavra? 🌿', 'Seu progresso está guardado. Dá pra seguir de onde parou.'],
    ['Recomeçar é sempre possível 🌱', 'É só abrir o app e seguir do ponto em que você parou.'],
    ['Oi de novo 👋', 'A próxima leitura é {leitura}. Ela não tem pressa nenhuma.'],
    ['Semana corrida?', 'Acontece com todo mundo. Quando der, sua leitura está no mesmo lugar.'],
    ['Guardando seu lugar', 'Seu marcador está onde você deixou, {nome}. É só voltar quando quiser.'],
    ['Spoiler da próxima leitura 👀', 'Vale a curiosidade. A próxima reflexão se chama “{tema}”'],
    ['Bíblia no bolso 📱', 'Dá pra ler na fila, no ônibus, no intervalo. A próxima é {leitura}.'],
    ['Sem pressa, sem placar', 'Aqui ninguém conta dias parados. Tem só a próxima leitura, quando você quiser.'],
    ['Volta no seu tempo', 'Uma leitura hoje já é um ótimo recomeço, {nome}.'],
    ['A história parou no meio', 'Ela continua de onde você deixou. A próxima é {leitura}.'],
    ['Só um oi da sua Bíblia', 'Ela guardou seu lugar direitinho. Aparece quando der.'],
    ['Sem sermão, prometo 🙂', 'Só um convite pra ler um pouco hoje. A leitura está separada.'],
  ],
  // 9º e 11º dia: o que espera por ela, e que voltar não pede correr atrás do atraso.
  voltaValor: [
    ['Uma leitura muda o dia ✨', 'Dá pra voltar com uma leitura só. Sem correr atrás do atraso.'],
    ['Sua próxima leitura está separada 📖', 'Ela continua ali, do ponto em que você parou.'],
    ['Uns minutos com a Palavra 🌿', 'Não precisa recuperar nada. É só a leitura de hoje.'],
    ['Ninguém está contando', 'Não tem atraso pra tirar. Quando quiser, é só abrir e ler a próxima.'],
    ['Tem história boa esperando', 'Quando quiser, a próxima reflexão se chama “{tema}”'],
    ['Seu lugar continua aqui', 'Sem fila, sem cobrança. A próxima leitura é {leitura}.'],
    ['Oi, {nome}. Tudo certo?', 'Se a vida apertou, tudo bem. A Bíblia continua aberta na sua página.'],
    ['Volta leve', 'Uma leitura, uma oração curta e pronto. É assim que se recomeça.'],
    ['Bíblia aberta, porta aberta', 'Quando quiser, é só chegar. Ninguém vai perguntar onde você estava.'],
    ['Um versículo pra hoje', '"O Senhor é o meu pastor" (Sl 23.1). A próxima leitura está guardada pra você.'],
    ['Quando der, a gente segue', 'Dá pra continuar exatamente de onde parou. Sem pular, sem correr.'],
    ['Sem pressão nenhuma 🙂', 'Só passando pra lembrar que a leitura continua aqui, {nome}.'],
  ],
  // Do 21º dia em diante, espaçado: porta aberta.
  voltaSaudade: [
    ['Faz um tempinho, {nome} 👋', 'Sem pressa e sem cobrança. O app está aqui quando você quiser.'],
    ['A porta continua aberta 🚪', 'Um dia de cada vez. Dá pra recomeçar hoje, com uma leitura só.'],
    ['Oi, a gente lembrou de você 🌱', 'Está tudo guardado do jeito que você deixou. Volta quando quiser.'],
    ['Lembrança carinhosa 💛', 'Quando quiser voltar, a leitura continua de onde você parou.'],
    ['Recomeço disponível', 'Não tem prazo nem fila. É abrir e ler a próxima, {nome}.'],
    ['Notícia boa', 'A Bíblia não mudou de lugar. Sua próxima leitura é {leitura}.'],
    ['Pode chegar do jeito que estiver', 'Com sono, com pressa, com dúvida. A leitura cabe em qualquer dia.'],
    ['Um convite sem prazo', 'Quando sentir vontade, a próxima leitura é {leitura}.'],
    ['Passou um tempo, tudo bem', 'Os dias que você leu continuam marcados. Dá pra seguir quando quiser.'],
    ['Uma história te esperando', 'Quando voltar, a reflexão que vem se chama “{tema}”'],
    ['“Venham a mim”', 'Jesus chama os cansados para descansar nele (Mt 11.28). O convite continua de pé.'],
    ['Só um oi mesmo', 'Sem lembrete de nada. Só pra dizer que o app continua aqui.'],
  ],
  toque: [
    ['{amigo} te deu um toque 👊', 'Bora ler hoje? A leitura de hoje está esperando vocês.'],
    ['{amigo} lembrou de você', 'Um toque de amizade pra ler a Bíblia hoje. Responde lendo, se der.'],
    ['Toque de {amigo} chegando 👋', 'É um convite pra ler hoje. Sem pressão, só amizade.'],
    ['{amigo} passou por aqui', 'E deixou um toque pra você ler hoje. Que tal retribuir?'],
    ['Psiu! É {amigo}', 'Chegou um toque pra lembrar da leitura de hoje.'],
    ['Um toque de {amigo} 📣', 'Leitura em dupla rende mais conversa. Bora ler hoje?'],
    ['{amigo} quer te ver por aqui', 'Um toque pra lembrar que a leitura de hoje está separada.'],
    ['Notificação de amizade', '{amigo} te mandou um toque. A leitura de hoje é um bom jeito de responder.'],
    ['{amigo} te chamou 🤝', '"Duas pessoas juntas podem lucrar muito mais do que uma sozinha" (Ec 4.9).'],
    ['Olha quem lembrou de você', '{amigo} mandou um toque. Que tal ler e depois contar o que achou?'],
    ['{amigo} está torcendo por você', 'Chegou um toque. A leitura de hoje está aqui quando der.'],
    ['Toc, toc, é {amigo}', 'Um toque de amizade e um convite pra ler hoje.'],
    ['Bora, diz {amigo}', '"Animem-se uns aos outros" (1Ts 5.11). A leitura de hoje está aqui.'],
  ],
  toques: [
    ['{amigo} e mais {outros} te cutucaram 👊', 'A galera lembrou de você. A leitura de hoje está aqui.'],
    ['Chuva de toques', '{amigo} e mais {outros} lembraram de você hoje. Bora ler?'],
    ['Tem gente torcendo por você', '{amigo} e mais {outros} mandaram toques. A leitura de hoje está separada.'],
    ['Seu time chamou 📣', '{amigo} e mais {outros} te deram um toque. Que tal ler e responder?'],
  ],
  // Cutucadas com tema (Juntos > um amigo): um convite rápido para a vida fora do app.
  cutucadaCafe: [
    ['{amigo} te chamou pra um café ☕', 'Bora marcar? Combinem o dia e o lugar.'],
    ['Café com {amigo}? ☕', 'Um convite pra conversar ao vivo. Responde quando puder.'],
    ['Um café com {amigo}, que tal?', 'Café, conversa e boa companhia. Combinem o dia.'],
    ['Pausa pro café com {amigo}', 'Uma conversa ao vivo vale muito. Vê um horário bom pra vocês.'],
  ],
  cutucadaOracao: [
    ['{amigo} quer orar com você 🙏', 'Combinem um momento, nem que seja por telefone.'],
    ['{amigo} te chamou pra orar 🙏', 'Um pelo outro. Bora marcar?'],
    ['Orar com {amigo}?', '"onde dois ou três se reunirem em meu nome, eu estarei ali no meio deles" (Mt 18.20).'],
    ['Oração em dupla 🙏', '{amigo} te convidou pra orar. Pode ser rapidinho, até por mensagem de voz.'],
  ],
  cutucadaTreino: [
    ['{amigo} te chamou pra treinar 💪', 'Corpo também é cuidado. Bora combinar o treino?'],
    ['Treino com {amigo}? 💪', 'Um convite pra se mexer junto. Responde quando puder.'],
    ['{amigo} quer suar a camisa com você', 'Caminhada, corrida ou bola. Combinem o que der.'],
    ['Bora se mexer?', '{amigo} te chamou pra treinar em dupla. Vê um dia bom pra vocês.'],
  ],
  // Pedido de amizade.
  pedido: [
    ['{amigo} quer ler a Bíblia com você', 'Abre o app pra aceitar e começar a ler em dupla.'],
    ['Convite de leitura de {amigo}', 'Ler em companhia é mais leve. Abre o app pra ver e aceitar.'],
    ['Pedido de amizade de {amigo} 🤝', 'Aceita pra ler em dupla e trocar toques. Abre o app pra ver.'],
    ['{amigo} te adicionou', 'Quer ler a Bíblia com você. É só aceitar no app.'],
    ['Companhia de leitura à vista 👀', '{amigo} quer ler com você. Aceita quando quiser.'],
  ],
  // Pedido de amizade aceito.
  aceito: [
    ['{amigo} topou ler com você 🤝', 'Agora vocês são amigos aqui. Dá pra trocar toques e ler lado a lado.'],
    ['{amigo} aceitou seu convite 🎉', 'Agora vocês leem em dupla. Que tal mandar um toque de boas-vindas?'],
    ['Nova amizade no app', '{amigo} está na sua lista de amigos. Bora ler em dupla?'],
    ['Deu match de leitura 🙌', '{amigo} aceitou. Agora dá pra se animar na leitura.'],
  ],
  teste: [
    ['Tudo certo por aqui ✅', 'É assim que os lembretes do Geração Eleita vão chegar.'],
    ['Teste feito, aviso entregue', 'Se você está lendo isto, os avisos estão funcionando.'],
    ['Funcionou! 🎉', 'Os lembretes vão chegar assim, neste aparelho.'],
    ['Alô, alô, testando', 'Se apareceu aqui, os lembretes estão prontos pra chegar.'],
  ],
  propositoConvite: [
    ['{amigo} te chamou pra um propósito', '{titulo}. Abre o app pra ver e aceitar.'],
    ['Convite de {amigo} 📬', 'Um propósito novo, “{titulo}”. Dá uma olhada no app.'],
    ['Bora nessa?', '{amigo} te convidou para “{titulo}”. Abre o app pra ver.'],
    ['Propósito novo te esperando', '{amigo} quer você em “{titulo}”. Aceita se fizer sentido pra você.'],
  ],
  // Meta do grupo: depois das 18h, para quem ainda não leu, quando falta pouco. É convite,
  // nunca "o grupo depende de você".
  metaDoGrupo: [
    ['O grupo está quase lá 🙌', 'Falta pouco em {titulo}. Se der, sua leitura ajuda a fechar a meta de hoje.'],
    ['Só {faltamTexto} pra meta do grupo 🎯', '{titulo} está pertinho. Bora ler também?'],
    ['Reta final do grupo 🏁', 'Em {titulo}, só {faltamTexto} para a meta de hoje. Quer fazer parte?'],
    ['A turma está lendo 📖', 'O pessoal de {titulo} já avançou hoje. A sua leitura também está separada.'],
    ['Meta do grupo à vista', '{titulo} está a {faltamTexto} da meta. Sem pressão, só convite.'],
    ['Seu grupo mandou um oi', 'Em {titulo}, a meta de hoje está quase batida. Quer ler também?'],
    ['Leitura em grupo rende', '"Como é bom e agradável quando os irmãos vivem em união!" (Sl 133.1). A meta está pertinho.'],
    ['Quase lá, em grupo', 'Faltam poucas leituras em {titulo}. A sua conta, se der.'],
    ['Time da leitura chamando 📣', 'Em {titulo}, falta pouco pra meta de hoje. Topa ler agora?'],
    ['A meta de hoje está pertinho', 'Só {faltamTexto} em {titulo}. Se hoje não der, tudo bem também.'],
    ['Grupo animado hoje', 'O pessoal de {titulo} está lendo. Quer entrar na roda?'],
    ['Convite do grupo 🤝', 'Falta pouquinho em {titulo}. Sua leitura de hoje entra na conta.'],
    ['Ler em grupo é outra coisa', 'Hoje {titulo} está pertinho da meta. Quer somar com a sua leitura?'],
  ],
  // O corpo não diz "leem": o propósito pode ser de oração.
  propositoAceito: [
    ['{amigo} entrou no propósito 🙌', '{titulo}. Agora vocês seguem lado a lado.'],
    ['Mais gente no propósito', '{amigo} topou “{titulo}”. Que bom ter companhia.'],
    ['{amigo} disse sim 🤝', 'Agora “{titulo}” tem mais uma pessoa.'],
    ['Propósito com reforço', '{amigo} entrou em “{titulo}”. Dá um oi pra receber bem.'],
  ],
  // "Quero conversar com alguém", do Conhecer Jesus: só quem convidou (e o líder da célula
  // dela, se houver) recebe, e nunca o que a pessoa escreveu. Assunto sério, sem emoji.
  // Aqui {nome} é quem pediu a conversa, não quem recebe.
  querConversar: [
    ['{nome} quer conversar sobre Jesus', 'Chame essa pessoa para uma conversa, do jeito que vocês costumam falar.'],
    ['Um pedido de conversa de {nome}', 'É sobre Jesus. Procure essa pessoa com calma, do jeito que vocês costumam falar.'],
    ['{nome} pediu para falar com você', 'O assunto é Jesus. Uma conversa simples, pessoalmente ou por mensagem, já ajuda.'],
    ['Conversa sobre Jesus', '{nome} quer conversar com você sobre isso. Combine um momento tranquilo.'],
  ],
  // Da lição do batismo nos Primeiros passos: mesmo cuidado do querConversar.
  querBatismo: [
    ['{nome} quer falar sobre o batismo', 'Procure essa pessoa para uma conversa, do jeito que vocês costumam falar.'],
    ['Uma conversa sobre batismo', '{nome} pediu para conversar com você sobre o batismo. Combine um momento com calma.'],
    ['{nome} pediu uma conversa', 'O assunto é o batismo. Procure essa pessoa quando puder, com calma.'],
    ['Pedido de conversa de {nome}', 'É sobre o batismo. Uma conversa simples, pessoalmente ou por mensagem.'],
  ],
  metaBatida: [
    ['O grupo bateu a meta de hoje 🎉', '{titulo}. Vocês chegaram lá em grupo.'],
    ['Meta do grupo batida 🙌', 'Deu certo em {titulo}. Obrigado por fazer parte!'],
    ['Que dia bom pro grupo ✨', '"Quando outros estiverem alegres, alegrem-se com eles" (Rm 12.15). A meta foi batida!'],
    ['Meta cumprida 🎯', 'Hoje {titulo} chegou lá. Bonito de ver.'],
    ['Missão do dia feita', 'O grupo de {titulo} bateu a meta. Comemorem do jeito de vocês.'],
  ],
  // Discipulado (Mateus 28.19-20; 2 Tm 2.2): assunto sério, sem emoji, como querConversar.
  discipuladoConvite: [
    ['{amigo} quer caminhar com você na fé', 'Abra o app para ver o convite.'],
    ['Convite de discipulado de {amigo}', 'Abra o app para ver o convite e responder com calma.'],
    ['Um convite de {amigo}', 'É para caminharem lado a lado na fé. Veja no app e responda quando puder.'],
    ['Caminhar na fé com {amigo}', '{amigo} enviou um convite de discipulado. Abra o app para ver.'],
  ],
  discipuladoAceito: [
    ['{amigo} aceitou o discipulado', 'Combinem o primeiro encontro da semana.'],
    ['Discipulado começando', '{amigo} aceitou caminhar com você na fé. Combinem um primeiro encontro.'],
    ['Resposta de {amigo}', '{amigo} disse sim ao discipulado. Que tal marcar a primeira conversa?'],
    ['Agora vocês caminham na fé', '{amigo} aceitou o convite. Combinem o dia do primeiro encontro.'],
  ],
  // Cuidado mútuo (Atos 2.42; 2.44-45): assunto sério, sem emoji, sem detalhe do pedido.
  pedidoConduz: [
    ['{amigo} deixou um pedido de oração', 'Abra a célula para ver.'],
    ['Novo pedido de oração', '{amigo} deixou um pedido na célula. Abra para ver.'],
    ['Um pedido de oração de {amigo}', 'Está na aba Oração da célula.'],
    ['Pedido de oração na célula', '{amigo} compartilhou um pedido. Veja na célula quando puder.'],
  ],
  possoAjudar: [
    ['{amigo} pode ajudar no seu pedido', 'Combinem pessoalmente ou no WhatsApp.'],
    ['Alguém pode ajudar', '{amigo} se ofereceu para ajudar com o seu pedido. Combinem do jeito de vocês.'],
    ['Ajuda a caminho', '{amigo} viu seu pedido e pode ajudar. Combinem pessoalmente ou por mensagem.'],
    ['{amigo} respondeu ao seu pedido', 'Pode ajudar com o que você pediu. Combinem pessoalmente ou no WhatsApp.'],
  ],
  // Alerta para quem conduz a célula: claro e sóbrio, sem detalhe nenhum do pedido.
  denunciaPerigo: [
    ['Um pedido da célula precisa de atenção', 'Abra a célula para ver o pedido.'],
    ['Atenção a um pedido da célula', 'Alguém pediu sua atenção a um pedido. Abra a célula para ver.'],
    ['Um pedido precisa de você', 'Abra a aba Oração da célula para ver.'],
    ['Pedido sinalizado na célula', 'Veja na aba Oração da célula assim que puder.'],
  ],
  // Multiplicação de célula (Atos 2.47): quem foi para a célula nova recebe só isto, uma vez.
  celulaMultiplicada: [
    ['Você está em uma célula nova', 'Agora você faz parte de {filha}. Quem lidera é {novoLider}.'],
    ['A célula multiplicou', 'Você agora está em {filha}, com {novoLider} na liderança.'],
    ['Célula nova, mesma família', 'Você faz parte de {filha}. A liderança é de {novoLider}.'],
    ['Novo começo na célula', 'Você está em {filha}. {novoLider} vai liderar o grupo.'],
  ],
  // Desafio de consagração em grupo: um convite, sem cobrança. {quem} é "você" na dupla do
  // discipulado ou "a célula X".
  desafioGrupo: [
    ['Desafio novo de {amigo}', '{amigo} chamou {quem} para “{titulo}”. Entre também na aba Desafios.'],
    ['{amigo} lançou um desafio 🏁', '“{titulo}”, para {quem}. Topa? Está na aba Desafios.'],
    ['Bora encarar um desafio?', 'É “{titulo}”, um convite de {amigo} para {quem}. Veja em Desafios.'],
    ['Desafio em grupo chegando 💪', '{amigo} convidou {quem} para “{titulo}”. Entre se fizer sentido.'],
  ],
};
export const TEXTOS = T;

const semente = (texto) => createHash('sha256').update(texto).digest().readUInt32BE(0);

// A escolha da frase, sem repetir em dias seguidos. Cada pessoa tem, para cada lista, uma
// ordem embaralhada só dela (a semente é usuário + lista), e cada dia anda uma casa nessa
// ordem: dois dias seguidos nunca caem na mesma frase, e a lista inteira passa antes de
// alguma voltar. Tudo determinístico: o mesmo usuário, lista e data dão sempre a mesma frase.
// Frase com marcador que veio vazio (sem {leitura}, sem {nome}) sai da roda naquele envio, e
// a ordem é feita só com as que cabem, para a regra dos dias seguidos continuar valendo.
const marcadores = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
const cabe = (par, d) => marcadores(par.join(' ')).every((k) => d[k] !== undefined && d[k] !== null && d[k] !== '');
const numeroDoDia = (data) => (/^\d{4}-\d{2}-\d{2}$/.test(String(data)) ? Math.round(Date.parse(data + 'T12:00:00Z') / 864e5) : 0);
function ordemDe(tamanho, chave) {
  let x = semente(chave) || 1;
  const aleatorio = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const ordem = Array.from({ length: tamanho }, (_, i) => i);
  for (let i = tamanho - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  }
  return ordem;
}
export function escolherFrase(chaveDaLista, lista, d, usuario, data) {
  const cabem = lista.filter((par) => cabe(par, d));
  const roda = cabem.length ? cabem : lista;
  const ordem = ordemDe(roda.length, usuario + '|' + chaveDaLista + '|' + roda.length);
  const passo = ((numeroDoDia(data) % roda.length) + roda.length) % roda.length;
  return roda[ordem[passo]];
}

// O que a pessoa vai ler hoje, para o aviso falar da leitura de verdade: o mesmo dia que o
// app abre (CC.diaAtual em 03-trilha.js), isto é, o dia escolhido se ainda não foi lido, ou
// o primeiro não lido. Quem já leu tudo não recebe {leitura} nem {tema}.
export function leituraDoDia(plano, reflexoes, estado = {}) {
  const lidos = new Set(((estado && estado.lidos) || []).map(Number));
  let n = Number(estado && estado.dia) || 1;
  if (n < 1 || n > plano.length || lidos.has(n)) {
    n = 0;
    for (let i = 1; i <= plano.length; i++) if (!lidos.has(i)) { n = i; break; }
  }
  if (!n) return {};
  const dia = plano[n - 1];
  const reflexao = ((reflexoes || {})[n] || [])[0];
  return { leitura: [dia.antigo, dia.novo].filter(Boolean).join(' · '), tema: (reflexao && reflexao.titulo) || '' };
}
const POR_EXTENSO = ['zero', 'uma', 'duas'];
const preencher = (s, d) => s.replace(/\{(\w+)\}/g, (_, k) => (d[k] === undefined || d[k] === '' ? '' : String(d[k])))
  .replace(/\s+([!?.,])/g, '$1').replace(/,\s*!/g, '!').replace(/\s{2,}/g, ' ').trim();

// Monta a notificação pronta: título, corpo, tag (quem tem a mesma tag se substitui no
// celular) e para onde o toque na notificação leva.
export function montarMensagem(tipo, dados = {}, { usuario = '', data = '', nome = '' } = {}) {
  // {nome} é quem recebe, menos no querConversar e no querBatismo, em que é quem pediu a
  // conversa: ali o nome que veio nos dados vale. Antes o nome de quem recebia passava por
  // cima, e a pessoa lia o próprio nome no aviso ("Ana quer conversar com você").
  const d = { ...dados, nome: dados.nome ? primeiroNome(dados.nome) : primeiroNome(nome) };
  let chave = tipo;
  let url = './#/';
  let tag = tipo;
  if (tipo === 'lembrete') {
    const n = dados.ofensiva || 0;
    const marco = MARCOS.find((m) => m === n + 1);
    const domingo = data && new Date(data + 'T12:00:00Z').getUTCDay() === 0;
    // O horário manda no tom: de manhã e ao meio-dia é convite com Escritura; à noite
    // entra o repertório de sempre, que fala da ofensiva e do marco por vir.
    const cedo = dados.slot !== undefined && dados.slot <= LEMBRETE_MEIO;
    if (cedo) chave = dados.slot <= LEMBRETE_MANHA ? 'lembreteManha' : 'lembreteMeio';
    else chave = marco ? 'lembreteMarco' : (n >= 1 ? 'lembreteComOfensiva' : (domingo ? 'lembreteDomingo' : 'lembreteSemOfensiva'));
    Object.assign(d, { n, marco });
    tag = 'lembrete';
  }
  if (tipo === 'ofensiva' || tipo === 'escudo') { d.n = dados.ofensiva || 0; tag = 'lembrete'; }
  if (d.n !== undefined) d.nDias = d.n === 1 ? '1 dia' : d.n + ' dias';
  if (tipo === 'volta') {
    const n = Number(dados.dias) || 0;
    chave = T['volta' + n] ? 'volta' + n : (n < 7 ? 'voltaDiario' : n < 14 ? 'voltaValor' : 'voltaSaudade');
    tag = 'lembrete';
  }
  if (tipo === 'toque') {
    if ((dados.outros || 0) > 0) chave = 'toques';
    tag = 'toque';
  }
  if (tipo === 'pedido' || tipo === 'aceito') { url = './#/amigos'; tag = tipo + ':' + (dados.amigoUsuario || ''); }
  if (tipo.startsWith('cutucada')) { url = './#/novidades'; tag = tipo + ':' + (dados.amigoUsuario || ''); }
  if (tipo === 'querConversar') { url = './#/amigos'; tag = 'querConversar:' + (dados.deUsuario || ''); }
  if (tipo === 'querBatismo') { url = './#/amigos'; tag = 'querBatismo:' + (dados.deUsuario || ''); }
  // A célula mora no Juntos; duplas e grupos, em Juntos > Propósitos.
  const telaDoProposito = dados.celula ? './#/novidades' : './#/novidades/propositos';
  if (tipo === 'propositoConvite' || tipo === 'propositoAceito') { url = telaDoProposito; tag = 'proposito:' + (dados.id || ''); }
  // A meta batida usa a mesma tag do "falta pouco": no celular, a boa notícia substitui o recado.
  if (tipo === 'metaDoGrupo' || tipo === 'metaBatida') { url = telaDoProposito; tag = 'grupo:' + (dados.id || ''); }
  if (tipo === 'metaDoGrupo') {
    const f = Number(dados.faltam) || 0;
    d.faltamTexto = f > 0 ? (POR_EXTENSO[f] || f) + (f === 1 ? ' leitura' : ' leituras') : '';
  }
  // Discipulado tem aba própria (ou some por trás de #/perfil/discipulado para quem ainda
  // não a tem na barra): o toque na notificação leva direto para lá, nunca para o Feed.
  if (tipo === 'discipuladoConvite' || tipo === 'discipuladoAceito') { url = './#/discipulado'; tag = tipo + ':' + (dados.amigoUsuario || ''); }
  // Cuidado mútuo mora na célula (aba Oração), nunca no Feed: com o id da célula, o toque na
  // notificação leva direto para lá; sem ele (aviso antigo, ainda na fila), cai no Juntos.
  if (tipo === 'pedidoConduz' || tipo === 'possoAjudar' || tipo === 'denunciaPerigo') {
    url = dados.celula ? './#/novidades/celula/' + encodeURIComponent(dados.celula) + '/oracao' : './#/novidades';
    tag = tipo;
  }
  // A multiplicação leva direto para a célula nova, na aba Hoje (onde o aviso discreto mora).
  if (tipo === 'celulaMultiplicada') {
    url = dados.id ? './#/novidades/celula/' + encodeURIComponent(dados.id) : './#/novidades';
    tag = tipo + ':' + (dados.id || '');
  }
  if (tipo === 'desafioGrupo') {
    d.quem = !dados.grupo ? 'você' : /^c[ée]lula\b/i.test(dados.grupo) ? 'a ' + dados.grupo : 'a célula ' + dados.grupo;
    url = './#/missoes';
    tag = 'desafioGrupo:' + (dados.amigoUsuario || '');
  }
  const lista = T[chave];
  if (!lista) throw new Error('tipo de notificação desconhecido: ' + tipo);
  const [titulo, corpo] = escolherFrase(chave, lista, d, usuario, data);
  return { titulo: preencher(titulo, d), corpo: preencher(corpo, d), tag, url };
}

export const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';

// ---------------------------------------------------------------- guarda
// No banco (push_inscricoes, push_preferencias, push_historico): um aparelho por linha,
// as preferências e o histórico do que já saiu, para as regras de limite sobreviverem a um
// reinício. O notificacoes.json antigo é importado uma vez.
// Quantos avisos cada pessoa guarda na caixa do sino (os mais antigos saem).
export const CAIXA_MAX = 60;

export class Notificacoes {
  constructor(arquivo) {
    this.arquivo = arquivo;
    this.dados = { versao: 1, inscricoes: {}, preferencias: {}, historico: {}, caixa: {} };
  }

  async carregar() {
    const { db, legado } = abrirModulo(this.arquivo, 'notificacoes');
    this.db = db;
    const t = this.lerTabelas();
    if (legado) {
      this.dados = { versao: 1, inscricoes: {}, preferencias: {}, historico: {}, caixa: {}, ...legado };
      await this.salvar();
      concluirImportacao(db, 'notificacoes', this.arquivo);
      return this;
    }
    const d = { versao: 1, inscricoes: {}, preferencias: {}, historico: {}, caixa: {} };
    for (const l of t.inscricoes) {
      (d.inscricoes[l.usuario] || (d.inscricoes[l.usuario] = [])).push({ endpoint: l.endpoint, p256dh: l.p256dh, auth: l.auth, criadaEm: l.criada_em });
    }
    for (const l of t.preferencias) d.preferencias[l.usuario] = JSON.parse(l.dados);
    for (const l of t.historico) d.historico[l.usuario] = JSON.parse(l.dados);
    for (const l of t.caixa) {
      (d.caixa[l.usuario] || (d.caixa[l.usuario] = [])).push({ id: l.id, em: l.em, tipo: l.tipo, titulo: l.titulo, corpo: l.corpo, url: l.url, lido: !!l.lido });
    }
    this.dados = d;
    return this;
  }

  lerTabelas() {
    return {
      inscricoes: lerTabela(this.db, 'push_inscricoes', ['endpoint'], 'usuario, ordem'),
      preferencias: lerTabela(this.db, 'push_preferencias', ['usuario']),
      historico: lerTabela(this.db, 'push_historico', ['usuario']),
      caixa: lerTabela(this.db, 'push_caixa', ['id'], 'usuario, em'),
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
      { tabela: 'push_caixa', chaves: ['id'], linhas: Object.entries(d.caixa || {}).flatMap(([usuario, lista]) => (lista || []).map((a) => ({
        id: a.id, usuario, em: a.em, tipo: a.tipo, titulo: a.titulo, corpo: a.corpo, url: a.url, lido: a.lido ? 1 : 0,
      }))) },
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

  // ---------- a caixa do sino ----------
  caixaDe(usuario) { return ((this.dados.caixa || {})[usuario] || []).slice().sort((a, b) => b.em - a.em); }
  naoLidos(usuario) { return this.caixaDe(usuario).filter((a) => !a.lido).length; }

  async guardarNaCaixa(usuario, tipo, mensagem, em = Date.now()) {
    if (!this.dados.caixa) this.dados.caixa = {};
    const lista = this.dados.caixa[usuario] || [];
    const id = em.toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    lista.push({ id, em, tipo: String(tipo || ''), titulo: String(mensagem.titulo || ''), corpo: String(mensagem.corpo || ''), url: String(mensagem.url || './#/'), lido: false });
    this.dados.caixa[usuario] = lista.sort((a, b) => a.em - b.em).slice(-CAIXA_MAX);
    await this.salvar();
    return id;
  }

  async marcarLidos(usuario) {
    const lista = (this.dados.caixa || {})[usuario] || [];
    if (!lista.some((a) => !a.lido)) return;
    this.dados.caixa[usuario] = lista.map((a) => ({ ...a, lido: true }));
    await this.salvar();
  }

  toquesHoje(usuario, data) {
    const h = this.historico(usuario);
    return h.data === data ? (h.toques || 0) : 0;
  }

  async apagarDe(usuario) {
    delete this.dados.inscricoes[usuario];
    delete this.dados.preferencias[usuario];
    delete this.dados.historico[usuario];
    if (this.dados.caixa) delete this.dados.caixa[usuario];
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
