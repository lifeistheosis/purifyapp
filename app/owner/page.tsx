import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Kept as a redirect, not deleted.
 *
 * The strategic view folded into the admin shell in v4, where it is three
 * tabs behind an Operations | Owner switch. This route stays so that
 * bookmarks, the old rail link and anything else pointing here still land
 * somewhere correct.
 *
 * TWO THINGS ABOUT THIS FILE.
 *
 * It must stay in STASH_PATHS in scripts/native-build.mjs. That list is what
 * keeps app/owner out of the static export, and a force-dynamic route that
 * redirects is exactly the case the script's own comment warns about: under
 * output:'export' the redirect gets baked into the bundle rather than
 * failing loudly.
 *
 * And the fragment survives only because AdminShell holds its hash WRITER
 * back until its hash READER has run. Fragments are never sent to the
 * server, so this Location header is the only thing carrying #tab, and an
 * eager writer on the other end would overwrite it on first commit.
 */
export default async function OwnerPage() {
  redirect("/admin#tab=owner-today");
}
