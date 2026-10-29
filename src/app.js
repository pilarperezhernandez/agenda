/* Agenda — aplicación (DOM). Usa Core (src/core.js) para todo lo que es lógica. */
(() => {
'use strict';
const C = window.Core;
const { $: _unused } = {};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const { pad, DOW, DOWL, MON, dstr, tstr, iso, parse, mins, tfromMins, addDays, startOfWeek, sameDay, dayOf, fmtDur, fmtDate, fmtDateLong, durOf, uid, RULES_DAY, STYLE_LABEL } = C;
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let toastT; const toast = m => { const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),3000); };
function askConfirm(msg, okLabel){ return new Promise(res=>{ const w=$('#confirmWrap'); $('#confirmMsg').textContent=msg; $('#confirmYes').textContent=okLabel||'Borrar'; w.classList.add('open');
  const done=v=>{ w.classList.remove('open'); $('#confirmYes').onclick=null; $('#confirmNo').onclick=null; w.onclick=null; res(v); };
  $('#confirmYes').onclick=()=>done(true); $('#confirmNo').onclick=()=>done(false); w.onclick=ev=>{ if(ev.target===w) done(false); }; }); }
const ICONS = {
  clase:'<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2.5 3.5h5a2 2 0 0 1 2 2v8a1.5 1.5 0 0 0-1.5-1.5h-5.5z"/><path d="M13.5 3.5h-5a2 2 0 0 0-2 2v8a1.5 1.5 0 0 1 1.5-1.5h5.5z"/></svg>',
  lab:'<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2h4M7 2v4.5L3.2 12.6A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.3-2.4L9 6.5V2"/><path d="M5 11h6"/></svg>',
  estudio:'<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 13l1-4 7.5-7.5a1.4 1.4 0 0 1 2 2L6 11z"/><path d="M10 3l3 3"/></svg>',
  entrega:'<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3.5 14V2.5h8l-1.5 3 1.5 3h-8"/></svg>',
  examen:'<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="2" width="10" height="12" rx="1.5"/><path d="M5.5 6h5M5.5 9h5M5.5 12h3"/></svg>',
  practicas:'<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="12" height="9" rx="1.5"/><path d="M6 5V3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V5M2 9h12"/></svg>',
  cita:'<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>',
  personal:'<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="5.5" r="2.5"/><path d="M3 14a5 5 0 0 1 10 0"/></svg>',
  bloqueo:'<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6"/><path d="M4 4l8 8"/></svg>',
  lock:'<svg class="lockic" viewBox="0 0 16 16" fill="currentColor"><path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z"/></svg>',
};

// ================= store =================
const S = { settings:{...C.DEFAULT_SETTINGS}, subjects:{}, types:{}, classes:{}, events:{}, tasks:{}, dayrules:{}, rules:{}, chat:{}, log:{} };
const COLLS = ['subjects','types','classes','events','tasks','dayrules','rules','chat','log'];
let db=null, localMode=false;
const local = { read(){ try{ return JSON.parse(localStorage.getItem('agenda')||'{}'); }catch{ return {}; } }, write(o){ try{ localStorage.setItem('agenda',JSON.stringify(o)); }catch{} } };
function applyLocal(){ const o=local.read(); for(const c of COLLS) S[c]=o[c]||{}; S.settings={...C.DEFAULT_SETTINGS,...(o.settings||{})}; render(); }
// registro de cambios para "Deshacer": cada operación de usuario/chat agrupa sus cambios en un lote
let batch=null;
function beginBatch(source){ batch={source,changes:[],ts:new Date().toISOString()}; }
function endBatch(summary){ const b=batch; batch=null; if(!b||!b.changes.length) return null; return {...b,summary}; }
function record(coll,id,before,after){ if(batch&&coll!=='chat'&&coll!=='log') batch.changes.push({coll,id,before:before?{...before}:null,after:after?{...after}:null}); }
async function save(coll,id,data){
  const before = coll==='settings'?S.settings:(S[coll]||{})[id];
  const clean={...data}; delete clean.kind_; if(coll!=='settings') clean.id=id;
  if(coll==='events'&&!clean.createdAt) clean.createdAt=iso(new Date());
  record(coll,id,before,clean);
  if(db){ try{ await db.doc(`${coll}/${id}`).set(clean); if(coll==='settings') S.settings={...C.DEFAULT_SETTINGS,...clean}; else S[coll][id]=clean; render(); }catch(e){ toast('No se pudo guardar: '+(e.message||e.code)); throw e; } }
  else { const o=local.read(); if(coll==='settings'){o.settings=clean;} else {(o[coll]=o[coll]||{})[id]=clean;} local.write(o); applyLocal(); }
}
async function remove(coll,id){
  const before=(S[coll]||{})[id]; if(!before) return; record(coll,id,before,null);
  if(db){ try{ await db.doc(`${coll}/${id}`).delete(); delete S[coll][id]; render(); }catch(e){ toast('No se pudo borrar: '+(e.message||e.code)); throw e; } }
  else { const o=local.read(); if(o[coll]) delete o[coll][id]; local.write(o); applyLocal(); }
}
async function writeLog(entry){ if(!entry) return null; const id=uid(); const rec={id,ts:entry.ts,source:entry.source,summary:entry.summary||'',changes:entry.changes.slice(0,80),undone:false}; await save('log',id,rec); const all=Object.values(S.log).sort((a,b)=>a.ts<b.ts?-1:1); if(all.length>40) for(const l of all.slice(0,all.length-40)) await remove('log',l.id); return id; }
async function undoLog(id){ const l=S.log[id]; if(!l||l.undone) return; const prev=batch; batch=null;
  for(const ch of [...l.changes].reverse()){ if(ch.before) await save(ch.coll,ch.id,ch.before); else await remove(ch.coll,ch.id); }
  await save('log',id,{...l,undone:true}); batch=prev; toast('Deshecho'); }
function describeChanges(changes){ const out=[]; for(const ch of changes){ const x=ch.after||ch.before; const del=!ch.after;
    if(ch.coll==='events'){ const e={...x,kind:'event'}; out.push({c:C.colorOf(S,e),t:`${del?'Quitado':ch.before?'Cambiado':'Añadido'}: ${C.labelOf(S,e)} · ${fmtDate(e.start)} ${e.start.slice(11)}–${e.end.slice(11)}`,del}); }
    else if(ch.coll==='tasks'){ out.push({c:x.subjectId&&S.subjects[x.subjectId]?S.subjects[x.subjectId].color:null,t:`${del?'Tarea borrada':ch.before?'Tarea actualizada':'Tarea nueva'}: ${x.title}${x.done&&!(ch.before&&ch.before.done)?' (terminada)':''}`,del}); }
    else if(ch.coll==='rules'){ out.push({t:`${del?'Indicación quitada':'Indicación'}: ${C.ruleText(S,x)}`,del}); }
    else if(ch.coll==='dayrules'){ out.push({t:`${ch.id}: ${del?'sin condición':RULES_DAY[x.mode]}`,del}); }
    else if(ch.coll==='classes'){ out.push({t:`Clase ${x.title||C.shortOf(S,x.subjectId)}: ${(x.skip||[]).length!==((ch.before||{}).skip||[]).length?'día saltado':'actualizada'}`,del}); }
    else out.push({t:`${ch.coll}/${ch.id} ${del?'borrado':'guardado'}`,del}); }
  return out; }
// ---- acceso (Supabase Auth) y conexión a la base de datos
const DB = window.AgendaDB;
let userEmail='';
function showAuth(on){ $('#auth').classList.toggle('open',!!on); if(on) setTimeout(()=>$('#aEmail').focus(),50); }
$('#authForm').onsubmit=async ev=>{ ev.preventDefault(); const b=$('#aGo'); b.disabled=true; $('#aErr').textContent='';
  const { error } = await DB.signIn($('#aEmail').value.trim(), $('#aPass').value);
  b.disabled=false; if(error){ $('#aErr').textContent = /invalid/i.test(error.message)?'Correo o contraseña incorrectos':error.message; return; }
  $('#aPass').value=''; };
$('#aDemo').onclick=()=>{ try{ localStorage.setItem('agendaDemo','1'); }catch{} connect(); };
$('#aForgot').onclick=async ev=>{ ev.preventDefault(); const email=$('#aEmail').value.trim(); if(!email){ $('#aErr').textContent='Escribe tu correo y vuelve a pulsar'; $('#aEmail').focus(); return; } const {error}=await DB.resetPassword(email); $('#aErr').textContent=error?error.message:'Te hemos enviado un enlace al correo'; };
function setLang(l){ I18N.set(l); location.reload(); }
function seedDemo(){ const o=local.read(); if(o.subjects&&Object.keys(o.subjects).length) return; const ds=dstr(new Date()); const monday=dstr(startOfWeek(new Date())); const nextMon=dstr(addDays(startOfWeek(new Date()),7));
  const subjects={alg:{id:'alg',name:I18N.lang==='en'?'Linear algebra':'Álgebra lineal',short:I18N.lang==='en'?'Algebra':'Álgebra',color:'#009dff',order:1},fis:{id:'fis',name:I18N.lang==='en'?'Physics':'Física',short:I18N.lang==='en'?'Physics':'Física',color:'#E8731A',order:2},pro:{id:'pro',name:I18N.lang==='en'?'Programming':'Programación',short:I18N.lang==='en'?'Programming':'Programación',color:'#0F9B8E',order:3}};
  const types={clase:{id:'clase',name:I18N.lang==='en'?'Class':'Clase',color:'#6B7188',order:1,style:'clase'},laboratorio:{id:'laboratorio',name:I18N.lang==='en'?'Lab':'Laboratorio',color:'#6B7188',order:2,style:'lab'},estudio:{id:'estudio',name:I18N.lang==='en'?'Study block':'Bloque de estudio',color:'#7270e1',order:3,style:'estudio'},entrega:{id:'entrega',name:I18N.lang==='en'?'Deliverable':'Entrega',color:'#D93B47',order:4,style:'entrega'},examen:{id:'examen',name:I18N.lang==='en'?'Exam':'Examen',color:'#ff7300',order:5,style:'examen'},practicas:{id:'practicas',name:I18N.lang==='en'?'Work':'Trabajo',color:'#5900ff',order:6,style:'practicas'},cita:{id:'cita',name:I18N.lang==='en'?'Appointment':'Cita',color:'#b0d0e8',order:7,style:'cita'},personal:{id:'personal',name:'Personal',color:'#7e4e97',order:8,style:'personal'},bloqueo:{id:'bloqueo',name:I18N.lang==='en'?'Unavailable':'No disponible',color:'#707070',order:9,style:'bloqueo'}};
  const classes={c1:{id:'c1',dow:1,start:'09:00',end:'10:50',subjectId:'alg',typeId:'clase',room:'A-101',from:monday,until:dstr(addDays(new Date(),120)),skip:[]},c2:{id:'c2',dow:2,start:'11:00',end:'12:50',subjectId:'fis',typeId:'clase',room:'B-204',from:monday,until:dstr(addDays(new Date(),120)),skip:[]},c3:{id:'c3',dow:3,start:'15:00',end:'16:50',subjectId:'pro',typeId:'laboratorio',room:'Lab 2',from:monday,until:dstr(addDays(new Date(),120)),skip:[]},c4:{id:'c4',dow:4,start:'09:00',end:'10:50',subjectId:'pro',typeId:'clase',room:'A-101',from:monday,until:dstr(addDays(new Date(),120)),skip:[]}};
  const tasks={t1:{id:'t1',kind:'task',title:I18N.lang==='en'?'Assignment 2':'Práctica 2',subjectId:'pro',typeId:'entrega',due:nextMon+'T23:59',estimateMin:180,priority:2,notes:'',done:false,progress:0,sections:[],checklist:[],createdAt:iso(new Date())},t2:{id:'t2',kind:'exam',title:I18N.lang==='en'?'Midterm':'Parcial',subjectId:'alg',typeId:'examen',due:dstr(addDays(new Date(),12))+'T10:00',priority:2,notes:'',done:false,progress:0,estimateMin:420,sections:[{id:'s1',name:I18N.lang==='en'?'Theory':'Teoría',estimateMin:180,progress:0,review:false},{id:'s2',name:I18N.lang==='en'?'Exercises':'Ejercicios',estimateMin:180,progress:0,review:false},{id:'s3',name:I18N.lang==='en'?'Review':'Repaso',estimateMin:60,progress:0,review:true}],checklist:[],createdAt:iso(new Date())}};
  local.write({subjects,types,classes,tasks,events:{},dayrules:{},rules:{},chat:{},log:{},settings:{...C.DEFAULT_SETTINGS}}); }
