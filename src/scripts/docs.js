/**
 * docs.js - Behaviour every docs page shares: icons, the Light/Dark switch,
 * and the sidebar search. Mirrors wildcat.chat's
 * site.js, and uses the same storage key so the theme carries across sites.
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

    // Filter the sidebar's page titles. A query starting with "!" is a command
    // name, so both Commands pages stay listed whatever follows the "!".
    function initSidebarSearch() {
        const input = document.getElementById('docs-search');
        const empty = document.getElementById('docs-search-empty');
        if (!input) return;
        const groups = Array.from(document.querySelectorAll('.wch-side-group'));
        function apply() {
            const q = input.value.trim().toLowerCase();
            let shown = 0;
            groups.forEach((group) => {
                const label = (group.querySelector('.wch-side-label')?.textContent || '').toLowerCase();
                let groupShown = 0;
                group.querySelectorAll('.wch-side-link').forEach((link) => {
                    const match = !q
                        || link.textContent.toLowerCase().includes(q)
                        || label.includes(q)
                        || (q.startsWith('!') && link.hasAttribute('data-commands'));
                    link.hidden = !match;
                    if (match) groupShown++;
                });
                group.hidden = groupShown === 0;
                shown += groupShown;
            });
            if (empty) empty.hidden = shown > 0;
        }
        input.addEventListener('input', apply);
        // Translated titles arrive after load; re-run so a typed query still matches.
        document.addEventListener('i18n:translated', apply);
    }

    function initIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function init() {
        initThemeSwitch();
        initSidebarSearch();
        initIcons();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
