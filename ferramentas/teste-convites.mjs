// Confere a Fase 1 pela API: amigos sem limite, o link de convite que vale para muitas
// pessoas por 30 dias, a conta criada pelo link já nascendo amiga e anotada como trazida por
// quem convidou, a ativação na primeira lição, o teto por hora, o cancelamento e o que
// acontece quando alguém apaga a conta. Também o convite "conhecer" (Fase 1: Conhecer Jesus)
// e o pedido de conversa que ele libera.
// Uso: node ferramentas/teste-convites.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createECDH, randomBytes } from 'node:crypto';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { DatabaseSync } = await import(pathToFileURL(join(AQUI, 'db.mjs')).href);
const PORTA = 8223;
const PORTA_PUSH = 8224;
const PASTA = mkdtempSync(join(tmpdir(), 'cc-convites-'));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

// Um serviço de push falso: só precisa dizer qual aparelho recebeu, não decifrar o
// conteúdo. Isso basta para conferir "avisa só quem convidou (e o líder da célula)".
const recebidos = [];
const push = createServer((req, res) => {
  recebidos.push(req.url);
  res.writeHead(201).end();
});
await new Promise((r) => push.listen(PORTA_PUSH, '127.0.0.1', r));
function aparelho(nome) {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    caminho: '/' + nome,
    inscricao: {
      endpoint: 'http://127.0.0.1:' + PORTA_PUSH + '/' + nome,
      keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') },
    },
  };
}
const chegou = (ap) => recebidos.filter((u) => u === ap.caminho).length;
const esperarChegar = async (ap, quantos, ms = 3000) => {
  for (let t = 0; t < ms; t += 100) { if (chegou(ap) >= quantos) break; await dormir(100); }
  return chegou(ap);
};

// Meio-dia em São Paulo: o aviso social respeita o silêncio da noite (22h30 às 7h), e o
// teste não pode depender da hora em que roda.
const hojeSP = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: {
    ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_PUSH_TESTE: '1',
    CAMINHO_RELOGIO: new Date(hojeSP + 'T12:00:00-03:00').toISOString(),
  },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const pedir = async (rota, corpo, cookie, metodo) => {
  const r = await fetch(base + rota, {
    method: metodo || (corpo ? 'POST' : 'GET'),
    headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0], corpo: await r.json().catch(() => ({})) };
};
const criar = (usuario, convite) => pedir('/api/criar-conta', {
  usuario, senha: 'senha-boa-1', nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01', consentimento: true, ...(convite ? { convite } : {}),
});
const banco = (sql, ...p) => { const b = new DatabaseSync(join(PASTA, 'caminho.db')); try { return b.prepare(sql).all(...p); } finally { b.close(); } };
const amigosDe = async (cookie) => (await pedir('/api/amigos', null, cookie)).corpo;
const hoje = hojeSP;

console.log('\n  Convites e amigos sem limite\n');

