/**
 * KNFC Google Drive Folder Proxy + Lightspeed Retail API Integration
 * Kent Natural Foods Co-op
 *
 * Two functions in one script:
 *   1. Serve CSV files from a Google Drive folder to the website (existing)
 *   2. Sync live inventory from Lightspeed Retail API into inventory.csv (new)
 *
 * LIGHTSPEED SETUP (one-time):
 * ============================
 * 1. In the Apps Script editor, open the menu: Run > setLightspeedCredentials
 *    (edit the function body first to paste your client ID and secret, then run it)
 * 2. Run getAuthorizationUrl() — copy the URL from the Logs panel
 * 3. Visit that URL in your browser and click "Allow"
 * 4. Lightspeed will redirect back to this script's URL with ?code=...
 *    The script will automatically exchange it for tokens and save them.
 * 5. Run testLightspeedSync() to confirm inventory loads correctly.
 * 6. In Triggers (clock icon), add a time-driven trigger:
 *    Function: scheduledLightspeedSync | Every: 15 or 30 minutes
 *
 * After setup, inventory.csv in your Drive folder will stay current automatically.
 * Staff never need to upload a CSV again.
 *
 * DRIVE SETUP (existing, unchanged):
 * ====================================
 * See original setup instructions — FOLDER_ID below must point to your Drive folder.
 */

// ============================================
// CONFIGURATION
// ============================================

const FOLDER_ID = '186FBV_BDcq3iSI_PVyrmWuLSGMTlzI8X';

// Lightspeed API endpoints (do not change)
const LS_AUTH_URL  = 'https://cloud.lightspeedapp.com/auth/oauth/authorize';
const LS_TOKEN_URL = 'https://cloud.lightspeedapp.com/auth/oauth/token';
const LS_API_BASE  = 'https://api.lightspeedapp.com/API/V3/Account/';

// ============================================
// END CONFIGURATION
// ============================================


/**
 * Main entry point — handles all GET requests to the web app URL.
 * Also serves as the OAuth redirect URI for Lightspeed authorization.
 */
function doGet(e) {
  var params = e.parameter || {};

  // OAuth callback: Lightspeed redirects here with ?code=... after the user authorizes
  if (params.code) {
    return handleOAuthCallback(params.code);
  }

  var action = params.action;

  try {
    if (action === 'list') {
      return createResponse(listFiles(), 200, 'text/plain');
    }

    if (action === 'consolidate') {
      var fname = params.file || 'reports_inventory_listings_assets.csv';
      return createResponse(handleConsolidateRequest(fname), 200, 'text/plain');
    }

    if (action === 'lightspeed-sync') {
      var syncSecret = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
      if (syncSecret && params.token !== syncSecret) {
        return createResponse('Forbidden: missing or invalid token.', 403);
      }
      var result = syncLightspeedInventory();
      return createResponse(result, 200, 'text/plain');
    }

    // Default: serve a CSV file from the Drive folder
    var filename = params.file;
    if (!filename) {
      return createResponse('Error: No filename specified. Use ?file=yourfile.csv', 400);
    }
    if (!filename.endsWith('.csv')) {
      return createResponse('Error: Only CSV files are allowed', 400);
    }
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return createResponse('Error: Invalid filename', 400);
    }
    if (FOLDER_ID === 'YOUR_FOLDER_ID_HERE') {
      return createResponse('Error: Folder ID not configured. Please edit the script.', 500);
    }

    var folder = DriveApp.getFolderById(FOLDER_ID);
    var files = folder.getFilesByName(filename);
    if (!files.hasNext()) {
      return createResponse('Error: File not found - ' + filename, 404);
    }
    return createResponse(files.next().getBlob().getDataAsString(), 200, 'text/csv');

  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return createResponse('Error: ' + error.toString(), 500);
  }
}


// ============================================
// LIGHTSPEED — ONE-TIME SETUP FUNCTIONS
// Run these manually in the Apps Script editor
// ============================================

/**
 * STEP 1: Paste your credentials here and run this function once.
 * After running, delete the values from the code — they're saved in Script Properties.
 */
