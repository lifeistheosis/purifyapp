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
// order still on its way says so, and the page looks again whenever it comes
// back into view. Someone holding a parcel that was sent to them claims with
// the order number and ZIP from its label. A reader whose Plus or Pro is
// running is told the gift waits for when their plan ends: nothing is written
// for them (claim_order_gift, the owner's "so it doesn't conflict or like it
// doesn't add on"). Inside the app the same address opens this screen
// (lib/native/appLinks.ts).
//
// The claim is a moment (the owner, 2026-11-06: "add a claim animation. make
// this whole thing a nice experience from beginning to end"). While the claim
// is answered the card is held up to the light (data-gift="opening", never
// shorter than OPENING_MS); when it is given the page plays its reveal once
// (data-gift="reveal"): light pours from behind the card, his pick A of the
// three drawn (Homebase/boards/purify-master/variants/r3-40-*). The phone
// gives its one soft tick as the check lands, and then the page rests in its
// lit look (data-gift="lit"), which is also how a reader who comes back finds
// it. All CSS keyed off that attribute (globals.css, "The order gift"); under
// data-motion="reduce" a plain cross-fade.
//
// After it: the way into the app for a phone's browser (the gift is on the
// account, so the app has it once they sign in there), Today inside the app,
// and every row of what Plus opens becomes a way straight to it.
//
// Ships into the native bundle: everything is fetched at runtime through
// apiFetch, which carries the Bearer token inside the app.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { emitEntitlementsChanged } from "@/lib/entitlements/refresh";
import { STORE_LINKS } from "@/lib/marketing/storeRatings";
import { useMobileStore } from "@/lib/platform/mobileWeb";
import { isNativeClient } from "@/lib/platform/native";
import { createClient } from "@/lib/supabase/client";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { prefersReducedMotion, scrollBehavior } from "@/lib/ui/motion";
import { softTick } from "@/lib/ui/softTick";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
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
  giftFocus,
  orderGiftMonths,
  type OrderGiftOrder,
  type OrderGiftResult,
  type OrderGiftState,
} from "@/lib/gifts/orderGift";
import { cn } from "@/lib/cn";
import { movePage } from "@/lib/ui/inPageMove";

const PILL =
  "rule-pray tap-press flex min-h-12 w-full items-center justify-center gap-1.5 rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night disabled:opacity-60";

/**
 * What Plus opens: the /plan page's own features, five of them. Once the gift
 * is theirs each row is a way straight to it, as the Plus sheet's "What is
 * yours now" (components/billing/UpgradeModal.tsx, the same addresses).
 */
const FEATURES = [
  { Icon: CrossRefs, title: "orderGift.feat.crossrefs", desc: "orderGift.feat.crossrefsDesc", href: "/bible/john/1" },
  { Icon: Codex, title: "orderGift.feat.wordstudy", desc: "orderGift.feat.wordstudyDesc", href: "/bible/genesis/1" },
  { Icon: Rain, title: "orderGift.feat.ambience", desc: "orderGift.feat.ambienceDesc", href: "/bible/john/1" },
  { Icon: Headphones, title: "orderGift.feat.offline", desc: "orderGift.feat.offlineDesc", href: "/bible/john/1" },
  { Icon: Note, title: "orderGift.feat.sync", desc: "orderGift.feat.syncDesc", href: "/saved" },
] as const;

/** The card held up to the light while the claim is answered: never shorter,
 *  so the moment has its beat even on a fast connection. */
const OPENING_MS = 650;
/** From the reveal to the check landing (.gift-check in globals.css), when the
 *  phone gives its one soft tick. */
const CHECK_LANDS_MS = 1000;
/** The whole reveal. After it nothing animates and the page rests lit. */
const REVEAL_MS = 2400;

type Claimed = { orderId: string | null; until: string | null };

/** A reader with no session on the device: the same answer the route gives (app/api/gifts/order/route.ts). */
const SIGNED_OUT: OrderGiftState = { signedIn: false };
const noSubscribe = () => () => {};

