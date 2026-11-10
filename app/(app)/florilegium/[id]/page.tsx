import { FlorilegiumGate } from "@/components/florilegium/FlorilegiumGate";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

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
      {/* The bar names the Florilegium throughout: the gathering's own name is the page's heading, known only on the device. */}
      <MobileTopBar titleKey="study.florilegium.title" back backFallback="/florilegium" />
      <section data-florilegium-page="gathering" className="bg-night px-5 pb-12 pt-6 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[640px]">
          <FlorilegiumGate detailId={id} />
        </div>
      </section>
    </>
  );
}
