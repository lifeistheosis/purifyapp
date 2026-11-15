// The reader's language on <html>, before the first paint (Updates 82, 1.9).
//
// The apps are built in English, so the export's <html> says lang="en"
// dir="ltr", and the reader's own language is put right after the app comes
// alive (components/i18n/LocaleBootstrap.tsx). Until then nothing but the
// launch slate is on the screen, and the slate's stars are placed from the
// line's start, so the sky turns with the page in Arabic
// (components/native/LaunchFrame.tsx). With dir written only once the words
// came, the sky turned under the visible slate: on the export, in every Arabic
// open, the stars jumped in one frame, one of them 247.8px
// (docs/handoffs/updates-81.md, step 3a).
//
// So the direction is decided here, before anything is drawn, the way
// LocaleBootstrap decides it: the language this device last applied (kept in
// localStorage by components/i18n/MessagesProvider.tsx, since the reader's
// choice itself is kept where only an asynchronous call can read it), and
// failing that the first of the device's own languages the app can be
// switched to. Nothing is changed when neither names one: the app opens as it
// was built, in English. The apps only: the website's server writes the
// reader's language into the page itself (app/layout.tsx).

import { DEVICE_SPELLINGS, LOCALES, isLocaleSelectable } from "./locales";

/** Where the apps keep the language they last applied, for the script below. */
export const APPLIED_LANGUAGE_KEY = "purify:language";

/** Every language the app can be switched to, and its direction. */
const DIRECTIONS: Record<string, "ltr" | "rtl"> = Object.fromEntries(
  LOCALES.filter((l) => isLocaleSelectable(l.code)).map((l) => [l.code, l.dir]),
);

export const LANGUAGE_PREPAINT = `(function(){try{var d=${JSON.stringify(DIRECTIONS)},s=${JSON.stringify(DEVICE_SPELLINGS)},c=null;try{c=localStorage.getItem(${JSON.stringify(APPLIED_LANGUAGE_KEY)})}catch(e){}if(!c||!d.hasOwnProperty(c)){c=null;var l=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language];for(var i=0;i<l.length&&!c;i++){var p=String(l[i]||"").trim().toLowerCase().split(/[-_]/)[0];p=s.hasOwnProperty(p)?s[p]:p;if(p&&d.hasOwnProperty(p))c=p}}if(c){var h=document.documentElement;h.lang=c;h.dir=d[c]}}catch(e){}})();`;
