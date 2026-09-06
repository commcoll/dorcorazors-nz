import { checkSession, json } from './_lib.js';
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !await checkSession(request, env.ADMIN_PASSWORD))
    return json({error:'Not signed in.'}, 401);
  let d; try { d = await request.json(); } catch { return json({error:'Bad request.'}, 400); }
  const id = parseInt(d.id, 10);
  if (!id) return json({error:'Missing order id.'}, 400);
  const on = d.fulfilled ? 1 : 0;
  const tracking = typeof d.tracking === 'string' ? d.tracking.trim().slice(0,120) : '';
  try {
    await env.DB.prepare('UPDATE orders SET fulfilled=?, fulfilled_at=?, tracking=? WHERE id=?')
      .bind(on, on ? new Date().toISOString() : null, tracking, id).run();
  } catch (e) { return json({error:'Update failed.'}, 500); }
  return json({ok:true, fulfilled:on});
}
