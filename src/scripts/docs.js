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

    function initIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function init() {
        initThemeSwitch();
        initSideToggle();
        initIcons();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
