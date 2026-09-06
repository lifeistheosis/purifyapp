# Decisions

One line each, with the reason. "Your call" items from build specs are
recorded here when they are resolved. Items marked ASK are waiting on the
owner; the default the plan assumes is stated.

## v1.4 (proposed 2026-09-05, pending owner review)

### Today's Catechism
- Question types at launch: multiple choice, true/false, fill-the-word. Match-pairs deferred: needs drag to stay clean at 360px.
- Pool weighting: 1 / (1 + days since last shown in the trailing 7 days), times a tag balance factor. Replayable from the seed, no state.
- `quiz_daily` is written lazily by the attempt route, not by a nightly job: scheduled Actions are on hold and the set is a pure function anyway.
- The bank is canonical in `data/catechism/questions.json` and mirrored to `quiz_questions`: content lives in the repo like topics and heresies, the DB copy serves admin stats.
- Anonymous attempts stay in localStorage and post aggregate counters only: the correct-rate still counts them, nothing identifies them.
- Native offline uses the baked 400-day window, not the service worker: the SW precaches nothing by design and the window pattern already exists.
- Events: `analytics_events (name, props, ts)` with no session id, through `/api/track/event`. Per-question rate is a counter table, not event rows.

### Study Collections
- Practice mode is built: without it a collection cannot be finished in a human timescale from five a day.
- Completion is 100% of currently published questions with the tag, recomputed on read, `completed_at` never cleared.
- Themes extend `READING_THEMES` and the `data-reading-mode` token blocks: one system, one pre-paint allowlist.
- Theme application is enforced by a server write (`user_theme`) after `deriveEntitlements`; the client gate is the fast path only.
- ASK: should collection themes be gated while `PLUS_ENFORCED_*` is off? Default: follow the flags, like Candlelight and Monastery, so nothing is gated in production until the owner flips the switch.

### Supporter mark
- Denormalise expiry timestamps, not a boolean: lapse is then exact at read time with no nightly job.
- Opt-out lives on `profiles.show_supporter_mark` and rides `PROFILE_PREFS` so it syncs like focus and depth.
- Label is an i18n string; columns say `mark` to stay clear of the pre-launch `is_supporter`.
- ASK: do pre-launch supporters (`is_supporter`, no Plus) get the mark? Default: no, the spec derives it from Plus and Pro.
- Replies get the mark too: the spec's minimum is posts and replies.

### Admin panel "Ledger"
- Tokens are CSS variables on `[data-surface="admin"]` in `admin-theme.css`: that is the existing mechanism, no preset, no library.
- Sparklines are a hand-rolled SVG path generator: no dependency for forty lines.
- Light only, `color-scheme: light` forced on the admin root so an OS dark mode cannot pull the reading app's tokens in.
- Empty states are one muted sentence with a link where a setup exists. No illustrations.
- "Getting started" ships as a stub with the five items hardcoded and a hairline; it disappears on completion and its state lives in localStorage.
- Dark theme, the sound register, the casino reel and the audio assets are removed, not kept dormant. Streamer and larp modes stay: they are operator tools, not decoration.
- `--adm-good` retires; positive is `--adm-up` (gold), negative `--adm-down` (red). No green in the admin palette.
- Existing tab ids and URLs are kept; only the rail grouping changes.
- ASK: add Inter as a self-hosted font for numerics, or use DM Sans with tabular figures? Default: DM Sans, it is already loaded and the difference is small.
- ASK: default pinned KPI set. Proposed: Paid subscribers, MRR, Visitors 30d, New users 30d, Catechism completions today (empty until Feature A ships), Shop revenue 90d.
- Built 2026-09-05, the calls made on the way:
  - The rail starts at md (768), not lg, so the five-item bar stops exactly where the rail begins. Between 768 and 1023 the canvas is narrower than before; the spec asked for the bar below 768 and nothing else.
  - "Shop revenue 90d" is the sum of the last three calendar months from the revenue route's monthly ledger, the closest window the tree keeps; the tile's (i) says so. A true 90-day daily series would need a route change, which the spec forbids.
  - MRR has no daily history anywhere in the tree. The MRR side of the Summary chart shows the run rate and an honest empty plot with a link to Subscriptions, rather than drawing the shop series under an MRR label.
  - "DAU" is daily unique visitors from the traffic route, the closest daily count that exists.
  - A chart asked for three or more series draws small multiples, one ink line per plot, so every series stays on screen and the two-line rule holds.
  - The Getting started five: set goals, send a push, publish a patch note, check the shop, run the probes. Each row opens its tab.
  - The DataTable keeps its phone card mode at lg; only navigation moved to md.
  - Tabs the spec names that do not exist (Funnels, Retention, Parish codes, Catechism stats) are not added: an empty tab is a promise the panel cannot keep.
  - Missing values in the new components read "n/a", not a dash glyph, so no em dash lands in admin copy.

### Shop: simple product management
- No form library: the codebase has zod and hand-built forms, nothing else. Client validation is a small per-field check mirroring the zod schema.
- Soft delete via `deleted_at`, hidden from every list and every public read. Slugs of deleted products are not reused.
- Image processing in the Next media route with `sharp` moved to dependencies: that is the route already in use, there are no edge functions, and the saint-icon scripts already use sharp.
- Upload stays server-routed rather than a signed client upload: the file is re-encoded on the way in, and a client upload would skip that.
- No Stripe product or price objects: Checkout inlines the price per session today and the owner never touches Stripe. The spec's `stripe_*` columns are not added.
- Storefront keeps the dark theme: it is user-facing. Product URLs stay `/shop/icons/[slug]`; the native app depends on them.
- The twenty columns the nine-field form does not show stay in the table behind a "More" disclosure so the marketplace and sourcing keep working.
- ASK: turn on Stripe Tax? It is a setting in the Stripe account the owner holds; the code side is one flag in `checkout.ts`. Default: off until the owner enables tax in Stripe.
- ASK: US-only shipping stays? The spec says shipping is collected by Stripe; the tree allows US only. Default: unchanged.

### Cross-cutting
- Release branch `release/v1.4` off `main` as of f3dd3940; feature branches merge into it; the branch merges to `main` on drop day as the hard push.
- ASK: rename `nav.premium` "Premium" and the hardcoded "Purify Premium" row to "Purify Plus" in this release? C5 bans the word. Default: yes, two lines.
- The fasting "streak" copy and the "prayer streak" sync strings are pre-existing C3/C5 conflicts, flagged and left alone.
