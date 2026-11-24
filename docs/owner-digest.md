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
