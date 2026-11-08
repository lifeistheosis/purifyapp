// A journal page's cover (1.9, Plus, docs/1.9-build/JOURNAL.md: "a cover...
// from Purify's own artwork whose source is verified"; his voice note, "where
// you can add an image as the banner"). Only the icons whose rights are
// settled as verified (lib/saints/iconRights.ts: opened and looked at, public
// domain or CC0, with their source) are offered: never one used with an
// iconographer's permission, which was given for the app's own pages, and
// never a picture with no recorded source. They ship inside the apps
// (public/saints/icons), so a cover shows with no signal.
//
// Pure: lib/journal/__tests__/covers.test.ts holds the list to the registry.

import { ICON_RIGHTS, ICONS_URL_PREFIX } from "@/lib/saints/iconRights";

export type Cover = {
  /** The file's name, which is what a page keeps. */
  id: string;
  src: string;
  /** What the picture shows, from the registry, checked against the image. */
  alt: string;
  /** Under the cover: its licence and where it is from. */
  credit: string;
};

export const COVERS: readonly Cover[] = Object.entries(ICON_RIGHTS)
  .filter(([, r]) => r.status === "verified")
  .map(([file, r]) => ({ id: file, src: `${ICONS_URL_PREFIX}${file}`, alt: r.alt, credit: `${r.license} · ${r.source}` }));

const BY_ID = new Map(COVERS.map((c) => [c.id, c]));

/** A cover by the name a page keeps, or null for one this build does not offer. */
export function coverById(id: string | undefined | null): Cover | null {
  return (id && BY_ID.get(id)) || null;
}
