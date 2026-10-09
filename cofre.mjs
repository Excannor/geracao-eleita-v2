// Cofre: o que a pessoa escreve só para si (reflexões, anotações, notas, Minha história com
// Deus) é guardado cifrado no banco, campo a campo, com AES-256-GCM.
//
// Só os textos são cifrados; a forma do progresso continua a mesma. As chaves de cada mapa
// (o dia da reflexão, "verso:João 3.16") ficam abertas, e um campo vazio continua vazio. É o
// que deixa os sinais agregados (escreveu, marcou, conquista de notas em versículos)
// funcionarem sem decifrar nada. Decifrar, só na rota do próprio dono (/api/estado).
//
// Cada texto cifrado vira { v: 1, k, iv, tag, dado }: v é a versão do formato, k a impressão
// da chave que cifrou (para a rotação), iv aleatório a cada gravação, tag a prova do GCM e
// dado o texto cifrado (o valor em JSON: string, lista ou objeto). O @ da pessoa entra como
// dado associado: um texto copiado para a linha de outra pessoa não abre.
//
// A chave: CAMINHO_CHAVE_NOTAS, 64 caracteres hexadecimais, no .env (fora da pasta de dados).
// A chave de verdade é derivada dela com HKDF e rótulo próprio. Para trocar a chave, a antiga
// vai para CAMINHO_CHAVE_NOTAS_ANTERIOR (várias, separadas por vírgula) e a nova para
// CAMINHO_CHAVE_NOTAS: na subida, tudo é recifrado com a nova (migrarEstadosCifrados).
// Sem chave: em produção (NODE_ENV=production, o Dockerfile já põe) o servidor não sobe; fora
// dela (testes e desenvolvimento) usa uma chave de teste fixa, que produção recusa.
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';
import { transacao } from './db.mjs';

// A lista dos campos cifrados: um lugar só. "*" é qualquer chave de um mapa. Para cifrar um
// campo novo, basta acrescentar o caminho dele aqui (ver docs/aprendizados.md).
export const CAMPOS_CIFRADOS = [
  'oia.*.*', // reflexões do dia: observação, interpretação, aplicação e oração
  'anotacoes.*', // anotações no material e notas nos versículos ("verso:...")
  'historia.antes', 'historia.encontro', 'historia.hoje', // Minha história com Deus
  'notas.*.texto', 'notas.*.tags', // o modelo novo de notas (quando existir)
];

const ROTULO = 'geracao-eleita/notas/v1';
const SEMENTE_DE_TESTE = createHash('sha256').update('geracao-eleita: chave de teste das notas, nunca em producao').digest('hex');

const derivar = (hex) => Buffer.from(hkdfSync('sha256', Buffer.from(hex, 'hex'), Buffer.alloc(0), Buffer.from(ROTULO), 32));
const impressao = (chave) => createHash('sha256').update(chave).digest('hex').slice(0, 8);
const HEX = /^[0-9a-f]{64}$/i;

// Devolve { atual, todas: Map(impressao -> chave), teste } ou lança erro (produção sem chave).
export function chavesDasNotas(ambiente = process.env) {
  const doAmbiente = String(ambiente.CAMINHO_CHAVE_NOTAS || '').trim();
  const producao = ambiente.NODE_ENV === 'production' && ambiente.CAMINHO_TESTE !== '1';
  if (doAmbiente && !HEX.test(doAmbiente)) throw new Error('CAMINHO_CHAVE_NOTAS precisa ter 64 caracteres hexadecimais (gere com: openssl rand -hex 32)');
  if (producao && (!doAmbiente || doAmbiente.toLowerCase() === SEMENTE_DE_TESTE)) {
    throw new Error('falta CAMINHO_CHAVE_NOTAS no .env: sem ela as anotações não podem ser cifradas. Gere com: openssl rand -hex 32 (e guarde uma cópia fora do servidor)');
  }
  const atual = derivar(doAmbiente || SEMENTE_DE_TESTE);
  const todas = new Map([[impressao(atual), atual]]);
  for (const h of String(ambiente.CAMINHO_CHAVE_NOTAS_ANTERIOR || '').split(',').map((x) => x.trim()).filter(Boolean)) {
    if (!HEX.test(h)) throw new Error('CAMINHO_CHAVE_NOTAS_ANTERIOR: cada chave precisa ter 64 caracteres hexadecimais');
    const c = derivar(h);
    if (!todas.has(impressao(c))) todas.set(impressao(c), c);
  }
  return { atual, impressao: impressao(atual), todas, teste: !doAmbiente };
}

