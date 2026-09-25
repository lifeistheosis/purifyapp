# v1.4 programme: every step, in order

Owner: Ven. Written 2026-09-05 from the five specs sent that day plus the
work already on main. One list, so nothing is in two heads. Each numbered
step is one PR or one owner action. Tiers: 🤫 silent (admin, no note),
📝 soft (readers see it, gets a note), 🚀 hard (the 1.4 drop: versions, CI,
store builds).

## The board, 2026-09-25

The release candidate is `claude/optimistic-cerf-dbfhtg`: main, plus
`feat/v1.4-restore` merged in, plus the iPad, desktop and Candlelight work,
plus the note, the checklist and the version bump. Checked against the code
on that branch, not against memory. Production could not be probed from the
session that wrote this (purifyapp.net was outside its network policy), so
"live" below means recorded live in the repo by a commit or doc that probed.

| # | Item | State |
|---|---|---|
| 1, 2 | Stripe and RevenueCat keys on Render | Owner. Not checkable from the repo. |
| 3 | The ASKs in `docs/DECISIONS.md` | Owner, open. "Purify Premium" is still hardcoded in `YouMobile.tsx`. |
| 4 | Question bank, collections, badge labels | Owner, open. Both JSON files are empty, so the catechism ships dark. The mark's label defaults to "Supporter". |
| 5 | Store prompt numbers | Owner, after each store serves 1.4. Both stay 0 until then. |
| 6, 7 | Stripe ledger, realized revenue | Done, on main. |
| 8 | Photo pipeline (sharp, HEIC) | Reverted with the 1.4 merge on 2026-09-13 and not restored. Deferred to 1.5. |
| 9 | "View on site", classification picker | Done. The picker on main (1a9e85ba); the link on this branch. It opened the store route, "Store not found", for every product. |
| 10 | `shop_simple` migration | Superseded. Soft delete and categories came in `20260918_shop_growth.sql`. The blessing config table has no migration, so the blessing is dark. |
| 11, 12 | Admin shop list and product form | Done differently on main: search, publish and pause, delete, drafts kept on the device, import from a link. |
| 13 | Blessing on the storefront | Reverted, not restored, and dark without its table. Deferred. |
| 14, 15 | Import the 28 seeded products, `docs/SHOP.md`, a test purchase | Not done. Owner and data work. Deferred. |
| 16 | Catechism migration | Tables answer on production (probed 2026-09-20). The file rides this branch, idempotent. It re-runs on merge, so it still wants the owner's sign-off. |
| 17 | Bank import | Blocked on item 4. |
| 18 to 20 | Catechism code | On this branch, dark until the bank exists. Not in the note. |
| 21 to 23 | Study Collections | On this branch, dark until collections exist. Not in the note. |
| 24 | Author mark migration | Columns answer on production (probed 2026-09-20). Same sign-off as 16. |
| 25 | Supporter mark | On this branch, in the note. Its opt-out was missing on desktop and printed a raw key on phones; both fixed (9e67e364). |
| 26 to 29 | Admin "Ledger" restyle | Reverted on 2026-09-13, not restored, no `ADMIN-STYLE.md`. Admin only. Owner's call whether it returns. |
| 30 | The drop | Prepared on this branch. What is left is the owner's, below. |
| 31 | Paywall translations | Done, on main (87d7e703). Enforcement stays off. |
| 32 | iPad multitasking, tab labels | On this branch, in the note. |
| 33, 34 | Desktop app, Discord status | On this branch. Not public, so not in the note. |
| 35 | Desktop prerequisites | Owner, open. `docs/DESKTOP.md`. |

**The note.** `data/changelog/entries.json` and `patches.json` carry 1.4,
filed under the Update Hierarchy, with `data/changelog/checklists/1.4.json`
(saints skipped: no new saints, lives, hymns or icons since 1.3). The same
note, as the admin queue takes it, is `docs/plans/v1.4/patch-note-1.4.json`.
It claims nothing dark: not the catechism, collections, blessing, cart deal,
free shipping, desktop app or Discord status. Every line was checked against
the commit that built it.

