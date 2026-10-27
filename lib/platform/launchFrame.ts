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
//
// WHY NO WORDS. The apps are built in English and corrected on the device to
// the reader's language (lib/i18n/launchLanguage.ts). Anything written in the
// cover would be English on a Greek phone for as long as it is up, which is
// the flash 1.6 took out. The intro has no words.
//
// WHAT IT COSTS. While the cover is up the app does not answer a tap, because
// the app is not there yet. That was true behind the logo as well. On a fast
// phone the intro also adds the part of its 1.3 seconds the app did not need.
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
 * How long the intro takes to build, counted from the moment the logo screen
 * is asked to go. app/globals.css finishes every part of it inside this
 * (the test holds the two together), and the cover does not leave before it,
 * so a fast phone still sees the horizon arrive. It then leaves in 360 ms:
 * about 1.3 seconds from the first paint to Today.
 */
export const INTRO_BUILD_MS = 900;

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
 * INTRO_BUILD_MS after that it marks the intro played (`data-intro="played"`).
 * The cover leaves once the page carries both: the app ready, and the intro
 * played (app/globals.css).
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
  `setTimeout(played,${INTRO_BUILD_MS});`,
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
