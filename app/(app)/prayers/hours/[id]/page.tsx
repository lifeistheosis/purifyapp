import { notFound } from "next/navigation";
import { PrayerRuleReader } from "@/components/prayers/PrayerRuleReader";
import { getHour, listHours } from "@/lib/prayers/hours";

export const dynamicParams = false;

export function generateStaticParams() {
  return listHours().map((h) => ({ id: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const h = getHour(id);
  if (!h) return { title: "Hour" };
  return { title: h.title, description: h.intro.slice(0, 160) };
}

const SECTION = "px-6 md:px-8 py-16 md:py-24 min-h-screen";

export default async function HourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hour = getHour(id);
  if (!hour) notFound();

  return (
    <section className={`${SECTION} bg-night`}>
      <PrayerRuleReader rule={hour} />
    </section>
  );
}
