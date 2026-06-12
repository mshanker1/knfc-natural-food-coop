/**
 * KNFC Website — Form Handler
 * Receives POST submissions from the Contact and Special Request
 * forms, writes each row to a Google Sheet, and sends an email
 * notification to the store inbox.
 *
 * SETUP (one time — ~15 minutes):
 * ────────────────────────────────
 * 1. Create a new Google Sheet (any name, e.g. "KNFC Form Submissions").
 * 2. Copy its Spreadsheet ID from the URL:
 *      https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
 * 3. Paste that ID into SPREADSHEET_ID below.
 * 4. Deploy this script as a web app:
 *      Extensions > Apps Script > Deploy > New deployment
 *      Type: Web app | Execute as: Me | Who has access: Anyone
 * 5. Authorise when prompted (Gmail + Sheets scopes).
 * 6. Copy the deployed web-app URL and paste it into
 *      js/forms.js  →  FORM_HANDLER_URL
 * 7. Push the updated js/forms.js to GitHub.
 *
 * See google-apps-script/SETUP.md §Form Handler for full instructions.
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const NOTIFY_EMAIL   = 'knfcoop@gmail.com';

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const p        = e.parameter;
    const formType = p.formType;

    if (!formType) throw new Error('Missing formType parameter.');

    if (formType === 'contact') {
      logContact(p);
      emailContact(p);
    } else if (formType === 'special-request') {
      logSpecialRequest(p);
      emailSpecialRequest(p);
    } else {
      throw new Error('Unknown formType: ' + formType);
    }

    return respond({ success: true });

  } catch (err) {
    Logger.log('FormHandler error: ' + err.message);
    return respond({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sheet logging
// ─────────────────────────────────────────────────────────────────────────────

function logContact(p) {
  const sheet = getOrCreateSheet('Contact', [
    'Timestamp', 'Name', 'Email', 'Phone', 'Subject', 'Message'
  ]);
  sheet.appendRow([
    new Date(),
    p.name    || '',
    p.email   || '',
    p.phone   || '',
    p.subject || '',
    p.message || ''
  ]);
}

function logSpecialRequest(p) {
  const sheet = getOrCreateSheet('Special Requests', [
    'Timestamp', 'Status', 'Name', 'Email', 'Phone',
    'Request Type', 'Product', 'Brand', 'Quantity', 'Department',
    'Details', 'Member?'
  ]);
  sheet.appendRow([
    new Date(),
    'New',                              // buyers update this column
    p.name              || '',
    p.email             || '',
    p.phone             || '',
    p['request-type']   || '',
    p['product-name']   || '',
    p.brand             || '',
    p.quantity          || '',
    p.department        || '',
    p.details           || '',
    p.member === 'yes' ? 'Yes' : 'No'
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Email notifications
// ─────────────────────────────────────────────────────────────────────────────

function emailContact(p) {
  const subject = '[KNFC Contact] ' + (p.subject || '(no subject)') + ' — ' + (p.name || 'unknown');

  const body = lines([
    'New message via the website contact form.',
    '',
    'Name:    ' + (p.name    || '—'),
    'Email:   ' + (p.email   || '—'),
    'Phone:   ' + (p.phone   || 'Not provided'),
    'Subject: ' + (p.subject || '—'),
    '',
    'Message:',
    p.message || '(empty)',
    '',
    '—',
    'Submitted: ' + new Date(),
    'Reply directly to this email to respond to the sender.'
  ]);

  GmailApp.sendEmail(NOTIFY_EMAIL, subject, body, {
    replyTo: p.email || NOTIFY_EMAIL
  });
}

function emailSpecialRequest(p) {
  const product = p['product-name'] || '(unnamed product)';
  const type    = p['request-type'] || 'request';
  const name    = p.name            || 'unknown';

  const subject = '[KNFC Request] ' + type + ' — ' + product + ' (' + name + ')';

  const body = lines([
    'New special product request via the website.',
    '',
    'Name:         ' + (p.name             || '—'),
    'Email:        ' + (p.email            || '—'),
    'Phone:        ' + (p.phone            || 'Not provided'),
    'Member:       ' + (p.member === 'yes' ? 'Yes' : 'No'),
    '',
    'Request type: ' + (p['request-type']  || '—'),
    'Product:      ' + (p['product-name']  || '—'),
    'Brand:        ' + (p.brand            || 'Not specified'),
    'Quantity:     ' + (p.quantity         || 'Not specified'),
    'Department:   ' + (p.department       || 'Not specified'),
    '',
    'Details:',
    p.details || '(none)',
    '',
    '—',
    'Submitted: ' + new Date(),
    'Track all requests: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID
  ]);

  GmailApp.sendEmail(NOTIFY_EMAIL, subject, body, {
    replyTo: p.email || NOTIFY_EMAIL
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getOrCreateSheet(name, headers) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headerRow = sheet.getRange(1, 1, 1, headers.length);
    headerRow.setValues([headers]);
    headerRow.setFontWeight('bold');
    headerRow.setBackground('#f3ede3');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function lines(arr) {
  return arr.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual test — run this in the Apps Script editor to verify setup
// ─────────────────────────────────────────────────────────────────────────────

function testFormHandler() {
  Logger.log('Testing FormHandler setup…');

  if (SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    Logger.log('ERROR: SPREADSHEET_ID has not been set. Paste your Sheet ID.');
    return;
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✓ Spreadsheet found: ' + ss.getName());
  } catch (e) {
    Logger.log('ERROR opening spreadsheet: ' + e.message);
    return;
  }

  // Write a test contact row
  logContact({
    name: 'Test User', email: 'test@example.com', phone: '555-1234',
    subject: 'general', message: 'This is a test submission — safe to delete.'
  });
  Logger.log('✓ Contact row written to sheet.');

  // Write a test special-request row
  logSpecialRequest({
    name: 'Test User', email: 'test@example.com', phone: '',
    'request-type': 'new-product', 'product-name': 'Test Product',
    brand: 'Test Brand', quantity: '1', department: 'grocery',
    details: 'Test submission — safe to delete.', member: 'yes'
  });
  Logger.log('✓ Special Request row written to sheet.');

  Logger.log('');
  Logger.log('All checks passed. Deploy the script as a web app,');
  Logger.log('then paste the URL into js/forms.js → FORM_HANDLER_URL.');
}
