# Buyer's Guide: Updating Website Content

This guide is for KNFC buyers and staff who need to update sales, announcements, staff picks, and educational content on the website.

## Overview

### Inventory — automatic, no action needed

Product inventory on the website is **pulled directly from the POS system via API and refreshed every hour**. Stock levels, prices, and product names are always up to date. You do not need to export, edit, or upload an inventory file.

### Everything else — managed via Google Drive

Sales flyers, announcements, staff picks, and educational content come from CSV files stored in the **KNFC Website Files** folder on Google Drive. When you update those files, the website reflects the change within about 30 seconds.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [File Overview](#file-overview)
3. [How to Update Files](#how-to-update-files)
4. [CSV File Formats](#csv-file-formats)
5. [Common Tasks](#common-tasks)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

**To update any content file:**

1. Open the **KNFC Website Files** folder in Google Drive
2. Find the file you want to update (e.g., `sales.csv`)
3. Edit it in Excel or Google Sheets, then save as CSV with the same filename
4. Upload to Google Drive → right-click the original file → **Manage versions** → **Upload new version**
5. Wait 30–60 seconds, then hard-refresh the website

**To check inventory:** just visit the Products page — it's always current.

---

## File Overview

| File | Purpose | Update Frequency | Who updates it |
|------|---------|------------------|----------------|
| ~~inventory.csv~~ | ~~Product inventory~~ | **Auto-synced from POS hourly** | **POS system (automatic)** |
| **sales.csv** | Weekly sales flyer | Weekly | Buyers |
| **announcements.csv** | Homepage announcements | As needed | Staff |
| **highlights.csv** | Staff picks by department | Monthly | Staff |
| **education.csv** | Guides and educational content | As needed | Staff |

**Note:** `inventory.csv` no longer exists in the Google Drive folder and does not need to be managed. The website fetches inventory data directly from the POS API.

---

## How to Update Files

### Standard workflow (for sales, announcements, highlights, education)

**Step 1: Download the current file**
1. Go to the KNFC Website Files folder in Google Drive
2. Right-click the file you want to update → **Download**
3. Save to your computer

**Step 2: Edit the file**
1. Open in Excel, Google Sheets, or any spreadsheet program
2. Make your changes — keep column headers and column order exactly as they are
3. Do not add or remove columns

**Step 3: Save as CSV**
1. File → Save As → choose **CSV (Comma delimited)** format
2. Use the **exact same filename** (e.g., `sales.csv`)

**Step 4: Upload to Google Drive**
1. Go back to the Google Drive folder
2. Right-click the **original file** → **Manage versions** → **Upload new version**
3. Select your updated CSV → **Upload**

**Step 5: Verify**
1. Wait 30–60 seconds
2. Visit the website and hard-refresh:
   - Windows: **Ctrl + Shift + R**
   - Mac: **Cmd + Shift + R**
3. Confirm your changes appear

### Alternative: Delete and re-upload

If "Manage versions" isn't available:

1. Download the current file as a backup
2. Delete the old file from Google Drive
3. Upload the new file using the **exact same filename**

---

## CSV File Formats

### 1. sales.csv

One row per sale item — similar to announcements. Only rows with `Active = yes` appear on the website.

**Columns (in this order):**

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| Item | Required | Text | GT's Gingerade Kombucha 16oz |
| Description | Optional | Text | Member price this week only |
| Sale_Price | Required | Number | 3.99 |
| Regular_Price | Optional | Number | 4.69 |
| Start_Date | Optional | YYYY-MM-DD | 2026-06-15 |
| End_Date | Optional | YYYY-MM-DD | 2026-06-21 |
| Active | Required | yes or no | yes |

**Tips:**
- Add one row per sale item — there is no limit on how many active rows you can have
- Set items to `Active = no` when the sale ends (or delete the row)
- `Regular_Price` is optional but useful — it lets customers see the savings
- Dates are optional but help staff remember when sales started/ended

### 2. announcements.csv

**Columns (in this order):**

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| Title | Required | Text | Store Closure Notice |
| Body | Required | Text | We'll be closed on July 4th |
| Date | Required | YYYY-MM-DD | 2026-07-04 |
| Category | Optional | info / alert / event | alert |
| Active | Required | yes or no | yes |

**Tips:**
- The three most recent active announcements appear on the homepage
- **Category** controls the badge colour: `info` = blue, `alert` = red, `event` = green
- Set old announcements to `Active = no` to remove them

### 3. highlights.csv (Staff Picks)

**Columns (in this order):**

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| Title | Required | Text | Staff Pick: GT's Kombucha |
| Description | Required | Text | Our best-selling fermented tea |
| Department | Required | Text | Beverages |
| Recommended_By | Optional | Text | Sarah, Store Manager |
| Image_URL | Optional | URL | https://... |
| Active | Required | yes or no | yes |

**Tips:**
- Aim for one active pick per department
- Set old picks to `Active = no` when replacing them

### 4. education.csv (Educational Content)

**Columns (in this order):**

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| Title | Required | Text | What Is Organic Certification? |
| Content | Required | Text | Organic certification means... |
| Category | Required | Text | Guide, Farm Spotlight, etc. |
| Author | Optional | Text | KNFC Staff |
| Date | Required | YYYY-MM-DD | 2026-06-01 |
| Active | Required | yes or no | yes |

**Tips:**
- Content can span multiple paragraphs — wrap the field in quotes in the CSV if it contains commas or line breaks
- Set old articles to `Active = no` to archive them

---

## Common Tasks

### Update the weekly sales

1. Download `sales.csv` and open in Excel
2. Set last week's items to `Active = no` (or delete those rows)
3. Add a new row for each sale item: Item name, Description, Sale_Price, Regular_Price, dates, `Active = yes`
4. Save as CSV → upload to Google Drive via Manage versions

### Post an announcement

1. Download `announcements.csv` (or create it from the template below if it doesn't exist)
2. Add a new row with your Title, Body, Date, Category, and `Active = yes`
3. Save as CSV → upload to Google Drive

### Update staff picks

1. Download `highlights.csv`
2. Set the old pick for that department to `Active = no`
3. Add a new row for the new pick with `Active = yes`
4. Save as CSV → upload to Google Drive

### Check the live inventory

Just visit the **Products** page on the website — the inventory is pulled from the POS system every hour. There is nothing to upload or edit.

---

## Troubleshooting

### Website shows old content after I updated a file

1. Wait 60 seconds
2. Hard-refresh: **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)
3. Try an incognito/private browser window
4. Verify you used **Manage versions → Upload new version**, not uploaded a new separate file
5. Confirm the filename is exactly correct (case-sensitive, no spaces)

### Content not appearing at all

- **Wrong filename:** must match exactly — `sales.csv`, not `Sales.csv` or `sales - Copy.csv`
- **Wrong folder:** file must be directly in the KNFC Website Files folder, not inside a subfolder
- **Wrong file format:** must be `.csv`, not `.xlsx`
- **Folder not public:** the Google Drive folder must be shared as "Anyone with the link can view"

### Inventory looks out of date on the website

The inventory syncs from the POS every hour. If data looks stale:
- Wait up to one hour for the next automatic sync
- Hard-refresh the Products page
- If the problem persists after an hour, contact your web developer — there may be an issue with the POS API connection

### Some products missing from inventory

Products are excluded from the website display if:
- Their quantity in the POS is **0 or less** (out-of-stock items are hidden by design)
- Their Item Name is blank in the POS

If an in-stock item is missing, check its record in the POS system directly.

### CSV formatting problems

If fields contain commas, wrap them in double-quotes:
```
"Flour, Almond",Bulk,12,8.99
```

If a field contains a quote character, double it up:
```
"Bob""s Red Mill Oats",Cereal,6,5.99
```

---

## Best Practices

### ✅ DO:
- Use **Manage versions → Upload new version** to replace files (never upload a second copy)
- Keep column headers and order exactly as documented
- Use consistent department names
- Test on the website after every upload
- Keep a local backup of your CSV files

### ❌ DON'T:
- Don't manually edit or upload an `inventory.csv` — the POS API handles this automatically
- Don't rename columns or change their order
- Don't change filenames
- Don't use commas inside numbers (`1000`, not `1,000`)
- Don't put files in subfolders

---

## File Templates

### sales.csv
```csv
Item,Description,Sale_Price,Regular_Price,Start_Date,End_Date,Active
GT's Gingerade Kombucha 16oz,Member price this week,3.99,4.69,2026-06-15,2026-06-21,yes
Chocolove Dark Chocolate 3.2oz,,4.79,5.39,2026-06-15,2026-06-21,yes
```

### announcements.csv
```csv
Title,Body,Date,Category,Active
Welcome,Welcome to the new KNFC website!,2026-06-01,info,yes
```

### highlights.csv
```csv
Title,Description,Department,Recommended_By,Image_URL,Active
Staff Pick: GT's Kombucha,Our best-seller in the cooler,Beverages,Sarah,,yes
```

### education.csv
```csv
Title,Content,Category,Author,Date,Active
What Is Organic?,Organic certification means...,Guide,KNFC Staff,2026-06-01,yes
```

---

## Getting Help

If you encounter an issue not covered here:

1. Check the troubleshooting section above
2. Contact your web developer with:
   - What you were trying to do
   - What happened instead
   - Any error messages
   - A screenshot if helpful

**Technical files for reference (web developer):**
- `google-apps-script/DriveProxy.gs` — Google Drive proxy script
- `google-apps-script/FormHandler.gs` — Contact/special-request form handler
- `js/inventory.js` — POS API connection and inventory display logic
- `js/content.js` — Sales, announcements, staff picks, education logic

---

Last Updated: 2026-06-14
