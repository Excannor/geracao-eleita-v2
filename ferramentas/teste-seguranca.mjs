// Confere os controles de segurança do servidor: cabeçalhos (CSP com os scripts do app),
// pedido de outra origem, limite de senha errada por conta mesmo trocando de IP, foto e nome
// que vão para os amigos, tamanho de corpo, caminho de arquivo e crachá malformado.
// Uso: node ferramentas/teste-seguranca.mjs
import { spawn } from 'node:child_process';
import { rmSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 8214;
const PASTA = join(tmpdir(), 'cc-seguranca');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) falhas++;
};

try { rmSync(PASTA, { recursive: true, force: true }); } catch { /* ok */ }
const servidor = spawn(process.execPath, [join(AQUI, 'servidor.mjs'), String(PORTA)], {
  env: { ...process.env, CAMINHO_ESTADO: join(PASTA, 'estado.json') },
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:' + PORTA;
for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/existe-conta'); break; } catch { await dormir(150); } }

const pedir = (rota, corpo, { cookie, cabecalhos = {}, metodo } = {}) => fetch(base + rota, {
  method: metodo || (corpo !== undefined ? 'POST' : 'GET'),
  headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...cabecalhos },
  body: corpo !== undefined ? (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)) : undefined,
});
const biscoito = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const criar = async (usuario) => biscoito(await pedir('/api/criar-conta', {
  usuario, senha: 'senha-' + usuario, nome: usuario, email: usuario + '@teste.com', nascimento: '2000-01-01',
}));

