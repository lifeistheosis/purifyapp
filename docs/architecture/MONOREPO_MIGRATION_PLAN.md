# Purify — GitHub Structure Audit & Monorepo Migration Plan

Status: **PLAN ONLY** (no file moves). Authored 2026-06-15.
Guiding principle: **one Purify source, three app targets, release branches only when preparing a release.**

> ⚠️ Launch timing: store submission is targeted ~2026-06-20 (days away). The
> web-app move (Phases 3–4) is **P0 risk** in this window. Recommendation:
> **document the target now, execute the move AFTER launch.** Only the
> zero-risk scaffolding in Phase 2 (and this doc) should happen pre-launch.

---

## 1. Current Repo Summary

- **Repo:** `github.com/lifeistheosis/purifyapp` (private). Default branch `main`.
- **Web app:** a single **Next.js 16.2.6** app at the **repo root** (App Router /
  RSC), **React 19.2.4**, TypeScript, Tailwind v4. The app is NOT in a subfolder —
  `app/`, `components/`, `lib/`, `data/`, `types/`, `public/` all sit at root.
- **Package manager:** **npm** (`package-lock.json`). No `workspaces`, no
  `packageManager` field → single-package repo today.
- **Path alias:** `@/* → ./*` (root-relative). Every import (`@/components/…`,
  `@/lib/…`, `@/data/…`) resolves from the repo root. **This is the single biggest
  coupling to the root layout.**
- **Build / run:** `next build` / `next dev` / `next start`. Lint `eslint`,
  typecheck `tsc --noEmit`, unit `vitest run`, e2e `playwright test`, perf `lhci`.
- **Deployment:** **Render** serves `purifyapp.net`, watches `main`. No
  `render.yaml`/`vercel.json` in the repo → build & root directory are configured
  in the **Render dashboard** (assumption: root dir = repo root, build = `next build`).
  PWA with a versioned service worker (cache vX.Y.Z).
- **Content:** spans three places — `data/<domain>/` (apologetics, bible, calendar,
  changelog, councils, marketing, prayers, saints, support, theology, today,
  topics), `lib/<domain>/` loaders (saints, prayers, councils, theology,
  apologetics, heresies, bible, calendar, topics, …), and **Supabase tables**
  populated by `scripts/ingest-*` / `fetch-*`. No single canonical content package.
- **Supabase:** `supabase/migrations/` (no `functions/` dir yet).
- **Scripts:** 51 Node `.mjs` scripts — content ingestion (`ingest-*`, `fetch-*`,
  `dogma-extract`) and ops (`discord-*`). They hardcode `data/` and `lib/` paths.
- **Tests:** vitest (unit) + playwright (e2e) + lighthouse; configs at root
  (`vitest.config.ts`, `playwright.config.ts`, `lighthouserc.json`).
- **Env:** `.env.local`, `.env.discord` (+ `.example`s) at root.
- **Native:** Capacitor 8 thin shells — `ios/`, `android/`, `capacitor-shell/`,
  `capacitor.config.ts`. `appId net.purifyapp.purify`; `server.url =
  https://purifyapp.net` (the shells load the live site at runtime; `webDir` is
  unused). So the "native apps" are wrappers, not native codebases.
- **CI (`.github/workflows/`):** `ci.yml` (push/PR to `main`: lint + typecheck +
  tests), `android-apk.yml` (`workflow_dispatch` → signed APK/AAB to the
  `android-release` release), `ios-ipa.yml` (`workflow_dispatch` → unsigned `.ipa`
  to `ios-release`; **currently only on `feat/palette-overhaul`, not on `main`**).
- **Misc:** many root-level `*.md` docs (ARCHITECTURE, AUDIT, V10-SCOPE, …),
  `proxy.ts`, `promo/`, `dogma-scan.json`.

## 2. Problems With Current Structure

- **Root-rooted app + `@/*→./*`** — moving the app to `apps/web/` rewrites the alias
  base and touches every tool config (next, vitest, playwright, eslint, postcss,
  tsconfig) plus the **Render root directory** and the **Capacitor path**. High blast radius.
