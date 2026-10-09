// Novidades: o mural do que os amigos alcançaram. Só entra marco que o servidor confere
// no progresso de quem publica (ofensiva, livro, unidade, conquista) e
// o versículo que a pessoa escolheu guardar. Nada do que alguém escreve ou ora vira
// novidade, e texto livre não existe aqui: o mural não precisa de moderação.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { abrirModulo, concluirImportacao, lerTabela, sincronizar } from './db.mjs';

export const MARCOS_PROPOSITO = [7, 30, 100, 365];
export const VIDA_NOVIDADE = 30 * 24 * 60 * 60 * 1000;
const POR_AUTOR = 80;
const VERSICULOS_POR_DIA = 3;

const erro = (mensagem, codigo = 400) => Object.assign(new Error(mensagem), { publico: true, codigo });

// Novidades de dupla (propósito novo, marco de propósito) só aparecem para os dois:
// o amigo de um não precisa saber com quem o outro lê.
export const DE_DUPLA = new Set(['novoProposito', 'proposito']);
// Marcos de um grupo aparecem só para quem está nele (a lista vai em dados.membros).
export const DE_GRUPO = new Set(['propositoGrupo']);

export class Novidades {
  constructor(arquivo) {
    this.arquivo = arquivo;
    this.dados = { versao: 1, eventos: [], ligados: [], perguntados: [] };
    // Versículos apagados nas últimas 24 horas, por autor: contam no teto do dia, para que
    // apagar e compartilhar de novo não vire um jeito de encher o mural dos amigos. Fica só
    // na memória: depois de reiniciar o servidor, o teto volta a contar só os que estão lá.
    this.apagadosHoje = new Map();
  }

  // O mural mora no banco (novidades_eventos, novidades_reacoes, novidades_pessoas); o
  // novidades.json antigo é importado uma vez.
  async carregar() {
    const { db, legado } = abrirModulo(this.arquivo, 'novidades');
    this.db = db;
    const t = this.lerTabelas();
    if (legado) {
      this.dados = { versao: 1, eventos: [], ligados: [], perguntados: [], ...legado };
      this.limpar();
      await this.salvar();
      concluirImportacao(db, 'novidades', this.arquivo);
      return this;
    }
    const reacoes = new Map();
    for (const r of t.reacoes) (reacoes.get(r.evento) || reacoes.set(r.evento, []).get(r.evento)).push(r.usuario);
    this.dados = {
      versao: 1,
      eventos: t.eventos.map((e) => ({
        id: e.id, autor: e.autor, tipo: e.tipo, dados: JSON.parse(e.dados), chave: e.chave, em: Number(e.em), reacoes: reacoes.get(e.id) || [],
      })),
      ligados: t.pessoas.filter((p) => p.ligado).map((p) => p.usuario),
      perguntados: t.pessoas.filter((p) => p.perguntado).map((p) => p.usuario),
    };
    this.limpar();
    return this;
  }

  lerTabelas() {
    return {
      eventos: lerTabela(this.db, 'novidades_eventos', ['id'], 'em'),
      reacoes: lerTabela(this.db, 'novidades_reacoes', ['evento', 'usuario'], 'evento, ordem'),
      pessoas: lerTabela(this.db, 'novidades_pessoas', ['usuario']),
    };
  }

  async salvar() {
    if (!this.db) { this.db = abrirModulo(this.arquivo, 'novidades').db; this.lerTabelas(); }
    const pessoas = new Map();
    for (const u of this.dados.perguntados) pessoas.set(u, { usuario: u, ligado: 0, perguntado: 1 });
    for (const u of this.dados.ligados) pessoas.set(u, { usuario: u, ligado: 1, perguntado: pessoas.has(u) ? 1 : 0 });
    sincronizar(this.db, [
      { tabela: 'novidades_eventos', chaves: ['id'], linhas: this.dados.eventos.map((e) => ({
        id: e.id, autor: e.autor, tipo: e.tipo, dados: JSON.stringify(e.dados ?? {}), chave: e.chave ?? null, em: Number(e.em),
      })) },
      { tabela: 'novidades_reacoes', chaves: ['evento', 'usuario'], linhas: this.dados.eventos.flatMap((e) => (e.reacoes || []).map((usuario, ordem) => ({ evento: e.id, usuario, ordem }))) },
      { tabela: 'novidades_pessoas', chaves: ['usuario'], linhas: [...pessoas.values()] },
    ]);
  }

  limpar(agora = Date.now()) {
    const vivos = this.dados.eventos.filter((e) => agora - e.em < VIDA_NOVIDADE);
    const contagem = new Map();
    // do mais novo para o mais velho: cada autor guarda só os últimos
    this.dados.eventos = vivos.sort((a, b) => b.em - a.em).filter((e) => {
      const n = (contagem.get(e.autor) || 0) + 1;
      contagem.set(e.autor, n);
      return n <= POR_AUTOR;
    });
  }

