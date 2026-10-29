// Open almost at once (1.6), and open on the horizon (1.8).
//
// HOW THE APPS OPENED. The phone shows its own logo screen (the Capacitor
// splash) until the app says to lift it. The app said so only when Today was
// drawn, in the reader's language: all of the app's code read and run first.
// On a slowed phone that was about 1.3 seconds of logo.
//
// WHAT 1.6 DID. The one document the apps load carries a cover that a browser
// can paint as soon as it has the document and its stylesheet, long before
// any of the app's code has run. The few lines below, written into the
// document after the cover, lift the phone's logo screen once the cover has
// been painted. The cover stays over the page until the app says it is ready,
// exactly as the logo screen did, and then fades over the screen that has
// arrived under it. In 1.6 and 1.7 the cover was an outline of Today.
//
// WHAT 1.8 DOES. The cover is Purify's own intro instead: the horizon from the
// ads and the cards rising under the cross, on the night ground
// (components/native/LaunchFrame.tsx). The owner asked for one after seeing a
// competitor's, picked this from three on 2026-10-27 ("B is so hard do B").
// It begins exactly where the phone's own logo screen ends, the same cross at
// the same size in the same place (LAUNCH_CROSS_PX, and the native logo
// screens drawn to match), so the hand-over cannot be seen. It plays while
// the app loads, which it has to do anyway.
//
// So the order is: logo, the horizon rising under it, the screen. The intro
// plays in full (INTRO_BUILD_MS) before it leaves, even when the app is ready
// sooner; when the app is slower, the finished horizon holds until it is.
// Its pace is the owner's: first built in 0.9 s, then, the next day, "Make it
// slower, because like I want the user to really take in the intro". Set to
// B of the three paces then shown to him: about 3 seconds to the screen.
//
// TWO PACES, BY THE READER'S DAY. Then, the same evening: "a slow intro on
// their first use of the day and then a fast one for the rest of the day".
// The first cold start of the reader's local day plays the slow pace
// (INTRO_BUILD_MS), and every later cold start that day plays the first pace
// again (INTRO_QUICK_BUILD_MS): built in 0.9 s, about 1.3 seconds to the
// screen. A first-ever open is the first of its day, so it is slow. Coming
// back to an app that was only in the background is no cold start: the
// document is still there, and the intro does not play at all.
//
// The lines below the cover cannot choose, because by then the cover may have
// been painted on the wrong pace. So a few lines written into the document
// just before it (INTRO_PACE_AT_FIRST_PAINT) read the day the intro last
// played slow, from one key in the device's storage, and mark the pace on
// <html> before the cover is in the page at all. The stylesheet times the
// cover by that mark, and the lines after it wait the build the mark asks
// for, so no frame is ever on the wrong pace.
//
// WHY NO WORDS. The apps are built in English and corrected on the device to
// the reader's language (lib/i18n/launchLanguage.ts). Anything written in the
// cover would be English on a Greek phone for as long as it is up, which is
// the flash 1.6 took out. The intro has no words.
//
// WHAT IT COSTS. While the cover is up the app does not answer a tap, because
// the app is not there yet. That was true behind the logo as well. On a fast
// phone the intro also adds the part of its 3 seconds (1.3 after the first
// open of the day) the app did not need.
// To take it out, set OPEN_AT_FIRST_PAINT to false: the cover and its script
// are then not written into the document at all, and the apps open as they
// did before 1.6.
//
// Nothing here runs on the website. The cover is written only into the apps'
// export (app/page.tsx), which is opened by the two shells and by nothing
// else.
//
// Held by lib/platform/__tests__/launchFrame.test.ts, and seen in a browser by
// scripts/export-walk.mjs. What neither can see is the phone's own logo
// screen going: that needs a real phone.

export const OPEN_AT_FIRST_PAINT = true;

/** Never leave the cover up longer than this, whatever the app does. */
export const LAUNCH_FRAME_MAX_MS = 8000;

/**
 * The logo screen is asked to go after two frames, or after this long,
 * whichever comes first.
 *
 * Two frames is the usual case and means the cover has been painted. The
 * time is for a web view that holds its frames back while the phone's own
 * logo screen is up: there the frames would wait for the logo to go while the
 * logo waited for the frames. It is not known that any phone does this, and
 * it cannot be found out on a computer. It costs one timer to be sure it
 * cannot stall an open. The app's own lift carries the same net
 * (components/native/NativeBridge.tsx).
 *
 * Safe without a frame: the script below is written after the cover, and a
 * script in the page does not run until the stylesheet above it has loaded,
 * so by then the cover is in the document and styled.
 */
export const LIFT_ANYWAY_MS = 150;

/**
 * How long the intro takes to build on the first cold start of the reader's
 * day, counted from the moment the logo screen is asked to go.
 * app/globals.css finishes every part of it inside this (the test holds the
 * two together), and the cover does not leave before it, so a fast phone
 * still sees the horizon arrive. The parts are done by 1800 ms; the rest is
 * the finished horizon held still, to be taken in. It then leaves in 600 ms:
 * about 3 seconds from the first paint to Today.
 */
