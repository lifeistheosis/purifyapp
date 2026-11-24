"use client";

/**
 * Members set to end on made-up members (app/admin/ending-preview), the note
 * open, for the drawing he says yes or no to. Every name and address a sample.
 */

import { useEffect } from "react";

import { SetToEnd } from "./SetToEnd";

const SAMPLE = [
  { userId: "a", name: "Maria Ionescu", email: "maria@example.com", source: "google", nextBilling: "2026-12-03T00:00:00Z", endReason: "UNSUBSCRIBE" },
  { userId: "b", name: null, email: "reader@example.com", source: "apple", nextBilling: "2026-12-09T00:00:00Z", endReason: null },
  { userId: "c", name: "Daniel Haddad", email: "daniel@example.com", source: "google", nextBilling: "2026-12-14T00:00:00Z", endReason: "BILLING_ERROR" },
];

export function SetToEndPreview({ theme }: { theme: "dark" | "light" }) {
  useEffect(() => {
    const h = document.documentElement;
    const wear = () => {
      const mode = h.getAttribute("data-reading-mode");
      h.setAttribute("data-adm-theme", mode === null ? theme : mode === "parchment" ? "light" : "dark");
    };
    wear();
    const watch = new MutationObserver(wear);
    watch.observe(h, { attributes: true, attributeFilter: ["data-reading-mode"] });
    document.querySelectorAll("[data-ending-preview] details").forEach((el) => el.setAttribute("open", ""));
    return () => watch.disconnect();
  }, [theme]);

  return (
    <div className="adm adm-page min-h-[100dvh]" style={{ background: "var(--adm-bg)", color: "var(--adm-ink)" }}>
      <main className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-6" data-ending-preview>
        <SetToEnd members={SAMPLE} />
      </main>
    </div>
  );
}
