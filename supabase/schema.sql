-- Agenda de Pilar — esquema. Una sola tabla de documentos (coll, id, data) protegida por RLS.
create table if not exists public.docs (
  coll       text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  owner      uuid not null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);
create index if not exists docs_coll_idx on public.docs (coll);
create index if not exists docs_start_idx on public.docs ((data->>'start')) where coll = 'events';
create index if not exists docs_due_idx on public.docs ((data->>'due')) where coll = 'tasks';

alter table public.docs enable row level security;
drop policy if exists "owner_all" on public.docs;
create policy "owner_all" on public.docs for all
  using (auth.uid() = owner) with check (auth.uid() = owner);

-- cambios en tiempo real entre dispositivos
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;
alter table public.docs replica identity full;

-- Vistas cómodas para consultar desde Claude (misma protección RLS que la tabla)
create or replace view public.v_events with (security_invoker = true) as
  select id, data->>'title' as title, data->>'subjectId' as subject_id, data->>'typeId' as type_id,
         data->>'start' as start_at, data->>'end' as end_at, (data->>'allDay')::boolean as all_day,
         data->>'location' as location, data->>'notes' as notes, data->>'taskId' as task_id,
         (data->>'done')::boolean as done, (data->>'locked')::boolean as locked, data
  from public.docs where coll = 'events';
create or replace view public.v_tasks with (security_invoker = true) as
  select id, data->>'title' as title, data->>'kind' as kind, data->>'subjectId' as subject_id, data->>'typeId' as type_id,
         data->>'due' as due, (data->>'done')::boolean as done, (data->>'priority')::int as priority,
         (data->>'estimateMin')::int as estimate_min, (data->>'progress')::int as progress, data->>'notes' as notes, data
  from public.docs where coll = 'tasks';
create or replace view public.v_classes with (security_invoker = true) as
  select id, (data->>'dow')::int as dow, data->>'start' as start_time, data->>'end' as end_time, data->>'subjectId' as subject_id,
         data->>'typeId' as type_id, data->>'title' as title, data->>'room' as room, data->>'from' as from_date, data->>'until' as until_date,
         data->'skip' as skip, data from public.docs where coll = 'classes';
create or replace view public.v_subjects with (security_invoker = true) as
  select id, data->>'name' as name, data->>'short' as short, data->>'color' as color, (data->>'order')::int as ord from public.docs where coll = 'subjects';