async function connect(){
  const dot=$('#syncdot');
  let demo=false; try{ demo=localStorage.getItem('agendaDemo')==='1'; }catch{}
  const cfg=window.AGENDA_CONFIG||{}; if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY) demo=true;
  if(demo){ localMode=true; showAuth(false); seedDemo(); dot.classList.add('local'); dot.title='Guardando solo en este navegador'; applyLocal(); autoReady=true; autoPlan(true); return; }
  const sess = await DB.session();
  const fromLink=/type=(invite|recovery|magiclink)/.test(location.hash||'');
  if(!sess){ if(fromLink) sessionStorage.setItem('needPw','1'); showAuth(true); DB.onAuth(s=>{ if(s&&!db) connect(); }); return; }
  showAuth(false); userEmail=sess.user.email||'';
  // llegada desde un enlace de invitación o de recuperación: pedir contraseña nueva
  if(fromLink||sessionStorage.getItem('needPw')){ sessionStorage.removeItem('needPw'); history.replaceState(null,'',location.pathname); setTimeout(()=>{ setView('settings'); toast('Pon tu contraseña en «Cuenta» para entrar la próxima vez'); const el=$('#pw1'); if(el){ el.scrollIntoView({block:'center'}); el.focus(); } },400); }
  DB.onAuth(s=>{ if(!s){ db=null; location.reload(); } });
  DB.onStatus(ok=>{ dot.classList.toggle('on',ok); dot.classList.toggle('local',!ok); dot.title=ok?'Sincronizado':'Reconectando…'; $('#offline').classList.toggle('show',!ok&&navigator.onLine===false); });
  try{ await DB.start(); }catch(e){ toast('No se pudo cargar la agenda: '+(e.message||e)); dot.classList.add('local'); return; }
  db=DB; dot.classList.add('on'); dot.title='Sincronizado';
  const seen=new Set(); const ready=c=>{ seen.add(c); if(seen.size>=COLLS.length+1&&!autoReady){ autoReady=true; autoPlan(true); } };
  for(const c of COLLS){ db.collection(c).onSnapshot(snap=>{ const o={}; snap.docs.forEach(d=>o[d.id]={id:d.id,...d.data()}); S[c]=o; ready(c); render(); }); }
  db.doc('settings/main').onSnapshot(snap=>{ S.settings={...C.DEFAULT_SETTINGS,...(snap.exists?snap.data():{})}; ready('settings'); render(); });
  window.addEventListener('online',()=>$('#offline').classList.remove('show'));
  window.addEventListener('offline',()=>$('#offline').classList.add('show'));
}
// atajos al núcleo con el estado actual
const now = () => new Date();
const nowIso = () => iso(new Date());
const colorOf = x => C.colorOf(S,x), labelOf = x => C.labelOf(S,x), styleOf = x => C.styleOf(S,x.typeId||(x.kind==='class'?'clase':'')), subj = id => S.subjects[id];
const itemsOn = d => C.itemsOn(S,d), travelOn = d => C.travelOn(S,d), ruleOf = ds => C.ruleOf(S,ds), isExam = C.isExam;
const remainingOf = t => C.remainingOf(S,t,nowIso()), plannedFuture = (tid,sid) => C.plannedFuture(S,tid,sid,nowIso()), progressOf = t => C.progressOf(S,t,nowIso()), estimateOf = C.estimateOf;

// ================= planificación automática =================
let planning=false, planTimer=null, autoReady=false, lastUnfit='';
function schedulePlan(){ if(!autoReady) return; clearTimeout(planTimer); planTimer=setTimeout(()=>autoPlan(),900); }
async function applyPlan(plan){ for(const id of plan.removeIds) await remove('events',id);
  const existing=new Set(Object.values(S.events).filter(e=>e.taskId).map(e=>`${e.taskId}|${e.sectionId||''}|${e.start}|${e.end}`));
  for(const b of plan.add){ const k=`${b.taskId}|${b.sectionId||''}|${b.start}|${b.end}`; if(existing.has(k)) continue; existing.add(k); await save('events',b.id,b); } }
async function autoPlan(silent, opts={}){
  if(planning||!autoReady) return null;
  planning=true; const prev=batch; if(!batch) batch=null;
  try{
    const n=now(); const nIso=iso(n);
    for(const e of Object.values(S.events)) if(e.taskId&&(!S.tasks[e.taskId]||(S.tasks[e.taskId].done&&!e.done&&e.start>=nIso))) await remove('events',e.id);
    for(const r of Object.values(S.rules)) if(r.active!==false&&C.ruleExpired(S,r,n)) await save('rules',r.id,{...r,active:false,expiredAt:nIso});
    const plan=C.computePlan(S,n,opts);
    if(plan.add.length||plan.removeIds.length){ await applyPlan(plan); if(!silent&&(plan.add.length>1||plan.removeIds.length>1)) toast(`Agenda ajustada · ${plan.add.length} bloque${plan.add.length===1?'':'s'}`); }
    if(plan.displaced.length&&!silent) toast('Recolocado por conflicto: '+plan.displaced.map(d=>d.title).join(', '));
    const u=plan.unfit.map(x=>`${x.taskId}:${x.remaining}`).join(',');
    if(u&&u!==lastUnfit&&!silent) toast('No cabe todo: '+plan.unfit.map(x=>`${x.title} (${fmtDur(x.remaining)})`).join(', '));
    lastUnfit=u; return plan;
  } finally { planning=false; batch=prev; renderBanner(); }
}

