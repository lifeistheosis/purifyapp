"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { SaintWebData } from "@/lib/saints/webLayout";

import { WebConstellation } from "./WebConstellation";
import { WebTimeline } from "./WebTimeline";
import { WebViewSwitch, useWebView } from "./WebViewSwitch";

/**
 * The saint web (1.8): one screen, the same web two ways, and a switch in the
 * top bar between them. The owner's words of 2026-10-27, on round 1's A
 * (Constellation) and B (Thread): "I want that to just be a button, instead
 * of merging the two screens" (boards/purify-master/variants/m01-saint-web).
 *
 * Web shows the saint in the middle and everyone around him; Timeline the
 * same people year by year down his life. On a phone the switch is in the
 * bar (the page mounts it there, WebViewSwitch); on a computer, which has no
 * such bar, it stands beside the page's heading. The heading names the screen
 * for assistive technology on a phone, where the bar carries the switch in
 * the title's place.
 */
export function SaintWebScreen({ data }: { data: SaintWebData }) {
  const { t } = useTranslate();
  const view = useWebView();
  const title = t("saints.web.title", { name: data.center.short });

  return (
    <section className="bg-night px-5 md:px-8">
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="pt-2 md:flex md:items-end md:justify-between md:gap-6 md:pb-4 md:pt-14">
          <h1 className="sr-only md:not-sr-only md:text-heading md:leading-tight md:text-paper">{title}</h1>
          <div className="hidden md:flex native-md-hidden">
            <WebViewSwitch idBase="saint-web-head" />
          </div>
        </div>
        <div id="saint-web-view" role="tabpanel" aria-labelledby={`saint-web-bar-${view}`}>
          {view === "web" ? <WebConstellation data={data} /> : <WebTimeline data={data} />}
        </div>
      </div>
    </section>
  );
}
