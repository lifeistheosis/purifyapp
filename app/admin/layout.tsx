import { headers } from "next/headers";
import { NONCE_HEADER } from "@/lib/security/headers";
import "./admin-theme.css";

// Owns three things for every page under /admin: the theme stylesheet, the
// attribute that picks which of its two palettes is live, and the
// data-surface root the v1.4 layout keys on.
//
// The stylesheet import lives here rather than in app/admin/page.tsx so that
// the theme covers /admin/shop, /admin/styleguide and the previews too. The
// auth gate in page.tsx is untouched.
//
// RESTORED 2026-09-13. v1.4 removed the pre-paint script below together with
// the dark palette, because the Ledger theme was light only. The owner kept
// the v1.4 layout and brought the two palettes back, so the script is back.
//
// force-dynamic because of headers() below. Unlike app/layout.tsx this needs
// no IS_STATIC_EXPORT guard: scripts/native-build.mjs stashes the whole
// app/admin tree out of the native export, so this file only ever exists in
// a web build, where a request and a nonce always exist.
export const dynamic = "force-dynamic";

// Sets the admin palette before the first paint. Kept as a string literal so
// nothing here depends on bundling order, and deliberately tiny: it runs
// ahead of the shell markup on every cold load.
//
// The OS preference is read here and only here, and only when the operator
// has not chosen. Doing it as a CSS @media block instead would need a third
// override table so that an explicit dark choice could still beat a light OS
// setting, which is three times the palette surface for no gain.
//
// The try/catch matters: storage can be blocked, and a blocked storage API
// must fall back to a theme rather than throw before anything has rendered.
// With JS off the admin renders dark, which is the historical look.
const ADM_THEME_PREPAINT = [
  "(function(){try{",
  "var d=document.documentElement,v=null;",
  "try{v=localStorage.getItem('purify.admin.theme')}catch(e){}",
  "if(v!=='light'&&v!=='dark'){",
  "v=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';}",
  "d.setAttribute('data-adm-theme',v);",
  "}catch(e){}})();",
].join("");

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Per-request CSP nonce, set by proxy.ts. lib/security/headers.ts builds
  // script-src with 'strict-dynamic', so an inline script without the nonce
  // would be reported today and blocked the moment the policy stops being
  // Report-Only.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  return (
    <>
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: ADM_THEME_PREPAINT }} />
      {/* The token root. The Modal and the mobile sheet portal to
          document.body, outside this div, and carry .adm themselves so the
          same blocks reach them; the light palette is keyed on <html>, which
          they share. */}
      <div data-surface="admin" className="adm min-h-[100dvh]">
        {children}
      </div>
    </>
  );
}
