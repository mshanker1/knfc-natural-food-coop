/**
 * KNFC Website - Inventory Management
 * Kent Natural Foods Co-op
 *
 * This script handles loading and displaying inventory data.
 * It supports two data sources:
 * 1. Google Sheets (published as CSV) - RECOMMENDED
 * 2. Local CSV file
 *
 * SETUP INSTRUCTIONS:
 * ===================
 *
 * OPTION 1: Google Sheets (Recommended for easy updates)
 * -------------------------------------------------------
 * 1. Create a Google Sheet with your inventory
 * 2. Format with columns: Product Name, Category, Brand, Price, Quantity, Last Updated
 * 3. Go to File > Share > Publish to web
 * 4. Select "Comma-separated values (.csv)" format
 * 5. Copy the published URL
 * 6. Replace GOOGLE_SHEET_CSV_URL below with your URL
 *
 * OPTION 2: Local CSV File
 * ------------------------
 * 1. Export inventory CSV from your POS system
 * 2. Save as "inventory.csv" in the /data folder
 * 3. Make sure DATA_SOURCE is set to 'local'
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

// Choose data source: 'google-sheets' or 'local'
const DATA_SOURCE = 'google-sheets';

// Google Sheets published CSV URL (if using Google Sheets)
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRY8hzrs7gEjN6IO2_g6l5oRQYRkF4kwK6cqx5ciclY80v4JqNC5a9XQdAnkD9BeW-BTnKDQkTVWL6Z/pub?output=csv';

// Local CSV file path (if using local file)
const LOCAL_CSV_PATH = 'data/consolidated_inventory.csv';

// Stock level thresholds
const LOW_STOCK_THRESHOLD = 5;  // Show "Low Stock" when quantity is at or below this

// ============================================
// END CONFIGURATION
// ============================================

// Store for inventory data
let inventoryData = [];

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

        if (DATA_SOURCE === 'google-sheets') {
            // Check if URL has been configured
            if (GOOGLE_SHEET_CSV_URL === 'YOUR_GOOGLE_SHEETS_PUBLISHED_CSV_URL_HERE') {
                // Show demo data if not configured
                showDemoData();
                return;
            }
            csvText = await fetchGoogleSheet();
        } else {
            csvText = await fetchLocalCSV();
        }

        inventoryData = parseCSV(csvText);
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
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    const products = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length >= 5) {
            const product = {
                upc: values[0] || '',
                name: values[1] || '',
                department: values[2] || 'Uncategorized',
                quantity: parseInt(values[3]) || 0,
                price: parsePrice(values[4])
            };

            // Only add products with a name
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
    return '$' + price.toFixed(2);
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
    const departments = [...new Set(inventoryData.map(p => p.department))].sort();

    categoryFilter.innerHTML = '<option value="">All Departments</option>';
    departments.forEach(dept => {
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
    tableBodyEl.innerHTML = '';

    if (products.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" style="text-align: center; padding: 2rem;">No products found matching your search.</td>';
        tableBodyEl.appendChild(row);
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        const status = getStockStatus(product.quantity);

        row.innerHTML = `
            <td>${escapeHtml(product.upc)}</td>
            <td><strong>${escapeHtml(product.name)}</strong></td>
            <td>${escapeHtml(product.department)}</td>
            <td>${product.quantity}</td>
            <td>${formatPrice(product.price)}</td>
        `;

        tableBodyEl.appendChild(row);
    });

    // Update last updated text
    if (inventoryData.length > 0 && inventoryData[0].lastUpdated) {
        lastUpdatedEl.textContent = `Last updated: ${inventoryData[0].lastUpdated}`;
    } else {
        lastUpdatedEl.textContent = `Showing ${products.length} of ${inventoryData.length} products`;
    }
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

    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.upc.toLowerCase().includes(searchTerm) ||
            product.department.toLowerCase().includes(searchTerm)
        );
    }

    // Filter by department
    if (selectedCategory) {
        filtered = filtered.filter(product => product.department === selectedCategory);
    }

    // Filter by stock status
    if (selectedStock) {
        filtered = filtered.filter(product => {
            const status = getStockStatus(product.quantity);
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
