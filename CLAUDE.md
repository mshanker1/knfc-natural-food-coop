# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static website for Kent Natural Foods Co-op (KNFC), a member-owned cooperative grocery store in Kent, Ohio. The site is built with vanilla HTML, CSS, and JavaScript - no build process or framework required.

## Development Workflow

### Local Development
```bash
# Start a local server (required for inventory feature to work)
python -m http.server 8000

# Then open http://localhost:8000
```

The inventory feature requires a local server due to browser security restrictions on file:// protocol.

### No Build Process
This is a static site with no build, compile, or bundling steps. All changes are immediately visible on refresh.

## Architecture

### Page Structure
The site consists of 7 main HTML pages that share a common structure:
- **index.html** - Homepage with quick info and announcements
- **about.html** - About the co-op, history, and mission
- **products.html** - Inventory browser with search and filters
- **membership.html** - Membership benefits and how to join
- **volunteer.html** - Volunteer opportunities
- **special-requests.html** - Form for customers to request products or place special orders
- **contact.html** - Contact form and location info

All pages use the same header/footer/nav structure - when updating these elements, you must update all 7 HTML files.

### JavaScript Architecture

**js/main.js** - Shared functionality across all pages:
- Mobile menu toggle
- Copyright year auto-update
- Contact form validation
- Smooth scrolling for anchor links

**js/inventory.js** - Product inventory system with three data source options:
- **Google Drive Folder mode** (RECOMMENDED): Fetches CSV files from a single Google Drive folder by filename - simplest for buyers
- **Google Sheets mode**: Fetches CSV from published Google Sheet URL - alternative option
- **Local CSV mode**: Reads from `data/consolidated_inventory.csv` - for development only

The inventory system is configured via constants at the top of `js/inventory.js`:
- `DATA_SOURCE`: Set to 'google-drive-folder', 'google-sheets', or 'local'
- `GOOGLE_DRIVE_API_URL`: URL of deployed Google Apps Script web app (for google-drive-folder mode)
- `INVENTORY_FILENAME`: Name of inventory file in the folder (default: 'inventory.csv')
- `GOOGLE_SHEET_CSV_URL`: Published CSV URL from Google Sheets (for google-sheets mode)
- `LOW_STOCK_THRESHOLD`: Quantity level for "Low Stock" badge (default: 5)
- `LOCAL_CSV_PATH`: Path to local CSV file (for local mode)

**js/content.js** - Dynamic content loader for announcements, sales, staff picks, and education content:
- Supports same three data source options as inventory.js
- Configuration at top of file mirrors inventory.js pattern
- **Google Drive Folder mode** (RECOMMENDED): All content files in same folder as inventory
- Files: `announcements.csv`, `sales.csv`, `highlights.csv`, `education.csv`

**For buyers**: See `BUYER_GUIDE.md` for detailed instructions on updating all website content via Google Drive.
**For setup**: See `google-apps-script/SETUP.md` for one-time Google Apps Script deployment instructions.

### CSS Architecture

All styles are in a single file: `css/styles.css`

**CSS Variables** (lines 6-49): Colors, fonts, spacing, shadows defined in `:root`
- Primary colors: Natural greens (`--color-primary`, `--color-primary-light`, etc.)
- Secondary colors: Earth tones (`--color-secondary`)
- Typography: Playfair Display for headings, Nunito for body

**Mobile-First Approach**: Base styles are mobile, with desktop overrides in media queries.

### Data Format

The inventory CSV must have these columns (in order):
1. UPC (required) - Universal Product Code
2. Item Name (required) - Product name/description
3. Department (required) - Department/category (e.g., Beverage, Bulk_HB, Frozen, Milk, Packaged_Dry, Packaged_HB, Vitamins)
4. Remaining (required, number) - Current stock quantity
5. Sales Price (required, format: 4.99 or $4.99) - Retail price

**Consolidating Department Files:**
If you have separate CSV files per department, use the provided consolidation script:
```bash
cd data
python3 consolidate_inventory.py
```
This creates `consolidated_inventory.csv` with all departments merged and properly formatted.

## Key Patterns

### Placeholder System
Throughout the HTML files, placeholders are marked with square brackets `[...]`:
- `[YEAR]` - Year the co-op was founded
- `[Street Address]` - Store address
- `[ZIP]` - ZIP code
- `[PHONE]` - Phone number
- `[EMAIL]` - Email address
- `[Hours]` - Store hours
- `[X]` - Various numbers/values

