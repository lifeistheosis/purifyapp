import { notFound } from "next/navigation";

import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { PathView } from "@/components/reading/PathView";
import { pathPage } from "@/lib/reading/pathView";
import { PATH_IDS } from "@/lib/reading/paths";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return PATH_IDS.map((id) => ({ id }));
}

export const metadata = {
  title: "A reading path",
  description: "A short guided reading through the Fathers' own words, a day at a time.",
};

/** A reading path (1.8): its days, built from the registries once; every word around them is looked up on the device. */
export default async function PathPage({ params }: { params: Params }) {
  const { id } = await params;
  const path = pathPage(id);
  if (!path) notFound();
  return (
    <>
      <MobileTopBar titleKey={`paths.${id}.name`} back backFallback="/reading/paths" revealTitleOn="path-title" />
      <PathView path={path} />
    </>
  );
}
