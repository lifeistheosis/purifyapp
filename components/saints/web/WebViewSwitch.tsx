"use client";

import { useRef, useSyncExternalStore, type KeyboardEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Graph } from "@/components/ui/icons/Graph";
import { TimelineList } from "@/components/ui/icons/TimelineList";
import { cn } from "@/lib/cn";
import { hashFor, tabForKey, tabFromHash } from "@/lib/ui/sectionTabs";

/**
 * Which way the saint web is seen (1.8): "web", the Constellation, or
 * "timeline". The owner's words of 2026-10-27, on round 1's A and B: "I want
 * that to just be a button, instead of merging the two screens."
 *
 * The view lives in the address (#timeline), written with replaceState, so a
 * reader back from a saint's page finds the view he left, back still leaves
 * the screen, and the switch in the top bar (which the page mounts, as every
 * page mounts its own bar) and the screen below it read one value without
 * sharing a parent.
 */
export type WebView = "web" | "timeline";
export const WEB_VIEWS: readonly WebView[] = ["web", "timeline"];
const VIEW_EVENT = "purify:saint-web-view";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(VIEW_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(VIEW_EVENT, onChange);
  };
}

/** The view open now: read in the first render on the device, the Web on the server. */
export function useWebView(): WebView {
  return useSyncExternalStore(
    subscribe,
    () => tabFromHash(window.location.hash, WEB_VIEWS),
    () => WEB_VIEWS[0],
  );
}

/** Open a view: kept in the address, the screen back at its top. */
export function chooseWebView(next: WebView): void {
  const url = window.location.pathname + window.location.search + hashFor(next, WEB_VIEWS);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(VIEW_EVENT));
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
}

/**
 * Web | Timeline: the design's switch, a small pill of two with their marks,
 * the open one filled. A tablist: the arrows move between the two in the
 * reading direction. Both views are one panel, `saint-web-view`.
 */
export function WebViewSwitch({ idBase }: { idBase: string }) {
  const { t } = useTranslate();
  const view = useWebView();
  const listRef = useRef<HTMLDivElement>(null);

  function choose(next: WebView) {
    if (next !== view) chooseWebView(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const next = tabForKey(e.key, WEB_VIEWS.indexOf(view), WEB_VIEWS.length, rtl);
    if (next === null) return;
    e.preventDefault();
    choose(WEB_VIEWS[next]);
    listRef.current?.querySelector<HTMLButtonElement>(`#${idBase}-${WEB_VIEWS[next]}`)?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t("saints.web.viewLabel")}
      className="flex h-9 shrink-0 rounded-pill border border-paper/[0.12] bg-paper/[0.07] p-[3px]"
    >
      {WEB_VIEWS.map((v) => {
        const on = v === view;
        return (
          <button
            key={v}
            id={`${idBase}-${v}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls="saint-web-view"
            tabIndex={on ? 0 : -1}
            onClick={() => choose(v)}
            onKeyDown={onKeyDown}
            className={cn(
              "tap-press flex items-center gap-1.5 whitespace-nowrap rounded-pill px-3 font-sans text-detail font-semibold motion-safe:transition-colors",
              on ? "bg-paper text-night" : "text-paper/65 hover:text-paper",
            )}
          >
            {v === "web" ? <Graph size={15} /> : <TimelineList size={15} />}
            {t(v === "web" ? "saints.door.web" : "saints.web.timeline")}
          </button>
        );
      })}
    </div>
  );
}
