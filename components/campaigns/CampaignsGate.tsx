"use client";

import type { ReactNode } from "react";

import { NotFoundScreen } from "@/components/layout/NotFoundScreen";
import { useCampaignsAnswer } from "@/lib/campaigns/useCampaignsOpen";

/**
 * The door of every campaign page (1.9.1). A page shown in the apps cannot
 * ask the server who is reading it (AGENTS.md), so the page's file can only
 * know whether campaigns are in this build at all, and answers 404 itself
 * when they are not (lib/campaigns/flags.ts). Whether they are open for THIS
 * reader is asked on the device, of the server's own switch
 * (lib/campaigns/useCampaignsOpen.ts), as the developer panel's gate does
 * (components/dev/DeveloperGate.tsx).
 *
 * Until the answer is yes, nothing of campaigns is drawn. A no draws the
 * app's own page for an address that leads nowhere: while campaigns are open
 * to testers alone, everyone else finds here exactly what they found before
 * campaigns were built. Not visible means absent, not politely deferred.
 */
export function CampaignsGate({ children }: { children: ReactNode }) {
  const answer = useCampaignsAnswer();
  if (answer === true) return <>{children}</>;
  if (answer === null) return <div data-campaigns-asking="" className="min-h-[60vh]" />;
  return <NotFoundScreen />;
}
