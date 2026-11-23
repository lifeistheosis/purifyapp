"use client";

import { useState, type ReactNode } from "react";

import type { OnboardingAdminPayload } from "@/app/api/admin/onboarding/route";
import { BACKGROUND_WORDS, INTENT_WORDS, STEP_WORDS, byGroup, shareBack, type GroupRow } from "@/lib/admin/onboardingSummary";
import { BACKGROUNDS, INTENTS } from "@/lib/onboarding/space";

import { useAdminFetch } from "../adminFetch";
import { BarChart } from "../charts";
import { Card, DataTable, KpiCard, SubTabs } from "../primitives";
import { AbTests } from "./AbTests";

/**
 * Traffic > Onboarding: how the welcome questions go (1.8).
 *
 * The owner's pick of three layouts, 2026-10-27: "B is the strongest because
 * it's the simplest and it doesn't pour in too much text". So four numbers
 * across the top and three panels under them, with a sentence only where a
 * number alone would not say it. The sums are lib/admin/onboardingSummary.ts;
 * every one of them is a total of rows that name no reader.
 */

type Days = "7" | "30" | "90" | "all";

const PERIODS = [
  ["7", "7 days"],
  ["30", "30 days"],
  ["90", "90 days"],
  // From the first of its rows (the owner, 2026-11-11: "set up a all time option for the charts").
  ["all", "All time"],
] as const;

const BACKGROUND_LABELS: Record<string, string> = {
  orthodox: "Orthodox",
  catholic: "Catholic",
  protestant: "Protestant",
  "other-faith": "Another faith",
  // The question's own words for it (onboard.background.none).
  none: "Just curious",
  "prefer-not": "Prefer not to say",
};

// The reader's own words for each answer to "What are you looking for?"
// (onboard.intent.* in the messages), eleven from 1.8.
const INTENT_LABELS: Record<string, string> = {
  saints: "The saints' lives",
  fathers: "The Fathers' writings",
  gospels: "The Gospels",
  councils: "The councils",
  history: "Church history",
  beliefs: "What the Orthodox believe",
  liturgy: "The Liturgy",
  feasts: "Fasts and feasts",
  prayer: "A rule of prayer",
  quiet: "Daily quiet",
  study: "Study",
};

// The roads, in Admin's words (lib/onboarding/road.ts). "none" is a reader
// whose answers lead to no road: a skip, or too little said.
const ROAD_LABELS: Record<string, string> = {
  practicing: "Practicing",
  returning: "The road back",
  catechumen: "Catechumen",
  catholic: "Catholic",
  protestant: "Protestant",
  christian: "Another Christian tradition",
  seeker: "Seeker",
  newcomer: "Newcomer",
  none: "No road",
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

/** A share who came back, or why there is none to show yet. */
function Back({ c }: { c: { count: number; of: number } }) {
  const share = shareBack(c);
  if (share === null) return <span style={{ color: "var(--adm-ink-3)" }}>{c.of ? "Too few yet" : "Not yet"}</span>;
  return (
    <>
      {Math.round(share * 100)}% <span style={{ color: "var(--adm-ink-3)" }}>({c.count} of {c.of})</span>
    </>
  );
}

/** Finishes and returns for each road, or each first pick (2.0's plan, row 1; lib/admin/onboardingSummary.ts, byGroup). */
function GroupTable({ rows, name, labels, csv }: { rows: GroupRow[]; name: string; labels: Record<string, string>; csv: string }) {
  const pct = (c: { count: number; of: number }) => {
    const share = shareBack(c);
    return share === null ? "" : Math.round(share * 100);
  };
  return (
    <DataTable<GroupRow>
      rows={rows}
      rowKey={(r) => r.key}
      empty="No finishes yet."
      csvFilename={csv}
      columns={[
        { key: "group", label: name, render: (r) => labels[r.key] ?? r.key, csv: (r) => labels[r.key] ?? r.key },
        { key: "finished", label: "Finished", align: "right", render: (r) => r.finished, csv: (r) => r.finished },
        { key: "d2", label: "Back after 2 days", align: "right", render: (r) => <Back c={r.back[2]} />, csv: (r) => pct(r.back[2]) },
        { key: "d7", label: "After a week", align: "right", render: (r) => <Back c={r.back[7]} />, csv: (r) => pct(r.back[7]) },
        { key: "d30", label: "After 30 days", align: "right", render: (r) => <Back c={r.back[30]} />, csv: (r) => pct(r.back[30]) },
      ]}
    />
  );
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
  // Every pick, from version 4 of the questions (the first pick alone before it).
  const looking = barRows(data.answers.intent, INTENTS, INTENT_LABELS);
  const firstPick = top(data.picks.first);

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
        <Card title="What they look for">
          {looking.length ? <BarChart rows={looking} /> : <Quiet>No answers yet.</Quiet>}
          {firstPick ? (
            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--adm-line)" }}>
              <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
                Every pick counted. Picked first most often: {INTENT_WORDS[firstPick[0]] ?? firstPick[0]} ({firstPick[1]}).
              </p>
            </div>
          ) : null}
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

      {/* By road and by first pick (2.0's plan, row 1): who finishes and who
          comes back, from the answers each count already carries. Nothing
          new is sent by any reader. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="By road">
          <GroupTable rows={byGroup(data, "road")} name="Road" labels={ROAD_LABELS} csv="onboarding-by-road" />
          <div className="mt-3">
            <Quiet>
              Told from the answers each count already carries. A count does not say whether a practicing reader is coming back after time away, so both stand
              under Practicing. Another Christian tradition is not counted yet, so those readers stand among the newcomers and seekers. A share
              shows once twenty readers could have come back.
            </Quiet>
          </div>
        </Card>
        <Card title="By first pick">
          <GroupTable rows={byGroup(data, "intent")} name="First pick" labels={INTENT_LABELS} csv="onboarding-by-first-pick" />
          <div className="mt-3">
            <Quiet>The first thing a reader asked for. It says nothing of their faith, so it is the first way to cut every number.</Quiet>
          </div>
        </Card>
      </div>

      {/* Tests of two versions (1.9, lib/ab/): the account's place first. */}
      <AbTests />
    </div>
  );
}
