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
// Example: If folder URL is https://drive.google.com/drive/folders/1AbC2dEf3GhI4jKl5MnO
// Then FOLDER_ID is: 1AbC2dEf3GhI4jKl5MnO
const FOLDER_ID = 'YOUR_FOLDER_ID_HERE';

// ============================================
// END CONFIGURATION
// ============================================

/**
 * Main function that handles GET requests
 * Called when someone accesses the web app URL
 */
function doGet(e) {
  try {
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
