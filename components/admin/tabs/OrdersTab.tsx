"use client";

// Orders, the owner's pick B (r3-16, 2026-10-30: "I'd say do B for order").
//
// A list of Open, Late and Done, and each order opens as its whole story
// (components/admin/needed/OrderStory.tsx): its eight stages on one line with
// what the reader sees under it, the parcel with its Temu link, the address,
// the money, both trackings, and Reply, Refund, Reship and Gift Plus beside
// it. On a phone the list comes first and an order opens over it.
//
// Fulfillment's tiles and board retired into this page: its view id
// (#tab=fulfillment) lands here (components/admin/AdminShell.tsx), and its
// address CSV is each order's Label file. Orders and Fulfillment used to name
// the same orders twice ("Awaiting sourcing" on one, "Needs sourcing" on the
// other); there is one set of names now, lib/shop/funnel.ts's.
//
// Read from /api/admin/shop/funnel, which carries every paid order with its
// address, pieces, Temu links, costs, photos and the moves behind its dates.
// Moves go through PATCH /api/admin/shop/orders, unchanged: a compare and swap
// on both status columns, and a tracking number emails the buyer.

import { useCallback, useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { downloadCsv, toCsv } from "@/lib/admin/csv";
import { handTo, take, takeInitial, writeParams } from "@/lib/admin/handoff";
import {
  ageLine,
  bucketCounts,
  findByNumber,
  labelCsv,
  ordersIn,
  stageWord,
  type Bucket,
  type StoryEvent,
  type StoryOrder,
} from "@/lib/admin/orderStory";
import { parseStoredAddress } from "@/lib/eikonBox/address";
import { isLate } from "@/lib/shop/funnel";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";

import { GiftSheet, MakeItRightSheet, RefundSheet, type Sides } from "../needed/ConsoleSheets";
import { OrderStory, type StoryAction } from "../needed/OrderStory";
import { LateBox, Segmented, State, Thumb, litClass } from "../needed/parts";
import { PackingSlip } from "../shop/PackingSlip";

type Feed = Sides & {
  orders: (StoryOrder & { stripe_payment_intent?: string | null; supplier_order_status?: string | null })[];
  eventsByOrder: Record<string, StoryEvent[]>;
  historyReady: boolean;
};

const ink3 = { color: "var(--adm-ink-3)" } as const;

export function OrdersTab() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);
  const [bucket, setBucket] = useState<Bucket>("open");
  const [openId, setOpenId] = useState<string | null>(null);
  // Below lg the list and the story are one column: the story covers the
  // list once an order is tapped, and Orders brings the list back.
  const [phoneOpen, setPhoneOpen] = useState(false);
  // An order named in the address (#tab=orders&order=EIK-...), or handed over
  // from another page, opened once the orders are in.
  const [wanted, setWanted] = useState<string | null>(
    () => takeInitial(["orders", "fulfillment"], "order") ?? take("orders")?.order ?? null,
  );
  const [sheet, setSheet] = useState<StoryAction | null>(null);
  const [printing, setPrinting] = useState<{ id: string; nonce: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await adminJson<Feed>("/api/admin/shop/funnel");
    if (d) {
      setFeed(d);
      setFailed(false);
    } else setFailed(true);
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the mount
       read shares its path with every move's reload; writes are past an await. */
    void load();
  }, [load]);

  const now = new Date();
  const orders = feed?.orders ?? [];
  const counts = bucketCounts(orders, now);
  const list = ordersIn(orders, bucket, now);

  // The order named in the address (or handed over) stays open until another
  // is picked; otherwise the one picked, else the first in the list, so the
  // desktop always shows a story.
  const wantedOrder = wanted ? (findByNumber(orders, wanted) ?? orders.find((o) => o.id === wanted) ?? null) : null;
  const selected = wantedOrder ?? orders.find((o) => o.id === openId) ?? list[0] ?? null;
  const storyOpen = phoneOpen || Boolean(wantedOrder);

  // The address names the open order, so a reload or a bookmark lands on it.
  const selectedId = selected?.id ?? null;
  useEffect(() => {
    if (selectedId) writeParams("orders", { order: orderConfirmationNumber(selectedId) });
  }, [selectedId]);

  function open(id: string) {
    setWanted(null);
    setOpenId(id);
    setPhoneOpen(true);
    setNotice(null);
  }

  async function move(to: ShopFulfillmentStatus, extra: { note?: string; tracking?: string }): Promise<string | null> {
    if (!selected) return "No order is open.";
    // Pin the open order: the list re-sorts after a move, and the story must
    // stay on the order that was just moved, not on whatever is now first.
    setOpenId(selected.id);
    try {
      const res = await fetch("/api/admin/shop/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selected.id,
          fulfillmentStatus: to,
          ...(extra.tracking ? { outboundTracking: extra.tracking } : {}),
          ...(extra.note ? { note: extra.note } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) return data?.error ?? `That did not save (${res.status}).`;
      await load();
      return null;
    } catch {
      return "That did not save: the network dropped.";
    }
  }

  function act(a: StoryAction) {
    if (!selected) return;
    setOpenId(selected.id);
    if (a === "reply") {
      // The request about this order, if the reader wrote; else a new message
      // to the address the order was bought with. Messages decides which.
      handTo("messages", { order: selected.id, email: selected.email ?? "" });
      return;
    }
    setSheet(a);
  }

  const events = selected ? (feed?.eventsByOrder?.[selected.id] ?? []) : [];
  const sides: Sides = {
    supplierByProduct: feed?.supplierByProduct ?? {},
    imageByProduct: feed?.imageByProduct ?? {},
    stockByProduct: feed?.stockByProduct ?? {},
  };
  const sheetOrder = selected ? { ...selected, events } : null;
  const name = selected ? (parseStoredAddress(selected.shipping_address)?.name ?? null) : null;

  if (failed && !feed) {
    return (
      <p className="font-sans text-[13px]" style={{ color: "var(--adm-critical)" }}>
        The orders could not be read. This is not an empty list: reload, and sign in again if that does not help.
      </p>
    );
  }

  return (
    <div className="lg:flex lg:gap-5">
      <aside className={`lg:w-[300px] lg:flex-none ${storyOpen ? "hidden lg:block" : ""}`}>
        <Segmented
          full
          label="Which orders"
          value={bucket}
          onChange={(b) => {
            setBucket(b);
            setOpenId(null);
            setWanted(null);
          }}
          options={[
            ["open", "Open", counts.open],
            ["late", "Late", counts.late],
            ["done", "Done", counts.done],
          ]}
        />
        {!feed ? (
          <p className="mt-4 font-sans text-[12.5px]" style={ink3}>
            Reading the orders…
          </p>
        ) : list.length === 0 ? (
          <p className="mt-4 font-sans text-[12.5px]" style={ink3}>
            {bucket === "late" ? "Nothing is late." : bucket === "open" ? "Nothing is on its way. Every paid order is done." : "No finished orders yet."}
          </p>
        ) : (
          <ul className="mt-2.5 space-y-px">
            {list.map((o) => {
              const on = selected?.id === o.id;
              const late = isLate(o, now);
              const first = o.items[0];
              const img = first?.product_id ? sides.imageByProduct[first.product_id] : undefined;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => open(o.id)}
                    aria-current={on ? "true" : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-[var(--adm-radius-sm)] px-2.5 py-2 text-left ${on ? litClass : ""}`}
                    style={on ? { background: "var(--adm-panel-2)" } : { borderBottom: "1px solid var(--adm-line)" }}
                  >
                    <Thumb src={img} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[12px]" style={{ color: "var(--adm-ink)" }}>
                          {orderConfirmationNumber(o.id)}
                        </span>
                        <span className="shrink-0 font-sans text-[11px]" style={ink3}>
                          {ageLine(o, now)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
                        {o.items.map((i) => i.title).join(", ") || "No pieces recorded"}
                      </span>
                      <span className="mt-1 block font-sans text-[11.5px]" style={{ color: "var(--adm-ink)" }}>
                        {late ? (
                          <LateBox>{stageWord(o)} · late</LateBox>
                        ) : (
                          <State kind={o.payment_status === "refunded" ? "idle" : o.fulfillment_status === "delivered" ? "done" : "wait"}>
                            {stageWord(o)}
                          </State>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {list.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `orders-${bucket}.csv`,
                toCsv(
                  ["Order", "Paid", "Stage", "Total", "Email", "Pieces"],
                  list.map((o) => [
                    orderConfirmationNumber(o.id),
                    o.paid_at ?? o.created_at,
                    stageWord(o),
                    (o.total_cents / 100).toFixed(2),
                    o.email ?? "",
                    o.items.map((i) => `${i.quantity} x ${i.title}`).join("; "),
                  ]),
                ),
              )
            }
            className="mt-3 font-sans text-[12px] underline underline-offset-[3px]"
            style={ink3}
          >
            Download this list as CSV
          </button>
        ) : null}
        {feed && !feed.historyReady ? (
          <p className="mt-3 font-sans text-[11.5px]" style={ink3}>
            The dates under each stage need the order history table (20260920000000_order_events.sql). The stages work
            without it.
          </p>
        ) : null}
      </aside>

      <section className={`min-w-0 flex-1 ${storyOpen ? "" : "hidden lg:block"}`} aria-label="The open order">
        {notice ? (
          <p role="status" className="mb-3 font-sans text-[12.5px]" style={{ color: "var(--adm-good)" }}>
            {notice}
          </p>
        ) : null}
        {selected ? (
          <OrderStory
            key={selected.id}
            order={selected}
            events={events}
            sides={sides}
            onBack={() => {
              setPhoneOpen(false);
              setWanted(null);
            }}
            onMove={move}
            onAction={act}
            onPrint={() => setPrinting({ id: selected.id, nonce: Date.now() })}
            onLabel={() =>
              downloadCsv(
                `label-${orderConfirmationNumber(selected.id)}.csv`,
                labelCsv([{ id: selected.id, email: selected.email, address: parseStoredAddress(selected.shipping_address) }]),
              )
            }
          />
        ) : feed ? (
          <p className="font-sans text-[13px]" style={ink3}>
            Pick an order to see its whole story.
          </p>
        ) : null}
      </section>

      {sheet === "refund" && sheetOrder ? (
        <RefundSheet
          order={sheetOrder}
          name={name}
          onClose={() => setSheet(null)}
          onDone={(r) => {
            setSheet(null);
            setNotice(
              `Refunded $${(r.amountCents / 100).toFixed(2)} to their card.${r.giftDays ? " The gift of Plus is on its way." : ""}${r.giftError ? ` The gift did not send: ${r.giftError}` : ""}`,
            );
            void load();
          }}
        />
      ) : null}
      {sheet === "reship" && sheetOrder ? (
        <MakeItRightSheet
          order={sheetOrder}
          name={name}
          reason=""
          sides={sides}
          onClose={() => setSheet(null)}
          onReshipped={(r) => {
            setSheet(null);
            setNotice(
              `It starts again at Needs sourcing, at no charge.${r.giftDays ? " The gift of Plus is on its way." : ""}${r.giftError ? ` The gift did not send: ${r.giftError}` : ""}`,
            );
            void load();
          }}
          onRefunded={(r) => {
            setSheet(null);
            setNotice(`Refunded $${(r.amountCents / 100).toFixed(2)} to their card.`);
            void load();
          }}
        />
      ) : null}
      {sheet === "gift" && selected ? (
        <GiftSheet
          name={name}
          email={selected.email}
          rule={null}
          onClose={() => setSheet(null)}
          onSent={(days) => {
            setSheet(null);
            setNotice(`A gift of ${days === 365 ? "1 year" : `${Math.round(days / 30)} month${days === 30 ? "" : "s"}`} of Plus is waiting for them.`);
          }}
        />
      ) : null}
      {printing && selected && printing.id === selected.id ? (
        <PackingSlip
          key={printing.nonce}
          order={{ ...selected, currency: selected.currency ?? undefined }}
          address={parseStoredAddress(selected.shipping_address)}
          onDone={() => setPrinting(null)}
        />
      ) : null}
    </div>
  );
}
