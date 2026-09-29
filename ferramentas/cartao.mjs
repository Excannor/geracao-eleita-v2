// Extrai, de cada nota, o cartao que a interface mostra: titulo, linha de metadados
// e um resumo tirado da secao certa, nao dos primeiros caracteres do arquivo, que em
// ficha de livro caem dentro da tabela e produzem coisas como um rotulo vazio.

import { LIVROS_CANONICOS } from './vault.mjs';

const ORDEM_LIVRO = new Map(LIVROS_CANONICOS.map((l, i) => [l, i]));

// Divide o corpo em secoes por titulo de nivel 2.
export function secoesDo(corpo) {
  const mapa = new Map();
  let atual = '';
  let acumulado = [];
  const fechar = () => { if (atual) mapa.set(atual, acumulado.join('\n').trim()); };

  for (const linha of corpo.split('\n')) {
    const t = /^##\s+(.+?)\s*$/.exec(linha);
    if (t) { fechar(); atual = t[1]; acumulado = []; continue; }
    if (/^#\s+/.test(linha)) continue;
    acumulado.push(linha);
  }
  fechar();
  return mapa;
}

// Primeiro paragrafo de prosa: pula tabelas, listas, citacoes e linhas em branco.
export function primeiroParagrafo(texto) {
  if (!texto) return '';
  for (const bruto of texto.split(/\n\s*\n/)) {
    const bloco = bruto.trim();
    if (!bloco) continue;
    if (/^[|>#-]/.test(bloco) || /^\d+\./.test(bloco)) continue;
    return bloco.replace(/\n/g, ' ').trim();
  }
  return '';
}

// Texto antes do primeiro titulo de nivel 2 (usado pelos fios, que abrem com um resumo).
export function aberturaDe(corpo) {
  const corte = corpo.search(/^##\s+/m);
  return primeiroParagrafo(corte === -1 ? corpo : corpo.slice(0, corte));
}

const limparInline = (s) =>
  s.replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, a, b) => b || a.split('/').pop())
   .replace(/\*\*(.+?)\*\*/g, '$1')
   .replace(/\*(.+?)\*/g, '$1')
   .replace(/`/g, '')
   .replace(/\s+/g, ' ')
   .trim();

const primeiraFrase = (s, limite = 180) => {
  const t = limparInline(s);
  if (t.length <= limite) return t;
  const corte = t.slice(0, limite);
  const ponto = corte.lastIndexOf('. ');
  return (ponto > 70 ? corte.slice(0, ponto + 1) : corte.trimEnd() + '…');
};

// O frontmatter pode trazer lista onde se espera texto; coagir evita quebrar o build.
const texto = (v) => (Array.isArray(v) ? v.join(', ') : (v == null ? '' : String(v)));
const capitalizar = (v) => {
  const s = texto(v);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
};

// Ordem de classificacao dentro de cada secao: canonica para livros e versiculos,
// cronologica para eventos, alfabetica para o resto.
function chaveOrdem(nota, secoes) {
  const fm = nota.dados;
  if (fm.tipo === 'livro') return [ORDEM_LIVRO.get(nota.nome) ?? 999, 0, 0];
  if (fm.tipo === 'versiculo') {
    const m = /^(.+?)\s+(\d+)\.(\d+)/.exec(nota.nome);
    if (m) return [ORDEM_LIVRO.get(m[1]) ?? 999, Number(m[2]), Number(m[3])];
  }
  if (fm.tipo === 'evento') return [Number(fm.ordem) || 999, 0, 0];
  // Regra geral: qualquer nota que declare ordem no frontmatter e respeitada.
  // A hermeneutica tem sequencia didatica de 1 a 13 e saia em ordem alfabetica,
  // com a licao 1 caindo em decimo primeiro lugar.
  if (fm.ordem != null && fm.ordem !== '') return [Number(fm.ordem) || 999, 0, 0];
  return null;
}

export function montarCartao(nota) {
  const secoes = secoesDo(nota.corpo);
  const fm = nota.dados;
  const de = (...nomes) => {
    for (const n of nomes) if (secoes.has(n)) return secoes.get(n);
    return '';
  };

  let sub = '';
  let resumo = '';
  let destaque = '';
  const chips = [];

  switch (fm.tipo) {
    case 'livro': {
      const testamento = fm.testamento === 'Novo' ? 'Novo Testamento' : 'Antigo Testamento';
      sub = [testamento, capitalizar(fm.genero), fm.capitulos ? texto(fm.capitulos) + ' capítulos' : '']
        .filter(Boolean).join(' · ');
      resumo = primeiraFrase(primeiroParagrafo(de('Tema central')));
      if (fm.autor) chips.push(['Autor', texto(fm.autor)]);
      if (fm.data) chips.push(['Data', texto(fm.data)]);
      if (fm.aliança || fm.alianca) chips.push(['Aliança', texto(fm.aliança || fm.alianca)]);
      break;
    }
    case 'pessoa': {
      sub = [texto(fm.periodo), texto(fm.epoca)].filter(Boolean).join(' · ');
      resumo = primeiraFrase(primeiroParagrafo(de('Quem foi')));
      if (Array.isArray(fm['aparece-em']) && fm['aparece-em'].length) {
        chips.push(['Aparece em', fm['aparece-em'].join(', ')]);
      }
      break;
    }
    case 'lugar': {
      sub = primeiraFrase(texto(fm.regiao), 70);
      resumo = primeiraFrase(primeiroParagrafo(de('O que era')));
      break;
    }
    case 'evento': {
      const escala = fm.escala === 'episódio' ? 'Episódio' : 'Marco';
      sub = [texto(fm.data), escala].filter(Boolean).join(' · ');
      resumo = primeiraFrase(primeiroParagrafo(de('O que aconteceu')));
      if (fm['onde-esta']) chips.push(['Onde está', texto(fm['onde-esta'])]);
      break;
    }
    case 'versiculo': {
      sub = [texto(fm.livro), texto(fm.epoca)].filter(Boolean).join(' · ');
      const citacao = /^>\s*(.+)$/m.exec(nota.corpo);
      destaque = citacao ? limparInline(citacao[1]) : '';
      resumo = primeiraFrase(primeiroParagrafo(de('O que diz no contexto')), 140);
      break;
    }
    case 'tema': {
      sub = 'Estudo temático';
      resumo = primeiraFrase(primeiroParagrafo(de('Definição', 'Definição de trabalho')));
      break;
    }
    case 'fio': {
      const inicio = fm['comeca-em'];
      const fim = fm['termina-em'];
      sub = inicio && fim ? `${texto(inicio)} → ${texto(fim)}` : (texto(fm.alcance) || 'Conexão bíblica');
      resumo = primeiraFrase(aberturaDe(nota.corpo));
      break;
    }
    case 'licao': {
      sub = 'Trilha do recém-batizado';
      resumo = primeiraFrase(aberturaDe(nota.corpo) || primeiroParagrafo(nota.corpo));
      break;
    }
    case 'alianca':
    case 'aliança': {
      sub = 'Aliança';
      resumo = primeiraFrase(aberturaDe(nota.corpo) || primeiroParagrafo(nota.corpo));
      break;
    }
    default: {
      sub = capitalizar(texto(fm.tipo).replace(/-/g, ' '));
      resumo = primeiraFrase(aberturaDe(nota.corpo) || primeiroParagrafo(nota.corpo));
    }
  }

  if (!resumo) resumo = primeiraFrase(aberturaDe(nota.corpo) || primeiroParagrafo(nota.corpo));

  // 23 notas de versiculo trazem "Uso indevido comum". Mostrar a citacao solta sem
  // esse aviso e reproduzir exatamente o proof-texting contra o qual o vault adverte.
  const alerta = [...secoes.keys()].some((k) => /uso indevido/i.test(k));

  return {
    sub,
    resumo,
    destaque,
    alerta,
    chips,
    ordem: chaveOrdem(nota, secoes),
    // usados como filtros nas paginas de secao
    filtro: fm.tipo === 'livro' ? (fm.testamento === 'Novo' ? 'Novo' : 'Antigo')
      : fm.tipo === 'pessoa' ? (fm.periodo || '')
      : fm.tipo === 'versiculo' ? (fm.testamento || '')
      : fm.tipo === 'evento' ? (fm.escala === 'episódio' ? 'Episódio' : 'Marco')
      : '',
  };
}
