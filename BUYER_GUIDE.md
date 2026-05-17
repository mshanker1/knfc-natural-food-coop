# Buyer's Guide: Updating Website Content

This guide is for KNFC buyers and staff who need to update inventory, sales, announcements, and other content on the website.

## Overview

All website content comes from CSV files stored in ONE Google Drive folder. When you update files in this folder, the website automatically shows the new data!

**Key Benefit**: No technical knowledge required - just upload/replace CSV files and you're done!

## Table of Contents

1. [Quick Start](#quick-start)
2. [File Overview](#file-overview)
3. [How to Update Files](#how-to-update-files)
4. [CSV File Formats](#csv-file-formats)
5. [Common Tasks](#common-tasks)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

**After initial setup is complete, updating content is simple:**

1. Open the Google Drive folder ("KNFC Website Files")
2. Find the file you want to update (e.g., inventory.csv)
3. Edit in Excel/Sheets, save as CSV
4. Upload to Google Drive, choose "Replace"
5. Done! Website updates in 30-60 seconds

---

## File Overview

Your Google Drive folder contains these CSV files:

| File | Purpose | Update Frequency |
|------|---------|------------------|
| **inventory.csv** | Product inventory displayed on Products page | Daily/Weekly |
| **sales.csv** | Weekly sales flyer (optional) | Weekly |
| **announcements.csv** | Homepage announcements (optional) | As needed |
| **highlights.csv** | Staff picks by department (optional) | Monthly |
| **education.csv** | Educational content/articles (optional) | As needed |

**Required**: Only `inventory.csv` is required. Others are optional.

**Important**: Always use these exact filenames! The website looks for files by name.

---

## How to Update Files

### Method 1: Edit and Replace (Recommended)

This is the standard workflow:

**Step 1: Download the current file**
1. Go to your Google Drive folder
2. Find the file you want to update (e.g., `inventory.csv`)
3. Right-click > Download
4. Save to your computer

**Step 2: Edit the file**
1. Open in Excel, Google Sheets, or your preferred spreadsheet program
2. Make your changes
   - Update quantities
   - Change prices
   - Add new products
   - Remove discontinued items
3. Keep the column headers exactly as they are
4. Don't change the column order

**Step 3: Save as CSV**
1. File > Save As
2. Choose "CSV (Comma delimited)" format
3. Use the **same filename** (e.g., `inventory.csv`)
4. Save to your computer

**Step 4: Upload to Google Drive**
1. Go back to the Google Drive folder
2. Find the **original file** (same name)
3. Right-click on it > "Manage versions"
4. Click "Upload new version"
5. Select your updated CSV file
6. Click "Upload"

**Step 5: Verify**
1. Wait 30-60 seconds
2. Visit the website
3. Hard refresh your browser:
   - Windows: Ctrl + Shift + R
   - Mac: Cmd + Shift + R
4. Confirm your changes appear

### Method 2: Delete and Re-Upload

Use this method if "Manage versions" isn't working:

1. Download the current file (backup!)
2. Delete the old file from Google Drive
3. Upload your new file with the **exact same filename**
4. Done!

**Important**: Must use the exact same filename or the website won't find it.

---

## CSV File Formats

### 1. inventory.csv

**Columns (in this order):**

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| UPC | Required | Number or text | 123456789012 |
| Item Name | Required | Text | Organic Bananas |
| Department | Required | Text | Produce |
| Remaining | Required | Number | 45 |
| Sales Price | Required | Number | 0.79 or $0.79 |

**Tips:**
- **Remaining** must be a plain number (no text like "45 units")
- **Sales Price** can include $ or not (both `4.99` and `$4.99` work)
- Use consistent department names (e.g., always "Produce", not sometimes "Fresh Produce")
- Empty UPC is OK for items without barcodes

**Example:**
```csv
UPC,Item Name,Department,Remaining,Sales Price
123456789012,Organic Bananas,Produce,45,0.79
987654321098,Almond Flour,Bulk,12,8.99
555123456789,Oat Milk,Dairy,8,4.49
```

### 2. sales.csv (Optional)

**Columns (in this order):**

| Column | Required | Example |
|--------|----------|---------|
| Title | Required | Weekly Member Specials |
| Subtitle | Optional | Valid March 15-21 |
| PDF_URL | Optional | https://drive.google.com/file/d/... |
| Active | Required | yes or no |

**Tips:**
- Set **Active** to `yes` to show, `no` to hide
- Only one sales flyer should be active at a time
- **PDF_URL**: Upload PDF to Google Drive, share as "Anyone can view", paste link here

### 3. announcements.csv (Optional)

**Columns (in this order):**

| Column | Required | Example |
|--------|----------|---------|
| Title | Required | Store Closure Notice |
| Body | Required | We'll be closed on Memorial Day |
| Date | Required | 2026-05-25 |
| Category | Optional | info, alert, event |
| Active | Required | yes or no |

**Tips:**
- Set **Active** to `yes` to show, `no` to hide
- **Date** format: YYYY-MM-DD
- Most recent 3 active announcements appear on homepage
- **Category** determines badge color (info=blue, alert=red, event=green)

### 4. highlights.csv (Staff Picks - Optional)

**Columns (in this order):**

| Column | Required | Example |
|--------|----------|---------|
| Title | Required | Manager's Pick: Kombucha |
| Description | Required | Our best-selling fermented tea... |
| Department | Required | Beverage |
| Recommended_By | Optional | Sarah, Store Manager |
| Image_URL | Optional | https://... |
| Active | Required | yes or no |

**Tips:**
- One staff pick per department
- Set **Active** to `yes` to show, `no` to hide

### 5. education.csv (Educational Content - Optional)

**Columns (in this order):**

| Column | Required | Example |
|--------|----------|---------|
| Title | Required | What is Organic Certification? |
| Content | Required | Organic certification means... |
| Category | Required | Guide, Farm Spotlight, etc. |
| Author | Optional | KNFC Staff |
| Date | Required | 2026-05-14 |
| Active | Required | yes or no |

**Tips:**
- Set **Active** to `yes` to show, `no` to hide
- **Date** format: YYYY-MM-DD
- **Content** can be multiple paragraphs (CSV allows line breaks in quoted fields)

---

## Common Tasks

### Update Product Inventory

**Scenario**: You need to update stock quantities and prices.

1. Download `inventory.csv` from Google Drive
2. Open in Excel
3. Update the **Remaining** and **Sales Price** columns
4. Save as CSV (same filename)
5. Upload to Google Drive using "Manage versions" > "Upload new version"

### Add New Products

**Scenario**: You're carrying a new product line.

1. Download `inventory.csv`
2. Open in Excel
3. Add new rows at the bottom:
   - Fill in UPC (or leave blank)
   - Enter Item Name
   - Enter Department (use existing department names for consistency)
   - Enter quantity in Remaining
   - Enter price in Sales Price
4. Save as CSV
5. Upload using "Manage versions" > "Upload new version"

### Remove Discontinued Products

**Scenario**: You're no longer carrying certain items.

1. Download `inventory.csv`
2. Open in Excel
3. Delete the rows for discontinued products
4. Save as CSV
5. Upload using "Manage versions" > "Upload new version"

### Change Weekly Sales

**Scenario**: New sales week starting.

1. Create your sales flyer PDF
2. Upload PDF to Google Drive
3. Share PDF as "Anyone with link can view"
4. Copy the share link
5. Download `sales.csv`
6. Set previous week's row Active = no
7. Add new row or update existing row:
   - Title: "Weekly Member Specials"
   - Subtitle: "Valid May 15-21"
   - PDF_URL: (paste the PDF share link)
   - Active: yes
8. Save as CSV
9. Upload using "Manage versions" > "Upload new version"

### Post an Announcement

**Scenario**: You need to alert customers about something.

1. Download `announcements.csv` (or create if doesn't exist)
2. Open in Excel
3. Add a new row:
   - Title: "Store Closure Notice"
   - Body: "We will be closed on Memorial Day, May 26."
   - Date: 2026-05-25
   - Category: alert
   - Active: yes
4. Save as CSV
5. Upload to Google Drive

### Update Staff Picks

**Scenario**: Monthly staff recommendations.

1. Download `highlights.csv`
2. Open in Excel
3. Update/add rows for each department's pick
4. Set Active = yes for current picks, no for old ones
5. Save as CSV
6. Upload using "Manage versions" > "Upload new version"

---

## Troubleshooting

### Problem: Website shows old data after I updated the file

**Solution**:
1. Wait 30-60 seconds (it takes a moment to propagate)
2. Hard refresh your browser:
   - Windows: Ctrl + Shift + R or Ctrl + F5
   - Mac: Cmd + Shift + R
3. Try in a different browser or incognito/private window
4. Verify you uploaded to the correct folder
5. Verify you used "Replace" or "Upload new version", not uploaded a new file

### Problem: Website shows "Unable to load inventory"

**Possible causes:**
1. **Wrong filename**: Check that your file is named exactly `inventory.csv` (case-sensitive, no spaces)
2. **File not in folder**: Make sure the file is directly in the Google Drive folder, not in a subfolder
3. **File format**: Verify it's a CSV file, not Excel (.xlsx)
4. **Folder not public**: The Google Drive folder must be shared as "Anyone with the link can view"
5. **Google Apps Script issue**: The proxy may be down or misconfigured (contact web developer)

**How to check:**
- Open browser developer console (F12)
- Look for error messages in the Console tab
- Check Network tab for failed requests

### Problem: Some products missing from website

**Possible causes:**
1. **Missing Item Name**: Products without an Item Name value won't display
2. **CSV formatting error**: Check for:
   - Extra commas in the CSV
   - Missing columns
   - Incorrect column order
   - Product name contains a comma but isn't properly quoted

**How to fix:**
- Open CSV in a text editor (Notepad, TextEdit)
- Look for lines with missing values or extra commas
- If a field contains a comma, it must be quoted: `"Flour, Almond"`
- Re-save from Excel as CSV to fix formatting

### Problem: Prices or quantities look wrong

**Possible causes:**
1. **Wrong data type**: Remaining must be a number, not text
2. **Column mismatch**: Columns may be in wrong order
3. **Extra characters**: Remove commas from numbers (use `1000`, not `1,000`)

**How to fix:**
- Verify column order matches the format exactly
- Remove thousand separators (commas) from numbers
- Remove currency symbols from the Remaining column

### Problem: Can't find "Manage versions" option

**Solution**:
- Right-click on the file
- Select "Manage versions"
- If you don't see this option:
  - Make sure you're right-clicking the file itself, not a folder
  - Try using the Google Drive web interface (not the desktop app)
  - Alternative: Delete old file and upload new one with same filename

### Problem: File uploaded but website can't find it

**Possible causes:**
1. **Wrong filename**: Must be exact (e.g., `inventory.csv`, not `Inventory.csv` or `inventory - Copy.csv`)
2. **File in subfolder**: Must be in the main folder, not nested inside another folder
3. **File not CSV**: Must be CSV format, not Excel

**How to check:**
- Go to your Google Drive folder
- Look at the file list
- Verify filename exactly matches what's in `js/inventory.js` configuration
- Check file type shows "text/csv" or similar

---

## Best Practices

### ✅ DO:

- Use "Manage versions" > "Upload new version" to replace files
- Keep column headers and order exactly as documented
- Use consistent naming for departments
- Test changes on the website after uploading
- Keep a backup copy of CSV files on your computer
- Use plain numbers for quantities (no "45 units", just "45")
- Use the same filenames every time

### ❌ DON'T:

- Don't upload a new file each time (breaks the system!)
- Don't rename columns or change their order
- Don't change filenames
- Don't use commas in numbers (no `1,000`, use `1000`)
- Don't put CSV files in subfolders
- Don't delete files and forget to replace them
- Don't mix up column data (e.g., putting prices in quantity column)

---

## File Templates

Need to create a new file from scratch? Here are templates:

### inventory.csv Template
```csv
UPC,Item Name,Department,Remaining,Sales Price
123456789012,Example Product,Produce,10,4.99
```

### sales.csv Template
```csv
Title,Subtitle,PDF_URL,Active
Weekly Member Specials,Valid May 15-21,https://drive.google.com/file/d/YOUR_PDF_ID/view,yes
```

### announcements.csv Template
```csv
Title,Body,Date,Category,Active
Welcome,Welcome to our store!,2026-05-14,info,yes
```

### highlights.csv Template
```csv
Title,Description,Department,Recommended_By,Image_URL,Active
Great Product,This is amazing!,Produce,Sarah,https://example.com/image.jpg,yes
```

### education.csv Template
```csv
Title,Content,Category,Author,Date,Active
How to Shop Organic,Start by reading labels...,Guide,KNFC Staff,2026-05-14,yes
```

---

## Getting Help

If you encounter issues not covered in this guide:

1. **Check the troubleshooting section** above
2. **Contact your web developer** with:
   - What you were trying to do
   - What happened instead
   - Any error messages
   - Link to the Google Drive folder
   - Screenshot if helpful

3. **Common files to check** (for technical staff):
   - `google-apps-script/DriveProxy.gs` - The proxy script configuration
   - `js/inventory.js` - Inventory configuration
   - `js/content.js` - Content configuration
   - Browser console - Error messages

---

## Summary

**For most updates, you only need to remember:**

1. Download the CSV file from Google Drive
2. Edit it in Excel/Sheets
3. Save as CSV with the same filename
4. Upload to Google Drive using "Manage versions" > "Upload new version"
5. Wait 30 seconds, then refresh the website

**That's it!** No code changes, no technical setup needed.

---

Last Updated: 2026-05-14
