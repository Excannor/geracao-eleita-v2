// Abre um backup cifrado de dados/backup/ num arquivo SQLite comum, para restaurar ou conferir.
// A chave vem de CAMINHO_BACKUP_CHAVE (a mesma do .env) ou, sem ela, de dados/backup.chave.
//
// Uso:
//   node ferramentas/backup.mjs listar
//   node ferramentas/backup.mjs abrir dados/backup/caminho-2026-09-24.db.cifrado restaurado.db
//
// Para restaurar de verdade: pare o container, guarde o dados/caminho.db atual em outro lugar,
// coloque o arquivo aberto no lugar dele (apague caminho.db-wal e caminho.db-shm) e suba de novo.
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBackup, chaveDeBackup } from '../db.mjs';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const DADOS = join(AQUI, 'dados');
const [, , comando, origem, destino] = process.argv;

// O .env do docker compose também vale aqui, para a chave não precisar ser digitada.
if (!process.env.CAMINHO_BACKUP_CHAVE && existsSync(join(AQUI, '.env'))) {
  const linha = readFileSync(join(AQUI, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('CAMINHO_BACKUP_CHAVE='));
  if (linha) process.env.CAMINHO_BACKUP_CHAVE = linha.slice('CAMINHO_BACKUP_CHAVE='.length).trim();
}

if (comando === 'listar') {
  const pasta = join(DADOS, 'backup');
  for (const f of existsSync(pasta) ? readdirSync(pasta).sort() : []) {
    console.log('  ' + f + '  ' + Math.round(statSync(join(pasta, f)).size / 1024) + ' KB');
  }
} else if (comando === 'abrir' && origem && destino) {
  const chave = chaveDeBackup(resolve(dirname(dirname(resolve(origem)))));
  abrirBackup(resolve(origem), resolve(destino), chave);
  console.log('  aberto em ' + resolve(destino));
} else {
  console.log('  uso: node ferramentas/backup.mjs listar');
  console.log('       node ferramentas/backup.mjs abrir <backup.db.cifrado> <saida.db>');
  process.exit(1);
}
