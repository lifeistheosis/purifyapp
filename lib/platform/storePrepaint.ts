// The visitor's store, decided before the first paint.
//
// The phone front page asks for one store: Google Play on Android, the App
// Store on an iPhone or iPad. The page is cached and served the same to every
// visitor, so the server cannot choose; left to React, the page would paint
// both buttons and then rearrange itself once hydrated, which on a slow phone
// is a visible jump in the middle of the first screen. So this sets
// `data-store` on <html> before anything paints, and app/globals.css shows
// the matching ask ([data-store-pick]) from the first frame.
//
// This is ./mobileWeb.ts storeForDevice restated as a string that runs at the
// top of <body>, the same way lib/ui/motionPrepaint.ts sets data-motion. No
// imports, so the string depends on nothing else's bundling order; the user
// agent token is written out here and held to its source, and the script to
// storeForDevice across every user agent, by
// lib/platform/__tests__/storePrepaint.test.ts. The store apps (the token, or
// Capacitor) get no attribute: they are the app already.

export const STORE_PREPAINT = [
  "(function(){try{",
  "var w=window,n=navigator,u=n.userAgent||'',t=n.maxTouchPoints||0,cap=w.Capacitor,s=null;",
  "if(u.indexOf('PurifyNative')>-1||(cap&&cap.isNativePlatform&&cap.isNativePlatform()))return;",
  "if(/Android/i.test(u))s='googlePlay';",
  "else if(/iPhone|iPad|iPod/.test(u)||(/Macintosh/.test(u)&&t>1))s='appStore';",
  "if(s)document.documentElement.setAttribute('data-store',s);",
  "}catch(e){}})();",
].join("");
