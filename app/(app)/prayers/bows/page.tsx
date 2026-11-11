import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { MetanyGuide } from "@/components/prayers/MetanyGuide";

export const metadata = {
  title: "Bows and prostrations",
  description:
    "When the Church bows and when she stands, in the Hours: the Lord's Day, the days from Pascha to Pentecost and the weekdays of the Great Fast, each in the words of its source.",
};

// Bows and prostrations (1.9, the owner's ask of 2026-11-11): the guide the
// line under each Hour's title opens. Every word is in lib/prayers/metanies.ts
// and read through the catalogs on the device, so the page prerenders as it
// stands for the website and the apps' static export.
export default function BowsPage() {
  return (
    <>
      <MobileTopBar titleKey="prayers.metany.title" back backFallback="/prayers/hours" revealTitleOn="metany-title" />
      <MetanyGuide />
    </>
  );
}
