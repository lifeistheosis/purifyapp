"use client";

import { useMemo } from "react";
import { readingsOn, type ReadingRef } from "@/lib/calendar/orthodox";
import { useToday } from "@/lib/calendar/useToday";
import { SoftTile, SoftTileGrid, FeatureBand } from "./SoftTiles";
import { Book } from "@/components/ui/icons/Book";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Codex } from "@/components/ui/icons/Codex";

/**
 * The Bible tab's "Appointed today" band.
 *
 * Client-side because it is derived from the current day, and the Android
 * target is a static export where a server component answers that question
 * once, at build time.
 *
 * This one was MISSED by the Beta 2.7 day fix, which converted Today,
 * Discover, Prayers and /prayers/today and left the Bible tab on
 * `startOfDayUtc(new Date())` in a server component. That was worse than
 * leaving it alone: the Bible tab showed the build day's Gospel while the
 * Today tab, one tab away, showed the real day's. Two tabs, two different
 * appointed readings, same phone, same second.
 *
 * Renders nothing until the day resolves, which is one frame, rather than
 * showing a reading that might be wrong.
 */

const KIND_META: Record<
  string,
  { label: string; icon: (s: number) => React.ReactNode }
> = {
  gospel: { label: "Gospel", icon: (s) => <Book size={s} /> },
  epistle: { label: "Epistle", icon: (s) => <Scroll size={s} /> },
  ot: { label: "Old Testament", icon: (s) => <Codex size={s} /> },
};

const href = (r: ReadingRef) => `/bible/${r.book}/${r.chapter}#v${r.from}`;

export function BibleAppointedToday() {
  const today = useToday();

  const appointed = useMemo(() => {
    if (!today) return [];
    const readings = readingsOn(today);
    // Ordered Gospel, then Epistle, then Old Testament: the first becomes
    // the featured band, any others sit beside it as soft tiles.
    return [
      readings.find((r) => r.kind === "gospel"),
      readings.find((r) => r.kind === "epistle"),
      readings.find((r) => r.kind === "ot"),
    ].filter(Boolean) as ReadingRef[];
  }, [today]);

  if (!appointed.length) return null;
  const [lead, ...rest] = appointed;

  return (
    <>
      <div className="mt-3">
        <FeatureBand
          href={href(lead)}
          eyebrow="Appointed today"
          title={lead.label}
          sub={`Today's ${KIND_META[lead.kind].label.toLowerCase()} reading`}
          cta="Read"
          icon={KIND_META[lead.kind].icon(18)}
        />
      </div>

      {rest.length > 0 && (
        <SoftTileGrid className="mt-3">
          {rest.map((r, i) => (
            <SoftTile
              key={r.kind}
              href={href(r)}
              label={KIND_META[r.kind].label}
              sub={r.label}
              icon={KIND_META[r.kind].icon(21)}
              tone={i === 0 ? "b" : "c"}
            />
          ))}
        </SoftTileGrid>
      )}
    </>
  );
}
