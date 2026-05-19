/**
 * KNFC Website - Dynamic Content
 * Kent Natural Foods Co-op
 *
 * Loads four content types from various sources:
 *   - Announcements  → homepage bulletin board
 *   - Sales Flyer    → PDF embed on products page
 *   - Staff Picks    → department highlights on products page
 *   - Education      → learn & explore resources on products page
 *
 * SETUP OPTIONS:
 * ==============
 *
 * OPTION 1: Google Drive Folder (RECOMMENDED - same folder as inventory)
 * ----------------------------------------------------------------------
 * Use the same Google Drive folder and Apps Script setup as inventory.js
 * Simply drop these CSV files into your folder:
 *   - announcements.csv
 *   - sales.csv
 *   - highlights.csv
 *   - education.csv
 *
 * Steps:
 * 1. Ensure you've completed the Google Apps Script setup (see google-apps-script/SETUP.md)
 * 2. Upload the CSV files to your Google Drive folder
 * 3. Set CONTENT_SOURCE = 'google-drive-folder'
 * 4. Set GOOGLE_DRIVE_API_URL to your deployed script URL (same as in inventory.js)
 *
 * OPTION 2: Google Sheets (Alternative - separate sheet URLs)
 * ------------------------------------------------------------
 * 1. Create one Google Spreadsheet with four tabs named:
 *    Announcements | Sales | Highlights | Education
 * 2. For each tab: File > Share > Publish to web > select that tab > CSV > Publish
 * 3. Copy each published URL and paste it into the GS_* constants below
 * 4. Set CONTENT_SOURCE = 'google-sheets'
 *
 * OPTION 3: Local Files (Development only)
 * ----------------------------------------
 * 1. Place CSV files in /data folder
 * 2. Set CONTENT_SOURCE = 'local'
 *
 * SALES FLYER PDF:
 * ================
 * 1. Upload your flyer PDF to Google Drive
 * 2. Right-click > Share > Anyone with the link can view
 * 3. Copy the share link (looks like: drive.google.com/file/d/FILEID/view)
 * 4. Paste that link into the PDF_URL column of the Sales CSV
 */

// ============================================
// CONFIGURATION — edit these values
// ============================================

// Choose: 'google-drive-folder', 'google-sheets', or 'local'
const CONTENT_SOURCE = 'google-drive-folder';

// Google Drive Folder API URL (if using 'google-drive-folder' mode)
// This should be the SAME URL as GOOGLE_DRIVE_API_URL in inventory.js
// Example: https://script.google.com/macros/s/AKfycby.../exec
const GOOGLE_DRIVE_API_URL = 'https://script.google.com/macros/s/AKfycbxlaUGtMKwCjZH51G9GqIm9lFlTcnINQONQIx2guAptAchKlc17EZLvuLsj5KfspCaj/exec';

// Filenames in the Google Drive folder (if using 'google-drive-folder' mode)
const FILENAME_ANNOUNCEMENTS = 'announcements.csv';
const FILENAME_SALES         = 'sales.csv';
const FILENAME_HIGHLIGHTS    = 'highlights.csv';
const FILENAME_EDUCATION     = 'education.csv';

// Local CSV paths (if using 'local' mode - for demo / development)
const LOCAL_ANNOUNCEMENTS = 'data/announcements.csv';
const LOCAL_SALES         = 'data/sales.csv';
const LOCAL_HIGHLIGHTS    = 'data/highlights.csv';
const LOCAL_EDUCATION     = 'data/education.csv';

// Google Sheets published CSV URLs (if using 'google-sheets' mode)
const GS_ANNOUNCEMENTS = 'YOUR_ANNOUNCEMENTS_TAB_CSV_URL';
const GS_SALES         = 'YOUR_SALES_TAB_CSV_URL';
const GS_HIGHLIGHTS    = 'YOUR_HIGHLIGHTS_TAB_CSV_URL';
const GS_EDUCATION     = 'YOUR_EDUCATION_TAB_CSV_URL';

// ============================================
// END CONFIGURATION
// ============================================

/**
 * Determine the URL/path to fetch content based on source type
 * For google-drive-folder mode, we'll handle this differently in fetchCSV
 */
function contentUrl(local, gs, driveFilename) {
    if (CONTENT_SOURCE === 'google-drive-folder') {
        return driveFilename; // Return just the filename, fetchCSV will handle the rest
    }
    return CONTENT_SOURCE === 'google-sheets' ? gs : local;
}

// ============================================
// CSV UTILITIES
// ============================================

/**
 * Fetch CSV from the configured source
 * If using google-drive-folder mode, path is the filename and we construct the API URL
 */
