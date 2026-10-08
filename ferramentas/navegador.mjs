// Abrir e fechar o Chrome das ferramentas de teste sem deixar nada para trás.
//
// Duas armadilhas do Windows, descobertas quando os testes começaram a "lembrar" da rodada
// anterior (a Bíblia escolhida, o aviso de cadastro já visto):
//   1. nav.kill() mata só o processo que abriu o Chrome; os filhos continuam vivos, segurando
//      a porta de depuração e a pasta do perfil;
//   2. com a porta fixa, a rodada seguinte não conseguia abrir a dela e se conectava a esse
//      Chrome velho, com o armazenamento local de antes.
// Aqui a porta é sorteada livre a cada rodada, e o fechamento leva a árvore inteira.
import { createServer } from 'node:net';
import { execFileSync } from 'node:child_process';

// Uma porta que ninguém está usando agora: o sistema escolhe (porta 0) e ela é devolvida.
// Com PORTAS=8731-8739 (máquina com portas reservadas), a escolha fica dentro da faixa: a
// primeira livre que esta rodada ainda não entregou (esgotadas, a primeira livre de novo).
const entregues = new Set();
const tentar = (porta) => new Promise((resolver, rejeitar) => {
  const s = createServer();
  s.unref();
  s.on('error', rejeitar);
  s.listen(porta, '127.0.0.1', () => {
    const { port } = s.address();
    s.close(() => resolver(port));
  });
});
export async function portaLivre() {
  const faixa = /^(\d+)-(\d+)$/.exec(process.env.PORTAS || '');
  if (!faixa) return tentar(0);
  const faixaToda = [];
  for (let p = Number(faixa[1]); p <= Number(faixa[2]); p++) faixaToda.push(p);
  // Primeiro as que esta rodada não entregou; esgotadas, qualquer uma que esteja livre agora.
  for (const p of faixaToda.filter((x) => !entregues.has(x)).concat(faixaToda.filter((x) => entregues.has(x)))) {
    try { await tentar(p); entregues.add(p); return p; } catch { /* ocupada */ }
  }
  throw new Error('nenhuma porta livre na faixa PORTAS=' + process.env.PORTAS);
}

// Fecha o processo e todos os filhos. No Windows, taskkill /T; nos outros, o kill comum.
//
// O Chrome às vezes se reabre num processo novo, órfão do primeiro, e esse não aparece na
// árvore. Com a pasta do perfil (única por rodada), o que sobrou dela é encerrado também.
export function fecharArvore(processo, perfil) {
  if (processo) {
    let fechou = false;
    if (process.platform === 'win32' && processo.pid) {
      try {
        execFileSync('taskkill', ['/PID', String(processo.pid), '/T', '/F'], { stdio: 'ignore' });
        fechou = true;
      } catch { /* já tinha saído */ }
    }
    if (!fechou) { try { processo.kill(); } catch { /* já tinha saído */ } }
  }
  if (perfil && process.platform === 'win32') {
    const nome = String(perfil).split(/[\\/]/).pop().replace(/[^\w.-]/g, '');
    if (!nome) return;
    const script = "Get-CimInstance Win32_Process -Filter \"Name = 'chrome.exe'\" | "
      + "Where-Object { $_.CommandLine -like '*" + nome + "*' } | "
      + 'ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }';
    try {
      execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'ignore', timeout: 30000 });
    } catch { /* sem PowerShell: fica o que a árvore já fechou */ }
  }
}
