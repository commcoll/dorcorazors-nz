import { checkSession } from './_lib.js';
export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_PASSWORD || !await checkSession(request, env.ADMIN_PASSWORD))
    return new Response('Not signed in.', {status:401});
  const r = (await env.DB.prepare(
    'SELECT email, created, source FROM subscribers WHERE unsubscribed=0 ORDER BY created DESC').all()).results||[];
  const csv = 'email,created,source\n' +
    r.map(x=>`"${(x.email||'').replace(/"/g,'""')}","${x.created||''}","${(x.source||'').replace(/"/g,'""')}"`).join('\n');
  return new Response(csv, {status:200, headers:{
    'Content-Type':'text/csv','Content-Disposition':'attachment; filename="subscribers.csv"'}});
}
