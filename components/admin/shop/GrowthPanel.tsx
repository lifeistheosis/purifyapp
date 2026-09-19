"use client";

import { useEffect, useState } from "react";

import { dealPrice } from "@/lib/shop/cartDeals";
import { unitEconomics } from "@/lib/shop/pricing";

import { Card, Select, ToolbarButton } from "../primitives";

/**
 * Deals & shipping: the owner's revenue switches, in one place.
 *
 *   🎯 Cart deal       something that waited in a cart unlocks a discount for a
 *                      short, real window (lib/shop/cartDeals.ts)
 *   🚚 Free shipping   orders over a threshold ship free, enforced at checkout
 *   🛒 Cart demand     "N other people have this in their cart", counted
 *
 * Every number a shopper will see from here is one the server computes and
 * honours. The preview below the deal controls runs the same function
 * checkout runs, against the real price and the real supplier cost, so what
 * is shown here is what a buyer is charged.
 */

type Settings = {
  cartDeal: {
    enabled: boolean;
    afterDays: number;
    percent: number;
    windowHours: number;
    minMarginCents: number;
  };
  freeShippingThresholdCents: number | null;
  showCartDemand: boolean;
};

type Stats = {
  cartsThisWeek: number;
  cartsWaitedLongEnough: number;
  liveProducts: number;
  liveProductsWithoutCost: number;
  paidOrders: number;
  averageOrderCents: number | null;
  flatShippingCents: number;
};

type PreviewProduct = { id: string; title: string; slug: string; price_cents: number; status: string };

const labelCls = "font-sans text-caption text-paper/55";
const field =
  "w-full rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper placeholder:text-paper/30 focus:outline-none focus:border-paper/40";

function money(cents: number | null | undefined): string {
  return cents == null ? "n/a" : `$${(cents / 100).toFixed(2)}`;
}

const DAY_OPTIONS = [1, 2, 3, 4, 5, 7, 10, 14].map((d) => ({
  value: String(d),
  label: d === 1 ? "1 day" : `${d} days`,
}));
const PERCENT_OPTIONS = [5, 10, 15, 20, 25, 30].map((p) => ({ value: String(p), label: `${p}% off` }));
const HOUR_OPTIONS = [
  [12, "12 hours"],
  [24, "24 hours"],
  [48, "48 hours"],
  [72, "3 days"],
  [168, "7 days"],
].map(([h, l]) => ({ value: String(h), label: String(l) }));

/** An on/off switch in the panel's accent, with a real 44px hit area. */
function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-[44px] shrink-0 items-center gap-2.5 font-sans text-detail disabled:opacity-50"
    >
      <span
        aria-hidden
        className="relative inline-flex w-10 shrink-0 rounded-full p-0.5 transition-colors duration-150"
        style={{ background: checked ? "var(--adm-accent)" : "var(--adm-line-strong)" }}
      >
        <span
          className="block h-5 w-5 rounded-full bg-white shadow transition-transform duration-150"
          style={{ transform: checked ? "translateX(16px)" : "none" }}
        />
      </span>
      <span style={{ color: checked ? "var(--adm-ink)" : "var(--adm-ink-3)" }}>{checked ? "On" : "Off"}</span>
    </button>
  );
}

