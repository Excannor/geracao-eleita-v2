(async () => {
  const d = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('.cabeca-pratica [data-unidade]').click(); await d(700);
  const modo = window.__MODO || 'pergunta';
  if (modo === 'pergunta') return 'ok';
  const texto = (document.querySelector('.quiz .verso') || {}).textContent;
  const ops = [...document.querySelectorAll('.quiz [data-opcao]')];
  const certo = ops.find((b) => CC.textoDaNota(CC.D.notas[b.dataset.opcao]) === texto);
  const alvo = (modo === 'acerto' || modo.startsWith('texto')) ? certo : ops.find((b) => b !== certo);
  if (modo === 'marcado') { alvo.click(); await d(400); return 'marcado'; }
  alvo.click(); await d(300);
  document.querySelector('[data-conferir]').click(); await d(600);
  if (modo === 'texto' || modo === 'textoerro') { document.querySelector('[data-adiante]').click(); await d(500); if (modo === 'textoerro') { document.querySelector('.quiz [data-opcao]').click(); await d(200); document.querySelector('[data-conferir]').click(); await d(600); } return modo; }
  if (modo !== 'fim') return modo;
  for (let i = 0; i < 20 && document.querySelector('[data-adiante]'); i++) {
    document.querySelector('[data-adiante]').click(); await d(250);
    const o = document.querySelector('.quiz [data-opcao]'); if (!o) break;
    o.click(); await d(150); document.querySelector('[data-conferir]').click(); await d(300);
  }
  return 'fim';
})()