  // Mostrar os próprios marcos é escolha: quem nunca respondeu fica de fora do mural.
  compartilha(usuario) { return this.dados.ligados.includes(usuario); }
  perguntou(usuario) { return this.dados.perguntados.includes(usuario); }

  async preferir(usuario, ligado) {
    const lista = new Set(this.dados.ligados);
    if (ligado) lista.add(usuario); else lista.delete(usuario);
    this.dados.ligados = [...lista];
    if (!this.dados.perguntados.includes(usuario)) this.dados.perguntados.push(usuario);
    await this.salvar();
  }

  // A chave impede a mesma novidade duas vezes: a ofensiva de 7 dias de uma corrida só
  // entra uma vez, mesmo que o aparelho peça de novo.
  async publicar(autor, tipo, dados, chave, agora = Date.now()) {
    if (!this.compartilha(autor) && !DE_DUPLA.has(tipo) && !DE_GRUPO.has(tipo)) return null;
    if (this.dados.eventos.some((e) => e.autor === autor && e.chave === chave)) return null;
    if (tipo === 'versiculo') {
      const hoje = this.dados.eventos.filter((e) => e.autor === autor && e.tipo === 'versiculo' && agora - e.em < 86400000);
      const apagados = (this.apagadosHoje.get(autor) || []).filter((em) => agora - em < 86400000);
      if (hoje.length + apagados.length >= VERSICULOS_POR_DIA) throw erro('você já compartilhou versículos demais hoje', 429);
    }
    const evento = { id: randomBytes(9).toString('base64url'), autor, tipo, dados, chave, em: agora, reacoes: [] };
    this.dados.eventos.push(evento);
    this.limpar(agora);
    await this.salvar();
    return evento;
  }

  achar(id) { return this.dados.eventos.find((e) => e.id === id) || null; }

  // Quem vê: a própria pessoa e os amigos aceitos. Dupla: só os dois.
  visivel(evento, eu, amigos) {
    if (DE_DUPLA.has(evento.tipo)) return evento.autor === eu || evento.dados.com === eu;
    if (DE_GRUPO.has(evento.tipo)) return evento.autor === eu || (evento.dados.membros || []).includes(eu);
    if (!this.compartilha(evento.autor)) return false;
    return evento.autor === eu || amigos.has(evento.autor);
  }

  mural(eu, amigos, limite = 40) {
    return this.dados.eventos
      .filter((e) => this.visivel(e, eu, amigos))
      .sort((a, b) => b.em - a.em)
      .slice(0, limite);
  }

  async reagir(eu, id, amigos) {
    const evento = this.achar(id);
    if (!evento || !this.visivel(evento, eu, amigos)) throw erro('essa novidade não está mais aqui', 404);
    const i = evento.reacoes.indexOf(eu);
    if (i === -1) evento.reacoes.push(eu); else evento.reacoes.splice(i, 1);
    await this.salvar();
    return { reagiu: i === -1, total: evento.reacoes.length };
  }

  // Quem compartilhou um versículo pode tirá-lo do mural: some para todos, com as reações
  // junto (elas moram no próprio evento). Só o versículo: os marcos o servidor confere no
  // progresso e não têm o que apagar. A nota e a marcação do versículo ficam na conta.
  async apagarVersiculo(eu, id, agora = Date.now()) {
    const evento = this.achar(id);
    if (!evento) throw erro('esse versículo já não está no Juntos', 404);
    if (evento.autor !== eu) throw erro('só quem compartilhou pode apagar', 403);
    if (evento.tipo !== 'versiculo') throw erro('só dá para apagar um versículo compartilhado', 400);
    this.dados.eventos = this.dados.eventos.filter((e) => e !== evento);
    if (agora - evento.em < 86400000) {
      const lista = (this.apagadosHoje.get(eu) || []).filter((em) => agora - em < 86400000);
      lista.push(evento.em);
      this.apagadosHoje.set(eu, lista);
    }
    await this.salvar();
    return { apagado: true };
  }

  async apagarDe(usuario) {
    this.dados.eventos = this.dados.eventos.filter((e) => e.autor !== usuario && (e.dados || {}).com !== usuario
      && !((e.dados || {}).membros || []).includes(usuario));
    for (const e of this.dados.eventos) e.reacoes = e.reacoes.filter((u) => u !== usuario);
    this.dados.ligados = this.dados.ligados.filter((u) => u !== usuario);
    this.dados.perguntados = this.dados.perguntados.filter((u) => u !== usuario);
    await this.salvar();
  }
}
