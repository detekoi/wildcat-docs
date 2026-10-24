/**
 * search.js - The docs search dialog.
 *
 * Searches the text of every topic page, not only the page titles. The index is
 * built with the site (lib/search-index.js): one search/<lang>.json per language,
 * a record per section and per command, already in that language. It is fetched
 * the first time the dialog opens.
 *
 * Opens from the sidebar button, Ctrl+K / Cmd+K, or "/". The input is a combobox
 * over a listbox of results: arrow keys move, Enter opens.
 */

(function () {
    const MAX_RESULTS = 20;
    const SNIPPET = 150;

    const t = (key, fallback) =>
        (typeof getTranslation === 'function' && getTranslation(key)) || fallback;

    const dialog = document.getElementById('docs-search');
    const opener = document.getElementById('docs-search-open');
    if (!dialog || !opener) return;
    // A browser without <dialog> (before Safari 15.4 / Firefox 98) gets no search
    // rather than a button that does nothing.
    if (typeof dialog.showModal !== 'function') {
        opener.hidden = true;
        return;
    }
    const input = document.getElementById('docs-search-input');
    const list = document.getElementById('docs-search-results');
    const msg = document.getElementById('docs-search-msg');
    const status = document.getElementById('docs-search-status');
    const kbd = document.getElementById('docs-search-kbd');

    const isApple = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
    if (kbd) kbd.textContent = isApple ? '⌘K' : 'Ctrl K';

    // ---- Index ----

    const indexes = new Map(); // lang -> Promise<entries>
    let entries = null;
    let entriesLang = null;
    let loadState = 'idle'; // idle | loading | failed

    // Lower case, accents off, one character at a time so `map` can point each
    // normalized character back at the original string for the snippet.
    function normalize(s) {
        let out = '';
        const map = [];
        let i = 0;
        for (const ch of s) {
            const n = ch.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            for (let j = 0; j < n.length; j++) map.push(i);
            out += n;
            i += ch.length;
        }
        map.push(i);
        return { out, map };
    }

    function load(lang) {
        if (!indexes.has(lang)) {
            const p = fetch('search/' + lang + '.json')
                .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
                .then((rows) => rows.map((e) => {
                    const text = normalize(e.t);
                    // A page's lead record has no heading: it stands for the page.
                    const h = e.h || e.p;
                    return {
                        ...e, h, hN: normalize(h).out, pN: normalize(e.p).out, gN: normalize(e.g).out,
                        tN: text.out, tMap: text.map, lead: !e.u.includes('#'),
                    };
                }))
                .catch((err) => {
                    indexes.delete(lang);
                    if (lang !== 'en') return load('en');
                    throw err;
                });
            indexes.set(lang, p);
        }
        return indexes.get(lang);
    }

    function currentLang() {
        return document.documentElement.lang || 'en';
    }

    // Fetch the index for the current language, then render. Called on opening and
    // on each keystroke, never from render(): a failed fetch is dropped from the
    // cache, so the reader's next keystroke tries again.
    function ensureIndex() {
        const lang = currentLang();
        if ((entries && entriesLang === lang) || loadState === 'loading') return;
        loadState = 'loading';
        load(lang).then((rows) => {
            loadState = 'idle';
            if (currentLang() !== lang) {
                // The language changed while this one loaded.
                ensureIndex();
                return;
            }
            entries = rows;
            entriesLang = lang;
            if (dialog.open) render();
        }, () => {
            loadState = 'failed';
            if (dialog.open) render();
        });
    }

    // ---- Matching ----

    const isWordStart = (s, i) => i === 0 || /[\s\-_/.(\["'“«!:,]/.test(s[i - 1]);

    function score(e, terms, phrase) {
        let s = 0;
        let inSection = false;
        for (const term of terms) {
            const iH = e.hN.indexOf(term);
            const iT = e.tN.indexOf(term);
            const iP = e.pN.indexOf(term);
            // The product name ("overlay", "WildcatSage") finds every page of that
            // product, through the one record each page has for itself.
            const iG = e.lead ? e.gN.indexOf(term) : -1;
            if (iH < 0 && iT < 0 && iP < 0 && iG < 0) return 0;
            if (iH >= 0) {
                inSection = true;
                s += 30 + (isWordStart(e.hN, iH) ? 10 : 0);
            }
            if (iT >= 0) {
                inSection = true;
                s += 6 + (isWordStart(e.tN, iT) ? 3 : 0);
                // A few points for repeats, so the section about a thing beats one that names it once.
                let n = 0;
                for (let i = iT; i >= 0 && n < 5; i = e.tN.indexOf(term, i + term.length)) n++;
                s += n;
            }
            if (iP >= 0) s += e.lead ? 20 : 2;
            if (iG >= 0) s += 15;
        }
        // A section must hold one of the words itself; the page title alone
        // would list every section of that page.
        if (!inSection && !e.lead) return 0;
        if (e.hN === phrase) s += 40;
        else if (e.hN.startsWith(phrase)) s += 20;
        if (e.c && e.hN.startsWith(phrase)) s += 25;
        return s;
    }

    function search(q) {
        const phrase = normalize(q.trim()).out.replace(/\s+/g, ' ');
        const terms = phrase.split(' ').filter(Boolean);
        if (!terms.length || !entries) return [];
        const hits = [];
        entries.forEach((e, i) => {
            const s = score(e, terms, phrase);
            if (s > 0) hits.push({ e, s, i });
        });
        hits.sort((a, b) => b.s - a.s || a.i - b.i);
        return hits.slice(0, MAX_RESULTS).map((h) => h.e);
    }

    // ---- Rendering (text nodes only: index text never goes through innerHTML) ----

    // Append `text` to `parent`, wrapping each occurrence of a term in <mark>.
    function appendMarked(parent, text, terms) {
        const { out, map } = normalize(text);
        const ranges = [];
        for (const term of terms) {
            for (let i = out.indexOf(term); i >= 0; i = out.indexOf(term, i + term.length)) {
                ranges.push([map[i], map[i + term.length]]);
            }
        }
        ranges.sort((a, b) => a[0] - b[0]);
        let pos = 0;
        for (const [a, b] of ranges) {
            if (a < pos) continue;
            if (a > pos) parent.appendChild(document.createTextNode(text.slice(pos, a)));
            const mark = document.createElement('mark');
            mark.textContent = text.slice(a, b);
            parent.appendChild(mark);
            pos = b;
        }
        if (pos < text.length) parent.appendChild(document.createTextNode(text.slice(pos)));
    }

    // The part of a section's text around its first match.
    function snippet(e, terms) {
        let at = -1;
        for (const term of terms) {
            const i = e.tN.indexOf(term);
            if (i >= 0 && (at < 0 || i < at)) at = i;
        }
        const text = e.t;
        let start = at < 0 ? 0 : e.tMap[at];
        if (start > 40) {
            start -= 40;
            const space = text.indexOf(' ', start);
            if (space >= 0 && space < start + 20) start = space + 1;
        } else {
            start = 0;
        }
        let end = Math.min(text.length, start + SNIPPET);
        if (end < text.length) {
            const space = text.lastIndexOf(' ', end);
            if (space > start + SNIPPET / 2) end = space;
        }
        return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    }

    function hrefFor(e) {
        const url = new URL(e.u, location.href);
        const lang = new URLSearchParams(location.search).get('lang');
        if (lang) url.searchParams.set('lang', lang);
        return url;
    }

    let results = [];
    let active = -1;
    let lastRendered = '';

    function setActive(i) {
        const items = list.children;
        if (active >= 0 && items[active]) items[active].setAttribute('aria-selected', 'false');
        active = i;
        if (active >= 0 && items[active]) {
            items[active].setAttribute('aria-selected', 'true');
            input.setAttribute('aria-activedescendant', items[active].id);
            items[active].scrollIntoView({ block: 'nearest' });
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    }

    function countLabel(n) {
        return typeof translatePlural === 'function'
            ? translatePlural('docsNav.searchDialog.results', n, n + ' results')
            : n + ' results';
    }

    function render() {
        const q = input.value;
        lastRendered = q;
        const terms = normalize(q.trim()).out.split(/\s+/).filter(Boolean);
        results = terms.length ? search(q) : [];
        list.replaceChildren();
        active = -1;
        input.removeAttribute('aria-activedescendant');

        results.forEach((e, i) => {
            const li = document.createElement('li');
            li.id = 'docs-search-opt-' + i;
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', 'false');
            li.className = 'wch-search-hit';

            const a = document.createElement('a');
            a.href = hrefFor(e).href;
            a.tabIndex = -1;

            const crumb = document.createElement('span');
            crumb.className = 'wc-readout wch-search-crumb';
            crumb.textContent = e.lead ? e.g : e.g + ' › ' + e.p;

            const head = document.createElement('span');
            head.className = 'wch-search-title' + (e.c ? ' wch-search-title--cmd' : '');
            appendMarked(head, e.h, terms);

            a.append(crumb, head);
            if (e.t) {
                const body = document.createElement('span');
                body.className = 'wch-search-snippet';
                appendMarked(body, snippet(e, terms), terms);
                a.appendChild(body);
            }
            a.addEventListener('click', (ev) => {
                if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
                ev.preventDefault();
                go(e);
            });
            li.addEventListener('mousemove', () => { if (active !== i) setActive(i); });
            li.appendChild(a);
            list.appendChild(li);
        });

        input.setAttribute('aria-expanded', String(results.length > 0));
        if (results.length) setActive(0);

        list.hidden = results.length === 0;
        let text = '';
        if (!terms.length) text = t('docsNav.searchDialog.hint', 'Search the text of every page, for example: forgetme, cheermote, or a voice ID.');
        else if (entries) text = results.length ? '' : t('docsNav.searchDialog.noResults', 'No results. Try a command name, such as !tts or !geo.');
        else if (loadState === 'failed') text = t('docsNav.searchDialog.failed', 'Search could not load. Check your connection, then type again.');
        else text = t('docsNav.searchDialog.loading', 'Loading…');
        msg.textContent = text;
        msg.hidden = results.length > 0;
        // Announce the count, or why there is none yet.
        status.textContent = terms.length ? (entries ? countLabel(results.length) : text) : '';
    }

    let timer = 0;
    function scheduleRender() {
        clearTimeout(timer);
        timer = setTimeout(render, 80);
    }

    // ---- Navigation ----

    function go(e) {
        const url = hrefFor(e);
        dialog.close();
        if (url.pathname !== location.pathname) {
            location.href = url.href;
            return;
        }
        // Same page: no reload. hashchange lets the command table open a linked row
        // or clear a filter hiding it; focus moves once that has run.
        let id = '';
        try { id = decodeURIComponent(url.hash.slice(1)); } catch (err) { /* malformed */ }
        function arrive() {
            const target = id ? document.getElementById(id) : document.getElementById('content');
            if (!target) return;
            // Closing the dialog sent focus back to the sidebar button; move it to what
            // the reader chose. A command's details row is hidden, so its row's button.
            const group = target.closest('.dropdown-group');
            const focusEl = group ? group.querySelector('.dropdown-trigger') : target;
            if (!focusEl) return;
            if (!group && !focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
            focusEl.focus({ preventScroll: true });
            if (!group) target.scrollIntoView();
        }
        if (location.hash !== url.hash) {
            window.addEventListener('hashchange', arrive, { once: true });
            location.hash = url.hash;
        } else {
            window.dispatchEvent(new HashChangeEvent('hashchange'));
            arrive();
        }
    }

    // ---- Open and close ----

    function onOpen() {
        input.select();
        ensureIndex();
        render();
    }

    function open() {
        if (!dialog.open) dialog.showModal();
        onOpen();
    }

    const closeBtn = dialog.querySelector('.wch-search-close');
    if (!('commandForElement' in HTMLButtonElement.prototype)) {
        opener.addEventListener('click', open);
        if (closeBtn) closeBtn.addEventListener('click', () => dialog.close());
    } else {
        opener.addEventListener('click', onOpen);
    }

    // Fallback for browsers without native <dialog closedby="any"> support.
    if (!('closedBy' in HTMLDialogElement.prototype)) {
        let pressedBackdrop = false;
        dialog.addEventListener('pointerdown', (ev) => { pressedBackdrop = ev.target === dialog; });
        dialog.addEventListener('click', (ev) => {
            if (ev.target === dialog && pressedBackdrop) {
                const rect = dialog.getBoundingClientRect();
                const clickedInDialog =
                    ev.clientX >= rect.left &&
                    ev.clientX <= rect.right &&
                    ev.clientY >= rect.top &&
                    ev.clientY <= rect.bottom;
                if (!clickedInDialog) dialog.close();
            }
            pressedBackdrop = false;
        });
    }

    let lastCompositionEndTime = 0;
    input.addEventListener('compositionend', (ev) => {
        lastCompositionEndTime = ev.timeStamp;
    });

    input.addEventListener('input', () => {
        ensureIndex();
        scheduleRender();
    });
    input.addEventListener('keydown', (ev) => {
        // Enter and the arrows belong to the IME while CJK text is being composed
        // (including Safari's inverted compositionend/keydown timing within 50ms).
        if (ev.isComposing || ev.keyCode === 229 || (ev.timeStamp - lastCompositionEndTime < 50)) return;
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            if (!results.length) return;
            const step = ev.key === 'ArrowDown' ? 1 : -1;
            setActive((active + step + results.length) % results.length);
        } else if (ev.key === 'Enter') {
            // Results may still be pending behind the debounce.
            clearTimeout(timer);
            if (!results.length || input.value !== lastRendered) render();
            if (active >= 0 && results[active]) {
                ev.preventDefault();
                go(results[active]);
            }
        }
    });

    function isEditable(el) {
        return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    }

    document.addEventListener('keydown', (ev) => {
        // Not with Shift: Ctrl+Shift+K and Cmd+Shift+K are browser shortcuts (Firefox's console).
        if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && !ev.shiftKey && ev.key.toLowerCase() === 'k') {
            ev.preventDefault();
            if (dialog.open) dialog.close();
            else open();
        } else if (ev.key === '/' && !ev.metaKey && !ev.ctrlKey && !ev.altKey
            && !dialog.open && !isEditable(ev.target)) {
            ev.preventDefault();
            open();
        }
    });

    // A language switch: the next search reads that language's index.
    document.addEventListener('i18n:translated', () => {
        if (entriesLang !== currentLang()) entries = null;
        if (dialog.open) {
            ensureIndex();
            render();
        }
    });
})();
