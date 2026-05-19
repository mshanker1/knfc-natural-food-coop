/**
 * KNFC Website - Main JavaScript
 * Kent Natural Foods Co-op
 */

// ============================================================================
// SHARED HEADER AND FOOTER COMPONENTS
// ============================================================================
// Update these once and they'll propagate to all pages automatically!

const STORE_INFO = {
    phone: '(330) 673-2878',
    email: '[Email Address]', // Update this with actual email
    address: {
        street: '151 East Main St.',
        city: 'Kent',
        state: 'OH',
        zip: '44240'
    },
    hours: {
        weekday: '9:00 AM - 8:00 PM',
        saturday: '9:00 AM - 8:00 PM',
        sunday: 'Noon - 6:00 PM'
    }
};

function getHeaderHTML() {
    return `
    <header class="site-header">
        <div class="container">
            <div class="header-content">
                <a href="index.html" class="logo">
                    <span class="logo-text">KNFC</span>
                    <span class="logo-tagline">Kent Natural Foods Co-op</span>
                </a>
                <nav class="main-nav">
                    <button class="mobile-menu-toggle" aria-label="Toggle menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                    <ul class="nav-links">
                        <li><a href="index.html">Home</a></li>
                        <li><a href="about.html">About</a></li>
                        <li><a href="products.html">Products</a></li>
                        <li><a href="membership.html">Membership</a></li>
                        <li><a href="volunteer.html">Volunteer</a></li>
                        <li><a href="special-requests.html">Special Requests</a></li>
                        <li><a href="contact.html">Contact</a></li>
                    </ul>
                </nav>
            </div>
        </div>
    </header>
    `;
}

function getFooterHTML() {
    return `
    <footer class="site-footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>Kent Natural Foods Co-op</h4>
                    <p>A member-owned cooperative serving our community with natural, organic, and local foods.</p>
                </div>
                <div class="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="about.html">About Us</a></li>
                        <li><a href="products.html">Products</a></li>
                        <li><a href="membership.html">Membership</a></li>
                        <li><a href="volunteer.html">Volunteer</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Contact</h4>
                    <p>
                        ${STORE_INFO.address.street}<br>
                        ${STORE_INFO.address.city}, ${STORE_INFO.address.state} ${STORE_INFO.address.zip}<br>
                        <a href="tel:${STORE_INFO.phone.replace(/[^0-9]/g, '')}">${STORE_INFO.phone}</a><br>
                        <a href="mailto:${STORE_INFO.email}">${STORE_INFO.email}</a>
                    </p>
                </div>
                <div class="footer-section">
                    <h4>Hours</h4>
                    <p>
                        Mon-Fri: ${STORE_INFO.hours.weekday}<br>
                        Saturday: ${STORE_INFO.hours.saturday}<br>
                        Sunday: ${STORE_INFO.hours.sunday}
                    </p>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; <span id="currentYear"></span> Kent Natural Foods Co-op. All rights reserved.</p>
            </div>
        </div>
    </footer>
    `;
}

function setActiveNavLink() {
    // Determine current page from URL
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Find and set active link
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// ============================================================================
// PAGE INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Inject shared header and footer
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (headerPlaceholder) {
        headerPlaceholder.outerHTML = getHeaderHTML();
        setActiveNavLink();
    }

    if (footerPlaceholder) {
        footerPlaceholder.outerHTML = getFooterHTML();
    }

    // Update copyright year
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Mobile menu toggle
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
            }
        });
    }

    // Contact form handling (basic - needs backend integration)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            // If no action URL is set or it's just "#", prevent default
            const action = contactForm.getAttribute('action');
            if (!action || action === '#') {
                e.preventDefault();
                alert('Contact form submission is not yet configured. Please email us directly or call the store.');
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
});
