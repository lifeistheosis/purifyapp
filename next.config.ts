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

const nextConfig: NextConfig = {
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
};

export default nextConfig;
