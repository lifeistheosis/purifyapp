"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api/client";
import { GIFT_CODE } from "@/lib/gifts/card";
import { createClient } from "@/lib/supabase/client";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { useMounted } from "@/lib/useMounted";

import { GiftBox, type PendingGift } from "@/components/gifts/GiftBox";
import { GiftFeatures } from "@/components/gifts/GiftFeatures";
import { PILL } from "@/components/gifts/OrderGiftClient";

type Card = { fromName: string; toName: string; message: string | null; days: number; opened: boolean };
type Read = { state: "card"; card: Card } | { state: "missing" } | { state: "error" };

const noSubscribe = () => () => {};
/** The code in the link, read on the device: a static page knows no query. */
const codeNow = () => (new URLSearchParams(window.location.search).get("code") ?? "").trim().toUpperCase();

/**
 * What the one a gift is for sees when they open the link in their email
 * (2.0, the Christmas gift; lib/gifts/card.ts). As drawn and said yes to
 * (docs/plans/gift/): the gift's ticket with who it is from and their line,
 * then Sign in to receive it, or, signed in, Open your gift. Opening it puts
 * the gift on their account (app/api/gifts/card/redeem) and the app's own
 * gift box opens it there and then, the box whose claim grants the year.
 */
export function CardGiftClient() {
  const { t } = useTranslate();
  const router = useRouter();
  const mounted = useMounted();
  const code = useSyncExternalStore(noSubscribe, codeNow, () => "");
  const valid = GIFT_CODE.test(code);
  const [read, setRead] = useState<Read | null>(null);
  const [authTick, setAuthTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [gift, setGift] = useState<PendingGift | null>(null);

  useEffect(() => {
    if (!valid) return;
    let alive = true;
    void (async () => {
      try {
        const res = await apiFetch(`/api/gifts/card?code=${code}`);
        const data = (await res.json().catch(() => ({}))) as { card?: Card };
        if (!alive) return;
        if (res.ok && data.card) setRead({ state: "card", card: data.card });
        else setRead(res.status === 404 ? { state: "missing" } : { state: "error" });
      } catch {
        if (alive) setRead({ state: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [code, valid]);

  // Signed in or out while the page is open: the button follows.
  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") window.setTimeout(() => setAuthTick((n) => n + 1), 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const signedIn = mounted && authTick >= 0 && Boolean(readLocalSessionUser());

  async function open() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await apiFetch("/api/gifts/card/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as { result?: string; gift?: PendingGift };
      if (res.ok && data.result === "ok" && data.gift) return setGift(data.gift);
      if (res.status === 401) return setAuthTick((n) => n + 1);
      setNote(
        data.result === "yours" ? t("cardGift.yours") : data.result === "opened" ? t("cardGift.opened") : res.status === 404 ? t("cardGift.notFound") : t("cardGift.errGeneric"),
      );
    } catch {
      setNote(t("cardGift.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  const card = read?.state === "card" ? read.card : null;
  const missing = (mounted && !valid) || read?.state === "missing";
  const next = `/gift/card?code=${code}`;

  let body: ReactNode;
  let action: ReactNode = null;
  if (missing) {
    body = t("cardGift.notFound");
    action = (
      <Link href="/" className={PILL}>
        {t("orderGift.open")}
      </Link>
    );
  } else if (read?.state === "error") {
    body = t("cardGift.errGeneric");
  } else if (!card) {
    body = <Skeleton className="h-4 w-56" />;
    action = <Skeleton className="h-12 w-full rounded-pill" />;
  } else if (card.opened) {
    body = t("cardGift.opened");
    action = (
      <Link href="/" className={PILL}>
        {t("orderGift.open")}
      </Link>
    );
  } else if (!signedIn) {
    body = t("orderGift.signedOutBody");
    action = (
      <Link href={`/signin?next=${encodeURIComponent(next)}`} className={PILL}>
        {t("orderGift.signIn")}
      </Link>
    );
  } else {
    body = t("cardGift.signedInBody");
    action = (
      <button type="button" onClick={() => void open()} disabled={busy} className={PILL}>
        {t("cardGift.open")}
      </button>
    );
  }

  return (
    <section className="gift-page min-h-[calc(100dvh-72px)] bg-night pb-32 pt-20">
      <div className="relative mx-auto w-full max-w-md px-[18px]">
        <div className="set-panel">
          <div>
            <div id="gift-first" className="px-[18px] pb-4 pt-[18px]">
              {card ? (
                <p className="gift-eyebrow text-paper/62">{t("cardGift.eyebrow", { name: card.fromName })}</p>
              ) : (
                <Skeleton className="h-3.5 w-32" />
              )}
              <h1 id="gift-title" className="gift-title mt-[7px] font-serif text-[30px] font-bold leading-[1.05] text-paper">
                {t("orderGift.title")}
              </h1>
              <p className="mt-1 font-sans text-detail leading-[1.45] text-paper/60">{t("cardGift.meta")}</p>
            </div>
            <div className="gift-perf" aria-hidden />
            <div className="px-[18px] pb-4 pt-3.5" role="status">
              {/* Their line in their own words; the browser sets the quote marks for the reader's language. */}
              {card?.message ? (
                <p className="gift-caption mb-2.5 text-paper/62">
                  <q dir="auto">{card.message}</q>
                </p>
              ) : null}
              <div className="font-sans text-detail leading-[1.5] text-paper/70">{body}</div>
            </div>
          </div>
        </div>
        {action ? <div className="gift-after mt-4">{action}</div> : null}
        {note ? (
          <p role="alert" className="mt-3 px-1 font-sans text-detail leading-[1.5] text-paper">
            {note}
          </p>
        ) : null}
        <GiftFeatures />
      </div>
      {gift ? <GiftBox gift={gift} onDone={() => router.push("/")} /> : null}
    </section>
  );
}
