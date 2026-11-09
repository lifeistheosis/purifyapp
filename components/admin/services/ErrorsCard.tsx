"use client";

/**
 * Services > Errors readers hit (admin item A10). One quiet line until it is
 * opened, like the library under it; opened, a line per fault, the most
 * frequent first: what failed, where, how often, when last, on what and in
 * which versions. Never who: a report holds none (lib/errors/scrub.ts).
 *
 * Until the owner has run docs/1.9-build/sql/app-errors.sql it says the list
 * is not set up yet, never that nothing failed.
 */

import { useEffect, useState } from "react";

import type { ErrorsPayload } from "@/app/api/admin/errors/route";
import { agoText } from "@/lib/admin/attention";
import { adminJson } from "@/lib/admin/fetchJson";
import { SOURCE_WORD, type ErrorGroup } from "@/lib/errors/group";

import { DataTable, SubTabs, ToolbarButton } from "../primitives";
import { BOX, BOX_STYLE, ink, ink2, ink3, line } from "../tools/look";

type Days = "1" | "7";

const PLATFORM_WORD: Record<string, string> = { web: "website", android: "Android", ios: "iPhone", desktop: "Windows" };

function summary(p: ErrorsPayload | null, failed: boolean): string {
  if (failed) return "the list did not load.";
  if (!p) return "reading.";
  if ("unavailable" in p) return "the list could not be read just now.";
  if (p.absent) return "not set up yet: it waits for its table (docs/1.9-build/sql/app-errors.sql), on your OK.";
  if (p.total === 0) return p.days === 1 ? "nothing failed in the last day." : "nothing failed in the last 7 days.";
  const faults = p.groups.length;
  return `${p.total.toLocaleString("en-US")} ${p.total === 1 ? "report" : "reports"} of ${faults} ${faults === 1 ? "fault" : "faults"} in the last ${p.days === 1 ? "day" : "7 days"}${p.truncated ? " (the newest 5,000 read)" : ""}.`;
}

export function ErrorsCard() {
  const [days, setDays] = useState<Days>("1");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ErrorsPayload | null>(null);
  const [failed, setFailed] = useState(false);
  // When the list was read: "3h ago" is measured from here, set in the read's
  // callback rather than taken during render.
  const [readAt, setReadAt] = useState(0);

  useEffect(() => {
    let alive = true;
    adminJson<ErrorsPayload>(`/api/admin/errors?days=${days}`).then((p) => {
      if (!alive) return;
      setData(p);
      setFailed(p === null);
      setReadAt(Date.now());
    });
    return () => {
      alive = false;
    };
  }, [days]);

  const groups = data && !("unavailable" in data) && !data.absent ? data.groups : [];

  return (
    <section className={`${BOX} px-4 py-3`} style={BOX_STYLE}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 font-sans text-[12.5px] leading-[1.55]" style={ink2}>
          <span className="font-semibold" style={ink}>
            Errors readers hit:
          </span>{" "}
          {summary(data, failed)}
        </p>
        {groups.length > 0 ? (
          <ToolbarButton onClick={() => setOpen((v) => !v)}>{open ? "Close the list" : "Open the list"}</ToolbarButton>
        ) : null}
      </div>
      {open && groups.length > 0 ? (
        <div className="mt-3 space-y-3 border-t pt-3" style={line}>
          <SubTabs<Days>
            tabs={[
              ["1", "Last day"],
              ["7", "7 days"],
            ]}
            active={days}
            onChange={setDays}
          />
          <DataTable<ErrorGroup>
            rows={groups}
            rowKey={(g) => `${g.source}|${g.route ?? g.page}|${g.message}`}
            csvFilename="errors-readers-hit.csv"
            empty="Nothing failed."
            columns={[
              {
                key: "what",
                label: "What failed",
                render: (g) => (
                  <span className="flex flex-col">
                    <span style={ink}>{g.message ?? "No message"}</span>
                    <span className="text-[11.5px]" style={ink3}>
                      {SOURCE_WORD[g.source] ?? g.source}
                      {g.status ? `, ${g.status}` : ""}
                    </span>
                  </span>
                ),
                csv: (g) => `${SOURCE_WORD[g.source] ?? g.source}: ${g.message ?? ""}`,
              },
              {
                key: "where",
                label: "Where",
                render: (g) => (
                  <span className="flex flex-col">
                    <span className="font-mono text-[12px]" style={ink2}>
                      {g.page ?? "unknown page"}
                    </span>
                    {g.route ? (
                      <span className="font-mono text-[11px]" style={ink3}>
                        {g.route}
                      </span>
                    ) : null}
                  </span>
                ),
                csv: (g) => g.route ?? g.page ?? "",
              },
              { key: "count", label: "Times", align: "right", render: (g) => g.count.toLocaleString("en-US"), csv: (g) => g.count },
              {
                key: "last",
                label: "Last",
                render: (g) => <span style={ink3}>{agoText(Date.parse(g.lastAt), readAt)}</span>,
                csv: (g) => g.lastAt,
              },
              {
                key: "on",
                label: "On",
                render: (g) => (
                  <span className="text-[12px]" style={ink3}>
                    {Object.entries(g.platforms)
                      .sort((a, b) => b[1] - a[1])
                      .map(([p, n]) => `${PLATFORM_WORD[p] ?? p} ${n}`)
                      .join(", ") || "unknown"}
                    {g.versions.length ? `; ${g.versions.slice(0, 3).join(", ")}` : ""}
                  </span>
                ),
                csv: (g) => `${Object.entries(g.platforms).map(([p, n]) => `${p} ${n}`).join("; ")} | ${g.versions.join(" ")}`,
              },
            ]}
          />
        </div>
      ) : null}
    </section>
  );
}
