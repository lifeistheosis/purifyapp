// Motion, decided before the first paint.
//
// app/globals.css keys every reduced-motion escape to `data-motion` on
// <html> (see lib/ui/motion.ts), so the attribute has to be right before
// anything animates: a phone set to reduce motion must not see the app flash
// still and then start moving, and a browser that asked for calm must not
// see one entrance play before it stops.
//
// This is ./motionPreference.ts resolveReducedMotion and ./deviceSpeed.ts
// slowFrom, restated as a string that runs at the top of <body>, the same
// way lib/reader/prepaint.ts sets the palette. No imports, so the string
// depends on nothing else's bundling order; the storage keys and the phone
// app's user-agent token are written out here and held to their sources by
// lib/ui/__tests__/motionPrepaint.test.ts, which also runs the script against
// the resolver across every input. components/ui/MotionRoot.tsx keeps the
// attribute current after this, as settings, pages and the device verdict
// change.

// The dev-only "simulate the phone shell" switch that lib/platform/native.ts
// honours, so a browser at phone width previews the phone's motion too.
const DEV_NATIVE = process.env.NODE_ENV === "development" ? "||get('purify:force-native')==='1'" : "";

export const MOTION_PREPAINT = [
  "(function(){try{",
  "var w=window,n=navigator,ls=null;",
  "try{ls=w.localStorage;}catch(e){}",
  "function get(k){try{return ls?ls.getItem(k):null;}catch(e){return null;}}",
  "var pref=get('purify.motion');",
  "var p=location.pathname;",
  "var admin=p==='/admin'||p.indexOf('/admin/')===0;",
  "var cap=w.Capacitor;",
  "var nat=(n.userAgent||'').indexOf('PurifyNative')>-1||!!(cap&&cap.isNativePlatform&&cap.isNativePlatform())",
  DEV_NATIVE,
  ";",
  "var r;",
  "if(pref==='off')r=true;",
  "else if(pref==='on')r=false;",
  "else if(admin)r=false;",
  "else if(nat){var v=get('purify.motion.device');",
  "r=v==='slow'||(v!=='ok'&&((n.deviceMemory>0&&n.deviceMemory<=2)||(n.hardwareConcurrency>0&&n.hardwareConcurrency<=2)));}",
  "else r=!!(w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches);",
  "document.documentElement.setAttribute('data-motion',r?'reduce':'full');",
  "}catch(e){}})();",
].join("");
