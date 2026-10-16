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

// PICTURES ARE THE EXCEPTION to the resource policy above.
//
// "same-origin" tells a browser to show a response on purifyapp.net and
// nowhere else. That is right for a page or an API answer and wrong for a
// picture, because an email is read on somebody else's site. Found 2026-10-06
// when the owner opened the welcome email in Resend's preview and the cross
// at the top was a broken image. Asked for from another site in a real
// browser, the cross, both pictures of the 1.5 letter and the optimizer's
// output were all refused with ERR_BLOCKED_BY_RESPONSE.NotSameOrigin, while
// every one of them answered 200 to curl. So a 200 says nothing here: the
// file arrives and the browser declines to draw it.
//
// Gmail fetches pictures through its own servers, which is why it went
// unseen; a mail app that loads them straight from here did not show them.
// The apps are another origin as well (https://localhost on Android,
// capacitor://localhost on iPhone), and they ask the optimizer for Google
// account pictures (lib/community/avatarSrc.ts).
//
// Everything these two rules match is public already: a picture file under
// public/, and /_next/image, which serves only those and the remote hosts in
// `images` below, fetched with no reader's cookies. Pages, data and the API
// keep "same-origin". lib/email/__tests__/picturesShowElsewhere.test.ts holds
// every picture an email can carry to this.
const pictureHeaders = [
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
];
const PICTURE_SOURCES = [
  "/:picture(.*\\.(?:png|jpg|jpeg|webp|gif|avif|svg|ico))",
  "/_next/image",
];

// CHANT MEDIA is the other exception (1.7). Every chant's recordings, timed
// words and cover live under /audio/chants/ on the website alone: the apps'
// export leaves them out (scripts/native-build.mjs) and the apps ask the
// website for them (lib/chants/media.ts). The apps are another origin
// (https://localhost, capacitor://localhost), so without these the browser in
// the app refuses a recording the server answered 200 for, as it refused the
// email pictures above. The audio element needs the resource policy; the
// timing files and live.json are read with fetch() and need the CORS header.
// All of it is public and served with no reader's cookies.
//
// live.json is the takedown list: kept fresh for minutes, not a day, so a
// pulled recording stops quickly everywhere. The rule after the general one
// wins for the key both set.
//
// The read-aloud covers (1.7, lib/readAloud/covers.ts) take the same way and
// the same headers: /covers/ is set aside by the native build too, and the
// apps ask the website for it (lib/media/streamed.ts lists every such
// folder). A day of cache, as for a chant, so a cover taken off the website
// is gone from the apps within a day; a new picture gets a new name
// (moses.v2.jpg), so a replacement never waits on it.
const streamedMediaHeaders = [
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Cache-Control", value: "public, max-age=86400" },
];
const CHANT_MEDIA_SOURCE = "/audio/chants/:path*";
const CHANT_LIVE_LIST = "/audio/chants/live.json";
const READ_COVERS_SOURCE = "/covers/:path*";

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
      // When this build was made, for lib/packs/store.ts: a content pack the
      // phone saved before this build was installed is older than what the
      // build carries, and is not put in front of it.
      env: { NEXT_PUBLIC_PURIFY_BUILT_AT: new Date().toISOString() },
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
          // 1.6: the digital prayer rope came down on the owner's decision of
          // 2026-10-10. The page was live, so old links land on Prayers.
          { source: "/prayers/rope", destination: "/prayers", permanent: true },
          // 1.7: the Prayer Rope Anthem is the first chant of Chants, on the
          // one page every chant has. (The Kitchen's old links, /kitchen and
          // /trapeza, are not sent anywhere: they show the not-found page,
          // the owner's word of 2026-10-16.)
          { source: "/prayers/anthem", destination: "/chants/prayer-rope-anthem", permanent: true },
        ];
      },
      async headers() {
        return [
          { source: "/:path*", headers: securityHeaders },
          // After the rule above on purpose: when two rules set the same key
          // on one path, the later one wins (Next's headers guide).
          ...PICTURE_SOURCES.map((source) => ({ source, headers: pictureHeaders })),
          { source: CHANT_MEDIA_SOURCE, headers: streamedMediaHeaders },
          { source: CHANT_LIVE_LIST, headers: [{ key: "Cache-Control", value: "public, max-age=300" }] },
          { source: READ_COVERS_SOURCE, headers: streamedMediaHeaders },
        ];
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
          // Google account pictures, and only those: the Android app cannot
          // load them from Google itself (lib/community/avatarSrc.ts), so
          // they are served through this optimizer from our own domain.
          { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/a/**", search: "" },
          { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/a-/**", search: "" },
        ],
      },
    };

export default nextConfig;