export const INTRO_BUILD_MS = 2400;

/**
 * The same, on every later cold start that day: the intro's first pace, as
 * the owner first saw it. Every part is done by 900 ms, nothing is held, and
 * the cover leaves in 360 ms: about 1.3 seconds from the first paint to Today.
 */
export const INTRO_QUICK_BUILD_MS = 900;

/**
 * The one key the pace is read from: the reader's local date, as YYYY-MM-DD,
 * on which the intro last played slow. Device storage and no more, outside
 * the `purify:` keys a reader's export carries, so a backup taken to another
 * phone does not make that phone's first open of the day quick.
 */
export const INTRO_DAY_KEY = "purify.intro.day";

/**
 * The cross on the cover, in CSS pixels tall: the size the phone's own logo
 * screen draws it at. The native screens are made to this
 * (ios/App/App/Assets.xcassets/Splash.imageset, drawn at its own size in the
 * middle of LaunchScreen.storyboard, and splash_cross.png in the Android
 * drawable folders, a 288 dp square as Android's splash icon is), so the
 * cross does not move or change size when the logo screen goes.
 */
export const LAUNCH_CROSS_PX = 80;

/**
 * Runs inside the document just before the cover, so the cover is never in
 * the page without its pace. No imports, like the pre-paint strings beside it
 * (./storePrepaint.ts).
 *
 * It reads INTRO_DAY_KEY. When that is the reader's local date today, this
 * cold start is not the day's first, and it marks `data-intro-pace="quick"`
 * on <html>. Otherwise it writes today's date there and marks "slow": a
 * first-ever open, the first of a new day, and any phone whose storage cannot
 * be read or written, so the intro is never quick by mistake.
 *
 * Kept free of anything an old web view would not read, as below.
 */
export const INTRO_PACE_AT_FIRST_PAINT = [
  "(function(){",
  "var d=document.documentElement,pace='slow';",
  "try{",
  "var t=new Date(),m=t.getMonth()+1,n=t.getDate();",
  "var day=t.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(n<10?'0':'')+n;",
  "var s=window.localStorage;",
  `if(s.getItem('${INTRO_DAY_KEY}')===day)pace='quick';`,
  `else s.setItem('${INTRO_DAY_KEY}',day);`,
  "}catch(e){}",
  "d.setAttribute('data-intro-pace',pace);",
  "})();",
].join("");

/**
 * Runs inside the document, before any of the app's code is loaded. No
 * imports, like the pre-paint strings beside it (./storePrepaint.ts).
 *
 * It waits two frames, so the cover has been painted (or LIFT_ANYWAY_MS,
 * see above), then marks the page (`data-launch="frame"` on <html>, unless
 * the app has already said "ready") and asks the phone to lift its logo
 * screen, once. `Capacitor.nativePromise` is put on the page by the shell
 * itself before any script of ours, on Android and on the iPhone alike, so
 * this needs none of the app's code. In a plain browser there is no such
 * thing and the call is skipped.
 *
 * A whole build after that, on the pace the lines above marked
 * (INTRO_QUICK_BUILD_MS when "quick", INTRO_BUILD_MS otherwise), it marks the
 * intro played (`data-intro="played"`). The cover leaves once the page
 * carries both: the app ready, and the intro played (app/globals.css).
 *
 * The app still lifts the logo screen itself when it is ready
 * (components/native/NativeBridge.tsx), and marks the intro played a moment
 * later in case these lines never ran. Asking twice is harmless, and it means
 * a phone where this early call does nothing opens as it always did.
 *
 * Kept free of anything an old web view would not read: no arrow functions,
 * no optional chaining, no let or const.
 */
export const LIFT_AT_FIRST_PAINT = [
  "(function(){",
  "var w=window,d=document.documentElement,done=0;",
  "function soon(f){if(w.requestAnimationFrame)w.requestAnimationFrame(f);else setTimeout(f,16);}",
  "function played(){d.setAttribute('data-intro','played');}",
  "function lift(){",
  "if(done)return;done=1;",
  `setTimeout(played,d.getAttribute('data-intro-pace')==='quick'?${INTRO_QUICK_BUILD_MS}:${INTRO_BUILD_MS});`,
  "if(d.getAttribute('data-launch')!=='ready')d.setAttribute('data-launch','frame');",
  "try{var c=w.Capacitor;if(c&&c.nativePromise){",
  "var p=c.nativePromise('SplashScreen','hide',{fadeOutDuration:200});",
  "if(p&&p['catch'])p['catch'](function(){});",
  "}}catch(e){}",
  "}",
  "soon(function(){soon(lift);});",
  `setTimeout(lift,${LIFT_ANYWAY_MS});`,
  `setTimeout(function(){d.setAttribute('data-launch','ready');played();},${LAUNCH_FRAME_MAX_MS});`,
  "})();",
].join("");
