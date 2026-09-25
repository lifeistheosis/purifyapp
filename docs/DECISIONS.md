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
- DECIDED by the owner, 2026-09-25: the Family system (docs/design/family-matrix-and-catechumen-corner.md) is built in 1.5, not 1.4. Members are 13 and older, each with their own account: no child profiles, so no COPPA or GDPR-K handling of children's religious data.
- ASK (owner had no preference, 2026-09-25): how Family fits Plus. Default the 1.5 build assumes: the organizer holds Plus and members join free. Alternatives offered: every member needs Plus; a separate Family plan; Family free for all.
- DECIDED by the owner, 2026-09-25: NO BLESSING OPTION in the shop, ever. Charging for a blessing, even as "handling", puts a price on the grace of the Holy Spirit (simony). The 1.4 plan's blessing items (shop-simple.md "Blessing", MASTER.md item 13, a4e358b8) are cancelled, not deferred. Do not build, restore or propose it.
- DECIDED by the owner, 2026-09-25: no rename. "Purify Premium" is the umbrella name for both paid plans, Plus and Pro, and stays wherever it means both (the nav button, the account row that leads to /pricing). "Purify Plus" and "Purify Pro" name the plans themselves. So "Premium" is not a C5 violation where it means the pair; it is one wherever it stands in for a single plan.
- DECIDED by the owner, 2026-09-25: Purify Plus is enforced. A free reader sees every Plus feature, and using one opens the Plus sheet. Web and Android lock by default wherever the build carries that store's purchase key; iOS stays open until its App Store products are live; `NEXT_PUBLIC_PLUS_ENFORCED_<SURFACE>=false` is the emergency off switch. See `lib/entitlements/entitlements.ts`. Before the merge that turns it on: the API.Bible licence, then `scripts/grandfather-plus.mjs`, because the terms promise Plus never paywalls what was free.
- The fasting "streak" copy and the "prayer streak" sync strings are pre-existing C3/C5 conflicts, flagged and left alone.
