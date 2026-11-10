import { notFound } from "next/navigation";

import { StarterPage } from "@/components/florilegium/StarterPage";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { STARTERS, starterById } from "@/lib/florilegium/starters";

type Params = Promise<{ starter: string }>;

/** The four starters, known to every build, so each has its page in the apps too. */
export function generateStaticParams() {
  return STARTERS.map((s) => ({ starter: s.id }));
}

export const dynamicParams = false;

export const metadata = {
  title: "Florilegium",
  description: "A whole passage of Scripture to begin a gathering with, a verse a line.",
};

/*
 * A starter's own page (1.9, build 89 note 6, "where it leads to"): the
 * passage set to read, and one action, Keep (components/florilegium/
 * StarterPage.tsx). The page hands over the starter's id alone: its words
 * are read on the device from the app's own list, never written into the
 * page twice as a prop (AGENTS.md, "A page carries what it shows").
 */
export default async function StarterRoute({ params }: { params: Params }) {
  const { starter } = await params;
  const s = starterById(starter);
  if (!s) notFound();
  return (
    <>
      <MobileTopBar titleKey={s.nameKey} back backFallback="/florilegium" revealTitleOn="florilegium-title" />
      <StarterPage id={s.id} />
    </>
  );
}
