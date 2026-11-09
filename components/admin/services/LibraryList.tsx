"use client";

// The library's list, one tap under the Services page's library line (his
// pick A on r3-17: "Library files is a line, its list one tap away").
//
// Read only, as it always was: the saints registry and the data/ tree,
// counted by /api/admin/content-health. What it used to promise and not
// draw, links to the files, is now said as it is: the fix is made in the
// repository, and each row names the folder it lives in.

import { useState } from "react";

import type { IconList, IconListRow, IconState } from "@/lib/saints/iconDebt";

import { DataTable, Pill, SubTabs } from "../primitives";

export type LibrarySaint = {
  slug: string;
  name: string;
  worksCount: number;
  complete: boolean;
  iconUrl: string | null;
  iconOk: boolean;
  hasDeI18n: boolean;
  hasLicensedWorks: boolean;
};

export type LibraryPayload = {
  saints: {
    total: number;
    incomplete: number;
    missingIcons: number;
    noIconAtAll: number;
    missingDe: number;
    missingLicensedWorks: number;
    rows: LibrarySaint[];
  };
  calendar: { days: number; missingExamples: string[]; expectedDays: number };
  bible: { books: { book: string; chapters: number }[] };
  /** The saint icons still to clear (admin A9); absent from a server older than it. */
  icons?: IconList;
};

type Filter = "all" | "incomplete" | "icon" | "de" | "licensed";

const ink3 = { color: "var(--adm-ink-3)" } as const;

