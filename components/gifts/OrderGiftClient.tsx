"use client";

// purifyapp.net/gift: where the QR on the EIKON thank-you card lands.
//
// The look is the owner's pick C of r3-39, "the card in your hand"
// (Homebase/boards/purify-master/variants/r3-39-order-gift.png, 2026-11-06):
// the card they just scanned lies in the light at the top, then the gift as a
// ticket with a torn line, then the lit pill, then what Plus opens. Built on
// the revamp's own material (globals.css, "The order gift").
//
// What it does. Every EIKON order comes with Purify Plus, one address for every
// card since the cards are printed in batches. A signed-in buyer whose order is
// marked delivered is given the gift as the page opens, no button to find; an
// order still on its way says so. Someone holding a parcel that was sent to
// them claims with the order number and ZIP from its label. A reader whose Plus
// or Pro is running is told the gift waits for when their plan ends: nothing is
// written for them (claim_order_gift, the owner's "so it doesn't conflict or
// like it doesn't add on"). Inside the app the same address opens this screen
// (lib/native/appLinks.ts).
//
// Ships into the native bundle: everything is fetched at runtime through
// apiFetch, which carries the Bearer token inside the app.

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { CURRENT_RELEASE } from "@/lib/appUpdate/release";
import { isNativeClient } from "@/lib/platform/native";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Codex } from "@/components/ui/icons/Codex";
import { CrossRefs } from "@/components/ui/icons/CrossRefs";
import { Headphones } from "@/components/ui/icons/Headphones";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Note } from "@/components/ui/icons/Note";
import { Rain } from "@/components/ui/icons/Rain";
import { Skeleton } from "@/components/ui/Skeleton";
import { Truck } from "@/components/ui/icons/Truck";
import { dateLocale } from "@/lib/i18n/deviceDates";
import {
  autoClaimPick,
  orderGiftMonths,
  type OrderGiftOrder,
  type OrderGiftResult,
  type OrderGiftState,
} from "@/lib/gifts/orderGift";
import { cn } from "@/lib/cn";

const PILL =
  "rule-pray tap-press flex min-h-12 w-full items-center justify-center gap-1.5 rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night disabled:opacity-60";

/** What Plus opens: the /plan page's own features, five of them. */
const FEATURES = [
  { Icon: CrossRefs, title: "orderGift.feat.crossrefs", desc: "orderGift.feat.crossrefsDesc" },
  { Icon: Codex, title: "orderGift.feat.wordstudy", desc: "orderGift.feat.wordstudyDesc" },
  { Icon: Rain, title: "orderGift.feat.ambience", desc: "orderGift.feat.ambienceDesc" },
  { Icon: Headphones, title: "orderGift.feat.offline", desc: "orderGift.feat.offlineDesc" },
  { Icon: Note, title: "orderGift.feat.sync", desc: "orderGift.feat.syncDesc" },
] as const;

