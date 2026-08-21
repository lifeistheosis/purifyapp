import { headers } from "next/headers";
import { NONCE_HEADER } from "@/lib/security/headers";
import "../admin/admin-theme.css";

// The owner dashboard borrows the admin's theme layer rather than growing a
// third palette. Two reasons: the operator switching between /admin and
// /owner should not feel like switching products, and admin-theme.css is
// where the contrast floors are pinned under test, so anything styled off
// those tokens inherits that guarantee for free.
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
