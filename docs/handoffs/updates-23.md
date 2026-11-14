# Baton: Updates 23 (the apply chat for his yeses: the voices, note 23, the welcome email's line), 2026-11-13

Read this, `docs/NOW.md` and `docs/roles/fixer.md`. Reports go to the arbiter in docs/NOW.md (Arbiter 6, session_01VuYTwchyeBnvHi6J8tiR9X, from 05:53 UTC on 2026-11-14). The record: `docs/1.9-build/notes/build-95.md`, notes 23 and 25 and "The welcome email's line for the first-week guide" (the paragraphs signed Updates 23).

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

1. **The pixel guards: done, all passing** (2026-11-14, 06:54 UTC), on the export of `1ce0d9e97`: `voices.mjs dock` 24/24; `voices.mjs voices --guard-only` 31/31 at each of 390, 800 and 1032 in English and Arabic (Now Playing docked passes at 800 and 1032 in both); `downloads.mjs guard` 4/4 at each width in each language. Each checkMock on the five palettes and fifteen looks.
2. **The pushes: done**, one for each item (`e0332a71`, `fc87b87b`, `da5107c6`, docs `ebea0284`).
3. **The privacy line** for the opt-in: a draft sent to the arbiter, never changed by a chat.
4. **What only his phone proves**: the bar's own drawing, the iPhone's notification at a download's end, Android 13's prompt after Turn on.

## Gotchas

- `DownloadsBridge` must stay inside `MessagesProvider` (`shell.test.ts`), and just before `<PressToCopy />`, which `pressCopy.test.ts` holds as the provider's last child.
- A cold start in the walks opens on the launch stage (`[data-launch-stage]`), which takes taps for its first seconds: wait it out.
- Only a book's saving can wait (for Wi-Fi or a signal); a Bible or a chant is running or ended (`lib/downloads/watch.ts`).
- The local `next start` answered 500 on every page here (the FAQ too), an environment matter; the web build itself passes.
- The Capacitor stand-in in `downloads.mjs` names only PushNotifications and DownloadNotice in `PluginHeaders`, so every other plugin runs as the export does.
- A long run here dies when this chat sits idle with no tracked task: the container is reclaimed (twice overnight). Keep a background wait from the harness (run_in_background) going beside it, re-armed as it ends.
