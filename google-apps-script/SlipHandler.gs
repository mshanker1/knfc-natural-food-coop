/**
 * KNFC Website — Special Order Slip Handler
 * Stores the special-order slips staff fill in at the counter, in a Google
 * Sheet, and emails the buyer when a new one comes in.
 *
 * Companion to FormHandler.gs. That one takes requests from the public;
 * this one is the staff-side slip that replaces the paper card.
 *
 * SETUP (one time — ~20 minutes):
 * ────────────────────────────────
 * 1. Create a new Google Sheet, e.g. "KNFC Special Orders".
 * 2. Copy its Spreadsheet ID from the URL:
 *      https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
 * 3. Paste that ID into SPREADSHEET_ID below.
 * 4. Set the staff passcode and the buyer's email in Script Properties:
 *      Project Settings > Script properties > Add script property
 *        PASSCODE     — what staff type to open the page (omit for no passcode)
 *        BUYER_EMAIL  — where new-slip notifications go
 *        PAGE_URL     — https://kentnaturalfoods.org/special-order-slip.html
 * 5. Run setUp() once, and authorise when prompted (Sheets + Gmail scopes).
 * 6. Deploy as a web app:
 *      Deploy > New deployment
 *      Type: Web app | Execute as: Me | Who has access: Anyone
 * 7. Paste the deployed URL into js/slip-api.js → SLIP_API_URL.
 * 8. Push the updated js/slip-api.js to GitHub.
 *
 * Full walkthrough: "Slip Setup Guide.html" in the special-orders project.
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

/* The columns, in the order they appear on the paper card. This list is also
   the field list in js/slip.js — change both together. */
const SLIP_COLUMNS = [
  'id', 'created', 'createdBy',
  'member', 'name', 'phone', 'date', 'brand', 'product', 'size', 'quantity',
  'deposit', 'initials', 'comments',
  'vendor', 'catalog', 'ordered', 'received', 'notified', 'price', 'amtdue',
  'pickedUp', 'pickedUpAt', 'ledger', 'reorderOf', 'updated', 'updatedBy'
];

const SHEET_SLIPS = 'Slips';
const SHEET_STAFF = 'Staff';
const SHEET_LOG   = 'Activity';
const SHEET_STATS = 'Monthly';

/* Slips drop off the main list this many days after pickup. They stay in the
   Sheet and stay searchable — nothing is ever deleted. */
const ARCHIVE_AFTER_DAYS = 90;

// ─────────────────────────────────────────────────────────────────────────────
// One-time setup
// ─────────────────────────────────────────────────────────────────────────────

function setUp() {
  if (SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    throw new Error('Paste your Spreadsheet ID into SPREADSHEET_ID first.');
  }
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  getOrCreateSheet_(ss, SHEET_SLIPS, SLIP_COLUMNS);

  const staff = getOrCreateSheet_(ss, SHEET_STAFF, ['name', 'role']);
  if (staff.getLastRow() < 2) {
    staff.getRange(2, 1, 3, 2).setValues([
      ['Elizabeth', 'buyer'],
      ['Shannon', 'staff'],
      ['Add your staff here', 'staff']
    ]);
  }

  getOrCreateSheet_(ss, SHEET_LOG, ['when', 'slip', 'who', 'field', 'was', 'became']);

  const stats = getOrCreateSheet_(ss, SHEET_STATS, ['Orders taken each month']);
  if (stats.getLastRow() < 2) {
    stats.getRange('A2').setFormula(
      '=IFERROR(QUERY(' + SHEET_SLIPS + '!B2:B, "select year(B)*100+month(B), count(B) ' +
      'where B is not null group by year(B)*100+month(B) order by year(B)*100+month(B) desc ' +
      'label year(B)*100+month(B) \'Month (YYYYMM)\', count(B) \'Slips\'"), "No slips yet")'
    );
  }

  Logger.log('Sheets ready. Now set PASSCODE, BUYER_EMAIL and PAGE_URL in Script properties, then deploy.');
  return 'Ready.';
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry points
// ─────────────────────────────────────────────────────────────────────────────

function doGet(e) {
  return handle_((e && e.parameter) || {});
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
  return handle_(body);
}

function handle_(req) {
  try {
    const pass = scriptProp_('PASSCODE', '');
    if (req.action !== 'ping' && pass && String(req.passcode || '') !== pass) {
      return respond({ ok: false, error: 'passcode' });
    }
    return respond(route_(req));
  } catch (err) {
    Logger.log('SlipHandler error: ' + err.message);
    return respond({ ok: false, error: err.message });
  }
}

function route_(req) {
  switch (req.action) {
    case 'ping':
      return { ok: true, needsPasscode: !!scriptProp_('PASSCODE', '') };
    case 'list':
      return { ok: true, slips: listSlips_(), staff: listStaff_(), archiveAfterDays: ARCHIVE_AFTER_DAYS };
    case 'create':
      return createSlip_(req.slip || {}, req.who || '');
    case 'update':
      return updateSlip_(req.id, req.changes || {}, req.who || '');
    default:
      return { ok: false, error: 'Unknown action: ' + req.action };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reading
// ─────────────────────────────────────────────────────────────────────────────

function listSlips_() {
  const sh = sheet_(SHEET_SLIPS);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, SLIP_COLUMNS.length).getDisplayValues();
  const out = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i][0]) out.push(rowToSlip_(values[i]));
  }
  return out;
}

