// Stores contact enquiries in D1. Nothing is lost if email delivery is unavailable.
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'Content-Type':'application/json'}});
const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';

export async function onRequestPost({request, env}) {
  let d;
  try { d = await request.json(); } catch { return json({error:'Malformed request.'},400); }
  const first=clean(d.first,80), last=clean(d.last,80), email=clean(d.email,160);
  const subject=clean(d.subject,120), message=clean(d.message,4000);
  if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({error:'A valid email address is required.'},400);
  if(!message) return json({error:'Please include a message.'},400);
  if(clean(d.website,10)) return json({ok:true});          // honeypot: silently accept bots
  if(!env.DB) return json({error:'Storage unavailable.'},500);
  try{
    await env.DB.prepare(
      'INSERT INTO enquiries (created, first_name, last_name, email, subject, message, ip) VALUES (?,?,?,?,?,?,?)'
    ).bind(new Date().toISOString(), first, last, email, subject, message,
           request.headers.get('CF-Connecting-IP')||'').run();
  }catch(e){ return json({error:'Could not save your message. Please email us directly.'},500); }
  return json({ok:true});
}
