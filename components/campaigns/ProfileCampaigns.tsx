"use client";

import { BoardRow } from "@/components/campaigns/CampaignRow";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { PublicCampaign } from "@/lib/campaigns/model";

/**
 * Behind the Campaigns door on a profile (1.9, phase 4; the notes, 2.10 and
 * section 35): that reader's campaigns as anyone may see them, the board's
 * own rows in one lit panel. Rows, because each is a place to go (his word of
 * 2026-11-10 on pills), and never a count of anyone.
 *
 * What is on a profile is the server's to say (lib/campaigns/server.ts,
 * listByCreator): running ones for everyone in Community, and one for the
 * reposed its creator chose to keep. This draws what it is handed and nothing
 * when it is handed none, so the door's panel is never an empty box.
 *
 * `onOpen`: the profile's card steps aside as a campaign's page opens.
 */
export function ProfileCampaigns({ campaigns, onOpen }: { campaigns: readonly PublicCampaign[]; onOpen?: () => void }) {
  const { t } = useTranslate();
  if (campaigns.length === 0) return null;
  return (
    <div data-profile-campaigns="" role="group" aria-label={t("community.prayerCampaigns")} className="set-panel">
      {campaigns.map((c) => (
        <BoardRow key={c.id} campaign={c} onOpen={onOpen} />
      ))}
    </div>
  );
}
