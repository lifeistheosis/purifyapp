import { FlorilegiumDetail } from "@/components/florilegium/FlorilegiumDetail";
import { PlusGate } from "@/components/florilegium/PlusGate";
import { getEntitlements } from "@/lib/entitlements/server";

export const metadata = {
  title: "Florilegium",
};

export default async function FlorilegiumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { plusFeatures } = await getEntitlements();

  return (
    <section className="px-5 md:px-8 py-16 md:py-24 bg-night min-h-[calc(100dvh-72px)]">
      <article className="mx-auto max-w-[760px] w-full">
        {plusFeatures ? (
          <FlorilegiumDetail id={id} />
        ) : (
          <PlusGate
            feature="The Florilegium"
            blurb="Gather verses and patristic lines into named collections of your own, each with your notes, kept in sync across your devices. Part of Purify Plus."
          />
        )}
      </article>
    </section>
  );
}
