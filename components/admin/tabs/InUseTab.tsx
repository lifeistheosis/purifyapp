"use client";

import { useState, type ReactNode } from "react";

import type { InUseAdminPayload } from "@/app/api/admin/in-use/route";
import type { FeatureSums } from "@/lib/analytics/featureCounting";
import { downloadableBible } from "@/lib/bible/downloads/catalog";

import { useAdminFetch } from "../adminFetch";
import { Card, DataTable, KpiCard, SubTabs } from "../primitives";

/**
 * Traffic > In use (1.9, admin item A5): which Bibles are downloaded, which
 * reading plans are begun and finished, how many journal pages are written
 * and shared, and which versions of the app readers run. The counts are
 * lib/analytics/featureCounting.ts; none of them names a reader. The Locks
 * panel's shape: the window, four numbers, then a table each.
 */

type Days = "7" | "30" | "90";

const PERIODS = [
  ["7", "7 days"],
  ["30", "30 days"],
  ["90", "90 days"],
] as const;

/** The plans by the names the app gives them (lib/i18n/messages/en.json, plans.<id>.name). A test holds every plan named. */
export const PLAN_NAMES: Record<string, string> = {
  psalter: "The Psalter by kathisma",
  gospels: "The four Gospels",
  john: "John in 21 days",
  proverbs: "Proverbs in a month",
  nativity: "The Nativity Fast",
  holyweek: "Holy Week",
};

function Quiet({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </p>
  );
}

const bibleName = (id: string) => downloadableBible(id)?.title ?? id;
const planName = (id: string) => PLAN_NAMES[id] ?? id;
const pct = (share: number) => `${Math.round(share * 100)}%`;

type Plan = FeatureSums["plans"][number];
type Bible = FeatureSums["bibles"][number];
type Version = FeatureSums["versions"][number];

export function InUseTab() {
  const [days, setDays] = useState<Days>("30");
  const { data, error } = useAdminFetch<InUseAdminPayload>(`/api/admin/in-use?days=${days}`);
  const periods = <SubTabs tabs={PERIODS} active={days} onChange={setDays} />;

  if (error || (data && "unavailable" in data)) {
    return (
      <div className="space-y-6">
        {periods}
        <Card title="Couldn't load">
          <Quiet>{data && "unavailable" in data ? data.unavailable : error}</Quiet>
        </Card>
      </div>
    );
  }
  if (!data) return <Quiet>Loading.</Quiet>;
  if (data.absent) {
    return (
      <Card title="Not counting yet">
        <Quiet>The events table is not on the database, so there is nothing to count.</Quiet>
      </Card>
    );
  }

  const downloads = data.bibles.reduce((n, b) => n + b.downloads, 0);
  const begun = data.plans.reduce((n, p) => n + p.begun, 0);
  const finished = data.plans.reduce((n, p) => n + p.finished, 0);
  const latest = data.versions[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {periods}
        {data.truncated ? <Quiet>Partial: the first 100,000 counts only.</Quiet> : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Bibles downloaded"
          value={downloads}
          hint={data.bibles[0] ? `most: ${downloadableBible(data.bibles[0].translation)?.shortLabel ?? data.bibles[0].translation}` : "none yet"}
        />
        <KpiCard label="Plans begun" value={begun} hint={`${finished} finished`} />
        <KpiCard label="Journal pages" value={data.journal.written} hint={`${data.journal.shared} shared`} />
        <KpiCard label="Most in use" value={latest ? latest.version : "None yet"} hint={latest ? `${pct(latest.share)} of the days the app was opened` : "waits for an open"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Bibles downloaded" subtitle="Each download that finished.">
          <DataTable<Bible>
            rows={data.bibles}
            rowKey={(r) => r.translation}
            empty="No download in this window."
            csvFilename={`purify-bibles-${days}d.csv`}
            columns={[
              { key: "translation", label: "Bible", render: (r) => bibleName(r.translation), csv: (r) => r.translation },
              { key: "downloads", label: "Downloads", render: (r) => r.downloads, csv: (r) => r.downloads, align: "right" },
            ]}
          />
        </Card>

        <Card title="Versions in use" subtitle="Each day a device opened the app, by its version.">
          <DataTable<Version>
            rows={data.versions}
            rowKey={(r) => r.version}
            empty="No open in this window."
            csvFilename={`purify-versions-${days}d.csv`}
            columns={[
              { key: "version", label: "Version", render: (r) => r.version, csv: (r) => r.version },
              { key: "deviceDays", label: "Device days", render: (r) => r.deviceDays, csv: (r) => r.deviceDays, align: "right" },
              { key: "share", label: "Share", render: (r) => pct(r.share), csv: (r) => r.share.toFixed(4), align: "right" },
            ]}
          />
        </Card>
      </div>

      <Card title="Reading plans" subtitle="Begun: the first day opened for the first time. Finished: the last day marked.">
        <DataTable<Plan>
          rows={data.plans}
          rowKey={(r) => r.plan}
          empty="No plan begun or finished in this window."
          csvFilename={`purify-plans-${days}d.csv`}
          columns={[
            { key: "plan", label: "Plan", render: (r) => planName(r.plan), csv: (r) => r.plan },
            { key: "begun", label: "Begun", render: (r) => r.begun, csv: (r) => r.begun, align: "right" },
            { key: "finished", label: "Finished", render: (r) => r.finished, csv: (r) => r.finished, align: "right" },
          ]}
        />
        <div className="mt-3">
          <Quiet>
            Counted from 1.9, with the kind of device and the day, never the reader, the account or the page. A plan begun
            in one window and finished in another counts in each. Versions count days, not devices: a device that opens the
            app every day of a week is seven. A journal page counts once, when it is first saved; a share counts once the
            share is made.
          </Quiet>
        </div>
      </Card>
    </div>
  );
}
