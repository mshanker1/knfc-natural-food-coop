# Inventory Setup Guide for KNFC Website

## Summary of Changes

Your website inventory system has been updated to display:
- **UPC** - Product barcode
- **Item Name** - Product description
- **Department** - Category (Beverage, Bulk_HB, Frozen, Milk, Packaged_Dry, Packaged_HB, Vitamins)
- **Remaining** - Stock quantity (raw number, not badges)
- **Sales Price** - Retail price

## Files Modified

### JavaScript
- `/js/inventory.js` - Updated to parse and display new column structure

### HTML
- `/products.html` - Updated table headers and filter labels

### Documentation
- `/CLAUDE.md` - Updated with new CSV format and instructions

### Data Files Created
- `/data/consolidated_inventory.csv` - **4,349 products** across 7 departments
- `/data/consolidate_inventory.py` - Python script to merge department files
- `/data/README.md` - Instructions for data management

## Quick Start

### Option 1: Test Locally (Immediate)

The site is already configured to use local data:

1. Start local server:
   ```bash
   cd /Users/muralishanker/Python_Projects/pdf-chatbot/knfc-website
   python3 -m http.server 8000
   ```

2. Open browser to: http://localhost:8000/products.html

3. You should see all 4,349 products with department filtering

### Option 2: Upload to Google Sheets (Production)

Follow these steps to make it live:

#### Step 1: Upload to Google Sheets

**Method A: Direct Import (Easiest)**
1. Go to https://sheets.google.com
2. Click "Blank" to create new spreadsheet
3. File > Import > Upload
4. Select `/data/consolidated_inventory.csv`
5. Choose "Replace spreadsheet"
6. Click "Import data"

**Method B: Multiple Tabs (if you prefer organized view)**
1. Create new Google Sheet
2. Import `consolidated_inventory.csv` into first tab
3. Optionally create additional tabs for each department
4. You can use filters/pivot tables in Google Sheets to organize

#### Step 2: Publish the Sheet

1. In your Google Sheet: File > Share > Publish to web
2. Settings:
   - **Sheet to publish:** Choose the main data tab (usually "Sheet1")
   - **Format:** Select "Comma-separated values (.csv)"
3. Click "Publish"
4. **Copy the URL** (it will look like):
   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-1vS.../pub?output=csv
   ```

#### Step 3: Update Website Configuration

1. Open `/js/inventory.js`
2. Find line 43 and change:
   ```javascript
   const DATA_SOURCE = 'google-sheets';  // Change from 'local'
   ```
3. Find line 47 and paste your URL:
   ```javascript
   const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/YOUR_URL_HERE/pub?output=csv';
   ```
4. Save the file

#### Step 4: Deploy

Upload all files to your web host (GitHub Pages, Netlify, your server, etc.)

## Maintaining Your Inventory

### Updating Product Data

**If using Google Sheets:**
1. Edit products directly in Google Sheets
2. Changes appear on website within minutes (Google's cache)
3. No need to re-publish, the URL stays the same

**If using Local CSV:**
1. Update your source department CSV files
2. Run consolidation script:
   ```bash
   cd /Users/muralishanker/Python_Projects/pdf-chatbot/knfc-website/data
   python3 consolidate_inventory.py
   ```
3. Upload new `consolidated_inventory.csv` to your web server

### Adding New Departments

1. Add new CSV file to `/data/` directory
2. Edit `/data/consolidate_inventory.py`:
   ```python
   DEPARTMENT_FILES = {
       'Beverage.csv': 'Beverage',
       'NewDept.csv': 'NewDept',  # Add this line
       # ... other departments
   }
   ```
3. Run script to regenerate consolidated file

## Features

### Search
Users can search by:
- UPC code
- Item name
- Department name

### Filters
- **Department Filter** - Show only products from specific department
- **Stock Filter** - Filter by stock levels (In Stock, Low Stock, Out of Stock)
  - Out of Stock: 0 items
  - Low Stock: 1-5 items (configurable in `js/inventory.js` line 53)
  - In Stock: 6+ items

### Sorting
Currently displays in the order from CSV file. Can be enhanced with column sorting if needed.

## FAQ

### Can I use multiple tabs in Google Sheets?

**Yes**, but with limitations:

**Option A: Publish Master Tab Only (Recommended)**
- Import consolidated CSV to main tab
- Create additional tabs for your own organization/reports
- Only publish the main data tab to the website

**Option B: Fetch Multiple Tabs (Requires Code Changes)**
- Each tab gets its own publish URL
- Would need to modify `inventory.js` to fetch and merge multiple URLs
- More complex but keeps departments fully separated

**Option C: Use IMPORTRANGE**
- Keep each department in separate sheet
- Use Google Sheets formulas to combine into master tab
- Publish only the master tab

### How often does the website update?

- **Google Sheets**: Updates propagate within a few minutes (Google's cache)
- **Local CSV**: Updates immediately when file is uploaded to server
- No need to clear browser cache; data is fetched fresh

### What if I want to add more columns?

You'll need to:
1. Update CSV format
2. Modify `parseCSV()` function in `inventory.js` (line 137)
3. Update table HTML in `products.html` (line 116)
4. Update `renderInventory()` function in `inventory.js` (line 237)

### Can users sort by columns?

Not currently. To add sorting:
- Consider using a library like [Tablesort](https://github.com/tristen/tablesort)
- Or implement custom sorting in `inventory.js`

### Why not use a database?

This is intentionally a static site with no backend:
- Lower cost (free hosting on GitHub Pages/Netlify)
- No server maintenance
- Faster load times
- Google Sheets provides easy interface for non-technical staff

## Support

For questions about:
- **Website code**: See `/CLAUDE.md`
- **Data format**: See `/data/README.md`
- **This guide**: Contact your web developer

## Product Count by Department

Based on current data (as of consolidation):
- **Packaged_Dry**: 1,196 products (27.5%)
- **Vitamins**: 854 products (19.6%)
- **Bulk_HB**: 760 products (17.5%)
- **Packaged_HB**: 685 products (15.8%)
- **Beverage**: 589 products (13.5%)
- **Milk**: 178 products (4.1%)
- **Frozen**: 87 products (2.0%)

**Total**: 4,349 products across 7 departments
