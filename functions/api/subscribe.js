// Newsletter sign-ups stored in D1 — export any time for a campaign.
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'Content-Type':'application/json'}});
export async function onRequestPost({request, env}) {
  let d;
  try { d = await request.json(); } catch { return json({error:'Malformed request.'},400); }
  const email=(typeof d.email==='string'?d.email.trim().slice(0,160):'').toLowerCase();
  if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({error:'Please enter a valid email address.'},400);
  if(!env.DB) return json({error:'Storage unavailable.'},500);
  try{
    await env.DB.prepare('INSERT OR IGNORE INTO subscribers (email, created, source) VALUES (?,?,?)')
      .bind(email, new Date().toISOString(), (d.source||'site').toString().slice(0,40)).run();
  }catch(e){ return json({error:'Could not sign you up just now.'},500); }
  return json({ok:true});
}