// ================= estado y navegación =================
let view = (localStorage.getItem('view')||(window.innerWidth<900?'today':'week')); let cursor=new Date(); cursor.setHours(0,0,0,0);
let taskTab='tasks', taskFilter=null;
function setView(v){ view=v; try{ localStorage.setItem('view',v); }catch{}
  $$('.nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v)); $$('.view').forEach(s=>s.classList.toggle('active',s.id==='view-'+v)); render(); if(v==='week') requestAnimationFrame(scrollToNow); }
$$('.nav button[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#themeBtn').onclick=()=>{ const r=document.documentElement; const cur=r.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); r.dataset.theme=cur==='dark'?'light':'dark'; try{ localStorage.setItem('theme',r.dataset.theme); }catch{} };
try{ const th=localStorage.getItem('theme'); if(th) document.documentElement.dataset.theme=th; }catch{}
$('#prev').onclick=()=>{ cursor = view==='month'? new Date(cursor.getFullYear(),cursor.getMonth()-1,1) : view==='today'? addDays(cursor,-1) : addDays(cursor,-7); render(); };
$('#next').onclick=()=>{ cursor = view==='month'? new Date(cursor.getFullYear(),cursor.getMonth()+1,1) : view==='today'? addDays(cursor,1) : addDays(cursor,7); render(); };
$('#today').onclick=()=>{ cursor=new Date(); cursor.setHours(0,0,0,0); render(); scrollToNow(); };
$('#add').onclick=()=>openEventEditor({});
document.addEventListener('keydown',ev=>{ if(ev.target.matches('input,textarea,select')||$('#modal').classList.contains('open')) return; if(ev.key==='n'){ openEventEditor({}); } if(ev.key==='t'){ $('#today').click(); } if(ev.key==='ArrowLeft'){ $('#prev').click(); } if(ev.key==='ArrowRight'){ $('#next').click(); } if(ev.key==='1') setView('today'); if(ev.key==='2') setView('week'); if(ev.key==='3') setView('month'); if(ev.key==='4') setView('tasks'); });

function render(){
  const t=$('#title');
  if(view==='today'){ const isT=sameDay(cursor,new Date()); t.innerHTML = `<em>${isT?'Hoy':DOWL[cursor.getDay()]}</em> ${cursor.getDate()} de ${MON[cursor.getMonth()]}`; renderToday(); }
  else if(view==='week'){ const a=startOfWeek(cursor), b=addDays(a,6); const wk=Math.ceil((((a-new Date(a.getFullYear(),0,1))/86400000)+new Date(a.getFullYear(),0,1).getDay()+1)/7); t.innerHTML = (a.getMonth()===b.getMonth() ? `<em>${MON[a.getMonth()]}</em> ${a.getDate()}–${b.getDate()}` : `<em>${MON[a.getMonth()].slice(0,3)}–${MON[b.getMonth()].slice(0,3)}</em> ${a.getDate()}–${b.getDate()}`)+`<small>semana ${wk}</small>`; renderWeek(); }
  else if(view==='month'){ t.innerHTML=`<em>${MON[cursor.getMonth()]}</em> ${cursor.getFullYear()}`; renderMonth(); }
  else if(view==='tasks'){ t.innerHTML='<em>Tareas</em>'; renderTasks(); }
  else { t.innerHTML='<em>Ajustes</em>'; renderSettings(); }
  $('#pracBtn').hidden = !(view==='week'||view==='today'); $('#pracBtn').textContent=workName();
  renderBanner(); schedulePlan();
}
function renderBanner(){ const b=$('#banner'); const ws=C.warnings(S,now()); const hide=sessionStorage.getItem('bannerHide');
  if(!ws.length||hide===ws.map(w=>w.taskId).join()){ b.hidden=true; return; }
  const soon=ws.filter(w=>w.kind==='soon'), over=ws.filter(w=>w.kind==='overdue');
  b.hidden=false; b.innerHTML=`<b>Atención</b> <span>${[soon.length?`vence en menos de ${S.settings.warnHours||48} h sin tiempo suficiente planificado: ${soon.map(w=>`<u data-task="${w.taskId}" style="cursor:pointer">${esc(w.title)}</u> (faltan ${fmtDur(w.missing)})`).join(', ')}`:'', over.length?`atrasadas sin terminar: ${over.map(w=>`<u data-task="${w.taskId}" style="cursor:pointer">${esc(w.title)}</u>`).join(', ')}`:''].filter(Boolean).join(' · ')}</span><button class="btn sm ghost x" id="bannerX">Ocultar</button>`;
  b.querySelectorAll('[data-task]').forEach(u=>u.onclick=()=>openTaskEditor({id:u.dataset.task})); b.querySelector('#bannerX').onclick=()=>{ sessionStorage.setItem('bannerHide',ws.map(w=>w.taskId).join()); b.hidden=true; }; }

// ================= marcar bloques =================
async function markBlock(id, how, frac){ const e=S.events[id]; if(!e||!e.taskId) return; beginBatch('ui');
  const u={...e}; if(how==='done'){ u.done=true; u.skipped=false; u.doneFrac=1; } else if(how==='part'){ u.done=true; u.skipped=false; u.doneFrac=Math.max(0,Math.min(1,frac)); } else if(how==='skip'){ u.done=false; u.skipped=true; delete u.doneFrac; } else { u.done=false; u.skipped=false; delete u.doneFrac; }
  await save('events',id,u); const t=S.tasks[e.taskId]; if(t&&!t.done&&remainingOf(t)<=0&&how!=='skip'){ if(await askConfirm(`¿Dar por terminada «${t.title}»?`,'Terminar')) await save('tasks',t.id,{...t,done:true}); }
  await writeLog(endBatch(how==='done'?'Bloque hecho':how==='skip'?'Bloque no hecho':'Bloque a medias')); toast(how==='done'?'Hecho':how==='skip'?'Anotado: no lo hiciste; se recoloca':'Anotado'); }
function openPartialPop(anchor,id){ const e=S.events[id]; const d=durOf(e); closePop(); const r=anchor.getBoundingClientRect(); const pop=document.createElement('div'); pop.className='pop'; pop.innerHTML=`<h4>¿Cuánto hiciste de ${esc(labelOf({...e,kind:'event'}))}?</h4><input type="range" id="pfr" min="0" max="100" step="5" value="50"><div class="hint" id="pfl" style="margin-top:4px">50% · ${fmtDur(d/2)}</div><div class="actions" style="margin-top:10px"><span class="spacer"></span><button class="btn sm" id="pfc">Cancelar</button><button class="btn sm primary" id="pfo">Guardar</button></div>`;
  $('#popWrap').appendChild(pop); const W=300; pop.style.left=Math.max(8,Math.min(window.innerWidth-W-8,r.left))+'px'; pop.style.top=Math.min(window.innerHeight-170,r.bottom+6)+'px';
  pop.querySelector('#pfr').oninput=ev=>{ pop.querySelector('#pfl').textContent=`${ev.target.value}% · ${fmtDur(d*ev.target.value/100)}`; };
  pop.querySelector('#pfc').onclick=closePop; pop.querySelector('#pfo').onclick=()=>{ markBlock(id,'part',+pop.querySelector('#pfr').value/100); closePop(); }; }
function closePop(){ $('#popWrap').innerHTML=''; }
document.addEventListener('pointerdown',ev=>{ if($('#popWrap').children.length&&!ev.target.closest('.pop')&&!ev.target.closest('.qa,.qa2')) closePop(); });
const qaHtml = e => (e.taskId&&!e.done&&!e.skipped&&e.start<=iso(new Date(Date.now()+60*60000))) ? `<div class="qa"><button data-qa="done" data-id="${e.id}" title="Hecho">✓</button><button data-qa="part" data-id="${e.id}" title="A medias">½</button><button data-qa="skip" data-id="${e.id}" title="No lo hice">✗</button></div>` : (e.taskId&&(e.done||e.skipped)?`<div class="qa"><button data-qa="reset" data-id="${e.id}" title="Deshacer marca">↺</button></div>`:'');
function bindQa(root){ root.querySelectorAll('[data-qa]').forEach(b=>{ b.onpointerdown=ev=>ev.stopPropagation(); b.onclick=ev=>{ ev.stopPropagation(); const how=b.dataset.qa; if(how==='part') openPartialPop(b,b.dataset.id); else markBlock(b.dataset.id,how); }; }); }

// ================= HOY =================
function renderToday(){
  const d=cursor, ds=dstr(d), n=now(), isT=sameDay(d,n); const items=itemsOn(d); const rule=ruleOf(ds); const nowM=n.getHours()*60+n.getMinutes();
  const study=items.filter(e=>e.taskId&&!e.skipped).reduce((a,e)=>a+durOf(e),0);
  let h=`<h2><em>${DOWL[d.getDay()]}</em> ${d.getDate()} de ${MON[d.getMonth()]}</h2><div class="sub"><span>${items.length?`${items.length} cosas`:'Nada en el calendario'}${study?` · ${fmtDur(study)} de estudio`:''}</span>${rule?`<span class="rulechip ${rule}">${RULES_DAY[rule]}</span>`:''}<button class="btn sm ghost" id="tdRule">Condición del día</button></div>`;
  h+='<div class="tl">';
  if(!items.length) h+='<div class="empty">Día vacío. Pulsa “+ Nuevo” o dibuja un hueco en la semana.</div>';
  let prevEnd=null;
  for(const e of items){
    const s=e.allDay?0:mins(e.start.slice(11)), en=e.allDay?0:mins(e.end.slice(11));
    if(prevEnd!==null&&!e.allDay&&s-prevEnd>=45) h+=`<div class="gap">${fmtDur(s-prevEnd)} libres</div>`;
    const st = e.allDay?'':(isT&&nowM>=s&&nowM<en?'now':(isT&&nowM>=en?'past':''));
    const sty=styleOf(e);
    h+=`<div class="it ${st} s-${sty} ${e.locked?'locked':''}" style="--c:${colorOf(e)}" data-id="${e.id}" data-kind="${e.kind}"><div class="tm">${e.allDay?'Todo el día':e.start.slice(11)+'–'+e.end.slice(11)}</div><div><div class="nm">${ICONS[sty]||''}${esc(labelOf(e))}${e.done?' ✓':''}${e.skipped?' (no hecho)':''}</div>${e.location?`<div class="lo">${esc(e.location)}</div>`:''}</div>${e.taskId&&!e.done&&!e.skipped?`<div class="qa2"><button data-qa="done" data-id="${e.id}" title="Hecho">✓</button><button data-qa="part" data-id="${e.id}" title="A medias">½</button><button data-qa="skip" data-id="${e.id}" title="No lo hice">✗</button></div>`:(e.taskId?`<div class="qa2"><button data-qa="reset" data-id="${e.id}" title="Deshacer marca">↺</button></div>`:'<span></span>')}</div>`;
    if(!e.allDay) prevEnd=en;
  }
  h+='</div>';
  const weekEnd=iso(addDays(startOfWeek(n),7)); const nI=iso(n);
  const due=Object.values(S.tasks).filter(t=>!t.done&&t.due&&t.due<weekEnd).sort((a,b)=>a.due<b.due?-1:1);
  if(due.length){ h+=`<div class="sec-h">Vence esta semana <small>${due.length}</small></div>`; for(const t of due) h+=taskRow(t,nI); }
  const soon=Object.values(S.tasks).filter(t=>!t.done&&t.due&&t.due>=weekEnd).sort((a,b)=>a.due<b.due?-1:1).slice(0,5);
  if(soon.length){ h+=`<div class="sec-h">Después</div>`; for(const t of soon) h+=taskRow(t,nI); }
  const el=$('#todayv'); el.innerHTML=h;
  $('#tdRule').onclick=()=>openRuleEditor(ds);
  el.querySelectorAll('.it').forEach(x=>x.onclick=ev=>{ if(ev.target.closest('[data-qa]')) return; x.dataset.kind==='class'?openClassOccurrence(x.dataset.id):openEventEditor({id:x.dataset.id}); });
  bindQa(el); bindTaskRows(el);
}
function taskRow(t,nI){
  const pct=progressOf(t), rem=remainingOf(t), pl=plannedFuture(t.id); const under=!t.done&&pl<rem-15; const sb=subj(t.subjectId);
  return `<div class="task ${t.done?'done':''} ${!t.done&&t.due&&t.due<nI?'overdue':''}" data-id="${t.id}" style="--c:${sb?sb.color:'var(--ink)'}"><div class="cb" data-toggle="${t.id}">${t.done?'✓':''}</div>
    <div><div class="tt">${isExam(t)?ICONS.examen:''}${esc(t.title)}${sb?` <span class="tag" style="--c:${sb.color}">${esc(sb.short||sb.name)}</span>`:''}</div><div class="sub">${t.due?`<span class="dued">${t.due<nI?'Venció':'Vence'} ${fmtDate(t.due)} ${t.due.slice(11)}</span>`:'<span>Sin fecha</span>'}<span>${fmtDur(estimateOf(t))}</span>${t.priority>1?`<span style="color:var(--${t.priority===3?'danger':'warn'});font-weight:600">${t.priority===3?'Urgente':'Alta'}</span>`:''}</div></div>
    <div class="prog ${under&&t.due?'warnp':''}">${t.done?'Hecha':(pct>=100?`<button class="btn sm primary" data-finish="${t.id}">¿Terminada? Sí</button>`:`${pct}% · faltan ${fmtDur(rem)}${rem>0?` · ${fmtDur(pl)} plan.`:''}${under&&t.due&&rem>0?' ⚠':''}`)}<div class="bar"><i style="width:${pct}%"></i></div></div></div>`;
}
function bindTaskRows(root){ root.querySelectorAll('.task').forEach(el=>el.onclick=ev=>{ if(ev.target.dataset.toggle){ toggleDone(ev.target.dataset.toggle); return; } if(ev.target.dataset.finish){ toggleDone(ev.target.dataset.finish); return; } openTaskEditor({id:el.dataset.id}); }); }
async function toggleDone(id){ const t=S.tasks[id]; beginBatch('ui'); await save('tasks',id,{...t,done:!t.done}); if(!t.done){ for(const e of Object.values(S.events).filter(e=>e.taskId===id&&!e.done&&e.start>=nowIso())) await remove('events',e.id); } await writeLog(endBatch(t.done?'Tarea reabierta':'Tarea terminada')); }
async function deleteTask(id){ const t=S.tasks[id]; if(!t) return; beginBatch('ui'); await remove('tasks',id); for(const e of Object.values(S.events).filter(e=>e.taskId===id)) await remove('events',e.id); if(t.examEventId&&S.events[t.examEventId]) await save('events',t.examEventId,{...S.events[t.examEventId],examTaskId:null}); for(const r of Object.values(S.rules)) if(r.taskId===id||r.beforeTaskId===id||r.afterTaskId===id) await remove('rules',r.id); await writeLog(endBatch('Tarea borrada')); }

// ================= SEMANA =================
const HH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hh'));
let scrolledOnce=false;
function renderWeek(){
  const a=startOfWeek(cursor), today=new Date(), gs=S.settings.gridStart, ge=S.settings.gridEnd, hh=HH(); const nI=iso(today);
  const head=$('#wkhead'), all=$('#allday'), grid=$('#wkgrid');
  let h='<div></div>', al='<div></div>', g=`<div class="tcolumn" style="height:${(ge-gs)*hh}px">`;
  for(let k=gs+1;k<ge;k++) g+=`<div class="tlabel" style="top:${(k-gs)*hh}px">${pad(k)}:00</div>`;
  g+='</div>';
  const warnIds=new Set(C.warnings(S,today).map(w=>w.taskId));
  for(let i=0;i<7;i++){
    const d=addDays(a,i), ds=dstr(d), isT=sameDay(d,today), wk=i>=5, rule=ruleOf(ds);
    const dues=C.tasksDueOn(S,d).filter(t=>!t.done);
    h+=`<div class="dayh ${isT?'today':''}" data-ds="${ds}" title="Condición del día"><div class="dn">${DOW[d.getDay()]}</div><div class="dd">${d.getDate()}</div>${rule?`<div><span class="rulechip ${rule}">${RULES_DAY[rule]}</span></div>`:''}<div class="due">${dues.map(t=>`<div class="due-chip ${warnIds.has(t.id)?'warn':''}" style="--c:${colorOf(t)}" data-task="${t.id}" title="${isExam(t)?'Examen':'Entrega'}: ${esc(t.title)} · ${t.due.slice(11)}">${isExam(t)?ICONS.examen:ICONS.entrega}${esc(t.title)}</div>`).join('')}</div></div>`;
    const items=itemsOn(d);
    al+=`<div class="cell">${items.filter(e=>e.allDay).map(e=>`<div class="chip" style="--c:${colorOf(e)}" data-ev="${e.id}">${esc(labelOf(e))}</div>`).join('')}</div>`;
    const [a0m,a1m]=C.windowsFor(S,d,false); const a0=(a0m/60-gs)*hh, a1=(a1m/60-gs)*hh;
    g+=`<div class="daycol ${wk?'weekend':''} ${isT?'today':''} ${rule==='free'?'free':''}" data-date="${ds}" style="height:${(ge-gs)*hh}px">`;
    g+=`<div class="avail" style="top:0;height:${Math.max(0,a0)}px"></div><div class="avail" style="top:${a1}px;bottom:0"></div>`;
    for(const [t0,t1] of travelOn(d)) g+=`<div class="travel" style="top:${(t0/60-gs)*hh}px;height:${(t1-t0)/60*hh}px" title="Desplazamiento (${t1-t0} min)"></div>`;
    const timed=items.filter(e=>!e.allDay); const cols=layoutColumns(timed);
    for(const e of timed){
      const s=parse(e.start), en=parse(e.end); const top=((s.getHours()+s.getMinutes()/60)-gs)*hh, ht=Math.max(20,((en-s)/3600000)*hh);
      const L=cols.get(e.id); const w=100/L.n, left=L.i*w; const sty=styleOf(e);
      const cls=`s-${sty} ${e.taskId&&e.auto&&!e.locked?'auto':''} ${e.done?'done':''} ${e.skipped?'skipped':''} ${e.taskId&&e.end<nI&&!e.done?'past':''}`;
      const frac=e.done&&e.doneFrac!=null?e.doneFrac:(e.done?1:0);
      g+=`<div class="ev ${cls}" style="--c:${colorOf(e)};top:${top}px;height:${ht-2}px;left:calc(${left}% + 2px);width:calc(${w}% - 5px)" data-id="${e.id}" data-kind="${e.kind}" title="${esc(labelOf(e))} · ${e.start.slice(11)}–${e.end.slice(11)}${e.location?' · '+esc(e.location):''}${e.locked?' · fijado':''}">
        <div class="t">${ICONS[sty]||''}<span>${esc(labelOf(e))}</span></div><div class="m">${e.start.slice(11)}–${e.end.slice(11)}${e.location?' · '+esc(e.location):''}</div>${frac?`<div class="prog" style="width:${frac*100}%"></div>`:''}${e.locked&&e.taskId?ICONS.lock:''}${qaHtml(e)}${e.kind==='event'?'<div class="rs"></div>':''}</div>`;
    }
    if(isT){ const m=today.getHours()*60+today.getMinutes(); g+=`<div class="nowline" style="top:${(m/60-gs)*hh}px"></div>`; }
    g+='</div>';
  }
  head.innerHTML=h; all.innerHTML=al; grid.innerHTML=g;
  all.style.display = Object.values(S.events).some(e=>e.allDay) ? '' : 'none';
  head.querySelectorAll('.dayh').forEach(c=>c.onclick=ev=>{ const t=ev.target.closest('[data-task]'); if(t){ openTaskEditor({id:t.dataset.task}); return; } openRuleEditor(c.dataset.ds); });
  all.querySelectorAll('.chip').forEach(c=>c.onclick=()=>openEventEditor({id:c.dataset.ev}));
  bindDrag(grid); bindQa(grid);
  if(!scrolledOnce){ scrolledOnce=true; scrollToNow(); }
}
function scrollToNow(){ const hh=HH(), gs=S.settings.gridStart; const n=new Date(); const sc=$('#wkscroll'); if(sc) sc.scrollTop=Math.max(0,(n.getHours()-gs-1.5)*hh); }
function layoutColumns(items){
  const sorted=[...items].sort((a,b)=>a.start<b.start?-1:a.start>b.start?1:0); const res=new Map(); let cluster=[], clusterEnd=null;
  const flush=()=>{ const lanes=[]; for(const e of cluster){ let li=lanes.findIndex(l=>l<=e.start); if(li<0){li=lanes.length;lanes.push(e.end);} else lanes[li]=e.end; res.set(e.id,{i:li,n:0}); } for(const e of cluster) res.get(e.id).n=lanes.length; cluster=[]; clusterEnd=null; };
  for(const e of sorted){ if(clusterEnd&&e.start>=clusterEnd) flush(); cluster.push(e); if(!clusterEnd||e.end>clusterEnd) clusterEnd=e.end; }
  if(cluster.length) flush(); return res;
}
function bindDrag(grid){
  const hh=HH(), gs=S.settings.gridStart, snap=15;
  grid.querySelectorAll('.ev').forEach(el=>{
    const id=el.dataset.id, kind=el.dataset.kind;
    if(kind!=='event'){ el.onclick=()=>openClassOccurrence(id); return; }
    let mode=null, sx=0, sy=0, moved=false, orig=null, dayEls=null;
    el.addEventListener('pointerdown',ev=>{ if(ev.button!==0||ev.target.closest('.qa')) return; mode = ev.target.classList.contains('rs') ? 'resize' : 'move'; sx=ev.clientX; sy=ev.clientY; moved=false; orig={...S.events[id]}; dayEls=[...grid.querySelectorAll('.daycol')]; el.setPointerCapture(ev.pointerId); ev.preventDefault(); });
    el.addEventListener('pointermove',ev=>{
      if(!mode) return; const dx=ev.clientX-sx, dy=ev.clientY-sy; if(!moved && Math.hypot(dx,dy)<5) return; moved=true; el.classList.add('dragging');
      const s=parse(orig.start), e=parse(orig.end), dur=(e-s)/60000; const dmin=Math.round((dy/hh*60)/snap)*snap;
      if(mode==='move'){
        const col=dayEls.find(c=>{ const r=c.getBoundingClientRect(); return ev.clientX>=r.left&&ev.clientX<r.right; });
        const date=col?col.dataset.date:orig.start.slice(0,10);
        let ns=parse(date+'T'+orig.start.slice(11)); ns=new Date(ns.getTime()+dmin*60000);
        const smin=ns.getHours()*60+ns.getMinutes(); if(smin<gs*60||smin+dur>S.settings.gridEnd*60) return;
        const ne=new Date(ns.getTime()+dur*60000);
        el.dataset.ns=iso(ns); el.dataset.ne=iso(ne);
        if(col&&col!==el.parentElement) col.appendChild(el);
        el.style.top=((ns.getHours()+ns.getMinutes()/60)-gs)*hh+'px'; el.querySelector('.m').textContent=`${tstr(ns)}–${tstr(ne)}`;
      } else {
        const nd=Math.max(15,dur+dmin); const ne=new Date(s.getTime()+nd*60000); if(!sameDay(ne,s)&&!(ne.getHours()===0&&ne.getMinutes()===0)) return;
        el.dataset.ns=orig.start; el.dataset.ne=iso(ne); el.style.height=(nd/60*hh-2)+'px'; el.querySelector('.m').textContent=`${tstr(s)}–${tstr(ne)}`;
      }
    });
    el.addEventListener('pointerup',async()=>{
      if(!mode) return; mode=null; el.classList.remove('dragging');
      if(!moved){ openEventEditor({id}); return; }
      const ns=el.dataset.ns, ne=el.dataset.ne; if(!ns||(ns===orig.start&&ne===orig.end)){ render(); return; }
      const conf=C.conflictsOf(S,ns,ne,[id]).filter(c=>!(c.study&&c.auto&&!c.locked));
      if(conf.length){ toast('Ahí pisa: '+conf.map(c=>c.label+' '+c.start).join(', ')); render(); return; }
      beginBatch('ui'); const upd={...orig,start:ns,end:ne}; if(orig.taskId) upd.locked=true;
      await save('events',id,upd); await writeLog(endBatch('Movido a mano')); if(orig.taskId&&!orig.locked) toast('Bloque fijado: el planificador ya no lo mueve');
    });
    el.addEventListener('pointercancel',()=>{ if(mode){mode=null;render();} });
  });
  // crear arrastrando sobre el hueco
  grid.querySelectorAll('.daycol').forEach(col=>{
    let st=null, ghost=null;
    const yToMin=y=>{ const r=col.getBoundingClientRect(); return Math.max(gs*60,Math.min(S.settings.gridEnd*60,Math.round(((y-r.top)/hh*60)/15)*15+gs*60)); };
    col.addEventListener('pointerdown',ev=>{ if(ev.button!==0) return; if(ev.target!==col&&!ev.target.classList.contains('avail')&&!ev.target.classList.contains('travel')) return; st=yToMin(ev.clientY); ghost=document.createElement('div'); ghost.className='dragghost'; col.appendChild(ghost); col.setPointerCapture(ev.pointerId); upd(ev.clientY); });
    const upd=y=>{ if(st==null) return; let m=yToMin(y); let a=Math.min(st,m), b=Math.max(st,m); if(b-a<15) b=a+15; ghost.style.top=((a/60-gs)*hh)+'px'; ghost.style.height=((b-a)/60*hh)+'px'; ghost.textContent=`${tfromMins(a)}–${tfromMins(b)}`; ghost.dataset.a=a; ghost.dataset.b=b; };
    col.addEventListener('pointermove',ev=>upd(ev.clientY));
    col.addEventListener('pointerup',ev=>{ if(st==null) return; let a=+ghost.dataset.a, b=+ghost.dataset.b; if(b-a<30){ b=a+60; } const ds=col.dataset.date; ghost.remove(); ghost=null; st=null; openQuickCreate({start:`${ds}T${tfromMins(a)}`,end:`${ds}T${tfromMins(Math.min(b,23*60+59))}`},ev.clientX,ev.clientY); });
    col.addEventListener('pointercancel',()=>{ if(ghost) ghost.remove(); ghost=null; st=null; });
  });
}
// creación rápida tras dibujar un hueco
function openQuickCreate(pre,x,y){ closePop(); const pop=document.createElement('div'); pop.className='pop'; const kinds=[['bloqueo','No disponible'],['cita','Cita'],['personal','Personal'],['estudio','Bloque de estudio'],['clase','Clase']];
  pop.innerHTML=`<h4>${fmtDate(pre.start)} · ${pre.start.slice(11)}–${pre.end.slice(11)}</h4><input type="text" id="qcT" placeholder="Qué es" autofocus><div class="chips" style="margin-top:8px">${kinds.map(([k,l],i)=>`<button data-k="${k}" class="${i===0?'active':''}">${ICONS[k]||''}${l}</button>`).join('')}</div><select id="qcE" style="margin-top:8px" hidden>${examOpts('')}</select><select id="qcS" style="margin-top:8px" hidden>${subjOpts('')}</select><div class="actions" style="margin-top:10px"><button class="btn sm ghost" id="qcMore">Más opciones…</button><span class="spacer"></span><button class="btn sm" id="qcC">Cancelar</button><button class="btn sm primary" id="qcO">Guardar</button></div>`;
  $('#popWrap').appendChild(pop); const W=300,Hh=230; pop.style.left=Math.max(8,Math.min(window.innerWidth-W-8,x-W/2))+'px'; pop.style.top=Math.max(8,Math.min(window.innerHeight-Hh-8,y+8))+'px';
  let k='bloqueo'; const upd=()=>{ pop.querySelectorAll('.chips button').forEach(b=>b.classList.toggle('active',b.dataset.k===k)); const ex=pop.querySelector('#qcE'); ex.hidden=k!=='estudio'; pop.querySelector('#qcS').hidden=!(k==='clase'||(k==='estudio'&&!ex.value)); };
  pop.querySelector('#qcE').onchange=upd;
  pop.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>{ k=b.dataset.k; upd(); });
  const typeIdOf=k=>Object.values(S.types).find(t=>C.styleOf(S,t.id)===k)?.id||k;
  const go=async()=>{ const title=pop.querySelector('#qcT').value.trim(); const exam=k==='estudio'?S.events[pop.querySelector('#qcE').value]:null; const subjectId=exam?(exam.subjectId||null):(pop.querySelector('#qcS').value||null); if(!title&&!subjectId&&!exam&&k!=='bloqueo'){ pop.querySelector('#qcT').focus(); return; }
    beginBatch('ui'); const id=uid(); await save('events',id,{id,title:title||(exam?'Estudio':''),typeId:typeIdOf(k),subjectId,start:pre.start,end:pre.end,location:'',notes:'',travelBefore:0,travelAfter:0,...(exam?{examId:exam.id}:{})}); await writeLog(endBatch('Evento creado')); closePop(); };
  pop.querySelector('#qcO').onclick=go; pop.querySelector('#qcT').onkeydown=ev=>{ if(ev.key==='Enter') go(); if(ev.key==='Escape') closePop(); };
  pop.querySelector('#qcC').onclick=closePop; pop.querySelector('#qcMore').onclick=()=>{ const title=pop.querySelector('#qcT').value; closePop(); openEventEditor({prefill:{...pre,title,typeId:typeIdOf(k),examId:k==='estudio'?(pop.querySelector('#qcE').value||undefined):undefined}}); };
  setTimeout(()=>pop.querySelector('#qcT').focus(),0); }

