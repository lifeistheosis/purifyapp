"use client";

// The support console: Messages, the owner's pick A (r3-16, 2026-10-30, "do
// A for messages"), with the console from his note 28 ("an easy support
// console": tracking, a refund, or making it up to them, in a few taps).
//
// Three panes on a desktop: the requests, the thread, and the reader beside
// it (the order asked about with its tracking step by step, their plan and
// where it was bought, their gifts), with Send tracking, Refund, Reship and
// Gift Plus. On a phone: the requests, then a request with its order riding
// over the thread and the four actions over the reply.
//
// Status is three words, waiting on you, on them, done (open, pending,
// resolved underneath). Sending a reply turns a request to waiting on them,
// as it always did (lib/support/tickets.ts addStaffReply).
//
// His four open questions are taken as drawn until he says: Plus as a
// switch that starts ON on a refund and a reship; refund or reship chosen by
// him here, never by the reader; our own steps and the carrier's link only;
// and no Help screen in the apps (support stays web only).
//
// Also /admin/support's console, which the ticket emails link to.

import { useCallback, useEffect, useRef, useState } from "react";

import { Email, Sensitive } from "./primitives";
import {
  GiftSheet,
  MakeItRightSheet,
  RefundSheet,
  StoreRefundSheet,
  TrackingSheet,
  type RefundDone,
  type ReshipDone,
  type SheetOrder,
} from "./needed/ConsoleSheets";
import { Bar5, Btn, Icon, Segmented, State, bubbleClass, bubbleOursClass, litClass, systemClass } from "./needed/parts";
import { OrderStrip, READER_ACTIONS, ReaderPane, type ReaderAction } from "./needed/ReaderPane";
import { take, takeInitial, writeParams } from "@/lib/admin/handoff";
import { readerSees } from "@/lib/admin/orderStory";
import {
  STATE_STATUS,
  STATE_WORD,
  asSentence,
  askedAbout,
  draftRefundReply,
  draftReshipReply,
  draftStoreReply,
  draftTrackingReply,
  inInbox,
  planLine,
  requestKind,
  requestState,
  storeRefundRule,
  type Inbox,
  type ReaderFile,
  type RequestState,
} from "@/lib/admin/support";
import { ageText, hoursBetween } from "@/lib/shop/funnel";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { ticketNumber, type Ticket, type TicketMessage } from "@/lib/support/ticketNumber";
import { cardHeadline, trackingCard } from "@/lib/support/trackingCard";

type FullTicket = Ticket & { messages: TicketMessage[] };
type Sheet = "tracking" | "refund" | "makeright" | "store" | "gift" | null;

const ink3 = { color: "var(--adm-ink-3)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function stateMark(s: RequestState) {
  return s === "done" ? ("done" as const) : ("wait" as const);
}

