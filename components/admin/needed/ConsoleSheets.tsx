"use client";

// The support console's sheets (r3-16, part 3, the owner's note 28): Refund,
// held to run; a plan bought in a store, which only Apple or Google refunds;
// Make it right, a reship or a refund, his choice; Gift Plus, through the
// admin's existing Gifts; and Tracking, step by step. Opened from a request
// in Messages and from an order's page in Orders, so both answer the same
// way.
//
// The 3 months of Plus is a switch that starts ON on a refund and a reship,
// as drawn (his open question 2, taken as drawn until he says).

import { useState } from "react";

import { Modal } from "../primitives";
import {
  Bar5,
  Btn,
  HoldButton,
  Icon,
  KV,
  Label,
  Ladder,
  Mark,
  Segmented,
  Thumb,
  Toggle,
  dollars,
  type MarkKind,
} from "./parts";
import { readerSees, readerSteps, storySteps, type StoryEvent, type StoryOrder } from "@/lib/admin/orderStory";
import { GIFT_LENGTHS, THANK_YOU_DAYS, giftLine, lengthWord, storeName, type StoreRule } from "@/lib/admin/support";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { trackingLink } from "@/lib/shop/trackingLink";

export type SheetOrder = StoryOrder & { events: StoryEvent[] };

export type Sides = {
  supplierByProduct: Record<string, { url: string | null; sku: string | null; cost: number | null }>;
  imageByProduct: Record<string, string>;
  stockByProduct: Record<string, number | null>;
};

const ink3 = { color: "var(--adm-ink-3)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;

const shortDay = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

/** Send a gift through the existing route. Resolves to an error sentence, or null. */
async function sendGift(email: string, days: number, message: string): Promise<string | null> {
  try {
    const res = await fetch("/api/admin/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, tier: "plus", days, message: message.trim().slice(0, 280) || null }),
    });
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok ? null : (d.error ?? "The gift did not send.");
  } catch {
    return "The gift did not send: the network dropped.";
  }
}

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="mt-3 font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
      {text}
    </p>
  );
}

function PlusSwitch({
  on,
  onChange,
  hint,
  email,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  hint: string;
  email: string | null;
}) {
  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-[var(--adm-radius-sm)] border px-3 py-2.5" style={{ borderColor: "var(--adm-line-strong)" }}>
      <Icon name="gift" size={17} />
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
          And {lengthWord(THANK_YOU_DAYS)} of Plus
        </p>
        <p className="font-sans text-[11.5px]" style={ink3}>
          {email ? hint : "No email on this order, so no gift can be sent with it."}
        </p>
      </div>
      <Toggle on={on && !!email} onChange={(v) => email && onChange(v)} label={`And ${lengthWord(THANK_YOU_DAYS)} of Plus`} />
    </div>
  );
}

/* ── Refund, held to run ───────────────────────────────────────────── */

export type RefundDone = { amountCents: number; giftDays: number | null; giftError: string | null };

function RefundBody({
  order,
  ticketId,
  onDone,
}: {
  order: SheetOrder;
  ticketId?: string;
  onDone: (r: RefundDone) => void;
}) {
  const [part, setPart] = useState<"all" | "part">("all");
  const [amount, setAmount] = useState("");
  const [gift, setGift] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partCents = Math.round(Number(amount.replace(/[^0-9.]/g, "")) * 100);
  const cents = part === "all" ? order.total_cents : Number.isFinite(partCents) ? partCents : 0;
  const valid = cents > 0 && cents <= order.total_cents;
  const whole = cents >= order.total_cents;

  async function run() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/shop/refunds/console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          ...(part === "part" ? { amountCents: cents } : {}),
          ...(ticketId ? { ticketId } : {}),
          confirm: true,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; amountCents?: number };
      if (!res.ok) {
        setError(d.error ?? `The refund did not go through (${res.status}).`);
        return;
      }
      const giftError = gift && order.email ? await sendGift(order.email, THANK_YOU_DAYS, giftLine(null)) : null;
      onDone({ amountCents: d.amountCents ?? cents, giftDays: gift && order.email ? THANK_YOU_DAYS : null, giftError });
    } catch {
      setError("The refund did not go through: the network dropped. Nothing was sent twice; check the order before trying again.");
    } finally {
      setBusy(false);
    }
  }

  const open = order.refund && (order.refund.status === "requested" || order.refund.status === "approved");

  return (
    <div>
      <Segmented
        full
        label="How much"
        value={part}
        onChange={setPart}
        options={[
          ["all", `All of it · ${dollars(order.total_cents)}`],
          ["part", "Part"],
        ]}
      />
      {part === "part" ? (
        <label className="mt-3 block">
          <span className="font-sans text-[11.5px] font-medium" style={ink3}>
            Amount, up to {dollars(order.total_cents)}
          </span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="12.00"
            className="mt-1 w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-mono text-[13px] outline-none"
            style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" }}
          />
        </label>
      ) : null}
      <div className="mt-3">
        <KV k="Goes back to">their card, through Stripe</KV>
        <KV k="They see it">in 5 to 10 business days</KV>
        <KV k="Then">{whole ? "the order reads Refunded, and they get the refund email" : "they get the refund email; the order stays where it is"}</KV>
        <KV k="Recorded">in the Audit log, as yours</KV>
      </div>
      <PlusSwitch on={gift} onChange={setGift} hint="your rule: a thank you on either choice" email={order.email} />
      {open ? (
        <p className="mt-3 font-sans text-[12.5px]" style={{ color: "var(--adm-warn)" }}>
          A refund for this order is already open. Decide it under Catalogue, Marketplace, Refunds.
        </p>
      ) : null}
      <div className="mt-4">
        <HoldButton busy={busy} disabled={!valid || Boolean(open)} onHeld={() => void run()}>
          Hold to refund {valid ? dollars(cents) : ""}
        </HoldButton>
      </div>
      <p className="mt-2 flex items-center justify-center gap-1.5 font-sans text-[11.5px]" style={ink3}>
        <Icon name="lock" size={12} />
        Nothing refunds unless this is held.
      </p>
      <ErrorLine text={error} />
    </div>
  );
}

