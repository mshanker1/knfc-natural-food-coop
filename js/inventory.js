/**
 * KNFC Website - Inventory Management
 * Kent Natural Foods Co-op
 *
 * This script handles loading and displaying inventory data.
 * It supports multiple data sources:
 * 1. Google Drive Folder (RECOMMENDED) - Single folder, drop files by name
 * 2. Google Sheets (published as CSV) - Alternative option
 * 3. Local CSV file - For development/testing
 *
 * SETUP INSTRUCTIONS:
 * ===================
 *
 * OPTION 1: Google Drive Folder (RECOMMENDED - Simplest for buyers)
 * ------------------------------------------------------------------
 * This is the BEST method - create ONE folder and drop files in by name!
 *
 * BENEFITS:
 * - Only configure once (one folder for all files)
 * - Buyers just upload/replace files by name (inventory.csv, sales.csv, etc.)
 * - No file IDs to track - just use consistent filenames
 * - Can add more CSV files without reconfiguring website
 *
 * SETUP (see google-apps-script/SETUP.md for detailed instructions):
 * 1. Create a Google Drive folder
 * 2. Upload CSV files to the folder (inventory.csv, sales.csv, etc.)
 * 3. Deploy the Google Apps Script proxy (see SETUP.md)
 * 4. Copy the deployed web app URL
 * 5. Set DATA_SOURCE = 'google-drive-folder'
 * 6. Set GOOGLE_DRIVE_API_URL to your deployed script URL
 *
 * TO UPDATE INVENTORY (buyers):
 * 1. Edit inventory in Excel/Sheets/etc
 * 2. Save as CSV with same filename (inventory.csv)
 * 3. Upload to Google Drive folder (replace existing file)
 * 4. Done! Website updates automatically
 *
 * OPTION 2: Google Sheets (Alternative - requires publish step each time)
 * -----------------------------------------------------------------------
 * 1. Create a Google Sheet with your inventory
 * 2. Format with columns: UPC, Item Name, Department, Remaining, Sales Price
 * 3. Go to File > Share > Publish to web
 * 4. Select "Comma-separated values (.csv)" format
 * 5. Copy the published URL
 * 6. Set DATA_SOURCE = 'google-sheets'
 * 7. Set GOOGLE_SHEET_CSV_URL to the published URL
 *
 * OPTION 3: Local CSV File (Development/Testing only)
 * ---------------------------------------------------
 * 1. Export inventory CSV from your POS system
 * 2. Save as "inventory.csv" in the /data folder
 * 3. Set DATA_SOURCE = 'local'
 * 4. Set LOCAL_CSV_PATH to your file path
 *
 * CSV FORMAT:
 * -----------
 * Your CSV should have these columns (in order):
 * - UPC (required)
 * - Item Name (required)
 * - Department (required)
 * - Remaining (required, number for stock quantity)
 * - Sales Price (required, format: 4.99 or $4.99)
 */

// ============================================
// CONFIGURATION - Edit these values
// ============================================

// Choose data source: 'google-drive-folder', 'google-sheets', or 'local'
const DATA_SOURCE = 'google-drive-folder';

// Google Drive Folder API URL (if using 'google-drive-folder' mode)
// This is the URL of your deployed Google Apps Script web app
// Example: https://script.google.com/macros/s/AKfycby.../exec
// See google-apps-script/SETUP.md for setup instructions
const GOOGLE_DRIVE_API_URL = 'https://script.google.com/macros/s/AKfycbzSiv-B5YKTu69THHDDZsBuRlvHNeiaavyigJNTPwu_uo98RPkoGHz5SBCzxBwHF0Cp/exec';

// Filename for inventory in the Google Drive folder (if using 'google-drive-folder' mode)
const INVENTORY_FILENAME = 'inventory.csv';

// CSV URL from Google Sheets (if using 'google-sheets' mode)
// Example: https://docs.google.com/spreadsheets/d/e/.../pub?output=csv
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRY8hzrs7gEjN6IO2_g6l5oRQYRkF4kwK6cqx5ciclY80v4JqNC5a9XQdAnkD9BeW-BTnKDQkTVWL6Z/pub?output=csv';

// Local CSV file path (if using 'local' mode - for development/testing)
const LOCAL_CSV_PATH = 'data/consolidated_inventory.csv';

