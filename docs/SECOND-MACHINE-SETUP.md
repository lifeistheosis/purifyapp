# Working on Purify from a second machine

Written 2026-08-07. Everything in the repo is on GitHub as of this date. This
file covers the parts that are not, and the state of the live App Store
submission, because neither travels with a clone.

## 1. Clone

```
git clone https://github.com/lifeistheosis/purifyapp.git orthoapp
cd orthoapp
npm ci
```

Node 22.5 or newer is required (`lib/content` uses `node:sqlite`). Local dev and
CI both run Node 24. Anything older fails at import, not at runtime, so it looks
like a broken dependency rather than a version problem.

`origin` is `https://github.com/lifeistheosis/purifyapp.git`. There is no
`homebase` remote on this repo; that rule belongs to operator-os. Purify pushes
to `origin`.

## 2. What is NOT in the repo, and must not be put there

`C:\Users\Leona\purify-keys\` on the first machine. None of it is in git and
none of it should ever be, so move it by USB, an encrypted archive, or a
password manager. Not through a chat window, not through a GitHub repo, not
through email.

The ones that actually gate work:

| File | Gates |
|---|---|
| `AuthKey_R2ZMUX49KF.p8` + `asc_key_id.txt` + `asc_issuer_id.txt` | every App Store Connect API call |
| `SubscriptionKey_U3GSFH2RPV.p8` | RevenueCat's App Store app. Downloadable once, already used |
| `purify-upload.jks` | the Android upload signature. Irreplaceable: lose it and the app cannot be updated on Play |
| `purify_dist_modern.p12` (+ `dist_p12_password.txt`) | iOS signing. Use the `_modern` one |
| `reviewer-account.txt` | the App Review demo account |
| `SECRETS-STILL-TO-SET.md` | the living checklist of what is still unset on Render and GitHub |

`archive\` inside that folder holds superseded copies. Two of them still contain
live secrets in plaintext (`SECRETS-TO-PASTE.txt`, `cron_secret_suggested.txt`)
and should be deleted once `CRON_SECRET` is confirmed working, rather than
copied to a second machine.

**Do not copy `purify_dist.p12` or `purify_dist.p12.b64` from `archive\`.** That
certificate's password carries a trailing carriage return and it cost a run of
failed builds. `purify_dist_modern.p12.b64` in the parent folder is the same
certificate rewrapped so the visible password opens it.

## 3. `.env.local`

Copy `.env.local.example` to `.env.local` and fill it. The first machine's
`.env.local` has only these set, and they are enough for the site to run:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAILS
BIBLE_API_KEY  BIBLE_ID_NIV  BIBLE_ID_NKJV  BIBLE_ID_NLT
STRIPE_SECRET_KEY  STRIPE_WEBHOOK_SECRET  SHOP_CHECKOUT_ENABLED
RESEND_API_KEY  EMAIL_FROM
NEXT_PUBLIC_SHOP_ENABLED  NEXT_PUBLIC_COMMUNITY_ENABLED
NEXT_PUBLIC_CAMPAIGNS_ENABLED  NEXT_PUBLIC_TRAPEZA_ENABLED
NEXT_PUBLIC_AMAZON_AFFILIATE_TAG
```

The Supabase project is `avbqyvjgcrucjwevwixt`. Values come from the Supabase
dashboard and Stripe dashboard, not from the repo.

Everything else in `.env.local.example` (APNS_*, VAPID_*, FCM, RevenueCat,
CRON_SECRET) is server-side and lives on Render. It is not needed to develop
locally and copying it around only spreads secrets.

## 4. Branches pushed on 2026-08-07

Three branches went up specifically so this machine is not the only copy:

- `feat/florence-expansion` — one commit that existed nowhere else, a rebuild of
  `/prayers/today` for desktop.
- `wip/stash-20260807-admin-discord` — a git stash preserved as a branch, so it
  survives the move. Apply it with `git stash apply wip/stash-20260807-admin-discord`,
  do not merge it. It is admin routes plus discord files, labeled unrelated.
- `chore/ignore-all-p8` — widens `.gitignore` from `AuthKey_*.p8` to `*.p8`.
  Unmerged. Worth merging before any key is ever handled inside the repo.

