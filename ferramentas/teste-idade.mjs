// Regras de idade no servidor, de ponta a ponta pela API: a data de nascimento não muda depois
// do cadastro (nem com senha), trocar o e-mail pede a senha atual, e quem tem menos de 18 anos
// só lidera ou auxilia uma célula depois que a liderança (o administrador) aprova.
// Uso: node ferramentas/teste-idade.mjs   (PORTA=<porta> para trocar a 8791)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA) || 8791;
const PASTA = mkdtempSync(join(tmpdir(), 'cc-idade-'));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json'), CAMINHO_TESTE: '1', CAMINHO_ADMIN: 'dono', CAMINHO_SMTP_HOST: '' },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const pedir = (rota, corpo, cookie) => fetch(base + rota, {
  method: corpo ? 'POST' : 'GET',
  headers: Object.assign({ 'content-type': 'application/json', origin: base }, cookie ? { cookie } : {}),
  body: corpo ? JSON.stringify(corpo) : undefined,
});
const dados = async (r) => r.json().catch(() => ({}));
const biscoito = (r) => (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || ''])
  .map((l) => l.split(';')[0]).find((l) => l.startsWith('cc_sessao=')) || '';
const iso = (d) => d.toISOString().slice(0, 10);
const anosAtras = (n) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - n); d.setUTCDate(d.getUTCDate() - 3); return iso(d); };
const criar = async (usuario, nascimento) => {
  const r = await pedir('/api/criar-conta', { usuario, senha: 'senha-' + usuario, nome: usuario, email: usuario + '@teste.com', nascimento, consentimento: true });
  return biscoito(r);
};

