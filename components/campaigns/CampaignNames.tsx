"use client";

import { useState, type ComponentType } from "react";

import { CampaignJoinSheet } from "@/components/campaigns/CampaignJoinSheet";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { answered, carriedNow, toAsk, type CarriedCampaign, type CarryPick } from "@/lib/campaigns/carried";
import { useCampaignsOpen } from "@/lib/campaigns/useCampaignsOpen";
import { useCampaignUpkeep } from "@/lib/campaigns/useCampaignUpkeep";
import { updateCarried, useCarried } from "@/lib/campaigns/useCarried";
import { dayShort, setIn } from "@/lib/campaigns/words";
import { upsertIntention, uuid } from "@/lib/prayers/storage";
import { todayKey } from "@/lib/rhythm/dayKey";

/** The medallion of Those you pray for, as the page that holds this list draws its own (components/prayers/Diptychs.tsx). */
type MedallionPart = ComponentType<{ name: string; sub?: string | null; onOpen: () => void }>;

/**
 * The campaigns a reader carries, among those they pray for on the page of
 * Your rule (1.9): each name as a medallion with the day it leaves
 * ("Until Dec 19"), after the reader's own lists and the names from the
 * prayer wall. A tap opens the joining sheet again, to move it to
 * other prayers or take it out.
 *
 * And the one question a campaign leaves behind, asked here and nowhere else,
 * once: when it has run its course, "Keep this name among those you pray
 * for?" Keep puts the name in the reader's own list, of the living or of the
 * reposed, where it stays theirs; Let go forgets it. Never asked for one the
 * reader took out themselves, or that was taken down.
 *
 * Nothing is drawn while the reader carries none and none waits for its
 * answer, which in a closed build is always (lib/campaigns/useCarried.ts).
 */
export function CampaignNames({ Medallion }: { Medallion: MedallionPart }) {
  const { t, locale } = useTranslate();
  const list = useCarried();
  useCampaignUpkeep(useCampaignsOpen());
  const [moving, setMoving] = useState<CarriedCampaign | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const now = carriedNow(list, todayKey());
  const asking = toAsk(list);
  if (now.length === 0 && asking.length === 0 && !notice) return null;

  const pick: CarryPick | null = moving
    ? { id: moving.id, name: moving.name, title: moving.title, forWhom: moving.forWhom, prayer: moving.prayer, lastDay: moving.lastDay }
    : null;

  function keep(c: CarriedCampaign) {
    upsertIntention(c.forWhom === "departed" ? "departed" : "living", { id: uuid(), name: c.name, addedAt: new Date().toISOString() });
    updateCarried((all) => answered(all, c.id));
  }

  return (
    <section aria-labelledby="diptych-campaigns" data-names="campaigns">
      <h3 id="diptych-campaigns" className="rule-names-label">
        {t("community.prayerCampaigns")}
      </h3>
      {now.length > 0 ? (
        <ul className="rule-meds">
          {now.map((c) => (
            <li key={c.id} data-campaign-name="">
              <Medallion
                name={c.name}
                // "Until Nov 16", as a name from the prayer wall says its day: the
                // list's own name already says these are campaigns.
                sub={t("prayers.diptychs.wallUntil", { date: dayShort(c.until, locale) })}
                onOpen={() => {
                  setNotice(null);
                  setMoving(c);
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {notice ? (
        <p role="status" className="mt-2 font-sans text-caption text-paper/70">
          {notice}
        </p>
      ) : null}
      {asking.map((c) => (
        <div key={c.id} role="group" aria-label={c.name} data-campaign-keep="" className="mt-3">
          <p className="break-words font-sans text-detail leading-relaxed text-paper/85">{setIn(t("campaigns.keep.ask"), { name: c.name })}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => keep(c)}
              className="tap-press inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night"
            >
              {t("campaigns.keep.yes")}
            </button>
            <button
              type="button"
              onClick={() => updateCarried((all) => answered(all, c.id))}
              className="tap-press inline-flex min-h-11 items-center rounded-pill px-5 font-sans text-detail font-semibold text-paper/85 ring-1 ring-inset ring-paper/25"
            >
              {t("campaigns.keep.no")}
            </button>
          </div>
        </div>
      ))}

      <CampaignJoinSheet
        key={moving?.id ?? "none"}
        open={moving !== null}
        pick={pick}
        onClose={() => setMoving(null)}
        onDone={(message) => {
          setMoving(null);
          setNotice(message);
        }}
      />
    </section>
  );
}
