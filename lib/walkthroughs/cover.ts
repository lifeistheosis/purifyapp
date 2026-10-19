import { SITE_URL } from "@/lib/site";

/**
 * The address of a walk's cover (1.7), decided by the build: the website's own
 * file on the website, the website's address in the apps (`native` is
 * IS_STATIC_EXPORT, which only a server file can read). The covers live in
 * /covers/, which the website keeps and the apps fetch (lib/media/streamed.ts),
 * so deciding it at build time writes the same address into the page and its
 * payload, and nothing changes between the first paint and hydration.
 *
 * It is the address lib/media/streamed.ts gives every streamed file, written
 * out here because that module asks the device (it reaches a client module)
 * and this one is read on the server, as lib/saints/heroes.ts does for a
 * saint's picture. lib/walkthroughs/__tests__/screens.test.ts holds the two
 * together. With no signal the picture cannot load, and the cover is its plate
 * with the walk's title (components/covers/WorkCover.tsx).
 */
export function walkCoverSrc(file: string | null, native: boolean): string | null {
  if (!file) return null;
  return native ? `${SITE_URL}${file}` : file;
}
