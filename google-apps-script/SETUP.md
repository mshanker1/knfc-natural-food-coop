# Google Apps Script Setup Guide

This guide explains how to set up the Google Drive folder proxy that allows your website to read CSV files from a single Google Drive folder.

## Why This Approach?

Instead of configuring individual file URLs, you'll:
1. Create ONE Google Drive folder
2. Upload all CSV files to that folder (inventory.csv, sales.csv, announcements.csv, etc.)
3. The website reads files by name from that folder
4. Buyers can update files by simply replacing them in the folder

## One-Time Setup (30 minutes)

### Step 1: Create Google Drive Folder

1. Go to [Google Drive](https://drive.google.com)
2. Click "New" > "Folder"
3. Name it "KNFC Website Files" (or any name you prefer)
4. Open the folder
5. Right-click in the folder > "Share"
6. Change access to **"Anyone with the link"** can **"Viewer"**
7. Copy the folder URL (you'll need the folder ID from it)

The URL looks like:
```
https://drive.google.com/drive/folders/1AbC2dEf3GhI4jKl5MnO6pQr7StU8vWx9YzA
```

The **Folder ID** is the part after `/folders/`:
```
1AbC2dEf3GhI4jKl5MnO6pQr7StU8vWx9YzA
```

**Save this Folder ID** - you'll need it in Step 3.

### Step 2: Upload Your CSV Files

Upload these CSV files to your folder:

1. **inventory.csv** - Product inventory (required)
   - Columns: UPC, Item Name, Department, Remaining, Sales Price

2. **sales.csv** - Weekly sales flyer (optional)
   - Columns: Item Name, Description, Regular Price, Sale Price, Department

3. **announcements.csv** - Store announcements (optional)
   - Columns: Title, Message, Date, Type

4. **staff-picks.csv** - Staff recommendations (optional)
   - Columns: Item Name, Description, Department, Recommended By, Image URL

5. **education.csv** - Educational content (optional)
   - Columns: Title, Content, Category, Author, Date

**Important**: Use these exact filenames! The website looks for files by these specific names.

### Step 3: Create Google Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Name the project "KNFC Drive Proxy"
4. Delete any default code in the editor
5. Copy the entire contents of `DriveProxy.gs` from this folder
6. Paste it into the script editor
7. **Important**: Find this line near the top:
   ```javascript
   const FOLDER_ID = 'YOUR_FOLDER_ID_HERE';
   ```
8. Replace `YOUR_FOLDER_ID_HERE` with your Folder ID from Step 1
9. Click the disk icon to save (or Ctrl+S / Cmd+S)

### Step 4: Test the Script (Optional but Recommended)

1. In the script editor, find the function dropdown at the top (should say "Select function")
2. Select `testFolderAccess`
3. Click "Run" (▶️ button)
4. **First time only**: You'll need to authorize the script
   - Click "Review permissions"
   - Choose your Google account
   - Click "Advanced" > "Go to KNFC Drive Proxy (unsafe)"
   - Click "Allow"
5. Click "Execution log" button at the bottom
6. You should see:
   ```
   ✓ Folder found: KNFC Website Files
   Files in folder:
     - inventory.csv
     - sales.csv
     ... etc
   ✓ Configuration test successful!
   ```

If you see errors, double-check your Folder ID.

### Step 5: Deploy as Web App

1. In the script editor, click "Deploy" > "New deployment"
2. Click the gear icon ⚙️ next to "Select type"
3. Choose "Web app"
4. Fill in the settings:
   - **Description**: "KNFC Drive Proxy v1"
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
5. Click "Deploy"
6. **Important**: You'll see a warning about making the script public. Click "Authorize access" and go through the authorization again if needed
7. You'll get a **Web app URL** like:
   ```
   https://script.google.com/macros/s/AKfycbx...xyz123.../exec
   ```
8. **Copy this URL** - this is your API endpoint!

### Step 6: Test the Deployment

Open your web app URL in a browser with a filename parameter:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?file=inventory.csv
```

You should see the CSV content displayed in your browser!

### Step 7: Configure Your Website

1. Open your website's code
2. Edit `js/inventory.js`
3. Find these lines:
   ```javascript
   const DATA_SOURCE = 'google-drive-folder';
   const GOOGLE_DRIVE_API_URL = 'YOUR_WEB_APP_URL_HERE';
   ```
4. Replace `YOUR_WEB_APP_URL_HERE` with your Web app URL from Step 5
5. Save the file
6. Upload/deploy your website

**Setup complete!** 🎉

## How It Works

When your website needs a file:
1. JavaScript makes a request to: `YOUR_API_URL?file=inventory.csv`
2. The Google Apps Script receives the request
3. Script reads the file from your Google Drive folder
4. Script returns the CSV content to your website
5. Website displays the data

## Updating Files (For Buyers)

This is the beauty of this system - it's super simple:

1. Go to your Google Drive folder
2. Upload the new CSV file (same filename, e.g., `inventory.csv`)
3. Choose "Replace" when prompted
4. Done! Website updates automatically

OR:

1. Delete the old file
2. Upload the new file with the same name
3. Done!

No code changes needed!

## Troubleshooting

### Problem: "Error: Folder ID not configured"

**Solution**: You didn't replace `YOUR_FOLDER_ID_HERE` in the script. Go back to Step 3.

### Problem: "Error: File not found"

**Solution**:
- Check that the filename in your folder exactly matches what the website is requesting
- Filenames are case-sensitive: `inventory.csv` ≠ `Inventory.csv`
- Make sure the file is directly in the folder, not in a subfolder

### Problem: "Authorization required" when testing

**Solution**: This is normal the first time. Follow the authorization steps in Step 4.

### Problem: Website shows "Unable to load inventory"

**Solutions**:
1. Check browser console (F12) for error messages
2. Test your API URL directly in browser (Step 6)
3. Make sure `GOOGLE_DRIVE_API_URL` in `js/inventory.js` matches your deployment URL
4. Make sure you deployed the script as "Anyone" can access

### Problem: Files in Google Drive updated but website shows old data

**Solution**:
- Clear browser cache (Ctrl+Shift+Delete / Cmd+Shift+Delete)
- Hard refresh (Ctrl+F5 / Cmd+Shift+R)
- Wait 30-60 seconds for Google Drive to propagate changes

## Security Notes

- The script only allows CSV files (security feature)
- The script prevents directory traversal attacks
- The folder should be set to "Viewer" only, not "Editor"
- Only people with the folder link can view files
- The web app is public but only reads from your specific folder
- No one can delete or modify your files through the web app

## Updating the Script

If you need to update the script later:

1. Go back to [script.google.com](https://script.google.com)
2. Open your "KNFC Drive Proxy" project
3. Make your changes
4. Save
5. Click "Deploy" > "Manage deployments"
6. Click the edit icon ✏️ on your deployment
7. Click "Version" > "New version"
8. Click "Deploy"
9. The URL stays the same, so no website changes needed!

## Advanced: Multiple Environments

Want separate folders for testing and production?

**Option 1: Two Scripts**
- Create two separate Apps Script projects
- Each configured with a different folder ID
- Use different deployment URLs for test vs. production website

**Option 2: Query Parameter**
- Modify the script to accept a `folder` parameter
- Store multiple folder IDs in the script
- Use `?folder=test&file=inventory.csv` for testing
- Use `?folder=prod&file=inventory.csv` for production

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Test the script using `testFolderAccess()` function
3. Check the script's execution log (View > Logs)
4. Contact your web developer with error messages

---

Last Updated: 2026-05-14