try {
  const ana = await criar('ana');
  ok(ana.status === 200 && !ana.corpo.convidadoPor, 'a Ana cria a conta sem convite');
  const link = (await pedir('/api/convites', {}, ana.cookie)).corpo.link;
  const token = new URL(link).searchParams.get('convite');
  ok((await pedir('/api/convites/' + token)).corpo.usuario === 'ana', 'o link mostra quem convidou');

  // ---------- conta criada pelo link ----------
  const bia = await criar('bia', token);
  ok(bia.status === 200 && bia.corpo.convidadoPor === 'ana', 'a Bia cria a conta pelo link e o servidor diz quem a convidou');
  const amigosBia = await amigosDe(bia.cookie);
  ok(amigosBia.amigos.some((a) => a.usuario === 'ana'), 'a Bia já nasce amiga da Ana');
  ok(!('limite' in amigosBia), 'a lista de amigos não fala mais em limite');

  const carla = await criar('carla', token);
  ok(carla.corpo.convidadoPor === 'ana' && (await pedir('/api/convites/' + token)).status === 200, 'o mesmo link serve para a Carla, e continua valendo');

  const dora = await criar('dora');
  const aceite = await pedir('/api/convites/aceitar', { token }, dora.cookie);
  ok(aceite.status === 200 && (await amigosDe(dora.cookie)).amigos.some((a) => a.usuario === 'ana'), 'a Dora, que já tinha conta, aceita o convite pelo app');

  const edu = await criar('edu', token.slice(0, -4) + 'abcd');
  ok(edu.status === 200 && !edu.corpo.convidadoPor && !(await amigosDe(edu.cookie)).amigos.length, 'convite adulterado não impede a conta, só não cria amizade');

  ok((await pedir('/api/convites/aceitar', { token }, ana.cookie)).status === 400, 'ninguém aceita o próprio convite');

  const fabio = await criar('fabio');
  await pedir('/api/amizade', { acao: 'bloquear', usuario: 'fabio' }, ana.cookie);
  ok((await pedir('/api/convites/aceitar', { token }, fabio.cookie)).status === 410, 'quem a Ana bloqueou não entra pelo link dela');

  // ---------- anotado no banco ----------
  const linha = (u) => banco('SELECT * FROM convites_aceites WHERE de = ? AND para = ?', 'ana', u)[0];
  ok(linha('bia') && linha('bia').conta_nova === 1 && linha('carla').conta_nova === 1, 'Bia e Carla ficam anotadas como contas novas trazidas pela Ana');
  ok(linha('dora') && linha('dora').conta_nova === 0, 'a Dora fica anotada, mas como quem já tinha conta');
  ok(!linha('edu') && !linha('fabio'), 'o convite adulterado e o bloqueado não deixam anotação');
  ok(JSON.parse(banco("SELECT extra FROM contas WHERE usuario = 'bia'")[0].extra).convidadoPor === 'ana', 'a conta da Bia guarda quem a convidou');

  // ---------- ativação na primeira lição ----------
  const semLicao = { atualizadoEm: Date.now(), lidos: [], marcadoEm: {} };
  const comLicao = { atualizadoEm: Date.now() + 1, lidos: [1], marcadoEm: { 1: hoje } };
  await pedir('/api/estado', semLicao, carla.cookie, 'PUT');
  ok(linha('carla').ativado_em === '', 'abrir o app sem fazer lição não ativa a Carla');
  await pedir('/api/estado', comLicao, bia.cookie, 'PUT');
  ok(!!linha('bia').ativado_em, 'a primeira lição da Bia a ativa para a Trilha do Semeador da Ana');
  await pedir('/api/estado', comLicao, dora.cookie, 'PUT');
  ok(linha('dora').ativado_em === '', 'a lição da Dora não ativa nada: ela já tinha conta');
  const semeados = () => banco("SELECT count(*) n FROM convites_aceites WHERE de = 'ana' AND conta_nova = 1 AND ativado_em <> ''")[0].n;
  ok(semeados() === 1, 'a Ana tem 1 pessoa trazida e ativa');

  // ---------- sem limite, com teto por hora ----------
  let ligados = 0;
  for (let i = 1; i <= 27; i++) {
    const r = await criar('g' + i, token);
    if (r.corpo.convidadoPor === 'ana') ligados++;
  }
  const amigosAna = (await amigosDe(ana.cookie)).amigos.length;
  ok(ligados === 27 && amigosAna === 30, 'a Ana passa de 5 amigos sem limite nenhum (' + amigosAna + ')');
  const g28 = await criar('g28', token);
  ok(g28.status === 200 && !g28.corpo.convidadoPor, 'no 31º aceite da mesma hora, a conta nasce, mas o link para de valer por um tempo');
  const hugo = await criar('hugo');
  ok((await pedir('/api/convites/aceitar', { token }, hugo.cookie)).status === 429, 'quem já tinha conta recebe "tente mais tarde"');

  // ---------- cancelar ----------
  await pedir('/api/convites/cancelar', {}, ana.cookie);
  ok((await pedir('/api/convites/' + token)).status === 410, 'cancelar os convites derruba o link antigo');
  ok((await amigosDe(ana.cookie)).amigos.length === 30, 'mas quem já entrou continua amigo');
  const novoLink = (await pedir('/api/convites', {}, ana.cookie)).corpo.link;
  ok(!!novoLink && novoLink !== link, 'e dá para gerar um link novo');

  // ---------- apagar a conta ----------
  await pedir('/api/apagar-conta', { senha: 'senha-boa-1' }, bia.cookie);
  ok(!linha('bia') && semeados() === 0, 'a Bia apaga a conta e deixa de contar para a Ana');

  console.log('\n  Conhecer Jesus: convite com modo\n');

  // ---------- convite "conhecer": entra nos 14 dias, sem dupla de plano ----------
  const jovem = await criar('jovem');
  const linkConhecer = (await pedir('/api/convites', { modo: 'conhecer' }, jovem.cookie)).corpo.link;
  const tokenConhecer = new URL(linkConhecer).searchParams.get('convite');
  const lia = await criar('lia', tokenConhecer);
  ok(lia.status === 200 && lia.corpo.convidadoPor === 'jovem', 'a Lia entra pelo link "conhecer" e o jovem fica anotado como quem a trouxe');
  const quemLia = (await pedir('/api/quem', null, lia.cookie)).corpo;
  ok(quemLia.caminho === 'conhecer' && quemLia.acompanhadoPor && quemLia.acompanhadoPor.usuario === 'jovem',
    'a conta da Lia já nasce no caminho "conhecer", acompanhada pelo jovem');
  ok((await amigosDe(lia.cookie)).amigos.some((a) => a.usuario === 'jovem'), 'mesmo sem dupla, a amizade nasce normal');
  ok(banco("SELECT count(*) n FROM proposito_membros WHERE usuario = 'lia'")[0].n === 0,
    'quem entra pelo convite "conhecer" não ganha a dupla de leitura do plano');

  // ---------- convite adulterado: trocar o modo na carga invalida a assinatura ----------
  const [cargaConhecer, firmaConhecer] = tokenConhecer.split('.');
  const dadoConhecer = JSON.parse(Buffer.from(cargaConhecer, 'base64url').toString('utf8'));
  const tokenAdulterado = Buffer.from(JSON.stringify({ ...dadoConhecer, m: '' })).toString('base64url') + '.' + firmaConhecer;
  const mel = await criar('mel', tokenAdulterado);
  ok(mel.status === 200 && !mel.corpo.convidadoPor, 'convite "conhecer" com o modo adulterado não vira amizade nem convidadoPor');
  const quemMel = (await pedir('/api/quem', null, mel.cookie)).corpo;
  ok(quemMel.caminho === 'plano' && !quemMel.acompanhadoPor, 'e a Mel nasce no plano normal, não em "conhecer"');

  // ---------- quem acompanha vê só o número do dia, a data e se terminou ----------
  await pedir('/api/estado', { atualizadoEm: Date.now(), lidos: [], marcadoEm: {}, licoes: [], licoesEm: {}, conhecidos: { 1: hoje, 2: hoje } }, lia.cookie, 'PUT');
  let liaAcompanhada = (await amigosDe(jovem.cookie)).acompanhando.find((a) => a.usuario === 'lia');
  ok(liaAcompanhada && liaAcompanhada.dia === 2 && liaAcompanhada.ultimo === hoje && liaAcompanhada.terminou === false,
    'o jovem vê a Lia com o número de dias e a última data, sem nenhum texto escrito');
  await pedir('/api/estado', {
    atualizadoEm: Date.now() + 1, lidos: [], marcadoEm: {}, licoes: [], licoesEm: {},
    conhecidos: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [i + 1, hoje])),
  }, lia.cookie, 'PUT');
  liaAcompanhada = (await amigosDe(jovem.cookie)).acompanhando.find((a) => a.usuario === 'lia');
  ok(liaAcompanhada.dia === 14 && liaAcompanhada.terminou === true, 'com os 14 dias feitos, "terminou" fica verdadeiro');

  // ---------- "quero conversar com alguém": só quem convidou, uma vez por dia, nada no Feed ----------
  const celJovem = aparelho('jovem');
  const celOutra = aparelho('semnadavercomlia');
  const outraConta = await criar('semnadavercomlia');
  await pedir('/api/notificacoes/inscrever', { inscricao: celJovem.inscricao }, jovem.cookie);
  await pedir('/api/notificacoes/inscrever', { inscricao: celOutra.inscricao }, outraConta.cookie);

  ok((await pedir('/api/conhecer/conversar', {}, outraConta.cookie)).status === 403, 'quem não está sendo acompanhado não pode pedir conversa');
  const novidadesAntes = (await pedir('/api/novidades', null, jovem.cookie)).corpo.eventos.length;
  const conversar1 = await pedir('/api/conhecer/conversar', {}, lia.cookie);
  ok(conversar1.status === 200 && conversar1.corpo.ok === true && !conversar1.corpo.ja, 'a Lia pede para conversar');
  ok((await esperarChegar(celJovem, 1)) === 1, 'o jovem, que a convidou, recebe o aviso');
  // "pediuConversa" liga o botão de "Acompanhar na fé" (Fase 3), sem expor o que foi escrito.
  liaAcompanhada = (await amigosDe(jovem.cookie)).acompanhando.find((a) => a.usuario === 'lia');
  ok(liaAcompanhada.pediuConversa === hoje, 'o jovem vê que a Lia pediu para conversar hoje, para poder oferecer acompanhar na fé');
  await dormir(300);
  ok(chegou(celOutra) === 0, 'quem não tem nada a ver com a Lia não recebe nada');
  const novidadesDepois = (await pedir('/api/novidades', null, jovem.cookie)).corpo.eventos.length;
  ok(novidadesDepois === novidadesAntes, 'o pedido de conversa nunca vai para o Feed');

  const conversar2 = await pedir('/api/conhecer/conversar', {}, lia.cookie);
  ok(conversar2.status === 200 && conversar2.corpo.ja === true, 'pedir de novo no mesmo dia só confirma, sem mandar de novo');
  await dormir(300);
  ok(chegou(celJovem) === 1, 'e o jovem não recebe um segundo aviso no mesmo dia');

  // ---------- quem está numa célula também avisa o líder dela ----------
  const primo = await criar('primo');
  const celPrimo = aparelho('primo');
  await pedir('/api/notificacoes/inscrever', { inscricao: celPrimo.inscricao }, primo.cookie);
  const linkConhecer2 = (await pedir('/api/convites', { modo: 'conhecer' }, primo.cookie)).corpo.link;
  const noa = await criar('noa', new URL(linkConhecer2).searchParams.get('convite'));
  ok(noa.corpo.convidadoPor === 'primo', 'a Noa entra pelo link "conhecer" do primo');

  const duda = await criar('duda');
  const celDuda = aparelho('duda');
  await pedir('/api/notificacoes/inscrever', { inscricao: celDuda.inscricao }, duda.cookie);
  const celulaDuda = (await pedir('/api/celula', { acao: 'criar', titulo: 'Célula da Duda' }, duda.cookie)).corpo.proposito;
  const linkCelula = (await pedir('/api/celula', { acao: 'link', id: celulaDuda.id }, duda.cookie)).corpo.link;
  await pedir('/api/celula', { acao: 'entrar', token: new URL(linkCelula).searchParams.get('celula') }, noa.cookie);

  const conversarNoa = await pedir('/api/conhecer/conversar', {}, noa.cookie);
  ok(conversarNoa.status === 200 && !conversarNoa.corpo.ja, 'a Noa, que também está numa célula, pede para conversar');
  ok((await esperarChegar(celPrimo, 1)) === 1, 'o primo, que a convidou, recebe o aviso');
  ok((await esperarChegar(celDuda, 1)) === 1, 'e o líder da célula dela também recebe');
} catch (e) {
  ok(false, 'o teste quebrou: ' + e.stack);
} finally {
  servidor.kill();
  push.close();
  await dormir(500);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  os convites da Fase 1 funcionam\n');
process.exit(falhas ? 1 : 0);
