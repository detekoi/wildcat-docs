const fs = require("node:fs");
const path = require("node:path");
const searchIndex = require("./lib/search-index.js");

function minifyCss(css) {
    return css.replace(
        /("(?:\\[\s\S]|[^"\\])*")|('(?:\\[\s\S]|[^'\\])*')|\/\*[\s\S]*?\*\/|\s*([{};,])\s*|:\s+|\s+/g,
        (m, dq, sq, punc) => {
            if (dq || sq) return m;
            if (m.startsWith("/*")) return "";
            if (punc) return punc;
            if (m.startsWith(":")) return ":";
            return " ";
        }
    ).replace(/;\}/g, "}").trim();
}

function safeMinifyHtml(html) {
    return html
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/^\s+/gm, "")
        .replace(/\n+/g, "\n")
        .trim();
}

function minifyJs(js) {
    const out = js
        .replace(/^\s*\/\*[\s\S]*?\*\/\s*$/gm, "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("//"))
        .join("\n");
    new Function(out);
    return out;
}

function minifyOutputAssets(outputDir) {
    const stylesDir = path.join(outputDir, "styles");
    if (fs.existsSync(stylesDir)) {
        for (const f of fs.readdirSync(stylesDir)) {
            if (!f.endsWith(".css")) continue;
            const p = path.join(stylesDir, f);
            fs.writeFileSync(p, minifyCss(fs.readFileSync(p, "utf8")));
        }
    }
    const scriptsDir = path.join(outputDir, "scripts");
    if (fs.existsSync(scriptsDir)) {
        for (const f of fs.readdirSync(scriptsDir)) {
            if (!f.endsWith(".js")) continue;
            const p = path.join(scriptsDir, f);
            try {
                fs.writeFileSync(p, minifyJs(fs.readFileSync(p, "utf8")));
            } catch (_) {
                // Keep original file if syntax check fails.
            }
        }
    }
}

module.exports = function (eleventyConfig) {
    if (typeof eleventyConfig.setServerPassthroughCopyBehavior === "function") {
        eleventyConfig.setServerPassthroughCopyBehavior("copy");
    }
    // Static assets pass through unchanged. i18n is included here on purpose:
    // scripts/i18n.js fetches `./i18n/<page>-<lang>.json` at runtime, so the
    // JSON must land in the output tree verbatim rather than being treated as
    // Eleventy data files.
    eleventyConfig.addPassthroughCopy("src/styles");
    eleventyConfig.addPassthroughCopy("src/scripts");
    eleventyConfig.addPassthroughCopy("src/i18n");

    // Favicons and compact navbar icon.
    eleventyConfig.addPassthroughCopy("src/favicon.ico");
    eleventyConfig.addPassthroughCopy("src/logo192.png");
    eleventyConfig.addPassthroughCopy("src/logo-nav.webp");
    eleventyConfig.addPassthroughCopy("src/robots.txt");

    // Docs navigation (src/_data/docsNav.js). Flattened once so the sidebar,
    // the previous/next pager and the page header read the same order.
    eleventyConfig.addFilter("flatNav", (groups) =>
        groups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.id }))));
    eleventyConfig.addFilter("navItem", (flat, id) => flat.find((it) => it.id === id) || null);
    eleventyConfig.addFilter("navGroup", (groups, id) => groups.find((g) => g.id === id) || null);
    eleventyConfig.addFilter("navNeighbor", (flat, id, step) => {
        const i = flat.findIndex((it) => it.id === id);
        return i < 0 ? null : flat[i + step] || null;
    });

    // Full-text search (lib/search-index.js): index each topic page as it renders
    // (the page itself is left as rendered), then write one search/<lang>.json per
    // language for scripts/search.js.
    eleventyConfig.addTransform("search-index", function (content) {
        if (this.page.outputPath && this.page.outputPath.endsWith(".html")) {
            searchIndex.collect(content, this.page.url);
            return safeMinifyHtml(content);
        }
        return content;
    });
    eleventyConfig.on("eleventy.after", ({ dir }) => {
        searchIndex.write(dir.output);
        minifyOutputAssets(dir.output);
    });

    return {
        dir: {
            input: "src",
            output: "public",
            includes: "_includes",
        },
        htmlTemplateEngine: "njk",
    };
};
