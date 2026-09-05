"use client";

import { useState } from "react";

import { invalidateShopCatalog } from "@/lib/shop/catalogClient";

/**
 * The inline Visible switch on /admin/shop.
 *
 * Maps to `status = published | draft` and nothing else: PATCH on
 * /api/admin/shop/products writes the one column. Optimistic, so the switch
 * moves under the thumb, and it moves back with the server's sentence when
 * the write fails. Paused and archived are reachable from the edit page's
 * "More" section; here they read as off, and switching one on publishes it,
 * which is what "visible" means.
 *
 * A real <button role="switch"> rather than a checkbox: 44px tall, the whole
 * pill is the target, and the state is announced as on/off.
 */
export function VisibleToggle({
  id,
  status,
  name,
  onChanged,
  onError,
}: {
  id: string;
  status: string;
  name: string;
  onChanged: (status: "published" | "draft") => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const on = status === "published";

  async function flip() {
    if (busy) return;
    const next = on ? "draft" : "published";
    const previous = status;
    setBusy(true);
    onChanged(next);
    try {
      const res = await fetch("/api/admin/shop/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        invalidateShopCatalog();
      } else {
        onChanged(previous === "published" ? "published" : "draft");
        onError(data.error ?? `Could not change visibility (${res.status}).`);
      }
    } catch {
      onChanged(previous === "published" ? "published" : "draft");
      onError("Could not change visibility: network dropped. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${name}: ${on ? "visible in the shop" : "hidden from the shop"}`}
      onClick={() => void flip()}
      disabled={busy}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--adm-radius-pill)] px-1 disabled:opacity-60"
    >
      <span
        aria-hidden
        className="relative inline-block h-6 w-11 rounded-full transition-colors"
        style={{
          background: on ? "var(--adm-good)" : "var(--adm-line-strong)",
        }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: on ? "translateX(22px)" : "translateX(2px)" }}
        />
      </span>
      <span className="font-sans text-[12px]" style={{ color: on ? "var(--adm-ink)" : "var(--adm-ink-3)" }}>
        {on ? "Visible" : "Hidden"}
      </span>
    </button>
  );
}
