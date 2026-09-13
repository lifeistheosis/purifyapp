# v1.4 programme: every step, in order

Owner: Ven. Written 2026-09-05 from the five specs sent that day plus the
work already on main. One list, so nothing is in two heads. Each numbered
step is one PR or one owner action. Tiers: 🤫 silent (admin, no note),
📝 soft (readers see it, gets a note), 🚀 hard (the 1.4 drop: versions, CI,
store builds).

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

## What is not scheduled

- Community moderation, conduct rules, reporting: separate spec, not sent.
- Variants, discounts, regional pricing, Stripe Tax code beyond one flag.
- Renaming the fasting "streak" copy.
