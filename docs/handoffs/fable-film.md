# Baton: the documentary insert (Orthodox Christians in America, by the numbers)

Left by the Fable chat that made it (session_01VuYTwcDNgtc2nD71eLvVFB), 2026-11-13. That chat passed 200,000 tokens while the film rendered and finished the job rather than hand it over in the middle of a check. Anything further goes to a fresh chat, which reads this, `docs/promo/orthodox-america/BRIEF.md` and `RECORD.md`.

## Where it stands

- **Made and delivered, waiting for his yes or no.** One film, `.promo/orthodox-america/orthodox-america.mp4` (out of git): 132 seconds, 1920 by 1080, 30 frames a second, H.264, 13.9 MB, no sound stream.
- **His page:** https://claude.ai/artifact/R2MqhHYnXc7uiM8vzGCN4W (private to him). The film and its poster are in the page's own asset store (`/_blob/0b5620c3b0158e6e9b9c486d83998b5c`, `/_blob/74f5022b33a5bb0c77f6df29c78832ce`).
- **The arbiter has the report** (Arbiter 2, session_01VuYTwbacb8geNS4VjyJwQh).

## One question is open with him

Pew's page prints the third age band as "50 to 65" beside "65 and older". The film keeps Pew's words and says they are Pew's. If he would sooner it read "50 to 64", that is one word in `film.html` and one in `facts.mjs`, and it needs a second render, which is his to ask for.

## To change anything

- A word or a figure: `film.html` and `facts.mjs` together (`render.mjs --check` refuses one without the other), then `render.mjs --sheet` for stills. A new film is a new render: ask him first through the arbiter.
- The page: `page.mjs --video=<address> --poster=<address> --check`, then publish `.promo/orthodox-america/orthodox-america-film.html` to the same address with the Artifact tool (pass the `url`; read it first).
- A fresh container has neither the film nor the tools: `npm install @fontsource/dm-serif-display @fontsource/dm-sans us-atlas topojson-client` in `.promo/orthodox-america/tools`. The film itself can be fetched back from the page's asset store.
- `docs/brand/kit/check.mjs` imports Playwright by name; with no `node_modules` in the repo, link the session's own into `node_modules/playwright` to run it.

## Not done, by the brief

No vertical cut, no variants, no sound. Nothing went to the Vault because one version was made.
