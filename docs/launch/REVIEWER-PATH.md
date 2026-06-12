# Store Reviewer Path

Draft of the reviewer notes for App Store Connect / Play Console. **Test-account
credentials are never committed to this repo** — they are entered only in the
store consoles' review-notes fields.

## What Purify is

An Orthodox Christian prayer book, Bible reader, and study library. All content
is public-domain liturgical and patristic text (NPNF/ANF translations, KJV-lineage
Scripture, conciliar acts) or original editorial writing. The app is **free with
no purchases**: no IAP, no ads, no tracking.

## Using Purify without an account

Everything works immediately: Bible, prayers, saints, calendar, theology,
councils, search. Notes, highlights, bookmarks, and reading progress are stored
locally on the device (browser localStorage inside the shell). No sign-up wall
anywhere.

## The account (optional)

Signing in does one thing: synchronizes bookmarks/annotations across devices via
Supabase. Sign-in supports email+password and emailed magic link. **Reviewers:
use the password test account provided in the review notes** (magic link
requires a mail round-trip).

Account deletion is built in: Account → Data → Danger zone → Delete account
(cascades all server rows; local data untouched).

## Data safety facts (for privacy labels / data-safety forms)

- Collected, linked to identity: email address (account creation only).
- Collected, not linked: anonymized page-view analytics (self-hosted, 90-day purge).
- NOT collected: location, contacts, photos, health, ads identifiers. No
  third-party ad/tracking SDKs. Full policy: https://purifyapp.net/privacy
- Sign-out does NOT delete local reading data (verified in smoke test).

## Suggested 5-minute review flow

1. Launch → Today (verse of the day, saint, fast).
2. Bible tab → open John 1 → tap a verse → patristic commentary panel.
3. Prayers tab → Morning Prayers → scroll the rule; → The Prayer Rope (haptic beads).
4. Discover → Saints → any profile → read a work; highlight a paragraph (saved locally).
5. Account → sign in with the test account → bookmarks sync; sign out → local data intact.
6. Airplane mode → revisit a read chapter (Android: served from cache; iOS: requires connectivity if app-bound SW is disabled in this build).

## Links

- Privacy: https://purifyapp.net/privacy
- Terms: https://purifyapp.net/terms (ships day 2)
- Support page: https://purifyapp.net/support (in-app native version shows a contact block)
