// Contas: quem entra, amizades com aceite, convites, toques e denúncias.
//
// Tudo vive no banco (dados/caminho.db), nas tabelas de contas, amizades, bloqueios, toques
// e denúncias; o dados/contas.json antigo é importado uma vez. A senha nunca é guardada:
// fica só o resultado de scrypt sobre ela, com sal próprio. Quem abrir o banco não descobre
// a senha de ninguém.
//
// A regra de quem vê o quê é a mesma para todo mundo: ninguém vê ninguém sem aceite,
// ninguém é encontrado por parte do nome, e o que a pessoa escreve nunca sai da conta dela.
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { abrirModulo, concluirImportacao, lerTabela, sincronizar, transacao, gravarMeta, lerMeta } from './db.mjs';
import { LIMITE_GRUPO, LIMITE_CELULA, limiteDo, alvoValido, rotuloDoProposito } from './propositos.mjs';
import { LIMITE_DISCIPULOS, MARCOS, MOSTRAR_PADRAO, mostrarValido, dataEncontroValida, papelValido } from './discipulado.mjs';
import {
  tipoValido, destinoValido, diasValido, textoValido, limparTexto, LIMITE_ATIVOS_POR_CELULA,
  motivoDenunciaValido, venceEmDe, vencidoParaApagar, membroDeVerdade,
} from './cuidado.mjs';
import {
  ESTUDO_MAX, ESTUDO_BRUTO_MAX, TIPOS_ESTUDO, TRADUCOES, MENSAGENS as MSG_ESTUDO, semVersiculo,
  limparPerguntas, limparFonte, validarLeitura, estudoDaLinha, estudoUsado, ESTUDOS_POR_CELULA,
  limparCombinado, estudoDoDia, dataNoHistorico, combinadoDoAnterior, acessoAoEstudo, quemFaltou, cursorDe, lerCursor, ESTUDOS_POR_PAGINA,
  daMaeAteOCorte, encontrosAteOCorte,
  FILA_MAX, encontroDepois, primeiraDataDaFila, proximaDataDaFila, encaixarNaFila, reordenarFila, ajustarDatasDaFila,
  jaTeveEncontro, devePromover, limparDataDaFila,
} from './estudos.mjs';

const scrypt = promisify(scryptCb);
const CUSTO = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const TAMANHO = 64;
// Senha muito longa só serve para fazer o servidor gastar CPU no scrypt.
export const SENHA_MAX = 128;
// Mínimo de 8 para senha nova ou trocada; quem já tinha uma de 6 ou 7 continua entrando com ela.
export const SENHA_MIN = 8;
const senhaCurta = (senha) => String(senha || '').length < SENHA_MIN;
const senhaLonga = (senha) => String(senha || '').length > SENHA_MAX;

// Um link de convite aceita no máximo isto por hora: segura o link que vazou para onde não devia.
export const LIMITE_ACEITES_HORA = 30;
export const LIMITE_TOQUES_DIA = 5;
export const VALIDADE_CONVITE = 30 * 24 * 60 * 60 * 1000;