type Claimed = { orderId: string | null; until: string | null };

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
          setClaimed({ orderId: body.orderId ?? null, until: data.plusUntil ?? null });
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

  const nowMonths = orderGiftMonths(new Date());

  // ── What the ticket says ────────────────────────────────────────────
  const orders = state && state.signedIn ? state.orders : [];
  const plus = state && state.signedIn ? state.plus : null;
  const byDate = [...orders].sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));
  const autoId = autoClaimPick(state);
  const focus: OrderGiftOrder | null = claimed?.orderId
    ? (orders.find((o) => o.id === claimed.orderId) ?? null)
    : (orders.find((o) => o.id === autoId) ??
      byDate.find((o) => !o.claimed && !o.delivered) ??
      byDate.find((o) => !o.claimed) ??
      byDate.find((o) => o.mine) ??
      null);
  const others = byDate.filter((o) => o.id !== focus?.id);

  let meta: string;
  let foot: ReactNode;
  let lit = false;
  let action: ReactNode = null;

  if (claimed) {
    lit = true;
    meta = focus
      ? t("orderGift.metaOrder", { duration: months(focus.months), number: focus.number })
      : t("orderGift.metaYours");
    foot = claimed.until ? (
      <div className="flex items-baseline justify-between gap-3 font-sans text-detail text-paper/70">
        <span>{t("orderGift.yoursUntil")}</span>
        <b className="font-serif text-[17px] font-semibold text-paper">{day(claimed.until)}</b>
      </div>
    ) : (
      <p className="font-sans text-detail text-paper/70">{t("orderGift.successBodyNoDate")}</p>
    );
    action = (
      <>
        <Link href="/" className={PILL}>
          {t("orderGift.open")}
        </Link>
        {/* Claimed in a phone's browser: Plus lives in the app, so offer it.
            Play only: the iPhone listing is not live yet. Rendered after a
            claim, never in the static shell, so reading the agent is safe. */}
        {!isNativeClient() && /Android/i.test(navigator.userAgent) ? (
          <a
            href={CURRENT_RELEASE.androidStoreUrl}
            className="mt-3 block text-center font-sans text-detail font-semibold text-paper/70 underline underline-offset-4"
          >
            {t("orderGift.getApp")}
          </a>
        ) : null}
      </>
    );
  } else if (!state || !state.signedIn) {
    meta = t("orderGift.metaEvery", { duration: months(nowMonths || 1) });
    foot = <p className="font-sans text-detail leading-[1.5] text-paper/70">{t("orderGift.signedOutBody")}</p>;
    if (state && !state.signedIn) {
      action = (
        <Link href="/signin?next=/gift" className={PILL}>
          {t("orderGift.signIn")}
        </Link>
      );
    }
  } else if (plus?.running) {
    meta = focus
      ? t("orderGift.metaOrder", { duration: months(focus.months), number: focus.number })
      : t("orderGift.metaEvery", { duration: months(nowMonths || 1) });
    foot = (
      <p className="font-sans text-detail leading-[1.5] text-paper/70">
        {plus.pro
          ? t("orderGift.proBody")
          : plus.until
            ? t("orderGift.hasPlusBody", { date: day(plus.until) })
            : t("orderGift.hasPlusBodyNoDate")}
      </p>
    );
    action = (
      <Link href="/" className={PILL}>
        {t("orderGift.open")}
      </Link>
    );
  } else if (focus) {
    meta = t("orderGift.metaOrder", { duration: months(focus.months), number: focus.number });
    if (focus.claimed) {
      foot = (
        <p className="font-sans text-detail leading-[1.5] text-paper/70">
          {focus.mine ? t("orderGift.claimedEarlier") : t("orderGift.errAlready")}
        </p>
      );
    } else if (!focus.delivered) {
      foot = <p className="font-sans text-detail leading-[1.5] text-paper/70">{t("orderGift.onItsWayBody")}</p>;
    } else {
      foot = (
        <p className="font-sans text-detail leading-[1.5] text-paper/70">
          {busy === focus.id ? t("orderGift.claiming") : t("orderGift.readyBody")}
        </p>
      );
      action = (
        <button
          type="button"
          className={PILL}
          disabled={busy !== null}
          onClick={() => void claim({ orderId: focus.id }, focus.id)}
        >
          {busy === focus.id ? t("orderGift.claiming") : t("orderGift.claim")}
        </button>
      );
    }
  } else {
    meta = t("orderGift.metaEvery", { duration: months(nowMonths || 1) });
    foot = <p className="font-sans text-detail leading-[1.5] text-paper/70">{t("orderGift.noneBody")}</p>;
  }

  const showForm = state?.signedIn === true && !plus?.running && !claimed && !focus;

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night pb-32">
      {/* The card from the parcel, in the light. The real print files. */}
      <div className="gift-stage under-topbar" aria-hidden>
        <div className="gift-light" />
        {/* eslint-disable-next-line @next/next/no-img-element -- a static export: next/image has no loader there */}
        <img className="gift-card gift-card-back" src="/eikon/gift-card-back.v1.webp" alt="" width={262} height={157} decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
        <img className="gift-card gift-card-front" src="/eikon/gift-card-front.v1.webp" alt="" width={262} height={157} decoding="async" />
      </div>

      <div className="relative mx-auto w-full max-w-md px-[18px]">
        <p className="gift-caption">{t("orderGift.caption")}</p>

        {/* The ticket. */}
        <div className="set-panel mt-4">
          <div>
            <div className="flex items-center gap-4 px-[18px] pb-4 pt-[18px]">
              <div className="min-w-0 flex-1">
                <p className="gift-eyebrow">{t("orderGift.eyebrow")}</p>
                <h1 id="gift-title" className="mt-[7px] font-serif text-[30px] font-bold leading-[1.05] text-paper">
                  {t("orderGift.title")}
                </h1>
                {state || loadError ? (
                  <p className="mt-1 font-sans text-detail leading-[1.45] text-paper/60">{meta}</p>
                ) : (
                  <Skeleton className="mt-2 h-4 w-48" />
                )}
              </div>
              {lit ? (
                <span className="gift-check" role="img" aria-label={t("orderGift.successTitle")}>
                  <Check size={19} strokeWidth={2.6} aria-hidden />
                </span>
              ) : null}
            </div>
            <div className="gift-perf" aria-hidden />
            <div className="px-[18px] pb-4 pt-3.5" role={claimed ? "status" : undefined}>
              {loadError && !state ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="font-sans text-detail text-paper/70">{t("orderGift.loadError")}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setLoadError(false);
                      void load();
                    }}
                    className="set-btn shrink-0"
                  >
                    {t("orderGift.retry")}
                  </button>
                </div>
              ) : state ? (
                foot
              ) : (
                <Skeleton className="h-4 w-56" />
              )}
            </div>
          </div>
        </div>

        {action ? <div className="mt-4">{action}</div> : null}

        {message ? (
          <p role="alert" className="mt-4 text-center font-sans text-ui text-paper/80">
            {message}
          </p>
        ) : null}

        {/* The reader's other orders, each with its own state. */}
        {others.length > 0 ? (
          <div className="mt-6">
            <p className="set-h">{t("orderGift.otherOrders")}</p>
            <div className="set-panel mt-2.5">
              {others.map((o) => (
                <div key={o.id} className="set-row">
                  <div className="set-lab">
                    <span className="set-plate">
                      {o.claimed ? <Check size={16} /> : !o.delivered ? <Truck size={16} /> : <Hourglass size={16} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="set-label">{t("orderGift.orderLine", { number: o.number })}</span>
                      <span className="set-desc">{t("orderGift.planLine", { duration: months(o.months) })}</span>
                    </span>
                    <span className="shrink-0 font-sans text-detail font-semibold text-paper/55">
                      {o.claimed
                        ? o.mine
                          ? t("orderGift.claimedYours")
                          : t("orderGift.claimedOther")
                        : !o.delivered
                          ? t("orderGift.onItsWay")
                          : t("orderGift.waiting")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* A parcel sent by someone else, or bought on another account. */}
        {showForm ? (
          <form onSubmit={claimByNumber} className="mt-6">
            <p className="set-h">{t("orderGift.otherTitle")}</p>
            <p className="set-hint">{t("orderGift.otherBody")}</p>
            <div className="set-panel mt-2.5 px-4 pb-4 pt-3.5">
              <div>
                <label className="block font-sans text-detail font-semibold text-paper/80">
                  {t("orderGift.numberLabel")}
                  <input
                    className="gift-field"
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
                    className="gift-field"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={20}
                  />
                </label>
                <button
                  type="submit"
                  className={cn(PILL, "mt-4")}
                  disabled={busy !== null || !number.trim() || !zip.trim()}
                >
                  {busy === "number" ? t("orderGift.claiming") : t("orderGift.claimWithNumber")}
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {/* What Plus opens, as Settings draws its rows. */}
        <div className="mt-7">
          <p className="set-h">{t("orderGift.featuresTitle")}</p>
          <div className="set-panel mt-2.5">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="set-row">
                <div className="set-lab">
                  <span className="set-plate">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="set-label">{t(title)}</span>
                    <span className="set-desc">{t(desc)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
