"use client";

/**
 * Subscriptions' counts on made-up numbers (app/admin/members-preview), with
 * the fold open, for the drawing he says yes or no to. Rendered from the
 * view's own component; every figure a sample. Themes as GoalsPreview.
 */

import { useEffect } from "react";

import { MemberCounts } from "./MemberCounts";

const SAMPLE = {
  activePlus: 41, activePro: 0, plusOnly: 41, supporters: 0,
  paidPlus: 18, compedPlus: 13, legacyPlus: 0, giftedPlus: 4, trialPlus: 6, trialsKnown: true,
};

export function MemberCountsPreview({ theme, open }: { theme: "dark" | "light"; open: boolean }) {
  useEffect(() => {
    const h = document.documentElement;
    const wear = () => {
      const mode = h.getAttribute("data-reading-mode");
      h.setAttribute("data-adm-theme", mode === null ? theme : mode === "parchment" ? "light" : "dark");
    };
    wear();
    const watch = new MutationObserver(wear);
    watch.observe(h, { attributes: true, attributeFilter: ["data-reading-mode"] });
    if (open) document.querySelectorAll("[data-members-preview] details").forEach((d) => d.setAttribute("open", ""));
    return () => watch.disconnect();
  }, [theme, open]);

  return (
    <div className="adm adm-page min-h-[100dvh]" style={{ background: "var(--adm-bg)", color: "var(--adm-ink)" }}>
      <main className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-6" data-members-preview>
        <MemberCounts data={SAMPLE} />
      </main>
    </div>
  );
}