export function RefundSheet({
  order,
  name,
  ticketId,
  onClose,
  onDone,
}: {
  order: SheetOrder;
  name: string | null;
  ticketId?: string;
  onClose: () => void;
  onDone: (r: RefundDone) => void;
}) {
  return (
    <Modal title="Refund" subtitle={`${orderConfirmationNumber(order.id)} · ${name ?? order.email ?? "the buyer"} · paid ${dollars(order.total_cents)} by card`} onClose={onClose}>
      <RefundBody order={order} ticketId={ticketId} onDone={onDone} />
    </Modal>
  );
}

/* ── Make it right: reship or refund, his choice ───────────────────── */

export type ReshipDone = { giftDays: number | null; giftError: string | null };

export function MakeItRightSheet({
  order,
  name,
  reason: initialReason,
  ticketId,
  sides,
  start = "reship",
  onClose,
  onReshipped,
  onRefunded,
}: {
  order: SheetOrder;
  name: string | null;
  reason: string;
  ticketId?: string;
  sides: Sides;
  start?: "reship" | "refund";
  onClose: () => void;
  onReshipped: (r: ReshipDone) => void;
  onRefunded: (r: RefundDone) => void;
}) {
  const [choice, setChoice] = useState<"reship" | "refund">(start);
  const [reason, setReason] = useState(initialReason);
  const [gift, setGift] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const left = order.fulfillment_status === "shipped" || order.fulfillment_status === "delivered";

  async function reship() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/shop/orders/reship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, reason: reason.trim(), confirm: true }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(d.error ?? `The reship did not save (${res.status}).`);
        return;
      }
      const giftError = gift && order.email ? await sendGift(order.email, THANK_YOU_DAYS, giftLine(null)) : null;
      onReshipped({ giftDays: gift && order.email ? THANK_YOU_DAYS : null, giftError });
    } catch {
      setError("The reship did not save: the network dropped.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Make it right" subtitle={`${name ?? order.email ?? "The buyer"} · ${orderConfirmationNumber(order.id)}`} onClose={onClose}>
      <Segmented
        full
        label="Reship or refund"
        value={choice}
        onChange={setChoice}
        options={[
          ["reship", "Reship"],
          ["refund", `Refund · ${dollars(order.total_cents)}`],
        ]}
      />
      {choice === "refund" ? (
        <div className="mt-4">
          <RefundBody order={order} ticketId={ticketId} onDone={onRefunded} />
        </div>
      ) : (
        <div className="mt-4">
          {order.items.map((it, i) => {
            const src = it.product_id ? sides.supplierByProduct[it.product_id] : undefined;
            const img = it.product_id ? sides.imageByProduct[it.product_id] : undefined;
            const stock = it.product_id ? sides.stockByProduct[it.product_id] : undefined;
            return (
              <div key={`${it.title}-${i}`} className="mb-2 rounded-[var(--adm-radius)] border p-3" style={{ borderColor: "var(--adm-line)" }}>
                <div className="flex items-center gap-3">
                  <Thumb src={img} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-[13px] font-medium" style={{ color: "var(--adm-ink)" }}>
                      {it.title} · {it.quantity}
                    </p>
                    <p className="font-sans text-[11.5px]" style={ink3}>
                      {src?.sku ? `Pick on Temu: ${src.sku}` : "No pick recorded for Temu"}
                    </p>
                  </div>
                  <Btn small icon="ext" href={src?.url ?? null} disabled={!src?.url}>
                    Temu
                  </Btn>
                </div>
                <p className="mt-2 flex items-center gap-2 font-sans text-[12px]" style={ink2}>
                  <Mark kind="wait" />
                  {typeof stock === "number"
                    ? `On hand: ${stock} in general stock. The split into shippable and quality control is not recorded, so order it on Temu: a piece kept for quality control is never shipped.`
                    : "Stock is not counted for this piece: order it on Temu."}
                </p>
              </div>
            );
          })}
          <p className="mt-3 font-sans text-[12.5px] leading-relaxed" style={ink2}>
            The order starts again as a reship, at no charge: the Temu link for you now, the label when it arrives. The first
            parcel&apos;s tracking stays in its history.
          </p>
          <label className="mt-3 block">
            <span className="font-sans text-[11.5px] font-medium" style={ink3}>
              Why it is going again (kept in the order&apos;s history)
            </span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              className="mt-1 w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[13px] outline-none"
              style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" }}
            />
          </label>
          <PlusSwitch on={gift} onChange={setGift} hint="sent with the reply, opened by them" email={order.email} />
          {!left ? (
            <p className="mt-3 font-sans text-[12.5px]" style={{ color: "var(--adm-warn)" }}>
              This order has not left us yet, so it cannot be reshipped. Move it back a stage on its page instead.
            </p>
          ) : null}
          <div className="mt-4">
            <Btn primary lit wide icon="reship" busy={busy} disabled={!left || !reason.trim()} onClick={() => void reship()}>
              {gift && order.email ? "Reship, and send the gift" : "Reship"}
            </Btn>
          </div>
          <ErrorLine text={error} />
        </div>
      )}
    </Modal>
  );
}

