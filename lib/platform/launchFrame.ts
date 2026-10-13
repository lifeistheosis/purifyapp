// Open almost at once (1.6).
//
// HOW THE APPS OPENED. The phone shows its own logo screen (the Capacitor
// splash) until the app says to lift it. The app said so only when Today was
// drawn, in the reader's language: all of the app's code read and run first.
// On a slowed phone that was about 1.3 seconds of logo.
//
// WHAT THIS DOES. The one document the apps load now carries an outline: the
// shape of a screen, in the page's own colours, with no words in it
// (components/native/LaunchFrame.tsx). A browser can paint that as soon as it
// has the document and its stylesheet, long before any of the app's code has
// run. The few lines below, written into the document after the outline, lift
// the phone's logo screen once the outline has been painted. The outline
// stays over the page until the app says it is ready, exactly as the logo
// screen did, and then fades over the screen that has arrived under it.
//
// So the order is: logo, outline (almost at once), the screen. What was a
// second of logo is a moment of logo and then the app's own shape.
//
// WHY NO WORDS. The apps are built in English and corrected on the device to
// the reader's language (lib/i18n/launchLanguage.ts). Anything written in the
// outline would be English on a Greek phone for as long as it is up, which is
// the flash 1.6 took out. An outline has no language.
//
// WHAT IT COSTS. While the outline is up the app does not answer a tap,
// because the app is not there yet. That was true behind the logo as well,
// but a logo does not look like something to tap. Whether that moment feels
// like a faster app or a dead one cannot be judged on a computer. The owner
// said yes to trying it in the test build (2026-10-12) and decides on a real
// phone. To take it out, set OPEN_AT_FIRST_PAINT to false: the outline and
// its script are then not written into the document at all, and the apps
// open as they did.
//
// Nothing here runs on the website. The outline is written only into the
// apps' export (app/page.tsx), which is opened by the two shells and by
// nothing else.
//
// Held by lib/platform/__tests__/launchFrame.test.ts, and seen in a browser by
// scripts/export-walk.mjs. What neither can see is the phone's own logo
// screen going: that needs a real phone.

export const OPEN_AT_FIRST_PAINT = true;

/** Never leave the outline up longer than this, whatever the app does. */
export const LAUNCH_FRAME_MAX_MS = 8000;

/**
 * The logo screen is asked to go after two frames, or after this long,
 * whichever comes first.
 *
 * Two frames is the usual case and means the outline has been painted. The
 * time is for a web view that holds its frames back while the phone's own
 * logo screen is up: there the frames would wait for the logo to go while the
 * logo waited for the frames. It is not known that any phone does this, and
 * it cannot be found out on a computer. It costs one timer to be sure it
 * cannot stall an open. The app's own lift carries the same net
 * (components/native/NativeBridge.tsx).
 *
 * Safe without a frame: the script below is written after the outline, and a
 * script in the page does not run until the stylesheet above it has loaded,
 * so by then the outline is in the document and styled.
 */
export const LIFT_ANYWAY_MS = 150;

/**
 * Runs inside the document, before any of the app's code is loaded. No
 * imports, like the pre-paint strings beside it (./storePrepaint.ts).
 *
 * It waits two frames, so the outline has been painted (or LIFT_ANYWAY_MS,
 * see above), then marks the page (`data-launch="frame"` on <html>, unless
 * the app has already said "ready") and asks the phone to lift its logo
 * screen, once. `Capacitor.nativePromise` is put on the page by the shell
 * itself before any script of ours, on Android and on the iPhone alike, so
 * this needs none of the app's code. In a plain browser there is no such
 * thing and the call is skipped.
 *
 * The app still lifts the logo screen itself when it is ready
 * (components/native/NativeBridge.tsx). Asking twice is harmless, and it means
 * a phone where this early call does nothing opens as it always did.
 *
 * Kept free of anything an old web view would not read: no arrow functions,
 * no optional chaining, no let or const.
 */
export const LIFT_AT_FIRST_PAINT = [
  "(function(){",
  "var w=window,d=document.documentElement,done=0;",
  "function soon(f){if(w.requestAnimationFrame)w.requestAnimationFrame(f);else setTimeout(f,16);}",
  "function lift(){",
  "if(done)return;done=1;",
  "if(d.getAttribute('data-launch')!=='ready')d.setAttribute('data-launch','frame');",
  "try{var c=w.Capacitor;if(c&&c.nativePromise){",
  "var p=c.nativePromise('SplashScreen','hide',{fadeOutDuration:200});",
  "if(p&&p['catch'])p['catch'](function(){});",
  "}}catch(e){}",
  "}",
  "soon(function(){soon(lift);});",
  `setTimeout(lift,${LIFT_ANYWAY_MS});`,
  `setTimeout(function(){d.setAttribute('data-launch','ready');},${LAUNCH_FRAME_MAX_MS});`,
  "})();",
].join("");