**What is left, all owner:**

1. Read the note. File it with
   `node scripts/patch-notes.mjs propose --file docs/plans/v1.4/patch-note-1.4.json --apply`
   and accept it in `/admin?tab=patch-notes`, or edit the draft already in
   the queue. Set the real date; the draft says 2026-09-25.
2. `node scripts/patch-notes.mjs pull --apply`, so the files match what you
   accepted, then `npm run build:android` and `npm run build:ios`.
3. Sign off the two migrations that ride the merge (items 16 and 24).
4. Merge to main. That deploys the site.
5. Run "Android build" and "iOS build (signed)". The iPad line in the note
   is true once the iOS 1.4 build is live; if iOS will lag, take that line
   out before publishing.
6. After each store serves 1.4, set its number in `lib/appUpdate/release.ts`.

## Already done on main (2026-09-04 and 05)

- Patch notes and the weekly board message live in tables, edited from
  /admin, with the Claude review queue. 🤫 shipped.
- iPad and Android tablet layout for the native shell; iOS target now
  iPhone and iPad. Code shipped 🤫, the store build is 🚀 item 30.
- Hero cards on the admin Overview no longer stretch. 🤫 shipped.
- A 1.4 patch note draft waits in the queue.

## Phase 0: unblock (owner actions, no code)

1. Set `STRIPE_SECRET_KEY` on Render if it is not already there. The Stripe
   ledger card says so if it is missing.
2. Set `REVENUECAT_V2_API_KEY` and `REVENUECAT_PROJECT_ID` on Render. That
   alone restores the real subscription figure in Revenue.
3. Decide the ASKs in `docs/DECISIONS.md`: theme gating while enforcement is
   off, pre-launch supporters and the mark, "Premium" rename, Inter or DM
   Sans, default pinned KPIs, Stripe Tax, US-only shipping.
4. Supply the catechism question bank (35 minimum), the collection list,
   the badge labels.
5. Check Play Console and App Store Connect: is a 1.3 build live anywhere?
   If yes, set the two prompt numbers in `lib/appUpdate/release.ts`.

## Phase 1: money visible (this week)

6. 🤫 Stripe ledger card in Revenue: every balance transaction, every type,
   all time, matched to shop orders and subscriptions, CSV. Built
   2026-09-05, awaiting push. Plan: `stripe-ledger.md`.
7. 🤫 Realized revenue by source uses Stripe when RevenueCat is unset.
   Same PR as 6.

## Phase 2: shop, before other shop work

8. 🤫 Photo pipeline: `sharp` in the media route, HEIC in, 1600px JPEG and a
   400px thumbnail out, 25 MB cap, multi-select. Plan: `shop-simple.md`.
9. 🤫 Two one-line fixes: "View on site" uses `productHref`; classification
   dropdown maps all ten values.
10. Migration `shop_simple`: `blessing_available`, `deleted_at`,
    `thumb_url`, `shop_blessing_config`. Owner reads the SQL, merges. DDL
    runs on production at merge.
11. 🤫 `/admin/shop` plain list with the inline Visible toggle and search.
12. 🤫 `/admin/shop/new` and `/admin/shop/[id]`: the nine-field form, slug
    from name, "More" disclosure for the other columns. Phone first.
13. 📝 Blessing option on the storefront from the one global config. Readers
    see this, so it gets a 1.4 note line.
14. 🤫 One-time import of the 28 seeded products with thumbnails.
15. `docs/SHOP.md`. Owner adds one real product from a phone; test purchase
    in Stripe test mode. That is "done" for the spec.

## Phase 3: Today's Catechism

16. Migration `catechism`: `quiz_questions`, `quiz_daily`, `quiz_attempts`,
    `quiz_question_stats`, `collections`, `collection_progress`,
    `user_theme`, `analytics_events`. Owner sign-off, merge.
