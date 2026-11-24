"use client";

/**
 * Traffic's days, for a person: one row a day, newest first, the day in
 * words ("Today", "Yesterday", "Mon 23 Nov"), the visitors as its figure and
 * the views and sign-ups in one quiet line under it. The last 7 days show;
 * every day of the chart's range is one tap away, and the CSV and Markdown
 * exports stay as two quiet links. Nothing the old table held is gone.
 *
 * His word, 2026-11-24, on "Every day, as a table" (90 boxed rows of ISO
 * dates): "it gives off the impression as if it was for ... another AI or
 * robot. The design must be ... simplistic ... a clean design for humans."
 */

import { useState } from "react";

import { downloadCsv, toCsv } from "@/lib/admin/csv";
import { larpOn } from "@/lib/admin/larp";

import { LARP_FILE_NOTE } from "../primitives";

export type DayRow = { date: string; visitors: number; views: number; signups: number };

const n = new Intl.NumberFormat("en-US");
const FIRST = 7;

/** "Today", "Yesterday", or "Mon 23 Nov", for a UTC day "YYYY-MM-DD". */
export function dayWords(date: string, today: string): string {
  if (date === today) return "Today";
  const t = Date.parse(`${today}T00:00:00Z`);
  if (Date.parse(`${date}T00:00:00Z`) === t - 86_400_000) return "Yesterday";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function DayByDay({ rows, csvFilename, today }: { rows: DayRow[]; csvFilename: string; today: string }) {
  const [all, setAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const newest = rows.slice().reverse();
  const shown = all ? newest : newest.slice(0, FIRST);

  const headers = ["Day", "Visitors", "Page views", "Signups"];
  const data = () => newest.map((r) => [r.date, r.visitors, r.views, r.signups]);
  function csv() {
    const d = data();
    if (larpOn()) {
      d.unshift([LARP_FILE_NOTE, "", "", ""]);
      downloadCsv(`larp-invented-${csvFilename}`, toCsv(headers, d));
      return;
    }
    downloadCsv(csvFilename, toCsv(headers, d));
  }
  function markdown() {
    const plain = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...data().map((r) => `| ${r.join(" | ")} |`)].join("\n");
    const md = larpOn() ? `**${LARP_FILE_NOTE}**\n\n${plain}` : plain;
    void navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const link = "min-h-11 font-sans text-[12.5px] underline underline-offset-[3px]";
  return (
    <div className="px-3 pb-2 md:px-4">
      <ul>
        {shown.map((r) => (
          <li
            key={r.date}
            className="flex min-h-[52px] items-center gap-3 border-t py-2 first:border-t-0"
            style={{ borderColor: "var(--adm-line)" }}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-[13.5px]" style={{ color: "var(--adm-ink)" }}>
                {dayWords(r.date, today)}
              </span>
              <span className="mt-0.5 block font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                {n.format(r.views)} views · {n.format(r.signups)} sign-up{r.signups === 1 ? "" : "s"}
              </span>
            </span>
            <span className="text-end">
              <span className="block font-mono text-[15px]" style={{ color: "var(--adm-ink)" }}>
                {n.format(r.visitors)}
              </span>
              <span className="block font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                visitors
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 border-t pt-1" style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)" }}>
        {newest.length > FIRST ? (
          <button type="button" onClick={() => setAll((v) => !v)} className={link} style={{ color: "var(--adm-ink-2)" }}>
            {all ? "Show the last 7 days" : `Show all ${newest.length} days`}
          </button>
        ) : null}
        <span className="ms-auto flex gap-4">
          <button type="button" onClick={csv} className={link}>
            Download CSV
          </button>
          <button type="button" onClick={markdown} className={link}>
            {copied ? "Copied" : "Copy as Markdown"}
          </button>
        </span>
      </div>
    </div>
  );
}
