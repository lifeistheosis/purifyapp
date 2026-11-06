"use client";

// purifyapp.net/gift: where the QR on the EIKON thank-you card lands.
//
// Every EIKON order comes with Purify Plus. One address for every card, since
// the cards are printed in batches. A signed-in buyer whose order is marked
// delivered is given the gift as the page opens, no button to find; an order
// still on its way says so. Someone holding a parcel that was sent to them
// claims with the order number and ZIP from its label. A reader whose Plus or
// Pro is running is told the gift waits for when their plan ends: nothing is
// written for them (claim_order_gift, the owner's "so it doesn't conflict or
// like it doesn't add on", 2026-11-06). Inside the app the same address opens
// this screen (lib/native/appLinks.ts).
//
// Ships into the native bundle: everything is fetched at runtime through
// apiFetch, which carries the Bearer token inside the app.

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { CURRENT_RELEASE } from "@/lib/appUpdate/release";
import { isNativeClient } from "@/lib/platform/native";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PurifyMark } from "@/components/ui/PurifyMark";
import { Skeleton } from "@/components/ui/Skeleton";
import { dateLocale } from "@/lib/i18n/deviceDates";
import {
  autoClaimPick,
  type OrderGiftResult,
  type OrderGiftState,
} from "@/lib/gifts/orderGift";
import { cn } from "@/lib/cn";

const CARD = "rounded-2xl border border-paper/10 bg-paper/[0.03] p-5";
const BUTTON =
  "inline-flex items-center justify-center rounded-pill bg-paper px-5 py-2.5 font-sans text-detail font-semibold text-night transition-opacity disabled:opacity-50";
const FIELD =
  "mt-1.5 w-full rounded-xl border border-paper/15 bg-night px-3.5 py-2.5 font-sans text-ui text-paper placeholder:text-paper/30 focus:border-paper/40 focus:outline-none";

type Claimed = { until: string | null };

