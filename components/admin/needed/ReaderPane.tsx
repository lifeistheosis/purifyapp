"use client";

// The reader beside the request (Messages, the owner's pick A, r3-16): who
// wrote, the order they asked about with its tracking step by step, their
// plan and where they bought it, their gifts, and the four actions: Send
// tracking, Refund, Reship, Gift Plus. On a phone the order rides over the
// thread as a strip instead (OrderStrip below), and the actions sit over the
// reply.

import { Email, Sensitive } from "../primitives";
import { Bar5, Btn, Icon, Label, Ladder, State, Thumb, dollars, litClass, type IconName } from "./parts";
import { readerSees, readerSteps, stageWord } from "@/lib/admin/orderStory";
import { giftsLine, planLine, readerSince, type AskedAbout, type ReaderFile } from "@/lib/admin/support";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { trackingLink } from "@/lib/shop/trackingLink";

export type ReaderAction = "tracking" | "refund" | "reship" | "gift";

export const READER_ACTIONS: [ReaderAction, string, IconName][] = [
  ["tracking", "Send tracking", "track"],
  ["refund", "Refund", "refund"],
  ["reship", "Reship", "reship"],
  ["gift", "Gift Plus", "gift"],
];

const ink3 = { color: "var(--adm-ink-3)" } as const;
const shortDay = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

type FileOrder = ReaderFile["orders"][number];