async function fetchCSV(path) {
    let url = path;

    // If using Google Drive folder mode, construct the API URL
    if (CONTENT_SOURCE === 'google-drive-folder') {
        if (GOOGLE_DRIVE_API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            throw new Error('Google Drive API URL not configured. See google-apps-script/SETUP.md');
        }
        url = `${GOOGLE_DRIVE_API_URL}?file=${encodeURIComponent(path)}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not fetch ${path} (${res.status})`);
    return res.text();
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    return lines.slice(1)
        .map(line => {
            const vals = parseCSVLine(line);
            const row = {};
            headers.forEach((h, i) => {
                row[h] = (vals[i] || '').replace(/^"|"$/g, '').trim();
            });
            return row;
        })
        .filter(row => Object.values(row).some(v => v !== ''));
}

function parseCSVLine(line) {
    const values = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { values.push(cur); cur = ''; }
        else { cur += ch; }
    }
    values.push(cur);
    return values;
}

// Escape text for safe HTML insertion
function esc(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Only allow http/https URLs — reject javascript:, data:, etc.
function safeUrl(raw) {
    const u = (raw || '').trim();
    return (u.startsWith('https://') || u.startsWith('http://')) ? u : '';
}

// Detect unfilled placeholder values in the CSV templates
function isPlaceholder(str) {
    return !str || str.includes('YOUR_') || str.includes('REPLACE_') || str === '#';
}

// Convert a Google Drive share URL to an embeddable preview URL
function driveEmbedUrl(shareUrl) {
    if (shareUrl.includes('drive.google.com/file/d/')) {
        return shareUrl.replace(/\/(view|edit)(\?.*)?$/, '/preview');
    }
    return shareUrl;
}

// ============================================
// ANNOUNCEMENTS
// Targets: #announcement-cards on index.html
// CSV columns: Title | Body | Date | Category | Active
// ============================================

async function loadAnnouncements() {
    const container = document.getElementById('announcement-cards');
    if (!container) return;

    try {
        const rows = parseCSV(await fetchCSV(contentUrl(LOCAL_ANNOUNCEMENTS, GS_ANNOUNCEMENTS, FILENAME_ANNOUNCEMENTS)))
            .filter(r => (r.Active || '').toLowerCase() === 'yes')
            .sort((a, b) => new Date(b.Date) - new Date(a.Date))
            .slice(0, 3);

        if (!rows.length) {
            container.innerHTML = '<p class="no-content">No announcements right now. Check back soon!</p>';
            return;
        }

        container.innerHTML = rows.map(r => `
            <article class="announcement-card">
                <div class="announcement-meta">
                    <span class="announcement-date">${esc(r.Date)}</span>
                    ${r.Category ? `<span class="announcement-badge cat-${esc(r.Category.toLowerCase())}">${esc(r.Category)}</span>` : ''}
                </div>
                <h3>${esc(r.Title)}</h3>
                <p>${esc(r.Body)}</p>
            </article>
        `).join('');

    } catch (e) {
        console.error('Announcements error:', e);
        container.innerHTML = '<p class="no-content">Unable to load announcements.</p>';
    }
}

// ============================================
// SALES FLYER — PDF EMBED
// Targets: #sales-flyer-container on products.html
// CSV columns: Title | PDF_URL | Start_Date | End_Date | Active
//
// PDF_URL should be a Google Drive share link:
//   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
// The script converts it to an embeddable /preview URL automatically.
// ============================================

async function loadSalesFlyer() {
    const container = document.getElementById('sales-flyer-container');
    if (!container) return;

    try {
        console.log('Loading sales flyer...');
        const csvText = await fetchCSV(contentUrl(LOCAL_SALES, GS_SALES, FILENAME_SALES));
        console.log('Sales CSV fetched:', csvText.substring(0, 100));
        const rows = parseCSV(csvText)
            .filter(r => (r.Active || '').toLowerCase() === 'yes');
        console.log('Sales rows:', rows);

        if (!rows.length) {
            container.innerHTML = '<p class="no-content">No active sales flyer right now. Check back soon!</p>';
            return;
        }

        const flyer = rows[0];
        const rawUrl = flyer.PDF_URL || '';
        const pdfUrl = safeUrl(rawUrl);

        // Show a placeholder card if the URL hasn't been filled in yet
        if (isPlaceholder(rawUrl) || !pdfUrl) {
            container.innerHTML = `
                <div class="flyer-placeholder">
                    <div class="flyer-placeholder-icon">&#128240;</div>
                    <h3>${esc(flyer.Title || 'Sales Flyer')}</h3>
                    ${flyer.End_Date ? `<p>Valid through <strong>${esc(flyer.End_Date)}</strong></p>` : ''}
                    <p class="placeholder-note">
                        To display the flyer: upload your PDF to Google Drive, set sharing to
                        "Anyone with the link," then paste the share URL into the
                        <code>PDF_URL</code> column of the <code>sales.csv</code> file
                        (or the Sales tab in your Google Sheet).
                    </p>
                </div>
            `;
            return;
        }

        const embedUrl = driveEmbedUrl(pdfUrl);
        container.innerHTML = `
            <div class="flyer-header">
                <div class="flyer-header-text">
                    <h3>${esc(flyer.Title)}</h3>
                    ${flyer.End_Date ? `<p class="flyer-dates">Valid through ${esc(flyer.End_Date)}</p>` : ''}
                </div>
                <a href="${pdfUrl}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
                    Open Full Flyer &#8599;
                </a>
            </div>
            <div class="pdf-embed-wrapper">
                <iframe src="${embedUrl}"
                        class="sales-pdf-embed"
                        loading="lazy"
                        title="Sales Flyer — ${esc(flyer.Title)}"></iframe>
            </div>
        `;

    } catch (e) {
        console.error('Sales flyer error:', e);
        container.innerHTML = '<p class="no-content">Unable to load sales flyer.</p>';
    }
}

// ============================================
// STAFF PICKS / DEPARTMENT HIGHLIGHTS
// Targets: #staff-picks-container on products.html
// CSV columns: Department | Item_Name | Description | Why_We_Love_It | Active
// ============================================

async function loadHighlights() {
    const container = document.getElementById('staff-picks-container');
    if (!container) return;

    try {
        console.log('Loading highlights...');
        const csvText = await fetchCSV(contentUrl(LOCAL_HIGHLIGHTS, GS_HIGHLIGHTS, FILENAME_HIGHLIGHTS));
        console.log('Highlights CSV fetched:', csvText.substring(0, 100));
        const rows = parseCSV(csvText)
            .filter(r => (r.Active || '').toLowerCase() === 'yes');
        console.log('Highlights rows:', rows);

        if (!rows.length) {
            const section = container.closest('.staff-picks-section');
            if (section) section.style.display = 'none';
            return;
        }

        container.innerHTML = rows.map(r => `
            <div class="highlight-card">
                <span class="highlight-dept">${esc(r.Department)}</span>
                <h4>${esc(r.Item_Name)}</h4>
                <p>${esc(r.Description)}</p>
                ${r.Why_We_Love_It ? `<p class="why-love">&#10084;&nbsp;${esc(r.Why_We_Love_It)}</p>` : ''}
            </div>
        `).join('');

    } catch (e) {
        console.error('Highlights error:', e);
        const section = container.closest('.staff-picks-section');
        if (section) section.style.display = 'none';
    }
}

// ============================================
// EDUCATIONAL CONTENT
// Targets: #education-container on products.html
// CSV columns: Title | Description | Category | Link | Date | Active
//
// Link can be a Google Doc published URL, a PDF link, or any https:// URL.
// Leave Link blank to show the card without a button.
// ============================================

async function loadEducation() {
    const container = document.getElementById('education-container');
    if (!container) return;

    try {
        console.log('Loading education...');
        const csvText = await fetchCSV(contentUrl(LOCAL_EDUCATION, GS_EDUCATION, FILENAME_EDUCATION));
        console.log('Education CSV fetched:', csvText.substring(0, 100));
        const rows = parseCSV(csvText)
            .filter(r => (r.Active || '').toLowerCase() === 'yes')
            .sort((a, b) => new Date(b.Date) - new Date(a.Date));
        console.log('Education rows:', rows);

        if (!rows.length) {
            const section = container.closest('.education-section');
            if (section) section.style.display = 'none';
            return;
        }

        container.innerHTML = rows.map(r => {
            const link = safeUrl(r.Link);
            return `
                <div class="education-card">
                    <div class="education-meta">
                        <span class="edu-category">${esc(r.Category)}</span>
                        <span class="edu-date">${esc(r.Date)}</span>
                    </div>
                    <h4>${esc(r.Title)}</h4>
                    <p>${esc(r.Description)}</p>
                    ${link ? `<a href="${link}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Read More &#8599;</a>` : ''}
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error('Education error:', e);
        const section = container.closest('.education-section');
        if (section) section.style.display = 'none';
    }
}

// ============================================
// INIT — runs all loaders on page load
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    loadAnnouncements();
    loadSalesFlyer();
    loadHighlights();
    loadEducation();
});
