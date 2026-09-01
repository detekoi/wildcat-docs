// i18n.js - Internationalization handling

// Available languages
const AVAILABLE_LANGUAGES = {
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'it': 'Italiano',
  'pt': 'Português',
  'ja': '日本語',
  'ru': 'Русский'
  // Add more languages as needed
};

// Default language
const DEFAULT_LANGUAGE = 'en';

// Global variables
let currentLanguage = DEFAULT_LANGUAGE;
let translations = {};

// Sanitize HTML translations to prevent XSS (defense-in-depth)
const SAFE_TAGS = new Set(['a', 'br', 'code', 'em', 'i', 'span', 'strong']);
const SAFE_ATTRS = new Set(['href', 'class', 'target', 'rel', 'data-lucide']);

function sanitizeHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  sanitizeNode(template.content);
  return template.innerHTML;
}

function sanitizeNode(node) {
  const toRemove = [];
  for (const child of node.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      if (!SAFE_TAGS.has(child.tagName.toLowerCase())) {
        // Replace disallowed element with its text content
        toRemove.push(child);
      } else {
        // Strip disallowed attributes
        for (const attr of [...child.attributes]) {
          if (!SAFE_ATTRS.has(attr.name.toLowerCase())) {
            child.removeAttribute(attr.name);
          }
        }
        // Block dangerous URL schemes
        if (child.hasAttribute('href')) {
          // Entities are decoded by the time the value is read back, so a
          // payload like `java&#x09;script:` arrives carrying a literal control
          // character. Browsers strip those before resolving the scheme, so
          // strip them here too and match on the scheme rather than relying on
          // startsWith() against the raw value.
          const href = child.getAttribute('href')
            .replace(/[\u0000-\u0020\u007f-\u009f]/g, '')
            .toLowerCase();
          if (/^(?:javascript|data|vbscript):/.test(href)) {
            child.removeAttribute('href');
          }
        }
        sanitizeNode(child);
      }
    }
  }
  for (const el of toRemove) {
    el.replaceWith(document.createTextNode(el.textContent));
  }
}

// Initialize i18n
async function initI18n() {
  // Try to get language from URL parameter, e.g., ?lang=es
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');

  // Try to get language from localStorage (if previously selected)
  const storedLang = localStorage.getItem('preferredLanguage');

  // Try to get language from browser settings
  const browserLang = navigator.language.split('-')[0];

  // Determine which language to use (URL param takes precedence, then stored, then browser)
  let targetLang = langParam || storedLang || browserLang || DEFAULT_LANGUAGE;

  // If the target language is not available, fall back to default
  if (!AVAILABLE_LANGUAGES.hasOwnProperty(targetLang)) {
    targetLang = DEFAULT_LANGUAGE;
  }

  // Load translations
  await loadTranslations(targetLang);

  // Update language selector
  updateLanguageSelector(targetLang);

  // Apply translations
  translatePage();

  // Re-render Lucide icons after translations replace innerHTML
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Get the current page identifier for loading the correct translation file
function getCurrentPageId() {
  const path = window.location.pathname;
  // Check for index.html or root path first
  if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
    return 'index';
  } else if (path.includes('wildcatttsdocs')) {
    return 'wildcat-tts';
  } else if (path.includes('botcommands')) {
    return 'botcommands';
  } else if (path.includes('chatoverlay')) {
    return 'chatoverlay';
  }
  // Default to botcommands for backward compatibility
  return 'botcommands';
}

// Merge two translation trees, with the page's values winning.
//
// This has to be a deep merge. `nav`, `ui`, `page` and `table` all exist in
// both the common file and the page file, so Object.assign would replace whole
// branches -- taking `page.title`, `table.categories.*` and `meta.title` with
// it.
function mergeTranslations(base, override) {
  const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = (isPlainObject(value) && isPlainObject(out[key]))
      ? mergeTranslations(out[key], value)
      : value;
  }
  return out;
}

