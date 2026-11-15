// The door to Pray together, known shut before the first paint (Updates 78,
// 2026-11-15).
//
// Community keeps the switch's place empty while the app asks the server
// whether campaigns are open for this reader (lib/community/halves.ts,
// prayDoor), so that a yes moves nothing. But a page's HTML is drawn before
// the app runs, and it holds that place for every reader. For a reader the
// answer was no for, the place closed under the page as the answer came: on a
// direct open of /community/ the sign-in line and every post moved up 77px in
// five drawn steps (Updates 77). A no kept from last time did not stop it on a
// direct open either: the HTML held the place until the app woke and took it
// away.
//
// So, before anything paints, this marks <html> with data-pray-door="none"
// where the device already knows the answer is no. Under that mark the place
// is not drawn (app/globals.css, "The door to Pray together"), and Community
// reads the same mark (lib/campaigns/useCampaignsOpen.ts,
// useCampaignsAnswerForSwitch). The device knows it in two cases:
//
//   1. The server told this device no last time (the kept answer).
//   2. On the website, which is the server's own build, while the server opens
//      campaigns to its admins alone ("testers" on the main web: ./opening.ts,
//      serverOpening), for a reader with no account on this device. The
//      server writes its position into the script (signedOutShut). The test
//      web lifts "testers" to "open", so it writes false.
//
// Never the second in the apps: a store build cut at "testers" asks a website
// that may already be open to every reader (./flags.ts, release day, step 4),
// so the apps know only what the server told them last time. A yes is never
// read here: a door is drawn only on the server's live yes.
//
// No imports but a constant, so the string depends on nothing else's bundling
// order (lib/streak/streakPrepaint.ts). lib/campaigns/__tests__/doorPrepaint.test.ts
// runs it against a stored device.

import { NATIVE_UA_TOKEN } from "@/lib/platform/token";

/** The mark on <html>, and the door it stands for (lib/community/halves.ts, "none"). */
export const DOOR_MARK = "data-pray-door";
export const DOOR_MARKED_NONE = "none";

/** Where the server's last answer is kept on the device (./useCampaignsOpen.ts). */
export const KEPT_ANSWER_KEY = "purify:campaigns:lastAnswer";

/**
 * The pre-paint script. `signedOutShut`: the website's own server opens
 * campaigns to its admins alone, so a reader with no account is told no.
 */
export function doorPrepaint(signedOutShut: boolean): string {
  return [
    "(function(){try{",
    "var d=document.documentElement,s=window.localStorage,k=null,c,i,n,a;",
    `try{k=s.getItem(${JSON.stringify(KEPT_ANSWER_KEY)});}catch(e){}`,
    "var shut=k==='no';",
    signedOutShut
      ? [
          "if(!shut){",
          `c=window.Capacitor;a=navigator.userAgent.indexOf(${JSON.stringify(NATIVE_UA_TOKEN)})>-1||!!(c&&c.isNativePlatform&&c.isNativePlatform());`,
          "if(!a){",
          "var signed=/(?:^|;\\s*)sb-[^=;]+-auth-token(?:\\.\\d+)?=/.test(document.cookie||'');",
          "for(i=0;!signed&&i<s.length;i++){n=s.key(i)||'';signed=/^sb-.+-auth-token(?:\\.\\d+)?$/.test(n);}",
          "shut=!signed;}}",
        ].join("")
      : "",
    `if(shut)d.setAttribute(${JSON.stringify(DOOR_MARK)},${JSON.stringify(DOOR_MARKED_NONE)});`,
    "}catch(e){}})();",
  ].join("");
}