/** What one line says about where an order is: "Shipped Oct 24 · USPS · step 4 of 5". */
export function orderLine(o: FileOrder): string {
  const sees = readerSees(o);
  const steps = readerSteps(o, o.events);
  const at = steps.find((st) => st.state === "now" || (st.state === "done" && st.word === "Delivered"))?.at ?? null;
  const carrier = o.outbound_tracking ? trackingLink(o.outbound_tracking)?.carrier : null;
  return [
    `${sees.word}${at ? ` ${shortDay(at)}` : ""}`,
    carrier,
    sees.step > 0 ? `step ${sees.step} of ${sees.of}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function ReaderPane({
  file,
  asked,
  failedToLoad,
  onAction,
  canAct,
}: {
  file: ReaderFile | null;
  asked: AskedAbout | null;
  failedToLoad: boolean;
  onAction: (a: ReaderAction) => void;
  canAct: (a: ReaderAction) => boolean;
}) {
  if (failedToLoad) {
    return (
      <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
        Who wrote could not be read. Their orders and plan are not shown, which is not the same as them having none.
      </p>
    );
  }
  if (!file) {
    return (
      <p className="font-sans text-[12.5px]" style={ink3}>
        Finding their orders and plan…
      </p>
    );
  }

  const order = asked ? (file.orders.find((o) => o.id === asked.orderId) ?? null) : null;
  const others = file.orders.filter((o) => o.id !== order?.id);
  const since = readerSince(file.reader.since, new Date());
  const plan = planLine(file.plan);
  const first = order?.items[0];
  const img = first?.product_id ? file.imageByProduct[first.product_id] : undefined;
  const link = order?.outbound_tracking ? trackingLink(order.outbound_tracking) : null;

  return (
    <div>
      <p className="font-sans text-[14px] font-semibold" style={{ color: "var(--adm-ink)" }}>
        <Sensitive value={file.reader.name} fallback="No name on file" />
      </p>
      <p className="mt-0.5 font-sans text-[11.5px]" style={ink3}>
        <Email value={file.reader.email} />
        {since ? ` · ${since}` : ""}
      </p>

      {file.failed.length ? (
        <p className="mt-2 font-sans text-[11.5px]" style={{ color: "var(--adm-warn)" }}>
          Could not read: {file.failed.join(", ")}.
        </p>
      ) : null}

      <div className="mt-4">
        <Label>{asked?.how === "latest" ? "Their last order" : "Asked about"}</Label>
      </div>
      {order ? (
        <div className="mt-1.5 rounded-[var(--adm-radius)] border p-3" style={{ borderColor: "var(--adm-line)" }}>
          <div className="flex items-center gap-2.5">
            <Thumb src={img} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-[13px] font-medium" style={{ color: "var(--adm-ink)" }}>
                {order.items.map((i) => i.title).join(", ") || "No pieces recorded"}
              </p>
              <p className="font-sans text-[11.5px]" style={ink3}>
                <span className="font-mono">{orderConfirmationNumber(order.id)}</span> · {dollars(order.total_cents)} · paid{" "}
                {shortDay(order.paid_at ?? order.created_at)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Ladder
              label="What they see on their order"
              steps={readerSteps(order, order.events).map((st) => ({
                label: st.word,
                state: st.state,
                note: shortDay(st.at),
                sub: st.state === "now" && st.word === "Shipped" && link ? `${link.carrier ?? "Carrier"} · tracking emailed to them` : null,
              }))}
            />
          </div>
          {order.payment_status === "refunded" || order.refund ? (
            <p className="mt-2 font-sans text-[11.5px]" style={ink3}>
              {order.payment_status === "refunded"
                ? "Refunded."
                : `Refund ${order.refund?.status}${order.refund?.amount_cents ? `, ${dollars(order.refund.amount_cents)}` : ""}.`}
            </p>
          ) : null}
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t pt-2 font-sans text-[11.5px]" style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-2)" }}>
            <span className="truncate font-mono">{order.outbound_tracking ?? "No tracking yet"}</span>
            {link ? (
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 underline underline-offset-[3px]">
                {link.carrier ?? "Track"} <Icon name="ext" size={11} />
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-1.5 font-sans text-[12px]" style={ink3}>
          {file.orders.length === 0 ? "No orders under this address or account." : "No order is named in the request."}
        </p>
      )}
      {others.length ? (
        <ul className="mt-2 space-y-1">
          {others.slice(0, 4).map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 font-sans text-[11.5px]" style={ink3}>
              <span className="font-mono">{orderConfirmationNumber(o.id)}</span>
              <span className="truncate">{stageWord(o)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4">
        <Label>Plan</Label>
      </div>
      {plan ? (
        <>
          <p className="mt-1.5 flex items-center justify-between gap-2 font-sans text-[12.5px]">
            <State kind="done">{plan.split(" · ")[0]}</State>
            <span style={ink3}>{plan.split(" · ")[1] ?? ""}</span>
          </p>
          <p className="mt-0.5 font-sans text-[11.5px]" style={ink3}>
            {file.plan?.renews ? `Renews ${shortDay(file.plan.renews)}` : file.plan?.until ? `Runs to ${shortDay(file.plan.until)}` : ""}
            {" · "}
            {giftsLine(file.gifts)}
          </p>
        </>
      ) : (
        <p className="mt-1.5 font-sans text-[12px]" style={ink3}>
          No plan now · {giftsLine(file.gifts)}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {READER_ACTIONS.map(([a, label, icon], i) => (
          <Btn key={a} small primary={i === 0} lit={i === 0 && canAct(a)} icon={icon} onClick={() => onAction(a)} disabled={!canAct(a)}>
            {label}
          </Btn>
        ))}
      </div>
    </div>
  );
}

/** The order over the thread on a phone: tap it for its steps. */
export function OrderStrip({
  file,
  asked,
  onOpen,
}: {
  file: ReaderFile | null;
  asked: AskedAbout | null;
  onOpen: () => void;
}) {
  const order = asked && file ? (file.orders.find((o) => o.id === asked.orderId) ?? null) : null;
  if (!order || !file) {
    const plan = planLine(file?.plan ?? null);
    return plan ? (
      <div className="mt-3 rounded-[var(--adm-radius)] border p-3 font-sans text-[12.5px]" style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-2)" }}>
        <span className="inline-flex items-center gap-2">
          <Icon name="phone" size={18} />
          {plan}
        </span>
      </div>
    ) : null;
  }
  const sees = readerSees(order);
  const first = order.items[0];
  const img = first?.product_id ? file.imageByProduct[first.product_id] : undefined;
  const plan = planLine(file.plan);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mt-3 block w-full rounded-[var(--adm-radius)] border p-3 text-left ${litClass}`}
      style={{ borderColor: "var(--adm-line)" }}
    >
      <span className="flex items-center gap-2.5">
        <Thumb src={img} size={38} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-[13px] font-medium" style={{ color: "var(--adm-ink)" }}>
            <span className="font-mono">{orderConfirmationNumber(order.id)}</span> · {first?.title ?? "order"}
          </span>
          <span className="mt-0.5 block font-sans text-[11.5px]" style={{ color: "var(--adm-ink-2)" }}>
            {orderLine(order)}
          </span>
        </span>
        <Icon name="down" size={16} />
      </span>
      {sees.step > 0 ? (
        <span className="mt-2.5 block">
          <Bar5 step={sees.step} of={sees.of} />
        </span>
      ) : null}
      {plan ? (
        <span className="mt-2 block font-sans text-[11.5px]" style={ink3}>
          {plan}
        </span>
      ) : null}
    </button>
  );
}
