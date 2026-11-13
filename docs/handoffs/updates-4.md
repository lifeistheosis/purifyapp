# Baton: Updates 4 (the search, the toast, the opening), 2026-11-13

Rotated near 400,000 tokens, before the downloads, as the arbiter asked. Read this, `docs/NOW.md` and `docs/roles/fixer.md`.

## Done

- **Build 95 note 5** (Discover's search opened by a cut to a dark screen): pushed `8f03f670`. The screen's ground covers the page in a page's leaving time and its words and field come 40ms later; it leaves the other way round. Record: `docs/1.9-build/notes/build-95.md`, note 5. Walk: `scripts/search-motion-walk.mjs` (`--self-test`).
- **Build 95 note 7** (the Highlighted toast over the chapter pill): pushed `33b3d951`. Everything at the foot but the tab bar and the mini player steps aside while a toast shows (`lib/ui/overlay.ts`, toastRises; app/globals.css, "What steps aside for a toast"). Walk: `scripts/toast-walk.mjs` (`--self-test`).
- **Build 95 note 8** (the opening): pushed `ddfa3035`. The stage lifts away before the night opens onto Today; nothing in the opening animates a filter (the glow is a second cross blooming by opacity). Walk: `scripts/launch-walk.mjs` (`--self-test`).

## Named to the arbiter, not mine, not mended

- The "Purify Plus" sheet's fine print, 4.23:1 on Dark, Black, Candlelight and Monastery; in Arabic its hero line 3.91:1 on Light (components/billing/PlusPaywall.tsx; billing, read `docs/audit/findings.yaml` first).
- The journal's Write button floats in the toast's band without `data-screen-edge="bottom"` (Fable's files): one attribute puts it under note 7's rule.
- Today's "Share as a picture" sheet: "Words" 4.11:1 and "Size" 4.32:1 on Light (changed today for note 24).
- On his Android shell the window shrinks for the keyboard in one step; the frame it shrinks in is drawn before the page re-lays out. No page code changes that frame (note 5's record).

## Next, not started: build 95 notes 21 and 23 (the downloads)

The arbiter's brief, 2026-11-13 08:09 UTC, in short (read notes 21 and 23 in build-95.md):

- **Note 21, the Translation sheet.** It says "Could not download. Check your connection and try again." (`bible.downloads.failedOffline`, used in `components/bible/BibleRow.tsx`) when the main web simply has no such file: the six versions live on the main web only from the merge, so today every download answers 404 (probed 08:06 UTC). The words must say what is true: offline, or not available right now. A test that fails on the old code. The World English Bible's greyed "Coming soon" row waits on his word: do nothing to it until the arbiter relays his answer.
- **Note 23, every download in the phone's bar and the app's notifications.** A Bible version, a book saved to listen offline (`lib/readAloud/`), any other: list them. On Android its progress in the bar while it runs and its end; in the app's own notifications (there is a list; an entry is drawn from its own rows) its state and its end; on iPhone a notification when it finishes. Weigh Android's DownloadManager against a notification the app posts. Nothing that needs a Play or App Store declaration (a foreground service type) without naming it to the arbiter first. A native change means the R8 keep rules and the release APK walk (`docs/RELEASE.md`). Tests for the download's states; stills of the bar's notification and the in-app entry, with reasons, for his yes. Held locally until then.

## How this chat ran its checks, to save the next one the finding

- The export, cut as the store workflow cuts it: `NEXT_PUBLIC_SHOP_ENABLED=1 NEXT_PUBLIC_COMMUNITY_ENABLED=1 NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk`, with the main web's address and the public key read into that one command (CLAUDE.md, "The public key for an export, always"). Without the shop and community switches, export walk section 44 says the export is not the releases' and the search sheet has no Shop door.
- `scripts/export-walk.mjs` launches Playwright's own browser, which a cloud container lacks: run it with a preload that sets `executablePath: "/opt/pw-browsers/chromium"` on `chromium.launch`, or the walk dies before it starts.
- Motion on in a walk: set `purify.motion.device` to `ok` in localStorage (a fast phone's verdict) and check `<html data-motion="full">`; never walk motion with animations off.
- A double tap on a verse: centre the verse first (`scrollIntoView({ block: "center" })`); a verse at the screen's foot sits under the tab bar and the taps land on the bar.
- Two jobs in one shell line: set the log path inside each job. A variable set in the first `a && (b) &` chain does not reach the second job.
