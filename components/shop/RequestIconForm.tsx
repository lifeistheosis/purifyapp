"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Switch, Track } from "@/components/settings/LitPanel";
import { RequestIcon } from "@/components/shop/RequestIcon";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { Pen } from "@/components/ui/icons/Pen";
import { Search } from "@/components/ui/icons/Search";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { BUDGET_BAND_LABELS } from "@/lib/shop/format";
import { findSaints, saintByName, type RequestSaint } from "@/lib/shop/requestSaint";
import type { ShopBudgetBand, ShopIconRequest } from "@/lib/shop/types";

const field =
  "w-full rounded-[14px] shop-well px-3.5 py-3 font-sans text-ui text-paper placeholder:text-paper/55 focus:outline-none focus:ring-1 focus:ring-paper/40";
const labelCls = "font-sans text-[13px] font-semibold text-paper/60";

type Kind = ShopIconRequest["request_type"];
const KINDS: { id: Kind; key: string }[] = [
  { id: "either", key: "shop.either" },
  { id: "ready_made", key: "shop.readyMade" },
  { id: "custom", key: "shop.customWork" },
];

/** The budgets with words, in the reader's language; the figures read the same everywhere. */
const BUDGET_KEY: Partial<Record<ShopBudgetBand, string>> = {
  under_50: "shop.priceBand.under_50",
  unsure: "shop.budgetUnsure",
};

/** What the reader has asked for: one of the library's saints, or a subject in their own words. */
type Chosen = { subject: string; saint: RequestSaint | null };

/**
 * Request an icon, Requests A, "The saint's icon" (r3-19, the owner's pick of
 * 2026-10-31). Demand collection for manual follow-up: no auction, no public
 * board, just "tell us who you're praying with".
 *
 * One field finds the saint among the app's saints as the reader types, each
 * with his icon where its rights are settled (lib/shop/requestSaint.ts, the
 * library's saints in brief, never the registry), or takes the subject as
 * written; the chosen saint's icon comes into the top. Ready-made or custom
 * is a carved control (Settings' own track); the size, kind, budget, a date
 * and notes fold under More details; the email switch is white. Build 85 had
 * eight fields on one long page, three of them the phone's own pickers, and
 * a checkbox in the old gold.
 *
 * The client sends what was asked and nothing else; the server writes it.
 */