/* ── A plan bought in a store ──────────────────────────────────────── */

export function StoreRefundSheet({
  name,
  tier,
  source,
  rule,
  onClose,
  onPutPage,
  onGift,
}: {
  name: string | null;
  tier: string | null;
  source: string | null;
  rule: StoreRule;
  onClose: () => void;
  onPutPage: () => void;
  onGift: () => void;
}) {
  const plan = tier === "pro" ? "Pro" : "Plus";
  return (
    <Modal title={`Refund ${plan}`} subtitle={[name, `${plan}`, storeName(source)].filter(Boolean).join(" · ")} onClose={onClose}>
      <div className="rounded-[var(--adm-radius)] border-[1.5px] p-3" style={{ borderColor: "var(--adm-ink)" }}>
        <div className="flex items-start gap-2.5">
          <Icon name="lock" size={17} />
          <div>
            <p className="font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
              {rule.title}
            </p>
            <p className="mt-1 font-sans text-[12.5px] leading-relaxed" style={ink2}>
              {rule.body}
            </p>
          </div>
        </div>
      </div>
      {rule.page ? (
        <div className="mt-3">
          {rule.replyLine ? (
            <>
              <Btn primary lit wide icon="ext" onClick={onPutPage}>
                Put {rule.page.label} in my reply
              </Btn>
              <p className="mt-1.5 text-center font-mono text-[11px]" style={ink3}>
                {new URL(rule.page.url).host}
              </p>
            </>
          ) : (
            <Btn wide icon="ext" href={rule.page.url}>
              Open {rule.page.label}
            </Btn>
          )}
        </div>
      ) : null}
      <div className="mt-4">
        <Label>Make it up to them</Label>
        <div className="mt-2">
          <Btn wide icon="gift" onClick={onGift}>
            Gift Plus instead
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ── Gift Plus ─────────────────────────────────────────────────────── */

export function GiftSheet({
  name,
  email,
  rule,
  onClose,
  onSent,
}: {
  name: string | null;
  email: string | null;
  rule: StoreRule | null;
  onClose: () => void;
  onSent: (days: number) => void;
}) {
  const [days, setDays] = useState(THANK_YOU_DAYS);
  const [line, setLine] = useState(giftLine(rule));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!email) return;
    setBusy(true);
    setError(null);
    const err = await sendGift(email, days, line);
    setBusy(false);
    if (err) setError(err);
    else onSent(days);
  }

  return (
    <Modal title={`Gift Plus to ${name ?? email ?? "them"}`} subtitle="Through Gifts, beside the reply" onClose={onClose}>
      <Label>How long</Label>
      <div className="mt-2">
        <Segmented
          full
          label="How long"
          value={String(days)}
          onChange={(v) => setDays(Number(v))}
          options={GIFT_LENGTHS.map(([d, l]) => [String(d), l] as const)}
        />
      </div>
      <div className="mt-4">
        <Label>A line with it</Label>
      </div>
      <textarea
        value={line}
        onChange={(e) => setLine(e.target.value)}
        maxLength={280}
        rows={3}
        className="mt-2 w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[13px] leading-relaxed outline-none"
        style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" }}
      />
      <p className="mt-3 rounded-[var(--adm-radius)] px-3 py-2.5 font-sans text-[12px] leading-relaxed" style={{ background: "var(--adm-panel-2)", color: "var(--adm-ink-2)" }}>
        It waits until they next open Purify, then adds {lengthWord(days)} on top of the time they have. Unopened, it costs
        nothing. It keeps your name as the sender.
      </p>
      {!email ? (
        <p className="mt-3 font-sans text-[12.5px]" style={{ color: "var(--adm-warn)" }}>
          No email is on file, so there is no account to send it to.
        </p>
      ) : null}
      <ErrorLine text={error} />
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn primary lit icon="gift" busy={busy} disabled={!email} onClick={() => void send()}>
          Send the gift
        </Btn>
      </div>
    </Modal>
  );
}

