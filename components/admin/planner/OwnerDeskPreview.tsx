"use client";

/**
 * The owner's desk on sample settings (app/admin/desk-preview), for the
 * drawing he says yes or no to. Rendered from the desk's own component.
 */

import { useEffect } from "react";

import { OwnerDesk, type DeskView } from "./OwnerDesk";

const SAMPLE: DeskView = {
  present: true,
  ok: true,
  settings: { autoSend: true, sendAt: "12:00", briefAt: "07:30", weeklyDay: 1 },
  saved: null,
  limits: { brief: ["05:00", "11:00"], send: ["09:00", "18:00"], holdMinutes: 120 },
  brief: { sent: true, at: "2026-11-25T12:31:00Z", weekly: false },
  today: { day: "2026-11-25", needs: [], pieces: [], board: null } as unknown as DeskView["today"],
  look: { current: "a", seen: "a", at: null, firstSent: null },
};

export function OwnerDeskPreview({ theme }: { theme: "dark" | "light" }) {
  useEffect(() => {
    const h = document.documentElement;
    const wear = () => {
      const mode = h.getAttribute("data-reading-mode");
      h.setAttribute("data-adm-theme", mode === null ? theme : mode === "parchment" ? "light" : "dark");
    };
    wear();
    const watch = new MutationObserver(wear);
    watch.observe(h, { attributes: true, attributeFilter: ["data-reading-mode"] });
    return () => watch.disconnect();
  }, [theme]);

  return (
    <div className="adm adm-page min-h-[100dvh]" style={{ background: "var(--adm-bg)", color: "var(--adm-ink)" }}>
      <main className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-6" data-desk-preview>
        <OwnerDesk sample={SAMPLE} />
      </main>
    </div>
  );
}
