import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { SupportBody } from "@/components/support/SupportBody";

export const metadata = {
  title: "Support",
  description:
    "Where what Purify earns goes, and the two ways to help: Purify Plus and the EIKON shop. The saints, the Scriptures, the prayers and the calendar are free and stay free.",
};

// One page, the same in the apps and on the website (1.9, his word of
// 2026-11-11): where what Purify earns goes and the two ways to help, both
// the app's own pages, so nothing here points to an outside payment (Apple
// guideline 3.1.1) and the page reads nothing on the server. Every word is
// the catalog's, so each reader reads their own language
// (components/support/SupportBody.tsx). Until 1.9 the website asked for
// donations through Buy Me a Coffee, with a monthly goal and a table of
// costs, and the apps showed another page.

/*
 * On a phone the page wears the bar every screen under You wears (1.8): the
 * way back, and the page's name once its own heading has gone up under the
 * bar. It is a row of Settings, and wore the apps' plain back bar until then.
 */
export default function SupportPage() {
  return (
    <>
      <MobileTopBar titleKey="nav.supportPurify" back backFallback="/settings" revealTitleOn="support-title" />
      <SupportBody />
    </>
  );
}
