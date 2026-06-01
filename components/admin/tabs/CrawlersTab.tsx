"use client";

// Crawler Audit tab — 7-day rolling rollup of UAs matching the robots.txt
// block list, plus unknown bot-shaped UAs that aren't on the list yet.
// The privacy page makes the 22-bot block an explicit promise; this tab
// is the receipt.

import { useEffect, useState } from "react";
import { Card, DataTable, Pill, StatCard } from "../primitives";
import { BarChart } from "../charts";

type Payload = {
  windowDays: number;
  totalSessions: number;
  totalBlocked: number;
  totalUnknown: number;
  blockedBots: string[];
  blocked: { bot: string; count: number }[];
  unknown: { userAgent: string; count: number }[];
};

export function CrawlersTab() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/crawlers", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setData(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!data) {
    return <p className="font-sans text-detail text-paper/40 py-8 text-center">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label={`Sessions · ${data.windowDays}d`} value={data.totalSessions} />
        <StatCard
          label="Blocked-bot UA hits"
          value={data.totalBlocked}
          accent={data.totalBlocked > 0}
        />
        <StatCard
          label="Unknown bot-shaped UAs"
          value={data.totalUnknown}
          accent={data.totalUnknown > 0}
        />
        <StatCard label="Block list size" value={data.blockedBots.length} />
      </div>

      {data.totalBlocked > 0 && (
        <Card title="What this means" accent>
          <p className="font-sans text-detail text-paper/85 leading-relaxed">
            These UAs reached the analytics tracker, which means they fetched at
            least one page despite the robots.txt disallow. Robots is advisory
            &mdash; honored bots stay away on their own. Hits here mean the bot
            ignored robots, or it&rsquo;s a different surface (e.g. a logged-in
            session). If the count is large or growing, consider an edge rule
            that returns 403 on UA match.
          </p>
        </Card>
      )}

      <Card title={`Blocked-bot UAs · ${data.windowDays}d`}>
        {data.blocked.length === 0 ? (
          <p className="font-sans text-caption text-emerald-300">
            Zero blocked-bot UAs in the last {data.windowDays} days. Robots is being honored.
          </p>
        ) : (
          <BarChart
            rows={data.blocked.map((b) => ({ label: b.bot, value: b.count }))}
          />
        )}
      </Card>

      <Card
        title="The 22 blocked bots"
        subtitle="Lives in app/robots.ts. Edit there to add or remove."
      >
        <div className="flex flex-wrap gap-2">
          {data.blockedBots.map((b) => (
            <Pill key={b} tone="neutral">
              {b}
            </Pill>
          ))}
        </div>
      </Card>

      <Card
        title={`Unknown bot-shaped UAs · top ${data.unknown.length}`}
        subtitle="UAs containing bot|crawl|spider|GPT|AI that aren’t on the block list. Add anything legitimate-looking to app/robots.ts."
      >
        <DataTable
          rows={data.unknown}
          rowKey={(r) => r.userAgent}
          csvFilename="unknown-bots.csv"
          empty="No unknown bot-shaped UAs seen."
          columns={[
            {
              key: "ua",
              label: "User-agent (truncated)",
              render: (r) => (
                <span className="font-mono text-eyebrow text-paper/85 break-all">
                  {r.userAgent}
                </span>
              ),
              csv: (r) => r.userAgent,
            },
            {
              key: "count",
              label: "Hits",
              align: "right",
              render: (r) => r.count,
              csv: (r) => r.count,
            },
          ]}
        />
      </Card>
    </div>
  );
}