try {
  console.log('\n  Data de nascimento e e-mail\n');
  const ana = await criar('ana', '2000-01-01');
  let r = await pedir('/api/perfil', { nascimento: '1990-05-05' }, ana);
  let d = await dados(r);
  ok(r.status === 403 && /fale com o suporte/.test(d.erro || ''), 'trocar a data de nascimento pela API é recusado (403, "fale com o suporte")');
  r = await pedir('/api/perfil', { nascimento: anosAtras(13), senhaAtual: 'senha-ana' }, ana);
  ok(r.status === 403, 'nem com a senha a data muda');
  ok((await dados(await pedir('/api/quem', null, ana))).nascimento === '2000-01-01', 'a data continua a do cadastro');
  r = await pedir('/api/perfil', { email: 'nova@teste.com' }, ana);
  ok(r.status === 403 && /senha atual/.test((await dados(r)).erro || ''), 'trocar o e-mail sem a senha é recusado');
  r = await pedir('/api/perfil', { email: 'nova@teste.com', senhaAtual: 'errada-123' }, ana);
  ok(r.status === 401, 'com a senha errada, também');
  ok((await dados(await pedir('/api/quem', null, ana))).email === 'ana@teste.com', 'o e-mail continua o antigo');
  r = await pedir('/api/perfil', { email: 'nova@teste.com', senhaAtual: 'senha-ana' }, ana);
  ok(r.status === 200 && (await dados(await pedir('/api/quem', null, ana))).email === 'nova@teste.com', 'com a senha certa, o e-mail troca');
  r = await pedir('/api/perfil', { email: 'nova@teste.com', nascimento: '2000-01-01' }, ana);
  ok(r.status === 200, 'reenviar o mesmo e-mail e a mesma data é aceito sem senha');

  console.log('\n  Liderança de célula para menor de 18\n');
  const dono = await criar('dono', '1980-01-01');
  const bia = await criar('bia', '1995-01-01');
  const teen = await criar('teen', anosAtras(15));
  const propositos = async (cookie) => (await dados(await pedir('/api/propositos', null, cookie))).propositos || [];

  // maior cria normal
  d = await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Adultos' }, bia));
  const idBia = d.proposito && d.proposito.id;
  ok(idBia && d.proposito.euConduzo === true && !d.proposito.aguardandoAprovacao, 'quem tem 18 ou mais cria a célula e já conduz');
  ok((await pedir('/api/painel/celula?id=' + idBia, null, bia)).status === 200, 'e abre o painel da célula');

  // menor cria pendente
  d = await dados(await pedir('/api/celula', { acao: 'criar', titulo: 'Jovens' }, teen));
  const idTeen = d.proposito && d.proposito.id;
  ok(idTeen && d.proposito.aguardandoAprovacao === 'lider' && d.proposito.celulaAguardando === true && d.proposito.euConduzo === false,
    'quem tem 15 anos cria a célula aguardando aprovação');
  r = await pedir('/api/celula', { acao: 'link', id: idTeen }, teen);
  ok(r.status === 403 && /aguardando aprovação da liderança/.test((await dados(r)).erro || ''), 'a célula aguardando não gera link de entrada');

  // pendente não acessa dados nominais: o menor entra como membro na célula da Bia, é marcado
  // auxiliar e, enquanto espera, não abre o painel nem recebe a lista de atenção
  const { link } = await dados(await pedir('/api/celula', { acao: 'link', id: idBia }, bia));
  const token = new URL(link).searchParams.get('celula');
  ok((await pedir('/api/celula', { acao: 'entrar', token }, teen)).status === 200, 'o menor entra na célula de um adulto como membro');
  ok((await pedir('/api/celula', { acao: 'auxiliar', id: idBia, usuario: 'teen', sim: true }, bia)).status === 200, 'o líder marca o menor como auxiliar');
  let celula = (await propositos(teen)).find((p) => p.id === idBia) || {};
  ok(celula.aguardandoAprovacao === 'auxiliar' && celula.euConduzo === false && !('painel' in celula) && !('atencao' in celula) && !('semanaLider' in celula),
    'auxiliar menor à espera não recebe painel, atenção nem semana do grupo');
  r = await pedir('/api/painel/celula?id=' + idBia, null, teen);
  ok(r.status === 403, 'nem abre o painel nominal da célula (403)');
  r = await pedir('/api/painel/celula?id=' + idTeen, null, teen);
  ok(r.status === 403, 'nem o da própria célula aguardando');
  ok((await pedir('/api/celula', { acao: 'recado', id: idBia, texto: 'oi' }, teen)).status === 403, 'nem conduz (recado recusado)');

  // só o admin vê e decide
  ok((await pedir('/api/painel/liderancas', null, bia)).status === 403, 'quem não é admin não vê os pedidos de aprovação');
  ok((await pedir('/api/painel/liderancas', { proposito: idTeen, usuario: 'teen', papel: 'lider', aprovar: true }, bia)).status === 403, 'nem aprova');
  d = await dados(await pedir('/api/painel/liderancas', null, dono));
  const pend = d.pendentes || [];
  ok(pend.length === 2 && pend.some((x) => x.proposito === idTeen && x.papel === 'lider' && x.idade === 15) && pend.some((x) => x.proposito === idBia && x.papel === 'auxiliar'),
    'o admin vê os dois pedidos (líder e auxiliar), com a idade');

  // admin aprova e libera
  r = await pedir('/api/painel/liderancas', { proposito: idTeen, usuario: 'teen', papel: 'lider', aprovar: true }, dono);
  d = await dados(r);
  ok(r.status === 200 && (d.pendentes || []).length === 1, 'o admin aprova a liderança e o pedido sai da lista');
  ok((await pedir('/api/painel/celula?id=' + idTeen, null, teen)).status === 200, 'aprovado, o menor abre o painel da própria célula');
  ok((await pedir('/api/celula', { acao: 'link', id: idTeen }, teen)).status === 200, 'e gera o link');
  celula = (await propositos(teen)).find((p) => p.id === idTeen) || {};
  ok(celula.euConduzo === true && !celula.aguardandoAprovacao && 'painel' in celula, 'a célula deixa de mostrar o aviso e ganha o painel');
  r = await pedir('/api/painel/liderancas', { proposito: idBia, usuario: 'teen', papel: 'auxiliar', aprovar: true }, dono);
  ok(r.status === 200 && (await pedir('/api/painel/celula?id=' + idBia, null, teen)).status === 200, 'aprovado como auxiliar, abre o painel da célula da Bia');
  ok((await pedir('/api/painel/liderancas', { proposito: idBia, usuario: 'teen', papel: 'auxiliar', aprovar: false }, dono)).status === 404,
    'um pedido já decidido não se decide de novo');

  // quem aprovou e quando ficam no banco
  const { DatabaseSync } = await import('node:sqlite');
  const banco = new DatabaseSync(join(PASTA, 'caminho.db'), { readOnly: true });
  const linhas = banco.prepare('SELECT * FROM liderancas ORDER BY papel').all();
  banco.close();
  ok(linhas.length === 2 && linhas.every((l) => l.estado === 'aprovada' && l.decidido_por === 'dono' && /^\d{4}-\d{2}-\d{2}T/.test(l.decidido_em)),
    'no banco: quem aprovou (@dono) e quando, para cada pedido');
} catch (e) {
  ok(false, 'o teste quebrou: ' + (e && e.stack || e));
} finally {
  servidor.kill();
  await dormir(300);
  try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
}

console.log('\n  ' + (falhas ? falhas + ' falha(s)' : 'tudo certo') + '\n');
process.exit(falhas ? 1 : 0);
