/**
 * command-reference.js - Filter and category chips for the command tables
 * (sage-commands.html, tts-commands.html).
 *
 * The table markup is the one the long pages always had: a tbody whose
 * tr.category-header holds each category's h2, then one .dropdown-group tbody per command
 * (dropdown-table.js opens and closes them). This adds, above the table:
 * a filter field and one chip per category, and on each category heading a
 * "N commands" count. When the filter narrows the names to one command, that
 * command's details open; they close again when the filter moves on, unless the
 * reader opened them.
 */

(function () {
    const t = (key, fallback) =>
        (typeof getTranslation === 'function' && getTranslation(key)) || fallback;

    function countLabel(n) {
        const lang = document.documentElement.lang || 'en';
        let form = 'other';
        try { form = new Intl.PluralRules(lang).select(n); } catch (e) { /* unknown locale */ }
        const template = t('docsNav.commands.count.' + form, null) || t('docsNav.commands.count.other', '{n} commands');
        return template.replace('{n}', String(n));
    }

    function init() {
        const table = document.querySelector('.wch-commands table');
        if (!table) return;

        // Group each category heading with the command rows that follow it.
        const categories = [];
        let current = null;
        Array.from(table.tBodies).forEach((tb) => {
            if (tb.querySelector('tr.category-header')) {
                const heading = tb.querySelector('.category-heading');
                current = { header: tb, heading, id: heading ? heading.id : '', rows: [] };
                categories.push(current);
                const cell = tb.querySelector('td');
                if (cell && !cell.querySelector('.wch-cmdcount')) {
                    const count = document.createElement('span');
                    count.className = 'wch-cmdcount';
                    cell.appendChild(count);
                }
            } else if (tb.classList.contains('dropdown-group') && current) {
                current.rows.push(tb);
            }
        });
        if (!categories.length) return;

        // Filter field and chips, inserted before the table.
        const tools = document.createElement('div');
        tools.className = 'wch-cmdtools';
        tools.innerHTML =
            '<input type="search" class="form-control" id="command-filter" autocomplete="off" spellcheck="false">' +
            '<div class="wch-cmdchips" role="group"></div>' +
            '<p class="wc-help" id="command-filter-empty" hidden></p>';
        table.parentNode.insertBefore(tools, table);

        const input = tools.querySelector('input');
        const chips = tools.querySelector('.wch-cmdchips');
        const empty = tools.querySelector('#command-filter-empty');
        let active = 'all';
        // Rows the filter opened, so it closes only those and never one the reader opened.
        const autoOpened = new Set();

        function addChip(id, labelFor) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'wc-chipbtn';
            b.dataset.cat = id;
            b.setAttribute('aria-pressed', String(id === active));
            b.addEventListener('click', () => {
                active = id;
                chips.querySelectorAll('button').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === active)));
                apply();
            });
            b._label = labelFor;
            chips.appendChild(b);
        }
        addChip('all', () => t('docsNav.commands.all', 'All'));
        categories.forEach((c) => addChip(c.id, () => (c.heading ? c.heading.textContent.trim() : c.id)));

        // The command as typed in chat, without the Mod badge.
        function nameOf(row) {
            const cell = row.querySelector('.dropdown-summary > td:first-child');
            if (!cell) return '';
            const clone = cell.cloneNode(true);
            clone.querySelectorAll('.mod-badge').forEach((b) => b.remove());
            return clone.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
        }

        function setOpen(row, open) {
            if (row.classList.contains('open') !== open) row.querySelector('.dropdown-trigger')?.click();
        }

        function apply() {
            const q = input.value.trim().toLowerCase();
            let total = 0;
            const named = [];
            categories.forEach((c) => {
                const inCat = active === 'all' || active === c.id;
                let shown = 0;
                c.rows.forEach((row) => {
                    const name = nameOf(row);
                    const match = inCat && (!q || name.includes(q) || row.querySelector('.dropdown-summary').textContent.toLowerCase().includes(q));
                    row.hidden = !match;
                    if (match) {
                        shown++;
                        if (name.includes(q)) named.push(row);
                    }
                });
                c.header.hidden = shown === 0;
                const count = c.header.querySelector('.wch-cmdcount');
                if (count) count.textContent = countLabel(shown);
                total += shown;
            });
            empty.hidden = total > 0;

            // Open a command once the filter names only it ("!tts st" matches every
            // !tts command, "!tts sto" only !tts stop); close what the filter opened before.
            const pick = q.length > 2 && named.length === 1 ? named[0] : null;
            autoOpened.forEach((row) => {
                if (row === pick) return;
                if (row.classList.contains('open')) setOpen(row, false);
                autoOpened.delete(row);
            });
            if (pick && !pick.classList.contains('open')) {
                setOpen(pick, true);
                autoOpened.add(pick);
            }
        }

        function relabel() {
            input.placeholder = t('docsNav.commands.filter', 'Filter commands, for example: quote');
            input.setAttribute('aria-label', t('docsNav.commands.filterLabel', 'Filter commands'));
            chips.setAttribute('aria-label', t('docsNav.commands.category', 'Command category'));
            chips.querySelectorAll('button').forEach((b) => { b.textContent = b._label(); });
            empty.textContent = t('docsNav.commands.none', 'No commands match. Clear the filter or choose All.');
            apply();
        }

        input.addEventListener('input', apply);
        document.addEventListener('i18n:translated', relabel);
        relabel();

        // A link to a category or command (#games, #dd-commands-ask) lands: open a
        // linked command's row. Its details row is hidden, so the browser could not
        // scroll to it. Also on hashchange, for a search result on this same page.
        function openLinked() {
            let hashId = '';
            try { hashId = decodeURIComponent(location.hash.slice(1)); } catch (e) { /* malformed hash */ }
            const target = hashId && document.getElementById(hashId);
            const group = target && target.closest('.dropdown-group');
            if (!group) return;
            // A filter that hides the row would leave nothing to scroll to.
            if (group.hidden) {
                input.value = '';
                active = 'all';
                chips.querySelectorAll('button').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === active)));
                apply();
            }
            setOpen(group, true);
            group.scrollIntoView();
        }
        openLinked();
        window.addEventListener('hashchange', openLinked);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
