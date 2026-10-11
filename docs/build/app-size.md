# App size: what ships in the Android bundle, and how it was trimmed

The local-first Android build bundles the **entire `out/` static export** into
the APK (`capacitor.config.ts` `webDir: LOCAL ? "out"`; `cap sync` copies the
whole tree, no trimming). So `out/`'s size is the app's size. This note records
the safe optimization pass (2026-07-17) and the one structural lever left.

## Where the weight is

Every reading surface (Bible, saints, prayers, theology, councils, topics,
history) is **build-time-inlined**: the `server-only` loaders in
`lib/*/load.ts` read `data/**` at export time and the content is baked into
each route's `index.html` **and** its RSC prefetch payloads. Nothing is fetched
client-side at runtime, so each route ships its text several times:

- `index.html` — cold-load / deep-link / SW `navigate` path.
- `index.txt` — the full-route RSC flight payload the client router fetches for
  `<Link>` soft navigation. **Load-bearing.**
- the `__next.!<hash>/…/__PAGE__.txt` + `_tree`/`_index`/`_head` segment files —
  the client segment cache (prefetch + instant transitions). **Load-bearing.**

## Safe optimizations applied (this pass)

All in `scripts/native-build.mjs` and `scripts/optimize-images.mjs`; **no
reader, route, or `next.config.ts` change** (reading is untouched).

1. **Wipe `out/` each build.** `next build` writes into `out/` but never deletes
   files from routes that no longer exist, so `out/` silently accumulated
   months of stale builds and shipped them. `build:android` now wipes `out/`
   first, so only the current content set is bundled.
2. **Prune `__next._full.txt`.** For every route Next emits a
   `__next._full.txt` that is a **byte-identical duplicate** of `index.txt`
   (the `/_full` segment key is a build-time server-cache artifact the client
   segment cache never requests in `output:'export'` mode — `_full` appears
   nowhere in `next/dist/client`). Pruned after the export completes:
   **1,756 files, 247.4 MB reclaimed, every build.** `index.txt` and all
   load-bearing segment files are untouched, so soft navigation is unaffected
   (verified: served pruned export returns `index.txt` 200, `_full` 404).
3. **Assets.** Removed 6 orphaned saint icons (unreferenced repo-wide, ~0.9 MB).
   `scripts/optimize-images.mjs` recompresses the >400 KB images in
   `public/saints/icons` and `public/history/media` in place — same filename,
   same format, so registry string references (`iconUrl`, `media.hero`) are
   untouched — capped at 1200px, mozjpeg q80 / lossless PNG, only when smaller:
   **18 files, 13.8 MB → 5.1 MB (63%).**

### Result

| | `out/` size |
|---|---|
| Stale accumulated tree (pre-pass) | ~1.20 GB |
| Clean build, unpruned | ~1.17 GB |
| **Clean build, pruned (shipped)** | **925 MB** |

(Uncompressed. The AAB gzips its assets and this content is highly compressible
text, so the actual download is a fraction of this — measure the built AAB for
the true install size.)

## The remaining floor (~900 MB) and the next lever

After the safe pass, the bulk is the **inlined-content duplication**:
`index.html` (~340 MB) + `index.txt` (~247 MB) + segment `.txt` (~247 MB) for
the same text, plus `out/content/content-package.json` (~38 MB, a fourth copy).

Only one thing removes this floor without degrading navigation: migrate the
readers onto the **built-but-dormant on-device SQLite content layer**
(`lib/content/*` — `ContentProvider`, `ContentRepository`, `bootstrap.ts`).
That layer already boots on native (imports `content-package.json` into SQLite)
but **no screen reads from it** (`useRepository`/`useLocalContent` have zero
consumers); readers still take build-time props. If readers read verses/writings
from the repo instead, the heavy per-route HTML+RSC collapses to lightweight
shells and `content-package.json` becomes the single content source.

Caveats for that migration (why it's a separate, careful effort):

- The readers need a **dual path**: SQLite on native, build-time props on the
  web (`ContentProvider` returns null off-native).
- `content-package.json` is **base text + writings only** — it excludes Bible
  commentary, Strong's/interlinear, and intros (`build-content-package.mjs`
  skips those dirs), so those layers need their own offline plan.
- It touches the core reading path, so it must land behind full verification.

Do **not** delete `content-package.json` or `lib/content/*` — they are the seed
of this fix, not dead code.

## Not touched (deliberately)

- `index.txt` and the segment `.txt` files (load-bearing for soft nav/prefetch).
- The 3 anthem MP3s (`public/audio`, 7.9 MB) — load-bearing, with an open rights
  question in `docs/licensing/audio-provenance.md` (owner decision, not size).
- `next.config.ts` render/navigation architecture (PPR / cacheComponents /
  prefetch) — no supported flag reduces the payloads without changing behavior.

## 1.5.2 (2026-10-05): the phones open one document

The list under "Where the weight is" calls each route's `index.html` its
"cold-load / deep-link / SW `navigate` path". On the website it is. In the
apps it never was, and that line is what kept 219.7 MB in every build.

Capacitor answers ANY address with no file extension with the ROOT
`index.html`, on both platforms:

- Android, `WebViewLocalServer.handleLocalRequest`: `path.equals("/")` or a
  last path segment with no "." (under `html5mode`, which `CapConfig`
  defaults to true and nothing here unsets) is served
  `basePath + "/index.html"`.
- iOS, `CapacitorRouter.route(for:)`: an empty `pathExtension` returns
  `basePath + "/index.html"`, and the app installs no router of its own.

