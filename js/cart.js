/* DORCO basket — stored per browser in localStorage, priced server-side at checkout. */
(function () {
  'use strict';
  var KEY = 'dorco-cart';

  var CATALOGUE = {
    'p3':     { name: 'PACE 3 PLUS',                        price: 799,   img: 'images/pace-3-plus.jpg' },
    'p3-r4':  { name: 'PACE 3 PLUS + 4 Refills',            price: 1799,  img: 'images/pace-3-plus.jpg' },
    'p3-r16': { name: 'PACE 3 PLUS + 16 Refills',           price: 4599,  img: 'images/pace-3-plus.jpg' },
    'p3-r24': { name: 'PACE 3 PLUS + 24 Refills',           price: 6199,  img: 'images/pace-3-plus.jpg' },
    'p4':     { name: 'PACE 4 PRO',                         price: 899,   img: 'images/pace-4-pro.jpg' },
    'p4-r4':  { name: 'PACE 4 PRO + 4 Refills',             price: 2199,  img: 'images/pace-4-pro.jpg' },
    'p4-r16': { name: 'PACE 4 PRO + 16 Refills',            price: 5835,  img: 'images/pace-4-pro.jpg' },
    'p4-r24': { name: 'PACE 4 PRO + 24 Refills',            price: 7915,  img: 'images/pace-4-pro.jpg' },
    'p6':     { name: 'PACE 6 PRO',                         price: 1299,  img: 'images/pace-6-pro.jpg' },
    'p6-r4':  { name: 'PACE 6 PRO + 4 Refills',             price: 3199,  img: 'images/pace-6-pro.jpg' },
    'p6-r16': { name: 'PACE 6 PRO + 16 Refills',            price: 8515,  img: 'images/pace-6-pro.jpg' },
    'p6-r24': { name: 'PACE 6 PRO + 24 Refills',            price: 11555, img: 'images/pace-6-pro.jpg' },
    'eve3':   { name: 'Dorco EVE 3',                        price: 999,   img: 'images/eve-3.jpg' },
    'c-p3':   { name: 'PACE 3 PLUS refill cartridges x 4',  price: 999,   img: 'images/pace-3-plus-cart-4.jpg' },
    'c-p4':   { name: 'PACE 4 PRO refill cartridges x 4',   price: 1299,  img: 'images/pace-4-pro-cart-4.jpg' },
    'c-p6':   { name: 'PACE 6 PRO refill cartridges x 4',   price: 1899,  img: 'images/pace-6-pro-cart-4.jpg' },
    'c-e3':   { name: 'EVE 3 refill cartridges x 4',        price: 1199,  img: 'images/eve-3-cart-4.jpg' },
    'c-e6':   { name: 'EVE 6 refill cartridges x 4',        price: 1799,  img: 'images/eve-6-cart-4.jpg' }
  };
  var SHIPPING = 700;

  function money(c) { return '$' + (c / 100).toFixed(2); }

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      return (v && typeof v === 'object') ? v : {};
    } catch (e) { return {}; }
  }
  function write(cart) {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {}
    paintBadge();
  }
  function count(cart) {
    var n = 0; for (var k in cart) { n += cart[k]; } return n;
  }

  function add(id, qty) {
    if (!CATALOGUE[id]) return;
    var cart = read();
    cart[id] = Math.min(20, (cart[id] || 0) + (qty || 1));
    write(cart);
  }
  function setQty(id, qty) {
    var cart = read();
    if (qty <= 0) { delete cart[id]; } else { cart[id] = Math.min(20, qty); }
    write(cart);
  }

  function paintBadge() {
    var n = count(read());
    [].forEach.call(document.querySelectorAll('.cart-count'), function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
  }

  /* ---- Add to cart buttons ---- */
  function wireAddButtons() {
    [].forEach.call(document.querySelectorAll('.add-btn'), function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var foot = btn.closest('.card-foot');
        var sel = foot ? foot.querySelector('.opt-select') : null;
        var opt = sel ? sel.options[sel.selectedIndex] : null;
        var id = opt ? opt.dataset.id : btn.dataset.id;
        var qty = opt && opt.dataset.qty ? parseInt(opt.dataset.qty, 10) : 1;
        if (!id) return;
        add(id, qty);
        var original = btn.textContent;
        btn.textContent = 'Added ✓';
        btn.classList.add('added');
        setTimeout(function () {
          btn.textContent = original;
          btn.classList.remove('added');
        }, 1400);
      });
    });
    /* selector changes the displayed price only; the id travels with the option */
    [].forEach.call(document.querySelectorAll('.opt-select'), function (sel) {
      sel.addEventListener('change', function () {
        var foot = sel.closest('.card-foot');
        var opt = sel.options[sel.selectedIndex];
        var el = foot.querySelector('.product-price');
        if (el && opt.dataset.price) el.textContent = opt.dataset.price;
      });
    });
  }

  /* ---- Cart page ---- */
  function renderCart() {
    var host = document.getElementById('cart-root');
    if (!host) return;
    var cart = read();
    var ids = Object.keys(cart);

    if (!ids.length) {
      host.innerHTML = '<p class="cart-empty">Your basket is empty.</p>' +
        '<a href="products" class="btn btn-primary" style="display:inline-block;width:auto;">Browse products</a>';
      return;
    }

    var subtotal = 0, rows = '';
    ids.forEach(function (id) {
      var p = CATALOGUE[id]; if (!p) return;
      var line = p.price * cart[id];
      subtotal += line;
      rows +=
        '<div class="cart-row" data-id="' + id + '">' +
          '<img src="' + p.img + '" alt="">' +
          '<div class="cart-row-main">' +
            '<div class="cart-row-name">' + p.name + '</div>' +
            '<div class="cart-row-unit">' + money(p.price) + ' each</div>' +
          '</div>' +
          '<div class="cart-qty">' +
            '<button class="qty-btn" data-act="dec" aria-label="Decrease">−</button>' +
            '<span class="qty-val">' + cart[id] + '</span>' +
            '<button class="qty-btn" data-act="inc" aria-label="Increase">+</button>' +
          '</div>' +
          '<div class="cart-row-line">' + money(line) + '</div>' +
          '<button class="cart-remove" data-act="rm" aria-label="Remove">×</button>' +
        '</div>';
    });

    host.innerHTML =
      '<div class="cart-list">' + rows + '</div>' +
      '<div class="cart-summary">' +
        '<div class="cart-line"><span>Subtotal</span><span>' + money(subtotal) + '</span></div>' +
        '<div class="cart-line"><span>Shipping</span><span>' + money(SHIPPING) + '</span></div>' +
        '<div class="cart-line cart-total"><span>Total</span><span>' + money(subtotal + SHIPPING) + '</span></div>' +
        '<button id="checkout-btn" class="btn btn-primary">Checkout</button>' +
        '<p class="cart-note">Prices include GST. Delivery within New Zealand.</p>' +
        '<p class="cart-error" id="cart-error" hidden></p>' +
      '</div>';

    host.querySelector('.cart-list').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]'); if (!btn) return;
      var row = btn.closest('.cart-row'); var id = row.dataset.id;
      var cur = read()[id] || 0;
      if (btn.dataset.act === 'inc') setQty(id, cur + 1);
      else if (btn.dataset.act === 'dec') setQty(id, cur - 1);
      else setQty(id, 0);
      renderCart();
    });

    document.getElementById('checkout-btn').addEventListener('click', function () {
      var btn = this, err = document.getElementById('cart-error');
      var cart = read();
      var items = Object.keys(cart).map(function (id) { return { id: id, qty: cart[id] }; });
      if (!items.length) return;
      btn.disabled = true; btn.textContent = 'Redirecting…'; err.hidden = true;
      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok && res.d.url) { window.location.href = res.d.url; return; }
          throw new Error((res.d && res.d.error) || 'Checkout is unavailable.');
        })
        .catch(function (e) {
          err.textContent = e.message; err.hidden = false;
          btn.disabled = false; btn.textContent = 'Checkout';
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    paintBadge();
    wireAddButtons();
    renderCart();
  });
})();
