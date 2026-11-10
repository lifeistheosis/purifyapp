"use client";

import { useEffect, useState } from "react";

import { BoardRow } from "@/components/campaigns/CampaignRow";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { fetchMany } from "@/lib/campaigns/client";
import { MANY_SPANS, type ManySpan, type PublicCampaign } from "@/lib/campaigns/model";
import { useCampaignPart } from "@/lib/campaigns/useCampaignsOpen";

/**
 * "Prayed by many" (his item 118), the board's second list, under "Newly
 * asked": the campaigns most readers have added to their prayers today, this
 * week, this month or this year. The switch filters what is on screen, which
 * is where a pill belongs.
 *
 * BUILT, AND SWITCHED OFF ON THE SERVER. This draws nothing and asks nothing
 * until the server says the part is on (lib/campaigns/useCampaignsOpen.ts,
 * useCampaignPart): an app has no value of its own for it.
 *
 * The form it is held to is lib/campaigns/model.ts's: the order is shown and
 * no figure ever is, so a row here is the board's own row and says what a
 * campaign is for and until when. It never stands alone, since the board
 * opens on the newest. And while no campaign in the whole year has reached
 * the floor it is not drawn at all: a list that only says few pray says
 * nothing a reader needs.
 */

// His own words for them: "of the month, of the year, of the week, of the
// day". One short word each, so that four fit a phone's width in every
// language: "This month" was cut off at 390 pixels in the first still.
const SPAN_LABEL: Record<ManySpan, string> = {
  day: "campaigns.many.day",
  week: "campaigns.many.week",
  month: "campaigns.many.month",
  year: "campaigns.many.year",
};

export function PrayedByMany() {
  const { t } = useTranslate();
  const on = useCampaignPart("many");
  const [span, setSpan] = useState<ManySpan>("week");
  // Whether the year holds any: asked once, and the list is drawn only if so.
  const [any, setAny] = useState<boolean | null>(null);
  const [lists, setLists] = useState<Partial<Record<ManySpan, PublicCampaign[]>>>({});

  useEffect(() => {
    if (!on) return;
    let live = true;
    void fetchMany("year").then((list) => {
      if (!live) return;
      setAny(list.length > 0);
      setLists((l) => ({ ...l, year: list }));
    });
    return () => {
      live = false;
    };
  }, [on]);

  useEffect(() => {
    if (!on || !any || lists[span]) return;
    let live = true;
    void fetchMany(span).then((list) => {
      if (live) setLists((l) => ({ ...l, [span]: list }));
    });
    return () => {
      live = false;
    };
  }, [on, any, span, lists]);

  if (!on || !any) return null;
  const list = lists[span];

  return (
    <section data-campaigns-many="" aria-labelledby="board-many" className="mt-9">
      <h2 id="board-many" className="font-sans text-detail font-semibold text-paper/80">
        {t("campaigns.many.title")}
      </h2>
      <SegmentedSwitch
        label={t("campaigns.many.over")}
        idBase="many"
        items={MANY_SPANS.map((id) => ({ id, label: t(SPAN_LABEL[id]) }))}
        selected={span}
        onSelect={setSpan}
        // On the page itself, with no tint under the switch: the house's
        // off label is the ink at 65 percent, which is 4.52:1 on Light's
        // page and 4.41:1 on the switch's own tinted track.
        //
        // Each part as wide as its own word needs, and the room left over
        // shared out: the house's switch gives its parts equal widths and
        // cuts a word that does not fit, and "week" is a long word in some
        // languages beside very short ones for day and year (Romanian: Zi,
        // Săptămână, Lună, An). Measured with the export's own fonts in all
        // twenty-one languages at 390, 360 and 320 pixels: in equal parts
        // nineteen were cut; this way none is.
        className="mt-2 auto-cols-auto bg-transparent"
      />
      <div id={`many-panel-${span}`} role="tabpanel" aria-labelledby={`many-tab-${span}`} className="mt-3">
        {list === undefined ? (
          <p role="status" className="font-sans text-detail text-paper/70">
            {t("shop.gatheringTheCampaigns")}
          </p>
        ) : list.length === 0 ? (
          <p className="font-sans text-detail leading-relaxed text-paper/70">{t("campaigns.many.none")}</p>
        ) : (
          <div className="set-panel" role="group" aria-labelledby="board-many">
            {list.map((c) => (
              <BoardRow key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
