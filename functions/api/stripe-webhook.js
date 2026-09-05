// Stripe -> order record in D1 + notification email to the shop owner.
// Signature is verified before anything is trusted.
const NOTIFY_TO   = 'chris@dorcorazors.co.nz';
const NOTIFY_FROM = 'orders@dorcorazors.co.nz';

const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');

async function verify(raw, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;   // replay window
  const key = await crypto.subtle.importKey('raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${parts.t}.${raw}`)));
  if (mac.length !== parts.v1.length) return false;
  let diff = 0;                                                            // constant-time compare
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

const money = c => '$' + (c / 100).toFixed(2);

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('not configured', { status: 500 });
  if (!await verify(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET))
    return new Response('bad signature', { status: 400 });

  const event = JSON.parse(raw);
  if (event.type !== 'checkout.session.completed') return new Response('ignored', { status: 200 });
  const s = event.data.object;

  // line items aren't in the event payload — fetch them
  let items = [];
  try {
    const r = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${s.id}/line_items?limit=50`,
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
    items = (await r.json()).data || [];
  } catch (e) {}

  const ship = (s.shipping_details || s.customer_details || {});
  const addr = ship.address || {};
  const email = (s.customer_details || {}).email || '';
  const when = new Date((s.created || Date.now() / 1000) * 1000).toISOString();

  if (env.DB) {
    try {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO orders
         (id, source, external_ref, status, date_created, email, currency,
          subtotal, shipping_total, shipping_method, total, city, postcode)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        Math.floor(Date.now() / 1000), 'stripe', s.id, 'completed', when, email,
        (s.currency || 'nzd').toUpperCase(),
        (s.amount_subtotal || 0) / 100,
        ((s.total_details || {}).amount_shipping || 0) / 100,
        (s.shipping_cost && s.shipping_cost.shipping_rate) ? 'stripe' : '',
        (s.amount_total || 0) / 100, addr.city || '', addr.postal_code || ''
      ).run();
      for (const li of items) {
        await env.DB.prepare(
          'INSERT INTO order_items (order_id, name, sku, quantity, total) VALUES (?,?,?,?,?)'
        ).bind(Math.floor(Date.now() / 1000), li.description || '', '',
               li.quantity || 1, (li.amount_total || 0) / 100).run();
      }
    } catch (e) {}
  }

  const lines = items.map(li => `  ${li.quantity} x ${li.description} — ${money(li.amount_total)}`).join('\n');
  const body =
`New order — ${money(s.amount_total)} ${(s.currency || 'nzd').toUpperCase()}

${lines}

Subtotal  ${money(s.amount_subtotal || 0)}
Shipping  ${money((s.total_details || {}).amount_shipping || 0)}
Total     ${money(s.amount_total || 0)}

Ship to:
  ${ship.name || ''}
  ${addr.line1 || ''}
  ${addr.line2 || ''}
  ${addr.city || ''} ${addr.postal_code || ''}
  ${addr.country || ''}

Email: ${email}
Stripe: https://dashboard.stripe.com/payments/${s.payment_intent || ''}`;

  if (env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `DORCO Orders <${NOTIFY_FROM}>`, to: [NOTIFY_TO], reply_to: email || undefined,
          subject: `New order — ${money(s.amount_total)} — ${ship.name || email}`, text: body
        })
      });
    } catch (e) {}
  }
  return new Response('ok', { status: 200 });
}