17. 📝 `scripts/quiz-import.ts` and `data/catechism/questions.json` from the
    owner's bank, validated: every `source_ref` resolves.
18. 📝 `lib/catechism`: pure `pickDaily`, the 400-day window, source refs.
    Tests: same five ids twice, anchor present, no repeat in 7 days.
19. 📝 `/catechism` page and the five-question flow with the onboarding
    motion. Attempt route, local attempts for the signed out.
20. 📝 Today card, one onboarding line, FAQ entry, privacy paragraph,
    admin correct-rate view. PR `feat(catechism)` into `release/v1.4` with
    the integrity note.

## Phase 4: Study Collections

21. 📝 `data/catechism/collections.json`, progress union route, local
    progress with merge on sign-in, "Completed:" line and completion count
    on /account.
22. 📝 Collection themes: token blocks, `READING_THEMES`, pre-paint
    allowlist, `PUT /api/account/theme` enforced server-side, the one plain
    sentence for free users.
23. 📝 Practice mode `/catechism/collections/[slug]`. PR `feat(collections)`.

## Phase 5: Supporter mark

24. Migration `community_author_mark`: `profiles.show_supporter_mark`,
    `author_plus_until` and `author_pro_until` on posts and replies,
    triggers, backfill. Owner sign-off, merge.
25. 📝 Projection in the posts and replies routes, `SupporterMark`
    component beside names, the opt-out toggle on /account, privacy line.
    PR `feat(supporter-mark)`.

## Phase 6: admin "Ledger" restyle (admin only, no notes)

26. 🤫 Tokens on `[data-surface="admin"]`, `components/admin/ledger/`,
    `/admin/styleguide`. Plan: `admin-ledger.md`.
27. 🤫 Summary screen with pinned KPIs. Owner review at 1440 and 390.
28. 🤫 One PR per rail group: Overview and Revenue, Growth and Content,
    Community and System. Then remove dark theme, sound, reel, audio.
29. `docs/ADMIN-STYLE.md`.

## Phase 7: the drop

30. 🚀 1.4: accept the patch note in the queue with the final date; bump
    the six version identifiers; `pull` the notes into the file; run the
    native gates and the tablet spec; merge `release/v1.4` to main; run the
    Android and the signed iOS Actions (both on the CI hold until the owner
    says); set the store prompt numbers after each store is live.
31. 📝 The paywall translations commit on `plus-paywall` goes in the same
    drop. The enforcement switches stay off unless the owner says.

## Desktop and iPad (added 2026-09-25)

32. 🤫 iPad multitasking: `UIRequiresFullScreen` removed after the narrow
    widths were walked; the tab bar fits its labels at every width (it cut
    "Community" on 390px iPhones too). Tablet spec extended. Built, on
    `claude/optimistic-cerf-dbfhtg`. Owner: check Split View on a physical
    iPad in the first TestFlight build.
33. 🤫 Desktop app, Tauri 2, `desktop/`: a native window around
    purifyapp.net. Built and tested on Linux; Windows and macOS builds are
    the manual "Desktop build" workflow, not yet run. `docs/DESKTOP.md`.
34. 📝 Discord Rich Presence in the desktop app, off by default, three
    levels, prayer never named, private pages never shown. The web half
    (Settings section, tracker, CSP line) deploys with the site; it renders
    nothing outside the desktop app. Gets a 1.4 note line only if a desktop
    build is public by the drop.
35. Owner, before any public desktop build: create the Discord application
    and set `PURIFY_DISCORD_CLIENT_ID`; signing certificates; the privacy
    line (draft in `docs/DESKTOP.md`); test Google sign-in in the window.

## What is not scheduled

- Community moderation, conduct rules, reporting: separate spec, not sent.
- Variants, discounts, regional pricing, Stripe Tax code beyond one flag.
- Renaming the fasting "streak" copy.
