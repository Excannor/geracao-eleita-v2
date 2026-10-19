// Coloca um estudo pronto na célula de um líder, direto no banco, como se ele mesmo o tivesse
// preparado e salvo pelo app (À Mesa: docs/a-mesa-fase1.md e docs/a-mesa-fase2.md). Serve para o
// dono do servidor pôr um estudo escrito fora do app (o dele, "Batalha espiritual, vigilância e
// Armadura de Deus", está em ferramentas/estudo-exemplo.txt) na célula, sem colar no celular.
//
// Uso: node ferramentas/colocar-estudo.mjs <@usuario> [--celula <id>] [--arquivo <txt>] [--sim]
//   <@usuario>       o líder da célula (com ou sem o @)
//   --celula <id>    qual célula, quando ele lidera mais de uma (sem isso, a ferramenta lista e para)
//   --arquivo <txt>  o texto do estudo, como no campo "Eu escrevo" do preparo
//                    (padrão: ferramentas/estudo-exemplo.txt)
//   --sim            grava. Sem ele, só mostra a prévia, e nada muda.
//
// O que grava: o mesmo pedido que a tela de preparo manda ao salvar um estudo novo (POST api/celula,
// ação "estudo"), por Contas.salvarEstudo e com as mesmas opções do servidor (regras-app.mjs,
// opcoesDoEstudo). Tradução NBV. A referência citada no meio de um parágrafo, que o passo 2 do
// preparo mostra como "Sugestão", vira cartão, como se o líder tocasse em "Mostrar o
// cartão" (no estudo do dono, Lucas 11.24-26: são 6 cartões). Perguntas: as que o passo 3 do
// preparo já deixa marcadas, isto é, a primeira da reflexão do dia do plano que cruza um cartão (no
// estudo do dono, o dia 244, que lê Efésios 6) e a de aplicação do método OIA ("O que muda na
// minha semana? ..."). Sem combinado.
// Acolhida, adoração e testemunho vazios, como o preparo deixa num estudo novo: o app mostra as
// sugestões da semana. O estudo entra como estudo novo: o atual da célula, se havia, vai para
// Estudos anteriores, como quando o líder prepara o próximo.
//
// A pasta de dados é a do servidor: a de CAMINHO_ESTADO (no container, /app/dados) ou, sem ela,
// dados/ ao lado do app. Tudo roda antes numa cópia do banco (VACUUM INTO, numa pasta temporária
// que some no fim): a prévia mostra o que de fato seria gravado, e um erro aparece sem mudar nada.
// Sem --sim o banco de verdade só é lido. Com --sim, depois da cópia dar certo, grava no banco de
// verdade.
//
// NUNCA grave com o app no ar. O servidor guarda as células na memória e, na próxima vez que
// salvasse aquela célula, voltaria o ponteiro para o estudo de antes. Com --sim, a ferramenta
// recusa quando o app responde em 127.0.0.1 na porta PORTA (8080 no container) ou no serviço
// "caminho" da rede do docker compose (http://caminho:8080).
// A prévia funciona com o app no ar: ela só lê.
//
// No Raspberry, na pasta do app (a mesma do publicar.ps1, ~/geracao-eleita), depois de publicar a
// versão que traz esta ferramenta (a imagem precisa tê-la):
//   sudo docker compose run --rm --no-deps caminho node ferramentas/colocar-estudo.mjs maarcos_e
//   sudo docker compose stop caminho
//   sudo docker compose run --rm --no-deps caminho node ferramentas/colocar-estudo.mjs maarcos_e --sim
//   sudo docker compose up -d caminho && sudo docker compose up -d --force-recreate tunel-fixo
// A primeira linha é a prévia, com o app ainda no ar. O app fica parado só entre a segunda e a
// quarta. O "run" usa a mesma imagem, as mesmas variáveis (environment e o .env) e os mesmos
// volumes do serviço caminho (./dados em /app/dados); --no-deps não sobe mais nada e --rm apaga o
// container no fim. Se ele lidera mais de uma célula, acrescente --celula <id> nas duas chamadas
// (a prévia lista os ids). Recriar o túnel no fim é o mesmo passo do publicar.ps1: parar o
// caminho derruba a rede que o tunel-fixo usa.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'node:http';
import { Contas, limparNome, hojeNoFuso } from '../contas.mjs';
import { abrirBanco, fecharBanco, arquivoDoBanco, lerMeta, lerEstadoDoBanco, DatabaseSync } from '../db.mjs';
import { carregarRegrasDoApp } from '../regras-app.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARQUIVO_PADRAO = join(RAIZ, 'ferramentas', 'estudo-exemplo.txt');
// Os tetos do passo 3 do preparo (estudo-preparo.js, PERGUNTAS_MAX e PERGUNTA_MAX).
const PERGUNTAS_MAX = 6;
const PERGUNTA_MAX = 300;

