// Discipulado: a relação 1 a 1 de Mateus 28.19-20 ("ensinando-os a guardar todas as coisas
// que vos tenho ordenado") e 2 Timóteo 2.2 ("o que de mim ouviste... confia-o a homens fiéis,
// que sejam idôneos para também ensinarem os outros"). Aqui moram só as regras puras, que os
// testes exercitam sem servidor; quem guarda é contas.mjs e quem serve é servidor.mjs.
//
// O discipulador acompanha; o discípulo decide o que mostrar. Nunca há texto: só números e
// datas, e só os que o discípulo escolheu deixar ver.

// No máximo 1 discipulador ativo por pessoa, e no máximo 12 discípulos ativos por discipulador
// (2 Tm 2.2 pede multiplicação, não uma multidão só de um lado).
export const LIMITE_DISCIPULADORES = 1;
export const LIMITE_DISCIPULOS = 12;

export const PAPEIS = ['discipulador', 'discipulo'];
export const papelValido = (p) => PAPEIS.includes(p);

// Os 4 marcos de "Minha caminhada". A ordem é só de exibição; cada um tem data opcional.
export const MARCOS = ['decisao', 'batismo', 'celula', 'discipula'];
export const ROTULOS_MARCO = {
  decisao: 'Decidi seguir Jesus',
  batismo: 'Fui batizado',
  celula: 'Entrei numa célula',
  discipula: 'Comecei a acompanhar alguém na fé',
};

const somaDias = (texto, n) => {
  const d = new Date(texto + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// O que o discípulo escolhe mostrar: só os três interruptores, nunca outra chave e nunca texto.
export const MOSTRAR_PADRAO = { passos: true, semana: true, marcos: false };
export function mostrarValido(m) {
  const o = m || {};
  return { passos: !!o.passos, semana: !!o.semana, marcos: !!o.marcos };
}

// Em quantos dos últimos 7 dias (hoje incluso) a pessoa fez alguma leitura. O "Power of 4" só
// entra na tela (o discipulador vê se chegou a 4 ou mais); aqui é só a contagem.
export function diasLidosNaSemana(datasFeitas, referencia) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (datasFeitas.has(somaDias(referencia, -i))) n++;
  return n;
}

// A data de um encontro: hoje ou até 7 dias atrás, nunca no futuro. Só a data é guardada.
export function dataEncontroValida(data, hoje) {
  const d = String(data || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= hoje && d >= somaDias(hoje, -7);
}

// Os marcos que têm data marcada, prontos para sair (só quando "marcos" está ligado).
export function marcosComData(marcos) {
  const saida = {};
  for (const chave of MARCOS) {
    const data = marcos && marcos[chave];
    if (data) saida[chave] = data;
  }
  return saida;
}

// O que o discipulador vê de um discípulo, conforme o que ele escolheu mostrar:
//   passos: quantos dos 12 Primeiros Passos concluiu
//   semana: em quantos dos últimos 7 dias leu
//   marcos: os marcos com data, e (só junto com marcos) "acompanha": a cadeia de 2 Tm 2.2,
//           só o número de discípulos ativos que essa pessoa tem, nunca nomes.
// Nenhuma chave sai se o discípulo não ligou aquele interruptor.
export function resumoParaDiscipulador({
  mostrar, passos = 0, semana = 0, marcos = null, acompanha = 0,
}) {
  const m = mostrarValido(mostrar);
  const saida = {};
  if (m.passos) saida.passos = passos;
  if (m.semana) saida.semana = semana;
  if (m.marcos) {
    saida.marcos = marcosComData(marcos);
    if (acompanha > 0) saida.acompanha = acompanha;
  }
  return saida;
}
