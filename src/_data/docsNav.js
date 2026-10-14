// The docs table of contents: one source for the sidebar, the previous/next
// pager, the home page's product lists and each page's "On this page" list.
//
// Each page names the i18n catalog its content keys live in (`catalog`): the
// content was moved out of the three long pages unchanged, so a Sage page still
// reads botcommands-<lang>.json, a TTS page wildcat-tts-<lang>.json and an
// overlay page chatoverlay-<lang>.json. Titles and ledes are shared docs chrome
// and live in common-<lang>.json under `docsNav.pages.<id>`.
//
// `sections` are the ids of the old pages' sections that the page now holds, in
// order: a record of where each part of botcommands.html, wildcatttsdocs.html
// and chatoverlay.html went. _data/legacyAnchors.json maps every old id to its
// new page, and scripts/legacy-anchors.js uses it to forward old deep links.
// Each page's "On this page" list is in its own front matter (`toc`).

module.exports = [
    {
        id: "start",
        label: "Get started",
        items: [
            { id: "home", url: "index.html", catalog: "index", title: "Overview" },
        ],
    },
    {
        id: "sage",
        label: "WildcatSage",
        legacy: "botcommands.html",
        items: [
            {
                id: "sage-setup", url: "sage-setup.html", catalog: "botcommands",
                title: "Set up the dashboard",
                lede: "Sign in to the WildcatSage dashboard, add the bot to your channel, and review the permissions it asks for.",
                sections: ["web-dashboard"],
            },
            {
                id: "sage-commands", url: "sage-commands.html", catalog: "botcommands", commands: true,
                title: "Commands",
                lede: "Every WildcatSage chat command. Select a command to see its options. Commands marked Mod work for moderators and the broadcaster only.",
                sections: ["general", "custom-commands", "memory-commands", "games", "config"],
            },
            {
                id: "sage-custom-commands", url: "sage-custom-commands.html", catalog: "botcommands",
                title: "Custom commands & variables",
                lede: "Variables you can put in custom command responses, with examples, and how AI commands write a new reply each time.",
                sections: ["response-variables"],
            },
            {
                id: "sage-personality", url: "sage-personality.html", catalog: "botcommands",
                title: "Bot personality",
                lede: "Change how WildcatSage talks in your channel, and the rules that stay in place whatever you write.",
                sections: ["bot-personality"],
            },
            {
                id: "sage-memory", url: "sage-memory.html", catalog: "botcommands",
                title: "Channel memory",
                lede: "What WildcatSage remembers about your channel from one stream to the next, and how viewers and moderators control it.",
                sections: ["channel-memory"],
            },
            {
                id: "sage-language", url: "sage-language.html", catalog: "botcommands",
                title: "Bot language",
                lede: "How WildcatSage picks the language it replies in, and how to set it yourself.",
                sections: ["bot-language"],
            },
            {
                id: "sage-checkin", url: "sage-checkin.html", catalog: "botcommands",
                title: "Daily check-in",
                lede: "Let viewers check in once a day with a Channel Points reward, and choose what the bot replies.",
                sections: ["daily-check-in"],
            },
        ],
    },
    {
        id: "tts",
        label: "WildcatTTS",
        legacy: "wildcatttsdocs.html",
        items: [
            {
                id: "tts-setup", url: "tts-setup.html", catalog: "wildcat-tts",
                title: "Set up the dashboard & OBS",
                lede: "Configure WildcatTTS in the Web Dashboard, calibrate voice volume, and add the audio to OBS.",
                sections: ["web-dashboard"],
            },
            {
                id: "tts-commands", url: "tts-commands.html", catalog: "wildcat-tts", commands: true,
                title: "Commands",
                lede: "Every WildcatTTS chat command. Select a command to see its options. Commands marked Mod work for moderators and the broadcaster only.",
                sections: ["commands"],
            },
            {
                id: "tts-voices", url: "tts-voices.html", catalog: "wildcat-tts",
                title: "Voices & language boost",
                lede: "Pick a voice from the full list, and tell the voice engine which language your chat speaks.",
                sections: ["voices", "language-boost"],
            },
            {
                id: "tts-filtering", url: "tts-filtering.html", catalog: "wildcat-tts",
                title: "Filtering & pronunciation",
                lede: "Control what TTS says aloud: describe emotes, expand chat short forms, soften rude words, and skip messages with banned words.",
                sections: ["emote-descriptions", "pronunciation", "profanity-filter", "banned-words"],
            },
            {
                id: "tts-events", url: "tts-events.html", catalog: "wildcat-tts",
                title: "Stream events & privacy",
                lede: "Choose which stream events TTS announces, how it treats other bots' commands, and how it reads links aloud.",
                sections: ["event-controls", "chat-commands", "url-reading"],
            },
            {
                id: "tts-youtube", url: "tts-youtube.html", catalog: "wildcat-tts",
                title: "YouTube chat",
                lede: "Read YouTube Live chat aloud next to your Twitch chat when you stream to both.",
                sections: ["youtube-tts"],
            },
            {
                id: "tts-troubleshooting", url: "tts-troubleshooting.html", catalog: "wildcat-tts",
                title: "Troubleshooting",
                lede: "Fixes for the most common WildcatTTS problems.",
                sections: ["troubleshooting"],
            },
        ],
    },
    {
        id: "overlay",
        label: "Chat Overlay",
        legacy: "chatoverlay.html",
        items: [
            {
                id: "overlay-obs", url: "overlay-obs.html", catalog: "chatoverlay",
                title: "Set up in OBS",
                lede: "The Wildcat Chat Overlay shows Twitch and YouTube Live chat messages in OBS Studio. You can change its settings in the Chat Scene Creator on the web, or in the config panel of the OBS browser source.",
                sections: ["overview", "platforms", "obs-setup"],
            },
            {
                id: "overlay-appearance", url: "overlay-appearance.html", catalog: "chatoverlay",
                title: "Themes & appearance",
                lede: "Generate a theme from a description, then adjust colors, fonts, and how messages appear.",
                sections: ["customization", "colors", "fonts", "animations"],
            },
            {
                id: "overlay-emotes", url: "overlay-emotes.html", catalog: "chatoverlay",
                title: "Emotes",
                lede: "How the overlay shows BetterTTV, FrankerFaceZ, and 7TV emotes, including stacked emotes.",
                sections: ["emotes"],
            },
            {
                id: "overlay-scenes", url: "overlay-scenes.html", catalog: "chatoverlay",
                title: "Chat Scene Creator",
                lede: "Save named chat scenes on the web, sync changes to OBS live, and use the config panel inside OBS.",
                sections: ["scenes", "config"],
            },
            {
                id: "overlay-url", url: "overlay-url.html", catalog: "chatoverlay",
                title: "URL parameters",
                lede: "Settings you can put in the overlay URL, diagnostic messages, and demo mode.",
                sections: ["url-parameters"],
            },
        ],
    },
];
