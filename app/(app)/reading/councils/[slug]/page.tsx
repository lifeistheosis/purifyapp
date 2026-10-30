import { notFound } from "next/navigation";

import { CouncilShelf } from "@/components/councils/CouncilShelf";
import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { councilBooks, otherCouncilBooks, shelfCouncil, shelfFor } from "@/lib/councils/books";
import { COUNCILS } from "@/lib/councils/councils";
import { councilFocus } from "@/lib/councils/page";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return COUNCILS.filter((c) => c.documents.length > 0).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const c = shelfFor(slug);
  if (!c) return { title: "Reading" };
  return {
    title: `${c.byname}, in the reading room`,
    description: `The documents of the ${c.byname} as books in Purify's reading room: ${c.documents.map((d) => d.title).join(", ")}.`,
  };
}

/**
 * A council's shelf in the reading room (1.8, the owner's pick of r3-03):
 * where "Read the Council's documents" leads from the council's page. The
 * bar names the room, as the design draws it, and the page names the
 * council with its own heading (components/councils/CouncilShelf.tsx). The
 * server reads each book's length and picture once, at build time in the
 * apps; every word around them is looked up on the device.
 */
export default async function CouncilShelfPage({ params }: { params: Params }) {
  const { slug } = await params;
  const c = shelfFor(slug);
  if (!c) notFound();
  return (
    <>
      <MobileTopBar
        back
        backFallback={`/councils/${c.slug}`}
        center={
          <span className="truncate font-sans text-ui font-semibold leading-tight text-paper">
            <T k="nav.reading" />
          </span>
        }
      />
      <CouncilShelf
        council={shelfCouncil(c, IS_STATIC_EXPORT, councilFocus(c.slug))}
        books={councilBooks(c, IS_STATIC_EXPORT)}
        others={otherCouncilBooks(c.slug, IS_STATIC_EXPORT)}
      />
    </>
  );
}
