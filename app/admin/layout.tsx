import { IBM_Plex_Mono, IBM_Plex_Sans, Noto_Emoji } from "next/font/google";
import { headers } from "next/headers";
import { NONCE_HEADER } from "@/lib/security/headers";
import "./admin-theme.css";

// The panel's two faces, the same pair the SSM board is set in. Loaded here
// and not in app/layout.tsx so that only /admin routes carry them: a reader
// never downloads a font the reader app does not use, and the native export
// never bundles one, because scripts/native-build.mjs stashes this tree.
//
// Plex Sans is a variable font, so one file covers every weight the panel
// sets (400 to 700). Plex Mono is not, and the panel only ever sets it at
// regular and medium. `subsets` names what is PRELOADED; the other scripts
// Plex covers (Greek and Cyrillic, which a customer's name can be in) still
// get their @font-face rule and load on first use.
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// The panel's markers, drawn in one ink.
//
// The tabs use emoji as markers: a category in the shop pickers, a stage in
// Fulfillment, a kind of task on the week's board. On a panel with no hue
// they were the only colour left on the page, and a row of them read louder
// than the status beside it. This is the outline cut of the same set, a font
// like any other, so each marker takes the colour and the weight of the text
// it sits in, in both themes and on the filled card.
//
// It is applied to markers only, by components/admin/Mark.tsx and the
// .adm-mark class, and is not in the panel's font stack: an emoji someone
// typed, or one in copy about to be sent, stays as written.
//
// preload: false. Most admin screens show no marker at all, and the file is
// cut into ranges, so a screen fetches only the slice its own markers are in.
const notoEmoji = Noto_Emoji({ subsets: ["emoji"], display: "swap", preload: false });

// The family names, handed to admin-theme.css as custom properties on :root.
//
// On :root rather than as next/font's `variable` class on a wrapper here,
// for the reason the theme attribute lives on <html>: the Modal, the Select
// menu and the phone's navigation sheet are portalled to <body>. Each carries
// .adm, but none sits inside anything this layout renders, so a variable set
// on a wrapper would reach the shell and miss every dialog.
//
// A string built at module scope from next/font's own output, never from a
// request.
const ADM_FONT_VARS =
  ":root{" +
  `--adm-font-sans:${plexSans.style.fontFamily};` +
  `--adm-font-mono:${plexMono.style.fontFamily};` +
  `--adm-font-emoji:${notoEmoji.style.fontFamily}` +
  "}";

// Owns three things for every page under /admin: the theme stylesheet, the
// fonts it is set in, and the attribute that picks which of its two palettes
// is live.
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
      {/* No nonce: lib/security/headers.ts allows inline styles outright
          (style-src 'unsafe-inline'), which every style attribute in the
          panel already depends on. */}
      <style>{ADM_FONT_VARS}</style>
      {/* suppressHydrationWarning for the reason app/layout.tsx gives beside
          its own pre-paint scripts: a browser hides the nonce attribute once
          it has parsed the tag, so React finds nonce="" where it rendered a
          value and reports a mismatch on every admin page in development. */}
      <script
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: ADM_THEME_PREPAINT }}
      />
      {children}
    </>
  );
}
