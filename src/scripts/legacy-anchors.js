/**
 * legacy-anchors.js - Keeps old deep links working.
 *
 * botcommands.html, wildcatttsdocs.html and chatoverlay.html used to hold every
 * section of their product on one page. Their sections now live on topic pages,
 * and these three URLs list those pages. Chat bots, dashboards and old posts
 * still link "botcommands.html#games"; this sends such a link to the page that
 * holds the id now, keeping ?lang= and the anchor. The map is built from
 * _data/legacyAnchors.json, which lists every id each old page had.
 */
(function () {
    const data = document.getElementById('legacy-anchors');
    if (!data || !location.hash) return;
    let map;
    try { map = JSON.parse(data.textContent); } catch (e) { return; }
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
    // Only the map's own entries ("constructor" is not an old anchor), and only
    // to a page beside this one: the map holds bare names like "sage-commands.html".
    const dest = Object.prototype.hasOwnProperty.call(map, id) ? map[id] : null;
    if (typeof dest !== 'string' || !/^[a-z0-9-]+\.html$/.test(dest)) return;
    location.replace(dest + location.search + '#' + encodeURIComponent(id));
})();
