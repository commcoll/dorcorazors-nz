// Cloudflare Pages Function: creates a Stripe Checkout Session for the whole basket.
// Prices are resolved server-side from this map — the browser only ever sends ids and
// quantities, so a tampered cart cannot change what anything costs.
const CATALOGUE = {
  'p3':      'price_1UARJ7LgI1sZykgoKmAdV9mQ',
  'p3-r4':   'price_1UARJ9LgI1sZykgomNf7r1Oc',
  'p3-r16':  'price_1UARJALgI1sZykgoAaAeTMDB',
  'p3-r24':  'price_1UARJBLgI1sZykgoeW34nuae',
  'p4':      'price_1UARJCLgI1sZykgo8D0SvcHj',
  'p4-r4':   'price_1UARJDLgI1sZykgo0rGKtfXM',
  'p4-r16':  'price_1UARJELgI1sZykgo6pv4aLr8',
  'p4-r24':  'price_1UARJFLgI1sZykgo7IRPW6Dh',
  'p6':      'price_1UARJGLgI1sZykgoRqcGFMd0',
  'p6-r4':   'price_1UARJHLgI1sZykgoUxZ5hTKJ',
  'p6-r16':  'price_1UARJILgI1sZykgoY9taVCCm',
  'p6-r24':  'price_1UARJJLgI1sZykgoesTZlEpb',
  'eve3':    'price_1UAQHdLgI1sZykgocL1rjB53',
  'c-p3':    'price_1UAQHdLgI1sZykgo6yxTarxD',
  'c-p4':    'price_1UAQHdLgI1sZykgohFdVsQr9',
  'c-p6':    'price_1UAQHdLgI1sZykgoUAEkxQ8j',
  'c-e3':    'price_1UAQHdLgI1sZykgorROgmsdC',
  'c-e6':    'price_1UAQHdLgI1sZykgoNblNPAxv'
};
const SHIPPING_RATE = 'shr_1UAQFvLgI1sZykgoRLVrcnvt';

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
  let i = 0;
  for (const item of items) {
    const price = CATALOGUE[item && item.id];
    if (!price) return json({ error: 'Unknown item in basket.' }, 400);
    const qty = Math.max(1, Math.min(20, parseInt(item.qty, 10) || 1));
    params.set(`line_items[${i}][price]`, price);
    params.set(`line_items[${i}][quantity]`, String(qty));
    i++;
  }
  params.set('shipping_address_collection[allowed_countries][0]', 'NZ');
  params.set('shipping_options[0][shipping_rate]', SHIPPING_RATE);
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