// Stock level thresholds
const LOW_STOCK_THRESHOLD = 5;  // Show "Low Stock" when quantity is at or below this

// ============================================
// END CONFIGURATION
// ============================================

// ============================================
// DEPARTMENT MAPPING
// Maps raw POS department names → broader
// display categories shown in the filter.
// Built from actual inventory.csv department
// names — add new POS names here as needed.
// ============================================
const DEPARTMENT_MAP = {
    // ── TEA ──────────────────────────────────
    'Tea boxed':             'Tea',
    'Boxed Tea':             'Tea',   // CBD tea products

    // ── COFFEE ───────────────────────────────
    'Alt coffee':            'Coffee',
    'Pkg coffee':            'Coffee',
    'Rtd coffee':            'Coffee',
    'Bulk coffee':           'Coffee',

    // ── JUICE & WATER ────────────────────────
    'Fruit juice':           'Juice & Water',
    'Veggie juice':          'Juice & Water',
    'Coconut water':         'Juice & Water',
    'Bottled water':         'Juice & Water',
    'single serv juice':     'Juice & Water',
    'Aloe':                  'Juice & Water',

    // ── BEVERAGES ────────────────────────────
    'Beverages':             'Beverages',
    'Beverages ':            'Beverages',  // POS trailing-space variant
    'Milk':                  'Beverages',  // dairy & plant-based milks
    'Soda':                  'Beverages',
    'Kombucha':              'Beverages',
    'Iced tea':              'Beverages',
    'Energy':                'Beverages',
    'Cbd':                   'Beverages',  // CBD sparkling waters

    // ── DAIRY & EGGS ─────────────────────────
    'Dairy':                 'Dairy & Eggs',
    'Cheese':                'Dairy & Eggs',
    'Yogurt':                'Dairy & Eggs',
    'Yogurt/kefir':          'Dairy & Eggs',
    'Butter':                'Dairy & Eggs',
    'Eggs':                  'Dairy & Eggs',

    // ── GROCERY & PANTRY ─────────────────────
    'Pantry':                'Grocery & Pantry',
    'Condiments':            'Grocery & Pantry',
    'Cooking oil':           'Grocery & Pantry',
    'Sweeteners':            'Grocery & Pantry',
    'Beans':                 'Grocery & Pantry',
    'Broth':                 'Grocery & Pantry',
    'Soup':                  'Grocery & Pantry',
    'Soup can':              'Grocery & Pantry',
    'Soup dried':            'Grocery & Pantry',
    'Sauces':                'Grocery & Pantry',
    'Gravy':                 'Grocery & Pantry',
    'Seasoning':             'Grocery & Pantry',
    'Canned':                'Grocery & Pantry',
    'Canned ':               'Grocery & Pantry',  // POS trailing-space variant
    'Dressing':              'Grocery & Pantry',
    'Salsa':                 'Grocery & Pantry',
    'Fruit Spread':          'Grocery & Pantry',
    'Pickles':               'Grocery & Pantry',
    'Mayo':                  'Grocery & Pantry',
    'Cultured':              'Grocery & Pantry',
    'Refrigerated':          'Grocery & Pantry',
    'Seaweed':               'Grocery & Pantry',
    'Savory Spread':         'Grocery & Pantry',
    'Fruit':                 'Grocery & Pantry',
    'Herbs/spices':          'Grocery & Pantry',
    'Dried':                 'Grocery & Pantry',  // dried culinary mushrooms etc.

    // ── BREAD, GRAINS & PASTA ────────────────
    'Bread':                 'Bread, Grains & Pasta',
    'Bakery':                'Bread, Grains & Pasta',
    'Bakery ':               'Bread, Grains & Pasta',  // POS trailing-space variant
    'Tortillas':             'Bread, Grains & Pasta',
    'Pasta':                 'Bread, Grains & Pasta',
    'Flour/mixes':           'Bread, Grains & Pasta',
    'Cereal':                'Bread, Grains & Pasta',
    'Granola':               'Bread, Grains & Pasta',
    'Crackers':              'Bread, Grains & Pasta',
    'Gluten Free':           'Bread, Grains & Pasta',
    'Grain products':        'Bread, Grains & Pasta',

    // ── SNACKS & SWEETS ──────────────────────
    'Salty Snacks':          'Snacks & Sweets',
    'Candy':                 'Snacks & Sweets',
    'Chocolate':             'Snacks & Sweets',
    'Cookies':               'Snacks & Sweets',
    'Snack Bars':            'Snacks & Sweets',
    'Baked treats':          'Snacks & Sweets',
    'Nut butter':            'Snacks & Sweets',
    'Nuts/seeds':            'Snacks & Sweets',
    'Dried fruit':           'Snacks & Sweets',
    'Gum':                   'Snacks & Sweets',

    // ── FROZEN FOODS ─────────────────────────
    'Frozen':                'Frozen Foods',
    'Frozen fruit':          'Frozen Foods',
    'Ice cream':             'Frozen Foods',
    'Non-Dairy':             'Frozen Foods',
    'Non-Dairy ':            'Frozen Foods',  // POS trailing-space variant
    'Dinner':                'Frozen Foods',
    'Pizza Non-Dairy Wheat': 'Frozen Foods',
    'Pizza Dairy & Wheat':   'Frozen Foods',
    'Treats':                'Frozen Foods',

    // ── MEAT, FISH & PROTEIN ─────────────────
    // Jerky + Meat Substitute both map here so
    // all jerky (animal & vegan) shows together.
    'Meat':                  'Meat, Fish & Protein',
    'Local meat':            'Meat, Fish & Protein',
    'Fish':                  'Meat, Fish & Protein',
    'Meat Substitute':       'Meat, Fish & Protein',
    'Burgers':               'Meat, Fish & Protein',
    'Tofu':                  'Meat, Fish & Protein',
    'Jerky':                 'Meat, Fish & Protein',

    // ── SUPPLEMENTS & VITAMINS ───────────────
    'Supplements':           'Supplements & Vitamins',
    'Supplement':            'Supplements & Vitamins',
    'Minerals':              'Supplements & Vitamins',
    'Vitamin D':             'Supplements & Vitamins',
    'Vitamin B':             'Supplements & Vitamins',
    'Vitamin C':             'Supplements & Vitamins',
    'Multi':                 'Supplements & Vitamins',
    'Homeopathic':           'Supplements & Vitamins',
    'Herbal capsules':       'Supplements & Vitamins',
    'Herbal tinctures':      'Supplements & Vitamins',
    'Probiotic enzymes':     'Supplements & Vitamins',
    'Protein drinks':        'Supplements & Vitamins',
    'Protein powder':        'Supplements & Vitamins',
    'Cold & flu':            'Supplements & Vitamins',
    'Kratom':                'Supplements & Vitamins',
    'Topical':               'Supplements & Vitamins',
    'Lotion/Balm/Cream':     'Supplements & Vitamins',
    'mushroom':              'Supplements & Vitamins',  // mushroom supplements (POS lowercase)
    'Children':              'Supplements & Vitamins',

    // ── PERSONAL CARE & BEAUTY ───────────────
    'Personal Care':         'Personal Care & Beauty',
    'Skin care':             'Personal Care & Beauty',
    'Hair care':             'Personal Care & Beauty',
    'Oral Care':             'Personal Care & Beauty',
    'Bar Soap/Hand':         'Personal Care & Beauty',
    'Cosmetics':             'Personal Care & Beauty',
    'Deodorant':             'Personal Care & Beauty',
    'Shaving':               'Personal Care & Beauty',
    'Bathroom':              'Personal Care & Beauty',
    'Feminine':              'Personal Care & Beauty',
    'Baby skin':             'Personal Care & Beauty',
    'Baby food':             'Personal Care & Beauty',
    'Baby':                  'Personal Care & Beauty',

    // ── ESSENTIAL OILS & AROMATHERAPY ────────
    'Essential oil':         'Essential Oils & Aromatherapy',
    'Incense/aroma':         'Essential Oils & Aromatherapy',

    // ── HOME, KITCHEN & GARDEN ───────────────
    'Home goods':            'Home, Kitchen & Garden',
    'Kitchen':               'Home, Kitchen & Garden',
    'Kitchen gadgets':       'Home, Kitchen & Garden',
    'Laundry':               'Home, Kitchen & Garden',
    'Cleaning':              'Home, Kitchen & Garden',
    'Disposable':            'Home, Kitchen & Garden',
    'Disposable ':           'Home, Kitchen & Garden',  // POS trailing-space variant
    'Pest control':          'Home, Kitchen & Garden',
    'Empty storage containers': 'Home, Kitchen & Garden',
    'Garden seeds':          'Home, Kitchen & Garden',
    'Totes':                 'Home, Kitchen & Garden',
    'Apparel':               'Home, Kitchen & Garden',
    'Hosiery':               'Home, Kitchen & Garden',
    'Jewelry':               'Home, Kitchen & Garden',
    'T-shirt':               'Home, Kitchen & Garden',
    'Toys':                  'Home, Kitchen & Garden',
    'Travel lunch':          'Home, Kitchen & Garden',
    'Pet Food':              'Home, Kitchen & Garden',
    'Pet Care':              'Home, Kitchen & Garden',
    'Pet':                   'Home, Kitchen & Garden',

    // ── FRESH PRODUCE ────────────────────────
    'Fresh':                 'Fresh Produce',
    'Fresh fruit':           'Fresh Produce',
};

