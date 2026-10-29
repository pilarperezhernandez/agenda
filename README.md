# Agenda · Study planner

**[Español](#español) · [English](#english)**

Live demo: https://pilarperezhernandez.github.io/agenda/ (press *Probar sin cuenta / Try without an account*).

---

## Español

Agenda personal para estudiantes: horario de clases, tareas y exámenes, y un planificador que reparte el estudio en los huecos libres de la semana. Es una web instalable (PWA) que funciona en ordenador, tablet y móvil, en español e inglés.

### Qué hace

- **Semana, Hoy, Mes y Tareas.** Clases fijas que se repiten entre dos fechas, eventos sueltos, días de trabajo o prácticas, citas y tiempos no disponibles.
- **Planificador automático.** Cada tarea tiene una fecha y un tiempo estimado; cada examen se divide en secciones (teoría, práctica, repaso…). El planificador coloca bloques de estudio en los huecos libres respetando trayectos, descansos, tope diario, bloque máximo y mínimo, y recalcula cuando algo cambia. Los bloques se pueden mover a mano (quedan fijados) o marcar como hechos, a medias o saltados.
- **Reglas.** Condiciones por día (sin exámenes, solo exámenes, día ligero, libre) e indicaciones puntuales ("terminar A antes de B", "el sábado solo Física", "esta semana nada de Álgebra").
- **Avisos** cuando algo vence en menos de 48 h sin tener todo el tiempo planificado.
- **Sincronización** entre dispositivos con Supabase (Postgres + Auth + Realtime), o **modo demo** solo en el navegador.
- **Tema claro y oscuro**, atajos de teclado, exportar e importar en JSON.

### Tecnología

HTML, CSS y JavaScript sin frameworks. `src/core.js` contiene toda la lógica (ocurrencias, progreso, planificador) sin tocar el DOM, de modo que se puede probar en Node. `src/db.js` es la capa de datos sobre Supabase; `src/i18n.js` traduce la interfaz. Los datos viven en una única tabla `docs (coll, id, data jsonb)` protegida con RLS: cada usuario solo ve sus filas.

```
index.html            armazón, pantalla de acceso, service worker
styles.css            estilos (tema claro/oscuro)
config.js             URL y clave pública de Supabase (vacío = modo demo)
manifest.webmanifest  PWA
sw.js                 caché del armazón
src/core.js           lógica: ocurrencias, progreso, planificador
src/db.js             capa de datos (Supabase, realtime)
src/i18n.js           idioma es/en
src/app.js            interfaz
supabase/schema.sql   tabla, RLS, realtime y vistas
scripts/              importación de un volcado JSON
email/                plantilla de un resumen diario por correo (estética Apple)
```

### Instalación propia (gratis)

1. Crea un proyecto en [Supabase](https://supabase.com) (plan gratuito) y ejecuta `supabase/schema.sql` en el SQL Editor.
2. En *Authentication → Sign In / Providers* desactiva *Allow new users to sign up* y crea tu usuario con *Add user → Send invitation* (o déjalo activado si quieres permitir registros).
3. En *Authentication → URL Configuration* pon como *Site URL* la dirección donde vas a servir la app.
4. Copia en `config.js` la URL del proyecto y la clave *publishable* (*Project Settings → API Keys*).
5. Sirve la carpeta como sitio estático (GitHub Pages, Netlify, Vercel, o `python3 -m http.server`).

Sin `config.js` rellenado la app arranca directamente en modo demo.

### Acceso a los datos desde fuera

La API REST de Supabase expone la tabla y las vistas `v_events`, `v_tasks`, `v_classes` y `v_subjects`, útiles para scripts o asistentes (por ejemplo, un resumen matinal por correo como el de `email/`):

```
GET  {SUPABASE_URL}/rest/v1/v_tasks?done=eq.false&order=due.asc
GET  {SUPABASE_URL}/rest/v1/docs?coll=eq.events&data->>start=gte.2026-11-01
```
Cabeceras: `apikey` y `Authorization: Bearer <clave>`.

---

## English

A personal planner for students: class timetable, tasks and exams, and a scheduler that fits study time into the free slots of your week. It is an installable web app (PWA) for desktop, tablet and phone, in Spanish and English.

### What it does

- **Week, Today, Month and Tasks.** Fixed classes repeating between two dates, one-off events, work or internship days, appointments and unavailable times.
- **Automatic planner.** Every task has a due date and an estimate; every exam is split into sections (theory, exercises, review…). The planner places study blocks in free slots while respecting commutes, breaks, a daily cap and block limits, and replans when something changes. Blocks can be moved by hand (they become pinned) or marked done, partly done or skipped.
- **Rules.** Per-day rules (no exams, exams only, light day, free) and one-off directions ("finish A before B", "Saturday only Physics", "nothing of Algebra this week").
- **Warnings** when something is due within 48 h without enough time planned.
- **Sync** across devices with Supabase (Postgres + Auth + Realtime), or **demo mode** in the browser only.
- **Light and dark theme**, keyboard shortcuts, JSON export and import.

### Tech

Plain HTML, CSS and JavaScript, no framework. `src/core.js` holds all the logic (occurrences, progress, planner) with no DOM access, so it can be tested in Node. `src/db.js` is the data layer on Supabase; `src/i18n.js` translates the interface. Data lives in a single `docs (coll, id, data jsonb)` table protected by RLS: each user only sees their own rows.

### Self-hosting (free)

1. Create a [Supabase](https://supabase.com) project (free tier) and run `supabase/schema.sql` in the SQL Editor.
2. Under *Authentication → Sign In / Providers* turn off *Allow new users to sign up* and create your user with *Add user → Send invitation* (or leave sign-ups on).
3. Under *Authentication → URL Configuration* set the *Site URL* to where the app will be served.
4. Put the project URL and the *publishable* key (*Project Settings → API Keys*) in `config.js`.
5. Serve the folder as a static site (GitHub Pages, Netlify, Vercel, or `python3 -m http.server`).

With an empty `config.js` the app starts straight in demo mode.

### Reading the data from outside

Supabase's REST API exposes the table and the views `v_events`, `v_tasks`, `v_classes` and `v_subjects`, handy for scripts or assistants (for instance a morning digest email like the one in `email/`):

```
GET  {SUPABASE_URL}/rest/v1/v_tasks?done=eq.false&order=due.asc
GET  {SUPABASE_URL}/rest/v1/docs?coll=eq.events&data->>start=gte.2026-11-01
```
Headers: `apikey` and `Authorization: Bearer <key>`.

---

MIT License · Pilar Pérez Hernández
