import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { MyRuleBuilder } from "@/components/prayers/mine/MyRuleBuilder";

export const metadata = {
  title: "Your rule",
  description:
    "A morning and an evening rule of your own: prayers chosen from the prayer book, in your order, prayed as one. And the two lists of names you carry, the living and the departed.",
};

// Your rule (1.7, the owner's note 17): the builder, and the names under it.
// Everything on it is the reader's own and kept on the device, so the body is
// a client component (components/prayers/mine/MyRuleBuilder.tsx) and the
// page prerenders as it stands for the website and the apps' static export.
// The address stays /prayers/personal: You, Settings, search and the walk
// all lead here.
//
// 1.8 (the owner's pick A of r3-27): the part's icon fills the top of the
// screen, so the bar starts clear over it, its buttons on plates, and turns
// solid with the name once the page's own has gone up under it, as on a
// saint's page.
export default function PersonalPrayersPage() {
  return (
    <>
      <MobileTopBar titleKey="prayers.mine.title" back backFallback="/prayers" revealTitleOn="mine-title" overlay />
      <MyRuleBuilder />
    </>
  );
}
