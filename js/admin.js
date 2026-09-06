(function () {
  'use strict';
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var money = function (n) { return '$' + (Number(n) || 0).toFixed(2); };
  var date = function (s) { return s ? String(s).slice(0, 10) : ''; };

  function table(cols, rows, cells) {
    if (!rows.length) return '<p class="cart-empty">Nothing here yet.</p>';
    return '<div style="overflow-x:auto;"><table class="admin-table"><thead><tr>' +
      cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr>' + cells(r).map(function (v) { return '<td>' + v + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }


  function addr(o) {
    return [o.ship_name, o.ship_line1, o.ship_line2,
            [o.city, o.ship_state, o.postcode].filter(Boolean).join(' '),
            o.ship_country].filter(function (x) { return x; }).map(esc).join('<br>');
  }

  function fulfilSection(queue) {
    if (!queue || !queue.length)
      return '<h2 style="font-size:20px;margin:28px 0 12px;">To ship</h2>' +
             '<p class="cart-empty">Nothing awaiting shipment.</p>';
    return '<h2 style="font-size:20px;margin:28px 0 12px;">To ship (' + queue.length + ')</h2>' +
      queue.map(function (o) {
        var items = (o.items || []).map(function (i) {
          return '<li>' + i.quantity + ' &times; ' + esc(i.name) + '</li>';
        }).join('');
        return '<div class="ship-card" data-id="' + o.id + '">' +
          '<div class="ship-grid">' +
            '<div><div class="admin-stat-l">Ship to</div><p>' + addr(o) + '</p>' +
              (o.phone ? '<p style="font-size:12px;color:var(--steel);">' + esc(o.phone) + '</p>' : '') +
              '<p style="font-size:12px;color:var(--steel);">' + esc(o.email) + '</p></div>' +
            '<div><div class="admin-stat-l">Items</div><ul style="font-size:13px;margin:4px 0 0 16px;">' + items + '</ul></div>' +
            '<div><div class="admin-stat-l">Order</div>' +
              '<p style="font-size:13px;">' + esc(date(o.date_created)) + '<br>' + money(o.total) +
              '<br><span style="color:var(--steel);">' + esc(o.shipping_method || '') + '</span></p></div>' +
          '</div>' +
          '<div class="ship-actions">' +
            '<input class="opt-select track" placeholder="Tracking number (optional)" style="max-width:280px;">' +
            '<button class="btn btn-primary mark" style="width:auto;">Mark shipped</button>' +
          '</div></div>';
      }).join('');
  }

  function render(d) {
    var s = d.summary || {};
    var stat = function (label, val) {
      return '<div class="admin-stat"><div class="admin-stat-v">' + val +
             '</div><div class="admin-stat-l">' + esc(label) + '</div></div>';
    };
    var html =
      '<div class="admin-stats">' +
        stat('Orders', s.orders || 0) +
        stat('Revenue', money(s.revenue)) +
        stat('Customers', (d.customers || []).length ? '' : '') +
        stat('Subscribers', d.subscribers || 0) +
      '</div>';
    // replace the placeholder customers stat properly
    html = html.replace('<div class="admin-stat-v"></div><div class="admin-stat-l">Customers</div>',
      '<div class="admin-stat-v">' + ((d.customers || []).length) + '+</div><div class="admin-stat-l">Top customers</div>');

    html += '<p style="font-size:13px;color:var(--steel);margin:4px 0 28px;">' +
            esc(date(s.first)) + ' &ndash; ' + esc(date(s.last)) + '</p>';

    html += fulfilSection(d.queue);

    html += '<h2 style="font-size:20px;margin:28px 0 12px;">By year</h2>' +
      table(['Year', 'Orders', 'Revenue'], d.byYear || [], function (r) {
        return [esc(r.yr), r.n, money(r.rev)];
      });

    html += '<h2 style="font-size:20px;margin:28px 0 12px;">Recent orders</h2>' +
      table(['Date', 'Source', 'Email', 'City', 'Total', 'Status', 'Fulfilment'], d.recent || [], function (r) {
        return [esc(date(r.date_created)), esc(r.source), esc(r.email), esc(r.city),
                money(r.total), esc(r.status),
                r.source === 'stripe' ? (r.fulfilled ? 'Shipped' : '<b>To ship</b>') : '&mdash;'];
      });

    html += '<h2 style="font-size:20px;margin:28px 0 12px;">Best sellers</h2>' +
      table(['Product', 'Qty', 'Revenue'], d.top || [], function (r) {
        return [esc(r.name), r.qty, money(r.rev)];
      });

    html += '<h2 style="font-size:20px;margin:28px 0 12px;">Top customers</h2>' +
      table(['Name', 'Email', 'Orders', 'Spent', 'Last order'], d.customers || [], function (r) {
        return [esc((r.first_name || '') + ' ' + (r.last_name || '')), esc(r.email),
                r.order_count, money(r.total_spent), esc(date(r.last_order))];
      });

    html += '<h2 style="font-size:20px;margin:28px 0 12px;">Enquiries</h2>' +
      table(['Date', 'From', 'Email', 'Subject', 'Message'], d.enquiries || [], function (r) {
        return [esc(date(r.created)), esc((r.first_name || '') + ' ' + (r.last_name || '')),
                esc(r.email), esc(r.subject),
                '<span title="' + esc(r.message) + '">' + esc(String(r.message || '').slice(0, 80)) + '</span>'];
      });

    html += '<div style="margin:32px 0 8px;display:flex;gap:12px;flex-wrap:wrap;">' +
      '<a class="btn btn-outline" href="/api/admin/subscribers" style="width:auto;display:inline-block;">Download subscribers CSV</a>' +
      '<button id="logout" class="btn btn-primary" style="width:auto;">Sign out</button></div>';

    var panel = document.getElementById('panel');
    panel.innerHTML = html;
    panel.hidden = false;
    document.getElementById('login-box').hidden = true;
    [].forEach.call(panel.querySelectorAll('.ship-card'), function (card) {
      card.querySelector('.mark').addEventListener('click', function () {
        var btn = this; btn.disabled = true; btn.textContent = 'Saving…';
        fetch('/api/admin/fulfil', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ id: Number(card.dataset.id), fulfilled: true,
                                 tracking: card.querySelector('.track').value })
        }).then(function (r) {
          if (r.ok) { card.style.opacity = '.4'; btn.textContent = 'Shipped ✓'; }
          else { btn.disabled = false; btn.textContent = 'Mark shipped'; }
        }).catch(function () { btn.disabled = false; btn.textContent = 'Mark shipped'; });
      });
    });

    document.getElementById('logout').addEventListener('click', function () {
      fetch('/api/admin/logout', { method: 'POST' }).then(function () { location.reload(); });
    });
  }

  function load() {
    return fetch('/api/admin/data', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json().then(render).then(function () { return true; }) : false; });
  }

  function signIn() {
    var pw = document.getElementById('pw').value;
    var err = document.getElementById('login-err');
    err.hidden = true;
    fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin', body: JSON.stringify({ password: pw })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok) { document.getElementById('pw').value = ''; return load(); }
        err.textContent = res.d.error || 'Sign in failed.'; err.hidden = false;
      })
      .catch(function () { err.textContent = 'Sign in failed.'; err.hidden = false; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    load();                                        // already signed in?
    document.getElementById('login-btn').addEventListener('click', signIn);
    document.getElementById('pw').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') signIn();
    });
  });
})();
