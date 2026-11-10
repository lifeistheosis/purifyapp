"use client";

/**
 * Searched, not found (admin item A11), under its one line on the Content
 * desk: the words readers searched for and found nothing, the most asked
 * first, with how many days they were asked on and in which languages. No
 * reader is in any of it (lib/search/missWords.ts, the three limits Edgar
 * approved).
 */

import { useState } from "react";

import type { SearchMissesPayload } from "@/app/api/admin/search-misses/route";
import type { MissGroup } from "@/lib/search/missGroups";

import { useAdminFetch } from "../adminFetch";
import { DataTable, Skeleton, SubTabs } from "../primitives";

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

type Days = "7" | "30" | "90";

export function SearchMissesDetail() {
  const [days, setDays] = useState<Days>("30");
  const { data, error } = useAdminFetch<SearchMissesPayload>(`/api/admin/search-misses?days=${days}`);
  if (error) return <p className="font-sans text-[12.5px]" style={ink2}>{error}</p>;
  if (!data) return <Skeleton h={160} />;
  if ("unavailable" in data) return <p className="font-sans text-[12.5px]" style={ink2}>The searches could not be read just now.</p>;
  if (data.absent) {
    return (
      <p className="max-w-[72ch] font-sans text-[12.5px] leading-[1.55]" style={ink2}>
        Not set up yet: its table comes with the 1.9 release, and the apps send their searches from then on.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <SubTabs<Days>
        tabs={[
          ["7", "7 days"],
          ["30", "30 days"],
          ["90", "90 days"],
        ]}
        active={days}
        onChange={setDays}
      />
      <p className="font-sans text-[12.5px]" style={ink3}>
        {data.total === 0
          ? "No search came back empty in this time."
          : `${data.total.toLocaleString("en-US")} ${data.total === 1 ? "search" : "searches"} came back empty${data.truncated ? " (the newest 20,000 read)" : ""}.`}
      </p>
      {data.total > 0 ? (
        <DataTable<MissGroup>
          rows={data.groups}
          rowKey={(g) => g.words}
          csvFilename="searched-not-found.csv"
          empty="None."
          columns={[
            { key: "words", label: "Searched for", render: (g) => <span style={ink}>{g.words}</span>, csv: (g) => g.words },
            { key: "count", label: "Times", align: "right", render: (g) => g.count.toLocaleString("en-US"), csv: (g) => g.count },
            { key: "days", label: "Days", align: "right", render: (g) => g.days, csv: (g) => g.days },
            { key: "last", label: "Last", render: (g) => <span style={ink3}>{g.lastDay}</span>, csv: (g) => g.lastDay },
            {
              key: "locales",
              label: "Languages",
              render: (g) => <span style={ink3}>{g.locales.join(", ") || "not said"}</span>,
              csv: (g) => g.locales.join(" "),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
