/**
 * KNFC Website — Main JavaScript (v2, May 2026)
 * Kent Natural Foods Co-op · Member-Owned Since 1971
 *
 * Provides shared header + footer markup with the new
 * awning-and-marigold visual identity. Edit STORE_INFO
 * and the sun-mark SVG below; everything else is layout.
 */

// ============================================================================
// STORE INFO — single source of truth
// ============================================================================

const STORE_INFO = {
    phone: '(330) 673-2878',
    email: 'hello@kentnaturalfoods.coop', // TODO: update with real address
    address: {
        street: '151 East Main St.',
        city: 'Kent',
        state: 'OH',
        zip: '44240'
    },
    hours: {
        weekday: '9:00 AM – 8:00 PM',
        saturday: '9:00 AM – 8:00 PM',
        sunday: 'Noon – 6:00 PM'
    },
    foundedYear: 1971,
    social: {
        facebook: 'https://www.facebook.com/kentcoop/',
        instagram: '#'
    }
};

// ============================================================================
// SUN MARK — the inline SVG used in header, footer, and as a brand anchor
// ============================================================================

const SUN_MARK_SVG = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="14" fill="currentColor" />
        <g fill="currentColor">
            <rect x="48" y="6"  width="4" height="14" />
            <rect x="48" y="80" width="4" height="14" />
            <rect x="6"  y="48" width="14" height="4" />
            <rect x="80" y="48" width="14" height="4" />
            <rect x="48" y="6"  width="4" height="14" transform="rotate(45 50 50)" />
            <rect x="48" y="80" width="4" height="14" transform="rotate(45 50 50)" />
            <rect x="48" y="6"  width="4" height="14" transform="rotate(-45 50 50)" />
            <rect x="48" y="80" width="4" height="14" transform="rotate(-45 50 50)" />
            <rect x="48" y="6"  width="4" height="10" transform="rotate(22.5 50 50)" />
            <rect x="48" y="84" width="4" height="10" transform="rotate(22.5 50 50)" />
            <rect x="48" y="6"  width="4" height="10" transform="rotate(-22.5 50 50)" />
            <rect x="48" y="84" width="4" height="10" transform="rotate(-22.5 50 50)" />
            <rect x="48" y="6"  width="4" height="10" transform="rotate(67.5 50 50)" />
            <rect x="48" y="84" width="4" height="10" transform="rotate(67.5 50 50)" />
            <rect x="48" y="6"  width="4" height="10" transform="rotate(-67.5 50 50)" />
            <rect x="48" y="84" width="4" height="10" transform="rotate(-67.5 50 50)" />
        </g>
    </svg>
