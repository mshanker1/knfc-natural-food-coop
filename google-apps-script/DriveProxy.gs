/**
 * KNFC Google Drive Folder Proxy
 *
 * This Google Apps Script acts as a simple API to read CSV files from a public Google Drive folder.
 * Deploy this as a web app, and your website can request files by name.
 *
 * SETUP INSTRUCTIONS:
 * ===================
 *
 * 1. Create a folder in Google Drive for your KNFC files
 * 2. Upload your CSV files to this folder (inventory.csv, sales.csv, announcements.csv, etc.)
 * 3. Share the folder as "Anyone with the link" can VIEW
 * 4. Get the folder ID from the URL (the long string after /folders/)
 * 5. Replace FOLDER_ID below with your folder ID
 * 6. In Google Apps Script editor: Deploy > New deployment > Web app
 * 7. Set "Execute as" to "Me" and "Who has access" to "Anyone"
 * 8. Copy the deployment URL and use it in your website configuration
 *
 * USAGE:
 * ======
 * Your deployment URL will look like:
 * https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 *
 * To fetch a file, append ?file=filename.csv:
 * https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?file=inventory.csv
 *
 * The script will return the CSV content with proper headers.
 */

// ============================================
// CONFIGURATION - Edit this value
// ============================================

// Your Google Drive folder ID (get this from the folder URL)
// https://drive.google.com/drive/folders/1yAm0CvUl30xiE12MWRMqMEKIFzCCzFW6
// Example: If folder URL is https://drive.google.com/drive/folders/1AbC2dEf3GhI4jKl5MnO
// Then FOLDER_ID is: 1AbC2dEf3GhI4jKl5MnO
const FOLDER_ID = '186FBV_BDcq3iSI_PVyrmWuLSGMTlzI8X';

// ============================================
// END CONFIGURATION
// ============================================

/**
 * Main function that handles GET requests
 * Called when someone accesses the web app URL
 */
function doGet(e) {
  try {
    // Allow actions: list, consolidate
    var action = e.parameter && e.parameter.action;
    if (action === 'list') {
      return createResponse(listFiles(), 200, 'text/plain');
    }

    if (action === 'consolidate') {
      var fname = e.parameter.file || 'reports_inventory_listings_assets.csv';
      var msg = handleConsolidateRequest(fname);
      return createResponse(msg, 200, 'text/plain');
    }

    // Get the filename from the URL parameter
    const filename = e.parameter.file;

    // Validate filename parameter
    if (!filename) {
      return createResponse('Error: No filename specified. Use ?file=yourfile.csv', 400);
    }

    // Security: Only allow CSV files
    if (!filename.endsWith('.csv')) {
      return createResponse('Error: Only CSV files are allowed', 400);
    }

    // Security: Prevent directory traversal
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return createResponse('Error: Invalid filename', 400);
    }

    // Check if folder ID is configured
    if (FOLDER_ID === 'YOUR_FOLDER_ID_HERE') {
      return createResponse('Error: Folder ID not configured. Please edit the script.', 500);
    }

    // Get the folder
    const folder = DriveApp.getFolderById(FOLDER_ID);

    // Search for the file in the folder
    const files = folder.getFilesByName(filename);

    if (!files.hasNext()) {
      return createResponse('Error: File not found - ' + filename, 404);
    }

    // Get the first file with this name
    const file = files.next();

    // Get file content
    const content = file.getBlob().getDataAsString();

    // Return the CSV content
    return createResponse(content, 200, 'text/csv');

  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return createResponse('Error: ' + error.toString(), 500);
  }
}

/**
 * Create HTTP response with proper headers
 */
function createResponse(content, statusCode, mimeType) {
  mimeType = mimeType || 'text/plain';

  return ContentService
    .createTextOutput(content)
    .setMimeType(ContentService.MimeType[mimeType.replace('/', '_').toUpperCase()] || ContentService.MimeType.TEXT)
    .setContent(content);
}

/**
 * Test function to verify folder access
 * Run this in the script editor to test your configuration
 */
function testFolderAccess() {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log('✓ Folder found: ' + folder.getName());

    const files = folder.getFiles();
    Logger.log('\nFiles in folder:');
    while (files.hasNext()) {
      const file = files.next();
      Logger.log('  - ' + file.getName());
    }

    Logger.log('\n✓ Configuration test successful!');
  } catch (error) {
    Logger.log('✗ Error: ' + error.toString());
  }
}

/**
 * List all available CSV files in the folder
 * Optional endpoint: ?action=list
 */
function listFiles() {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    const fileList = [];

    while (files.hasNext()) {
      const file = files.next();
      if (file.getName().endsWith('.csv')) {
        fileList.push({
          name: file.getName(),
          size: file.getSize(),
          lastModified: file.getLastUpdated().toISOString()
        });
      }
    }

    return JSON.stringify(fileList, null, 2);
  } catch (error) {
    return 'Error: ' + error.toString();
  }
}

/**
 * Manual consolidation endpoint.
 * Usage: ?action=consolidate&file=reports_inventory_listings_assets.csv
 * If no file param is provided, defaults to 'reports_inventory_listings_assets.csv'.
 */
