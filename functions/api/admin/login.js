import { mintSession, json, samePassword } from './_lib.js';
import { overLimit } from '../_ratelimit.js';
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return json({error:'Admin not configured.'}, 500);
  if (await overLimit(env, request, 'login', 10, 600))
    return json({error:'Too many sign-in attempts. Please wait 10 minutes and try again.'}, 429);
  let d; try { d = await request.json(); } catch { return json({error:'Bad request.'}, 400); }
  const pw = typeof d.password === 'string' ? d.password : '';
  await new Promise(r => setTimeout(r, 250));                  // slow brute force
  if (!await samePassword(pw, env.ADMIN_PASSWORD)) return json({error:'Incorrect password.'}, 401);
  const tok = await mintSession(env.ADMIN_PASSWORD);
  return json({ok:true}, 200, {
    'Set-Cookie': `dorco_admin=${encodeURIComponent(tok)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`
  });
}