// Load translations from JSON files
async function loadTranslations(lang) {
  try {
    const pageId = getCurrentPageId();
    // Shared site chrome (nav, footer, badges) lives in one file per language
    // instead of being copied into all four page files -- which is how
    // nav.chatOverlayDocs and page.lastUpdated ended up missing on some pages,
    // and how the nav wording drifted between them. Fetched in parallel, so the
    // second request costs no extra latency.
    const [commonResponse, pageResponse] = await Promise.all([
      fetch(`./i18n/common-${lang}.json`),
      fetch(`./i18n/${pageId}-${lang}.json`)
    ]);

    if (!pageResponse.ok) {
      throw new Error(`Failed to load translations for ${lang}`);
    }
    const pageTranslations = await pageResponse.json();

    // The common file only carries chrome. If it alone is missing, the page is
    // still usable, so degrade instead of falling back to English wholesale.
    let commonTranslations = {};
    if (commonResponse.ok) {
      commonTranslations = await commonResponse.json();
    } else {
      console.error(`Failed to load shared translations for ${lang}`);
    }

    translations = mergeTranslations(commonTranslations, pageTranslations);
    currentLanguage = lang;

    // Store the preferred language
    localStorage.setItem('preferredLanguage', lang);

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Update URL if it doesn't already have the lang parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('lang') !== lang) {
      urlParams.set('lang', lang);
      // Preserve the fragment. Sidebar and in-page links are all anchors, so
      // dropping it here would bounce a reader from e.g. #lurk back to the top
      // of the page on load and on every language switch.
      const newUrl = window.location.pathname + '?' + urlParams.toString() + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }

    // Special styling for CJK languages
    if (['ja', 'zh', 'ko'].includes(currentLanguage)) {
      document.body.classList.add('cjk-language');
    } else {
      document.body.classList.remove('cjk-language');
    }

    return true;
  } catch (error) {
    console.error('Error loading translations:', error);
    // Fall back to default language if there's an error
    if (lang !== DEFAULT_LANGUAGE) {
      await loadTranslations(DEFAULT_LANGUAGE);
    }
    return false;
  }
}

// Get a translation by key (supports nested keys like "table.headers.command")
function getTranslation(key, defaultValue = null) {
  const keyPath = key.split('.');
  let result = translations;

  for (const part of keyPath) {
    if (result && result.hasOwnProperty(part)) {
      result = result[part];
    } else {
      return defaultValue;
    }
  }

  return result;
}