There is no service worker in the shell to navigate through (it is
unregistered there). So inside the apps there is one document, and every
other screen is reached by a soft navigation that reads the page's
`index.txt`. The repo had met this twice as a bug before it was read as a
size: `components/auth/OAuthButtons.tsx` (a hard navigation to
`/account/profile` came back as Today, half of the 2.1(a) rejection of 1.0
build 12) and `lib/shop/productHref.ts`.

**The cut.** `scripts/native-build.mjs`, `prunePageDocuments`: every
`index.html` but the root one is removed after the export, every build.

| | Before | After |
|---|---|---|
| `out/` on disk, which is what an iPhone keeps | 564.1 MB, 12,018 files | 347.0 MB, 10,096 files |
| Deflated file by file, about what an Android phone downloads | 133.3 MB | 100.4 MB |
| Without `_next`, against the budget | 0.54 GB of 0.60 | 0.32 GB |

The budget in `native-build.mjs` is left at 0.60 GB for this release and
wants bringing down to about 0.38 once a store build has confirmed the
number.

**Verified before enabling**, the way `pruneSegmentCache` was: the export
served as the shells serve it (the root document for every extensionless
address) with every other `index.html` refused, and the app walked by
tapping from a cold start through Bible, John 1, Prayers, Discover, Saints, a
saint, a work, the shop and Community. One document was asked for. Not
verified: a real shell. This rests on Capacitor's source as installed.

**The tools serve it that way now.** `scripts/lib/shell-server.mjs` is the
shell's answer to a request, and `export-walk.mjs` and `export-perf.mjs`
are on it, in the shell's user agent, reaching every screen by a cold start
and then the router. Section 11 of the walk fails if the bundle has a second
document or if anything asks for one.

**What a hard load does.** The shell hands over the front door for it, pruned
or not. The app used to sit on Today under the other screen's address;
`lib/nav/entry.ts` asks the router for the screen the address names.

**What is left**, of 347.0 MB: the Bible's pages are still about 123 MB
for the 5.3 MB of verses 1.5.1 measured (each chapter's `index.txt` is 76 KB,
most of it the frame every page carries, and three small segment files beside
it), the data files 75 MB, the Fathers 57 MB in two folders, and
`content/content-package.json` 33 MB. That last one is imported into the
on-device store at first launch and then read by no screen: `useRepository`
and `useLocalContent` still have no caller outside the file that defines
them, as this document said in July. Whether that layer is the future or is
superseded by the data files of 1.5.1 is the owner's to decide, and it is
33 MB either way.

The next cut of any size is one reader screen that reads a chapter's verses
from a file, the way `app/bible-data/` already serves its Greek: about
another 110 MB, and a change to how the apps are routed, so not a patch's
work.

## 1.6 (2026-10-11): the build weighs everything, both ways

**What was wrong with the check.** It never stopped a build, it skipped
`_next`, where the code and all 21 language files live, and it counted bytes
on disk only. A language file could double and the check would not see it,
and the number an Android reader downloads was never printed at all.

**The check now.** `lib/build/exportSize.ts` weighs the whole export on disk
and packed (each file deflated on its own at level 6, the measure this
document has used since 1.5.2), shows `_next` on its own line, and can stop
a build. `scripts/native-build.mjs` runs it last through
`scripts/export-size.mjs out --guard`. The same script weighs any export by
hand and lists the heaviest folders:

```
node --experimental-strip-types scripts/export-size.mjs [out] --top 12
```

Every run leaves its measure in `.release-logs/export-size.json`, which is
not committed. This table is the written record.

**No ceiling is set.** `EXPORT_LIMITS` holds two, on disk and packed, and
both are null: where the limit sits for 1.6 is the owner's decision and he
has not made it. Until he does, the only judgement is the old warning, kept
where it was (0.60 GB without `_next`). When he names the numbers they go in
that one constant, in bytes, and the next build over either one fails.

**The 1.6 export after the first run** (`ce03b4b7`, the iPhone export), with
1.5.2 weighed again the same way from the export left in its worktree:

| | 1.5.2 | 1.6, first run |
|---|---|---|
| `out/` on disk | 346.9 MB, 10,096 files | 348.6 MB, 10,093 files |
| Packed, file by file | 99.9 MB | 100.0 MB |
| `_next` alone | 15.0 MB, 6.1 MB packed | 14.9 MB, 6.0 MB packed |
| Without `_next`, against the 0.60 GB warning | 0.32 GB | 0.33 GB |

The first run added a page, a palette, three shortcuts and a tick, and took
a page away, and it cost 1.7 MB on disk and 0.1 MB packed. 1.3 MB of that is
the Bible's 1,364 chapters each growing by 940 bytes (463 in `index.txt` and
477 in `__next._index.txt`, read on Obadiah 1 and John 3), because the frame
every page carries grew: that is "a page carries what it shows" again, and
it is why the next cut of any size is still the reader that takes a
chapter's verses from a file. The Prayers page itself lost 2.2 KB with the
prayer rope.

**Where the weight is now**, on disk and packed: `bible` 124.0 and 18.2 MB,
`bible-data` 75.1 and 19.9, `content` 32.7 and 10.9, `saints-data` 29.4 and
10.1, `saints` 28.3 and 8.2, `_next` 14.9 and 6.0, `audio` 7.9 and 7.6,
`shop` 7.3 and 5.2, `history` 7.3 and 4.8.

**Not known.** What the stores show a reader for any build. That number has
never been written down here, and only a store listing or a phone can give
it.
