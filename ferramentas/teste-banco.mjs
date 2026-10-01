// Confere a migração dos arquivos JSON para o banco. Com dados reais à mão (uma cópia dos
// dados do HML, que já são uma cópia de produção, em dados/ ou em json-legado-*), eles têm
// preferência: vão para uma pasta temporária e o servidor sobe em cima dela, sem tocar em
// nenhum arquivo do HML. Sem eles, o ensaio corre sobre um conjunto sintético no mesmo
// formato (ferramentas/json-legado-sintetico.mjs): algumas dezenas de contas com acento e
// fuso variados, célula com visitante, discipulado, novidades, notificações, uma conta sem
// progresso e outra com um ano de leitura. O cabeçalho diz qual fonte foi usada.
//
// Confere conta a conta e progresso a progresso, a reinicialização sem reimportar, 50
// gravações simultâneas, o exportador de volta para JSON, e a conta apagada saindo do
// banco, dos backups e dos JSON guardados. Sobre o conjunto sintético, ainda apaga uma conta
// que é membro de célula, discípula, amiga e autora de novidades e pedidos, e confere que
// nada dela sobra em tabela nenhuma, nos backups nem nos JSON de legado.
// Uso: node ferramentas/teste-banco.mjs
import { spawn, execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { DatabaseSync } = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);
const { Contas } = await import(pathToFileURL(join(AQUI, 'contas.mjs')).href);
const { gerarJsonLegado, SENHAS } = await import(pathToFileURL(join(AQUI, 'ferramentas', 'json-legado-sintetico.mjs')).href);
const PORTA = 8221;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// ---------- a fonte: a cópia dos dados reais ou o conjunto sintético ----------
// Os JSON reais vêm da raiz de dados/ ou, se o HML já migrou, da pasta json-legado mais
// nova. Sem nenhum dos dois, o conjunto sintético é gerado direto na pasta do ensaio.
const dadosHml = join(AQUI, 'dados');
const legados = existsSync(dadosHml) ? readdirSync(dadosHml).filter((n) => n.startsWith('json-legado-')).sort() : [];
const temJsonNaRaiz = existsSync(join(dadosHml, 'contas.json'));
const fonte = temJsonNaRaiz ? dadosHml : (legados.length ? join(dadosHml, legados[legados.length - 1]) : null);
const SINTETICO = !fonte;

const PASTA = mkdtempSync(join(tmpdir(), 'cc-banco-'));
const copiados = [];
if (fonte) {
  for (const n of readdirSync(fonte)) {
    const origem = join(fonte, n);
    if (statSync(origem).isFile() && n.endsWith('.json')) { copyFileSync(origem, join(PASTA, n)); copiados.push(n); }
  }
} else {
  copiados.push(...(await gerarJsonLegado(PASTA)).arquivos);
}

// Uma conta com senha conhecida entra no contas.json copiado, para conferir o login depois.
const rascunho = mkdtempSync(join(tmpdir(), 'cc-banco-rascunho-'));
const criada = await (await new Contas(join(rascunho, 'contas.json')).carregar())
  .criar({ usuario: 'ensaio.banco', senha: 'senha-do-ensaio', nome: 'Ensaio', email: 'ensaio@teste.com', nascimento: '2000-01-01', consentimento: true });
const contasJson = JSON.parse(readFileSync(join(PASTA, 'contas.json'), 'utf8'));
contasJson.contas['ensaio.banco'] = { ...criada };
writeFileSync(join(PASTA, 'contas.json'), JSON.stringify(contasJson));
writeFileSync(join(PASTA, 'estado-ensaio.banco.json'), JSON.stringify({ atualizadoEm: 1, lidos: [1, 2, 3], marcadoEm: { 1: '2026-09-10' }, apelido: 'Ensaio', oia: { 1: { oracao: 'texto que é só meu' } } }));
copiados.push('estado-ensaio.banco.json');

// ---------- o retrato de antes ----------
const antes = JSON.parse(readFileSync(join(PASTA, 'contas.json'), 'utf8'));
const estadosAntes = readdirSync(PASTA).filter((n) => /^estado(-.+)?\.json$/.test(n) && !n.endsWith('.bak.json'))
  .map((n) => [n === 'estado.json' ? 'caminho' : n.slice('estado-'.length, -'.json'.length), readFileSync(join(PASTA, n), 'utf8')]);
const novidadesAntes = existsSync(join(PASTA, 'novidades.json')) ? JSON.parse(readFileSync(join(PASTA, 'novidades.json'), 'utf8')) : { eventos: [] };

