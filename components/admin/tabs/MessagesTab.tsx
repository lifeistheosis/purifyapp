"use client";

// Messages, the owner's pick A (r3-16, 2026-10-30): the requests, the
// thread, and the reader beside it, with the support console from his note
// 28 (components/admin/SupportConsole.tsx). The shop's buyer and store
// threads are one quiet link away at the top, read-only oversight with
// close and reopen, the same routes the Marketplace uses.

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, StatCard, DataTable, Email, Pill, ToolbarButton } from "../primitives";
import { SupportConsole } from "../SupportConsole";
import { Icon } from "../needed/parts";
import type { Ticket, TicketMessage } from "@/lib/support/ticketNumber";

type FullTicket = Ticket & { messages: TicketMessage[] };

type ShopConv = {
  id: string;
  subject: string;
  status: "open" | "closed";
  last_message_at: string | null;
  buyer_email: string | null;
  store: { public_name: string | null } | null;
};
type ShopMsg = {
  id: string;
  sender: "buyer" | "seller";
  body: string;
  created_at: string;
};

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Support (reuses SupportConsole) ───────────────────────────────────── */

function SupportInbox() {
  const [tickets, setTickets] = useState<FullTicket[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await adminJson<{ tickets?: FullTicket[] }>("/api/admin/support");
        if (!alive) return;
        // adminJson returns null for any non-ok response, so `d?.tickets ?? []`
        // turned a 403 or a 500 into an empty inbox and painted two literal
        // zeros over it. Nobody has written in and we could not ask are not
        // the same fact, and only one of them is a reason to stop checking.
        if (d === null) {
          setFailed(true);
          return;
        }
        setTickets(d.tickets ?? []);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <p className="font-sans text-detail" style={{ color: "var(--adm-critical)" }}>
        The support inbox could not be read. This is not an empty inbox, so nothing here is
        saying there are no tickets. Reload, and sign in again if that does not help.
      </p>
    );
  }

  if (!tickets) {
    return <p className="font-sans text-detail text-paper/45">Reading the requests…</p>;
  }
  return <SupportConsole initial={tickets} syncAddress />;
}

/* ── Shop conversations (read-only + close/reopen) ─────────────────────── */

function ShopInbox() {
  const [convs, setConvs] = useState<ShopConv[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ShopMsg[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await adminJson<{ conversations?: ShopConv[] }>(
          "/api/admin/shop/conversations",
        );
        if (alive && d) setConvs(d.conversations ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!openId) return;
    let alive = true;
    (async () => {
      const r = await fetch(`/api/admin/shop/conversations?id=${openId}`, {
        cache: "no-store",
      });
      if (!alive) return;
      if (!r.ok) {
        setStatus("Couldn't load the thread.");
        return;
      }
      const d = (await r.json()) as { messages: ShopMsg[] };
      setMessages(d.messages);
    })();
    return () => {
      alive = false;
    };
  }, [openId]);

  async function setThreadStatus(c: ShopConv, s: "open" | "closed") {
    setStatus(null);
    const res = await fetch("/api/admin/shop/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: c.id, status: s }),
    });
    if (!res.ok) setStatus("Update failed.");
    else setReloadKey((k) => k + 1);
  }

  const opened = convs.find((c) => c.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Conversations" value={convs.length} />
        <StatCard
          label="Open"
          value={convs.filter((c) => c.status === "open").length}
          accent
        />
      </div>

      {status && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {status}
        </p>
      )}

      <Card
        title="Buyer / store threads"
        subtitle="Read-only oversight; replies belong to the store's console."
      >
        <DataTable<ShopConv>
          csvFilename="shop-conversations.csv"
          rows={convs}
          rowKey={(c) => c.id}
          empty="No conversations yet."
          columns={[
            { key: "subject", label: "Subject", render: (c) => c.subject, csv: (c) => c.subject },
            {
              key: "store",
              label: "Store",
              render: (c) => c.store?.public_name ?? "—",
              csv: (c) => c.store?.public_name ?? "",
            },
            {
              key: "buyer",
              label: "Buyer",
              render: (c) => <Email value={c.buyer_email} />,
              csv: (c) => c.buyer_email ?? "",
            },
            {
              key: "last",
              label: "Last message",
              render: (c) => shortDate(c.last_message_at),
              csv: (c) => c.last_message_at ?? "",
            },
            {
              key: "status",
              label: "Status",
              render: (c) => (
                <Pill tone={c.status === "open" ? "emerald" : "neutral"}>
                  {c.status}
                </Pill>
              ),
              csv: (c) => c.status,
            },
            {
              key: "actions",
              label: "",
              render: (c) => (
                <div className="flex justify-end gap-1.5">
                  <ToolbarButton
                    onClick={() => {
                      setMessages(null);
                      setOpenId(openId === c.id ? null : c.id);
                    }}
                  >
                    {openId === c.id ? "Hide" : "Read"}
                  </ToolbarButton>
                  <ToolbarButton
                    variant={c.status === "open" ? "danger" : "default"}
                    onClick={() =>
                      setThreadStatus(c, c.status === "open" ? "closed" : "open")
                    }
                  >
                    {c.status === "open" ? "Close" : "Reopen"}
                  </ToolbarButton>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {opened && (
        <Card
          title={`Thread · ${opened.subject}`}
          subtitle={
            <>
              {opened.store?.public_name ?? "Store"} ↔{" "}
              <Email value={opened.buyer_email} fallback="buyer" />
            </>
          }
          accent
        >
          {!messages ? (
            <p className="font-sans text-detail text-paper/45">Loading…</p>
          ) : (
            <ol className="space-y-2">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={
                    "max-w-[75%] rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-detail " +
                    (m.sender === "seller"
                      ? "ml-auto border-gold/25 bg-gold/[0.06] text-paper"
                      : "border-paper/12 bg-paper/[0.03] text-paper/85")
                  }
                >
                  <p className="mb-0.5 font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
                    {m.sender === "seller" ? "Store" : "Buyer"} ·{" "}
                    {shortDate(m.created_at)}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </div>
  );
}

/* ── Tab shell ─────────────────────────────────────────────────────────── */

type Panel = "support" | "shop";

/**
 * The requests are the page; the shop's threads are a quiet link at its
 * top right, as drawn ("Shop threads 1 >"), with their open count.
 */
export function MessagesTab() {
  const [panel, setPanel] = useState<Panel>("support");
  const [openThreads, setOpenThreads] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void adminJson<{ conversations?: { status: string }[] }>("/api/admin/shop/conversations").then((d) => {
      if (alive && d) setOpenThreads((d.conversations ?? []).filter((c) => c.status === "open").length);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setPanel(panel === "support" ? "shop" : "support")}
          className="inline-flex min-h-9 items-center gap-1.5 font-sans text-[12.5px]"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {panel === "support" ? (
            <>
              Shop threads
              {openThreads ? (
                <span className="font-mono text-[11.5px]" style={{ color: "var(--adm-ink-2)" }}>
                  {openThreads}
                </span>
              ) : null}
              <Icon name="chev" size={12} />
            </>
          ) : (
            <>
              <Icon name="back" size={12} />
              Back to the requests
            </>
          )}
        </button>
      </div>
      {panel === "support" ? <SupportInbox /> : <ShopInbox />}
    </div>
  );
}
