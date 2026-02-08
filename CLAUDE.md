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
The site consists of 6 main HTML pages that share a common structure:
- Header with navigation (mobile-responsive hamburger menu)
- Main content area
- Footer with contact info and quick links

All pages use the same header/footer/nav structure - when updating these elements, you must update all 6 HTML files.

### JavaScript Architecture

**js/main.js** - Shared functionality across all pages:
- Mobile menu toggle
- Copyright year auto-update
- Contact form validation
- Smooth scrolling for anchor links

**js/inventory.js** - Product inventory system with dual data source support:
- **Google Sheets mode** (recommended): Fetches CSV from published Google Sheet URL
- **Local CSV mode**: Reads from `data/consolidated_inventory.csv`
- Includes search by UPC/item name/department, department filtering, and stock level filtering
- Shows demo data if Google Sheets URL not configured

The inventory system is configured via constants at the top of `js/inventory.js`:
- `DATA_SOURCE`: Set to 'google-sheets' or 'local'
- `GOOGLE_SHEET_CSV_URL`: Published CSV URL from Google Sheets
- `LOW_STOCK_THRESHOLD`: Quantity level for "Low Stock" badge (default: 5)
- `LOCAL_CSV_PATH`: Path to local CSV file (default: 'data/inventory.csv')

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
Edit the `<nav class="main-nav">` section in all 6 HTML files. The structure must match across all pages for consistent experience.

### Changing Color Scheme
Edit CSS variables in `css/styles.css:6-49`. All colors throughout the site reference these variables.

### Configuring Google Sheets Inventory

**Option 1: Single Consolidated Sheet (Recommended)**
1. Create a new Google Sheet
2. Add columns: UPC, Item Name, Department, Remaining, Sales Price
3. Copy data from `data/consolidated_inventory.csv` or manually enter
4. File > Share > Publish to web > Select "Comma-separated values (.csv)" format
5. Copy the published URL
6. Update `GOOGLE_SHEET_CSV_URL` in `js/inventory.js:48`

**Option 2: Multiple Tabs (Advanced)**
If you want to keep departments in separate tabs:
1. Create Google Sheet with one tab per department
2. Each tab should have the same 5 columns
3. You'll need to modify `js/inventory.js` to fetch and merge multiple CSV URLs
4. Or use Google Sheets IMPORTRANGE to consolidate tabs into one master sheet

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
- **Shared Header/Footer**: Changes to navigation/footer must be replicated across all 6 HTML files.
- **Mobile-First**: Always test responsive behavior when making layout changes.
- **Browser Compatibility**: Support modern browsers (Chrome, Firefox, Safari, Edge). No IE11 support needed.
