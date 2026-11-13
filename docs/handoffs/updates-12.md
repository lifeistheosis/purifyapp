# Baton: Updates 12 (the downloads; then the World English Bible and the main web's canonical), 2026-11-13

Rotated at 374,000 tokens (get_session, 14:38 UTC), past the new line of 200,000 (his "all recs", 2026-11-13 about 14:29 UTC; OPERATIONS 2.2), before starting the two jobs his answer brought, which are a different kind of job (2.3). Read this, `docs/NOW.md` and `docs/roles/fixer.md`; for note 25, `docs/handoffs/updates-8.md` (its open item 2 has every step).

## Done

- **Build 95 note 21**, a failed Bible download says what is true: `7ec49b1c`, record `70043ef2` (build-95.md, under note 21). `FAILED_WORDS` in `lib/bible/downloads/store.ts`: offline only when the website cannot be reached at all (asked without CORS); "Not available to download right now. Try again later." when it answers without the file. 5 of 17 tests fail on the old code.

## Open, in the order the arbiter gave (his relay of 14:31 UTC: these two first, before the downloads)

1. **The canonical fix on the main web, now, alone** (his "all recs" to "Main web now"). The arbiter's steps, word for word: cut a branch from `origin/main` and cherry-pick `ff5eeda7c` there, nothing else; run `npm run build` on that main tree, and its test (`lib/seo/__tests__/pageNamesItself.test.ts`); then `PURIFY_ALLOW_MAIN=1 git push origin HEAD:main`, with his word quoted in the commit ("all recs", 2026-11-13 about 14:29 UTC, to the recommendation "Main web now"); no migration rides with it, so read the "Supabase Preview" check after, with AGENTS.md's command; when Render has deployed, curl three pages (the Paschal Homily, `/saints`, `/bible/john/1`) and show each gives its own canonical and og:url. If the git proxy refuses a push to main, stop and tell the arbiter the exact error; no other way. Owner: the next Updates chat. Do it in a worktree of `origin/main` with its own `npm ci` (main's lockfile is 1.8's), never in the branch's checkout.
2. **Note 25, the World English Bible, British edition ("The LORD")**, as built. Apply `docs/1.9-build/drafts/build-95-note-25.patch` on the head and follow Updates 8's baton, open item 2, to the letter (the eBible eng-webbe zip and its sha256, `node scripts/bibles/build.mjs --web`, `compare-map.mjs --only en-web`, verse counts against the source's `\v`, the keys of search and highlights, a chapter that opens, the merge-day line, "Six more Bibles" becomes seven in the notes and `releaseEmail.ts`, the live note by `patch-notes.mjs propose`). His answer goes where BIBLES.md says HIS-ANSWER-PENDING. Push when it passes, then tell the arbiter (the SSM board waits for "seven").
3. **Build 95 note 23, parked for his yes**: `docs/1.9-build/drafts/build-95-note-23.patch`, one commit that applies on `d273ca7a`. Held: nothing of it in the app until the arbiter relays his yes.
   - Built: `lib/downloads/` (the record on the phone, `log.ts`; the three stores read as one, `watch.ts`; the phone told, `notice.ts`), `components/native/DownloadsBridge.tsx` (mounted in RootFrame beside SavingBridge), a "Downloads" part first in the bell's sheet (`components/nav/DownloadsSection.tsx`, shown only when there is one; an unseen end lights the bell), the app's own plugin `DownloadNotice` (Android `downloads/DownloadNoticePlugin.java`: channel "purify-downloads", low, silent, no badge, a progress bar, its end, a tap opens Purify, a stale notice clears itself; iPhone `ios/App/App/DownloadNoticePlugin.swift`: a notification at the end, into Notification Center with no banner while Purify is open, a background task while it runs), registered as the widgets' bridge is, in the Xcode project's App sources. Five new lines in all 21 languages. No new permission, no service, no store declaration.
   - Proved: 28 new tests (fail on the old code: the modules do not exist); typecheck 0; eslint clean; 225 related tests green.
   - Still to do: the whole suite; the Android release build here with R8 (below); one export (`node scripts/gate/export.mjs --platform android`), then the in-app stills: seed `purify:downloads` with a running, a waiting, a done and a failed one, open the bell, checkMock with pixels at 390, 800 and 1032 on the five palettes and fifteen looks, in English and Arabic; the bar's still (no emulator here: try Android's own template through layoutlib, else name that it comes from the first test build); the record under note 23 in build-95.md; one report with stills and one line of reason per choice.
   - Two calls for him, sent to the arbiter at 14:38 UTC: ask for notification leave once, at the first download (recommended; iPhone asks only once ever, so a no then means Settings for reminders later), or never ask; and no foreground service (recommended for 1.9: a download pauses when Purify is left and goes on when it is opened), or a data sync service with Play's declaration, on his word. `ASK_AT_FIRST_DOWNLOAD` in `notice.ts` is the one switch for the first.
4. **Note 15**, the Share row: waits on his answer about the design pages (the arbiter asked him). Updates 8's baton, open item 1, has the steps.

## Gotchas

- `scripts/gate/export.mjs` cuts the export as the store builds do, key and switches included; it refuses a dirty tree, and takes `--cwd` for a worktree.
- The website build needs the key too: read it as the gate script's `mainWebKey()` does, into `npm run build`'s environment alone.
- In a walk, Playwright's `route.fulfill` lets a cross-origin 404 through without CORS. To meet what a phone meets on the main web, abort the GET and answer the no-cors HEAD (note 21's walk did; its record says what passed).
- Android SDK: dl.google.com answers; `cmdline-tools` (commandlinetools-linux-16111833), then `sdkmanager "platforms;android-36" "build-tools;36.0.0" "platform-tools"`; `npx cap sync android` before `./gradlew assembleRelease` (unsigned without `ANDROID_KEYSTORE_FILE`). No KVM, so no emulator; no Xcode, so the Swift is uncompiled until the iOS workflow.
- An unquoted heredoc runs backticks: quote it (`<<'EOF'`).
- The send_message connector failed once with a credential error and went through on a retry.

## His words that still apply

- 2026-11-13 about 14:29 UTC: "all recs" (BRAINSTORM; NOW lists what it covered).
- 2026-11-13 about 08:08 UTC, note 23: "whenever you are downloading something it should show up on your notification bar and also show up on your notifications in the app (its status and when it finishes)".
- 2026-11-13 about 08:13 UTC: "I want everything fixed in v1.9 no pushing out to 2".

## Where things are

- `docs/1.9-build/notes/build-95.md` (notes 15, 21, 23, 24, 25), `docs/1.9-build/drafts/` (the patches for notes 15, 23 and 25), `docs/handoffs/updates-8.md`.
