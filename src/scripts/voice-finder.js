/**
 * voice-finder.js - Search and filters for the voice table on tts-voices.html.
 *
 * The page ships the studio voices as a static table. This script loads every voice
 * from data/voices.json (written by `npm run sync:voices`), then fills the second table
 * from the search field and the three filters. It renders the matches in batches, so a
 * search that matches every voice does not build two thousand rows at once.
 *
 * Voice names, voice IDs, accents and descriptions are English data. Language names come
 * from Intl.DisplayNames in the page language. All other text comes from the catalog.
 */

(function () {
    // The same order as scripts/sync-voices.js, which stores an index for each.
    const GENDERS = ['female', 'male', 'neutral'];
    const PITCHES = ['low', 'medium', 'high'];
    const BATCH = 100;

    const t = (key, fallback) =>
        (typeof getTranslation === 'function' && getTranslation(key)) || fallback;
    const fill = (text, params) =>
        text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
    const fold = (text) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const cap = (word) => word.charAt(0).toUpperCase() + word.slice(1);

    function init() {
        const finder = document.getElementById('voice-finder');
        const results = document.getElementById('voice-results');
        if (!finder || !results) return;

        const input = document.getElementById('voice-search');
        const languageSelect = document.getElementById('voice-language');
        const genderSelect = document.getElementById('voice-gender');
        const pitchSelect = document.getElementById('voice-pitch');
        const clear = document.getElementById('voice-clear');
        const count = document.getElementById('voice-count');
        const status = document.getElementById('voice-status');
        const table = document.getElementById('voice-table');
        const scroller = table.closest('.wch-voicescroll');
        const body = table.tBodies[0];
        const more = document.getElementById('voice-more');

        let data = null;
        let voices = [];
        let languageLabels = [];
        let matches = [];
        let shown = 0;
        let failed = false;
        let statusTimer = 0;
        let inputTimer = 0;

        function announce(text) {
            clearTimeout(statusTimer);
            statusTimer = setTimeout(() => { status.textContent = text; }, 500);
        }

        // ---- Copy buttons (both tables) ----
        function copyLabel(id) {
            return fill(t('voices.copyLabel', 'Copy the voice ID {id}'), { id });
        }

        function copyButton(id) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'wc-chipbtn wch-copy';
            b.dataset.voiceId = id;
            b.textContent = t('voices.copy', 'Copy');
            b.setAttribute('aria-label', copyLabel(id));
            return b;
        }

        function resetCopyButton(b) {
            clearTimeout(b._timer);
            b.textContent = t('voices.copy', 'Copy');
            b.setAttribute('aria-label', copyLabel(b.dataset.voiceId));
        }

        function copyText(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text);
            }
            return new Promise((resolve, reject) => {
                const area = document.createElement('textarea');
                area.value = text;
                area.setAttribute('readonly', '');
                area.className = 'visually-hidden';
                document.body.appendChild(area);
                area.select();
                const ok = document.execCommand('copy');
                area.remove();
                if (ok) resolve(); else reject(new Error('copy failed'));
            });
        }

        document.addEventListener('click', (event) => {
            const b = event.target.closest && event.target.closest('.wch-copy');
            if (!b) return;
            const id = b.dataset.voiceId;
            copyText(id).then(() => {
                clearTimeout(b._timer);
                b.textContent = t('voices.copied', 'Copied');
                b.removeAttribute('aria-label');
                clearTimeout(statusTimer);
                status.textContent = fill(t('voices.copiedLabel', 'The voice ID {id} is on your clipboard.'), { id });
                b._timer = setTimeout(() => resetCopyButton(b), 2000);
                b.focus();
            }).catch(() => {
                status.textContent = fill(t('voices.copyFailed', 'The copy did not work. Select the voice ID {id} and copy it.'), { id });
            });
        });

        document.querySelectorAll('#voice-studio-table .wch-voiceid').forEach((cell) => {
            const code = cell.querySelector('code');
            if (code && !cell.querySelector('.wch-copy')) cell.appendChild(copyButton(code.textContent.trim()));
        });

        // ---- Labels ----
        const genderLabel = (i) => t('voices.gender.' + GENDERS[i], cap(GENDERS[i]));
        const pitchLabel = (i) => t('voices.pitch.' + PITCHES[i], cap(PITCHES[i]));

        function languageNames(locale) {
            let names = null;
            try { names = new Intl.DisplayNames([locale], { type: 'language' }); } catch (e) { /* old browser */ }
            return data.languages.map((code) => {
                try { return (names && names.of(code)) || code; } catch (e) { return code; }
            });
        }

        function setOptions(select, options) {
            const value = select.value;
            select.replaceChildren(...options.map(([optionValue, label]) => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = label;
                return option;
            }));
            select.value = value;
            if (select.selectedIndex < 0) select.selectedIndex = 0;
        }

        function relabel() {
            document.querySelectorAll('.wch-copy').forEach(resetCopyButton);
            if (failed) {
                count.textContent = t('voices.finder.error', 'The voice list did not load. Load the page again.');
                return;
            }
            if (!data) {
                count.textContent = t('voices.finder.loading', 'The voice list is loading.');
                return;
            }
            const locale = document.documentElement.lang || 'en';
            languageLabels = languageNames(locale);
            const english = locale === 'en' ? languageLabels : languageNames('en');
            const every = t('voices.everyLanguage', 'Every language');

            // The text that the search reads: the data, and the language name in English
            // and in the page language.
            voices.forEach((v) => {
                const language = v.language < 0
                    ? every
                    : [data.languages[v.language], english[v.language], languageLabels[v.language], data.accents[v.accent]].join(' ');
                v.hay = fold([v.id, v.name, language, v.description].join(' '));
            });

            const sorted = data.languages.map((code, i) => [String(i), languageLabels[i]])
                .sort((a, b) => a[1].localeCompare(b[1], locale));
            setOptions(languageSelect, [
                ['', t('voices.finder.allLanguages', 'All languages')],
                ['studio', t('voices.finder.studioOption', 'Every language')],
                ...sorted,
            ]);
            setOptions(genderSelect, [['', t('voices.finder.anyGender', 'Any gender')],
                ...GENDERS.map((g, i) => [String(i), genderLabel(i)])]);
            setOptions(pitchSelect, [['', t('voices.finder.anyPitch', 'Any pitch')],
                ...PITCHES.map((p, i) => [String(i), pitchLabel(i)])]);
            apply(false);
        }

        // ---- Table ----
        function cell(tag, text, lang) {
            const el = document.createElement(tag);
            if (text) el.textContent = text;
            if (lang) el.lang = lang;
            return el;
        }

        function row(v) {
            const tr = document.createElement('tr');
            const name = cell('th', v.name, 'en');
            name.scope = 'row';

            const id = cell('td');
            id.className = 'wch-voiceid';
            id.append(cell('code', v.id), copyButton(v.id));

            const language = cell('td');
            if (v.language < 0) {
                language.textContent = t('voices.everyLanguage', 'Every language');
            } else {
                const accent = cell('span', data.accents[v.accent], 'en');
                accent.className = 'wch-voiceaccent';
                language.append(cell('span', languageLabels[v.language]), accent);
            }

            tr.append(name, id, language, cell('td', genderLabel(v.gender)), cell('td', pitchLabel(v.pitch)),
                cell('td', v.description, 'en'));
            return tr;
        }

        function countText() {
            const found = fill(t('voices.finder.count', 'Voices found: {n}.'), { n: matches.length });
            if (shown >= matches.length) return found;
            return found + ' ' + fill(t('voices.finder.shown', 'The table shows the first {shown}.'), { shown });
        }

        function renderMore() {
            const next = matches.slice(shown, shown + BATCH);
            const fragment = document.createDocumentFragment();
            next.forEach((v) => fragment.appendChild(row(v)));
            const first = fragment.firstChild;
            body.appendChild(fragment);
            shown += next.length;
            more.hidden = shown >= matches.length;
            count.textContent = matches.length
                ? countText()
                : t('voices.finder.none', 'No voices match. Change the search words or clear the filters.');
            return first;
        }

        function apply(speak) {
            if (!data) return;
            const terms = fold(input.value).split(/\s+/).filter(Boolean);
            const language = languageSelect.value;
            const gender = genderSelect.value;
            const pitch = pitchSelect.value;

            matches = voices.filter((v) => {
                if (language === 'studio' ? v.language >= 0 : language !== '' && v.language !== Number(language)) return false;
                if (gender !== '' && v.gender !== Number(gender)) return false;
                if (pitch !== '' && v.pitch !== Number(pitch)) return false;
                return terms.every((term) => v.hay.includes(term));
            });

            shown = 0;
            body.replaceChildren();
            scroller.hidden = matches.length === 0;
            renderMore();
            clear.disabled = !(input.value || language || gender || pitch);
            if (speak !== false) announce(count.textContent);
        }

        input.addEventListener('input', () => {
            clearTimeout(inputTimer);
            inputTimer = setTimeout(apply, 120);
        });
        [languageSelect, genderSelect, pitchSelect].forEach((select) => select.addEventListener('change', apply));

        clear.addEventListener('click', () => {
            input.value = '';
            [languageSelect, genderSelect, pitchSelect].forEach((select) => { select.selectedIndex = 0; });
            apply();
            input.focus();
        });

        more.addEventListener('click', () => {
            const first = renderMore();
            // The button goes away after the last batch. Keep the focus in the new rows.
            if (more.hidden && first) first.querySelector('.wch-copy').focus();
            announce(count.textContent);
        });

        finder.hidden = false;
        results.hidden = false;
        scroller.hidden = true;
        clear.disabled = true;
        relabel();
        document.addEventListener('i18n:translated', relabel);

        fetch('data/voices.json')
            .then((response) => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then((json) => {
                data = json;
                voices = json.voices.map((v) => ({
                    id: v[0], name: v[1], language: v[2], accent: v[3], gender: v[4], pitch: v[5], description: v[6], hay: '',
                }));
                relabel();
            })
            .catch((error) => {
                failed = true;
                console.error('Voice list:', error);
                relabel();
            });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
