"use client";

import { useState } from "react";

import { useAdminFetch } from "@/components/admin/adminFetch";
import { Disclosure } from "@/components/admin/primitives";
import { invalidateShopCatalog } from "@/lib/shop/catalogClient";
import type { BlessingConfig } from "@/lib/shop/blessing";

/**
 * The one blessing config, above the product list on /admin/shop.
 *
 * Folded by default: it is edited a few times a year and the list is what
 * the page is for. The summary line says the state in words (on, with the
 * parish; off; or waiting on the migration) so the fold does not hide it.
 *
 * What the storefront always says on its own, and this card cannot change,
 * is that the blessing is offered freely by the cooperating parish and any
 * charge is for handling (components/shop/BlessingNote.tsx). The copy here
 * goes above that sentence.
 */
type FormState = { enabled: boolean; parish: string; copy: string; handlingDollars: string };

const EMPTY_FORM: FormState = { enabled: false, parish: "", copy: "", handlingDollars: "0.00" };

function fromConfig(c: BlessingConfig): FormState {
  return {
    enabled: c.enabled,
    parish: c.parishName,
    copy: c.copyMd,
    handlingDollars: (c.handlingCents / 100).toFixed(2),
  };
}

export function BlessingConfigCard() {
  const { data, error, reload } = useAdminFetch<{ config: BlessingConfig; tableAbsent: boolean }>(
    "/api/admin/shop/blessing",
  );
  // The form is the loaded config until the owner types, then the draft.
  // Derived rather than copied in an effect, so there is no render where the
  // fields show the empty defaults over a config that has already arrived.
  const [draft, setDraft] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "good" | "critical"; text: string } | null>(null);
  const form: FormState = draft ?? (data ? fromConfig(data.config) : EMPTY_FORM);
  const { enabled, parish, copy, handlingDollars } = form;
  const patch = (p: Partial<FormState>) => setDraft({ ...form, ...p });

  const tableAbsent = data?.tableAbsent === true;
  const summary = !data
    ? "Loading"
    : tableAbsent
      ? "Needs the shop_simple migration"
      : data.config.enabled
        ? `On${data.config.parishName ? `, with ${data.config.parishName}` : ""}`
        : "Off";

  async function save() {
    setBusy(true);
    setNote(null);
    const handlingCents = Math.max(0, Math.round(Number(handlingDollars) * 100) || 0);
    try {
      const res = await fetch("/api/admin/shop/blessing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, parishName: parish, copyMd: copy, handlingCents }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && body.ok) {
        invalidateShopCatalog();
        setNote({ tone: "good", text: "Saved. Product pages pick it up within about half a minute." });
        reload();
      } else {
        setNote({ tone: "critical", text: body.error ?? `Save failed (${res.status}).` });
      }
    } catch {
      setNote({ tone: "critical", text: "Save failed: network dropped. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const controlCls =
    "w-full min-h-[44px] rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[14px] outline-none disabled:opacity-50";
  const controlStyle = {
    borderColor: "var(--adm-line-strong)",
    background: "var(--adm-control)",
    color: "var(--adm-ink)",
  };

  return (
    <Disclosure title="Blessing" hint={summary}>
      {error ? (
        <p role="alert" className="font-sans text-[13px]" style={{ color: "var(--adm-critical)" }}>
          {error}
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {tableAbsent ? (
            <p className="font-sans text-[13px]" style={{ color: "var(--adm-warn)" }}>
              The blessing config lives in a table that supabase/migrations/20260905_shop_simple.sql
              creates. Until it is applied, nothing here can be saved and no product offers a blessing.
            </p>
          ) : null}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={tableAbsent || !data}
            onClick={() => patch({ enabled: !enabled })}
            className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[var(--adm-radius-sm)] border px-3 py-2 text-left disabled:opacity-50"
            style={controlStyle}
          >
            <span className="font-sans text-[14px]" style={{ color: "var(--adm-ink)" }}>
              {enabled ? "Blessings offered" : "Blessings not offered"}
            </span>
            <span
              aria-hidden
              className="relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors"
              style={{ background: enabled ? "var(--adm-accent)" : "var(--adm-line-strong)" }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
              />
            </span>
          </button>
          <label className="block space-y-1.5">
            <span className="block font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
              Parish
            </span>
            <input
              value={parish}
              onChange={(e) => patch({ parish: e.target.value })}
              disabled={tableAbsent || !data}
              maxLength={200}
              className={controlCls}
              style={controlStyle}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="block font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
              Copy on the product page
            </span>
            <textarea
              value={copy}
              onChange={(e) => patch({ copy: e.target.value })}
              disabled={tableAbsent || !data}
              rows={4}
              maxLength={4000}
              className={controlCls}
              style={controlStyle}
            />
            <span className="block font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
              Plain text, a blank line per paragraph. The page adds, in its own words, that the blessing
              is offered freely and any charge is for handling.
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="block font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
              Handling (USD, once per order)
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={handlingDollars}
              onChange={(e) => patch({ handlingDollars: e.target.value })}
              disabled={tableAbsent || !data}
              className={controlCls + " sm:w-40"}
              style={controlStyle}
            />
            <span className="block font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
              Zero means no line at checkout.
            </span>
          </label>
          {note ? (
            <p
              role={note.tone === "critical" ? "alert" : "status"}
              className="font-sans text-[13px]"
              style={{ color: note.tone === "critical" ? "var(--adm-critical)" : "var(--adm-up)" }}
            >
              {note.text}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || tableAbsent || !data}
            className="adm-control inline-flex min-h-[44px] items-center rounded-[var(--adm-radius-pill)] px-5 font-sans text-[14px] font-semibold disabled:opacity-60"
            style={{
              ["--_bg" as string]: "var(--adm-accent)",
              ["--_bg-hover" as string]: "var(--adm-accent-dim)",
              color: "var(--adm-on-accent)",
            }}
          >
            {busy ? "Saving" : "Save blessing settings"}
          </button>
        </form>
      )}
    </Disclosure>
  );
}