export function GrowthPanel() {
  const [loaded, setLoaded] = useState<{ settings: Settings; present: boolean; stats: Stats } | null>(null);
  const [form, setForm] = useState<Settings | null>(null);
  const [marginDraft, setMarginDraft] = useState<string | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState<string | null>(null);
  const [products, setProducts] = useState<PreviewProduct[]>([]);
  const [costs, setCosts] = useState<Map<string, number | null>>(new Map());
  const [previewId, setPreviewId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        const [sRes, pRes] = await Promise.all([
          fetch("/api/admin/shop/settings", { cache: "no-store" }),
          fetch("/api/admin/shop/products", { cache: "no-store" }),
        ]);
        if (!alive) return;
        if (!sRes.ok) {
          setError(`Could not load the settings (${sRes.status}).`);
          return;
        }
        const s = (await sRes.json()) as { settings: Settings; present: boolean; stats: Stats };
        const pd = pRes.ok
          ? ((await pRes.json()) as {
              products: PreviewProduct[];
              sourcing: { product_id: string; supplier_cost_cents: number | null }[];
            })
          : { products: [], sourcing: [] };
        if (!alive) return;
        setLoaded(s);
        setForm(s.settings);
        const live = pd.products.filter((p) => p.status === "published");
        setProducts(live);
        setCosts(new Map(pd.sourcing.map((x) => [x.product_id, x.supplier_cost_cents])));
        setPreviewId((cur) => cur || live[0]?.id || "");
      } catch {
        if (alive) setError("Could not load the settings: network dropped.");
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [version]);

  if (!form || !loaded) {
    return (
      <Card title="Deals & shipping">
        <p className="font-sans text-detail text-paper/60">{error ?? "Loading…"}</p>
      </Card>
    );
  }

  const { stats, present } = loaded;
  const deal = form.cartDeal;
  const setDeal = (patch: Partial<Settings["cartDeal"]>) => setForm({ ...form, cartDeal: { ...deal, ...patch } });
  const dirty = JSON.stringify(form) !== JSON.stringify(loaded.settings);

  const preview = products.find((p) => p.id === previewId) ?? null;
  const previewCost = preview ? (costs.get(preview.id) ?? null) : null;
  const previewDeal = preview ? dealPrice(preview.price_cents, deal.percent, previewCost, deal.minMarginCents) : null;
  const previewKeep =
    preview && previewDeal && previewCost != null
      ? unitEconomics(previewDeal.unitCents, previewCost).contributionCents
      : null;

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/shop/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Save failed (${res.status}).`);
        return;
      }
      setNotice("Saved. Shoppers see it within 30 seconds.");
      setVersion((v) => v + 1);
    } catch {
      setError("Save failed: network dropped. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {!present ? (
        <div className="rounded-xl border border-[color:var(--adm-warn)]/35 bg-[color:var(--adm-warn)]/[0.07] p-4">
          <p className="font-sans text-detail font-semibold text-[color:var(--adm-warn)]">Waiting on the migration</p>
          <p className="mt-1 font-sans text-caption text-paper/70">
            These switches live in shop_settings, which supabase/migrations/20260918_shop_growth.sql creates. Until
            it runs, everything here stays off for shoppers and Save will refuse.
          </p>
        </div>
      ) : null}

      <Card
        title="🎯 Cart deal"
        subtitle="Something that has waited in a cart unlocks a discount for a short, real window. Never below cost, card fees and your margin floor."
        action={
          <Switch checked={deal.enabled} onChange={(v) => setDeal({ enabled: v })} label="Cart deal" />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <span className={labelCls}>Unlocks after</span>
            <Select
              ariaLabel="Unlocks after"
              value={String(deal.afterDays)}
              onChange={(v) => setDeal({ afterDays: Number(v) })}
              options={DAY_OPTIONS}
            />
          </div>
          <div className="space-y-1">
            <span className={labelCls}>Discount</span>
            <Select
              ariaLabel="Discount"
              value={String(deal.percent)}
              onChange={(v) => setDeal({ percent: Number(v) })}
              options={PERCENT_OPTIONS}
            />
          </div>
          <div className="space-y-1">
            <span className={labelCls}>Lasts</span>
            <Select
              ariaLabel="Lasts"
              value={String(deal.windowHours)}
              onChange={(v) => setDeal({ windowHours: Number(v) })}
              options={HOUR_OPTIONS}
            />
          </div>
          <label className="space-y-1">
            <span className={labelCls}>Keep at least, per item</span>
            <input
              inputMode="decimal"
              value={marginDraft ?? (deal.minMarginCents / 100).toFixed(2)}
              onChange={(e) => {
                setMarginDraft(e.target.value);
                const cents = Math.round(Number(e.target.value) * 100);
                if (Number.isFinite(cents) && cents >= 0) setDeal({ minMarginCents: cents });
              }}
              onBlur={() => setMarginDraft(null)}
              className={field}
            />
          </label>
        </div>

        <p className="mt-3 max-w-[640px] font-sans text-caption text-paper/60">
          The shopper finds it in their cart, with the price struck through and the real time it ends. It is not
          emailed, because the shop&apos;s email rules keep countdowns and urgency out of the inbox. Only a line that
          has already sat in a cart gets it, so nobody is ever told to wait for one.
        </p>

        <div className="mt-4 rounded-[var(--adm-radius-sm)] border border-paper/12 bg-night/50 p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1">
              <span className={labelCls}>Try it on a product</span>
              <Select
                ariaLabel="Preview product"
                value={previewId}
                onChange={setPreviewId}
                options={products.map((p) => ({ value: p.id, label: p.title, hint: money(p.price_cents) }))}
                placeholder="No live products"
              />
            </div>
          </div>
          {preview ? (
            <p className="mt-2.5 font-sans text-detail text-paper/75">
              {previewCost == null ? (
                <>No supplier cost recorded, so this one is never discounted. Add its cost in the product&apos;s Sourcing.</>
              ) : previewDeal ? (
                <>
                  Buyer pays <b className="text-paper">{money(previewDeal.unitCents)}</b> instead of{" "}
                  {money(preview.price_cents)} ({previewDeal.percent}% off
                  {previewDeal.percent < deal.percent ? `, capped by your floor from ${deal.percent}%` : ""}). You keep{" "}
                  <b className="text-[color:var(--adm-good)]">{money(previewKeep)}</b> after cost and card fees.
                </>
              ) : (
                <>No room: any discount would drop it under your floor, so it stays at full price.</>
              )}
            </p>
          ) : null}
        </div>

        <p className="mt-3 font-sans text-caption text-paper/50">
          {stats.cartsThisWeek} {stats.cartsThisWeek === 1 ? "cart" : "carts"} touched this week,{" "}
          {stats.cartsWaitedLongEnough} holding something that has waited {deal.afterDays}+{" "}
          {deal.afterDays === 1 ? "day" : "days"}. {stats.liveProductsWithoutCost} of {stats.liveProducts} live products
          have no supplier cost and are never discounted.
        </p>
      </Card>

      <Card
        title="🚚 Free shipping over a threshold"
        subtitle="Orders at or over this, after any deal, ship free. The cart shows how far away the buyer is."
        action={
          <Switch
            checked={form.freeShippingThresholdCents != null}
            onChange={(v) =>
              setForm({
                ...form,
                freeShippingThresholdCents: v
                  ? Math.max(1000, Math.round(((stats.averageOrderCents ?? 3500) * 1.3) / 500) * 500)
                  : null,
              })
            }
            label="Free shipping threshold"
          />
        }
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="w-40 space-y-1">
            <span className={labelCls}>Threshold (USD)</span>
            <input
              inputMode="decimal"
              disabled={form.freeShippingThresholdCents == null}
              value={
                thresholdDraft ??
                (form.freeShippingThresholdCents == null ? "" : (form.freeShippingThresholdCents / 100).toFixed(2))
              }
              onChange={(e) => {
                setThresholdDraft(e.target.value);
                const cents = Math.round(Number(e.target.value) * 100);
                if (Number.isFinite(cents) && cents >= 100) setForm({ ...form, freeShippingThresholdCents: cents });
              }}
              onBlur={() => setThresholdDraft(null)}
              className={field + " disabled:opacity-50"}
            />
          </label>
          <p className="max-w-[520px] pb-2 font-sans text-caption text-paper/60">
            Standard shipping is {money(stats.flatShippingCents)}; Pro members already ship free.{" "}
            {stats.averageOrderCents != null
              ? `The average paid order is ${money(stats.averageOrderCents)} across ${stats.paidOrders}. A threshold a little above it is what lifts order size.`
              : "No paid orders yet to set it against."}
          </p>
        </div>
      </Card>

      <Card
        title="🛒 “In other carts” on product pages"
        subtitle="Counted from carts touched this week, one per person, never the viewer. Nothing shows at zero, and nothing is ever added to it."
        action={
          <Switch
            checked={form.showCartDemand}
            onChange={(v) => setForm({ ...form, showCartDemand: v })}
            label="Show cart demand"
          />
        }
      >
        <p className="font-sans text-caption text-paper/60">
          Beside it, a product with 5 or fewer in hand and ready to ship already says &quot;Only 3 left&quot; from its real
          stock count. Both are true on their own; neither needs help.
        </p>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <ToolbarButton variant="primary" loading={busy} onClick={() => void save()}>
          {dirty ? "Save changes" : "Saved"}
        </ToolbarButton>
        {dirty ? (
          <ToolbarButton
            onClick={() => {
              setForm(loaded.settings);
              setMarginDraft(null);
              setThresholdDraft(null);
            }}
          >
            Undo
          </ToolbarButton>
        ) : null}
        {error ? <p className="font-sans text-detail text-[color:var(--adm-critical)]">{error}</p> : null}
        {notice ? (
          <p role="status" className="font-sans text-detail text-[color:var(--adm-good)]">
            {notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
