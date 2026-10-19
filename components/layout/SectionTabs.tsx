"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { cn } from "@/lib/cn";
import { hashFor, tabFromHash } from "@/lib/ui/sectionTabs";

// On the server there is no layout to read (components/nav/ScrollResetBridge.tsx).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * A page in parts, on a phone first (1.7): the owner's pattern 1 of
 * 2026-10-16, "desktop pages shrunk onto phones", answered once. A segmented
 * switch under the page's head, sticky under the top bar, and one part shown
 * at a time, so a saint's page is a short Life, Writings or Miracles and not
 * one long column. A saint's page is the first to wear it.
 *
 *  - One part: the part alone, with no switch.
 *  - Every part is in the page, the others `hidden`, so a search engine still
 *    reads the writings and the miracles on the website.
 *  - The open part is kept in the address (#writings) with replaceState, so
 *    coming back to the page opens it, and back still leaves the page. It is
 *    read in the first render on the device, so a reader coming back from a
 *    work finds Writings open when lib/ui/returnPlace.ts looks for the row
 *    they tapped (lib/ui/sectionTabs.ts).
 *  - Switching while the switch is pinned puts the new part's start right
 *    under it, at once: no smooth scroll and no slide.
 *  - The row is solid, with no blur: a blurred layer over moving text is
 *    repainted on every frame on Android.
 */
export type SectionTab = {
  id: string;
  /** Catalog key of the part's name. */
  labelKey: string;
  panel: ReactNode;
};

const TAB_EVENT = "purify:section-tab";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(TAB_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(TAB_EVENT, onChange);
  };
}

export function SectionTabs({
  tabs,
  labelKey,
  idBase,
  className,
}: {
  tabs: SectionTab[];
  /** Catalog key naming the switch for assistive technology. */
  labelKey: string;
  /** Prefix of the tabs' and panels' ids. Never a part's own name. */
  idBase: string;
  className?: string;
}) {
  const { t } = useTranslate();
  const ids = tabs.map((tab) => tab.id);
  const key = ids.join(" ");
  const current = useSyncExternalStore(
    subscribe,
    () => tabFromHash(window.location.hash, key.split(" ")),
    () => key.split(" ")[0],
  );
  const rowRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const settle = useRef(false);

  // After a switch made while the row was pinned, the new part starts right
  // under the row.
  useIsoLayoutEffect(() => {
    if (!settle.current) return;
    settle.current = false;
    const row = rowRef.current;
    const panels = panelsRef.current;
    if (!row || !panels) return;
    const off = panels.getBoundingClientRect().top - row.getBoundingClientRect().bottom;
    if (Math.abs(off) > 1) window.scrollBy({ top: off, left: 0, behavior: "instant" as ScrollBehavior });
  }, [current]);

  function select(id: string) {
    if (id === current) return;
    const row = rowRef.current;
    if (row) {
      const pinnedAt = parseFloat(window.getComputedStyle(row).top) || 0;
      settle.current = row.getBoundingClientRect().top <= pinnedAt + 1;
    }
    const url = window.location.pathname + window.location.search + hashFor(id, ids);
    // replaceState, never push: back leaves the page, it does not walk the parts.
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(TAB_EVENT));
  }

  if (tabs.length < 2) {
    return <div className={cn("pt-4", className)}>{tabs[0]?.panel}</div>;
  }

  return (
    <div className={className}>
      <div
        ref={rowRef}
        className="sticky top-12 below-topbar z-20 -mx-5 bg-night px-5 py-2 md:top-[72px] md:-mx-8 md:px-8"
      >
        <SegmentedSwitch
          label={t(labelKey)}
          idBase={idBase}
          items={tabs.map((tab) => ({ id: tab.id, label: t(tab.labelKey) }))}
          selected={current}
          onSelect={select}
          className="mx-auto max-w-[420px] md:mx-0"
        />
      </div>
      <div ref={panelsRef} className="pt-6">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`${idBase}-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`${idBase}-tab-${tab.id}`}
            hidden={tab.id !== current}
          >
            {tab.panel}
          </div>
        ))}
      </div>
    </div>
  );
}
