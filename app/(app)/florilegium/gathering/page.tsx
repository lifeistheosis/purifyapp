import { Suspense } from "react";

import { FlorilegiumByQuery } from "@/components/florilegium/FlorilegiumByQuery";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

export const metadata = {
  title: "Florilegium",
};

/*
 * A gathering, in the apps (1.9): the page the bundle carries for every
 * gathering, which one named in the query (lib/florilegium/href.ts). The
 * website's own page for a gathering is florilegium/[id], which the apps'
 * build leaves out (scripts/native-build.mjs).
 */
export default function GatheringByQueryPage() {
  return (
    <>
      {/* The bar names the Florilegium throughout: the gathering's own name is the page's heading, known only on the device. */}
      <MobileTopBar titleKey="study.florilegium.title" back backFallback="/florilegium" />
      <section data-florilegium-page="gathering" className="bg-night px-5 pb-12 pt-6 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[640px]">
          {/* The query is read on the device (useSearchParams). */}
          <Suspense fallback={null}>
            <FlorilegiumByQuery />
          </Suspense>
        </div>
      </section>
    </>
  );
}