// Translate the entire page
function translatePage() {
  // First translate non-span elements with data-i18n
  document.querySelectorAll('h1[data-i18n], h2[data-i18n], h3[data-i18n], th[data-i18n], td[data-i18n]:not(.dropdown-summary td), caption[data-i18n], a[data-i18n], button[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = getTranslation(key);
    if (translation === null) return;
    if (translation.includes('<') && translation.includes('>')) {
      element.innerHTML = sanitizeHTML(translation);
    } else {
      element.textContent = translation;
    }
  });

  // Handle div elements with data-i18n that may contain HTML (like tip-text divs)
  document.querySelectorAll('div[data-i18n], p[data-i18n], em[data-i18n], li[data-i18n], strong[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = getTranslation(key);
    if (translation === null) return;
    if (translation.includes('<') && translation.includes('>')) {
      element.innerHTML = sanitizeHTML(translation);
    } else {
      element.textContent = translation;
    }
  });

  // Handle complete description translations
  document.querySelectorAll('span[data-i18n]').forEach(element => {
    // Skip elements that have nested i18n elements (we'll handle these separately)
    if (element.querySelector('[data-i18n]')) return;

    const key = element.getAttribute('data-i18n');
    const translation = getTranslation(key);
    if (translation === null) return;

    if (translation.includes('<') && translation.includes('>')) {
      element.innerHTML = sanitizeHTML(translation);
    } else {
      element.textContent = translation;
    }
  });

  // Handle nested translations (words inside descriptions)
  document.querySelectorAll('[data-i18n] [data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = getTranslation(key);
    if (translation === null) return;
    if (translation.includes('<') && translation.includes('>')) {
      element.innerHTML = sanitizeHTML(translation);
    } else {
      element.textContent = translation;
    }
  });

  // Handle data-i18n-key on span and other elements (not just table cells)
  document.querySelectorAll('span[data-i18n-key], code[data-i18n-key], p[data-i18n-key], li[data-i18n-key], button[data-i18n-key]').forEach(element => {
    const key = element.getAttribute('data-i18n-key');
    const translation = getTranslation(key);
    if (translation === null) return;
    if (translation.includes('<') && translation.includes('>')) {
      element.innerHTML = sanitizeHTML(translation);
    } else {
      element.textContent = translation;
    }
  });

  // Handle command examples that need parameter translation
  document.querySelectorAll('[data-i18n-cmd]').forEach(element => {
    if (element.tagName === 'CODE') {
      const key = element.getAttribute('data-i18n-cmd');
      const translation = getTranslation(key, null);

      if (translation) {
        // Replace only the parameters in the command example, keep the command structure
        element.textContent = translation;
      }
    }
  });

  // Translate attributes. Every pass above writes textContent or innerHTML, so
  // accessible names supplied by aria-label/alt/title stayed in English -- and
  // a hardcoded aria-label *outranks* the translated text for the accessible
  // name, so those elements announced as English no matter the locale.
  // setAttribute with the raw string: never route a translation into an
  // attribute through innerHTML.
  const TRANSLATED_ATTRIBUTES = {
    'data-i18n-aria-label': 'aria-label',
    'data-i18n-alt': 'alt',
    'data-i18n-title': 'title'
  };

  Object.keys(TRANSLATED_ATTRIBUTES).forEach(sourceAttr => {
    const targetAttr = TRANSLATED_ATTRIBUTES[sourceAttr];
    document.querySelectorAll('[' + sourceAttr + ']').forEach(element => {
      const translation = getTranslation(element.getAttribute(sourceAttr));
      if (translation === null) return;
      element.setAttribute(targetAttr, translation);
    });
  });

  // New-tab links. 73 of these are injected by translation strings rather than
  // written in the markup, and every pass above replaces innerHTML, so this has
  // to run after translation and re-apply every time. The existing visual
  // affordance is a CSS mask arrow with no text equivalent, hence the hint.
  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    link.setAttribute('rel', 'noopener noreferrer');

    let hint = link.querySelector('.new-tab-hint');
    if (!hint) {
      hint = document.createElement('span');
      hint.className = 'visually-hidden new-tab-hint';
      link.appendChild(hint);
    }
    hint.textContent = ' ' + getTranslation('ui.opensInNewTab', '(opens in a new tab)');
  });

  // Special handling for elements with HTML content or specific needs

  // Translate title
  document.title = getTranslation('meta.title', 'Bot Commands');

  // Translate command rows - preserve the dropdown toggle
  document.querySelectorAll('.dropdown-summary').forEach(row => {
    const commandCell = row.querySelector('td:first-child');
    const descriptionCell = row.querySelector('td:nth-child(2)');

    if (!commandCell || !descriptionCell) return;

    // Get the i18n keys
    const commandKey = commandCell.getAttribute('data-i18n-key'); // This will be null for !lurk and !botlang
    const descriptionKey = descriptionCell.getAttribute('data-i18n-key');

    // console.log('--- Processing row ---');
    // console.log('commandCell:', commandCell.outerHTML);
    // console.log('descriptionCell:', descriptionCell.outerHTML);
    // console.log('commandKey:', commandKey);
    // console.log('descriptionKey:', descriptionKey);

    // Only translate description if descriptionKey is present
    if (descriptionKey) { // Changed condition from (commandKey && descriptionKey)
      // No translation for commandCell here, it remains static HTML

      // The expand control wraps the cell's content. Write inside it, not into
      // the cell -- re-appending the caret to the cell would pull it out of the
      // button on every language switch, and the innerHTML fallback below would
      // destroy the button outright.
      const trigger = descriptionCell.querySelector('.dropdown-trigger') || descriptionCell;

      // Get the dropdown toggle element if it exists
      const dropdownToggle = trigger.querySelector('.dropdown-toggle');

      // Get the description text span
      const descriptionTextSpan = trigger.querySelector('.description-text');
      const translation = getTranslation(descriptionKey);
      if (translation === null) return;

      if (descriptionTextSpan) {
        if (translation.includes('<') && translation.includes('>')) {
          descriptionTextSpan.innerHTML = sanitizeHTML(translation);
        } else {
          descriptionTextSpan.textContent = translation;
        }
      } else {
        // Fallback if for some reason description-text span is not found
        if (translation.includes('<') && translation.includes('>')) {
          trigger.innerHTML = sanitizeHTML(translation);
        } else {
          trigger.textContent = translation;
        }
      }

      // Re-append the dropdown toggle (this part remains the same, but now it's safe)
      if (dropdownToggle) {
        trigger.appendChild(dropdownToggle);
      }
    } else {
      // console.log('Skipping row due to missing descriptionKey.');
    }
  });

  // Translate permission badges. These are real elements now, so the <style>
  // element that used to rewrite `.mod-command::before { content: ... }` is
  // gone -- this one pass covers every badge on the page.
  document.querySelectorAll('.mod-badge').forEach(badge => {
    badge.textContent = getTranslation('ui.mod', 'Mod');
  });

  renderLastUpdated();
}

