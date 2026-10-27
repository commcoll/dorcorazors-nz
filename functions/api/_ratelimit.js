// Per-IP fixed-window limits kept in D1 (Pages Functions have no rate-limiting binding).
// A missing DB or a D1 error lets the request through: the limit is abuse damping, never
// the thing that keeps sign-in or a form working.
let ready = false;

async function ensureTable(db) {
  if (ready) return;
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, exp INTEGER NOT NULL)'
  ).run();
  ready = true;
}

// true when this request is over `max` for `scope` in the current `windowSec` window.
export async function overLimit(env, request, scope, max, windowSec) {
  if (!env.DB) return false;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Math.floor(Date.now() / 1000);
  try {
    await ensureTable(env.DB);
    const row = await env.DB.prepare(
      `INSERT INTO rate_limits (k, n, exp) VALUES (?1, 1, ?2)
       ON CONFLICT(k) DO UPDATE SET
         n   = CASE WHEN exp <= ?3 THEN 1 ELSE n + 1 END,
         exp = CASE WHEN exp <= ?3 THEN ?2 ELSE exp END
       RETURNING n`
    ).bind(`${scope}:${ip}`, now + windowSec, now).first();
    if (Math.random() < 0.02)                                  // occasional tidy-up
      await env.DB.prepare('DELETE FROM rate_limits WHERE exp <= ?').bind(now).run();
    return !!row && row.n > max;
  } catch (e) {
    console.error(`[ratelimit] ${scope}: ${e}`);
    return false;
  }
}
