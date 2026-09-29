// Leitura e indexacao do vault Obsidian.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// ---------- frontmatter ----------
// Subconjunto YAML que o vault usa: chave: valor, chave: [a, b], e listas com hifen.
function lerFrontmatter(texto) {
  if (!texto.startsWith('---')) return { dados: {}, corpo: texto };
  const fim = texto.indexOf('\n---', 3);
  if (fim === -1) return { dados: {}, corpo: texto };

  const bruto = texto.slice(3, fim).trim();
  const corpo = texto.slice(fim + 4).replace(/^\n+/, '');
  const dados = {};
  let chaveLista = null;

  for (const linha of bruto.split('\n')) {
    if (!linha.trim()) continue;

    const item = /^\s+-\s+(.*)$/.exec(linha);
    if (item && chaveLista) {
      dados[chaveLista].push(limpar(item[1]));
      continue;
    }

    const par = /^([\w-]+):\s*(.*)$/.exec(linha);
    if (!par) continue;
    const [, chave, valor] = par;

    if (valor === '') { chaveLista = chave; dados[chave] = []; continue; }
    chaveLista = null;

    if (valor.startsWith('[') && valor.endsWith(']')) {
      dados[chave] = valor.slice(1, -1).split(',').map(limpar).filter(Boolean);
    } else {
      dados[chave] = limpar(valor);
    }
  }
  return { dados, corpo };
}

const limpar = (s) => s.trim().replace(/^["']|["']$/g, '').trim();

// ---------- varredura ----------
function varrer(dir, base, saida = []) {
  for (const nome of readdirSync(dir)) {
    if (nome.startsWith('.')) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) varrer(caminho, base, saida);
    else if (nome.endsWith('.md')) saida.push(caminho);
  }
  return saida;
}

export function lerVault(raiz) {
  const arquivos = varrer(raiz, raiz).sort();
  const notas = [];

  for (const caminho of arquivos) {
    const rel = relative(raiz, caminho).split(sep).join('/');
    const id = rel.slice(0, -3);
    const nome = id.split('/').pop();
    const pasta = id.includes('/') ? id.split('/').slice(0, -1).join('/') : '';
    // O vault usa CRLF; normalizar aqui evita que o \r final quebre os regex de linha.
    const texto = readFileSync(caminho, 'utf8').replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    const { dados, corpo } = lerFrontmatter(texto);
    notas.push({ id, nome, pasta, dados, corpo });
  }

  // indices para resolver wikilinks
  const porId = new Map(notas.map((n) => [n.id, n]));
  const porNome = new Map();
  for (const n of notas) {
    if (!porNome.has(n.nome)) porNome.set(n.nome, []);
    porNome.get(n.nome).push(n);
  }

  // Regra do Obsidian: link sem caminho prefere uma nota da mesma pasta.
  function resolver(alvo, pastaOrigem) {
    if (porId.has(alvo)) return alvo;
    const candidatos = porNome.get(alvo.split('/').pop());
    if (!candidatos || !candidatos.length) return null;
    if (candidatos.length === 1) return candidatos[0].id;
    const mesma = candidatos.find((c) => c.pasta === pastaOrigem);
    return (mesma || candidatos[0]).id;
  }

  return { notas, porId, resolver };
}

// ---------- plano de leitura ----------
export const LIVROS_CANONICOS = [
  'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute',
  '1 Samuel', '2 Samuel', '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras', 'Neemias',
  'Ester', 'Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cânticos', 'Isaías', 'Jeremias',
  'Lamentações', 'Ezequiel', 'Daniel', 'Oseias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miqueias',
  'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias', 'Mateus', 'Marcos', 'Lucas',
  'João', 'Atos', 'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios', 'Filipenses',
  'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo', '2 Timóteo', 'Tito',
  'Filemom', 'Hebreus', 'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João', '3 João', 'Judas',
  'Apocalipse',
];

// Devolve os trechos com os capitulos preservados. Guardar so o nome do livro fazia
// o app sugerir Jeremias 29.11 no dia em que se le Jeremias 17-19.
function trechosDe(texto) {
  const trechos = [];
  for (const parte of texto.split(';')) {
    const m = /^\s*(.+?)\s+(\d+)(?:-(\d+))?\s*$/.exec(parte);
    if (!m) continue;
    const livro = m[1].trim();
    if (!LIVROS_CANONICOS.includes(livro)) continue;
    trechos.push({ livro, de: Number(m[2]), ate: Number(m[3] || m[2]) });
  }
  return trechos;
}

export function lerPlano(notas) {
  const dias = [];
  for (const nota of notas.filter((n) => n.pasta === '02 - Plano de Leitura' && n.dados.mes)) {
    for (const linha of nota.corpo.split('\n')) {
      const m = /^-\s*\[[ xX]\]\s*\*\*Dia (\d+)\*\*\s*[—-]\s*(.+)$/.exec(linha.trim());
      if (!m) continue;
      const numero = Number(m[1]);
      const trilhas = m[2].split('|').map((s) => s.trim());
      const trechos = [...trechosDe(trilhas[0] || ''), ...trechosDe(trilhas[1] || '')];
      dias.push({
        numero,
        mes: Number(nota.dados.mes),
        antigo: trilhas[0] || '',
        novo: trilhas[1] || '',
        trechos,
        livros: [...new Set(trechos.map((x) => x.livro))],
      });
    }
  }
  dias.sort((a, b) => a.numero - b.numero);
  return dias;
}