export function OrderGiftClient() {
  const { t, locale } = useTranslate();
  const store = useMobileStore();
  const [read, setState] = useState<OrderGiftState | null>(null);
  const [readFailed, setLoadError] = useState(false);
  // On the device with no session kept on it, the reader is signed out, and the
  // ticket says so from its first frame, in the page's own picture: a signed-out
  // reader's answer is this same ticket, and a read that fails (no signal, or
  // the main web before this route reached it) leaves it standing instead of
  // giving way to "Try again" under the reader's eyes (Gate 2.0 cause 3: the
  // ticket's height changed by 45 to 52px after the page had arrived). Known in
  // the render, never set from an effect (docs/handoffs/updates-18.md). The read
  // still runs, and its answer stands once it comes; a session that arrives
  // (the listener below) reads the gift again.
  const onDevice = useSyncExternalStore(noSubscribe, () => true, () => false);
  const state: OrderGiftState | null = read ?? (onDevice && !readLocalSessionUser() ? SIGNED_OUT : null);
  const loadError = readFailed && !state;
  const [busy, setBusy] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Claimed | null>(null);
  const [revealing, setRevealing] = useState(false);
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

  // The ticket's foot: what the read's answer changes there moves as a change
  // inside the page (lib/ui/inPageMove.ts). Try again leaves the line standing
  // while the gift is read again, busy, where it gave way to a waiting line
  // and back, and what is below jumped 52px (Gate 2.0, run-tip 384).
  const footRef = useRef<HTMLDivElement>(null);
  const [retrying, setRetrying] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/gifts/order");
      if (!res.ok) throw new Error(String(res.status));
      const answer = (await res.json()) as OrderGiftState;
      movePage(
        () => {
          setState(answer);
          setLoadError(false);
          setRetrying(false);
        },
        { grows: [footRef.current] },
      );
    } catch {
      movePage(
        () => {
          setLoadError(true);
          setRetrying(false);
        },
        { grows: [footRef.current] },
      );
    }
  }, []);

  useEffect(() => {
    // Every write in load() is past an await, so nothing lands synchronously here.
    void load();
  }, [load]);

  // Signed in or out while the page is open (the app's own sign-in, another
  // tab, the welcome questions' account step): read the gift again, and a
  // reader who has just signed in is given it. Only a timer in the callback:
  // an auth call made from inside it never returns (lib/profile/myPicture.ts),
  // and load() asks for the session.
  useEffect(() => {
    let timer = 0;
    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 0);
    });
    return () => {
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
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
      const started = Date.now();
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
          // The card stays up to the light for its beat before the reveal.
          const held = prefersReducedMotion() ? 0 : OPENING_MS - (Date.now() - started);
          if (held > 0) await new Promise((done) => window.setTimeout(done, held));
          setClaimed({ orderId: body.orderId ?? null, until: data.plusUntil ?? null });
          setRevealing(true);
          // Every screen that holds an answer about Plus asks again, so the
          // first row tapped below opens the feature, not the paywall.
          emitEntitlementsChanged();
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

  // The reveal plays once: the soft tick as the check lands, then the page
  // rests in its lit look, which is where every reveal ends anyway.
  useEffect(() => {
    if (!revealing) return;
    const tick = window.setTimeout(softTick, prefersReducedMotion() ? 0 : CHECK_LANDS_MS);
    const rest = window.setTimeout(() => setRevealing(false), REVEAL_MS);
    return () => {
      window.clearTimeout(tick);
      window.clearTimeout(rest);
    };
  }, [revealing]);

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
    // The form sits below the ticket; the moment happens up top.
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    void claim({ orderNumber: number.trim(), zip: zip.trim() }, "number");
  }

  const nowMonths = orderGiftMonths(new Date());
  const native = isNativeClient();

  // ── What the ticket says ────────────────────────────────────────────
  const orders = state && state.signedIn ? state.orders : [];
  const plus = state && state.signedIn ? state.plus : null;
  const byDate = [...orders].sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));
  const autoId = autoClaimPick(state);
  const focus: OrderGiftOrder | null = giftFocus(orders, autoId, claimed?.orderId);
  const others = byDate.filter((o) => o.id !== focus?.id);

  // Back after claiming: Plus is running because of this gift, and the page
  // shows it as theirs rather than telling them a gift waits. Only when no
  // other gift is outstanding, which is when the claimed order is the focus.
  const keptMine =
    !claimed && !!plus && plus.running && !plus.pro && !!focus && focus.claimed && focus.mine;
  const lit = !!claimed || keptMine;
  const until = claimed ? claimed.until : keptMine ? (plus?.until ?? null) : null;
  // Being opened: a claim on its way, or one about to start on arrival (the
  // render before the effect fires), so the Claim button never flashes up.
  const opening = busy !== null || (!!autoId && !claimed && !message);

  // Still on its way: look again whenever the page comes back into view, so a
  // reader who leaves it open finds the gift ready once it shows delivered.
  const waiting = !!focus && !focus.delivered && !focus.claimed && !plus?.running;
  useEffect(() => {
    if (!waiting) return;
    const onShow = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [waiting, load]);

  const homeLink = (
    <Link href="/" className={PILL}>
      {native ? t("orderGift.toToday") : t("orderGift.open")}
    </Link>
  );
  // The way on once the gift is theirs. A phone's browser: Plus lives best in
  // the app, and it is on the account, so the app has it the moment they sign
  // in there. Inside the app: Today. Rendered only once the state is read,
  // never in the static shell, so reading the device is safe here.
  const wayOn = (
    <>
      {store ? (
        <a href={STORE_LINKS[store]} target="_blank" rel="noopener noreferrer" className={PILL}>
          {store === "appStore" ? t("orderGift.getAppApple") : t("orderGift.getApp")}
        </a>
      ) : (
        homeLink
      )}
      {native ? null : <p className="gift-hint text-paper/55">{t("orderGift.appHint")}</p>}
    </>
  );

  let meta: string;
  let foot: ReactNode;
  let action: ReactNode = null;

  if (lit) {
    meta = focus
      ? t("orderGift.metaOrder", { duration: months(focus.months), number: focus.number })
      : t("orderGift.metaYours");
    foot = until ? (
      <div className="flex items-baseline justify-between gap-3 font-sans text-detail text-paper/70">
        <span>{t("orderGift.yoursUntil")}</span>
        <b className="font-serif text-[17px] font-semibold text-paper">{day(until)}</b>
      </div>
    ) : (
      <p className="font-sans text-detail text-paper/70">{t("orderGift.successBodyNoDate")}</p>
    );
    action = wayOn;
  } else if (!state || !state.signedIn) {
    meta = t("orderGift.metaEvery", { duration: months(nowMonths || 1) });
    foot = <p className="font-sans text-detail leading-[1.5] text-paper/70">{t("orderGift.signedOutBody")}</p>;
    if (state && !state.signedIn) {
      action = (
        <Link href="/signin?next=/gift" className={PILL}>
          {t("orderGift.signIn")}
        </Link>
      );
    } else if (!state && !loadError) {
      // Still reading: most answers bring a pill, so its place is held and
      // the page does not shift under the reader when the answer lands.
      action = <div className="invisible min-h-12" aria-hidden />;
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
    action = homeLink;
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
          {opening ? t("orderGift.opening") : t("orderGift.readyBody")}
        </p>
      );
      // Given on arrival, so the button is only for a claim that did not go
      // through. While one is being answered the ticket says so, and the way
      // on holds its place unseen, so nothing below moves when it arrives.
      action = opening ? (
        <div className="invisible" aria-hidden>
          {wayOn}
        </div>
      ) : (
        <button type="button" className={PILL} onClick={() => void claim({ orderId: focus.id }, focus.id)}>
          {t("orderGift.claim")}
        </button>
      );
    }
  } else {
    meta = t("orderGift.metaEvery", { duration: months(nowMonths || 1) });
    foot = (
      <p className="font-sans text-detail leading-[1.5] text-paper/70">
        {busy === "number" ? t("orderGift.opening") : t("orderGift.noneBody")}
      </p>
    );
  }

  // The present's form, for a parcel someone else sent, below the reader's own
  // orders: a buyer may be sent one too (the gate's final run of 2026-11-12,
  // the arbiter's word). Not while a plan runs: a claim then writes nothing
  // (claim_order_gift, "has_plus").
  const showForm = state?.signedIn === true && !plus?.running && !lit;
  const look = revealing ? "reveal" : lit ? "lit" : opening ? "opening" : undefined;

  return (
    <section data-gift={look} className="gift-page min-h-[calc(100dvh-72px)] bg-night pb-32">
      {/* The card from the parcel, in the light. The real print files. The
          glow stays on once the gift is theirs; the burst is the reveal's
          soft pool of light from behind the card (no rays: CLAUDE.md). */}
      <div className="gift-stage under-topbar" aria-hidden>
        <div className="gift-lights">
          <div className="gift-light" />
          <div className="gift-glow" />
          <div className="gift-burst" />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static export: next/image has no loader there */}
        <img className="gift-card gift-card-back" src="/eikon/gift-card-back.v1.webp" alt="" width={262} height={157} decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
        <img className="gift-card gift-card-front" src="/eikon/gift-card-front.v1.webp" alt="" width={262} height={157} decoding="async" />
      </div>

      <div className="relative mx-auto w-full max-w-md px-[18px]">
        <p id="gift-caption" className="gift-caption text-paper/62">{t("orderGift.caption")}</p>

        {/* The ticket: the gift above its torn line, the stub below. */}
        <div className="set-panel mt-4">
          <div>
            <div className="flex items-center gap-4 px-[18px] pb-4 pt-[18px]">
              <div className="min-w-0 flex-1">
                <p className="gift-eyebrow text-paper/62">{t("orderGift.eyebrow")}</p>
                <h1 id="gift-title" className="gift-title mt-[7px] font-serif text-[30px] font-bold leading-[1.05] text-paper">
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
                  {/* Draws itself as the reveal lands (check-draw's keyframes). */}
                  <Check size={19} strokeWidth={2.6} className="gift-check-mark" />
                </span>
              ) : null}
            </div>
            <div className="gift-perf" aria-hidden />
            <div className="relative px-[18px] pb-4 pt-3.5" role="status">
              {/* What the stub said while the gift was being opened, leaving
                  as the reveal begins. */}
              {revealing ? (
                <p className="gift-foot-was font-sans text-detail leading-[1.5] text-paper/70" aria-hidden>
                  {t("orderGift.opening")}
                </p>
              ) : null}
              <div ref={footRef} className="gift-foot-now">
                {loadError && !state ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-sans text-detail text-paper/70">{t("orderGift.loadError")}</p>
                    <button
                      type="button"
                      disabled={retrying}
                      aria-busy={retrying || undefined}
                      onClick={() => {
                        setRetrying(true);
                        void load();
                      }}
                      className="set-btn shrink-0"
                      // 44 to a finger: .set-btn is 36 tall, and is written after the utilities' layer, so a min-h class would lose to it.
                      style={{ minHeight: 44 }}
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
        </div>

        {action ? <div className="gift-after mt-4">{action}</div> : null}

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
              {others.map((o) => {
                const Plate = o.claimed ? Check : !o.delivered ? Truck : Hourglass;
                return (
                <div key={o.id} className="set-row">
                  <div className="set-lab">
                    <span className="set-plate">
                      <Plate size={16} />
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
                );
              })}
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
                    placeholder={t("orderGift.numberPlaceholder")}
                    dir="auto"
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
                    dir="auto"
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

        {/* What Plus opens, as Settings draws its rows; once it is theirs,
            what is theirs now, each row a way straight to it. */}
        <div className="gift-feats mt-7">
          <p className="set-h">{lit ? t("plus.active.unlocked") : t("orderGift.featuresTitle")}</p>
          <div className="set-panel mt-2.5">
            {FEATURES.map(({ Icon, title, desc, href }, i) => {
              const inner = (
                <div className="set-lab">
                  <span className="set-plate">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="set-label">{t(title)}</span>
                    <span className="set-desc">{t(desc)}</span>
                  </span>
                  {lit ? <ChevronRight size={15} className="set-chev rtl:-scale-x-100" /> : null}
                </div>
              );
              return lit ? (
                <Link key={title} href={href} className="set-row set-link" style={{ "--i": i } as CSSProperties}>
                  {inner}
                </Link>
              ) : (
                <div key={title} className="set-row">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
