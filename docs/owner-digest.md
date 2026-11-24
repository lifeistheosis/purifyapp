# The owner's digest

His word, 2026-11-24: "can we setup a system so you can look at that whenever", and his "yes" to the plan.

## What it is

`GET https://purifyapp.net/api/owner/digest` answers Purify's totals as JSON: accounts (total, new this week and the week before, new in 30 days), readers (signed-in readers this week and the week before, sessions, page views), Plus (paying, trials, comped, gifted, grandfathered, his own, test, by store, set to end, billing issues, estimated MRR at list price), and the shop's paid orders and revenue for 30 days without his test orders. It answers rates beside them: paying Plus over accounts, the share of paying Plus set to end, the week's change.

It carries no email, no name, no id and no row (`lib/owner/digest.ts`, `digestHasNoPersonalData`, tested). It counts Plus with the admin's own `subscriptionStats`, so it agrees with the Revenue tab.

## Why a token

The service key would let a chat read and change every row. This token opens one route that answers totals only, so a leak shows counts and nothing more, and deleting the variable on Render closes it at once.

- `OWNER_DIGEST_TOKEN` on Render, at least 32 characters. Unset or short: the route answers 503 and opens for no one.
- Sent as `Authorization: Bearer <token>`, compared in constant time. Wrong: 403.
- 30 reads an hour at most (429 past it). `Cache-Control: no-store`, `X-Robots-Tag: noindex`.
- A failed read is a 500, never zeros.

Checked locally on 2026-11-24 against `next dev`: no header 403, wrong token 403, token unset 503, database unreachable 500. The answer with real numbers is checked on the main web once it is live.

## Egress

Read when he asks, never on a schedule. Counts are head requests and move no rows; the rows it reads are the entitlements (as the admin's tabs do), the week's signed-in sessions' user ids, the week's page view counts and the month's paid orders. A few hundred KB a read at today's size.

## His steps (once it is on the main web)

1. Render, the purifyapp service, Environment, Add Environment Variable. Key `OWNER_DIGEST_TOKEN`. For the value press Generate (or any random string of 40 or more letters and digits). Save; Render redeploys.
2. Copy that value. In the chat, the chat opens a secure form for purifyapp.net (a network secret on his personal cloud environment); paste it there, never in chat. The chat never sees it: the proxy adds it to the chat's requests to purifyapp.net.
3. To turn it off: delete the variable on Render. To change it: a new value on Render and the same form again.

## The other read keys (2026-11-24, his "yea lets set them up")

Saved as network secrets on his personal cloud environment (the proxy adds them; no chat sees the values). Each is read-only, and deleting it at its source stops it at once.

- `api.mercury.com`: a Mercury read-only API token. Accounts and transactions: `GET /api/v1/accounts`, `GET /api/v1/account/<id>/transactions`. It cannot move money. On its first read both accounts (Checking ••2088, Savings ••4241) held $0 and no transactions.
- `api.revenuecat.com`: a RevenueCat v2 secret key, read only. Project `proj2ed00c93`. `GET /v2/projects/proj2ed00c93/metrics/overview` gives MRR, 28-day revenue, active subscriptions and trials, new customers, active users.

What a chat reports from these is analysis, not the books: the accounting record for tax is the bank's statements and receipts in accounting software, checked by a CPA.

## One command

`node scripts/owner-report.mjs` reads all three (the digest, RevenueCat, Mercury) and prints one report: readers and Plus, revenue, and the bank by month and by kind of cost (hosting, database, store payouts, developer accounts, AI tools and the rest; `CATEGORIES` in the script, tested in `lib/owner/__tests__/ownerReport.test.ts`). It runs itself again with `NODE_USE_ENV_PROXY=1`, since Node's fetch does not use the proxy that holds the keys without it. A source that fails is named; the rest still print. CLAUDE.md tells every chat to run it when he asks.

Known gap: the bank is empty until the stores' payouts and the bills move to Mercury (his step, after Apple and Google move his accounts from personal to his company).

## In the admin panel (2026-11-24, his "reflects the newest data autonomously")

- **The bank** on Money's Overview: Mercury's balances, this month in, out and kept by kind, and the newest eight lines (`components/admin/money/BankPanel.tsx`, `app/api/owner/bank`, `lib/owner/mercury.server.ts`). Owner only (OWNER_EMAILS): other admins get 403 and the panel renders nothing. Read when the tab opens and kept ten minutes on the server. Needs `MERCURY_API_TOKEN` on Render, a read-only Mercury token (a second one, made for Render, so either can be turned off alone). Unset: "The bank is not connected on this server."
- **RevenueCat** was already in the panel (Money's Plus figure, `lib/billing/revenuecatMetrics.ts`), live when Render holds `REVENUECAT_V2_API_KEY` and `REVENUECAT_PROJECT_ID` (`proj2ed00c93`).
- The digest's `sources` says which of RevenueCat, Mercury and Stripe this server holds a key for (booleans only), so a chat can check Render's setup without his panel.
- The bank's kinds are `lib/owner/bank.mjs`, shared with `scripts/owner-report.mjs`, so the panel and the report agree.