export const USO = [
  'Uso: node ferramentas/colocar-estudo.mjs <@usuario> [--celula <id>] [--arquivo <txt>] [--sim]',
  '  <@usuario>       o líder da célula (com ou sem o @)',
  '  --celula <id>    qual célula, quando a pessoa lidera mais de uma',
  '  --arquivo <txt>  o texto do estudo (padrão: ferramentas/estudo-exemplo.txt)',
  '  --sim            grava; sem ele, só mostra a prévia e nada muda',
].join('\n');

// ---------- funções puras (o teste.mjs as confere) ----------

// Lê a linha de comando. Devolve { usuario, celula, arquivo, sim, ajuda } ou { erro }.
export function lerArgumentos(lista) {
  const a = { usuario: '', celula: '', arquivo: '', sim: false, ajuda: false };
  const seguinte = (i) => {
    const v = lista[i + 1];
    return v === undefined || String(v).startsWith('--') ? null : String(v);
  };
  for (let i = 0; i < lista.length; i++) {
    const x = String(lista[i]);
    const [nome, junto] = x.startsWith('--') && x.includes('=') ? [x.slice(0, x.indexOf('=')), x.slice(x.indexOf('=') + 1)] : [x, null];
    if (nome === '--sim') a.sim = true;
    else if (nome === '--ajuda' || nome === '-h' || nome === '--help') a.ajuda = true;
    else if (nome === '--celula' || nome === '--arquivo') {
      const v = junto !== null ? junto : seguinte(i);
      if (!v) return { erro: 'Falta o valor de ' + nome + '.' };
      if (junto === null) i++;
      a[nome.slice(2)] = v;
    } else if (x.startsWith('-')) return { erro: 'Não conheço a opção ' + x + '.' };
    else if (a.usuario) return { erro: 'Escreva só um @ (já veio ' + a.usuario + ').' };
    else a.usuario = x;
  }
  if (!a.ajuda && !limparNome(a.usuario)) return { erro: 'Falta o @ do líder da célula.' };
  return a;
}