function mapDepartment(rawDept) {
    // Trim whitespace first to handle POS trailing-space variants
    const trimmed = (rawDept || '').trim();
    return DEPARTMENT_MAP[trimmed] || DEPARTMENT_MAP[rawDept] || trimmed;
}

// Store for inventory data
let inventoryData = [];
// Pagination/config
const ITEMS_PER_PAGE = 20;
let currentPage = 1;
let currentFilteredProducts = [];
let fetchedAt = null; // set when inventory data is successfully loaded

// DOM Elements
const loadingEl = document.getElementById('loading');
const tableEl = document.getElementById('inventory-table');
const tableBodyEl = document.getElementById('inventory-body');
const searchInput = document.getElementById('product-search');
const categoryFilter = document.getElementById('category-filter');
const stockFilter = document.getElementById('stock-filter');
const lastUpdatedEl = document.getElementById('last-updated');

/**
 * Initialize inventory when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    if (tableEl) {
        loadInventory();
    }
});

/**
 * Load inventory data from configured source
 */
async function loadInventory() {
    try {
        let csvText;

        if (DATA_SOURCE === 'google-drive-folder') {
            if (GOOGLE_DRIVE_API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
                showError('Google Drive folder not configured. Please see google-apps-script/SETUP.md');
                return;
            }
            csvText = await fetchFromDriveFolder(INVENTORY_FILENAME);
        } else if (DATA_SOURCE === 'google-sheets') {
            if (GOOGLE_SHEET_CSV_URL === 'YOUR_GOOGLE_SHEETS_PUBLISHED_CSV_URL_HERE') {
                showError('Google Sheets URL not configured. Please update GOOGLE_SHEET_CSV_URL.');
                return;
            }
            csvText = await fetchGoogleSheet();
        } else {
            csvText = await fetchLocalCSV();
        }

        inventoryData = parseCSV(csvText);
        fetchedAt = new Date();
        populateCategories();
        renderInventory(inventoryData);
        setupFilters();
        showTable();

    } catch (error) {
        console.error('Error loading inventory:', error);
        showError('Unable to load inventory. Please try again later.');
    }
}

