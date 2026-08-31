import type { NextConfig } from "next";

// Static security headers applied to every response. The dynamic
// Content-Security-Policy (with per-request nonce) is attached in
// middleware.ts instead, since it needs a fresh value per render.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

// Native local-first build target. `BUILD_TARGET=android|ios next build` produces
// a fully static export (out/) that Capacitor bundles into the app, so it renders
// locally with no network. Android loads it from https://localhost and iOS from
// capacitor://localhost; both need the identical export, which is why one flag
// covers both. The default (web) build is unchanged: SSR, redirects, security
// headers, and image optimization stay on for purifyapp.net. redirects() and
// headers() need a server and are unsupported by output:export, so they are
// omitted in the native targets.
//
// This duplicates lib/platform/buildTarget.ts on purpose. next.config.ts is
// loaded outside the app's module graph and does not resolve the "@/" alias, so
// importing the helper here works until it abruptly does not. The two are held
// in step by lib/platform/__tests__/buildTarget.test.ts, which reads this file
// as text, the same trick lib/appUpdate/__tests__/release.test.ts uses on
// build.gradle.
const isNative =
  process.env.BUILD_TARGET === "android" || process.env.BUILD_TARGET === "ios";

const nextConfig: NextConfig = isNative
  ? {
      output: "export",
      // Capacitor serves files from disk: trailing slashes give every route its
      // own index.html, and the image optimizer needs a server so pass through.
      trailingSlash: true,
      images: { unoptimized: true },
      // The export runs with app/api stashed (route handlers can't be exported),
      // so Next's generated route types reference now-absent modules. Type
      // safety is enforced separately (npm run typecheck) as the real gate;
      // skipping it here only avoids that stash artifact.
      typescript: { ignoreBuildErrors: true },
    }
  : {
      // BUILD MEMORY, not build speed.
      //
      // Render killed the 1.3 deploy with "Ran out of memory (used over 8GB)".
      // Next spreads static generation across workers, and
      // node_modules/next/dist/build/index.js:311-318 shows the count comes
      // straight from this option. The default put seven workers on the box,
      // and each carries its own Next runtime plus whatever the pages import:
      // 1,895 static pages over a 124MB data/ tree and 5.2MB of message
      // catalogs. Seven copies of that is the 8GB.
      //
      // It built fine locally and in the Android CI job, which is why it was
      // not caught before the push: both have more headroom than the Render
      // builder does.
      //
      // memoryBasedWorkersCount is the option that sounds right and is not.
      // The same file enforces a floor of four workers under it, which can
      // still blow the cap.
      //
      // Two trades build minutes for a deploy that finishes. Raise it only
      // against a real Render build, never against a local one.
      experimental: { cpus: 2 },
      async redirects() {
        return [
          { source: "/prayer", destination: "/prayers", permanent: true },
          { source: "/scripture", destination: "/bible", permanent: true },
          // v3.4: the Jesus Prayer counter page was retired in favor of the
          // learning lesson. Old bookmarks land on the lesson that teaches
          // the prayer itself.
          {
            source: "/prayers/jesus-prayer",
            destination: "/prayers/learning/jesus-prayer",
            permanent: true,
          },
        ];
      },
      async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
      },
      // Supplier product photos for dropshipped shop listings live on Temu's
      // CDN. next/image proxies them through /_next/image (same-origin), so the
      // CSP img-src 'self' still covers them. These are placeholders until real
      // repackaged-product photos replace them. Admin-uploaded product photos
      // live in the public shop-media bucket on the Supabase project host.
      images: {
        remotePatterns: [
          { protocol: "https", hostname: "img.kwcdn.com" },
          { protocol: "https", hostname: "aimg.kwcdn.com" },
          { protocol: "https", hostname: "avbqyvjgcrucjwevwixt.supabase.co" },
        ],
      },
    };

export default nextConfig;
