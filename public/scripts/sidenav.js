/**
 * sidenav.js - Handles the sidebar navigation toggle functionality
 * Updated to work with unified navigation system
 */

document.addEventListener('DOMContentLoaded', function () {
    // Only run on pages with sidebar
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Get DOM elements
    const sidebarToggle = document.getElementById('sidenav-toggle');
    const content = document.getElementById('content');

    /**
     * Single point of truth for the collapsed state. Every caller goes through
     * here, so the `.collapsed` class, the content offset and the toggle's
     * `aria-expanded` can never drift apart.
     */
    function setCollapsed(collapsed, persist) {
        sidebar.classList.toggle('collapsed', collapsed);
        if (content) content.classList.toggle('expanded', collapsed);
        if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
        if (persist !== false) localStorage.setItem('sidebarCollapsed', String(collapsed));
    }

    // Small screens always start collapsed; on desktop honour the stored
    // preference and fall back to expanded.
    const storedState = localStorage.getItem('sidebarCollapsed');
    const startCollapsed = window.innerWidth <= 768
        ? true
        : storedState === 'true';

    // Apply the initial state without persisting it as a user choice
    setCollapsed(startCollapsed, false);

    // Toggle sidebar from the header button
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function () {
            setCollapsed(!sidebar.classList.contains('collapsed'), true);
        });
    }

    // Sidebar links: collapse on small screens, but move focus to the target
    // first. Collapsing puts `display: none` on an ancestor of the focused
    // link, which would otherwise drop focus to <body> and lose the user's
    // place in the document.
    sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function () {
            // A section link that owns a submenu also expands that submenu.
            // Collapsing the sidebar in the same click would hide the submenu
            // the user just opened, so leave it open and let them pick a
            // subsection first.
            if (link.classList.contains('has-submenu')) return;

            if (window.innerWidth > 768 && !sidebar.classList.contains('collapsed')) return;

            const href = link.getAttribute('href') || '';
            const target = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;

            setCollapsed(true, true);

            if (target) {
                // Section wrappers are not focusable by default
                if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            }
        });
    });

    // Auto-collapse only when the breakpoint is actually crossed. A bare
    // `resize` below 768px also fires when the mobile URL bar hides, which
    // previously re-collapsed a sidebar the user had just opened.
    let wasNarrow = window.innerWidth <= 768;
    window.addEventListener('resize', function () {
        const isNarrow = window.innerWidth <= 768;
        if (isNarrow && !wasNarrow) setCollapsed(true, false);
        wasNarrow = isNarrow;
    });

    // Collapsible submenus. The caret is a real <button> that is a sibling of
    // the section link rather than a child of it -- nesting it inside the <a>
    // made it an interactive control inside another interactive control, and
    // translatePage()'s `element.textContent = ...` on `a[data-i18n]` deleted
    // it outright on every language switch.
    sidebar.querySelectorAll('.submenu-caret').forEach(caret => {
        const li = caret.closest('li');
        if (!li) return;

        function setSubmenuOpen(open) {
            if (open) {
                // Close any other open submenu
                sidebar.querySelectorAll('li.open').forEach(openLi => {
                    if (openLi === li) return;
                    openLi.classList.remove('open');
                    const otherCaret = openLi.querySelector('.submenu-caret');
                    if (otherCaret) otherCaret.setAttribute('aria-expanded', 'false');
                });
            }
            li.classList.toggle('open', open);
            caret.setAttribute('aria-expanded', String(open));
        }

        // Sync ARIA with whatever the markup shipped with
        setSubmenuOpen(li.classList.contains('open'));

        // <button> handles Enter and Space natively, so no keydown shim here
        caret.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            setSubmenuOpen(!li.classList.contains('open'));
        });

        // Following the section link should also reveal its submenu
        const link = li.querySelector('a.has-submenu');
        if (link) {
            link.addEventListener('click', function () {
                setSubmenuOpen(true);
            });
        }
    });
});
