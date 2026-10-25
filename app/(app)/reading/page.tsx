import { ReadingRoom, type LibraryLink } from "@/components/reading/ReadingRoom";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { buildRoom } from "@/lib/reading/cards";
import { collections } from "@/lib/reading/surfaces";

export const metadata = {
  title: "Reading",
  description:
    "The reading room: the Fathers' works as books, browsed by theme and by tradition, with a search across the library.",
};

export const revalidate = 3600;

/**
 * The reading room (1.7, the owner's note 18), one screen at every width.
 * The server builds the room's cards once (lib/reading/cards.ts: the works,
 * their lengths, their covers, the addresses the apps load the pictures from)
 * and the room draws them; no word here is looked up on the server, so the
 * apps' export, written once in English, follows the reader's language
 * (lib/i18n/__tests__/serverWords.test.ts).
 */
export default function ReadingPage() {
  const library: LibraryLink[] = [
    { href: "/saints", labelKey: "reading.surface.patristic", blurbKey: "reading.surface.patristicBlurb" },
    { href: "/councils", labelKey: "reading.surface.councils", blurbKey: "reading.surface.councilsBlurb" },
    { href: "/topics", labelKey: "reading.surface.topics", blurbKey: "reading.surface.topicsBlurb" },
    // 1.8: short guided runs through the library, a day at a time (lib/reading/paths.ts).
    { href: "/reading/paths", labelKey: "paths.title", blurbKey: "paths.blurb" },
  ];
  if (collections().length > 0) {
    library.push({
      href: "/saints/gregory-palamas/essence-and-energies",
      labelKey: "reading.surface.collections",
      blurbKey: "reading.surface.collectionsBlurb",
    });
  }
  return <ReadingRoom room={buildRoom(IS_STATIC_EXPORT)} library={library} />;
}
