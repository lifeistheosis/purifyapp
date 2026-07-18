"use client";

// Subscriptions — the current Plus/Pro picture from the entitlements table.
// Active counts, a tier donut, a source donut, and an estimated run-rate.
// Honest about what is NOT knowable: no churn/cohort history exists.

import { useEffect, useState, type FormEvent } from "react";
import { Card, StatCard, ChartFrame, DataTable, Pill, SubTabs } from "../primitives";
import { Donut, SERIES_COLORS } from "../charts";
import { formatPrice } from "@/lib/shop/format";

type Subs = {
  activePlus: number;
  activePro: number;
  plusOnly: number;
  supporters: number;
  bySource: Record<string, number>;
  mrrCents: number;
  arrCents: number;
  estimated: boolean;
};

const SOURCE_LABELS: Record<string, string> = {
  google: "Google Play",
  apple: "App Store",
  stripe: "Web (Stripe)",
  comp: "Comped",
  unknown: "Unknown",
};

function money(cents: number) {
  return formatPrice(cents, "usd");
}

function SummaryPanel() {
  const [data, setData] = useState<Subs | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/subscriptions", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const tierSegments = data
    ? [
        { name: "Pro", value: data.activePro, color: SERIES_COLORS[1] },
        { name: "Plus only", value: data.plusOnly, color: SERIES_COLORS[0] },
      ].filter((s) => s.value > 0)
    : [];

  const sourceSegments = data
    ? Object.entries(data.bySource)
        .map(([k, v], i) => ({
          name: SOURCE_LABELS[k] ?? k,
          value: v,
          color: SERIES_COLORS[i % SERIES_COLORS.length],
        }))
        .filter((s) => s.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Plus"
          value={data?.activePlus ?? "—"}
          accent
          hint="includes Pro"
        />
        <StatCard label="Active Pro" value={data?.activePro ?? "—"} hint="members" />
        <StatCard label="Plus only" value={data?.plusOnly ?? "—"} />
        <StatCard
          label="Supporters"
          value={data?.supporters ?? "—"}
          hint="lifetime sync"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartFrame
          title="By tier"
          subtitle="Active paid subscribers."
          isEmpty={tierSegments.length === 0}
          empty="No active subscribers."
        >
          <div className="flex justify-center">
            <Donut segments={tierSegments} size={200} label="Subs" />
          </div>
        </ChartFrame>

        <ChartFrame
          title="By source"
          subtitle="Where the subscription was purchased."
          isEmpty={sourceSegments.length === 0}
          empty="No active subscribers."
        >
          <div className="flex justify-center">
            <Donut segments={sourceSegments} size={200} label="Source" />
          </div>
        </ChartFrame>
      </div>

      <Card title="Estimated recurring revenue">
        <div className="grid grid-cols-2 gap-4 font-sans">
          <div>
            <p className="text-eyebrow uppercase tracking-[1.2px] text-paper/45">
              MRR (est.)
            </p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {data ? money(data.mrrCents) : "—"}
            </p>
          </div>
          <div>
            <p className="text-eyebrow uppercase tracking-[1.2px] text-paper/45">
              ARR (est.)
            </p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {data ? money(data.arrCents) : "—"}
            </p>
          </div>
        </div>
        <p className="mt-3 font-sans text-eyebrow text-paper/40 leading-relaxed">
          Estimated: active subscribers × list monthly price, comped accounts
          excluded. The entitlements table stores no billed amount, and the
          RevenueCat webhook keeps no event history, so new/churned counts and
          exact billed revenue are not available here.
        </p>
      </Card>
    </div>
  );
}

/* ── Members ───────────────────────────────────────────────────────────── */

type Member = {
  userId: string;
  name: string | null;
  email: string | null;
  tier: "Plus" | "Pro";
  source: string;
  comped: boolean;
  nextBilling: string | null;
  startDate: string | null;
};

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const COMP_DURATIONS: [number, string][] = [
  [30, "1 month"],
  [90, "3 months"],
  [180, "6 months"],
  [365, "1 year"],
  [730, "2 years"],
  [3650, "No expiry (~10y)"],
];

const compField =
  "rounded-md border border-paper/20 bg-night px-3 py-2 font-sans text-detail text-paper focus:border-gold focus:outline-none";
const compLabel =
  "block font-sans text-eyebrow uppercase tracking-[1px] text-paper/50";

function MembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [meta, setMeta] = useState<{ enriched: boolean; revenuecat: boolean } | null>(
    null,
  );
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Comp-grant form.
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"plus" | "pro">("plus");
  const [days, setDays] = useState(365);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetch("/api/admin/subscriptions/members", {
          cache: "no-store",
        }).then((r) => r.json());
        if (!alive) return;
        setMembers(d.members ?? []);
        setMeta({ enriched: !!d.enriched, revenuecat: !!d.revenuecat });
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  async function grantComp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/subscriptions/comp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), tier, days }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: j.error ?? "Could not grant access." });
      } else {
        setMsg({
          ok: true,
          text: `Granted ${j.tier} to ${j.name ?? j.email} until ${new Date(
            j.until,
          ).toLocaleDateString()}.`,
        });
        setEmail("");
        setReloadKey((k) => k + 1);
      }
    } catch {
      setMsg({ ok: false, text: "Could not grant access." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Members" value={loaded ? members.length : "—"} accent />
        <StatCard
          label="Pro"
          value={loaded ? members.filter((m) => m.tier === "Pro").length : "—"}
        />
      </div>

      <Card
        title="Grant complimentary access"
        subtitle="For testers and reviewers. Marked as comp — never counted as a sale."
      >
        <form
          onSubmit={grantComp}
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
        >
          <label className="space-y-1">
            <span className={compLabel}>Account email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tester@example.com"
              className={`w-full ${compField}`}
            />
          </label>
          <label className="space-y-1">
            <span className={compLabel}>Plan</span>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as "plus" | "pro")}
              className={compField}
            >
              <option value="plus">Plus</option>
              <option value="pro">Pro</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className={compLabel}>Duration</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className={compField}
            >
              {COMP_DURATIONS.map(([d, l]) => (
                <option key={d} value={d}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="rounded-pill border border-emerald-400/50 bg-emerald-500/[0.14] px-5 py-2 font-sans text-detail font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {busy ? "Granting…" : "Grant"}
          </button>
        </form>
        {msg && (
          <p
            className={`mt-3 font-sans text-eyebrow ${
              msg.ok ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {msg.text}
          </p>
        )}
        <p className="mt-3 font-sans text-eyebrow text-paper/40 leading-relaxed">
          The account must have signed in at least once. Granting the same email
          again updates the plan and extends the end date.
        </p>
      </Card>

      {loaded && meta && !meta.revenuecat ? (
        <p className="rounded-md border border-amber-400/25 bg-amber-400/[0.05] px-3 py-2 font-sans text-eyebrow text-amber-200/90">
          Start dates come from the RevenueCat REST API. Set
          REVENUECAT_REST_API_KEY in the environment to show them; next-billing
          and everything else works from the database now.
        </p>
      ) : null}

      <Card
        title="Active subscribers"
        subtitle="No card or financial data is shown — only who is subscribed and when it renews."
      >
        <DataTable<Member>
          rows={members}
          rowKey={(m) => m.userId}
          csvFilename="subscribers.csv"
          empty={loaded ? "No active subscribers." : "Loading…"}
          columns={[
            {
              key: "name",
              label: "Name",
              render: (m) => m.name ?? "—",
              csv: (m) => m.name ?? "",
            },
            {
              key: "email",
              label: "Email",
              render: (m) => m.email ?? "—",
              csv: (m) => m.email ?? "",
            },
            {
              key: "tier",
              label: "Tier",
              render: (m) => (
                <Pill tone={m.tier === "Pro" ? "gold" : "emerald"}>{m.tier}</Pill>
              ),
              csv: (m) => m.tier,
            },
            {
              key: "source",
              label: "Source",
              render: (m) => (m.comped ? "Comped" : SOURCE_LABELS[m.source] ?? m.source),
              csv: (m) => m.source,
            },
            {
              key: "start",
              label: "Started",
              render: (m) => shortDate(m.startDate),
              csv: (m) => m.startDate ?? "",
            },
            {
              key: "next",
              label: "Next billing",
              render: (m) => shortDate(m.nextBilling),
              csv: (m) => m.nextBilling ?? "",
            },
          ]}
        />
      </Card>
    </div>
  );
}

/* ── Tab shell ─────────────────────────────────────────────────────────── */

type Panel = "members" | "summary";
const TABS = [
  ["members", "Members"],
  ["summary", "Summary"],
] as const;

export function SubscriptionsTab() {
  const [panel, setPanel] = useState<Panel>("members");
  return (
    <div className="space-y-5">
      <SubTabs tabs={TABS} active={panel} onChange={setPanel} />
      {panel === "members" ? <MembersPanel /> : <SummaryPanel />}
    </div>
  );
}
