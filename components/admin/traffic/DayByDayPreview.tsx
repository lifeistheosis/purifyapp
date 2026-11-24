"use client";

/**
 * Traffic's Day by day on made-up days (app/admin/days-preview), the fold
 * open, for the drawing he says yes or no to. Every figure a sample.
 */

import { useEffect } from "react";

import { Disclosure } from "../primitives";
import { DayByDay, type DayRow } from "./DayByDay";

const TODAY = "2026-11-24";
const ROWS: DayRow[] = Array.from({ length: 90 }, (_, i) => {
  const d = new Date(Date.parse(`${TODAY}T00:00:00Z`) - (89 - i) * 86_400_000).toISOString().slice(0, 10);
  const visitors = 420 + ((i * 37) % 300);
  return { date: d, visitors, views: visitors * 8 + ((i * 53) % 400), signups: 8 + ((i * 7) % 16) };
});

export function DayByDayPreview({ theme }: { theme: "dark" | "light" }) {
  useEffect(() => {
    const h = document.documentElement;
    const wear = () => {
      const mode = h.getAttribute("data-reading-mode");
      h.setAttribute("data-adm-theme", mode === null ? theme : mode === "parchment" ? "light" : "dark");
    };
    wear();
    const watch = new MutationObserver(wear);
    watch.observe(h, { attributes: true, attributeFilter: ["data-reading-mode"] });
    document.querySelectorAll("[data-days-preview] details").forEach((el) => el.setAttribute("open", ""));
    return () => watch.disconnect();
  }, [theme]);

  return (
    <div className="adm adm-page min-h-[100dvh]" style={{ background: "var(--adm-bg)", color: "var(--adm-ink)" }}>
      <main className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-6" data-days-preview>
        <Disclosure title="Day by day" hint="The last 7 days; all 90 one tap away">
          <DayByDay rows={ROWS} today={TODAY} csvFilename="traffic-90d.csv" />
        </Disclosure>
      </main>
    </div>
  );
}
