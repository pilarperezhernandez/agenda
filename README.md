# Agenda

Aplicación personal de horario, tareas y planificación de estudio. Web instalable (PWA) que se sincroniza entre ordenador, iPad y iPhone.

- **Front:** HTML/CSS/JS sin framework (`index.html`, `styles.css`, `src/`).
- **Datos:** Supabase (Postgres + Auth + Realtime). Una tabla `docs(coll, id, data jsonb)` protegida con RLS; solo el usuario dueño ve sus filas. Esquema en `supabase/schema.sql`.
- **Hosting:** GitHub Pages (estático).
- **Planificador:** `src/core.js` es lógica pura (sin DOM): reparte las tareas y la preparación de exámenes en los huecos libres respetando clases, desplazamientos, reglas de día e indicaciones.

## Estructura

```
index.html            armazón, pantalla de acceso, registro del service worker
styles.css            estilos (tema claro/oscuro)
config.js             URL y clave pública (anon) de Supabase
manifest.webmanifest  PWA
sw.js                 caché del armazón para abrir al instante
src/core.js           lógica: ocurrencias, progreso, planificador
src/db.js             capa de datos sobre Supabase (realtime)
src/app.js            interfaz
supabase/schema.sql   tabla, RLS, realtime y vistas
scripts/              importación del volcado JSON
```

## Desarrollo local

Cualquier servidor estático sirve, por ejemplo `python3 -m http.server 8000` y abrir `http://localhost:8000/`.

## Datos desde fuera (Claude, scripts)

La API REST de Supabase expone la tabla y las vistas `v_events`, `v_tasks`, `v_classes`, `v_subjects`:

```
GET  {SUPABASE_URL}/rest/v1/v_tasks?done=eq.false&order=due.asc
GET  {SUPABASE_URL}/rest/v1/docs?coll=eq.events&data->>start=gte.2026-11-01
POST {SUPABASE_URL}/rest/v1/docs   (upsert con Prefer: resolution=merge-duplicates)
```
Cabeceras: `apikey` y `Authorization: Bearer <clave>`.
