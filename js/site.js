/* Page behaviour that used to sit in inline scripts and onclick attributes. Kept here so the
   Content-Security-Policy can allow scripts from this site only (see _headers). */
(function () {
  'use strict';

  /* ---- mobile menu and FAQ accordions ---- */
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('.nav-toggle');
    if (toggle) {
      var links = toggle.closest('header').querySelector('.nav-links');
      if (links) links.classList.toggle('open');
      return;
    }
    var q = e.target.closest('.faq-question');
    if (q) {
      var item = q.closest('.faq-item');
      if (item) item.classList.toggle('open');
    }
  });

  /* ---- contact form ---- */
  function wireContact() {
    var f = document.getElementById('contact-form');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = f.querySelector('button[type=submit]');
      var status = document.getElementById('form-status');
      var payload = {
        first: f.fname.value, last: f.lname.value, email: f.email.value,
        subject: f.subject.value, message: f.message.value, website: f.website ? f.website.value : ''
      };
      btn.disabled = true; status.textContent = 'Sending…'; status.className = 'form-status';
      fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok) {
            status.className = 'form-status ok';
            status.textContent = 'Thanks — your message has been sent. We will be in touch shortly.';
            f.reset(); btn.disabled = true;
          } else {
            status.className = 'form-status err';
            status.textContent = res.d.error || 'Could not send. Please email us directly.';
            btn.disabled = false;
          }
        })
        .catch(function () {
          status.className = 'form-status err';
          status.textContent = 'Could not send. Please email us directly at info@dorcorazors.co.nz.';
          btn.disabled = false;
        });
    });
  }

  document.addEventListener('DOMContentLoaded', wireContact);
})();
