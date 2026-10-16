/**
 * Where a work of the Fathers opens (1.7). Today it is the work's own page
 * under its saint; the reading room of the owner's note 18 (a book page per
 * work, "a Netflix for books") will change it here, once, for every cover
 * that links to a work: a saint's Writings and the reading room's rows.
 */
export function workHref(saintSlug: string, workSlug: string): string {
  return `/saints/${saintSlug}/${workSlug}`;
}
