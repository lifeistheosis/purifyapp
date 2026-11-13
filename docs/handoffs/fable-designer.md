# Baton: the Fable designer (the kit's look and the emails)

Written 2026-11-13 about 05:25 UTC by session_01VuYTwd6RkVo5JByCRXYJFG, at about 400,000 tokens of context. Round 2 of the retention emails added the same day by session_01VuYTwavDnAtuKdXD2L7rti. Card: `docs/roles/fable-designer.md`. Read `docs/brand/design-kit.md` and `docs/brand/kit/email/README.md` first: they are the whole look, with the reason for each choice.

## Role and scope

The look of the design kit (`docs/brand/kit/`: `pieces.css`, `artifact-template.html`, `email/`) and every design on it. Docs only. No app code, no token value changed, no send.

## Done since the session began, with hashes

- `5b4554e4` The email look: the reader email, its Nativity Fast, the owner's brief, in `docs/brand/kit/email/`.
- `42ddebe2` The emails' light is the kit's clean light.
- `4745f40c` The kit's look redone as one system with the emails; the kit's first email template gave way to `email/` (it is in history at `ef1bec40`, not yet in the Vault).
- `204e0265` Rule three (every design justified) in `design-kit.md`, with the reasons for the kit and the emails.
- `d8e80f3d` The emails' page carries the reasons.
- `344e972a` The three retention emails (six files), their page `retention.html` and their reasons.
- **Round 2 of the retention emails** (his "retention emails could use a better design", 2026-11-13 about 05:31 UTC): each opens on one night card (`lead`) with the app's own picture for the step (`HEROES`), the app's own button (a pill as wide as its words, with its arrow, and a VML shape for Outlook), the first week's steps as a strip (`steps`), the fast's week as seven days with the calendar's own marks and a key (`weekStrip`), one button in the fasting companion (the calendar), Unsubscribe as a plain link, and type in the faces a mail app has (Georgia, each system's sans). The reader email and the brief are his yes ("yes look", 2026-11-13) and were not touched: `wear(1)` and `wear(2)` in `build.mjs` keep the two rounds apart, and their files are the same byte for byte. Republished at the same address with "Why it looks this way".
- The design system on claude.ai updated in place by a helper (version 5): the components redrawn, Lead, Split, Bars and List added, Night sky's tokens added, no value changed.

## Open, each with its owner and next step

