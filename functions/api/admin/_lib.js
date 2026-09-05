const enc = new TextEncoder();
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');

async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return b64(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i=0;i<a.length;i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function mintSession(secret) {
  const exp = Date.now() + 12*60*60*1000;            // 12 hours
  return `${exp}.${await hmac(secret, String(exp))}`;
}
export async function checkSession(request, secret) {
  const cookie = request.headers.get('cookie') || '';
  const m = /dorco_admin=([^;]+)/.exec(cookie);
  if (!m) return false;
  const [exp, sig] = decodeURIComponent(m[1]).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEq(sig, await hmac(secret, exp));
}
export const json = (b, s=200, extra={}) =>
  new Response(JSON.stringify(b), {status:s, headers:{'Content-Type':'application/json', ...extra}});
export { safeEq };
