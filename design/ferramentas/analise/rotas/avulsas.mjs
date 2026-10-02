// As páginas avulsas (sem conta): boas-vindas, entrar, esqueci, os três passos do cadastro,
// redefinir senha, privacidade e termos. Rode sem COOKIE. "BASE/" vira a BASE do rev.mjs.
import { expandir } from './comum.mjs';
const clic = (sel) => '(() => { const el = document.querySelector(' + JSON.stringify(sel) + '); if (!el) return "sem"; el.click(); document.activeElement && document.activeElement.blur(); return "ok"; })()';
const js = (s) => '(() => { const $ = (i) => document.getElementById(i); ' + s + '; document.activeElement && document.activeElement.blur(); return "ok"; })()';
const passo2 = "$('botao-comecar').click(); $('nome').value='Joana'; $('nascimento').value='2005-03-02'; $('form-cadastro').requestSubmit();";
const passo3 = passo2 + " $('email').value='j@x.com'; $('form-cadastro').requestSubmit();";
const rotas = [
  { nome: 'boas', url: 'BASE/entrar.html', segs: 3 },
  { nome: 'entrar', url: 'BASE/entrar.html', acao: clic('[data-ir="entrar"]') },
  { nome: 'entrar-erro', url: 'BASE/entrar.html', acao: js("document.querySelector('[data-ir=entrar]').click(); $('form-entrar').requestSubmit()") },
  { nome: 'esqueci', url: 'BASE/entrar.html', acao: js("document.querySelector('[data-ir=esqueci]').click(); $('login-esqueci').value='ana'; $('form-esqueci').requestSubmit()"), esperaAcao: 1500 },
  { nome: 'cad1', url: 'BASE/entrar.html', acao: clic('#botao-comecar') },
  { nome: 'cad2', url: 'BASE/entrar.html', acao: js(passo2) },
  { nome: 'cad3', url: 'BASE/entrar.html', acao: js(passo3 + " $('usuario').value='joana'; $('senha-nova').value='senha1234'; $('form-cadastro').requestSubmit()") },
  { nome: 'redefinir', url: 'BASE/entrar.html?redefinir=x' },
  { nome: 'privacidade', url: 'BASE/privacidade.html', segs: 14 },
  { nome: 'termos', url: 'BASE/termos.html', segs: 12 },
];
export const trabalhos = expandir(rotas);
