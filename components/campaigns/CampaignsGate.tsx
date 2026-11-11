"use client";

import type { ReactNode } from "react";

import { CampaignsClosed } from "@/components/campaigns/CampaignsClosed";
import { NotFoundScreen } from "@/components/layout/NotFoundScreen";
import { campaignsInBuild } from "@/lib/campaigns/flags";
import { useCampaignsDoor } from "@/lib/campaigns/useCampaignsOpen";

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
  if (door === "open") return <>{children}</>;
  if (door === "asking") return <div data-campaigns-asking="" className="min-h-[60vh]" />;
  if (!campaignsInBuild()) return <NotFoundScreen />;
  return <CampaignsClosed unreached={door === "unreached"} />;
}