// Render the "Last updated" line. last-updated.js owns *when* the date is known
// and publishes it as an ISO string in `data-iso`; this owns how it reads. The
// two used to write the element independently, each recovering the other's half
// by string-parsing textContent, which made the result order-dependent.
function renderLastUpdated() {
  const el = document.getElementById('last-updated');
  if (!el || !el.dataset.iso) return;

  const date = new Date(el.dataset.iso);
  if (isNaN(date.getTime())) return;

  // Format in the active language rather than a hardcoded 'en-US', which left
  // the date in US format on all 8 locales.
  const locale = document.documentElement.lang || DEFAULT_LANGUAGE;
  const formatted = date.toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  el.textContent = `${getTranslation('page.lastUpdated', 'Last updated')}: ${formatted}`;
}

// The date arrives asynchronously (GitHub API), so it can land after
// translatePage() has already run.
document.addEventListener('lastupdated:change', renderLastUpdated);

// Language selector: the native <select> in the navbar (see base.njk). The
// same control as the WildcatTTS dashboard, so the three sites match.
function createLanguageSelector() {
  const select = document.getElementById('page-language-select');
  if (!select || select.dataset.i18nBound) return;
  select.dataset.i18nBound = 'true';

  select.replaceChildren();
  for (const code of Object.keys(AVAILABLE_LANGUAGES)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = AVAILABLE_LANGUAGES[code];
    // Each label is written in the language it names; without this a screen
    // reader pronounces all of them with the page voice.
    option.lang = code;
    select.appendChild(option);
  }
  select.value = currentLanguage;

  // The whole page rewrites on selection with no other signal that anything
  // happened, so announce the change politely.
  const status = document.createElement('div');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  select.insertAdjacentElement('afterend', status);

  select.addEventListener('change', async () => {
    const code = select.value;
    await loadTranslations(code);
    translatePage();
    if (typeof lucide !== 'undefined') { lucide.createIcons(); }
    updateLanguageSelector(code);
    status.textContent = AVAILABLE_LANGUAGES[code] || code;
  });
}

// Update language selector to reflect current language
function updateLanguageSelector(lang) {
  const select = document.getElementById('page-language-select');
  if (!select) return;
  select.value = lang;
  select.setAttribute('aria-label', getTranslation('ui.languageSelector', 'Language'));
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  createLanguageSelector();
  initI18n().catch(error => console.error('Error initializing i18n:', error));
});