// ================= MES =================
function renderMonth(){
  const first=new Date(cursor.getFullYear(),cursor.getMonth(),1), start=startOfWeek(first), today=new Date(); let h='';
  for(let i=0;i<42;i++){
    const d=addDays(start,i), ds=dstr(d); const items=itemsOn(d); const dues=C.tasksDueOn(S,d).filter(t=>!t.done); const rule=ruleOf(ds);
    const chips=[...dues.map(t=>({c:colorOf(t),l:(isExam(t)?'Examen · ':'Entrega · ')+t.title,k:isExam(t)?'c-examen':''})),...items.filter(e=>!(e.taskId&&e.skipped)).map(e=>({c:colorOf(e),l:(e.allDay?'':e.start.slice(11)+' ')+labelOf(e),k:'c-'+styleOf(e)}))];
    const show=chips.slice(0,5);
    h+=`<div class="m-cell ${d.getMonth()!==cursor.getMonth()?'other':''} ${sameDay(d,today)?'today':''}" data-date="${ds}"><div class="n"><span class="d">${d.getDate()}</span>${rule?`<span class="rulechip ${rule}" style="margin:0">${RULES_DAY[rule]}</span>`:''}</div>${show.map(c=>`<div class="chip ${c.k}" style="--c:${c.c}" title="${esc(c.l)}">${esc(c.l)}</div>`).join('')}${chips.length>5?`<div class="more">+${chips.length-5} más</div>`:''}</div>`;
  }
  $('#mgrid').innerHTML=h;
  $('#mgrid').querySelectorAll('.m-cell').forEach(c=>c.onclick=()=>{ cursor=dayOf(c.dataset.date); setView(window.innerWidth<900?'today':'week'); });
}

// ================= TAREAS / INDICACIONES =================
function renderTasks(){
  const el=$('#tasksv'); const nI=nowIso(); const weekEnd=iso(addDays(startOfWeek(new Date()),7));
  const all=Object.values(S.tasks).sort((a,b)=>(a.due||'9')<(b.due||'9')?-1:1);
  const pending=all.filter(t=>!t.done&&t.due); const left=pending.reduce((a,t)=>a+remainingOf(t),0);
  const rules=Object.values(S.rules).filter(r=>r.active!==false);
  let h=`<div class="tk-tools"><div class="seg"><button data-tab="tasks" class="${taskTab==='tasks'?'active':''}">Tareas</button><button data-tab="rules" class="${taskTab==='rules'?'active':''}">Indicaciones${rules.length?` (${rules.length})`:''}</button></div><span class="hint">${taskTab==='tasks'?(pending.length?`${pending.length} con fecha · ${fmtDur(left)} por hacer`:'Nada pendiente con fecha'):'Lo que le has pedido al planificador para situaciones concretas'}</span><span class="spacer"></span>${taskTab==='tasks'?`<label class="hint"><input type="checkbox" id="showDone" ${showDone?'checked':''}> Hechas</label><button class="btn primary" id="addTask">+ Tarea</button>`:`<button class="btn primary" id="addRule">+ Indicación</button>`}</div>`;
  if(taskTab==='tasks'){
    const subs=Object.values(S.subjects).sort((a,b)=>(a.order??0)-(b.order??0)).filter(s=>all.some(t=>t.subjectId===s.id&&!t.done));
    h+=`<div class="filterbar"><button class="fchip ${!taskFilter?'active':''}" data-f="">Todas</button>${subs.map(s=>`<button class="fchip ${taskFilter===s.id?'active':''}" data-f="${s.id}" style="--c:${s.color}"><i></i>${esc(s.short||s.name)}</button>`).join('')}</div>`;
    const list0=taskFilter?all.filter(t=>t.subjectId===taskFilter):all;
    const groups=[['Atrasadas',t=>!t.done&&t.due&&t.due<nI],['Esta semana',t=>!t.done&&t.due&&t.due>=nI&&t.due<weekEnd],['Próximas',t=>!t.done&&t.due&&t.due>=weekEnd],['Sin fecha',t=>!t.done&&!t.due],['Hechas',t=>t.done]];
    let any=false;
    for(const [name,f] of groups){ if(name==='Hechas'&&!showDone) continue; const list=list0.filter(f); if(!list.length) continue; any=true;
      h+=`<div class="group"><h3>${name} <small>${list.length}</small></h3>`; for(const t of list) h+=taskRow(t,nI); h+='</div>'; }
    if(!any) h+='<div class="empty">Sin tareas. Añade una con “+ Tarea”: la agenda la reparte sola en tus huecos.</div>';
  } else {
    if(!rules.length) h+='<div class="empty">Ninguna indicación activa. Aquí aparece lo que le pides a Claude del tipo “esto antes que eso”, “el sábado por la mañana solo Series” o “esta semana nada de Visión”. Caducan solas cuando pasa su fecha.</div>';
    const K={order:'→',focus:'◉',avoid:'∅',window:'⧖'};
    for(const r of rules.sort((a,b)=>(a.createdAt||'')<(b.createdAt||'')?1:-1)) h+=`<div class="rule-row" data-id="${r.id}"><div class="k" title="${r.kind}">${K[r.kind]||'•'}</div><div><div>${esc(C.ruleText(S,r))}</div><div class="exp">${r.kind==='order'?'hasta que la primera esté hecha':r.kind==='focus'?'solo ese día':r.until?'hasta el '+fmtDate(r.until+'T00:00'):''}${r.note?' · '+esc(r.note):''}</div></div><button class="btn sm ghost" data-del="${r.id}">Quitar</button></div>`;
    const old=Object.values(S.rules).filter(r=>r.active===false).sort((a,b)=>(a.expiredAt||'')<(b.expiredAt||'')?1:-1).slice(0,8);
    if(old.length){ h+=`<div class="group"><h3>Caducadas</h3>${old.map(r=>`<div class="rule-row" style="opacity:.55"><div class="k">·</div><div>${esc(C.ruleText(S,r))}</div><button class="btn sm ghost" data-del="${r.id}">Borrar</button></div>`).join('')}</div>`; }
  }
  el.innerHTML=h;
  el.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ taskTab=b.dataset.tab; renderTasks(); });
  el.querySelectorAll('.fchip').forEach(b=>b.onclick=()=>{ taskFilter=b.dataset.f||null; renderTasks(); });
  const sd=el.querySelector('#showDone'); if(sd) sd.onchange=()=>{ showDone=sd.checked; renderTasks(); };
  const at=el.querySelector('#addTask'); if(at) at.onclick=()=>openTaskEditor({});
  const ar=el.querySelector('#addRule'); if(ar) ar.onclick=()=>openRuleCreator();
  el.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ beginBatch('ui'); await remove('rules',b.dataset.del); await writeLog(endBatch('Indicación quitada')); });
  bindTaskRows(el);
}
let showDone=false;
function openRuleCreator(){
  const tasks=Object.values(S.tasks).filter(t=>!t.done).sort((a,b)=>(a.due||'9')<(b.due||'9')?-1:1);
  const tOpts=sel=>tasks.map(t=>`<option value="${t.id}" ${t.id===sel?'selected':''}>${esc(t.title)} · ${esc(C.shortOf(S,t.subjectId))}</option>`).join('');
  const d0=dstr(new Date());
  openSheet(`<h2>Nueva indicación</h2><div class="seg" id="rkSeg"><button data-k="order" class="active">Orden</button><button data-k="focus">Solo esto</button><button data-k="avoid">Nada de</button><button data-k="window">Ventana</button></div><div class="sp"></div>
    <div id="rkOrder"><div class="field"><label>Terminar primero</label><select id="rA">${tOpts()}</select></div><div class="sp"></div><div class="field"><label>Antes de empezar</label><select id="rB">${tOpts(tasks[1]&&tasks[1].id)}</select></div></div>
    <div id="rkFocus" hidden><div class="grid2"><div class="field"><label>Día</label><input type="date" id="fD" value="${d0}"></div><div class="field"><label>Franja</label><select id="fZ"><option value="am">Mañana (antes de clase)</option><option value="pm">Tarde-noche</option><option value="day">Todo el día</option></select></div></div><div class="sp"></div><div class="field"><label>Solo esta asignatura</label><select id="fS">${subjOpts('')}</select></div><div class="hint" style="margin-top:4px">O una tarea concreta:</div><select id="fT"><option value="">— cualquiera de esa asignatura</option>${tOpts()}</select></div>
    <div id="rkAvoid" hidden><div class="grid2"><div class="field"><label>Desde</label><input type="date" id="aF" value="${d0}"></div><div class="field"><label>Hasta</label><input type="date" id="aU" value="${d0}"></div></div><div class="sp"></div><div class="field"><label>Nada de esta asignatura</label><select id="aS">${subjOpts('')}</select></div><div class="hint" style="margin-top:4px">O una tarea concreta:</div><select id="aT"><option value="">—</option>${tOpts()}</select></div>
    <div id="rkWindow" hidden><div class="field"><label>Tarea</label><select id="wT">${tOpts()}</select></div><div class="sp"></div><div class="grid2"><div class="field"><label>Solo desde</label><input type="date" id="wF" value="${d0}"></div><div class="field"><label>Hasta</label><input type="date" id="wU" value="${d0}"></div></div></div>
    <div class="actions"><span class="spacer"></span><button class="btn" id="rCancel">Cancelar</button><button class="btn primary" id="rSave">Guardar</button></div>`);
  let k='order'; const q=s=>sheet.querySelector(s);
  sheet.querySelectorAll('#rkSeg button').forEach(b=>b.onclick=()=>{ k=b.dataset.k; sheet.querySelectorAll('#rkSeg button').forEach(x=>x.classList.toggle('active',x===b)); for(const [kk,id] of [['order','#rkOrder'],['focus','#rkFocus'],['avoid','#rkAvoid'],['window','#rkWindow']]) q(id).hidden=kk!==k; });
  q('#rCancel').onclick=closeSheet;
  q('#rSave').onclick=async()=>{ let r={id:uid(),kind:k,active:true,createdAt:nowIso(),createdBy:'ui'};
    if(k==='order'){ r.beforeTaskId=q('#rA').value; r.afterTaskId=q('#rB').value; if(r.beforeTaskId===r.afterTaskId){ toast('Elige dos tareas distintas'); return; } }
    if(k==='focus'){ r.date=q('#fD').value; r.zone=q('#fZ').value; r.subjectId=q('#fS').value||null; r.taskId=q('#fT').value||null; if(!r.subjectId&&!r.taskId){ toast('Elige asignatura o tarea'); return; } if(r.taskId&&!r.subjectId) r.subjectId=S.tasks[r.taskId].subjectId; }
    if(k==='avoid'){ r.from=q('#aF').value; r.until=q('#aU').value||r.from; r.subjectId=q('#aS').value||null; r.taskId=q('#aT').value||null; if(!r.subjectId&&!r.taskId){ toast('Elige asignatura o tarea'); return; } }
    if(k==='window'){ r.taskId=q('#wT').value; r.from=q('#wF').value; r.until=q('#wU').value||r.from; }
    beginBatch('ui'); await save('rules',r.id,r); await writeLog(endBatch('Indicación')); closeSheet(); toast('Indicación guardada'); };
}

