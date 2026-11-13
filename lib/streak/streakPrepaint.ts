// A kept day, known before the first paint (1.9, the fifteen screens).
//
// Today's rope is drawn from the first day kept, never as "0 days" (no zero
// as a first sight). Before the streak is read the row holds the rope's
// height, so the cards under it do not jump when it lands; for a reader with
// nothing kept that hold would stand and then close, a jump of its own. So
// this sets `data-kept` on <html> before anything paints when the device
// holds a kept day, and the hold (components/today/StreakRow.tsx) stands only
// under it.
//
// What counts is what lib/streak/useStreak.ts reads: a day in any
// `purify.prayers.<rule>.dates` list, the legacy `.streak` count those lists
// replaced (lib/prayers/storage.ts, readPrayedDates), or the server's last
// answer with a best above zero (`purify.streak.server`). No imports, so the
// string depends on nothing else's bundling order, as
// lib/platform/storePrepaint.ts; lib/streak/__tests__/streakPrepaint.test.ts
// runs it against a stored device.

export const STREAK_PREPAINT = [
  "(function(){try{",
  "var s=window.localStorage,k=false,i,n,v,a;",
  "for(i=0;i<s.length&&!k;i++){n=s.key(i)||'';",
  "if(/^purify\\.prayers\\..+\\.dates$/.test(n)){v=s.getItem(n);try{a=JSON.parse(v);k=Array.isArray(a)&&a.length>0;}catch(e){}}",
  "else if(/^purify\\.prayers\\..+\\.streak$/.test(n)){k=(parseInt(s.getItem(n)||'0',10)||0)>0;}",
  "else if(n==='purify.streak.server'){try{a=JSON.parse(s.getItem(n)||'null');k=!!a&&a.state==='ok'&&(a.best||0)>0;}catch(e){}}}",
  "if(k)document.documentElement.setAttribute('data-kept','');",
  "}catch(e){}})();",
].join("");
