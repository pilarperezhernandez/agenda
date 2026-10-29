/* Agenda — idioma (es/en). El código fuente está en español; para inglés se traduce el DOM al vuelo
   con un diccionario de frases exactas y unas pocas reglas para textos con números. Los datos del
   usuario (títulos, notas) no se tocan salvo que coincidan exactamente con una frase de la interfaz. */
window.I18N = (function(){
  'use strict';
  const D = {
    // navegación y barra
    'Hoy':'Today','Semana':'Week','Mes':'Month','Tareas':'Tasks','Ajustes':'Settings','+ Nuevo':'+ New','Anterior':'Previous','Siguiente':'Next',
    'Tema claro / oscuro':'Light / dark theme','Estado de sincronización':'Sync status','Sincronizado':'Synced','Reconectando…':'Reconnecting…',
    'Guardando solo en este navegador':'Saving only in this browser','Sin conexión · los cambios se guardarán al volver':'Offline · changes will be saved when back online',
    'Elige qué días de esta semana vas a trabajar':'Choose which days this week you work','Trabajo':'Work',
    // acceso
    'Correo':'Email','Contraseña':'Password','Entrar':'Sign in','He olvidado la contraseña':'I forgot my password','Probar sin cuenta':'Try without an account',
    'Tu horario, tus tareas y un planificador que reparte el estudio en tus huecos.':'Your timetable, your tasks and a planner that fits study time into your free slots.',
    'Correo o contraseña incorrectos':'Wrong email or password','Escribe tu correo y vuelve a pulsar':'Type your email and press again','Te hemos enviado un enlace al correo':'We sent you a link by email',
    'Modo demo: los datos se guardan solo en este navegador.':'Demo mode: data is stored only in this browser.',
    // hoy
    'Nada en el calendario':'Nothing scheduled','de estudio':'of study','Condición del día':'Day rule','libres':'free',
    'Día vacío. Pulsa “+ Nuevo” o dibuja un hueco en la semana.':'Empty day. Press “+ New” or draw a slot in the week view.',
    'Vence esta semana':'Due this week','Después':'Later','Todo el día':'All day','(no hecho)':'(not done)','Hecho':'Done','A medias':'Partly','No lo hice':'Skipped','Deshacer marca':'Undo mark',
    'Vence':'Due','Venció':'Was due','Sin fecha':'No date','Urgente':'Urgent','Alta':'High','Normal':'Normal','Hecha':'Done','faltan':'left','plan.':'planned','¿Terminada? Sí':'Finished? Yes',
    'Atención':'Heads up','Ocultar':'Hide','atrasadas sin terminar:':'overdue and unfinished:',
    // semana
    'Desplazamiento':'Travel','Prácticas':'Work','Qué es':'What is it','No disponible':'Unavailable','Cita':'Appointment','Personal':'Personal','Bloque de estudio':'Study block','Clase':'Class',
    'Más opciones…':'More options…','Cancelar':'Cancel','Guardar':'Save','Ahí pisa:':'That overlaps:','Movido a mano':'Moved by hand','Bloque fijado: el planificador ya no lo mueve':'Block pinned: the planner won’t move it',
    'Evento creado':'Event created','Evento editado':'Event edited','Evento borrado':'Event deleted',
    // tareas
    'Indicaciones':'Directions','con fecha':'with a date','por hacer':'to do','Nada pendiente con fecha':'Nothing pending with a date',
    'Lo que le has pedido al planificador para situaciones concretas':'What you asked the planner for specific situations','Hechas':'Done','+ Tarea':'+ Task','+ Indicación':'+ Direction','Todas':'All',
    'Atrasadas':'Overdue','Esta semana':'This week','Próximas':'Upcoming',
    'Sin tareas. Añade una con “+ Tarea”: la agenda la reparte sola en tus huecos.':'No tasks. Add one with “+ Task”: the planner spreads it over your free slots.',
    'Ninguna indicación activa. Aquí aparece lo que le pides a Claude del tipo “esto antes que eso”, “el sábado por la mañana solo Series” o “esta semana nada de Visión”. Caducan solas cuando pasa su fecha.':'No active directions. Things like “this before that”, “Saturday morning only Algebra” or “nothing of Physics this week” show up here. They expire on their own.',
    'hasta que la primera esté hecha':'until the first one is done','solo ese día':'that day only','hasta el':'until','Quitar':'Remove','Caducadas':'Expired','Borrar':'Delete','Indicación quitada':'Direction removed',
    'Nueva indicación':'New direction','Orden':'Order','Solo esto':'Only this','Nada de':'None of','Ventana':'Window','Terminar primero':'Finish first','Antes de empezar':'Before starting',
    'Día':'Day','Franja':'Slot','Mañana (antes de clase)':'Morning (before class)','Tarde-noche':'Afternoon / evening','Solo esta asignatura':'Only this subject','O una tarea concreta:':'Or a specific task:',
    '— cualquiera de esa asignatura':'— any of that subject','Desde':'From','Hasta':'Until','Nada de esta asignatura':'None of this subject','Tarea':'Task','Solo desde':'Only from',
    'Elige dos tareas distintas':'Choose two different tasks','Elige asignatura o tarea':'Choose a subject or a task','Indicación':'Direction','Indicación guardada':'Direction saved',
    // ajustes
    'Cuándo estudias':'When you study',
    'La agenda coloca los bloques de estudio dentro de estas franjas, fuera de clases, citas, desplazamientos y tiempos no disponibles. Primero intenta acabar antes de la hora preferida; solo si no cabe usa el resto.':'Study blocks go inside these windows, around classes, appointments, travel and unavailable times. It first tries to finish before the preferred end; only if it does not fit does it use the rest.',
    'Entre semana':'Weekdays','Fin de semana':'Weekend','a':'to','preferido hasta':'preferred until','Tope diario de estudio':'Daily study cap','min al día (la mitad en “día ligero”)':'min per day (half on a “light day”)',
    'Bloque máximo seguido':'Longest block','min; después, un descanso':'min; then a break','Bloque mínimo':'Shortest block','no se colocan bloques más cortos':'shorter blocks are never placed',
    'Descanso':'Break','min al cambiar de cosa':'min when switching','Concentrar asignaturas':'Group subjects','mucho tiempo seguido con la misma asignatura':'long stretches on the same subject',
    'Asignaturas distintas por día':'Different subjects per day','máximo; se salta solo si no cabe de otra forma':'maximum; only exceeded when nothing else fits',
    'Cómo se comporta el planificador':'How the planner behaves','Días congelados':'Frozen days','hoy + estos días no se tocan salvo conflicto (0 = solo hoy)':'today + these days are left alone unless there is a conflict (0 = today only)',
    'Bloques pasados sin marcar':'Past blocks left unmarked','cuentan como hechos':'count as done','Avisar si vence en':'Warn when due within','horas sin tener todo el tiempo planificado':'hours without all the time planned',
    'Atrasadas: repartir en':'Overdue: spread over','días desde hoy':'days from today','Días de repaso (exámenes)':'Review days (exams)','las secciones “repaso” van en los últimos días':'“review” sections go in the last days',
    'Horas por examen (defecto)':'Hours per exam (default)','al crear un examen sin secciones':'when creating an exam without sections','Reorganizar todo':'Replan everything',
    'Rehace todos los bloques automáticos no fijados':'Rebuilds every automatic block that is not pinned','Normalmente no hace falta: la agenda se ajusta sola y solo toca lo necesario.':'Usually unnecessary: the planner adjusts itself and only touches what it must.',
    'Desplazamientos y universidad':'Travel and campus','Trayecto a clase':'Commute to class','min antes de la primera clase y después de la última':'min before the first class and after the last',
    'Trayecto casa → trabajo':'Commute home → work','min':'min','Salgo del campus a las':'I leave campus at','si la última clase acaba antes, te quedas a estudiar allí':'if the last class ends earlier, you stay there to study',
    'Espera máxima allí':'Longest wait there','Nombre del campus':'Campus name','Nombre del trabajo (prácticas, empleo)':'Work name (internship, job)','Hora de entrada':'Start time','Lugar de trabajo':'Workplace',
    'Vista':'View','Horas visibles':'Visible hours','Color de los bloques por':'Block colour by','Asignatura':'Subject','Tipo':'Type','Guardar ajustes':'Save settings','Ajustes guardados':'Settings saved',
    'Asignaturas':'Subjects','Nombre completo, abreviatura (la que aparece en los bloques) y color.':'Full name, short name (shown on blocks) and colour.','+ Asignatura':'+ Subject','Nombre':'Name','Abreviatura':'Short name',
    'Tipos':'Types','Cada tipo tiene un estilo visual fijo (clase, laboratorio, estudio, entrega, examen, trabajo, cita, personal, no disponible). Puedes añadir tipos propios eligiendo con qué estilo se dibujan.':'Each type has a fixed visual style (class, lab, study, deliverable, exam, work, appointment, personal, unavailable). You can add your own types and choose how they are drawn.',
    '+ Tipo':'+ Type','Ninguno todavía.':'None yet.','Ninguna todavía.':'None yet.','Clases fijas':'Fixed classes',
    'Se repiten cada semana entre las fechas indicadas. Para un cambio puntual, abre la clase en la semana y usa “Saltar este día”.':'They repeat weekly between the given dates. For a one-off change, open the class in the week view and use “Skip this day”.',
    '+ Clase fija':'+ Fixed class','Editar ›':'Edit ›','día(s) saltados':'day(s) skipped','Copia de seguridad':'Backup','Exportar JSON':'Export JSON','Importar JSON':'Import JSON','Copia descargada':'Backup downloaded',
    'Esto añade/actualiza lo que haya en el archivo. ¿Continuar?':'This adds/updates whatever is in the file. Continue?','Importar':'Import','Importado':'Imported','Archivo no válido':'Invalid file',
    'Cuenta':'Account','Sesión iniciada como':'Signed in as','. La agenda se sincroniza entre todos tus dispositivos.':'. The agenda syncs across all your devices.','Nueva contraseña':'New password','Repetir':'Repeat','Cambiar':'Change',
    'Mínimo 8 caracteres':'At least 8 characters','Las contraseñas no coinciden':'Passwords do not match','Contraseña cambiada':'Password changed','No se pudo cambiar:':'Could not change:','Cerrar sesión':'Sign out','¿Cerrar sesión en este dispositivo?':'Sign out on this device?','Salir':'Sign out',
    'Para instalar la app: en iPhone/iPad, Compartir › «Añadir a pantalla de inicio»; en el ordenador, el icono de instalar en la barra de direcciones.':'To install the app: on iPhone/iPad, Share › “Add to Home Screen”; on a computer, the install icon in the address bar.',
    'Salir del modo demo':'Leave demo mode','¿Borrar los datos de prueba?':'Delete the sample data?','Borrar los datos de prueba y volver a la pantalla de acceso':'Delete the sample data and go back to the sign-in screen',
    'Atajos: N nuevo · T hoy · ←/→ · 1 Hoy, 2 Semana, 3 Mes, 4 Tareas':'Shortcuts: N new · T today · ←/→ · 1 Today, 2 Week, 3 Month, 4 Tasks',
    'Idioma':'Language','Español':'Spanish','Inglés':'English',
    // hojas: condición del día
    'Condición de ese día para el planificador.':'Rule for that day for the planner.','Sin restricciones':'No restrictions','Sin exámenes':'No exams','Solo entregas y cosas prácticas':'Deliverables and practical work only',
    'Solo exámenes':'Exams only','Solo preparación de exámenes':'Exam preparation only','Día ligero':'Light day','La mitad del tope diario':'Half the daily cap','Libre':'Free','No se coloca nada':'Nothing is placed','Cerrar':'Close',
    'Día sin condición':'Day without a rule','Condición de día':'Day rule',
    // clase
    'Es una clase fija: se edita en Ajustes › Clases fijas. Aquí puedes saltar solo este día o sustituirla por otra cosa.':'This is a fixed class: edit it in Settings › Fixed classes. Here you can skip this day only or replace it with something else.',
    'Saltar este día':'Skip this day','Sustituir por…':'Replace with…','Clase saltada':'Class skipped','Clase saltada ese día':'Class skipped that day','Clase fija':'Fixed class','Nueva clase fija':'New fixed class',
    'Título (opcional, p. ej. «Teoría»)':'Title (optional, e.g. “Theory”)','Se muestra como «Título · Asignatura»':'Shown as “Title · Subject”','Empieza':'Starts','Termina':'Ends','Aula':'Room',
    'Lunes':'Monday','Martes':'Tuesday','Miércoles':'Wednesday','Jueves':'Thursday','Viernes':'Friday','Sábado':'Saturday','Domingo':'Sunday',
    'Más opciones':'More options','Días saltados (uno por línea, AAAA-MM-DD)':'Skipped days (one per line, YYYY-MM-DD)','Notas':'Notes','¿Borrar esta clase fija?':'Delete this fixed class?','Revisa las horas':'Check the times','Guardada':'Saved',
    // trabajo (semana)
    'Marca los días. Empiezan a la hora de entrada y terminan a la hora a la que tienes que salir para la primera clase.':'Tick the days. They start at your start time and end when you need to leave for the first class.',
    'sale a tiempo para la primera clase':'leaves in time for the first class','Días de trabajo de la semana guardados':'Work days for the week saved',
    // evento
    'Evento':'Event','Nuevo':'New','Tarea con fecha':'Task with a date','p. ej. Dentista, Comida con…, Ejercicios de Laplace T3':'e.g. Dentist, Lunch with…, Laplace exercises ch. 3',
    'Para preparar el examen (opcional)':'To prepare for the exam (optional)','— Ninguno (estudio suelto)':'— None (loose study)',
    'Crear también una tarea de preparación (el planificador te reparte el estudio solo)':'Also create a preparation task (the planner spreads the study for you)',
    'Hora':'Time','Asignatura (opcional)':'Subject (optional)','— Sin asignatura':'— No subject','Lugar':'Place','Desplazamiento antes (min)':'Travel before (min)','Desplazamiento después (min)':'Travel after (min)',
    'Parte de':'Part of','Fijado (el planificador no lo mueve)':'Pinned (the planner won’t move it)','Abrir la tarea':'Open the task','Qué vas a hacer en concreto: p. ej. Ejercicios de Laplace T3':'What exactly you will do: e.g. Laplace exercises ch. 3',
    'Ponle un nombre':'Give it a name','Examen y tarea de preparación creados':'Exam and preparation task created','Examen creado':'Exam created','Termina a las':'Ends at','para llegar a clase con margen.':'to get to class with time to spare.',
    'Estudio reservado para este examen:':'Study reserved for this exam:','en':'in','bloque':'block','bloques':'blocks',
    'Aún no hay bloques de estudio para este examen. Crea un evento de tipo Bloque de estudio y elígelo en «Para preparar el examen».':'No study blocks for this exam yet. Create a Study block event and choose it under “To prepare for the exam”.',
    // tarea
    'Nueva tarea':'New task','Examen':'Exam','Tarea / entrega':'Task / deliverable','p. ej. Práctica 4, Tema 3, Trabajo previo lab':'e.g. Assignment 4, Chapter 3, Lab prep','Prioridad':'Priority',
    'Día del examen':'Exam day','Fecha límite':'Deadline','Tiempo estimado':'Estimated time','h':'h','Hecho:':'Done:','Secciones':'Sections','Sección':'Section','+ Sección':'+ Section','rep.':'rev.',
    'Nombre · minutos · repaso (va en los últimos':'Name · minutes · review (goes in the last','días) · hecho':'days) · done','Total':'Total','preparación':'preparation',
    'Pídele a Claude que te proponga secciones a partir del temario de la asignatura.':'Ask Claude to propose sections from the course syllabus.','Notas y lista':'Notes and checklist','Checklist':'Checklist','+ Punto':'+ Item',
    'hecho':'done','planificados':'planned','¿Borrar la tarea y todos sus bloques de estudio?':'Delete the task and all its study blocks?','Tarea borrada':'Task deleted','Falta la fecha':'Date missing',
    'No cabe todo antes de la fecha:':'Not everything fits before the date:','sin sitio':'without a slot','Tarea editada':'Task edited','Tarea creada':'Task created','Tarea reabierta':'Task reopened','Tarea terminada':'Task finished',
    '¿Dar por terminada':'Mark as finished','Terminar':'Finish','Bloque hecho':'Block done','Bloque no hecho':'Block not done','Bloque a medias':'Block partly done','Anotado':'Noted','Anotado: no lo hiciste; se recoloca':'Noted: you skipped it; it will be rescheduled',
    '¿Cuánto hiciste de':'How much of','Agenda ajustada':'Plan adjusted','Recolocado por conflicto:':'Moved due to a conflict:','No cabe todo:':'Not everything fits:','Deshecho':'Undone',
    'Se rehacen todos los bloques automáticos que no hayas fijado (hoy y mañana no se tocan). ¿Seguir?':'Every automatic block you have not pinned will be rebuilt (today and tomorrow are left alone). Continue?','Reorganizar':'Replan','Reorganización completa':'Full replan',
    'No se pudo guardar:':'Could not save:','No se pudo borrar:':'Could not delete:','No se pudo cargar la agenda:':'Could not load the agenda:','Pon tu contraseña en «Cuenta» para entrar la próxima vez':'Set your password under “Account” to sign in next time',
  };
  // textos con números o variables
  const RULES = [
    [/^semana (\d+)$/, 'week $1'],
    [/^(\d+) cosas$/, '$1 items'], [/^(\d+) cosa$/, '$1 item'],
    [/^(.+) libres$/, '$1 free'],
    [/^(\d+) con fecha · (.+) por hacer$/, '$1 with a date · $2 to do'],
    [/^(\d+)% · faltan (.+?)( · (.+) plan\.)?( ⚠)?$/, (m,a,b,c,d,e)=>`${a}% · ${b} left${d?` · ${d} planned`:''}${e||''}`],
    [/^(Vence|Venció) (.+)$/, (m,a,b)=>`${a==='Vence'?'Due':'Was due'} ${b}`],
    [/^vence en menos de (\d+) h sin tiempo suficiente planificado: (.+)$/, 'due in under $1 h without enough time planned: $2'],
    [/^\(faltan (.+)\)$/, '($1 left)'],
    [/^(\d+) día\(s\) saltados$/, '$1 day(s) skipped'],
    [/^(.+) de estudio$/, '$1 of study'],
    [/^Total (.+)$/, 'Total $1'], [/^· preparación (\d+)%$/, '· preparation $1%'],
    [/^(\d+)% hecho · faltan (.+) · (.+) planificados$/, '$1% done · $2 left · $3 planned'],
    [/^Termina a las (.+) para llegar a clase con margen\.$/, 'Ends at $1 to get to class with time to spare.'],
    [/^Estudio reservado para este examen: (.+)$/, 'Study reserved for this exam: $1'],
    [/^en (\d+) bloques?$/, (m,n)=>`in ${n} block${n==='1'?'':'s'}`],
    [/^¿Dar por terminada «(.+)»\?$/, 'Mark “$1” as finished?'],
    [/^¿Cuánto hiciste de (.+)\?$/, 'How much of $1 did you do?'],
    [/^¿Borrar (.+)\?$/, 'Delete $1?'],
    [/^Agenda ajustada · (\d+) bloques?$/, (m,n)=>`Plan adjusted · ${n} block${n==='1'?'':'s'}`],
    [/^(\d+)% · (.+)$/, '$1% · $2'],
    [/^Sesión iniciada como (.+)$/, 'Signed in as $1'],
    [/^(.+) · semana del (.+)$/, '$1 · week of $2'],
    [/^Nombre · minutos · repaso \(va en los últimos (\d+) días\) · hecho$/, 'Name · minutes · review (goes in the last $1 days) · done'],
    [/^(\d+) pendientes?$/, '$1 pending'],
    [/^Clase (.+): (día saltado|actualizada)$/, (m,a,b)=>`Class ${a}: ${b==='día saltado'?'day skipped':'updated'}`],
  ];
  let lang = 'es';
  try { lang = localStorage.getItem('lang') || ((navigator.language||'es').toLowerCase().startsWith('es') ? 'es' : 'en'); } catch {}
  function tr(s){
    if (lang !== 'en') return s;
    const k = s.trim(); if (!k) return s;
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    if (D[k] != null) return lead + D[k] + trail;
    for (const [re, rep] of RULES) if (re.test(k)) return lead + k.replace(re, rep) + trail;
    return s;
  }
  let applying = false;
  function applyTo(root){
    if (lang !== 'en' || !root) return;
    applying = true;
    try {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
      for (const n of nodes) { const pn=n.parentNode; if (pn && (['SCRIPT','STYLE','TEXTAREA'].includes(pn.nodeName) || (pn.classList && pn.classList.contains('logo')))) continue; const t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; }
      const els = root.nodeType === 1 ? [root, ...root.querySelectorAll('[placeholder],[title],[aria-label]')] : [...root.querySelectorAll('[placeholder],[title],[aria-label]')];
      for (const el of els) for (const a of ['placeholder','title','aria-label']) { if (el.hasAttribute && el.hasAttribute(a)) { const v = el.getAttribute(a), t = tr(v); if (t !== v) el.setAttribute(a, t); } }
    } finally { applying = false; }
  }
  function observe(){
    const mo = new MutationObserver(muts => {
      if (applying || lang !== 'en') return;
      for (const m of muts) { if (m.type === 'characterData') applyTo(m.target.parentNode || m.target); else for (const n of m.addedNodes) applyTo(n.nodeType === 3 ? n.parentNode : n); }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function set(l){ lang = l === 'en' ? 'en' : 'es'; try { localStorage.setItem('lang', lang); } catch {} document.documentElement.lang = lang; if (window.Core) window.Core.setLocale(lang); }
  return { get lang(){ return lang; }, t: tr, apply: applyTo, observe, set, dict: D };
})();
