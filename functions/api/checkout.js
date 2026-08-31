// Cloudflare Pages Function: creates a Stripe Checkout Session for the whole basket.
// Price ids AND amounts live here, server-side. The browser only ever sends ids and
// quantities, so a tampered basket can change neither the prices charged nor whether
// the order qualifies for free shipping.
const CATALOGUE = {
  'p3':      { price: 'price_1UARJ7LgI1sZykgoKmAdV9mQ', amount: 799 },
  'p3-r4':   { price: 'price_1UARJ9LgI1sZykgomNf7r1Oc', amount: 1799 },
  'p3-r16':  { price: 'price_1UARJALgI1sZykgoAaAeTMDB', amount: 4599 },
  'p3-r24':  { price: 'price_1UARJBLgI1sZykgoeW34nuae', amount: 6199 },
  'p4':      { price: 'price_1UARJCLgI1sZykgo8D0SvcHj', amount: 899 },
  'p4-r4':   { price: 'price_1UARJDLgI1sZykgo0rGKtfXM', amount: 2199 },
  'p4-r16':  { price: 'price_1UARJELgI1sZykgo6pv4aLr8', amount: 5835 },
  'p4-r24':  { price: 'price_1UARJFLgI1sZykgo7IRPW6Dh', amount: 7915 },
  'p6':      { price: 'price_1UARJGLgI1sZykgoRqcGFMd0', amount: 1299 },
  'p6-r4':   { price: 'price_1UARJHLgI1sZykgoUxZ5hTKJ', amount: 3199 },
  'p6-r16':  { price: 'price_1UARJILgI1sZykgoY9taVCCm', amount: 8515 },
  'p6-r24':  { price: 'price_1UARJJLgI1sZykgoesTZlEpb', amount: 11555 },
  'eve3':    { price: 'price_1UAQHdLgI1sZykgocL1rjB53', amount: 999 },
  'c-p3':    { price: 'price_1UAQHdLgI1sZykgo6yxTarxD', amount: 999 },
  'c-p4':    { price: 'price_1UAQHdLgI1sZykgohFdVsQr9', amount: 1299 },
  'c-p6':    { price: 'price_1UAQHdLgI1sZykgoUAEkxQ8j', amount: 1899 },
  'c-e3':    { price: 'price_1UAQHdLgI1sZykgorROgmsdC', amount: 1199 },
  'c-e6':    { price: 'price_1UAQHdLgI1sZykgoNblNPAxv', amount: 1799 }
};

const RATE_STANDARD = 'shr_1UAQFvLgI1sZykgoRLVrcnvt'; // Tracked Courier  $7.00
const RATE_FREE     = 'shr_1UAbl9LgI1sZykgoNruh47o1'; // Free Shipping    $0.00
const RATE_RURAL    = 'shr_1UAblALgI1sZykgoZmLNSVfe'; // Rural Delivery  $11.00
const RATE_RURAL_RED= 'shr_1UAc2GLgI1sZykgovqjiYkFR'; // Rural Delivery   $5.00 (over threshold)
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

  // From $30: standard delivery is free and the rural surcharge drops to $5.
  const qualifies = subtotal >= FREE_SHIPPING_FROM;
  params.set('shipping_options[0][shipping_rate]', qualifies ? RATE_FREE : RATE_STANDARD);
  params.set('shipping_options[1][shipping_rate]', qualifies ? RATE_RURAL_RED : RATE_RURAL);

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