When making updates, search for these placeholders to find content that needs customization.

### Stock Status Logic
Stock badges are generated in `js/inventory.js` based on quantity:
- **Out of Stock**: quantity <= 0 (red badge)
- **Low Stock**: quantity <= LOW_STOCK_THRESHOLD (yellow badge)
- **In Stock**: quantity > LOW_STOCK_THRESHOLD (green badge)

### XSS Protection
The `escapeHtml()` function in `inventory.js:323-327` sanitizes all user-generated content before display to prevent XSS attacks.

## Common Tasks

### Updating Site-Wide Navigation
Edit the `<nav class="main-nav">` section in all 7 HTML files. The structure must match across all pages for consistent experience.

### Changing Color Scheme
Edit CSS variables in `css/styles.css:6-49`. All colors throughout the site reference these variables.

### Configuring Data Sources

**Option 1: Google Drive Folder (RECOMMENDED - Best for buyers)**

This is the BEST method - one folder containing ALL CSV files!

**Why this is best:**
- **One-time setup**: Configure once, works forever
- **Simple updates**: Buyers just upload/replace files by name
- **No file IDs**: No tracking individual file URLs
- **Multiple files**: inventory.csv, sales.csv, announcements.csv, etc. all in one place
- **Any tool works**: Edit in Excel, Google Sheets, LibreOffice - whatever buyers prefer

**Setup (see `google-apps-script/SETUP.md` for detailed instructions):**

1. Create a Google Drive folder
2. Upload CSV files to folder: `inventory.csv`, `sales.csv`, `announcements.csv`, etc.
3. Share folder as "Anyone with the link" can VIEW
4. Deploy the provided Google Apps Script (`google-apps-script/DriveProxy.gs`) as a web app
5. Configure both `js/inventory.js` and `js/content.js` with:
   - `DATA_SOURCE = 'google-drive-folder'`
   - `GOOGLE_DRIVE_API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'`

**To update content**: Buyers edit CSV files, save with same filenames, upload to Google Drive using "Manage versions" > "Upload new version". That's it!

**Technical details:**
- Google Apps Script acts as a simple proxy/API to read files from the folder
- Website requests files by name: `API_URL?file=inventory.csv`
- Script validates filenames, prevents directory traversal, only allows CSV files
- All content files can live in the same folder

See `google-apps-script/SETUP.md` for step-by-step deployment instructions.
See `BUYER_GUIDE.md` for buyer workflow instructions.

**Option 2: Google Sheets (Alternative - more steps for buyers)**
1. Create Google Sheets with required columns
2. File > Share > Publish to web > Select CSV format
3. Copy published URLs
4. Update `GOOGLE_SHEET_CSV_URL` constants in JavaScript files
5. Set `DATA_SOURCE = 'google-sheets'`

Downside: Buyers must remember to republish sheets after editing.

**Option 3: Local CSV Files (Development only)**
1. Place CSV files in `/data` folder
2. Set `DATA_SOURCE = 'local'` in both JS files
3. Run local server for testing

Only use this for development. Not suitable for production.

### Testing Inventory Locally
Use local CSV mode when developing:
1. Set `DATA_SOURCE = 'local'` in `js/inventory.js:44`
2. Place consolidated inventory in `data/inventory.csv` (or update `LOCAL_CSV_PATH`)
3. Run local server (CSV files won't load via file:// protocol)

### Adding New Pages
When adding pages:
1. Copy header/nav/footer from existing page
2. Update active nav link (`class="active"`)
3. Include `css/styles.css` and `js/main.js`
4. Add page link to nav in all other pages

## Deployment

This site is designed for static hosting platforms:
- **GitHub Pages**: Push to repo, enable in Settings > Pages
- **Netlify**: Drag and drop folder or connect to git repo
- **Any web server**: Upload files via FTP/SFTP

No server-side processing required except for contact form submissions (requires Formspree or Netlify Forms integration).

## Important Constraints

- **No JavaScript Frameworks**: This is vanilla JavaScript. Do not introduce React, Vue, etc.
- **No Build Tools**: No webpack, npm, or compilation. Keep it simple.
- **Shared Header/Footer**: Changes to navigation/footer must be replicated across all 7 HTML files.
- **Mobile-First**: Always test responsive behavior when making layout changes.
- **Browser Compatibility**: Support modern browsers (Chrome, Firefox, Safari, Edge). No IE11 support needed.