let saidaServidor = '';
const subir = () => {
  const s = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
    env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_TESTE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  s.stdout.on('data', (d) => { saidaServidor += d; });
  s.stderr.on('data', (d) => { saidaServidor += d; });
  return s;
};
const base = 'http://127.0.0.1:' + PORTA;
const esperarServidor = async () => { for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/existe-conta'); return true; } catch { await dormir(150); } } return false; };
const parar = async (s) => { s.kill(); for (let i = 0; i < 40; i++) { try { await fetch(base + '/api/existe-conta'); await dormir(100); } catch { return; } } };
const pedir = (rota, corpo, cookie, metodo) => fetch(base + rota, {
  method: metodo || (corpo ? 'POST' : 'GET'),
  headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const banco = (sql, ...p) => { const b = new DatabaseSync(join(PASTA, 'caminho.db')); try { return b.prepare(sql).all(...p); } finally { b.close(); } };

console.log('\n  Banco: migração dos JSON antigos ' + (SINTETICO ? 'com um conjunto sintético' : 'com os dados reais do HML') + '\n');
console.log('  fonte: ' + (SINTETICO ? 'sintética (ferramentas/json-legado-sintetico.mjs)' : fonte.replace(AQUI, '.'))
  + ' · ' + copiados.length + ' arquivos · ' + Object.keys(antes.contas).length + ' contas\n');

let servidor = subir();
try {
  ok(await esperarServidor(), 'o servidor sobe em cima dos JSON antigos');

  // ---------- importou tudo ----------
  ok(existsSync(join(PASTA, 'caminho.db')), 'o banco nasce ao lado dos dados');
  const metas = Object.fromEntries(banco('SELECT chave, valor FROM metadados').map((l) => [l.chave, l.valor]));
  ok(['contas', 'novidades', 'notificacoes', 'estados'].every((m) => metas['importado:' + m]), 'contas, novidades, notificações e progresso marcados como importados');

  const contasBanco = banco('SELECT usuario, sal, senha, email, nome FROM contas');
  const nomesAntes = Object.keys(antes.contas).sort();
  ok(JSON.stringify(contasBanco.map((c) => c.usuario).sort()) === JSON.stringify(nomesAntes), 'as ' + nomesAntes.length + ' contas estão todas no banco');
  ok(contasBanco.every((c) => antes.contas[c.usuario] && antes.contas[c.usuario].senha === c.senha && antes.contas[c.usuario].sal === c.sal),
    'o resumo de senha de cada conta é idêntico ao do JSON (ninguém perde o acesso)');
  const amizadesAntes = Object.keys(antes.amizades || {}).length;
  ok(banco('SELECT count(*) n FROM amizades')[0].n === amizadesAntes, 'as ' + amizadesAntes + ' amizades e pedidos vieram junto');
  ok(banco('SELECT count(*) n FROM toques')[0].n === Object.keys(antes.toques || {}).length, 'os toques vieram junto');

  const estadosBanco = new Map(banco('SELECT usuario, dados FROM estados').map((l) => [l.usuario, l.dados]));
  const iguais = estadosAntes.filter(([u, texto]) => estadosBanco.has(u) && JSON.stringify(JSON.parse(estadosBanco.get(u))) === JSON.stringify(JSON.parse(texto)));
  ok(estadosAntes.length > 1 && iguais.length === estadosAntes.length, 'o progresso de cada um é idêntico ao do arquivo (' + iguais.length + ' de ' + estadosAntes.length + ')');

  const vivos = (novidadesAntes.eventos || []).filter((e) => Date.now() - e.em < 30 * 24 * 60 * 60 * 1000).length;
  ok(banco('SELECT count(*) n FROM novidades_eventos')[0].n === vivos, 'as novidades dos últimos 30 dias vieram junto (' + vivos + ')');

  const pastaLegado = readdirSync(PASTA).find((n) => n.startsWith('json-legado-'));
  const naRaiz = readdirSync(PASTA).filter((n) => n.endsWith('.json') && !n.endsWith('.bak.json'));
  ok(!!pastaLegado && naRaiz.length === 0, 'os JSON saem da pasta de dados e ficam guardados em ' + pastaLegado);
  ok(pastaLegado && readdirSync(join(PASTA, pastaLegado)).includes('contas.json'), 'o contas.json antigo está intacto na pasta de legado');
  ok(existsSync(join(PASTA, 'backup')) && readdirSync(join(PASTA, 'backup')).some((n) => /^caminho-\d{4}-\d{2}-\d{2}\.db\.cifrado$/.test(n)), 'o backup do dia é feito na subida, cifrado');

  // ---------- entrar e ler ----------
  const entrou = await pedir('/api/entrar', { login: 'ensaio.banco', senha: 'senha-do-ensaio' });
  const cookie = (entrou.headers.get('set-cookie') || '').split(';')[0];
  ok(entrou.status === 200, 'a conta migrada entra com a senha de sempre');
  const meu = await (await pedir('/api/estado', null, cookie)).json();
  ok(JSON.stringify(meu.lidos) === '[1,2,3]', 'e encontra o próprio progresso');

  // ---------- reiniciar ----------
  await parar(servidor);
  saidaServidor = '';
  servidor = subir();
  ok(await esperarServidor(), 'o servidor sobe de novo');
  ok(!/importado/.test(saidaServidor), 'na segunda subida nada é importado de novo');
  ok(banco('SELECT count(*) n FROM contas')[0].n === nomesAntes.length && banco('SELECT count(*) n FROM estados')[0].n === estadosBanco.size,
    'as contagens continuam as mesmas depois de reiniciar');
  ok((await pedir('/api/quem', null, cookie)).status === 200, 'a sessão aberta antes de reiniciar continua valendo');

  // ---------- gravações simultâneas ----------
  const pessoas = [];
  for (let i = 1; i <= 5; i++) {
    const r = await pedir('/api/criar-conta', { usuario: 'carga' + i, senha: 'senha-de-carga', nome: 'Carga', email: 'carga' + i + '@teste.com', nascimento: '2000-01-01', consentimento: true });
    pessoas.push((r.headers.get('set-cookie') || '').split(';')[0]);
  }
  const gravacoes = [];
  for (let n = 1; n <= 50; n++) {
    const quem = pessoas[n % 5];
    gravacoes.push(pedir('/api/estado', { atualizadoEm: Date.now() + n, lidos: [n], marcadoEm: {} }, quem, 'PUT'));
  }
  const respostas = await Promise.all(gravacoes);
  ok(respostas.every((r) => r.status === 200), '50 gravações de progresso ao mesmo tempo respondem certo');
  const lidosPorPessoa = await Promise.all(pessoas.map(async (c) => ((await (await pedir('/api/estado', null, c)).json()).lidos || []).length));
  ok(lidosPorPessoa.every((n) => n === 10), 'nenhuma se perde: cada pessoa tem as 10 leituras que mandou (' + lidosPorPessoa.join(', ') + ')');

  // ---------- o caminho de volta ----------
  // As cópias .bak.json antigas ficam na pasta de dados de propósito: o que vale é nada mudar.
  const arquivosAntes = readdirSync(PASTA).sort().join('|');
  const saidaExport = mkdtempSync(join(tmpdir(), 'cc-banco-export-'));
  execFileSync(process.execPath, [join(AQUI, 'ferramentas', 'exportar-sqlite-para-json.mjs'), PASTA, saidaExport], { stdio: 'pipe' });
  const exportado = JSON.parse(readFileSync(join(saidaExport, 'contas.json'), 'utf8'));
  ok(Object.keys(exportado.contas).length === nomesAntes.length + 5 && exportado.contas['ensaio.banco'].senha === criada.senha,
    'o exportador devolve as contas em JSON, com os mesmos resumos de senha');
  ok(existsSync(join(saidaExport, 'estado-ensaio.banco.json')) && readdirSync(saidaExport).filter((n) => n.startsWith('estado')).length === estadosBanco.size + 5,
    'e um arquivo de progresso por conta');
  ok(readdirSync(PASTA).sort().join('|') === arquivosAntes, 'exportar não cria nem apaga nada na pasta dos dados');
  rmSync(saidaExport, { recursive: true, force: true });

  // ---------- apagar a conta leva as cópias ----------
  const apagou = await pedir('/api/apagar-conta', { senha: 'senha-do-ensaio' }, cookie);
  ok(apagou.status === 200, 'a conta do ensaio é apagada');
  ok(banco("SELECT count(*) n FROM contas WHERE usuario = 'ensaio.banco'")[0].n === 0
    && banco("SELECT count(*) n FROM estados WHERE usuario = 'ensaio.banco'")[0].n === 0, 'ela sai do banco');
  let nosBackups = 0;
  const { abrirBackup } = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);
  for (const n of readdirSync(join(PASTA, 'backup')).filter((x) => x.endsWith('.db.cifrado'))) {
    const b = new DatabaseSync(abrirBackup(join(PASTA, 'backup', n), join(PASTA, 'conferir-' + n + '.db')));
    nosBackups += b.prepare("SELECT count(*) n FROM contas WHERE usuario = 'ensaio.banco'").get().n + b.prepare("SELECT count(*) n FROM estados WHERE usuario = 'ensaio.banco'").get().n;
    b.close();
  }
  ok(nosBackups === 0, 'ela sai do backup do dia');
  const legado = join(PASTA, pastaLegado);
  ok(!existsSync(join(legado, 'estado-ensaio.banco.json')) && !JSON.parse(readFileSync(join(legado, 'contas.json'), 'utf8')).contas['ensaio.banco'],
    'e sai dos JSON guardados na pasta de legado');
  ok(!readFileSync(join(legado, 'contas.json'), 'utf8').includes('texto que é só meu') && banco("SELECT count(*) n FROM contas")[0].n === nomesAntes.length - 1 + 5,
    'as outras contas continuam intactas');

  // ---------- (só no conjunto sintético) apagar uma conta cheia de laços ----------
  // A conta do ensaio acima não tem amigo nem célula. Esta é membro de célula, discípula,
  // amiga de várias, autora de novidades e de pedidos, com aparelho inscrito e caixa de
  // avisos: depois de apagada, o @ dela não pode aparecer em coluna nenhuma, de tabela nenhuma,
  // nem no banco, nem nos backups, nem nos JSON de legado.
  if (SINTETICO) {
    const quem = 'despedida';
    const mencoes = (db) => {
      const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map((t) => t.name);
      const achadas = [];
      for (const t of tabelas) {
        for (const c of db.prepare('PRAGMA table_info(' + t + ')').all().map((x) => x.name)) {
          const n = db.prepare('SELECT count(*) n FROM ' + t + ' WHERE ' + c + ' LIKE ?').get('%' + quem + '%').n;
          if (n) achadas.push(t + '.' + c);
        }
      }
      return achadas;
    };
    const noBanco = () => { const b = new DatabaseSync(join(PASTA, 'caminho.db')); try { return mencoes(b); } finally { b.close(); } };
    const tabelasDe = (lista) => new Set(lista.map((x) => x.split('.')[0]));
    const antesDela = tabelasDe(noBanco());
    const esperadas = ['contas', 'amizades', 'toques', 'silenciados', 'convites_aceites', 'proposito_membros', 'celula_presencas', 'discipulados',
      'pedidos', 'pedido_gestos', 'pedido_denuncias', 'novidades_eventos', 'push_inscricoes', 'push_preferencias', 'push_historico', 'push_caixa', 'estados', 'leitura_dias'];
    ok(esperadas.every((t) => antesDela.has(t)), 'antes de apagar, ' + quem + ' está em ' + antesDela.size + ' tabelas'
      + (esperadas.every((t) => antesDela.has(t)) ? '' : ' (faltou: ' + esperadas.filter((t) => !antesDela.has(t)).join(', ') + ')'));
    const entrou2 = await pedir('/api/entrar', { login: quem, senha: SENHAS[quem] });
    const cookie2 = (entrou2.headers.get('set-cookie') || '').split(';')[0];
    ok(entrou2.status === 200, 'a conta sintética com senha conhecida entra');
    ok((await pedir('/api/apagar-conta', { senha: SENHAS[quem] }, cookie2)).status === 200, 'e é apagada');
    const sobrou = noBanco();
    ok(sobrou.length === 0, 'o @ dela não sobra em coluna nenhuma do banco' + (sobrou.length ? ' (sobrou em ' + sobrou.join(', ') + ')' : ''));
    let sobrouBackup = [];
    for (const n of readdirSync(join(PASTA, 'backup')).filter((x) => x.endsWith('.db.cifrado'))) {
      const b = new DatabaseSync(abrirBackup(join(PASTA, 'backup', n), join(PASTA, 'conferir2-' + n + '.db')));
      try { sobrouBackup.push(...mencoes(b)); } finally { b.close(); }
    }
    ok(sobrouBackup.length === 0, 'nem nos backups' + (sobrouBackup.length ? ' (sobrou em ' + [...new Set(sobrouBackup)].join(', ') + ')' : ''));
    const comEla = [];
    for (const pasta of [PASTA, legado]) {
      for (const n of readdirSync(pasta).filter((x) => x.endsWith('.json'))) {
        if (n.startsWith('estado-' + quem + '.') || readFileSync(join(pasta, n), 'utf8').includes(quem)) comEla.push(pasta === legado ? 'legado/' + n : n);
      }
    }
    ok(comEla.length === 0, 'nem nos JSON de legado e nas cópias .bak.json' + (comEla.length ? ' (sobrou em ' + comEla.join(', ') + ')' : ''));
    ok(banco("SELECT count(*) n FROM propositos WHERE celula = 1 AND encerrado_em = ''")[0].n === 2
      && banco("SELECT count(*) n FROM pedidos WHERE autor <> ?", quem)[0].n === 3
      && banco("SELECT count(*) n FROM contas")[0].n === nomesAntes.length - 2 + 5,
      'a célula, os pedidos dos outros e as outras contas continuam de pé');
  }
} catch (e) {
  ok(false, 'o teste quebrou: ' + e.stack);
} finally {
  await parar(servidor);
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
  try { rmSync(rascunho, { recursive: true, force: true }); } catch { /* ok */ }
}

if (falhas && saidaServidor) console.log('\n  saída do servidor:\n' + saidaServidor.split('\n').map((l) => '    ' + l).join('\n'));
console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  a migração para o banco preserva tudo\n');
process.exit(falhas ? 1 : 0);
