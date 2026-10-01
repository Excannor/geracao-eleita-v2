import { spawn } from 'node:child_process';
import { portaLivre, fecharArvore } from './navegador.mjs';
// Porta sorteada a cada rodada: com porta fixa, um Chrome que sobrou da rodada anterior era
// quem respondia, com o armazenamento local de antes.
const PORTA_NAV = await portaLivre();
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dormir=(ms)=>new Promise(r=>setTimeout(r,ms));
// Sobe o seu próprio servidor. Depender de um já aberto na porta fazia o teste medir
// a versão que aquele processo tinha carregado, que pode ser de dias atrás.
const PORTA=8170;
const servidor=spawn(process.execPath,[join(import.meta.dirname,'..','servidor.mjs'),String(PORTA)],
  {env:{...process.env,CAMINHO_ESTADO:join(tmpdir(),'cc-unidades','estado.json'),CAMINHO_ABERTO:'1'},stdio:'ignore'});
await dormir(1400);
const perfil=mkdtempSync(join(tmpdir(),'td-'));
const nav=spawn(process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=' + PORTA_NAV,'--user-data-dir='+perfil,'--window-size=390,844','about:blank'],{stdio:'ignore'});
async function alvo(){for(let i=0;i<60;i++){try{const l=await(await fetch('http://127.0.0.1:' + PORTA_NAV + '/json/list')).json();const p=l.find(x=>x.type==='page');if(p)return p.webSocketDebuggerUrl;}catch{}await dormir(250);}throw 0;}
const ws=new WebSocket(await alvo());let seq=0;const pend=new Map();const evs=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result||{});pend.delete(m.id);}else if(m.method)evs.push(m);});
await new Promise(r=>ws.addEventListener('open',r));
const cmd=(m,p={})=>new Promise(res=>{const id=++seq;pend.set(id,res);ws.send(JSON.stringify({id,method:m,params:p}));});
const av=async e=>(await cmd('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
await cmd('Runtime.enable');await cmd('Log.enable');
await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await cmd('Page.navigate',{url:'http://127.0.0.1:8170/#/praticar'});
await dormir(2200);
let f=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FALHA')+'  '+m);if(!c)f++;};
ok(await av('document.querySelectorAll(".cartao-pratica").length===12'),'as 12 unidades aparecem ('+await av('document.querySelectorAll(".cartao-pratica").length')+')');
ok(await av('document.querySelectorAll(".cartao-pratica.adiante").length>0'),'unidades adiante marcadas ('+await av('document.querySelectorAll(".cartao-pratica.adiante").length')+')');
ok(await av('document.querySelector(".cartao-pratica").className.includes("adiante")===false'),'a unidade atual vem primeiro e nao esta marcada como adiante');
ok(!(await av('document.body.innerText.includes("Revisão do caminho")')),'sem revisao geral, so unidades');
// abre uma unidade ADIANTE (a ultima da lista) e joga uma rodada inteira
const ultimo=await av('document.querySelectorAll(".cartao-pratica").length-1');
await av('document.querySelectorAll(".cartao-pratica")['+ultimo+'].click()');
await dormir(600);
ok(await av('!!document.querySelector(".quiz")'),'unidade adiante abre o quiz');
ok(await av('document.querySelectorAll(".opcao").length===4'),'4 alternativas na unidade adiante');
for(let i=0;i<8;i++){
  await av('document.querySelector(".opcao").click()');await dormir(110);
  await av('document.querySelector("[data-conferir]").click()');await dormir(240);
  if(await av('!!document.querySelector("[data-adiante]")')){await av('document.querySelector("[data-adiante]").click()');await dormir(280);}
}
await dormir(400);
ok(await av('!!document.querySelector(".estrelas-fim")'),'a tela final mostra as estrelas');
ok(await av('(t => /acertos/i.test(t) && !/XP/.test(t))(document.querySelector(".quiz").innerText)'),'a tela final mostra os acertos e não XP');
// cada unidade guarda o proprio resultado
await dormir(900);
const est=await av('fetch("api/estado",{cache:"no-store"}).then(r=>r.json())');
ok(est&&est.pratica&&Object.keys(est.pratica).length>=1,'resultado da unidade adiante gravado: '+JSON.stringify(est&&est.pratica));
// confere que TODAS as 12 montam perguntas sem erro
const todas=await av(`(()=>{const r=[];for(const u of CC.D.unidades){try{
  const v=u.versiculos; if(v.length<4){r.push(u.numero+':poucos');continue;}
  const semTexto=v.filter(id=>!CC.D.notas[id]||!CC.D.notas[id].texto);
  r.push(u.numero+':'+v.length+(semTexto.length?' SEM-TEXTO:'+semTexto.length:''));
}catch(e){r.push(u.numero+':ERRO '+e.message);}}return r.join(' | ');})()`);
console.log('  unidades:', todas);
ok(!/ERRO|poucos|SEM-TEXTO/.test(todas),'todas as 12 unidades tem material completo');
// O clique sintético do teste não conta como toque do usuário para o Chrome, que bloqueia
// a vibração e loga isso como erro: é política do navegador, não bug (toque real funciona).
const AVISO_VIBRAR_SEM_TOQUE=/Blocked call to navigator\.vibrate because user hasn't tapped/;
const erros=evs.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Log.entryAdded'&&e.params.entry.level==='error')).map(e=>e.params.entry?.text||'exc').filter((t)=>!AVISO_VIBRAR_SEM_TOQUE.test(t||''));
ok(erros.length===0,'nenhum erro no console'+(erros[0]?': '+erros[0]:''));
console.log(f?'\n  '+f+' falha(s)':'\n  tudo certo');
try{fecharArvore(nav, perfil)}catch{}try{servidor.kill()}catch{}try{rmSync(perfil,{recursive:true,force:true})}catch{}
process.exit(f?1:0);
