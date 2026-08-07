// Directory data file — applies to every template under src/.
//
// Eleventy's default permalink turns `botcommands.html` into
// `botcommands/index.html`, which would change every live URL, break the
// internal `href="botcommands.html"` links, and break the firebase.json
// rewrite that names `/wildcatttsdocs.html` explicitly.
//
// `filePathStem` is `/index`, `/botcommands`, … so this reproduces the input
// filename exactly. Doing it here rather than per-page means a future page
// cannot silently acquire a different URL shape.
module.exports = {
    permalink: (data) => `${data.page.filePathStem}.html`,
};
