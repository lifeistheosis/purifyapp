import { notFound } from "next/navigation";

import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { MyRuleReader } from "@/components/prayers/mine/MyRuleReader";
import { MY_RULE_PARTS, type MyRulePart } from "@/lib/prayers/myRule";

type Params = Promise<{ part: string }>;

// Both parts are prerendered and nothing else is a page, which the apps'
// static export requires.
export const dynamicParams = false;

export function generateStaticParams() {
  return MY_RULE_PARTS.map((part) => ({ part }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { part } = await params;
  return { title: part === "evening" ? "Your evening rule" : "Your morning rule" };
}

const TITLE_KEY: Record<MyRulePart, string> = {
  morning: "prayers.mine.morningTitle",
  evening: "prayers.mine.eveningTitle",
};

// A part of the reader's own rule, prayed (1.7): composed on the device
// (components/prayers/mine/MyRuleReader.tsx), read in the prayer reader. Back
// leads to the builder.
export default async function MyRulePartPage({ params }: { params: Params }) {
  const { part } = await params;
  if (!(MY_RULE_PARTS as readonly string[]).includes(part)) notFound();
  const which = part as MyRulePart;
  return (
    <>
      <MobileTopBar titleKey={TITLE_KEY[which]} back backFallback="/prayers/personal" revealTitleOn="prayer-title" />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14">
        <MyRuleReader part={which} />
      </section>
    </>
  );
}
