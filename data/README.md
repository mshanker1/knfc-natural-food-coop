# Inventory Data Files

This directory contains the product inventory data for the KNFC website.

## Files

### Source Department Files
- `Beverage.csv` - Beverage department inventory (589 products)
- `Bulk_HB.csv` - Bulk Health & Beauty items (760 products)
- `Frozen.csv` - Frozen foods (87 products)
- `Milk.csv` - Dairy and milk products (178 products)
- `Packaged_Dry.csv` - Packaged dry goods (1196 products)
- `Packaged_HB.csv` - Packaged Health & Beauty (685 products)
- `Vitamins.csv` - Vitamins and supplements (854 products)

### Consolidated File
- `consolidated_inventory.csv` - **Use this file for the website** (4349 total products)

## CSV Format

The consolidated CSV file has these columns:
1. **UPC** - Universal Product Code
2. **Item Name** - Product name/description
3. **Department** - Department category
4. **Remaining** - Current stock quantity
5. **Sales Price** - Retail price (with $ symbol)

## How to Upload to Google Sheets

### Method 1: Direct Import (Recommended)

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. File > Import > Upload tab
4. Upload `consolidated_inventory.csv`
5. Choose "Replace spreadsheet" and click "Import data"

### Method 2: Multiple Tabs (Advanced)

If you want to keep departments separate:

1. Create a new Google Sheet
2. For each department CSV:
   - Create a new tab (rename it to the department name)
   - File > Import > Upload
   - Choose "Insert new sheet(s)" or "Replace current sheet"
   - Import the department CSV
3. Create a "Master" tab that combines all departments
4. Use formulas or Google Apps Script to consolidate

**Recommended:** Use the consolidation script instead:
```bash
python3 consolidate_inventory.py
```

### Method 3: Copy-Paste

1. Open `consolidated_inventory.csv` in a spreadsheet program (Excel, Numbers, etc.)
2. Select all data (Cmd+A / Ctrl+A)
3. Copy (Cmd+C / Ctrl+C)
4. Open new Google Sheet
5. Paste (Cmd+V / Ctrl+V)

## Publishing Your Google Sheet for the Website

After uploading to Google Sheets:

1. File > Share > Publish to web
2. In the dialog:
   - Select the sheet/tab to publish (if multiple tabs, choose "Master" or consolidated tab)
   - Choose "Comma-separated values (.csv)" format
   - Click "Publish"
3. Copy the published URL (looks like: `https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`)
4. Update `GOOGLE_SHEET_CSV_URL` in `/js/inventory.js` (around line 48)
5. Set `DATA_SOURCE = 'google-sheets'` in `/js/inventory.js` (around line 44)

## Updating the Consolidation Script

If you add new department files or change the column structure, edit `consolidate_inventory.py`:

- Update `DEPARTMENT_FILES` dictionary with new departments
- Update column indices if source CSV format changes

## Local Testing

To test with local CSV data:

1. In `js/inventory.js`, set:
   ```javascript
   const DATA_SOURCE = 'local';
   const LOCAL_CSV_PATH = 'data/consolidated_inventory.csv';
   ```

2. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```

3. Open http://localhost:8000/products.html

## Notes

- The website displays only: UPC, Item Name, Department, Remaining, Sales Price
- Original source files have additional columns (System ID, EAN, SKU, Costs, Margins) that are not displayed
- Keep source department files for your records, but use consolidated file for the website
- Re-run the consolidation script whenever source files are updated
