# Baton: Updates 23 (the apply chat for his yeses: the voices, note 23, the welcome email's line), 2026-11-13

Read this, `docs/NOW.md` and `docs/roles/fixer.md`. Reports go to Arbiter 3 (session_01VuYTwajSPo1Rq2R34jWrk6). The record: `docs/1.9-build/notes/build-95.md`, notes 23 and 25 and "The welcome email's line for the first-week guide" (the paragraphs signed Updates 23).

## His words that bind this work

- 2026-11-13 about 14:29 UTC, "all recs": the welcome email's one asking line for the first-week guide (opt-in).
- 2026-11-13 about 18:53 UTC, "all recs": the voices' page and its three points as built; note 23's two calls (Purify asks in its own words before the phone's prompt; downloads pause when Purify is left, no Play declaration).

## Done (commits on ccr-07896cf2-bo0afd)

- `8c1e2bb6` the voices' reader-facing patch, unchanged; `e0332a71` Now Playing docked: the house's dim (`bg-night/60`) and it mirrors in Arabic (`dockedPlayer.test.ts`).
- `a49e1924` note 23 with the ask in Purify's own words; `ce80ba79` the suite's two (the bell's pinned line, the registration order) and the walk `scripts/gate/downloads.mjs`; `ee21e14c`, `fc87b87b` what the walk found: the bridge was outside the words' provider (every line a key), and the ask rose with the language offer (now `whenUncovered`).
- `2c4b4ad3`, `da5107c6` the welcome email's line and `/email/first-week` (signed link, POST only, `firstWeekAsk.ts`).
- His page: https://claude.ai/artifact/PUsgz1LRYCUuPUPFP3dHQT (source `docs/1.9-build/notes/build-95/23-page/`).

## Proved

Typecheck 0; the whole suite green (14,654); eslint clean; the web build green; the export from `1ce0d9e97` (`scripts/gate/export.mjs`; the same changes as pushed); `voices --stills-only` 32 of 32; `downloads.mjs walk` 23 of 23; the Android compile and R8 here (`:app:compileReleaseJavaWithJavac :app:minifyReleaseWithR8` with `--init-script` naming Google's mirror of Maven Central, which answered 429 twice; the mapping keeps `DownloadNoticePlugin` and its methods). The APK's last step needs the NDK, absent here.

## Open

1. **The pixel guards**, started 19:47 UTC on the export of `1ce0d9e97`, three at a time: `voices.mjs dock`; `voices.mjs voices --guard-only --lang en|ar --size 390|800|1032`; `downloads.mjs guard --lang en|ar --size 390|800|1032`. If this chat rotated before they ended, cut the export again from the head and run them (each voices guard takes over an hour on four cores).
2. **The pushes**, one for each item, after the guards: `git pull --rebase`, then `git push` (the guard runs; ten-minute timeout).
3. **The privacy line** for the opt-in: a draft sent to the arbiter, never changed by a chat.
4. **What only his phone proves**: the bar's own drawing, the iPhone's notification at a download's end, Android 13's prompt after Turn on.

## Gotchas

- `DownloadsBridge` must stay inside `MessagesProvider` (`shell.test.ts`), and just before `<PressToCopy />`, which `pressCopy.test.ts` holds as the provider's last child.
- A cold start in the walks opens on the launch stage (`[data-launch-stage]`), which takes taps for its first seconds: wait it out.
- Only a book's saving can wait (for Wi-Fi or a signal); a Bible or a chant is running or ended (`lib/downloads/watch.ts`).
- The local `next start` answered 500 on every page here (the FAQ too), an environment matter; the web build itself passes.
- The Capacitor stand-in in `downloads.mjs` names only PushNotifications and DownloadNotice in `PluginHeaders`, so every other plugin runs as the export does.
