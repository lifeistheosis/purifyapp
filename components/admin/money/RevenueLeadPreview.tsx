"use client";

/**
 * Revenue's new top on made-up numbers (app/admin/revenue-preview): the lead,
 * and the three folds closed as he will first see them. Rendered from the
 * page's own components; every figure a sample. The charts below the folds
 * are unchanged and not drawn here. Themes as GoalsPreview.
 */

import { useEffect } from "react";

import { Disclosure } from "../primitives";
import { RevenueLead } from "./RevenueLead";

const SAMPLE = {
  realizedCents: 61240,
  realizedComplete: true,
  plusMonthCents: 18200,
  plusYearCents: 218400,
  plusEstimated: false,
  shopNetCents: 0,
  donationsRecorded: false,
  donationsCents: 0,
};

export function RevenueLeadPreview({ theme }: { theme: "dark" | "light" }) {
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
      <main className="mx-auto w-full max-w-[720px] space-y-6 px-4 pb-16 pt-6" data-revenue-preview>
        <RevenueLead data={SAMPLE} />
        <Disclosure title="Every figure" hint="The five cards, the note on Plus, the run-rate">
          <span />
        </Disclosure>
        <Disclosure title="The shop and its checkouts" hint="Average order, walked-away checkouts, growth">
          <span />
        </Disclosure>
      </main>
    </div>
  );
}