// As células abertas em que a pessoa é a líder: quem criou a célula e continua nela como membro
// ativo (a regra de Contas.celulaDeQuemPrepara; a aprovação pendente do líder menor de idade quem
// recusa é o próprio salvarEstudo). Em ordem de título.
export function celulasQueLidera(propositos, usuario) {
  const u = limparNome(usuario);
  return (propositos || [])
    .filter((p) => p && p.celula && !p.encerradoEm && p.criadoPor === u && (p.membros || []).some((m) => m.usuario === u && m.estado === 'ativo'))
    .map((p) => ({ id: p.id, titulo: p.titulo || '' }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR') || a.id.localeCompare(b.id));
}

// Qual célula usar. Devolve { celula } ou { motivo: 'nenhuma' | 'varias' | 'outra' }.
export function escolherCelula(celulas, pedida = '') {
  if (!celulas || !celulas.length) return { motivo: 'nenhuma' };
  if (pedida) {
    const c = celulas.find((x) => x.id === pedida);
    return c ? { celula: c } : { motivo: 'outra' };
  }
  return celulas.length > 1 ? { motivo: 'varias' } : { celula: celulas[0] };
}

// As perguntas que o passo 3 do preparo deixa marcadas, a partir dos grupos de
// CC.estudoRegras.gruposDePerguntas: na ordem dos grupos, as marcadas de saída, sem as de mais de
// 300 caracteres (o servidor as recusaria) e até 6 (estudo-preparo.js, montarPerguntas).
// Devolve [{ texto, de }], com de = o título do grupo.
export function perguntasEscolhidas(grupos, { maximo = PERGUNTAS_MAX, tamanho = PERGUNTA_MAX } = {}) {
  const lista = [];
  for (const g of grupos || []) {
    for (const q of g.perguntas || []) {
      const texto = String(q || '').trim();
      if (!texto || !(g.marcadas || []).includes(q) || texto.length > tamanho) continue;
      if (lista.length < maximo && !lista.some((x) => x.texto === texto)) lista.push({ texto, de: g.titulo || '' });
    }
  }
  return lista;
}

// "Mostrar o cartão" em cada "Sugestão" do passo 2 do preparo (estudo-preparo.js, data-mostrar):
// a referência citada no meio de um parágrafo entra numa linha só, logo depois dele, e o texto é
// lido de novo, uma sugestão por vez, como o líder tocaria de cima para baixo. lerEstudo é o
// CC.lerEstudo das regras do app; opcoes, as do passo 2 (capitulos, versiculos).
// Devolve { fonte, aceitas: [refs] }.
export function aceitarSugestoes(fonte, lerEstudo, opcoes = {}) {
  const normalizar = (t) => String(t == null ? '' : t).replace(/\r\n?|[\u2028\u2029]/g, '\n').replace(/^(?:[ \t\u00a0]*\n)+/, '').replace(/\s+$/, '');
  let atual = fonte;
  const aceitas = [];
  for (let volta = 0; volta < 50; volta++) {
    const r = lerEstudo(atual, { ...opcoes, semCartao: [] });
    const s = (r.sugestoes || [])[0];
    if (!s) break;
    const linhas = normalizar(atual).split('\n');
    linhas.splice(r.blocos[s.bloco].l[1] + 1, 0, s.ref);
    atual = linhas.join('\n');
    aceitas.push(s.ref);
  }
  return { fonte: atual, aceitas };
}

// O corpo que a tela de preparo manda ao salvar um estudo escrito novo (estudo-preparo.js, salvar):
// base vazia (estudo novo), NBV, sem combinado e os três campos da semana vazios.
export function pedidoDoEstudo({ id, fonte, perguntas }) {
  return {
    acao: 'estudo', id, estudo: 'blocos', fonte, ref: '', traducao: 'nbv',
    perguntas: (perguntas || []).map((x) => (typeof x === 'string' ? x : x.texto)),
    base: '', combinado: '', acolhida: '', adoracao: '', testemunho: '',
  };
}

// O pedido inteiro, como o preparo o monta do texto colado até o "Salvar o estudo". R: as regras do
// app (regras-app.mjs, carregarRegrasDoApp com src/sob-demanda/estudo-regras.js nos extras).
// Devolve { corpo, perguntas: [{ texto, de }], aceitas: [refs que viraram cartão] }.
export function montarPedido({ id, texto, R }) {
  const C = R.regras;
  // O passo 2, na NBV: cada "Sugestão" vira cartão ("Mostrar o cartão").
  const { fonte, aceitas } = aceitarSugestoes(texto, C.lerEstudo, { capitulos: R.capitulos, versiculos: R.versiculosDa('nbv') });
  // O passo 3 (estudo-preparo.js, montarPerguntas): o leitor de marcas acha os cartões e a seção
  // "Perguntas" do texto, e os grupos dizem quais vêm marcadas. A parábola, que o app busca na rede,
  // nunca traz pergunta marcada e fica de fora.
  const lido = C.lerEstudo(fonte, { capitulos: R.capitulos });
  const doTexto = lido.perguntas.concat(...lido.avisos.filter((x) => x.tipo === 'perguntas-demais').map((x) => x.perguntas));
  const reflexaoEscrita = (n) => { const l = R.reflexoes[n] || R.reflexoes[String(n)]; return Array.isArray(l) && l.length ? l[0] : null; };
  const grupos = C.estudoRegras.gruposDePerguntas({ tipo: 'blocos', perguntas: doTexto, refs: lido.refs },
    { plano: R.plano, reflexaoEscrita, refs: lido.refs, semana: null, parabola: null, doTexto });
  const perguntas = perguntasEscolhidas(grupos);
  return { corpo: pedidoDoEstudo({ id, fonte, perguntas }), perguntas, aceitas };
}

// As regras do app com as do estudo da célula (CC.estudoRegras), que montarPedido usa.
export const carregarRegras = (raiz = RAIZ) => carregarRegrasDoApp(raiz, { extras: ['src/sob-demanda/estudo-regras.js'] });

// ---------- o app está no ar? ----------

function responde(url, ms = 1500) {
  return new Promise((pronto) => {
    const req = request(url, { method: 'GET', timeout: ms }, (res) => { res.resume(); pronto(true); });
    req.on('timeout', () => { req.destroy(); pronto(false); });
    req.on('error', () => pronto(false));
    req.end();
  });
}

// Devolve '' quando o app não está no ar, ou a frase que diz onde ele respondeu. Duas portas: a
// deste computador (PORTA, 8080 no container; fora do Docker, o servidor rodando aqui) e a do
// serviço "caminho" na rede do docker compose, onde o container do "docker compose run" também
// está. Parado o serviço, o nome "caminho" não existe mais na rede e a pergunta falha na hora.
export async function appNoAr({ porta = Number(process.env.PORTA) || 8080 } = {}) {
  const enderecos = ['http://127.0.0.1:' + porta + '/api/existe-conta', 'http://caminho:8080/api/existe-conta'];
  const respostas = await Promise.all(enderecos.map((e) => responde(e)));
  const i = respostas.indexOf(true);
  return i < 0 ? '' : 'o app respondeu em ' + enderecos[i];
}

// ---------- o trabalho ----------

const dizer = (t = '') => console.log(t);
const dataCurta = (iso, fuso) => {
  if (!iso) return '';
  const [a, m, d] = hojeNoFuso(fuso, new Date(iso)).split('-');
  return d + '/' + m + '/' + a;
};
const tituloDe = (e) => e.titulo || (e.tipo === 'semana' ? 'A leitura da semana' : e.ref) || 'sem título';
// Uma cópia consistente do banco, lida por uma conexão só de leitura: funciona com o app no ar e
// não muda nada no banco de verdade.
function copiarSoLendo(origem, destino) {
  const leitura = new DatabaseSync(origem, { readOnly: true });
  try {
    leitura.exec("VACUUM INTO '" + String(destino).replace(/'/g, "''") + "'");
  } finally {
    leitura.close();
  }
}

class Recusa extends Error {}
const recusar = (...linhas) => { throw new Recusa(linhas.join('\n')); };

// Roda tudo numa pasta de dados: carrega as contas como o servidor, escolhe a célula, monta o
// pedido e chama salvarEstudo. Devolve o que a prévia e o fim mostram.
async function colocar(pasta, a, texto, R) {
  const arquivoDb = arquivoDoBanco(pasta);
  const db = abrirBanco(arquivoDb);
  try {
    if (lerMeta(db, 'importado:contas') === null) {
      recusar('Este banco ainda não tem as contas do app. Suba o app uma vez com esta pasta de dados antes.');
    }
    const contas = await new Contas(join(pasta, 'contas.json')).carregar();
    const usuario = limparNome(a.usuario);
    const conta = contas.achar(usuario);
    if (!conta) recusar('Não achei a conta @' + usuario + ' neste banco. Confira o @ (sem espaços; o @ no começo é opcional).');

    const celulas = celulasQueLidera(Object.values(contas.dados.propositos || {}), usuario);
    const lista = () => celulas.map((c) => '  ' + c.id + '  ' + (c.titulo || '(sem título)')).join('\n');
    const escolha = escolherCelula(celulas, a.celula);
    if (escolha.motivo === 'nenhuma') {
      recusar('@' + usuario + ' não é líder de nenhuma célula aberta.',
        'Só o líder prepara o estudo da célula: é a pessoa que criou a célula e continua nela.');
    }
    if (escolha.motivo === 'varias') {
      recusar('@' + usuario + ' lidera ' + celulas.length + ' células:', lista(),
        'Escolha uma com --celula <id> e rode de novo.');
    }
    if (escolha.motivo === 'outra') {
      recusar('A célula ' + a.celula + ' não está entre as que @' + usuario + ' lidera:', lista());
    }
    const p = contas.proposito(escolha.celula.id);
    const antes = p.estudoId ? contas.estudo(p.estudoId) : null;

    const { corpo, perguntas, aceitas } = montarPedido({ id: p.id, texto, R });
    let estadoDoLider = null;
    try { estadoDoLider = lerEstadoDoBanco(db, usuario); } catch { estadoDoLider = null; }
    let r;
    try {
      r = await contas.salvarEstudo(usuario, p.id, corpo, R.opcoesDoEstudo(estadoDoLider));
    } catch (e) {
      if (e instanceof Recusa) throw e;
      recusar('O app recusou o estudo: ' + e.message + '.');
    }
    return { conta, celula: p, antes, estudo: r.estudo, perguntas, aceitas, fuso: conta.fuso };
  } finally {
    fecharBanco(arquivoDb);
  }
}

function mostrar(x, arquivo) {
  const e = x.estudo;
  dizer('Pessoa: @' + x.conta.usuario + (x.conta.nome ? ' (' + x.conta.nome + ')' : ''));
  dizer('Célula: ' + (x.celula.titulo || '(sem título)') + ' (id ' + x.celula.id + ')');
  if (x.antes) {
    dizer('Estudo atual da célula: "' + tituloDe(x.antes) + '", preparado em ' + dataCurta(x.antes.criadoEm, x.fuso) + '.');
    dizer('  Ele vai para Estudos anteriores.');
  } else {
    dizer('Estudo atual da célula: nenhum.');
  }
  dizer('');
  dizer('O estudo que entra:');
  dizer('  Arquivo: ' + arquivo);
  dizer('  Título: ' + e.titulo);
  dizer('  Partes: ' + e.blocos.length);
  dizer('  Versículos: ' + e.refs.length + ', na NBV');
  for (const ref of e.refs) dizer('    ' + ref + (x.aceitas.includes(ref) ? ' (citada no meio do texto: vira cartão, como "Mostrar o cartão")' : ''));
  dizer('  Perguntas para conversar: ' + e.perguntas.length);
  e.perguntas.forEach((q, i) => {
    const de = (x.perguntas.find((y) => y.texto === q) || {}).de;
    dizer('    ' + (i + 1) + '. ' + q + (de ? ' (' + de.replace(/^D[ao] /, (m) => m.toLowerCase()) + ')' : ''));
  });
  dizer('  Combinado para a semana: nenhum');
  dizer('  Acolhida, adoração e testemunho: vazios (o app mostra as sugestões da semana)');
  dizer('  Preparado por: @' + e.criadoPor);
}

export async function principal(argv = process.argv.slice(2)) {
  const a = lerArgumentos(argv);
  if (a.erro) { dizer(a.erro); dizer(''); dizer(USO); return 2; }
  if (a.ajuda) { dizer(USO); return 0; }

  // A pasta de dados como o servidor a acha (servidor.mjs, ESTADO e PASTA_DADOS).
  const estado = process.env.CAMINHO_ESTADO || join(RAIZ, 'dados', 'estado.json');
  const pasta = dirname(resolve(estado));
  const banco = arquivoDoBanco(pasta);
  const arquivo = a.arquivo ? resolve(a.arquivo) : ARQUIVO_PADRAO;
  const nomeArquivo = relative(RAIZ, arquivo).startsWith('..') ? arquivo : relative(RAIZ, arquivo);

  dizer(a.sim ? 'Colocar um estudo na célula (com --sim: grava no banco)' : 'Colocar um estudo na célula (prévia: nada é gravado)');
  dizer('Pasta de dados: ' + pasta);
  dizer('');
  if (!existsSync(banco)) {
    dizer('Não achei o banco do app em ' + banco + '.');
    dizer('Confira CAMINHO_ESTADO (no container é /app/dados/estado.json, e o banco fica ao lado). Nada foi mudado.');
    return 1;
  }
  let fonte;
  try {
    fonte = readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    dizer('Não consegui ler o arquivo do estudo: ' + arquivo + '. Nada foi mudado.');
    return 1;
  }

  const noAr = await appNoAr();
  if (noAr && a.sim) {
    dizer('O app está no ar (' + noAr + ').');
    dizer('Gravar com o app no ar não funciona: ele guarda as células na memória e desfaria a mudança.');
    dizer('Pare o app antes (no Raspberry: sudo docker compose stop caminho), rode de novo com --sim e depois suba o app.');
    dizer('Nada foi mudado.');
    return 1;
  }

  const R = carregarRegras();
  // Primeiro numa cópia: a prévia, e a conferência antes de gravar.
  const temporaria = mkdtempSync(join(tmpdir(), 'ge-colocar-estudo-'));
  let previa;
  try {
    copiarSoLendo(banco, arquivoDoBanco(temporaria));
    previa = await colocar(temporaria, a, fonte, R);
  } catch (e) {
    if (!(e instanceof Recusa)) throw e;
    dizer(e.message);
    dizer('Nada foi mudado.');
    return 1;
  } finally {
    rmSync(temporaria, { recursive: true, force: true });
  }

  mostrar(previa, nomeArquivo);
  dizer('');
  if (!a.sim) {
    if (noAr) dizer('O app está no ar (' + noAr + '). Para gravar, ele precisa estar parado.');
    dizer('Isto foi só a prévia: nada foi gravado.');
    dizer('Para gravar, pare o app e rode o mesmo comando com --sim.');
    return 0;
  }

  // Agora no banco de verdade, com o app parado.
  let feito;
  try {
    feito = await colocar(pasta, a, fonte, R);
  } catch (e) {
    if (!(e instanceof Recusa)) throw e;
    dizer(e.message);
    dizer('Nada foi mudado.');
    return 1;
  }
  dizer('Estudo gravado na célula "' + (feito.celula.titulo || feito.celula.id) + '" (id do estudo ' + feito.estudo.id + ').');
  if (feito.antes) dizer('O estudo de antes, "' + tituloDe(feito.antes) + '", está em Estudos anteriores.');
  dizer('Agora suba o app (no Raspberry: sudo docker compose up -d caminho && sudo docker compose up -d --force-recreate tunel-fixo).');
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().then((codigo) => { process.exitCode = codigo; }, (e) => {
    console.error('Erro inesperado: ' + ((e && e.stack) || e));
    console.error('Confira a célula no app antes de tentar de novo.');
    process.exitCode = 1;
  });
}
