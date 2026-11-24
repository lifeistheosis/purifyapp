"use client";

/**
 * Costs' new top on made-up numbers (app/admin/costs-preview): the lead,
 * and the three folds closed as he will first see them. Rendered from the
 * page's own components; every figure a sample. The charts below the folds
 * are unchanged and not drawn here. Themes as GoalsPreview.
 */

import { useEffect } from "react";

import { Disclosure } from "../primitives";
import { CostsLead } from "./CostsLead";


export function CostsLeadPreview({ theme }: { theme: "dark" | "light" }) {
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
      <main className="mx-auto w-full max-w-[720px] space-y-6 px-4 pb-16 pt-6" data-costs-preview>
        <CostsLead monthlyCents={34700} activeLines={7} />
        <Disclosure title="Donations and the /support goal" hint="The goal /support publishes, what came in, and the shortfall">
          <span />
        </Disclosure>
      </main>
    </div>
  );
}
