import {
  readingsOn,
  startOfDayUtc,
  type ReadingRef,
} from "@/lib/calendar/orthodox";
import {
  getOldTestamentCategories,
  getNewTestamentCategories,
} from "@/lib/bible/books";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { BibleMobileContinue } from "./BibleMobileContinue";
import { BibleSearchTrigger } from "./BibleSearchOverlay";
import { BibleTabs } from "./BibleTabs";

/**
 * Bible mobile shell — minimal book selector.
 *
 *   1. Header with search trigger (full-screen overlay).
 *   2. Continue reading island (only when localStorage has a last chapter).
 *   3. Today's appointed-readings strip (one quiet line, optional).
 *   4. Segmented Old/New Testament tabs.
 *   5. Categorised vertical list of books — single tappable row per book.
 *
 * No hero feed card, no horizontal shelves of book spines, no coloured
 * chips. The page is a library index, nothing more.
 */
export function BibleMobile() {
  const today = startOfDayUtc(new Date());
  const readings = readingsOn(today);
  const gospel = readings.find((r) => r.kind === "gospel");
  const epistle = readings.find((r) => r.kind === "epistle");
  const ot = readings.find((r) => r.kind === "ot");

  const otCats = getOldTestamentCategories();
  const ntCats = getNewTestamentCategories();

  return (
    <MobileShell
      header={<MobileHeader title="Bible" trailing={<BibleSearchTrigger />} />}
      eyebrow="Read"
    >
      <BibleMobileContinue />

      {(gospel || epistle || ot) && (
        <div className="mt-3 rounded-2xl border border-paper/10 bg-paper/[0.03] p-3">
          <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/45 mb-2">
            Appointed today
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-detail">
            {gospel && <ReadingChip kind="Gospel" reading={gospel} />}
            {epistle && <ReadingChip kind="Epistle" reading={epistle} />}
            {ot && <ReadingChip kind="OT" reading={ot} />}
          </div>
        </div>
      )}

      <div className="mt-6">
        <BibleTabs ot={otCats} nt={ntCats} />
      </div>
    </MobileShell>
  );
}

function ReadingChip({
  kind,
  reading,
}: {
  kind: string;
  reading: ReadingRef;
}) {
  return (
    <a
      href={`/bible/${reading.book}/${reading.chapter}#v${reading.from}`}
      className="font-sans text-paper/85 hover:text-paper transition-colors"
    >
      <span className="font-semibold text-paper/55 mr-1.5">{kind}</span>
      {reading.label}
    </a>
  );
}