// ================= AJUSTES =================
function renderSettings(){
  const s=S.settings; const el=$('#settings');
  const num=(id,v,min,step,hint)=>`<input type="number" id="${id}" value="${v}" min="${min}" step="${step||1}"> <span class="hint">${hint||''}</span>`;
  el.innerHTML=`
  <div class="card"><h3>Cuándo estudias</h3><p class="hint">La agenda coloca los bloques de estudio dentro de estas franjas, fuera de clases, citas, desplazamientos y tiempos no disponibles. Primero intenta acabar antes de la hora preferida; solo si no cabe usa el resto.</p>
    <div class="row"><label class="l">Entre semana</label><input type="time" id="sWd0" value="${s.weekday[0]}"> <span>a</span> <input type="time" id="sWd1" value="${s.weekday[1]}"> <span class="hint">preferido hasta</span> <input type="time" id="sWdS" value="${s.weekdaySoftEnd||''}"></div>
    <div class="row"><label class="l">Fin de semana</label><input type="time" id="sWe0" value="${s.weekend[0]}"> <span>a</span> <input type="time" id="sWe1" value="${s.weekend[1]}"> <span class="hint">preferido hasta</span> <input type="time" id="sWeS" value="${s.weekendSoftEnd||''}"></div>
    <div class="row"><label class="l">Tope diario de estudio</label>${num('sCap',s.dailyCap,60,30,'min al día (la mitad en “día ligero”)')}</div>
    <div class="row"><label class="l">Bloque máximo seguido</label>${num('sBlock',s.blockMax,25,5,'min; después, un descanso')}</div>
    <div class="row"><label class="l">Bloque mínimo</label>${num('sBlockMin',s.blockMin??45,15,5,'no se colocan bloques más cortos')}</div>
    <div class="row"><label class="l">Descanso</label>${num('sBreak',s.breakMin,0,5,'min al cambiar de cosa')}</div>
    <div class="row"><label class="l">Concentrar asignaturas</label><label class="hint"><input type="checkbox" id="sConc" ${(s.concentrate??true)?'checked':''}> mucho tiempo seguido con la misma asignatura</label></div>
    <div class="row"><label class="l">Asignaturas distintas por día</label>${num('sMaxSubj',s.maxSubjectsPerDay??3,1,1,'máximo; se salta solo si no cabe de otra forma')}</div>
  </div>
  <div class="card"><h3>Cómo se comporta el planificador</h3>
    <div class="row"><label class="l">Días congelados</label>${num('sFreeze',s.freezeDays??1,0,1,'hoy + estos días no se tocan salvo conflicto (0 = solo hoy)')}</div>
    <div class="row"><label class="l">Bloques pasados sin marcar</label><label class="hint"><input type="checkbox" id="sPast" ${(s.pastCountsAsDone??true)?'checked':''}> cuentan como hechos</label></div>
    <div class="row"><label class="l">Avisar si vence en</label>${num('sWarn',s.warnHours??48,6,6,'horas sin tener todo el tiempo planificado')}</div>
    <div class="row"><label class="l">Atrasadas: repartir en</label>${num('sOver',s.overdueDays??7,1,1,'días desde hoy')}</div>
    <div class="row"><label class="l">Días de repaso (exámenes)</label>${num('sReview',s.reviewDays??2,0,1,'las secciones “repaso” van en los últimos días')}</div>
    <div class="row"><label class="l">Horas por examen (defecto)</label>${num('sExamH',s.defaultExamHours??6,1,1,'al crear un examen sin secciones')}</div>
    <div class="actions"><button class="btn" id="sPlan" title="Rehace todos los bloques automáticos no fijados">Reorganizar todo</button><span class="hint">Normalmente no hace falta: la agenda se ajusta sola y solo toca lo necesario.</span></div>
  </div>
  <div class="card"><h3>Desplazamientos y universidad</h3>
    <div class="row"><label class="l">Trayecto a clase</label>${num('sCommute',s.commuteMin??60,0,5,'min antes de la primera clase y después de la última')}</div>
    <div class="row"><label class="l">Trayecto casa → trabajo</label>${num('sCommuteP',s.commutePracMin??30,0,5,'min')}</div>
    <div class="row"><label class="l">Salgo del campus a las</label><input type="time" id="sLeave" value="${s.campusLeave||''}"> <span class="hint">si la última clase acaba antes, te quedas a estudiar allí</span></div>
    <div class="row"><label class="l">Espera máxima allí</label>${num('sWait',s.campusWaitMax??90,0,15,'min')}</div>
    <div class="row"><label class="l">Nombre del campus</label><input type="text" id="sCampus" value="${esc(s.campusName||'Campus')}" style="width:140px"></div>
    <div class="row"><label class="l">Nombre del trabajo (prácticas, empleo)</label><input type="text" id="sWorkName" value="${esc(s.workName||'')}" style="width:140px" placeholder="Trabajo"></div>
    <div class="row"><label class="l">Hora de entrada</label><input type="time" id="sWorkStart" value="${s.workStart||'09:00'}"></div>
    <div class="row"><label class="l">Lugar de trabajo</label><input type="text" id="sWorkPlace" value="${esc(s.workPlace||'')}" style="width:140px"></div>
  </div>
  <div class="card"><h3>Vista</h3>
    <div class="row"><label class="l">Horas visibles</label><input type="number" id="sG0" value="${s.gridStart}" min="0" max="12"> <span>a</span> <input type="number" id="sG1" value="${s.gridEnd}" min="13" max="24"></div>
    <div class="row"><label class="l">Idioma</label><div class="seg"><button id="lgEs" class="${I18N.lang==='es'?'active':''}">Español</button><button id="lgEn" class="${I18N.lang==='en'?'active':''}">Inglés</button></div></div>
    <div class="row"><label class="l">Color de los bloques por</label><div class="seg"><button id="cbS" class="${s.colorBy==='subject'?'active':''}">Asignatura</button><button id="cbT" class="${s.colorBy==='type'?'active':''}">Tipo</button></div></div>
    <div class="actions"><span class="spacer"></span><button class="btn primary" id="sSave">Guardar ajustes</button></div>
  </div>
  <div class="card"><h3>Asignaturas</h3><p class="hint">Nombre completo, abreviatura (la que aparece en los bloques) y color.</p><div id="subjList"></div><button class="btn" id="addSubj">+ Asignatura</button></div>
  <div class="card"><h3>Tipos</h3><p class="hint">Cada tipo tiene un estilo visual fijo (clase, laboratorio, estudio, entrega, examen, prácticas, cita, personal, no disponible). Puedes añadir tipos propios eligiendo con qué estilo se dibujan.</p><div id="typeList"></div><button class="btn" id="addType">+ Tipo</button></div>
  <div class="card"><h3>Clases fijas</h3><p class="hint">Se repiten cada semana entre las fechas indicadas. Para un cambio puntual, abre la clase en la semana y usa “Saltar este día”.</p><div id="classList"></div><button class="btn" id="addClass">+ Clase fija</button></div>
  <div class="card"><h3>Copia de seguridad</h3><div class="actions" style="margin-top:0"><button class="btn" id="exportBtn">Exportar JSON</button><button class="btn" id="importBtn">Importar JSON</button><input type="file" id="importFile" accept="application/json" hidden></div></div>
  ${localMode?`<div class="card"><h3>Cuenta</h3><p class="hint">Modo demo: los datos se guardan solo en este navegador.</p><div class="actions"><button class="btn danger" id="demoExit">Salir del modo demo</button><span class="hint">Borrar los datos de prueba y volver a la pantalla de acceso</span></div></div>`:`<div class="card"><h3>Cuenta</h3><p class="hint">Sesión iniciada como <b>${esc(userEmail)}</b>. La agenda se sincroniza entre todos tus dispositivos.</p>
    <div class="row"><label class="l">Nueva contraseña</label><input type="password" id="pw1" autocomplete="new-password" style="width:180px"> <input type="password" id="pw2" placeholder="Repetir" autocomplete="new-password" style="width:180px"> <button class="btn" id="pwChange">Cambiar</button></div>
    <div class="actions"><button class="btn danger" id="logout">Cerrar sesión</button><span class="hint">Para instalar la app: en iPhone/iPad, Compartir › «Añadir a pantalla de inicio»; en el ordenador, el icono de instalar en la barra de direcciones.</span></div></div>`}
  <p class="hint" style="text-align:center">Atajos: N nuevo · T hoy · ←/→ · 1 Hoy, 2 Semana, 3 Mes, 4 Tareas</p>`;
  let colorBy=s.colorBy;
  $('#lgEs').onclick=()=>setLang('es'); $('#lgEn').onclick=()=>setLang('en');
  $('#cbS').onclick=()=>{colorBy='subject';$('#cbS').classList.add('active');$('#cbT').classList.remove('active');};
  $('#cbT').onclick=()=>{colorBy='type';$('#cbT').classList.add('active');$('#cbS').classList.remove('active');};
  $('#sPlan').onclick=async()=>{ if(await askConfirm('Se rehacen todos los bloques automáticos que no hayas fijado (hoy y mañana no se tocan). ¿Seguir?','Reorganizar')){ beginBatch('ui'); await autoPlan(false,{force:true}); await writeLog(endBatch('Reorganización completa')); } };
  $('#sSave').onclick=()=>{ const v=id=>$(id).value; save('settings','main',{ ...s, weekday:[v('#sWd0'),v('#sWd1')], weekend:[v('#sWe0'),v('#sWe1')], weekdaySoftEnd:v('#sWdS'), weekendSoftEnd:v('#sWeS'), blockMax:+v('#sBlock'), blockMin:+v('#sBlockMin'), breakMin:+v('#sBreak'), dailyCap:+v('#sCap'), maxSubjectsPerDay:+v('#sMaxSubj'), concentrate:$('#sConc').checked, freezeDays:+v('#sFreeze'), pastCountsAsDone:$('#sPast').checked, warnHours:+v('#sWarn'), overdueDays:+v('#sOver'), gridStart:+v('#sG0'), gridEnd:+v('#sG1'), commuteMin:+v('#sCommute'), commutePracMin:+v('#sCommuteP'), campusLeave:v('#sLeave'), campusWaitMax:+v('#sWait'), campusName:v('#sCampus').trim()||'Campus', workName:v('#sWorkName').trim(), workStart:v('#sWorkStart')||'09:00', workPlace:v('#sWorkPlace').trim(), reviewDays:+v('#sReview'), defaultExamHours:+v('#sExamH'), colorBy }).then(()=>toast('Ajustes guardados')); };
  const listEditor=(coll,container,fields)=>{
    const c=$(container); const items=Object.values(S[coll]).sort((a,b)=>(a.order??0)-(b.order??0)||a.name.localeCompare(b.name));
    c.innerHTML=items.map(it=>`<div class="list-row" data-id="${it.id}"><input type="color" value="${it.color||'#6B7188'}" data-f="color"><input type="text" value="${esc(it.name)}" data-f="name" placeholder="Nombre">${fields.short?`<input type="text" value="${esc(it.short||'')}" data-f="short" placeholder="Abreviatura">`:`<select data-f="style">${C.STYLES.map(st=>`<option value="${st}" ${C.styleOf(S,it.id)===st?'selected':''}>${STYLE_LABEL[st]}</option>`).join('')}</select>`}<input type="number" value="${it.order??0}" data-f="order" title="Orden" style="width:100%"><button class="x" title="Borrar">✕</button></div>`).join('') || '<div class="hint" style="margin-bottom:8px">Ninguno todavía.</div>';
    c.querySelectorAll('.list-row').forEach(r=>{ const id=r.dataset.id; r.querySelectorAll('input,select').forEach(i=>i.onchange=()=>{ const it={...S[coll][id]}; r.querySelectorAll('input,select').forEach(j=>it[j.dataset.f]=j.dataset.f==='order'?+j.value:j.value); save(coll,id,it); }); r.querySelector('.x').onclick=async()=>{ if(await askConfirm('¿Borrar '+(S[coll][id]||{}).name+'?')) remove(coll,id); }; });
  };
  listEditor('subjects','#subjList',{short:true}); listEditor('types','#typeList',{});
  $('#addSubj').onclick=()=>{ const id=uid(); save('subjects',id,{id,name:'Nueva asignatura',short:'Nueva',color:'#3E63DD',order:99}); };
  $('#addType').onclick=()=>{ const id=uid(); save('types',id,{id,name:'Nuevo tipo',color:'#6B7188',order:99,style:'personal'}); };
  const cl=$('#classList'); const dn=['','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const classes=Object.values(S.classes).sort((a,b)=>a.dow-b.dow||a.start.localeCompare(b.start));
  cl.innerHTML=classes.map(c=>`<div class="task" data-id="${c.id}" style="grid-template-columns:1fr auto;--c:${colorOf(c)}"><div><div class="tt">${ICONS[C.styleOf(S,c.typeId||'clase')]||''}${esc(labelOf({...c,kind:'class'}))}</div><div class="sub"><span class="tag" style="--c:${colorOf(c)}">${dn[c.dow]} ${c.start}–${c.end}</span><span>${esc(c.room||'')}</span><span>${c.from||''} → ${c.until||''}</span>${(c.skip||[]).length?`<span>${c.skip.length} día(s) saltados</span>`:''}</div></div><span class="hint">Editar ›</span></div>`).join('') || '<div class="hint" style="margin-bottom:8px">Ninguna todavía.</div>';
  cl.querySelectorAll('.task').forEach(r=>r.onclick=()=>openClassEditor(r.dataset.id));
  $('#addClass').onclick=()=>openClassEditor(null);
  $('#exportBtn').onclick=async()=>{ const data={settings:S.settings}; for(const c of COLLS) data[c]=S[c]; const text=JSON.stringify(data,null,2), filename=`agenda-${dstr(new Date())}.json`;
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'application/json'})); a.download=filename; a.click(); toast('Copia descargada'); };
  const dx=$('#demoExit'); if(dx) dx.onclick=async()=>{ if(await askConfirm('¿Borrar los datos de prueba?','Borrar')){ try{ localStorage.removeItem('agenda'); localStorage.removeItem('agendaDemo'); }catch{} location.reload(); } };
  if($('#pwChange')) $('#pwChange').onclick=async()=>{ const p1=$('#pw1').value, p2=$('#pw2').value; if(p1.length<8){ toast('Mínimo 8 caracteres'); return; } if(p1!==p2){ toast('Las contraseñas no coinciden'); return; } const {error}=await DB.updatePassword(p1); if(error) toast('No se pudo cambiar: '+error.message); else { toast('Contraseña cambiada'); $('#pw1').value=$('#pw2').value=''; } };
  if($('#logout')) $('#logout').onclick=async()=>{ if(await askConfirm('¿Cerrar sesión en este dispositivo?','Salir')) await DB.signOut(); };
  $('#importBtn').onclick=()=>$('#importFile').click();
  $('#importFile').onchange=async ev=>{ const f=ev.target.files[0]; if(!f) return; try{ const data=JSON.parse(await f.text()); if(!await askConfirm('Esto añade/actualiza lo que haya en el archivo. ¿Continuar?','Importar')) return; for(const c of COLLS) for(const [id,v] of Object.entries(data[c]||{})) await save(c,id,v); if(data.settings) await save('settings','main',data.settings); toast('Importado'); }catch{ toast('Archivo no válido'); } };
}