/* ── Tracking, step by step ────────────────────────────────────────── */

export function TrackingSheet({
  order,
  name,
  planLine,
  onClose,
  onSend,
}: {
  order: SheetOrder;
  name: string | null;
  planLine: string | null;
  onClose: () => void;
  onSend: () => void;
}) {
  const now = new Date();
  const seen = readerSteps(order, order.events);
  const story = storySteps(order, order.events, now);
  const sees = readerSees(order);
  const link = order.outbound_tracking ? trackingLink(order.outbound_tracking) : null;
  const cur = story.findIndex((s) => s.state === "now" || s.state === "late");
  const curStep = cur >= 0 ? story[cur] : story[story.length - 1];
  const kind = (st: (typeof story)[number]["state"]): MarkKind => (st === "now" ? "lit" : st === "late" ? "late" : st === "done" ? "done" : "idle");

  return (
    <Modal
      title={orderConfirmationNumber(order.id)}
      subtitle={`${order.items.map((i) => i.title).join(", ")} · ${dollars(order.total_cents)}`}
      onClose={onClose}
    >
      <Label>What {name ?? "they"} sees on their order</Label>
      <div className="mt-3">
        <Ladder
          label="The reader's five steps"
          steps={seen.map((st) => ({
            label: st.word,
            state: st.state,
            note: shortDay(st.at),
            sub:
              st.state === "now" && st.word === "Shipped"
                ? `${link?.carrier ?? "Carrier"} · tracking emailed to them`
                : null,
          }))}
        />
      </div>
      {sees.step > 0 ? (
        <div className="mt-3">
          <Bar5 step={sees.step} of={sees.of} />
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate rounded-[var(--adm-radius-sm)] border px-3 py-2 font-mono text-[11.5px]" style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-2)" }}>
          {order.outbound_tracking ?? "No tracking yet"}
        </span>
        <Btn icon="ext" href={link?.url ?? null} disabled={!link}>
          {link?.carrier ?? "Track"}
        </Btn>
      </div>
      <div className="mt-4">
        <Label>For you: the eight stages</Label>
        <div className="mt-2 flex items-center gap-1.5" aria-hidden>
          {story.map((st) => (
            <span key={st.stage} className="flex flex-1 items-center gap-1.5">
              <Mark kind={kind(st.state)} />
              <span className="h-px flex-1" style={{ background: st.state === "todo" ? "var(--adm-line-strong)" : "var(--adm-ink)" }} />
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-sans text-[11px]" style={ink3}>
          <span>Paid · {shortDay(order.paid_at ?? order.created_at)}</span>
          <span style={{ color: "var(--adm-ink)", fontWeight: 600 }}>
            {curStep.label} · {story.indexOf(curStep) + 1} of {story.length}
          </span>
        </div>
      </div>
      {planLine ? (
        <div className="mt-3">
          <KV k="Plan">{planLine}</KV>
        </div>
      ) : null}
      <div className="mt-4">
        <Btn primary lit wide icon="send" onClick={onSend}>
          Send tracking
        </Btn>
      </div>
    </Modal>
  );
}