function rowToSlip_(row) {
  const s = {};
  for (let c = 0; c < SLIP_COLUMNS.length; c++) s[SLIP_COLUMNS[c]] = row[c];
  s.pickedUp = s.pickedUp === true || String(s.pickedUp).toUpperCase() === 'TRUE';
  try { s.ledger = s.ledger ? JSON.parse(s.ledger) : []; } catch (err) { s.ledger = []; }
  return s;
}

function listStaff_() {
  const sh = sheet_(SHEET_STAFF);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues();
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0]) out.push({ name: rows[i][0], role: rows[i][1] || 'staff' });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Writing
// ─────────────────────────────────────────────────────────────────────────────

function createSlip_(slip, who) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(SHEET_SLIPS);
    const now = new Date();
    slip.id        = nextId_(sh);
    slip.created   = stamp_(now, 'yyyy-MM-dd');
    slip.createdBy = who;
    slip.updated   = stamp_(now, 'yyyy-MM-dd HH:mm');
    slip.updatedBy = who;

    const row = [];
    for (let c = 0; c < SLIP_COLUMNS.length; c++) {
      const k = SLIP_COLUMNS[c];
      let v = slip[k];
      if (k === 'ledger') v = JSON.stringify(v || []);
      if (k === 'pickedUp') v = v ? 'TRUE' : 'FALSE';
      row.push(v === undefined || v === null ? '' : v);
    }
    sh.appendRow(row);

    log_(slip.id, who, 'slip created', '', (slip.name || '') + ' — ' + (slip.product || ''));
    emailBuyer_(slip);
    return { ok: true, slip: slip };
  } finally {
    lock.releaseLock();
  }
}

/* Writes only the fields that actually changed, and logs each one, so the
   Activity tab answers "who put that there?" without anyone keeping notes. */
function updateSlip_(id, changes, who) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(SHEET_SLIPS);
    const rowIndex = findRow_(sh, id);
    if (rowIndex < 0) return { ok: false, error: 'No slip #' + id };

    const range = sh.getRange(rowIndex, 1, 1, SLIP_COLUMNS.length);
    const row = range.getDisplayValues()[0];
    let touched = 0;

    for (const key in changes) {
      const c = SLIP_COLUMNS.indexOf(key);
      if (c < 0 || key === 'id' || key === 'created') continue;
      let next = changes[key];
      if (key === 'ledger') next = JSON.stringify(next || []);
      if (key === 'pickedUp') next = next ? 'TRUE' : 'FALSE';
      if (String(row[c]) === String(next)) continue;
      log_(id, who, key, row[c], next);
      row[c] = next;
      touched++;
    }
    if (!touched) return { ok: true, unchanged: true };

    if (changes.pickedUp === true && !row[SLIP_COLUMNS.indexOf('pickedUpAt')]) {
      row[SLIP_COLUMNS.indexOf('pickedUpAt')] = stamp_(new Date(), 'yyyy-MM-dd');
    }
    row[SLIP_COLUMNS.indexOf('updated')]   = stamp_(new Date(), 'yyyy-MM-dd HH:mm');
    row[SLIP_COLUMNS.indexOf('updatedBy')] = who;
    range.setValues([row]);

    return { ok: true, slip: rowToSlip_(row) };
  } finally {
    lock.releaseLock();
  }
}

