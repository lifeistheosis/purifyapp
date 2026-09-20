"use client";

// Everyone with an account and the email they have had, with one person's
// whole history a click away.

import { useCallback, useEffect, useMemo, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import type { PersonRow } from "@/app/api/admin/email/people/route";

import {
  Card,
  DataTable,
  Email,
  Modal,
  Pill,
  SearchInput,
  ToolbarButton,
} from "../primitives";
import { Select } from "../Select";

type Feed = {
  people: PersonRow[];
  complete: boolean;
  historyStart: string | null;
  ledgerError: string | null;
};

type Sort = "joined_desc" | "joined_asc" | "most" | "fewest" | "last";
type Filter = "all" | "never" | "lists" | "failed";

type History = {
  person: {
    id: string;
    email: string;
    joinedAt: string;
    lastSignInAt: string | null;
  };
  sends: {
    mailing: string;
    subject: string;
    status: string;
    error: string | null;
    at: string;
  }[];
};

const PAGE = 50;

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

const SORTS: { value: Sort; label: string }[] = [
  { value: "joined_desc", label: "Newest first" },
  { value: "joined_asc", label: "Oldest first" },
  { value: "most", label: "Most emails" },
  { value: "fewest", label: "Fewest emails" },
  { value: "last", label: "Most recently emailed" },
];

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "never", label: "Never emailed" },
  { value: "lists", label: "On a list" },
  { value: "failed", label: "Had a failure" },
];

function day(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
}

