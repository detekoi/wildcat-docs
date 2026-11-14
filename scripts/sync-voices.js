#!/usr/bin/env node
// Writes the voice data for src/tts-voices.html from the voice catalog of the bot.
//
//   npm run sync:voices     write the two files below again
//   npm run check:voices    fail if the files do not match the catalog
//
// Source (the bot checkout must be next to this repo):
//   ../tts-twitch/src/components/tts/gemini-voices.json
//
// Output (generated, committed; do not edit by hand):
//   src/_data/voiceCatalog.json   read by Eleventy: the counts and the studio voices,
//                                 which tts-voices.html renders as a static table
//   src/data/voices.json          read by the browser (scripts/voice-finder.js): every
//                                 voice as a short array, so the file stays small
//
// To use a catalog from another place: node scripts/sync-voices.js --source <file>

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const argv = process.argv.slice(2);
const sourceArg = argv.indexOf("--source");
const SOURCE = sourceArg !== -1 && argv[sourceArg + 1]
    ? path.resolve(argv[sourceArg + 1])
    : path.join(ROOT, "..", "tts-twitch", "src", "components", "tts", "gemini-voices.json");
const CHECK = argv.includes("--check");

const BUILD_DATA = path.join(ROOT, "src", "_data", "voiceCatalog.json");
const BROWSER_DATA = path.join(ROOT, "src", "data", "voices.json");

// The browser file stores these as an index. voice-finder.js has the same lists.
const GENDERS = ["female", "male", "neutral"];
const PITCHES = ["low", "medium", "high"];

function fail(message) {
    console.error(message);
    process.exit(1);
}

if (!fs.existsSync(SOURCE)) fail(`Voice catalog not found: ${SOURCE}`);
const voices = JSON.parse(fs.readFileSync(SOURCE, "utf8")).voices;
if (!Array.isArray(voices) || voices.length === 0) fail(`No voices in ${SOURCE}`);

const seen = new Set();
for (const v of voices) {
    for (const field of ["id", "name", "language", "accent", "gender", "pitch", "description"]) {
        if (typeof v[field] !== "string" || !v[field]) fail(`Voice ${v.id || "?"} has no ${field}.`);
    }
    if (seen.has(v.id)) fail(`Voice ID ${v.id} is in the catalog two times.`);
    seen.add(v.id);
    if (!GENDERS.includes(v.gender)) fail(`Voice ${v.id} has an unknown gender: ${v.gender}`);
    if (!PITCHES.includes(v.pitch)) fail(`Voice ${v.id} has an unknown pitch: ${v.pitch}`);
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const studio = voices.filter((v) => v.studio).sort((a, b) => collator.compare(a.name, b.name));
const library = voices.filter((v) => !v.studio)
    .sort((a, b) => collator.compare(a.language, b.language) || collator.compare(a.name, b.name));

const languages = [...new Set(library.map((v) => v.language))].sort(collator.compare);
const accents = [...new Set(library.map((v) => v.accent))].sort(collator.compare);

const buildData = {
    total: voices.length,
    studioCount: studio.length,
    libraryCount: library.length,
    languageCount: languages.length,
    studio: studio.map(({ id, name, gender, pitch, description }) => ({ id, name, gender, pitch, description })),
};

// One voice: [id, name, language index (-1 = studio voice, every language),
// accent index (-1 for a studio voice), gender index, pitch index, description].
const browserData = {
    languages,
    accents,
    voices: [
        ...studio.map((v) => [v.id, v.name, -1, -1, GENDERS.indexOf(v.gender), PITCHES.indexOf(v.pitch), v.description]),
        ...library.map((v) => [v.id, v.name, languages.indexOf(v.language), accents.indexOf(v.accent),
            GENDERS.indexOf(v.gender), PITCHES.indexOf(v.pitch), v.description]),
    ],
};

const outputs = [
    [BUILD_DATA, JSON.stringify(buildData, null, 2) + "\n"],
    [BROWSER_DATA, JSON.stringify(browserData) + "\n"],
];

if (CHECK) {
    const stale = outputs.filter(([file, text]) => !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text);
    if (stale.length) {
        fail(`The voice data has drifted from ${SOURCE}:\n`
            + stale.map(([file]) => "  " + path.relative(ROOT, file)).join("\n")
            + "\nRun: npm run sync:voices");
    }
    console.log(`voice data in sync (${voices.length} voices)`);
} else {
    for (const [file, text] of outputs) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
        console.log(`${path.relative(ROOT, file)}  ${(text.length / 1024).toFixed(0)} KB`);
    }
    console.log(`${voices.length} voices: ${studio.length} studio, ${library.length} in ${languages.length} languages`);
}
