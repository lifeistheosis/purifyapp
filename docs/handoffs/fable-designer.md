# Baton: the Fable designer (the kit's look and the emails)

Written 2026-11-13 about 05:25 UTC by session_01VuYTwd6RkVo5JByCRXYJFG, at about 400,000 tokens of context. Card: `docs/roles/fable-designer.md`. Read `docs/brand/design-kit.md` and `docs/brand/kit/email/README.md` first: they are the whole look, with the reason for each choice.

## Role and scope

The look of the design kit (`docs/brand/kit/`: `pieces.css`, `artifact-template.html`, `email/`) and every design on it. Docs only. No app code, no token value changed, no send.

## Done since the session began, with hashes

- `5b4554e4` The email look: the reader email, its Nativity Fast, the owner's brief, in `docs/brand/kit/email/`.
- `42ddebe2` The emails' light is the kit's clean light.
- `4745f40c` The kit's look redone as one system with the emails; the kit's first email template gave way to `email/` (it is in history at `ef1bec40`, not yet in the Vault).
- `204e0265` Rule three (every design justified) in `design-kit.md`, with the reasons for the kit and the emails.
- `d8e80f3d` The emails' page carries the reasons.
- `344e972a` The three retention emails (six files), their page `retention.html` and their reasons.
- The design system on claude.ai updated in place by a helper (version 5): the components redrawn, Lead, Split, Bars and List added, Night sky's tokens added, no value changed.

## Open, each with its owner and next step

1. **His yes or no** on the kit's page and on the emails (the arbiter carries it). Nothing designed ships without it.
2. **His yes or no on the three retention emails** (https://claude.ai/artifact/XmM1TmiigBipdaPS8de1sg). The new words wait on it too. Before the switch goes on, the Retention emails chat (session_01VuYTwcNqhaVtjecwr5fvPv) confirms that saving a verse is free for every reader, and sets the address each button opens.
3. **A look in real Gmail, Apple Mail and Outlook**, light and dark, before any send. Owner: whoever sends first. Not done by anyone yet.
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

## His words that still apply

- "I really want the design to be a massive factor, because it's what keeps us apart from everyone else" (2026-11-12).
- "the design must be optimized for mobile." (2026-11-13 04:56 UTC)
- "and also stop using parchment for designs. (important because you always do this)" (2026-11-13 04:57 UTC)
- "you can definitely make a way better design than this. and ensure everything is optimized." (2026-11-13 05:05 UTC)
- "perfect let's build and I say yes or no to the design. you must justify your designs" (2026-11-13 05:15 UTC)
- No rays, no side stripes, no sparkle star, pills only where they belong, the heritage list kept out, spend only what was asked: one version, no variants (CLAUDE.md).

## Where things are

- The guide: `docs/brand/design-kit.md`. The kit: `docs/brand/kit/` (`tokens.css`, `pieces.css`, `artifact-template.html`, `check.mjs`). The emails: `docs/brand/kit/email/` (`build.mjs`, `page.mjs`, `check.mjs`, `README.md`, `img/`, `shots/`).
- The checks: `node docs/brand/kit/check.mjs` (the page, then the emails); `node docs/brand/kit/email/check.mjs` (the emails alone).
- The pages: the kit https://claude.ai/artifact/RErhbgPLD29CXemE9pi4Ht, the emails https://claude.ai/artifact/AGYSKjN65WgQA3eccBqos9, the retention emails https://claude.ai/artifact/XmM1TmiigBipdaPS8de1sg, the design system https://claude.ai/artifact/PJnQQWqgVybxZKzy2H3tt5.
