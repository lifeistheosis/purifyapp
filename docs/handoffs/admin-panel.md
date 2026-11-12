# Baton: Admin panel 2 (the admin panel's side of the Admin role)

Written 2026-11-12, about 23:40 UTC, by session_01VuYTwdGHpocsLjegCEAape. That chat stopped past 500,000 tokens (`docs/OPERATIONS.md` section 2), so the next admin-panel job starts in a fresh chat.

## Role and scope

The admin panel, web only: `app/admin`, `components/admin`, `lib/admin` and their API. Card: `docs/roles/admin.md`. Branch `ccr-07896cf2-bo0afd`. Admin code is not in the 1.9 export, so on the arbiter's word it pushed during the final check, through the guard.

## Done and pushed

- `3721c0b1`: all the money on Money's chart.
  - Each day or month stacks the shop (blue), Plus (green), the EIKON Box membership (Pro, magenta), a plan the product name does not say (the ink, his "all white") and refunds below the line (grey).
  - One amount: after the stores' cut, before Stripe's fees. It equals Came in when both read the kept events.
  - Code: `lib/admin/moneyChart.ts`; `StackedColumns` in `components/admin/daily/parts.tsx`; the tokens `--adm-money-*` in `app/admin/admin-theme.css`.
- `41bf07c6`: the quiet board (`docs/plans/owner-desk.md` section 1).
  - The morning email holds only his items, and its subject names them.
  - Not before is one tap in the Calendar's task window.
  - The team's work is never late to him, and the strip counts his items only.
  - Ship and the patch note left the week.
  - A missed run is one line, cleared with "Skip these".
  - Rules: `lib/admin/planner.ts`. The read that keeps a moved task's row: `lib/admin/plannerRead.ts`.
- `2377317c`: on its own day only, a team piece shows in his email under "Ready to send", with the link that sends it. Email links are `#tab=` now.
- `4e9e2b25`: Revenue's by-month chart is Money's chart, all time. One component: `components/admin/money/MoneyColumnsChart.tsx`.

## Open

| What | Owner | Next step |
|---|---|---|
| `lib/billing/applyLifecycle.ts` links `/admin?tab=subscriptions` | the next admin chat | The panel reads only `#tab=`, so this opens Home. Make it `#tab=` and add a test. |
| Sections 2 and 3 of the plan (the sends, the owner's brief) | a fresh chat, once he answers the plan's four questions | When section 2 sends, "Ready to send" becomes "goes out at <hour> unless you hold it" (`morningMail`). |
| Subscription history before the 1.9 merge | his choice | It needs a RevenueCat key with `charts_metrics:charts:read`. Offer it with the owner's brief. |
| The strip's words for his items ("deadlines late", "The week is behind") | if he asks | `lib/admin/attention.ts`. The counts are already his only. |

## Gotchas

- A fresh container: `npm ci`, then `npx next typegen` before typecheck. next-env.d.ts is gitignored.
- The dev build loses the `#tab=` deep link on first load, because strict mode runs the shell's first effects twice. To walk a tab, set `location.hash` after load.
- Walk the panel on `/admin/shell-preview` with Playwright. Answer `/api/admin/...` from sample data built by the real pure code, and never commit real figures.
- `plus_events` is 1.9's table and is absent on production until the merge (probed 404 on 2026-11-12).
- A table set `sr-only` still lays out at full width. Wrap it in a `div.sr-only`.
- Money's three hues pass the data-viz validator with every pair against every other. A fourth hue cannot, without yellow or orange.
- In the tests, fake the admin client so it honours its filters (`quietBoard.test.ts`). A fake that ignores them hides a row the real read loses.

## His words that still apply

- 2026-11-12 about 21:42 UTC: "I want you to show everything related to money on the timeline ... And if you can make it a different color, right, if that helps ... If there's no distinction, then it just shows up all white."
- 2026-11-12 about 21:51 UTC: "If it doesn't have anything to do with my input ... So you can automate that process, right? And clearly, if there's a directional input that you need, you could just let me know."
- No gold or yellow (since 1.7.1). Spend only what was asked. No em dashes, side stripes, sparkle or light rays.

## Where things are

- Plans and state: `docs/plans/owner-desk.md` (the plan and his four questions), `docs/NOW.md`, `docs/OPERATIONS.md`.
- Tests in `lib/admin/__tests__/`: `moneyChart.test.ts`, `money.test.ts`, `quietBoard.test.ts`, `planner.test.ts`, `dailyParts.test.ts`, `adminTheme.test.ts`.
