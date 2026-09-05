"use client";

import { useMemo } from "react";

import type { CatechismAdminPayload, CatechismQuestionStat } from "@/app/api/admin/catechism/route";
import { Card, DataTable, Pill, StatCard } from "../primitives";
import { useAdminFetch } from "../adminFetch";

/**
 * Reach > Catechism: the bank as the committed file holds it, today's two
 * sets, and how each question lands.
 *
 * COUNTS ONLY. Nothing here names a reader. quiz_question_stats is shown and
 * correct per question across everyone, signed in or not; quiz_attempts is
 * read for two COUNTs and no row leaves the route. A table that is not there
 * says so, and a count that could not be read says "unmeasured" rather than
 * 0, the panel's rule since the audit.
 *
 * The bank is not edited here. It is data/catechism/questions.json, written
 * only by scripts/quiz-import.ts from the owner's reviewed file; this tab is
 * the read.
 */

const TYPE_LABEL: Record<CatechismQuestionStat["type"], string> = {
  multiple_choice: "Choice",
  true_false: "True or false",
  fill_word: "Fill the word",
};

const IMPORT_COMMAND =
  "node --experimental-strip-types --import ./scripts/lib/register-alias.mjs scripts/quiz-import.ts --file bank.json --apply";

function measured(n: number | null): string {
  return n === null ? "unmeasured" : String(n);
}

function rate(q: CatechismQuestionStat): string {
  if (q.shown === null || q.correct === null) return "unmeasured";
  if (q.shown === 0) return "not shown yet";
  return `${Math.round((q.correct / q.shown) * 100)}%`;
}

export function CatechismTab() {
  const { data, error } = useAdminFetch<CatechismAdminPayload>("/api/admin/catechism");

  const byId = useMemo(() => {
    const m = new Map<string, CatechismQuestionStat>();
    for (const q of data?.questions ?? []) m.set(q.id, q);
    return m;
  }, [data]);

  const rows = useMemo(
    () =>
      [...(data?.questions ?? [])].sort((a, b) => {
        const ra = a.shown ? (a.correct ?? 0) / a.shown : 1;
        const rb = b.shown ? (b.correct ?? 0) / b.shown : 1;
        return ra - rb || (b.shown ?? 0) - (a.shown ?? 0);
      }),
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Questions in the bank" value={data ? data.bankSize : "…"} accent />
        <StatCard
          label="Recorded today"
          value={data ? measured(data.attempts.today) : "…"}
          hint="Signed-in attempts for today's date"
        />
        <StatCard
          label="Completed, 30 days"
          value={data ? measured(data.events.completed30) : "…"}
          hint="Everyone, from analytics_events"
        />
        <StatCard
          label="Started, 30 days"
          value={data ? measured(data.events.started30) : "…"}
        />
      </div>

      {error && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {error}
        </p>
      )}

      {data && (data.absent.stats || data.absent.attempts || data.absent.events) && (
        <p className="font-sans text-detail text-[color:var(--adm-ink-3)]">
          The catechism migration is not applied
          {[
            data.absent.stats ? "quiz_question_stats" : null,
            data.absent.attempts ? "quiz_attempts" : null,
            data.absent.events ? "analytics_events" : null,
          ]
            .filter(Boolean)
            .map((t) => ` (${t} is absent)`)
            .join("")}
          . The page works without it: attempts stay on the device and the
          counters are dropped. See supabase/migrations/20260905_catechism.sql.
        </p>
      )}

      {data && data.bankSize === 0 && (
        <Card title="The bank is empty" subtitle="No question ships until the owner's reviewed file is imported">
          <p className="font-sans text-detail text-[color:var(--adm-ink-2)]">
            /catechism shows its quiet empty state, the Today card is hidden, and
            nothing here has a row. The format is in docs/CATECHISM.md; the import
            validates every source_ref against the registries before it writes.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-[var(--adm-radius)] border p-3 font-mono text-[12px] text-[color:var(--adm-ink-2)]" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}>
            {IMPORT_COMMAND}
          </pre>
        </Card>
      )}

      {data && data.bankSize > 0 && (
        <Card
          title={`Today, ${data.today.date}`}
          subtitle="The five for each reckoning. The same five for every reader; the first is the day's anchor when the bank had one"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {(["new", "old"] as const).map((reckoning) => (
              <div key={reckoning}>
                <p className="mb-2 font-sans text-[11.5px] uppercase tracking-[1px] text-[color:var(--adm-ink-3)]">
                  {reckoning === "new" ? "New Calendar" : "Old Calendar"}
                </p>
                <ol className="space-y-1.5">
                  {data.today[reckoning].map((id, i) => {
                    const q = byId.get(id);
                    return (
                      <li key={id} className="flex gap-2 font-sans text-detail text-[color:var(--adm-ink-2)]">
                        <span className="tabular-nums text-[color:var(--adm-ink-3)]">{i + 1}.</span>
                        <span>
                          {q?.prompt ?? id}
                          {i === 0 && q?.anchored ? (
                            <span className="ml-2">
                              <Pill tone="gold">anchor</Pill>
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data && data.bankSize > 0 && (
        <Card
          title="How each question lands"
          subtitle="Shown and correct across everyone, signed in or not. Lowest correct-rate first; a question nobody gets right is a question to reread"
        >
          <DataTable<CatechismQuestionStat>
            columns={[
              { key: "prompt", label: "Question", render: (q) => q.prompt, csv: (q) => q.prompt },
              {
                key: "type",
                label: "Type",
                render: (q) => TYPE_LABEL[q.type],
                csv: (q) => q.type,
              },
              {
                key: "tags",
                label: "Tags",
                render: (q) => q.tags.join(", "),
                csv: (q) => q.tags.join(" "),
              },
              {
                key: "shown",
                label: "Shown",
                align: "right",
                render: (q) => measured(q.shown),
                csv: (q) => q.shown,
              },
              {
                key: "correct",
                label: "Correct",
                align: "right",
                render: (q) => measured(q.correct),
                csv: (q) => q.correct,
              },
              { key: "rate", label: "Rate", align: "right", render: (q) => rate(q), csv: (q) => rate(q) },
            ]}
            rows={rows}
            rowKey={(q) => q.id}
            empty="No questions in the bank."
            csvFilename="catechism-questions.csv"
          />
        </Card>
      )}
    </div>
  );
}
