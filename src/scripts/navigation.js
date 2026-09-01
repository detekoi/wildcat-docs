// Width at or below which the navbar collapses behind the hamburger. Must match
// the `@media (max-width: 900px)` navbar block in styles/unified.css.
const NAV_COLLAPSE_WIDTH = 900;

/**
 * navigation.js - Unified navigation handler for the portfolio website
 * Handles the top navigation bar, active page highlighting, and mobile menu toggle
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get the current page filename
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const currentHost = window.location.hostname;

    // Get all navigation links
    const navLinks = document.querySelectorAll('.site-navbar-menu a');

    // Set active class based on current page
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Skip external links (those starting with http:// or https:// and pointing to different domains)
        if (href.startsWith('http://') || href.startsWith('https://')) {
            try {
                const linkUrl = new URL(href);
                if (linkUrl.hostname !== currentHost) {
                    // External link - don't mark as active
                    return;
                }
            } catch (e) {
                // Invalid URL - skip
                return;
            }
        }
        
        // Process internal links only
        const linkPage = href.split('/').pop() || (href === '/' || href === '' ? 'index.html' : '');

        // `active` is styling only; aria-current is what conveys "you are here"
        // to assistive technology.
        if (linkPage === currentPage) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }

        // Also handle index.html vs root
        if ((currentPage === '' || currentPage === 'index.html') &&
            (linkPage === 'index.html' || linkPage === '' || href === '/' || href === '')) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });

    // Mobile menu toggle
    const navbarToggle = document.querySelector('.navbar-toggle');
    const navbarMenu = document.querySelector('.site-navbar-menu');

    // The glyph lives in an aria-hidden child span and the accessible name comes
    // from aria-label, so the button's own textContent must never be written --
    // doing so would delete the span.
    function setMenuOpen(open) {
        if (!navbarMenu || !navbarToggle) return;
        navbarMenu.classList.toggle('active', open);
        navbarToggle.setAttribute('aria-expanded', String(open));
        const glyph = navbarToggle.querySelector('span') || navbarToggle;
        glyph.textContent = open ? '✕' : '☰';
    }

    if (navbarToggle && navbarMenu) {
        navbarToggle.addEventListener('click', function() {
            setMenuOpen(!navbarMenu.classList.contains('active'));
        });

        // Close mobile menu when clicking a link
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= NAV_COLLAPSE_WIDTH) {
                    setMenuOpen(false);
                }
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navbarToggle.contains(event.target) &&
                !navbarMenu.contains(event.target) &&
                navbarMenu.classList.contains('active')) {
                setMenuOpen(false);
            }
        });

        // Escape closes the menu and returns focus to the control that opened it
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && navbarMenu.classList.contains('active')) {
                setMenuOpen(false);
                navbarToggle.focus();
            }
        });
    }

    // Handle window resize - close mobile menu if window gets larger
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth > NAV_COLLAPSE_WIDTH && navbarMenu && navbarMenu.classList.contains('active')) {
                setMenuOpen(false);
            }
        }, 250);
    });
});
