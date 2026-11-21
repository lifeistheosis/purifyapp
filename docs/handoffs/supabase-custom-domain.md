# Supabase custom domain: api.purifyapp.net

Set up by the owner on 2026-11-21, walked through in the ad stage 1 chat (session_01VuYTwdhrUStFNXC4goT9fG). This file is the record, so nobody has to hunt for these again. **Not finished: see "State".**

## What was done

- **Add-on:** he bought Supabase's Custom domain add-on for project `avbqyvjgcrucjwevwixt`. He asked about the other two: Dedicated IPv4 was advised against (nothing in the repo connects straight to the database; no Postgres driver, no direct address), and Point in time recovery was left for later (Pro's daily backups stand for now).
- **DNS is on Cloudflare** (`lovisa` and `jarred.ns.cloudflare.com`). Two records added, both checked from outside:
  - `CNAME api -> avbqyvjgcrucjwevwixt.supabase.co`, DNS only (grey cloud; the proxy must stay off or Supabase cannot verify).
  - `TXT _acme-challenge.api` with the value Supabase gave.
- **Google sign-in lives in the Google Cloud project named "Purify", ID `rich-amphora-497422-g5`, number `872309580762`.** Not `purify-505500` (empty, no consent screen) and not `purifyappnet`. Its clients: Purify Web (`872309580762-3hjv...`, Web application), Android client 1 (`...-s0c4...`), Android client (Play App Signing) (`...-dalo...`), Purify iOS (`...-358d...`).
- On **Purify Web**, `https://api.purifyapp.net/auth/v1/callback` was added to the authorized redirect URIs. The `supabase.co` one was kept.

## State (when this was written)

- Not yet confirmed by him: that Verify passed in Supabase, whether Sign in with Apple is enabled (if so, its Services ID needs the new domain and return URL before Activate), and that Activate was pressed.
- **Nothing in the website or the apps uses the new address.** `NEXT_PUBLIC_SUPABASE_URL` on Render and in the store builds is still the `supabase.co` address, which keeps working after activation.

## Open, for later

- **Moving the website and a future build to the new address** is a production change: sessions are stored under the old address, so signed-in readers may be signed out, and sign-in must be tested first. It waits for his word, through the arbiter.
- **Purify Web has two client secrets** (Google's warning on the client). Do not delete either until it is known which one Supabase holds (Authentication, Sign In / Providers, Google); deleting the one in use breaks Google sign-in on the website at once.
- Supabase's Google provider lists three client IDs (`3hjv` web, `s0c4` Android, `358d` iOS). The Play App Signing client (`dalo`) is not among them. Not checked whether that matters for the Play build's sign-in; worth one look.
