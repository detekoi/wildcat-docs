module.exports = function (eleventyConfig) {
    // Static assets pass through unchanged. i18n is included here on purpose:
    // scripts/i18n.js fetches `./i18n/<page>-<lang>.json` at runtime, so the
    // JSON must land in the output tree verbatim rather than being treated as
    // Eleventy data files.
    eleventyConfig.addPassthroughCopy("src/styles");
    eleventyConfig.addPassthroughCopy("src/scripts");
    eleventyConfig.addPassthroughCopy("src/i18n");

    // Favicons. logo512.png was dropped: nothing referenced it -- there is no
    // manifest.json and no og:image/twitter:image tag on any page.
    eleventyConfig.addPassthroughCopy("src/favicon.ico");
    eleventyConfig.addPassthroughCopy("src/logo192.png");

    return {
        dir: {
            input: "src",
            output: "public",
            includes: "_includes",
        },
        htmlTemplateEngine: "njk",
    };
};
