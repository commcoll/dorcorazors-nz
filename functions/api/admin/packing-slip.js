import { checkSession } from './_lib.js';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const money = n => '$' + (Number(n) || 0).toFixed(2);

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_PASSWORD || !await checkSession(request, env.ADMIN_PASSWORD))
    return new Response('Not signed in.', { status: 401 });
  if (!env.DB) return new Response('Database unavailable.', { status: 500 });

  const url = new URL(request.url);
  const ids = (url.searchParams.get('id') || '').split(',')
    .map(x => parseInt(x, 10)).filter(Boolean).slice(0, 50);
  if (!ids.length) return new Response('Missing order id.', { status: 400 });

  const marks = ids.map(() => '?').join(',');
  let orders = [], items = [];
  try {
    orders = (await env.DB.prepare(
      `SELECT id, date_created, email, phone, total, subtotal, shipping_total,
              shipping_method, ship_name, ship_line1, ship_line2, city, ship_state,
              postcode, ship_country, tracking
       FROM orders WHERE id IN (${marks}) ORDER BY id`).bind(...ids).all()).results || [];
    items = (await env.DB.prepare(
      `SELECT order_id, name, quantity, total FROM order_items
       WHERE order_id IN (${marks})`).bind(...ids).all()).results || [];
  } catch (e) { return new Response('Query failed.', { status: 500 }); }
  if (!orders.length) return new Response('Order not found.', { status: 404 });

  const byOrder = {};
  for (const it of items) (byOrder[it.order_id] = byOrder[it.order_id] || []).push(it);

  const slips = orders.map(o => {
    const lines = (byOrder[o.id] || []).map(i =>
      `<tr><td class="qty">${i.quantity}</td><td>${esc(i.name)}</td></tr>`).join('')
      || '<tr><td class="qty">&mdash;</td><td>No line items recorded</td></tr>';
    const addr = [o.ship_name, o.ship_line1, o.ship_line2,
      [o.city, o.ship_state, o.postcode].filter(Boolean).join(' '),
      o.ship_country === 'NZ' ? 'New Zealand' : o.ship_country]
      .filter(Boolean).map(esc).join('<br>');
    return `<section class="slip">
  <header>
    <img class="logo" src="/images/logo.png" alt="DORCO">
    <div class="meta">
      <div class="order-no">Order ${esc(o.id)}</div>
      <div>${esc(String(o.date_created || '').slice(0, 10))}</div>
    </div>
  </header>

  <div class="cols">
    <div>
      <h2>Deliver to</h2>
      <p class="addr">${addr || '&mdash;'}</p>
      ${o.phone ? `<p class="muted">${esc(o.phone)}</p>` : ''}
      ${o.email ? `<p class="muted">${esc(o.email)}</p>` : ''}
    </div>
    <div>
      <h2>Delivery</h2>
      <p>${esc(o.shipping_method || 'Standard')}</p>
      ${o.tracking ? `<p class="muted">Tracking: ${esc(o.tracking)}</p>` : ''}
      <p class="muted">Order total ${money(o.total)}</p>
    </div>
  </div>

  <h2>Items</h2>
  <table class="items"><thead><tr><th class="qty">Qty</th><th>Product</th></tr></thead>
    <tbody>${lines}</tbody></table>

  <footer>
    <p><strong>Thanks for your order.</strong></p>
    <p class="muted">Dorco&reg; New Zealand &mdash; the exclusive NZ distributor of Dorco shaving products.<br>
       Questions? info@dorcorazors.co.nz &middot; dorcorazors.co.nz</p>
  </footer>
</section>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="en-NZ"><head><meta charset="UTF-8">
<title>Packing slip${orders.length > 1 ? 's' : ' — Order ' + esc(orders[0].id)}</title>
<meta name="robots" content="noindex, nofollow">
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; margin: 0;
         background: #f5f6f8; font-size: 13px; line-height: 1.5; }
  .slip { background: #fff; max-width: 190mm; margin: 16px auto; padding: 28px 32px 24px; }
  header { display: flex; justify-content: space-between; align-items: flex-start;
           border-bottom: 3px solid #c0ce42; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { height: 40px; width: auto; }
  .meta { text-align: right; font-size: 12px; color: #6b7280; }
  .order-no { font-size: 17px; font-weight: 800; color: #1a1a1a; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
  h2 { font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
       color: #95a1b0; margin: 0 0 6px; }
  p { margin: 0 0 4px; }
  .addr { font-size: 15px; line-height: 1.6; }
  .muted { color: #6b7280; font-size: 12px; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.items th { text-align: left; font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
                   color: #95a1b0; border-bottom: 1px solid #e2e2e2; padding: 6px 8px; }
  table.items td { padding: 10px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .qty { width: 56px; font-weight: 700; }
  footer { margin-top: 28px; border-top: 1px solid #e2e2e2; padding-top: 14px; }
  .toolbar { max-width: 190mm; margin: 16px auto -8px; text-align: right; }
  .toolbar button { font: inherit; font-weight: 700; padding: 8px 18px; border: none;
                    border-radius: 4px; background: #4e5768; color: #fff; cursor: pointer; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .slip { margin: 0; max-width: none; padding: 0; page-break-after: always; }
    .slip:last-child { page-break-after: auto; }
  }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Print</button></div>
${slips}
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });</script>
</body></html>`;

  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
