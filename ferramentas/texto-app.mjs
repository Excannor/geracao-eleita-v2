// Peças comuns dos textos reescritos para o app: marcação simples, busca e ligações.
//
// Formato: blocos separados por linha em branco. "## " abre um subtítulo,
// [[id da nota|texto]] vira link, **assim** vira negrito e quebra de linha simples dentro
// do bloco vira <br>.

export const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function linha(texto) {
  return esc(texto)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, id, rotulo) => {
      const alvo = id.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      return '<a class="link-nota" href="#/nota/' + encodeURIComponent(alvo) + '" data-nota="' + esc(alvo) + '">' + rotulo + '</a>';
    });
}

export function blocosHtml(texto) {
  return texto.trim().split(/\n\s*\n/).map((b) => {
    const t = b.trim();
    if (t.startsWith('## ')) return '<h2>' + linha(t.slice(3)) + '</h2>';
    return '<p>' + t.split('\n').map(linha).join('<br>') + '</p>';
  }).join('\n');
}

export const textoPlano = (html) => html.replace(/<[^>]+>/g, ' ')
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

const idsLinkados = (html) => [...new Set([...html.matchAll(/data-nota="([^"]+)"/g)]
  .map((m) => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')))];

// Depois de trocar o html de uma nota: atualiza links, o "aparece também em" das notas
// citadas e devolve os links que apontam para notas que não existem.
export function acertarLinks(dados, id) {
  const n = dados.notas[id];
  const novos = idsLinkados(n.html);
  for (const antigo of n.links || []) {
    const a = dados.notas[antigo];
    if (a && Array.isArray(a.backlinks) && !novos.includes(antigo)) a.backlinks = a.backlinks.filter((b) => b !== id);
  }
  n.links = novos;
  for (const alvo of novos) {
    const a = dados.notas[alvo];
    if (!a) continue;
    a.backlinks ||= [];
    if (!a.backlinks.includes(id)) a.backlinks.push(id);
  }
  return novos.filter((alvo) => !dados.notas[alvo]);
}
