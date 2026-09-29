// Traz o texto bíblico para dentro do projeto: lê os arquivos "um versículo por linha"
// do eBible.org e grava conteudo/biblias/<sigla>.json, com os livros pelos mesmos nomes
// que o plano usa.
//
// Só entram traduções de licença livre. A NVI não entra: é da Biblica, e a licença dela
// não permite a Bíblia inteira dentro de um aplicativo.
//
// Uso: node ferramentas/importar-biblias.mjs <pasta>
//      a pasta tem poronbv_vpl.txt e porbr2018_vpl.txt, tirados de
//      https://ebible.org/Scriptures/poronbv_vpl.zip e .../porbr2018_vpl.zip
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = process.argv[2];
if (!PASTA) {
  console.error('uso: node ferramentas/importar-biblias.mjs <pasta com os *_vpl.txt>');
  process.exit(1);
}

// Siglas do eBible, na ordem do cânon, para os nomes do plano.
const LIVROS = {
  GEN: 'Gênesis', EXO: 'Êxodo', LEV: 'Levítico', NUM: 'Números', DEU: 'Deuteronômio',
  JOS: 'Josué', JDG: 'Juízes', RUT: 'Rute', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Reis', '2KI': '2 Reis', '1CH': '1 Crônicas', '2CH': '2 Crônicas', EZR: 'Esdras',
  NEH: 'Neemias', EST: 'Ester', JOB: 'Jó', PSA: 'Salmos', PRO: 'Provérbios',
  ECC: 'Eclesiastes', SOL: 'Cânticos', ISA: 'Isaías', JER: 'Jeremias', LAM: 'Lamentações',
  EZE: 'Ezequiel', DAN: 'Daniel', HOS: 'Oseias', JOE: 'Joel', AMO: 'Amós', OBA: 'Obadias',
  JON: 'Jonas', MIC: 'Miqueias', NAH: 'Naum', HAB: 'Habacuque', ZEP: 'Sofonias', HAG: 'Ageu',
  ZEC: 'Zacarias', MAL: 'Malaquias', MAT: 'Mateus', MAR: 'Marcos', LUK: 'Lucas', JOH: 'João',
  ACT: 'Atos', ROM: 'Romanos', '1CO': '1 Coríntios', '2CO': '2 Coríntios', GAL: 'Gálatas',
  EPH: 'Efésios', PHI: 'Filipenses', COL: 'Colossenses', '1TH': '1 Tessalonicenses',
  '2TH': '2 Tessalonicenses', '1TI': '1 Timóteo', '2TI': '2 Timóteo', TIT: 'Tito',
  PHM: 'Filemom', HEB: 'Hebreus', JAM: 'Tiago', '1PE': '1 Pedro', '2PE': '2 Pedro',
  '1JO': '1 João', '2JO': '2 João', '3JO': '3 João', JUD: 'Judas', REV: 'Apocalipse',
};

// O crédito vai do jeito que cada licença pede. A Nova Bíblia Viva só pode ser
// distribuída sem mudança no texto e com o título como está: por isso o importador
// não toca em nenhuma palavra, nem nos colchetes da Bíblia Livre.
const TRADUCOES = [
  {
    arquivo: 'poronbv_vpl.txt',
    sigla: 'nbv',
    abreviatura: 'NBV',
    nome: 'Biblica® Open Nova Bíblia Viva™',
    resumo: 'Português de hoje, fácil de ler',
    licenca: 'CC BY-SA 4.0',
    licencaUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br',
    credito: [
      'Biblica® Open Nova Bíblia Viva™. Copyright © 2007, 2010 by Biblica, Inc.',
      '“Biblica” é uma marca registrada na Oficina de Patentes e Marcas dos Estados Unidos por Biblica, Inc. Usado com permissão.',
      'Disponível sob a licença Creative Commons Atribuição-CompartilhaIgual 4.0 Internacional. A obra original está disponível gratuitamente em www.biblica.com e open.bible.',
    ],
  },
  {
    arquivo: 'porbr2018_vpl.txt',
    sigla: 'blivre',
    abreviatura: 'BLIVRE',
    nome: 'Bíblia Livre',
    resumo: 'Almeida de 1819 atualizada, mais clássica',
    licenca: 'CC BY 4.0 Brasil',
    licencaUrl: 'https://creativecommons.org/licenses/by/4.0/br/',
    credito: [
      'Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio e Marco Teles, http://sites.google.com/site/biblialivre/, fevereiro de 2018.',
      'Licença Creative Commons Atribuição 4.0 Brasil. Reprodução permitida desde que devidamente mencionados fonte e autores.',
      'Os colchetes são da própria tradução: marcam palavras acrescentadas para dar sentido à frase.',
    ],
  },
];

const LINHA = /^([1-3A-Z]{3}) (\d+):(\d+) (.*)$/;

mkdirSync(join(AQUI, 'conteudo', 'biblias'), { recursive: true });

let falhou = false;
for (const t of TRADUCOES) {
  const origem = join(PASTA, t.arquivo);
  if (!existsSync(origem)) {
    console.error('  não achei ' + origem);
    falhou = true;
    continue;
  }

  const livros = {};
  let versiculos = 0;
  const estranhas = [];
  for (const bruta of readFileSync(origem, 'utf8').split(/\r?\n/)) {
    if (!bruta.trim()) continue;
    const m = LINHA.exec(bruta);
    if (!m || !LIVROS[m[1]]) { estranhas.push(bruta.slice(0, 60)); continue; }
    const nome = LIVROS[m[1]];
    const cap = Number(m[2]);
    const vers = Number(m[3]);
    const capitulos = livros[nome] || (livros[nome] = []);
    const lista = capitulos[cap - 1] || (capitulos[cap - 1] = []);
    // Um versículo que a tradução omite fica como texto vazio, para o número de
    // cada versículo continuar sendo a posição dele na lista.
    while (lista.length < vers - 1) lista.push('');
    lista[vers - 1] = m[4].trim();
    versiculos++;
  }

  // capítulo que nunca apareceu vira lista vazia, não buraco no JSON
  for (const capitulos of Object.values(livros)) {
    for (let i = 0; i < capitulos.length; i++) if (!capitulos[i]) capitulos[i] = [];
  }

  const faltam = Object.values(LIVROS).filter((l) => !livros[l]);
  if (faltam.length) {
    console.error('  ' + t.sigla + ': faltam livros: ' + faltam.join(', '));
    falhou = true;
  }
  if (estranhas.length) {
    console.error('  ' + t.sigla + ': ' + estranhas.length + ' linhas fora do formato, a primeira: ' + estranhas[0]);
    falhou = true;
  }

  const { arquivo, ...descricao } = t;
  const saida = { ...descricao, versiculos, livros };
  writeFileSync(join(AQUI, 'conteudo', 'biblias', t.sigla + '.json'), JSON.stringify(saida), 'utf8');
  console.log('  ' + t.abreviatura + ': ' + Object.keys(livros).length + ' livros · ' + versiculos + ' versículos');
}

process.exit(falhou ? 1 : 0);
