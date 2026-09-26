// Where the desktop app opens.
//
// The app loads the site's front page, and on the web "/" is the marketing
// home: a hero, "Open Purify", "Download Purify". Inside the app every one of
// those is a button to where you already are. The owner opened the Windows
// build on 2026-09-25 and landed on it. The phone apps never see it because
// "/" renders the native Today shell there (app/page.tsx, NativeOnly).
//
// So inside the desktop app "/" goes to the web's own Today, the page the nav
// calls Today: the date, the saint, the fast, the readings and the verse.
//
// It runs as an inline script at the top of <body>, before anything paints,
// so the marketing page never flashes. The window is hidden while the new
// page loads, which the native window's own background covers (lib.rs sets
// it to --color-night). Detection is the same as lib/desktop/bridge.ts: the
// Tauri globals exist only inside the app, where Tauri injects them before
// any page script runs. In a browser or the phone apps this does nothing.
//
// A string rather than a module because it must run before React, and it is
// small on purpose. lib/desktop/__tests__/homeRedirect.test.ts runs it.

export const DESKTOP_HOME = "/prayers/today";

export const DESKTOP_HOME_PREPAINT = [
  "(function(){try{",
  "var w=window;",
  "if(location.pathname==='/'&&(w.__TAURI_INTERNALS__||w.__TAURI__)){",
  "document.documentElement.style.visibility='hidden';",
  `location.replace('${DESKTOP_HOME}'+location.search+location.hash);`,
  "}}catch(e){}})();",
].join("");
