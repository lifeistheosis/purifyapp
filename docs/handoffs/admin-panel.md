# Baton: Admin panel 3 (the admin panel's side of the Admin role)

Written 2026-11-13, about 05:50 UTC, by session_01VuYTwdp6mhe99XWbxc6bLH, and brought up to date about 06:30 UTC after the arbiter's second round. The job (sections 2 and 3 of `docs/plans/owner-desk.md`, then the kit's look in the letters) is pushed; the next admin-panel job starts from here.

## Role and scope

The admin panel, web only: `app/admin`, `components/admin`, `lib/admin` and their API, and the owner's mail (`lib/email` where the panel sends). Card: `docs/roles/admin.md`. Branch `ccr-07896cf2-bo0afd`. None of it is in the apps' export; it goes live when 1.9 merges to main.

## Done and pushed

- `5b3a0a41`: the owner's desk, on his two answers of 2026-11-13. The commit after the baton set the brief to the design kit's email rules: headings in sentence case, every link a 44px target on its own line, running text 16px.
  - **The owner's brief**: one email a day at 7:30 AM New York time, the weekly one on Monday, both settings (Calendar, The owner's desk). Today first (what needs him, what goes out with its Hold), then yesterday or the week: readers, money by source in the money chart's colours, Plus, opened most, Community, searches not found, errors; on Monday also what sold Plus, what worked and what did not, three things worth his attention; after a release, a drop or a sale it opens with how it went. Replaces the morning board email and the Monday letter on the heartbeat.
  - **The sends**: the Sunday email, the monthly note and the feast shop email go out by themselves, the switch on by his word. A piece goes only when that day's brief named it at least two hours before, he has not held it, the board still has it due, at the sends' hour (12 noon) and before 6 PM. The start is the panel's own Send, now shared (`lib/email/campaignStart.ts`).
  - **The board message**: on its day the brief saves a draft from the week as that week's draft row if the week has none. Never publishes.
  - **A fault fixed on the way**: the monthly note sent on the 1st ticked the previous month's task (`monthlyRuleOf`, `lib/admin/plannerEvidence.ts`).
- The arbiter's second round:
  - `6193982d`, **the first-send guard**: `lib/email/look.ts` holds the reader emails' look (`READER_EMAIL_LOOK`). When it differs from the look he cleared (`site_settings`, `owner_desk_look`), the first automatic send goes to him alone (`first_look:<look>`, the readers' exact email) and nothing goes to readers by itself until he taps "I have seen it in my inbox" on the desk.
  - `6193982d`, **the Sunday email's names**: a feast is said by its own name, never by the saint it honours (`lib/email/weekly.ts`); the week's saint card keeps the saint's name.
  - `6193982d`, **three owner alerts** open their tabs (`#tab=orders`, `#tab=shop` for low stock, `#tab=goals`); `lib/admin/__tests__/adminLinks.test.ts` holds every admin link in app, lib and components to `#tab=<a live view>`.
  - `9dd697e8`: the psalms move's record copy (`docs/1.9-build/sql/psalms-113-115-move.sql`) carries the migration's signed header word for word; `psalmMove.test` had failed since `4758941b`.
  - `c98aa063`, **the reader emails in the kit's look**, on his "yes look": the Sunday email, the monthly note, the shop emails and the release letter (`lib/email/kit.ts`, the kit's pieces held to its builder character for character by `kit.test.ts`; `lib/email/kitLetters.ts`, each letter's body in them). Each day's fast in the Sunday email; Night sky, its night and "Nativity Fast · day N of 40" in the fast; a saint's picture left out when on the heritage list (`lib/email/saintCard.ts`); pictures in `public/email/`. `READER_EMAIL_LOOK` is "2", so the guard is armed.
  - The commit after this baton line, **the owner's brief in the kit's look**: `lib/admin/ownerBrief.ts` draws it with the kit's pieces (the day's figures three across, the week's columns, money as one bar always in cents, one figure to a row, what could not be read gathered at the end); `briefCharts.ts` and the email theme's chart colours are gone. The Nativity Fast's forty nights are in `public/email/` (drawn by the kit's own code, which redraws its days 1 and 8 byte for byte), and the native build drops `public/email/` from the apps' export by name.

## Open