try {
  console.log('\n  Segurança do servidor\n');

  // ---------- cabeçalhos ----------
  const pagina = await pedir('/entrar.html');
  const csp = pagina.headers.get('content-security-policy') || '';
  ok(/default-src 'self'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp), 'a página sai com CSP');
  ok(!/script-src[^;]*'unsafe-inline'/.test(csp), 'a CSP não libera script qualquer dentro da página');
  const html = readFileSync(join(AQUI, 'dist', 'entrar.html'), 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((t) => t.trim());
  ok(scripts.length && scripts.every((t) => csp.includes("'sha256-" + createHash('sha256').update(t.replace(/\r\n?/g, '\n'), 'utf8').digest('base64') + "'")),
    'os scripts do próprio app estão liberados pelo hash');
  ok(pagina.headers.get('x-frame-options') === 'DENY' && pagina.headers.get('x-content-type-options') === 'nosniff'
    && pagina.headers.get('referrer-policy') === 'same-origin', 'nosniff, sem iframe de fora e sem vazar endereço');
  ok(!(await pedir('/api/versao')).headers.get('strict-transport-security'), 'sem https na frente, não manda HSTS');
  ok(!!(await pedir('/api/versao', undefined, { cabecalhos: { 'x-forwarded-proto': 'https' } })).headers.get('strict-transport-security'),
    'atrás do https da Cloudflare, manda HSTS');

  // ---------- origem ----------
  const ana = await criar('ana');
  ok(!!ana, 'a conta de teste nasce');
  ok((await pedir('/api/fuso', { fuso: 'America/Manaus' }, { cookie: ana, cabecalhos: { origin: 'https://site-malicioso.com' } })).status === 403,
    'pedido que muda algo vindo de outro site é recusado');
  ok((await pedir('/api/fuso', { fuso: 'America/Manaus' }, { cookie: ana, cabecalhos: { origin: base } })).status === 200,
    'o mesmo pedido vindo do próprio app passa');
  ok((await pedir('/api/fuso', { fuso: 'America/Manaus' }, { cookie: ana, cabecalhos: { origin: 'null' } })).status === 403,
    'origem "null" (página salva, sandbox) também é recusada');

  // ---------- senha errada ----------
  const tentar = (ip, senha = 'errada-123') => pedir('/api/entrar', { login: 'ana', senha }, { cabecalhos: { 'cf-connecting-ip': ip } });
  for (let i = 0; i < 10; i++) await tentar('10.0.0.' + i);
  ok((await tentar('10.0.0.99')).status === 429, 'dez senhas erradas na mesma conta trancam a conta, mesmo trocando de IP');
  ok((await tentar('10.0.0.98', 'senha-ana')).status === 429, 'nem a senha certa entra enquanto a conta está trancada');
  const bia = await criar('bia');
  ok((await pedir('/api/entrar', { login: 'bia', senha: 'senha-bia' }, { cabecalhos: { 'cf-connecting-ip': '10.0.0.97' } })).status === 200,
    'outra conta entra normalmente');
  for (let i = 0; i < 10; i++) await pedir('/api/entrar', { login: 'x' + i, senha: 'y' }, { cabecalhos: { 'cf-connecting-ip': '10.9.9.9' } });
  ok((await pedir('/api/entrar', { login: 'bia', senha: 'senha-bia' }, { cabecalhos: { 'cf-connecting-ip': '10.9.9.9' } })).status === 429,
    'dez erros do mesmo IP em contas diferentes trancam o IP');
  ok((await pedir('/api/entrar', { login: 'bia', senha: 'x'.repeat(5000) }, { cabecalhos: { 'cf-connecting-ip': '10.1.1.1' } })).status === 401,
    'senha gigante não entra (e não faz o servidor trabalhar à toa)');
  ok((await pedir('/api/criar-conta', { usuario: 'caio', senha: 'x'.repeat(200), nome: 'Caio', email: 'caio@t.com', nascimento: '2000-01-01' })).status === 400,
    'ninguém cria conta com senha de mais de 128 caracteres');

  // ---------- o que vai para os amigos ----------
  const estado = { lidos: [1], marcadoEm: { 1: '2026-09-20' }, licoes: [], apelido: '<b>Bia</b>\u0007 com um nome grande demais', foto: 'https://rastreador.example/pixel.gif' };
  ok((await pedir('/api/estado', estado, { cookie: bia, metodo: 'PUT' })).status === 200, 'o progresso é gravado');
  const salvo = await (await pedir('/api/estado', undefined, { cookie: bia })).json();
  ok(salvo.foto === '', 'foto com endereço de fora é descartada (serviria para rastrear quem abre o Juntos)');
  ok(salvo.apelido.length <= 20 && !/\u0007/.test(salvo.apelido), 'o nome curto fica com no máximo 20 caracteres e sem caractere de controle');
  const foto = 'data:image/jpeg;base64,' + Buffer.from('foto').toString('base64');
  await pedir('/api/estado', { ...estado, foto }, { cookie: bia, metodo: 'PUT' });
  ok((await (await pedir('/api/estado', undefined, { cookie: bia })).json()).foto === foto, 'a foto que o app gera continua valendo');

  // ---------- tamanho e caminho ----------
  const grande = await pedir('/api/denuncias', JSON.stringify({ usuario: 'ana', motivo: 'x'.repeat(100 * 1024) }), { cookie: bia }).catch(() => null);
  ok(!grande || grande.status >= 400, 'corpo de 100 KB fora do progresso é recusado');
  const fora = await fetch(base + '/..%2F..%2Fservidor.mjs', { headers: { cookie: bia } });
  ok(fora.status === 403 || fora.status === 404, 'pedir arquivo fora do dist/ não entrega nada');
  ok(!(await fora.text()).includes('createServer'), 'e o código do servidor não sai');

  // ---------- crachá ----------
  const torto = await pedir('/api/quem', undefined, { cookie: 'cc_sessao=%E0%A4%A.123.abc' });
  ok(torto.status === 401, 'crachá malformado é só "entre primeiro", não erro do servidor');
  const erro = await fetch(base + '/%E0%A4%A');
  ok(!(await erro.text()).includes('URI'), 'erro do servidor não mostra detalhe interno');
} finally {
  servidor.kill();
}

console.log(falhas ? '\n  ' + falhas + ' falha(s)\n' : '\n  os controles de segurança estão de pé\n');
process.exit(falhas ? 1 : 0);