// ================= hoja / editores =================
const modal=$('#modal'), sheet=$('#sheet');
function openSheet(html){ sheet.innerHTML=html; modal.classList.add('open'); const f=sheet.querySelector('input[type=text],select'); if(f&&window.innerWidth>900) setTimeout(()=>f.focus(),30); }
function closeSheet(){ modal.classList.remove('open'); sheet.innerHTML=''; }
modal.addEventListener('click',ev=>{ if(ev.target===modal) closeSheet(); });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'){ closeSheet(); closePop(); } });
const subjOpts=(sel)=>`<option value="">— Sin asignatura</option>`+Object.values(S.subjects).sort((a,b)=>(a.order??0)-(b.order??0)).map(s=>`<option value="${s.id}" ${s.id===sel?'selected':''}>${esc(s.name)}</option>`).join('');
const typeChips=(sel,exclude)=>Object.values(S.types).filter(t=>!(exclude||[]).includes(C.styleOf(S,t.id))).sort((a,b)=>(a.order??0)-(b.order??0)).map(t=>`<button data-t="${t.id}" class="${t.id===sel?'active':''}" title="${STYLE_LABEL[C.styleOf(S,t.id)]}">${ICONS[C.styleOf(S,t.id)]||''}${esc(t.name)}</button>`).join('');
const examOpts=(sel)=>{ const today=iso(new Date()).slice(0,10); const ex=Object.values(S.events).filter(x=>C.styleOf(S,x.typeId)==='examen'&&(x.end.slice(0,10)>=today||x.id===sel)).sort((a,b)=>a.start<b.start?-1:1); return `<option value="">— Ninguno (estudio suelto)</option>`+ex.map(x=>`<option value="${x.id}" ${x.id===sel?'selected':''}>${esc(labelOf({...x,kind:'event'}))} · ${fmtDate(x.start)}</option>`).join(''); };
const durBtns=`<div class="durs">${[30,45,60,90,120,180].map(m=>`<button data-d="${m}">${fmtDur(m)}</button>`).join('')}</div>`;

function openRuleEditor(ds){
  const cur=ruleOf(ds); const d=dayOf(ds);
  openSheet(`<h2>${DOWL[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].slice(0,3)}</h2><p class="hint" style="margin:0 0 10px">Condición de ese día para el planificador.</p>
    <div class="seg" style="flex-direction:column;gap:4px;width:100%">
      ${[['', 'Normal', 'Sin restricciones'],['noexam','Sin exámenes','Solo entregas y cosas prácticas'],['examonly','Solo exámenes','Solo preparación de exámenes'],['light','Día ligero','La mitad del tope diario'],['free','Libre','No se coloca nada']].map(([v,l,dd])=>`<button data-v="${v}" class="${(cur||'')===v?'active':''}" style="text-align:left;padding:8px 10px"><b>${l}</b><br><span class="hint">${dd}</span></button>`).join('')}
    </div><div class="actions"><span class="spacer"></span><button class="btn" id="rCancel">Cerrar</button></div>`);
  sheet.querySelectorAll('[data-v]').forEach(b=>b.onclick=async()=>{ const v=b.dataset.v; beginBatch('ui'); if(v) await save('dayrules',ds,{id:ds,mode:v}); else await remove('dayrules',ds); await writeLog(endBatch('Condición de día')); closeSheet(); toast(v?`${RULES_DAY[v]} el ${d.getDate()}/${d.getMonth()+1}`:'Día sin condición'); });
  sheet.querySelector('#rCancel').onclick=closeSheet;
}
function openClassOccurrence(occ){
  const [cid,ds]=occ.split('@'); const c=S.classes[cid]; if(!c) return; const o={...c,kind:'class'};
  openSheet(`<h2>${ICONS[C.styleOf(S,c.typeId||'clase')]||''}${esc(labelOf(o))}</h2><p>${fmtDateLong(ds+'T00:00')} · ${c.start}–${c.end}${c.room?' · '+esc(c.room):''}</p>${c.notes?`<p class="hint">${esc(c.notes)}</p>`:''}<p class="hint">Es una clase fija: se edita en Ajustes › Clases fijas. Aquí puedes saltar solo este día o sustituirla por otra cosa.</p>
    <div class="actions"><button class="btn" id="cSkip">Saltar este día</button><button class="btn" id="cRepl">Sustituir por…</button><span class="spacer"></span><button class="btn" id="cClose">Cerrar</button></div>`);
  sheet.querySelector('#cClose').onclick=closeSheet;
  sheet.querySelector('#cSkip').onclick=async()=>{ beginBatch('ui'); await save('classes',cid,{...c,skip:[...new Set([...(c.skip||[]),ds])]}); await writeLog(endBatch('Clase saltada')); closeSheet(); toast('Clase saltada ese día'); };
  sheet.querySelector('#cRepl').onclick=async()=>{ beginBatch('ui'); await save('classes',cid,{...c,skip:[...new Set([...(c.skip||[]),ds])]}); await writeLog(endBatch('Clase saltada')); closeSheet(); openEventEditor({prefill:{title:'',typeId:c.typeId||'clase',subjectId:c.subjectId,start:`${ds}T${c.start}`,end:`${ds}T${c.end}`,location:c.room||''}}); };
}
function openClassEditor(id){
  const c = id ? {...S.classes[id]} : {id:uid(),dow:1,start:'16:00',end:'16:50',room:'',from:dstr(new Date()),until:'',skip:[],typeId:'clase'};
  openSheet(`<h2>${id?'Clase fija':'Nueva clase fija'}</h2>
    <div class="grid2"><div class="field"><label>Asignatura</label><select id="cSubj">${subjOpts(c.subjectId)}</select></div><div class="field"><label>Tipo</label><div class="chips" id="cType">${typeChips(c.typeId||'clase',['estudio','entrega','examen','cita','personal','practicas'])}</div></div></div><div class="sp"></div>
    <div class="field"><label>Título (opcional, p. ej. «Teoría»)</label><input type="text" id="cTitle" value="${esc(c.title||'')}" placeholder="Se muestra como «Título · Asignatura»"></div><div class="sp"></div>
    <div class="grid3"><div class="field"><label>Día</label><select id="cDow">${['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((n,i)=>`<option value="${i+1}" ${c.dow===i+1?'selected':''}>${n}</option>`).join('')}</select></div><div class="field"><label>Empieza</label><input type="time" id="cStart" value="${c.start}"></div><div class="field"><label>Termina</label><input type="time" id="cEnd" value="${c.end}"></div></div><div class="sp"></div>
    <div class="grid3"><div class="field"><label>Aula</label><input type="text" id="cRoom" value="${esc(c.room||'')}"></div><div class="field"><label>Desde</label><input type="date" id="cFrom" value="${c.from||''}"></div><div class="field"><label>Hasta</label><input type="date" id="cUntil" value="${c.until||''}"></div></div>
    <details class="more"><summary>Más opciones</summary><div><div class="field"><label>Días saltados (uno por línea, AAAA-MM-DD)</label><textarea id="cSkip" rows="2">${(c.skip||[]).join('\n')}</textarea></div><div class="sp"></div><div class="field"><label>Notas</label><input type="text" id="cNotes" value="${esc(c.notes||'')}"></div></div></details>
    <div class="actions">${id?'<button class="btn danger" id="cDel">Borrar</button>':''}<span class="spacer"></span><button class="btn" id="cCancel">Cancelar</button><button class="btn primary" id="cSave">Guardar</button></div>`);
  let typeId=c.typeId||'clase'; sheet.querySelectorAll('#cType button').forEach(b=>b.onclick=()=>{ typeId=b.dataset.t; sheet.querySelectorAll('#cType button').forEach(x=>x.classList.toggle('active',x===b)); });
  sheet.querySelector('#cCancel').onclick=closeSheet;
  if(id) sheet.querySelector('#cDel').onclick=async()=>{ if(await askConfirm('¿Borrar esta clase fija?')){ remove('classes',id); closeSheet(); } };
  sheet.querySelector('#cSave').onclick=()=>{ const g=s=>sheet.querySelector(s).value; if(g('#cEnd')<=g('#cStart')){ toast('Revisa las horas'); return; } save('classes',c.id,{id:c.id,subjectId:g('#cSubj')||null,title:g('#cTitle').trim(),dow:+g('#cDow'),room:g('#cRoom').trim(),start:g('#cStart'),end:g('#cEnd'),from:g('#cFrom'),until:g('#cUntil'),typeId,notes:g('#cNotes').trim(),skip:g('#cSkip').split('\n').map(x=>x.trim()).filter(Boolean)}); closeSheet(); toast('Guardada'); };
}
// prácticas de la semana
function pracEnd(date){ const campus=C.campusOn(S,date); return campus.length?tfromMins(mins(campus[0].start.slice(11))-(S.settings.commuteMin||0)):'14:00'; }
function pracEventOn(ds){ return Object.values(S.events).find(e=>C.styleOf(S,e.typeId)==='practicas'&&e.start.slice(0,10)===ds); }
const workName=()=>S.settings.workName||STYLE_LABEL.practicas, workStart=()=>S.settings.workStart||'09:00';
function openPracticas(){
  const a=startOfWeek(view==='month'?new Date():cursor); let rows=''; const ws=workStart();
  for(let i=0;i<5;i++){ const d=addDays(a,i), ds=dstr(d); const ex=pracEventOn(ds); const end=ex?ex.end.slice(11):pracEnd(d);
    rows+=`<label class="task" style="grid-template-columns:24px 1fr auto;cursor:pointer"><input type="checkbox" data-ds="${ds}" ${ex?'checked':''}><div><div class="tt">${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].slice(0,3)}</div><div class="sub">${ws}–${end}${ex?'':' · sale a tiempo para la primera clase'}</div></div><span class="hint">${fmtDur(mins(end)-mins(ws))}</span></label>`; }
  openSheet(`<h2>${esc(workName())} · semana del ${a.getDate()} ${MON[a.getMonth()].slice(0,3)}</h2><p class="hint" style="margin:0 0 10px">Marca los días. Empiezan a la hora de entrada y terminan a la hora a la que tienes que salir para la primera clase.</p>${rows}
    <div class="actions"><span class="spacer"></span><button class="btn" id="pCancel">Cancelar</button><button class="btn primary" id="pSave">Guardar</button></div>`);
  sheet.querySelector('#pCancel').onclick=closeSheet;
  sheet.querySelector('#pSave').onclick=async()=>{ beginBatch('ui'); const tid=Object.values(S.types).find(t=>C.styleOf(S,t.id)==='practicas')?.id||'practicas'; for(const cb of sheet.querySelectorAll('input[type=checkbox]')){ const ds=cb.dataset.ds, ex=pracEventOn(ds);
      if(cb.checked&&!ex){ const id=uid(); await save('events',id,{id,title:workName(),subjectId:null,typeId:tid,start:`${ds}T${ws}`,end:`${ds}T${pracEnd(dayOf(ds))}`,location:S.settings.workPlace||'',notes:''}); }
      else if(!cb.checked&&ex) await remove('events',ex.id); }
    await writeLog(endBatch('Días de trabajo de la semana')); closeSheet(); toast('Días de trabajo de la semana guardados'); };
}
$('#pracBtn').onclick=openPracticas;

