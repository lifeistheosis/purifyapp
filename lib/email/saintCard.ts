import { heritageNamedIn } from "@/lib/marketing/heritagePictures";
import { getSaint } from "@/lib/saints/saints";

import { siteUrl } from "./templates/build";

/**
 * The week's saint for the kit's card in the Sunday email: the epithet, and
 * the library's own picture of the saint, left out when it is on the heritage
 * list (lib/marketing/heritagePictures.ts), so the card stands on its words
 * (docs/brand/kit/email/README.md, "For the build", 5).
 */
export function saintCardOf(slug: string | null): { epithet: string | null; picture: string | null } {
  const saint = slug ? getSaint(slug) : null;
  if (!saint) return { epithet: null, picture: null };
  const icon = saint.iconUrl ?? null;
  const listed = icon ? Object.keys(heritageNamedIn(icon)).length > 0 : false;
  return { epithet: saint.epithet || null, picture: icon && !listed ? siteUrl(icon) : null };
}