- **No canonical content package** — content lives in `data/` + `lib/` + Supabase.
  Native apps have nowhere clean to consume it → **content drift** risk across web/iOS/Android.
- **No workspace tooling** — cannot share types/UI/api-client/entitlements as packages.
- **Native = wrappers only** — there is no home for real iOS/Android native work.
- **`ios-build` workflow not on the default branch** — `workflow_dispatch` only runs
  from the default branch, so the iOS build isn't triggerable (the blocker hit on 06-15).
- **Deploy config lives in the Render dashboard, not the repo** — a path move can
  break prod deploy *silently* unless the dashboard root dir is updated in lockstep.
- **Scripts hardcode `data/`/`lib/` paths** — a move breaks the ingestion pipeline.
- **No content build/version step** — content is imported directly as TS/JSON; there's
  no buildable, versioned, platform-neutral content artifact for native apps.

## 3. Recommended Final Structure

```txt
purify/
  apps/
    web/                # the Next.js app (everything currently at root)
    ios/                # native iOS (Capacitor shell now → SwiftUI later)
    android/            # native Android (Capacitor shell now → Compose later)
  packages/
    content/            # CANONICAL Orthodox content (source + schemas + build)
    shared/             # cross-platform types, constants, calendar/fast logic
    api-client/         # Supabase client + typed data access
    ui/                 # web design tokens + shared components
    entitlements/       # subscription/entitlement logic (platform-agnostic)
    config/             # base eslint / tsconfig / tailwind presets
  supabase/
    migrations/
    functions/          # (add when first edge function lands)
  docs/
    app-store/  google-play/  privacy/  terms/  release-notes/  architecture/
  scripts/
    import-content/  verify-public-domain/  build-content/  lint-content/
  .github/workflows/
    tests.yml  web-deploy.yml  ios-build.yml  android-build.yml  content-check.yml
```

Deltas from the generic template, justified by this repo:
- **Canonical content = `packages/content/`** (a versioned workspace package), NOT a
  top-level `content/`. Reason: native apps consume it as a dependency and via a build
  step; a loose top-level folder invites copy-paste drift. *(Decision point — §12.)*
- **Add `packages/entitlements/`** — the entitlement spine already exists in
  `lib/entitlements`; it deserves to be shared, not web-only.
- The current `lib/<domain>` loaders split: pure content/logic → `packages/content` /
  `packages/shared`; web-only React/data-fetching → stays in `apps/web`.

## 4. Migration Plan (phased, safe)

**Phase 1 — Repo Audit.** *(this document; no moves)*

**Phase 2 — Monorepo shell (low-risk, pre-launch OK).**
- Add root `package.json` with `workspaces: ["apps/*","packages/*"]` (npm workspaces;
  Turborepo optional later for caching).
- Create empty `apps/`, `packages/`, `docs/architecture/`, `docs/app-store/`,
  `docs/google-play/`, `docs/release-notes/` (no app moves yet).

**Phase 3 — Move web app → `apps/web` (P0; AFTER launch).**
- `git mv` app source into `apps/web/` (keep one commit, no content edits).
- Update: `tsconfig` `baseUrl`/`paths` (`@/*` → `apps/web/*` or a per-app tsconfig),
  `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`,
  `postcss.config.mjs`.
- Update **Render root directory → `apps/web`** (dashboard) in the same change window.
- Update `capacitor.config.ts` `webDir` path; update `scripts/*` `data/`/`lib/` paths.
- Verify: typecheck, lint, unit, e2e, `next build`, and a Render preview deploy
  BEFORE pointing prod at it.

**Phase 4 — Extract shared packages (P1; after Phase 3).**
- `packages/shared` (types, constants, calendar/fast pure logic),
  `packages/api-client` (Supabase + data access), `packages/content` (source data +
  schemas + build), `packages/entitlements`, `packages/ui`.
- Replace `@/…` deep imports into these with package imports incrementally.

