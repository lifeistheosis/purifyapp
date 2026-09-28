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

  // A reading column, narrower than the hub: the lines are meant to be read.
  return (
    <section className="relative overflow-hidden bg-night min-h-[calc(100dvh-72px)] px-5 py-12 md:px-8 md:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 20% 10%, rgba(255,255,255,0.05) 0%, transparent 65%)",
        }}
      />
      <article className="relative mx-auto w-full max-w-[820px]">
        <FlorilegiumGate detailId={id} />
      </article>
    </section>
  );
}
