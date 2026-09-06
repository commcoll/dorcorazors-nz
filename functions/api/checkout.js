// Cloudflare Pages Function: creates a Stripe Checkout Session for the whole basket.
// Price ids AND amounts live here, server-side. The browser only ever sends ids and
// quantities, so a tampered basket can change neither the prices charged nor whether
// the order qualifies for free shipping.
const CATALOGUE = {
  'p3':      { price: 'price_1UCTW0LgI1sZykgobehb8smg', amount: 799 },
  'p3-r4':   { price: 'price_1UCTW1LgI1sZykgoxJUC1leb', amount: 1799 },
  'p3-r16':  { price: 'price_1UCTW2LgI1sZykgo652JBPvF', amount: 4599 },
  'p3-r24':  { price: 'price_1UCTW3LgI1sZykgof3sA7bFk', amount: 6199 },
  'p4':      { price: 'price_1UCTW3LgI1sZykgoL5nTdN9u', amount: 899 },
  'p4-r4':   { price: 'price_1UCTW4LgI1sZykgocqUwNdRI', amount: 2199 },
  'p4-r16':  { price: 'price_1UCTW4LgI1sZykgoLy9wU7Bx', amount: 5835 },
  'p4-r24':  { price: 'price_1UCTW5LgI1sZykgoFeI7N9vx', amount: 7915 },
  'p6':      { price: 'price_1UCTW5LgI1sZykgo2yh8UISE', amount: 1299 },
  'p6-r4':   { price: 'price_1UCTW6LgI1sZykgoka56oO15', amount: 3199 },
  'p6-r16':  { price: 'price_1UCTW7LgI1sZykgoDXnxeum4', amount: 8515 },
  'p6-r24':  { price: 'price_1UCTW7LgI1sZykgo7lDOTWIw', amount: 11555 },
  'eve3':    { price: 'price_1UCTW8LgI1sZykgojDxeGaYm', amount: 999 },
  'c-p3':    { price: 'price_1UCTW8LgI1sZykgohhaHeHBg', amount: 999 },
  'c-p4':    { price: 'price_1UCTW9LgI1sZykgoFyHF2kk9', amount: 1299 },
  'c-p6':    { price: 'price_1UCTWALgI1sZykgoQocMiYL6', amount: 1899 },
  'c-e3':    { price: 'price_1UCTWALgI1sZykgorDizW8TY', amount: 1199 },
  'test':    { price: 'price_1UCTcDLgI1sZykgoyhsZPYss', amount: 50 },
  'c-e6':    { price: 'price_1UCTWBLgI1sZykgoTRjZGtlF', amount: 1799 }
};

const RATE_STANDARD = 'shr_1UCTWBLgI1sZykgo49hFRftZ'; // Tracked Courier  $7.00
const RATE_FREE     = 'shr_1UCTWCLgI1sZykgonqfRLrVy'; // Free Shipping    $0.00
const RATE_RURAL    = 'shr_1UCTWCLgI1sZykgoZTAdaqpX'; // Rural Delivery  $11.00
const RATE_RURAL_RED= 'shr_1UCTWDLgI1sZykgodJMgVXKf'; // Rural Delivery   $5.00 (over threshold)
const FREE_SHIPPING_FROM = 3000;                      // $30.00 subtotal

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' }
  });

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Payments are not configured.' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Malformed request.' }, 400); }

  const items = Array.isArray(body && body.items) ? body.items : [];
  if (!items.length) return json({ error: 'Your basket is empty.' }, 400);
  if (items.length > 20) return json({ error: 'Too many items.' }, 400);

  const params = new URLSearchParams();
  params.set('mode', 'payment');

  let subtotal = 0, i = 0;
  for (const item of items) {
    const entry = CATALOGUE[item && item.id];
    if (!entry) return json({ error: 'Unknown item in basket.' }, 400);
    const qty = Math.max(1, Math.min(20, parseInt(item.qty, 10) || 1));
    subtotal += entry.amount * qty;
    params.set(`line_items[${i}][price]`, entry.price);
    params.set(`line_items[${i}][quantity]`, String(qty));
    i++;
  }

  // The 'test' item ships free on its own — it isn't a real product.
  const testOnly = items.every(it => it && it.id === 'test');
  if (testOnly) {
    params.set('shipping_options[0][shipping_rate]', RATE_FREE);
  } else {
    // From $30: standard delivery is free and the rural surcharge drops to $5.
    const qualifies = subtotal >= FREE_SHIPPING_FROM;
    params.set('shipping_options[0][shipping_rate]', qualifies ? RATE_FREE : RATE_STANDARD);
    params.set('shipping_options[1][shipping_rate]', qualifies ? RATE_RURAL_RED : RATE_RURAL);
  }

  params.set('shipping_address_collection[allowed_countries][0]', 'NZ');
  const origin = new URL(request.url).origin;
  params.set('success_url', `${origin}/thank-you`);
  params.set('cancel_url', `${origin}/cart`);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  const data = await res.json();
  if (!res.ok) return json({ error: (data.error && data.error.message) || 'Checkout failed.' }, 502);
  return json({ url: data.url });
}
