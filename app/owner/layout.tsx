import { headers } from "next/headers";
import { NONCE_HEADER } from "@/lib/security/headers";
import "../admin/admin-theme.css";

// One theme layer, not two. Until v4 this route also imported
// ./owner-theme.css, which re-bound the accent, the grounds, the inks and
// the series to a cool set. That file is gone: its palette IS the admin
// palette now, and its keyframes moved into admin-theme.css.
//
// The old arrangement had a trap worth recording. Both sheets scoped at
// the same specificity, so source order was the only tiebreaker, and
// swapping these two import lines silently reverted the whole dashboard
// to amber. Nothing tested it. One sheet cannot have that bug.
//
// The pre-paint script is duplicated rather than shared. It is a string
// literal by design, so that it depends on no bundling order and runs ahead
// of any markup; exporting it from a module and importing it here would put
// a module boundary in front of the one script that must not wait.
//
// force-dynamic for headers(). No IS_STATIC_EXPORT guard needed:
// scripts/native-build.mjs stashes app/owner out of the native export, so
// this file only exists in a web build, where a request and a nonce always do.
export const dynamic = "force-dynamic";

const ADM_THEME_PREPAINT = [
  "(function(){try{",
  "var d=document.documentElement,v=null;",
  "try{v=localStorage.getItem('purify.admin.theme')}catch(e){}",
  "if(v!=='light'&&v!=='dark'){",
  "v=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';}",
  "d.setAttribute('data-adm-theme',v);",
  "}catch(e){}})();",
].join("");

export default async function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    <>
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: ADM_THEME_PREPAINT }} />
      {children}
    </>
  );
}