// ---------- cartas que só o servidor confirma (docs/cartas.md, seções 2 e 3) ----------
// Semeadores: uma carta por limiar de amigos que vieram pelo convite (conta nova pelo link e
// primeira lição feita, o número da Trilha do Semeador). O mesmo teto do catálogo
// (ferramentas/cartas-catalogo.mjs); o teste.mjs confere que os dois batem. Além de 100, nada.
export const LIMIARES_SEMEADORES = [1, 5, 15, 40, 100];
const FONTES_DO_SERVIDOR = /^(convite|convidado|celula|discipulado)(:|$)/;
// Antes de gravar o estado: evento novo de uma fonte do servidor (convite, convidado, célula,
// discipulado) que ele não confirma sai (e com ele a cópia da carta, que é o próprio evento). O que
// já estava gravado não é mexido. Devolve o próprio estado.
export function conferirCartasDoServidor(atual, junto, permitidas) {
  const c = junto && junto.cartas;
  if (!c) return junto;
  const antes = ((atual && atual.cartas) || {}).eventos || {};
  const ok = new Set(permitidas || []);
  for (const chave of Object.keys(c.eventos || {})) {
    if (!FONTES_DO_SERVIDOR.test(chave) || antes[chave] || ok.has(chave)) continue;
    delete c.eventos[chave];
  }
  return junto;
}
export const RECADO_MAX = 280;
// O dia e a hora do encontro no recado: vazio, ou "AAAA-MM-DDTHH:MM" de verdade (sem 31/02 nem
// 25h), de hoje até 366 dias para a frente.
export function validarQuandoDoEncontro(quando, hoje) {
  const q = String(quando || '').trim();
  if (!q) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(q);
  if (!m) throw erro('o dia e a hora do encontro não estão certos');
  const [a, me, d, h, mi] = m.slice(1).map(Number);
  const dt = new Date(Date.UTC(a, me - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== me - 1 || dt.getUTCDate() !== d || h > 23 || mi > 59) throw erro('o dia e a hora do encontro não estão certos');
  const dia = q.slice(0, 10);
  const limite = new Date(Date.parse(hoje + 'T12:00:00Z') + 366 * 86400000).toISOString().slice(0, 10);
  if (dia < hoje || dia > limite) throw erro('escolha um dia de hoje até um ano para a frente');
  return q;
}
// O teto do estudo (10.000 caracteres na fonte limpa) e os outros moram em estudos.mjs.
export { ESTUDO_MAX };
// Acolhida, adoração e testemunho são só um empurrão para a conversa: bem mais curtos que a
// Palavra, que pode ser um estudo inteiro.
export const CAMPO_4W_MAX = 300;
// Quem só está conhecendo entra sem ocupar vaga de membro: um teto próprio, menor que o da
// célula inteira, evita que a "visita" vire o jeito de furar o limite de 20.
export const LIMITE_VISITANTES = 10;
// Quantos auxiliares (além do líder) podem conduzir a célula junto.
export const LIMITE_AUXILIARES = 2;
export const FUSO_PADRAO = 'America/Sao_Paulo';
// LGPD art. 14: menor de 12 anos precisaria de consentimento dos pais, que o app não tem
// como conferir; por isso a idade mínima para ter conta é 12 anos completos.
export const IDADE_MINIMA = 12;
// Quem tem menos que isto só lidera ou auxilia uma célula depois que a liderança (o
// administrador) aprova; enquanto isso, não vê o painel com nomes dos membros.
export const MAIORIDADE = 18;
export const AGUARDANDO_APROVACAO = 'sua célula está aguardando aprovação da liderança';
export const NASCIMENTO_TRAVADO = 'a data de nascimento não muda depois do cadastro; para corrigir, fale com o suporte';
// Versão do texto de consentimento sobre dado de fé (LGPD art. 11). Mudar o texto de um
// jeito que precise de um "sim" de novo exige subir este número.
// v2: quem conduz a célula e a administração da igreja passam a ver o painel da célula com
// nomes (Módulo 5, docs/inteligencia.md §5); quem já tinha conta concorda de novo.
// v3 (política versão 3, 09/10/2026): o texto passa a citar o check-in, o que quem acompanha no
// Discipulado vê e o check-in só somado para a célula; quem já tinha conta concorda de novo.
export const CONSENTIMENTO_VERSAO = 3;
// O nome de exibição e o nome da célula ou do propósito aparecem nas notificações: com estes
// tetos, o título cabe em 40 caracteres e o corpo em 110 (teste.mjs confere o pior caso).
// Só o que é digitado agora precisa caber: o que já está salvo com mais fica como está.
export const NOME_MAX = 20;
export const TITULO_GRUPO_MAX = 24;
const tamanho = (s) => [...s].length;
// O nome digitado, sem espaço sobrando; acima do teto, erro com o motivo (nada de cortar
// sem avisar, que guardava um nome que a pessoa não escreveu).
function nomeDigitado(nome) {
  const n = String(nome || '').replace(/\s+/g, ' ').trim();
  if (tamanho(n) > NOME_MAX) throw erro('o nome pode ter até ' + NOME_MAX + ' caracteres');
  return n;
}
function tituloDigitado(titulo, oQue) {
  const t = String(titulo || '').replace(/\s+/g, ' ').trim();
  if (tamanho(t) > TITULO_GRUPO_MAX) throw erro('o nome ' + oQue + ' pode ter até ' + TITULO_GRUPO_MAX + ' caracteres');
  return t;
}
export const MOTIVOS_DENUNCIA = [
  'Insiste ou incomoda',
  'Nome ou foto impróprios',
  'Parece uma conta falsa',
  'Outro motivo',
];

// Um nome de conta vira arquivo em disco e aparece em URL: só o que é seguro nos dois.
export const nomeValido = (n) => /^[a-z0-9][a-z0-9._-]{1,29}$/.test(String(n || ''));
export const limparNome = (n) => String(n || '').trim().toLowerCase().replace(/^@/, '');
export const limparEmail = (e) => String(e || '').trim().toLowerCase();
export const emailValido = (e) => String(e || '').length <= 254
  && /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(String(e || ''));

export function fusoValido(fuso) {
  if (typeof fuso !== 'string' || !fuso || fuso.length > 60) return false;
  try { new Intl.DateTimeFormat('en-CA', { timeZone: fuso }); return true; } catch { return false; }
}

// A data de hoje no fuso de quem lê. O container roda em UTC: sem isto, depois das 21h
// de Brasília o servidor acharia que ninguém leu "hoje".
export function hojeNoFuso(fuso, agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoValido(fuso) ? fuso : FUSO_PADRAO, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(agora);
}

export function somaDias(texto, n) {
  const d = new Date(texto + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nascimentoValido(texto, hoje = hojeNoFuso(FUSO_PADRAO)) {
  const t = String(texto || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(t + 'T12:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t) return false;
  return t < hoje && t > somaDias(hoje, -365 * 120);
}

// Soma (ou subtrai) anos a uma data ISO, mantendo mês e dia. 29 de fevereiro que caia
// num ano sem esse dia vira 28: sem isso, "somaAnos" quebraria uma vez a cada 4 anos.
export function somaAnos(texto, n) {
  const [ano, mes, dia] = String(texto).split('-').map(Number);
  const novoAno = ano + n;
  const diasNoMes = new Date(Date.UTC(novoAno, mes, 0)).getUTCDate();
  const diaAjustado = String(Math.min(dia, diasNoMes)).padStart(2, '0');
  return novoAno + '-' + String(mes).padStart(2, '0') + '-' + diaAjustado;
}

// Se, na data "hoje", a pessoa já fez a idade mínima. Comparar strings ISO funciona porque
// AAAA-MM-DD em ordem alfabética é a mesma ordem cronológica.
export function idadeMinimaOk(nascimento, hoje = hojeNoFuso(FUSO_PADRAO)) {
  const t = String(nascimento || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  return t <= somaAnos(hoje, -IDADE_MINIMA);
}

async function embaralhar(senha, sal) {
  const chave = await scrypt(String(senha), sal, TAMANHO, CUSTO);
  return chave.toString('hex');
}

// Comparação de tempo constante: com === o tempo de resposta diz quantos caracteres
// bateram, e isso basta para descobrir a senha aos poucos.
export function iguais(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

// Erro com mensagem que pode ir para a tela, e o código HTTP que combina com ele.
function erro(mensagem, codigo = 400) {
  const e = new Error(mensagem);
  e.publico = true;
  e.codigo = codigo;
  return e;
}

const par = (a, b) => [a, b].sort().join('|');
const vazio = () => ({
  versao: 2, contas: {}, amizades: {}, bloqueios: {}, silenciados: {},
  convitesUsados: {}, toques: {}, denuncias: [], convitesAceites: [], propositos: {}, discipulados: {},
  pedidos: {},
});

// ---------- linhas do banco ----------
// A regra toda continua trabalhando com o mesmo objeto de antes (this.dados). Estas funções
// só traduzem entre ele e as tabelas.
const CAMPOS_CONTA = {
  usuario: 'usuario', nome: 'nome', email: 'email', nascimento: 'nascimento', fuso: 'fuso',
  sal: 'sal', senha: 'senha', criadaEm: 'criada_em', seloConvite: 'selo_convite',
};

function paraLinhas(d) {
  const contas = Object.values(d.contas).map((c) => {
    const linha = {};
    for (const [campo, coluna] of Object.entries(CAMPOS_CONTA)) linha[coluna] = c[campo] === undefined || c[campo] === null ? '' : String(c[campo]);
    const extra = {};
    for (const k of Object.keys(c)) if (!(k in CAMPOS_CONTA)) extra[k] = c[k];
    linha.extra = JSON.stringify(extra);
    return linha;
  });
  const amizades = Object.entries(d.amizades).map(([k, v]) => {
    const [a, b] = k.split('|');
    return { a, b, estado: v.estado, pediu: v.pediu, em: v.em ?? null, aceita_em: v.aceitaEm ?? null };
  });
  const listas = (mapa) => Object.entries(mapa).flatMap(([quem, alvos]) => (alvos || []).map((alvo, ordem) => ({ quem, alvo, ordem })));
  return [
    { tabela: 'contas', chaves: ['usuario'], linhas: contas },
    { tabela: 'amizades', chaves: ['a', 'b'], linhas: amizades },
    { tabela: 'bloqueios', chaves: ['quem', 'alvo'], linhas: listas(d.bloqueios) },
    { tabela: 'silenciados', chaves: ['quem', 'alvo'], linhas: listas(d.silenciados) },
    { tabela: 'convites_usados', chaves: ['nonce'], linhas: Object.entries(d.convitesUsados).map(([nonce, vence]) => ({ nonce, vence: Number(vence) })) },
    { tabela: 'toques', chaves: ['de', 'para'], linhas: Object.entries(d.toques).map(([k, dia]) => { const [de, para] = k.split('>'); return { de, para, dia }; }) },
    { tabela: 'denuncias', chaves: ['ordem'], linhas: d.denuncias.map((x, ordem) => ({ ordem, de: x.de, contra: x.contra, motivo: x.motivo, em: x.em })) },
    { tabela: 'convites_aceites', chaves: ['de', 'para'], linhas: (d.convitesAceites || []).map((x) => ({
      convite: x.convite, de: x.de, para: x.para, em: x.em, conta_nova: x.contaNova ? 1 : 0, ativado_em: x.ativadoEm || '',
    })) },
    { tabela: 'propositos', chaves: ['id'], linhas: Object.values(d.propositos || {}).map((p) => ({
      id: p.id, tipo: p.tipo, alvo: p.alvo || '', titulo: p.titulo || '', criado_por: p.criadoPor, criado_em: p.criadoEm,
      encerrado_em: p.encerradoEm || '', grupo: p.grupo ? 1 : 0, celula: p.celula ? 1 : 0,
      encontro: Number.isInteger(p.encontro) ? p.encontro : -1, recado: p.recado || '', recado_em: p.recadoEm || '', recado_quando: p.recadoQuando || '',
      // O estudo mora em celula_estudos desde a v19; a célula guarda só o ponteiro. estudo_id tem
      // de estar aqui: sincronizar regrava a linha inteira (INSERT OR REPLACE) só com estas
      // colunas, e sem ele a primeira gravação zeraria o estudo de todas as células. As quatro
      // colunas antigas vão vazias, para a linha relida do banco comparar igual à da memória.
      estudo_id: p.estudoId || '', estudo_tipo: '', estudo_ref: '', estudo_texto: '', estudo_em: '',
      estudo_acolhida: p.estudoAcolhida || '', estudo_adoracao: p.estudoAdoracao || '', estudo_testemunho: p.estudoTestemunho || '',
      // o instante da multiplicação (v21) tem de estar aqui pelo mesmo motivo do estudo_id
      mae: p.mae || '', multiplicada_em: p.multiplicadaEm || '', multiplicada_instante: p.multiplicadaInstante || '',
    })) },
    { tabela: 'proposito_membros', chaves: ['proposito', 'usuario'], linhas: Object.values(d.propositos || {}).flatMap((p) => p.membros.map((m) => ({
      proposito: p.id, usuario: m.usuario, estado: m.estado, entrou_em: m.entrouEm || '', saiu_em: m.saiuEm || '', convidado_por: m.convidadoPor || '',
      papel: m.papel || '', tornou_membro_em: m.tornouMembroEm || '',
    }))) },
    { tabela: 'liderancas', chaves: ['proposito', 'usuario', 'papel'], linhas: Object.values(d.propositos || {}).flatMap((p) => (p.aprovacoes || []).map((x) => ({
      proposito: p.id, usuario: x.usuario, papel: x.papel, estado: x.estado, pedido_em: x.pedidoEm || '',
      decidido_por: x.decididoPor || '', decidido_em: x.decididoEm || '',
    }))) },
    { tabela: 'proposito_dias', chaves: ['proposito', 'data'], linhas: Object.values(d.propositos || {}).flatMap((p) => (p.diasBatidos || []).map((data) => ({ proposito: p.id, data }))) },
    { tabela: 'celula_encontros', chaves: ['proposito', 'data'], linhas: Object.values(d.propositos || {}).flatMap((p) => (p.encontros || []).map((e) => ({
      proposito: p.id, data: e.data, visitantes: Number(e.visitantes) || 0, registrado_por: e.registradoPor || '', em: e.em || '',
      sem_encontro: e.semEncontro ? 1 : 0,
      // o estudo usado no encontro (v20) tem de estar aqui pelo mesmo motivo do estudo_id da célula:
      // sem a coluna, o INSERT OR REPLACE da primeira gravação zeraria o estudo de todos os encontros
      estudo: e.estudo || '',
    }))) },
    { tabela: 'celula_presencas', chaves: ['proposito', 'data', 'usuario'], linhas: Object.values(d.propositos || {}).flatMap((p) => (p.encontros || [])
      .flatMap((e) => (e.presentes || []).map((usuario) => ({ proposito: p.id, data: e.data, usuario })))) },
    { tabela: 'discipulados', chaves: ['id'], linhas: Object.values(d.discipulados || {}).map((x) => ({
      id: x.id, discipulador: x.discipulador, discipulo: x.discipulo, estado: x.estado, pediu: x.pediu,
      criado_em: x.criadoEm, aceito_em: x.aceitoEm || '', encerrado_em: x.encerradoEm || '',
      mostrar: JSON.stringify(x.mostrar || {}),
    })) },
    { tabela: 'discipulado_encontros', chaves: ['discipulado', 'data'], linhas: Object.values(d.discipulados || {})
      .flatMap((x) => (x.encontros || []).map((data) => ({ discipulado: x.id, data }))) },
    { tabela: 'pedidos', chaves: ['id'], linhas: Object.values(d.pedidos || {}).map((x) => ({
      id: x.id, celula: x.celula, autor: x.autor, tipo: x.tipo, destino: x.destino, texto: x.texto,
      criado_em: x.criadoEm, vence_em: x.venceEm, estado: x.estado, removido_por: x.removidoPor || '',
    })) },
    { tabela: 'pedido_gestos', chaves: ['pedido', 'usuario', 'gesto', 'data'], linhas: Object.values(d.pedidos || {})
      .flatMap((x) => (x.gestos || []).map((g) => ({ pedido: x.id, usuario: g.usuario, gesto: g.gesto, data: g.data }))) },
    { tabela: 'pedido_denuncias', chaves: ['pedido', 'usuario'], linhas: Object.values(d.pedidos || {})
      .flatMap((x) => (x.denuncias || []).map((n) => ({ pedido: x.id, usuario: n.usuario, motivo: n.motivo, em: n.em }))) },
  ];
}

function lerTabelas(db) {
  return {
    contas: lerTabela(db, 'contas', ['usuario']),
    amizades: lerTabela(db, 'amizades', ['a', 'b']),
    bloqueios: lerTabela(db, 'bloqueios', ['quem', 'alvo'], 'quem, ordem'),
    silenciados: lerTabela(db, 'silenciados', ['quem', 'alvo'], 'quem, ordem'),
    convites: lerTabela(db, 'convites_usados', ['nonce']),
    toques: lerTabela(db, 'toques', ['de', 'para']),
    denuncias: lerTabela(db, 'denuncias', ['ordem'], 'ordem'),
    aceites: lerTabela(db, 'convites_aceites', ['de', 'para'], 'em'),
    propositos: lerTabela(db, 'propositos', ['id'], 'criado_em'),
    membros: lerTabela(db, 'proposito_membros', ['proposito', 'usuario']),
    liderancas: lerTabela(db, 'liderancas', ['proposito', 'usuario', 'papel'], 'pedido_em'),
    diasBatidos: lerTabela(db, 'proposito_dias', ['proposito', 'data'], 'data'),
    encontros: lerTabela(db, 'celula_encontros', ['proposito', 'data'], 'data'),
    presencas: lerTabela(db, 'celula_presencas', ['proposito', 'data', 'usuario']),
    discipulados: lerTabela(db, 'discipulados', ['id'], 'criado_em'),
    discipuladoEncontros: lerTabela(db, 'discipulado_encontros', ['discipulado', 'data'], 'data'),
    pedidos: lerTabela(db, 'pedidos', ['id'], 'criado_em'),
    pedidoGestos: lerTabela(db, 'pedido_gestos', ['pedido', 'usuario', 'gesto', 'data'], 'data'),
    pedidoDenuncias: lerTabela(db, 'pedido_denuncias', ['pedido', 'usuario'], 'em'),
  };
}

function deLinhas(t, versao) {
  const d = vazio();
  d.versao = Number(versao) || 2;
  for (const l of t.contas) {
    const c = {};
    for (const [campo, coluna] of Object.entries(CAMPOS_CONTA)) c[campo] = l[coluna];
    d.contas[l.usuario] = { ...c, ...JSON.parse(l.extra || '{}') };
  }
  for (const l of t.amizades) {
    const v = { estado: l.estado, pediu: l.pediu };
    if (l.em !== null) v.em = l.em;
    if (l.aceita_em !== null) v.aceitaEm = l.aceita_em;
    d.amizades[l.a + '|' + l.b] = v;
  }
  for (const l of t.bloqueios) (d.bloqueios[l.quem] || (d.bloqueios[l.quem] = [])).push(l.alvo);
  for (const l of t.silenciados) (d.silenciados[l.quem] || (d.silenciados[l.quem] = [])).push(l.alvo);
  for (const l of t.convites) d.convitesUsados[l.nonce] = Number(l.vence);
  for (const l of t.toques) d.toques[l.de + '>' + l.para] = l.dia;
  d.denuncias = t.denuncias.map((l) => ({ de: l.de, contra: l.contra, motivo: l.motivo, em: l.em }));
  d.convitesAceites = (t.aceites || []).map((l) => ({
    convite: l.convite, de: l.de, para: l.para, em: l.em, contaNova: !!l.conta_nova, ativadoEm: l.ativado_em || '',
  }));
  for (const l of t.propositos || []) {
    d.propositos[l.id] = {
      id: l.id, tipo: l.tipo, alvo: l.alvo || '', titulo: l.titulo || '', criadoPor: l.criado_por, criadoEm: l.criado_em,
      encerradoEm: l.encerrado_em || '', grupo: !!l.grupo, celula: !!l.celula,
      encontro: l.encontro === undefined || l.encontro === null ? -1 : Number(l.encontro), recado: l.recado || '', recadoEm: l.recado_em || '', recadoQuando: l.recado_quando || '',
      estudoId: l.estudo_id || '',
      estudoAcolhida: l.estudo_acolhida || '', estudoAdoracao: l.estudo_adoracao || '', estudoTestemunho: l.estudo_testemunho || '',
      mae: l.mae || '', multiplicadaEm: l.multiplicada_em || '', multiplicadaInstante: l.multiplicada_instante || '',
      membros: [], diasBatidos: [], encontros: [], aprovacoes: [],
    };
  }
  for (const l of t.liderancas || []) {
    const p = d.propositos[l.proposito];
    if (p) p.aprovacoes.push({ usuario: l.usuario, papel: l.papel, estado: l.estado, pedidoEm: l.pedido_em || '', decididoPor: l.decidido_por || '', decididoEm: l.decidido_em || '' });
  }
  for (const l of t.membros || []) {
    const p = d.propositos[l.proposito];
    if (p) {
      p.membros.push({
        usuario: l.usuario, estado: l.estado, entrouEm: l.entrou_em || '', saiuEm: l.saiu_em || '', convidadoPor: l.convidado_por || '',
        papel: l.papel || '', tornouMembroEm: l.tornou_membro_em || '',
      });
    }
  }
  for (const l of t.diasBatidos || []) {
    const p = d.propositos[l.proposito];
    if (p) p.diasBatidos.push(l.data);
  }
  for (const l of t.encontros || []) {
    const p = d.propositos[l.proposito];
    if (p) {
      p.encontros.push({
        data: l.data, visitantes: Number(l.visitantes) || 0, registradoPor: l.registrado_por || '', em: l.em || '', presentes: [],
        semEncontro: !!l.sem_encontro, estudo: l.estudo || '',
      });
    }
  }
  for (const l of t.presencas || []) {
    const p = d.propositos[l.proposito];
    const encontro = p && p.encontros.find((e) => e.data === l.data);
    if (encontro) encontro.presentes.push(l.usuario);
  }
  for (const l of t.discipulados || []) {
    d.discipulados[l.id] = {
      id: l.id, discipulador: l.discipulador, discipulo: l.discipulo, estado: l.estado, pediu: l.pediu,
      criadoEm: l.criado_em, aceitoEm: l.aceito_em || '', encerradoEm: l.encerrado_em || '',
      mostrar: JSON.parse(l.mostrar || '{}'), encontros: [],
    };
  }
  for (const l of t.discipuladoEncontros || []) {
    const x = d.discipulados[l.discipulado];
    if (x) x.encontros.push(l.data);
  }
  for (const l of t.pedidos || []) {
    d.pedidos[l.id] = {
      id: l.id, celula: l.celula, autor: l.autor, tipo: l.tipo, destino: l.destino, texto: l.texto,
      criadoEm: l.criado_em, venceEm: l.vence_em, estado: l.estado, removidoPor: l.removido_por || '',
      gestos: [], denuncias: [],
    };
  }
  for (const l of t.pedidoGestos || []) {
    const r = d.pedidos[l.pedido];
    if (r) r.gestos.push({ usuario: l.usuario, gesto: l.gesto, data: l.data });
  }
  for (const l of t.pedidoDenuncias || []) {
    const r = d.pedidos[l.pedido];
    if (r) r.denuncias.push({ usuario: l.usuario, motivo: l.motivo, em: l.em });
  }
  return d;
}

// Se, na data "hoje", a pessoa ainda não fez 18 anos. Sem data (conta antiga incompleta), não
// dá para dizer: quem não completou o cadastro também não cria célula (exigirCompleto).
export function menorDeIdade(nascimento, hoje = hojeNoFuso(FUSO_PADRAO)) {
  const t = String(nascimento || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  return t > somaAnos(hoje, -MAIORIDADE);
}

// A aprovação que ainda falta para alguém conduzir a célula num papel ('lider' ou 'auxiliar'):
// o registro pendente (ou recusado), ou null quando não há nada esperando.
export function aprovacaoQueFalta(p, usuario, papel) {
  return ((p && p.aprovacoes) || []).find((x) => x.usuario === usuario && x.papel === papel && x.estado !== 'aprovada') || null;
}
// O papel em que a pessoa espera aprovação nesta célula ('lider', 'auxiliar' ou '').
export function aguardandoAprovacao(p, usuario) {
  if (!p || !usuario) return '';
  if (p.criadoPor === usuario) return aprovacaoQueFalta(p, usuario, 'lider') ? 'lider' : '';
  const m = p.membros.find((x) => x.usuario === usuario && x.estado === 'ativo' && x.papel === 'auxiliar');
  return m && aprovacaoQueFalta(p, usuario, 'auxiliar') ? 'auxiliar' : '';
}

function pedidoDeAprovacao(usuario, papel) {
  return { usuario, papel, estado: 'pendente', pedidoEm: new Date().toISOString(), decididoPor: '', decididoEm: '' };
}

// Quem conduz a célula: o líder e o auxiliar, enquanto forem membros ativos (quem sai perde o
// papel, e o auxiliar também se virar visitante; o @ em criadoPor sozinho não conduz nada).
// É a mesma regra para o servidor decidir o que mostrar e para
// contas.mjs decidir o que aceitar. Menor de 18 à espera da aprovação da liderança não conduz
// ainda: não vê o painel com nomes, a lista de atenção, a presença nem os pedidos reservados.
export function podeConduzir(p, usuario) {
  if (!p || !usuario) return false;
  if (p.criadoPor === usuario) return p.membros.some((m) => m.usuario === usuario && m.estado === 'ativo') && !aprovacaoQueFalta(p, usuario, 'lider');
  return p.membros.some((m) => m.usuario === usuario && m.estado === 'ativo' && m.papel === 'auxiliar')
    && !aprovacaoQueFalta(p, usuario, 'auxiliar');
}

// Quantos dias de check-in do discípulo ficam guardados (o histórico para gráficos futuros).
export const DIAS_CHECKIN = 180;

export class Contas {
  constructor(arquivo) {
    this.arquivo = arquivo;
    this.dados = vazio();
    this.gravando = Promise.resolve();
  }

  // Na primeira abertura com banco, o contas.json antigo é importado (passando pela
  // migração da versão 1, se precisar) e guardado em json-legado-*. Depois disso, tudo vem
  // das tabelas. JSON antigo ilegível para tudo: seguir com a lista vazia gravaria por cima
  // das contas de todo mundo.
  async carregar() {
    const { db, legado, bruto } = abrirModulo(this.arquivo, 'contas');
    this.db = db;
    if (legado) {
      if (legado.contas) this.dados = { ...vazio(), ...legado };
      if (this.precisaMigrar()) {
        const copia = this.arquivo.replace(/\.json$/, '') + '.v1.bak.json';
        try { await stat(copia); } catch { await writeFile(copia, bruto, 'utf8'); }
        this.migrar();
      }
      lerTabelas(db);
      this.migrarEstudosLegados();
      await this.salvar();
      concluirImportacao(db, 'contas', this.arquivo);
      await this.migrarPropositos();
      await this.pedirAprovacoesQueFaltam();
      return this;
    }
    this.dados = deLinhas(lerTabelas(db), lerMeta(db, 'contas_versao'));
    if (this.precisaMigrar()) { this.migrar(); await this.salvar(); }
    await this.migrarPropositos();
    await this.pedirAprovacoesQueFaltam();
    return this;
  }

  // O contas.json de antes do banco trazia o estudo dentro da célula (p.estudo). Ele vira a linha
  // 'l' + id de celula_estudos, como a migração v19 faz com o que já estava no banco, sem autor: na
  // época o auxiliar também preparava, e não dá para saber quem foi.
  migrarEstudosLegados() {
    const db = this.banco();
    for (const p of Object.values(this.dados.propositos || {})) {
      const e = p.estudo;
      delete p.estudo;
      if (p.estudoId === undefined) p.estudoId = '';
      if (!p.celula || !e || !e.tipo) continue;
      db.prepare("INSERT OR IGNORE INTO celula_estudos (id, proposito, tipo, ref, fonte, criado_por, criado_em) VALUES (?, ?, ?, ?, ?, '', ?)")
        .run('l' + p.id, p.id, String(e.tipo), String(e.ref || ''), String(e.texto || ''), String(e.em || p.criadoEm || new Date().toISOString()));
      p.estudoId = 'l' + p.id;
    }
  }

  precisaMigrar() {
    return this.dados.versao !== 2
      || this.lista().some((c) => Array.isArray(c.segue) || !c.seloConvite || !c.fuso);
  }

  // Da versão 1: quem se seguia dos dois lados vira amizade aceita; quem seguia sozinho
  // vira pedido pendente. Senhas e progresso não mudam, então ninguém perde a sessão.
  migrar() {
    const hoje = hojeNoFuso(FUSO_PADRAO);
    for (const a of this.lista()) {
      for (const alvo of a.segue || []) {
        const b = this.achar(alvo);
        if (!b || b.usuario === a.usuario) continue;
        const chave = par(a.usuario, b.usuario);
        if (this.dados.amizades[chave]) continue;
        const mutuo = (b.segue || []).includes(a.usuario);
        this.dados.amizades[chave] = mutuo
          ? { estado: 'ativa', pediu: a.usuario, em: hoje, aceitaEm: hoje }
          : { estado: 'pendente', pediu: a.usuario, em: hoje };
      }
    }
    for (const c of this.lista()) {
      delete c.segue;
      if (!c.seloConvite) c.seloConvite = randomBytes(6).toString('hex');
      if (!c.fuso) c.fuso = FUSO_PADRAO;
      if (c.email === undefined) c.email = '';
      if (c.nascimento === undefined) c.nascimento = '';
    }
    this.dados.versao = 2;
  }

  // A conexão do banco, para o que é lido e gravado direto, fora da foto em memória (os estudos
  // da célula). Aberta aqui pela primeira vez, a foto das tabelas é lida junto, como em salvar.
  banco() {
    if (!this.db) {
      this.db = abrirModulo(this.arquivo, 'contas').db;
      lerTabelas(this.db);
    }
    return this.db;
  }

  // Grava só as linhas que mudaram, numa transação: ou a mudança entra inteira, ou nada.
  // O banco é síncrono, então duas gravações nunca se atropelam.
  async salvar() {
    const db = this.banco();
    transacao(db, () => {
      gravarMeta(db, 'contas_versao', this.dados.versao || 2);
      sincronizar(db, paraLinhas(this.dados));
    });
  }

  lista() { return Object.values(this.dados.contas); }
  achar(usuario) { return this.dados.contas[limparNome(usuario)] || null; }
  acharPorEmail(email) {
    const e = limparEmail(email);
    return e ? this.lista().find((c) => c.email === e) || null : null;
  }
  get vazio() { return this.lista().length === 0; }
  perfilCompleto(conta) { return !!(conta && conta.email && conta.nascimento); }

  // ---------- conta ----------
  // O @ de quem apagou a conta continua guardado quando ficou numa célula: como quem a criou
  // (criadoPor) ou como quem preparou um estudo dela (celula_estudos, decisão do dono de 17/10).
  // Uma conta nova com esse @ passaria a ser a líder da célula e a autora dos estudos.
  arrobaGuardado(chave) {
    if (Object.values(this.dados.propositos || {}).some((p) => p.grupo && p.criadoPor === chave)) return true;
    return !!this.banco().prepare('SELECT 1 FROM celula_estudos WHERE criado_por = ? LIMIT 1').get(chave);
  }

  async criar(dados, { exigirPerfil = true } = {}) {
    const { usuario, senha, nome, email, nascimento, fuso } = dados || {};
    const chave = limparNome(usuario);
    if (!nomeValido(chave)) {
      throw erro('o @ aceita letras minúsculas, números, ponto, hífen e sublinhado, de 2 a 30 caracteres');
    }
    if (this.achar(chave) || (exigirPerfil && this.arrobaGuardado(chave))) throw erro('esse @ já existe');
    // Na importação de conta antiga (sem exigirPerfil) o nome que veio fica inteiro.
    const nomeLimpo = exigirPerfil ? nomeDigitado(nome) : String(nome || '').trim();
    if (exigirPerfil && !nomeLimpo) throw erro('diga como quer ser chamado');
    const mail = limparEmail(email);
    if (exigirPerfil || mail) {
      if (!emailValido(mail)) throw erro('esse e-mail não parece certo');
      if (this.acharPorEmail(mail)) throw erro('este e-mail já tem conta');
    }
    if (exigirPerfil && !nascimentoValido(nascimento)) throw erro('confira a data de nascimento');
    if (exigirPerfil && !idadeMinimaOk(nascimento)) throw erro('o Geração Eleita é para quem tem 12 anos ou mais');
    if (exigirPerfil && dados.consentimento !== true) {
      throw erro('para criar a conta, é preciso concordar com o uso dos dados sobre a sua fé');
    }
    if (senhaCurta(senha)) throw erro('a senha precisa de ' + SENHA_MIN + ' caracteres ou mais');
    if (senhaLonga(senha)) throw erro('a senha pode ter no máximo ' + SENHA_MAX + ' caracteres');

    const sal = randomBytes(16).toString('hex');
    this.dados.contas[chave] = {
      usuario: chave,
      nome: nomeLimpo || chave,
      email: mail,
      nascimento: nascimentoValido(nascimento) ? nascimento : '',
      fuso: fusoValido(fuso) ? fuso : FUSO_PADRAO,
      sal,
      senha: await embaralhar(senha, sal),
      criadaEm: hojeNoFuso(FUSO_PADRAO),
      seloConvite: randomBytes(6).toString('hex'),
    };
    // Sem exigirPerfil (importação de conta antiga), não houve tela nem consentimento para gravar.
    if (exigirPerfil) {
      this.dados.contas[chave].consentimento = { versao: CONSENTIMENTO_VERSAO, em: new Date().toISOString() };
    }
    await this.salvar();
    return this.dados.contas[chave];
  }

  // Entra com o @ ou com o e-mail.
  async conferir(login, senha) {
    const conta = this.achar(login) || this.acharPorEmail(login);
    // Mesmo sem a conta existir, gasta o tempo de um scrypt: sem isso, a resposta
    // rápida entrega quais contas existem.
    const sal = conta ? conta.sal : 'sal-de-isca-sem-uso';
    const tentativa = await embaralhar(senhaLonga(senha) ? '' : senha, sal);
    if (senhaLonga(senha)) return null;
    if (!conta) return null;
    return iguais(tentativa, conta.senha) ? conta : null;
  }

  // Completa o cadastro das contas antigas (e-mail e nascimento que faltavam) e troca o e-mail.
  // A data de nascimento, uma vez gravada, não muda mais pelo app: é ela que decide a idade
  // mínima e as regras para quem tem menos de 18 (liderar célula só com aprovação), e trocá-la
  // abriria caminho para fugir dessas regras. Correção só pelo suporte. Mandar a mesma data (ou
  // nenhuma) é aceito, para a tela de completar cadastro poder reenviar o que já tinha.
  // Trocar um e-mail que já existe exige a senha atual, conferida pelo servidor antes
  // (senhaConferida): com a sessão roubada, trocar o e-mail e pedir nova senha tomaria a conta.
  async completarPerfil(usuario, { email, nascimento, nome } = {}, { senhaConferida = false } = {}) {
    const conta = this.achar(usuario);
    if (!conta) throw erro('conta não encontrada', 404);
    const mail = email === undefined || email === null || String(email).trim() === '' ? (conta.email || '') : limparEmail(email);
    if (!emailValido(mail)) throw erro('esse e-mail não parece certo');
    const dono = this.acharPorEmail(mail);
    if (dono && dono.usuario !== conta.usuario) throw erro('este e-mail já tem conta');
    if (conta.email && mail !== conta.email && !senhaConferida) throw erro('para trocar o e-mail, confirme com a sua senha atual', 403);
    let nasc = conta.nascimento || '';
    if (nasc) {
      if (nascimento && nascimento !== nasc) throw erro(NASCIMENTO_TRAVADO, 403);
    } else {
      if (!nascimentoValido(nascimento)) throw erro('confira a data de nascimento');
      if (!idadeMinimaOk(nascimento)) throw erro('o Geração Eleita é para quem tem 12 anos ou mais');
      nasc = nascimento;
    }
    conta.email = mail;
    conta.nascimento = nasc;
    // Só troca o nome se ele veio; o que já estava salvo, mesmo maior, fica.
    const n = nome === undefined || nome === null ? '' : nomeDigitado(nome);
    if (n) conta.nome = n;
    await this.salvar();
    return conta;
  }

  // Se este pedido troca o e-mail que a conta já tinha (o servidor então pede a senha atual).
  trocaEmail(usuario, email) {
    const conta = this.achar(usuario);
    const mail = limparEmail(email);
    return !!(conta && conta.email && mail && mail !== conta.email);
  }

  async atualizarFuso(usuario, fuso) {
    const conta = this.achar(usuario);
    if (!conta || !fusoValido(fuso) || conta.fuso === fuso) return;
    conta.fuso = fuso;
    await this.salvar();
  }

  async trocarSenha(usuario, nova) {
    const conta = this.achar(usuario);
    if (!conta) throw erro('conta não encontrada', 404);
    if (senhaCurta(nova)) throw erro('a senha precisa de ' + SENHA_MIN + ' caracteres ou mais');
    if (senhaLonga(nova)) throw erro('a senha pode ter no máximo ' + SENHA_MAX + ' caracteres');
    conta.sal = randomBytes(16).toString('hex');
    conta.senha = await embaralhar(nova, conta.sal);
    await this.salvar();
    return conta;
  }

  // O "Concordo" da folha de consentimento, ou quando quem já tinha conta antiga aceita o
  // texto pela primeira vez. Grava a mesma versão que "criar" grava na conta nova.
  async registrarConsentimento(usuario) {
    const conta = this.achar(usuario);
    if (!conta) throw erro('conta não encontrada', 404);
    conta.consentimento = { versao: CONSENTIMENTO_VERSAO, em: new Date().toISOString() };
    await this.salvar();
    return conta;
  }

  // Se a conta já concordou com a versão atual do texto sobre dado de fé.
  consentiu(conta) {
    return !!(conta && conta.consentimento && conta.consentimento.versao >= CONSENTIMENTO_VERSAO);
  }

  // Sair dos outros aparelhos: um selo novo na conta invalida todos os crachás assinados antes.
  // Quem pediu recebe um crachá novo e continua dentro.
  async renovarSessao(usuario) {
    const conta = this.achar(usuario);
    if (!conta) throw erro('conta não encontrada', 404);
    conta.sessao = randomBytes(8).toString('hex');
    await this.salvar();
    return conta;
  }

  // Apagar a conta leva junto amizades, pedidos, bloqueios e toques: deixar o nome
  // pendurado faria a tela de amigos pedir ao servidor alguém que não existe.
  // ---------- check-in do discípulo (Corpo, Mente, Espírito) ----------
  // Um por pessoa por dia, de 1 (baixa) a 3 (alta), guardado por DIAS_CHECKIN dias para o
  // histórico; o discipulador vê só o último. Fica fora da foto em memória: é gravado e lido
  // direto na tabela checkins.
  async registrarCheckin(usuario, data, { corpo, mente, espirito } = {}) {
    const u = limparNome(usuario);
    const nivel = (n) => { const x = Number(n); if (![1, 2, 3].includes(x)) throw erro('escolha baixa, média ou alta'); return x; };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data || ''))) throw erro('data inválida');
    const c = nivel(corpo), m = nivel(mente), e = nivel(espirito);
    if (!this.db) this.db = abrirModulo(this.arquivo, 'contas').db;
    this.db.prepare('INSERT OR REPLACE INTO checkins (usuario, data, corpo, mente, espirito, em) VALUES (?, ?, ?, ?, ?, ?)')
      .run(u, data, c, m, e, new Date().toISOString());
    this.db.prepare('DELETE FROM checkins WHERE usuario = ? AND data < ?').run(u, somaDias(data, -DIAS_CHECKIN));
    return { data, corpo: c, mente: m, espirito: e };
  }

  ultimoCheckin(usuario) {
    if (!this.db) this.db = abrirModulo(this.arquivo, 'contas').db;
    const l = this.db.prepare('SELECT data, corpo, mente, espirito FROM checkins WHERE usuario = ? ORDER BY data DESC LIMIT 1').get(limparNome(usuario));
    return l ? { data: l.data, corpo: l.corpo, mente: l.mente, espirito: l.espirito } : null;
  }

  // ---------- desafio de consagração em grupo ----------
  // Como o check-in, fica fora da foto em memória: gravado e lido direto na tabela.
  desafiosDoGrupo(tipo, grupo) {
    if (!this.db) this.db = abrirModulo(this.arquivo, 'contas').db;
    return this.db.prepare('SELECT * FROM desafios_grupo WHERE tipo = ? AND grupo = ? ORDER BY inicio DESC, em DESC')
      .all(String(tipo), String(grupo)).map((l) => ({
        id: l.id, tipo: l.tipo, grupo: l.grupo, desafio: l.desafio, inicio: l.inicio, criadoPor: l.criado_por, em: l.em, encerradoEm: l.encerrado_em,
      }));
  }
  async iniciarDesafioDoGrupo({ tipo, grupo, desafio, inicio, criadoPor }) {
    if (!this.db) this.db = abrirModulo(this.arquivo, 'contas').db;
    const id = randomBytes(9).toString('base64url');
    this.db.prepare('INSERT INTO desafios_grupo (id, tipo, grupo, desafio, inicio, criado_por, em) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, String(tipo), String(grupo), String(desafio), String(inicio), limparNome(criadoPor), new Date().toISOString());
    return id;
  }
  async encerrarDesafioDoGrupo(id, data) {
    if (!this.db) this.db = abrirModulo(this.arquivo, 'contas').db;
    this.db.prepare("UPDATE desafios_grupo SET encerrado_em = ? WHERE id = ? AND encerrado_em = ''").run(String(data), String(id));
  }

  async apagar(usuario) {
    const chave = limparNome(usuario);
    if (!this.dados.contas[chave]) throw erro('conta não encontrada', 404);
    if (this.db) this.db.prepare('DELETE FROM checkins WHERE usuario = ?').run(chave);
    if (this.db) this.db.prepare('DELETE FROM desafios_grupo WHERE criado_por = ?').run(chave);
    delete this.dados.contas[chave];
    for (const k of Object.keys(this.dados.amizades)) {
      if (k.split('|').includes(chave)) delete this.dados.amizades[k];
    }
    delete this.dados.bloqueios[chave];
    delete this.dados.silenciados[chave];
    for (const mapa of [this.dados.bloqueios, this.dados.silenciados]) {
      for (const u of Object.keys(mapa)) mapa[u] = mapa[u].filter((x) => x !== chave);
    }
    for (const k of Object.keys(this.dados.toques)) {
      if (k.split('>').includes(chave)) delete this.dados.toques[k];
    }
    // quem foi trazido por esta conta, ou a trouxe, deixa de contar na Trilha do Semeador
    this.dados.convitesAceites = (this.dados.convitesAceites || []).filter((x) => x.de !== chave && x.para !== chave);
    // sai de todos os propósitos. A dupla é relação de duas pontas só, como o discipulado: sem
    // ela, some inteira (ficar encerrada guardaria o @ dela em criadoPor para sempre). O grupo
    // fica, e acaba se sobrar menos de duas pessoas.
    for (const [id, p] of Object.entries(this.dados.propositos || {})) {
      if (!p.membros.some((m) => m.usuario === chave)) continue;
      if (!p.grupo) { delete this.dados.propositos[id]; continue; }
      p.membros = p.membros.filter((m) => m.usuario !== chave);
      p.aprovacoes = (p.aprovacoes || []).filter((x) => x.usuario !== chave);
      if (!p.encerradoEm && this.presentes(p).length < 2) p.encerradoEm = hojeNoFuso(FUSO_PADRAO);
    }
    // os estudos que a pessoa preparou (celula_estudos) ficam na célula com o @ dela, de propósito
    // (decisão do dono, 17/10; a política de privacidade diz isso): a tela mostra o @ no lugar do nome.
    // Os que ela deixou na fila, que a célula nunca recebeu, saem com ela (docs/a-mesa-fila.md, F9).
    if (this.db) this.db.prepare("DELETE FROM celula_estudos WHERE criado_por = ? AND agendado_para != ''").run(chave);
    // sai da lista de presentes de qualquer encontro já registrado; o encontro em si (quem
    // registrou, quantas pessoas vieram) continua de pé
    for (const p of Object.values(this.dados.propositos || {})) {
      for (const e of p.encontros || []) e.presentes = e.presentes.filter((u) => u !== chave);
    }
    // discipulado é relação de duas pontas só: some com a pessoa, dos dois lados, com os encontros
    for (const id of Object.keys(this.dados.discipulados || {})) {
      const x = this.dados.discipulados[id];
      if (x.discipulador === chave || x.discipulo === chave) delete this.dados.discipulados[id];
    }
    // cuidado mútuo: os pedidos da pessoa somem inteiros (com gestos e denúncias deles); o
    // gesto ou a denúncia que ela deixou no pedido de outra pessoa também some, mas o pedido
    // de quem não é ela continua de pé
    for (const id of Object.keys(this.dados.pedidos || {})) {
      const r = this.dados.pedidos[id];
      if (r.autor === chave) { delete this.dados.pedidos[id]; continue; }
      r.gestos = r.gestos.filter((g) => g.usuario !== chave);
      r.denuncias = r.denuncias.filter((n) => n.usuario !== chave);
    }
    await this.salvar();
    return chave;
  }

  // ---------- amizade ----------
  exigirCompleto(usuario) {
    const conta = this.achar(usuario);
    if (!conta) throw erro('conta não encontrada', 404);
    if (!this.perfilCompleto(conta)) throw erro('complete seu cadastro primeiro', 403);
    return conta;
  }

  amizade(a, b) { return this.dados.amizades[par(limparNome(a), limparNome(b))] || null; }
  bloqueou(quem, alvo) { return (this.dados.bloqueios[quem] || []).includes(alvo); }
  algumBloqueio(a, b) { return this.bloqueou(a, b) || this.bloqueou(b, a); }

  // Quantos amigos a pessoa tem. Não há mais limite: serve só para mostrar.
  ativasDe(usuario) {
    return Object.entries(this.dados.amizades)
      .filter(([k, v]) => v.estado === 'ativa' && k.split('|').includes(usuario)).length;
  }

  relacao(eu, outro) {
    if (this.bloqueou(eu, outro)) return 'bloqueado';
    const a = this.amizade(eu, outro);
    if (!a) return 'nenhuma';
    if (a.estado === 'ativa') return 'amigos';
    return a.pediu === eu ? 'enviado' : 'recebido';
  }

  // Busca só pelo @ exato. Quem bloqueou você, ou ainda não completou o cadastro,
  // responde igual a quem não existe.
  procurar(eu, termo) {
    const alvo = this.achar(termo);
    if (!alvo || alvo.usuario === eu || !this.perfilCompleto(alvo) || this.bloqueou(alvo.usuario, eu)) {
      return null;
    }
    return { usuario: alvo.usuario, nome: alvo.nome, relacao: this.relacao(eu, alvo.usuario) };
  }

  async pedir(eu, outro, hoje) {
    const a = this.exigirCompleto(eu);
    const b = this.achar(outro);
    if (!b || b.usuario === a.usuario || !this.perfilCompleto(b)) throw erro('não achei ninguém com esse @', 404);
    // Bloqueio é silencioso: quem foi bloqueado vê o pedido como enviado, e só.
    if (this.algumBloqueio(a.usuario, b.usuario)) return 'enviado';
    const rel = this.relacao(a.usuario, b.usuario);
    if (rel === 'amigos' || rel === 'enviado') return rel;
    if (rel === 'recebido') { await this.aceitar(a.usuario, b.usuario, hoje); return 'amigos'; }
    this.dados.amizades[par(a.usuario, b.usuario)] = { estado: 'pendente', pediu: a.usuario, em: hoje };
    await this.salvar();
    return 'enviado';
  }

  async aceitar(eu, de, hoje) {
    const a = this.exigirCompleto(eu);
    const am = this.dados.amizades[par(a.usuario, limparNome(de))];
    if (!am || am.estado !== 'pendente' || am.pediu === a.usuario) throw erro('esse pedido não existe mais', 404);
    am.estado = 'ativa';
    am.aceitaEm = hoje;
    await this.salvar();
  }

  async removerPendente(eu, outro, quemPediu) {
    const chave = par(limparNome(eu), limparNome(outro));
    const am = this.dados.amizades[chave];
    if (am && am.estado === 'pendente' && am.pediu === quemPediu) {
      delete this.dados.amizades[chave];
      await this.salvar();
    }
  }
  recusar(eu, de) { return this.removerPendente(eu, de, limparNome(de)); }
  cancelar(eu, para) { return this.removerPendente(eu, para, limparNome(eu)); }

  async desfazer(eu, outro) {
    const chave = par(limparNome(eu), limparNome(outro));
    if (this.dados.amizades[chave]) {
      delete this.dados.amizades[chave];
      this.encerrarDuplas(limparNome(eu), limparNome(outro));
      await this.salvar();
    }
  }

  async bloquear(eu, outro) {
    const a = this.achar(eu);
    const b = this.achar(outro);
    if (!a || !b || a.usuario === b.usuario) throw erro('conta não encontrada', 404);
    delete this.dados.amizades[par(a.usuario, b.usuario)];
    // quem bloqueia encerra as duplas com a pessoa e sai dos grupos que divide com ela
    this.encerrarDuplas(a.usuario, b.usuario);
    this.sairDeGruposCom(a.usuario, b.usuario);
    delete this.dados.toques[a.usuario + '>' + b.usuario];
    delete this.dados.toques[b.usuario + '>' + a.usuario];
    const lista = this.dados.bloqueios[a.usuario] || (this.dados.bloqueios[a.usuario] = []);
    if (!lista.includes(b.usuario)) lista.push(b.usuario);
    await this.salvar();
  }

  async desbloquear(eu, outro) {
    const lista = this.dados.bloqueios[limparNome(eu)] || [];
    this.dados.bloqueios[limparNome(eu)] = lista.filter((x) => x !== limparNome(outro));
    await this.salvar();
  }

  async silenciar(eu, de, ligado) {
    const chave = limparNome(eu);
    const lista = (this.dados.silenciados[chave] || []).filter((x) => x !== limparNome(de));
    if (ligado) lista.push(limparNome(de));
    this.dados.silenciados[chave] = lista;
    await this.salvar();
  }
  silenciou(eu, de) { return (this.dados.silenciados[eu] || []).includes(de); }

  listas(eu) {
    const saida = { amigos: [], recebidos: [], enviados: [], bloqueados: [] };
    for (const [k, v] of Object.entries(this.dados.amizades)) {
      const [x, y] = k.split('|');
      if (x !== eu && y !== eu) continue;
      const outro = x === eu ? y : x;
      if (!this.achar(outro)) continue;
      if (v.estado === 'ativa') saida.amigos.push({ usuario: outro, aceitaEm: v.aceitaEm });
      else if (v.pediu === eu) saida.enviados.push(outro);
      else saida.recebidos.push(outro);
    }
    saida.bloqueados = (this.dados.bloqueios[eu] || []).filter((u) => this.achar(u));
    return saida;
  }

  // ---------- convites ----------
  // O link leva quem convidou, a validade e um número único, assinados com a chave do
  // servidor e o selo de convite da conta. Trocar o selo cancela todos os links abertos.
  // modo "conhecer": a carga leva "m", e quem entra por esse link começa no caminho de
  // 14 dias, não no plano. Adulterar o "m" na URL invalida a assinatura, como qualquer
  // outro campo da carga.
  gerarConvite(eu, assinar, agora = Date.now(), { modo } = {}) {
    const a = this.exigirCompleto(eu);
    const carga = Buffer.from(JSON.stringify({
      d: a.usuario, v: agora + VALIDADE_CONVITE, n: randomBytes(8).toString('hex'),
      ...(modo === 'conhecer' ? { m: 'conhecer' } : {}),
    })).toString('base64url');
    return {
      token: carga + '.' + assinar('convite.' + carga + '.' + a.seloConvite),
      venceEm: new Date(agora + VALIDADE_CONVITE).toISOString(),
    };
  }

  lerConvite(token, assinar, agora = Date.now()) {
    const [carga, firma, sobra] = String(token || '').split('.');
    if (!carga || !firma || sobra !== undefined) return null;
    let dado;
    try { dado = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8')); } catch { return null; }
    const dono = dado && this.achar(dado.d);
    if (!dono || !iguais(firma, assinar('convite.' + carga + '.' + dono.seloConvite))) return null;
    if (!(Number(dado.v) > agora)) return null;
    return { de: dono.usuario, nome: dono.nome, nonce: dado.n, vence: Number(dado.v), modo: dado.m === 'conhecer' ? 'conhecer' : '' };
  }

  // O link vale para quantas pessoas quiserem, por 30 dias, até quem convidou cancelar. Cada
  // aceite fica anotado, e é daí que sai a Trilha do Semeador.
  async usarConvite(eu, token, assinar, hoje, agora = Date.now(), { contaNova = false, semDupla = false } = {}) {
    const convite = this.lerConvite(token, assinar, agora);
    if (!convite) throw erro('esse convite venceu ou foi cancelado', 410);
    const a = this.exigirCompleto(eu);
    if (convite.de === a.usuario) throw erro('esse convite é seu', 400);
    if (this.algumBloqueio(a.usuario, convite.de)) throw erro('convite indisponível', 410);
    const aceites = this.dados.convitesAceites || (this.dados.convitesAceites = []);
    const naUltimaHora = aceites.filter((x) => x.convite === convite.nonce && agora - Date.parse(x.em) < 60 * 60 * 1000).length;
    if (naUltimaHora >= LIMITE_ACEITES_HORA) throw erro('esse convite foi usado muitas vezes na última hora; tente mais tarde', 429);
    if (!aceites.some((x) => x.de === convite.de && x.para === a.usuario)) {
      // Conta como pessoa trazida para o app só quem criou a conta pelo link, e uma vez só.
      const nova = contaNova && !a.convidadoPor;
      aceites.push({ convite: convite.nonce, de: convite.de, para: a.usuario, em: new Date(agora).toISOString(), contaNova: nova, ativadoEm: '' });
      if (nova) a.convidadoPor = convite.de;
    }
    // Convite "conhecer" numa conta nova sem caminho ainda: ela entra nos 14 dias, e quem
    // convidou passa a acompanhá-la. Sem dupla de plano: ela ainda não está lendo o plano.
    const paraConhecer = convite.modo === 'conhecer' && contaNova && !a.caminho;
    if (paraConhecer) { a.caminho = 'conhecer'; a.acompanhadoPor = convite.de; }
    if (this.relacao(a.usuario, convite.de) === 'amigos') {
      await this.salvar();
      return { ja: true, de: convite.de };
    }
    this.dados.amizades[par(a.usuario, convite.de)] = {
      estado: 'ativa', pediu: convite.de, em: hoje, aceitaEm: hoje,
    };
    // Convite de amigo cria só a amizade: propósito e célula têm convites próprios.
    await this.salvar();
    return { de: convite.de };
  }

  async cancelarConvites(eu) {
    const a = this.exigirCompleto(eu);
    a.seloConvite = randomBytes(6).toString('hex');
    await this.salvar();
  }

  // ---------- conhecer jesus ----------
  // "plano": a leitura da Bíblia em um ano. "conhecer": os 14 dias para quem ainda não crê.
  // A conta nova entra direto num dos dois (cadastro sem convite ou link "conhecer"); depois
  // disso, quem já tem conta troca quando quiser pela rota /api/caminho.
  async definirCaminho(usuario, caminho) {
    const conta = this.achar(usuario);
    if (!conta) throw erro('conta não encontrada', 404);
    if (caminho !== 'plano' && caminho !== 'conhecer') throw erro('caminho inválido');
    conta.caminho = caminho;
    await this.salvar();
    return conta;
  }

  // "Estou conhecendo" no cadastro, vindo do convite de um amigo ou do link de uma célula:
  // a conta entra no Conhecer Jesus e quem chamou passa a acompanhar (vê em que dia a pessoa
  // está e recebe o "Quero conversar"). Não troca um acompanhante que já exista.
  async acompanharNoConhecer(usuario, quem) {
    const a = this.achar(usuario);
    const q = this.achar(quem);
    if (!a || !q || a.usuario === q.usuario || this.algumBloqueio(a.usuario, q.usuario)) return;
    a.caminho = 'conhecer';
    if (!a.acompanhadoPor) a.acompanhadoPor = q.usuario;
    await this.salvar();
  }

  // Por onde a conta chegou (convite, conhecer, celula, direto): só para o painel agregado.
  async marcarOrigem(usuario, origem) {
    const a = this.achar(usuario);
    if (!a || a.origem) return;
    a.origem = origem;
    await this.salvar();
  }

  // Dia em que a conta abriu o app, para o painel medir quem abre (e não só quem lê). Grava
  // no máximo uma vez por dia e guarda só os últimos 90 dias, sem hora nem tela.
  async anotarAcesso(usuario, hoje) {
    const a = this.achar(usuario);
    if (!a || (a.acessos && a.acessos.at(-1) === hoje)) return;
    const corte = somaDias(hoje, -90);
    a.acessos = (a.acessos || []).filter((d) => d > corte && d < hoje).concat(hoje);
    await this.salvar();
  }

  // Pedido de conversa (Conhecer Jesus ou batismo): fica na conta de quem pediu, com a lista
  // de quem foi avisado. Quem recebeu vê no Juntos (e o líder também na aba Célula) até
  // tocar em "Já conversamos", ou por 30 dias. Só a data e os nomes, nunca texto.
  async registrarPedidoConversa(usuario, tipo, para, hoje) {
    const a = this.achar(usuario);
    if (!a) return;
    a.pedidosConversa = { ...(a.pedidosConversa || {}), [tipo]: { em: hoje, para: [...para], feito: {} } };
    await this.salvar();
  }

  pedidosConversaPara(quem, hoje) {
    const eu = limparNome(quem);
    const corte = somaDias(hoje, -30);
    const saida = [];
    for (const a of this.lista()) {
      for (const [tipo, p] of Object.entries(a.pedidosConversa || {})) {
        if (!p || !(p.para || []).includes(eu) || (p.feito || {})[eu] || p.em < corte) continue;
        if (this.algumBloqueio(eu, a.usuario)) continue;
        saida.push({ tipo, usuario: a.usuario, em: p.em });
      }
    }
    return saida.sort((x, y) => (x.em < y.em ? 1 : x.em > y.em ? -1 : 0));
  }

  async marcarConversaFeita(quem, deUsuario, tipo, hoje) {
    const eu = limparNome(quem);
    const a = this.achar(deUsuario);
    const p = a && a.pedidosConversa && a.pedidosConversa[tipo];
    if (!p || !(p.para || []).includes(eu)) throw erro('esse pedido não está mais aqui', 404);
    p.feito = { ...(p.feito || {}), [eu]: hoje };
    await this.salvar();
  }

  // "Quero conversar sobre o batismo" (lição 3 dos Primeiros passos): um pedido por dia.
  async anotarConversaBatismo(usuario, hoje) {
    const a = this.achar(usuario);
    if (!a) throw erro('conta não encontrada', 404);
    if (a.batismoConversaEm === hoje) return { ja: true };
    a.batismoConversaEm = hoje;
    await this.salvar();
    return { ja: false };
  }

  // "Quero conversar com alguém": só quem está sendo acompanhado, e no máximo um pedido
  // por dia, mesmo que a pessoa toque o botão de novo.
  async pedirConversa(usuario, hoje) {
    const a = this.achar(usuario);
    if (!a || !a.acompanhadoPor) throw erro('essa opção é para quem está no caminho de conhecer Jesus', 403);
    if (a.conversouEm === hoje) return { ja: true, de: a.acompanhadoPor };
    a.conversouEm = hoje;
    await this.salvar();
    return { ja: false, de: a.acompanhadoPor };
  }

  // Quem veio pelo link "entrou de verdade" quando conclui a primeira lição.
  async ativarConvidado(usuario, quando = new Date().toISOString()) {
    const u = limparNome(usuario);
    const aceite = (this.dados.convitesAceites || []).find((x) => x.para === u && x.contaNova && !x.ativadoEm);
    if (!aceite) return false;
    aceite.ativadoEm = quando;
    await this.salvar();
    return true;
  }

  // Quantas pessoas vieram pelo convite desta conta: conta nova, primeira lição feita e conta
  // que ainda existe. É o número da Trilha do Semeador.
  semeadorDe(usuario) {
    const u = limparNome(usuario);
    return (this.dados.convitesAceites || []).filter((x) => x.de === u && x.contaNova && x.ativadoEm && this.achar(x.para)).length;
  }

  // As chaves das fontes de carta que só o servidor sabe: os limiares de Semeadores alcançados,
  // "convidado" (veio por um convite e fez a primeira lição), a primeira presença marcada num
  // encontro de célula e o primeiro encontro de discipulado registrado. amigos: o número da
  // própria pessoa, para a tela de Semeadores; nunca o de outra.
  cartasDoServidor(usuario) {
    const u = limparNome(usuario);
    const amigos = this.semeadorDe(u);
    const chaves = LIMIARES_SEMEADORES.map((l, i) => (amigos >= l ? 'convite:tier:' + (i + 1) : '')).filter(Boolean);
    if ((this.dados.convitesAceites || []).some((x) => x.para === u && x.contaNova && x.ativadoEm)) chaves.push('convidado');
    if (Object.values(this.dados.propositos || {}).some((p) => (p.encontros || []).some((e) => (e.presentes || []).includes(u)))) chaves.push('celula:primeiro');
    if (this.discipuladosDe(u).some((x) => (x.encontros || []).length)) chaves.push('discipulado:primeiro');
    return { chaves, amigos };
  }

  // O maior nível da Trilha do Semeador que já virou marco. Só sobe.
  async anotarNivelSemeador(usuario, nivel) {
    const c = this.achar(usuario);
    if (!c || nivel <= (Number(c.semeadorNivel) || 0)) return;
    c.semeadorNivel = nivel;
    await this.salvar();
  }

  // ---------- propósitos ----------
  // Os métodos mudam o objeto em memória e gravam; as contas de dias e metas moram em
  // propositos.mjs e são feitas pelo servidor, que tem o progresso de cada um.
  presentes(p) { return p.membros.filter((m) => m.estado !== 'saiu'); }
  ativosDe(p) { return p.membros.filter((m) => m.estado === 'ativo'); }
  proposito(id) { return (this.dados.propositos || {})[String(id || '')] || null; }
  propositosAtivos() { return Object.values(this.dados.propositos || {}).filter((p) => !p.encerradoEm); }
  propositosDe(usuario) {
    const u = limparNome(usuario);
    return this.propositosAtivos().filter((p) => p.membros.some((m) => m.usuario === u && (m.estado === 'ativo' || m.estado === 'convidado')));
  }

  // O propósito de leitura em dupla que acompanha toda amizade.
  duplaPlano(a, b) {
    const par2 = [limparNome(a), limparNome(b)].sort().join('|');
    return this.propositosAtivos().find((p) => !p.grupo && p.tipo === 'plano' && !p.alvo
      && this.ativosDe(p).map((m) => m.usuario).sort().join('|') === par2) || null;
  }

  garantirDuplaPlano(a, b, desde, criadoPor = a) {
    const existe = this.duplaPlano(a, b);
    if (existe) return existe;
    const id = 'p' + randomBytes(6).toString('hex');
    const p = {
      id, tipo: 'plano', alvo: '', titulo: rotuloDoProposito('plano', ''), criadoPor, criadoEm: desde, encerradoEm: '', grupo: false,
      membros: [a, b].map((usuario) => ({ usuario, estado: 'ativo', entrouEm: desde, saiuEm: '', convidadoPor: '' })),
    };
    (this.dados.propositos || (this.dados.propositos = {}))[id] = p;
    return p;
  }

  // Antes, cada amizade ativa era um propósito de leitura em dupla. Na primeira abertura desta
  // versão ela vira esse propósito, desde o dia do aceite: a contagem de ninguém muda.
  async migrarPropositos() {
    if (lerMeta(this.db, 'propositos_migrados') !== null) return;
    for (const [k, v] of Object.entries(this.dados.amizades)) {
      if (v.estado !== 'ativa') continue;
      const [a, b] = k.split('|');
      this.garantirDuplaPlano(a, b, v.aceitaEm || v.em || hojeNoFuso(FUSO_PADRAO), v.pediu || a);
    }
    await this.salvar();
    gravarMeta(this.db, 'propositos_migrados', new Date().toISOString());
  }

  encerrarDuplas(a, b) {
    const par2 = [a, b].sort().join('|');
    for (const p of this.propositosAtivos()) {
      if (!p.grupo && p.membros.map((m) => m.usuario).sort().join('|') === par2) p.encerradoEm = hojeNoFuso(FUSO_PADRAO);
    }
  }

  sairDeGruposCom(quem, outro) {
    const hoje = hojeNoFuso(FUSO_PADRAO);
    for (const p of this.propositosAtivos()) {
      if (!p.grupo) continue;
      const nomes = this.presentes(p).map((m) => m.usuario);
      if (!nomes.includes(quem) || !nomes.includes(outro)) continue;
      const m = p.membros.find((x) => x.usuario === quem);
      m.estado = 'saiu';
      m.saiuEm = hoje;
      if (this.presentes(p).length < 2) p.encerradoEm = hoje;
    }
  }

  async criarProposito(eu, { tipo, alvo, titulo, com }, hoje, todosLivros) {
    const a = this.exigirCompleto(eu);
    const tituloLimpo = tituloDigitado(titulo, 'do propósito');
    const outros = [...new Set((Array.isArray(com) ? com : [com]).map(limparNome).filter((u) => u && u !== a.usuario))];
    if (!outros.length) throw erro('escolha com quem');
    if (outros.length + 1 > LIMITE_GRUPO) throw erro('um grupo tem no máximo ' + LIMITE_GRUPO + ' pessoas');
    for (const u of outros) {
      if (!this.achar(u) || this.relacao(a.usuario, u) !== 'amigos') throw erro('só dá para chamar amigos', 403);
    }
    const alvoLimpo = String(alvo || '');
    if (!alvoValido(String(tipo || ''), alvoLimpo, todosLivros)) throw erro('escolha o que vão ler ou orar');
    const conjunto = [a.usuario, ...outros].sort().join('|');
    const repetido = this.propositosAtivos().some((p) => p.tipo === tipo && (p.alvo || '') === alvoLimpo
      && this.presentes(p).map((m) => m.usuario).sort().join('|') === conjunto);
    if (repetido) throw erro('vocês já têm esse propósito');
    const id = 'p' + randomBytes(6).toString('hex');
    const p = {
      id, tipo, alvo: alvoLimpo, titulo: tituloLimpo || rotuloDoProposito(tipo, alvoLimpo),
      criadoPor: a.usuario, criadoEm: hoje, encerradoEm: '', grupo: outros.length >= 2,
      membros: [{ usuario: a.usuario, estado: 'ativo', entrouEm: hoje, saiuEm: '', convidadoPor: '' }]
        .concat(outros.map((u) => ({ usuario: u, estado: 'convidado', entrouEm: '', saiuEm: '', convidadoPor: a.usuario }))),
    };
    this.dados.propositos[id] = p;
    await this.salvar();
    return p;
  }

  async responderProposito(eu, id, aceitar, hoje) {
    const a = this.exigirCompleto(eu);
    const p = this.proposito(id);
    const m = p && !p.encerradoEm && p.membros.find((x) => x.usuario === a.usuario && x.estado === 'convidado');
    if (!m) throw erro('esse convite não existe mais', 404);
    if (aceitar) {
      m.estado = 'ativo';
      m.entrouEm = hoje;
    } else {
      p.membros = p.membros.filter((x) => x !== m);
      if (!p.grupo || this.presentes(p).length < 2) p.encerradoEm = hoje;
    }
    await this.salvar();
    return p;
  }

  async convidarParaProposito(eu, id, outro) {
    const a = this.exigirCompleto(eu);
    const p = this.proposito(id);
    if (!p || p.encerradoEm || !p.membros.some((m) => m.usuario === a.usuario && m.estado === 'ativo')) throw erro('propósito não encontrado', 404);
    if (!p.grupo) throw erro('só dá para chamar mais gente para um grupo');
    if (p.celula && aprovacaoQueFalta(p, p.criadoPor, 'lider')) throw erro('a célula está aguardando aprovação da liderança', 403);
    const u = limparNome(outro);
    if (!this.achar(u) || this.relacao(a.usuario, u) !== 'amigos') throw erro('só dá para chamar amigos', 403);
    if (this.presentes(p).some((m) => m.usuario === u)) throw erro('essa pessoa já está no grupo');
    if (this.presentes(p).length >= limiteDo(p)) throw erro('esse grupo tem no máximo ' + limiteDo(p) + ' pessoas');
    const antigo = p.membros.find((m) => m.usuario === u);
    if (antigo) Object.assign(antigo, { estado: 'convidado', entrouEm: '', saiuEm: '', convidadoPor: a.usuario });
    else p.membros.push({ usuario: u, estado: 'convidado', entrouEm: '', saiuEm: '', convidadoPor: a.usuario });
    await this.salvar();
    return p;
  }

  // ---------- célula ----------
  // A célula é um grupo de leitura do plano que nasce só com quem criou e cresce por um link:
  // o líder manda o link no grupo do WhatsApp, e quem abre entra direto, sem precisar ser
  // amigo antes (a amizade com quem mandou o link nasce junto, como num convite).
  async criarCelula(eu, { titulo } = {}, hoje) {
    const a = this.exigirCompleto(eu);
    const tituloLimpo = tituloDigitado(titulo, 'da célula');
    const id = 'p' + randomBytes(6).toString('hex');
    const p = {
      id, tipo: 'plano', alvo: '', titulo: tituloLimpo || 'Célula',
      criadoPor: a.usuario, criadoEm: hoje, encerradoEm: '', grupo: true, celula: true,
      membros: [{ usuario: a.usuario, estado: 'ativo', entrouEm: hoje, saiuEm: '', convidadoPor: '' }],
      aprovacoes: [],
    };
    // Menor de 18: a célula nasce aguardando a aprovação da liderança.
    if (menorDeIdade(a.nascimento, hoje)) p.aprovacoes.push(pedidoDeAprovacao(a.usuario, 'lider'));
    this.dados.propositos[id] = p;
    await this.salvar();
    return p;
  }

  // O link leva o grupo, quem mandou e a validade, assinados com o selo de convite de quem
  // mandou: "cancelar meus convites" também cancela os links de célula dessa pessoa.
  gerarLinkCelula(eu, id, assinar, agora = Date.now()) {
    const a = this.exigirCompleto(eu);
    const p = this.proposito(id);
    if (!p || p.encerradoEm || !p.celula || !this.ativosDe(p).some((m) => m.usuario === a.usuario)) throw erro('célula não encontrada', 404);
    // Enquanto a liderança não aprova quem lidera, a célula não chama ninguém.
    if (aprovacaoQueFalta(p, p.criadoPor, 'lider')) throw erro(p.criadoPor === a.usuario ? AGUARDANDO_APROVACAO : 'a célula está aguardando aprovação da liderança', 403);
    const carga = Buffer.from(JSON.stringify({ p: p.id, d: a.usuario, v: agora + VALIDADE_CONVITE })).toString('base64url');
    return { token: carga + '.' + assinar('celula.' + carga + '.' + a.seloConvite), venceEm: new Date(agora + VALIDADE_CONVITE).toISOString() };
  }

  lerLinkCelula(token, assinar, agora = Date.now()) {
    const [carga, firma, sobra] = String(token || '').split('.');
    if (!carga || !firma || sobra !== undefined) return null;
    let dado;
    try { dado = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8')); } catch { return null; }
    const dono = dado && this.achar(dado.d);
    if (!dono || !iguais(firma, assinar('celula.' + carga + '.' + dono.seloConvite))) return null;
    if (!(Number(dado.v) > agora)) return null;
    const p = this.proposito(dado.p);
    if (!p || p.encerradoEm || !p.celula || !this.ativosDe(p).some((m) => m.usuario === dono.usuario)) return null;
    // Quem só está conhecendo (visitante) não ocupa vaga de membro: as vagas do link são só
    // as dos 20 lugares de membro, mesmo que a célula já tenha visitantes dentro.
    const pessoas = this.presentes(p).filter((m) => m.papel !== 'visitante').length;
    return { proposito: p, de: dono.usuario, nome: dono.nome, titulo: p.titulo, pessoas, limite: limiteDo(p), vagas: Math.max(0, limiteDo(p) - pessoas) };
  }

  async entrarNaCelula(eu, token, assinar, hoje, agora = Date.now(), { contaNova = false, visitante = false } = {}) {
    const link = this.lerLinkCelula(token, assinar, agora);
    if (!link) throw erro('esse link de célula venceu ou foi cancelado', 410);
    const a = this.exigirCompleto(eu);
    const p = link.proposito;
    const minha = p.membros.find((m) => m.usuario === a.usuario);
    if (minha && minha.estado === 'ativo') return { ja: true, proposito: p, de: link.de, papel: minha.papel || '' };
    if (visitante) {
      // Visitante tem teto próprio, menor e separado do limite de membros da célula.
      const visitantesAtuais = this.ativosDe(p).filter((m) => m.papel === 'visitante').length;
      if (visitantesAtuais >= LIMITE_VISITANTES && !(minha && minha.estado === 'convidado')) {
        throw erro('essa célula já tem visitantes demais (o teto é ' + LIMITE_VISITANTES + ')', 409);
      }
    } else if (link.vagas <= 0 && !(minha && minha.estado === 'convidado')) {
      throw erro('essa célula já está cheia (' + link.limite + ' pessoas)', 409);
    }
    // A amizade com quem mandou o link passa pelo mesmo caminho de um convite: respeita
    // bloqueio, conta para o Semeador só quando é conta nova, e cria a leitura em dupla.
    let amizadeNova = false;
    if (link.de !== a.usuario && this.relacao(a.usuario, link.de) !== 'amigos') {
      const convite = this.gerarConvite(link.de, assinar, agora);
      const usado = await this.usarConvite(a.usuario, convite.token, assinar, hoje, agora, { contaNova, semDupla: true });
      amizadeNova = !usado.ja;
    }
    const papel = visitante ? 'visitante' : '';
    if (minha) Object.assign(minha, { estado: 'ativo', entrouEm: hoje, saiuEm: '', convidadoPor: link.de, papel });
    else p.membros.push({ usuario: a.usuario, estado: 'ativo', entrouEm: hoje, saiuEm: '', convidadoPor: link.de, papel });
    await this.salvar();
    return { proposito: p, de: link.de, amizadeNova, papel };
  }

  // O visitante que decide ficar: vira membro de verdade, contando na meta e no limite de 20
  // como qualquer um. Continua precisando de vaga: virar membro não é convite automático.
  async tornarMembro(eu, id, hoje) {
    const a = this.exigirCompleto(eu);
    const p = this.proposito(id);
    if (!p || p.encerradoEm || !p.celula) throw erro('célula não encontrada', 404);
    const m = p.membros.find((x) => x.usuario === a.usuario && x.estado === 'ativo' && x.papel === 'visitante');
    if (!m) throw erro('você não está como visitante nessa célula', 404);
    const membros = this.ativosDe(p).filter((x) => x.papel !== 'visitante').length;
    if (membros >= limiteDo(p)) throw erro('essa célula já está cheia (' + limiteDo(p) + ' pessoas)', 409);
    m.papel = '';
    // Guardado só para o painel pastoral agregado (Fase 5): "quantos visitantes com conta
    // passaram a membro" nas últimas semanas, sem nome nenhum, é a única razão desta data.
    m.tornouMembroEm = hoje || m.tornouMembroEm || '';
    await this.salvar();
    return p;
  }

  // ---------- o líder da célula ----------
  // Quem criou a célula é o líder: escolhe o dia do encontro, deixa um recado para todos e pode
  // tirar alguém. Ver quem leu cada dia já é de todos os membros; o líder vê a mais só o número
  // da semana do grupo inteiro, nunca uma lista de quem faltou.
  // O líder é quem criou a célula e continua nela: quem saiu (ou uma conta nova com o @ de quem
  // apagou a conta) não lidera mais nada por ter o @ em criadoPor.
  celulaDoLider(eu, id) {
    const a = this.exigirCompleto(eu);
    const p = this.proposito(id);
    if (!p || p.encerradoEm || !p.celula) throw erro('célula não encontrada', 404);
    if (p.criadoPor !== a.usuario || !this.ativosDe(p).some((m) => m.usuario === a.usuario)) throw erro('só o líder da célula pode fazer isso', 403);
    if (aprovacaoQueFalta(p, a.usuario, 'lider')) throw erro(AGUARDANDO_APROVACAO, 403);
    return p;
  }

  // O auxiliar conduz a célula junto com o líder (recado, encontro, registrar encontro,
  // atenção e oração), mas não tira gente, não marca auxiliar, não encerra e não prepara o
  // estudo (celulaDeQuemPrepara): isso continua só do líder.
  celulaDeQuemConduz(eu, id) {
    const a = this.exigirCompleto(eu);
    const p = this.proposito(id);
    if (!p || p.encerradoEm || !p.celula) throw erro('célula não encontrada', 404);
    if (aguardandoAprovacao(p, a.usuario)) throw erro(AGUARDANDO_APROVACAO, 403);
    if (!podeConduzir(p, a.usuario)) throw erro('só quem conduz a célula pode fazer isso', 403);
    return p;
  }

  async definirEncontro(eu, id, dia) {
    const p = this.celulaDeQuemConduz(eu, id);
    const n = Number(dia);
    if (!Number.isInteger(n) || n < -1 || n > 6) throw erro('escolha um dia da semana');
    p.encontro = n;
    await this.salvar();
    return p;
  }

  // "quando" (opcional) é o dia e a hora do encontro, "AAAA-MM-DDTHH:MM" na hora local da
  // célula: de hoje até um ano para a frente. Sem recado, não há "quando".
  async definirRecado(eu, id, texto, agora = new Date(), { quando = '', hoje = '' } = {}) {
    const p = this.celulaDeQuemConduz(eu, id);
    const limpo = String(texto || '').replace(/\s+/g, ' ').trim();
    if (limpo.length > RECADO_MAX) throw erro('o recado tem no máximo ' + RECADO_MAX + ' caracteres');
    const q = limpo ? validarQuandoDoEncontro(quando, hoje || agora.toISOString().slice(0, 10)) : '';
    p.recado = limpo;
    p.recadoEm = limpo ? agora.toISOString() : '';
    p.recadoQuando = q;
    await this.salvar();
    return p;
  }

  // Só o líder marca (ou tira) um auxiliar: no máximo 2, e só entre quem já é membro ativo
  // (visitante ainda não conduz nada).
  async definirAuxiliar(eu, id, usuario, sim) {
    const p = this.celulaDoLider(eu, id);
    const u = limparNome(usuario);
    if (u === p.criadoPor) throw erro('o líder já conduz a célula', 400);
    const m = p.membros.find((x) => x.usuario === u && x.estado === 'ativo');
    if (!m) throw erro('essa pessoa não está na célula', 404);
    if (sim) {
      if (m.papel === 'visitante') throw erro('quem só está conhecendo ainda não pode conduzir', 400);
      const atuais = p.membros.filter((x) => x.estado === 'ativo' && x.papel === 'auxiliar' && x.usuario !== u).length;
      if (atuais >= LIMITE_AUXILIARES) throw erro('a célula já tem ' + LIMITE_AUXILIARES + ' auxiliares', 400);
      m.papel = 'auxiliar';
      // Menor de 18 só auxilia depois da aprovação da liderança (uma aprovação já dada nesta
      // célula continua valendo se o líder tirar e marcar de novo).
      const conta = this.achar(u);
      const jaAprovada = (p.aprovacoes || []).some((x) => x.usuario === u && x.papel === 'auxiliar' && x.estado === 'aprovada');
      if (conta && menorDeIdade(conta.nascimento, hojeNoFuso(conta.fuso)) && !jaAprovada) {
        p.aprovacoes = (p.aprovacoes || []).filter((x) => !(x.usuario === u && x.papel === 'auxiliar'));
        p.aprovacoes.push(pedidoDeAprovacao(u, 'auxiliar'));
      }
    } else if (m.papel === 'auxiliar') {
      m.papel = '';
      p.aprovacoes = (p.aprovacoes || []).filter((x) => !(x.usuario === u && x.papel === 'auxiliar' && x.estado === 'pendente'));
    }
    await this.salvar();
    return p;
  }

  // ---------- o estudo da célula (À Mesa, docs/a-mesa-fase1.md) ----------
  // Só o líder prepara, muda ou tira o estudo (decisão do dono, 17/10). O auxiliar continua
  // conduzindo o resto (recado, encontro, presença, Painel), mas o estudo ele vê como membro: o
  // auxiliar, o membro, o visitante, o líder de outra célula e o administrador recebem 403. O líder
  // menor de 18 que espera a aprovação da liderança recebe o 403 dessa espera.
  celulaDeQuemPrepara(eu, id) {
    const a = this.exigirCompleto(eu);
    const p = this.proposito(id);
    if (!p || p.encerradoEm || !p.celula) throw erro('célula não encontrada', 404);
    if (p.criadoPor !== a.usuario || !this.ativosDe(p).some((m) => m.usuario === a.usuario)) throw erro(MSG_ESTUDO.soLider, 403);
    if (aprovacaoQueFalta(p, a.usuario, 'lider')) throw erro(AGUARDANDO_APROVACAO, 403);
    return p;
  }

  // O dia local de um instante no fuso do líder da célula (o fuso padrão quando a conta dele não
  // existe mais): é por ele que se conta em que dia um estudo nasceu ou deixou de ser o atual.
  diaNaCelula(p) {
    const fuso = (this.achar(p && p.criadoPor) || {}).fuso;
    return (iso) => {
      const d = new Date(iso);
      return iso && !Number.isNaN(d.getTime()) ? hojeNoFuso(fuso, d) : '';
    };
  }

  // O estudo já foi usado num encontro desta célula (estudos.mjs, estudoUsado), no fuso do líder.
  estudoJaUsado(p, e, agora = new Date()) {
    if (!p || !e) return false;
    const diaDe = this.diaNaCelula(p);
    return estudoUsado({
      id: e.id, criadoEm: e.criadoEm, nasceu: diaDe(e.criadoEm), hoje: diaDe(agora.toISOString()),
      encontro: p.encontro, encontros: p.encontros,
    });
  }

  // As linhas de uma célula em celula_estudos, do mais novo para o mais velho, só com as colunas
  // que a lista, a folha de registro e as datas usam (sem a fonte e sem as partes).
  // Os da fila (docs/a-mesa-fila.md) ficam de fora: ainda não são estudo da célula.
  estudosLeves(proposito) {
    return this.banco().prepare('SELECT id, proposito, tipo, titulo, ref, refs, plano_ate, traducao, criado_por, criado_em, editado_em, atual_ate, combinado, antes_do_historico '
      + "FROM celula_estudos WHERE proposito = ? AND agendado_para = '' ORDER BY criado_em DESC, id DESC").all(String(proposito || '')).map(estudoDaLinha);
  }

  // O que uma pessoa pode num estudo, chegando por uma célula (estudos.mjs, acessoAoEstudo). O dia
  // de cada instante conta no fuso do líder da célula do estudo (a mãe, num estudo da mãe). noDono
  // é a entrada da pessoa na célula do estudo: na própria, a de agora; na mãe, a de quando ela
  // estava lá (a filha leva quem saiu da mãe pela multiplicação).
  acessoDe(eu, e, p) {
    const u = limparNome(eu);
    if (!e || !p || !p.celula || p.encerradoEm) return acessoAoEstudo(null, null, {});
    const m = p.membros.find((x) => x.usuario === u && x.estado === 'ativo');
    const dono = e.proposito === p.id ? p : this.proposito(e.proposito);
    const noDono = dono ? dono.membros.find((x) => x.usuario === u) || null : null;
    return acessoAoEstudo(e, p, {
      ativo: !!m, papel: (m && m.papel) || '', conduz: podeConduzir(p, u),
      lidera: !!m && p.criadoPor === u && !aprovacaoQueFalta(p, u, 'lider'),
      ...this.corteDe(p), noDono, diaDe: this.diaNaCelula(dono || p),
    });
  }

  // O corte da filha nos estudos da mãe (estudos.mjs, daMaeAteOCorte): o dia e, desde a v21, o
  // instante da multiplicação. Uma célula sem mãe não tem corte.
  corteDe(p) {
    return p && p.mae ? { corte: p.multiplicadaEm || '', corteEm: p.multiplicadaInstante || '' } : { corte: '', corteEm: '' };
  }

  // Os encontros de uma célula como quem lê por p os vê: os da própria célula inteiros; os da mãe,
  // só até a multiplicação (o que a mãe fez depois é de outro grupo).
  encontrosParaLer(p, dono) {
    if (!dono) return [];
    return dono.id === (p && p.id) ? dono.encontros || [] : encontrosAteOCorte(dono.encontros, this.corteDe(p));
  }

  // Um estudo para ler (GET /api/estudos?estudo=). Sem a célula, o servidor procura por onde a pessoa
  // lê: a célula do estudo e, senão, uma filha dela em que a pessoa é membro ativo (é o caminho de
  // Minhas anotações, que só sabe o id do estudo). 403 para o visitante num estudo que não é o atual;
  // 404 para todo o resto, igual para "não existe" e "não é seu".
  // Devolve { e, p (a célula por onde lê), dono (a célula do estudo), acesso }.
  estudoParaLer(eu, estudoId, celulaId = '') {
    const u = limparNome(eu);
    const id = String(estudoId || '');
    const cid = String(celulaId || '');
    const fechado = () => erro(MSG_ESTUDO.naoAberto, 404);
    if (!id || id.length > 64 || cid.length > 64) throw fechado();
    const e = this.estudo(id);
    if (!e) throw fechado();
    const ativoEm = (x) => x.membros.some((m) => m.usuario === u && m.estado === 'ativo');
    const candidatas = cid ? [this.proposito(cid)]
      : [this.proposito(e.proposito), ...this.propositosAtivos().filter((x) => x.celula && x.mae === e.proposito && ativoEm(x))];
    let negado = 404;
    for (const p of candidatas) {
      if (!p) continue;
      const acesso = this.acessoDe(u, e, p);
      if (acesso.ler) return { e, p, dono: e.proposito === p.id ? p : this.proposito(e.proposito), acesso };
      if (acesso.codigo === 403) negado = 403;
    }
    throw negado === 403 ? erro(MSG_ESTUDO.soMembros, 403) : fechado();
  }

  // A lista de estudos anteriores (GET /api/estudos?celula=): só para os membros ativos da célula
  // (o visitante recebe 403; os outros, 404). Sem "de", os anteriores da própria célula (os que já
  // deixaram de ser o atual); com de = 'mae', os da célula mãe preparados até o dia da
  // multiplicação. Páginas de 20, do mais novo para o mais velho; antes é o cursor da página
  // anterior. Devolve { p, dono, itens: [{ e, data, dataDe }], mais, antes }.
  estudosAnteriores(eu, celulaId, { de = '', antes = '', limite = ESTUDOS_POR_PAGINA } = {}) {
    const u = limparNome(eu);
    const cid = String(celulaId || '');
    const p = cid.length <= 64 ? this.proposito(cid) : null;
    const m = p && p.celula && !p.encerradoEm ? p.membros.find((x) => x.usuario === u && x.estado === 'ativo') : null;
    if (!m) throw erro('célula não encontrada', 404);
    if (m.papel === 'visitante') throw erro(MSG_ESTUDO.soMembros, 403);
    const daMae = de === 'mae';
    const dono = daMae ? (p.mae && p.multiplicadaEm ? this.proposito(p.mae) : null) : p;
    if (!dono) throw erro('célula não encontrada', 404);
    const diaDe = this.diaNaCelula(dono);
    // a mesma regra da leitura (acessoAoEstudo), estudo a estudo: o que não abre não aparece
    let lista = this.estudosLeves(dono.id).filter((e) => (daMae || !!e.atualAte) && this.acessoDe(u, e, p).ler);
    const c = lerCursor(antes);
    if (c) lista = lista.filter((e) => e.criadoEm < c.criadoEm || (e.criadoEm === c.criadoEm && e.id < c.id));
    const n = Math.max(1, Math.min(Number(limite) || ESTUDOS_POR_PAGINA, ESTUDOS_POR_PAGINA));
    const pagina = lista.slice(0, n);
    const mais = lista.length > n;
    const encontros = this.encontrosParaLer(p, dono);
    return {
      p, dono, mais, antes: mais ? cursorDe(pagina[pagina.length - 1]) : '',
      itens: pagina.map((e) => ({ e, ...dataNoHistorico(e, encontros, diaDe) })),
    };
  }

  // A filha de uma multiplicação lê os estudos da mãe escritos até a multiplicação: o título da mãe
  // e o dia do corte, quando a pessoa (eu) abre ao menos um; senão null.
  estudosDaMae(p, eu = '') {
    if (!p || !p.mae || !p.multiplicadaEm) return null;
    const mae = this.proposito(p.mae);
    if (!mae) return null;
    const algum = this.estudosLeves(mae.id).some((e) => (eu ? this.acessoDe(eu, e, p).ler : daMaeAteOCorte(e, { ...this.corteDe(p), diaDe: this.diaNaCelula(mae) })));
    return algum ? { titulo: mae.titulo, ate: p.multiplicadaEm } : null;
  }

  // O que GET /api/propositos leva do estudo da célula além do atual (docs/a-mesa-fase2.md, 3.4).
  //   membro: a pessoa é membro ativo e não visitante (lê os anteriores); eu: o @ dela (as listas
  //   seguem a mesma regra da leitura); conduz: é quem conduz a célula (recebe a folha de
  //   registro); hoje: o dia de quem pede, que é o da folha de registro.
  // combinadoAnterior, temAnteriores e daMae, só para os membros: o visitante vê só o estudo atual,
  // e o combinado de antes é do estudo anterior (quem chegou esta semana nem estava quando ele foi
  // combinado). registro, só para quem conduz: os estudos que a folha oferece (o atual, os 3
  // anteriores mais novos e o que valia em cada dia) e os 8 dias que dá para registrar, com o
  // estudo do dia e o que já foi gravado.
  dadosDoEstudo(p, { membro = false, eu = '', conduz = false, hoje = '' } = {}, agora = new Date()) {
    const db = this.banco();
    const diaDe = this.diaNaCelula(p);
    const saida = { combinadoAnterior: null, temAnteriores: false, daMae: null };
    if (membro) {
      const atual = p.estudoId ? this.estudo(p.estudoId) : null;
      if (atual) {
        const linha = db.prepare('SELECT id, proposito, tipo, criado_em, atual_ate, combinado FROM celula_estudos '
          + "WHERE proposito = ? AND id != ? AND criado_em < ? AND agendado_para = '' ORDER BY criado_em DESC, id DESC LIMIT 1").get(p.id, atual.id, atual.criadoEm);
        saida.combinadoAnterior = combinadoDoAnterior({
          anterior: estudoDaLinha(linha), encontros: p.encontros, encontro: p.encontro, hoje: diaDe(agora.toISOString()), diaDe,
        });
      }
      const anteriores = this.estudosLeves(p.id).filter((e) => !!e.atualAte);
      saida.temAnteriores = eu ? anteriores.some((e) => this.acessoDe(eu, e, p).ler) : anteriores.length > 0;
      saida.daMae = this.estudosDaMae(p, eu);
    }
    if (!conduz) return saida;
    const base = /^\d{4}-\d{2}-\d{2}$/.test(String(hoje)) ? hoje : diaDe(agora.toISOString());
    const todos = this.estudosLeves(p.id);
    const porData = new Map((p.encontros || []).map((x) => [x.data, x]));
    const dias = Array.from({ length: 8 }, (_, i) => {
      const data = somaDias(base, -i);
      const r = porData.get(data);
      return { data, padrao: estudoDoDia(todos, data, diaDe), estudo: r ? r.estudo || '' : null, visitantes: r ? Number(r.visitantes) || 0 : 0, semEncontro: !!(r && r.semEncontro) };
    });
    const usados = new Set(dias.flatMap((d) => [d.padrao, d.estudo]).filter((x) => x && x !== '-'));
    const estudos = todos.filter((e, i) => i < 4 || usados.has(e.id));
    saida.registro = { estudos, dias };
    return saida;
  }

  // Um estudo pela chave; o atual da célula é o que p.estudoId aponta. Como o check-in, os estudos
  // ficam fora da foto em memória: lidos e gravados direto em celula_estudos.
  estudo(id) {
    if (!id) return null;
    return estudoDaLinha(this.banco().prepare('SELECT * FROM celula_estudos WHERE id = ?').get(String(id)));
  }

  // entrada é o corpo de POST /api/celula, ação "estudo":
  //   estudo: 'blocos' (o estudo escrito, com marcas), 'semana', 'trecho' ou '' (tira o estudo). Sem
  //           o campo, grava só acolhida, adoração e testemunho, e o estudo fica como está. 'livre'
  //           (o aparelho que ainda tem o app antigo) vale como 'blocos', e "texto" no lugar de "fonte".
  //   fonte (o estudo escrito; em semana e trecho, a palavra do líder), ref (trecho), traducao,
  //   perguntas (0 a 6), acolhida, adoracao, testemunho, combinado (até 200 caracteres) e base: o id
  //   do estudo que está sendo mudado. Igual ao atual (e ainda sem uso), a linha é atualizada; em
  //   qualquer outro caso nasce uma linha nova, a anterior ganha atual_ate, para o histórico, e
  //   acolhida, adoração e testemunho voltam a vazio, a não ser que o pedido os traga.
  //   Os próximos estudos (docs/a-mesa-fila.md, seção 3.4):
  //   agendar: true põe o estudo novo na fila, na data (data, 'AAAA-MM-DD'; sem ela, a próxima da
  //            fila), sem mexer no atual nem em acolhida, adoração e testemunho;
  //   base igual a um estudo da fila desta célula: muda esse estudo, que continua na fila (com data,
  //            muda também a data); baseEm é o editadoEm de quando o rascunho começou (409 se mudou);
  //   seguintes: as fontes das partes seguintes de um estudo dividido, que entram na fila logo depois
  //            deste, na mesma transação, cada uma conferida pelos mesmos tetos.
  // opcoes: regras (o CC das regras do app: lerEstudo, lerRefLivre, lerRef, escreverRef), livros,
  //   capitulos, versiculos(traducao) => (livro, cap) => quantos versículos, planoAte (até que dia do
  //   plano vai a semana do líder hoje) e refSemana (a referência-chave dessa semana).
  // O estudo escrito é relido aqui pelo mesmo leitor do aparelho, e o que se grava é a fonte limpa
  // que ele devolve, nunca a recebida. Tudo é validado antes de mudar qualquer coisa; a linha do
  // estudo, as da fila e o ponteiro da célula entram na mesma transação. Depois, a promoção
  // (promoverDaFila) roda, como depois de toda mudança.
  // Devolve { p, estudo (o gravado: o atual, ou o da fila), agendado ('AAAA-MM-DD' ou ''), promovido }.
  async salvarEstudo(eu, id, entrada = {}, opcoes = {}, agora = new Date()) {
    const p = this.celulaDeQuemPrepara(eu, id);
    const { regras = {}, livros = [], capitulos = null, versiculos = null, planoAte = 0, refSemana = '' } = opcoes;
    const e = entrada || {};
    const campo4w = (valor, nome) => {
      const limpo = String(valor || '').replace(/\s+/g, ' ').trim();
      if (limpo.length > CAMPO_4W_MAX) throw erro('o campo "' + nome + '" tem no máximo ' + CAMPO_4W_MAX + ' caracteres');
      return limpo;
    };
    const ws = {};
    if (e.acolhida !== undefined) ws.estudoAcolhida = campo4w(e.acolhida, 'acolhida');
    if (e.adoracao !== undefined) ws.estudoAdoracao = campo4w(e.adoracao, 'adoração');
    if (e.testemunho !== undefined) ws.estudoTestemunho = campo4w(e.testemunho, 'testemunho');

    let tipo = e.estudo === undefined || e.estudo === null ? null : String(e.estudo);
    if (tipo === 'livre') tipo = 'blocos';
    let novo = null;
    let combinado = null;
    // o estudo escrito, relido e conferido pelos tetos (o do pedido e cada parte seguinte)
    const lerBlocos = (recebida, contar) => {
      if (!recebida) throw erro(MSG_ESTUDO.vazio);
      if (recebida.length > ESTUDO_BRUTO_MAX) throw erro(MSG_ESTUDO.tamanho);
      return validarLeitura(regras.lerEstudo(recebida, { capitulos, versiculos: contar }), { lerRef: regras.lerRef, livros, capitulos, versiculos: contar });
    };
    let traducao = 'nbv';
    if (tipo) {
      if (!TIPOS_ESTUDO.includes(tipo)) throw erro(MSG_ESTUDO.tipo);
      traducao = e.traducao === undefined || e.traducao === null || e.traducao === '' ? 'nbv' : String(e.traducao);
      if (!TRADUCOES.includes(traducao)) throw erro(MSG_ESTUDO.traducao);
      const perguntas = e.perguntas === undefined || e.perguntas === null ? null : limparPerguntas(e.perguntas);
      const recebida = limparFonte(e.fonte !== undefined && e.fonte !== null ? e.fonte : e.texto);
      // O teto vale para a fonte limpa (sem as citações trocadas), mas o texto bruto também tem o
      // seu, conferido antes de o leitor de marcas rodar: ele nunca lê mais que o dobro do estudo.
      if (recebida.length > ESTUDO_BRUTO_MAX) throw erro(MSG_ESTUDO.tamanho);
      const contar = typeof versiculos === 'function' ? versiculos(traducao) : null;
      // O combinado (Fase 2): sem o campo, mudar o mesmo estudo mantém o que estava, e um estudo
      // novo nasce sem. Com o campo, passa pelo mesmo leitor de citações da palavra do líder: a
      // citação de outra tradução vira a referência, e a que ele não consegue trocar é recusada.
      combinado = limparCombinado(e.combinado);
      if (combinado) {
        const lido = regras.lerEstudo(combinado, { capitulos, versiculos: contar, semTitulo: true });
        if ((lido.avisos || []).some((a) => a && a.tipo === 'citacao')) throw erro(MSG_ESTUDO.combinadoCitacao);
        combinado = limparCombinado(String(lido.fonte || '').replace(/\n+/g, ' '));
      }
      novo = { tipo, titulo: '', ref: '', planoAte: 0, fonte: recebida, blocos: [], refs: [], perguntas: perguntas || [], traducao };
      if (tipo === 'blocos') {
        const lido = lerBlocos(recebida, contar);
        Object.assign(novo, { titulo: lido.titulo, fonte: lido.fonte, blocos: lido.blocos, refs: lido.refs });
        if (!perguntas) novo.perguntas = lido.perguntas;
      } else {
        // A palavra do líder (semana e trecho) passa pelo mesmo leitor, sem título: a citação de
        // outra tradução que vier nela também fica só com a referência.
        novo.fonte = recebida ? regras.lerEstudo(recebida, { capitulos, versiculos: contar, semTitulo: true }).fonte : '';
        if (novo.fonte.length > ESTUDO_MAX) throw erro(MSG_ESTUDO.tamanho);
        if (tipo === 'semana') Object.assign(novo, { planoAte: Number(planoAte) || 0, refs: refSemana ? [String(refSemana)] : [] });
        if (tipo === 'trecho') {
          const r = regras.lerRefLivre(e.ref, capitulos);
          if (!r || !livros.includes(r.livro)) throw erro(MSG_ESTUDO.trecho);
          const ref = regras.escreverRef(r.livro, r.cap, r.de, r.ate);
          if (contar && r.de > (Number(contar(r.livro, r.cap)) || 0)) throw erro(semVersiculo(ref));
          Object.assign(novo, { titulo: ref, ref, refs: [ref] });
        }
      }
    }

    // A fila (docs/a-mesa-fila.md): agendar um estudo novo, mudar um que já está nela e as partes
    // seguintes de um estudo dividido. Tudo conferido antes de gravar.
    const db = this.banco();
    const quando = agora.toISOString();
    const hoje = this.diaNaCelula(p)(quando);
    const fila = this.filaDe(p.id);
    const baseId = String(e.base || '');
    const daFila = novo && baseId ? this.estudo(baseId) : null;
    const mudarDaFila = !!(daFila && daFila.proposito === p.id && daFila.agendadoPara);
    // o rascunho de um estudo da fila (o pedido traz baseEm) cuja base já saiu dela, promovida ou
    // tirada em outro aparelho: nada é gravado, e o rascunho fica no celular
    if (novo && 'baseEm' in e && !mudarDaFila) throw erro(MSG_ESTUDO.foraDaFila, 409);
    if (mudarDaFila && e.baseEm !== undefined && e.baseEm !== null && String(e.baseEm) !== (daFila.editadoEm || '')) throw erro(MSG_ESTUDO.estudoMudou, 409);
    const agendar = !!(novo && e.agendar === true && !mudarDaFila);
    const seguintes = novo && Array.isArray(e.seguintes) ? e.seguintes : [];
    const partes = [];
    if (seguintes.length) {
      if (tipo !== 'blocos') throw erro(MSG_ESTUDO.vazio);
      const contar = typeof versiculos === 'function' ? versiculos(traducao) : null;
      seguintes.forEach((fonte, i) => {
        try {
          const lido = lerBlocos(limparFonte(typeof fonte === 'string' ? fonte : (fonte && fonte.fonte) || ''), contar);
          partes.push({ tipo: 'blocos', titulo: lido.titulo, ref: '', planoAte: 0, fonte: lido.fonte, blocos: lido.blocos, refs: lido.refs, perguntas: lido.perguntas, traducao });
        } catch (falha) {
          if (falha.publico) throw erro('na parte ' + (i + 2) + ': ' + falha.message, falha.codigo || 400);
          throw falha;
        }
      });
    }
    if (fila.length + (agendar ? 1 : 0) + partes.length > FILA_MAX) throw erro(MSG_ESTUDO.filaCheia);
    const contexto = this.contextoDaFila(p, agora);
    let dataPedida = '';
    if (agendar) dataPedida = e.data ? limparDataDaFila(e.data, hoje) : proximaDataDaFila(fila, contexto);
    else if (mudarDaFila && e.data !== undefined && e.data !== null && e.data !== '' && e.data !== daFila.agendadoPara) dataPedida = limparDataDaFila(e.data, hoje);

    const antes = { estudoId: p.estudoId || '', estudoAcolhida: p.estudoAcolhida, estudoAdoracao: p.estudoAdoracao, estudoTestemunho: p.estudoTestemunho };
    const encerrar = (estudoId) => db.prepare("UPDATE celula_estudos SET atual_ate = ? WHERE id = ? AND atual_ate = ''").run(quando, estudoId);
    let gravado = '';
    let agendado = '';
    try {
      transacao(db, () => {
        const atual = p.estudoId ? this.estudo(p.estudoId) : null;
        let nasceuLinha = false;
        let lista = fila.map((x) => ({ id: x.id, data: x.agendadoPara }));
        const inserir = (x, agendadoPara) => {
          const novoId = 'e' + randomBytes(6).toString('hex');
          db.prepare('INSERT INTO celula_estudos (id, proposito, tipo, titulo, ref, plano_ate, fonte, blocos, refs, perguntas, traducao, combinado, criado_por, criado_em, agendado_para) '
            + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(novoId, p.id, x.tipo, x.titulo, x.ref, x.planoAte, x.fonte, JSON.stringify(x.blocos), JSON.stringify(x.refs), JSON.stringify(x.perguntas), x.traducao, x.combinado || '', p.criadoPor, quando, agendadoPara);
          return novoId;
        };
        if (tipo === '') {
          if (atual) encerrar(atual.id);
          p.estudoId = '';
        } else if (novo) {
          const valores = [novo.tipo, novo.titulo, novo.ref, novo.planoAte, novo.fonte, JSON.stringify(novo.blocos), JSON.stringify(novo.refs), JSON.stringify(novo.perguntas), novo.traducao];
          if (mudarDaFila) {
            // o estudo da fila muda e continua na fila (com a data nova, se veio)
            db.prepare('UPDATE celula_estudos SET tipo = ?, titulo = ?, ref = ?, plano_ate = ?, fonte = ?, blocos = ?, refs = ?, perguntas = ?, traducao = ?, combinado = ?, editado_em = ? WHERE id = ?')
              .run(...valores, combinado === null ? daFila.combinado : combinado, quando, daFila.id);
            gravado = daFila.id;
            if (dataPedida) lista = encaixarNaFila(lista, { id: gravado, data: dataPedida }, p.encontro);
          } else if (agendar) {
            gravado = inserir({ ...novo, combinado: combinado || '' }, dataPedida);
            lista = encaixarNaFila(lista, { id: gravado, data: dataPedida }, p.encontro);
          } else if (atual && baseId === atual.id && !this.estudoJaUsado(p, atual, agora)) {
            // mudar o estudo atual (base igual) atualiza a mesma linha, a não ser que ele já tenha
            // sido usado num encontro: aí é o estudo do próximo, e o usado fica para o histórico.
            // O estudo de antes da v19 não tinha autor: quem o muda agora é o líder
            db.prepare("UPDATE celula_estudos SET tipo = ?, titulo = ?, ref = ?, plano_ate = ?, fonte = ?, blocos = ?, refs = ?, perguntas = ?, traducao = ?, combinado = ?, editado_em = ?, "
              + "criado_por = CASE WHEN criado_por = '' THEN ? ELSE criado_por END WHERE id = ?").run(...valores, combinado === null ? atual.combinado : combinado, quando, p.criadoPor, atual.id);
            gravado = atual.id;
          } else {
            const novoId = inserir({ ...novo, combinado: combinado || '' }, '');
            if (atual) encerrar(atual.id);
            p.estudoId = novoId;
            gravado = novoId;
            nasceuLinha = true;
            // o histórico de uma célula tem teto: além dele, sai o mais antigo que não é o atual (os
            // da fila não contam nem saem)
            db.prepare("DELETE FROM celula_estudos WHERE proposito = ? AND id != ? AND agendado_para = '' AND id NOT IN "
              + "(SELECT id FROM celula_estudos WHERE proposito = ? AND agendado_para = '' ORDER BY criado_em DESC, id DESC LIMIT ?)").run(p.id, novoId, p.id, ESTUDOS_POR_CELULA);
          }
          // as partes seguintes de um estudo dividido: logo depois deste (da data dele, na fila; do
          // encontro dele, quando ele é o atual), uma por encontro, empurrando o resto da fila
          if (partes.length) {
            const naFila = lista.find((x) => x.id === gravado);
            let data = naFila ? encontroDepois(naFila.data, p.encontro) : primeiraDataDaFila({ ...contexto, atualEspera: true });
            for (const x of partes) {
              const idParte = inserir(x, data);
              lista = encaixarNaFila(lista, { id: idParte, data }, p.encontro);
              data = encontroDepois(data, p.encontro);
            }
          }
          this.gravarDatasDaFila(lista, fila);
          agendado = (lista.find((x) => x.id === gravado) || {}).data || '';
        }
        // O estudo novo começa com acolhida, adoração e testemunho vazios (as sugestões da semana),
        // a não ser que o pedido traga os campos: o testemunho de uma semana, às vezes com nomes, não
        // passa para a seguinte à vista de visitantes (docs/a-mesa-fase2.md, A5). Mudar o mesmo
        // estudo e tirar o estudo deixam os três como estão. O estudo da fila não mexe nos três:
        // eles são da célula de agora (docs/a-mesa-fila.md, F8).
        if (nasceuLinha) Object.assign(p, { estudoAcolhida: '', estudoAdoracao: '', estudoTestemunho: '' });
        if (!agendar && !mudarDaFila) Object.assign(p, ws);
        gravarMeta(db, 'contas_versao', this.dados.versao || 2);
        sincronizar(db, paraLinhas(this.dados));
      });
    } catch (falha) {
      Object.assign(p, antes);
      throw falha;
    }
    const promovido = this.promoverDaFila(p, agora);
    return { p, estudo: this.estudo(gravado || p.estudoId), agendado, promovido };
  }

  // ---------- os próximos estudos: a fila (docs/a-mesa-fila.md) ----------
  // A fila de uma célula, na ordem das datas: as linhas de celula_estudos com agendado_para, sem a
  // fonte e sem as partes (a leitura de cada um traz o resto).
  filaDe(proposito) {
    return this.banco().prepare('SELECT id, proposito, tipo, titulo, ref, refs, plano_ate, traducao, criado_por, criado_em, editado_em, atual_ate, combinado, antes_do_historico, agendado_para, preparado_em '
      + "FROM celula_estudos WHERE proposito = ? AND agendado_para != '' ORDER BY agendado_para, id").all(String(proposito || '')).map(estudoDaLinha);
  }

  // O que as datas da fila precisam saber da célula agora: o dia de hoje no fuso do líder, o dia do
  // encontro, o último encontro registrado e se o estudo atual ainda espera o encontro dele.
  contextoDaFila(p, agora = new Date()) {
    const diaDe = this.diaNaCelula(p);
    const hoje = diaDe(agora.toISOString());
    const atual = p.estudoId ? this.estudo(p.estudoId) : null;
    const ultimoEncontro = (p.encontros || []).reduce((m, x) => (x && x.data > m ? x.data : m), '');
    const atualEspera = !!atual && !jaTeveEncontro({ id: atual.id, criadoEm: atual.criadoEm, nasceu: diaDe(atual.criadoEm), hoje, encontro: p.encontro, encontros: p.encontros });
    return { hoje, encontro: Number.isInteger(p.encontro) ? p.encontro : -1, ultimoEncontro, atualEspera };
  }

  // A fila como quem conduz a recebe no retrato: os estudos, a data que um novo recebe sem escolha
  // (proxima) e a primeira data livre (primeira, a de "Ajustar as datas").
  dadosDaFila(p, agora = new Date()) {
    const itens = this.filaDe(p.id);
    const contexto = this.contextoDaFila(p, agora);
    return { itens, proxima: proximaDataDaFila(itens, contexto), primeira: primeiraDataDaFila(contexto) };
  }

  // Grava as datas novas da fila (só as que mudaram), dentro da transação de quem chama. Para não
  // esbarrar em duas linhas com a mesma data no meio do caminho, não há índice único: a regra das
  // funções puras (encaixarNaFila, reordenarFila, ajustarDatasDaFila) já garante uma data por estudo.
  gravarDatasDaFila(lista, antes = []) {
    const db = this.banco();
    const eram = new Map(antes.map((x) => [x.id, x.agendadoPara]));
    for (const x of lista) if (eram.get(x.id) !== x.data) db.prepare("UPDATE celula_estudos SET agendado_para = ? WHERE id = ? AND agendado_para != ''").run(x.data, x.id);
  }

  // Um estudo entra na célula: o atual (se houver) vai para o histórico, o da fila perde a data,
  // ganha criado_em = agora (o instante em que passou a valer na célula, como todas as regras leem) e
  // guarda em preparado_em o instante em que foi escrito. Acolhida, adoração e testemunho voltam a
  // vazio, como em todo estudo novo (A5). Dentro de uma transação, com a célula em memória.
  promoverEstudo(p, e, agora = new Date()) {
    const db = this.banco();
    const quando = agora.toISOString();
    const antes = { estudoId: p.estudoId || '', estudoAcolhida: p.estudoAcolhida, estudoAdoracao: p.estudoAdoracao, estudoTestemunho: p.estudoTestemunho };
    try {
      transacao(db, () => {
        if (p.estudoId) db.prepare("UPDATE celula_estudos SET atual_ate = ? WHERE id = ? AND atual_ate = ''").run(quando, p.estudoId);
        db.prepare("UPDATE celula_estudos SET agendado_para = '', preparado_em = criado_em, criado_em = ? WHERE id = ? AND agendado_para != ''").run(quando, e.id);
        Object.assign(p, { estudoId: e.id, estudoAcolhida: '', estudoAdoracao: '', estudoTestemunho: '' });
        gravarMeta(db, 'contas_versao', this.dados.versao || 2);
        sincronizar(db, paraLinhas(this.dados));
      });
    } catch (falha) {
      Object.assign(p, antes);
      throw falha;
    }
    return this.estudo(e.id);
  }

  // A promoção (docs/a-mesa-fila.md, seção 4): o primeiro da fila entra na célula quando o atual já
  // teve o encontro dele (ou não há atual) e ele é do próximo encontro (estudos.mjs, devePromover).
  // Roda a cada leitura da célula, a cada registro de encontro e a cada mudança na fila ou no estudo.
  // Um estudo por vez. Devolve o estudo que entrou, ou null.
  promoverDaFila(p, agora = new Date()) {
    if (!p || !p.celula || p.encerradoEm) return null;
    const cabeca = this.filaDe(p.id)[0];
    if (!cabeca) return null;
    const diaDe = this.diaNaCelula(p);
    const atual = p.estudoId ? this.estudo(p.estudoId) : null;
    if (!devePromover({ atual, cabeca, hoje: diaDe(agora.toISOString()), encontro: p.encontro, encontros: p.encontros, diaDe })) return null;
    return this.promoverEstudo(p, cabeca, agora);
  }

  // Um estudo da fila desta célula, ou 404 "esse estudo já não está nos próximos estudos".
  estudoDaFila(p, estudoId) {
    const e = String(estudoId || '').length <= 64 ? this.estudo(estudoId) : null;
    if (!e || e.proposito !== p.id || !e.agendadoPara) throw erro(MSG_ESTUDO.foraDaFila, 404);
    return e;
  }

  // As ações da fila (POST /api/celula), só do líder (celulaDeQuemPrepara: o auxiliar vê a fila,
  // mas não mexe, docs/a-mesa-fila.md, F2). Cada uma roda a promoção no fim e devolve
  // { p, fila, promovido }.
  async mexerNaFila(eu, id, mexer, agora = new Date()) {
    const p = this.celulaDeQuemPrepara(eu, id);
    const db = this.banco();
    const fila = this.filaDe(p.id);
    transacao(db, () => mexer(p, fila, db));
    const promovido = this.promoverDaFila(p, agora);
    return { p, fila: this.filaDe(p.id), promovido };
  }

  // Põe um estudo da fila numa data (a fila empurra quem estava nela e os seguintes).
  mudarDataNaFila(eu, id, estudoId, data, agora = new Date()) {
    return this.mexerNaFila(eu, id, (p, fila) => {
      const e = this.estudoDaFila(p, estudoId);
      const d = limparDataDaFila(data, this.diaNaCelula(p)(agora.toISOString()));
      this.gravarDatasDaFila(encaixarNaFila(fila.map((x) => ({ id: x.id, data: x.agendadoPara })), { id: e.id, data: d }, p.encontro), fila);
    }, agora);
  }

  // Reordena: ordem é a fila inteira na ordem nova; as datas ficam nos lugares. Uma lista que não é a
  // fila de agora (outro aparelho mudou a fila) dá 409.
  reordenarAFila(eu, id, ordem, agora = new Date()) {
    return this.mexerNaFila(eu, id, (p, fila) => {
      const nova = reordenarFila(fila, ordem);
      if (!nova) throw erro(MSG_ESTUDO.filaMudou, 409);
      this.gravarDatasDaFila(nova, fila);
    }, agora);
  }

  // "Ajustar as datas": a fila inteira nos encontros a partir da primeira data livre.
  ajustarAFila(eu, id, agora = new Date()) {
    return this.mexerNaFila(eu, id, (p, fila) => {
      this.gravarDatasDaFila(ajustarDatasDaFila(fila, primeiraDataDaFila(this.contextoDaFila(p, agora)), p.encontro), fila);
    }, agora);
  }

  // Tira um estudo da fila: a linha sai (a célula nunca o recebeu).
  tirarDaFila(eu, id, estudoId, agora = new Date()) {
    return this.mexerNaFila(eu, id, (p, fila, db) => {
      const e = this.estudoDaFila(p, estudoId);
      db.prepare("DELETE FROM celula_estudos WHERE id = ? AND agendado_para != ''").run(e.id);
    }, agora);
  }

  // "Usar agora": o estudo da fila entra na célula já. Por cima de um atual que ainda não foi usado
  // num encontro, só com confirmar (senão 409 com precisaConfirmar: a tela pergunta).
  async usarDaFila(eu, id, estudoId, confirmar = false, agora = new Date()) {
    const p = this.celulaDeQuemPrepara(eu, id);
    const e = this.estudoDaFila(p, estudoId);
    const atual = p.estudoId ? this.estudo(p.estudoId) : null;
    if (atual && !this.estudoJaUsado(p, atual, agora) && confirmar !== true) throw Object.assign(erro(MSG_ESTUDO.confirmarUsar, 409), { precisaConfirmar: true });
    const entrou = this.promoverEstudo(p, e, agora);
    return { p, fila: this.filaDe(p.id), promovido: entrou };
  }

  // As partes que a versão anterior guardava no celular do líder (docs/a-mesa-fila.md, 5.5): entram
  // na fila logo depois do encontro do estudo atual, uma por encontro, empurrando o resto. Cada uma
  // passa pelos mesmos tetos de um estudo; uma recusada recusa o pedido inteiro.
  //   partes: [{ fonte, traducao }]; opcoes: as de salvarEstudo.
  async porPartesNaFila(eu, id, partes, opcoes = {}, agora = new Date()) {
    const p = this.celulaDeQuemPrepara(eu, id);
    const { regras = {}, livros = [], capitulos = null, versiculos = null } = opcoes;
    const lista = Array.isArray(partes) ? partes : [];
    if (!lista.length) throw erro(MSG_ESTUDO.vazio);
    const fila = this.filaDe(p.id);
    if (fila.length + lista.length > FILA_MAX) throw erro(MSG_ESTUDO.filaCheia);
    const lidas = lista.map((x, i) => {
      try {
        const traducao = x && TRADUCOES.includes(x.traducao) ? x.traducao : 'nbv';
        const contar = typeof versiculos === 'function' ? versiculos(traducao) : null;
        const fonte = limparFonte(x && x.fonte);
        if (!fonte) throw erro(MSG_ESTUDO.vazio);
        if (fonte.length > ESTUDO_BRUTO_MAX) throw erro(MSG_ESTUDO.tamanho);
        const lido = validarLeitura(regras.lerEstudo(fonte, { capitulos, versiculos: contar }), { lerRef: regras.lerRef, livros, capitulos, versiculos: contar });
        return { ...lido, traducao };
      } catch (falha) {
        if (falha.publico) throw erro('na parte ' + (i + 2) + ': ' + falha.message, falha.codigo || 400);
        throw falha;
      }
    });
    const quando = agora.toISOString();
    return this.mexerNaFila(eu, id, (pp, filaAgora, db) => {
      let datas = filaAgora.map((x) => ({ id: x.id, data: x.agendadoPara }));
      let data = primeiraDataDaFila(this.contextoDaFila(pp, agora));
      for (const x of lidas) {
        const novoId = 'e' + randomBytes(6).toString('hex');
        db.prepare('INSERT INTO celula_estudos (id, proposito, tipo, titulo, ref, plano_ate, fonte, blocos, refs, perguntas, traducao, combinado, criado_por, criado_em, agendado_para) '
          + "VALUES (?, ?, 'blocos', ?, '', 0, ?, ?, ?, ?, ?, '', ?, ?, ?)")
          .run(novoId, pp.id, x.titulo, x.fonte, JSON.stringify(x.blocos), JSON.stringify(x.refs), JSON.stringify(x.perguntas), x.traducao, pp.criadoPor, quando, data);
        datas = encaixarNaFila(datas, { id: novoId, data }, pp.encontro);
        data = encontroDepois(data, pp.encontro);
      }
      this.gravarDatasDaFila(datas, filaAgora);
    }, agora);
  }

  // Quem conduz registra quem foi ao encontro: hoje ou um dos 7 dias anteriores, membros e
  // visitantes de verdade (não qualquer @ digitado), e regrava por cima se já havia registro
  // naquele dia. "visitantes" aqui é o contador de pessoas que vieram mas não têm conta no app.
  // semEncontro: "não houve encontro nesta semana" (feriado, imprevisto). Fica registrado
  // para aquela data, sem presenças, e não conta como falta de ninguém.
  // estudo (Fase 2): qual estudo foi usado. Um id precisa ser desta célula (a mãe não) e preparado
  // até o dia do encontro; '-' é um estudo de fora do app. Sem o campo (o app antigo no cache), vale
  // o estudo que era o atual no fim daquele dia; com semEncontro, nenhum. Quem conduz troca o estudo
  // do registro (é quem registra), e trocar não muda estudo nenhum: só diz qual foi usado.
  // Devolve { p, registro, faltaram }: faltaram são os @ de quem não veio (estudos.mjs, quemFaltou),
  // para a mensagem pronta que quem conduz decide se manda. Nada sai daqui para ninguém.
  async registrarEncontro(eu, id, { data, presentes, visitantes, semEncontro, estudo } = {}, hoje, agora = new Date()) {
    const p = this.celulaDeQuemConduz(eu, id);
    const d = String(data || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > hoje || d < somaDias(hoje, -7)) throw erro('escolha o dia do encontro, de hoje até 7 dias atrás');
    const sem = semEncontro === true;
    const n = sem ? 0 : Number(visitantes);
    if (!Number.isInteger(n) || n < 0 || n > 30) throw erro('o número de pessoas sem conta vai de 0 a 30');
    let ligado = '';
    if (!sem) {
      const pedido = estudo === undefined || estudo === null ? '' : String(estudo);
      const diaDe = this.diaNaCelula(p);
      if (pedido === '-') ligado = '-';
      else if (pedido) {
        const e = pedido.length <= 64 ? this.estudo(pedido) : null;
        const nasceu = e ? diaDe(e.criadoEm) : '';
        // um estudo da fila ainda não era o estudo da célula (docs/a-mesa-fila.md, 4.2)
        if (!e || e.proposito !== p.id || e.agendadoPara || !nasceu || nasceu > d) throw erro(MSG_ESTUDO.estudoDoRegistro);
        ligado = e.id;
      } else {
        ligado = estudoDoDia(this.estudosLeves(p.id), d, diaDe);
      }
    }
    const validos = new Set(this.ativosDe(p).map((m) => m.usuario));
    const lista = sem ? [] : [...new Set((Array.isArray(presentes) ? presentes : []).map(limparNome))].filter((u) => validos.has(u));
    const registradoPor = limparNome(eu);
    const registro = { data: d, visitantes: n, registradoPor, em: agora.toISOString(), presentes: lista, semEncontro: sem, estudo: ligado };
    const encontros = p.encontros || (p.encontros = []);
    const existente = encontros.find((e) => e.data === d);
    if (existente) Object.assign(existente, registro); else encontros.push(registro);
    await this.salvar();
    const quemConduz = this.ativosDe(p).map((m) => m.usuario).filter((u) => podeConduzir(p, u));
    // depois do encontro, o próximo da fila entra na célula (docs/a-mesa-fila.md, seção 4)
    const promovido = this.promoverDaFila(p, agora);
    return { p, registro, promovido, faltaram: quemFaltou({ membros: p.membros, presentes: lista, registradoPor, quemConduz, data: d, semEncontro: sem }) };
  }

  // Os pedidos de oração e de ajuda que a pessoa deixou naquela célula somem com ela: quem
  // não está mais lá não tem por que continuar pedindo (nem sendo pedido) ali.
  limparPedidosDaCelula(usuario, celula) {
    for (const id of Object.keys(this.dados.pedidos || {})) {
      const r = this.dados.pedidos[id];
      if (r.celula === celula && r.autor === usuario) delete this.dados.pedidos[id];
    }
  }

  async removerDaCelula(eu, id, usuario, hoje) {
    const p = this.celulaDoLider(eu, id);
    const u = limparNome(usuario);
    if (u === p.criadoPor) throw erro('o líder não sai pela lista; para acabar a célula, encerre');
    const m = p.membros.find((x) => x.usuario === u && x.estado !== 'saiu');
    if (!m) throw erro('essa pessoa não está na célula', 404);
    m.estado = 'saiu';
    m.saiuEm = hoje;
    this.limparPedidosDaCelula(u, id);
    await this.salvar();
    return p;
  }

  // ---------- multiplicação da célula (Atos 2.47; 2 Timóteo 2.2) ----------
  // Só o líder inicia, e só com pelo menos 1 auxiliar ativo: ele passa a liderar a célula
  // nova, e o líder escolhe junto com ele quem mais vai (membros ativos; visitante pode ir
  // junto, sem virar membro por causa disso). Quem vai sai da mãe e entra na filha na mesma
  // data, sem perder a ofensiva pessoal (ela é da conta, nunca da célula); a ofensiva da
  // célula nova começa do zero porque ela nasce naquele dia. O auxiliar deixa de ser
  // auxiliar da mãe só porque saiu dela, não por um passo à parte.
  async multiplicarCelula(eu, id, { auxiliar, titulo, pessoas } = {}, hoje, agora = new Date()) {
    const mae = this.celulaDoLider(eu, id);
    const tituloLimpo = tituloDigitado(titulo, 'da célula');
    const novoLider = limparNome(auxiliar);
    const souAuxiliar = (u) => mae.membros.find((m) => m.usuario === u && m.estado === 'ativo' && m.papel === 'auxiliar');
    if (!souAuxiliar(novoLider)) throw erro('escolha um auxiliar ativo da célula para liderar a nova célula', 400);
    const escolhidos = [...new Set((Array.isArray(pessoas) ? pessoas : []).map(limparNome))]
      .filter((u) => u && u !== novoLider && u !== mae.criadoPor);
    for (const u of escolhidos) {
      if (!mae.membros.some((m) => m.usuario === u && m.estado === 'ativo')) {
        throw erro('só dá para levar quem está ativo na célula', 400);
      }
    }
    const movidos = [novoLider, ...escolhidos];
    if (movidos.length > LIMITE_CELULA) throw erro('a nova célula tem no máximo ' + LIMITE_CELULA + ' pessoas', 400);
    const filhaId = 'p' + randomBytes(6).toString('hex');
    const filha = {
      id: filhaId, tipo: 'plano', alvo: '', titulo: tituloLimpo || 'Célula',
      criadoPor: novoLider, criadoEm: hoje, encerradoEm: '', grupo: true, celula: true,
      // o instante, além do dia (v21): a filha lê os estudos da mãe escritos até ele
      mae: mae.id, multiplicadaEm: hoje, multiplicadaInstante: agora.toISOString(), membros: [], aprovacoes: [], estudoId: '',
    };
    // Liderar a célula nova é função nova: menor de 18 espera a aprovação da liderança de novo.
    const contaNovoLider = this.achar(novoLider);
    if (contaNovoLider && menorDeIdade(contaNovoLider.nascimento, hoje)) filha.aprovacoes.push(pedidoDeAprovacao(novoLider, 'lider'));
    for (const u of movidos) {
      const m = mae.membros.find((x) => x.usuario === u);
      m.estado = 'saiu';
      m.saiuEm = hoje;
      filha.membros.push({
        usuario: u, estado: 'ativo', entrouEm: hoje, saiuEm: '', convidadoPor: '',
        papel: u !== novoLider && m.papel === 'visitante' ? 'visitante' : '',
      });
      this.limparPedidosDaCelula(u, mae.id);
    }
    this.dados.propositos[filhaId] = filha;
    await this.salvar();
    return { filha, mae, movidos };
  }

  // ---------- liderança de menor de 18 (aprovação do administrador) ----------
  // Célula criada antes da regra: quem a lidera ou auxilia com menos de 18 anos, sem
  // nenhum registro, passa a esperar a aprovação também (roda ao abrir o banco).
  async pedirAprovacoesQueFaltam(hoje = hojeNoFuso(FUSO_PADRAO)) {
    let mudou = false;
    for (const p of this.propositosAtivos().filter((x) => x.celula)) {
      p.aprovacoes = p.aprovacoes || [];
      const pessoas = [[p.criadoPor, 'lider'], ...p.membros.filter((m) => m.estado === 'ativo' && m.papel === 'auxiliar').map((m) => [m.usuario, 'auxiliar'])];
      for (const [u, papel] of pessoas) {
        const c = this.achar(u);
        if (!c || !menorDeIdade(c.nascimento, hoje) || p.aprovacoes.some((x) => x.usuario === u && x.papel === papel)) continue;
        p.aprovacoes.push(pedidoDeAprovacao(u, papel));
        mudou = true;
      }
    }
    if (mudou) await this.salvar();
  }

  // O que o administrador vê para decidir: a célula, quem, o papel, a idade em anos e desde
  // quando espera. Só pedidos pendentes de células abertas.
  liderancasPendentes(hoje = hojeNoFuso(FUSO_PADRAO)) {
    const lista = [];
    for (const p of this.propositosAtivos().filter((x) => x.celula)) {
      for (const x of p.aprovacoes || []) {
        if (x.estado !== 'pendente') continue;
        const c = this.achar(x.usuario);
        if (!c) continue;
        let idade = 0;
        while (c.nascimento && somaAnos(c.nascimento, idade + 1) <= hoje) idade++;
        lista.push({ proposito: p.id, titulo: p.titulo, usuario: c.usuario, nome: c.nome, papel: x.papel, idade, pedidoEm: x.pedidoEm,
          membros: this.ativosDe(p).length });
      }
    }
    return lista.sort((a, b) => String(a.pedidoEm).localeCompare(String(b.pedidoEm)));
  }

  // Aprovar libera a função; recusar o líder encerra a célula (ela não teria quem a conduza),
  // recusar o auxiliar só tira o papel. Fica registrado quem decidiu e quando.
  async decidirLideranca(admin, { proposito, usuario, papel, aprovar } = {}, hoje = hojeNoFuso(FUSO_PADRAO)) {
    const p = this.proposito(proposito);
    const u = limparNome(usuario);
    const x = p && (p.aprovacoes || []).find((a) => a.usuario === u && a.papel === papel && a.estado === 'pendente');
    if (!p || p.encerradoEm || !x) throw erro('esse pedido de aprovação não está mais pendente', 404);
    x.estado = aprovar ? 'aprovada' : 'recusada';
    x.decididoPor = limparNome(admin);
    x.decididoEm = new Date().toISOString();
    if (!aprovar && papel === 'lider') p.encerradoEm = hoje;
    if (!aprovar && papel === 'auxiliar') {
      const m = p.membros.find((y) => y.usuario === u);
      if (m && m.papel === 'auxiliar') m.papel = '';
    }
    await this.salvar();
    return { proposito: p, aprovacao: x };
  }

  async sairDoProposito(eu, id, hoje) {
    const a = this.exigirCompleto(eu);
    const p = this.proposito(id);
    const m = p && !p.encerradoEm && p.membros.find((x) => x.usuario === a.usuario && x.estado !== 'saiu');
    if (!m) throw erro('propósito não encontrado', 404);
    m.estado = 'saiu';
    m.saiuEm = hoje;
    if (!p.grupo || this.presentes(p).length < 2) p.encerradoEm = hoje;
    if (p.celula) this.limparPedidosDaCelula(a.usuario, id);
    // o líder que sai leva a fila da célula: ela é o plano dele, e a célula nunca recebeu esses
    // estudos (docs/a-mesa-fila.md, F9); o atual e os anteriores ficam com o @
    if (p.celula && p.criadoPor === a.usuario) this.banco().prepare("DELETE FROM celula_estudos WHERE proposito = ? AND agendado_para != ''").run(p.id);
    await this.salvar();
    return p;
  }

  // Dia que já fechou com a meta batida fica anotado para sempre: o diário do aparelho some
  // depois de 70 dias, mas a sequência do grupo não pode encolher por isso.
  async anotarDiasBatidos(id, datas) {
    const p = this.proposito(id);
    if (!p) return;
    const antes = new Set(p.diasBatidos || []);
    const novos = datas.filter((d) => !antes.has(d));
    if (!novos.length) return;
    p.diasBatidos = [...antes, ...novos].sort();
    await this.salvar();
  }

  async encerrarProposito(eu, id, hoje) {
    const a = this.exigirCompleto(eu);
    const p = this.proposito(id);
    if (!p || p.encerradoEm || !this.presentes(p).some((m) => m.usuario === a.usuario)) throw erro('propósito não encontrado', 404);
    if (p.grupo && p.criadoPor !== a.usuario) throw erro('só quem criou o grupo pode encerrar; você pode sair', 403);
    p.encerradoEm = hoje;
    await this.salvar();
    return p;
  }

  // ---------- toques ----------
  async tocar(eu, para, { hoje, euLeu, eleLeu }) {
    const a = this.exigirCompleto(eu);
    const b = this.achar(para);
    if (!b || this.relacao(a.usuario, b.usuario) !== 'amigos') throw erro('só dá para dar um toque em amigo', 403);
    if (!euLeu) throw erro('faça a sua lição antes de dar um toque');
    if (eleLeu) throw erro('essa pessoa já leu hoje');
    const chave = a.usuario + '>' + b.usuario;
    if (this.dados.toques[chave] === hoje) return 'ja';
    const hojeDados = Object.entries(this.dados.toques)
      .filter(([k, d]) => k.startsWith(a.usuario + '>') && d === hoje).length;
    if (hojeDados >= LIMITE_TOQUES_DIA) throw erro('você já deu ' + LIMITE_TOQUES_DIA + ' toques hoje', 429);
    this.dados.toques[chave] = hoje;
    await this.salvar();
    return 'enviado';
  }

  toqueEnviado(eu, para, hoje) { return this.dados.toques[eu + '>' + para] === hoje; }

  // Toques do dia de hoje para esta pessoa. A data é a de quem tocou, que pode estar
  // um dia à frente num fuso diferente.
  toquesRecebidos(eu, hoje) {
    const amanha = somaDias(hoje, 1);
    return Object.entries(this.dados.toques)
      .filter(([k, d]) => k.endsWith('>' + eu) && (d === hoje || d === amanha))
      .map(([k]) => k.split('>')[0])
      .filter((de) => this.achar(de) && this.relacao(eu, de) === 'amigos' && !this.silenciou(eu, de));
  }

  // ---------- discipulado ----------
  // Mateus 28.19-20 e 2 Timóteo 2.2: uma relação de duas pontas só, sem placar. O discipulador
  // acompanha; o discípulo decide o que mostrar. As regras puras (limites, o que passa para o
  // discipulador, datas) moram em discipulado.mjs; aqui só o estado é guardado.
  discipulado(id) { return (this.dados.discipulados || {})[String(id || '')] || null; }
  discipuladosDe(usuario) {
    return Object.values(this.dados.discipulados || {}).filter((x) => x.discipulador === usuario || x.discipulo === usuario);
  }
  // No máximo 1 discipulador ativo por pessoa.
  meuDiscipuladorAtivo(usuario) {
    return Object.values(this.dados.discipulados || {}).find((x) => x.discipulo === usuario && x.estado === 'ativo') || null;
  }
  discipulosAtivosDe(usuario) {
    return Object.values(this.dados.discipulados || {}).filter((x) => x.discipulador === usuario && x.estado === 'ativo');
  }

  // Qualquer um dos dois convida, dizendo o papel que vai ter. Só entre amigos, e só um
  // convite (ou discipulado) de cada vez entre os dois, em qualquer sentido.
  async convidarDiscipulado(eu, outro, papel, hoje) {
    const a = this.exigirCompleto(eu);
    const b = this.achar(outro);
    if (!b || b.usuario === a.usuario || !this.perfilCompleto(b)) throw erro('não achei ninguém com esse @', 404);
    if (this.relacao(a.usuario, b.usuario) !== 'amigos') throw erro('só dá para convidar quem já é seu amigo', 403);
    if (!papelValido(papel)) throw erro('escolha quem acompanha quem');
    const discipulador = papel === 'discipulador' ? a.usuario : b.usuario;
    const discipulo = papel === 'discipulador' ? b.usuario : a.usuario;
    const existente = this.discipuladosDe(a.usuario).find((x) => x.estado !== 'encerrado'
      && (x.discipulador === b.usuario || x.discipulo === b.usuario));
    if (existente) throw erro('já existe um convite ou discipulado entre vocês');
    if (this.meuDiscipuladorAtivo(discipulo)) throw erro('essa pessoa já tem alguém acompanhando', 409);
    if (this.discipulosAtivosDe(discipulador).length >= LIMITE_DISCIPULOS) throw erro('você já acompanha ' + LIMITE_DISCIPULOS + ' pessoas', 409);
    const id = 'd' + randomBytes(6).toString('hex');
    this.dados.discipulados[id] = {
      id, discipulador, discipulo, estado: 'convidado', pediu: a.usuario,
      criadoEm: hoje, aceitoEm: '', encerradoEm: '', mostrar: { ...MOSTRAR_PADRAO }, encontros: [],
    };
    await this.salvar();
    return this.dados.discipulados[id];
  }

  // Só quem recebeu o convite aceita (nunca quem pediu), escolhendo o que vai mostrar.
  async aceitarDiscipulado(eu, id, mostrar, hoje) {
    const a = this.exigirCompleto(eu);
    const x = this.discipulado(id);
    if (!x || x.estado !== 'convidado' || x.pediu === a.usuario || (x.discipulador !== a.usuario && x.discipulo !== a.usuario)) {
      throw erro('esse convite não existe mais', 404);
    }
    // Confere os limites de novo: a agenda de um dos dois pode ter enchido enquanto o convite esperava.
    if (this.meuDiscipuladorAtivo(x.discipulo)) throw erro('essa pessoa já tem alguém acompanhando', 409);
    if (this.discipulosAtivosDe(x.discipulador).length >= LIMITE_DISCIPULOS) throw erro('esse discipulador já acompanha ' + LIMITE_DISCIPULOS + ' pessoas', 409);
    x.estado = 'ativo';
    x.aceitoEm = hoje;
    x.mostrar = mostrarValido(mostrar);
    // Marco automático: quem passa a ter o primeiro discípulo ativo ganha "discipula" sozinho,
    // sem sobrescrever se a pessoa já tinha apagado o marco antes.
    const discipuladorConta = this.achar(x.discipulador);
    if (discipuladorConta && !((discipuladorConta.marcos || {}).discipula) && this.discipulosAtivosDe(x.discipulador).length === 1) {
      discipuladorConta.marcos = { ...(discipuladorConta.marcos || {}), discipula: hoje };
    }
    await this.salvar();
    return x;
  }

  async recusarDiscipulado(eu, id) {
    const a = this.exigirCompleto(eu);
    const x = this.discipulado(id);
    if (!x || x.estado !== 'convidado' || x.pediu === a.usuario || (x.discipulador !== a.usuario && x.discipulo !== a.usuario)) return;
    delete this.dados.discipulados[id];
    await this.salvar();
  }

  // O discípulo muda o que mostra quando quiser; só ele, e só enquanto o discipulado está ativo.
  async definirMostrarDiscipulado(eu, id, mostrar) {
    const a = this.exigirCompleto(eu);
    const x = this.discipulado(id);
    if (!x || x.estado !== 'ativo' || x.discipulo !== a.usuario) throw erro('discipulado não encontrado', 404);
    x.mostrar = mostrarValido(mostrar);
    await this.salvar();
    return x;
  }

  // Qualquer um dos dois marca "nos encontramos": hoje ou até 7 dias atrás, só a data.
  async registrarEncontroDiscipulado(eu, id, data, hoje) {
    const a = this.exigirCompleto(eu);
    const x = this.discipulado(id);
    if (!x || x.estado !== 'ativo' || (x.discipulador !== a.usuario && x.discipulo !== a.usuario)) throw erro('discipulado não encontrado', 404);
    if (!dataEncontroValida(data, hoje)) throw erro('escolha o dia do encontro, de hoje até 7 dias atrás');
    const d = String(data);
    if (!x.encontros.includes(d)) { x.encontros.push(d); x.encontros.sort(); }
    await this.salvar();
    return x;
  }

  // Qualquer um dos dois encerra, sem aviso ao outro além de a relação sumir da tela.
  async encerrarDiscipulado(eu, id, hoje) {
    const a = this.exigirCompleto(eu);
    const x = this.discipulado(id);
    if (!x || x.estado === 'encerrado' || (x.discipulador !== a.usuario && x.discipulo !== a.usuario)) throw erro('discipulado não encontrado', 404);
    x.estado = 'encerrado';
    x.encerradoEm = hoje;
    await this.salvar();
    return x;
  }

  // ---------- minha caminhada (marcos pessoais) ----------
  // Vivem soltos no extra da conta (campo "marcos"), sem coluna própria: é só uma data opcional
  // por marco, e o discipulador só os vê se a pessoa ligar "mostrar marcos".
  async definirMarco(eu, chave, data) {
    const a = this.exigirCompleto(eu);
    if (!MARCOS.includes(chave)) throw erro('marco desconhecido');
    const d = String(data || '');
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw erro('data inválida');
    const marcos = { ...(a.marcos || {}) };
    if (d) marcos[chave] = d; else delete marcos[chave];
    a.marcos = marcos;
    await this.salvar();
    return marcos;
  }

  // ---------- cuidado mútuo (Atos 2.42, 2.44-45) ----------
  // O pedido é do autor; os outros só respondem com um gesto sem texto. As regras (limites,
  // quem vê, o que esconde) moram em cuidado.mjs; aqui só o estado é guardado.
  pedido(id) { return (this.dados.pedidos || {})[String(id || '')] || null; }
  pedidosDaCelula(celula) { return Object.values(this.dados.pedidos || {}).filter((r) => r.celula === celula); }

  // Membro ativo que não está só conhecendo (visitante): só ele cria, vê e reage.
  membroDeCuidado(p, usuario) { return !!p && p.membros.some((m) => m.usuario === usuario && membroDeVerdade(m)); }

  celulaDeCuidado(id) {
    const p = this.proposito(id);
    if (!p || p.encerradoEm || !p.celula) throw erro('célula não encontrada', 404);
    return p;
  }

  async criarPedido(eu, { celula, tipo, destino, texto, dias } = {}, hoje) {
    const a = this.exigirCompleto(eu);
    const p = this.celulaDeCuidado(celula);
    if (!this.membroDeCuidado(p, a.usuario)) throw erro('quem só está conhecendo a célula ainda não pede', 403);
    if (!tipoValido(tipo)) throw erro('escolha se é um pedido de oração ou de ajuda');
    if (!destinoValido(tipo, destino)) throw erro('escolha para quem é o pedido');
    if (!diasValido(dias)) throw erro('escolha por quanto tempo o pedido fica de pé');
    if (!textoValido(tipo, texto)) throw erro('escreva o pedido, dentro do tamanho permitido');
    const ativos = this.pedidosDaCelula(p.id).filter((r) => r.autor === a.usuario && r.estado === 'ativo');
    if (ativos.length >= LIMITE_ATIVOS_POR_CELULA) throw erro('você já tem ' + LIMITE_ATIVOS_POR_CELULA + ' pedidos ativos nessa célula', 409);
    const id = 'r' + randomBytes(6).toString('hex');
    this.dados.pedidos[id] = {
      id, celula: p.id, autor: a.usuario, tipo, destino, texto: limparTexto(texto),
      criadoEm: hoje, venceEm: venceEmDe(hoje, dias), estado: 'ativo', removidoPor: '', gestos: [], denuncias: [],
    };
    await this.salvar();
    return this.dados.pedidos[id];
  }

  pedidoVisivel(id, usuario) {
    const r = this.pedido(id);
    if (!r) return null;
    const p = this.proposito(r.celula);
    if (!p || !this.membroDeCuidado(p, usuario)) return null;
    return { r, p };
  }

  async orarPorPedido(eu, id, hoje) {
    const a = this.exigirCompleto(eu);
    const achado = this.pedidoVisivel(id, a.usuario);
    if (!achado) throw erro('pedido não encontrado', 404);
    const { r } = achado;
    if (r.autor === a.usuario) throw erro('não dá para orar pelo próprio pedido', 400);
    if (!r.gestos.some((g) => g.usuario === a.usuario && g.gesto === 'orei' && g.data === hoje)) {
      r.gestos.push({ usuario: a.usuario, gesto: 'orei', data: hoje });
      await this.salvar();
    }
    return r;
  }

  async ajudarPedido(eu, id, hoje) {
    const a = this.exigirCompleto(eu);
    const achado = this.pedidoVisivel(id, a.usuario);
    if (!achado) throw erro('pedido não encontrado', 404);
    const { r } = achado;
    if (r.tipo !== 'necessidade') throw erro('"posso ajudar" é só para pedido de ajuda', 400);
    if (r.autor === a.usuario) throw erro('não dá para ajudar no próprio pedido', 400);
    if (!r.gestos.some((g) => g.usuario === a.usuario && g.gesto === 'ajudo')) {
      r.gestos.push({ usuario: a.usuario, gesto: 'ajudo', data: hoje });
      await this.salvar();
    }
    return r;
  }

  // Só o autor marca "Deus respondeu": some da lista dos outros e fica só 7 dias na dele
  // (o vencimento é encurtado, sem precisar de um campo novo no banco).
  async marcarRespondido(eu, id, hoje) {
    const a = this.exigirCompleto(eu);
    const r = this.pedido(id);
    if (!r || r.autor !== a.usuario || r.estado !== 'ativo') throw erro('pedido não encontrado', 404);
    r.estado = 'respondido';
    r.venceEm = somaDias(hoje, 7);
    await this.salvar();
    return r;
  }

  // Só o autor apaga, e apaga de vez (com os gestos e denúncias): não é moderação, é a
  // pessoa recolhendo o próprio pedido.
  async apagarPedido(eu, id) {
    const a = this.exigirCompleto(eu);
    const r = this.pedido(id);
    if (!r || r.autor !== a.usuario) throw erro('pedido não encontrado', 404);
    delete this.dados.pedidos[id];
    await this.salvar();
  }

  // Qualquer um que vê o pedido pode denunciar, uma vez só; quem denuncia nunca é
  // identificado para o autor (a lista de denúncias só aparece para quem conduz).
  async denunciarPedido(eu, id, motivo) {
    const a = this.exigirCompleto(eu);
    const achado = this.pedidoVisivel(id, a.usuario);
    if (!achado) throw erro('pedido não encontrado', 404);
    const { r } = achado;
    if (r.autor === a.usuario) throw erro('não dá para denunciar o próprio pedido', 400);
    if (!motivoDenunciaValido(motivo)) throw erro('escolha um motivo');
    if (!r.denuncias.some((n) => n.usuario === a.usuario)) {
      r.denuncias.push({ usuario: a.usuario, motivo, em: new Date().toISOString() });
      await this.salvar();
    }
    return r;
  }

  // Só quem conduz decide: "manter" limpa as denúncias (o pedido volta a aparecer para
  // todos); "tirar" remove o pedido e guarda quem decidiu.
  async decidirPedido(eu, id, manter) {
    const a = this.exigirCompleto(eu);
    const r = this.pedido(id);
    if (!r) throw erro('pedido não encontrado', 404);
    const p = this.proposito(r.celula);
    if (!p || !podeConduzir(p, a.usuario)) throw erro('só quem conduz a célula pode fazer isso', 403);
    if (manter) r.denuncias = [];
    else { r.estado = 'removido'; r.removidoPor = a.usuario; }
    await this.salvar();
    return r;
  }

  // Limpeza: 30 dias depois de vencido (ou de "Deus respondeu" ter encurtado o vencimento),
  // o pedido some do banco de vez, com gestos e denúncias.
  async limparPedidosVencidos(hoje) {
    let mudou = false;
    for (const id of Object.keys(this.dados.pedidos || {})) {
      if (vencidoParaApagar(this.dados.pedidos[id], hoje)) { delete this.dados.pedidos[id]; mudou = true; }
    }
    if (mudou) await this.salvar();
    return mudou;
  }

  // ---------- denúncias ----------
  // Sem equipe e sem e-mail configurado, a denúncia fica guardada para o dono do servidor.
  async denunciar(eu, contra, motivo) {
    const a = this.exigirCompleto(eu);
    const b = this.achar(contra);
    if (!b || b.usuario === a.usuario) throw erro('conta não encontrada', 404);
    if (!MOTIVOS_DENUNCIA.includes(motivo)) throw erro('escolha um motivo');
    this.dados.denuncias.push({ de: a.usuario, contra: b.usuario, motivo, em: new Date().toISOString() });
    this.dados.denuncias = this.dados.denuncias.slice(-500);
    await this.salvar();
  }
}

// Um pedaço do resumo da senha, para entrar na assinatura da sessão. Trocar a senha
// muda o selo, e todo crachá emitido antes para de valer.
// O selo entra na assinatura do crachá e do link de senha: muda quando a senha muda e quando a
// pessoa sai dos outros aparelhos. Conta sem "sessao" tem o mesmo selo de antes, então ninguém
// foi derrubado quando o campo nasceu.
export const seloDaConta = (conta) => String((conta && conta.senha) || '').slice(0, 16) + String((conta && conta.sessao) || '');

// Onde mora o progresso de cada conta.
export function arquivoDoEstado(base, usuario) {
  const nome = limparNome(usuario);
  if (!nome || nome === 'caminho') return base;
  return base.replace(/\.json$/, '') + '-' + nome + '.json';
}

// ---------- o que o dia de cada um diz ----------
// Uma data está feita quando a pessoa concluiu a lição do plano, uma lição de primeiros
// passos até o fim, ou um dia do Conhecer Jesus. Orar, escrever e praticar não contam.
export function datasFeitas(estado) {
  const s = new Set();
  for (const d of Object.values((estado && estado.marcadoEm) || {})) if (d) s.add(d);
  for (const d of Object.values((estado && estado.licoesEm) || {})) if (d) s.add(d);
  for (const d of Object.values((estado && estado.conhecidos) || {})) if (d) s.add(d);
  return s;
}

// Dias de propósito: datas seguidas, desde o aceite, em que os dois fizeram a lição.
// Um dia coberto por escudo de um dos dois congela a contagem: não soma e não quebra.
// Hoje só entra quando os dois já leram; senão, a contagem para em ontem.
export function diasDeProposito(a, b, desde, hoje) {
  const feito = (p, d) => p.feitas.has(d);
  const coberto = (p, d) => p.feitas.has(d) || p.protegidos.has(d);
  let cursor = feito(a, hoje) && feito(b, hoje) ? hoje : somaDias(hoje, -1);
  let dias = 0;
  while (desde && cursor >= desde && coberto(a, cursor) && coberto(b, cursor)) {
    if (feito(a, cursor) && feito(b, cursor)) dias++;
    cursor = somaDias(cursor, -1);
  }
  return dias;
}

// O que um amigo aceito vê: nome, foto e se leu hoje. Pontos, registros, orações,
// anotações, e-mail e data de nascimento não entram aqui em hipótese alguma.
export function resumoDeAmigo(conta, estado, hoje) {
  return {
    usuario: conta.usuario,
    nome: (estado && estado.apelido) || conta.nome || conta.usuario,
    foto: (estado && estado.foto) || '',
    leuHoje: datasFeitas(estado).has(hoje),
  };
}
