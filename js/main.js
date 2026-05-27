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

function _getHoursForDayIndex(idx) {
    if (idx === 0) return STORE_INFO.hours.sunday;
    if (idx === 6) return STORE_INFO.hours.saturday || STORE_INFO.hours.weekday;
    return STORE_INFO.hours.weekday;
}

function _getNextOpenStart(timeZone = 'America/New_York') {
    const now = _nowInTimeZone(timeZone);
    const today = now.getDay();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    for (let offset = 0; offset < 7; offset++) {
        const day = (today + offset) % 7;
        const hoursStr = _getHoursForDayIndex(day);
        if (!hoursStr) continue;
        const parts = hoursStr.split(/[–-]/).map(s => s.trim());
        if (parts.length < 2) continue;
        const start = _parseTimeToMinutes(parts[0]);
        const end = _parseTimeToMinutes(parts[1]);
        if (start == null) continue;
        if (offset === 0) {
            // same day: if opening time still in future, return it
            if (start > nowMinutes) return { day: day, time: parts[0] };
            // otherwise, continue searching future days
        } else {
            return { day: day, time: parts[0] };
        }
    }
    return null;
}

function _formatNextOpenLabel(timeZone = 'America/New_York') {
    const next = _getNextOpenStart(timeZone);
    if (!next) return '';
    const now = _nowInTimeZone(timeZone);
    const today = now.getDay();
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (next.day === today) return `${next.time}`;
    if ((next.day + 7 - today) % 7 === 1) return `Tomorrow ${next.time}`;
    return `${weekdayNames[next.day]} ${next.time}`;
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
    const _nextOpenLabel = _isOpenNow ? (_hoursForToday || '') : _formatNextOpenLabel('America/New_York') || ((_hoursForToday || '').split(/[–-]/)[0] || '');
    const openRibbonText = _isOpenNow ? `Open today · ${_hoursForToday}` : `Closed now · Opens ${_nextOpenLabel.trim()}`;
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

    // Lazy-load Google Maps iframe when map placeholder scrolls into view
    function initLazyMaps() {
        const lazyEls = document.querySelectorAll('.map-lazy');
        if (!lazyEls || lazyEls.length === 0) return;
        const createIframe = (el) => {
            const src = el.dataset.src;
            if (!src) return;
            const iframe = document.createElement('iframe');
            iframe.src = src;
            iframe.width = '600';
            iframe.height = '450';
            iframe.style.border = '0';
            iframe.style.width = '100%';
            iframe.style.height = '360px';
            iframe.setAttribute('loading', 'lazy');
            iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
            iframe.setAttribute('aria-hidden', 'false');
            iframe.setAttribute('title', 'Map to Kent Natural Foods');
            el.innerHTML = '';
            el.appendChild(iframe);
        };

        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        createIframe(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '200px' });
            lazyEls.forEach(el => io.observe(el));
        } else {
            // Fallback: load immediately
            lazyEls.forEach(el => createIframe(el));
        }
    }
    initLazyMaps();

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
            let nextLabel = '';
            if (isOpen) {
                nextLabel = (hoursText || '');
                badge.textContent = `Open today, ${hoursText}`;
            } else {
                nextLabel = _formatNextOpenLabel('America/New_York') || ((hoursText || '').split(/[–-]/)[0] || '');
                badge.textContent = `Closed now · Opens ${nextLabel.trim()}`;
            }
        } catch (err) {
            // Fail silently — badge is non-critical
            console.error('Failed to update hero open badge', err);
        }
    })();

    // Holidays: fetch US federal holidays and optional local overrides
    async function fetchHolidays(year) {
        const cacheKey = `knfc_holidays_${year}`;
        try {
            // If developer forces a reload via URL param, clear cached entry
            try {
                const params = new URLSearchParams(window.location.search);
                if (params.has('forceHolidaysReload') || params.has('nocache')) {
                    localStorage.removeItem(cacheKey);
                    console.info('Holiday cache cleared via URL param');
                }
            } catch (e) {}

            const cached = localStorage.getItem(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (e) { /* ignore localStorage errors */ }

        try {
            const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/US`);
            if (!res.ok) throw new Error('Holiday API error');
            const data = await res.json();
            try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
            return data;
        } catch (err) {
            console.warn('Failed to fetch holidays:', err);
            return [];
        }
    }

    async function fetchOverrides() {
        try {
            const res = await fetch('data/holidays-overrides.json');
            if (!res.ok) return {};
            return await res.json();
        } catch (e) {
            return {};
        }
    }

    function formatDateYMD(d) { return d.toISOString().slice(0,10); }

    function showHolidayMessage(text, status) {
        let el = document.getElementById('holiday-alert');
        if (!el) {
            el = document.createElement('div');
            el.id = 'holiday-alert';
            el.setAttribute('role','status');
            const container = document.querySelector('.utility-ribbon .container') || document.body;
            container.insertBefore(el, container.firstChild);
        }
        el.textContent = text;
        el.className = 'holiday-alert';
        if (status === 'closed') el.classList.add('closed');
    }

    async function checkAndShowHolidays() {
        try {
            const today = new Date();
            const year = today.getFullYear();
            const [holidays, overrides] = await Promise.all([fetchHolidays(year), fetchOverrides()]);
            const todayY = formatDateYMD(today);

            // apply overrides map: { "2026-12-25": {"status":"closed","message":"Closed for Christmas"} }
            if (overrides && overrides[todayY]) {
                const o = overrides[todayY];
                showHolidayMessage(o.message || 'Holiday — Shop may have restricted hours or be closed.', o.status || 'restricted');
                return;
            }

            const todayHoliday = (holidays || []).find(h => h.date === todayY);
            if (todayHoliday) {
                showHolidayMessage(`${todayHoliday.localName || todayHoliday.name} — Shop may have restricted hours or be closed. Please check.`);
                return;
            }

            // Next upcoming within 7 days
            const upcoming = (holidays || []).map(h => ({...h, _d: new Date(h.date)})).filter(h => h._d > today && (h._d - today) <= 7*24*60*60*1000).sort((a,b)=>a._d-b._d);
            if (upcoming.length) {
                const h = upcoming[0];
                const override = overrides && overrides[h.date];
                if (override) {
                    showHolidayMessage(override.message || `Upcoming: ${h.localName || h.name} — Shop may have restricted hours or be closed. Please check.`, override.status);
                } else {
                    showHolidayMessage(`Upcoming: ${h.localName || h.name} (${h.date}) — Shop may have restricted hours or be closed. Please check.`);
                }
            }
        } catch (err) {
            // silent failure
            console.warn('Holiday check failed', err);
        }
    }

    // Run holiday check after DOM is ready
    checkAndShowHolidays();
});
