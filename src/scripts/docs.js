/**
 * docs.js - Behaviour every docs page shares: icons, the Light/Dark switch,
 * and the phone topic-list toggle. The search dialog is scripts/search.js.
 * Mirrors wildcat.chat's site.js, and uses the same storage key so the theme carries across sites.
 *
 * The initial theme is applied by an inline script in docs.njk before first
 * paint; this file keeps the switch, storage and <html data-theme> in step.
 */

(function () {
    const THEME_KEY = 'wildcat-home-theme';
    const root = document.documentElement;

    function readSavedTheme() {
        try {
            const t = localStorage.getItem(THEME_KEY);
            return t === 'light' || t === 'dark' ? t : null;
        } catch (e) {
            return null;
        }
    }

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        document.querySelectorAll('.wc-themeswitch [data-theme-value]').forEach((btn) => {
            btn.setAttribute('aria-pressed', String(btn.dataset.themeValue === theme));
        });
    }

    function initThemeSwitch() {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
        applyTheme(readSavedTheme() || (systemDark.matches ? 'dark' : 'light'));

        document.querySelectorAll('.wc-themeswitch [data-theme-value]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.themeValue;
                try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage blocked */ }
                applyTheme(theme);
            });
        });

        // Until the visitor picks a theme, follow the system setting.
        systemDark.addEventListener('change', (event) => {
            if (!readSavedTheme()) applyTheme(event.matches ? 'dark' : 'light');
        });

        // Synchronize theme changes across multiple open tabs.
        window.addEventListener('storage', (event) => {
            if (event.key === THEME_KEY) {
                applyTheme(readSavedTheme() || (systemDark.matches ? 'dark' : 'light'));
            }
        });
    }

    // On phones the sidebar sits above the content, so the topic list collapses
    // behind a toggle: a page opens on its content, not on the list. The list
    // stays open without JS; the CSS collapses it only once this has run.
    function initSideToggle() {
        const side = document.querySelector('.wch-side');
        const toggle = side && side.querySelector('.wch-side-toggle');
        if (!toggle) return;
        side.setAttribute('data-collapsible', '');
        toggle.hidden = false;
        toggle.addEventListener('click', () => {
            const open = toggle.getAttribute('aria-expanded') !== 'true';
            toggle.setAttribute('aria-expanded', String(open));
            side.toggleAttribute('data-open', open);
        });
    }

    // Scrollspy for "On this page": native CSS scroll-target-group with an
    // IntersectionObserver fallback and aria-current="true" sync on scrollend.
    function initScrollspy() {
        const tocList = document.querySelector('.wch-toc-list');
        if (!tocList) return;
        const tocLinks = Array.from(tocList.querySelectorAll('a[href^="#"]'));
        if (!tocLinks.length) return;

        if (!(window.CSS && typeof CSS.supports === 'function' && CSS.supports('scroll-target-group', 'auto'))
            && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        tocLinks.forEach((link) => {
                            link.classList.toggle(':target-current', link.getAttribute('href') === `#${entry.target.id}`);
                        });
                    }
                });
            }, { rootMargin: '-10% 0px -80% 0px' });

            tocLinks.forEach((link) => {
                const id = link.getAttribute('href').slice(1);
                const target = id && document.getElementById(id);
                if (target) observer.observe(target);
            });
        }

        function syncAriaCurrent() {
            tocLinks.forEach((link) => {
                let isCurrent = false;
                try {
                    isCurrent = link.matches(':target-current, .\\:target-current');
                } catch (e) {
                    isCurrent = link.classList.contains(':target-current');
                }
                if (isCurrent) {
                    link.setAttribute('aria-current', 'true');
                } else {
                    link.removeAttribute('aria-current');
                }
            });
        }

        document.addEventListener('scrollend', syncAriaCurrent, { passive: true });
        syncAriaCurrent();
    }

    function initIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function init() {
        initThemeSwitch();
        initSideToggle();
        initScrollspy();
        initIcons();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
