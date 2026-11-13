# Baton: Admin panel 3 (the admin panel's side of the Admin role)

Written 2026-11-13, about 05:50 UTC, by session_01VuYTwdp6mhe99XWbxc6bLH. The job (sections 2 and 3 of `docs/plans/owner-desk.md`) is pushed; the next admin-panel job starts from here.

## Role and scope

The admin panel, web only: `app/admin`, `components/admin`, `lib/admin` and their API, and the owner's mail (`lib/email` where the panel sends). Card: `docs/roles/admin.md`. Branch `ccr-07896cf2-bo0afd`. None of it is in the apps' export; it goes live when 1.9 merges to main.

## Done and pushed

- `5b3a0a41`: the owner's desk, on his two answers of 2026-11-13. The commit after the baton set the brief to the design kit's email rules: headings in sentence case, every link a 44px target on its own line, running text 16px.
  - **The owner's brief**: one email a day at 7:30 AM New York time, the weekly one on Monday, both settings (Calendar, The owner's desk). Today first (what needs him, what goes out with its Hold), then yesterday or the week: readers, money by source in the money chart's colours, Plus, opened most, Community, searches not found, errors; on Monday also what sold Plus, what worked and what did not, three things worth his attention; after a release, a drop or a sale it opens with how it went. Replaces the morning board email and the Monday letter on the heartbeat.
  - **The sends**: the Sunday email, the monthly note and the feast shop email go out by themselves, the switch on by his word. A piece goes only when that day's brief named it at least two hours before, he has not held it, the board still has it due, at the sends' hour (12 noon) and before 6 PM. The start is the panel's own Send, now shared (`lib/email/campaignStart.ts`).
  - **The board message**: on its day the brief saves a draft from the week as that week's draft row if the week has none. Never publishes.
  - **A fault fixed on the way**: the monthly note sent on the 1st ticked the previous month's task (`monthlyRuleOf`, `lib/admin/plannerEvidence.ts`).

## Open

| What | Owner | Next step |
|---|---|---|
| The brief in Gmail, Apple Mail and Outlook, light and dark | him, with the first real brief after the merge | Drawn in Chromium at 390 and 800 and held by tests; real clients need his inbox or a testing service on his OK. |
| His yes to the brief's look, before the merge | him, through the arbiter | The code wears today's email shell (`emailLayout`). The kit's brief (`docs/brand/kit/email/brief.html`, Fable) waits for his yes too, with the kit's look being redone. On his yes to the kit's, swap `briefShell` in `lib/admin/ownerBriefSend.ts`; every part is drawn on `lib/email/theme.ts` tokens. The reasons for this look are in `docs/plans/owner-desk.md` section 3. |
| Directional questions in the brief | the arbiter, if he wants a channel of their own | For now a task added to the Calendar reaches him under "Needs you". |
| `lib/billing/applyLifecycle.ts` links `?tab=` | Updates 3 (NOW.md) | Unchanged. |
| Subscription history before the merge | his choice | A RevenueCat key with `charts_metrics:charts:read`. Offer it with the brief. |
| The strip's words for his items | if he asks | `lib/admin/attention.ts`. |

## Gotchas

- Every hour on the desk is New York's (`OWNER_ZONE`), bounded (`BRIEF_HOURS`, `SEND_HOURS`, `SEND_UNTIL` 6 PM) so his date and the UTC date the board and the drafts use are the same. Do not widen them without moving those to his day.
- What the brief names is written (`site_settings`, `owner_desk_announced`) only after it was sent. No announcement, no send. A desk or board that cannot be read sends nothing.
- The Hold link opens the desk (`#tab=calendar`). Never make an email link that acts by itself: link checkers press links.
- `site_settings` is on production (the baseline found it), so there is no migration. Without it the writes answer 409 and nothing sends itself.
- Plus, searches not found and errors read "not kept yet" until 1.9's migrations run.
- The walk: `next dev` with dummy `NEXT_PUBLIC_SUPABASE_*` values, `/admin/shell-preview`, set `location.hash` after load, answer `/api/admin/desk` with sample JSON in the route's shape.
- The old senders (`plannerDigest.ts`, `sendWeeklyLetter`) stay, off the clock. Putting one back on the heartbeat means two emails a morning.
- The test helper `lib/admin/__tests__/fakeDb.ts` honours eq, in, gte, lt and lte, and pages by range.

## His words that still apply

- 2026-11-13 04:38 UTC: "and yes ok for the owners brief"
- 2026-11-13 04:39 UTC: "yes auto but also we need to work on designs"
- 2026-11-12 about 21:51 UTC: "I don't just want the same reoccurring spam email that gets sent to me."
- No gold or yellow (since 1.7.1). Spend only what was asked. No em dashes, side stripes, sparkle or light rays.

## Where things are

- Plan and state: `docs/plans/owner-desk.md` (sections 2 and 3 marked built), `docs/NOW.md`, `docs/OPERATIONS.md`.
- The brief: `lib/admin/ownerBrief.ts` (pure), `briefFigures.ts`, `briefToday.ts`, `briefCharts.ts`, `ownerBriefSend.ts`. The desk: `ownerDesk.ts` (rules), `ownerDeskStore.ts`, `autoSends.ts`, `boardDraft.ts`, `boardRead.ts`; `components/admin/planner/OwnerDesk.tsx`; `app/api/admin/desk/route.ts`. The heartbeat: `lib/ops/maintenance.ts`.
- Tests in `lib/admin/__tests__/`: `ownerDesk`, `ownerBrief`, `briefFigures`, `briefToday`, `autoSends`, `ownerBriefSend`, `deskRoute`.
