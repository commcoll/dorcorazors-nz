import { checkSession, json } from './_lib.js';

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_PASSWORD) return json({error:'Admin not configured.'}, 500);
  if (!await checkSession(request, env.ADMIN_PASSWORD)) return json({error:'Not signed in.'}, 401);
  if (!env.DB) return json({error:'Database unavailable.'}, 500);

  const q = async (sql, ...a) => (await env.DB.prepare(sql).bind(...a).all()).results || [];
  try {
    const [summary, byYear, recent, top, customers, enquiries, subs, queue, qitems] = await Promise.all([
      q(`SELECT COUNT(*) orders, ROUND(SUM(total),2) revenue,
                MIN(date_created) first, MAX(date_created) last
         FROM orders WHERE status IN ('completed','processing')`),
      q(`SELECT substr(date_created,1,4) yr, COUNT(*) n, ROUND(SUM(total),2) rev
         FROM orders WHERE status IN ('completed','processing')
         GROUP BY yr ORDER BY yr DESC`),
      q(`SELECT id, source, date_created, email, total, city, shipping_method, status,
                ship_name, ship_line1, ship_line2, ship_state, ship_country, postcode,
                phone, fulfilled, fulfilled_at, tracking
         FROM orders ORDER BY date_created DESC LIMIT 50`),
      q(`SELECT name, SUM(quantity) qty, ROUND(SUM(total),2) rev
         FROM order_items GROUP BY name ORDER BY qty DESC LIMIT 15`),
      q(`SELECT email, first_name, last_name, order_count, total_spent, last_order
         FROM customers ORDER BY total_spent DESC LIMIT 25`),
      q(`SELECT id, created, first_name, last_name, email, subject, message, handled
         FROM enquiries ORDER BY created DESC LIMIT 50`),
      q(`SELECT COUNT(*) n FROM subscribers WHERE unsubscribed=0`),
      q(`SELECT id, date_created, email, phone, total, shipping_method,
                ship_name, ship_line1, ship_line2, city, ship_state, postcode, ship_country
         FROM orders
         WHERE source='stripe' AND COALESCE(fulfilled,0)=0 AND status='completed'
         ORDER BY date_created ASC`),
      q(`SELECT oi.order_id, oi.name, oi.quantity
         FROM order_items oi JOIN orders o ON o.id=oi.order_id
         WHERE o.source='stripe' AND COALESCE(o.fulfilled,0)=0`)
    ]);
    const byOrder = {};
    for (const it of qitems) (byOrder[it.order_id] = byOrder[it.order_id] || []).push(it);
    for (const o of queue) o.items = byOrder[o.id] || [];
    return json({ summary: summary[0]||{}, byYear, recent, top, customers, enquiries,
                  subscribers: (subs[0]||{}).n || 0, queue });
  } catch (e) {
    return json({error:'Query failed.'}, 500);
  }
}