function handleConsolidateRequest(filename) {
  filename = filename || 'reports_inventory_listings_assets.csv';
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var files = folder.getFilesByName(filename);
    if (!files.hasNext()) {
      return 'Error: Reports file not found: ' + filename;
    }

    var reportFile = files.next();
    var reportContent = reportFile.getBlob().getDataAsString();

    // Build department map from CSV files in the same folder
    var deptMap = buildDepartmentMap(folder, filename);

    var consolidated = buildConsolidatedCsv(reportContent, deptMap);

    // Write or overwrite inventory.csv in the folder
    var outName = 'inventory.csv';
    var outFiles = folder.getFilesByName(outName);
    if (outFiles.hasNext()) {
      var outFile = outFiles.next();
      outFile.setContent(consolidated);
    } else {
      folder.createFile(outName, consolidated, MimeType.CSV);
    }

    // Save last processed timestamp
    var props = PropertiesService.getScriptProperties();
    props.setProperty('LAST_PROCESSED_' + filename, new Date().toISOString());

    return 'OK: consolidated ' + filename + ' -> ' + outName + ' (' + consolidated.split('\n').length + ' lines)';

  } catch (err) {
    Logger.log('Consolidation error: ' + err.toString());
    return 'Error: ' + err.toString();
  }
}


/**
 * Build a UPC -> Department map by scanning CSV files in the folder.
 * Department name is inferred from the filename (without extension).
 */
function buildDepartmentMap(folder, skipFilename) {
  var files = folder.getFiles();
  var map = {};

  while (files.hasNext()) {
    var f = files.next();
    var name = f.getName();
    if (!name.endsWith('.csv')) continue;
    if (name === skipFilename) continue;
    if (name === 'inventory.csv') continue;

    var deptName = name.replace(/\.csv$/i, '');
    try {
      var content = f.getBlob().getDataAsString();
      var rows = Utilities.parseCsv(content);
      if (rows.length < 2) continue;
      var header = rows[0];
      var upcIndex = findIndexByRegex(header, ['upc','ean','barcode','sku','system id']);
      if (upcIndex === -1) continue;

      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (r.length <= upcIndex) continue;
        var upc = String(r[upcIndex]).trim();
        if (upc) map[upc] = deptName;
      }
    } catch (e) {
      // ignore malformed files
      continue;
    }
  }

  return map;
}


/**
 * Build consolidated CSV string from report CSV content and deptMap.
 * Output columns: UPC,Item Name,Department,Remaining,Sales Price
 */
function buildConsolidatedCsv(reportContent, deptMap) {
  var rows = Utilities.parseCsv(reportContent);
  if (rows.length === 0) return '';

  var header = rows[0];
  var upcIndex = findIndexByRegex(header, ['upc','ean','barcode','sku','system id']);
  var itemIndex = findIndexByRegex(header, ['item','description','name']);
  var remainingIndex = findIndexByRegex(header, ['remaining','qty','quantity','on hand','stock']);
  var priceIndex = findIndexByRegex(header, ['price','sale price','unit price','saleprice']);

  var out = [];
  out.push(['UPC','Item Name','Department','Remaining','Sales Price'].join(','));

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var upc = upcIndex >=0 && r.length>upcIndex ? String(r[upcIndex]).trim() : '';
    var name = itemIndex>=0 && r.length>itemIndex ? String(r[itemIndex]).trim() : '';
    var remaining = remainingIndex>=0 && r.length>remainingIndex ? String(r[remainingIndex]).trim() : '';
    var price = priceIndex>=0 && r.length>priceIndex ? String(r[priceIndex]).trim() : '';

    // normalize numbers
    var remNum = parseInt(remaining) || 0;
    var priceClean = String(price).replace(/[^0-9.]/g,'') || '';

    var dept = (upc && deptMap[upc]) ? deptMap[upc] : 'Uncategorized';

    // Escape double-quotes in name
    name = name.replace(/"/g, '""');

    out.push([upc, '"'+name+'"', dept, remNum, priceClean].join(','));
  }

  return out.join('\n');
}


/**
 * Find index of first header matching any of the patterns (case-insensitive regex)
 */
function findIndexByRegex(headerArr, patterns) {
  for (var i = 0; i < headerArr.length; i++) {
    var h = String(headerArr[i]);
    for (var j = 0; j < patterns.length; j++) {
      var re = new RegExp(patterns[j], 'i');
      if (re.test(h)) return i;
    }
  }
  return -1;
}


/**
 * Periodic runner: call this via an installable time-driven trigger (every 5-15 minutes)
 * It checks for the reports file and only processes it if it hasn't been processed yet.
 */
function periodicProcessReports() {
  var filename = 'reports_inventory_listings_assets.csv';
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var files = folder.getFilesByName(filename);
  if (!files.hasNext()) return;
  var file = files.next();
  var lastUpdated = file.getLastUpdated().toISOString();

  var props = PropertiesService.getScriptProperties();
  var key = 'LAST_PROCESSED_' + filename;
  var lastProcessed = props.getProperty(key);
  if (lastProcessed === lastUpdated) return; // already processed

  // run consolidation
  var res = handleConsolidateRequest(filename);
  Logger.log('periodicProcessReports: ' + res);
}