function setLightspeedCredentials() {
  var clientId     = 'PASTE_YOUR_CLIENT_ID_HERE';
  var clientSecret = 'PASTE_YOUR_CLIENT_SECRET_HERE';

  if (clientId === 'PASTE_YOUR_CLIENT_ID_HERE') {
    Logger.log('✗ Edit this function and replace the placeholder values before running.');
    return;
  }

  var props = PropertiesService.getScriptProperties();
  props.setProperty('LS_CLIENT_ID', clientId);
  props.setProperty('LS_CLIENT_SECRET', clientSecret);
  Logger.log('✓ Credentials saved securely in Script Properties.');
  Logger.log('  Next: run getAuthorizationUrl() and visit the link in your browser.');
}

/**
 * STEP 2: Run this, then visit the URL printed in the Logs panel.
 * After you click Allow, Lightspeed redirects back here and saves your tokens automatically.
 *
 * IMPORTANT: Before running this, make sure your Apps Script deployment URL is registered
 * as the Redirect URI in your Lightspeed app at https://cloud.lightspeedapp.com/oauth/register.php
 * The URL looks like: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 * Run printRedirectUri() to get your exact URL.
 */
function getAuthorizationUrl() {
  var props    = PropertiesService.getScriptProperties();
  var clientId = props.getProperty('LS_CLIENT_ID');
  if (!clientId) {
    Logger.log('✗ No client ID found. Run setLightspeedCredentials() first.');
    return;
  }

  // Generate PKCE code_verifier and code_challenge (required by Lightspeed)
  var pkce        = generatePKCE();
  var redirectUri = ScriptApp.getService().getUrl();

  // Save verifier so handleOAuthCallback can use it
  props.setProperty('LS_CODE_VERIFIER', pkce.verifier);

  var url = LS_AUTH_URL
    + '?response_type=code'
    + '&client_id='             + encodeURIComponent(clientId)
    + '&scope=employee:all'
    + '&redirect_uri='          + encodeURIComponent(redirectUri)
    + '&code_challenge='        + encodeURIComponent(pkce.challenge)
    + '&code_challenge_method=S256';

  Logger.log('✓ Your redirect URI (register this in Lightspeed if not done yet):\n  ' + redirectUri);
  Logger.log('\n✓ Authorization URL — visit this in your browser:\n\n  ' + url + '\n');
  return url;
}

/**
 * Helper: print your Apps Script deployment URL.
 * Copy this and paste it as the Redirect URI in your Lightspeed app settings.
 */
function printRedirectUri() {
  Logger.log('Your Redirect URI:\n\n  ' + ScriptApp.getService().getUrl());
}

/**
 * Set a secret token to protect the ?action=lightspeed-sync endpoint.
 * Run once: replace the value below with any strong password, run it, then delete the value.
 * To trigger a manual sync: SCRIPT_URL?action=lightspeed-sync&token=YOUR_SECRET
 * The scheduled trigger is unaffected — it calls scheduledLightspeedSync() directly.
 */
function setSyncSecret() {
  var secret = 'PASTE_A_STRONG_SECRET_HERE';
  if (secret === 'PASTE_A_STRONG_SECRET_HERE') {
    Logger.log('✗ Edit this function and replace the placeholder before running.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('SYNC_SECRET', secret);
  Logger.log('✓ Sync secret saved. Manual sync URL:\n  ' + ScriptApp.getService().getUrl() + '?action=lightspeed-sync&token=' + secret);
}

/**
 * Generate a PKCE code_verifier and code_challenge pair.
 * Lightspeed requires PKCE (S256 method) for the authorization code flow.
 */
function generatePKCE() {
  // 64-byte random verifier, base64url encoded, no padding
  var bytes    = [];
  for (var i = 0; i < 64; i++) bytes.push(Math.floor(Math.random() * 256));
  var verifier = Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');

  // SHA-256 hash of the verifier, base64url encoded, no padding
  var digest    = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier, Utilities.Charset.UTF_8);
  var challenge = Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '');

  return { verifier: verifier, challenge: challenge };
}

/**
 * STEP 3 (automatic): Called by doGet when Lightspeed redirects back with ?code=
 * Exchanges the authorization code for tokens and saves them.
 */
