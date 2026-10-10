"use client";

import { useEffect, useState } from "react";

import { dealPrice } from "@/lib/shop/cartDeals";
import { isEikonProduct } from "@/lib/shop/eikon";
import { unitEconomics } from "@/lib/shop/pricing";
import { percentOff, priceCart } from "@/lib/shop/promotions";
import { prayerCornerSet, roleOf } from "@/lib/shop/sets";
import type { ShopProductFull } from "@/lib/shop/types";

import { Card, Select, ToolbarButton } from "../primitives";

/**
 * Deals & shipping: the owner's revenue switches, in one place.
 *
 *   🎯 Cart deal       something that waited in a cart unlocks a discount for a
 *                      short, real window (lib/shop/cartDeals.ts)
 *   🧺 The set         an icon, a rope and a cross in one order take a
 *                      percentage off the three (lib/shop/promotions.ts)
 *   ➕ Multi-buy       from a number of pieces, every piece takes a percentage
 *                      off (the same file)
 *   🚚 Free shipping   orders over a threshold ship free, enforced at checkout
 *   🛒 Cart demand     "N other people have this in their cart", counted
 *
 * Every number a shopper will see from here is one the server computes and
 * honours. The previews run the same functions checkout runs, against the
 * real price and the real supplier cost, so what is shown here is what a
 * buyer is charged.
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
  setDiscount: { enabled: boolean; percent: number };
  multiBuy: { enabled: boolean; minItems: number; percent: number };
};

type Stats = {
  cartsThisWeek: number;
  cartsWaitedLongEnough: number;
  liveProducts: number;
  liveProductsWithoutCost: number;
  paidOrders: number;
  averageOrderCents: number | null;
  flatShippingCents: number;
  setOrders?: number;
  multiBuyOrders?: number;
};

/** The admin's product rows carry every column the set reads. */
type PreviewProduct = ShopProductFull;

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
const MIN_ITEM_OPTIONS = [2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} or more pieces` }));

/**
 * Pieces whose price at `percent` off would leave less than `floorCents` after
 * cost and card fees. Only pieces with a recorded cost can be judged; the
 * others are counted separately so "none" is never read as "all fine".
 */
function underFloor(products: PreviewProduct[], costs: Map<string, number | null>, percent: number, floorCents: number) {
  const thin: { product: PreviewProduct; unitCents: number; keepCents: number }[] = [];
  let unknown = 0;
  for (const p of products) {
    const cost = costs.get(p.id);
    if (cost == null) {
      unknown += 1;
      continue;
    }
    const unitCents = percentOff(p.price_cents, percent);
    const keepCents = unitEconomics(unitCents, cost).contributionCents;
    if (keepCents < floorCents) thin.push({ product: p, unitCents, keepCents });
  }
  return { thin, unknown };
}

/** The margin check a discount card shows under its controls. */
function FloorNote({
  check,
  percent,
  floorCents,
  scope,
}: {
  check: ReturnType<typeof underFloor>;
  percent: number;
  floorCents: number;
  scope: string;
}) {
  return (
    <div className="mt-2.5 space-y-1 font-sans text-caption">
      {check.thin.length > 0 ? (
        <p className="text-[color:var(--adm-warn)]">
          Under your {money(floorCents)} floor at {percent}% off:{" "}
          {check.thin.map((t) => `${t.product.title} (${money(t.unitCents)}, keeps ${money(t.keepCents)})`).join("; ")}. Raise{" "}
          {check.thin.length === 1 ? "its price" : "their prices"} or lower the percentage.
        </p>
      ) : null}
      {check.unknown > 0 ? (
        <p className="text-paper/55">
          {check.unknown} of {scope} {check.unknown === 1 ? "has" : "have"} no supplier cost recorded, so {check.unknown === 1 ? "its" : "their"}{" "}
          margin at this price is unchecked.
        </p>
      ) : null}
      {check.thin.length === 0 && check.unknown === 0 ? (
        <p className="text-[color:var(--adm-good)]">Every piece keeps at least {money(floorCents)} at {percent}% off.</p>
      ) : null}
    </div>
  );
}
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
      {/* Filled when on, an outline when off. The knob was a literal white,
          which is the track's own colour in the dark theme, where the solid
          is near-white: an on switch would have had no knob. It takes the
          ink that sits on the solid when on, and the quiet ink when off. */}
      <span
        aria-hidden
        className="relative inline-flex w-10 shrink-0 rounded-full p-0.5 transition-colors duration-150"
        style={{
          background: checked ? "var(--adm-accent)" : "transparent",
          boxShadow: checked ? "none" : "inset 0 0 0 1px var(--adm-line-strong)",
        }}
      >
        <span
          className="block h-5 w-5 rounded-full transition-transform duration-150"
          style={{
            transform: checked ? "translateX(16px)" : "none",
            background: checked ? "var(--adm-on-accent)" : "var(--adm-ink-3)",
          }}
        />
      </span>
      <span style={{ color: checked ? "var(--adm-ink)" : "var(--adm-ink-3)" }}>{checked ? "On" : "Off"}</span>
    </button>
  );
}

export function GrowthPanel() {
  const [loaded, setLoaded] = useState<{
    settings: Settings;
    present: boolean;
    promotionsPresent?: boolean;
    stats: Stats;
  } | null>(null);
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
        const s = (await sRes.json()) as { settings: Settings; present: boolean; promotionsPresent?: boolean; stats: Stats };
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
  const promotionsPresent = loaded.promotionsPresent === true;
  const deal = form.cartDeal;
  const setDeal = (patch: Partial<Settings["cartDeal"]>) => setForm({ ...form, cartDeal: { ...deal, ...patch } });
  const dirty = JSON.stringify(form) !== JSON.stringify(loaded.settings);

  // The set as the shop home builds it today, priced as checkout prices it.
  const setOffer = form.setDiscount;
  const multi = form.multiBuy;
  const set = prayerCornerSet(products);
  const setPriced = set
    ? priceCart(
        set.pieces.map((p) => ({
          slug: p.slug,
          quantity: 1,
          listCents: p.price_cents,
          role: roleOf(p),
          eligible: isEikonProduct(p),
        })),
        { setPercent: setOffer.percent, multiBuy: null },
      )
    : null;
  const setCheck = set ? underFloor(set.pieces, costs, setOffer.percent, deal.minMarginCents) : null;
  const eikonLive = products.filter((p) => isEikonProduct(p));
  const multiCheck = underFloor(eikonLive, costs, multi.percent, deal.minMarginCents);

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
        <div className="rounded-[var(--adm-radius)] border border-dashed border-[color:var(--adm-warn)]/45 bg-[color:var(--adm-warn)]/[0.05] p-4">
          <p className="font-sans text-detail font-semibold text-[color:var(--adm-warn)]">Waiting on the migration</p>
          <p className="mt-1 font-sans text-caption text-paper/70">
            These switches live in shop_settings, which supabase/migrations/20260918000000_shop_growth.sql creates. Until
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

      {present && !promotionsPresent ? (
        <div className="rounded-[var(--adm-radius)] border border-dashed border-[color:var(--adm-warn)]/45 bg-[color:var(--adm-warn)]/[0.05] p-4">
          <p className="font-sans text-detail font-semibold text-[color:var(--adm-warn)]">The set and multi-buy are waiting on their migration</p>
          <p className="mt-1 font-sans text-caption text-paper/70">
            Their switches live in columns supabase/migrations/20261002000100_shop_promotions.sql adds. Until it runs, both stay
            off for shoppers and Save leaves them out; everything else here saves as usual.
          </p>
        </div>
      ) : null}

      <Card
        title="🧺 The prayer corner set"
        subtitle="An icon, a prayer rope and a cross in one order take this off the three. Any icon, rope and cross from EIKON, not only the ones the set card shows."
        action={
          <Switch
            checked={setOffer.enabled}
            onChange={(v) => setForm({ ...form, setDiscount: { ...setOffer, enabled: v } })}
            label="Set discount"
            disabled={!promotionsPresent}
          />
        }
      >
        <div className="max-w-[240px] space-y-1">
          <span className={labelCls}>Discount on the three</span>
          <Select
            ariaLabel="Set discount"
            value={String(setOffer.percent)}
            onChange={(v) => setForm({ ...form, setDiscount: { ...setOffer, percent: Number(v) } })}
            options={PERCENT_OPTIONS}
          />
        </div>

        <div className="mt-4 rounded-[var(--adm-radius-sm)] border border-paper/12 bg-night/50 p-3">
          {set && setPriced ? (
            <>
              <p className="font-sans text-detail text-paper/75">
                Today&apos;s set: {set.pieces.map((p) => p.title).join(", ")}.{" "}
                {setPriced.savingsCents > 0 ? (
                  <>
                    <b className="text-paper">{money(setPriced.itemsCents)}</b> together instead of {money(setPriced.listCents)}, a
                    saving of {money(setPriced.savingsCents)}.
                  </>
                ) : (
                  <>
                    {money(setPriced.listCents)} together. Not every piece is EIKON&apos;s, so this set takes no discount.
                  </>
                )}
                {form.freeShippingThresholdCents != null ? (
                  setPriced.itemsCents >= form.freeShippingThresholdCents ? (
                    <> It ships free.</>
                  ) : setPriced.listCents >= form.freeShippingThresholdCents ? (
                    <> At this price it no longer clears your {money(form.freeShippingThresholdCents)} free shipping.</>
                  ) : null
                ) : null}
              </p>
              {setCheck ? (
                <FloorNote check={setCheck} percent={setOffer.percent} floorCents={deal.minMarginCents} scope="the three" />
              ) : null}
            </>
          ) : (
            <p className="font-sans text-detail text-paper/60">
              No set today: the shop needs an icon, a prayer rope and a cross that can all be bought.
            </p>
          )}
        </div>

        <p className="mt-3 font-sans text-caption text-paper/50">
          The floor is the cart deal&apos;s &quot;Keep at least, per item&quot; above. The set card, the cart and the Stripe page
          all show the set price with the full price struck through. Nothing stacks: each piece is charged its single best
          price. {stats.setOrders != null ? `In ${stats.setOrders} of the last ${stats.paidOrders} paid orders.` : ""}
        </p>
      </Card>

      <Card
        title="➕ Multi-buy"
        subtitle="Once an order holds this many pieces, every piece takes this off. The cart counts down to it: “Add 1 more piece and each piece is 10% off”."
        action={
          <Switch
            checked={multi.enabled}
            onChange={(v) => setForm({ ...form, multiBuy: { ...multi, enabled: v } })}
            label="Multi-buy"
            disabled={!promotionsPresent}
          />
        }
      >
        <div className="grid max-w-[520px] gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <span className={labelCls}>From</span>
            <Select
              ariaLabel="Multi-buy from"
              value={String(multi.minItems)}
              onChange={(v) => setForm({ ...form, multiBuy: { ...multi, minItems: Number(v) } })}
              options={MIN_ITEM_OPTIONS}
            />
          </div>
          <div className="space-y-1">
            <span className={labelCls}>Discount on each piece</span>
            <Select
              ariaLabel="Multi-buy discount"
              value={String(multi.percent)}
              onChange={(v) => setForm({ ...form, multiBuy: { ...multi, percent: Number(v) } })}
              options={PERCENT_OPTIONS.filter((o) => Number(o.value) <= 20)}
            />
          </div>
        </div>
        <FloorNote check={multiCheck} percent={multi.percent} floorCents={deal.minMarginCents} scope={`${eikonLive.length} EIKON pieces`} />
        <p className="mt-3 font-sans text-caption text-paper/50">
          A piece in a set keeps the set&apos;s price when that is lower, and a cart deal wins when it is deeper.{" "}
          {stats.multiBuyOrders != null ? `In ${stats.multiBuyOrders} of the last ${stats.paidOrders} paid orders.` : ""}
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
