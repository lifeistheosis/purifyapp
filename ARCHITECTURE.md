# Purify, Architecture

A one-page map of the codebase. For setup and contribution flow, see [CONTRIBUTING.md](CONTRIBUTING.md). For what the project is and what it isn't, see [/about](app/(app)/about/page.tsx).

## Stack

- **Next.js 16** (App Router, RSC-first). The `AGENTS.md` reminder applies: this is Next 16, not the Next.js most training data describes. Read `node_modules/next/dist/docs/` before reaching for an API you remember.
- **React 19** with `useSyncExternalStore` for the reader-prefs and bookmarks stores. Avoid `useState` + `useEffect` lifecycles for cross-render-tree state.
- **TypeScript strict**. `npx tsc --noEmit` must stay clean.
- **Tailwind v4** via `@tailwindcss/postcss`. No `tailwind.config.js`, class scanning is automatic.
- **Supabase** (Postgres + Auth) for user data and analytics; service role only on the server.
- **Render** for hosting. Auto-deploys on push to `origin main` (Purify uses `origin`, not the `homebase` remote operator-os uses).

## Routes

All app routes live under [`app/(app)/`](app/(app)/) (the `(app)` group wraps them in the shared shell). API handlers under [`app/api/`](app/api/).

| Route | Purpose |
|---|---|
| `/` | Home, TodayStrip, four pillars, hero. |
| `/bible` | Bible index. |
| `/bible/[book]/[chapter]` | Scripture reader. SSG via `generateStaticParams` over all canonical chapters. |
| `/saints` | Saints index. |
| `/saints/[slug]` | Saint profile card. |
| `/saints/[slug]/[work]` | Full patristic work, rendered as a long-form reader. |
| `/calendar` | Liturgical month grid + sticky day-detail aside. `?d=YYYY-MM-DD` deep links to a day. |
| `/prayers/today` | Today's prayer rule. |
| `/prayers/morning`, `/prayers/evening` | Fixed prayer rules. |
| `/prayers/learning/[lessonId]` | Learn-to-pray lessons. |
| `/about`, `/privacy`, `/faq`, `/whats-new` | Posture pages. |
| `/support` | Donations + transparent budget. |
| `/account`, `/saved` | Signed-in dashboards. |
| `/admin` | Live View visit stats (service-role only, gated). |
| `/api/track` | Anonymous visit recording. See [the route](app/api/track/route.ts). |
| `/api/admin/stats` | Admin Live View read endpoint. |
| `/api/support/bmc` | Buy Me a Coffee donation webhook. |
| `/api/auth/*`, `/signout`, `/delete` | Supabase auth flow. |

## Data layers

- **Public-domain scripture + patristics**, JSON under [`lib/bible/`](lib/bible/) (Brenton 1851 LXX, KJV 1611, Greek + Strong's) and [`lib/saints/`](lib/saints/) (NPNF1/NPNF2 corpora, Chrysostom verse-by-verse). Static. Loaded at build for SSG.
- **Licensed scripture (NKJV / NIV / NLT)**, fetched live from API.Bible via [`lib/bible/api-bible.ts`](lib/bible/api-bible.ts). FUMS-compliant: short cache (6h `revalidate`), no DB persistence, one chapter per request, attribution + FUMS token rendered by `ScriptureAttribution` and `Fums` components. `isApiConfigured()` returns false when env is absent so the PD site is unaffected.
- **User sync data**, Supabase tables behind RLS. Auth via `@supabase/ssr`. Highlights, bookmarks, prayer-rule check-offs, account.
- **Analytics**, service-role writes from [`app/api/track/route.ts`](app/api/track/route.ts) into `analytics_sessions` (one row per anonymous session, with coarse geo from [`lib/analytics/geo.ts`](lib/analytics/geo.ts)) and `analytics_pageviews` (one row per page load). Pruned at 90 days; see [`docs/operations/analytics-retention.md`](docs/operations/analytics-retention.md).

## Rendering strategy

- **SSG**: every Bible chapter, every saint, every saint work, via `generateStaticParams`. ~4,100 chapter routes + ~80 saint routes built ahead of time.
- **ISR (1h)**: `/`, `/calendar`, `/prayers/today`, `/support`. Keeps date-sensitive content fresh without dynamic rendering.
- **Server components by default.** Client components only where required (reader prefs, toggles, inputs). Keeps the JS payload small enough that Lighthouse Performance ≥85 holds.
- **Color is never the only signal**, fast/tone surfaces also carry an icon + a label. This is a load-bearing rule for [`/calendar`](app/(app)/calendar/page.tsx) and the TodayStrip; see [CONTRIBUTING.md](CONTRIBUTING.md).
- **Bespoke iconography.** No icon-font payload; SVGs in [`components/icons/`](components/icons/) are inlined. lucide-react is allowed but `aria-label` is required on any non-decorative use.

## Build / deploy

- `npm install --legacy-peer-deps`, required by [.npmrc](.npmrc), see the file for why (React 19 vs `react-simple-maps@3`).
- `npm run build` → `next build` → Render picks up. No `render.yaml` in repo; deploy config is in the Render dashboard.
- `.github/workflows/ci.yml` runs lint + types + build + Playwright + Lighthouse on every push and PR.

## Where to start if you're new

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup.
2. Read [`app/(app)/about/page.tsx`](app/(app)/about/page.tsx) for the project ethos.
3. Read [`app/(app)/privacy/page.tsx`](app/(app)/privacy/page.tsx) to see exactly what the site does and doesn't record.
4. Skim a single end-to-end route: home → reader → saint. Start at [`app/(app)/page.tsx`](app/(app)/page.tsx).