**Phase 5 — Native app folders (placeholders).**
- Move existing Capacitor shells: `ios/` → `apps/ios/`, `android/` → `apps/android/`.
- Keep wrapper-first; do NOT build full native apps yet unless instructed.

**Phase 6 — CI/CD per platform.** *(see §8)*

**Phase 7 — Release model.** *(see §9)*

## 5. Native App Strategy

- **Now (launch):** keep the **Capacitor shells** — they already load `purifyapp.net`,
  so iOS/Android ship fast with zero native rewrite. Live under `apps/ios`/`apps/android`.
- **Later (true native, incremental):** **SwiftUI** (iOS) and **Kotlin + Jetpack
  Compose** (Android), sharing the **Supabase backend**, the **built content bundle**
  (`packages/content` → JSON), and **design tokens**. The **web app stays canonical**
  for content and fast iteration; native screens are added where they pay off (offline
  reading, background audio/chant, home-screen widgets, push).
- **Do not** force React Native; **do not** convert the whole app to native now. The
  immediate goal is **repo readiness**, not a native rewrite.

## 6. Content Strategy (one canonical source)

- **Single source of record: `packages/content/`** holding the raw PD source records
  (saints, prayers, councils, theology, apologetics, heresies, catena/patristic,
  Bible metadata) + **schemas** + a **provenance manifest** (PD source, translator,
  edition, license note per record).
- **Build step (`scripts/build-content`)** emits platform bundles: web import maps,
  an iOS `Content.bundle` JSON, Android `assets/` JSON. Native apps consume the
  **built** artifact — they NEVER copy source. This is what kills drift.
- **Verification (`scripts/verify-public-domain`, `scripts/lint-content`)** runs in CI
  (`content-check.yml`): every record must carry valid PD provenance + pass schema lint.
- **Versioning:** tag content releases `content-vYYYY.MM.DD`; the build embeds the
  content version so each app reports exactly which corpus it shipped.

## 7. Subscription & Account Readiness

- Move the existing entitlement spine (`lib/entitlements`, `ENTITLEMENTS_ENFORCED`) →
  **`packages/entitlements/`** (platform-agnostic checks + the `upsert_entitlement` RPC contract).
- Platform billing adapters, each thin:
  - `apps/web/src/billing/` — Stripe (desktop PWA).
  - `apps/ios/Billing/` — StoreKit 2 (or RevenueCat).
  - `apps/android/billing/` — Play Billing (or RevenueCat).
- Pre-launch **lifetime/`is_supporter`** sync entitlement seeds via a one-time
  service-role script (keep under `scripts/`).
- **Do not implement billing now** — just reserve these homes so V10 wiring drops in cleanly.

## 8. CI/CD Recommendation

| Workflow | Responsibility | Trigger |
|---|---|---|
| `tests.yml` | lint + typecheck + vitest + (playwright) | PR + push to `main`/`staging` |
| `web-deploy.yml` | build web (or keep Render dashboard deploy) | push to `main` (prod), `staging` (preview) |
| `ios-build.yml` | build `apps/ios` shell → unsigned `.ipa` to `ios-release` | `workflow_dispatch` |
| `android-build.yml` | build `apps/android` → signed APK/AAB to `android-release` | `workflow_dispatch` |
| `content-check.yml` | PD provenance + content schema lint | PR touching `packages/content` |

> **GitHub rule (load-bearing):** a `workflow_dispatch` workflow is only runnable if
> its file is on the **default branch**. So `ios-build.yml` and `android-build.yml`
> must live on `main` — NOT on platform branches. (This is exactly why a permanent
> `ios` branch would *break* the iOS build button.) **Immediate unblock:** add the
> iOS workflow to `main` alongside the Android one — endorsed by this architecture.

## 9. Branching Policy (and why permanent platform branches are rejected)

```txt
main                      # production-ready source of truth; web deploys from here
staging                   # pre-production QA; optional preview deploy
feature/*                 # temporary work (feature/prayers-redesign, feature/ios-native-shell)
release/web-vX.Y.Z        # frozen web release prep
release/ios-vX.Y.Z        # frozen iOS release prep
release/android-vX.Y.Z    # frozen Android release prep
hotfix/*                  # emergency fixes (hotfix/web-cache-version)
```

