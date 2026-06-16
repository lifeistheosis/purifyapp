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
import { SoftTile, SoftTileGrid, FeatureBand } from "./SoftTiles";
import { Book } from "@/components/ui/icons/Book";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Codex } from "@/components/ui/icons/Codex";

const KIND_META: Record<
  string,
  { label: string; icon: (s: number) => React.ReactNode }
> = {
  gospel: { label: "Gospel", icon: (s) => <Book size={s} /> },
  epistle: { label: "Epistle", icon: (s) => <Scroll size={s} /> },
  ot: { label: "Old Testament", icon: (s) => <Codex size={s} /> },
};

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

  // Appointed readings, ordered Gospel → Epistle → OT. The first becomes a
  // featured "read today" band; any others sit beside it as soft tiles.
  const appointed = [gospel, epistle, ot].filter(Boolean) as ReadingRef[];
  const [lead, ...rest] = appointed;
  const href = (r: ReadingRef) =>
    `/bible/${r.book}/${r.chapter}#v${r.from}`;

  return (
    <MobileShell
      header={<MobileHeader title="Bible" trailing={<BibleSearchTrigger />} />}
      eyebrow="Read"
    >
      <BibleMobileContinue />

      {lead && (
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
      )}

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

      <div className="mt-6">
        <BibleTabs ot={otCats} nt={ntCats} />
      </div>
    </MobileShell>
  );
}
