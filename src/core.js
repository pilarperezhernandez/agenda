/* Agenda — núcleo puro (sin DOM). Funciona en navegador (window.Core) y en Node (module.exports).
   Todo recibe el estado S = {settings, subjects, types, classes, events, tasks, dayrules, rules} y la hora actual. */
(function(root, factory){
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function(){
'use strict';

// ---------- fechas ----------
const pad = n => String(n).padStart(2,'0');
const DOW = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DOWL = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MON = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const tstr = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const iso = d => `${dstr(d)}T${tstr(d)}`;
const parse = s => { const [a,b] = String(s).split('T'); const [y,m,d] = a.split('-').map(Number); const [h,mi] = (b||'00:00').split(':').map(Number); return new Date(y,m-1,d,h||0,mi||0,0,0); };
const mins = t => { const [h,m]=String(t).split(':').map(Number); return h*60+m; };
const tfromMins = m => `${pad(Math.floor(m/60))}:${pad(m%60)}`;
const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const startOfWeek = d => { const x=new Date(d); x.setHours(0,0,0,0); const k=(x.getDay()+6)%7; return addDays(x,-k); };
const sameDay = (a,b) => dstr(a)===dstr(b);
const dayOf = s => parse(String(s).slice(0,10)+'T00:00');
const r15 = m => Math.ceil(m/15)*15;
let LOCALE='es';
const fmtDur = m => { m=Math.round(m); if(m<=0) return '0 min'; return m>=60 ? (m%60? `${Math.floor(m/60)} h ${m%60} min` : `${m/60} h`) : `${m} min`; };
const fmtDate = s => { const d=parse(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].slice(0,3)}`; };
const fmtDateLong = s => { const d=parse(s); return LOCALE==='en' ? `${DOWL[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}` : `${DOWL[d.getDay()]} ${d.getDate()} de ${MON[d.getMonth()]}`; };
const durOf = e => (parse(e.end)-parse(e.start))/60000;
const overlaps = (a0,a1,b0,b1) => a0<b1 && a1>b0;
const uid = () => (typeof crypto!=='undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0,8) : Math.random().toString(36).slice(2,10));

// ---------- valores por defecto ----------
const LOCALES = {
  es:{ DOW:['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], DOWL:['domingo','lunes','martes','miércoles','jueves','viernes','sábado'], MON:['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'], STYLE_LABEL:{ clase:'Clase', lab:'Laboratorio', estudio:'Estudio', entrega:'Entrega', examen:'Examen', practicas:'Trabajo', personal:'Personal', cita:'Cita', bloqueo:'No disponible' }, RULES_DAY:{ noexam:'Sin exámenes', examonly:'Solo exámenes', light:'Día ligero', free:'Libre' } },
  en:{ DOW:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], DOWL:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], MON:['January','February','March','April','May','June','July','August','September','October','November','December'], STYLE_LABEL:{ clase:'Class', lab:'Lab', estudio:'Study', entrega:'Deliverable', examen:'Exam', practicas:'Work', personal:'Personal', cita:'Appointment', bloqueo:'Unavailable' }, RULES_DAY:{ noexam:'No exams', examonly:'Exams only', light:'Light day', free:'Free' } },
};
function setLocale(l){ const L=LOCALES[l]||LOCALES.es; LOCALE=L===LOCALES.en?'en':'es'; DOW.splice(0,7,...L.DOW); DOWL.splice(0,7,...L.DOWL); MON.splice(0,12,...L.MON); Object.assign(STYLE_LABEL,L.STYLE_LABEL); Object.assign(RULES_DAY,L.RULES_DAY); }
const getLocale = () => LOCALE;

const DEFAULT_SETTINGS = {
  weekday:['09:00','22:00'], weekend:['10:00','21:00'], weekdaySoftEnd:'20:30', weekendSoftEnd:'20:00',
  blockMax:120, blockMin:45, breakMin:10, dailyCap:420, maxSubjectsPerDay:3, concentrate:true,
  colorBy:'subject', gridStart:7, gridEnd:24,
  commuteMin:60, commutePracMin:30, campusLeave:'20:05', campusWaitMax:90, campusName:'Campus', workName:'', workStart:'09:00', workPlace:'',
  reviewDays:2, defaultExamHours:7,
  freezeDays:1,            // hoy + N días siguientes no se tocan (salvo conflicto)
  pastCountsAsDone:true,   // un bloque pasado sin marcar cuenta como hecho
  warnHours:48,            // aviso cuando algo vence en N horas sin tener todo planificado
};
const RULES_DAY = { noexam:'Sin exámenes', examonly:'Solo exámenes', light:'Día ligero', free:'Libre' };

// Estilos visuales fijos por tipo. Cada tipo de la BD lleva `style`; si no, se deduce del id.
const STYLES = ['clase','lab','estudio','entrega','examen','practicas','personal','cita','bloqueo'];
const STYLE_LABEL = { clase:'Clase', lab:'Laboratorio', estudio:'Estudio', entrega:'Entrega', examen:'Examen', practicas:'Trabajo', personal:'Personal', cita:'Cita', bloqueo:'No disponible' };
function styleOf(S, typeId){
  const t = S.types && S.types[typeId];
  if (t && t.style && STYLES.includes(t.style)) return t.style;
  if (typeId==='laboratorio') return 'lab';
  if (STYLES.includes(typeId)) return typeId;
  return 'personal';
}

// ---------- acceso ----------
const subj = (S,id) => (S.subjects||{})[id];
const typ = (S,id) => (S.types||{})[id];
const shortOf = (S,id) => { const s=subj(S,id); return s ? (s.short||s.name) : ''; };
function colorOf(S,x){ const s=subj(S,x.subjectId), t=typ(S,x.typeId); const st=styleOf(S,x.typeId);
  // cosas sin asignatura o de tipo "propio" (prácticas, bloqueo, cita, personal) toman el color del tipo
  if (S.settings.colorBy==='type' || !s || ['practicas','bloqueo','cita','personal'].includes(st)) return (t&&t.color)||(s&&s.color)||'#6B7188';
  return s.color||(t&&t.color)||'#6B7188'; }
// Nombre canónico: "qué · Asignatura"
function whatOf(S,x){
  if (x.kind==='class'){ const st=styleOf(S,x.typeId); return x.title || STYLE_LABEL[st] || STYLE_LABEL.clase; }
  if (x.taskId && S.tasks && S.tasks[x.taskId]){ const t=S.tasks[x.taskId]; const sec=(t.sections||[]).find(s=>s.id===x.sectionId); return t.title + (sec?' · '+sec.name:''); }
  return x.title || STYLE_LABEL[styleOf(S,x.typeId)] || (LOCALE==='en'?'Event':'Evento');
}
function labelOf(S,x){ const w=whatOf(S,x); const sh=shortOf(S,x.subjectId); return sh && !w.endsWith('· '+sh) ? `${w} · ${sh}` : w; }

// ---------- ocurrencias ----------
function classesOn(S,date){
  const ds=dstr(date), dow=(date.getDay()===0?7:date.getDay()); const out=[];
  for(const c of Object.values(S.classes||{})){
    if(c.dow!==dow) continue; if(c.from&&ds<c.from) continue; if(c.until&&ds>c.until) continue; if((c.skip||[]).includes(ds)) continue;
    out.push({ id:c.id+'@'+ds, kind:'class', classId:c.id, title:c.title||'', subjectId:c.subjectId, typeId:c.typeId||'clase', start:`${ds}T${c.start}`, end:`${ds}T${c.end}`, location:c.room||'', notes:c.notes||'' });
  }
  return out;
}
function eventsOn(S,date,exclude){ const ds=dstr(date); return Object.values(S.events||{}).filter(e=>e.start&&e.start.slice(0,10)===ds&&!(exclude&&exclude.has(e.id))).map(e=>({...e,kind:'event'})); }
function itemsOn(S,date,exclude){ return [...classesOn(S,date),...eventsOn(S,date,exclude)].sort((a,b)=>a.start<b.start?-1:a.start>b.start?1:0); }
const isBlock = (S,e) => styleOf(S,e.typeId)==='bloqueo';
const isStudy = (S,e) => e.kind!=='class' && (!!e.taskId || styleOf(S,e.typeId)==='estudio');
const isCampus = (S,e) => !e.allDay && e.kind!=='event-noncampus' && !isBlock(S,e) && (e.kind==='class' || ['clase','lab','examen'].includes(styleOf(S,e.typeId)));
const isPrac = (S,e) => styleOf(S,e.typeId)==='practicas';
function leaveCampusAt(S,lastEnd){ const cl=S.settings.campusLeave?mins(S.settings.campusLeave):0, w=S.settings.campusWaitMax??90; return (cl&&lastEnd<cl&&cl-lastEnd<=w)?cl:lastEnd; }
function campusOn(S,date){ return itemsOn(S,date).filter(e=>isCampus(S,e)); }
function campusStudyWindow(S,date){ const campus=campusOn(S,date); if(!campus.length) return null; const last=Math.max(...campus.map(e=>mins(e.end.slice(11)))), dep=leaveCampusAt(S,last); return dep>last?[last,dep]:null; }
// franjas de desplazamiento del día: [[min0,min1],...]
function travelOn(S,date){
  const c=S.settings.commuteMin||0, cp=S.settings.commutePracMin||0; const out=[];
  const items=itemsOn(S,date).filter(e=>!e.allDay);
  const campus=items.filter(e=>isCampus(S,e));
  const prac=items.filter(e=>isPrac(S,e));
  if(prac.length&&cp){ const ps=Math.min(...prac.map(e=>mins(e.start.slice(11)))), pe=Math.max(...prac.map(e=>mins(e.end.slice(11)))); out.push([ps-cp,ps]); if(!campus.length) out.push([pe,pe+cp]); }
  if(campus.length&&c){ const first=Math.min(...campus.map(e=>mins(e.start.slice(11)))), last=Math.max(...campus.map(e=>mins(e.end.slice(11)))), dep=leaveCampusAt(S,last); out.push([first-c,first],[dep,dep+c]); }
  for(const e of items){ const tb=+e.travelBefore||0, ta=+e.travelAfter||0;
    if(tb>0){ const s0=mins(e.start.slice(11)); out.push([Math.max(0,s0-tb),s0]); }
    if(ta>0){ const e0=mins(e.end.slice(11)); out.push([e0,Math.min(24*60,e0+ta)]); } }
  return out;
}
function tasksDueOn(S,date){ const ds=dstr(date); return Object.values(S.tasks||{}).filter(t=>t.due&&t.due.slice(0,10)===ds); }
const ruleOf = (S,ds) => { const r=(S.dayrules||{})[ds]; return r&&r.mode?r.mode:null; };
const isExam = t => t.kind==='exam';
const isDeliv = t => !isExam(t)&&(t.typeId||'entrega')==='entrega';

// ---------- progreso ----------
// minutos trabajados de una tarea/sección: bloques marcados hechos (con su fracción) o ya pasados (si pastCountsAsDone), salvo "no lo hice"
function workedMins(S, taskId, sectionId, since, nowIso){
  const pcd = S.settings.pastCountsAsDone ?? true;
  return Object.values(S.events||{}).filter(e=>e.taskId===taskId&&(sectionId===undefined||(e.sectionId||null)===(sectionId||null))&&!e.skipped&&(e.done||(pcd&&e.end<=nowIso))&&(!since||e.end>since))
    .reduce((a,e)=>a+durOf(e)*(e.done&&e.doneFrac!=null?e.doneFrac:1),0);
}
function effProgress(est, manual, worked, additive){ if(!est) return manual||0; const w=Math.round(worked/est*100); return Math.min(100, additive ? (manual||0)+w : Math.max(manual||0, w)); }
function unitsOf(S,t,nowIso){
  if(isExam(t)&&(t.sections||[]).length) return t.sections.map(s=>{ const est=s.estimateMin||0, p=effProgress(est,s.progress,workedMins(S,t.id,s.id,s.progressAt,nowIso),!!s.progressAt); return {taskId:t.id,sectionId:s.id,name:s.name,estimate:est,progress:p,remaining:r15(est*(1-p/100)),review:!!s.review}; });
  const est=t.estimateMin||60, p=effProgress(est,t.progress,workedMins(S,t.id,null,t.progressAt,nowIso),!!t.progressAt);
  return [{taskId:t.id,sectionId:null,name:null,estimate:est,progress:p,remaining:r15(est*(1-p/100)),review:false}];
}
function estimateOf(t){ return isExam(t)&&(t.sections||[]).length ? t.sections.reduce((a,s)=>a+(s.estimateMin||0),0) : (t.estimateMin||0); }
function progressOf(S,t,nowIso){ if(t.done) return 100; const us=unitsOf(S,t,nowIso); const tot=us.reduce((a,u)=>a+u.estimate,0)||1; return Math.round(us.reduce((a,u)=>a+u.estimate*u.progress/100,0)/tot*100); }
function remainingOf(S,t,nowIso){ return unitsOf(S,t,nowIso).reduce((a,u)=>a+u.remaining,0); }
function plannedFuture(S,taskId,sectionId,nowIso){ return Object.values(S.events||{}).filter(e=>e.taskId===taskId&&(sectionId===undefined||(e.sectionId||null)===(sectionId||null))&&e.end>nowIso&&!e.done&&!e.skipped).reduce((a,e)=>a+durOf(e),0); }
// tareas que vencen pronto y no tienen todo el tiempo que falta planificado
function warnings(S, now){
  const nowIso=iso(now), lim=iso(new Date(now.getTime()+(S.settings.warnHours||48)*3600000)); const out=[];
  for(const t of Object.values(S.tasks||{})){ if(t.done||!t.due) continue;
    const rem=remainingOf(S,t,nowIso), pl=plannedFuture(S,t.id,undefined,nowIso);
    if(t.due<nowIso) { if(rem>0) out.push({taskId:t.id,kind:'overdue',title:t.title,missing:rem}); continue; }
    if(t.due<=lim && rem-pl>=15) out.push({taskId:t.id,kind:'soon',title:t.title,missing:rem-pl,due:t.due}); }
  return out;
}

// ---------- reglas situacionales (colección rules) ----------
// kinds: order {beforeTaskId, afterTaskId} · focus {date, zone:'am'|'pm'|'day', subjectId?, taskId?}
//        avoid {from, until, subjectId?, taskId?} · window {taskId, from, until}
function activeRules(S, now){
  const today=dstr(now); const out=[];
  for(const r of Object.values(S.rules||{})){
    if(r.active===false) continue;
    if(r.kind==='focus' && r.date < today) continue;
    if((r.kind==='avoid'||r.kind==='window') && r.until && r.until < today) continue;
    if(r.kind==='order'){ const b=S.tasks[r.beforeTaskId], a=S.tasks[r.afterTaskId]; if(!b||!a||b.done) continue; }
    out.push(r);
  }
  return out;
}
function ruleText(S,r){
  const tn=id=>S.tasks[id]?S.tasks[id].title:'?', sn=id=>shortOf(S,id)||'?';
  const what=r.taskId?tn(r.taskId):r.subjectId?sn(r.subjectId):'';
  if(LOCALE==='en'){
    if(r.kind==='order') return `Finish “${tn(r.beforeTaskId)}” before starting “${tn(r.afterTaskId)}”`;
    if(r.kind==='focus') return `${fmtDate(r.date+'T00:00')} ${r.zone==='am'?'in the morning':r.zone==='pm'?'in the evening':'all day'}: only ${what}`;
    if(r.kind==='avoid') return `No ${what} ${r.from===r.until?'on '+fmtDate(r.from+'T00:00'):`from ${fmtDate(r.from+'T00:00')} to ${fmtDate(r.until+'T00:00')}`}`;
    if(r.kind==='window') return `“${tn(r.taskId)}” only between ${fmtDate(r.from+'T00:00')} and ${fmtDate(r.until+'T00:00')}`;
  }
  if(r.kind==='order') return `Terminar «${tn(r.beforeTaskId)}» antes de empezar «${tn(r.afterTaskId)}»`;
  if(r.kind==='focus') return `${fmtDate(r.date+'T00:00')} ${r.zone==='am'?'por la mañana':r.zone==='pm'?'por la tarde-noche':'todo el día'}: solo ${what}`;
  if(r.kind==='avoid') return `Nada de ${what} ${r.from===r.until?'el '+fmtDate(r.from+'T00:00'):`del ${fmtDate(r.from+'T00:00')} al ${fmtDate(r.until+'T00:00')}`}`;
  if(r.kind==='window') return `«${tn(r.taskId)}» solo entre ${fmtDate(r.from+'T00:00')} y ${fmtDate(r.until+'T00:00')}`;
  return r.text||r.kind;
}
function ruleExpired(S,r,now){ return !activeRules(S,now).some(x=>x.id===r.id); }

// ---------- planificador ----------
function windowsFor(S,date,soft){
  const wk=(date.getDay()===0||date.getDay()===6); const av=S.settings[wk?'weekend':'weekday']; let a0=mins(av[0]), a1=mins(av[1]);
  if(soft){ const se=S.settings[wk?'weekendSoftEnd':'weekdaySoftEnd']; if(se) a1=Math.min(a1,mins(se)); }
  return [a0,a1];
}
const classSubs = (S,d) => new Set(itemsOn(S,d).filter(e=>!e.allDay&&(e.kind==='class'||['clase','lab'].includes(styleOf(S,e.typeId)))&&e.subjectId).map(e=>e.subjectId));
function zonesOf(S,d){
  const campus=campusOn(S,d).filter(e=>!e.allDay); if(!campus.length) return null;
  const first=Math.min(...campus.map(e=>mins(e.start.slice(11)))), dep=leaveCampusAt(S,Math.max(...campus.map(e=>mins(e.end.slice(11)))));
  return { first, dep, am:classSubs(S,d), pm:classSubs(S,addDays(d,1)) };
}
// zona de un intervalo: 'am' si acaba antes de la primera clase, 'pm' si empieza tras salir del campus; sin clases: mañana <14h, tarde >=14h
const zoneAt=(z,a,b)=>z?(b<=z.first?'am':(a>=z.dep?'pm':null)):(b<=14*60?'am':(a>=14*60?'pm':null));
function gapsOf(S,date,busy,soft,isToday,now){
  let [a0,a1]=windowsFor(S,date,soft); const s=S.settings;
  if(isToday){ a0=Math.max(a0,Math.ceil((now.getHours()*60+now.getMinutes())/15)*15); }
  const b=[...busy].sort((x,y)=>x[0]-y[0]); const gaps=[]; let cur=a0;
  for(const [bs,be] of b){ if(be<=cur) continue; if(bs>cur) gaps.push([cur,Math.min(bs,a1)]); cur=Math.max(cur,be+s.breakMin); if(cur>=a1) break; }
  if(cur<a1) gaps.push([cur,a1]);
  return gaps.filter(g=>g[1]-g[0]>=20);
}
function freezeUntil(S, now){ const d=new Date(now); d.setHours(0,0,0,0); return iso(addDays(d,(S.settings.freezeDays??1)+1)); }

/* computePlan(S, now, opts) → {add, removeIds, unfit, displaced, notes}
   opts.taskIds: solo replanificar estas tareas (sus bloques automáticos no fijados ni congelados se rehacen)
   opts.force:   rehacer todos los bloques automáticos no fijados ni congelados
   Por defecto es INCREMENTAL: los bloques que ya hay se quedan donde están; solo se añade lo que falta,
   se quitan los que sobran (tarea hecha, tiempo de más) y se recolocan los que pisan algo fijo. */
function computePlan(S, now, opts={}){
  const s=S.settings, nowIso=iso(now); const today=new Date(now); today.setHours(0,0,0,0);
  const frz=freezeUntil(S,now), soonIso=iso(new Date(now.getTime()+120*60000));
  const only = opts.taskIds ? new Set(opts.taskIds) : null;
  const rules=activeRules(S,now);
  const notes=[], displaced=[];
  const tasksAll=Object.values(S.tasks||{});
  const taskBlocks=Object.values(S.events||{}).filter(e=>e.taskId);

  // --- 1. qué se quita
  const excl=new Set();
  const dropReason={};
  const fixedBusy={}; // por día: clases, eventos sin tarea, bloqueos, trayectos
  const fixedOn=ds=>{ if(!fixedBusy[ds]){ const d=dayOf(ds); fixedBusy[ds]=[...itemsOn(S,d).filter(e=>!e.allDay&&!e.taskId).map(e=>[mins(e.start.slice(11)),mins(e.end.slice(11))]),...travelOn(S,d)]; } return fixedBusy[ds]; };
  const hitsFixed=e=>{ const a=mins(e.start.slice(11)), b=mins(e.end.slice(11)); return fixedOn(e.start.slice(0,10)).some(([t0,t1])=>overlaps(a,b,t0,t1)); };
  const violatesRule=e=>{ const t=S.tasks[e.taskId]; if(!t) return false; const ds=e.start.slice(0,10), a=mins(e.start.slice(11)), b=mins(e.end.slice(11));
    for(const r of rules){
      if(r.kind==='focus'&&r.date===ds){ const z=zoneAt(zonesOf(S,dayOf(ds)),a,b); if(r.zone==='day'||z===r.zone||z===null){ const ok=(r.taskId&&r.taskId===t.id)||(r.subjectId&&!r.taskId&&r.subjectId===t.subjectId); if(!ok) return true; } }
      if(r.kind==='avoid'&&ds>=r.from&&ds<=r.until){ if((r.taskId&&r.taskId===t.id)||(r.subjectId&&!r.taskId&&r.subjectId===t.subjectId)) return true; }
      if(r.kind==='window'&&r.taskId===t.id&&(ds<r.from||ds>r.until)) return true;
    } return false; };
  for(const e of taskBlocks){
    const t=S.tasks[e.taskId];
    if(e.done||e.skipped||e.end<=nowIso) continue;                       // pasado: se queda
    if(!t||t.done){ excl.add(e.id); dropReason[e.id]='tarea hecha o borrada'; continue; }
    const rd=ruleOf(e.start.slice(0,10));
    if(hitsFixed(e)||rd==='free'||(rd==='noexam'&&isExam(t))||(rd==='examonly'&&!isExam(t))||violatesRule(e)){ excl.add(e.id); dropReason[e.id]='conflicto'; if(e.locked||e.start<frz) displaced.push({id:e.id,title:labelOf(S,e),start:e.start,end:e.end,locked:!!e.locked}); continue; }
    if(e.locked) continue;                                                // fijado: no se toca
    if(e.start<frz&&e.start<soonIso) continue;                            // ya mismo: no se toca
    if(e.start<frz&&!(only&&only.has(e.taskId))&&!opts.force) continue;   // congelado (hoy+mañana)
    if(opts.force||(only&&only.has(e.taskId))){ if(e.auto) { excl.add(e.id); dropReason[e.id]='replanificar'; } }
  }
  // solapes entre bloques de tareas que se quedan (p. ej. dos fijados a la vez): el posterior en crearse se recoloca
  {
    const kept=taskBlocks.filter(e=>!excl.has(e.id)&&e.end>nowIso&&!e.done&&!e.skipped).sort((a,b)=>a.start<b.start?-1:1);
    for(let i=0;i<kept.length;i++) for(let j=i+1;j<kept.length;j++){ const a=kept[i], b=kept[j]; if(a.start.slice(0,10)!==b.start.slice(0,10)) continue; if(excl.has(a.id)||excl.has(b.id)) continue;
      if(overlaps(mins(a.start.slice(11)),mins(a.end.slice(11)),mins(b.start.slice(11)),mins(b.end.slice(11)))){ const v=(a.locked&&!b.locked)?b:(b.locked&&!a.locked)?a:((a.createdAt||'')<=(b.createdAt||'')?b:a); excl.add(v.id); dropReason[v.id]='solape'; displaced.push({id:v.id,title:labelOf(S,v),start:v.start,end:v.end,locked:!!v.locked}); } }
  }
  // tiempo de más: si lo planificado supera lo que falta, se quitan los bloques automáticos más tardíos
  const keptOf=(tid,sid)=>taskBlocks.filter(e=>e.taskId===tid&&(e.sectionId||null)===(sid||null)&&!excl.has(e.id)&&!e.done&&!e.skipped&&e.end>nowIso);
  const unitsAll=[];
  for(const t of tasksAll){ if(t.done||!t.due) continue; for(const u of unitsOf(S,t,nowIso)) unitsAll.push({...u,task:t}); }
  for(const u of unitsAll){ let kept=keptOf(u.taskId,u.sectionId); let plannedMin=kept.reduce((a,e)=>a+durOf(e),0);
    if(plannedMin>u.remaining+20){ for(const e of kept.filter(e=>e.auto&&!e.locked&&e.start>=frz).sort((a,b)=>a.start<b.start?1:-1)){ if(plannedMin<=u.remaining) break; excl.add(e.id); dropReason[e.id]='sobra tiempo'; plannedMin-=durOf(e); } } }

  // --- 2. ocupación y cargas con lo que se queda
  const busy={}, load={}, placed={};
  const busyOn=ds=>{ if(!busy[ds]){ const d=dayOf(ds); busy[ds]=[...itemsOn(S,d,excl).filter(e=>!e.allDay).map(e=>[mins(e.start.slice(11)),mins(e.end.slice(11))]),...travelOn(S,d)]; } return busy[ds]; };
  const remainingBlocks=taskBlocks.filter(e=>!excl.has(e.id)&&!e.done&&!e.skipped&&e.start>=nowIso);
  for(const e of remainingBlocks){ const ds=e.start.slice(0,10); load[ds]=(load[ds]||0)+durOf(e); }
  const sKey=x=>x.subjectId||x.taskId||x.id;
  const subjDay={}; for(const e of remainingBlocks){ const ds=e.start.slice(0,10); (subjDay[ds]=subjDay[ds]||new Set()).add(sKey(e)); }
  const zc={}, zoneOn=ds=>(ds in zc)?zc[ds]:(zc[ds]=zonesOf(S,dayOf(ds)));
  const zoneSubj={}; for(const e of remainingBlocks){ const ds=e.start.slice(0,10), z=zoneAt(zoneOn(ds),mins(e.start.slice(11)),mins(e.end.slice(11))); if(z&&!zoneSubj[ds+'|'+z]) zoneSubj[ds+'|'+z]=sKey(e); }
  const lastEndOfTask={}; for(const e of taskBlocks) if(!excl.has(e.id)&&!e.skipped){ const k=e.taskId; if(!lastEndOfTask[k]||e.end>lastEndOfTask[k]) lastEndOfTask[k]=e.end; }

  // --- 3. unidades a colocar
  const units=[]; for(const u of unitsAll){ const rem=u.remaining-keptOf(u.taskId,u.sectionId).reduce((a,e)=>a+durOf(e),0); if(rem>=20) units.push({...u,remaining:rem}); }
  // orden: reglas "antes de" (topológico) → prioridad urgente → fecha → prioridad
  const orderRules=rules.filter(r=>r.kind==='order');
  const befores=id=>orderRules.filter(r=>r.afterTaskId===id).map(r=>r.beforeTaskId);
  const depth={}; const dep=(id,seen=new Set())=>{ if(id in depth) return depth[id]; if(seen.has(id)) return 0; seen.add(id); const bs=befores(id); const d=bs.length?1+Math.max(...bs.map(b=>dep(b,seen))):0; depth[id]=d; return d; };
  units.sort((a,b)=>{ const da=dep(a.taskId), db=dep(b.taskId); if(da!==db) return da-db;
    const pa=a.task.priority||1, pb=b.task.priority||1; if(pa===3&&pb!==3) return -1; if(pb===3&&pa!==3) return 1;
    if((isDeliv(b.task)?1:0)!==(isDeliv(a.task)?1:0)) return (isDeliv(b.task)?1:0)-(isDeliv(a.task)?1:0);
    if(a.task.due!==b.task.due) return a.task.due<b.task.due?-1:1; return pb-pa; });
  const minLen=Math.max(15,s.blockMin||45);
  const add=[], unfit=[];
  const focusOn=(ds)=>rules.filter(r=>r.kind==='focus'&&r.date===ds);
  const allowedBy=(u,ds,z)=>{ // reglas focus/avoid/window
    for(const r of focusOn(ds)){ if(r.zone==='day'||r.zone===z||z===null){ const ok=(r.taskId&&r.taskId===u.taskId)||(r.subjectId&&!r.taskId&&r.subjectId===u.task.subjectId); if(!ok) return false; } }
    for(const r of rules){ if(r.kind==='avoid'&&ds>=r.from&&ds<=r.until&&((r.taskId&&r.taskId===u.taskId)||(r.subjectId&&!r.taskId&&r.subjectId===u.task.subjectId))) return false;
      if(r.kind==='window'&&r.taskId===u.taskId&&(ds<r.from||ds>r.until)) return false; }
    return true; };
  const earliestStart=u=>{ let m=null; for(const b of befores(u.taskId)){ const t=S.tasks[b]; if(!t||t.done) continue; const le=lastEndOfTask[b]; if(le&&(!m||le>m)) m=le; else if(!le&&!m) m=iso(addDays(today,3650)); } return m; };

  const place=(u,d,soft,perDayTarget,relaxed,pref)=>{
    const ds=dstr(d), rd=ruleOf(ds); if(rd==='free') return; if(rd==='noexam'&&isExam(u.task)) return; if(rd==='examonly'&&!isExam(u.task)) return;
    if(ds<nowIso.slice(0,10)) return;
    const es=earliestStart(u); if(es&&es.slice(0,10)>ds) return;
    const sd=subjDay[ds]=subjDay[ds]||new Set(), sk=sKey(u.task);
    const focused=focusOn(ds).some(r=>(r.taskId&&r.taskId===u.taskId)||(r.subjectId&&r.subjectId===u.task.subjectId));
    if(!relaxed&&!focused&&!sd.has(sk)&&sd.size>=(s.maxSubjectsPerDay||3)) return;
    const need=()=>Math.min(minLen,u.remaining);
    const capAll=(rd==='light'?s.dailyCap/2:s.dailyCap); let cap=capAll-(load[ds]||0); if(cap<need()&&!focused) return; if(focused) cap=Math.max(cap,u.remaining);
    const key=ds+'|'+u.taskId+'|'+u.sectionId;
    let want=Math.min(perDayTarget-(placed[key]||0), u.remaining, cap);
    if(u.remaining-want>0&&u.remaining-want<minLen) want=Math.min(u.remaining,cap);
    if(want<need()) return;
    const dueD=parse(u.task.due); const isDue=sameDay(d,dueD); const cw=campusStudyWindow(S,d);
    for(let [g0,g1] of gapsOf(S,d,busyOn(ds),soft,sameDay(d,now),now)){
      if(isDue) g1=Math.min(g1,mins(u.task.due.slice(11)));
      if(es&&es.slice(0,10)===ds) g0=Math.max(g0,mins(es.slice(11))+s.breakMin);
      if(g1-g0<need()) continue;
      const zn=zoneAt(zoneOn(ds),g0,g1), zk=ds+'|'+zn;
      if(!allowedBy(u,ds,zn)) continue;
      if(zn&&zoneOn(ds)){ if(!relaxed&&!focused&&zoneSubj[zk]&&zoneSubj[zk]!==sk) continue;
        if(pref&&!isDeliv(u.task)&&(u.task.priority||1)<3&&!zoneOn(ds)[zn].has(u.task.subjectId)) continue; }
      let t=g0, run=0;
      while(true){
        const room=Math.min(cap,g1-t);
        let len=Math.min(s.blockMax,want,room);
        if(u.remaining-len>0&&u.remaining-len<minLen) len=(room>=u.remaining&&u.remaining<=s.blockMax+minLen)?u.remaining:u.remaining-minLen;
        len=Math.min(len,room); len=Math.floor(len/5)*5;
        if(len<=0||len<need()) break;
        const onCampus=cw&&t>=cw[0]&&t+len<=cw[1];
        const b={id:uid(),subjectId:u.task.subjectId,typeId:'estudio',taskId:u.taskId,sectionId:u.sectionId||null,auto:true,start:`${ds}T${tfromMins(t)}`,end:`${ds}T${tfromMins(t+len)}`,location:onCampus?(s.campusName||'ICAI'):'',createdAt:nowIso};
        add.push(b); busyOn(ds).push([t,t+len]); sd.add(sk); if(zn&&!zoneSubj[zk]) zoneSubj[zk]=sk;
        u.remaining-=len; want-=len; cap-=len; load[ds]=(load[ds]||0)+len; placed[key]=(placed[key]||0)+len;
        if(!lastEndOfTask[u.taskId]||b.end>lastEndOfTask[u.taskId]) lastEndOfTask[u.taskId]=b.end;
        t+=len; run+=len; if(run>=s.blockMax){ t+=s.breakMin; run=0; }
        if(u.remaining<=0||want<need()||cap<need()||!(s.concentrate??true)) break;
      }
      if(u.remaining<=0||want<need()||cap<need()) break;
    }
  };
  const windowOf=u=>{
    const dueD=parse(u.task.due); const dueDay=new Date(dueD); dueDay.setHours(0,0,0,0);
    let first=new Date(today), last=new Date(dueDay);
    if(dueDay<today) last=addDays(today,s.overdueDays??7);   // atrasada: cuanto antes, en los próximos días
    else if(isExam(u.task)){ const rd=Math.min(s.reviewDays||0, Math.max(0,Math.round((dueDay-today)/86400000)));
      if(u.review) first=addDays(dueDay,-rd); else last=addDays(dueDay,-(rd+1)); if(last<first) last=new Date(dueDay); if(first<today) first=new Date(today); }
    for(const r of rules) if(r.kind==='window'&&r.taskId===u.taskId){ const f=dayOf(r.from), l=dayOf(r.until); if(f>first) first=f; if(l<last) last=l; }
    const es=earliestStart(u); if(es){ const d=dayOf(es); if(d>first) first=d; }
    const ndays=Math.max(1,Math.round((last-first)/86400000)+1);
    const sesLen=(s.concentrate??true)?Math.max(s.blockMax,s.dailyCap||300):Math.max(minLen,s.blockMax);
    const nSes=Math.max(1,Math.ceil(u.remaining/sesLen));
    const target=Math.max(minLen,Math.min(sesLen,Math.ceil(u.remaining/nSes/5)*5));
    const step=isExam(u.task)?Math.max(1,Math.floor(ndays/nSes)):1;
    return {first,ndays,target,step};
  };
  const runPass=(u)=>{
    for(const soft of [true,false]){ for(const pref of [true,false]){ if(u.remaining<=0) return;
      const {first,ndays,target,step}=windowOf(u);
      for(let k=0;k<ndays&&u.remaining>0;k+=step) place(u,addDays(first,k),soft,target,false,pref);
      if(u.remaining>0) for(let k=0;k<ndays&&u.remaining>0;k++) place(u,addDays(first,k),soft,target,false,pref);
      if(u.remaining>0) for(let k=0;k<ndays&&u.remaining>0;k++) place(u,addDays(first,k),soft,target*2,false,pref); }
      if(u.remaining>0){ const {first,ndays,target}=windowOf(u); for(let k=0;k<ndays&&u.remaining>0;k++) place(u,addDays(first,k),soft,target*2,true,false); } }
  };
  for(const u of units) runPass(u);

  // --- 4. si algo no cabe antes de su fecha, hace sitio quitando bloques automáticos de tareas con fecha posterior
  //        (no fijados, no congelados) dentro de su ventana, y los recoloca después
  const bumped=new Set();
  for(const u of units){ if(u.remaining<=0) continue;
    const dueDs=u.task.due.slice(0,10);
    const victims=taskBlocks.filter(e=>!excl.has(e.id)&&e.auto&&!e.locked&&!e.done&&!e.skipped&&e.start>=frz&&e.start.slice(0,10)<=dueDs&&S.tasks[e.taskId]&&!S.tasks[e.taskId].done&&(S.tasks[e.taskId].due>u.task.due||((S.tasks[e.taskId].priority||1)<(u.task.priority||1))))
      .sort((a,b)=>a.start<b.start?1:-1);
    for(const v of victims){ if(u.remaining<=0) break; excl.add(v.id); dropReason[v.id]='hace sitio'; bumped.add(v.taskId);
      const ds=v.start.slice(0,10); busy[ds]=null; load[ds]=(load[ds]||0)-durOf(v); for(const k of Object.keys(zoneSubj)) if(k.startsWith(ds+'|')) delete zoneSubj[k]; delete subjDay[ds];
      // reconstruir ocupación del día con add
      busyOn(ds); for(const b of add) if(b.start.slice(0,10)===ds) busyOn(ds).push([mins(b.start.slice(11)),mins(b.end.slice(11))]);
      subjDay[ds]=new Set([...remainingBlocks.filter(e=>!excl.has(e.id)&&e.start.slice(0,10)===ds),...add.filter(b=>b.start.slice(0,10)===ds)].map(sKey));
      runPass(u); }
  }
  if(bumped.size){ for(const tid of bumped){ const t=S.tasks[tid]; for(const u0 of unitsOf(S,t,nowIso)){ const rem=u0.remaining-keptOf(tid,u0.sectionId).reduce((a,e)=>a+durOf(e),0)-add.filter(b=>b.taskId===tid&&(b.sectionId||null)===(u0.sectionId||null)).reduce((a,b)=>a+durOf(b),0); if(rem>=20){ const u={...u0,task:t,remaining:rem}; runPass(u); if(u.remaining>0) unfit.push({taskId:tid,title:t.title+(u.name?' · '+u.name:''),remaining:u.remaining}); } } } }

  relayout(S,add,excl,now);
  for(const u of units) if(u.remaining>0) unfit.push({taskId:u.taskId,title:u.task.title+(u.name?' · '+u.name:''),remaining:u.remaining});
  // --- 5. comprobación final: ningún bloque nuevo pisa nada
  const final=[]; for(const b of add){ const ds=b.start.slice(0,10), a=mins(b.start.slice(11)), e=mins(b.end.slice(11));
    const others=[...itemsOn(S,dayOf(ds),excl).filter(x=>!x.allDay).map(x=>[mins(x.start.slice(11)),mins(x.end.slice(11))]),...travelOn(S,dayOf(ds)),...final.filter(x=>x.start.slice(0,10)===ds).map(x=>[mins(x.start.slice(11)),mins(x.end.slice(11))])];
    if(others.some(([t0,t1])=>overlaps(a,e,t0,t1))) { notes.push('descartado por solape: '+b.start); continue; } final.push(b); }
  // sin cambios reales: no quitar y volver a poner lo mismo
  const removeIds=[...excl];
  return {add:final, removeIds, unfit, displaced, notes, dropReason};
}
// Reordena los bloques nuevos de cada día agrupando por asignatura dentro de cada hueco libre; nunca pisa nada
function relayout(S,add,excl,now){
  const s=S.settings; const byDay={}; for(const b of add) (byDay[b.start.slice(0,10)]=byDay[b.start.slice(0,10)]||[]).push(b);
  const dur=b=>mins(b.end.slice(11))-mins(b.start.slice(11)); const sKey=x=>x.subjectId||x.taskId||x.id;
  for(const ds of Object.keys(byDay)){
    const d=dayOf(ds);
    const base=[...itemsOn(S,d,excl).filter(e=>!e.allDay).map(e=>[mins(e.start.slice(11)),mins(e.end.slice(11))]),...travelOn(S,d)];
    const gaps=gapsOf(S,d,base,false,sameDay(d,now),now);
    const list=byDay[ds].sort((a,b)=>a.start<b.start?-1:1);
    const snap=list.map(b=>({b,start:b.start,end:b.end,location:b.location}));
    const cw=campusStudyWindow(S,d); let ok=true;
    for(const [g0,g1] of gaps){
      const inGap=snap.filter(x=>mins(x.start.slice(11))>=g0&&mins(x.end.slice(11))<=g1).map(x=>x.b); if(!inGap.length) continue;
      const order=[], gm=new Map(); for(const b of inGap){ const k=sKey(b); if(!gm.has(k)){ gm.set(k,[]); order.push(k); } gm.get(k).push(b); }
      let t=g0, run=0, firstG=true;
      for(const k of order){ if(!firstG){ t+=s.breakMin; run=0; } firstG=false;
        for(const b of gm.get(k)){ const len=dur(b); if(run>0&&run+len>s.blockMax){ t+=s.breakMin; run=0; } if(t+len>g1){ ok=false; break; }
          b.start=`${ds}T${tfromMins(t)}`; b.end=`${ds}T${tfromMins(t+len)}`; b.location=(cw&&t>=cw[0]&&t+len<=cw[1])?(s.campusName||'ICAI'):''; t+=len; run+=len; }
        if(!ok) break; }
      if(!ok) break;
    }
    if(!ok) for(const x of snap){ x.b.start=x.start; x.b.end=x.end; x.b.location=x.location; }
  }
}
// ¿pisa este intervalo algo (clase, evento, trayecto, bloque)? devuelve descripciones
function conflictsOf(S,start,end,excludeIds){ const d=dayOf(start); const a=mins(start.slice(11)), b=mins(end.slice(11)); const ex=new Set(excludeIds||[]); const out=[];
  for(const e of itemsOn(S,d)) if(!e.allDay&&!ex.has(e.id)&&!(e.taskId&&ex.has(e.taskId))&&overlaps(a,b,mins(e.start.slice(11)),mins(e.end.slice(11)))) out.push({id:e.id,label:labelOf(S,e),start:e.start.slice(11),end:e.end.slice(11),kind:e.kind,study:isStudy(S,e),auto:!!e.auto,locked:!!e.locked});
  for(const [t0,t1] of travelOn(S,d)) if(overlaps(a,b,t0,t1)) out.push({label:'desplazamiento',start:tfromMins(t0),end:tfromMins(t1),kind:'travel'});
  return out; }
// huecos libres de un día (para el chat / colocar a mano)
function freeSlotsOn(S,date,now){ const ds=dstr(date); const busy=[...itemsOn(S,date).filter(e=>!e.allDay).map(e=>[mins(e.start.slice(11)),mins(e.end.slice(11))]),...travelOn(S,date)]; return gapsOf(S,date,busy,false,sameDay(date,now),now).map(([a,b])=>[tfromMins(a),tfromMins(b)]); }
// Coloca una tarea a mano en una franja concreta (bloques fijados, encadenados con descanso cada blockMax). Devuelve bloques.
function fillWindow(S, task, ds, from, to, maxMin, now){
  const s=S.settings; const d=dayOf(ds); const busy=[...itemsOn(S,d).filter(e=>!e.allDay&&!(e.taskId===task.id&&e.auto&&!e.locked&&e.start>=iso(now))).map(e=>[mins(e.start.slice(11)),mins(e.end.slice(11))]),...travelOn(S,d)];
  const a0=mins(from), a1=mins(to); let rem=maxMin; const out=[]; const bs=[...busy].sort((x,y)=>x[0]-y[0]);
  let cur=a0; const gaps=[]; for(const [x0,x1] of bs){ if(x1<=cur) continue; if(x0>cur) gaps.push([cur,Math.min(x0,a1)]); cur=Math.max(cur,x1+s.breakMin); if(cur>=a1) break; } if(cur<a1) gaps.push([cur,a1]);
  for(const [g0,g1] of gaps){ let t=g0, run=0; while(rem>0&&g1-t>=15){ let len=Math.min(s.blockMax,rem,g1-t); len=Math.floor(len/5)*5; if(len<15) break;
      out.push({id:uid(),subjectId:task.subjectId,typeId:'estudio',taskId:task.id,sectionId:null,auto:false,locked:true,start:`${ds}T${tfromMins(t)}`,end:`${ds}T${tfromMins(t+len)}`,location:'',createdAt:iso(now)}); rem-=len; t+=len; run+=len; if(run>=s.blockMax){ t+=s.breakMin; run=0; } } if(rem<=0) break; }
  return out;
}

return { pad,DOW,DOWL,MON,setLocale,getLocale,LOCALES,dstr,tstr,iso,parse,mins,tfromMins,addDays,startOfWeek,sameDay,dayOf,r15,fmtDur,fmtDate,fmtDateLong,durOf,overlaps,uid,
  DEFAULT_SETTINGS,RULES_DAY,STYLES,STYLE_LABEL,styleOf,subj,typ,shortOf,colorOf,whatOf,labelOf,
  classesOn,eventsOn,itemsOn,isBlock,isStudy,isCampus,isPrac,leaveCampusAt,campusOn,campusStudyWindow,travelOn,tasksDueOn,ruleOf,isExam,isDeliv,
  workedMins,unitsOf,estimateOf,progressOf,remainingOf,plannedFuture,warnings,
  activeRules,ruleText,ruleExpired,windowsFor,zonesOf,zoneAt,gapsOf,freezeUntil,computePlan,conflictsOf,freeSlotsOn,fillWindow };
});