**Tags mark shipped builds:** `web-v9.9.5`, `ios-v1.0.0`, `android-v1.0.0`, `content-v2026.06.30`.

**Why NOT permanent `website` / `ios` / `android` branches:**
- **Version drift** — three branches diverge; the same fix must be cherry-picked 3×.
- **Duplicated fixes & merge conflicts** — shared content/logic edited in parallel collide.
- **Unclear home for shared content** — no single source of truth; copies multiply.
- **Broken `workflow_dispatch`** — build workflows off the default branch aren't runnable.
- Branches should represent **work state** (feature/release/hotfix), **not products**.
  Products are **folders** (`apps/web|ios|android`); platforms differ by directory + tag,
  not by long-lived branch.

## 10. Risks

**P0 (launch-blocking if done now):**
- Moving the web app breaks `@/*` resolution + all tool configs → red CI / broken build.
- Render **root directory** mismatch after the move → **prod deploy breaks silently**.
- Capacitor `webDir`/path change → shell build breaks → app-store deadline slips.

**P1:**
- Content duplication/drift once native apps appear (mitigated by `packages/content` + build).
- `scripts/*` hardcoded paths break ingestion after the move.
- Env-var path / loading changes between root and `apps/web`.

**P2:**
- Native scope creep (wrapper → full native pulled forward).
- Monorepo tooling learning curve; tsconfig/test-config churn.

## 11. Implementation Checklist (execute post-launch, on a branch)

Pre-flight (read-only): ✅ git status · ✅ npm + `package-lock.json` · ✅ build `next build`
· ⬜ confirm Render dashboard root dir + build cmd · ✅ alias `@/*→./*` · ⬜ inventory env
usage · ✅ CI workflows · ✅ content under `data/`+`lib/`+Supabase.

Phase 2 (safe now):
- [ ] `feature/monorepo-shell`: add root `package.json` `workspaces`, create `apps/`,
      `packages/`, `docs/{architecture,app-store,google-play,release-notes}/`.

Phase 3 (post-launch, `feature/move-web`):
- [ ] `git mv` web app into `apps/web/` (single mechanical commit).
- [ ] Update tsconfig `baseUrl`/`paths`, next/vitest/playwright/eslint/postcss configs.
- [ ] Update `capacitor.config.ts` path + `scripts/*` data/lib paths.
- [ ] Update Render **root directory → `apps/web`** (dashboard).
- [ ] `npm run typecheck && npm run lint && npm run test:unit && npm run test:e2e && npm run build`.
- [ ] Render **preview** deploy green BEFORE prod cutover.

Guardrails: never delete without a backup branch; never rename a major folder until
imports + build are accounted for; keep `main` shippable at every step.

Post-change verification: typecheck · lint · unit · e2e · `next build` · deploy config ·
content paths intact · route paths unchanged · summarize exact files changed.

## 12. Founder Decision Points (need approval)

1. **Timing:** move the web app **after launch** (recommended — submission ~06-20), or now?
2. **Canonical content:** **`packages/content/`** (recommended) vs a top-level `content/`?
3. **Native approach:** **wrapper-first for launch**, true native (SwiftUI/Compose) later
   (recommended) vs invest in native now?
4. **Render:** can the deploy tolerate **root dir = `apps/web`** (do you have dashboard access
   to change it)?
5. **`staging`:** stand up a staging branch + **preview deploy** (recommended)?
6. **Tooling:** **npm workspaces** first (recommended, you're already on npm), add Turborepo
   for caching later — or go pnpm + Turborepo now?

## Immediate (independent of the migration)

To unblock the **iOS native downloadable build like Android** *today*, the architecture
endorses one small step: **add `ios-build`/`ios-ipa.yml` to `main`** (so it's
`workflow_dispatch`-runnable, exactly like `android-apk.yml`). That is a CI-workflow-only
change — no app/UI code, native `ios/` project already on `main`. Needs explicit approval
to push to `main`.
