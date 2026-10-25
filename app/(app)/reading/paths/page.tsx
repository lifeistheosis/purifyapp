import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { PathList } from "@/components/reading/PathView";
import { pathPage } from "@/lib/reading/pathView";
import { PATH_IDS } from "@/lib/reading/paths";

export const metadata = {
  title: "Reading paths",
  description: "Short guided readings through the Fathers' own words in Purify's library, a day at a time.",
};

/** The reading paths (1.8): each a door to its days. */
export default function PathsPage() {
  const paths = PATH_IDS.map((id) => {
    const p = pathPage(id)!;
    return { id, days: p.days.length, minutes: p.days.reduce((n, d) => n + d.minutes, 0) };
  });
  return (
    <>
      <MobileTopBar titleKey="paths.title" back backFallback="/reading" revealTitleOn="paths-title" />
      <PathList paths={paths} />
    </>
  );
}
