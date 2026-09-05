import { checkSession, json } from './_lib.js';

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_PASSWORD) return json({error:'Admin not configured.'}, 500);
  if (!await checkSession(request, env.ADMIN_PASSWORD)) return json({error:'Not signed in.'}, 401);
  if (!env.DB) return json({error:'Database unavailable.'}, 500);

  const q = async (sql, ...a) => (await env.DB.prepare(sql).bind(...a).all()).results || [];
  try {
    const [summary, byYear, recent, top, customers, enquiries, subs] = await Promise.all([
      q(`SELECT COUNT(*) orders, ROUND(SUM(total),2) revenue,
                MIN(date_created) first, MAX(date_created) last
         FROM orders WHERE status IN ('completed','processing')`),
      q(`SELECT substr(date_created,1,4) yr, COUNT(*) n, ROUND(SUM(total),2) rev
         FROM orders WHERE status IN ('completed','processing')
         GROUP BY yr ORDER BY yr DESC`),
      q(`SELECT id, source, date_created, email, total, city, shipping_method, status
         FROM orders ORDER BY date_created DESC LIMIT 50`),
      q(`SELECT name, SUM(quantity) qty, ROUND(SUM(total),2) rev
         FROM order_items GROUP BY name ORDER BY qty DESC LIMIT 15`),
      q(`SELECT email, first_name, last_name, order_count, total_spent, last_order
         FROM customers ORDER BY total_spent DESC LIMIT 25`),
      q(`SELECT id, created, first_name, last_name, email, subject, message, handled
         FROM enquiries ORDER BY created DESC LIMIT 50`),
      q(`SELECT COUNT(*) n FROM subscribers WHERE unsubscribed=0`)
    ]);
    return json({ summary: summary[0]||{}, byYear, recent, top, customers, enquiries,
                  subscribers: (subs[0]||{}).n || 0 });
  } catch (e) {
    return json({error:'Query failed.'}, 500);
  }
}
