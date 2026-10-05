"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { apiFetch } from "@/lib/api/client";
import type { Balance, ClickRow } from "@/lib/ambassadors/ledger";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/shop/format";
import { openStripe } from "@/lib/shop/openStripe";
import { copyText as putOnClipboard } from "@/lib/ui/copyText";

/**
 * An ambassador's own page (the owner, 2026-09-30): their link, how many
 * visits it had each day, the EIKON orders it brought in, and what they have
 * earned, waiting, ready and paid. Dark, like the rest of Purify, with one
 * restrained moment of motion: the day bars grow in, and the numbers rise.
 *
 * It refreshes itself every thirty seconds while open, so a sale shows up
 * without a reload. The buyers behind the orders are never named.
 *
 * The money rules live in lib/ambassadors; this only shows them.
 */

type Me = {
  ambassador: {
    code: string;
    displayName: string | null;
    status: "active" | "paused";
    rateBps: number;
    connected: boolean;
    payoutsReady: boolean;
  } | null;
  link?: string;
  clicks?: ClickRow[];
  clicks30?: number;
  balance?: Balance;
  minPayoutCents?: number;
  recent?: { order: string; status: "pending" | "cleared" | "paid" | "reversed"; amountCents: number; at: string; clearsAt: string }[];
  payouts?: { period: string; amount_cents: number; status: string; created_at: string; paid_at: string | null }[];
};

type Load = { state: "loading" } | { state: "signed-out" } | { state: "error" } | { state: "ready"; me: Me };

const money = (c: number) => formatPrice(c, "usd");