export const ehCifrado = (x) => !!x && typeof x === 'object' && !Array.isArray(x) && x.v === 1
  && typeof x.iv === 'string' && typeof x.tag === 'string' && typeof x.dado === 'string';

// Vazio não precisa de cofre: nada a esconder, e o "escreveu" continua sendo "tem texto".
const vazio = (x) => x === undefined || x === null || x === '' || (Array.isArray(x) && !x.length);

export function cifrarValor(valor, usuario, chaves) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chaves.atual, iv);
  c.setAAD(Buffer.from(String(usuario)));
  const dado = Buffer.concat([c.update(JSON.stringify(valor), 'utf8'), c.final()]);
  return { v: 1, k: chaves.impressao, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), dado: dado.toString('base64') };
}

// Dado adulterado, de outra pessoa ou de uma chave que não está mais aqui: erro, nunca um
// texto pela metade. Quem chama não grava nada por cima.
export function decifrarValor(env, usuario, chaves) {
  const chave = chaves.todas.get(env.k) || (env.k ? null : chaves.atual);
  if (!chave) throw new Error('anotação cifrada com uma chave que o servidor não tem (' + env.k + ')');
  const d = createDecipheriv('aes-256-gcm', chave, Buffer.from(env.iv, 'base64'));
  d.setAAD(Buffer.from(String(usuario)));
  d.setAuthTag(Buffer.from(env.tag, 'base64'));
  try {
    return JSON.parse(Buffer.concat([d.update(Buffer.from(env.dado, 'base64')), d.final()]).toString('utf8'));
  } catch {
    throw new Error('anotação cifrada não confere (adulterada ou de outra conta)');
  }
}

// Visita cada campo da lista no estado e troca o valor pelo que "fazer" devolver.
function percorrer(estado, fazer) {
  if (!estado || typeof estado !== 'object') return estado;
  const visitar = (obj, partes) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    const [p, ...resto] = partes;
    const chaves = p === '*' ? Object.keys(obj) : (Object.prototype.hasOwnProperty.call(obj, p) ? [p] : []);
    for (const k of chaves) {
      if (resto.length) visitar(obj[k], resto);
      else obj[k] = fazer(obj[k]);
    }
  };
  for (const caminho of CAMPOS_CIFRADOS) visitar(estado, caminho.split('.'));
  return estado;
}

const copia = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

// Para gravar: cada texto em claro é cifrado; o que já está cifrado com a chave atual fica
// como está (a mesma gravação não troca o IV à toa); com chave antiga, é recifrado.
export function selarEstado(estado, usuario, chaves) {
  return percorrer(copia(estado), (v) => {
    if (vazio(v)) return v;
    if (ehCifrado(v)) return v.k === chaves.impressao ? v : cifrarValor(decifrarValor(v, usuario, chaves), usuario, chaves);
    return cifrarValor(v, usuario, chaves);
  });
}

// Para servir ao próprio dono (e para a fusão entre aparelhos): tudo em claro.
export function abrirEstado(estado, usuario, chaves) {
  return percorrer(copia(estado), (v) => (ehCifrado(v) ? decifrarValor(v, usuario, chaves) : v));
}

// Algum texto em claro ou cifrado com chave antiga?
export function precisaSelar(estado, chaves) {
  let precisa = false;
  percorrer(copia(estado), (v) => {
    if (!vazio(v) && (!ehCifrado(v) || v.k !== chaves.impressao)) precisa = true;
    return v;
  });
  return precisa;
}

// Na subida: quem ainda tem texto em claro (contas de antes do cofre, JSON importado) ou
// cifrado com a chave anterior passa a ter tudo cifrado com a atual. Idempotente: rodar de
// novo não muda nada. Uma linha que não abre (chave perdida, dado adulterado) fica como está
// e é contada à parte, sem derrubar a subida.
export function migrarEstadosCifrados(db, chaves) {
  const linhas = db.prepare('SELECT usuario, dados FROM estados').all();
  let cifrados = 0;
  let falhas = 0;
  const gravar = db.prepare('UPDATE estados SET dados = ? WHERE usuario = ?');
  transacao(db, () => {
    for (const { usuario, dados } of linhas) {
      let estado;
      try { estado = JSON.parse(dados); } catch { continue; }
      if (!precisaSelar(estado, chaves)) continue;
      try {
        gravar.run(JSON.stringify(selarEstado(estado, usuario, chaves)), usuario);
        cifrados++;
      } catch { falhas++; }
    }
  });
  return { cifrados, falhas };
}
