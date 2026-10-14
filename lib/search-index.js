// Full-text search index for the docs search dialog (scripts/search.js).
//
// Page text is English in the HTML and translated in the browser from the
// data-i18n keys (scripts/i18n.js), so the index is built in two steps:
//
//   1. collect() runs on each rendered topic page. It splits the page's content
//      into records -- one per h2/h3 and one per command row -- and keeps each
//      piece of text as its i18n key (with the English as fallback) or as
//      literal text. Headings without an id get one, so every record can be
//      linked to.
//   2. write() runs after the build. For each language it resolves the keys
//      against that language's catalogs and writes search/<lang>.json.

const fs = require("fs");
const path = require("path");
const { parse } = require("node-html-parser");

const docsNav = require("../src/_data/docsNav.js");

const I18N_DIR = path.join(__dirname, "..", "src", "i18n");
const KEY_ATTRS = ["data-i18n", "data-i18n-key", "data-i18n-cmd"];
const SKIP_TAGS = new Set(["script", "style", "template", "svg"]);

// "/tts-filtering.html" -> its docsNav entry, with the group it sits in.
const pagesByUrl = new Map();
for (const g of docsNav) {
    for (const it of g.items) pagesByUrl.set("/" + it.url, { ...it, group: g.id });
}

// Records per page id, filled while pages render. A module-level map so
// `eleventy --serve` rebuilds keep the pages that did not change.
const records = new Map();

function keyOf(el) {
    for (const a of KEY_ATTRS) {
        const k = el.getAttribute(a);
        if (k) return k;
    }
    return null;
}

const clean = (s) => s.replace(/\s+/g, " ").trim();

