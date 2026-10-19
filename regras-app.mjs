// As regras do aplicativo, as mesmas do navegador, carregadas fora da tela: a fusão entre
// aparelhos e a conta da ofensiva com escudos (02-estado.js), o leitor de marcas do estudo da
// célula e o que o servidor monta a partir do plano. Mora aqui, e não dentro de servidor.mjs, para
// que uma ferramenta que grava no banco como o servidor (ferramentas/colocar-estudo.mjs) use
// exatamente as mesmas regras e as mesmas opções de Contas.salvarEstudo.
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createContext, runInContext } from 'node:vm';

// raiz: a pasta do app (onde estão conteudo/ e src/). extras: outros arquivos do app, relativos à
// raiz, rodados no mesmo contexto depois dos de sempre (o servidor não pede nenhum).
export function carregarRegrasDoApp(raiz, { extras = [] } = {}) {
  const D = JSON.parse(readFileSync(join(raiz, 'conteudo', 'conteudo.json'), 'utf8'));
  // O plano do conteúdo: os propósitos de livro precisam saber por onde cada dia passa.
  const plano = D.plano;
  // As reflexões dão o "tema" do dia aos lembretes ("a reflexão de hoje se chama ...").
  const reflexoes = D.reflexoes || {};
  const contexto = createContext({
    window: { DADOS: D }, console, Date, Math, JSON, Object, Set, Map, Number, String, Array, Boolean, Intl,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    document: { documentElement: { dataset: {} }, querySelector: () => null },
    fetch: () => Promise.reject(new Error('sem rede no servidor')),
    setTimeout, clearTimeout, location: { protocol: 'file:' }, navigator: {}, addEventListener: () => {},
  });
  for (const f of ['01-nucleo.js', '02-estado.js', '02b-jogo.js']) {
    runInContext(readFileSync(join(raiz, 'src', 'app', f), 'utf8'), contexto, { filename: f });
  }
  // O leitor de marcas do estudo da célula (CC.lerEstudo) é o mesmo da prévia do líder: o servidor
  // relê o texto que chega e grava só o que ele mesmo leu (docs/a-mesa-fase1.md, seção 2).
  runInContext(readFileSync(join(raiz, 'src', 'sob-demanda', 'estudo-marcas.js'), 'utf8'), contexto, { filename: 'estudo-marcas.js' });
  for (const f of extras) runInContext(readFileSync(join(raiz, f), 'utf8'), contexto, { filename: basename(f) });
  const regras = contexto.window.CC;

  const livros = [...new Set(plano.flatMap((d) => d.livros))];
  // Quantos capítulos cada livro tem (o plano passa pela Bíblia inteira): sem isso, "Efésios 99.1"
  // viraria cartão.
  const capitulos = regras.capitulosDoPlano(plano);
  // Quantos versículos cada capítulo tem, por tradução: o cartão do estudo precisa existir na Bíblia
  // do app. Só a contagem fica na memória; o texto é lido uma vez, no primeiro estudo salvo naquela
  // tradução, e descartado. Sem o arquivo, a conferência fica só no capítulo.
  const VERSICULOS = new Map();
  function versiculosDa(sigla) {
    if (!VERSICULOS.has(sigla)) {
      let contagem = null;
      try {
        const b = JSON.parse(readFileSync(join(raiz, 'conteudo', 'biblias', sigla + '.json'), 'utf8'));
        contagem = Object.fromEntries(Object.entries(b.livros || {}).map(([livro, caps]) => [livro, caps.map((v) => (Array.isArray(v) ? v.length : 0))]));
      } catch { contagem = null; }
      VERSICULOS.set(sigla, contagem);
    }
    const c = VERSICULOS.get(sigla);
    return c ? (livro, cap) => (c[livro] || [])[cap - 1] || 0 : null;
  }
  // A semana que o roteiro "Leitura da semana" cobre: os 7 dias do plano até onde o líder já leu (é
  // ele quem conduz o encontro), e a referência-chave dela, a da reflexão do 4º dia.
  function semanaDoLider(estadoDoLider) {
    const lidos = ((estadoDoLider && estadoDoLider.lidos) || []).map(Number).filter((n) => n >= 1 && n <= plano.length);
    return Math.min(plano.length, Math.max(7, lidos.length ? Math.max(...lidos) : 0));
  }
  const refDaSemana = (ate) => (((reflexoes[ate - 3] || [])[0] || {}).ref) || '';
  // As opções de Contas.salvarEstudo para quem prepara, a partir do progresso dele (o que o banco
  // guarda em estados): a leitura da semana congela até que dia do plano ela vai.
  const opcoesDoEstudo = (estadoDoLider) => {
    const ate = semanaDoLider(estadoDoLider);
    return { regras, livros, capitulos, versiculos: versiculosDa, planoAte: ate, refSemana: refDaSemana(ate) };
  };

  return { conteudo: D, plano, reflexoes, regras, livros, capitulos, versiculosDa, semanaDoLider, refDaSemana, opcoesDoEstudo };
}