export function AmbassadorDashboard() {
  const { t } = useTranslate();
  const params = useSearchParams();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        // Back from Stripe: ask where the account stands before reading the page.
        if (params.get("stripe") === "done") await apiFetch("/api/ambassador/connect").catch(() => null);
        const res = await apiFetch("/api/ambassador/me");
        if (!alive) return;
        if (res.status === 401) return setLoad({ state: "signed-out" });
        if (!res.ok) return setLoad((l) => (l.state === "ready" ? l : { state: "error" }));
        setLoad({ state: "ready", me: (await res.json()) as Me });
      } catch {
        if (alive) setLoad((l) => (l.state === "ready" ? l : { state: "error" }));
      }
    };
    void read();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void read();
    }, 30_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [params, nonce]);

  async function connect() {
    setOpening(true);
    setStripeError(null);
    try {
      const res = await apiFetch("/api/ambassador/connect", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && json.url) {
        await openStripe(json.url, () => setNonce((n) => n + 1));
      } else {
        setStripeError(json.error ?? t("ambassador.loadError"));
      }
    } catch {
      setStripeError(t("ambassador.loadError"));
    }
    setOpening(false);
  }

  if (load.state === "loading") {
    return <div className="mx-auto max-w-[960px] px-5 pt-16 md:px-8" aria-busy="true"><div className="h-40 animate-pulse rounded-2xl bg-paper/[0.04] motion-reduce:animate-none" /></div>;
  }
  if (load.state === "signed-out") {
    return (
      <Empty title={t("ambassador.title")} body={t("ambassador.signIn")}>
        <Link href={`/signin?next=${encodeURIComponent("/shop/ambassador")}`} className={PRIMARY}>
          {t("nav.signIn")}
        </Link>
      </Empty>
    );
  }
  if (load.state === "error") {
    return (
      <Empty title={t("ambassador.title")} body={t("ambassador.loadError")}>
        <button type="button" onClick={() => setNonce((n) => n + 1)} className={PRIMARY}>
          {t("ambassador.retry")}
        </button>
      </Empty>
    );
  }

  const me = load.me;
  const amb = me.ambassador;
  if (!amb) {
    return (
      <Empty title={t("ambassador.notInvited")} body={t("ambassador.notInvitedBody")}>
        <Link href="/support" className={PRIMARY}>
          {t("ambassador.contact")}
        </Link>
      </Empty>
    );
  }

  const rate = String(amb.rateBps / 100);
  const min = money(me.minPayoutCents ?? 2500);
  const b = me.balance ?? { pendingCents: 0, clearedCents: 0, paidCents: 0, conversions: 0, reversed: 0 };
  const clicks = me.clicks ?? [];
  const peak = Math.max(1, ...clicks.map((c) => c.clicks));

  async function copyLink() {
    if (!me.link) return;
    try {
      if (!(await putOnClipboard(me.link))) throw new Error("the clipboard refused");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the link is on screen to copy by hand */
    }
  }

  async function share() {
    if (!me.link) return;
    try {
      await navigator.share?.({ url: me.link, title: "Purify" });
    } catch {
      /* dismissed */
    }
  }

  return (
    <div className="mx-auto w-full max-w-[960px] px-5 pb-24 pt-10 md:px-8 md:pt-14">
      <header className="rise-in">
        <h1 className="text-heading font-bold leading-tight text-paper md:text-display-sm">{t("ambassador.title")}</h1>
        <p className="mt-2 font-serif text-lede text-paper/70">
          {amb.displayName ? t("ambassador.greetingNamed", { name: amb.displayName }) : t("ambassador.greeting")}
        </p>
      </header>

      {amb.status === "paused" ? (
        <p role="status" className="mt-6 rounded-xl border border-paper/12 bg-paper/[0.04] px-4 py-3 font-sans text-ui text-paper/75">
          {t("ambassador.paused")}
        </p>
      ) : null}

      {/* The link */}
      <section
        aria-labelledby="amb-link"
        className="rise-in mt-8 rounded-2xl border border-premium/30 p-5 md:p-6"
        style={{ background: "radial-gradient(120% 140% at 0% 0%, rgba(201,162,90,0.12), transparent 60%)", animationDelay: "80ms" }}
      >
        <h2 id="amb-link" className="font-sans text-ui font-semibold text-paper">
          {t("ambassador.yourLink")}
        </h2>
        <p className="mt-3 break-all rounded-lg bg-night/60 px-3 py-2.5 font-mono text-detail text-premium-ink">{me.link}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void copyLink()} className={PRIMARY}>
            {copied ? t("ambassador.copied") : t("ambassador.copy")}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <button type="button" onClick={() => void share()} className={SECONDARY}>
              {t("ambassador.share")}
            </button>
          ) : null}
        </div>
        <p className="mt-4 font-sans text-detail leading-[1.55] text-paper/65">{t("ambassador.linkHelp", { rate })}</p>
        <p className="mt-1.5 font-sans text-detail leading-[1.55] text-paper/50">{t("ambassador.disclose")}</p>
      </section>

      {/* The numbers */}
      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label={t("ambassador.visits")} value={String(me.clicks30 ?? 0)} hint={t("ambassador.visitsHint")} delay={120} />
        <Stat label={t("ambassador.orders")} value={String(b.conversions)} hint={t("ambassador.ordersHint")} delay={160} />
        <Stat label={t("ambassador.pending")} value={money(b.pendingCents)} hint={t("ambassador.pendingHint")} delay={200} />
        <Stat label={t("ambassador.ready")} value={money(b.clearedCents)} hint={t("ambassador.readyHint", { min })} delay={240} accent />
        <Stat label={t("ambassador.paid")} value={money(b.paidCents)} delay={280} />
      </dl>

      {/* Visits by day */}
      <section aria-labelledby="amb-visits" className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.02] p-5">
        <h2 id="amb-visits" className="font-sans text-detail font-medium text-paper/70">
          {t("ambassador.chartLabel")}
        </h2>
        <ol className="mt-4 flex h-28 items-end gap-[3px]" aria-label={t("ambassador.chartLabel")}>
          {clicks.map((c, i) => (
            <li key={c.day} className="flex h-full flex-1 items-end" title={`${c.day}: ${c.clicks}`}>
              <span
                className="amb-bar block w-full rounded-t-[3px] bg-premium/70"
                style={{ height: `${Math.max(c.clicks > 0 ? 6 : 2, (c.clicks / peak) * 100)}%`, animationDelay: `${i * 18}ms`, opacity: c.clicks > 0 ? 1 : 0.25 }}
              />
            </li>
          ))}
        </ol>
      </section>

      {/* Getting paid */}
      <section aria-labelledby="amb-pay" className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.02] p-5">
        <h2 id="amb-pay" className="font-sans text-ui font-semibold text-paper">
          {t("ambassador.payoutsTitle")}
        </h2>
        <p className="mt-2 font-sans text-ui leading-[1.55] text-paper/70">
          {amb.payoutsReady ? t("ambassador.readyBody", { min }) : amb.connected ? t("ambassador.checking") : t("ambassador.connectBody")}
        </p>
        {!amb.payoutsReady ? (
          <button type="button" onClick={() => void connect()} disabled={opening} className={cn(PRIMARY, "mt-4 disabled:opacity-60")}>
            {amb.connected ? t("ambassador.continue") : t("ambassador.connect")}
          </button>
        ) : null}
        {stripeError ? (
          <p role="alert" className="mt-3 font-sans text-caption text-crimson-soft">
            {stripeError}
          </p>
        ) : null}
        {(me.payouts ?? []).length > 0 ? (
          <ul className="mt-5 divide-y divide-paper/8 border-t border-paper/8">
            {(me.payouts ?? []).map((p) => (
              <li key={p.created_at} className="flex items-center justify-between gap-3 py-2.5 font-sans text-detail">
                <span className="text-paper/70">{new Date(p.paid_at ?? p.created_at).toLocaleDateString()}</span>
                <span className="tabular-nums text-paper">
                  {money(p.amount_cents)}
                  {p.status === "failed" ? <span className="ms-2 text-crimson-soft">{t("ambassador.payoutFailed")}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Orders */}
      <section aria-labelledby="amb-orders" className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.02] p-5">
        <h2 id="amb-orders" className="font-sans text-ui font-semibold text-paper">
          {t("ambassador.recentTitle")}
        </h2>
        {(me.recent ?? []).length === 0 ? (
          <p className="mt-2 font-sans text-ui text-paper/60">{t("ambassador.none")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-paper/8">
            {(me.recent ?? []).map((r) => (
              <li key={r.order} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <span className="font-sans text-detail text-paper/80">
                  {r.order}
                  <span className="ms-2 text-paper/45">{new Date(r.at).toLocaleDateString()}</span>
                </span>
                <span className="flex items-center gap-2.5">
                  <StatusChip status={r.status} clearsAt={r.clearsAt} />
                  <span className={cn("font-sans text-ui font-semibold tabular-nums", r.status === "reversed" ? "text-paper/35 line-through" : "text-paper")}>
                    {money(r.amountCents)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* How it works */}
      <section aria-labelledby="amb-how" className="mt-6 px-1">
        <h2 id="amb-how" className="font-sans text-detail font-medium text-paper/70">
          {t("ambassador.howTitle")}
        </h2>
        <ol className="mt-2 list-decimal space-y-1.5 ps-5 font-sans text-detail leading-[1.55] text-paper/60 marker:text-paper/35">
          <li>{t("ambassador.how1", { rate })}</li>
          <li>{t("ambassador.how2")}</li>
          <li>{t("ambassador.how3", { min })}</li>
        </ol>
      </section>
    </div>
  );
}

const PRIMARY =
  "tap-press inline-flex min-h-11 items-center justify-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-on-paper hover:bg-paper/90";
const SECONDARY =
  "tap-press inline-flex min-h-11 items-center justify-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-semibold text-paper hover:border-paper/40";

function Stat({ label, value, hint, delay, accent }: { label: string; value: string; hint?: string; delay: number; accent?: boolean }) {
  return (
    <div
      className={cn("rise-in rounded-2xl border p-4", accent ? "border-premium/35 bg-premium/[0.06]" : "border-paper/10 bg-paper/[0.02]")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <dt className="font-sans text-caption text-paper/55">{label}</dt>
      <dd className={cn("mt-1 font-sans text-title-sm font-semibold tabular-nums", accent ? "text-premium-ink" : "text-paper")}>{value}</dd>
      {hint ? <dd className="mt-0.5 font-sans text-caption text-paper/45">{hint}</dd> : null}
    </div>
  );
}

function StatusChip({ status, clearsAt }: { status: "pending" | "cleared" | "paid" | "reversed"; clearsAt: string }) {
  const { t } = useTranslate();
  const label =
    status === "pending"
      ? t("ambassador.statusPending", { date: new Date(clearsAt).toLocaleDateString() })
      : status === "cleared"
        ? t("ambassador.statusCleared")
        : status === "paid"
          ? t("ambassador.statusPaid")
          : t("ambassador.statusReversed");
  return (
    <span
      className={cn(
        "rounded-pill px-2.5 py-0.5 font-sans text-caption",
        status === "cleared" ? "bg-premium/15 text-premium-ink" : status === "paid" ? "bg-emerald-500/15 text-emerald-300" : "bg-paper/[0.06] text-paper/60",
      )}
    >
      {label}
    </span>
  );
}

function Empty({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[520px] px-5 py-20 text-center">
      <h1 className="text-heading font-bold text-paper">{title}</h1>
      <p className="mt-3 font-serif text-lede leading-[1.6] text-paper/70">{body}</p>
      <div className="mt-6 flex justify-center">{children}</div>
    </div>
  );
}