// "profanityFilter.startTitle" -> "profanity-filter-start"
function slugFromKey(key) {
    return key
        .replace(/\.?title$/i, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
}

function slugFromText(text) {
    return clean(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
}

// A heading's text as a unit: its key, or its literal text.
function headingUnit(el) {
    const k = keyOf(el);
    return k ? { k, en: clean(el.text) } : { t: clean(el.text) };
}

// Collect the text under `node` into `units`, keyed elements as keys.
function pushText(node, units) {
    for (const child of node.childNodes) {
        if (child.nodeType === 3) {
            const t = clean(child.text);
            if (t) units.push({ t });
        } else if (child.nodeType === 1) {
            const tag = child.rawTagName.toLowerCase();
            if (SKIP_TAGS.has(tag) || child.classList.contains("dropdown-toggle")) continue;
            const k = keyOf(child);
            if (k) units.push({ k, en: clean(child.text) });
            else pushText(child, units);
        }
    }
}

// The command as typed in chat: the first cell's own text, without the Mod
// badge or a keyed alias line (that is translated, so it goes in as a unit).
function commandName(cell, units) {
    let name = "";
    (function walk(node) {
        for (const child of node.childNodes) {
            if (child.nodeType === 3) name += child.text;
            else if (child.nodeType === 1) {
                if (child.classList.contains("mod-badge")) continue;
                const k = child.getAttribute("data-i18n");
                if (k) units.push({ k, en: clean(child.text) });
                else walk(child);
            }
        }
    })(cell);
    return clean(name);
}

/**
 * Index one rendered page and give its id-less headings an id.
 * Returns the HTML with those ids added; other bytes are left untouched.
 */
function collect(html, url) {
    const page = pagesByUrl.get(url);
    if (!page || page.id === "home") return html;

    const root = parse(html);
    const prose = root.querySelector(".wch-prose");
    if (!prose) return html;

    const taken = new Set(root.querySelectorAll("[id]").map((el) => el.id));
    const inserts = []; // [offset, text], spliced in from the end

    function anchorFor(heading) {
        if (heading.id) return heading.id;
        // A section's own title links to the section, whose id old links already use.
        const parent = heading.parentNode;
        if (heading.rawTagName.toLowerCase() === "h2" && parent && parent.id
            && parent.childNodes.find((n) => n.nodeType === 1) === heading) {
            return parent.id;
        }
        const k = keyOf(heading);
        const base = k ? slugFromKey(k) : slugFromText(heading.text);
        let id = base;
        for (let n = 2; taken.has(id); n++) id = base + "-" + n;
        taken.add(id);
        inserts.push([heading.range[0] + heading.rawTagName.length + 1, ` id="${id}"`]);
        return id;
    }

    const lead = { a: "", h: null, units: [{ k: `docsNav.pages.${page.id}.lede`, en: page.lede || "" }] };
    const out = [lead];
    let cur = lead;

    function walk(node) {
        for (const child of node.childNodes) {
            if (child.nodeType === 3) {
                const t = clean(child.text);
                if (t) cur.units.push({ t });
                continue;
            }
            if (child.nodeType !== 1) continue;
            const tag = child.rawTagName.toLowerCase();
            if (SKIP_TAGS.has(tag)) continue;

            if (tag === "tbody" && child.classList.contains("dropdown-group")) {
                const summary = child.querySelector(".dropdown-summary");
                const details = child.querySelector(".dropdown-details");
                const cells = summary
                    ? summary.childNodes.filter((n) => n.nodeType === 1 && n.rawTagName.toLowerCase() === "td")
                    : [];
                if (!cells.length) continue;
                const units = [];
                const name = commandName(cells[0], units);
                if (cells[1]) {
                    const k = cells[1].getAttribute("data-i18n-key");
                    const desc = cells[1].querySelector(".description-text") || cells[1];
                    if (k) units.push({ k, en: clean(desc.text) });
                    else pushText(desc, units);
                }
                if (details) pushText(details, units);
                out.push({ a: (details && details.id) || cur.a, h: { t: name }, c: 1, units });
                continue;
            }

            if (tag === "h2" || tag === "h3") {
                cur = { a: anchorFor(child), h: headingUnit(child), units: [] };
                out.push(cur);
                continue;
            }

            const k = keyOf(child);
            if (k) cur.units.push({ k, en: clean(child.text) });
            else walk(child);
        }
    }
    walk(prose);

    records.set(page.id, { page, records: out });

    inserts.sort((a, b) => b[0] - a[0]);
    for (const [at, text] of inserts) html = html.slice(0, at) + text + html.slice(at);
    return html;
}

// Same deep merge as mergeTranslations() in scripts/i18n.js: the page catalog wins.
function merge(base, override) {
    const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
    const out = { ...base };
    for (const [k, v] of Object.entries(override)) {
        out[k] = isObj(v) && isObj(out[k]) ? merge(out[k], v) : v;
    }
    return out;
}

function readCatalog(name) {
    try {
        return JSON.parse(fs.readFileSync(path.join(I18N_DIR, name), "utf8"));
    } catch (e) {
        return {};
    }
}

function lookup(tree, key) {
    let v = tree;
    for (const part of key.split(".")) {
        if (v && typeof v === "object" && Object.prototype.hasOwnProperty.call(v, part)) v = v[part];
        else return null;
    }
    return typeof v === "string" ? v : null;
}

// Catalog strings may hold markup; the index wants plain text.
const plain = (s) => clean(parse(s).text);

function write(outputDir) {
    const langs = fs.readdirSync(I18N_DIR)
        .map((f) => /^common-([a-z]{2})\.json$/.exec(f))
        .filter(Boolean)
        .map((m) => m[1]);
    const order = docsNav.flatMap((g) => g.items.map((it) => it.id));
    const pages = [...records.values()].sort((a, b) => order.indexOf(a.page.id) - order.indexOf(b.page.id));

    fs.mkdirSync(path.join(outputDir, "search"), { recursive: true });
    for (const lang of langs) {
        const catalogs = new Map();
        const catalogFor = (lg, name) => {
            const id = lg + ":" + name;
            if (!catalogs.has(id)) {
                catalogs.set(id, merge(readCatalog(`common-${lg}.json`), readCatalog(`${name}-${lg}.json`)));
            }
            return catalogs.get(id);
        };

        const entries = [];
        for (const { page, records: recs } of pages) {
            const tr = catalogFor(lang, page.catalog);
            const en = catalogFor("en", page.catalog);
            const text = (u) => {
                if (!u) return "";
                if (u.t !== undefined) return u.t;
                const s = lookup(tr, u.k) ?? lookup(en, u.k);
                return s === null ? u.en : plain(s);
            };
            const g = text({ k: `docsNav.groups.${page.group}`, en: page.group });
            const p = text({ k: `docsNav.pages.${page.id}.title`, en: page.title });
            for (const r of recs) {
                const entry = {
                    u: page.url + (r.a ? "#" + r.a : ""),
                    g,
                    p,
                    h: r.h ? text(r.h) : "",
                    t: clean(r.units.map(text).join(" ")),
                };
                if (r.c) entry.c = 1;
                if (entry.h || entry.t) entries.push(entry);
            }
        }
        fs.writeFileSync(path.join(outputDir, "search", `${lang}.json`), JSON.stringify(entries));
    }
}

module.exports = { collect, write };
