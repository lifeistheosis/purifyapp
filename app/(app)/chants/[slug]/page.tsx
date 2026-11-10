import { notFound } from "next/navigation";

import { ChantPage } from "@/components/chants/ChantPage";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ShareButton } from "@/components/ui/ShareButton";
import { chantTitleKey } from "@/lib/chants/names";
import { chantBySlug, chantIndex, firstSentence, forPage, indexRow, liveChants } from "@/lib/chants/registry.server";

type Params = Promise<{ slug: string }>;

// Every live chant has its page in the export; any other address is the
// usual not-found page.
export const dynamicParams = false;

export function generateStaticParams() {
  return liveChants().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const chant = chantBySlug(slug);
  if (!chant) return { title: "Chants" };
  return { title: chant.title, description: firstSentence(chant.about.what) };
}

// A chant's page carries that chant (its words, its history, its versions)
// and, for the row under its About, only the index rows of the chants it
// names.
//
// Its bar is a saint's page's own (1.8, sheet r3-18 B, the owner's pick of
// 2026-10-31): clear over the chant's icon, the way back and Share on round
// plates, solid with the chant's name once the name has gone up under it.
// The way back leads to Chants when there is nothing of the app behind the
// page. Share is in the bar from the first frame, alone: the button that
// arrived beside it late and moved it 43px (the owner's note 61) is gone.
export default async function ChantRoute({ params }: { params: Params }) {
  const { slug } = await params;
  const chant = chantBySlug(slug);
  if (!chant) notFound();
  const related = (chant.related ?? [])
    .map((s) => chantIndex().find((r) => r.slug === s))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  return (
    <>
      <MobileTopBar
        title={chant.title}
        titleKey={chantTitleKey(chant.key)}
        back
        backFallback="/chants"
        revealTitleOn="chant-name"
        overlay
        trailing={
          <ShareButton
            titleKey={chantTitleKey(chant.key)}
            round
            className="border-0 bg-transparent text-paper/80 hover:text-paper"
          />
        }
      />
      <ChantPage chant={forPage(chant)} row={indexRow(chant)} related={related} />
    </>
  );
}
