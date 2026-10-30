import { saintPicture, type SaintPicture } from "@/lib/today/saintFaces";

/**
 * A Father's picture on Theology's pages (1.8, round 3 r3-04): the medallions
 * and cards of a doctrine's Fathers, and the faces on the hub's shelf. The
 * picture Today's saint wears (lib/today/saintFaces.ts): his cover portrait,
 * every one opened and its rights recorded, asked of the website in the apps,
 * with the icon the app carries for when it cannot be had. Null for a text
 * no saint the app has wrote: the Liturgy, a council, an author with no page.
 */
export function fatherPicture(father: { saintSlug?: string; iconUrl?: string } | undefined, native: boolean): SaintPicture | null {
  return father?.saintSlug ? saintPicture({ slug: father.saintSlug, iconUrl: father.iconUrl }, native) : null;
}