// ---- evento
function openEventEditor(o){
  const e=o.id?S.events[o.id]:(o.prefill||{}); if(o.id&&!e) return;
  const n0=new Date(); n0.setMinutes(Math.ceil(n0.getMinutes()/30)*30,0,0);
  const start=e.start||iso(n0), end=e.end||iso(new Date(parse(start).getTime()+3600000));
  const t=e.taskId?S.tasks[e.taskId]:null; const sty=C.styleOf(S,e.typeId||'cita');
  openSheet(`<h2>${o.id?(t?'Bloque de estudio':'Evento'):'Nuevo'}${t?` <span class="tag" style="--c:${colorOf(e)}">${esc(labelOf({...e,kind:'event'}))}</span>`:''}</h2>
    ${o.id||t?'':`<div class="seg" id="kindSeg"><button class="active">Evento</button><button id="toTask">Tarea con fecha</button></div><div class="sp"></div>`}
    ${t?'':`<div class="field"><label>Qué es</label><input type="text" id="fTitle" value="${esc(e.title||'')}" placeholder="p. ej. Dentista, Comida con…, Ejercicios de Laplace T3"></div><div class="sp"></div>
    <div class="field"><label>Tipo</label><div class="chips" id="fType">${typeChips(e.typeId||'cita',[])}</div></div><div class="sp"></div>
    <div class="field" id="fExamWrap" hidden><label>Para preparar el examen (opcional)</label><select id="fExam">${examOpts(e.examId)}</select></div>
    <label class="hint" id="fMkTaskWrap" hidden><input type="checkbox" id="fMkTask"> Crear también una tarea de preparación (el planificador te reparte el estudio solo)</label>`}
    <div class="grid3"><div class="field"><label>Día</label><input type="date" id="fDate" value="${start.slice(0,10)}"></div><div class="field"><label>Empieza</label><input type="time" id="fStart" step="300" value="${start.slice(11)}"></div><div class="field"><label>Termina</label><input type="time" id="fEnd" step="300" value="${end.slice(11)}"></div></div>${durBtns}<div class="sp"></div>
    ${t?'':`<div class="field"><label>Asignatura (opcional)</label><select id="fSubject">${subjOpts(e.subjectId)}</select></div>`}
    <details class="more" ${e.location||e.notes||e.allDay||e.travelBefore||e.travelAfter?'open':''}><summary>Más opciones</summary><div>
      <div class="grid2"><div class="field"><label>Lugar</label><input type="text" id="fLoc" value="${esc(e.location||'')}"></div><div class="field"><label>&nbsp;</label><label class="hint"><input type="checkbox" id="fAllDay" ${e.allDay?'checked':''}> Todo el día</label></div></div><div class="sp"></div>
      <div class="grid2"><div class="field"><label>Desplazamiento antes (min)</label><input type="number" id="fTravelB" value="${e.travelBefore||0}" min="0" step="5"></div><div class="field"><label>Desplazamiento después (min)</label><input type="number" id="fTravelA" value="${e.travelAfter||0}" min="0" step="5"></div></div><div class="sp"></div>
      <div class="field"><label>Notas</label><textarea id="fNotes" rows="2">${esc(e.notes||'')}</textarea></div>
    </div></details>
    ${t?`<div class="note">Parte de <b>${esc(t.title)}</b>${e.sectionId?` · ${esc((t.sections||[]).find(s=>s.id===e.sectionId)?.name||'')}`:''}.<br><label><input type="checkbox" id="fDone" ${e.done?'checked':''}> Hecho</label> · <label><input type="checkbox" id="fLock" ${e.locked?'checked':''}> Fijado (el planificador no lo mueve)</label> · <label><input type="checkbox" id="fSkip" ${e.skipped?'checked':''}> No lo hice</label><br><button class="btn sm" id="goTask" style="margin-top:8px">Abrir la tarea</button></div>`:''}
    <div class="note" id="mNote" hidden></div>
    <div class="actions">${o.id?'<button class="btn danger" id="mDelete">Borrar</button>':''}<span class="spacer"></span><button class="btn" id="mCancel">Cancelar</button><button class="btn primary" id="mSave">Guardar</button></div>`);
  const q=s=>sheet.querySelector(s); let typeId=e.typeId||(t?'estudio':'cita');
  sheet.querySelectorAll('#fType button').forEach(b=>b.onclick=()=>{ typeId=b.dataset.t; sheet.querySelectorAll('#fType button').forEach(x=>x.classList.toggle('active',x===b)); onType(); });
  const setEnd=m=>{ const a=mins(q('#fStart').value); q('#fEnd').value=tfromMins(Math.min(23*60+59,a+m)); };
  sheet.querySelectorAll('.durs button').forEach(b=>b.onclick=()=>setEnd(+b.dataset.d));
  q('#mCancel').onclick=closeSheet;
  const tt=q('#toTask'); if(tt) tt.onclick=()=>openTaskEditor({prefill:{title:q('#fTitle').value,subjectId:q('#fSubject').value}});
  if(t) q('#goTask').onclick=()=>openTaskEditor({id:t.id});
  if(o.id) q('#mDelete').onclick=async()=>{ beginBatch('ui'); await remove('events',o.id); await writeLog(endBatch('Evento borrado')); closeSheet(); };
  const onType=()=>{ const st=C.styleOf(S,typeId); const nt=q('#mNote'); nt.hidden=true; if(st==='practicas'&&!o.id){ const ds=q('#fDate').value; const end=pracEnd(dayOf(ds)); q('#fStart').value=workStart(); q('#fEnd').value=end; if(!q('#fTitle').value) q('#fTitle').value=workName(); q('#fLoc').value=q('#fLoc').value||S.settings.workPlace||''; nt.hidden=false; nt.textContent=`Termina a las ${end} para llegar a clase con margen.`; }
    syncKind(); };
  const syncExam=()=>{ const sel=q('#fExam'), sub=q('#fSubject'); if(!sel||!sub) return; const ex=S.events[sel.value]; if(ex&&C.styleOf(S,typeId)==='estudio'){ sub.value=ex.subjectId||''; sub.disabled=true; } else sub.disabled=false; };
  const syncKind=()=>{ const st=C.styleOf(S,typeId), w=q('#fExamWrap'), mk=q('#fMkTaskWrap'); if(w) w.hidden=st!=='estudio'; if(mk) mk.hidden=!(st==='examen'&&!o.id); const ti=q('#fTitle'); if(ti&&st==='estudio') ti.placeholder='Qué vas a hacer en concreto: p. ej. Ejercicios de Laplace T3'; syncExam();
    const nt=q('#mNote'); if(st==='examen'&&o.id){ const bl=Object.values(S.events).filter(x=>x.examId===o.id&&!x.skipped).sort((a,b)=>a.start<b.start?-1:1); nt.hidden=false; nt.innerHTML=bl.length?`<b>Estudio reservado para este examen: ${fmtDur(bl.reduce((a,x)=>a+C.durOf(x),0))}</b> en ${bl.length} bloque${bl.length>1?'s':''}<br>`+bl.map(x=>`${fmtDate(x.start)} ${x.start.slice(11)}–${x.end.slice(11)} · ${esc(x.title||'Estudio')}`).join('<br>'):'Aún no hay bloques de estudio para este examen. Crea un evento de tipo Bloque de estudio y elígelo en «Para preparar el examen».'; } };
  { const sel=q('#fExam'); if(sel) sel.onchange=syncExam; } syncKind();
  q('#mSave').onclick=async()=>{
    const title=t?'':q('#fTitle').value.trim(), subjectId=t?e.subjectId:(q('#fSubject').value||null), notes=q('#fNotes').value.trim();
    const ds=q('#fDate').value, start=`${ds}T${q('#fStart').value}`, end=`${ds}T${q('#fEnd').value}`; if(!ds||!q('#fStart').value||!q('#fEnd').value||end<=start){ toast('Revisa las horas'); return; }
    if(!t&&!title&&!subjectId&&!(q('#fExam')&&q('#fExam').value&&C.styleOf(S,typeId)==='estudio')&&C.styleOf(S,typeId)!=='bloqueo'){ toast('Ponle un nombre'); return; }
    const id=o.id||uid(); const prev=S.events[id]||{}; const upd={...prev,id,subjectId,typeId,start,end,location:q('#fLoc').value.trim(),notes,allDay:q('#fAllDay').checked,travelBefore:+q('#fTravelB').value||0,travelAfter:+q('#fTravelA').value||0};
    if(!t) upd.title=title; else delete upd.title;
    if(!t&&C.styleOf(S,typeId)==='estudio'&&q('#fExam')&&S.events[q('#fExam').value]){ const ex=S.events[q('#fExam').value]; upd.examId=ex.id; upd.subjectId=ex.subjectId||null; if(!upd.title) upd.title='Estudio'; } else delete upd.examId;
    if(prev.taskId){ upd.done=q('#fDone').checked; upd.locked=q('#fLock').checked; upd.skipped=q('#fSkip').checked; if(upd.done) upd.doneFrac=upd.doneFrac??1; if(prev.start!==start||prev.end!==end) upd.locked=true; }
    const conf=C.conflictsOf(S,start,end,[id]).filter(c=>c.kind!=='travel'||C.styleOf(S,typeId)!=='bloqueo').filter(c=>!(c.study&&c.auto&&!c.locked)&&!(prev.taskId&&c.kind==='travel'&&false));
    if(conf.length&&!upd.allDay&&(prev.taskId||C.styleOf(S,typeId)==='estudio')){ toast('Ahí pisa: '+conf.map(c=>c.label+' '+c.start).join(', ')); return; }
    beginBatch('ui'); await save('events',id,upd);
    if(C.styleOf(S,typeId)==='examen'&&!o.id&&q('#fMkTask')&&q('#fMkTask').checked&&!prev.examTaskId&&!Object.values(S.tasks).some(x=>x.examEventId===id)){
      const tid=uid(); const H=(S.settings.defaultExamHours||6)*60; const sec=[{id:uid(),name:'Teoría',estimateMin:Math.round(H*0.4/15)*15,progress:0,review:false},{id:uid(),name:'Práctica',estimateMin:Math.round(H*0.4/15)*15,progress:0,review:false},{id:uid(),name:'Repaso',estimateMin:Math.round(H*0.2/15)*15,progress:0,review:true}];
      await save('tasks',tid,{id:tid,kind:'exam',title:'Preparar '+(title||'examen'),subjectId,typeId:'examen',due:start,priority:2,notes:'',done:false,progress:0,sections:sec,checklist:[],examEventId:id,createdAt:nowIso()});
      await save('events',id,{...upd,examTaskId:tid}); await writeLog(endBatch('Examen creado'));
      closeSheet(); toast('Examen y tarea de preparación creados'); openTaskEditor({id:tid}); return;
    }
    await writeLog(endBatch(o.id?'Evento editado':'Evento creado')); closeSheet();
  };
}
// ---- tarea
function openTaskEditor(o){
  const t = o.id ? {...S.tasks[o.id]} : {kind:'task',title:'',subjectId:null,typeId:'entrega',due:iso(addDays(new Date(),7)).slice(0,11)+'23:59',estimateMin:120,priority:1,notes:'',progress:0,sections:[],checklist:[],...(o.prefill||{})};
  if(o.id&&!S.tasks[o.id]) return;
  t.sections=(t.sections||[]).map(s=>({...s})); t.checklist=(t.checklist||[]).map(c=>({...c}));
  const draw=()=>{
    const exam=t.kind==='exam'; const est=exam&&t.sections.length?t.sections.reduce((a,s)=>a+(s.estimateMin||0),0):(t.estimateMin||0);
    const hh=Math.floor(est/60), mm=est%60;
    openSheet(`<h2>${o.id?(exam?'Examen':'Tarea'):'Nueva tarea'}</h2>
      <div class="seg" id="kSeg"><button data-k="task" class="${!exam?'active':''}">Tarea / entrega</button><button data-k="exam" class="${exam?'active':''}">Examen</button></div><div class="sp"></div>
      <div class="field"><label>Qué es</label><input type="text" id="tTitle" value="${esc(t.title)}" placeholder="p. ej. Práctica 4, Tema 3, Trabajo previo lab"></div><div class="sp"></div>
      <div class="grid2"><div class="field"><label>Asignatura</label><select id="tSubj">${subjOpts(t.subjectId)}</select></div><div class="field"><label>Prioridad</label><div class="chips" id="tPrio">${[[1,'Normal'],[2,'Alta'],[3,'Urgente']].map(([v,l])=>`<button data-p="${v}" class="${t.priority==v?'active':''}">${l}</button>`).join('')}</div></div></div><div class="sp"></div>
      <div class="grid3"><div class="field"><label>${exam?'Día del examen':'Fecha límite'}</label><input type="date" id="tDue" value="${t.due?t.due.slice(0,10):''}" ${t.due?'':'disabled'}></div><div class="field"><label>Hora</label><input type="time" id="tDueT" step="300" value="${t.due?t.due.slice(11):'23:59'}" ${t.due?'':'disabled'}></div><div class="field"><label>&nbsp;</label><label class="hint"><input type="checkbox" id="tNoDue" ${t.due?'':'checked'}> Sin fecha</label></div></div><div class="sp"></div>
      ${exam?'':`<div class="grid2"><div class="field"><label>Tiempo estimado</label><div style="display:flex;gap:6px;align-items:center"><input type="number" id="tH" value="${hh}" min="0" style="width:70px"> <span class="hint">h</span> <input type="number" id="tM" value="${mm}" min="0" max="59" step="5" style="width:70px"> <span class="hint">min</span></div></div>
        <div class="field"><label>Hecho: <span id="tPct">${t.progress||0}%</span></label><input type="range" id="tProg" min="0" max="100" step="5" value="${t.progress||0}"></div></div><div class="sp"></div>`}
      ${exam?`<div class="field"><label>Secciones</label><div class="hint" style="margin:-2px 0 6px">Nombre · minutos · repaso (va en los últimos ${S.settings.reviewDays} días) · hecho</div><div id="secList">${t.sections.map((s,i)=>`<div class="sec-row" data-i="${i}"><input type="text" value="${esc(s.name)}" data-f="name" placeholder="Sección"><input type="number" value="${s.estimateMin||0}" min="0" step="15" data-f="estimateMin"><label class="hint" style="white-space:nowrap"><input type="checkbox" data-f="review" ${s.review?'checked':''}> rep.</label><div style="display:flex;gap:6px;align-items:center"><input type="range" min="0" max="100" step="5" value="${s.progress||0}" data-f="progress"><span class="pct">${s.progress||0}%</span></div><button class="x" data-del="${i}" title="Quitar">✕</button></div>`).join('')}</div><div class="actions" style="margin-top:6px"><button class="btn sm" id="addSec">+ Sección</button><span class="hint">Total ${fmtDur(est)}${o.id?` · preparación ${progressOf(S.tasks[o.id])}%`:''}</span></div><div class="hint" style="margin-top:6px">Pídele a Claude que te proponga secciones a partir del temario de la asignatura.</div></div><div class="sp"></div>`:''}
      <details class="more" ${t.notes||t.checklist.length?'open':''}><summary>Notas y lista</summary><div>
        <div class="field"><label>Checklist</label><div id="chkList">${t.checklist.map((c,i)=>`<div class="chk-row" data-i="${i}"><input type="checkbox" ${c.done?'checked':''} data-f="done"><input type="text" value="${esc(c.text)}" data-f="text"><button class="x" data-del="${i}">✕</button></div>`).join('')}</div><button class="btn sm" id="addChk">+ Punto</button></div><div class="sp"></div>
        <div class="field"><label>Notas</label><textarea id="tNotes" rows="2">${esc(t.notes||'')}</textarea></div></div></details>
      ${o.id?`<div class="note">${progressOf(S.tasks[o.id])}% hecho · faltan ${fmtDur(remainingOf(S.tasks[o.id]))} · ${fmtDur(plannedFuture(t.id))} planificados</div>`:''}
      <div class="actions">${o.id?'<button class="btn danger" id="tDel">Borrar</button>':''}<span class="spacer"></span><button class="btn" id="tCancel">Cancelar</button><button class="btn primary" id="tSave">Guardar</button></div>`);
    const q=s=>sheet.querySelector(s); let prio=t.priority||1;
    sheet.querySelectorAll('#tPrio button').forEach(b=>b.onclick=()=>{ prio=+b.dataset.p; sheet.querySelectorAll('#tPrio button').forEach(x=>x.classList.toggle('active',x===b)); });
    const pull=()=>{ t.title=q('#tTitle').value.trim(); t.subjectId=q('#tSubj').value||null; t.priority=prio; t.due=q('#tNoDue').checked?null:(q('#tDue').value?`${q('#tDue').value}T${q('#tDueT').value||'23:59'}`:null); t.notes=q('#tNotes').value.trim();
      if(!exam){ t.estimateMin=(+q('#tH').value||0)*60+(+q('#tM').value||0); t.progress=+q('#tProg').value; }
      if(exam) sheet.querySelectorAll('.sec-row').forEach(r=>{ const s=t.sections[+r.dataset.i]; r.querySelectorAll('[data-f]').forEach(i=>{ const f=i.dataset.f; s[f]= f==='review'?i.checked : f==='name'?i.value : +i.value; }); });
      sheet.querySelectorAll('.chk-row').forEach(r=>{ const c=t.checklist[+r.dataset.i]; c.done=r.querySelector('[data-f=done]').checked; c.text=r.querySelector('[data-f=text]').value; }); };
    sheet.querySelectorAll('#kSeg button').forEach(b=>b.onclick=()=>{ pull(); t.kind=b.dataset.k; if(t.kind==='exam'){ t.typeId='examen'; if(!t.sections.length){ const H=t.estimateMin||(S.settings.defaultExamHours||6)*60; t.sections=[{id:uid(),name:'Teoría',estimateMin:Math.round(H*0.4/15)*15,progress:0,review:false},{id:uid(),name:'Práctica',estimateMin:Math.round(H*0.4/15)*15,progress:0,review:false},{id:uid(),name:'Repaso',estimateMin:Math.round(H*0.2/15)*15,progress:0,review:true}]; } } else t.typeId='entrega'; draw(); });
    q('#tNoDue').onchange=()=>{ q('#tDue').disabled=q('#tDueT').disabled=q('#tNoDue').checked; };
    if(!exam) q('#tProg').oninput=()=>q('#tPct').textContent=q('#tProg').value+'%';
    sheet.querySelectorAll('.sec-row input[type=range]').forEach(r=>r.oninput=()=>r.nextElementSibling.textContent=r.value+'%');
    if(exam){ q('#addSec').onclick=()=>{ pull(); t.sections.push({id:uid(),name:'',estimateMin:60,progress:0,review:false}); draw(); setTimeout(()=>sheet.querySelector('.sec-row:last-child input')?.focus(),0); }; sheet.querySelectorAll('.sec-row [data-del]').forEach(b=>b.onclick=()=>{ pull(); t.sections.splice(+b.dataset.del,1); draw(); }); }
    q('#addChk').onclick=()=>{ pull(); t.checklist.push({id:uid(),text:'',done:false}); draw(); sheet.querySelector('details.more').open=true; setTimeout(()=>sheet.querySelector('.chk-row:last-child [data-f=text]')?.focus(),0); };
    sheet.querySelectorAll('.chk-row [data-del]').forEach(b=>b.onclick=()=>{ pull(); t.checklist.splice(+b.dataset.del,1); draw(); });
    q('#tCancel').onclick=closeSheet;
    if(o.id) q('#tDel').onclick=async()=>{ if(!await askConfirm('¿Borrar la tarea y todos sus bloques de estudio?')) return; closeSheet(); await deleteTask(o.id); toast('Tarea borrada'); };
    q('#tSave').onclick=async()=>{ pull(); if(!t.title){ toast('Ponle un nombre'); return; } if(!t.due&&!q('#tNoDue').checked){ toast('Falta la fecha'); return; }
      const id=o.id||uid(); const prev=S.tasks[id]||{}; const rec={...prev,...t,id,typeId:t.kind==='exam'?'examen':(prev.typeId||'entrega'),done:prev.done||false,createdAt:prev.createdAt||nowIso()};
      const nI=nowIso();
      if(rec.kind!=='exam'&&(rec.progress||0)!==(prev.progress||0)) rec.progressAt=nI;
      if(rec.kind==='exam'){ rec.sections=rec.sections.map(s=>{ const ps=(prev.sections||[]).find(x=>x.id===s.id); return (ps&&(ps.progress||0)!==(s.progress||0))||(!ps&&s.progress)?{...s,progressAt:nI}:s; }); rec.estimateMin=rec.sections.reduce((a,s)=>a+(s.estimateMin||0),0); }
      if(rec.progress>=100&&rec.kind!=='exam') rec.done=true;
      beginBatch('ui'); await save('tasks',id,rec); closeSheet();
      if(rec.due&&!rec.done){ const changed=o.id&&(prev.due!==rec.due||estimateOf(prev)!==estimateOf(rec)||(prev.progress||0)!==(rec.progress||0)||JSON.stringify(prev.sections||[])!==JSON.stringify(rec.sections||[])); const plan=await autoPlan(true, changed?{taskIds:[id]}:{}); if(plan&&plan.unfit.some(u=>u.taskId===id)) toast('No cabe todo antes de la fecha: '+fmtDur(plan.unfit.filter(u=>u.taskId===id).reduce((a,u)=>a+u.remaining,0))+' sin sitio'); else toast('Guardada'); }
      else { for(const e of Object.values(S.events).filter(e=>e.taskId===id&&e.auto&&!e.locked&&!e.done&&e.start>=nI)) await remove('events',e.id); toast('Guardada'); }
      await writeLog(endBatch(o.id?'Tarea editada':'Tarea creada')); };
  };
  draw();
}

// ================= API interna (para Claude y depuración) =================
window.App = { S, C, $, esc, toast, askConfirm, save, remove, beginBatch, endBatch, writeLog, undoLog, describeChanges, autoPlan, computePlan:(o)=>C.computePlan(S,now(),o), render, openTaskEditor, openEventEditor, toggleDone, deleteTask, pracEnd, labelOf, colorOf, remainingOf, plannedFuture, progressOf, estimateOf, nowIso };

// ================= arranque =================
$$('.nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
$$('.view').forEach(s=>s.classList.toggle('active',s.id==='view-'+view));
I18N.set(I18N.lang); I18N.apply(document.body); I18N.observe(); $('#langBtn').onclick=()=>setLang(I18N.lang==='en'?'es':'en');
render(); connect();
let tickDay=dstr(new Date());
setInterval(()=>{ if(view==='week') renderWeek(); else if(view==='today') renderToday(); const d=dstr(new Date()); if(d!==tickDay){ tickDay=d; schedulePlan(); } },60000);
setInterval(()=>schedulePlan(),15*60000);
})();