/**
 * Fetch data from Google Drive folder via Apps Script proxy
 */
async function fetchFromDriveFolder(filename) {
    const url = `${GOOGLE_DRIVE_API_URL}?file=${encodeURIComponent(filename)}`;
    const response = await fetch(url);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch from Google Drive: ${errorText}`);
    }

    return await response.text();
}

/**
 * Fetch data from Google Sheets
 */
async function fetchGoogleSheet() {
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) {
        throw new Error('Failed to fetch Google Sheet');
    }
    return await response.text();
}

/**
 * Fetch data from local CSV file
 */
async function fetchLocalCSV() {
    const response = await fetch(LOCAL_CSV_PATH);
    if (!response.ok) {
        throw new Error('Failed to fetch local CSV');
    }
    return await response.text();
}

/**
 * Parse CSV text into array of objects
 * Expected columns: UPC, Item Name, Department, Remaining, Sales Price
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const products = [];

    // Skip header line, start from line 1
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple split by comma (our test CSV has no quoted values)
        const parts = line.split(',');

        if (parts.length >= 5) {
            // Map CSV columns to object properties
            // CSV: UPC, Item Name, Department, Remaining, Sales Price
            // Object: upc, name, department, quantity, price
            const product = {
                upc: parts[0].trim(),
                name: parts[1].trim(),
                department: parts[2].trim(),
                quantity: parseInt(parts[3].trim()) || 0,
                price: parsePrice(parts[4].trim())
            };

            if (product.name) {
                products.push(product);
            }
        }
    }

    return products;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

/**
 * Parse price string to number
 */
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    // Remove $ and other non-numeric characters except .
    const cleaned = priceStr.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
}

/**
 * Format price for display
 */
function formatPrice(price) {
    // Handle undefined, null, or non-numeric values
    if (price === undefined || price === null || isNaN(price)) {
        return '$0.00';
    }
    return '$' + Number(price).toFixed(2);
}

/**
 * Get stock status based on quantity
 */
function getStockStatus(quantity) {
    if (quantity <= 0) {
        return { text: 'Out of Stock', class: 'out-of-stock' };
    } else if (quantity <= LOW_STOCK_THRESHOLD) {
        return { text: 'Low Stock', class: 'low-stock' };
    } else {
        return { text: 'In Stock', class: 'in-stock' };
    }
}

/**
 * Populate department filter dropdown
 */
function populateCategories() {
    // Map raw department names to broader display categories, then deduplicate
    const displayDepts = [...new Set(inventoryData.map(p => {
        const raw = p.department || p.Department || p['Department'] || 'Uncategorized';
        return mapDepartment(raw);
    }))].sort();

    categoryFilter.innerHTML = '<option value="">All Departments</option>';
    displayDepts.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        categoryFilter.appendChild(option);
    });
}

/**
 * Render inventory table
 */
function renderInventory(products) {
    // Always exclude zero-stock items regardless of how this is called
    currentFilteredProducts = (products || []).filter(product => {
        const qty = product.quantity || parseInt(product.Remaining || product['Remaining'] || 0);
        return qty > 0;
    });
    currentPage = 1;
    renderPage();
}

/**
 * Render the current page of products (pagination)
 */
function renderPage() {
    tableBodyEl.innerHTML = '';

    if (!currentFilteredProducts || currentFilteredProducts.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" style="text-align: center; padding: 2rem;">No products found matching your search.</td>';
        tableBodyEl.appendChild(row);
        renderPaginationControls();
        setLastUpdated('Showing 0 of ' + inventoryData.length + ' products');
        return;
    }

    const total = currentFilteredProducts.length;
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, total);
    const pageItems = currentFilteredProducts.slice(startIndex, endIndex);

    pageItems.forEach(product => {
        const row = document.createElement('tr');

        const name = product.name || product['Item Name'] || '';
        const department = product.department || product.Department || product['Department'] || '';
        const quantity = product.quantity || parseInt(product.Remaining || product['Remaining'] || 0);
        const price = product.price || parsePrice(product['Sales Price'] || product['Sales Price'] || '0');

        row.innerHTML = `
            <td><strong>${escapeHtml(name)}</strong></td>
            <td>${escapeHtml(department)}</td>
            <td>${quantity}</td>
            <td>${formatPrice(price)}</td>
        `;

        tableBodyEl.appendChild(row);
    });

    // Update last updated / range info
    setLastUpdated('Showing ' + (startIndex + 1) + '–' + endIndex + ' of ' + inventoryData.length + ' products');

    renderPaginationControls();
}

/**
 * Render simple pagination controls (Prev / Page X of Y / Next)
 */
function renderPaginationControls() {
    const container = document.getElementById('pagination-controls');
    if (!container) return;

    const total = currentFilteredProducts.length;
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

    container.innerHTML = '';

    const prev = document.createElement('button');
    prev.className = 'btn btn-sm';
    prev.textContent = 'Prev';
    prev.disabled = currentPage <= 1;
    prev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
            // scroll table into view for keyboard users
            document.querySelector('.inventory-table-wrapper').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    const info = document.createElement('div');
    info.className = 'pagination-info';
    info.textContent = `Page ${currentPage} of ${totalPages}`;

    const next = document.createElement('button');
    next.className = 'btn btn-sm';
    next.textContent = 'Next';
    next.disabled = currentPage >= totalPages;
    next.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
            document.querySelector('.inventory-table-wrapper').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    container.appendChild(prev);
    container.appendChild(info);
    container.appendChild(next);
}

/**
 * Setup search and filter event listeners
 */
function setupFilters() {
    // Search input
    searchInput.addEventListener('input', filterProducts);

    // Category filter
    categoryFilter.addEventListener('change', filterProducts);

    // Stock filter
    stockFilter.addEventListener('change', filterProducts);
}

/**
 * Filter products based on current filter values
 */
function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;
    const selectedStock = stockFilter.value;

    let filtered = inventoryData;

    // Filter by search term (search display name, UPC, and mapped dept)
    if (searchTerm) {
        filtered = filtered.filter(product => {
            const name = (product.name || product['Item Name'] || '').toLowerCase();
            const upc = (product.upc || product.UPC || product['UPC'] || '').toLowerCase();
            const rawDept = (product.department || product.Department || product['Department'] || '');
            const dept = mapDepartment(rawDept).toLowerCase();
            return name.includes(searchTerm) || upc.includes(searchTerm) || dept.includes(searchTerm);
        });
    }

    // Filter by department (compare against the mapped/display category name)
    if (selectedCategory) {
        filtered = filtered.filter(product => {
            const raw = product.department || product.Department || product['Department'] || '';
            return mapDepartment(raw) === selectedCategory;
        });
    }

    // Filter by stock status
    if (selectedStock) {
        filtered = filtered.filter(product => {
            const qty = product.quantity || parseInt(product.Remaining || product['Remaining'] || 0);
            const status = getStockStatus(qty);
            return status.class === selectedStock;
        });
    }

    renderInventory(filtered);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Update the last-updated element with an optional timestamp and a count line.
 */
function setLastUpdated(countText) {
    if (!lastUpdatedEl) return;
    var ts = '';
    if (fetchedAt) {
        ts = 'Last refreshed: ' + fetchedAt.toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
        }) + ' at ' + fetchedAt.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit'
        }) + ' · ';
    }
    lastUpdatedEl.textContent = ts + countText;
}

/**
 * Show the inventory table
 */
function showTable() {
    loadingEl.style.display = 'none';
    tableEl.style.display = 'table';
}

/**
 * Show error message
 */
function showError(message) {
    loadingEl.innerHTML = `<p style="color: #dc3545;">${message}</p>`;
}

/**
 * Show demo data when Google Sheets is not configured
 */
function showDemoData() {
    // Sample demo data
    inventoryData = [
        { upc: '024182025064', name: 'Organic Bananas', department: 'Produce', quantity: 50, price: 1.99 },
        { upc: '024182025057', name: 'Whole Wheat Bread', department: 'Bakery', quantity: 12, price: 5.49 },
        { upc: '076950450080', name: 'Organic Whole Milk', department: 'Milk', quantity: 24, price: 6.99 },
        { upc: '076950415331', name: 'Raw Almonds', department: 'Bulk_HB', quantity: 3, price: 12.99 },
        { upc: '076950450172', name: 'Local Honey', department: 'Packaged_Dry', quantity: 15, price: 8.99 },
        { upc: '076950450011', name: 'Organic Eggs', department: 'Milk', quantity: 0, price: 7.49 },
        { upc: '076950450233', name: 'Brown Rice', department: 'Bulk_HB', quantity: 100, price: 2.49 },
        { upc: '076950450462', name: 'Organic Kale', department: 'Produce', quantity: 8, price: 3.99 },
        { upc: '024182181371', name: 'Oat Milk', department: 'Beverage', quantity: 20, price: 4.99 },
        { upc: '788832000084', name: 'Olive Oil', department: 'Packaged_Dry', quantity: 2, price: 14.99 },
        { upc: '782126009005', name: 'Vitamin D3', department: 'Vitamins', quantity: 10, price: 19.99 },
        { upc: '782126008008', name: 'Castile Soap', department: 'Packaged_HB', quantity: 25, price: 11.99 }
    ];

    populateCategories();
    renderInventory(inventoryData);
    setupFilters();
    showTable();

    // Show demo notice
    lastUpdatedEl.innerHTML = '<strong style="color: #856404;">Demo Data:</strong> Configure Google Sheets URL in inventory.js to show real inventory.';
}
