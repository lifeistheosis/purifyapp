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