`main` is clean and in sync. Nothing else in the repo exists only locally.

## 5. Where the iOS launch actually stands

This is the part most likely to be out of date in anyone's head, so verify
before acting on it.

App 1.0, build 12, submission `117e2116-2ebb-42de-b693-b129ff017450`, state
`WAITING_FOR_REVIEW` since 2026-08-07 17:15:56Z. App Adam ID `6798897857`.

**Corrected today, in place, without cancelling:** the reviewer notes claimed
"the subscription products are submitted with this version" and they are not.
Replaced with an accurate description of a build that sells nothing. The store
description was 149 characters and is now the 1,559-character copy from
`docs/launch/STORE-LISTINGS.md`. Both were verified by reading them back.

Worth knowing for the future: a version in `WAITING_FOR_REVIEW` **is** writable
through the API. `appStoreVersionLocalizations` and `appStoreReviewDetails` both
accept PATCH. Cancelling to fix metadata is not necessary.

**Purify Plus is not part of this submission.** Subscription group `22293952`,
products `purify_plus_monthly` (`6799150080`, $4.99) and `purify_plus_yearly`
(`6799149987`, $38.99). Both sit at `MISSING_METADATA`, which App Store
Connect's own UI labels "Prepare for Submission". Do not read that label as
ready.

Configured today: the subscription group display name, availability in all 175
territories on both products, and a one-year pay-up-front introductory offer at
50% off on the yearly product in all 175 territories. That last one exists
because `/premium` ships inside the iOS binary advertising "50% off your first
year" while no introductory offer existed, which would have been a false price
claim in a shipped app.

**One field is still empty and it is the only thing blocking:** the App Review
screenshot on each subscription. Apple marks the neighbouring field "Review
Notes (Optional)" and this one plain "Screenshot", so it is required. It has to
be a capture of the paywall from the Android app (You tab, Purify Plus), because
the iOS paywall renders its "unavailable" phase until the products are approved,
and Play is now repriced so its prices match iOS.

Do not substitute a capture of the web `/pricing` page. That route renders
`WebSubscribeCheckout`, which is either a web purchase surface or a Google Play
link, and handing App Review either one invites a 3.1.1 question.

## 6. Still open, unrelated to review

- `APNS_*` is entirely unset on Render, so push is dead on iPhone from day one.
- `FCM_SERVICE_ACCOUNT_JSON` on Render is set but is not base64 JSON, so Android
  push dry-runs. The code now treats a broken credential as unconfigured instead
  of 500ing the whole cron.
- `iosBuildNumber` in `lib/appUpdate/release.ts` stays `0` until 1.0 is live.
- `community_notifications` migration unapplied. Fails soft.
- Meta's Facebook SDK ships via `@capgo/capacitor-social-login` though only
  Google and Apple sign-in are used. Deferred to 1.1; it sits on the Sign in
  with Apple path.
- The "50% off your first year" line also renders on the Pro card, and Pro has
  no App Store products at all. And it sits above a monthly price, which a
  reader could take as twelve months at $2.49. Only the yearly offer exists.

## 7. How to work here

`AGENTS.md` and `docs/editorial-standards.md` are binding. Read them first.
The parts that bite hardest:

- **Pushing `origin main` deploys the website via Render.** Merge through a pull
  request, because `ci.yml` runs on `main` only.
- Never `npm run build` while a Next dev server is running. It clobbers `.next`
  and produces phantom 500s.
- `npm run build:android` and `npm run build:ios` both write to `out/` and wipe
  it on entry. Run them one after the other, never together.
- Pages shown in the native app cannot read auth or data on the server. Server
  shell exports metadata, a `"use client"` child fetches at runtime.
- You cannot run DDL against production. Write the migration file and hand over
  copy-pasteable SQL.
- No em dashes in anything written for Leona or shown to a reader.
- A claim without command output or a probe is not done.

Stop and ask before: production pushes or deploys, Play or App Store submission,
production data or migrations, secrets, pricing or subscription terms, legal
acceptance, and doctrinal wording.
