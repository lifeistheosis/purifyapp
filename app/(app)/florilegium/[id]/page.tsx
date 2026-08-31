import { FlorilegiumGate } from "@/components/florilegium/FlorilegiumGate";

export const metadata = {
  title: "Florilegium",
};

export default async function FlorilegiumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <section className="px-5 md:px-8 py-16 md:py-24 bg-night min-h-[calc(100dvh-72px)]">
      <article className="mx-auto max-w-[760px] w-full">
        <FlorilegiumGate detailId={id} />
      </article>
    </section>
  );
}
