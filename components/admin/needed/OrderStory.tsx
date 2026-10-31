"use client";

// One order as its whole story (Orders, the owner's pick B, r3-16,
// 2026-10-30): its eight stages on one line (done solid, now lit, late
// dashed) with what the reader sees under it; the parcel with its Temu link;
// the address with copy, slip and label; the money; both trackings; and
// Reply, Refund, Reship and Gift Plus beside it. On a phone the line becomes
// a ladder and the four actions sit under the parcel, as drawn.

import { useState, type ReactNode } from "react";

import { Sensitive } from "../primitives";
import type { Sides } from "./ConsoleSheets";
import { Btn, Icon, KV, Label, Ladder, State, StepLine, Thumb, dollars, type IconName, type MarkKind } from "./parts";
import {
  addressLines,
  ageLine,
  backMove,
  inboundLine,
  nextMove,
  orderMoney,
  outboundLine,
  readerSees,
  stageWord,
  storySteps,
  type StoryEvent,
  type StoryOrder,
} from "@/lib/admin/orderStory";
import { parseStoredAddress } from "@/lib/eikonBox/address";
import { isLate } from "@/lib/shop/funnel";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { trackingLink } from "@/lib/shop/trackingLink";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";

export type StoryAction = "reply" | "refund" | "reship" | "gift";

const ACTIONS: [StoryAction, string, IconName][] = [
  ["reply", "Reply", "reply"],
  ["refund", "Refund", "refund"],
  ["reship", "Reship", "reship"],
  ["gift", "Gift Plus", "gift"],
];

