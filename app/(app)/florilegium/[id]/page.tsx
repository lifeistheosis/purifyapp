import { FlorilegiumGate } from "@/components/florilegium/FlorilegiumGate";
import { GatheringBar } from "@/components/florilegium/GatheringBar";

export const metadata = {
  title: "Florilegium",
};

/*
 * A gathering, on the website: its own address. (In the apps it opens on
 * florilegium/gathering, named in the query: lib/florilegium/href.ts.) A
 * reading column, as a starter's page and the Florilegium's first page are.
 */
export default async function FlorilegiumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      {/* The bar takes the gathering's own name once it has gone up under it. The name is known only on the
          device, so the gathering says it as it is drawn (lib/florilegium/gatheringNow.ts); until then the bar
          names the Florilegium. */}
      <GatheringBar />
      <section data-florilegium-page="gathering" className="bg-night px-5 pb-12 pt-6 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[640px]">
          <FlorilegiumGate detailId={id} />
        </div>
      </section>
    </>
  );
}
