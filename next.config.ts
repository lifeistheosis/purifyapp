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

// Android local-first build target. `BUILD_TARGET=android next build` produces
// a fully static export (out/) that Capacitor bundles in the APK, so the app
// renders locally with no network. The default (web) build is unchanged: SSR,
// redirects, security headers, and image optimization stay on for purifyapp.net.
// redirects()/headers() need a server and are unsupported by output:export, so
// they are omitted in the Android target.
const isAndroid = process.env.BUILD_TARGET === "android";

const nextConfig: NextConfig = isAndroid
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
      // repackaged-product photos replace them.
      images: {
        remotePatterns: [
          { protocol: "https", hostname: "img.kwcdn.com" },
          { protocol: "https", hostname: "aimg.kwcdn.com" },
        ],
      },
    };

export default nextConfig;
