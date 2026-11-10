import { Suspense } from "react";

import { FlorilegiumByQuery } from "@/components/florilegium/FlorilegiumByQuery";
import { GatheringBar } from "@/components/florilegium/GatheringBar";

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
      {/* The bar takes the gathering's own name once it has gone up under it, and the gathering says which it
          is (lib/florilegium/gatheringNow.ts). The bar stands outside the boundary below on purpose: in one of
          its own it arrived a beat after its page, and the page switch was pictured twice. */}
      <GatheringBar />
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