export function RequestIconForm({
  signedIn,
  defaultSubject = "",
  defaultNotify = false,
  onSent,
}: {
  signedIn: boolean;
  defaultSubject?: string;
  defaultNotify?: boolean;
  /** Told when a request went, so a list beside the form can show it. */
  onSent?: () => void;
}) {
  const { t } = useTranslate();
  const listId = useId();
  const moreId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [chosen, setChosen] = useState<Chosen | null>(() =>
    defaultSubject.trim() ? { subject: defaultSubject.trim(), saint: saintByName(defaultSubject) } : null,
  );
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [kind, setKind] = useState<Kind>("either");
  const [more, setMore] = useState(false);
  const [notify, setNotify] = useState(defaultNotify);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const typed = query.trim();
  const saints = useMemo(() => findSaints(typed), [typed]);
  // The saints found, then the subject as written: what the list offers.
  const options: Chosen[] = typed.length >= 2 ? [...saints.map((s) => ({ subject: s.name, saint: s })), { subject: typed, saint: null }] : [];
  const open = !chosen && options.length > 0;
  const subject = chosen?.subject ?? typed;

  function choose(c: Chosen) {
    // Typed out in full, a saint's name is still that saint.
    setChosen(c.saint ? c : { subject: c.subject, saint: saintByName(c.subject) });
    setQuery("");
    setActive(0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(options[Math.min(active, options.length - 1)]);
    } else if (e.key === "Escape") {
      setQuery("");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (subject.length < 2) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim() || null;
    const payload = {
      subject,
      saintSlug: (chosen?.saint ?? saintByName(subject))?.slug ?? null,
      requestType: kind,
      preferredSize: text("preferredSize"),
      productPreference: text("productPreference"),
      budgetBand: text("budgetBand"),
      desiredDate: text("desiredDate"),
      notes: text("notes"),
      email: text("email"),
      notify,
    };
    setState("busy");
    try {
      const res = await apiFetch("/api/shop/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setState("done");
        onSent?.();
        return;
      }
      setError(data.error ?? t("together.failed"));
      setState("idle");
    } catch {
      setError(t("together.failed"));
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="shop-raise rounded-[20px] p-6">
        <p className="font-heading text-[22px] font-semibold text-paper">{t("shop.yourRequestIsWithUs")}</p>
        <p className="mt-3 font-serif text-body leading-[1.65] text-paper/70">{t("shop.weReadEveryRequestAnd")}</p>
        <Link href="/shop" className="mt-5 inline-flex min-h-11 items-center font-sans text-detail font-medium text-paper">
          {t("shop.backToTheShopX")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {chosen ? (
        <div className="shop-raise shop-arrive flex items-center gap-3.5 rounded-[20px] p-3.5" data-chosen>
          <RequestIcon src={chosen.saint?.icon ?? null} width={66} height={88} className="rounded-[10px]" />
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[11.5px] text-paper/60">{t("shop.saintOrSubject")}</p>
            <p className="mt-0.5 font-heading text-[19px] font-semibold leading-[1.25] text-paper">{chosen.subject}</p>
            {chosen.saint?.line ? <p className="mt-0.5 font-sans text-[12.5px] text-paper/60">{chosen.saint.line}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setQuery(chosen.subject);
              setChosen(null);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="tap-press inline-flex min-h-11 shrink-0 items-center px-1 font-sans text-[12.5px] font-semibold text-paper/80 hover:text-paper"
          >
            {t("shop.requestChange")}
          </button>
        </div>
      ) : (
        <div>
          <label htmlFor={`${listId}-field`} className="sr-only">
            {t("shop.saintOrSubject")}
          </label>
          <div className="shop-well flex items-center gap-2.5 rounded-[14px] px-3.5">
            <Search size={18} className="shrink-0 text-paper/50" />
            <input
              ref={inputRef}
              id={`${listId}-field`}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={open ? `${listId}-${Math.min(active, options.length - 1)}` : undefined}
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              maxLength={200}
              placeholder={t("shop.stMosesTheBlackChrist")}
              className="min-h-12 w-full min-w-0 bg-transparent py-3 font-sans text-ui text-paper placeholder:text-paper/55 focus:outline-none"
            />
          </div>
          {open ? (
            <ul id={listId} role="listbox" aria-label={t("shop.saintOrSubject")} className="shop-raise mt-2 divide-y divide-paper/[0.09] overflow-hidden rounded-[18px]">
              {options.map((o, i) => (
                // The row is the option; the keys belong to the field, where focus stays.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={o.saint ? o.saint.slug : "as-written"}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerMove={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={cn("flex min-h-[64px] cursor-pointer items-center gap-3 px-3.5 py-2.5", i === active && "bg-paper/[0.05]")}
                >
                  {o.saint ? (
                    <RequestIcon src={o.saint.icon} width={36} height={48} className="rounded-[7px]" />
                  ) : (
                    <span aria-hidden className="shop-well grid h-12 w-9 shrink-0 place-items-center rounded-[7px] text-paper/60">
                      <Pen size={16} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-[15px] font-semibold text-paper">
                      {o.saint ? o.saint.name : t("shop.requestAskAsWritten", { text: o.subject })}
                    </span>
                    <span className="block truncate font-sans text-caption text-paper/60">
                      {o.saint ? o.saint.line : t("shop.requestAnySubject")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <div className="mt-[18px]">
        <p aria-hidden className={labelCls}>
          {t("shop.readyMadeOrCustom")}
        </p>
        <Track
          label={t("shop.readyMadeOrCustom")}
          value={kind}
          onChange={setKind}
          options={KINDS.map((k) => ({ value: k.id, label: t(k.key) }))}
        />
      </div>

      {!signedIn ? (
        <label className="mt-4 block space-y-1.5">
          <span className={labelCls}>{t("shop.email")}</span>
          <input name="email" type="email" required maxLength={320} placeholder={t("shop.youExampleCom")} className={field} />
        </label>
      ) : null}

      <div className="shop-raise mt-4 overflow-hidden rounded-[18px]">
        <button
          type="button"
          aria-expanded={more}
          aria-controls={moreId}
          onClick={() => setMore((m) => !m)}
          className="flex min-h-[56px] w-full items-center gap-3 px-3.5 py-3 text-start"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-[14.5px] font-semibold text-paper">{t("shop.requestMoreDetails")}</span>
            <span className="block font-sans text-caption text-paper/60">{t("shop.requestMoreDetailsLine")}</span>
          </span>
          <ChevronDown size={18} className={cn("shrink-0 text-paper/50", more && "rotate-180")} />
        </button>
        {/* Folded, not gone: what was written under it is still sent. */}
        <div id={moreId} hidden={!more} className="space-y-4 border-t border-paper/[0.09] px-3.5 pb-4 pt-3.5">
          <label className="block space-y-1.5">
            <span className={labelCls}>{t("shop.preferredSize")}</span>
            <input name="preferredSize" maxLength={100} placeholder='e.g. around 6&times;8"' className={field} />
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>{t("shop.preferredProductType")}</span>
            <input name="productPreference" maxLength={200} placeholder={t("shop.woodenIconPrintLaminated")} className={field} />
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>{t("shop.budget")}</span>
            <select name="budgetBand" defaultValue="" className={field}>
              <option value="">{t("shop.preferNotToSay")}</option>
              {(Object.keys(BUDGET_BAND_LABELS) as ShopBudgetBand[]).map((band) => (
                <option key={band} value={band}>
                  {BUDGET_KEY[band] ? t(BUDGET_KEY[band]!) : BUDGET_BAND_LABELS[band]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>{t("shop.neededByOptional")}</span>
            <input name="desiredDate" type="date" className={field} />
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>{t("saints.notes")}</span>
            <textarea name="notes" rows={4} maxLength={2000} placeholder={t("shop.anythingThatHelpsTheOccasion")} className={field} />
          </label>
        </div>
        <div className="flex items-center gap-3 border-t border-paper/[0.09] px-3.5 py-3">
          <span aria-hidden className="min-w-0 flex-1 font-sans text-ui leading-snug text-paper/90">
            {t("shop.emailMeIfThisIcon")}
          </span>
          {/* White when on, never the old gold checkbox (Settings' own switch). */}
          <Switch on={notify} onChange={setNotify} label={t("shop.emailMeIfThisIcon")} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "busy" || subject.length < 2}
        className="shop-btn-lit tap-press mt-[18px] inline-flex min-h-[52px] w-full items-center justify-center rounded-pill px-8 font-sans text-[15px] font-semibold disabled:opacity-60"
      >
        {state === "busy" ? t("clergy.sending") : t("clergy.send")}
      </button>
      <p className="mt-2.5 font-sans text-caption text-paper/60">{t("shop.requestsGoToThePurify")}</p>
    </form>
  );
}