`;

// Helper — exposed so any page can drop a sun mark inline
window.SUN_MARK_SVG = SUN_MARK_SVG;

// ============================================================================
// Hours / timezone helpers
// ============================================================================

function _nowInTimeZone(timeZone) {
    // Create a Date representing the current time in the given IANA time zone
    // by formatting to a locale string in that zone and parsing back into Date.
    // This is broadly compatible in browsers.
    const parts = new Date().toLocaleString('en-US', { timeZone });
    return new Date(parts);
}

function _parseTimeToMinutes(t) {
    if (!t) return null;
    t = t.trim().toLowerCase();
    if (t === 'noon') return 12 * 60;
    if (t === 'midnight') return 0;
    // match h[:mm] am/pm
    const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
    if (!m) return null;
    let hh = parseInt(m[1], 10);
    const mm = parseInt(m[2] || '0', 10);
    const ampm = m[3];
    if (ampm === 'pm' && hh !== 12) hh += 12;
    if (ampm === 'am' && hh === 12) hh = 0;
    return hh * 60 + mm;
}

function _hoursRangeIncludesNow(hoursRangeStr, timeZone = 'America/New_York') {
    if (!hoursRangeStr) return false;
    const parts = hoursRangeStr.split(/[–-]/).map(s => s.trim());
    if (parts.length < 2) return false;
    const start = _parseTimeToMinutes(parts[0]);
    const end = _parseTimeToMinutes(parts[1]);
    if (start == null || end == null) return false;
    const now = _nowInTimeZone(timeZone);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    // Simple inclusive range check. If end < start assume it passes midnight.
    if (end >= start) {
        return nowMinutes >= start && nowMinutes <= end;
    }
    // crosses midnight
    return nowMinutes >= start || nowMinutes <= end;
}


// ============================================================================
// HEADER
// ============================================================================

function getHeaderHTML() {
    const tel = STORE_INFO.phone.replace(/[^0-9]/g, '');
    // Compute today's hours for the utility ribbon (and whether open now)
    const _today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    let _hoursForToday;
    if (_today === 0) {
        _hoursForToday = STORE_INFO.hours.sunday;
    } else if (_today === 6) {
        _hoursForToday = STORE_INFO.hours.saturday || STORE_INFO.hours.weekday;
    } else {
        _hoursForToday = STORE_INFO.hours.weekday;
    }
    const _isOpenNow = _hoursRangeIncludesNow(_hoursForToday, 'America/New_York');
    const _startPart = (_hoursForToday || '').split(/[–-]/)[0] || '';
    const openRibbonText = _isOpenNow ? `Open today · ${_hoursForToday}` : `Closed now · Opens ${_startPart.trim()}`;
    return `
    <!-- Utility ribbon -->
    <div class="utility-ribbon">
        <div class="container">
            <div>
                ${openRibbonText}
                <span class="dot">●</span>
                ${STORE_INFO.address.street}, ${STORE_INFO.address.city} ${STORE_INFO.address.state}
                <span class="dot">●</span>
                <a href="tel:${tel}">${STORE_INFO.phone}</a>
            </div>
            <div>Members save every day &rarr;</div>
        </div>
    </div>

    <!-- The awning -->
    <header class="site-header">
        <div class="container">
            <div class="header-content">
                <a href="index.html" class="logo" aria-label="Kent Natural Foods Co-op — home">
                    <span class="logo-sun" aria-hidden="true">${SUN_MARK_SVG}</span>
                    <span class="logo-text-wrap">
                        <span class="logo-text">Kent Natural Foods</span>
                        <span class="logo-tagline">Member-Owned Co-op · Since ${STORE_INFO.foundedYear}</span>
                    </span>
                </a>
                <nav class="main-nav" aria-label="Main navigation">
                    <button class="mobile-menu-toggle" aria-label="Toggle menu" aria-expanded="false">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                    <ul class="nav-links">
                        <li><a href="index.html">Shop</a></li>
                        <li><a href="products.html">Products</a></li>
                        <li><a href="about.html">Our Story</a></li>
                        <li><a href="membership.html">Membership</a></li>
                        <li><a href="volunteer.html">Volunteer</a></li>
                        <li><a href="special-requests.html">Special Requests</a></li>
                        <li><a href="contact.html">Visit</a></li>
                        <li><a href="membership.html" class="nav-cta">Become a Member</a></li>
                    </ul>
                </nav>
            </div>
        </div>
    </header>
    `;
}

// ============================================================================
// FOOTER
// ============================================================================

function getFooterHTML() {
    const tel = STORE_INFO.phone.replace(/[^0-9]/g, '');
    return `
    <footer class="site-footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section footer-signature">
                    <span class="footer-sun sun-mark" aria-hidden="true">${SUN_MARK_SVG}</span>
                    <p class="footer-sig">"Local. Before <em>local</em> was cool."</p>
                </div>
                <div class="footer-section">
                    <h4>Shop</h4>
                    <ul>
                        <li><a href="products.html">Products</a></li>
                        <li><a href="products.html#sales">This Week's Sales</a></li>
                        <li><a href="products.html#staff-picks">Staff Picks</a></li>
                        <li><a href="special-requests.html">Special Requests</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>The Co-op</h4>
                    <ul>
                        <li><a href="about.html">Our Story</a></li>
                        <li><a href="membership.html">Membership</a></li>
                        <li><a href="volunteer.html">Volunteer</a></li>
                        <li><a href="contact.html">Contact</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Visit</h4>
                    <p>
                        ${STORE_INFO.address.street}<br>
                        ${STORE_INFO.address.city}, ${STORE_INFO.address.state} ${STORE_INFO.address.zip}<br>
                        <a href="tel:${tel}">${STORE_INFO.phone}</a><br>
                        <a href="mailto:${STORE_INFO.email}">${STORE_INFO.email}</a>
                    </p>
                </div>
            </div>
            <div class="footer-bottom">
                <div>&copy; <span id="currentYear"></span> Kent Natural Foods Co-operative · Member-Owned Since ${STORE_INFO.foundedYear}</div>
                <div>
                    <a href="${STORE_INFO.social.facebook}" target="_blank" rel="noopener">Facebook</a>
                    &nbsp;·&nbsp;
                    <a href="${STORE_INFO.social.instagram}" target="_blank" rel="noopener">Instagram</a>
                </div>
            </div>
        </div>
    </footer>
    `;
}

// ============================================================================
// NAV ACTIVE STATE
// ============================================================================

function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        if (link.classList.contains('nav-cta')) return; // skip the CTA button
        const linkPage = link.getAttribute('href');
        // Map related pages to a shared nav root
        const groups = {
            'index.html': ['index.html', ''],
            'products.html': ['products.html'],
            'about.html': ['about.html'],
            'membership.html': ['membership.html'],
            'volunteer.html': ['volunteer.html'],
            'special-requests.html': ['special-requests.html'],
            'contact.html': ['contact.html']
        };
        const group = groups[linkPage] || [linkPage];
        if (group.includes(currentPage)) {
            link.classList.add('active');
        }
    });
}

// ============================================================================
// PAGE INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Inject header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        headerPlaceholder.outerHTML = getHeaderHTML();
        setActiveNavLink();
    }

    // Inject footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        footerPlaceholder.outerHTML = getFooterHTML();
    }

    // Copyright year
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    // Mobile menu
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            const open = navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active', open);
            menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        navLinks.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });
        document.addEventListener('click', function(e) {
            if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Contact form — preserve original behavior
    document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function(e) {
            const action = form.getAttribute('action');
            if (!action || action === '#') {
                e.preventDefault();
                alert('This form is not yet wired up. Please email us at ' + STORE_INFO.email + ' or call ' + STORE_INFO.phone + '.');
            }
        });
    });

    // Smooth scroll for in-page anchors
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const top = target.getBoundingClientRect().top + window.pageYOffset - 80;
                    window.scrollTo({ top: top, behavior: 'smooth' });
                }
            }
        });
    });

    // Update hero "Open today" badge based on STORE_INFO.hours and timezone
    (function updateHeroOpenBadge() {
        try {
            const badge = document.getElementById('hero-open-badge');
            if (!badge) return;
            const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            let hoursText = '';
            if (today === 0) {
                hoursText = STORE_INFO.hours.sunday;
            } else if (today === 6) {
                hoursText = STORE_INFO.hours.saturday || STORE_INFO.hours.weekday;
            } else {
                hoursText = STORE_INFO.hours.weekday;
            }
            const isOpen = _hoursRangeIncludesNow(hoursText, 'America/New_York');
            const startPart = (hoursText || '').split(/[–-]/)[0] || '';
            badge.textContent = isOpen ? `Open today, ${hoursText}` : `Closed now · Opens ${startPart.trim()}`;
        } catch (err) {
            // Fail silently — badge is non-critical
            console.error('Failed to update hero open badge', err);
        }
    })();
});
