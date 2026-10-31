"use client";

import { useRef, type KeyboardEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChatBubble } from "@/components/ui/icons/ChatBubble";
import { Lampada } from "@/components/ui/icons/Lampada";
import { cn } from "@/lib/cn";
import { COMMUNITY_HALVES, type CommunityHalf } from "@/lib/community/halves";
import { tabForKey } from "@/lib/ui/sectionTabs";

/**
 * Community's one switch (1.8, the owner's pick of r3-02, B): Pray together
 * and Talk together, two halves of one well carved into the page, the open
 * half raised out of it and lit white (app/globals.css, "Community: Pray
 * together and Talk together"). The raised half slides across as the other
 * is chosen, and stands where it is with motion off.
 *
 * A tablist, as the app's other switches are (components/ui/SegmentedSwitch,
 * BarSwitch): the arrows move between the halves in the reading direction,
 * Home and End go to the ends, and only the open half is in the tab order.
 * Each half's tab is `${idBase}-tab-${half}` and controls
 * `${idBase}-panel-${half}`; the page below is that panel.
 */
export function PrayTalkSwitch({
  half,
  onChoose,
  idBase,
}: {
  half: CommunityHalf;
  onChoose: (next: CommunityHalf) => void;
  idBase: string;
}) {
  const { t } = useTranslate();
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const next = tabForKey(e.key, COMMUNITY_HALVES.indexOf(half), COMMUNITY_HALVES.length, rtl);
    if (next === null) return;
    e.preventDefault();
    const id = COMMUNITY_HALVES[next];
    onChoose(id);
    listRef.current?.querySelector<HTMLButtonElement>(`#${idBase}-tab-${id}`)?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t("community.title")}
      // What the release's tour lights, and lets the reader try (lib/whatsNew/tour.ts).
      data-tour="community-halves"
      className="community-halves relative grid h-[60px] grid-cols-2 rounded-[21px] border border-paper/[0.08] p-[5px]"
    >
      {/* The raised half, under the words: it moves, the words stay. */}
      <span
        aria-hidden
        data-half={half}
        className={cn(
          "community-half-thumb pointer-events-none absolute inset-y-[5px] start-[5px] w-[calc(50%-5px)] rounded-[16px]",
          half === "talk" && "translate-x-full rtl:-translate-x-full",
        )}
      />
      {COMMUNITY_HALVES.map((id) => {
        const on = id === half;
        return (
          <button
            key={id}
            id={`${idBase}-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={`${idBase}-panel-${id}`}
            tabIndex={on ? 0 : -1}
            onClick={() => {
              if (!on) onChoose(id);
            }}
            onKeyDown={onKeyDown}
            className={cn(
              "community-half tap-press relative z-[1] flex min-w-0 items-center justify-center gap-2 rounded-[16px] px-2 font-sans text-[15px] font-semibold leading-tight",
              on ? "text-paper" : "text-paper/50 hover:text-paper/80",
            )}
          >
            {id === "pray" ? <Lampada size={20} className="shrink-0" /> : <ChatBubble size={20} className="shrink-0" />}
            <span className="min-w-0 text-balance text-center">
              {t(id === "pray" ? "community.prayTogether" : "community.talkTogether")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
