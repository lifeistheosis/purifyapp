import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { FirstLiturgyGuide } from "@/components/start/liturgy/FirstLiturgyGuide";

export const metadata = {
  title: "Your first Liturgy",
  description:
    "Going to your first Divine Liturgy? A short guide, one card at a time: before you go, what you will see, and the customs of the parish you are visiting.",
};

// Your first Liturgy (1.7, the owner's note 27 of 2026-10-16): a guide for an
// inquirer going to a first Divine Liturgy. Everything it knows about the
// reader is on the device (lib/start/liturgyPlan.ts) and every word is in
// lib/start/firstLiturgy.ts, read through the catalogs on the device, so the
// page prerenders as it stands for the website and the apps' static export.
export default function FirstLiturgyPage() {
  return (
    <>
      <MobileTopBar titleKey="start.liturgy.title" back backFallback="/start" />
      <FirstLiturgyGuide />
    </>
  );
}
