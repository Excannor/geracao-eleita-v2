import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dormir=(ms)=>new Promise(r=>setTimeout(r,ms));
// a pasta do proprio projeto: com caminho fixo este teste rodava contra a producao
const AQUI=join(import.meta.dirname,'..');
const EST=join(tmpdir(),'quiz.json');
const srv=spawn(process.execPath,[join(AQUI,'servidor.mjs'),'8161'],{env:{...process.env,CAMINHO_ESTADO:EST,CAMINHO_ABERTO:'1'},stdio:'ignore'});
const perfil=mkdtempSync(join(tmpdir(),'quiz-'));
const nav=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=' + PORTA_NAV,'--user-data-dir='+perfil,'--window-size=390,844','about:blank'],{stdio:'ignore'});
async function alvo(){for(let i=0;i<60;i++){try{const l=await(await fetch('http://127.0.0.1:' + PORTA_NAV + '/json/list')).json();const p=l.find(x=>x.type==='page');if(p)return p.webSocketDebuggerUrl;}catch{}await dormir(250);}throw 0;}
const ws=new WebSocket(await alvo());let seq=0;const pend=new Map();const evs=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result||{});pend.delete(m.id);}else if(m.method)evs.push(m);});
await new Promise(r=>ws.addEventListener('open',r));
const cmd=(m,p={})=>new Promise(res=>{const id=++seq;pend.set(id,res);ws.send(JSON.stringify({id,method:m,params:p}));});
const av=async e=>(await cmd('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Log.enable');
await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await cmd('Page.navigate',{url:'http://127.0.0.1:8161/'});
await dormir(1800);
let f=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FALHA')+'  '+m);if(!c)f++;};
// marca o dia 1 para desbloquear a unidade 1 na pratica
await av('CC.marcarLido(1,true)');
await av('location.hash="#/praticar"');await dormir(500);
ok(await av('document.querySelectorAll(".cartao-pratica").length>=1'),'a aba praticar lista unidades');
await av('document.querySelector(".cartao-pratica").click()');await dormir(500);
ok(await av('!!document.querySelector(".quiz")'),'a sessao de quiz abre');
ok(await av('document.querySelectorAll(".opcao").length===4'),'cada pergunta tem 4 alternativas');
// responde 8 perguntas sempre na 1a opcao, conferindo e avancando
for(let i=0;i<8;i++){
  await av('document.querySelector(".opcao").click()');await dormir(120);
  await av('document.querySelector("[data-conferir]").click()');await dormir(250);
  const fim=await av('!!document.querySelector("[data-adiante]")');
  if(fim){await av('document.querySelector("[data-adiante]").click()');await dormir(300);}
}
await dormir(500);
const txt=await av('document.querySelector(".quiz").innerText');
console.log('--- texto final ---',JSON.stringify(txt).slice(0,300));
ok(/XP/.test(txt),'a tela final mostra XP');
ok(await av('!!document.querySelector(".estrelas-fim")'),'a tela final tem estrelas');
await dormir(900);const est=await av('fetch("api/estado",{cache:"no-store"}).then(r=>r.json())');
ok(est&&est.pratica&&Object.keys(est.pratica).length>=1,'o servidor guardou o resultado da pratica');
ok(await av('CC.xpTotal()>10'),'a pratica somou XP ao total');
await av('document.querySelector("[data-sair]").click()');await dormir(400);
ok(!(await av('!!document.querySelector(".quiz")')),'sair fecha o quiz');
ok(await av('document.querySelectorAll(".aba").length===5'),'a navegacao tem 5 abas');
// aviso benigno do Chrome: .click() por script nao conta como toque de verdade pro celular,
// entao a vibracao (CC.vibrar) e bloqueada aqui e so aqui, sem ser erro do app
const AVISO_VIBRAR_SEM_TOQUE=/Blocked call to navigator\.vibrate because user hasn't tapped/;
const erros=evs.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Log.entryAdded'&&e.params.entry.level==='error')).map(e=>e.params.entry?.text||'exc').filter(t=>!AVISO_VIBRAR_SEM_TOQUE.test(t||''));
ok(erros.length===0,'nenhum erro no console'+(erros[0]?': '+erros[0]:''));
console.log(f?'\n  '+f+' falha(s)':'\n  tudo certo');
try{fecharArvore(nav, perfil)}catch{}try{srv.kill()}catch{}try{rmSync(perfil,{recursive:true,force:true})}catch{}
process.exit(f?1:0);