/** A row in the list of requests. */
function RequestRow({ t, on, onOpen, now }: { t: FullTicket; on: boolean; onOpen: () => void; now: Date }) {
  const state = requestState(t.status);
  const firstWords = t.messages.find((m) => m.author === "customer")?.body ?? "";
  const kind = requestKind({ orderId: t.order_id, subject: t.subject, body: firstWords });
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={on ? "true" : undefined}
        className={`block w-full rounded-[var(--adm-radius-sm)] px-2.5 py-2.5 text-left ${on ? litClass : ""}`}
        style={on ? { background: "var(--adm-panel-2)" } : { borderBottom: "1px solid var(--adm-line)" }}
      >
        <span className="flex items-center justify-between gap-2 font-sans text-[11.5px]">
          <span style={{ color: state === "done" ? "var(--adm-ink-2)" : "var(--adm-ink)" }}>
            <State kind={stateMark(state)}>{STATE_WORD[state]}</State>
          </span>
          <span style={ink3}>{ageText(hoursBetween(t.updated_at ?? t.created_at, now))}</span>
        </span>
        <span className="mt-1 block truncate font-sans text-[13px]" style={{ color: "var(--adm-ink)", fontWeight: state === "you" ? 600 : 500 }}>
          {t.subject}
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2 font-sans text-[11.5px]" style={ink3}>
          <span className="truncate">
            <Sensitive value={t.name} fallback="" />
            {t.name ? "" : <Email value={t.email} />}
          </span>
          {kind ? (
            <span className="shrink-0 rounded-[var(--adm-radius-xs)] px-1.5" style={{ background: "var(--adm-panel-2)", color: "var(--adm-ink-2)" }}>
              {kind}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

export function SupportConsole({
  initial,
  syncAddress = false,
}: {
  initial: FullTicket[];
  /** Name the open request in the admin's address (the Messages page does; /admin/support does not). */
  syncAddress?: boolean;
}) {
  const now = new Date();
  const [tickets, setTickets] = useState<FullTicket[]>(initial);
  const [inbox, setInbox] = useState<Inbox>("waiting");
  // A request named in the address (#tab=messages&t=TKT-...), or an order
  // handed over from its page (Reply), opened once the list is in.
  const [handed] = useState(() => {
    const note = take("messages");
    return {
      ticket: takeInitial(["messages"], "t"),
      order: note?.order ?? null,
      email: note?.email ?? null,
    };
  });
  const matched = (() => {
    if (handed.ticket) {
      const want = handed.ticket.toUpperCase();
      return tickets.find((t) => ticketNumber(t.id) === want || t.id === handed.ticket) ?? null;
    }
    if (handed.order) {
      const email = handed.email?.toLowerCase() ?? null;
      return (
        tickets.find((t) => t.order_id === handed.order) ??
        (email ? tickets.find((t) => t.email.toLowerCase() === email && requestState(t.status) !== "done") : undefined) ??
        (email ? tickets.find((t) => t.email.toLowerCase() === email) : undefined) ??
        null
      );
    }
    return null;
  })();
  const [selectedId, setSelectedId] = useState<string | null>(matched?.id ?? null);
  const [threadOpen, setThreadOpen] = useState(Boolean(matched));
  // An order handed over with no request about it: a new message to its buyer.
  const [newFor, setNewFor] = useState<string | null>(!matched && handed.order ? handed.order : null);

  const visible = tickets.filter((t) => inInbox(t.status, inbox));
  const onYou = visible.filter((t) => requestState(t.status) === "you");
  const onThem = visible.filter((t) => requestState(t.status) === "them");
  const done = visible.filter((t) => requestState(t.status) === "done");
  const counts = {
    waiting: tickets.filter((t) => requestState(t.status) === "you").length,
    them: tickets.filter((t) => requestState(t.status) === "them").length,
    done: tickets.filter((t) => requestState(t.status) === "done").length,
  };
  const selected = tickets.find((t) => t.id === selectedId) ?? (newFor ? null : (onYou[0] ?? visible[0] ?? null));

  const [files, setFiles] = useState<Record<string, ReaderFile | "failed">>({});
  const [reply, setReply] = useState("");
  const [cardOrder, setCardOrder] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const replyRef = useRef<HTMLTextAreaElement | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/support", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { tickets?: FullTicket[] };
    if (Array.isArray(data.tickets)) setTickets(data.tickets);
  }, []);

  const loadFile = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`/api/admin/support/reader?ticket=${encodeURIComponent(ticketId)}`, { cache: "no-store" });
      const body = res.ok ? ((await res.json()) as ReaderFile) : null;
      setFiles((f) => ({ ...f, [ticketId]: body ?? "failed" }));
    } catch {
      setFiles((f) => ({ ...f, [ticketId]: "failed" }));
    }
  }, []);

  const selectedKey = selected?.id ?? null;
  const haveFile = selectedKey ? selectedKey in files : true;
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- reads who
       wrote the open request once; every write is past an await. */
    if (selectedKey && !haveFile) void loadFile(selectedKey);
  }, [selectedKey, haveFile, loadFile]);

  // The address names the open request, so a reload or a bookmark lands on it.
  useEffect(() => {
    if (syncAddress && selectedKey) writeParams("messages", { t: ticketNumber(selectedKey) });
  }, [syncAddress, selectedKey]);

  const raw = selectedKey ? files[selectedKey] : undefined;
  const file = raw && raw !== "failed" ? raw : null;
  const asked =
    selected && file
      ? askedAbout(
          { order_id: selected.order_id, texts: [selected.subject, ...selected.messages.filter((m) => m.author === "customer").map((m) => m.body)] },
          file.orders,
        )
      : null;
  const order = asked && file ? (file.orders.find((o) => o.id === asked.orderId) ?? null) : null;
  const sheetOrder: SheetOrder | null = order ? { ...order, events: order.events } : null;
  const firstWords = selected?.messages.find((m) => m.author === "customer")?.body ?? "";
  const kind = selected ? requestKind({ orderId: selected.order_id, subject: selected.subject, body: firstWords }) : null;
  const rule = storeRefundRule(file?.plan?.source ?? null);
  const name = file?.reader.name ?? selected?.name ?? null;

  function openTicket(id: string) {
    setSelectedId(id);
    setThreadOpen(true);
    setNewFor(null);
    setNote(null);
    setReply("");
    setCardOrder(null);
  }

  /** Put a draft in the reply box: the whole draft when it is empty, else after what is there. */
  function putInReply(text: string) {
    setReply((r) => (r.trim() ? `${r.trimEnd()}\n\n${text}` : text));
    requestAnimationFrame(() => replyRef.current?.focus());
  }

  async function changeState(s: RequestState) {
    if (!selected) return;
    const status = STATE_STATUS[s];
    setTickets((ts) => ts.map((t) => (t.id === selected.id ? { ...t, status } : t)));
    await fetch("/api/admin/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", ticketId: selected.id, status }),
    }).catch(() => {});
    await refresh();
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          ticketId: selected.id,
          body: reply.trim(),
          ...(cardOrder ? { cardOrderId: cardOrder } : {}),
        }),
      });
      if (res.ok) {
        setReply("");
        setCardOrder(null);
        setNote("Sent and emailed. It is waiting on them now.");
        await refresh();
      } else {
        setNote("The reply did not send.");
      }
    } catch {
      setNote("The reply did not send: the network dropped.");
    } finally {
      setBusy(false);
    }
  }

  function canAct(a: ReaderAction): boolean {
    if (!file) return false;
    if (a === "tracking") return Boolean(order);
    if (a === "reship") return Boolean(order && order.payment_status === "paid");
    if (a === "refund") return Boolean((order && order.payment_status === "paid") || file.plan?.tier);
    return Boolean(file.reader.email);
  }

  function act(a: ReaderAction) {
    if (a === "refund") {
      // A request about Plus, or a reader with no order to refund, is about
      // their plan: only the store it was bought in can refund that.
      if (kind === "Plus" || !order || order.payment_status !== "paid") setSheet("store");
      else setSheet("refund");
      return;
    }
    setSheet(a === "reship" ? "makeright" : a);
  }

  function afterRefund(r: RefundDone) {
    setSheet(null);
    putInReply(draftRefundReply(name, `$${(r.amountCents / 100).toFixed(2)}`, r.giftDays));
    setNote(r.giftError ? `Refunded. The gift did not send: ${r.giftError}` : "Refunded. The reply is drafted below: read it, then Send.");
    if (selectedKey) void loadFile(selectedKey);
  }

  function afterReship(r: ReshipDone) {
    setSheet(null);
    putInReply(draftReshipReply(name, order?.items[0]?.title ?? null, r.giftDays));
    setNote(r.giftError ? `It goes again. The gift did not send: ${r.giftError}` : "It goes again at no charge. The reply is drafted below.");
    if (selectedKey) void loadFile(selectedKey);
  }

  const card = order ? trackingCard(order, order.events) : null;
  const matchedLine = order
    ? asked?.how === "number"
      ? `matched to ${orderConfirmationNumber(order.id)}, the number in the message`
      : asked?.how === "ticket"
        ? `about ${orderConfirmationNumber(order.id)}, the order the form named`
        : `their last order is ${orderConfirmationNumber(order.id)}; the message names none`
    : null;
  const state = selected ? requestState(selected.status) : null;
  const fromForm = selected?.messages[0]?.author !== "staff";

  if (tickets.length === 0 && !newFor) {
    return (
      <p className="rounded-[var(--adm-radius)] border p-8 text-center font-sans text-[13px]" style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-2)" }}>
        No requests yet. When a reader writes through the contact form, it lands here.
      </p>
    );
  }

  return (
    <div className="lg:flex lg:min-h-[560px] lg:gap-4">
      {/* The requests. */}
      <aside className={`lg:w-[250px] lg:flex-none ${threadOpen ? "hidden lg:block" : ""}`}>
        <Segmented
          full
          label="Which requests"
          value={inbox}
          onChange={(v) => {
            setInbox(v);
            setSelectedId(null);
          }}
          options={[
            ["waiting", "Waiting", counts.waiting],
            ["them", "On them", counts.them],
            ["done", "Done", null],
          ]}
        />
        <ul className="mt-2 space-y-px">
          {(inbox === "waiting" ? onYou : inbox === "them" ? onThem : done).map((t) => (
            <RequestRow key={t.id} t={t} on={t.id === selected?.id} onOpen={() => openTicket(t.id)} now={now} />
          ))}
        </ul>
        {inbox === "waiting" && onThem.length ? (
          <>
            <p className="mt-3 px-1 font-sans text-[11px]" style={ink3}>
              Answered, waiting on them
            </p>
            <ul className="mt-1 space-y-px">
              {onThem.map((t) => (
                <RequestRow key={t.id} t={t} on={t.id === selected?.id} onOpen={() => openTicket(t.id)} now={now} />
              ))}
            </ul>
          </>
        ) : null}
        {visible.length === 0 ? (
          <p className="mt-4 px-1 font-sans text-[12.5px]" style={ink3}>
            {inbox === "done" ? "Nothing finished yet." : "Nobody is waiting."}
          </p>
        ) : null}
      </aside>

      {/* The thread, or a new message for an order handed over from its page. */}
      <section className={`flex min-w-0 flex-1 flex-col rounded-[var(--adm-radius)] lg:border lg:p-4 ${threadOpen ? "" : "hidden lg:flex"}`} style={{ borderColor: "var(--adm-line)" }}>
        <button
          type="button"
          onClick={() => setThreadOpen(false)}
          className="mb-1 inline-flex min-h-11 items-center gap-1 self-start font-sans text-[14px] lg:hidden"
          style={ink2}
        >
          <Icon name="back" size={18} />
          Messages
          {selected ? <span className="ml-2 font-mono text-[11px]" style={ink3}>{ticketNumber(selected.id)}</span> : null}
        </button>

        {newFor ? (
          <NewMessage
            orderId={newFor}
            email={handed.email}
            onCancel={() => setNewFor(null)}
            onSent={async (ticketId) => {
              setNewFor(null);
              await refresh();
              openTicket(ticketId);
              setInbox("them");
            }}
          />
        ) : selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-sans text-[18px] font-semibold leading-snug md:text-[17px]" style={{ color: "var(--adm-ink)" }}>
                  {selected.subject}
                </h2>
                <p className="mt-1 font-sans text-[12px]" style={ink3}>
                  <Sensitive value={selected.name} fallback="" />
                  {selected.name ? " · " : ""}
                  <span className="font-mono">{ticketNumber(selected.id)}</span> · {fromForm ? "from the contact form" : "started by you"}
                </p>
              </div>
              {state ? (
                <Segmented
                  label="Where it stands"
                  value={state}
                  onChange={(s) => void changeState(s)}
                  options={[
                    ["you", "On you"],
                    ["them", "On them"],
                    ["done", "Done"],
                  ]}
                />
              ) : null}
            </div>

            {/* The order rides over the thread on a phone. */}
            <div className="lg:hidden">
              <OrderStrip file={file} asked={asked} onOpen={() => order && setSheet("tracking")} />
            </div>

            {matchedLine ? <p className={`mt-4 ${systemClass}`}>{matchedLine}</p> : null}

            <ol className="mt-4 flex flex-col gap-3">
              {selected.messages.map((m) => (
                <li key={m.id} className={`max-w-[88%] ${m.author === "staff" ? "self-end" : "self-start"}`}>
                  <div className={`${bubbleClass} ${m.author === "staff" ? bubbleOursClass : ""}`}>
                    <p className="mb-1 font-sans text-[11px]" style={ink3}>
                      {m.author === "staff" ? "You" : (selected.name ?? "They")} · {when(m.created_at)}
                      {m.author === "staff" ? " · emailed" : ""}
                    </p>
                    {m.body}
                  </div>
                </li>
              ))}
            </ol>

            {/* The reply. The four actions sit over it on a phone. */}
            <div className="mt-auto pt-5">
              <div className="mb-2 flex gap-1.5 lg:hidden">
                {READER_ACTIONS.map(([a, label, icon], i) => (
                  <Btn key={a} tall primary={i === 0} lit={i === 0 && canAct(a)} icon={icon} disabled={!canAct(a)} onClick={() => act(a)}>
                    {label === "Send tracking" ? "Tracking" : label}
                  </Btn>
                ))}
              </div>
              <textarea
                ref={replyRef}
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={`Write a reply. It emails ${selected.name ?? "them"}.`}
                className="w-full rounded-[var(--adm-radius)] border px-3 py-2.5 font-sans text-[13px] leading-relaxed outline-none"
                style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" }}
              />
              {cardOrder && card ? (
                <div className="mt-2 rounded-[var(--adm-radius)] p-2.5" style={{ background: "var(--adm-panel-2)" }}>
                  <p className="flex items-center justify-between font-sans text-[11px]" style={ink3}>
                    <span>The card they get in the email</span>
                    <button type="button" onClick={() => setCardOrder(null)} className="underline underline-offset-[3px]">
                      Leave it out
                    </button>
                  </p>
                  <p className="mt-1.5 flex items-center justify-between font-sans text-[12px] font-semibold" style={{ color: "var(--adm-ink)" }}>
                    <span>{cardHeadline(card, Intl.DateTimeFormat().resolvedOptions().timeZone)}</span>
                    {card.step > 0 ? (
                      <span className="font-normal" style={ink2}>
                        step {card.step} of {card.of}
                      </span>
                    ) : null}
                  </p>
                  {card.step > 0 ? (
                    <div className="mt-1.5">
                      <Bar5 step={card.step} of={card.of} />
                    </div>
                  ) : null}
                  {card.url ? (
                    <p className="mt-1.5 font-sans text-[11.5px] underline underline-offset-[3px]" style={ink2}>
                      {card.carrier ? `Track with ${card.carrier}` : "Track the parcel"}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3 font-sans text-[12px]" style={ink2}>
                  <button
                    type="button"
                    disabled={!order}
                    onClick={() => order && setSheet("tracking")}
                    className="inline-flex min-h-9 items-center gap-1.5 disabled:opacity-45"
                  >
                    <Icon name="track" size={14} />
                    Put in tracking
                  </button>
                  <button
                    type="button"
                    disabled={!order}
                    onClick={() => {
                      if (!order) return;
                      const sees = readerSees(order);
                      putInReply(
                        asSentence(
                          `your order ${orderConfirmationNumber(order.id)} (${order.items.map((i) => `${i.quantity} x ${i.title}`).join(", ")}) reads ${sees.word}${sees.step ? `, step ${sees.step} of ${sees.of}` : ""}.`,
                        ),
                      );
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 disabled:opacity-45"
                  >
                    <Icon name="orders" size={14} />
                    Put in the order
                  </button>
                </div>
                <Btn primary icon="send" busy={busy} disabled={!reply.trim()} onClick={() => void sendReply()}>
                  Send
                </Btn>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 font-sans text-[11.5px]" style={ink3}>
                <State kind="wait">Sending turns it to waiting on them.</State>
              </p>
              {note ? (
                <p role="status" className="mt-1.5 font-sans text-[12px]" style={{ color: "var(--adm-ink)" }}>
                  {note}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="font-sans text-[13px]" style={ink3}>
            Pick a request.
          </p>
        )}
      </section>

      {/* The reader beside it, on a desktop. */}
      {selected && !newFor ? (
        <aside className="hidden rounded-[var(--adm-radius)] border p-3.5 lg:block lg:w-[300px] lg:flex-none" style={{ borderColor: "var(--adm-line)" }}>
          <ReaderPane file={file} asked={asked} failedToLoad={raw === "failed"} onAction={act} canAct={canAct} />
        </aside>
      ) : null}

      {sheet === "tracking" && sheetOrder ? (
        <TrackingSheet
          order={sheetOrder}
          name={name}
          planLine={planLine(file?.plan ?? null)}
          onClose={() => setSheet(null)}
          onSend={() => {
            setSheet(null);
            putInReply(
              draftTrackingReply({
                name,
                piece: order?.items.length === 1 ? order.items[0].title : null,
                ...readerSees(sheetOrder),
                at: card?.at ?? null,
                tracking: sheetOrder.outbound_tracking,
              }),
            );
            setCardOrder(sheetOrder.id);
          }}
        />
      ) : null}
      {sheet === "refund" && sheetOrder ? (
        <RefundSheet order={sheetOrder} name={name} ticketId={selected?.id} onClose={() => setSheet(null)} onDone={afterRefund} />
      ) : null}
      {sheet === "makeright" && sheetOrder && file ? (
        <MakeItRightSheet
          order={sheetOrder}
          name={name}
          reason={selected?.subject ?? ""}
          ticketId={selected?.id}
          sides={file}
          onClose={() => setSheet(null)}
          onReshipped={afterReship}
          onRefunded={afterRefund}
        />
      ) : null}
      {sheet === "store" && file ? (
        <StoreRefundSheet
          name={name}
          tier={file.plan?.tier ?? null}
          source={file.plan?.source ?? null}
          rule={rule}
          onClose={() => setSheet(null)}
          onPutPage={() => {
            setSheet(null);
            const draft = reply.trim() ? null : draftStoreReply(name, rule, null);
            if (draft) putInReply(draft);
            else if (rule.replyLine) putInReply(asSentence(rule.replyLine));
          }}
          onGift={() => setSheet("gift")}
        />
      ) : null}
      {sheet === "gift" ? (
        <GiftSheet
          name={name}
          email={file?.reader.email ?? selected?.email ?? null}
          rule={kind === "Plus" ? rule : null}
          onClose={() => setSheet(null)}
          onSent={(days) => {
            setSheet(null);
            setNote(`A gift of ${days >= 365 ? "1 year" : `${Math.round(days / 30)} month${days === 30 ? "" : "s"}`} of Plus is waiting for them.`);
            if (selectedKey) void loadFile(selectedKey);
          }}
        />
      ) : null}
    </div>
  );
}

/** A message he starts to an order's buyer, when they have not written. */
function NewMessage({
  orderId,
  email,
  onCancel,
  onSent,
}: {
  orderId: string;
  email: string | null;
  onCancel: () => void;
  onSent: (ticketId: string) => void | Promise<void>;
}) {
  const number = orderConfirmationNumber(orderId);
  const [subject, setSubject] = useState(`Your order ${number}`);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", orderId, subject: subject.trim(), body: body.trim() }),
      });
      const d = (await res.json().catch(() => ({}))) as { ticketId?: string; error?: string };
      if (!res.ok || !d.ticketId) {
        setError(d.error ?? "It did not send.");
        return;
      }
      await onSent(d.ticketId);
    } catch {
      setError("It did not send: the network dropped.");
    } finally {
      setBusy(false);
    }
  }

  const field = { borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" } as const;
  return (
    <div>
      <h2 className="font-sans text-[17px] font-semibold" style={{ color: "var(--adm-ink)" }}>
        A new message about {number}
      </h2>
      <p className="mt-1 font-sans text-[12px]" style={ink3}>
        They have not written about this order, so this starts the conversation. It goes to{" "}
        {email ? <Email value={email} /> : "the address the order was bought with"}, and their answer lands here.
      </p>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={200}
        aria-label="Subject"
        className="mt-4 w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[13px] outline-none"
        style={field}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        aria-label="Message"
        placeholder="Write to them. It emails them, and their answer comes back here."
        className="mt-2 w-full rounded-[var(--adm-radius)] border px-3 py-2.5 font-sans text-[13px] leading-relaxed outline-none"
        style={field}
      />
      {error ? (
        <p role="alert" className="mt-2 font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn primary icon="send" busy={busy} disabled={!subject.trim() || !body.trim()} onClick={() => void send()}>
          Send
        </Btn>
      </div>
    </div>
  );
}
