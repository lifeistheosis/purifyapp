import type { Metadata } from "next";

/** A picture for a link's preview: its address on the website, and its size and what it shows where those are known. */
export type PreviewPicture = { url: string; width?: number; height?: number; alt?: string };

/**
 * Purify's own card (app/opengraph-image.png, its words in
 * app/opengraph-image.alt.txt), for a page with no picture of its own: a page
 * that names its own preview no longer inherits it. Held to the file by
 * lib/reading/__tests__/shareWork.test.ts.
 */
export const PURIFY_CARD: PreviewPicture = { url: "/opengraph-image.png", width: 1774, height: 887, alt: "Purify, Apostolic, Orthodox, Knowledge" };

/**
 * How a page shows where its link is pasted (1.9, build 95 note 15): a
 * message, a post, a search result. The website's root head names Purify
 * itself (app/layout.tsx), and a page that names nothing of its own is
 * previewed as Purify's home: until this, a work shared from its sheets
 * unfolded as "Purify, Orthodox prayer, calendar, and Scripture" with the
 * home page's address, on every work of the Fathers and every council's
 * document (purifyapp.net, read 2026-11-13).
 *
 * So the page names itself: its title and what it is, its own address (the
 * preview's and the search engine's), and its own picture, as an event of
 * Orthodox History does (app/(app)/history/[slug]/page.tsx). A picture
 * taller than it is wide (a saint's icon, four by five) is shown whole as the
 * small square beside the words: the large card cuts a wide band from its
 * middle, which is where an icon's face is not. A wide one gets the large
 * card. With no picture of its own the page shows Purify's card.
 *
 * The website's alone: an app's page carries its title and nothing else
 * (app/layout.tsx, APP_METADATA), so callers leave this out of the export.
 */
export function linkPreview({
  title,
  description,
  path,
  picture,
}: {
  title: string;
  description?: string;
  /** The page's own address on the website, from its root: "/saints/john-chrysostom/paschal-homily". */
  path: string;
  picture?: PreviewPicture | null;
}): Pick<Metadata, "alternates" | "openGraph" | "twitter"> {
  const shown = picture ?? PURIFY_CARD;
  const wide = Boolean(shown.width && shown.height && shown.width / shown.height >= 1.5);
  return {
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      siteName: "Purify",
      locale: "en_US",
      title,
      ...(description ? { description } : {}),
      url: path,
      images: [shown],
    },
    twitter: {
      card: wide ? "summary_large_image" : "summary",
      title,
      ...(description ? { description } : {}),
    },
  };
}