1. **His yes or no** on the kit's page and on the emails (the arbiter carries it). Nothing designed ships without it.
2. **His yes or no on the three retention emails, round 2** (https://claude.ai/artifact/XmM1TmiigBipdaPS8de1sg). The new words wait on it too. Before the switch goes on, the Retention emails chat (session_01VuYTwcNqhaVtjecwr5fvPv) confirms that saving a verse is free for every reader, and sets the address each button opens.
3. **A look in real Gmail, Apple Mail and Outlook**, light and dark, before any send. Owner: whoever sends first. Not done by anyone yet.
3b. **Whether round 2's faces, button and foot go to the reader email and the brief**, once he says yes to round 2. They name Lora first and fall to Georgia or Times in a mail app, their button spans its card, and their Unsubscribe is an outlined button: the three things he was shown as generic in the retention emails. It is `wear(2)` in each maker, then a rebuild, the check and their page (https://claude.ai/artifact/AGYSKjN65WgQA3eccBqos9). His word, through the arbiter.
3c. **The kit page's button** (`.k-button`, `pieces.css`) spans its card on a phone, where the app's own keeps to its words. Same question, same word.
3d. **Pick up needs a picture for each book's cover and each saved saint**: a row in `HEROES` each, cut by `heroPicture`. One on the heritage list is left out and `lead` stands on its words. Only Romans is cut so far.
4. **The night for days 2 to 40** of the fast: `nightPicture(b, day, to)` in `email/build.mjs` draws any day; only day 1 is drawn. The pictures need a home on the main web. Owner: Admin's build.
5. **A fault in the Sunday email as it stands**: `lib/email/weekly.ts` names a day by its saint before its commemoration, so 20 and 21 November 2026 both read "The Most Holy Theotokos". Reported to the arbiter; owner: the arbiter's routing.

## Gotchas

- **A build reads the tokens when it runs.** After any change to `tokens.css`, run `node docs/brand/kit/email/build.mjs` (it rewrites the emails, pictures, stills and page) and `node docs/brand/kit/check.mjs --write`, then commit what changed.
- **checkMock cannot wear palettes on inline colours**, so `email/check.mjs` draws each email twice: once with every colour a custom property (checked on the palettes), once as sent, and holds the two equal piece by piece. A new email goes through `pen()` and its `c()` helper, never a typed colour.
- **Arabic mirroring fails on any one-sided padding or `align="left"`.** Gaps are cells (`gap(w)`), with `min-width`, or they collapse beside a 100% cell.
- **No link inside a sentence**: every link is its own 44px line (`link`, `linkRow`).
- **Where checkMock wears the app's Light, a design wears the clean light.** No design stands on parchment; `build.mjs` throws on it and both checks fail on it.
- **`page.mjs` must not import `build.mjs`** (a top-level await deadlock); `build.mjs` hands it what it needs.
- **The Artifact pages are published from the scratchpad copy**, which a new session does not have. Rebuild it: `node docs/brand/kit/email/build.mjs --artifact=<path>.html`, then publish to the same URL with the `shots/` files. The kit page's published copy is `artifact-template.html`'s style and body, plus a "Why" section and a palette choice (see the live page).
- **The design system's `tokens.json` still holds the first look's type styles** (a 28px Lora 700 title, an uppercase tracked eyebrow), left alone because no token value was to change. Its README gives the kit's sizes. Changing them needs the arbiter's word.
- `npm ci` is needed once in a fresh container (the calendar's real week was read with a throwaway vitest file, removed).

- **The native export cannot be built in a container with no Supabase address and key** (`/shop/[store]` asks the database for its stores and the export stops). The calendar's picture is cut from the store pictures' own screen of the 1.9 export (`docs/plans/v1.9/store/appstore-iphone-6.9-07-calendar.png`), which was taken as the store build is cut.
- **Round 2's stills are drawn in `faces/`** (Gelasio as Georgia, and Roboto), and the check measures their widths in them. Round 1's stills stay as he saw them. This machine's own fallbacks are a Times and an Arial, which no reader sees.
- **The check's width is the width asked for**, not `window.innerWidth`: a phone's browser widens its window to fit what spills.
- **A night card's words wear the night's own colours inline** (`NIGHT`), not `c()`, because the card is a dark island on every palette. Its button takes `island: true`.

## His words that still apply

- "I really want the design to be a massive factor, because it's what keeps us apart from everyone else" (2026-11-12).
- "the design must be optimized for mobile." (2026-11-13 04:56 UTC)
- "and also stop using parchment for designs. (important because you always do this)" (2026-11-13 04:57 UTC)
- "you can definitely make a way better design than this. and ensure everything is optimized." (2026-11-13 05:05 UTC)
- "perfect let's build and I say yes or no to the design. you must justify your designs" (2026-11-13 05:15 UTC)
- "retention emails could use a better design" (2026-11-13 about 05:31 UTC, on round 1)
- No rays, no side stripes, no sparkle star, pills only where they belong, the heritage list kept out, spend only what was asked: one version, no variants (CLAUDE.md).

## Where things are

- The guide: `docs/brand/design-kit.md`. The kit: `docs/brand/kit/` (`tokens.css`, `pieces.css`, `artifact-template.html`, `check.mjs`). The emails: `docs/brand/kit/email/` (`build.mjs`, `page.mjs`, `check.mjs`, `README.md`, `img/`, `shots/`).
- The checks: `node docs/brand/kit/check.mjs` (the page, then the emails); `node docs/brand/kit/email/check.mjs` (the emails alone).
- The pages: the kit https://claude.ai/artifact/RErhbgPLD29CXemE9pi4Ht, the emails https://claude.ai/artifact/AGYSKjN65WgQA3eccBqos9, the retention emails https://claude.ai/artifact/XmM1TmiigBipdaPS8de1sg, the design system https://claude.ai/artifact/PJnQQWqgVybxZKzy2H3tt5.
