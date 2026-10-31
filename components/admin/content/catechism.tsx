"use client";

import { useMemo } from "react";

import type { CatechismAdminPayload, CatechismQuestionStat } from "@/app/api/admin/catechism/route";
import { DataTable, Pill } from "../primitives";

/**
 * The catechism, under its one line on the editors' desk (his pick A for
 * Content on r3-17, 2026-10-30: "Catechism is a line until its bank is
 * imported"). The desk reads /api/admin/catechism once and hands it here;
 * this draws today's five for each calendar and how each question lands.
 *
 * COUNTS ONLY. Nothing here names a reader. quiz_question_stats is shown and
 * correct per question across everyone, signed in or not; quiz_attempts is
 * read for two COUNTs and no row leaves the route. A table that is not there
 * says so, and a count that could not be read says "unmeasured" rather than
 * 0, the panel's rule since the audit.
 *
 * The bank is not edited here. It is data/catechism/questions.json in the
 * repository (docs/CATECHISM.md); this is the read.
 */

const TYPE_LABEL: Record<CatechismQuestionStat["type"], string> = {
  multiple_choice: "Choice",
  true_false: "True or false",
  fill_word: "Fill the word",
};

const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

function measured(n: number | null): string {
  return n === null ? "unmeasured" : String(n);
}

function rate(q: CatechismQuestionStat): string {
  if (q.shown === null || q.correct === null) return "unmeasured";
  if (q.shown === 0) return "not shown yet";
  return `${Math.round((q.correct / q.shown) * 100)}%`;
}

export function CatechismDetail({ data }: { data: CatechismAdminPayload }) {
  const byId = useMemo(() => {
    const m = new Map<string, CatechismQuestionStat>();
    for (const q of data.questions) m.set(q.id, q);
    return m;
  }, [data]);

  const rows = useMemo(
    () =>
      [...data.questions].sort((a, b) => {
        const ra = a.shown ? (a.correct ?? 0) / a.shown : 1;
        const rb = b.shown ? (b.correct ?? 0) / b.shown : 1;
        return ra - rb || (b.shown ?? 0) - (a.shown ?? 0);
      }),
    [data],
  );

  const absent = [
    data.absent.stats ? "quiz_question_stats" : null,
    data.absent.attempts ? "quiz_attempts" : null,
    data.absent.events ? "analytics_events" : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <p className="font-sans text-[12.5px] leading-[1.55]" style={ink2}>
        Recorded today {measured(data.attempts.today)}, signed in. In 30 days {measured(data.events.started30)} started and{" "}
        {measured(data.events.completed30)} finished, counted for everyone.
      </p>
      {absent.length > 0 ? (
        <p className="font-sans text-[12px]" style={ink3}>
          The catechism migration is not applied ({absent.join(", ")} absent). The page works without it: attempts stay
          on the device and the counters are dropped. See supabase/migrations/20260905000000_catechism.sql.
        </p>
      ) : null}

      {data.bankSize > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {(["new", "old"] as const).map((reckoning) => (
              <div key={reckoning}>
                <p className="mb-2 font-sans text-[12px] font-semibold" style={ink3}>
                  Today, {data.today.date}, {reckoning === "new" ? "New Calendar" : "Old Calendar"}
                </p>
                <ol className="space-y-1.5">
                  {data.today[reckoning].map((id, i) => {
                    const q = byId.get(id);
                    return (
                      <li key={id} className="flex gap-2 font-sans text-[12.5px]" style={ink2}>
                        <span className="tabular-nums" style={ink3}>
                          {i + 1}.
                        </span>
                        <span>
                          {q?.prompt ?? id}
                          {i === 0 && q?.anchored ? (
                            <span className="ml-2">
                              <Pill tone="gold">the day&apos;s anchor</Pill>
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

          <DataTable<CatechismQuestionStat>
            columns={[
              { key: "prompt", label: "Question", render: (q) => q.prompt, csv: (q) => q.prompt },
              { key: "type", label: "Type", render: (q) => TYPE_LABEL[q.type], csv: (q) => q.type },
              { key: "tags", label: "Tags", render: (q) => q.tags.join(", "), csv: (q) => q.tags.join(" ") },
              { key: "shown", label: "Shown", align: "right", render: (q) => measured(q.shown), csv: (q) => q.shown },
              { key: "correct", label: "Correct", align: "right", render: (q) => measured(q.correct), csv: (q) => q.correct },
              { key: "rate", label: "Rate", align: "right", render: (q) => rate(q), csv: (q) => rate(q) },
            ]}
            rows={rows}
            rowKey={(q) => q.id}
            empty="No questions in the bank."
            csvFilename="catechism-questions.csv"
          />
          <p className="font-sans text-[11.5px]" style={ink3}>
            Lowest correct rate first: a question nobody gets right is one to reread.
          </p>
        </>
      ) : null}
    </div>
  );
}