const ink3 = { color: "var(--adm-ink-3)" } as const;
const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--adm-radius)] border p-3 md:p-3.5 ${className ?? ""}`} style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}>
      {children}
    </div>
  );
}

function TrackValue({ word, tone, tracking }: { word: string; tone: "done" | "wait" | "idle"; tracking: string | null }) {
  const link = tracking ? trackingLink(tracking) : null;
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
      {tone === "idle" ? <span style={ink3}>{word}</span> : <State kind={tone}>{word}</State>}
      {link ? (
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-[3px]" style={{ color: "var(--adm-ink-2)" }}>
          {link.carrier ?? "Track"} <Icon name="ext" size={11} />
        </a>
      ) : null}
    </span>
  );
}

export function OrderStory({
  order,
  events,
  sides,
  onBack,
  onMove,
  onAction,
  onPrint,
  onLabel,
}: {
  order: StoryOrder;
  events: StoryEvent[];
  sides: Sides;
  /** The phone's way back to the list. */
  onBack: () => void;
  onMove: (to: ShopFulfillmentStatus, extra: { note?: string; tracking?: string }) => Promise<string | null>;
  onAction: (a: StoryAction) => void;
  onPrint: () => void;
  onLabel: () => void;
}) {
  const now = new Date();
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const number = orderConfirmationNumber(order.id);
  const address = parseStoredAddress(order.shipping_address);
  const steps = storySteps(order, events, now);
  const sees = readerSees(order);
  const move = nextMove(order);
  const back = backMove(order);
  const money = orderMoney(order, Object.fromEntries(Object.entries(sides.supplierByProduct).map(([k, v]) => [k, v.cost])));
  const late = isLate(order, now);
  const statusKind: MarkKind = order.payment_status === "refunded" ? "idle" : late ? "late" : move ? "lit" : "done";
  const inbound = inboundLine(order);
  const outbound = outboundLine(order);
  const lines = addressLines(address);

  async function go(to: ShopFulfillmentStatus, withTracking = false) {
    setBusy(true);
    setError(null);
    const err = await onMove(to, {
      note: note.trim() || undefined,
      ...(withTracking ? { tracking: tracking.trim() } : {}),
    });
    setBusy(false);
    if (err) setError(err);
    else {
      setNote("");
      setTracking("");
    }
  }

  const stepList = steps.map((st) => ({
    label: st.label,
    state: st.state,
    note: st.state === "now" || st.state === "late" ? (day(st.at) ?? "now") : day(st.at),
  }));

  return (
    <div>
      {/* The phone's way back, as drawn: "< Orders". */}
      <button type="button" onClick={onBack} className="mb-2 inline-flex min-h-11 items-center gap-1 font-sans text-[14px] lg:hidden" style={{ color: "var(--adm-ink-2)" }}>
        <Icon name="back" size={18} />
        Orders
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-[19px] font-semibold md:text-[19px]" style={{ color: "var(--adm-ink)" }}>
          {number}
        </h2>
        <div className="hidden gap-1.5 md:flex">
          {ACTIONS.map(([a, label, icon]) => (
            <Btn key={a} small icon={icon} onClick={() => onAction(a)} disabled={a !== "reply" && order.payment_status !== "paid"}>
              {label}
            </Btn>
          ))}
        </div>
      </div>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 font-sans text-[13px]">
        <State kind={statusKind}>{stageWord(order)}</State>
        <span style={ink3}>
          {move ? `· for ${ageLine(order, now)} ` : ""}
          {address?.name ? (
            <>
              · <Sensitive value={address.name} />{" "}
            </>
          ) : null}
          · paid {day(order.paid_at ?? order.created_at)} · {dollars(order.total_cents)}
        </span>
      </p>

      <Card className="mt-3.5">
        <div className="hidden md:block">
          <StepLine steps={stepList} label="The order's eight stages" />
        </div>
        <div className="md:hidden">
          <Ladder
            label="The order's eight stages"
            steps={stepList.map((st, i) => ({
              ...st,
              sub: steps[i].state === "now" || steps[i].state === "late" ? `Reader sees: ${sees.word}` : null,
            }))}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5" style={{ borderColor: "var(--adm-line)" }}>
          <span className="hidden font-sans text-[12px] md:inline" style={ink3}>
            The reader sees: <span style={{ color: "var(--adm-ink)" }}>{sees.word}</span>
            {sees.step > 0 ? `, step ${sees.step} of ${sees.of}` : ""}
          </span>
          {move ? (
            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
              {move.needsTracking ? (
                <input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Paste the tracking number"
                  aria-label="Tracking number"
                  className="min-h-[38px] min-w-0 flex-1 rounded-[var(--adm-radius-sm)] border px-3 font-mono text-[12.5px] outline-none md:w-[220px] md:flex-none"
                  style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" }}
                />
              ) : (
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="A line for the history"
                  aria-label="A line for the history"
                  maxLength={500}
                  className="hidden min-h-[38px] w-[220px] rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px] outline-none md:block"
                  style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" }}
                />
              )}
              {back ? (
                <span className="hidden md:inline-flex">
                  <Btn onClick={() => void go(back.to)} disabled={busy} title={`Back to ${back.label}`}>
                    Back
                  </Btn>
                </span>
              ) : null}
              <span className="flex-1 md:flex-none">
                <Btn
                  primary
                  lit
                  wide
                  busy={busy}
                  disabled={move.needsTracking && !tracking.trim()}
                  onClick={() => void go(move.to, move.needsTracking)}
                  title={move.needsTracking ? "Saves the tracking and emails it to the buyer" : undefined}
                >
                  {move.needsTracking ? "Shipped, tell the buyer" : move.label}
                </Btn>
              </span>
            </div>
          ) : (
            <span className="font-sans text-[12px]" style={ink3}>
              {order.payment_status === "refunded" ? "Refunded. Nothing left to move." : "Delivered. Nothing left to move."}
            </span>
          )}
        </div>
        {error ? (
          <p role="alert" className="mt-2 font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
            {error}
          </p>
        ) : null}
      </Card>

      {/* The phone's four actions, tall, under the move. */}
      <div className="mt-2.5 flex gap-1.5 md:hidden">
        {ACTIONS.map(([a, label, icon]) => (
          <Btn key={a} tall icon={icon} onClick={() => onAction(a)} disabled={a !== "reply" && order.payment_status !== "paid"}>
            {label === "Gift Plus" ? "Gift" : label}
          </Btn>
        ))}
      </div>

      <div className="mt-3.5 grid gap-3.5 md:grid-cols-[1.1fr_1fr]">
        <Card>
          <Label>In the parcel</Label>
          <ul className="mt-2.5 space-y-2.5">
            {order.items.map((it, i) => {
              const src = it.product_id ? sides.supplierByProduct[it.product_id] : undefined;
              const img = it.product_id ? sides.imageByProduct[it.product_id] : undefined;
              return (
                <li key={`${it.title}-${i}`} className="flex items-center gap-3">
                  <Thumb src={img} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-[13px] font-medium" style={{ color: "var(--adm-ink)" }}>
                      {it.title} · {it.quantity}
                    </p>
                    <p className="truncate font-sans text-[12px]" style={ink3}>
                      {src?.sku ? `${src.sku} · ` : ""}
                      {dollars(it.unit_price_cents * it.quantity)}
                    </p>
                  </div>
                  <Btn small icon="ext" href={src?.url ?? null} disabled={!src?.url} title={src?.url ? "The Temu listing, to order it" : "No Temu link recorded for this piece"}>
                    Temu
                  </Btn>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <Label>Ship to</Label>
          </div>
          <p className="mt-1.5 whitespace-pre-line font-sans text-[12.5px] leading-relaxed" style={{ color: "var(--adm-ink-2)" }}>
            <Sensitive value={lines.length ? lines.join("\n") : null} fallback="No address on this order." />
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Btn
              small
              icon="copy"
              disabled={!lines.length}
              onClick={() => {
                void navigator.clipboard?.writeText(lines.join("\n")).then(() => setCopied(true));
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Btn>
            <Btn small icon="print" onClick={onPrint}>
              Packing slip
            </Btn>
            <Btn small icon="download" onClick={onLabel} disabled={!address}>
              Label file
            </Btn>
          </div>
        </Card>

        <Card>
          <Label>Money</Label>
          <div className="mt-1">
            <KV k="Paid">
              <span className="font-mono">{money.refunded ? "refunded" : dollars(money.paidCents)}</span>
            </KV>
            <KV k="Card fee, about">
              <span className="font-mono">{dollars(money.feeCents)}</span>
            </KV>
            <KV k="Temu, at today's cost">
              <span className="font-mono">{money.supplierCents === null ? "not recorded" : dollars(money.supplierCents)}</span>
            </KV>
            <KV k="It keeps">
              <b className="font-mono">{money.refunded ? "nothing" : money.keepsCents === null ? "not known" : dollars(money.keepsCents)}</b>
            </KV>
          </div>
          <div className="mt-3">
            <Label>Tracking</Label>
          </div>
          <div className="mt-1">
            <KV k="In, from Temu">
              <TrackValue {...inbound} />
            </KV>
            <KV k={<>Out, to <Sensitive value={address?.name ?? null} fallback="them" /></>}>
              <TrackValue {...outbound} />
            </KV>
          </div>
        </Card>
      </div>
    </div>
  );
}