| What | Owner | Next step |
|---|---|---|
| The brief and the reader emails in Gmail, Apple Mail and Outlook, light and dark | him, with the first real brief and the first reader email in the new look after the merge | Drawn in Chromium at 390, dark and light, and held by tests; real clients need his inbox or a testing service on his OK. |
| The kit's label and value rows: a short value sits at the left of its column when the values in one list differ in length | the Fable designer, through the arbiter | The kit's `pairs()` in `docs/brand/kit/email/build.mjs` gives the value cell no `text-align:right`. The brief now keeps one figure to a row, which hides most of it. The fix is at the source, then `lib/email/kit.ts` follows in the same commit (`kit.test.ts` holds the two together). |
| Directional questions in the brief | the arbiter, if he wants a channel of their own | For now a task added to the Calendar reaches him under "Needs you". |
| Subscription history before the merge | his choice | A RevenueCat key with `charts_metrics:charts:read`. Offer it with the brief. |
| The strip's words for his items | if he asks | `lib/admin/attention.ts`. |

## Gotchas

- Every hour on the desk is New York's (`OWNER_ZONE`), bounded (`BRIEF_HOURS`, `SEND_HOURS`, `SEND_UNTIL` 6 PM) so his date and the UTC date the board and the drafts use are the same. Do not widen them without moving those to his day.
- What the brief names is written (`site_settings`, `owner_desk_announced`) only after it was sent. No announcement, no send. A desk or board that cannot be read sends nothing.
- The Hold link opens the desk (`#tab=calendar`). Never make an email link that acts by itself: link checkers press links.
- `site_settings` is on production (the baseline found it), so there is no migration. Without it the writes answer 409 and nothing sends itself.
- Plus, searches not found and errors read "not kept yet" until 1.9's migrations run.
- The walk: `next dev` with dummy `NEXT_PUBLIC_SUPABASE_*` values, `/admin/shell-preview`, set `location.hash` after load, answer `/api/admin/desk` with sample JSON in the route's shape. After it, `rm -rf .next && npx next typegen`, or typecheck trips on stale types under `.next/dev/types`.
- The native export cannot run in a container without the main web's public Supabase key: `/shop/[store]` builds its pages from the live database and stops with no stores. Reading that key was his permission to Admin 2 for the re-check only.
- The old senders (`plannerDigest.ts`, `sendWeeklyLetter`) stay, off the clock. Putting one back on the heartbeat means two emails a morning.
- The test helper `lib/admin/__tests__/fakeDb.ts` honours eq, in, gte, lt and lte, and pages by range.

## His words that still apply

- 2026-11-13 04:38 UTC: "and yes ok for the owners brief"
- 2026-11-13 04:39 UTC: "yes auto but also we need to work on designs"
- 2026-11-13 05:45 UTC: "yes look" (the kit's look in the owner's brief and the reader emails; the first reader email in it to him alone)
- 2026-11-12 about 21:51 UTC: "I don't just want the same reoccurring spam email that gets sent to me."
- No gold or yellow (since 1.7.1). Spend only what was asked. No em dashes, side stripes, sparkle or light rays.

## Where things are

- Plan and state: `docs/plans/owner-desk.md` (sections 2 and 3 marked built), `docs/NOW.md`, `docs/OPERATIONS.md`.
- The brief: `lib/admin/ownerBrief.ts` (pure), `briefFigures.ts`, `briefToday.ts`, `ownerBriefSend.ts`. The desk: `ownerDesk.ts` (rules), `ownerDeskStore.ts`, `autoSends.ts`, `boardDraft.ts`, `boardRead.ts`; `components/admin/planner/OwnerDesk.tsx`; `app/api/admin/desk/route.ts`. The heartbeat: `lib/ops/maintenance.ts`.
- The look: `lib/email/kit.ts` (the kit's pieces), `lib/email/kitLetters.ts` (the reader letters), `lib/email/look.ts` (the guard's version), `lib/email/saintCard.ts`, the palettes in `lib/email/theme.ts` (`KIT_*`), the pictures in `public/email/`. The source is `docs/brand/kit/email/` (the Fable designer's).
- Tests in `lib/admin/__tests__/`: `ownerDesk`, `ownerBrief`, `briefFigures`, `briefToday`, `autoSends`, `ownerBriefSend`, `deskRoute`, `adminLinks`; in `lib/email/__tests__/`: `kit`, `kitLetters`.