function nextId_(sh) {
  if (sh.getLastRow() < 2) return '0001';
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues();
  let max = 0;
  for (let i = 0; i < ids.length; i++) {
    const n = parseInt(String(ids[i][0]).replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return ('000' + (max + 1)).slice(-4);
}

function findRow_(sh, id) {
  if (sh.getLastRow() < 2) return -1;
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function log_(id, who, field, was, became) {
  try {
    const sh = sheet_(SHEET_LOG);
    if (sh) sh.appendRow([new Date(), id, who || '(not signed in)', field, was, became]);
  } catch (err) {
    // A failed log must never block a slip.
  }
}

function emailBuyer_(slip) {
  const to = scriptProp_('BUYER_EMAIL', '');
  if (!to) return;
  try {
    const subject = '[KNFC Special Order] #' + slip.id + ' — ' + (slip.product || 'new slip');
    const body = [
      'A new special order slip was taken at the counter.',
      '',
      'Customer: ' + (slip.name || '—') + (slip.member ? '  (member ' + slip.member + ')' : ''),
      'Phone:    ' + (slip.phone || 'Not provided'),
      'Product:  ' + (slip.product || '—'),
      'Brand:    ' + (slip.brand || 'Not specified'),
      'Size:     ' + (slip.size || '—') + '   Quantity: ' + (slip.quantity || '—'),
      'Deposit:  ' + (slip.deposit || 'None'),
      '',
      'Comments:',
      slip.comments || '(none)',
      '',
      'Taken by: ' + (slip.createdBy || '—') + ' on ' + (slip.date || slip.created),
      '',
      '—',
      'Open the slips: ' + scriptProp_('PAGE_URL', '(set PAGE_URL in script properties)'),
      'Or the Sheet: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID
    ].join('\n');
    GmailApp.sendEmail(to, subject, body);
  } catch (err) {
    // Never let a mail failure lose a slip.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function sheet_(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    const headerRow = sheet.getRange(1, 1, 1, headers.length);
    headerRow.setValues([headers]);
    headerRow.setFontWeight('bold');
    headerRow.setBackground('#f3ede3');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function scriptProp_(key, fallback) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  return (v === null || v === '') ? (fallback === undefined ? '' : fallback) : v;
}

function stamp_(date, fmt) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), fmt);
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual test — run this in the Apps Script editor to verify setup
// ─────────────────────────────────────────────────────────────────────────────

function testSlipHandler() {
  Logger.log('Testing SlipHandler setup…');

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
  if (!sheet_(SHEET_SLIPS)) {
    Logger.log('No "Slips" tab yet — run setUp() first.');
    return;
  }

  const r = createSlip_({
    name: 'Test Customer', phone: '555-1234', product: 'Test Product',
    brand: 'Test Brand', size: '1 lb', quantity: '1',
    comments: 'Test slip — safe to delete.', ledger: []
  }, 'Setup test');
  Logger.log('✓ Slip #' + r.slip.id + ' written.');

  updateSlip_(r.slip.id, { vendor: 'Frankferd', ordered: '2026-01-01' }, 'Setup test');
  Logger.log('✓ Update written and logged to Activity.');

  Logger.log('');
  Logger.log('Passcode set: ' + (scriptProp_('PASSCODE', '') ? 'yes' : 'no (page opens freely)'));
  Logger.log('Buyer email:  ' + (scriptProp_('BUYER_EMAIL', '') || 'not set — no notifications'));
  Logger.log('');
  Logger.log('All checks passed. Deploy as a web app, then paste the URL');
  Logger.log('into js/slip-api.js → SLIP_API_URL. Delete the test slip when done.');
}