export function OrderGiftClient() {
  const { t, locale } = useTranslate();
  const [state, setState] = useState<OrderGiftState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Claimed | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [zip, setZip] = useState("");

  const day = useCallback(
    (iso: string | null | undefined) =>
      iso
        ? new Intl.DateTimeFormat(dateLocale(locale), {
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(new Date(iso))
        : "",
    [locale],
  );

  // "3 months" in the reader's own language, with its own plural rules (Russian
  // 3 месяца, 5 месяцев), from the platform: no plural family to translate.
  const months = useCallback(
    (n: number) =>
      new Intl.NumberFormat(dateLocale(locale), {
        style: "unit",
        unit: "month",
        unitDisplay: "long",
      }).format(n),
    [locale],
  );

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/gifts/order");
      if (!res.ok) throw new Error(String(res.status));
      setState((await res.json()) as OrderGiftState);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- every write
       in load() is past an await, so nothing lands synchronously here. */
    void load();
  }, [load]);

  const words = useCallback(
    (result: OrderGiftResult | "too_many" | "error"): string => {
      switch (result) {
        case "already":
          return t("orderGift.errAlready");
        case "not_delivered":
          return t("orderGift.errNotDelivered");
        case "not_paid":
          return t("orderGift.errNotPaid");
        case "not_eligible":
          return t("orderGift.errNotEligible");
        case "no_order":
          return t("orderGift.errNoOrder");
        case "too_many":
          return t("orderGift.errTooMany");
        default:
          return t("orderGift.errGeneric");
      }
    },
    [t],
  );

  const claim = useCallback(
    async (body: Record<string, string>, key: string) => {
      setBusy(key);
      setMessage(null);
      try {
        const res = await apiFetch("/api/gifts/order/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.status === 429) return setMessage(words("too_many"));
        if (res.status === 401) return void (await load());
        const data = (await res.json().catch(() => ({}))) as {
          result?: OrderGiftResult;
          plusUntil?: string | null;
        };
        if (!res.ok || !data.result) return setMessage(words("error"));
        if (data.result === "ok") {
          setClaimed({ until: data.plusUntil ?? null });
          return;
        }
        if (data.result === "has_plus") {
          // Plus started since the page loaded (another device, a purchase):
          // reload, and the page explains that the gift waits.
          await load();
          return;
        }
        setMessage(words(data.result));
        if (data.result === "already" || data.result === "not_delivered") await load();
      } catch {
        setMessage(words("error"));
      } finally {
        setBusy(null);
      }
    },
    [load, words],
  );

  // Signed in and arrived through the gift: the gift is given, no button to
  // find (the owner's "if they have the account signed in, then it gives them
  // the gift", 2026-11-06). Once per page load; a refusal shows its words.
  const autoTried = useRef(false);
  useEffect(() => {
    if (autoTried.current) return;
    const id = autoClaimPick(state);
    if (!id) return;
    autoTried.current = true;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the claim
       is the effect's whole point; it runs once, guarded by the ref. */
    void claim({ orderId: id }, id);
  }, [state, claim]);

  function claimByNumber(e: FormEvent) {
    e.preventDefault();
    if (!number.trim() || !zip.trim()) return;
    void claim({ orderNumber: number.trim(), zip: zip.trim() }, "number");
  }

  const head = (
    <header className="text-center">
      <PurifyMark size={30} className="mx-auto text-paper" />
      <p className="mt-4 font-sans text-caption font-semibold uppercase tracking-[0.2em] text-paper/55">
        {t("orderGift.eyebrow")}
      </p>
      <h1 className="mt-2 font-serif text-title text-paper">{t("orderGift.title")}</h1>
      <p className="mx-auto mt-3 max-w-sm font-sans text-ui leading-[1.6] text-paper/70">
        {t("orderGift.lead")}
      </p>
    </header>
  );

  // ── After a claim ───────────────────────────────────────────────────
  if (claimed) {
    return (
      <Shell>
        {head}
        <div className={cn(CARD, "mt-8 text-center")} role="status">
          <p className="font-serif text-title-sm text-paper">{t("orderGift.successTitle")}</p>
          <p className="mt-2 font-sans text-ui leading-[1.6] text-paper/70">
            {claimed.until
              ? t("orderGift.successBody", { date: day(claimed.until) })
              : t("orderGift.successBodyNoDate")}
          </p>
          <Link href="/" className={cn(BUTTON, "mt-5")}>
            {t("orderGift.open")}
          </Link>
          {/* Claimed in a phone's browser: Plus lives in the app, so offer it.
              Play only: the iPhone listing is not live yet. Rendered after a
              claim, never in the static shell, so reading the agent is safe. */}
          {!isNativeClient() && /Android/i.test(navigator.userAgent) && (
            <a
              href={CURRENT_RELEASE.androidStoreUrl}
              className="mt-3 block font-sans text-detail font-semibold text-paper/70 underline underline-offset-4"
            >
              {t("orderGift.getApp")}
            </a>
          )}
        </div>
      </Shell>
    );
  }

  if (!state && !loadError) {
    return (
      <Shell>
        {head}
        <div className="mt-8 space-y-3">
          <Skeleton className="h-28 w-full" rounded="rounded-2xl" />
          <Skeleton className="h-40 w-full" rounded="rounded-2xl" />
        </div>
      </Shell>
    );
  }

  if (loadError || !state) {
    return (
      <Shell>
        {head}
        <div className={cn(CARD, "mt-8")}>
          <p className="font-sans text-ui text-paper/70">{t("orderGift.loadError")}</p>
          <button
            type="button"
            onClick={() => {
              setLoadError(false);
              setState(null);
              void load();
            }}
            className="mt-3 rounded-pill border border-paper/20 px-4 py-2 font-sans text-detail font-semibold text-paper"
          >
            {t("orderGift.retry")}
          </button>
        </div>
      </Shell>
    );
  }

  // ── Signed out ──────────────────────────────────────────────────────
  if (!state.signedIn) {
    return (
      <Shell>
        {head}
        <div className={cn(CARD, "mt-8 text-center")}>
          <p className="font-sans text-ui leading-[1.6] text-paper/70">
            {t("orderGift.signedOutBody")}
          </p>
          <Link href="/signin?next=/gift" className={cn(BUTTON, "mt-5")}>
            {t("orderGift.signIn")}
          </Link>
        </div>
      </Shell>
    );
  }

  const { plus, orders } = state;
  const waiting = orders.filter((o) => !o.claimed);
  const mine = orders.filter((o) => o.claimed && o.mine);

  return (
    <Shell>
      {head}

      {/* Plus or Pro already running: nothing to claim today. */}
      {plus.running && (
        <div className={cn(CARD, "mt-8")}>
          <p className="font-serif text-title-sm text-paper">
            {plus.pro ? t("orderGift.proTitle") : t("orderGift.hasPlusTitle")}
          </p>
          <p className="mt-2 font-sans text-ui leading-[1.6] text-paper/70">
            {plus.pro
              ? t("orderGift.proBody")
              : plus.until
                ? t("orderGift.hasPlusBody", { date: day(plus.until) })
                : t("orderGift.hasPlusBodyNoDate")}
          </p>
        </div>
      )}

      {/* The reader's own orders. */}
      {orders.length > 0 && (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => (
            <li key={o.id} className={cn(CARD, "flex items-center gap-4")}>
              <div className="min-w-0 flex-1">
                <p className="font-sans text-caption font-semibold tracking-[0.06em] text-paper/55">
                  {t("orderGift.orderLine", { number: o.number })}
                </p>
                <p className="mt-1 font-serif text-body text-paper">
                  {t("orderGift.planLine", { duration: months(o.months) })}
                </p>
              </div>
              {o.claimed ? (
                <span className="shrink-0 font-sans text-detail font-semibold text-paper/55">
                  {o.mine ? t("orderGift.claimedYours") : t("orderGift.claimedOther")}
                </span>
              ) : plus.running ? (
                <span className="shrink-0 font-sans text-detail font-semibold text-paper/55">
                  {t("orderGift.waiting")}
                </span>
              ) : !o.delivered ? (
                <span className="shrink-0 font-sans text-detail font-semibold text-paper/55">
                  {t("orderGift.onItsWay")}
                </span>
              ) : (
                <button
                  type="button"
                  className={cn(BUTTON, "shrink-0")}
                  disabled={busy !== null}
                  onClick={() => void claim({ orderId: o.id }, o.id)}
                >
                  {busy === o.id ? t("orderGift.claiming") : t("orderGift.claim")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!plus.running && orders.some((o) => !o.claimed && !o.delivered) && (
        <p className="mt-3 px-1 font-sans text-detail leading-[1.55] text-paper/60">
          {t("orderGift.onItsWayBody")}
        </p>
      )}

      {!plus.running && orders.length === 0 && (
        <div className={cn(CARD, "mt-8")}>
          <p className="font-serif text-title-sm text-paper">{t("orderGift.noneTitle")}</p>
          <p className="mt-2 font-sans text-ui leading-[1.6] text-paper/70">
            {t("orderGift.noneBody")}
          </p>
        </div>
      )}

      {message && (
        <p role="alert" className="mt-4 text-center font-sans text-ui text-paper/80">
          {message}
        </p>
      )}

      {/* A parcel sent by someone else, or bought on another account. */}
      {!plus.running && (waiting.length === 0 || mine.length > 0 || orders.length === 0) && (
        <form onSubmit={claimByNumber} className={cn(CARD, "mt-6")}>
          <p className="font-serif text-body text-paper">{t("orderGift.otherTitle")}</p>
          <p className="mt-1.5 font-sans text-detail leading-[1.55] text-paper/60">
            {t("orderGift.otherBody")}
          </p>
          <label className="mt-4 block font-sans text-detail font-semibold text-paper/80">
            {t("orderGift.numberLabel")}
            <input
              className={FIELD}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="EIK-72D8D24B"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={40}
            />
          </label>
          <label className="mt-3 block font-sans text-detail font-semibold text-paper/80">
            {t("orderGift.zipLabel")}
            <input
              className={FIELD}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={20}
            />
          </label>
          <button
            type="submit"
            className={cn(BUTTON, "mt-5 w-full")}
            disabled={busy !== null || !number.trim() || !zip.trim()}
          >
            {busy === "number" ? t("orderGift.claiming") : t("orderGift.claimWithNumber")}
          </button>
        </form>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 pb-28 pt-10 md:px-8 md:pt-16">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </section>
  );
}
