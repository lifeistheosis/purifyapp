"use client";

// Every mailing Purify has sent: who got it, who it failed for, and how many
// were owed it and never received it.

import { useCallback, useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import type { MailingRow } from "@/app/api/admin/email/tracking/route";

import { Card, DataTable, Pill, ToolbarButton } from "../primitives";

type Tracking = {
  totals: {
    accounts: number | null;
    emailed: number | null;
    neverEmailed: number | null;
    optedIn: { shop: number; updates: number };
    historyStart: string | null;
    rows: number;
  };
  mailings: MailingRow[];
  ready: { ledger: boolean; jobs: boolean };
};

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

function day(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "—";
}

export function TrackingCard() {
  const [data, setData] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await adminJson<Tracking>("/api/admin/email/tracking");
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the mount
       read shares its path with Refresh; every write is past an await. */
    void load();
  }, [load]);

  const t = data?.totals;

  return (
    <div className="space-y-5">
      <Card
        title="Who Purify has written to"
        subtitle={
          t?.historyStart
            ? `Counted from the send log, which begins ${new Date(
                t.historyStart
              ).toLocaleDateString()}. Email sent before that was never recorded anywhere this can read.`
            : "Counted from the send log."
        }
        action={
          <ToolbarButton onClick={load} loading={loading}>
            Refresh
          </ToolbarButton>
        }
      >
        {t && (
          <div className="@container">
            <div className="grid gap-3 @min-[520px]:grid-cols-4">
              {[
                ["Accounts", t.accounts],
                ["Have had an email", t.emailed],
                ["Never had one", t.neverEmailed],
                ["On a list", t.optedIn.shop + t.optedIn.updates],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-[var(--adm-radius)] border px-3 py-2.5"
                  style={{
                    borderColor: "var(--adm-line)",
                    background: "var(--adm-panel-2)",
                  }}
                >
                  <p className="font-sans text-[11.5px]" style={ink3}>
                    {label}
                  </p>
                  <p
                    className="mt-0.5 font-sans text-[20px] font-bold tabular-nums"
                    style={ink}
                  >
                    {value === null || value === undefined
                      ? "—"
                      : value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        {t && t.optedIn.shop + t.optedIn.updates === 0 && (
          <p
            className="mt-3 font-sans text-[12px]"
            style={{ color: "var(--adm-warn)" }}
          >
            Nobody has switched a list on, so a list email reaches nobody. The
            switches live in Account, Your data. Account notices, receipts and
            the terms notice do not need a list.
          </p>
        )}
      </Card>

      <Card
        title="Mailings"
        subtitle="One row per send. A blank audience means the group it was owed to is not knowable."
      >
        <DataTable<MailingRow>
          rows={data?.mailings ?? []}
          rowKey={(m) => m.key}
          csvFilename="mailings.csv"
          empty={
            loading ? "Reading the send log…" : "Nothing has been sent yet."
          }
          columns={[
            {
              key: "mailing",
              label: "Mailing",
              render: (m) => (
                <span>
                  <span style={ink}>{m.label}</span>
                  <br />
                  <span className="font-sans text-[11.5px]" style={ink3}>
                    {m.subject}
                  </span>
                </span>
              ),
              csv: (m) => `${m.label} (${m.subject})`,
            },
            {
              key: "first",
              label: "First",
              render: (m) => day(m.firstAt),
              csv: (m) => m.firstAt,
            },
            {
              key: "last",
              label: "Last",
              render: (m) => day(m.lastAt),
              csv: (m) => m.lastAt,
            },
            {
              key: "sent",
              label: "Got it",
              align: "right",
              render: (m) => m.sent,
              csv: (m) => m.sent,
            },
            {
              key: "failed",
              label: "Failed",
              align: "right",
              render: (m) =>
                m.failed ? (
                  <span style={{ color: "var(--adm-critical)" }}>
                    {m.failed}
                  </span>
                ) : (
                  "0"
                ),
              csv: (m) => m.failed,
            },
            {
              key: "never",
              label: "Never got it",
              align: "right",
              render: (m) =>
                m.neverReceived === null
                  ? "—"
                  : m.neverReceived.toLocaleString(),
              csv: (m) => m.neverReceived ?? "",
            },
            {
              key: "audience",
              label: "Owed to",
              align: "right",
              render: (m) =>
                m.audience === null ? "—" : m.audience.toLocaleString(),
              csv: (m) => m.audience ?? "",
            },
            {
              key: "state",
              label: "State",
              render: (m) =>
                m.job ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Pill
                      tone={
                        m.job.status === "running"
                          ? "gold"
                          : m.job.status === "done"
                          ? "emerald"
                          : "neutral"
                      }
                    >
                      {m.job.status === "running" ? "going out" : m.job.status}
                    </Pill>
                    {m.etaDays ? (
                      <span className="font-sans text-[11.5px]" style={ink2}>
                        about {m.etaDays} day{m.etaDays === 1 ? "" : "s"} left
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span style={ink3}>sent</span>
                ),
              csv: (m) => m.job?.status ?? "sent",
            },
          ]}
        />
      </Card>
    </div>
  );
}