export function LibraryList({ data }: { data: LibraryPayload }) {
  const [filter, setFilter] = useState<Filter>("all");
  const s = data.saints;
  const rows = s.rows.filter((r) =>
    filter === "incomplete"
      ? !r.complete
      : filter === "icon"
        ? !r.iconUrl || !r.iconOk
        : filter === "de"
          ? !r.hasDeI18n
          : filter === "licensed"
            ? !r.hasLicensedWorks
            : true,
  );

  return (
    <div className="space-y-3">
      <p className="font-sans text-[12.5px] leading-[1.55]" style={ink3}>
        Fixed in the repository, never here: the registry is lib/saints/saints.ts, and a saint&apos;s files are under
        data/saints/ in a folder named by its slug.
        {data.calendar.missingExamples.length > 0
          ? ` Days without saints in data/calendar/daily-saints.json: ${data.calendar.missingExamples.join(", ")}.`
          : ""}
      </p>
      <SubTabs<Filter>
        tabs={[
          ["all", `All ${s.total}`],
          ["incomplete", `Not complete ${s.incomplete}`],
          ["icon", `No icon file ${s.missingIcons + s.noIconAtAll}`],
          ["de", `No de.json ${s.missingDe}`],
          ["licensed", `No licensed-works ${s.missingLicensedWorks}`],
        ]}
        active={filter}
        onChange={setFilter}
      />
      <DataTable<LibrarySaint>
        rows={rows}
        rowKey={(r) => r.slug}
        csvFilename="library-saints.csv"
        empty="None."
        columns={[
          {
            key: "name",
            label: "Saint",
            render: (r) => (
              <span className="flex flex-col">
                <span style={{ color: "var(--adm-ink)" }}>{r.name}</span>
                <span className="font-mono text-[11px]" style={ink3}>
                  data/saints/{r.slug}/
                </span>
              </span>
            ),
            csv: (r) => r.name,
          },
          {
            key: "complete",
            label: "State",
            render: (r) => (r.complete ? <Pill tone="emerald">Complete</Pill> : <Pill tone="gold">Not complete</Pill>),
            csv: (r) => (r.complete ? "complete" : "not complete"),
          },
          { key: "works", label: "Works", align: "right", render: (r) => r.worksCount, csv: (r) => r.worksCount },
          {
            key: "icon",
            label: "Icon",
            render: (r) =>
              !r.iconUrl ? <span style={ink3}>none set</span> : r.iconOk ? <Pill tone="emerald">On file</Pill> : <Pill tone="rose">Missing</Pill>,
            csv: (r) => (!r.iconUrl ? "none set" : r.iconOk ? "on file" : "missing"),
          },
          {
            key: "de",
            label: "de.json",
            render: (r) => (r.hasDeI18n ? "yes" : <span style={ink3}>no</span>),
            csv: (r) => (r.hasDeI18n ? "yes" : "no"),
          },
          {
            key: "licensed",
            label: "licensed-works",
            render: (r) => (r.hasLicensedWorks ? "yes" : <span style={ink3}>no</span>),
            csv: (r) => (r.hasLicensedWorks ? "yes" : "no"),
          },
        ]}
      />
      {data.icons ? <IconsToClear icons={data.icons} /> : null}
      <details className="group">
        <summary
          className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-sans text-[12.5px] [&::-webkit-details-marker]:hidden"
          style={{ color: "var(--adm-ink-2)" }}
        >
          <span className="flex-1">
            The Bible, {data.bible.books.length} books: chapters on file under data/bible/
          </span>
          <span aria-hidden className="transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <ul className="grid grid-cols-2 gap-x-6 font-sans text-[12px] sm:grid-cols-3 lg:grid-cols-4">
          {data.bible.books.map((b) => (
            <li key={b.book} className="flex justify-between border-b py-1" style={{ borderColor: "var(--adm-line)" }}>
              <span style={{ color: "var(--adm-ink-2)" }}>{b.book}</span>
              <span className="tabular-nums" style={ink3}>
                {b.chapters}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/* ── The saint icons to clear (admin A9) ─────────────────────────────────── */

type IconFilter = "to-clear" | "unnamed" | "settled" | "all";

const STATE_PILL: Record<IconState, { tone: "rose" | "gold" | "emerald"; word: string }> = {
  "to-clear": { tone: "rose", word: "No source yet" },
  unnamed: { tone: "gold", word: "No iconographer named" },
  verified: { tone: "emerald", word: "Public domain" },
  permission: { tone: "emerald", word: "With permission" },
};

/**
 * Every saint icon by the state of its rights, the ones to clear first. Read
 * from lib/saints/iconRights.ts through /api/admin/content-health, so a file
 * cleared there (the Updates chat's U12 gives each its source) leaves this
 * list with the next deploy. Fixed in the repository, never here.
 */
function IconsToClear({ icons }: { icons: IconList }) {
  const [filter, setFilter] = useState<IconFilter>("to-clear");
  const rows = icons.rows.filter((r) =>
    filter === "all"
      ? true
      : filter === "settled"
        ? r.state === "verified" || r.state === "permission"
        : r.state === filter,
  );
  return (
    <section className="space-y-3 pt-2">
      <p className="font-sans text-[12.5px] leading-[1.55]" style={ink3}>
        Saint icons: {icons.toClear} with no source, licence or credit yet, {icons.unnamed} used with permission but naming
        no iconographer, {icons.settled} settled. Each is cleared in lib/saints/iconRights.ts, by moving its row out of the
        debt with its source and the day someone looked at it.
      </p>
      <SubTabs<IconFilter>
        tabs={[
          ["to-clear", `To clear ${icons.toClear}`],
          ["unnamed", `No iconographer ${icons.unnamed}`],
          ["settled", `Settled ${icons.settled}`],
          ["all", `All ${icons.rows.length}`],
        ]}
        active={filter}
        onChange={setFilter}
      />
      <DataTable<IconListRow>
        rows={rows}
        rowKey={(r) => r.file}
        csvFilename="saint-icons.csv"
        empty="None."
        columns={[
          {
            key: "icon",
            label: "Icon",
            render: (r) => (
              // A thumbnail beside its own file name: the name says what it is.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.url} alt="" width={36} height={44} loading="lazy" className="h-11 w-9 rounded-[4px] object-cover" />
            ),
            csv: (r) => r.url,
          },
          {
            key: "file",
            label: "File",
            render: (r) => (
              <span className="flex flex-col">
                <span className="font-mono text-[12px]" style={{ color: "var(--adm-ink)" }}>
                  {r.file}
                </span>
                {r.size ? (
                  <span className="font-mono text-[11px]" style={ink3}>
                    {r.size}
                  </span>
                ) : null}
              </span>
            ),
            csv: (r) => r.file,
          },
          {
            key: "shown",
            label: "Shown for",
            render: (r) => (
              <span style={{ color: "var(--adm-ink-2)" }}>
                {r.saints.length ? r.saints.join(", ") : <span style={ink3}>no saint page</span>}
                {r.inNotes ? <span style={ink3}>{r.saints.length ? "; " : " "}the Fathers&apos; notes</span> : null}
              </span>
            ),
            csv: (r) => [...r.saints, ...(r.inNotes ? ["the Fathers' notes"] : [])].join("; "),
          },
          {
            key: "state",
            label: "Rights",
            render: (r) => (
              <span className="whitespace-nowrap">
                <Pill tone={STATE_PILL[r.state].tone}>{STATE_PILL[r.state].word}</Pill>
              </span>
            ),
            csv: (r) => STATE_PILL[r.state].word,
          },
          {
            key: "record",
            label: "The record",
            // The debt's note is the same sentence on every row (what the bytes
            // prove), so the row says only what differs; the whole note is in
            // the tooltip and the CSV.
            render: (r) => (
              <span className="line-clamp-2 text-[12px]" style={ink3} title={r.note}>
                {r.state === "to-clear" ? "Nobody has looked at it yet." : `Looked at ${r.inspectedOn}. ${r.note}`}
              </span>
            ),
            csv: (r) => r.note,
          },
        ]}
      />
    </section>
  );
}
