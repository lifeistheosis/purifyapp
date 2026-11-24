"use client";

/**
 * Home's Level 1 panel on made-up numbers, for the drawing he says yes or no
 * to (app/admin/level-preview). Rendered from the panel's own component,
 * never drawn by hand. Every figure is a sample, none of them his. The theme
 * handling is GoalsPreview's: checkMock's Light wears the panel's light, its
 * other palettes the panel's dark.
 */

import { useEffect } from "react";

import { levelOne } from "@/lib/admin/level";

import { LevelPanel } from "./LevelPanel";

const SAMPLE = levelOne({
  netPlusCents: 15283,
  costsCents: 36000,
  costsFrom: "lines",
  paid: 18,
  trials: 4,
  cancelling: 3,
  newWeek: 150,
  newPrevWeek: 180,
});

export function LevelPreview({ theme }: { theme: "dark" | "light" }) {
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
      <main className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-6" data-level-preview>
        <LevelPanel level={SAMPLE} onOpen={() => undefined} />
      </main>
    </div>
  );
}
