/**
 * KNFC Website — Form Submission Handler
 *
 * Intercepts the Contact and Special Request form submits,
 * POSTs them to the Google Apps Script backend (FormHandler.gs),
 * and shows a success or error message in place of the form.
 *
 * SETUP: paste your deployed Apps Script URL into FORM_HANDLER_URL below.
 * See google-apps-script/SETUP.md §Form Handler for step-by-step instructions.
 */

const FORM_HANDLER_URL = 'https://script.google.com/macros/s/AKfycbyS-bGcYghRatwNniQtJU4KxwBvyQc_ELWRSuuBtLbq0jzTVrHKxyNuYa28eQ2t6D3-/exec';

document.addEventListener('DOMContentLoaded', function () {
  wireForm('contact-form',         'contact');
  wireForm('special-request-form', 'special-request');
});

/**
 * Attach a submit listener to a form.
 * @param {string} formId   - The form's id attribute.
 * @param {string} formType - Value sent as `formType` to the Apps Script.
 */
function wireForm(formId, formType) {
  var form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    e.stopImmediatePropagation(); // prevent main.js catch-all from also firing

    if (FORM_HANDLER_URL === 'YOUR_APPS_SCRIPT_DEPLOYMENT_URL_HERE') {
      showError(form, null, null,
        'Form not yet configured — please email us at knfcoop@gmail.com or call (330) 673-2878.');
      return;
    }

    var btn          = form.querySelector('button[type="submit"]');
    var originalText = btn ? btn.textContent : '';

    setLoading(btn, true);
    clearError(form);

    // Build URL-encoded body (simple CORS request — no preflight OPTIONS needed)
    var params = new URLSearchParams({ formType: formType });
    new FormData(form).forEach(function (val, key) {
      params.append(key, val);
    });

    fetch(FORM_HANDLER_URL, { method: 'POST', body: params })
      .then(function (res) {
        return res.json();
      })
      .then(function (json) {
        if (!json.success) throw new Error(json.error || 'Server returned an error.');
        showSuccess(form, formType);
      })
      .catch(function () {
        setLoading(btn, false, originalText);
        showError(form, btn);
      });
  });
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

function setLoading(btn, loading, originalText) {
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? 'Sending…' : (originalText || 'Submit');
}

function showSuccess(form, formType) {
  var msg = formType === 'special-request'
    ? 'Request received — our buyers will review it and get back to you within 3–5 business days.'
    : 'Message received — we\'ll get back to you soon. For urgent matters, call <a href="tel:3306732878">(330) 673-2878</a>.';

  form.innerHTML = [
    '<div class="form-success">',
    '  <div class="form-success-icon" aria-hidden="true">✓</div>',
    '  <h3>Sent!</h3>',
    '  <p>' + msg + '</p>',
    '</div>'
  ].join('\n');
}

function showError(form, btn, originalText, customMsg) {
  var msg = customMsg ||
    'Something went wrong — please try again or email us at ' +
    '<a href="mailto:knfcoop@gmail.com">knfcoop@gmail.com</a>.';

  var el = form.querySelector('.form-error');
  if (!el) {
    el = document.createElement('p');
    el.className = 'form-error';
    if (btn) {
      btn.parentNode.insertBefore(el, btn);
    } else {
      form.appendChild(el);
    }
  }
  el.innerHTML = msg;
}

function clearError(form) {
  var el = form.querySelector('.form-error');
  if (el) el.remove();
}
