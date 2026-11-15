"use client";

import { use, useState, useSyncExternalStore, type ReactNode } from "react";

import { CampaignsClosed } from "@/components/campaigns/CampaignsClosed";
import { NotFoundScreen } from "@/components/layout/NotFoundScreen";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { campaignsInBuild } from "@/lib/campaigns/flags";
import { holdForCampaignsDoor, useCampaignsDoor } from "@/lib/campaigns/useCampaignsOpen";

const noSubscribe = () => () => {};
const onTheDevice = () => true;
const inThePageHtml = () => false;

/**
 * The door of every campaign page (1.9). A page shown in the apps cannot
 * ask the server who is reading it (AGENTS.md), so the page's file can only
 * know whether campaigns are in this build at all, and answers 404 itself
 * when they are not (lib/campaigns/flags.ts). Whether they are open for THIS
 * reader is asked on the device, of the server's own switch
 * (lib/campaigns/useCampaignsOpen.ts), as the developer panel's gate does
 * (components/dev/DeveloperGate.tsx).
 *
 * Until the answer is yes, nothing of campaigns is drawn. What stands in
 * their place says what is true (./CampaignsClosed.tsx): that campaigns are
 * not open, where the server said no, or that it could not be reached, where
 * it gave no answer. Until 2026-11-11 both drew the app's page for an address
 * that leads nowhere, whose words ("the page may not be built yet") were
 * false here; a reader with no signal was told a page did not exist.
 *
 * A build with no campaigns in it at all keeps that page: there the address
 * does lead nowhere.
 */
export function CampaignsGate({ children }: { children: ReactNode }) {
  const door = useCampaignsDoor();
  // Mounted by a page switch, not woken from the page's HTML (whose first
  // render must match it), and fixed at the first render: only a switch is
  // held, and a door already drawn never suspends (Updates 90).
  const mounted = useSyncExternalStore(noSubscribe, onTheDevice, inThePageHtml);
  const [bySwitch] = useState(mounted);
  if (door === "asking" && bySwitch) {
    // The page being left stays on the screen until the server answers, for
    // DOOR_HOLD_MS at the most (lib/campaigns/useCampaignsOpen.ts).
    const wait = holdForCampaignsDoor();
    if (wait) use(wait);
  }
  if (door === "open") return <>{children}</>;
  if (door === "asking") return <DoorAsking />;
  if (!campaignsInBuild()) return <NotFoundScreen />;
  return <CampaignsClosed unreached={door === "unreached"} />;
}

/**
 * The wait past the hold's bound, or in the page's HTML: a line that says so,
 * where an empty box 60% of the screen high stood until 1.9 (Updates 90).
 */
function DoorAsking() {
  const { t } = useTranslate();
  return (
    <p role="status" data-campaigns-asking="" className="px-5 py-16 text-center font-sans text-detail text-paper/70">
      {t("common.loading")}
    </p>
  );
}
