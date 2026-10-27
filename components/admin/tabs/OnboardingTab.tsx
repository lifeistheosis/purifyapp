"use client";

import { useState, type ReactNode } from "react";

import type { OnboardingAdminPayload } from "@/app/api/admin/onboarding/route";
import { BACKGROUND_WORDS, STEP_WORDS } from "@/lib/admin/onboardingSummary";
import { BACKGROUNDS, INTENTS } from "@/lib/onboarding/space";

import { useAdminFetch } from "../adminFetch";
import { BarChart } from "../charts";
import { Card, KpiCard, SubTabs } from "../primitives";

/**
 * Traffic > Onboarding: how the welcome questions go (1.8).
 *
 * The owner's pick of three layouts, 2026-10-27: "B is the strongest because
 * it's the simplest and it doesn't pour in too much text". So four numbers
 * across the top and three panels under them, with a sentence only where a
 * number alone would not say it. The sums are lib/admin/onboardingSummary.ts;
 * every one of them is a total of rows that name no reader.
 */

type Days = "7" | "30" | "90";

const PERIODS = [
  ["7", "7 days"],
  ["30", "30 days"],
  ["90", "90 days"],
] as const;

const BACKGROUND_LABELS: Record<string, string> = {
  orthodox: "Orthodox",
  catholic: "Catholic",
  protestant: "Protestant",
  "other-faith": "Another faith",
  none: "No faith",
  "prefer-not": "Prefer not to say",
};

// The reader's own words for each focus (onboard.intent.* in the messages).
const INTENT_LABELS: Record<string, string> = {
  prayer: "A rule of prayer",
  study: "Study",
  quiet: "Daily quiet",
  liturgy: "The Liturgy",
};

function Quiet({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </p>
  );
}

/** Rows for a bar chart in the list's own order, largest first, empty ones left out. */
function barRows(tally: Record<string, number>, order: readonly string[], labels: Record<string, string>) {
  return order
    .filter((k) => (tally[k] ?? 0) > 0)
    .map((k) => ({ label: labels[k] ?? k, value: tally[k] }))
    .sort((a, b) => b.value - a.value);
}

const weekLabel = (week: string) =>
  new Date(`${week}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

const top = (tally: Record<string, number>) => Object.entries(tally).sort((a, b) => b[1] - a[1])[0];

export function OnboardingTab() {
  const [days, setDays] = useState<Days>("30");
  const { data, error } = useAdminFetch<OnboardingAdminPayload>(`/api/admin/onboarding?days=${days}`);

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

  const stop = top(data.skippedAt);
  const week = data.returned[7];
  const background = data.answers.background;
  const answered = Object.values(background).reduce((n, v) => n + v, 0);
  const common = top(background);
  const weekTop = top(week.byBackground);
  const door = top(data.finishedBy.door);
  const who = barRows(background, BACKGROUNDS, BACKGROUND_LABELS);
  const focus = barRows(data.answers.intent, INTENTS, INTENT_LABELS);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {periods}
        {data.truncated ? <Quiet>Partial: the first 50,000 counts only.</Quiet> : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Finished" value={data.finished} hint={`of ${data.began} who began`} />
        <KpiCard
          label="Skipped"
          value={data.skipped}
          hint={stop ? `most at ${STEP_WORDS[stop[0]] ?? stop[0]}` : "nobody skipped"}
        />
        <KpiCard
          label="Came back after a week"
          value={week.of ? `${Math.round((week.count / week.of) * 100)}%` : "Not yet"}
          hint={week.of ? `${week.count} of ${week.of}` : "counted a week after a finish"}
        />
        <KpiCard
          label="Most common"
          value={common ? (BACKGROUND_LABELS[common[0]] ?? common[0]) : "Not asked yet"}
          hint={common ? `${common[1]} of ${answered}` : "waits for the where-from question"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Who is coming">
          {who.length ? <BarChart rows={who} /> : <Quiet>Fills once the app asks where readers come from.</Quiet>}
        </Card>
        <Card title="What they focus on">
          {focus.length ? <BarChart rows={focus} /> : <Quiet>No answers yet.</Quiet>}
        </Card>
        <Card title="Finished, week by week">
          {data.weeks.length ? (
            <BarChart
              orientation="vertical"
              height={160}
              rows={data.weeks.map((w) => ({ label: weekLabel(w.week), value: w.finished }))}
            />
          ) : (
            <Quiet>No finishes yet.</Quiet>
          )}
          {weekTop || door ? (
            <div className="mt-3 space-y-1.5 border-t pt-3" style={{ borderColor: "var(--adm-line)" }}>
              {weekTop ? (
                <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
                  {week.count} came back after a week, most of them {BACKGROUND_WORDS[weekTop[0]]?.[1] ?? weekTop[0]}.
                </p>
              ) : null}
              {door ? (
                <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
                  The link that brought the most:{" "}
                  <span style={{ fontFamily: "var(--adm-font-mono)" }}>{door[0]}</span> ({door[1]}).
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
