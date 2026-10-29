/* Agenda — capa de datos sobre Supabase.
   Expone la misma forma que usaba la app (doc().set/delete, collection().onSnapshot)
   para que la lógica no cambie. Una sola tabla `docs` (coll, id, data jsonb). */
window.AgendaDB = (function(){
  'use strict';
  const cfg = window.AGENDA_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) { console.error('Falta config.js'); }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 10 } },
  });

  const cache = {};           // coll -> { id -> data }
  const listeners = {};       // coll -> [cb]
  let loaded = false, channel = null, online = true;
  const statusCbs = [];

  function snapOf(coll){ const o = cache[coll] || {}; return { docs: Object.keys(o).map(id => ({ id, data: () => o[id] })) }; }
  function docSnap(coll, id){ const o = cache[coll] || {}; return { exists: id in o, data: () => o[id] }; }
  function notify(coll){ for (const cb of (listeners[coll] || [])) { try { cb(cb.__doc ? docSnap(coll, cb.__doc) : snapOf(coll)); } catch (e) { console.error(e); } } }
  function setStatus(s){ online = s; for (const cb of statusCbs) cb(s); }

  async function loadAll(){
    const { data, error } = await sb.from('docs').select('coll,id,data');
    if (error) throw error;
    for (const k of Object.keys(cache)) delete cache[k];
    for (const r of data) (cache[r.coll] = cache[r.coll] || {})[r.id] = r.data;
    loaded = true;
    for (const c of Object.keys(listeners)) notify(c);
  }

  function subscribeRealtime(){
    if (channel) return;
    channel = sb.channel('docs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, payload => {
        const row = payload.new && payload.new.coll ? payload.new : payload.old;
        if (!row) return;
        const coll = row.coll, id = row.id;
        if (payload.eventType === 'DELETE') { if (cache[coll]) delete cache[coll][id]; }
        else (cache[coll] = cache[coll] || {})[id] = payload.new.data;
        notify(coll);
      })
      .subscribe(st => { setStatus(st === 'SUBSCRIBED'); if (st === 'SUBSCRIBED') loadAll().catch(()=>{}); });
  }

  const api = {
    sb,
    get loaded(){ return loaded; },
    get online(){ return online; },
    onStatus(cb){ statusCbs.push(cb); },
    async session(){ const { data } = await sb.auth.getSession(); return data.session; },
    onAuth(cb){ sb.auth.onAuthStateChange((_e, s) => cb(s)); },
    signIn(email, password){ return sb.auth.signInWithPassword({ email, password }); },
    signOut(){ return sb.auth.signOut(); },
    updatePassword(password){ return sb.auth.updateUser({ password }); },
    resetPassword(email){ return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); },
    async start(){ await loadAll(); subscribeRealtime(); },
    stop(){ if (channel) { sb.removeChannel(channel); channel = null; } },
    collection(coll){ return { onSnapshot(cb){ (listeners[coll] = listeners[coll] || []).push(cb); if (loaded) cb(snapOf(coll)); } }; },
    doc(path){
      const [coll, id] = path.split('/');
      return {
        onSnapshot(cb){ cb.__doc = id; (listeners[coll] = listeners[coll] || []).push(cb); if (loaded) cb(docSnap(coll, id)); },
        async set(data){
          const { error } = await sb.from('docs').upsert({ coll, id, data, updated_at: new Date().toISOString() }, { onConflict: 'coll,id' });
          if (error) throw error;
          (cache[coll] = cache[coll] || {})[id] = data; notify(coll);
        },
        async delete(){
          const { error } = await sb.from('docs').delete().match({ coll, id });
          if (error) throw error;
          if (cache[coll]) delete cache[coll][id]; notify(coll);
        },
      };
    },
  };
  return api;
})();
