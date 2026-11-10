import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { SUPPORT } from "@/data/support/support";
import { fetchBmcTotal } from "@/lib/support/buymeacoffee";
import { getExpenses, getMonthlyGoal } from "@/lib/support/expenses";
import { isNativeRequest } from "@/lib/platform/nativeRequest";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { SupportBody, type SupportData } from "@/components/support/SupportBody";
import { SupportInReadersLanguage } from "@/components/support/SupportInReadersLanguage";

export const metadata = {
 title: "Support",
 description:
 "How the project is funded, what the money goes toward, and how to help. The core stays free; a future optional subscription layer covers heavier infrastructure under proper licensing.",
};

// Server component. Rendering is dynamic (it reads the request UA to
// detect the native app shell); the live BMC total stays cheap because
// fetchBmcTotal caches at the fetch layer for five minutes.
//
// In the native store builds (iOS/Android), this page must not show
// external payment links or fundraising meters — Apple guideline 3.1.1
// prohibits external purchase mechanisms inside the binary. Native users
// see the free-forever note and a contact block instead; the web page is
// unchanged.

/**
 * The page reads its numbers here, on the server, and draws the English; a
 * German reader's page is drawn on the device from the same file
 * (components/support/SupportInReadersLanguage.tsx).
 */
async function SupportContent() {
 // IS_STATIC_EXPORT is the load-bearing half. isNativeRequest() returns false
 // during a native export on purpose (no request to read a UA from), so on its
 // own it renders the WEB branch into the bundle and ships Cash App, PayPal and
 // Buy Me a Coffee inside the binary. That is the 3.1.1 exposure this page's
 // own header comment says it prevents. Checking the build target instead of
 // the request is what actually keeps them out.
 const native = IS_STATIC_EXPORT || (await isNativeRequest());
 let data: SupportData | null = null;
 if (!native) {
 const [live, expenseData, goal] = await Promise.all([fetchBmcTotal(), getExpenses(), getMonthlyGoal()]);
 data = {
 live,
 expenses: expenseData.lines,
 fromFallback: expenseData.fromFallback,
 updatedAt: expenseData.updatedAt ? expenseData.updatedAt.toISOString() : null,
 monthlyGoalUsd: goal.usd,
 raised: live?.monthlyRaisedUsd ?? SUPPORT.monthlyRaisedUsd,
 };
 }
 return (
 <SupportInReadersLanguage native={native} data={data}>
 <SupportBody native={native} data={data} isDe={false} />
 </SupportInReadersLanguage>
 );
}

/*
 * On a phone the page wears the bar every screen under You wears (1.8): the
 * way back, and the page's name once its own heading has gone up under the
 * bar. It is a row of Settings, and wore the apps' plain back bar until then.
 */
export default async function SupportPage() {
  return (
    <>
      <MobileTopBar titleKey="nav.supportPurify" back backFallback="/settings" revealTitleOn="support-title" />
      <SupportContent />
    </>
  );
}
