// Master flag for the EIKON Box, mirroring lib/community/flags.ts.
//
// Unset = the member surfaces show an "opening soon" state, the settings
// rows stay hidden, and every member API route 404s, so nothing renders or
// writes before 20260731_eikon_box.sql exists.
//
// The ADMIN routes and the Drops tab are deliberately NOT gated on this, so
// the owner can build and inspect a real drop while the member side is
// still dark.
//
// NEXT_PUBLIC_* is inlined at build time: flipping this needs a web
// redeploy, and for Android a repo secret plus an entry in the env block of
// .github/workflows/android-apk.yml.

export function eikonBoxEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_EIKON_BOX_ENABLED;
  return v === "1" || v === "true";
}