function handleOAuthCallback(code) {
  try {
    var props       = PropertiesService.getScriptProperties();
    var clientId    = props.getProperty('LS_CLIENT_ID');
    var clientSecret= props.getProperty('LS_CLIENT_SECRET');
    var redirectUri = ScriptApp.getService().getUrl();

    var codeVerifier = props.getProperty('LS_CODE_VERIFIER') || '';

    var response = UrlFetchApp.fetch(LS_TOKEN_URL, {
      method: 'post',
      payload: {
        client_id:     clientId,
        client_secret: clientSecret,
        code:          code,
        grant_type:    'authorization_code',
        redirect_uri:  redirectUri,
        code_verifier: codeVerifier
      },
      muteHttpExceptions: true
    });

    var data = JSON.parse(response.getContentText());

    if (data.error) {
      return ContentService.createTextOutput(
        'Authorization failed: ' + data.error_description
      ).setMimeType(ContentService.MimeType.TEXT);
    }

    props.setProperty('LS_ACCESS_TOKEN',  data.access_token);
    props.setProperty('LS_REFRESH_TOKEN', data.refresh_token);
    props.setProperty('LS_TOKEN_EXPIRES', String(Date.now() + data.expires_in * 1000));

    // The new Lightspeed API doesn't return accountID in the token response.
    // Fetch it directly from the Account endpoint instead.
    var accountId = data.accountID || fetchAccountIdFromToken(data.access_token);
    props.setProperty('LS_ACCOUNT_ID', String(accountId));

    Logger.log('✓ Tokens saved. Account ID: ' + accountId);

    return ContentService.createTextOutput(
      '✓ Lightspeed connected successfully! Account ID: ' + accountId +
      '\n\nYou can close this tab. Run testLightspeedSync() in the Apps Script editor to verify.'
    ).setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    Logger.log('OAuth callback error: ' + err.toString());
    return ContentService.createTextOutput('OAuth error: ' + err.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * STEP 4: Run this to confirm the connection works and inventory loads correctly.
 */
function testLightspeedSync() {
  Logger.log('Testing Lightspeed connection...');
  try {
    var props     = PropertiesService.getScriptProperties();
    var accountId = props.getProperty('LS_ACCOUNT_ID');

    // Auto-fix: the old API returned accountID in the token response; the new one doesn't.
    // If it was saved as 'undefined' or is missing, fetch it now.
    if (!accountId || accountId === 'undefined') {
      Logger.log('Account ID missing — fetching from Lightspeed API...');
      accountId = fetchAndSaveAccountId();
    }

    // Fetch a single item to verify connectivity
    var data = lsApiGet(accountId + '/Item.json?limit=1');
    if (data.Item) {
      Logger.log('✓ Connection successful! Running full sync...');
      var result = syncLightspeedInventory();
      Logger.log(result);
    } else {
      Logger.log('✗ Unexpected response: ' + JSON.stringify(data));
    }
  } catch (err) {
    Logger.log('✗ Test failed: ' + err.toString());
  }
}

/**
 * Fetch the Lightspeed account ID using the current access token and save it.
 * Run this manually if the account ID is missing or was saved incorrectly.
 */
function fetchAndSaveAccountId() {
  var accountId = fetchAccountIdFromToken(
    PropertiesService.getScriptProperties().getProperty('LS_ACCESS_TOKEN')
  );
  PropertiesService.getScriptProperties().setProperty('LS_ACCOUNT_ID', String(accountId));
  Logger.log('✓ Account ID saved: ' + accountId);
  return String(accountId);
}

/**
 * Call GET /API/V3/Account.json to discover the account ID for this token.
 */
function fetchAccountIdFromToken(accessToken) {
  var response = UrlFetchApp.fetch('https://api.lightspeedapp.com/API/V3/Account.json', {
    headers: { 'Authorization': 'Bearer ' + accessToken },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Could not fetch account ID: ' + response.getContentText().substring(0, 200));
  }

  var data    = JSON.parse(response.getContentText());
  var account = data.Account;
  if (!account) throw new Error('No Account in response: ' + JSON.stringify(data).substring(0, 200));
  if (Array.isArray(account)) account = account[0];
  return account.accountID;
}


// ============================================
// LIGHTSPEED — SYNC
// ============================================

/**
 * Fetch all active items from Lightspeed and write inventory.csv to the Drive folder.
 * Called by: scheduled trigger, ?action=lightspeed-sync endpoint, testLightspeedSync()
 */
function syncLightspeedInventory() {
  var props     = PropertiesService.getScriptProperties();
  var accountId = props.getProperty('LS_ACCOUNT_ID');
  if (!accountId) throw new Error('Not authorized. Complete Lightspeed OAuth setup first.');

  // Fetch only Default-type items (excludes matrix parents, gift cards, service/non-inventory items).
  // Without this filter the API returns all item types, double-counting matrix variants.
  var relations = encodeURIComponent('["Category","ItemShops"]');
  var items = fetchAllPages(
    accountId + '/Item.json?load_relations=' + relations + '&archived=false&itemType=default',
    'Item'
  );

  // Build CSV rows
  var lines = ['UPC,Item Name,Department,Remaining,Sales Price'];

  items.forEach(function(item) {
    var upc  = (item.EAN || item.customSku || '').trim();
    var name = (item.description || '').replace(/"/g, '""');
    var dept = (item.Category && item.Category.name) ? item.Category.name : 'Uncategorized';

    // Use only the FIRST shop's quantity to avoid double-counting.
    // Lightspeed accounts with a secondary shop (e.g. webstore) return multiple
    // ItemShop records; summing them doubles every quantity.
    var qty = 0;
    if (item.ItemShops && item.ItemShops.ItemShop) {
      var shops = item.ItemShops.ItemShop;
      if (!Array.isArray(shops)) shops = [shops];
      qty = parseInt(shops[0].qoh || 0);
    }

    // Price is embedded in the Item response under Prices.ItemPrice
    var price = '';
    if (item.Prices && item.Prices.ItemPrice) {
      var prices = item.Prices.ItemPrice;
      if (!Array.isArray(prices)) prices = [prices];
      var def = prices.filter(function(p) { return p.useType === 'Default'; })[0] || prices[0];
      if (def && def.amount) price = parseFloat(def.amount).toFixed(2);
    }

    lines.push([upc, '"' + name + '"', dept, qty, price].join(','));
  });

  var csv = lines.join('\n');

  // Delete ALL existing inventory.csv files and recreate from scratch.
  // Using setContent() can leave stale data in some Drive configurations,
  // causing duplicate rows. Delete-and-recreate guarantees a clean file.
  var folder   = DriveApp.getFolderById(FOLDER_ID);
  var existing = folder.getFilesByName('inventory.csv');
  while (existing.hasNext()) {
    existing.next().setTrashed(true);
  }
  folder.createFile('inventory.csv', csv, MimeType.CSV);

  // Record last sync time and item count for diagnostics
  var itemCount = lines.length - 1;
  props.setProperty('LS_LAST_SYNC',  new Date().toISOString());
  props.setProperty('LS_LAST_COUNT', String(itemCount));

  var msg = 'OK: synced ' + itemCount + ' items from Lightspeed at ' + new Date().toLocaleTimeString();
  Logger.log('✓ ' + msg);
  return msg;
}

/**
 * Debug helper: logs the raw JSON of the first item so you can see exactly
 * what fields Lightspeed returns. Run this if prices or other fields are missing.
 */
function debugItem() {
  var accountId = PropertiesService.getScriptProperties().getProperty('LS_ACCOUNT_ID');
  var relations = encodeURIComponent('["Category","ItemShops"]');
  var data      = lsApiGet(accountId + '/Item.json?load_relations=' + relations + '&limit=1');
  Logger.log(JSON.stringify(data, null, 2));
}

/**
 * Scheduled trigger function — set this up in Triggers to run every 15–30 min.
 */
function scheduledLightspeedSync() {
  try {
    syncLightspeedInventory();
  } catch (err) {
    Logger.log('Scheduled sync failed: ' + err.toString());
  }
}


// ============================================
// LIGHTSPEED — OAUTH TOKEN MANAGEMENT
// ============================================

function getAccessToken() {
  var props   = PropertiesService.getScriptProperties();
  var expires = parseInt(props.getProperty('LS_TOKEN_EXPIRES') || '0');

  // Refresh proactively 2 minutes before expiry
  if (Date.now() > expires - 120000) {
    refreshAccessToken();
  }

  return props.getProperty('LS_ACCESS_TOKEN');
}

function refreshAccessToken() {
  var props        = PropertiesService.getScriptProperties();
  var clientId     = props.getProperty('LS_CLIENT_ID');
  var clientSecret = props.getProperty('LS_CLIENT_SECRET');
  var refreshToken = props.getProperty('LS_REFRESH_TOKEN');

  if (!refreshToken) throw new Error('No refresh token found. Complete OAuth setup first.');

  var response = UrlFetchApp.fetch(LS_TOKEN_URL, {
    method: 'post',
    payload: {
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token'
    },
    muteHttpExceptions: true
  });

  var data = JSON.parse(response.getContentText());
  if (data.error) throw new Error('Token refresh failed: ' + data.error_description);

  props.setProperty('LS_ACCESS_TOKEN',  data.access_token);
  props.setProperty('LS_TOKEN_EXPIRES', String(Date.now() + data.expires_in * 1000));
  if (data.refresh_token) {
    props.setProperty('LS_REFRESH_TOKEN', data.refresh_token);
  }
}

/**
 * Make an authenticated GET request to Lightspeed.
 * Accepts either a full URL (https://...) or a path relative to LS_API_BASE.
 */
function lsApiGet(pathOrUrl) {
  var token = getAccessToken();
  var url   = pathOrUrl.startsWith('https://') ? pathOrUrl : LS_API_BASE + pathOrUrl;

  var response = UrlFetchApp.fetch(url, {
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() === 429) {
    // Rate limited — wait and retry once
    Utilities.sleep(3000);
    response = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });
  }

  if (response.getResponseCode() !== 200) {
    throw new Error('Lightspeed API error ' + response.getResponseCode() + ': ' + response.getContentText().substring(0, 200));
  }

  return JSON.parse(response.getContentText());
}

/**
 * Paginate through all results using cursor-based pagination.
 * Lightspeed dropped offset support — each response includes @attributes.next
 * with the URL for the next page. We follow those until there is no next URL.
 */
function fetchAllPages(basePath, recordKey) {
  var results = [];
  var sep     = basePath.includes('?') ? '&' : '?';
  var nextUrl = LS_API_BASE + basePath + sep + 'limit=100';

  while (nextUrl) {
    var data  = lsApiGet(nextUrl);
    var batch = data[recordKey];
    if (!batch) break;
    if (!Array.isArray(batch)) batch = [batch];
    results = results.concat(batch);

    // @attributes.next holds the full URL for the next page (null/absent when done)
    var attrs = data['@attributes'] || {};
    nextUrl   = attrs.next || null;

    // Brief pause every 500 records to respect rate limits
    if (nextUrl && results.length % 500 === 0) Utilities.sleep(1000);
  }

  return results;
}


// ============================================
// DRIVE FILE SERVING (unchanged)
// ============================================

function createResponse(content, statusCode, mimeType) {
  mimeType = mimeType || 'text/plain';
  return ContentService
    .createTextOutput(content)
    .setMimeType(ContentService.MimeType[mimeType.replace('/', '_').toUpperCase()] || ContentService.MimeType.TEXT)
    .setContent(content);
}

function testFolderAccess() {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log('✓ Folder found: ' + folder.getName());
    var files = folder.getFiles();
    Logger.log('Files in folder:');
    while (files.hasNext()) {
      var f = files.next();
      Logger.log('  - ' + f.getName());
    }
  } catch (error) {
    Logger.log('✗ Error: ' + error.toString());
  }
}

function listFiles() {
  try {
    var folder   = DriveApp.getFolderById(FOLDER_ID);
    var files    = folder.getFiles();
    var fileList = [];
    while (files.hasNext()) {
      var f = files.next();
      if (f.getName().endsWith('.csv')) {
        fileList.push({ name: f.getName(), size: f.getSize(), lastModified: f.getLastUpdated().toISOString() });
      }
    }
    return JSON.stringify(fileList, null, 2);
  } catch (error) {
    return 'Error: ' + error.toString();
  }
}


// ============================================
// CONSOLIDATION (unchanged)
// ============================================

function handleConsolidateRequest(filename) {
  filename = filename || 'reports_inventory_listings_assets.csv';
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var files  = folder.getFilesByName(filename);
    if (!files.hasNext()) return 'Error: Reports file not found: ' + filename;

    var reportContent = files.next().getBlob().getDataAsString();
    var deptMap       = buildDepartmentMap(folder, filename);
    var consolidated  = buildConsolidatedCsv(reportContent, deptMap);

    var outName  = 'inventory.csv';
    var outFiles = folder.getFilesByName(outName);
    if (outFiles.hasNext()) {
      outFiles.next().setContent(consolidated);
    } else {
      folder.createFile(outName, consolidated, MimeType.CSV);
    }

    PropertiesService.getScriptProperties()
      .setProperty('LAST_PROCESSED_' + filename, new Date().toISOString());

    return 'OK: consolidated ' + filename + ' -> ' + outName + ' (' + consolidated.split('\n').length + ' lines)';
  } catch (err) {
    return 'Error: ' + err.toString();
  }
}

function buildDepartmentMap(folder, skipFilename) {
  var deptFolder  = folder;
  var subFolders  = folder.getFoldersByName('departments');
  if (subFolders.hasNext()) deptFolder = subFolders.next();

  var files = deptFolder.getFiles();
  var map   = {};

  while (files.hasNext()) {
    var f    = files.next();
    var name = f.getName();
    if (!name.toLowerCase().endsWith('.csv')) continue;
    if (name === skipFilename || name === 'inventory.csv') continue;

    var deptName = name.replace(/\.csv$/i, '');
    try {
      var rows     = Utilities.parseCsv(f.getBlob().getDataAsString());
      if (rows.length < 2) continue;
      var upcIndex = findIndexByRegex(rows[0], ['upc','ean','barcode','sku','system id']);
      if (upcIndex === -1) continue;
      for (var i = 1; i < rows.length; i++) {
        var upc = String(rows[i][upcIndex] || '').trim();
        if (upc) map[upc] = deptName;
      }
    } catch (e) { continue; }
  }
  return map;
}

function buildConsolidatedCsv(reportContent, deptMap) {
  var rows   = Utilities.parseCsv(reportContent);
  if (rows.length === 0) return '';
  var header = rows[0];

  var upcIndex       = findIndexByRegex(header, ['upc','ean','barcode','sku','system id']);
  var itemIndex      = findIndexByRegex(header, ['item','description','name']);
  var remainingIndex = findIndexByRegex(header, ['remaining','qty','quantity','on hand','stock']);
  var priceIndex     = findIndexByRegex(header, ['price','sale price','unit price','saleprice']);

  var out = [['UPC','Item Name','Department','Remaining','Sales Price'].join(',')];

  for (var i = 1; i < rows.length; i++) {
    var r         = rows[i];
    var upc       = (upcIndex >= 0 && r[upcIndex])       ? String(r[upcIndex]).trim()       : '';
    var name      = (itemIndex >= 0 && r[itemIndex])      ? String(r[itemIndex]).trim()      : '';
    var remaining = (remainingIndex >= 0 && r[remainingIndex]) ? String(r[remainingIndex]).trim() : '';
    var price     = (priceIndex >= 0 && r[priceIndex])    ? String(r[priceIndex]).trim()     : '';

    var dept       = (upc && deptMap[upc]) ? deptMap[upc] : 'Uncategorized';
    var priceClean = price.replace(/[^0-9.]/g, '') || '';
    name           = name.replace(/"/g, '""');

    out.push([upc, '"' + name + '"', dept, parseInt(remaining) || 0, priceClean].join(','));
  }
  return out.join('\n');
}

function findIndexByRegex(headerArr, patterns) {
  for (var i = 0; i < headerArr.length; i++) {
    for (var j = 0; j < patterns.length; j++) {
      if (new RegExp(patterns[j], 'i').test(String(headerArr[i]))) return i;
    }
  }
  return -1;
}

function periodicProcessReports() {
  var filename = 'reports_inventory_listings_assets.csv';
  var folder   = DriveApp.getFolderById(FOLDER_ID);
  var files    = folder.getFilesByName(filename);
  if (!files.hasNext()) return;

  var file         = files.next();
  var lastUpdated  = file.getLastUpdated().toISOString();
  var props        = PropertiesService.getScriptProperties();
  var key          = 'LAST_PROCESSED_' + filename;
  var lastProcessed= props.getProperty(key);
  if (lastProcessed === lastUpdated) return;

  Logger.log('periodicProcessReports: ' + handleConsolidateRequest(filename));
}