export function PeopleCard() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("joined_desc");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<PersonRow | null>(null);
  // Keyed by person, so opening a second person shows "reading" rather than
  // the first person's history, without clearing state from inside an effect.
  const [history, setHistory] = useState<{
    id: string;
    data: History | null;
  } | null>(null);

  const load = useCallback(async () => {
    const d = await adminJson<Feed>("/api/admin/email/people");
    setFeed(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- shares its
       path with Refresh; every write is past an await. */
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const id = open.id;
    void adminJson<History>(`/api/admin/email/people/${id}`).then((h) => {
      if (alive) setHistory({ id, data: h });
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const shown = open && history?.id === open.id ? history.data : null;

  const rows = useMemo(() => {
    const all = feed?.people ?? [];
    const q = query.trim().toLowerCase();
    const kept = all.filter((p) => {
      if (q && !p.email.toLowerCase().includes(q)) return false;
      if (filter === "never") return p.received === 0;
      if (filter === "lists") return p.shop || p.updates;
      if (filter === "failed") return p.failed > 0;
      return true;
    });
    const at = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0);
    const by: Record<Sort, (a: PersonRow, b: PersonRow) => number> = {
      joined_desc: (a, b) => at(b.joinedAt) - at(a.joinedAt),
      joined_asc: (a, b) => at(a.joinedAt) - at(b.joinedAt),
      most: (a, b) =>
        b.received - a.received || at(b.joinedAt) - at(a.joinedAt),
      fewest: (a, b) =>
        a.received - b.received || at(a.joinedAt) - at(b.joinedAt),
      last: (a, b) => at(b.lastAt) - at(a.lastAt),
    };
    return [...kept].sort(by[sort]);
  }, [feed, query, filter, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const slice = rows.slice(current * PAGE, current * PAGE + PAGE);

  return (
    <Card
      title="People"
      subtitle={
        feed
          ? `${feed.people.length.toLocaleString()} accounts. Email counted from the send log${
              feed.historyStart
                ? `, which begins ${new Date(
                    feed.historyStart
                  ).toLocaleDateString()}`
                : ""
            }.`
          : "Reading accounts…"
      }
      action={
        <ToolbarButton onClick={load} loading={loading}>
          Refresh
        </ToolbarButton>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(0);
          }}
          placeholder="Search by address"
          className="w-full max-w-64"
        />
        <Select<Filter>
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(0);
          }}
          options={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
          ariaLabel="Which people"
          size="sm"
          className="w-auto"
        />
        <Select<Sort>
          value={sort}
          onChange={(v) => {
            setSort(v);
            setPage(0);
          }}
          options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
          ariaLabel="Order"
          size="sm"
          className="w-auto"
        />
        <span className="font-sans text-[12px]" style={ink3}>
          {rows.length.toLocaleString()} shown
        </span>
      </div>

      {feed?.ledgerError && (
        <p
          className="mb-3 font-sans text-[12px]"
          style={{ color: "var(--adm-warn)" }}
        >
          The send log could not be read: {feed.ledgerError}
        </p>
      )}

      <DataTable<PersonRow>
        rows={slice}
        rowKey={(p) => p.id}
        csvFilename="people-email.csv"
        empty={loading ? "Reading accounts…" : "Nobody matches that."}
        columns={[
          {
            key: "email",
            label: "Address",
            render: (p) => (
              <button
                type="button"
                onClick={() => setOpen(p)}
                className="text-left underline decoration-dotted"
              >
                <Email value={p.email} />
              </button>
            ),
            csv: (p) => p.email,
          },
          {
            key: "joined",
            label: "Joined",
            render: (p) => day(p.joinedAt),
            csv: (p) => p.joinedAt,
          },
          {
            key: "seen",
            label: "Last seen",
            render: (p) => day(p.lastSignInAt),
            csv: (p) => p.lastSignInAt ?? "",
          },
          {
            key: "lists",
            label: "Lists",
            render: (p) =>
              p.shop || p.updates ? (
                <span className="flex flex-wrap gap-1">
                  {p.shop && <Pill tone="gold">shop</Pill>}
                  {p.updates && <Pill tone="gold">library</Pill>}
                </span>
              ) : (
                <span style={ink3}>none</span>
              ),
            csv: (p) =>
              [p.shop ? "shop" : "", p.updates ? "library" : ""]
                .filter(Boolean)
                .join(" "),
          },
          {
            key: "received",
            label: "Emails",
            align: "right",
            render: (p) => p.received,
            csv: (p) => p.received,
          },
          {
            key: "failed",
            label: "Failed",
            align: "right",
            render: (p) =>
              p.failed ? (
                <span style={{ color: "var(--adm-critical)" }}>{p.failed}</span>
              ) : (
                "0"
              ),
            csv: (p) => p.failed,
          },
          {
            key: "last",
            label: "Last email",
            render: (p) => (
              <span>
                {day(p.lastAt)}
                {p.lastSubject ? (
                  <>
                    <br />
                    <span className="font-sans text-[11.5px]" style={ink3}>
                      {p.lastSubject}
                    </span>
                  </>
                ) : null}
              </span>
            ),
            csv: (p) => `${p.lastAt ?? ""} ${p.lastSubject ?? ""}`.trim(),
          },
        ]}
      />

      {pages > 1 && (
        <div className="mt-3 flex items-center gap-2">
          <ToolbarButton
            onClick={() => setPage(Math.max(0, current - 1))}
            loading={current === 0}
          >
            Back
          </ToolbarButton>
          <span className="font-sans text-[12px]" style={ink2}>
            Page {current + 1} of {pages}
          </span>
          <ToolbarButton
            onClick={() => setPage(Math.min(pages - 1, current + 1))}
            loading={current >= pages - 1}
          >
            Next
          </ToolbarButton>
        </div>
      )}

      {open && (
        <Modal
          title="Everything sent to this person"
          subtitle={open.email}
          onClose={() => setOpen(null)}
        >
          {!shown ? (
            <p className="font-sans text-[12.5px]" style={ink3}>
              Reading their history…
            </p>
          ) : shown.sends.length === 0 ? (
            <p className="font-sans text-[12.5px]" style={ink2}>
              Nothing has been sent to them since the send log began.
            </p>
          ) : (
            <ul className="space-y-2">
              {shown.sends.map((s, i) => (
                <li
                  key={`${s.at}-${i}`}
                  className="rounded-[var(--adm-radius-sm)] border p-2.5"
                  style={{ borderColor: "var(--adm-line)" }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill
                      tone={
                        s.status === "sent"
                          ? "emerald"
                          : s.status === "failed"
                          ? "rose"
                          : "neutral"
                      }
                    >
                      {s.status}
                    </Pill>
                    <span
                      className="font-sans text-[12.5px] font-semibold"
                      style={ink}
                    >
                      {s.mailing}
                    </span>
                    <span className="font-sans text-[11.5px]" style={ink3}>
                      {new Date(s.at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-[12.5px]" style={ink2}>
                    {s.subject}
                  </p>
                  {s.error && (
                    <p
                      className="mt-1 font-sans text-[11.5px]"
                      style={{ color: "var(--adm-critical)" }}
                    >
                      {s.error}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </Card>
  );
}
