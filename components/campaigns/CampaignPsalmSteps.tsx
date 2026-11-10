"use client";

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PrayerStep } from "@/components/prayers/service/PrayerStep";
import type { CarriedCampaign } from "@/lib/campaigns/carried";
import { campaignPsalm } from "@/lib/campaigns/model";
import type { CampaignPsalm } from "@/lib/campaigns/psalms";
import { dayText, setIn } from "@/lib/campaigns/words";

/**
 * The psalm a campaign for the living names (his yes to item 123: a psalm of
 * the prayer book if its creator wants one, word for word), as a step of the
 * prayer that carries the campaign's name: it follows "Those I pray for",
 * with its own name, its words read from the prayer book's file and the line
 * that says which campaign brought it and until when.
 *
 * Each psalm once, however many campaigns name it, and not at all in a rule
 * that already prays that psalm. Its words are a piece of the app's code,
 * asked for only when a campaign with a psalm stands in the prayer being
 * prayed (lib/campaigns/psalms.ts): no other prayer page carries them.
 *
 * The step is not one of the rule's own, so nothing about it is marked or
 * counted: the page counts a prayer as it is passed only when the rule holds
 * it (PrayerRuleReader, passed), and Amen at the foot of the page is the
 * rule's.
 */
export function CampaignPsalmSteps({
  campaigns,
  ruleHas,
  contentLang,
}: {
  /** The campaigns the prayer carries today (lib/campaigns/carried.ts, carriedFor). */
  campaigns: readonly CarriedCampaign[];
  /** Whether the rule being prayed already has a prayer with this id. */
  ruleHas: (prayerId: string) => boolean;
  contentLang: string;
}) {
  const { t, locale } = useTranslate();
  // The first campaign to name each psalm speaks for it.
  const wanted: { key: string; campaign: CarriedCampaign }[] = [];
  for (const c of campaigns) {
    const known = c.forWhom === "living" ? campaignPsalm(c.prayer) : null;
    if (!known || ruleHas(known.id)) continue;
    const key = `${known.rule}/${known.id}`;
    if (!wanted.some((w) => w.key === key)) wanted.push({ key, campaign: c });
  }
  const keys = wanted.map((w) => w.key).join(" ");
  const [loaded, setLoaded] = useState<{ keys: string; psalms: Record<string, CampaignPsalm | null> } | null>(null);

  useEffect(() => {
    if (!keys) return;
    let live = true;
    void import("@/lib/campaigns/psalms").then((m) => {
      if (!live) return;
      const psalms: Record<string, CampaignPsalm | null> = {};
      for (const key of keys.split(" ")) {
        const [rule, id] = key.split("/");
        psalms[key] = m.campaignPsalmText({ rule, id });
      }
      setLoaded({ keys, psalms });
    });
    return () => {
      live = false;
    };
  }, [keys]);

  if (!keys || loaded?.keys !== keys) return null;
  return (
    <>
      {wanted.map(({ key, campaign }) => {
        const psalm = loaded.psalms[key];
        if (!psalm) return null;
        // Where the prayer book keeps it: a long hold on its words saves the
        // psalm itself, under its own rule, as a step brought from another
        // rule is saved (PrayerStep).
        const home = { ruleId: key.split("/")[0], prayerId: psalm.prayer.id };
        return (
          <PrayerStep
            key={key}
            ruleId={home.ruleId}
            // An id of its own: a reader's rule may hold the same psalm under the
            // book's id. And its own printing, which the step says under its
            // words: the page's foot names the printing of the rule being
            // prayed, which is not this psalm's.
            prayer={{ ...psalm.prayer, id: `campaign-${psalm.prayer.id}`, source: psalm.source, origin: psalm.prayer.origin ?? home }}
            title={t("today.greet.psalm", { ref: psalm.number })}
            note={setIn(t("campaigns.inPrayersLine"), { title: campaign.title, date: dayText(campaign.until, locale) })}
            contentLang={contentLang}
          />
        );
      })}
    </>
  );
}
