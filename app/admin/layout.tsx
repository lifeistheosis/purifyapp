import { headers } from "next/headers";
import { NONCE_HEADER } from "@/lib/security/headers";
import "./admin-theme.css";

// Owns two things for every page under /admin: the theme stylesheet, and the
// attribute that picks which of its two palettes is live.
//
// The stylesheet import moved here from app/admin/page.tsx so that the theme
// covers /admin/preview and /admin/shell-preview too. The auth gate in
// page.tsx is untouched.
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
      {children}
    </>
  );
}
