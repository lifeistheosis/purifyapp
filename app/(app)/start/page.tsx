import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { StartHere } from "@/components/start/StartHere";

export const metadata = {
  title: "Start here",
  description:
    "New to Orthodoxy? Seven small steps, in order: a first prayer, the Sign of the Cross, a simple morning rule, a Gospel, the faith a little each day, the Church's day, and a parish. And a guide for your first Divine Liturgy.",
};

// Start here (1.6, a phone page since 1.7): a first step for the reader who
// is new, the six after it (lib/start/steps.ts), and the guide for a first
// Liturgy (/start/first-liturgy). The page's own bar names it once its
// heading has scrolled away, and its way back leads to Discover when there is
// nothing behind. It reads no cookie and no session, so it prerenders as it
// stands for the website and for the apps' static export.
export default function StartPage() {
  return (
    <>
      <MobileTopBar titleKey="nav.discoverMenu.start" back backFallback="/discover" revealTitleOn="start-title" />
      <StartHere />
    </>
  );
}
